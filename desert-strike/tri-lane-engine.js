/* Desert Front — 3-line authoritative multiplayer combat kernel.
 * No DOM, Firebase or browser dependency. One host simulates; clients send orders.
 * Area: original 3300 x 520 -> 3300 x 1560 (3 independent 520-high lanes).
 */
(function(global){
'use strict';
const LANES=3,WIDTH=3300,HEIGHT=1560,LANE_H=520,COLS=15,ROWS=5,SLOTS=COLS*ROWS;
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
const GOODS=[[5,7],[0,7],[3,4],[1,4],[6],[1,4],[0,3],[3,1]];
const BADS=[[3,1],[3,5],[0,1],[2,6],[3,2],[0,6],[4,1],[0,5]];
function definition(faction,role){
 const shared=global.DesertRoster?.getDef;
 if(typeof shared==='function')return shared(role,faction);
 const t=BASE[role],mut=[[1.055,1,.96],[.995,1,1.12],[.99,1.09,1],[1.09,1.06,1.01],[1.04,1,1.06],[.94,1,.99]][faction]||[1,1,1];
 const beast=faction===4,elf=faction===5,bongo=faction===3&&role===6,prowler=beast&&role===6;
 const melee=beast&&[0,3,6].includes(role),ranged=elf&&[1,2,4,5,6].includes(role);
 return {
  hp:bongo?565:t[0]*2.25*mut[0]*(elf&&role===0?.88:beast&&role===3?1.13:1),
  damage:bongo?36:prowler?37:t[1]*.94*mut[1]*(beast?(melee?1.22:.87):elf?(ranged?1.045:role===0?.84:1):1),
  armor:bongo?7:prowler?3:t[2],
  range:bongo?43:prowler?40:t[3]*(ranged?1.10:1),
  rate:bongo?1.45:prowler?.95:t[4],
  speed:bongo?77:prowler?90:t[5]*mut[2]*.84*(melee?1.14:1),
  airTarget:bongo||prowler?false:t[6],
  kind:bongo||prowler?'ground':t[7],
  heal:(role===7?36:0)*mut[1]*1.5,
  blast:role===5?58:0,
  good:bongo||prowler?[0,7]:GOODS[role],bad:bongo||prowler?[2,3]:BADS[role]
 };
}
function roomPlayers(input){const x=Array.isArray(input)?input:Object.values(input||{});return x.map(p=>({uid:String(p.uid||p.id||''),name:String(p.name||'지휘관').slice(0,16),team:Number(p.team),faction:Number(p.faction),bot:!!p.bot}));}
function create({mode='pvp',size=1,members=[]}={}){
 if(!['pvp','coop'].includes(mode)||!Number.isInteger(size)||size<1||size>3||(mode==='coop'&&size<2))throw Error('경기 모드/인원 오류');
 const humans=roomPlayers(members);
 if(humans.some(p=>!p.uid||p.team<0||p.team>1||p.faction<0||p.faction>5)||new Set(humans.map(p=>p.uid)).size!==humans.length)throw Error('부적절한 참가자 목록');
 if(mode==='coop'&&(humans.length!==size||humans.some(p=>p.team!==0)))throw Error('협동 인원과 팀이 일치하지 않습니다');
 if(mode==='pvp'&&(humans.filter(p=>p.team===0).length!==size||humans.filter(p=>p.team===1).length!==size))throw Error('경쟁 양 팀 인원이 일치하지 않습니다');
 const players=humans.concat(mode==='coop'?Array.from({length:size},(_,i)=>({uid:'AI_'+i,name:'적 AI '+(i+1),team:1,faction:(i+3)%6,bot:true})):[]);
 const state={mode,size,seconds:0,wave:0,next:24,ended:false,winner:null,
  width:WIDTH,height:HEIGHT,lanes:LANES,
  cores:Array.from({length:LANES},()=>[2500,2500]),units:[],effects:[],nextUnit:1,players:players.map(p=>({...p,cash:360,eco:0,buildings:Array.from({length:3},()=>Array(SLOTS).fill(null))})),lanePressure:[.5,.5,.5]};
 const byUid=uid=>state.players.find(p=>p.uid===uid);
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
  const radius=role===3?23:((p.faction===3||p.faction===4)&&role===6)?27:role===6?15:15;
  state.units.push({id:state.nextUnit++,uid:p.uid,team:p.team,faction:p.faction,role,lane,x,y,hp:d.hp,maxHP:d.hp,cool:Math.random()*.6,
    radius,frame:Math.floor(Math.random()*16),act:'move',attackAge:0});
 }
 function selectCounter(lane,bot){
  const counts=Array(8).fill(0), foes=state.players.filter(p=>p.team===0);
  for(const p of foes)for(const x of p.buildings[lane])if(x!==null)counts[x]++;
  const major=counts.indexOf(Math.max(...counts));
  // Role 6 is a ground truck/cavalry for these factions, not an aircraft.
  if(major===6&&foes.some(p=>(p.faction===3||p.faction===4)&&p.buildings[lane].includes(6)))return 2;
  // Marine trucks and beast cavalry can answer a sufficiently large melee swarm.
  if(major===0&&counts[0]>=3&&(bot.faction===3||bot.faction===4)&&bot.cash>=COST[6])return 6;
  const preferred=[[1,6,3],[3,5],[0,1],[2,6],[2,3],[0,6],[4,1],[0,5]][major];
  return preferred[0];
 }
 function botPurchase(bot){
  for(let lane=0;lane<3;lane++){
   const existing=bot.buildings[lane].filter(x=>x!==null).length;
   const enemy=state.players.filter(p=>p.team===0).reduce((sum,p)=>sum+p.buildings[lane].filter(x=>x!==null).length,0);
   const desired=Math.max(1,Math.min(18,Math.ceil(enemy/size*1.05)));
   if(existing>=desired)continue;
   let role=selectCounter(lane,bot);
   if(bot.cash<COST[role])role=1;
   if(bot.cash<COST[role])continue;
   const slot=bot.buildings[lane].findIndex(x=>x===null);
   if(slot>=0){bot.buildings[lane][slot]=role;bot.cash-=COST[role];}
  }
  if(state.wave>5&&bot.eco<5&&bot.cash>390){
   const c=Math.round(70*Math.pow(1.36,bot.eco));bot.eco++;bot.cash-=c;
  }
 }
 function wave(){
  state.wave++;for(const p of state.players)p.cash+=24;
  for(const bot of state.players.filter(p=>p.bot))botPurchase(bot);
  for(let lane=0;lane<LANES;lane++)for(let team=0;team<2;team++){
   let count=state.units.filter(u=>u.lane===lane&&u.team===team&&u.hp>0).length;
   for(const p of state.players)if(p.team===team)for(let slot=0;slot<SLOTS&&count<75;slot++){
    const role=p.buildings[lane][slot];if(role!==null){spawn(p,lane,slot,role);count++;}
   }
  }
 }
 function applyHit(a,v,damage){
  const attacker=definition(a.faction,a.role),defender=definition(v.faction,v.role);
  let mult=1;
  if(v.role===6&&(v.faction===3||v.faction===4)){
   mult=a.role===2?1.65:a.role===0?.68:a.role===4?.78:1;
  }else{
   if(attacker.good.includes(v.role))mult*=1.55;
   if(attacker.bad.includes(v.role))mult*=.7;
  }
  v.hp-=Math.max(3,damage*mult-defender.armor*.66);
  v.attackAge=.12;
 }
 function attack(a,v){
  const d=definition(a.faction,a.role);
  a.cool=Math.max(.3,d.rate);a.act='attack';a.attackAge=.33;
  const dmg=d.damage;
  if(a.role===7){
   if(a.faction===3){
    // Huanglong's existing one-use Marine banquet heals the entire injured squad.
    let healed=0;
    for(const x of state.units)if(x.id!==a.id&&x.hp>0&&x.team===a.team&&x.lane===a.lane&&x.hp<x.maxHP&&Math.hypot(a.x-x.x,a.y-x.y)<195){
     const before=x.hp;x.hp=Math.min(x.maxHP,x.hp+Math.max(135,x.maxHP*.32));healed+=x.hp-before;
    }
    if(healed>0)a.hp=0;
   }else v.hp=Math.min(v.maxHP,v.hp+(d.heal||36));
   return;
  }
  if(a.role===6&&(a.faction===3||a.faction===4)){
   // Ground truck/panther charges punish a melee clump without hitting aircraft.
   const nearby=state.units.filter(x=>x.lane===a.lane&&x.team!==a.team&&x.hp>0&&definition(x.faction,x.role).kind==='ground'&&Math.hypot(x.x-v.x,x.y-v.y)<58)
    .sort((x,y)=>Math.hypot(x.x-v.x,x.y-v.y)-Math.hypot(y.x-v.x,y.y-v.y)).slice(0,3);
   for(const x of nearby)applyHit(a,x,dmg*(x.role===0?1.35:x.role===3?.55:1));
  }else if(a.role===5){
   for(const x of state.units)if(x.lane===a.lane&&x.team!==a.team&&x.hp>0&&definition(x.faction,x.role).kind!=='air'&&Math.hypot(x.x-v.x,x.y-v.y)<66)applyHit(a,x,dmg*.8);
  }else applyHit(a,v,dmg);
  if(state.effects.length>100)state.effects.shift();
  state.effects.push({x:v.x,y:v.y,lane:a.lane,kind:a.role===5?'blast':'hit',time:.3,team:a.team});
 }
 function stepUnits(dt){
  const teams=Array.from({length:3},()=>[[],[]]);
  for(const u of state.units)if(u.hp>0)teams[u.lane][u.team].push(u);
  for(const u of state.units){
   if(u.hp<=0||state.cores[u.lane][1-u.team]<=0)continue;
   const d=definition(u.faction,u.role);u.cool=Math.max(0,u.cool-dt);u.frame=(u.frame+dt*11)%16;
   u.attackAge=Math.max(0,u.attackAge-dt);
   const enemies=teams[u.lane][1-u.team];
   let target=null,best=Infinity;
   if(u.role===7){
    for(const v of teams[u.lane][u.team])if(v!==u&&v.hp>0&&v.hp<v.maxHP-10){
     const distance=Math.hypot(v.x-u.x,v.y-u.y);
     if(distance<best){best=distance;target=v;}
    }
   }else for(const v of enemies){
    if(v.hp<=0||(!d.airTarget&&definition(v.faction,v.role).kind==='air'))continue;
    const distance=Math.hypot(v.x-u.x,v.y-u.y);
    if(distance<best){best=distance;target=v;}
   }
   if(target){
    const reach=d.range<48?Math.max(d.range,u.radius+target.radius+6):d.range*.88;
    if(best<=reach){
     if(u.cool<=0)attack(u,target);
    }else{
     const dx=target.x-u.x,dy=target.y-u.y,len=best||1,step=Math.min(d.speed*dt,best);
     u.x+=dx/len*step;u.y+=dy/len*step;u.act='move';
    }
   }else{
    const tx=u.team===0?WIDTH-110:110,ty=(u.lane+.5)*LANE_H;
    const dist=Math.hypot(tx-u.x,ty-u.y);
    if(dist>Math.max(48,d.range*.85)){
     const sp=Math.min(d.speed*dt,dist);u.x+=(tx-u.x)/dist*sp;u.y+=(ty-u.y)/dist*sp;u.act='move';
    }else if(u.cool<=0){state.cores[u.lane][1-u.team]=Math.max(0,state.cores[u.lane][1-u.team]-d.damage*([.52,.88,1.12,1.08,.82,1.55,.87,.4][u.role]||1));u.cool=d.rate;u.act='attack';u.attackAge=.28;}
   }
   u.x=clamp(u.x,35,WIDTH-35);
   u.y=clamp(u.y,u.lane*LANE_H+80,(u.lane+1)*LANE_H-80);
  }
  // Shared-space hash per lane prevents infantry from stacking into a single high-DPS pixel.
  const grid=new Map(),cell=64;
  for(const u of state.units)if(u.hp>0){
   const key=u.lane+','+Math.floor(u.x/cell)+','+Math.floor(u.y/cell);
   if(!grid.has(key))grid.set(key,[]);grid.get(key).push(u);
  }
  for(const u of state.units)if(u.hp>0){
   const gy=Math.floor(u.y/cell),gx=Math.floor(u.x/cell),layer=definition(u.faction,u.role).kind;
   for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++)for(const v of grid.get(u.lane+','+(gx+ox)+','+(gy+oy))||[]){
    if(v.id<=u.id||v.hp<=0||definition(v.faction,v.role).kind!==layer)continue;
    let dx=v.x-u.x,dy=v.y-u.y,d=Math.hypot(dx,dy),min=u.radius+v.radius;
    if(d>=min)continue;
    if(d<.01){dx=(u.id%3)-1;dy=(v.id%3)-1||1;d=Math.hypot(dx,dy);}
    const push=Math.min(16,(min-d)*.47);
    u.x-=dx/d*push;u.y-=dy/d*push;v.x+=dx/d*push;v.y+=dy/d*push;
   }
  }
  state.units=state.units.filter(u=>u.hp>0);
  for(const e of state.effects)e.time-=dt;
  state.effects=state.effects.filter(e=>e.time>0);
  for(let lane=0;lane<LANES;lane++){
   const mine=teams[lane][0].length?Math.max(...teams[lane][0].map(u=>u.x)):WIDTH/2;
   const theirs=teams[lane][1].length?Math.min(...teams[lane][1].map(u=>u.x)):WIDTH/2;
   state.lanePressure[lane]=clamp((mine+theirs)/2/WIDTH,.04,.96);
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
  stepUnits(dt);
  if(state.seconds>=1200&&!state.ended){
   const scores=[0,0];for(const v of state.cores){scores[0]+=v[0];scores[1]+=v[1];}
   state.ended=true;state.winner=scores[0]===scores[1]?null:scores[0]>scores[1]?0:1;
  }
 }
 function snapshot(){
  // One compact, sanitized authoritative packet per 200–350ms. Never trusts client state.
  return {mode:state.mode,size:state.size,width:WIDTH,height:HEIGHT,seconds:Math.round(state.seconds*10)/10,wave:state.wave,next:Math.ceil(state.next*10)/10,
   ended:state.ended,winner:state.winner,cores:state.cores,lanePressure:state.lanePressure.map(x=>Math.round(x*100)/100),
   players:state.players.map(p=>({uid:p.uid,name:p.name,faction:p.faction,team:p.team,bot:p.bot,cash:Math.floor(p.cash),eco:p.eco,
    buildings:p.buildings})),
   units:state.units.map(u=>({id:u.id,uid:u.uid,team:u.team,faction:u.faction,role:u.role,lane:u.lane,x:Math.round(u.x),y:Math.round(u.y),hp:Math.ceil(u.hp),maxHP:Math.ceil(u.maxHP),frame:Math.floor(u.frame),act:u.attackAge>0?'attack':u.act})),
   effects:state.effects.map(e=>({...e,x:Math.round(e.x),y:Math.round(e.y)}))};
 }
 return {state,order,tick,wave,snapshot,definition};
}
global.DesertTriEngine=Object.freeze({create,definition,WIDTH,HEIGHT,LANE_H,LANES,COLS,ROWS,SLOTS,COST,NAMES});
})(typeof window==='undefined'?globalThis:window);
