'use strict';
// Budget-normalized engagements in the shipped combat engine. No surrogate DPS formula.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const legacy=process.argv.includes('--legacy'),costs=legacy?[65,95,150,205,165,245,205,145]:null;
let seed=1;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const noop=()=>{},canvas=new Proxy({createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});
const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{style:{},dataset:{},hidden:false,innerHTML:'',textContent:'',classList:{add:noop,remove:noop,toggle:noop},getContext:()=>canvas,addEventListener:noop,setAttribute:noop,removeAttribute:noop});return elements.get(id);}
const w={addEventListener:noop},ctx={window:w,document:{getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({getContext:()=>canvas})},requestAnimationFrame:noop,Math:math,Date,Map,Set,Array,Object,Number,String,console};
for(const f of ['unit-consolidation.js','defense-guardian.js','hard-ai.js'])vm.runInNewContext(read(f),ctx,{filename:f});
const injection='window.__pricing={reset,state:()=>state,ROLE,getDef,createUnit,tick};reset();';
vm.runInNewContext(read('game-v2.js').replace('initFactions();wire();reset();',injection),ctx);
const G=w.__pricing;if(costs)G.ROLE.forEach((r,i)=>r.cost=costs[i]);
const costOf=(role,faction)=>legacy?costs[role]:G.getDef(role,faction).cost;
const cases=[
 {id:'armor_vs_rifle',a:[[3,1]],b:[[1,1]],counter:true},
 {id:'breaker_vs_armor',a:[[2,1]],b:[[3,1]],counter:true},
 {id:'antiair_vs_air',a:[[4,1]],b:[[6,1]],counter:true,airOnly:true},
 {id:'charge_vs_siege',a:[[0,1]],b:[[5,1]],counter:true},
 {id:'screened_siege_vs_rifles',a:[[3,.35],[5,.65]],b:[[0,.25],[1,.75]],counter:false},
 {id:'armor_heal_vs_armor',a:[[3,.75],[7,.25]],b:[[3,1]],counter:false},
 {id:'mixed_vs_siege_spam',a:[[3,.35],[0,.30],[6,.35]],b:[[5,1]],counter:false},
 {id:'mixed_vs_special_spam',a:[[3,.40],[2,.30],[4,.30]],b:[[6,1]],counter:false}
];
function army(plan,budget,faction){
 const result=[];let spent=0;
 for(const [role,share]of plan){const count=Math.floor(budget*share/costOf(role,faction));for(let i=0;i<count;i++)result.push(role);spent+=count*costOf(role,faction);}
 // Use remaining CR for the same ordinary rifle screen on either side.
 while(spent+G.ROLE[1].cost<=budget){result.push(1);spent+=G.ROLE[1].cost;}
 return {roles:result,spent};
}
const rows=[];
for(let faction=0;faction<10;faction++)for(const c of cases){
 if(c.airOnly&&G.getDef(6,faction).kind!=='air')continue;
 for(const mirror of [false,true]){
  seed=0x189abc+faction*227+cases.indexOf(c)*2003;G.reset();const s=G.state();
  Object.assign(s,{live:true,elapsed:480,wave:20,next:1e9,aiNextThink:Infinity,faction,enemyFaction:faction});
  const armies=[army(c.a,2400,faction),army(c.b,2400,faction)];
  for(let index=0;index<2;index++){
   const side=mirror?1-index:index;
   armies[index].roles.forEach((role,i)=>{
    G.createUnit(side,i,role);const u=s.units.at(-1),back=role===7?60:role===5?40:0;
    u.x=side===0?1470-Math.floor(i/9)*22-back:1830+Math.floor(i/9)*22+back;
    u.y=115+(i%9)*36;u.cooldown=.15;u.spawnAge=1;
   });
  }
  let timeout=true;
  for(let i=0;i<90/.2;i++){
   G.tick(.2);
   const fighting=side=>s.units.some(u=>u.side===side&&u.hp>0&&u.role!==7);
   if(!fighting(0)||!fighting(1)){timeout=false;break;}
  }
  const values=[0,0];
  for(const u of s.units)if(u.hp>0&&!u.guardian&&!u.isHatchling&&!u.conscripted)
   values[u.side]+=costOf(u.role,u.faction)*u.hp/u.maxHP*(u.heroCount===20?20:1);
  const sides=[mirror?1:0,mirror?0:1];
  const alive=sides.map(side=>s.units.some(u=>u.side===side&&u.hp>0&&u.role!==7));
  const winner=!alive[0]&&!alive[1]?'draw':!alive[0]?'b':!alive[1]?'a':values[sides[0]]>values[sides[1]]*1.05?'a':values[sides[1]]>values[sides[0]]*1.05?'b':'draw';
  rows.push({faction,scenario:c.id,mirror,winner,timeout,spent:armies.map(a=>a.spent),survivingValue:sides.map(side=>Math.round(values[side]))});
 }
}
const summary=cases.map(c=>{const games=rows.filter(r=>r.scenario===c.id);return {scenario:c.id,games:games.length,aWins:games.filter(r=>r.winner==='a').length,bWins:games.filter(r=>r.winner==='b').length,draws:games.filter(r=>r.winner==='draw').length,timeouts:games.filter(r=>r.timeout).length};});
assert.equal(rows.length,152);assert.ok(rows.every(r=>r.spent.every(v=>v<=2400)));
for(const id of ['armor_vs_rifle','antiair_vs_air','charge_vs_siege']){
 const line=summary.find(x=>x.scenario===id);assert.equal(line.aWins,line.games,id+' retains its economic counter');assert.equal(line.timeouts,0);
}
const breaker=summary.find(x=>x.scenario==='breaker_vs_armor');assert.equal(breaker.aWins,breaker.games,'armor breakers retain their economic counter in every faction');
console.log(JSON.stringify({pricing:legacy?'legacy':'revised',costs:G.ROLE.map(r=>r.cost),specialCosts:Array.from({length:10},(_,f)=>costOf(6,f)),budget:2400,method:'152 seeded mirrored budget-normalized engagements; real game-v2.js combat, ten factions, 90s ceiling; counters and mixed compositions; unspent CR is reported, not fabricated',summary,rows}));
