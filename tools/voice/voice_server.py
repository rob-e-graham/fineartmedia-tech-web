#!/usr/bin/env python3
"""Local speech bridge for the ARCHAI/AUXIO voice demonstration."""

import http.server
import importlib.util
import json
import os
import pathlib
import subprocess
import tempfile
import threading
import time
import wave
from collections import defaultdict, deque
from socketserver import ThreadingTCPServer


VOICE_DIR = pathlib.Path(os.environ.get("ARCHAI_VOICE_DIR", "/private/tmp/voice"))
WHISPER = os.environ.get("ARCHAI_WHISPER_CLI", "/opt/homebrew/bin/whisper-cli")
PIPER_PYTHON = os.environ.get("ARCHAI_PIPER_PYTHON", "/usr/bin/python3")
WHISPER_MODEL = pathlib.Path(
    os.environ.get("ARCHAI_WHISPER_MODEL", str(VOICE_DIR / "ggml-base.bin"))
)
PORT = int(os.environ.get("ARCHAI_VOICE_PORT", "8123"))
MAX_STT_BYTES = int(os.environ.get("ARCHAI_VOICE_MAX_STT_BYTES", str(8 * 1024 * 1024)))
MAX_TTS_BYTES = int(os.environ.get("ARCHAI_VOICE_MAX_TTS_BYTES", str(16 * 1024)))
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.environ.get(
        "ARCHAI_VOICE_ALLOWED_ORIGINS",
        "https://fineartmedia.tech,http://localhost:8905,http://127.0.0.1:8905,null",
    ).split(",")
    if origin.strip()
}
PUBLIC_PREFIX = "/voice"
PROCESS_SLOTS = threading.BoundedSemaphore(
    int(os.environ.get("ARCHAI_VOICE_CONCURRENCY", "2"))
)
RATE_LOCK = threading.Lock()
RATE_EVENTS = defaultdict(deque)
RATE_LIMITS = {
    "health": (60, 60),
    "tts": (20, 300),
    "stt": (10, 300),
}

VOICES = {
    "alba": VOICE_DIR / "en_GB-alba-medium.onnx",
    "cori": VOICE_DIR / "en_GB-cori-high.onnx",
    "amy": VOICE_DIR / "en_US-amy-medium.onnx",
    "lessac": VOICE_DIR / "en_US-lessac-medium.onnx",
    "ryan": VOICE_DIR / "en_US-ryan-high.onnx",
    "alan": VOICE_DIR / "en_GB-alan-medium.onnx",
    "northern": VOICE_DIR / "en_GB-northern_english_male-medium.onnx",
}
CLONED_VOICES = {
    "rob_au": {
        "reference": VOICE_DIR.parent / "references" / "rob-graham-en-au.wav",
        "languages": {"en"},
    },
}
CHATTERBOX_MODEL_ID = os.environ.get(
    "ARCHAI_CHATTERBOX_MODEL", "mlx-community/chatterbox-multilingual-v3"
)
CHATTERBOX_LANGUAGES = {
    "ar", "da", "de", "el", "en", "es", "fi", "fr", "he", "hi", "it",
    "ja", "ko", "ms", "nl", "no", "pl", "pt", "ru", "sv", "sw", "tr", "zh",
}
CHATTERBOX_LOCK = threading.Lock()
CHATTERBOX_MODEL = None


def voice_available(voice_id):
    if voice_id in CLONED_VOICES:
        reference = CLONED_VOICES[voice_id]["reference"]
        return bool(reference.exists() and importlib.util.find_spec("mlx_audio"))
    model = VOICES.get(voice_id)
    return bool(model and model.exists() and model.with_suffix(model.suffix + ".json").exists())


def chatterbox_model():
    global CHATTERBOX_MODEL
    if CHATTERBOX_MODEL is None:
        from mlx_audio.tts.utils import load_model

        CHATTERBOX_MODEL = load_model(CHATTERBOX_MODEL_ID)
    return CHATTERBOX_MODEL


