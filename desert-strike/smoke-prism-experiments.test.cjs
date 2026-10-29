'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=__dirname,read=p=>fs.readFileSync(path.join(root,p),'utf8');
const original=JSON.parse(read('assets/augments.json'));
function setup(){
 const window={};
 const ctx={window,Math,Array,Object,Number,String,Set,Map,Date,JSON,fetch:async()=>({ok:true,json:async()=>original}),console};
 vm.runInNewContext(read('prism-experiments.js'),ctx,{filename:'prism-experiments.js'});
 vm.runInNewContext(read('augment-rules.js'),ctx,{filename:'augment-rules.js'});
 return {window,ctx};
}
test('100 unique, valid per-faction Prism cards extend original 300 and can be disabled independently',async()=>{
 const {window}=setup();
 const P=window.DesertPrism,A=window.DesertAugments;
 assert.equal(P.cards.length,100);assert.equal(new Set(P.cards.map(c=>c.id)).size,100);
 for(let f=0;f<10;f++){
  const cards=P.cards.filter(c=>c.scope==='faction-'+f);
  assert.equal(cards.length,10,'ten specials for faction '+f);
  assert.ok(cards.every(c=>c.tier==='prismatic'&&c.experimental===true));
  assert.ok(cards.every(c=>c.effects.length>0&&c.effects.every(e=>e.kind.startsWith('prism_'))));
  assert.ok(new Set(cards.map(c=>c.name)).size===10,'ten unique powers per faction');
 }
 const kinds=new Set(P.cards.flatMap(c=>c.effects.map(x=>x.kind)));
 for(const kind of ['prism_limit','prism_brood','prism_recruit','prism_spawn','prism_cash',
  'prism_heal','prism_repair','prism_burst','prism_chain','prism_leech','prism_mark',
  'prism_execute','prism_frenzy','prism_revenge','prism_reflect'])
  assert.ok(kinds.has(kind),'missing interactive mechanic: '+kind);
 await A.load();assert.equal(A.list().length,400);
 assert.equal(A.list().filter(c=>c.tier==='prismatic'&&c.experimental).length,100,'all 100 experimental Prism cards are identifiable in the codex');
 assert.equal(A.list().filter(c=>c.scope==='common').length,50);
 for(let f=0;f<10;f++)assert.equal(A.list().filter(c=>c.scope==='faction-'+f).length,35);
 assert.equal(A.ready(),true);
 const disabled={};
 vm.runInNewContext(read('prism-experiments.js'),{window:disabled,Math,Array,Object,Number,Set},{filename:'prism-experiments.js'});
 disabled.DesertPrismExperimentalEnabled=false;
 const ctx={window:disabled,Math,Array,Object,Number,Set,Map,JSON,fetch:async()=>({ok:true,json:async()=>original})};
 vm.runInNewContext(read('augment-rules.js'),ctx,{filename:'augment-rules.js'});
 await disabled.DesertAugments.load();
 assert.equal(disabled.DesertAugments.list().length,300,'feature flag restores original catalogue');
 assert.equal(disabled.DesertPrism.populationLimit(['exp-prism-0-3'],220),220);
});
test('new mechanics actually change population, brood, recruits, wave effects and attacks',()=>{
 const {window}=setup(),P=window.DesertPrism;
 assert.equal(P.populationLimit(['exp-prism-0-3'],220),252);
 assert.equal(P.populationLimit(['exp-prism-0-3'],75,true),87,'increases per-lane cap within safety clamp');
 assert.equal(P.populationLimit(['exp-prism-0-3'],220,false),252);
 const brood=P.broodLimits(['exp-prism-1-0'],8,14,.2);
 assert.equal(brood.cap,16);assert.equal(brood.alive,24);assert.equal(brood.chance,.32);
 const marine=P.recruitLimits(['exp-prism-3-0'],1,.23);
 assert.equal(marine.cap,4);assert.equal(marine.chance,.38);
 const wave=P.waveEffects(['exp-prism-0-1','exp-prism-0-7'],3);
 assert.equal(wave.cash,70);
 assert.equal(wave.spawns[0].role,3);assert.equal(wave.spawns[0].count,2);
 const repair=P.waveEffects(['exp-prism-0-0'],4);
 assert.equal(repair.repairs[0],.04);
 const shield=P.reflectEffects(['exp-prism-0-2'],{role:3}, {role:0},100);
 assert.equal(shield,0,'reflect timing requires several hits');
 const ward={role:3};for(let i=0;i<3;i++)P.reflectEffects(['exp-prism-0-2'],ward,{role:0},100);
 assert.equal(P.reflectEffects(['exp-prism-0-2'],ward,{role:0},100),45);
 const b={role:2,hp:100,maxHP:100};
 let out={};for(let i=0;i<4;i++)out=P.hitEffects(['exp-prism-0-8'],b,{role:0,hp:100,maxHP:100,x:0,y:0},30,0,[]);
 assert.equal(out.bonus,33,'fourth hit yields 2.1x damage');
 const killer={role:0};for(let i=0;i<3;i++)P.deathEffects(['exp-prism-1-7'],killer);
 assert.equal(P.deathEffects(['exp-prism-1-7'],killer)[0].role,0);
 const marked={role:1};let inflict={};
 for(let i=0;i<3;i++)inflict=P.hitEffects(['exp-prism-8-0'],marked,{hp:100,maxHP:100,x:0,y:0},20,0,[]);
 assert.equal(inflict.marked,4);
 const basic={hp:150,damage:15};
 const frenzied=P.augmentStats(basic,['exp-prism-4-2'],0,10,5);
 assert.equal(frenzied.damage,15,'does not buff roles outside selected role');
 const burst=P.augmentStats(basic,['exp-prism-4-2'],6,10,0);
 assert.equal(burst.damage,25.5);
 const expired=P.augmentStats(basic,['exp-prism-4-2'],6,25,0);
 assert.equal(expired.damage,15);
});
test('faction signatures: one-time fortress defense, triple moonlight arrows, robot reboot and fairy echo',()=>{
 const {window}=setup(),P=window.DesertPrism;
 const fortress=P.waveEffects(['exp-prism-0-0'],2);
 assert.equal(fortress.laststands.length,1);
 assert.equal(fortress.laststands[0].count,4);
 const archer={role:1,x:0,y:0,hp:100,maxHP:100};
 const victim={role:0,x:200,y:0,hp:100,maxHP:100};
 const enemies=[{x:225,y:0,hp:100,maxHP:100},{x:230,y:5,hp:100,maxHP:100},{x:240,y:-10,hp:100,maxHP:100}];
 let volley=null;
 for(let i=0;i<4;i++)volley=P.hitEffects(['exp-prism-5-0'],archer,victim,25,i,enemies);
 assert.equal(volley.secondary.length,3,'moonlight arrows bounce to three targets');
 const mech={role:3,hp:-5,maxHP:100,prismWaveAt:0};
 assert.equal(P.survival(['exp-prism-7-2'],mech,50,mech.hp),38,'robot restarts on a fatal blow');
 assert.equal(P.survival(['exp-prism-7-2'],mech,55,-1),0,'reboot cannot trigger repeatedly');
 assert.equal(P.survival(['exp-prism-7-2'],mech,86,-1),38,'reboot recovers after the cooldown');
 const healer={role:7,side:0,x:0,y:0};
 const target={role:0,side:0,x:50,y:0,hp:40,maxHP:100};
 const allies=[target,{role:0,side:0,x:85,y:0,hp:50,maxHP:100},{role:1,side:0,x:105,y:0,hp:50,maxHP:100},
  {role:0,side:1,x:60,y:0,hp:20,maxHP:100}];
 const echoes=P.healEcho(['exp-prism-9-0'],healer,target,20,allies,5);
 assert.equal(echoes.length,2,'fairy heals exactly two nearby allied units');
 assert.equal(echoes[0].amount,10);
 assert.equal(P.healEcho(['exp-prism-9-0'],healer,target,20,allies,7).length,0,'echo cooldown is enforced');
});

