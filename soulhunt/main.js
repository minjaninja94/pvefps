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

const weaponHandAnchor=new THREE.Group();player.add(weaponHandAnchor);
const weaponPivot=new THREE.Group();weaponHandAnchor.add(weaponPivot);
const shieldHandAnchor=new THREE.Group();player.add(shieldHandAnchor);
const shieldPivot=new THREE.Group();shieldHandAnchor.add(shieldPivot);
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
const WEAPON_GRIPS={
 straight:{pos:[.02,-.015,.015],rot:[-.08,.02,.08],scale:1},
 greatsword:{pos:[.015,-.02,.02],rot:[-.12,.02,.06],scale:1.02},
 hammer:{pos:[.015,-.025,.025],rot:[-.16,.03,.04],scale:1.02},
 spear:{pos:[.015,-.018,.018],rot:[-.04,.03,.05],scale:1},
 katana:{pos:[.018,-.012,.018],rot:[-.1,.05,.1],scale:1},
 axe:{pos:[.015,-.02,.02],rot:[-.14,.03,.05],scale:1.01}
};
function currentWeapon(){return WEAPONS[weaponIndex]}
function applyWeaponGrip(){
 const g=WEAPON_GRIPS[currentWeapon().id]||WEAPON_GRIPS.straight;
 weaponHandAnchor.position.set(...g.pos);
 weaponHandAnchor.rotation.set(...g.rot);
 weaponHandAnchor.scale.setScalar(g.scale||1);
 weaponPivot.position.set(0,0,0);weaponPivot.rotation.set(0,0,0);
 shieldHandAnchor.position.set(-.01,-.01,.015);
 shieldHandAnchor.rotation.set(-.04,0,-.06);
}
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
 applyWeaponGrip();
 weaponPivot.scale.setScalar(twoHanded?1.06:1);
 shieldPivot.visible=!twoHanded;
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

let knightVisual=null,playerVrm=null,playerVrmRoot=null;
const playerVrmBones={},playerVrmRest={};
function cachePlayerVrmBone(name,node){
 if(!node)return;
 playerVrmBones[name]=node;
 playerVrmRest[name]={rotation:node.rotation.clone(),position:node.position.clone(),scale:node.scale.clone()};
}
function setPlayerVrmBone(name,rx=0,ry=0,rz=0,speed=12,dt=.016){
 const b=playerVrmBones[name],base=playerVrmRest[name];
 if(!b||!base)return;
 b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,base.rotation.x+rx,1-Math.exp(-dt*speed));
 b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,base.rotation.y+ry,1-Math.exp(-dt*speed));
 b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,base.rotation.z+rz,1-Math.exp(-dt*speed));
}

// Do not show the squat primitive/KayKit body while the real player asset streams in.
player.children.filter(o=>o.isMesh).forEach(m=>m.visible=false);

(async()=>{
 try{
   const {VRMLoaderPlugin,VRMUtils}=await import('@pixiv/three-vrm');
   const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));
   loader.load('./assets/models/player/vroid-male.vrm',gltf=>{
     const vrm=gltf.userData?.vrm||null;
     if(vrm)VRMUtils.rotateVRM0(vrm);
     const root=vrm?.scene||gltf.scene;
     root.updateMatrixWorld(true);
     let box=new THREE.Box3().setFromObject(root,true),size=new THREE.Vector3();box.getSize(size);
     const targetHeight=1.98;
     const uniform=targetHeight/Math.max(size.y,.001);
     root.scale.set(uniform*.94,uniform*1.035,uniform*.94); // tall/slender ~8-head game silhouette
     root.updateMatrixWorld(true);
     box=new THREE.Box3().setFromObject(root,true);
     root.position.y-=box.min.y;
     root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});

     knightVisual=root;playerVrmRoot=root;playerVrm=vrm;
     player.add(root);

     const humanoid=vrm?.humanoid;
     for(const name of ['hips','spine','chest','upperChest','neck','head',
       'leftShoulder','rightShoulder','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand',
       'leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot']){
       const node=humanoid?.getNormalizedBoneNode?.(name);
       if(node)cachePlayerVrmBone(name,node);
     }

     const rightHand=playerVrmBones.rightHand,leftHand=playerVrmBones.leftHand;
     if(rightHand)rightHand.add(weaponHandAnchor);
     if(leftHand)leftHand.add(shieldHandAnchor);
     applyWeaponGrip();
     console.info('Tall CC0 VRoid male player loaded', {height:targetHeight,weaponHand:!!rightHand,shieldHand:!!leftHand});
   },undefined,err=>console.warn('Tall VRoid player unavailable.',err));
 }catch(err){console.warn('three-vrm unavailable for player.',err)}
})();

