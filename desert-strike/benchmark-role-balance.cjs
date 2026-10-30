'use strict';
const {solo}=require('./combat-balance-harness.cjs');
const {execFileSync}=require('node:child_process');
const ref=process.argv.find(x=>x.startsWith('--ref='))?.slice(6);
const source=ref?execFileSync('git',['show',ref+':desert-strike/game-v2.js'],{encoding:'utf8',maxBuffer:2e6}):null;
const {G,reseed}=solo(0x31ab,source),scenarios=[
 {id:'special_vs_armor',a:[[6,1]],b:[[3,1]]},
 {id:'special_vs_charge',a:[[6,1]],b:[[0,1]]},
 {id:'special_vs_screened_siege',a:[[6,1]],b:[[3,.35],[5,.5],[7,.15]]},
 {id:'special_vs_breaker_screen',a:[[6,1]],b:[[2,.6],[3,.4]]},
 {id:'special_vs_mixed',a:[[6,1]],b:[[0,.2],[1,.2],[2,.2],[3,.3],[7,.1]]},
 {id:'anti_brood_vs_balanced',a:[[3,.25],[5,.5],[1,.25]],b:[[0,.125],[1,.125],[2,.125],[3,.125],[4,.125],[5,.125],[6,.125],[7,.125]],fixed:[0,1]},
 {id:'fairy_heal_vs_standard_armor',a:[[3,.65],[7,.35]],b:[[3,1]],fixed:[9,0]},
 {id:'beast_melee_vs_screened_siege',a:[[0,.2],[3,.3],[6,.3],[7,.2]],b:[[3,.35],[5,.5],[7,.15]],fixed:[4,0]},
 {id:'octoper_vs_anti_caster',a:[[1,.2],[2,.2],[4,.2],[5,.2],[7,.2]],b:[[0,.3],[6,.4],[5,.3]],fixed:[8,0]}
];
function army(plan,budget,faction){
 const roles=[];let spent=0;
 for(const [role,share]of plan){const price=G.getDef(role,faction).cost,count=Math.floor(budget*share/price);for(let i=0;i<count;i++)roles.push(role);spent+=price*count;}
 while(spent+G.getDef(1,faction).cost<=budget){roles.push(1);spent+=G.getDef(1,faction).cost;}
 return {roles,spent};
}
const rows=[];
for(const c of scenarios)for(const faction of c.fixed?[c.fixed[0]]:[3,4,6,7])for(const budget of [2400,7200])for(const mirror of [false,true]){
 reseed(0x31ab+scenarios.indexOf(c)*7919+faction*97+budget);
 G.reset();const s=G.state(),factions=c.fixed||[faction,0],armies=[army(c.a,budget,factions[0]),army(c.b,budget,factions[1])];
 Object.assign(s,{live:true,elapsed:480,wave:budget===2400?20:60,next:1e9,aiNextThink:Infinity,faction:factions[mirror?1:0],enemyFaction:factions[mirror?0:1]});
 armies.forEach((army,index)=>{
  const side=mirror?1-index:index;
  army.roles.forEach((role,i)=>{G.createUnit(side,i,role);const u=s.units.at(-1),back=role===7?60:role===5?40:0;
   u.x=side===0?1470-Math.floor(i/9)*22-back:1830+Math.floor(i/9)*22+back;u.y=115+(i%9)*36;u.cooldown=.15;u.spawnAge=1;});
 });
 let timeout=true,heroes=0;
 const alive=side=>s.units.some(u=>u.hp>0&&u.side===side&&u.role!==7);
 for(let i=0;i<450;i++){G.tick(.2);heroes=Math.max(heroes,s.units.filter(u=>u.heroCount===20).length);if(!alive(0)||!alive(1)){timeout=false;break;}}
 const sides=mirror?[1,0]:[0,1],values=sides.map(side=>s.units.reduce((v,u)=>v+(u.hp>0&&u.side===side&&!u.guardian&&!u.isHatchling&&!u.conscripted?G.getDef(u.role,u.faction).cost*u.hp/u.maxHP*(u.heroCount===20?20:1):0),0));
 const winner=!alive(sides[0])&&!alive(sides[1])?'draw':!alive(sides[0])?'b':!alive(sides[1])?'a':'timeout';
 rows.push({scenario:c.id,factions,budget,wave:s.wave,mirror,spent:armies.map(a=>a.spent),winner,timeout,heroes,survivingValue:values.map(Math.round)});
}
const summary=scenarios.flatMap(c=>(c.fixed?[c.fixed[0]]:[3,4,6,7]).map(faction=>{const games=rows.filter(r=>r.scenario===c.id&&r.factions[0]===faction);return {scenario:c.id,faction,games:games.length,wins:games.filter(r=>r.winner==='a').length,losses:games.filter(r=>r.winner==='b').length,timeouts:games.filter(r=>r.timeout).length};}));
console.log(JSON.stringify({revision:ref||'working',method:'Actual solo engine; faction-specific 2400/7200 CR budgets, mirrored sides, waves 20/60, natural hero consolidation, 90s limit. Timeouts are not wins. Fixed formations are diagnostic, not player win rates.',summary,rows}));