test('host engine applies experimental reinforcements and bonus credits, independent by player',async()=>{
 const {window,ctx}=setup();await window.DesertAugments.load();
 window.DesertGuardian=require('./defense-guardian.js');
 window.DesertConsolidation=require('./unit-consolidation.js');
 vm.runInNewContext(read('tri-lane-engine.js'),ctx,{filename:'tri-lane-engine.js'});
 const e=window.DesertTriEngine.create({mode:'pvp',size:1,members:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:1}],ruleset:'augment',seed:1234});
 const left=e.state.players[0],right=e.state.players[1];
 left.augments.push('exp-prism-0-1','exp-prism-0-7','exp-prism-0-3');
 const before=left.cash,rightCash=right.cash;
 e.state.augmentChoice=null;
 for(let k=1;k<=3;k++)e.wave();
 assert.equal(e.state.wave,3);
 assert.equal(left.cash-before,70*3+3*24,'first player gets wave-by-wave bonus credits');
 assert.equal(right.cash-rightCash,3*24,'opponent gets baseline wave income only');
 assert.ok(e.state.units.some(u=>u.uid==='a'&&u.role===3),'free armor reinforcements spawn during qualifying wave');
 assert.equal(window.DesertPrism.populationLimit(left.augments,75,true),87);
 const packet=e.snapshot('b');
 assert.deepEqual(Array.from(packet.players[0].augments),[],'enemy experimental card IDs stay hidden');
 assert.equal(e.state.ended,false);
 left.augments.push('exp-prism-0-0');
 const unitsBefore=e.state.units.filter(u=>u.uid==='a').length;
 e.state.cores[0][0]=2500*.49;
 e.wave();
 assert.equal(left.prismLastStandUsed,true,'Iron Fortress triggers from health before scheduled repair');
 assert.ok(e.state.cores[0][0]>2500*.49,'core receives emergency restoration');
 assert.ok(e.state.units.filter(u=>u.uid==='a').length>=unitsBefore+4,'four emergency armor troops join the endangered lane');
 const after=e.state.units.filter(u=>u.uid==='a').length;
 e.wave();assert.equal(e.state.units.filter(u=>u.uid==='a').length,after,'one-time last stand cannot repeat next wave');
});
test('solo and authoritative multiplayer engines integrate limit and special combat hooks',()=>{
 const single=read('game-v2.js'),multi=read('tri-lane-engine.js'),html=read('index.html');
 assert.match(single,/ownPrism\(\)\?\.waveEffects/);
 assert.match(single,/ownPrism\(\)\?\.survival/);
 assert.match(single,/ownPrism\(\)\?\.healEcho/);
 assert.match(single,/ownPrism\(\)\?\.hitEffects/);
 assert.match(single,/ownPrism\(\)\?\.reflectEffects/);
 assert.match(single,/ownPrism\(\)\?\.deathEffects/);
 assert.match(single,/DesertPrism\?\.populationLimit/);
 for(const name of ['waveEffects','hitEffects','reflectEffects','deathEffects','populationLimit','survival','healEcho'])
  assert.ok(multi.includes('DesertPrism?.'+name),'missing multiplayer '+name);
 assert.ok(html.indexOf('prism-experiments.js')<html.indexOf('augment-rules.js'));
 assert.match(html,/웨이브별 증강 선택/);
});