function animateVroidPlayer(dt){
 if(!playerVrmRoot)return;
 const {x,z}=getMoveAxes(),moving=!!(x||z);
 const sprint=(input.keys.has('ShiftLeft')||input.keys.has('ShiftRight'))&&moving&&state.stamina>0&&state.exhausted<=0;
 const speed=sprint?10.5:6.8,phase=state.time*speed;
 let hipsX=0,hipsY=0,hipsZ=0,spineX=0,spineY=0,spineZ=0;
 let lsz=-.08,rsz=.08,luz=-1.42,ruz=1.42,lux=.04,rux=.04,luy=0,ruy=0,llx=.28,rlx=.28;
 let lulx=0,rulx=0,lllx=0,rllx=0;

 if(state.dead){
   spineZ=.8;hipsZ=.35;luz=-.55;ruz=.55;
 }else if(state.stagger>0){
   spineX=-.18;spineZ=Math.sin(state.time*24)*.08;hipsX=.08;
 }else if(state.rolling>0){
   spineX=-.5;luz=-.65;ruz=.65;llx=-.9;rlx=-.9;
 }else if(state.attack>0){
   const w=currentWeapon(),dur=[0,.46,.5,.62][state.attackStep]/w.speed*(twoHanded?.96:1.04);
   const p=clamp(1-state.attack/Math.max(dur,.001),0,1),s=Math.sin(p*Math.PI),step=state.attackStep;
   const side=step===2?-1:1;
   if(w.id==='straight'){
     spineY=side*s*.24;spineZ=-side*s*.07;spineX=-s*.06;
     rux=-.34+s*.92;ruy=side*s*.48;ruz=.42+side*s*.52;rlx=-.62+s*.58;
     if(twoHanded){lux=-.18+s*.58;luy=side*s*.32;luz=-.28-side*s*.24;llx=-.58+s*.42}
   }else if(w.id==='greatsword'){
     spineX=.18-s*.42;spineY=side*s*.2;
     rux=-1.0+s*1.9;ruz=.18+side*s*.6;ruy=side*s*.28;rlx=-1.05+s*.62;
     lux=-.92+s*1.72;luz=-.18-side*s*.52;luy=side*s*.22;llx=-.98+s*.58;
   }else if(w.id==='hammer'){
     spineX=.3-s*.55;spineY=side*s*.12;
     rux=-1.28+s*2.15;ruz=.28+side*s*.3;rlx=-1.2+s*.5;
     lux=-1.18+s*1.98;luz=-.3-side*s*.28;llx=-1.12+s*.48;
   }else if(w.id==='spear'){
     const thrust=Math.sin(p*Math.PI);
     spineX=-thrust*.13;spineY=side*.08;
     rux=-.15+thrust*.38;ruy=-.12;ruz=.12;rlx=-.38+thrust*.25;
     lux=-.22+thrust*.28;luy=.08;luz=-.18;llx=-.42+thrust*.2;
   }else if(w.id==='katana'){
     spineY=side*s*.34;spineZ=-side*s*.1;
     rux=-.5+s*1.18;ruy=side*s*.7;ruz=.2+side*s*.58;rlx=-.82+s*.72;
     lux=-.3+s*.55;luy=side*s*.38;luz=-.34-side*s*.22;llx=-.72+s*.5;
   }else{
     spineY=side*s*.3;spineX=.08-s*.28;spineZ=-side*s*.08;
     rux=-.78+s*1.55;ruy=side*s*.52;ruz=.36+side*s*.45;rlx=-.88+s*.62;
     if(twoHanded){lux=-.68+s*1.32;luy=side*s*.36;luz=-.28-side*s*.34;llx=-.84+s*.54}
   }
 }else if(input.guard){
   const w=currentWeapon();spineX=-.055;
   if(!twoHanded){
     // Shield leads; weapon hand stays ready beside the body.
     lux=-.62;luy=-.42;luz=-.25;llx=-.92;
     rux=-.28;ruy=.08;ruz=.54;rlx=-.5;
   }else if(w.id==='spear'){
     lux=-.28;luy=.12;luz=-.2;llx=-.35;
     rux=-.18;ruy=-.12;ruz=.18;rlx=-.36;spineY=.08;
   }else if(w.id==='greatsword'||w.id==='hammer'){
     lux=-.72;luy=.18;luz=-.32;llx=-.82;
     rux=-.78;ruy=-.18;ruz=.32;rlx=-.86;spineX=-.1;
   }else{
     lux=-.5;luy=.18;luz=-.32;llx=-.7;
     rux=-.46;ruy=-.16;ruz=.34;rlx=-.72;
   }
 }else if(moving){
   const amp=sprint?.62:.42,swing=Math.sin(phase)*amp;
   lulx=swing;rulx=-swing;
   lllx=Math.max(0,-Math.sin(phase))*(sprint?.78:.5);
   rllx=Math.max(0,Math.sin(phase))*(sprint?.78:.5);
   lux=-swing*.52;rux=swing*.52;
   luz=-1.42;ruz=1.42;llx=.28;rlx=.28;
   hipsY=Math.sin(phase*2)*.025;spineZ=-Math.sin(phase)*.025;
 }else{
   const breathe=Math.sin(state.time*1.6);
   spineX=breathe*.012;spineY=Math.sin(state.time*.45)*.01;
   luz=-1.42+breathe*.008;ruz=1.42-breathe*.008;llx=.28;rlx=.28;
 }

 setPlayerVrmBone('hips',hipsX,hipsY,hipsZ,11,dt);
 setPlayerVrmBone('spine',spineX*.45,spineY*.45,spineZ*.45,11,dt);
 setPlayerVrmBone('chest',spineX*.72,spineY*.72,spineZ*.72,12,dt);
 setPlayerVrmBone('upperChest',spineX,spineY,spineZ,13,dt);
 setPlayerVrmBone('leftShoulder',0,0,lsz,12,dt);
 setPlayerVrmBone('rightShoulder',0,0,rsz,12,dt);
 setPlayerVrmBone('leftUpperArm',lux,luy,luz,14,dt);
 setPlayerVrmBone('rightUpperArm',rux,ruy,ruz,14,dt);
 setPlayerVrmBone('leftLowerArm',llx,0,0,14,dt);
 setPlayerVrmBone('rightLowerArm',rlx,0,0,14,dt);
 setPlayerVrmBone('leftUpperLeg',lulx,0,0,14,dt);
 setPlayerVrmBone('rightUpperLeg',rulx,0,0,14,dt);
 setPlayerVrmBone('leftLowerLeg',lllx,0,0,14,dt);
 setPlayerVrmBone('rightLowerLeg',rllx,0,0,14,dt);
 playerVrm?.update?.(dt);
}

// Legacy clip helper kept for fallback assets; the VRoid player is bone-animated procedurally.
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
   attack:['swordslash','punch','melee_attack','attack_slice','attack_chop','attack'],
   guard:['shoot_onehanded','block','blocking','guard'],
   roll:['roll','dodge'],
   hit:['recievehit','receivehit','hit','damage'],
   dead:['death','defeat','dead']
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
head.visible=false;
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
const proceduralBeast=[body,belly,backShell,waistShell,...legs,tailPivot];
proceduralWoman.forEach(o=>o.visible=false);
proceduralBeast.forEach(o=>o.visible=false);
const womanTorsoClipLow=new THREE.Plane(new THREE.Vector3(0,-1,0),2.58);
const womanTorsoClipHigh=new THREE.Plane(new THREE.Vector3(0,1,0),-5.45);
let animeHeadVisual=null,animeHeadPivot=null,animeBossVRM=null,animeHeadReady=false;

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
function setBonePositionOffset(name,x=0,y=0,z=0,speed=10,dt=.016){
 const b=bossWomanBones[name],base=bossWomanRest[name];
 if(!b||!base)return;
 b.position.x=THREE.MathUtils.lerp(b.position.x,base.position.x+x,1-Math.exp(-dt*speed));
 b.position.y=THREE.MathUtils.lerp(b.position.y,base.position.y+y,1-Math.exp(-dt*speed));
 b.position.z=THREE.MathUtils.lerp(b.position.z,base.position.z+z,1-Math.exp(-dt*speed));
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

// MPFB torso retired: Bellamore now uses a single anime VRM upper body.


const animeBossBones={},animeBossBoneRest={};
function cacheAnimeBossBone(name,node){
 if(!node)return;
 animeBossBones[name]=node;
 animeBossBoneRest[name]={rotation:node.rotation.clone(),scale:node.scale.clone(),position:node.position.clone()};
}
function setAnimeBossBone(name,rx=0,ry=0,rz=0,speed=10,dt=.016){
 const b=animeBossBones[name],base=animeBossBoneRest[name];
 if(!b||!base)return;
 b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,base.rotation.x+rx,1-Math.exp(-dt*speed));
 b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,base.rotation.y+ry,1-Math.exp(-dt*speed));
 b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,base.rotation.z+rz,1-Math.exp(-dt*speed));
}

