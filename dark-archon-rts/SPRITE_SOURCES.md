# StarCraft sprite source index (verified 2026-11-07)

This document lists references for the units supported by **dark-archon-rts**. These links and extraction-tool source paths do **not** grant a license to redistribute Blizzard Entertainment's artwork.

| Game unit key | Original sprite reference | Internal GRP path or data identifier | Included in this repo? |
|---|---|---|---|
| darkarchon | [Stargus unit dataset](https://github.com/Wargus/stargus/blob/master/dataset/units.json) (`unit-protoss-dark-archon`) | Stargus data entry; not yet confirmed as a single GRP filename | No |
| ultra | [Zerg Ultralisk sprite sheet](https://www.spriters-resource.com/pc_computer/starcraft/asset/59999/) | `unit\zerg\ultra.grp` | No |
| marine | [Terran Marine sprite sheet](https://www.spriters-resource.com/pc_computer/starcraft/asset/31462/) | `unit\terran\marine.grp` | No |
| zealot | [Protoss Zealot sprite sheet](https://www.spriters-resource.com/pc_computer/starcraft/asset/59953/) | `unit\protoss\zealot.grp` | No |
| hydra | [Zerg Hydralisk sprite sheet](https://www.spriters-resource.com/pc_computer/starcraft/asset/60014/) | `unit\zerg\hydra.grp` | No |
| goliath | [Stargus converter](https://github.com/Wargus/stargus/blob/master/src/ImagesConverter.cpp) | `unit\terran\goliath.grp` with turret `unit\terran\goliatht.grp` | No |
| archon | [Protoss Archon sprite sheet](https://www.spriters-resource.com/pc_computer/starcraft/asset/60077/) | `unit\protoss\archon.grp` | No |

## Source notes

- [The Spriters Resource: original StarCraft library](https://www.spriters-resource.com/pc_computer/starcraft/) contains 43 posted sprite assets, not every unit as an independent sheet.
- [Stargus](https://github.com/Wargus/stargus) is a StarCraft importer/converter, not a pack of redistributable original artwork. Its README requires an existing StarCraft installation for extracting data.
- [Stargus ImagesConverter.cpp](https://github.com/Wargus/stargus/blob/master/src/ImagesConverter.cpp) and [PngExporter.cpp](https://github.com/Wargus/stargus/blob/master/src/PngExporter.cpp) convert original game resources to graphics.
- [Brood War assets-pipeline manifest](https://github.com/broodwar-live/assets-pipeline/blob/main/src/manifest.rs) records GRP paths for Marine, Zealot, Ultralisk, Hydralisk, Goliath and Archon.
- [Protoss portrait sheet](https://www.spriters-resource.com/pc_computer/starcraft/asset/59886/) contains portrait art, not a regular direction/movement animation atlas.
- [StarCraft Remastered Redesign](https://www.behance.net/gallery/66856541/Starcraft-Remastered-Redesign) is design inspiration for the new HUD, not a source of redistributable assets.

## Use your own sprite sheet

Open the [game preview](https://raw.githack.com/minjaninja94/pvefps/main/dark-archon-rts/index.html), scroll to **ORIGINAL SPRITE IMPORT**, select the unit and a downloaded or extracted PNG/WebP file, then click **이미지 불러오기**.

If the source image is a sprite sheet, provide **X, Y, width and height** for a specific frame and click **프레임 적용**. This is currently a single-frame preview. For full idle/move/attack directional animation, export a regular atlas plus a matching `assets/units/<key>.json` manifest per the [README](./README.md).

Local file importing does not upload or redistribute the artwork; your imported picture is available in that browser tab until the page is refreshed. The GitHub repo retains code and placeholders only.
