'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'game-v2.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'style-v2.css'),'utf8');
for(const id of ['view-base','view-battle','view-special','baseCanvas','battleCanvas','factionCards','startButton','nukeButton','barrageButton','counterMatrix'])assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
assert.match(css,/@media\(max-width:620px\)/);
const ids=new Map(),queue=[],allTabs=['base','battle','special'].map(view=>({dataset:{view},classList:{toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(type,fn){this[type]=fn;}}));
const screens=['base','battle','special'].map(view=>({id:'view-'+view,classList:{toggle(){}},addEventListener(){}}));
const fakeCtx=new Proxy({
 createLinearGradient(){return {addColorStop(){}};},
 createRadialGradient(){return {addColorStop(){}};}
},{get(t,p){return p in t?t[p]:()=>{};},set(t,p,v){t[p]=v;return true;}});
function el(id){
 if(ids.has(id))return ids.get(id);
 const classes=new Set();
 const item={id,style:{},dataset:{},textContent:'',innerHTML:'',disabled:false,hidden:false,
  open:false,handlers:{},
  classList:{add(v){classes.add(v);},remove(v){classes.delete(v);},toggle(v,on){if(on===undefined)on=!classes.has(v);if(on)classes.add(v);else classes.delete(v);return on;},contains(v){return classes.has(v);}},
  addEventListener(t,fn){this.handlers[t]=fn;},
  getContext(){return fakeCtx;},
  getBoundingClientRect(){return {left:0,top:0,width:1100,height:520};},
  querySelectorAll(q){if(q==='[data-faction]')return facItems;return [];},
  querySelector(){return null;},
  setAttribute(){},removeAttribute(){},
  showModal(){item.open=true;},close(){item.open=false;}
 };
 ids.set(id,item);return item;
}
const facItems=[0,1,2,3].map(i=>{const classes=new Set(i===0?['selected']:[]);return {
 dataset:{faction:String(i)},classList:{
 toggle(key,on){if(on)classes.add(key);else classes.delete(key);},
 contains(key){return classes.has(key);}
 }
};});
const doc={
 getElementById:el,createElement(){return {width:0,height:0,getContext(){return fakeCtx;}};},
 querySelector(q){if(q==='[data-faction].selected')return facItems.find(x=>x.classList.contains('selected'));return null;},
 querySelectorAll(q){return q==='.screen'?screens:q==='.tab'||q==='[data-view]'?allTabs:[];},
 addEventListener(type,fn){doc[type]=fn;}
};
const sandbox={document:doc,window:{addEventListener(){}},requestAnimationFrame(fn){queue.push(fn);},console,Math,Number,String,Object,Array,Map,Set,Date};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'sprite-animations.js'),'utf8'),sandbox,{timeout:4000,filename:'sprite-animations.js'});
vm.runInNewContext(code.replace('initFactions();wire();reset();','window.__gameTest={state:()=>state,createUnit,resolveStrike,ecoCostFor,aiInvest,wave};initFactions();wire();reset();'),sandbox,{timeout:3500,filename:'game-v2.js'});
assert.equal(el('cash').textContent,'360');
assert.match(el('unitCards').innerHTML,/강점:/);
assert.match(el('unitCards').innerHTML,/약점:/);
assert.match(el('counterMatrix').innerHTML,/강점:/);
function click(id,data,key='click'){
 const fn=el(id).handlers[key];assert.equal(typeof fn,'function','Missing event '+id+':'+key);
 fn({target:{closest:()=>data?{dataset:data}:null},clientX:520,clientY:260,preventDefault(){}});
}
let time=0;
function steps(n){
 for(let i=0;i<n;i++){const f=queue.shift();assert.equal(typeof f,'function');time+=40;f(time);}
}
click('factionCards',{faction:'1'});
click('startButton');
assert.equal(el('factionLabel').textContent,'심연군체');
assert.equal(el('startOverlay').classList.contains('hidden'),true);
const matchStart=sandbox.window.__gameTest.state();
assert.equal(matchStart.cash,360,'player starting cash 360');
assert.equal(matchStart.enemyCash,200,'AI spent 160 from the same 360 starting capital on two real structures');
assert.equal(matchStart.enemyBuilt.filter(v=>v!==null).length,2,'AI starts with 2 paid buildings, not 3 gifted buildings');
assert.deepEqual([0,1,2,3].map(sandbox.window.__gameTest.ecoCostFor),[70,95,129,176],
 'both parties use the same economic upgrade costs');
