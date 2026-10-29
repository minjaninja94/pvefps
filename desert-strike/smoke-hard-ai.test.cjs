'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const cost=[65,100,185,285,185,360,300,220];
function environment(roll){const w={},math=Object.create(Math);math.random=()=>roll;const ctx={window:w,Math:math,console,Map,Set,Array,Number,Object,String};vm.runInNewContext(read('defense-guardian.js'),ctx);vm.runInNewContext(read('unit-consolidation.js'),ctx);vm.runInNewContext(read('hard-ai.js'),ctx);vm.runInNewContext(read('tri-lane-engine.js').replace('return {state,order,tick,wave,snapshot,definition};','return {state,order,tick,wave,snapshot,definition,hardBotPurchase};'),ctx);return {w,ctx};}
const results=[];
for(const roll of [.01,.26,.51,.76])for(const faction of [0,3,4,7,9]){
 const {w}=environment(roll),E=w.DesertTriEngine;
 const e=E.create({aiDifficulty:'veryhard',members:[{uid:'human',team:0,faction:0},{uid:'bot',team:1,faction,bot:true}]}),s=e.state,p=s.players[1];
 s.next=1000000;let earned=360;
 assert.equal(p.cash+p.hardBrain.spent,360,'all initial units and extractors are paid from equal starting cash');
 const opening=p.buildings.flat().filter(x=>x!==null&&x!==8);
 assert.ok(opening.includes(roll<.25||roll>.75?3:roll<.5?6:0),'proactive opening is independent of opponent composition');
 for(let step=1;step<=2400;step++){
  const old=s.seconds,level=p.eco,ready=p.ecoReadyAt;
  const next=old+.2;
  for(let slice=Math.floor(old*2)+1;slice<=Math.floor(next*2);slice++)if(slice*.5+1e-6>=ready)earned+=E.incomePerTick(level);
  s.units.length=0;e.tick(.2);
  if(step%Math.round(E.WAVE_INTERVAL/.2)===0){if(s.seconds>=p.ecoReadyAt)earned+=24;e.wave();}
  assert.ok(p.cash>=0,'no borrowing');
  assert.ok(Math.abs(p.cash+p.hardBrain.spent-earned)<1e-6,'no bonus income, free purchases or stabilization catch-up');
  assert.equal(p.buildings.flat().filter(r=>r===8).length,p.eco,'every income upgrade consumes a real slot');
 }
 assert.ok(p.eco>=3,'regular paid economy development');
 assert.ok(p.cash<Math.max(E.ecoPrice(p.eco),...E.COST.slice(0,8)),'bank only the next actual construction cost');
 assert.ok(new Set(p.buildings.flat().filter(r=>r!==null&&r!==8)).size>=4,'develop a planned combined army instead of only cheap units');
 results.push({plan:w.DesertHardAI.plans[p.hardBrain.plan].id,faction,eco:p.eco,cash:p.cash,army:p.buildings.flat().filter(r=>r!==null&&r!==8).length});
 assert.equal(e.snapshot('human').aiDifficulty,'veryhard');assert.equal(e.snapshot('human').players[1].cash,null,'hard mode does not reveal enemy resources');
}
// Verify threat handling only consumes the explicitly supplied scouted intel.
const {w}=environment(.01),ai=w.DesertHardAI,brain=ai.create(0,()=>.01);brain.opening=2;
const counts=[2,2,1,1,0,1,0,0],base={cash:500,counts,eco:7,readyAt:0,seconds:200,costs:cost,ecoCost:600};
const normal=ai.choose({...brain},base),air=ai.choose({...brain},{...base,intel:{air:9}});
assert.notEqual(normal.role,air.role);assert.equal(air.role,4,'observed aircraft receive genuine anti-air support');
const queued={...brain,nextRole:3,lastThreat:''};assert.equal(ai.choose(queued,{...base,intel:{air:9}}).role,4,'new scouting revises a queued purchase');
assert.equal(ai.choose({...brain},{...base,eco:0,ecoCost:70}).kind,'econ');assert.equal(ai.choose({...brain},{...base,eco:0,ecoCost:70,intel:{air:9}}).kind,'unit','delay greed when air defense is missing');
// Every proactive plan must pivot paid construction when it scouts one-role hero spam.
for(let plan=0;plan<4;plan++)for(let major=0;major<8;major++){
 const brain={...ai.create(0,()=>plan/4+.01),opening:99,nextRole:7,lastThreat:''};
 const counts=Array(8).fill(2),roles=Array(8).fill(0);roles[major]=20;
 const counters=[[1,3],[3,5],[0,1],[2,6],[2,3],[0,6],[2,3],[0,5]][major];
 const action=ai.choose(brain,{...base,counts,intel:{roles}});assert.ok(counters.includes(action.role),`plan ${plan} must counter observed role ${major}`);
 assert.equal(ai.choose({...brain},{...base,cash:0,counts,intel:{roles}}),null,'counter units still require real money');
}
const flierRoles=[0,0,0,0,0,0,20,0];assert.equal(ai.choose({...brain},{...base,counts:Array(8).fill(2),intel:{roles:flierRoles,air:20}}).role,4,'actual flying special spam receives anti-air, ground specials do not');
assert.equal(ai.choose({...brain},{...base,eco:0,ecoCost:70,counts:[0,6,0,4,0,0,0,0],intel:{roles:[20,0,0,0,0,0,0,0]}}).kind,'econ','resume income development once real counter production is ready');
// Integration: one visible aggregate means twenty troops, and production follows its band.
const probe=environment(.01),pe=probe.w.DesertTriEngine.create({aiDifficulty:'veryhard',members:[{uid:'human',team:0,faction:0},{uid:'bot',team:1,faction:0,bot:true}]}),bot=pe.state.players[1];
bot.buildings.forEach(row=>row.fill(null));bot.hardBrain.opening=99;bot.cash=2000;
pe.state.units.push({id:900,team:0,faction:0,role:0,lane:2,x:2000,y:1300,hp:2000,maxHP:2000,heroCount:20});
let scouted;const original=probe.w.DesertHardAI;
probe.w.DesertHardAI={...original,choose:(b,data)=>{scouted=data.intel;return original.choose(b,data);}};
pe.hardBotPurchase(bot);assert.equal(scouted.roles[0],20);
const bands=bot.buildings.map(row=>row.filter(r=>r!==null).length);assert.ok(bands[2]>bands[0]&&bands[2]>bands[1],'reinforce the observed hero lane instead of spreading evenly');
assert.ok(bot.buildings.flat().filter(r=>[1,3].includes(r)).length>=bot.buildings.flat().filter(r=>r!==null).length*.6,'paid counter production dominates against a scouted assault hero');
// Real solo integration: paid opening, blackout, one-second think cadence and HUD.
const elements=new Map(),noop=()=>{},g=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});
const el=id=>{if(!elements.has(id))elements.set(id,{style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop},getContext:()=>g,querySelectorAll:()=>[],addEventListener:noop});return elements.get(id);};
const env=environment(.01),sw=env.w;Object.assign(env.ctx,{document:{getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({getContext:()=>g})},requestAnimationFrame:noop,Date});sw.DesertLobby={aiDifficulty:()=> 'veryhard',difficultyLabel:()=> '아주 어려움'};
vm.runInNewContext(read('game-v2.js').replace('initFactions();wire();reset();','window.testHard={state:()=>state,reset,aiInitialBuild,hardInvest,hardEmergency,detonateEmergency,hardBarrage,hardResearch,constructExtractor,tick};reset();'),env.ctx);
const api=sw.testHard;api.aiInitialBuild();
const first=Array.from(api.state().enemyBuilt),cashOpening=api.state().enemyCash;api.reset();api.state().built.fill(6);api.aiInitialBuild();assert.deepEqual(Array.from(api.state().enemyBuilt),first,'hidden aircraft factories cannot alter the proactive opening');assert.equal(api.state().enemyCash,cashOpening);
const s=api.state();s.live=true;s.next=100000;
assert.equal(s.aiDifficulty,'veryhard');assert.equal(s.enemyCash+s.hardBrain.spent,360);assert.ok(s.enemyBuilt.includes(3));
// Buy the paid opening army first, then wait for an affordable extractor.
// Higher-tier prices must delay that investment rather than grant free CR.
for(let n=0;n<3000&&s.enemyEco===0;n++)api.tick(.04);
assert.equal(s.enemyEco,1);assert.ok(s.enemyEcoReadyAt>s.elapsed);const before=s.enemyCash,spent=s.hardBrain.spent;
for(let n=0;n<75;n++)api.tick(.04);
assert.equal(s.enemyCash+s.hardBrain.spent,before+spent,'solo hard AI pays the same stabilization penalty');
assert.ok(elements.get('enemyFactionLabel').textContent.includes('아주 어려움 AI'));
const soloAI=sw.DesertHardAI;let soloIntel;sw.DesertHardAI={...soloAI,choose:(b,data)=>{soloIntel=data.intel;return soloAI.choose(b,data);}};
s.units=[{side:0,faction:0,role:0,x:2000,y:260,hp:2000,maxHP:2000,heroCount:20}];api.hardInvest();assert.equal(soloIntel.roles[0],20,'solo scouts count an observed aggregate as twenty soldiers');

