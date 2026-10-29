'use strict';
// Shipped-engine, wall-clock-independent 50-wave campaign audit. All production
// purchases pay CR and observe the configured build timer. A timeout is NOT a win.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync(path.join(process.env.DESERT_ENGINE_SOURCE_DIR&&['game-v2.js','tri-lane-engine.js'].includes(name)?process.env.DESERT_ENGINE_SOURCE_DIR:__dirname,name),'utf8');
const catalogue=JSON.parse(read('assets/augments.json'));
const fakeContext=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},
 {get:(o,k)=>k in o?o[k]:()=>{}});
const elements=new Map();
function el(id){
 if(!elements.has(id))elements.set(id,{id,dataset:{},style:{},textContent:'',innerHTML:'',hidden:false,disabled:false,children:[],
  classList:{add(){},remove(){},contains(){return false},toggle(){}},
  append(...a){this.children.push(...a)},replaceChildren(...a){this.children=a},
  addEventListener(){},setAttribute(){},removeAttribute(){},
  getContext(){return fakeContext},getBoundingClientRect(){return {left:0,top:0,width:1100,height:520}}});
 return elements.get(id);
}
const document={body:{dataset:{}},getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],
 createElement:()=>el('generic_'+Math.floor(Math.random()*100000)),addEventListener(){}};
let seed=1,mode='normal',ruleset='standard';
class DeterministicDate extends Date{static now(){return seed;}}
const random=Object.create(Math);
random.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const w={DesertLobby:{selectedRuleset:()=>ruleset,aiDifficulty:()=>mode,completeSolo(){}},addEventListener(){}};
const sandbox={window:w,document,requestAnimationFrame(){},Math:random,console,Map,Set,Array,Object,Date:DeterministicDate,Number,String,JSON,
 fetch:async()=>({ok:true,json:async()=>catalogue})};
