import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas=document.querySelector('#game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.localClippingEnabled=true;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x08090a);
scene.fog=new THREE.FogExp2(0x08090a,.03);
const camera=new THREE.PerspectiveCamera(58,1,.1,140);
const clock=new THREE.Clock();
const assetLoader=new GLTFLoader();

scene.add(new THREE.HemisphereLight(0x75879a,0x1b100d,1.15));
const moon=new THREE.DirectionalLight(0xd8e2ef,3.6);
moon.position.set(-10,14,7); moon.castShadow=true; moon.shadow.mapSize.set(2048,2048); scene.add(moon);
const fire=new THREE.PointLight(0xff6b3c,18,18,2); fire.position.set(7,3,-6); scene.add(fire);

const floor=new THREE.Mesh(new THREE.CircleGeometry(25,72),new THREE.MeshStandardMaterial({color:0x171719,roughness:.98,metalness:.05}));
floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
for(let i=0;i<38;i++){
  const a=i/38*Math.PI*2,r=20+Math.random()*4;
  const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.7+Math.random()*1.7,0),new THREE.MeshStandardMaterial({color:0x202225,roughness:1}));
  rock.position.set(Math.cos(a)*r,.25,Math.sin(a)*r); rock.scale.y=.5+Math.random()*2.3; rock.castShadow=rock.receiveShadow=true; scene.add(rock);
}
function mat(color,metal=.15,rough=.72){return new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough})}
function part(parent,geo,material,pos,rot=[0,0,0],scale=[1,1,1]){
  const m=new THREE.Mesh(geo,material);m.position.set(...pos);m.rotation.set(...rot);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}

const steel=mat(0x9aa2a8,.9,.22),steelDark=mat(0x4b5258,.82,.34),cloth=mat(0x262226,.04,.9),dark=mat(0x34373b,.34,.52),leather=mat(0x4a3428,.05,.82);
const player=new THREE.Group();scene.add(player);

// Stable in-engine knight: no remote player model required.
const playerBody=part(player,new THREE.CapsuleGeometry(.43,.88,5,8),steelDark,[0,1.05,0]);
part(player,new THREE.BoxGeometry(.78,.72,.42),steel,[0,1.32,0]);
const playerHead=part(player,new THREE.SphereGeometry(.34,12,8),steel,[0,1.98,0]);
part(player,new THREE.BoxGeometry(.48,.13,.38),steelDark,[0,1.98,.23]); // visor
part(player,new THREE.ConeGeometry(.09,.34,6),steel,[0,2.42,0]);
for(const sx of [-1,1]){
 part(player,new THREE.SphereGeometry(.26,10,7),steel,[sx*.55,1.58,0],[0,0,0],[1.25,.7,1]);
 part(player,new THREE.CapsuleGeometry(.13,.64,4,7),steelDark,[sx*.55,1.06,0],[0,0,sx*.05]);
 part(player,new THREE.CapsuleGeometry(.16,.78,4,7),steelDark,[sx*.25,.43,0],[0,0,sx*.035]);
}
part(player,new THREE.BoxGeometry(.72,.06,.46),leather,[0,.82,0]);
const cape=part(player,new THREE.PlaneGeometry(.82,1.22),cloth,[0,1.15,-.3],[0,0,0]);cape.material.side=THREE.DoubleSide;

const weaponPivot=new THREE.Group();weaponPivot.position.set(.48,1.38,0);player.add(weaponPivot);
const shieldPivot=new THREE.Group();shieldPivot.position.set(-.48,1.32,.05);player.add(shieldPivot);
const shield=part(shieldPivot,new THREE.CylinderGeometry(.48,.48,.11,12),steelDark,[0,0,-.08],[Math.PI/2,0,0],[1,.95,1]);
part(shieldPivot,new THREE.BoxGeometry(.12,.68,.14),steel,[0,0,.02]);
const weaponVisual=new THREE.Group();weaponPivot.add(weaponVisual);
const swordPivot=weaponPivot; // combat-pose compatibility

const WEAPONS=[
 {id:'straight',name:'직검',damage:1.00,posture:1.00,speed:1.00,stamina:1.00,reach:1.00,hitstop:1.00,guard:.58,motion:1.00,asset:'./assets/models/kaykit/sword_1handed.gltf',assetScale:.72},
 {id:'greatsword',name:'대검',damage:1.58,posture:1.55,speed:.66,stamina:1.48,reach:1.22,hitstop:1.55,guard:.72,motion:1.35,asset:'./assets/models/kaykit/sword_2handed.gltf',assetScale:.78},
 {id:'hammer',name:'해머',damage:1.38,posture:1.92,speed:.59,stamina:1.58,reach:.93,hitstop:1.82,guard:.76,motion:1.52},
 {id:'spear',name:'창',damage:.92,posture:.86,speed:1.08,stamina:.92,reach:1.48,hitstop:.82,guard:.48,motion:.82,asset:'./assets/models/kenney/weapon-spear.glb',assetScale:.9},
 {id:'katana',name:'태도',damage:1.08,posture:.92,speed:1.18,stamina:.94,reach:1.08,hitstop:.9,guard:.45,motion:.74,asset:'./assets/models/kaykit/sword_1handed.gltf',assetScale:.8,assetThin:true},
 {id:'axe',name:'전투도끼',damage:1.28,posture:1.36,speed:.78,stamina:1.27,reach:1.02,hitstop:1.32,guard:.65,motion:1.22,asset:'./assets/models/kaykit/axe_1handed.gltf',assetScale:.76}
];
let weaponIndex=0,twoHanded=false;
function currentWeapon(){return WEAPONS[weaponIndex]}
function clearWeapon(){while(weaponVisual.children.length){const o=weaponVisual.children.pop();o.geometry?.dispose?.();}}
function addWeaponMesh(geo,material,pos,rot=[0,0,0]){return part(weaponVisual,geo,material,pos,rot)}
function buildWeapon(){
 clearWeapon();
 const w=currentWeapon();
 if(w.id==='straight'){
   addWeaponMesh(new THREE.BoxGeometry(.12,.08,1.65),steel,[0,0,-.72]);
   addWeaponMesh(new THREE.BoxGeometry(.48,.08,.12),steelDark,[0,0,.08]);addWeaponMesh(new THREE.CapsuleGeometry(.055,.34,4,6),leather,[0,0,.34],[Math.PI/2,0,0]);
 }else if(w.id==='greatsword'){
   addWeaponMesh(new THREE.BoxGeometry(.24,.10,2.28),steel,[0,0,-1.02]);addWeaponMesh(new THREE.BoxGeometry(.7,.12,.16),steelDark,[0,0,.14]);addWeaponMesh(new THREE.CapsuleGeometry(.075,.55,4,6),leather,[0,0,.52],[Math.PI/2,0,0]);
 }else if(w.id==='hammer'){
   addWeaponMesh(new THREE.CylinderGeometry(.075,.075,2.0,8),leather,[0,0,-.45],[Math.PI/2,0,0]);addWeaponMesh(new THREE.BoxGeometry(.92,.58,.5),steelDark,[0,0,-1.42]);
 }else if(w.id==='spear'){
   addWeaponMesh(new THREE.CylinderGeometry(.045,.045,2.65,8),leather,[0,0,-.9],[Math.PI/2,0,0]);addWeaponMesh(new THREE.ConeGeometry(.14,.62,6),steel,[0,0,-2.28],[Math.PI/2,0,0]);
 }else if(w.id==='katana'){
   addWeaponMesh(new THREE.BoxGeometry(.09,.055,1.82),steel,[.05,0,-.82],[0,.08,0]);addWeaponMesh(new THREE.CylinderGeometry(.18,.18,.05,12),steelDark,[0,0,.08],[Math.PI/2,0,0]);addWeaponMesh(new THREE.CapsuleGeometry(.05,.42,4,6),leather,[0,0,.38],[Math.PI/2,0,0]);
 }else{
   addWeaponMesh(new THREE.CylinderGeometry(.07,.07,1.55,8),leather,[0,0,-.45],[Math.PI/2,0,0]);addWeaponMesh(new THREE.BoxGeometry(.72,.46,.18),steel,[.18,0,-1.18],[0,0,.18]);
 }
 weaponPivot.scale.setScalar(twoHanded?1.06:1);
 shield.visible=!twoHanded;
 const assetUrl=w.asset;
 if(assetUrl){
   const requested=w.id;
   assetLoader.load(assetUrl,gltf=>{
     if(currentWeapon().id!==requested)return;
     clearWeapon();
     const model=gltf.scene;
     model.rotation.x=-Math.PI/2;
     model.scale.setScalar(w.assetScale||.75);
     if(w.assetThin)model.scale.x*=.62;
     model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
     weaponVisual.add(model);
   },undefined,err=>console.warn('Weapon asset unavailable; procedural weapon remains active.',requested,err));
 }
}
function setWeapon(i){
 if(state?.attack>0||state?.rolling>0)return;
 weaponIndex=(i+WEAPONS.length)%WEAPONS.length;
 if(['greatsword','hammer'].includes(currentWeapon().id)&&!twoHanded)twoHanded=true;
 buildWeapon();flash(currentWeapon().name+(twoHanded?' · 양손':' · 방패'),.45);
}
function toggleGrip(){if(state?.attack>0||state?.rolling>0)return;twoHanded=!twoHanded;buildWeapon();flash(twoHanded?'양손 잡기 · 무기 가드':'한손 잡기 · 방패 가드',.5)}
buildWeapon();
player.position.set(0,0,8);

let knightVisual=null;
assetLoader.load('./assets/models/kaykit/Knight.glb',gltf=>{
  knightVisual=gltf.scene;
  knightVisual.scale.setScalar(.92);
  knightVisual.rotation.y=Math.PI;
  knightVisual.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  player.children.filter(o=>o.isMesh).forEach(m=>m.visible=false);
  player.add(knightVisual);
  setupKnightAnimations(gltf);
},undefined,err=>console.warn('Local knight asset unavailable; procedural knight remains active.',err));

