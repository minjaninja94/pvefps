# Desert Front audio credits

- Human Japanese unit speech: **VOICEVOX Nemo** (female styles 1-6, male styles 1-3), generated locally with voicevox_nemo_engine 0.26.0. Credit required by the [VOICEVOX Nemo terms](https://voicevox.hiroshiba.jp/nemo/term/). The casting list is in assets/audio/voice_cast.json.
- Music and hover cue: **SRG774**, [Dark Sci-Fi Audio Pack](https://opengameart.org/content/dark-sci-fi-audio-pack), CC0 1.0. Tracks: Title (menu), Sector (room), Pulse (battle), Urgent (base danger), Transmission (results), Airy and Victory (additional ambience/cue).
- Combat cues, nonverbal machine and monster voices, and two-tone base alarm: generated for Desert Front by tools/generate_sfx.py and tools/build_audio.py.

The 544 voice clips are indexed in `assets/audio/voice_index.json` and packed into 17 OGG atlases. Both the browser game and Godot read this shared directory. Rebuilding voices requires the local VOICEVOX Nemo engine, then `tools/pack_audio.py`; the engine itself is not distributed with the game.

