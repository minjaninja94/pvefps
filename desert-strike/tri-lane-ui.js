/* Desert Front 3-line interface: lobby, live commander UI and pixel battlefield. */
(function(global){
'use strict';
const $=id=>document.getElementById(id);
const NET=global.DesertTriNetwork,E=global.DesertTriEngine;
if(!NET||!E)return;
let snap=null,lane=1,role=0,demolish=false,practice=null,practiceTimer=null,view='base',repairLane=1;
let myId='',lobby=null,host=false,gridKey='',cardsKey='',augmentKey='',lastSnapshotAt=0,lastDrawAt=0;
const LANES=['상단','중앙','하단'],ICONS=['⚔','⌖','◆','▣','✣','✹','♞','✚'];
function message(msg){$('mpStatus').textContent=msg;}
function laneCount(){return snap?.lanes??3;}
function laneName(i){return laneCount()===1?'단일 전장':LANES[i]+' 라인';}
function battleHeight(){return laneCount()===1?520:660;}
function setView(id,scrollToTop=false){
 if(!['base','battle','upgrade'].includes(id))return;
 view=id;
 for(const [name,element] of [['base','mpBaseView'],['battle','mpBattleView'],['upgrade','mpUpgradeView']]){
  const screen=$(element);screen.hidden=name!==view;screen.classList.toggle('active',name===view);
 }
 $('mpViewTabs').querySelectorAll('[data-mp-view]').forEach(button=>{
  const selected=button.dataset.mpView===view;
  button.classList.toggle('active',selected);
  if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 });
 if(view==='battle'&&snap)draw();
 if(scrollToTop)$('view-multiplayer').scrollIntoView?.({behavior:'auto',block:'start'});
}
function upgradeInfo(){
 const me=my();if(!me)return;
 const weapon=me.weapon||0,armor=me.armor||0,side=me.team;
 const weaponPrice=E.WEAPON_COST(weapon),armorPrice=E.ARMOR_COST(armor),cd=me.barrageCd||0;
 $('mpWeaponInfo').textContent='레벨 '+weapon+' / 5 · 공격·치유 +'+weapon*8+'%';
 $('mpArmorInfo').textContent='레벨 '+armor+' / 5 · 최대 HP +'+armor*9+'%';
 $('mpWeaponButton').textContent=weapon===5?'최대 강화 완료':'무기 강화 · '+weaponPrice+' CR';
 $('mpArmorButton').textContent=armor===5?'최대 강화 완료':'장갑 강화 · '+armorPrice+' CR';
 $('mpWeaponButton').disabled=snap.ended||weapon>=5||me.cash<weaponPrice;
 $('mpArmorButton').disabled=snap.ended||armor>=5||me.cash<armorPrice;
 const hp=snap.turrets?.[repairLane]?.[side]??1250;
 $('mpRepairInfo').textContent=laneName(repairLane)+' 본진 포탑 '+Math.ceil(hp)+' / 1250';
 $('mpRepairButton').disabled=snap.ended||me.cash<180||hp>=1250;
 $('mpBarrageInfo').textContent=cd>0?'재충전 '+Math.ceil(cd)+'초':'260 CR · 정찰된 적에게 사용 가능';
 $('mpBarrageButton').disabled=snap.ended||cd>0||me.cash<260;
 const invaded=snap.units.some(u=>u.hp>0&&u.team!==side&&(side===0?u.x<370:u.x>3300-370));
 const targets=snap.units.some(u=>u.hp>0&&u.team!==side&&(side===0?u.x<=550:u.x>=3300-550));
 const endangered=snap.cores.some(core=>core[side]<=(snap.coreMaxHP||2500)*.7),nukeReady=!!me.nukes&&(invaded||endangered)&&targets;
 $('mpNukeInfo').textContent=me.nukes?(nukeReady?'침공 경보 · 발동 가능':'1회 남음 · 침공/기지 위기 시 사용 가능'):'사용 완료';
 $('mpNukeButton').disabled=snap.ended||!nukeReady;
 $('mpRepairLanes').querySelectorAll('[data-repair-lane]').forEach(button=>button.classList.toggle('active',Number(button.dataset.repairLane)===repairLane));
}
function faction(){return Number($('mpFaction').value)||0;}
function skin(){return global.DesertLobby?.selectedSkin?.()||'default';}
function my(){return snap?.players?.find(p=>p.uid===myId);}
function countNeeded(r){return r.size*(r.mode==='coop'?1:2);}
function fullReady(r){const p=Object.values(r.players||{});return p.length===countNeeded(r)&&p.every(x=>x.ready)&& (r.mode==='coop'?p.every(x=>x.team===0):[0,1].every(t=>p.filter(x=>x.team===t).length===r.size));}
function uiButtons(){
 const r=lobby?.room,me=r?.players?.[myId];
 if(r){$('mpMode').value=r.mode;$('mpSize').value=String(r.size);$('mpRuleset').value=r.ruleset||'standard';}
 $('mpReady').disabled=!me||r?.status!=='lobby';
 $('mpReady').textContent=me?.ready?'준비 취소':'준비하기';
 $('mpLaunch').disabled=!host||!r||r.status!=='lobby'||!fullReady(r);
 $('mpLeave').disabled=!r&&!practice;
 $('mpCreate').disabled=!!r||!!practice;$('mpJoin').disabled=!!r||!!practice;
 $('mpPractice').disabled=!!r||!!practice;
 $('mpMode').disabled=!!r;$('mpSize').disabled=!!r;$('mpRuleset').disabled=!!r;
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
function updateLanePicker(p){
 $('mpSelectedLane').textContent=laneName(lane);
 $('mpLaneHint').textContent=laneCount()===1?'단일 전장 · 생산시설 75칸':laneName(lane)+' · 좌우로 밀어 라인 전환';
 for(const b of $('mpLaneTabs').querySelectorAll('[data-lane]')){
  const index=Number(b.dataset.lane),selected=index===lane;
  b.classList.toggle('active',selected);
  b.setAttribute('aria-pressed',String(selected));
  const counter=b.querySelector('[data-lane-count]');
  if(counter){
   const filled=p.buildings[index]?.filter(x=>x!==null).length||0;
   const label=filled+' / '+E.SLOTS;
   if(counter.textContent!==label)counter.textContent=label;
  }
 }
 $('mpPrevLane').disabled=lane===0;
 $('mpNextLane').disabled=lane===laneCount()-1;
 $('mpDemolish').classList.toggle('selected',demolish);
 $('mpDemolish').setAttribute('aria-pressed',String(demolish));
 $('mpBuildGrid').setAttribute('aria-label',laneName(lane)+' 생산 시설 '+E.SLOTS+'칸');
}
function buildGrid(){
 const p=my();if(!p)return;
 updateLanePicker(p);
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
  b.title=(r===null?'빈 자리':E.NAMES[r]+' 생산 시설')+' · '+laneName(lane)+' '+(i+1);
  f.append(b);
 }
 $('mpBuildGrid').replaceChildren(f);
}
function draw(){
 if(!snap)return;
 const ctx=$('mpBattleCanvas').getContext('2d');if(!ctx)return;
 const W=1100,H=battleHeight(),iso=global.IsoWorld;
 const wy=y=>y/snap.height*H;
 ctx.clearRect(0,0,W,H);
 const bg=ctx.createLinearGradient(0,0,0,H);
 bg.addColorStop(0,'#263e42');bg.addColorStop(.48,'#233943');bg.addColorStop(1,'#142e3b');
 ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 if(iso?.terrain)iso.terrain(ctx,W,H,false,my()?.faction??faction());
 for(let l=0;l<laneCount();l++){
  const y=wy(l*520),cy=wy((l+.5)*520);
  ctx.strokeStyle=l===lane?'#d3aa7150':'#8faaa626';
  if(l){ctx.setLineDash([8,12]);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();ctx.setLineDash([]);}
  ctx.font='700 11px monospace';ctx.fillStyle='#b2c7c5a9';ctx.textAlign='left';ctx.fillText(laneCount()===1?'단일 전장':LANES[l]+' 생산 구역',12,y+15);
  for(let side=0;side<2;side++){
   const coreX=side===0?24:1076,towerX=side===0?69:1031;
   const hp=snap.cores[l][side]||0,thp=snap.turrets?.[l]?.[side]||0;
   ctx.fillStyle=side===0?'#80d5d4':'#e19580';ctx.fillRect(coreX-11,cy-21,22,42);
   ctx.fillStyle=side===0?'#3a9792':'#a86658';ctx.fillRect(towerX-8,cy-16,16,32);
   ctx.fillStyle='#0a1b28';ctx.fillRect(coreX-12,cy-29,24,5);ctx.fillRect(towerX-10,cy-23,20,4);
   ctx.fillStyle='#fbd293';ctx.fillRect(coreX-12,cy-29,24*hp/(snap.coreMaxHP||2500),5);ctx.fillRect(towerX-10,cy-23,20*thp/1250,4);
   if(snap.forwardHP){const fx=(side===0?E.WIDTH/4:E.WIDTH*3/4)/3,fhp=snap.forwardHP[l][side];
   if(fhp>0&&iso?.structure){
    const owners=snap.players.filter(p=>p.team===side),fac=owners[l%Math.max(1,owners.length)]?.faction??0;
    ctx.save();ctx.translate(fx,cy);ctx.scale(.55,.55);ctx.translate(0,-260);iso.structure(ctx,0,260,fac,true,fhp/1000);ctx.restore();
   }else if(fhp>0){ctx.fillStyle=side===0?'#65b9b0':'#bd8674';ctx.fillRect(fx-12,cy-18,24,36);}
   else{ctx.fillStyle='#445457';ctx.fillRect(fx-18,cy+5,15,7);ctx.fillRect(fx+2,cy+1,18,11);ctx.fillStyle='#ba7751';ctx.fillRect(fx-2,cy+3,7,4);}
   ctx.fillStyle='#10232b';ctx.fillRect(fx-15,cy-55,30,5);ctx.fillStyle='#f5d28c';ctx.fillRect(fx-15,cy-55,30*fhp/1000,5);
   ctx.fillStyle='#efdfab';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText(fhp>0?'중간 타워':'타워 파괴',fx,cy+30);}
  }
 }
 ctx.strokeStyle='#ead9a56e';ctx.lineWidth=2;ctx.setLineDash([6,9]);ctx.beginPath();ctx.moveTo(W/2,15);ctx.lineTo(W/2,H-10);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#ead9a5';ctx.textAlign='center';ctx.font='bold 11px sans-serif';ctx.fillText('중앙선',W/2,12);
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
  if(u.heroCount===20){global.DesertConsolidation?.aura(ctx,x,y,d,performance.now()/1000,!!u.guardian);ctx.fillStyle=u.guardian?'#83ffa8':'#ff7687';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(u.guardian?'가디언 ×20':'★ ×20',x,y-d*.95);}
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
  const label={guardian:'중간 타워 파괴 · 상대 +150 CR · 가디언 소환',ginppai:'긴빠이 +CR',conscript:'자진입대!',huanglong:'황룡 · 해병수육!',bongo:'오도봉고 돌진!',broodling:'공생충 출생!',pollen:'꽃가루 치유',ink:'먹물 침식!'}[e.kind];
  if(label){ctx.fillStyle=e.kind==='huanglong'?'#ffe69b':'#ffe0b0';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(label,e.x/3,wy(e.y)-23);}
 }
 if(snap.fog?.length){
  for(let l=0;l<laneCount();l++)if(snap.fog[l]){
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
 for(let l=0;l<laneCount();l++){
  const band=96/laneCount(),y=3+l*band,p=snap.lanePressure[l]??.5,h=band-2;
  g.fillStyle=l===lane?'#314748':'#20303a';g.fillRect(0,y,1100,h);
  g.fillStyle='#86deda';g.fillRect(0,y+h-7,1100*p,5);
  g.fillStyle='#e28c77';g.fillRect(1100*p,y+h-7,1100*(1-p),5);
  g.font='bold 12px monospace';g.textAlign='left';g.fillStyle='#f5e2c7';
  g.fillText((l===lane?'▶ ':'')+laneName(l)+' 전선',13,y+16);
  for(const u of snap.units)if(u.lane===l){
   g.fillStyle=u.team===0?'#86dedc':'#f5a28a';g.fillRect(u.x/3,y+h/2,3,Math.min(12,h/3));
  }
  if(snap.fog?.[l]){g.fillStyle='#071521e9';g.fillRect(snap.viewerTeam===0?1100-770/3:0,y,770/3,h);}
  if(l===lane){g.strokeStyle='#efcc9d';g.strokeRect(1,y+1,1098,h-1);}
 }
}
function combatAudioSnapshot(v){
 const audio=global.DesertCombatAudio;
 if(!audio)return;
 if(v.ended){audio.stop();return;}
 if(v.players?.some(p=>p.uid===myId&&v.cores?.some(c=>c[p.team]<(v.coreMaxHP||2500)*.38)))audio.cue('alarm');
 if(!snap)return;
 const oldUnits=new Map(snap.units.map(u=>[u.id,u]));
 for(const unit of v.units){
  const before=oldUnits.get(unit.id);
  if(!before){audio.unit(unit.faction,unit.role,unit.skin,'spawn',unit.x);continue;}
  if((unit.act==='attack'||unit.role===7&&unit.act==='skill')&&before.act!==unit.act)
   audio.attack(unit.faction,unit.role,unit.skin,unit.x);
  if(unit.hp<before.hp&&unit.hp>0&&unit.act==='hit'){
   audio.cue('hit',unit.x);
   audio.unit(unit.faction,unit.role,unit.skin,'hit',unit.x);
  }
  oldUnits.delete(unit.id);
 }
 // Hidden enemy units may disappear from a fog-redacted snapshot without dying.
 for(const unit of oldUnits.values()){
  if(unit.hp<=0||unit.team!==v.viewerTeam&&(v.fog||[]).some(Boolean))continue;
  audio.cue('death',unit.x);
  audio.unit(unit.faction,unit.role,unit.skin,'death',unit.x);
 }
 if(snap.cores?.some((row,l)=>row.some((hp,side)=>hp>0&&v.cores?.[l]?.[side]<=0)))audio.cue('building');
 const effects=new Set((snap.effects||[]).map(e=>e.kind+':'+Math.round(e.x/20)+':'+Math.round(e.y/20)));
 for(const effect of v.effects||[]){
  if(!['barrage','nuke','pollen','huanglong'].includes(effect.kind))continue;
  const id=effect.kind+':'+Math.round(effect.x/20)+':'+Math.round(effect.y/20);
  if(!effects.has(id))audio.cue(['pollen','huanglong'].includes(effect.kind)?'heal':'explosion',effect.x);
 }
}
function renderAugment(){
 const panel=$('mpAugmentPanel'),choice=snap?.augmentChoice;
 if(!panel)return;
 if(!choice||choice.selected){panel.hidden=true;augmentKey='';return;}
 const key=JSON.stringify([choice.cards,choice.rerolls,Math.ceil(choice.remaining),choice.tier]);
 if(key===augmentKey)return;augmentKey=key;
 panel.hidden=false;panel.replaceChildren();
 const heading=document.createElement('h3');
 heading.textContent='ROUND '+choice.round+' · '+({silver:'실버',gold:'골드',prismatic:'프리즘'}[choice.tier]||choice.tier)+' 증강 · '+Math.ceil(choice.remaining)+'초';
 const description=document.createElement('p');description.textContent='셋 중 하나를 선택하세요. 각 카드 칸은 1회 리롤 가능합니다. 미선택 시 자동 선택됩니다.';
 const cards=document.createElement('div');cards.className='mp-augment-cards';
 for(let i=0;i<3;i++){
  const card=global.DesertAugments?.card(choice.cards[i]),slot=document.createElement('div');slot.className='mp-augment-card';
  const name=document.createElement('strong');name.textContent=card?.name||'증강 카드';
  const detail=document.createElement('p');detail.textContent=card?.description||'증강 데이터를 불러오는 중입니다.';
  const pick=document.createElement('button');pick.type='button';pick.className='btn accent';pick.textContent='선택';pick.disabled=!card;
  pick.addEventListener('click',()=>order({type:'augment_pick',slot:i}));
  const reroll=document.createElement('button');reroll.type='button';reroll.className='btn outline';reroll.textContent=choice.rerolls[i]?'리롤 완료':'리롤 1회';
  reroll.disabled=!card||!!choice.rerolls[i];reroll.addEventListener('click',()=>order({type:'augment_reroll',slot:i}));
  slot.append(name,detail,pick,reroll);cards.append(slot);
 }
 panel.append(heading,description,cards);
}
function onSnapshot(v){
 if(!v){snap=null;global.DesertCombatAudio?.stop?.();return;}if(v.width!==3300||![520,1560].includes(v.height)||!Array.isArray(v.players)||(v.lanes!==undefined&&v.lanes!==(v.mode==='classic'?1:3)))return;
 const fresh=!snap,modeChanged=!snap||snap.mode!==v.mode;
 if(!$('frontLobby').hidden)global.DesertLobby?.enterMatch?.();
 combatAudioSnapshot(v);
 snap=v;lastSnapshotAt=performance.now();$('mpCommand').hidden=false;$('mpViewTabs').hidden=false;
 document.body.dataset.multiArena=v.mode==='classic'?'classic':'triple';
 if(modeChanged){
  const classic=v.mode==='classic';
  $('mpBaseDescription').textContent=classic?'싱글 전장 규칙과 동일하게 75칸 생산 시설을 건설하세요. 상·중·하 구분 없이 한 전장에서 1:1로 교전합니다.':'싱글과 같은 방식으로 유닛을 선택하고 빈 칸에 건설하세요. 배치판에서 상·중·하 라인을 바로 전환할 수 있습니다.';
  $('mpBattleDescription').textContent=classic?'3300×520 크기의 원래 싱글 전장입니다. 양쪽 플레이어가 생산 시설을 건설하고 단일 전선에서 실시간 1:1로 싸웁니다.':'세 라인은 하나로 연결된 전장입니다. 미니맵 또는 전장을 눌러 해당 라인에 배치할 수 있습니다.';
 }
 if(!v.ended)$('mpStateTag').textContent=v.mode==='classic'?(practice?'클래식 1:1 AI 연습':'클래식 1:1 진행 중'):(practice?'3라인 AI 연습':'3라인 전투 중');
 const battle=$('mpBattleCanvas');if(battle.height!==battleHeight())battle.height=battleHeight();
 if(fresh||lane>=laneCount()){lane=laneCount()===1?0:1;repairLane=lane;gridKey='';setView('base');}
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
  traitHud.hidden=!faction;
  if(faction)traitHud.textContent='◆ '+faction.name+' | '+faction.bonus+(myTrait&&myTrait.faction===1?' · 공생충 '+myTrait.births+'/10 · 누적 '+myTrait.totalBirths+'기':'');}
 const marineHud=$('mpMarineAbilities');
 if(marineHud){const info=(v.marineOps||[]).find(o=>o.uid===myId);marineHud.hidden=!info;
  if(info)marineHud.textContent='★ 해병 특성 | 긴빠이 '+info.loot+'회 (+'+info.lootedCR+' CR) | 자진입대 '+info.recruits+'회 · 이번 웨이브 '+info.waveRecruits+'/2 | 황룡 '+info.huangSpawns+'기 | 오도봉고 '+info.bongoCharges+'회';}
 const f=document.createDocumentFragment();
 for(let l=0;l<laneCount();l++){
  const status=side===0?v.lanePressure[l]:1-v.lanePressure[l];
  const el=document.createElement('div');el.className=status<.42?'under-pressure':status>.58?'pushing':'';
  el.textContent=laneName(l)+' · '+(status<.42?'열세':status>.58?'우세':'교착')+' / 아군 '+Math.ceil(v.cores[l][side])+' · 적군 '+Math.ceil(v.cores[l][1-side]);
  f.append(el);
 }
 $('mpLaneSummary').replaceChildren(f);
 if(v.ended){global.DesertLobbyMusic?.stopBattle?.();$('mpStateTag').textContent=v.winner===null?'무승부':v.winner===side?'승리':'패배';if(!practice)global.DesertLobby?.completeMultiplayer?.({winner:v.winner,side,matchId:lobby?.id||'unknown'});}
 renderAugment();unitCards();buildGrid();upgradeInfo();drawOverview();
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
async function practiceStart(){
 if($('mpRuleset').value==='augment')await global.DesertAugments.load();
 if(lobby)return message('온라인 방에서 나간 뒤 연습할 수 있습니다.');
 myId='local';
 const hard=global.DesertLobby?.aiDifficulty?.()==='hard';
 const mode=$('mpMode').value==='classic'?'classic':'pvp';
 practice=E.create({mode,size:1,aiDifficulty:hard?'hard':'normal',ruleset:$('mpRuleset').value,seed:Date.now()>>>0,members:[{uid:'local',name:'연습 지휘관',team:0,faction:faction(),skin:skin()},{uid:'AI_local',name:'적 AI',team:1,faction:(faction()+1)%10,bot:true}]});
 if(!hard){const row=mode==='classic'?0:1;practice.state.players[1].buildings[row][1]=0;practice.state.players[1].buildings[row][17]=1;practice.state.players[1].cash-=160;}
 $('mpStateTag').textContent=hard?'하드 AI 연습':'오프라인 연습';message((mode==='classic'?'클래식 1:1':'3라인')+' 오프라인 연습 · Firebase 연결 없이 작동합니다.');
 let last=performance.now();
 practiceTimer=setInterval(()=>{const now=performance.now();practice.tick(Math.min(.16,(now-last)/1000));last=now;onSnapshot(practice.snapshot('local'));},100);
 onSnapshot(practice.snapshot('local'));uiButtons();
}
async function leave(){
 if(practice){clearInterval(practiceTimer);practiceTimer=null;practice=null;myId='';snap=null;$('mpCommand').hidden=true;$('mpStateTag').textContent='연결 전';message('연습 종료');}
 else{await NET.leave();snap=null;$('mpCommand').hidden=true;}
 $('mpViewTabs').hidden=true;setView('base');
 lane=1;repairLane=1;role=0;demolish=false;gridKey='';cardsKey='';augmentKey='';$('mpAugmentPanel').hidden=true;
 delete document.body.dataset.multiArena;
 uiButtons();
}
function runClick(fn){return ()=>Promise.resolve().then(fn).catch(e=>message(global.IronFirebase?.message?.(e)||e.message||String(e)));}
function init(){
 $('mpViewTabs').addEventListener('click',e=>{const target=e.target.closest('[data-mp-view]');if(target)setView(target.dataset.mpView,true);});
 $('mpCommand').addEventListener('click',e=>{const target=e.target.closest('[data-mp-jump]');if(target)setView(target.dataset.mpJump,true);});
 for(const [id,kind,type] of [['mpWeaponButton','weapon','upgrade'],['mpArmorButton','armor','upgrade'],['mpNukeButton','nuke','tactic'],['mpBarrageButton','barrage','tactic']])
  $(id).addEventListener('click',()=>order({type,kind}));
 $('mpRepairButton').addEventListener('click',()=>order({type:'tactic',kind:'repair',lane:repairLane}));
 $('mpRepairLanes').addEventListener('click',e=>{const button=e.target.closest('[data-repair-lane]');if(!button)return;repairLane=Number(button.dataset.repairLane);upgradeInfo();});
 function pickLane(id,scrollToBuild=false){
  const next=Math.max(0,Math.min(laneCount()-1,Math.trunc(id)));
  if(next!==lane){
   lane=next;gridKey='';
   const viewport=$('mpBuildSwipe').querySelector('.mp-grid-viewport');
   if(viewport)viewport.scrollTop=0;
  }
  buildGrid();if(snap){draw();drawOverview();}
  if(scrollToBuild)setView('base',true);
 }
 $('mpLaneTabs').addEventListener('click',e=>{
  const button=e.target.closest('[data-lane]');
  if(button)pickLane(Number(button.dataset.lane));
 });
 $('mpPrevLane').addEventListener('click',()=>pickLane(lane-1));
 $('mpNextLane').addEventListener('click',()=>pickLane(lane+1));
 $('mpOverviewCanvas').addEventListener('click',e=>{
  const r=e.currentTarget.getBoundingClientRect();
  pickLane(Math.floor((e.clientY-r.top)/r.height*laneCount()),true);
 });
 $('mpBattleCanvas').addEventListener('click',e=>{
  if(!snap)return;
  const r=e.currentTarget.getBoundingClientRect();
  const x=(e.clientX-r.left)/r.width*1100,y=(e.clientY-r.top)/r.height*battleHeight();
  pickLane(Math.floor(y/battleHeight()*laneCount()));
  const closest=snap.units.map(u=>({unit:u,distance:Math.hypot(x-u.x/3,y-u.y/snap.height*battleHeight())}))
   .filter(x=>x.distance<28).sort((a,b)=>a.distance-b.distance)[0]?.unit;
  if(closest){
   const name=global.DesertRoster?.FACTIONS?.[closest.faction]?.units?.[closest.role]||E.NAMES[closest.role];
   $('mpInspect').textContent=(closest.team===my()?.team?'아군':'적군')+' · '+name+
    ' · HP '+Math.ceil(closest.hp)+' / '+Math.ceil(closest.maxHP)+
    ' · '+laneName(Math.max(0,Math.min(laneCount()-1,closest.lane)))+(closest.guardian?' · 가디언':'');
  }else $('mpInspect').textContent=laneName(lane)+' 전장 선택 · 전투 병력을 누르면 상세 정보가 표시됩니다.';
 });
 // Horizontal swipes change only the production line. Vertical swipes keep scrolling
 // the 75-slot board. A completed swipe must not accidentally order a building.
 const swipeArea=$('mpBuildSwipe');
 let start=null,suppressClickUntil=0;
 swipeArea.addEventListener('pointerdown',e=>{
  if(e.button!==undefined&&e.button!==0)return;
  start={id:e.pointerId,x:e.clientX,y:e.clientY};
 });
 swipeArea.addEventListener('pointercancel',()=>{start=null;});
 swipeArea.addEventListener('pointerup',e=>{
  if(!start||e.pointerId!==start.id)return;
  const dx=e.clientX-start.x,dy=e.clientY-start.y;
  start=null;
  if(laneCount()===1||Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.3)return;
  suppressClickUntil=performance.now()+500;
  pickLane(lane+(dx<0?1:-1));
 });
 swipeArea.addEventListener('click',e=>{
  if(performance.now()>=suppressClickUntil)return;
  suppressClickUntil=0;e.preventDefault();e.stopPropagation();
 },true);
 $('mpUnitCards').addEventListener('click',e=>{const b=e.target.closest('[data-role]');if(!b)return;role=Number(b.dataset.role);demolish=false;gridKey='';unitCards();buildGrid();});
 $('mpExitBattle').addEventListener('click',()=>global.DesertLobby?.returnToLobby?.());
 document.addEventListener('keydown',e=>{if(document.body.dataset.playMode!=='multi'||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(/^[1-8]$/.test(e.key)){role=Number(e.key)-1;demolish=false;cardsKey='';unitCards();}if(e.altKey&&['1','2','3'].includes(e.key)){e.preventDefault();setView(['base','battle','upgrade'][Number(e.key)-1]);return;}if(e.key==='['||e.key==='PageUp'){e.preventDefault();pickLane(lane-1);}else if(e.key===']'||e.key==='PageDown'){e.preventDefault();pickLane(lane+1);}if(e.key==='Escape'){demolish=false;gridKey='';buildGrid();}});
 global.addEventListener?.('desert-real-sprites-ready',()=>{cardsKey='';gridKey='';if(snap){unitCards();buildGrid();}});
 $('mpDemolish').addEventListener('click',()=>{demolish=!demolish;gridKey='';buildGrid();});
 $('mpBuildGrid').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b)order({type:'build',lane,slot:Number(b.dataset.slot),role:demolish?null:role});});
 $('mpEco').addEventListener('click',()=>{setView('base',true);role=8;demolish=false;cardsKey='';unitCards();$('mpUnitCards').scrollIntoView?.({block:'nearest',behavior:'smooth'});});
 $('mpMode').addEventListener('change',()=>{
  const selected=$('mpMode').value,coop=selected==='coop',classic=selected==='classic';
  $('mpSize').querySelector('option[value="1"]').disabled=coop;
  if(coop&&$('mpSize').value==='1')$('mpSize').value='2';
  if(classic)$('mpSize').value='1';
  $('mpSize').disabled=classic;
  $('mpTeam').disabled=coop;if(coop)$('mpTeam').value='0';
  $('mpPractice').textContent=classic?'클래식 1:1 AI 연습':'오프라인 3라인 연습';
 });
 $('mpPractice').addEventListener('click',runClick(practiceStart));
 $('mpCreate').addEventListener('click',runClick(async()=>{
  message('Firebase 방을 생성합니다…');
  if($('mpRuleset').value==='augment')await global.DesertAugments.load();
  await NET.create({mode:$('mpMode').value,size:Number($('mpSize').value),ruleset:$('mpRuleset').value,publicRoom:true,name:$('mpName').value,faction:faction(),skin:skin()});
 }));
 $('mpJoin').addEventListener('click',runClick(async()=>{
  message('방에 참가하는 중입니다…');
  await NET.join({code:$('mpRoomCode').value,team:Number($('mpTeam').value),name:$('mpName').value,faction:faction(),skin:skin()});
 }));
 $('mpReady').addEventListener('click',runClick(()=>NET.ready(!lobby?.room?.players?.[myId]?.ready)));
 $('mpLaunch').addEventListener('click',runClick(()=>NET.start()));
 $('mpBrowse').addEventListener('click',runClick(async()=>{
  $('mpBrowseStatus').textContent='공개방 검색 중…';
  const rooms=await NET.browse(),select=$('mpPublicList');select.replaceChildren();
  const empty=document.createElement('option');empty.value='';empty.textContent=rooms.length?'참가할 공개방 선택':'대기 중인 공개방 없음';select.append(empty);
  for(const room of rooms){const opt=document.createElement('option');opt.value=room.code;
   opt.textContent=room.code+' · '+(room.mode==='classic'?'클래식':room.mode==='coop'?'협동':'3라인 PvP')+' · '+(room.ruleset==='augment'?'증강전':'일반전')+' · '+room.members+'/'+room.capacity;
   select.append(opt);
  }
  $('mpBrowseStatus').textContent=rooms.length+'개 공개방 검색 완료';
 }));
 $('mpJoinPublic').addEventListener('click',()=>{const code=$('mpPublicList').value;if(!code){message('참가할 공개방을 선택하세요.');return;}
  $('mpRoomCode').value=code;$('mpJoin').click();});
 $('mpLeave').addEventListener('click',runClick(leave));
 NET.configure({status:message,room:onRoom,snapshot:onSnapshot,peers:uiButtons});
 uiButtons();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
// Smooth 12-FPS character motion between 5-Hz authoritative snapshots.
// This is visual-only; no client combat prediction or client-authoritative hits.
function renderMotion(ts){
 if(ts-lastDrawAt>=78&&snap&&view==='battle'&&!document.hidden&&$('view-multiplayer').classList.contains('active')){
  lastDrawAt=ts;draw();
 }
 requestAnimationFrame(renderMotion);
}
requestAnimationFrame(renderMotion);

global.DesertTriUI=Object.freeze({draw,onSnapshot,leave,practiceStart,setView});
})(window);
