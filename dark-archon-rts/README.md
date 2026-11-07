# Dark Archon Dominion RTS

Standalone browser prototype; open `index.html` with an HTTP static server.

## Controls
- Left click: select friendly unit
- Left drag: box selection; Shift: additive/toggle selection
- Double left click: select all friendly units of the same type
- Right click ground: move; right click enemy: focus attack
- A then left click: attack-move
- S: stop (does not auto-acquire new targets)
- H: hold position (can attack nearby units)
- Ctrl+1..5: save control group; 1..5: select it
- M then enemy left click: Dark Archon mind control (120 energy)
- E then ground left click: Maelstrom (75 energy)
- Space: pause

## Sprites

Original StarCraft/Brood War sprites are copyrighted Blizzard assets **not included in this repository**. Use legitimately acquired images and respect applicable licensing/permission.

Place stand-alone unit PNG files under `assets/units/<type>.png` to replace the temporary fallback drawing. Types: `darkarchon, ultra, marine, zealot, hydra, goliath, archon`.

The optional animation atlas uses `assets/units/<type>.json` with accompanying `<type>-sheet.png`. Example:

```json
{
  "image": "ultra-sheet.png",
  "frameWidth": 96,
  "frameHeight": 96,
  "directions": 8,
  "frames": {"idle": 4, "move": 8, "attack": 6},
  "fps": {"idle": 5, "move": 10, "attack": 12},
  "scale": 1
}
```

Atlas layout: one row per direction (direction 0 facing right, then counterclockwise in 45-degree steps); each row concatenates **idle, move, attack** frames, respectively. Keep the same frame size across all sprites. Missing images gracefully use static PNG or procedural placeholder shapes.

For extracting original GRP/CASC assets from your own installation, see https://github.com/broodwar-live/assets-pipeline; this extraction utility is not a license grant.

## Status
The RTS commands and sprite loading system are implemented. Browser gameplay, sprite alignment and performance still need end-to-end testing. The implementation is a prototype, not a frame-perfect replica of StarCraft.
