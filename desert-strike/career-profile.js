/* Local detailed match history, unofficial RP and Firebase email accounts.
 * Progress/rating are CLIENT REPORTED. Never use this for prizes or verified ranks.
 */
(function(global){
'use strict';
const KEY='desert-career-v1',SDK='https://www.gstatic.com/firebasejs/12.18.0/';
const $=id=>document.getElementById(id);
const TIERS=[[2300,'마스터'],[2000,'다이아몬드'],[1700,'플래티넘'],[1400,'골드'],[1100,'실버'],[0,'브론즈']];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Math.floor(Number(n)||0)));
let authSDK,auth,firestore,user,pending=false,career=read();
function read(){try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');return {rating:clamp(d.rating||1000,100,3000),records:Array.isArray(d.records)?d.records.slice(0,40):[]};}catch(_){return {rating:1000,records:[]};}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(career));}catch(_){}}
function tier(score){return TIERS.find(x=>score>=x[0])[1];}
function record(input){
 if(!input||!['solo','pvp','classic','coop'].includes(input.mode))return;
 const mode=input.mode,win=input.winner===null?'무승부':input.winner===input.side?'승리':'패배';
 const entry={at:new Date().toISOString(),mode,result:win,size:clamp(input.size||1,1,3),faction:clamp(input.faction,0,9),wave:clamp(input.wave,0,999),seconds:clamp(input.seconds,0,7200)};
 career.records.unshift(entry);career.records=career.records.slice(0,40);
 if(input.online&&(mode==='pvp'||mode==='classic')&&win!=='무승부')career.rating=clamp(career.rating+(win==='승리'?24:-24),100,3000);
 persist();render();
}
function setStatus(message){const el=$('careerStatus');if(el)el.textContent=message;}
async function session(){
 if(!global.IronFirebase)throw Error('Firebase 모듈을 사용할 수 없습니다.');
 const shared=await global.IronFirebase.ready();
 authSDK=authSDK||await import(SDK+'firebase-auth.js');
 auth=authSDK.getAuth(shared.app);
 await authSDK.setPersistence(auth,authSDK.browserLocalPersistence);
 await auth.authStateReady();
 user=auth.currentUser||(await authSDK.signInAnonymously(auth)).user;
 firestore=shared;
 return user;
}
async function register(email,password){
 await session();
 if(!user.isAnonymous)throw Error('이미 이메일 계정입니다. 로그인을 이용해 주세요.');
 const old=user.uid,credential=authSDK.EmailAuthProvider.credential(email,password);
 const result=await authSDK.linkWithCredential(user,credential);
 if(result.user.uid!==old)throw Error('UID가 변경되었습니다. 연결을 중단했습니다.');
 user=result.user;return '이메일 연결 완료 · 기존 Firebase UID 유지';
}
async function login(email,password){
 await session();
 const result=await authSDK.signInWithEmailAndPassword(auth,email,password);
 user=result.user;return '이메일 로그인 완료 · '+(user.email||'')+' (기존 계정으로 전환)';
}
async function publish(){
 await session();
 const state=global.DesertLobby?.careerStats?.()||{};
 const profile={owner:user.uid,nickname:String(state.nickname||'지휘관').slice(0,16),rating:career.rating,
  level:clamp(state.level||1,1,100),pvpWins:clamp(state.mpWins,0,1000000),
  pvpLosses:clamp(state.mpLosses,0,1000000),faction:clamp(state.faction,0,9),verified:false};
 await firestore.fs.setDoc(firestore.fs.doc(firestore.db,'desertCommunityBoard',user.uid),profile);
 return '비공식 순위 등록 완료 · 서버 검증 없는 자기신고 기록';
}
async function leaderboard(){
 await session();
 const fs=firestore.fs,query=fs.query(fs.collection(firestore.db,'desertCommunityBoard'),
  fs.orderBy('rating','desc'),fs.limit(50));
 const rows=await fs.getDocs(query);
 const out=$('careerLeaderboard');out.replaceChildren();
 if(rows.empty){out.textContent='등록된 비공식 순위가 없습니다.';return;}
 let i=0;for(const doc of rows.docs){
  const d=doc.data();if(d.verified!==false)continue;
  const row=document.createElement('div');row.className='career-record';
  row.textContent=(++i)+'위 · '+String(d.nickname||'지휘관').slice(0,16)+' · '+clamp(d.rating,100,3000)+' RP · '+clamp(d.pvpWins,0,1000000)+'승 '+clamp(d.pvpLosses,0,1000000)+'패';
  out.append(row);
 }
}
function render(){
 const title=$('careerRating');if(title)title.textContent='비공식 '+tier(career.rating)+' · '+career.rating+' RP';
 const history=$('careerHistory');if(!history)return;history.replaceChildren();
 if(!career.records.length){history.textContent='아직 저장된 경기가 없습니다.';return;}
 for(const e of career.records.slice(0,40)){
  const row=document.createElement('div');row.className='career-record';
  let at;try{at=new Date(e.at).toLocaleString('ko-KR');}catch(_){at='기록';}
  row.textContent=at+' · '+({solo:'싱글',pvp:'3라인 PvP',classic:'클래식 1:1',coop:'협동'}[e.mode]||e.mode)+' · '+e.size+'인 · '+e.result+' · W'+e.wave+' · '+Math.floor(e.seconds/60)+'분 '+e.seconds%60+'초';
  history.append(row);
 }
}
async function act(fn){
 if(pending)return;pending=true;
 try{setStatus('Firebase 처리 중…');setStatus(await fn());}
 catch(e){setStatus('처리 실패: '+(global.IronFirebase?.message?.(e)||e?.message||String(e)));}
 finally{pending=false;renderAccount();}
}
function renderAccount(){
 const el=$('careerAccount');if(!el)return;
 el.textContent=user?(user.isAnonymous?'기기 익명 계정 · '+user.uid.slice(0,8):'이메일 계정 · '+(user.email||'')):'Firebase 연결 전';
}
function init(){
 render();
 const panel=$('careerPanel'),open=$('careerOpen');
 if(open&&panel)open.addEventListener('click',()=>{panel.hidden=!panel.hidden;if(!panel.hidden){render();void session().then(renderAccount).catch(()=>{});}});
 const close=$('careerClose');if(close)close.addEventListener('click',()=>{panel.hidden=true;});
 const register=$('careerRegister');if(register)register.addEventListener('click',()=>act(()=>registerEmail()));
 function registerEmail(){return registerUser(true);}
 async function registerUser(isNew){
  const email=String($('careerEmail').value||'').trim(),password=$('careerPassword').value;
  if(!email.includes('@')||password.length<6)throw Error('이메일과 6자 이상 비밀번호를 입력하세요.');
  try{return await (isNew?register(email,password):login(email,password));}
  finally{$('careerPassword').value='';}
 }
 const signIn=$('careerLogin');if(signIn)signIn.addEventListener('click',()=>act(()=>registerUser(false)));
 const publishButton=$('careerPublish');if(publishButton)publishButton.addEventListener('click',()=>act(publish));
 const board=$('careerShowBoard');if(board)board.addEventListener('click',()=>act(async()=>{await leaderboard();return '비공식 커뮤니티 랭킹 조회 완료';}));
}
global.DesertCareer=Object.freeze({record,tier,rating:()=>career.rating,history:()=>career.records.slice(),render});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})(window);
