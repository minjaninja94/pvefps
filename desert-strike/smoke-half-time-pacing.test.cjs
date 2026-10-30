'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const read=f=>fs.readFileSync(path.join(process.env.DESERT_ENGINE_SOURCE_DIR&&['game-v2.js','tri-lane-engine.js'].includes(f)?process.env.DESERT_ENGINE_SOURCE_DIR:__dirname,f),'utf8');
const noop=()=>{},g=new Proxy({createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});
const els=new Map();function el(id){if(!els.has(id))els.set(id,{style:{},dataset:{},hidden:false,textContent:'',innerHTML:'',classList:{add:noop,remove:noop,toggle:noop},getContext:()=>g,addEventListener:noop,setAttribute:noop,removeAttribute:noop});return els.get(id);}
const w={DesertHardAI:require('./hard-ai.js')},env={window:w,document:{getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({getContext:()=>g})},requestAnimationFrame:noop,Math,Map,Set,Array,Object,Number,String,Date,console};
vm.runInNewContext(read('game-v2.js').replace('initFactions();wire();reset();','window.pacing={reset,state:()=>state,tick,wave,selectRole,place,aiInitialBuild,ecoBuildSeconds,ecoStabilize,getDef,INTERVAL,FACTORY_BUILD_SECONDS};reset();'),env);
const S=w.pacing,m={DesertHardAI:require('./hard-ai.js')};vm.runInNewContext(read('tri-lane-engine.js'),{window:m,Math,Map,Set,Array,Object,Number,String,console});const E=m.DesertTriEngine;
const fields=['hp','damage','armor','range','rate','speed','heal','blast','kind','airTarget'];
function fingerprint(def){const rows=[];for(let f=0;f<10;f++)for(let r=0;r<8;r++){const d=def(f,r);rows.push(fields.map(k=>d[k]??0));}return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');}
const hashes={solo:fingerprint((f,r)=>S.getDef(r,f)),multi:fingerprint(E.definition)};
if(process.argv.includes('--print-spec-hashes')){console.log(JSON.stringify(hashes));process.exit(0);}
for(let faction=0;faction<10;faction++)for(let role=0;role<8;role++){
 const a=S.getDef(role,faction),b=E.definition(faction,role);
 for(const field of fields){const left=a[field]??0,right=b[field]??0;
  if(typeof left==='number')assert.ok(Math.abs(left-right)<1e-7,'solo/multiplayer definition parity '+faction+'/'+role+' '+field);
  else assert.equal(left,right,'solo/multiplayer definition parity '+field);
 }
}
assert.equal(S.INTERVAL,12);assert.equal(S.FACTORY_BUILD_SECONDS,12);assert.equal(E.WAVE_INTERVAL,12);assert.equal(E.FACTORY_BUILD_SECONDS,12);
for(let level=1;level<=7;level++)for(const seconds of [0,119,120,239,240,719,720,1200]){
 const build=12+4*(level-1),stable=(4+2*level+Math.min(6,Math.floor(seconds/120)))/2;
 assert.equal(S.ecoBuildSeconds(level),build);assert.equal(E.ecoBuildSeconds(level),build);
 assert.equal(S.ecoStabilize(level,seconds),stable);assert.equal(E.ecoStabilize(level,seconds),stable);
}
function advance(game,seconds,step=.1){let left=seconds;while(left>1e-8){const dt=Math.min(left,step);game.tick(dt);left-=dt;}}
S.reset();let st=S.state();Object.assign(st,{live:true,aiNextThink:Infinity});S.selectRole(0);S.place(0);
assert.equal(st.next,10);advance(S,9.9);assert.equal(st.wave,0);assert.equal(st.produced[0][0],0);
advance(S,.2);assert.equal(st.wave,1);assert.equal(st.produced[0][0],1);
advance(S,12);assert.equal(st.wave,2);assert.equal(st.produced[0][0],2,'same building repeats every 12s');
// Baseline +1 CR passive income and per-wave grants remain unchanged; mining steps have diminishing marginal returns.
assert.ok(Math.abs(st.cash-(295+44+48))<1e-6,'22s passive 44 CR + two 24-CR wave grants');
S.reset();st=S.state();Object.assign(st,{live:true,aiNextThink:Infinity});S.selectRole(8);S.place(0);st.paused=true;
assert.equal(st.ecoReadyAt,15);advance(S,5);assert.equal(st.elapsed,0,'pause does not burn the construction/blackout clock');
st.paused=false;advance(S,14.9);assert.equal(st.cash,290);advance(S,.2);assert.ok(Math.abs(st.cash-292.2)<1e-6,'level-one +2.2 CR resumes without catch-up after blackout');
for(const mode of ['classic','pvp','coop'])for(const difficulty of ['normal','hard']){
 const members=mode==='coop'?[{uid:'a',team:0,faction:0},{uid:'ally',team:0,faction:2}]:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:1}];
 const game=E.create({mode,size:mode==='coop'?2:1,aiDifficulty:difficulty,members}),p=game.state.players[0];
 assert.equal(game.order('a',{type:'build',lane:0,slot:0,role:0}).ok,true);
 advance(game,9.9);assert.equal(game.state.wave,0);assert.equal(p.produced[0],0);
 advance(game,.2);assert.equal(game.state.wave,1);assert.equal(p.produced[0],1);
 advance(game,12);assert.equal(game.state.wave,2);assert.equal(p.produced[0],2);
 assert.ok(Math.abs(p.cash-(295+44+48))<1e-6,'owner income/grants are unchanged');
}
// Staggered support must finish inside one new 12s wave in both engines.
S.reset();st=S.state();Object.assign(st,{live:true,faction:3,aiNextThink:Infinity,next:10});S.selectRole(7);S.place(0);
advance(S,10.01);assert.equal(st.marineStats.huangSpawns,1);advance(S,4);assert.equal(st.marineStats.huangSpawns,2);
advance(S,4);assert.equal(st.marineStats.huangSpawns,3);advance(S,3);assert.equal(st.marineStats.huangSpawns,3);
const marine=E.create({mode:'classic',size:1,members:[{uid:'a',team:0,faction:3},{uid:'b',team:1,faction:0}]});
marine.order('a',{type:'build',lane:0,slot:0,role:7});advance(marine,10.01);assert.equal(marine.state.marineStats.huangSpawns,1);
advance(marine,4);assert.equal(marine.state.marineStats.huangSpawns,2);advance(marine,4);assert.equal(marine.state.marineStats.huangSpawns,3);
// A person placing at 9.8s must join the same first wave as an AI opening at 0s.
for(const difficulty of ['normal','hard']){
 S.reset();const state=S.state();Object.assign(state,{live:true,aiDifficulty:difficulty,aiNextThink:Infinity});
 S.aiInitialBuild();state.aiNextThink=Infinity;
 const botSlots=state.enemyBuilt.map((r,i)=>r!==null&&r!==8?i:-1).filter(i=>i>=0);
 assert.ok(botSlots.length>0);for(const slot of botSlots)assert.equal(state.enemyBuildReadyAt[slot],10);
 advance(S,9.8);S.selectRole(0);S.place(0);
 assert.equal(state.buildReadyAt[0],10,'late initial placement is ready for first departure');
 assert.equal(els.get('soloBattleOpening').hidden,false);assert.equal(els.get('soloBaseOpeningSeconds').textContent,'1');
 advance(S,.1);assert.equal(state.wave,0);assert.equal(state.units.length,0);
 advance(S,.2);assert.equal(state.wave,1);assert.equal(state.produced[0][0],1);
 assert.ok(state.produced[1].reduce((a,b)=>a+b,0)>0,'AI joins the same wave');
 assert.equal(els.get('soloBattleOpening').hidden,true);
 S.selectRole(1);S.place(1);assert.ok(Math.abs(state.buildReadyAt[1]-state.elapsed-12)<1e-6,'normal 12s builds resume after preparation');
}
for(const mode of ['classic','pvp','coop']){
 const members=mode==='coop'?[{uid:'a',team:0,faction:0},{uid:'ally',team:0,faction:2}]:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:1}];
 const game=E.create({mode,size:mode==='coop'?2:1,members}),p=game.state.players[0];
 assert.equal(game.snapshot('a').preparationEndsAt,10,'guest receives authoritative preparation end');
 if(mode!=='coop')assert.equal(game.order('b',{type:'build',lane:0,slot:0,role:0}).ok,true);
 advance(game,9.8);assert.equal(game.order('a',{type:'build',lane:0,slot:0,role:0}).ok,true);
 assert.equal(p.buildingReadyAt[0][0],10);advance(game,.1);assert.equal(game.state.units.length,0);
 advance(game,.2);assert.equal(game.state.wave,1);assert.equal(p.produced[0],1);
 assert.ok(game.state.players.some(owner=>owner.team===1&&owner.produced.reduce((a,b)=>a+b,0)>0));
 assert.equal(game.order('a',{type:'build',lane:0,slot:1,role:1}).ok,true);
 assert.ok(Math.abs(p.buildingReadyAt[0][1]-game.state.seconds-12)<1e-6);
}
console.log('Half-time pacing passed: 80 unchanged unit definitions per engine, 10s shared preparation, delayed-human first-wave parity, 12s subsequent waves/factories, all 7 extractor timers halved, unchanged passive/stipend income, pause/blackout boundaries, solo/classic/PvP/coop/AI, 0/4/8s support.');
