'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8'),G=require('./defense-guardian.js'),C=require('./unit-consolidation.js');
const noop=()=>{},g=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});
const els=new Map(),el=id=>{if(!els.has(id))els.set(id,{style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop},getContext:()=>g,querySelectorAll:()=>[],addEventListener:noop});return els.get(id);};
const w={DesertGuardian:G,DesertConsolidation:C},doc={getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({getContext:()=>g})};
const src=read('game-v2.js').replace('initFactions();wire();reset();','window.guardTest={reset,state:()=>state,createUnit,structureHit,projectileImpact,move,tick,getDef,marineSpoils,broodLay,fire,heal,resolveStrike,damage};reset();');
vm.runInNewContext(src,{window:w,document:doc,requestAnimationFrame:noop,Math,Map,Set,Object,Number,Array,String,Date});const api=w.guardTest;
let s=api.state();const startCash=s.enemyCash;
api.structureHit(0,999,'forward');assert.equal(s.forwardHP[0],1);assert.equal(s.units.length,0);assert.equal(s.enemyCash,startCash);
api.structureHit(0,1,'forward');let guardian=s.units.find(u=>u.guardian);
assert.ok(guardian);assert.equal(guardian.side,0);assert.equal(guardian.role,0);assert.equal(guardian.heroCount,20);assert.equal(guardian.maxHP,api.getDef(0,s.faction).hp*20);assert.equal(s.enemyCash,startCash+150);assert.equal(s.turretHP[0],1700);
api.structureHit(0,1e6,'forward');assert.equal(s.units.filter(u=>u.guardian).length,1);assert.equal(s.enemyCash,startCash+150,'repeat hits cannot farm the reward');
api.projectileImpact({baseSide:0,structurePart:'forward',source:5,damage:999,side:1,tx:825,ty:260});assert.equal(s.turretHP[0],1700,'in-flight projectiles never retarget behind a destroyed tower');
api.structureHit(1,1000,'forward');assert.equal(s.cash,510);assert.equal(s.units.filter(u=>u.guardian&&u.side===1).length,1,'both sides receive the same objective rules');
const babies=s.units.length;api.broodLay({...guardian,faction:1},{side:1},()=>0);assert.equal(s.units.length,babies,'guardian cannot duplicate itself through brood summons');
const recruits=s.marineStats.recruits;api.marineSpoils(guardian,{faction:3,side:1},()=>0);assert.equal(s.marineStats.recruits,recruits,'guardian cannot be captured and transferred to the wrong half');
function advanceSolo(seconds){for(let t=0;t<seconds-1e-8;t+=.04)api.tick(.04);}
function soloFight(isGuardian){
 api.reset();const s=api.state();s.live=true;s.next=100000;s.faction=0;s.enemyFaction=0;
 api.createUnit(0,0,isGuardian?0:5);const hero=s.units[0];if(isGuardian)G.mark(hero,0);else{hero.heroCount=20;hero.hp*=20;hero.maxHP*=20;hero.hitRadius*=2;}
 hero.x=1600;hero.y=260;hero.cooldown=0;hero.spawnAge=2;
 api.createUnit(1,0,7);const foe=s.units[1];foe.x=2200;foe.y=260;foe.hp=foe.maxHP=1e8;foe.cooldown=1e6;foe.spawnAge=2;foe.strike={duration:1e9,age:0,hit:true,mode:'idle'};
 advanceSolo(23);
 if(isGuardian){assert.ok(hero.x<=1650-hero.hitRadius);assert.equal(foe.hp,1e8,'guardian does not chase deep into the opposing half');}
 else{assert.ok(hero.x>1650,'ordinary artillery hero crosses the center');assert.ok(foe.hp<1e8,'ordinary artillery hero attacks after crossing');}
 return {s,hero};
}
soloFight(true);const soloAttack=soloFight(false);soloAttack.s.units=[soloAttack.hero];soloAttack.s.shots=[];soloAttack.hero.x=2250;soloAttack.hero.y=260;soloAttack.hero.cooldown=0;soloAttack.hero.strike=null;advanceSolo(3);assert.ok(soloAttack.s.forwardHP[1]<1000,'solo ordinary artillery hero damages enemy structures beyond center');
// One guardian also continues firing at invaders within its own defensive range.
api.reset();s=api.state();s.live=true;s.next=100000;s.faction=0;s.enemyFaction=0;api.createUnit(0,0,0);guardian=G.mark(s.units[0],0);guardian.x=1500;guardian.spawnAge=2;guardian.cooldown=0;api.createUnit(1,0,7);let foe=s.units[1];foe.x=1530;foe.y=260;foe.hp=foe.maxHP=1e8;foe.cooldown=1e6;advanceSolo(2);assert.ok(foe.hp<1e8,'defensive guardian still attacks');
// Guardian attacks precisely one target even when enemies overlap.
api.reset();s=api.state();s.faction=0;s.enemyFaction=0;api.createUnit(0,0,0);guardian=G.mark(s.units[0],0);
for(let n=0;n<2;n++){api.createUnit(1,0,7);const v=s.units[s.units.length-1];v.x=guardian.x+20;v.y=guardian.y;v.hp=v.maxHP=1e8;}
api.fire(guardian,s.units[1]);assert.ok(s.units[1].hp<1e8);assert.equal(s.units[2].hp,1e8,'solo guardian has no splash');
// Multiplayer objective, ownership, reward splitting, snapshot identity and collision bounds.
const mw={DesertGuardian:G,DesertConsolidation:C};vm.runInNewContext(read('tri-lane-engine.js').replace('return {state,order,tick,wave,snapshot,definition};','return {state,order,tick,wave,snapshot,definition,hitFort,spawn,attack};'),{window:mw,Math,Map,Set,Object,Array,Number,String});const E=mw.DesertTriEngine;
const e=E.create({mode:'coop',size:3,members:[0,1,2].map(i=>({uid:'p'+i,team:0,faction:i}))});
e.hitFort(2,1,1000);guardian=e.state.units.find(u=>u.guardian);assert.equal(guardian.uid,'AI_2');assert.equal(guardian.guardianLane,2);assert.ok(e.state.players.filter(p=>p.team===0).every(p=>p.cash===410),'150 CR total is split across the attacking team');
assert.equal(e.snapshot('AI_2').units.find(u=>u.id===guardian.id).guardian,true);assert.equal(e.snapshot('AI_2').forwardHP[2][1],0);
e.hitFort(2,1,1e6);assert.equal(e.state.units.filter(u=>u.guardian).length,1);assert.equal(e.state.players[0].cash,410);
guardian.x=1450;guardian.y=200;for(let i=0;i<50;i++){e.tick(.1);assert.ok(guardian.x>=1650+guardian.radius);assert.ok(guardian.y>=1040+guardian.radius&&guardian.y<=1560-guardian.radius);assert.equal(guardian.lane,2);}
function multiFight(isGuardian){
 const e=E.create({members:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:0}]});e.state.next=100000;
 e.spawn(e.state.players[0],0,0,isGuardian?0:5);const h=e.state.units[0];if(isGuardian)G.mark(h,0,0);else{h.heroCount=20;h.hp*=20;h.maxHP*=20;h.radius*=2;}
 h.x=1600;h.y=260;h.cool=0;h.spawnAge=2;e.spawn(e.state.players[1],0,0,7);const foe=e.state.units[1];foe.x=2200;foe.y=260;foe.hp=foe.maxHP=1e8;foe.cool=1e6;
 for(let i=0;i<120;i++)e.tick(.2);
 if(isGuardian){assert.ok(h.x<=1650-h.radius);assert.equal(foe.hp,1e8);}else{assert.ok(h.x>1650);assert.ok(foe.hp<1e8);}
 return {e,h,foe};
}
multiFight(true);const attack=multiFight(false);attack.e.state.units=[attack.h];attack.h.x=2250;attack.h.cool=0;const before=attack.e.state.forwardHP[0][1];attack.e.tick(.01);assert.ok(attack.e.state.forwardHP[0][1]<before,'normal artillery hero can also attack enemy structures beyond center');
const single=E.create({members:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:0}]});
single.spawn(single.state.players[0],0,0,0);const gh=G.mark(single.state.units[0],0);
for(let n=0;n<2;n++){single.spawn(single.state.players[1],0,0,7);const v=single.state.units[single.state.units.length-1];v.x=gh.x+20;v.y=gh.y;v.hp=v.maxHP=1e8;}
single.attack(gh,single.state.units[1]);assert.ok(single.state.units[1].hp<1e8);assert.equal(single.state.units[2].hp,1e8,'multiplayer guardian has no splash');
// Collision pushes cannot bypass either the lane or center constraint.
for(const side of [0,1])for(const lane of [0,1,2]){const u=G.mark({hp:100,maxHP:100,radius:17,team:side},side,lane);u.x=side===0?1900:1400;u.y=lane===0?1500:0;G.clampUnit(u,{multiplayer:true});assert.ok(side===0?u.x<=1616:u.x>=1684);assert.equal(Math.floor(u.y/520),lane);}
const plain={x:2000,y:900,heroCount:20,role:5,side:0};G.clampUnit(plain);assert.equal(plain.x,2000,'no global artillery/hero leash');
let colors=[];const ctx=new Proxy({},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>{if(k==='strokeStyle')colors.push(v);o[k]=v;return true;}});C.aura(ctx,0,0,100,1,false);C.aura(ctx,0,0,100,1,true);assert.deepEqual(colors,['#ff4055','#52ff89']);
// External healing reduction is identical in solo and authoritative multiplayer.
const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-7,`${label}: ${actual} != ${expected}`);
function soloHealing(isGuardian,age){
 api.reset();const s=api.state();s.elapsed=100;s.faction=0;api.createUnit(0,0,0);const target=s.units[0];
 if(isGuardian)G.mark(target,0);else target.heroCount=20;
 Object.assign(target,{hp:1000,maxHP:10000,lastDamagedAt:100-age,x:900,y:260});
 api.createUnit(0,1,7);const medic=s.units[1];Object.assign(medic,{x:900,y:260});return {s,target,medic};
}
function multiHealing(isGuardian,age){
 const e=E.create({members:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:0}]});e.state.seconds=100;
 e.spawn(e.state.players[0],0,0,0);const target=e.state.units[0];if(isGuardian)G.mark(target,0);else target.heroCount=20;
 Object.assign(target,{hp:1000,maxHP:10000,lastDamagedAt:100-age,x:900,y:260});
 e.spawn(e.state.players[0],0,1,7);const medic=e.state.units[1];Object.assign(medic,{x:900,y:260});return {e,target,medic};
}
for(const age of [0,2.999,3,3.001,10])for(const guarded of [false,true]){
 const factor=guarded?(age<3?.1:.25):1;
 const solo=soloHealing(guarded,age);api.heal(solo.target,100,false,solo.medic);close(solo.target.hp-1000,100*factor,'solo regular heal');
 const multi=multiHealing(guarded,age);multi.e.attack(multi.medic,multi.target);close(multi.target.hp-1000,E.definition(0,7).heal*factor,'multiplayer regular heal');
 // Huanglong's single-use banquet must not bypass the guardian multiplier.
 const burst=soloHealing(guarded,age);burst.medic.faction=3;api.resolveStrike(burst.medic,{healing:true,target:burst.target});close(burst.target.hp-1000,3200*factor,'solo banquet');assert.equal(burst.medic.hp,0);
 const mburst=multiHealing(guarded,age);mburst.medic.faction=3;mburst.e.attack(mburst.medic,mburst.target);close(mburst.target.hp-1000,3200*factor,'multiplayer banquet');assert.equal(mburst.medic.hp,0);
 // Fairy pollen checks the recipient, not only the primary healing target.
 const pollen=soloHealing(guarded,age);pollen.medic.faction=9;api.createUnit(0,2,0);const primary=pollen.s.units[2];Object.assign(primary,{x:900,y:260,hp:100,maxHP:1000});api.heal(primary,100,false,pollen.medic);close(pollen.target.hp-1000,85*.05*factor,'solo pollen');
 const mpollen=multiHealing(guarded,age);mpollen.medic.faction=9;mpollen.e.spawn(mpollen.e.state.players[0],0,2,0);const mp=mpollen.e.state.units[2];Object.assign(mp,{x:900,y:260,hp:100,maxHP:1000});mpollen.e.attack(mpollen.medic,mp);close(mpollen.target.hp-1000,E.definition(9,7).heal*.05*factor,'multiplayer pollen');
}
for(const age of [1,4]){
 const factor=age<3?.1:.25,solo=soloHealing(true,age),multi=multiHealing(true,age);
 for(let i=0;i<100;i++){api.heal(solo.target,100);multi.e.attack(multi.medic,multi.target);}
 close(solo.target.hp-1000,1600*factor,'solo shared healing budget');close(multi.target.hp-1000,1600*factor,'multiplayer shared healing budget');
}
const renewed=soloHealing(true,10);api.damage(renewed.target,10,'turret');const hpBefore=renewed.target.hp;api.heal(renewed.target,100);close(renewed.target.hp-hpBefore,10,'new damage reactivates three-second reduction');
assert.equal(G.healAmount({guardian:true},100,100),25,'no previous damage defaults to out-of-combat healing');
console.log('Guardian healing passed: regular support, Huanglong banquet, fairy pollen, 3-second boundary, new-damage reset, shared anti-stacking budget and unchanged ordinary heroes in both engines.');
console.log('Guardian passed: paid-once 150 CR team reward, one defending 20x single-target assault hero, independent lanes/halves, authoritative collision clamping, no capture/duplicate summon, pinned projectiles, green aura and ordinary artillery heroes advancing/attacking across center in both engines.');
