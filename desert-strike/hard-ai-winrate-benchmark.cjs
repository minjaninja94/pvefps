'use strict';
// Reproducible production-engine benchmark against the same funded scripted human.
// This is a comparative fixture, not a guarantee of a win in every player match.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const load=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const elements=new Map(),g=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},
 {get:(o,k)=>k in o?o[k]:()=>{}});
function el(id){if(!elements.has(id))elements.set(id,{id,textContent:'',innerHTML:'',style:{},dataset:{},hidden:false,
 classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},
 getContext(){return g},getBoundingClientRect(){return {left:0,top:0,width:1100,height:520}},
 setAttribute(){},removeAttribute(){},append(){},replaceChildren(){}});return elements.get(id);}
const document={getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],
 createElement:()=>({getContext(){return g},style:{},classList:{add(){},remove(){}}}),addEventListener(){}};
let seed=1,mode='normal';
const random=Object.create(Math);
random.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const w={addEventListener(){},DesertLobby:{aiDifficulty:()=>mode,selectedRuleset:()=> 'standard',completeSolo(){}}};
const ctx={document,window:w,requestAnimationFrame(){},Math:random,Date,Number,String,Object,Array,Map,Set,console};
for(const script of ['unit-consolidation.js','defense-guardian.js','hard-ai.js'])
 vm.runInNewContext(load(script),ctx,{filename:script});
const inject='window.__benchmark={reset,state:()=>state,aiInitialBuild,tick,constructExtractor,ecoCostFor,upgrade,ROLE};reset();';
const source=load('game-v2.js').replace('initFactions();wire();reset();',inject);
assert.ok(source.includes(inject));
vm.runInNewContext(source,ctx,{filename:'game-v2.js',timeout:20000});
const G=w.__benchmark;
function run(faction,pattern,difficulty,salt){
 mode=difficulty;seed=(0xcafe2012+faction*19349+pattern*3341+salt*1777)>>>0;
 G.reset();const s=G.state();
 s.faction=faction;s.enemyFaction=(faction+2+pattern)%10;s.aiDifficulty=mode;s.live=true;
 s.next=24;s.followFront=false;
 G.aiInitialBuild();
 const primary=pattern===0?[0,0,1,0,3,1]:pattern===1?[3,7,2,1,3,2]:[6,4,1,6,5,1];
 for(let i=0;i<1800&&!s.ended;i++){
  if(i%8===0){
   const level=s.eco;
   const need=(s.elapsed>46&&level<1)||(s.elapsed>118&&level<2)||(s.elapsed>218&&level<3);
   const free=s.built.findIndex(x=>x===null);
   if(free>=0){
    if(need&&s.cash>=G.ecoCostFor(level)+80&&s.elapsed>=s.ecoReadyAt)G.constructExtractor(0,free);
    else{
     const role=primary[Math.floor(i/8)%primary.length],cost=G.ROLE[role].cost;
     if(s.cash>=cost){s.cash-=cost;s.built[free]=role;}
    }
   }
  }
  // A competent human also pays for some research; this is not an AFK dummy.
  if(i%130===0&&s.elapsed>95&&s.weapon<2&&s.cash>=350)G.upgrade('weapon');
  if(i%170===0&&s.elapsed>125&&s.armor<2&&s.cash>=340)G.upgrade('armor');
  G.tick(.18);
  assert.ok(s.cash>=-1e-6&&s.enemyCash>=-1e-6,'no free resources or overdraft');
 }
 const won=s.baseHP[0]<=0?'ai':s.baseHP[1]<=0?'human':'draw';
 return {faction,pattern,difficulty,won,wave:s.wave,
  hp:[...s.baseHP],bases:s.baseHP[0]-s.baseHP[1],
  factories:[s.built.filter(x=>x!==null&&x!==8).length,s.enemyBuilt.filter(x=>x!==null&&x!==8).length],
  produced:[s.produced[0].reduce((a,b)=>a+b,0),s.produced[1].reduce((a,b)=>a+b,0)]};
}
const data=[],factions=[0,1,2,3,4,5,6,7,8,9];
for(const faction of factions)for(const pattern of [0,1,2])for(const difficulty of ['normal','hard'])
 data.push(run(faction,pattern,difficulty,20261029));
function summary(difficulty){
 const x=data.filter(z=>z.difficulty===difficulty);
 const avg=k=>Number((x.reduce((n,y)=>n+k(y),0)/x.length).toFixed(1));
 return {games:x.length,wins:x.filter(z=>z.won==='ai').length,
  losses:x.filter(z=>z.won==='human').length,draws:x.filter(z=>z.won==='draw').length,
  averageBaseAdvantage:avg(z=>z.bases),averageFactories:avg(z=>z.factories[1]),
  averageTroopsProduced:avg(z=>z.produced[1])};
}
console.log('HARD_AI_WINRATE_BENCHMARK '+JSON.stringify({
 method:'30 paired scenarios, real single-player simulation, 324 seconds per match, no AI free cash; 10 opposing factions x 3 funded human build strategies',
 normal:summary('normal'),hard:summary('hard'),matches:data}));
assert.equal(data.length,60);
