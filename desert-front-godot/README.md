# DESERT FRONT — Godot 4 migration (checkpoint 2: LAN 1v1)

**Isolation guarantee:** The original browser game in \`desert-strike/\` and the \`main\` branch remain untouched. Changes are isolated to \`desert-front-godot/\` and its dedicated GitHub Actions workflow, in branch \`feature/desert-front-godot-port\`.

## Run

1. Import \`desert-front-godot/project.godot\` into Godot 4.3+.
2. Run the game.
3. Offline: choose your faction and click "새 경기 시작".
4. LAN 1:1: host presses **1:1 방 만들기**. Guest chooses their faction, types the host's local IP (or \`127.0.0.1\` if testing on the same computer), presses **방 참가**, then **준비 완료**. Host starts the match using **경기 시작**.
5. The host must permit incoming UDP **28765** through the firewall. Internet play using ENet also requires public reachability / UDP port forwarding, which may be impossible through carrier-grade NAT.

## Implemented so far

- Native Godot 2D battleground, controls, 10-faction/80-unit basic roster data, 75 production slots, economy, combat, simple enemy AI, upgrade and tower prototype.
- **LAN 1:1 foundation**: one peer hosts a room; another joins via IP; guest selects a faction and marks ready; host alone starts, simulates combat and validates both players' unit construction and upgrade orders.
- Both players receive periodic snapshots and use the same visualized battleground with their own cash, production grid, and upgrades.
- Godot headless smoke test, two-process ENet host/guest integration test, Windows preview build job.
- Native multiplayer uses **ENet for LAN testing**, **NOT** Steamworks. There is currently no Steam public lobby, invite list, NAT relay, or cross-platform matchmaking.

## Important migration limitations

This remains a **limited native prototype**, not feature parity with Desert Front Web. Graphics are temporary circular markers, not the original animated WebP sprites. Web version's full combat balancing, special skills, rich AI, air rules, guardian, hero, 3-lane PvP and co-op have not yet been ported. LAN host/guest networking does not confer Steamworks integration.

## Source mapping

| Browser source (read-only) | Godot module |
| --- | --- |
| \`desert-strike/game-v2.js\` definitions | \`scripts/roster.gd\` |
| \`desert-strike/tri-lane-engine.js\` design | \`scripts/battle_sim.gd\` |
| WebRTC+Firebase network concept | \`scripts/network_session.gd\` |
| \`desert-strike/index.html\` UI | \`scripts/main.gd\` |
| Canvas 2D renderer | \`scripts/battlefield.gd\` |

## Next checkpoint

Finish native combat parity and sprite atlas, then move Steam transport behind the same authoritative match protocol using GodotSteam's SteamMultiplayerPeer, with Steamworks AppID, full-room matchmaking, overlay invites, and connection testing on two Steam accounts. Leave the ENet LAN option for local testing.
