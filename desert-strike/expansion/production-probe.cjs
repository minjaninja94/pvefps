'use strict';
// Source-injected fixed-roster experiment. The shipped game files are never changed.
const fs=require('node:fs'),path=require('node:path'),{solo}=require('../combat-balance-harness.cjs'),X=require('./expansion-rules.js');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
function replaceOnce(source,needle,replacement){if(source.split(needle).length!==2)throw Error('Probe injection changed: '+needle);return source.replace(needle,replacement);}
function source(){
 let s=read('../game-v2.js');
 s=replaceOnce(s,"const isAugmented=", "const X=window.DesertExpansion;\nconst isAugmented=");
 s=replaceOnce(s,'const RNAME=ROLE.map',`ROLE.push({key:'extractor',name:'자원채취',cost:70,hp:1,damage:0,armor:0,range:0,rate:1,speed:0,kind:'ground',good:[],bad:[]},X.CANDIDATES[9],X.CANDIDATES[10]);FACTIONS.forEach((f,i)=>f.units.push('자원채취',...X.NAMES[i]));\nconst RNAME=ROLE.map`);
 s=replaceOnce(s,'function getDef(role,faction){',"function getDef(role,faction){\n if(role===9||role===10)return {...X.definition(role,faction),mark:role===9?'⌖':'†',token:role===9?'⌖':'†',heal:0,blast:0,unitType:'ground',tips:'시험 병종'};");
 s=s.replaceAll('Array(8)','Array(11)');
 s=replaceOnce(s,'function aiInvest(){','function aiInvest(){return;');
 let begin=s.indexOf('function nearestUnit('),end=s.indexOf('function nearInjured(',begin),chunk=s.slice(begin,end);
 chunk=replaceOnce(chunk,'if(v.hp<=0||v.side===u.side||','if(v.hp<=0||v.side===u.side||!X.canTarget(u,v,state.units,state.elapsed)||');
 chunk=replaceOnce(chunk,'if(d-bonus<score)',`const reserved=u.role===9?state.units.reduce((n,a)=>n+(a.side===u.side&&a.role===9&&a.strike?.target===v&&!a.strike.hit?combatDef(a).damage*X.precisionMultiplier(a,{...v,kind:getDef(v.role,v.faction).kind}):0),0):0;
  const precision=u.role===9?(reserved>=v.hp?-10000:Math.min(130,unitCost(v.role,v.faction)*.2)):0;
  if(d-bonus-precision<score)`);
 chunk=chunk.replace('score=d-bonus;candidate=v;','score=d-bonus-precision;candidate=v;');s=s.slice(0,begin)+chunk+s.slice(end);
 s=replaceOnce(s,'const armor=combatDef(target).armor;',"out*=X.precisionMultiplier({role:attacker},{...target,kind:getDef(target.role,target.faction).kind});\n const armor=combatDef(target).armor*(attacker===9?.5:1);");
 s=replaceOnce(s,'function beginStrike(',`function beginStrike(u,target=null,baseSide=null,healing=false){
  if(u.role===10&&!healing)X.revealOnAttack(u,state.elapsed);
  expansionBaseStrike(u,target,baseSide,healing);
  if(u.role===9&&u.strike)u.strike.duration=Math.max(u.strike.duration,X.definition(9,u.faction).aim/.47);
 }
 function expansionBaseStrike(`);
 s=replaceOnce(s,'const def=combatDef(u),x=t?t.x:fort.x,y=t?t.y:260;',`const def=combatDef(u),x=t?t.x:fort.x,y=t?t.y:260;
 if(u.role===10&&!u.expansionStruck){def.damage*=X.RULES.firstStrikeMultiplier;u.expansionStruck=true;}`);
 begin=s.indexOf('function tick(');const before=s.slice(0,begin);let tick=s.slice(begin);
 tick=replaceOnce(tick,'  if(u.hp<=0)continue;\n  const def=combatDef(u);',`  if(u.hp<=0)continue;
  u.id=u.uid;
  if(u.role===10){
   const foes=state.units.filter(v=>v.hp>0&&v.side!==u.side).map(v=>({...v,id:v.uid}));
   if(!u.expansionTransit&&!u.infiltrationUsed){const tr=X.infiltration(u,foes,state.elapsed);if(tr){u.infiltrationUsed=true;u.expansionTransit=tr;}}
   const tr=u.expansionTransit;
   if(tr){const t=Math.max(0,Math.min(1,(state.elapsed-tr.start-X.RULES.infiltrationWindup)/X.RULES.infiltrationTravel));u.x=tr.from.x+(tr.to.x-tr.from.x)*t;u.y=tr.from.y+(tr.to.y-tr.from.y)*t;state.sortedTeams=null;if(state.elapsed<tr.readyAt)continue;u.expansionTransit=null;}
  }
  const def=combatDef(u);`);
 s=before+tick;
 return read('expansion-rules.js')+'\n'+s;
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
if(require.main===module){const cases=JSON.parse(process.argv[2]||'[{"patterns":[[10],[9]],"budget":2400}]');console.log(JSON.stringify({method:'Actual game-v2.js in-memory fixed-roster probe. Experimental roles and visibility/targeting/infiltration hooks injected only in this process. Normal difficulty, no AI purchasing, no structures, no spawning waves or hero consolidation. Existing race triggered abilities and projectile/combat resolution run in the production engine. Not a full campaign or multiplayer integration.',records:cases.map(run)}));}
module.exports={run,source};
