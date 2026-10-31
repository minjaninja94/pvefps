(function(global){'use strict';
const $=id=>document.getElementById(id),FACTIONS=global.DesertRoster?.FACTIONS||[];
const SKINS=[
 {id:'default',name:'기본 제복',level:1,desc:'기본 외형',filter:'none',tone:'#a9d9ce'},
 {id:'moe',name:'모에화 빔',level:1,desc:'SD 외형',filter:'none',tone:'#f4afd5'},
 {id:'twilight',name:'황혼 작전',level:3,desc:'자줏빛 야전 도색',filter:'hue-rotate(55deg) saturate(1.3)',tone:'#ba91f2'},
 {id:'aurora',name:'오로라 특무',level:6,desc:'청록 발광형 전투복',filter:'hue-rotate(145deg) saturate(1.15)',tone:'#8bdff6'},
 {id:'gold',name:'황금 근위',level:10,desc:'레벨 10 해금',filter:'sepia(.62) saturate(1.35) contrast(1.05)',tone:'#e9c47f'},
 {id:'blood-iron',name:'혈철 집행군',faction:0,level:12,desc:'검붉은 기계 처형기사 · 병종별 8포즈',filter:'none',tone:'#df4b50'}
];
const KEY='desert-front-training-v2',empty=()=>({xp:0,wins:0,losses:0,mpWins:0,mpLosses:0,selectedFaction:0,selectedSkin:'default',aiDifficulty:'normal',nickname:'지휘관'});
let progress=empty(),uid=null,active=false,lastMultiplayer='',authBusy=false;
let selectedUnit=0,selectedAction='idle',animationStart=0,animationTick=0,onlineOpen=false,previewSkinId='',previewRole=0,previewAction='idle';
const RULESET_KEY='desert-front-ruleset-v1';
const RULESETS=['standard','augment','prism'];
const AI_LEVELS=['easy','normal','hard','veryhard','impossible'];
const AI_NAMES={easy:'쉬움',normal:'보통',hard:'어려움',veryhard:'아주 어려움',impossible:'임파서블'};
const difficultyLabel=value=>AI_NAMES[value]||AI_NAMES.normal;
const normalizeDifficulty=value=>AI_LEVELS.includes(value)?value:'normal';
let selectedRuleset='standard';
function safeName(v){return String(v||'지휘관').trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,16)||'지휘관';}
function storageKey(){const uid=global.DesertMember?.account?.()?.userId;return uid?'desert-front-training-member-'+uid:KEY;}
function load(){
 try{const v=JSON.parse(localStorage.getItem(storageKey())||'{}');const p=empty();
  p.xp=Math.max(0,Math.min(10000000,Number(v.xp)||0));for(const k of ['wins','losses','mpWins','mpLosses'])p[k]=Math.max(0,Math.min(999999,Math.floor(Number(v[k])||0)));
  p.selectedFaction=Number.isInteger(v.selectedFaction)&&v.selectedFaction>=0&&v.selectedFaction<FACTIONS.length?v.selectedFaction:0;
  p.aiDifficulty=normalizeDifficulty(v.aiDifficulty);
  p.nickname=safeName(v.nickname);p.selectedSkin=SKINS.some(x=>x.id===v.selectedSkin)?v.selectedSkin:'default';return p;
 }catch(_){return empty();}
}
function save(){try{localStorage.setItem(storageKey(),JSON.stringify(progress));}catch(_){}
 global.DesertMember?.saveProgress?.(progress);}
function levelFromXP(xp){let level=1,left=xp;while(level<100&&left>=100+level*70){left-=100+level*70;level++;}return {level,within:left,needed:100+level*70};}
function rank(){const score=progress.mpWins*3+progress.wins*.5;return score>=100?'플래티넘 연습생':score>=55?'골드 연습생':score>=24?'실버 연습생':score>=7?'브론즈 연습생':'훈련병';}
function skinForFaction(s,f){return s.faction===undefined||s.faction===f;}
function skinAssetReady(s){return s.id!=='blood-iron'||global.DesertBloodIronArt?.loadedCount?.()===10;}
function currentSkin(){const lv=levelFromXP(progress.xp).level;return SKINS.find(x=>x.id===progress.selectedSkin&&lv>=x.level&&skinForFaction(x,progress.selectedFaction)&&skinAssetReady(x))||SKINS[0];}
function renderRuleset(){
 const selected=selectedRuleset!=='standard',label=selectedRuleset==='prism'?'프리즘 모드':'증강전';
 const roomActive=!!global.DesertTriNetwork?.current?.()?.roomId;
 const native=$('mpRuleset');
 if(native&&native.value!==selectedRuleset&&!roomActive)native.value=selectedRuleset;
 for(const b of document.querySelectorAll('#lobbyRulesetPicker [data-ruleset]')){
  const active=b.dataset.ruleset===selectedRuleset;
  b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));
  b.disabled=roomActive;
 }
 const description=$('lobbyRulesetDescription');
 if(description)description.textContent=selected
  ?'1·10·20·30·40·50·60·70웨이브에 '+(selectedRuleset==='prism'?'프리즘 증강만 선택합니다.':'증강을 선택합니다.')
   :'핵심 기지 파괴로 승리 · 웨이브 무제한';
 const solo=$('lobbySolo')?.querySelector('span');
 if(solo)solo.textContent=selected?label+' · 웨이브 무제한':difficultyLabel(progress.aiDifficulty)+' AI · 웨이브 무제한';
 const multiplayer=$('lobbyMulti')?.querySelector('span');
 if(multiplayer)multiplayer.textContent=selected?label+' · 1:1 / 3라인 / 협동':'1:1 / 3라인 / 협동';
 const practice=$('lobbyPractice')?.querySelector('span');
 if(practice)practice.textContent=selected?label+' · AI 연습':'AI 연습';
}
function chooseRuleset(value){
 if(!RULESETS.includes(value))return false;
 if(global.DesertTriNetwork?.current?.()?.roomId||$('mpRuleset')?.disabled)return false;
 selectedRuleset=value;
 const select=$('mpRuleset');if(select){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}
 try{global.localStorage.setItem(RULESET_KEY,value);}catch(_){}
 renderRuleset();return true;
}
function restoreRuleset(){
 try{const value=global.localStorage.getItem(RULESET_KEY);selectedRuleset=RULESETS.includes(value)?value:'standard';}catch(_){}
 if($('mpRuleset'))$('mpRuleset').value=selectedRuleset;
 renderRuleset();
}
function syncRulesetFromRoom(value){
 if(!RULESETS.includes(value)){restoreRuleset();return;}
 selectedRuleset=value;
 renderRuleset();
}
function filterForSkin(id){return SKINS.find(x=>x.id===id)?.filter||'none';}
function stateChange(){save();render();if(uid)void syncProfile();}
function updateUnitInfo(){
 const i=progress.selectedFaction,r=selectedUnit,fac=FACTIONS[i],unit=global.DesertRoster?.getDef?.(r,i);
 if(!fac||!unit)return;
 $('lobbyUnitTitle').textContent=fac.units[r]+' · '+unit.name;
 $('lobbyUnitStats').title=unit.tips||'';
 $('lobbyUnitStats').textContent=unit.cost+' CR · HP '+Math.round(unit.hp)+' · 공격 '+Math.round(unit.damage)+' · 치료 '+Math.round(unit.heal||0)+' · 사거리 '+Math.round(unit.range)+' · 속도 '+Math.round(unit.speed)+' · '+(unit.kind==='air'?'비행':unit.name.includes('기병')?'지상 기병':unit.name.includes('차량')?'지상 차량':unit.name.includes('메카')?'지상 메카':'지상')+(unit.airTarget?' · 대공 가능':'');
 $('lobbyUnitAnimBadge').textContent=global.DesertUnitMotion?.ACTIONS.find(a=>a.id===selectedAction)?.label||'대기';
 $('lobbyUnitActions').querySelectorAll('[data-action]').forEach(btn=>btn.classList.toggle('active',btn.dataset.action===selectedAction));
}
function renderUnitGallery(){
 const f=FACTIONS[progress.selectedFaction];
 if(!f||!$('lobbyUnitGrid'))return;
 const R=global.DesertRoster;
 $('lobbyUnitGrid').innerHTML=f.units.map((name,i)=>i===8?'':'<button type="button" class="lobby-unit-card'+(selectedUnit===i?' selected':'')+'" data-unit="'+i+'"><canvas width="72" height="72" data-motion-role="'+i+'" aria-label="'+name+' 이동 애니메이션"></canvas><strong>'+name+'</strong><small>'+(R.getDef?.(i,progress.selectedFaction)?.name||'')+'</small></button>').join('');
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
 if(previewSkinId&&!$('skinPreviewLayer')?.hidden){
  const previewFilter=filterForSkin(previewSkinId),previewSkin=previewSkinId;
  $('skinPreviewUnits')?.querySelectorAll('canvas[data-preview-role]').forEach(c=>{const rr=Number(c.dataset.previewRole),cc=c.getContext('2d');if(!cc)return;cc.clearRect(0,0,72,72);const hasArt=previewSkin!=='blood-iron'||global.DesertBloodIronArt?.frame?.(rr,'move',m.frameAt('move',elapsed));if(hasArt)m.draw(cc,{faction:f,role:rr,action:'move',frame:m.frameAt('move',elapsed),size:72,filter:previewFilter,skin:previewSkin});else{cc.fillStyle='#a6b8c8';cc.font='10px sans-serif';cc.fillText('이미지 대기',9,37);}});
  const big=$('skinPreviewCanvas'),cc=big?.getContext('2d');if(cc){cc.clearRect(0,0,192,192);const hasArt=previewSkin!=='blood-iron'||global.DesertBloodIronArt?.frame?.(previewRole,previewAction,m.frameAt(previewAction,elapsed));if(hasArt)m.draw(cc,{faction:f,role:previewRole,action:previewAction,frame:m.frameAt(previewAction,elapsed),size:188,x:2,y:2,filter:previewFilter,skin:previewSkin});else{cc.fillStyle='#a6b8c8';cc.font='16px sans-serif';cc.fillText('이미지 업로드 대기',20,100);}}
 }
 const large=$('lobbyUnitPreview'),ctx=large?.getContext('2d');
 if(ctx){ctx.clearRect(0,0,192,192);m.draw(ctx,{faction:f,role:selectedUnit,action:selectedAction,frame:m.frameAt(selectedAction,elapsed),size:178,x:7,y:7,filter,skin});}
 // Headquarters canvas is a static cover, not the animated unit preview.
}
function chooseUnit(i){
 if(!Number.isInteger(i)||i<0||i>=11||i===8)return;
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

function closeSkinPreview(){previewSkinId='';const layer=$('skinPreviewLayer');if(layer)layer.hidden=true;}
function openSkinPreview(id){
 const sk=SKINS.find(x=>x.id===id&&skinForFaction(x,progress.selectedFaction));if(!sk)return;
 const layer=$('skinPreviewLayer');if(!layer)return;
 previewSkinId=id;previewRole=0;previewAction='idle';layer.hidden=false;
 $('skinPreviewTitle').textContent=sk.name+' · '+FACTIONS[progress.selectedFaction].name;
 $('skinPreviewUnlock').textContent=levelFromXP(progress.xp).level<sk.level?'잠김 · LV.'+sk.level+' 해금':'선택 가능';
 $('skinPreviewStatus').textContent=id==='blood-iron'?'혈철 집행군 10병종 · 8포즈 · 이미지 '+(global.DesertBloodIronArt?.loadedCount?.()||0)+'/10 로드됨 · 미배포 병종은 표시되지 않습니다.':'유닛별 애니메이션 미리보기';
 const fac=FACTIONS[progress.selectedFaction];
 $('skinPreviewUnits').innerHTML=[0,1,2,3,4,5,6,7,9,10].map((r,i)=>'<button type="button" class="skin-preview-role'+(i===0?' selected':'')+'" data-preview-select="'+r+'"><canvas width="72" height="72" data-preview-role="'+r+'"></canvas><small>'+(fac.units[r]||global.DesertRoster?.getDef?.(r,progress.selectedFaction)?.name||['돌격','사격','대장갑','장갑','대공','공성','특수','지원','저격','암살'][i])+'</small></button>').join('');
 $('skinPreviewActions').innerHTML=(global.DesertUnitMotion?.ACTIONS||[]).map(a=>'<button type="button" data-preview-action="'+a.id+'"'+(a.id===previewAction?' class="selected"':'')+'>'+a.label+'</button>').join('');
 if(id==='blood-iron')global.DesertBloodIronArt?.preload?.();
}
function mountSkinPreview(){
 if($('skinPreviewLayer'))return;
 const layer=document.createElement('div');layer.id='skinPreviewLayer';layer.className='skin-preview-layer';layer.hidden=true;
 layer.innerHTML='<section class="skin-preview-panel" role="dialog" aria-modal="true" aria-labelledby="skinPreviewTitle" tabindex="-1"><header><div><h2 id="skinPreviewTitle">스킨 미리보기</h2><small id="skinPreviewUnlock"></small></div><button type="button" id="skinPreviewClose">✕ 닫기</button></header><p id="skinPreviewStatus" role="status"></p><div class="skin-preview-body"><div id="skinPreviewUnits" class="skin-preview-roles"></div><div class="skin-preview-detail"><canvas id="skinPreviewCanvas" width="192" height="192"></canvas><div id="skinPreviewActions" class="skin-preview-actions"></div></div></div></section>';
 $('frontLobby').appendChild(layer);
 layer.addEventListener('click',e=>{if(e.target===layer||e.target.closest('#skinPreviewClose'))closeSkinPreview();
  const role=e.target.closest('[data-preview-select]');if(role){previewRole=Number(role.dataset.previewSelect);layer.querySelectorAll('[data-preview-select]').forEach(b=>b.classList.toggle('selected',b===role));}
  const action=e.target.closest('[data-preview-action]');if(action){previewAction=action.dataset.previewAction;layer.querySelectorAll('[data-preview-action]').forEach(b=>b.classList.toggle('selected',b===action));}
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&previewSkinId){closeSkinPreview();}});
 global.addEventListener?.('desert-blood-iron-ready',()=>{if(previewSkinId==='blood-iron'){const n=global.DesertBloodIronArt?.loadedCount?.()||0;$('skinPreviewStatus').textContent=n===10?'10병종 이미지 로드 완료 · 움직임 확인 가능':'혈철 집행군 이미지 '+n+'/10 · 미배포 병종은 표시되지 않습니다.';if(n===10)render();}});
}
function chooseDifficulty(value){if(!AI_LEVELS.includes(value))return;progress.aiDifficulty=value;save();render();}
function render(){
 if(!FACTIONS.length)return;
 const fac=FACTIONS[progress.selectedFaction]||FACTIONS[0],l=levelFromXP(progress.xp),s=currentSkin();
 $('lobbyDifficulty')?.querySelectorAll('[data-difficulty]').forEach(b=>{const chosen=b.dataset.difficulty===progress.aiDifficulty;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));});
 $('lobbySolo').querySelector('span').textContent=difficultyLabel(progress.aiDifficulty)+' AI · 웨이브 무제한';
 renderRuleset();
 const account=global.DesertDeviceAccount?.status?.();
 $('lobbyAccountStatus').textContent=global.DesertMember?.account?.()?('회원 · '+global.DesertMember.account().nickname):'게스트 · 이 기기';
 if(account){$('lobbyUserId').value=account.accountId;$('lobbyDeviceId').value=account.deviceId;}
 $('lobbyLevel').textContent='LV. '+l.level;$('lobbyXP').textContent=l.within+' / '+l.needed+' XP';$('lobbyXPFill').style.width=Math.min(100,l.within/l.needed*100)+'%';
 $('lobbyRank').textContent=global.DesertCareer?.tier?.(global.DesertCareer?.rating?.()||1000)||'브론즈';
 $('lobbyRecord').textContent='싱글 '+progress.wins+'승 '+progress.losses+'패 · 온라인 '+progress.mpWins+'승 '+progress.mpLosses+'패';
 global.DesertCareer?.render?.();
 $('lobbyNickname').value=progress.nickname;
 $('lobbyFactionName').textContent=fac.name;$('lobbyFactionTrait').textContent=fac.bonus;

 $('lobbyFactions').innerHTML=FACTIONS.map((f,i)=>'<button class="lobby-faction'+(i===progress.selectedFaction?' selected':'')+'" data-faction="'+i+'" style="--fac:'+f.color+'"><span class="lobby-icon">'+f.logo+'</span><canvas width="160" height="114" data-cover="'+i+'" aria-label="'+f.name+' 사령부와 대표 병력"></canvas><strong>'+f.name+'</strong><small>'+f.tag+'</small></button>').join('');
 $('lobbySkins').innerHTML=SKINS.filter(x=>skinForFaction(x,progress.selectedFaction)).map(x=>'<div class="lobby-skin-item" style="--skin:'+x.tone+'"><button type="button" class="lobby-skin'+(s.id===x.id?' selected':'')+'" data-skin="'+x.id+'" '+(l.level<x.level||!skinAssetReady(x)?'disabled':'')+'><span class="skin-swatch">✦</span><strong>'+x.name+'</strong><small>'+(l.level<x.level?'LV.'+x.level+' 해금':!skinAssetReady(x)?'이미지 배포 대기':x.desc)+'</small></button><button type="button" class="lobby-skin-preview-open" data-preview-skin="'+x.id+'">스킨 확인해보기</button></div>').join('');
 $('lobbySkinMessage').textContent=s.name+' 선택 · 게임 능력치는 변경되지 않습니다.';
 renderUnitGallery();
 renderCovers();
 $('mpFaction').value=String(progress.selectedFaction);$('mpName').value=progress.nickname;
}
function show(){global.DesertCommandHud?.closeUpgrades?.();delete document.body.dataset.playMode;active=true;$('frontLobby').hidden=false;document.body.classList.add('lobby-active');global.DesertLobbyMusic?.enterLobby?.();render();}
function hide(){closeSkinPreview();active=false;$('frontLobby').hidden=true;document.body.classList.remove('lobby-active');global.DesertLobbyMusic?.exitLobby?.();}
function chooseFaction(i){
 if(!Number.isInteger(i)||i<0||i>=FACTIONS.length)return;
 progress.selectedFaction=i;if(!SKINS.some(x=>x.id===progress.selectedSkin&&skinForFaction(x,i)))progress.selectedSkin='default';closeSkinPreview();selectedUnit=0;selectedAction='idle';animationStart=performance.now();stateChange();
}
function chooseSkin(id){const sk=SKINS.find(x=>x.id===id),l=levelFromXP(progress.xp).level;if(!sk||l<sk.level||!skinForFaction(sk,progress.selectedFaction)||!skinAssetReady(sk))return false;progress.selectedSkin=id;global.DesertRoster?.refreshChoices?.();stateChange();return true;}
function exportProgress(){return {...progress};}
function importProgress(v){if(!v||typeof v!=='object')return;const next=empty();
 next.xp=Math.max(0,Math.min(10000000,Number(v.xp)||0));
 for(const key of ['wins','losses','mpWins','mpLosses'])next[key]=Math.max(0,Math.floor(Number(v[key])||0));
 next.nickname=safeName(v.nickname);
 next.selectedFaction=Number.isInteger(v.selectedFaction)&&v.selectedFaction>=0&&v.selectedFaction<FACTIONS.length?v.selectedFaction:0;
 next.selectedSkin=SKINS.some(sk=>sk.id===v.selectedSkin)?v.selectedSkin:'default';
 next.aiDifficulty=normalizeDifficulty(v.aiDifficulty);progress=next;save();render();}
