/* Desert Front — 3-line authoritative multiplayer combat kernel.
 * No DOM, Firebase or browser dependency. One host simulates; clients send orders.
 * Area: original 3300 x 520 -> 3300 x 1560 (one shared 1560-high battle world with 3 deployment bands).
 */
(function(global){
'use strict';
const LANES=3,WIDTH=3300,HEIGHT=1560,LANE_H=520,COLS=15,ROWS=5,SLOTS=COLS*ROWS;
const OPENING_PREP_SECONDS=10,WAVE_INTERVAL=12,FACTORY_BUILD_SECONDS=12,CORE_DAMAGE_MULTIPLIER=.85;
const PRISM_STAGES=global.DesertAugments?.STAGES||[1,10,20,30,40,50,60,70];
const AI_LEVELS=['easy','normal','hard','veryhard','impossible'];
const INCOME_STEPS=[1.2,1,.85,.75,.65,.55,.45];
const incomePerTick=level=>Number((1+INCOME_STEPS.slice(0,Math.min(7,Math.max(0,Math.floor(level)))).reduce((sum,x)=>sum+x,0)).toFixed(2));

const TOWER_HP=1250,TOWER_RANGE=285,TOWER_PERIOD=.34,TOWER_DAMAGE=27,FOG_END_WAVE=6,FOG_WIDTH=770;
const AGGRO_RADIUS=590,AGGRO_LEASH=740,SUPPORT_RADIUS=615,CONTACT_CELL=64;
const EXTRACTOR=8,ecoPrice=level=>Math.round(70*Math.pow(1.36,level)),ecoStabilize=(level,seconds)=>(4+2*level+Math.min(6,Math.floor(Math.max(0,seconds)/120)))/2;
const ecoBuildSeconds=level=>12+4*Math.max(0,level-1);
const WEAPON_COST=n=>Math.round(200*Math.pow(1.65,n)),ARMOR_COST=n=>Math.round(190*Math.pow(1.63,n));
const COST=[65,100,185,285,185,360,300,220,70], NAMES=['돌격','사격','대장갑','장갑','대공','포격','특수','지원','자원채취'];
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
const MARINE_LOOT_CHANCE=.08,MARINE_RECRUIT_CHANCE=.23,MARINE_RECRUIT_HP=.10,MARINE_RECRUIT_CAP=2,HUANGLONG_INTERVAL=WAVE_INTERVAL/3;
const BROOD_BIRTH_CHANCE=.15,BROOD_BIRTH_COOLDOWN=12,BROOD_BIRTH_CAP=8,BROOD_ALIVE_CAP=14;
const OCTOPER_REGEN=.0006,ROBOT_REPAIR=.0015;
const BEAST_RANGED_DAMAGE_REDUCTION=.06,FAIRY_CHAIN_HEAL_RATIO=.05,FAIRY_HEAL_MULTIPLIER=1.15;
const INK_DURATION=1.8,INK_COOLDOWN=6;
const GOODS=[[5,7],[0,7],[3,4],[1,4],[6],[1,4],[0,3],[]];
const BADS=[[3,1],[3,5],[0,1],[2,6],[3,2],[0,6],[4,1],[]];
function unitCost(faction,role){return role===6?({4:285,6:270,7:285}[faction]??COST[role]):COST[role];}
function definition(faction,role){
 const shared=global.DesertRoster?.getDef;
 if(typeof shared==='function')return shared(role,faction);
 const t=BASE[role],mut=[[1.055,1,.96],[.995,1,1.12],[.99,1.09,1],[1.09,1.06,1.01],[1,1,1.08],[.94,1,.99],[1.02,1,1.07],[1.07,1,.99],[.99,1,1.01],[1,1,1.01]][faction]||[1,1,1];
 const beast=faction===4,elf=faction===5,furry=faction===6,robot=faction===7,octo=faction===8,fairy=faction===9,bongo=faction===3&&role===6,prowler=beast&&role===6,wolfRider=furry&&role===6,groundSpecial=role===6&&[3,4,6,7].includes(faction);
 const melee=(beast||furry)&&[0,3,6].includes(role),ranged=elf&&[1,2,4,5,6].includes(role);
 return {
  cost:unitCost(faction,role),
  hp:bongo?565:(robot&&role===6?210:wolfRider?210:t[0])*2.25*mut[0]*(elf&&role===0?.88:beast&&role===3?1.05:1),
  damage:bongo?36:prowler?33:wolfRider?36:(robot&&role===6?27:t[1])*.94*mut[1]*(beast?(melee?1.08:role===2?1.12:.94):elf?(ranged?1.045:role===0?.84:1):furry?(melee?1.10:role===2?1.12:.93):robot&&[1,2,4,5].includes(role)?1.08:octo&&[2,4,5].includes(role)?1.10:1),
  armor:bongo?7:prowler||wolfRider?3:groundSpecial&&robot?5:t[2],
  range:bongo?43:prowler?40:wolfRider?42:robot&&role===6?175:t[3]*(ranged?1.10:robot&&[1,2,4,5].includes(role)?1.04:1),
  rate:bongo?1.45:prowler?.95:wolfRider?.85:robot&&role===6?.8:t[4],
  speed:bongo?77:prowler?90:t[5]*mut[2]*.84*(melee?1.05:1),
  airTarget:groundSpecial&&!robot?false:t[6],
  kind:groundSpecial?'ground':t[7],
  heal:(role===7?36:0)*mut[1]*1.5*(robot?.85:fairy?FAIRY_HEAL_MULTIPLIER:1),
  blast:role===5?(octo?58*1.08:58):0,
  good:bongo?[0,7]:prowler?[0,5,7]:groundSpecial&&furry?[0,5,7]:groundSpecial&&robot?[0,3]:GOODS[role],bad:bongo||prowler?[2,3]:groundSpecial&&furry?[2,3]:groundSpecial&&robot?[2,5]:BADS[role]
 };
}
// Wave 30+ rewards a correct unit counter instead of making every unit take more damage.
function counterAdvantage(wave){return wave>=60?2:wave>=50?1.85:wave>=40?1.75:wave>=30?1.65:1.55;}
function matchupMultiplier(attacker,target,wave,attackRole=attacker.role){
 if(target.role===6&&[3,4,6,7].includes(target.faction)){
  if(attackRole===2)return 1.65*counterAdvantage(wave)/1.55;
  return attackRole===0?.68:attackRole===4?.78:1;
 }
 return attacker.good.includes(target.role)?counterAdvantage(wave):attacker.bad.includes(target.role)?.7:1;
}
function combatDef(u,players=null){
 const base=global.DesertAugments?.apply?.(definition(u.faction,u.role),u.augments||[],u.role)||definition(u.faction,u.role);
 const prism=global.DesertPrism?.augmentStats?.(base,u.augments||[],u.role,u.prismTime||0,u.prismWaveAt??-Infinity)||base;
 const d=global.DesertConsolidation?.definition(prism,u)||prism;
 const actual=u.isHatchling?{...d,hp:1,damage:4,range:24,rate:1.28,speed:108,armor:0,airTarget:false,kind:'ground'}:d;
 const level=u.uid?players?.find(p=>p.uid===u.uid)?.weapon||0:0;
 return level?{...actual,damage:actual.damage*(1+.08*level),heal:actual.heal*(1+.08*level)}:actual;
}
function roomPlayers(input){const x=Array.isArray(input)?input:Object.values(input||{});return x.map(p=>({uid:String(p.uid||p.id||''),name:String(p.name||'지휘관').slice(0,16),team:Number(p.team),faction:Number(p.faction),skin:['default','moe','twilight','aurora','gold'].includes(p.skin)?p.skin:'default',bot:!!p.bot}));}
function create({mode='pvp',size=1,members=[],aiDifficulty='normal',ruleset='standard',seed=1}={}){
 const augmented=ruleset==='augment'||ruleset==='prism';
 if(augmented&&!global.DesertAugments?.ready?.())throw Error('증강 카드 준비 전입니다. 새로고침 후 다시 시도하세요.');
 const aug=augmented?global.DesertAugments.create(seed,{prismOnly:ruleset==='prism'}):null;
  const augmentRounds=augmented?PRISM_STAGES:[];
 if(!['pvp','coop','classic'].includes(mode)||!Number.isInteger(size)||size<1||size>3||(mode==='coop'&&size<2)||(mode==='classic'&&size!==1))throw Error('경기 모드/인원 오류');
 // Classic duel reuses the multiplayer combat kernel on the solo-sized world.
 const LANES=mode==='classic'?1:3,HEIGHT=LANES*LANE_H,CORE_HP=mode==='classic'?8640:3000;
 const humans=roomPlayers(members);
 if(humans.some(p=>!p.uid||p.team<0||p.team>1||p.faction<0||p.faction>9)||new Set(humans.map(p=>p.uid)).size!==humans.length)throw Error('부적절한 참가자 목록');
 if(mode==='coop'&&(humans.length!==size||humans.some(p=>p.team!==0)))throw Error('협동 인원과 팀이 일치하지 않습니다');
 if(mode!=='coop'&&(humans.filter(p=>p.team===0).length!==size||humans.filter(p=>p.team===1).length!==size))throw Error('경쟁 양 팀 인원이 일치하지 않습니다');
 const players=humans.concat(mode==='coop'?Array.from({length:size},(_,i)=>({uid:'AI_'+i,name:'적 AI '+(i+1),team:1,faction:(i+3)%10,bot:true})):[]);
 const state={mode,size,ruleset:augmented?ruleset:'standard',augmentStage:-1,augmentChoice:null,augmentSchedule:aug?.schedule||[],aiDifficulty:AI_LEVELS.includes(aiDifficulty)?aiDifficulty:'normal',seconds:0,wave:0,next:OPENING_PREP_SECONDS,ended:false,winner:null,
  width:WIDTH,height:HEIGHT,lanes:LANES,
  cores:Array.from({length:LANES},()=>[CORE_HP,CORE_HP]),turrets:Array.from({length:LANES},()=>[TOWER_HP,TOWER_HP]),towerCooldown:Array.from({length:LANES},()=>[0,0]),forwardHP:Array.from({length:LANES},()=>[1000,1000]),forwardClaimed:Array.from({length:LANES},()=>[false,false]),forwardCooldown:Array.from({length:LANES},()=>[0,0]),units:[],effects:[],nextUnit:1,nextConsolidation:1,marineSupports:[],marineRecruitCount:new Map(),marineStats:{loot:0,lootedCR:0,recruits:0,huangSpawns:0,bongoCharges:0},marineStatsByUid:new Map(),broodBirthsByUid:new Map(),broodTotalByUid:new Map(),players:players.map(p=>({...p,augments:[],produced:Array(8).fill(0),combatStats:{damage:Array(8).fill(0),kills:Array(8).fill(0),
  losses:Array(8).fill(0),heroDamage:Array(8).fill(0),heroes:Array(8).fill(0)},cash:360,eco:0,ecoReadyAt:0,weapon:0,armor:0,nukes:1,barrageCd:0,mineCosts:{},mineTimings:{},buildings:Array.from({length:LANES},()=>Array(SLOTS).fill(null)),buildingReadyAt:Array.from({length:LANES},()=>Array(SLOTS).fill(0))})),lanePressure:Array(LANES).fill(.5)};
 const byUid=uid=>state.players.find(p=>p.uid===uid);
 function combatLife(u){return u.heroCount===20?Math.max(0,Math.min(20,Math.ceil(Math.max(0,u.hp)/(u.maxHP/20)-1e-9))):(u.hp>0?1:0);}
 function combatHit(v,before,a=null){
  if(!v||!Number.isInteger(v.role)||v.role<0||v.role>=8)return;
  const previous=v._combatLife??(v.heroCount===20?20:(before>0?1:0)),remaining=combatLife(v);
  v._combatLife=remaining;
  const casualties=Math.max(0,previous-remaining),eligible=!v.guardian&&!v.conscripted&&!v.isHatchling;
  const defender=byUid(v.uid);
  if(defender&&eligible)defender.combatStats.losses[v.role]+=casualties;
  const attacker=byUid(a?.uid);
  if(a?.team!==undefined&&attacker&&a.team!==v.team&&Number.isInteger(a.role)&&a.role>=0&&a.role<8){
   const dealt=Math.max(0,Math.min(before,before-Math.max(0,v.hp)));
   attacker.combatStats.damage[a.role]+=dealt;
   if(a.heroCount===20)attacker.combatStats.heroDamage[a.role]+=dealt;
   if(eligible)attacker.combatStats.kills[a.role]+=casualties;
  }
 }

 const laneCap=()=>Infinity; // Production, specials and reinforcements never stop at a team/lane population ceiling.
 const chosenOf=u=>byUid(u?.uid)?.augments||[];
 function beginAugment(index){
  if(!aug||index<0||index>=augmentRounds.length||state.augmentChoice)return;
  const tier=state.augmentSchedule[index],offers={};
  for(const p of state.players)offers[p.uid]={cards:aug.offer(tier,p.faction,p.augments),rerolls:[false,false,false],selected:''};
  state.augmentStage=index;state.augmentChoice={round:augmentRounds[index],tier,remaining:30,offers};
  for(const p of state.players.filter(p=>p.bot))chooseAugment(p,aug.pick());
 }
 function chooseAugment(p,slot){
  const choice=state.augmentChoice,entry=choice?.offers?.[p.uid];
  if(!entry||entry.selected||!Number.isInteger(slot)||slot<0||slot>2||!entry.cards[slot])return {ok:false,reason:'증강 선택 권한이나 카드가 없습니다.'};
  const old=p.augments.slice(),id=entry.cards[slot];entry.selected=id;p.augments.push(id);
  for(const unit of state.units)if(unit.uid===p.uid&&unit.hp>0&&!unit.isHatchling){
   const base=definition(unit.faction,unit.role);
   const previous=global.DesertAugments.apply(base,old,unit.role).hp;
   const next=global.DesertAugments.apply(base,p.augments,unit.role).hp;
   const factor=next/Math.max(.001,previous);unit.maxHP*=factor;unit.hp=Math.min(unit.maxHP,unit.hp*factor);
  }
  if(Object.values(choice.offers).every(e=>e.selected))state.augmentChoice=null;
  return {ok:true,id};
 }
 if(augmented)beginAugment(0);
 function marineRecord(uid,key,amount=1){
  const v=state.marineStatsByUid.get(uid)||{loot:0,lootedCR:0,recruits:0,huangSpawns:0,bongoCharges:0};
  v[key]=(v[key]||0)+amount;state.marineStatsByUid.set(uid,v);
 }
 function broodLay(parent,target,roll=Math.random){
  if(parent.guardian||parent.faction!==1||parent.isHatchling||parent.conscripted||parent.role===7||parent.hp<=0
   ||!target||target.team===parent.team)return;
  const uid=parent.uid,used=state.broodBirthsByUid.get(uid)||0;
  const lim=global.DesertPrism?.broodLimits?.(chosenOf(parent),BROOD_BIRTH_CAP,BROOD_ALIVE_CAP,BROOD_BIRTH_CHANCE)
   ||{cap:BROOD_BIRTH_CAP,alive:BROOD_ALIVE_CAP,chance:BROOD_BIRTH_CHANCE};
  if(used>=lim.cap||state.seconds-(parent.lastBroodBirth??-999)<BROOD_BIRTH_COOLDOWN
   ||state.units.filter(u=>u.hp>0&&u.uid===uid&&u.isHatchling).length>=lim.alive
   
   ||roll()>=lim.chance)return;
  parent.lastBroodBirth=state.seconds;
  state.broodBirthsByUid.set(uid,used+1);
  state.broodTotalByUid.set(uid,(state.broodTotalByUid.get(uid)||0)+1);
  const x=clamp(parent.x+(parent.team===0?18:-18),35,WIDTH-35),y=clamp(parent.y+(roll()-.5)*35,35,HEIGHT-35);
  const lane=clamp(Math.floor(y/LANE_H),0,LANES-1);
  state.units.push({...parent,id:state.nextUnit++,role:0,lane,x,y,hp:1,maxHP:1,radius:8,heroCount:1,
    isHatchling:true,conscripted:false,killed:false,cool:.85,act:'spawn',attackAge:0,
    spawnAge:0,hitAge:0,skillAge:0,targetId:null,spawnedAt:state.seconds,lastDamagedAt:state.seconds});
  state.effects.push({x,y,lane,kind:'broodling',time:.65,team:parent.team});
 }
 function order(uid,data){
  const p=byUid(uid);
  if(!p||p.bot||state.ended||!data||typeof data!=='object')return {ok:false,reason:'조작 권한이 없습니다.'};
  if(data.type==='augment_pick')return chooseAugment(p,data.slot);
  if(data.type==='augment_reroll'){
   const choice=state.augmentChoice,entry=choice?.offers?.[p.uid],slot=data.slot;
   if(!entry||entry.selected||!Number.isInteger(slot)||slot<0||slot>2||entry.rerolls[slot])return {ok:false,reason:'리롤 권한이나 횟수가 없습니다.'};
   const card=aug.reroll(choice.tier,p.augments,entry.cards,slot,p.faction);
   if(!card)return {ok:false,reason:'교체할 카드가 없습니다.'};
   entry.cards[slot]=card;entry.rerolls[slot]=true;return {ok:true,id:card};
  }
  if(state.augmentChoice)return {ok:false,reason:'증강을 먼저 선택하세요.'};
  if(data.type==='econ')return {ok:false,reason:'자원채취 건물을 선택하고 빈 생산 슬롯에 건설하세요.'};
  if(data.type==='upgrade')return research(p,data.kind);
  if(data.type==='tactic')return tactic(p,data.kind,data.lane);
  if(data.type!=='build')return {ok:false,reason:'지원하지 않는 명령'};
  const {lane,slot,role}=data;
  if(!Number.isInteger(lane)||lane<0||lane>=LANES||!Number.isInteger(slot)||slot<0||slot>=SLOTS)return {ok:false,reason:'건설 위치 오류'};
  if(role!==null&&(!Number.isInteger(role)||role<0||role>=COST.length))return {ok:false,reason:'병종 오류'};
  const old=p.buildings[lane][slot];
  if(old===role)return {ok:false,reason:'이미 같은 생산 시설이 있습니다.'};
  if(old!==null&&role!==null)return {ok:false,reason:'이미 생산시설이 있는 자리입니다. 철거 후 새로 건설하세요.'};
  if(role===EXTRACTOR&&(p.eco>=7||state.seconds<p.ecoReadyAt))return {ok:false,reason:p.eco>=7?'자원채취 건물은 최대 7개입니다.':'채굴망 안정화 중에는 추가 건설할 수 없습니다.'};
  const key=lane+'-'+slot;
  const refund=old===null?0:Math.floor((old===EXTRACTOR?p.mineCosts[key]:unitCost(p.faction,old))*.55);
  const payment=(role===null?0:role===EXTRACTOR?ecoPrice(p.eco):unitCost(p.faction,role))-refund;
  if(payment>p.cash)return {ok:false,reason:'자원 부족'};
  p.cash-=payment;p.buildings[lane][slot]=role;
  p.buildingReadyAt[lane][slot]=role!==null&&role!==EXTRACTOR?productionReadyAt():0;
  if(old===EXTRACTOR){p.eco--;delete p.mineCosts[key];delete p.mineTimings[key];}
  if(role===EXTRACTOR){p.mineCosts[key]=payment;startExtractor(p,lane,slot);}
  return {ok:true,cash:p.cash};
 }
 function startExtractor(p,lane,slot){
  p.eco++;
  const buildEndsAt=state.seconds+ecoBuildSeconds(p.eco);
  p.ecoReadyAt=buildEndsAt+ecoStabilize(p.eco,state.seconds);
  p.buildingReadyAt[lane][slot]=buildEndsAt;
  p.mineTimings[lane+'-'+slot]={startedAt:state.seconds,buildEndsAt,readyAt:p.ecoReadyAt};
 }
 function productionReadyAt(){return state.seconds<OPENING_PREP_SECONDS?OPENING_PREP_SECONDS:state.seconds+FACTORY_BUILD_SECONDS;}
 function spawn(p,lane,slot,role,fromProduction=true,overrideFaction=null){
  if(fromProduction&&role>=0&&role<8)p.produced[role]++;
  const actualFaction=overrideFaction??p.faction;
  const d=global.DesertAugments?.apply?.(definition(actualFaction,role),p.augments,role)||definition(actualFaction,role),hp=d.hp*(1+.09*p.armor);
  const x=p.team===0?235+(slot%15)*4:WIDTH-235-(slot%15)*4;
  const y=lane*LANE_H+265+((Math.floor(slot/15)*11+(slot%15)*21)%196)-98;
  const radius=role===3?23:role===6&&[3,7].includes(actualFaction)?28:role===6&&[4,6].includes(actualFaction)?24:role===6?15:15;
  if(actualFaction===3&&role===7){state.marineStats.huangSpawns++;marineRecord(p.uid,'huangSpawns');}
  state.units.push({id:state.nextUnit++,uid:p.uid,team:p.team,faction:actualFaction,role,lane,spawnLane:lane,x,y,hp,maxHP:hp,_combatLife:1,skin:p.skin,augments:p.augments,cool:Math.random()*.6,
    radius,frame:Math.floor(Math.random()*16),act:'move',attackAge:0,spawnAge:0,hitAge:0,skillAge:0,spawnedAt:state.seconds,lastDamagedAt:state.seconds,prismTime:state.seconds,prismWaveAt:p.prismWaveAt??-Infinity});
 }
 function research(p,kind){
  if(kind!=='weapon'&&kind!=='armor')return {ok:false,reason:'강화 종류 오류'};
  const level=p[kind],cost=kind==='weapon'?WEAPON_COST(level):ARMOR_COST(level);
  if(level>=5)return {ok:false,reason:'최대 강화 완료'};
  if(p.cash<cost)return {ok:false,reason:'강화 비용 '+cost+' CR 부족'};
  p.cash-=cost;p[kind]++;
  if(kind==='armor')for(const u of state.units)if(u.hp>0&&u.uid===p.uid&&!u.isHatchling){
   const extra=u.maxHP*.09/(1+.09*level);
   u.maxHP+=extra;u.hp+=extra;
  }
  return {ok:true,level:p[kind],cash:p.cash};
 }
 function tactic(p,kind,lane){
  if(kind==='repair'){
   if(!Number.isInteger(lane)||lane<0||lane>=LANES)return {ok:false,reason:'수리할 라인을 선택하세요.'};
   if(state.turrets[lane][p.team]>=TOWER_HP)return {ok:false,reason:'포탑 체력이 최대입니다.'};
   if(p.cash<180)return {ok:false,reason:'포탑 수리 비용 180 CR 부족'};
   p.cash-=180;state.turrets[lane][p.team]=Math.min(TOWER_HP,state.turrets[lane][p.team]+310);
   state.effects.push({x:p.team===0?215:WIDTH-215,y:(lane+.5)*LANE_H,lane,kind:'repair',time:.9,team:p.team});
   return {ok:true,cash:p.cash};
  }
  if(kind==='nuke'){
   if(!p.nukes)return {ok:false,reason:'핵폭탄 사용 완료'};
   const targets=state.units.filter(u=>u.hp>0&&!u.guardian&&u.team!==p.team);
   if(!targets.length)return {ok:false,reason:'제거할 상대 유닛이 없습니다. 가디언은 핵에 면역입니다.'};
   const count=targets.reduce((sum,u)=>sum+(global.DesertConsolidation?.strength?.(u)??1),0);
   p.nukes=0;
   for(const u of targets){
    const before=u.hp;u.hp=0;combatHit(u,before);u.killed=true;
   }
   state.units=state.units.filter(u=>u.hp>0);
   // A small team-wide event list is enough to notify every client. The server
   // actually kills all eligible opponents; we must not emit thousands of effects.
   for(let laneIndex=0;laneIndex<LANES;laneIndex++)
    state.effects.push({x:WIDTH/2,y:(laneIndex+.5)*LANE_H,lane:laneIndex,
     kind:'nuke',time:1.8,team:p.team,casualties:count});
   return {ok:true,removed:targets.length,soldiers:count};
  }
  if(kind==='barrage'){
   if(p.cash<260)return {ok:false,reason:'폭격 비용 260 CR 부족'};
   if(p.barrageCd>0)return {ok:false,reason:'폭격 재충전 중'};
   // Do not attack unseen enemy spawn positions before the fog clears.
   const enemy=state.units.filter(u=>u.hp>0&&u.team!==p.team&&(state.wave>=FOG_END_WAVE||
    (p.team===0?u.x<WIDTH-FOG_WIDTH:u.x>FOG_WIDTH)||
    state.units.some(v=>v.hp>0&&v.team===p.team&&Math.hypot(v.x-u.x,v.y-u.y)<340)));
   if(!enemy.length)return {ok:false,reason:'정찰된 적 병력이 없습니다.'};
   let target=enemy[0],top=-1;
   for(const u of enemy){
    const score=enemy.reduce((sum,v)=>sum+(Math.hypot(v.x-u.x,v.y-u.y)<110?unitCost(v.faction,v.role)*(v.heroCount===20?20:1):0),0);
    if(score>top){top=score;target=u;}
   }
   p.cash-=260;p.barrageCd=32;
   for(const u of enemy){
    const d=Math.hypot(u.x-target.x,u.y-target.y);
    if(d<118){
     const raw=260*(1-.45*d/118),armor=combatDef(u).armor;
     const before=u.hp;
     u.hp-=global.DesertConsolidation?.hit(raw,armor,u,null)??Math.max(3,raw-armor*.66);
     combatHit(u,before);
     u.lastDamagedAt=state.seconds;u.hitAge=.4;
    }
   }
   state.effects.push({x:target.x,y:target.y,lane:target.lane,kind:'barrage',time:.95,team:p.team});
   state.units=state.units.filter(u=>u.hp>0);
   return {ok:true,cash:p.cash};
  }
  return {ok:false,reason:'지원하지 않는 전술'};
 }
 function fort(lane,team){
  const part=state.forwardHP[lane][team]>0?'forward':state.turrets[lane][team]>0?'turret':'core';
  return {part,x:part==='forward'?(team===0?WIDTH/4:WIDTH*3/4):team===0?(part==='turret'?215:110):(part==='turret'?WIDTH-215:WIDTH-110),y:(lane+.5)*LANE_H};
 }
 function hitFort(lane,team,amount,part=fort(lane,team).part){
  if(part==='forward'){
   if(state.forwardHP[lane][team]<=0)return;
   state.forwardHP[lane][team]=Math.max(0,state.forwardHP[lane][team]-amount);
   if(state.forwardHP[lane][team]===0&&!state.forwardClaimed[lane][team]){
    state.forwardClaimed[lane][team]=true;
    const guardian=global.DesertGuardian;
    guardian?.reward(state.players,1-team);
    const defenders=state.players.filter(p=>p.team===team).sort((a,b)=>a.uid.localeCompare(b.uid));
    const owner=defenders[lane%defenders.length];
    if(owner){spawn(owner,lane,0,guardian?.ROLE??0,false);guardian?.mark(state.units[state.units.length-1],team,lane);}
    state.effects.push({x:team===0?WIDTH/4:WIDTH*3/4,y:(lane+.5)*LANE_H,lane,team,kind:'guardian',time:1.4});
   }
  }else if(part==='turret')state.turrets[lane][team]=Math.max(0,state.turrets[lane][team]-amount);
  else state.cores[lane][team]=Math.max(0,state.cores[lane][team]-amount*CORE_DAMAGE_MULTIPLIER);
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
  if(major===0&&counts[0]>=3&&(bot.faction===3||bot.faction===4)&&bot.cash>=unitCost(bot.faction,6))return 6;
  return [[1,6,3],[3,5],[0,1],[2,6],[2,3],[0,6],[4,1],[0,5]][major][0];
 }
 // Hard AI spends its one global nuke after a 100-soldier-equivalent
 // enemy accumulation and a losing front. Only a nearly lost core overrides
 // the 100-soldier goal. Human users can fire whenever any opponent is alive.
 function hardBotPurchase(bot){
  const ai=global.DesertHardAI;if(!ai)return;
  const brain=bot.hardBrain||(bot.hardBrain=ai.create(bot.faction));
  if(bot.nukes){
   const opposing=state.units.filter(u=>u.hp>0&&!u.guardian&&u.team!==bot.team);
   const power=u=>global.DesertConsolidation?.strength?.(u)??1;
   const population=opposing.reduce((s,u)=>s+power(u),0);
   const near=opposing.filter(u=>bot.team===1?u.x>=WIDTH*.68:u.x<=WIDTH*.32)
    .reduce((s,u)=>s+power(u),0);
   const guard=state.units.filter(u=>u.hp>0&&u.team===bot.team&&
    (bot.team===1?u.x>=WIDTH*.62:u.x<=WIDTH*.38))
    .reduce((s,u)=>s+power(u),0);
   const cores=state.cores.map(row=>row[bot.team]);
   const weakest=Math.min(...cores);
   const critical=weakest<=CORE_HP*.15&&population>=20;
   const losing=weakest<=CORE_HP*.40||
    state.turrets.some(row=>row[bot.team]<=TOWER_HP*.16)||
    (near>=35&&near>=Math.max(18,guard*1.25));
   if((population>=100&&losing)||critical)tactic(bot,'nuke');
  }
  const ours=state.units.filter(u=>u.hp>0&&u.team===bot.team);
  const known=state.units.filter(u=>u.hp>0&&u.team!==bot.team&&((bot.team===1?u.x>=WIDTH*.56:u.x<=WIDTH*.44)||ours.some(v=>Math.hypot(v.x-u.x,v.y-u.y)<340)));
  const power=u=>u.heroCount===20?(global.DesertConsolidation?.strength?.(u)??20):1;
  let air=known.filter(u=>definition(u.faction,u.role).kind==='air').reduce((n,u)=>n+power(u),0);
  let armor=known.filter(u=>u.role===3||(u.role===6&&definition(u.faction,u.role).kind!=='air')).reduce((n,u)=>n+power(u),0);
  let roles=Array(8).fill(0);for(const u of known)if(!u.guardian)roles[u.role]+=power(u);
  // Re-use previously scouted threats for two waves; hidden factory contents
  // remain unknown, and the memory expires if no fresh units reappear.
  const seen=roles.reduce((n,v)=>n+v,0);
  if(seen){brain.lastRecon={at:state.seconds,roles:roles.slice(),air,armor};}
  else if(brain.lastRecon&&state.seconds-brain.lastRecon.at<48){
   roles=brain.lastRecon.roles.map(v=>Math.ceil(v*.7));
   air=Math.ceil(brain.lastRecon.air*.7);armor=Math.ceil(brain.lastRecon.armor*.7);
  }
  const lanePressure=Array(LANES).fill(0);for(const u of known)if(!u.guardian)lanePressure[Math.floor(u.y/LANE_H)]+=u.heroCount===20?20:1;
  const pressureTotal=lanePressure.reduce((n,v)=>n+v,0);
  const urgent=known.filter(u=>bot.team===1?u.x>WIDTH-580:u.x<580),invaded=urgent.length>0;
  // A vision-limited barrage is worth paying for when it hits a full
  // consolidated hero or a meaningful group, rather than blind-spamming it.
  if(state.wave>=3&&bot.barrageCd<=0&&bot.cash>=(state.aiDifficulty==='impossible'?350:420)){
   const largest=known.reduce((best,u)=>Math.max(best,known.reduce((sum,v)=>
    sum+(Math.hypot(u.x-v.x,u.y-v.y)<110?unitCost(v.faction,v.role)*power(v):0),0)),0);
   if(largest>=(state.aiDifficulty==='impossible'?480:650)){
    const before=bot.cash,shot=tactic(bot,'barrage');
    if(shot.ok)ai.bought(brain,{kind:'barrage'},before-bot.cash);
   }
  }
  // Buy real upgrades only out of surplus. They must not stall the first wave
  // of counter factories or the next scheduled extractor.
  const factories=bot.buildings.flat().filter(role=>role!==null&&role!==EXTRACTOR).length;
  if(state.wave>=(state.aiDifficulty==='impossible'?4:5)&&factories>=7&&!invaded&&roles.reduce((n,v)=>n+v,0)<10){
   const target=Math.min(5,1+Math.floor((state.wave-5)/5));
   if(bot.weapon<target||bot.armor<target){
    const kind=bot.weapon<=bot.armor?'weapon':'armor';
    const cost=kind==='weapon'?WEAPON_COST(bot.weapon):ARMOR_COST(bot.armor);
    if(bot.cash>=cost+240){
     const result=research(bot,kind);
     if(result.ok)ai.bought(brain,{kind:'research'},cost);
    }
   }
  }
  for(let purchase=0;purchase<(state.aiDifficulty==='impossible'?16:12);purchase++){
   const counts=Array(8).fill(0);for(const row of bot.buildings)for(const r of row)if(r!==null&&r!==EXTRACTOR)counts[r]++;
   let action=ai.choose(brain,{cash:bot.cash,counts,eco:bot.eco,readyAt:bot.ecoReadyAt,seconds:state.seconds,costs:COST.slice(0,8).map((_,r)=>unitCost(bot.faction,r)),ecoCost:ecoPrice(bot.eco),intel:{air,armor,invaded,roles}});
   const sizes=bot.buildings.map(row=>row.filter(r=>r!==null&&r!==EXTRACTOR).length),focus=brain.plan%LANES;
   // Twenty soldiers only form one hero if built by the same owner, in the
   // same lane, close to one another, and healthy. Keep a funded lane-specific
   // cohort after each lane has two real defensive factories.
   const heroSafe=state.wave>=6&&!invaded&&air<5&&armor<5&&sizes.every(n=>n>=2);
   const heroRole=brain.heroRole??([3,6,1,5][brain.plan]||1);
   if(brain.heroRole===undefined)brain.heroRole=heroRole;
   if(brain.heroLane===undefined)brain.heroLane=focus;
   const committed=bot.buildings[brain.heroLane].filter(r=>r===heroRole).length;
   const focusHero=heroSafe&&committed<20;
   if(focusHero&&action?.kind!=='econ')
    action=bot.cash>=unitCost(bot.faction,heroRole)?{kind:'unit',role:heroRole}:null;
   if(!action)break;
   const lanes=Array.from({length:LANES},(_,i)=>i).filter(l=>bot.buildings[l].some(x=>x===null)).sort((a,b)=>{
    const capacity=sizes.reduce((n,v)=>n+v,0)+1;
    const score=l=>sizes[l]-(pressureTotal?capacity*(.7*lanePressure[l]/pressureTotal+.1):(l===focus?2:0));
    return score(a)-score(b);
   });
   if(!lanes.length)break;
   const lane=focusHero&&action.kind==='unit'&&action.role===heroRole&&lanes.includes(brain.heroLane)
    ?brain.heroLane:lanes[0];
   const r=action.kind==='econ'?EXTRACTOR:action.role,cost=r===EXTRACTOR?ecoPrice(bot.eco):unitCost(bot.faction,r);
   const positions=bot.buildings[lane].map((v,i)=>v===r?i:-1).filter(i=>i>=0);
   const candidates=bot.buildings[lane].map((v,i)=>v===null?i:-1).filter(i=>i>=0);
   const point=i=>({x:(i%15)*4,y:((Math.floor(i/15)*11+(i%15)*21)%196)});
   const distance=(a,b)=>Math.hypot(point(a).x-point(b).x,point(a).y-point(b).y);
   candidates.sort((a,b)=>
    (positions.length?Math.min(...positions.map(i=>distance(a,i))):0)-
    (positions.length?Math.min(...positions.map(i=>distance(b,i))):0));
   const slot=candidates[0];
   if(bot.cash<cost)break;bot.cash-=cost;bot.buildings[lane][slot]=r;
   bot.buildingReadyAt[lane][slot]=r===EXTRACTOR?0:productionReadyAt();
   if(r===EXTRACTOR){bot.mineCosts[lane+'-'+slot]=cost;startExtractor(bot,lane,slot);}
   ai.bought(brain,action,cost);
  }
 }
 function botPurchase(bot){
  if(state.aiDifficulty==='veryhard'||state.aiDifficulty==='impossible'){hardBotPurchase(bot);return;}
   if(state.aiDifficulty==='easy'&&state.wave%2===1&&state.wave>1)return;

  // A paid early army deters players from investing everything in economy.
  for(let lane=0;lane<LANES;lane++){
   const existing=bot.buildings[lane].filter(x=>x!==null).length;
   const cap=state.aiDifficulty==='easy'?7:state.aiDifficulty==='hard'?16:12;
    const desired=Math.min(cap,1+Math.floor((state.wave+1)/(state.aiDifficulty==='easy'?5:3))+Math.floor(Math.max(0,state.wave-7)/(state.aiDifficulty==='hard'?2:3)));
   let count=Math.max(0,desired-existing);
   while(count-->0){
    let role=state.aiDifficulty==='easy'?[0,1,0,3][(state.wave+lane)%4]:selectCounter(lane,bot);
    if(bot.cash<unitCost(bot.faction,role))role=bot.cash>=COST[1]?1:0;
    if(bot.cash<unitCost(bot.faction,role))break;
    const slot=bot.buildings[lane].findIndex(x=>x===null);if(slot<0)break;
    bot.buildings[lane][slot]=role;bot.buildingReadyAt[lane][slot]=productionReadyAt();bot.cash-=unitCost(bot.faction,role);
   }
  }
  if(state.wave>(state.aiDifficulty==='easy'?12:5)&&bot.eco<(state.aiDifficulty==='easy'?3:5)&&state.seconds>=bot.ecoReadyAt){
   const c=ecoPrice(bot.eco),lane=bot.buildings.findIndex(slots=>slots.some(x=>x===null));
   if(lane>=0&&bot.cash>=c+180){const slot=bot.buildings[lane].findIndex(x=>x===null);bot.buildings[lane][slot]=EXTRACTOR;bot.mineCosts[lane+'-'+slot]=c;bot.cash-=c;startExtractor(bot,lane,slot);}
  }
 }
 // No wave-count or elapsed-time cap in classic, PvP or cooperative battles.
 // Only the opposing team's core destruction is a normal victory condition.
 function wave(){
  state.wave++;if(augmented){const ix=augmentRounds.indexOf(state.wave);if(ix>=0&&ix>state.augmentStage)beginAugment(ix);}state.marineSupports=[];state.marineRecruitCount.clear();state.broodBirthsByUid.clear();
  for(const p of state.players)p.prismWaveAt=state.seconds;
  for(const u of state.units){u.prismWaveAt=state.seconds;u.prismTime=state.seconds;}
  for(const p of state.players)if(state.seconds>=p.ecoReadyAt)p.cash+=24;
  for(const bot of state.players.filter(p=>p.bot))botPurchase(bot);
  for(let lane=0;lane<LANES;lane++)for(let team=0;team<2;team++){
   let count=(global.DesertConsolidation?.population(state.units,u=>u.lane===lane&&u.team===team)??state.units.filter(u=>u.lane===lane&&u.team===team&&u.hp>0).length);
   for(const p of state.players)if(p.team===team)for(let slot=0;slot<SLOTS;slot++){
    const role=p.buildings[lane][slot];
    if(role!==null&&role!==EXTRACTOR&&state.seconds+1e-6>=p.buildingReadyAt[lane][slot]){
     spawn(p,lane,slot,role);count++;
     const extra=augmented?global.DesertAugments.extra(p.augments,role):0;
     for(let n=0;n<extra;n++){spawn(p,lane,slot,role);count++;}
     if(p.faction===3&&role===7)for(const t of [1,2])state.marineSupports.push({uid:p.uid,lane,slot,wave:state.wave,due:state.seconds+HUANGLONG_INTERVAL*t});
    }
   }
  }
  for(const p of state.players){
   const special=global.DesertPrism?.waveEffects?.(p.augments,state.wave);
   if(!special)continue;
   const coresBeforeSpecial=state.cores.map(core=>core[p.team]);
   p.cash+=special.cash;
   for(const pct of special.repairs)for(const laneCores of state.cores)laneCores[p.team]=Math.min(CORE_HP,laneCores[p.team]+CORE_HP*pct);
   for(const pct of special.heals)for(const u of state.units)if(u.uid===p.uid&&u.hp>0&&!u.isHatchling&&!u.guardian)
    u.hp=Math.min(u.maxHP,u.hp+u.maxHP*pct);
   const lane=LANES===1?0:(state.wave+p.team)%LANES;
   for(const directive of special.spawns){
    let count=(global.DesertConsolidation?.population(state.units,x=>x.lane===lane&&x.team===p.team)
     ??state.units.filter(x=>x.hp>0&&x.lane===lane&&x.team===p.team).length);
    for(let n=0;n<directive.count;n++,count++)spawn(p,lane,0,directive.role,true,directive.faction??null);
   }
   if(!p.prismLastStandUsed)for(const last of special.laststands||[]){
    const danger=coresBeforeSpecial.map((hp,i)=>({lane:i,hp})).sort((a,b)=>a.hp-b.hp)[0];
    if(!danger||danger.hp/CORE_HP>last.pct)continue;
    p.prismLastStandUsed=true;
    for(const core of state.cores)core[p.team]=Math.min(CORE_HP,core[p.team]+CORE_HP*last.repair);
    let count=(global.DesertConsolidation?.population(state.units,x=>x.lane===danger.lane&&x.team===p.team)
     ??state.units.filter(x=>x.hp>0&&x.lane===danger.lane&&x.team===p.team).length);
    for(let n=0;n<last.count;n++,count++)spawn(p,danger.lane,0,last.role);
    state.effects.push({x:p.team===0?260:WIDTH-260,y:(danger.lane+.5)*LANE_H,lane:danger.lane,kind:'shield',time:1,team:p.team});
    break;
   }
  }
 }
 function deployMarineSupports(){
  if(!state.marineSupports.length)return;
  state.marineSupports=state.marineSupports.filter(job=>{
   if(job.wave!==state.wave)return false;
   if(job.due>state.seconds+1e-6)return true;
   const p=byUid(job.uid);
   if(p&&p.faction===3&&p.buildings[job.lane][job.slot]===7&&state.seconds+1e-6>=p.buildingReadyAt[job.lane][job.slot]&&state.cores[job.lane][p.team]>0
    &&true)spawn(p,job.lane,job.slot,7);
   return false;
  });
 }
 function marineSpoils(a,v,roll=Math.random){
  if(a.faction!==3||a.team===v.team||a.conscripted||v.conscripted||v.isHatchling||v.guardian)return;
  const owner=byUid(a.uid),enemy=byUid(v.uid);
  if(!owner||!enemy)return;
  if(roll()<MARINE_LOOT_CHANCE){
   const wanted=Math.min(24,Math.floor(unitCost(v.faction,v.role)*.12));
   const taken=Math.min(wanted,Math.max(0,Math.floor(enemy.cash)));
   if(taken>0){
    enemy.cash-=taken;owner.cash+=taken;state.marineStats.loot++;state.marineStats.lootedCR+=taken;marineRecord(a.uid,'loot');marineRecord(a.uid,'lootedCR',taken);
    state.effects.push({x:v.x,y:v.y,lane:v.lane,kind:'ginppai',time:.5,team:a.team});
   }
  }
  const recruits=state.marineRecruitCount.get(a.uid)||0;
  const lim=global.DesertPrism?.recruitLimits?.(owner.augments,MARINE_RECRUIT_CAP,MARINE_RECRUIT_CHANCE)||{cap:MARINE_RECRUIT_CAP,chance:MARINE_RECRUIT_CHANCE};
  if(recruits>=lim.cap||roll()>=lim.chance)return;
  
  state.marineRecruitCount.set(a.uid,recruits+1);
  state.marineStats.recruits++;marineRecord(a.uid,'recruits');
  const capturedHP=v.maxHP/(v.heroCount===20?20:1);
  state.units.push({...v,id:state.nextUnit++,uid:a.uid,team:a.team,heroCount:1,maxHP:capturedHP,hp:Math.max(1,Math.floor(capturedHP*MARINE_RECRUIT_HP)),
   radius:v.heroCount===20?v.radius/2:v.radius,targetId:null,inkUntil:0,lastInkCast:null,lastBroodBirth:null,lastDamagedAt:state.seconds,
   cool:1.5,conscripted:true,killed:false,spawnAge:0,hitAge:0,skillAge:0,attackAge:.4,act:'move'});
  state.effects.push({x:v.x,y:v.y,lane:v.lane,kind:'conscript',time:.7,team:a.team});
 }
 function applyHit(a,v,damage){
  const attacker=combatDef(a),defender=combatDef(v);
  const mult=matchupMultiplier(attacker,v,state.wave,a.role);
  if(v.hp<=0)return;
  let hit=global.DesertConsolidation?.hit(damage*mult,defender.armor,v,a)??Math.max(3,damage*mult-defender.armor*.66);
  if(v.faction===4&&attacker.range>=48)hit*=1-BEAST_RANGED_DAMAGE_REDUCTION;
  if(v.faction===0&&[3,4].includes(v.role))hit*=.94;
  if(v.faction===2&&state.seconds-(v.lastWardAt??-999)>=10){v.lastWardAt=state.seconds;hit*=.82;}
  if(a.faction===5&&[1,2,4,5,6].includes(a.role)&&Math.random()<.12)hit*=1.25;
  if(a.faction===6&&[0,3,6].includes(a.role)&&!a.isHatchling&&state.units.some(u=>
    u!==a&&u.hp>0&&u.team===a.team&&u.faction===6&&Math.hypot(u.x-a.x,u.y-a.y)<165))hit*=1.06;
  if((a.inkUntil||0)>state.seconds)hit*=.90;
  const before=v.hp;
  const prism=a.team!==v.team&&!a.guardian&&!a.isHatchling
   ?global.DesertPrism?.hitEffects?.(chosenOf(a),a,v,hit,state.seconds,state.units.filter(x=>x.hp>0&&x.team!==a.team&&x!==v),
      state.units.filter(x=>x.hp>0&&x.team===a.team&&x!==a)):null;
  if(prism)hit+=prism.bonus;
  v.hp-=hit;v.attackAge=.12;v.hitAge=.3;v.lastDamagedAt=state.seconds;
  if(v.hp<=0){
   const reboot=global.DesertPrism?.survival?.(chosenOf(v),v,state.seconds,v.hp)||0;
   if(reboot>0){
    v.hp=reboot;v.killed=false;
    state.effects.push({x:v.x,y:v.y,lane:v.lane,kind:'shield',time:.8,team:v.team});
   }
  }
  if(prism){
   if(prism.heal>0&&a.hp>0)a.hp=Math.min(a.maxHP,a.hp+prism.heal);
   if(prism.marked)v.inkUntil=Math.max(v.inkUntil||0,state.seconds+prism.marked);
    for(const echo of prism.allyHeal||[])if(echo.unit.hp>0){echo.unit.hp=Math.min(echo.unit.maxHP,echo.unit.hp+echo.amount);state.effects.push({x:echo.unit.x,y:echo.unit.y,lane:echo.unit.lane,kind:'pollen',time:.6,team:a.team});}
   for(const other of prism.secondary)if(other.target.hp>0){
    const previous=other.target.hp;other.target.hp-=other.damage;
     if(other.marked)other.target.inkUntil=Math.max(other.target.inkUntil||0,state.seconds+other.marked);
     combatHit(other.target,previous,a);
    if(other.target.hp<=0)other.target.killed=true;
    state.effects.push({x:other.target.x,y:other.target.y,lane:other.target.lane,kind:'blast',time:.4,team:a.team});
   }
  }
  if(v.team!==a.team&&!v.guardian){
   const reflected=global.DesertPrism?.reflectEffects?.(chosenOf(v),v,a,hit)||0;
   if(reflected>0&&a.hp>0){const previous=a.hp;a.hp-=reflected;combatHit(a,previous,v);if(a.hp<=0)a.killed=true;}
  }
  if(a.faction===4&&[0,3,6].includes(a.role)&&!a.isHatchling&&a.hp>0)
   a.hp=Math.min(a.maxHP,a.hp+Math.min(3*(a.heroCount||1),Math.max(0,Math.min(before,hit))*.015));
  if(a.faction===8&&[1,2,4,5].includes(a.role)&&state.seconds-(a.lastInkCast??-999)>=INK_COOLDOWN){
   a.lastInkCast=state.seconds;v.inkUntil=Math.max(v.inkUntil||0,state.seconds+INK_DURATION);
   state.effects.push({x:v.x,y:v.y,lane:v.lane,kind:'ink',time:.6,team:a.team});
  }
  combatHit(v,before,a);
  if(v.hp<=0&&!v.killed){
   v.killed=true;marineSpoils(a,v);
   const owner=byUid(a.uid);
   if(owner&&!a.isHatchling&&!a.guardian)for(const extra of global.DesertPrism?.deathEffects?.(owner.augments,a)||[]){
    let count=(global.DesertConsolidation?.population(state.units,x=>x.lane===v.lane&&x.team===a.team)
     ??state.units.filter(x=>x.hp>0&&x.lane===v.lane&&x.team===a.team).length);
    for(let i=0;i<extra.count;i++,count++)spawn(owner,v.lane,0,extra.role,true,extra.faction??null);
   }
  }
 }
 function attack(a,v){
  const d=combatDef(a,state.players);
  a.cool=Math.max(.3,d.rate);a.act='attack';a.attackAge=.33;
  if(a.role===7)a.skillAge=.54;
  const dmg=d.damage;
  if(a.role!==7&&d.range>=48){
   // Server-authoritative damage is unchanged; clients animate only these visible shots.
   if(state.effects.length>=160)state.effects.splice(0,state.effects.length-159);
   state.effects.push({kind:'projectile',x:a.x,y:a.y,tx:v.x,ty:v.y,role:a.role,
    faction:a.faction,team:a.team,lane:a.lane,time:.38});
  }
  if(a.role===7){
   if(v.isHatchling)return;
   if(a.faction===3){
    // Huanglong's existing one-use Marine banquet heals the entire injured squad.
    let healed=0;
    for(const x of state.units)if(x.id!==a.id&&x.hp>0&&!x.isHatchling&&x.team===a.team&&x.hp<x.maxHP&&Math.hypot(a.x-x.x,a.y-x.y)<195){
     const before=x.hp,amount=Math.max(135,x.maxHP*.32)*(a.heroCount||1)*(1+.08*(byUid(a.uid)?.weapon||0));
     x.hp=Math.min(x.maxHP,x.hp+(global.DesertGuardian?.healAmount(x,amount,state.seconds)??amount));healed+=x.hp-before;
    }
    if(healed>0){a.hp=0;state.effects.push({x:a.x,y:a.y,lane:a.lane,kind:'huanglong',time:.9,team:a.team});}
   }else{
    if(v.healWindowStart===undefined||state.seconds-v.healWindowStart>=1){v.healWindowStart=state.seconds;v.healWindowUsed=0;}
    const amount=Math.max(0,Math.min(d.heal||36,Math.max(80*(v.heroCount||1),v.maxHP*.085)-v.healWindowUsed));
    v.healWindowUsed+=amount;
    const received=global.DesertGuardian?.healAmount(v,amount,state.seconds)??amount,recovered=Math.min(received,v.maxHP-v.hp);
    v.hp=Math.min(v.maxHP,v.hp+received);
    if(recovered>0)for(const echo of global.DesertPrism?.healEcho?.(chosenOf(a),a,v,recovered,state.units,state.seconds)||[]){
     echo.unit.hp=Math.min(echo.unit.maxHP,echo.unit.hp+echo.amount);
     state.effects.push({x:echo.unit.x,y:echo.unit.y,lane:echo.unit.lane,kind:'pollen',time:.6,team:a.team});
    }
    if(a.faction===9&&recovered>0&&state.seconds-(a.lastPollenAt??-999)>=5){
     const partner=state.units.find(u=>u.id!==a.id&&u.id!==v.id&&u.hp>0&&!u.isHatchling
      &&u.team===a.team&&u.hp<u.maxHP&&Math.hypot(u.x-v.x,u.y-v.y)<145);
     if(partner){a.lastPollenAt=state.seconds;partner.hp=Math.min(partner.maxHP,partner.hp+(global.DesertGuardian?.healAmount(partner,recovered*FAIRY_CHAIN_HEAL_RATIO,state.seconds)??recovered*FAIRY_CHAIN_HEAL_RATIO));
      state.effects.push({x:partner.x,y:partner.y,lane:partner.lane,kind:'pollen',time:.45,team:a.team});}
    }
   }
   return;
  }
  if(a.role===6&&[3,4,6].includes(a.faction)){
   // Ground truck/panther charges punish a melee clump without hitting aircraft.
   const nearby=state.units.filter(x=>x.team!==a.team&&x.hp>0&&definition(x.faction,x.role).kind==='ground'&&Math.hypot(x.x-v.x,x.y-v.y)<58)
    .sort((x,y)=>Math.hypot(x.x-v.x,x.y-v.y)-Math.hypot(y.x-v.x,y.y-v.y)).slice(0,a.faction===6?2:3);
   nearby.forEach((x,i)=>applyHit(a,x,dmg*(a.faction===6?(i===0?1:.65):(x.role===0?1.3:x.role===3?.55:1))
    *(global.DesertConsolidation?.splashWeight?.(x,global.DesertConsolidation?.strength(a)||1)||1)));
   if(a.faction===3&&nearby.length){state.marineStats.bongoCharges++;marineRecord(a.uid,'bongoCharges');state.effects.push({x:v.x,y:v.y,lane:v.lane,kind:'bongo',time:.5,team:a.team});}
  }else if(a.role===5){
   const radius=d.blast+10,volley=global.DesertConsolidation?.strength?.(a)||1;
   for(const x of state.units)if(x.team!==a.team&&x.hp>0&&definition(x.faction,x.role).kind!=='air'){
    const distance=Math.hypot(x.x-v.x,x.y-v.y);
    if(distance<=radius)applyHit(a,x,dmg*(1-.48*distance/radius)*(global.DesertConsolidation?.splashWeight?.(x,volley)||1));
   }
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
   u.prismTime=state.seconds;
   const d=combatDef(u,state.players),support=u.role===7,r=support?SUPPORT_RADIUS:AGGRO_RADIUS;
   if(!u.isHatchling&&d.regen>0)u.hp=Math.min(u.maxHP,u.hp+u.maxHP*d.regen*dt);
   const moveSpeed=d.speed*((u.inkUntil||0)>state.seconds?.80:1);
   if(!u.isHatchling){
    if(u.faction===8)u.hp=Math.min(u.maxHP,u.hp+u.maxHP*OCTOPER_REGEN*dt);
    if(u.faction===7)u.hp=Math.min(u.maxHP,u.hp+u.maxHP*ROBOT_REPAIR*dt);
   }
   u.cool=Math.max(0,u.cool-dt);u.frame=(u.frame+dt*11)%16;u.attackAge=Math.max(0,u.attackAge-dt);
   u.spawnAge=Math.min(5,(u.spawnAge||0)+dt);u.hitAge=Math.max(0,(u.hitAge||0)-dt);u.skillAge=Math.max(0,(u.skillAge||0)-dt);
   const valid=v=>v&&v.hp>0&&v.id!==u.id&&(support?
     v.team===u.team&&!v.isHatchling&&v.hp<v.maxHP-10:
     v.team!==u.team&&(d.airTarget||definition(v.faction,v.role).kind!=='air')&&(!u.guardian||global.DesertGuardian?.canTarget(u,v,d.range,{multiplayer:true})));
   const priority=v=>(u.role===4&&definition(v.faction,v.role).kind==='air'?175:0)
    +(u.role===6&&[4,6].includes(u.faction)&&[5,7].includes(v.role)?80:0)
    +(d.good.includes(v.role)?Math.min(35,d.range*.2):0);
   let target=byId.get(u.targetId),best=target?Math.hypot(target.x-u.x,target.y-u.y):Infinity;
   if(!valid(target)||best>(support?SUPPORT_RADIUS:AGGRO_LEASH)){target=null;best=Infinity;}
   let targetScore=target?best-(support?0:priority(target)):Infinity;
   for(const v of nearby(support?u.team:1-u.team,u.x,u.y,r)){
    if(!valid(v))continue;
    const distance=Math.hypot(v.x-u.x,v.y-u.y);
    const score=distance-(support?0:priority(v));
    if(score+36<targetScore){target=v;best=distance;targetScore=score;}
   }
   const currentLane=clamp(Math.floor(u.y/LANE_H),0,LANES-1);
   const forward=fort(currentLane,1-u.team),forwardDistance=Math.hypot(forward.x-u.x,forward.y-u.y);
   const towerInFront=u.team===0?u.x<=forward.x+45:u.x>=forward.x-45;
   const interceptForward=!support&&!u.guardian&&forward.part==='forward'&&towerInFront
    &&forwardDistance<=Math.max(360,d.range+125)
    &&(!target||forwardDistance+32<best);
   if(interceptForward){target=null;best=Infinity;}
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
    }else if(u.guardian){
     const x=u.guardianHomeX,y=(u.guardianLane+.5)*LANE_H,dist=Math.hypot(x-u.x,y-u.y),move=Math.min(moveSpeed*dt,dist);
     if(dist>1){u.x+=(x-u.x)/dist*move;u.y+=(y-u.y)/dist*move;u.act='move';}else u.act='idle';
    }else{
     // Choose an enemy defense based on *current* position after cross-band aggro.
     const lane=clamp(Math.floor(u.y/LANE_H),0,LANES-1),defender=1-u.team;
     const targetFort=fort(lane,defender),tx=targetFort.x;
     const ty=targetFort.y,dist=Math.hypot(tx-u.x,ty-u.y);
     if(state.cores[lane][defender]>0){
      if(dist>Math.max(48,d.range*.85)){
       const step=Math.min(moveSpeed*dt,dist);
       u.x+=(tx-u.x)/Math.max(dist,1)*step;u.y+=(ty-u.y)/Math.max(dist,1)*step;u.act='move';
      }else if(u.cool<=0){
       const damage=d.damage*([.52,.88,1.12,1.08,.82,1.55,.87,.4][u.role]||1);
       hitFort(lane,defender,damage,targetFort.part);
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
   global.DesertGuardian?.clampUnit(u,{multiplayer:true});
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
  for(const u of state.units)if(u.hp>0){global.DesertGuardian?.clampUnit(u,{multiplayer:true});u.lane=clamp(Math.floor(u.y/LANE_H),0,LANES-1);}
  // Independent anti-snowball towers in all three lanes for both teams.
  for(let lane=0;lane<LANES;lane++)for(let team=0;team<2;team++)for(const forward of [false,true]){
   const hp=forward?state.forwardHP:state.turrets,cool=forward?state.forwardCooldown:state.towerCooldown;
   if(hp[lane][team]<=0)continue;
   const x=forward?(team===0?WIDTH/4:WIDTH*3/4):team===0?215:WIDTH-215,y=(lane+.5)*LANE_H;
   cool[lane][team]=Math.max(0,cool[lane][team]-dt);
   if(cool[lane][team]>0)continue;
   const hostile=state.units.filter(u=>u.hp>0&&u.team!==team&&Math.hypot(u.x-x,u.y-y)<=TOWER_RANGE);
   if(!hostile.length)continue;
   hostile.sort((a,b)=>(Math.hypot(a.x-x,a.y-y)*.55+a.hp/a.maxHP*42-(a.role===7?35:0))
    -(Math.hypot(b.x-x,b.y-y)*.55+b.hp/b.maxHP*42-(b.role===7?35:0)));
   const v=hostile[0],f=combatDef(v),dmg=TOWER_DAMAGE*(forward?.75:1)*(f.kind==='air'?1.25:v.role===3?1.12:1);
   let hit=global.DesertConsolidation?.hit(dmg,f.armor,v,null)??Math.max(3,dmg-f.armor*.66);
   if(v.faction===0&&[3,4].includes(v.role))hit*=.94;
   if(v.faction===2&&state.seconds-(v.lastWardAt??-999)>=10){v.lastWardAt=state.seconds;hit*=.82;}
   v.hp-=hit;v.lastDamagedAt=state.seconds;
   if(v.hp<=0){
    const reboot=global.DesertPrism?.survival?.(chosenOf(v),v,state.seconds,v.hp)||0;
    if(reboot>0){v.hp=reboot;v.killed=false;state.effects.push({x:v.x,y:v.y,lane:v.lane,kind:'shield',time:.8,team:v.team});}
   }
   cool[lane][team]=TOWER_PERIOD;
   // Defensive towers also fire the same faction atlas as regular ranged units.
   const faction=state.players.find(p=>p.team===team)?.faction??0;
   if(state.effects.length>=160)state.effects.splice(0,state.effects.length-159);
   state.effects.push({kind:'projectile',originKind:forward?'forward':'turret',x,y,tx:v.x,ty:v.y,role:4,faction,team,lane,time:.38});
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
  const required=LANES===1?1:2;
  if(lost[0]>=required||lost[1]>=required){state.ended=true;state.winner=lost[0]>=required&&lost[1]>=required?null:lost[1]>=required?0:1;}
 }
 function tick(dt){
  if(state.ended)return;
  dt=clamp(Number(dt)||0,0,.2);state.seconds+=dt;
  if(state.augmentChoice){
   state.augmentChoice.remaining=Math.max(0,state.augmentChoice.remaining-dt);
   if(state.augmentChoice.remaining===0){for(const p of state.players){const entry=state.augmentChoice?.offers[p.uid];if(entry&&!entry.selected)chooseAugment(p,aug.pick());}}
   if(state.augmentChoice)return;
  }
  state.next-=dt;
   for(const p of state.players)p.barrageCd=Math.max(0,p.barrageCd-dt);
  if(state.seconds>=state.nextConsolidation){state.nextConsolidation=state.seconds+1;
   const outcome=global.DesertConsolidation?.compact(state.units,{now:state.seconds,multiplayer:true});
   for(const hero of outcome?.heroes||[]){
    hero._combatLife=20;
    if(!hero.guardian&&!hero.conscripted){const owner=byUid(hero.uid);if(owner)owner.combatStats.heroes[hero.role]++;}
   }}
  // Correct fixed income for every *owner*, not pooled by team.
  const before=Math.floor((state.seconds-dt)*2),now=Math.floor(state.seconds*2);
  if(now>before)for(let slice=before+1;slice<=now;slice++)for(const p of state.players)if(slice*.5+1e-6>=p.ecoReadyAt)p.cash+=incomePerTick(p.eco);
  if(state.aiDifficulty==='veryhard'||state.aiDifficulty==='impossible')for(const bot of state.players.filter(p=>p.bot))if(state.seconds>=(bot.hardBrain?.nextThink||0)){hardBotPurchase(bot);if(bot.hardBrain)bot.hardBrain.nextThink=state.seconds+(state.aiDifficulty==='impossible'?.45:1);}
  while(state.next<=0){state.next+=WAVE_INTERVAL;wave();}
  deployMarineSupports();
  stepUnits(dt);
  for(const u of state.units)if(u.hp<=0&&(u._combatLife??0)>0)combatHit(u,Math.max(0,u.hp));
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
  const offer=state.augmentChoice?.offers?.[viewerUid];
  return {ruleset:state.ruleset,augmentChoice:offer?{round:state.augmentChoice.round,tier:state.augmentChoice.tier,remaining:state.augmentChoice.remaining,cards:offer.cards.slice(),rerolls:offer.rerolls.slice(),selected:offer.selected}:null,
   mode:state.mode,size:state.size,aiDifficulty:state.aiDifficulty,width:WIDTH,height:HEIGHT,lanes:LANES,coreMaxHP:CORE_HP,preparationEndsAt:OPENING_PREP_SECONDS,seconds:Math.round(state.seconds*10)/10,wave:state.wave,next:Math.ceil(state.next*10)/10,
   ended:state.ended,winner:state.winner,cores:state.cores,turrets:state.turrets,forwardHP:state.forwardHP,lanePressure:state.lanePressure.map(x=>Math.round(x*100)/100),
   fog:visible.map(s=>!s),viewerTeam:viewer?.team??null,
   factionTraits:state.players.filter(p=>!viewer||p.team===viewer.team).map(p=>({uid:p.uid,faction:p.faction,births:state.broodBirthsByUid.get(p.uid)||0,totalBirths:state.broodTotalByUid.get(p.uid)||0})),
   marineOps:state.players.filter(p=>p.faction===3&&(!viewer||p.team===viewer.team)).map(p=>({uid:p.uid,team:p.team,...(state.marineStatsByUid.get(p.uid)||{loot:0,lootedCR:0,recruits:0,huangSpawns:0,bongoCharges:0}),waveRecruits:state.marineRecruitCount.get(p.uid)||0})),
   players:state.players.map(p=>({uid:p.uid,name:p.name,faction:p.faction,skin:p.skin,team:p.team,bot:p.bot,
    produced:state.ended||allied(p)?p.produced.slice():null,
    combatStats:state.ended||allied(p)?Object.fromEntries(Object.entries(p.combatStats).map(([k,v])=>[k,v.slice()])):null,
    augments:p.augments.slice(),cash:allied(p)?Math.floor(p.cash):null,eco:allied(p)?p.eco:null,ecoReadyAt:allied(p)?p.ecoReadyAt:null,weapon:allied(p)?p.weapon:null,armor:allied(p)?p.armor:null,
    mineTimings:allied(p)?Object.fromEntries(Object.entries(p.mineTimings).map(([key,value])=>[key,{...value}])):{},
    nukes:allied(p)?p.nukes:null,barrageCd:allied(p)?Math.ceil(p.barrageCd*10)/10:null,
    buildings:p.buildings.map((slots,lane)=>allied(p)||visible[lane]?slots:Array(SLOTS).fill(null)),
    buildingReadyAt:p.buildingReadyAt.map((row,lane)=>allied(p)||visible[lane]?row.slice():Array(SLOTS).fill(0))})),
   units:state.units.filter(u=>!isHidden(u.team,u.lane,u.x)).map(u=>({id:u.id,uid:u.uid,team:u.team,faction:u.faction,skin:u.skin||'default',role:u.role,lane:u.lane,x:Math.round(u.x),y:Math.round(u.y),hp:Math.ceil(u.hp),maxHP:Math.ceil(u.maxHP),heroCount:u.heroCount===20?20:1,guardian:!!u.guardian,guardianLane:u.guardian?u.guardianLane:null,conscripted:!!u.conscripted,isHatchling:!!u.isHatchling,frame:Math.floor(u.frame),act:u.hitAge>0?'hit':u.spawnAge<.42?'spawn':u.skillAge>0?'skill':u.attackAge>0?'attack':u.act})),
   effects:state.effects.filter(e=>!isHidden(e.team,e.lane,e.x)).map(e=>({...e,x:Math.round(e.x),y:Math.round(e.y)}))};
 }
 // Both bot difficulties use their real opening cash at second zero, just as
 // human players can. With timed construction a bot that first bought at wave 1
 // would unfairly miss its own first deployment and lose a whole wave.
 for(const bot of state.players.filter(p=>p.bot))botPurchase(bot);
 return {state,order,tick,wave,snapshot,definition};
}
global.DesertTriEngine=Object.freeze({create,definition,unitCost,counterAdvantage,matchupMultiplier,WIDTH,HEIGHT,LANE_H,LANES,COLS,ROWS,SLOTS,COST,NAMES,EXTRACTOR,ecoPrice,ecoBuildSeconds,ecoStabilize,incomePerTick,OPENING_PREP_SECONDS,WAVE_INTERVAL,FACTORY_BUILD_SECONDS,WEAPON_COST,ARMOR_COST});
})(typeof window==='undefined'?globalThis:window);
