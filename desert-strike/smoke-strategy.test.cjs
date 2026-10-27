'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'game-v2.js'),'utf8');
const mocks=new Map(),g=new Proxy({createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}},{get:(obj,p)=>p in obj?obj[p]:()=>{}});
const element=id=>{if(!mocks.has(id))mocks.set(id,{textContent:'',innerHTML:'',disabled:false,hidden:false,dataset:{},style:{},
 classList:{add(){},remove(){},toggle(){}},addEventListener(){},getContext(){return g},setAttribute(){},removeAttribute(){},querySelectorAll(){return []}});
 return mocks.get(id);};
const document={getElementById:element,querySelector(){return null;},querySelectorAll(){return []},createElement(){return {getContext(){return g}}},addEventListener(){}};
let seed=5567;const rng=Object.create(Math);rng.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const global={document,window:{addEventListener(){}},requestAnimationFrame(){},console,Math:rng,Number,String,Object,Array,Map,Set,Date};
vm.runInNewContext(source.replace('initFactions();wire();reset();',`window.__strategy={state:()=>state,reset,aiReadOpponent,aiChoose,aiInvest,createUnit,tick,wave,enemyBaseVisible,enemyUnitVisible};initFactions();wire();reset();`),global,{filename:'game-v2.js',timeout:15000});
const e=global.window.__strategy;
e.reset();let s=e.state();s.live=true;s.built.fill(null);s.enemyBuilt.fill(null);s.aiSight=new Set();s.wave=0;
for(let i=0;i<5;i++)s.built[i]=6;
assert.equal(e.aiReadOpponent().total,0,'AI must not peek into unseen air production');
s.enemyCash=360;s.wave=1;e.aiInvest();
assert.ok(s.enemyBuilt.filter(x=>x!==null).length>=3,'AI must spend earned money on an offensive opening');
assert.equal(s.enemyCash+ s.enemyBuilt.filter(x=>x!==null).reduce((a,r)=>a+([65,95,150,205,165,245,205,145][r]),0),360,'AI cannot mint opening buildings');
s.units.length=0;
for(let i=0;i<3;i++){e.createUnit(0,i,6);const u=s.units.at(-1);u.x=2300;u.y=245+i*4;}
assert.equal(e.aiReadOpponent().dominant,6);
assert.equal(e.aiChoose(300),4,'AI must use antiair once fliers are actually scouted');
s.enemyBuilt.fill(null);s.enemyCash=1500;s.wave=8;
s.units.length=0;s.aiSight=new Set();
for(let i=0;i<4;i++){e.createUnit(0,i,3);s.units.at(-1).x=2150;}
for(let i=0;i<4;i++){e.createUnit(0,i,6);s.units.at(-1).x=2170;}
for(let i=0;i<3;i++){e.createUnit(0,i,7);s.units.at(-1).x=2200;}
const observed=e.aiReadOpponent();
assert.equal(observed.counts[3],4);
assert.equal(observed.counts[6],4);
assert.equal(observed.counts[7],3);
assert.equal(e.aiChoose(600),4,'mixed air+tank army first needs anti-air');
s.enemyBuilt[0]=4;s.enemyBuilt[1]=4;s.enemyBuilt[2]=4;s.enemyBuilt[3]=4;
assert.equal(e.aiChoose(600),2,'after anti-air coverage AI switches to anti-armor');
s.enemyBuilt.fill(null);s.units.length=0;s.aiSight.clear();s.wave=0;
assert.equal(e.enemyBaseVisible(),false);
console.log('Fog intel, mixed anti-armor/antiair response and paid early counterpressure passed.');
