'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
require('./augment-rules.js');
global.DesertAugments.load(JSON.parse(fs.readFileSync(__dirname+'/assets/data/augments.json','utf8')));
require('./tri-lane-engine.js');
const A=global.DesertAugments,E=global.DesertTriEngine;
const cards=JSON.parse(fs.readFileSync(__dirname+'/assets/data/augments.json','utf8')).cards;
assert.equal(cards.length,300);
assert.equal(new Set(cards.map(c=>c.id)).size,300);
for(const [scope,want] of [['common',[18,18,14]],...Array.from({length:10},(_,f)=>['faction-'+f,[9,9,7]])])
 for(const [i,tier] of ['silver','gold','prismatic'].entries())
  assert.equal(cards.filter(c=>c.scope===scope&&c.tier===tier).length,want[i]);
for(const c of cards)for(const e of c.effects){
 assert.ok(['stat','extra_spawn'].includes(e.kind));
 assert.ok(e.roles.every(r=>Number.isInteger(r)&&r>=0&&r<8));
 assert.ok(Math.abs(e.value)<=3);
}
function make(f,seed=123){
 return E.create({mode:'classic',ruleset:'augment',seed,members:[
  {uid:'a',team:0,faction:f},{uid:'b',team:1,faction:(f+1)%10}
 ]});
}
for(let f=0;f<10;f++){
 const e=make(f);
 assert.equal(e.state.ruleset,'augment');
 const tiers=e.state.augmentSchedule;
 assert.equal(tiers.length,5);
 for(const round of [1,10,20,30,40]){
  if(round>1){e.state.wave=round-1;e.state.next=.01;e.tick(.02);}
  const ca=e.snapshot('a').augmentChoice,cb=e.snapshot('b').augmentChoice;
  assert.equal(ca.round,round);
  assert.equal(ca.tier,cb.tier);
  assert.equal(ca.cards.length,3);
  assert.equal(new Set(ca.cards).size,3);
  assert.equal(A.get(ca.cards[0]).scope,'faction-'+f);
  assert.ok(ca.cards.slice(1).every(id=>A.get(id).scope==='common'));
  assert.ok(ca.cards.every(id=>A.get(id).tier===ca.tier));
  for(let slot=0;slot<3;slot++){
   const prior=ca.cards[slot];
   assert.equal(e.order('a',{type:'augment_reroll',slot}).ok,true);
   assert.notEqual(e.snapshot('a').augmentChoice.cards[slot],prior);
   assert.equal(e.order('a',{type:'augment_reroll',slot}).ok,false);
  }
  assert.equal(e.order('a',{type:'augment_pick',slot:0}).ok,true);
  assert.equal(e.order('b',{type:'augment_pick',slot:0}).ok,true);
  assert.equal(e.snapshot('a').augmentChoice,null);
 }
 assert.equal(new Set(e.state.players[0].augments).size,5);
}
const timeout=make(0,7);
timeout.tick(.2);
assert.equal(timeout.state.seconds,0);
for(let i=0;i<151;i++)timeout.tick(.2);
assert.equal(timeout.snapshot('a').augmentChoice,null);
assert.equal(timeout.state.players[0].augments.length,1);
const ref=make(0);
console.log('AUGMENT_PARITY '+JSON.stringify({schedule:ref.state.augmentSchedule,offer:ref.snapshot('a').augmentChoice.cards}));
console.log('300 cards, 10 factions, five stages, rerolls, timeout, freeze OK');

