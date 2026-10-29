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
test('online Prism-only schedule and fast draft do not change the legacy solo catalogue',async()=>{
 const w=await make(true);
 const selected=w.DesertAugments.create(7);
 assert.equal(selected.schedule.length,5);
 const game=w.DesertTriEngine.create({mode:'pvp',size:1,members,ruleset:'augment',seed:7});
 assert.deepEqual(Array.from(game.state.augmentSchedule),['prismatic','prismatic','prismatic','prismatic','prismatic']);
 assert.equal(game.state.augmentChoice.remaining,12);
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
 game.state.wave=17;game.wave();assert.equal(game.state.augmentChoice.round,18);
 game.state.augmentChoice=null;
 game.state.wave=35;game.wave();assert.equal(game.state.augmentChoice.round,36);
 assert.equal(w.DesertPrism.cards.length,100,'ten unusual capstones replace cards without expanding the catalogue');
 for(let i=0;i<10;i++){
  const card=w.DesertPrism.cards[i*10+9];
  assert.ok(card.effects.length>=2,'faction '+i+' has a compound capstone');
 }
});
test('stalemate escalation is offensive, has no time cap and keeps core victory',async()=>{
 const w=await make();
 const e=w.DesertTriEngine.create({mode:'classic',size:1,members});
 assert.equal(e.snapshot('left').pressure,1);
 e.state.seconds=11*60;assert.ok(e.snapshot('left').pressure>1);
 e.state.seconds=20*60;assert.ok(e.snapshot('left').pressure>=2);
 e.state.seconds=5*3600;e.tick(.01);
 assert.equal(e.state.ended,false,'elapsed time alone never declares an arbitrary winner');
 assert.ok(e.snapshot('left').pressure>=2.7);
 // Two units cannot call artillery. Four forward units can.
 const defender=w.DesertTriEngine.create({mode:'classic',size:1,members});
 defender.state.players[0].buildings[0].fill(0,0,4);
 defender.state.seconds=13*60;defender.wave();
 for(const u of defender.state.units)if(u.team===0){u.x=1600;u.hp=10000;}
 const before=defender.state.forwardHP[0][1];
 defender.wave();assert.equal(defender.state.forwardHP[0][1],before,'no siege before 16 minutes');
 defender.state.seconds=17*60;
 defender.wave();
 assert.ok(defender.state.forwardHP[0][1]<before,'late frontline siege damages enemy tower');
 assert.equal(defender.state.forwardHP[0][0],1000,'no self-damage from own siege');
 const mirror=w.DesertTriEngine.create({mode:'classic',size:1,members});
 mirror.state.cores[0][0]=0;mirror.state.cores[0][1]=0;mirror.tick(.01);
 assert.equal(mirror.state.winner,null,'simultaneous core destruction must result in a draw');
});
test('single-scale lane camera and selectable enemy cards remain in web UI',()=>{
 const html=read('index.html'),ui=read('tri-lane-ui.js'),css=read('style-v2.css');
 assert.match(html,/id="mpBattleCanvas" width="1100" height="520"/);
 for(const id of ['mpBattleLaneSelect','mpPanLeft','mpPanCenter','mpPanRight','mpAugmentRoster'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(ui,/function renderAugmentRoster\(/);
 assert.match(ui,/function panCamera\(/);
 assert.match(ui,/mapCanvas\.addEventListener\('pointermove'/);
 assert.match(ui,/iso\.terrain\(ctx,E\.WIDTH,H,false/);
 assert.match(ui,/iso\.structure\(ctx,x,260,faction,tower,hp\/max\)/);
 assert.match(css,/#mpBattleCanvas\{width:100%;height:auto;aspect-ratio:1100\/520/);
});
