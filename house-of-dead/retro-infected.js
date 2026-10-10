// DEAD SHIFT / PS1-era gore infected. Original procedural polygon meshes; no external character files.
let kit=null;
function seeded(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296}}
function texture(T,base,seed,style){const rand=seeded(seed),c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,128,128);for(let i=0;i<6800;i++){const v=rand(),x=Math.floor(rand()*128),y=Math.floor(rand()*128),w=1+Math.floor(rand()*9);ctx.fillStyle=v<.34?'rgba(17,12,12,.17)':v<.68?'rgba(148,142,113,.13)':'rgba(105,18,20,.18)';ctx.fillRect(x,y,w,1+Math.floor(rand()*3))}for(let i=0;i<55;i++){const x=rand()*130,y=rand()*128;ctx.strokeStyle=style==='cloth'?'rgba(20,17,20,.48)':'rgba(65,8,13,.65)';ctx.lineWidth=1+rand()*3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rand()-.5)*28,y+(rand()-.5)*17);ctx.lineTo(x+(rand()-.5)*33,y+(rand()-.5)*30);ctx.stroke()}if(style==='flesh'){for(let i=0;i<22;i++){const x=rand()*128,y=rand()*128;ctx.fillStyle='rgba(78,3,11,.68)';ctx.fillRect(x,y,5+rand()*20,2+rand()*12);ctx.fillStyle='rgba(161,52,50,.26)';ctx.fillRect(x,y,3+rand()*20,1+rand()*4)}}const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;tex.minFilter=T.NearestMipmapNearestFilter;tex.wrapS=tex.wrapT=T.RepeatWrapping;return tex}
export async function prepareRetroAssets(T){if(kit)return true;const cfg=[['#858476','#384345'],['#777f70','#41473e'],['#675f56','#403b39'],['#88836e','#484037'],['#65574a','#47483f'],['#403c36','#242421'],['#5b5548','#292d2a']];const flesh=['#6c2929','#682321','#73312b','#782c27','#5f2428','#8b341a','#71231d'];const mk=(map,color,emissive=0)=>new T.MeshStandardMaterial({map,color,roughness:1,metalness:0,flatShading:false,side:T.DoubleSide,emissive,emissiveIntensity:emissive?.18:0});kit=cfg.map((cc,i)=>({skin:mk(texture(T,cc[0],215+i*31,'flesh'),0xc6c2b7),cloth:mk(texture(T,cc[1],621+i*57,'cloth'),0xb0b5ac),muscle:mk(texture(T,flesh[i],451+i*55,'flesh'),0xc99a8c),bone:mk(texture(T,'#b8ae8c',911+i*21,'bone'),0xe1dcba),wound:mk(texture(T,'#25080b',733+i*29,'flesh'),0x7b4040),worm:mk(texture(T,'#b9aa6b',112+i*33,'flesh'),0xd8cfad),fire:new T.MeshStandardMaterial({color:0xed4216,emissive:0xff3300,emissiveIntensity:2,flatShading:true})}));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true}
function poly(T,parent,rings,mat,root,kind,name,segments=12){const pos=[],uv=[],idx=[];const rnd=seeded(rings.length*2341+(name.length*176));for(let j=0;j<rings.length;j++){const r=rings[j];for(let i=0;i<segments;i++){const a=(i/segments)*Math.PI*2,noise=1+.055*Math.sin(i*3+j*5)+.03*(rnd()-.5);pos.push(r[0]+Math.cos(a)*r[2]*noise,r[1],r[3]+Math.sin(a)*r[4]*noise);uv.push(i/(segments-1),j/(rings.length-1))}}for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){let a=j*segments+i,b=j*segments+(i+1)%segments,c=(j+1)*segments+i,d=(j+1)*segments+(i+1)%segments;idx.push(a,c,b,b,c,d)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;if(kind)m.userData.hit={root,kind};parent.add(m);return m}
function limb(T,parent,root,mat,side,upper,thick,kind,name){const v=upper?[[0,.03,thick,0,thick*.76],[side*.035,-.17,thick*1.05,.04,thick],[side*.1,-.42,thick*.83,.10,thick*.85],[side*.13,-.69,thick*.63,.10,thick*.67],[side*.17,-.98,thick*.69,.12,thick*.72],[side*.19,-1.14,thick*.42,.16,thick*.46]]:[[0,.04,thick,0,thick],[side*.04,-.26,thick*.9,.01,thick*.84],[side*.07,-.58,thick*.76,.02,thick*.71],[side*.06,-.82,thick*.57,.04,thick*.61],[side*.07,-1.07,thick*.68,.13,thick],[side*.09,-1.13,thick*.42,.22,thick*1.08]];return poly(T,parent,v,mat,root,kind,name,8)}
function patch(T,parent,points,mat,root,kind,name){const pp=[],uu=[],ind=[];for(let i=0;i<points.length;i++){pp.push(...points[i]);uu.push((points[i][0]+1)/2,points[i][1]/3)}for(let i=1;i<points.length-1;i++)ind.push(0,i,i+1);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setAttribute('uv',new T.Float32BufferAttribute(uu,2));g.setIndex(ind);g.computeVertexNormals();const m=new T.Mesh(g,mat);m.name=name;if(kind)m.userData.hit={root,kind};parent.add(m);return m}
function strip(T,parent,a,b,w,mat,root,kind,name){const len=Math.hypot(b[0]-a[0],b[1]-a[1])||1,dx=-(b[1]-a[1])/len*w,dy=(b[0]-a[0])/len*w;return patch(T,parent,[[a[0]+dx,a[1]+dy,a[2]],[a[0]-dx,a[1]-dy,a[2]],[b[0]-dx,b[1]-dy,b[2]],[b[0]+dx,b[1]+dy,b[2]]],mat,root,kind,name)}
function maggots(T,parent,mat,root,seed,cx,cy,cz,count){const rnd=seeded(seed),worms=[];for(let j=0;j<count;j++){const angle=rnd()*Math.PI*2,rr=Math.sqrt(rnd())*.135;let x=cx+Math.cos(angle)*rr,y=cy+Math.sin(angle)*rr*.8,z=cz+.004+rnd()*.007;const g=new T.Group();g.position.set(x,y,z);parent.add(g);const segs=3+Math.floor(rnd()*2);let last=[0,0,0];for(let k=0;k<segs;k++){const t=k/segs,xx=Math.cos(angle)*t*.062+(rnd()-.5)*.012,yy=Math.sin(angle)*t*.047+(rnd()-.5)*.010;const next=[xx,yy,0];strip(T,g,last,next,.007+Math.sin((t+.1)*Math.PI)*.006,mat,root,null,'maggot_segment');last=next}worms.push({node:g,phase:rnd()*6.28})}return worms}
function core(T,parent,root,m,x,y,z){const wound=patch(T,parent,[[x-.35,y-.36,z-.015],[x+.30,y-.36,z-.015],[x+.41,y-.02,z-.015],[x+.20,y+.36,z-.015],[x-.32,y+.25,z-.015]],m.wound,root,null,'exposed_core_socket');const g=new T.Group();g.position.set(x,y,z);parent.add(g);poly(T,g,[[0,-.22,.19,0,.11],[0,-.07,.26,.025,.15],[0,.11,.24,.02,.14],[0,.23,.08,0,.08]],m.muscle,root,'weak','pulsating_weakpoint',7);const p=new T.PointLight(0xff3011,1.3,2.2);p.position.set(0,0,.24);g.add(p);return {node:g,light:p}}
export function makeRetroInfected(T,root,type,look=null){if(!kit)throw new Error('retro assets not prepared');const id=Math.min(6,Math.max(0,type===7?1:type===8?3:type===9?5:type)),m=kit[look?.palette??id],heavy=id===2||id===6,large=id===6,bulge=id===3||id===6,scale=large?1.45:heavy?1.21:1;const hip=new T.Group();hip.name='INFECTED_TORSO_RIG';root.add(hip);if(look){hip.scale.y=look.height;root.rotation.z=look.tilt}
const torso=poly(T,hip,[[0,1.05,.25*scale,.005,.20*scale],[-.04,1.30,.39*scale,.01,.26*scale],[.035,1.68,.48*scale,.04,.34*scale],[.08,1.94,.46*scale,.02,.29*scale],[.025,2.19,.33*scale,-.06,.21*scale],[0,2.35,.16,-.06,.14]],m.cloth,root,'body','torn_patient_torso',10);
// Recessed abdominal tear: the cavity sits INSIDE the cloth silhouette; no hanging rib cage or geometric organs.
const tear=patch(T,hip,[[-.23*scale,1.43,.285],[-.11*scale,1.55,.309],[.035*scale,1.70,.329],[.20*scale,1.68,.305],[.24*scale,1.51,.285],[.06*scale,1.37,.281],[-.19*scale,1.36,.279]],m.wound,root,'body','recessed_abdominal_tear');
patch(T,hip,[[-.21*scale,1.55,.310],[-.15*scale,1.72,.338],[-.01*scale,1.69,.350],[.08*scale,1.52,.340]],m.muscle,root,'body','left_torn_skin_flap');
patch(T,hip,[[.05*scale,1.40,.309],[.24*scale,1.46,.316],[.19*scale,1.63,.337],[.12*scale,1.53,.343]],m.cloth,root,'body','right_ragged_gown_edge');
for(const [ax,ay,bx,by] of [[-.08,1.59,.07,1.55],[-.04,1.50,.10,1.46]])strip(T,hip,[ax*scale,ay,.345],[bx*scale,by,.348],.017,m.muscle,root,null,'subtle_tissue_fold');
const worms=maggots(T,hip,m.worm,root,347+id*117+(look?.theme||0)*109,.03,1.52,.347,Math.max(1,(bulge?9:heavy?6:3)+(look?.maggots?2:-1)));
// Map-specific clothing and mutations are integrated into the existing faceted body, not added spikes.
if(look){
 const theme=look.theme,wear=look.wear;
 if(look.wrap){ // clinic straps / isolation bandage
  const yy=1.65+(wear-.5)*.16;
  strip(T,hip,[-.38*scale,yy,.334],[.35*scale,yy+.04,.337],.046,m.bone,root,'body','torn_medical_binding');
 }
 if(theme===0||theme===1){ // ward / theatre: stained apron and sleeve
  patch(T,hip,[[-.24,1.28,.335],[.25,1.27,.34],[.26,1.70,.35],[-.23,1.68,.35]],m.cloth,root,'body','soiled_surgical_apron');
  if(look.accessory%2===0)strip(T,hip,[0,2.01,.345],[.01,1.62,.356],.036,m.bone,root,'body','folded_uniform_seam');
 }else if(theme===2){ // morgue: freezer frost and burial tag
  patch(T,hip,[[-.32,2.02,.29],[-.10,2.22,.28],[.15,2.05,.325],[-.16,1.77,.335]],m.bone,root,'body','cold_pale_burial_tissue');
 }else if(theme===3||theme===6){ // laboratory / infestation
  patch(T,hip,[[-.28,1.79,.355],[-.13,1.96,.36],[.05,1.83,.369],[-.16,1.69,.35]],m.muscle,root,'body','laboratory_tissue_scab');
  if(look.damage>0)strip(T,hip,[.08,2.14,.29],[.23,1.94,.335],.028,m.bone,root,'body','exposed_cervical_cartilage');
 }else if(theme===4||theme===5){ // trash / incinerator
  patch(T,hip,[[.06,1.53,.345],[.26,1.52,.321],[.27,1.80,.326],[.08,1.82,.353]],m.wound,root,'body','scorched_flesh');
 }
 if(look.damage>=2)patch(T,hip,[[-.22,1.97,.331],[-.06,2.12,.324],[.12,1.93,.351],[-.05,1.88,.357]],m.muscle,root,'body','variable_torn_chest');
}
// Adult human anatomy: reduced cranium (previously ~24% of body height),
// narrower temporal bones, tapered cheeks, longer neck and a separately hinged mandible.
// The coarse texture retains the PS1 horror style; 16-sided curved geometry avoids toy-like cubes.
const neck=poly(T,hip,[
 [.012,2.19,.145,-.045,.132],[.028,2.30,.128,-.049,.121],
 [.045,2.42,.111,-.030,.115],[.038,2.52,.113,-.022,.112]
],m.skin,root,'body','sternocleidomastoid_neck',13);
const head=new T.Group();
head.name='ADULT_PROPORTION_CRANIOFACIAL_RIG';
head.position.set(id===1?.075:.042,2.56,id===1?.09:.035);
head.scale.set(.79,.73,.84); // 20-27% smaller than old head, independently of body / headshot hit meshes
head.rotation.z=id%2?-.095:.072;
hip.add(head);
// Skull loft: jaw hinge -> cheekbones -> recessed temples -> rounded cranial vault.
// No spherical toy head or cube primitives.
poly(T,head,[
 [0,-.285,.120,.014,.135],
 [-.012,-.221,.179,.005,.188],
 [0,-.128,.212,.006,.223],
 [.012,-.018,.240,-.006,.255],
 [.009,.102,.249,-.018,.246],
 [-.012,.216,.224,-.035,.225],
 [-.022,.299,.156,-.051,.161],
 [-.020,.334,.059,-.055,.079]
],m.skin,root,'head','anatomical_cranium_cheeks_occiput',18);
// Uneven temporal indentation and natural, flattened cheekbone facets.
patch(T,head,[[-.238,.076,.159],[-.219,.187,.151],[-.102,.219,.189],[-.087,.102,.236],[-.161,-.025,.206]],
 m.skin,root,'head','left_zygomatic_arch');
patch(T,head,[[.104,.211,.184],[.216,.166,.164],[.231,.055,.181],[.168,-.027,.214],[.067,.072,.244]],
 m.skin,root,'head','right_zygomatic_arch');
// Eye cavities are inset visual planes below a continuous brow line; eyes never protrude like buttons.
for(const side of [-1,1]){
 const x=side*.108;
 patch(T,head,[
  [x-side*.060,.094,.235],[x+side*.062,.088,.236],
  [x+side*.065,.003,.252],[x+.002,-.025,.250],[x-side*.053,.006,.249]
 ],m.wound,root,'head','deep_sunken_orbit');
 strip(T,head,[x-side*.074,.113,.234],[x+side*.064,.106,.233],.015,m.skin,root,'head','supraorbital_brow');
 // A tiny occluded iris/remaining sclera sits INSIDE the dark hollow.
 if((id+side+8)%3!==0){
  patch(T,head,[[x-.025,.043,.247],[x+.025,.036,.247],[x+.006,.007,.249]],
    m.bone,root,'head','clouded_eyeball_fragment');
 }
}
// Broken nose bridge has facial depth and nostrils rather than a large polygon cone.
patch(T,head,[[-.043,.105,.247],[.039,.100,.247],[.071,-.078,.284],[.004,-.128,.305],[-.067,-.080,.279]],
 m.skin,root,'head','nasal_bridge_and_bridge_tip');
patch(T,head,[[-.062,-.097,.289],[.066,-.097,.289],[.027,-.137,.299],[-.037,-.136,.298]],
 m.wound,root,'head','necrotic_nostrils');
// Skin damage follows the cheek surface, with layered fascia inside a small irregular cavity.
// It is not a spike or an external floating organ prop.
const tornSide=(look?.injury??(id*.177))>.43?-1:1;
const sx=tornSide;
patch(T,head,[
 [sx*.215,.010,.185],[sx*.202,-.061,.200],[sx*.173,-.143,.196],
 [sx*.095,-.190,.222],[sx*.114,-.065,.245],[sx*.165,.045,.225]
],m.wound,root,'head','torn_cheek_depressed_cavity');
patch(T,head,[
 [sx*.186,-.016,.207],[sx*.177,-.106,.207],
 [sx*.132,-.149,.222],[sx*.114,-.067,.246]
],m.muscle,root,'head','exposed_buccinator_muscle');
strip(T,head,[sx*.190,.006,.204],[sx*.131,-.126,.243],.012,m.bone,root,'head','exposed_malar_ridge');
// Hairline/scalp erosion is flush with the skull; variation is localized to ONE side.
if((look?.damage??id%3)!==0){
 patch(T,head,[
  [sx*.058,.284,.142],[sx*.158,.266,.129],[sx*.218,.186,.138],
  [sx*.137,.179,.195],[sx*.051,.233,.200]
 ],m.muscle,root,'head','receding_scalp_tissue');
 strip(T,head,[sx*.069,.268,.185],[sx*.196,.193,.169],.009,m.bone,root,'head','skull_fissure');
}
// Proper short mandible, inset under cheekbones; supports animated jaw opening.
const jaw=new T.Group();jaw.name='hinged_short_mandible';
jaw.position.set(.003,-.245,.055);head.add(jaw);
poly(T,jaw,[
 [0,-.150,.094,.043,.115],[0,-.095,.167,.046,.167],
 [0,-.016,.189,.045,.173],[0,.044,.151,.029,.128]
],m.skin,root,'head','human_jaw_chin',13);
patch(T,head,[[-.151,-.175,.226],[.158,-.181,.225],[.136,-.269,.206],[-.140,-.273,.209]],
 m.wound,root,'head','recessed_oral_cavity');
patch(T,jaw,[[-.118,-.023,.202],[.122,-.023,.202],[.099,-.073,.204],[-.111,-.072,.206]],
 m.muscle,root,'head','gums_inside_lower_lip');
for(let i=0;i<7;i++){
 const x=(i-3)*.034;
 strip(T,jaw,[x,-.003,.207],[x+.004,.038,.208],.009+(i%3)*.002,
   m.bone,root,'head','short_uneven_incidents_teeth');
}
// A handful of torn lip fibres; avoids the old ear-to-ear black cartoon grin.
for(let i=0;i<3;i++){
 const x=-.115+i*.096;
 strip(T,head,[x,-.213,.224],[x+.026,-.259,.208],.007,m.muscle,root,'head','torn_orbicularis_oris');
}
// Independently hinged elbows, knees and feet, rather than one rigid swinging rod per limb.
const arms=[],elbows=[],legs=[],knees=[],feet=[];
for(const side of [-1,1]){
 const arm=new T.Group();arm.position.set(side*(heavy?.62:.49)*scale,2.12,0);hip.add(arm);arms.push(arm);
 const fat=(heavy&&side===1?.33:.19)*scale;
 poly(T,arm,[[0,.02,fat,0,fat*.9],[side*.04,-.20,fat*1.08,.02,fat],[side*.09,-.43,fat*.9,.06,fat*.8],[side*.10,-.59,fat*.76,.08,fat*.75]],heavy&&side===1?m.muscle:m.cloth,root,'limb','upper_arm',8);
 const elbow=new T.Group();elbow.position.set(side*.1,-.57,.08);arm.add(elbow);elbows.push(elbow);
 poly(T,elbow,[[0,.02,fat*.77,0,fat*.75],[side*.04,-.20,fat*.67,.025,fat*.63],[side*.08,-.43,fat*.61,.04,fat*.52],[side*.10,-.55,fat*.48,.10,fat*.43]],m.skin,root,'limb','forearm',8);
 patch(T,elbow,[[0,-.14,fat*.63],[side*.13,-.23,fat*.59],[side*.14,-.39,fat*.5],[side*.005,-.39,fat*.53]],m.muscle,root,'limb','forearm_laceration');
 for(let k=0;k<3;k++)strip(T,elbow,[side*(.045+k*.038),-.48,.13],[side*(.05+k*.043),-.63,.17],.013,m.bone,root,'limb','finger');
 const leg=new T.Group();leg.position.set(side*.26*scale,1.12,.0);hip.add(leg);legs.push(leg);
 const thick=(heavy?.28:.235)*scale;
 poly(T,leg,[[0,.035,thick,0,thick*.95],[side*.028,-.15,thick*.99,.015,thick*.93],[side*.05,-.34,thick*.9,.03,thick*.82],[side*.06,-.55,thick*.72,.04,thick*.7]],m.cloth,root,'limb','upper_leg',8);
 const knee=new T.Group();knee.position.set(side*.06,-.53,.04);leg.add(knee);knees.push(knee);
 poly(T,knee,[[0,.03,thick*.76,0,thick*.77],[side*.01,-.19,thick*.64,.015,thick*.61],[side*.02,-.39,thick*.53,.035,thick*.50],[side*.045,-.54,thick*.55,.07,thick*.5]],m.skin,root,'limb','lower_leg',8);
 patch(T,knee,[[side*-.08,-.18,thick*.6],[side*.10,-.18,thick*.6],[side*.12,-.37,thick*.5],[side*-.09,-.33,thick*.5]],m.wound,root,'limb','torn_shin');
 const foot=new T.Group();foot.position.set(side*.04,-.53,.08);knee.add(foot);feet.push(foot);
 poly(T,foot,[[0,.045,thick*.56,.09,thick*.54],[0,-.025,thick*.72,.13,thick*.77],[0,-.08,thick*.73,.22,thick*.83]],m.cloth,root,'limb','deformed_shoe',7);
}
const cores=[];if(id===6){for(const data of [[-.37,2.12,.51],[.51,1.91,.57],[0,1.37,.55]])cores.push(core(T,hip,root,m,...data));const bossWorms=maggots(T,hip,m.worm,root,1993,.05,1.55,.345,12);worms.push(...bossWorms);for(let k=0;k<6;k++){const xx=(k-3)*.17;strip(T,hip,[xx,2.12,.41],[xx-.075,2.4,.27],.055,m.bone,root,'body','ragged_spine')} }
if(id===5){for(let k=0;k<7;k++){const x=(k-3)*.115;strip(T,hip,[x,1.45,.39],[x+(k%2?.06:-.04),1.9,.36],.025,m.fire,root,'body','burning_fissure')}}
if(id===3){const extra=maggots(T,head,m.worm,root,338,.04,-.24,.220,2);worms.push(...extra);jaw.position.y=-.255}
let barrel=null;if(id===4){barrel=new T.Group();barrel.position.set(.55,1.37,.53);hip.add(barrel);const steel=new T.MeshStandardMaterial({color:0x65533a,roughness:.93,flatShading:true});const geo=new T.CylinderGeometry(.27,.27,.58,8,1);const b=new T.Mesh(geo,steel);b.rotation.z=.22;b.userData.hit={root,kind:'body'};barrel.add(b);for(const h of [-.22,.22]){const band=new T.Mesh(new T.CylinderGeometry(.281,.281,.045,8),m.wound);band.position.y=h;barrel.add(band)}}
return {hip,head,jaw,arms,elbows,legs,knees,feet,extras:{worms,cores,barrel},meshCount:root.children.length}
}
export function animateRetroInfected(T,root,d,dt,time){
 if(!d.extras)return;
 const e=d.extras;
 // Unlike a synchronized sine-wave loop, each infected advances its gait from actual movement state.
 d.walkBlend??=0;d.gaitPhase??=(d.phase||0);
 const dying=!d.alive;
 const ranged=d.spitState==='windup'||d.spitState==='recover';
 const hit=d.flinch>0;
 const walking=!dying&&!ranged&&!hit&&!!d.walkActive;
 const ease=1-Math.exp(-Math.min(.06,dt)*6.8);
 d.walkBlend+=(Number(walking)-d.walkBlend)*ease;
 const w=d.walkBlend;
 const cadence=d.type===7?11:d.type===9?7.8:d.type===1?10.5:d.type===2?4.1:d.type===6?3.25:d.type===3?5.1:5.8;
 d.gaitPhase+=Math.min(.06,dt)*cadence*(.13+.87*w);
 const phase=d.gaitPhase;
 const limp=d.type===1?.27:d.type===2?.17:.11;
 const stress=hit?Math.sin((d.flinch/.22)*Math.PI)*.19:0;
 const still=1-w;
 const age=time+(d.phase||0);
 // Distinct, low-amplitude movement cycles prevent a marching toy silhouette.
 const steps=[Math.sin(phase),Math.sin(phase+Math.PI)];
 const lift=[Math.max(0,steps[0]),Math.max(0,steps[1])];
 for(let i=0;i<2;i++){
   const asym=i===0?1:-1;
   const gait=steps[i];
   const drag=i===0?1:1-limp;
   const attack=d.meleeActive?Math.min(1,(d.attack||0)/1.35):0;
   // Thigh leads; knee flexes only on the airborne half of its cycle.
   d.legs[i].rotation.x=w*(-gait*.31*drag+(i===1?limp*.24:0));
   if(d.knees?.[i])d.knees[i].rotation.x=w*(.035+lift[i]*(i===0?.44:.35)*drag);
   if(d.feet?.[i]){
     d.feet[i].rotation.x=w*(gait*.18-lift[i]*.24);
     d.feet[i].rotation.z=w*asym*.025;
   }
   if(d.spitState==='windup'){
     const a=Math.min(1,(d.spitTimer||0)/(d.type===6?3.1:2.2));
     d.arms[i].rotation.x=-.17-a*(d.type===4?.9:1.15);
   }else if(attack){
     const hold=Math.sin(Math.min(1,attack)*Math.PI*.8);
     d.arms[i].rotation.x=-.35-(i===0?.72:1.15)*hold;
   }else{
     d.arms[i].rotation.x=-.30+w*gait*.27+(i===1?.12:0)-still*.07*Math.sin(age*1.6+i*2);
   }
   d.arms[i].rotation.z=asym*(.04+(d.type===2?.17:.035)) +w*Math.sin(phase-i*.8)*.035;
   if(d.elbows?.[i])d.elbows[i].rotation.x=-.16-.20*w*Math.max(0,-gait)-attack*.33;
 }
 // Keep the feet near the floor; vertical bounce is measured in centimetres, not body lengths.
 const stomp=Math.abs(Math.sin(phase));
 const weight=(d.type===2||d.type===6)?.020:.012;
 d.hip.position.y=dying?0:(-weight*w*stomp);
 d.hip.rotation.z=(d.type===2?-.065:.025)+(w*Math.sin(phase)*.035)+(still*Math.sin(age*.85)*.014);
 d.hip.rotation.y=w*Math.sin(phase)*.048;
 const lean=d.type===7?.54:d.type===9?.22:d.type===1?.19:d.type===2?.13:d.type===6?.10:.065;
 d.hip.rotation.x=lean+Math.sin(age*1.1)*.009+stress;
 // Head reacts later than the chest and gently counter-rotates during turns.
 d.head.rotation.y=-d.hip.rotation.y*.75+Math.sin(phase-.65)*.028*w+
   Math.max(-.24,Math.min(.24,(d.turnDelta||0)*-.55));
 d.head.rotation.x=-lean*.36+Math.sin(age*1.3-.6)*.035;
 d.head.rotation.z=(d.type%2===0?-.035:.045)-d.hip.rotation.z*.48+
   Math.sin(phase-1.1)*.018*w;
 if(hit){d.head.rotation.x-=stress*.8;d.head.rotation.z+=Math.sin(age*14)*stress*.45}
 // Deliberate mouth opening for a ranged windup without overriding the jaw's hinge.
 const mouth=(d.spitState==='windup'&&(d.type===3||d.type===9))?
   Math.min(1,(d.spitTimer||0)/2.2)*.36:0;
 d.jaw.rotation.x=-mouth+Math.sin(age*2.1)*.025;
 d.jaw.position.y=-.245-(mouth*.068);
 if(d.type===3||d.type===8)d.jaw.position.y=-.255-mouth*.084;
 for(const [i,worm] of e.worms.entries()){
   worm.node.rotation.z=Math.sin(age*1.6+worm.phase+i*.3)*.075;
   worm.node.scale.x=1+.042*Math.sin(age*2.1+worm.phase);
 }
 for(const [i,c] of e.cores.entries()){
   const pulse=.94+Math.sin(time*4+i*1.7)*.065;
   c.node.scale.setScalar(pulse);c.light.intensity=1.1+Math.sin(time*5+i)*.45;
 }
 if(e.barrel){
   const wind=d.spitState==='windup';
   const a=Math.min(1,(d.spitTimer||0)/2.2);
   e.barrel.rotation.x=wind?-a*.75:0;
   e.barrel.position.y=1.37+(wind?a*.34:0);
   e.barrel.visible=d.spitState!=='recover';
 }
 if(dying){
   // Knees buckle progressively while shoulders slump during collapse.
   const fall=Math.min(1,(d.fall||0)/.75);
   d.hip.position.y=-.22*fall;
   d.hip.rotation.x=.22+fall*.32;
   for(let i=0;i<2;i++){
     d.legs[i].rotation.x=fall*(i===0?.52:-.37);
     if(d.knees?.[i])d.knees[i].rotation.x=fall*.95;
     if(d.elbows?.[i])d.elbows[i].rotation.x=-fall*.9;
     d.arms[i].rotation.x=-fall*.7;
   }
 }
}
