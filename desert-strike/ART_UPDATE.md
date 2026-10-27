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

## Persistent HUD and physical economy buildings

The header, resources, navigation and live frontline map now live in one sticky command stack. Base and battlefield views share the same continuously updated map. The previous third screen opens an upgrade layer below the command stack, leaving resources/map visible and the simulation running; it is also accessible above recruitment. Closing it returns to the same underlying view. The multiplayer overview and resource bar use the same command stack.

Recruitment now includes a ninth, illustrated **resource extractor**. Each extractor occupies one ordinary production slot, gives +1 CR per 0.5 seconds after stabilization, and does not spawn fighters. There can be seven extractors per commander across all lanes. Costs remain `round(70 × 1.36^currentCount)`.

A new extractor pauses that commander's entire periodic income (including base income) and wave stipend. Stabilization lasts `4 + 2 × newCount + min(6, floor(matchSeconds / 120))` seconds: 6 seconds for the opening investment, increasing to 18 seconds for seven early buildings and at most 24 seconds late in a match. This uses the game's 24-second deployment interval: early downtime is one quarter of a wave, rising toward a full wave. With +2 CR/second per extractor, the first building's 70 CR cost and 12 CR foregone base income take approximately 41 seconds to recover, compared with the old 35 seconds. Later investments incur more foregone income and must be weighed against the remaining match time. These are rule-based initial balance values, not measured player telemetry.

No income accumulates to be paid retroactively. A new extractor cannot be stacked while stabilization is active. Demolition returns 55% of the actual original purchase price and lowers income, but cannot clear stabilization. Normal troop construction remains available during stabilization. The AI follows the same costs, occupied slots and income suspension. Multiplayer performs every check on the host and hides enemy timing information.

New validation: `node desert-strike/smoke-economy.test.cjs` covers paid slots, suspended base/bonus income and wave stipends, exact resumption, no catch-up, refunds, timing bypass rejection, cross-lane seven-building cap, no combat-unit spawning and parity of both engines. DOM/native-canvas integration covers opening/closing upgrades, HUD ownership, extractor selection/building, nine multiplayer cards and the existing 80-unit raster paths. Real-device visual testing remains unverified.

The extractor image is stored at `assets/resource-extractor.webp`. It was generated with the built-in image tool using the prompt: a solitary transparent isometric pixel-art industrial resource extraction station, olive-gray steel housing, gold/cyan core, mechanical drill boring into gold crystals; complete silhouette, no ground tile, scenery, humans or text; readable at 72px. It is used in recruitment, occupied slots and the base preview.
