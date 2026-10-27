/* Passwordless commander lobby. Cosmetics/progress are separate; real competitive rating
   requires a trusted backend. Never place passwords or Firebase Admin keys in browser code. */
(function(global){'use strict';
const $=id=>document.getElementById(id),FACTIONS=global.DesertRoster?.FACTIONS||[];
const SKINS=[
 {id:'default',name:'기본 제복',level:1,desc:'종족별 원본 스프라이트',filter:'none',tone:'#a9d9ce'},
 {id:'moe',name:'모에화 빔',level:1,desc:'전 병종 SD 캐릭터',filter:'none',tone:'#f4afd5'},
 {id:'twilight',name:'황혼 작전',level:3,desc:'자줏빛 야전 도색',filter:'hue-rotate(55deg) saturate(1.3)',tone:'#ba91f2'},
 {id:'aurora',name:'오로라 특무',level:6,desc:'청록 발광형 전투복',filter:'hue-rotate(145deg) saturate(1.15)',tone:'#8bdff6'},
 {id:'gold',name:'황금 근위',level:10,desc:'시즌 훈련 보상',filter:'sepia(.62) saturate(1.35) contrast(1.05)',tone:'#e9c47f'}
];
const KEY='desert-front-training-v2',empty=()=>({xp:0,wins:0,losses:0,mpWins:0,mpLosses:0,selectedFaction:0,selectedSkin:'default',aiDifficulty:'normal',nickname:'지휘관'});
let progress=empty(),uid=null,active=false,lastMultiplayer='',authBusy=false;
let selectedUnit=0,selectedAction='idle',animationStart=0,animationTick=0,onlineOpen=false;
function safeName(v){return String(v||'지휘관').trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,16)||'지휘관';}
function load(){
 try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');const p=empty();
  p.xp=Math.max(0,Math.min(10000000,Number(v.xp)||0));for(const k of ['wins','losses','mpWins','mpLosses'])p[k]=Math.max(0,Math.min(999999,Math.floor(Number(v[k])||0)));
  p.selectedFaction=Number.isInteger(v.selectedFaction)&&v.selectedFaction>=0&&v.selectedFaction<FACTIONS.length?v.selectedFaction:0;
  p.aiDifficulty=v.aiDifficulty==='hard'?'hard':'normal';
  p.nickname=safeName(v.nickname);p.selectedSkin=SKINS.some(x=>x.id===v.selectedSkin)?v.selectedSkin:'default';return p;
 }catch(_){return empty();}
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(progress));}catch(_){}}
function levelFromXP(xp){let level=1,left=xp;while(level<100&&left>=100+level*70){left-=100+level*70;level++;}return {level,within:left,needed:100+level*70};}
function rank(){const score=progress.mpWins*3+progress.wins*.5;return score>=100?'플래티넘 연습생':score>=55?'골드 연습생':score>=24?'실버 연습생':score>=7?'브론즈 연습생':'훈련병';}
function currentSkin(){const lv=levelFromXP(progress.xp).level;return SKINS.find(x=>x.id===progress.selectedSkin&&lv>=x.level)||SKINS[0];}
function filterForSkin(id){return SKINS.find(x=>x.id===id)?.filter||'none';}
function stateChange(){save();render();if(uid)void syncProfile();}
function updateUnitInfo(){
 const i=progress.selectedFaction,r=selectedUnit,fac=FACTIONS[i],unit=global.DesertRoster?.getDef?.(r,i);
 if(!fac||!unit)return;
 $('lobbyUnitTitle').textContent=fac.units[r]+' · '+unit.name;
 $('lobbyUnitStats').textContent='HP '+Math.round(unit.hp)+' · 공격 '+Math.round(unit.damage)+' · 치료 '+Math.round(unit.heal||0)+' · 사거리 '+Math.round(unit.range)+' · 속도 '+Math.round(unit.speed)+' · '+(unit.kind==='air'?'비행':unit.name.includes('기병')?'지상 기병':unit.name.includes('차량')?'지상 차량':unit.name.includes('메카')?'지상 메카':'지상')+(unit.airTarget?' · 대공 가능':'')+' · '+(unit.tips||'');
 $('lobbyUnitAnimBadge').textContent=global.DesertUnitMotion?.ACTIONS.find(a=>a.id===selectedAction)?.label||'대기';
 $('lobbyUnitActions').querySelectorAll('[data-action]').forEach(btn=>btn.classList.toggle('active',btn.dataset.action===selectedAction));
}
function renderUnitGallery(){
 const f=FACTIONS[progress.selectedFaction];
 if(!f||!$('lobbyUnitGrid'))return;
 const R=global.DesertRoster;
 $('lobbyUnitGrid').innerHTML=f.units.map((name,i)=>'<button type="button" class="lobby-unit-card'+(selectedUnit===i?' selected':'')+'" data-unit="'+i+'"><canvas width="72" height="72" data-motion-role="'+i+'" aria-label="'+name+' 이동 애니메이션"></canvas><strong>'+name+'</strong><small>'+(R.getDef?.(i,progress.selectedFaction)?.name||'')+'</small></button>').join('');
 updateUnitInfo();
}
function drawUnitAnimations(ts){
 global.requestAnimationFrame(drawUnitAnimations);
 if(!active||document.hidden||ts-animationTick<70)return;
 animationTick=ts;
 const f=progress.selectedFaction,m=global.DesertUnitMotion;
 if(!m||!global.IsoWorld)return;
 const elapsed=(ts-animationStart)/1000,filter=currentSkin().filter,skin=currentSkin().id;
 $('lobbyUnitGrid').querySelectorAll('canvas[data-motion-role]').forEach(c=>{
  const r=Number(c.dataset.motionRole),ctx=c.getContext('2d');
  if(!ctx)return;
  ctx.clearRect(0,0,72,72);
  m.draw(ctx,{faction:f,role:r,action:r===selectedUnit?selectedAction:'move',frame:m.frameAt(r===selectedUnit?selectedAction:'move',elapsed),size:72,filter,skin});
 });
 const large=$('lobbyUnitPreview'),ctx=large?.getContext('2d');
 if(ctx){ctx.clearRect(0,0,192,192);m.draw(ctx,{faction:f,role:selectedUnit,action:selectedAction,frame:m.frameAt(selectedAction,elapsed),size:178,x:7,y:7,filter,skin});}
 // Headquarters canvas is a static cover, not the animated unit preview.
}
function chooseUnit(i){
 if(!Number.isInteger(i)||i<0||i>=8)return;
 selectedUnit=i;selectedAction='idle';animationStart=performance.now();
 renderUnitGallery();
}
function chooseAction(action){
 if(!global.DesertUnitMotion?.ACTIONS.some(a=>a.id===action))return;
 selectedAction=action;animationStart=performance.now();updateUnitInfo();
}
function renderCovers(){const art=global.DesertCommanderCovers;if(!art)return;const skin=currentSkin().id;
 $('lobbyFactions')?.querySelectorAll('canvas[data-cover]')?.forEach(c=>art.draw(c,Number(c.dataset.cover),skin));
 art.draw($('lobbyHero'),progress.selectedFaction,skin);
}
function chooseDifficulty(value){if(!['normal','hard'].includes(value))return;progress.aiDifficulty=value;save();render();}
function render(){
 if(!FACTIONS.length)return;
 const fac=FACTIONS[progress.selectedFaction]||FACTIONS[0],l=levelFromXP(progress.xp),s=currentSkin();
 $('lobbyDifficulty')?.querySelectorAll('[data-difficulty]').forEach(b=>{const chosen=b.dataset.difficulty===progress.aiDifficulty;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));});
 $('lobbySolo').querySelector('span').textContent=(progress.aiDifficulty==='hard'?'하드 AI':'일반 AI')+' · 22웨이브 전투';
 const account=global.DesertDeviceAccount?.status?.();
 $('lobbyAccountStatus').textContent=account?(uid?'기기 인증 연결':'기기 계정 · 오프라인'):'게스트 · 이 기기';
 if(account){$('lobbyUserId').value=account.accountId;$('lobbyDeviceId').value=account.deviceId;}
 $('lobbyLevel').textContent='LV. '+l.level;$('lobbyXP').textContent=l.within+' / '+l.needed+' XP';$('lobbyXPFill').style.width=Math.min(100,l.within/l.needed*100)+'%';
 $('lobbyRank').textContent=rank();$('lobbyRecord').textContent='싱글 '+progress.wins+'승 '+progress.losses+'패 · 온라인 '+progress.mpWins+'승 '+progress.mpLosses+'패 · 비공식 훈련 랭크';
 $('lobbyNickname').value=progress.nickname;
 $('lobbyFactionName').textContent=fac.name;$('lobbyFactionTrait').textContent=fac.bonus+' · '+fac.slogan;

 $('lobbyFactions').innerHTML=FACTIONS.map((f,i)=>'<button class="lobby-faction'+(i===progress.selectedFaction?' selected':'')+'" data-faction="'+i+'" style="--fac:'+f.color+'"><span class="lobby-icon">'+f.logo+'</span><canvas width="160" height="114" data-cover="'+i+'" aria-label="'+f.name+' 사령부와 대표 병력"></canvas><strong>'+f.name+'</strong><small>'+f.tag+'</small></button>').join('');
 $('lobbySkins').innerHTML=SKINS.map(x=>'<button class="lobby-skin'+(s.id===x.id?' selected':'')+'" data-skin="'+x.id+'" style="--skin:'+x.tone+'" '+(l.level<x.level?'disabled':'')+'><span class="skin-swatch">✦</span><strong>'+x.name+'</strong><small>'+(l.level<x.level?'LV.'+x.level+' 해금':x.desc)+'</small></button>').join('');
 $('lobbySkinMessage').textContent=s.name+' 선택 · 게임 능력치는 변경되지 않습니다.';
 renderUnitGallery();
 renderCovers();
 $('mpFaction').value=String(progress.selectedFaction);$('mpName').value=progress.nickname;
}
function show(){global.DesertCommandHud?.closeUpgrades?.();delete document.body.dataset.playMode;active=true;$('frontLobby').hidden=false;document.body.classList.add('lobby-active');render();}
function hide(){active=false;$('frontLobby').hidden=true;document.body.classList.remove('lobby-active');}
function chooseFaction(i){
 if(!Number.isInteger(i)||i<0||i>=FACTIONS.length)return;
 progress.selectedFaction=i;selectedUnit=0;selectedAction='idle';animationStart=performance.now();stateChange();
}
function chooseSkin(id){const sk=SKINS.find(x=>x.id===id),l=levelFromXP(progress.xp).level;if(!sk||l<sk.level)return false;progress.selectedSkin=id;global.DesertRoster?.refreshChoices?.();stateChange();return true;}
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
 if(!global.DesertDeviceAccount)return;
 try{
  const account=await global.DesertDeviceAccount.identity();uid=account.uid;
  try{const snap=await account.fs.getDoc(account.fs.doc(account.db,'desertProfiles',uid));
   if(snap.exists()){const pref=snap.data();if(pref.name)progress.nickname=safeName(pref.name);
    if(Number.isInteger(pref.faction)&&pref.faction>=0&&pref.faction<FACTIONS.length)progress.selectedFaction=pref.faction;
    if(SKINS.some(x=>x.id===pref.skin&&levelFromXP(progress.xp).level>=x.level))progress.selectedSkin=pref.skin;save();}
  }catch(_){}
  render();info('기기 인증 완료 · 다음 방문에도 이 브라우저에서 자동 접속합니다.');
 }catch(e){render();info('기기 계정으로 플레이할 수 있습니다. 온라인 인증은 연결 후 다시 시도합니다.');}
}
async function deviceLogin(){
 if(authBusy)return;authBusy=true;$('lobbyDeviceLogin').disabled=true;info('이 기기의 인증 정보를 확인하는 중…');
 try{await restoreAccount();if(uid)await syncProfile();}
 finally{authBusy=false;$('lobbyDeviceLogin').disabled=false;}
}
async function copyIds(){
 const a=global.DesertDeviceAccount.status();
 try{await global.navigator.clipboard.writeText('유저 ID: '+a.accountId+'\n기기 ID: '+a.deviceId);info('식별 ID를 복사했습니다. 다른 기기의 로그인 비밀번호로는 사용할 수 없습니다.');}
 catch(_){$('lobbyUserId').select();info('유저 ID가 선택되었습니다. 복사해서 보관할 수 있습니다.');}
}
function prepare(){
 // Drafted commander names are saved when leaving the lobby, without an extra confirmation menu.
 const edited=safeName($('lobbyNickname').value);
 if(progress.nickname!==edited){progress.nickname=edited;save();if(uid)void syncProfile();}
 const button=[...document.querySelectorAll('#factionCards [data-faction]')].find(x=>Number(x.dataset.faction)===progress.selectedFaction);
 if(button)button.click();$('mpFaction').value=String(progress.selectedFaction);$('mpName').value=progress.nickname;
}
function single(){
 if(global.DesertTriNetwork?.current()?.roomId){
  $('lobbyMultiplayerConfig').hidden=false;
  $('mpStatus').textContent='먼저 참여 중인 방에서 나가야 싱글플레이를 시작할 수 있습니다.';
  return;
 }
 document.body.dataset.playMode='solo';prepare();onlineOpen=false;$('lobbyMultiplayerConfig').hidden=true;
 hide();$('startButton').click();
 $('startOverlay').classList.add('hidden');
}
function openMultiplayer(){
 prepare();onlineOpen=true;$('lobbyMultiplayerConfig').hidden=false;
 $('lobbyMultiplayerConfig').scrollIntoView?.({behavior:'smooth',block:'start'});
}
function enterMatch(){
 global.DesertCommandHud?.closeUpgrades?.();document.body.dataset.playMode='multi';
 prepare();onlineOpen=false;
 $('lobbyMultiplayerConfig').hidden=true;
 $('startOverlay').classList.add('hidden');
 hide();
 const tab=document.querySelector('[data-view="multiplayer"]');
 if(tab&&!tab.classList.contains('active'))tab.click();
}
function practiceBattle(){
 enterMatch();
 $('mpPractice').click();
}
async function returnToLobby(){
 // Fully leave the online room or cancel practice before exposing setup again.
 try{await global.DesertTriUI?.leave?.();}catch(e){$('lobbyAuthMessage').textContent='방 종료 오류: '+(e.message||String(e));}
 $('restartButton').click();
 $('startOverlay').classList.add('hidden');$('endOverlay').classList.add('hidden');
 onlineOpen=false;$('lobbyMultiplayerConfig').hidden=true;
 show();
}
function initialize(){
 if(!FACTIONS.length||!$('frontLobby'))return;progress=load();animationStart=performance.now();
 // Reparent original multiplayer room controls, preserving their handlers and IDs.
 // The combat view now holds ONLY battlefield/HUD, never a second setup screen.
 const roomPanel=$('mpLobby'),mount=$('lobbyMultiMount');
 if(roomPanel&&mount){
  mount.append(roomPanel);
  // Race/name are already selected above in the main commander lobby.
  $('mpFaction')?.closest('label')?.setAttribute('hidden','');
  $('mpName')?.closest('label')?.setAttribute('hidden','');
  $('mpPractice').hidden=true;
 }
 $('lobbyUnitGrid').addEventListener('click',e=>{const b=e.target.closest('[data-unit]');if(b)chooseUnit(Number(b.dataset.unit));});
 $('lobbyUnitActions').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)chooseAction(b.dataset.action);});
 $('lobbyCloseMulti').addEventListener('click',()=>{if(global.DesertTriNetwork?.current()?.roomId)return;$('lobbyMultiplayerConfig').hidden=true;onlineOpen=false;});
 global.requestAnimationFrame?.(drawUnitAnimations);
 $('lobbyFactions').addEventListener('click',e=>{const b=e.target.closest('[data-faction]');if(b)chooseFaction(Number(b.dataset.faction));});
 $('lobbySkins').addEventListener('click',e=>{const b=e.target.closest('[data-skin]');if(b)chooseSkin(b.dataset.skin);});
 $('lobbySolo').addEventListener('click',single);
 $('lobbyMulti').addEventListener('click',openMultiplayer);
 $('lobbyPractice').addEventListener('click',practiceBattle);
 $('lobbyDifficulty').addEventListener('click',e=>{const b=e.target.closest('[data-difficulty]');if(b)chooseDifficulty(b.dataset.difficulty);});
 $('backToLobby').addEventListener('click',()=>{void returnToLobby();});
 $('lobbySaveName').addEventListener('click',()=>{progress.nickname=safeName($('lobbyNickname').value);stateChange();});
 $('lobbyDeviceLogin').addEventListener('click',()=>{void deviceLogin();});$('lobbyCopyIds').addEventListener('click',()=>{void copyIds();});
 global.addEventListener?.('maiden-art-ready',renderCovers);global.addEventListener?.('isometric-art-ready',renderCovers);global.addEventListener?.('desert-real-sprites-ready',renderCovers);global.addEventListener?.('desert-moe-ready',renderCovers);
 show();void restoreAccount();
}
global.DesertLobby=Object.freeze({levelFromXP,filterForSkin,skinFilter:()=>currentSkin().filter,selectedSkin:()=>currentSkin().id,selectedFaction:()=>progress.selectedFaction,selectedUnit:()=>selectedUnit,aiDifficulty:()=>progress.aiDifficulty,chooseDifficulty,chooseFaction,chooseSkin,chooseUnit,chooseAction,completeSolo,completeMultiplayer,grantXP,show,hide,enterMatch,openMultiplayer,returnToLobby});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})(window);