async function loadAnimeBossUpper(){
 try{
   const {VRMLoaderPlugin,VRMUtils}=await import('@pixiv/three-vrm');
   const loader=new GLTFLoader();
   loader.register(parser=>new VRMLoaderPlugin(parser));
   loader.load('./assets/models/boss/anime-head.vrm',gltf=>{
     const vrm=gltf.userData?.vrm||null;
     if(vrm)VRMUtils.rotateVRM0(vrm);
     const root=vrm?.scene||gltf.scene;
     const bodyNode=root.getObjectByName('Body');
     const face=root.getObjectByName('Face');
     const hair=root.getObjectByName('Hair001');
     for(const obj of [bodyNode,face,hair]){
       if(!obj)continue;
       obj.visible=true;
       obj.traverse(o=>{
         if(!o.isMesh)return;
         o.castShadow=true;o.receiveShadow=true;
         if(Array.isArray(o.material)){
           o.material=o.material.map(m=>{const n=m.clone();return n});
         }else if(o.material){
           o.material=o.material.clone();
         }
       });
     }

     // Normalize the full anime body, then anchor the hips at the beast/woman seam.
     root.updateMatrixWorld(true);
     const fullBox=new THREE.Box3().setFromObject(root,true);
     const fullSize=new THREE.Vector3();fullBox.getSize(fullSize);
     const fullHeight=6.15;
     root.scale.multiplyScalar(fullHeight/Math.max(fullSize.y,.001));
     root.updateMatrixWorld(true);

     const hips=vrm?.humanoid?.getNormalizedBoneNode?.('hips')||root.getObjectByName('J_Bip_C_Hips');
     const hipPos=new THREE.Vector3();
     if(hips){hips.getWorldPosition(hipPos);root.position.sub(hipPos)}

     animeHeadPivot=new THREE.Group();
     animeHeadPivot.position.set(0,2.72,.62);
     animeHeadPivot.add(root);
     boss.add(animeHeadPivot);
     animeHeadVisual=root;animeBossVRM=vrm;animeHeadReady=true;

     const humanoid=vrm?.humanoid;
     const boneMap={
       hips:'hips',spine:'spine',chest:'chest',upperChest:'upperChest',neck:'neck',head:'head',
       leftShoulder:'leftShoulder',rightShoulder:'rightShoulder',
       leftUpperArm:'leftUpperArm',rightUpperArm:'rightUpperArm',
       leftLowerArm:'leftLowerArm',rightLowerArm:'rightLowerArm',
       leftHand:'leftHand',rightHand:'rightHand',
       leftUpperLeg:'leftUpperLeg',rightUpperLeg:'rightUpperLeg',
       leftLowerLeg:'leftLowerLeg',rightLowerLeg:'rightLowerLeg',
       leftFoot:'leftFoot',rightFoot:'rightFoot'
     };
     for(const [key,hName] of Object.entries(boneMap)){
       const node=humanoid?.getNormalizedBoneNode?.(hName);
       if(node)cacheAnimeBossBone(key,node);
     }
     setTimeout(tryBuildBossMonsterArms,0);

     // Centaur construction: keep the entire authored upper body visible, collapse only the human legs.
     for(const name of ['J_Bip_L_UpperLeg','J_Bip_R_UpperLeg']){
       const b=root.getObjectByName(name);
       if(b)b.scale.set(.001,.001,.001);
     }

     // Slightly lengthen the actual skinned arms so the visible silhouette matches the wider attack rig.
     for(const name of ['J_Bip_L_UpperArm','J_Bip_R_UpperArm']){
       const b=root.getObjectByName(name);if(b)b.scale.multiplyScalar(1.16);
     }
     for(const name of ['J_Bip_L_LowerArm','J_Bip_R_LowerArm']){
       const b=root.getObjectByName(name);if(b)b.scale.multiplyScalar(1.12);
     }

     // Oversize the authored VRoid bust bones instead of overlaying transparent/procedural breasts.
     for(const [name,side] of [['J_Sec_L_Bust1',-1],['J_Sec_R_Bust1',1]]){
       const b=root.getObjectByName(name);
       if(b){
         b.scale.multiply(new THREE.Vector3(1.65,1.42,1.82));
         b.position.x+=side*.018;
         b.position.z+=.032;
       }
     }
     for(const name of ['J_Sec_L_Bust2','J_Sec_R_Bust2']){
       const b=root.getObjectByName(name);if(b)b.scale.multiplyScalar(1.45);
     }

     console.info('Bellamore: full anime centaur upper body loaded');
   },undefined,err=>console.warn('Anime upper body failed to load.',err));
 }catch(err){console.warn('three-vrm unavailable for boss upper body.',err)}
}
loadAnimeBossUpper();

let bossLowerVisual=null,bossLowerMixer=null,bossLowerActions={},bossLowerAction='';
function setBossLowerAction(name,fade=.18){
 if(!bossLowerMixer||!bossLowerActions[name]||bossLowerAction===name)return;
 const prev=bossLowerActions[bossLowerAction],next=bossLowerActions[name];
 next.reset().play();
 if(prev&&prev!==next)prev.crossFadeTo(next,fade,false);
 bossLowerAction=name;
}
assetLoader.load('./assets/models/boss/centaur-beast.glb',gltf=>{
 bossLowerVisual=gltf.scene;
 bossLowerVisual.name='BellamoreBeastLowerBody';
 bossLowerVisual.updateMatrixWorld(true);
 let box=new THREE.Box3().setFromObject(bossLowerVisual,true),size=new THREE.Vector3();box.getSize(size);
 const horizontal=Math.max(size.x,size.z,.001);
 bossLowerVisual.scale.setScalar(4.75/horizontal);
 bossLowerVisual.rotation.y=0;
 bossLowerVisual.updateMatrixWorld(true);
 box=new THREE.Box3().setFromObject(bossLowerVisual,true);
 bossLowerVisual.position.y-=box.min.y;
 bossLowerVisual.position.y-=.18;
 bossLowerVisual.position.z=-.82;
 const neck=bossLowerVisual.getObjectByName('Neck1');
 if(neck)neck.scale.setScalar(.001); // removes horse head/neck while preserving torso and legs
 bossLowerVisual.traverse(o=>{
   if(o.isMesh){
     o.castShadow=true;o.receiveShadow=true;
     const mats=Array.isArray(o.material)?o.material:[o.material];
     for(const m of mats){
       if(!m||!m.color)continue;
       m.color.multiplyScalar(.42);
       m.roughness=Math.max(m.roughness??.7,.64);
       m.metalness=Math.min(m.metalness??0,.16);
     }
   }
 });
 boss.add(bossLowerVisual);
 if(gltf.animations?.length){
   bossLowerMixer=new THREE.AnimationMixer(bossLowerVisual);
   for(const clip of gltf.animations){
     const key=(clip.name||'').toLowerCase();
     bossLowerActions[key]=bossLowerMixer.clipAction(clip);
   }
   setBossLowerAction('idle',0);
 }
 console.info('Bellamore: CC0 centaur beast lower body loaded');
},undefined,err=>console.warn('Centaur beast lower body unavailable.',err));

let monsterSpikeSource=null;
const bossMonsterArms=[];
function cloneMonsterSpikeVisual(){
 if(!monsterSpikeSource)return null;
 const root=monsterSpikeSource.clone(true);
 root.traverse(o=>{
   if(!o.isMesh)return;
   o.castShadow=true;o.receiveShadow=true;
   if(o.material){
     o.material=o.material.clone();
     if(o.material.color)o.material.color.setHex(0x24222b);
     o.material.transparent=false;o.material.opacity=1;o.material.depthWrite=true;o.material.depthTest=true;o.material.alphaTest=0;
     o.material.roughness=.72;o.material.metalness=.18;
   }
 });
 return root;
}
function orientSegment(group,a,b,thickness=1){
 const dir=new THREE.Vector3().subVectors(b,a),len=Math.max(.001,dir.length());
 group.position.copy(a).add(b).multiplyScalar(.5);
 group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
 group.scale.set(thickness,len,thickness);
}
function makeMonsterFleshSegment(radiusTop=.36,radiusBottom=.28){
 const g=new THREE.Group();
 const fleshMat=new THREE.MeshStandardMaterial({color:0xd6a096,roughness:.62,metalness:.01,transparent:false,opacity:1,depthWrite:true});
 const core=new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,1,10,1,false),fleshMat);
 core.castShadow=core.receiveShadow=true;g.add(core);
 const jointMat=new THREE.MeshStandardMaterial({color:0x7b4a49,roughness:.7,metalness:.02,transparent:false,opacity:1,depthWrite:true});
 for(const y of [-.43,.43]){
   const joint=new THREE.Mesh(new THREE.TorusGeometry((radiusTop+radiusBottom)*.46,.055,6,12),jointMat);
   joint.rotation.x=Math.PI/2;joint.position.y=y;joint.castShadow=joint.receiveShadow=true;g.add(joint);
 }
 return g;
}
function makeMonsterHand(sx){
 const g=new THREE.Group();
 const palmMat=new THREE.MeshStandardMaterial({color:0xc98f88,roughness:.6,metalness:.01,transparent:false,opacity:1,depthWrite:true});
 const palm=new THREE.Mesh(new THREE.BoxGeometry(.72,.34,.58),palmMat);
 palm.castShadow=palm.receiveShadow=true;g.add(palm);
 const fingerMat=new THREE.MeshStandardMaterial({color:0xb87872,roughness:.64,metalness:.01,transparent:false,opacity:1,depthWrite:true});
 for(let i=0;i<4;i++){
   const finger=new THREE.Group();
   const seg1=new THREE.Mesh(new THREE.CylinderGeometry(.075,.095,.5,8),fingerMat);
   seg1.rotation.z=sx*Math.PI/2;seg1.position.x=sx*.3;seg1.castShadow=seg1.receiveShadow=true;finger.add(seg1);
   const claw=new THREE.Mesh(new THREE.ConeGeometry(.085,.42,7),horn);
   claw.rotation.z=sx*Math.PI/2;claw.position.x=sx*.62;claw.castShadow=claw.receiveShadow=true;finger.add(claw);
   finger.position.set(0,(i-1.5)*.1,(i-1.5)*.14);g.add(finger);
 }
 return g;
}

