/* Brood War specialist unit gameplay.
 * Support workers, medic heals, stealth detection, Vulture mines, suicide splash,
 * and user-commanded cargo transport. Core stat and spell research untouched.
 */
(() => {
 'use strict';
 const oldSpawn=spawn,oldTick=tick,oldStrike=strike,oldCanHit=canHit,oldDraw=draw,oldDrawPrototype=drawPrototypeUnit,oldUpdateCommands=updateCommands;
 const mechanical=new Set(['vulture','siegetank','goliath','wraith','dropship','valkyrie','battlecruiser']);
 const biological=new Set(['marine','firebat','ghost','medic','scv','zergling','hydra','ultra','lurker','mutalisk','guardian','devourer','scourge','drone','infestedTerran','broodling']);
 const carrierCrew={dropship:['marine','firebat'],shuttle:['zealot','dragoon'],overlord:['zergling','hydra']};
 let activeMines=0;
 const friendlySide=(a,b)=>a.enemy===b.enemy&&!a.neutral&&!b.neutral;
 const within=(a,b,r)=>distance(a,b)<=r;
 const detectors=(b,observerTeam)=>units.some(x=>x.hp>0&&x.enemy===observerTeam&&TYPES[x.type]?.detector&&within(x,b,255));
 function revealedTo(target,attacker){
  if(!target||target.core)return true;
  const stealth=target.type==='spidermine'&&target.burrowed||target.type==='observer'||target.type==='ghost'&&target.cloakOn;
  return !stealth||detectors(target,attacker.enemy)||within(attacker,target,target.type==='spidermine'?93:44);
 }
 canHit=function(attacker,target){
  if(!attacker||!TYPES[attacker.type]||TYPES[attacker.type].support)return false;
  if(!revealedTo(target,attacker))return false;
  return oldCanHit(attacker,target);
 };
 function makeCargo(owner,type){
  const soldier=oldSpawn(type,owner.enemy,owner.x,owner.y,false);
  // Cargo is detached from the battlefield; it cannot be hit or act until unloading.
  units=units.filter(u=>u.id!==soldier.id);
  soldier.inTransport=owner.id;
  return soldier;
 }
 spawn=function(type,enemy,x,y,hero=false){
  const unit=oldSpawn(type,enemy,x,y,hero);
  if(type==='vulture')unit.minesRemaining=3;
  if(type==='medic'){unit.healEnergy=80;unit.recharge=0}
  if(type==='ghost'){unit.cloakEnergy=100;unit.cloakOn=!!enemy&&battleMode==='defense'&&wave>=31}
  if(type==='spidermine'){unit.burrowed=false;unit.mineWarmup=1.1;unit.order={type:'hold',x,y,target:null}}
  if(type==='broodling')unit.lifeRemaining=TYPES.broodling.timedLife;
  if(TYPES[type].transport){
   unit.cargo=[];unit.capacity=TYPES[type].transport;unit.unloaded=false;
   if(enemy&&battleMode==='defense'&&!unit.neutral){
    unit.cargo=carrierCrew[type].map(t=>makeCargo(unit,t));
    unit.order={type:'move',x:HOME.x+750,y:clamp(y,100,H-100),target:null};
   }
  }
  if(TYPES[type].support&&!TYPES[type].transport&&enemy&&battleMode==='defense'){
   unit.order={type:'move',x:HOME.x+400,y:clamp(y,125,H-125),target:null};
  }
  return unit;
 };
 function unitsNearby(u,area,condition){
  let best=null,score=Infinity;
  for(const v of units){
   if(v===u||v.hp<=0||!friendlySide(u,v)||!condition(v))continue;
   const d=distance(u,v);
   if(d<area&&d<score){best=v;score=d}
  }
  return best;
 }
 function unload(u,enemyDrop=false){
  if(!u.cargo?.length)return 0;
  const crew=u.cargo.splice(0),total=crew.length;
  crew.forEach((v,i)=>{
   const a=i*2.4,n=36+i*5;
   v.enemy=u.enemy;v.neutral=false;v.inTransport=0;
   v.x=clamp(u.x+Math.cos(a)*n,28,W-28);v.y=clamp(u.y+Math.sin(a)*n,28,H-28);
   v.order={type:enemyDrop?'attackmove':'guard',x:enemyDrop?HOME.x:v.x,y:enemyDrop?HOME.y:v.y,target:null};
   v.engagedTargetId=0;v.orders=[];units.push(v);
  });
  particle(u.x,u.y,'#b7e4ff',42);
  u.unloaded=true;return total;
 }
 function selectedTransport(){
  return chosen().find(u=>u.capacity>0&&u.hp>0)||null;
 }
 function loadNearest(){
  const carrier=selectedTransport();
  if(!carrier){notify('드랍십·셔틀·오버로드를 먼저 선택하세요');return}
  const candidates=units.filter(u=>u!==carrier&&u.hp>0&&friendlySide(carrier,u)&&!TYPES[u.type].flying&&!u.fixed&&u.type!=='darkarchon'&&!u.inTransport)
   .sort((a,b)=>distance(carrier,a)-distance(carrier,b));
  let slots=carrier.capacity-(carrier.cargo||[]).reduce((n,u)=>n+(TYPES[u.type].size==='large'?4:TYPES[u.type].size==='medium'?2:1),0);
  let loaded=0;
  for(const u of candidates){
   const weight=TYPES[u.type].size==='large'?4:TYPES[u.type].size==='medium'?2:1;
   if(distance(carrier,u)>160||weight>slots)continue;
   slots-=weight;u.inTransport=carrier.id;carrier.cargo.push(u);selected.delete(u.id);
   units=units.filter(v=>v.id!==u.id);loaded++;
   if(!slots)break;
  }
  notify(loaded?'탑승 '+loaded+'기 · 수송 여유 '+slots:'160px 안에 탑승 가능한 아군이 없습니다');
  refreshSelection(true);
 }
 function unloadSelected(){
  const ships=chosen().filter(u=>u.capacity>0);
  if(!ships.length){notify('수송선을 먼저 선택하세요');return}
  const count=ships.reduce((n,u)=>n+unload(u,false),0);
  notify(count?'하차 완료 · '+count+'기':'수송선에 병력이 없습니다');
  refreshSelection(true);
 }
 function placeMines(){
  const vultures=chosen().filter(u=>u.type==='vulture'&&u.minesRemaining>0&&u.hp>0);
  if(!vultures.length){notify('지뢰가 남은 벌처를 선택하세요');return}
  let deployed=0;
  for(const v of vultures){
   if(units.filter(u=>u.type==='spidermine'&&u.hp>0).length>=55)break;
   const mine=spawn('spidermine',v.enemy,clamp(v.x+Math.cos(v.face+Math.PI)*32,30,W-30),clamp(v.y+Math.sin(v.face+Math.PI)*32,30,H-30));
   mine.burrowed=false;v.minesRemaining--;deployed++;
  }
  notify(deployed+'개 스파이더 마인 설치 · 지상 폭발 및 아군 오폭 주의');refreshSelection(true);
 }
 function toggleGhost(){
  const ghosts=chosen().filter(u=>u.type==='ghost'&&u.hp>0);
  if(!ghosts.length){notify('고스트를 선택하세요');return}
  let on=0;
  for(const g of ghosts){if(!g.cloakOn&&g.cloakEnergy<30)continue;g.cloakOn=!g.cloakOn;if(g.cloakOn)on++}
  notify(on?'고스트 은신 활성화 · 에너지 지속 소비':'고스트 은신 해제');refreshSelection(true);
 }
 function explosiveHit(u,target){
  const mine=u.type==='spidermine',damageAmount=u.damage??TYPES[u.type].damage;
  const outer=mine?82:120,mid=mine?45:70,inner=mine?20:35;
  const hit={x:target.x,y:target.y};
  if(target.core)damage(target,damageAmount,u,'explosive');
  for(const v of units){
   if(v.hp<=0||v===u||TYPES[v.type].flying)continue;
   const d=distance(v,hit),scale=d<=inner?1:d<=mid?.5:d<=outer?.25:0;
   if(scale)damage(v,damageAmount*scale,u,'explosive'); // includes FRIENDLY FIRE
  }
  particle(hit.x,hit.y,mine?'#ffca75':'#b1fd6d',outer);
  u.hp=0;corpses.push({type:u.type,x:u.x,y:u.y,face:u.face,age:0,hero:u.hero});
  return true;
 }
 strike=function(u,t){
  if(u?.type==='spidermine'||u?.type==='infestedTerran'){
   u.cool=999;u.attackTimer=.3;return explosiveHit(u,t);
  }
  return oldStrike(u,t);
 };
 function supportTick(dt){
  if(paused||over)return;
  const active=units.filter(u=>u.hp>0&&(u.type==='scv'||u.type==='medic'||u.type==='ghost'||u.type==='broodling'||u.type==='spidermine'||u.type==='observer'||u.type==='vulture'||u.capacity));
  for(const u of active){
   u.extraPulse=(u.extraPulse||0)+dt;
   if(u.type==='broodling'){u.lifeRemaining-=dt;if(u.lifeRemaining<=0)u.hp=0;continue}
   if(u.type==='ghost'){
    u.cloakEnergy=Math.min(200,(u.cloakEnergy||0)+(u.cloakOn?-4.5:.75)*dt);
    if(u.cloakEnergy<2)u.cloakOn=false;
   }
   if(u.type==='spidermine'){
    u.mineWarmup=Math.max(0,u.mineWarmup-dt);
    if(!u.burrowed&&u.mineWarmup<=0){u.burrowed=true;u.order={type:'hold',x:u.x,y:u.y,target:null}}
    if(u.burrowed&&u.hp>0){
     let opponent=null,near=145;
     for(const v of units)if(v.hp>0&&v.enemy!==u.enemy&&!TYPES[v.type].flying&&!v.fixed){const d=distance(u,v);if(d<near){near=d;opponent=v}}
     if(opponent){u.burrowed=false;u.order={type:'attackmove',x:opponent.x,y:opponent.y,target:opponent.id}}
    }
    continue;
   }
   if(u.type==='medic'){
    u.healEnergy=Math.min(200,(u.healEnergy||0)+dt*.75);
    if(u.healEnergy<1)continue;
    const v=unitsNearby(u,135,x=>biological.has(x.type)&&x.hp<x.max);
    if(v){
     const amount=Math.min(v.max-v.hp,dt*12,u.healEnergy*2);
     v.hp+=amount;u.healEnergy-=amount/2;
     if(u.extraPulse>.85){particle(v.x,v.y,'#a4ffc8',15);u.extraPulse=0}
    }
   } else if(u.type==='scv'){
    const v=unitsNearby(u,120,x=>mechanical.has(x.type)&&x.hp<x.max);
    if(v){
     v.hp=Math.min(v.max,v.hp+dt*7.5);
     if(u.extraPulse>.85){particle(v.x,v.y,'#efda8b',16);u.extraPulse=0}
    }
   }else if(u.type==='observer'){
    // Automatic escort, making the detection role useful even without weapons.
    if(u.order.type==='guard'&&u.extraPulse>1.25){
     const guards=units.filter(x=>x.hp>0&&friendlySide(u,x)&&x!==u&&!TYPES[x.type].support);
     if(guards.length){const ally=guards.reduce((p,c)=>!p||distance(c,u)<distance(p,u)?c:p,null);
      if(ally&&distance(ally,u)>120)u.order={type:'move',x:ally.x,y:ally.y,target:null}}
     u.extraPulse=0;
    }
   }else if(u.type==='vulture'&&u.enemy&&battleMode==='defense'&&u.minesRemaining>0&&u.extraPulse>13){
    const enemy=units.find(x=>x.hp>0&&x.enemy!==u.enemy&&!TYPES[x.type].flying&&!x.fixed&&distance(x,u)<260);
    if(enemy&&units.filter(x=>x.type==='spidermine'&&x.hp>0).length<50){
     const mine=spawn('spidermine',true,u.x-22,u.y+24);mine.burrowed=false;u.minesRemaining--;
    }
    u.extraPulse=0;
   }
   if(u.capacity&&u.enemy&&battleMode==='defense'&&!u.unloaded&&u.cargo.length){
    if(u.x<HOME.x+850||u.hp<u.max*.38){
     unload(u,true);
     // After delivery move the transport toward the edge; no fake gunfire.
     u.order={type:'move',x:W-190,y:u.y,target:null};
    }
   }
  }
  units=units.filter(u=>u.hp>0);
 }
 tick=function(dt){oldTick(dt);supportTick(dt)};
 // Add the missing unit's recognizable silhouettes directly in Canvas (no broken
 // image URLs or external copyrighted graphics; sprite atlases can replace them).
 drawPrototypeUnit=function(u,d,w){
  if(!EXTRA_UNIT_TYPES[u.type])return oldDrawPrototype(u,d,w);
  const r=Math.max(7,d.r*.8),f=Math.sin(u.frameTime*8);
  ctx.save();
  ctx.translate(0,d.flying?-8+f*2:u.moving?Math.abs(f)*2:0);
  ctx.rotate((u.face||0)+Math.PI/2);
  ctx.lineWidth=3;ctx.strokeStyle=d.color;ctx.fillStyle=d.race==='terran'?'#394755':d.race==='zerg'?'#53364f':'#3d455b';
  ctx.beginPath();
  if(['dropship','shuttle','observer','interceptor'].includes(u.type)){
   ctx.moveTo(0,-r*1.5);ctx.lineTo(-r*1.7,r*.7);ctx.lineTo(-r*.45,r*.2);ctx.lineTo(0,r*.7);ctx.lineTo(r*.45,r*.2);ctx.lineTo(r*1.7,r*.7);
  }else if(u.type==='overlord'){
   ctx.ellipse(0,-3,r*1.6,r*1.1,0,0,Math.PI*2);
  }else if(u.type==='spidermine'){
   for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}
  }else{
   ctx.moveTo(0,-r*1.3);ctx.lineTo(-r*.72,-r*.45);ctx.lineTo(-r*.63,r*.82);ctx.lineTo(r*.63,r*.82);ctx.lineTo(r*.72,-r*.45);
  }
  ctx.closePath();ctx.fill();ctx.stroke();
  if(['scv','probe','drone','medic'].includes(u.type)){
   ctx.strokeStyle='#dff5fa';ctx.beginPath();ctx.arc(0,-r*.4,r*.38,0,Math.PI*2);ctx.stroke();
   for(const dir of [-1,1]){ctx.beginPath();ctx.moveTo(dir*r*.55,0);ctx.lineTo(dir*r*1.22,r*.75+f*1.5);ctx.stroke()}
  }
  if(u.type==='ghost'){ctx.fillStyle='#a3fece';ctx.fillRect(-r*.28,-r*.9,r*.55,r*.25);ctx.fillRect(-r*.12,-r*1.6,r*.25,r)}
  if(u.type==='medic'){ctx.strokeStyle='#fffcf0';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(7,0);ctx.moveTo(0,-7);ctx.lineTo(0,7);ctx.stroke()}
  if(u.type==='overlord'){ctx.strokeStyle='#d4bddc';for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*r*.8,0);ctx.lineTo(side*r*1.2,r*1.4);ctx.stroke()}}
  ctx.restore();return true;
 };
 draw=function(){
  oldDraw();
  for(const u of units){
   if(u.hp<=0||(!u.cloakOn&&!(u.type==='spidermine'&&u.burrowed)))continue;
   ctx.save();ctx.strokeStyle=u.enemy?'#e8a3d277':'#8fdff477';ctx.lineWidth=2;ctx.setLineDash([4,6]);ctx.beginPath();ctx.arc(u.x,u.y,TYPES[u.type].r+12,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
  }
  for(const p of projectiles){
   const source=units.find(u=>u.id===p.ownerId);
   if(source?.type!=='carrier')continue;
   ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#f1ebbd';ctx.strokeStyle='#9cf8ff';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(-10,6);ctx.lineTo(0,2);ctx.lineTo(10,6);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
 };
 const grid=document.querySelector('.commandsPanel .commandGrid')||document.querySelector('.commandGrid');
 const buttons=[
  ['load','⇧','병력 탑승',loadNearest],
  ['unload','⇩','병력 하차',unloadSelected],
  ['mine','✹','마인 설치',placeMines],
  ['cloak','◈','고스트 은신',toggleGhost]
 ];
 const UI={};
 if(grid)for(const [key,icon,label,run] of buttons){
  const b=document.createElement('button');b.className='command';b.dataset.extraCommand=key;
  b.innerHTML=icon+' <small>'+label+'</small>';b.title=label;
  b.onclick=run;grid.appendChild(b);UI[key]=b;
 }
 updateCommands=function(){
  oldUpdateCommands();
  const chosenUnits=chosen(),transport=chosenUnits.some(u=>u.capacity>0),vultures=chosenUnits.some(u=>u.type==='vulture'&&u.minesRemaining>0),ghosts=chosenUnits.some(u=>u.type==='ghost');
  for(const [key,b] of Object.entries(UI)){
   const visible=key==='load'||key==='unload'?transport:key==='mine'?vultures:ghosts;
   b.hidden=!visible;b.disabled=!visible||key==='unload'&&!chosenUnits.some(u=>u.cargo?.length);
   if(key==='cloak')b.innerHTML='◈ <small>'+ (chosenUnits.some(u=>u.type==='ghost'&&u.cloakOn)?'은신 해제':'고스트 은신')+'</small>';
   if(key==='unload')b.title='탑승 병력 '+chosenUnits.reduce((n,u)=>n+(u.cargo?.length||0),0)+'기 하차';
  }
 };
 const API=Object.freeze({
  types:EXTRA_UNIT_LIST.slice(),load:loadNearest,unload:unloadSelected,placeMines,toggleGhost,
  detection:(unit,team)=>detectors(unit,team),
  cargoCount:u=>u.cargo?.length||0,
  transportDrop:unload
 });
 window.DarkArchonExtraUnits=API;
})();
