'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const AI=require('./hard-ai.js'),{solo,multi}=require('./combat-balance-harness.cjs');
const prices=[65,100,185,285,185,360,300,220];
const intelFor=roles=>({roles,investment:roles.map((n,r)=>n*prices[r])});
const threat=intelFor([20,10,0,0,0,10,0,0]);
test('only impossible recognizes cost-dominant infantry-screened siege',()=>{
 const counts=[5,4,0,2,0,0,0,0],brain=AI.create(0);
 const reply=AI.response(brain,{counts,intel:threat,difficulty:'impossible'});
 assert.equal(reply.guardedSiege,true);assert.equal(reply.role,6);
 assert.equal(AI.siegeResponse(brain,{counts,intel:threat,difficulty:'veryhard'}),null);
 assert.equal(AI.siegeResponse(brain,{counts,intel:{roles:threat.roles},difficulty:'impossible'}),null);
 const base={cash:299,counts,eco:3,readyAt:0,seconds:200,costs:prices,ecoCost:200,intel:threat,difficulty:'impossible'};
 assert.equal(AI.choose(brain,base),null,'save for the paid counter');
 assert.deepEqual(AI.choose(brain,{...base,cash:300}),{kind:'unit',role:6,tactical:true});
});
test('unrelated threats keep the existing response and purchasing decisions',()=>{
 for(const difficulty of ['veryhard','impossible'])for(let faction=0;faction<10;faction++)for(let major=0;major<8;major++){
  const roles=Array(8).fill(0);roles[major]=20;
  for(const counts of [Array(8).fill(1),[10,0,1,0,0,0,0,0]]){
   const brain=AI.create(faction,()=>.5),intel=intelFor(roles),plain={roles};
   const base={counts,cash:600,eco:3,readyAt:0,seconds:200,costs:prices,ecoCost:200,difficulty};
   assert.equal(AI.siegeResponse(brain,{counts,intel,difficulty}),null);
   assert.deepEqual(AI.response(brain,{...base,intel}),AI.response(brain,{...base,intel:plain}));
   assert.deepEqual(AI.choose({...brain},{...base,intel}),AI.choose({...brain},{...base,intel:plain}));
  }
 }
});
test('ground specialists retain their original counters, and new anti-air releases the exception',()=>{
 for(const faction of [3,4,6,7]){
  const reply=AI.response(AI.create(faction),{counts:Array(8).fill(1),intel:threat,difficulty:'impossible'});
  assert.equal(AI.siegeResponse(AI.create(faction),{counts:Array(8).fill(1),intel:threat,difficulty:'impossible'}),null);
  assert.equal(AI.screenedSiege(threat,'impossible'),true);
  assert.equal(reply.guardedSiege,undefined);
 }
 assert.equal(AI.siegeResponse(AI.create(0),{counts:Array(8).fill(1),intel:{...threat,air:3},difficulty:'impossible'}),null);
 const intel=intelFor([20,10,0,0,10,10,0,0]);
 assert.equal(AI.siegeResponse(AI.create(0),{counts:Array(8).fill(1),intel,difficulty:'impossible'}),null);
});
test('solo vision uses paid surviving troop equivalents and forgets old siege',()=>{
 const src=fs.readFileSync(__dirname+'/game-v2.js','utf8').replace('initFactions();wire();reset();','window.probe={aiReadOpponent,hardInvest};initFactions();wire();reset();');
 const {G,window:w}=solo(1,src),s=G.state();Object.assign(s,{live:true,elapsed:180,aiDifficulty:'impossible',faction:3,enemyFaction:0});
 G.createUnit(0,0,5);const gun=s.units.at(-1);Object.assign(gun,{x:2100,heroCount:20,maxHP:2000,hp:1000});
 G.createUnit(0,1,0);Object.assign(s.units.at(-1),{x:2100,isHatchling:true});
 G.createUnit(0,2,1);Object.assign(s.units.at(-1),{x:2100,conscripted:true});
 G.createUnit(0,3,5);s.units.at(-1).x=100;
 const intel=w.probe.aiReadOpponent();assert.equal(intel.investment[5],3600);assert.equal(intel.investment[0],0);assert.equal(intel.investment[1],0);
 s.units=[];s.elapsed+=37;assert.equal(w.probe.aiReadOpponent().investment[5],0);
});
for(const mode of ['solo','coop'])test(mode+' buys a paid flying counter without legacy infantry override',()=>{
 if(mode==='solo'){
  const src=fs.readFileSync(__dirname+'/game-v2.js','utf8').replace('initFactions();wire();reset();','window.probe={hardInvest};initFactions();wire();reset();');
  const {G,window:w}=solo(1,src),s=G.state();Object.assign(s,{live:true,elapsed:180,wave:10,aiDifficulty:'impossible',faction:3,enemyFaction:0,enemyCash:650,enemyEcoReadyAt:9999,hardBrain:{faction:0,plan:2,opening:99,spent:0}});
  s.enemyBuilt.fill(null);for(let i=0;i<10;i++)s.enemyBuilt[i]=1;
  for(const [role,n] of [[0,20],[1,10],[5,10]])for(let i=0;i<n;i++){G.createUnit(0,i,role);s.units.at(-1).x=2100;}
  w.probe.hardInvest();assert.ok(s.enemyBuilt.includes(6));assert.ok(s.enemyCash>=0&&s.enemyCash<650);
  assert.ok(s.enemyBuildReadyAt[s.enemyBuilt.indexOf(6)]>s.elapsed);
 }else{
  const {E}=multi(),game=E.create({mode:'coop',size:2,aiDifficulty:'impossible',members:[{uid:'a',team:0,faction:3},{uid:'b',team:0,faction:2}]}),s=game.state,bot=s.players.find(p=>p.bot);
  Object.assign(bot,{faction:0,cash:650,ecoReadyAt:9999,hardBrain:{faction:0,plan:2,opening:99,spent:0}});s.seconds=180;s.wave=10;bot.buildings.forEach(row=>row.fill(null));
  for(let i=0;i<10;i++)bot.buildings[0][i]=1;
  for(const [role,n] of [[0,20],[1,10],[5,10]])for(let i=0;i<n;i++){game.__test.spawn(s.players[0],0,i,role);s.units.at(-1).x=2100;}
  game.__test.hardBotPurchase(bot);assert.ok(bot.buildings.flat().includes(6));assert.ok(bot.cash>=0&&bot.cash<650);
 }
});
