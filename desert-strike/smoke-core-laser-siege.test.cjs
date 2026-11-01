'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {solo,multi}=require('./combat-balance-harness.cjs');

function single(faction=0,rival=0){
 const {G}=solo(7341);G.reset();const s=G.state();
 Object.assign(s,{faction,enemyFaction:rival,live:true,wave:20,elapsed:100,next:1e9,aiNextThink:Infinity});
 return {G,s};
}
function multiplayer(faction=0,rival=0,mode='classic'){
 const {E}=multi(7341),game=E.create({mode,size:1,members:[{uid:'a',team:0,faction},{uid:'b',team:1,faction:rival}]});
 game.state.wave=20;game.state.seconds=100;game.state.next=1e9;
 return {E,game,s:game.state};
}
test('solo core laser only activates after turret falls, locks one target and shoots at 2x turret rate',()=>{
 const {G,s}=single();G.createUnit(1,0,1);
 const u=s.units.at(-1);Object.assign(u,{x:290,y:260,hp:10000,maxHP:10000,cooldown:1000});
 s.forwardHP[0]=0;s['cool0']=1000;const before=u.hp;
 G.tick(.05);assert.equal(u.hp,before,'healthy turret prevents core laser');
 s.turretHP[0]=0;G.tick(.05);
 assert.ok(u.hp<before,'exposed core immediately attacks');assert.equal(s.coreLaserTarget[0],u.uid);
 assert.ok(s.towerShots.some(shot=>shot.kind==='coreLaser'),'solo beam is visually represented');
 const once=u.hp;G.tick(.2);
 assert.ok(u.hp<once,'laser fires again within 0.2 seconds, faster than turret');
});
test('multiplayer core lasers are per-lane, focus one unit, and snapshot their beam for clients',()=>{
 const {game,s}=multiplayer();s.forwardHP[0][0]=0;s.towerCooldown[0][0]=1000;
 const u={id:717,uid:'b',team:1,faction:1,role:1,lane:0,x:290,y:260,hp:10000,maxHP:10000,
   radius:15,cool:1000,frame:0,act:'idle'};
 s.units.push(u);const before=u.hp;
 game.tick(.05);assert.equal(u.hp,before,'healthy turret blocks core laser');
 s.turrets[0][0]=0;game.tick(.05);
 assert.ok(u.hp<before,'core hits single enemy');assert.equal(s.coreLaserTarget[0][0],u.id);
 assert.ok(game.snapshot('a').effects.some(e=>e.kind==='coreLaser'&&e.lane===0&&e.team===0),'beam is visible to client');
 const once=u.hp;game.tick(.2);assert.ok(u.hp<once,'double-rate laser re-fires');
});
test('assassin reliably kills a standard artillery troop with an ordinary hit on wave 20, single and multiplayer',()=>{
 const {G,s}=single(4,3);
 G.createUnit(0,0,10);const killer=s.units.at(-1);G.createUnit(1,0,5);const siege=s.units.at(-1);
 killer.firstAssassinStrike=true;G.fire(killer,siege);
 assert.equal(siege.hp,0,'solo assassin anti-artillery hit should finish a regular marine siege unit');
 const {game,s:ms}=multiplayer(4,3);
 game.__test.spawn(ms.players[0],0,0,10);const a=ms.units.at(-1);
 game.__test.spawn(ms.players[1],0,0,5);const b=ms.units.at(-1);
 a.firstAssassinStrike=true;game.__test.attack(a,b);
 assert.ok(b.hp<=0,'multiplayer host assassin should kill standard artillery without relying on first-strike bonus');
});
test('sniper loses its one-shot versus assault counters in both engines across all ten factions',()=>{
 for(let faction=0;faction<10;faction++){
  const rival=(faction+3)%10,{G,s}=single(faction,rival);
  G.createUnit(0,0,9);const sniper=s.units.at(-1);
  G.createUnit(1,0,0);const charge=s.units.at(-1),original=charge.hp;
  G.damage(charge,G.getDef(9,faction).damage,9,sniper);
  assert.ok(charge.hp>0&&charge.hp<original,'solo assault must survive initial sniper hit: '+faction);
  const {game,s:ms}=multiplayer(faction,rival);
  game.__test.spawn(ms.players[0],0,0,9);const shooter=ms.units.at(-1);
  game.__test.spawn(ms.players[1],0,0,0);const victim=ms.units.at(-1),full=victim.hp;
  game.__test.attack(shooter,victim);
  assert.ok(victim.hp>0&&victim.hp<full,'host assault must survive initial sniper hit: '+faction);
 }
});
test('artillery advances into forward tower return-fire radius, including elf +10% range in both engines',()=>{
 for(const faction of [0,5]){
  const {G,s}=single(faction,1);G.createUnit(0,0,5);const u=s.units.at(-1);
  Object.assign(u,{x:2110,y:260,hp:10000,maxHP:10000,cooldown:0});
  for(let i=0;i<85;i++)G.tick(.2);
  assert.ok(s.forwardHP[1]<1000,'solo siege must hit tower: faction '+faction);
  assert.ok(u.hp<10000,'solo tower must hit the siege unit: faction '+faction);
  const {game,s:ms}=multiplayer(faction,1);
  game.__test.spawn(ms.players[0],0,0,5);const a=ms.units.at(-1);
  Object.assign(a,{x:2110,y:260,hp:10000,maxHP:10000,cool:0});
  for(let i=0;i<85;i++)game.tick(.2);
  assert.ok(ms.forwardHP[0][1]<1000,'multi siege must hit tower: faction '+faction);
  assert.ok(a.hp<10000,'multi tower must retaliate: faction '+faction);
 }
});
