// DEAD SHIFT: original procedural arcade-horror stage director. No borrowed geometry, music or stage names.
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
 const boss=index%5===4;
 const lookZ=base-r()*2;
 return {name,index,layout,boss,eye:[camX,elev,lookZ+11.7+r()*4],look:[lookX,1.75,lookZ],bend:[(r()-.5)*7,(r()-.5)*.8,(r()-.5)*2],roomSeed:Math.floor(r()*0xffffffff),hue:r(),count:boss?3+Math.floor(r()*3):4+Math.min(5,Math.floor(index/3))+Math.floor(r()*3)};
}
export function waveData(seed,index){
 const plan=stageData(seed,index),r=randomFromSeed(plan.roomSeed ^ 0xa33c77);
 const weights=index<2?[0,0,0,1,0,3]:index<4?[0,0,1,2,3,4,5]:[0,0,1,2,3,4,5,1,2,3,4,5];
 const enemies=[];
 const cap=plan.count;
 for(let k=0;k<cap;k++){
   const type=plan.boss&&k===cap-1?6:weights[Math.floor(r()*weights.length)];
   const lane=(k-(cap-1)/2)*1.32+(r()-.5)*.65;
   const depth=2.0+(k%4)*1.6+r()*2.0;
   const angle=(r()-.5)*1.2;
   const pattern=type===6?Math.floor(r()*5):Math.floor(r()*6);
   enemies.push({type,x:plan.look[0]+lane+Math.sin(angle)*2,z:plan.look[2]-depth,pattern,tempo:.8+r()*.6,stagger:r()*2.8});
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
 return {root:p,lights,plan};
}
export function animateRoom(room,time){
 if(!room)return;
 for(const {light,phase,speed} of room.lights){
   const flicker=Math.sin(time*speed+phase)>-.94?1:.16;
   light.intensity=(light.color.getHex()===0xc34a3a?5.8:10)*(flicker+.08*Math.sin(time*3.3+phase));
 }
}
