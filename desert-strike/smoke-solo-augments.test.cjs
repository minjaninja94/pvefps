'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname,src=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const initialRuleset of ['augment','prism'])test(initialRuleset+' draft works inside the original single-player engine without changing classic rules',async()=>{
 const catalogue=JSON.parse(src('assets/augments.json'));
 const sprites=new Map(),nodes=new Map(),queue=[];
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},
  {get:(v,p)=>p in v?v[p]:()=>{},set:(v,p,x)=>(v[p]=x,true)});
 function el(id){
  if(nodes.has(id))return nodes.get(id);
  const classes=new Set();const o={id,style:{},dataset:{},textContent:'',innerHTML:'',children:[],handlers:{},disabled:false,hidden:false,open:false,
   classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,v)=>{v??=!classes.has(x);v?classes.add(x):classes.delete(x);return v;}},
   addEventListener:(type,fn)=>{o.handlers[type]=fn;},
   append(...a){o.children.push(...a);},
   replaceChildren(...a){o.children=[...a];},
   querySelectorAll:()=>[],querySelector:()=>null,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:1100,height:520}),
   setAttribute(){},removeAttribute(){},showModal(){o.open=true;},close(){o.open=false;}
  };nodes.set(id,o);return o;
 }
 const factions=Array.from({length:10},(_,i)=>({dataset:{faction:String(i)},classList:{contains:k=>k==='selected'&&i===0,toggle(){}}}));
 const screens=['base','battle','special'].map(id=>({id:'view-'+id,classList:{toggle(){}}}));
 const tabs=['base','battle','special'].map(view=>({dataset:{view},classList:{toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(){}}));
 const document={
  getElementById:el,
  createElement:tag=>tag==='canvas'?{width:0,height:0,getContext:()=>ctx}:el('element-'+Math.random()),
  querySelector:q=>q==='[data-faction].selected'?factions[0]:null,
  querySelectorAll:q=>q==='.screen'?screens:q==='.tab'||q==='[data-view]'?tabs:[],
  addEventListener(){}
 };
 let chosenRuleset=initialRuleset,chosenAiDifficulty='normal';
 const w={addEventListener(){},DesertLobby:{selectedRuleset:()=>chosenRuleset,aiDifficulty:()=>chosenAiDifficulty,completeSolo(){}}};
 const sandbox={window:w,document,requestAnimationFrame:fn=>queue.push(fn),console,Math,Array,Number,String,Date,Map,Set,Object,JSON,Uint8ClampedArray,
  fetch:async()=>({ok:true,json:async()=>catalogue})};
 vm.runInNewContext(src('augment-rules.js'),sandbox,{filename:'augment-rules.js',timeout:3000});
 await w.DesertAugments.load();
 vm.runInNewContext(src('sprite-animations.js'),sandbox,{filename:'sprite-animations.js',timeout:3000});
 const inject="window.__soloTest={state:()=>state,start,reset,wave,tick,createUnit,effectiveDef,combatDef,getDef,damage,heal,supplyCap,chooseSoloAugment,rerollSoloAugment,advanceSoloAugmentTimer};initFactions();wire();reset();";
 const game=src('game-v2.js').replace("initFactions();wire();reset();",inject);
 assert.ok(game.includes(inject),'sandbox game injection');
 vm.runInNewContext(game,sandbox,{filename:'game-v2.js',timeout:9000});
 const G=w.__soloTest;G.start();
 let st=G.state();
 assert.equal(st.ruleset,initialRuleset);
 if(initialRuleset==='prism')assert.ok(st.augmentSchedule.every(t=>t==='prismatic'));
 assert.equal(st.wave,0);
 assert.equal(st.augmentChoice.round,1);
 assert.equal(st.augmentChoice.cards.length,3);
 assert.equal(st.enemyAugments.length,1,'AI draws its own initial card without waiting for the human');
 const enemyFirst=w.DesertAugments.card(st.enemyAugments[0]);
 assert.equal(enemyFirst.tier,st.augmentChoice.tier,'AI draft receives the same rarity as the human');
 assert.ok(['common','faction-'+st.enemyFaction].includes(enemyFirst.scope),'AI never receives another faction\'s signature card');
 assert.equal(el('soloAugmentOverlay').classList.contains('hidden'),false);
 const before=st.elapsed;G.tick(20);assert.equal(st.elapsed,before,'battle clock freezes during draft');
 const card0=st.augmentChoice.cards[0];
 assert.ok(G.rerollSoloAugment(0),'one reroll is allowed');
 assert.notEqual(st.augmentChoice.cards[0],card0);
 assert.equal(G.rerollSoloAugment(0),false,'cannot reroll the same slot twice');
 assert.ok(G.chooseSoloAugment(1));
 assert.equal(st.augmentChoice,null);assert.equal(st.augments.length,1);
 assert.equal(el('soloAugmentOverlay').classList.contains('hidden'),true);
 const initialCard=w.DesertAugments.card(st.augments[0]);
 const effect=initialCard.effects?.find(x=>x.kind==='stat');
 if(effect){const role=effect.roles?.[0]??0,key=effect.stat;
  const base=G.getDef(role,st.faction),enhanced=G.effectiveDef(role,st.faction,0);
  const expected=w.DesertAugments.apply(base,st.augments,role);
  assert.equal(enhanced[key],expected[key],'player '+key+' follows the actual card rule, including zero baseline stats');
 }
 G.tick(.5);assert.ok(st.elapsed>0);
 st.built[0]=0;st.wave=9;const count=st.produced[0][0];
 G.wave();assert.equal(st.wave,10);
 assert.equal(st.augmentChoice.round,10);
 assert.equal(st.enemyAugments.length,2,'AI gets its second distinct card on wave 10');
 assert.equal(w.DesertAugments.card(st.enemyAugments[1]).tier,st.augmentChoice.tier);
 assert.equal(new Set(st.enemyAugments).size,2,'AI cannot draft duplicates');
 assert.equal(st.produced[0][0],count,'wave 10 units await the new draft');
 G.advanceSoloAugmentTimer(30.5);
 assert.equal(st.augmentChoice,null,'auto-pick after 30s');
 assert.equal(st.augments.length,2);
 assert.ok(st.produced[0][0]>count,'wave 10 spawns exactly after card selection');
 assert.equal(st.wave,10,'no duplicated wave');
 for(const round of [20,30,40,50,60,70]){
  st.wave=round-1;G.wave();
  assert.equal(st.augmentChoice.round,round,'human is offered a draft on every scheduled wave');
  assert.equal(st.enemyAugments.length,st.augments.length+1,'AI independently takes a card at the same round');
  assert.equal(w.DesertAugments.card(st.enemyAugments.at(-1)).tier,st.augmentChoice.tier,'AI gets the scheduled tier');
  assert.ok(G.chooseSoloAugment(1),'human can still select the same round');
  assert.equal(st.enemyAugments.length,st.augments.length);
 }
 const augmentsAt70=st.augments.length;
 assert.equal(augmentsAt70,8,'all eight augment rounds are collected');
 assert.equal(new Set(st.enemyAugments).size,8,'AI never drafts duplicate cards');
 G.wave();
 assert.equal(st.wave,71,'augment single-player continues after final draft at wave 70');
 assert.equal(st.ended,false,'augment game cannot end at its last card schedule');
 assert.equal(st.augmentChoice,null,'wave 41 does not create an unscheduled draft');
 assert.equal(st.augments.length,augmentsAt70,'past wave 40, selected augments persist');
 assert.equal(st.enemyAugments.length,8,'AI also retains all five cards after the final selection wave');
 assert.ok(el('soloAugmentStatus').title.includes('AI 증강 8개'),'tooltip reveals AI card count without revealing its identities');
 // Verify the enemy actually gets live stat bonuses, not merely card IDs.
 const expected=w.DesertAugments.apply(G.getDef(2,st.enemyFaction),st.enemyAugments,2);
 const actual=G.effectiveDef(2,st.enemyFaction,1);
 for(const key of ['hp','damage','armor','speed','range','rate'])
  assert.equal(actual[key],expected[key],'AI '+key+' uses its own collected card effects');
 // Exercise an experimental enemy prism in the shipped solo combat engine.
 vm.runInNewContext(src('prism-experiments.js'),sandbox,{filename:'prism-experiments.js'});
 st.enemyFaction=0;st.enemyAugments=['exp-prism-0-1','exp-prism-0-7','exp-prism-0-3','exp-prism-0-0'];
 st.enemyBuilt.fill(null);st.enemyCash=0;st.enemyEcoReadyAt=0;st.units=[];st.baseHP[1]=7200*.49;
 assert.equal(G.supplyCap(1),Infinity,'AI and player have no population cap');
 const previousSpawn=st.produced[1][3];
 st.wave=41;G.wave();
 assert.equal(st.wave,42);
 assert.equal(st.enemyCash,94,'AI receives both baseline +24 and experimental +70 CR');
 assert.ok(st.produced[1][3]>=previousSpawn+6,'AI reinforcement plus one-time last stand summons real units');
 assert.equal(st.enemyPrismLastStandUsed,true);
 assert.ok(st.baseHP[1]>7200*.49,'AI fortress last stand repairs its own base');
 st.units=[];st.enemyAugments=['exp-prism-0-8'];
 G.createUnit(1,0,2);G.createUnit(0,0,3);
 const enemyAttack=st.units.find(u=>u.side===1),humanTank=st.units.find(u=>u.side===0);
 humanTank.hp=2000;humanTank.maxHP=2000;
 for(let i=0;i<4;i++)G.damage(humanTank,1,2,enemyAttack);
 assert.equal(enemyAttack._prismCounter['prism-prism_burst-2-0'],4,'AI attack applies periodic prism burst counters');
 st.enemyAugments=['exp-prism-0-3'];
 assert.equal(G.supplyCap(1),Infinity);
 G.reset();st=G.state();assert.equal(st.augments.length,0,'restarting forgets prior cards');assert.equal(st.enemyAugments.length,0,'AI cards reset too');
 chosenRuleset='standard';G.start();st=G.state();
 assert.equal(st.ruleset,'standard');assert.equal(st.augmentChoice,null);assert.equal(st.enemyAugments.length,0,'classic AI receives no augments');
 st.built[0]=0;G.wave();assert.equal(st.produced[0][0],1,'classic spawn rules remain unchanged');
 st.wave=99;
 G.wave();
 assert.equal(st.wave,100,'single-player continues beyond wave 22 and wave 99');
 assert.equal(st.ended,false,'no artificial wave-limit victory');
 assert.equal(st.ruleset,'standard','unlimited wave count does not change mode');
 st.built.fill(0);st.buildReadyAt.fill(0);
 const prevCount=st.units.filter(u=>u.side===0&&u.hp>0).length;
 for(let i=0;i<4;i++)G.wave();
 assert.ok(st.units.filter(u=>u.side===0&&u.hp>0).length>=prevCount+300,'solo standard mode can field well over 220 living troops');
 // Hard difficulty uses the same independent AI draft, without leaking into classic mode.
 w.DesertPrismExperimentalEnabled=false;chosenAiDifficulty='hard';chosenRuleset='augment';G.start();st=G.state();
 assert.equal(st.aiDifficulty,'hard');
 assert.equal(st.enemyAugments.length,1,'hard AI gets an augment on round 1');
 assert.equal(w.DesertAugments.card(st.enemyAugments[0]).tier,st.augmentChoice.tier);
 assert.ok(G.chooseSoloAugment(1));
 st.wave=9;G.wave();
 assert.equal(st.enemyAugments.length,2,'hard AI gets its second augment on round 10');
 assert.ok(st.augmentChoice,'human still receives their own selectable cards');
 G.reset();assert.equal(G.state().enemyAugments.length,0,'hard AI picks reset on a new match');
});
test('lobby labels single/online/practice choices and loads 300 cards before single deployment',()=>{
 const lobby=src('front-lobby.js'),html=src('index.html'),css=src('style-v2.css');
 assert.match(lobby,/selectedRuleset:\(\)=>selectedRuleset/);
 assert.match(lobby,/DesertAugments\?\.ready/);
 assert.match(lobby,/DesertAugments\.load\(\)/);
 assert.match(lobby,/label\+' · 웨이브 무제한'/);
 for(const id of ['soloAugmentOverlay','soloAugmentHeading','soloAugmentCards','soloAugmentTime','soloAugmentCurrent'])
  assert.ok(html.includes('id="'+id+'"'),'missing single draft element: '+id);
 assert.match(html,/싱글, 멀티플레이 및 3라인 연습 전투 규칙/);
 assert.match(css,/\.solo-augment-dialog/);
});