function tryBuildBossMonsterArms(){
 if(!monsterSpikeSource||bossMonsterArms.length||!animeBossBones.leftHand||!animeBossBones.rightHand||!dorsalArms?.length)return;
 for(const side of ['left','right']){
   const sx=side==='left'?-1:1;
   const root=new THREE.Group();
   const fleshA=makeMonsterFleshSegment(.36,.3);
   const fleshB=makeMonsterFleshSegment(.42,.34);
   const fleshC=makeMonsterFleshSegment(.48,.38);
   const armorA=new THREE.Group(),armorB=new THREE.Group(),armorC=new THREE.Group();
   const finalHand=makeMonsterHand(sx);
   boss.add(root);root.add(fleshA,fleshB,fleshC,armorA,armorB,armorC,finalHand);

   const armorGroups=[armorA,armorB,armorC];
   armorGroups.forEach((ag,gi)=>{
     for(let i=0;i<4;i++){
       const plate=cloneMonsterSpikeVisual();
       if(!plate)continue;
       plate.position.set((i%2?1:-1)*.22,(i-1.5)*.24,(gi-1)*.06);
       plate.scale.set(.3+.05*gi,.22+.04*gi,.3+.05*gi);
       plate.rotation.set((i%2?1:-1)*.22,i*.68,(i%2?1:-1)*.36);
       ag.add(plate);
     }
   });

   // Extra back-facing spikes make each segment read as a mutated arm, not a floating spike chain.
   for(const [ag,scale] of [[armorA,.34],[armorB,.4],[armorC,.46]]){
     for(let i=-1;i<=1;i++){
       const spike=cloneMonsterSpikeVisual();
       if(!spike)continue;
       spike.position.set(i*.18,.08,-.28);
       spike.scale.set(scale*.55,scale,scale*.55);
       spike.rotation.x=-.55;spike.rotation.z=i*.18;
       ag.add(spike);
     }
   }

   bossMonsterArms.push({
     side,sx,root,fleshA,fleshB,fleshC,armorA,armorB,armorC,finalHand,
     hand:animeBossBones[side+'Hand'],rig:dorsalArms[side==='left'?0:1]
   });
 }
 console.info('Bellamore: multi-segment flesh monster arms built');
}
function updateBossMonsterArmVisuals(){
 if(!bossMonsterArms.length)return;
 boss.updateMatrixWorld(true);
 for(const a of bossMonsterArms){
   const handW=new THREE.Vector3(),wristW=new THREE.Vector3();
   a.hand.getWorldPosition(handW);a.rig.wrist.getWorldPosition(wristW);
   const p0=boss.worldToLocal(handW.clone()),p3=boss.worldToLocal(wristW.clone());

   // Three articulated extension points: deliberately bent so it reads as a long mutated arm.
   const p1=p0.clone().lerp(p3,.28);
   const p2=p0.clone().lerp(p3,.63);
   p1.y+=.2;p1.x+=a.sx*.26;p1.z+=.12;
   p2.y+=.1;p2.x+=a.sx*.34;p2.z+=.18;

   orientSegment(a.fleshA,p0,p1,1.0);
   orientSegment(a.fleshB,p1,p2,1.08);
   orientSegment(a.fleshC,p2,p3,1.14);
   orientSegment(a.armorA,p0,p1,.95);
   orientSegment(a.armorB,p1,p2,1.0);
   orientSegment(a.armorC,p2,p3,1.06);

   a.finalHand.position.copy(p3);
   const dir=p3.clone().sub(p2).normalize();
   a.finalHand.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);

   const active=state?.bossState?.startsWith?.('arm_');
   const pulse=active?1.06+Math.sin(state.time*18)*.028:1;
   a.root.scale.setScalar(pulse);
 }
}

const bossSpikeTargets=[];
assetLoader.load('./assets/models/boss/monster-spikes.glb',gltf=>{
 const source=gltf.scene;
 monsterSpikeSource=source;
 const placements=[
   {p:[0,2.05,-2.05],r:[-.52,0,0],s:[1.15,1.5,1.05]},
   {p:[0,2.18,-1.28],r:[-.46,0,0],s:[1.0,1.3,.95]},
   {p:[-1.55,2.1,-.92],r:[-.32,.2,-.5],s:[.72,1.05,.72]},
   {p:[1.55,2.1,-.92],r:[-.32,-.2,.5],s:[.72,1.05,.72]},
   {p:[-1.72,1.72,-1.55],r:[-.15,.35,-.72],s:[.5,.82,.5]},
   {p:[1.72,1.72,-1.55],r:[-.15,-.35,.72],s:[.5,.82,.5]}
 ];
 placements.forEach((cfg,i)=>{
   const root=source.clone(true);
   root.position.set(...cfg.p);root.rotation.set(...cfg.r);root.scale.set(...cfg.s);
   root.traverse(o=>{
     if(o.isMesh){
       o.castShadow=true;o.receiveShadow=true;
       if(o.material){o.material=o.material.clone();o.material.color?.multiplyScalar?.(.38);o.material.roughness=.7}
     }
   });
   boss.add(root);
   bossSpikeTargets.push({obj:root,hp:i<2?90:65,max:i<2?90:65,broken:false});
 });
 tryBuildBossMonsterArms();
 console.info('Bellamore: external CC0 spike armor attached');
},undefined,err=>console.warn('Boss spike asset unavailable.',err));


