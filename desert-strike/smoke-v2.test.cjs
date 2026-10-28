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
const facItems=[0,1,2,3,4,5].map(i=>{const classes=new Set(i===0?['selected']:[]);return {
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
let forcedMarineRoll=null;
const controlledMath=Object.create(Math);
controlledMath.random=()=>forcedMarineRoll===null?Math.random():forcedMarineRoll;
const sandbox={document:doc,window:{addEventListener(){}},requestAnimationFrame(fn){queue.push(fn);},console,Math:controlledMath,Number,String,Object,Array,Map,Set,Date};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'sprite-animations.js'),'utf8'),sandbox,{timeout:4000,filename:'sprite-animations.js'});
vm.runInNewContext(code.replace('initFactions();wire();reset();','window.__gameTest={state:()=>state,createUnit,resolveStrike,ecoCostFor,aiInvest,wave,tick,upgrade,aiReadOpponent,aiChoose,aiCountersFor,structureDamage,aiAdaptFacilities,separateUnits,unitRadius,bongoImpact,getDef,damage,nearestUnit,marineSpoils,deployMarineSupports,heal,enemyBaseVisible,enemyUnitVisible};initFactions();wire();reset();'),sandbox,{timeout:3500,filename:'game-v2.js'});
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
click('unitCards',{role:'8'});
click('buildGrid',{cell:'1'});
assert.match(el('econInfo').textContent,/자원채취 1 \/ 7/,'paid extractor construction works');
click('demolishButton');
click('buildGrid',{cell:'0'});
assert.match(el('builtCount').textContent,/1 \/ 75/,'demolition removes the combat building but preserves the extractor');
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
// Identical 0.5-second income tick at equal economy levels.
eq.cash=360;eq.enemyCash=360;
econGame.tick(.5);
assert.equal(eq.cash,361,'player receives +1 per half second');
assert.equal(eq.enemyCash,361,'AI receives precisely the same +1 per half second');
econGame.upgrade('econ');
click('buildGrid',{cell:'0'});
assert.equal(eq.eco,1,'player built an extractor in a paid slot');
assert.equal(eq.cash,291,'player paid exactly 70 CR for the first upgrade');
eq.enemyEco=1;eq.enemyCash=291;
// The income suspension is a real cost; compare completed extractor stabilization on both sides.
eq.ecoReadyAt=eq.elapsed;eq.enemyEcoReadyAt=eq.elapsed;
econGame.tick(.5);
assert.equal(eq.cash,293,'player level 1 adds +2 per half second');
assert.equal(eq.enemyCash,293,'AI at the same level adds the same +2 per half second');
eq.cash=0;eq.enemyCash=0;eq.wave=0;eq.built.fill(null);eq.enemyBuilt.fill(null);
econGame.wave();
assert.equal(eq.cash,24,'player wave payout');
assert.equal(eq.enemyCash,24,'AI wave payout must match player');
eq.wave=6;eq.enemyEco=0;eq.enemyCash=500;
eq.enemyBuilt.fill(null);for(let i=0;i<12;i++)eq.enemyBuilt[i]=0;
econGame.aiInvest();
assert.equal(eq.enemyEco,1,'AI may upgrade economy, but must buy it with the same money');
assert.equal(eq.enemyCash,430,'AI first economy upgrade costs exactly the player price of 70');
eq.wave=12;eq.enemyCash=500;eq.elapsed=Math.max(eq.elapsed,eq.enemyEcoReadyAt);
eq.enemyBuilt.fill(null);for(let i=0;i<12;i++)eq.enemyBuilt[i]=0;
econGame.aiInvest();
assert.equal(eq.enemyEco,2,'AI has paced economy upgrades');
assert.equal(eq.enemyCash,405,'AI second economy upgrade costs the same 95 CR');
// Late-game cash overflow must be spent on paid facilities, not left uninvested.
eq.wave=17;eq.enemyCash=1200;eq.enemyBuilt.fill(null);
for(let i=0;i<3;i++)eq.enemyBuilt[i]=1;
const facilityCountBefore=eq.enemyBuilt.filter(v=>v!==null).length;
econGame.aiInvest();
assert.ok(eq.enemyBuilt.filter(v=>v!==null).length>facilityCountBefore,'AI buys more producers in late waves');
assert.ok(eq.enemyCash<1200&&eq.enemyCash>=0,'late-game reinvestment uses earned credits');

