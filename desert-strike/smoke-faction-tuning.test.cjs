'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-7,message+' ('+actual+' vs '+expected+')');
const noop=()=>{};
const fakeCanvas=new Proxy({createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}},{get(o,k){return k in o?o[k]:noop;}});
const ids=new Map();
function element(id){
 if(ids.has(id))return ids.get(id);
 const items=new Set(),e={id,style:{},dataset:{},textContent:'',innerHTML:'',hidden:false,
  classList:{add(k){items.add(k);},remove(k){items.delete(k);},contains(k){return items.has(k);},toggle(k,on){on?items.add(k):items.delete(k);}},
  addEventListener:noop,getContext(){return fakeCanvas;},querySelectorAll(){return [];},querySelector(){return null;},setAttribute:noop};
 ids.set(id,e);return e;
}
const document={getElementById:element,createElement(){return {getContext(){return fakeCanvas;}};},
 querySelector(){return null;},querySelectorAll(){return [];},addEventListener:noop,body:{dataset:{}}};
const solo={window:{addEventListener:noop},document,requestAnimationFrame:noop,Math,console};
for(const script of ['unit-consolidation.js','defense-guardian.js','hard-ai.js'])
 vm.runInNewContext(read(script),solo,{timeout:10000,filename:script});
let code=read('game-v2.js');
assert.ok(code.includes('initFactions();wire();reset();'),'solo bootstrap hook must exist');
code=code.replace('initFactions();wire();reset();',
 'window.__traitTest={reset,state:()=>state,createUnit,getDef,damage,heal};reset();')
 .replaceAll('updateUI(true);','').replaceAll('updateUI(false);','');
vm.runInNewContext(code,solo,{timeout:10000,filename:'game-v2.js'});
const game=solo.window.__traitTest;
near(game.getDef(7,9).heal/game.getDef(7,0).heal,1.08,'fairy heals 8% above standard unit');
game.reset();let state=game.state();state.faction=4;state.enemyFaction=0;
game.createUnit(0,0,0);game.createUnit(1,0,1);
const victim=state.units[0],shooter=state.units[1];
const measure=(faction,role)=>{victim.faction=faction;victim.hp=victim.maxHP;shooter.role=role;
 const before=victim.hp;game.damage(victim,100,role,shooter);return before-victim.hp;};
const standardShot=measure(0,1),beastShot=measure(4,1);
near(beastShot/standardShot,.94,'beastkin ranged protection must mitigate by exactly 6%');
near(measure(4,0)/measure(0,0),1,'beastkin must not reduce melee damage');
game.reset();state=game.state();state.faction=9;state.elapsed=10;
game.createUnit(0,0,7);game.createUnit(0,1,0);game.createUnit(0,2,0);
const [healer,injured,partner]=state.units;
healer.x=780;healer.y=245;injured.x=825;injured.y=255;partner.x=830;partner.y=265;
injured.hp-=110;partner.hp-=90;
const injuredBefore=injured.hp,partnerBefore=partner.hp;
game.heal(injured,game.getDef(7,9).heal,false,healer);
const recovered=injured.hp-injuredBefore;
near(partner.hp-partnerBefore,recovered*.05,'solo fairy chain heal must be 5% of actual recovery');
assert.ok(recovered>game.getDef(7,0).heal,'fairy heals more than a standard support');

const tri={window:{},Math,Map,Set,Number,Object,Array,console};
for(const script of ['unit-consolidation.js','defense-guardian.js','hard-ai.js'])
 vm.runInNewContext(read(script),tri,{timeout:10000,filename:script});
const triSource=read('tri-lane-engine.js'),tag='return {state,order,tick,wave,snapshot,definition};';
assert.equal(triSource.split(tag).length,2,'three-lane trait test hook must exist');
vm.runInNewContext(triSource.replace(tag,'return {state,order,tick,wave,snapshot,definition,__test:{applyHit,attack}};'),tri,{timeout:10000,filename:'tri-lane-engine.js'});
const E=tri.window.DesertTriEngine;
near(E.definition(9,7).heal/E.definition(0,7).heal,1.08,'multiplayer fallback fairy healing bonus');
const match=E.create({mode:'pvp',size:1,members:[{uid:'ally',team:0,faction:4},{uid:'enemy',team:1,faction:0}]});
const a={id:10,uid:'enemy',team:1,faction:0,role:1,lane:0,x:530,y:260,hp:300,maxHP:300,radius:15};
const v={id:11,uid:'ally',team:0,faction:4,role:0,lane:0,x:540,y:260,hp:300,maxHP:300,radius:15};
match.state.units.push(a,v);
const multiMeasure=(faction,role)=>{a.role=role;v.faction=faction;v.hp=v.maxHP;
 const before=v.hp;match.__test.applyHit(a,v,100);return before-v.hp;};
near(multiMeasure(4,1)/multiMeasure(0,1),.94,'multiplayer beastkin ranged mitigation must equal 6%');
near(multiMeasure(4,0)/multiMeasure(0,0),1,'multiplayer melee damage must remain unchanged');
const healGame=E.create({mode:'pvp',size:1,members:[{uid:'fairy',team:0,faction:9},{uid:'enemy',team:1,faction:0}]});
healGame.state.seconds=10;
const support={id:21,uid:'fairy',team:0,faction:9,role:7,lane:0,x:800,y:250,hp:300,maxHP:300,radius:15,cool:0};
const first={id:22,uid:'fairy',team:0,faction:9,role:0,lane:0,x:835,y:250,hp:200,maxHP:300,radius:15};
const second={id:23,uid:'fairy',team:0,faction:9,role:0,lane:0,x:840,y:260,hp:170,maxHP:300,radius:15};
healGame.state.units.push(support,first,second);
const hp0=first.hp,hp1=second.hp;
healGame.__test.attack(support,first);
const received=first.hp-hp0;
assert.ok(received>E.definition(0,7).heal,'multiplayer fairy healing bonus must be applied');
near(second.hp-hp1,received*.05,'multiplayer fairy chain heal must equal 5% of recovery');
console.log('Both engines: fairy +8% healing, 5% chain, beastkin 6% ranged protection, no melee mitigation passed.');
