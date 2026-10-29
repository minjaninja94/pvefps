'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'tri-lane-engine.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'style-v2.css'),'utf8');
const network=fs.readFileSync(path.join(__dirname,'tri-lane-network.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'tri-lane-ui.js'),'utf8');
const root=fs.readFileSync(path.join(__dirname,'..','firestore.rules'),'utf8');
assert.match(html,/id="productionMinimap"/);assert.match(html,/id="productionFrontStatus"/);
for(const id of ['mpBattleCanvas','mpLaneTabs','mpBuildGrid','mpCreate','mpJoin','mpReady','mpLaunch','mpLeave','mpPractice','mpCommand','mpMode','mpSize','mpFaction','mpTeam'])assert.ok(html.includes('id="'+id+'"'),'missing '+id);
assert.ok(html.indexOf('tri-lane-engine.js')<html.indexOf('tri-lane-network.js')&&html.indexOf('tri-lane-network.js')<html.indexOf('tri-lane-ui.js'),'deferred modules load in dependency order');
assert.ok(html.includes('../firebase-config.js')&&html.includes('../firebase-network.js'),'reuse existing Firebase installation');
assert.match(css,/\.mp-build-grid/);assert.match(root,/match \/desertRooms\/\{roomId\}/);
assert.match(network,/RTCPeerConnection/);assert.match(network,/fs\.runTransaction/);
assert.ok(!network.includes("setDoc(path(),{units"),'no per-frame units in Firestore');
let seed=17;const random=Object.create(Math);
random.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let forceMarineRoll=null;
random.random=()=>forceMarineRoll===null?((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296):forceMarineRoll;
const win={DesertGuardian:require('./defense-guardian.js'),DesertConsolidation:require('./unit-consolidation.js')};vm.runInNewContext(src,{window:win,Math:random,Array,Number,Object,Map,Set,console},{timeout:10000});
const E=win.DesertTriEngine;
assert.equal(E.WIDTH*E.HEIGHT,3300*520*3,'triple area from the one-lane world');
assert.equal(E.LANES,3);assert.equal(E.SLOTS,75);
assert.equal(E.create({mode:'pvp',size:1,members:[{uid:'A',team:0,faction:0},{uid:'B',team:1,faction:1}]}).state.turrets.length,3,'each of the three lanes must have independent defensive towers');
{
 const isolated=E.create({mode:'pvp',size:1,members:[{uid:'verify0',team:0,faction:3},{uid:'verify1',team:1,faction:5}]});
 assert.equal(isolated.definition(3,6).hp,565,'isolated multiplayer Marine truck must match single-player HP');
 assert.equal(isolated.definition(3,6).kind,'ground');
 assert.equal(isolated.definition(4,6).kind,'ground');
 assert.equal(isolated.definition(5,6).kind,'air');
 assert.ok(isolated.definition(5,1).range>isolated.definition(0,1).range);
 assert.ok(isolated.definition(1,0).hp>isolated.definition(5,0).hp);
}
function human(n,team=0,faction=0){return {uid:'P'+n,name:'지휘관'+n,team,faction};}
for(const size of [1,2,3]){
 const players=Array.from({length:size},(_,i)=>human(i,0,i%9)).concat(Array.from({length:size},(_,i)=>human(i+size,1,(i+size)%6)));
 const match=E.create({mode:'pvp',size,members:players});
 assert.equal(match.state.players.length,size*2,'human team count');
 assert.equal(match.state.players.filter(p=>p.bot).length,0,'PvP may not add bots');
 assert.equal(match.state.players[0].buildings.length,3);
 assert.equal(match.state.players[0].buildings.reduce((n,a)=>n+a.length,0),225,'225 build locations per commander');
 assert.equal(match.state.cores.length,3,'three independent lines');
 for(let i=0;i<3;i++)assert.deepEqual([...match.state.cores[i]],[3000,3000]);
 assert.deepEqual(match.order('hacker',{type:'build',lane:0,slot:0,role:0}).ok,false);
 assert.equal(match.order('P0',{type:'build',lane:0,slot:0,role:0}).ok,true);
 assert.equal(match.state.players[0].cash,295,'65 CR real purchase');
 assert.equal(match.order('P0',{type:'build',lane:1,slot:0,role:1}).ok,true);
 assert.equal(match.state.players[0].cash,360-E.COST[0]-E.COST[1],'current rifle price in another lane costs independently');
 assert.equal(match.state.players[1].cash,360,'teammate money is never debited');
 assert.equal(match.order('P0',{type:'build',lane:0,slot:0,role:null}).ok,true);
 assert.equal(match.state.players[0].cash,360-E.COST[0]-E.COST[1]+Math.floor(E.COST[0]*.55),'demolition refunds 55% rounded down');
 assert.equal(match.state.players[0].buildings[0][0],null);
 assert.equal(match.order('P0',{type:'build',lane:3,slot:0,role:0}).ok,false);
 assert.equal(match.order('P0',{type:'build',lane:1,slot:75,role:0}).ok,false);
 assert.equal(match.order('P0',{type:'build',lane:0,slot:0,role:99}).ok,false);
 const cash1=match.state.players[0].cash;
 match.tick(1); // max 0.2 seconds per authoritative step
 assert.equal(match.state.players[0].cash,cash1);
 for(let i=0;i<124;i++)match.tick(.2);
 assert.ok(match.state.wave>=1,'24 sec deploy wave');
 const own=match.state.units.filter(u=>u.team===0&&u.uid==='P0');
 assert.ok(own.some(u=>u.lane===1),'line-2 production deploys only into that lane');
 assert.ok(own.every(u=>u.lane===1),'no cross-line spawning');
 assert.ok(own.every(u=>u.y>=520&&u.y<1040),'physical middle lane range');
 const packet=JSON.parse(JSON.stringify(match.snapshot()));
 assert.equal(packet.height,1560);assert.equal(packet.players.length,size*2);
 assert.equal(packet.players[0].buildings[1][0],1);
 console.log(size+'v'+size+' construction/credit/spawn passed');
}
for(const size of [2,3]){
 const humans=Array.from({length:size},(_,i)=>human(i,0,(i+3)%9));
 const match=E.create({mode:'coop',size,members:humans});
 assert.equal(match.state.players.filter(p=>p.bot).length,size,'AI opponent count matches human squad size');
 for(const p of humans)for(let line=0;line<3;line++)assert.equal(match.order(p.uid,{type:'build',lane:line,slot:line,role:0}).ok,true);
 for(let i=0;i<245;i++)match.tick(.2); // wave 2: AI factories bought at wave 1 finish after 24 seconds
 assert.ok(match.state.wave>=2);
 assert.ok(match.state.units.some(u=>u.team===0&&u.lane===0));
 assert.ok(match.state.units.some(u=>u.team===0&&u.lane===1));
 assert.ok(match.state.units.some(u=>u.team===0&&u.lane===2));
 assert.ok(match.state.units.some(u=>u.team===1),'actual AI production started');
 for(const bot of match.state.players.filter(p=>p.bot))assert.ok(bot.cash>=0,'bot purchases pay credits');
 console.log('coop '+size+' humans vs '+size+' AI passed');
}
assert.throws(()=>E.create({mode:'coop',size:1,members:[human(0)]}));
assert.throws(()=>E.create({mode:'pvp',size:3,members:[human(0),human(1)]}));
assert.throws(()=>E.create({mode:'pvp',size:2,members:[human(0),human(0),human(1,1),human(2,1)]}));
// Physical collision and independent lane targeting using test-only controlled spawn.
{
 const m=E.create({mode:'pvp',size:1,members:[human(0),human(1,1)]});
 for(const lane of [0,1,2]){
  assert.ok(m.order('P0',{type:'build',lane,slot:0,role:0}).ok);
  assert.ok(m.order('P1',{type:'build',lane,slot:0,role:0}).ok);
 }
 m.state.seconds=24;m.wave(); // production is active at the first valid wave
 assert.equal(m.state.units.length,6);
 const a=m.state.units.filter(u=>u.lane===0),b=m.state.units.filter(u=>u.lane===2);
 for(const u of a){u.x=1500;u.y=250;u.cool=0;}
 for(const u of b){u.x=1500;u.y=1290;u.cool=0;}
 m.tick(.15);
 assert.ok(Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)>1,'combatants physically separate');
 assert.ok(b.every(u=>u.y>1040),'lane three units do not drift to lane one');
 assert.ok(m.state.units.every(u=>u.hp<=u.maxHP),'health bounds');
}
console.log('3x-area real-combat test passed: 1v1,2v2,3v3 and 2/3-player coop, credits, refunds, all three lanes and collisions');

// Marine one-facility: 0s/8s/16s waves, resource theft + critically wounded allegiance flip.
{
 const m=E.create({mode:'pvp',size:1,members:[human(0,0,3),human(1,1,0)]});
 assert.ok(m.order('P0',{type:'build',lane:0,slot:1,role:7}).ok);
 m.state.seconds=24;m.wave();
 assert.equal(m.state.marineStats.huangSpawns,1);
 assert.equal(m.state.marineSupports.length,2);
 for(let i=0;i<40;i++)m.tick(.2);
 assert.equal(m.state.marineStats.huangSpawns,2,'second troop after 8s');
 for(let i=0;i<40;i++)m.tick(.2);
 assert.equal(m.state.marineStats.huangSpawns,3,'third troop after 16s');
 const killer=m.state.players[0],victim=m.state.players[1];
 assert.ok(m.order('P0',{type:'build',lane:0,slot:2,role:1}).ok);
 assert.ok(m.order('P1',{type:'build',lane:0,slot:2,role:3}).ok);
 m.state.seconds+=24;m.wave();
 const marine=m.state.units.find(u=>u.uid==='P0'&&u.role===1);
 const enemy=m.state.units.find(u=>u.uid==='P1'&&u.role===3);
 assert.ok(marine&&enemy);
 // Keep combat actors at touching distance and lock out other damage sources.
 marine.x=enemy.x=1500;marine.y=enemy.y=250;marine.cool=0;
 enemy.hp=1;enemy.cool=99999;
 const initialCash=killer.cash,initialEnemyCash=victim.cash;
 forceMarineRoll=0;
 for(let i=0;i<8&&enemy.hp>0;i++)m.tick(.2);
 forceMarineRoll=null;
 assert.ok(enemy.hp<=0,'Marine attack actually kills');
 assert.ok(killer.cash>initialCash&&victim.cash<initialEnemyCash,'kill steals real opponent resources');
 const recruited=m.state.units.find(u=>u.conscripted&&u.uid==='P0'&&u.role===3);
 assert.ok(recruited&&recruited.team===0&&recruited.faction===0&&recruited.hp>0,'captured tank belongs to marine player');
 assert.ok(recruited.hp<=recruited.maxHP*.101,'converted enemy barely survives');
}

// Per-viewer fog is applied before network transmission, and each lane can be scouted independently.
{
 const match=E.create({mode:'pvp',size:1,members:[human(0,0,0),human(1,1,1)]});
 assert.equal(match.snapshot('P0').fog[0],true,'own player has fog on enemy base');
 assert.equal(match.snapshot('P1').fog[0],true,'other team receives mirrored fog');
 assert.equal(match.snapshot('P0').players[1].cash,null,'no opponent economy leakage');
 assert.equal(match.snapshot('P0').players[1].buildings[0].length,75);
 assert.ok(match.snapshot('P0').players[1].buildings[0].every(role=>role===null));
 assert.ok(match.order('P1',{type:'build',lane:0,slot:5,role:6}).ok);
 assert.equal(match.snapshot('P0').players[1].buildings[0][5],null,'hidden construction never reaches guest snapshot');
 match.state.seconds=24;match.wave();
 assert.equal(match.snapshot('P0').units.some(u=>u.team===1&&u.role===6),false,'reinforcements in enemy spawn are hidden');
 const spy=match.state.units.find(u=>u.team===1&&u.role===6);
 const scout=match.state.players[0];assert.ok(match.order('P0',{type:'build',lane:0,slot:0,role:1}).ok);
 match.state.seconds+=24;match.wave();
 const our=match.state.units.find(u=>u.team===0&&u.role===1);
 our.x=2600;
 assert.equal(match.snapshot('P0').fog[0],false);
 assert.equal(match.snapshot('P0').players[1].buildings[0][5],6,'scout reveals enemy production');
 assert.equal(match.snapshot('P0').fog[1],true,'other lanes stay concealed');
 // Lone air raider cannot completely ignore home turret.
 our.hp=0;spy.x=330;spy.y=260;spy.hp=spy.maxHP;spy.cool=99;
 const oldHP=spy.hp;
 for(let i=0;i<6;i++)match.tick(.2);
 assert.ok(spy.hp<oldHP,'defensive tower directly attacks an airborne target');
 assert.ok(match.state.turrets.every(l=>l.length===2&&l.every(h=>h>=0&&h<=1250)));
}
console.log('3-lane fog packet redaction, independent scouting and anti-air towers passed.');

for(const mode of ['pvp','classic','coop']){
 const m=E.create({mode,size:mode==='coop'?2:1,members:mode==='coop'?
  [human(0,0,0),human(1,0,2)]:
  [human(0,0,0),human(1,1,1)]});
 for(const waveNumber of [22,40,41,100]){
  m.state.wave=waveNumber-1;
  m.wave();
  assert.equal(m.state.wave,waveNumber,mode+' keeps spawning wave '+waveNumber);
  assert.equal(m.state.ended,false,mode+' does not automatically finish at wave '+waveNumber);
  assert.equal(m.state.winner,null,mode+' has no wave-count winner');
 }
 // Losing cores, not the elapsed duration or wave number, determines the outcome.
 const required=m.state.lanes===1?1:2;
 for(let lane=0;lane<required;lane++)m.state.cores[lane][1]=0;
 m.tick(.1);
 assert.equal(m.state.ended,true,mode+' ends when the opponent cores fall');
 assert.equal(m.state.winner,0,mode+' awards a victory for destroying the cores');
}
console.log('Classic 1v1, 3-lane PvP and coop wave 22/40/41/100 and core-only victory passed.');

