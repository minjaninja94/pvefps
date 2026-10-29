'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname,src=p=>fs.readFileSync(path.join(root,p),'utf8');
test('real 300-card draft works inside the original single-player engine without changing classic rules',async()=>{
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
 let chosenRuleset='augment';
 const w={addEventListener(){},DesertLobby:{selectedRuleset:()=>chosenRuleset,aiDifficulty:()=> 'normal',completeSolo(){}}};
 const sandbox={window:w,document,requestAnimationFrame:fn=>queue.push(fn),console,Math,Array,Number,String,Date,Map,Set,Object,JSON,Uint8ClampedArray,
  fetch:async()=>({ok:true,json:async()=>catalogue})};
 vm.runInNewContext(src('augment-rules.js'),sandbox,{filename:'augment-rules.js',timeout:3000});
 await w.DesertAugments.load();
 vm.runInNewContext(src('sprite-animations.js'),sandbox,{filename:'sprite-animations.js',timeout:3000});
 const inject="window.__soloTest={state:()=>state,start,reset,wave,tick,createUnit,effectiveDef,combatDef,chooseSoloAugment,rerollSoloAugment,advanceSoloAugmentTimer};initFactions();wire();reset();";
 const game=src('game-v2.js').replace("initFactions();wire();reset();",inject);
 assert.ok(game.includes(inject),'sandbox game injection');
 vm.runInNewContext(game,sandbox,{filename:'game-v2.js',timeout:9000});
 const G=w.__soloTest;G.start();
 let st=G.state();
 assert.equal(st.ruleset,'augment');
 assert.equal(st.wave,0);
 assert.equal(st.augmentChoice.round,1);
 assert.equal(st.augmentChoice.cards.length,3);
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
  const base=G.effectiveDef(role,st.faction,1),enhanced=G.effectiveDef(role,st.faction,0);
  if(key==='regen')assert.ok(enhanced.regen>0);
  else assert.notEqual(enhanced[key],base[key],'stat '+key+' from selected card must apply to allies');
 }
 G.tick(.5);assert.ok(st.elapsed>0);
 st.built[0]=0;st.wave=9;const count=st.produced[0][0];
 G.wave();assert.equal(st.wave,10);
 assert.equal(st.augmentChoice.round,10);
 assert.equal(st.produced[0][0],count,'wave 10 units await the new draft');
 G.advanceSoloAugmentTimer(30.5);
 assert.equal(st.augmentChoice,null,'auto-pick after 30s');
 assert.equal(st.augments.length,2);
 assert.ok(st.produced[0][0]>count,'wave 10 spawns exactly after card selection');
 assert.equal(st.wave,10,'no duplicated wave');
 G.reset();st=G.state();assert.equal(st.augments.length,0,'restarting forgets prior cards');
 chosenRuleset='standard';G.start();st=G.state();
 assert.equal(st.ruleset,'standard');assert.equal(st.augmentChoice,null);
 st.built[0]=0;G.wave();assert.equal(st.produced[0][0],1,'classic spawn rules remain unchanged');
});
test('lobby labels single/online/practice choices and loads 300 cards before single deployment',()=>{
 const lobby=src('front-lobby.js'),html=src('index.html'),css=src('style-v2.css');
 assert.match(lobby,/selectedRuleset:\(\)=>selectedRuleset/);
 assert.match(lobby,/DesertAugments\?\.ready/);
 assert.match(lobby,/DesertAugments\.load\(\)/);
 assert.match(lobby,/싱글 증강전/);
 for(const id of ['soloAugmentOverlay','soloAugmentHeading','soloAugmentCards','soloAugmentTime','soloAugmentCurrent'])
  assert.ok(html.includes('id="'+id+'"'),'missing single draft element: '+id);
 assert.match(html,/싱글 · 멀티플레이 · 3라인 연습 모두 적용/);
 assert.match(css,/\.solo-augment-dialog/);
});