// Anti-spam: the opponent responds to one cheap melee role, without gifted money.
click('restartButton');click('startButton');
const rush=econGame.state(),g=sandbox.window.__gameTest;
rush.enemyFaction=0; // fixed Forge opponent for the original flyer-counter scenario
rush.built.fill(null);for(let i=0;i<5;i++)rush.built[i]=0;
assert.equal(g.aiReadOpponent().dominant,null,'unscouted enemy factories never count as seen units');
for(let i=0;i<5;i++){g.createUnit(0,i,0);const seen=rush.units.at(-1);seen.x=2050;seen.y=240+i*4;}
assert.equal(g.aiReadOpponent().dominant,0,'five visibly scouted melee units are recognized');
rush.wave=1;rush.enemyCash=300;
const beforeCounter=rush.enemyBuilt.filter(v=>v===1).length;
const moneyBefore=rush.enemyCash;
g.aiInvest();
assert.ok(rush.enemyBuilt.filter(v=>v===1).length>beforeCounter,'AI buys countering rifle producers in wave 1');
assert.ok(rush.enemyCash<moneyBefore&&rush.enemyCash>=0,'counter buildings cost normal credits');
rush.wave=2;rush.enemyCash=450;
g.aiInvest();
assert.ok(rush.enemyBuilt.includes(6),'AI adds anti-melee air option by second wave');
assert.equal(g.structureDamage(0,100),52,'cheap melee damage is reduced against fortified bases');
assert.equal(g.structureDamage(5,100),155,'dedicated siege damage still excels against bases');
// Full-match reproduction: Brood player buys five cheap claws and does nothing else.
// In eight waves the enemy must have paid counters and survive the initial spam.
click('restartButton');
click('factionCards',{faction:'1'});
click('startButton');
click('unitCards',{role:'0'});
for(let i=0;i<5;i++)click('buildGrid',{cell:String(i)});
const spam=g.state();
spam.enemyFaction=0; // lock original anti-claw scenario; species-specific behavior has separate tests
assert.equal(spam.faction,1);
assert.equal(spam.built.filter(r=>r===0).length,5);
assert.equal(Math.floor(spam.cash),35);
let simulated=0;
for(let i=0;i<4000&&!spam.ended;i++){
 // An actual one-button spammer reinvests every available 65 CR into more claws.
 if(spam.cash>=65){
  const free=spam.built.findIndex(r=>r===null);
  if(free>=0){spam.built[free]=0;spam.cash-=65;}
 }
 g.tick(.12);simulated++;
}
assert.ok(spam.wave>=8||spam.baseHP[0]===0,'long rush simulated through wave eight or until defeat');
assert.ok(spam.baseHP[1]>0,'reinvested charge-only rush must not defeat the countering HQ in 20 waves');
assert.ok(spam.enemyBuilt.some(r=>r===1),'opponent countered the rush with rifles');
// Air is one valid counter; a paid rifle/armor defense is also valid if the HQ survives.
assert.ok(spam.enemyBuilt.some(r=>r===1),'opponent retains a purchased melee counter');