assert.match(css,/position:sticky;top:0;z-index:35/,'economy HUD stays at top during page scrolling');
assert.match(css,/\.modal-backdrop\{z-index:110\}/,'overlay remains above fixed economy bar');
click('unitCards',{role:'0'});
click('buildGrid',{cell:'0'});
assert.equal(el('cash').textContent,'295','construction spends resources');
assert.match(el('buildGrid').innerHTML,/data-cell="74"/,'75 grid cells rendered');
click('panLeft');
assert.match(el('cameraStatus').textContent,/수동 이동/,'camera manually movable');
click('followFront');
assert.match(el('cameraStatus').textContent,/전선 자동 추적/,'front camera follow works');
assert.match(el('builtCount').textContent,/1 \/ 75/);
steps(640);
assert.ok(sandbox.window.DesertSprites.cacheSize>16,'combat must use procedural animation frames');
assert.equal(el('wave').textContent,'01','wave 1 should trigger');
assert.ok(Number(el('friendlyCount').textContent)>=1,'wave spawned allied units');
click('pauseButton');
const stopped=el('timer').textContent;
steps(50);
assert.equal(el('timer').textContent,stopped,'paused time stays unchanged');
click('pauseButton');
click('speedButton');
assert.equal(el('speedButton').textContent,'▶ 2×');
click('econButton');
assert.match(el('econInfo').textContent,/레벨 1/,'economy upgrade works');
click('demolishButton');
click('buildGrid',{cell:'0'});
assert.match(el('builtCount').textContent,/0 \/ 75/,'building demolition works');
click('restartButton');
assert.equal(el('cash').textContent,'360','reset restores cash');
assert.equal(el('wave').textContent,'00','reset restores wave');
assert.equal(el('startOverlay').classList.contains('hidden'),false,'reset requires faction selection');
// Marine Fortress faction and Huanglong su-yuk expendable ally healing.
click('factionCards',{faction:'3'});
click('startButton');
assert.equal(el('factionLabel').textContent,'해병성채');
assert.match(el('unitCards').innerHTML,/황룡/);
assert.match(el('unitCards').innerHTML,/해병수육/);
const game=sandbox.window.__gameTest,st=game.state();
assert.notEqual(st.faction,st.enemyFaction,'AI must pick a different faction');
game.createUnit(0,0,3);game.createUnit(0,1,7);
const heavy=st.units.find(u=>u.role===3);
const huang=st.units.find(u=>u.role===7);
assert.ok(heavy&&huang);
heavy.hp=heavy.maxHP*.35;
huang.x=heavy.x+12;huang.y=heavy.y+9;
const before=heavy.hp;
game.resolveStrike(huang,{healing:true,target:heavy,baseSide:null});
assert.ok(heavy.hp>before,'Huanglong restores ally HP');
assert.equal(huang.killed,true,'Huanglong must be consumed to heal');
assert.ok(st.deadUnits.includes(huang),'sacrifice must play death animation');
assert.equal(huang.hp,0);
// Symmetric economy regression: AI cannot mint extra wave rewards or discounted upgrades.
click('restartButton');
click('startButton');
const econGame=sandbox.window.__gameTest,eq=econGame.state();
eq.cash=0;eq.enemyCash=0;eq.wave=0;eq.built.fill(null);eq.enemyBuilt.fill(null);
econGame.wave();
assert.equal(eq.cash,24,'player wave payout');
assert.equal(eq.enemyCash,24,'AI wave payout must match player');
eq.wave=2;eq.enemyEco=0;eq.enemyCash=500;
eq.enemyBuilt.fill(null);for(let i=0;i<3;i++)eq.enemyBuilt[i]=0;
econGame.aiInvest();
assert.equal(eq.enemyEco,1,'AI may upgrade economy but must pay for it');
assert.equal(eq.enemyCash,430,'AI first economy upgrade costs exactly the player price of 70');
eq.wave=4;eq.enemyCash=500;
eq.enemyBuilt.fill(null);for(let i=0;i<4;i++)eq.enemyBuilt[i]=0;
econGame.aiInvest();
assert.equal(eq.enemyEco,2,'AI upgrade unlocks on later waves only');
assert.equal(eq.enemyCash,405,'AI second economy upgrade costs the same 95 CR');
console.log('V2 smoke passed: symmetric economy, paid AI start, equal wave stipends, shared income upgrade costs, sticky top HUD and existing game mechanics.');
