'use strict';
// Counterplay research against the production impossible AI. Standard solo only.
// Usage: node impossible-counterplay-benchmark.cjs '[[3,1,"siegeScreen",3000,{"waves":110,"eco":3,"nuke":true,"dt":0.03}]]'
// Samples are empirical checks, not proof of an unconditional winning strategy.
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
const inject='window.__benchmark={reset,state:()=>state,aiInitialBuild,tick,constructExtractor,ecoCostFor,upgrade,ROLE,getDef,place,detonateEmergency,weaponCost,armorCost,setRole:r=>{selectedRole=r}};reset();';
const source=load('game-v2.js').replace('initFactions();wire();reset();',inject);
assert.ok(source.includes(inject));
vm.runInNewContext(source,ctx,{filename:'game-v2.js',timeout:20000});
const G=w.__benchmark;

const strategies={
 rifle:[1],charge:[0],armorRifle:[3,1,1],siegeScreen:[0,0,5,1],air:[6],breakerScreen:[0,2,1],balanced:[0,1,3,2,5,7],airHeal:[6,6,7],rifleHeal:[1,1,1,7],siegeArmor:[3,5,7],siegeRush:[0,5],cavalry:[6,0,1]
};
function run(faction,enemy,name,salt,opts={}){
 mode=opts.difficulty||'impossible';seed=(0xcafe2012+faction*19349+enemy*3341+salt*1777)>>>0;G.reset();const s=G.state();
 Object.assign(s,{faction,enemyFaction:enemy,live:true,followFront:false});G.aiInitialBuild();
 if(opts.initOnly)return {faction,enemy,salt,plan:s.hardBrain?.plan};
 const seq=strategies[name];let cursor=0;
 for(let step=0;!s.ended&&s.wave<(opts.waves||100);step++){
  if(step%4===0){
   let slot=s.built.findIndex(x=>x===null);
   const desired=opts.eco===0?0:Math.min(opts.eco||3,Math.floor(Math.max(0,s.elapsed-55)/110)+1);
   if(slot>=0&&desired>s.eco&&s.elapsed>=s.ecoReadyAt&&s.elapsed>55){
    if(s.cash>=G.ecoCostFor(s.eco)){G.constructExtractor(0,slot);}
   }else if(slot>=0){
    let role=seq[cursor%seq.length];
    while(slot>=0&&s.cash>=G.getDef(role,faction).cost){G.setRole(role);G.place(slot);cursor++;slot=s.built.findIndex(x=>x===null);role=seq[cursor%seq.length];}
   }
   if(opts.research&&s.elapsed>140&&s.weapon<5&&s.cash>=G.weaponCost())G.upgrade('weapon');
   if(opts.research&&s.elapsed>180&&s.armor<5&&s.cash>=G.armorCost())G.upgrade('armor');
  }
  if(opts.nuke&&s.nukes){
   const power=u=>w.DesertConsolidation?.strength?.(u)??1;
   const enemies=s.units.filter(u=>u.side===1&&!u.guardian&&u.hp>0&&u.x<1650);
   const pressure=enemies.filter(u=>u.x<1050).reduce((n,u)=>n+power(u),0);
   const defenders=s.units.filter(u=>u.side===0&&u.hp>0&&u.x<1250).reduce((n,u)=>n+power(u),0);
   const total=enemies.reduce((n,u)=>n+power(u),0);
   if((total>=60&&pressure>=25&&pressure>defenders*1.2)||(s.baseHP[0]<4320&&pressure>=20))G.detonateEmergency(0);
  }
  G.tick(opts.dt||.24);
  if(s.cash<-.001||s.enemyCash<-.001)throw Error('overdraft');
 }
 return {faction,enemy,strategy:name,seed:salt,options:opts,winner:s.baseHP[1]<=0?'human':s.baseHP[0]<=0?'ai':'timeout',wave:s.wave,hp:s.baseHP.map(Math.round),cash:Math.round(s.cash),eco:s.eco,roster:Array.from({length:8},(_,r)=>s.built.filter(x=>x===r).length),plan:s.hardBrain?.plan,nukeUsed:s.nukes===0,enemyRoster:Array.from({length:8},(_,r)=>s.enemyBuilt.filter(x=>x===r).length),enemyCash:Math.round(s.enemyCash),enemyEco:s.enemyEco};
}
const results=[];
const config=JSON.parse(process.argv[2]||'[[3,1,"siegeScreen",3000,{"waves":110,"eco":3,"nuke":true,"dt":0.03}]]');
for(const c of config){const r=run(...c);results.push(r);console.error(JSON.stringify(r));}
console.log(JSON.stringify({results}));
