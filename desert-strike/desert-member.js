/* Supabase ID/password account and server-authoritative abandonment ledger.
 * Firebase continues to handle P2P signaling. No service key or password storage.
 */
(function(global){
'use strict';
const PROJECT='https://gshcrhfqpkkcwinrbqjm.supabase.co';
const KEY='sb_publishable_w5JXAnoVsKky54QgiAPtAg_UyzmZAli';
const EMAIL_DOMAIN='@accounts.desertfront.invalid';
const SDK='https://esm.sh/@supabase/supabase-js@2.76.1';
let clientPromise,member=null,session=null,match=null,saveTimer=null,processing=false,registrationVersion=0;
const $=id=>document.getElementById(id);
const username=id=>String(id||'').trim().toLowerCase();
const status=t=>{if($('careerStatus'))$('careerStatus').textContent=t;};
async function api(){
 if(!clientPromise)clientPromise=import(SDK).then(({createClient})=>createClient(PROJECT,KEY,{
  auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false,storageKey:'desert-front-member-auth-v1'}
 })).catch(e=>{clientPromise=null;throw e;});
 return clientPromise;
}
function account(){return member?{username:member.username,nickname:member.nickname,userId:member.user_id}:null;}
function show(){
 const a=account(),b=$('careerAccount'),label=$('lobbyAccountStatus');
 if(b)b.textContent=a?'회원 · '+a.username+' ('+a.nickname+')':'게스트 플레이 · 이 브라우저';
 if(label)label.textContent=a?'회원 · '+a.nickname:'게스트 · 이 기기';
 $('careerLogout')?.toggleAttribute('hidden',!a);
 $('careerRegister')?.toggleAttribute('hidden',!!a);
 $('careerLogin')?.toggleAttribute('hidden',!!a);
 const open=$('careerOpen');if(open)open.textContent=a?'내 계정 · 전적':'로그인 / 회원가입';
 if(a)global.DesertCareer?.setMode?.('member');
 else if($('careerPanel')?.dataset.authMode==='member')global.DesertCareer?.setMode?.('login');
 global.DesertCareer?.render?.();
}
async function loadMember(user,importGuest=false){
 const db=await api();
 const {data,error}=await db.from('desert_web_members').select('*').eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 member=data||null;
 session=(await db.auth.getSession()).data.session;
 if(member){
  if(importGuest){
   const old=global.DesertLobby?.exportProgress?.();
   if(old){const merged={...old,nickname:member.nickname};await saveProgress(merged,true);global.DesertLobby?.importProgress?.(merged);}
  }else global.DesertLobby?.importProgress?.({
   xp:member.xp,wins:member.wins,losses:member.losses,mpWins:member.mp_wins,mpLosses:member.mp_losses,
   nickname:member.nickname,selectedFaction:member.selected_faction,selectedSkin:member.selected_skin,
   aiDifficulty:member.ai_difficulty
  });
  await refreshRating();
 }
 show();return member;
}
async function restore(){
 try{const db=await api(),{data,error}=await db.auth.getSession();if(error)throw error;
  if(data.session)await loadMember(data.session.user);
  else {member=null;session=null;show();}
 }catch(e){status('Supabase 계정 확인 실패: '+(e.message||e));}
}
async function signup(id,pass,nick){
 const userId=username(id),nickname=String(nick||'').trim();
 if(!/^[a-z0-9_]{4,20}$/.test(userId))throw Error('아이디는 영문 소문자·숫자·_ 4~20자입니다.');
 if(pass.length<8||pass.length>72)throw Error('비밀번호는 8~72자로 설정하세요.');
 if(!nickname||Array.from(nickname).length>16)throw Error('닉네임은 1~16자입니다.');
 const response=await fetch(PROJECT+'/functions/v1/desert-signup',{
  method:'POST',headers:{'content-type':'application/json','apikey':KEY},
  body:JSON.stringify({username:userId,password:pass,nickname})
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'회원가입 실패');
 const db=await api(),result=await db.auth.signInWithPassword({email:userId+EMAIL_DOMAIN,password:pass});
 if(result.error)throw result.error;
 await loadMember(result.data.user,true);
 return account();
}
async function login(id,pass){
 const userId=username(id);
 if(!/^[a-z0-9_]{4,20}$/.test(userId))throw Error('올바른 아이디를 입력하세요.');
 const db=await api(),result=await db.auth.signInWithPassword({email:userId+EMAIL_DOMAIN,password:pass});
 if(result.error)throw Error('아이디 또는 비밀번호를 확인해 주세요.');
 await loadMember(result.data.user,false);return account();
}
async function logout(){
 if(match?.tracked&&match.playing&&!match.ended)await forfeit();
 const db=await api(),{error}=await db.auth.signOut();
 if(error)throw error;
 member=null;session=null;match=null;global.DesertLobby?.useGuestProfile?.();show();
}
async function saveProgress(progress,immediate=false){
 if(!member||!progress)return;
 const next={
  nickname:String(progress.nickname||member.nickname).slice(0,16),
  xp:Math.max(0,Math.min(10000000,Math.floor(progress.xp||0))),
  wins:Math.max(0,Math.floor(progress.wins||0)),losses:Math.max(0,Math.floor(progress.losses||0)),
  mp_wins:Math.max(0,Math.floor(progress.mpWins||0)),mp_losses:Math.max(0,Math.floor(progress.mpLosses||0)),
  selected_faction:Number(progress.selectedFaction)||0,selected_skin:progress.selectedSkin||'default',
  ai_difficulty:progress.aiDifficulty==='hard'?'hard':'normal',updated_at:new Date().toISOString()
 };
 const save=async()=>{
  const db=await api(),{error}=await db.from('desert_web_members').update(next).eq('user_id',member.user_id);
  if(error)throw error;member={...member,...next};
 };
 if(immediate)return save();
 clearTimeout(saveTimer);saveTimer=setTimeout(()=>void save().catch(e=>status('프로필 저장 실패: '+e.message)),450);
}
async function refreshRating(){
 if(!member)return;
 const db=await api(),{data,error}=await db.from('desert_ranked_scores').select('rating,wins,losses').eq('user_id',member.user_id).maybeSingle();
 if(!error){global.DesertCareer?.setServerRating?.(data?.rating??1000,data?.wins??0,data?.losses??0);}
}
async function ensureGuestSession(){
 const db=await api();
 const {data}=await db.auth.getSession();
 if(data.session){session=data.session;return data.session;}
 const result=await db.auth.signInAnonymously();
 if(result.error)throw Error('Supabase 게스트 인증이 꺼져 있습니다. 서버 탈주 판정이 필요한 경기는 회원 로그인으로 이용하세요.');
 session=result.data.session;return result.data.session;
}
async function joinMatch(opts){
 const version=++registrationVersion;
 try{
  const db=await api();await ensureGuestSession();
  const {data,error}=await db.rpc('desert_join_match',{
   p_code:opts.code,p_mode:opts.mode,p_size:Number(opts.size),p_team:Number(opts.team),p_host:!!opts.host
  });
  if(error)throw error;
  if(version!==registrationVersion)return {ok:false,reason:'이전 방 등록 요청이 종료되었습니다.'};
  match={code:opts.code,tracked:true,playing:false,ended:false,reportedResult:false,winner:null};
  return {ok:true,data};
 }catch(e){if(version===registrationVersion)match=null;return {ok:false,reason:e.message||String(e)};}
}
async function startMatch(){
 if(!match?.tracked)return {ok:false,reason:'서버 경기 기록에 참가자가 등록되지 않았습니다.'};
 const db=await api(),{data,error}=await db.rpc('desert_start_match',{p_code:match.code});
 if(error)return {ok:false,reason:error.message};
 match.playing=true;return {ok:true,data};
}
function markPlaying(code){
 if(match?.tracked&&match.code===code)match.playing=true;
}
async function poll(){
 if(!match?.tracked||!match.playing||match.ended)return null;
 try{
  const db=await api(),{data,error}=await db.rpc('desert_ping_match',{p_code:match.code});
  if(error)throw error;
  if(['done','abandoned'].includes(data?.state)){match.ended=true;match.winner=data.winner_team;await refreshRating();}
  return data;
 }catch(e){status('서버 경기 상태 확인 실패: '+e.message);return null;}
}
async function forfeit(){
 if(!match?.tracked||!match.playing||match.ended)return null;
 match.ended=true;
 try{
  const db=await api(),{data,error}=await db.rpc('desert_forfeit_match',{p_code:match.code});
  if(error)throw error;
  await refreshRating();return data;
 }catch(e){match.ended=false;status('탈주 기록 서버 처리 중: '+e.message);return null;}
}
async function reportResult(winner){
 if(!match?.tracked||!match.playing)return {state:'untracked'};
 if(match.ended)return {state:'done',winner_team:match.winner};
 if(winner!==null&&![0,1].includes(winner))return {state:'error',error:'올바르지 않은 경기 결과'};
 try{
  const db=await api(),{data,error}=await db.rpc('desert_report_match_result',{p_code:match.code,p_winner:winner});
  if(error)throw error;
  match.reportedResult=!!(data?.report_received||data?.state==='done'||data?.waiting_for_other_players);
  if(data?.state==='done'){match.ended=true;match.winner=data.winner_team;await refreshRating();}
  return data;
 }catch(e){status('경기 결과 전송 실패: '+e.message);return {state:'error',error:e?.message||String(e)};}
}
async function pendingState(){
 if(!match?.tracked)return null;
 const db=await api(),{data}=await db.rpc('desert_my_match',{p_code:match.code});
 return data;
}
function endMatch(){registrationVersion++;if(match)match.ended=true;}
function fastForfeit(){
 if(!match?.tracked||!match.playing||match.ended||match.reportedResult||!session?.access_token)return;
 const body=JSON.stringify({p_code:match.code});
 fetch(PROJECT+'/rest/v1/rpc/desert_forfeit_match',{method:'POST',keepalive:true,
  headers:{'apikey':KEY,'Authorization':'Bearer '+session.access_token,'content-type':'application/json'},
  body}).catch(()=>{});
}
function init(){
 const btn=(id,handler)=>$(id)?.addEventListener('click',async()=>{
  if(processing)return;processing=true;
  try{status('계정을 처리하고 있습니다…');await handler();status('완료 · 계정 진행도를 이어서 플레이할 수 있습니다.');if(['careerRegister','careerLogin','careerGuest'].includes(id))global.DesertCareer?.close?.();}
  catch(e){status('처리 실패: '+(e.message||e));}
  finally{processing=false;const pw=$('careerPassword');if(pw)pw.value='';show();}
 });
 btn('careerRegister',()=>signup($('careerEmail').value,$('careerPassword').value,$('careerNickname').value));
 btn('careerLogin',()=>login($('careerEmail').value,$('careerPassword').value));
 btn('careerLogout',logout);
 btn('careerGuest',async()=>{if(member)await logout();global.DesertCareer?.close?.();});
 global.addEventListener('pagehide',fastForfeit);
 global.addEventListener('beforeunload',fastForfeit);
 show();
}
global.DesertMember=Object.freeze({restore,signup,login,logout,account,isMember:()=>!!member,
 saveProgress,joinMatch,startMatch,markPlaying,poll,forfeit,reportResult,pendingState,endMatch,refreshRating});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
