'use strict';
// Paid-order PvP pacing samples. This is a scenario benchmark, not an average or a guarantee.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{performance}=require('node:perf_hooks');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8'),w={};
const context={window:w,Math,Array,Object,Number,String,Set,Map,Date,JSON,console};
w.DesertGuardian=require('./defense-guardian.js');w.DesertConsolidation=require('./unit-consolidation.js');
for(const name of ['prism-experiments.js','tri-lane-engine.js'])vm.runInNewContext(read(name),context,{filename:name});
const E=w.DesertTriEngine;
const scenarios=[
 {name:'Forge versus Brood / balanced expansions',a:0,b:1,roles:[0,1,3,2,5,7,4,6]},
 {name:'Elves versus Robots / long-range investments',a:5,b:7,roles:[1,2,4,5,3,0,1,7]},
 {name:'Forge mirror / attrition',a:0,b:0,roles:[0,1,3,2,5,7,4,6]}
];
function plan(match,p,seconds,roles){
 const t=Math.floor(seconds/12);
 // One extractor per slot, with zero free credits or production.
 if(p.eco<Math.min(5,Math.floor((seconds+25)/115)+1) && p.cash>=E.ecoPrice(p.eco)+100
  && seconds>=p.ecoReadyAt){
  const lane=p.eco%3,slot=70+p.eco;
  const r=match.order(p.uid,{type:'build',lane,slot,role:8});
  if(r.ok)return;
 }
 const built=p.buildings.reduce((n,row)=>n+row.filter(r=>r!==null&&r!==8).length,0);
 const max=Math.min(19,3+Math.floor(seconds/56));
 if(built>=max)return;
 const lane=(built+Math.floor(built/3))%3,slot=Math.floor(built/3)*3+(built%3);
 const role=roles[(Math.floor(built/3)+lane)%roles.length];
 const cost=E.COST[role];
 if(p.cash<cost+Math.min(100,seconds>280?50:0))return;
 match.order(p.uid,{type:'build',lane,slot,role});
}
for(const cfg of scenarios){
 const members=[{uid:'left',team:0,faction:cfg.a},{uid:'right',team:1,faction:cfg.b}];
 const match=E.create({mode:'pvp',size:1,members});
 const started=performance.now(),maxMinutes=24,maxWallMs=110000;
 let nextPlan=0,turns=0;
 while(!match.state.ended&&match.state.seconds<maxMinutes*60&&performance.now()-started<maxWallMs){
  const elapsed=match.state.seconds;
  if(elapsed>=nextPlan){
   for(const p of match.state.players)plan(match,p,elapsed,cfg.roles);
   nextPlan+=6;
  }
  match.tick(.2);turns++;
 }
 const stats=match.state.players.map(p=>({team:p.team,eco:p.eco,buildings:p.buildings.flat().filter(x=>x!==null&&x!==8).length}));
 console.log('MULTI_DURATION_SAMPLE '+JSON.stringify({
  scenario:cfg.name,minutes:Number((match.state.seconds/60).toFixed(2)),wave:match.state.wave,
  ended:match.state.ended,winner:match.state.winner,cores:match.state.cores,
  units:match.state.units.length,stats,
  wallSeconds:Number(((performance.now()-started)/1000).toFixed(1)),turns
 }));
 if(performance.now()-started>=maxWallMs)console.log('SAMPLE_WALL_LIMIT_REACHED');
}
