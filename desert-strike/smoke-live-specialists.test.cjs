'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {solo,multi}=require('./combat-balance-harness.cjs');
const X=require('./expansion/expansion-rules.js');

test('live sniper/assassin catalogue matches both engines for all ten factions',()=>{
 const {G}=solo(13),{E}=multi(13);
 assert.equal(X.liveEnabled,true);
 assert.equal(E.EXTRACTOR,8);
 assert.deepEqual(X.NAMES[3],['쾌흥태','견쌍섭']);
 assert.equal(G.getDef(9,3).unitName,'쾌흥태');
 assert.equal(G.getDef(10,3).unitName,'견쌍섭');
 assert.equal(E.definition(3,9).unitName,'쾌흥태');
 assert.equal(E.definition(3,10).unitName,'견쌍섭');
 assert.deepEqual([...E.COST].slice(8),[70,380,330]);
 for(let faction=0;faction<10;faction++)for(const role of [9,10]){
  const s=G.getDef(role,faction),m=E.definition(faction,role);
  for(const key of ['cost','hp','damage','armor','range','rate','speed','airTarget','kind'])
   assert.ok(Object.is(s[key],m[key]),faction+' '+role+' '+key+' '+s[key]+' vs '+m[key]);
  assert.ok(Number.isFinite(s.damage)&&s.hp>0&&s.cost>0);
  assert.equal(s.unitName,X.NAMES[faction][role-9]);
 }
});

test('solo army roster keeps specialist portraits still while combat retains animated strips',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const game=fs.readFileSync(path.join(__dirname,'game-v2.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'style-v2.css'),'utf8');
 const art=fs.readFileSync(path.join(__dirname,'expansion/expansion-art.js'),'utf8');
 assert.ok(!game.includes('-preview.png'),'animated APNG previews must not autoplay in formation cards');
 assert.ok(game.includes('specialist-static-preview'));
 assert.ok(game.includes("+'.webp)"));
 assert.ok(css.includes('.unit-card .specialist-static-preview{'));
 assert.ok(css.includes('background-size:800% 100%'));
 assert.ok(art.includes('const poses={idle:[0,1]'),'battle animation strips must remain present');
});

test('stealth is visible, non-targetable outside detection, exposed while attacking and defeated by a living detector',()=>{
 const knife={id:10,team:1,role:10,x:201,y:0,hp:100},rifle={id:1,team:0,role:1,x:0,y:0,hp:100},medic={id:7,team:0,role:7,x:10,y:0,hp:100};
 const units=[knife,rifle,medic];
 assert.equal(X.canTarget(rifle,knife,units,0),false);
 assert.equal(X.presentation(knife,units,0).label,'은신!');
 assert.equal(X.presentation(knife,units,0).visible,true);
 medic.x=11;
 assert.equal(X.canTarget(rifle,knife,units,0),true);
 assert.equal(X.presentation(medic,units,0).detectionRadius,190);
 medic.hp=0;
 assert.equal(X.canTarget(rifle,knife,units,0),false);
 X.revealOnAttack(knife,2);
 assert.equal(X.canTarget(rifle,knife,units,2.5),true);
 assert.equal(X.canTarget(rifle,knife,units,3.1),false);
});

test('paid specialist factories deploy in real solo and authoritative multiplayer waves',()=>{
 const {G}=solo(21),s=G.state();s.live=true;s.cash=10000;s.aiNextThink=Infinity;s.next=0;
 G.selectRole(9);G.place(0);G.selectRole(10);G.place(1);
 assert.equal(s.built[0],9);assert.equal(s.built[1],10);
 s.elapsed=10;G.tick(.02);
 assert.ok(s.units.some(u=>u.side===0&&u.role===9));
 assert.ok(s.units.some(u=>u.side===0&&u.role===10));
 assert.equal(s.produced[0][9],1);assert.equal(s.produced[0][10],1);
 const {E}=multi(21);
 const m=E.create({mode:'classic',size:1,members:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:1}]});
 const p=m.state.players[0];p.cash=10000;
 assert.equal(m.order('a',{type:'build',lane:0,slot:0,role:9}).ok,true);
 assert.equal(m.order('a',{type:'build',lane:0,slot:1,role:10}).ok,true);
 m.state.seconds=10;m.wave();
 assert.equal(p.produced[9],1);assert.equal(p.produced[10],1);
 assert.ok(m.state.units.some(u=>u.uid==='a'&&u.role===9));
 assert.ok(m.state.units.some(u=>u.uid==='a'&&u.role===10));
});

test('authoritative host reports stealth and detection status to both multiplayer viewers without hiding assassins as a role',()=>{
 const {E}=multi(39);
 const m=E.create({mode:'classic',size:1,members:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:1}]});
 m.state.players[0].cash=10000;m.state.players[1].cash=10000;
 assert.equal(m.order('a',{type:'build',lane:0,slot:0,role:7}).ok,true);
 assert.equal(m.order('b',{type:'build',lane:0,slot:0,role:10}).ok,true);
 m.state.seconds=10;m.wave();m.state.wave=6;
 const defender=m.state.units.find(u=>u.role===7),knife=m.state.units.find(u=>u.role===10);
 assert.ok(defender&&knife);
 knife.x=1600;knife.y=260;defender.x=1000;defender.y=260;
 let seen=m.snapshot('a').units.find(u=>u.role===10);
 assert.ok(seen&&seen.visible&&seen.opacity<1&&seen.label==='은신!');
 defender.x=knife.x+150;
 seen=m.snapshot('b').units.find(u=>u.role===10);
 assert.equal(seen.label,'탐지됨');assert.equal(seen.opacity,1);
 assert.equal(m.snapshot('a').units.find(u=>u.role===7).label,'디텍팅!');
});

test('all five co-op AI difficulties purchase specialist factories and keep anti-assassin detectors',()=>{
 const {E}=multi(55);
 for(const difficulty of ['easy','normal','hard','veryhard','impossible']){
  const m=E.create({mode:'coop',size:2,members:[{uid:'human-a',team:0,faction:0},{uid:'human-b',team:0,faction:1}],aiDifficulty:difficulty});
  m.state.wave=17;m.state.seconds=200; // even wave: beginner AI intentionally skips odd-wave purchases
  for(const bot of m.state.players.filter(p=>p.bot)){
   bot.cash=100000;bot.ecoReadyAt=Infinity;
   for(let lane=0;lane<m.state.lanes;lane++)for(let i=0;i<4;i++)bot.buildings[lane][i]=[0,1,3,5][i];
  }
  m.wave();
  for(const bot of m.state.players.filter(p=>p.bot)){
   const buildings=bot.buildings.flat();
   assert.ok(buildings.includes(9),difficulty+' AI must field sniper');
   assert.ok(buildings.includes(10),difficulty+' AI must field assassin');
   assert.ok(bot.cash<100000&&bot.cash>=0,difficulty+' must pay for its purchases');
  }
 }
});

test('high-difficulty AI reacts immediately to observed assassins by budgeting for support detection',()=>{
 const {window}=solo(77),ai=window.DesertHardAI;
 for(const difficulty of ['veryhard','impossible']){
  const brain=ai.create(0,()=>0),counts=Array(11).fill(0),roles=Array(11).fill(0);
  counts[0]=5;counts[1]=5;roles[10]=2;
  const response=ai.response(brain,{counts,intel:{roles,investment:roles.map(n=>n*330)},difficulty});
  assert.equal(response.needed,true);assert.equal(response.role,7);assert.equal(response.stealthThreat,true);
 }
});
