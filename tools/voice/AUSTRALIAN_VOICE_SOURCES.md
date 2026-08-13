# Australian voice sources for ARCHAI and AUXIO

Updated 14 August 2026.

## Recommended use

Australian speech data should be split into two collections with different governance:

1. A research corpus for evaluating and improving Australian speech recognition.
2. A named, consented voice cast for visitor-facing synthetic speech.

An open speech-data licence does not by itself provide the ethical permission needed to turn an identifiable contributor into a museum narrator.

## Sources reviewed

### Mozilla Common Voice v24, Australian English subset

- URL: https://mozilladatacollective.com/datasets/cmko7havo02f5nw07rbwwhowe
- Size: 1.92 GB
- Contents: 55,673 Australian-accented read-speech clips
- Accent labels include Australian English, General Australian, South Australia, Sydney and Queensland descriptors.
- Licence: CC0 1.0
- Intended task: automatic speech recognition
- Important condition: attempting to identify speakers is forbidden.
- ARCHAI use: suitable for transcription evaluation and possible ASR adaptation; not treated as a catalogue of cloneable performers.

### AusTalk / Big Australian Speech Corpus

- Overview: https://www.ldaca.edu.au/about/sample-collections/
- Corpus paper: https://research-management.mq.edu.au/ws/portalfiles/portal/17333441/mq-37346-Publisher%2Bversion%2B%28open%2Baccess%29.pdf
- Scope: approximately 1,000 Australian English speakers, with extensive audio-visual sessions and regional coverage.
- Access: through the Language Data Commons of Australia; collection-specific terms apply.
- ARCHAI use: linguistic and recognition research subject to its access agreement. Public synthesis requires separate, explicit permission.

### Sydney Speaks

- URL: https://datacommons.anu.edu.au/DataCommons/rest/display/anudc%3A6184
- Scope: historical and contemporary spoken Australian English across varied social and cultural backgrounds.
- ARCHAI use: research into variation and historical speech, subject to the corpus licences. Oral histories are not a stock-voice library.

### Commercial Australian English TTS corpora

Commercial suppliers advertise small Australian TTS datasets, including two-speaker products. These require contractual review covering speaker consent, model training, generated-output rights, sublicensing, deletion and commercial use before evaluation.

## Current prototype

- `rob_au` is a named Australian English voice prototype made from a recording supplied directly by Rob Graham.
- The private source recording and model runtime stay outside Git and the public website.
- A short, reviewed synthetic preview is public.
- Arbitrary public synthesis is blocked.
- English is the only approved synthesis language for this profile.

## Proposed museum voice pack

Start with six to twelve contributors rather than scraping a large anonymous corpus. Seek a range of ages, genders, regions and speaking styles without reducing people to accent stereotypes. Aboriginal English and community languages require community-led governance, attribution and approval.

Each contributor should have:

- a plain-language consent agreement;
- approved projects, institutions and audience contexts;
- approved languages and whether cross-language synthesis is permitted;
- prohibited uses;
- attribution preference;
- compensation and term;
- withdrawal and deletion process;
- a voice card published wherever the profile is offered;
- human review of every supported language before release.

This creates a voice collection that museums can trust and contributors can remain in control of.
