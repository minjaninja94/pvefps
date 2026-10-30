'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const noop=()=>{};
function environment(seed=1){
 const math=Object.create(Math);let current=seed>>>0||1;
 math.random=()=>((current=(Math.imul(current,1664525)+1013904223)>>>0)/4294967296);
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});
 const nodes=new Map();
 function el(id){if(!nodes.has(id))nodes.set(id,{style:{},dataset:{},hidden:false,innerHTML:'',textContent:'',children:[],
  classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},getContext:()=>ctx,addEventListener:noop,setAttribute:noop,removeAttribute:noop,
  querySelectorAll:()=>[],querySelector:()=>null,replaceChildren:noop,append:noop});return nodes.get(id);}
 const window={addEventListener:noop},sandbox={window,document:{getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({getContext:()=>ctx}),body:{dataset:{}}},
  requestAnimationFrame:noop,Math:math,Date,Map,Set,Array,Object,Number,String,JSON,console};
 for(const file of ['unit-consolidation.js','defense-guardian.js','expansion/expansion-rules.js','hard-ai.js'])vm.runInNewContext(read(file),sandbox,{filename:file});
 return {window,sandbox,reseed:value=>{current=value>>>0||1;}};
}
function solo(seed=1,source=null){
 const env=environment(seed);
 const hook='window.__balanceTest={reset,state:()=>state,getDef,unitCost:(r,f)=>getDef(r,f).cost,createUnit,tick,fire,damage,projectileImpact,nearestUnit,heal,broodLay,marineSpoils,selectRole,place,aiInitialBuild,aiInvest,combatDef,detonateEmergency,nuclearPopulation,hardEmergency,demolish:()=>{demolition=true;}};reset();';
 vm.runInNewContext((source||read('game-v2.js')).replace('initFactions();wire();reset();',hook),env.sandbox,{filename:'game-v2.js'});
 return {...env,G:env.window.__balanceTest};
}
function multi(seed=1){
 const env=environment(seed),marker='return {state,order,tick,wave,snapshot,definition};';
 const source=read('tri-lane-engine.js');if(!source.includes(marker))throw Error('Multiplayer test hook missing');
 vm.runInNewContext(source.replace(marker,'return {state,order,tick,wave,snapshot,definition,__test:{applyHit,attack,spawn,broodLay,marineSpoils,combatDef,hardBotPurchase}};'),env.sandbox,{filename:'tri-lane-engine.js'});
 return {...env,E:env.window.DesertTriEngine};
}
module.exports={solo,multi};
