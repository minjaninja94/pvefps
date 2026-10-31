# Desert Front — Supabase 통합 상태 (2026-11-01)

실제 프로젝트: [desert-front Supabase](https://supabase.com/dashboard/project/gshcrhfqpkkcwinrbqjm), `eu-west-1`.

## 현재 멀티플레이 설계

- **계정:** 기존 Supabase username/password 계정(`desert_web_members`)을 유지하고, 로그인하지 않은 경우 Supabase Auth 익명 로그인(서버 설정에 따라 사용 가능)을 시도합니다.
- **방 상태/공개방/초대:** `desert_lobbies`; 생성·참가·준비·시작·퇴장은 `desert_lobby_create`, `desert_lobby_action`, 비공개방 코드는 `desert_lobby_get` RPC를 거칩니다.
- **WebRTC 신호:** `desert_lobby_signals` 및 `desert_lobby_signal` (host offer, guest answer). Realtime Postgres Changes + polling으로 갱신합니다.
- **전투 패킷:** 호스트 WebRTC DataChannel 기반 P2P를 유지합니다. 전투 패킷·유닛 위치·건물 명령은 Supabase 테이블에 저장하지 않습니다.
- **전적/스킨/포인트:** 기존 Supabase `desert_ranked_*`, `desert_skin_*` 로직 유지. 기존 서버 기록 검증과 P2P 전투는 서로 다른 계층입니다.
- **프론트엔드:** `supabase-room-adapter.js`, `tri-lane-network.js`, `device-account.js`, `desert-member.js`; `index.html`은 Firebase SDK를 로드하지 않습니다.
- **SQL 복구 지점:** `sql/desert_lobbies_supabase_v1.sql`은 현재 배포한 RPC 정의를 포함하며, 실제 DB에는 migration history로 각각 별도 적용됐습니다.

## PvP 회원 랭크 정산 (2026-11-01)

- **익명 참가:** Supabase Auth Anonymous Sign-Ins로 게임 계정 없이 방 생성·참가가 가능하며 전투는 기존 WebRTC P2P입니다.
- **회원만 공식 기록:** PvP/클래식 결과를 서버가 확정하면 경기 시작 시 `desert_web_members`가 존재하고 `auth.users.is_anonymous`가 거짓인 참가자에게만 랭크 승패(+24/-24 RP)와 모드별 승패가 적립됩니다. 익명 상대가 있어도 회원 적립은 취소되지 않습니다. 점수는 100~3000 범위에서 제한됩니다.
- **PvP 보상:** 회원에게 승리 500P, 패배 200P가 기존 `desert_skin_match_rewards`의 경기 키로 중복 없이 지급됩니다. 익명 참가자는 기록·포인트 모두 받지 않습니다. 협동전 스킨 P는 종전과 마찬가지로 PvP 보상 대상이 아닙니다.
- **경기 시작 시 자격 확정:** `desert_ranked_match_players.member_at_start` 플래그를 방장 시작 RPC에서 서버가 계산해 도중·경기 후 회원 전환으로 보상을 받지 못하게 막습니다.
- **DB 재현 SQL:** `sql/desert_mixed_pvp_member_rewards.sql`. 이전 all-members-required 분기 대신 참가자별 정산을 수행합니다.
- **UI:** 로비와 결과 팝업에서 공식 랭킹·포인트의 회원 혜택과 게스트 미지급을 명시하고 로그인 버튼을 노출합니다.
- **검증:** 실제 DB에서 회원 승/게스트 패, 게스트 승/회원 패, 전원 회원 대전, 시작 이후 뒤늦은 회원 등록 차단을 트랜잭션 롤백 테스트로 확인했습니다. CI `smoke-ranked-guest-mix.test.cjs`에서도 결과 팝업 및 정산 SQL 계약을 점검합니다.

## 배포/검증

- Supabase의 두 테이블, 네 개 RPC, RLS, Realtime Publication 적용을 확인했습니다.
- DB 트랜잭션 롤백 테스트에서 별도 사용자로 방 생성·초대·참가·준비·시작·권한 거부·SDP·정리 동작을 검증했습니다.
- `.github/workflows/desert-supabase-rooms.yml`에서는 독립된 Supabase 어댑터 모의 테스트 및 WebRTC 네트워크 회귀 테스트를 수행합니다.
- 서로 다른 실제 기기/브라우저의 STUN/NAT 통과·연결 재수립 및 전체 자동 배포의 성공 여부는 별도 현장 검증이 필요합니다.
- TURN 릴레이는 설정되지 않았기 때문에 일부 방화벽/대칭 NAT 조합에서는 P2P 접속이 실패할 수 있습니다.
- 서버 `expires_at`에 따라 만료방은 숨겨지고 새 참여가 거절됩니다. **별도 pg_cron 작업 `desert-front-rtc-rooms-expiry`(매시 15분)** 에서 `desert_expire_rtc_rooms()`를 실행해 만료 레코드를 실제 삭제합니다. 기존 랭크 경기 정리 작업은 변경하지 않았습니다.
- 루트 `firebase-config.js`, `firebase-network.js`는 **다른 게임의 호환성**을 위해 삭제하지 않았으며, Desert Front 웹은 사용하지 않습니다.

---

## 이전 구현 기록 (Firebase 병행 시기)

아래는 이전 구현 내용을 보존한 기록입니다. Firebase가 현재 Desert Front 웹의 방 관리에 사용된다는 의미는 아닙니다.

# Desert Front — Supabase ID accounts and server-ledger matches

Supabase project: desert-front (gshcrhfqpkkcwinrbqjm), eu-west-1.

## Signup and guest mode

- Web: username (4–20 lowercase letters/numbers/underscore), password (8–72 characters), nickname (1–16 characters). The person does not enter an email.
- Edge Function desert-signup calls the Supabase Auth Admin API to create an account with a synthetic internal email. It confirms the synthetic identity server-side; client passwords are never stored or logged by the browser app.
- RLS-protected desert_web_members stores nickname, XP, training victories, preferred faction, skin and AI mode. Supabase persists login sessions; the browser restores the server profile at startup.
- Original guest progress is retained separately in localStorage. Existing Firebase multiplayer remains operational independently from Supabase authentication.
- Password reset is not self-service because the user provided no real email or phone. Add account recovery before high-scale launch.

## Server match protection

- Firebase/WebRTC still provides matchmaking and host-authoritative combat. Supabase holds independent server-side participant registration, game start, heartbeat timestamps, consented results and forfeit status.
- A voluntary mid-game exit invokes desert_forfeit_match: the forfeiting team loses; the opponent team wins. Server-owned desert_ranked_scores awards -24/+24 RP to registered members once per match.
- 8-second client heartbeats and the scheduled pg_cron job desert-front-forfeit-sweep detect silent browser or host crashes. After 45 seconds of one-sided inactivity, the responsive side wins. If both sides disappear, the game is abandoned with no forced winner.
- Normal victory is posted only when every registered participant reports the same winner. A single host cannot declare an arbitrary winner by itself.
- New and old Firebase rooms may still be unranked if Supabase guest authorization or required Firestore rules have not been enabled.
- This is not anti-cheat-grade authoritative simulation. Modified P2P clients and collusion remain possible: do not use these scores for financial prizes.

## Deployment and testing

- Deployed Edge Function source: supabase/functions/desert-signup/index.ts
- Browser integration: desert-member.js, front-lobby.js, tri-lane-network.js, tri-lane-ui.js, career-profile.js.
- New tables: desert_web_members, desert_ranked_scores, desert_ranked_matches, desert_ranked_match_players, desert_signup_limits. Existing desert_front_profiles and desert_front_community_scores were left unchanged.
- Database functions use explicit authenticated participant checks, RLS and row-locked one-time finalization. The signup endpoint is rate-limited and never exposes service-role credentials to the browser.
- Live test: on October 29, 2026, two disposable users signed up, logged in, registered PvP, forfeited a match, verified 976/1024 RP, and confirmed repeat forfeiture was idempotent. QA users and the game record were deleted after verification.
- The live integration test is kept at supabase-live.test.cjs and its workflow is workflow_dispatch-only, not push-triggered.
- The Supabase database and Edge Function are deployed. Firebase Firestore rules still require separate server-side deployment.
- Manual two-browser end-to-end disconnect tests, password recovery, and server-authoritative combat are not yet complete.

Dashboard: https://supabase.com/dashboard/project/gshcrhfqpkkcwinrbqjm