// Exact two-role failure case: a shield of spearmen in front of a 70%
// siege backline should trigger balanced cavalry, armor and rifle production.
{
 const army=[13,5,0,1,0,1,10,2],sightings=[12,0,0,0,0,28,0,0];
 const target=ai.choose({...brain,opening:99,nextRole:null,lastThreat:''},
  {...base,cash:800,eco:5,counts:army,intel:{roles:sightings,air:0,armor:0}});
 assert.equal(target.role,3,'protected artillery needs a real armored screen, not more light melee');
 const armored=[13,5,0,9,0,1,10,2];
 const follow=ai.choose({...brain,opening:99,nextRole:null,lastThreat:''},
  {...base,cash:800,eco:5,counts:armored,intel:{roles:sightings,air:0,armor:0}});
 assert.equal(follow.role,1,'after armor, hard AI should add ranged infantry to thin supporting spears');
 assert.equal(ai.choose({...brain,opening:99,nextRole:null,lastThreat:''},
  {...base,cash:0,eco:5,counts:army,intel:{roles:sightings}}),null,
  'siege counter tactics still require normal CR');
}

// Solo hard AI reacts to a player extractor immediately, without gifted CR or
// bypassing either side's paid blackout. It saves for unaffordable catch-up.
api.reset();
const mirror=api.state();mirror.live=true;mirror.enemyCash=1000;mirror.cash=1000;
assert.equal(api.constructExtractor(0,0),true);
assert.equal(mirror.eco,1);
assert.equal(mirror.enemyEco,1,'hard AI must match the human extractor immediately when ready and funded');
assert.equal(mirror.enemyCash,930,'hard AI pays the identical level-one 70 CR cost');
assert.equal(mirror.enemyBuilt.filter(x=>x===8).length,1,'AI extractor occupies a real factory slot');
assert.equal(mirror.enemyEcoReadyAt,mirror.ecoReadyAt,'both sides incur the same construction plus stabilization blackout');
assert.equal(api.constructExtractor(0,1),false,'human cannot bypass own stabilization');
mirror.elapsed=mirror.ecoReadyAt+.01;
assert.equal(api.constructExtractor(0,1),true);
assert.equal(mirror.enemyEco,2,'next human upgrade is mirrored immediately after blackout');
assert.equal(mirror.enemyCash,835,'level-two extractor costs 95 CR');
mirror.elapsed=mirror.ecoReadyAt+.01;mirror.enemyCash=0;
assert.equal(api.constructExtractor(0,2),true);
assert.equal(mirror.enemyEco,2,'AI never buys the missing extractor with free money');
const priorBuildings=mirror.enemyBuilt.filter(x=>x!==null).length;
api.hardInvest();
assert.equal(mirror.enemyBuilt.filter(x=>x!==null).length,priorBuildings,'AI saves for the exact missing extractor instead of spending on units');
mirror.enemyCash=129;
api.hardInvest();
assert.equal(mirror.enemyEco,3,'AI resumes the queued upgrade when funds are available');
assert.equal(mirror.enemyCash,0,'queued extractor consumes its actual 129 CR price');
assert.equal(mirror.enemyMineCosts[2],129,'third level is recorded at its real cost');
assert.ok(mirror.enemyEcoReadyAt>mirror.elapsed,'AI also suffers the third-level blackout');

