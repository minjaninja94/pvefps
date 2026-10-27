/* Passwordless commander lobby. Cosmetics/progress are separate; real competitive rating
   requires a trusted backend. Never place passwords or Firebase Admin keys in browser code. */
(function(global){'use strict';
const $=id=>document.getElementById(id),FACTIONS=global.DesertRoster?.FACTIONS||[];
const SKINS=[
 {id:'default',name:'기본 제복',level:1,desc:'오리지널 전투복',filter:'none',tone:'#a9d9ce'},
 {id:'twilight',name:'황혼 작전',level:3,desc:'자줏빛 야전 도색',filter:'hue-rotate(55deg) saturate(1.3)',tone:'#ba91f2'},
 {id:'aurora',name:'오로라 특무',level:6,desc:'청록 발광형 전투복',filter:'hue-rotate(145deg) saturate(1.15)',tone:'#8bdff6'},
 {id:'gold',name:'황금 근위',level:10,desc:'시즌 훈련 보상',filter:'sepia(.62) saturate(1.35) contrast(1.05)',tone:'#e9c47f'}
];
const KEY='desert-front-training-v2',empty=()=>({xp:0,wins:0,losses:0,mpWins:0,mpLosses:0,selectedFaction:0,selectedSkin:'default',nickname:'지휘관'});
let progress=empty(),uid=null,active=false,lastMultiplayer='',authBusy=false;
function safeName(v){return String(v||'지휘관').trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,16)||'지휘관';}
function load(){
 try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');const p=empty();
  p.xp=Math.max(0,Math.min(10000000,Number(v.xp)||0));for(const k of ['wins','losses','mpWins','mpLosses'])p[k]=Math.max(0,Math.min(999999,Math.floor(Number(v[k])||0)));
  p.selectedFaction=Number.isInteger(v.selectedFaction)&&v.selectedFaction>=0&&v.selectedFaction<FACTIONS.length?v.selectedFaction:0;
  p.nickname=safeName(v.nickname);p.selectedSkin=SKINS.some(x=>x.id===v.selectedSkin)?v.selectedSkin:'default';return p;
 }catch(_){return empty();}
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(progress));}catch(_){}}
function levelFromXP(xp){let level=1,left=xp;while(level<100&&left>=100+level*70){left-=100+level*70;level++;}return {level,within:left,needed:100+level*70};}
function rank(){const score=progress.mpWins*3+progress.wins*.5;return score>=100?'플래티넘 연습생':score>=55?'골드 연습생':score>=24?'실버 연습생':score>=7?'브론즈 연습생':'훈련병';}
function currentSkin(){const lv=levelFromXP(progress.xp).level;return SKINS.find(x=>x.id===progress.selectedSkin&&lv>=x.level)||SKINS[0];}
function filterForSkin(id){return SKINS.find(x=>x.id===id)?.filter||'none';}
function stateChange(){save();render();if(uid)void syncProfile();}
function render(){
 if(!FACTIONS.length)return;
 const fac=FACTIONS[progress.selectedFaction]||FACTIONS[0],l=levelFromXP(progress.xp),s=currentSkin();
 $('lobbyAccountStatus').textContent=uid?'연결된 지휘관':'게스트 · 이 기기';
 $('lobbyLevel').textContent='LV. '+l.level;$('lobbyXP').textContent=l.within+' / '+l.needed+' XP';$('lobbyXPFill').style.width=Math.min(100,l.within/l.needed*100)+'%';
 $('lobbyRank').textContent=rank();$('lobbyRecord').textContent='싱글 '+progress.wins+'승 '+progress.losses+'패 · 온라인 '+progress.mpWins+'승 '+progress.mpLosses+'패 · 비공식 훈련 랭크';
 $('lobbyNickname').value=progress.nickname;
 $('lobbyFactionName').textContent=fac.name;$('lobbyFactionTrait').textContent=fac.slogan;
 const img=$('lobbyHeroArt');if(img){img.hidden=progress.selectedFaction<4;img.src=progress.selectedFaction<4?'':'./assets/portraits/'+fac.id+'.svg';}
 $('lobbyHero').classList.toggle('faction-portrait-active',progress.selectedFaction>=4);
 $('lobbyFactions').innerHTML=FACTIONS.map((f,i)=>'<button class="lobby-faction'+(i===progress.selectedFaction?' selected':'')+'" data-faction="'+i+'" style="--fac:'+f.color+'"><span class="lobby-icon">'+f.logo+'</span>'+(i>=4?'<img class="lobby-faction-art" src="./assets/portraits/'+f.id+'.svg" alt="">':'<canvas width="72" height="72" data-portrait="'+i+'"></canvas>')+'<strong>'+f.name+'</strong><small>'+f.tag+'</small></button>').join('');
 $('lobbyFactions').querySelectorAll('canvas').forEach(c=>{const f=Number(c.dataset.portrait);try{let p=global.IsoWorld?.portrait(f,f===8?5:f===7?1:0);if(p)c.getContext('2d').drawImage(p,0,0,72,72);}catch(_){}});
 $('lobbySkins').innerHTML=SKINS.map(x=>'<button class="lobby-skin'+(s.id===x.id?' selected':'')+'" data-skin="'+x.id+'" style="--skin:'+x.tone+'" '+(l.level<x.level?'disabled':'')+'><span class="skin-swatch">✦</span><strong>'+x.name+'</strong><small>'+(l.level<x.level?'LV.'+x.level+' 해금':x.desc)+'</small></button>').join('');
 $('lobbySkinMessage').textContent=s.name+' 선택 · 게임 능력치는 변경되지 않습니다.';
 const cv=$('lobbyHero'),ctx=cv.getContext('2d');if(ctx){
  ctx.clearRect(0,0,72,72);let art=global.IsoWorld?.frame(progress.selectedFaction,progress.selectedFaction===8?5:0,'idle',5);
  if(art){ctx.filter=s.filter;ctx.drawImage(art,0,0,72,72);ctx.filter='none';}
 }
 $('mpFaction').value=String(progress.selectedFaction);$('mpName').value=progress.nickname;
}
function show(){active=true;$('frontLobby').hidden=false;document.body.classList.add('lobby-active');render();}
function hide(){active=false;$('frontLobby').hidden=true;document.body.classList.remove('lobby-active');}
function chooseFaction(i){if(!Number.isInteger(i)||i<0||i>=FACTIONS.length)return;progress.selectedFaction=i;stateChange();}
function chooseSkin(id){const sk=SKINS.find(x=>x.id===id),l=levelFromXP(progress.xp).level;if(!sk||l<sk.level)return false;progress.selectedSkin=id;stateChange();return true;}
function grantXP(amount){progress.xp=Math.min(10000000,progress.xp+Math.max(0,Math.floor(amount)));stateChange();}
function completeSolo({win,wave}){if(win)progress.wins++;else progress.losses++;grantXP((win?120:45)+Math.min(80,Math.floor((wave||0)*3)));}
function completeMultiplayer({winner,side,matchId}){if(!matchId||lastMultiplayer===matchId)return;lastMultiplayer=matchId;if(winner===side)progress.mpWins++;else if(winner!==null)progress.mpLosses++;grantXP(winner===side?165:75);}
function info(msg){$('lobbyAuthMessage').textContent=msg;}
async function syncProfile(){
 if(!uid||!global.IronFirebase)return;
 try{const {db,fs}=await global.IronFirebase.ready();await fs.setDoc(fs.doc(db,'desertProfiles',uid),
 {name:progress.nickname,faction:progress.selectedFaction,skin:currentSkin().id},{merge:true});
 info('계정 프로필 동기화 완료 · XP와 훈련 랭크는 이 브라우저에만 저장됩니다.');
 }catch(e){info('계정은 연결됐지만 프로필 DB 동기화는 설정 확인이 필요합니다: '+(global.IronFirebase.message?.(e)||e.message));}
}
async function restoreAccount(){
 if(!global.IronFirebase)return;
 try{
  const {app,db,fs}=await global.IronFirebase.ready(),sdk=await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js');
  const auth=sdk.getAuth(app);await auth.authStateReady();
  if(!auth.currentUser||auth.currentUser.isAnonymous)return;
  uid=auth.currentUser.uid;
  try{
   const snap=await fs.getDoc(fs.doc(db,'desertProfiles',uid));
   if(snap.exists()){
    const pref=snap.data();
    if(pref.name)progress.nickname=safeName(pref.name);
    if(Number.isInteger(pref.faction)&&pref.faction>=0&&pref.faction<FACTIONS.length)progress.selectedFaction=pref.faction;
    if(SKINS.some(x=>x.id===pref.skin&&levelFromXP(progress.xp).level>=x.level))progress.selectedSkin=pref.skin;
    save();
   }
  }catch(_){info('계정 인증 성공 · 개인 프로필 DB 규칙이 배포되어야 기기 설정을 동기화할 수 있습니다.');}
  render();info('Google 계정 자동 로그인 · 레벨과 훈련 랭크는 이 기기의 로컬 진행도입니다.');
 }catch(_){/* Offline guest play remains available. */}
}
async function google(){
 if(authBusy)return;authBusy=true;$('lobbyGoogle').disabled=true;info('Google 로그인 창을 준비하는 중…');
 try{
  const {app}=await global.IronFirebase.ready(),sdk=await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js');
  const auth=sdk.getAuth(app);await sdk.setPersistence(auth,sdk.browserLocalPersistence);
  const provider=new sdk.GoogleAuthProvider();
  let result;
  try{result=auth.currentUser?.isAnonymous?await sdk.linkWithPopup(auth.currentUser,provider):await sdk.signInWithPopup(auth,provider);}
  catch(e){if(e?.code==='auth/credential-already-in-use'||e?.code==='auth/email-already-in-use')result=await sdk.signInWithPopup(auth,provider);else throw e;}
  uid=result.user.uid;info('Google 계정이 연결되었습니다.');await syncProfile();render();
 }catch(e){info('Google 로그인에 실패했습니다. Firebase에서 Google 제공자와 승인된 도메인을 확인하세요: '+(e?.message||String(e)));}
 finally{authBusy=false;$('lobbyGoogle').disabled=false;}
}
async function guest(){
 uid=null;
 try{
  if(global.IronFirebase){
   const {app}=await global.IronFirebase.ready(),sdk=await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js');
   const auth=sdk.getAuth(app);
   await sdk.signOut(auth);await sdk.setPersistence(auth,sdk.browserSessionPersistence);
  }
 }catch(_){}
 info('게스트 모드로 전환했습니다. 진행도는 이 기기에만 저장됩니다.');render();
}
function prepare(){
 const button=[...document.querySelectorAll('#factionCards [data-faction]')].find(x=>Number(x.dataset.faction)===progress.selectedFaction);
 if(button)button.click();$('mpFaction').value=String(progress.selectedFaction);$('mpName').value=progress.nickname;
}
function single(){prepare();hide();$('startButton').click();}
function multiplayer(practice=false){
 prepare();hide();$('startOverlay').classList.add('hidden');
 const tab=document.querySelector('[data-view="multiplayer"]');if(tab)tab.click();
 if(practice)$('mpPractice').click();
}
function initialize(){
 if(!FACTIONS.length||!$('frontLobby'))return;progress=load();
 $('lobbyFactions').addEventListener('click',e=>{const b=e.target.closest('[data-faction]');if(b)chooseFaction(Number(b.dataset.faction));});
 $('lobbySkins').addEventListener('click',e=>{const b=e.target.closest('[data-skin]');if(b)chooseSkin(b.dataset.skin);});
 $('lobbySolo').addEventListener('click',single);$('lobbyMulti').addEventListener('click',()=>multiplayer(false));$('lobbyPractice').addEventListener('click',()=>multiplayer(true));
 $('backToLobby').addEventListener('click',()=>{if(global.DesertTriNetwork?.current()?.roomId)return alert('온라인 경기에서는 방 나가기 후 로비로 이동해 주세요.');if(!$('mpLeave').disabled)$('mpLeave').click();$('restartButton').click();show();});
 $('lobbySaveName').addEventListener('click',()=>{progress.nickname=safeName($('lobbyNickname').value);stateChange();});
 $('lobbyGoogle').addEventListener('click',google);$('lobbyGuest').addEventListener('click',()=>{void guest();});
 global.addEventListener?.('maiden-art-ready',render);global.addEventListener?.('isometric-art-ready',render);
 show();void restoreAccount();
}
global.DesertLobby=Object.freeze({levelFromXP,filterForSkin,skinFilter:()=>currentSkin().filter,selectedSkin:()=>currentSkin().id,selectedFaction:()=>progress.selectedFaction,chooseFaction,chooseSkin,completeSolo,completeMultiplayer,grantXP,show,hide});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})(window);
