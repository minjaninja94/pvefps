import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BOSS_QUERY=Number(new URLSearchParams(location.search).get('boss'));
const BOSS_VARIANT=[1,2,3,4,5,6].includes(BOSS_QUERY)?BOSS_QUERY:1;
const BOSS2_NAME='잔불의 왕녀 · 아르세리아';
const BOSS3_NAME='붉은 백합의 검희 · 세리아';
const BOSS4_NAME='백야의 검성 · 비비';
const BOSS5_NAME='흑철의 투희 · 시노';
const BOSS6_NAME='라스트보스 · 황근출';
const VRM_SAMPLE_REV='e16eb187100149a315ad92c3c9968f1d5baa6c7d';
const BOSS2_MODEL_URL=`https://raw.githubusercontent.com/madjin/vrm-samples/${VRM_SAMPLE_REV}/vroid/beta/Victoria_Rubin.vrm`;
const BOSS3_MODEL_URL=`https://raw.githubusercontent.com/madjin/vrm-samples/${VRM_SAMPLE_REV}/vroid/beta/Vita.vrm`;
const BOSS4_MODEL_URL=`https://raw.githubusercontent.com/madjin/vrm-samples/${VRM_SAMPLE_REV}/vroid/beta/Vivi.vrm`;
const BOSS5_MODEL_URL=`https://raw.githubusercontent.com/madjin/vrm-samples/${VRM_SAMPLE_REV}/vroid/beta/Sendagaya_Shino.vrm`;

const PLAYER_MAX_HP=1600;
const PLAYER_MAX_STAMINA=130;
const PLAYER_DAMAGE_SCALE=10;
const BOSS_DAMAGE_SCALE=13.5;
const POTION_HEAL=780;
const BOSS_MAX_HP={1:12000,2:12500,3:14000,4:13000,5:15000,6:19000};
const BOSS_POSTURE_MAX={1:190,2:220,3:235,4:225,5:250,6:290};
const BOSS1_PART_HP={head:1000,leg:1500,tail:1300,spikeHeavy:900,spikeLight:650};
const BOSS3_HEAL_SCALE=BOSS_MAX_HP[3]/11800;

const canvas=document.querySelector('#game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.localClippingEnabled=true;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x111a28);
scene.fog=new THREE.FogExp2(0x111a28,.021);
const camera=new THREE.PerspectiveCamera(52,1,.1,260);
const clock=new THREE.Clock();
const assetLoader=new GLTFLoader();

scene.add(new THREE.HemisphereLight(0x8aa8c9,0x121722,1.32));
const moon=new THREE.DirectionalLight(0xbfd8ff,4.15);
moon.position.set(-10,14,7); moon.castShadow=true; moon.shadow.mapSize.set(2048,2048); scene.add(moon);
const fire=new THREE.PointLight(0xff7048,8,16,2); fire.position.set(7,3,-6); scene.add(fire);
const bossRim=new THREE.PointLight(0x6fa7ff,20,34,1.55);
bossRim.position.set(0,8,-9);
scene.add(bossRim);

const floor=new THREE.Mesh(new THREE.CircleGeometry(25,72),new THREE.MeshStandardMaterial({color:0x1a202b,roughness:.98,metalness:.04}));
floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
for(let i=0;i<38;i++){
  const a=i/38*Math.PI*2,r=20+Math.random()*4;
  const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.7+Math.random()*1.7,0),new THREE.MeshStandardMaterial({color:0x202a36,roughness:1}));
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
const shieldHandAnchor=new THREE.Group();shieldHandAnchor.name='PlayerForearmShieldRig';shieldHandAnchor.visible=false;scene.add(shieldHandAnchor);
const shieldPivot=new THREE.Group();shieldHandAnchor.add(shieldPivot);
const shield=part(shieldPivot,new THREE.CylinderGeometry(.36,.36,.085,12),steelDark,[0,0,-.045],[Math.PI/2,0,0],[1,.9,1]);
part(shieldPivot,new THREE.BoxGeometry(.09,.5,.11),steel,[0,0,.025]);
const weaponVisual=new THREE.Group();weaponPivot.add(weaponVisual);
const swordPivot=weaponPivot; // combat-pose compatibility

const WEAPONS=[
 {id:'straight',name:'직검',damage:1.00,posture:1.00,speed:1.00,stamina:1.00,reach:1.00,hitstop:1.00,guard:.58,motion:1.00,asset:'./assets/models/kaykit/sword_1handed.gltf',assetScale:.72,assetGripZ:-.13},
 {id:'greatsword',name:'대검',damage:1.58,posture:1.55,speed:.66,stamina:1.48,reach:1.22,hitstop:1.55,guard:.72,motion:1.35,asset:'./assets/models/kaykit/sword_2handed.gltf',assetScale:.78,assetGripZ:-.16},
 {id:'hammer',name:'해머',damage:1.38,posture:1.92,speed:.59,stamina:1.58,reach:.93,hitstop:1.82,guard:.76,motion:1.52},
 {id:'spear',name:'창',damage:.98,posture:.86,speed:1.08,stamina:.92,reach:1.48,hitstop:.82,guard:.48,motion:.82,asset:'./assets/models/kenney/weapon-spear.glb',assetScale:.9},
 {id:'katana',name:'태도',damage:1.08,posture:.92,speed:1.18,stamina:.94,reach:1.08,hitstop:.9,guard:.45,motion:.74,asset:'./assets/models/kaykit/sword_1handed.gltf',assetScale:.8,assetThin:true,assetGripZ:-.145},
 {id:'axe',name:'전투도끼',damage:1.28,posture:1.36,speed:.78,stamina:1.27,reach:1.02,hitstop:1.32,guard:.65,motion:1.22,asset:'./assets/models/kaykit/axe_1handed.gltf',assetScale:.76,assetGripZ:-.025}
];
let weaponIndex=0,twoHanded=false;
const WEAPON_GRIPS={
 // Local offsets are measured from the VRM right palm.  Each weapon has a different
 // handle thickness / wrist angle so the hand sits on the actual grip, not the guard.
 straight:{pos:[.012,-.026,.018],rot:[-.16,.015,.055],scale:1},
 greatsword:{pos:[.008,-.038,.02],rot:[-.205,.012,.028],scale:1.02},
 hammer:{pos:[.01,-.043,.024],rot:[-.245,.01,.018],scale:1.02},
 spear:{pos:[.008,-.026,.018],rot:[-.075,.0,.018],scale:1},
 katana:{pos:[.012,-.024,.018],rot:[-.185,.055,.085],scale:1},
 axe:{pos:[.01,-.036,.022],rot:[-.22,.012,.025],scale:1.01}
};
function currentWeapon(){return WEAPONS[weaponIndex]}
function applyWeaponGrip(){
 const g=WEAPON_GRIPS[currentWeapon().id]||WEAPON_GRIPS.straight;
 weaponHandAnchor.position.set(...g.pos);
 weaponHandAnchor.rotation.set(...g.rot);
 weaponHandAnchor.scale.setScalar(g.scale||1);
 weaponPivot.position.set(0,0,0);weaponPivot.rotation.set(0,0,0);
 // Shield transform is solved in world space from elbow + wrist every frame.
 shieldPivot.position.set(0,0,0);
 shieldPivot.rotation.set(0,0,0);
 shieldPivot.scale.setScalar(1);
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
     // KayKit weapon origins sit near the guard. Shift the mesh so the actual handle center
     // coincides with the VRM palm / weaponPivot origin.
     model.position.z=w.assetGripZ||0;
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

const PLAYER_MODEL_REV='e16eb187100149a315ad92c3c9968f1d5baa6c7d';
const PLAYER_MODEL_URL=`https://raw.githubusercontent.com/madjin/vrm-samples/${PLAYER_MODEL_REV}/vroid/beta/Sakurada_Fumiriya.vrm`;
const PLAYER_VISUAL_HEIGHT=2.65;
let knightVisual=null,playerVrm=null,playerVrmRoot=null;
const playerVrmMotion=new THREE.Group();playerVrmMotion.position.y=.98;player.add(playerVrmMotion);
const playerVrmMotionRest={y:.98};
const playerVrmRootRest={y:0,rotation:new THREE.Euler()};
function motionSmooth(a,b,x){const t=clamp((x-a)/Math.max(.0001,b-a),0,1);return t*t*(3-2*t)}
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
function rotateBoneEndToward(bone,endNode,targetWorld,alpha){
 if(!bone||!endNode||!bone.parent||alpha<=0)return;
 bone.parent.updateWorldMatrix(true,false);bone.updateWorldMatrix(true,false);endNode.updateWorldMatrix(true,false);
 const bp=new THREE.Vector3(),ep=new THREE.Vector3();
 bone.getWorldPosition(bp);endNode.getWorldPosition(ep);
 const current=ep.sub(bp),desired=targetWorld.clone().sub(bp);
 if(current.lengthSq()<1e-7||desired.lengthSq()<1e-7)return;
 const delta=new THREE.Quaternion().setFromUnitVectors(current.normalize(),desired.normalize());
 const bw=new THREE.Quaternion(),pw=new THREE.Quaternion();
 bone.getWorldQuaternion(bw);bone.parent.getWorldQuaternion(pw);
 const desiredWorld=delta.multiply(bw);
 const desiredLocal=pw.invert().multiply(desiredWorld);
 bone.quaternion.slerp(desiredLocal,clamp(alpha,0,1));
 bone.updateWorldMatrix(false,true);
}
function solveArmCCD(bones,side,handTargetWorld,elbowHintWorld,alpha=.7){
 const upper=bones[side+'UpperArm'],lower=bones[side+'LowerArm'],hand=bones[side+'Hand'];
 if(!upper||!lower||!hand)return;
 for(let i=0;i<2;i++){
   if(elbowHintWorld)rotateBoneEndToward(upper,lower,elbowHintWorld,alpha*.52);
   rotateBoneEndToward(lower,hand,handTargetWorld,alpha);
   rotateBoneEndToward(upper,hand,handTargetWorld,alpha*.72);
 }
}
function getArmReach(bones,side){
 const upper=bones[side+'UpperArm'],lower=bones[side+'LowerArm'],hand=bones[side+'Hand'];
 if(!upper||!lower||!hand)return 1;
 const a=new THREE.Vector3(),b=new THREE.Vector3(),d=new THREE.Vector3();
 upper.getWorldPosition(a);lower.getWorldPosition(b);hand.getWorldPosition(d);
 return Math.max(.1,a.distanceTo(b)+b.distanceTo(d));
}
function playerLocalVector(v){
 const q=new THREE.Quaternion();player.getWorldQuaternion(q);return v.clone().applyQuaternion(q);
}
function alignObjectLocalYToWorld(obj,worldDir,alpha=1){
 if(!obj?.parent||!worldDir?.lengthSq?.())return;
 obj.parent.updateWorldMatrix(true,false);
 const y=worldDir.clone().normalize();
 let z=new THREE.Vector3(0,1,0);if(Math.abs(z.dot(y))>.96)z.set(0,0,1);
 const x=y.clone().cross(z).normalize();z=x.clone().cross(y).normalize();
 const worldQ=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
 const parentQ=new THREE.Quaternion();obj.parent.getWorldQuaternion(parentQ);
 const localQ=parentQ.invert().multiply(worldQ);
 obj.quaternion.slerp(localQ,clamp(alpha,0,1));
}
function alignWeaponFromHands(root,rightHand,leftHand,leftIsForward=false,alpha=1){
 if(!root||!rightHand||!leftHand)return false;
 const r=new THREE.Vector3(),l=new THREE.Vector3();rightHand.getWorldPosition(r);leftHand.getWorldPosition(l);
 const axis=(leftIsForward?l.clone().sub(r):r.clone().sub(l));
 if(axis.lengthSq()<1e-6)return false;
 root.position.copy(r);
 alignObjectLocalYToWorld(root,axis,alpha);
 return true;
}
function applyWeaponEdgeRoll(root,roll){
 if(!root||!roll)return;
 const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),roll);
 root.quaternion.multiply(q);
}
function weaponArmAxis(lower,hand,fallback=null){
 const hp=new THREE.Vector3(),lp=new THREE.Vector3();
 hand?.getWorldPosition?.(hp);lower?.getWorldPosition?.(lp);
 const dir=hp.sub(lp);
 if(dir.lengthSq()<1e-7){
  if(fallback?.lengthSq?.())return fallback.clone().normalize();
  return new THREE.Vector3(0,1,0);
 }
 return dir.normalize();
}
function placeWeaponAtPrimaryGrip(root,hand,localGripY,axisWorld,roll=0){
 if(!root||!hand||!axisWorld?.lengthSq?.())return false;
 const hp=new THREE.Vector3();hand.getWorldPosition(hp);
 const desiredAxis=axisWorld.clone().normalize();
 const desiredQ=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),desiredAxis);
 if(!root.userData.gripReady||root.quaternion.angleTo(desiredQ)>.92){
  root.quaternion.copy(desiredQ);root.userData.gripReady=true;
 }else root.quaternion.slerp(desiredQ,.72);
 // Position is solved after orientation so the authored grip point stays exactly inside the palm.
 const actualAxis=new THREE.Vector3(0,1,0).applyQuaternion(root.quaternion).normalize();
 root.position.copy(hp).addScaledVector(actualAxis,-localGripY);
 if(roll)applyWeaponEdgeRoll(root,roll);
 root.updateMatrixWorld(true);
 return true;
}
const PLAYER_HAND_PATHS={
 straight:[
  null,
  [[0,.2,-.5,.16],[.18,.42,-.48,-.12],[.4,.62,-.24,.18],[.6,-.54,-.34,.92],[.78,-.4,-.42,.72],[1,.16,-.5,.24]],
  [[0,.12,-.5,.22],[.18,-.48,-.44,-.06],[.4,-.62,-.24,.22],[.6,.58,-.32,.92],[.78,.42,-.42,.7],[1,.14,-.5,.26]],
  [[0,.14,-.52,.2],[.26,.08,-.02,-.14],[.48,.18,.28,.04],[.68,-.08,-.78,.96],[.84,.02,-.62,.66],[1,.14,-.52,.24]]
 ],
 greatsword:[
  null,
  [[0,.2,-.5,.12],[.2,.55,-.08,-.18],[.44,.72,.22,-.08],[.68,-.62,-.38,1.04],[.84,-.34,-.54,.7],[1,.08,-.56,.28]],
  [[0,.1,-.54,.2],[.2,-.55,-.08,-.14],[.44,-.72,.18,-.06],[.69,.66,-.4,1.02],[.84,.34,-.54,.72],[1,.08,-.56,.28]],
  [[0,.12,-.56,.18],[.22,.02,.08,-.22],[.5,.02,.48,-.12],[.72,.02,-.9,1.08],[.86,.02,-.68,.72],[1,.08,-.58,.26]]
 ],
 hammer:[
  null,
  [[0,.18,-.5,.14],[.22,.58,-.02,-.12],[.48,.72,.22,.06],[.7,-.56,-.48,.9],[.86,-.34,-.58,.62],[1,.06,-.6,.22]],
  [[0,.08,-.56,.18],[.22,-.58,-.02,-.12],[.48,-.72,.2,.06],[.7,.58,-.5,.92],[.86,.34,-.58,.62],[1,.06,-.6,.22]],
  [[0,.1,-.58,.16],[.28,.0,.1,-.18],[.52,.0,.56,-.08],[.76,.0,-.96,.88],[.88,.0,-.72,.56],[1,.06,-.62,.2]]
 ],
 spear:[
  null,
  [[0,.18,-.3,.0],[.26,.22,-.28,-.48],[.5,.12,-.31,.08],[.66,.05,-.34,1.34],[.8,.06,-.34,1.18],[1,.16,-.34,.14]],
  [[0,.12,-.32,.02],[.26,-.08,-.29,-.42],[.5,.02,-.31,.12],[.66,-.02,-.34,1.3],[.8,.02,-.34,1.14],[1,.14,-.34,.16]],
  [[0,.16,-.3,0],[.28,.12,-.26,-.56],[.52,.04,-.31,.1],[.72,.02,-.35,1.54],[.84,.04,-.35,1.34],[1,.14,-.34,.14]]
 ],
 katana:[
  null,
  [[0,-.18,-.62,.02],[.18,-.44,-.58,-.18],[.36,-.56,-.48,.0],[.54,.62,-.2,1.0],[.72,.44,-.42,.78],[1,.04,-.54,.22]],
  [[0,.08,-.56,.18],[.18,.44,-.52,-.16],[.36,.56,-.42,.02],[.54,-.62,-.2,1.02],[.72,-.44,-.4,.78],[1,.04,-.54,.22]],
  [[0,-.08,-.58,.14],[.22,.28,-.06,-.18],[.46,.42,.22,.02],[.66,-.42,-.62,1.06],[.82,-.26,-.52,.76],[1,.05,-.54,.22]]
 ],
 axe:[
  null,
  [[0,.16,-.52,.16],[.22,.54,.02,-.12],[.44,.68,.22,-.02],[.68,-.5,-.58,.94],[.84,-.3,-.56,.66],[1,.08,-.56,.24]],
  [[0,.08,-.54,.18],[.22,-.54,-.02,-.1],[.44,-.68,.2,.0],[.68,.56,-.54,.94],[.84,.3,-.56,.66],[1,.08,-.56,.24]],
  [[0,.12,-.56,.16],[.26,.08,.2,-.18],[.5,.16,.52,-.08],[.74,-.18,-.86,.96],[.86,-.1,-.68,.62],[1,.08,-.58,.22]]
 ]
};
const PLAYER_STRONG_HAND_PATHS={
 straight:[[0,.18,-.54,.1],[.18,.5,-.28,-.18],[.4,.7,-.12,.0],[.58,-.62,-.34,1.18],[.74,-.42,-.46,.92],[1,.14,-.52,.22]],
 greatsword:[[0,.12,-.58,.1],[.18,.0,-.08,-.3],[.46,.0,.62,-.18],[.62,.0,.7,-.08],[.76,.0,-1.02,1.14],[.9,.0,-.74,.72],[1,.08,-.58,.22]],
 hammer:[[0,.12,-.58,.12],[.18,.58,.12,-.2],[.42,.74,.4,-.08],[.6,-.74,-.18,.38],[.74,-.42,-.72,.92],[.9,-.18,-.64,.58],[1,.06,-.6,.2]],
 spear:[[0,.2,-.3,-.08],[.28,.22,-.28,-.72],[.46,.12,-.31,-.36],[.62,.02,-.34,1.62],[.78,.02,-.34,1.46],[1,.14,-.34,.12]],
 katana:[[0,-.32,-.66,-.1],[.28,-.56,-.62,-.26],[.44,-.64,-.54,-.12],[.56,.7,-.18,1.16],[.7,.5,-.36,.94],[1,.04,-.54,.2]],
 axe:[[0,.14,-.58,.12],[.2,.12,.02,-.24],[.48,.18,.58,-.14],[.66,-.08,-.92,1.02],[.82,-.04,-.72,.7],[1,.08,-.58,.2]]
};
function samplePlayerHandPath(id,step,p){
 const frames=state.attackStrong?(PLAYER_STRONG_HAND_PATHS[id]||PLAYER_STRONG_HAND_PATHS.straight):(PLAYER_HAND_PATHS[id]?.[step]||PLAYER_HAND_PATHS.straight[Math.max(1,Math.min(3,step))]);
 let a=frames[0],b=frames[frames.length-1];
 for(let i=0;i<frames.length-1;i++){if(p>=frames[i][0]&&p<=frames[i+1][0]){a=frames[i];b=frames[i+1];break}}
 const t=motionSmooth(a[0],b[0],p);
 return new THREE.Vector3(
  THREE.MathUtils.lerp(a[1],b[1],t),
  THREE.MathUtils.lerp(a[2],b[2],t),
  THREE.MathUtils.lerp(a[3],b[3],t)
 );
}
const PLAYER_READY_HANDS={
 straight:[.24,-.56,.22],
 greatsword:[.3,-.38,.06],
 hammer:[.3,-.42,.03],
 spear:[.22,-.32,.54],
 katana:[.1,-.5,.22],
 axe:[.3,-.4,.08]
};
function playerReadyHand(id,reach,moving,phase,sprint){
 const a=PLAYER_READY_HANDS[id]||PLAYER_READY_HANDS.straight;
 const v=new THREE.Vector3(a[0]*reach,a[1]*reach,a[2]*reach);
 if(moving){
  const step=Math.sin(phase),lift=Math.abs(Math.cos(phase));
  const heavy=id==='greatsword'||id==='hammer';
  const travel=(sprint?.085:.052)*reach*(heavy?.72:1);
  v.x+=step*(sprint?.025:.016)*reach;
  v.y+=lift*(sprint?.018:.011)*reach;
  v.z+=step*travel*(id==='spear'?.34:.18);
 }
 return v;
}
const PLAYER_SECONDARY_GRIP_Z={straight:.3,greatsword:.5,hammer:.58,spear:-.55,katana:.4,axe:.44};
const PLAYER_WRIST_GRIP={
 straight:{r:[-.11,-.035,-.11],l:[-.04,.04,.08]},
 greatsword:{r:[-.16,-.02,-.075],l:[-.12,.035,.075]},
 hammer:{r:[-.19,-.01,-.055],l:[-.15,.025,.06]},
 spear:{r:[-.045,0,-.015],l:[-.035,0,.015]},
 katana:{r:[-.13,-.055,-.13],l:[-.1,.045,.09]},
 axe:{r:[-.17,-.02,-.07],l:[-.12,.03,.065]}
};
function alignPlayerSpearToForward(dt){
 if(currentWeapon().id!=='spear'||!weaponPivot.parent)return;
 weaponPivot.parent.updateWorldMatrix(true,false);
 const forward=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y)).normalize();
 const bladeDir=forward.clone();
 const z=bladeDir.clone().multiplyScalar(-1);
 let y=new THREE.Vector3(0,1,0);if(Math.abs(y.dot(z))>.96)y.set(1,0,0);
 const x=y.clone().cross(z).normalize();y=z.clone().cross(x).normalize();
 const worldQ=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
 const parentQ=new THREE.Quaternion();weaponPivot.parent.getWorldQuaternion(parentQ);
 const localQ=parentQ.invert().multiply(worldQ);
 weaponPivot.quaternion.slerp(localQ,1-Math.exp(-dt*36));
}
function applyPlayerWristGrip(dt){
 const w=currentWeapon(),g=PLAYER_WRIST_GRIP[w.id]||PLAYER_WRIST_GRIP.straight;
 let rr=[...g.r],ll=[...g.l];
 if(state.attack>0){
  const p=playerAttackProgress(),side=state.attackStep===2?-1:1;
  const profile=playerAttackProfile(w.id,state.attackStep);
  const active=motionSmooth(profile.active[0]-.08,profile.active[1],p)*(1-motionSmooth(profile.active[1],.94,p));
  const wind=motionSmooth(.06,Math.max(.16,profile.active[0]-.06),p)*(1-motionSmooth(profile.active[0],profile.active[1],p));
  const edge=w.id==='spear'?.08:w.id==='greatsword'||w.id==='hammer'?.18:w.id==='axe'?.24:w.id==='katana'?.38:.3;
  rr[1]+=side*(wind*.12-active*edge);
  rr[2]+=side*(wind*.08-active*edge*.7);
  rr[0]-=active*(w.id==='hammer'?.08:w.id==='greatsword'?.06:.035);
  if(twoHanded){
   ll[1]-=side*(wind*.05-active*edge*.32);
   ll[2]-=side*(wind*.04-active*edge*.22);
  }
 }
 setPlayerVrmBone('rightHand',rr[0],rr[1],rr[2],28,dt);
 if(twoHanded)setPlayerVrmBone('leftHand',ll[0],ll[1],ll[2],28,dt);
}
function applyPlayerArmIK(dt,phase,moving,sprint){
 if(!playerVrmBones.leftUpperArm||!playerVrmBones.rightUpperArm)return;
 player.updateMatrixWorld(true);playerVrmRoot?.updateMatrixWorld(true);
 const attack=state.attack>0,w=currentWeapon(),step=state.attackStep;
 for(const side of ['left','right']){
   const sx=side==='left'?-1:1,upper=playerVrmBones[side+'UpperArm'];
   const shoulder=new THREE.Vector3();upper.getWorldPosition(shoulder);
   const reach=getArmReach(playerVrmBones,side);
   let delta;
   if(side==='right'&&!attack&&!input.guard&&state.rolling<=0){
     delta=playerReadyHand(w.id,reach,moving,phase,sprint);
   }else if(side==='left'&&!attack&&!input.guard&&state.rolling<=0&&!twoHanded){
     delta=new THREE.Vector3(-reach*.34,-reach*.43,reach*.22);
     if(moving){delta.z-=Math.sin(phase)*(sprint?.038:.024)*reach;delta.x-=Math.abs(Math.sin(phase))*.012*reach;}
   }else{
     delta=new THREE.Vector3(sx*reach*.13,-reach*.84,.04);
   }
   if(input.guard&&!attack&&state.rolling<=0){
     delta.set(side==='left'?-reach*.34:reach*.14,-reach*.27,side==='left'?reach*.4:reach*.29);
   }
   if(state.rolling>0){
     const lean=state.rollLean||1;
     if(side==='right')delta.set(-lean*reach*.12,-reach*.12,reach*.22);
     else delta.set(lean*reach*.08,-reach*.08,reach*.3);
   }
   if(attack){
     const p=playerAttackProgress();
     if(side==='right'){
       const path=samplePlayerHandPath(w.id,step,p);
       delta.set(path.x*reach,path.y*reach,path.z*reach);
     }else if(twoHanded){
       delta.set(-.12*reach,-.34*reach,.3*reach);
     }else{
       // Shield arm stays compact and protects the torso while the weapon hand attacks.
       delta.set(-.36*reach,-.34*reach,.32*reach);
     }
   }
   const handTarget=shoulder.clone().add(playerLocalVector(delta));
   const elbowDelta=new THREE.Vector3(sx*reach*.28,-reach*.4,delta.z*.42);
   const elbowTarget=shoulder.clone().add(playerLocalVector(elbowDelta));
   solveArmCCD(playerVrmBones,side,handTarget,elbowTarget,1-Math.exp(-dt*32));
 }
 // Two-handed weapons use the actual weapon handle as the left-hand IK target.
 // This keeps both palms on the same weapon and lets the elbow fold naturally instead of posing independently.
 if(twoHanded&&state.rolling<=0&&playerVrmBones.leftUpperArm&&playerVrmBones.leftHand&&playerVrmBones.rightHand){
   player.updateMatrixWorld(true);weaponPivot.updateWorldMatrix(true,true);
   const w=currentWeapon();
   if(w.id==='spear')alignPlayerSpearToForward(dt);
   const gripZ=PLAYER_SECONDARY_GRIP_Z[w.id]??.32;
   const gripTarget=weaponPivot.localToWorld(new THREE.Vector3(0,0,gripZ));
   const shoulder=new THREE.Vector3();playerVrmBones.leftUpperArm.getWorldPosition(shoulder);
   const reach=getArmReach(playerVrmBones,'left');
   const elbowHint=shoulder.clone().add(playerLocalVector(new THREE.Vector3(-reach*.3,-reach*.34,reach*.16)));
   solveArmCCD(playerVrmBones,'left',gripTarget,elbowHint,1-Math.exp(-dt*38));
   playerVrmBones.leftHand.updateWorldMatrix?.(false,true);
 }
 if(state.rolling<=0){applyPlayerWristGrip(dt);if(currentWeapon().id==='spear')alignPlayerSpearToForward(dt)}
 else{setPlayerVrmBone('rightHand',-.22,-.08,-.2,28,dt);setPlayerVrmBone('leftHand',-.18,.08,.18,28,dt)}
}

function updatePlayerShieldRig(dt){
 const elbow=playerVrmBones.leftLowerArm,hand=playerVrmBones.leftHand;
 const visible=!twoHanded&&!!elbow&&!!hand&&!state.dead;
 shieldPivot.visible=visible;shieldHandAnchor.visible=visible;
 if(!visible)return;

 player.updateMatrixWorld(true);elbow.updateWorldMatrix(true,false);hand.updateWorldMatrix(true,false);
 const e=new THREE.Vector3(),h=new THREE.Vector3();elbow.getWorldPosition(e);hand.getWorldPosition(h);
 const forward=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y)).normalize();
 const right=new THREE.Vector3(forward.z,0,-forward.x),left=right.clone().multiplyScalar(-1);
 const guarding=input.guard&&state.attack<=0&&state.rolling<=0;
 const attacking=state.attack>0;
 const center=e.clone().lerp(h,.58)
   .addScaledVector(left,guarding?.17:.145)
   .addScaledVector(forward,guarding?.17:attacking?.045:.015);
 center.y+=guarding?.035:.01;

 const normal=forward.clone().multiplyScalar(guarding?1:.5).addScaledVector(left,guarding?.16:.72).normalize();
 let up=new THREE.Vector3(0,1,0);
 let x=up.clone().cross(normal).normalize();
 if(x.lengthSq()<1e-6)x.copy(right);
 up=normal.clone().cross(x).normalize();
 const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,up,normal));
 const ease=1-Math.exp(-dt*(guarding?28:18));
 shieldHandAnchor.position.lerp(center,ease);
 shieldHandAnchor.quaternion.slerp(q,ease);
 const scale=guarding?.93:.86;
 shieldHandAnchor.scale.setScalar(THREE.MathUtils.lerp(shieldHandAnchor.scale.x||1,scale,ease));
}


// Do not show the squat primitive/KayKit body while the real player asset streams in.
player.children.filter(o=>o.isMesh).forEach(m=>m.visible=false);

(async()=>{
 try{
   const {VRMLoaderPlugin,VRMUtils}=await import('@pixiv/three-vrm');
   const loader=new GLTFLoader();loader.setCrossOrigin('anonymous');loader.register(parser=>new VRMLoaderPlugin(parser));
   loader.load(PLAYER_MODEL_URL,gltf=>{
     const vrm=gltf.userData?.vrm||null;
     if(vrm)VRMUtils.rotateVRM0(vrm);
     const root=vrm?.scene||gltf.scene;
     root.updateMatrixWorld(true);
     let box=new THREE.Box3().setFromObject(root,true),size=new THREE.Vector3();box.getSize(size);
     const targetHeight=PLAYER_VISUAL_HEIGHT;
     const uniform=targetHeight/Math.max(size.y,.001);
     root.scale.set(uniform*.98,uniform*1.015,uniform*.98); // near-boss human scale; preserve natural limb proportions
     root.updateMatrixWorld(true);
     box=new THREE.Box3().setFromObject(root,true);
     root.position.y-=box.min.y;
     root.position.y-=playerVrmMotionRest.y;
     root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});

     knightVisual=root;playerVrmRoot=root;playerVrm=vrm;
     playerVrmRootRest.y=root.position.y;
     playerVrmRootRest.rotation.copy(root.rotation);
     playerVrmMotion.add(root);

     const humanoid=vrm?.humanoid;
     for(const name of ['hips','spine','chest','upperChest','neck','head',
       'leftShoulder','rightShoulder','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand',
       'leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot']){
       const node=humanoid?.getNormalizedBoneNode?.(name);
       if(node)cachePlayerVrmBone(name,node);
     }

     const rightHand=playerVrmBones.rightHand,leftHand=playerVrmBones.leftHand;
     if(rightHand)rightHand.add(weaponHandAnchor);
     applyWeaponGrip();
     shieldHandAnchor.visible=!!leftHand&&!twoHanded;
     console.info('Sakurada Fumiriya player loaded', {height:targetHeight,weaponHand:!!rightHand,shieldHand:!!leftHand,bones:Object.keys(playerVrmBones).length});
   },undefined,err=>console.warn('Tall VRoid player unavailable.',err));
 }catch(err){console.warn('three-vrm unavailable for player.',err)}
})();

function animateVroidPlayer(dt){
 if(!playerVrmRoot)return;
 const {x,z}=getMoveAxes(),moving=!!(x||z);
 const sprint=(input.keys.has('ShiftLeft')||input.keys.has('ShiftRight'))&&moving&&state.stamina>0&&state.exhausted<=0;
 const speed=sprint?12.6:9.0,phase=state.time*speed;
 let hipsX=0,hipsY=0,hipsZ=0,spineX=0,spineY=0,spineZ=0;
 let lsz=-.18,rsz=.18,luz=-1.62,ruz=1.62,lux=.12,rux=.12,luy=.04,ruy=-.04,llx=.42,rlx=.42;
 let lulx=0,rulx=0,lllx=0,rllx=0,lfx=0,rfx=0,headX=0,headY=0,headZ=0,neckX=0,neckY=0,neckZ=0;

 if(state.dead){
   spineZ=.8;hipsZ=.35;luz=-.55;ruz=.55;
 }else if(state.stagger>0){
   spineX=-.18;spineZ=Math.sin(state.time*24)*.08;hipsX=.08;
 }else if(state.rolling>0){
   const rp=clamp(state.rollElapsed/ROLL_DURATION,0,1),lean=state.rollLean||1;
   const prep=motionSmooth(0,.13,rp),shoulder=motionSmooth(.09,.32,rp),invert=motionSmooth(.28,.58,rp),exit=motionSmooth(.55,.8,rp),land=motionSmooth(.78,1,rp);
   const tuck=Math.sin(clamp((rp-.035)/.9,0,1)*Math.PI),leadL=lean<0?1:0,leadR=lean>0?1:0;
   // Shoulder-led dodge roll: crouch -> shoulder contact -> rounded back/hips -> feet recover.
   hipsX=.6*tuck-.2*land;hipsY=lean*(.1*shoulder-.12*exit);hipsZ=-lean*.18*shoulder+lean*.12*exit;
   spineX=-.42*prep-1.02*tuck+.3*land;spineY=-lean*.08*shoulder+lean*.06*exit;spineZ=lean*(.28*shoulder-.2*exit);
   headX=.72*tuck-.22*land;headY=-lean*.06*shoulder;headZ=-lean*.2*shoulder+lean*.1*exit;
   neckX=.38*tuck-.12*land;neckY=-lean*.05*shoulder;neckZ=-lean*.13*shoulder+lean*.06*exit;
   lsz=-.18-lean*.22*shoulder;rsz=.18-lean*.22*shoulder;
   // Arms cross the chest asymmetrically so the leading shoulder, not the face, takes the roll.
   lux=-1.12*tuck+(leadL?.18:-.08)*shoulder;rux=-1.06*tuck+(leadR?.18:-.08)*shoulder;
   luy=lean*.24*shoulder;ruy=lean*.18*shoulder;
   luz=-.7-.34*tuck-lean*.16*shoulder;ruz=.7+.34*tuck-lean*.16*shoulder;
   llx=-1.36*tuck+.18*exit;rlx=-1.3*tuck+.16*exit;
   // One knee folds first, the other follows, then both extend into the landing.
   lulx=-1.3*tuck+(leadL?.22:-.05)*shoulder+.36*land;rulx=-1.18*tuck+(leadR?.22:-.05)*shoulder+.3*land;
   lllx=1.62*tuck-(leadL?.18:0)*invert-.72*land;rllx=1.52*tuck-(leadR?.18:0)*invert-.66*land;
   lfx=-.4*tuck+.26*land;rfx=-.36*tuck+.24*land;
 }else if(state.attack>0){
   const w=currentWeapon(),p=playerAttackProgress(),step=state.attackStep,profile=playerAttackProfile(w.id,step),strong=state.attackStrong;
   const side=step===2?-1:1,arc=Math.sin(p*Math.PI),impact=Math.sin(clamp((p-profile.active[0])/(profile.active[1]-profile.active[0]),0,1)*Math.PI);
   // Arms are resolved by hand-target IK below. These values drive hips, torso, stance and planted feet.
   luz=-.35;ruz=.35;llx=-.45;rlx=-.45;
   if(strong&&w.id==='straight'){
     const load=motionSmooth(0,.38,p)*(1-motionSmooth(.64,1,p)),cut=Math.sin(clamp((p-.38)/.42,0,1)*Math.PI);
     spineX=-.18*load-.24*cut;spineY=.48*load-.56*cut;hipsY=spineY*.7;hipsX=.1*load;
     lulx=-.32*load+.16*cut;rulx=.34*load-.12*cut;lllx=.54*load;rllx=.34*load;
   }else if(strong&&w.id==='greatsword'){
     const charge=motionSmooth(0,.52,p)*(1-motionSmooth(.7,1,p)),slam=impact;
     spineX=.34*charge-.72*slam;hipsX=.22*charge-.08*slam;spineY=.08*charge;hipsY=.05*charge;
     lulx=.48*charge-.2*slam;rulx=.42*charge-.18*slam;lllx=.82*charge;rllx=.78*charge;headX=-.12*charge+.12*slam;
   }else if(strong&&w.id==='hammer'){
     const coil=motionSmooth(0,.5,p)*(1-motionSmooth(.68,1,p)),smash=impact;
     spineY=-.72*coil+.86*smash;hipsY=spineY*.78;spineX=.22*coil-.5*smash;hipsX=.16*coil;
     lulx=.42*coil-.16*smash;rulx=-.36*coil+.14*smash;lllx=.62*coil;rllx=.58*coil;
   }else if(strong&&w.id==='spear'){
     const brace=motionSmooth(0,.4,p)*(1-motionSmooth(.68,1,p)),thrust=impact;
     spineX=-.28*brace-.24*thrust;hipsX=-.08*brace;spineY=.06;hipsY=.04;
     lulx=-.48*brace;rulx=.48*brace;lllx=.28*brace;rllx=.72*brace;
   }else if(strong&&w.id==='katana'){
     const draw=motionSmooth(0,.42,p)*(1-motionSmooth(.62,1,p)),cut=impact;
     spineX=-.18*draw-.12*cut;spineY=-.58*draw+.82*cut;hipsY=spineY*.82;hipsX=.1*draw;
     lulx=.42*draw-.18*cut;rulx=-.3*draw+.16*cut;lllx=.58*draw;rllx=.46*draw;headY=-.12*draw+.16*cut;
   }else if(strong&&w.id==='axe'){
     const load=motionSmooth(0,.5,p)*(1-motionSmooth(.7,1,p)),chop=impact;
     spineX=.3*load-.68*chop;spineY=.26*load-.34*chop;hipsY=spineY*.7;hipsX=.18*load;
     lulx=.44*load-.18*chop;rulx=.38*load-.16*chop;lllx=.7*load;rllx=.66*load;
   }else if(w.id==='straight'){
     spineY=side*(-.24+motionSmooth(.18,.58,p)*.62)*(1-motionSmooth(.72,1,p));
     spineZ=-side*.08*arc;spineX=-.08*impact;hipsY=spineY*.45;
     lulx=side*.18*arc;rulx=-side*.12*arc;lllx=.18*arc;rllx=.12*arc;
   }else if(w.id==='greatsword'){
     spineX=.16*motionSmooth(0,.36,p)-.46*impact;spineY=side*.34*arc;hipsY=spineY*.62;
     lulx=.24*arc;rulx=-.2*arc;lllx=.42*arc;rllx=.36*arc;hipsX=.08*arc;
   }else if(w.id==='hammer'){
     const squat=Math.sin(clamp(p/.82,0,1)*Math.PI);
     spineX=.28*motionSmooth(0,.42,p)-.64*impact;spineY=side*.16*arc;hipsX=.18*squat;
     lulx=.34*squat;rulx=-.26*squat;lllx=.58*squat;rllx=.52*squat;
   }else if(w.id==='spear'){
     const lunge=motionSmooth(profile.active[0]-.08,profile.active[1],p)*(1-motionSmooth(.78,1,p));
     spineX=-.18*lunge;spineY=side*.08*arc;hipsX=-.04*lunge;
     lulx=-.34*lunge;rulx=.28*lunge;lllx=.2*lunge;rllx=.48*lunge;
   }else if(w.id==='katana'){
     const low=Math.sin(clamp(p/.74,0,1)*Math.PI);
     spineY=side*(-.34+motionSmooth(.12,.52,p)*.86)*(1-motionSmooth(.7,1,p));
     spineZ=-side*.13*impact;spineX=-.13*low;hipsY=spineY*.68;hipsX=.08*low;
     lulx=.3*low;rulx=-.2*low;lllx=.46*low;rllx=.38*low;
   }else if(w.id==='axe'){
     spineY=side*.42*arc;spineZ=-side*.11*impact;spineX=.1*motionSmooth(0,.35,p)-.38*impact;hipsY=spineY*.55;
     lulx=.22*arc;rulx=-.16*arc;lllx=.32*arc;rllx=.28*arc;
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
   const w=currentWeapon(),amp=sprint?.56:.38,stride=Math.sin(phase),swing=stride*amp;
   const leftSwing=Math.max(0,Math.cos(phase)),rightSwing=Math.max(0,-Math.cos(phase));
   lulx=swing;rulx=-swing;
   lllx=leftSwing*(sprint?.68:.43);
   rllx=rightSwing*(sprint?.68:.43);
   lfx=-stride*(sprint?.16:.11)-leftSwing*(sprint?.11:.075);
   rfx=stride*(sprint?.16:.11)-rightSwing*(sprint?.11:.075);
   headZ=stride*.009;headX=-Math.sin(phase*2)*.006;
   // Base arm swing is subtle; hand IK below keeps the actual weapon grip stable.
   lux=-swing*.34;rux=swing*.28;
   luz=-1.62;ruz=1.62;llx=.42;rlx=.42;
   hipsY=Math.sin(phase*2)*.018;hipsZ=stride*.014;spineY=-stride*(sprint?.045:.03);spineZ=-stride*.018;
   if(w.id==='greatsword'||w.id==='hammer'){spineX=-.075;hipsX=.04;lllx+=.055;rllx+=.055}
   else if(w.id==='spear'){spineX=-.03;spineY+=.03}
   else if(w.id==='katana'){spineX=-.05;hipsX=.03;spineZ*=1.18}
   else if(w.id==='axe'){spineX=-.045;spineY+=.025}
 }else{
   const breathe=Math.sin(state.time*1.6);
   spineX=breathe*.012;spineY=Math.sin(state.time*.45)*.01;
   luz=-1.62+breathe*.008;ruz=1.62-breathe*.008;llx=.42;rlx=.42;
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
 setPlayerVrmBone('leftFoot',lfx,0,0,13,dt);setPlayerVrmBone('rightFoot',rfx,0,0,13,dt);
 setPlayerVrmBone('neck',neckX,neckY,neckZ,12,dt);
 setPlayerVrmBone('head',headX,headY,headZ,11,dt);
 applyPlayerArmIK(dt,phase,moving,sprint);

 if(playerVrmRoot){
   playerVrmRoot.rotation.x=lerpAngle(playerVrmRoot.rotation.x,playerVrmRootRest.rotation.x,1-Math.exp(-dt*18));
   playerVrmRoot.rotation.z=lerpAngle(playerVrmRoot.rotation.z,playerVrmRootRest.rotation.z,1-Math.exp(-dt*18));
   playerVrmRoot.position.y=THREE.MathUtils.lerp(playerVrmRoot.position.y,playerVrmRootRest.y,1-Math.exp(-dt*20));
 }
 if(state.rolling>0){
   const rp=clamp(state.rollElapsed/ROLL_DURATION,0,1),spinP=motionSmooth(.11,.82,rp),lean=state.rollLean||1;
   const tuck=Math.sin(clamp((rp-.035)/.9,0,1)*Math.PI),shoulder=Math.sin(clamp((rp-.06)/.72,0,1)*Math.PI);
   // Full ground rotation is carried on an oblique shoulder axis; the skeleton curl does most of the visible work.
   playerVrmMotion.rotation.x=-spinP*Math.PI*2;
   playerVrmMotion.rotation.y=lean*Math.sin(spinP*Math.PI)*.12;
   playerVrmMotion.rotation.z=lean*.34*shoulder;
   playerVrmMotion.position.y=playerVrmMotionRest.y-.46*tuck+.018*Math.sin(spinP*Math.PI*2);
   playerVrmMotion.position.z=-.12*Math.sin(spinP*Math.PI*2);
 }else{
   playerVrmMotion.rotation.x=lerpAngle(playerVrmMotion.rotation.x,0,1-Math.exp(-dt*24));
   playerVrmMotion.rotation.y=lerpAngle(playerVrmMotion.rotation.y,0,1-Math.exp(-dt*24));
   playerVrmMotion.rotation.z=lerpAngle(playerVrmMotion.rotation.z,0,1-Math.exp(-dt*24));
   const walkBob=moving&&state.attack<=0&&!input.guard&&state.stagger<=0&&!state.dead?Math.abs(Math.sin(phase))*(sprint?.035:.022):0;
   playerVrmMotion.position.y=THREE.MathUtils.lerp(playerVrmMotion.position.y,playerVrmMotionRest.y+walkBob,1-Math.exp(-dt*22));
   playerVrmMotion.position.z=THREE.MathUtils.lerp(playerVrmMotion.position.z,0,1-Math.exp(-dt*22));
 }
 playerVrm?.update?.(dt);
 player.updateMatrixWorld(true);playerVrmRoot?.updateMatrixWorld(true);
 updatePlayerShieldRig(dt);
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

const BOSS_GIANT_SCALE=BOSS_VARIANT===1?2.0:1.0;
const BOSS_ENGAGE_SCALE=BOSS_VARIANT===1?1.55:1.0;
const BOSS_ARM_RADIUS_SCALE=1.28;
const BOSS_SHOCKWAVE_SCALE=1.4;
const boss=new THREE.Group();
boss.scale.setScalar(BOSS_GIANT_SCALE);
scene.add(boss);
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
const bossBustBones={},bossBustRest={};
const animeBossArmParts={
 leftUpper:null,leftLower:null,leftHand:null,
 rightUpper:null,rightLower:null,rightHand:null
};

function extractSkinnedPart(bodyNode,side,kind){
 let src=null;
 if(bodyNode?.isSkinnedMesh)src=bodyNode;
 else bodyNode?.traverse?.(o=>{if(!src&&o.isSkinnedMesh)src=o});
 if(!src||!src.geometry?.attributes?.skinIndex||!src.geometry?.attributes?.skinWeight||!src.skeleton)return null;

 src.updateMatrixWorld(true);src.skeleton.update?.();

 const g=src.geometry,skinIndex=g.attributes.skinIndex,skinWeight=g.attributes.skinWeight;
 const pos=g.attributes.position,uv=g.attributes.uv||null,bones=src.skeleton.bones||[];
 const sideKey=side==='left'?'_L_':'_R_',allowed=new Set();

 bones.forEach((b,i)=>{
   const n=b.name||'';
   if(!n.includes(sideKey))return;
   if(kind==='upper'&&n.includes('UpperArm'))allowed.add(i);
   if(kind==='lower'&&n.includes('LowerArm'))allowed.add(i);
   if(kind==='hand'&&(n.includes('Hand')||n.includes('Thumb')||n.includes('Index')||n.includes('Middle')||n.includes('Ring')||n.includes('Little')))allowed.add(i);
 });
 if(!allowed.size)return null;

 const belongs=v=>{
   let sum=0,sz=Math.min(4,skinIndex.itemSize,skinWeight.itemSize);
   for(let k=0;k<sz;k++){
     const bi=skinIndex.array[v*skinIndex.itemSize+k],w=skinWeight.array[v*skinWeight.itemSize+k];
     if(allowed.has(bi))sum+=w;
   }
   return sum>(kind==='hand'?.16:.2);
 };

 const oldIndex=g.index,count=oldIndex?oldIndex.count:pos.count;
 const outPos=[],outUv=[];
 const bakeVertex=(vi)=>{
   const v=new THREE.Vector3().fromBufferAttribute(pos,vi);
   if(typeof src.applyBoneTransform==='function')src.applyBoneTransform(vi,v);
   outPos.push(v.x,v.y,v.z);
   if(uv){outUv.push(uv.getX(vi),uv.getY(vi))}
 };
 for(let i=0;i<count;i+=3){
   const a=oldIndex?oldIndex.getX(i):i,b=oldIndex?oldIndex.getX(i+1):i+1,d=oldIndex?oldIndex.getX(i+2):i+2;
   const hit=(belongs(a)?1:0)+(belongs(b)?1:0)+(belongs(d)?1:0);
   if(hit<2)continue;
   bakeVertex(a);bakeVertex(b);bakeVertex(d);
 }
 if(outPos.length<36)return null;

 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(outPos,3));
 if(outUv.length)geo.setAttribute('uv',new THREE.Float32BufferAttribute(outUv,2));
 geo.computeVertexNormals();geo.computeBoundingBox();

 const center=new THREE.Vector3();geo.boundingBox.getCenter(center);
 geo.translate(-center.x,-center.y,-center.z);

 // VRoid T-pose: left arm points +X, right arm -X. Rotate each donor limb onto +Y.
 geo.rotateZ(side==='left'?Math.PI/2:-Math.PI/2);
 geo.computeBoundingBox();
 const size=new THREE.Vector3();geo.boundingBox.getSize(size);
 const len=Math.max(.001,kind==='hand'?Math.max(size.x,size.y,size.z):size.y);
 geo.scale(1/len,1/len,1/len);
 geo.computeVertexNormals();

 const srcMat=Array.isArray(src.material)?src.material[0]:src.material;
 const donorColor=srcMat?.color?.clone?.()||new THREE.Color(0xe0b1aa);
 const mat=new THREE.MeshStandardMaterial({
   color:donorColor,roughness:.6,metalness:0,
   transparent:false,opacity:1,depthWrite:true,depthTest:true,
   alphaTest:0,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(geo,mat);
 mesh.castShadow=mesh.receiveShadow=true;
 const group=new THREE.Group();group.add(mesh);group.userData.kind=kind;
 return group;
}
function cloneBossDonorPart(side,kind){
 const src=animeBossArmParts[side+(kind==='upper'?'Upper':kind==='lower'?'Lower':'Hand')];
 if(!src)return null;
 const g=src.clone(true);
 g.traverse(o=>{
   if(o.isMesh){
     o.geometry=o.geometry.clone();
     o.material=o.material?.clone?.()||o.material;
     if(o.material){o.material.transparent=false;o.material.opacity=1;o.material.depthWrite=true;o.material.depthTest=true}
     o.castShadow=o.receiveShadow=true;
   }
 });
 return g;
}

function stripSkinnedBoneRegions(root,patterns,threshold=.34){
 root?.traverse?.(obj=>{
   if(!obj.isSkinnedMesh||!obj.geometry?.attributes?.skinIndex||!obj.geometry?.attributes?.skinWeight||!obj.skeleton)return;
   const geo=obj.geometry.clone(),si=geo.attributes.skinIndex,sw=geo.attributes.skinWeight;
   const banned=new Set();
   (obj.skeleton.bones||[]).forEach((b,i)=>{
     const n=(b.name||'').toLowerCase();
     if(patterns.some(p=>n.includes(p)))banned.add(i);
   });
   if(!banned.size)return;
   const weighted=v=>{
     let sum=0,sz=Math.min(4,si.itemSize,sw.itemSize);
     for(let k=0;k<sz;k++){
       const bi=si.array[v*si.itemSize+k],w=sw.array[v*sw.itemSize+k];
       if(banned.has(bi))sum+=w;
     }
     return sum>=threshold;
   };
   const idx=geo.index,out=[],count=idx?idx.count:geo.attributes.position.count;
   for(let i=0;i<count;i+=3){
     const a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,d=idx?idx.getX(i+2):i+2;
     const bannedVerts=(weighted(a)?1:0)+(weighted(b)?1:0)+(weighted(d)?1:0);
     if(bannedVerts<2)out.push(a,b,d);
   }
   geo.setIndex(out);geo.computeVertexNormals();geo.computeBoundingSphere();
   obj.geometry=geo;
 });
}
function stripSkinnedSpatialRegions(root,boneNames,radiusScale=1.0){
 root?.updateMatrixWorld?.(true);
 root?.traverse?.(obj=>{
   if(!obj.isSkinnedMesh||!obj.geometry?.attributes?.position)return;
   obj.updateMatrixWorld(true);
   const centers=[];
   for(const cfg of boneNames){
     const bone=root.getObjectByName(cfg.name);
     if(!bone)continue;
     const wp=new THREE.Vector3();bone.getWorldPosition(wp);
     const lp=obj.worldToLocal(wp.clone());
     centers.push({p:lp,r:cfg.r*radiusScale});
   }
   if(!centers.length)return;
   const geo=obj.geometry.clone(),pos=geo.attributes.position,idx=geo.index,out=[];
   const near=v=>{
     const p=new THREE.Vector3().fromBufferAttribute(pos,v);
     return centers.some(cn=>p.distanceToSquared(cn.p)<=cn.r*cn.r);
   };
   const count=idx?idx.count:pos.count;
   for(let i=0;i<count;i+=3){
     const a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,d=idx?idx.getX(i+2):i+2;
     const hits=(near(a)?1:0)+(near(b)?1:0)+(near(d)?1:0);
     if(hits<1)out.push(a,b,d);
   }
   geo.setIndex(out);geo.computeVertexNormals();geo.computeBoundingSphere();
   obj.geometry=geo;
 });
}
function stripVisibleBossArms(root){
 root?.traverse?.(src=>{
   if(!src.isSkinnedMesh||!src.geometry?.attributes?.skinIndex||!src.geometry?.attributes?.skinWeight||!src.skeleton)return;

   const geo=src.geometry.clone(),si=geo.attributes.skinIndex,sw=geo.attributes.skinWeight;
   const banned=new Set();
   (src.skeleton.bones||[]).forEach((b,i)=>{
     const n=(b.name||'').toLowerCase();
     if(n.includes('shoulder')||n.includes('upperarm')||n.includes('lowerarm')||n.includes('hand')||
        n.includes('thumb')||n.includes('index')||n.includes('middle')||n.includes('ring')||n.includes('little'))banned.add(i);
   });
   if(!banned.size)return;

   const armWeighted=v=>{
     let sum=0,sz=Math.min(4,si.itemSize,sw.itemSize);
     for(let k=0;k<sz;k++){
       const bi=si.array[v*si.itemSize+k],w=sw.array[v*sw.itemSize+k];
       if(banned.has(bi))sum+=w;
     }
     return sum>.075;
   };

   const oldIndex=geo.index,out=[],count=oldIndex?oldIndex.count:geo.attributes.position.count;
   for(let i=0;i<count;i+=3){
     const a=oldIndex?oldIndex.getX(i):i,b=oldIndex?oldIndex.getX(i+1):i+1,d=oldIndex?oldIndex.getX(i+2):i+2;
     const hit=(armWeighted(a)?1:0)+(armWeighted(b)?1:0)+(armWeighted(d)?1:0);
     if(hit<2)out.push(a,b,d);
   }
   geo.setIndex(out);geo.computeVertexNormals();geo.computeBoundingSphere();
   src.geometry=geo;
 });
}

function stripWorldSphereRegions(root,regions){
 root?.updateMatrixWorld?.(true);
 const centers=[];
 for(const cfg of regions){
   const bone=root.getObjectByName(cfg.name);
   if(!bone)continue;
   const p=new THREE.Vector3();bone.getWorldPosition(p);
   centers.push({p,r:cfg.r});
 }
 if(!centers.length)return;
 root.traverse(obj=>{
   if(!obj.isSkinnedMesh||!obj.geometry?.attributes?.position)return;
   obj.updateMatrixWorld(true);
   const geo=obj.geometry.clone(),pos=geo.attributes.position,oldIndex=geo.index,out=[];
   const vWorld=new THREE.Vector3();
   const near=v=>{
     vWorld.fromBufferAttribute(pos,v).applyMatrix4(obj.matrixWorld);
     return centers.some(cn=>vWorld.distanceToSquared(cn.p)<=cn.r*cn.r);
   };
   const count=oldIndex?oldIndex.count:pos.count;
   for(let i=0;i<count;i+=3){
     const a=oldIndex?oldIndex.getX(i):i,b=oldIndex?oldIndex.getX(i+1):i+1,d=oldIndex?oldIndex.getX(i+2):i+2;
     if(!(near(a)||near(b)||near(d)))out.push(a,b,d);
   }
   geo.setIndex(out);geo.computeVertexNormals();geo.computeBoundingSphere();
   obj.geometry=geo;
 });
}

function stripWorldBoneCapsule(root,fromBoneName,toBoneName,extendWorld=2.8,radiusWorld=1.45){
 root?.updateMatrixWorld?.(true);
 const fromBone=root.getObjectByName(fromBoneName),toBone=root.getObjectByName(toBoneName);
 if(!fromBone||!toBone)return;
 const aWorld=new THREE.Vector3(),headWorld=new THREE.Vector3();
 fromBone.getWorldPosition(aWorld);toBone.getWorldPosition(headWorld);
 const dir=headWorld.clone().sub(aWorld);
 if(dir.lengthSq()<1e-8)return;
 dir.normalize();
 const bWorld=headWorld.clone().addScaledVector(dir,extendWorld);
 const ab=bWorld.clone().sub(aWorld),den=Math.max(1e-8,ab.lengthSq());

 root.traverse(obj=>{
   if(!obj.isSkinnedMesh||!obj.geometry?.attributes?.position)return;
   obj.updateMatrixWorld(true);
   const geo=obj.geometry.clone(),pos=geo.attributes.position,oldIndex=geo.index,out=[];
   const p=new THREE.Vector3(),ap=new THREE.Vector3(),q=new THREE.Vector3();
   const inside=v=>{
     p.fromBufferAttribute(pos,v).applyMatrix4(obj.matrixWorld);
     ap.copy(p).sub(aWorld);
     const t=clamp(ap.dot(ab)/den,0,1);
     q.copy(aWorld).addScaledVector(ab,t);
     return p.distanceToSquared(q)<=radiusWorld*radiusWorld;
   };
   const count=oldIndex?oldIndex.count:pos.count;
   for(let i=0;i<count;i+=3){
     const ia=oldIndex?oldIndex.getX(i):i,ib=oldIndex?oldIndex.getX(i+1):i+1,id=oldIndex?oldIndex.getX(i+2):i+2;
     if(!(inside(ia)||inside(ib)||inside(id)))out.push(ia,ib,id);
   }
   geo.setIndex(out);geo.computeVertexNormals();geo.computeBoundingSphere();
   obj.geometry=geo;
 });
}

function stripBoneForwardCapsule(root,fromBoneName,toBoneName,extend=1.2,radius=.7){
 root?.updateMatrixWorld?.(true);
 const fromBone=root.getObjectByName(fromBoneName),toBone=root.getObjectByName(toBoneName);
 if(!fromBone||!toBone)return;
 const fw=new THREE.Vector3(),tw=new THREE.Vector3();
 fromBone.getWorldPosition(fw);toBone.getWorldPosition(tw);
 const dir=tw.clone().sub(fw);
 if(dir.lengthSq()<1e-6)return;
 dir.normalize();
 const endWorld=tw.clone().addScaledVector(dir,extend);

 root.traverse(obj=>{
   if(!obj.isSkinnedMesh||!obj.geometry?.attributes?.position)return;
   obj.updateMatrixWorld(true);
   const a=obj.worldToLocal(fw.clone()),b=obj.worldToLocal(endWorld.clone());
   const geo=obj.geometry.clone(),pos=geo.attributes.position,oldIndex=geo.index,out=[];
   const ab=b.clone().sub(a),den=Math.max(1e-8,ab.lengthSq());
   const inCapsule=v=>{
     const p=new THREE.Vector3().fromBufferAttribute(pos,v),ap=p.clone().sub(a);
     const t=clamp(ap.dot(ab)/den,0,1);
     const q=a.clone().addScaledVector(ab,t);
     return p.distanceToSquared(q)<=radius*radius;
   };
   const count=oldIndex?oldIndex.count:pos.count;
   for(let i=0;i<count;i+=3){
     const ia=oldIndex?oldIndex.getX(i):i,ib=oldIndex?oldIndex.getX(i+1):i+1,id=oldIndex?oldIndex.getX(i+2):i+2;
     const hit=(inCapsule(ia)?1:0)+(inCapsule(ib)?1:0)+(inCapsule(id)?1:0);
     if(hit<1)out.push(ia,ib,id);
   }
   geo.setIndex(out);geo.computeVertexNormals();geo.computeBoundingSphere();
   obj.geometry=geo;
 });
}

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
function applyBossArmIK(dt){
 if(!animeBossBones.leftUpperArm||!animeBossBones.rightUpperArm)return;
 boss.updateMatrixWorld(true);animeHeadPivot?.updateMatrixWorld(true);
 const attacking=state.bossState?.startsWith?.('arm_');
 for(const side of ['left','right']){
   const sx=side==='left'?-1:1,upper=animeBossBones[side+'UpperArm'];
   const shoulder=new THREE.Vector3();upper.getWorldPosition(shoulder);
   const reach=getArmReach(animeBossBones,side);
   let handTarget,elbowTarget;
   if(attacking&&dorsalArms?.length){
     const rig=dorsalArms[side==='left'?0:1],rw=new THREE.Vector3();rig.wrist.getWorldPosition(rw);
     const dir=rw.clone().sub(shoulder);
     if(dir.lengthSq()<1e-6)dir.set(sx,-1,0);
     const d=Math.min(reach*.72,dir.length()*.48);
     dir.normalize();
     handTarget=shoulder.clone().addScaledVector(dir,d);
     const outward=new THREE.Vector3(sx,0,0).applyQuaternion(boss.quaternion);
     elbowTarget=shoulder.clone().addScaledVector(dir,d*.52).addScaledVector(outward,reach*.26);
     elbowTarget.y+=reach*.06;
   }else{
     const localDown=new THREE.Vector3(sx*reach*.15,-reach*.84,.06).applyQuaternion(boss.quaternion);
     const localElbow=new THREE.Vector3(sx*reach*.3,-reach*.42,.04).applyQuaternion(boss.quaternion);
     handTarget=shoulder.clone().add(localDown);
     elbowTarget=shoulder.clone().add(localElbow);
   }
   solveArmCCD(animeBossBones,side,handTarget,elbowTarget,1-Math.exp(-dt*24));
 }
}


async function loadFemaleArmDonor(){
 if(BOSS_VARIANT!==1)return;
 try{
   const {VRMLoaderPlugin,VRMUtils}=await import('@pixiv/three-vrm');
   const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));
   loader.load('./assets/models/boss/female-arm-donor.vrm',gltf=>{
     const vrm=gltf.userData?.vrm||null;
     if(vrm)VRMUtils.rotateVRM0(vrm);
     const root=vrm?.scene||gltf.scene;
     let bodyNode=root.getObjectByName('Body');
     if(!bodyNode){
       root.traverse(o=>{if(!bodyNode&&o.isSkinnedMesh)bodyNode=o});
     }
     const parts={
       leftUpper:extractSkinnedPart(bodyNode,'left','upper'),
       leftLower:extractSkinnedPart(bodyNode,'left','lower'),
       leftHand:extractSkinnedPart(bodyNode,'left','hand'),
       rightUpper:extractSkinnedPart(bodyNode,'right','upper'),
       rightLower:extractSkinnedPart(bodyNode,'right','lower'),
       rightHand:extractSkinnedPart(bodyNode,'right','hand')
     };
     const ready=Object.values(parts).every(Boolean);
     if(ready){
       Object.assign(animeBossArmParts,parts);
       tryBuildBossMonsterArms();
       console.info('Bellamore: dedicated CC0 female upper/lower/hand donor parts loaded');
     }else console.warn('Female arm donor loaded but limb-part extraction failed',parts);
   },undefined,err=>console.warn('Female arm donor unavailable.',err));
 }catch(err){console.warn('three-vrm unavailable for arm donor.',err)}
}
loadFemaleArmDonor();

async function loadAnimeBossUpper(){
 if(BOSS_VARIANT!==1)return;
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
     // Keep torso/bust/hair/face, but remove the authored arms completely.
     stripVisibleBossArms(root);

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
     for(const armBone of ['leftShoulder','rightShoulder','leftUpperArm','rightUpperArm']){
       const b=animeBossBones[armBone];
       if(b){b.visible=false;b.scale.set(.00001,.00001,.00001);}
     }
     setTimeout(tryBuildBossMonsterArms,0);

     // Centaur construction: keep the entire authored upper body visible, collapse only the human legs.
     for(const name of ['J_Bip_L_UpperLeg','J_Bip_R_UpperLeg']){
       const b=root.getObjectByName(name);
       if(b)b.scale.set(.001,.001,.001);
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
     for(const [key,name] of Object.entries({
       left1:'J_Sec_L_Bust1',right1:'J_Sec_R_Bust1',
       left2:'J_Sec_L_Bust2',right2:'J_Sec_R_Bust2'
     })){
       const b=root.getObjectByName(name);
       if(b){
         bossBustBones[key]=b;
         bossBustRest[key]={position:b.position.clone(),rotation:b.rotation.clone()};
       }
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
if(BOSS_VARIANT===1)assetLoader.load('./assets/models/boss/centaur-beast.glb',gltf=>{
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
 // Centaur lower body only: remove the horse head/neck in world space so scale cannot leave a floating muzzle.
 stripSkinnedBoneRegions(bossLowerVisual,['head','neck1','neck2','neck3','ear1','ear2','ear3','ear4'],.04);
 stripWorldSphereRegions(bossLowerVisual,[
   {name:'Head',r:1.85},
   {name:'Neck3',r:1.45},
   {name:'Neck2',r:1.22},
   {name:'Neck1',r:.98},
   {name:'Ear1.L',r:.72},{name:'Ear1.R',r:.72}
 ]);
 // Neck1 -> Head direction continues far beyond the skull, deleting nose/muzzle fragments as well.
 stripWorldBoneCapsule(bossLowerVisual,'Neck1','Head',3.15,1.52);
 // Keep the previous local-space trim as a secondary safety pass.
 stripSkinnedSpatialRegions(bossLowerVisual,[
   {name:'Head',r:1.45},
   {name:'Neck3',r:1.05},
   {name:'Neck2',r:.88},
   {name:'Neck1',r:.7},
   {name:'Ear1.L',r:.52},{name:'Ear1.R',r:.52}
 ],1.0);
 stripBoneForwardCapsule(bossLowerVisual,'Neck1','Head',2.45,1.12);
 for(const n of ['Head','Neck1','Neck2','Neck3','Ear1.L','Ear2.L','Ear3.L','Ear4.L','Ear1.R','Ear2.R','Ear3.R','Ear4.R']){
   const bone=bossLowerVisual.getObjectByName(n);if(bone){bone.visible=false;bone.scale.setScalar(.00001);}
 }
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
const bossSpikeProjectiles=[];
function makeBossSpikeProjectile(){
 const root=cloneMonsterSpikeVisual();
 if(root){
   root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false}});
   root.scale.setScalar(.42);
   return root;
 }
 const fallback=new THREE.Mesh(
   new THREE.ConeGeometry(.16,.9,7),
   new THREE.MeshStandardMaterial({color:0x352c34,roughness:.66,metalness:.08})
 );
 fallback.castShadow=true;
 return fallback;
}
function spawnBossSpikeProjectile(origin,dir,speed=11.5,dmg=19){
 const obj=makeBossSpikeProjectile();
 const d=dir.clone().normalize();
 obj.position.copy(origin);
 obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d);
 scene.add(obj);
 bossSpikeProjectiles.push({obj,vel:d.multiplyScalar(speed),dmg,life:4.2});
}
function bossSpikeMuzzle(){
 const p=new THREE.Vector3(0,3.65,.85);
 boss.localToWorld(p);
 return p;
}
function fireSpikeAtPlayer(angle=0,speed=11.5,dmg=19){
 const origin=bossSpikeMuzzle();
 const target=player.position.clone().add(new THREE.Vector3(0,1.0,0));
 const dir=target.sub(origin).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),angle);
 spawnBossSpikeProjectile(origin,dir,speed,dmg);
}
function fireSpikeFan(){
 const angles=[-.56,-.38,-.2,0,.2,.38,.56];
 for(const a of angles)fireSpikeAtPlayer(a,9.8,16);
 spawnSparks(bossSpikeMuzzle(),18,4.2);
}
function updateBossSpikeProjectiles(dt){
 const playerPoint=player.position.clone().add(new THREE.Vector3(0,1.0,0));
 for(let i=bossSpikeProjectiles.length-1;i>=0;i--){
   const p=bossSpikeProjectiles[i];
   p.life-=dt;
   p.obj.position.addScaledVector(p.vel,dt);
   p.obj.rotation.y+=dt*8;
   if(p.obj.position.distanceTo(playerPoint)<.72){
     if(state.invuln<=0)hurtPlayer(p.dmg,18,false);
     else flash('회피',.14);
     p.life=0;
   }
   if(p.life<=0||p.obj.position.length()>45){
     scene.remove(p.obj);
     p.obj.traverse?.(o=>{if(o.isMesh){o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());else o.material?.dispose?.()}});
     bossSpikeProjectiles.splice(i,1);
   }
 }
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
 if(!monsterSpikeSource||bossMonsterArms.length||!dorsalArms?.length)return;
 const ready=['leftUpper','leftLower','leftHand','rightUpper','rightLower','rightHand'].every(k=>!!animeBossArmParts[k]);
 if(!ready)return;

 for(const side of ['left','right']){
   const sx=side==='left'?-1:1,rig=dorsalArms[side==='left'?0:1];
   const root=new THREE.Group();
   const upper=cloneBossDonorPart(side,'upper');
   const lower=cloneBossDonorPart(side,'lower');
   const hand=cloneBossDonorPart(side,'hand');
   if(!upper||!lower||!hand)continue;

   upper.userData.baseThickness=1.34;
   lower.userData.baseThickness=1.22;
   hand.userData.baseScale=.82;

   const upperArmor=new THREE.Group(),lowerArmor=new THREE.Group(),elbowArmor=new THREE.Group();
   for(const [ag,gi] of [[upperArmor,0],[lowerArmor,1]]){
     for(let i=-1;i<=1;i++){
       const spike=cloneMonsterSpikeVisual();
       if(!spike)continue;
       spike.position.set(i*.17,.04,-.22);
       spike.scale.set(.14+.025*gi,.24+.04*gi,.14+.025*gi);
       spike.rotation.x=-.38;spike.rotation.z=i*.2;
       ag.add(spike);
     }
   }
   const elbowSpike=cloneMonsterSpikeVisual();
   if(elbowSpike){
     elbowSpike.scale.set(.24,.4,.24);
     elbowSpike.rotation.x=-.6;
     elbowArmor.add(elbowSpike);
   }

   boss.add(root);root.add(upper,lower,hand,upperArmor,lowerArmor,elbowArmor);
   bossMonsterArms.push({side,sx,root,upper,lower,hand,upperArmor,lowerArmor,elbowArmor,rig});
 }
 console.info('Bellamore: donor female arms mapped directly to combat shoulder/elbow/wrist rig');
}
function updateBossMonsterArmVisuals(){
 if(!bossMonsterArms.length)return;
 boss.updateMatrixWorld(true);

 for(const a of bossMonsterArms){
   const sw=new THREE.Vector3(),ew=new THREE.Vector3(),ww=new THREE.Vector3();
   a.rig.shoulder.getWorldPosition(sw);
   a.rig.elbow.getWorldPosition(ew);
   a.rig.wrist.getWorldPosition(ww);

   const p0=boss.worldToLocal(sw.clone()),p1=boss.worldToLocal(ew.clone()),p2=boss.worldToLocal(ww.clone());

   // Donor upper/lower limbs exactly follow the original boss combat rig.
   orientSegment(a.upper,p0,p1,a.upper.userData.baseThickness||1.34);
   orientSegment(a.lower,p1,p2,a.lower.userData.baseThickness||1.22);
   orientSegment(a.upperArmor,p0,p1,1.0);
   orientSegment(a.lowerArmor,p1,p2,.94);

   a.elbowArmor.position.copy(p1);
   a.elbowArmor.scale.setScalar(.92);

   a.hand.position.copy(p2);
   const foreDir=p2.clone().sub(p1).normalize();
   a.hand.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),foreDir);
   a.hand.scale.setScalar(a.hand.userData.baseScale||.82);

   const active=state?.bossState?.startsWith?.('arm_');
   const pulse=active?1.025+Math.sin(state.time*12)*.012:1;
   a.root.scale.setScalar(pulse);
 }
}

const bossSpikeTargets=[];
if(BOSS_VARIANT===1)assetLoader.load('./assets/models/boss/monster-spikes.glb',gltf=>{
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
   bossSpikeTargets.push({obj:root,hp:i<2?BOSS1_PART_HP.spikeHeavy:BOSS1_PART_HP.spikeLight,max:i<2?BOSS1_PART_HP.spikeHeavy:BOSS1_PART_HP.spikeLight,broken:false});
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
 if(e.code==='KeyR')tryDrinkPotion();
 if(e.code==='KeyE'&&!e.repeat){e.preventDefault();tryStrongAttack()}
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

const ui={hp:document.querySelector('#hp'),stamina:document.querySelector('#stamina'),posture:document.querySelector('#posture'),bossHp:document.querySelector('#bossHp'),bossPosture:document.querySelector('#bossPosture'),msg:document.querySelector('#message'),danger:document.querySelector('#danger'),head:document.querySelector('#headPart'),leg:document.querySelector('#legPart'),spike:document.querySelector('#spikePart'),tail:document.querySelector('#tailPart'),weapon:document.querySelector('#weaponHud'),lockDot:document.querySelector('#lockDot'),bossName:document.querySelector('#bossName'),parts:document.querySelector('#parts')};
const hpLabel=ui.hp?.parentElement?.querySelector('span'),staminaLabel=ui.stamina?.parentElement?.querySelector('span');
const potionHud=document.createElement('div');
potionHud.style.cssText='position:fixed;left:24px;bottom:145px;z-index:30;color:#e8c56a;background:rgba(8,8,8,.72);border:1px solid #8e6d31;padding:7px 12px;font:600 13px sans-serif;letter-spacing:.08em;pointer-events:none';
document.body.appendChild(potionHud);

const state={
 hp:PLAYER_MAX_HP,hpMax:PLAYER_MAX_HP,posture:0,stamina:PLAYER_MAX_STAMINA,staminaMax:PLAYER_MAX_STAMINA,staminaRegenDelay:0,exhausted:0,damageGrace:0,potions:3,potionTimer:0,potionHealDone:false,attack:0,attackDuration:0,attackHit:false,attackStep:0,attackQueued:false,attackStrong:false,comboGrace:0,rolling:0,rollElapsed:0,rollLean:1,rollDir:new THREE.Vector3(),invuln:0,deflect:0,parryAnim:0,guardBlend:0,stagger:0,dead:false,
 bossMaxHp:BOSS_MAX_HP[BOSS_VARIANT],bossHp:BOSS_MAX_HP[BOSS_VARIANT],bossPosture:0,bossPostureGrace:0,bossState:'idle',bossTimer:1.0,bossPunish:0,bossHit:false,bossStagger:0,bossPatternStep:0,bossFxStamp:'',bossBustImpulse:0,bossAttackTarget:new THREE.Vector3(),bossAttackTargetLocked:false,potionPunishQueued:false,potionPunishKind:'spike_triple',time:0,shake:0,impactFov:0,impactRoll:0,impactFlash:0,hitstop:0,
 headHp:BOSS1_PART_HP.head,legHp:BOSS1_PART_HP.leg,tailHp:BOSS1_PART_HP.tail,tailBroken:false,legBroken:false,headBroken:false,danger:false,reaction:0,reactionZone:'body'
};

/* -------------------------------------------------------------------------- */
/* Boss 02: Ember Princess Arcelia                                            */
/* Full-body anime VRM + independent multi-form / phase-2 combat state machine */
/* -------------------------------------------------------------------------- */
const boss2Root=new THREE.Group();
boss2Root.name='ArceliaRoot';
boss2Root.visible=BOSS_VARIANT===2;
boss.add(boss2Root);

let boss2Visual=null,boss2VRM=null,boss2Ready=false;
const boss2Bones={},boss2Rest={},boss2RenderBones={},boss2BustNodes=[];
const boss2Projectiles=[],boss2Fx=[];
const boss2Fired=new Set(),boss2MeleeRequests=[];
const boss2WeaponTrace={valid:false,base:new THREE.Vector3(),tip:new THREE.Vector3()};
const boss2HandTrace={valid:false,point:new THREE.Vector3()};
const boss2Aura=new THREE.PointLight(0xff5b35,7.5,12,2);
boss2Aura.position.set(0,1.65,.25);
boss2Root.add(boss2Aura);
const boss2HaloMat=new THREE.MeshBasicMaterial({color:0xff7148,transparent:true,opacity:.22,depthWrite:false});
const boss2Halo=new THREE.Mesh(new THREE.TorusGeometry(1.05,.025,7,40),boss2HaloMat);
boss2Halo.rotation.x=Math.PI/2;boss2Halo.position.y=.03;boss2Root.add(boss2Halo);

// Browser-safe fallback silhouette: always visible until the VRM is fully ready.
const boss2Fallback=new THREE.Group();
boss2Fallback.name='ArceliaFallback';
boss2Root.add(boss2Fallback);
const b2FallbackSkin=new THREE.MeshStandardMaterial({color:0xd9b0a5,roughness:.55,metalness:.02});
const b2FallbackCloth=new THREE.MeshStandardMaterial({color:0x251823,roughness:.72,metalness:.08,emissive:0x35151c,emissiveIntensity:.35});
const b2FallbackHair=new THREE.MeshStandardMaterial({color:0x17121d,roughness:.8,metalness:.02});
part(boss2Fallback,new THREE.CapsuleGeometry(.36,.82,5,8),b2FallbackCloth,[0,1.15,0]);
part(boss2Fallback,new THREE.SphereGeometry(.31,14,10),b2FallbackSkin,[0,1.97,.02]);
part(boss2Fallback,new THREE.SphereGeometry(.335,14,10),b2FallbackHair,[0,2.06,-.06],[0,0,0],[1.02,.82,1.04]);
part(boss2Fallback,new THREE.BoxGeometry(.7,.62,.34),b2FallbackCloth,[0,1.43,0]);
for(const sx of [-1,1]){
  part(boss2Fallback,new THREE.CapsuleGeometry(.095,.58,4,7),b2FallbackSkin,[sx*.48,1.32,0],[0,0,sx*.06]);
  part(boss2Fallback,new THREE.CapsuleGeometry(.11,.72,4,7),b2FallbackCloth,[sx*.19,.56,0],[0,0,sx*.025]);
}
const b2FallbackCape=part(boss2Fallback,new THREE.PlaneGeometry(.86,1.2),b2FallbackCloth,[0,1.22,-.25],[0,0,0]);
b2FallbackCape.material.side=THREE.DoubleSide;

const boss2WeaponRoot=new THREE.Group();
boss2WeaponRoot.visible=false;
scene.add(boss2WeaponRoot);
const boss2SwordMat=new THREE.MeshStandardMaterial({color:0xe9e3da,metalness:.9,roughness:.18,emissive:0x7d2518,emissiveIntensity:.55});
const boss2SpearMat=new THREE.MeshStandardMaterial({color:0xe3dfd5,metalness:.86,roughness:.22,emissive:0x214f7d,emissiveIntensity:.42});
const boss2Sword=new THREE.Group();
boss2Sword.add(new THREE.Mesh(new THREE.BoxGeometry(.135,2.18,.075),boss2SwordMat));
boss2Sword.children[0].position.y=1.12;
const boss2Guard=new THREE.Mesh(new THREE.BoxGeometry(.62,.065,.14),boss2SwordMat);
boss2Guard.position.y=.06;boss2Sword.add(boss2Guard);
const boss2SwordGrip=new THREE.Mesh(new THREE.CylinderGeometry(.05,.058,.52,8),new THREE.MeshStandardMaterial({color:0x251712,roughness:.72}));
boss2SwordGrip.position.y=-.23;boss2Sword.add(boss2SwordGrip);
boss2WeaponRoot.add(boss2Sword);
const boss2Spear=new THREE.Group();
const boss2Shaft=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,3.75,8),new THREE.MeshStandardMaterial({color:0x392719,roughness:.78}));
boss2Shaft.position.y=1.32;boss2Spear.add(boss2Shaft);
const boss2Tip=new THREE.Mesh(new THREE.ConeGeometry(.11,.52,7),boss2SpearMat);
boss2Tip.position.y=3.18;boss2Spear.add(boss2Tip);
boss2WeaponRoot.add(boss2Spear);

state.boss2Phase=1;
state.boss2Style='sword';
state.boss2AttackCount=0;
state.boss2FinalUsed=false;
state.boss2DeadPose=0;
state.boss2HitReact=0;

if(BOSS_VARIANT===2){
  scene.background.set(0x17131a);
  scene.fog.color.set(0x17131a);
  fire.color.set(0xff5d3c);fire.intensity=10;
  moon.color.set(0xcac3ff);moon.intensity=3.3;
  if(ui.bossName)ui.bossName.textContent=BOSS2_NAME;
}

function cacheBoss2Bone(name,node){
 if(!node)return;
 boss2Bones[name]=node;
 boss2Rest[name]={rotation:node.rotation.clone(),position:node.position.clone(),scale:node.scale.clone()};
}
function setBoss2Bone(name,rx=0,ry=0,rz=0,speed=12,dt=.016){
 const b=boss2Bones[name],r=boss2Rest[name];if(!b||!r)return;
 const a=1-Math.exp(-dt*speed);
 b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,r.rotation.x+rx,a);
 b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,r.rotation.y+ry,a);
 b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,r.rotation.z+rz,a);
}
function syncBoss2Rig(dt=0){
 if(!boss2VRM)return;
 boss2VRM.update?.(Math.max(0,dt));
 boss2Visual?.updateMatrixWorld?.(true);
}
function resetBoss2Pose(dt){
 for(const [name,b] of Object.entries(boss2Bones)){
   const r=boss2Rest[name];if(!r)continue;
   const a=1-Math.exp(-dt*11);
   b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,r.rotation.x,a);
   b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,r.rotation.y,a);
   b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,r.rotation.z,a);
 }
}
async function loadBoss2Avatar(){
 if(BOSS_VARIANT!==2)return;
 try{
   const {VRMLoaderPlugin,VRMUtils}=await import('@pixiv/three-vrm');
   const loader=new GLTFLoader();loader.setCrossOrigin('anonymous');loader.register(parser=>new VRMLoaderPlugin(parser));
   loader.load(BOSS2_MODEL_URL,gltf=>{
     const vrm=gltf.userData?.vrm||null;
     if(vrm)VRMUtils.rotateVRM0(vrm);
     const root=vrm?.scene||gltf.scene;
     root.traverse(o=>{
       if(/bust|breast/i.test(o.name||''))boss2BustNodes.push(o);
       if(o.isMesh){
         o.castShadow=true;o.receiveShadow=true;
         if(Array.isArray(o.material))o.material=o.material.map(m=>m.clone());
         else if(o.material)o.material=o.material.clone();
       }
     });
     root.updateMatrixWorld(true);
     let box=new THREE.Box3().setFromObject(root,true),size=new THREE.Vector3();box.getSize(size);
     root.scale.multiplyScalar(3.15/Math.max(size.y,.001));
     root.updateMatrixWorld(true);
     box=new THREE.Box3().setFromObject(root,true);
     root.position.y-=box.min.y;
     root.position.z=.08;
     boss2VisualBaseY=root.position.y;
     boss2Root.add(root);
     boss2Visual=root;boss2VRM=vrm;boss2Ready=true;boss2Fallback.visible=false;
     // Mature heroine silhouette: subtle upper-body emphasis without breaking the source rig.
     for(const n of boss2BustNodes){n.scale.x*=1.10;n.scale.y*=1.04;n.scale.z*=1.12;}
     const h=vrm?.humanoid;
     for(const n of ['hips','spine','chest','upperChest','neck','head','leftShoulder','rightShoulder','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot']){
       const node=h?.getNormalizedBoneNode?.(n);
       if(node)cacheBoss2Bone(n,node);
       const raw=h?.getRawBoneNode?.(n);
       boss2RenderBones[n]=raw||node||null;
     }
     poseBoss2(.12);syncBoss2Rig(0);
     console.info('Arcelia VRM rig', {normalizedArms:!!boss2Bones.rightUpperArm,rawArms:!!boss2RenderBones.rightUpperArm,rawHand:!!boss2RenderBones.rightHand});
     flash('잔불의 왕녀 · 아르세리아',.9);
   },undefined,err=>console.warn('Arcelia / Victoria Rubin VRM unavailable.',err));
 }catch(err){console.warn('three-vrm unavailable for Arcelia.',err)}
}

function enforceBoss2Visibility(){
 if(BOSS_VARIANT!==2)return;
 for(const child of boss.children)child.visible=(child===boss2Root);
 boss2Root.visible=true;
 if(!boss2Ready)boss2Fallback.visible=true;
}
function setBoss2Style(style,announce=true){
 if(state.boss2Style===style&&!announce)return;
 state.boss2Style=style;
 const cfg={
  sword:[0xff643e,8.5,'검의 형상'],
  spear:[0x66a8ff,7.3,'창의 형상'],
  mage:[0xb48cff,8.0,'술법의 형상'],
  frenzy:[0xff3469,10.0,'광전의 형상'],
  awakened:[0xffb04b,12.5,'잿불 각성']
 }[style]||[0xff643e,8,'검의 형상'];
 boss2Aura.color.setHex(cfg[0]);boss2Aura.intensity=cfg[1];
 boss2HaloMat.color.setHex(cfg[0]);
 boss2SwordMat.emissive.setHex(cfg[0]);
 boss2SpearMat.emissive.setHex(cfg[0]);
 if(announce)flash(cfg[2],.5);
}
function updateBoss2Weapon(){
 if(!boss2Ready||state.bossHp<=0||(state.boss2Style==='mage'&&state.bossState!=='b2_thrust')){
   boss2WeaponRoot.visible=false;return;
 }
 const hand=boss2RenderBones.rightHand||boss2Bones.rightHand,lower=boss2RenderBones.rightLowerArm||boss2Bones.rightLowerArm;
 if(!hand||!lower){boss2WeaponRoot.visible=false;return}
 boss2WeaponRoot.visible=true;
 boss2Sword.visible=state.boss2Style!=='spear';
 boss2Spear.visible=state.boss2Style==='spear';

 let axis=weaponArmAxis(lower,hand,bossCombatOffset(0,.2,1));
 if(boss2Spear.visible&&['idle','b2_spear_thrust','b2_thrust','b2_dash_burst'].includes(state.bossState)){
   const hp=new THREE.Vector3();hand.getWorldPosition(hp);
   const aim=player.position.clone().add(new THREE.Vector3(0,1.08,0)).sub(hp);
   if(aim.lengthSq()>1e-6)axis=aim.normalize();
 }
 const marks=state.bossState==='b2_sword_combo'?BOSS2_SWORD_MARKS:state.bossState==='b2_flame_combo'?BOSS2_FLAME_MARKS:state.bossState==='b2_frenzy'?BOSS2_FRENZY_MARKS:state.bossState==='b2_final'?BOSS2_FINAL_MARKS:null;
 const edge=marks?bossKeyedSlash(state.bossTimer,marks,{wind:.3,cut:.16,recover:.28}):null;
 const gripY=boss2Spear.visible?.08:-.21;
 const roll=edge&&!boss2Spear.visible?edge.side*edge.impact*.28:0;
 placeWeaponAtPrimaryGrip(boss2WeaponRoot,hand,gripY,axis,roll);
}
function bossCombatOffset(x,y,z){
 const q=new THREE.Quaternion();boss.getWorldQuaternion(q);
 return new THREE.Vector3(x,y,z).applyQuaternion(q);
}

const bossWalkState={prev:new THREE.Vector3(),phase:0,ready:false,active:false,speed:0};
function applyBossHumanoidLocomotion(setBone,visual,baseY,dt,opts={}){
 if(!setBone||dt<=0)return;
 if(!bossWalkState.ready){bossWalkState.prev.copy(boss.position);bossWalkState.ready=true;return}
 const delta=boss.position.clone().sub(bossWalkState.prev);delta.y=0;
 const speed=delta.length()/Math.max(dt,.001);
 bossWalkState.prev.copy(boss.position);
 const active=state.bossHp>0&&state.bossState==='idle'&&state.bossPunish<=0&&speed>.16;
 bossWalkState.active=active;bossWalkState.speed=speed;
 if(!active){
  if(visual&&Number.isFinite(baseY)&&state.bossHp>0)visual.position.y=THREE.MathUtils.lerp(visual.position.y,baseY,1-Math.exp(-dt*18));
  return;
 }

 const forward=new THREE.Vector3(Math.sin(boss.rotation.y),0,Math.cos(boss.rotation.y));
 const sign=delta.dot(forward)>=0?1:-1;
 const freq=clamp(6.2+speed*.72,6.4,10.8);
 bossWalkState.phase+=dt*freq*sign;

 const p=bossWalkState.phase,sin=Math.sin(p),cos=Math.cos(p),sin2=Math.sin(p*2);
 const amp=(opts.stride??1)*clamp(.28+speed*.03,.31,.47);
 const knee=opts.knee??.56,foot=opts.foot??.14;
 const bob=(opts.bob??.022)*(1-Math.cos(p*2))*.5;
 const twist=(opts.twist??.06)*sin;
 const lean=opts.lean??-.025;
 const leftSwing=Math.max(0,cos),rightSwing=Math.max(0,-cos);

 setBone('hips',lean,-twist*.34,sin*.028,16,dt);
 setBone('spine',lean*.68,twist,-sin*.024,15,dt);
 setBone('chest',lean*.28,twist*.56,-sin*.016,14,dt);
 setBone('head',.012,-twist*.22,sin*.012,12,dt);

 // Heel-to-toe walk: hips alternate, knee flex peaks in swing, ankle counter-rotates.
 setBone('leftUpperLeg',amp*sin,0,.018,19,dt);
 setBone('rightUpperLeg',-amp*sin,0,-.018,19,dt);
 setBone('leftLowerLeg',leftSwing*knee,0,0,20,dt);
 setBone('rightLowerLeg',rightSwing*knee,0,0,20,dt);
 setBone('leftFoot',-amp*sin*.3-leftSwing*foot,0,0,18,dt);
 setBone('rightFoot',amp*sin*.3-rightSwing*foot,0,0,18,dt);

 setBone('leftShoulder',0,-twist*.14,-.035*sin,13,dt);
 setBone('rightShoulder',0,-twist*.1,.026*sin,13,dt);

 if(visual&&Number.isFinite(baseY)){
  const targetY=baseY+bob+.003*sin2;
  visual.position.y=THREE.MathUtils.lerp(visual.position.y,targetY,1-Math.exp(-dt*20));
 }
}
function bossWalkingHand(local,xAmp=.02,zAmp=.035,yAmp=.012){
 if(!bossWalkState.active||state.bossState!=='idle')return local;
 const p=bossWalkState.phase,s=Math.sin(p),c=Math.cos(p);
 local.x+=s*xAmp;
 local.y+=Math.max(0,c)*yAmp;
 local.z+=s*zAmp;
 return local;
}
function beginBossPunish(base){
 const r=Math.max(.82,base*1.32);
 state.bossPunish=r;state.bossTimer=r;
 return r;
}
function updateBossPunish(dt){state.bossPunish=Math.max(0,state.bossPunish-dt)}
function bossCommittedDir(duration,timer,lockFraction=.56){
 const live=flatDir(boss.position,player.position);
 if(timer>Math.max(.12,duration*lockFraction)){
  state.bossAttackTarget.copy(player.position);state.bossAttackTarget.y=0;
  return live;
 }
 const locked=flatDir(boss.position,state.bossAttackTarget);
 return locked.lengthSq()?locked:live;
}
function bossPunishDamage(base,posture){
 if(state.bossPunish<=0)return [base,posture];
 return [base*1.30,posture*1.12];
}
function addBossPosture(amount,grace=3.15){
 if(amount<=0)return;
 const max=BOSS_POSTURE_MAX[BOSS_VARIANT]||220;
 state.bossPosture=Math.min(max+60,state.bossPosture+amount);
 state.bossPostureGrace=Math.max(state.bossPostureGrace,grace);
}
function resetBossPostureAfterBreak(ratio=.32){
 const max=BOSS_POSTURE_MAX[BOSS_VARIANT]||220;
 state.bossPosture=Math.floor(max*ratio);
 state.bossPostureGrace=.8;
}
function soulsSwordBeat(timer,marks,wind=.24,follow=.22){
 let best=null;
 for(let i=0;i<marks.length;i++){
  const m=marks[i],start=m+wind,end=m-follow;
  if(timer<=start&&timer>=end){
   const p=clamp((start-timer)/(wind+follow),0,1);
   if(!best||Math.abs(timer-m)<best.distance)best={index:i,p,distance:Math.abs(timer-m)};
  }
 }
 return best;
}
function soulsSwordHandTarget(beat,reach,forward=.78){
 if(!beat)return new THREE.Vector3(.28*reach,-.5*reach,.3*reach);
 const side=beat.index%2===0?1:-1,p=beat.p;
 const wind=motionSmooth(0,.5,p),cut=motionSmooth(.48,.72,p),recover=motionSmooth(.72,1,p);
 const across=THREE.MathUtils.lerp(side*.55,-side*.62,cut);
 const x=THREE.MathUtils.lerp(side*.3,across,wind)*(1-recover)+side*.16*recover;
 const y=(-.28-.18*cut+.08*recover)*reach;
 const z=(.3+forward*.72*cut-.42*recover)*reach;
 return new THREE.Vector3(x*reach,y,z);
}
function bossKeyedSlash(timer,marks,opts={}){
 const wind=opts.wind??.32,cutTime=opts.cut??.16,recover=opts.recover??.26;
 let best=null;
 for(let i=0;i<marks.length;i++){
  const impact=marks[i],start=impact+wind,end=impact-recover;
  if(timer<=start&&timer>=end){
   const elapsed=start-timer,total=wind+recover,p=clamp(elapsed/Math.max(.001,total),0,1);
   const windP=motionSmooth(0,wind/total,p),cutP=motionSmooth(wind/total,(wind+cutTime)/total,p),recoverP=motionSmooth((wind+cutTime)/total,1,p);
   const candidate={index:i,side:i%2===0?1:-1,p,wind:windP,cut:cutP,recover:recoverP,impact:Math.sin(clamp((p-wind/total)/(Math.max(.08,cutTime/total)),0,1)*Math.PI)};
   if(!best||Math.abs(timer-impact)<Math.abs(timer-marks[best.index]))best=candidate;
  }
 }
 return best;
}
function bossSwordHandArc(beat,reach,cfg={}){
 if(!beat)return new THREE.Vector3((cfg.readyX??.25)*reach,(cfg.readyY??-.5)*reach,(cfg.readyZ??.24)*reach);
 const side=beat.side,wind=beat.wind,cut=beat.cut,recover=beat.recover;
 const startX=side*(cfg.windX??.72),endX=-side*(cfg.cutX??.72);
 const x=(THREE.MathUtils.lerp(startX,endX,cut)*(1-recover)+side*(cfg.recoverX??.16)*recover)*reach;
 const y=((cfg.baseY??-.32)+(cfg.liftY??.22)*wind-(cfg.dropY??.18)*cut+(cfg.recoverY??.08)*recover)*reach;
 const z=((cfg.baseZ??.18)+(cfg.windBack??-.28)*wind+(cfg.forward??1.02)*cut-(cfg.pullback??.46)*recover)*reach;
 return new THREE.Vector3(x,y,z);
}
function bossPolearmHandArc(timer,duration,reach,reverse=false){
 const p=clamp(1-timer/Math.max(.001,duration),0,1),wind=motionSmooth(0,.34,p),cut=motionSmooth(.36,.62,p),recover=motionSmooth(.68,1,p);
 const side=reverse?-1:1;
 const x=THREE.MathUtils.lerp(-side*.72,side*.82,cut)*(1-recover)+side*.18*recover;
 const y=-.38+.18*wind-.12*cut+.08*recover;
 const z=.08-.32*wind+1.04*cut-.48*recover;
 return new THREE.Vector3(x*reach,y*reach,z*reach);
}
function boss3Dance2Flight(timer){
 const total=BOSS3_DUR.b3_dance2,e=total-timer;
 let y=0,air=0,burst=0,dash=0,orbit=0,turn=0;
 if(e<.72){
  const p=motionSmooth(0,.72,e);y=THREE.MathUtils.lerp(0,3.55,p)+Math.sin(p*Math.PI)*.34;air=p;turn=-.08*p;
 }else if(e<1.18){
  const p=motionSmooth(.72,1.18,e);y=3.52+.06*Math.sin(p*Math.PI);air=1;
 }else if(e<2.28){
  const p=motionSmooth(1.18,2.28,e);y=3.46+.1*Math.sin(p*Math.PI);air=1;burst=1;dash=.72+.28*Math.sin(p*Math.PI);orbit=.2*Math.sin(p*Math.PI*2);turn=-.16+.32*p;
 }else if(e<2.9){
  const p=motionSmooth(2.28,2.9,e);y=3.5+.035*Math.sin(p*Math.PI*2);air=1;orbit=.08*Math.sin(p*Math.PI*2);
 }else if(e<4.0){
  const p=motionSmooth(2.9,4.0,e);y=3.42+.12*Math.sin(p*Math.PI);air=1;burst=2;dash=.8+.25*Math.sin(p*Math.PI);orbit=-.22*Math.sin(p*Math.PI*2);turn=.18-.36*p;
 }else if(e<4.65){
  const p=motionSmooth(4.0,4.65,e);y=3.48+.04*Math.sin(p*Math.PI*2);air=1;orbit=-.07*Math.sin(p*Math.PI*2);
 }else if(e<5.92){
  const p=motionSmooth(4.65,5.92,e);y=3.36+.14*Math.sin(p*Math.PI);air=1;burst=3;dash=.92+.3*Math.sin(p*Math.PI);orbit=.24*Math.sin(p*Math.PI*2);turn=-.2+.4*p;
 }else if(e<6.28){
  const p=motionSmooth(5.92,6.28,e);y=THREE.MathUtils.lerp(3.35,2.75,p);air=1;burst=4;dash=.65;turn=.1*(1-p);
 }else{
  const p=motionSmooth(6.28,total,e);y=THREE.MathUtils.lerp(2.75,0,p);air=1-p;orbit=.05*(1-p);
 }
 return{e,y,air,burst,dash,orbit,turn};
}
function poseBoss3AerialDance(dt,t){
 const flight=boss3Dance2Flight(t),beat=bossKeyedSlash(t,BOSS3_DANCE2_MARKS,{wind:.105,cut:.065,recover:.105});
 const slash=beat?.impact||0,side=beat?.side||state.boss3WaterSide||1;
 const tuck=flight.air*(.78+.06*Math.sin(flight.e*3.6));
 const dive=flight.burst===4?.7:0;
 setBoss3Bone('hips',-.12*tuck-.12*dive,side*.18*slash,side*.12*slash,30,dt);
 setBoss3Bone('spine',-.18*tuck-.18*dive,side*.46*slash,-side*.16*slash,32,dt);
 setBoss3Bone('chest',-.08,side*.26*slash,-side*.08*slash,30,dt);
 setBoss3Bone('upperChest',-.04,side*.16*slash,0,28,dt);
 setBoss3Bone('head',.08*tuck,-side*.12*slash,side*.05*slash,24,dt);
 setBoss3Bone('leftUpperLeg',-.7*tuck+.12*slash,0,.16,28,dt);
 setBoss3Bone('rightUpperLeg',-.58*tuck-.1*slash,0,-.16,28,dt);
 setBoss3Bone('leftLowerLeg',1.16*tuck,0,0,30,dt);setBoss3Bone('rightLowerLeg',1.0*tuck,0,0,30,dt);
 setBoss3Bone('leftFoot',-.12*tuck,0,.05,26,dt);setBoss3Bone('rightFoot',-.1*tuck,0,-.05,26,dt);
 setBoss3Bone('rightShoulder',0,side*.14*slash,-.16,32,dt);
 setBoss3Bone('rightUpperArm',-.74-.18*tuck,.1,side*.68*slash,34,dt);
 setBoss3Bone('rightLowerArm',-.66+.44*slash,0,-side*.3*slash,34,dt);
 setBoss3Bone('leftUpperArm',-.46*tuck,-.12,-side*.32*slash,28,dt);
 setBoss3Bone('leftLowerArm',-.56+.2*slash,0,side*.14*slash,28,dt);
 setBoss3Bone('rightHand',-.08,-side*.12*slash,-side*.2*slash,34,dt);
 setBoss3Bone('leftHand',-.05,side*.06*slash,side*.08*slash,28,dt);
}
function applyBoss2PrimaryArmIK(dt){
 if(!boss2Ready||!boss2Bones.rightUpperArm||!boss2Bones.rightHand)return;
 const shoulder=new THREE.Vector3();boss2Bones.rightUpperArm.getWorldPosition(shoulder);
 const reach=getArmReach(boss2Bones,'right'),st=state.bossState,t=state.bossTimer;
 let local=bossWalkingHand(new THREE.Vector3(.34,-.48,.22),.018,.04,.012);
 if(st==='b2_sword_combo'||st==='b2_flame_combo'||st==='b2_frenzy'||st==='b2_final'){
   const marks=st==='b2_sword_combo'?BOSS2_SWORD_MARKS:st==='b2_flame_combo'?BOSS2_FLAME_MARKS:st==='b2_frenzy'?BOSS2_FRENZY_MARKS:BOSS2_FINAL_MARKS;
   const beat=bossKeyedSlash(t,marks,{wind:st==='b2_final'?.36:.3,cut:.16,recover:.28});
   local.copy(bossSwordHandArc(beat,reach,{windX:.78,cutX:.84,baseY:-.28,liftY:.28,dropY:.2,baseZ:.12,windBack:-.34,forward:st==='b2_final'?1.18:1.02,pullback:.5}).multiplyScalar(1/reach));
 }else if(st==='b2_spear_thrust'){
   const e=BOSS2_DUR.b2_spear_thrust-t;
   const p=clamp(e/BOSS2_DUR.b2_spear_thrust,0,1);
   const thrust=motionSmooth(.42,.66,p),recover=motionSmooth(.72,1,p);
   local.set(.28*(1-thrust)-.06*recover,-.38+.05*thrust,-.18+1.28*thrust-.68*recover);
 }else if(st==='b2_thrust'||st==='b2_dash_burst'){
   local.set(.08,-.28,1.12);
 }else if(st==='b2_spear_sweep'||st==='b2_arc'){
   local.copy(bossPolearmHandArc(t,BOSS2_DUR[st]||1.4,reach,st==='b2_arc').multiplyScalar(1/reach));
 }else if(st==='b2_jump_slam'){
   const p=clamp(1-t/BOSS2_DUR.b2_jump_slam,0,1);
   local.set(.18,-.08-.62*p,.56+.26*p);
 }else if(st==='b2_grab'){
   local.set(.12,-.18,1.02);
 }else if(st==='b2_final'){
   const swing=Math.sin((BOSS2_DUR.b2_final-t)*Math.PI*5.1);
   local.set(.72*swing,-.22,.78);
 }else if(st==='b2_magic_bolts'||st==='b2_beam'||st==='b2_skyfall'||st==='b2_awaken'){
   local.set(.45,.04,.48);
 }
 const target=shoulder.clone().add(bossCombatOffset(local.x*reach,local.y*reach,local.z*reach));
 const elbowHint=shoulder.clone().add(bossCombatOffset(.28*reach,-.34*reach,.22*reach));
 solveArmCCD(boss2Bones,'right',target,elbowHint,1-Math.exp(-dt*42));
}
function applyBoss2WeaponGripIK(dt){
 if(!boss2Ready)return;
 const twoHand=boss2WeaponRoot.visible&&(state.boss2Style==='spear'||state.boss2Style==='awakened'||state.boss2Style==='frenzy'||['b2_flame_combo','b2_final','b2_spear_sweep','b2_spear_thrust'].includes(state.bossState));
 if(!boss2Bones.leftUpperArm||!boss2Bones.leftHand)return;
 const shoulder=new THREE.Vector3();boss2Bones.leftUpperArm.getWorldPosition(shoulder);
 const reach=getArmReach(boss2Bones,'left');
 let target,elbowHint;
 if(twoHand){
   boss2WeaponRoot.updateWorldMatrix(true,true);
   const gripY=boss2Spear.visible?.72:-.39;
   target=boss2WeaponRoot.localToWorld(new THREE.Vector3(0,gripY,0));
   elbowHint=shoulder.clone().add(bossCombatOffset(-.3*reach,-.31*reach,.16*reach));
 }else{
   const casting=['b2_magic_bolts','b2_beam','b2_skyfall','b2_awaken'].includes(state.bossState);
   target=shoulder.clone().add(bossCombatOffset(casting?-.34*reach:-.18*reach,casting?.02*reach:-.62*reach,casting?.56*reach:.18*reach));
   elbowHint=shoulder.clone().add(bossCombatOffset(-.34*reach,-.34*reach,.12*reach));
 }
 solveArmCCD(boss2Bones,'left',target,elbowHint,1-Math.exp(-dt*38));
}
function boss2Once(tag,fn){
 if(boss2Fired.has(tag))return false;
 boss2Fired.add(tag);fn?.();return true;
}
function boss2FacingDot(){
 const to=flatDir(boss.position,player.position);
 const f=new THREE.Vector3(Math.sin(boss.rotation.y),0,Math.cos(boss.rotation.y));
 return f.dot(to);
}
function boss2Strike(tag,range,dmg,posture,unblockable=false,minDot=-.25){
 if(boss2Fired.has(tag)||boss2MeleeRequests.some(r=>r.tag===tag))return;
 boss2MeleeRequests.push({tag,dmg,posture,unblockable,minDot,kind:'weapon',ttl:.28});
}
function boss2GrabStrike(tag,dmg,posture,unblockable=true,minDot=-.1){
 if(boss2Fired.has(tag)||boss2MeleeRequests.some(r=>r.tag===tag))return;
 boss2MeleeRequests.push({tag,dmg,posture,unblockable,minDot,kind:'hand',ttl:.32});
}
function resetBoss2PhysicalTrace(){boss2WeaponTrace.valid=false;boss2HandTrace.valid=false}
function processBoss2PhysicalHits(){
 const playerCaps=combatHumanoidCapsules(playerVrmBones,player,2.0);
 let weaponHit=null,handHit=null;
 if(boss2WeaponRoot.visible){
  const base=boss2Spear.visible?new THREE.Vector3(0,2.72,0):new THREE.Vector3(0,.18,0);
  const tip=boss2Spear.visible?new THREE.Vector3(0,3.32,0):new THREE.Vector3(0,2.26,0);
  const seg=combatWorldSegment(boss2WeaponRoot,base,tip);
  if(boss2WeaponTrace.valid)weaponHit=combatSweptBladeContact(boss2WeaponTrace.base,boss2WeaponTrace.tip,seg.base,seg.tip,playerCaps,boss2Spear.visible?.12:.13);
  boss2WeaponTrace.base.copy(seg.base);boss2WeaponTrace.tip.copy(seg.tip);boss2WeaponTrace.valid=true;
 }else boss2WeaponTrace.valid=false;
 const hand=boss2Bones.rightHand;
 if(hand){
  const p=new THREE.Vector3();hand.getWorldPosition(p);
  if(boss2HandTrace.valid){
   let bestD=Infinity;
   for(const c of playerCaps)bestD=Math.min(bestD,combatSegmentSegmentDistance(boss2HandTrace.point,p,c.a,c.b)-c.r);
   if(bestD<=.2)handHit={point:p.clone(),distance:bestD};
  }
  boss2HandTrace.point.copy(p);boss2HandTrace.valid=true;
 }else boss2HandTrace.valid=false;
 for(const req of boss2MeleeRequests){
  const hit=req.kind==='hand'?handHit:weaponHit;
  if(!hit||boss2Fired.has(req.tag))continue;
  boss2Fired.add(req.tag);state.shake=Math.max(state.shake,.08);spawnSparks(hit.point,9,4.4);
  if(state.invuln>0){flash('회피',.16);continue}
  hurtPlayer(req.dmg,req.posture,req.unblockable);
  break;
 }
 for(let i=boss2MeleeRequests.length-1;i>=0;i--){
  if(boss2Fired.has(boss2MeleeRequests[i].tag)||boss2MeleeRequests[i].ttl<=0)boss2MeleeRequests.splice(i,1);
 }
}
function spawnBoss2Pulse(pos,radius=1.2,color=0xff6a3c,life=.34){
 const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity:.52,depthWrite:false}));
 m.position.copy(pos);m.scale.setScalar(.12);scene.add(m);
 boss2Fx.push({obj:m,life,max:life,radius});
}
function spawnBoss2Slash(radius=1.5,color=0xff6c42){
 const m=new THREE.Mesh(new THREE.TorusGeometry(radius,.045,6,34,Math.PI*1.28),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72,depthWrite:false}));
 m.position.copy(boss.position).add(new THREE.Vector3(0,1.35,0));
 m.rotation.set(Math.PI/2,boss.rotation.y-.64,0);
 scene.add(m);boss2Fx.push({obj:m,life:.22,max:.22,radius:1});
}
function updateBoss2Fx(dt){
 for(let i=boss2Fx.length-1;i>=0;i--){
   const f=boss2Fx[i];f.life-=dt;
   const p=1-clamp(f.life/f.max,0,1);
   if(f.radius!==1)f.obj.scale.setScalar(.12+p*f.radius);
   if(f.obj.material)f.obj.material.opacity=Math.max(0,(1-p)*.62);
   if(f.life<=0){scene.remove(f.obj);f.obj.geometry?.dispose?.();f.obj.material?.dispose?.();boss2Fx.splice(i,1)}
 }
}
function makeBoss2Orb(color=0xa86cff,r=.16){
 const mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2.4,roughness:.2});
 const m=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),mat);m.castShadow=true;scene.add(m);return m;
}
function spawnBoss2HomingVolley(count=4){
 for(let i=0;i<count;i++){
   const a=(i-(count-1)/2)*.34;
   const p=boss.position.clone().add(new THREE.Vector3(Math.sin(a)*1.1,1.55+i*.09,Math.cos(a)*.45));
   const m=makeBoss2Orb(0xb174ff,.18);m.position.copy(p);
   const d=flatDir(p,player.position).applyAxisAngle(new THREE.Vector3(0,1,0),a*.35);
   boss2Projectiles.push({obj:m,vel:d.multiplyScalar(5.5),life:4.4,dmg:18,kind:'homing',turn:2.0});
 }
}
function spawnBoss2Arc(){
 const f=new THREE.Vector3(Math.sin(boss.rotation.y),0,Math.cos(boss.rotation.y));
 const m=new THREE.Mesh(new THREE.TorusGeometry(.72,.085,6,26,Math.PI*1.18),new THREE.MeshStandardMaterial({color:0xff9b50,emissive:0xff4c22,emissiveIntensity:2.4,transparent:true,opacity:.88,side:THREE.DoubleSide}));
 m.position.copy(boss.position).add(new THREE.Vector3(0,1.05,0)).addScaledVector(f,1.0);
 m.rotation.set(Math.PI/2,boss.rotation.y-.58,0);scene.add(m);
 boss2Projectiles.push({obj:m,vel:f.multiplyScalar(10.5),life:2.3,dmg:27,kind:'arc',radius:1.05});
}
function spawnBoss2Skyfall(){
 const center=player.position.clone();
 const offsets=[[0,0],[1.8,.5],[-1.5,1.0],[.8,-1.8],[-1.7,-1.25]];
 offsets.forEach((o,i)=>{
   const target=center.clone().add(new THREE.Vector3(o[0],0,o[1]));
   const m=makeBoss2Orb(0xff8a42,.22);m.position.copy(target).add(new THREE.Vector3(0,7.5+i*.45,0));
   boss2Projectiles.push({obj:m,vel:new THREE.Vector3(0,-8.5-i*.35,0),life:2.0,dmg:23,kind:'fall',target,radius:1.25});
 });
}
function pointSegmentDistanceBoss2(p,a,b){
 const ab=b.clone().sub(a),den=Math.max(1e-6,ab.lengthSq());
 const t=clamp(p.clone().sub(a).dot(ab)/den,0,1);
 return p.distanceTo(a.clone().addScaledVector(ab,t));
}
function spawnBoss2Beam(){
 const start=boss.position.clone().add(new THREE.Vector3(0,1.55,0));
 const target=player.position.clone().add(new THREE.Vector3(0,1.0,0));
 const dir=target.clone().sub(start).normalize(),len=18,end=start.clone().addScaledVector(dir,len);
 const m=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,len,10,1,true),new THREE.MeshBasicMaterial({color:0xc68cff,transparent:true,opacity:.8,depthWrite:false}));
 m.position.copy(start).add(end).multiplyScalar(.5);
 m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);scene.add(m);
 boss2Fx.push({obj:m,life:.24,max:.24,radius:1});
 if(pointSegmentDistanceBoss2(player.position.clone().add(new THREE.Vector3(0,1,0)),start,end)<.82){
   if(state.invuln>0)flash('회피',.16);else hurtPlayer(31,34,false);
 }
}
function updateBoss2Projectiles(dt){
 const playerPoint=player.position.clone().add(new THREE.Vector3(0,1.0,0));
 for(let i=boss2Projectiles.length-1;i>=0;i--){
   const p=boss2Projectiles[i];p.life-=dt;
   if(p.kind==='homing'){
     const desired=playerPoint.clone().sub(p.obj.position).normalize().multiplyScalar(p.vel.length());
     p.vel.lerp(desired,1-Math.exp(-dt*p.turn));
   }
   p.obj.position.addScaledVector(p.vel,dt);
   p.obj.rotation.x+=dt*5;p.obj.rotation.y+=dt*7;
   let hit=false;
   if(p.kind==='fall'&&p.obj.position.y<=.22){
     spawnBoss2Pulse(p.target,p.radius,0xff6b35,.28);spawnDustBurst(p.target,.5);
     if(player.position.distanceTo(p.target)<p.radius){
       if(state.invuln>0)flash('회피',.14);else hurtPlayer(p.dmg,24,false);
     }
     hit=true;
   }else if(p.kind!=='fall'&&p.obj.position.distanceTo(playerPoint)<(p.radius||.55)){
     if(state.invuln>0)flash('회피',.14);else hurtPlayer(p.dmg,22,false);
     hit=true;
   }
   if(hit||p.life<=0||p.obj.position.length()>48){
     scene.remove(p.obj);p.obj.geometry?.dispose?.();p.obj.material?.dispose?.();boss2Projectiles.splice(i,1);
   }
 }
}
const BOSS2_DUR={
 b2_sword_combo:2.24,b2_thrust:1.38,b2_jump_slam:1.72,
 b2_spear_sweep:1.78,b2_spear_thrust:1.46,
 b2_magic_bolts:1.55,b2_beam:1.62,b2_frenzy:3.05,
 b2_awaken:2.35,b2_flame_combo:2.62,b2_dash_burst:1.58,
 b2_arc:1.34,b2_skyfall:2.15,b2_grab:1.55,b2_final:4.15
};
const BOSS2_SWORD_MARKS=[1.72,1.08,.44];
const BOSS2_FRENZY_MARKS=[2.48,1.92,1.36,.8,.26];
const BOSS2_FLAME_MARKS=[2.08,1.47,.86,.28];
const BOSS2_FINAL_MARKS=[3.48,2.72,1.96,1.20,.38];
function chooseBoss2Attack(){
 if(state.bossHp<=0)return;state.bossPunish=0;
 state.bossFxStamp='';boss2Fired.clear();state.bossHit=false;setDanger(false);
 state.boss2AttackCount++;
 if(state.boss2Phase===1&&state.boss2AttackCount%3===1&&state.boss2AttackCount>1){
   const order=['sword','spear','mage','frenzy'];
   let idx=(order.indexOf(state.boss2Style)+1)%order.length;
   if(dist()>7.2&&idx===0)idx=1;
   if(dist()<3.0&&idx===2)idx=3;
   setBoss2Style(order[idx]);
 }
 let pick;
 if(state.boss2Phase===2){
   if(state.bossHp/state.bossMaxHp<.2&&!state.boss2FinalUsed){
     pick='b2_final';state.boss2FinalUsed=true;
   }else if(state.potionPunishQueued){
     pick='b2_dash_burst';state.potionPunishQueued=false;
   }else{
     const pool=['b2_flame_combo','b2_dash_burst','b2_arc','b2_skyfall','b2_grab'];
     pick=pool[Math.floor(Math.random()*pool.length)];
   }
 }else{
   const pools={
    sword:['b2_sword_combo','b2_thrust','b2_jump_slam'],
    spear:['b2_spear_sweep','b2_spear_thrust','b2_jump_slam'],
    mage:['b2_magic_bolts','b2_beam','b2_thrust'],
    frenzy:['b2_frenzy','b2_thrust','b2_sword_combo']
   };
   const pool=pools[state.boss2Style]||pools.sword;
   pick=pool[Math.floor(Math.random()*pool.length)];
 }
 state.bossState=pick;state.bossTimer=BOSS2_DUR[pick]||1.4;resetBoss2PhysicalTrace();
 state.bossAttackTarget.copy(player.position);state.bossAttackTarget.y=0;
 if(pick==='b2_grab')setDanger(true);
}
function finishBoss2Attack(recovery=.72){
 setDanger(false);state.bossState='idle';beginBossPunish(recovery);state.bossFxStamp='';boss2Fired.clear();boss2MeleeRequests.length=0;resetBoss2PhysicalTrace();
 boss.position.y=0;
}
function poseBoss2(dt){
 if(!boss2Ready)return;
 resetBoss2Pose(dt);
 const st=state.bossState,t=state.bossTimer;
 const pulse=Math.sin(state.time*3.2),hitReact=state.boss2HitReact>0?Math.sin((state.boss2HitReact/.14)*Math.PI):0;
 setBoss2Bone('spine',-.025+pulse*.012-hitReact*.12,0,hitReact*.08,10,dt);
 setBoss2Bone('head',.015-hitReact*.06,-pulse*.012,-hitReact*.06,10,dt);
 if(st==='idle'&&state.bossPunish>0){
   const r=clamp(state.bossPunish/1.8,0,1);
   setBoss2Bone('hips',.08*r,-.08*r,0,16,dt);setBoss2Bone('spine',-.28*r,.12*r,.04*r,18,dt);setBoss2Bone('chest',-.12*r,.06*r,0,16,dt);
   setBoss2Bone('rightUpperArm',-.38,-.05,-.26,16,dt);setBoss2Bone('rightLowerArm',-.78,0,-.1,18,dt);
   setBoss2Bone('leftUpperArm',-.28,.02,.2,15,dt);setBoss2Bone('head',.08*r,-.04*r,0,14,dt);
 }else if(st==='idle'){
   const charm=Math.sin(state.time*1.65),phase=state.boss2Phase===2?1.35:1;
   setBoss2Bone('hips',0,.03*charm,.075*charm*phase,7,dt);
   setBoss2Bone('spine',-.045,.018*charm,-.05*charm*phase,7,dt);
   setBoss2Bone('chest',-.065,-.012*charm,-.025*charm*phase,7,dt);
   setBoss2Bone('upperChest',-.035,0,-.018*charm*phase,7,dt);
   setBoss2Bone('head',.025,-.018*charm,-.025*charm,7,dt);
   setBoss2Bone('rightUpperArm',-.34,.03,-.22,8,dt);setBoss2Bone('leftUpperArm',-.12,-.02,.22,8,dt);
 }else if(st==='b2_sword_combo'||st==='b2_flame_combo'||st==='b2_frenzy'){
   const marks=st==='b2_sword_combo'?BOSS2_SWORD_MARKS:st==='b2_flame_combo'?BOSS2_FLAME_MARKS:BOSS2_FRENZY_MARKS;
   const beat=soulsSwordBeat(t,marks,.25,.22);
   const cut=beat?Math.sin(clamp((beat.p-.36)/.46,0,1)*Math.PI):0,side=beat&&beat.index%2===0?1:-1;
   setBoss2Bone('rightShoulder',0,side*.08*cut,-.12,15,dt);
   setBoss2Bone('rightUpperArm',-.62,.08,side*.35*cut,18,dt);
   setBoss2Bone('rightLowerArm',-.72+.28*cut,0,-side*.16*cut,18,dt);
   setBoss2Bone('spine',-.08,side*.24*cut,-side*.08*cut,15,dt);
   setBoss2Bone('hips',0,side*.1*cut,0,13,dt);
 }else if(st==='b2_spear_thrust'){
   const e=BOSS2_DUR.b2_spear_thrust-t,p=clamp(e/BOSS2_DUR.b2_spear_thrust,0,1);
   const thrust=motionSmooth(.42,.66,p),recover=motionSmooth(.72,1,p),drive=thrust*(1-recover);
   setBoss2Bone('spine',-.12-.16*drive,.05*drive,0,18,dt);
   setBoss2Bone('hips',-.04*drive,.08*drive,0,17,dt);
   setBoss2Bone('rightUpperArm',-.72+.14*drive,.04,-.16,20,dt);
   setBoss2Bone('rightLowerArm',-.78+.5*drive,0,0,22,dt);
   setBoss2Bone('leftUpperArm',-.48+.1*drive,-.04,.16,20,dt);
   setBoss2Bone('leftLowerArm',-.62+.34*drive,0,0,22,dt);
   setBoss2Bone('leftUpperLeg',-.28*drive,0,.03,18,dt);
   setBoss2Bone('rightUpperLeg',.38*drive,0,-.03,18,dt);
   setBoss2Bone('rightLowerLeg',.46*drive,0,0,18,dt);
 }else if(st==='b2_thrust'||st==='b2_dash_burst'){
   setBoss2Bone('rightUpperArm',-1.38,.08,-.12,18,dt);
   setBoss2Bone('rightLowerArm',-.12,0,0,18,dt);
   setBoss2Bone('spine',-.22,0,0,15,dt);
 }else if(st==='b2_spear_sweep'||st==='b2_arc'){
   const p=clamp(1-t/BOSS2_DUR[st],0,1),wind=motionSmooth(0,.34,p),cut=motionSmooth(.36,.62,p),recover=motionSmooth(.68,1,p),side=st==='b2_arc'?-1:1;
   const twist=THREE.MathUtils.lerp(-side*.52,side*.64,cut)*(1-recover)+side*.08*recover;
   setBoss2Bone('hips',0,twist*.56,0,19,dt);setBoss2Bone('spine',-.12,twist,-side*.08*cut,22,dt);setBoss2Bone('chest',-.04,twist*.48,0,20,dt);
   setBoss2Bone('rightUpperArm',-.62+.16*wind,.08,side*.34*cut,22,dt);setBoss2Bone('rightLowerArm',-.7+.3*cut,0,-side*.16*cut,22,dt);
   setBoss2Bone('leftUpperArm',-.52,-.04,-side*.2*cut,20,dt);setBoss2Bone('leftUpperLeg',-.22*wind,0,.04,18,dt);setBoss2Bone('rightUpperLeg',.24*cut,0,-.04,18,dt);
 }else if(st==='b2_magic_bolts'||st==='b2_beam'||st==='b2_skyfall'||st==='b2_awaken'){
   setBoss2Bone('leftUpperArm',-.55,-.45,.86,12,dt);setBoss2Bone('rightUpperArm',-.55,.45,-.86,12,dt);
   setBoss2Bone('leftLowerArm',-.45,0,.3,12,dt);setBoss2Bone('rightLowerArm',-.45,0,-.3,12,dt);
   setBoss2Bone('upperChest',-.12,0,0,10,dt);
 }else if(st==='b2_grab'){
   setBoss2Bone('rightUpperArm',-1.3,.18,-.3,16,dt);setBoss2Bone('rightLowerArm',-.18,0,0,16,dt);
   setBoss2Bone('leftUpperArm',-.35,-.2,.45,12,dt);
 }else if(st==='b2_final'){
   const beat=soulsSwordBeat(t,BOSS2_FINAL_MARKS,.3,.24),cut=beat?Math.sin(clamp((beat.p-.34)/.48,0,1)*Math.PI):0,side=beat&&beat.index%2===0?1:-1;
   setBoss2Bone('rightUpperArm',-.66,.1,side*.4*cut,20,dt);setBoss2Bone('rightLowerArm',-.7+.3*cut,0,-side*.18*cut,20,dt);
   setBoss2Bone('leftUpperArm',-.46,-.08,-side*.16*cut,18,dt);
   setBoss2Bone('spine',-.1,side*.3*cut,-side*.09*cut,18,dt);setBoss2Bone('hips',0,side*.13*cut,0,16,dt);
 }
 if(state.boss2Style==='spear'){
   const p=st==='b2_spear_thrust'?clamp(1-t/BOSS2_DUR.b2_spear_thrust,0,1):0,thrust=motionSmooth(.42,.66,p)*(1-motionSmooth(.74,1,p));
   setBoss2Bone('rightHand',-.03,-.02*thrust,-.04,24,dt);setBoss2Bone('leftHand',-.04,.02*thrust,.03,24,dt);
 }else{
   const marks=st==='b2_sword_combo'?BOSS2_SWORD_MARKS:st==='b2_flame_combo'?BOSS2_FLAME_MARKS:st==='b2_frenzy'?BOSS2_FRENZY_MARKS:st==='b2_final'?BOSS2_FINAL_MARKS:null;
   const beat=marks?bossKeyedSlash(t,marks,{wind:.3,cut:.16,recover:.28}):null,side=beat?.side||1,edge=beat?.impact||0;
   setBoss2Bone('rightHand',-.07,-.03-side*.1*edge,-.1-side*.16*edge,24,dt);setBoss2Bone('leftHand',-.05,.03+side*.04*edge,.08,20,dt);
 }
}
function hitBoss2(base,posture=12,contact=null){
 if(state.bossHp<=0)return;
 let dmg=base,pd=posture;[dmg,pd]=bossPunishDamage(dmg,pd);
 if(state.bossStagger>0){dmg*=1.6;pd*=.22}
 state.bossHp=Math.max(0,state.bossHp-dmg);
 addBossPosture(pd);
 state.boss2HitReact=.14;triggerPlayerHitImpact(contact||player.position.clone().lerp(boss.position,.58).add(new THREE.Vector3(0,1.1,0)));
 if(state.bossHp<=0){
   state.bossState='dead';state.potionPunishQueued=false;setDanger(false);flash('잔불이 꺼졌다 · 토벌 완료',1.25);
 }else if(state.bossPosture>=BOSS_POSTURE_MAX[2]){
   resetBossPostureAfterBreak(.32);state.bossStagger=1.2;state.bossState='stagger';state.bossTimer=1.2;flash('자세 붕괴',.5);
 }
}
function updateBoss2(dt){
 for(let i=boss2MeleeRequests.length-1;i>=0;i--){boss2MeleeRequests[i].ttl-=dt;if(boss2MeleeRequests[i].ttl<=0)boss2MeleeRequests.splice(i,1)}
 enforceBoss2Visibility();updateBoss2Fx(dt);updateBoss2Projectiles(dt);
 bossRim.position.set(boss.position.x,boss.position.y+3.1,boss.position.z-4.2);
 boss2Halo.rotation.z+=dt*(state.boss2Phase===2?1.4:.55);
 boss2HaloMat.opacity=.16+.08*Math.sin(state.time*(state.boss2Phase===2?8:4));
 boss2Aura.intensity=(state.boss2Phase===2?11.5:7.2)+Math.sin(state.time*7)*.8;
 state.boss2HitReact=Math.max(0,state.boss2HitReact-dt);
 if(state.bossHp<=0){
   state.boss2DeadPose=Math.min(1,state.boss2DeadPose+dt*.55);
   if(boss2Visual){boss2Visual.rotation.z=THREE.MathUtils.lerp(boss2Visual.rotation.z,-1.35,state.boss2DeadPose*.045);boss2Visual.position.y=THREE.MathUtils.lerp(boss2Visual.position.y,.1,state.boss2DeadPose*.03)}
   boss2WeaponRoot.visible=false;poseBoss2(dt);syncBoss2Rig(dt);return;
 }
 if(state.boss2Phase===1&&state.bossHp<=state.bossMaxHp*.5){
   state.boss2Phase=2;setBoss2Style('awakened',false);
   state.bossState='b2_awaken';state.bossTimer=BOSS2_DUR.b2_awaken;state.bossFxStamp='';boss2Fired.clear();
   setDanger(false);flash('왕혼 해방 · 잿불 각성',1.0);
   spawnBoss2Pulse(boss.position.clone().add(new THREE.Vector3(0,1.1,0)),3.8,0xffa045,.7);
 }
 if(state.bossStagger>0){
   setDanger(false);state.bossStagger=Math.max(0,state.bossStagger-dt);
   boss.position.y=THREE.MathUtils.lerp(boss.position.y,0,1-Math.exp(-dt*12));
   poseBoss2(dt);applyBoss2PrimaryArmIK(dt);applyBoss2WeaponGripIK(dt);syncBoss2Rig(dt);updateBoss2Weapon();
   if(state.bossStagger<=0){state.bossState='idle';state.bossTimer=.85}
   return;
 }
 state.bossTimer-=dt;updateBossPunish(dt);
 const liveDir=flatDir(boss.position,player.position),dur=BOSS2_DUR[state.bossState]||1;
 const dir=state.bossState==='idle'?liveDir:bossCommittedDir(dur,state.bossTimer,.56);
 const face=Math.atan2(dir.x,dir.z);
 if(state.bossState!=='idle'&&(!['b2_thrust','b2_spear_thrust','b2_dash_burst'].includes(state.bossState)||state.bossTimer>.46)){
   boss.rotation.y=lerpAngle(boss.rotation.y,face,1-Math.exp(-dt*7.5));
 }
 const d=dist();
 if(state.bossState==='idle'){
   boss.position.y=THREE.MathUtils.lerp(boss.position.y,0,1-Math.exp(-dt*14));
   const ideal=state.boss2Style==='mage'?6.8:state.boss2Style==='spear'?4.7:3.2;
   if(state.bossPunish<=0){
    boss.rotation.y=lerpAngle(boss.rotation.y,Math.atan2(liveDir.x,liveDir.z),1-Math.exp(-dt*5));
    if(d>ideal+.45)boss.position.addScaledVector(liveDir,dt*(state.boss2Style==='frenzy'?4.3:3.25));
    else if(d<ideal-.8&&state.boss2Style==='mage')boss.position.addScaledVector(liveDir,-dt*2.2);
   }
   if(state.bossTimer<=0&&state.bossPunish<=0)chooseBoss2Attack();
 }else if(state.bossState==='b2_sword_combo'){
   const dmgs=[20,23,31],posts=[18,20,30];
   BOSS2_SWORD_MARKS.forEach((mark,i)=>{
     if(state.bossTimer<=mark+.12&&state.bossTimer>mark-.12){
       boss2Once('s-vfx'+i,()=>{spawnBoss2Slash(1.5+i*.16,i===2?0xff5536:0xff7550);if(i===2)spawnDustBurst(boss.position,.48)});
       boss2Strike('s-dmg'+i,3.55+i*.16,dmgs[i],posts[i],false,-.6);
     }
     if(state.bossTimer<=mark+.24&&state.bossTimer>mark+.05&&d>2.5)boss.position.addScaledVector(dir,dt*3.1);
   });
   if(state.bossTimer<=0)finishBoss2Attack(.88);
 }else if(state.bossState==='b2_thrust'||state.bossState==='b2_spear_thrust'){
   const spear=state.bossState==='b2_spear_thrust',range=spear?5.35:4.1;
   if(spear){
     const e=BOSS2_DUR.b2_spear_thrust-state.bossTimer,p=clamp(e/BOSS2_DUR.b2_spear_thrust,0,1);
     if(p>=.42&&p<=.7)boss.position.addScaledVector(dir,dt*7.2);
     if(p>=.48&&p<=.76)boss2Strike('thrust',range,30,32,false,.05);
   }else{
     if(state.bossTimer<.48&&state.bossTimer>.18)boss.position.addScaledVector(dir,dt*9.2);
     if(state.bossTimer<=.44&&state.bossTimer>.05)boss2Strike('thrust',range,28,29,false,.05);
   }
   if(state.bossTimer<=0)finishBoss2Attack(.9);
 }else if(state.bossState==='b2_jump_slam'){
   const total=BOSS2_DUR.b2_jump_slam,e=total-state.bossTimer;
   if(e<1.18){const p=clamp(e/1.18,0,1);boss.position.y=Math.sin(p*Math.PI)*2.25;if(p<.7)boss.position.addScaledVector(dir,dt*3.2)}
   else boss.position.y=THREE.MathUtils.lerp(boss.position.y,0,1-Math.exp(-dt*28));
   if(state.bossTimer<=.38)boss2Once('slam',()=>{spawnDustBurst(boss.position,.9);spawnBossShockwave(3.9,state.boss2Phase===2?31:27)});
   if(state.bossTimer<=0)finishBoss2Attack(1.0);
 }else if(state.bossState==='b2_spear_sweep'){
   if(state.bossTimer<=.78&&state.bossTimer>.44)boss2Once('sweep-vfx',()=>spawnBoss2Slash(2.15,0x6aa9ff));
   if(state.bossTimer<=.68&&state.bossTimer>.32)boss2Strike('sweep-dmg',4.55,29,31,false,-.75);
   if(state.bossTimer<=0)finishBoss2Attack(.9);
 }else if(state.bossState==='b2_magic_bolts'){
   if(state.bossTimer<=.9)boss2Once('bolts',()=>spawnBoss2HomingVolley(5));
   if(state.bossTimer<=0)finishBoss2Attack(.72);
 }else if(state.bossState==='b2_beam'){
   if(state.bossTimer<=.42)boss2Once('beam',()=>spawnBoss2Beam());
   if(state.bossTimer<=0)finishBoss2Attack(1.0);
 }else if(state.bossState==='b2_frenzy'){
   BOSS2_FRENZY_MARKS.forEach((mark,i)=>{
     if(state.bossTimer<=mark+.1&&state.bossTimer>mark-.1){
       boss2Once('fz-vfx'+i,()=>spawnBoss2Slash(1.42+i*.07,0xff386b));
       boss2Strike('fz-dmg'+i,3.7,13+i*2,14+i*2,false,-.62);
     }
     if(state.bossTimer<=mark+.2&&state.bossTimer>mark+.04&&d>2.55)boss.position.addScaledVector(dir,dt*3.6);
   });
   if(state.bossTimer<=0)finishBoss2Attack(.9);
 }else if(state.bossState==='b2_awaken'){
   if(state.bossTimer<=.48)boss2Once('awaken-wave',()=>{spawnBoss2Pulse(boss.position.clone().add(new THREE.Vector3(0,1,0)),4.6,0xffa13d,.55);spawnDustBurst(boss.position,.8)});
   if(state.bossTimer<=0)finishBoss2Attack(1.05);
 }else if(state.bossState==='b2_flame_combo'){
   BOSS2_FLAME_MARKS.forEach((mark,i)=>{
     if(state.bossTimer<=mark+.11&&state.bossTimer>mark-.11){
       boss2Once('flame-vfx'+i,()=>{spawnBoss2Slash(1.55+i*.12,0xff9a48);if(i===3)spawnBossShockwave(4.2,29)});
       boss2Strike('flame-dmg'+i,3.8+i*.1,18+i*3,18+i*3,false,-.6);
     }
     if(state.bossTimer<=mark+.22&&state.bossTimer>mark+.05&&d>2.65)boss.position.addScaledVector(dir,dt*3.3);
   });
   if(state.bossTimer<=0)finishBoss2Attack(1.12);
 }else if(state.bossState==='b2_dash_burst'){
   if(state.bossTimer<.62&&state.bossTimer>.24)boss.position.addScaledVector(dir,dt*11.4);
   if(state.bossTimer<=.4&&state.bossTimer>.1)boss2Strike('dash-hit',4.0,32,33,false,-.05);
   if(state.bossTimer<=.19)boss2Once('dash-burst',()=>{spawnBoss2Pulse(boss.position.clone().add(new THREE.Vector3(0,.8,0)),2.45,0xff6a35,.32);if(dist()<2.45&&state.invuln<=0)hurtPlayer(22,24,false)});
   if(state.bossTimer<=0)finishBoss2Attack(.92);
 }else if(state.bossState==='b2_arc'){
   if(state.bossTimer<=.48)boss2Once('arc',()=>spawnBoss2Arc());
   if(state.bossTimer<=0)finishBoss2Attack(.82);
 }else if(state.bossState==='b2_skyfall'){
   if(state.bossTimer<=1.18)boss2Once('sky',()=>spawnBoss2Skyfall());
   if(state.bossTimer<=0)finishBoss2Attack(1.15);
 }else if(state.bossState==='b2_grab'){
   if(state.bossTimer<.46&&state.bossTimer>.18)boss.position.addScaledVector(dir,dt*7.2);
   if(state.bossTimer<=.3&&state.bossTimer>.06)boss2GrabStrike('grab',46,58,true,.12);
   if(state.bossTimer<=0)finishBoss2Attack(1.18);
 }else if(state.bossState==='b2_final'){
   BOSS2_FINAL_MARKS.forEach((mark,i)=>{
     if(state.bossTimer<=mark+.12&&state.bossTimer>mark-.12){
       boss2Once('final-vfx'+i,()=>{spawnBoss2Slash(1.7+i*.14,i===4?0xffd36a:0xff5c3d);if(i===4){spawnBoss2Pulse(boss.position.clone().add(new THREE.Vector3(0,1,0)),5.2,0xffd36a,.72);spawnBossShockwave(5.6,38)}});
       if(i<4)boss2Strike('final-dmg'+i,4.1,18+i*2,19+i*2,false,-.65);
     }
     if(i<4&&state.bossTimer<=mark+.24&&state.bossTimer>mark+.05&&d>2.8)boss.position.addScaledVector(dir,dt*3.4);
   });
   if(state.bossTimer<=0)finishBoss2Attack(1.45);
 }
 poseBoss2(dt);applyBossHumanoidLocomotion(setBoss2Bone,boss2Visual,boss2VisualBaseY,dt,{stride:state.boss2Style==='frenzy'?1.12:1,bob:.03});applyBoss2PrimaryArmIK(dt);updateBoss2Weapon();applyBoss2WeaponGripIK(dt);syncBoss2Rig(dt);updateBoss2Weapon();processBoss2PhysicalHits();
}

/* -------------------------------------------------------------------------- */
/* Boss 03: Crimson Lily Sword Saint Seria                                    */
/* Original high-pressure lifesteal duelist: flurries, aerial bloom, phase 2  */
/* -------------------------------------------------------------------------- */
const boss3Root=new THREE.Group();
boss3Root.name='SeriaRoot';
boss3Root.visible=BOSS_VARIANT===3;
boss.add(boss3Root);

let boss3Visual=null,boss3VRM=null,boss3Ready=false,boss3VisualBaseY=0;
const boss3Bones={},boss3Rest={},boss3RenderBones={},boss3Fired=new Set(),boss3Fx=[],boss3BustNodes=[],boss3MeleeRequests=[];
const boss3WeaponTrace={valid:false,base:new THREE.Vector3(),tip:new THREE.Vector3()};
const boss3Aura=new THREE.PointLight(0xd9344f,8.5,13,2);
boss3Aura.position.set(0,1.45,.18);boss3Root.add(boss3Aura);
const boss3HaloMat=new THREE.MeshBasicMaterial({color:0x8f1735,transparent:true,opacity:.12,depthWrite:false});
const boss3Halo=new THREE.Mesh(new THREE.TorusGeometry(.92,.018,6,36),boss3HaloMat);
boss3Halo.rotation.x=Math.PI/2;boss3Halo.position.y=.025;boss3Root.add(boss3Halo);

const boss3Fallback=new THREE.Group();boss3Fallback.name='SeriaFallback';boss3Root.add(boss3Fallback);
const b3Skin=new THREE.MeshStandardMaterial({color:0xe1b2a8,roughness:.5});
const b3Corset=new THREE.MeshStandardMaterial({color:0x4a1021,roughness:.58,metalness:.08,emissive:0x2d0812,emissiveIntensity:.28});
const b3Accent=new THREE.MeshStandardMaterial({color:0x111015,roughness:.72,metalness:.12});
const b3Hair=new THREE.MeshStandardMaterial({color:0xb36a50,roughness:.7});
const b3Silk=new THREE.MeshStandardMaterial({color:0x5b1830,roughness:.75,metalness:.04,transparent:true,opacity:.72,side:THREE.DoubleSide});
part(boss3Fallback,new THREE.CapsuleGeometry(.3,.72,5,8),b3Skin,[0,1.18,0]);
part(boss3Fallback,new THREE.BoxGeometry(.58,.42,.28),b3Corset,[0,1.36,.02]);
part(boss3Fallback,new THREE.BoxGeometry(.46,.18,.22),b3Corset,[0,1.63,.05]);
part(boss3Fallback,new THREE.SphereGeometry(.29,14,10),b3Skin,[0,1.95,.02]);
part(boss3Fallback,new THREE.SphereGeometry(.325,14,10),b3Hair,[0,2.04,-.06],[0,0,0],[1,.9,1.04]);
part(boss3Fallback,new THREE.SphereGeometry(.16,12,10),b3Skin,[-.13,1.5,.13],[0,0,0],[1.05,.95,1.18]);
part(boss3Fallback,new THREE.SphereGeometry(.16,12,10),b3Skin,[.13,1.5,.13],[0,0,0],[1.05,.95,1.18]);
for(const sx of [-1,1]){
 part(boss3Fallback,new THREE.CapsuleGeometry(.082,.56,4,7),b3Skin,[sx*.42,1.3,0],[0,0,sx*.05]);
 part(boss3Fallback,new THREE.CapsuleGeometry(.05,.42,4,7),b3Accent,[sx*.53,1.02,0],[0,0,sx*.03]);
 part(boss3Fallback,new THREE.CapsuleGeometry(.095,.82,4,7),b3Skin,[sx*.17,.5,0],[0,0,sx*.02]);
 part(boss3Fallback,new THREE.CylinderGeometry(.1,.09,.45,10),b3Accent,[sx*.17,.72,0]);
}
part(boss3Fallback,new THREE.PlaneGeometry(.42,1.0),b3Silk,[-.18,1.02,.1],[.18,.24,.08]);
part(boss3Fallback,new THREE.PlaneGeometry(.42,1.0),b3Silk,[.18,1.02,.1],[.18,-.24,-.08]);
part(boss3Fallback,new THREE.PlaneGeometry(.72,1.15),b3Silk,[0,1.0,-.18]);

const boss3WeaponRoot=new THREE.Group();boss3WeaponRoot.visible=false;scene.add(boss3WeaponRoot);
const boss3BladeMat=new THREE.MeshStandardMaterial({color:0xe7e3db,metalness:.92,roughness:.16,emissive:0x5f0e22,emissiveIntensity:.42});
const boss3GripMat=new THREE.MeshStandardMaterial({color:0x171319,metalness:.35,roughness:.62});
const boss3Katana=new THREE.Group();
const boss3Blade=part(boss3Katana,new THREE.BoxGeometry(.075,2.12,.035),boss3BladeMat,[0,1.14,0]);
part(boss3Katana,new THREE.BoxGeometry(.38,.045,.11),boss3GripMat,[0,.08,0]);
part(boss3Katana,new THREE.CylinderGeometry(.044,.052,.5,8),boss3GripMat,[0,-.18,0]);

state.boss3Phase=1;
state.boss3Last='';
state.boss3DeadPose=0;
state.boss3HealPulse=0;
state.boss3HitReact=0;
state.boss3WaterBurst=0;
state.boss3WaterDir=new THREE.Vector3();
state.boss3WaterSide=1;

if(BOSS_VARIANT===3){
 scene.background.set(0x160f17);scene.fog.color.set(0x160f17);
 fire.color.set(0xb72b48);fire.intensity=8.8;
 moon.color.set(0xffc6d0);moon.intensity=3.1;
 bossRim.color.set(0xe74968);
 if(ui.bossName)ui.bossName.textContent=BOSS3_NAME;
}

function cacheBoss3Bone(name,node){
 if(!node)return;
 boss3Bones[name]=node;
 boss3Rest[name]={rotation:node.rotation.clone(),position:node.position.clone(),scale:node.scale.clone()};
}
function setBoss3Bone(name,rx=0,ry=0,rz=0,speed=12,dt=.016){
 const b=boss3Bones[name],r=boss3Rest[name];if(!b||!r)return;
 const a=1-Math.exp(-dt*speed);
 b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,r.rotation.x+rx,a);
 b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,r.rotation.y+ry,a);
 b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,r.rotation.z+rz,a);
}
function syncBoss3Rig(dt=0){
 if(!boss3VRM)return;
 boss3VRM.update?.(Math.max(0,dt));
 boss3Visual?.updateMatrixWorld?.(true);
}
function resetBoss3Pose(dt){
 for(const [name,b] of Object.entries(boss3Bones)){
  const r=boss3Rest[name];if(!r)continue;
  const a=1-Math.exp(-dt*12);
  b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,r.rotation.x,a);
  b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,r.rotation.y,a);
  b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,r.rotation.z,a);
 }
}
async function loadBoss3Avatar(){
 if(BOSS_VARIANT!==3)return;
 try{
  const {VRMLoaderPlugin,VRMUtils}=await import('@pixiv/three-vrm');
  const loader=new GLTFLoader();loader.setCrossOrigin('anonymous');loader.register(parser=>new VRMLoaderPlugin(parser));
  loader.load(BOSS3_MODEL_URL,gltf=>{
   const vrm=gltf.userData?.vrm||null;if(vrm)VRMUtils.rotateVRM0(vrm);
   const root=vrm?.scene||gltf.scene;
   root.traverse(o=>{
    if(/bust|breast/i.test(o.name||''))boss3BustNodes.push(o);
    if(o.isMesh){
     o.castShadow=true;o.receiveShadow=true;
     if(Array.isArray(o.material))o.material=o.material.map(m=>m.clone());
     else if(o.material)o.material=o.material.clone();
    }
   });
   root.updateMatrixWorld(true);
   let box=new THREE.Box3().setFromObject(root,true),size=new THREE.Vector3();box.getSize(size);
   root.scale.multiplyScalar(3.05/Math.max(size.y,.001));root.updateMatrixWorld(true);
   box=new THREE.Box3().setFromObject(root,true);root.position.y-=box.min.y;root.position.z=.06;boss3VisualBaseY=root.position.y;
   boss3Root.add(root);boss3Visual=root;boss3VRM=vrm;boss3Ready=true;boss3Fallback.visible=false;
   const h=vrm?.humanoid;
   for(const n of ['hips','spine','chest','upperChest','neck','head','leftShoulder','rightShoulder','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot']){
    const node=h?.getNormalizedBoneNode?.(n);if(node)cacheBoss3Bone(n,node);
    const raw=h?.getRawBoneNode?.(n);boss3RenderBones[n]=raw||node||null;
   }
   for(const n of boss3BustNodes){n.scale.x*=1.18;n.scale.y*=1.08;n.scale.z*=1.22}
   if(boss3Bones.spine){boss3Bones.spine.scale.x*=.91;boss3Bones.spine.scale.z*=.90}
   if(boss3Bones.chest){boss3Bones.chest.scale.x*=1.05;boss3Bones.chest.scale.z*=1.10}
   if(boss3Bones.upperChest){boss3Bones.upperChest.scale.x*=1.06;boss3Bones.upperChest.scale.z*=1.12}
   if(boss3Bones.hips){boss3Bones.hips.scale.x*=1.06;boss3Bones.hips.scale.z*=1.10}
   if(boss3Bones.leftUpperLeg)boss3Bones.leftUpperLeg.scale.x*=1.04;
   if(boss3Bones.rightUpperLeg)boss3Bones.rightUpperLeg.scale.x*=1.04;
   poseBoss3(.12);syncBoss3Rig(0);
   console.info('Seria VRM rig', {normalizedArms:!!boss3Bones.rightUpperArm,rawArms:!!boss3RenderBones.rightUpperArm,rawHand:!!boss3RenderBones.rightHand});
   flash(BOSS3_NAME,.9);
  },undefined,err=>console.warn('Seria / Vita VRM unavailable.',err));
 }catch(err){console.warn('three-vrm unavailable for Seria.',err)}
}
function enforceBoss3Visibility(){
 if(BOSS_VARIANT!==3)return;
 for(const child of boss.children)child.visible=(child===boss3Root);
 boss3Root.visible=true;if(!boss3Ready)boss3Fallback.visible=true;
}
function updateBoss3Weapon(){
 if(!boss3Ready||state.bossHp<=0){boss3WeaponRoot.visible=false;return}
 const hand=boss3RenderBones.rightHand||boss3Bones.rightHand,lower=boss3RenderBones.rightLowerArm||boss3Bones.rightLowerArm;
 if(!hand||!lower){boss3WeaponRoot.visible=false;return}
 boss3WeaponRoot.visible=true;
 const axis=weaponArmAxis(lower,hand,bossCombatOffset(0,.15,1));
 const marks=state.bossState==='b3_triple'?BOSS3_TRIPLE_MARKS:state.bossState==='b3_cross'?BOSS3_CROSS_MARKS:state.bossState==='b3_wing_combo'?BOSS3_WING_MARKS:state.bossState==='b3_dance'?BOSS3_DANCE_MARKS:state.bossState==='b3_echoes'?BOSS3_ECHO_MARKS:state.bossState==='b3_dance2'?BOSS3_DANCE2_MARKS:null;
 const edge=marks?bossKeyedSlash(state.bossTimer,marks,state.bossState==='b3_dance2'?{wind:.105,cut:.065,recover:.105}:{wind:.24,cut:.12,recover:.22}):null;
 const roll=edge?edge.side*edge.impact*(state.bossState==='b3_dance2'?.42:.3):0;
 placeWeaponAtPrimaryGrip(boss3WeaponRoot,hand,-.12,axis,roll);
 if(boss3Katana.parent!==boss3WeaponRoot)boss3WeaponRoot.add(boss3Katana);
}
function applyBoss3PrimaryArmIK(dt){
 if(!boss3Ready||!boss3Bones.rightUpperArm||!boss3Bones.rightHand)return;
 const shoulder=new THREE.Vector3();boss3Bones.rightUpperArm.getWorldPosition(shoulder);
 const reach=getArmReach(boss3Bones,'right'),st=state.bossState,t=state.bossTimer;
 let local=bossWalkingHand(new THREE.Vector3(.36,-.5,.2),.016,.038,.01);
 if(['b3_triple','b3_wing_combo','b3_dance'].includes(st)){
   const marks=st==='b3_triple'?BOSS3_TRIPLE_MARKS:st==='b3_wing_combo'?BOSS3_WING_MARKS:BOSS3_DANCE_MARKS;
   const beat=bossKeyedSlash(t,marks,{wind:.22,cut:.12,recover:.2});
   local.copy(bossSwordHandArc(beat,reach,{windX:.56,cutX:.66,baseY:-.38,liftY:.14,dropY:.1,baseZ:.22,windBack:-.18,forward:.94,pullback:.38,recoverX:.1}).multiplyScalar(1/reach));
 }else if(st==='b3_dance2'){
   const beat=bossKeyedSlash(t,BOSS3_DANCE2_MARKS,{wind:.105,cut:.065,recover:.105});
   if(beat){
    const side=beat.side,cut=beat.cut,recover=beat.recover;
    local.set(
      (THREE.MathUtils.lerp(side*.7,-side*.76,cut)*(1-recover)+side*.1*recover),
      -.48-.36*cut+.18*recover,
      .18+1.18*cut-.48*recover
    );
   }else local.set(.12,-.5,.28);
 }else if(st==='b3_cross'||st==='b3_echoes'){
   const marks=st==='b3_cross'?BOSS3_CROSS_MARKS:BOSS3_ECHO_MARKS;
   const beat=bossKeyedSlash(t,marks,{wind:.26,cut:.12,recover:.22});
   local.copy(bossSwordHandArc(beat,reach,{windX:.64,cutX:.72,baseY:-.34,liftY:.18,dropY:.12,baseZ:.18,windBack:-.24,forward:1.02,pullback:.42}).multiplyScalar(1/reach));
 }else if(st==='b3_lunge'||st==='b3_rising'){
   local.set(.04,-.26,1.18);
 }else if(st==='b3_dive_bloom'){
   local.set(.08,-.2,1.05);
 }else if(st==='b3_phase'||st==='b3_flower'){
   local.set(.42,.03,.48);
 }
 const target=shoulder.clone().add(bossCombatOffset(local.x*reach,local.y*reach,local.z*reach));
 const elbowHint=shoulder.clone().add(bossCombatOffset(.3*reach,-.32*reach,.2*reach));
 solveArmCCD(boss3Bones,'right',target,elbowHint,1-Math.exp(-dt*46));
}
function applyBoss3WeaponGripIK(dt){
 if(!boss3Ready||!boss3WeaponRoot.visible||!boss3Bones.leftUpperArm||!boss3Bones.leftHand)return;
 const twoHand=state.boss3Phase===2||['b3_dance','b3_dance2','b3_wing_combo','b3_lunge','b3_rising','b3_echoes'].includes(state.bossState);
 const shoulder=new THREE.Vector3();boss3Bones.leftUpperArm.getWorldPosition(shoulder);
 const reach=getArmReach(boss3Bones,'left');
 let target,elbowHint;
 if(twoHand){
   boss3WeaponRoot.updateWorldMatrix(true,true);
   target=boss3WeaponRoot.localToWorld(new THREE.Vector3(0,-.37,0));
   elbowHint=shoulder.clone().add(bossCombatOffset(-.3*reach,-.3*reach,.15*reach));
 }else{
   target=shoulder.clone().add(bossCombatOffset(-.18*reach,-.62*reach,.16*reach));
   elbowHint=shoulder.clone().add(bossCombatOffset(-.34*reach,-.34*reach,.1*reach));
 }
 solveArmCCD(boss3Bones,'left',target,elbowHint,1-Math.exp(-dt*42));
}
function boss3Once(tag,fn){if(boss3Fired.has(tag))return false;boss3Fired.add(tag);fn?.();return true}
function boss3FacingDot(){
 const to=flatDir(boss.position,player.position);
 const f=new THREE.Vector3(Math.sin(boss.rotation.y),0,Math.cos(boss.rotation.y));
 return f.dot(to);
}
function boss3Heal(amount){
 if(state.bossHp<=0)return;
 amount*=BOSS3_HEAL_SCALE;
 const old=state.bossHp;state.bossHp=Math.min(state.bossMaxHp,state.bossHp+amount);
 if(state.bossHp>old){
  state.boss3HealPulse=.18;
  boss3Aura.intensity=Math.max(boss3Aura.intensity,13);
 }
}
function boss3Strike(tag,range,dmg,posture,unblockable=false,minDot=-.35,healMul=2.5){
 if(boss3Fired.has(tag))return;
 boss3Once(tag+'-vfx',()=>spawnBoss2Slash(1.12+Math.min(.7,range*.08),state.boss3Phase===2?0xff4968:0xc9b8b8));
 if(!boss3MeleeRequests.some(r=>r.tag===tag))boss3MeleeRequests.push({tag,dmg,posture,unblockable,minDot,healMul,ttl:.26});
}
function resetBoss3PhysicalTrace(){boss3WeaponTrace.valid=false}
function processBoss3PhysicalHits(){
 if(!boss3WeaponRoot.visible){boss3WeaponTrace.valid=false;boss3MeleeRequests.length=0;return}
 const seg=combatWorldSegment(boss3WeaponRoot,new THREE.Vector3(0,.16,0),new THREE.Vector3(0,2.26,0));
 const caps=combatHumanoidCapsules(playerVrmBones,player,2.0);
 let hit=null;
 if(boss3WeaponTrace.valid)hit=combatSweptBladeContact(boss3WeaponTrace.base,boss3WeaponTrace.tip,seg.base,seg.tip,caps,.115);
 boss3WeaponTrace.base.copy(seg.base);boss3WeaponTrace.tip.copy(seg.tip);boss3WeaponTrace.valid=true;
 if(hit){
  for(const req of boss3MeleeRequests){
   if(boss3Fired.has(req.tag))continue;
   boss3Fired.add(req.tag);state.shake=Math.max(state.shake,.08);spawnSparks(hit.point,10,4.8);
   if(state.invuln>0){flash('회피',.12);break}
   hurtPlayer(req.dmg,req.posture,req.unblockable);
   boss3Heal(Math.max(28,Math.round(req.dmg*req.healMul)));
   break;
  }
 }
 for(let i=boss3MeleeRequests.length-1;i>=0;i--){
  if(boss3Fired.has(boss3MeleeRequests[i].tag)||boss3MeleeRequests[i].ttl<=0)boss3MeleeRequests.splice(i,1);
 }
}
function spawnBoss3Petals(count=18,power=3.2){
 const geo=new THREE.PlaneGeometry(.09,.18);
 for(let i=0;i<count;i++){
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:i%3===0?0xff9daf:0xd9345b,side:THREE.DoubleSide,transparent:true,opacity:.82,depthWrite:false}));
  m.position.copy(boss.position).add(new THREE.Vector3((Math.random()-.5)*1.3,.45+Math.random()*1.8,(Math.random()-.5)*1.3));
  m.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
  const a=Math.random()*Math.PI*2,s=.8+Math.random()*power;
  scene.add(m);boss3Fx.push({m,life:.55+Math.random()*.5,vel:new THREE.Vector3(Math.cos(a)*s,.6+Math.random()*2.4,Math.sin(a)*s),spin:(Math.random()-.5)*8});
 }
}
const boss3SlashWaves=[];
function spawnBoss3DownSlashWave(index=0){
 const phase2=state.boss3Phase===2;
 const start=boss.position.clone().add(new THREE.Vector3(0,2.15,0));
 if(boss3WeaponRoot.visible){
  const blade=combatWorldSegment(boss3WeaponRoot,new THREE.Vector3(0,1.72,0),new THREE.Vector3(0,2.24,0));
  start.copy(blade.tip);
 }
 const target=player.position.clone().add(new THREE.Vector3(0,.92,0));
 const dir=target.clone().sub(start).normalize(),width=phase2?1.68:1.46;
 const m=new THREE.Mesh(new THREE.BoxGeometry(width,.085,.055),new THREE.MeshBasicMaterial({color:phase2?0xff5c7b:0xe7d7de,transparent:true,opacity:.82,depthWrite:false,side:THREE.DoubleSide}));
 m.position.copy(start);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);scene.add(m);
 const axis=new THREE.Vector3(1,0,0).applyQuaternion(m.quaternion).normalize(),half=width*.5;
 const base=m.position.clone().addScaledVector(axis,-half),tip=m.position.clone().addScaledVector(axis,half);
 boss3SlashWaves.push({obj:m,vel:dir.multiplyScalar(phase2?14.8:13.2),life:1.2,dmg:phase2?11:9,posture:phase2?13:10,radius:.115,half,prevBase:base,prevTip:tip,index});
}
function updateBoss3SlashWaves(dt){
 if(!boss3SlashWaves.length)return;
 const caps=combatHumanoidCapsules(playerVrmBones,player,2.0);
 for(let i=boss3SlashWaves.length-1;i>=0;i--){
  const w=boss3SlashWaves[i];w.life-=dt;w.obj.position.addScaledVector(w.vel,dt);
  const axis=new THREE.Vector3(1,0,0).applyQuaternion(w.obj.quaternion).normalize();
  const base=w.obj.position.clone().addScaledVector(axis,-w.half),tip=w.obj.position.clone().addScaledVector(axis,w.half);
  const hit=combatSweptBladeContact(w.prevBase,w.prevTip,base,tip,caps,w.radius);
  if(hit){
   spawnSparks(hit.point,8,3.8);
   if(state.invuln>0)flash('회피',.12);else hurtPlayer(w.dmg,w.posture,false);
   scene.remove(w.obj);w.obj.geometry?.dispose?.();w.obj.material?.dispose?.();boss3SlashWaves.splice(i,1);continue;
  }
  w.prevBase.copy(base);w.prevTip.copy(tip);w.obj.material.opacity=Math.min(.82,Math.max(0,w.life*1.7));
  if(w.life<=0||w.obj.position.y<-.5||w.obj.position.length()>52){scene.remove(w.obj);w.obj.geometry?.dispose?.();w.obj.material?.dispose?.();boss3SlashWaves.splice(i,1)}
 }
}
function clearBoss3SlashWaves(){
 for(const w of boss3SlashWaves){scene.remove(w.obj);w.obj.geometry?.dispose?.();w.obj.material?.dispose?.()}
 boss3SlashWaves.length=0;
}
function updateBoss3Fx(dt){
 for(let i=boss3Fx.length-1;i>=0;i--){
  const f=boss3Fx[i];f.life-=dt;f.vel.y-=dt*3.4;f.m.position.addScaledVector(f.vel,dt);
  f.m.rotation.x+=dt*f.spin;f.m.rotation.z-=dt*f.spin*.7;f.m.material.opacity=Math.max(0,Math.min(.82,f.life*1.6));
  if(f.life<=0){scene.remove(f.m);f.m.geometry?.dispose?.();f.m.material?.dispose?.();boss3Fx.splice(i,1)}
 }
}
const BOSS3_DUR={
 b3_triple:2.04,b3_lunge:1.22,b3_cross:1.52,b3_dance:2.72,b3_rising:1.52,
 b3_phase:2.42,b3_wing_combo:2.72,b3_dive_bloom:2.46,b3_echoes:2.62,b3_flower:2.62,b3_dance2:7.0
};
const BOSS3_TRIPLE_MARKS=[1.52,.88,.26];
const BOSS3_CROSS_MARKS=[1.05,.38];
const BOSS3_DANCE_MARKS=[2.12,1.48,.84,.22];
const BOSS3_WING_MARKS=[2.16,1.53,.9,.27];
const BOSS3_WATER_BURSTS=[
 [5.45,5.26,5.07,4.88],
 [3.80,3.60,3.40,3.20],
 [2.05,1.85,1.65,1.45,1.25],
 [.92]
];
const BOSS3_DANCE2_MARKS=BOSS3_WATER_BURSTS.flat();
const BOSS3_ECHO_MARKS=[2.06,1.45,.84,.23];
function chooseBoss3Attack(){
 if(state.bossHp<=0)return;state.bossPunish=0;
 setDanger(false);boss3Fired.clear();
 let pool;
 if(state.boss3Phase===2)pool=['b3_wing_combo','b3_dive_bloom','b3_echoes','b3_flower','b3_dance2','b3_lunge'];
 else pool=['b3_triple','b3_lunge','b3_cross','b3_dance','b3_rising','b3_dance2'];
 let pick;
 if(state.potionPunishQueued){pick=state.boss3Phase===2?'b3_dive_bloom':'b3_lunge';state.potionPunishQueued=false}
 else{
  const choices=pool.filter(x=>x!==state.boss3Last);
  pick=choices[Math.floor(Math.random()*choices.length)];
 }
 state.boss3Last=pick;state.bossState=pick;state.bossTimer=BOSS3_DUR[pick]||1.4;resetBoss3PhysicalTrace();
 if(pick==='b3_dance2'){clearBoss3SlashWaves();state.boss3WaterBurst=0;state.boss3WaterDir.copy(flatDir(boss.position,player.position));state.boss3WaterSide*=-1}
 if(pick==='b3_dive_bloom')setDanger(true);
 state.bossAttackTarget.copy(player.position);state.bossAttackTarget.y=0;
}
function finishBoss3Attack(recovery=.66){
 setDanger(false);state.bossState='idle';beginBossPunish(recovery);boss3Fired.clear();boss3MeleeRequests.length=0;resetBoss3PhysicalTrace();boss.position.y=0;
}
function poseBoss3(dt){
 if(!boss3Ready)return;
 resetBoss3Pose(dt);
 const st=state.bossState,t=state.bossTimer,phase=state.boss3Phase;
 const breath=Math.sin(state.time*2.3),hitReact=state.boss3HitReact>0?Math.sin((state.boss3HitReact/.14)*Math.PI):0;
 setBoss3Bone('hips',0,.025*breath,.035*breath,7,dt);
 setBoss3Bone('spine',-.035-hitReact*.13,0,-.025*breath+hitReact*.09,11,dt);
 setBoss3Bone('head',.015-hitReact*.055,-.018*breath,-hitReact*.07,11,dt);
 if(st==='idle'&&state.bossPunish>0){
  const r=clamp(state.bossPunish/1.9,0,1);
  setBoss3Bone('hips',.06*r,-.1*r,0,18,dt);setBoss3Bone('spine',-.3*r,.1*r,.04*r,20,dt);setBoss3Bone('chest',-.12*r,.05*r,0,18,dt);
  setBoss3Bone('rightUpperArm',-.42,-.05,-.3,18,dt);setBoss3Bone('rightLowerArm',-.82,0,-.14,20,dt);
  setBoss3Bone('leftUpperArm',-.2,.02,.18,16,dt);setBoss3Bone('head',.1*r,-.04*r,0,16,dt);
 }else if(st==='idle'){
  const sway=Math.sin(state.time*1.6),phaseAmp=phase===2?1.3:1;
  setBoss3Bone('hips',0,.04*sway,.09*sway*phaseAmp,8,dt);
  setBoss3Bone('spine',-.05,.02*sway,-.05*sway*phaseAmp,8,dt);
  setBoss3Bone('chest',-.07,-.01*sway,-.03*sway*phaseAmp,8,dt);
  setBoss3Bone('upperChest',-.03,0,-.02*sway*phaseAmp,8,dt);
  setBoss3Bone('head',.03,-.02*sway,-.03*sway,8,dt);
  setBoss3Bone('rightUpperArm',-.52,.08,-.32,10,dt);setBoss3Bone('rightLowerArm',-.58,0,-.18,10,dt);
  setBoss3Bone('leftUpperArm',-.10,-.05,.24,8,dt);
 }else if(st==='b3_dance2'){
  poseBoss3AerialDance(dt,t);
 }else if(['b3_triple','b3_cross','b3_wing_combo','b3_dance','b3_echoes'].includes(st)){
  const marks=st==='b3_triple'?BOSS3_TRIPLE_MARKS:st==='b3_cross'?BOSS3_CROSS_MARKS:st==='b3_wing_combo'?BOSS3_WING_MARKS:st==='b3_dance'?BOSS3_DANCE_MARKS:BOSS3_ECHO_MARKS;
  const beat=bossKeyedSlash(t,marks,{wind:.24,cut:.12,recover:.22}),cut=beat?.impact||0,side=beat?.side||1,wind=beat?.wind||0;
  setBoss3Bone('hips',-.03*wind,side*.18*cut,0,22,dt);setBoss3Bone('spine',-.1,side*.34*cut,-side*.1*cut,24,dt);
  setBoss3Bone('chest',-.04,side*.18*cut,-side*.05*cut,23,dt);setBoss3Bone('head',.02,-side*.08*cut,side*.03*cut,18,dt);
  setBoss3Bone('rightShoulder',0,side*.08*cut,-.1,22,dt);setBoss3Bone('rightUpperArm',-.58+.08*wind,.08,side*.34*cut,24,dt);setBoss3Bone('rightLowerArm',-.72+.36*cut,0,-side*.16*cut,24,dt);
  setBoss3Bone('leftUpperArm',-.26,-.08,-side*.16*cut,20,dt);
  setBoss3Bone('leftUpperLeg',-.18*wind,0,.06,18,dt);setBoss3Bone('rightUpperLeg',.16*cut,0,-.04,18,dt);
 }else if(st==='b3_lunge'||st==='b3_rising'){
  setBoss3Bone('rightUpperArm',-1.38,.05,-.12,20,dt);setBoss3Bone('rightLowerArm',-.12,0,0,20,dt);
  setBoss3Bone('spine',-.27,.04,0,18,dt);setBoss3Bone('leftUpperArm',-.45,-.2,.42,16,dt);
 }else if(st==='b3_phase'||st==='b3_flower'){
  setBoss3Bone('leftUpperArm',-.55,-.55,.92,13,dt);setBoss3Bone('rightUpperArm',-.55,.55,-.92,13,dt);
  setBoss3Bone('leftLowerArm',-.35,0,.32,13,dt);setBoss3Bone('rightLowerArm',-.35,0,-.32,13,dt);
  setBoss3Bone('upperChest',-.18,0,0,12,dt);setBoss3Bone('head',-.08,0,0,10,dt);
 }else if(st==='b3_dive_bloom'){
  setBoss3Bone('rightUpperArm',-1.18,.18,-.25,18,dt);setBoss3Bone('leftUpperArm',-.72,-.2,.48,16,dt);
  setBoss3Bone('spine',-.3,.05,0,18,dt);
 }
 if(phase===2)setBoss3Bone('upperChest',-.055,0,0,7,dt);
 if(st!=='b3_dance2'){
  const marks=st==='b3_triple'?BOSS3_TRIPLE_MARKS:st==='b3_cross'?BOSS3_CROSS_MARKS:st==='b3_wing_combo'?BOSS3_WING_MARKS:st==='b3_dance'?BOSS3_DANCE_MARKS:st==='b3_echoes'?BOSS3_ECHO_MARKS:null;
  const beat=marks?bossKeyedSlash(t,marks,{wind:.24,cut:.12,recover:.22}):null,side=beat?.side||1,edge=beat?.impact||0;
  setBoss3Bone('rightHand',-.07,-.05-side*.13*edge,-.12-side*.22*edge,26,dt);
  setBoss3Bone('leftHand',-.06,.04+side*.04*edge,.1+side*.08*edge,22,dt);
 }
}
function hitBoss3(base,posture=12,contact=null){
 if(state.bossHp<=0)return;
 let dmg=base,pd=posture;[dmg,pd]=bossPunishDamage(dmg,pd);
 if(state.bossStagger>0){dmg*=1.58;pd*=.22}
 state.bossHp=Math.max(0,state.bossHp-dmg);addBossPosture(pd);
 state.boss3HitReact=.14;triggerPlayerHitImpact(contact||player.position.clone().lerp(boss.position,.6).add(new THREE.Vector3(0,1.2,0)));
 if(state.bossHp<=0){
  state.bossState='dead';state.potionPunishQueued=false;setDanger(false);flash('붉은 백합이 스러졌다 · 토벌 완료',1.25);
 }else if(state.bossPosture>=BOSS_POSTURE_MAX[3]){
  resetBossPostureAfterBreak(.32);state.bossStagger=1.18;state.bossState='stagger';state.bossTimer=1.18;flash('자세 붕괴',.45);
 }
}
function updateBoss3(dt){
 for(let i=boss3MeleeRequests.length-1;i>=0;i--){boss3MeleeRequests[i].ttl-=dt;if(boss3MeleeRequests[i].ttl<=0)boss3MeleeRequests.splice(i,1)}
 enforceBoss3Visibility();updateBoss3Fx(dt);updateBoss2Fx(dt);updateBoss3SlashWaves(dt);updateBoss3Weapon();
 bossRim.position.set(boss.position.x,boss.position.y+3.0,boss.position.z-4.0);
 boss3Halo.rotation.z+=dt*(state.boss3Phase===2?1.8:.72);
 boss3HaloMat.opacity=(state.boss3Phase===2?.22:.1)+Math.sin(state.time*5)*.035;
 state.boss3HealPulse=Math.max(0,state.boss3HealPulse-dt);state.boss3HitReact=Math.max(0,state.boss3HitReact-dt);
 boss3Aura.intensity=(state.boss3Phase===2?13.5:7.4)+(state.boss3HealPulse>0?5:0)+Math.sin(state.time*6)*.55;
 if(boss3Visual){
  const targetY=boss3VisualBaseY+(state.boss3Phase===2?.018*Math.sin(state.time*4.2):0);
  boss3Visual.position.y=THREE.MathUtils.lerp(boss3Visual.position.y,targetY,1-Math.exp(-dt*10));
 }
 if(state.bossHp<=0){
  clearBoss3SlashWaves();state.boss3DeadPose=Math.min(1,state.boss3DeadPose+dt*.6);
  if(boss3Visual){boss3Visual.rotation.z=THREE.MathUtils.lerp(boss3Visual.rotation.z,-1.35,state.boss3DeadPose*.05);boss3Visual.position.y=THREE.MathUtils.lerp(boss3Visual.position.y,.08,state.boss3DeadPose*.035)}
  boss3WeaponRoot.visible=false;poseBoss3(dt);syncBoss3Rig(dt);return;
 }
 if(state.boss3Phase===1&&state.bossHp<=state.bossMaxHp*.5){
  state.boss3Phase=2;state.bossState='b3_phase';state.bossTimer=BOSS3_DUR.b3_phase;boss3Fired.clear();
  state.bossHp=Math.max(state.bossHp,state.bossMaxHp*.62);
  boss3Aura.color.setHex(0xff4b73);boss3Aura.intensity=13.5;
  boss3HaloMat.color.setHex(0xff6d96);boss3HaloMat.opacity=.22;
  boss3BladeMat.emissive.setHex(0xb51e49);boss3BladeMat.emissiveIntensity=.75;
  setDanger(false);spawnBoss3Petals(48,6.2);flash('혈화 개화 · 두 번째 검무',1.0);
 }
 if(state.bossStagger>0){
  setDanger(false);state.bossStagger=Math.max(0,state.bossStagger-dt);boss.position.y=THREE.MathUtils.lerp(boss.position.y,0,1-Math.exp(-dt*13));
  poseBoss3(dt);applyBoss3PrimaryArmIK(dt);applyBoss3WeaponGripIK(dt);syncBoss3Rig(dt);if(state.bossStagger<=0){state.bossState='idle';state.bossTimer=.72}return;
 }
 state.bossTimer-=dt;updateBossPunish(dt);
 const d=dist(),liveDir=flatDir(boss.position,player.position),dur=BOSS3_DUR[state.bossState]||1;
 const dir=state.bossState==='idle'?liveDir:bossCommittedDir(dur,state.bossTimer,state.bossState==='b3_dance2'?.72:.56);
 const face=Math.atan2(dir.x,dir.z);
 if(state.bossState!=='idle'&&(!['b3_lunge','b3_dive_bloom'].includes(state.bossState)||state.bossTimer>.48))boss.rotation.y=lerpAngle(boss.rotation.y,face,1-Math.exp(-dt*9.5));
 if(state.bossState==='idle'){
  boss.position.y=THREE.MathUtils.lerp(boss.position.y,0,1-Math.exp(-dt*16));
  if(state.bossPunish<=0){
   boss.rotation.y=lerpAngle(boss.rotation.y,Math.atan2(liveDir.x,liveDir.z),1-Math.exp(-dt*5.5));
   if(d>3.6)boss.position.addScaledVector(liveDir,dt*(state.boss3Phase===2?4.0:3.3));
   else if(d<2.1)boss.position.addScaledVector(liveDir,-dt*.9);
   const side=new THREE.Vector3(liveDir.z,0,-liveDir.x).multiplyScalar(Math.sin(state.time*1.7)*(state.boss3Phase===2?.72:.48)*dt);
   boss.position.add(side);
  }
  if(state.bossTimer<=0&&state.bossPunish<=0)chooseBoss3Attack();
 }else if(state.bossState==='b3_triple'){
  const dmgs=[18,22,30];
  BOSS3_TRIPLE_MARKS.forEach((m,i)=>{
   if(state.bossTimer<=m+.11&&state.bossTimer>m-.11)boss3Strike('tr'+i,3.7+i*.1,dmgs[i],17+i*3,false,-.62,2.4);
   if(state.bossTimer<=m+.22&&state.bossTimer>m+.05&&d>2.5)boss.position.addScaledVector(dir,dt*3.4);
  });
  if(state.bossTimer<=0)finishBoss3Attack(.72);
 }else if(state.bossState==='b3_lunge'){
  if(state.bossTimer<.58&&state.bossTimer>.2)boss.position.addScaledVector(dir,dt*(state.boss3Phase===2?12.8:10.8));
  if(state.bossTimer<=.34&&state.bossTimer>.06)boss3Strike('lunge',4.5,state.boss3Phase===2?34:29,31,false,.0,2.8);
  if(state.bossTimer<=0)finishBoss3Attack(.76);
 }else if(state.bossState==='b3_cross'){
  if(state.bossTimer>1.12){const side=new THREE.Vector3(dir.z,0,-dir.x);boss.position.addScaledVector(side,dt*3.2)}
  const dmgs=[21,29];
  BOSS3_CROSS_MARKS.forEach((m,i)=>{
   if(state.bossTimer<=m+.11&&state.bossTimer>m-.11)boss3Strike('cross'+i,3.8,dmgs[i],20+i*7,false,-.68,2.5);
  });
  if(state.bossTimer<=0)finishBoss3Attack(.8);
 }else if(state.bossState==='b3_dance'){
  BOSS3_DANCE_MARKS.forEach((m,i)=>{
   if(state.bossTimer<=m+.1&&state.bossTimer>m-.1)boss3Strike('dance'+i,3.8,16+(i%3)*2,14+(i%3)*2,false,-.74,2.2);
   if(state.bossTimer<=m+.2&&state.bossTimer>m+.04&&d>2.45)boss.position.addScaledVector(dir,dt*3.7);
  });
  if(state.bossTimer<=0)finishBoss3Attack(.92);
 }else if(state.bossState==='b3_dance2'){
  const flight=boss3Dance2Flight(state.bossTimer);
  boss.position.y=flight.y;
  if(flight.burst&&state.boss3WaterBurst!==flight.burst){
   state.boss3WaterBurst=flight.burst;
   state.boss3WaterDir.copy(flatDir(boss.position,player.position));
   state.boss3WaterSide*=-1;
   boss3Once('water-burst-petal'+flight.burst,()=>spawnBoss3Petals(flight.burst===4?14:9,3.2));
  }
  const waterDir=state.boss3WaterDir.lengthSq()?state.boss3WaterDir:dir;
  const waterSide=new THREE.Vector3(waterDir.z,0,-waterDir.x);
  if(flight.burst){
   const speed=flight.burst===1?8.2:flight.burst===2?8.8:flight.burst===3?9.5:6.4;
   if(d>1.0)boss.position.addScaledVector(waterDir,dt*speed*flight.dash);
   boss.position.addScaledVector(waterSide,dt*flight.orbit*state.boss3WaterSide*2.1);
   const aim=Math.atan2(waterDir.x,waterDir.z);
   boss.rotation.y=lerpAngle(boss.rotation.y,aim+flight.turn,1-Math.exp(-dt*18));
  }else{
   boss.position.addScaledVector(waterSide,dt*flight.orbit*.6);
   boss.rotation.y=lerpAngle(boss.rotation.y,face,1-Math.exp(-dt*7));
  }
  BOSS3_DANCE2_MARKS.forEach((m,i)=>{
   if(state.bossTimer<=m+.055&&state.bossTimer>m-.055){
    const final=i===BOSS3_DANCE2_MARKS.length-1;
    boss3Once('water-vfx'+i,()=>{spawnBoss2Slash(final?2.55:2.05+(i%4)*.07,final?0xffd5df:state.boss3Phase===2?0xff718f:0xe7d7de);spawnBoss3Petals(final?16:state.boss3Phase===2?5:2,final?4.2:2.4);spawnBoss3DownSlashWave(i)});
    boss3Strike('water-hit'+i,final?4.8:4.25,final?24:9+(i%4),final?30:10+(i%3)*2,false,-.92,final?2.4:1.7);
   }
  });
  if(state.bossTimer<=0){state.boss3WaterBurst=0;boss.position.y=0;spawnDustBurst(boss.position,.7);if(state.boss3Phase===2)spawnBossShockwave(3.2,14);finishBoss3Attack(1.48)}

 }else if(state.bossState==='b3_rising'){
  if(state.bossTimer<.72&&state.bossTimer>.32)boss.position.addScaledVector(dir,dt*6.4);
  if(state.bossTimer<=.52&&state.bossTimer>.22)boss3Strike('rise',3.45,31,36,false,-.25,2.6);
  if(state.bossTimer<.45)boss.position.y=Math.sin(clamp((.45-state.bossTimer)/.45,0,1)*Math.PI)*.8;
  if(state.bossTimer<=0)finishBoss3Attack(.82);
 }else if(state.bossState==='b3_phase'){
  const e=BOSS3_DUR.b3_phase-state.bossTimer;
  if(e<1.15)boss.position.y=Math.sin(clamp(e/1.15,0,1)*Math.PI/2)*2.4;
  else boss.position.y=THREE.MathUtils.lerp(boss.position.y,0,1-Math.exp(-dt*13));
  if(state.bossTimer<=1.12)boss3Once('phase-petal',()=>spawnBoss3Petals(28,4.6));
  if(state.bossTimer<=.46)boss3Once('phase-burst',()=>{spawnBoss2Pulse(boss.position.clone().add(new THREE.Vector3(0,.75,0)),4.25,0xd92d55,.62);spawnBossShockwave(4.4,31)});
  if(state.bossTimer<=0)finishBoss3Attack(1.0);
 }else if(state.bossState==='b3_wing_combo'){
  const dmgs=[18,21,24,32];
  BOSS3_WING_MARKS.forEach((m,i)=>{
   if(state.bossTimer<=m+.1&&state.bossTimer>m-.1)boss3Strike('wing'+i,3.95,dmgs[i],16+i*3,false,-.7,2.5);
   if(state.bossTimer<=m+.2&&state.bossTimer>m+.04&&d>2.5)boss.position.addScaledVector(dir,dt*3.9);
  });
  if(state.bossTimer<=0)finishBoss3Attack(.88);
 }else if(state.bossState==='b3_dive_bloom'){
  const e=BOSS3_DUR.b3_dive_bloom-state.bossTimer;
  if(e<.82){boss.position.y=Math.sin(clamp(e/.82,0,1)*Math.PI/2)*3.2;boss.position.addScaledVector(dir,dt*2.5)}
  else if(state.bossTimer>.46){boss.position.addScaledVector(dir,dt*10.8);boss.position.y=THREE.MathUtils.lerp(boss.position.y,.12,1-Math.exp(-dt*12))}
  if(state.bossTimer<=.54)boss3Once('dive-land',()=>{
   spawnBoss3Petals(30,5.4);spawnBoss2Pulse(boss.position.clone().add(new THREE.Vector3(0,.55,0)),4.0,0xe23b61,.58);
   if(dist()<4.0&&state.invuln<=0){hurtPlayer(38,42,true);boss3Heal(110)}
  });
  if(state.bossTimer<=.18)boss3Once('dive-after',()=>{spawnBossShockwave(4.8,28);if(dist()<4.8&&state.invuln<=0){hurtPlayer(20,24,false);boss3Heal(55)}});
  if(state.bossTimer<=0)finishBoss3Attack(1.08);
 }else if(state.bossState==='b3_echoes'){
  BOSS3_ECHO_MARKS.forEach((m,i)=>{
   if(state.bossTimer<=m+.16&&state.bossTimer>m+.08)boss3Once('echo-step'+i,()=>{
    const side=new THREE.Vector3(dir.z,0,-dir.x);boss.position.addScaledVector(side,(i%2?-.5:.5));boss.position.addScaledVector(dir,.45);spawnBoss3Petals(5,2.2);
   });
   if(state.bossTimer<=m+.1&&state.bossTimer>m-.1)boss3Strike('echo-hit'+i,4.0,19+i*2,17+i*2,false,-.78,2.35);
  });
  if(state.bossTimer<=0)finishBoss3Attack(.92);
 }else if(state.bossState==='b3_flower'){
  if(state.bossTimer>1.15)boss.position.y=THREE.MathUtils.lerp(boss.position.y,.35,1-Math.exp(-dt*4));
  if(state.bossTimer<=1.15)boss3Once('flower-petals',()=>spawnBoss3Petals(42,3.6));
  if(state.bossTimer<=.56)boss3Once('flower-burst',()=>{
   spawnBoss2Pulse(boss.position.clone().add(new THREE.Vector3(0,.8,0)),5.1,0xef5576,.76);spawnBossShockwave(5.3,34);
   if(dist()<5.0&&state.invuln<=0){hurtPlayer(42,45,false);boss3Heal(125)}
  });
  if(state.bossTimer<=0)finishBoss3Attack(1.3);
 }
 poseBoss3(dt);applyBossHumanoidLocomotion(setBoss3Bone,boss3Visual,boss3VisualBaseY,dt,{stride:state.boss3Phase===2?1.08:1,bob:.028,twist:.085});applyBoss3PrimaryArmIK(dt);updateBoss3Weapon();applyBoss3WeaponGripIK(dt);syncBoss3Rig(dt);updateBoss3Weapon();processBoss3PhysicalHits();
}


/* -------------------------------------------------------------------------- */
/* Boss 04: White-Night Sword Saint Vivi                                      */
/* CC0 VRoid boss with draw slash / illusion dance / dragon dash patterns     */
/* -------------------------------------------------------------------------- */
const boss4Root=new THREE.Group();boss4Root.name='ViviSwordSaintRoot';boss4Root.visible=BOSS_VARIANT===4;boss.add(boss4Root);
let boss4Visual=null,boss4VRM=null,boss4Ready=false,boss4VisualBaseY=0;
const boss4Bones={},boss4Rest={},boss4RenderBones={},boss4Fired=new Set(),boss4MeleeRequests=[];
const boss4WeaponTrace={valid:false,base:new THREE.Vector3(),tip:new THREE.Vector3()};
const boss4Aura=new THREE.PointLight(0x73b9ff,8.5,13,2);boss4Aura.position.set(0,1.35,.12);boss4Root.add(boss4Aura);
const boss4HaloMat=new THREE.MeshBasicMaterial({color:0x88bfff,transparent:true,opacity:.11,depthWrite:false});
const boss4Halo=new THREE.Mesh(new THREE.TorusGeometry(.9,.018,6,36),boss4HaloMat);boss4Halo.rotation.x=Math.PI/2;boss4Halo.position.y=.03;boss4Root.add(boss4Halo);
const boss4Fallback=new THREE.Group();boss4Root.add(boss4Fallback);
const b4Skin=new THREE.MeshStandardMaterial({color:0xe3b7aa,roughness:.5});
const b4Cloth=new THREE.MeshStandardMaterial({color:0x182b47,roughness:.58,metalness:.12,emissive:0x071524,emissiveIntensity:.22});
part(boss4Fallback,new THREE.CapsuleGeometry(.29,.8,5,8),b4Skin,[0,1.18,0]);
part(boss4Fallback,new THREE.BoxGeometry(.58,.66,.3),b4Cloth,[0,1.38,0]);
part(boss4Fallback,new THREE.SphereGeometry(.29,14,10),b4Skin,[0,2.02,.02]);

const boss4WeaponRoot=new THREE.Group();boss4WeaponRoot.visible=false;scene.add(boss4WeaponRoot);
const boss4BladeMat=new THREE.MeshStandardMaterial({color:0xeaf4ff,metalness:.94,roughness:.14,emissive:0x225d8f,emissiveIntensity:.46});
const boss4GripMat=new THREE.MeshStandardMaterial({color:0x131820,metalness:.28,roughness:.65});
const boss4Sword=new THREE.Group();
part(boss4Sword,new THREE.BoxGeometry(.105,2.3,.045),boss4BladeMat,[0,1.22,0]);
part(boss4Sword,new THREE.BoxGeometry(.52,.055,.12),boss4GripMat,[0,.08,0]);
part(boss4Sword,new THREE.CylinderGeometry(.047,.054,.52,8),boss4GripMat,[0,-.2,0]);
boss4WeaponRoot.add(boss4Sword);
const boss4Sheath=new THREE.Group();boss4Sheath.visible=BOSS_VARIANT===4;boss4Root.add(boss4Sheath);
part(boss4Sheath,new THREE.BoxGeometry(.12,2.12,.09),boss4GripMat,[-.45,1.02,.05],[0,0,.28]);

state.boss4AttackCount=0;state.boss4DashStep=-1;state.boss4DashDir=new THREE.Vector3();state.boss4HitReact=0;

function cacheBoss4Bone(name,node){if(!node)return;boss4Bones[name]=node;boss4Rest[name]={rotation:node.rotation.clone(),position:node.position.clone(),scale:node.scale.clone()}}
function setBoss4Bone(name,rx=0,ry=0,rz=0,speed=12,dt=.016){
 const b=boss4Bones[name],r=boss4Rest[name];if(!b||!r)return;
 const a=1-Math.exp(-dt*speed);
 b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,r.rotation.x+rx,a);
 b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,r.rotation.y+ry,a);
 b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,r.rotation.z+rz,a);
}
function resetBoss4Pose(dt){
 for(const [name,b] of Object.entries(boss4Bones)){
  const r=boss4Rest[name];if(!r)continue;const a=1-Math.exp(-dt*12);
  b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,r.rotation.x,a);b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,r.rotation.y,a);b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,r.rotation.z,a);
 }
}
function syncBoss4Rig(dt=0){if(!boss4VRM)return;boss4VRM.update?.(Math.max(0,dt));boss4Visual?.updateMatrixWorld?.(true)}
async function loadBoss4Avatar(){
 if(BOSS_VARIANT!==4)return;
 try{
  const {VRMLoaderPlugin,VRMUtils}=await import('@pixiv/three-vrm');
  const loader=new GLTFLoader();loader.setCrossOrigin('anonymous');loader.register(parser=>new VRMLoaderPlugin(parser));
  loader.load(BOSS4_MODEL_URL,gltf=>{
   const vrm=gltf.userData?.vrm||null;if(vrm)VRMUtils.rotateVRM0(vrm);
   const root=vrm?.scene||gltf.scene;
   root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(Array.isArray(o.material))o.material=o.material.map(m=>m.clone());else if(o.material)o.material=o.material.clone()}});
   root.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(root,true),size=new THREE.Vector3();box.getSize(size);
   root.scale.multiplyScalar(3.0/Math.max(size.y,.001));root.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(root,true);
   root.position.y-=box.min.y;root.position.z=.05;boss4VisualBaseY=root.position.y;
   boss4Root.add(root);boss4Visual=root;boss4VRM=vrm;boss4Ready=true;boss4Fallback.visible=false;
   const h=vrm?.humanoid;
   for(const n of ['hips','spine','chest','upperChest','neck','head','leftShoulder','rightShoulder','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot']){
    const node=h?.getNormalizedBoneNode?.(n);if(node)cacheBoss4Bone(n,node);
    const raw=h?.getRawBoneNode?.(n);boss4RenderBones[n]=raw||node||null;
   }
   poseBoss4(.12);syncBoss4Rig(0);flash(BOSS4_NAME,.9);
   console.info('Vivi Sword Saint VRM rig',{rawHand:!!boss4RenderBones.rightHand,arm:!!boss4Bones.rightUpperArm});
  },undefined,err=>console.warn('Vivi VRM unavailable.',err));
 }catch(err){console.warn('three-vrm unavailable for Vivi.',err)}
}
function enforceBoss4Visibility(){
 if(BOSS_VARIANT!==4)return;
 for(const child of boss.children)child.visible=(child===boss4Root);
 boss4Root.visible=true;if(!boss4Ready)boss4Fallback.visible=true;
}
function updateBoss4Weapon(){
 if(!boss4Ready||state.bossHp<=0){boss4WeaponRoot.visible=false;return}
 const hand=boss4RenderBones.rightHand||boss4Bones.rightHand,lower=boss4RenderBones.rightLowerArm||boss4Bones.rightLowerArm;
 if(!hand||!lower){boss4WeaponRoot.visible=false;return}
 boss4WeaponRoot.visible=true;
 const axis=weaponArmAxis(lower,hand,bossCombatOffset(0,.15,1));
 const marks=state.bossState==='b4_combo'?BOSS4_COMBO_MARKS:state.bossState==='b4_illusion'?BOSS4_ILLUSION_MARKS:null;
 const edge=marks?bossKeyedSlash(state.bossTimer,marks,{wind:.2,cut:.1,recover:.18}):null;
 let roll=edge?edge.side*edge.impact*.38:0;
 if(!edge&&state.bossState==='b4_batto'){
  const p=clamp(1-state.bossTimer/BOSS4_DUR.b4_batto,0,1),cut=motionSmooth(.48,.66,p);
  roll=-.42*cut;
 }
 placeWeaponAtPrimaryGrip(boss4WeaponRoot,hand,-.18,axis,roll);
}
const BOSS4_DUR={b4_combo:2.05,b4_batto:1.92,b4_illusion:3.82,b4_dragon:3.36};
const BOSS4_COMBO_MARKS=[1.48,.82,.22];
const BOSS4_ILLUSION_MARKS=[3.18,2.78,2.38,1.98,1.58,1.18,.78,.34];
const BOSS4_DRAGON_MARKS=[2.72,1.9,1.08,.3];
function boss4BeatTarget(t,marks,reach,forward=.82){
 const beat=bossKeyedSlash(t,marks,{wind:.2,cut:.1,recover:.18});
 if(!beat)return new THREE.Vector3(.24,-.54,.18);
 return bossSwordHandArc(beat,reach,{windX:.46,cutX:.58,baseY:-.46,liftY:.1,dropY:.08,baseZ:.14,windBack:-.2,forward,pullback:.34,recoverX:.08}).multiplyScalar(1/reach);
}
function applyBoss4PrimaryArmIK(dt){
 if(!boss4Ready||!boss4Bones.rightUpperArm||!boss4Bones.rightHand)return;
 const shoulder=new THREE.Vector3();boss4Bones.rightUpperArm.getWorldPosition(shoulder);
 const reach=getArmReach(boss4Bones,'right'),st=state.bossState,t=state.bossTimer;
 let local=bossWalkingHand(new THREE.Vector3(.3,-.52,.24),.014,.034,.01);
 if(st==='b4_combo')local=boss4BeatTarget(t,BOSS4_COMBO_MARKS,reach,.78);
 else if(st==='b4_illusion')local=boss4BeatTarget(t,BOSS4_ILLUSION_MARKS,reach,.88);
 else if(st==='b4_batto'){
  const p=clamp(1-t/BOSS4_DUR.b4_batto,0,1),cut=motionSmooth(.48,.66,p),recover=motionSmooth(.72,1,p);
  local.set(THREE.MathUtils.lerp(.42,-.72,cut)*(1-recover)+.16*recover,-.58+.28*cut,.02+1.02*cut-.5*recover);
 }else if(st==='b4_dragon')local.set(.02,-.25,1.18);
 const target=shoulder.clone().add(bossCombatOffset(local.x*reach,local.y*reach,local.z*reach));
 const elbowHint=shoulder.clone().add(bossCombatOffset(.3*reach,-.34*reach,.16*reach));
 solveArmCCD(boss4Bones,'right',target,elbowHint,1-Math.exp(-dt*46));
}
function poseBoss4(dt){
 if(!boss4Ready)return;resetBoss4Pose(dt);
 const st=state.bossState,t=state.bossTimer,hit=state.boss4HitReact>0?Math.sin((state.boss4HitReact/.14)*Math.PI):0;
 setBoss4Bone('spine',-.035-hit*.12,0,hit*.08,12,dt);setBoss4Bone('head',.02-hit*.05,0,-hit*.05,11,dt);
 if(st==='idle'&&state.bossPunish>0){
  const r=clamp(state.bossPunish/1.8,0,1);
  setBoss4Bone('hips',.05*r,-.08*r,0,18,dt);setBoss4Bone('spine',-.24*r,.08*r,.03*r,20,dt);setBoss4Bone('chest',-.1*r,.04*r,0,18,dt);
  setBoss4Bone('rightUpperArm',-.38,-.04,-.26,18,dt);setBoss4Bone('rightLowerArm',-.8,0,-.1,20,dt);setBoss4Bone('head',.08*r,-.03*r,0,16,dt);
 }else if(st==='idle'){
  const sway=Math.sin(state.time*1.7);setBoss4Bone('hips',0,.03*sway,.05*sway,8,dt);setBoss4Bone('spine',-.04,.02*sway,-.035*sway,8,dt);
  setBoss4Bone('rightUpperArm',-.46,.06,-.3,10,dt);setBoss4Bone('rightLowerArm',-.62,0,-.14,10,dt);setBoss4Bone('leftUpperArm',-.12,-.03,.2,8,dt);
 }else if(st==='b4_batto'){
  const p=clamp(1-t/BOSS4_DUR.b4_batto,0,1),cut=Math.sin(clamp((p-.45)/.34,0,1)*Math.PI);
  setBoss4Bone('hips',.08,-.34+.62*cut,0,18,dt);setBoss4Bone('spine',-.16,-.42+.82*cut,-.08*cut,20,dt);
  setBoss4Bone('leftUpperLeg',-.28,0,.08,18,dt);setBoss4Bone('rightUpperLeg',.18,0,-.06,18,dt);setBoss4Bone('rightLowerArm',-.78+.4*cut,0,-.12*cut,22,dt);
 }else if(st==='b4_combo'||st==='b4_illusion'){
  const marks=st==='b4_combo'?BOSS4_COMBO_MARKS:BOSS4_ILLUSION_MARKS,beat=soulsSwordBeat(t,marks,.24,.2);
  const cut=beat?Math.sin(clamp((beat.p-.3)/.52,0,1)*Math.PI):0,side=beat&&beat.index%2===0?1:-1;
  setBoss4Bone('hips',0,side*.14*cut,0,18,dt);setBoss4Bone('spine',-.08,side*.34*cut,-side*.1*cut,21,dt);
  setBoss4Bone('chest',-.04,side*.16*cut,-side*.05*cut,20,dt);setBoss4Bone('rightLowerArm',-.7+.32*cut,0,-side*.2*cut,22,dt);
 }else if(st==='b4_dragon'){
  setBoss4Bone('hips',-.08,0,0,22,dt);setBoss4Bone('spine',-.32,0,0,24,dt);
  setBoss4Bone('rightUpperArm',-.78,.02,-.08,25,dt);setBoss4Bone('rightLowerArm',-.24,0,0,25,dt);
  setBoss4Bone('leftUpperArm',-.45,-.08,.25,20,dt);setBoss4Bone('leftUpperLeg',-.42,0,.04,22,dt);setBoss4Bone('rightUpperLeg',.48,0,-.04,22,dt);
 }
 {
  const marks=st==='b4_combo'?BOSS4_COMBO_MARKS:st==='b4_illusion'?BOSS4_ILLUSION_MARKS:null;
  const beat=marks?bossKeyedSlash(t,marks,{wind:.2,cut:.1,recover:.18}):null,edge=beat?.impact||0,side=beat?.side||1;
  setBoss4Bone('rightHand',-.06,-.04-side*.16*edge,-.1-side*.26*edge,30,dt);
 }
}
function boss4Strike(tag,dmg,posture,ttl=.26,unblockable=false){
 if(boss4Fired.has(tag)||boss4MeleeRequests.some(r=>r.tag===tag))return;
 boss4MeleeRequests.push({tag,dmg,posture,ttl,unblockable});
}
function resetBoss4PhysicalTrace(){boss4WeaponTrace.valid=false}
function processBoss4PhysicalHits(){
 if(!boss4WeaponRoot.visible){boss4WeaponTrace.valid=false;boss4MeleeRequests.length=0;return}
 const seg=combatWorldSegment(boss4WeaponRoot,new THREE.Vector3(0,.16,0),new THREE.Vector3(0,2.38,0));
 const caps=combatHumanoidCapsules(playerVrmBones,player,2.0);let hit=null;
 if(boss4WeaponTrace.valid)hit=combatSweptBladeContact(boss4WeaponTrace.base,boss4WeaponTrace.tip,seg.base,seg.tip,caps,.12);
 boss4WeaponTrace.base.copy(seg.base);boss4WeaponTrace.tip.copy(seg.tip);boss4WeaponTrace.valid=true;
 if(hit){
  for(const req of boss4MeleeRequests){
   if(boss4Fired.has(req.tag))continue;boss4Fired.add(req.tag);spawnSparks(hit.point,11,5);state.shake=Math.max(state.shake,.09);
   if(state.invuln>0){flash('회피',.12);break}
   hurtPlayer(req.dmg,req.posture,!!req.unblockable);break;
  }
 }
 for(let i=boss4MeleeRequests.length-1;i>=0;i--)if(boss4Fired.has(boss4MeleeRequests[i].tag)||boss4MeleeRequests[i].ttl<=0)boss4MeleeRequests.splice(i,1);
}
function chooseBoss4Attack(){
 if(state.bossHp<=0)return;state.bossPunish=0;boss4Fired.clear();boss4MeleeRequests.length=0;state.boss4AttackCount++;
 let pool=state.bossHp<state.bossMaxHp*.5?['b4_batto','b4_illusion','b4_dragon','b4_combo']:['b4_batto','b4_combo','b4_dragon','b4_illusion'];
 if(state.potionPunishQueued){state.potionPunishQueued=false;state.bossState='b4_dragon'}else state.bossState=pool[Math.floor(Math.random()*pool.length)];
 state.bossTimer=BOSS4_DUR[state.bossState];state.boss4DashStep=-1;resetBoss4PhysicalTrace();
 if(state.bossState==='b4_batto')setDanger(true);
}
function finishBoss4Attack(recovery=.78){setDanger(false);state.bossState='idle';beginBossPunish(recovery);boss4Fired.clear();boss4MeleeRequests.length=0;state.boss4DashStep=-1;resetBoss4PhysicalTrace()}
function hitBoss4(base,posture=12,contact=null){
 if(state.bossHp<=0)return;let dmg=base,pd=posture;[dmg,pd]=bossPunishDamage(dmg,pd);if(state.bossStagger>0){dmg*=1.6;pd*=.22}
 state.bossHp=Math.max(0,state.bossHp-dmg);addBossPosture(pd);state.boss4HitReact=.14;triggerPlayerHitImpact(contact||player.position.clone().lerp(boss.position,.6).add(new THREE.Vector3(0,1.2,0)));
 if(state.bossHp<=0){state.bossState='dead';setDanger(false);flash('백야의 검성이 쓰러졌다 · 토벌 완료',1.2)}
 else if(state.bossPosture>=BOSS_POSTURE_MAX[4]){resetBossPostureAfterBreak(.32);state.bossStagger=1.22;state.bossState='stagger';state.bossTimer=1.22;flash('자세 붕괴',.45)}
}
function updateBoss4(dt){
 for(let i=boss4MeleeRequests.length-1;i>=0;i--){boss4MeleeRequests[i].ttl-=dt;if(boss4MeleeRequests[i].ttl<=0)boss4MeleeRequests.splice(i,1)}
 enforceBoss4Visibility();state.boss4HitReact=Math.max(0,state.boss4HitReact-dt);boss4Halo.rotation.z+=dt*.8;boss4Aura.intensity=8.5+Math.sin(state.time*5.5)*.7;
 if(boss4Visual)boss4Visual.position.y=THREE.MathUtils.lerp(boss4Visual.position.y,boss4VisualBaseY,1-Math.exp(-dt*10));
 if(state.bossHp<=0){boss4WeaponRoot.visible=false;poseBoss4(dt);syncBoss4Rig(dt);return}
 if(state.bossStagger>0){setDanger(false);state.bossStagger=Math.max(0,state.bossStagger-dt);poseBoss4(dt);applyBoss4PrimaryArmIK(dt);syncBoss4Rig(dt);updateBoss4Weapon();if(state.bossStagger<=0){state.bossState='idle';state.bossTimer=.8}return}
 state.bossTimer-=dt;updateBossPunish(dt);const d=dist(),liveDir=flatDir(boss.position,player.position),dur=BOSS4_DUR[state.bossState]||1,dir=state.bossState==='idle'?liveDir:bossCommittedDir(dur,state.bossTimer,.54),face=Math.atan2(dir.x,dir.z);
 if(state.bossState!=='idle')boss.rotation.y=lerpAngle(boss.rotation.y,face,1-Math.exp(-dt*(state.bossState==='b4_dragon'?12:8.5)));
 if(state.bossState==='idle'){
  if(state.bossPunish<=0){boss.rotation.y=lerpAngle(boss.rotation.y,Math.atan2(liveDir.x,liveDir.z),1-Math.exp(-dt*5.5));if(d>3.5)boss.position.addScaledVector(liveDir,dt*3.25);else if(d<2.15)boss.position.addScaledVector(liveDir,-dt*.85)}
  if(state.bossTimer<=0&&state.bossPunish<=0)chooseBoss4Attack();
 }else if(state.bossState==='b4_combo'){
  const dmgs=[18,22,30];BOSS4_COMBO_MARKS.forEach((m,i)=>{if(state.bossTimer<=m+.1&&state.bossTimer>m-.1)boss4Strike('c'+i,dmgs[i],17+i*4);if(state.bossTimer<=m+.22&&state.bossTimer>m+.05&&d>2.4)boss.position.addScaledVector(dir,dt*3.2)});
  if(state.bossTimer<=0)finishBoss4Attack(.76);
 }else if(state.bossState==='b4_batto'){
  const p=clamp(1-state.bossTimer/BOSS4_DUR.b4_batto,0,1);
  if(p>.42&&p<.58&&d>2.2)boss.position.addScaledVector(dir,dt*4.8);
  if(p>=.52&&p<=.7){boss4Once('batto-vfx',()=>spawnBoss2Slash(2.35,0x9dd8ff));boss4Strike('batto-hit',34,34,.3,true)}
  if(state.bossTimer<=0)finishBoss4Attack(1.0);
 }else if(state.bossState==='b4_illusion'){
  BOSS4_ILLUSION_MARKS.forEach((m,i)=>{if(state.bossTimer<=m+.085&&state.bossTimer>m-.085){boss4Once('iv'+i,()=>spawnBoss2Slash(1.7+(i%3)*.1,0xa5d8ff));boss4Strike('ih'+i,14+(i%3)*2,12+(i%4)*2,.22)}if(state.bossTimer<=m+.18&&state.bossTimer>m+.03&&d>2.2)boss.position.addScaledVector(dir,dt*3.4)});
  if(state.bossTimer<=0)finishBoss4Attack(1.18);
 }else if(state.bossState==='b4_dragon'){
  BOSS4_DRAGON_MARKS.forEach((m,i)=>{
   if(state.boss4DashStep<i&&state.bossTimer<=m+.25){state.boss4DashStep=i;state.boss4DashDir.copy(flatDir(boss.position,player.position));boss4Once('dragon-flash'+i,()=>spawnBoss3Petals(5,2.1))}
   if(state.boss4DashStep===i&&state.bossTimer<=m+.16&&state.bossTimer>m-.1){boss.position.addScaledVector(state.boss4DashDir,dt*13.5);boss4Strike('dragon-hit'+i,i===3?32:19,18+i*4,.28)}
  });
  if(state.bossTimer<=0)finishBoss4Attack(1.02);
 }
 poseBoss4(dt);applyBossHumanoidLocomotion(setBoss4Bone,boss4Visual,boss4VisualBaseY,dt,{stride:.98,bob:.026,twist:.07});applyBoss4PrimaryArmIK(dt);syncBoss4Rig(dt);updateBoss4Weapon();processBoss4PhysicalHits();
}
function boss4Once(tag,fn){if(boss4Fired.has(tag))return false;boss4Fired.add(tag);fn?.();return true}


/* -------------------------------------------------------------------------- */
/* Boss 05: Black-Iron Champion Shino                                         */
/* Original champion-style axe fighter: poleaxe pressure + physical brawling  */
/* -------------------------------------------------------------------------- */
const boss5Root=new THREE.Group();boss5Root.name='ShinoChampionRoot';boss5Root.visible=BOSS_VARIANT===5;boss.add(boss5Root);
let boss5Visual=null,boss5VRM=null,boss5Ready=false,boss5VisualBaseY=0;
const boss5Bones={},boss5Rest={},boss5RenderBones={},boss5Fired=new Set(),boss5MeleeRequests=[],boss5BodyRequests=[];
const boss5WeaponTrace={valid:false,base:new THREE.Vector3(),tip:new THREE.Vector3()};
const boss5BodyTrace={kick:new THREE.Vector3(),shoulder:new THREE.Vector3(),elbow:new THREE.Vector3(),validKick:false,validShoulder:false,validElbow:false};
const boss5Aura=new THREE.PointLight(0xe4703b,7.8,12.5,2);boss5Aura.position.set(0,1.25,.1);boss5Root.add(boss5Aura);
const boss5HaloMat=new THREE.MeshBasicMaterial({color:0x9e3f24,transparent:true,opacity:.08,depthWrite:false});
const boss5Halo=new THREE.Mesh(new THREE.TorusGeometry(.95,.022,6,40),boss5HaloMat);boss5Halo.rotation.x=Math.PI/2;boss5Halo.position.y=.03;boss5Root.add(boss5Halo);

const boss5Fallback=new THREE.Group();boss5Root.add(boss5Fallback);
const b5Skin=new THREE.MeshStandardMaterial({color:0xe0b09e,roughness:.5});
const b5Armor=new THREE.MeshStandardMaterial({color:0x262a30,metalness:.55,roughness:.48,emissive:0x120906,emissiveIntensity:.18});
part(boss5Fallback,new THREE.CapsuleGeometry(.31,.82,5,8),b5Skin,[0,1.18,0]);
part(boss5Fallback,new THREE.BoxGeometry(.68,.72,.34),b5Armor,[0,1.4,0]);
part(boss5Fallback,new THREE.SphereGeometry(.29,14,10),b5Skin,[0,2.04,.02]);

const boss5WeaponRoot=new THREE.Group();boss5WeaponRoot.visible=false;scene.add(boss5WeaponRoot);
const boss5Steel=new THREE.MeshStandardMaterial({color:0xb9bec4,metalness:.93,roughness:.24,emissive:0x2a170f,emissiveIntensity:.22});
const boss5ShaftMat=new THREE.MeshStandardMaterial({color:0x32251d,roughness:.72,metalness:.08});
const boss5Axe=new THREE.Group();
const boss5Shaft=new THREE.Mesh(new THREE.CylinderGeometry(.052,.058,3.35,9),boss5ShaftMat);boss5Shaft.position.y=1.3;boss5Axe.add(boss5Shaft);
part(boss5Axe,new THREE.BoxGeometry(.78,.72,.09),boss5Steel,[.28,2.88,0],[0,0,-.22]);
part(boss5Axe,new THREE.ConeGeometry(.16,.6,7),boss5Steel,[-.08,3.0,0],[0,0,Math.PI]);
part(boss5Axe,new THREE.BoxGeometry(.36,.16,.1),boss5Steel,[-.24,2.76,0],[0,0,.22]);
boss5WeaponRoot.add(boss5Axe);

state.boss5Phase=1;state.boss5AttackCount=0;state.boss5HitReact=0;state.boss5ChargeDir=new THREE.Vector3();state.boss5RushStep=-1;

function cacheBoss5Bone(name,node){if(!node)return;boss5Bones[name]=node;boss5Rest[name]={rotation:node.rotation.clone(),position:node.position.clone(),scale:node.scale.clone()}}
function setBoss5Bone(name,rx=0,ry=0,rz=0,speed=12,dt=.016){
 const b=boss5Bones[name],r=boss5Rest[name];if(!b||!r)return;const a=1-Math.exp(-dt*speed);
 b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,r.rotation.x+rx,a);b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,r.rotation.y+ry,a);b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,r.rotation.z+rz,a);
}
function resetBoss5Pose(dt){
 for(const [name,b] of Object.entries(boss5Bones)){const r=boss5Rest[name];if(!r)continue;const a=1-Math.exp(-dt*13);
  b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,r.rotation.x,a);b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,r.rotation.y,a);b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,r.rotation.z,a)}
}
function syncBoss5Rig(dt=0){if(!boss5VRM)return;boss5VRM.update?.(Math.max(0,dt));boss5Visual?.updateMatrixWorld?.(true)}
async function loadBoss5Avatar(){
 if(BOSS_VARIANT!==5)return;
 try{
  const {VRMLoaderPlugin,VRMUtils}=await import('@pixiv/three-vrm');
  const loader=new GLTFLoader();loader.setCrossOrigin('anonymous');loader.register(parser=>new VRMLoaderPlugin(parser));
  loader.load(BOSS5_MODEL_URL,gltf=>{
   const vrm=gltf.userData?.vrm||null;if(vrm)VRMUtils.rotateVRM0(vrm);
   const root=vrm?.scene||gltf.scene;
   root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(Array.isArray(o.material))o.material=o.material.map(m=>m.clone());else if(o.material)o.material=o.material.clone()}});
   root.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(root,true),size=new THREE.Vector3();box.getSize(size);
   root.scale.multiplyScalar(3.12/Math.max(size.y,.001));root.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(root,true);
   root.position.y-=box.min.y;root.position.z=.04;boss5VisualBaseY=root.position.y;
   boss5Root.add(root);boss5Visual=root;boss5VRM=vrm;boss5Ready=true;boss5Fallback.visible=false;
   const h=vrm?.humanoid;
   for(const n of ['hips','spine','chest','upperChest','neck','head','leftShoulder','rightShoulder','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot']){
    const normalized=h?.getNormalizedBoneNode?.(n)||null;
    const raw=h?.getRawBoneNode?.(n)||null;
    const control=normalized||raw;
    if(control)cacheBoss5Bone(n,control);
    boss5RenderBones[n]=raw||normalized||null;
   }
   poseBoss5(.12);applyBoss5PrimaryArmIK(.12);syncBoss5Rig(0);updateBoss5Weapon();flash(BOSS5_NAME,.9);
   console.info('Shino champion VRM rig',{hand:!!boss5RenderBones.rightHand,foot:!!boss5RenderBones.rightFoot});
  },undefined,err=>console.warn('Shino VRM unavailable.',err));
 }catch(err){console.warn('three-vrm unavailable for Shino.',err)}
}
function enforceBoss5Visibility(){
 if(BOSS_VARIANT!==5)return;for(const child of boss.children)child.visible=(child===boss5Root);boss5Root.visible=true;if(!boss5Ready)boss5Fallback.visible=true;
}
function updateBoss5Weapon(){
 if(!boss5Ready||state.bossHp<=0){boss5WeaponRoot.visible=false;return}
 const hand=boss5RenderBones.rightHand||boss5Bones.rightHand;
 const lower=boss5RenderBones.rightLowerArm||boss5Bones.rightLowerArm||boss5RenderBones.rightUpperArm||boss5Bones.rightUpperArm;
 if(!hand||!lower){boss5WeaponRoot.visible=false;return}
 boss5WeaponRoot.visible=true;
 let axis=weaponArmAxis(lower,hand,bossCombatOffset(0,.12,1));
 // During the shoulder charge the axe is intentionally held rearward, but the head still stays on +Y.
 if(state.bossState==='b5_charge'){
  axis=bossCombatOffset(.12,.2,.96).normalize();
 }
 const marks=state.bossState==='b5_chain'?BOSS5_CHAIN_MARKS:state.bossState==='b5_rush'?BOSS5_RUSH_AXE_MARKS:null;
 const edge=marks?bossKeyedSlash(state.bossTimer,marks,{wind:state.bossState==='b5_chain'?.38:.24,cut:state.bossState==='b5_chain'?.18:.13,recover:state.bossState==='b5_chain'?.3:.22}):null;
 const roll=edge?edge.side*edge.impact*.34:0;
 placeWeaponAtPrimaryGrip(boss5WeaponRoot,hand,.06,axis,roll);
}
function applyBoss5GripIK(dt){
 if(!boss5Ready||!boss5WeaponRoot.visible||!boss5Bones.leftUpperArm||!boss5Bones.leftHand)return;
 const shoulder=new THREE.Vector3();boss5Bones.leftUpperArm.getWorldPosition(shoulder);const reach=getArmReach(boss5Bones,'left');
 boss5WeaponRoot.updateWorldMatrix(true,true);
 const target=boss5WeaponRoot.localToWorld(new THREE.Vector3(0,.78,0));
 const elbow=shoulder.clone().add(bossCombatOffset(-.4*reach,-.3*reach,.18*reach));
 solveArmCCD(boss5Bones,'left',target,elbow,1-Math.exp(-dt*44));
}
const BOSS5_DUR={b5_chain:2.92,b5_charge:1.68,b5_kick:1.58,b5_upper:1.9,b5_leap:2.18,b5_rush:3.95,b5_roar:2.0};
const BOSS5_CHAIN_MARKS=[2.24,1.43,.54];
const BOSS5_RUSH_AXE_MARKS=[2.42,.52];
function applyBoss5PrimaryArmIK(dt){
 if(!boss5Ready||!boss5Bones.rightUpperArm||!boss5Bones.rightHand)return;
 const shoulder=new THREE.Vector3();boss5Bones.rightUpperArm.getWorldPosition(shoulder);const reach=getArmReach(boss5Bones,'right'),st=state.bossState,t=state.bossTimer;
 let local=bossWalkingHand(new THREE.Vector3(.34,-.42,.22),.02,.042,.012);
 if(st==='b5_chain'){
  const beat=bossKeyedSlash(t,BOSS5_CHAIN_MARKS,{wind:.38,cut:.18,recover:.3});
  local.copy(bossSwordHandArc(beat,reach,{windX:.86,cutX:.92,baseY:-.3,liftY:.32,dropY:.24,baseZ:.02,windBack:-.42,forward:1.08,pullback:.5}).multiplyScalar(1/reach));
 }else if(st==='b5_upper'){
  const p=clamp(1-t/BOSS5_DUR.b5_upper,0,1),wind=motionSmooth(0,.4,p),rise=motionSmooth(.42,.66,p),recover=motionSmooth(.72,1,p);
  local.set(.28-.14*rise,-.62+.96*rise-.3*recover,-.18-.28*wind+1.26*rise-.62*recover);
 }else if(st==='b5_leap'){
  const p=clamp(1-t/BOSS5_DUR.b5_leap,0,1),slam=motionSmooth(.52,.78,p),recover=motionSmooth(.82,1,p);
  local.set(.1,.24-.9*slam+.28*recover,.34+1.04*slam-.42*recover);
 }else if(st==='b5_rush'){
  const beat=bossKeyedSlash(t,BOSS5_RUSH_AXE_MARKS,{wind:.24,cut:.13,recover:.22});
  if(beat)local.copy(bossSwordHandArc(beat,reach,{windX:.78,cutX:.9,baseY:-.3,liftY:.2,dropY:.18,baseZ:.05,windBack:-.3,forward:1.12,pullback:.44}).multiplyScalar(1/reach));
  else local.set(.36,-.5,-.02);
 }else if(st==='b5_charge'){
  const p=clamp(1-t/BOSS5_DUR.b5_charge,0,1),drive=motionSmooth(.28,.68,p)*(1-motionSmooth(.78,1,p));
  local.set(.46,-.46,-.18-.2*drive);
 }else if(st==='b5_kick'){
  const p=clamp(1-t/BOSS5_DUR.b5_kick,0,1),follow=motionSmooth(.58,.78,p);
  local.set(.46-.72*follow,-.48-.08*follow,-.08+1.0*follow);
 }
 const target=shoulder.clone().add(bossCombatOffset(local.x*reach,local.y*reach,local.z*reach));
 const elbow=shoulder.clone().add(bossCombatOffset(.3*reach,-.32*reach,.18*reach));
 solveArmCCD(boss5Bones,'right',target,elbow,1-Math.exp(-dt*45));
}
function poseBoss5(dt){
 if(!boss5Ready)return;resetBoss5Pose(dt);
 const st=state.bossState,t=state.bossTimer,phase=state.boss5Phase,hit=state.boss5HitReact>0?Math.sin((state.boss5HitReact/.14)*Math.PI):0;
 setBoss5Bone('spine',-.04-hit*.12,0,hit*.08,12,dt);setBoss5Bone('head',.02-hit*.05,0,-hit*.05,11,dt);
 if(st==='idle'&&state.bossPunish>0){
  const r=clamp(state.bossPunish/1.9,0,1);
  setBoss5Bone('hips',.12*r,-.06*r,0,18,dt);setBoss5Bone('spine',-.34*r,.08*r,.02*r,21,dt);setBoss5Bone('chest',-.14*r,.04*r,0,19,dt);
  setBoss5Bone('rightUpperArm',-.44,-.04,-.28,18,dt);setBoss5Bone('rightLowerArm',-.84,0,-.12,20,dt);
  setBoss5Bone('leftUpperArm',-.36,.02,.22,18,dt);setBoss5Bone('leftLowerArm',-.7,0,.08,18,dt);setBoss5Bone('head',.1*r,-.03*r,0,16,dt);
 }else if(st==='idle'){
  const sway=Math.sin(state.time*1.5);setBoss5Bone('hips',0,.025*sway,.045*sway,8,dt);setBoss5Bone('spine',-.055,.015*sway,-.03*sway,8,dt);
  setBoss5Bone('rightUpperArm',-.58,.06,-.3,10,dt);setBoss5Bone('rightLowerArm',-.56,0,-.16,10,dt);setBoss5Bone('leftUpperArm',-.44,-.04,.28,10,dt);
 }else if(st==='b5_chain'){
  const beat=bossKeyedSlash(t,BOSS5_CHAIN_MARKS,{wind:.38,cut:.18,recover:.3}),cut=beat?.impact||0,side=beat?.side||1,wind=beat?.wind||0;
  setBoss5Bone('hips',-.05*wind,side*.28*cut,0,24,dt);setBoss5Bone('spine',-.14,side*.52*cut,-side*.15*cut,26,dt);setBoss5Bone('chest',-.04,side*.22*cut,-side*.06*cut,24,dt);
  setBoss5Bone('rightUpperArm',-.62+.12*wind,.08,side*.38*cut,26,dt);setBoss5Bone('rightLowerArm',-.72+.34*cut,0,-side*.18*cut,27,dt);
  setBoss5Bone('leftUpperArm',-.54,-.04,-side*.24*cut,24,dt);setBoss5Bone('leftUpperLeg',-.28*wind,0,.04,21,dt);setBoss5Bone('rightUpperLeg',.28*cut,0,-.04,21,dt);
 }else if(st==='b5_charge'){
  const p=clamp(1-t/BOSS5_DUR.b5_charge,0,1),drive=motionSmooth(.28,.72,p)*(1-motionSmooth(.78,1,p));
  setBoss5Bone('spine',-.48*drive,0,0,24,dt);setBoss5Bone('hips',-.12*drive,0,0,22,dt);setBoss5Bone('head',.16*drive,0,0,20,dt);
  setBoss5Bone('leftUpperArm',-.78*drive,-.12,.22,22,dt);setBoss5Bone('rightUpperArm',-.72*drive,.08,-.2,22,dt);
  setBoss5Bone('leftUpperLeg',-.5*drive,0,.03,22,dt);setBoss5Bone('rightUpperLeg',.52*drive,0,-.03,22,dt);
 }else if(st==='b5_kick'){
  const p=clamp(1-t/BOSS5_DUR.b5_kick,0,1),kick=Math.sin(clamp((p-.28)/.5,0,1)*Math.PI);
  setBoss5Bone('spine',-.12,-.18*kick,.1*kick,22,dt);setBoss5Bone('hips',.08,-.2*kick,0,22,dt);
  setBoss5Bone('rightUpperLeg',-1.15*kick,0,-.12,28,dt);setBoss5Bone('rightLowerLeg',.32+.52*(1-kick),0,0,28,dt);setBoss5Bone('rightFoot',-.28*kick,0,0,26,dt);
 }else if(st==='b5_upper'){
  const p=clamp(1-t/BOSS5_DUR.b5_upper,0,1),wind=motionSmooth(0,.4,p),rise=motionSmooth(.42,.66,p),recover=motionSmooth(.72,1,p),power=rise*(1-recover);
  setBoss5Bone('hips',.18*wind,-.28*power,0,25,dt);setBoss5Bone('spine',.2*wind-.58*power,-.34*power,0,27,dt);setBoss5Bone('chest',.08*wind-.18*power,-.12*power,0,24,dt);
  setBoss5Bone('rightUpperArm',-.94+.56*power,.04,-.48*power,27,dt);setBoss5Bone('rightLowerArm',-.7+.42*power,0,.1*power,27,dt);
  setBoss5Bone('leftUpperLeg',.22*wind,0,.04,22,dt);setBoss5Bone('rightUpperLeg',-.34*wind+.2*power,0,-.04,22,dt);
 }else if(st==='b5_leap'){
  const p=clamp(1-t/BOSS5_DUR.b5_leap,0,1),air=Math.sin(clamp(p/.82,0,1)*Math.PI);
  setBoss5Bone('hips',-.22*air,0,0,22,dt);setBoss5Bone('spine',-.3*air,0,0,22,dt);setBoss5Bone('leftUpperLeg',-.82*air,0,.12,24,dt);setBoss5Bone('rightUpperLeg',-.68*air,0,-.12,24,dt);
  setBoss5Bone('leftLowerLeg',1.08*air,0,0,24,dt);setBoss5Bone('rightLowerLeg',.96*air,0,0,24,dt);
 }else if(st==='b5_rush'){
  const beat=bossKeyedSlash(t,BOSS5_RUSH_AXE_MARKS,{wind:.24,cut:.13,recover:.22}),cut=beat?.impact||0,side=beat?.side||1;
  const shoulder=t>2.72&&t<3.38?1:0,kick=t>1.48&&t<1.92?Math.sin(clamp((1.92-t)/.44,0,1)*Math.PI):0,elbow=t>.88&&t<1.28?Math.sin(clamp((1.28-t)/.4,0,1)*Math.PI):0;
  setBoss5Bone('hips',-.1*shoulder,side*.2*cut-.14*kick,0,26,dt);setBoss5Bone('spine',-.38*shoulder-.12*cut,side*.38*cut-.18*elbow,.08*kick,28,dt);
  setBoss5Bone('rightUpperLeg',-1.12*kick,0,-.12*kick,30,dt);setBoss5Bone('rightLowerLeg',.26+.3*(1-kick),0,0,28,dt);
  setBoss5Bone('rightUpperArm',-.72-.22*shoulder+.18*elbow,.06,side*.34*cut-.46*elbow,28,dt);setBoss5Bone('rightLowerArm',-.6+.32*cut-.34*elbow,0,-side*.16*cut,28,dt);
  setBoss5Bone('leftUpperArm',-.5,-.08,-side*.18*cut,24,dt);
 }else if(st==='b5_roar'){
  setBoss5Bone('spine',.16,0,0,16,dt);setBoss5Bone('chest',.22,0,0,16,dt);setBoss5Bone('leftUpperArm',-.34,-.52,.88,16,dt);setBoss5Bone('rightUpperArm',-.34,.52,-.88,16,dt);
 }
 {
  const marks=st==='b5_chain'?BOSS5_CHAIN_MARKS:st==='b5_rush'?BOSS5_RUSH_AXE_MARKS:null;
  const beat=marks?bossKeyedSlash(t,marks,{wind:st==='b5_chain'?.38:.24,cut:st==='b5_chain'?.18:.13,recover:st==='b5_chain'?.3:.22}):null,side=beat?.side||1,edge=beat?.impact||0;
  setBoss5Bone('rightHand',-.05,-.03-side*.08*edge,-.08-side*.14*edge,28,dt);setBoss5Bone('leftHand',-.04,.03+side*.03*edge,.06,24,dt);
 }
}
function boss5Strike(tag,dmg,posture,ttl=.3,unblockable=false){
 if(boss5Fired.has(tag)||boss5MeleeRequests.some(r=>r.tag===tag))return;boss5MeleeRequests.push({tag,dmg,posture,ttl,unblockable});
}
function boss5BodyStrike(tag,kind,dmg,posture,ttl=.28,unblockable=false){
 if(boss5Fired.has(tag)||boss5BodyRequests.some(r=>r.tag===tag))return;boss5BodyRequests.push({tag,kind,dmg,posture,ttl,unblockable});
}
function boss5BodyPoint(kind){
 const map=kind==='kick'?['rightFoot','rightLowerLeg']:kind==='elbow'?['rightLowerArm','rightUpperArm']:['chest','hips'];
 const a=boss5RenderBones[map[0]]||boss5Bones[map[0]],b=boss5RenderBones[map[1]]||boss5Bones[map[1]];
 const p=new THREE.Vector3();
 if(a)a.getWorldPosition(p);else p.copy(boss.position).add(new THREE.Vector3(0,kind==='shoulder'?1.35:.8,0));
 if(b){const q=new THREE.Vector3();b.getWorldPosition(q);p.lerp(q,kind==='shoulder'?.35:.15)}
 return p;
}
function resetBoss5PhysicalTrace(){
 boss5WeaponTrace.valid=false;boss5BodyTrace.validKick=boss5BodyTrace.validShoulder=boss5BodyTrace.validElbow=false;
}
function processBoss5PhysicalHits(){
 const caps=combatHumanoidCapsules(playerVrmBones,player,2.0);
 if(boss5WeaponRoot.visible){
  const seg=combatWorldSegment(boss5WeaponRoot,new THREE.Vector3(-.1,2.72,0),new THREE.Vector3(.66,3.02,0));let hit=null;
  if(boss5WeaponTrace.valid)hit=combatSweptBladeContact(boss5WeaponTrace.base,boss5WeaponTrace.tip,seg.base,seg.tip,caps,.24);
  boss5WeaponTrace.base.copy(seg.base);boss5WeaponTrace.tip.copy(seg.tip);boss5WeaponTrace.valid=true;
  if(hit)for(const req of boss5MeleeRequests){if(boss5Fired.has(req.tag))continue;boss5Fired.add(req.tag);spawnSparks(hit.point,13,5.4);if(state.invuln>0){flash('회피',.12);break}hurtPlayer(req.dmg,req.posture,!!req.unblockable);break}
 }
 for(const kind of ['kick','shoulder','elbow']){
  const cur=boss5BodyPoint(kind),key='valid'+kind[0].toUpperCase()+kind.slice(1),prev=boss5BodyTrace[kind];let bodyHit=null;
  if(boss5BodyTrace[key]){
   for(const c of caps){const d=combatSegmentSegmentDistance(prev,cur,c.a,c.b);if(d<=c.r+(kind==='shoulder'?.42:.25)){bodyHit={point:cur.clone(),distance:d};break}}
  }
  prev.copy(cur);boss5BodyTrace[key]=true;
  if(bodyHit)for(const req of boss5BodyRequests){if(req.kind!==kind||boss5Fired.has(req.tag))continue;boss5Fired.add(req.tag);spawnDustBurst(bodyHit.point,.18);if(state.invuln>0){flash('회피',.12);break}hurtPlayer(req.dmg,req.posture,!!req.unblockable);break}
 }
 for(let i=boss5MeleeRequests.length-1;i>=0;i--)if(boss5Fired.has(boss5MeleeRequests[i].tag)||boss5MeleeRequests[i].ttl<=0)boss5MeleeRequests.splice(i,1);
 for(let i=boss5BodyRequests.length-1;i>=0;i--)if(boss5Fired.has(boss5BodyRequests[i].tag)||boss5BodyRequests[i].ttl<=0)boss5BodyRequests.splice(i,1);
}
function chooseBoss5Attack(){
 if(state.bossHp<=0)return;state.bossPunish=0;boss5Fired.clear();boss5MeleeRequests.length=0;boss5BodyRequests.length=0;state.boss5AttackCount++;
 const phase2=state.boss5Phase===2,d=dist();
 let pool;
 if(d<2.25)pool=phase2?['b5_kick','b5_charge','b5_chain','b5_upper','b5_rush']:['b5_kick','b5_charge','b5_chain','b5_upper'];
 else if(d>5.2)pool=phase2?['b5_charge','b5_leap','b5_rush','b5_upper']:['b5_charge','b5_leap','b5_upper'];
 else pool=phase2?['b5_chain','b5_charge','b5_kick','b5_upper','b5_leap','b5_rush']:['b5_chain','b5_charge','b5_kick','b5_upper','b5_leap'];
 if(state.potionPunishQueued){state.potionPunishQueued=false;state.bossState=phase2?'b5_rush':'b5_charge'}else state.bossState=pool[Math.floor(Math.random()*pool.length)];
 state.bossTimer=BOSS5_DUR[state.bossState];state.boss5RushStep=-1;resetBoss5PhysicalTrace();
 if(state.bossState==='b5_charge')setDanger(true);
}
function finishBoss5Attack(recovery=.76){setDanger(false);state.bossState='idle';beginBossPunish(recovery);boss5Fired.clear();boss5MeleeRequests.length=0;boss5BodyRequests.length=0;state.boss5RushStep=-1;resetBoss5PhysicalTrace();boss.position.y=0}
function hitBoss5(base,posture=12,contact=null){
 if(state.bossHp<=0)return;let dmg=base,pd=posture;[dmg,pd]=bossPunishDamage(dmg,pd);if(state.bossStagger>0){dmg*=1.58;pd*=.2}
 state.bossHp=Math.max(0,state.bossHp-dmg);addBossPosture(pd);state.boss5HitReact=.14;triggerPlayerHitImpact(contact||player.position.clone().lerp(boss.position,.6).add(new THREE.Vector3(0,1.2,0)));
 if(state.bossHp<=0){state.bossState='dead';setDanger(false);flash('흑철의 투희가 무너졌다 · 토벌 완료',1.25)}
 else if(state.bossPosture>=BOSS_POSTURE_MAX[5]){resetBossPostureAfterBreak(.32);state.bossStagger=1.18;state.bossState='stagger';state.bossTimer=1.18;flash('자세 붕괴',.45)}
}
function updateBoss5(dt){
 for(const r of boss5MeleeRequests)r.ttl-=dt;for(const r of boss5BodyRequests)r.ttl-=dt;
 enforceBoss5Visibility();state.boss5HitReact=Math.max(0,state.boss5HitReact-dt);boss5Halo.rotation.z+=dt*(state.boss5Phase===2?1.6:.72);boss5Aura.intensity=(state.boss5Phase===2?12:7.8)+Math.sin(state.time*6)*.6;
 if(boss5Visual)boss5Visual.position.y=THREE.MathUtils.lerp(boss5Visual.position.y,boss5VisualBaseY,1-Math.exp(-dt*11));
 if(state.bossHp<=0){boss5WeaponRoot.visible=false;poseBoss5(dt);syncBoss5Rig(dt);return}
 if(state.boss5Phase===1&&state.bossHp<=state.bossMaxHp*.5){
  state.boss5Phase=2;state.bossState='b5_roar';state.bossTimer=BOSS5_DUR.b5_roar;boss5Fired.clear();boss5Aura.color.setHex(0xff6b35);boss5HaloMat.opacity=.16;
  spawnBoss2Pulse(boss.position.clone().add(new THREE.Vector3(0,1,0)),4.2,0xff6832,.55);flash('투신 각성 · 흑철의 폭주',.9);
 }
 if(state.bossStagger>0){setDanger(false);state.bossStagger=Math.max(0,state.bossStagger-dt);poseBoss5(dt);applyBoss5PrimaryArmIK(dt);applyBoss5GripIK(dt);syncBoss5Rig(dt);updateBoss5Weapon();if(state.bossStagger<=0){state.bossState='idle';state.bossTimer=.72}return}
 state.bossTimer-=dt;updateBossPunish(dt);const d=dist(),liveDir=flatDir(boss.position,player.position),dur=BOSS5_DUR[state.bossState]||1,dir=state.bossState==='idle'?liveDir:bossCommittedDir(dur,state.bossTimer,.55),face=Math.atan2(dir.x,dir.z),p2=state.boss5Phase===2;
 if(state.bossState!=='idle'&&(!['b5_charge','b5_rush','b5_leap'].includes(state.bossState)||state.bossTimer>.55))boss.rotation.y=lerpAngle(boss.rotation.y,face,1-Math.exp(-dt*(p2?11:8.5)));
 if(state.bossState==='idle'){
  if(state.bossPunish<=0){boss.rotation.y=lerpAngle(boss.rotation.y,Math.atan2(liveDir.x,liveDir.z),1-Math.exp(-dt*5));if(d>3.8)boss.position.addScaledVector(liveDir,dt*(p2?4.25:3.45));else if(d<2.0)boss.position.addScaledVector(liveDir,-dt*.72)}
  if(state.bossTimer<=0&&state.bossPunish<=0)chooseBoss5Attack();
 }else if(state.bossState==='b5_chain'){
  const dmgs=p2?[21,25,36]:[18,23,32];
  BOSS5_CHAIN_MARKS.forEach((m,i)=>{
   if(state.bossTimer<=m+.11&&state.bossTimer>m-.11)boss5Strike('chain'+i,dmgs[i],19+i*5,.34);
   if(state.bossTimer<=m+.32&&state.bossTimer>m+.1&&d>2.45)boss.position.addScaledVector(dir,dt*(p2?3.8:3.1));
  });
  if(state.bossTimer<=0)finishBoss5Attack(p2?.56:.76);
 }else if(state.bossState==='b5_charge'){
  const p=clamp(1-state.bossTimer/BOSS5_DUR.b5_charge,0,1);
  if(p<.16)state.boss5ChargeDir.copy(dir);
  if(p>.28&&p<.67)boss.position.addScaledVector(state.boss5ChargeDir,dt*(p2?13.4:11.4));
  if(p>.34&&p<.67)boss5BodyStrike('shoulder','shoulder',p2?32:28,36,.34,true);
  if(p>.68&&p<.86){boss.rotation.y=lerpAngle(boss.rotation.y,face,1-Math.exp(-dt*18));boss5Strike('charge-axe',p2?35:31,34,.34)}
  if(state.bossTimer<=0)finishBoss5Attack(p2?.55:.72);
 }else if(state.bossState==='b5_kick'){
  const p=clamp(1-state.bossTimer/BOSS5_DUR.b5_kick,0,1);
  if(p>.28&&p<.58){boss.position.addScaledVector(dir,dt*3.15);boss5BodyStrike('kick','kick',p2?29:25,40,.3)}
  if(p>.61&&p<.82){boss.rotation.y=lerpAngle(boss.rotation.y,face,1-Math.exp(-dt*20));boss5Strike('kick-follow',p2?31:27,27,.3)}
  if(state.bossTimer<=0)finishBoss5Attack(p2?.46:.68);
 }else if(state.bossState==='b5_upper'){
  const p=clamp(1-state.bossTimer/BOSS5_DUR.b5_upper,0,1);
  if(p>.38&&p<.67){boss.position.addScaledVector(dir,dt*4.0);boss5Strike('upper',p2?38:34,42,.36)}
  if(p2&&p>.7&&p<.88)boss5BodyStrike('upper-elbow','elbow',24,31,.26);
  if(state.bossTimer<=0)finishBoss5Attack(p2?.58:.82);
 }else if(state.bossState==='b5_leap'){
  const p=clamp(1-state.bossTimer/BOSS5_DUR.b5_leap,0,1);
  if(p<.62){boss.position.y=Math.sin(clamp(p/.62,0,1)*Math.PI)*2.15;if(p<.45)boss.position.addScaledVector(dir,dt*3.2)}
  else boss.position.y=THREE.MathUtils.lerp(boss.position.y,0,1-Math.exp(-dt*24));
  if(p>.58&&p<.82)boss5Strike('leap-axe',p2?40:35,44,.38);
  if(p>.7)boss5Once('leap-dust',()=>spawnDustBurst(boss.position,.7));
  if(state.bossTimer<=0)finishBoss5Attack(.96);
 }else if(state.bossState==='b5_rush'){
  const t=state.bossTimer;
  if(t<=3.38&&t>2.72){
   boss5Once('rush-dir0',()=>state.boss5ChargeDir.copy(flatDir(boss.position,player.position)));
   boss.position.addScaledVector(state.boss5ChargeDir,dt*13.6);boss5BodyStrike('rush-shoulder','shoulder',30,36,.34);
  }
  if(t<=2.55&&t>2.22){
   boss.rotation.y=lerpAngle(boss.rotation.y,face,1-Math.exp(-dt*19));boss.position.addScaledVector(dir,dt*4.2);boss5Strike('rush-axe0',24,25,.34);
  }
  if(t<=1.92&&t>1.48){
   boss.position.addScaledVector(dir,dt*3.4);boss5BodyStrike('rush-kick','kick',27,40,.32);
  }
  if(t<=1.28&&t>.88){
   boss.position.addScaledVector(dir,dt*4.6);boss5BodyStrike('rush-elbow','elbow',26,34,.3);
  }
  if(t<=.68&&t>.3){
   boss.rotation.y=lerpAngle(boss.rotation.y,face,1-Math.exp(-dt*22));boss.position.addScaledVector(dir,dt*5.0);boss5Strike('rush-finisher',39,44,.38);
  }
  if(state.bossTimer<=0)finishBoss5Attack(1.02);
 }else if(state.bossState==='b5_roar'){
  if(state.bossTimer<=.72)boss5Once('roar-wave',()=>{spawnBoss2Pulse(boss.position.clone().add(new THREE.Vector3(0,1.0,0)),4.4,0xff6b35,.62);spawnDustBurst(boss.position,.85)});
  if(state.bossTimer<=0)finishBoss5Attack(.58);
 }
 poseBoss5(dt);applyBossHumanoidLocomotion(setBoss5Bone,boss5Visual,boss5VisualBaseY,dt,{stride:state.boss5Phase===2?1.16:1.05,bob:.035,twist:.065,knee:.72});applyBoss5PrimaryArmIK(dt);updateBoss5Weapon();applyBoss5GripIK(dt);syncBoss5Rig(dt);updateBoss5Weapon();processBoss5PhysicalHits();
}
function boss5Once(tag,fn){if(boss5Fired.has(tag))return false;boss5Fired.add(tag);fn?.();return true}


/* -------------------------------------------------------------------------- */
/* Boss 06: Hwang Geunchul — Marine-literature parody final boss              */
/* Fully procedural 3D male boss: no pretty/female VRM base.                  */
/* -------------------------------------------------------------------------- */
const boss6Root=new THREE.Group();boss6Root.name='HwangGeunchulFinalRoot';boss6Root.visible=BOSS_VARIANT===6;boss.add(boss6Root);
let boss6Visual=null,boss6VRM=null,boss6Ready=false,boss6VisualBaseY=0;
const boss6Bones={},boss6Rest={},boss6RenderBones={},boss6Fired=new Set(),boss6Projectiles=[];
const boss6Aura=new THREE.PointLight(0xff3f2a,11,15,2);boss6Aura.position.set(0,1.7,.1);boss6Root.add(boss6Aura);
const boss6HaloMat=new THREE.MeshBasicMaterial({color:0xff492f,transparent:true,opacity:.12,depthWrite:false});
const boss6Halo=new THREE.Mesh(new THREE.TorusGeometry(1.08,.025,7,44),boss6HaloMat);boss6Halo.rotation.x=Math.PI/2;boss6Halo.position.y=.035;boss6Root.add(boss6Halo);
const boss6Fallback=new THREE.Group();boss6Root.add(boss6Fallback);

const b6Skin=new THREE.MeshStandardMaterial({color:0x9b6a50,roughness:.78,metalness:.02});
const b6SkinDark=new THREE.MeshStandardMaterial({color:0x744936,roughness:.82});
const b6Face=new THREE.MeshStandardMaterial({color:0x070606,roughness:.94,metalness:.01});
const b6FaceDark=new THREE.MeshStandardMaterial({color:0x010101,roughness:.98,metalness:0});
const b6EyeSocket=new THREE.MeshStandardMaterial({color:0x210303,roughness:.74,emissive:0x230000,emissiveIntensity:.42});
const b6Uniform=new THREE.MeshStandardMaterial({color:0x171c16,roughness:.7,metalness:.08,emissive:0x100301,emissiveIntensity:.16});
const b6UniformTrim=new THREE.MeshStandardMaterial({color:0x30382b,roughness:.66,metalness:.12});
const b6Boot=new THREE.MeshStandardMaterial({color:0x111310,roughness:.78,metalness:.18});
const b6Metal=new THREE.MeshStandardMaterial({color:0x726c5d,roughness:.45,metalness:.5});
const b6TankGreen=new THREE.MeshStandardMaterial({color:0x54783a,roughness:.58,metalness:.38});
const b6TankGreenDark=new THREE.MeshStandardMaterial({color:0x263d21,roughness:.66,metalness:.42});
const b6Red=new THREE.MeshStandardMaterial({color:0x8d130d,roughness:.5,metalness:.12,emissive:0x4a0503,emissiveIntensity:.35});
const b6EyeWhite=new THREE.MeshStandardMaterial({color:0xc8bbaa,roughness:.8});
const b6EyeGlow=new THREE.MeshBasicMaterial({color:0xff1200,depthTest:false,depthWrite:false,toneMapped:false});
const b6EyeAura=new THREE.MeshBasicMaterial({color:0xff0500,transparent:true,opacity:.5,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
const b6EyeFlareMat=new THREE.MeshBasicMaterial({color:0xff1a08,transparent:true,opacity:.86,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false});
const b6EyeBeamMat=new THREE.MeshBasicMaterial({color:0xff0800,transparent:true,opacity:.34,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
const boss6EyeFx=[];
let boss6TankMuzzle=null,boss6TankMuzzleFlash=null,boss6TankRecoil=0;
const b6Black=new THREE.MeshBasicMaterial({color:0x080808});

function boss6Mesh(parent,geometry,material,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0]){
 const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.scale.set(...scale);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function boss6Joint(parent,name,pos=[0,0,0]){
 const g=new THREE.Group();g.name='HwangGeunchul_'+name;g.position.set(...pos);parent.add(g);cacheBoss6Bone(name,g);boss6RenderBones[name]=g;return g;
}
function addBoss6EyeFx(head,x){
 const fx=new THREE.Group();fx.name=x<0?'HwangEyeFxL':'HwangEyeFxR';fx.position.set(x,.15,-.292);head.add(fx);

 const core=boss6Mesh(fx,new THREE.SphereGeometry(.058,12,9),b6EyeGlow,[0,0,-.018],[1.25,.72,.8]);
 core.renderOrder=1002;

 const flare=boss6Mesh(fx,new THREE.PlaneGeometry(.34,.095),b6EyeFlareMat,[0,0,-.052]);
 flare.renderOrder=1001;

 const halo=boss6Mesh(fx,new THREE.SphereGeometry(.13,12,9),b6EyeAura,[0,0,-.055],[1.65,.68,.34]);
 halo.renderOrder=1000;

 const beam=boss6Mesh(fx,new THREE.CylinderGeometry(.022,.072,.78,8,1,true),b6EyeBeamMat,[0,0,-.43],[1,1,1],[Math.PI/2,0,0]);
 beam.renderOrder=999;

 boss6EyeFx.push({root:fx,core,flare,halo,beam});
 return fx;
}
function buildBoss6ProceduralModel(){
 const root=new THREE.Group();root.name='HwangGeunchulProceduralModel';
 root.rotation.y=Math.PI;

 const hips=boss6Joint(root,'hips',[0,1.39,0]);
 boss6Mesh(hips,new THREE.BoxGeometry(.74,.34,.44),b6Uniform,[0,.03,0],[1,1,1]);
 boss6Mesh(hips,new THREE.BoxGeometry(.82,.11,.49),b6Metal,[0,.18,0]);

 // Hwang's oversized slapstick tank-cannon prop, centered between the legs.
 const boss6GroinCannon=new THREE.Group();boss6GroinCannon.name='HwangGeunchulTankBarrel';
 boss6GroinCannon.position.set(0,-.18,-.23);hips.add(boss6GroinCannon);
 boss6Mesh(boss6GroinCannon,new THREE.BoxGeometry(.4,.3,.38),b6TankGreenDark,[0,.02,-.02]);
 boss6Mesh(boss6GroinCannon,new THREE.CylinderGeometry(.12,.15,1.8,12),b6TankGreen,[0,-.01,-.98],[1,1,1],[Math.PI/2,0,0]);
 boss6Mesh(boss6GroinCannon,new THREE.CylinderGeometry(.16,.16,.22,12),b6TankGreenDark,[0,-.01,-1.9],[1,1,1],[Math.PI/2,0,0]);
 boss6Mesh(boss6GroinCannon,new THREE.CylinderGeometry(.14,.14,.13,12),b6Black,[0,-.01,-2.05],[1,1,1],[Math.PI/2,0,0]);
 boss6TankMuzzle=new THREE.Group();boss6TankMuzzle.name='HwangTankMuzzle';boss6TankMuzzle.position.set(0,-.01,-2.14);boss6GroinCannon.add(boss6TankMuzzle);
 boss6TankMuzzleFlash=boss6Mesh(boss6TankMuzzle,new THREE.SphereGeometry(.15,9,7),new THREE.MeshBasicMaterial({color:0xffb52e,transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending}),[0,0,-.04],[1.25,.8,1.25]);
 boss6TankMuzzleFlash.visible=false;
 boss6GroinCannon.rotation.x=-.045;

 const spine=boss6Joint(hips,'spine',[0,.22,0]);
 boss6Mesh(spine,new THREE.BoxGeometry(.82,.43,.46),b6Uniform,[0,.2,0],[1.02,1,1]);
 const chest=boss6Joint(spine,'chest',[0,.36,0]);
 boss6Mesh(chest,new THREE.BoxGeometry(1.12,.56,.53),b6Uniform,[0,.2,0],[1,1,1]);
 boss6Mesh(chest,new THREE.BoxGeometry(1.19,.18,.59),b6UniformTrim,[0,.38,.005]);
 boss6Mesh(chest,new THREE.BoxGeometry(.42,.18,.035),b6Red,[0,.25,-.285]);
 boss6Mesh(chest,new THREE.BoxGeometry(.11,.3,.04),b6Metal,[-.33,.08,-.29],[1,1,1],[0,0,.04]);
 boss6Mesh(chest,new THREE.BoxGeometry(.11,.3,.04),b6Metal,[.33,.08,-.29],[1,1,1],[0,0,-.04]);

 const upperChest=boss6Joint(chest,'upperChest',[0,.36,0]);
 boss6Mesh(upperChest,new THREE.BoxGeometry(1.18,.22,.54),b6UniformTrim,[0,.05,0]);
 const neck=boss6Joint(upperChest,'neck',[0,.18,0]);
 boss6Mesh(neck,new THREE.CylinderGeometry(.16,.2,.25,8),b6Skin,[0,.1,0]);

 const head=boss6Joint(neck,'head',[0,.22,-.005]);
 boss6Mesh(head,new THREE.BoxGeometry(.52,.53,.47),b6Face,[0,.1,0],[1.03,1,1]);
 boss6Mesh(head,new THREE.BoxGeometry(.58,.2,.5),b6FaceDark,[0,-.145,-.005],[1,1,1]);
 boss6Mesh(head,new THREE.BoxGeometry(.14,.19,.16),b6FaceDark,[0,.08,-.29]);
 boss6Mesh(head,new THREE.BoxGeometry(.15,.09,.06),b6FaceDark,[-.31,.08,0]);
 boss6Mesh(head,new THREE.BoxGeometry(.15,.09,.06),b6FaceDark,[.31,.08,0]);
 boss6Mesh(head,new THREE.BoxGeometry(.17,.075,.027),b6EyeSocket,[-.13,.15,-.249]);
 boss6Mesh(head,new THREE.BoxGeometry(.17,.075,.027),b6EyeSocket,[.13,.15,-.249]);
 addBoss6EyeFx(head,-.13);
 addBoss6EyeFx(head,.13);
 const leftEyeLight=new THREE.PointLight(0xff1000,6.5,3.8,1.6);leftEyeLight.position.set(-.13,.15,-.34);head.add(leftEyeLight);
 const rightEyeLight=new THREE.PointLight(0xff1000,6.5,3.8,1.6);rightEyeLight.position.set(.13,.15,-.34);head.add(rightEyeLight);
 boss6Mesh(head,new THREE.BoxGeometry(.22,.045,.025),b6Black,[-.12,.245,-.272],[1,1,1],[0,0,.13]);
 boss6Mesh(head,new THREE.BoxGeometry(.22,.045,.025),b6Black,[.12,.245,-.272],[1,1,1],[0,0,-.13]);
 boss6Mesh(head,new THREE.BoxGeometry(.31,.045,.025),b6Black,[0,-.075,-.275]);
 boss6Mesh(head,new THREE.BoxGeometry(.24,.035,.026),b6EyeWhite,[0,-.12,-.278]);

 const cap=new THREE.Group();cap.name='HwangGeunchulMarineCap';cap.position.set(0,.42,-.01);head.add(cap);
 boss6Mesh(cap,new THREE.CylinderGeometry(.24,.3,.17,8),b6UniformTrim,[0,.02,0]);
 boss6Mesh(cap,new THREE.BoxGeometry(.52,.035,.29),b6Uniform, [0,-.055,-.13],[1,1,1],[.02,0,0]);
 boss6Mesh(cap,new THREE.BoxGeometry(.14,.07,.025),b6Red,[0,.015,-.235]);

 const lShoulder=boss6Joint(upperChest,'leftShoulder',[.6,.1,0]);
 const rShoulder=boss6Joint(upperChest,'rightShoulder',[-.6,.1,0]);
 boss6Mesh(lShoulder,new THREE.SphereGeometry(.23,10,8),b6UniformTrim,[0,-.03,0],[1.2,.8,1]);
 boss6Mesh(rShoulder,new THREE.SphereGeometry(.23,10,8),b6UniformTrim,[0,-.03,0],[1.2,.8,1]);
 boss6Mesh(lShoulder,new THREE.BoxGeometry(.43,.09,.42),b6Red,[.08,.08,0]);
 boss6Mesh(rShoulder,new THREE.BoxGeometry(.43,.09,.42),b6Red,[-.08,.08,0]);

 const lUpper=boss6Joint(lShoulder,'leftUpperArm',[.02,-.03,0]);
 const rUpper=boss6Joint(rShoulder,'rightUpperArm',[-.02,-.03,0]);
 boss6Mesh(lUpper,new THREE.CapsuleGeometry(.17,.35,5,8),b6Uniform,[0,-.31,0],[1.12,1,1.05]);
 boss6Mesh(rUpper,new THREE.CapsuleGeometry(.17,.35,5,8),b6Uniform,[0,-.31,0],[1.12,1,1.05]);
 const lLower=boss6Joint(lUpper,'leftLowerArm',[0,-.63,0]);
 const rLower=boss6Joint(rUpper,'rightLowerArm',[0,-.63,0]);
 boss6Mesh(lLower,new THREE.CapsuleGeometry(.18,.3,5,8),b6Skin,[0,-.28,0],[1.08,1,1.04]);
 boss6Mesh(rLower,new THREE.CapsuleGeometry(.18,.3,5,8),b6Skin,[0,-.28,0],[1.08,1,1.04]);
 const lHand=boss6Joint(lLower,'leftHand',[0,-.56,-.005]);
 const rHand=boss6Joint(rLower,'rightHand',[0,-.56,-.005]);
 boss6Mesh(lHand,new THREE.BoxGeometry(.28,.24,.28),b6SkinDark,[0,-.06,-.015],[1.05,1,1.05]);
 boss6Mesh(rHand,new THREE.BoxGeometry(.28,.24,.28),b6SkinDark,[0,-.06,-.015],[1.05,1,1.05]);
 boss6Mesh(lHand,new THREE.BoxGeometry(.32,.09,.3),b6Metal,[0,.08,0]);
 boss6Mesh(rHand,new THREE.BoxGeometry(.32,.09,.3),b6Metal,[0,.08,0]);

 const lUpperLeg=boss6Joint(hips,'leftUpperLeg',[.24,-.09,0]);
 const rUpperLeg=boss6Joint(hips,'rightUpperLeg',[-.24,-.09,0]);
 boss6Mesh(lUpperLeg,new THREE.CapsuleGeometry(.2,.46,5,8),b6Uniform,[0,-.41,0],[1.05,1,1.05]);
 boss6Mesh(rUpperLeg,new THREE.CapsuleGeometry(.2,.46,5,8),b6Uniform,[0,-.41,0],[1.05,1,1.05]);
 const lLowerLeg=boss6Joint(lUpperLeg,'leftLowerLeg',[0,-.84,0]);
 const rLowerLeg=boss6Joint(rUpperLeg,'rightLowerLeg',[0,-.84,0]);
 boss6Mesh(lLowerLeg,new THREE.CapsuleGeometry(.18,.4,5,8),b6UniformTrim,[0,-.36,0]);
 boss6Mesh(rLowerLeg,new THREE.CapsuleGeometry(.18,.4,5,8),b6UniformTrim,[0,-.36,0]);
 const lFoot=boss6Joint(lLowerLeg,'leftFoot',[0,-.72,-.03]);
 const rFoot=boss6Joint(rLowerLeg,'rightFoot',[0,-.72,-.03]);
 boss6Mesh(lFoot,new THREE.BoxGeometry(.39,.22,.64),b6Boot,[0,-.04,-.14],[1,1,1],[.02,0,0]);
 boss6Mesh(rFoot,new THREE.BoxGeometry(.39,.22,.64),b6Boot,[0,-.04,-.14],[1,1,1],[.02,0,0]);

 boss6Mesh(root,new THREE.BoxGeometry(.72,.12,.1),b6Red,[0,1.19,.25]);
 root.scale.set(1.08,1.08,1.04);
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
 return root;
}

const boss6SupportMarines=[];
let boss6SupportBuilt=false;

function buildBoss6SupportMarine(name,role,side){
 const root=new THREE.Group();root.name='HwangSupport_'+name;
 root.rotation.y=Math.PI;
 const isTonton=role==='tonton';
 const scale=isTonton?1.17:1.0;

 const skin=isTonton
  ?new THREE.MeshStandardMaterial({color:0x090807,roughness:.92,metalness:.01})
  :new THREE.MeshStandardMaterial({color:0x9a6950,roughness:.82,metalness:.01});
 const skinHi=isTonton
  ?new THREE.MeshStandardMaterial({color:0x171311,roughness:.86})
  :new THREE.MeshStandardMaterial({color:0xb47b5d,roughness:.8});
 const hair=new THREE.MeshStandardMaterial({color:0x0b0b0a,roughness:.9});
 const fatigue=new THREE.MeshStandardMaterial({color:0x283126,roughness:.75,metalness:.05});
 const fatigueDark=new THREE.MeshStandardMaterial({color:0x151a15,roughness:.78,metalness:.08});
 const redBrief=new THREE.MeshStandardMaterial({color:0xd31318,roughness:.56,metalness:.03,emissive:0x260002,emissiveIntensity:.13});
 const pinkLip=new THREE.MeshStandardMaterial({color:0xff91a8,roughness:.7});
 const tooth=new THREE.MeshStandardMaterial({color:0xe9e0cf,roughness:.72});
 const metal=new THREE.MeshStandardMaterial({color:isTonton?0x444945:0x555b53,roughness:.4,metalness:.64});
 const gunDark=new THREE.MeshStandardMaterial({color:0x151817,roughness:.55,metalness:.42});
 const accent=new THREE.MeshStandardMaterial({color:0xa31711,roughness:.52,metalness:.12,emissive:0x250201,emissiveIntensity:.2});
 const tankGreen=new THREE.MeshStandardMaterial({color:isTonton?0x486b2d:0x5b7a35,roughness:.62,metalness:.34});
 const tankGreenDark=new THREE.MeshStandardMaterial({color:0x263b1c,roughness:.68,metalness:.4});

 const pelvis=new THREE.Group();pelvis.position.y=isTonton?1.23:1.17;root.add(pelvis);

 // Slapstick marine prop: a long green tank-cannon barrel mounted dead-center between the legs.
 const groinCannon=new THREE.Group();groinCannon.name=isTonton?'TontonjeongTankBarrel':'MumochilTankBarrel';
 groinCannon.position.set(0,isTonton?-.11:-.1,-.22);pelvis.add(groinCannon);
 boss6Mesh(groinCannon,new THREE.BoxGeometry(isTonton?.34:.29,isTonton?.26:.22,.34),tankGreenDark,[0,.02,-.03]);
 boss6Mesh(groinCannon,new THREE.CylinderGeometry(isTonton?.095:.075,isTonton?.12:.095,isTonton?1.5:1.28,12),tankGreen,[0,-.015,-.82],[1,1,1],[Math.PI/2,0,0]);
 boss6Mesh(groinCannon,new THREE.CylinderGeometry(isTonton?.13:.105,isTonton?.13:.105,.18,12),tankGreenDark,[0,-.015,-1.58],[1,1,1],[Math.PI/2,0,0]);
 boss6Mesh(groinCannon,new THREE.CylinderGeometry(isTonton?.115:.09,isTonton?.115:.09,.12,12),b6Black,[0,-.015,-1.68],[1,1,1],[Math.PI/2,0,0]);
 const groinMuzzle=new THREE.Group();groinMuzzle.name=(isTonton?'Tontonjeong':'Mumochil')+'TankMuzzle';groinMuzzle.position.set(0,-.015,-1.76);groinCannon.add(groinMuzzle);
 const groinMuzzleFlash=boss6Mesh(groinMuzzle,new THREE.SphereGeometry(isTonton?.12:.09,8,6),new THREE.MeshBasicMaterial({color:0xffb52e,transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending}),[0,0,-.035],[1.25,.8,1.25]);
 groinMuzzleFlash.visible=false;
 groinCannon.rotation.x=isTonton?-.04:-.025;

 if(isTonton){
  // Canonical Tontonjeong silhouette: huge coal-black body + bright red field briefs.
  boss6Mesh(pelvis,new THREE.BoxGeometry(.82,.34,.5),redBrief,[0,.0,0]);
  boss6Mesh(pelvis,new THREE.BoxGeometry(.9,.09,.53),fatigueDark,[0,.17,0]);

  const torso=new THREE.Group();torso.position.set(0,.34,0);pelvis.add(torso);
  boss6Mesh(torso,new THREE.BoxGeometry(1.02,.76,.48),skin,[0,.29,0],[1,1,1]);
  boss6Mesh(torso,new THREE.SphereGeometry(.35,10,8),skinHi,[-.29,.46,-.12],[1.18,.77,.72]);
  boss6Mesh(torso,new THREE.SphereGeometry(.35,10,8),skinHi,[.29,.46,-.12],[1.18,.77,.72]);
  boss6Mesh(torso,new THREE.BoxGeometry(.18,.18,.07),skinHi,[-.16,.15,-.26]);
  boss6Mesh(torso,new THREE.BoxGeometry(.18,.18,.07),skinHi,[.16,.15,-.26]);
  boss6Mesh(torso,new THREE.BoxGeometry(.18,.16,.07),skinHi,[-.16,-.04,-.26]);
  boss6Mesh(torso,new THREE.BoxGeometry(.18,.16,.07),skinHi,[.16,-.04,-.26]);
  boss6Mesh(torso,new THREE.BoxGeometry(.18,.14,.07),skinHi,[-.16,-.21,-.25]);
  boss6Mesh(torso,new THREE.BoxGeometry(.18,.14,.07),skinHi,[.16,-.21,-.25]);

  const head=new THREE.Group();head.position.set(0,1.03,-.015);pelvis.add(head);
  boss6Mesh(head,new THREE.BoxGeometry(.49,.48,.44),skin,[0,0,0]);
  boss6Mesh(head,new THREE.BoxGeometry(.55,.18,.46),skinHi,[0,-.19,0]);
  boss6Mesh(head,new THREE.BoxGeometry(.135,.09,.026),tooth,[-.12,.07,-.232]);
  boss6Mesh(head,new THREE.BoxGeometry(.135,.09,.026),tooth,[.12,.07,-.232]);
  boss6Mesh(head,new THREE.BoxGeometry(.034,.038,.018),b6Black,[-.12,.07,-.251]);
  boss6Mesh(head,new THREE.BoxGeometry(.034,.038,.018),b6Black,[.12,.07,-.251]);
  // Iconic pale-pink lips deliberately oversized against the near-black face.
  boss6Mesh(head,new THREE.BoxGeometry(.31,.07,.035),pinkLip,[0,-.095,-.239]);
  boss6Mesh(head,new THREE.BoxGeometry(.27,.055,.037),pinkLip,[0,-.155,-.238]);
  boss6Mesh(head,new THREE.BoxGeometry(.16,.055,.025),tooth,[0,-.125,-.259]);

  const lArm=new THREE.Group(),rArm=new THREE.Group();
  lArm.position.set(.64,.77,0);rArm.position.set(-.64,.77,0);pelvis.add(lArm,rArm);
  boss6Mesh(lArm,new THREE.SphereGeometry(.245,9,7),skinHi,[0,0,0],[1.22,1.06,1.04]);
  boss6Mesh(rArm,new THREE.SphereGeometry(.245,9,7),skinHi,[0,0,0],[1.22,1.06,1.04]);
  boss6Mesh(lArm,new THREE.CapsuleGeometry(.205,.38,5,8),skin,[0,-.34,0],[1.15,1,1.1]);
  boss6Mesh(rArm,new THREE.CapsuleGeometry(.205,.38,5,8),skin,[0,-.34,0],[1.15,1,1.1]);
  const lFore=new THREE.Group(),rFore=new THREE.Group();lFore.position.y=-.69;rFore.position.y=-.69;lArm.add(lFore);rArm.add(rFore);
  boss6Mesh(lFore,new THREE.CapsuleGeometry(.19,.34,5,8),skinHi,[0,-.23,0],[1.12,1,1.08]);
  boss6Mesh(rFore,new THREE.CapsuleGeometry(.19,.34,5,8),skinHi,[0,-.23,0],[1.12,1,1.08]);
  boss6Mesh(lFore,new THREE.BoxGeometry(.3,.25,.3),skin,[0,-.51,0]);
  boss6Mesh(rFore,new THREE.BoxGeometry(.3,.25,.3),skin,[0,-.51,0]);

  const lLeg=new THREE.Group(),rLeg=new THREE.Group();lLeg.position.set(.25,-.16,0);rLeg.position.set(-.25,-.16,0);pelvis.add(lLeg,rLeg);
  boss6Mesh(lLeg,new THREE.CapsuleGeometry(.205,.58,5,8),skin,[0,-.38,0],[1.05,1,1.05]);
  boss6Mesh(rLeg,new THREE.CapsuleGeometry(.205,.58,5,8),skin,[0,-.38,0],[1.05,1,1.05]);
  const lShin=new THREE.Group(),rShin=new THREE.Group();lShin.position.y=-.78;rShin.position.y=-.78;lLeg.add(lShin);rLeg.add(rShin);
  boss6Mesh(lShin,new THREE.CapsuleGeometry(.18,.48,5,8),skinHi,[0,-.3,0]);
  boss6Mesh(rShin,new THREE.CapsuleGeometry(.18,.48,5,8),skinHi,[0,-.3,0]);
  boss6Mesh(lShin,new THREE.BoxGeometry(.36,.23,.56),b6Boot,[0,-.59,-.09]);
  boss6Mesh(rShin,new THREE.BoxGeometry(.36,.23,.56),b6Boot,[0,-.59,-.09]);

  const weapon=new THREE.Group();weapon.position.set(.18,1.57,-.48);root.add(weapon);
  boss6Mesh(weapon,new THREE.BoxGeometry(.34,.32,.84),gunDark,[0,0,-.17]);
  boss6Mesh(weapon,new THREE.CylinderGeometry(.125,.125,1.02,10),metal,[0,0,-.8],[1,1,1],[Math.PI/2,0,0]);
  boss6Mesh(weapon,new THREE.CylinderGeometry(.19,.19,.24,10),metal,[0,0,-.43],[1,1,1],[Math.PI/2,0,0]);
  boss6Mesh(weapon,new THREE.BoxGeometry(.17,.44,.25),accent,[.22,-.05,-.1]);
  const muzzle=new THREE.Group();muzzle.position.set(0,0,-1.34);weapon.add(muzzle);
  const muzzleFlash=boss6Mesh(muzzle,new THREE.SphereGeometry(.12,7,5),new THREE.MeshBasicMaterial({color:0xffc04a}),[0,0,-.02]);muzzleFlash.visible=false;

  root.scale.setScalar(scale);
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  root.visible=false;boss6Root.add(root);
  return {name,role,side,root,pelvis,torso,head,lArm,rArm,lFore,rFore,lLeg,rLeg,lShin,rShin,weapon,muzzle,muzzleFlash,groinCannon,groinMuzzle,groinMuzzleFlash,recoil:0,weaponBaseZ:-.48,seed:1.3};
 }

 // Canonical Mumochil silhouette: tan male, narrow squinting eyes and a tall black mohawk.
 boss6Mesh(pelvis,new THREE.BoxGeometry(.61,.31,.4),fatigue,[0,0,0]);
 boss6Mesh(pelvis,new THREE.BoxGeometry(.66,.09,.44),fatigueDark,[0,.16,0]);

 const torso=new THREE.Group();torso.position.set(0,.37,0);pelvis.add(torso);
 boss6Mesh(torso,new THREE.BoxGeometry(.72,.65,.4),skin,[0,.25,0]);
 boss6Mesh(torso,new THREE.SphereGeometry(.25,9,7),skinHi,[-.21,.4,-.1],[1.13,.72,.7]);
 boss6Mesh(torso,new THREE.SphereGeometry(.25,9,7),skinHi,[.21,.4,-.1],[1.13,.72,.7]);
 boss6Mesh(torso,new THREE.BoxGeometry(.68,.18,.42),fatigue,[0,-.12,0]);

 const head=new THREE.Group();head.position.set(0,.99,-.02);pelvis.add(head);
 boss6Mesh(head,new THREE.BoxGeometry(.42,.46,.4),skin,[0,0,0]);
 boss6Mesh(head,new THREE.BoxGeometry(.45,.16,.42),skinHi,[0,-.18,0]);
 // Squinting eyes: intentionally almost closed.
 boss6Mesh(head,new THREE.BoxGeometry(.16,.022,.025),b6Black,[-.105,.065,-.215],[1,1,1],[0,0,.11]);
 boss6Mesh(head,new THREE.BoxGeometry(.16,.022,.025),b6Black,[.105,.065,-.215],[1,1,1],[0,0,-.11]);
 boss6Mesh(head,new THREE.BoxGeometry(.22,.035,.025),b6Black,[0,-.11,-.222],[1,1,1],[0,0,-.04]);
 boss6Mesh(head,new THREE.BoxGeometry(.12,.025,.02),tooth,[.02,-.13,-.243]);

 // Tall center-line mohawk, clearly visible from front/side.
 const mohawk=new THREE.Group();mohawk.position.set(0,.22,.01);head.add(mohawk);
 for(let i=0;i<7;i++){
  const z=.17-i*.058;
  const h=.22+Math.sin((i/6)*Math.PI)*.13;
  boss6Mesh(mohawk,new THREE.BoxGeometry(.075,h,.07),hair,[0,h*.48,z],[1,1,1],[.05+(i-3)*.015,0,0]);
 }

 const lArm=new THREE.Group(),rArm=new THREE.Group();
 lArm.position.set(.45,.65,0);rArm.position.set(-.45,.65,0);pelvis.add(lArm,rArm);
 boss6Mesh(lArm,new THREE.CapsuleGeometry(.135,.43,5,8),skin,[0,-.28,0],[1.05,1,1.02]);
 boss6Mesh(rArm,new THREE.CapsuleGeometry(.135,.43,5,8),skin,[0,-.28,0],[1.05,1,1.02]);
 const lFore=new THREE.Group(),rFore=new THREE.Group();lFore.position.y=-.57;rFore.position.y=-.57;lArm.add(lFore);rArm.add(rFore);
 boss6Mesh(lFore,new THREE.CapsuleGeometry(.12,.34,5,8),skinHi,[0,-.21,0]);
 boss6Mesh(rFore,new THREE.CapsuleGeometry(.12,.34,5,8),skinHi,[0,-.21,0]);
 boss6Mesh(lFore,new THREE.BoxGeometry(.23,.2,.24),skin,[0,-.45,0]);
 boss6Mesh(rFore,new THREE.BoxGeometry(.23,.2,.24),skin,[0,-.45,0]);

 const lLeg=new THREE.Group(),rLeg=new THREE.Group();lLeg.position.set(.19,-.13,0);rLeg.position.set(-.19,-.13,0);pelvis.add(lLeg,rLeg);
 boss6Mesh(lLeg,new THREE.CapsuleGeometry(.145,.56,5,8),fatigue,[0,-.35,0]);
 boss6Mesh(rLeg,new THREE.CapsuleGeometry(.145,.56,5,8),fatigue,[0,-.35,0]);
 const lShin=new THREE.Group(),rShin=new THREE.Group();lShin.position.y=-.73;rShin.position.y=-.73;lLeg.add(lShin);rLeg.add(rShin);
 boss6Mesh(lShin,new THREE.CapsuleGeometry(.125,.45,5,8),fatigueDark,[0,-.28,0]);
 boss6Mesh(rShin,new THREE.CapsuleGeometry(.125,.45,5,8),fatigueDark,[0,-.28,0]);
 boss6Mesh(lShin,new THREE.BoxGeometry(.3,.2,.5),b6Boot,[0,-.55,-.08]);
 boss6Mesh(rShin,new THREE.BoxGeometry(.3,.2,.5),b6Boot,[0,-.55,-.08]);

 const weapon=new THREE.Group();weapon.position.set(.1,1.46,-.43);root.add(weapon);
 boss6Mesh(weapon,new THREE.BoxGeometry(.16,.18,1.28),metal,[0,0,-.43]);
 boss6Mesh(weapon,new THREE.BoxGeometry(.22,.28,.42),gunDark,[0,-.04,.12]);
 boss6Mesh(weapon,new THREE.CylinderGeometry(.035,.035,.66,8),metal,[0,0,-1.36],[1,1,1],[Math.PI/2,0,0]);
 boss6Mesh(weapon,new THREE.BoxGeometry(.055,.16,.22),accent,[0,.13,-.52]);
 const muzzle=new THREE.Group();muzzle.position.set(0,0,-1.72);weapon.add(muzzle);
 const muzzleFlash=boss6Mesh(muzzle,new THREE.SphereGeometry(.075,7,5),new THREE.MeshBasicMaterial({color:0xffc04a}),[0,0,-.02]);muzzleFlash.visible=false;

 root.scale.setScalar(scale);
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
 root.visible=false;boss6Root.add(root);
 return {name,role,side,root,pelvis,torso,head,lArm,rArm,lFore,rFore,lLeg,rLeg,lShin,rShin,weapon,muzzle,muzzleFlash,groinCannon,groinMuzzle,groinMuzzleFlash,recoil:0,weaponBaseZ:-.43,seed:3.7};
}
function buildBoss6SupportSquad(){
 if(boss6SupportBuilt)return;
 boss6SupportBuilt=true;
 boss6SupportMarines.push(
  buildBoss6SupportMarine('톤톤정','tonton',1),
  buildBoss6SupportMarine('무모칠','mumochil',-1)
 );
}
function updateBoss6SupportSquad(dt){
 if(!boss6SupportBuilt)return;
 const alive=state.bossHp>0&&BOSS_VARIANT===6;
 const attack=alive&&(state.bossState==='b6_support'||state.bossState==='b6_allfire');
 for(const m of boss6SupportMarines){
  m.root.visible=attack;
  if(!attack){
   m.recoil=0;
   m.muzzleFlash.visible=false;
   if(m.groinMuzzleFlash)m.groinMuzzleFlash.visible=false;
   m.root.position.set(m.side*(m.role==='tonton'?4.5:4.9),0,2.4);
   continue;
  }
  const attackX=m.side*(m.role==='tonton'?3.0:3.25);
  const attackZ=-.25;
  const tx=attackX,tz=attackZ;
  const a=1-Math.exp(-dt*7.5);
  m.root.position.x=THREE.MathUtils.lerp(m.root.position.x,tx,a);
  m.root.position.z=THREE.MathUtils.lerp(m.root.position.z,tz,a);
  const moving=Math.abs(m.root.position.x-tx)+Math.abs(m.root.position.z-tz)>.08;
  const gait=Math.sin(state.time*(moving?11:3.1)+m.seed);
  const breath=Math.sin(state.time*2.1+m.seed);
  m.pelvis.position.y=1.14+(moving?Math.abs(gait)*.035:breath*.018);
  m.lLeg.rotation.x=THREE.MathUtils.lerp(m.lLeg.rotation.x,moving?gait*.42:0,1-Math.exp(-dt*12));
  m.rLeg.rotation.x=THREE.MathUtils.lerp(m.rLeg.rotation.x,moving?-gait*.42:0,1-Math.exp(-dt*12));
  m.lShin.rotation.x=THREE.MathUtils.lerp(m.lShin.rotation.x,moving?Math.max(0,-gait)*.5:0,1-Math.exp(-dt*12));
  m.rShin.rotation.x=THREE.MathUtils.lerp(m.rShin.rotation.x,moving?Math.max(0,gait)*.5:0,1-Math.exp(-dt*12));
  const aim=1;
  m.lArm.rotation.x=THREE.MathUtils.lerp(m.lArm.rotation.x,-.86*aim,1-Math.exp(-dt*14));
  m.rArm.rotation.x=THREE.MathUtils.lerp(m.rArm.rotation.x,-.86*aim,1-Math.exp(-dt*14));
  m.lArm.rotation.z=THREE.MathUtils.lerp(m.lArm.rotation.z,m.role==='tonton'?.32:.24,1-Math.exp(-dt*14));
  m.rArm.rotation.z=THREE.MathUtils.lerp(m.rArm.rotation.z,m.role==='tonton'?-.32:-.24,1-Math.exp(-dt*14));
  m.lFore.rotation.x=THREE.MathUtils.lerp(m.lFore.rotation.x,-.45*aim,1-Math.exp(-dt*14));
  m.rFore.rotation.x=THREE.MathUtils.lerp(m.rFore.rotation.x,-.45*aim,1-Math.exp(-dt*14));
  m.torso.rotation.x=THREE.MathUtils.lerp(m.torso.rotation.x,-.12,1-Math.exp(-dt*10));
  m.head.rotation.y=THREE.MathUtils.lerp(m.head.rotation.y,m.side*.08,1-Math.exp(-dt*8));
  m.recoil=Math.max(0,m.recoil-dt);
  const recoil=m.recoil>0?Math.sin((m.recoil/.13)*Math.PI)*(m.role==='tonton'?.16:.1):0;
  m.weapon.position.z=(m.weaponBaseZ??-.43)+recoil;
  m.muzzleFlash.visible=false;
  if(m.groinMuzzleFlash)m.groinMuzzleFlash.visible=m.recoil>.075;
 }
}
function fireBoss6SupportMarine(m,index=0){
 if(!m)return false;
 const muzzle=m.groinMuzzle||m.muzzle;
 const start=new THREE.Vector3();muzzle.getWorldPosition(start);
 const target=player.position.clone().add(new THREE.Vector3((index%3-1)*.18,1.0,0));
 const dir=target.sub(start).normalize();
 const heavy=m.role==='tonton';
 spawnBoss6Shot('support',start,dir,{speed:heavy?16.2:20.5,dmg:heavy?15:12,posture:heavy?15:10,radius:heavy?.18:.11,life:1.65});
 m.recoil=.13;
 spawnSparks(start,heavy?12:8,heavy?4.4:3.2);
 return true;
}

state.boss6Phase=1;state.boss6HitReact=0;state.boss6AttackCount=0;state.boss6LockedDir=new THREE.Vector3();

function cacheBoss6Bone(name,node){if(!node)return;boss6Bones[name]=node;boss6Rest[name]={rotation:node.rotation.clone(),position:node.position.clone(),scale:node.scale.clone()}}
function setBoss6Bone(name,rx=0,ry=0,rz=0,speed=12,dt=.016){
 const b=boss6Bones[name],r=boss6Rest[name];if(!b||!r)return;const a=1-Math.exp(-dt*speed);
 b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,r.rotation.x+rx,a);b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,r.rotation.y+ry,a);b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,r.rotation.z+rz,a);
}
function resetBoss6Pose(dt){
 for(const [name,b] of Object.entries(boss6Bones)){const r=boss6Rest[name];if(!r)continue;const a=1-Math.exp(-dt*14);
  b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,r.rotation.x,a);b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,r.rotation.y,a);b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,r.rotation.z,a)}
}
function syncBoss6Rig(dt=0){boss6VRM?.update?.(Math.max(0,dt));boss6Visual?.updateMatrixWorld?.(true)}
function addBoss6MarineAccessories(h){
 const head=h?.getRawBoneNode?.('head')||h?.getNormalizedBoneNode?.('head');
 if(head){
  const cap=new THREE.Group();cap.name='HwangGeunchulMarineCap';
  const crown=new THREE.Mesh(new THREE.CylinderGeometry(.18,.21,.13,8),new THREE.MeshStandardMaterial({color:0x111611,roughness:.72,metalness:.06}));
  crown.position.y=.12;cap.add(crown);
  const brim=new THREE.Mesh(new THREE.BoxGeometry(.42,.025,.24),new THREE.MeshStandardMaterial({color:0x0d110d,roughness:.78}));
  brim.position.set(0,.055,-.11);cap.add(brim);
  const badge=new THREE.Mesh(new THREE.BoxGeometry(.15,.055,.015),new THREE.MeshBasicMaterial({color:0xffb221}));
  badge.position.set(0,.12,-.19);cap.add(badge);
  head.add(cap);
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.028,10,8),new THREE.MeshBasicMaterial({color:0xff1600}));
  eye.position.set(.062,.035,-.145);head.add(eye);
 }
 const chest=h?.getRawBoneNode?.('chest')||h?.getNormalizedBoneNode?.('chest');
 if(chest){
  const vest=new THREE.Mesh(new THREE.BoxGeometry(.48,.5,.18),new THREE.MeshStandardMaterial({color:0x181d17,roughness:.66,metalness:.12}));
  vest.position.set(0,-.04,-.02);chest.add(vest);
  const plate=new THREE.Mesh(new THREE.BoxGeometry(.16,.08,.012),new THREE.MeshBasicMaterial({color:0xb12618}));
  plate.position.set(0,.08,-.102);vest.add(plate);
 }
}
async function loadBoss6Avatar(){
 if(BOSS_VARIANT!==6)return;
 try{
  const root=buildBoss6ProceduralModel();
  root.updateMatrixWorld(true);
  boss6Root.add(root);boss6Visual=root;boss6VRM=null;boss6Fallback.visible=false;boss6VisualBaseY=root.position.y;
  buildBoss6SupportSquad();boss6Ready=true;
  poseBoss6(.12);updateBoss6SupportSquad(.12);syncBoss6Rig(0);
  if(ui.bossName)ui.bossName.textContent=BOSS6_NAME;
  flash('기합! 황근출 해병 등장',1.0);
 }catch(err){
  console.warn('Hwang Geunchul procedural model failed.',err);
  boss6Fallback.visible=true;
 }
}
function enforceBoss6Visibility(){
 if(BOSS_VARIANT!==6)return;for(const child of boss.children)child.visible=(child===boss6Root);boss6Root.visible=true;if(!boss6Ready)boss6Fallback.visible=true;
}
const BOSS6_DUR={b6_kihap:2.45,b6_grenade:2.8,b6_jjajang:2.7,b6_van:2.55,b6_reverse:2.75,b6_support:3.05,b6_enlist:2.35,b6_allfire:5.4,b6_roar:2.25};
const BOSS6_MARKS={
 b6_kihap:[1.8,1.48,1.16,.84,.52],
 b6_grenade:[2.0,1.35,.7],
 b6_jjajang:[1.95,1.5,1.05,.6],
 b6_support:[2.35,1.95,1.55,1.15,.75,.35]
};
function boss6ProjectileMesh(kind,color){
 let g;
 if(kind==='van')g=new THREE.BoxGeometry(1.65,1.0,2.8);
 else if(kind==='grenade')g=new THREE.IcosahedronGeometry(.2,1);
 else if(kind==='jjajang')g=new THREE.SphereGeometry(.28,10,8);
 else if(kind==='enlist')g=new THREE.IcosahedronGeometry(.34,1);
 else if(kind==='support')g=new THREE.BoxGeometry(.14,.14,.72);
 else g=new THREE.SphereGeometry(.19,10,8);
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:kind==='kihap'||kind==='enlist'?.8:.28,roughness:.42,metalness:kind==='van'?.52:.12,transparent:true,opacity:.94}));
 m.castShadow=true;return m;
}
function spawnBoss6Shot(kind,origin,dir,opts={}){
 const colors={kihap:0xff5b37,grenade:0x687848,jjajang:0x4a2412,van:0x751510,support:0xffb82f,enlist:0xff1818,shrapnel:0xff793c};
 const obj=boss6ProjectileMesh(kind,colors[kind]||colors.kihap);obj.position.copy(origin);
 const v=dir.clone().normalize().multiplyScalar(opts.speed??(kind==='van'?13.8:kind==='support'?15.2:12.5));
 if(opts.up)v.y+=opts.up;
 obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v.clone().normalize());scene.add(obj);
 boss6Projectiles.push({obj,kind,vel:v,gravity:opts.gravity||0,life:opts.life||2.2,radius:opts.radius??(kind==='van'?1.02:kind==='jjajang'?.28:kind==='enlist'?.34:.18),dmg:opts.dmg??16,posture:opts.posture??15,unblockable:!!opts.unblockable,pull:!!opts.pull,burst:!!opts.burst,prev:origin.clone(),spin:opts.spin??4.2});
}
function spawnBoss6Radial(origin,count=8,kind='shrapnel',phase2=false){
 for(let i=0;i<count;i++){const a=i/count*Math.PI*2+(phase2?.18:0),d=new THREE.Vector3(Math.sin(a),.04,Math.cos(a));spawnBoss6Shot(kind,origin.clone().add(new THREE.Vector3(0,.18,0)),d,{speed:phase2?11.8:9.8,dmg:phase2?14:11,posture:phase2?14:10,radius:.13,life:1.5})}
}
function removeBoss6Projectile(i){
 const p=boss6Projectiles[i];if(!p)return;scene.remove(p.obj);p.obj.geometry?.dispose?.();p.obj.material?.dispose?.();boss6Projectiles.splice(i,1);
}
function clearBoss6Projectiles(){for(let i=boss6Projectiles.length-1;i>=0;i--)removeBoss6Projectile(i)}
function updateBoss6Projectiles(dt){
 if(!boss6Projectiles.length)return;
 const caps=combatHumanoidCapsules(playerVrmBones,player,PLAYER_VISUAL_HEIGHT);
 for(let i=boss6Projectiles.length-1;i>=0;i--){
  const p=boss6Projectiles[i];p.life-=dt;if(p.gravity)p.vel.y-=p.gravity*dt;p.obj.rotation.y+=dt*p.spin;p.obj.rotation.x+=dt*p.spin*.45;
  const prev=p.obj.position.clone();p.obj.position.addScaledVector(p.vel,dt);let hit=null;
  for(const c of caps){const d=combatSegmentSegmentDistance(prev,p.obj.position,c.a,c.b);if(d<=c.r+p.radius){hit={point:p.obj.position.clone(),part:c.part};break}}
  if(hit){
   spawnSparks(hit.point,p.kind==='van'?24:10,p.kind==='van'?7.5:4.5);
   if(state.invuln>0)flash('회피',.12);else{hurtPlayer(p.dmg,p.posture,p.unblockable);if(p.pull){const pull=flatDir(player.position,boss.position);player.position.addScaledVector(pull,1.15)}}
   removeBoss6Projectile(i);continue;
  }
  if((p.kind==='grenade'||p.kind==='jjajang')&&p.obj.position.y<=.18&&p.vel.y<0){
   const pos=p.obj.position.clone();spawnDustBurst(pos,p.kind==='jjajang'?.5:.7);spawnBoss6Radial(pos,p.kind==='jjajang'?6:8,'shrapnel',state.boss6Phase===2);removeBoss6Projectile(i);continue;
  }
  p.prev.copy(prev);
  if(p.life<=0||p.obj.position.y<-1||p.obj.position.length()>65)removeBoss6Projectile(i);
 }
}
function boss6Origin(y=1.75){
 if(boss6TankMuzzle){
  boss6Root.updateMatrixWorld(true);
  const p=new THREE.Vector3();boss6TankMuzzle.getWorldPosition(p);return p;
 }
 return boss.position.clone().add(new THREE.Vector3(0,y,0));
}
function boss6Aim(y=.95){return player.position.clone().add(new THREE.Vector3(0,y,0)).sub(boss6Origin()).normalize()}
function pulseBoss6TankMuzzle(){
 boss6TankRecoil=.14;
 if(boss6TankMuzzleFlash)boss6TankMuzzleFlash.visible=true;
}
function boss6FireKihap(index=0){
 pulseBoss6TankMuzzle();
 const spread=(index-2)*.045,dir=boss6Aim().applyAxisAngle(new THREE.Vector3(0,1,0),spread);
 spawnBoss6Shot('kihap',boss6Origin(1.85),dir,{speed:15.5,dmg:14,posture:13,radius:.18,life:1.7});
}
function boss6FireGrenade(index=0){
 pulseBoss6TankMuzzle();
 const start=boss6Origin(2.0),target=player.position.clone().add(new THREE.Vector3((index-1)*.7,.15,0)),dir=target.sub(start).normalize();
 spawnBoss6Shot('grenade',start,dir,{speed:9.0,up:5.0,gravity:9.8,dmg:15,posture:16,radius:.2,life:2.5});
}
function boss6FireJjajang(index=0){
 pulseBoss6TankMuzzle();
 const start=boss6Origin(2.05),target=player.position.clone().add(new THREE.Vector3((index%2?1:-1)*.55,.1,(index-1.5)*.35)),dir=target.sub(start).normalize();
 spawnBoss6Shot('jjajang',start,dir,{speed:8.0,up:4.2,gravity:8.4,dmg:12,posture:11,radius:.28,life:2.6});
}
function boss6FireVan(unblockable=true){
 const dir=flatDir(boss.position,player.position);spawnBoss6Shot('van',boss.position.clone().addScaledVector(dir,1.2).add(new THREE.Vector3(0,.55,0)),dir,{speed:14.5,dmg:26,posture:42,radius:1.05,unblockable,life:2.4,spin:0});
}
function boss6FireSupport(index=0){
 const marine=boss6SupportMarines[index%Math.max(1,boss6SupportMarines.length)];
 if(fireBoss6SupportMarine(marine,index))return;
 const side=index%2===0?1:-1,around=flatDir(player.position,boss.position),right=new THREE.Vector3(around.z,0,-around.x);
 const start=player.position.clone().addScaledVector(right,side*(5.8+(index%3))).add(new THREE.Vector3(0,1.45,0));
 const dir=player.position.clone().add(new THREE.Vector3(0,1.0,0)).sub(start).normalize();
 spawnBoss6Shot('support',start,dir,{speed:16.5,dmg:13,posture:12,radius:.15,life:1.5});
}
function boss6FireEnlist(unblockable=true){
 pulseBoss6TankMuzzle();
 const dir=boss6Aim(1.05);spawnBoss6Shot('enlist',boss6Origin(1.65),dir,{speed:11.5,dmg:18,posture:30,radius:.36,unblockable,pull:true,life:2.0});
}
function boss6Once(tag,fn){if(boss6Fired.has(tag))return false;boss6Fired.add(tag);fn?.();return true}
function poseBoss6(dt){
 if(!boss6Ready)return;resetBoss6Pose(dt);const st=state.bossState,t=state.bossTimer,hit=state.boss6HitReact>0?Math.sin((state.boss6HitReact/.15)*Math.PI):0;
 setBoss6Bone('spine',-.03-hit*.12,0,hit*.07,14,dt);setBoss6Bone('head',.02-hit*.04,0,-hit*.04,13,dt);
 if(st==='idle'&&state.bossPunish>0){
  const r=clamp(state.bossPunish/1.8,0,1);setBoss6Bone('hips',.1*r,-.06*r,0,18,dt);setBoss6Bone('spine',-.28*r,.08*r,.03*r,20,dt);setBoss6Bone('rightUpperArm',-.4,.02,-.28,18,dt);setBoss6Bone('leftUpperArm',-.38,-.02,.26,18,dt);
 }else if(st==='idle'){
  const b=Math.sin(state.time*1.3);setBoss6Bone('hips',0,.025*b,.03*b,9,dt);setBoss6Bone('spine',-.04,.015*b,-.025*b,9,dt);
  setBoss6Bone('leftUpperArm',-.48,-.06,.38,11,dt);setBoss6Bone('rightUpperArm',-.48,.06,-.38,11,dt);setBoss6Bone('leftLowerArm',-.38,0,.08,11,dt);setBoss6Bone('rightLowerArm',-.38,0,-.08,11,dt);
 }else if(st==='b6_kihap'){
  const p=clamp(1-t/BOSS6_DUR.b6_kihap,0,1),pulse=Math.sin(p*Math.PI*5)*.12;setBoss6Bone('spine',-.22+pulse,0,0,24,dt);setBoss6Bone('chest',.14,0,0,22,dt);
  setBoss6Bone('leftUpperArm',-.9,-.12,.28,26,dt);setBoss6Bone('rightUpperArm',-.9,.12,-.28,26,dt);setBoss6Bone('leftLowerArm',-.18,0,0,26,dt);setBoss6Bone('rightLowerArm',-.18,0,0,26,dt);
 }else if(st==='b6_grenade'||st==='b6_jjajang'){
  const p=clamp(1-t/BOSS6_DUR[st],0,1),throwP=Math.sin(clamp((p-.18)/.55,0,1)*Math.PI);setBoss6Bone('spine',-.18+.34*throwP,-.16*throwP,0,24,dt);
  setBoss6Bone('rightUpperArm',-1.15+.72*throwP,.08,-.42,27,dt);setBoss6Bone('rightLowerArm',-.86+.52*throwP,0,-.12,27,dt);setBoss6Bone('leftUpperArm',st==='b6_jjajang'?-1.0:-.35,-.05,.3,24,dt);
 }else if(st==='b6_van'){
  setBoss6Bone('spine',-.36,0,0,24,dt);setBoss6Bone('hips',-.12,0,0,22,dt);setBoss6Bone('leftUpperArm',-.72,-.12,.3,24,dt);setBoss6Bone('rightUpperArm',-.72,.12,-.3,24,dt);
 }else if(st==='b6_reverse'){
  const p=clamp(1-t/BOSS6_DUR.b6_reverse,0,1);setBoss6Bone('spine',.18-.42*p,.22*p,0,23,dt);setBoss6Bone('hips',.08,-.18*p,0,22,dt);setBoss6Bone('rightUpperArm',-.68,.1,-.5,24,dt);
 }else if(st==='b6_support'){
  setBoss6Bone('spine',-.05,.32,0,20,dt);setBoss6Bone('rightUpperArm',-.54,.12,-1.0,24,dt);setBoss6Bone('rightLowerArm',-.18,0,-.22,24,dt);setBoss6Bone('leftUpperArm',-.32,-.08,.28,20,dt);
 }else if(st==='b6_enlist'){
  const p=clamp(1-t/BOSS6_DUR.b6_enlist,0,1),pull=Math.sin(clamp((p-.2)/.58,0,1)*Math.PI);setBoss6Bone('spine',-.18-.22*pull,0,0,24,dt);
  setBoss6Bone('leftUpperArm',-.35,-.55,.9*pull,26,dt);setBoss6Bone('rightUpperArm',-.35,.55,-.9*pull,26,dt);setBoss6Bone('leftLowerArm',-.25,0,.22*pull,24,dt);setBoss6Bone('rightLowerArm',-.25,0,-.22*pull,24,dt);
 }else if(st==='b6_allfire'){
  const wave=Math.sin((BOSS6_DUR.b6_allfire-t)*6.4);setBoss6Bone('hips',-.05,.18*wave,0,25,dt);setBoss6Bone('spine',-.16,.35*wave,-.08*wave,28,dt);setBoss6Bone('leftUpperArm',-.72,-.2,.48*wave,28,dt);setBoss6Bone('rightUpperArm',-.72,.2,-.48*wave,28,dt);
 }else if(st==='b6_roar'){
  setBoss6Bone('spine',.22,0,0,18,dt);setBoss6Bone('chest',.3,0,0,18,dt);setBoss6Bone('leftUpperArm',-.26,-.55,.98,18,dt);setBoss6Bone('rightUpperArm',-.26,.55,-.98,18,dt);
 }
}
function chooseBoss6Attack(){
 if(state.bossHp<=0)return;state.bossPunish=0;setDanger(false);boss6Fired.clear();state.boss6AttackCount++;const d=dist(),p2=state.boss6Phase===2;let pool;
 if(d<3.0)pool=p2?['b6_reverse','b6_kihap','b6_enlist','b6_jjajang','b6_allfire']:['b6_reverse','b6_kihap','b6_enlist','b6_jjajang'];
 else if(d>7.0)pool=p2?['b6_van','b6_grenade','b6_support','b6_allfire']:['b6_van','b6_grenade','b6_support'];
 else pool=p2?['b6_kihap','b6_grenade','b6_jjajang','b6_van','b6_reverse','b6_support','b6_enlist','b6_allfire']:['b6_kihap','b6_grenade','b6_jjajang','b6_van','b6_reverse','b6_support','b6_enlist'];
 if(state.potionPunishQueued){state.potionPunishQueued=false;state.bossState=Math.random()<.55?'b6_enlist':'b6_van'}else state.bossState=pool[Math.floor(Math.random()*pool.length)];
 state.bossTimer=BOSS6_DUR[state.bossState];state.bossAttackTarget.copy(player.position);state.bossAttackTarget.y=0;state.boss6LockedDir.copy(flatDir(boss.position,player.position));
 if(state.bossState==='b6_enlist'||state.bossState==='b6_van')setDanger(true);
}
function finishBoss6Attack(recovery=.9){setDanger(false);state.bossState='idle';beginBossPunish(recovery);boss6Fired.clear();boss.position.y=0}
function hitBoss6(base,posture=12,contact=null){
 if(state.bossHp<=0)return;let dmg=base,pd=posture;[dmg,pd]=bossPunishDamage(dmg,pd);if(state.bossStagger>0){dmg*=1.6;pd*=.2}
 state.bossHp=Math.max(0,state.bossHp-dmg);addBossPosture(pd);state.boss6HitReact=.15;triggerPlayerHitImpact(contact||player.position.clone().lerp(boss.position,.6).add(new THREE.Vector3(0,1.35,0)));
 if(state.bossHp<=0){state.bossState='dead';setDanger(false);clearBoss6Projectiles();flash('황근출 해병 격파 · 기합!',1.35)}
 else if(state.bossPosture>=BOSS_POSTURE_MAX[6]){resetBossPostureAfterBreak(.32);state.bossStagger=1.15;state.bossState='stagger';state.bossTimer=1.15;flash('황근출 자세 붕괴',.48)}
}
function updateBoss6(dt){
 enforceBoss6Visibility();updateBoss6Projectiles(dt);updateBoss6SupportSquad(dt);boss6TankRecoil=Math.max(0,boss6TankRecoil-dt);if(boss6TankMuzzleFlash)boss6TankMuzzleFlash.visible=boss6TankRecoil>.055;state.boss6HitReact=Math.max(0,state.boss6HitReact-dt);boss6Halo.rotation.z+=dt*(state.boss6Phase===2?2.0:.9);boss6Aura.intensity=(state.boss6Phase===2?15:11)+Math.sin(state.time*7)*1.0;
 const eyePulse=1+Math.sin(state.time*10.5)*.14+(state.boss6Phase===2?.12:0);
 b6EyeFlareMat.opacity=.82+Math.sin(state.time*12)*.12;
 b6EyeBeamMat.opacity=(state.boss6Phase===2?.5:.34)+Math.sin(state.time*9)*.06;
 b6EyeAura.opacity=(state.boss6Phase===2?.66:.5)+Math.sin(state.time*11)*.08;
 for(const fx of boss6EyeFx){fx.core.scale.set(1.25*eyePulse,.72*eyePulse,.8);fx.flare.scale.setScalar(eyePulse);fx.halo.scale.set(1.65*eyePulse,.68*eyePulse,.34);}
 if(boss6Visual)boss6Visual.position.y=THREE.MathUtils.lerp(boss6Visual.position.y,boss6VisualBaseY,1-Math.exp(-dt*11));
 if(state.bossHp<=0){poseBoss6(dt);syncBoss6Rig(dt);return}
 if(state.boss6Phase===1&&state.bossHp<=state.bossMaxHp*.5){
  state.boss6Phase=2;state.bossState='b6_roar';state.bossTimer=BOSS6_DUR.b6_roar;boss6Fired.clear();clearBoss6Projectiles();boss6HaloMat.opacity=.22;boss6Aura.color.setHex(0xff1800);
  spawnBoss2Pulse(boss.position.clone().add(new THREE.Vector3(0,1.2,0)),4.8,0xff3018,.7);flash('악으로! 깡으로! · 오도짜세 2페이즈',1.0);
 }
 if(state.bossStagger>0){setDanger(false);state.bossStagger=Math.max(0,state.bossStagger-dt);poseBoss6(dt);syncBoss6Rig(dt);if(state.bossStagger<=0){state.bossState='idle';state.bossTimer=.7}return}
 state.bossTimer-=dt;updateBossPunish(dt);const liveDir=flatDir(boss.position,player.position),d=dist(),dur=BOSS6_DUR[state.bossState]||1,dir=state.bossState==='idle'?liveDir:bossCommittedDir(dur,state.bossTimer,.58),face=Math.atan2(dir.x,dir.z),p2=state.boss6Phase===2;
 if(state.bossState!=='idle')boss.rotation.y=lerpAngle(boss.rotation.y,face,1-Math.exp(-dt*(p2?12:9)));
 if(state.bossState==='idle'){
  if(state.bossPunish<=0){boss.rotation.y=lerpAngle(boss.rotation.y,Math.atan2(liveDir.x,liveDir.z),1-Math.exp(-dt*5.5));if(d>5.0)boss.position.addScaledVector(liveDir,dt*(p2?3.8:3.1));else if(d<2.7)boss.position.addScaledVector(liveDir,-dt*.8)}
  if(state.bossTimer<=0&&state.bossPunish<=0)chooseBoss6Attack();
 }else if(state.bossState==='b6_kihap'){
  BOSS6_MARKS.b6_kihap.forEach((m,i)=>{if(state.bossTimer<=m+.06&&state.bossTimer>m-.06)boss6Once('kihap'+i,()=>{flash('기합포!',.16);boss6FireKihap(i)})});
  if(state.bossTimer<=0)finishBoss6Attack(.88);
 }else if(state.bossState==='b6_grenade'){
  BOSS6_MARKS.b6_grenade.forEach((m,i)=>{if(state.bossTimer<=m+.07&&state.bossTimer>m-.07)boss6Once('grenade'+i,()=>{if(i===0)flash('해병수류탄 투척!',.28);boss6FireGrenade(i)})});
  if(state.bossTimer<=0)finishBoss6Attack(.92);
 }else if(state.bossState==='b6_jjajang'){
  BOSS6_MARKS.b6_jjajang.forEach((m,i)=>{if(state.bossTimer<=m+.07&&state.bossTimer>m-.07)boss6Once('jjajang'+i,()=>{if(i===0)flash('해병짜장 포격!',.28);boss6FireJjajang(i)})});
  if(state.bossTimer<=0)finishBoss6Attack(.9);
 }else if(state.bossState==='b6_van'){
  if(state.bossTimer<=1.45)boss6Once('van',()=>{flash('오도봉고 출동!',.35);boss6FireVan(true)});
  if(state.bossTimer<=0)finishBoss6Attack(1.12);
 }else if(state.bossState==='b6_reverse'){
  const p=clamp(1-state.bossTimer/BOSS6_DUR.b6_reverse,0,1);if(p>.16&&p<.42)boss.position.addScaledVector(state.boss6LockedDir,-dt*8.8);
  for(const [j,m] of [[0,1.4],[1,1.05],[2,.7],[3,.38]])if(state.bossTimer<=m+.055&&state.bossTimer>m-.055)boss6Once('reverse'+j,()=>{if(j===0)flash('전술적 역돌격!',.3);boss6FireKihap(j)});
  if(state.bossTimer<=0)finishBoss6Attack(.82);
 }else if(state.bossState==='b6_support'){
  BOSS6_MARKS.b6_support.forEach((m,i)=>{if(state.bossTimer<=m+.055&&state.bossTimer>m-.055)boss6Once('support'+i,()=>{if(i===0)flash('톤톤정·무모칠 지원사격!',.38);boss6FireSupport(i)})});
  if(state.bossTimer<=0)finishBoss6Attack(.96);
 }else if(state.bossState==='b6_enlist'){
  if(state.bossTimer<=1.12)boss6Once('enlist',()=>{flash('자진입대 실시!',.34);boss6FireEnlist(true)});
  if(state.bossTimer<=0)finishBoss6Attack(1.08);
 }else if(state.bossState==='b6_allfire'){
  const events=[
   [4.65,'a0',()=>{flash('악으로! 깡으로! 전탄발사!',.46);boss6FireKihap(0);boss6FireKihap(1)}],
   [4.05,'a1',()=>boss6FireGrenade(0)],[3.55,'a2',()=>boss6FireJjajang(0)],
   [3.05,'a3',()=>boss6FireSupport(0)],[2.65,'a4',()=>boss6FireSupport(1)],
   [2.18,'a5',()=>boss6FireGrenade(2)],[1.7,'a6',()=>boss6FireJjajang(3)],
   [1.18,'a7',()=>{setDanger(true);boss6FireVan(true)}],[.66,'a8',()=>boss6FireEnlist(true)]
  ];
  for(const [m,tag,fn] of events)if(state.bossTimer<=m+.055&&state.bossTimer>m-.055)boss6Once(tag,fn);
  if(state.bossTimer<=0)finishBoss6Attack(1.35);
 }else if(state.bossState==='b6_roar'){
  if(state.bossTimer<=.8)boss6Once('roarburst',()=>{spawnBoss2Pulse(boss.position.clone().add(new THREE.Vector3(0,1.1,0)),5.2,0xff2718,.72);for(let i=0;i<10;i++)boss6FireKihap(i%5)});
  if(state.bossTimer<=0)finishBoss6Attack(.7);
 }
 poseBoss6(dt);applyBossHumanoidLocomotion(setBoss6Bone,boss6Visual,boss6VisualBaseY,dt,{stride:1.08,bob:.036,twist:.06,knee:.7});syncBoss6Rig(dt);
}

function flash(t,d=.35){ui.msg.textContent=t;ui.msg.style.opacity='1';clearTimeout(flash.t);flash.t=setTimeout(()=>ui.msg.style.opacity='0',d*1000)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
const PLAYER_ATTACK_PROFILES={
 straight:[null,
  {duration:.56,active:[.31,.62],queue:.67,drive:1.35},
  {duration:.59,active:[.30,.64],queue:.68,drive:1.15},
  {duration:.74,active:[.38,.72],queue:.74,drive:1.55}],
 greatsword:[null,
  {duration:.96,active:[.42,.70],queue:.73,drive:.95},
  {duration:1.02,active:[.41,.71],queue:.74,drive:.9},
  {duration:1.20,active:[.49,.78],queue:.79,drive:1.05}],
 hammer:[null,
  {duration:1.10,active:[.48,.72],queue:.76,drive:.72},
  {duration:1.18,active:[.46,.73],queue:.77,drive:.7},
  {duration:1.36,active:[.54,.81],queue:.82,drive:.78}],
 spear:[null,
  {duration:.58,active:[.34,.76],queue:.72,drive:2.65},
  {duration:.62,active:[.34,.75],queue:.72,drive:2.4},
  {duration:.76,active:[.38,.80],queue:.78,drive:3.05}],
 katana:[null,
  {duration:.44,active:[.23,.51],queue:.59,drive:1.9},
  {duration:.48,active:[.22,.52],queue:.60,drive:1.75},
  {duration:.64,active:[.30,.65],queue:.69,drive:2.05}],
 axe:[null,
  {duration:.78,active:[.38,.67],queue:.71,drive:1.15},
  {duration:.84,active:[.37,.68],queue:.72,drive:1.05},
  {duration:1.00,active:[.45,.74],queue:.78,drive:1.25}]
};
const PLAYER_STRONG_PROFILES={
 straight:{duration:.92,active:[.46,.67],drive:2.25,cost:26,damage:2.15,posture:1.45},
 greatsword:{duration:1.78,active:[.61,.79],drive:1.15,cost:38,damage:3.05,posture:1.9},
 hammer:{duration:1.52,active:[.55,.76],drive:.92,cost:36,damage:2.8,posture:2.05},
 spear:{duration:1.08,active:[.43,.69],drive:3.85,cost:27,damage:2.35,posture:1.45},
 katana:{duration:.96,active:[.39,.58],drive:2.8,cost:26,damage:2.35,posture:1.4},
 axe:{duration:1.34,active:[.52,.75],drive:1.42,cost:33,damage:2.65,posture:1.8}
};
function playerAttackProfile(id=currentWeapon()?.id,step=state.attackStep,strong=state.attackStrong){
 if(strong)return PLAYER_STRONG_PROFILES[id]||PLAYER_STRONG_PROFILES.straight;
 return PLAYER_ATTACK_PROFILES[id]?.[step]||PLAYER_ATTACK_PROFILES.straight[Math.max(1,Math.min(3,step||1))];
}
function playerAttackProgress(){
 const dur=Math.max(.001,state.attackDuration||playerAttackProfile().duration);
 return clamp(1-state.attack/dur,0,1);
}
// 60fps feel target: quick swings ~80-105f total, heavy slams/grabs ~120-165f,
// then ~60-90f stationary recovery so the player can reach the flank/back.
const BOSS_ATTACK_SCALE={
 arm_cross:1.45,arm_double_slam:1.68,arm_sweep:1.5,arm_uppercut:1.34,
 arm_grab:1.72,arm_barrage:1.42,arm_guardbreak:1.66,arm_crush:1.78
};
function bossAttackScale(st){return BOSS_ATTACK_SCALE[st]||1}
const ROLL_DURATION=.76;
const ROLL_IFRAME_START=.10,ROLL_IFRAME_END=.60;
function lerpAngle(current,target,alpha){
 const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
 return current+delta*alpha;
}
function flatDir(a,b){const d=new THREE.Vector3().subVectors(b,a);d.y=0;return d.lengthSq()?d.normalize():d.set(0,0,-1)}
function dist(){return player.position.distanceTo(boss.position)}
function combatSegmentSegmentDistance(p1,q1,p2,q2){
 const d1=q1.clone().sub(p1),d2=q2.clone().sub(p2),r=p1.clone().sub(p2);
 const a=d1.dot(d1),e=d2.dot(d2),f=d2.dot(r),EPS=1e-7;let s=0,t=0;
 if(a<=EPS&&e<=EPS)return p1.distanceTo(p2);
 if(a<=EPS){t=clamp(f/e,0,1)}
 else{const c=d1.dot(r);if(e<=EPS)s=clamp(-c/a,0,1);else{const b=d1.dot(d2),den=a*e-b*b;s=Math.abs(den)>EPS?clamp((b*f-c*e)/den,0,1):0;t=(b*s+f)/e;if(t<0){t=0;s=clamp(-c/a,0,1)}else if(t>1){t=1;s=clamp((b-c)/a,0,1)}}}
 return p1.clone().addScaledVector(d1,s).distanceTo(p2.clone().addScaledVector(d2,t));
}
function combatBonePoint(bones,name){const b=bones?.[name];if(!b)return null;const p=new THREE.Vector3();b.getWorldPosition(p);return p}
function combatHumanoidCapsules(bones,root,fallbackHeight=2){
 root?.updateMatrixWorld?.(true);
 const hips=combatBonePoint(bones,'hips'),chest=combatBonePoint(bones,'chest')||combatBonePoint(bones,'upperChest'),head=combatBonePoint(bones,'head'),leftShoulder=combatBonePoint(bones,'leftShoulder'),rightShoulder=combatBonePoint(bones,'rightShoulder'),out=[];
 const lf=combatBonePoint(bones,'leftFoot'),rf=combatBonePoint(bones,'rightFoot');
 let scale=1;
 if(head&&(lf||rf)){const foot=lf&&rf?lf.clone().add(rf).multiplyScalar(.5):(lf||rf);scale=clamp(Math.abs(head.y-foot.y)/1.72,.88,1.58)}
 const add=(a,b,r,part)=>{if(a&&b)out.push({a,b,r:r*scale,part})};
 if(hips&&chest&&head){
  add(hips,chest,.34,'torso');add(chest,head,.285,'upper');add(leftShoulder,rightShoulder,.18,'shoulders');
  for(const side of ['left','right']){
   const ua=combatBonePoint(bones,side+'UpperArm'),la=combatBonePoint(bones,side+'LowerArm'),hand=combatBonePoint(bones,side+'Hand');
   const ul=combatBonePoint(bones,side+'UpperLeg'),ll=combatBonePoint(bones,side+'LowerLeg'),foot=combatBonePoint(bones,side+'Foot');
   add(ua,la,.122,'arm');add(la,hand,.11,'arm');add(ul,ll,.165,'leg');add(ll,foot,.14,'leg');
  }
 }else{const p=new THREE.Vector3();root?.getWorldPosition?.(p);add(p.clone().add(new THREE.Vector3(0,.28,0)),p.clone().add(new THREE.Vector3(0,fallbackHeight*.88,0)),.34,'torso')}
 return out;
}
function combatSweptBladeContact(prevBase,prevTip,base,tip,capsules,bladeRadius=.09){
 const prevMid=prevBase.clone().lerp(prevTip,.5),mid=base.clone().lerp(tip,.5);let best=null,bestD=Infinity;
 for(const c of capsules){
  let d=Math.min(
   combatSegmentSegmentDistance(prevBase,prevTip,c.a,c.b),combatSegmentSegmentDistance(base,tip,c.a,c.b),
   combatSegmentSegmentDistance(prevTip,tip,c.a,c.b),combatSegmentSegmentDistance(prevBase,base,c.a,c.b),
   combatSegmentSegmentDistance(prevMid,mid,c.a,c.b)
  );
  // Fast weapons can move completely across a thin body part between rendered frames.
  // Sample the full blade at four intermediate transforms so a stationary target cannot be skipped.
  for(let i=1;i<=4;i++){
   const t=i/5,ib=prevBase.clone().lerp(base,t),it=prevTip.clone().lerp(tip,t);
   d=Math.min(d,combatSegmentSegmentDistance(ib,it,c.a,c.b));
  }
  if(d<=c.r+bladeRadius&&d<bestD){
   bestD=d;
   const contactT=.5;
   best={point:base.clone().lerp(tip,contactT),part:c.part,distance:d};
  }
 }
 return best;
}
function combatWorldSegment(root,baseLocal,tipLocal){root.updateWorldMatrix?.(true,true);return{base:root.localToWorld(baseLocal.clone()),tip:root.localToWorld(tipLocal.clone())}}
const playerWeaponTrace={valid:false,base:new THREE.Vector3(),tip:new THREE.Vector3(),step:0};
function resetPlayerWeaponTrace(){playerWeaponTrace.valid=false;playerWeaponTrace.step=state.attackStep}
function playerWeaponDamageZone(){
 const id=currentWeapon().id;
 const zones={
  // Only the sharpened / striking portion deals damage. Handles and guards are excluded.
  straight:{base:[0,0,-.08],tip:[0,0,-1.58],radius:.09},
  greatsword:{base:[0,0,-.12],tip:[0,0,-2.2],radius:.12},
  hammer:{base:[-.38,0,-1.42],tip:[.38,0,-1.42],radius:.3},
  spear:{base:[0,0,-2.02],tip:[0,0,-2.78],radius:.105},
  katana:{base:[.04,0,-.08],tip:[.05,0,-1.84],radius:.075},
  axe:{base:[-.16,0,-1.18],tip:[.5,0,-1.18],radius:.22}
 };
 const z=zones[id]||zones.straight;
 return{base:new THREE.Vector3(...z.base),tip:new THREE.Vector3(...z.tip),radius:z.radius};
}
function playerAttackWindow(step,w){return playerAttackProfile(w.id,step).active}
function updatePlayerMeleeCollision(){
 const spec=playerWeaponDamageZone(),seg=combatWorldSegment(weaponPivot,spec.base,spec.tip);
 if(!playerWeaponTrace.valid||playerWeaponTrace.step!==state.attackStep){playerWeaponTrace.base.copy(seg.base);playerWeaponTrace.tip.copy(seg.tip);playerWeaponTrace.valid=true;playerWeaponTrace.step=state.attackStep;return}
 if(state.attack>0&&!state.attackHit){
  const w=currentWeapon(),p=playerAttackProgress(),win=playerAttackWindow(state.attackStep,w);
  if(p>=win[0]&&p<=win[1]){
   let caps;
   if(BOSS_VARIANT===2)caps=combatHumanoidCapsules(Object.keys(boss2RenderBones).length?boss2RenderBones:boss2Bones,boss2Root,2.1);
   else if(BOSS_VARIANT===3)caps=combatHumanoidCapsules(Object.keys(boss3RenderBones).length?boss3RenderBones:boss3Bones,boss3Root,2.05);
   else if(BOSS_VARIANT===4)caps=combatHumanoidCapsules(Object.keys(boss4RenderBones).length?boss4RenderBones:boss4Bones,boss4Root,2.05);
   else if(BOSS_VARIANT===5)caps=combatHumanoidCapsules(Object.keys(boss5RenderBones).length?boss5RenderBones:boss5Bones,boss5Root,2.1);
   else if(BOSS_VARIANT===6)caps=combatHumanoidCapsules(Object.keys(boss6RenderBones).length?boss6RenderBones:boss6Bones,boss6Root,3.28);
   else{const bp=boss.position.clone();caps=[{a:bp.clone().add(new THREE.Vector3(0,.4,0)),b:bp.clone().add(new THREE.Vector3(0,5.6*BOSS_GIANT_SCALE,0)),r:1.15*BOSS_GIANT_SCALE,part:'body'}]}
   const hit=combatSweptBladeContact(playerWeaponTrace.base,playerWeaponTrace.tip,seg.base,seg.tip,caps,spec.radius);
   if(hit){
    const gripDamage=twoHanded?1.16:1,gripPosture=twoHanded?1.2:1,step=state.attackStep;
    let damage,posture;
    if(state.attackStrong){
      const sp=PLAYER_STRONG_PROFILES[w.id]||PLAYER_STRONG_PROFILES.straight;
      damage=22*w.damage*sp.damage*gripDamage;posture=15*w.posture*sp.posture*gripPosture;
    }else{
      damage=[0,22,25,36][step]*w.damage*gripDamage;posture=[0,11,13,20][step]*w.posture*gripPosture;
    }
    state.attackHit=true;hitBoss(damage,posture,hit.point);if(!state.attackStrong)hitStop(.012*w.hitstop);
   }
  }
 }
 playerWeaponTrace.base.copy(seg.base);playerWeaponTrace.tip.copy(seg.tip);
}
function setDanger(v){state.danger=v;ui.danger.classList.toggle('on',v)}
function hitStop(sec){state.hitstop=Math.max(state.hitstop,sec)}
let impactAudioCtx=null,impactNoiseBuffer=null,impactOverlay=null;
const impactBursts=[];
function ensureImpactOverlay(){
 if(impactOverlay)return impactOverlay;
 impactOverlay=document.createElement('div');
 Object.assign(impactOverlay.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'35',opacity:'0',mixBlendMode:'screen',background:'radial-gradient(circle at 50% 50%, rgba(255,255,255,.34) 0%, rgba(255,210,160,.14) 18%, rgba(255,90,50,.05) 42%, transparent 70%)',transition:'opacity 45ms linear'});
 document.body.appendChild(impactOverlay);return impactOverlay;
}
function ensureImpactAudio(){
 try{
  if(!impactAudioCtx){
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
   impactAudioCtx=new AC();
   const len=Math.floor(impactAudioCtx.sampleRate*.16),buf=impactAudioCtx.createBuffer(1,len,impactAudioCtx.sampleRate),data=buf.getChannelData(0);
   for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
   impactNoiseBuffer=buf;
  }
  if(impactAudioCtx.state==='suspended')impactAudioCtx.resume?.().catch(()=>{});
  return impactAudioCtx;
 }catch{return null}
}
function playImpactSound(kind='blade',power=1){
 const ctx=ensureImpactAudio();if(!ctx)return;
 const now=ctx.currentTime,master=ctx.createGain();master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(Math.min(.42,.12*power),now+.005);master.gain.exponentialRampToValueAtTime(.0001,now+.15+.05*power);master.connect(ctx.destination);
 const osc=ctx.createOscillator(),og=ctx.createGain(),base=kind==='hammer'?68:kind==='heavy'?82:kind==='spear'?120:kind==='katana'?168:145;
 osc.type=kind==='hammer'?'sine':'triangle';osc.frequency.setValueAtTime(base*(1+.06*Math.random()),now);osc.frequency.exponentialRampToValueAtTime(Math.max(42,base*.48),now+.12);
 og.gain.setValueAtTime(.55,now);og.gain.exponentialRampToValueAtTime(.0001,now+.16);osc.connect(og).connect(master);osc.start(now);osc.stop(now+.18);
 if(impactNoiseBuffer){
  const src=ctx.createBufferSource(),ng=ctx.createGain(),filter=ctx.createBiquadFilter();src.buffer=impactNoiseBuffer;filter.type='bandpass';filter.frequency.value=kind==='hammer'?420:kind==='heavy'?680:kind==='katana'?1900:1250;filter.Q.value=.7;
  ng.gain.setValueAtTime(kind==='hammer'?.7:.45,now);ng.gain.exponentialRampToValueAtTime(.0001,now+.11+.03*power);src.connect(filter).connect(ng).connect(master);src.start(now);src.stop(now+.16);
 }
}
function spawnImpactBurst(origin,intensity=1,heavy=false){
 const color=heavy?0xffb05a:0xffe0a4;
 const ring=new THREE.Mesh(new THREE.RingGeometry(.08,.14,24),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));
 ring.position.copy(origin);ring.quaternion.copy(camera.quaternion);scene.add(ring);
 impactBursts.push({obj:ring,life:.16,max:.16,grow:heavy?7.5:5.4});
 spawnSparks(origin,Math.round((heavy?24:14)*intensity),heavy?7.8:5.8);
}
function updateImpactBursts(dt){
 for(let i=impactBursts.length-1;i>=0;i--){const b=impactBursts[i];b.life-=dt;const p=1-clamp(b.life/b.max,0,1);b.obj.scale.setScalar(1+p*b.grow);b.obj.material.opacity=(1-p)*.9;if(b.life<=0){scene.remove(b.obj);b.obj.geometry.dispose();b.obj.material.dispose();impactBursts.splice(i,1)}}
 const o=impactOverlay;if(o){o.style.opacity=String(clamp(state.impactFlash,0,.78));state.impactFlash=Math.max(0,state.impactFlash-dt*5.5)}
 state.impactFov=THREE.MathUtils.lerp(state.impactFov,0,1-Math.exp(-dt*16));state.impactRoll=THREE.MathUtils.lerp(state.impactRoll,0,1-Math.exp(-dt*18));
}
function weaponImpactProfile(){
 const id=currentWeapon()?.id||'straight';
 const map={straight:{kind:'blade',stop:.045,shake:.12,fov:-.9,flash:.2,power:1},greatsword:{kind:'heavy',stop:.078,shake:.2,fov:-1.7,flash:.34,power:1.55},hammer:{kind:'hammer',stop:.095,shake:.25,fov:-2.15,flash:.42,power:1.8},spear:{kind:'spear',stop:.05,shake:.13,fov:-1,flash:.2,power:1.05},katana:{kind:'katana',stop:.04,shake:.11,fov:-.8,flash:.18,power:.95},axe:{kind:'heavy',stop:.072,shake:.19,fov:-1.55,flash:.31,power:1.45}};
 const p={...(map[id]||map.straight)};if(state.attackStrong){p.stop*=1.45;p.shake*=1.35;p.fov*=1.3;p.flash*=1.35;p.power*=1.35}return p;
}
function triggerPlayerHitImpact(contact,zone='body'){
 if(!contact)return;
 const p=weaponImpactProfile(),critical=zone==='head'||zone==='spike'||state.bossPosture>=((BOSS_POSTURE_MAX[BOSS_VARIANT]||220)*.9),mul=critical?1.25:1;
 hitStop(p.stop*mul);state.shake=Math.max(state.shake,p.shake*mul);state.impactFov=Math.min(state.impactFov,p.fov*mul);state.impactRoll=(Math.random()<.5?-1:1)*.008*p.power*mul;state.impactFlash=Math.max(state.impactFlash,p.flash*mul);
 ensureImpactOverlay();spawnImpactBurst(contact,p.power*mul,['heavy','hammer'].includes(p.kind));playImpactSound(p.kind,p.power*mul);
}
function triggerPlayerHurtImpact(dmg,unblockable=false){
 const power=clamp(dmg/(PLAYER_MAX_HP*.32),.75,1.8)*(unblockable?1.18:1);
 state.shake=Math.max(state.shake,.16*power);state.impactFov=Math.min(state.impactFov,-1.1*power);state.impactRoll=(Math.random()<.5?-1:1)*.012*power;state.impactFlash=Math.max(state.impactFlash,.18*power);ensureImpactOverlay();playImpactSound(unblockable?'heavy':'hammer',.85*power);
}

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
const bossShockwaves=[];
function spawnBossShockwave(radius=4.8,dmg=24){
 const actualRadius=radius*BOSS_SHOCKWAVE_SCALE;
 const p=boss.position.clone();p.y=.045;
 const ring=new THREE.Mesh(
   new THREE.RingGeometry(.62,.84,48),
   new THREE.MeshBasicMaterial({color:0xd9c8aa,transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide})
 );
 ring.rotation.x=-Math.PI/2;ring.position.copy(p);scene.add(ring);
 bossShockwaves.push({ring,life:.62,max:.62,radius:actualRadius});

 const dx=player.position.x-boss.position.x,dz=player.position.z-boss.position.z;
 const groundDist=Math.hypot(dx,dz);
 if(groundDist<=actualRadius){
   if(state.invuln>0)flash('충격파 회피',.16);
   else hurtPlayer(dmg,28,false);
 }
 spawnDustBurst(p.clone(),1.8);
 state.shake=Math.max(state.shake,.28);
 state.bossBustImpulse=Math.max(state.bossBustImpulse,1);
}
function updateBossShockwaves(dt){
 for(let i=bossShockwaves.length-1;i>=0;i--){
   const s=bossShockwaves[i];s.life-=dt;
   const p=1-clamp(s.life/s.max,0,1);
   const scale=.8+p*s.radius*1.6;
   s.ring.scale.set(scale,scale,scale);
   s.ring.material.opacity=(1-p)*.72;
   if(s.life<=0){
     scene.remove(s.ring);s.ring.geometry.dispose();s.ring.material.dispose();
     bossShockwaves.splice(i,1);
   }
 }
}
function applyBossBustBounce(dt){
 state.bossBustImpulse=Math.max(0,state.bossBustImpulse-dt*2.1);
 const impulse=state.bossBustImpulse;
 const wave=Math.sin(state.time*25)*impulse;
 const settle=Math.sin(state.time*12)*impulse*.38;
 for(const [key,b] of Object.entries(bossBustBones)){
   const rest=bossBustRest[key];if(!b||!rest)continue;
   const side=key.startsWith('left')?-1:1;
   const layer=key.endsWith('2')?.62:1;
   const a=(wave+settle)*layer;
   b.position.x=THREE.MathUtils.lerp(b.position.x,rest.position.x+side*a*.018,1-Math.exp(-dt*18));
   b.position.y=THREE.MathUtils.lerp(b.position.y,rest.position.y-a*.105,1-Math.exp(-dt*18));
   b.position.z=THREE.MathUtils.lerp(b.position.z,rest.position.z+a*.14,1-Math.exp(-dt*18));
   b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,rest.rotation.x-a*.2,1-Math.exp(-dt*18));
   b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,rest.rotation.z+side*a*.055,1-Math.exp(-dt*18));
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
   let lsz=-.18,rsz=.18,lz=-1.62,rz=1.62,lx=.08,rx=.08,ly=.03,ry=-.03,llx=.4,rlx=.4,lly=0,rly=0;

   if(st==='idle'){
     torsoX=Math.sin(state.time*1.4)*.014;torsoZ=Math.sin(state.time*.72)*.018;
     headY=Math.sin(state.time*.52)*.05;headX=Math.sin(state.time*.8)*.018;
     lz+=Math.sin(state.time*1.25)*.018;rz-=Math.sin(state.time*1.25)*.018;
     llx=.4;rlx=.4;
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
    }else if(st==='bounce_quake'){
     const elapsed=3.45-t,cycle=clamp((elapsed-.24)/.9,0,2.999),local=cycle-Math.floor(cycle);
     const air=Math.sin(local*Math.PI);
     torsoX=-.08+air*.24;
     torsoZ=Math.sin(local*Math.PI*2)*.045;
     headX=-air*.08;
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
   applyBossBustBounce(dt);
 }

 if(bossLowerMixer){
   if(state.bossHp<=0){
     setBossLowerAction('idle',.08);
     bossLowerMixer.timeScale=0;
   }else{
     bossLowerMixer.timeScale=1;
     const desired=state.bossStagger>0?'idle_hitreact1':(state.bossState==='idle'&&dist()>4.15*BOSS_ENGAGE_SCALE?'walk':'idle');
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
 if(state.potionTimer>0)return;
 if(state.dead||state.rolling>0||state.attack>0||state.stagger>0||state.exhausted>0)return;
 const {x,z}=getMoveAxes();
 const toBoss=flatDir(player.position,boss.position);
 const right=new THREE.Vector3(-toBoss.z,0,toBoss.x);
 state.rollDir.set(0,0,0);
 if(input.lock){
   state.rollDir.addScaledVector(toBoss,z).addScaledVector(right,x);
 }else{
   const forward=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));
   const strafe=new THREE.Vector3(-forward.z,0,forward.x);
   state.rollDir.addScaledVector(forward,z).addScaledVector(strafe,x);
 }
 // Neutral dodge is a backstep away from the locked target / camera facing.
 if(!state.rollDir.lengthSq()){
   if(input.lock)state.rollDir.copy(toBoss).multiplyScalar(-1);
   else state.rollDir.set(-Math.sin(player.rotation.y),0,-Math.cos(player.rotation.y));
 }
 state.rollDir.normalize();
 state.rollLean=x<0?-1:x>0?1:(state.rollLean>0?-1:1);
 if(!spendStamina(22,.62))return;
 state.rolling=ROLL_DURATION;state.rollElapsed=0;state.invuln=0;
 spawnDustBurst(player.position.clone(),.38);
 player.rotation.y=Math.atan2(state.rollDir.x,state.rollDir.z);
}
function startAttack(step,strong=false){
 const w=currentWeapon(),grip=twoHanded?1.08:1;
 state.attackStrong=!!strong;
 const profile=playerAttackProfile(w.id,step,strong);
 const cost=(strong?profile.cost:[0,16,18,23][step]*w.stamina)*grip;
 if(!spendStamina(cost,strong?.82:.62)){state.attackStrong=false;return false}
 state.attackStep=strong?1:step;state.attackDuration=profile.duration*(twoHanded?.98:1);
 state.attack=state.attackDuration;resetPlayerWeaponTrace();
 state.attackHit=false;state.attackQueued=false;
 state.comboGrace=strong?0:Math.max(.12,profile.duration*(1-profile.queue)+.05);return true;
}
function tryDrinkPotion(){
 if(state.dead||state.potions<=0||state.potionTimer>0||state.attack>0||state.rolling>0||state.stagger>0)return;
 if(state.hp>=state.hpMax){flash('체력이 가득 찼다',.35);return}
 state.potions--;
 state.potionTimer=.95;
 state.potionHealDone=false;
 state.staminaRegenDelay=Math.max(state.staminaRegenDelay,.9);
 flash(`에스트 사용 · 남은 수 ${state.potions}`,.55);

 // Flask reading is probabilistic, not a guaranteed AI cheat.
 // While Bellamore is already committed to a pattern she notices the heal more often,
 // but the current action is never cancelled; the ranged punish is queued as the next action.
 if(state.bossHp>0&&state.bossStagger<=0&&state.bossState!=='dead'){
   const activePattern=state.bossState!=='idle'&&state.bossState!=='stagger';
   const recoveryWindow=state.bossState==='idle'&&state.bossTimer>.58;
   let reactChance=activePattern?.68:(recoveryWindow?.38:.26);
   if(dist()>9)reactChance+=.08;
   reactChance=clamp(reactChance,0,.78);
   if(Math.random()<reactChance){
     state.potionPunishQueued=true;
     state.potionPunishKind=Math.random()<.7?'spike_triple':'spike_fan';
     // In idle/recovery she becomes a little more alert, but still does not fire instantly.
     if(state.bossState==='idle')state.bossTimer=Math.min(state.bossTimer,.72);
   }
 }
}
function tryAttack(){
 if(state.dead||state.rolling>0||state.stagger>0||state.potionTimer>0)return;
 if(state.attack>0){
   if(state.attackStrong)return;
   const profile=playerAttackProfile(),p=playerAttackProgress();
   if(p>=profile.queue)state.attackQueued=true;
   return;
 }
 const next=state.comboGrace>0?Math.min(3,state.attackStep+1):1;
 startAttack(next,false);
}
function tryStrongAttack(){
 if(state.dead||state.rolling>0||state.stagger>0||state.potionTimer>0||state.attack>0)return;
 startAttack(1,true);
}
function tryDeflect(){if(!state.dead&&state.stagger<=0&&state.exhausted<=0&&spendStamina(5,.32)){state.deflect=.17;state.parryAnim=.22}}

function hurtPlayer(dmg,posture=20,unblockable=false){
 if(state.invuln>0||state.damageGrace>0||state.dead)return;
 dmg*=BOSS_DAMAGE_SCALE;
 if(!unblockable&&input.guard){
   if(state.deflect>0){
     addBossPosture(32,3.4);state.posture=Math.max(0,state.posture-15);state.stamina=Math.min(state.staminaMax,state.stamina+9);state.parryAnim=.28;hitStop(.085);const parryPoint=player.position.clone().lerp(boss.position,.42).add(new THREE.Vector3(0,1.45,0));state.shake=Math.max(state.shake,.24);state.impactFlash=Math.max(state.impactFlash,.46);state.impactFov=Math.min(state.impactFov,-2.1);ensureImpactOverlay();spawnImpactBurst(parryPoint,1.8,true);playImpactSound('heavy',1.7);flash('저스트 튕겨내기',.22);
     if(state.bossPosture>=BOSS_POSTURE_MAX[BOSS_VARIANT]){state.bossStagger=1.42;resetBossPostureAfterBreak(.32);state.bossState='stagger';flash('자세 붕괴',.52)}
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
 }else{state.hp-=dmg;state.posture+=posture;state.stagger=.3;state.damageGrace=.28;hitStop(.038);triggerPlayerHurtImpact(dmg,unblockable)}
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
function hitBoss(base,posture=12,contact=null){
 base*=PLAYER_DAMAGE_SCALE;
 if(BOSS_VARIANT===2){hitBoss2(base,posture,contact);return}
 if(BOSS_VARIANT===3){hitBoss3(base,posture,contact);return}
 if(BOSS_VARIANT===4){hitBoss4(base,posture,contact);return}
 if(BOSS_VARIANT===5){hitBoss5(base,posture,contact);return}
 if(BOSS_VARIANT===6){hitBoss6(base,posture,contact);return}
 if(state.bossHp<=0)return;
 let spikeTarget=null,spikeDist=Infinity;
 const playerHitPoint=player.position.clone().add(new THREE.Vector3(0,1.15,0));
 for(const s of bossSpikeTargets){
   if(s.broken)continue;
   const p=new THREE.Vector3();s.obj.getWorldPosition(p);
   const d=p.distanceTo(playerHitPoint);
   if(d<spikeDist){spikeDist=d;spikeTarget=s}
 }
 const zone=(spikeTarget&&spikeDist<2.25*(BOSS_GIANT_SCALE*.45))?'spike':hitZone();
 let dmg=base,pd=posture;state.reaction=.16;state.reactionZone=zone;
 if(zone==='spike'){
   dmg*=1.12;pd*=2.15;spikeTarget.hp-=base;
   addBossPosture(posture*.45);
   if(spikeTarget.hp<=0&&!spikeTarget.broken){spikeTarget.broken=true;spikeTarget.obj.visible=false;flash('가시 갑각 파괴',.5);addBossPosture(18)}
 }
 if(zone==='head'){dmg*=1.45;pd*=1.7;state.headHp-=base;if(!state.headBroken&&state.headHp<=0){state.headBroken=true;head.material=meat;flash('머리 갑각 파괴',.6);addBossPosture(32)}}
 if(zone==='leg'){state.legHp-=base*.8;if(!state.legBroken&&state.legHp<=0){state.legBroken=true;flash('앞발 부위 파괴',.6);state.bossStagger=1.4;state.bossState='stagger'}}
 if(zone==='tail'){dmg*=1.2;state.tailHp-=base;if(!state.tailBroken&&state.tailHp<=0){state.tailBroken=true;tailPivot.visible=false;flash('꼬리 절단',.7);addBossPosture(24)}}
 if(state.bossStagger>0){dmg*=1.65;pd*=.22}
 state.bossHp=Math.max(0,state.bossHp-dmg);addBossPosture(pd);triggerPlayerHitImpact(contact||player.position.clone().lerp(boss.position,.62).add(new THREE.Vector3(0,zone==='head' ? 2.15 : 1.15,0)),zone);
 if(state.bossHp===0){state.bossState='dead';state.potionPunishQueued=false;setDanger(false);flash('토벌 완료',1.2)}
 else if(state.bossPosture>=BOSS_POSTURE_MAX[1]){state.bossStagger=1.5;resetBossPostureAfterBreak(.32);state.bossState='stagger';flash('자세 붕괴',.52)}
}

function chooseBossAttack(){
 if(state.bossHp<=0)return;
 setDanger(false);
 const dorsal=['arm_cross','arm_double_slam','arm_sweep','arm_uppercut','arm_grab','arm_barrage','arm_guardbreak','arm_crush','spike_triple','spike_fan','bounce_quake'];
 if(state.potionPunishQueued){
   state.bossState=state.potionPunishKind||'spike_triple';
   state.potionPunishQueued=false;
 }else{
   state.bossState=dorsal[Math.floor(Math.random()*dorsal.length)];
 }
 state.bossTimer={
   arm_cross:1.26,arm_double_slam:1.46,arm_sweep:1.32,arm_uppercut:1.16,
   arm_grab:1.5,arm_barrage:1.92,arm_guardbreak:1.46,arm_crush:1.58,
   spike_triple:1.36,spike_fan:1.42,bounce_quake:3.45
 }[state.bossState];
 state.bossHit=false;state.bossPatternStep=0;state.bossFxStamp='';resetBossSweepTrace();
 state.bossAttackTarget.copy(player.position);state.bossAttackTarget.y=0;state.bossAttackTargetLocked=false;
 if(state.bossState==='arm_grab'||state.bossState==='arm_crush')setDanger(true);
}
function inBossHitWindow(t,from,to){return t<=from&&t>=to}
function bossImpact(range,dmg,posture,unblockable=false){
 if(!state.bossHit&&dist()<range*BOSS_ENGAGE_SCALE){
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
function solveDorsalArmToWorld(arm,targetWorld,alpha=.86){
 if(!arm?.shoulder||!arm?.upperPivot||!arm?.elbow||!arm?.wrist)return;
 for(let i=0;i<3;i++){
   rotateBoneEndToward(arm.elbow,arm.wrist,targetWorld,alpha);
   rotateBoneEndToward(arm.upperPivot,arm.wrist,targetWorld,alpha*.82);
   rotateBoneEndToward(arm.shoulder,arm.wrist,targetWorld,alpha*.38);
 }
}

function slamHandTarget(arm,progress=1){
 const center=state.bossAttackTarget.clone();
 const forward=new THREE.Vector3(Math.sin(boss.rotation.y),0,Math.cos(boss.rotation.y));
 const right=new THREE.Vector3(forward.z,0,-forward.x);
 center.addScaledVector(right,arm.sx*.72);
 const descend=THREE.MathUtils.smoothstep(clamp(progress,0,1),.08,.82);
 center.y=.14+(1-descend)*8.6;
 return center;
}

function spawnArmGroundImpactFx(target,radius){
 const ring=new THREE.Mesh(
   new THREE.RingGeometry(.5,.74,48),
   new THREE.MeshBasicMaterial({color:0xf2d2a3,transparent:true,opacity:.82,depthWrite:false,side:THREE.DoubleSide})
 );
 ring.rotation.x=-Math.PI/2;ring.position.copy(target);ring.position.y=.045;scene.add(ring);
 bossShockwaves.push({ring,life:.5,max:.5,radius:radius*.8});
 spawnDustBurst(target.clone(),1.25);
 state.shake=Math.max(state.shake,.21);
}

function bossGroundTargetImpact(target,radius,dmg,posture,unblockable=false){
 if(state.bossHit)return;
 state.bossHit=true;
 spawnArmGroundImpactFx(target,radius);
 const dx=player.position.x-target.x,dz=player.position.z-target.z;
 if(Math.hypot(dx,dz)>radius)return;
 if(state.invuln>0){flash('회피',.16);return}
 hurtPlayer(dmg,posture,unblockable);
}

function wristsReachedSlamTarget(radius=1.35){
 let close=0;
 for(const arm of dorsalArms){
   const wrist=new THREE.Vector3();arm.wrist.getWorldPosition(wrist);
   const t=slamHandTarget(arm,1);t.y=.14;
   if(wrist.distanceTo(t)<=radius)close++;
 }
 return close===dorsalArms.length;
}

const bossSweepPrevWrist=[new THREE.Vector3(),new THREE.Vector3()];
const bossSweepPrevValid=[false,false];
function resetBossSweepTrace(){
 bossSweepPrevValid[0]=false;bossSweepPrevValid[1]=false;
}
function sweepHandTarget(arm,progress,doubleSweep=false){
 const center=state.bossAttackTarget.clone();
 center.y=1.05;
 const forward=new THREE.Vector3(Math.sin(boss.rotation.y),0,Math.cos(boss.rotation.y));
 const right=new THREE.Vector3(forward.z,0,-forward.x);
 const p=THREE.MathUtils.smootherstep(clamp(progress,0,1),0,1);
 const span=doubleSweep?5.9:7.2;
 let lateral;
 if(doubleSweep){
   // Both hands start wide and carve through the player's forward space toward the opposite side.
   lateral=arm.sx<0
     ? THREE.MathUtils.lerp(-span,span*.76,p)
     : THREE.MathUtils.lerp(span,-span*.76,p);
 }else{
   // Single-arm sweep crosses the entire frontal lane, not just the boss's immediate side.
   lateral=THREE.MathUtils.lerp(-span,span,p);
 }
 center.addScaledVector(right,lateral);
 // Keep the hand low enough that the forearm visibly cuts through player height.
 center.y+=Math.sin(p*Math.PI)*.42;
 return center;
}
function bossSweptArmImpact(indices,radius,dmg,posture,unblockable=false){
 if(state.bossHit)return;
 const ids=Array.isArray(indices)?indices:[indices];
 const pp=player.position.clone();pp.y+=1.0;
 const hitRadius=radius*BOSS_ARM_RADIUS_SCALE;
 let touched=false;
 for(const i of ids){
   const elbow=new THREE.Vector3(),wrist=new THREE.Vector3();
   dorsalArms[i].elbow.getWorldPosition(elbow);
   dorsalArms[i].wrist.getWorldPosition(wrist);

   // Visible forearm contact.
   if(pointSegmentDistance(pp,elbow,wrist)<=hitRadius)touched=true;

   // Swept hand path prevents fast animation from tunnelling through the player between frames.
   if(!touched&&bossSweepPrevValid[i]&&pointSegmentDistance(pp,bossSweepPrevWrist[i],wrist)<=hitRadius*1.08)touched=true;

   bossSweepPrevWrist[i].copy(wrist);
   bossSweepPrevValid[i]=true;
   if(touched)break;
 }
 if(!touched)return;
 state.bossHit=true;
 if(state.invuln>0){state.shake=Math.max(state.shake,.09);flash('회피',.16);return}
 hurtPlayer(dmg,posture,unblockable);
}
function bossArmImpact(indices,radius,dmg,posture,unblockable=false){
 if(state.bossHit)return;
 const ids=Array.isArray(indices)?indices:[indices];
 const pp=player.position.clone();pp.y+=1.0;
 const hitRadius=radius*BOSS_ARM_RADIUS_SCALE;
 let touched=false;
 for(const i of ids){
   const elbow=new THREE.Vector3(),wrist=new THREE.Vector3();
   dorsalArms[i].elbow.getWorldPosition(elbow);
   dorsalArms[i].wrist.getWorldPosition(wrist);
   if(pointSegmentDistance(pp,elbow,wrist)<=hitRadius||wrist.distanceTo(pp)<=hitRadius*1.12){touched=true;break}
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

 if((st==='spike_triple'||st==='spike_fan')&&t>.62){
   L(body.rotation,'x',-.12,9);L(chest.rotation,'x',-.18,10);L(head.rotation,'x',.08,9);
 }
 // Dorsal-arm attacks: every wind-up has a distinct silhouette.
 else if(st==='arm_cross'&&t>.56){
   // Double sweep wind-up: both arms spread extremely wide before carving across the entire front.
   dorsalArms[0].shoulder.rotation.y=THREE.MathUtils.lerp(dorsalArms[0].shoulder.rotation.y,-1.42,1-Math.exp(-dt*11));
   dorsalArms[1].shoulder.rotation.y=THREE.MathUtils.lerp(dorsalArms[1].shoulder.rotation.y,1.42,1-Math.exp(-dt*11));
   dorsalArms[0].upperPivot.rotation.z=THREE.MathUtils.lerp(dorsalArms[0].upperPivot.rotation.z,-1.28,1-Math.exp(-dt*13));
   dorsalArms[1].upperPivot.rotation.z=THREE.MathUtils.lerp(dorsalArms[1].upperPivot.rotation.z,1.28,1-Math.exp(-dt*13));
   dorsalArms[0].elbow.rotation.z=.48;dorsalArms[1].elbow.rotation.z=-.48;
   L(body.rotation,'x',-.12,10);L(chest.rotation,'x',-.16,10);L(head.rotation,'x',.08,9);
 }else if(st==='arm_double_slam'&&t>.46){
   // Both arms visibly tower over the shell.
   for(const a of dorsalArms){a.shoulder.rotation.x=THREE.MathUtils.lerp(a.shoulder.rotation.x,-1.42,1-Math.exp(-dt*11));a.upperPivot.rotation.x=THREE.MathUtils.lerp(a.upperPivot.rotation.x,-1.68,1-Math.exp(-dt*11));a.elbow.rotation.x=THREE.MathUtils.lerp(a.elbow.rotation.x,-.48,1-Math.exp(-dt*11))}
   body.position.y=THREE.MathUtils.lerp(body.position.y,2.5,1-Math.exp(-dt*8));L(chest.rotation,'x',.3,9);L(head.rotation,'x',-.14,9);
 }else if(st==='arm_sweep'&&t>.62){
   // One-arm sweep wind-up: left arm winds far behind the torso before crossing the player's whole lane.
   L(body.rotation,'y',-.86,10);
   dorsalArms[0].shoulder.rotation.y=THREE.MathUtils.lerp(dorsalArms[0].shoulder.rotation.y,-1.92,1-Math.exp(-dt*12));
   dorsalArms[0].upperPivot.rotation.z=THREE.MathUtils.lerp(dorsalArms[0].upperPivot.rotation.z,-1.12,1-Math.exp(-dt*13));
   dorsalArms[0].elbow.rotation.z=THREE.MathUtils.lerp(dorsalArms[0].elbow.rotation.z,.7,1-Math.exp(-dt*13));
   dorsalArms[1].shoulder.rotation.y=THREE.MathUtils.lerp(dorsalArms[1].shoulder.rotation.y,.36,1-Math.exp(-dt*9));
   L(chest.rotation,'z',-.34,11);L(head.rotation,'z',.18,10);
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
 arm_cross:.72,arm_double_slam:.82,arm_sweep:.78,arm_uppercut:.62,
 arm_grab:.88,arm_barrage:1.62,arm_guardbreak:.82,arm_crush:.92
};
const BOSS_AIM_RANGE={
 arm_cross:4.15,arm_double_slam:3.85,arm_sweep:4.55,arm_uppercut:3.65,
 arm_grab:3.45,arm_barrage:3.85,arm_guardbreak:3.8,arm_crush:3.6
};
function animateBoss1QuadrupedWalk(dt,moving){
 const phase=state.time*(state.legBroken?2.7:3.8);
 const g=Math.sin(phase),lift=Math.abs(Math.cos(phase));
 const upperIdx=[0,2,4,6],lowerIdx=[1,3,5,7];
 // Diagonal pairs move together: LF+RR / RF+LR.
 const signs=[1,-1,-1,1];
 for(let j=0;j<4;j++){
  const upper=legs[upperIdx[j]],lower=legs[lowerIdx[j]];
  if(!upper||!lower)continue;
  const step=moving?g*signs[j]*(state.legBroken?.18:.3):0;
  const knee=moving?Math.max(0,-g*signs[j])*(state.legBroken?.16:.28):0;
  upper.rotation.x=THREE.MathUtils.lerp(upper.rotation.x,step,1-Math.exp(-dt*10));
  lower.rotation.x=THREE.MathUtils.lerp(lower.rotation.x,knee,1-Math.exp(-dt*11));
 }
 const sway=moving?g*.025:0,bob=moving?lift*.025:0;
 body.rotation.y=THREE.MathUtils.lerp(body.rotation.y,sway,1-Math.exp(-dt*8));
 body.position.y=THREE.MathUtils.lerp(body.position.y,BOSS_REST.bodyY+bob,1-Math.exp(-dt*10));
 backShell.rotation.z=THREE.MathUtils.lerp(backShell.rotation.z,-sway*.8,1-Math.exp(-dt*8));
 if(animeHeadPivot){
  animeHeadPivot.rotation.z=THREE.MathUtils.lerp(animeHeadPivot.rotation.z,-sway*.42,1-Math.exp(-dt*7));
 }
}
function updateBoss(dt){
 if(BOSS_VARIANT===2){updateBoss2(dt);return}
 if(BOSS_VARIANT===3){updateBoss3(dt);return}
 if(BOSS_VARIANT===4){updateBoss4(dt);return}
 if(BOSS_VARIANT===5){updateBoss5(dt);return}
 if(BOSS_VARIANT===6){updateBoss6(dt);return}
 bossRim.position.set(boss.position.x,boss.position.y+8,boss.position.z-9);
 const bossMotionDt=state.bossState?.startsWith?.('arm_')?dt/bossAttackScale(state.bossState):dt;
 if(state.bossHp<=0)setBossVisualAction('dead');
 else if(state.bossState==='idle')setBossVisualAction(dist()>4.2*BOSS_ENGAGE_SCALE?'walk':'idle');
 else if(state.bossStagger>0)setBossVisualAction('idle');
 else setBossVisualAction('attack');
 animateBossTelegraph(bossMotionDt);updateBossWarningGlow();animateGiantessPresence(bossMotionDt);updateBossMonsterArmVisuals();
 if(['arm_double_slam','arm_guardbreak','arm_cross','arm_sweep'].includes(state.bossState)){
   const lockAt={
     arm_double_slam:.62,
     arm_guardbreak:.54,
     arm_cross:.62,
     arm_sweep:.68
   }[state.bossState];
   if(!state.bossAttackTargetLocked){
     state.bossAttackTarget.copy(player.position);state.bossAttackTarget.y=0;
     if(state.bossTimer<=lockAt){
       state.bossAttackTargetLocked=true;
       resetBossSweepTrace();
     }
   }
 }else{
   state.bossAttackTargetLocked=false;
 }
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
 if(state.bossState==='idle'&&state.bossTimer<=.58)boss.rotation.y=lerpAngle(boss.rotation.y,face,1-Math.exp(-dt*5));
 else if(state.bossState==='spike_triple'||state.bossState==='spike_fan'||state.bossState==='bounce_quake'){
   if(state.bossTimer>.58)boss.rotation.y=lerpAngle(boss.rotation.y,face,1-Math.exp(-dt*5.5));
 }else if(state.bossState.startsWith('arm_')){
   const cutoff=BOSS_AIM_CUTOFF[state.bossState]??0;
   if(state.bossTimer>cutoff){
     boss.rotation.y=THREE.MathUtils.lerp(boss.rotation.y,face,1-Math.exp(-bossMotionDt*4.2));
     const targetRange=(BOSS_AIM_RANGE[state.bossState]??3.2)*BOSS_ENGAGE_SCALE;
     if(d>targetRange+.45)boss.position.addScaledVector(dir,bossMotionDt*Math.min(3.0,(d-targetRange)*1.25));
   }
 }
 if(state.bossState==='idle'){
   state.bossTimer-=dt;
   const recoveryWindow=state.bossTimer>.58;
   const walking=!recoveryWindow&&(d>4.45*BOSS_ENGAGE_SCALE||d<2.35*BOSS_ENGAGE_SCALE);
   if(!recoveryWindow){
     if(d>4.45*BOSS_ENGAGE_SCALE)boss.position.addScaledVector(dir,dt*(state.legBroken?2.0:2.8));
     else if(d<2.35*BOSS_ENGAGE_SCALE)boss.position.addScaledVector(dir,-dt*.42);
   }else{
     // Vordt/Aldrich-style punish window: boss commits and briefly stays put.
     boss.rotation.y=lerpAngle(boss.rotation.y,face,1-Math.exp(-dt*1.4));
   }
   animateBoss1QuadrupedWalk(dt,walking);
   head.rotation.x=Math.sin(state.time*2.2)*.05;tailPivot.rotation.y=Math.sin(state.time*2.8)*.24;resetDorsalArms(Math.min(1,dt*8));dorsalArms[0].shoulder.rotation.z+=Math.sin(state.time*1.8)*.035;dorsalArms[1].shoulder.rotation.z-=Math.sin(state.time*1.8)*.035;
   if(state.bossTimer<=0)chooseBossAttack();return;
 }
 animateBoss1QuadrupedWalk(dt,false);
 state.bossTimer-=bossMotionDt;
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
   if(state.bossTimer<=0){legs[0].rotation.z=legs[2].rotation.z=0;body.rotation.z=0;state.bossState='idle';state.bossTimer=1.1}
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
   if(state.bossTimer<=.56){
     const p=clamp(1-state.bossTimer/.56,0,1);
     for(const a of dorsalArms){
       const target=sweepHandTarget(a,p,true);
       solveDorsalArmToWorld(a,target,.93);
       spawnArmTrail(a,1.3);
     }
     // Long active band: the two forearms sweep a broad frontal zone, but only visible limb paths can hit.
     if(p>=.16&&p<=.9)bossSweptArmImpact([0,1],1.42,28,34,false);
   }
   if(state.bossTimer<=0){resetBossSweepTrace();resetDorsalArms(1);state.bossState='idle';state.bossTimer=1.18}
 }else if(state.bossState==='arm_double_slam'){
   if(state.bossTimer<=.46){
     const p=clamp(1-state.bossTimer/.46,0,1);
     for(const a of dorsalArms){
       const target=slamHandTarget(a,p);
       solveDorsalArmToWorld(a,target,.94);
       spawnArmTrail(a,1.28);
     }
     if(inBossHitWindow(state.bossTimer,.19,.08)&&wristsReachedSlamTarget(1.7)){
       bossFxOnce('double-slam',()=>{
         const hit=state.bossAttackTarget.clone();hit.y=0;
         bossGroundTargetImpact(hit,2.35,36,48,false);
         state.bossBustImpulse=Math.max(state.bossBustImpulse,.7);
       });
     }
   }
   if(state.bossTimer<=0){resetDorsalArms(1);state.bossState='idle';state.bossTimer=1.35}
 }else if(state.bossState==='arm_sweep'){
   if(state.bossTimer<=.62){
     const p=clamp(1-state.bossTimer/.62,0,1),a=dorsalArms[0];
     const target=sweepHandTarget(a,p,false);
     solveDorsalArmToWorld(a,target,.95);
     // Counter-arm stays opened so the silhouette reads as one deliberate massive swing.
     dorsalArms[1].shoulder.rotation.y=.32-Math.sin(p*Math.PI)*.28;
     body.rotation.y=-.42+THREE.MathUtils.smoothstep(p,.18,.82)*.84;
     spawnArmTrail(a,1.42);
     if(p>=.12&&p<=.92)bossSweptArmImpact(0,1.5,32,39,false);
   }
   if(state.bossTimer<=0){resetBossSweepTrace();resetDorsalArms(1);body.rotation.y=0;state.bossState='idle';state.bossTimer=1.22}
 }else if(state.bossState==='arm_uppercut'){
   if(state.bossTimer<=.36){
     const p=clamp(1-state.bossTimer/.36,0,1),e=Math.sin(p*Math.PI*.86);
     const a=dorsalArms[1];a.shoulder.rotation.z=-1.55+e*2.7;a.elbow.rotation.z=-1.6+e*2.35;a.wrist.rotation.x=.55-e*.85;
     body.rotation.z=-.24+e*.34;spawnArmTrail(a,1.3);
     if(inBossHitWindow(state.bossTimer,.2,.12))bossArmImpact(1,1.45,30,42,false);
   }
   if(state.bossTimer<=0){resetDorsalArms(1);body.rotation.z=0;state.bossState='idle';state.bossTimer=1.1}
 }else if(state.bossState==='arm_grab'){
   if(state.bossTimer<=.4){
     const p=clamp(1-state.bossTimer/.4,0,1),e=Math.sin(p*Math.PI*.82);
     const a=dorsalArms[0];a.shoulder.rotation.x=-.72+e*.92;a.shoulder.rotation.y=-1.48+e*1.5;a.elbow.rotation.z=1.55-e*1.2;a.wrist.rotation.y=-.7+e*.85;
     spawnArmTrail(a,1.15);
     if(inBossHitWindow(state.bossTimer,.22,.13))bossArmImpact(0,1.48,42,58,true);
   }
   if(state.bossTimer<=0){setDanger(false);resetDorsalArms(1);state.bossState='idle';state.bossTimer=1.32}
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
   if(state.bossTimer<=0){resetDorsalArms(1);state.bossState='idle';state.bossTimer=1.22}
 }else if(state.bossState==='arm_guardbreak'){
   if(state.bossTimer<=.38){
     const p=clamp(1-state.bossTimer/.38,0,1);
     for(const a of dorsalArms){
       const target=slamHandTarget(a,p);
       solveDorsalArmToWorld(a,target,.96);
       spawnArmTrail(a,1.38);
     }
     if(inBossHitWindow(state.bossTimer,.16,.055)&&wristsReachedSlamTarget(1.65)){
       bossFxOnce('guardbreak',()=>{
         const hit=state.bossAttackTarget.clone();hit.y=0;
         bossGroundTargetImpact(hit,1.95,22,72,false);
       });
     }
   }
   if(state.bossTimer<=0){resetDorsalArms(1);state.bossState='idle';state.bossTimer=1.32}
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
   if(state.bossTimer<=0){setDanger(false);resetDorsalArms(1);state.bossState='idle';state.bossTimer=1.48}
 }else if(state.bossState==='bounce_quake'){
   const total=3.45,elapsed=total-state.bossTimer;
   if(elapsed<.24){
     boss.position.y=THREE.MathUtils.lerp(boss.position.y,0,1-Math.exp(-dt*12));
   }else{
     const cycle=clamp((elapsed-.24)/.9,0,2.999);
     const jumpIndex=Math.floor(cycle),local=cycle-jumpIndex;
     const air=Math.sin(local*Math.PI);
     boss.position.y=air*1.45*BOSS_ENGAGE_SCALE;

     // Slight forward drift on each leap; committed landing creates the punishable shockwave.
     if(local<.58){
       const leapDir=flatDir(boss.position,player.position);
       boss.position.addScaledVector(leapDir,dt*(1.25+.25*jumpIndex));
     }
     if(local>=.78&&state.bossPatternStep===jumpIndex){
       spawnBossShockwave(4.6+.35*jumpIndex,22+2*jumpIndex);
       state.bossPatternStep++;
     }
   }
   if(state.bossTimer<=0){
     boss.position.y=0;
     state.bossState='idle';
     state.bossTimer=1.45;
     state.bossPatternStep=0;
   }
 }else if(state.bossState==='spike_triple'){
   // Three discrete shots: readable, rollable, and ideal for punishing a flask at range.
   const shots=[
     {step:0,t:.96,angle:0},
     {step:1,t:.64,angle:-.055},
     {step:2,t:.32,angle:.055}
   ];
   for(const s of shots){
     if(state.bossPatternStep===s.step&&state.bossTimer<=s.t){
       fireSpikeAtPlayer(s.angle,12.4,18);
       spawnSparks(bossSpikeMuzzle(),9,3.2);
       state.bossPatternStep++;
     }
   }
   if(state.bossTimer<=0){state.bossState='idle';state.bossTimer=1.0;state.bossPatternStep=0}
 }else if(state.bossState==='spike_fan'){
   // Wide seven-spike fan denies straight backpedaling but leaves gaps to roll through.
   if(state.bossPatternStep===0&&state.bossTimer<=.72){
     fireSpikeFan();
     state.bossPatternStep=1;
   }
   if(state.bossTimer<=0){state.bossState='idle';state.bossTimer=1.18;state.bossPatternStep=0}
 }else if(state.bossState==='peril'){
   // red perilous pounce: cannot be guarded/deflected; lateral roll is the intended answer.
   head.rotation.x=-.55;body.rotation.x=.12;
   if(state.bossTimer<.44){bossFxOnce('peril-launch',()=>spawnDustBurst(bossGroundPoint(-.8),.85));boss.position.addScaledVector(dir,dt*10.5);bossImpact(3.25,43,60,true)}
   if(state.bossTimer<=0){setDanger(false);head.rotation.x=0;body.rotation.x=0;state.bossState='idle';state.bossTimer=1.32}
 }
}

function applyWeaponAttackPose(w,step,p){
 const t=clamp(p,0,1),s=Math.sin(t*Math.PI),profile=playerAttackProfile(w.id,step),impact=Math.sin(clamp((t-profile.active[0])/(profile.active[1]-profile.active[0]),0,1)*Math.PI);
 const side=step===2?-1:1;weaponPivot.position.set(0,0,0);
 if(state.attackStrong){
   if(w.id==='straight')weaponPivot.rotation.set(-.1+.12*s,.14*impact,-.22*impact);
   else if(w.id==='greatsword')weaponPivot.rotation.set(-.26+.18*s,.02*impact,-.06*impact);
   else if(w.id==='hammer')weaponPivot.rotation.set(-.3+.12*s,-.08*impact,.08*impact);
   else if(w.id==='spear')weaponPivot.rotation.set(-.015,0,0);
   else if(w.id==='katana')weaponPivot.rotation.set(-.16+.06*s,.16*impact,-.28*impact);
   else weaponPivot.rotation.set(-.22+.12*s,.05*impact,-.16*impact);
 }else{
   // Small wrist/edge-alignment offsets. The arm IK supplies the main path, so the weapon never disconnects from the palm.
   if(w.id==='straight')weaponPivot.rotation.set(-.08+.1*s,side*.08*impact,-side*.16*impact);
   else if(w.id==='greatsword')weaponPivot.rotation.set(-.18+.14*s,side*.05*impact,-side*.1*impact);
   else if(w.id==='hammer')weaponPivot.rotation.set(-.24+.08*s,side*.025*impact,-side*.045*impact);
   else if(w.id==='spear')weaponPivot.rotation.set(-.025,side*.015*impact,side*.018*impact);
   else if(w.id==='katana')weaponPivot.rotation.set(-.14+.08*s,side*.11*impact,-side*.22*impact);
   else weaponPivot.rotation.set(-.17+.1*s,side*.06*impact,-side*.13*impact);
 }
 weaponPivot.scale.setScalar(twoHanded?1.06:1);
}
function updatePlayer(dt){
 if(state.potionTimer>0){
   state.potionTimer=Math.max(0,state.potionTimer-dt);
   if(!state.potionHealDone&&state.potionTimer<=.42){
     state.potionHealDone=true;
     state.hp=Math.min(state.hpMax,state.hp+POTION_HEAL);
     spawnSparks(player.position.clone().add(new THREE.Vector3(0,1.1,0)),10,2.4);
     flash(`회복 +${POTION_HEAL} · 포션 ${state.potions}/3`,.45);
   }
 }
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
   const regenRate=state.stamina<32?30:38;
   state.stamina=Math.min(state.staminaMax,state.stamina+dt*regenRate);
 }
 state.posture=Math.max(0,state.posture-dt*(input.guard?5:14));
 state.bossPostureGrace=Math.max(0,state.bossPostureGrace-dt);if(state.bossPostureGrace<=0&&state.bossStagger<=0)state.bossPosture=Math.max(0,state.bossPosture-dt*(state.bossState==='idle'?26:16));
 state.invuln=Math.max(0,state.invuln-dt);state.damageGrace=Math.max(0,state.damageGrace-dt);state.deflect=Math.max(0,state.deflect-dt);state.parryAnim=Math.max(0,state.parryAnim-dt);state.stagger=Math.max(0,state.stagger-dt);state.comboGrace=Math.max(0,state.comboGrace-dt);
 state.guardBlend=THREE.MathUtils.lerp(state.guardBlend,input.guard?1:0,1-Math.exp(-dt*18));
 if(state.attack>0){
   const w=currentWeapon(),gripDamage=twoHanded?1.16:1,gripPosture=twoHanded?1.2:1;
   const profile=playerAttackProfile(w.id,state.attackStep),step=state.attackStep;
   state.attack-=dt;const p=playerAttackProgress();
   applyWeaponAttackPose(w,step,p);
   if(p>=profile.active[0]&&p<=profile.active[1]){
     const forward=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));
     player.position.addScaledVector(forward,dt*profile.drive);
   }
   // Physical damage is resolved after the animated weapon transform updates.
   if(state.attack<=0){
     weaponPivot.rotation.set(0,0,0);weaponPivot.position.set(0,0,0);applyWeaponGrip();player.rotation.x=0;player.rotation.z=0;playerBody.rotation.set(0,0,0);
     if(state.attackStrong){state.attackStrong=false;state.attackStep=0;state.attackQueued=false;state.comboGrace=0}
     else if(state.attackQueued&&step<3)startAttack(step+1,false);else if(!state.attackQueued&&state.comboGrace<=0)state.attackStep=0;
   }
 }
 const toBoss=flatDir(player.position,boss.position);
 if(input.lock&&!state.rolling)player.rotation.y=lerpAngle(player.rotation.y,Math.atan2(toBoss.x,toBoss.z),1-Math.exp(-dt*12));
 else if(!input.lock&&!state.rolling)player.rotation.y=lerpAngle(player.rotation.y,input.camYaw,1-Math.exp(-dt*13));
 if(state.rolling>0){
   state.rollElapsed=Math.min(ROLL_DURATION,state.rollElapsed+dt);
   const p=clamp(state.rollElapsed/ROLL_DURATION,0,1);
   state.rolling=Math.max(0,ROLL_DURATION-state.rollElapsed);
   state.invuln=(p>=ROLL_IFRAME_START&&p<=ROLL_IFRAME_END)?Math.max(state.invuln,.055):0;
   const speed=6.9-2.2*motionSmooth(.55,1,p);
   player.position.addScaledVector(state.rollDir,dt*speed);
   player.rotation.x=0;
   player.rotation.z=Math.sin(p*Math.PI*2)*.035;
   if(state.rolling<=0){
     player.rotation.x=0;player.rotation.z=0;playerVrmMotion.rotation.set(0,0,0);playerVrmMotion.position.set(0,playerVrmMotionRest.y,0);
     spawnDustBurst(player.position.clone(),.26);
   }
   return;
 }
 if(state.stagger>0||state.attack>.18||state.potionTimer>0)return;
 const {x,z}=getMoveAxes();
 if(x||z){
   const right=new THREE.Vector3(-toBoss.z,0,toBoss.x),move=new THREE.Vector3();
   if(input.lock){
     move.addScaledVector(toBoss,z).addScaledVector(right,x).normalize();
   }else{
     const forward=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));
     const strafe=new THREE.Vector3(-forward.z,0,forward.x);
     move.addScaledVector(forward,z).addScaledVector(strafe,x).normalize();
   }
   const sprint=(input.keys.has('ShiftLeft')||input.keys.has('ShiftRight'))&&state.stamina>0&&state.exhausted<=0;
   player.position.addScaledVector(move,dt*(sprint?6.15:3.8));
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
     }else{
       weaponPivot.rotation.x=THREE.MathUtils.lerp(weaponPivot.rotation.x,-.18,1-Math.exp(-dt*20));
       weaponPivot.rotation.y=THREE.MathUtils.lerp(weaponPivot.rotation.y,-.15,1-Math.exp(-dt*20));
       weaponPivot.rotation.z=THREE.MathUtils.lerp(weaponPivot.rotation.z,.22,1-Math.exp(-dt*20));
     }
     playerBody.rotation.x=THREE.MathUtils.lerp(playerBody.rotation.x,-.09*state.guardBlend,1-Math.exp(-dt*18));
     playerBody.rotation.z=THREE.MathUtils.lerp(playerBody.rotation.z,-.06*state.guardBlend,1-Math.exp(-dt*18));
   }else{
     swordPivot.rotation.x=THREE.MathUtils.lerp(swordPivot.rotation.x,0,1-Math.exp(-dt*16));
     swordPivot.rotation.y=THREE.MathUtils.lerp(swordPivot.rotation.y,0,1-Math.exp(-dt*16));
     swordPivot.rotation.z=THREE.MathUtils.lerp(swordPivot.rotation.z,0,1-Math.exp(-dt*16));
     playerBody.rotation.x=THREE.MathUtils.lerp(playerBody.rotation.x,0,1-Math.exp(-dt*16));
     playerBody.rotation.z=THREE.MathUtils.lerp(playerBody.rotation.z,0,1-Math.exp(-dt*16));
   }
 }
}

const camPos=new THREE.Vector3(),camLook=new THREE.Vector3();
function updateLockMarker(){
 if(!ui.lockDot)return;
 const show=input.lock&&state.bossHp>0;
 if(!show){ui.lockDot.classList.remove('on');return}
 const lockY=BOSS_VARIANT===1?4.35*BOSS_GIANT_SCALE:1.85;
 const p=boss.position.clone().add(new THREE.Vector3(0,lockY,.15)).project(camera);
 const visible=p.z>-1&&p.z<1&&Math.abs(p.x)<1.15&&Math.abs(p.y)<1.15;
 if(!visible){ui.lockDot.classList.remove('on');return}
 ui.lockDot.style.left=((p.x*.5+.5)*innerWidth)+'px';
 ui.lockDot.style.top=((-p.y*.5+.5)*innerHeight)+'px';
 ui.lockDot.classList.add('on');
}
function updateCamera(dt){
 const target=player.position.clone().add(new THREE.Vector3(0,PLAYER_VISUAL_HEIGHT*.53,0));
 let desiredPos=new THREE.Vector3(),desiredLook=new THREE.Vector3();
 let wantedFov=52;

 if(input.lock){
   const d=dist(),armAttack=BOSS_VARIANT===1&&state.bossState.startsWith('arm_'),giant=BOSS_VARIANT===1;
   const toBoss=flatDir(player.position,boss.position);
   const right=new THREE.Vector3(toBoss.z,0,-toBoss.x);
   const backDist=giant
     ? clamp(7.35+d*.22,8.1,12.5)+(armAttack?.62:0)
     : clamp(5.55+d*.16,6.35,9.6);
   const height=giant
     ? 2.55+clamp(d*.075,.22,1.55)+(armAttack?.28:0)
     : 1.88+clamp(d*.055,.14,.82);
   const sideOffset=giant?.4:.58;
   desiredPos.copy(target).addScaledVector(toBoss,-backDist).addScaledVector(right,sideOffset).add(new THREE.Vector3(0,height,0));
   const bossFocus=boss.position.clone().add(new THREE.Vector3(0,giant?3.85*BOSS_GIANT_SCALE:1.62,0));
   const focusWeight=giant?clamp(.48+d*.009,.48,.61):clamp(.52+d*.008,.52,.62);
   desiredLook.copy(target).lerp(bossFocus,focusWeight);
   wantedFov=giant?(armAttack?60:56):53;
 }else{
   const f=new THREE.Vector3(Math.sin(input.camYaw),0,Math.cos(input.camYaw)).normalize();
   const right=new THREE.Vector3(f.z,0,-f.x);
   const backDist=5.15;
   const height=1.58+input.camPitch*1.08;
   desiredPos.copy(target).addScaledVector(f,-backDist).addScaledVector(right,.58).add(new THREE.Vector3(0,height,0));
   desiredLook.copy(target).addScaledVector(f,4.65);
   desiredLook.y+=input.camPitch*3.7+.12;
   wantedFov=input.keys.has('ShiftLeft')||input.keys.has('ShiftRight')?55:52;
 }
 wantedFov+=state.impactFov;

 const posEase=1-Math.exp(-dt*(input.lock?7.6:10.8));
 const lookEase=1-Math.exp(-dt*(input.lock?9.0:13.5));
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
 camera.lookAt(camLook);if(Math.abs(state.impactRoll)>.0001)camera.rotateZ(state.impactRoll);
 updateLockMarker();
}
function partText(v,broken,label,max=100){return broken?label:(v<max*.45?'손상':'정상')}
function updateUI(){
 ui.hp.style.width=(clamp(state.hp,0,state.hpMax)/state.hpMax*100)+'%';if(hpLabel)hpLabel.textContent=`HP ${Math.ceil(state.hp)} / ${state.hpMax}`;if(ui.stamina){ui.stamina.style.width=(clamp(state.stamina,0,state.staminaMax)/state.staminaMax*100)+'%';ui.stamina.parentElement.classList.toggle('exhausted',state.exhausted>0)}if(staminaLabel)staminaLabel.textContent=`STAMINA ${Math.ceil(state.stamina)} / ${state.staminaMax}`;ui.posture.style.width=clamp(state.posture,0,100)+'%';ui.bossHp.style.width=(clamp(state.bossHp,0,state.bossMaxHp)/state.bossMaxHp*100)+'%';ui.bossPosture.style.width=(clamp(state.bossPosture,0,BOSS_POSTURE_MAX[BOSS_VARIANT])/BOSS_POSTURE_MAX[BOSS_VARIANT]*100)+'%';
 if(BOSS_VARIANT===2){if(ui.parts)ui.parts.textContent=state.boss2Phase===2?'2페이즈 · 잿불 각성 · 완성형 전투':'1페이즈 · '+({sword:'검',spear:'창',mage:'술법',frenzy:'광전'}[state.boss2Style]||'검')+' 형상';}else if(BOSS_VARIANT===3){if(ui.parts)ui.parts.textContent=state.boss3Phase===2?'2페이즈 · 혈화 개화 · 회복 검무':'1페이즈 · 검격 적중 시 체력 회복';}else if(BOSS_VARIANT===4){if(ui.parts)ui.parts.textContent='검성 패턴 · 발도 / 환영검무 / 맹룡단공참';}else if(BOSS_VARIANT===5){if(ui.parts)ui.parts.textContent=state.boss5Phase===2?'2페이즈 · 투신 각성 · 도끼+체술 연계':'1페이즈 · 대형 도끼 / 숄더 / 킥 / 도약';}else if(BOSS_VARIANT===6){if(ui.parts)ui.parts.textContent=state.boss6Phase===2?'2페이즈 · 악으로 깡으로 · 전탄발사':'1페이즈 · 기합포 / 수류탄 / 해병짜장 / 오도봉고 / 지원사격';}else{ui.head.textContent=partText(state.headHp,state.headBroken,'파괴',BOSS1_PART_HP.head);ui.leg.textContent=partText(state.legHp,state.legBroken,'파괴',BOSS1_PART_HP.leg);if(ui.spike){const alive=bossSpikeTargets.filter(s=>!s.broken).length,total=bossSpikeTargets.length;ui.spike.textContent=total?(alive?`${alive}/${total}`:'전부 파괴'):'로딩';}ui.tail.textContent=partText(state.tailHp,state.tailBroken,'절단',BOSS1_PART_HP.tail);}if(ui.weapon)ui.weapon.textContent=`${weaponIndex+1}. ${currentWeapon().name} · ${twoHanded?'양손/무기 가드':'한손/방패 가드'}`;
 potionHud.textContent=`R · 포션 ${state.potions}/3`;
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
let soulhuntRuntimeErrorShown=false;
function reportSoulhuntRuntimeError(err){
 console.error('Soulhunt runtime error:',err);
 if(soulhuntRuntimeErrorShown)return;
 soulhuntRuntimeErrorShown=true;
 const box=document.createElement('div');
 box.id='runtimeError';
 box.style.cssText='position:fixed;right:14px;bottom:14px;z-index:99;max-width:520px;padding:10px 12px;background:#2a0808e8;border:1px solid #b95b4b;color:#ffd9d1;font:12px/1.45 monospace;pointer-events:none';
 box.textContent='전투 로직 오류를 복구했습니다: '+(err?.message||String(err));
 document.body.appendChild(box);
 setTimeout(()=>box.remove(),6000);
}
function resolvePlayerBossBodyCollision(){
 if(state.bossHp<=0)return;
 const dx=player.position.x-boss.position.x,dz=player.position.z-boss.position.z;
 let d2=dx*dx+dz*dz;
 const playerR=.52;
 const bossR=BOSS_VARIANT===1?1.85*BOSS_GIANT_SCALE:({2:.64,3:.61,4:.6,5:.68,6:.76}[BOSS_VARIANT]??.64);
 const minD=playerR+bossR;
 if(d2>=minD*minD)return;

 let nx,nz,d;
 if(d2<1e-8){
  nx=Math.sin(player.rotation.y+Math.PI);nz=Math.cos(player.rotation.y+Math.PI);d=0;
 }else{
  d=Math.sqrt(d2);nx=dx/d;nz=dz/d;
 }
 const push=minD-d+.012;
 const giant=BOSS_VARIANT===1;
 const playerShare=giant?1:.76,bossShare=giant?0:.24;
 player.position.x+=nx*push*playerShare;
 player.position.z+=nz*push*playerShare;
 boss.position.x-=nx*push*bossShare;
 boss.position.z-=nz*push*bossShare;
}

function loop(){
 let dt=Math.min(clock.getDelta(),.033);state.time+=dt;
 try{
   if(state.hitstop>0){state.hitstop-=dt;dt=0}else{updatePlayer(dt);updateBoss(dt);resolvePlayerBossBodyCollision()}
 }catch(err){
   reportSoulhuntRuntimeError(err);
   state.hitstop=0;
   if(BOSS_VARIANT===2){state.bossState='idle';state.bossTimer=.8;boss.position.y=0;enforceBoss2Visibility()}
   else if(BOSS_VARIANT===3){state.bossState='idle';state.bossTimer=.8;boss.position.y=0;enforceBoss3Visibility()}
   else if(BOSS_VARIANT===4){state.bossState='idle';state.bossTimer=.8;boss.position.y=0;enforceBoss4Visibility()}
   else if(BOSS_VARIANT===5){state.bossState='idle';state.bossTimer=.8;boss.position.y=0;enforceBoss5Visibility()}
   else if(BOSS_VARIANT===6){state.bossState='idle';state.bossTimer=.8;boss.position.y=0;enforceBoss6Visibility()}
 }
 try{
   if(playerMixer)playerMixer.update(Math.max(dt,.001));
   animateVroidPlayer(Math.max(dt,.001));updatePlayerMeleeCollision();updateArmTrails(Math.max(dt,.001));updateDustFX(Math.max(dt,.001));updateSparks(Math.max(dt,.001));updateImpactBursts(Math.max(dt,.001));
   updateBossSpikeProjectiles(Math.max(dt,.001));updateBossShockwaves(Math.max(dt,.001));
 }catch(err){reportSoulhuntRuntimeError(err)}
 try{updateCamera(Math.max(dt,.001));updateUI()}catch(err){reportSoulhuntRuntimeError(err)}
 renderer.render(scene,camera);
 requestAnimationFrame(loop);
}
if(BOSS_VARIANT===2)loadBoss2Avatar();
if(BOSS_VARIANT===3)loadBoss3Avatar();
if(BOSS_VARIANT===4)loadBoss4Avatar();
if(BOSS_VARIANT===5)loadBoss5Avatar();
if(BOSS_VARIANT===6)loadBoss6Avatar();
loop();