// A human player's one shot must also clear every enemy on a healthy map.
api.reset();
const own=api.state();own.live=true;own.baseHP[0]=8640;
own.units.push({uid:65001,side:0,faction:0,role:1,x:260,y:260,hp:120,maxHP:120});
for(let i=0;i<35;i++)own.units.push({uid:66000+i,side:1,faction:0,role:0,
 x:500+i*65,y:120+(i%3)*70,hp:110,maxHP:110});
own.shots.push({side:1,source:1,x:3200});
own.shots.push({side:0,source:1,x:220});
assert.equal(api.detonateEmergency(0),true,'a human can nuke without base damage');
assert.equal(own.nukes,0);
assert.equal(own.units.length,1,'solo human nuke wipes every opposing unit');
assert.equal(own.units[0].side,0,'nuke protects the firing side');
assert.equal(own.shots.length,1,'dead enemy projectiles cannot damage after the strike');
assert.equal(own.combatStats[1].losses[0],35);
assert.equal(api.detonateEmergency(0),false,'single human nuke cannot be reused');

// The hard AI reserves its single nuclear charge while winning or when the
// enemy is too small. It fires on 100+ soldier-equivalents while losing.
// The hit always clears EVERY opponent, even those far outside the front.
api.reset();const nuke=api.state();nuke.live=true;nuke.aiDifficulty='veryhard';nuke.next=100000;
const unit=(i,x=2380)=>({uid:40000+i,side:0,faction:0,role:0,x,y:260+i%3*20,
 hp:100,maxHP:100,killed:false,heroCount:1});
