import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

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

const steel=mat(0x8e969c,.86,.24),cloth=mat(0x262226,.04,.9),dark=mat(0x34373b,.34,.52);
const player=new THREE.Group();scene.add(player);
part(player,new THREE.CapsuleGeometry(.43,.9,5,8),cloth,[0,1,0]);
part(player,new THREE.SphereGeometry(.34,12,8),dark,[0,1.92,0]);
const swordPivot=new THREE.Group();swordPivot.position.set(.42,1.35,0);player.add(swordPivot);
part(swordPivot,new THREE.BoxGeometry(.12,.12,1.78),steel,[.18,-.05,-.72],[.18,0,.08]);
part(swordPivot,new THREE.BoxGeometry(.55,.08,.12),dark,[.18,-.05,.13],[.18,0,.08]);
player.position.set(0,0,8);

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

const shadowMat=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.34,depthWrite:false});
for(const [obj,r] of [[player,.72],[boss,2.1]]){const s=new THREE.Mesh(new THREE.CircleGeometry(r,32),shadowMat);s.rotation.x=-Math.PI/2;s.position.y=.012;obj.add(s)}

const input={keys:new Set(),guard:false,lock:true};
addEventListener('keydown',e=>{input.keys.add(e.code);if(e.code==='KeyQ')input.lock=!input.lock;if(e.code==='Space')tryRoll()});
addEventListener('keyup',e=>input.keys.delete(e.code));
addEventListener('mousedown',e=>{if(e.button===0)tryAttack();if(e.button===2){input.guard=true;tryDeflect()}});
addEventListener('mouseup',e=>{if(e.button===2)input.guard=false});
addEventListener('contextmenu',e=>e.preventDefault());