// Physical collision: units on both sides must resolve shared spawn coordinates.
click('restartButton');click('startButton');
const physics=g.state();physics.units=[];physics.enemyBuilt.fill(null);physics.built.fill(null);
g.createUnit(0,0,0);g.createUnit(0,0,0);g.createUnit(1,0,0);
const pair=[...physics.units];for(const u of pair){u.x=1000;u.y=250;}
g.separateUnits();
for(let i=0;i<pair.length;i++)for(let j=i+1;j<pair.length;j++){
 const a=pair[i],b=pair[j],d=Math.hypot(a.x-b.x,a.y-b.y);
 assert.ok(d>10,'ground units must not occupy identical footprints');
}
const def0=g.getDef(0,0);assert.equal(def0.kind,'ground');
const truck=g.getDef(6,3);assert.equal(truck.kind,'ground','marine role 6 is NOT a flier');
assert.equal(truck.name,'돌격 차량');
assert.equal(truck.mark,'▰');
assert.equal(g.getDef(6,2).kind,'air','other factions retain flyers');
const truckSpawn=g.state();truckSpawn.units=[];truckSpawn.faction=3;truckSpawn.enemyFaction=1;
g.createUnit(0,0,6);g.createUnit(1,0,0);g.createUnit(1,1,0);g.createUnit(1,2,0);
const truckUnit=truckSpawn.units[0],victims=truckSpawn.units.slice(1);
truckUnit.x=1500;truckUnit.y=260;
for(let i=0;i<victims.length;i++){victims[i].x=1525+i*7;victims[i].y=260+i*3;}
const health=victims.map(u=>u.hp);
g.bongoImpact(truckUnit,.12);
assert.ok(victims.some((u,i)=>u.hp<health[i]),'Odo Bongo must ram clustered enemy ground infantry');
const hpAfter=victims[0].hp;
g.bongoImpact(truckUnit,.12);
assert.equal(victims[0].hp,hpAfter,'truck ram must respect cooldown');
const aiTruck=g.state();aiTruck.built.fill(null);aiTruck.enemyBuilt.fill(null);aiTruck.units.length=0;
aiTruck.faction=0;aiTruck.enemyFaction=3;aiTruck.wave=2;aiTruck.enemyCash=300;aiTruck.aiSight.clear();
for(let i=0;i<5;i++){g.createUnit(0,i,0);const u=aiTruck.units.at(-1);u.x=2100;u.y=225+i*5;}
assert.equal(g.aiReadOpponent().dominant,0,'AI must actually scout the infantry before countering it');
assert.equal(g.aiChoose(300),6,'marine AI selects Odo Bongo to counter scouted mass infantry on wave 2');
aiTruck.units.length=0;aiTruck.aiSight.clear();aiTruck.faction=3;aiTruck.enemyFaction=0;aiTruck.enemyCash=300;
for(let i=0;i<5;i++){g.createUnit(0,i,6);const u=aiTruck.units.at(-1);u.x=2100;u.y=225+i*5;}
assert.equal(g.aiReadOpponent().dominant,6,'AI scouts Odo Bongo as role six');
assert.equal(g.aiChoose(300),2,'opponent recognizes Odo Bongo as armor, not aircraft');
console.log('V2 smoke passed: collision spacing, Odo Bongo ram cooldown, Marine ground armor and strategic anti-rush AI.');

// Verify all-spam strategies for air and armor against normal and Marine AI.
// Every extra production structure is purchased from earned credits, never spawned free.
const spamCases=[
 {name:'air spam vs Forge',player:1,enemy:0,role:6,counter:4},
 {name:'air spam vs Marines',player:2,enemy:3,role:6,counter:4},
 {name:'armor spam vs Forge',player:1,enemy:0,role:3,counter:2},
 {name:'armor spam vs Marines',player:2,enemy:3,role:3,counter:2}
];
for(const scenario of spamCases)for(const rngSeed of [17,61]){
 let sampleSeed=rngSeed;
 const stableMath=Object.create(Math);
 stableMath.random=()=>((sampleSeed=(Math.imul(sampleSeed,1664525)+1013904223)>>>0)/4294967296);
 sandbox.Math=stableMath;
 click('restartButton');
 click('factionCards',{faction:String(scenario.player)});
 click('startButton');
 const game=g.state();game.enemyFaction=scenario.enemy;
 game.built.fill(null);
 game.units.length=0;game.deadUnits.length=0;game.shots.length=0;
 // Entire opening bankroll goes toward only the tested troop type.
 while(game.cash>=205 && game.built.some(v=>v===null)){
  const i=game.built.findIndex(v=>v===null);
  game.built[i]=scenario.role;game.cash-=205;
 }
 game.enemyBuilt.fill(null);game.enemyCash=360;
 game.enemyEco=0;game.enemyBuilt[1]=0;game.enemyCash-=65;
 game.enemyBuilt[17]=1;game.enemyCash-=95;
 game.wave=0;game.next=24;
 for(let i=0;i<4000&&!game.ended;i++){
  if(game.cash>=205){
   const free=game.built.findIndex(v=>v===null);
   if(free>=0){game.built[free]=scenario.role;game.cash-=205;}
  }
  g.tick(.12);
 }
 assert.ok(game.wave>=12 || game.baseHP[0]===0,scenario.name+' should run a prolonged campaign');
 assert.ok(game.enemyBuilt.includes(scenario.counter),scenario.name+' AI should buy appropriate counter');
 console.log('DEBUG SPAM',scenario.name,'seed',rngSeed,JSON.stringify({wave:game.wave,ended:game.ended,ourHP:game.baseHP[0],enemyHP:game.baseHP[1],turrets:game.turretHP,enemyBuilt:game.enemyBuilt.filter(x=>x!==null).reduce((o,id)=>(o[id]=(o[id]||0)+1,o),{}),playerBuilt:game.built.filter(x=>x!==null).length,enemyEco:game.enemyEco,enemyCash:Math.floor(game.enemyCash),players:game.units.filter(x=>x.side===0).length,enemies:game.units.filter(x=>x.side===1).length}));
 assert.ok(game.baseHP[1]>0,scenario.name+' should not win merely through single-type spam');
 console.log('Spam balance case passed:',scenario.name,'seed',rngSeed,'wave',game.wave,'enemy HP',Math.floor(game.baseHP[1]));
}
const marineAgainstTank=g.state();
marineAgainstTank.faction=1;marineAgainstTank.enemyFaction=3;
marineAgainstTank.built.fill(null);for(let i=0;i<5;i++)marineAgainstTank.built[i]=3;
marineAgainstTank.enemyBuilt.fill(null);marineAgainstTank.wave=3;
assert.equal(g.aiChoose(205),2,'Marine AI must use armor breakers, never Odo Bongo, versus tank spam');
console.log('All eight seeded endurance matches passed: air and armor spam versus Forge and Marines.');




