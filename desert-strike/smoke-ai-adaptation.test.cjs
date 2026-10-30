'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {solo,multi}=require('./combat-balance-harness.cjs'),AI=require('./hard-ai.js');
const costs=[65,100,185,285,185,360,300,220];
test('impossible covers more of a scouted threat while retaining a mixed army budget',()=>{
 const counts=[0,4,4,2,0,0,0,0],intel={roles:[0,0,0,0,12,0,0,0]};
 assert.equal(AI.response(AI.create(0),{counts,intel,difficulty:'veryhard'}).needed,false);
 assert.equal(AI.response(AI.create(0),{counts,intel,difficulty:'impossible'}).needed,true);
 assert.equal(AI.response(AI.create(0),{counts,intel:{roles:[]},difficulty:'impossible'}).needed,false,'no unseen enemy information');
});
for(const difficulty of ['veryhard','impossible'])test(difficulty+' buys counters instead of more aircraft into scouted anti-air',()=>{
 const source=fs.readFileSync(__dirname+'/game-v2.js','utf8').replace('initFactions();wire();reset();','window.probe={hardInvest};initFactions();wire();reset();');
 const {G,window:w}=solo(1,source),s=G.state();
 Object.assign(s,{faction:0,enemyFaction:0,live:true,wave:10,elapsed:180,aiDifficulty:difficulty,enemyCash:600,enemyEcoReadyAt:9999,hardBrain:{plan:1,opening:2,heroRole:6,spent:0,economyPurchases:0}});
 s.enemyBuilt.fill(null);for(let i=0;i<8;i++)s.enemyBuilt[i]=6;for(let i=8;i<12;i++)s.enemyBuilt[i]=1;
 for(let i=0;i<12;i++){G.createUnit(0,i,4);s.units.at(-1).x=2100;}
 G.createUnit(1,0,6);s.units.at(-1).x=2400;
 w.probe.hardInvest();
 assert.ok(s.enemyBuilt.filter(r=>r===6).length<8,'refitted aircraft is not replaced with another aircraft');
 assert.ok(s.enemyBuilt.filter(r=>r===2||r===3).length>=2,'scouted counter purchases take priority');
 assert.ok(s.enemyCash>=0&&s.enemyCash<185,'spends earned cash on useful affordable counters');
 assert.ok([2,3].includes(s.hardBrain.heroRole),'old eight-factory lock is released');
});
for(const difficulty of ['veryhard','impossible'])test(difficulty+' multiplayer host preserves tactical counter orders over hero cohort',()=>{
 const {E}=multi(),game=E.create({mode:'coop',size:2,aiDifficulty:difficulty,members:[{uid:'a',team:0,faction:0},{uid:'b',team:0,faction:1}]}),s=game.state;
 const bot=s.players.find(p=>p.bot);bot.faction=0;bot.cash=600;bot.ecoReadyAt=9999;
 bot.hardBrain={plan:1,opening:2,heroRole:6,heroLane:0,spent:0,economyPurchases:0};
 s.wave=10;s.seconds=180;bot.buildings.forEach(row=>row.fill(null));
 for(let lane=0;lane<3;lane++){bot.buildings[lane][0]=6;bot.buildings[lane][1]=1;}
 for(let i=2;i<7;i++)bot.buildings[0][i]=6;
 for(let i=0;i<12;i++){game.__test.spawn(s.players[0],0,i,4);s.units.at(-1).x=2100;}
 game.__test.spawn(bot,0,0,6);s.units.at(-1).x=2400;
 game.__test.hardBotPurchase(bot);
 assert.equal(bot.buildings.flat().filter(r=>r===6).length,8,'no extra aircraft against anti-air');
 assert.ok(bot.buildings.flat().some(r=>r===2||r===3));assert.ok(bot.cash>=0);
});
test('impossible responds to mixed visible threats without demanding a single-role majority',()=>{
 const counts=[10,0,0,0,0,0,0,0],intel={roles:[0,6,5,0,5,0,0,0]};
 const reply=AI.response(AI.create(0),{counts,intel,difficulty:'impossible'});
 assert.equal(reply.needed,true);assert.ok([1,2,3,5].includes(reply.role));
 assert.equal(AI.response(AI.create(0),{counts,intel,difficulty:'veryhard'}).needed,false);
});

test('impossible targets 85 percent counter factories and releases the target after scouting a switch',()=>{
 const brain=AI.create(0),intel={roles:[0,0,0,0,20,0,0,0]};
 const counts=[0,3,7,6,0,0,4,0]; // 13/20 counters: enough for veryhard, below impossible.
 assert.equal(AI.response(brain,{counts,intel,difficulty:'veryhard'}).needed,false);
 assert.equal(AI.response(brain,{counts,intel,difficulty:'impossible'}).needed,true);
 const near=[0,0,8,8,0,0,4,0]; // 80 percent still needs a counter.
 assert.equal(AI.response(brain,{counts:near,intel,difficulty:'impossible'}).needed,true);
 const complete=[0,0,9,8,0,0,3,0];
 assert.equal(AI.response(brain,{counts:complete,intel,difficulty:'impossible'}).needed,false);
 const switched=AI.response(brain,{counts:complete,intel:{roles:[0,0,0,0,0,0,20,0],air:20},difficulty:'impossible'});
 assert.equal(switched.needed,true);assert.ok([4,1].includes(switched.role),'newly scouted aircraft replaces the obsolete anti-air counter target');
});
test('impossible mixed response uses the stronger deficit target',()=>{
 const reply=AI.response(AI.create(0),{counts:[3,0,1,2,0,3,0,0],intel:{roles:[0,4,3,0,3,0,0,0]},difficulty:'impossible'});
 assert.equal(reply.needed,true);assert.equal(reply.role,3);
});