const ui={hp:document.querySelector('#hp'),posture:document.querySelector('#posture'),bossHp:document.querySelector('#bossHp'),bossPosture:document.querySelector('#bossPosture'),msg:document.querySelector('#message'),danger:document.querySelector('#danger'),head:document.querySelector('#headPart'),leg:document.querySelector('#legPart'),tail:document.querySelector('#tailPart')};
const state={
 hp:100,posture:0,stamina:100,attack:0,attackHit:false,attackStep:0,attackQueued:false,comboGrace:0,rolling:0,rollDir:new THREE.Vector3(),invuln:0,deflect:0,stagger:0,dead:false,
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
function tryRoll(){
 if(state.dead||state.rolling>0||state.attack>0||state.stagger>0||state.stamina<24)return;
 let x=0,z=0;if(input.keys.has('KeyA'))x-=1;if(input.keys.has('KeyD'))x+=1;if(input.keys.has('KeyW'))z-=1;if(input.keys.has('KeyS'))z+=1;
 const toBoss=flatDir(player.position,boss.position),right=new THREE.Vector3(toBoss.z,0,-toBoss.x);
 state.rollDir.set(0,0,0).addScaledVector(toBoss,-z).addScaledVector(right,x);
 if(!state.rollDir.lengthSq())state.rollDir.copy(toBoss).multiplyScalar(-1);state.rollDir.normalize();
 state.stamina-=24;state.rolling=.46;state.invuln=.27;
}
function startAttack(step){
 const cost=[0,16,18,23][step];
 if(state.stamina<cost)return false;
 state.stamina-=cost;state.attackStep=step;state.attack=[0,.46,.5,.62][step];state.attackHit=false;state.attackQueued=false;state.comboGrace=.18;return true;
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
function tryDeflect(){if(!state.dead&&state.stagger<=0)state.deflect=.17}

function hurtPlayer(dmg,posture=20,unblockable=false){
 if(state.invuln>0||state.dead)return;
 if(!unblockable&&input.guard){
   if(state.deflect>0){
     state.bossPosture+=30;state.posture=Math.max(0,state.posture-15);state.shake=.16;hitStop(.055);spawnSparks(player.position.clone().lerp(boss.position,.42).add(new THREE.Vector3(0,1.45,0)),22,7);flash('저스트 튕겨내기',.22);
     if(state.bossPosture>=100){state.bossStagger=2.05;state.bossPosture=48;state.bossState='stagger';flash('자세 붕괴',.52)}
     return;
   }
   state.hp-=dmg*.2;state.posture+=posture*1.25;state.stamina=Math.max(0,state.stamina-24);state.shake=.09;
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
 state.bossHp=Math.max(0,state.bossHp-dmg);state.bossPosture+=pd;state.shake=zone==='head'?.18:.13;hitStop(zone==='head'?.072:.055);spawnSparks(player.position.clone().lerp(boss.position,.62).add(new THREE.Vector3(0,zone==='head'?2.15:1.15,0)),zone==='head'?14:8,zone==='head'?5.5:4.2);
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

function updatePlayer(dt){
 if(state.dead)return;
 state.stamina=Math.min(100,state.stamina+dt*(state.attack||state.rolling?10:29));
 state.posture=Math.max(0,state.posture-dt*(input.guard?5:14));
 state.bossPosture=Math.max(0,state.bossPosture-dt*(state.bossState==='idle'?4.5:1.3));
 state.invuln=Math.max(0,state.invuln-dt);state.deflect=Math.max(0,state.deflect-dt);state.stagger=Math.max(0,state.stagger-dt);state.comboGrace=Math.max(0,state.comboGrace-dt);
 if(state.attack>0){
   const dur=[0,.46,.5,.62][state.attackStep],step=state.attackStep;
   state.attack-=dt;const p=1-state.attack/dur;
   if(step===1){swordPivot.rotation.x=-1.15+Math.sin(p*Math.PI)*2.35;swordPivot.rotation.z=-.35+Math.sin(p*Math.PI)*.72;player.rotation.z=Math.sin(p*Math.PI)*-.11}
   if(step===2){swordPivot.rotation.x=.95-Math.sin(p*Math.PI)*2.5;swordPivot.rotation.z=.45-Math.sin(p*Math.PI)*.9;player.rotation.z=Math.sin(p*Math.PI)*.13}
   if(step===3){swordPivot.rotation.x=-1.45+Math.sin(p*Math.PI)*3.0;swordPivot.rotation.y=Math.sin(p*Math.PI)*.35;player.rotation.x=Math.sin(p*Math.PI)*-.08}
   const hitAt=[0,.23,.25,.31][step],range=[0,3.15,3.25,3.45][step],damage=[0,22,25,36][step],post=[0,11,13,20][step];
   if(!state.attackHit&&state.attack<hitAt&&dist()<range){state.attackHit=true;hitBoss(damage,post)}
   if(state.attack<=0){
     swordPivot.rotation.set(0,0,0);player.rotation.x=0;player.rotation.z=0;
     if(state.attackQueued&&step<3)startAttack(step+1);else if(!state.attackQueued&&state.comboGrace<=0)state.attackStep=0;
   }
 }
 const toBoss=flatDir(player.position,boss.position);
 if(input.lock&&!state.rolling)player.rotation.y=THREE.MathUtils.lerp(player.rotation.y,Math.atan2(toBoss.x,toBoss.z),dt*12);
 if(state.rolling>0){
   state.rolling-=dt;player.position.addScaledVector(state.rollDir,dt*8.3);player.rotation.x=-Math.sin((.46-state.rolling)/.46*Math.PI)*.34;
   if(state.rolling<=0)player.rotation.x=0;return;
 }
 if(state.stagger>0||state.attack>.18)return;
 let x=0,z=0;if(input.keys.has('KeyA'))x-=1;if(input.keys.has('KeyD'))x+=1;if(input.keys.has('KeyW'))z-=1;if(input.keys.has('KeyS'))z+=1;
 if(x||z){
   const right=new THREE.Vector3(toBoss.z,0,-toBoss.x),move=new THREE.Vector3();
   if(input.lock)move.addScaledVector(toBoss,-z).addScaledVector(right,x).normalize();else move.set(x,0,z).normalize();
   const sprint=input.keys.has('ShiftLeft')||input.keys.has('ShiftRight');player.position.addScaledVector(move,dt*(sprint?5.2:3.15));
   if(!input.lock)player.rotation.y=THREE.MathUtils.lerp(player.rotation.y,Math.atan2(move.x,move.z),dt*10);
 }
 if(player.position.length()>18.8)player.position.setLength(18.8);
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
 ui.head.textContent=partText(state.headHp,state.headBroken,'파괴');ui.leg.textContent=partText(state.legHp,state.legBroken,'파괴');ui.tail.textContent=partText(state.tailHp,state.tailBroken,'절단');
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
function loop(){
 let dt=Math.min(clock.getDelta(),.033);state.time+=dt;
 if(state.hitstop>0){state.hitstop-=dt;dt=0}else{updatePlayer(dt);updateBoss(dt)}
 updateSparks(Math.max(dt,.001));updateCamera(Math.max(dt,.001));updateUI();renderer.render(scene,camera);requestAnimationFrame(loop);
}
loop();