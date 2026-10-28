# DESERT FRONT — Godot 4 migration (checkpoint 1)

**Isolated new project.** The source web game in \`desert-strike/\` is not modified. The Godot project is kept only under \`desert-front-godot/\` on a dedicated feature branch.

## Run

1. Install Godot 4.x (Godot 4.3 or newer recommended).
2. Open Godot Project Manager > Import > select \`desert-front-godot/project.godot\`.
3. Run the project (F6/F5 depending on scene/project) or launch from the command line:
   \`godot --path desert-front-godot --editor\`
4. Headless smoke verification (if Godot CLI is installed):
   \`godot --headless --path desert-front-godot --script res://tests/smoke.gd\`

## Current implemented slice

- Godot native window, panels, single-lane 2D battleground and on-screen HP.
- 10 factions / 80 named production units transcribed from current web source.
- Base HP, damage, armor, attack range/cooldown, speed, attack-air flags, support healing and faction stat mutators ported.
- 75-slot production construction, 55% refund demolition, credits, 24-second waves, unit spawning.
- Basic enemy AI production, unit movement, target acquisition, direct damage, simple siege splash, basic healing, base and tower damage.
- 5-level weapon and armor upgrades.
- GDScript headless smoke test added.

## Not yet equivalent to web version

**This is a first playable port, not a feature-complete conversion.**

- Graphics use temporary Godot-drawn combat markers; existing animated WebP sprites have **not** yet been transferred.
- Special unit skills, passives (such as brood spawning, robot regeneration, fairy chain heal, beastkin ranged mitigation), advanced hero/guardian, AI hard mode, fog, tower guardian, special bombardments, all existing UI are not yet carried over.
- PvP / 3-line / classic online / co-op are not enabled in Godot yet. Steamworks, achievements, networking, and Steam Cloud are not yet integrated.
- Economy, combat timing, splash, and base targeting require parity checks against browser engine before competitive use. Current smoke tests verify only basic invariants.
- Running/binary verification must happen in an environment with Godot installed. This commit has not been engine-executed within ChatGPT's current container.

## Source mapping

| Original (read only) | New Godot module |
| --- | --- |
| \`desert-strike/game-v2.js\` — role & faction definitions | \`scripts/roster.gd\` |
| \`desert-strike/tri-lane-engine.js\` — host simulation concept | \`scripts/battle_sim.gd\` |
| \`desert-strike/index.html\` / \`style-v2.css\` | \`scripts/main.gd\` |
| Browser Canvas 2D drawing | \`scripts/battlefield.gd\` |

## Next checkpoint

Bring the real unit sprite atlas into native Godot imports and port a deterministic combat scenario with golden-result checks. Only then move multiplayer host/guest state and Steamworks transport.
