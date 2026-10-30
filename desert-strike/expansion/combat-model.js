/* Fixed-budget diagnostic model, not the production combat engine or an AI win-rate test. */
(function(global){'use strict';
const X=global.DesertExpansion||(typeof require==='function'?require('./expansion-rules.js'):null);
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),alive=u=>u.hp>0;
function create({catalogue,factions=[0,0],patterns=[[0,1],[1]],budget=4800,seed=1,options={}}){
 let randomSeed=seed>>>0||1,id=1,now=0,finished=false,result=null;
 const random=()=>((randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0)/4294967296);
 const units=[],events=[],spent=[0,0],deaths=[0,0],metrics={infiltrations:[0,0],assassinKills:[0,0],detectedSeconds:[0,0],damage:[0,0]};
 const definition=(r,f)=>X.definition(r,f)||catalogue.definitions[f][r];
 const front=r=>r===0?570:r===3?550:r===10?520:r===1||r===2||r===4||r===6?480:r===7?410:r===5?370:330;
 for(let side=0;side<2;side++){
  const pattern=patterns[side];if(!pattern.length)throw Error('Empty army');
  let cursor=0;while(cursor<250){
   const role=pattern[cursor%pattern.length],def=definition(role,factions[side]);
   if(!def||!Number.isFinite(def.cost)||def.cost<=0)throw Error('Invalid unit');
   if(spent[side]+def.cost>budget)break;
   spent[side]+=def.cost;
   const column=Math.floor(cursor/9),y=120+(cursor%9)*28+(random()-.5)*7;
   const px=front(role)-column*12;
   units.push({id:id++,side,role,faction:factions[side],x:side===0?px:1600-px,y,hp:def.hp,maxHP:def.hp,def,cooldown:random()*.25,phase:'normal',detectionDisabled:role===7&&options.detectors===false,revealedUntil:0,infiltrationUsed:false,firstStrike:true,createdFromPaidFactory:true});
   cursor++;
  }
 }
 const originals=units.map(u=>({id:u.id,side:u.side,role:u.role,cost:u.def.cost}));
 function log(type,data){events.push({at:Number(now.toFixed(2)),type,...data});if(events.length>500)events.shift();}
 function targetable(a,b){return X.canTarget(a,b,units,now);}
 function move(u,target,dt){const dist=d(u,target)||1,step=Math.min(dist,u.def.speed*dt);u.x+=(target.x-u.x)/dist*step;u.y+=(target.y-u.y)/dist*step;}
 function hit(attacker,v,damage){
  if(v.hp<=0)return;
  const def=attacker.def,good=def.good?.includes(v.role),bad=def.bad?.includes(v.role);
  const modifier=good?1.35:bad?.72:1;
  const armor=(v.def.armor||0)*(1-(def.armorPierce||0));
  const amount=Math.max(3,damage*modifier*X.precisionMultiplier(attacker,v)-armor*.66);
  metrics.damage[attacker.side]+=Math.min(v.hp,amount);v.hp-=amount;
  if(v.hp<=0){v.deathAt=now;deaths[v.side]++;if(attacker.role===X.ASSASSIN)metrics.assassinKills[attacker.side]++;log('death',{unit:v.id,source:attacker.id});}
 }
 function tick(dt=.05){
  if(finished)return;now+=dt;const attacks=[];
  for(const u of units){
   if(!alive(u))continue;const foes=units.filter(v=>alive(v)&&v.side!==u.side),friends=units.filter(v=>alive(v)&&v.side===u.side);
   if(u.role===X.ASSASSIN&&X.detected(u,units,now))metrics.detectedSeconds[u.side]+=dt;
   u.cooldown=Math.max(0,u.cooldown-dt);
   if(u.transit){
    const tr=u.transit,t=Math.max(0,Math.min(1,(now-tr.start-X.RULES.infiltrationWindup)/X.RULES.infiltrationTravel));
    u.phase=t<1?'infiltrating':'landing';u.x=tr.from.x+(tr.to.x-tr.from.x)*t;u.y=tr.from.y+(tr.to.y-tr.from.y)*t;
    if(now>=tr.readyAt){u.transit=null;u.phase='normal';}else continue;
   }
   if(u.pending){
    if(now>=u.pending.at){attacks.push({u,...u.pending});u.pending=null;}
    continue;
   }
   if(u.role===7){
    u.detectionDisabled=options.detectors===false;
    const injured=friends.filter(v=>v.id!==u.id&&v.hp<v.maxHP-1).sort((a,b)=>(a.hp/a.maxHP)-(b.hp/b.maxHP));
    const mate=injured[0]||friends.find(v=>v.role!==7);
    if(mate){if(d(u,mate)>u.def.range*.8)move(u,mate,dt);else if(injured.length&&u.cooldown<=0){mate.hp=Math.min(mate.maxHP,mate.hp+(u.def.heal||36));u.cooldown=u.def.rate;}}
    continue;
   }
   if(options.infiltration!==false&&u.role===X.ASSASSIN){
    const tr=X.infiltration(u,foes,now);if(tr){u.infiltrationUsed=true;u.transit=tr;u.phase='infiltrating';metrics.infiltrations[u.side]++;log('infiltration',{unit:u.id,target:tr.target});continue;}
   }
   let candidates=foes.filter(v=>targetable(u,v)&&(u.def.airTarget||v.def.kind!=='air'));
   candidates.sort((a,b)=>d(u,a)-d(u,b));let target=candidates[0];
   if(u.role===X.SNIPER){
    const inRange=candidates.filter(v=>d(u,v)<=u.def.range);
    if(inRange.length){
     const remaining=v=>v.hp-friends.reduce((sum,a)=>sum+(a.pending?.target===v.id?a.pending.damage*X.precisionMultiplier(a,v):0),0);
     const uncovered=inRange.filter(v=>remaining(v)>0);
     target=(uncovered.length?uncovered:inRange).sort((a,b)=>(b.def.cost/(1+d(u,b)*.001))-(a.def.cost/(1+d(u,a)*.001)))[0];
    }
   }
   if(u.role===X.ASSASSIN&&u.infiltrationUsed){
    const rear=candidates.filter(v=>[X.SNIPER,5,7].includes(v.role)&&d(u,v)<160);
    if(rear.length)target=rear.sort((a,b)=>d(u,a)-d(u,b))[0];
   }
   if(!target){if(foes.length)move(u,{x:u.side===0?1320:280,y:230},dt);continue;}
   const reach=u.def.range<48?u.def.range+8:u.def.range*.9;
   if(d(u,target)>reach)move(u,target,dt);
   else if(u.cooldown<=0){
    if(u.role===X.ASSASSIN&&options.attackReveal!==false)X.revealOnAttack(u,now);
    const multiplier=u.role===X.ASSASSIN&&u.firstStrike?X.RULES.firstStrikeMultiplier:1;
    u.pending={target:target.id,at:now+(u.def.aim||.18),damage:u.def.damage*multiplier};u.cooldown=u.def.rate;u.firstStrike=false;
    log('attack',{unit:u.id,target:target.id});
   }
  }
  for(const {u,target:targetId,damage} of attacks){
   if(!alive(u))continue;const target=units.find(v=>v.id===targetId);if(!target||!alive(target))continue;
   if(u.def.blast){for(const v of units)if(alive(v)&&v.side!==u.side&&(u.def.airTarget||v.def.kind!=='air')&&d(v,target)<=u.def.blast+10)hit(u,v,damage*(1-.48*d(v,target)/(u.def.blast+10)));}
   else hit(u,target,damage);
  }
  const remaining=[0,1].map(s=>units.filter(u=>alive(u)&&u.side===s));
  if(!remaining[0].length||!remaining[1].length||now>=150){
   finished=true;const survivorValue=remaining.map(a=>a.reduce((n,u)=>n+u.def.cost*Math.max(0,u.hp)/u.maxHP,0));
   result={winner:!remaining[0].length&&!remaining[1].length?'draw':!remaining[0].length?1:!remaining[1].length?0:'timeout',seconds:Number(now.toFixed(2)),spent,leftover:spent.map(n=>budget-n),survivorValue:survivorValue.map(Math.round),survivors:remaining.map(a=>a.length),deaths,metrics};
  }
 }
 return {units,originals,events,spent,metrics,tick,get time(){return now},get finished(){return finished},get result(){return result},definition};
}
const api={create};global.DesertExpansionModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
