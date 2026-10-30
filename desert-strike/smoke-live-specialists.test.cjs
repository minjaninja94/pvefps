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

test('sniper shows a real armor matchup without falsely claiming airborne role-six weakness',()=>{
 const {G}=solo(91),{E}=multi(91);
 for(let f=0;f<10;f++){
  assert.deepEqual(Array.from(G.getDef(9,f).good),[3]);
  assert.deepEqual(Array.from(E.definition(f,9).good),[3]);
 }
 const sniper={role:9},armor={role:3,kind:'ground'},groundSpecial={role:6,kind:'ground'},airSpecial={role:6,kind:'air'};
 assert.equal(X.precisionMultiplier(sniper,armor),1.6);
 assert.equal(X.precisionMultiplier(sniper,groundSpecial),1.6);
 assert.equal(X.precisionMultiplier(sniper,airSpecial),1);
 assert.equal(E.matchupMultiplier(E.definition(0,9),armor,30),1.65);
 assert.equal(X.plannedSpecialist(Array(11).fill(0),7,6),9);
});

test('solo AI saves real credits for sniper and assassin instead of buying cheap fillers',()=>{
 const {G}=solo(92),s=G.state();s.aiDifficulty='normal';s.wave=8;s.elapsed=120;s.enemyEco=7;
 s.enemyBuilt=Array(75).fill(null);for(let i=0;i<8;i++)s.enemyBuilt[i]=[0,1,0,1,2,3,5,7][i];
 s.enemyCash=130;G.aiInvest();
 assert.equal(s.enemyBuilt.filter(r=>r===9).length,0);
 assert.equal(s.enemyCash,130,'bank stays untouched for the planned sniper');
 s.enemyCash=380;G.aiInvest();
 assert.equal(s.enemyBuilt.filter(r=>r===9).length,1);
 assert.equal(s.enemyCash,0,'sniper costs its full 380 CR');
 s.wave=11;s.elapsed=160;s.enemyCash=330;G.aiInvest();
 assert.equal(s.enemyBuilt.filter(r=>r===10).length,1);
 assert.equal(s.enemyCash,0,'assassin costs its full 330 CR');
});

test('multiplayer regular bots bank paid specialist costs under realistic limited budgets',()=>{
 const {E}=multi(93);
 const m=E.create({mode:'coop',size:2,members:[{uid:'h1',team:0,faction:0},{uid:'h2',team:0,faction:1}],aiDifficulty:'normal'});
 const bot=m.state.players.find(p=>p.bot);assert.ok(bot);
 for(let i=0;i<8;i++)bot.buildings[Math.floor(i/3)][i%3]=[0,1,0,1,2,3,5,7][i];
 m.state.wave=6;m.state.seconds=100;bot.cash=120;
 m.wave();
 assert.equal(bot.buildings.flat().filter(r=>r===9).length,0);
 assert.equal(bot.cash,144,'bot saves 120 CR plus the earned 24 CR wave stipend');
 bot.cash=356;m.wave();
 assert.equal(bot.buildings.flat().filter(r=>r===9).length,1);
 assert.equal(bot.cash,0,'only the earned 380 CR pays for sniper');
 m.state.wave=9;bot.cash=306;m.wave();
 assert.equal(bot.buildings.flat().filter(r=>r===10).length,1);
 assert.equal(bot.cash,0,'only the earned 330 CR pays for assassin');
});

test('high-difficulty AI reserves scarce credits for scheduled specialists',()=>{
 const {window}=solo(94),ai=window.DesertHardAI,brain=ai.create(0,()=>0);
 brain.opening=ai.plans[brain.plan].opening.length;
 const costs=[65,100,185,285,185,360,300,220,Infinity,380,330];
 const counts=Array(11).fill(0);counts[0]=3;counts[1]=3;counts[2]=1;counts[3]=1;
 const intel={roles:Array(11).fill(0),air:0,armor:0,invaded:false};
 const args={counts,eco:7,readyAt:Infinity,seconds:120,wave:8,difficulty:'veryhard',costs,ecoCost:1000,intel};
 assert.equal(ai.choose(brain,{...args,cash:150}),null,'wait for the real 380 CR');
 assert.equal(ai.choose(brain,{...args,cash:380}).role,9);
 counts[9]=1;
 assert.equal(ai.choose(brain,{...args,wave:11,cash:170}),null,'wait for the real 330 CR');
 assert.equal(ai.choose(brain,{...args,wave:11,cash:330}).role,10);
});

test('specialist audio uses Japanese VOICEVOX Nemo atlases without browser TTS',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'combat-audio.js'),'utf8');
 assert.doesNotMatch(src,/speechSynthesis|SpeechSynthesisUtterance|speakSpecial/);
 assert.match(src,/role<0 \|\| role>10/,'sniper and assassin voices are accepted');
 assert.match(src,/spec-f\\d\+/,'generated Nemo specialist audio can be decoded');
 assert.match(src,/backupRole=role===9\?2:role===10\?0:role/,'ship existing Nemo Japanese voices before new assets are ready');
 const generator=fs.readFileSync(path.join(__dirname,'tools/generate-nemo-specialists.py'),'utf8');
 assert.match(generator,/voice_index\.json/);
 assert.match(generator,/spec-f\{faction\}\.ogg/);
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
