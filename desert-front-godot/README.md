# Desert Front native Godot port — 3-lane and multiplayer checkpoint

The browser game under desert-strike/ is READ ONLY. This new project stays on feature/desert-front-godot-port under desert-front-godot/.

## Ported into Godot source

- 80 original WebP unit sprite strips (8 frames each) plus 10 faction banners imported via a separate read-only copy process.
- Classic one-line battles plus a continuous 3-band battlefield for 1v1, 2v2, 3v3 and 2/3-person co-op.
- Per-player credits, owned production slots by lane, extractors, 5-level weapon/armor upgrades, repair, nuke and targeted barrage.
- 20-soldier hero aggregation, forward defense towers, 150-credit attacker reward and one defensive no-cross-midline guardian per fallen forward tower.
- Faction combat mechanics: brood hatchlings, Marine spoils/conscripts/support heal, Fairy chain heal, Octoper ink, Robot regeneration, Beastkin ranged mitigation, Astral ward, Elf criticals, Furry pack synergy and Forge armor.
- Native 3-band pixel battlefield with life bars, guardian aura and animations, click-to-select lanes and production/upgrades/tactics panels.
- NodeTunnel online room/ready/host-authoritative order flow; 2v2/3v3 and co-op team sizes represented in native match code.
- Hard-mode weighted AI with economic production and threat response.

## Run

From the repository root run: python3 desert-front-godot/tools/sync_web_art.py
Open desert-front-godot/project.godot in Godot 4.3+, and press F5.
On the original native screen click '3라인 · 2:2 · 3:3 · 협동' for the new battle and lobby UI.
Windows distribution is published to GitHub Releases as DesertFront-Preview-Windows.zip with native WebP imports and the NodeTunnel DLL.

## Still not completed or validated

This is a partial migration, not feature parity. Exact browser combat timing/AI/consolidation behavior, all unique graphics/skins/effect animations, production performance, user account & ranking, reconnection, and web UI polish need further work.
Local headless LAN 1v1 tests and automated tri-lane simulation/scene tests do not prove actual online 2v2/3v3 or co-op connectivity across networks. The relay service is third-party beta.
Do not market this as a stable complete release; it is an alpha preview.
