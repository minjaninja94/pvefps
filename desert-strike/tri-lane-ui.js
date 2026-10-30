/* Desert Front 3-line interface: lobby, live commander UI and pixel battlefield. */
(function(global){
'use strict';
const $=id=>document.getElementById(id);
const isAugmented=ruleset=>ruleset==='augment'||ruleset==='prism';
const NET=global.DesertTriNetwork,E=global.DesertTriEngine;
if(!NET||!E)return;
let snap=null,lane=1,role=0,demolish=false,practice=null,practiceTimer=null,practiceRecorded=false,view='base',repairLane=1,battleScope='all';
let myId='',lobby=null,host=false,gridKey='',cardsKey='',counterKey='',augmentKey='',lastSnapshotAt=0,lastDrawAt=0,resultKey='',augmentRosterKey='',cameraX=1100;
const LANES=['상단','중앙','하단'],ICONS=['⚔','⌖','◆','▣','✣','✹','♞','✚','⬡','⌖','†'];
function message(msg){$('mpStatus').textContent=msg;}
function laneCount(){return snap?.lanes??3;}
function laneName(i){return laneCount()===1?'단일 전장':LANES[i]+' 라인';}
function battleHeight(){return 400;}
function isAlly(team){return team===(snap?.viewerTeam??my()?.team??0);}
function teamInk(team){return isAlly(team)?'#7fddf8':'#ff9c91';}
function setBattleScope(scope){
 battleScope=laneCount()===1?'lane':scope==='all'?'all':'lane';
 $('mpBattleCanvas').hidden=battleScope==='all';
 $('mpAllBattleCanvas').hidden=battleScope!=='all';
 $('mpBattleCurrentLane').textContent=battleScope==='all'?'전체 전장':laneName(lane);
 $('mpBattleLaneSelect').querySelectorAll('[data-mp-lane],[data-mp-scope]').forEach(b=>{
  const active=b.dataset.mpScope==='all'?battleScope==='all':battleScope==='lane'&&Number(b.dataset.mpLane)===lane;
  b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
 });
 if(snap&&view==='battle')draw();
}
function drawAllBattle(){
 if(!snap)return;
 const c=$('mpAllBattleCanvas'),g=c?.getContext('2d');if(!g)return;
 const lanes=laneCount(),band=c.height/lanes,left=54,right=1070,width=right-left,team=snap.viewerTeam??my()?.team??0;
 g.clearRect(0,0,c.width,c.height);g.fillStyle='#0a1b24';g.fillRect(0,0,c.width,c.height);
 for(let l=0;l<lanes;l++){
  const top=l*band,mid=top+band*.57;
  g.fillStyle=l%2?'#1b2e37':'#182c35';g.fillRect(0,top,c.width,band-2);
  g.strokeStyle='#7c8e8066';g.lineWidth=1;g.beginPath();g.moveTo(left,mid+18);g.lineTo(right,mid+18);g.stroke();
  g.setLineDash([6,6]);g.strokeStyle='#c9c9b45a';g.beginPath();g.moveTo(left+width/2,top+27);g.lineTo(left+width/2,top+band-9);g.stroke();g.setLineDash([]);
  const status=(snap.lanePressure?.[l]??.5),self=team===0?status:1-status;
  g.textAlign='left';g.font='bold 15px sans-serif';g.fillStyle='#f2d6aa';g.fillText(laneName(l),12,top+21);
  g.font='bold 11px sans-serif';g.fillStyle=self>.57?'#85edcf':self<.43?'#ffaea1':'#d3d7d6';
  g.fillText(self>.57?'아군 우세':self<.43?'적군 우세':'교착',115,top+20);
  for(let side=0;side<2;side++){
   const ink=teamInk(side),hx=x=>left+width*x/E.WIDTH;
   const core=snap.cores?.[l]?.[side]??0,coreMax=snap.coreMaxHP||3000;
   for(const [x,hp,max,shape] of [[side===0?90:E.WIDTH-90,core,coreMax,'■'],[side===0?190:E.WIDTH-190,snap.turrets?.[l]?.[side]??0,1250,'▣'],[side===0?E.WIDTH/4:E.WIDTH*3/4,snap.forwardHP?.[l]?.[side]??0,1000,'◆']]){
    const hidden=snap.fog?.[l]&&side!==team&&(team===0?x>=E.WIDTH-770:x<=770);
    if(hidden)continue;
    g.fillStyle=hp>0?ink:'#5d646b';g.font='bold 13px sans-serif';g.textAlign='center';g.fillText(shape,hx(x),top+43);
    g.fillStyle='#30414b';g.fillRect(hx(x)-12,top+46,24,4);
    g.fillStyle=ink;g.fillRect(hx(x)-12,top+46,24*Math.max(0,Math.min(1,hp/max)),4);
   }
  }
  const units=snap.units.filter(u=>u.lane===l&&u.hp>0);
  const rows=new Map();
  for(const u of units){
   const cell=Math.round(u.x/31),key=u.team+':'+cell+':'+u.role,prev=rows.get(key);
   if(prev)prev.count+=(u.heroCount===20?20:1);
   else rows.set(key,{...u,count:u.heroCount===20?20:1});
  }
  for(const u of rows.values()){
   const x=left+width*u.x/E.WIDTH;
   const ry=Math.max(-18,Math.min(15,(u.y-l*E.LANE_H-260)*.11));
   const y=mid+ry+(isAlly(u.team)?-7:8);
   g.fillStyle=teamInk(u.team);g.beginPath();g.arc(x,y,Math.min(11,4+Math.log2(u.count+1)*1.4),0,Math.PI*2);g.fill();
   g.fillStyle='#0c202b';g.textAlign='center';g.font='bold 9px sans-serif';g.fillText(ICONS[u.role]||'●',x,y+3);
   if(u.count>1){g.fillStyle='#fff5db';g.font='bold 10px monospace';g.fillText(String(u.count),x+12,y-9);}
  }
  if(snap.fog?.[l]){
   const x=team===0?left+width*(E.WIDTH-770)/E.WIDTH:left;
   g.fillStyle='#071524d7';g.fillRect(x,top+24,width*770/E.WIDTH,band-30);
   g.fillStyle='#a7bac6';g.font='bold 11px sans-serif';g.textAlign='center';
   g.fillText('정찰 전',x+width*770/E.WIDTH/2,top+band-15);
  }
  g.strokeStyle='#7893a666';g.strokeRect(1,top+.5,c.width-2,band-2);
 }
 g.font='bold 11px sans-serif';g.textAlign='right';g.fillStyle='#a8e9ff';g.fillText('● 아군',c.width-98,19);
 g.fillStyle='#ffa89b';g.fillText('● 적군',c.width-18,19);
}
function renderTacticalPositions(){
 const root=$('mpTacticalPositions');if(!root||!snap)return;
 const fragment=document.createDocumentFragment(),legend=document.createElement('div');legend.className='mp-position-legend';
 const title=document.createElement('strong');title.textContent='실시간 병력 위치 · 종족별 생산 대응';
 const blue=document.createElement('span');blue.className='ally';blue.textContent='● 아군 (파랑)';
 const red=document.createElement('span');red.className='enemy';red.textContent='● 적군 (빨강)';
 legend.append(title,blue,red);fragment.append(legend);
 for(let l=0;l<laneCount();l++){
  const band=document.createElement('section');band.className='mp-position-lane';
  const heading=document.createElement('header'),name=document.createElement('b'),detail=document.createElement('span');
  const units=snap.units.filter(u=>u.lane===l&&u.hp>0),ally=units.filter(u=>isAlly(u.team)),enemy=units.filter(u=>!isAlly(u.team));
  const population=a=>a.reduce((sum,u)=>sum+(u.heroCount===20?20:1),0);
  name.textContent=laneName(l);detail.textContent='아군 '+population(ally)+'기 · 적군 '+population(enemy)+'기'+(snap.fog?.[l]?' · 적 후방 미정찰':'');
  heading.append(name,detail);band.append(heading);
  const track=document.createElement('div');track.className='mp-position-track';
  const groups=new Map();
  for(const u of units){
   const key=u.team+':'+u.role,part=groups.get(key),power=u.heroCount===20?20:1;
   if(part){part.x+=u.x*power;part.n+=power;}
   else groups.set(key,{team:u.team,role:u.role,x:u.x*power,n:power});
  }
  for(const g of groups.values()){
   const tag=document.createElement('span');tag.className='mp-position-dot '+(isAlly(g.team)?'ally':'enemy');
   const location=g.x/g.n;tag.style.left=(3+94*location/E.WIDTH)+'%';tag.style.top=(isAlly(g.team)?0:8)+'px';
   tag.textContent=(ICONS[g.role]||'●')+(g.n>1?g.n:'');
   tag.title=(isAlly(g.team)?'아군 ':'적군 ')+(E.NAMES[g.role]||'')+' '+g.n+'기 · 전장 '+Math.round(location/E.WIDTH*100)+'%';
   track.append(tag);
  }
  if(snap.fog?.[l]){
   const fog=document.createElement('div');fog.className='mp-position-fog';
   const hideRight=(snap.viewerTeam??0)===0;
   fog.style.left=hideRight?(3+94*(E.WIDTH-770)/E.WIDTH)+'%':'0%';
   fog.style.width=(94*770/E.WIDTH+3)+'%';fog.textContent='미정찰';track.append(fog);
  }
  band.append(track);fragment.append(band);
 }
 root.replaceChildren(fragment);
}
function panCamera(delta){cameraX=Math.max(0,Math.min(E.WIDTH-1100,cameraX+delta));if(snap)draw();}
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
 // Do not inspect fog-redacted enemy units here: the authoritative host
 // decides whether any opponents exist when the order arrives.
 const nukeReady=!!me.nukes;
 $('mpNukeInfo').textContent=me.nukes?'1회 남음 · 상대 병력 제거 · 가디언 제외':'사용 완료';
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
 global.DesertLobby?.syncRulesetFromRoom?.(r?(r.ruleset||'standard'):null);
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
function ecoTooltip(level,seconds){
 const income=eco=>Number((E.incomePerTick?.(eco)??1).toFixed(2));
 if(level>=7)return '최대 7개 · 수입 +'+income(level)+' CR / 0.5초';
 return '완료 후 수입 +'+income(level+1)+' CR / 0.5초 (추가 +'+Number((income(level+1)-income(level)).toFixed(2))+' CR) · 건설 '+E.ecoBuildSeconds(level+1)+'초 + 안정화 '+E.ecoStabilize(level+1,seconds)+'초. 건설·안정화 동안 기본·채굴 인컴과 웨이브 지원금 중단. 철거해도 남은 중단 시간은 유지됩니다.';
}
function renderCounterGuide(fac){
 const root=$('mpCounterMatrix');if(!root||counterKey===fac)return;
 counterKey=fac;const fragment=document.createDocumentFragment();
 for(const i of [0,1,2,3,4,5,6,7,9,10]){
  const d=global.DesertRoster?.getDef?.(i,fac),item=document.createElement('div');
  item.className='mp-counter-item';
  const heading=document.createElement('strong'),good=document.createElement('span'),bad=document.createElement('span');
  heading.textContent=(ICONS[i]||'')+' '+(global.DesertRoster?.FACTIONS?.[fac]?.units?.[i]||E.NAMES[i]);
  good.textContent=i===7?'회복 전용 · 공격 상성 없음':'강점: '+(d?.good||[]).map(r=>E.NAMES[r]).join(' · ');
  bad.textContent=i===7?'위협: 돌격 · 사격 · 기병':'약점: '+(d?.bad||[]).map(r=>E.NAMES[r]).join(' · ');
  good.className='mp-counter-good';bad.className='mp-counter-bad';
  item.append(heading,good,bad);fragment.append(item);
 }
 root.replaceChildren(fragment);
}
function unitCards(){
 const me=my(),fac=me?.faction??faction();renderCounterGuide(fac);
  const key=fac+':'+role+':'+skin()+':'+(me?.eco||0)+':'+((me?.ecoReadyAt||0)>(snap?.seconds||0))+':'+Math.floor((snap?.seconds||0)/120);
 if(cardsKey!==key){cardsKey=key;const out=$('mpUnitCards');out.replaceChildren();
 for(let i=0;i<11;i++){
  const d=i===8?null:global.DesertRoster?.getDef(i,fac),b=document.createElement('button');b.type='button';b.dataset.role=i;b.className='mp-unit-card'+(role===i?' active':'');b.setAttribute('aria-pressed',String(role===i));
  const cv=document.createElement('canvas');cv.width=cv.height=72;unitIcon(cv,fac,i);
  const name=document.createElement('strong');name.textContent=i===8?'자원채취 건물':global.DesertRoster?.FACTIONS[fac]?.units[i]||E.NAMES[i];
  const cost=document.createElement('small');cost.textContent=(i===8&&(me?.eco||0)>=7?'최대 단계':(i===8?E.ecoPrice(me?.eco||0):(E.unitCost?.(fac,i)??E.COST[i]))+' CR')+' · '+(i===8?'슬롯 1칸':d?.kind==='air'?'비행':'지상');
  const advantage=i===8?[]:(d?.good||[]).map(r=>E.NAMES[r]);
   const vulnerable=i===8?[]:(d?.bad||[]).map(r=>E.NAMES[r]);
   b.title=i===8?ecoTooltip(me?.eco||0,snap?.seconds||0):
    [d?.tips||'',i===7?'회복 전용 · 공격 상성 없음':'강점 '+advantage.join(' · '),i===7?'위협: 돌격 · 사격 · 기병':'약점 '+vulnerable.join(' · ')].filter(Boolean).join('\n');
  if(i===8)b.disabled=(me?.eco||0)>=7||(me?.ecoReadyAt||0)>(snap?.seconds||0);
  b.append(cv,name,cost);
   if(d){const good=document.createElement('span'),bad=document.createElement('span');
    good.className='mp-good-counter';good.textContent=i===7?'✚ 회복 전용':'강점 '+(d.good||[]).map(r=>ICONS[r]||E.NAMES[r]).join(' ');
    bad.className='mp-bad-counter';bad.textContent=i===7?'위협 ⚔ ⌖':'약점 '+(d.bad||[]).map(r=>ICONS[r]||E.NAMES[r]).join(' ');
    b.append(good,bad);
   }
   out.append(b);
 }
 const d=role===8?null:global.DesertRoster?.getDef(role,fac);
 $('mpUnitDetails').textContent=role===8?ecoTooltip(me?.eco||0,snap?.seconds||0):
  d?[d.tips||'',(role===7?'시너지: ':'강점: ')+(d.good||[]).map(r=>E.NAMES[r]).join(' · '),
   '약점: '+(d.bad||[]).map(r=>E.NAMES[r]).join(' · ')].filter(Boolean).join('  /  '):'유닛을 선택하세요.';
 }
 $('mpUnitCards').querySelectorAll('[data-role]').forEach(b=>b.classList.toggle('unaffordable',!!me&&me.cash<(Number(b.dataset.role)===8?E.ecoPrice(me.eco):(E.unitCost?.(me.faction,Number(b.dataset.role))??E.COST[Number(b.dataset.role)]))));
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
 const ready=p.buildingReadyAt?.[lane]||[];
 const pending=ready.some((at,i)=>cells[i]!==null&&Math.max(at,p.mineTimings?.[lane+'-'+i]?.readyAt||0)>snap.seconds+1e-6);
 const key=myId+':'+lane+':'+demolish+':'+cells.join(',')+':'+ready.join(',')+
  (pending?':'+Math.floor(snap.seconds):'');
 if(key===gridKey)return;gridKey=key;
 const f=document.createDocumentFragment();
 for(let i=0;i<E.SLOTS;i++){
  const r=cells[i],b=document.createElement('button');b.type='button';b.dataset.slot=String(i);
  b.disabled=r!==null&&!demolish;
  b.className=(r===null?'':'filled ')+(demolish&&r!==null?'demolish':'');
  if(r===null)b.textContent='+';else{
   const cv=document.createElement('canvas');cv.width=cv.height=72;unitIcon(cv,p.faction,r);b.append(cv);
   const name=document.createElement('span');name.className='cell-name';
   name.textContent=r===E.EXTRACTOR?'자원채취':global.DesertRoster?.FACTIONS[p.faction]?.units[r]||E.NAMES[r];b.append(name);
   const timing=p.mineTimings?.[lane+'-'+i],at=ready[i]||0;
   const building=at>snap.seconds+1e-6,stabilizing=!building&&(timing?.readyAt||0)>snap.seconds+1e-6;
   if(building||stabilizing){
    b.classList.add('constructing');
    const opening=!timing&&at===(E.OPENING_PREP_SECONDS??10);
    const end=building?at:timing.readyAt,start=building?(timing?.startedAt??(opening?0:at-E.FACTORY_BUILD_SECONDS)):at;
    const progress=Math.max(0,Math.min(100,100*(snap.seconds-start)/(end-start)));
    const bar=document.createElement('span');bar.className='build-progress'+(stabilizing?' stabilizing':'');
    const label=(building?(opening?'배치 준비 ':'건설 '):'안정화 ')+Math.ceil(end-snap.seconds-1e-6)+'초';
    bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',label);
    bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(Math.floor(progress)));
    const fill=document.createElement('span');fill.className='build-progress-fill';fill.style.width=progress+'%';
    const clock=document.createElement('span');clock.className='build-progress-label';clock.textContent=label;
    bar.append(fill,clock);b.append(bar);
   }
  }
  b.setAttribute('aria-label',(r===null?'빈 슬롯':global.DesertRoster?.FACTIONS[p.faction]?.units[r]||E.NAMES[r])+' '+(i+1));
  b.setAttribute('aria-pressed',String(demolish&&r!==null));
  b.title=(r===null?'빈 자리':E.NAMES[r]+' 생산 시설')+' · '+laneName(lane)+' '+(i+1)+
   (r!==null&&ready[i]>snap.seconds?
     ' · 건설 중 '+Math.ceil(ready[i]-snap.seconds)+'초':'');
  f.append(b);
 }
 $('mpBuildGrid').replaceChildren(f);
}
function draw(){
 if(!snap)return;
 if(battleScope==='all'){drawAllBattle();return;}
 const ctx=$('mpBattleCanvas').getContext('2d'),iso=global.IsoWorld,W=1100,H=520;
 if(!ctx)return;
 const pos=(x,y)=>iso?.project?.(x,y)||{x,y};
 function drawStructureHealth(x,team,kind,hp,maxHP){
  const p=pos(x,260),width=kind==='core'?104:112;
  const y=p.y-(kind==='forward'?166:kind==='core'?189:140),left=p.x-width/2;
  const value=Math.max(0,Math.ceil(hp)),ratio=Math.max(0,Math.min(1,hp/maxHP));
  const name=kind==='forward'?'중간 타워':kind==='turret'?'본진 포탑':'핵심 기지';
  ctx.save();ctx.fillStyle='#0b1d28ed';ctx.fillRect(left,y,width,45);
  ctx.strokeStyle=isAlly(team)?'#75c8d3':'#d99581';ctx.lineWidth=1;ctx.strokeRect(left+.5,y+.5,width-1,44);
  ctx.textAlign='center';ctx.font='bold 11px sans-serif';ctx.fillStyle='#f1e8da';
  ctx.fillText(value===0?name+' 파괴':name,p.x,y+13);
  ctx.font='bold 12px monospace';ctx.fillStyle=value===0?'#ffb6ab':'#ffffff';
  ctx.fillText(value+' / '+maxHP,p.x,y+28);
  ctx.fillStyle='#263943';ctx.fillRect(left+6,y+34,width-12,6);
  ctx.fillStyle=value===0?'#78636a':teamInk(team);
  ctx.fillRect(left+6,y+34,(width-12)*ratio,6);ctx.restore();
 }
 ctx.clearRect(0,0,W,400);ctx.save();ctx.scale(1,400/H);ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();ctx.translate(-cameraX,0);
 if(iso?.terrain)iso.terrain(ctx,E.WIDTH,H,false,my()?.faction??faction());
 else{ctx.fillStyle='#43524a';ctx.fillRect(0,0,E.WIDTH,H);}
 const a=pos(E.WIDTH/2,35),b=pos(E.WIDTH/2,485);
 ctx.strokeStyle='#f2d7a777';ctx.lineWidth=2;ctx.setLineDash([8,10]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
 function fort(x,team,tower,hp,max,kind=tower?'turret':'core'){
  const faction=snap.players.find(p=>p.team===team)?.faction??0;
  if(iso?.structure)iso.structure(ctx,x,260,faction,tower,hp/max,kind);
  else{ctx.fillStyle=team===0?'#87d7d2':'#e19b83';ctx.fillRect(x-20,225,40,70);}
 }
 for(let t=0;t<2;t++){
  fort(t===0?90:E.WIDTH-90,t,false,snap.cores[lane]?.[t]||0,snap.coreMaxHP||3000);
  fort(t===0?190:E.WIDTH-190,t,true,snap.turrets?.[lane]?.[t]||0,1250);
  const x=t===0?E.WIDTH/4:E.WIDTH*3/4,hp=snap.forwardHP?.[lane]?.[t]||0;
  fort(x,t,true,hp,1000,'forward');
 }
 const phase=Math.floor((performance.now()-lastSnapshotAt)/84);
 for(const u of snap.units.filter(u=>u.lane===lane).sort((x,y)=>x.y-y.y)){
  const p=pos(u.x,u.y-lane*E.LANE_H);
   if(u.role===7){ctx.save();ctx.strokeStyle='#79e8e455';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y+12,190,65,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(p.x<cameraX-110||p.x>cameraX+1210)continue;
  const factor=(u.isHatchling?.58:1)*(u.heroCount===20?2:1),size=(u.role===3?78:u.role===6?77:68)*factor;
  ctx.fillStyle='#0617229a';ctx.beginPath();ctx.ellipse(p.x,p.y+13,17*factor,4*factor,0,0,Math.PI*2);ctx.fill();
  if(u.heroCount===20)global.DesertConsolidation?.aura?.(ctx,p.x,p.y+12,size,performance.now()/1000,!!u.guardian);
  const act=['idle','move','attack','siege','death'].includes(u.act)?u.act:'idle',frame=((u.frame||0)+phase)%16;
  const img=iso?.frame?.(u.faction,u.role,act,frame)||global.DesertSprites?.frame?.(u.faction,u.role,act,frame);
  const skin=u.skin||'default',filter=global.DesertLobby?.filterForSkin?.(skin)||'none';
  ctx.save();ctx.globalAlpha*=u.opacity??1;ctx.translate(p.x,p.y);if(u.team===1)ctx.scale(-1,1);ctx.imageSmoothingEnabled=false;
  if(global.DesertUnitMotion)global.DesertUnitMotion.draw(ctx,{faction:u.faction,role:u.role,action:u.act||'move',frame,x:-size/2,y:-size/2,size,filter,skin,isHatchling:!!u.isHatchling});
  else if(img){ctx.filter=filter;ctx.drawImage(img,-size/2,-size/2,size,size);}
  else{ctx.fillStyle='#f3c193';ctx.fillRect(-8,-24,16,29);}
  ctx.restore();
  const hpY=p.y-47*factor;
   if(u.label){ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#061722';ctx.strokeText(u.label,p.x,hpY-22);ctx.fillStyle=u.role===7?'#9efff0':'#e6caff';ctx.fillText(u.label,p.x,hpY-22);}
  if(u.heroCount===20){ctx.fillStyle=u.guardian?'#9affa8':'#ffd197';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(u.guardian?'가디언 ×20':'★ ×20',p.x,hpY-9);}
  if(u.hp<u.maxHP){ctx.fillStyle='#0c1b28';ctx.fillRect(p.x-16*factor,hpY-9,32*factor,5);ctx.fillStyle=u.team===0?'#83e4e0':'#f2a08c';ctx.fillRect(p.x-16*factor,hpY-9,32*factor*Math.max(0,u.hp/u.maxHP),5);}
   // On-field unit roles, not floating counter matrices; production intel shows both team positions.

 }
 for(const e of snap.effects||[]){
  if(e.lane!==lane)continue;
  if(e.kind==='projectile'){
   const pct=Math.max(.08,Math.min(1,1-(e.time||0)/.38+(performance.now()-lastSnapshotAt)/380));
   const px=e.x+(e.tx-e.x)*pct,py=e.y+(e.ty-e.y)*pct-lane*E.LANE_H;
   const muzzle=e.originKind?iso?.towerMuzzle?.(e.x,e.y-lane*E.LANE_H,e.faction,e.originKind,e.team):null;
   const landing=pos(e.tx,e.ty-lane*E.LANE_H);
   const point=muzzle?{x:muzzle.x+(landing.x-muzzle.x)*pct,y:muzzle.y+(landing.y-muzzle.y)*pct}:pos(px,py);
   if(point.x<cameraX-90||point.x>cameraX+1190)continue;
   const angle=Math.atan2(landing.y-(muzzle?.y??pos(e.x,e.y-lane*E.LANE_H).y),landing.x-(muzzle?.x??pos(e.x,e.y-lane*E.LANE_H).x));
   if(muzzle){
    ctx.save();ctx.globalAlpha=.58*(1-pct);
    ctx.strokeStyle=e.team===0?'#9ceaff':'#ffb7a4';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.moveTo(muzzle.x,muzzle.y);ctx.lineTo(point.x,point.y);ctx.stroke();ctx.restore();
   }
   if(!(muzzle?iso?.projectileAt?.(ctx,point.x,point.y,e.faction,e.role,Math.floor(pct*4),angle)
       :iso?.projectile?.(ctx,px,py,e.faction,e.role,Math.floor(pct*4),angle))){
    ctx.strokeStyle=e.team===0?'#9ceaff':'#ffb7a4';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(point.x-9,point.y);ctx.lineTo(point.x+9,point.y);ctx.stroke();
   }
   continue;
  }
  const p=pos(e.x,e.y-lane*E.LANE_H);
  if(p.x<cameraX-50||p.x>cameraX+1150)continue;
  ctx.strokeStyle=e.kind==='nuke'?'#fff2af':'#f7d09c';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,e.kind==='nuke'?50:18,e.kind==='nuke'?26:7,0,0,Math.PI*2);ctx.stroke();
 }
 if(snap.fog?.[lane]){ctx.fillStyle='#071525ed';ctx.fillRect(snap.viewerTeam===0?E.WIDTH-770:0,0,770,H);}
 // Keep tower HP above units/effects but never expose defenses behind enemy fog.
 const hiddenTower=(team,x)=>snap.fog?.[lane]&&team!==snap.viewerTeam&&
  (snap.viewerTeam===0?x>=E.WIDTH-770:x<=770);
 for(let team=0;team<2;team++){
  const forwardX=team===0?E.WIDTH/4:E.WIDTH*3/4;
  if(!hiddenTower(team,forwardX))drawStructureHealth(forwardX,team,'forward',snap.forwardHP?.[lane]?.[team]??0,1000);
  const turretX=team===0?190:E.WIDTH-190;
  if(!hiddenTower(team,turretX))drawStructureHealth(turretX,team,'turret',snap.turrets?.[lane]?.[team]??0,1250);
  const coreX=team===0?90:E.WIDTH-90;
  if(!hiddenTower(team,coreX))drawStructureHealth(coreX,team,'core',snap.cores?.[lane]?.[team]??0,snap.coreMaxHP||3000);
 }
 ctx.restore();
 ctx.fillStyle='#081c27d9';ctx.fillRect(0,0,240,35);ctx.fillStyle='#f4db9e';ctx.font='bold 15px sans-serif';ctx.textAlign='left';ctx.fillText(laneName(lane),13,23);
 ctx.strokeStyle='#dabb8a88';ctx.strokeRect(1,1,W-2,H-2);
 ctx.restore(); // Unscale the compact 400px viewport.
 const label=$('mpBattleCurrentLane');if(label)label.textContent=laneName(lane);
 $('mpBattleLaneSelect')?.querySelectorAll('[data-mp-lane]').forEach(b=>{const on=battleScope==='lane'&&Number(b.dataset.mpLane)===lane;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
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
   g.fillStyle=teamInk(u.team);g.fillRect(u.x/3,y+h/2,3,Math.min(12,h/3));
  }
  if(snap.fog?.[l]){g.fillStyle='#071521e9';g.fillRect(snap.viewerTeam===0?1100-770/3:0,y,770/3,h);}
  if(l===lane){g.strokeStyle='#efcc9d';g.strokeRect(1,y+1,1098,h-1);g.strokeStyle='#ffe6ad';g.lineWidth=2;g.strokeRect(cameraX/3+1,y+2,1100/3-2,Math.max(5,h-5));g.lineWidth=1;}
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
function renderBattleAugments(){
 const root=$('mpAugmentBattleRoster');
 if(!root)return;
 if(!snap||!isAugmented(snap.ruleset)){root.hidden=true;root.replaceChildren();return;}
 root.hidden=false;
 const myTeam=my()?.team??0;
 const signature=JSON.stringify([snap.players.map(p=>[p.uid,p.team,p.name,p.augments]),global.DesertAugments?.ready?.()]);
 if(root.dataset.signature===signature)return;
 root.dataset.signature=signature;
 root.replaceChildren();
 const header=document.createElement('div');header.className='mp-battle-aug-heading';
 const title=document.createElement('strong');title.textContent='✦ 전투 증강 현황';
 const button=document.createElement('button');button.type='button';button.className='btn outline';button.textContent='전체 효과 비교';
 button.addEventListener('click',()=>$('mpAugmentOpen')?.click?.());
 header.append(title,button);root.append(header);
 const teams=document.createElement('div');teams.className='mp-battle-aug-teams';
 for(const side of [myTeam,1-myTeam]){
  const team=document.createElement('section');team.className='mp-battle-aug-team';
  const all=snap.players.filter(p=>p.team===side);
  const heading=document.createElement('strong');heading.textContent=(side===myTeam?'아군':'상대')+' · 선택 '+all.reduce((n,p)=>n+(p.augments?.length||0),0)+'개';team.append(heading);
  for(const p of all){
   const person=document.createElement('div');person.className='mp-battle-aug-person';
   if(snap.players.length>2){const name=document.createElement('small');name.textContent=p.name||'지휘관';person.append(name);}
   const picks=document.createElement('div');picks.className='mp-battle-aug-picks';
   for(const [index,id] of (p.augments||[]).entries()){
    const card=global.DesertAugments?.card?.(id);
    const details=document.createElement('details'),summary=document.createElement('summary'),desc=document.createElement('p');
    summary.textContent='W'+((global.DesertAugments?.STAGES||[])[index]||'?')+' '+(card?.name||'증강 '+id);
    desc.textContent=card?.description||'카드 설명 로딩 중';
    details.append(summary,desc);picks.append(details);
   }
   if(!picks.childElementCount){const empty=document.createElement('span');empty.textContent='아직 선택 없음';picks.append(empty);}
   person.append(picks);team.append(person);
  }
  teams.append(team);
 }
 root.append(teams);
}
function renderAugmentRoster(){
 const panel=$('mpAugmentRoster'),trigger=$('mpAugmentOpen'),dialog=$('mpAugmentDialog');
 if(!panel||!trigger)return;
 const enabled=!!snap&&isAugmented(snap.ruleset);
 trigger.hidden=!enabled;
 if(!enabled){
  panel.hidden=true;augmentRosterKey='';
  if(dialog?.open)dialog.close();
  return;
 }
 const ownSide=my()?.team??0,own=snap.players.filter(p=>p.team===ownSide),enemy=snap.players.filter(p=>p.team!==ownSide);
 const ownCount=own.reduce((n,p)=>n+(p.augments?.length||0),0);
 const enemyCount=enemy.reduce((n,p)=>n+(p.augments?.length||0),0);
 $('mpAugmentCounts').textContent='아군 '+ownCount+' · 상대 '+enemyCount;
 trigger.setAttribute('aria-label','선택한 양측 증강 보기. 아군 '+ownCount+'개, 상대 '+enemyCount+'개');
 const key=JSON.stringify([snap.players.map(p=>[p.uid,p.team,p.name,p.augments]),!!global.DesertAugments?.ready?.()]);
 if(key===augmentRosterKey)return;
 augmentRosterKey=key;panel.hidden=false;panel.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='양측 증강 현황';
 const note=document.createElement('p');note.textContent='선택 완료된 프리즘을 모두 공개합니다. 카드명을 누르면 효과를 확인할 수 있습니다.';
 const teams=document.createElement('div');teams.className='mp-augment-teams';
 for(const side of [ownSide,1-ownSide]){
  const group=document.createElement('section');group.className='mp-augment-side';
  const h=document.createElement('h4');h.textContent=side===ownSide?'아군 증강':'상대 증강';group.append(h);
  for(const p of snap.players.filter(p=>p.team===side)){
   const who=document.createElement('div');who.className='mp-augment-player';
   const name=document.createElement('strong');name.textContent=p.name||'지휘관';
   who.append(name);
   const cards=document.createElement('div');cards.className='mp-augment-picks';
   for(const [index,id] of (p.augments||[]).entries()){
    const card=global.DesertAugments?.card(id);
    const details=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('p');
    const wave=(global.DesertAugments?.STAGES||[])[index];
    summary.textContent=(wave?'W'+wave+' · ':'')+(card?.name||'증강 정보 불러오는 중');
    body.textContent=card?.description||'증강 카드 설명을 불러오는 중입니다.';
    details.title=body.textContent;details.append(summary,body);cards.append(details);
   }
   if(!cards.childElementCount){const empty=document.createElement('span');empty.textContent='선택 전';cards.append(empty);}
   who.append(cards);group.append(who);
  }
  teams.append(group);
 }
 panel.append(heading,note,teams);
}
function renderAugment(){
 const panel=$('mpAugmentPanel'),choice=snap?.augmentChoice;
 if(!panel)return;
 if(!choice||choice.selected){panel.hidden=true;augmentKey='';return;}
 const key=JSON.stringify([choice.cards,choice.rerolls,choice.tier,choice.round,my()?.augments||[]]);
 const headingText=()=> 'WAVE '+choice.round+' · '+({silver:'실버',gold:'골드',prismatic:'프리즘'}[choice.tier]||choice.tier)+' 증강 · '+Math.ceil(choice.remaining)+'초';
 if(key===augmentKey){
  const heading=panel.querySelector('h3');
  if(heading)heading.textContent=headingText();
  return;
 }
 augmentKey=key;
 panel.hidden=false;panel.replaceChildren();
 const heading=document.createElement('h3');
 heading.textContent=headingText();
 const description=document.createElement('p');description.textContent='프리즘 3장 중 1장 선택 · 카드마다 리롤 1회 · 30초 후 자동 선택';
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
 const history=document.createElement('div');history.className='augment-history-mount';
 history.setAttribute('aria-label','이번 경기에서 이전 웨이브에 선택한 증강');
 global.DesertAugmentHistory?.render?.(history,my()?.augments||[],choice.round);
 panel.append(history);
}
function onSnapshot(v){
 if(!v){snap=null;renderAugmentRoster();renderBattleAugments();global.DesertCombatAudio?.stop?.();return;}if(v.width!==3300||![520,1560].includes(v.height)||!Array.isArray(v.players)||(v.lanes!==undefined&&v.lanes!==(v.mode==='classic'?1:3)))return;
 const fresh=!snap,modeChanged=!snap||snap.mode!==v.mode;
 if(!$('frontLobby').hidden)global.DesertLobby?.enterMatch?.();
 combatAudioSnapshot(v);
 snap=v;lastSnapshotAt=performance.now();$('mpCommand').hidden=false;$('mpViewTabs').hidden=false;
 document.body.dataset.multiArena=v.mode==='classic'?'classic':'triple';
 if(modeChanged){
  const classic=v.mode==='classic';
  $('mpBaseDescription').textContent=classic?'단일 전장 · 75칸':'라인 선택 → 유닛 선택 → 빈 칸에 건설';
  $('mpBattleDescription').textContent=classic?'싱글 크기 전장 · 좌우 드래그':'전체보기 또는 라인 선택 · 파랑 아군 / 빨강 적군 · 좌우 드래그';
 }
 const preparation=!v.ended&&v.wave===0?Math.max(0,(v.preparationEndsAt??E.OPENING_PREP_SECONDS??10)-v.seconds):0;
 const opening=$('mpOpening');if(opening)opening.hidden=preparation<=1e-6;
 const openingNumber=$('mpOpeningSeconds');if(openingNumber)openingNumber.textContent=String(Math.max(0,Math.ceil(preparation-1e-6)));
 if(!v.ended)$('mpStateTag').textContent=preparation>0?'초기 배치 · '+Math.ceil(preparation-1e-6)+'초 뒤 첫 출격':(v.mode==='classic'?'클래식 1:1':practice?'3라인 AI 연습':'3라인 전투')+' · '+'진행 중';
 const battle=$('mpBattleCanvas');if(battle.height!==battleHeight())battle.height=battleHeight();
 const allButton=$('mpBattleLaneSelect')?.querySelector?.('[data-mp-scope="all"]');if(allButton)allButton.hidden=laneCount()===1;
 if(fresh||lane>=laneCount()){lane=laneCount()===1?0:1;cameraX=1100;repairLane=lane;gridKey='';setView('base');setBattleScope(laneCount()===1?'lane':'all');}
 else if(modeChanged)setBattleScope(laneCount()===1?'lane':'all');
 const me=my(),side=me?.team??0;
 if(me){
  $('mpMyResources').textContent=me.cash+' CR';
  const remaining=Math.max(0,(me.ecoReadyAt||0)-v.seconds);
  $('mpMyIncome').textContent=remaining>0?'인컴 중단 '+Math.ceil(remaining)+'초':'+'+Number((E.incomePerTick?.(me.eco)??1).toFixed(2))+' / 0.5초';
  $('mpBuiltCount').textContent=me.buildings.reduce((n,bs)=>n+bs.filter(x=>x!==null).length,0)+'개 건설';
  const cost=E.ecoPrice(me.eco);
  $('mpEco').textContent=me.eco>=7?'채취 건물 7 / 7':'자원채취 건물 · '+cost+' CR';
  $('mpEco').title=ecoTooltip(me.eco,v.seconds);
  $('mpEco').disabled=me.eco>=7||me.cash<cost||remaining>0||v.ended;
 }
 $('mpWave').textContent='WAVE '+String(v.wave).padStart(2,'0');
 const tempo=$('mpCounterTempo');if(tempo){const power=E.counterAdvantage?.(v.wave)??1.55;tempo.textContent='▲ 상성 '+power.toFixed(2)+'×';tempo.dataset.phase=v.wave>=60?'finish':v.wave>=30?'boost':'normal';tempo.title='유리한 병종 상성만 강화됩니다. 기본 피해와 건물 공격 피해는 그대로입니다.';}
 $('mpCountdown').textContent=Math.max(0,v.next).toFixed(1)+'초';
 const traitHud=$('mpFactionTraits');
 if(traitHud){const myTrait=(v.factionTraits||[]).find(x=>x.uid===myId),faction=global.DesertRoster?.FACTIONS?.[me?.faction];
  traitHud.hidden=!faction;
  if(faction){traitHud.textContent=faction.name;traitHud.title=faction.bonus+(myTrait&&myTrait.faction===1?' · 공생충 '+myTrait.births+'/10':'');}}
 const marineHud=$('mpMarineAbilities');
 if(marineHud){const info=(v.marineOps||[]).find(o=>o.uid===myId);marineHud.hidden=true;
  if(info&&traitHud)traitHud.title+=' · '+'★ 해병 특성 | 긴빠이 '+info.loot+'회 (+'+info.lootedCR+' CR) | 자진입대 '+info.recruits+'회 · 이번 웨이브 '+info.waveRecruits+'/2 | 황룡 '+info.huangSpawns+'기 | 오도봉고 '+info.bongoCharges+'회';}
 const f=document.createDocumentFragment();
 for(let l=0;l<laneCount();l++){
  const status=side===0?v.lanePressure[l]:1-v.lanePressure[l];
  const el=document.createElement('div');el.className=status<.42?'under-pressure':status>.58?'pushing':'';
  el.textContent=laneName(l)+' · '+(status<.42?'열세':status>.58?'우세':'교착')+' / 아군 '+Math.ceil(v.cores[l][side])+' · 적군 '+Math.ceil(v.cores[l][1-side]);
  f.append(el);
 }
 $('mpLaneSummary').replaceChildren(f);
 if(v.ended){
  $('mpStateTag').textContent=v.winner===null?'무승부':v.winner===side?'승리':'패배';
  const key=(practice?'practice':lobby?.id||'unknown')+':'+(v.mode||'')+':'+String(v.winner);
  if(resultKey!==key){
   resultKey=key;
   global.DesertLobbyMusic?.stopBattle?.();
   global.DesertCombatAudio?.stop?.();
   if(practice&&!practiceRecorded){practiceRecorded=true;global.DesertCareer?.record?.({mode:'practice',size:1,side:0,winner:v.winner,faction:me?.faction??faction(),wave:v.wave,seconds:v.seconds,online:false});}
   if(!practice)global.DesertLobby?.completeMultiplayer?.({winner:v.winner,side,matchId:lobby?.id||'unknown',mode:v.mode,size:v.size,wave:v.wave,seconds:v.seconds,faction:me?.faction??faction()});
   global.DesertBattleReport?.showMulti?.(v,myId,{serverStatus:practice?'연습 기록 저장 완료':'경기 결과 저장 중…'});
   if(!practice)void NET.reportWinner?.(v.winner);
  }
 }
 renderAugment();renderAugmentRoster();renderBattleAugments();unitCards();buildGrid();upgradeInfo();renderTacticalPositions();drawOverview();
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
 practiceRecorded=false;resultKey='';global.DesertBattleReport?.hideMulti?.();
 if(isAugmented($('mpRuleset').value))await global.DesertAugments.load();
 if(lobby)return message('온라인 방에서 나간 뒤 연습할 수 있습니다.');
 myId='local';
 const difficulty=global.DesertLobby?.aiDifficulty?.()||'normal';
 const mode=$('mpMode').value==='classic'?'classic':'pvp';
 practice=E.create({mode,size:1,aiDifficulty:difficulty,ruleset:$('mpRuleset').value,seed:Date.now()>>>0,members:[{uid:'local',name:'연습 지휘관',team:0,faction:faction(),skin:skin()},{uid:'AI_local',name:'적 AI',team:1,faction:(faction()+1)%10,bot:true}]});
 // Use untouched authoritative bot setup, matching live host-created bot teams.
 $('mpStateTag').textContent=(global.DesertLobby?.difficultyLabel?.(difficulty)||'보통')+' AI 연습';message((mode==='classic'?'클래식 1:1':'3라인')+' AI 연습 시작');
 let last=performance.now();
 practiceTimer=setInterval(()=>{const now=performance.now();practice.tick(Math.min(.16,(now-last)/1000));last=now;onSnapshot(practice.snapshot('local'));},100);
 onSnapshot(practice.snapshot('local'));uiButtons();
}
async function leave(){
 global.DesertBattleReport?.hideMulti?.();resultKey='';
 if(practice){clearInterval(practiceTimer);practiceTimer=null;practice=null;practiceRecorded=false;myId='';snap=null;$('mpCommand').hidden=true;$('mpStateTag').textContent='연결 전';message('연습 종료');}
 else{await NET.leave();snap=null;$('mpCommand').hidden=true;}
 $('mpViewTabs').hidden=true;setView('base');
 lane=1;cameraX=1100;repairLane=1;battleScope='all';role=0;demolish=false;gridKey='';cardsKey='';counterKey='';augmentKey='';augmentRosterKey='';$('mpAugmentPanel').hidden=true;
 renderAugmentRoster();renderBattleAugments();
 delete document.body.dataset.multiArena;
 uiButtons();
}
function runClick(fn){return ()=>Promise.resolve().then(fn).catch(e=>message(global.IronFirebase?.message?.(e)||e.message||String(e)));}
function init(){
 $('mpViewTabs').addEventListener('click',e=>{const target=e.target.closest('[data-mp-view]');if(target)setView(target.dataset.mpView,true);});
 $('mpAugmentOpen')?.addEventListener('click',()=>{
  if(!isAugmented(snap?.ruleset))return;
  renderAugmentRoster();
  const dialog=$('mpAugmentDialog');
  if(dialog&&!dialog.open)dialog.showModal();
 });
 $('mpAugmentClose')?.addEventListener('click',()=>$('mpAugmentDialog')?.close());
 $('mpAugmentDialog')?.addEventListener('click',e=>{
  if(e.target===e.currentTarget)e.currentTarget.close();
 });

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
  pickLane(Math.floor((e.clientY-r.top)/r.height*laneCount()),true);setBattleScope('lane');
 });
 const mapCanvas=$('mpBattleCanvas');
 let drag=null,suppressMapClick=false;
 mapCanvas.addEventListener('pointerdown',e=>{
  if(e.button!==undefined&&e.button!==0)return;
  drag={id:e.pointerId,x:e.clientX,from:cameraX,moved:false};
  mapCanvas.setPointerCapture?.(e.pointerId);
 });
 mapCanvas.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const r=mapCanvas.getBoundingClientRect(),delta=(e.clientX-drag.x)/r.width*1100;
  if(Math.abs(delta)>7)drag.moved=true;
  if(drag.moved){cameraX=Math.max(0,Math.min(E.WIDTH-1100,drag.from-delta));draw();}
 });
 mapCanvas.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId){suppressMapClick=drag.moved;drag=null;}});
 mapCanvas.addEventListener('pointercancel',()=>{drag=null;});
 mapCanvas.addEventListener('click',e=>{
  if(!snap)return;
  if(suppressMapClick){suppressMapClick=false;return;}
  const r=mapCanvas.getBoundingClientRect(),sx=(e.clientX-r.left)/r.width*1100,sy=(e.clientY-r.top)/r.height*520;
  const world=global.IsoWorld?.unproject?.(sx+cameraX,sy)||{x:sx+cameraX,y:sy};
  const closest=snap.units.filter(u=>u.lane===lane).map(u=>({unit:u,distance:Math.hypot(u.x-world.x,u.y-lane*520-world.y)}))
   .filter(v=>v.distance<65).sort((a,b)=>a.distance-b.distance)[0]?.unit;
  if(closest){
   const name=global.DesertRoster?.FACTIONS?.[closest.faction]?.units?.[closest.role]||E.NAMES[closest.role];
   $('mpInspect').textContent=(closest.team===my()?.team?'아군':'적군')+' · '+name+' · HP '+Math.ceil(closest.hp)+' / '+Math.ceil(closest.maxHP)+' · '+laneName(lane)+(closest.guardian?' · 가디언':'');
  }else $('mpInspect').textContent=laneName(lane)+' 전장 · 드래그로 좌우 이동';
 });
 $('mpBattleLaneSelect')?.addEventListener('click',e=>{
  const all=e.target.closest('[data-mp-scope="all"]');
  if(all&&laneCount()>1){setBattleScope('all');return;}
  const b=e.target.closest('[data-mp-lane]');
  if(b){pickLane(Number(b.dataset.mpLane));setBattleScope('lane');}
 });
 $('mpAllBattleCanvas')?.addEventListener('click',e=>{
  if(!snap)return;
  const r=e.currentTarget.getBoundingClientRect();
  const chosen=Math.min(laneCount()-1,Math.max(0,Math.floor((e.clientY-r.top)/r.height*laneCount())));
  const focus=((e.clientX-r.left)/r.width)*E.WIDTH;
  cameraX=Math.max(0,Math.min(E.WIDTH-1100,focus-550));
  pickLane(chosen);setBattleScope('lane');
 });
 $('mpPanLeft')?.addEventListener('click',()=>panCamera(-500));
 $('mpPanRight')?.addEventListener('click',()=>panCamera(500));
 $('mpPanCenter')?.addEventListener('click',()=>{cameraX=1100;draw();});
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
  message('방을 만드는 중…');
  if(isAugmented($('mpRuleset').value))await global.DesertAugments.load();
  await NET.create({mode:$('mpMode').value,size:Number($('mpSize').value),ruleset:$('mpRuleset').value,publicRoom:$('mpPublicCheck').checked,name:$('mpName').value,faction:faction(),skin:skin()});
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
   opt.textContent=room.code+' · '+(room.mode==='classic'?'클래식':room.mode==='coop'?'협동':'3라인 PvP')+' · '+(room.ruleset==='prism'?'프리즘 모드':room.ruleset==='augment'?'증강전':'일반전')+' · '+room.members+'/'+room.capacity;
   select.append(opt);
  }
  $('mpBrowseStatus').textContent=rooms.length+'개 공개방 검색 완료';
 }));
 $('mpJoinPublic').addEventListener('click',()=>{const code=$('mpPublicList').value;if(!code){message('참가할 공개방을 선택하세요.');return;}
  $('mpRoomCode').value=code;$('mpJoin').click();});
 $('mpLeave').addEventListener('click',runClick(leave));
 $('mpResultLobby').addEventListener('click',runClick(()=>global.DesertLobby?.returnToLobby?.()));
 $('mpResultRetry').addEventListener('click',runClick(()=>NET.retryResult?.()));
 NET.configure({status:message,room:onRoom,snapshot:onSnapshot,peers:uiButtons,
  serverResult:data=>{
   const label=data?.state==='done'?'승패·RP 기록 완료':data?.state==='abandoned'?'경기 중단 · 서버 기록 확인 필요':data?.state==='error'?'⚠ 서버 결과 전송 실패 · 자동 재시도 중: '+(data.error||'연결을 확인하세요'):data?.waiting_for_other_players?'✓ 내 결과 서버 접수 완료 · 상대 결과 확인 대기':data?.state==='untracked'?'비공식 경기 · 서버 결과 기록 없음':'서버 결과 확인 중…';
   global.DesertBattleReport?.serverStatus?.(label);
   $('mpResultRetry').hidden=data?.state!=='error';
  },forcedResult:data=>{
   if(!snap||snap.ended)return;
   onSnapshot({...snap,ended:true,winner:data.winner_team});
   global.DesertBattleReport?.serverStatus?.('탈주 판정 · 승패·RP 기록 완료');
   message('서버 판정: 상대 연결 종료 · '+(data.winner_team===my()?.team?'승리':'패배')+' 처리');
  }});
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
