import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090b0c);
scene.fog = new THREE.FogExp2(0x090b0c, 0.035);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);
const clock = new THREE.Clock();

scene.add(new THREE.HemisphereLight(0x8899aa, 0x20140d, 1.3));
const keyLight = new THREE.DirectionalLight(0xffe1bd, 4.2);
keyLight.position.set(-8, 13, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(24, 64),
  new THREE.MeshStandardMaterial({ color:0x17191a, roughness:0.95, metalness:0.08 })
);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

for(let i=0;i<32;i++){
  const a=i/32*Math.PI*2, r=20+Math.random()*4;
  const rock=new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.8+Math.random()*1.8,0),
    new THREE.MeshStandardMaterial({color:0x202326,roughness:1})
  );
  rock.position.set(Math.cos(a)*r,0.3,Math.sin(a)*r);
  rock.scale.y=0.5+Math.random()*2.2;
  rock.castShadow=rock.receiveShadow=true;
  scene.add(rock);
}

function material(color, metal=0.15, rough=.7){
  return new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough});
}
function part(parent, geo, mat, pos, rot=[0,0,0]){
  const m=new THREE.Mesh(geo,mat);
  m.position.set(...pos); m.rotation.set(...rot); m.castShadow=true; m.receiveShadow=true;
  parent.add(m); return m;
}

// PLAYER placeholder: readable silhouette first, art later.
const player=new THREE.Group();
scene.add(player);
const dark=material(0x34373a,.35,.55), cloth=material(0x282326,.05,.9), bladeMat=material(0x9aa0a4,.85,.25);
part(player,new THREE.CapsuleGeometry(.43,.9,5,8),cloth,[0,1.0,0]);
part(player,new THREE.SphereGeometry(.34,12,8),dark,[0,1.92,0]);
part(player,new THREE.BoxGeometry(.13,.13,1.65),bladeMat,[.55,1.17,-.45],[.15,0,.08]);
part(player,new THREE.BoxGeometry(.55,.09,.12),dark,[.55,1.17,.25],[.15,0,.08]);
player.position.set(0,0,7);

// BOSS placeholder: oversized armored beast-warrior.
const boss=new THREE.Group();
scene.add(boss);
const armor=material(0x4b4c49,.65,.42), flesh=material(0x3a2924,.05,.82), horn=material(0x766c59,.2,.65);
const torso=part(boss,new THREE.CapsuleGeometry(.95,1.55,6,10),armor,[0,1.7,0]);
part(boss,new THREE.SphereGeometry(.66,14,10),armor,[0,3.15,0]);
part(boss,new THREE.ConeGeometry(.16,.95,8),horn,[-.45,3.72,0],[0,0,.45]);
part(boss,new THREE.ConeGeometry(.16,.95,8),horn,[.45,3.72,0],[0,0,-.45]);
part(boss,new THREE.CapsuleGeometry(.24,1.2,5,8),flesh,[-1.0,2.0,0],[0,0,.25]);
part(boss,new THREE.CapsuleGeometry(.24,1.2,5,8),flesh,[1.0,2.0,0],[0,0,-.25]);
const bossBlade=part(boss,new THREE.BoxGeometry(.20,.18,2.9),bladeMat,[1.35,1.65,-.75],[-.08,0,.18]);
boss.position.set(0,0,-2);

const shadowRingMat=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.34,depthWrite:false});
for(const obj of [player,boss]){
  const ring=new THREE.Mesh(new THREE.CircleGeometry(obj===boss?1.5:.7,32),shadowRingMat);
  ring.rotation.x=-Math.PI/2; ring.position.y=.012; obj.add(ring);
}

const input={keys:new Set(), attack:false, guard:false, lock:true};
addEventListener('keydown',e=>{
  input.keys.add(e.code);
  if(e.code==='KeyQ') input.lock=!input.lock;
  if(e.code==='Space') tryRoll();
});
addEventListener('keyup',e=>input.keys.delete(e.code));
addEventListener('mousedown',e=>{
  if(e.button===0) tryAttack();
  if(e.button===2){input.guard=true; tryDeflect();}
});
addEventListener('mouseup',e=>{if(e.button===2) input.guard=false});
addEventListener('contextmenu',e=>e.preventDefault());

const ui={
  hp:document.querySelector('#hp'), posture:document.querySelector('#posture'),
  bossHp:document.querySelector('#bossHp'), bossPosture:document.querySelector('#bossPosture'),
  msg:document.querySelector('#message')
};

const state={
  hp:100, posture:0, stamina:100, attacking:0, attackHit:false, rolling:0, invuln:0,
  deflectWindow:0, stagger:0, dead:false,
  bossHp:420, bossPosture:0, bossState:'idle', bossTimer:1.1, bossHitDone:false,
  bossStagger:0, comboStep:0, time:0, shake:0
};

