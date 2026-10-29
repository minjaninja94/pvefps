# Player-facing copy cleanup — 2026-10-29

Removed development metadata, patch commentary, decorative subtitles and repeated explanations across the lobby, production, battle, upgrades and result screens. Kept actionable controls, opening countdown, account storage limitations and VOICEVOX attribution. Detailed faction and unit information remains available through tooltips, with defense/statistics help collapsed by default.

Economy tooltips now use the actual income calculation for every level, including the 15% reduction at levels 5–7. Solo and multiplayer show the real next total income, construction/stabilization times, complete income/stipend blackout and demolition persistence. At seven extractors the UI shows the cap instead of an eighth purchase. Removed fixed conflicting augment catalogue counts; the catalogue retains its dynamic count. Corrected victory help to one core for solo/classic and two for three-lane matches. Unit preview includes cost; solo selected-unit stats include research and display healing for support units.

No gameplay parameters, timers, prices, movement, combat, purchases, networking or income accounting changed.

## Validation

- Economy and multiplayer production UI regression, including levels 0–7, next income and maximum-cap display.
- Half-time pacing and unchanged 80-unit definitions in both engines; 50-wave rules across game modes.
- 24 lobby, augment, career, endless-wave, upgrade and isometric rendering checks.
- V2 seeded endurance and anti-spam scenarios.
- JavaScript syntax and whitespace checks.
- Browser QA: cleaned lobby, solo opening countdown, production cards and selected extractor details.

Added production/lobby UI regression commands to the existing economy workflow.
