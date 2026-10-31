-- Add ten paid chromas per base while retaining all existing purchase IDs.
insert into public.desert_skin_catalog(id,base_id,chroma,faction,price)
 select b.base_id||'~'||c.chroma,b.base_id,c.chroma,b.faction,200
 from public.desert_skin_catalog b cross join (values ('crimson'),('emerald'),('cobalt'),('rose'),('obsidian'),('ivory'),('sunset')) c(chroma)
 where b.chroma='original' on conflict(id) do nothing;
create table public.desert_skin_match_rewards (
 user_id uuid not null references public.desert_web_members(user_id) on delete cascade,
 source_kind text not null check(source_kind in ('solo','multi')), match_key text not null,
 points integer not null check(points>0 and points<=500), created_at timestamptz not null default now(),
 primary key(user_id,source_kind,match_key)
);
alter table public.desert_skin_match_rewards enable row level security;
revoke all on public.desert_skin_match_rewards from anon,authenticated;
grant select on public.desert_skin_match_rewards to authenticated;
create policy "read own match skin rewards" on public.desert_skin_match_rewards for select to authenticated using((select auth.uid())=user_id);
create table public.desert_solo_skin_runs (
 id uuid primary key,user_id uuid not null references public.desert_web_members(user_id) on delete cascade,
 difficulty text not null check(difficulty in ('easy','normal','hard','veryhard','impossible')),
 started_at timestamptz not null default clock_timestamp(), finished_at timestamptz,
 won boolean,abandoned boolean not null default false
);
create unique index desert_solo_skin_active_user on public.desert_solo_skin_runs(user_id) where finished_at is null and not abandoned;
alter table public.desert_solo_skin_runs enable row level security;
revoke all on public.desert_solo_skin_runs from anon,authenticated;
grant select on public.desert_solo_skin_runs to authenticated;
create policy "read own solo skin runs" on public.desert_solo_skin_runs for select to authenticated using((select auth.uid())=user_id);
alter table public.desert_ranked_matches add column skin_reward_key uuid not null default gen_random_uuid();
create function private.desert_credit_skin_reward(p_user uuid,p_kind text,p_key text,p_points integer) returns integer
 language plpgsql security definer set search_path='' as $$
begin
 if p_points<=0 or not exists(select 1 from public.desert_web_members where user_id=p_user) then return 0; end if;
 insert into public.desert_skin_match_rewards(user_id,source_kind,match_key,points) values(p_user,p_kind,p_key,p_points) on conflict do nothing;
 if not found then return 0; end if;
 insert into public.desert_skin_wallets(user_id,points) values(p_user,3000+p_points)
 on conflict(user_id) do update set points=public.desert_skin_wallets.points+p_points;
 return p_points;
