/* Visual interpolation only: latest snapshot controls membership, health and visibility. */
(function(global){'use strict';
function create(){
 let tracks=new Map(),received=0,duration=200,lastSeconds=-1;
 function sample(unit,now){
  const t=tracks.get(unit.id);if(!t)return unit;
  const a=Math.max(0,Math.min(1,(now-received)/duration));
  return {...unit,x:t.x+(unit.x-t.x)*a,y:t.y+(unit.y-t.y)*a};
 }
 function reset(){tracks.clear();received=0;lastSeconds=-1;}
 function receive(snapshot,now){
  if(!snapshot){reset();return;}
  if(snapshot.seconds<lastSeconds)reset();
  const next=new Map();
  for(const u of snapshot.units){
   const old=tracks.get(u.id),shown=old?sample(old.unit,now):u;
   // Never sweep teleports, lane changes, or reused IDs across the battlefield.
   const continuous=old&&old.unit.lane===u.lane&&old.unit.team===u.team&&old.unit.faction===u.faction&&Math.hypot(u.x-old.unit.x,u.y-old.unit.y)<180;
   next.set(u.id,{unit:u,x:continuous?shown.x:u.x,y:continuous?shown.y:u.y});
  }
  duration=received?Math.max(100,Math.min(250,now-received)):200;
  received=now;lastSeconds=snapshot.seconds;tracks=next;
 }
 return Object.freeze({receive,sample,reset});
}
global.DesertMultiplayerMotion=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
