/* Paid, proactive AI planning. This module selects purchases; it never creates money. */
(function(global){'use strict';
const PLANS=[
 {id:'armor',name:'기갑 돌파',opening:[3,1],weights:[2,3,2,5,1,2,1,2]},
 {id:'air',name:'고속 특수전',opening:[6,1],weights:[1,3,2,2,1,2,5,2]},
 {id:'pressure',name:'전열 압박',opening:[0,1,0],weights:[5,4,2,2,1,2,2,1]},
 {id:'siege',name:'장갑 공성',opening:[3,2],weights:[1,3,3,4,1,5,1,2]}
];
function create(faction=0,random=Math.random){
 const index=Math.min(PLANS.length-1,Math.max(0,Math.floor(random()*PLANS.length)));
 return {plan:index,faction,opening:0,nextThink:0,spent:0,economyPurchases:0};
}
function choose(brain,{cash,counts,eco,readyAt,seconds,costs,ecoCost,intel={}}){
 const plan=PLANS[brain.plan],army=counts.reduce((a,b)=>a+b,0);
 const roles=intel.roles||[],seen=roles.reduce((a,b)=>a+b,0),major=roles.indexOf(Math.max(0,...roles));
 const concentrated=seen>=6&&major>=0&&roles[major]/seen>=.65;
 const groundSpecial=[3,4,6,7].includes(brain.faction);
 const focusCounters=concentrated?[[1,3],[3,5],[0,1],[2,groundSpecial?3:6],[2,3],[0,groundSpecial?1:6],(intel.air||0)>=roles[6]*.5?[4,1]:[2,3],[0,5]][major]:[];
 const counterReady=army>=6&&focusCounters.reduce((n,r)=>n+counts[r],0)>=army*.6;
 // Siege supported by spear infantry is a two-role strategy, not a pure
 // 65%-dominance spam. A mobile assault needs armor to tie up the spears and
 // ranged troops to thin them before the flanking cavalry reaches artillery.
 const protectedSiege=seen>=8&&roles[5]>=Math.max(4,seen*.38)&&roles[0]>=Math.max(2,seen*.16);
 if(protectedSiege&&army>=3){
  const ordered=[6,3,1],minimum=[.24,.22,.18];
  for(let i=0;i<ordered.length;i++){
   const role=ordered[i],goal=Math.max(1,Math.ceil(army*minimum[i]));
   if(counts[role]<goal){
    if(cash>=costs[role])return {kind:'unit',role};
    return null; // Save for a real counter, not more low-impact melee spam.
   }
  }
 }
 const pending=plan.opening[brain.opening];
 // An exposed rush takes precedence over a scripted opener. A blocked expensive
 // opener must never leave an affordable, useful defender unbuilt.
 const air=intel.air||0,armor=intel.armor||0;
 const uncoveredAir=air>=2&&counts[4]+counts[1]*.35<air*.4;
 const uncoveredArmor=armor>=2&&counts[2]<armor*.35;
 const urgent=!!intel.invaded||uncoveredAir||uncoveredArmor||(concentrated&&!counterReady);
 if(urgent){
  const counters=uncoveredAir?[4,1]:uncoveredArmor?[2,3]:concentrated?focusCounters:[1,3,0];
  const covered=counters.reduce((n,r)=>n+counts[r],0);
  const target=uncoveredAir?4:uncoveredArmor?2:counters.slice().sort((a,b)=>counts[a]-counts[b]||costs[a]-costs[b])[0];
  if(target!==undefined&&covered<Math.max(2,Math.ceil(army*.72))){
   if(cash>=costs[target])return {kind:'unit',role:target};
   // When the emergency counter is still unaffordable, bank for that precise
   // upgrade instead of wasting the saving on an irrelevant cheap unit.
   if(!intel.invaded)return null;
   const fallback=counters.find(r=>costs[r]<=cash);
   if(fallback!==undefined)return {kind:'unit',role:fallback};
  }
 }
 if(pending!==undefined)return cash>=costs[pending]?{kind:'unit',role:pending,opening:true}:null;
 // Build a real extractor about once a minute, once its preceding army exists.
 // Save only the actual upcoming purchase price; never preserve an arbitrary bank.
 const due=eco<Math.min(7,1+Math.floor(seconds/65))&&army>=2+eco*2&&seconds>=readyAt;
 if(due&&!urgent&&(!concentrated||counterReady)){
  if(cash>=ecoCost)return {kind:'econ'};
  return null;
 }
 const weights=plan.weights.slice();
 if(army<4)weights[7]=0;
 if(army<3)weights[5]*=.35;
 if(seconds>120){weights[5]+=2;weights[7]+=1.5;weights[3]+=1;}
 // Keep our initiative; scouted threats add limited support to the build plan.
 // Counts are actual visible ground/air targets, never hidden production slots.
 if(air>=2){weights[4]+=Math.min(7,air*1.2);weights[1]+=2;}
 if(armor>=2)weights[2]+=Math.min(6,armor);
 if(intel.invaded){weights[0]+=2;weights[1]+=3;weights[3]+=2;weights[5]*=.5;}
 // A scouted single-role army merits a committed response, not a tiny weight bump.
 // Keep 30% of the initiative plan; spend 70% of new capacity on two complementary counters.
 if(concentrated){
  const counters=focusCounters;
  const sum=weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++)weights[i]=weights[i]/sum*.3;
  weights[counters[0]]+=.45;weights[counters[1]]+=.25;
 }
 const sum=weights.reduce((a,b)=>a+b,0);
 const options=costs.map((cost,role)=>({role,cost,score:weights[role]/sum*(army+2)-counts[role]}))
  .filter(x=>x.role<8&&weights[x.role]>0).sort((a,b)=>b.score-a.score||a.cost-b.cost);
 if(!options.length)return null;
 // Commit to a real next purchase, otherwise buying a cheap trooper every
 // time 65 CR arrives would permanently starve armor/air/siege production.
 if(intel.invaded){const emergency=options.find(x=>x.cost<=cash);return emergency?{kind:'unit',role:emergency.role}:null;}
 const threat=(air>=2?'air':'')+(armor>=2?'armor':'')+(concentrated?'focus'+major+':'+focusCounters.join(','):'');
 if(brain.lastThreat!==threat){brain.nextRole=null;brain.lastThreat=threat;}
 const role=brain.nextRole??options[0].role;brain.nextRole=role;
 // Hold for a quality counter unless the frontline is under active pressure.
 if(cash>=costs[role])return {kind:'unit',role};
 if(intel.invaded){
  const alternative=options.find(x=>x.cost<=cash);
  return alternative?{kind:'unit',role:alternative.role}:null;
 }
 return null;
}
function bought(brain,action,cost){brain.spent+=cost;if(action.opening)brain.opening++;if(action.kind==='unit')brain.nextRole=null;if(action.kind==='econ')brain.economyPurchases++;}
const api=Object.freeze({create,choose,bought,plans:PLANS});global.DesertHardAI=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
