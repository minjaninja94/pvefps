# Reference art and multiplayer refresh

- The ten user-supplied sheets are split by faction, role and action. Action sheets use 96px cells, eight presentation frames, forty rows (8 roles × idle/move/attack/skill/death). Original sources contain different pose counts; repeated source poses fill presentation cells. Extra frame positions are playback timing, not a claim of newly painted frames.
- Real sprites take priority over procedural rendering. Dedicated Odo Bongo, beastkin cavalry, wolf cavalry, transforming mech and **human** Huanglong take priority over generic roles. Aircraft for the other factions use their supplied action art.
- Commander selection uses the supplied portrait and header artwork. Existing faction identities and gameplay stats stay intact. Moe skin art remains a separate pipeline awaiting the next upload.
- `tools/extract_reference_sprites.py INPUT_DIR` rebuilds the source atlases using Pillow, NumPy and SciPy. Source filenames match the uploaded image-gen PNG files. Row boundaries are measured individually because these are illustrated reference sheets, not uniform source atlases. Extraction cannot invent missing poses; small effects crossing neighboring source frames may need manual cleanup.
- `assets/sprites/special-actions.webp` was created with the built-in image generator. Prompt: transparent pixel-art 8-column × 6-row sheet; rows Odo Bongo armored noodle van, beastkin mounted lancer, armored wolf rider, chrome blue transforming robot/vehicle, adult human Korean marine Huanglong carrying steaming food, red-black jetpack marine. Columns idle, two movement poses, attack windup, impact, special, hurt, death. Keep every subject fully within its cell and preserve identity. The sixth row is retained in the asset; current marine role 6 is the ground van.

## UI and transport

Solo and multiplayer have explicit gameplay contexts; opposite-mode tabs and keyboard navigation are blocked. Multiplayer uses eight visual recruitment cards and image production slots, the same terrain renderer, visible unit costs, opposing facing, keyboard selection and minimum 44px touch controls. Mobile cards wrap into four columns and production slots scroll horizontally.

Host simulation remains authoritative at 20Hz; peer snapshots at 5Hz. Pending state snapshots are skipped above 64KiB buffered transport data so stale state does not grow unbounded; commands and acknowledgments stay reliable. Guests reject older sequence numbers. Rendering stays at approximately 12fps with cached frames and terrain. Solo rendering is suspended while in the lobby or multiplayer, and only visible solo canvases render.

## Validation

- `node desert-strike/smoke-trilane.test.cjs`: 1v1 through 3v3 and two/three-human cooperative combat, construction, fog redaction.
- `node desert-strike/smoke-trilane-network.test.cjs`: mocked Firestore/WebRTC room creation, join, ready, start, authoritative orders, cleanup, two/three-person co-op.
- DOM/native-canvas integration: ten atlases load, all 80 units and 6,400 action lookups render at 72px, solo/multi routing, image recruitment and click construction.
- Existing `smoke-v2` fails its flier adaptation assertion on both baseline and modified code. `smoke-nine` still expects 9 factions; the current roster has 10. `smoke-isometric` checks an obsolete exact source expression. These pre-existing tests are not treated as passing.
- A Chromium executable could not be downloaded in this environment. Native-canvas renders and DOM/CSS checks were used; real PC/mobile layout and three remote devices have not been verified here.
