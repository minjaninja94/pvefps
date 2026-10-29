'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const elements=new Map(),noop=()=>{};
const g=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){if(!elements.has(id))elements.set(id,{style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop},getContext:()=>g,querySelectorAll:()=>[],addEventListener:noop});return elements.get(id);}
const w={DesertGuardian:require('./defense-guardian.js'),DesertConsolidation:require('./unit-consolidation.js')},document={getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({getContext:()=>g})};
const env={window:w,document,requestAnimationFrame:noop,console,Map,Set,Math,Object,Number,Array,String,Date};
let solo=read('game-v2.js').replace('initFactions();wire();reset();','window.test={reset,state:()=>state,selectRole,place,constructExtractor,ecoBuildSeconds,constructionBar,updateUI,ecoStabilize,ecoCostFor,tick,wave,upgrade,demolish:i=>{demolition=true;place(i);demolition=false;}};reset();');
vm.runInNewContext(solo,env);const S=w.test;
function advanceSolo(seconds){let left=seconds;while(left>1e-8){const n=Math.min(.04,left);S.tick(n);left-=n;}}
S.reset();let s=S.state();s.live=true;S.selectRole(8);S.place(0);
assert.equal(s.built[0],8);assert.equal(s.eco,1);assert.equal(s.cash,290);assert.equal(s.ecoReadyAt,30);
assert.equal(s.buildReadyAt[0],24);assert.match(S.constructionBar(0),/건설 24초/);assert.match(elements.get('buildGrid').innerHTML,/cell-name[\s\S]*build-progress/);
const cash=s.cash;advanceSolo(24);assert.equal(s.cash,cash,'construction blocks all income');assert.match(S.constructionBar(0),/안정화 6초/);advanceSolo(5.9);assert.equal(s.cash,cash,'all passive income must stop without accumulating a catch-up balance');
S.place(1);assert.equal(s.built[1],null,'cannot stack extractors during stabilization');
advanceSolo(.2);assert.equal(S.constructionBar(0),'');assert.equal(s.cash,cash+2,'income resumes at the next eligible fixed tick');
S.wave();assert.ok(s.units.every(u=>u.role<8),'extractors never spawn combat units');
S.reset();s=S.state();s.live=true;s.next=.1;S.selectRole(8);S.place(0);const stopped=s.cash;advanceSolo(.2);assert.equal(s.cash,stopped,'wave stipend is paused too');
S.demolish(0);assert.equal(s.eco,0);assert.equal(s.cash,stopped+38);assert.equal(s.ecoReadyAt,30,'selling must not bypass the blackout');S.place(1);assert.equal(s.built[1],null);
S.reset();s=S.state();s.live=true;const before=s.cash;S.upgrade('econ');assert.equal(s.eco,0);assert.equal(s.cash,before,'legacy upgrade entry selects a building without free income');
const m={DesertGuardian:require('./defense-guardian.js'),DesertConsolidation:require('./unit-consolidation.js')};vm.runInNewContext(read('tri-lane-engine.js'),{window:m,console,Map,Set,Math,Object,Number,Array,String});const E=m.DesertTriEngine;
function create(){return E.create({mode:'pvp',size:1,members:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:1}]});}
function advance(e,seconds){let left=seconds;while(left>1e-8){const n=Math.min(.1,left);e.tick(n);left-=n;}}
let e=create(),p=e.state.players[0],op=e.state.players[1];
assert.equal(e.order('a',{type:'build',lane:0,slot:0,role:8}).ok,true);assert.equal(p.eco,1);assert.equal(p.cash,290);assert.equal(p.ecoReadyAt,30);
assert.equal(p.buildingReadyAt[0][0],24);assert.equal(p.mineTimings['0-0'].readyAt,30);
advance(e,24);assert.equal(p.cash,290,'multiplayer construction blocks income');advance(e,5.9);assert.equal(p.cash,290);assert.ok(op.cash>360,'another owner keeps their income');
assert.equal(e.order('a',{type:'econ'}).ok,false);assert.equal(e.order('a',{type:'build',lane:1,slot:0,role:8}).ok,false);
assert.equal(Object.keys(e.snapshot('b').players[0].mineTimings).length,0);assert.equal(e.snapshot('b').players[0].ecoReadyAt,null,'enemy economy remains redacted');
assert.equal(e.order('a',{type:'build',lane:0,slot:0,role:null}).ok,true);assert.equal(p.cash,328);assert.equal(p.eco,0);assert.equal(p.ecoReadyAt,30);
e=create();p=e.state.players[0];p.cash=100000;
for(let level=1;level<=7;level++){const lane=level%3,slot=level,started=e.state.seconds;assert.equal(e.order('a',{type:'build',lane,slot,role:8}).ok,true);assert.equal(p.eco,level);assert.ok(Math.abs(p.buildingReadyAt[lane][slot]-started-(24+8*(level-1)))<1e-6);assert.ok(Math.abs(p.ecoReadyAt-p.buildingReadyAt[lane][slot]-E.ecoStabilize(level,started))<1e-6);advance(e,p.ecoReadyAt-e.state.seconds+.1);}
assert.equal(e.order('a',{type:'build',lane:0,slot:20,role:8}).ok,false,'cap applies across all three lanes');
e.wave();assert.ok(e.state.units.every(u=>u.role<8));assert.equal(p.buildings.flat().filter(r=>r===8).length,7,'seven income steps consume seven real production slots');
for(let level=1;level<=7;level++)for(const seconds of [0,119,120,359,720,1200]){assert.equal(E.ecoBuildSeconds(level),S.ecoBuildSeconds(level));assert.equal(E.ecoPrice(level-1),S.ecoCostFor(level-1));assert.equal(E.ecoStabilize(level,seconds),S.ecoStabilize(level,seconds));}
assert.ok(E.ecoStabilize(7,720)>E.ecoStabilize(1,0));
for(const side of [0,1]){
 S.reset();const st=S.state();st.live=true;st.elapsed=720;st[side?'enemyEco':'eco']=6;st[side?'enemyCash':'cash']=10000;
 assert.equal(S.constructExtractor(side,0),true);
 const timing=(side?st.enemyMineTimings:st.mineTimings)[0];
 assert.equal(timing.buildEndsAt,792);assert.equal(timing.readyAt,816,'seventh extractor: 72s construction + 24s stabilization');
}
console.log('Economy regression passed: real slots, paid costs, paused income/stipends, no catch-up, resumption, demolition/refund, no blackout bypass, 7-building global cap, no combat spawns, redaction and solo/multiplayer parity.');