// Her actual gigantic arms. Combat hit ranges stay unchanged; only the visual reach is oversized.
const dorsalArms=[];
for(const sx of [-1,1]){
  const shoulder=new THREE.Group();
  shoulder.position.set(sx*1.46,4.2,.72);
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
  elbow.position.set(sx*2.42,-.76,.16);
  upperPivot.add(elbow);
  part(elbow,new THREE.SphereGeometry(.34,10,8),skinShadow,[0,0,0]);
  part(elbow,new THREE.DodecahedronGeometry(.38,0),carapace,[0,.08,-.12],[0,0,0],[1.12,.7,1]);

  const fore=part(elbow,new THREE.CapsuleGeometry(.33,2.08,7,11),skin,[sx*.98,-.18,.06],[0,0,sx*.96],[1.14,1,1.08]);
  part(elbow,new THREE.BoxGeometry(1.3,.42,.62),warningFlesh,[sx*.9,-.12,-.12],[0,0,sx*.1]);

  const wrist=new THREE.Group();
  wrist.position.set(sx*2.34,-.6,.2);
  elbow.add(wrist);

  const hand=part(wrist,new THREE.SphereGeometry(.54,12,9),skin,[sx*.34,-.08,.12],[0,0,0],[1.25,.72,1.0]);
  const palm=part(wrist,new THREE.BoxGeometry(.86,.28,.66),skinShadow,[sx*.42,-.18,.14],[0,0,sx*.1]);

  // Monster talons sell the hybrid nature, but are visual only.
  for(let f=-1;f<=1;f++)part(wrist,new THREE.ConeGeometry(.095,.92,7),horn,[sx*.9,-.2,f*.23],[0,0,sx*Math.PI/2]);

  shoulder.traverse(o=>{if(o.isMesh)o.visible=false});
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

const input={keys:new Set(),guard:false,lock:true,camYaw:Math.PI,camPitch:.08,mouseSensitivity:.00225};
function requestFreeLook(){
 if(input.lock)return;
 try{if(document.pointerLockElement!==canvas)canvas.requestPointerLock?.()}catch(_){}
}
function setLockOn(v){
 input.lock=!!v;
 if(input.lock){
   if(document.pointerLockElement===canvas)document.exitPointerLock?.();
   flash('락온',.24);
 }else{
   input.camYaw=player.rotation.y;
   input.camPitch=clamp(input.camPitch,-.32,.48);
   requestFreeLook();
   flash('자유 시점',.24);
 }
}
addEventListener('keydown',e=>{
 input.keys.add(e.code);
 if(e.code==='KeyQ')setLockOn(!input.lock);
 if(e.code==='Space')tryRoll();
 if(/^Digit[1-6]$/.test(e.code))setWeapon(Number(e.code.slice(5))-1);
 if(e.code==='KeyT')toggleGrip();
});
addEventListener('keyup',e=>input.keys.delete(e.code));
addEventListener('mousemove',e=>{
 if(input.lock||document.pointerLockElement!==canvas)return;
 input.camYaw-=e.movementX*input.mouseSensitivity;
 input.camPitch=clamp(input.camPitch-e.movementY*input.mouseSensitivity*.86,-.32,.48);
});
document.addEventListener('pointerlockchange',()=>{
 document.body.classList.toggle('pointer-free',document.pointerLockElement===canvas&&!input.lock);
});
canvas.addEventListener('click',()=>{if(!input.lock)requestFreeLook()});
addEventListener('mousedown',e=>{
 if(e.button===0){if(!input.lock)requestFreeLook();tryAttack()}
 if(e.button===2){input.guard=true;tryDeflect()}
});
addEventListener('mouseup',e=>{if(e.button===2)input.guard=false});
addEventListener('contextmenu',e=>e.preventDefault());

const ui={hp:document.querySelector('#hp'),stamina:document.querySelector('#stamina'),posture:document.querySelector('#posture'),bossHp:document.querySelector('#bossHp'),bossPosture:document.querySelector('#bossPosture'),msg:document.querySelector('#message'),danger:document.querySelector('#danger'),head:document.querySelector('#headPart'),leg:document.querySelector('#legPart'),spike:document.querySelector('#spikePart'),tail:document.querySelector('#tailPart'),weapon:document.querySelector('#weaponHud'),lockDot:document.querySelector('#lockDot')};
const state={
 hp:100,posture:0,stamina:100,staminaMax:100,staminaRegenDelay:0,exhausted:0,attack:0,attackHit:false,attackStep:0,attackQueued:false,comboGrace:0,rolling:0,rollDir:new THREE.Vector3(),invuln:0,deflect:0,parryAnim:0,guardBlend:0,stagger:0,dead:false,
 bossHp:560,bossPosture:0,bossState:'idle',bossTimer:1.0,bossHit:false,bossStagger:0,bossPatternStep:0,bossFxStamp:'',time:0,shake:0,hitstop:0,
 headHp:100,legHp:150,tailHp:130,tailBroken:false,legBroken:false,headBroken:false,danger:false,reaction:0,reactionZone:'body'
};
function flash(t,d=.35){ui.msg.textContent=t;ui.msg.style.opacity='1';clearTimeout(flash.t);flash.t=setTimeout(()=>ui.msg.style.opacity='0',d*1000)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function lerpAngle(current,target,alpha){
 const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
 return current+delta*alpha;
}
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
 const st=state.bossState,t=state.bossTimer;
 const dangerous=st==='arm_grab'||st==='arm_crush'||st==='peril';

 if(animeHeadPivot){
   let torsoX=0,torsoY=0,torsoZ=0,headX=0,headY=0,headZ=0;
   let lsz=-.1,rsz=.1,lz=-1.46,rz=1.46,lx=.04,rx=.04,ly=0,ry=0,llx=.28,rlx=.28,lly=0,rly=0;

   if(st==='idle'){
     torsoX=Math.sin(state.time*1.4)*.014;torsoZ=Math.sin(state.time*.72)*.018;
     headY=Math.sin(state.time*.52)*.05;headX=Math.sin(state.time*.8)*.018;
     lz+=Math.sin(state.time*1.25)*.018;rz-=Math.sin(state.time*1.25)*.018;
     llx=.28;rlx=.28;
   }else if(st==='arm_cross'){
     torsoX=-.12;headX=.06;
     if(t>.48){lz=-.18;rz=.18;ly=-.55;ry=.55;llx=-.32;rlx=-.32}
     else{const s=Math.sin(clamp((.48-t)/.38,0,1)*Math.PI);lz=-.18-s*1.5;rz=.18+s*1.5;ly=-.55+s*1.35;ry=.55-s*1.35;torsoX=-.12+s*.25}
   }else if(st==='arm_double_slam'||st==='arm_guardbreak'){
     torsoX=.28;headX=-.14;
     if(t>.42){lz=.72;rz=-.72;llx=-.55;rlx=-.55}
     else{const s=Math.sin(clamp((.42-t)/.34,0,1)*Math.PI);lz=.72-s*2.35;rz=-.72+s*2.35;llx=-.55+s*.7;rlx=-.55+s*.7;torsoX=.28-s*.48}
   }else if(st==='arm_sweep'){
     torsoZ=-.3;headZ=.16;
     if(t>.5){lz=-.08;ly=-1.22;llx=-.18}
     else{const s=Math.sin(clamp((.5-t)/.42,0,1)*Math.PI);lz=-.08-s*.9;ly=-1.22+s*2.65;torsoZ=-.3+s*.62}
   }else if(st==='arm_uppercut'){
     torsoZ=-.3;headZ=.18;
     if(t>.36){rz=1.42;ry=-.82;rlx=-1.05}
     else{const s=Math.sin(clamp((.36-t)/.3,0,1)*Math.PI);rz=1.42-s*2.2;ry=-.82+s*1.15;rlx=-1.05+s*1.45;torsoZ=-.3+s*.5}
   }else if(st==='arm_grab'){
     torsoY=.18;headY=-.18;
     if(t>.4){lz=-.22;ly=-1.08;llx=-.52}
     else{const s=Math.sin(clamp((.4-t)/.32,0,1)*Math.PI);lz=-.22-s*.55;ly=-1.08+s*.72;llx=-.52+s*.7}
   }else if(st==='arm_barrage'){
     torsoX=-.1;
     const phase=Math.floor(clamp((1.42-t)/1.1,0,.999)*6),pulse=Math.sin((clamp((1.42-t)/1.1,0,.999)*6-phase)*Math.PI);
     if(phase%2===0){lz=-.42-pulse*.82;ly=-pulse*.72;llx=-.65+pulse*.65}
     else{rz=.42+pulse*.82;ry=pulse*.72;rlx=-.65+pulse*.65}
     torsoZ=(phase%2?1:-1)*pulse*.08;
   }else if(st==='arm_crush'){
     torsoX=-.2;headX=.08;
     if(t>.42){lz=-.06;rz=.06;ly=-1.18;ry=1.18;llx=-.28;rlx=-.28}
     else{const s=Math.sin(clamp((.42-t)/.34,0,1)*Math.PI);ly=-1.18+s*1.22;ry=1.18-s*1.22;lz=-.06-s*.72;rz=.06+s*.72;torsoX=-.2+s*.32}
   }

   setAnimeBossBone('spine',torsoX*.35,torsoY*.35,torsoZ*.35,9,dt);
   setAnimeBossBone('chest',torsoX*.65,torsoY*.65,torsoZ*.65,10,dt);
   setAnimeBossBone('upperChest',torsoX,torsoY,torsoZ,11,dt);
   setAnimeBossBone('neck',headX*.35,headY*.4,headZ*.35,10,dt);
   setAnimeBossBone('head',headX,headY,headZ,11,dt);
   setAnimeBossBone('leftShoulder',0,0,lsz,11,dt);
   setAnimeBossBone('rightShoulder',0,0,rsz,11,dt);
   setAnimeBossBone('leftUpperArm',lx,ly,lz,13,dt);
   setAnimeBossBone('rightUpperArm',rx,ry,rz,13,dt);
   setAnimeBossBone('leftLowerArm',llx,lly,0,14,dt);
   setAnimeBossBone('rightLowerArm',rlx,rly,0,14,dt);

   const em=animeBossVRM?.expressionManager;
   if(em){
     try{
       em.setValue('happy',st==='idle'?.18:0);
       em.setValue('surprised',dangerous?.42:0);
       em.setValue('angry',dangerous?.22:(st==='arm_barrage'?.12:0));
     }catch(_){}
   }
   animeBossVRM?.update?.(dt);
 }

 if(bossLowerMixer){
   if(state.bossHp<=0){
     setBossLowerAction('idle',.08);
     bossLowerMixer.timeScale=0;
   }else{
     bossLowerMixer.timeScale=1;
     const desired=state.bossStagger>0?'idle_hitreact1':(state.bossState==='idle'&&dist()>4.15?'walk':'idle');
     setBossLowerAction(desired);
     bossLowerMixer.update(dt);
   }
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
 const f=new THREE.Vector3();
 if(!input.lock){
   f.set(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));
 }else{
   camera.getWorldDirection(f);f.y=0;
 }
 if(!f.lengthSq())f.set(0,0,-1);f.normalize();
 const r=new THREE.Vector3(f.z,0,-f.x).normalize();
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
   const forward=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));
   const strafe=new THREE.Vector3(forward.z,0,-forward.x);
   state.rollDir.addScaledVector(forward,z).addScaledVector(strafe,x);
 }
 // Neutral dodge is a backstep away from the locked target / camera facing.
 if(!state.rollDir.lengthSq()){
   if(input.lock)state.rollDir.copy(toBoss).multiplyScalar(-1);
   else state.rollDir.set(-Math.sin(player.rotation.y),0,-Math.cos(player.rotation.y));
 }
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
 let spikeTarget=null,spikeDist=Infinity;
 const playerHitPoint=player.position.clone().add(new THREE.Vector3(0,1.15,0));
 for(const s of bossSpikeTargets){
   if(s.broken)continue;
   const p=new THREE.Vector3();s.obj.getWorldPosition(p);
   const d=p.distanceTo(playerHitPoint);
   if(d<spikeDist){spikeDist=d;spikeTarget=s}
 }
 const zone=(spikeTarget&&spikeDist<2.25)?'spike':hitZone();
 let dmg=base,pd=posture;state.reaction=.16;state.reactionZone=zone;
 if(zone==='spike'){
   dmg*=1.12;pd*=2.15;spikeTarget.hp-=base;
   state.bossPosture+=posture*.45;
   if(spikeTarget.hp<=0&&!spikeTarget.broken){spikeTarget.broken=true;spikeTarget.obj.visible=false;flash('가시 갑각 파괴',.5);state.bossPosture+=18}
 }
 if(zone==='head'){dmg*=1.45;pd*=1.7;state.headHp-=base;if(!state.headBroken&&state.headHp<=0){state.headBroken=true;head.material=meat;flash('머리 갑각 파괴',.6);state.bossPosture+=32}}
 if(zone==='leg'){state.legHp-=base*.8;if(!state.legBroken&&state.legHp<=0){state.legBroken=true;flash('앞발 부위 파괴',.6);state.bossStagger=1.4;state.bossState='stagger'}}
 if(zone==='tail'){dmg*=1.2;state.tailHp-=base;if(!state.tailBroken&&state.tailHp<=0){state.tailBroken=true;tailPivot.visible=false;flash('꼬리 절단',.7);state.bossPosture+=24}}
 if(state.bossStagger>0){dmg*=1.75;pd*=1.8}
 state.bossHp=Math.max(0,state.bossHp-dmg);state.bossPosture+=pd;state.shake=zone==='head'||zone==='spike' ? .18 : .13;hitStop(zone==='head'||zone==='spike' ? .072 : .055);spawnSparks(player.position.clone().lerp(boss.position,.62).add(new THREE.Vector3(0,zone==='head' ? 2.15 : 1.15,0)),zone==='head' ? 14 : 8,zone==='head' ? 5.5 : 4.2);
 if(state.bossHp===0){state.bossState='dead';setDanger(false);flash('토벌 완료',1.2)}
 else if(state.bossPosture>=100){state.bossStagger=2.15;state.bossPosture=50;state.bossState='stagger';flash('자세 붕괴',.52)}
}

