
create table if not exists public.desert_mode_scores (
 user_id uuid not null references auth.users(id) on delete cascade,
 mode text not null check (mode in ('pvp','classic','coop')),
 wins integer not null default 0 check(wins>=0),
 losses integer not null default 0 check(losses>=0),
 updated_at timestamptz not null default now(),
 primary key(user_id,mode)
);
alter table public.desert_mode_scores enable row level security;
revoke all on public.desert_mode_scores from anon,authenticated;
grant select on public.desert_mode_scores to authenticated;
drop policy if exists "read ranked mode results" on public.desert_mode_scores;
create policy "read ranked mode results" on public.desert_mode_scores for select to authenticated using(true);
create or replace function public.desert_close_match(p_code text,p_loser_team integer,p_forfeit uuid default null)
returns void language plpgsql security definer set search_path='' as $body$
declare m public.desert_ranked_matches%rowtype; all_registered boolean;
begin
 select * into m from public.desert_ranked_matches where room_code=p_code for update;
 if not found or m.state<>'playing' then return; end if;
 if p_loser_team not in (0,1) then raise exception '잘못된 패배 팀'; end if;
 update public.desert_ranked_matches set state='done',winner_team=1-p_loser_team,forfeited_uid=p_forfeit,finished_at=now() where room_code=p_code;
 select not exists(
  select 1 from public.desert_ranked_match_players p where p.room_code=p_code
  and not exists(select 1 from public.desert_web_members w where w.user_id=p.user_id)
 ) into all_registered;
 if not all_registered then return; end if;
 insert into public.desert_ranked_scores(user_id,rating,wins,losses,updated_at)
 select p.user_id,case when p.team=p_loser_team then 976 else 1024 end,
  case when p.team<>p_loser_team then 1 else 0 end,
  case when p.team=p_loser_team then 1 else 0 end,now()
 from public.desert_ranked_match_players p where p.room_code=p_code
 on conflict(user_id) do update set
  rating=greatest(100,least(3000,desert_ranked_scores.rating+case when excluded.losses=1 then -24 else 24 end)),
  wins=desert_ranked_scores.wins+excluded.wins,
  losses=desert_ranked_scores.losses+excluded.losses,
  updated_at=now();
 insert into public.desert_mode_scores(user_id,mode,wins,losses,updated_at)
 select p.user_id,m.mode,
  case when p.team<>p_loser_team then 1 else 0 end,
  case when p.team=p_loser_team then 1 else 0 end,now()
 from public.desert_ranked_match_players p where p.room_code=p_code
 on conflict(user_id,mode) do update set
  wins=desert_mode_scores.wins+excluded.wins,
  losses=desert_mode_scores.losses+excluded.losses,
  updated_at=now();
end $body$;
revoke execute on function public.desert_close_match(text,integer,uuid) from public,anon,authenticated;
create or replace function public.desert_rank_ladder(p_mode text default 'all')
returns table(user_id uuid,nickname text,mode text,wins integer,losses integer,
win_rate numeric,rank_position bigint,total_players bigint,tier text,provisional boolean)
language plpgsql security definer set search_path='' as $body$
begin
 if auth.uid() is null or not exists(select 1 from public.desert_web_members m where m.user_id=auth.uid()) then
  raise exception '회원 계정이 필요합니다';
 end if;
 if p_mode not in('all','pvp','classic','coop') then raise exception '잘못된 모드'; end if;
 return query
 with verified as (
  select s.user_id,sum(s.wins)::integer vw,sum(s.losses)::integer vl from public.desert_mode_scores s group by s.user_id
 ), base as (
  select w.user_id,w.nickname::text as nickname,
   (case when p_mode='all' then greatest(w.mp_wins,coalesce(v.vw,0)) else coalesce(ms.wins,0) end)::integer as wins,
   (case when p_mode='all' then greatest(w.mp_losses,coalesce(v.vl,0)) else coalesce(ms.losses,0) end)::integer as losses,
   (p_mode='all' and (w.mp_wins>coalesce(v.vw,0) or w.mp_losses>coalesce(v.vl,0))) as legacy
  from public.desert_web_members w
  left join verified v on v.user_id=w.user_id
  left join public.desert_mode_scores ms on ms.user_id=w.user_id and ms.mode=p_mode
 ), eligible as (
  select b.*,round(100*b.wins::numeric/nullif(b.wins+b.losses,0),1) as wr
  from base b where b.wins+b.losses>0
 ), ranked as (
  select e.*,row_number() over(order by e.wins desc,e.wr desc,e.losses asc,e.nickname asc,e.user_id asc)::bigint as pos,
    count(*) over()::bigint as pop
  from eligible e
 )
 select r.user_id,r.nickname,p_mode,r.wins,r.losses,r.wr,r.pos,r.pop,
  case
   when r.pos=1 then '챌린저'
   when (r.pos-1)::numeric/r.pop<.0003 then '그랜드마스터'
   when (r.pos-1)::numeric/r.pop<.007 then '마스터'
   when (r.pos-1)::numeric/r.pop<.05 then '다이아몬드'
   when (r.pos-1)::numeric/r.pop<.18 then '에메랄드'
   when (r.pos-1)::numeric/r.pop<.37 then '플래티넘'
   when (r.pos-1)::numeric/r.pop<.60 then '골드'
   when (r.pos-1)::numeric/r.pop<.81 then '실버'
   when (r.pos-1)::numeric/r.pop<.96 then '브론즈'
   else '아이언'
  end::text,
  (r.legacy or r.pop<100)::boolean
 from ranked r order by r.pos limit 100;
end $body$;
revoke execute on function public.desert_rank_ladder(text) from public,anon,authenticated;
grant execute on function public.desert_rank_ladder(text) to authenticated;
