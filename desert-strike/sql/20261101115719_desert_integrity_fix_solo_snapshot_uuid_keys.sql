-- Correct record identity for solo runs: run UUID, not member UUID.
-- Keeps all preexisting copies until correction succeeds atomically.
create or replace function private.desert_audit_row_v1()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare v_old jsonb;v_new jsonb;v_record jsonb;v_key text;
begin
 if tg_op='INSERT' then v_new:=pg_catalog.to_jsonb(new);
 elsif tg_op='DELETE' then v_old:=pg_catalog.to_jsonb(old);
 else
   v_old:=pg_catalog.to_jsonb(old);
   v_new:=pg_catalog.to_jsonb(new);
   if (v_old - 'updated_at' - 'seen_at')
      is not distinct from (v_new - 'updated_at' - 'seen_at') then return new;end if;
 end if;
 v_record:=coalesce(v_new,v_old);
 if tg_table_name='desert_solo_skin_runs' then
   v_key:=v_record->>'id';
 else
   v_key:=pg_catalog.concat_ws('|',
     coalesce(v_record->>'user_id',v_record->>'id',v_record->>'room_code'),
     v_record->>'room_code',v_record->>'mode',v_record->>'skin_id',
     v_record->>'source_kind',v_record->>'match_key');
 end if;
 insert into private.desert_integrity_events
   (relation_name,operation,record_key,previous_record,resulting_record)
 values (tg_table_name,tg_op,v_key,v_old,v_new);
 if tg_op='DELETE' then return old;end if;
 return new;
end
$fn$;

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
          case when %L='desert_solo_skin_runs' then j->>'id'
            else pg_catalog.concat_ws('|',
              coalesce(j->>'user_id',j->>'id',j->>'room_code'),
              j->>'room_code',j->>'mode',j->>'skin_id',
              j->>'source_kind',j->>'match_key')
          end,
          j
   from (select pg_catalog.to_jsonb(t) as j from public.%I as t) as rows_now
   on conflict (snapshot_day,relation_name,record_key) do nothing
  $sql$,tbl,tbl,tbl);
  get diagnostics added=row_count;
  total:=total+added;
 end loop;
 return total;
end
$fn$;

-- The v1 baseline contained one solo row per member. Its corrected keys
-- are materialized in the same transaction before redundant copies are discarded.
select private.desert_capture_daily_snapshot_v1();
delete from private.desert_integrity_snapshots
 where relation_name='desert_solo_skin_runs'
   and record_key in (
     select distinct user_id::text from public.desert_solo_skin_runs
   );

