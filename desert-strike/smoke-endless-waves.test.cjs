'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=__dirname,read=f=>fs.readFileSync(path.join(root,f),'utf8');
let seed=17;const deterministic=Object.create(Math);
deterministic.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const w={DesertConsolidation:require('./unit-consolidation.js'),DesertGuardian:require('./defense-guardian.js')};
vm.runInNewContext(read('tri-lane-engine.js'),{window:w,Math:deterministic,Number,Array,Object,Map,Set,Date,console},{filename:'tri-lane-engine.js',timeout:9000});
const E=w.DesertTriEngine;
function members(mode){
 return mode==='coop'?[{uid:'p0',team:0,faction:0},{uid:'p1',team:0,faction:1}]:[
  {uid:'p0',team:0,faction:0},{uid:'p1',team:1,faction:1}
 ];
}
test('multiplayer PvP, classic 1v1 and co-op do not auto-end at 20 minutes or on wave 100',()=>{
 for(const mode of ['pvp','classic','coop']){
  const m=E.create({mode,size:mode==='coop'?2:1,members:members(mode)});
  const s=m.state;s.next=999999;
  s.seconds=1199.95;
  m.tick(.2);
  assert.equal(s.ended,false,mode+' must not time out at 1200 seconds');
  assert.equal(s.winner,null,'no winner by remaining core HP');
  s.seconds=7200;s.wave=99;
  m.wave();
  assert.equal(s.wave,100,mode+' should deploy the 100th wave');
  assert.equal(s.ended,false);
  m.tick(.2);
  assert.equal(s.ended,false,mode+' should continue after two hours');
  assert.equal(m.snapshot('p0').wave,100);
  assert.equal(m.snapshot('p0').ended,false);
  // Two of three cores (one in classic) are still the authoritative win condition.
  const needed=mode==='classic'?1:2;
  for(let lane=0;lane<needed;lane++)s.cores[lane][1]=0;
  m.tick(.2);
  assert.equal(s.ended,true,mode+' ends as soon as enough enemy cores are destroyed');
  assert.equal(s.winner,0,mode+' awards victory to the surviving team');
 }
});
test('one surviving core prevents a time-based or partial-destruction win',()=>{
 const m=E.create({mode:'pvp',size:1,members:members('pvp')});
 const s=m.state;
 s.cores[0][1]=0;s.cores[1][1]=1;
 s.seconds=25000;s.next=100000;s.wave=250;
 m.tick(.2);
 assert.equal(s.ended,false,'partial destruction alone does not end the battle');
 assert.equal(s.winner,null,'no scoreboard winner is fabricated');
 assert.equal(m.snapshot('p0').wave,250);
});
test('single-player win condition remains core destruction and lobby no longer advertises 22-wave limit',()=>{
 const solo=read('game-v2.js'),lobby=read('front-lobby.js'),html=read('index.html');
 assert.match(solo,/if\(state\.baseHP\[side\]<=0\)endMatch\(side===1\)/);
 assert.doesNotMatch(solo,/wave\s*[>=]=?\s*22/);
 assert.doesNotMatch(solo,/endMatch\(.*wave/);
 assert.doesNotMatch(lobby,/22웨이브 전투/);
 assert.doesNotMatch(html,/22웨이브 AI 전투/);
 assert.match(lobby,/무제한 웨이브/);
 assert.match(html,/무제한 AI 전투/);
 assert.doesNotMatch(read('tri-lane-engine.js'),/seconds>=1200/);
});