def write_pcm_wav(path, samples, sample_rate):
    import numpy as np

    pcm = np.clip(np.asarray(samples).reshape(-1), -1.0, 1.0)
    pcm = (pcm * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(pcm.tobytes())


def generate_cloned_voice(text, voice_id, language, wav_path):
    voice = CLONED_VOICES[voice_id]
    if language not in voice["languages"]:
        raise RuntimeError("The selected voice has not been approved for this language")
    with CHATTERBOX_LOCK:
        model = chatterbox_model()
        result = next(
            model.generate(
                text=text,
                ref_audio=str(voice["reference"]),
                lang_code=language,
                exaggeration=0.18,
                cfg_weight=0.35,
                temperature=0.7,
                verbose=False,
            )
        )
        write_pcm_wav(wav_path, result.audio, model.sample_rate)


def client_key(handler):
    return handler.headers.get("CF-Connecting-IP", "").strip() or handler.client_address[0]


def within_rate_limit(handler, action):
    limit, window = RATE_LIMITS[action]
    now = time.monotonic()
    key = (client_key(handler), action)
    with RATE_LOCK:
        events = RATE_EVENTS[key]
        while events and events[0] <= now - window:
            events.popleft()
        if len(events) >= limit:
            return False
        events.append(now)
        return True


class VoiceHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *_args):
        return

    def request_origin(self):
        return self.headers.get("Origin", "").strip()

    def origin_allowed(self):
        origin = self.request_origin()
        if self.headers.get("CF-Connecting-IP", "").strip():
            return origin in ALLOWED_ORIGINS
        return not origin or origin in ALLOWED_ORIGINS

    def route_path(self):
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        if path == PUBLIC_PREFIX:
            return "/"
        if path.startswith(PUBLIC_PREFIX + "/"):
            return path[len(PUBLIC_PREFIX) :]
        return path

    def is_public_request(self):
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        return path == PUBLIC_PREFIX or path.startswith(PUBLIC_PREFIX + "/")

    def send_cors(self):
        origin = self.request_origin()
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST,GET,OPTIONS")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")

    def send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if not self.origin_allowed():
            self.send_json(403, {"ok": False, "error": "Origin not allowed"})
            return
        self.send_response(204)
        self.send_cors()
        self.end_headers()

    def do_GET(self):
        if self.route_path() == "/health":
            if not self.origin_allowed():
                self.send_json(403, {"ok": False, "error": "Origin not allowed"})
                return
            if not within_rate_limit(self, "health"):
                self.send_json(429, {"ok": False, "error": "Please try again shortly"})
                return
            cloned_voice_ids = () if self.is_public_request() else tuple(CLONED_VOICES)
            self.send_json(
                200,
                {
                    "ok": True,
                    "stt": "whisper.cpp base multilingual",
                    "tts": "local",
                    "voices": [
                        voice_id
                        for voice_id in (*cloned_voice_ids, *VOICES)
                        if voice_available(voice_id)
                    ],
                    "multilingual_voices": [
                        voice_id for voice_id in cloned_voice_ids if voice_available(voice_id)
                    ],
                    "tts_languages": sorted(CHATTERBOX_LANGUAGES),
                    "validated_tts_languages": sorted(
                        {
                            language
                            for voice in CLONED_VOICES.values()
                            for language in voice["languages"]
                        }
                    ),
                },
            )
            return
        self.send_json(404, {"ok": False, "error": "Not found"})

    def do_POST(self):
        if not self.origin_allowed():
            self.send_json(403, {"ok": False, "error": "Origin not allowed"})
            return
        route = self.route_path()
        action = route.removeprefix("/")
        if action not in ("stt", "tts"):
            self.send_json(404, {"ok": False, "error": "Not found"})
            return
        if not within_rate_limit(self, action):
            self.send_json(429, {"ok": False, "error": "Please try again shortly"})
            return
        try:
            content_length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            self.send_json(400, {"ok": False, "error": "Invalid request length"})
            return
        maximum = MAX_STT_BYTES if action == "stt" else MAX_TTS_BYTES
        if content_length <= 0 or content_length > maximum:
            self.send_json(413, {"ok": False, "error": "Request is too large"})
            return
        body = self.rfile.read(content_length)
        if not PROCESS_SLOTS.acquire(blocking=False):
            self.send_json(503, {"ok": False, "error": "Voice service is busy; please retry"})
            return
        try:
            if route == "/stt":
                self.handle_stt(body)
                return
            if route == "/tts":
                self.handle_tts(body)
                return
        except Exception as error:
            print(f"Voice request failed: {error}", flush=True)
            self.send_json(500, {"ok": False, "error": "Voice processing failed"})
            return
        finally:
            PROCESS_SLOTS.release()

    def handle_stt(self, body):
        if not pathlib.Path(WHISPER).exists() or not WHISPER_MODEL.exists():
            raise RuntimeError("Whisper executable or model is unavailable")
        source = tempfile.NamedTemporaryFile(suffix=".bin", delete=False, dir=VOICE_DIR)
        source.write(body)
        source.close()
        wav_path = pathlib.Path(source.name + ".wav")
        transcript_path = pathlib.Path(str(wav_path) + ".json")
        try:
            converted = subprocess.run(
                ["ffmpeg", "-y", "-i", source.name, "-ar", "16000", "-ac", "1", str(wav_path)],
                capture_output=True,
                check=False,
                timeout=30,
            )
            if converted.returncode != 0:
                raise RuntimeError("Audio conversion failed")
            result = subprocess.run(
                [
                    WHISPER,
                    "-m",
                    str(WHISPER_MODEL),
                    "-f",
                    str(wav_path),
                    "-l",
                    "auto",
                    "-nt",
                    "-np",
                    "-oj",
                    "-of",
                    str(wav_path),
                ],
                capture_output=True,
                text=True,
                check=False,
                timeout=90,
            )
            if result.returncode != 0:
                raise RuntimeError("Local transcription failed")
            transcript = json.loads(transcript_path.read_text())
            text = " ".join(
                str(segment.get("text") or "").strip()
                for segment in transcript.get("transcription", [])
            ).strip()
            language = str(transcript.get("result", {}).get("language") or "").lower()
            self.send_json(200, {"text": text, "language": language})
        finally:
            pathlib.Path(source.name).unlink(missing_ok=True)
            wav_path.unlink(missing_ok=True)
            transcript_path.unlink(missing_ok=True)

    def handle_tts(self, body):
        request = json.loads(body or b"{}")
        text = " ".join(str(request.get("text") or "").split())[:1500]
        voice_id = str(request.get("voice") or "alba")
        language = str(request.get("language") or "en").lower().split("-", 1)[0]
        if not text:
            raise RuntimeError("Speech text is unavailable")
        if self.is_public_request() and voice_id in CLONED_VOICES:
            self.send_json(403, {"ok": False, "error": "This consented voice is preview-only online"})
            return
        wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False, dir=VOICE_DIR)
        wav.close()
        wav_path = pathlib.Path(wav.name)
        try:
            if voice_id in CLONED_VOICES and voice_available(voice_id):
                generate_cloned_voice(text, voice_id, language, wav_path)
            else:
                model = VOICES.get(voice_id) if voice_available(voice_id) else VOICES["alba"]
                if not voice_available("alba"):
                    raise RuntimeError("Piper model is unavailable")
                result = subprocess.run(
                    [PIPER_PYTHON, "-m", "piper", "-m", str(model), "-f", str(wav_path)],
                    input=text.encode(),
                    capture_output=True,
                    check=False,
                    timeout=45,
                )
                if result.returncode != 0:
                    raise RuntimeError("Local speech generation failed")
            audio = wav_path.read_bytes()
            self.send_response(200)
            self.send_cors()
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(audio)))
            self.end_headers()
            self.wfile.write(audio)
        finally:
            wav_path.unlink(missing_ok=True)


ThreadingTCPServer.allow_reuse_address = True
with ThreadingTCPServer(("127.0.0.1", PORT), VoiceHandler) as server:
    print(f"ARCHAI voice service ready at http://127.0.0.1:{PORT}")
    server.serve_forever()