function chooseBossAttack(){
 if(state.bossHp<=0)return;
 setDanger(false);
 const dorsal=['arm_cross','arm_double_slam','arm_sweep','arm_uppercut','arm_grab','arm_barrage','arm_guardbreak','arm_crush'];
 state.bossState=dorsal[Math.floor(Math.random()*dorsal.length)];
 state.bossTimer={
   arm_cross:1.26,arm_double_slam:1.46,arm_sweep:1.32,arm_uppercut:1.16,
   arm_grab:1.5,arm_barrage:1.92,arm_guardbreak:1.46,arm_crush:1.58
 }[state.bossState];
 state.bossHit=false;state.bossPatternStep=0;state.bossFxStamp='';
 if(state.bossState==='arm_grab'||state.bossState==='arm_crush')setDanger(true);
}
function inBossHitWindow(t,from,to){return t<=from&&t>=to}
function bossImpact(range,dmg,posture,unblockable=false){
 if(!state.bossHit&&dist()<range){
   state.bossHit=true;
   if(state.invuln>0){state.shake=Math.max(state.shake,.07);flash('회피',.16);return}
   hurtPlayer(dmg,posture,unblockable);
 }
}
function pointSegmentDistance(p,a,b){
 const ab=new THREE.Vector3().subVectors(b,a),ap=new THREE.Vector3().subVectors(p,a);
 const den=ab.lengthSq();
 const t=den>1e-6?clamp(ap.dot(ab)/den,0,1):0;
 const q=a.clone().addScaledVector(ab,t);
 return p.distanceTo(q);
}
const BOSS_ACTIVE_VOLUME={
 arm_cross:{range:4.9,dot:-.05},arm_double_slam:{range:4.55,dot:.05},
 arm_sweep:{range:5.45,dot:-.72},arm_uppercut:{range:4.05,dot:.18},
 arm_grab:{range:3.85,dot:.28},arm_barrage:{range:4.25,dot:.05},
 arm_guardbreak:{range:4.5,dot:.08},arm_crush:{range:4.2,dot:-.08}
};
function bossArmImpact(indices,radius,dmg,posture,unblockable=false){
 if(state.bossHit)return;
 const ids=Array.isArray(indices)?indices:[indices];
 const pp=player.position.clone();pp.y+=1.0;
 let touched=false;
 for(const i of ids){
   const elbow=new THREE.Vector3(),wrist=new THREE.Vector3();
   dorsalArms[i].elbow.getWorldPosition(elbow);
   dorsalArms[i].wrist.getWorldPosition(wrist);
   if(pointSegmentDistance(pp,elbow,wrist)<=radius||wrist.distanceTo(pp)<=radius*1.12){touched=true;break}
 }
 // Fallback volume exists only during the already-short active frame. It prevents a stationary
 // player from being mysteriously safe when the visual anime arm and invisible rig diverge slightly.
 if(!touched){
   const cfg=BOSS_ACTIVE_VOLUME[state.bossState];
   if(cfg){
     const toP=flatDir(boss.position,player.position);
     const forward=new THREE.Vector3(Math.sin(boss.rotation.y),0,Math.cos(boss.rotation.y));
     touched=dist()<=cfg.range&&forward.dot(toP)>=cfg.dot;
   }
 }
 if(!touched)return;
 state.bossHit=true;
 if(state.invuln>0){state.shake=Math.max(state.shake,.07);flash('회피',.16);return}
 hurtPlayer(dmg,posture,unblockable);
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
const BOSS_AIM_CUTOFF={
 arm_cross:.36,arm_double_slam:.38,arm_sweep:.4,arm_uppercut:.31,
 arm_grab:.34,arm_barrage:1.42,arm_guardbreak:.34,arm_crush:.36
};
const BOSS_AIM_RANGE={
 arm_cross:4.15,arm_double_slam:3.85,arm_sweep:4.55,arm_uppercut:3.65,
 arm_grab:3.45,arm_barrage:3.85,arm_guardbreak:3.8,arm_crush:3.6
};
function updateBoss(dt){
 if(state.bossHp<=0)setBossVisualAction('dead');
 else if(state.bossState==='idle')setBossVisualAction(dist()>4.2?'walk':'idle');
 else if(state.bossStagger>0)setBossVisualAction('idle');
 else setBossVisualAction('attack');
 animateBossTelegraph(dt);updateBossWarningGlow();animateGiantessPresence(dt);updateBossMonsterArmVisuals();
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
 if(state.bossHp<=0){
   const fall=1-Math.exp(-dt*2.25);
   boss.rotation.z=THREE.MathUtils.lerp(boss.rotation.z,-1.18,fall);
   boss.rotation.x=THREE.MathUtils.lerp(boss.rotation.x,.16,fall);
   boss.position.y=THREE.MathUtils.lerp(boss.position.y,-.34,fall);
   if(animeHeadPivot)animeHeadPivot.rotation.x=THREE.MathUtils.lerp(animeHeadPivot.rotation.x,.28,fall);
   return
 }
 if(state.bossStagger>0){
   setDanger(false);state.bossStagger-=dt;boss.rotation.z=Math.sin(state.time*20)*.045;
   if(state.bossStagger<=0){state.bossState='idle';state.bossTimer=.65;boss.rotation.z=0}
   return;
 }
 const d=dist(),dir=flatDir(boss.position,player.position),face=Math.atan2(dir.x,dir.z);
 if(state.bossState==='idle')boss.rotation.y=THREE.MathUtils.lerp(boss.rotation.y,face,dt*5);
 else if(state.bossState.startsWith('arm_')){
   const cutoff=BOSS_AIM_CUTOFF[state.bossState]??0;
   if(state.bossTimer>cutoff){
     boss.rotation.y=THREE.MathUtils.lerp(boss.rotation.y,face,1-Math.exp(-dt*4.2));
     const targetRange=BOSS_AIM_RANGE[state.bossState]??3.2;
     if(d>targetRange+.18)boss.position.addScaledVector(dir,dt*Math.min(2.35,(d-targetRange)*1.55));
   }
 }
 if(state.bossState==='idle'){
   state.bossTimer-=dt;
   if(d>4.45)boss.position.addScaledVector(dir,dt*(state.legBroken?1.55:2.2));else if(d<2.35)boss.position.addScaledVector(dir,-dt*.28);
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
     if(inBossHitWindow(state.bossTimer,.26,.17))bossArmImpact([0,1],1.55,24,30,false);
   }
   if(state.bossTimer<=0){resetDorsalArms(1);state.bossState='idle';state.bossTimer=.72}
 }else if(state.bossState==='arm_double_slam'){
   if(state.bossTimer<=.46){
     const p=clamp(1-state.bossTimer/.46,0,1),e=Math.sin(p*Math.PI*.72);
     for(const a of dorsalArms){a.shoulder.rotation.x=-1.42+e*2.0;a.upperPivot.rotation.x=-1.68+e*2.25;a.elbow.rotation.x=-.48+e*.75}
     trailArms(1.2);
     if(inBossHitWindow(state.bossTimer,.26,.16)){
       bossFxOnce('double-slam',()=>{spawnDustBurst(bossGroundPoint(2.0),1.75);state.shake=Math.max(state.shake,.24)});
       bossArmImpact([0,1],1.62,36,48,false);
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
     if(inBossHitWindow(state.bossTimer,.27,.17))bossArmImpact(0,1.55,28,36,false);
   }
   if(state.bossTimer<=0){resetDorsalArms(1);state.bossState='idle';state.bossTimer=.78}
 }else if(state.bossState==='arm_uppercut'){
   if(state.bossTimer<=.36){
     const p=clamp(1-state.bossTimer/.36,0,1),e=Math.sin(p*Math.PI*.86);
     const a=dorsalArms[1];a.shoulder.rotation.z=-1.55+e*2.7;a.elbow.rotation.z=-1.6+e*2.35;a.wrist.rotation.x=.55-e*.85;
     body.rotation.z=-.24+e*.34;spawnArmTrail(a,1.3);
     if(inBossHitWindow(state.bossTimer,.2,.12))bossArmImpact(1,1.45,30,42,false);
   }
   if(state.bossTimer<=0){resetDorsalArms(1);body.rotation.z=0;state.bossState='idle';state.bossTimer=.72}
 }else if(state.bossState==='arm_grab'){
   if(state.bossTimer<=.4){
     const p=clamp(1-state.bossTimer/.4,0,1),e=Math.sin(p*Math.PI*.82);
     const a=dorsalArms[0];a.shoulder.rotation.x=-.72+e*.92;a.shoulder.rotation.y=-1.48+e*1.5;a.elbow.rotation.z=1.55-e*1.2;a.wrist.rotation.y=-.7+e*.85;
     spawnArmTrail(a,1.15);
     if(inBossHitWindow(state.bossTimer,.22,.13))bossArmImpact(0,1.48,42,58,true);
   }
   if(state.bossTimer<=0){setDanger(false);resetDorsalArms(1);state.bossState='idle';state.bossTimer=1.0}
 }else if(state.bossState==='arm_barrage'){
   if(state.bossTimer<=1.32){
     const active=clamp((1.32-state.bossTimer)/1.06,0,.999),phase=Math.floor(active*6),local=(active*6)-phase,s=Math.sin(local*Math.PI);
     const idx=phase%2,a=dorsalArms[idx],sign=idx?-1:1;
     a.upperPivot.rotation.z=sign*(.72+s*1.25);a.elbow.rotation.z=sign*(.58+s*.78);a.shoulder.rotation.y=sign*s*.42;
     spawnArmTrail(a,1.0);
     if(phase!==state.bossPatternStep){state.bossPatternStep=phase;state.bossHit=false;state.bossFxStamp=''}
     if(s>.93){
       bossFxOnce('barrage-'+phase,()=>spawnDustBurst(bossGroundPoint(1.45),.55));
       bossArmImpact(idx,1.34,14,18,false);
     }
   }
   if(state.bossTimer<=0){resetDorsalArms(1);state.bossState='idle';state.bossTimer=.86}
 }else if(state.bossState==='arm_guardbreak'){
   if(state.bossTimer<=.38){
     const p=clamp(1-state.bossTimer/.38,0,1),e=Math.sin(p*Math.PI*.72);
     for(const a of dorsalArms){a.shoulder.rotation.x=-1.5+e*2.05;a.upperPivot.rotation.x=-.65+e*.9;a.elbow.rotation.x=-1.05+e*1.3}
     trailArms(1.35);
     if(inBossHitWindow(state.bossTimer,.22,.13)){
       bossFxOnce('guardbreak',()=>{spawnDustBurst(bossGroundPoint(1.7),1.35);state.shake=Math.max(state.shake,.2)});
       bossArmImpact([0,1],1.55,22,72,false);
     }
   }
   if(state.bossTimer<=0){resetDorsalArms(1);state.bossState='idle';state.bossTimer=1.0}
 }else if(state.bossState==='arm_crush'){
   if(state.bossTimer<=.42){
     const p=clamp(1-state.bossTimer/.42,0,1),e=Math.sin(p*Math.PI*.86);
     dorsalArms[0].shoulder.rotation.y=-1.72+e*1.85;dorsalArms[1].shoulder.rotation.y=1.72-e*1.85;
     dorsalArms[0].elbow.rotation.z=1.15-e*.72;dorsalArms[1].elbow.rotation.z=-1.15+e*.72;
     trailArms(1.2);
     if(inBossHitWindow(state.bossTimer,.23,.14)){
       bossFxOnce('crush',()=>spawnDustBurst(bossGroundPoint(1.25),.9));
       bossArmImpact([0,1],1.52,46,64,true);
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
     weaponPivot.rotation.set(0,0,0);weaponPivot.position.set(0,0,0);applyWeaponGrip();player.rotation.x=0;player.rotation.z=0;playerBody.rotation.set(0,0,0);
     if(state.attackQueued&&step<3)startAttack(step+1);else if(!state.attackQueued&&state.comboGrace<=0)state.attackStep=0;
   }
 }
 const toBoss=flatDir(player.position,boss.position);
 if(input.lock&&!state.rolling)player.rotation.y=lerpAngle(player.rotation.y,Math.atan2(toBoss.x,toBoss.z),1-Math.exp(-dt*12));
 else if(!input.lock&&!state.rolling)player.rotation.y=lerpAngle(player.rotation.y,input.camYaw,1-Math.exp(-dt*13));
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
   if(input.lock){
     move.addScaledVector(toBoss,z).addScaledVector(right,x).normalize();
   }else{
     const forward=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));
     const strafe=new THREE.Vector3(forward.z,0,-forward.x);
     move.addScaledVector(forward,z).addScaledVector(strafe,x).normalize();
   }
   const sprint=(input.keys.has('ShiftLeft')||input.keys.has('ShiftRight'))&&state.stamina>0&&state.exhausted<=0;
   player.position.addScaledVector(move,dt*(sprint?5.2:3.15));
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

const camPos=new THREE.Vector3(),camLook=new THREE.Vector3();
function updateLockMarker(){
 if(!ui.lockDot)return;
 const show=input.lock&&state.bossHp>0;
 if(!show){ui.lockDot.classList.remove('on');return}
 const p=boss.position.clone().add(new THREE.Vector3(0,4.35,.15)).project(camera);
 const visible=p.z>-1&&p.z<1&&Math.abs(p.x)<1.15&&Math.abs(p.y)<1.15;
 if(!visible){ui.lockDot.classList.remove('on');return}
 ui.lockDot.style.left=((p.x*.5+.5)*innerWidth)+'px';
 ui.lockDot.style.top=((-p.y*.5+.5)*innerHeight)+'px';
 ui.lockDot.classList.add('on');
}
function updateCamera(dt){
 const target=player.position.clone().add(new THREE.Vector3(0,1.52,0));
 let desiredPos=new THREE.Vector3(),desiredLook=new THREE.Vector3();
 let wantedFov=60;

 if(input.lock){
   const d=dist(),armAttack=state.bossState.startsWith('arm_');
   const toBoss=flatDir(player.position,boss.position);
   const right=new THREE.Vector3(toBoss.z,0,-toBoss.x);
   const backDist=clamp(6.55+d*.2,6.8,9.3)+(armAttack?.45:0);
   const height=2.45+clamp(d*.075,.1,1.0)+(armAttack?.22:0);
   desiredPos.copy(target).addScaledVector(toBoss,-backDist).addScaledVector(right,.34).add(new THREE.Vector3(0,height,0));
   const bossFocus=boss.position.clone().add(new THREE.Vector3(0,4.0,0));
   const focusWeight=clamp(.44+d*.012,.45,.58);
   desiredLook.copy(target).lerp(bossFocus,focusWeight);
   wantedFov=armAttack?64:60;
 }else{
   const f=new THREE.Vector3(Math.sin(input.camYaw),0,Math.cos(input.camYaw)).normalize();
   const right=new THREE.Vector3(f.z,0,-f.x);
   const backDist=6.45;
   const height=2.05+input.camPitch*1.25;
   desiredPos.copy(target).addScaledVector(f,-backDist).addScaledVector(right,.5).add(new THREE.Vector3(0,height,0));
   desiredLook.copy(target).addScaledVector(f,5.4);
   desiredLook.y+=input.camPitch*4.4+.18;
   wantedFov=input.keys.has('ShiftLeft')||input.keys.has('ShiftRight')?63:60;
 }

 const posEase=1-Math.exp(-dt*(input.lock?7.2:10.5));
 const lookEase=1-Math.exp(-dt*(input.lock?8.5:13));
 if(!camLook.lengthSq())camLook.copy(desiredLook);
 camera.position.lerp(desiredPos,posEase);
 camLook.lerp(desiredLook,lookEase);

 if(Math.abs(camera.fov-wantedFov)>.02){
   camera.fov=THREE.MathUtils.lerp(camera.fov,wantedFov,1-Math.exp(-dt*7));
   camera.updateProjectionMatrix();
 }
 if(state.shake>0){
   state.shake=Math.max(0,state.shake-dt);
   camera.position.x+=(Math.random()-.5)*state.shake;
   camera.position.y+=(Math.random()-.5)*state.shake;
 }
 camera.lookAt(camLook);
 updateLockMarker();
}
function partText(v,broken,label){return broken?label:(v<45?'손상':'정상')}
function updateUI(){
 ui.hp.style.width=clamp(state.hp,0,100)+'%';if(ui.stamina){ui.stamina.style.width=(clamp(state.stamina,0,state.staminaMax)/state.staminaMax*100)+'%';ui.stamina.parentElement.classList.toggle('exhausted',state.exhausted>0)}ui.posture.style.width=clamp(state.posture,0,100)+'%';ui.bossHp.style.width=(state.bossHp/560*100)+'%';ui.bossPosture.style.width=clamp(state.bossPosture,0,100)+'%';
 ui.head.textContent=partText(state.headHp,state.headBroken,'파괴');ui.leg.textContent=partText(state.legHp,state.legBroken,'파괴');if(ui.spike){const alive=bossSpikeTargets.filter(s=>!s.broken).length,total=bossSpikeTargets.length;ui.spike.textContent=total?(alive?`${alive}/${total}`:'전부 파괴'):'로딩';}ui.tail.textContent=partText(state.tailHp,state.tailBroken,'절단');if(ui.weapon)ui.weapon.textContent=`${weaponIndex+1}. ${currentWeapon().name} · ${twoHanded?'양손/무기 가드':'한손/방패 가드'}`;
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
function loop(){
 let dt=Math.min(clock.getDelta(),.033);state.time+=dt;
 if(state.hitstop>0){state.hitstop-=dt;dt=0}else{updatePlayer(dt);updateBoss(dt)}
if(playerMixer)playerMixer.update(Math.max(dt,.001));animateVroidPlayer(Math.max(dt,.001));updateArmTrails(Math.max(dt,.001));updateDustFX(Math.max(dt,.001));updateSparks(Math.max(dt,.001));updateCamera(Math.max(dt,.001));updateUI();renderer.render(scene,camera);requestAnimationFrame(loop);
}
loop();