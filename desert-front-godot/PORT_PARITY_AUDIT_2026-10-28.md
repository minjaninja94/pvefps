# Desert Front 웹 → Godot 완전 이식 재검증

**검증일:** 2026-10-28 (KST)  
**웹 기준:** `main`의 `desert-strike/` (`b323a70d441286e51c278ce053d3e3960bbbaba3`, 랜딩페이지만 이후 변경)  
**Godot 기준:** `feature/desert-front-godot-port` `30669216409528aa1a007d88994908ddf8e9d6da`  
**결론:** **NOT COMPLETE — 100% 이식 판정 불가.** 작동하는 알파 및 성공한 CI는 기능·수치 동등성의 증거가 아니다.

## 검증 범위와 방법

- 원본 JS `game-v2.js`, `tri-lane-engine.js`, `front-lobby.js`, `tri-lane-network.js`, `hard-ai.js`, `unit-consolidation.js`, `index.html`과 Godot `battle_sim.gd`, `tri_match.gd`, `roster.gd`, `tri_front.gd`, `main.gd`, `tri_network.gd`, `sprite_assets.gd` 소스 비교.
- 2026-10-28 GitHub Actions 릴리스 `40702214666` 및 스모크 `40702214569`가 성공했고 Windows ZIP(49,062,221 바이트)이 게시된 것은 **확인됨**.
- 외부 인터넷 회선 2곳의 실제 릴레이 통신, 장시간 3v3 성능, UI 시각적 동등성, 실제 플레이 밸런스는 **이번 검사에서 실행하지 않음**.

## 확인된 이식 / 검사 통과

| 항목 | 판정 | 근거 |
|---|---|---|
| 10종족 × 8병종 기본 아트, 8포즈 | 구현·아트 스모크 통과 | `sprite_assets.gd`, `art_smoke.gd` |
| 10종족 모에화 행동 시트와 초상화 | 구현·아트 스모크 통과 | `sync_web_art.py`, `sprite_assets.gd` |
| 24초 웨이브, 생산 슬롯, 자원, 강화 | 기본 구현 | `battle_sim.gd`, `tri_match.gd` |
| 3라인, 1v1/2v2/3v3, 2~3인 협동, AI | 시뮬레이션·UI 기본 테스트 통과 | `tri_match_smoke.gd`, `tri_scene_smoke.gd` |
| 20기 영웅 통합, 가디언, 주요 종족 패시브 | 일부 사례 테스트 통과 | `parity_smoke.gd`, `tri_match.gd` |
| 로컬 1v1, 4개 프로세스 2v2 LAN 테스트 | 통과 | `net_host.gd`, `tri_net_host.gd` |
| PC 로컬 전적 저장 | 구현·기초 요약 테스트 통과 | `match_records.gd`, `records_smoke.gd` |

## 실제 미일치 / 미구현 (코드 직접 확인)