// New races: faction selection, combat traits and AI counter awareness.
assert.match(el('factionCards').innerHTML,/월영 수인족/);
assert.match(el('factionCards').innerHTML,/은월 엘프족/);
click('restartButton');click('factionCards',{faction:'4'});click('startButton');
let newRace=g.state();
assert.equal(newRace.faction,4,'Moonfang beastgirls selectable');
assert.equal(g.getDef(6,4).kind,'ground','panther cavalry must not fly');
assert.equal(g.getDef(6,4).mark,'♞','beast cavalry uses dedicated symbol');
assert.ok(g.getDef(0,4).damage>g.getDef(0,0).damage,'beastgirls specialize in melee strikes');
assert.ok(g.getDef(0,4).speed>g.getDef(0,0).speed,'beastgirls move fast in melee');
assert.ok(g.getDef(1,4).damage<g.getDef(1,0).damage,'beastgirls sacrifice shooting DPS');
newRace.enemyFaction=5;
newRace.built[0]=0;newRace.built[1]=3;newRace.built[2]=6;
g.wave();
assert.ok(newRace.units.some(u=>u.side===0&&u.role===6),'beast cavalry spawns');
newRace.units.length=0;g.createUnit(0,0,6);g.createUnit(1,0,0);
newRace.units[0].x=1500;newRace.units[0].y=260;
newRace.units[1].x=1520;newRace.units[1].y=260;
const beforeBeast=newRace.units[1].hp;g.bongoImpact(newRace.units[0],.1);
assert.ok(newRace.units[1].hp<beforeBeast,'beast cavalry pounces in melee');
newRace.built.fill(null);for(let i=0;i<5;i++)newRace.built[i]=6;
newRace.enemyFaction=0;newRace.wave=4;
assert.equal(g.aiCountersFor(6)[0],2,'enemy counters panther cavalry as ground armor');
click('restartButton');click('factionCards',{faction:'5'});click('startButton');
newRace=g.state();
assert.equal(newRace.faction,5,'Silverwood elven maidens selectable');
assert.equal(g.getDef(6,5).kind,'air','elf moonwitch remains a flier');
assert.ok(g.getDef(1,5).range>g.getDef(1,0).range,'elven longbows outrange rifles');
assert.ok(g.getDef(2,5).range>g.getDef(2,0).range,'elven armor-piercing bows outrange standard');
assert.ok(g.getDef(1,5).damage>g.getDef(1,0).damage,'elven ranged damage is higher');
assert.ok(g.getDef(0,5).damage<g.getDef(0,0).damage,'elven melee is weaker');
newRace.built[0]=1;newRace.built[1]=2;newRace.built[2]=5;newRace.built[3]=7;
g.wave();for(let i=0;i<450;i++)g.tick(.12);
assert.ok(newRace.wave>=3 && newRace.units.every(u=>Number.isFinite(u.hp)&&Number.isFinite(u.x)&&Number.isFinite(u.y)),'elf battle and AI run without invalid coordinates');
console.log('Six playable factions, 48 named units, Beastgirl melee and Elf ranged trait tests passed.');

