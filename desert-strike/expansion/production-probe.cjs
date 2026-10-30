'use strict';
// Real live-engine fixed-roster benchmark. The shipped game files are never changed.
const fs=require('node:fs'),path=require('node:path'),{solo}=require('../combat-balance-harness.cjs'),X=require('./expansion-rules.js');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
function replaceOnce(source,needle,replacement){if(source.split(needle).length!==2)throw Error('Probe injection changed: '+needle);return source.replace(needle,replacement);}
function source(){
 // Exercise the real shipped engine and common expansion rules, without
 // injecting experimental combat replacements into the production source.
 return read('../game-v2.js').replace('function aiInvest(){','function aiInvest(){return;');
}
function run({faction=0,enemy=faction,patterns=[[10],[9]],budget=2400,seed=17,wave=20,maxSeconds=120,detectors=true}){
 const {G}=solo(seed,source()),s=G.state();Object.assign(s,{faction,enemyFaction:enemy,aiDifficulty:'normal',live:true,next:1e9,nextConsolidation:Infinity,wave,followFront:false,cash:0,enemyCash:0});s.units=[];s.forwardHP=[0,0];s.turretHP=[0,0];s.baseHP=[1e12,1e12];
 const spent=[0,0];
 const front=r=>r===0?1420:r===3?1400:r===10?1370:r===1||r===2||r===4||r===6?1330:r===7?1260:r===5?1220:1180;
 for(let side=0;side<2;side++){let i=0;const f=side===0?faction:enemy;
  while(i<200){const r=patterns[side][i%patterns[side].length],cost=G.getDef(r,f).cost;if(spent[side]+cost>budget)break;spent[side]+=cost;G.createUnit(side,i%75,r,false);const u=s.units.at(-1),x=front(r)-Math.floor(i/9)*12;Object.assign(u,{id:u.uid,x:side===0?x:3300-x,y:110+(i%9)*34,spawnAge:5,detectionDisabled:r===7&&!detectors});i++;}
 }
 while(s.elapsed<maxSeconds&&s.units.some(u=>u.side===0&&u.hp>0)&&s.units.some(u=>u.side===1&&u.hp>0))G.tick(.03);
 const survivors=[0,1].map(side=>s.units.filter(u=>u.side===side&&u.hp>0));
 return {faction,enemy,patterns,budget,seed,wave,detectors,spent,winner:!survivors[0].length&&!survivors[1].length?'draw':!survivors[0].length?1:!survivors[1].length?0:'timeout',seconds:Number(s.elapsed.toFixed(2)),survivors:survivors.map(a=>a.length),infiltrators:survivors.map(a=>a.filter(u=>u.infiltrationUsed).length),remainingValue:survivors.map(a=>Math.round(a.reduce((n,u)=>n+G.getDef(u.role,u.faction).cost*u.hp/u.maxHP,0)))};
}
if(require.main===module){const cases=JSON.parse(process.argv[2]||'[{"patterns":[[10],[9]],"budget":2400}]');console.log(JSON.stringify({method:'Actual game-v2.js and shared live rules in-memory fixed-roster probe. Normal difficulty, no AI purchasing, no structures, no spawning waves or hero consolidation. Existing race triggered abilities and projectile/combat resolution run in the production engine. Not a full campaign or multiplayer integration.',records:cases.map(run)}));}
module.exports={run,source};
