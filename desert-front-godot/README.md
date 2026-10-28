# Desert Front — Godot Migration (Online Lobby Prototype)

**Original browser code untouched.** Work only occurs in \`desert-front-godot/\` on \`feature/desert-front-godot-port\`; neither \`desert-strike/\` nor \`main\` changes.

## Current gameplay

Native Godot 4 Windows prototype: 10-faction / 80-unit base stats, single-lane production, basic combat, credits, upgrades, basic AI, LAN 1:1 authoritative room. Still **not feature-complete** versus browser Desert Front.

## Online without Steam, public IP, or router port forwarding

This checkpoint adds **NodeTunnel** GDExtension integration:

1. Developer registers an app ID on https://www.nodetunnel.io/ . This is a one-time product owner setup, NOT something players do.
2. Developer configures \`[relay] app_id="..."\` in \`desert-front-godot/online_relay.cfg\` **before building** the game.
3. The GitHub Actions Windows build job downloads NodeTunnel v1.1.1_beta into \`addons/nodetunnel\` and exports it with the game. For local Godot editor, install the plugin manually from https://github.com/NodeTunnel/godot-plugin/releases/tag/v1.1.1_beta and enable it in Project Settings.
4. In the game, players may use **온라인 공개방 만들기**, **공개방 검색 → 선택 방 참가**, or **비공개방 만들기 → 코드 참가**. The relay transmits game data; the lobby host alone validates construction and upgrade orders and simulates combat. No Steam, user IPs, inbound port forwarding, or developer-owned game server is required.
5. **Important:** The default \`app_id\` is intentionally blank. Until the product owner registers one and rebuilds, the online actions show a configuration message instead of claiming to connect. GitHub CI checks only the build and two-process **LAN** integration; no public relay round-trip was performed. The NodeTunnel public relay is third-party beta infrastructure, **not a guaranteed SLA** or unlimited production hosting.

For LAN testing: host clicks **LAN 방 만들기** and client connects to host IP on UDP 28765. Online relay users do **not** need that LAN workflow.

## Test and build

- Run editor: import \`desert-front-godot/project.godot\` in Godot 4.3+ and press F5.
- Headless smoke: \`godot --headless --path desert-front-godot --script res://tests/smoke.gd\`
- GitHub Actions \`Desert Front Godot smoke\` imports project, runs smoke and LAN host/client integration, then exports and uploads Windows artifact.

## Current limits and next tasks

- **Only 1:1 classic prototype** is supported; 2v2, 3v3, co-op, original 3-lane gameplay have yet to be ported.
- Native artwork is still placeholder vector markers; source animated sprite atlases have not been transferred.
- Unique race passives, guardian, heroic units, high-level AI, weapon effects and strict game rules parity with original web build need porting.
- Current match snapshots are full-state messages every 0.2 seconds. Before public launch, switch to compressed/delta snapshots and measure real bandwidth/latency. Room-browser and online reconnect also require human two-network end-to-end testing after app ID registration.
- NodeTunnel uses third-party relays. As a long-term alternative, Epic Online Services P2P also supports NAT traversal and relay fallback, but requires separate account/app configuration and integration.
