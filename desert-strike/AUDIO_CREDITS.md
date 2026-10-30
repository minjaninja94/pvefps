# Desert Front audio credits

- Human Japanese unit speech: **VOICEVOX Nemo** (female styles 1-6, male styles 1-3), generated locally with voicevox_nemo_engine 0.26.0. Credit required by the [VOICEVOX Nemo terms](https://voicevox.hiroshiba.jp/nemo/term/). The casting list is in assets/audio/voice_cast.json.
- Music and hover cue: **SRG774**, [Dark Sci-Fi Audio Pack](https://opengameart.org/content/dark-sci-fi-audio-pack), CC0 1.0. Tracks: Title (menu), Sector (room), Pulse (battle), Urgent (base danger), Transmission (results), Airy and Victory (additional ambience/cue).
- Combat cues, nonverbal machine and monster voices, and two-tone base alarm: generated for Desert Front by tools/generate_sfx.py and tools/build_audio.py.

The original 544 voice clips remain indexed in `assets/audio/voice_index.json` and packed into 17 OGG atlases. Newly rendered sniper and assassin voices (10 factions × 2 classes × 4 events = 80 Japanese lines, mapped to both default and moe skins) are generated with the official VOICEVOX Nemo engine into `assets/audio/voices/spec-f0.ogg` through `spec-f9.ogg`, then added to the same index. See `tools/generate-nemo-specialists.py` and the GitHub workflow `voicevox-nemo-specialists.yml`. Until these ten assets are present, the specialist audio player reuses the existing Japanese Nemo soldier voices; it never invokes browser TTS. Both the browser game and Godot retain the original shared audio directory. Credit: **VOICEVOX Nemo**.

