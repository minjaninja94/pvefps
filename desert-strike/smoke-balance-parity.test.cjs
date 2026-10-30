'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {solo,multi}=require('./combat-balance-harness.cjs');
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-7,`${label}: ${a} != ${b}`);
function pair(faction=0,rival=0){
 const S=solo(),M=multi();S.G.reset();const s=S.G.state();
 Object.assign(s,{faction,enemyFaction:rival,live:true,wave:20,elapsed:100,next:1e9,aiNextThink:Infinity});
 const match=M.E.create({mode:'classic',size:1,members:[{uid:'a',team:0,faction},{uid:'b',team:1,faction:rival}]});
 match.state.wave=20;match.state.seconds=100;
 function add(side,role,x,y,hero=1){
  S.G.createUnit(side,0,role);const a=s.units.at(-1);
  match.__test.spawn(match.state.players[side],0,0,role);const b=match.state.units.at(-1);
  for(const u of [a,b]){Object.assign(u,{x,y,heroCount:hero,hp:u.hp*hero,maxHP:u.maxHP*hero,spawnAge:1,inkUntil:0});}
  return [a,b];
 }
 return {S,M,s,match,add};
}
test('all 80 base definitions, faction prices and effective role properties agree without a shared browser roster',()=>{
 const {G}=solo(),{E}=multi();
 for(let f=0;f<10;f++)for(let r=0;r<8;r++){
  const a=G.getDef(r,f),b=E.definition(f,r);
  for(const key of ['cost','hp','damage','heal','armor','range','rate','speed','blast'])near(a[key]||0,b[key]||0,`${f}/${r} ${key}`);
  assert.equal(a.kind,b.kind);assert.equal(a.airTarget,b.airTarget);
  assert.deepEqual(Array.from(a.good),Array.from(b.good));assert.deepEqual(Array.from(a.bad),Array.from(b.bad));
  assert.equal(a.cost,E.unitCost(f,r));
 }
 near(G.getDef(7,9).heal/G.getDef(7,0).heal,1.15,'fairy healing');
 assert.equal(G.getDef(7,9).cost,220);
 assert.ok(G.getDef(2,4).damage>G.getDef(2,0).damage);assert.ok(G.getDef(2,6).damage>G.getDef(2,0).damage);
 assert.deepEqual([3,4,6,7].map(f=>E.unitCost(f,6)),[300,285,270,285]);
});
test('actual artillery resolution agrees at center, falloff and outer edge for normal, Octoper and merged heroes',()=>{
 for(const faction of [0,8])for(const hero of [1,20])for(const wave of [20,40,60]){
  const p=pair(faction,0),[a,b]=p.add(0,5,1000,260,hero);
  p.s.wave=p.match.state.wave=wave;
  const radius=p.S.G.getDef(5,faction).blast+10,rows=[];
  for(const d of [0,radius/2,radius,radius+.1]){
   const [x,y]=p.add(1,1,1100+d,260,hero);x.hp=x.maxHP=y.hp=y.maxHP=1e6;
   rows.push({d,x,y});
  }
  const damage=p.S.G.combatDef(a).damage;
  p.S.G.projectileImpact({side:0,faction,source:5,sourceUnit:a.uid,baseSide:null,tx:1100,ty:260,damage,blast:radius-10,volley:hero});
  p.match.__test.attack(b,rows[0].y);
  for(const {d,x,y}of rows){near(1e6-x.hp,1e6-y.hp,`blast f${faction} hero${hero} W${wave} d${d}`);if(d>radius)assert.equal(x.hp,1e6);}
 }
});
test('both ground charge variants hit the same three closest ground targets and honor armor counters',()=>{
 for(const faction of [3,4,6])for(const hero of [1,20]){
  const p=pair(faction),[a,b]=p.add(0,6,1000,260,hero),rows=[];
  for(const [role,d]of [[1,0],[3,12],[0,24],[7,36],[6,10]]){
   const [x,y]=p.add(1,role,1040+d,260,hero);x.hp=x.maxHP=y.hp=y.maxHP=1e5;rows.push([x,y]);
  }
  p.S.G.fire(a,rows[0][0]);p.match.__test.attack(b,rows[0][1]);
  for(const [x,y]of rows)near(1e5-x.hp,1e5-y.hp,'ground splash parity');
  assert.equal(rows[faction===6?2:3][0].hp,1e5,'ground splash target count respected');assert.equal(rows[4][0].hp,1e5,'aircraft not hit');
 }
});
test('ink reduces an attack once in either engine rather than twice on the host',()=>{
 const p=pair(),[a,b]=p.add(0,1,1000,260),[x,y]=p.add(1,2,1100,260);
 a.inkUntil=b.inkUntil=102;
 const before=x.hp,other=y.hp;
 p.S.G.damage(x,p.S.G.combatDef(a).damage,1,a);p.match.__test.attack(b,y);
 near(before-x.hp,other-y.hp,'one ink damage penalty');
});
test('host anti-air switches from a nearer ground target to an eligible aircraft like solo',()=>{
 const p=pair(),[a,b]=p.add(0,4,1000,260),[ground,mg]=p.add(1,3,1090,260),[air,ma]=p.add(1,6,1180,260);
 b.targetId=mg.id;
 assert.equal(p.S.G.nearestUnit(a,p.S.G.getDef(4,0)),air);
 p.match.tick(.01);assert.equal(b.targetId,ma.id);
 assert.equal(ground.hp,ground.maxHP,'ground decoy remains unharmed');
});
test('baseline brood spawn quota is eight and marine recruitment quota is two in both engines',()=>{
 let p=pair(1),[target,mt]=p.add(1,3,1050,260);
 for(let i=0;i<10;i++){
  const [a,b]=p.add(0,0,1000,260);p.S.G.broodLay(a,target,()=>0);p.match.__test.broodLay(b,mt,()=>0);
 }
 assert.equal(p.s.broodBirths[0],8);assert.equal(p.match.state.broodBirthsByUid.get('a'),8);
 assert.equal(p.s.units.filter(u=>u.isHatchling).length,8);assert.equal(p.match.state.units.filter(u=>u.isHatchling).length,8);
 p=pair(3);const [a,b]=p.add(0,0,1000,260);
 for(let i=0;i<4;i++){const [x,y]=p.add(1,0,1040,260);p.S.G.marineSpoils(x,a,()=>0);p.match.__test.marineSpoils(b,y,()=>0);}
 assert.equal(p.s.marineRecruitCount[0],2);assert.equal(p.match.state.marineRecruitCount.get('a'),2);
});
test('ground-special construction, 55% refunds and AI purchases use each faction quote',()=>{
 for(const faction of [3,4,6,7]){
  const p=pair(faction),cost=p.S.G.getDef(6,faction).cost;
  p.s.cash=cost;p.S.G.selectRole(6);p.S.G.place(0);assert.equal(p.s.cash,0);assert.equal(p.s.built[0],6);
  p.S.G.demolish();p.S.G.place(0);assert.equal(p.s.cash,Math.floor(cost*.55));
  const player=p.match.state.players[0];player.cash=cost;
  assert.equal(p.match.order('a',{type:'build',role:6,lane:0,slot:0}).ok,true);assert.equal(player.cash,0);
  assert.equal(p.match.order('a',{type:'build',role:null,lane:0,slot:0}).ok,true);assert.equal(player.cash,Math.floor(cost*.55));
  p.s.enemyFaction=faction;p.s.enemyCash=3000;p.s.enemyBuilt.fill(null);p.s.aiNextThink=0;
  p.S.G.aiInitialBuild();
  const spent=p.s.enemyBuilt.reduce((sum,r)=>sum+(r===null?0:p.S.G.getDef(r,faction).cost),0);
  assert.equal(p.s.enemyCash,3000-spent,'AI initial build is paid at faction prices');
 }
});
