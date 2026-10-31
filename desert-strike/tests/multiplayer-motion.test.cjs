const {test}=require('node:test'),assert=require('node:assert/strict');
require('../multiplayer-motion.js');
const unit=(x,rest={})=>({id:1,x,y:260,lane:1,team:0,faction:0,hp:100,...rest});
const packet=(units,seconds=1)=>({units,seconds});
test('smooth authoritative steps; latest health and opacity remain authoritative',()=>{
 const m=DesertMultiplayerMotion.create();m.receive(packet([unit(100)]),1000);
 const next=unit(120,{hp:25,opacity:.3});m.receive(packet([next],1.2),1200);
 assert.equal(m.sample(next,1200).x,100);assert.equal(m.sample(next,1300).x,110);
 assert.equal(m.sample(next,1400).x,120);assert.equal(m.sample(next,9999).x,120);
 assert.equal(m.sample(next,1300).hp,25);assert.equal(m.sample(next,1300).opacity,.3);
});
test('jitter continues from displayed position; teleports and lane changes snap immediately',()=>{
 const m=DesertMultiplayerMotion.create();m.receive(packet([unit(0)]),1000);
 m.receive(packet([unit(20)]),1200);m.receive(packet([unit(30)]),1300);
 assert.equal(m.sample(unit(30),1300).x,10);
 m.receive(packet([unit(1000)]),1500);assert.equal(m.sample(unit(1000),1500).x,1000);
 m.receive(packet([unit(1010,{lane:0})]),1700);assert.equal(m.sample(unit(1010,{lane:0}),1700).x,1010);
});
test('removed or hidden units, restarted matches and reused IDs do not retain tracks',()=>{
 const m=DesertMultiplayerMotion.create();m.receive(packet([unit(100)],10),1000);
 m.receive(packet([],11),1200);assert.equal(m.sample(unit(150),1200).x,150);
 m.receive(packet([unit(150)],1),1400);assert.equal(m.sample(unit(150),1400).x,150);
 m.receive(null,1600);assert.equal(m.sample(unit(170),1600).x,170);
});