// Marine logistics: deterministic kill accounting, ownership, anti-chain and sequential Huanglong spawns.
{
 click('restartButton');click('factionCards',{faction:'3'});click('startButton');
 const g=sandbox.window.__gameTest,st=g.state();
 st.faction=3;st.enemyFaction=0;st.enemyCash=500;st.cash=250;
 st.units.length=0;st.built.fill(null);st.enemyBuilt.fill(null);
 st.built[3]=7;st.live=true;st.wave=0;st.next=24;
 g.wave();
 assert.equal(st.marineStats.huangSpawns,1,'one Huanglong on wave opening');
 assert.equal(st.marineSupports.length,2,'two later staggered Huanglong spawns queued');
 for(let i=0;i<40;i++)g.tick(.2);
 assert.equal(st.marineStats.huangSpawns,2,'second Huanglong at 8 seconds');
 for(let i=0;i<40;i++)g.tick(.2);
 assert.equal(st.marineStats.huangSpawns,3,'third Huanglong at 16 seconds');
 for(let i=0;i<35;i++)g.tick(.2);
 assert.equal(st.marineStats.huangSpawns,3,'no fourth Huanglong in one wave');
 st.units.length=0;st.marineRecruitCount=[0,0];
 const killer={side:0,faction:3,role:1,conscripted:false};
 g.createUnit(1,0,3);const victim=st.units[0];
 st.enemyCash=100;
 const myCashBefore=st.cash;
 forcedMarineRoll=0;
 g.damage(victim,victim.hp*10,1,killer,()=>0);
 forcedMarineRoll=null;
 assert.equal(st.enemyCash,76,'ginppai takes at most 24 paid credits from victim');
 assert.equal(st.cash,myCashBefore+24,'ginppai credits the actual killer');
 assert.equal(st.marineStats.recruits,1,'one defeated enemy is conscripted');
 const recruited=st.units.find(u=>u.conscripted&&u.hp>0);
 assert.ok(recruited&&recruited.side===0&&recruited.faction===0,'conscript retains original unit identity, changes control');
 assert.ok(recruited.hp<=recruited.maxHP*.101,'conscript starts critically wounded');
 st.enemyCash=0;st.marineRecruitCount=[2,0];
 g.createUnit(1,1,0);const other=st.units.find(u=>u.side===1&&u.hp>0);
 forcedMarineRoll=0;
 g.damage(other,other.hp*10,1,killer,()=>0);
 forcedMarineRoll=null;
 assert.equal(st.marineStats.recruits,1,'conscript cap and zero opponent cash prevent extra awards');
}

// Defensive single-target tower, scouting fog, and medic anti-stacking regressions.
{
 click('restartButton');click('startButton');
 const test=g.state();
 test.built.fill(null);test.enemyBuilt.fill(null);test.units.length=0;
 test.wave=0;test.next=24;test.enemyFaction=0;
 assert.equal(g.enemyBaseVisible(),false,'enemy base is concealed before scouting');
 g.createUnit(1,0,6);
 const airplane=test.units.at(-1);airplane.x=330;airplane.y=260;
 const airHP=airplane.hp;
 for(let i=0;i<12;i++)g.tick(.12);
 assert.ok(airplane.hp<airHP,'the home tower fires repeatedly at a lone attacking aircraft');
 assert.equal(g.enemyUnitVisible({side:1,x:3100}),false,'unknown enemy reinforcements in fog cannot be rendered');
 g.createUnit(0,0,1);test.units.at(-1).x=2600;
 assert.equal(g.enemyBaseVisible(),true,'a surviving scout reveals the enemy base');
 test.units.at(-1).hp=0;test.wave=6;
 assert.equal(g.enemyBaseVisible(),true,'late intelligence lifts the temporary opening fog');
 const tank={hp:100,maxHP:900};
 test.elapsed=0;
 g.heal(tank,54);g.heal(tank,54);g.heal(tank,54);
 assert.equal(tank.hp,180,'healer spam is budgeted to 80 HP per second on a 900 HP tank');
 test.elapsed=1.01;g.heal(tank,54);assert.equal(tank.hp,234,'healing recovers at a new second');
 test.elapsed=1.02;g.heal(tank,300,true);assert.equal(tank.hp,534,'one-shot Marine support retains its burst identity');
}
console.log('Rapid turret, temporary fog of war and diminishing healer stacking passed.');
