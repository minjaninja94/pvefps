-- Desert Front ranked PvP: resolve each participant independently.
-- Guests may play against members. Member eligibility is frozen at match START,
-- so registering an account during/after a battle cannot retroactively claim rewards.
alter table public.desert_ranked_match_players
  add column if not exists member_at_start boolean not null default false;

create or replace function public.desert_start_match(p_code text)
returns jsonb
language plpgsql security definer set search_path to ''
as $function$
declare
 m public.desert_ranked_matches%rowtype;
 n0 int; n1 int; qualified_count int;
begin
 select * into m from public.desert_ranked_matches where room_code=p_code for update;
 if not found or m.host_uid is distinct from auth.uid() or m.state<>'lobby' then
  raise exception '방장만 대전을 시작할 수 있습니다';
 end if;
 select count(*) filter(where team=0),count(*) filter(where team=1)
 into n0,n1 from public.desert_ranked_match_players where room_code=p_code;
 if n0<>m.team_size or (m.mode<>'coop' and n1<>m.team_size)
   or (m.mode='coop' and n1<>0) then
  raise exception '참가자가 서버에 모두 등록되지 않았습니다';
 end if;
 update public.desert_ranked_match_players p set
  member_at_start=exists(
    select 1 from public.desert_web_members w
    join auth.users u on u.id=w.user_id
    where w.user_id=p.user_id and u.is_anonymous is not true
  ),
  seen_at=now()
 where p.room_code=p_code;
 select count(*) into qualified_count from public.desert_ranked_match_players
 where room_code=p_code and member_at_start;
 update public.desert_ranked_matches set state='playing',started_at=now() where room_code=p_code;
 return jsonb_build_object('state','playing','room',p_code,
  'rankEligibleMembers',qualified_count,'guestParticipants',n0+n1-qualified_count);
end;
$function$;
revoke all on function public.desert_start_match(text) from public,anon;
grant execute on function public.desert_start_match(text) to authenticated;

create or replace function public.desert_close_match(
 p_code text,p_loser_team integer,p_forfeit uuid default null
) returns void
language plpgsql security definer set search_path to ''
as $function$
declare m public.desert_ranked_matches%rowtype;
begin
 select * into m from public.desert_ranked_matches where room_code=p_code for update;
 if not found or m.state<>'playing' then return; end if;
 if p_loser_team not in(0,1) then raise exception '잘못된 패배 팀'; end if;
 -- The existing trigger awards skin points only to members marked at START.
 update public.desert_ranked_matches
 set state='done',winner_team=1-p_loser_team,forfeited_uid=p_forfeit,finished_at=now()
 where room_code=p_code;
 insert into public.desert_ranked_scores(user_id,rating,wins,losses,updated_at)
 select p.user_id,case when p.team=p_loser_team then 976 else 1024 end,
   case when p.team<>p_loser_team then 1 else 0 end,
   case when p.team=p_loser_team then 1 else 0 end,now()
 from public.desert_ranked_match_players p
 join public.desert_web_members w on w.user_id=p.user_id
 join auth.users u on u.id=p.user_id and u.is_anonymous is not true
 where p.room_code=p_code and p.member_at_start
 on conflict(user_id) do update set
  rating=greatest(100,least(3000,public.desert_ranked_scores.rating
   +case when excluded.losses=1 then -24 else 24 end)),
  wins=public.desert_ranked_scores.wins+excluded.wins,
  losses=public.desert_ranked_scores.losses+excluded.losses,
  updated_at=now();
 insert into public.desert_mode_scores(user_id,mode,wins,losses,updated_at)
 select p.user_id,m.mode,
  case when p.team<>p_loser_team then 1 else 0 end,
  case when p.team=p_loser_team then 1 else 0 end,now()
 from public.desert_ranked_match_players p
 join public.desert_web_members w on w.user_id=p.user_id
 join auth.users u on u.id=p.user_id and u.is_anonymous is not true
 where p.room_code=p_code and p.member_at_start
 on conflict(user_id,mode) do update set
  wins=public.desert_mode_scores.wins+excluded.wins,
  losses=public.desert_mode_scores.losses+excluded.losses,
  updated_at=now();
end;
$function$;
revoke all on function public.desert_close_match(text,integer,uuid) from public,anon,authenticated;
grant execute on function public.desert_close_match(text,integer,uuid) to service_role;

create or replace function private.desert_award_multi_skin()
returns trigger
language plpgsql security definer set search_path to ''
as $function$
declare p record;
begin
 if new.state<>'done' or old.state='done'
    or new.mode not in ('pvp','classic')
    or new.winner_team is null or new.started_at is null then return new; end if;
 if (select count(distinct team) from public.desert_ranked_match_players
     where room_code=new.room_code)<>2 then return new; end if;
 for p in
  select mp.user_id,mp.team from public.desert_ranked_match_players mp
  join public.desert_web_members w on w.user_id=mp.user_id
  join auth.users u on u.id=mp.user_id and u.is_anonymous is not true
  where mp.room_code=new.room_code and mp.member_at_start
  order by mp.user_id
 loop
  perform private.desert_credit_skin_reward(p.user_id,'multi',new.skin_reward_key::text,
    case when p.team=new.winner_team then 500 else 200 end);
 end loop;
 return new;
end;
$function$;
-- No change to trigger installation, which already fires AFTER UPDATE OF state.
