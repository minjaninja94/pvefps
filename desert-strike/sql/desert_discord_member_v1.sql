-- Discord OAuth accounts are provisioned only after Supabase has verified their Discord identity.
-- Existing member IDs and all associated wallet/unlock/rank rows are never rewritten.
create or replace function public.desert_discord_claim_member(p_username text, p_nickname text)
returns public.desert_web_members
language plpgsql security definer set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_nickname text := btrim(coalesce(p_nickname, ''));
  v_member public.desert_web_members%rowtype;
begin
  if v_uid is null or not exists (
    select 1 from auth.identities i where i.user_id=v_uid and i.provider='discord'
  ) then
    raise exception 'Discord 인증을 완료한 계정만 등록할 수 있습니다.' using errcode='42501';
  end if;
  select * into v_member from public.desert_web_members where user_id=v_uid;
  if found then return v_member; end if;
  if v_username !~ '^[a-z0-9_]{4,20}$' then
    raise exception '아이디는 영문 소문자·숫자·_ 4~20자입니다.' using errcode='22023';
  end if;
  if char_length(v_nickname) < 1 or char_length(v_nickname) > 16 then
    raise exception '닉네임은 1~16자입니다.' using errcode='22023';
  end if;
  begin
    insert into public.desert_web_members(user_id,username,nickname)
    values(v_uid,v_username,v_nickname)
    returning * into v_member;
  exception when unique_violation then
    raise exception '이미 사용 중인 아이디입니다. 다른 아이디를 선택하세요.' using errcode='23505';
  end;
  return v_member;
end;
$function$;
revoke all on function public.desert_discord_claim_member(text,text) from public, anon;
grant execute on function public.desert_discord_claim_member(text,text) to authenticated;
