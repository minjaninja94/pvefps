'use strict';
// Deterministic headless 6x6 matchup harness, 5 seeds each direction.
// Reuses the shipped game engine, actual AI economy, collision and damage.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'game-v2.js'),'utf8');
const ids=new Map(),queue=[];
const ctx=new Proxy({createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}},{get(t,p){return p in t?t[p]:()=>{};},set(t,p,v){t[p]=v;return true;}});
function el(id){if(ids.has(id))return ids.get(id);const classes=new Set();const x={id,style:{},dataset:{},textContent:'',innerHTML:'',disabled:false,hidden:false,handlers:{},classList:{add(k){classes.add(k);},remove(k){classes.delete(k);},toggle(k,v){v?classes.add(k):classes.delete(k);return v;},contains(k){return classes.has(k);}},addEventListener(k,fn){this.handlers[k]=fn;},getContext(){return ctx;},getBoundingClientRect(){return {left:0,top:0,width:1100,height:520};},querySelectorAll(){return [];},querySelector(){return null;},setAttribute(){},removeAttribute(){},showModal(){},close(){}};ids.set(id,x);return x;}
const facItems=Array.from({length:6},(_,i)=>({dataset:{faction:String(i)},classList:{contains:()=>i===0,toggle(){}}}));
const document={getElementById:el,createElement(){return {width:0,height:0,getContext(){return ctx;}};},querySelector(){return facItems[0];},querySelectorAll(){return [];},addEventListener(){}};
let seed=1;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const fakeMath=Object.create(Math);fakeMath.random=rand;
const sandbox={document,window:{addEventListener(){}},requestAnimationFrame(fn){queue.push(fn);},console:{log(){}},Math:fakeMath,Number,String,Object,Array,Map,Set,Date};
vm.runInNewContext(source.replace('initFactions();wire();reset();','window.__sim={state:()=>state,reset,tick,wave,getDef,aiInitialBuild,createUnit};initFactions();wire();reset();'),sandbox,{timeout:10000,filename:'game-v2.js'});
const game=sandbox.window.__sim;
assert.equal(game.getDef(2,0).cost,150,'benchmark must use live armor breaker cost');
assert.equal(game.getDef(5,0).cost,245,'benchmark must use live artillery cost');
const combos=[
 [0,1,2,3,4,5,6,7],[0,0,1,2,3,4,5,7],[0,1,1,2,3,5,6,7],
 [0,1,2,2,3,4,5,7],[0,1,2,3,3,4,6,7],[0,1,2,3,4,5,5,7]
];
function run(a,b,trial){
 seed=(20261027+trial*811+a*977+b*1511)>>>0;
 game.reset();const s=game.state();s.faction=a;s.enemyFaction=b;s.live=true;game.aiInitialBuild();
 // Equal investments, mirrored initial economy. Opponent continues to use its real adaptive AI.
 const roster=combos[trial%combos.length];
 for(const role of roster){const slot=s.built.findIndex(x=>x===null);if(slot<0)break;const cost=game.getDef(role,a).cost;if(s.cash>=cost){s.built[slot]=role;s.cash-=cost;}}
 for(let step=0;step<2500&&!s.ended;step++){
  // The player side follows the same no-free-money purchase rules.
  if(step%35===0){
   const slot=s.built.findIndex(x=>x===null);
   const role=roster[(step/35|0)%roster.length];
   const cost=game.getDef(role,a).cost;
   if(slot>=0&&s.cash>=cost){s.built[slot]=role;s.cash-=cost;}
  }
  game.tick(.16);
 }
 return {a,b,trial,winner:s.baseHP[0]===0?b:s.baseHP[1]===0?a:null,hp:[...s.baseHP],wave:s.wave,build:[s.built.filter(x=>x!==null).length,s.enemyBuilt.filter(x=>x!==null).length]};
}
const results=[];
for(let a=0;a<6;a++)for(let b=0;b<6;b++)if(a!==b)for(let trial=0;trial<5;trial++)results.push(run(a,b,trial));
const tally=Array.from({length:6},(_,id)=>({id,games:0,wins:0,losses:0,draws:0,points:0}));
for(const x of results){const t=tally[x.a];t.games++;if(x.winner===x.a)t.wins++;else if(x.winner===x.b)t.losses++;else t.draws++;t.points+=x.winner===x.a?1:x.winner===x.b?0:.5;}
const report={generated:'2026-10-27',method:'headless production economy, real AI opponent, 400 seconds maximum, 5 seeded scenarios per ordered pairing',matches:results.length,summary:tally.map(x=>({...x,scoreRate:Number((100*x.points/x.games).toFixed(1))})),pairings:results};
console.log(JSON.stringify(report,null,2));
assert.equal(results.length,150);
assert.ok(tally.every(x=>x.games===25));