// KayKit knight animation state machine. Falls back to procedural poses when clips are absent.
let playerMixer=null,playerActions={},playerActionName='';
function pickClip(clips,terms){
 const lower=clips.map(x=>({clip:x,name:(x.name||'').toLowerCase()}));
 for(const term of terms){
   const found=lower.find(x=>x.name.includes(term));
   if(found)return found.clip;
 }
 return null;
}
function setupKnightAnimations(gltf){
 if(!gltf.animations?.length)return;
 playerMixer=new THREE.AnimationMixer(knightVisual);
 const clips=gltf.animations;
 const defs={
   idle:['idle'],
   walk:['walk'],
   run:['run'],
   attack:['melee_attack','attack_slice','attack_chop','attack'],
   guard:['block','blocking','guard'],
   roll:['roll','dodge'],
   hit:['hit','damage'],
   dead:['death','dead']
 };
 for(const [key,terms] of Object.entries(defs)){
   const clip=pickClip(clips,terms);
   if(clip){
     const a=playerMixer.clipAction(clip);
     if(key==='dead'||key==='hit'||key==='roll'||key==='attack'){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true}
     playerActions[key]=a;
   }
 }
 console.info('Knight animations:',clips.map(x=>x.name));
 setPlayerVisualAction('idle',0);
}
function setPlayerVisualAction(name,fade=.12){
 if(!playerMixer)return;
 if(!playerActions[name])name=playerActions.idle?'idle':Object.keys(playerActions)[0];
 if(!name||playerActionName===name)return;
 const prev=playerActions[playerActionName],next=playerActions[name];
 if(!next)return;
 next.reset();
 if(!['dead','hit','roll','attack'].includes(name))next.setLoop(THREE.LoopRepeat,Infinity);
 next.play();
 if(prev&&prev!==next)prev.crossFadeTo(next,fade,false);
 playerActionName=name;
}

const boss=new THREE.Group();scene.add(boss);
const shell=mat(0x24292d,.7,.34),shellDark=mat(0x111518,.56,.58),carapace=mat(0x555d63,.76,.3),meat=mat(0x4e211d,.02,.9),horn=mat(0xb7aa94,.12,.58);
const skin=new THREE.MeshStandardMaterial({color:0xd9a99e,roughness:.58,metalness:.01});
const skinShadow=new THREE.MeshStandardMaterial({color:0xb97e76,roughness:.66,metalness:.01});
const hairMat=new THREE.MeshStandardMaterial({color:0x17141c,roughness:.72,metalness:.04});
const eyeMat=new THREE.MeshStandardMaterial({color:0xffd5e6,emissive:0xff2d73,emissiveIntensity:1.35,roughness:.22});
const lipMat=new THREE.MeshStandardMaterial({color:0x8e3147,roughness:.5});
const warningFlesh=new THREE.MeshStandardMaterial({color:0x5b231d,roughness:.72,metalness:.02,emissive:0x000000,emissiveIntensity:0});

// B-form: a colossal adult woman growing from a quadrupedal monster lower body.
const body=part(boss,new THREE.SphereGeometry(1.55,18,12),shellDark,[0,1.48,-.55],[0,0,0],[1.72,.68,2.25]);
const belly=part(boss,new THREE.SphereGeometry(1.08,14,9),meat,[0,1.12,.0],[0,0,0],[1.36,.5,1.72]);

// Monster pelvis and carapace visibly separate the beast half from the woman half.
const backShell=new THREE.Group();backShell.position.set(0,2.12,-.95);boss.add(backShell);
for(const [i,z] of [[0,-.82],[1,-.24],[2,.34],[3,.84]]){
  const plate=part(backShell,new THREE.DodecahedronGeometry(.76-(i*.05),0),i%2?carapace:shell,[0,.12+i*.07,z],[0,0,0],[1.55,.44,.92]);
  plate.rotation.x=-.09+i*.035;
}
for(const x of [-.78,0,.78])part(backShell,new THREE.ConeGeometry(.17,.95,7),horn,[x,.62,-.42],[Math.PI/2.25,0,0]);

// Narrow waist rises clearly above the monster shell.
const waist=part(boss,new THREE.CapsuleGeometry(.58,.88,6,10),skinShadow,[0,2.72,.38],[0,0,0],[1.15,1,1.0]);
const waistShell=part(boss,new THREE.TorusGeometry(.78,.17,8,22,Math.PI*1.55),shell,[0,2.42,.28],[Math.PI/2,0,.76]);
part(boss,new THREE.ConeGeometry(.12,.72,7),horn,[-.62,2.55,-.08],[.15,0,-.48]);
part(boss,new THREE.ConeGeometry(.12,.72,7),horn,[ .62,2.55,-.08],[.15,0,.48]);

// Human torso: broad shoulders, narrow waist, exaggerated chest silhouette.
const chest=part(boss,new THREE.SphereGeometry(1.12,18,12),skin,[0,3.62,.62],[0,0,0],[1.42,1.08,.82]);
part(boss,new THREE.DodecahedronGeometry(.42,0),shell,[-1.12,4.02,.44],[0,0,-.18],[1.35,.62,.9]);
part(boss,new THREE.DodecahedronGeometry(.42,0),shell,[ 1.12,4.02,.44],[0,0,.18],[1.35,.62,.9]);
const sternum=part(boss,new THREE.CapsuleGeometry(.34,.72,5,9),skinShadow,[0,3.48,1.02],[Math.PI/2,0,0],[1.0,1,.72]);
const bustL=part(boss,new THREE.SphereGeometry(.72,16,11),skin,[ -.62,3.62,1.38],[.08,0,.08],[1.08,.98,.92]);
const bustR=part(boss,new THREE.SphereGeometry(.72,16,11),skin,[  .62,3.62,1.38],[.08,0,-.08],[1.08,.98,.92]);

// A dark organic collar prevents the torso and face from visually merging.
const collar=part(boss,new THREE.TorusGeometry(.62,.12,7,18,Math.PI*1.45),shell,[0,4.28,.64],[Math.PI/2,0,.78]);
const neck=part(boss,new THREE.CapsuleGeometry(.3,.62,5,9),skin,[0,4.55,.72],[0,0,0],[1,1,1]);

// Beautiful adult face as a readable focal point.
const head=part(boss,new THREE.SphereGeometry(.72,20,14),skin,[0,5.28,.82],[0,0,0],[.92,1.18,.78]);
const faceMask=part(head,new THREE.SphereGeometry(.64,18,12),skin,[0,-.02,.19],[0,0,0],[.88,1.06,.5]);
const brow=part(head,new THREE.BoxGeometry(.95,.09,.12),skinShadow,[0,.2,.6],[-.08,0,0]);
const eyeL=part(head,new THREE.SphereGeometry(.065,10,7),eyeMat,[-.22,.12,.64],[0,0,0],[1.25,.62,.5]);
const eyeR=part(head,new THREE.SphereGeometry(.065,10,7),eyeMat,[ .22,.12,.64],[0,0,0],[1.25,.62,.5]);
const nose=part(head,new THREE.ConeGeometry(.055,.2,7),skinShadow,[0,-.02,.7],[Math.PI/2,0,0],[.8,1,.8]);
const jaw=part(head,new THREE.BoxGeometry(.58,.12,.11),lipMat,[0,-.28,.65],[.08,0,0]);

// Long hair frames the face and keeps the head readable against the giant arms.
const hairCap=part(head,new THREE.SphereGeometry(.82,16,11),hairMat,[0,.08,-.38],[0,0,0],[1.04,1.1,.46]);
const hairLocks=[];
for(const sx of [-1,1]){
  hairLocks.push(part(head,new THREE.CapsuleGeometry(.15,1.55,5,8),hairMat,[sx*.57,-.58,-.02],[0,0,sx*.09],[1,1,1]));
  hairLocks.push(part(head,new THREE.CapsuleGeometry(.12,1.18,5,8),hairMat,[sx*.36,-.72,-.1],[0,0,sx*.05],[1,1,1]));
}
part(head,new THREE.ConeGeometry(.13,.68,7),horn,[-.48,.65,-.18],[.2,0,-.35]);
part(head,new THREE.ConeGeometry(.13,.68,7),horn,[ .48,.65,-.18],[.2,0,.35]);

// Four monster legs remain the lower-body locomotion and preserve existing combat logic.
const legs=[];
for(const sx of [-1,1])for(const z of [.9,-1.35]){
  const upper=part(boss,new THREE.CapsuleGeometry(.34,1.18,5,9),shell,[sx*1.62,1.05,z],[0,0,sx*.66],[1.12,1,1.12]);
  part(boss,new THREE.SphereGeometry(.3,9,7),carapace,[sx*1.92,.62,z+.08]);
  const lower=part(boss,new THREE.CapsuleGeometry(.24,1.0,5,8),meat,[sx*2.02,.31,z+.2],[0,0,sx*.16]);
  part(boss,new THREE.ConeGeometry(.14,.62,7),horn,[sx*2.16,.06,z+.5],[Math.PI/2,0,0]);
  legs.push(upper,lower);
}

const tailPivot=new THREE.Group();tailPivot.position.set(0,1.38,-2.18);boss.add(tailPivot);
const tailA=part(tailPivot,new THREE.CapsuleGeometry(.42,1.58,5,9),shell,[0,0,-.86],[Math.PI/2,0,0]);
const tailB=part(tailPivot,new THREE.CapsuleGeometry(.28,1.65,5,9),shellDark,[0,0,-2.22],[Math.PI/2,0,0]);
const tailTip=part(tailPivot,new THREE.ConeGeometry(.35,1.42,8),horn,[0,0,-3.5],[Math.PI/2,0,0]);

const BOSS_REST={bodyY:1.48,headY:5.28,headZ:.82,jawX:.08};

let bossWomanVisual=null;
const bossWomanBones={};
const bossWomanRest={};
const proceduralWoman=[waist,chest,sternum,bustL,bustR,collar,neck,head];
const womanClipPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-2.62);

function cacheBossWomanBone(name){
 const b=bossWomanVisual?.getObjectByName(name);
 if(!b)return null;
 bossWomanBones[name]=b;
 bossWomanRest[name]={rotation:b.rotation.clone(),scale:b.scale.clone(),position:b.position.clone()};
 return b;
}
function setBoneOffset(name,rx=0,ry=0,rz=0,speed=10,dt=.016){
 const b=bossWomanBones[name],base=bossWomanRest[name];
 if(!b||!base)return;
 b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,base.rotation.x+rx,1-Math.exp(-dt*speed));
 b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,base.rotation.y+ry,1-Math.exp(-dt*speed));
 b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,base.rotation.z+rz,1-Math.exp(-dt*speed));
}
function setBossMorph(name,value,speed=10,dt=.016){
 if(!bossWomanVisual)return;
 bossWomanVisual.traverse(o=>{
   if(!o.morphTargetDictionary||!o.morphTargetInfluences)return;
   const idx=o.morphTargetDictionary[name];
   if(idx===undefined)return;
   o.morphTargetInfluences[idx]=THREE.MathUtils.lerp(o.morphTargetInfluences[idx]||0,value,1-Math.exp(-dt*speed));
 });
}

