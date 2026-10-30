'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'tri-lane-engine.js'),'utf8');
const make=(mode='classic',lane=0)=>{
 const window={};
 vm.runInNewContext(source,{window,Math,Map,Set,Array,Object,Number,String,console},{filename:'tri-lane-engine.js'});
 const game=window.DesertTriEngine.create({mode,size:1,members:[{uid:'left',team:0,faction:0},{uid:'right',team:1,faction:1}]});
 game.state.next=1000;game.state.wave=8;
 const y=(lane+.5)*520;
 const ally={id:1,uid:'left',team:0,faction:0,role:2,lane,x:2300,y,hp:10000,maxHP:10000,radius:15,
  cool:0,frame:0,attackAge:0,spawnAge:1,hitAge:0,skillAge:0,act:'idle'};
 const enemy={id:2,uid:'right',team:1,faction:1,role:0,lane,x:2650,y,hp:10000,maxHP:10000,radius:15,
  cool:1000,frame:0,attackAge:0,spawnAge:1,hitAge:0,skillAge:0,act:'idle'};
 game.state.units.push(ally,enemy);
 return {game,ally,enemy,lane};
};
for(const [mode,lane] of [['classic',0],['pvp',1]]){
 test('forward tower ahead of newborn defender takes aggro in '+mode,()=>{
  const {game,enemy}=make(mode,lane),before=game.state.forwardHP[lane][1];
  game.tick(.05);
  assert.ok(game.state.forwardHP[lane][1]<before,'tower is attacked before reinforcements behind it');
  assert.equal(enemy.hp,enemy.maxHP,'newly spawned defender behind tower should not steal targeting');
 });
 test('frontline defender ahead of tower still takes aggro in '+mode,()=>{
  const {game,enemy}=make(mode,lane);enemy.x=2340;
  const before=game.state.forwardHP[lane][1],hp=enemy.hp;
  game.tick(.05);
  assert.equal(game.state.forwardHP[lane][1],before,'tower must not steal targeting from closer enemy in front');
  assert.ok(enemy.hp<hp,'visible enemy ahead of tower remains a priority');
 });
}
test('supporters have no offensive matchup in both engines',()=>{
 const window={};vm.runInNewContext(source,{window,Math,Map,Set,Array,Object,Number,String,console});
 const fallback=window.DesertTriEngine.definition(0,7);
 assert.equal(fallback.damage,0);
 assert.deepEqual(Array.from(fallback.good),[]);
 assert.deepEqual(Array.from(fallback.bad),[]);
});
