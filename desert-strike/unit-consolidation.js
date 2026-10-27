/* Collapse twenty healthy identical troops into one authoritative aggregate. */
(function(global){'use strict';
const COUNT=20,STATS=['hp','damage','armor','heal'];
function population(units,predicate=()=>true){let n=0;for(const u of units)if(u.hp>0&&predicate(u))n+=u.heroCount===COUNT?COUNT:1;return n;}
function definition(base,u){if(u.heroCount!==COUNT)return base;const d={...base};for(const key of STATS)if(Number.isFinite(d[key]))d[key]*=COUNT;return d;}
function compact(units,{now=0,multiplayer=false,radius=180}={}){
 const buckets=new Map(),removed=new Set(),redirects=new Map(),heroes=[];
 for(const u of units){
  if(u.hp<=0||u.killed||u.heroCount||u.isHatchling||u.conscripted||u.hp<u.maxHP-1e-6||(u.inkUntil||0)>now)continue;
  const owner=multiplayer?u.uid:u.side,lane=multiplayer?Math.floor(u.y/520):0;
  const key=[owner,u.team??u.side,u.faction,u.role,u.skin||'default',u.maxHP,lane].join(':');
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(u);
 }
 for(const bucket of buckets.values()){
  for(const seed of bucket){
   if(removed.has(seed)||seed.heroCount)continue;
   const group=[];for(const u of bucket)if(!removed.has(u)&&!u.heroCount&&Math.hypot(u.x-seed.x,u.y-seed.y)<=radius){group.push(u);if(group.length===COUNT)break;}
   if(group.length<COUNT)continue;
   const hero=group[0],maxHP=hero.maxHP,x=group.reduce((s,u)=>s+u.x,0)/COUNT,y=group.reduce((s,u)=>s+u.y,0)/COUNT;
   Object.assign(hero,{heroCount:COUNT,hp:maxHP*COUNT,maxHP:maxHP*COUNT,x,y,spawnAge:0,hitAge:0,skillAge:.6,strike:null,targetId:null});
   if(Number.isFinite(hero.radius))hero.radius*=2;if(Number.isFinite(hero.hitRadius))hero.hitRadius*=2;
   for(const u of group.slice(1)){u.hp=0;u.killed=true;removed.add(u);redirects.set(u,hero);}
   heroes.push(hero);
  }
 }
 if(removed.size){let write=0;for(const u of units)if(!removed.has(u))units[write++]=u;units.length=write;
  for(const u of units){if(redirects.has(u.target))u.target=redirects.get(u.target);if(u.strike&&redirects.has(u.strike.target))u.strike.target=redirects.get(u.strike.target);}
 }
 return {heroes,redirects,removed:removed.size};
}
function aura(g,x,y,size,time=0){
 g.save();g.strokeStyle='#ff4055';g.fillStyle='#e8243940';g.lineWidth=Math.max(1,size*.025);g.globalAlpha=.68+.18*Math.sin(time*4);
 g.beginPath();g.ellipse(x,y,size*.46,size*.15,0,0,Math.PI*2);g.fill();g.stroke();
 for(let i=0;i<6;i++){const phase=(time*.55+i/6)%1,px=x+Math.sin(time*2+i)*size*.39,py=y-phase*size*.9;g.globalAlpha=(1-phase)*.7;g.fillRect(px,py,Math.max(1,size*.025),size*.075);}
 g.globalAlpha=.65;g.beginPath();g.ellipse(x,y-size*.24,size*.43,size*.43,0,Math.PI*1.12,Math.PI*1.88);g.stroke();g.restore();
}
const api=Object.freeze({COUNT,definition,population,compact,aura});
global.DesertConsolidation=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
