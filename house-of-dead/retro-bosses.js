// Original boss roster for DEAD SHIFT. Inspired by arcade encounter design, not copied characters.
export const BOSSES=[
 {name:'승강기 포식자',arena:'elevator',attack:'강철문 충돌',hp:42,rate:3.3},
 {name:'복강 거미어미',arena:'nest',attack:'산란낭 포격',hp:48,rate:3.8},
 {name:'영안실 집행자',arena:'morgue',attack:'절단기 투척',hp:50,rate:4.2},
 {name:'침수된 흡혈충',arena:'flood',attack:'점액 분사',hp:44,rate:3.6},
 {name:'쌍두 집도의',arena:'surgery',attack:'교차 탄막',hp:46,rate:3.2},
 {name:'용광로 괴체',arena:'furnace',attack:'소각 분출',hp:54,rate:4.0},
 {name:'균사체 집합체',arena:'hive',attack:'포자 연쇄',hp:52,rate:3.6},
 {name:'시체 지네',arena:'tunnel',attack:'다절 산성포',hp:47,rate:3.4},
 {name:'경보실 비명체',arena:'alarm',attack:'비명 파동',hp:45,rate:3.1},
 {name:'심장 기관',arena:'heart',attack:'핵 심박 폭주',hp:60,rate:3.8}
];
export function bossForStage(seed,index){
 const b=Math.floor(index/5),cycle=Math.floor(b/10),nth=b%10;
 const r=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296};
 let x=(seed ^ Math.imul(cycle+1,0x71ea43c5))|0;
 if(!x)x=90125;
 const perm=Array.from({length:10},(_,i)=>i);
 for(let i=9;i>0;i--){const j=Math.floor(r()*(i+1));[perm[i],perm[j]]=[perm[j],perm[i]]}
 return perm[nth];
}
function mat(T,color,emissive=0){return new T.MeshStandardMaterial({color,roughness:.94,flatShading:true,emissive,emissiveIntensity:emissive?.34:0,side:T.DoubleSide})}
function shape(T,p,geo,material,pos,scale,root,hit='body',name=''){const m=new T.Mesh(geo,material);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;m.name=name;if(hit)m.userData.hit={root,kind:hit};p.add(m);return m}
function bulk(T,p,m,pos,scale,root,name=''){return shape(T,p,new T.IcosahedronGeometry(1,1),m,pos,scale,root,'body',name)}
function beam(T,p,m,aa,bb,radius,root,name){
 const v=new T.Vector3(...bb).sub(new T.Vector3(...aa)),len=v.length();
 const q=shape(T,p,new T.CylinderGeometry(radius*.85,radius,len,5),m,[(aa[0]+bb[0])/2,(aa[1]+bb[1])/2,(aa[2]+bb[2])/2],[1,1,1],root,'limb',name);
 q.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return q
}
function customCore(T,root,group,pos,material,slot){
 const core=shape(T,group,new T.IcosahedronGeometry(.22,1),material,pos,[1,1,.58],root,'weak','rupturable_core_'+slot);
 core.userData.hit.bossSlot=slot;
 const halo=new T.PointLight(0xff2912,1.1,2.5);halo.position.set(pos[0],pos[1],pos[2]+.23);group.add(halo);
 return {node:core,light:halo}
}
// Completely separate silhouettes for non-human bosses (spider, leech, hive, centipede, heart).
function anatomy(T,root,kind){
 const torso=new T.Group();root.add(torso);
 const head=new T.Group();head.position.set(0,2.25,0);torso.add(head);
 const jaw=new T.Group();head.add(jaw);
 const rag=mat(T,0x55403b),meat=mat(T,0x642b26),bone=mat(T,0xa59b80),shell=mat(T,0x303130),dark=mat(T,0x1b1818),glow=mat(T,0xa32b20,0xd3190f);
 const arms=[],legs=[],knees=[],elbows=[],feet=[],parts=[],cores=[];for(let i=0;i<2;i++){for(const group of [arms,legs,knees,elbows,feet]){const joint=new T.Group();torso.add(joint);group.push(joint)}}
 if(kind===1){ // spider queen: arachnid abdomen + eight articulated climbing legs
  bulk(T,torso,meat,[0,2.12,-.72],[1.15,.88,1.65],root,'abdominal_nest');
  bulk(T,torso,shell,[0,2.18,.72],[.77,.63,.82],root,'thorax');
  bulk(T,head,meat,[0,.08,.40],[.48,.47,.45],root,'fractured_face');
  for(let i=0;i<8;i++){const side=i<4?-1:1,k=i%4,zz=(k-1.5)*.75;
   const elbow=new T.Group();elbow.position.set(side*.61,2.07,zz);torso.add(elbow);parts.push({node:elbow,phase:k*.88+side});
   const kn=[side*(1.1+k*.09),2.64+k*.12,zz+(k-1.5)*.42],tip=[side*(2.5+k*.33),.06,zz+(k-1.5)*.56];
   beam(T,elbow,bone,[0,0,0],[kn[0]-elbow.position.x,kn[1]-elbow.position.y,kn[2]-elbow.position.z],.095,root,'spider_femur');
   beam(T,elbow,shell,[kn[0]-elbow.position.x,kn[1]-elbow.position.y,kn[2]-elbow.position.z],[tip[0]-elbow.position.x,tip[1]-elbow.position.y,tip[2]-elbow.position.z],.055,root,'spider_tibia');
  }
  for(let i=0;i<5;i++)bulk(T,torso,shell,[(i-2)*.31,2.55,-1.03+(i%2)*.3],[.16,.12,.22],root,'egg_wound');
  cores.push(customCore(T,root,torso,[0,2.3,-.08],glow,0),customCore(T,root,torso,[-.55,2.22,.67],glow,1),customCore(T,root,torso,[.53,2.12,.64],glow,2));
 }else if(kind===3){ // leech worm: ragged segmented body, gaping mouth
  for(let i=0;i<8;i++)bulk(T,torso,i%2?rag:meat,[0,1.5+i*.22,-i*.29],[.82-i*.046,.39,.44],root,'leech_ring_'+i);
  bulk(T,head,meat,[0,0,.46],[.55,.54,.33],root,'mouth_collar');
  shape(T,head,new T.TorusGeometry(.34,.12,5,9),dark,[0,0,.81],[1,1,.8],root,'head','ring_mouth');
  cores.push(customCore(T,root,torso,[0,1.63,.52],glow,0),customCore(T,root,torso,[-.32,2.03,.56],glow,1),customCore(T,root,torso,[.29,2.39,.40],glow,2));
 }else if(kind===6){ // colony: lumpy rooted structure with multi-sack tendrils
  for(let i=0;i<7;i++){const ang=i*2.399;
   const xx=Math.sin(ang)*.75,yy=1.65+Math.cos(ang)*.52,zz=Math.cos(ang)*.45;
   const sac=bulk(T,torso,i%2?rag:meat,[xx,yy,zz],[.49,.62,.43],root,'cluster_nest');
   parts.push({node:sac,phase:i*.76});
  }
  for(let j=0;j<7;j++){
    const aa=[Math.sin(j*2.4)*.51,1.6,0],bb=[Math.sin(j*2.4)*1.24,.1,Math.cos(j*2.4)*.87];
    beam(T,torso,meat,aa,bb,.10,root,'hanging_roots')
  }
  cores.push(customCore(T,root,torso,[0,2.36,.54],glow,0),customCore(T,root,torso,[-.55,1.73,.61],glow,1),customCore(T,root,torso,[.62,1.76,.58],glow,2));
 }else if(kind===7){ // corpse centipede: vertebrae linked into long articulated train
  const segments=[];
  for(let i=0;i<10;i++){
   const part=new T.Group();part.position.set(Math.sin(i*.35)*.10,1.34+Math.sin(i*.3)*.05,-i*.58);torso.add(part);segments.push(part);
   bulk(T,part,i%3?meat:rag,[0,0,0],[.62-i*.026,.42,.44],root,'armoured_segment');
   for(const side of [-1,1]){
    beam(T,part,bone,[side*.43,.08,.01],[side*(1.15-i*.037),-.96,.08],.082,root,'centipede_leg')
   }
  }
  parts.push(...segments.map((node,i)=>({node,phase:i*.42})));
  bulk(T,head,meat,[0,-.67,.56],[.65,.37,.55],root,'mandible_skull');
  cores.push(customCore(T,root,torso,[0,1.78,.52],glow,0),customCore(T,root,torso,[.22,1.46,-1.28],glow,1),customCore(T,root,torso,[-.23,1.43,-2.51],glow,2));
 }else{ // heart engine: multiple inward-folded ventricles around armored core
  for(let j=0;j<9;j++){
   const a=j*Math.PI*2/9;bulk(T,torso,j%3?rag:meat,[Math.cos(a)*.9,1.92+Math.sin(a)*.75,Math.sin(a)*.45],[.49,.53,.44],root,'cardiac_chamber');
  }
  bulk(T,torso,shell,[0,1.85,-.18],[.64,.80,.5],root,'armored_ventricle');
  for(let i=0;i<9;i++){const a=i*Math.PI*2/9;beam(T,torso,bone,[Math.sin(a)*.45,1.96+Math.cos(a)*.32,.26],[Math.sin(a)*1.31,.8+Math.cos(a)*1.1,.26],.064,root,'organic_conduit')}
  cores.push(customCore(T,root,torso,[0,2.14,.43],glow,0),customCore(T,root,torso,[-.45,1.70,.55],glow,1),customCore(T,root,torso,[.43,1.70,.56],glow,2));
 }
 return {hip:torso,head,jaw,arms,elbows,legs,knees,feet,extras:{worms:[],cores,barrel:null},bossParts:parts,coreMeshes:cores.map(c=>c.node),rigType:'custom'}
}
export function makeBoss(T,root,kind,makeHuman){
 const specialized=[1,3,6,7,9].includes(kind);
 const rig=specialized?anatomy(T,root,kind):makeHuman(T,root,6);
 const shell=mat(T,0x383536),flesh=mat(T,0x6b2c29),brass=mat(T,0x65564c),burn=mat(T,0x2a1714),core=mat(T,0x9a2b1e,0xdd2108),bone=mat(T,0xa79a7e);
 const g=rig.hip;
 if(kind===0){ // elevator stalker: extruded clamped limb plates, double shoulder
  for(const side of [-1,1]){bulk(T,g,brass,[side*.83,2.12,.02],[.38,.25,.41],root,'lift_crushed_shoulder');beam(T,g,flesh,[side*.86,2.2,0],[side*1.25,.40,.38],.17,root,'elongated_grabber')}
  shape(T,g,new T.BoxGeometry(1.35,.28,.19),shell,[0,2.28,-.38],[1,1,1],root,'body','steel_scrap_back');
 }else if(kind===2){ // morgue executioner: swollen asymmetric forearm and organic cutter
  bulk(T,g,flesh,[1.04,1.61,.36],[.64,1.05,.5],root,'hypertrophied_arm');
  beam(T,g,brass,[1.22,1.55,.41],[1.64,.36,.77],.22,root,'scrap_blade_hilt');
  shape(T,g,new T.BoxGeometry(.22,1.46,.49),bone,[1.65,.65,.72],[1,1,1],root,'limb','morgue_cleaver');
 }else if(kind===4){ // two heads facing away, surgeon scaffold
  bulk(T,g,flesh,[-.6,2.73,-.08],[.4,.47,.31],root,'second_skull');
  bulk(T,g,brass,[.13,2.35,-.55],[1.02,.19,.16],root,'surgical_restraint');
  for(let j=0;j<5;j++)beam(T,g,bone,[-.6+j*.3,2.17,.50],[-.48+j*.27,1.22,.58],.048,root,'exposed_suture');
 }else if(kind===5){ // incinerator: blackened boiler cowl + furnace cavities
  bulk(T,g,burn,[0,1.65,-.19],[1.06,1.14,.58],root,'charred_bulk');
  for(let i=0;i<5;i++)shape(T,g,new T.BoxGeometry(.13,.40,.14),core,[(i-2)*.23,1.48,.49],[1,1,1],root,'body','burning_chest_fissure');
  for(const side of [-1,1])beam(T,g,brass,[side*.42,2.21,-.35],[side*.91,3.00,-.52],.14,root,'furnace_exhaust');
 }else if(kind===8){ // quarantine shrieker: huge breathing air-sac and oscillating neck
  bulk(T,g,flesh,[0,2.52,.18],[.73,.77,.71],root,'inflated_throat');
  shape(T,g,new T.TorusGeometry(.42,.11,6,12),burn,[0,2.51,.83],[1,1,1],root,'head','shrieking_ring');
  for(let j=0;j<4;j++)beam(T,g,bone,[-.45+j*.28,2.13,.51],[-.59+j*.32,1.65,.62],.038,root,'cervical_bones');
 }
 const cores=rig.extras.cores||[];
 const tagged=[];
 root.traverse(o=>{if(o.isMesh&&o.userData.hit?.kind==='weak'){o.userData.hit.bossSlot=tagged.length;tagged.push(o)}});
 if(!cores.length){ // fallback for a malformed asset, keep fight finishable
  cores.push(customCore(T,root,g,[0,2.1,.45],core,0));
 }
 return {...rig,bossKind:kind,bossCores:cores,bossParts:rig.bossParts||[],bossWeakMeshes:tagged.length?tagged:cores.map(c=>c.node),rigType:rig.rigType||'humanoid'};
}
export function bossShots(kind,phase,pattern){
 const plans=[
  ['barrel','barrel','acid'],['acid','acid','acid','acid'],['barrel','barrel'],
  ['acid','acid','fire','acid'],['fire','acid','fire','acid'],['fire','fire','fire','fire'],
  ['acid','barrel','acid','barrel'],['acid','acid','acid','fire','acid'],
  ['fire','fire','acid'],['fire','acid','fire','barrel','acid']
 ];
 const shots=plans[kind%10].slice(),n=shots.length;
 if(phase>1)shots.push(shots[phase%shots.length]);
 return shots.map((type,i)=>({kind:type,offset:(i-(shots.length-1)/2)*(kind===7?.7:kind===3?.62:.95)}));
}
export function animateBoss(T,root,d,dt,time){
 if(!d.bossCores)return;
 const active=(d.bossPhase||0)%d.bossCores.length;
 for(let i=0;i<d.bossCores.length;i++){
  const c=d.bossCores[i],on=i===active,rate=.95+Math.sin(time*4+i)*.07;
  c.node.scale.setScalar((on?1.18:.68)*rate);
  c.light.intensity=on?1.8+Math.sin(time*6)*.4:.18;
 }
 for(const [i,p] of d.bossParts.entries()){
  p.node.rotation.y=Math.sin(time*.65+p.phase)*.065;
  p.node.rotation.x=Math.sin(time*1.1+p.phase)*.04;
 }
 const boss=d.bossKind;
 if(boss===1){d.hip.rotation.z=Math.sin(time*.58)*.08;d.hip.position.y=.14+.16*Math.sin(time*.72)}
 else if(boss===7){d.hip.position.y=.14+Math.sin(time*1.4)*.07}
 else if(boss===9){d.hip.rotation.y+=dt*.35;d.hip.position.y=.11+Math.sin(time*1.6)*.09}
 else if(boss===5){d.hip.position.y=.025*Math.sin(time*2.1)}
 if(d.spitState==='windup'){d.hip.rotation.x=-.1-.13*Math.sin(Math.PI*Math.min(1,d.spitTimer/2.4))}
}
export function bossCamera(boss,plan,elapsed,position){
 const angle=Math.sin(elapsed*(boss===0?.41:boss===4?.36:.23)+plan.roomSeed*.000001)*(boss===0?1.08:boss===1?.76:1.0);
 const radius=boss===0?6.4:boss===7?10.5:boss===9?10.1:8.3;
 const eye=[position.x+Math.sin(angle)*radius,1.82+(boss%3)*.33+Math.sin(elapsed*.45)*.13,position.z+Math.cos(angle)*radius];
 const look=[position.x, boss===1?2.1:2.4,position.z];
 return {eye,look}
}
