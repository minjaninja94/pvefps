# Desert Front DB Record Safeguards — 2026-11-01

## Production status
Applied to Supabase project `desert-front` (`gshcrhfqpkkcwinrbqjm`) on 2026-11-01.
The deployed SQL is kept verbatim in:
- `sql/20261101115527_desert_integrity_audit_monotonic_progress_daily_snapshots.sql`
- `sql/20261101115719_desert_integrity_fix_solo_snapshot_uuid_keys.sql`

No gameplay scripts, account RPC signatures, mode scoring formula, ranking tier formulas, or skin reward logic were changed.

## Protections
1. `private.desert_guard_member_progress_v1()` refuses to decrease XP, solo wins/losses, or multiplayer wins/losses on `public.desert_web_members`. Decreasing values submitted by an outdated client are clamped to the existing server values; an audit record with operation `STALE_PROGRESS_REJECTED` is written.
2. `private.desert_integrity_events` captures row INSERT/UPDATE/DELETE images for these nine tables: `desert_web_members`, `desert_ranked_scores`, `desert_mode_scores`, `desert_ranked_matches`, `desert_ranked_match_players`, `desert_skin_wallets`, `desert_skin_unlocks`, `desert_skin_match_rewards`, `desert_solo_skin_runs`. Timestamp-only member updates and heartbeat-only updates are skipped.
3. `desert_prevent_mass_truncate_v1` blocks TRUNCATE on these tables. Targeted DELETE can still happen for user removal, but is logged into the private event table.
4. `private.desert_integrity_snapshots` stores a point-in-time JSONB row copy once per Korean calendar day (first copy wins). Every solo match uses its own run UUID as snapshot key.
5. Cron job `desert-front-daily-integrity-snapshot` uses `17 18 * * *` (18:17 UTC = 03:17 KST next day), calling `private.desert_capture_daily_snapshot_v1()`.

RLS is enabled on the private tables. `anon` and `authenticated` cannot read either backup table. The existing public RPC policies remain untouched.

## Initial deployment verification
- At deployment, a baseline snapshot was saved containing 45 rows; 23 of those are individually keyed solo match runs.
- Validated in rolled-back SQL transactions: stale progress counters cannot decrease, attempted decreases are recorded within the transaction, and TRUNCATE is refused.
- Repeating a same-day capture added zero rows, demonstrating the first-snapshot-wins rule.
- The original three Supabase Cron jobs remained installed and active, alongside the new fourth job.
- User records, wallet balances, rank scores, and rewards were not overwritten as part of the schema deployment.

## How to check health (read-only)
```sql
select relation_name, count(*) as n, max(captured_at) as latest
from private.desert_integrity_snapshots
group by relation_name order by relation_name;

select operation, relation_name, count(*) as changes
from private.desert_integrity_events
group by operation, relation_name order by relation_name, operation;

select jobid,jobname,schedule,active
from cron.job where jobname='desert-front-daily-integrity-snapshot';

select *
from cron.job_run_details
where jobid=(select jobid from cron.job where jobname='desert-front-daily-integrity-snapshot')
order by start_time desc limit 10;
```

## Important limitations
- These copies and events live **inside the same Supabase database**. They protect against row-level mistakes and simplify reconstruction, but **cannot protect against complete database destruction or project loss**. Enable or verify the provider's independent automated backups and PITR/point-in-time recovery based on the plan, and periodically test a restore on an isolated project.
- This is not a historical recovery of already-deleted ranked scores. Never fabricate RP or victories when the original match ledger is unavailable.
- A stale client's local UI may still need a reload to reflect the server-clamped counters. DB integrity is protected, but the browser code was deliberately unchanged.
- Before any future Auth user deletion, confirm the user's privacy and retention obligations. Audit copies intentionally do not carry foreign keys to Auth users, so their database history is preserved for permitted recovery.
- Keep integration tests in rollback transactions or a separate staging project. Never run live destructive test-cleanup scripts on production accounts.
