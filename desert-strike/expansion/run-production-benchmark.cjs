'use strict';
const fs=require('node:fs'),path=require('node:path'),{run}=require('./production-probe.cjs');
const scenarios=[['assassin_sniper',[[10],[9]]],['assassin_guarded_sniper',[[10],[0,0,7,9]]],['sniper_armor',[[9],[3]]],['legacy_cheese_sniper_defense',[[0,0,5,1],[3,7,9]]]];
const journal=path.join(require('node:os').tmpdir(),'desert-expansion-production-probe-journal.jsonl');fs.writeFileSync(journal,'');
const records=[];
for(let faction=0;faction<10;faction++)for(const [scenario,patterns] of scenarios)for(const wave of [20,60]){
 const record={scenario,...run({faction,patterns,wave,budget:4800,seed:17})};records.push(record);fs.appendFileSync(journal,JSON.stringify(record)+'\n');
}
for(const detectors of [false,true])for(const faction of [0,3,5,9]){
 const record={scenario:'detector_comparison',...run({faction,patterns:[[0,1,10],[0,0,7,9]],wave:20,budget:4800,seed:83,detectors})};records.push(record);fs.appendFileSync(journal,JSON.stringify(record)+'\n');
}
const summary=scenarios.map(([scenario])=>{const rows=records.filter(r=>r.scenario===scenario);return {scenario,games:rows.length,leftWins:rows.filter(r=>r.winner===0).length,rightWins:rows.filter(r=>r.winner===1).length,timeouts:rows.filter(r=>r.winner==='timeout').length};});
const report={method:'Actual game-v2.js fixed-roster experiment with in-memory experimental unit/visibility/infiltration/aim/piercing hooks. Existing projectile, damage, healing and race triggers execute. Equal budget, no AI purchasing, structures, waves or hero consolidation. Not a production integration, full campaign, multiplayer test or player win rate.',baseline:'1f9a59dbeb217947e33abeb74e0451d64f32d89d',summary,records};
fs.writeFileSync(path.join(__dirname,'research/production-probe-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({games:records.length,summary}));
