# ARCHAI local voice demo

This small local service powers the private Whisper and Piper demonstration used by the AUXIO concept pages.

It binds to `127.0.0.1:8123`, so it is reachable only from the same Mac. The public page detects it automatically. When the service is unavailable, AUXIO falls back to compatible speech features provided by the visitor's browser.

## Start

```sh
python3 tools/voice/voice_server.py
```

The default model directory is `/private/tmp/voice`. Override it when models are stored elsewhere:

```sh
ARCHAI_VOICE_DIR=/path/to/voice-models python3 tools/voice/voice_server.py
```

The directory should contain:

- `ggml-base.en.bin` for whisper.cpp
- the Piper `.onnx` and matching `.onnx.json` files named in `voice_server.py`

Verify the service before presenting:

```sh
curl -s http://127.0.0.1:8123/health
```

The expected response includes `"ok": true`, `"tts": "piper"`, and the installed voice IDs.

## Privacy boundary

- Microphone audio sent to this service stays on the Mac and is transcribed locally with whisper.cpp.
- Piper speech is generated locally.
- The transcript is sent to the ARCHAI research chat endpoint for the concept reply.
- A fully institutional deployment can keep the chat model local as well.

The model files are deliberately not stored in the website repository.
