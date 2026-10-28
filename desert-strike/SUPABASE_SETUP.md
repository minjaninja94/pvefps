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
