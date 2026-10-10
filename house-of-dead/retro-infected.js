// DEAD SHIFT / PS1-era gore infected. Original procedural polygon meshes; no external character files.
let kit=null;
function seeded(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296}}
function texture(T,base,seed,style){const rand=seeded(seed),c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,128,128);for(let i=0;i<6800;i++){const v=rand(),x=Math.floor(rand()*128),y=Math.floor(rand()*128),w=1+Math.floor(rand()*9);ctx.fillStyle=v<.34?'rgba(17,12,12,.17)':v<.68?'rgba(148,142,113,.13)':'rgba(105,18,20,.18)';ctx.fillRect(x,y,w,1+Math.floor(rand()*3))}for(let i=0;i<55;i++){const x=rand()*130,y=rand()*128;ctx.strokeStyle=style==='cloth'?'rgba(20,17,20,.48)':'rgba(65,8,13,.65)';ctx.lineWidth=1+rand()*3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rand()-.5)*28,y+(rand()-.5)*17);ctx.lineTo(x+(rand()-.5)*33,y+(rand()-.5)*30);ctx.stroke()}if(style==='flesh'){for(let i=0;i<22;i++){const x=rand()*128,y=rand()*128;ctx.fillStyle='rgba(78,3,11,.68)';ctx.fillRect(x,y,5+rand()*20,2+rand()*12);ctx.fillStyle='rgba(161,52,50,.26)';ctx.fillRect(x,y,3+rand()*20,1+rand()*4)}}const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;tex.minFilter=T.NearestMipmapNearestFilter;tex.wrapS=tex.wrapT=T.RepeatWrapping;return tex}
export async function prepareRetroAssets(T){if(kit)return true;const cfg=[['#858476','#384345'],['#777f70','#41473e'],['#675f56','#403b39'],['#88836e','#484037'],['#65574a','#47483f'],['#403c36','#242421'],['#5b5548','#292d2a']];const flesh=['#6c2929','#682321','#73312b','#782c27','#5f2428','#8b341a','#71231d'];const mk=(map,color,emissive=0)=>new T.MeshStandardMaterial({map,color,roughness:1,metalness:0,flatShading:true,side:T.DoubleSide,emissive,emissiveIntensity:emissive?.18:0});kit=cfg.map((cc,i)=>({skin:mk(texture(T,cc[0],215+i*31,'flesh'),0xc6c2b7),cloth:mk(texture(T,cc[1],621+i*57,'cloth'),0xb0b5ac),muscle:mk(texture(T,flesh[i],451+i*55,'flesh'),0xc99a8c),bone:mk(texture(T,'#b8ae8c',911+i*21,'bone'),0xe1dcba),wound:mk(texture(T,'#25080b',733+i*29,'flesh'),0x7b4040),worm:mk(texture(T,'#b9aa6b',112+i*33,'flesh'),0xd8cfad),fire:new T.MeshStandardMaterial({color:0xed4216,emissive:0xff3300,emissiveIntensity:2,flatShading:true})}));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true}
function poly(T,parent,rings,mat,root,kind,name,segments=9){const pos=[],uv=[],idx=[];const rnd=seeded(rings.length*2341+(name.length*176));for(let j=0;j<rings.length;j++){const r=rings[j];for(let i=0;i<segments;i++){const a=(i/segments)*Math.PI*2,noise=1+.055*Math.sin(i*3+j*5)+.03*(rnd()-.5);pos.push(r[0]+Math.cos(a)*r[2]*noise,r[1],r[3]+Math.sin(a)*r[4]*noise);uv.push(i/(segments-1),j/(rings.length-1))}}for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){let a=j*segments+i,b=j*segments+(i+1)%segments,c=(j+1)*segments+i,d=(j+1)*segments+(i+1)%segments;idx.push(a,c,b,b,c,d)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;if(kind)m.userData.hit={root,kind};parent.add(m);return m}
function limb(T,parent,root,mat,side,upper,thick,kind,name){const v=upper?[[0,.03,thick,0,thick*.76],[side*.035,-.17,thick*1.05,.04,thick],[side*.1,-.42,thick*.83,.10,thick*.85],[side*.13,-.69,thick*.63,.10,thick*.67],[side*.17,-.98,thick*.69,.12,thick*.72],[side*.19,-1.14,thick*.42,.16,thick*.46]]:[[0,.04,thick,0,thick],[side*.04,-.26,thick*.9,.01,thick*.84],[side*.07,-.58,thick*.76,.02,thick*.71],[side*.06,-.82,thick*.57,.04,thick*.61],[side*.07,-1.07,thick*.68,.13,thick],[side*.09,-1.13,thick*.42,.22,thick*1.08]];return poly(T,parent,v,mat,root,kind,name,8)}
function patch(T,parent,points,mat,root,kind,name){const pp=[],uu=[],ind=[];for(let i=0;i<points.length;i++){pp.push(...points[i]);uu.push((points[i][0]+1)/2,points[i][1]/3)}for(let i=1;i<points.length-1;i++)ind.push(0,i,i+1);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setAttribute('uv',new T.Float32BufferAttribute(uu,2));g.setIndex(ind);g.computeVertexNormals();const m=new T.Mesh(g,mat);m.name=name;if(kind)m.userData.hit={root,kind};parent.add(m);return m}
function strip(T,parent,a,b,w,mat,root,kind,name){const len=Math.hypot(b[0]-a[0],b[1]-a[1])||1,dx=-(b[1]-a[1])/len*w,dy=(b[0]-a[0])/len*w;return patch(T,parent,[[a[0]+dx,a[1]+dy,a[2]],[a[0]-dx,a[1]-dy,a[2]],[b[0]-dx,b[1]-dy,b[2]],[b[0]+dx,b[1]+dy,b[2]]],mat,root,kind,name)}
function maggots(T,parent,mat,root,seed,cx,cy,cz,count){const rnd=seeded(seed),worms=[];for(let j=0;j<count;j++){const angle=rnd()*Math.PI*2,rr=Math.sqrt(rnd())*.135;let x=cx+Math.cos(angle)*rr,y=cy+Math.sin(angle)*rr*.8,z=cz+.004+rnd()*.007;const g=new T.Group();g.position.set(x,y,z);parent.add(g);const segs=3+Math.floor(rnd()*2);let last=[0,0,0];for(let k=0;k<segs;k++){const t=k/segs,xx=Math.cos(angle)*t*.062+(rnd()-.5)*.012,yy=Math.sin(angle)*t*.047+(rnd()-.5)*.010;const next=[xx,yy,0];strip(T,g,last,next,.007+Math.sin((t+.1)*Math.PI)*.006,mat,root,null,'maggot_segment');last=next}worms.push({node:g,phase:rnd()*6.28})}return worms}
function core(T,parent,root,m,x,y,z){const wound=patch(T,parent,[[x-.35,y-.36,z-.015],[x+.30,y-.36,z-.015],[x+.41,y-.02,z-.015],[x+.20,y+.36,z-.015],[x-.32,y+.25,z-.015]],m.wound,root,null,'exposed_core_socket');const g=new T.Group();g.position.set(x,y,z);parent.add(g);poly(T,g,[[0,-.22,.19,0,.11],[0,-.07,.26,.025,.15],[0,.11,.24,.02,.14],[0,.23,.08,0,.08]],m.muscle,root,'weak','pulsating_weakpoint',7);const p=new T.PointLight(0xff3011,1.3,2.2);p.position.set(0,0,.24);g.add(p);return {node:g,light:p}}
export function makeRetroInfected(T,root,type){if(!kit)throw new Error('retro assets not prepared');const id=Math.min(6,Math.max(0,type===7?1:type===8?3:type===9?5:type)),m=kit[id],heavy=id===2||id===6,large=id===6,bulge=id===3||id===6,scale=large?1.45:heavy?1.21:1;const hip=new T.Group();hip.name='INFECTED_TORSO_RIG';root.add(hip);
const torso=poly(T,hip,[[0,1.05,.25*scale,.005,.20*scale],[-.04,1.30,.39*scale,.01,.26*scale],[.035,1.68,.48*scale,.04,.34*scale],[.08,1.94,.46*scale,.02,.29*scale],[.025,2.19,.33*scale,-.06,.21*scale],[0,2.35,.16,-.06,.14]],m.cloth,root,'body','torn_patient_torso',10);
// Recessed abdominal tear: the cavity sits INSIDE the cloth silhouette; no hanging rib cage or geometric organs.
const tear=patch(T,hip,[[-.23*scale,1.43,.285],[-.11*scale,1.55,.309],[.035*scale,1.70,.329],[.20*scale,1.68,.305],[.24*scale,1.51,.285],[.06*scale,1.37,.281],[-.19*scale,1.36,.279]],m.wound,root,'body','recessed_abdominal_tear');
patch(T,hip,[[-.21*scale,1.55,.310],[-.15*scale,1.72,.338],[-.01*scale,1.69,.350],[.08*scale,1.52,.340]],m.muscle,root,'body','left_torn_skin_flap');
patch(T,hip,[[.05*scale,1.40,.309],[.24*scale,1.46,.316],[.19*scale,1.63,.337],[.12*scale,1.53,.343]],m.cloth,root,'body','right_ragged_gown_edge');
for(const [ax,ay,bx,by] of [[-.08,1.59,.07,1.55],[-.04,1.50,.10,1.46]])strip(T,hip,[ax*scale,ay,.345],[bx*scale,by,.348],.017,m.muscle,root,null,'subtle_tissue_fold');
const worms=maggots(T,hip,m.worm,root,347+id*117,.03,1.52,.347,bulge?9:heavy?6:3);
const neck=poly(T,hip,[[.02,2.22,.14,-.07,.13],[.04,2.37,.125,-.08,.12],[.06,2.48,.11,-.035,.115]],m.skin,root,'body','broken_neck',8);
const head=new T.Group();head.position.set(id===1?.11:.065,2.58,id===1?.13:.02);head.rotation.z=id%2?-.20:.18;hip.add(head);
poly(T,head,[[.01,-.34,.20,.02,.21],[-.025,-.2,.28,.04,.23],[.015,.035,.32,0,.27],[-.015,.24,.265,-.04,.22],[.03,.35,.15,-.055,.14]],m.skin,root,'head','collapsed_human_skull',9);
patch(T,head,[[-.26,-.035,.233],[-.17,.19,.247],[-.01,.23,.251],[.05,.11,.273],[-.07,-.18,.277]],m.wound,root,'head','torn_face');
for(const side of [-1,1]){const x=side*.125;patch(T,head,[[x-.085,.085,.264],[x+.063,.095,.270],[x+.068,.025,.298],[x-.055,.012,.295]],m.wound,root,'head','empty_eye_socket');patch(T,head,[[x-.027,.065,.3],[x+.025,.067,.3],[x+.01,.031,.3]],m.bone,root,'head','cloudy_pupil')}
const jaw=new T.Group();jaw.name='hinged_broken_jaw';jaw.position.set(0,-.20,.13);head.add(jaw);
poly(T,jaw,[[0,-.20,.20,.07,.105],[0,-.075,.245,.095,.16],[0,.015,.19,.08,.105]],m.skin,root,'head','mandible',7);
patch(T,head,[[-.19,-.17,.249],[.19,-.17,.249],[.18,-.32,.21],[-.15,-.34,.21]],m.wound,root,'head','black_mouth');
for(let i=0;i<7;i++){let xx=(i-3)*.047;strip(T,jaw,[xx,-.045,.229],[xx+.006,.002,.235],.014,m.bone,root,'head','jagged_teeth')}
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
if(id===3){const extra=maggots(T,head,m.worm,root,338,.04,-.28,.22,4);worms.push(...extra);jaw.position.y=-.18}
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
 d.head.rotation.z=(d.type%2===0?-.07:.08)-d.hip.rotation.z*.62+
   Math.sin(phase-1.1)*.018*w;
 if(hit){d.head.rotation.x-=stress*.8;d.head.rotation.z+=Math.sin(age*14)*stress*.45}
 // Deliberate mouth opening for a ranged windup without overriding the jaw's hinge.
 const mouth=(d.spitState==='windup'&&(d.type===3||d.type===9))?
   Math.min(1,(d.spitTimer||0)/2.2)*.36:0;
 d.jaw.rotation.x=-mouth+Math.sin(age*2.1)*.025;
 d.jaw.position.y=-.20-(mouth*.11);
 if(d.type===3||d.type===8)d.jaw.position.y=-.18-mouth*.13;
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
