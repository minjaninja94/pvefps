/* Desert Front 3-line interface: lobby, live commander UI and pixel battlefield. */
(function(global){
'use strict';
const $=id=>document.getElementById(id);
const NET=global.DesertTriNetwork,E=global.DesertTriEngine;
if(!NET||!E)return;
let snap=null,lane=1,role=0,demolish=false,practice=null,practiceTimer=null;
let myId='',lobby=null,host=false,gridKey='',lastSnapshotAt=0,lastDrawAt=0;
const LANES=['상단','중앙','하단'],ICONS=['⚔','⌖','◆','▣','✣','✹','♞','✚'];
function message(msg){$('mpStatus').textContent=msg;}
function faction(){return Number($('mpFaction').value)||0;}
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
function buildGrid(){
 const p=my();if(!p)return;
 $('mpSelectedLane').textContent=LANES[lane]+' 라인';
 const cells=p.buildings[lane]||[];
 const key=myId+':'+lane+':'+demolish+':'+cells.join(',');
 if(key===gridKey)return;gridKey=key;
 const f=document.createDocumentFragment();
 for(let i=0;i<E.SLOTS;i++){
  const r=cells[i],b=document.createElement('button');b.type='button';b.dataset.slot=String(i);
  b.className=(r===null?'':'filled ')+(demolish&&r!==null?'demolish':'');
  b.textContent=r===null?'+':ICONS[r];
  b.title=(r===null?'빈 자리':E.NAMES[r]+' 생산 시설')+' · '+LANES[lane]+' 라인 '+(i+1);
  f.append(b);
 }
 $('mpBuildGrid').replaceChildren(f);
}
function draw(){
 if(!snap)return;
 const ctx=$('mpBattleCanvas').getContext('2d');if(!ctx)return;
 const W=1100,iso=global.IsoWorld;
 ctx.clearRect(0,0,W,1560);
 for(let l=0;l<3;l++){
  const top=l*520,selected=l===lane;
  ctx.fillStyle=selected?'#293c41':'#162a33';ctx.fillRect(0,top,W,520);
  // Same slanted tile grid as isometric singleplayer, scaled for 3x the world area.
  ctx.strokeStyle=selected?'#67827952':'#5c727740';ctx.lineWidth=1;
  for(let y=top+12;y<top+505;y+=19)for(let x=(Math.floor(y/19)%2)*25;x<W;x+=50){
   ctx.beginPath();ctx.moveTo(x-24,y);ctx.lineTo(x,y-9);ctx.lineTo(x+24,y);ctx.stroke();
  }
  ctx.font='bold 12px monospace';ctx.textAlign='left';ctx.fillStyle=selected?'#f7d8ae':'#a8c5c2';
  ctx.fillText(LANES[l]+' LINE',11,top+22);
  for(let side=0;side<2;side++){
   const x=side===0?10:1068;
   ctx.fillStyle=side===0?'#85e2df':'#e8977d';ctx.fillRect(x,top+245,22,54);
   ctx.fillStyle='#101c27';ctx.fillRect(x,top+238,22,6);
   ctx.fillStyle=side===0?'#85e2df':'#e8977d';ctx.fillRect(x,top+238,22*snap.cores[l][side]/2500,6);
  }
  const units=snap.units.filter(u=>u.lane===l).sort((a,b)=>a.y-b.y);
  for(const u of units){
   const x=u.x/3,y=top+28+(u.y-l*520)/520*446;
   if(x<-20||x>1120)continue;
   ctx.fillStyle=u.team===0?'#4aa5b066':'#da826b66';ctx.beginPath();ctx.ellipse(x,y+3,8,3,0,0,7);ctx.fill();
   const animatedFrame=((u.frame||0)+Math.floor((performance.now()-lastSnapshotAt)/84))%16;
   const sprite=iso?.frame(u.faction,u.role,u.act||'move',animatedFrame);
   const d=u.role===3||u.role===6?68:60;
   if(sprite){ctx.imageSmoothingEnabled=false;ctx.drawImage(sprite,x-d/2,y-d*.85,d,d);}
   else{ctx.fillStyle=u.team===0?'#a5ece7':'#ef9e8a';ctx.fillRect(x-5,y-8,10,12);}
   ctx.fillStyle='#081c25';ctx.fillRect(x-8,y-d*.91,16,3);
   ctx.fillStyle=u.team===0?'#75ddd6':'#f59479';ctx.fillRect(x-8,y-d*.91,16*Math.max(0,u.hp/u.maxHP),3);
  }
  for(const e of snap.effects||[])if(e.lane===l){
   ctx.strokeStyle='#ffdf9b';ctx.lineWidth=2;
   ctx.beginPath();ctx.ellipse(e.x/3,top+28+(e.y-l*520)/520*446,11,4,0,0,7);ctx.stroke();
  }
  const p=snap.lanePressure[l]??.5;
  ctx.fillStyle='#8adecf';ctx.fillRect(0,top+510,1100*p,9);
  ctx.fillStyle='#ea9176';ctx.fillRect(1100*p,top+510,1100*(1-p),9);
  if(selected){ctx.strokeStyle='#f1d4a3';ctx.lineWidth=2;ctx.strokeRect(1,top+1,1098,518);}
 }
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
  if(l===lane){g.strokeStyle='#efcc9d';g.strokeRect(1,y+1,1098,28);}
 }
}
function onSnapshot(v){
 if(!v){snap=null;return;}if(v.width!==3300||v.height!==1560||!Array.isArray(v.players))return;
 snap=v;lastSnapshotAt=performance.now();$('mpCommand').hidden=false;
 const me=my(),side=me?.team??0;
 if(me){
  $('mpMyResources').textContent=me.cash+' CR';
  $('mpMyIncome').textContent='+'+(1+me.eco)+' / 0.5초';
  $('mpBuiltCount').textContent=me.buildings.reduce((n,bs)=>n+bs.filter(x=>x!==null).length,0)+'개 건설';
  const cost=Math.round(70*Math.pow(1.36,me.eco));
  $('mpEco').textContent=me.eco>=7?'최대 경제':'경제 강화 · '+cost+' CR';
  $('mpEco').disabled=me.eco>=7||me.cash<cost||v.ended;
 }
 $('mpWave').textContent='WAVE '+String(v.wave).padStart(2,'0');
 $('mpCountdown').textContent=Math.max(0,v.next).toFixed(1)+'초';
 const f=document.createDocumentFragment();
 for(let l=0;l<3;l++){
  const status=side===0?v.lanePressure[l]:1-v.lanePressure[l];
  const el=document.createElement('div');el.className=status<.42?'under-pressure':status>.58?'pushing':'';
  el.textContent=LANES[l]+' · '+(status<.42?'열세':status>.58?'우세':'교착')+' / 아군 '+Math.ceil(v.cores[l][side])+' · 적군 '+Math.ceil(v.cores[l][1-side]);
  f.append(el);
 }
 $('mpLaneSummary').replaceChildren(f);
 if(v.ended){$('mpStateTag').textContent=v.winner===null?'무승부':v.winner===side?'승리':'패배';}
 buildGrid();drawOverview();
}
function order(cmd){
 if(!snap||snap.ended)return message('진행 중인 경기가 없습니다.');
 const r=practice?practice.order(myId,cmd):NET.sendOrder(cmd);
 if(!r?.ok)message(r?.reason||'명령 실패');
 else if(practice)onSnapshot(practice.snapshot());
 else message('명령 전달 완료 · 호스트 판정 대기');
}
function practiceStart(){
 if(lobby)return message('온라인 방에서 나간 뒤 연습할 수 있습니다.');
 myId='local';
 practice=E.create({mode:'pvp',size:1,members:[{uid:'local',name:'연습 지휘관',team:0,faction:faction()},{uid:'AI_local',name:'적 AI',team:1,faction:(faction()+1)%6,bot:true}]});
 practice.state.players[1].buildings[1][1]=0;practice.state.players[1].buildings[1][17]=1;
 practice.state.players[1].cash-=160;
 $('mpStateTag').textContent='오프라인 연습';message('3라인 오프라인 연습 · Firebase 연결 없이 작동합니다.');
 let last=performance.now();
 practiceTimer=setInterval(()=>{const now=performance.now();practice.tick(Math.min(.16,(now-last)/1000));last=now;onSnapshot(practice.snapshot());},100);
 onSnapshot(practice.snapshot());uiButtons();
}
async function leave(){
 if(practice){clearInterval(practiceTimer);practiceTimer=null;practice=null;myId='';snap=null;$('mpCommand').hidden=true;$('mpStateTag').textContent='연결 전';message('연습 종료');}
 else{await NET.leave();snap=null;$('mpCommand').hidden=true;}
 uiButtons();
}
function runClick(fn){return ()=>Promise.resolve().then(fn).catch(e=>message(global.IronFirebase?.message?.(e)||e.message||String(e)));}
function init(){
 const select=$('mpUnitType');
 for(let i=0;i<E.COST.length;i++){
  const opt=document.createElement('option');opt.value=i;opt.textContent=ICONS[i]+' '+E.NAMES[i]+' · '+E.COST[i]+' CR';select.append(opt);
 }
 $('mpLaneTabs').querySelectorAll('[data-lane]').forEach(b=>b.addEventListener('click',()=>pickLane(Number(b.dataset.lane))));
 function pickLane(id){
  lane=id;$('mpLaneTabs').querySelectorAll('[data-lane]').forEach(b=>b.classList.toggle('active',Number(b.dataset.lane)===lane));
  gridKey='';buildGrid();draw();drawOverview();
  const canvas=$('mpBattleCanvas');canvas.parentElement.scrollTop=canvas.clientHeight*lane/3;
 }
 $('mpOverviewCanvas').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();pickLane(Math.min(2,Math.max(0,Math.floor((e.clientY-r.top)/r.height*3))));});
 $('mpBattleCanvas').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();pickLane(Math.min(2,Math.max(0,Math.floor((e.clientY-r.top)/r.height*3))));});
 select.addEventListener('change',()=>{role=Number(select.value);demolish=false;gridKey='';buildGrid();});
 $('mpDemolish').addEventListener('click',()=>{demolish=!demolish;gridKey='';buildGrid();});
 $('mpBuildGrid').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b)order({type:'build',lane,slot:Number(b.dataset.slot),role:demolish?null:role});});
 $('mpEco').addEventListener('click',()=>order({type:'econ'}));
 $('mpMode').addEventListener('change',()=>{
  const coop=$('mpMode').value==='coop';$('mpSize').querySelector('option[value="1"]').disabled=coop;
  if(coop&&$('mpSize').value==='1')$('mpSize').value='2';
  $('mpTeam').disabled=coop;if(coop)$('mpTeam').value='0';
 });
 $('mpPractice').addEventListener('click',practiceStart);
 $('mpCreate').addEventListener('click',runClick(async()=>{
  message('Firebase 방을 생성합니다…');
  await NET.create({mode:$('mpMode').value,size:Number($('mpSize').value),name:$('mpName').value,faction:faction()});
 }));
 $('mpJoin').addEventListener('click',runClick(async()=>{
  message('방에 참가하는 중입니다…');
  await NET.join({code:$('mpRoomCode').value,team:Number($('mpTeam').value),name:$('mpName').value,faction:faction()});
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

global.DesertTriUI=Object.freeze({draw,onSnapshot});
})(window);
