const ROOM_TYPES=['battle','trap','reward','named'];
function seeded(seed){let value=seed>>>0;return()=>{value+=0x6d2b79f5;let mixed=value;mixed=Math.imul(mixed^mixed>>>15,mixed|1);mixed^=mixed+Math.imul(mixed^mixed>>>7,mixed|61);return((mixed^mixed>>>14)>>>0)/4294967296;};}

export function createDungeonLayout(act,floor){
  const random=seeded(act*1009+floor*9176),branch=random()<.5,jitter=()=>Math.round((random()-.5)*4);
  const rooms=[
    {id:'start',type:'start',x:0,z:34,w:26,h:20,depth:0,shape:'ellipse'},
    {id:'gate',type:'battle',x:jitter(),z:20,w:29,h:23,depth:1,shape:'ellipse'},
    {id:'west',type:ROOM_TYPES[Math.floor(random()*4)],x:-22+jitter(),z:8+jitter(),w:30,h:25,depth:2,shape:'ellipse'},
    {id:'east',type:ROOM_TYPES[Math.floor(random()*4)],x:22+jitter(),z:8+jitter(),w:30,h:25,depth:2,shape:'ellipse'},
    {id:'cross',type:'battle',x:jitter(),z:-7,w:36,h:29,depth:3,shape:'ellipse'},
    {id:'deepWest',type:branch?'named':'reward',x:-23+jitter(),z:-24+jitter(),w:31,h:26,depth:4,shape:'ellipse'},
    {id:'deepEast',type:branch?'trap':'named',x:23+jitter(),z:-24+jitter(),w:31,h:26,depth:4,shape:'ellipse'},
    {id:'boss',type:'boss',x:jitter(),z:-42,w:38,h:30,depth:5,shape:'ellipse'}
  ];
  const connections=[['start','gate'],['gate','west'],['gate','east'],['west','east'],['west','cross'],['east','cross'],['west','deepWest'],['east','deepEast'],['cross','deepWest'],['cross','deepEast'],['deepWest','deepEast'],['deepWest','boss'],['deepEast','boss']];
  return {rooms,connections,discovered:new Set(['start']),activeRooms:new Set(['start']),seed:act*1009+floor*9176,bounds:{minX:-45,maxX:45,minZ:-59,maxZ:47},corridorWidth:13.5};
}

export function createAbyssLayout(tier,floor){
  const level=Math.max(1,Math.floor(tier)||1),layout=createDungeonLayout(1000+level,floor),growth=Math.min(6,Math.floor((level-1)/5));
  for(const room of layout.rooms){if(room.id==='start')continue;room.w+=Math.min(6,growth);room.h+=Math.min(4,growth);}
  layout.connections.push(['gate','cross'],['west','deepEast'],['east','deepWest']);
  layout.corridorWidth=15;layout.seed=level*7919+floor*104729;layout.mode='abyss';layout.tier=level;
  return layout;
}

export function roomById(layout,id){return layout?.rooms.find(room=>room.id===id)||null;}
export function roomAt(layout,x,z,padding=0){
  return layout?.rooms.find(room=>{const rx=Math.max(.1,room.w/2+padding),rz=Math.max(.1,room.h/2+padding);return room.shape==='ellipse'?((x-room.x)/rx)**2+((z-room.z)/rz)**2<=1:Math.abs(x-room.x)<=rx&&Math.abs(z-room.z)<=rz;})||null;
}
export function roomInteriorAt(layout,x,z,margin=1.8){return roomAt(layout,x,z,-Math.abs(margin));}
export function corridorRects(layout,width=layout?.corridorWidth||6.4){return layout.connections.flatMap(([aId,bId],index)=>{const a=roomById(layout,aId),b=roomById(layout,bId),horizontalFirst=(index+a.depth)%2===0,bend=horizontalFirst?{x:b.x,z:a.z}:{x:a.x,z:b.z};const segment=(from,to)=>({x:(from.x+to.x)/2,z:(from.z+to.z)/2,w:Math.abs(to.x-from.x)+width,h:Math.abs(to.z-from.z)+width});return[segment(a,bend),segment(bend,b)].filter(rect=>rect.w>width+.01||rect.h>width+.01);});}
export function isWalkable(layout,x,z){if(!layout)return true;if(x<layout.bounds.minX||x>layout.bounds.maxX||z<layout.bounds.minZ||z>layout.bounds.maxZ)return false;if(roomAt(layout,x,z,.35))return true;return corridorRects(layout).some(rect=>Math.abs(x-rect.x)<=rect.w/2&&Math.abs(z-rect.z)<=rect.h/2);}
export function closestWalkable(layout,x,z){if(!layout||isWalkable(layout,x,z))return{x,z};const candidates=[];for(const room of layout.rooms){const dx=x-room.x,dz=z-room.z,rx=room.w*.47,rz=room.h*.47,scale=Math.max(1,Math.hypot(dx/rx,dz/rz));candidates.push({x:room.x+dx/scale,z:room.z+dz/scale});}for(const rect of corridorRects(layout))candidates.push({x:Math.max(rect.x-rect.w/2,Math.min(rect.x+rect.w/2,x)),z:Math.max(rect.z-rect.h/2,Math.min(rect.z+rect.h/2,z))});return candidates.filter(point=>isWalkable(layout,point.x,point.z)).sort((a,b)=>(a.x-x)**2+(a.z-z)**2-(b.x-x)**2-(b.z-z)**2)[0]||{x:0,z:33};}
export function farthestRoom(layout){return layout.rooms.reduce((best,room)=>room.depth>best.depth?room:best,layout.rooms[0]);}
export function explorationSpawnRooms(layout){return layout.rooms.filter(room=>!['start','reward','boss'].includes(room.type));}