| 우선 | 영역 | 웹 원본 | Godot 현재 상태 | 영향 |
|---|---|---|---|---|
| **P0** | **클래식 포탑 HP** | `game-v2.js`의 `MAX_TURRET=1700` | `battle_sim.gd`에서 `towers=[1250,1250]` | 방어선 지속력 불일치 |
| **P0** | **클래식 전방탑·가디언** | `game-v2.js`에 `forwardHP`, `forwardDown`, 가디언 | `battle_sim.gd`에 전방탑/가디언 없음. 3라인 `tri_match.gd`에만 구현 | 싱글 게임 규칙 누락 |
| **P0** | **클래식 투사체·명중 타이밍** | `game-v2.js`의 `beginStrike`, `resolveStrike`, `projectileImpact`, `shots` | `battle_sim.gd`의 `_run_units`는 범위 내 즉시 `_damage` | 사거리·엄폐·광역전·타격 타이밍 불일치 |
| **P0** | **클래식 특성·상성** | `getDef`, `calcDamage`, `broodLay`, 종족별 효과 | `battle_sim.gd`의 `_damage(target, amount)`는 방어도 차감만 수행 | 실질 종족 밸런스 미이식 |
| **P0** | **특수 병종 상성** | `game-v2.js:getDef`와 `tri-lane-engine.js:definition`이 4종족의 6번 역할 `good/bad`를 재정의 | `roster.gd`는 `good/bad` 반환 없음; `tri_match.gd:_damage`는 기본 `GOODS/BADS[role]` 사용 | 해병·수인·퍼리·로봇 특수 병종의 상성 오류 |
| **P0** | **영웅 수비 패시브** | `tri-lane-engine.js:applyHit`에서 피해 보정 후 HP 차감 | `tri_match.gd:_damage`는 영웅 대상이면 `damage`를 재계산해 이전 수비 피해 보정을 덮음 | 영웅 대상 종족 패시브 일부 무효 |
| **P1** | **최대 병력 수 관리** | 웹 싱글 `SIDE_SUPPLY=220` (각 팀의 인구 계산); 웹 3라인은 라인×팀 최대 75 | Godot 싱글은 합산 `units.size()<480`; 3라인 `_spawn`은 전체 440기 도달 시 중단 | 장기전 물량 제한·소환/가디언 가능성 차이 |
| **P1** | **원본 5종 스킨** | `front-lobby.js:SKINS`에는 `default,moe,twilight,aurora,gold`, 레벨 잠금 | `sprite_assets.gd`와 두 로비에서 `default,moe`만 | 3종 스킨/해금 미이식 |
| **P1** | **계정·육성·훈련병 계급** | `front-lobby.js`: XP, 레벨 1~100, 닉네임, 훈련 등급, 해금/기기 계정 및 프로필 동기화 | `match_records.gd`의 PC 로컬 경기 기록만 존재 | 계정·진행 데이터 비호환 |
| **P1** | **실제 인터넷 멀티** | `tri-lane-network.js` WebRTC+Firestore 신호 교환 | `tri_network.gd` NodeTunnel 릴레이 사용, **LAN 2v2만 자동 검증** | IP 미공개 원격 접속·3v3·재접속·장시간 동기화 검증 필요 |
| **P1** | **2.5D/인터페이스 완전 동등성** | `isometric-world.js`, `tri-lane-ui.js`: 2.5D 전장, 카메라, 3탭(기지/전장/업그레이드) | `tri_view.gd`의 평면 3밴드 표시, `tri_front.gd`의 사이드바 2탭 | 시야·화면·조작감 차이 |
| **P2** | **클래식 일시정지·속도·카메라** | `game-v2.js`의 `paused,rate,cameraX,followFront` | `main.gd`, `battle_sim.gd`에 동등한 조작/시뮬레이션 상태 없음 | UX·전략 기능 일부 누락 |
| **P2** | **고급 전투 애니메이션·FX·사운드** | `unit-motion.js`, `sprite-animations.js`, `game-v2.js`의 이펙트·발사체·음향 | Godot는 8포즈 선택 및 간략 전투 이펙트 위주 | 외형·타격감 미동등 |
| **P2** | **하드 AI 설정 선택과 완전 동등성** | `front-lobby.js` 플레이어 난이도 변경 및 `hard-ai.js` 계획 | Godot 클래식 UI는 동일 난이도 선택 부재; 3라인 실험 AI의 판단은 별도 구현 | 난이도 옵션·동작 차이 |

## 추가 구현상 위험 (테스트 공백)

1. `tri_match.gd`의 `spawn_guardian`은 `_spawn` 실패 여부를 확인하지 않고 `units.back()`에 가디언 속성을 부여한다. 전체 440기 상한에 도달하면 타 유닛이 가디언으로 변경될 위험이 있다.
2. `tri_network.gd`의 전체 스냅샷은 클라이언트별 신뢰성 있는 RPC로 주기 전송된다. 3v3 대규모 병력 시 실제 릴레이 대역폭/지연/패킷 정체를 측정해야 한다.
3. 현재 `parity_smoke.gd`는 스킨/가디언 회복/영웅 통합/AI 구매 예약 등 **선별 사례**만 테스트한다. 웹 JS와 Godot를 동일 시드/동일 행동으로 돌려 80개 병종과 모든 종족의 DPS·체력·치유·상성을 교차 비교하는 테스트가 없다.

## 완전 이식 판정 요건

1. **전투 규칙**: 싱글/3라인의 포탑·가디언·상성·모든 종족 패시브·투사체·영웅 피해·인구 상한·지원병·하드 AI를 웹과 일치시키고 동일 조건 회귀 테스트.
2. **기능**: 5종 스킨(레벨 해금), XP/닉네임/연습 계급/프로필, 싱글 카메라·속도·일시정지 및 원본 UI/전장 표현.
3. **멀티**: 서로 다른 회선에서 1v1/2v2/3v3/협동 테스트, 동시 참가, 방 검색, 게임 시작/이탈/재접속, 포화 상태 안정성 테스트.
4. **배포**: 실기기 EXE 조작·그림·음향 확인, Windows 재시작·보안/계정 저장·릴레이 장애 시 안내 테스트.

**진행 요약:** 기존 원본 웹 코드 변경 없이 분리 이식됨. 이 감사 파일은 사실 검증 기록으로, 위 결함들을 해결했다는 뜻이 아니다.
