/* Desert Front 3-line interface: lobby, live commander UI and pixel battlefield. */
(function(global){
'use strict';
const $=id=>document.getElementById(id);
const NET=global.DesertTriNetwork,E=global.DesertTriEngine;
if(!NET||!E)return;
let snap=null,lane=0,role=0,demolish=false,practice=null,practiceTimer=null;
let myId='',lobby=null,host=false,gridKey='',cardsKey='',lastSnapshotAt=0,lastDrawAt=0;
const LANES=['상단','중앙','하단'],ICONS=['⚔','⌖','◆','▣','✣','✹','♞','✚'];
function message(msg){$('mpStatus').textContent=msg;}
function faction(){return Number($('mpFaction').value)||0;}
function skin(){return global.DesertLobby?.selectedSkin?.()||'default';}
function my(){return snap?.players?.find(p=>p.uid===myId);}
function countNeeded(r){return r.size*(r.mode==='coop'?1:2);}
function fullReady(r){const p=Object.values(r.players||{});return p.length===countNeeded(r)&&p.every(x=>x.ready)&& (r.mode==='coop'?p.every(x=>x.team===0):[0,1].every(t=>p.filter(x=>x.team===t).length===r.size));}
function uiButtons(){
 const r=lobby?.room,me=r?.players?.[myId];
 $('mpReady').disabled=!me||r?.status!=='lobby';
 $('mpReady').textContent=me?.ready?'준비 취소':'준비하기';
 $('mpLaunch').disabled=!host||!r||r.status!=='lobby'||!fullReady(r);
 $('mpLeave').disabled=!r&&!practice;
 $('mpCreate').disabled=!!r||!!practice;$('mpJoin').disabled=!!r||!!practice;
 $('mpPractice').disabled=!!r||!!practice;
 $('mpMode').disabled=!!r;$('mpSize').disabled=!!r;
 if(lobby?.id)$('mpRoomCode').value=lobby.id;
}
function onRoom(v){
 lobby=v;myId=v?.uid||myId;host=!!v?.host;
 $('mpStateTag').textContent=v?v.room.status==='playing'?'전투 중':'대기실':'연결 전';
 const out=$('mpMembers');out.replaceChildren();
 if(!v)out.textContent='방이 없습니다.';
 else for(const [id,p] of Object.entries(v.room.players||{})){
  const d=document.createElement('span');d.className='mp-member'+(p.ready?' ready':'');
  d.textContent=(p.team===0?'청록':'주황')+' · '+p.name+' · '+(global.DesertRoster?.FACTIONS[p.faction]?.name||'진영')+' · '+(p.ready?'준비':'대기')+(id===v.room.host?' · 방장':'');
  out.append(d);
 }
 uiButtons();
}
function unitIcon(canvas,f,r,size=72){
 if(r===8){const g=canvas.getContext('2d');if(!g)return;g.clearRect(0,0,size,size);if(global.DesertResourceArt?.draw?.(g,0,0,size))return;g.fillStyle='#efcd80';g.font='bold '+Math.floor(size*.60)+'px sans-serif';g.textAlign='center';g.fillText('⬡',size/2,size*.74);return;}
 const g=canvas.getContext('2d');if(!g)return;g.clearRect(0,0,size,size);
 global.DesertUnitMotion?.draw(g,{faction:f,role:r,action:'idle',frame:0,size,skin:skin()});
}
function unitCards(){
 const me=my(),fac=me?.faction??faction(),key=fac+':'+role+':'+skin()+':'+(me?.eco||0)+':'+((me?.ecoReadyAt||0)>(snap?.seconds||0))+':'+Math.floor((snap?.seconds||0)/120);
 if(cardsKey!==key){cardsKey=key;const out=$('mpUnitCards');out.replaceChildren();
 for(let i=0;i<9;i++){
  const d=i===8?null:global.DesertRoster?.getDef(i,fac),b=document.createElement('button');b.type='button';b.dataset.role=i;b.className='mp-unit-card'+(role===i?' active':'');b.setAttribute('aria-pressed',String(role===i));
  const cv=document.createElement('canvas');cv.width=cv.height=72;unitIcon(cv,fac,i);
  const name=document.createElement('strong');name.textContent=i===8?'자원채취 건물':global.DesertRoster?.FACTIONS[fac]?.units[i]||E.NAMES[i];
  const cost=document.createElement('small');cost.textContent=(i===8?E.ecoPrice(me?.eco||0):E.COST[i])+' CR · '+(i===8?'슬롯 1칸':d?.kind==='air'?'비행':'지상');
  if(i===8)b.disabled=(me?.eco||0)>=7||(me?.ecoReadyAt||0)>(snap?.seconds||0);
  b.append(cv,name,cost);out.append(b);
 }
 const d=role===8?null:global.DesertRoster?.getDef(role,fac);
 $('mpUnitDetails').textContent=(role===8?'자원채취: 인컴 +1 CR / 0.5초. 건설 직후 '+E.ecoStabilize((me?.eco||0)+1,snap?.seconds||0)+'초간 기본·추가 인컴과 웨이브 지원금 중단. 최대 7개.':d?.tips||'')+' · 단축키 1–8 · 유닛 선택 후 빈 슬롯 터치';
 }
 $('mpUnitCards').querySelectorAll('[data-role]').forEach(b=>b.classList.toggle('unaffordable',!!me&&me.cash<(Number(b.dataset.role)===8?E.ecoPrice(me.eco):E.COST[Number(b.dataset.role)])));
}
function buildGrid(){
 const p=my();if(!p)return;
 $('mpSelectedLane').textContent=LANES[lane]+' 라인';
 const cells=p.buildings[lane]||[];
 const key=myId+':'+lane+':'+demolish+':'+cells.join(',');
 if(key===gridKey)return;gridKey=key;
 const f=document.createDocumentFragment();
 for(let i=0;i<E.SLOTS;i++){
  const r=cells[i],b=document.createElement('button');b.type='button';b.dataset.slot=String(i);
  b.disabled=r!==null&&!demolish;
  b.className=(r===null?'':'filled ')+(demolish&&r!==null?'demolish':'');
  if(r===null)b.textContent='+';else{const cv=document.createElement('canvas');cv.width=cv.height=72;unitIcon(cv,p.faction,r);b.append(cv);}
  b.setAttribute('aria-label',(r===null?'빈 슬롯':global.DesertRoster?.FACTIONS[p.faction]?.units[r]||E.NAMES[r])+' '+(i+1));
  b.setAttribute('aria-pressed',String(demolish&&r!==null));
  b.title=(r===null?'빈 자리':E.NAMES[r]+' 생산 시설')+' · '+LANES[lane]+' 라인 '+(i+1);
  f.append(b);
 }
 $('mpBuildGrid').replaceChildren(f);
}
function draw(){
 if(!snap)return;
 const ctx=$('mpBattleCanvas').getContext('2d');if(!ctx)return;
 const W=1100,H=660,iso=global.IsoWorld;
 const wy=y=>y/1560*H;
 ctx.clearRect(0,0,W,H);
 const bg=ctx.createLinearGradient(0,0,0,H);
 bg.addColorStop(0,'#263e42');bg.addColorStop(.48,'#233943');bg.addColorStop(1,'#142e3b');
 ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 if(iso?.terrain)iso.terrain(ctx,W,H,false,my()?.faction??faction());
 for(let l=0;l<3;l++){
  const y=wy(l*520),cy=wy((l+.5)*520);
  ctx.strokeStyle=l===lane?'#d3aa7150':'#8faaa626';
  if(l){ctx.setLineDash([8,12]);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();ctx.setLineDash([]);}
  ctx.font='700 11px monospace';ctx.fillStyle='#b2c7c5a9';ctx.textAlign='left';ctx.fillText(LANES[l]+' 생산 구역',12,y+15);
  for(let side=0;side<2;side++){
   const coreX=side===0?24:1076,towerX=side===0?69:1031;
   const hp=snap.cores[l][side]||0,thp=snap.turrets?.[l]?.[side]||0;
   ctx.fillStyle=side===0?'#80d5d4':'#e19580';ctx.fillRect(coreX-11,cy-21,22,42);
   ctx.fillStyle=side===0?'#3a9792':'#a86658';ctx.fillRect(towerX-8,cy-16,16,32);
   ctx.fillStyle='#0a1b28';ctx.fillRect(coreX-12,cy-29,24,5);ctx.fillRect(towerX-10,cy-23,20,4);
   ctx.fillStyle='#fbd293';ctx.fillRect(coreX-12,cy-29,24*hp/2500,5);ctx.fillRect(towerX-10,cy-23,20*thp/1250,4);
  }
 }
 // Every faction shares a single global depth order, including fighters from other spawn lanes.
 const units=[...snap.units].sort((a,b)=>a.y-b.y);
 for(const u of units){
  const x=u.x/3,y=wy(u.y);
  if(x<-30||x>1130)continue;
  ctx.fillStyle=u.team===0?'#4aa5b088':'#da826b88';
  ctx.beginPath();ctx.ellipse(x,y+3,12,4,0,0,Math.PI*2);ctx.fill();
  if(u.isHatchling){ctx.strokeStyle='#b5f79a';ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(x,y+3,8,3,0,0,Math.PI*2);ctx.stroke();}
  if(u.conscripted){ctx.strokeStyle='#ffd675';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+6,13,5,0,0,Math.PI*2);ctx.stroke();}
  const phase=Math.floor((performance.now()-lastSnapshotAt)/84);
  const frame=u.act==='death'?Math.min(15,(u.frame||0)+phase):((u.frame||0)+phase)%16;
  const baseAction=['idle','move','attack','siege','death'].includes(u.act)?u.act:'move';
  const sprite=iso?.frame(u.faction,u.role,baseAction,frame),d=(u.role===3||u.role===6?53:46)*(u.isHatchling?.55:1)*(u.heroCount===20?2:1);
  if(u.heroCount===20){global.DesertConsolidation?.aura(ctx,x,y,d,performance.now()/1000);ctx.fillStyle='#ff7687';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('★ ×20',x,y-d*.95);}
  if(sprite){
   ctx.imageSmoothingEnabled=false;
   const filter=global.DesertLobby?.filterForSkin?.(u.skin)||'none';
   ctx.save();ctx.translate(x,y);if(u.team===1)ctx.scale(-1,1);
   if(global.DesertUnitMotion)global.DesertUnitMotion.draw(ctx,{faction:u.faction,role:u.role,action:u.act||'move',frame,x:-d/2,y:-d*.84,size:d,filter,skin:u.skin||'default',isHatchling:!!u.isHatchling});
   else{ctx.filter=filter;ctx.drawImage(sprite,-d/2,-d*.84,d,d);}
   ctx.restore();
  }
  else{ctx.fillStyle=u.team===0?'#a5ece7':'#ef9e8a';ctx.fillRect(x-5,y-9,10,14);}
  ctx.fillStyle='#081c25';ctx.fillRect(x-12,y-d*.9,24,3);
  ctx.fillStyle=u.team===0?'#75ddd6':'#f59479';ctx.fillRect(x-12,y-d*.9,24*Math.max(0,u.hp/u.maxHP),3);
  if(u.act==='attack'){
   ctx.strokeStyle=u.team===0?'#80e3d55e':'#f5a4885e';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.ellipse(x,y,18,11,0,0,Math.PI*2);ctx.stroke();
  }
 }
 for(const e of snap.effects||[]){
  ctx.strokeStyle=e.kind==='tower'?'#fff0ac':e.kind==='conscript'?'#ffcf55':e.kind==='ginppai'?'#91e2b6':'#f6dba8';
  ctx.lineWidth=e.kind==='tower'?3:2;ctx.beginPath();ctx.ellipse(e.x/3,wy(e.y),e.kind==='huanglong'?28:13,e.kind==='huanglong'?15:6,0,0,Math.PI*2);ctx.stroke();
  const label={ginppai:'긴빠이 +CR',conscript:'자진입대!',huanglong:'황룡 · 해병수육!',bongo:'오도봉고 돌진!',broodling:'공생충 출생!',pollen:'꽃가루 치유',ink:'먹물 침식!'}[e.kind];
  if(label){ctx.fillStyle=e.kind==='huanglong'?'#ffe69b':'#ffe0b0';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(label,e.x/3,wy(e.y)-23);}
 }
 if(snap.fog?.length){
  for(let l=0;l<3;l++)if(snap.fog[l]){
   const x=snap.viewerTeam===0?(3300-770)/3:0,top=wy(l*520),hh=wy(520);
   ctx.fillStyle='#091720ed';ctx.fillRect(x,top,770/3,hh);
   ctx.font='700 11px monospace';ctx.fillStyle='#bad1d2';ctx.textAlign='center';
   ctx.fillText('정찰 전',x+770/6,top+hh/2);
  }
 }
 ctx.strokeStyle='#e2c38b88';ctx.lineWidth=1.2;
 ctx.strokeRect(1,1,W-2,H-2);
}
function drawOverview(){
 if(!snap)return;
 const cv=$('mpOverviewCanvas'),g=cv.getContext('2d');if(!g)return;
 g.fillStyle='#0b1b23';g.fillRect(0,0,1100,96);
 for(let l=0;l<3;l++){
  const y=3+l*31,p=snap.lanePressure[l]??.5;
  g.fillStyle=l===lane?'#314748':'#20303a';g.fillRect(0,y,1100,29);
  g.fillStyle='#86deda';g.fillRect(0,y+22,1100*p,5);
  g.fillStyle='#e28c77';g.fillRect(1100*p,y+22,1100*(1-p),5);
  g.font='bold 12px monospace';g.textAlign='left';g.fillStyle='#f5e2c7';
  g.fillText((l===lane?'▶ ':'')+LANES[l]+' 전선',13,y+16);
  for(const u of snap.units)if(u.lane===l){
   g.fillStyle=u.team===0?'#86dedc':'#f5a28a';g.fillRect(u.x/3,y+8,3,9);
  }
  if(snap.fog?.[l]){g.fillStyle='#071521e9';g.fillRect(snap.viewerTeam===0?1100-770/3:0,y,770/3,29);}
  if(l===lane){g.strokeStyle='#efcc9d';g.strokeRect(1,y+1,1098,28);}
 }
}
function onSnapshot(v){
 if(!v){snap=null;return;}if(v.width!==3300||v.height!==1560||!Array.isArray(v.players))return;
 if(!$('frontLobby').hidden)global.DesertLobby?.enterMatch?.();
 snap=v;lastSnapshotAt=performance.now();$('mpCommand').hidden=false;
 const me=my(),side=me?.team??0;
 if(me){
  $('mpMyResources').textContent=me.cash+' CR';
  const remaining=Math.max(0,(me.ecoReadyAt||0)-v.seconds);
  $('mpMyIncome').textContent=remaining>0?'인컴 중단 '+Math.ceil(remaining)+'초':'+'+(1+me.eco)+' / 0.5초';
  $('mpBuiltCount').textContent=me.buildings.reduce((n,bs)=>n+bs.filter(x=>x!==null).length,0)+'개 건설';
  const cost=E.ecoPrice(me.eco);
  $('mpEco').textContent=me.eco>=7?'채취 건물 7 / 7':'자원채취 건물 · '+cost+' CR';
  $('mpEco').disabled=me.eco>=7||me.cash<cost||remaining>0||v.ended;
 }
 $('mpWave').textContent='WAVE '+String(v.wave).padStart(2,'0');
 $('mpCountdown').textContent=Math.max(0,v.next).toFixed(1)+'초';
 const traitHud=$('mpFactionTraits');
 if(traitHud){const myTrait=(v.factionTraits||[]).find(x=>x.uid===myId),faction=global.DesertRoster?.FACTIONS?.[me?.faction];
  traitHud.hidden=!faction||me?.faction===3;
  if(faction&&me?.faction!==3)traitHud.textContent='◆ '+faction.name+' | '+faction.bonus+(myTrait&&myTrait.faction===1?' · 공생충 '+myTrait.births+'/10 · 누적 '+myTrait.totalBirths+'기':'');}
 const marineHud=$('mpMarineAbilities');
 if(marineHud){const info=(v.marineOps||[]).find(o=>o.uid===myId);marineHud.hidden=!info;
  if(info)marineHud.textContent='★ 해병 특성 | 긴빠이 '+info.loot+'회 (+'+info.lootedCR+' CR) | 자진입대 '+info.recruits+'회 · 이번 웨이브 '+info.waveRecruits+'/2 | 황룡 '+info.huangSpawns+'기 | 오도봉고 '+info.bongoCharges+'회';}
 const f=document.createDocumentFragment();
 for(let l=0;l<3;l++){
  const status=side===0?v.lanePressure[l]:1-v.lanePressure[l];
  const el=document.createElement('div');el.className=status<.42?'under-pressure':status>.58?'pushing':'';
  el.textContent=LANES[l]+' · '+(status<.42?'열세':status>.58?'우세':'교착')+' / 아군 '+Math.ceil(v.cores[l][side])+' · 적군 '+Math.ceil(v.cores[l][1-side]);
  f.append(el);
 }
 $('mpLaneSummary').replaceChildren(f);
 if(v.ended){$('mpStateTag').textContent=v.winner===null?'무승부':v.winner===side?'승리':'패배';if(!practice)global.DesertLobby?.completeMultiplayer?.({winner:v.winner,side,matchId:lobby?.id||'unknown'});}
 unitCards();buildGrid();drawOverview();
}
function order(cmd){
 if(!snap||snap.ended)return message('진행 중인 경기가 없습니다.');
 if(cmd.type==='build'&&cmd.role!==null){
  const me=my();if(me&&me.buildings[cmd.lane][cmd.slot]!==null){message('이미 생산시설이 있습니다. 먼저 철거해야 다른 건물을 지을 수 있습니다.');return;}
 }
 const r=practice?practice.order(myId,cmd):NET.sendOrder(cmd);
 if(!r?.ok)message(r?.reason||'명령 실패');
 else if(practice)onSnapshot(practice.snapshot('local'));
 else message('명령 전달 완료 · 호스트 판정 대기');
}
function practiceStart(){
 if(lobby)return message('온라인 방에서 나간 뒤 연습할 수 있습니다.');
 myId='local';
 const hard=global.DesertLobby?.aiDifficulty?.()==='hard';
 practice=E.create({mode:'pvp',size:1,aiDifficulty:hard?'hard':'normal',members:[{uid:'local',name:'연습 지휘관',team:0,faction:faction(),skin:skin()},{uid:'AI_local',name:'적 AI',team:1,faction:(faction()+1)%10,bot:true}]});
 if(!hard){practice.state.players[1].buildings[1][1]=0;practice.state.players[1].buildings[1][17]=1;practice.state.players[1].cash-=160;}
 $('mpStateTag').textContent=hard?'하드 AI 연습':'오프라인 연습';message('3라인 오프라인 연습 · Firebase 연결 없이 작동합니다.');
 let last=performance.now();
 practiceTimer=setInterval(()=>{const now=performance.now();practice.tick(Math.min(.16,(now-last)/1000));last=now;onSnapshot(practice.snapshot('local'));},100);
 onSnapshot(practice.snapshot('local'));uiButtons();
}
async function leave(){
 if(practice){clearInterval(practiceTimer);practiceTimer=null;practice=null;myId='';snap=null;$('mpCommand').hidden=true;$('mpStateTag').textContent='연결 전';message('연습 종료');}
 else{await NET.leave();snap=null;$('mpCommand').hidden=true;}
 uiButtons();
}
function runClick(fn){return ()=>Promise.resolve().then(fn).catch(e=>message(global.IronFirebase?.message?.(e)||e.message||String(e)));}
function init(){
 $('mpLaneTabs').querySelectorAll('[data-lane]').forEach(b=>b.addEventListener('click',()=>pickLane(Number(b.dataset.lane))));
 function pickLane(id){
  lane=id;$('mpLaneTabs').querySelectorAll('[data-lane]').forEach(b=>b.classList.toggle('active',Number(b.dataset.lane)===lane));
  gridKey='';buildGrid();draw();drawOverview();
  // Lane tabs now pick a building deployment band without moving the world camera.
 }
 $('mpOverviewCanvas').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();pickLane(Math.min(2,Math.max(0,Math.floor((e.clientY-r.top)/r.height*3))));});
 $('mpBattleCanvas').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();pickLane(Math.min(2,Math.max(0,Math.floor((e.clientY-r.top)/r.height*3))));});
 $('mpUnitCards').addEventListener('click',e=>{const b=e.target.closest('[data-role]');if(!b)return;role=Number(b.dataset.role);demolish=false;gridKey='';unitCards();buildGrid();});
 $('mpExitBattle').addEventListener('click',()=>global.DesertLobby?.returnToLobby?.());
 document.addEventListener('keydown',e=>{if(document.body.dataset.playMode!=='multi'||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(/^[1-8]$/.test(e.key)){role=Number(e.key)-1;demolish=false;cardsKey='';unitCards();}if(e.key==='Escape'){demolish=false;gridKey='';buildGrid();}});
 global.addEventListener?.('desert-real-sprites-ready',()=>{cardsKey='';gridKey='';if(snap){unitCards();buildGrid();}});
 $('mpDemolish').addEventListener('click',()=>{demolish=!demolish;gridKey='';buildGrid();});
 $('mpBuildGrid').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b)order({type:'build',lane,slot:Number(b.dataset.slot),role:demolish?null:role});});
 $('mpEco').addEventListener('click',()=>{role=8;demolish=false;cardsKey='';unitCards();$('mpUnitCards').scrollIntoView?.({block:'nearest',behavior:'smooth'});});
 $('mpMode').addEventListener('change',()=>{
  const coop=$('mpMode').value==='coop';$('mpSize').querySelector('option[value="1"]').disabled=coop;
  if(coop&&$('mpSize').value==='1')$('mpSize').value='2';
  $('mpTeam').disabled=coop;if(coop)$('mpTeam').value='0';
 });
 $('mpPractice').addEventListener('click',practiceStart);
 $('mpCreate').addEventListener('click',runClick(async()=>{
  message('Firebase 방을 생성합니다…');
  await NET.create({mode:$('mpMode').value,size:Number($('mpSize').value),name:$('mpName').value,faction:faction(),skin:skin()});
 }));
 $('mpJoin').addEventListener('click',runClick(async()=>{
  message('방에 참가하는 중입니다…');
  await NET.join({code:$('mpRoomCode').value,team:Number($('mpTeam').value),name:$('mpName').value,faction:faction(),skin:skin()});
 }));
 $('mpReady').addEventListener('click',runClick(()=>NET.ready(!lobby?.room?.players?.[myId]?.ready)));
 $('mpLaunch').addEventListener('click',runClick(()=>NET.start()));
 $('mpLeave').addEventListener('click',runClick(leave));
 NET.configure({status:message,room:onRoom,snapshot:onSnapshot,peers:uiButtons});
 uiButtons();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
// Smooth 12-FPS character motion between 5-Hz authoritative snapshots.
// This is visual-only; no client combat prediction or client-authoritative hits.
function renderMotion(ts){
 if(ts-lastDrawAt>=78&&snap&&!document.hidden&&$('view-multiplayer').classList.contains('active')){
  lastDrawAt=ts;draw();
 }
 requestAnimationFrame(renderMotion);
}
requestAnimationFrame(renderMotion);

global.DesertTriUI=Object.freeze({draw,onSnapshot,leave,practiceStart});
})(window);
