'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {solo,multi}=require('./combat-balance-harness.cjs');
function soloSetup(){
 const {G}=solo(),s=G.state();Object.assign(s,{live:true,faction:0,enemyFaction:0,aiDifficulty:'veryhard'});
 const add=(side,guardian=false,hero=1)=>{G.createUnit(side,0,0);const u=s.units.at(-1);Object.assign(u,{guardian,heroCount:hero,hp:u.hp*hero,maxHP:u.maxHP*hero});return u;};
 return {G,s,add};
}
for(const side of [0,1])test('solo nuclear strike by side '+side+' preserves guardians and removes ordinary merged heroes',()=>{
 const {G,s,add}=soloSetup(),guardian=add(1-side,true,20),ally=add(side),hero=add(1-side,false,20),hp=guardian.hp;
 assert.equal(G.nuclearPopulation(1-side),20,'guardian is excluded from casualty count');
 assert.equal(G.detonateEmergency(side),true);
 assert.equal(guardian.hp,hp);assert.ok(s.units.includes(guardian));assert.ok(s.units.includes(ally));assert.equal(hero.hp,0);
 assert.equal(s[side===0?'nukes':'enemyNukes'],0);
});
test('solo guardian-only targets do not consume a nuke, and AI excludes guardians from its 100-soldier threshold',()=>{
 let {G,s,add}=soloSetup();const guardian=add(1,true,20);
 assert.equal(G.detonateEmergency(0),false);assert.equal(s.nukes,1);assert.equal(guardian.hp,guardian.maxHP);
 ({G,s,add}=soloSetup());const immune=add(0,true,20),hp=immune.hp;
 for(let i=0;i<4;i++)add(0,false,20);
 s.baseHP[1]=8640*.35;
 assert.equal(G.hardEmergency(),false);assert.equal(s.enemyNukes,1);
 add(0,false,20);assert.equal(G.hardEmergency(),true);
 assert.equal(immune.hp,hp);assert.equal(s.units.filter(u=>u.side===0&&u.hp>0).length,1);
});
for(const mode of ['classic','pvp'])for(const side of [0,1])test(mode+' team '+side+' nuclear strike protects guardians across every lane',()=>{
 const {E}=multi(),game=E.create({mode,size:1,members:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:0}]}),s=game.state;
 const owner=s.players[side],enemy=s.players[1-side],guardians=[];
 for(let lane=0;lane<s.lanes;lane++){
  game.__test.spawn(enemy,lane,0,0);const u=s.units.at(-1);u.guardian=true;u.heroCount=20;u.hp=u.maxHP*=20;guardians.push([u,u.hp]);
 }
 assert.equal(game.order(owner.uid,{type:'tactic',kind:'nuke'}).ok,false);assert.equal(owner.nukes,1,'no eligible target preserves stock');
 for(let lane=0;lane<s.lanes;lane++){game.__test.spawn(enemy,lane,0,1);const u=s.units.at(-1);u.heroCount=20;u.hp=u.maxHP*=20;}
 game.__test.spawn(owner,0,0,1);const ally=s.units.at(-1),result=game.order(owner.uid,{type:'tactic',kind:'nuke'});
 assert.equal(result.ok,true);assert.equal(result.removed,s.lanes);assert.equal(result.soldiers,20*s.lanes);
 for(const [u,hp]of guardians){assert.equal(u.hp,hp);assert.ok(s.units.includes(u));}
 assert.ok(s.units.includes(ally));assert.equal(owner.nukes,0);
 assert.ok(s.effects.filter(e=>e.kind==='nuke').every(e=>e.casualties===20*s.lanes));
});
test('co-op AI nuclear decisions exclude enemy guardians and preserve their health after a valid strike',()=>{
 const {E}=multi(),game=E.create({mode:'coop',size:2,aiDifficulty:'veryhard',members:[{uid:'a',team:0,faction:0},{uid:'b',team:0,faction:1}]}),s=game.state;
 const bot=s.players.find(p=>p.bot),human=s.players[0];
 const add=(guardian=false)=>{game.__test.spawn(human,0,0,0);const u=s.units.at(-1);u.heroCount=20;u.guardian=guardian;u.hp=u.maxHP*=20;return u;};
 const immune=add(true),hp=immune.hp;for(let i=0;i<4;i++)add();
 for(const cores of s.cores)cores[bot.team]=3000*.35;
 game.__test.hardBotPurchase(bot);assert.equal(bot.nukes,1,'80 eligible soldiers plus guardian do not meet 100-soldier threshold');
 add();game.__test.hardBotPurchase(bot);assert.equal(bot.nukes,0);assert.equal(immune.hp,hp);
 assert.deepEqual(Array.from(s.units.filter(u=>u.team===0&&u.hp>0),u=>u.id),[immune.id]);
});
