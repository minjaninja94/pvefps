# Dynamic battle music and opponent skin verification

- Cosmetic handshake now explicitly retries missing guest appearance data before host match creation. A match cannot silently fall back to a default skin after the 1.5-second handshake deadline. Existing Firebase cosmetic schema stays compatible.
- First snapshot preloads every player's custom skin sheets, including the opponent's. Rendering does not depend on whether the viewer owns that skin. The previous shared rendering fix covers full overview and lane view.
- Music stages are authoritative, global and monotonic per match. Both teams must have dealt actual unit damage for Horizon. At least one successful nuclear strike plus a surviving non-guardian invasion beyond the enemy forward tower triggers Iron, from either direction and any lane. Failed nuke attempts, guardians and dead units do not qualify. A quiet battle does not roll music back.
- Stage is sent independently of fog/private economy in all snapshots. No separate viewer-side combat guess can select a different song. Single-player tracks the same conditions. Song phase resets on a new match; repeated snapshots never restart it. This synchronizes song selection, not sample-exact playback clocks.
- Audio default and saved music slider apply to all stages. Old opening master receives a trim; both supplied songs were encoded at matched loudness with true-peak headroom. Next song preloads silently. Exactly one music player runs at a time. Sources, trims, loudness, peaks and hashes are documented in assets/audio/README.md.

## Verification

17 relevant Node checks pass: music preferences, authoritative phase transitions in classic/three-lane modes, enemy nuclear strike and leftward invasion, invalid highlight cases, solo parity, production UI, gameplay balance parity, and mocked WebRTC transport for 1v1/2v2/3v3/coop/augment/prism.

The real transport test deliberately drops the guest's first appearance packet. It verifies request/retry recovery, distinct host gold/guest aurora IDs on both clients' actual spawned units, and both music-stage values carried through the data channel.

`tests/battle-music-browser.cjs` opens two Chromium pages and feeds each viewer its authoritative snapshot through the production multiplayer UI. Both pages verify:
- all ten custom role sheets load; selected gold/aurora skins reach the battlefield renderer and have different actual pixels (without viewer ownership);
- actual MP3 decode, progressing playback time and nonzero Web Audio signal for opening/Horizon/Iron;
- a single looping song, saved volume controls, mute/resume, lobby stop and new-match reset.

Reference default-30% browser run: measured signal RMS 0.0193 (opening), 0.0268–0.0306 (Horizon) and 0.0318–0.0331 (Iron), with no media errors. These short-window levels confirm output, not whole-track loudness; integrated mastering measurements are in the audio README.

Checks are local browser and mocked signaling/RTC integration, not a physical two-device Internet play session or subjective speaker/headphone listening assessment.
