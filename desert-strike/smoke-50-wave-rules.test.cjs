'use strict';
// Real-engine parity checks for the proposed ~50-wave Desert Front pacing.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
async function main(){
 const catalogue=JSON.parse(read('assets/augments.json'));
 const mockFetch=async()=>({ok:true,json:async()=>catalogue});
const canvas=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});
const els=new Map();
function el(id){
 if(!els.has(id))els.set(id,{id,style:{},hidden:false,textContent:'',innerHTML:'',dataset:{},
  classList:{add(){},remove(){},contains(){return false},toggle(){}},
  getContext(){return canvas},getBoundingClientRect(){return {left:0,top:0,width:1100,height:520}},
  addEventListener(){},setAttribute(){},removeAttribute(){},append(){},replaceChildren(){}});
 return els.get(id);
}
const document={getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],
 createElement:()=>({getContext(){return canvas}}),addEventListener(){}};
let difficulty='normal';
const w={DesertLobby:{aiDifficulty:()=>difficulty,selectedRuleset:()=> 'standard',completeSolo(){}},addEventListener(){}};
const ctx={window:w,document,requestAnimationFrame(){},fetch:mockFetch,console,Map,Set,Array,Object,Number,Date,Math,JSON,String};
for(const name of ['unit-consolidation.js','defense-guardian.js','hard-ai.js','augment-rules.js'])
 vm.runInNewContext(read(name),ctx,{filename:name});
await w.DesertAugments.load();
const source=read('game-v2.js').replace('initFactions();wire();reset();',
 'window.__pace={reset,state:()=>state,place,selectRole,wave,tick,aiInitialBuild,hardInvest,structureHit,demolish:i=>{demolition=true;place(i);demolition=false;}};reset();');
assert.ok(source.includes('window.__pace='),'solo injection succeeded');
vm.runInNewContext(source,ctx,{filename:'game-v2.js'});
const S=w.__pace;
const expectedPrices=[65,100,185,285,185,360,300,220];
assert.deepEqual(Array.from(w.DesertRoster.ROLE,r=>r.cost),expectedPrices,'published role prices');
for(const ruleset of ['standard','augment']){
 S.reset();const st=S.state();Object.assign(st,{live:true,ruleset,cash:10000,aiNextThink:Infinity});
 for(let role=0;role<8;role++){
  const before=st.cash;S.selectRole(role);S.place(role);
  assert.equal(st.cash,before-expectedPrices[role],ruleset+' solo pays displayed price');
  assert.equal(st.buildReadyAt[role],24,'advanced price does not bypass construction');
  S.demolish(role);assert.equal(st.cash,before-expectedPrices[role]+Math.floor(expectedPrices[role]*.55),'correct-price refund');
 }
}
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-6,msg+': '+a+' vs '+b);
for(const ruleset of ['standard','augment']){
 S.reset();const state=S.state();state.live=true;state.ruleset=ruleset;state.aiNextThink=Infinity;
 state.next=999999;
 assert.deepEqual([...state.baseHP],[8640,8640],ruleset+' solo core HP');
 S.selectRole(0);S.place(0);
 assert.equal(state.built[0],0);
 assert.equal(state.buildReadyAt[0],24);
 assert.equal(state.cash,295,'paid factory cost remains 65 CR');
 state.elapsed=23.99;S.wave();
 assert.equal(state.produced[0][0],0,ruleset+' cannot spawn from unfinished facility');
 state.elapsed=24;S.wave();
 assert.equal(state.produced[0][0],1,ruleset+' deploys on completion');
 assert.equal(state.buildReadyAt[0],24);
 // Sold/rebuilt factories cannot bypass their next construction window.
 const before=state.baseHP[1];S.structureHit(1,1000,'core');
 near(state.baseHP[1],before-850,ruleset+' core loses 85% of former direct attack');
 S.selectRole(0); // toggles selection off
 state.eco=7;state.ecoReadyAt=0;state.enemyEco=7;state.enemyEcoReadyAt=0;
 state.elapsed=50;state.cash=0;state.enemyCash=0;state.incomeClock=0;
 S.tick(.5);near(state.cash,6.8,ruleset+' max eco late tier reduced');
}
for(const econ of [0,1,4,5,6,7]){
 S.reset();const st=S.state();st.live=true;st.aiNextThink=Infinity;st.next=999999;
 st.eco=econ;st.enemyEco=econ;st.ecoReadyAt=0;st.enemyEcoReadyAt=0;
 st.cash=0;st.enemyCash=0;S.tick(.5);
 const expected=(1+econ)*(econ>=5?.85:1);
 near(st.cash,expected,'solo tier '+econ);near(st.enemyCash,expected,'AI tier '+econ);
}
for(const d of ['normal','hard']){
 difficulty=d;S.reset();const state=S.state();state.live=true;state.aiDifficulty=d;
 S.aiInitialBuild();
 const rows=state.enemyBuilt.map((r,i)=>r!==null&&r!==8?i:-1).filter(i=>i>=0);
 assert.ok(rows.length>0,d+' AI builds paid factories');
 for(const slot of rows)near(state.enemyBuildReadyAt[slot],24,d+' initial build waits 24 seconds');
}
const multiContext={window:{},fetch:mockFetch,console,Math,Map,Set,Object,Array,Number,String,Date,JSON};
for(const name of ['unit-consolidation.js','defense-guardian.js','hard-ai.js','augment-rules.js'])
 vm.runInNewContext(read(name),multiContext,{filename:name});
