# Voice system — "Read answers aloud"

The interactive CV/demo pages (`cv.html`, and the same engine on `acmi.html`,
`acmi-2.html`, `heide.html`, `heide-2.html`) can read AI answers aloud. Voice
selection lives in the inline `<script>` in each page.

## Architecture

Two tiers, sovereign first, browser speech as fallback:

1. **Sovereign voice server** — Piper + MeloTTS + a cloned voice, on Rob's own
   hardware, reached at:
   - `http://127.0.0.1:8123` when the page is opened on localhost
   - `https://archai-api.fineartmedia.tech/voice` everywhere else (CORS-locked tunnel)

   `initVoices()` calls `GET <server>/health` (2.5s timeout). On success it lists
   the studio voices from `VOICE_LABELS`, e.g. `aussie` = "Matilda · Female ·
   Australian (MeloTTS)", `rob_au` = "Rob · Male · Australian (cloned voice)",
   plus Piper voices (Ada, Cate, Amy, Nora, Ryan, Alan, Ted).

2. **Browser speech (`speechSynthesis`)** — used when the sovereign server is
   unreachable or times out. `populateBrowserVoices()` builds the picker;
   `browserSpeak()` / `browserSpeakFallback()` speak.

## Known constraint (public site)

From `fineartmedia.tech` the sovereign server returns **HTTP 403** (the tunnel is
CORS-locked / Rob's hardware gates public requests), so the live pages **always**
fall back to browser speech. The named studio voices (Matilda, Rob-cloned, Piper)
therefore do **not** load publicly as things stand.

To get named studio-quality voices on the public site, one of:
- (a) accept the curated browser fallback (current behaviour); or
- (b) open the voice server / tunnel to the `fineartmedia.tech` origin; or
- (c) add a cloud-TTS endpoint (e.g. ElevenLabs — "Matilda" is theirs) as the
  public fallback (needs an API key + a small serverless function).

## Fix — 2026-09-04 (cv.html)

Symptom: the public page read answers in a **female computer voice**. Cause: the
browser fallback grabbed the first `en-AU` voice, which is **Karen (female)** on
most devices; the picker also hid all women whenever any male voice existed.

Changes in `cv.html`:
- **Never defaults to a female voice.** `populateBrowserVoices()` now defaults to
  the best available **male** voice, Australian accent preferred (matching Rob's
  studio voice), and honours an explicit user selection.
- **Both men and women** are listed (the old male-only collapse is gone),
  **quality-ranked** (Siri / enhanced / natural first, then en-AU → en-GB → en-US
  → other en), with **novelty / low-quality voices filtered out**
  (`VOICE_BLOCKLIST`: Zarvox, Bells, Bad News, etc.).
- Options are labelled `Name · Gender · Accent` (gender via `MALE_NAME_HINTS` /
  `FEMALE_NAME_HINTS`, accent via the `ACCENTS` lang map).
- `browserSpeakFallback()` (the emergency path fired on a sovereign timeout —
  the "That answer used the browser voice…" message) now honours the selected
  voice first, then prefers a male en-AU / male en voice before any fallback.

**Still to do:** propagate the same fallback fix to `acmi.html`, `acmi-2.html`,
`heide.html`, `heide-2.html` (identical bug); decide the public premium-voice
path (a / b / c above).
