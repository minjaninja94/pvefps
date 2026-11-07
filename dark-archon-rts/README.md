# Dark Archon Dominion RTS — 단일 프로젝트

## 지금 플레이하기

- [브라우저 플레이 미리보기](https://raw.githack.com/minjaninja94/pvefps/main/dark-archon-rts/index.html) — GitHub에 올린 단일 HTML을 표시하는 외부 미리보기 서비스입니다. 실제 URL 접속은 외부 네트워크 제한 때문에 완전 검증하지 못했습니다.
- [게임 코드 및 파일](https://github.com/minjaninja94/pvefps/tree/main/dark-archon-rts) — GitHub 프로젝트 폴더.
- [게임 HTML](https://github.com/minjaninja94/pvefps/blob/main/dark-archon-rts/index.html) — GitHub의 코드 보기. 여기서는 HTML이 실행되지 않습니다.
- 미리보기 서비스가 차단되면 [index.html 원본 다운로드](https://raw.githubusercontent.com/minjaninja94/pvefps/main/dark-archon-rts/index.html) 후 파일을 브라우저로 여세요. 게임 자체는 오프라인에서도 실행되도록 CSS/JS를 모두 포함합니다. 단, 외부 PNG를 자동으로 불러오려면 웹 서버가 필요할 수 있습니다.

## 프로젝트 구조

```text
pvefps/
└── dark-archon-rts/     ← 다른 게임과 독립
    ├── index.html       ← 전투, 조작, HUD, 미니맵, 이미지 불러오기 전부 포함
    ├── README.md        ← 플레이 및 조작 가이드
    └── SPRITE_SOURCES.md← 원작 스프라이트 참고 자료
```

별도 빌드 명령·Node 설치·CSS/JS 파일 연결이 필요하지 않습니다. 외부 서버 배포(GitHub Pages/Cloudflare Pages)는 아직 설정되지 않았습니다.

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
All playable logic and CSS are bundled in one standalone HTML file. The original Blizzard animation assets are not bundled. Structural checks and JavaScript syntax checks passed, but direct hosted-browser verification still needs to be completed.
