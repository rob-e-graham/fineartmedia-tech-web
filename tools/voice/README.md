# ARCHAI local voice demo

This small local service powers the private speech demonstration used by the AUXIO concept pages. It combines multilingual whisper.cpp transcription, fast Piper voices and an optional consented Chatterbox voice clone.

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

- `ggml-base.bin` for multilingual whisper.cpp
- the Piper `.onnx` and matching `.onnx.json` files named in `voice_server.py`

The consented prototype voice uses Chatterbox Multilingual V3 in an isolated Python 3.11 environment. Its reference file is stored at `~/.local/share/archai-voice/references/rob-graham-en-au.wav`; it must remain outside Git and the public website. The voice is identified in the interface as a consented prototype and should not be repackaged as a generic model voice. Although the engine supports 23 languages, this English reference is currently approved and quality-checked only for English. Other languages use language-matched voices supplied by the visitor's device.

The public `/voice` route does not permit arbitrary synthesis with cloned voices. The website exposes only a fixed, reviewed preview file. Full cloned synthesis is limited to the loopback service until generated replies can carry a server-verifiable authorisation token.

Verify the service before presenting:

```sh
curl -s http://127.0.0.1:8123/health
```

The expected response includes `"ok": true`, `"stt": "whisper.cpp base multilingual"`, and the installed voice IDs.

The public tunnel can be checked separately:

```sh
curl -s -H 'Origin: https://fineartmedia.tech' \
  https://archai-api.fineartmedia.tech/voice/health
```

The tunnel configuration routes only `/voice/*` to this service. The bridge also enforces an origin allowlist, request-size limits, bounded concurrency and per-address rate limits. Keep the final catch-all backend rule below the voice rule.

On this Mac the bridge is installed as the `com.famtec.archai-voice` LaunchAgent. launchd runs a private copy from `~/.local/share/archai-voice` because macOS background services cannot reliably read an interactive user's Desktop folder. Its model directory is `~/.local/share/archai-voice/models`, outside macOS's temporary storage. After changing `voice_server.py`, copy it there and restart the service:

```sh
cp tools/voice/voice_server.py ~/.local/share/archai-voice/voice_server.py
launchctl kickstart -k gui/$(id -u)/com.famtec.archai-voice
```

## Privacy boundary

- On the Mac, microphone audio stays on the Mac and is transcribed locally with whisper.cpp.
- On a phone or other remote device, microphone audio travels over encrypted HTTPS to the demonstration Mac, is processed there and is not deliberately retained.
- Piper and consented cloned speech are generated on the institution-controlled or demonstration Mac.
- The transcript is sent to the ARCHAI research chat endpoint for the concept reply.
- A fully institutional deployment can keep the chat model local as well.

## Voice governance

- A voice reference needs explicit permission for synthesis, its allowed uses, supported languages and retention period.
- Generated audio must identify the synthetic speaker profile and remain revocable.
- Public speech corpora can be used to evaluate Australian speech recognition when their licence allows it. They are not treated as a catalogue of cloneable museum performers.
- Cross-language cloning retains aspects of the reference speaker, but pronunciation is produced by the target-language model. Every language and cultural context needs human review before public use.

The model files are deliberately not stored in the website repository.
