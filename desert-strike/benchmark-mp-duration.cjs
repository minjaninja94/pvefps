'use strict';
// Reproducible full-tick multiplayer match samples; observational, not a guaranteed median.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{performance}=require('node:perf_hooks');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8'),w={},sandbox={window:w,Math,Array,Object,Number,String,Set,Map,Date,JSON,console};
w.DesertGuardian=require('./defense-guardian.js');
w.DesertConsolidation=require('./unit-consolidation.js');
for(const name of ['prism-experiments.js','tri-lane-engine.js'])vm.runInNewContext(read(name),sandbox,{filename:name});
const E=w.DesertTriEngine;
const scenarios=[
 {name:'Forge-vs-Brood / mixed forces',a:0,b:1,slots:[0,1,3,2,5,7,4,6],target:23},
 {name:'Elves-vs-Robots / long range',a:5,b:7,slots:[1,2,4,5,3,0,1,7],target:23}
];
for(const setup of scenarios){
 const team=[{uid:'left',team:0,faction:setup.a},{uid:'right',team:1,faction:setup.b}];
 const match=E.create({mode:'pvp',size:1,members:team});
 // Each side has the same mix; arm production after the shared opening.
 for(const p of match.state.players)for(let lane=0;lane<3;lane++)for(let i=0;i<setup.slots.length;i++){
  p.buildings[lane][i]=setup.slots[(i+lane)%setup.slots.length];
  p.buildingReadyAt[lane][i]=10;
 }
 const max=setup.target*60,start=performance.now(),timeLimitWall=130000;
 let turns=0;
 while(!match.state.ended&&match.state.seconds<max&&performance.now()-start<timeLimitWall){
  match.tick(.2);turns++;
 }
 const seconds=match.state.seconds;
 const result={scenario:setup.name,minutes:Number((seconds/60).toFixed(2)),wave:match.state.wave,ended:match.state.ended,winner:match.state.winner,
  cores:match.state.cores,units:match.state.units.length,wallSeconds:Number(((performance.now()-start)/1000).toFixed(1)),turns,
  limit:setup.target};
 console.log('MULTI_DURATION_SAMPLE '+JSON.stringify(result));
 if(performance.now()-start>=timeLimitWall){console.log('SAMPLE_WALL_LIMIT_REACHED');break;}
}