for(let i=0;i<99;i++)nuke.units.push(unit(i,1200));
nuke.units.push({...unit(99),x:180});
nuke.units.push({uid:999888,side:1,role:0,faction:0,hp:100,maxHP:100,x:3000,y:240});
assert.equal(api.hardEmergency(),false,'99+1 enemies while AI is winning must not waste the nuclear strike');
nuke.baseHP[1]=8640*.38;
assert.equal(api.hardEmergency(),true,'AI fires on 100 enemies when the base is under pressure');
assert.equal(nuke.enemyNukes,0,'one real AI nuclear charge is consumed');
assert.equal(nuke.units.length,1,'nuke clears opponents everywhere and preserves allies');
assert.equal(nuke.units[0].side,1);
assert.equal(nuke.combatStats[0].losses[0],100,'all 100 eliminated soldiers are reported');
assert.equal(api.hardEmergency(),false,'AI cannot launch a second nuke');
api.reset();const save=api.state();save.live=true;save.aiDifficulty='veryhard';
save.baseHP[1]=8640*.38;for(let i=0;i<99;i++)save.units.push(unit(i));
assert.equal(api.hardEmergency(),false,'hard AI saves its charge below 100 while the base is not critical');
assert.equal(save.enemyNukes,1);
save.baseHP[1]=8640*.14;
assert.equal(api.hardEmergency(),true,'at 14% core HP the last-chance override prevents silent defeat');
assert.equal(save.units.length,0);
api.reset();const heroNuke=api.state();heroNuke.live=true;heroNuke.aiDifficulty='veryhard';heroNuke.baseHP[1]=8640*.39;
for(let i=0;i<5;i++)heroNuke.units.push({uid:50000+i,side:0,role:5,faction:0,
 x:1400+i*250,y:100+i*50,hp:2000,maxHP:2000,heroCount:20});
assert.equal(api.hardEmergency(),true,'five 20-soldier heroes count as 100 and are wiped regardless of position');
assert.equal(heroNuke.combatStats[0].losses[5],100);

// Hard AI must never hold all resources for an unaffordable research upgrade.
api.reset();const upgrades=api.state();upgrades.live=true;upgrades.wave=9;
for(let i=0;i<7;i++)upgrades.enemyBuilt[i]=0;
upgrades.enemyCash=80;
assert.equal(api.hardResearch(),false,'unaffordable research must not freeze every factory purchase');
assert.equal(upgrades.enemyCash,80);

