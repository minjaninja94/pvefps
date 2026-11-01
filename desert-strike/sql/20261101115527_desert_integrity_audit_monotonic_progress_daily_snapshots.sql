-- Desert Front DB-only durability guard. No game/RPC/ladder formula changes.
create table if not exists private.desert_integrity_events (
  event_id bigint generated always as identity primary key,
  occurred_at timestamptz not null default clock_timestamp(),
  relation_name text not null,
  operation text not null,
  record_key text not null,
  previous_record jsonb,
  resulting_record jsonb,
  transaction_id bigint not null default txid_current()
);
create index if not exists desert_integrity_events_lookup_idx
  on private.desert_integrity_events(relation_name,record_key,occurred_at desc);
create table if not exists private.desert_integrity_snapshots (
  snapshot_day date not null,
  relation_name text not null,
  record_key text not null,
  captured_at timestamptz not null default clock_timestamp(),
  record_data jsonb not null,
  primary key(snapshot_day,relation_name,record_key)
);
create index if not exists desert_integrity_snapshots_lookup_idx
  on private.desert_integrity_snapshots(relation_name,record_key,snapshot_day desc);
alter table private.desert_integrity_events enable row level security;
alter table private.desert_integrity_snapshots enable row level security;
revoke all on private.desert_integrity_events,private.desert_integrity_snapshots from public,anon,authenticated;
revoke all on sequence private.desert_integrity_events_event_id_seq from public,anon,authenticated;

create or replace function private.desert_guard_member_progress_v1()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare attempted jsonb;
begin
 if new.xp<old.xp or new.wins<old.wins or new.losses<old.losses or
    new.mp_wins<old.mp_wins or new.mp_losses<old.mp_losses then
   attempted:=pg_catalog.to_jsonb(new);
   insert into private.desert_integrity_events
     (relation_name,operation,record_key,previous_record,resulting_record)
   values ('desert_web_members','STALE_PROGRESS_REJECTED',old.user_id::text,
           pg_catalog.to_jsonb(old),attempted);
   new.xp:=greatest(old.xp,new.xp);
   new.wins:=greatest(old.wins,new.wins);
   new.losses:=greatest(old.losses,new.losses);
   new.mp_wins:=greatest(old.mp_wins,new.mp_wins);
   new.mp_losses:=greatest(old.mp_losses,new.mp_losses);
 end if;
 return new;
end
$fn$;
create or replace function private.desert_audit_row_v1()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare v_old jsonb;v_new jsonb;v_record jsonb;v_key text;
begin
 if tg_op='INSERT' then
   v_new:=pg_catalog.to_jsonb(new);
 elsif tg_op='DELETE' then
   v_old:=pg_catalog.to_jsonb(old);
 else
   v_old:=pg_catalog.to_jsonb(old);
   v_new:=pg_catalog.to_jsonb(new);
   if (v_old - 'updated_at' - 'seen_at')
      is not distinct from (v_new - 'updated_at' - 'seen_at') then return new;end if;
 end if;
 v_record:=coalesce(v_new,v_old);
 v_key:=pg_catalog.concat_ws('|',
   coalesce(v_record->>'user_id',v_record->>'id',v_record->>'room_code'),
   v_record->>'room_code',v_record->>'mode',v_record->>'skin_id',
   v_record->>'source_kind',v_record->>'match_key');
 insert into private.desert_integrity_events
   (relation_name,operation,record_key,previous_record,resulting_record)
 values (tg_table_name,tg_op,v_key,v_old,v_new);
 if tg_op='DELETE' then return old;end if;
 return new;
end
$fn$;
create or replace function private.desert_prevent_mass_truncate_v1()
returns trigger language plpgsql security definer set search_path=''
as $fn$
begin
 raise exception 'Desert Front protected records: TRUNCATE denied on %.%',tg_table_schema,tg_table_name
   using errcode='42501';
end
$fn$;
revoke all on function private.desert_guard_member_progress_v1() from public,anon,authenticated;
revoke all on function private.desert_audit_row_v1() from public,anon,authenticated;
revoke all on function private.desert_prevent_mass_truncate_v1() from public,anon,authenticated;
drop trigger if exists desert_guard_member_progress_v1 on public.desert_web_members;
create trigger desert_guard_member_progress_v1
 before update of xp,wins,losses,mp_wins,mp_losses on public.desert_web_members
 for each row execute function private.desert_guard_member_progress_v1();
do $block$
declare tbl text;
begin
 foreach tbl in array array[
  'desert_web_members','desert_ranked_scores','desert_mode_scores',
  'desert_ranked_matches','desert_ranked_match_players',
  'desert_skin_wallets','desert_skin_unlocks',
  'desert_skin_match_rewards','desert_solo_skin_runs'
 ] loop
  execute pg_catalog.format('drop trigger if exists desert_integrity_audit_v1 on public.%I',tbl);
  execute pg_catalog.format('create trigger desert_integrity_audit_v1 after insert or update or delete on public.%I for each row execute function private.desert_audit_row_v1()',tbl);
  execute pg_catalog.format('drop trigger if exists desert_prevent_mass_truncate_v1 on public.%I',tbl);
  execute pg_catalog.format('create trigger desert_prevent_mass_truncate_v1 before truncate on public.%I for each statement execute function private.desert_prevent_mass_truncate_v1()',tbl);
 end loop;
end
$block$;
create or replace function private.desert_capture_daily_snapshot_v1()
returns integer language plpgsql security definer set search_path=''
as $fn$
declare tbl text; added integer; total integer:=0;
begin
 foreach tbl in array array[
  'desert_web_members','desert_ranked_scores','desert_mode_scores',
  'desert_ranked_matches','desert_ranked_match_players',
  'desert_skin_wallets','desert_skin_unlocks',
  'desert_skin_match_rewards','desert_solo_skin_runs'
 ] loop
  execute pg_catalog.format($sql$
   insert into private.desert_integrity_snapshots
     (snapshot_day,relation_name,record_key,record_data)
   select (pg_catalog.clock_timestamp() at time zone 'Asia/Seoul')::date,
          %L,
          pg_catalog.concat_ws('|',
             coalesce(j->>'user_id',j->>'id',j->>'room_code'),
             j->>'room_code',j->>'mode',j->>'skin_id',
             j->>'source_kind',j->>'match_key'),
          j
   from (select pg_catalog.to_jsonb(t) as j from public.%I as t) as rows_now
   on conflict (snapshot_day,relation_name,record_key) do nothing
  $sql$,tbl,tbl);
  get diagnostics added=row_count;
  total:=total+added;
 end loop;
 return total;
end
$fn$;
revoke all on function private.desert_capture_daily_snapshot_v1() from public,anon,authenticated;
select private.desert_capture_daily_snapshot_v1();
select cron.schedule(
 'desert-front-daily-integrity-snapshot','17 18 * * *',
 'select private.desert_capture_daily_snapshot_v1()'
);