assetLoader.load('./assets/models/boss/mpfb-female.glb',gltf=>{
 bossWomanVisual=gltf.scene;
 bossWomanVisual.name='BellamoreHighDetailBody';
 bossWomanVisual.position.set(0,.12,.42);
 bossWomanVisual.scale.setScalar(3.0);
 bossWomanVisual.traverse(o=>{
   if(o.isMesh){
     o.castShadow=true;o.receiveShadow=true;
     if(Array.isArray(o.material)){
       o.material=o.material.map(m=>{const n=m.clone();n.clippingPlanes=[womanClipPlane];n.clipShadows=true;return n});
     }else if(o.material){
       o.material=o.material.clone();o.material.clippingPlanes=[womanClipPlane];o.material.clipShadows=true;
     }
   }
 });
 boss.add(bossWomanVisual);

 for(const name of ['Hips','Spine','Spine1','Spine2','Neck','Head','LeftBreast','RightBreast','PonytailRoot','Ponytail1','Ponytail2','Ponytail3','LeftShoulder','RightShoulder','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand'])cacheBossWomanBone(name);

 // Collapse the avatar's normal arms into the shoulder mass; custom giant arms remain the only readable attack limbs.
 for(const name of ['LeftArm','RightArm']){
   const b=bossWomanBones[name],base=bossWomanRest[name];
   if(b&&base)b.scale.set(base.scale.x*.08,base.scale.y*.08,base.scale.z*.08);
 }

 // Exaggerate the dedicated MPFB breast bones while preserving the textured/skinned chest.
 for(const name of ['LeftBreast','RightBreast']){
   const b=bossWomanBones[name],base=bossWomanRest[name];
   if(b&&base)b.scale.set(base.scale.x*1.34,base.scale.y*1.22,base.scale.z*1.38);
 }

 proceduralWoman.forEach(o=>o.visible=false);
 console.info('Bellamore: high-detail CC0 MPFB body loaded');
},undefined,err=>console.warn('High-detail boss GLB failed; procedural giantess fallback remains visible.',err));

// Her actual gigantic arms. Combat hit ranges stay unchanged; only the visual reach is oversized.
const dorsalArms=[];
for(const sx of [-1,1]){
  const shoulder=new THREE.Group();
  shoulder.position.set(sx*1.25,4.12,.62);
  shoulder.rotation.z=-sx*.2;
  boss.add(shoulder);

  // Human shoulder mass wrapped with monster plating.
  part(shoulder,new THREE.SphereGeometry(.58,12,9),skin,[0,0,0],[0,0,0],[1.2,.9,1.0]);
  part(shoulder,new THREE.DodecahedronGeometry(.58,0),carapace,[sx*.22,.12,-.18],[0,0,sx*.15],[1.18,.72,.92]);
  part(shoulder,new THREE.ConeGeometry(.17,.88,7),horn,[sx*.28,.45,-.2],[0,0,sx*.38]);

  const upperPivot=new THREE.Group();
  upperPivot.position.set(sx*.2,-.08,.04);
  upperPivot.rotation.z=sx*.12;
  shoulder.add(upperPivot);

  // Very long upper arm: skin first, then a dark organic guard.
  const upper=part(upperPivot,new THREE.CapsuleGeometry(.36,2.15,7,11),skin,[sx*1.02,-.24,.03],[0,0,sx*1.02],[1.14,1,1.08]);
  part(upperPivot,new THREE.BoxGeometry(1.18,.34,.5),shellDark,[sx*.92,-.18,-.18],[0,0,sx*.12]);

  const elbow=new THREE.Group();
  elbow.position.set(sx*1.96,-.7,.04);
  upperPivot.add(elbow);
  part(elbow,new THREE.SphereGeometry(.34,10,8),skinShadow,[0,0,0]);
  part(elbow,new THREE.DodecahedronGeometry(.38,0),carapace,[0,.08,-.12],[0,0,0],[1.12,.7,1]);

  const fore=part(elbow,new THREE.CapsuleGeometry(.33,2.08,7,11),skin,[sx*.98,-.18,.06],[0,0,sx*.96],[1.14,1,1.08]);
  part(elbow,new THREE.BoxGeometry(1.3,.42,.62),warningFlesh,[sx*.9,-.12,-.12],[0,0,sx*.1]);

  const wrist=new THREE.Group();
  wrist.position.set(sx*1.92,-.54,.06);
  elbow.add(wrist);

  const hand=part(wrist,new THREE.SphereGeometry(.54,12,9),skin,[sx*.34,-.08,.12],[0,0,0],[1.25,.72,1.0]);
  const palm=part(wrist,new THREE.BoxGeometry(.86,.28,.66),skinShadow,[sx*.42,-.18,.14],[0,0,sx*.1]);

  // Monster talons sell the hybrid nature, but are visual only.
  for(let f=-1;f<=1;f++)part(wrist,new THREE.ConeGeometry(.095,.92,7),horn,[sx*.9,-.2,f*.23],[0,0,sx*Math.PI/2]);

  dorsalArms.push({sx,shoulder,upperPivot,elbow,wrist,hand,rest:{shoulderZ:-sx*.2,upperZ:sx*.12}});
}
function resetDorsalArms(dt=1){
 for(const a of dorsalArms){
   a.shoulder.rotation.x=THREE.MathUtils.lerp(a.shoulder.rotation.x,0,dt);
   a.shoulder.rotation.y=THREE.MathUtils.lerp(a.shoulder.rotation.y,0,dt);
   a.shoulder.rotation.z=THREE.MathUtils.lerp(a.shoulder.rotation.z,a.rest.shoulderZ,dt);
   a.upperPivot.rotation.x=THREE.MathUtils.lerp(a.upperPivot.rotation.x,0,dt);
   a.upperPivot.rotation.y=THREE.MathUtils.lerp(a.upperPivot.rotation.y,0,dt);
   a.upperPivot.rotation.z=THREE.MathUtils.lerp(a.upperPivot.rotation.z,a.rest.upperZ,dt);
   a.elbow.rotation.x=THREE.MathUtils.lerp(a.elbow.rotation.x,0,dt);
   a.elbow.rotation.y=THREE.MathUtils.lerp(a.elbow.rotation.y,0,dt);
   a.elbow.rotation.z=THREE.MathUtils.lerp(a.elbow.rotation.z,0,dt);
   a.wrist.rotation.x=THREE.MathUtils.lerp(a.wrist.rotation.x,0,dt);
   a.wrist.rotation.y=THREE.MathUtils.lerp(a.wrist.rotation.y,0,dt);
   a.wrist.rotation.z=THREE.MathUtils.lerp(a.wrist.rotation.z,0,dt);
 }
}
boss.position.set(0,0,-2);

// Procedural boss visual is the guaranteed browser-safe fallback.
let bossMixer=null;
function setBossVisualAction(){}
const shadowMat=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.34,depthWrite:false});
for(const [obj,r] of [[player,.72],[boss,2.1]]){const s=new THREE.Mesh(new THREE.CircleGeometry(r,32),shadowMat);s.rotation.x=-Math.PI/2;s.position.y=.012;obj.add(s)}

const input={keys:new Set(),guard:false,lock:true};
addEventListener('keydown',e=>{
 input.keys.add(e.code);
 if(e.code==='KeyQ')input.lock=!input.lock;
 if(e.code==='Space')tryRoll();
 if(/^Digit[1-6]$/.test(e.code))setWeapon(Number(e.code.slice(5))-1);
 if(e.code==='KeyT')toggleGrip();
});
addEventListener('keyup',e=>input.keys.delete(e.code));
addEventListener('mousedown',e=>{if(e.button===0)tryAttack();if(e.button===2){input.guard=true;tryDeflect()}});
addEventListener('mouseup',e=>{if(e.button===2)input.guard=false});
addEventListener('contextmenu',e=>e.preventDefault());

