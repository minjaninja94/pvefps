'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname,read=p=>fs.readFileSync(path.join(root,p),'utf8');
async function make(augmented=false){
 const w={},data=JSON.parse(read('assets/augments.json'));
 const context={window:w,console,Math,Array,Set,Map,Number,String,Object,Date,JSON,fetch:async()=>({ok:true,json:async()=>data})};
 for(const script of ['prism-experiments.js','augment-rules.js','tri-lane-engine.js'])
  vm.runInNewContext(read(script),context,{filename:script});
 w.DesertGuardian=require('./defense-guardian.js');
 w.DesertConsolidation=require('./unit-consolidation.js');
 if(augmented)await w.DesertAugments.load();
 return w;
}
const members=[{uid:'left',team:0,faction:0,name:'A'},{uid:'right',team:1,faction:1,name:'B'}];
test('online Prism-only schedule with 30-second choice does not change solo catalogue',async()=>{
 const w=await make(true);
 const selected=w.DesertAugments.create(7);
 assert.equal(selected.schedule.length,8);
 const game=w.DesertTriEngine.create({mode:'pvp',size:1,members,ruleset:'augment',seed:7});
 assert.deepEqual(Array.from(game.state.augmentSchedule),Array(8).fill('prismatic'));
 assert.equal(game.state.augmentChoice.remaining,30);
 assert.equal(game.state.augmentChoice.round,1);
 const initial=game.snapshot('left'),other=game.snapshot('right');
 assert.ok(initial.augmentChoice.cards.every(id=>w.DesertAugments.card(id)?.tier==='prismatic'));
 assert.ok(!JSON.stringify(initial.augmentChoice).includes(other.augmentChoice.cards[0]),'unselected rival offer stays private');
 assert.equal(game.order('left',{type:'augment_pick',slot:0}).ok,true);
 assert.equal(game.order('right',{type:'augment_pick',slot:0}).ok,true);
 const after=game.snapshot('right');
 assert.deepEqual(Array.from(after.players[0].augments),Array.from(game.state.players[0].augments),'enemy selected cards are revealed');
 assert.equal(after.players[0].cash,null,'enemy money remains hidden');
 assert.equal(game.state.augmentChoice,null);
 game.state.wave=9;game.wave();assert.equal(game.state.augmentChoice.round,10);
 game.state.augmentChoice=null;
 game.state.wave=19;game.wave();assert.equal(game.state.augmentChoice.round,20);
 assert.equal(w.DesertPrism.cards.length,400,'forty special Prisms per faction including thirty additions');
 for(let i=0;i<10;i++){
  const card=w.DesertPrism.cards.find(card=>card.id==='exp-prism-'+i+'-9');
  assert.ok(card.effects.length>=2,'faction '+i+' has a compound capstone');
 }
});
test('late match retains natural core-only victory without artillery or healing penalties',async()=>{
 const w=await make(),E=w.DesertTriEngine;
 const game=E.create({mode:'classic',size:1,members});
 game.state.seconds=5*3600;game.tick(.01);
 assert.equal(game.state.ended,false,'time alone cannot end a match');
 assert.equal(game.snapshot('left').pressure,undefined);
 assert.equal(game.snapshot('left').overtimeAt,undefined);
 assert.equal(game.state.forwardHP[0][1],1000);
 const source=read('tri-lane-engine.js');
 assert.ok(!source.includes('warPressure'),'no time-ramped unit damage');
 assert.ok(!source.includes("kind:'pressure'"),'no periodic frontline artillery');
 assert.ok(!source.includes('OVERTIME_START'),'no hidden overtime modifier');
 assert.ok(!source.includes('state.seconds>=10*60?.65:1'),'natural regen is not nerfed late');
 assert.ok(!source.includes('state.seconds>=10*60?.75:1'),'support healing is not nerfed late');
 const mirror=E.create({mode:'classic',size:1,members});
 mirror.state.cores[0][0]=0;mirror.state.cores[0][1]=0;mirror.tick(.01);
 assert.equal(mirror.state.winner,null,'simultaneous core destruction remains a draw');
});
test('single-scale lane camera and selectable enemy cards remain in web UI',()=>{
 const html=read('index.html'),ui=read('tri-lane-ui.js'),css=read('style-v2.css');
 assert.match(html,/id="mpBattleCanvas" width="1100" height="520"/);
 for(const id of ['mpBattleLaneSelect','mpPanLeft','mpPanCenter','mpPanRight','mpAugmentRoster'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(ui,/function renderAugmentRoster\(/);
 assert.match(ui,/mp-good-counter/);
 assert.match(ui,/mp-bad-counter/);
 assert.match(ui,/30초 후 자동 선택/);
 assert.match(ui,/function panCamera\(/);
 assert.match(ui,/mapCanvas\.addEventListener\('pointermove'/);
 assert.match(ui,/iso\.terrain\(ctx,E\.WIDTH,H,false/);
 assert.match(ui,/iso\.structure\(ctx,x,260,faction,tower,hp\/max,kind\)/);
 assert.match(css,/#mpBattleCanvas\{width:100%;height:auto;aspect-ratio:1100\/520/);
});