await multiContext.window.DesertAugments.load();
const marker='return {state,order,tick,wave,snapshot,definition};';
const multiCode=read('tri-lane-engine.js').replace(marker,'return {state,order,tick,wave,snapshot,definition,__test:{hitFort}};');
assert.ok(multiCode.includes('__test:{hitFort}'));
vm.runInNewContext(multiCode,multiContext,{filename:'tri-lane-engine.js'});
const E=multiContext.window.DesertTriEngine;
assert.deepEqual(Array.from(E.COST).slice(0,8),expectedPrices,'standalone authoritative host and solo catalogue agree');
for(const ruleset of ['standard','augment'])for(const mode of ['pvp','classic']){
 const game=E.create({mode,size:1,ruleset,members:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:3}]});
 if(ruleset==='augment')for(const p of game.state.players)assert.equal(game.order(p.uid,{type:'augment_pick',slot:1}).ok,true);
 const p=game.state.players[0];p.cash=10000;
 for(let role=0;role<8;role++){
  const before=p.cash;assert.equal(game.order('a',{type:'build',lane:0,slot:role,role}).ok,true);
  assert.equal(p.cash,before-expectedPrices[role],ruleset+' '+mode+' actual payment');
  assert.equal(game.order('a',{type:'build',lane:0,slot:role,role:null}).ok,true);
  assert.equal(p.cash,before-expectedPrices[role]+Math.floor(expectedPrices[role]*.55),'actual-price host refund');
 }
}
for(const ruleset of ['standard','augment'])for(const mode of ['pvp','classic']){
 const match=E.create({mode,size:1,ruleset,members:[
  {uid:'a',team:0,faction:0},{uid:'b',team:1,faction:2}]});
 const p=match.state.players[0],st=match.state;
 if(ruleset==='augment')for(const owner of st.players)
  assert.equal(match.order(owner.uid,{type:'augment_pick',slot:1}).ok,true,'pick initial augment before building');
 const core=mode==='classic'?8640:3000;
 assert.equal(st.cores[0][0],core,ruleset+' '+mode+' core HP');
 assert.equal(match.order('a',{type:'build',lane:0,slot:0,role:0}).ok,true);
 assert.equal(p.buildingReadyAt[0][0],24);
 assert.equal(match.order('a',{type:'build',lane:0,slot:1,role:8}).ok,true);
 assert.equal(p.buildingReadyAt[0][1],24,'extractor has real construction time');
 assert.equal(p.ecoReadyAt,30,'construction is followed by stabilization');
 assert.equal(match.order('a',{type:'build',lane:0,slot:2,role:8}).ok,false,'cannot overlap income expansion');

 assert.equal(match.snapshot('a').players[0].buildingReadyAt[0][0],24,'owner sees build ETA');
 assert.equal(match.snapshot('b').players[0].buildingReadyAt[0][0],0,'enemy never sees private construction timer');
 st.seconds=23.9;match.wave();
 assert.equal(p.produced[0],0,ruleset+' '+mode+' no unfinished factory spawn');
 st.seconds=24;match.wave();
 assert.equal(p.produced[0],1,ruleset+' '+mode+' one actual soldier after build completion');
 const before=st.cores[0][1];match.__test.hitFort(0,1,1000,'core');
 near(st.cores[0][1],before-850,ruleset+' '+mode+' -15% core damage');
 p.eco=7;p.ecoReadyAt=0;p.cash=0;st.next=999999;
 st.seconds=100.3;match.tick(.2); // multiplayer clamps dt to .2 and income ticks at .5s boundaries
 near(p.cash,6.8,ruleset+' '+mode+' late income per half-second');
}
for(const ruleset of ['standard','augment'])for(const difficulty of ['normal','hard']){
 const game=E.create({mode:'coop',size:2,aiDifficulty:difficulty,ruleset,members:[
  {uid:'a',team:0,faction:0},{uid:'b',team:0,faction:1}]});
 const bots=game.state.players.filter(p=>p.bot);
 if(ruleset==='augment')for(const owner of game.state.players.filter(p=>!p.bot))
  assert.equal(game.order(owner.uid,{type:'augment_pick',slot:1}).ok,true);
 game.wave();if(difficulty==='hard')game.tick(.2);
 assert.ok(bots.some(p=>p.buildings.flat().some(r=>r!==null&&r!==8)),
  difficulty+' '+ruleset+' AI buys its own combat production');
 for(const bot of bots)for(let lane=0;lane<3;lane++)for(let slot=0;slot<75;slot++)
  if(bot.buildings[lane][slot]!==null&&bot.buildings[lane][slot]!==8)
   assert.ok(bot.buildingReadyAt[lane][slot]>=24,
    difficulty+' '+ruleset+' bot obeys the same 24-second construction');
}
console.log('50-wave rules passed: solo, classic, PvP, co-op, normal and hard AI, both rule sets; real 24s build, +20% core, -15% core damage, -15% income after level 4, protected build timer.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
