'use strict';
// The shipped three-lane engine must never turn one free broodling or captive into a 20-unit army.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=__dirname;
const context={window:{},console,Math,Map,Set,Number,Object,Array};
for(const script of ['unit-consolidation.js','defense-guardian.js','hard-ai.js']){
 vm.runInNewContext(fs.readFileSync(path.join(root,script),'utf8'),context,{timeout:10000,filename:script});
}
const source=fs.readFileSync(path.join(root,'tri-lane-engine.js'),'utf8');
const marker='return {state,order,tick,wave,snapshot,definition};';
assert.equal(source.split(marker).length,2,'three-lane engine regression hook must attach exactly once');
const instrumented=source.replace(marker,'return {state,order,tick,wave,snapshot,definition,__test:{broodLay,marineSpoils,spawn}};');
vm.runInNewContext(instrumented,context,{timeout:10000,filename:'tri-lane-engine.js'});
const game=context.window.DesertTriEngine.create({mode:'pvp',size:1,members:[
 {uid:'ally',name:'Ally',team:0,faction:1},
 {uid:'marine',name:'Marine',team:1,faction:3}
]});
const {state,__test}=game;state.seconds=30;
const hero={id:1,uid:'ally',team:0,faction:1,role:0,lane:0,heroCount:20,
 hp:4600,maxHP:4600,x:830,y:260,radius:30};
const enemy={id:2,uid:'marine',team:1,faction:3,role:3,lane:0,
 hp:300,maxHP:300,x:870,y:260,radius:20};
state.units.push(hero,enemy);
__test.broodLay(hero,enemy,()=>0);
const baby=state.units.find(u=>u.isHatchling);
assert.ok(baby,'a consolidated brood hero can spawn one broodling');
assert.equal(baby.heroCount,1,'broodling must be one soldier, never a twenty-unit hero');
assert.equal(baby.maxHP,1,'broodling must have exactly one maximum HP');
assert.equal(context.window.DesertConsolidation.population(state.units,u=>u.team===0),21,
 'one 20-unit brood hero plus one hatchling consumes 21 supply');
const killer={id:3,uid:'marine',team:1,faction:3,role:0,lane:0,hp:200,maxHP:200,x:850,y:260};
const victim={id:4,uid:'ally',team:0,faction:1,role:3,lane:0,heroCount:20,
 hp:0,maxHP:6000,radius:44,x:860,y:260};
state.units.push(killer,victim);
const marineBefore=state.players.find(p=>p.uid==='marine').cash;
const allyBefore=state.players.find(p=>p.uid==='ally').cash;
__test.marineSpoils(killer,victim,()=>0);
const captive=state.units.find(u=>u.conscripted);
assert.ok(captive,'marine can capture a fallen consolidated soldier');
assert.equal(captive.heroCount,1,'captured hero must become one, not twenty, recruits');
assert.equal(captive.maxHP,300,'captured soldier must have individual max HP');
assert.equal(captive.hp,30,'captured soldier must start at ten percent HP');
assert.equal(captive.radius,22,'captured soldier must have a normal hitbox');
assert.equal(captive.targetId,null,'captured soldier must clear hostile target state');
assert.equal(state.players.find(p=>p.uid==='marine').cash,marineBefore+24,
 'loot transfers paid enemy credits instead of creating money');
assert.equal(state.players.find(p=>p.uid==='ally').cash,allyBefore-24,
 'captured faction loses exactly the amount the marine earned');
console.log('Hero offspring, single-unit captures, and conservation of stolen credits passed.');
