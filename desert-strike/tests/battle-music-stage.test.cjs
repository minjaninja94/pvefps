const {test}=require('node:test'),assert=require('node:assert/strict');
const {solo,multi}=require('../combat-balance-harness.cjs');
function multiplayer(mode='pvp'){
 const {E}=multi(),m=E.create({mode,size:1,members:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:1}]});
 m.state.seconds=20;m.state.next=999;m.__test.spawn(m.state.players[0],0,0,0);m.__test.spawn(m.state.players[1],0,0,0);
 const [a,b]=m.state.units;Object.assign(a,{x:1600,y:260,hp:10000,maxHP:10000,spawnAge:1});Object.assign(b,{x:1620,y:260,hp:10000,maxHP:10000,spawnAge:1});
 return {m,a,b};
}
for(const mode of ['classic','pvp'])test(mode+': host chooses sticky music stages from real hits, successful nuke and enemy-outpost crossing',()=>{
 const {m,a,b}=multiplayer(mode);
 assert.equal(m.snapshot('a').musicStage,0);
 m.__test.applyHit(a,b,10);assert.equal(m.state.musicStage,0,'one-sided first hit is not exchanged combat');
 m.__test.applyHit(b,a,10);assert.equal(m.state.musicStage,1);
 a.x=2600;m.tick(.01);assert.equal(m.state.musicStage,1,'crossing alone cannot start highlight');
 a.x=1600;assert.ok(m.order('a',{type:'tactic',kind:'nuke'}).ok);assert.equal(m.state.nukeCount,1);
 m.tick(.01);assert.equal(m.state.musicStage,1,'nuke alone cannot start highlight');
 a.x=2600;m.tick(.01);assert.equal(m.state.musicStage,2);
 assert.equal(m.snapshot('a').musicStage,2);assert.equal(m.snapshot('b').musicStage,2,'both viewers hear same global stage despite fog');
 m.state.units=[];m.tick(.01);assert.equal(m.state.musicStage,2,'combat lull never restarts an earlier song');
});
test('enemy nuke, leftward invasion, failed nuke, guardians and dead invaders',()=>{
 const {m,a,b}=multiplayer();
 assert.ok(m.order('b',{type:'tactic',kind:'nuke'}).ok);b.x=700;b.guardian=true;m.tick(.01);assert.equal(m.state.musicStage,0);
 b.guardian=false;b.hp=0;m.tick(.01);assert.equal(m.state.musicStage,0);
 m.__test.spawn(m.state.players[1],0,0,0);const invader=m.state.units.at(-1);Object.assign(invader,{x:700,y:260,spawnAge:1});m.tick(.01);assert.equal(m.state.musicStage,2);
 const {m:empty}=multiplayer();empty.state.units=[];assert.equal(empty.order('a',{type:'tactic',kind:'nuke'}).ok,false);assert.equal(empty.state.nukeCount,0);
});
test('solo uses exchanged damage and either side nuclear stock for the same progression',()=>{
 const {G,window}=solo();G.reset();const s=G.state(),stages=[];window.DesertLobbyMusic={setBattleStage:v=>stages.push(v)};
 Object.assign(s,{live:true,next:999,aiNextThink:Infinity,elapsed:20,enemyCash:0});
 G.createUnit(0,0,0);G.createUnit(1,0,0);const [a,b]=s.units;Object.assign(a,{x:1600,y:260,spawnAge:1});Object.assign(b,{x:1620,y:260,spawnAge:1});
 G.damage(b,1,0,a);G.damage(a,1,0,b);G.tick(.01);assert.equal(stages.at(-1),1);
 assert.ok(G.detonateEmergency(1));G.createUnit(1,0,0);const invader=s.units.at(-1);Object.assign(invader,{x:700,y:260,spawnAge:1});G.tick(.01);assert.equal(stages.at(-1),2);
});