async function run(){
 for(const name of ['unit-consolidation.js','defense-guardian.js','hard-ai.js','augment-rules.js'])
  vm.runInNewContext(read(name),sandbox,{filename:name});
 await w.DesertAugments.load();
 const inject='window.__campaign={start,state:()=>state,place,setRole:r=>{selectedRole=r},setFaction:f=>{selectedFaction=f},tick,chooseSoloAugment,ROLE,INTERVAL};reset();';
 const src=read('game-v2.js').replace('initFactions();wire();reset();',inject);
 assert.ok(src.includes(inject));
 vm.runInNewContext(src,sandbox,{filename:'game-v2.js'});
 const G=w.__campaign;
 const results=[];
 for(const diff of ['normal','hard'])for(const rule of ['standard','augment'])for(const faction of [0,4]){
  mode=diff;ruleset=rule;seed=(0xa6f01d3+faction*2317+(diff==='hard'?1337:0)+(rule==='augment'?60013:0))>>>0;
  G.setFaction(faction);G.start();
  const s=G.state();s.enemyFaction=(faction+3)%10;s.followFront=false;
  const maxWave=144,dt=.36;
  let lastPurchase=-9999,roleIndex=0,firstBuild=true;
  const styles=faction===0?[0,1,3,1,2,5,4,6,7]:[3,0,1,3,5,0,6,2,7];
  for(let step=0;!s.ended&&s.wave<maxWave&&step<maxWave*G.INTERVAL/dt+500;step++){
   if(s.augmentChoice){
    if(!G.chooseSoloAugment(1))throw Error('Real augmentation could not be chosen');
    continue;
   }
   if(firstBuild||s.elapsed-lastPurchase>=12){
    firstBuild=false;lastPurchase=s.elapsed;
    const slot=s.built.findIndex(r=>r===null);
    if(slot>=0){
     const desired=Math.min(6,Math.floor(Math.max(0,s.elapsed-48)/115));
     const economic=desired>s.eco&&s.elapsed>=s.ecoReadyAt&&s.cash>=200;
     if(economic){G.setRole(8);G.place(slot);}
     else{
      const role=styles[roleIndex++%styles.length];
      if(s.cash>=G.ROLE[role].cost){G.setRole(role);G.place(slot);}
     }
    }
   }
   G.tick(dt);
   if(s.cash<-1e-6||s.enemyCash<-1e-6)throw Error('Negative resources in actual campaign');
  }
  results.push({mode:'solo',difficulty:diff,ruleset:rule,faction,wave:s.wave,seconds:Number(s.elapsed.toFixed(1)),ended:s.ended,
   victor:s.baseHP[1]<=0?'human':s.baseHP[0]<=0?'AI':'unfinished',
   bases:s.baseHP.map(Math.round),factories:[s.built.filter(r=>r!==null&&r!==8).length,
    s.enemyBuilt.filter(r=>r!==null&&r!==8).length],augments:[s.augments.length,s.enemyAugments.length]});
 }
 // Multiplayer uses the actual authoritative host engine with paid human
 // commands, automatic co-op bots and genuine per-lane unit combat.
 const mSandbox={window:{},Math:random,Map,Set,Array,Object,Number,String,Date:DeterministicDate,JSON,console,
  fetch:async()=>({ok:true,json:async()=>catalogue})};
 for(const name of ['unit-consolidation.js','defense-guardian.js','hard-ai.js','augment-rules.js'])
  vm.runInNewContext(read(name),mSandbox,{filename:name});
 await mSandbox.window.DesertAugments.load();
 vm.runInNewContext(read('tri-lane-engine.js'),mSandbox,{filename:'tri-lane-engine.js'});
 const E=mSandbox.window.DesertTriEngine;
 for(const [diff,rule] of [['normal','standard'],['hard','augment']]){
  seed=(0xb555+12*(diff==='hard'?3:1))>>>0;
  const match=E.create({mode:'coop',size:2,aiDifficulty:diff,ruleset:rule,seed,
   members:[{uid:'player0',team:0,faction:0},{uid:'player1',team:0,faction:4}]});
  const state=match.state,humans=state.players.filter(p=>!p.bot);
  let nextBuild=0,purchases=0;
  for(let i=0;!state.ended&&state.wave<136&&i<136*(E.WAVE_INTERVAL??24)/.2+500;i++){
   const choice=state.augmentChoice;
   if(choice)for(const p of humans){
    const entry=choice.offers[p.uid];if(entry&&!entry.selected)match.order(p.uid,{type:'augment_pick',slot:1});
   }
   if(!state.augmentChoice&&state.seconds>=nextBuild){
    nextBuild=state.seconds+17;
    for(let h=0;h<humans.length;h++){
     const p=humans[h],need=Math.min(5,Math.floor(state.seconds/145));
     if(p.eco<need&&state.seconds>=p.ecoReadyAt&&p.cash>=E.ecoPrice(p.eco)+110){
      const lane=h,slot=p.buildings[lane].findIndex(r=>r===null);
      if(slot>=0)match.order(p.uid,{type:'build',lane,slot,role:8});
     }else{
      const lane=(Math.floor(purchases/5)+h)%3,slot=p.buildings[lane].findIndex(r=>r===null);
      if(slot>=0){const role=[0,1,3,5,2,4,6,7][(purchases+h)%8];if(p.cash>=E.COST[role])
       match.order(p.uid,{type:'build',lane,slot,role});}
     }
    }
    purchases++;
   }
   match.tick(.2);
  }
  results.push({mode:'coop',difficulty:diff,ruleset:rule,wave:state.wave,seconds:Number(state.seconds.toFixed(1)),ended:state.ended,
   victor:state.winner===null?'unfinished':state.winner===0?'human':'AI',
   bases:state.cores.map(row=>row.slice())});
 }
 const solo=results.filter(x=>x.mode==='solo'),done=solo.filter(x=>x.ended);
 const average=done.length?Number((done.reduce((s,x)=>s+x.wave,0)/done.length).toFixed(1)):null;
 const summary={goal:[45,55],actualAverageCompleted:average,completed:done.length,
  soloSamples:solo.length,drawOrCensored:solo.length-done.length,
  within45to55:done.filter(x=>x.wave>=45&&x.wave<=55).length,
  reachedTarget:done.length===solo.length&&average!==null&&average>=45&&average<=55,
  multiplayerSamples:results.filter(x=>x.mode==='coop').length,
  actualAverageSecondsCompleted:done.length?Number((done.reduce((sum,x)=>sum+x.seconds,0)/done.length).toFixed(1)):null,
  waveInterval:G.INTERVAL,
  method:'real game-v2.js and tri-lane-engine.js with true CR purchases, configured wave/factory timers, normal/hard AI and standard/augment; max 144 solo or 136 multi waves'};
 console.log('FIFTY_WAVE_CAMPAIGN '+JSON.stringify({summary,results}));
 assert.equal(results.length,10);assert.ok(results.every(x=>x.wave>=0));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
