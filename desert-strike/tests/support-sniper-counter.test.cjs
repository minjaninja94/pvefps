const {test}=require('node:test'),assert=require('node:assert/strict'),{solo,multi}=require('../combat-balance-harness.cjs');
function setup(faction=0,enemy=0){
 const S=solo(),M=multi();S.G.reset();const s=S.G.state();Object.assign(s,{faction,enemyFaction:enemy,live:true,wave:1,elapsed:20,next:999,aiNextThink:Infinity});
 const m=M.E.create({mode:'classic',size:1,members:[{uid:'a',team:0,faction},{uid:'b',team:1,faction:enemy}]});Object.assign(m.state,{wave:1,seconds:20,next:999});
 function add(side,role,x,y=260){S.G.createUnit(side,0,role);m.__test.spawn(m.state.players[side],0,0,role);const a=s.units.at(-1),b=m.state.units.at(-1);for(const u of [a,b])Object.assign(u,{x,y,spawnAge:1,cool:0,cooldown:0});return [a,b];}
 return {S,M,s,m,add};
}
test('Huanglong advances alone, follows distant frontline instead of fresh rear troops, and consumes itself to heal',()=>{
 for(const isolated of [true,false]){
  const p=setup(3),[a,b]=p.add(0,7,250);
  if(!isolated){p.add(0,0,270);p.add(0,3,1700);}
  for(let i=0;i<20;i++){p.S.G.tick(.05);p.m.tick(.05);}
  assert.ok(a.x>280,'solo support moves toward the rally/frontline');assert.ok(b.x>280,'multiplayer support moves toward the rally/frontline');
 }
 const p=setup(3),[a,b]=p.add(0,7,1000),[x,y]=p.add(0,3,1120);x.hp-=100;y.hp-=100;
 for(let i=0;i<60;i++){p.S.G.tick(.05);p.m.tick(.05);}
 assert.ok(a.hp<=0&&b.hp<=0,JSON.stringify({support:[a.hp,b.hp],x:[a.x,b.x],patient:[x.hp,y.hp],max:[x.maxHP,y.maxHP]}));assert.equal(x.hp,x.maxHP);assert.equal(y.hp,y.maxHP);
});
test('snipers select backline riflemen through a melee screen and distribute their pending lethal shots',()=>{
 const p=setup(),[a,b]=p.add(0,9,1300),[a2,b2]=p.add(0,9,1305);p.add(1,0,1380);
 const [r1,t1]=p.add(1,1,1580),[r2,t2]=p.add(1,1,1600);
 assert.equal(p.S.G.nearestUnit(a,p.S.G.getDef(9,0)),r1);
 p.S.G.tick(.05);p.m.tick(.05);
 assert.ok([r1,r2].includes(a.strike?.target));assert.ok([r1,r2].includes(a2.strike?.target));assert.notEqual(a.strike.target,a2.strike.target);
 assert.ok([t1.id,t2.id].includes(b.targetId));assert.ok([t1.id,t2.id].includes(b2.targetId));assert.notEqual(b.targetId,b2.targetId);
 for(let i=0;i<60;i++){p.S.G.tick(.05);p.m.tick(.05);}
 assert.ok(r1.hp<=0&&r2.hp<=0&&t1.hp<=0&&t2.hp<=0,JSON.stringify({hp:[r1.hp,r2.hp,t1.hp,t2.hp],sniper:[a.hp,a2.hp,b.hp,b2.hp],targets:[b.targetId,b2.targetId],aim:[b.aimStartedAt,b2.aimStartedAt]}));
});
test('all ten sniper factions one-shot unupgraded ordinary riflemen from every faction with solo/multi parity',()=>{
 for(let f=0;f<10;f++)for(let enemy=0;enemy<10;enemy++){
  const p=setup(f,enemy),[a,b]=p.add(0,9,1300),[x,y]=p.add(1,1,1500);
  p.S.G.damage(x,p.S.G.combatDef(a).damage,9,a,()=>1);p.m.__test.applyHit(b,y,p.M.E.definition(f,9).damage);
  assert.ok(x.hp<=0&&y.hp<=0,`one-shot ${f}/${enemy}`);
 }
});
test('anti-air focuses grounded specials, while sniper can target every faction special without making them airborne',()=>{
 for(let enemy=0;enemy<10;enemy++){
  const p=setup(0,enemy),[aa,ma]=p.add(0,4,1300),[snipe,ms]=p.add(0,9,1300);p.add(1,0,1400);const [v,mv]=p.add(1,6,1490);
  assert.equal(p.S.G.nearestUnit(aa,p.S.G.getDef(4,0)),v);assert.equal(p.S.G.nearestUnit(snipe,p.S.G.getDef(9,0)),v);
  p.m.tick(.05);assert.equal(ma.targetId,mv.id);assert.equal(ms.targetId,mv.id);
  assert.equal(p.S.G.getDef(6,enemy).kind,[3,4,6,7].includes(enemy)?'ground':'air');
 }
});
test('an unescorted sniper still loses to an equal-cost rifle squad after its first precision kill',()=>{
 const p=setup(),[a,b]=p.add(0,9,1300);for(let i=0;i<4;i++)p.add(1,1,1600+i*8,235+i*16);
 for(let i=0;i<240;i++){p.S.G.tick(.05);p.m.tick(.05);}
 assert.ok(a.hp<=0&&b.hp<=0,'slow reload and low HP keep mass rifle pressure effective');
 assert.ok(p.s.units.some(u=>u.side===1&&u.role===1&&u.hp>0));assert.ok(p.m.state.units.some(u=>u.team===1&&u.role===1&&u.hp>0));
});
