'use strict';
// Late-match comeback depends on scouting the correct unit counters, not all units becoming fragile.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const near=(actual,want,label)=>assert.ok(Math.abs(actual-want)<1e-7,label+': '+actual+' vs '+want);
function soloGame(){
 const noop=()=>{};
 const drawing=new Proxy({createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(obj,k)=>k in obj?obj[k]:noop});
 const elements=new Map();
 const getElementById=id=>{
  if(!elements.has(id))elements.set(id,{style:{},dataset:{},textContent:'',innerHTML:'',hidden:false,
   classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},getContext:()=>drawing,
   addEventListener:noop,querySelectorAll:()=>[],querySelector:()=>null,setAttribute:noop,append:noop,replaceChildren:noop});
  return elements.get(id);
 };
 const document={getElementById,createElement:()=>({getContext:()=>drawing}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener:noop,body:{dataset:{}}};
 const context={window:{addEventListener:noop},document,requestAnimationFrame:noop,Math,console};
 vm.runInNewContext(read('unit-consolidation.js'),context,{filename:'unit-consolidation.js'});
 const tag='initFactions();wire();reset();',replacement='window.__counterTest={reset,state:()=>state,getDef,calcDamage,counterAdvantage,matchupMultiplier};reset();';
 let code=read('game-v2.js');
 assert.ok(code.includes(tag));
 code=code.replace(tag,replacement).replaceAll('updateUI(true);','').replaceAll('updateUI(false);','');
 vm.runInNewContext(code,context,{filename:'game-v2.js'});
 return {api:context.window.__counterTest,window:context.window};
}
function multiGame(){
 const window={DesertConsolidation:require('./unit-consolidation.js')};
 const context={window,Math,Map,Set,Number,Object,Array,console};
 const marker='return {state,order,tick,wave,snapshot,definition};';
 const code=read('tri-lane-engine.js');
 assert.ok(code.includes(marker),'authoritative hit-test hook exists');
 vm.runInNewContext(code.replace(marker,'return {state,order,tick,wave,snapshot,definition,__test:{applyHit,hitFort}};'),context,{filename:'tri-lane-engine.js'});
 return window.DesertTriEngine;
}
const thresholds=[[0,1.55],[1,1.55],[29,1.55],[30,1.65],[39,1.65],[40,1.75],
 [49,1.75],[50,1.85],[59,1.85],[60,2],[100,2],[250,2]];
test('solo and authoritative multiplayer use the same escalating advantage and unchanged disadvantages',()=>{
 const {api}=soloGame(),E=multiGame(),definitions=[
  {attack:0,target:5,faction:0,beneficial:true},{attack:1,target:0,faction:0,beneficial:true},
  {attack:2,target:3,faction:0,beneficial:true},{attack:4,target:6,faction:5,beneficial:true},
  {attack:0,target:3,faction:0,expected:.7},{attack:0,target:2,faction:0,expected:1},
  {attack:1,target:3,faction:0,expected:.7},{attack:0,target:6,faction:4,expected:.68},
  {attack:4,target:6,faction:4,expected:.78},{attack:2,target:6,faction:4,ground:true},
  {attack:2,target:6,faction:3,ground:true},{attack:2,target:6,faction:7,ground:true}
 ];
 for(const [wave,advantage] of thresholds){
  near(api.counterAdvantage(wave),advantage,'solo wave '+wave);
  near(E.counterAdvantage(wave),advantage,'multiplayer wave '+wave);
  for(const d of definitions){
   const want=d.ground?1.65*advantage/1.55:d.beneficial?advantage:d.expected;
   const shooter=api.getDef(d.attack,0),target={role:d.target,faction:d.faction};
   near(api.matchupMultiplier(shooter,target,wave),want,'solo matchup at W'+wave+': '+d.attack+' vs '+d.target);
   near(E.matchupMultiplier(E.definition(0,d.attack),target,wave),want,'MP matchup at W'+wave+': '+d.attack+' vs '+d.target);
  }
 }
});
test('actual solo projectile hit calculation honors wave scaling, but neutral and core attack values do not',()=>{
 const {api,window}=soloGame(),state=api.state();
 const attacker={role:0,faction:0,side:0,hp:300,maxHP:300},victim={role:5,faction:1,side:1,hp:500,maxHP:500};
 for(const [wave,bonus] of [[29,1.55],[30,1.65],[40,1.75],[50,1.85],[60,2]]){
  state.wave=wave;
  const hit=api.calcDamage(0,victim,100,attacker);
  near(hit,window.DesertConsolidation.hit(100*bonus,api.getDef(5,1).armor,victim,attacker),'solo real attack at wave '+wave);
  victim.role=2;
  const neutral=api.calcDamage(0,victim,100,attacker);
  near(neutral,window.DesertConsolidation.hit(100,api.getDef(2,1).armor,victim,attacker),'neutral damage unscaled');
  victim.role=5;
 }
});
test('real host hit resolution scales right unit counter and leaves neutral/weak hits intact',()=>{
 const E=multiGame(),match=E.create({mode:'classic',size:1,members:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:1}]});
 const attacker={id:1,uid:'a',team:0,faction:0,role:0,lane:0,x:530,y:260,hp:500,maxHP:500,radius:15};
 const target={id:2,uid:'b',team:1,faction:1,role:5,lane:0,x:550,y:260,hp:2000,maxHP:2000,radius:15};
 match.state.units.push(attacker,target);
 function strike(wave,atkRole,victimRole){match.state.wave=wave;attacker.role=atkRole;target.role=victimRole;target.hp=2000;const before=target.hp;
  match.__test.applyHit(attacker,target,100);return before-target.hp;}
 for(const [wave,advantage] of thresholds.slice(2,10)){
  near(strike(wave,0,5),100*advantage,'host advantage at wave '+wave);
  near(strike(wave,0,2),100,'host neutral at wave '+wave);
  near(strike(wave,0,3),100*.7-9*.66,'host weak vs armored at wave '+wave);
 }
 match.state.wave=60;
 const hp=match.state.cores[0][1];
 match.__test.hitFort(0,1,200,'core');
 near(hp-match.state.cores[0][1],200*.85,'core still uses original 15% reduction, not counter scaling');
});
test('both battle HUDs disclose only the current strength of the advantage, not global damage inflation',()=>{
 const html=read('index.html'),solo=read('game-v2.js'),multi=read('tri-lane-ui.js');
 for(const id of ['counterTempo','mpCounterTempo'])assert.ok(html.includes('id="'+id+'"'),id+' shown in battle HUD');
 assert.match(solo,/counterTempo.*counterAdvantage/);
 assert.match(multi,/mpCounterTempo.*counterAdvantage/);
 assert.match(html,/유리한 병종 상성 피해/);
 assert.match(html,/counterphase20261030/);
});