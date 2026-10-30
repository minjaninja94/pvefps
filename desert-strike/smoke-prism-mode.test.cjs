'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
async function setup(){
 const window={},context={window,console,Math,Map,Set,Array,Number,String,Object,Date,JSON,
  fetch:async()=>({ok:true,json:async()=>JSON.parse(read('assets/augments.json'))})};
 for(const file of ['prism-experiments.js','augment-rules.js','tri-lane-engine.js'])vm.runInNewContext(read(file),context,{filename:file});
 await window.DesertAugments.load();return window;
}
test('Prism cards share all three slots and rerolls without duplicates or other-faction leakage',async()=>{
 const w=await setup(),A=w.DesertAugments;
 for(let faction=0;faction<10;faction++){
  const commonSlots=new Set(),specialSlots=new Set(),baseFactionSlots=new Set();let tripleSpecial=false;
  for(let seed=1;seed<=160;seed++){
   const draft=A.create(seed*7919,{prismOnly:true}),chosen=[];
   for(let round=0;round<8;round++){
    const ids=draft.offer('prismatic',faction,chosen);
    assert.equal(new Set(ids).size,3);
    ids.forEach((id,slot)=>{
     const c=A.card(id);assert.ok(c);assert.equal(c.tier,'prismatic');assert.ok(!chosen.includes(id));
     assert.ok(['common','faction-'+faction].includes(c.scope));
     if(c.experimental)specialSlots.add(slot);
     else if(c.scope==='common')commonSlots.add(slot);else baseFactionSlots.add(slot);
    });
    tripleSpecial||=ids.every(id=>A.card(id).experimental);
    // An unrelated player's offer must not change the faction used by this reroll.
    draft.offer('prismatic',(faction+1)%10,[]);
    for(let slot=0;slot<3;slot++){
     const next=draft.reroll('prismatic',chosen,ids,slot,faction),c=A.card(next);
     assert.ok(c);assert.ok(!ids.includes(next)&&!chosen.includes(next));
     assert.ok(['common','faction-'+faction].includes(c.scope));ids[slot]=next;
    }
    chosen.push(ids[round%3]);
   }
  }
  assert.equal(commonSlots.size,3);assert.equal(specialSlots.size,3);assert.equal(baseFactionSlots.size,3);
  assert.ok(tripleSpecial,'three former transcendence Prisms can appear together for faction '+faction);
 }
 assert.ok(A.list().every(c=>!c.name.includes(' · 초월 프리즘')),'one Prism grade in names and codex');
});
test('all-common Prism offers can reroll into the correct faction even after another player drafts',async()=>{
 const w=await setup(),A=w.DesertAugments,common=A.list().filter(c=>c.tier==='prismatic'&&c.scope==='common').slice(0,3).map(c=>c.id);
 for(let faction=0;faction<10;faction++){
  let sawOwn=false;
  for(let seed=1;seed<=80;seed++){
   const draft=A.create(seed);draft.offer('prismatic',(faction+1)%10);
   const c=A.card(draft.reroll('prismatic',[],common,1,faction));
   assert.ok(['common','faction-'+faction].includes(c.scope));sawOwn||=c.scope==='faction-'+faction;
  }
  assert.ok(sawOwn);
 }
});
for(const mode of ['classic','pvp','coop'])for(const ruleset of ['augment','prism'])test(mode+' '+ruleset+' preserves its rules and drafts through wave 70',async()=>{
 const w=await setup(),size=mode==='coop'?2:1,members=mode==='coop'
  ?[{uid:'a',team:0,faction:0},{uid:'b',team:0,faction:1}]
  :[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:1}];
 const game=w.DesertTriEngine.create({mode,size,members,ruleset,seed:1234});
 assert.equal(game.state.ruleset,ruleset);assert.equal(game.snapshot('a').ruleset,ruleset);
 const schedule=Array.from(game.state.augmentSchedule);
 assert.deepEqual(schedule,Array.from(w.DesertAugments.create(1234,{prismOnly:ruleset==='prism'}).schedule));
 if(ruleset==='prism')assert.ok(schedule.every(t=>t==='prismatic'));else assert.ok(schedule.some(t=>t!=='prismatic'));
 for(let stage=0;stage<8;stage++){
  const round=w.DesertAugments.STAGES[stage];
  if(stage){game.state.wave=round-1;game.wave();}
  assert.equal(game.state.augmentChoice.round,round);assert.equal(game.state.augmentChoice.tier,schedule[stage]);
  for(const p of game.state.players.filter(p=>!p.bot)){
   const before=game.snapshot(p.uid).augmentChoice.cards;
   assert.ok(before.every(id=>w.DesertAugments.card(id)?.tier===schedule[stage]));
   assert.equal(game.order(p.uid,{type:'augment_reroll',slot:2}).ok,true);
   assert.ok(!before.includes(game.snapshot(p.uid).augmentChoice.cards[2]));
   assert.equal(game.order(p.uid,{type:'augment_pick',slot:2}).ok,true);
  }
  assert.equal(game.state.augmentChoice,null);
 }
 for(const p of game.state.players){assert.equal(p.augments.length,8);assert.equal(new Set(p.augments).size,8);}
});