function flash(text,dur=.35){
  ui.msg.textContent=text; ui.msg.style.opacity='1';
  clearTimeout(flash.t); flash.t=setTimeout(()=>ui.msg.style.opacity='0',dur*1000);
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function flatDir(from,to){
  const d=new THREE.Vector3().subVectors(to,from); d.y=0;
  return d.lengthSq()?d.normalize():d.set(0,0,-1);
}
function dist(){return player.position.distanceTo(boss.position)}

function tryRoll(){
  if(state.dead||state.rolling>0||state.attacking>0||state.stagger>0||state.stamina<25)return;
  state.stamina-=25; state.rolling=.48; state.invuln=.28;
}
function tryAttack(){
  if(state.dead||state.rolling>0||state.attacking>0||state.stagger>0||state.stamina<18)return;
  state.stamina-=18; state.attacking=.52; state.attackHit=false;
}
function tryDeflect(){
  if(state.dead||state.stagger>0)return;
  state.deflectWindow=.16;
}

function hurtPlayer(dmg,posture=20){
  if(state.invuln>0||state.dead)return;
  if(input.guard){
    if(state.deflectWindow>0){
      state.bossPosture+=28;
      state.posture=Math.max(0,state.posture-18);
      state.shake=.16;
      flash('튕겨내기',.22);
      if(state.bossPosture>=100){
        state.bossStagger=2.2; state.bossPosture=55; state.bossState='stagger';
        flash('자세 붕괴',.55);
      }
      return;
    }
    state.hp-=dmg*.18; state.posture+=posture*1.25; state.stamina=Math.max(0,state.stamina-22);
    state.shake=.09;
  } else {
    state.hp-=dmg; state.posture+=posture; state.stagger=.34; state.shake=.22;
  }
  if(state.posture>=100){state.posture=35; state.stagger=.85; flash('자세 무너짐',.4)}
  if(state.hp<=0){state.hp=0;state.dead=true;flash('사망',1.2)}
}

function hitBoss(dmg,posture=10){
  if(state.bossHp<=0)return;
  state.bossHp=Math.max(0,state.bossHp-dmg);
  state.bossPosture+=posture;
  state.shake=.1;
  if(state.bossHp===0){state.bossState='dead';flash('승리',1.2)}
  else if(state.bossPosture>=100){
    state.bossStagger=2.15;state.bossPosture=52;state.bossState='stagger';flash('자세 붕괴',.55);
  }
}

function chooseBossAttack(){
  if(state.bossHp<=0)return;
  const d=dist();
  if(d>7){state.bossState='charge';state.bossTimer=.9;return}
  const r=Math.random();
  if(r<.42){state.bossState='slash1';state.bossTimer=.72;state.bossHitDone=false}
  else if(r<.72){state.bossState='heavy';state.bossTimer=1.12;state.bossHitDone=false}
  else {state.bossState='sweep';state.bossTimer=.92;state.bossHitDone=false}
}

function updateBoss(dt){
  if(state.bossHp<=0){boss.rotation.z=THREE.MathUtils.lerp(boss.rotation.z,-1.35,dt*2);return}
  if(state.bossStagger>0){
    state.bossStagger-=dt; boss.rotation.z=Math.sin(state.time*22)*.05;
    if(state.bossStagger<=0){state.bossState='idle';state.bossTimer=.7;boss.rotation.z=0}
    return;
  }
  const d=dist(), dir=flatDir(boss.position,player.position);
  const face=Math.atan2(dir.x,dir.z);
  boss.rotation.y=THREE.MathUtils.lerp(boss.rotation.y,face,dt*5);

  if(state.bossState==='idle'){
    state.bossTimer-=dt;
    if(d>3.7) boss.position.addScaledVector(dir,dt*2.15);
    else if(d<2.25) boss.position.addScaledVector(dir,-dt*.8);
    if(state.bossTimer<=0) chooseBossAttack();
    return;
  }

  state.bossTimer-=dt;
  if(state.bossState==='charge'){
    boss.position.addScaledVector(dir,dt*6.5);
    boss.rotation.z=Math.sin(state.time*18)*.025;
    if(d<3.1||state.bossTimer<=0){state.bossState='heavy';state.bossTimer=.82;state.bossHitDone=false}
  }
  if(state.bossState==='slash1'){
    const t=1-state.bossTimer/.72;
    bossBlade.rotation.z=-.7+Math.sin(clamp(t,0,1)*Math.PI)*2.1;
    if(!state.bossHitDone && state.bossTimer<.34 && d<3.5){
      state.bossHitDone=true; hurtPlayer(18,24);
    }
    if(state.bossTimer<=0){
      if(Math.random()<.68){state.bossState='slash2';state.bossTimer=.52;state.bossHitDone=false}
      else {state.bossState='idle';state.bossTimer=.45}
    }
  } else if(state.bossState==='slash2'){
    bossBlade.rotation.z=.8-Math.sin((1-state.bossTimer/.52)*Math.PI)*2.4;
    if(!state.bossHitDone && state.bossTimer<.27 && d<3.6){
      state.bossHitDone=true; hurtPlayer(22,28);
    }
    if(state.bossTimer<=0){state.bossState='idle';state.bossTimer=.65}
  } else if(state.bossState==='heavy'){
    // long readable windup, huge punish if mistimed.
    const wind=state.bossTimer>.44;
    bossBlade.rotation.x=THREE.MathUtils.lerp(bossBlade.rotation.x,wind?-1.35:.6,dt*(wind?7:20));
    if(!state.bossHitDone && state.bossTimer<.35 && d<4.05){
      state.bossHitDone=true; hurtPlayer(34,45);
    }
    if(state.bossTimer<=0){state.bossState='idle';state.bossTimer=.95;bossBlade.rotation.x=0}
  } else if(state.bossState==='sweep'){
    const p=1-state.bossTimer/.92;
    boss.rotation.y+=dt*(p>.42&&p<.72?9:0);
    bossBlade.rotation.z=.35;
    if(!state.bossHitDone && state.bossTimer<.46 && d<4.35){
      state.bossHitDone=true; hurtPlayer(26,34);
    }
    if(state.bossTimer<=0){state.bossState='idle';state.bossTimer=.72;bossBlade.rotation.z=0}
  }
}

function updatePlayer(dt){
  if(state.dead)return;
  state.stamina=Math.min(100,state.stamina+dt*(state.attacking||state.rolling?10:28));
  state.posture=Math.max(0,state.posture-dt*(input.guard?5:14));
  state.bossPosture=Math.max(0,state.bossPosture-dt*(state.bossState==='idle'?4:1.5));
  state.invuln=Math.max(0,state.invuln-dt);
  state.deflectWindow=Math.max(0,state.deflectWindow-dt);
  state.stagger=Math.max(0,state.stagger-dt);

  if(state.attacking>0){
    state.attacking-=dt;
    const p=1-state.attacking/.52;
    player.rotation.z=Math.sin(p*Math.PI)*-.12;
    if(!state.attackHit && state.attacking<.28 && dist()<2.8){
      state.attackHit=true; hitBoss(state.bossStagger>0?52:24,state.bossStagger>0?35:13);
    }
    if(state.attacking<=0) player.rotation.z=0;
  }

  const toBoss=flatDir(player.position,boss.position);
  if(input.lock && !state.rolling) player.rotation.y=THREE.MathUtils.lerp(player.rotation.y,Math.atan2(toBoss.x,toBoss.z),dt*12);

  if(state.rolling>0){
    state.rolling-=dt;
    const f=input.lock?toBoss:new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));
    player.position.addScaledVector(f,dt*7.7);
    player.rotation.x=-Math.sin((.48-state.rolling)/.48*Math.PI)*.32;
    if(state.rolling<=0) player.rotation.x=0;
    return;
  }
  if(state.stagger>0||state.attacking>.18)return;

  let x=0,z=0;
  if(input.keys.has('KeyA'))x-=1;if(input.keys.has('KeyD'))x+=1;
  if(input.keys.has('KeyW'))z-=1;if(input.keys.has('KeyS'))z+=1;
  const move=new THREE.Vector3(x,0,z);
  if(move.lengthSq()){
    move.normalize();
    if(input.lock){
      const right=new THREE.Vector3(toBoss.z,0,-toBoss.x);
      move.copy(toBoss.clone().multiplyScalar(-z).add(right.multiplyScalar(x))).normalize();
    }
    const sprint=input.keys.has('ShiftLeft')||input.keys.has('ShiftRight');
    player.position.addScaledVector(move,dt*(sprint?5.1:3.1));
    if(!input.lock) player.rotation.y=THREE.MathUtils.lerp(player.rotation.y,Math.atan2(move.x,move.z),dt*10);
  }

  const radius=18.5;
  if(player.position.length()>radius)player.position.setLength(radius);
}

