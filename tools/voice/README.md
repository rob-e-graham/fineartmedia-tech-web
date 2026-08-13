# ARCHAI local voice demo

This small local service powers the private Whisper and Piper demonstration used by the AUXIO concept pages.

It binds to `127.0.0.1:8123`. The public page first checks the same Mac, then the protected `/voice` route on the existing Cloudflare Tunnel. When neither path is available, AUXIO falls back to compatible speech features provided by the visitor's browser.

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

The public tunnel can be checked separately:

```sh
curl -s https://archai-api.fineartmedia.tech/voice/health
```

The tunnel configuration routes only `/voice/*` to this service. The bridge also enforces an origin allowlist, request-size limits, bounded concurrency and per-address rate limits. Keep the final catch-all backend rule below the voice rule.

On this Mac the bridge is installed as the `com.famtec.archai-voice` LaunchAgent. launchd runs a private copy from `~/.local/share/archai-voice` because macOS background services cannot reliably read an interactive user's Desktop folder. After changing `voice_server.py`, copy it there and restart the service:

```sh
cp tools/voice/voice_server.py ~/.local/share/archai-voice/voice_server.py
launchctl kickstart -k gui/$(id -u)/com.famtec.archai-voice
```

## Privacy boundary

- On the Mac, microphone audio stays on the Mac and is transcribed locally with whisper.cpp.
- On a phone or other remote device, microphone audio travels over encrypted HTTPS to the demonstration Mac, is processed there and is not deliberately retained.
- Piper speech is generated on the institution-controlled or demonstration Mac.
- The transcript is sent to the ARCHAI research chat endpoint for the concept reply.
- A fully institutional deployment can keep the chat model local as well.

The model files are deliberately not stored in the website repository.