function useGuestProfile(){progress=load();render();}
function grantXP(amount){progress.xp=Math.min(10000000,progress.xp+Math.max(0,Math.floor(amount)));stateChange();}
function completeSolo({win,wave,seconds}){if(win)progress.wins++;else progress.losses++;global.DesertCareer?.record?.({mode:'solo',size:1,side:0,winner:win?0:1,faction:progress.selectedFaction,wave,seconds,online:false});grantXP((win?120:45)+Math.min(80,Math.floor((wave||0)*3)));}
function completeMultiplayer({winner,side,matchId,mode='pvp',size=1,wave=0,seconds=0,faction=progress.selectedFaction}){if(!matchId||lastMultiplayer===matchId)return;lastMultiplayer=matchId;if(winner===side)progress.mpWins++;else if(winner!==null)progress.mpLosses++;global.DesertCareer?.record?.({mode,size,side,winner,faction,wave,seconds,online:mode==='pvp'||mode==='classic'});grantXP(winner===side?165:75);}
function info(msg){$('lobbyAuthMessage').textContent=msg;}
async function syncProfile(){
 if(!uid||!global.IronFirebase)return;
 try{const {db,fs}=await global.IronFirebase.ready();await fs.setDoc(fs.doc(db,'desertProfiles',uid),
 {name:progress.nickname,faction:progress.selectedFaction,skin:currentSkin().id},{merge:true});
 info('프로필 저장 완료');
 }catch(e){info('프로필 저장 실패: '+(global.IronFirebase.message?.(e)||e.message));}
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
let soloAugLoadPending=false;
function single(){
 if(global.DesertTriNetwork?.current()?.roomId){
  $('lobbyMultiplayerConfig').hidden=false;
  $('mpStatus').textContent='먼저 참여 중인 방에서 나가야 싱글플레이를 시작할 수 있습니다.';
  return;
 }
 if(selectedRuleset!=='standard'&&!global.DesertAugments?.ready?.()){
  if(soloAugLoadPending)return;
  if(!global.DesertAugments?.load){$('lobbyRulesetDescription').textContent='증강전을 시작할 수 없습니다. 카드를 불러오는 스크립트를 확인하세요.';return;}
  soloAugLoadPending=true;$('lobbySolo').disabled=true;
  $('lobbyRulesetDescription').textContent='증강 카드를 불러오는 중…';
  void global.DesertAugments.load().then(()=>{
   soloAugLoadPending=false;$('lobbySolo').disabled=false;
   single();
  }).catch(e=>{
   soloAugLoadPending=false;$('lobbySolo').disabled=false;
   $('lobbyRulesetDescription').textContent='증강 데이터 오류: '+(e?.message||String(e))+' · 다시 출격을 눌러주세요.';
  });
  return;
 }
 document.body.dataset.playMode='solo';prepare();setMultiplayerExpanded(false);
 hide();$('startButton').click();
 $('startOverlay').classList.add('hidden');
}
function setMultiplayerExpanded(open){
 onlineOpen=!!open;$('lobbyMultiplayerConfig').hidden=!onlineOpen;
 $('lobbyMulti').setAttribute('aria-expanded',String(onlineOpen));
 $('lobbyMulti').classList.toggle('expanded',onlineOpen);
}
function openMultiplayer(){
 prepare();renderRuleset();
 if(onlineOpen&&!global.DesertTriNetwork?.current()?.roomId){setMultiplayerExpanded(false);return;}
 setMultiplayerExpanded(true);
 $('lobbyMultiplayerConfig').scrollIntoView?.({behavior:'smooth',block:'nearest'});
}
function enterMatch(){
 global.DesertCommandHud?.closeUpgrades?.();document.body.dataset.playMode='multi';
 prepare();setMultiplayerExpanded(false);
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
 setMultiplayerExpanded(false);
 show();
}
function initialize(){
 if(!FACTIONS.length||!$('frontLobby'))return;progress=load();animationStart=performance.now();mountSkinPreview();
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
 $('lobbyCloseMulti').addEventListener('click',()=>{if(global.DesertTriNetwork?.current()?.roomId)return;setMultiplayerExpanded(false);});
 global.requestAnimationFrame?.(drawUnitAnimations);
 $('lobbyFactions').addEventListener('click',e=>{const b=e.target.closest('[data-faction]');if(b)chooseFaction(Number(b.dataset.faction));});
 $('lobbySkins').addEventListener('click',e=>{const p=e.target.closest('[data-preview-skin]');if(p){openSkinPreview(p.dataset.previewSkin);return;}const b=e.target.closest('[data-skin]');if(b)chooseSkin(b.dataset.skin);});
 $('lobbySolo').addEventListener('click',single);
 $('lobbyMulti').addEventListener('click',openMultiplayer);
 $('lobbyRulesetPicker')?.addEventListener('click',e=>{
  const button=e.target.closest('[data-ruleset]');
  if(button)chooseRuleset(button.dataset.ruleset);
 });
 $('mpRuleset')?.addEventListener('change',()=>{
  if(global.DesertTriNetwork?.current?.()?.roomId)return;
  const value=$('mpRuleset').value;if(RULESETS.includes(value)){
   selectedRuleset=value;try{global.localStorage.setItem(RULESET_KEY,value);}catch(_){}renderRuleset();
  }
 });
 restoreRuleset();
 $('lobbyPractice').addEventListener('click',practiceBattle);
 $('lobbyDifficulty').addEventListener('click',e=>{const b=e.target.closest('[data-difficulty]');if(b)chooseDifficulty(b.dataset.difficulty);});
 $('backToLobby').addEventListener('click',()=>{void returnToLobby();});
 $('lobbySaveName').addEventListener('click',()=>{progress.nickname=safeName($('lobbyNickname').value);stateChange();});
 $('lobbyDeviceLogin').addEventListener('click',()=>{void deviceLogin();});$('lobbyCopyIds').addEventListener('click',()=>{void copyIds();});
 global.addEventListener?.('maiden-art-ready',renderCovers);global.addEventListener?.('isometric-art-ready',renderCovers);global.addEventListener?.('desert-real-sprites-ready',renderCovers);global.addEventListener?.('desert-moe-ready',renderCovers);
 show();void restoreAccount().finally(()=>global.DesertMember?.restore?.());
}
global.DesertLobby=Object.freeze({exportProgress,importProgress,useGuestProfile,careerStats:()=>({nickname:progress.nickname,level:levelFromXP(progress.xp).level,mpWins:progress.mpWins,mpLosses:progress.mpLosses,faction:progress.selectedFaction}),levelFromXP,filterForSkin,skinFilter:()=>currentSkin().filter,selectedSkin:()=>currentSkin().id,selectedFaction:()=>progress.selectedFaction,selectedUnit:()=>selectedUnit,aiDifficulty:()=>progress.aiDifficulty,difficultyLabel,chooseDifficulty,chooseFaction,chooseSkin,chooseUnit,chooseAction,completeSolo,completeMultiplayer,grantXP,show,hide,enterMatch,openMultiplayer,returnToLobby,syncRulesetFromRoom,selectedRuleset:()=>selectedRuleset});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})(window);
