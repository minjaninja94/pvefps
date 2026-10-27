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
const win={};vm.runInNewContext(src,{window:win,Math:random,Array,Number,Object,Map,Set,console},{timeout:10000});
const E=win.DesertTriEngine;
assert.equal(E.WIDTH*E.HEIGHT,3300*520*3,'triple area from the one-lane world');
assert.equal(E.LANES,3);assert.equal(E.SLOTS,75);
function human(n,team=0,faction=0){return {uid:'P'+n,name:'지휘관'+n,team,faction};}
for(const size of [1,2,3]){
 const players=Array.from({length:size},(_,i)=>human(i,0,i%6)).concat(Array.from({length:size},(_,i)=>human(i+size,1,(i+size)%6)));
 const match=E.create({mode:'pvp',size,members:players});
 assert.equal(match.state.players.length,size*2,'human team count');
 assert.equal(match.state.players.filter(p=>p.bot).length,0,'PvP may not add bots');
 assert.equal(match.state.players[0].buildings.length,3);
 assert.equal(match.state.players[0].buildings.reduce((n,a)=>n+a.length,0),225,'225 build locations per commander');
 assert.equal(match.state.cores.length,3,'three independent lines');
 for(let i=0;i<3;i++)assert.deepEqual([...match.state.cores[i]],[2500,2500]);
 assert.deepEqual(match.order('hacker',{type:'build',lane:0,slot:0,role:0}).ok,false);
 assert.equal(match.order('P0',{type:'build',lane:0,slot:0,role:0}).ok,true);
 assert.equal(match.state.players[0].cash,295,'65 CR real purchase');
 assert.equal(match.order('P0',{type:'build',lane:1,slot:0,role:1}).ok,true);
 assert.equal(match.state.players[0].cash,200,'95 CR in another lane costs independently');
 assert.equal(match.state.players[1].cash,360,'teammate money is never debited');
 assert.equal(match.order('P0',{type:'build',lane:0,slot:0,role:null}).ok,true);
 assert.equal(match.state.players[0].cash,235,'demolition refunds 55% rounded down');
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
 const humans=Array.from({length:size},(_,i)=>human(i,0,(i+3)%6));
 const match=E.create({mode:'coop',size,members:humans});
 assert.equal(match.state.players.filter(p=>p.bot).length,size,'AI opponent count matches human squad size');
 for(const p of humans)for(let line=0;line<3;line++)assert.equal(match.order(p.uid,{type:'build',lane:line,slot:line,role:0}).ok,true);
 for(let i=0;i<125;i++)match.tick(.2);
 assert.ok(match.state.wave>=1);
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
 m.wave();
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
