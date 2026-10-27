# Desert Front — 3라인 멀티플레이 (PvP / PvE) 설치

게임: https://minjaninja94.github.io/pvefps/desert-strike/

## 지원 모드

- 경쟁 PvP: 1:1 / 2:2 / 3:3, 양 팀 전원 준비 + 연결 완료 후 방장이 시작
- 협력 PvE: 2명 vs 2 AI / 3명 vs 3 AI
- 오프라인 3라인 연습: 1명 vs 1 AI. Firebase 없이도 전술 배치 가능

전장 면적: 기존 3300×520에서 3300×1560으로 3배. 독립된 3300×520 라인 3개(상단·중앙·하단). 각 라인 양측 핵심 기지는 2500 HP이고 상대 라인 핵심 기지 2개를 파괴하면 승리합니다. 20분 제한 후 남은 핵심 기지 체력 합계로 판정합니다.

참가자별 건설 구역: 라인당 15×5=75개, 3개 라인 총 225칸. 자신의 건물만 건설/교체/철거합니다. 개인별 360 CR, 0.5초마다 +1 CR, 웨이브마다 +24 CR이 지급되고, 자원·경제 강화가 각자 독립적입니다. 출격 간격 24초. 소환 병력은 건설한 라인에서만 싸웁니다.

## Firebase 관리자 설정 2단계

기존 pvefps Firebase 프로젝트에만 연동합니다. 새로운 서버, 외부 API 키나 Firebase 프로젝트 생성은 필요하지 않습니다.

1. Firebase Authentication: https://console.firebase.google.com/project/pvefps/authentication/providers — 익명 로그인을 켭니다.
2. Cloud Firestore 규칙: https://console.firebase.google.com/project/pvefps/firestore/rules — 기존 운영 중인 규칙에 저장소 최상위 firestore.rules 파일의 desertRooms 방 및 signals 블록을 병합해 게시합니다. 다른 게임 FPS·랭킹·리듬게임 규칙을 삭제하면 안 됩니다.

중요: GitHub 저장소의 firestore.rules 수정만으로 Firebase 서버의 규칙이 바뀌지 않습니다. 관리자 콘솔 게시 또는 인증된 Firebase CLI 배포가 필요합니다. 현재 이 작업 환경에는 관리자 배포 권한이 없어 실제 적용 여부를 확인하지 못했습니다. 규칙이 게시되지 않았다면 인터넷 방 만들기·참가가 권한 오류로 실패합니다.

## 동기화, 개인정보 및 제약

Firestore에는 초대 코드 방, 참가자의 익명 사용자 ID/이름/팀/진영/준비 상태, WebRTC SDP 신호만 저장합니다. 실시간 이동·타격·건설·유닛 상태는 Firestore에 반복 기록하지 않습니다. 방장의 WebRTC DataChannel이 게스트에 전투 상태를 초당 약 5회 전달하고, 게스트가 건설 명령을 보내면 방장이 해당 플레이어의 자원과 건물 소유권을 검증합니다.

직접 P2P 연결이며 무료 공개 STUN만 사용합니다. 일부 회사망/통신사 NAT 환경에서는 TURN 서버가 없으면 연결이 불가능할 수 있습니다. 유료 릴레이, 강력한 부정행위 방지 권한 서버, 호스트 이관과 경기 중 재입장은 제공하지 않습니다. 호스트가 이탈하면 진행 경기가 종료됩니다. 기존 Firebase 무료 Spark 사용 한도 내 운영을 권장합니다. 장기간 남은 방 및 신호 문서는 필요 시 콘솔에서 정리해야 합니다.

## 코드 및 테스트

- tri-lane-engine.js: 3라인 전투, AI, 각자 자원, 라인별 충돌과 본진
- tri-lane-network.js: Firestore 초대방, 익명 로그인, RTC SDP, 게임 패킷
- tri-lane-ui.js: 생산 시설 배치, 전장, 미니맵, 팀 선택, 오프라인 연습
- smoke-trilane.test.cjs: 1:1~3:3 / 2~3명 협동, 3배 전장, 독립 자원, 건설과 전투 판정

검증 명령: node desert-strike/smoke-trilane.test.cjs

실제 다른 기기 간 접속과 Firebase 배포 규칙은 코드 자동 테스트만으로 검증할 수 없습니다. 관리자 설정 적용 후 휴대전화/PC의 별도 브라우저에서 실제 연결 확인이 필요합니다.
