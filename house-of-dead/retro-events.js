// Retro arcade side events: deterministic map-themed supplies and protectable civilians.
export function seeded(seed){let x=seed>>>0||0xabcd01;return ()=>{x=(Math.imul(x,1664525)+1013904223)|0;return(x>>>0)/4294967296}}
const themes=[
 {label:'격리 병동',cloth:0x6e8b78,accent:0xa8bf9a,grime:0x342c2b},
 {label:'오염 수술실',cloth:0x819da1,accent:0xc6c1a2,grime:0x463033},
 {label:'사체 보관소',cloth:0x6e768d,accent:0xc9c6bb,grime:0x212d33},
 {label:'실험동',cloth:0x979879,accent:0xc2b499,grime:0x414631},
 {label:'폐기 통로',cloth:0x675c50,accent:0xafa891,grime:0x49332f},
 {label:'소각 구역',cloth:0x4b4a4a,accent:0xa3836e,grime:0x3c2726},
 {label:'감염 원실',cloth:0x525f48,accent:0x8c9575,grime:0x443026}
];
export function lookForEnemy(seed,stage,index,type,roomTheme=0){
 const r=seeded((seed^Math.imul(stage+1,0x6b459123)^Math.imul(index+3,0x41c64e6d))>>>0);
 const theme=r()<.76?roomTheme%7:Math.floor(r()*7);
 return {theme,palette:(theme+Math.floor(r()*3))%7,damage:Math.floor(r()*3),injury:r(),wrap:r()>.45,accessory:Math.floor(r()*4),height:.91+r()*.19,tilt:(r()-.5)*.14,wear:r(),maggots:r()>.57?1:0,themeName:themes[theme].label};
}
export function themeForPlan(plan){const n=plan.name||'';if(n.includes('수술'))return 1;if(n.includes('영안')||n.includes('사체'))return 2;if(n.includes('실험')||n.includes('배양'))return 3;if(n.includes('폐기')||n.includes('처리')||n.includes('지하'))return 4;if(n.includes('소각')||n.includes('용광'))return 5;if(n.includes('감염')||n.includes('균사'))return 6;return plan.layout%7}
export function sectorEvents(seed,stage,plan){
 const r=seeded((seed^Math.imul(stage+1,0xabc983)^plan.roomSeed)>>>0);
 if(plan.boss)return [];
 const events=[];
 const lane=plan.look[0],zz=plan.look[2];
 if(r()<.61){
  const kind=r()<.54?'health':'grenade';
  events.push({kind,id:'supply:'+stage,pos:[lane+(r()<.5?-1:1)*(3.2+r()*2.5),.45,zz+2.25+r()*1.1],theme:themeForPlan(plan)})
 }
 if(stage>0&&r()<.46){
  events.push({kind:'civilian',id:'civilian:'+stage,pos:[lane+(r()<.5?-1:1)*(1.9+r()*2.0),0,zz+3.8+r()*1.1],theme:themeForPlan(plan),variant:Math.floor(r()*3),cross:r()<.43})
 }
 return events;
}
function mat(T,c){return new T.MeshStandardMaterial({color:c,flatShading:true,roughness:1,metalness:0})}
function prism(T,parent,geo,material,x,y,z,sx=1,sy=1,sz=1,hitRoot=null){
 const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);
 m.castShadow=true;if(hitRoot)m.userData.eventRoot=hitRoot;parent.add(m);return m
}
function c(T,p,m,x,y,z,w,h,d,root=null){return prism(T,p,new T.BoxGeometry(w,h,d),m,x,y,z,1,1,1,root)}
function body(T,p,m,x,y,z,rx,ry,rz,root){return prism(T,p,new T.IcosahedronGeometry(1,0),m,x,y,z,rx,ry,rz,root)}
export function buildEvent(T,scene,ev){
 const root=new T.Group();root.name='ORIGINAL_ARCADE_EVENT_'+ev.kind;root.position.set(...ev.pos);scene.add(root);
 const theme=themes[ev.theme%themes.length],r=seeded(ev.theme*91231+(ev.variant||0)*173+ev.id.length);
 let parts={};
 if(ev.kind==='health'||ev.kind==='grenade'){
  const main=mat(T,ev.kind==='health'?0xddd5b9:0x515e4c),band=mat(T,ev.kind==='health'?0x9c1c23:0xc0b66d),trim=mat(T,0x262d2b);
  c(T,root,trim,0,-.37,0,.92,.13,.65,root);
  c(T,root,main,0,.02,0,.95,.65,.65,root);
  c(T,root,trim,0,.36,0,.89,.07,.60,root);
  c(T,root,band,0,.02,.338,ev.kind==='health'?.65:.52,.13,.028,root);
  if(ev.kind==='health')c(T,root,band,0,.02,.356,.13,.49,.035,root);
  else for(let i=-1;i<=1;i++)c(T,root,band,i*.21,.065,.357,.09,.29,.035,root);
  const halo=prism(T,root,new T.RingGeometry(.46,.51,12),new T.MeshBasicMaterial({color:ev.kind==='health'?0xdd5151:0xf4d36d,transparent:true,opacity:.75,side:T.DoubleSide}),0,-.445,0,1.1,1.1,1.1);
  halo.rotation.x=-Math.PI/2;
  parts.halo=halo;
 }else{
  // A plainly living NPC, distinct from infected: clean clothes, no wound meshes, hands raised.
  const shirt=mat(T,ev.variant===1?0xd3cbb2:ev.variant===2?0xc9a46a:theme.cloth);
  const pants=mat(T,ev.variant===2?0x33363a:0x4c5c61);
  const skin=mat(T,ev.variant===0?0xc5a08b:ev.variant===1?0xc5967b:0x97735f);
  const hair=mat(T,ev.variant===2?0x282222:0x423b33);
  const shoe=mat(T,0x202627);
  parts.body=c(T,root,shirt,0,1.56,0,.84,1.05,.43,root);
  c(T,root,shirt,0,1.89,.235,.29,.15,.035,root);
  c(T,root,hair,0,2.62,-.02,.55,.27,.42,root);
  parts.head=body(T,root,skin,0,2.37,.075,.31,.42,.28,root);
  for(const side of [-1,1]){
   c(T,root,pants,side*.20,.68,0,.32,1.21,.37,root);
   c(T,root,shoe,side*.21,.115,.14,.34,.20,.57,root);
   const arm=new T.Group();arm.position.set(side*.57,1.98,0);root.add(arm);
   c(T,arm,shirt,side*.14,-.34,0,.26,.72,.30,root);
   c(T,arm,skin,side*.19,-.79,.06,.22,.26,.22,root);
   arm.rotation.z=side*-.92;arm.rotation.x=-.32;
   (parts.arms||= []).push(arm)
  }
  if(ev.variant===1)c(T,root,mat(T,0x9b3738),0,1.30,.235,.40,.18,.036,root);
  if(ev.variant===2)c(T,root,mat(T,0xcdbd66),0,1.57,.24,.65,.08,.027,root);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,256,64);
  ctx.fillStyle='#1a1717';ctx.fillRect(1,4,254,55);
  ctx.strokeStyle='#f5dd95';ctx.lineWidth=4;ctx.strokeRect(4,6,248,51);
  ctx.fillStyle='#f7df9f';ctx.font='bold 28px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(ev.variant===1?"DON'T SHOOT":'HELP ME!',128,34);
  const labelTex=new T.CanvasTexture(canvas);labelTex.colorSpace=T.SRGBColorSpace;labelTex.magFilter=T.NearestFilter;
  const label=prism(T,root,new T.PlaneGeometry(1.56,.36),new T.MeshBasicMaterial({map:labelTex,transparent:true,side:T.DoubleSide,depthWrite:false}),0,3.10,.12,1,1,1);
  parts.label=label;
 }
 root.userData={kind:ev.kind,event:true,id:ev.id,alive:true,collected:false,cross:ev.cross||false,theme:ev.theme,variant:ev.variant,parts,age:0,spawnX:root.position.x,spawnY:root.position.y,spawnZ:root.position.z};
 return root;
}
export function animateEvent(obj,dt,time){
 const d=obj.userData;d.age+=dt;
 if(d.kind==='civilian'){
  if(d.parts.arms)for(let i=0;i<d.parts.arms.length;i++){
   d.parts.arms[i].rotation.x=-.35+.21*Math.sin(time*7+i*3+d.variant);
  }
  d.parts.head.rotation.z=Math.sin(time*3.1+d.variant)*.08;
  if(d.cross&&d.age>1.15)obj.position.x=d.spawnX+Math.sin(Math.min(1,(d.age-1.15)/1.1)*Math.PI/2)*1.05;
 }else {
  obj.rotation.y+=dt*.9;
  d.parts.halo.material.opacity=.60+.20*Math.sin(time*5+d.theme)
 }
}
