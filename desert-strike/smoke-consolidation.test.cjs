'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('./unit-consolidation.js');
const unit=i=>({id:i,uid:'owner-a',team:0,faction:0,role:0,lane:0,skin:'default',hp:100,maxHP:100,x:200+i%5*8,y:100+Math.floor(i/5)*8,radius:15});
let units=Array.from({length:19},(_,i)=>unit(i));assert.equal(C.compact(units,{multiplayer:true}).heroes.length,0);
units=Array.from({length:20},(_,i)=>unit(i));let old=units[4],attacker={...unit(99),uid:'owner-b',team:1,hp:50,strike:{target:old}};units.push(attacker);
let result=C.compact(units,{multiplayer:true});assert.equal(result.removed,19);assert.equal(units.length,2);const hero=result.heroes[0];assert.equal(hero.hp,2000);assert.equal(hero.maxHP,2000);assert.equal(hero.radius,30);assert.equal(hero.heroCount,20);assert.equal(C.population(units,u=>u.team===0),20);assert.equal(attacker.strike.target,hero);assert.equal(old.hp,0);
const base={hp:100,damage:12,armor:3,heal:30,speed:80,range:160,rate:.8};const d=C.definition(base,hero);for(const k of ['hp','damage','armor','heal'])assert.equal(d[k],base[k]*20);for(const k of ['speed','range','rate'])assert.equal(d[k],base[k]);
for(const variation of ['wounded','owner','skin','lane','hatchling','conscripted','hero','debuff']){
 const list=Array.from({length:20},(_,i)=>unit(i));const last=list[19];if(variation==='wounded')last.hp=99;if(variation==='owner')last.uid='someone-else';if(variation==='skin')last.skin='moe';if(variation==='lane')last.y=1000;if(variation==='hatchling')last.isHatchling=true;if(variation==='conscripted')last.conscripted=true;if(variation==='hero')last.heroCount=20;if(variation==='debuff')last.inkUntil=5;
 assert.equal(C.compact(list,{multiplayer:true,now:1}).heroes.length,0,variation+' must prevent this group from merging');}
units=Array.from({length:40},(_,i)=>unit(i));result=C.compact(units,{multiplayer:true});assert.equal(units.length,2);assert.equal(result.heroes.length,2);assert.equal(C.population(units),40);assert.equal(C.compact(units,{multiplayer:true}).heroes.length,0,'heroes do not merge recursively');
const w={DesertConsolidation:C};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'tri-lane-engine.js'),'utf8'),{window:w,Math,Object,Number,Array,String,Map,Set,console});const E=w.DesertTriEngine;
function engine(count){const e=E.create({members:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:1}]});for(let i=0;i<count;i++)e.state.players[0].buildings[0][i]=0;e.wave();return e;}
const e=engine(20);assert.equal(e.state.units.length,20);for(let i=0;i<6;i++)e.tick(.2);assert.equal(e.state.units.length,1);assert.equal(e.state.units[0].heroCount,20);assert.equal(e.snapshot('a').units[0].heroCount,20,'host sends aggregate identity to clients');
const h=e.state.units[0],control=engine(1),n=control.state.units[0];for(const u of [h,n]){u.x=E.WIDTH-215;u.y=260;u.cool=0;}
const beforeH=e.state.turrets[0][1],beforeN=control.state.turrets[0][1];e.tick(.01);control.tick(.01);const deltaH=beforeH-e.state.turrets[0][1],deltaN=beforeN-control.state.turrets[0][1];assert.ok(deltaN>0);assert.ok(Math.abs(deltaH/deltaN-20)<1e-8,'actual structure attack is exactly twenty times');
console.log('Hero consolidation regression passed: 19/20 threshold, exact additive stats, 2x radius, redirection, owner/skin/health/lane isolation, no recursive merging, preserved supply, host snapshots and actual 20x structure damage.');
