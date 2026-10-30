'use strict';
const fs=require('node:fs'),path=require('node:path'),{create}=require('./combat-model.js');
const catalogue=require('./base-roster.json');
const scenarios=[
 ['sniper_vs_rifle',[9],[1]],
 ['screened_sniper_vs_rifle',[0,0,9],[1]],
 ['sniper_vs_armor',[9],[3]],
 ['assassin_vs_sniper',[10],[9]],
 ['assassin_vs_melee',[10],[0]],
 ['assassin_vs_guarded_sniper',[10],[0,0,7,9]],
 ['assassin_vs_guarded_rifle',[10],[0,0,1,1,7]],
 ['mixed_assassin_vs_rearline',[0,1,10],[3,1,9,5]],
 ['legacy_siege_vs_sniper_defense',[0,0,5,1],[3,7,9]],
 ['sniper_screen_vs_air',[0,0,9],[6]],
 ['detector_on',[0,1,10],[0,0,7,9],{detectors:true}],
 ['detector_off',[0,1,10],[0,0,7,9],{detectors:false}]
];
const records=[];
for(let faction=0;faction<10;faction++)for(const budget of [2400,4800])for(const [scenario,a,b,options] of scenarios)for(const seed of [17,83]){
 const battle=create({catalogue,factions:[faction,faction],patterns:[a,b],budget,seed,options});
 while(!battle.finished)battle.tick(.05);
 records.push({scenario,faction,budget,seed,...battle.result});
}
const summary=scenarios.map(([scenario])=>{
 const rows=records.filter(r=>r.scenario===scenario);
 return {scenario,games:rows.length,leftWins:rows.filter(r=>r.winner===0).length,rightWins:rows.filter(r=>r.winner===1).length,draws:rows.filter(r=>r.winner==='draw').length,timeouts:rows.filter(r=>r.winner==='timeout').length,averageSeconds:Number((rows.reduce((n,r)=>n+r.seconds,0)/rows.length).toFixed(1))};
});
const result={method:'Fixed-budget preparatory model using exported production baseline stats. Not a production-engine match, AI campaign or player win rate. No wave upgrades, hero consolidation, race triggered abilities, augments, path collision, structures or travel-time projectile misses. Both sides have the same budget; residual unspent CR is recorded.',baseline:catalogue.baseline,summary,records};
const output=process.argv[2]||path.join(__dirname,'research/balance-results.json');fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({games:records.length,summary}));
