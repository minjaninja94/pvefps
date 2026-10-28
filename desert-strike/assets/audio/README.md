# Desert Front web audio assets

- `lobby-theme.mp3`: user-provided main-lobby soundtrack (loops at 30% volume)
- `battle-theme.mp3`: user-provided battle soundtrack (loops at 35% volume)
- `voice_index.json`: 544 precisely timed voice clips (spawn / attack / hit / death) across 10 factions and both existing skins
- `voice_cast.json`: casting metadata for 80 units
- `voices/`: 17 OGG voice atlases copied losslessly from the native Godot project
- `sfx/`: 13 original combat effect WAVs copied losslessly from the native Godot project

Web playback uses `combat-audio.js` for sound effects and unit voices, independent of the unchanged `lobby-music.js` BGM controller. The two music tracks here are the existing web tracks, not Godot background music.

VOICEVOX Nemo is used for Japanese human unit voices. **Credit: VOICEVOX Nemo**. For third-party attribution and original effects details, see `../../AUDIO_CREDITS.md` and https://voicevox.hiroshiba.jp/nemo/term/. Browser audio begins after an interaction; OGG voice decoding depends on the browser's codec support.