end $$;
revoke all on function private.desert_credit_skin_reward(uuid,text,text,integer) from public,anon,authenticated;
create function private.desert_begin_solo_skin(p_run_id uuid,p_difficulty text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.desert_solo_skin_runs%rowtype;
begin
 if u is null or not exists(select 1 from public.desert_web_members where user_id=u) then raise exception '회원 로그인이 필요합니다.' using errcode='42501'; end if;
 if p_run_id is null or p_difficulty is null or p_difficulty not in ('easy','normal','hard','veryhard','impossible') then raise exception '잘못된 AI 대전 정보입니다.' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
 select * into r from public.desert_solo_skin_runs where id=p_run_id;
 if found then
  if r.user_id<>u or r.difficulty<>p_difficulty or r.abandoned then raise exception '다른 AI 대전 정보입니다.' using errcode='42501'; end if;
  return jsonb_build_object('runId',r.id,'difficulty',r.difficulty);
 end if;
 update public.desert_solo_skin_runs set abandoned=true where user_id=u and finished_at is null and not abandoned;
 insert into public.desert_solo_skin_runs(id,user_id,difficulty) values(p_run_id,u,p_difficulty);
 return jsonb_build_object('runId',p_run_id,'difficulty',p_difficulty);
end $$;
create function private.desert_finish_solo_skin(p_run_id uuid,p_won boolean) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.desert_solo_skin_runs%rowtype; reward integer:=0; duplicate boolean;
begin
 if u is null or not exists(select 1 from public.desert_web_members where user_id=u) then raise exception '회원 로그인이 필요합니다.' using errcode='42501'; end if;
 select * into r from public.desert_solo_skin_runs where id=p_run_id and user_id=u for update;
 if not found or r.abandoned then raise exception '진행한 AI 대전을 확인할 수 없습니다.' using errcode='42501'; end if;
 if p_won is null then raise exception '결과가 필요합니다.' using errcode='22023'; end if;
 duplicate:=r.finished_at is not null;
 if not duplicate then
  if p_won and clock_timestamp()<r.started_at+interval '10 seconds' then raise exception '첫 출격 전 승리 결과입니다.' using errcode='22023'; end if;
  update public.desert_solo_skin_runs set finished_at=clock_timestamp(),won=p_won where id=r.id;
  if p_won then
   reward:=case r.difficulty when 'easy' then 50 when 'normal' then 100 when 'hard' then 150 when 'veryhard' then 200 when 'impossible' then 250 end;
   perform private.desert_credit_skin_reward(u,'solo',r.id::text,reward);
  end if;
 end if;
 select coalesce((select points from public.desert_skin_match_rewards where user_id=u and source_kind='solo' and match_key=r.id::text),0) into reward;
 return jsonb_build_object('runId',r.id,'reward',reward,'alreadyRecorded',duplicate,'wallet',private.desert_skin_state());
end $$;
create function public.desert_begin_solo_skin(p_run_id uuid,p_difficulty text) returns jsonb language sql security invoker set search_path='' as $$select private.desert_begin_solo_skin(p_run_id,p_difficulty);$$;
create function public.desert_finish_solo_skin(p_run_id uuid,p_won boolean) returns jsonb language sql security invoker set search_path='' as $$select private.desert_finish_solo_skin(p_run_id,p_won);$$;
revoke all on function private.desert_begin_solo_skin(uuid,text),private.desert_finish_solo_skin(uuid,boolean),public.desert_begin_solo_skin(uuid,text),public.desert_finish_solo_skin(uuid,boolean) from public,anon,authenticated;
grant execute on function private.desert_begin_solo_skin(uuid,text),private.desert_finish_solo_skin(uuid,boolean),public.desert_begin_solo_skin(uuid,text),public.desert_finish_solo_skin(uuid,boolean) to authenticated;
create function private.desert_award_multi_skin() returns trigger language plpgsql security definer set search_path='' as $$
declare p record;
begin
 if new.state<>'done' or old.state='done' or new.mode not in ('pvp','classic') or new.winner_team is null or new.started_at is null then return new; end if;
 if (select count(distinct team) from public.desert_ranked_match_players where room_code=new.room_code)<>2 then return new; end if;
 for p in select user_id,team from public.desert_ranked_match_players where room_code=new.room_code order by user_id loop
  perform private.desert_credit_skin_reward(p.user_id,'multi',new.skin_reward_key::text,case when p.team=new.winner_team then 500 else 200 end);
 end loop;
 return new;
end $$;
revoke all on function private.desert_award_multi_skin() from public,anon,authenticated;
create trigger desert_award_multi_skin after update of state on public.desert_ranked_matches for each row execute function private.desert_award_multi_skin();
create function private.desert_match_skin_reward(p_code text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); reward integer; k uuid;
begin
 if u is null or not exists(select 1 from public.desert_web_members where user_id=u) or not exists(select 1 from public.desert_ranked_match_players where room_code=p_code and user_id=u) then raise exception '회원 참가자가 아닙니다.' using errcode='42501'; end if;
 select skin_reward_key into k from public.desert_ranked_matches where room_code=p_code;
 select coalesce((select points from public.desert_skin_match_rewards where user_id=u and source_kind='multi' and match_key=k::text),0) into reward;
 return jsonb_build_object('reward',reward,'wallet',private.desert_skin_state());
end $$;
create function public.desert_match_skin_reward(p_code text) returns jsonb language sql security invoker set search_path='' as $$select private.desert_match_skin_reward(p_code);$$;
revoke all on function private.desert_match_skin_reward(text),public.desert_match_skin_reward(text) from public,anon,authenticated;
grant execute on function private.desert_match_skin_reward(text),public.desert_match_skin_reward(text) to authenticated;
notify pgrst,'reload schema';
