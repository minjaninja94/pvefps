// DEAD SHIFT: original procedural arcade-horror stage director. No borrowed geometry, music or stage names.
import { BOSSES, bossForStage } from './retro-bosses.js';
export function randomFromSeed(seed){
 let x=(seed>>>0)||0x51e4;return ()=>{x=(x+0x6d2b79f5)|0;let t=Math.imul(x^(x>>>15),1|x);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296};
}
const names=['격리 병동','부패한 수술실','침수된 영안실','혈관 배양실','폐기물 처리구','지하 사체 창고','폐쇄 통로','생체 실험동','구급차 차고','방사선 격리실','냉각 배관실','감염 원실'];
export function stageData(seed,index){
 const r=randomFromSeed((seed^Math.imul(index+1,0x9e3779b1))>>>0);
 const base=-6-index*17;
 const corridor=(r()-.5)*9.5;
 const lookX=corridor+(r()-.5)*3.3;
 const camX=corridor+(r()-.5)*10.4;
 const elev=1.65+r()*1.9;
 const layout=Math.floor(r()*5);
 const name=names[(Math.floor(r()*names.length)+index)%names.length];
 const boss=index%5===4,kind=boss?bossForStage(seed,index):-1;
 const lookZ=base-r()*2;
 return {name:boss?BOSSES[kind].name:name,index,layout:boss?kind:layout,boss,bossKind:kind,arena:boss?BOSSES[kind].arena:null,eye:[camX,elev,lookZ+11.7+r()*4],look:[lookX,1.75,lookZ],bend:[(r()-.5)*7,(r()-.5)*.8,(r()-.5)*2],roomSeed:Math.floor(r()*0xffffffff),hue:r(),count:boss?2+Math.floor(r()*2):4+Math.min(5,Math.floor(index/3))+Math.floor(r()*3)};
}
export function waveData(seed,index){
 const plan=stageData(seed,index),r=randomFromSeed(plan.roomSeed ^ 0xa33c77);
 const weights=index<2?[0,0,0,1,0,3,7]:index<4?[0,0,1,2,3,4,5,7]:[0,0,1,2,3,4,5,7,8,9,1,2,3,4,5];
 const enemies=[];
 const cap=plan.count;
 for(let k=0;k<cap;k++){
   const type=plan.boss&&k===cap-1?6:weights[Math.floor(r()*weights.length)];
   const lane=(k-(cap-1)/2)*1.32+(r()-.5)*.65;
   const depth=2.0+(k%4)*1.6+r()*2.0;
   const angle=(r()-.5)*1.2;
   const pattern=type===6?Math.floor(r()*5):Math.floor(r()*6);
   const bossSpawn=plan.boss&&k===cap-1;
   enemies.push({type,x:bossSpawn?plan.look[0]:plan.look[0]+lane+Math.sin(angle)*2,z:bossSpawn?plan.look[2]-3.1:plan.look[2]-depth,bossKind:bossSpawn?plan.bossKind:-1,pattern,tempo:.8+r()*.6,stagger:r()*2.8});
 }
 return {plan,enemies};
}
function material(T,color,emissive=0){return new T.MeshStandardMaterial({color,flatShading:true,roughness:1,metalness:0,emissive,emissiveIntensity:emissive?.15:0,side:T.DoubleSide})}
function cube(T,p,m,x,y,z,a,b,c){const q=new T.Mesh(new T.BoxGeometry(a,b,c),m);q.position.set(x,y,z);q.receiveShadow=true;q.castShadow=true;p.add(q);return q}
function face(T,p,m,points){const g=new T.BufferGeometry();let verts=[],idx=[];for(const [x,y,z] of points)verts.push(x,y,z);for(let i=1;i<points.length-1;i++)idx.push(0,i,i+1);g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();const q=new T.Mesh(g,m);q.receiveShadow=true;q.material.side=T.DoubleSide;p.add(q);return q}
function patch(T,p,m,x,y,z,scale,r){const c=5+Math.floor(r()*4),v=[];for(let j=0;j<c;j++){const a=j/c*Math.PI*2;v.push([x+Math.cos(a)*scale*(.5+r()),y+.002+r()*.004,z+Math.sin(a)*scale*(.5+r())])}face(T,p,m,v)}
export function buildRoom(T,scene,plan){
 const r=randomFromSeed(plan.roomSeed),p=new T.Group();p.name='ORIGINAL_GORE_STAGE_'+plan.index;scene.add(p);
 const x=plan.look[0],z=plan.look[2];
 const concrete=material(T,0x303536),stained=material(T,0x42413c),wall=material(T,0x343b39);
 const soot=material(T,0x201e1f),red=material(T,0x44090a),grit=material(T,0x63554a);
 const metal=material(T,0x50514c),tube=material(T,0x22292a),slime=material(T,0x2a3427);
 const pale=material(T,0x737366),flesh=material(T,0x5e2f29),lamp=material(T,0xb2a38d,0xffd3a1);
 const W=15.5,L=27.5,zc=z-1.5;
 cube(T,p,concrete,x,-.22,zc,W*2,.42,L);
 // Patchwork slabs, gouged floors and stains; no solid walls in the line of fire.
 for(let row=0;row<9;row++)for(let col=0;col<7;col++){
   if(r()<.23)continue;
   const xx=x+(col-3)*4.1+(r()-.5)*.3,zz=zc+(row-4)*2.75;
   cube(T,p,r()<.33?stained:concrete,xx,.012,zz,3.94,.021,2.63)
 }
 for(let i=0;i<55;i++)patch(T,p,r()<.32?slime:red,x+(r()-.5)*25,.027,zc+(r()-.5)*23,.15+r()*.85,r);
 for(const side of [-1,1]){
   const sx=x+side*13;
   cube(T,p,wall,sx,3.5,zc,.7,7,L);
   for(let i=0;i<8;i++){
     const zz=zc-12+i*3.35;
     cube(T,p,soot,sx-side*.42,2.8,zz,.045,3.1,.45+r()*.6);
     if(r()<.65)face(T,p,red,[[sx-side*.48,4.4,zz],[sx-side*.49,4.35,zz+.4],[sx-side*.49,2.1,zz+.1]]);
     if(r()<.52){
       for(let j=0;j<4;j++){const yy=.5+j*.85;cube(T,p,metal,sx-side*.7,yy,zz,.11,.09,1.2+r())}
     }
   }
   for(let c=0;c<6;c++){
     const xx=x+side*(9.5+r()*2.1),zz=zc-10+c*3.8;
     if(r()<.48){
       cube(T,p,metal,xx,.91,zz,1.1,1.5,2.25);
       cube(T,p,soot,xx,1.71,zz,1.16,.13,2.37);
       // Ragged covered cadaver silhouette in the background; no round gore decorations.
       for(let k=0;k<3;k++)face(T,p,k===0?flesh:grit,[[xx-.55,1.8,zz-.7+k*.39],[xx+.40,1.81,zz-.78+k*.42],[xx+.46,1.69,zz-.51+k*.4],[xx-.46,1.66,zz-.44+k*.36]]);
     }else{
       cube(T,p,grit,xx,.7,zz,1.3,1.38,1.35);
       cube(T,p,soot,xx,1.46,zz,1.37,.17,1.42);
     }
   }
 }
 // Ceiling is intentionally open for unobstructed camera aiming; dangling lamps and ripped strips.
 const lights=[];
 for(let i=0;i<4;i++){
   const zz=zc-11+i*7.2,xx=x+(r()-.5)*10.5;
   cube(T,p,tube,xx,5.75,zz,3.4,.11,.9);
   cube(T,p,lamp,xx,5.66,zz,2.35,.05,.35);
   const light=new T.PointLight(i%3===0?0xc34a3a:0xbccab6,i%3===0?5.8:10,17);
   light.position.set(xx,5.3,zz);p.add(light);
   lights.push({light,phase:r()*9,speed:.9+r()*2});
 }
 for(let i=0;i<8;i++){
   const xx=x+(r()-.5)*18,zz=zc+(r()-.5)*21;
   // Frayed hanging surgical sheets, shards, and torn cable bundles.
   const hh=.5+r()*1.65;
   face(T,p,i%3===0?red:grit,[[xx,5.2,zz],[xx+.3,5.1,zz+.02],[xx+.42,5.2-hh,zz+.14],[xx-.2,5.1-hh*.84,zz-.13]]);
 }
 if(plan.layout===2||plan.layout===4){
   // Distant industrial vat silhouettes and pipe work, kept behind approach lanes.
   for(let i=0;i<5;i++){
     const xx=x+(i%2?11.4:-11.5),zz=zc-11+i*5;
     const barrel=new T.Mesh(new T.CylinderGeometry(.55,.65,1.45,7),metal);
     barrel.position.set(xx,.71,zz);barrel.castShadow=true;p.add(barrel);
     cube(T,p,red,xx,1.0,zz+.56,.58,.17,.1);
   }
 }
 if(plan.boss)arenaDetails(T,p,plan);
 return {root:p,lights,plan};
}
function arenaDetails(T,p,plan){
 const r=randomFromSeed(plan.roomSeed^0x810232a),cx=plan.look[0],z=plan.look[2]-3;
 const steel=material(T,0x44474a),dark=material(T,0x1d2022),rust=material(T,0x765042),flesh=material(T,0x58221f),bone=material(T,0x9d8d74),slime=material(T,0x3d4a31),warning=material(T,0xb75127,0xe02b0a);
 const type=plan.bossKind;
 if(type===0){ // claustrophobic lift with slatted doors, 3 outside windows, moving camera inside
  for(const side of [-1,1]){
   cube(T,p,steel,cx+side*5,3.1,z,.20,6.2,10.6);
   for(let i=0;i<9;i++)cube(T,p,rust,cx+side*4.92,1.0+i*.62,z,.24,.065,10.4);
  }
  cube(T,p,steel,cx,5.93,z,10.2,.2,10.3);
  for(let i=0;i<7;i++){const zz=z-4.6+i*1.48;cube(T,p,steel,cx+5.05,3,zz,.16,5.4,.11)}
  for(let i=0;i<4;i++)cube(T,p,dark,cx-4.5+i*2.8,5.63,z,1.3,.18,8.1);
 }else if(type===1){ // veined spider web across the ceiling, never across enemy heads
  for(let i=0;i<11;i++){const a=i/11*Math.PI*2;
   const x=cx+Math.cos(a)*5.9,zz=z+Math.sin(a)*5.9;
   face(T,p,bone,[[cx,5.7,z],[x,5.4,zz],[x+.12,5.4,zz+.08]]);
  }
  for(let i=0;i<13;i++){
   const a=i/13*Math.PI*2;
   const x=cx+Math.cos(a)*4.6,zz=z+Math.sin(a)*4.6;
   cube(T,p,flesh,x,.17,zz,.18,.3,.4);
  }
 }else if(type===2){for(let i=0;i<6;i++){const zz=z-5+i*2.2;cube(T,p,steel,cx+8,.87,zz,1.4,1.5,1.8);cube(T,p,rust,cx-8,.8,zz,1.6,1.3,2.4)}}
 else if(type===3){for(let i=0;i<15;i++){const x=cx+(r()-.5)*19,zz=z+(r()-.5)*17;patch(T,p,slime,x,.055,zz,.6+r()*1.1,r)}}
 else if(type===4){for(const side of [-1,1]){for(let i=0;i<5;i++)cube(T,p,steel,cx+side*7,1.2,z-6+i*2.8,1.5,2.1,.6)}}
 else if(type===5){for(let i=0;i<6;i++)cube(T,p,rust,cx+(i%2?9:-9),1.0,z-6+Math.floor(i/2)*5.2,1.7,1.8,2.3)}
 else if(type===6){for(let i=0;i<13;i++){const a=i*2.39,x=cx+Math.sin(a)*(3+r()*5),zz=z+Math.cos(a)*(3+r()*5);
   const plant=new T.Mesh(new T.IcosahedronGeometry(.6+r()*.4,0),flesh);plant.position.set(x,.55,zz);p.add(plant)}}
 else if(type===7){for(let i=0;i<12;i++){const zz=z-11+i*2.0;cube(T,p,dark,cx-9,.24,zz,2.0,.4,1.4);cube(T,p,dark,cx+9,.24,zz,2.0,.4,1.4)}}
 else if(type===8){for(let i=0;i<8;i++){const xx=cx+(i%2?-11:11),zz=z-6+Math.floor(i/2)*3.8;cube(T,p,warning,xx,3.8,zz,.45,.9,.7)}}
 else if(type===9){for(let i=0;i<10;i++){const a=i*Math.PI*2/10;const x=cx+Math.cos(a)*6,zz=z+Math.sin(a)*6;cube(T,p,bone,x,1.3,zz,.24,2.55,.25)}}
}
export function animateRoom(room,time){
 if(!room)return;
 for(const {light,phase,speed} of room.lights){
   const flicker=Math.sin(time*speed+phase)>-.94?1:.16;
   light.intensity=(light.color.getHex()===0xc34a3a?5.8:10)*(flicker+.08*Math.sin(time*3.3+phase));
 }
}

// Delete GPU-side stage resources when the camera leaves; endless runs stay bounded.
export function disposeRoom(room,scene){if(!room)return;scene.remove(room.root);const geometries=new Set(),materials=new Set();room.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){const mm=Array.isArray(o.material)?o.material:[o.material];for(const m of mm)materials.add(m)}});for(const g of geometries)g.dispose?.();for(const m of materials)m.dispose?.()}
