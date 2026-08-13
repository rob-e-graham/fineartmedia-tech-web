#!/usr/bin/env python3
"""Local Whisper + Piper bridge for the ARCHAI/AUXIO voice demonstration."""

import http.server
import json
import os
import pathlib
import subprocess
import tempfile
from socketserver import ThreadingTCPServer


VOICE_DIR = pathlib.Path(os.environ.get("ARCHAI_VOICE_DIR", "/private/tmp/voice"))
WHISPER = os.environ.get("ARCHAI_WHISPER_CLI", "/opt/homebrew/bin/whisper-cli")
WHISPER_MODEL = VOICE_DIR / "ggml-base.en.bin"
PORT = int(os.environ.get("ARCHAI_VOICE_PORT", "8123"))

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


class VoiceHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *_args):
        return

    def send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST,GET,OPTIONS")

    def send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors()
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/health"):
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
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            if self.path == "/stt":
                self.handle_stt(body)
                return
            if self.path == "/tts":
                self.handle_tts(body)
                return
        except Exception as error:
            self.send_json(500, {"ok": False, "error": str(error)})
            return
        self.send_json(404, {"ok": False, "error": "Not found"})

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
            )
            if converted.returncode != 0:
                raise RuntimeError("Audio conversion failed")
            result = subprocess.run(
                [WHISPER, "-m", str(WHISPER_MODEL), "-f", str(wav_path), "-nt"],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0:
                raise RuntimeError("Local transcription failed")
            self.send_json(200, {"text": " ".join(result.stdout.split()).strip()})
        finally:
            pathlib.Path(source.name).unlink(missing_ok=True)
            wav_path.unlink(missing_ok=True)

    def handle_tts(self, body):
        request = json.loads(body or b"{}")
        text = str(request.get("text") or "")[:1500]
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
