'use strict';
// Reproducible Monte Carlo balance benchmark, runs the *real Desert Front game engine*.
// No made-up combat formula; all factions, mirrored sides, seeded randomness.
// Run: node desert-strike/balance-sim.cjs [skirmish|campaign|all] [seedCount]
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const game=fs.readFileSync(path.join(__dirname,'game-v2.js'),'utf8');
const which=process.argv[2]||'skirmish';
const samples=Math.max(1,Math.min(12,Number(process.argv[3])||2));
const ids=new Map();
const fakeCtx=new Proxy({createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}},{get(x,k){return k in x?x[k]:()=>{};},set(x,k,v){x[k]=v;return true;}});
function el(id){
 if(ids.has(id))return ids.get(id);
 const classes=new Set();
 const v={id,style:{},dataset:{},textContent:'',innerHTML:'',disabled:false,open:false,
  classList:{add(k){classes.add(k);},remove(k){classes.delete(k);},contains(k){return classes.has(k);},toggle(k,yes){if(yes??!classes.has(k))classes.add(k);else classes.delete(k);}},
  addEventListener(){},getContext(){return fakeCtx;},getBoundingClientRect(){return {width:1100,height:520,left:0,top:0};},querySelectorAll(){return []},setAttribute(){},removeAttribute(){},showModal(){},close(){}};
 ids.set(id,v);return v;
}
const document={
 getElementById:el,querySelector(){return null},querySelectorAll(){return []},
 createElement(){return {width:0,height:0,getContext(){return fakeCtx;}};},addEventListener(){}
};
let rngState=1;
const randomMath=Object.create(Math);
randomMath.random=()=>((rngState=(Math.imul(rngState,1664525)+1013904223)>>>0)/4294967296);
const ctx={document,window:{addEventListener(){}},requestAnimationFrame(){},console,Math:randomMath,Date,Number,String,Object,Array,Map,Set};
// Benchmark the shipped consolidation, guardian and AI rules, not their no-plugin fallbacks.
for(const name of ['unit-consolidation.js','defense-guardian.js','hard-ai.js'])
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx,{filename:name,timeout:10000});
const simHooks=String.raw`
function simulateAI(){
 // Run the exact same in-game AI brain, build prices, wave stipend and income for both sides.
 // Temporarily mirror all the data fields the stock AI expects for the human player.
 function mirror(){
  [state.built,state.enemyBuilt]=[state.enemyBuilt,state.built];
  [state.cash,state.enemyCash]=[state.enemyCash,state.cash];
  [state.eco,state.enemyEco]=[state.enemyEco,state.eco];
  [state.ecoReadyAt,state.enemyEcoReadyAt]=[state.enemyEcoReadyAt,state.ecoReadyAt];
  [state.mineCosts,state.enemyMineCosts]=[state.enemyMineCosts,state.mineCosts];
  [state.faction,state.enemyFaction]=[state.enemyFaction,state.faction];
  for(const u of state.units){u.side=1-u.side;u.x=WORLD_W-u.x;}
 }
 if(state.wave%2){mirror();aiInvest();mirror();aiInvest();}
 else{aiInvest();mirror();aiInvest();mirror();}
 window.__balance.trace.push({wave:state.wave,cash:[state.cash,state.enemyCash],eco:[state.eco,state.enemyEco],buildings:[state.built.filter(x=>x!==null).length,state.enemyBuilt.filter(x=>x!==null).length],units:[state.units.filter(u=>u.side===0).length,state.units.filter(u=>u.side===1).length]});
}
window.__balance={
 reset,createUnit,tick,aiInvest,wave,getDef,FACTIONS,ROLE,SLOTS,
 state:()=>state,
 init(){
  this.trace=[];
  state.live=true;state.ended=false;state.followFront=false;
  state.cash=360;state.enemyCash=360;
  for(const [slot,role] of [[1,0],[17,1]]){
    state.built[slot]=role;state.enemyBuilt[slot]=role;
    state.cash-=ROLE[role].cost;state.enemyCash-=ROLE[role].cost;
  }
 }
};
reset();
`;
if(!game.includes('initFactions();wire();reset();'))throw Error('Game bootstrap changed');
let source=game.replace('initFactions();wire();reset();',simHooks);
source=source.replace(' aiInvest();\n const headcount=', ' simulateAI();\n const headcount=');
vm.runInNewContext(source,ctx,{filename:'game-v2.js',timeout:10000});
const core=ctx.window.__balance;
const N=core.FACTIONS.length,combinations=[];
for(let i=0;i<N;i++)for(let j=i+1;j<N;j++)combinations.push([i,j]);
function seeded(pairIndex,run){rngState=(0xdefaced1+(pairIndex+1)*19349663+run*2654435761)>>>0;}
const outcomes=Array.from({length:N},()=>({win:0,loss:0,draw:0,score:0,games:0}));
const matrix=Array.from({length:N},()=>Array(N).fill(null));
function score(engagement){
 const s=core.state();
 if(engagement==='skirmish'){
  const points=[0,0];
  for(const u of s.units){
    // Temporary broodlings and captured conscripts are free reinforcements, not full-cost producers.
    // One consolidated hero represents twenty purchased units, not a single purchased soldier.
    if(u.isHatchling||u.conscripted||u.guardian||u.hp<=0)continue;
    points[u.side]+=u.hp/u.maxHP*core.ROLE[u.role].cost*(u.heroCount===20?20:1);
   }
  return points;
 }
 // Timeouts are only scored for diagnostics; never count a timeout as an actual victory.
 return [s.baseHP[0]+s.turretHP[0]*.3,s.baseHP[1]+s.turretHP[1]*.3];
}
function runMatch(f0,f1,seedIndex,pairIndex,mode){
 core.reset();core.init();
 const s=core.state();s.faction=f0;s.enemyFaction=f1;
 seeded(pairIndex,seedIndex);
 if(mode==='skirmish'){
  s.built.fill(null);s.enemyBuilt.fill(null);
  s.units.length=0;s.shots.length=0;s.next=999999;s.wave=8;
  const roles=[0,1,2,3,4,5,6,7];
  roles.forEach((role,i)=>{core.createUnit(0,i*2,role);core.createUnit(1,i*2,role);});
  s.units.forEach(u=>{
   const r=u.role;
   u.x=u.side===0?1420+(r%3)*32:1880-(r%3)*32;
   u.y=113+(r%4)*80+Math.floor(r/4)*17;
   u.cooldown=.1+r*.03;
  });
  const dt=.18;
  for(let t=0;t<100/dt&&!s.ended;t++){
   core.tick(dt);
   const left=s.units.some(u=>u.side===0&&u.role!==7),right=s.units.some(u=>u.side===1&&u.role!==7);
   if(!left||!right)break;
  }
 }else{
  // Equal AI mirror match played for 22 waves or until HQ defeat.
  const dt=.27;
  for(let t=0;t<(24*22)/dt&&!s.ended;t++)core.tick(dt);
 }
 const points=score(mode);
 const winner=mode==='skirmish'
   ?points[0]>points[1]*1.03?0:points[1]>points[0]*1.03?1:-1
   :s.ended?(s.baseHP[1]<=0?0:1):-1;
 return {winner,points,wave:s.wave,timeout:!s.ended,marineStats:{...s.marineStats},cash:[s.cash,s.enemyCash],eco:[s.eco,s.enemyEco],buildings:[s.built.filter(x=>x!==null).length,s.enemyBuilt.filter(x=>x!==null).length],baseHP:[...s.baseHP],trace:core.trace};
}
const selected=which==='all'?['skirmish','campaign']:[which];
for(const mode of selected){
 const out=Array.from({length:N},()=>({w:0,l:0,d:0,n:0,cash:0,eco:0,buildings:0,baseHP:0,wave:0,timeouts:0,marineLoot:0,marineCR:0,marineRecruits:0,marineHuanglong:0,phases:Array.from({length:4},()=>({n:0,cash:0,eco:0,buildings:0,units:0}))}));
 const pairResults=[];
 const start=Date.now();
 for(let idx=0;idx<combinations.length;idx++){
  const [i,j]=combinations[idx];
  const results=[];
  for(let seed=0;seed<samples;seed++)for(let side=0;side<2;side++){
   const f0=side===0?i:j,f1=side===0?j:i;
   const res=runMatch(f0,f1,seed,idx,mode);
   const fwin=res.winner===-1?-1:res.winner===0?f0:f1;
   for(const f of [i,j]){
    const entry=out[f],pos=f===f0?0:1;
    entry.n++;entry.cash+=res.cash[pos];entry.eco+=res.eco[pos];
    if(f===3){entry.marineLoot+=res.marineStats.loot;entry.marineCR+=res.marineStats.lootedCR;entry.marineRecruits+=res.marineStats.recruits;entry.marineHuanglong+=res.marineStats.huangSpawns;}
    entry.buildings+=res.buildings[pos];entry.baseHP+=res.baseHP[pos];entry.wave+=res.wave;
    if(mode==='campaign'&&res.timeout)entry.timeouts++;
    for(const row of res.trace){
     const band=row.wave<=4?0:row.wave<=10?1:row.wave<=16?2:3;
     const phase=entry.phases[band];phase.n++;phase.cash+=row.cash[pos];
     phase.eco+=row.eco[pos];phase.buildings+=row.buildings[pos];phase.units+=row.units[pos];
    }
    if(fwin===f)entry.w++;
    else if(fwin>=0)entry.l++;
    else entry.d++;
   }
   results.push({winner:fwin,wave:res.wave,margin:Math.round(res.points[0]-res.points[1])});
  }
  const iwins=results.filter(x=>x.winner===i).length,jwins=results.filter(x=>x.winner===j).length,draws=results.filter(x=>x.winner<0).length;
  pairResults.push({a:i,b:j,iwins,jwins,draws});
 }
 textSummary(mode,out,pairResults,Date.now()-start);
}
function textSummary(mode,results,pairs,ms){
 const avg=(num,den)=>Math.round(num/Math.max(1,den)*10)/10;
 console.log('BALANCE_JSON '+JSON.stringify({mode,samples,ms,factions:core.FACTIONS.map((f,i)=>{const r=results[i];return {id:f.id,name:f.name,w:r.w,l:r.l,d:r.d,n:r.n,winRate:avg(r.w*100,r.n),avgCash:avg(r.cash,r.n),avgEco:avg(r.eco,r.n),avgBuildings:avg(r.buildings,r.n),avgBaseHP:avg(r.baseHP,r.n),avgWave:avg(r.wave,r.n),timeouts:r.timeouts,marineLoot:r.marineLoot,marineCR:r.marineCR,marineRecruits:r.marineRecruits,marineHuanglong:r.marineHuanglong,phases:r.phases.map(p=>({n:p.n,avgCash:avg(p.cash,p.n),avgEco:avg(p.eco,p.n),avgBuildings:avg(p.buildings,p.n),avgUnits:avg(p.units,p.n)}))};}),pairs}));
 console.log('BALANCE_TABLE '+mode+' '+ms+'ms');
 for(const x of core.FACTIONS.map((f,i)=>({race:f.name,...results[i]})))console.log('RACE',x.race,JSON.stringify({wins:x.w,losses:x.l,draws:x.d,rate:(100*x.w/x.n).toFixed(1)+'%'}));
 for(const p of pairs)console.log('PAIR',core.FACTIONS[p.a].id,'vs',core.FACTIONS[p.b].id,':',p.iwins,'-',p.jwins,'draw',p.draws);
}
