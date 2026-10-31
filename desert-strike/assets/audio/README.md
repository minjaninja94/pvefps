# Desert Front web audio assets

- `lobby-theme.mp3`: user-provided main-lobby soundtrack (loops at 30% volume)
- `battle-theme.mp3`: user-provided opening battle soundtrack
- `horizon-of-the-titan.mp3`: user-provided exchanged-combat soundtrack
- `iron-vanguard.mp3`: user-provided post-nuclear invasion highlight soundtrack
- `voice_index.json`: 544 precisely timed voice clips (spawn / attack / hit / death) across 10 factions and both existing skins
- `voice_cast.json`: casting metadata for 80 units
- `voices/`: 17 OGG voice atlases copied losslessly from the native Godot project
- `sfx/`: 13 original combat effect WAVs copied losslessly from the native Godot project

Web playback uses `combat-audio.js` for sound effects and unit voices, independent of the `lobby-music.js` BGM controller. All music shares the saved music slider/mute preference (default 30%). Battle masters are matched at approximately -14.4 LUFS; the older opening track uses a playback trim of 0.711. These are web soundtracks, not Godot background music.

VOICEVOX Nemo is used for Japanese human unit voices. **Credit: VOICEVOX Nemo**. For third-party attribution and original effects details, see `../../AUDIO_CREDITS.md` and https://voicevox.hiroshiba.jp/nemo/term/. Browser audio begins after an interaction; OGG voice decoding depends on the browser's codec support.


Battle progression is sticky for each match: opening track → Horizon after both teams deal unit damage → Iron after at least one successful nuke and a live non-guardian unit crosses the enemy forward tower (rightward beyond 75% or leftward below 25% of world width). Either team and any lane can trigger it. The host sends the same `musicStage` to every viewer, independent of fog; AI practice and solo use the same conditions. Lobby/new match resets the progression. The next track preloads without playing over the current one.

New MP3s are 44.1 kHz stereo, 160 kbps. Encoded from user attachments using `libmp3lame`, with linear trims -1.91 dB (Horizon) / -2.17 dB (Iron), no dynamic compression. Post-encode integrated loudness / true peak: Horizon -14.42 LUFS / -1.97 dBTP; Iron -14.41 LUFS / -1.91 dBTP.

| File | SHA-256 |
| --- | --- |
| Original Horizon_of_the_Titan.mp3 | aa59e6261b452582062a0657184777bc963b3191206b12ab49133b14e8f103dd |
| Original Iron_Vanguard.mp3 | 1b2f14b891b1e2695606c7f10f1a61715bd274aae1266deacd26af6af85fce8a |
| Shipped horizon-of-the-titan.mp3 | 27a330f7d828c66d6b105bc3e946952e9379fd722d77a5e0073281f536fae4b3 |
| Shipped iron-vanguard.mp3 | 8ee7ffea890c81ba664da7a91204902275a928dfb9fc5be6a1578984ddcbc4d0 |