// The paid hard-only barrage sees a true 20-soldier hero as a valuable cluster,
// spends exactly 260 CR and obeys the same 32s cooldown as the player.
api.reset();const artillery=api.state();
artillery.live=true;artillery.wave=5;artillery.aiDifficulty='veryhard';artillery.enemyCash=580;
const packed={uid:10020,side:0,faction:0,role:0,x:2400,y:260,
 hp:2200,maxHP:2200,heroCount:20,killed:false};
artillery.units.push(packed,{...packed,uid:10021,x:2410},{...packed,uid:10022,x:2390});
assert.equal(api.hardBarrage(),true,'hard AI uses a paid blast against a scouted packed hero');
assert.equal(artillery.enemyCash,320,'AI barrage is charged the same 260 CR');
assert.equal(artillery.enemyBarrageCd,32);
assert.ok(packed.hp<2200);
assert.equal(api.hardBarrage(),false,'AI barrage cannot fire again during cooldown');
artillery.enemyBarrageCd=0;artillery.aiDifficulty='normal';
assert.equal(api.hardBarrage(),false,'normal AI does not receive hard-only tactical automation');

// Multiplayer: same global effect for AI, human and team-wide (3-lane) combat.
const coopEnv=environment(.28),co=coopEnv.w.DesertTriEngine.create({mode:'coop',size:2,aiDifficulty:'veryhard',
 members:[{uid:'a',team:0,faction:0},{uid:'b',team:0,faction:2}]}),
 coopState=co.state,firstBot=coopState.players.find(p=>p.bot);
coopState.seconds=6;coopState.next=999999;
for(let i=0;i<100;i++)coopState.units.push({id:99990+i,uid:'a',team:0,faction:0,role:0,lane:i%3,
 x:2200+(i%5)*25,y:260+(i%3)*520,hp:180,maxHP:180,heroCount:1});
const allyOwner=firstBot.uid;
coopState.units.push({id:80000,uid:allyOwner,team:1,faction:firstBot.faction,
 role:1,lane:0,x:3030,y:280,hp:300,maxHP:300});
coopState.cores[0][1]=3000*.38;
co.tick(.2);
assert.equal(firstBot.nukes,0,'hard multi AI uses one charge on 100 enemies under pressure');
assert.equal(coopState.units.filter(u=>u.team===0).length,0,'nuke wipes all three lanes');
assert.ok(coopState.units.some(u=>u.id===80000),'friendly army survives the nuclear strike');
assert.equal(coopState.players[0].combatStats.losses[0],100,'multi match report counts all casualties');
{
 const fx=environment(.12),e=fx.w.DesertTriEngine.create({mode:'pvp',size:1,members:[
  {uid:'h',team:0,faction:0},{uid:'v',team:1,faction:0}]}),s=e.state;
 for(let i=0;i<7;i++)s.units.push({id:700+i,uid:'v',team:1,role:0,faction:0,
  lane:0,x:800+i*350,y:260,hp:100,maxHP:100});
 s.units.push({id:790,uid:'h',team:0,role:2,faction:0,lane:0,x:210,y:260,hp:130,maxHP:130});
 const fired=e.order('h',{type:'tactic',kind:'nuke'});
 assert.equal(fired.ok,true,'a human multiplayer player may fire while the base is healthy');
 assert.equal(fired.soldiers,7);
 assert.equal(s.players[0].nukes,0);
 assert.equal(s.units.length,1,'global nuke leaves the human ally and no enemy across the map');
 assert.equal(e.order('h',{type:'tactic',kind:'nuke'}).ok,false,'one shot only');
}
console.log('Hard AI passed: 20 eight-minute ledgers, four proactive openings, ground special factions, regular paid economy, zero resource bonuses, actual slot/blackout costs, bounded next-purchase reserves, 32 scouted concentration responses, ground/air distinction, economy resumption, observed hero lane reinforcement, solo and three-line integration.');
console.log(JSON.stringify(results.filter(x=>x.faction===0)));
