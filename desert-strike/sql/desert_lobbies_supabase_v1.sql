-- Production schema recovered from live Supabase project desert-front, 2026-11-01.
-- Room/SDP state only; combat and input packets stay on WebRTC P2P.
create table if not exists public.desert_lobbies (
 code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
 owner_uid uuid not null references auth.users(id),
 payload jsonb not null, public_room boolean not null,
 expires_at timestamptz not null, revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
create table if not exists public.desert_lobby_signals (
 room_code text not null references public.desert_lobbies(code) on delete cascade,
 guest_uid uuid not null references auth.users(id),
 offer text not null, answer text not null default '',
 updated_at timestamptz not null default now(),
 primary key(room_code,guest_uid),
 check(length(offer)<=65536 and length(answer)<=65536)
);
create index if not exists desert_lobbies_public_idx on public.desert_lobbies(updated_at desc) where public_room;
create index if not exists desert_lobbies_expiry_idx on public.desert_lobbies(expires_at);
alter table public.desert_lobbies enable row level security;
alter table public.desert_lobby_signals enable row level security;
revoke all on public.desert_lobbies,public.desert_lobby_signals from anon,authenticated;
grant select on public.desert_lobbies,public.desert_lobby_signals to authenticated;
drop policy if exists desert_lobbies_view on public.desert_lobbies;
create policy desert_lobbies_view on public.desert_lobbies for select to authenticated
using (
 (public_room and expires_at>now() and payload->>'status'='lobby')
 or (payload->'players') ? (select auth.uid())::text
);
drop policy if exists desert_lobby_signals_view on public.desert_lobby_signals;
create policy desert_lobby_signals_view on public.desert_lobby_signals for select to authenticated
using (exists(
 select 1 from public.desert_lobbies r where r.code=room_code and r.expires_at>now()
 and (r.payload->'players') ? (select auth.uid())::text
 and (r.owner_uid=(select auth.uid()) or guest_uid=(select auth.uid()))
));
CREATE OR REPLACE FUNCTION public.desert_lobby_action(p_code text, p_action text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid:=auth.uid(); v_row public.desert_lobbies%rowtype; v_room jsonb;
 v_players jsonb; v_size int; v_team int; v_total int; v_same int; v_other int; v_faction int; v_ready boolean;
begin
 if v_uid is null then raise exception '로그인이 필요합니다'; end if;
 select * into v_row from public.desert_lobbies where code=p_code for update;
 if not found then raise exception '존재하지 않는 방입니다'; end if;
 v_room:=v_row.payload;v_players:=v_room->'players';v_size:=(v_room->>'size')::int;
 if p_action<>'leave' and v_row.expires_at<=now() then raise exception '만료된 방입니다'; end if;
 if p_action='join' then
  if v_room->>'status'<>'lobby' then raise exception '대기 중인 방만 참가할 수 있습니다'; end if;
  if v_players ? v_uid::text then raise exception '이미 참가했습니다'; end if;
  v_faction:=(p_data->>'faction')::int;
  if v_faction is null or v_faction not between 0 and 9 then raise exception '종족 선택 오류'; end if;
  v_team:=case when v_room->>'mode'='coop' then 0 else (p_data->>'team')::int end;
  if v_team is null or v_team not in(0,1) then raise exception '잘못된 팀'; end if;
  select count(*),count(*) filter(where (value->>'team')::int=v_team),count(*) filter(where (value->>'team')::int=1-v_team)
   into v_total,v_same,v_other from jsonb_each(v_players);
  if v_same>=v_size then
   if v_room->>'mode'<>'coop' and v_other<v_size then v_team:=1-v_team;
   else raise exception '팀 정원 초과'; end if;
  end if;
  if v_total>=v_size*(case when v_room->>'mode'='coop' then 1 else 2 end) then
   raise exception '방 정원 초과'; end if;
  v_room:=jsonb_set(v_room,'{players}',v_players||jsonb_build_object(v_uid::text,jsonb_build_object(
   'name',left(coalesce(nullif(btrim(p_data->>'name'),''),'지휘관'),16),
   'faction',v_faction,'skin',left(coalesce(p_data->>'skin','default'),80),
   'team',v_team,'ready',false)));
 elsif p_action='ready' then
  if v_room->>'status'<>'lobby' or not (v_players ? v_uid::text) then raise exception '준비 변경 불가'; end if;
  v_room:=jsonb_set(v_room,array['players',v_uid::text,'ready'],to_jsonb(coalesce((p_data->>'ready')::boolean,false)));
 elsif p_action='start' then
  if v_row.owner_uid<>v_uid then raise exception '방장만 시작 가능'; end if;
  if v_room->>'status'<>'lobby' then raise exception '이미 시작된 방'; end if;
  select count(*),count(*) filter(where (value->>'team')::int=0),
   count(*) filter(where (value->>'team')::int=1),bool_and(coalesce((value->>'ready')::boolean,false))
   into v_total,v_same,v_other,v_ready from jsonb_each(v_players);
  if not coalesce(v_ready,false)
   or (v_room->>'mode'='coop' and (v_total<>v_size or v_same<>v_size))
   or (v_room->>'mode'<>'coop' and (v_total<>v_size*2 or v_same<>v_size or v_other<>v_size))
  then raise exception '팀별 정원과 준비 상태를 확인하세요'; end if;
  v_room:=jsonb_set(jsonb_set(v_room,'{status}','"playing"'::jsonb),'{publicRoom}','false'::jsonb);
 elsif p_action='leave' then
  if not(v_players ? v_uid::text) then raise exception '방 참가자가 아닙니다'; end if;
  if v_row.owner_uid=v_uid then
   delete from public.desert_lobbies where code=p_code;return null;
  end if;
  v_room:=jsonb_set(v_room,'{players}',v_players-v_uid::text);
  delete from public.desert_lobby_signals where room_code=p_code and guest_uid=v_uid;
 else raise exception '잘못된 방 동작';
 end if;
 update public.desert_lobbies set payload=v_room,
 public_room=coalesce((v_room->>'publicRoom')::boolean,false),revision=revision+1,updated_at=now() where code=p_code;
 return v_room;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.desert_lobby_create(p_code text, p_room jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 u uuid:=auth.uid(); mode text:=p_room->>'mode'; size int:=(p_room->>'size')::int; faction int:=(p_room->'player'->>'faction')::int;
 stamp bigint:=(extract(epoch from clock_timestamp())*1000)::bigint; obj jsonb;
begin
 if u is null then raise exception '로그인이 필요합니다'; end if;
 if p_code is null or p_code !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception '잘못된 방 코드'; end if;
 if mode is null or mode not in ('pvp','coop','classic') or size is null or size not between 1 and 3
 or (mode='coop' and size<2) or (mode='classic' and size<>1) or faction is null or faction not between 0 and 9
 then raise exception '잘못된 방 설정'; end if;
 obj:=jsonb_build_object('version',1,'host',u::text,'mode',mode,'size',size,
 'ruleset',case when p_room->>'ruleset' in ('augment','prism') then p_room->>'ruleset' else 'standard' end,
 'seed',greatest(1,coalesce((p_room->>'seed')::bigint,1)),
 'publicRoom',coalesce((p_room->>'publicRoom')::boolean,true),
 'status','lobby','created',stamp,'expires',stamp+7200000,
 'players',jsonb_build_object(u::text,jsonb_build_object(
 'name',left(coalesce(nullif(btrim(p_room->'player'->>'name'),''),'지휘관'),16),
 'faction',faction,'skin',left(coalesce(p_room->'player'->>'skin','default'),80),
 'team',0,'ready',false)));
 insert into public.desert_lobbies(code,owner_uid,payload,public_room,expires_at)
 values(p_code,u,obj,(obj->>'publicRoom')::boolean,to_timestamp((stamp+7200000)/1000.0));
 return obj;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.desert_lobby_get(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); r public.desert_lobbies%rowtype;
begin
 if u is null then raise exception '로그인이 필요합니다';end if;
 select * into r from public.desert_lobbies where code=p_code;
 if not found or r.expires_at<=now() then return null;end if;
 if r.payload->>'status'<>'lobby' and not((r.payload->'players') ? u::text) then return null;end if;
 return r.payload;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.desert_lobby_signal(p_code text, p_action text, p_guest uuid, p_sdp text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();r public.desert_lobbies%rowtype;
begin
 if u is null then raise exception '로그인이 필요합니다'; end if;
 if p_sdp is null or length(p_sdp)=0 or length(p_sdp)>65536 then raise exception '잘못된 연결 신호 길이'; end if;
 select * into r from public.desert_lobbies where code=p_code;
 if not found or r.expires_at<=now() or r.payload->>'status' not in('lobby','playing')
 then raise exception '연결 가능한 방이 없습니다'; end if;
 if not ((r.payload->'players') ? p_guest::text) then raise exception '방 참가자가 아닙니다'; end if;
 if p_action='offer' then
  if r.owner_uid<>u or p_guest=u then raise exception '방장만 제안 가능'; end if;
  insert into public.desert_lobby_signals(room_code,guest_uid,offer,answer)
  values(p_code,p_guest,p_sdp,'')
  on conflict(room_code,guest_uid) do update
    set offer=excluded.offer,answer='',updated_at=now();
 elsif p_action='answer' then
  if p_guest<>u then raise exception '참가자만 응답 가능'; end if;
  update public.desert_lobby_signals set answer=p_sdp,updated_at=now()
    where room_code=p_code and guest_uid=u;
  if not found then raise exception '연결 제안이 없습니다'; end if;
 else raise exception '잘못된 신호 동작'; end if;
end;
$function$
;


revoke all on function public.desert_lobby_create(text,jsonb) from public,anon;
revoke all on function public.desert_lobby_action(text,text,jsonb) from public,anon;
revoke all on function public.desert_lobby_signal(text,text,uuid,text) from public,anon;
revoke all on function public.desert_lobby_get(text) from public,anon;
grant execute on function public.desert_lobby_create(text,jsonb) to authenticated;
grant execute on function public.desert_lobby_action(text,text,jsonb) to authenticated;
grant execute on function public.desert_lobby_signal(text,text,uuid,text) to authenticated;
grant execute on function public.desert_lobby_get(text) to authenticated;
do $pub$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='desert_lobbies') then
  alter publication supabase_realtime add table public.desert_lobbies;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='desert_lobby_signals') then
  alter publication supabase_realtime add table public.desert_lobby_signals;
 end if;
end;
$pub$;
