const ROOM_TYPES=['battle','trap','reward','named'];
function seeded(seed){let value=seed>>>0;return()=>{value+=0x6d2b79f5;let mixed=value;mixed=Math.imul(mixed^mixed>>>15,mixed|1);mixed^=mixed+Math.imul(mixed^mixed>>>7,mixed|61);return((mixed^mixed>>>14)>>>0)/4294967296;};}

export function createDungeonLayout(act,floor){
  const random=seeded(act*1009+floor*9176),branch=random()<.5;
  const rooms=[
    {id:'start',type:'start',x:0,z:20,w:10,h:8,depth:0},
    {id:'gate',type:'battle',x:0,z:10,w:10,h:8,depth:1},
    {id:'west',type:ROOM_TYPES[Math.floor(random()*4)],x:-14,z:3,w:11,h:9,depth:2},
    {id:'east',type:ROOM_TYPES[Math.floor(random()*4)],x:14,z:3,w:11,h:9,depth:2},
    {id:'cross',type:'battle',x:0,z:-5,w:12,h:9,depth:3},
    {id:'deepWest',type:branch?'named':'reward',x:-14,z:-13,w:11,h:9,depth:4},
    {id:'deepEast',type:branch?'trap':'named',x:14,z:-13,w:11,h:9,depth:4},
    {id:'boss',type:'boss',x:0,z:-23,w:15,h:11,depth:5}
  ];
  const connections=[['start','gate'],['gate','west'],['gate','east'],['west','cross'],['east','cross'],['cross','deepWest'],['cross','deepEast'],['deepWest','boss'],['deepEast','boss']];
  return {rooms,connections,discovered:new Set(['start']),seed:act*1009+floor*9176};
}

export function roomById(layout,id){return layout?.rooms.find(room=>room.id===id)||null;}
export function roomAt(layout,x,z,padding=0){return layout?.rooms.find(room=>Math.abs(x-room.x)<=room.w/2+padding&&Math.abs(z-room.z)<=room.h/2+padding)||null;}
export function corridorRects(layout,width=3.2){return layout.connections.map(([aId,bId])=>{const a=roomById(layout,aId),b=roomById(layout,bId),horizontal={x:(a.x+b.x)/2,z:a.z,w:Math.abs(b.x-a.x)+width,h:width},vertical={x:b.x,z:(a.z+b.z)/2,w:width,h:Math.abs(b.z-a.z)+width};return[horizontal,vertical];}).flat();}
export function isWalkable(layout,x,z){if(!layout)return true;if(roomAt(layout,x,z,.25))return true;return corridorRects(layout).some(rect=>Math.abs(x-rect.x)<=rect.w/2&&Math.abs(z-rect.z)<=rect.h/2);}
export function farthestRoom(layout){return layout.rooms.reduce((best,room)=>room.depth>best.depth?room:best,layout.rooms[0]);}
export function explorationSpawnRooms(layout){return layout.rooms.filter(room=>!['start','reward','boss'].includes(room.type));}
