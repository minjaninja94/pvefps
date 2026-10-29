# Construction and income expansion — 2026-10-29

- Production buildings retain their 24-second construction time. The build grid now shows a progress bar and seconds remaining immediately below the building name in solo and multiplayer.
- Extractor construction by new income level: 24 / 32 / 40 / 48 / 56 / 64 / 72 seconds.
- After construction, stabilization takes `4 + 2 * level + min(6, floor(purchaseSeconds / 120))` seconds. Both phases block the owner's basic income, extractor income, and wave stipend. Missed payments are discarded.
- The first expansion blocks income for 30 seconds. The seventh blocks it for 90–96 seconds. Another extractor cannot start during either phase. Demolition does not clear an existing blackout.
- Both solo factions, multiplayer owners, normal bots and hard bots use these rules. Multiplayer extractor timing metadata is visible only to allies. Construction timers use simulation time, so pausing does not consume the penalty.
- Construction bars transition to a cyan stabilization bar and disappear after stabilization. Timer refreshes do not rebuild the solo unit catalogue.
- Web script/style cache versions updated to `income-build1`.

## Verification

Passed: economy regression (all seven levels, no catch-up, stipend blackout, demolition, timer stages, solo/AI parity, snapshot privacy); multiplayer build-grid timer transitions; 50-wave rules; hard AI resource ledgers (20 seeded eight-minute cases); classic duel; mocked P2P classic/PvP/co-op rooms; V2/endurance; solo augments; multiplayer augments; endless-wave rules.

The existing network and classic-duel tests were updated for the preceding 8640-HP core and 24-second factory changes. The hard-AI ledger uses actual late-tier income and an eight-minute horizon appropriate to the longer expansion blackout.

Browser DOM checks found both production-building and extractor countdown bars. Full-page screenshot verification was limited by browser timeouts.

## Actual-engine campaign sample

After integrating main through `744215f` (including normal-bot opening production and deterministic augment draws), the existing `benchmark-50-wave.cjs` ran eight solo matches (normal/hard, standard/augment, two factions) and two co-op matches with real purchases and combat. Solo completions: 31, 24, 35, 24, 30, 37, 26, 26 waves; mean 29.1. Co-op: 22 and 25 waves. These are scripted purchase strategies, not a representative player population. The earlier 45–55-wave objective remains unmet in this sample; this change intentionally makes poorly timed economy expansion more punishable and does not claim to achieve that objective.
