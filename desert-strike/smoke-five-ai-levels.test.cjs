'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname,read=p=>fs.readFileSync(path.join(root,p),'utf8');
const names=['easy','normal','hard','veryhard','impossible'];
function engine(){
 const w={},ctx={window:w,Math,Array,Object,Number,String,Map,Set,Date,JSON,console};
 for(const file of ['defense-guardian.js','unit-consolidation.js','hard-ai.js','tri-lane-engine.js'])
  vm.runInNewContext(read(file),ctx,{filename:file});
 return w.DesertTriEngine;
}
test('five difficulty choices appear in command lobby and persist through saved state',()=>{
 const html=read('index.html'),lobby=read('front-lobby.js'),game=read('game-v2.js'),multiplayer=read('tri-lane-network.js');
 for(const name of names){
  assert.ok(html.includes('data-difficulty="'+name+'"'),'missing selector '+name);
  assert.ok(lobby.includes(name),'missing saved profile mapping '+name);
  assert.ok(game.includes(name),'missing solo strategy '+name);
 }
 assert.ok(multiplayer.includes("aiDifficulty:global.DesertLobby?.aiDifficulty?.()"),'co-op host choice is applied');
});
test('all five multiplayer difficulties build paid factories and preserve enemy economy privacy',()=>{
 const E=engine();
 for(const aiDifficulty of names){
  const m=E.create({mode:'coop',size:2,members:[{uid:'humanA',team:0,faction:0},{uid:'humanB',team:0,faction:1}],aiDifficulty});
  assert.equal(m.state.aiDifficulty,aiDifficulty);
  assert.equal(m.state.players.filter(p=>p.bot).length,2);
  for(let k=0;k<120;k++)m.tick(.2);
  for(const bot of m.state.players.filter(p=>p.bot)){
   assert.ok(bot.cash>=-1e-6,'AI cannot borrow: '+aiDifficulty);
   assert.ok(bot.buildings.flat().filter(r=>r!==null).length>=1,'bot starts with paid factories: '+aiDifficulty);
   assert.equal(bot.buildings.flat().filter(r=>r===8).length,bot.eco,'all extractors require a real slot');
   assert.equal(m.snapshot('humanA').players.find(p=>p.uid===bot.uid).cash,null,'enemy bank remains private');
   if(['veryhard','impossible'].includes(aiDifficulty))assert.ok(bot.hardBrain,'top-tier uses strategic planner');
   else assert.equal(bot.hardBrain,undefined,'middle levels retain straightforward rush AI');
  }
 }
});
test('beginner uses fewer factories than standard, and middle tier keeps extra scaling',()=>{
 const E=engine(),counts={};
 for(const aiDifficulty of ['easy','normal','hard']){
  const m=E.create({mode:'pvp',size:1,members:[{uid:'human',team:0,faction:0},{uid:'bot',team:1,faction:0,bot:true}],aiDifficulty});
  const bot=m.state.players[1];bot.cash=4000;m.state.wave=12;
  m.wave();counts[aiDifficulty]=bot.buildings.flat().filter(v=>v!==null&&v!==8).length;
 }
 assert.ok(counts.easy<=counts.normal,'easy must not out-build normal');
 assert.ok(counts.hard>=counts.normal,'hard must have stronger production ceiling than normal');
});
test('no forced siege, no global healing reduction, and restored 30-second online Prism choices',()=>{
 const engineSource=read('tri-lane-engine.js'),ui=read('tri-lane-ui.js');
 assert.ok(!engineSource.includes('warPressure'));
 assert.ok(!engineSource.includes("kind:'pressure'"));
 assert.ok(!engineSource.includes('OVERTIME_START'));
 assert.ok(engineSource.includes('remaining:30,offers'));
 assert.ok(!engineSource.includes('OCTOPER_REGEN*dt*'));
 assert.ok(!engineSource.includes('ROBOT_REPAIR*dt*'));
 assert.ok(ui.includes('mp-good-counter'));
 assert.ok(ui.includes('mp-bad-counter'));
 assert.ok(ui.includes('30초 후 자동 선택'));
});
