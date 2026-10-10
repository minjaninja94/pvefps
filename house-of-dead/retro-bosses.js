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
function mat(T,color,emissive=0){return new T.MeshStandardMaterial({color,roughness:.94,flatShading:false,emissive,emissiveIntensity:emissive?.34:0,side:T.DoubleSide})}
function shape(T,p,geo,material,pos,scale,root,hit='body',name=''){const m=new T.Mesh(geo,material);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;m.name=name;if(hit)m.userData.hit={root,kind:hit};p.add(m);return m}
function bulk(T,p,m,pos,scale,root,name=''){return shape(T,p,new T.SphereGeometry(1,12,9),m,pos,scale,root,'body',name)}
function beam(T,p,m,aa,bb,radius,root,name){
 const v=new T.Vector3(...bb).sub(new T.Vector3(...aa)),len=v.length();
 const q=shape(T,p,new T.CylinderGeometry(radius*.75,radius,len,8),m,[(aa[0]+bb[0])/2,(aa[1]+bb[1])/2,(aa[2]+bb[2])/2],[1,1,1],root,'limb',name);
 q.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return q
}
function customCore(T,root,group,pos,material,slot){
 const core=shape(T,group,new T.SphereGeometry(.22,14,10),material,pos,[1,1,.68],root,'weak','rupturable_core_'+slot);
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
   const elbow=new T.Group();elbow.position.set(side*.61,2.07,zz);torso.add(elbow);parts.push({node:elbow,phase:k*.88+side,role:'spiderHip',side,k});
   const kn=[side*(1.1+k*.09),2.64+k*.12,zz+(k-1.5)*.42],tip=[side*(2.5+k*.33),.06,zz+(k-1.5)*.56];
   const kneeLocal=[kn[0]-elbow.position.x,kn[1]-elbow.position.y,kn[2]-elbow.position.z];
   beam(T,elbow,bone,[0,0,0],kneeLocal,.087,root,'jointed_spider_femur');
   const joint=new T.Group();joint.position.set(...kneeLocal);elbow.add(joint);
   parts.push({node:joint,phase:k*.88+side*.43,role:'spiderKnee',side,k});
   beam(T,joint,shell,[0,0,0],[tip[0]-kn[0],tip[1]-kn[1],tip[2]-kn[2]],.053,root,'jointed_spider_tibia');
   bulk(T,joint,meat,[0,0,0],[.115,.11,.12],root,'organic_knee_socket');
   // Irregular exoskeletal scars wrap the *body*, not artificial spikes.
   beam(T,torso,bone,[side*.34,2.34,.83],[side*.67,2.35,.92],.034,root,'spider_thorax_ridge');
  }
  for(let i=0;i<5;i++)bulk(T,torso,shell,[(i-2)*.31,2.55,-1.03+(i%2)*.3],[.16,.12,.22],root,'egg_wound');
  cores.push(customCore(T,root,torso,[0,2.5,1.51],glow,0),customCore(T,root,torso,[-.56,2.16,1.43],glow,1),customCore(T,root,torso,[.56,2.16,1.43],glow,2));
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
  cores.push(customCore(T,root,torso,[0,2.4,1.05],glow,0),customCore(T,root,torso,[-.55,1.75,1.06],glow,1),customCore(T,root,torso,[.62,1.77,1.07],glow,2));
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
  cores.push(customCore(T,root,torso,[0,1.83,.66],glow,0),customCore(T,root,torso,[.42,1.97,-.30],glow,1),customCore(T,root,torso,[-.46,2.03,-.89],glow,2));
 }else{ // heart engine: multiple inward-folded ventricles around armored core
  for(let j=0;j<9;j++){
   const a=j*Math.PI*2/9;bulk(T,torso,j%3?rag:meat,[Math.cos(a)*.9,1.92+Math.sin(a)*.75,Math.sin(a)*.45],[.49,.53,.44],root,'cardiac_chamber');
  }
  bulk(T,torso,shell,[0,1.85,-.18],[.64,.80,.5],root,'armored_ventricle');
  for(let i=0;i<9;i++){const a=i*Math.PI*2/9;beam(T,torso,bone,[Math.sin(a)*.45,1.96+Math.cos(a)*.32,.26],[Math.sin(a)*1.31,.8+Math.cos(a)*1.1,.26],.064,root,'organic_conduit')}
  cores.push(customCore(T,root,torso,[0,2.14,1.02],glow,0),customCore(T,root,torso,[-.45,1.70,1.03],glow,1),customCore(T,root,torso,[.43,1.70,1.04],glow,2));
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

 // Tissue overlays follow the core musculature, rather than tacked-on spikes or cubes.
 // Separate the weakpoint socket from the body and make the next target legible even at 760px.
 const fracture=mat(T,0x4d1c22),tendon=mat(T,0x9c786c),viscera=mat(T,0x893b32),shadows=mat(T,0x2a1117);
 const bossRng=(()=>{let q=(kind+1)*214013;return()=>{q=(Math.imul(q,1664525)+1013904223)>>>0;return q/4294967296}})();
 for(let i=0;i<10;i++){
  const ang=i*2.39996,x=Math.sin(ang)*(.24+bossRng()*.48),y=1.25+bossRng()*1.13;
  const z=.34+bossRng()*.06;
  const tone=i%3===0?fracture:i%3===1?viscera:tendon;
  // Small asymmetric lesions built flush into the front shell.
  const blister=shape(T,g,new T.SphereGeometry(1,8,6),tone,[x,y,z],[.095+bossRng()*.055,.045+bossRng()*.09,.025],root,null,'subdermal_lesion');
  blister.rotation.z=(bossRng()-.5)*1.3;
 }
 // Thin crawling tendons make large organs look connected rather than floating.
 for(let i=0;i<5;i++){
  const x=(i-2)*.17,z=.40+bossRng()*.08;
  beam(T,g,i%2?viscera:shadows,[x,1.12,z],[x+(bossRng()-.5)*.28,1.62+bossRng()*.58,z+.045],.026,root,'woven_chest_tendon')
 }
 const cores=rig.extras.cores||[];
 const tagged=[];
 root.traverse(o=>{if(o.isMesh&&o.userData.hit?.kind==='weak'){o.userData.hit.bossSlot=tagged.length;tagged.push(o)}});
 for(const item of tagged){if(item.material?.isMeshStandardMaterial){item.material=item.material.clone();item.material.emissive.set(0xd62213);item.material.emissiveIntensity=.55;item.material.color.multiplyScalar(1.16)}}
 if(!cores.length){ // fallback for a malformed asset, keep fight finishable
  cores.push(customCore(T,root,g,[0,2.1,.45],core,0));
 }
 // Draw windup glow around the whole monster; the indicator does not block bullets.
 const tellMat=new T.MeshBasicMaterial({color:kind===5?0xff7530:kind===1?0x8bb7a1:0xb63b31,
   transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});
 const tell=new T.Group();tell.position.set(0,1.85,1.02);g.add(tell);
 for(let i=0;i<3;i++){
  const band=new T.Mesh(new T.TorusGeometry(.43+i*.21,.013,5,40),tellMat);
  band.position.z=i*.018;band.userData.ignoreShots=true;tell.add(band);
 }
 const beamLight=new T.PointLight(kind===5?0xff5818:0xd52d24,0,3.0);beamLight.position.set(0,1.9,1.2);g.add(beamLight);
 const important=new Set(['abdominal_nest','thorax','inflated_throat','mouth_collar','second_skull','charred_bulk','hypertrophied_arm',
  'morgue_cleaver','cluster_nest','armoured_segment','cardiac_chamber','burning_chest_fissure','lift_crushed_shoulder']);
 const bossProps=[];g.traverse(o=>{if(o.isMesh&&important.has(o.name))bossProps.push({
   node:o,role:o.name,baseScale:[o.scale.x,o.scale.y,o.scale.z],basePos:[o.position.x,o.position.y,o.position.z]
 })});
 return {...rig,bossKind:kind,bossCores:cores,bossParts:rig.bossParts||[],bossProps,
   bossWeakMeshes:tagged.length?tagged:cores.map(c=>c.node),
   tell,beamLight,tellMat,rigType:rig.rigType||'humanoid'};
}
// Ten phase-dependent attacks; projectiles are released in *timed* sequences.
// "spread" deliberately avoids stacking multiple unavoidable hits on one frame.
const BOSS_ATTACK_TABLE=[
 [ // Elevator: sliding metal rush -> chain -> falling scrap
  {name:'문짝 충돌',windup:1.13,recover:.68,cooldown:2.9,shots:[['blade',0,0],['blade',.26,.62]]},
  {name:'철판 연타',windup:.94,recover:.66,cooldown:2.7,shots:[['barrel',-.9,0],['blade',.85,.27],['blade',0,.55]]},
  {name:'승강기 붕괴',windup:1.30,recover:.75,cooldown:2.8,shots:[['barrel',-1.35,0],['barrel',1.25,.24],['blade',0,.57]]}
 ],
 [ // Spider mother: web first, then venom spread/egg
  {name:'거미줄 포획',windup:1.09,recover:.63,cooldown:3.0,shots:[['web',0,0],['acid',-.95,.38],['acid',.95,.60]]},
  {name:'산란낭 산개',windup:1.20,recover:.60,cooldown:2.9,shots:[['spore',-1.20,0],['spore',0,.24],['spore',1.20,.48]]},
  {name:'포식자 산성 난사',windup:.99,recover:.72,cooldown:2.7,shots:[['acid',-.85,0],['acid',.65,.18],['web',0,.48]]}
 ],
 [ // Morgue warden: telegraphed blade throws
  {name:'절단기 휘두르기',windup:1.10,recover:.63,cooldown:2.9,shots:[['blade',-.8,0],['blade',.8,.35]]},
  {name:'절단기 던지기',windup:1.34,recover:.61,cooldown:3.0,shots:[['blade',0,0],['barrel',1,.45]]},
  {name:'냉각 파편',windup:.98,recover:.56,cooldown:2.7,shots:[['blade',-1.2,0],['blade',.0,.25],['blade',1.2,.50]]}
 ],
 [ // Leech: globs of viscous slime + pulses
  {name:'점액 파열',windup:.95,recover:.58,cooldown:2.8,shots:[['acid',-.8,0],['acid',.8,.29]]},
  {name:'내장 팽창',windup:1.34,recover:.69,cooldown:3.05,shots:[['spore',0,0],['shock',0,.45]]},
  {name:'독액 폭우',windup:1.12,recover:.66,cooldown:2.8,shots:[['acid',-1.5,0],['acid',0,.22],['acid',1.5,.44]]}
 ],
 [ // Double surgeons: alternation (readability)
  {name:'쌍두 교차',windup:.90,recover:.66,cooldown:2.8,shots:[['blade',-1.1,0],['acid',1.1,.28],['blade',0,.53]]},
  {name:'양측 협공',windup:1.17,recover:.63,cooldown:3.0,shots:[['fire',1,0],['acid',-1,.30],['blade',.2,.66]]},
  {name:'응급실 난도질',windup:.87,recover:.75,cooldown:2.7,shots:[['blade',-1.3,0],['blade',1.3,.23],['blade',0,.49]]}
 ],
 [ // Furnace: long embers, exhaust
  {name:'연소 탄막',windup:1.03,recover:.63,cooldown:2.8,shots:[['fire',-1,0],['fire',1,.36]]},
  {name:'화염 토출',windup:1.20,recover:.62,cooldown:3.0,shots:[['fire',0,0],['shock',0,.42]]},
  {name:'고열 분출',windup:.96,recover:.77,cooldown:2.75,shots:[['fire',-1.4,0],['fire',0,.19],['fire',1.4,.38]]}
 ],
 [ // Fungal colony: spores, explosive pods
  {name:'포자 흩뿌리기',windup:1.11,recover:.61,cooldown:3,shots:[['spore',-1.3,0],['spore',1.3,.27]]},
  {name:'균사 낙하',windup:1.29,recover:.66,cooldown:3,shots:[['spore',0,0],['acid',-.6,.43],['acid',.6,.71]]},
  {name:'숙주 증식',windup:.98,recover:.60,cooldown:2.7,shots:[['spore',-.85,0],['spore',.0,.22],['spore',.85,.44]]}
 ],
 [ // Centipede: rippling segments and angled volleys
  {name:'절지 파동',windup:1.04,recover:.68,cooldown:2.9,shots:[['acid',-1.2,0],['acid',-.4,.15],['acid',.45,.30],['acid',1.2,.45]]},
  {name:'다절 촉수 쇄도',windup:1.23,recover:.60,cooldown:2.94,shots:[['blade',-1,0],['blade',1,.40]]},
  {name:'독니 맹공',windup:.91,recover:.63,cooldown:2.66,shots:[['acid',0,0],['acid',-1,.30],['acid',1,.53]]}
 ],
 [ // Shrieker: actual visible expanding sonic wave
  {name:'초음파 비명',windup:1.28,recover:.83,cooldown:3.2,shots:[['shock',0,0]]},
  {name:'경보 연속파',windup:.97,recover:.70,cooldown:2.9,shots:[['shock',-.45,0],['shock',.45,.53]]},
  {name:'비명과 파편',windup:1.16,recover:.66,cooldown:3.0,shots:[['shock',0,0],['blade',-1,.65],['blade',1,.85]]}
 ],
 [ // Heart: ventricular shock followed by aimed shots
  {name:'심실 수축',windup:1.22,recover:.70,cooldown:3.0,shots:[['shock',0,0],['fire',-.9,.48],['fire',.9,.76]]},
  {name:'혈관 폭주',windup:.98,recover:.64,cooldown:2.8,shots:[['fire',-1.2,0],['acid',0,.32],['fire',1.2,.64]]},
  {name:'핵맥 충격파',windup:1.32,recover:.75,cooldown:3.13,shots:[['shock',0,0],['shock',.60,.73]]}
 ]
];
export function bossAttackPlan(kind,phase,pattern){
 const id=Math.max(0,Math.min(9,kind|0));
 const tier=Math.min(2,Math.max(0,Math.floor(phase/2)));
 const choice=(Math.abs(pattern|0)+tier)%3;
 const template=BOSS_ATTACK_TABLE[id][choice];
 const rush=1-Math.min(.20,Math.max(0,phase)*.036);
 const shots=template.shots.map(([kind,offset,delay])=>({kind,offset,delay:Math.max(0,delay)*rush}));
 return {name:template.name,windup:Math.max(.72,template.windup*rush),recover:template.recover,
  cooldown:Math.max(1.9,template.cooldown*rush),shots,tier,choice};
}
export function bossShots(kind,phase,pattern){return bossAttackPlan(kind,phase,pattern).shots}
export function animateBoss(T,root,d,dt,time){
 if(!d.bossCores)return;
 const active=(d.bossPhase||0)%d.bossCores.length;
 for(let i=0;i<d.bossCores.length;i++){
  const c=d.bossCores[i],on=i===active,rate=.95+Math.sin(time*4+i)*.07;
  c.node.scale.setScalar((on?1.18:.68)*rate);
  c.light.intensity=on?1.8+Math.sin(time*6)*.4:.18;const mesh=d.bossWeakMeshes?.[i];if(mesh?.material?.isMeshStandardMaterial)mesh.material.emissiveIntensity=on?1.8:.05;
 }
 for(const [i,p] of d.bossParts.entries()){
  const step=time*(p.role==='spiderKnee'?2.4:1.5)+p.phase;
  if(p.role==='spiderHip'){
    p.node.rotation.y=Math.sin(step)*.13;
    p.node.rotation.x=Math.sin(step+.8)*.11;
  }else if(p.role==='spiderKnee'){
    p.node.rotation.x=.06+Math.max(0,Math.sin(step+.7))*.27;
    p.node.rotation.z=Math.sin(step-.4)*.045*p.side;
  }else{
    p.node.rotation.y=Math.sin(time*1.65-p.phase)*.14;
    p.node.rotation.x=Math.sin(time*1.30+p.phase)*.085;
  }
 }
 // Every boss has visibly different body mechanics, not just differently colored shots.
 const kind=d.bossKind;
 const anticipation=d.spitState==='windup'?Math.min(1,d.spitTimer/Math.max(.65,d.bossWindup||1.1)):0;
 for(const [i,p] of (d.bossProps||[]).entries()){
  const [sx,sy,sz]=p.baseScale,[x,y,z]=p.basePos,slow=Math.sin(time*(p.role==='cardiac_chamber'?3.8:1.8)+i*.61);
  if(p.role==='abdominal_nest'){
   p.node.scale.set(sx*(1+.043*slow+.09*anticipation),sy*(1+.035*slow),sz*(1+.025*slow));
  }else if(p.role==='thorax'){
   p.node.rotation.x=-anticipation*.18;
   p.node.scale.set(sx,sy*(1+.07*anticipation),sz);
  }else if(p.role==='inflated_throat'||p.role==='mouth_collar'){
   const inflate=1+.06*slow+.21*anticipation;
   p.node.scale.set(sx*inflate,sy*inflate,sz*(1+.15*anticipation));
  }else if(p.role==='second_skull'){
   p.node.rotation.y=Math.sin(time*2.4)*.21+anticipation*.26;
   p.node.rotation.z=Math.sin(time*1.4+.8)*.075;
  }else if(p.role==='hypertrophied_arm'||p.role==='morgue_cleaver'){
   p.node.rotation.z=-anticipation*(p.role==='morgue_cleaver'?.45:.17);
   p.node.position.y=y+.08*anticipation;
  }else if(p.role==='charred_bulk'||p.role==='burning_chest_fissure'){
   const swell=1+.09*anticipation+.018*slow;
   p.node.scale.set(sx*swell,sy*swell,sz*swell);
   if(p.role==='burning_chest_fissure'&&p.node.material?.isMeshStandardMaterial)
      p.node.material.emissiveIntensity=.7+anticipation*2.1;
  }else if(p.role==='cardiac_chamber'){
   const pulse=1+.085*Math.max(0,slow)+anticipation*.07;
   p.node.scale.set(sx*pulse,sy*pulse,sz*pulse);
  }else if(p.role==='armoured_segment'){
   p.node.rotation.y=Math.sin(time*3+i*.46)*.08;
   p.node.rotation.z=Math.sin(time*2.1-i*.42)*.055;
  }else if(p.role==='cluster_nest'){
   const puff=1+.09*Math.sin(time*2.2+i*1.7)+anticipation*.06;
   p.node.scale.set(sx*puff,sy*puff,sz*puff);
  }else if(p.role==='lift_crushed_shoulder'){
   p.node.position.y=y+anticipation*.18;
  }
 }
 // Attack preparation travels through neck, shoulders, mouth and throat. 
 // Its pulse is tied to ACTUAL remaining windup time, not a disconnected sine loop.
 const preparing=d.spitState==='windup';
 const duration=Math.max(.45,d.bossWindup||d.pace?.rangedWindup||1.55);
 const ratio=preparing?Math.min(1,d.spitTimer/duration):0;
 if(d.tell){
   d.tell.visible=ratio>.01;
   d.tell.scale.setScalar(.88+ratio*.46);
   d.tell.rotation.z=Math.sin(time*7)*.11;
   d.tellMat.opacity=ratio*.64;
   d.beamLight.intensity=ratio*4.3;
 }
 if(d.jaw)d.jaw.rotation.x=-ratio*.35;
 if(d.head)d.head.rotation.x=-ratio*.09;
 if(d.arms?.length){d.arms[0].rotation.x=-ratio*.42;d.arms[1].rotation.x=-ratio*.51}
 if(preparing)d.hip.rotation.x=-.035-ratio*.20;

 const boss=d.bossKind;
 if(boss===1){d.hip.rotation.z=Math.sin(time*.58)*.08;d.hip.position.y=.14+.16*Math.sin(time*.72)}
 else if(boss===7){d.hip.position.y=.14+Math.sin(time*1.4)*.07}
 else if(boss===9){d.hip.rotation.y+=dt*.35;d.hip.position.y=.11+Math.sin(time*1.6)*.09}
 else if(boss===5){d.hip.position.y=.025*Math.sin(time*2.1)}
 if(d.spitState==='recover')d.hip.rotation.x*=Math.max(.6,1-dt*1.8)
}
export function bossCamera(boss,plan,elapsed,position){
 const profiles=[
  {radius:4.08,sweep:1.06,speed:.41,height:1.85,vertical:.18}, // lift: within inner cage walls
  {radius:9.25,sweep:.79,speed:.27,height:2.6,vertical:.32}, // spider: see ceiling
  {radius:8.3,sweep:.89,speed:.20,height:1.9,vertical:.11}, // morgue: slow lateral survey
  {radius:8.5,sweep:.64,speed:.23,height:1.55,vertical:.40}, // flooded: low view
  {radius:7.2,sweep:1.02,speed:.38,height:2.10,vertical:.14}, // twins: alternating sides
  {radius:9.4,sweep:.46,speed:.16,height:1.85,vertical:.12}, // incinerator: looming push
  {radius:8.2,sweep:.91,speed:.19,height:2.2,vertical:.29}, // hive: wide survey
  {radius:11.1,sweep:.48,speed:.29,height:2.9,vertical:.35}, // centipede: long body
  {radius:7.9,sweep:.87,speed:.31,height:1.66,vertical:.26}, // screamer: dizzy motion
  {radius:9.6,sweep:.93,speed:.22,height:2.25,vertical:.22} // heart: orbiting chamber
 ];
 const p=profiles[boss],q=elapsed*p.speed+plan.roomSeed*.000001;
 const angle=Math.sin(q)*p.sweep;
 const distance=p.radius+(boss===5?Math.sin(elapsed*.28)*1.4:boss===8?Math.sin(elapsed*.72)*.6:0);
 const height=p.height+p.vertical*Math.sin(elapsed*.58+boss*.3);
 const eye=[position.x+Math.sin(angle)*distance,height,position.z+Math.cos(angle)*distance];
 const look=[position.x,boss===1?2.5:boss===7?1.65:2.35,position.z+(boss===7?-1.25:0)];
 return {eye,look}
}