const ui={hp:document.querySelector('#hp'),stamina:document.querySelector('#stamina'),posture:document.querySelector('#posture'),bossHp:document.querySelector('#bossHp'),bossPosture:document.querySelector('#bossPosture'),msg:document.querySelector('#message'),danger:document.querySelector('#danger'),head:document.querySelector('#headPart'),leg:document.querySelector('#legPart'),tail:document.querySelector('#tailPart'),weapon:document.querySelector('#weaponHud')};
const state={
 hp:100,posture:0,stamina:100,staminaMax:100,staminaRegenDelay:0,exhausted:0,attack:0,attackHit:false,attackStep:0,attackQueued:false,comboGrace:0,rolling:0,rollDir:new THREE.Vector3(),invuln:0,deflect:0,parryAnim:0,guardBlend:0,stagger:0,dead:false,
 bossHp:560,bossPosture:0,bossState:'idle',bossTimer:1.0,bossHit:false,bossStagger:0,bossPatternStep:0,bossFxStamp:'',time:0,shake:0,hitstop:0,
 headHp:100,legHp:150,tailHp:130,tailBroken:false,legBroken:false,headBroken:false,danger:false,reaction:0,reactionZone:'body'
};
function flash(t,d=.35){ui.msg.textContent=t;ui.msg.style.opacity='1';clearTimeout(flash.t);flash.t=setTimeout(()=>ui.msg.style.opacity='0',d*1000)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function flatDir(a,b){const d=new THREE.Vector3().subVectors(b,a);d.y=0;return d.lengthSq()?d.normalize():d.set(0,0,-1)}
function dist(){return player.position.distanceTo(boss.position)}
function setDanger(v){state.danger=v;ui.danger.classList.toggle('on',v)}
function hitStop(sec){state.hitstop=Math.max(state.hitstop,sec)}
function spendStamina(amount,delay=.55){
 if(state.stamina<amount||state.exhausted>0)return false;
 state.stamina=Math.max(0,state.stamina-amount);
 state.staminaRegenDelay=Math.max(state.staminaRegenDelay,delay);
 if(state.stamina<=0){
   state.exhausted=.75;
   state.staminaRegenDelay=Math.max(state.staminaRegenDelay,.9);
 }
 return true;
}
function drainStamina(amount,dt,delay=.18){
 if(state.exhausted>0)return false;
 state.stamina=Math.max(0,state.stamina-amount*dt);
 if(amount>0)state.staminaRegenDelay=Math.max(state.staminaRegenDelay,delay);
 if(state.stamina<=0){state.exhausted=.75;state.staminaRegenDelay=.9;return false}
 return true;
}
const sparks=[];
function spawnSparks(origin,count=16,power=5.5){
 const geom=new THREE.BufferGeometry(),pos=new Float32Array(count*3),vel=[];
 for(let i=0;i<count;i++){
   pos[i*3]=origin.x;pos[i*3+1]=origin.y;pos[i*3+2]=origin.z;
   const v=new THREE.Vector3((Math.random()-.5)*1.5,Math.random()*.9+.25,(Math.random()-.5)*1.5).normalize().multiplyScalar(power*(.55+Math.random()*.75));vel.push(v);
 }
 geom.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const pts=new THREE.Points(geom,new THREE.PointsMaterial({color:0xffc85a,size:.07,transparent:true,opacity:1,depthWrite:false}));
 scene.add(pts);sparks.push({pts,vel,life:.32});
}
const armTrails=[];
const armTrailLast=new WeakMap();
function spawnArmTrail(arm,intensity=1){
 const now=new THREE.Vector3();arm.wrist.getWorldPosition(now);
 const prev=armTrailLast.get(arm);
 armTrailLast.set(arm,now.clone());
 if(!prev||prev.distanceTo(now)<.07)return;
 const delta=new THREE.Vector3().subVectors(now,prev),len=delta.length(),mid=prev.clone().add(now).multiplyScalar(.5);
 const geo=new THREE.CylinderGeometry(.075*intensity,.15*intensity,len,7,1,true);
 const material=new THREE.MeshBasicMaterial({color:0xff7a45,transparent:true,opacity:.42*intensity,depthWrite:false,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(geo,material);mesh.position.copy(mid);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
 scene.add(mesh);armTrails.push({mesh,life:.2,max:.2});
}
function updateArmTrails(dt){
 for(let i=armTrails.length-1;i>=0;i--){
   const t=armTrails[i];t.life-=dt;
   t.mesh.material.opacity=clamp(t.life/t.max,0,1)*.42;
   t.mesh.scale.x*=1+dt*1.6;t.mesh.scale.z*=1+dt*1.6;
   if(t.life<=0){scene.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.dispose();armTrails.splice(i,1)}
 }
}

const dustFX=[];
function spawnDustBurst(origin,scale=1){
 const ring=new THREE.Mesh(
   new THREE.RingGeometry(.45*scale,1.0*scale,32),
   new THREE.MeshBasicMaterial({color:0x8d7864,transparent:true,opacity:.45,depthWrite:false,side:THREE.DoubleSide})
 );
 ring.rotation.x=-Math.PI/2;ring.position.copy(origin);ring.position.y=.035;scene.add(ring);
 const count=14,pos=new Float32Array(count*3),vel=[];
 for(let i=0;i<count;i++){
   const a=Math.random()*Math.PI*2,r=.25+Math.random()*.45;
   pos[i*3]=origin.x+Math.cos(a)*r;pos[i*3+1]=.08+Math.random()*.22;pos[i*3+2]=origin.z+Math.sin(a)*r;
   vel.push(new THREE.Vector3(Math.cos(a)*(1.2+Math.random()*2.2)*scale,1.2+Math.random()*2.2,Math.sin(a)*(1.2+Math.random()*2.2)*scale));
 }
 const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const pts=new THREE.Points(geom,new THREE.PointsMaterial({color:0x9e8770,size:.11*scale,transparent:true,opacity:.65,depthWrite:false}));
 scene.add(pts);dustFX.push({ring,pts,vel,life:.46,max:.46});
}
function updateDustFX(dt){
 for(let d=dustFX.length-1;d>=0;d--){
   const fx=dustFX[d];fx.life-=dt;const q=clamp(fx.life/fx.max,0,1);
   fx.ring.scale.multiplyScalar(1+dt*5);fx.ring.material.opacity=q*.42;
   const arr=fx.pts.geometry.attributes.position.array;
   for(let i=0;i<fx.vel.length;i++){fx.vel[i].y-=6*dt;arr[i*3]+=fx.vel[i].x*dt;arr[i*3+1]+=fx.vel[i].y*dt;arr[i*3+2]+=fx.vel[i].z*dt}
   fx.pts.geometry.attributes.position.needsUpdate=true;fx.pts.material.opacity=q*.6;
   if(fx.life<=0){scene.remove(fx.ring,fx.pts);fx.ring.geometry.dispose();fx.ring.material.dispose();fx.pts.geometry.dispose();fx.pts.material.dispose();dustFX.splice(d,1)}
 }
}
function bossGroundPoint(offsetZ=1.6){
 const p=new THREE.Vector3(0,0,offsetZ);boss.localToWorld(p);p.y=0;return p;
}
function updateBossWarningGlow(){
 const armAttack=state.bossState.startsWith('arm_');
 const danger=state.bossState==='arm_grab'||state.bossState==='arm_crush'||state.bossState==='peril';
 warningFlesh.emissive.setHex(danger?0x8a1108:(armAttack?0x321009:0x000000));
 warningFlesh.emissiveIntensity=danger?(1.2+.45*Math.sin(state.time*18)):(armAttack?.32:0);
}

function animateGiantessPresence(dt){
 const attacking=state.bossState!=='idle'&&state.bossState!=='stagger';
 const dangerous=state.bossState==='arm_grab'||state.bossState==='arm_crush'||state.bossState==='peril';
 // Slow breathing and deliberate head movement keep the upper body alive between attacks.
 const hairSpeed=attacking?7.5:2.0;
 for(let i=0;i<hairLocks.length;i++){
   const h=hairLocks[i],side=i<2?-1:1;
   h.rotation.z=THREE.MathUtils.lerp(h.rotation.z,side*.06+Math.sin(state.time*hairSpeed+i)*.055,1-Math.exp(-dt*7));
   h.rotation.x=THREE.MathUtils.lerp(h.rotation.x,attacking?.1:0,1-Math.exp(-dt*6));
 }
 if(state.bossState==='idle'){
   const breathe=Math.sin(state.time*1.55);
   chest.scale.y=1.08+breathe*.018;
   chest.rotation.z=Math.sin(state.time*.72)*.018;
   waist.rotation.z=Math.sin(state.time*.58)*.012;
   head.rotation.y=Math.sin(state.time*.55)*.055;
   head.rotation.x=Math.sin(state.time*.82)*.018;
   bustL.position.y=3.62+breathe*.025;bustR.position.y=3.62+breathe*.025;
 }else{
   chest.scale.y=THREE.MathUtils.lerp(chest.scale.y,1.08,1-Math.exp(-dt*8));
 }
 // Danger attacks transform the pretty face into the warning tell.
 const targetEye=dangerous?3.0:(attacking?1.7:1.25);
 eyeMat.emissiveIntensity=THREE.MathUtils.lerp(eyeMat.emissiveIntensity,targetEye,1-Math.exp(-dt*10));
 if(dangerous){
   jaw.rotation.x=THREE.MathUtils.lerp(jaw.rotation.x,.34,1-Math.exp(-dt*12));
   head.rotation.z+=Math.sin(state.time*13)*.006;
 }
}
function updateSparks(dt){
 for(let s=sparks.length-1;s>=0;s--){
   const fx=sparks[s],arr=fx.pts.geometry.attributes.position.array;fx.life-=dt;
   for(let i=0;i<fx.vel.length;i++){
     fx.vel[i].y-=11*dt;arr[i*3]+=fx.vel[i].x*dt;arr[i*3+1]+=fx.vel[i].y*dt;arr[i*3+2]+=fx.vel[i].z*dt;
   }
   fx.pts.geometry.attributes.position.needsUpdate=true;fx.pts.material.opacity=clamp(fx.life/.32,0,1);
   if(fx.life<=0){scene.remove(fx.pts);fx.pts.geometry.dispose();fx.pts.material.dispose();sparks.splice(s,1)}
 }
}
function getMoveAxes(){
 let x=0,z=0;
 if(input.keys.has('KeyA'))x-=1;if(input.keys.has('KeyD'))x+=1;
 if(input.keys.has('KeyW'))z+=1;if(input.keys.has('KeyS'))z-=1;
 return {x,z};
}
function getCameraBasis(){
 const f=new THREE.Vector3();camera.getWorldDirection(f);f.y=0;
 if(!f.lengthSq())f.set(0,0,-1);f.normalize();
 const r=new THREE.Vector3(-f.z,0,f.x).normalize();
 return {f,r};
}
function tryRoll(){
 if(state.dead||state.rolling>0||state.attack>0||state.stagger>0||state.exhausted>0)return;
 const {x,z}=getMoveAxes();
 const toBoss=flatDir(player.position,boss.position);
 const right=new THREE.Vector3(-toBoss.z,0,toBoss.x);
 state.rollDir.set(0,0,0);
 if(input.lock){
   state.rollDir.addScaledVector(toBoss,z).addScaledVector(right,x);
 }else{
   const basis=getCameraBasis();
   state.rollDir.addScaledVector(basis.f,z).addScaledVector(basis.r,x);
 }
 // Neutral dodge is a backstep away from the locked target / camera facing.
 if(!state.rollDir.lengthSq())state.rollDir.copy(input.lock?toBoss.clone().multiplyScalar(-1):getCameraBasis().f.clone().multiplyScalar(-1));
 state.rollDir.normalize();
 if(!spendStamina(24,.72))return;state.rolling=.5;state.invuln=.29;
 player.rotation.y=Math.atan2(state.rollDir.x,state.rollDir.z);
}
function startAttack(step){
 const w=currentWeapon(), grip=twoHanded?1.08:1;
 const cost=[0,16,18,23][step]*w.stamina*grip;
 if(!spendStamina(cost,.62))return false;
 state.attackStep=step;
 state.attack=[0,.46,.5,.62][step]/w.speed*(twoHanded ? .96 : 1.04);
 state.attackHit=false;state.attackQueued=false;state.comboGrace=.2/w.speed;return true;
}
function tryAttack(){
 if(state.dead||state.rolling>0||state.stagger>0)return;
 if(state.attack>0){
   if(state.attack<.24)state.attackQueued=true;
   return;
 }
 const next=state.comboGrace>0?Math.min(3,state.attackStep+1):1;
 startAttack(next);
}
function tryDeflect(){if(!state.dead&&state.stagger<=0&&state.exhausted<=0&&spendStamina(5,.32)){state.deflect=.17;state.parryAnim=.22}}

function hurtPlayer(dmg,posture=20,unblockable=false){
 if(state.invuln>0||state.dead)return;
 if(!unblockable&&input.guard){
   if(state.deflect>0){
     state.bossPosture+=30;state.posture=Math.max(0,state.posture-15);state.stamina=Math.min(state.staminaMax,state.stamina+9);state.shake=.16;state.parryAnim=.28;hitStop(.055);spawnSparks(player.position.clone().lerp(boss.position,.42).add(new THREE.Vector3(0,1.45,0)),22,7);flash('저스트 튕겨내기',.22);
     if(state.bossPosture>=100){state.bossStagger=2.05;state.bossPosture=48;state.bossState='stagger';flash('자세 붕괴',.52)}
     return;
   }
   const w=currentWeapon();
   const shieldGuard=!twoHanded;
   const absorb=shieldGuard ? .82 : w.guard;
   state.hp-=dmg*(1-absorb);
   state.posture+=posture*(shieldGuard ? .72 : 1.08);
   const guardCost=shieldGuard?16:24*w.stamina;
   state.stamina=Math.max(0,state.stamina-guardCost);
   state.staminaRegenDelay=Math.max(state.staminaRegenDelay,.7);
   state.shake=.09;
   if(state.stamina<=0){
     state.exhausted=.9;state.stagger=.78;state.posture=Math.min(100,state.posture+24);
     flash('가드 붕괴',.38);
   }else flash(shieldGuard?'방패 가드':'무기 가드',.18);
 }else{state.hp-=dmg;state.posture+=posture;state.stagger=.34;state.shake=.23;hitStop(.035)}
 if(state.posture>=100){state.posture=32;state.stagger=.85;flash('자세 무너짐',.4)}
 if(state.hp<=0){state.hp=0;state.dead=true;flash('사망',1.2)}
}

function hitZone(){
 const toPlayer=flatDir(boss.position,player.position);
 const forward=new THREE.Vector3(Math.sin(boss.rotation.y),0,Math.cos(boss.rotation.y));
 const dot=forward.dot(toPlayer);
 if(dot>.5)return 'head';
 if(dot<-.42&&!state.tailBroken)return 'tail';
 return 'leg';
}
function hitBoss(base,posture=12){
 if(state.bossHp<=0)return;
 const zone=hitZone();let dmg=base,pd=posture;state.reaction=.16;state.reactionZone=zone;
 if(zone==='head'){dmg*=1.45;pd*=1.7;state.headHp-=base;if(!state.headBroken&&state.headHp<=0){state.headBroken=true;head.material=meat;flash('머리 갑각 파괴',.6);state.bossPosture+=32}}
 if(zone==='leg'){state.legHp-=base*.8;if(!state.legBroken&&state.legHp<=0){state.legBroken=true;flash('앞발 부위 파괴',.6);state.bossStagger=1.4;state.bossState='stagger'}}
 if(zone==='tail'){dmg*=1.2;state.tailHp-=base;if(!state.tailBroken&&state.tailHp<=0){state.tailBroken=true;tailPivot.visible=false;flash('꼬리 절단',.7);state.bossPosture+=24}}
 if(state.bossStagger>0){dmg*=1.75;pd*=1.8}
 state.bossHp=Math.max(0,state.bossHp-dmg);state.bossPosture+=pd;state.shake=zone==='head' ? .18 : .13;hitStop(zone==='head' ? .072 : .055);spawnSparks(player.position.clone().lerp(boss.position,.62).add(new THREE.Vector3(0,zone==='head' ? 2.15 : 1.15,0)),zone==='head' ? 14 : 8,zone==='head' ? 5.5 : 4.2);
 if(state.bossHp===0){state.bossState='dead';setDanger(false);flash('토벌 완료',1.2)}
 else if(state.bossPosture>=100){state.bossStagger=2.15;state.bossPosture=50;state.bossState='stagger';flash('자세 붕괴',.52)}
}

function chooseBossAttack(){
 if(state.bossHp<=0)return;
 const d=dist(),r=Math.random();
 setDanger(false);
 if(d>7){state.bossState='rush';state.bossTimer=1.05;state.bossHit=false;return}
 if(r<.16){state.bossState='claw1';state.bossTimer=.62;state.bossHit=false}
 else if(r<.28){state.bossState='bite';state.bossTimer=.82;state.bossHit=false}
 else if(r<.40){state.bossState='slam';state.bossTimer=1.05;state.bossHit=false}
 else if(r<.50&&!state.tailBroken){state.bossState='tail';state.bossTimer=.92;state.bossHit=false}
 else if(r<.58){state.bossState='peril';state.bossTimer=1.12;state.bossHit=false;setDanger(true)}
 else{
   const dorsal=['arm_cross','arm_double_slam','arm_sweep','arm_uppercut','arm_grab','arm_barrage','arm_guardbreak','arm_crush'];
   state.bossState=dorsal[Math.floor(Math.random()*dorsal.length)];
   state.bossTimer={
     arm_cross:1.16,arm_double_slam:1.34,arm_sweep:1.18,arm_uppercut:1.02,
     arm_grab:1.38,arm_barrage:1.78,arm_guardbreak:1.32,arm_crush:1.46
   }[state.bossState];
   state.bossHit=false;state.bossPatternStep=0;state.bossFxStamp='';
   if(state.bossState==='arm_grab'||state.bossState==='arm_crush')setDanger(true);
 }
}
function bossImpact(range,dmg,posture,unblockable=false){
 if(!state.bossHit&&dist()<range){
   state.bossHit=true;
   if(state.invuln>0){state.shake=Math.max(state.shake,.07);flash('회피',.16);return}
   hurtPlayer(dmg,posture,unblockable);
 }
}
function bossFxOnce(tag,fn){if(state.bossFxStamp===tag)return;state.bossFxStamp=tag;fn()}
function trailArms(intensity=1){for(const a of dorsalArms)spawnArmTrail(a,intensity)}

function animateBossTelegraph(dt){
 const st=state.bossState,t=state.bossTimer;
 const L=(o,k,v,s=10)=>o[k]=THREE.MathUtils.lerp(o[k],v,1-Math.exp(-dt*s));
 L(body.rotation,'x',0,7);L(body.rotation,'y',0,7);L(body.rotation,'z',0,7);
 L(chest.rotation,'x',0,7);L(chest.rotation,'y',0,7);L(chest.rotation,'z',0,7);
 L(head.rotation,'x',0,8);L(head.rotation,'y',0,8);L(head.rotation,'z',0,8);
 jaw.rotation.x=THREE.MathUtils.lerp(jaw.rotation.x,BOSS_REST.jawX,1-Math.exp(-dt*9));

 if(st==='rush'&&t>.58){
   L(body.rotation,'x',-.34,13);L(head.rotation,'x',-.72,14);body.position.y=THREE.MathUtils.lerp(body.position.y,1.42,1-Math.exp(-dt*10));
 }else if(st==='claw1'||st==='claw2'||st==='claw3'||st==='claw4'){
   const hit=st==='claw1'?.29:st==='claw2'?.23:st==='claw3'?.22:.29;
   const idx=st==='claw1'||st==='claw3'?0:2,side=idx===0?1:-1;
   if(t>hit){legs[idx].rotation.x=THREE.MathUtils.lerp(legs[idx].rotation.x,-1.55,1-Math.exp(-dt*15));L(body.rotation,'z',side*.18,12);L(head.rotation,'z',side*.12,12)}
 }else if(st==='bite'&&t>.34){
   head.position.z=THREE.MathUtils.lerp(head.position.z,1.42,1-Math.exp(-dt*13));L(head.rotation,'x',.42,14);jaw.rotation.x=THREE.MathUtils.lerp(jaw.rotation.x,.78,1-Math.exp(-dt*16));
 }else if(st==='slam'&&t>.38){
   body.position.y=THREE.MathUtils.lerp(body.position.y,2.72,1-Math.exp(-dt*9));L(body.rotation,'x',.28,10);L(head.rotation,'x',-.25,10);
 }else if(st==='tail'&&t>.47){
   L(body.rotation,'y',-.42,10);L(body.rotation,'z',-.14,10);tailPivot.rotation.y=THREE.MathUtils.lerp(tailPivot.rotation.y,-1.5,1-Math.exp(-dt*13));
 }else if(st==='peril'&&t>.44){
   body.position.y=THREE.MathUtils.lerp(body.position.y,1.28,1-Math.exp(-dt*12));L(body.rotation,'x',-.36,14);L(head.rotation,'x',-.82,14);
 }

 // Dorsal-arm attacks: every wind-up has a distinct silhouette.
 else if(st==='arm_cross'&&t>.48){
   // Both hands spread far outside the body, then scissor inward.
   dorsalArms[0].shoulder.rotation.y=THREE.MathUtils.lerp(dorsalArms[0].shoulder.rotation.y,-.72,1-Math.exp(-dt*12));
   dorsalArms[1].shoulder.rotation.y=THREE.MathUtils.lerp(dorsalArms[1].shoulder.rotation.y,.72,1-Math.exp(-dt*12));
   dorsalArms[0].upperPivot.rotation.z=THREE.MathUtils.lerp(dorsalArms[0].upperPivot.rotation.z,-1.05,1-Math.exp(-dt*14));
   dorsalArms[1].upperPivot.rotation.z=THREE.MathUtils.lerp(dorsalArms[1].upperPivot.rotation.z,1.05,1-Math.exp(-dt*14));
   L(body.rotation,'x',-.18,10);L(chest.rotation,'x',-.2,10);L(head.rotation,'x',.1,9);
 }else if(st==='arm_double_slam'&&t>.46){
   // Both arms visibly tower over the shell.
   for(const a of dorsalArms){a.shoulder.rotation.x=THREE.MathUtils.lerp(a.shoulder.rotation.x,-1.42,1-Math.exp(-dt*11));a.upperPivot.rotation.x=THREE.MathUtils.lerp(a.upperPivot.rotation.x,-1.68,1-Math.exp(-dt*11));a.elbow.rotation.x=THREE.MathUtils.lerp(a.elbow.rotation.x,-.48,1-Math.exp(-dt*11))}
   body.position.y=THREE.MathUtils.lerp(body.position.y,2.5,1-Math.exp(-dt*8));L(chest.rotation,'x',.3,9);L(head.rotation,'x',-.14,9);
 }else if(st==='arm_sweep'&&t>.5){
   // Left arm coils behind the body; right arm extends as a counterweight.
   L(body.rotation,'y',-.62,11);
   dorsalArms[0].shoulder.rotation.y=THREE.MathUtils.lerp(dorsalArms[0].shoulder.rotation.y,-1.55,1-Math.exp(-dt*13));
   dorsalArms[0].upperPivot.rotation.z=THREE.MathUtils.lerp(dorsalArms[0].upperPivot.rotation.z,-.5,1-Math.exp(-dt*13));
   dorsalArms[1].shoulder.rotation.y=THREE.MathUtils.lerp(dorsalArms[1].shoulder.rotation.y,-.2,1-Math.exp(-dt*10));
   L(chest.rotation,'z',-.28,11);L(head.rotation,'z',.16,10);
 }else if(st==='arm_uppercut'&&t>.36){
   // Right fist disappears low beside the rib cage before exploding upward.
   const a=dorsalArms[1];a.shoulder.rotation.z=THREE.MathUtils.lerp(a.shoulder.rotation.z,-1.55,1-Math.exp(-dt*14));a.elbow.rotation.z=THREE.MathUtils.lerp(a.elbow.rotation.z,-1.6,1-Math.exp(-dt*14));a.wrist.rotation.x=THREE.MathUtils.lerp(a.wrist.rotation.x,.55,1-Math.exp(-dt*14));L(body.rotation,'z',-.24,10);L(chest.rotation,'z',-.34,11);L(head.rotation,'z',.2,10);
 }else if(st==='arm_grab'&&t>.4){
   // One giant open hand hangs high and forward; red flesh glows as the tell.
   const a=dorsalArms[0];a.shoulder.rotation.x=THREE.MathUtils.lerp(a.shoulder.rotation.x,-.72,1-Math.exp(-dt*10));a.shoulder.rotation.y=THREE.MathUtils.lerp(a.shoulder.rotation.y,-1.48,1-Math.exp(-dt*10));a.elbow.rotation.z=THREE.MathUtils.lerp(a.elbow.rotation.z,1.55,1-Math.exp(-dt*10));a.wrist.rotation.y=THREE.MathUtils.lerp(a.wrist.rotation.y,-.7,1-Math.exp(-dt*10));L(body.rotation,'y',.22,9);L(chest.rotation,'y',.22,9);L(head.rotation,'y',-.18,9);
 }else if(st==='arm_barrage'&&t>1.32){
   // Clear boxing stance before the six alternating strikes.
   dorsalArms[0].upperPivot.rotation.z=THREE.MathUtils.lerp(dorsalArms[0].upperPivot.rotation.z,.88,1-Math.exp(-dt*13));
   dorsalArms[1].upperPivot.rotation.z=THREE.MathUtils.lerp(dorsalArms[1].upperPivot.rotation.z,-.88,1-Math.exp(-dt*13));
   dorsalArms[0].elbow.rotation.z=.72;dorsalArms[1].elbow.rotation.z=-.72;L(body.rotation,'x',-.14,10);L(chest.rotation,'x',-.18,10);
 }else if(st==='arm_guardbreak'&&t>.38){
   // Hands lock together above the back for a single posture-breaking hammer blow.
   for(const a of dorsalArms){a.shoulder.rotation.x=THREE.MathUtils.lerp(a.shoulder.rotation.x,-1.5,1-Math.exp(-dt*10));a.shoulder.rotation.y=THREE.MathUtils.lerp(a.shoulder.rotation.y,-a.sx*.35,1-Math.exp(-dt*10));a.elbow.rotation.x=THREE.MathUtils.lerp(a.elbow.rotation.x,-1.05,1-Math.exp(-dt*10))}
   L(body.rotation,'x',.28,9);L(chest.rotation,'x',.38,9);L(head.rotation,'x',-.18,9);
 }else if(st==='arm_crush'&&t>.42){
   // Arms open like gates on both sides, making the incoming clamp obvious.
   dorsalArms[0].shoulder.rotation.y=THREE.MathUtils.lerp(dorsalArms[0].shoulder.rotation.y,-1.72,1-Math.exp(-dt*10));
   dorsalArms[1].shoulder.rotation.y=THREE.MathUtils.lerp(dorsalArms[1].shoulder.rotation.y,1.72,1-Math.exp(-dt*10));
   dorsalArms[0].elbow.rotation.z=1.15;dorsalArms[1].elbow.rotation.z=-1.15;L(body.rotation,'x',-.22,10);L(chest.rotation,'x',-.26,10);L(head.rotation,'x',.12,9);
 }
}
function updateBoss(dt){
 if(state.bossHp<=0)setBossVisualAction('dead');
 else if(state.bossState==='idle')setBossVisualAction(dist()>4.2?'walk':'idle');
 else if(state.bossStagger>0)setBossVisualAction('idle');
 else setBossVisualAction('attack');
 animateBossTelegraph(dt);updateBossWarningGlow();animateGiantessPresence(dt);
 if(state.reaction>0){
   state.reaction=Math.max(0,state.reaction-dt);
   const k=Math.sin((state.reaction/.16)*Math.PI);
   if(state.reactionZone==='head'){head.rotation.z=k*.2;head.position.y=BOSS_REST.headY-k*.13}
   if(state.reactionZone==='leg'){body.rotation.z=k*.08;body.position.y=BOSS_REST.bodyY-k*.09}
   if(state.reactionZone==='tail'&&!state.tailBroken){tailPivot.rotation.x=k*.24}
 }else{
   head.rotation.z=THREE.MathUtils.lerp(head.rotation.z,0,dt*14);head.position.y=THREE.MathUtils.lerp(head.position.y,BOSS_REST.headY,dt*14);
   body.rotation.z=THREE.MathUtils.lerp(body.rotation.z,0,dt*14);body.position.y=THREE.MathUtils.lerp(body.position.y,BOSS_REST.bodyY,dt*14);
   if(!state.tailBroken)tailPivot.rotation.x=THREE.MathUtils.lerp(tailPivot.rotation.x,0,dt*14);
 }
 if(!['slam','peril','rush','arm_double_slam'].includes(state.bossState))body.position.y=THREE.MathUtils.lerp(body.position.y,BOSS_REST.bodyY,1-Math.exp(-dt*10));
 if(state.bossHp<=0){boss.rotation.z=THREE.MathUtils.lerp(boss.rotation.z,-1.15,dt*2);return}
 if(state.bossStagger>0){
   setDanger(false);state.bossStagger-=dt;boss.rotation.z=Math.sin(state.time*20)*.045;
   if(state.bossStagger<=0){state.bossState='idle';state.bossTimer=.65;boss.rotation.z=0}
   return;
 }
 const d=dist(),dir=flatDir(boss.position,player.position),face=Math.atan2(dir.x,dir.z);
 boss.rotation.y=THREE.MathUtils.lerp(boss.rotation.y,face,dt*(state.bossState==='tail'?2.2:5));
 if(state.bossState==='idle'){
   state.bossTimer-=dt;
   if(d>4.2)boss.position.addScaledVector(dir,dt*(state.legBroken?1.45:2.05));else if(d<2.8)boss.position.addScaledVector(dir,-dt*.55);
   head.rotation.x=Math.sin(state.time*2.2)*.05;tailPivot.rotation.y=Math.sin(state.time*2.8)*.24;resetDorsalArms(Math.min(1,dt*8));dorsalArms[0].shoulder.rotation.z+=Math.sin(state.time*1.8)*.035;dorsalArms[1].shoulder.rotation.z-=Math.sin(state.time*1.8)*.035;
   if(state.bossTimer<=0)chooseBossAttack();return;
 }
 state.bossTimer-=dt;
 if(state.bossState==='rush'){
   if(state.bossTimer>.25)boss.position.addScaledVector(dir,dt*(state.legBroken?5.2:7.4));
   head.rotation.x=-.35;
   if(state.bossTimer<.58)bossImpact(3.25,27,34,false);
   if(state.bossTimer<=0){head.rotation.x=0;state.bossState='idle';state.bossTimer=.55}
 }else if(state.bossState==='claw1'){
   const p=1-state.bossTimer/.62;legs[0].rotation.x=-Math.sin(p*Math.PI)*1.15;
   if(state.bossTimer<.29)bossImpact(3.45,16,21,false);
   if(state.bossTimer<=0){state.bossState='claw2';state.bossTimer=.46;state.bossHit=false}
 }else if(state.bossState==='claw2'){
   const p=1-state.bossTimer/.46;legs[2].rotation.x=-Math.sin(p*Math.PI)*1.2;
   if(state.bossTimer<.23)bossImpact(3.55,17,22,false);
   if(state.bossTimer<=0){state.bossState='claw3';state.bossTimer=.43;state.bossHit=false}
 }else if(state.bossState==='claw3'){
   const p=1-state.bossTimer/.43;legs[0].rotation.z=.55-Math.sin(p*Math.PI)*1.15;body.rotation.z=Math.sin(p*Math.PI)*-.12;
   if(state.bossTimer<.22)bossImpact(3.7,19,24,false);
   if(state.bossTimer<=0){state.bossState='claw4';state.bossTimer=.58;state.bossHit=false}
 }else if(state.bossState==='claw4'){
   const p=1-state.bossTimer/.58;legs[2].rotation.z=-.55+Math.sin(p*Math.PI)*1.3;body.rotation.z=Math.sin(p*Math.PI)*.15;
   if(state.bossTimer<.29)bossImpact(3.9,25,34,false);
   if(state.bossTimer<=0){legs[0].rotation.z=legs[2].rotation.z=0;body.rotation.z=0;state.bossState='idle';state.bossTimer=.72}
 }else if(state.bossState==='bite'){
   const p=1-state.bossTimer/.82;
   head.position.z=BOSS_REST.headZ+Math.sin(p*Math.PI)*.82;jaw.rotation.x=BOSS_REST.jawX+Math.sin(p*Math.PI)*.62;
   if(state.bossTimer<.34)bossImpact(3.35,28,37,false);
   if(state.bossTimer<=0){head.position.z=BOSS_REST.headZ;jaw.rotation.x=BOSS_REST.jawX;state.bossState='idle';state.bossTimer=.62}
 }else if(state.bossState==='slam'){
   const wind=state.bossTimer>.38;body.position.y=THREE.MathUtils.lerp(body.position.y,wind?2.48:1.28,dt*(wind?5:18));
   if(state.bossTimer<.32){bossFxOnce('body-slam',()=>{spawnDustBurst(bossGroundPoint(1.6),1.45);state.shake=Math.max(state.shake,.2)});bossImpact(4.0,34,43,false);}
   if(state.bossTimer<=0){body.position.y=BOSS_REST.bodyY;state.bossState='idle';state.bossTimer=.85}
 }else if(state.bossState==='tail'){
   const p=1-state.bossTimer/.92;tailPivot.rotation.y=-1.1+Math.sin(clamp(p,0,1)*Math.PI)*2.7;
   if(state.bossTimer<.47)bossImpact(4.65,25,31,false);
   if(state.bossTimer<=0){tailPivot.rotation.y=0;state.bossState='idle';state.bossTimer=.62}
 }else if(state.bossState==='arm_cross'){
   if(state.bossTimer<=.48){
     const p=clamp(1-state.bossTimer/.48,0,1),e=Math.sin(p*Math.PI*.9);
     dorsalArms[0].shoulder.rotation.y=-.72+p*.9;dorsalArms[1].shoulder.rotation.y=.72-p*.9;
     dorsalArms[0].upperPivot.rotation.z=-1.05+e*2.75;dorsalArms[1].upperPivot.rotation.z=1.05-e*2.75;
     dorsalArms[0].elbow.rotation.z=e*1.0;dorsalArms[1].elbow.rotation.z=-e*1.0;
     trailArms(1.05);
     if(state.bossTimer<.28)bossImpact(4.1,24,30,false);
   }
   if(state.bossTimer<=0){resetDorsalArms(1);state.bossState='idle';state.bossTimer=.72}
 }else if(state.bossState==='arm_double_slam'){
   if(state.bossTimer<=.46){
     const p=clamp(1-state.bossTimer/.46,0,1),e=Math.sin(p*Math.PI*.72);
     for(const a of dorsalArms){a.shoulder.rotation.x=-1.42+e*2.0;a.upperPivot.rotation.x=-1.68+e*2.25;a.elbow.rotation.x=-.48+e*.75}
     trailArms(1.2);
     if(state.bossTimer<.3){
       bossFxOnce('double-slam',()=>{spawnDustBurst(bossGroundPoint(2.0),1.75);state.shake=Math.max(state.shake,.24)});
       bossImpact(4.4,36,48,false);
     }
   }
   if(state.bossTimer<=0){resetDorsalArms(1);state.bossState='idle';state.bossTimer=.96}
 }else if(state.bossState==='arm_sweep'){
   if(state.bossTimer<=.5){
     const p=clamp(1-state.bossTimer/.5,0,1),e=Math.sin(p*Math.PI*.9);
     dorsalArms[0].shoulder.rotation.y=-1.55+e*3.0;
     dorsalArms[0].upperPivot.rotation.z=-.5+e*1.15;
     dorsalArms[0].elbow.rotation.z=e*.5;
     dorsalArms[1].shoulder.rotation.y=-.2+e*.7;
     spawnArmTrail(dorsalArms[0],1.25);
     if(state.bossTimer<.3)bossImpact(5.0,28,36,false);
   }
   if(state.bossTimer<=0){resetDorsalArms(1);state.bossState='idle';state.bossTimer=.78}
 }else if(state.bossState==='arm_uppercut'){
   if(state.bossTimer<=.36){
     const p=clamp(1-state.bossTimer/.36,0,1),e=Math.sin(p*Math.PI*.86);
     const a=dorsalArms[1];a.shoulder.rotation.z=-1.55+e*2.7;a.elbow.rotation.z=-1.6+e*2.35;a.wrist.rotation.x=.55-e*.85;
     body.rotation.z=-.24+e*.34;spawnArmTrail(a,1.3);
     if(state.bossTimer<.22)bossImpact(3.7,30,42,false);
   }
   if(state.bossTimer<=0){resetDorsalArms(1);body.rotation.z=0;state.bossState='idle';state.bossTimer=.72}
 }else if(state.bossState==='arm_grab'){
   if(state.bossTimer<=.4){
     const p=clamp(1-state.bossTimer/.4,0,1),e=Math.sin(p*Math.PI*.82);
     const a=dorsalArms[0];a.shoulder.rotation.x=-.72+e*.92;a.shoulder.rotation.y=-1.48+e*1.5;a.elbow.rotation.z=1.55-e*1.2;a.wrist.rotation.y=-.7+e*.85;
     spawnArmTrail(a,1.15);
     if(state.bossTimer<.24)bossImpact(3.25,42,58,true);
   }
   if(state.bossTimer<=0){setDanger(false);resetDorsalArms(1);state.bossState='idle';state.bossTimer=1.0}
 }else if(state.bossState==='arm_barrage'){
   if(state.bossTimer<=1.32){
     const active=clamp((1.32-state.bossTimer)/1.06,0,.999),phase=Math.floor(active*6),local=(active*6)-phase,s=Math.sin(local*Math.PI);
     const idx=phase%2,a=dorsalArms[idx],sign=idx?-1:1;
     a.upperPivot.rotation.z=sign*(.72+s*1.25);a.elbow.rotation.z=sign*(.58+s*.78);a.shoulder.rotation.y=sign*s*.42;
     spawnArmTrail(a,1.0);
     if(phase!==state.bossPatternStep){state.bossPatternStep=phase;state.bossHit=false;state.bossFxStamp=''}
     if(s>.74){
       bossFxOnce('barrage-'+phase,()=>spawnDustBurst(bossGroundPoint(1.45),.55));
       bossImpact(3.8,14,18,false);
     }
   }
   if(state.bossTimer<=0){resetDorsalArms(1);state.bossState='idle';state.bossTimer=.86}
 }else if(state.bossState==='arm_guardbreak'){
   if(state.bossTimer<=.38){
     const p=clamp(1-state.bossTimer/.38,0,1),e=Math.sin(p*Math.PI*.72);
     for(const a of dorsalArms){a.shoulder.rotation.x=-1.5+e*2.05;a.upperPivot.rotation.x=-.65+e*.9;a.elbow.rotation.x=-1.05+e*1.3}
     trailArms(1.35);
     if(state.bossTimer<.24){
       bossFxOnce('guardbreak',()=>{spawnDustBurst(bossGroundPoint(1.7),1.35);state.shake=Math.max(state.shake,.2)});
       bossImpact(4.0,22,72,false);
     }
   }
   if(state.bossTimer<=0){resetDorsalArms(1);state.bossState='idle';state.bossTimer=1.0}
 }else if(state.bossState==='arm_crush'){
   if(state.bossTimer<=.42){
     const p=clamp(1-state.bossTimer/.42,0,1),e=Math.sin(p*Math.PI*.86);
     dorsalArms[0].shoulder.rotation.y=-1.72+e*1.85;dorsalArms[1].shoulder.rotation.y=1.72-e*1.85;
     dorsalArms[0].elbow.rotation.z=1.15-e*.72;dorsalArms[1].elbow.rotation.z=-1.15+e*.72;
     trailArms(1.2);
     if(state.bossTimer<.25){
       bossFxOnce('crush',()=>spawnDustBurst(bossGroundPoint(1.25),.9));
       bossImpact(3.3,46,64,true);
     }
   }
   if(state.bossTimer<=0){setDanger(false);resetDorsalArms(1);state.bossState='idle';state.bossTimer=1.08}
 }else if(state.bossState==='peril'){
   // red perilous pounce: cannot be guarded/deflected; lateral roll is the intended answer.
   head.rotation.x=-.55;body.rotation.x=.12;
   if(state.bossTimer<.44){bossFxOnce('peril-launch',()=>spawnDustBurst(bossGroundPoint(-.8),.85));boss.position.addScaledVector(dir,dt*10.5);bossImpact(3.25,43,60,true)}
   if(state.bossTimer<=0){setDanger(false);head.rotation.x=0;body.rotation.x=0;state.bossState='idle';state.bossTimer=1.0}
 }
}

function applyWeaponAttackPose(w,step,p){
 const s=Math.sin(clamp(p,0,1)*Math.PI),m=w.motion;
 if(w.id==='straight'){
   if(step===1){weaponPivot.rotation.set(-1.05+s*2.2,0,-.34+s*.72);player.rotation.z=-s*.1}
   if(step===2){weaponPivot.rotation.set(.9-s*2.4,0,.42-s*.86);player.rotation.z=s*.12}
   if(step===3){weaponPivot.rotation.set(-1.35+s*2.85,s*.25,0);player.rotation.x=-s*.07}
 }else if(w.id==='greatsword'){
   if(step===1){weaponPivot.rotation.set(-1.5+s*2.75,-.28+s*.25,-.55+s*.9);playerBody.rotation.z=-s*.18}
   if(step===2){weaponPivot.rotation.set(1.15-s*2.9,.35-s*.4,.55-s*1.0);playerBody.rotation.z=s*.2}
   if(step===3){weaponPivot.rotation.set(-1.8+s*3.45,0,s*.22);player.rotation.x=-s*.12}
 }else if(w.id==='hammer'){
   weaponPivot.rotation.y=0;
   if(step===1){weaponPivot.rotation.x=-1.85+s*3.15;weaponPivot.rotation.z=-.22+s*.3;playerBody.rotation.x=-s*.12}
   if(step===2){weaponPivot.rotation.x=-1.4+s*2.8;weaponPivot.rotation.y=-.5+s*1.0;player.rotation.z=s*.14}
   if(step===3){weaponPivot.rotation.x=-2.1+s*3.8;playerBody.rotation.x=-s*.18}
 }else if(w.id==='spear'){
   const thrust=Math.sin(clamp(p,0,1)*Math.PI);
   weaponPivot.rotation.set(-.08,-.05,.05);weaponPivot.position.z=-thrust*(step===3?1.05:.72);playerBody.rotation.x=-thrust*.08;
 }else if(w.id==='katana'){
   if(step===1){weaponPivot.rotation.set(-.85+s*2.55,-.4+s*.55,-.58+s*.95);player.rotation.z=-s*.09}
   if(step===2){weaponPivot.rotation.set(.7-s*2.65,.35-s*.65,.55-s*1.1);player.rotation.z=s*.11}
   if(step===3){weaponPivot.rotation.set(-1.2+s*3.2,-.25+s*.5,0);player.rotation.x=-s*.09}
 }else{
   if(step===1){weaponPivot.rotation.set(-1.35+s*2.75,-.15,-.48+s*.82);playerBody.rotation.z=-s*.15}
   if(step===2){weaponPivot.rotation.set(.95-s*2.55,.3,.5-s*.9);playerBody.rotation.z=s*.16}
   if(step===3){weaponPivot.rotation.set(-1.65+s*3.25,0,.18*s);player.rotation.x=-s*.1}
 }
 weaponPivot.scale.setScalar((twoHanded?1.06:1)*(1+(m-1)*.03));
}
function updatePlayer(dt){
 if(state.dead){setPlayerVisualAction('dead');if(playerMixer)playerMixer.update(dt);return;}
 const axes=getMoveAxes(),moving=axes.x!==0||axes.z!==0,sprinting=input.keys.has('ShiftLeft')||input.keys.has('ShiftRight');
 let anim='idle';
 if(state.rolling>0)anim='roll';
 else if(state.attack>0)anim='attack';
 else if(input.guard)anim='guard';
 else if(moving)anim=sprinting?'run':'walk';
 setPlayerVisualAction(anim);
 state.exhausted=Math.max(0,state.exhausted-dt);
 state.staminaRegenDelay=Math.max(0,state.staminaRegenDelay-dt);
 const sprintingNow=(input.keys.has('ShiftLeft')||input.keys.has('ShiftRight'))&&moving&&state.attack<=0&&state.rolling<=0&&state.stagger<=0;
 if(sprintingNow){
   if(!drainStamina(18,dt,.22))flash('스태미나 고갈',.22);
 }else if(state.staminaRegenDelay<=0&&!input.guard&&state.attack<=0&&state.rolling<=0&&state.exhausted<=0){
   const regenRate=state.stamina<30?24:32;
   state.stamina=Math.min(state.staminaMax,state.stamina+dt*regenRate);
 }
 state.posture=Math.max(0,state.posture-dt*(input.guard?5:14));
 state.bossPosture=Math.max(0,state.bossPosture-dt*(state.bossState==='idle'?4.5:1.3));
 state.invuln=Math.max(0,state.invuln-dt);state.deflect=Math.max(0,state.deflect-dt);state.parryAnim=Math.max(0,state.parryAnim-dt);state.stagger=Math.max(0,state.stagger-dt);state.comboGrace=Math.max(0,state.comboGrace-dt);
 state.guardBlend=THREE.MathUtils.lerp(state.guardBlend,input.guard?1:0,1-Math.exp(-dt*18));
 if(state.attack>0){
   const w=currentWeapon(),gripDamage=twoHanded?1.16:1,gripPosture=twoHanded?1.2:1;
   const dur=[0,.46,.5,.62][state.attackStep]/w.speed*(twoHanded ? .96 : 1.04),step=state.attackStep;
   state.attack-=dt;const p=1-state.attack/dur;
   applyWeaponAttackPose(w,step,p);
   const hitAt=[0,.23,.25,.31][step]/w.speed,range=[0,3.15,3.25,3.45][step]*w.reach,damage=[0,22,25,36][step]*w.damage*gripDamage,post=[0,11,13,20][step]*w.posture*gripPosture;
   if(!state.attackHit&&state.attack<hitAt&&dist()<range){
     state.attackHit=true;
     hitBoss(damage,post);
     hitStop(.018*w.hitstop+(step===3 ? .018 : 0));
   }
   if(state.attack<=0){
     weaponPivot.rotation.set(0,0,0);weaponPivot.position.z=0;player.rotation.x=0;player.rotation.z=0;playerBody.rotation.set(0,0,0);
     if(state.attackQueued&&step<3)startAttack(step+1);else if(!state.attackQueued&&state.comboGrace<=0)state.attackStep=0;
   }
 }
 const toBoss=flatDir(player.position,boss.position);
 if(input.lock&&!state.rolling)player.rotation.y=THREE.MathUtils.lerp(player.rotation.y,Math.atan2(toBoss.x,toBoss.z),dt*12);
 if(state.rolling>0){
   const total=.5,p=1-state.rolling/total;
   state.rolling-=dt;
   const speed=10.2-(p*3.2);
   player.position.addScaledVector(state.rollDir,dt*speed);
   const rollArc=Math.sin(clamp(p,0,1)*Math.PI);
   player.rotation.x=-rollArc*.42;
   player.rotation.z=Math.sin(clamp(p,0,1)*Math.PI*2)*.07;
   if(state.rolling<=0){player.rotation.x=0;player.rotation.z=0}
   return;
 }
 if(state.stagger>0||state.attack>.18)return;
 const {x,z}=getMoveAxes();
 if(x||z){
   const right=new THREE.Vector3(-toBoss.z,0,toBoss.x),move=new THREE.Vector3();
   if(input.lock)move.addScaledVector(toBoss,z).addScaledVector(right,x).normalize();
   else{const basis=getCameraBasis();move.addScaledVector(basis.f,z).addScaledVector(basis.r,x).normalize();}
   const sprint=(input.keys.has('ShiftLeft')||input.keys.has('ShiftRight'))&&state.stamina>0&&state.exhausted<=0;player.position.addScaledVector(move,dt*(sprint?5.2:3.15));
   if(!input.lock)player.rotation.y=THREE.MathUtils.lerp(player.rotation.y,Math.atan2(move.x,move.z),dt*10);
 }
 if(player.position.length()>18.8)player.position.setLength(18.8);

 // Clear, readable guard/parry pose.
 if(state.attack<=0&&state.rolling<=0){
   if(state.parryAnim>0){
     const p=state.parryAnim/.28;
     swordPivot.rotation.x=THREE.MathUtils.lerp(swordPivot.rotation.x,-.55,1-Math.exp(-dt*30));
     swordPivot.rotation.y=THREE.MathUtils.lerp(swordPivot.rotation.y,-1.0+Math.sin((1-p)*Math.PI)*.7,1-Math.exp(-dt*30));
     swordPivot.rotation.z=THREE.MathUtils.lerp(swordPivot.rotation.z,.95,1-Math.exp(-dt*30));
     playerBody.rotation.z=THREE.MathUtils.lerp(playerBody.rotation.z,-.12,1-Math.exp(-dt*24));
   }else if(state.guardBlend>.01){
     if(twoHanded){
       weaponPivot.rotation.x=THREE.MathUtils.lerp(weaponPivot.rotation.x,-.42,1-Math.exp(-dt*20));
       weaponPivot.rotation.y=THREE.MathUtils.lerp(weaponPivot.rotation.y,-.72,1-Math.exp(-dt*20));
       weaponPivot.rotation.z=THREE.MathUtils.lerp(weaponPivot.rotation.z,.78,1-Math.exp(-dt*20));
       shieldPivot.rotation.y=THREE.MathUtils.lerp(shieldPivot.rotation.y,0,1-Math.exp(-dt*20));
     }else{
       weaponPivot.rotation.x=THREE.MathUtils.lerp(weaponPivot.rotation.x,-.18,1-Math.exp(-dt*20));
       weaponPivot.rotation.y=THREE.MathUtils.lerp(weaponPivot.rotation.y,-.15,1-Math.exp(-dt*20));
       weaponPivot.rotation.z=THREE.MathUtils.lerp(weaponPivot.rotation.z,.22,1-Math.exp(-dt*20));
       shieldPivot.rotation.x=THREE.MathUtils.lerp(shieldPivot.rotation.x,-.08,1-Math.exp(-dt*24));
       shieldPivot.rotation.y=THREE.MathUtils.lerp(shieldPivot.rotation.y,-1.0,1-Math.exp(-dt*24));
       shieldPivot.position.z=THREE.MathUtils.lerp(shieldPivot.position.z,.38,1-Math.exp(-dt*24));
     }
     playerBody.rotation.x=THREE.MathUtils.lerp(playerBody.rotation.x,-.09*state.guardBlend,1-Math.exp(-dt*18));
     playerBody.rotation.z=THREE.MathUtils.lerp(playerBody.rotation.z,-.06*state.guardBlend,1-Math.exp(-dt*18));
   }else{
     swordPivot.rotation.x=THREE.MathUtils.lerp(swordPivot.rotation.x,0,1-Math.exp(-dt*16));
     swordPivot.rotation.y=THREE.MathUtils.lerp(swordPivot.rotation.y,0,1-Math.exp(-dt*16));
     swordPivot.rotation.z=THREE.MathUtils.lerp(swordPivot.rotation.z,0,1-Math.exp(-dt*16));
     playerBody.rotation.x=THREE.MathUtils.lerp(playerBody.rotation.x,0,1-Math.exp(-dt*16));
     playerBody.rotation.z=THREE.MathUtils.lerp(playerBody.rotation.z,0,1-Math.exp(-dt*16));
     shieldPivot.rotation.x=THREE.MathUtils.lerp(shieldPivot.rotation.x,0,1-Math.exp(-dt*16));
     shieldPivot.rotation.y=THREE.MathUtils.lerp(shieldPivot.rotation.y,0,1-Math.exp(-dt*16));
     shieldPivot.position.z=THREE.MathUtils.lerp(shieldPivot.position.z,.05,1-Math.exp(-dt*16));
   }
 }
}

const camPos=new THREE.Vector3();
function updateCamera(dt){
 const armAttack=state.bossState.startsWith('arm_');
 const target=player.position.clone().add(new THREE.Vector3(0,1.45,0));
 const toBoss=flatDir(player.position,boss.position);
 const back=input.lock?toBoss.clone().multiplyScalar(-1):new THREE.Vector3(0,0,1);
 const distance=armAttack?9.15:8.05,height=armAttack?4.35:3.8;
 camPos.copy(target).addScaledVector(back,distance).add(new THREE.Vector3(0,height,0));
 camera.position.lerp(camPos,1-Math.exp(-dt*(armAttack?6.2:7.2)));
 const bossLookY=armAttack?4.15:3.65;
 const look=input.lock?target.clone().lerp(boss.position.clone().add(new THREE.Vector3(0,bossLookY,0)),armAttack?.5:.44):target;
 const wantedFov=armAttack?65:61;
 if(Math.abs(camera.fov-wantedFov)>.02){camera.fov=THREE.MathUtils.lerp(camera.fov,wantedFov,1-Math.exp(-dt*7));camera.updateProjectionMatrix()}
 if(state.shake>0){state.shake=Math.max(0,state.shake-dt);camera.position.x+=(Math.random()-.5)*state.shake;camera.position.y+=(Math.random()-.5)*state.shake}
 camera.lookAt(look);
}
function partText(v,broken,label){return broken?label:(v<45?'손상':'정상')}
function updateUI(){
 ui.hp.style.width=clamp(state.hp,0,100)+'%';if(ui.stamina){ui.stamina.style.width=(clamp(state.stamina,0,state.staminaMax)/state.staminaMax*100)+'%';ui.stamina.parentElement.classList.toggle('exhausted',state.exhausted>0)}ui.posture.style.width=clamp(state.posture,0,100)+'%';ui.bossHp.style.width=(state.bossHp/560*100)+'%';ui.bossPosture.style.width=clamp(state.bossPosture,0,100)+'%';
 ui.head.textContent=partText(state.headHp,state.headBroken,'파괴');ui.leg.textContent=partText(state.legHp,state.legBroken,'파괴');ui.tail.textContent=partText(state.tailHp,state.tailBroken,'절단');if(ui.weapon)ui.weapon.textContent=`${weaponIndex+1}. ${currentWeapon().name} · ${twoHanded?'양손/무기 가드':'한손/방패 가드'}`;
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
function loop(){
 let dt=Math.min(clock.getDelta(),.033);state.time+=dt;
 if(state.hitstop>0){state.hitstop-=dt;dt=0}else{updatePlayer(dt);updateBoss(dt)}
if(playerMixer)playerMixer.update(Math.max(dt,.001));updateArmTrails(Math.max(dt,.001));updateDustFX(Math.max(dt,.001));updateSparks(Math.max(dt,.001));updateCamera(Math.max(dt,.001));updateUI();renderer.render(scene,camera);requestAnimationFrame(loop);
}
loop();