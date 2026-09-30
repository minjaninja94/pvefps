import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

const canvas=document.querySelector('#game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x08090a);
scene.fog=new THREE.FogExp2(0x08090a,.03);
const camera=new THREE.PerspectiveCamera(58,1,.1,140);
const clock=new THREE.Clock();
const gltfLoader=new GLTFLoader();

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
 {id:'straight',name:'직검',damage:1.00,posture:1.00,speed:1.00,stamina:1.00,reach:1.00,hitstop:1.00,guard:.58,motion:1.00},
 {id:'greatsword',name:'대검',damage:1.58,posture:1.55,speed:.66,stamina:1.48,reach:1.22,hitstop:1.55,guard:.72,motion:1.35},
 {id:'hammer',name:'해머',damage:1.38,posture:1.92,speed:.59,stamina:1.58,reach:.93,hitstop:1.82,guard:.76,motion:1.52},
 {id:'spear',name:'창',damage:.92,posture:.86,speed:1.08,stamina:.92,reach:1.48,hitstop:.82,guard:.48,motion:.82},
 {id:'katana',name:'태도',damage:1.08,posture:.92,speed:1.18,stamina:.94,reach:1.08,hitstop:.9,guard:.45,motion:.74},
 {id:'axe',name:'전투도끼',damage:1.28,posture:1.36,speed:.78,stamina:1.27,reach:1.02,hitstop:1.32,guard:.65,motion:1.22}
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

// Procedural knight drives all combat poses. Keeping these no-op hooks makes the loop robust.
let playerMixer=null;
function setPlayerVisualAction(){}

const boss=new THREE.Group();scene.add(boss);
const shell=mat(0x3f4548,.58,.47),shellDark=mat(0x262b2e,.48,.62),meat=mat(0x452d28,.02,.88),horn=mat(0x807561,.18,.65);
const body=part(boss,new THREE.SphereGeometry(1.55,16,10),shell,[0,2.05,0],[0,0,0],[1.4,.75,1.7]);
const chest=part(boss,new THREE.SphereGeometry(1.05,14,9),shellDark,[0,1.85,1.55],[0,0,0],[1.25,.9,1.1]);
const head=part(boss,new THREE.SphereGeometry(.78,14,9),shell,[0,2.15,2.55],[0,0,0],[1.05,.82,1.18]);
part(boss,new THREE.ConeGeometry(.16,1.15,8),horn,[-.55,2.72,2.68],[Math.PI/2.3,0,.25]);
part(boss,new THREE.ConeGeometry(.16,1.15,8),horn,[.55,2.72,2.68],[Math.PI/2.3,0,-.25]);
const jaw=part(boss,new THREE.BoxGeometry(1.05,.25,.7),meat,[0,1.62,2.92],[.08,0,0]);
const legs=[];
for(const sx of [-1,1])for(const z of [.95,-.95]){
  const upper=part(boss,new THREE.CapsuleGeometry(.28,1.05,5,8),shell,[sx*1.25,1.25,z],[0,0,sx*.55]);
  const lower=part(boss,new THREE.CapsuleGeometry(.22,.92,5,8),meat,[sx*1.65,.52,z+.12],[0,0,sx*.2]);
  legs.push(upper,lower);
}
const tailPivot=new THREE.Group();tailPivot.position.set(0,1.85,-1.55);boss.add(tailPivot);
const tailA=part(tailPivot,new THREE.CapsuleGeometry(.38,1.35,5,9),shell,[0,0,-.72],[Math.PI/2,0,0]);
const tailB=part(tailPivot,new THREE.CapsuleGeometry(.24,1.45,5,9),shellDark,[0,0,-1.9],[Math.PI/2,0,0]);
const tailTip=part(tailPivot,new THREE.ConeGeometry(.32,1.25,8),horn,[0,0,-3],[Math.PI/2,0,0]);
boss.position.set(0,0,-2);

// CC0 provisional creature visual. Combat logic/hit zones remain our own.
let bossMixer=null,bossActions={},bossActionName='';
const primitiveBossMeshes=[body,chest,head,jaw,...legs,tailA,tailB,tailTip];
gltfLoader.load('https://gobkit.com/freebies/dino/Carnotaurus.glb',gltf=>{
  const visual=gltf.scene;
  visual.scale.setScalar(1.95);
  visual.position.set(0,0,0);
  visual.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  boss.add(visual);
  primitiveBossMeshes.forEach(m=>m.visible=false);
  if(gltf.animations?.length){
    bossMixer=new THREE.AnimationMixer(visual);
    const src=gltf.animations[0], fps=24;
    bossActions.idle=bossMixer.clipAction(THREE.AnimationUtils.subclip(src,'idle',0,30,fps));
    bossActions.attack=bossMixer.clipAction(THREE.AnimationUtils.subclip(src,'attack',30,60,fps));
    bossActions.dead=bossMixer.clipAction(THREE.AnimationUtils.subclip(src,'dead',60,90,fps));
    bossActions.walk=bossMixer.clipAction(THREE.AnimationUtils.subclip(src,'walk',90,120,fps));
    bossActions.dead.setLoop(THREE.LoopOnce,1);bossActions.dead.clampWhenFinished=true;
    bossActionName='idle';bossActions.idle.play();
  }
},undefined,err=>console.warn('CC0 boss model load failed; using procedural fallback.',err));

function setBossVisualAction(name){
 if(!bossMixer||!bossActions[name]||bossActionName===name)return;
 const prev=bossActions[bossActionName],next=bossActions[name];
 next.reset().play();
 if(name!=='dead')next.setLoop(THREE.LoopRepeat,Infinity);
 if(prev)prev.crossFadeTo(next,.12,false);
 bossActionName=name;
}

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

const ui={hp:document.querySelector('#hp'),posture:document.querySelector('#posture'),bossHp:document.querySelector('#bossHp'),bossPosture:document.querySelector('#bossPosture'),msg:document.querySelector('#message'),danger:document.querySelector('#danger'),head:document.querySelector('#headPart'),leg:document.querySelector('#legPart'),tail:document.querySelector('#tailPart'),weapon:document.querySelector('#weaponHud')};
const state={
 hp:100,posture:0,stamina:100,attack:0,attackHit:false,attackStep:0,attackQueued:false,comboGrace:0,rolling:0,rollDir:new THREE.Vector3(),invuln:0,deflect:0,parryAnim:0,guardBlend:0,stagger:0,dead:false,
 bossHp:560,bossPosture:0,bossState:'idle',bossTimer:1.0,bossHit:false,bossStagger:0,time:0,shake:0,hitstop:0,
 headHp:100,legHp:150,tailHp:130,tailBroken:false,legBroken:false,headBroken:false,danger:false,reaction:0,reactionZone:'body'
};
function flash(t,d=.35){ui.msg.textContent=t;ui.msg.style.opacity='1';clearTimeout(flash.t);flash.t=setTimeout(()=>ui.msg.style.opacity='0',d*1000)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function flatDir(a,b){const d=new THREE.Vector3().subVectors(b,a);d.y=0;return d.lengthSq()?d.normalize():d.set(0,0,-1)}
function dist(){return player.position.distanceTo(boss.position)}
function setDanger(v){state.danger=v;ui.danger.classList.toggle('on',v)}
function hitStop(sec){state.hitstop=Math.max(state.hitstop,sec)}
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
 if(state.dead||state.rolling>0||state.attack>0||state.stagger>0||state.stamina<24)return;
 const {x,z}=getMoveAxes();
 const toBoss=flatDir(player.position,boss.position);
 const right=new THREE.Vector3(toBoss.z,0,-toBoss.x);
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
 state.stamina-=24;state.rolling=.5;state.invuln=.29;
 player.rotation.y=Math.atan2(state.rollDir.x,state.rollDir.z);
}
function startAttack(step){
 const w=currentWeapon(), grip=twoHanded?1.08:1;
 const cost=[0,16,18,23][step]*w.stamina*grip;
 if(state.stamina<cost)return false;
 state.stamina-=cost;state.attackStep=step;
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
function tryDeflect(){if(!state.dead&&state.stagger<=0){state.deflect=.17;state.parryAnim=.22}}

function hurtPlayer(dmg,posture=20,unblockable=false){
 if(state.invuln>0||state.dead)return;
 if(!unblockable&&input.guard){
   if(state.deflect>0){
     state.bossPosture+=30;state.posture=Math.max(0,state.posture-15);state.shake=.16;state.parryAnim=.28;hitStop(.055);spawnSparks(player.position.clone().lerp(boss.position,.42).add(new THREE.Vector3(0,1.45,0)),22,7);flash('저스트 튕겨내기',.22);
     if(state.bossPosture>=100){state.bossStagger=2.05;state.bossPosture=48;state.bossState='stagger';flash('자세 붕괴',.52)}
     return;
   }
   const w=currentWeapon();
   const shieldGuard=!twoHanded;
   const absorb=shieldGuard ? .82 : w.guard;
   state.hp-=dmg*(1-absorb);
   state.posture+=posture*(shieldGuard ? .72 : 1.08);
   state.stamina=Math.max(0,state.stamina-(shieldGuard?16:24*w.stamina));
   state.shake=.09;
   flash(shieldGuard?'방패 가드':'무기 가드',.18);
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
 if(r<.28){state.bossState='claw1';state.bossTimer=.62;state.bossHit=false}
 else if(r<.48){state.bossState='bite';state.bossTimer=.82;state.bossHit=false}
 else if(r<.66){state.bossState='slam';state.bossTimer=1.05;state.bossHit=false}
 else if(r<.82&&!state.tailBroken){state.bossState='tail';state.bossTimer=.92;state.bossHit=false}
 else{state.bossState='peril';state.bossTimer=1.12;state.bossHit=false;setDanger(true)}
}
function bossImpact(range,dmg,posture,unblockable=false){
 if(!state.bossHit&&dist()<range){state.bossHit=true;hurtPlayer(dmg,posture,unblockable)}
}
function updateBoss(dt){
 if(state.bossHp<=0)setBossVisualAction('dead');
 else if(state.bossState==='idle')setBossVisualAction(dist()>4.2?'walk':'idle');
 else if(state.bossStagger>0)setBossVisualAction('idle');
 else setBossVisualAction('attack');
 if(state.reaction>0){
   state.reaction=Math.max(0,state.reaction-dt);
   const k=Math.sin((state.reaction/.16)*Math.PI);
   if(state.reactionZone==='head'){head.rotation.z=k*.2;head.position.y=2.15-k*.13}
   if(state.reactionZone==='leg'){body.rotation.z=k*.08;body.position.y=2.05-k*.09}
   if(state.reactionZone==='tail'&&!state.tailBroken){tailPivot.rotation.x=k*.24}
 }else{
   head.rotation.z=THREE.MathUtils.lerp(head.rotation.z,0,dt*14);head.position.y=THREE.MathUtils.lerp(head.position.y,2.15,dt*14);
   body.rotation.z=THREE.MathUtils.lerp(body.rotation.z,0,dt*14);body.position.y=THREE.MathUtils.lerp(body.position.y,2.05,dt*14);
   if(!state.tailBroken)tailPivot.rotation.x=THREE.MathUtils.lerp(tailPivot.rotation.x,0,dt*14);
 }
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
   head.rotation.x=Math.sin(state.time*2.2)*.05;tailPivot.rotation.y=Math.sin(state.time*2.8)*.24;
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
   head.position.z=2.55+Math.sin(p*Math.PI)*.72;jaw.rotation.x=.08+Math.sin(p*Math.PI)*.62;
   if(state.bossTimer<.34)bossImpact(3.35,28,37,false);
   if(state.bossTimer<=0){head.position.z=2.55;jaw.rotation.x=.08;state.bossState='idle';state.bossTimer=.62}
 }else if(state.bossState==='slam'){
   const wind=state.bossTimer>.38;body.position.y=THREE.MathUtils.lerp(body.position.y,wind?2.65:1.68,dt*(wind?5:18));
   if(state.bossTimer<.32)bossImpact(4.0,34,43,false);
   if(state.bossTimer<=0){body.position.y=2.05;state.bossState='idle';state.bossTimer=.85}
 }else if(state.bossState==='tail'){
   const p=1-state.bossTimer/.92;tailPivot.rotation.y=-1.1+Math.sin(clamp(p,0,1)*Math.PI)*2.7;
   if(state.bossTimer<.47)bossImpact(4.65,25,31,false);
   if(state.bossTimer<=0){tailPivot.rotation.y=0;state.bossState='idle';state.bossTimer=.62}
 }else if(state.bossState==='peril'){
   // red perilous pounce: cannot be guarded/deflected; lateral roll is the intended answer.
   head.rotation.x=-.55;body.rotation.x=.12;
   if(state.bossTimer<.44){boss.position.addScaledVector(dir,dt*10.5);bossImpact(3.25,43,60,true)}
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
 if(state.dead){setPlayerVisualAction('dead');return;}
 setPlayerVisualAction(state.attack>0?'attack':'idle');
 state.stamina=Math.min(100,state.stamina+dt*(state.attack||state.rolling?10:29));
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
   const right=new THREE.Vector3(toBoss.z,0,-toBoss.x),move=new THREE.Vector3();
   if(input.lock)move.addScaledVector(toBoss,z).addScaledVector(right,x).normalize();
   else{const basis=getCameraBasis();move.addScaledVector(basis.f,z).addScaledVector(basis.r,x).normalize();}
   const sprint=input.keys.has('ShiftLeft')||input.keys.has('ShiftRight');player.position.addScaledVector(move,dt*(sprint?5.2:3.15));
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
 const target=player.position.clone().add(new THREE.Vector3(0,1.35,0)),toBoss=flatDir(player.position,boss.position),back=input.lock?toBoss.clone().multiplyScalar(-1):new THREE.Vector3(0,0,1);
 camPos.copy(target).addScaledVector(back,6.5).add(new THREE.Vector3(0,3.0,0));camera.position.lerp(camPos,1-Math.exp(-dt*8));
 const look=input.lock?target.clone().lerp(boss.position.clone().add(new THREE.Vector3(0,1.8,0)),.38):target;
 if(state.shake>0){state.shake=Math.max(0,state.shake-dt);camera.position.x+=(Math.random()-.5)*state.shake;camera.position.y+=(Math.random()-.5)*state.shake}
 camera.lookAt(look);
}
function partText(v,broken,label){return broken?label:(v<45?'손상':'정상')}
function updateUI(){
 ui.hp.style.width=clamp(state.hp,0,100)+'%';ui.posture.style.width=clamp(state.posture,0,100)+'%';ui.bossHp.style.width=(state.bossHp/560*100)+'%';ui.bossPosture.style.width=clamp(state.bossPosture,0,100)+'%';
 ui.head.textContent=partText(state.headHp,state.headBroken,'파괴');ui.leg.textContent=partText(state.legHp,state.legBroken,'파괴');ui.tail.textContent=partText(state.tailHp,state.tailBroken,'절단');if(ui.weapon)ui.weapon.textContent=`${weaponIndex+1}. ${currentWeapon().name} · ${twoHanded?'양손/무기 가드':'한손/방패 가드'}`;
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
function loop(){
 let dt=Math.min(clock.getDelta(),.033);state.time+=dt;
 if(state.hitstop>0){state.hitstop-=dt;dt=0}else{updatePlayer(dt);updateBoss(dt)}
 if(bossMixer)bossMixer.update(Math.max(dt,.001));if(playerMixer)playerMixer.update(Math.max(dt,.001));updateSparks(Math.max(dt,.001));updateCamera(Math.max(dt,.001));updateUI();renderer.render(scene,camera);requestAnimationFrame(loop);
}
loop();