const camPos=new THREE.Vector3();
function updateCamera(dt){
  const target=player.position.clone().add(new THREE.Vector3(0,1.35,0));
  const toBoss=flatDir(player.position,boss.position);
  const back=input.lock?toBoss.clone().multiplyScalar(-1):new THREE.Vector3(0,0,1);
  camPos.copy(target).addScaledVector(back,5.8).add(new THREE.Vector3(0,2.6,0));
  camera.position.lerp(camPos,1-Math.exp(-dt*8));
  const look=input.lock?target.clone().lerp(boss.position.clone().add(new THREE.Vector3(0,1.7,0)),.34):target;
  if(state.shake>0){
    state.shake=Math.max(0,state.shake-dt);
    camera.position.x+=(Math.random()-.5)*state.shake;
    camera.position.y+=(Math.random()-.5)*state.shake;
  }
  camera.lookAt(look);
}

function updateUI(){
  ui.hp.style.width=clamp(state.hp,0,100)+'%';
  ui.posture.style.width=clamp(state.posture,0,100)+'%';
  ui.bossHp.style.width=(state.bossHp/420*100)+'%';
  ui.bossPosture.style.width=clamp(state.bossPosture,0,100)+'%';
}

function resize(){
  const w=innerWidth,h=innerHeight;
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();

function loop(){
  const dt=Math.min(clock.getDelta(),.033);
  state.time+=dt;
  updatePlayer(dt);updateBoss(dt);updateCamera(dt);updateUI();
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
loop();