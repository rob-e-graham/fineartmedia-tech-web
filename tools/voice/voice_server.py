#!/usr/bin/env python3
"""Local Whisper + Piper bridge for the ARCHAI/AUXIO voice demonstration."""

import http.server
import json
import os
import pathlib
import subprocess
import tempfile
import threading
import time
from collections import defaultdict, deque
from socketserver import ThreadingTCPServer


VOICE_DIR = pathlib.Path(os.environ.get("ARCHAI_VOICE_DIR", "/private/tmp/voice"))
WHISPER = os.environ.get("ARCHAI_WHISPER_CLI", "/opt/homebrew/bin/whisper-cli")
WHISPER_MODEL = VOICE_DIR / "ggml-base.en.bin"
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


def voice_available(voice_id):
    model = VOICES.get(voice_id)
    return bool(model and model.exists() and model.with_suffix(model.suffix + ".json").exists())


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
            self.send_json(
                200,
                {
                    "ok": True,
                    "stt": "whisper.cpp base.en",
                    "tts": "piper",
                    "voices": [voice_id for voice_id in VOICES if voice_available(voice_id)],
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
                [WHISPER, "-m", str(WHISPER_MODEL), "-f", str(wav_path), "-nt"],
                capture_output=True,
                text=True,
                check=False,
                timeout=90,
            )
            if result.returncode != 0:
                raise RuntimeError("Local transcription failed")
            self.send_json(200, {"text": " ".join(result.stdout.split()).strip()})
        finally:
            pathlib.Path(source.name).unlink(missing_ok=True)
            wav_path.unlink(missing_ok=True)

    def handle_tts(self, body):
        request = json.loads(body or b"{}")
        text = " ".join(str(request.get("text") or "").split())[:1500]
        voice_id = str(request.get("voice") or "alba")
        model = VOICES.get(voice_id) if voice_available(voice_id) else VOICES["alba"]
        if not text or not voice_available("alba"):
            raise RuntimeError("Piper text or model is unavailable")
        wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False, dir=VOICE_DIR)
        wav.close()
        wav_path = pathlib.Path(wav.name)
        try:
            result = subprocess.run(
                ["python3", "-m", "piper", "-m", str(model), "-f", str(wav_path)],
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
