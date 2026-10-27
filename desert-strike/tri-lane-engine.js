/* Desert Front — 3-line authoritative multiplayer combat kernel.
 * No DOM, Firebase or browser dependency. One host simulates; clients send orders.
 * Area: original 3300 x 520 -> 3300 x 1560 (one shared 1560-high battle world with 3 deployment bands).
 */
(function(global){
'use strict';
const LANES=3,WIDTH=3300,HEIGHT=1560,LANE_H=520,COLS=15,ROWS=5,SLOTS=COLS*ROWS;
const TOWER_HP=1250,TOWER_RANGE=285,TOWER_PERIOD=.34,TOWER_DAMAGE=27,FOG_END_WAVE=6,FOG_WIDTH=770;
const AGGRO_RADIUS=590,AGGRO_LEASH=740,SUPPORT_RADIUS=615,CONTACT_CELL=64;
const COST=[65,95,150,205,165,245,205,145], NAMES=['돌격','사격','대장갑','장갑','대공','포격','특수','지원'];
const BASE=[
 [115,21,1,29,.77,82,false,'ground'],
 [108,17,1,164,.8,60,true,'ground'],
 [94,47,0,208,1.76,49,true,'ground'],
 [390,32,9,120,1.27,35,false,'ground'],
 [175,16,3,228,.57,47,true,'ground'],
 [114,69,0,317,2.55,30,false,'ground'],
 [160,24,1,149,.86,92,true,'air'],
 [136,0,1,139,1.24,61,false,'ground']
];
const clamp=(v,l,r)=>Math.max(l,Math.min(r,v));
const MARINE_LOOT_CHANCE=.08,MARINE_RECRUIT_CHANCE=.23,MARINE_RECRUIT_HP=.10,MARINE_RECRUIT_CAP=2,HUANGLONG_INTERVAL=8;
const BROOD_BIRTH_CHANCE=.20,BROOD_BIRTH_COOLDOWN=11,BROOD_BIRTH_CAP=10,BROOD_ALIVE_CAP=14;
const OCTOPER_REGEN=.0006,ROBOT_REPAIR=.0015;
const INK_DURATION=2.5,INK_COOLDOWN=5;
const GOODS=[[5,7],[0,7],[3,4],[1,4],[6],[1,4],[0,3],[3,1]];
const BADS=[[3,1],[3,5],[0,1],[2,6],[3,2],[0,6],[4,1],[0,5]];
function definition(faction,role){
 const shared=global.DesertRoster?.getDef;
 if(typeof shared==='function')return shared(role,faction);
 const t=BASE[role],mut=[[1.055,1,.96],[.995,1,1.12],[.99,1.09,1],[1.09,1.06,1.01],[1,1,1.02],[.94,1,.99],[1.02,1,1.07],[1.07,1,.99],[.99,1,1.01],[.84,1,1.01]][faction]||[1,1,1];
 const beast=faction===4,elf=faction===5,furry=faction===6,robot=faction===7,octo=faction===8,fairy=faction===9,bongo=faction===3&&role===6,prowler=beast&&role===6,wolfRider=furry&&role===6,groundSpecial=role===6&&[3,4,6,7].includes(faction);
 const melee=(beast||furry)&&[0,3,6].includes(role),ranged=elf&&[1,2,4,5,6].includes(role);
 return {
  hp:bongo?565:t[0]*2.25*mut[0]*(elf&&role===0?.88:beast&&role===3?1.05:1),
  damage:bongo?36:prowler?33:wolfRider?32:t[1]*.94*mut[1]*(beast?(melee?1.08:.83):elf?(ranged?1.045:role===0?.84:1):furry?(melee?1.10:.93):robot&&[1,2,4,5].includes(role)?1.08:octo&&[2,4,5].includes(role)?1.16:1),
  armor:bongo?7:prowler?3:groundSpecial&&robot?5:t[2],
  range:bongo?43:prowler?40:wolfRider?42:t[3]*(ranged?1.10:robot&&[1,2,4,5].includes(role)?1.04:1),
  rate:bongo?1.45:prowler?.95:wolfRider?.9:t[4],
  speed:bongo?77:prowler?90:t[5]*mut[2]*.84*(melee?1.05:1),
  airTarget:groundSpecial&&!robot?false:t[6],
  kind:groundSpecial?'ground':t[7],
  heal:(role===7?36:0)*mut[1]*1.5*(robot?.85:fairy?.90:1),
  blast:role===5?(octo?58*1.15:58):0,
  good:bongo||prowler?[0,7]:groundSpecial&&furry?[0,7]:groundSpecial&&robot?[0,3]:GOODS[role],bad:bongo||prowler?[2,3]:groundSpecial&&furry?[2,3]:groundSpecial&&robot?[2,5]:BADS[role]
 };
}
function combatDef(u){
 const d=definition(u.faction,u.role);
 return u.isHatchling?{...d,hp:1,damage:5,range:24,rate:1.28,speed:108,armor:0,airTarget:false,kind:'ground'}:d;
}
function roomPlayers(input){const x=Array.isArray(input)?input:Object.values(input||{});return x.map(p=>({uid:String(p.uid||p.id||''),name:String(p.name||'지휘관').slice(0,16),team:Number(p.team),faction:Number(p.faction),skin:['default','twilight','aurora','gold'].includes(p.skin)?p.skin:'default',bot:!!p.bot}));}
function create({mode='pvp',size=1,members=[]}={}){
 if(!['pvp','coop'].includes(mode)||!Number.isInteger(size)||size<1||size>3||(mode==='coop'&&size<2))throw Error('경기 모드/인원 오류');
 const humans=roomPlayers(members);
 if(humans.some(p=>!p.uid||p.team<0||p.team>1||p.faction<0||p.faction>9)||new Set(humans.map(p=>p.uid)).size!==humans.length)throw Error('부적절한 참가자 목록');
 if(mode==='coop'&&(humans.length!==size||humans.some(p=>p.team!==0)))throw Error('협동 인원과 팀이 일치하지 않습니다');
 if(mode==='pvp'&&(humans.filter(p=>p.team===0).length!==size||humans.filter(p=>p.team===1).length!==size))throw Error('경쟁 양 팀 인원이 일치하지 않습니다');
 const players=humans.concat(mode==='coop'?Array.from({length:size},(_,i)=>({uid:'AI_'+i,name:'적 AI '+(i+1),team:1,faction:(i+3)%10,bot:true})):[]);
 const state={mode,size,seconds:0,wave:0,next:24,ended:false,winner:null,
  width:WIDTH,height:HEIGHT,lanes:LANES,
  cores:Array.from({length:LANES},()=>[2500,2500]),turrets:Array.from({length:LANES},()=>[TOWER_HP,TOWER_HP]),towerCooldown:Array.from({length:LANES},()=>[0,0]),units:[],effects:[],nextUnit:1,marineSupports:[],marineRecruitCount:new Map(),marineStats:{loot:0,lootedCR:0,recruits:0,huangSpawns:0,bongoCharges:0},marineStatsByUid:new Map(),broodBirthsByUid:new Map(),broodTotalByUid:new Map(),players:players.map(p=>({...p,cash:360,eco:0,buildings:Array.from({length:3},()=>Array(SLOTS).fill(null))})),lanePressure:[.5,.5,.5]};
 const byUid=uid=>state.players.find(p=>p.uid===uid);
 function marineRecord(uid,key,amount=1){
  const v=state.marineStatsByUid.get(uid)||{loot:0,lootedCR:0,recruits:0,huangSpawns:0,bongoCharges:0};
  v[key]=(v[key]||0)+amount;state.marineStatsByUid.set(uid,v);
 }
 function broodLay(parent,target,roll=Math.random){
  if(parent.faction!==1||parent.isHatchling||parent.conscripted||parent.role===7||parent.hp<=0
   ||!target||target.team===parent.team)return;
  const uid=parent.uid,used=state.broodBirthsByUid.get(uid)||0;
  if(used>=BROOD_BIRTH_CAP||state.seconds-(parent.lastBroodBirth??-999)<BROOD_BIRTH_COOLDOWN
   ||state.units.filter(u=>u.hp>0&&u.uid===uid&&u.isHatchling).length>=BROOD_ALIVE_CAP
   ||state.units.filter(u=>u.hp>0&&u.team===parent.team&&u.lane===parent.lane).length>=75
   ||roll()>=BROOD_BIRTH_CHANCE)return;
  parent.lastBroodBirth=state.seconds;
  state.broodBirthsByUid.set(uid,used+1);
  state.broodTotalByUid.set(uid,(state.broodTotalByUid.get(uid)||0)+1);
  const x=clamp(parent.x+(parent.team===0?18:-18),35,WIDTH-35),y=clamp(parent.y+(roll()-.5)*35,35,HEIGHT-35);
  const lane=clamp(Math.floor(y/LANE_H),0,LANES-1);
  state.units.push({...parent,id:state.nextUnit++,role:0,lane,x,y,hp:1,maxHP:1,radius:8,
    isHatchling:true,conscripted:false,killed:false,cool:.85,act:'spawn',attackAge:0,
    spawnAge:0,hitAge:0,skillAge:0,targetId:null,spawnedAt:state.seconds,lastDamagedAt:state.seconds});
  state.effects.push({x,y,lane,kind:'broodling',time:.65,team:parent.team});
 }
 function order(uid,data){
  const p=byUid(uid);
  if(!p||p.bot||state.ended||!data||typeof data!=='object')return {ok:false,reason:'조작 권한이 없습니다.'};
  if(data.type==='econ'){
   const price=Math.round(70*Math.pow(1.36,p.eco));
   if(p.eco>=7||p.cash<price)return {ok:false,reason:'경제 강화 자원 부족'};
   p.cash-=price;p.eco++;return {ok:true};
  }
  if(data.type!=='build')return {ok:false,reason:'지원하지 않는 명령'};
  const {lane,slot,role}=data;
  if(!Number.isInteger(lane)||lane<0||lane>=LANES||!Number.isInteger(slot)||slot<0||slot>=SLOTS)return {ok:false,reason:'건설 위치 오류'};
  if(role!==null&&(!Number.isInteger(role)||role<0||role>=COST.length))return {ok:false,reason:'병종 오류'};
  const old=p.buildings[lane][slot];
  if(old===role)return {ok:false,reason:'이미 같은 생산 시설이 있습니다.'};
  if(old!==null&&role!==null)return {ok:false,reason:'이미 생산시설이 있는 자리입니다. 철거 후 새로 건설하세요.'};
  const refund=old===null?0:Math.floor(COST[old]*.55);
  const payment=(role===null?0:COST[role])-refund;
  if(payment>p.cash)return {ok:false,reason:'자원 부족'};
  p.cash-=payment;p.buildings[lane][slot]=role;
  return {ok:true,cash:p.cash};
 }
 function spawn(p,lane,slot,role){
  const d=definition(p.faction,role);
  const x=p.team===0?235+(slot%15)*4:WIDTH-235-(slot%15)*4;
  const y=lane*LANE_H+265+((Math.floor(slot/15)*11+(slot%15)*21)%196)-98;
  const radius=role===3?23:role===6&&[3,7].includes(p.faction)?28:role===6&&[4,6].includes(p.faction)?24:role===6?15:15;
  if(p.faction===3&&role===7){state.marineStats.huangSpawns++;marineRecord(p.uid,'huangSpawns');}
  state.units.push({id:state.nextUnit++,uid:p.uid,team:p.team,faction:p.faction,role,lane,spawnLane:lane,x,y,hp:d.hp,maxHP:d.hp,skin:p.skin,cool:Math.random()*.6,
    radius,frame:Math.floor(Math.random()*16),act:'move',attackAge:0,spawnAge:0,hitAge:0,skillAge:0,spawnedAt:state.seconds,lastDamagedAt:state.seconds});
 }
 function selectCounter(lane,bot){
  // Observed frontline units only: AI must not inspect unscouted human facilities.
  const counts=Array(8).fill(0),ours=state.units.filter(u=>u.hp>0&&u.team===1&&u.lane===lane);
  for(const u of state.units)if(u.hp>0&&u.team===0&&u.lane===lane
    &&(u.x>=WIDTH*.56||ours.some(s=>Math.hypot(s.x-u.x,s.y-u.y)<340)))counts[u.role]++;
  const known=counts.reduce((a,b)=>a+b,0);
  if(!known)return bot.buildings[lane].filter(x=>x!==null).length%3===0?0:1;
  const air=state.units.filter(u=>u.hp>0&&u.team===0&&u.lane===lane&&u.role===6&&![3,4,6,7].includes(u.faction)).length;
  const tanks=counts[3],healers=counts[7];
  const mine=role=>bot.buildings[lane].filter(x=>x===role).length;
  if(air>=2&&mine(4)<Math.ceil(air*.85))return 4;
  if(tanks>=2&&mine(2)<Math.ceil(tanks*.95))return 2;
  if(healers>=2&&tanks>=1&&mine(5)<2)return 5;
  const major=counts.indexOf(Math.max(...counts));
  if(major===6&&state.units.some(u=>u.lane===lane&&u.team===0&&u.role===6&&[3,4,6,7].includes(u.faction)))return 2;
  if(major===0&&counts[0]>=3&&(bot.faction===3||bot.faction===4)&&bot.cash>=COST[6])return 6;
  return [[1,6,3],[3,5],[0,1],[2,6],[2,3],[0,6],[4,1],[0,5]][major][0];
 }
 function botPurchase(bot){
  // A paid early army deters players from investing everything in economy.
  for(let lane=0;lane<3;lane++){
   const existing=bot.buildings[lane].filter(x=>x!==null).length;
   const desired=Math.min(12,1+Math.floor((state.wave+1)/3)+Math.floor(Math.max(0,state.wave-7)/3));
   let count=Math.max(0,desired-existing);
   while(count-->0){
    let role=selectCounter(lane,bot);
    if(bot.cash<COST[role])role=bot.cash>=COST[1]?1:0;
    if(bot.cash<COST[role])break;
    const slot=bot.buildings[lane].findIndex(x=>x===null);if(slot<0)break;
    bot.buildings[lane][slot]=role;bot.cash-=COST[role];
   }
  }
  if(state.wave>5&&bot.eco<5&&bot.cash>390){
   const c=Math.round(70*Math.pow(1.36,bot.eco));
   if(bot.cash>=c+180){bot.eco++;bot.cash-=c;}
  }
 }
 function wave(){
  state.wave++;state.marineSupports=[];state.marineRecruitCount.clear();state.broodBirthsByUid.clear();
  for(const p of state.players)p.cash+=24;
  for(const bot of state.players.filter(p=>p.bot))botPurchase(bot);
  for(let lane=0;lane<LANES;lane++)for(let team=0;team<2;team++){
   let count=state.units.filter(u=>u.lane===lane&&u.team===team&&u.hp>0).length;
   for(const p of state.players)if(p.team===team)for(let slot=0;slot<SLOTS&&count<75;slot++){
    const role=p.buildings[lane][slot];
    if(role!==null){
     spawn(p,lane,slot,role);count++;
     if(p.faction===3&&role===7)for(const t of [1,2])state.marineSupports.push({uid:p.uid,lane,slot,wave:state.wave,due:state.seconds+HUANGLONG_INTERVAL*t});
    }
   }
  }
 }
 function deployMarineSupports(){
  if(!state.marineSupports.length)return;
  state.marineSupports=state.marineSupports.filter(job=>{
   if(job.wave!==state.wave)return false;
   if(job.due>state.seconds+1e-6)return true;
   const p=byUid(job.uid);
   if(p&&p.faction===3&&p.buildings[job.lane][job.slot]===7&&state.cores[job.lane][p.team]>0
    &&state.units.filter(x=>x.hp>0&&x.lane===job.lane&&x.team===p.team).length<75)spawn(p,job.lane,job.slot,7);
   return false;
  });
 }
 function marineSpoils(a,v,roll=Math.random){
  if(a.faction!==3||a.team===v.team||a.conscripted||v.conscripted||v.isHatchling)return;
  const owner=byUid(a.uid),enemy=byUid(v.uid);
  if(!owner||!enemy)return;
  if(roll()<MARINE_LOOT_CHANCE){
   const wanted=Math.min(24,Math.floor(COST[v.role]*.12));
   const taken=Math.min(wanted,Math.max(0,Math.floor(enemy.cash)));
   if(taken>0){
    enemy.cash-=taken;owner.cash+=taken;state.marineStats.loot++;state.marineStats.lootedCR+=taken;marineRecord(a.uid,'loot');marineRecord(a.uid,'lootedCR',taken);
    state.effects.push({x:v.x,y:v.y,lane:v.lane,kind:'ginppai',time:.5,team:a.team});
   }
  }
  const recruits=state.marineRecruitCount.get(a.uid)||0;
  if(recruits>=MARINE_RECRUIT_CAP||roll()>=MARINE_RECRUIT_CHANCE)return;
  if(state.units.filter(x=>x.hp>0&&x.lane===v.lane&&x.team===a.team).length>=75)return;
  state.marineRecruitCount.set(a.uid,recruits+1);
  state.marineStats.recruits++;marineRecord(a.uid,'recruits');
  state.units.push({...v,id:state.nextUnit++,uid:a.uid,team:a.team,hp:Math.max(1,Math.floor(v.maxHP*MARINE_RECRUIT_HP)),
   cool:1.5,conscripted:true,killed:false,spawnAge:0,hitAge:0,skillAge:0,attackAge:.4,act:'move'});
  state.effects.push({x:v.x,y:v.y,lane:v.lane,kind:'conscript',time:.7,team:a.team});
 }
 function applyHit(a,v,damage){
  const attacker=definition(a.faction,a.role),defender=definition(v.faction,v.role);
  let mult=1;
  if(v.role===6&&[3,4,6,7].includes(v.faction)){
   mult=a.role===2?1.65:a.role===0?.68:a.role===4?.78:1;
  }else{
   if(attacker.good.includes(v.role))mult*=1.55;
   if(attacker.bad.includes(v.role))mult*=.7;
  }
  if(v.hp<=0)return;
  let hit=Math.max(3,damage*mult-defender.armor*.66);
  if(v.faction===0&&[3,4].includes(v.role))hit*=.94;
  if(v.faction===2&&state.seconds-(v.lastWardAt??-999)>=10){v.lastWardAt=state.seconds;hit*=.82;}
  if(a.faction===5&&[1,2,4,5,6].includes(a.role)&&Math.random()<.12)hit*=1.25;
  if(a.faction===6&&[0,3,6].includes(a.role)&&!a.isHatchling&&state.units.some(u=>
    u!==a&&u.hp>0&&u.team===a.team&&u.faction===6&&Math.hypot(u.x-a.x,u.y-a.y)<165))hit*=1.06;
  if((a.inkUntil||0)>state.seconds)hit*=.90;
  const before=v.hp;
  v.hp-=hit;v.attackAge=.12;v.hitAge=.3;v.lastDamagedAt=state.seconds;
  if(a.faction===4&&[0,3,6].includes(a.role)&&!a.isHatchling&&a.hp>0)
   a.hp=Math.min(a.maxHP,a.hp+Math.min(3,Math.max(0,Math.min(before,hit))*.015));
  if(a.faction===8&&[1,2,4,5].includes(a.role)&&state.seconds-(a.lastInkCast??-999)>=INK_COOLDOWN){
   a.lastInkCast=state.seconds;v.inkUntil=Math.max(v.inkUntil||0,state.seconds+INK_DURATION);
   state.effects.push({x:v.x,y:v.y,lane:v.lane,kind:'ink',time:.6,team:a.team});
  }
  if(v.hp<=0&&!v.killed){v.killed=true;marineSpoils(a,v);}
 }
 function attack(a,v){
  const d=combatDef(a);
  a.cool=Math.max(.3,d.rate);a.act='attack';a.attackAge=.33;
  if(a.role===7)a.skillAge=.54;
  const dmg=d.damage*((a.inkUntil||0)>state.seconds?.90:1);
  if(a.role===7){
   if(v.isHatchling)return;
   if(a.faction===3){
    // Huanglong's existing one-use Marine banquet heals the entire injured squad.
    let healed=0;
    for(const x of state.units)if(x.id!==a.id&&x.hp>0&&!x.isHatchling&&x.team===a.team&&x.hp<x.maxHP&&Math.hypot(a.x-x.x,a.y-x.y)<195){
     const before=x.hp;x.hp=Math.min(x.maxHP,x.hp+Math.max(135,x.maxHP*.32));healed+=x.hp-before;
    }
    if(healed>0){a.hp=0;state.effects.push({x:a.x,y:a.y,lane:a.lane,kind:'huanglong',time:.9,team:a.team});}
   }else{
    if(v.healWindowStart===undefined||state.seconds-v.healWindowStart>=1){v.healWindowStart=state.seconds;v.healWindowUsed=0;}
    const amount=Math.max(0,Math.min(d.heal||36,Math.max(80,v.maxHP*.085)-v.healWindowUsed));
    v.healWindowUsed+=amount;const recovered=Math.min(amount,v.maxHP-v.hp);
    v.hp=Math.min(v.maxHP,v.hp+amount);
    if(a.faction===9&&recovered>0&&state.seconds-(a.lastPollenAt??-999)>=5){
     const partner=state.units.find(u=>u.id!==a.id&&u.id!==v.id&&u.hp>0&&!u.isHatchling
      &&u.team===a.team&&u.hp<u.maxHP&&Math.hypot(u.x-v.x,u.y-v.y)<145);
     if(partner){a.lastPollenAt=state.seconds;partner.hp=Math.min(partner.maxHP,partner.hp+recovered*.03);
      state.effects.push({x:partner.x,y:partner.y,lane:partner.lane,kind:'pollen',time:.45,team:a.team});}
    }
   }
   return;
  }
  if(a.role===6&&(a.faction===3||a.faction===4)){
   // Ground truck/panther charges punish a melee clump without hitting aircraft.
   const nearby=state.units.filter(x=>x.team!==a.team&&x.hp>0&&definition(x.faction,x.role).kind==='ground'&&Math.hypot(x.x-v.x,x.y-v.y)<58)
    .sort((x,y)=>Math.hypot(x.x-v.x,x.y-v.y)-Math.hypot(y.x-v.x,y.y-v.y)).slice(0,3);
   for(const x of nearby)applyHit(a,x,dmg*(x.role===0?1.35:x.role===3?.55:1));
   if(a.faction===3&&nearby.length){state.marineStats.bongoCharges++;marineRecord(a.uid,'bongoCharges');state.effects.push({x:v.x,y:v.y,lane:v.lane,kind:'bongo',time:.5,team:a.team});}
  }else if(a.role===5){
   for(const x of state.units)if(x.team!==a.team&&x.hp>0&&definition(x.faction,x.role).kind!=='air'&&Math.hypot(x.x-v.x,x.y-v.y)<66)applyHit(a,x,dmg*.8);
  }else applyHit(a,v,dmg);
  if(a.faction===1)broodLay(a,v);
  if(state.effects.length>100)state.effects.shift();
  state.effects.push({x:v.x,y:v.y,lane:Math.min(LANES-1,Math.floor(v.y/LANE_H)),kind:a.role===5?'blast':'hit',time:.3,team:a.team});
 }
 function stepUnits(dt){
  // Three production bands feed one continuous world. Units can seek across both old borders.
  const alive=state.units.filter(u=>u.hp>0),byId=new Map(alive.map(u=>[u.id,u]));
  const grid=new Map(),cell=270;
  for(const v of alive){
   const k=v.team+','+Math.floor(v.x/cell)+','+Math.floor(v.y/cell);
   if(!grid.has(k))grid.set(k,[]);grid.get(k).push(v);
  }
  function nearby(team,x,y,r){
   const out=[],cx=Math.floor(x/cell),cy=Math.floor(y/cell),steps=Math.ceil(r/cell);
   for(let dx=-steps;dx<=steps;dx++)for(let dy=-steps;dy<=steps;dy++){
    for(const v of grid.get(team+','+(cx+dx)+','+(cy+dy))||[])if(v.hp>0&&Math.hypot(v.x-x,v.y-y)<=r)out.push(v);
   }
   return out;
  }
  for(const u of state.units){
   if(u.hp<=0)continue;
   const d=combatDef(u),support=u.role===7,r=support?SUPPORT_RADIUS:AGGRO_RADIUS;
   const moveSpeed=d.speed*((u.inkUntil||0)>state.seconds?.80:1);
   if(!u.isHatchling){
    if(u.faction===8)u.hp=Math.min(u.maxHP,u.hp+u.maxHP*OCTOPER_REGEN*dt);
    if(u.faction===7)u.hp=Math.min(u.maxHP,u.hp+u.maxHP*ROBOT_REPAIR*dt);
   }
   u.cool=Math.max(0,u.cool-dt);u.frame=(u.frame+dt*11)%16;u.attackAge=Math.max(0,u.attackAge-dt);
   u.spawnAge=Math.min(5,(u.spawnAge||0)+dt);u.hitAge=Math.max(0,(u.hitAge||0)-dt);u.skillAge=Math.max(0,(u.skillAge||0)-dt);
   const valid=v=>v&&v.hp>0&&v.id!==u.id&&(support?
     v.team===u.team&&!v.isHatchling&&v.hp<v.maxHP-10:
     v.team!==u.team&&(d.airTarget||definition(v.faction,v.role).kind!=='air'));
   let target=byId.get(u.targetId),best=target?Math.hypot(target.x-u.x,target.y-u.y):Infinity;
   if(!valid(target)||best>(support?SUPPORT_RADIUS:AGGRO_LEASH)){target=null;best=Infinity;}
   for(const v of nearby(support?u.team:1-u.team,u.x,u.y,r)){
    if(!valid(v))continue;
    const distance=Math.hypot(v.x-u.x,v.y-u.y);
    if(distance+36<best){target=v;best=distance;}
   }
   if(target){
    u.targetId=target.id;
    const reach=support?d.range*.88:d.range<48?Math.max(d.range,u.radius+target.radius+6):d.range*.88;
    if(best<=reach){if(u.cool<=0)attack(u,target);}
    else{
     const distance=Math.max(1,best),move=Math.min(moveSpeed*dt,Math.max(0,best-reach*.68));
     u.x+=(target.x-u.x)/distance*move;u.y+=(target.y-u.y)/distance*move;u.act='move';
    }
   }else{
    u.targetId=null;
    if(support){
     // Healers regroup with any allied front, not just the lane they were built in.
     let friend=null,dist=Infinity;
     for(const v of alive)if(v.team===u.team&&v.id!==u.id&&v.role!==7){
      const dd=Math.hypot(v.x-u.x,v.y-u.y);
      if(dd<dist){dist=dd;friend=v;}
     }
     if(friend&&dist>115){
      const move=Math.min(moveSpeed*dt,dist-105);
      u.x+=(friend.x-u.x)/dist*move;u.y+=(friend.y-u.y)/dist*move;u.act='move';
     }
    }else{
     // Choose an enemy defense based on *current* position after cross-band aggro.
     const lane=clamp(Math.floor(u.y/LANE_H),0,LANES-1),defender=1-u.team;
     const tx=state.turrets[lane][defender]>0?(defender===0?215:WIDTH-215):(defender===0?110:WIDTH-110);
     const ty=(lane+.5)*LANE_H,dist=Math.hypot(tx-u.x,ty-u.y);
     if(state.cores[lane][defender]>0){
      if(dist>Math.max(48,d.range*.85)){
       const step=Math.min(moveSpeed*dt,dist);
       u.x+=(tx-u.x)/Math.max(dist,1)*step;u.y+=(ty-u.y)/Math.max(dist,1)*step;u.act='move';
      }else if(u.cool<=0){
       const damage=d.damage*([.52,.88,1.12,1.08,.82,1.55,.87,.4][u.role]||1);
       if(state.turrets[lane][defender]>0)state.turrets[lane][defender]=Math.max(0,state.turrets[lane][defender]-damage);
       else state.cores[lane][defender]=Math.max(0,state.cores[lane][defender]-damage);
       u.cool=d.rate;u.act='attack';u.attackAge=.28;
      }
     }else{
      // Fort cleared: cross the map vertically to assault another surviving fort.
      const remaining=state.cores.map((cores,i)=>cores[defender]>0?i:-1).filter(i=>i>=0);
      if(remaining.length){
       const closest=remaining.sort((x,y)=>Math.abs((x+.5)*LANE_H-u.y)-Math.abs((y+.5)*LANE_H-u.y))[0];
       u.y+=clamp((closest+.5)*LANE_H-u.y,-moveSpeed*dt,moveSpeed*dt);u.act='move';
      }
     }
    }
   }
   u.x=clamp(u.x,35,WIDTH-35);u.y=clamp(u.y,35,HEIGHT-35);
   u.lane=clamp(Math.floor(u.y/LANE_H),0,LANES-1);
  }
  // Collision cells are global; two units straddling the old line now repel.
  const collision=new Map(),c=CONTACT_CELL;
  for(const u of state.units)if(u.hp>0){
   const k=Math.floor(u.x/c)+','+Math.floor(u.y/c);
   if(!collision.has(k))collision.set(k,[]);collision.get(k).push(u);
  }
  for(const u of state.units)if(u.hp>0){
   const cx=Math.floor(u.x/c),cy=Math.floor(u.y/c),layer=definition(u.faction,u.role).kind;
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    for(const v of collision.get((cx+dx)+','+(cy+dy))||[]){
     if(v.id<=u.id||v.hp<=0||definition(v.faction,v.role).kind!==layer)continue;
     let vx=v.x-u.x,vy=v.y-u.y,len=Math.hypot(vx,vy),min=u.radius+v.radius;
     if(len>=min)continue;
     if(len<.01){vx=(u.id%3)-1;vy=(v.id%3)-1||1;len=Math.hypot(vx,vy);}
     const push=Math.min(16,(min-len)*.47);
     u.x=clamp(u.x-vx/len*push,35,WIDTH-35);u.y=clamp(u.y-vy/len*push,35,HEIGHT-35);
     v.x=clamp(v.x+vx/len*push,35,WIDTH-35);v.y=clamp(v.y+vy/len*push,35,HEIGHT-35);
    }
   }
  }
  for(const u of state.units)if(u.hp>0)u.lane=clamp(Math.floor(u.y/LANE_H),0,LANES-1);
  // Independent anti-snowball towers in all three lanes for both teams.
  for(let lane=0;lane<LANES;lane++)for(let team=0;team<2;team++){
   if(state.turrets[lane][team]<=0)continue;
   const x=team===0?215:WIDTH-215,y=(lane+.5)*LANE_H;
   state.towerCooldown[lane][team]=Math.max(0,state.towerCooldown[lane][team]-dt);
   if(state.towerCooldown[lane][team]>0)continue;
   const hostile=state.units.filter(u=>u.hp>0&&u.team!==team&&Math.hypot(u.x-x,u.y-y)<=TOWER_RANGE);
   if(!hostile.length)continue;
   hostile.sort((a,b)=>(Math.hypot(a.x-x,a.y-y)*.55+a.hp/a.maxHP*42-(a.role===7?35:0))
    -(Math.hypot(b.x-x,b.y-y)*.55+b.hp/b.maxHP*42-(b.role===7?35:0)));
   const v=hostile[0],f=definition(v.faction,v.role),dmg=TOWER_DAMAGE*(f.kind==='air'?1.25:v.role===3?1.12:1);
   let hit=Math.max(3,dmg-f.armor*.66);
   if(v.faction===0&&[3,4].includes(v.role))hit*=.94;
   if(v.faction===2&&state.seconds-(v.lastWardAt??-999)>=10){v.lastWardAt=state.seconds;hit*=.82;}
   v.hp-=hit;v.lastDamagedAt=state.seconds;
   state.towerCooldown[lane][team]=TOWER_PERIOD;
   state.effects.push({x:v.x,y:v.y,lane,kind:'tower',time:.16,team});
  }
  state.units=state.units.filter(u=>u.hp>0);
  for(const e of state.effects)e.time-=dt;
  state.effects=state.effects.filter(e=>e.time>0);
  for(let lane=0;lane<LANES;lane++){
   const ours=state.units.filter(u=>u.hp>0&&u.team===0&&u.lane===lane);
   const theirs=state.units.filter(u=>u.hp>0&&u.team===1&&u.lane===lane);
   const left=ours.length?Math.max(...ours.map(u=>u.x)):WIDTH/2;
   const right=theirs.length?Math.min(...theirs.map(u=>u.x)):WIDTH/2;
   state.lanePressure[lane]=clamp((left+right)/2/WIDTH,.04,.96);
  }
  let lost=[0,0];
  for(const cores of state.cores){if(cores[0]<=0)lost[0]++;if(cores[1]<=0)lost[1]++;}
  if(lost[0]>=2||lost[1]>=2){state.ended=true;state.winner=lost[1]>=2?0:1;}
 }
 function tick(dt){
  if(state.ended)return;
  dt=clamp(Number(dt)||0,0,.2);state.seconds+=dt;state.next-=dt;
  // Correct fixed income for every *owner*, not pooled by team.
  const before=Math.floor((state.seconds-dt)*2),now=Math.floor(state.seconds*2);
  if(now>before)for(const p of state.players)p.cash+=(now-before)*(1+p.eco);
  while(state.next<=0){state.next+=24;wave();}
  deployMarineSupports();
  stepUnits(dt);
  if(state.seconds>=1200&&!state.ended){
   const scores=[0,0];for(const v of state.cores){scores[0]+=v[0];scores[1]+=v[1];}
   state.ended=true;state.winner=scores[0]===scores[1]?null:scores[0]>scores[1]?0:1;
  }
 }
 function snapshot(viewerUid=null){
  // Host keeps full state internally. Guest packets are redacted per viewer, not
  // cosmetically hidden in Canvas (which would still leak their buildings via WebRTC).
  const viewer=viewerUid===null?null:byUid(viewerUid);
  const seen=(lane)=>{
   if(!viewer||state.wave>=FOG_END_WAVE)return true;
   const enemySide=1-viewer.team;
   return state.units.some(u=>u.hp>0&&u.team===viewer.team&&Math.floor(u.y/LANE_H)===lane
    &&(enemySide===1?u.x>=WIDTH-FOG_WIDTH-220:u.x<=FOG_WIDTH+220));
  };
  const visible=Array.from({length:LANES},(_,lane)=>seen(lane));
  const isHidden=(team,lane,x)=>viewer&&team!==viewer.team&&!visible[lane]
   &&(viewer.team===0?x>=WIDTH-FOG_WIDTH:x<=FOG_WIDTH);
  const allied=p=>!viewer||p.team===viewer.team;
  const isAllowed=p=>!viewer||p.team===viewer.team||visible.every(Boolean);
  return {mode:state.mode,size:state.size,width:WIDTH,height:HEIGHT,seconds:Math.round(state.seconds*10)/10,wave:state.wave,next:Math.ceil(state.next*10)/10,
   ended:state.ended,winner:state.winner,cores:state.cores,turrets:state.turrets,lanePressure:state.lanePressure.map(x=>Math.round(x*100)/100),
   fog:visible.map(s=>!s),viewerTeam:viewer?.team??null,
   factionTraits:state.players.filter(p=>!viewer||p.team===viewer.team).map(p=>({uid:p.uid,faction:p.faction,births:state.broodBirthsByUid.get(p.uid)||0,totalBirths:state.broodTotalByUid.get(p.uid)||0})),
   marineOps:state.players.filter(p=>p.faction===3&&(!viewer||p.team===viewer.team)).map(p=>({uid:p.uid,team:p.team,...(state.marineStatsByUid.get(p.uid)||{loot:0,lootedCR:0,recruits:0,huangSpawns:0,bongoCharges:0}),waveRecruits:state.marineRecruitCount.get(p.uid)||0})),
   players:state.players.map(p=>({uid:p.uid,name:p.name,faction:p.faction,skin:p.skin,team:p.team,bot:p.bot,
    cash:allied(p)?Math.floor(p.cash):null,eco:allied(p)?p.eco:null,
    buildings:p.buildings.map((slots,lane)=>allied(p)||visible[lane]?slots:Array(SLOTS).fill(null))})),
   units:state.units.filter(u=>!isHidden(u.team,u.lane,u.x)).map(u=>({id:u.id,uid:u.uid,team:u.team,faction:u.faction,skin:u.skin||'default',role:u.role,lane:u.lane,x:Math.round(u.x),y:Math.round(u.y),hp:Math.ceil(u.hp),maxHP:Math.ceil(u.maxHP),conscripted:!!u.conscripted,isHatchling:!!u.isHatchling,frame:Math.floor(u.frame),act:u.hitAge>0?'hit':u.spawnAge<.42?'spawn':u.skillAge>0?'skill':u.attackAge>0?'attack':u.act})),
   effects:state.effects.filter(e=>!isHidden(e.team,e.lane,e.x)).map(e=>({...e,x:Math.round(e.x),y:Math.round(e.y)}))};
 }
 return {state,order,tick,wave,snapshot,definition};
}
global.DesertTriEngine=Object.freeze({create,definition,WIDTH,HEIGHT,LANE_H,LANES,COLS,ROWS,SLOTS,COST,NAMES});
})(typeof window==='undefined'?globalThis:window);
