"use strict";

const byId = id => document.getElementById(id);
let importedEnemyModel = null;

function enemyPose(model,enemy,now) {
  const matrices=[new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0])];
  if (!model.joints) return matrices[0];
  const moving=Math.min(1,enemy.pace/1.8);
  const stride=Math.sin(enemy.steps)*moving;
  const prone=enemy.lostLeg || enemy.state==="down";
  const aim=enemy.shotAim && !enemy.lostArm && !prone
    ? Math.min(clamp((now-enemy.shotAim.start)/.16,0,1),clamp((enemy.aimUntil+.26-now)/.26,0,1)) : 0;
  const recoil=Math.max(0,1-(now-(enemy.lastRifleShot??-Infinity))/.18);
  const flinch=Math.max(0,1-(now-enemy.hitAt)/.65);
  const crawl=enemy.state==="down" ? 0 : Math.sin(enemy.steps*2.1)*Math.min(1,enemy.pace*2.4);
  const angles=[[0,0],[0,0],[.12*flinch+moving*.08+recoil*.12,.12*flinch+stride*.045],[0,0]];
  for (const side of [-1,1]) {
    angles.push([prone ? 1.17+side*crawl*.58 : mix(.14+side*stride*.44,.88+recoil*.09,aim), -side*mix(.68,.62,aim)],
      [prone ? .88+side*crawl*.38 : mix(.24+moving*.19,1.06,aim),-side*aim*.25],
      [-aim*.24,0],
      [prone ? .04+crawl*.08 : -side*stride*.62,0],
      [prone ? -.18 : -Math.max(0,side*stride)*.83,0],
      [prone ? 0 : side*stride*.21,0]);
  }
  for (let i=1;i<model.joints.length;i++) {
    const joint=model.joints[i];
    if (!joint) {matrices.push(matrices[0]);continue;}
    const upstream=matrices[joint.parent]||matrices[0];
    const [pitch,roll]=angles[i];
    const c=Math.cos(pitch), s=Math.sin(pitch), k=Math.cos(roll), r=Math.sin(roll);
    const rotation=[k,-r,0,c*r,c*k,-s,s*r,s*k,c];
    const result=new Float32Array(12);
    const [x,y,z]=joint.position;
    for(let row=0;row<3;row++) {
      const o=row*4;
      for(let col=0;col<3;col++) {
        result[o+col]=upstream[o]*rotation[col]+upstream[o+1]*rotation[3+col]+upstream[o+2]*rotation[6+col];
      }
      result[o+3]=upstream[o+3]+(upstream[o]-result[o])*x+(upstream[o+1]-result[o+1])*y+(upstream[o+2]-result[o+2])*z;
    }
    matrices.push(result);
  }
  return Float32Array.from(matrices.flatMap(matrix=>Array.from(matrix)));
}
function enemyFacing(e) {
  return Math.atan2(e.lookX,-e.lookZ);
}
function modelPlacement(e) {
  const prone=Boolean(e.lostLeg || e.state==="down");
  const yaw=e.facingYaw??0;
  return {x:e.x+(prone ? -Math.sin(yaw)*1.4 : 0),
    y:floorAt(e)+(prone ? .69 : .06*Math.sin(e.steps*2)*Math.min(e.pace,2)),
    z:e.z+(prone ? Math.cos(yaw)*1.4 : 0),prone,yaw};
}
function posedJoint(model,pose,placement,index) {
  const p=model.joints[index].position, o=index*12;
  const [x,y,z]=[0,4,8].map(row=>pose[o+row]*p[0]+pose[o+row+1]*p[1]+pose[o+row+2]*p[2]+pose[o+row+3]);
  const depth=placement.prone ? -y : z;
  const c=Math.cos(placement.yaw),s=Math.sin(placement.yaw);
  return [placement.x+x*c-depth*s,placement.y+(placement.prone ? z : y),placement.z+x*s+depth*c];
}
function enemyWeapon(enemy,now) {
  const model=importedEnemyModel;
  const grip=model?.joints?.[6] ? posedJoint(model,enemyPose(model,enemy,now),modelPlacement(enemy),6) :
    [enemy.x+.18,enemyMuzzleY(enemy),enemy.z-.38];
  const vector=enemy.shotAim && now<enemy.aimUntil+.26 ?
    [enemy.shotAim.x-grip[0],enemy.shotAim.y-grip[1],enemy.shotAim.z-grip[2]] :
    [Math.sin(enemy.facingYaw??0),-.26,-Math.cos(enemy.facingYaw??0)];
  const norm=Math.hypot(...vector)||1;
  const direction=vector.map(value=>value/norm);
  const length=enemy.role==="sniper" ? 1.15 : .86;
  const tip=grip.map((value,index)=>value+direction[index]*length);
  return {grip,tip,direction};
}
function modelHitParts(model,e,now) {
  const pose=enemyPose(model,e,now), placement=modelPlacement(e);
  const points=model.joints.map((joint,i)=>{
    if (!joint) return null;
    return posedJoint(model,pose,placement,i);
  });
  const helmet=hasHelmet(e);
  return [[3,3,helmet ? .47 : .31,"head",0],[1,2,.34,"body",0],[2,3,.34,"body",0],
    [4,5,.16,"arm",-1],[5,6,.16,"arm",-1],[10,11,.16,"arm",1],[11,12,.16,"arm",1],
    [7,8,.21,"leg",-1],[8,9,.21,"leg",-1],[9,9,.19,"leg",-1],
    [13,14,.21,"leg",1],[14,15,.21,"leg",1],[15,15,.19,"leg",1]]
    .filter(([a,b,,part,side])=>points[a] && points[b] && !(part==="arm" && e.lostArm===side) && !(part==="leg" && e.lostLeg===side))
    .map(([a,b,radius,part,side])=>{
      const head=part==="head";
      const end=placement.prone ? [points[b][0]+Math.sin(placement.yaw)*.30,points[b][1],points[b][2]-Math.cos(placement.yaw)*.30] :
        [points[b][0],points[b][1]+(helmet ? .45 : .23),points[b][2]];
      return {a:points[a],b:head ? end : points[b],radius,part,side};
    });
}
function intersectModel(e,round,now) {
  const speed=Math.sign(Math.cos(round.yaw));
  const range=Math.hypot(e.x-round.origin.x,e.z-round.origin.z);
  const {aimX,aimY}=shotAim(e.t,round.yaw,round.pitch,round.ak,range);
  let hit=null;
  for (const part of modelHitParts(importedEnemyModel,e,now)) {
    for (const fraction of [0,.25,.5,.75,1]) {
      const [x,y,z]=part.a.map((value,i)=>mix(value,part.b[i],fraction));
      const depth=z-round.origin.z;
      if (depth*speed<=0 || hit && Math.abs(depth)>hit.depth+.02) continue;
      if (Math.hypot(round.origin.x+aimX*depth-x,round.origin.y+aimY*depth-y)<=part.radius) {
        hit={...part,z,depth:Math.abs(depth)};
      }
    }
  }
  return hit;
}

function loadWhiteJade() {
  const model=buildWhiteJade();
  importedEnemyModel=model;
  const layers=[["white-jade-texture","white-jade.jpg"],["white-jade-face","white-jade-face.jpg"]];
  layers.forEach(([id,path],index)=>{
    const texture=new Image();
    texture.onload=()=>{
      model.images[index]=texture;
      importedEnemyModel={...model};
    };
    texture.src=byId(id)?.textContent.trim() || path;
  });
}
const view = byId("viewport");
const canvas = byId("scene");
const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
const cameraHeight = 3.2;
const lenses = [4, 8, 12, 16];
const sectorTemplates = [
  { name: "협곡 입구", distance: 750, x: 0, z: 91, wind: 2.4, drift: .004, drop: .008, flight: .82, patrol: 4, period: 5 },
  { name: "메사 능선", distance: 1200, x: -30, z: 148, wind: -4.1, drift: -.008, drop: .014, flight: 1.19, patrol: 6, period: 6 },
  { name: "마른 호수", distance: 1800, x: 50, z: 220, wind: 5.6, drift: .011, drop: .023, flight: 1.62, patrol: 8, period: 7 }
];
const stations = sectorTemplates.map(sector=>({...sector}));
const fieldWidth = 300, fieldDepth = 700;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (a, b, amount) => a + (b - a) * amount;
const hash = (x, z) => {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
function noise(x, z) {
  const a = Math.floor(x), b = Math.floor(z);
  const u = x - a, v = z - b;
  const sx = u * u * (3 - 2 * u), sz = v * v * (3 - 2 * v);
  return mix(mix(hash(a, b), hash(a + 1, b), sx), mix(hash(a, b + 1), hash(a + 1, b + 1), sx), sz);
}
function ground(x, z) {
  const curve = Math.sin(z*.006+terrainSeed)*mapProfile.bend;
  const bank = Math.abs(x+curve);
  const rim = clamp((bank-mapProfile.width)/50,0,1);
  const hills = noise(x/56+terrainSeed,z/40-terrainSeed);
  const grit = noise(x/8+terrainSeed,z/8);
  let y = -3 + 4 * hills + 1.2 * grit;
  y += rim * (8 + 26 * hills + 7 * grit);
  y += clamp((z - 490) / 145, 0, 1) * (4 + 34 * hills);
  y += Math.max(0, (27 - z) / 27) * 6;
  const ridge = (noise(x/36+terrainSeed*4,z/33)-.5)*mapProfile.relief*Math.min(1,Math.max(0,z)/48);
  return y+ridge;
}
let terrainSeed = 0;
const mapProfiles = [
  {name:"굽은 협곡",width:104,bend:35,relief:4},
  {name:"마른 분지",width:145,bend:15,relief:2},
  {name:"침식 능선",width:120,bend:42,relief:6}
];
let mapIndex = -1, mapProfile = mapProfiles[0];
function rollBattlefield() {
  mapIndex=(mapIndex+1+Math.floor(Math.random()*(mapProfiles.length-1)))%mapProfiles.length;
  mapProfile=mapProfiles[mapIndex];
  terrainSeed=1+Math.random()*997;
  stations.forEach((sector,index)=>{
    const template=sectorTemplates[index];
    const z=template.z*2.07+(Math.random()-.5)*45;
    const x=-Math.sin(z*.006+terrainSeed)*mapProfile.bend+(Math.random()-.5)*104;
    Object.assign(sector,{x,z,distance:Math.round(Math.hypot(x,z)*8)});
  });
}
let stationIndex = 0, lensIndex = 1, shots = 0, hits = 0;
let yaw = 0, pitch = 0, breath = 1, holdKey = false, holdToggle = false;
let pending = null, impact = null, recoilAt = -100, currentAudio = null;
const bloodImpacts = [];
let scoped = true, cameraX = 0, cameraZ = 0, missionStart = null, missionState = "ready";
let history = [], cleared = new Set();
const campaign = ["리지 작전","메사 초계","마른 호수 매복","협곡 봉쇄","철길의 감시자","황혼 수색대","능선의 저격수","장갑 선봉","메사의 돌격대","끊어진 교신","은빛 헬멧","장갑 행렬","유령 초계","검은 능선","마지막 방어선","리지 탈환"];
const kits = {
  launcher:{name:"아틀라스 대장갑 발사기",cost:2,level:4,radius:20},
  air:{name:"공중지원",cost:3,level:5,radius:27},
  orbit:{name:"위성 호출 키트",cost:4,level:8,radius:38},
  wand:{name:"별빛 요술봉",cost:3,level:6,radius:20}
};
function readCampaign() {
  try {
    const save = JSON.parse(localStorage.getItem("farpoint-campaign-v3") || "{}");
    const stage = clamp(Number.isInteger(save.stage) ? save.stage : 0,0,campaign.length-1);
    return {stage,credits:clamp(Number.isInteger(save.credits) ? save.credits : 0,0,999),
      clearedCount:clamp(Number.isInteger(save.clearedCount) ? save.clearedCount : stage,stage,campaign.length)};
  } catch { return {stage:0,credits:0,clearedCount:0}; }
}
let {stage,credits,clearedCount} = readCampaign();
const hasHelmet = enemy => stage>=10 && !enemy.headHits && enemy.role!=="tank";
let unlockedStage = stage;
let attemptCredits = credits;
let supportSpent = 0;
const automaticRounds = [];
let triggerHeld = false;
let burstHeat = 0, lastAutomaticShot = -Infinity;
let rangeMeasurement = null;
function saveCampaign() {
  try { localStorage.setItem("farpoint-campaign-v3",JSON.stringify({stage:unlockedStage,credits,clearedCount})); }
  catch { /* Local storage can be unavailable for local files. */ }
}
const supplyPoint = {x:0,z:-9};
let magazine = 5, reserve = 15, akMagazine = 30, akReserve = 120, apRounds = 0, usingAP = false;
let health = 100, weapon = "rifle", reloadAt = 0, reloadWeapon = "", equipment = null;
let flashUntil = 0, support = null, damageShot = null, landed = 0, boltUntil = 0;
const enemyRounds = [];
let impactBlast = null, walkPhase = 0, walkBob = 0, cannonKickAt = -Infinity;
let scopeBeforeSupport = null;
const keys = new Set();
const station = () => stations[stationIndex];
const fov = () => scoped ? 2*Math.atan(Math.tan(1.18/2)/lenses[lensIndex]) : 1.18;
const nowSeconds = () => performance.now() / 1000;
const eyeY = () => ground(cameraX,cameraZ)+cameraHeight+walkBob;
const missionDuration = () => 240 + stage*18;
let enemies = [];
const stateLabel = { patrol: "순찰", listen: "경계", inspect: "확인 중", search: "수색 중", down: "제압" };

function resetEnemies() {
  enemies = stations.flatMap((t,index) => {
    const squad = [-1,1].map(side => ({t,index,side,role:stage >= 3 && side === 1 && index === stage%3 ? "sniper" : "guard"}));
    if (stage >= 5) squad.push({t,index,side:2,role:stage >= 10 && index === (stage+1)%3 ? "sniper" : "guard"});
    if (stage >= 7 && (index === stage%3 || stage >= 13 && index === (stage+1)%3)) squad.push({t,index,side:-2,role:"tank"});
    return squad;
  });
  const extraEnemies = stage ? stage+Math.floor(Math.random()*(Math.floor(stage/3)+1)) : 0;
  for (let i=0;i<extraEnemies;i++) {
    const index = Math.floor(Math.random()*stations.length);
    enemies.push({t:stations[index],index,side:i%2 ? 1 : -1,role:stage>=7 && i%6===4 ? "sniper" : "guard",extra:true});
  }
  const deployed = [];
  for (const e of enemies) {
    let homeX=0, homeZ=0, best=-Infinity;
    for (let attempt=0;attempt<28;attempt++) {
      const z=e.t.z+(Math.random()-.5)*(72+stage*2);
      const x=clamp(e.t.x+(Math.random()-.5)*(128+stage*3),-120,120);
      const distance=deployed.reduce((gap,other)=>Math.min(gap,Math.hypot(other.x-x,other.z-z)-(other.role==="tank" || e.role==="tank" ? 18 : 0)),100);
      if (distance>best) { best=distance; homeX=x; homeZ=z; }
    }
    Object.assign(e,{x:homeX,z:homeZ,homeX,homeZ,state:"patrol",since:0,clue:null,steps:0,pace:0,
      lookX:-Math.sign(e.side),lookZ:0,heardAt:-Infinity,noticed:new Set(),bodyHits:0,headHits:0,
      evidence:0,nextShot:0,aimUntil:0,staggerUntil:0,injury:null,hitAt:-Infinity,sound:null,lostArm:0,lostLeg:0,
      weakCore:stage >= 7 && e.role === "tank",turretYaw:0,hullYaw:0,tankFiredAt:-Infinity});
    deployed.push(e);
  }
}
resetEnemies();
const floorAt = e => ground(e.x,e.z)+.24;
const tankScale = 4;
const tankPortRadius = .30;
const tankSize = {halfWidth:3.25*tankScale,halfLength:5.85*tankScale,roof:3.95*tankScale,gunHeight:3.06*tankScale,portHeight:2.2*tankScale};
const aimHeight = e => e.role === "tank" ? tankSize.portHeight : e.lostLeg ? .72 : 2.1;
const beltTarget = {x:-.37,y:1.72,radius:.14};
const squad = t => enemies.filter(e => e.t === t);
const living = t => squad(t).filter(e => e.state !== "down");
function canSee(e,x,z,radius) {
  const dx = x-e.x, dz = z-e.z;
  const gap = Math.hypot(dx,dz);
  return gap < 2.5 || (gap < radius && (dx*e.lookX+dz*e.lookZ)/gap > .18);
}
function canSeePlayer(e,radius) {
  if (Math.hypot(cameraX-e.x,cameraZ-e.z)>11 && !canSee(e,cameraX,cameraZ,radius)) return false;
  for (let step=1;step<8;step++) {
    const fraction = step/8;
    if (ground(mix(e.x,cameraX,fraction),mix(e.z,cameraZ,fraction)) >
      mix(enemyMuzzleY(e),eyeY(),fraction)) return false;
  }
  return true;
}
function enemyMuzzleY(e) {
  return floorAt(e)+(e.role === "tank" ? tankSize.gunHeight : 2.48);
}
const angleDifference = (a,b) => Math.atan2(Math.sin(a-b),Math.cos(a-b));
function tankMuzzle(tank,now) {
  const kick=Math.exp(-9*Math.max(0,now-tank.tankFiredAt))*.54;
  const reach=(6.65-kick)*tankScale;
  return {x:tank.x+Math.sin(tank.turretYaw)*reach,y:enemyMuzzleY(tank),z:tank.z-Math.cos(tank.turretYaw)*reach};
}
function tankPort(tank) {
  const reach=4.48*tankScale;
  return {x:tank.x+Math.sin(tank.hullYaw)*reach,y:floorAt(tank)+tankSize.portHeight,z:tank.z-Math.cos(tank.hullYaw)*reach};
}
function readyEnemyShot(e,now) {
  if (e.lostArm || e.lostLeg || now < e.nextShot) return false;
  const tank = e.role === "tank", sniper = e.role === "sniper";
  const direct = canSeePlayer(e,tank ? 155 : sniper ? 100 : 53);
  const heard = sniper && e.state === "search" && e.evidence >= (stage >= 11 ? 2 : 3) && e.sound && now-e.sound.at<5;
  if (!direct && !heard) return false;
  if (sniper && damageShot) return false;
  const target = direct ? {x:cameraX,z:cameraZ} : e.sound;
  const warning = tank ? 1.65 : sniper ? 1.05 : .48;
  const shot = {source:e,x:target.x,z:target.z,at:now+warning};
  if (tank) e.turretTarget=Math.atan2(target.x-e.x,e.z-target.z);
  if (sniper) damageShot = shot;
  enemyRounds.push(shot);
  e.aimUntil = shot.at;
  if (!tank) {
    e.shotAim={x:shot.x,y:eyeY()-.35,z:shot.z,start:now};
    e.facingYaw=Math.atan2(shot.x-e.x,e.z-shot.z);
  }
  e.nextShot = now + (tank ? 6.4 : sniper ? 5.8 : Math.max(1.65,2.65-stage*.06));
  e.lookX = target.x-e.x;
  e.lookZ = target.z-e.z;
  const gap = Math.hypot(e.lookX,e.lookZ) || 1;
  e.lookX /= gap;
  e.lookZ /= gap;
  if (tank || sniper) setNotice(tank ? "전차가 조준 중 · 이동하세요" : "적 저격수 조준 중 · 이동하세요","miss");
  return true;
}
function signal(e,state,clue,now) {
  e.state = state;
  e.since = now;
  e.clue = clue;
}
function updateEnemies(now,dt) {
  const elapsed = now - missionStart;
  for (const e of enemies) {
    if (e.state === "down") continue;
    if (e.role==="tank") {
      const desired=e.aimUntil>now || now-e.tankFiredAt<.45 ? e.turretTarget : e.hullYaw;
      e.turretYaw+=clamp(angleDifference(desired??0,e.turretYaw),-dt*4,dt*4);
    }
    if (now < e.staggerUntil) { e.pace = 0; continue; }
    if (now < e.aimUntil) { e.pace = 0; continue; }
    if (readyEnemyShot(e,now)) { e.pace = 0; continue; }
    const age = now - e.since;
    const body = enemies.find(other => other.state === "down" && !e.noticed.has(other) && canSee(e,other.x,other.z,6));
    if (body) { e.noticed.add(body); raiseAlarm(e,{x:body.x,z:body.z},now); }
    let goalX, goalZ, speed;
    if (e.state === "listen" && age > 1.2) signal(e,e.clue.report ? "search" : "inspect",e.clue,now);
    if (e.state === "inspect" && age > 11) signal(e,"patrol",null,now);
    if (e.state === "patrol") {
      const wave = elapsed * (1+stage*.045) * 2 * Math.PI / (e.t.period + 3) + e.side*.7;
      goalX = e.homeX+e.t.patrol*.66*Math.sin(wave);
      goalZ = e.homeZ + (stage ? Math.sin(wave*.6+e.index)*Math.min(8,stage*.7) : 0);
      speed = 2.3 + stage*.13;
    } else if (e.state === "inspect") {
      goalX = e.clue.x + e.side*1.4;
      goalZ = e.clue.z - e.side*1.5;
      speed = 1.7;
    } else if (e.state === "search") {
      const slot = Math.floor((now-e.since)/7);
      const advance = clamp((slot+1)*.23,0,1);
      goalX = mix(e.homeX,e.clue.x,advance) + e.side*(slot%2 ? 9 : 4);
      goalZ = mix(e.homeZ,e.clue.z,advance) + e.side*3;
      const dash = !e.injury && stage >= 5 && (now-e.since+e.side*1.2+8)%5 < 1.05;
      speed = (slot === 0 ? 5.2 : 4.1) + stage*.22 + (dash ? 3.2+stage*.23 : 0);
      if (e.role === "sniper") {
        goalZ = Math.max(goalZ,e.t.z-32);
      }
    } else {
      e.pace = 0;
      continue;
    }
    if (e.role === "tank") speed = Math.min(speed,2.4+stage*.06);
    if (e.injury) speed *= e.lostLeg ? .15 : .56;
    const dx = goalX-e.x, dz = goalZ-e.z, gap = Math.hypot(dx,dz);
    const travel = Math.min(gap,dt*speed);
    const scale = gap > .01 ? travel/gap : 0;
    if (gap > .12) {
      e.lookX = dx/gap;
      e.lookZ = dz/gap;
      if (e.role==="tank") e.hullYaw+=clamp(angleDifference(Math.atan2(dx,-dz),e.hullYaw),-dt*1.25,dt*1.25);
      else {
        const facing=e.facingYaw??0;
        e.facingYaw=facing+clamp(angleDifference(enemyFacing(e),facing),-dt*5,dt*5);
      }
    }
    e.x += dx*scale;
    e.z += dz*scale;
    e.pace = dt > 0 ? travel/dt : 0;
    e.steps += 3.8*travel;
  }
}
function raiseAlarm(e,clue,now) {
  signal(e,"search",clue,now);
  for (const other of living(e.t)) {
    if (other !== e && other.state !== "search") {
      other.evidence = Math.max(other.evidence,1);
      signal(other,"listen",{...clue,report:true},now);
    }
  }
}
function reactToImpact(round,victim,eliminated,now) {
  const clue = {x:round.x,z:round.z};
  for (const e of living(round.t)) {
    const gap = Math.hypot(e.x-round.x,e.z-round.z);
    if (gap < 17) e.evidence++;
    if (e === victim) {
      signal(e,"listen",clue,now);
      e.heardAt = now;
    } else if (victim && canSee(e,victim.x,victim.z,11)) {
      if (eliminated) e.noticed.add(victim);
      raiseAlarm(e,clue,now);
    } else if (gap < 17) {
      if (e.state === "search") {
        e.clue = e.sound && now-e.sound.at<5 ? e.sound : clue;
      } else if (now-e.heardAt < 14) {
        raiseAlarm(e,e.sound && now-e.sound.at<5 ? e.sound : clue,now);
      } else {
        signal(e,"listen",{x:round.x,z:round.z},now);
      }
      e.heardAt = now;
    }
  }
}
function aimAtTarget() {
  const t = station();
  const actor = living(t)[0] ?? squad(t)[0];
  yaw = Math.atan2(actor.x - cameraX, actor.z - cameraZ);
  pitch = Math.atan2(floorAt(actor) + aimHeight(actor) - eyeY(), Math.hypot(actor.x - cameraX, actor.z - cameraZ));
}
aimAtTarget();

function setNotice(message, kind = "") {
  byId("notice").textContent = message;
  byId("notice").className = "notice " + kind;
}

function renderStages() {
  byId("stages").replaceChildren(...stations.map((t, index) => {
    const button = document.createElement("button");
    button.className = "station";
    button.setAttribute("aria-pressed", index === stationIndex);
    button.innerHTML = '<b>0' + (index + 1) + '</b><span><strong>' + t.name +
      '</strong><small>' + t.distance.toLocaleString("ko-KR") +
      ' m</small></span><em></em>';
    button.addEventListener("click", () => {
      if (pending) return;
      stationIndex = index;
      impact = null;
      aimAtTarget();
      visualYaw = yaw;
      visualPitch = pitch;
      updateDisplay();
      if (missionState === "active") view.focus();
      else byId("stages").children[index].focus();
      if (missionState === "active") setNotice(cleared.has(index) ? "이 구역은 제압했습니다." : "순찰대 확인");
    });
    return button;
  }));
  renderEnemyStatus();
}
function renderEnemyStatus() {
  stations.forEach((t,index) => {
    const active = living(t);
    const state = ["search","inspect","listen","patrol"].find(value => active.some(e => e.state === value)) ?? "down";
    const badge = byId("stages").children[index]?.querySelector("em");
    const label = active.length ? active.length + "명 · " + stateLabel[state] : "✓ 제압";
    if (badge && badge.textContent !== label) badge.textContent = label;
  });
}

function updateDisplay() {
  const t = station();
  byId("range").textContent = rangeMeasurement?.label ?? "— m";
  byId("wind").textContent = (t.wind > 0 ? "→ " : "← ") + Math.abs(t.wind).toFixed(1);
  updateScope();
  byId("shots").textContent = shots + "발";
  byId("progress").textContent = hits + " / " + enemies.length + " 제압";
  byId("hits").textContent = String(hits).padStart(2, "0");
  const resolved = shots - Number(Boolean(pending)) - automaticRounds.length;
  byId("accuracy").textContent = resolved ? Math.round(landed / resolved * 100) + "%" : "—";
  updateInventory();
  const entries = history.map(record => {
    const row = document.createElement("li");
    const label = document.createElement("span"), result = document.createElement("span");
    label.textContent = "#" + record.number + " · " + record.name;
    result.textContent = record.result ?? (record.hit ? "명중" : "빗나감");
    result.style.color = record.hit ? "#d8f36c" : "#ffc395";
    row.append(label, result);
    return row;
  });
  if (!entries.length) {
    const row = document.createElement("li");
    row.className = "empty";
    row.textContent = "발사하면 여기에 결과가 표시됩니다.";
    entries.push(row);
  }
  byId("log").replaceChildren(...entries);
  renderStages();
}

function changeZoom(delta) {
  if (equipment) return;
  if (!scoped) {
    if (delta < 0) return;
    scoped = true;
    lensIndex = 0;
  } else if (delta < 0 && lensIndex === 0) {
    scoped = false;
  } else {
    lensIndex = clamp(lensIndex + delta,0,lenses.length-1);
  }
  updateScope();
}
function updateScope() {
  view.classList.toggle("unscoped", !scoped);
  byId("scope").setAttribute("aria-pressed", scoped);
  byId("zoom").textContent = scoped ? lenses[lensIndex] + "×" : "1×";
  byId("out").disabled = Boolean(equipment) || !scoped;
  byId("in").disabled = Boolean(equipment) || scoped && lensIndex === lenses.length - 1;
}
function toggleScope() {
  if (equipment) return;
  scoped = !scoped;
  updateScope();
}

function updateInventory() {
  const ak = weapon === "ak";
  byId("ammo").textContent = (ak ? "AK-47 " : usingAP ? "관통 " : "소총 ") +
    (ak ? akMagazine + " / " + akReserve : magazine + " / " + reserve);
  byId("supplies").textContent = (reloadAt ? "장전 중" : "예비 탄창 " + Math.ceil((ak ? akReserve : reserve)/(ak ? 30 : 5))) +
    " · 체력 " + health;
  byId("credits").textContent = credits + " C";
  byId("ap").textContent = "관통탄 " + apRounds + " · T";
  byId("ap").setAttribute("aria-pressed",usingAP);
  byId("ak").setAttribute("aria-pressed",ak);
}
function renderShop() {
  byId("gear").replaceChildren(...Object.entries(kits).map(([id,kit]) => {
    const button = document.createElement("button");
    button.textContent = (Object.keys(kits).indexOf(id)+4) + " · " + kit.name + " · " + (stage < kit.level ? (kit.level+1) + "단계 해금" :
      equipment === id ? "조준 중" : kit.cost + " C");
    button.setAttribute("aria-pressed",equipment === id);
    button.disabled = stage < kit.level || credits < kit.cost && equipment !== id;
    button.addEventListener("click",() => armKit(id));
    return button;
  }));
}
function armKit(id) {
  const kit = kits[id];
  if (!kit || missionState !== "active") return;
  if (equipment === id) { cancelKit(); return; }
  if (support) { setNotice("지원이 도착 중입니다."); return; }
  if (stage < kit.level || credits < kit.cost) {
    setNotice(stage < kit.level ? (kit.level+1) + "단계에서 해금됩니다." : kit.cost + " C가 필요합니다.");
    return;
  }
  if (scopeBeforeSupport === null) scopeBeforeSupport = scoped;
  equipment = id;
  scoped = false;
  updateScope();
  updateSupportHud(nowSeconds(),yaw,pitch);
  renderShop();
  view.focus();
  captureAim();
}
function restoreScope() {
  if (scopeBeforeSupport === null) return;
  scoped = scopeBeforeSupport;
  scopeBeforeSupport = null;
  updateScope();
}
function cancelKit() {
  if (!equipment) return;
  equipment = null;
  restoreScope();
  updateSupportHud(nowSeconds(),yaw,pitch);
  setNotice("지원 지정 취소");
  renderShop();
}
function reload() {
  if (missionState !== "active" || reloadAt || nowSeconds() < boltUntil) return;
  const ak = weapon === "ak";
  if ((ak ? akMagazine : magazine) === (ak ? 30 : 5)) return;
  if (!(ak ? akReserve : reserve)) {
    setNotice("예비 탄약 없음 · 뒤쪽 보급 상자에서 E","miss");
    return;
  }
  reloadWeapon = weapon;
  reloadAt = nowSeconds() + (ak ? .75 : 1.3);
  playTone(310,95,.24,.09,"square");
  setNotice("탄창 교체 중");
  updateInventory();
}
function finishReload() {
  if (reloadWeapon === "ak") {
    const amount = Math.min(30-akMagazine,akReserve);
    akMagazine += amount;
    akReserve -= amount;
  } else {
    const amount = Math.min(5-magazine,reserve);
    magazine += amount;
    reserve -= amount;
  }
  reloadAt = 0;
  playTone(170,440,.15,.09,"triangle");
  setNotice("장전 완료");
  updateInventory();
}
function resupply() {
  if (missionState !== "active") return;
  if (Math.hypot(cameraX-supplyPoint.x,cameraZ-supplyPoint.z) > 3.1) {
    setNotice("뒤로 이동해 보급 상자 근처에서 E");
    return;
  }
  reserve = 15;
  akReserve = 120;
  setNotice("예비 탄약 보급 완료 · R로 장전","hit");
  updateInventory();
}
function markSupply() {
  if (missionState !== "active") return;
  yaw = Math.atan2(supplyPoint.x-cameraX,supplyPoint.z-cameraZ);
  pitch = Math.atan2(ground(supplyPoint.x,supplyPoint.z)+1-eyeY(),Math.hypot(supplyPoint.x-cameraX,supplyPoint.z-cameraZ));
  if (scoped) toggleScope();
  setNotice("보급 상자 방향으로 전환 · W로 접근 후 E");
}
function toggleAP() {
  if (!apRounds) { setNotice("관통탄은 다음 스테이지에서 보급됩니다."); return; }
  weapon = "rifle";
  usingAP = !usingAP;
  updateInventory();
}
function toggleAK() {
  if (missionState !== "active") return;
  triggerHeld = false;
  weapon = weapon === "ak" ? "rifle" : "ak";
  if (weapon === "ak") usingAP = false;
  byId("fire").disabled = !renderer || (Boolean(pending) && weapon !== "ak");
  updateInventory();
}
function playTone(from, to, duration, volume, type, offset = 0) {
  if (!currentAudio || byId("sound").getAttribute("aria-pressed") === "false") return;
  const start = currentAudio.currentTime + offset;
  const oscillator = currentAudio.createOscillator();
  const gain = currentAudio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(.001, start + duration);
  oscillator.connect(gain).connect(currentAudio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}
let blastNoise, blastOutput, soundDisabledByPlayer = false;
function playBlast(light = false) {
  if (!currentAudio || byId("sound").getAttribute("aria-pressed") !== "true") return;
  if (!blastNoise) {
    blastNoise = currentAudio.createBuffer(1,Math.floor(currentAudio.sampleRate*.72),currentAudio.sampleRate);
    const samples = blastNoise.getChannelData(0);
    let bass = 0;
    for (let i=0; i<samples.length; i++) {
      const t = i/currentAudio.sampleRate;
      const white = Math.random()*2-1;
      bass = bass*.93+white*.07;
      samples[i] = Math.tanh(white*Math.exp(-t*47)*1.9+bass*Math.exp(-t*11)*3.3);
    }
    blastOutput = currentAudio.createDynamicsCompressor();
    blastOutput.threshold.value = -7;
    blastOutput.ratio.value = 6;
    blastOutput.attack.value = .003;
    blastOutput.release.value = .18;
    blastOutput.connect(currentAudio.destination);
  }
  const start = currentAudio.currentTime;
  const layers = light ? [[0,3100,.36],[.12,530,.12]] :
    [[0,6100,.97],[0,340,.74],[.106,890,.30],[.247,490,.21],[.421,290,.13],[.63,160,.075]];
  for (const [offset,frequency,volume] of layers) {
    const sample = currentAudio.createBufferSource();
    const filter = currentAudio.createBiquadFilter();
    const gain = currentAudio.createGain();
    sample.buffer = blastNoise;
    filter.type = "lowpass";
    filter.frequency.value = frequency;
    gain.gain.value = volume;
    sample.connect(filter).connect(gain);
    const stereo = currentAudio.createStereoPanner();
    stereo.pan.value = offset === 0 ? 0 : Math.sin(offset*21)*.72;
    gain.connect(stereo).connect(blastOutput);
    sample.start(start+offset);
  }
  playTone(110,36,.65,light ? .055 : .24,"triangle");
  if (!light) {
    playTone(65,41,.79,.105,"sine",.04);
    playTone(2890,1810,1.15,.043,"sine",.075);
  }
}
function playCannon() {
  playBlast();
  playTone(71,25,1.25,.28,"triangle");
  playTone(53,29,.85,.14,"sine",.17);
  playTone(44,24,1.1,.09,"triangle",.42);
}
function resolveEnemyFire(now) {
  for (let index=enemyRounds.length-1;index>=0;index--) {
    if (missionState !== "active") return;
    const shot = enemyRounds[index];
    const {source} = shot;
    const tank = source.role === "tank";
    const sniper = source.role === "sniper";
    if (!shot.launched && (source.state === "down" || source.lostArm || source.lostLeg || now < source.staggerUntil)) {
      enemyRounds.splice(index,1);
      if (damageShot === shot) damageShot = null;
      continue;
    }
    if (now < shot.at) continue;
    if (!shot.launched) {
      shot.launched = true;
      shot.start = now;
      if (tank) source.tankFiredAt=now;
      if (tank) shot.from=tankMuzzle(source,now);
      else {
        const [x,y,z]=enemyWeapon(source,now).tip;
        shot.from={x,y,z};
        source.lastRifleShot=now;
      }
      shot.targetY = tank ? ground(shot.x,shot.z)+.1 : ground(shot.x,shot.z)+cameraHeight-.35;
      shot.at = now+(tank ? .68 : .17);
      if (tank) { playCannon(); cannonKickAt = now; }
      else playBlast(!sniper);
      continue;
    }
    enemyRounds.splice(index,1);
    if (damageShot === shot) damageShot = null;
    const distance = Math.hypot(shot.x-cameraX,shot.z-cameraZ);
    const radius = tank ? 8 : sniper ? 2.4 : 2.1;
    if (tank) {
      impactBlast = {x:shot.x,z:shot.z,since:now};
      playTone(80,28,.75,.21,"triangle");
      if (distance<28) cannonKickAt = now;
    }
    if (distance>=radius) continue;
    const damage = tank ? Math.round(mix(15,45,1-distance/radius)) : sniper ? 28 : 10+Math.floor(stage/5);
    health = Math.max(0,health-damage);
    showEffect("damage",now,.34);
    setNotice(tank ? "전차 포탄 폭발 · 피해 "+damage : "적 총탄 피격 · 피해 "+damage,"miss");
    updateInventory();
    if (!health) finishMission(false,tank ? "전차 포격으로 제압당했습니다." : "적의 사격으로 제압당했습니다.");
  }
}
function showEffect(type,now,duration) {
  const element = byId("effect");
  element.className = "effect " + type;
  element.hidden = false;
  flashUntil = now+duration;
}

let visualYaw = yaw, visualPitch = pitch;
function neutralize(enemy,clue,now) {
  signal(enemy,"down",clue,now);
  hits++;
  if (!living(enemy.t).length) cleared.add(enemy.index);
}
function supportAim(yawAngle,pitchAngle) {
  const dx = Math.sin(yawAngle), dz = Math.cos(yawAngle);
  const scan = distance => {
    const x = cameraX+dx*distance, z = cameraZ+dz*distance;
    return {x,z,groundY:ground(x,z)};
  };
  const y = eyeY(), slope = Math.tan(pitchAngle);
  if (equipment==="launcher") {
    let nearest=Infinity, locked=null;
    for (const tank of enemies) {
      if (tank.role!=="tank" || tank.state==="down") continue;
      const x=tank.x-cameraX, z=tank.z-cameraZ, depth=x*dx+z*dz;
      const height=y+slope*depth-floorAt(tank);
      if (depth>0 && depth<nearest && Math.abs(x*dz-z*dx)<tankSize.halfWidth &&
        height>=0 && height<=tankSize.roof) {
        locked={x:tank.x,z:tank.z,groundY:floorAt(tank),distance:depth};
        nearest=depth;
      }
    }
    if (locked) return locked;
  }
  for (let distance=4;distance<=fieldDepth;distance+=4) {
    const point = scan(distance);
    if (point.z < -15 || Math.abs(point.x)>fieldWidth) break;
    if (y+slope*distance > point.groundY) continue;
    let low = distance-4, high = distance;
    for (let step=0;step<6;step++) {
      const mid = (low+high)/2;
      if (y+slope*mid > scan(mid).groundY) low = mid;
      else high = mid;
    }
    const target = scan(high);
    return target.z >= 22 && target.z <= fieldDepth ? {...target,distance:high} : null;
  }
  return null;
}
let supportPreview = null;
function updateSupportHud(now,yawAngle,pitchAngle) {
  const element = byId("support-hud");
  const text = byId("support-status");
  element.hidden = !equipment && !support;
  if (element.hidden) { supportPreview = null; return; }
  supportPreview = equipment ? supportAim(yawAngle,pitchAngle) : null;
  const state = support ? "incoming" : supportPreview ? "ready" : "invalid";
  element.dataset.state = state;
  const size = supportPreview ? clamp(view.clientHeight*kits[equipment].radius/
    (supportPreview.distance*Math.tan(fov()/2)),42,Math.min(view.clientWidth*.75,view.clientHeight*.48)) : 80;
  const ringSize = Math.round(size)+"px";
  if (element.style.getPropertyValue("--support-size") !== ringSize) element.style.setProperty("--support-size",ringSize);
  const label = support ? support.name + " · " + Math.max(0,support.at-now).toFixed(1) + "초" :
    supportPreview ? kits[equipment].name + " · 클릭 호출 / 우클릭 취소" : "협곡 바닥을 조준하세요";
  if (text.textContent !== label) text.textContent = label;
}
function callSupport(origin,now) {
  const id = equipment, kit = kits[id];
  const point = supportAim(visualYaw,visualPitch);
  if (!point) { setNotice("협곡 바닥을 조준하세요."); return; }
  const {x,z} = point;
  const options = id === "orbit" ? ["궤도 레이저","유성 미사일","지원 헬기"] :
    id === "air" ? ["지원 헬기","폭격 편대","기총소사"] : [kit.name];
  const name = options[Math.floor(Math.random()*options.length)];
  credits -= kit.cost;
  supportSpent += kit.cost;
  equipment = null;
  restoreScope();
  support = {id,x,z,at:now+(id === "wand" ? .18 : id === "launcher" ? .7 : 1.65),radius:kit.radius,name,origin};
  updateSupportHud(now,visualYaw,visualPitch);
  setNotice(name + " · 지정 지점 접근 중","hit");
  if (id === "wand") {
    for (let i=0;i<4;i++) playTone(500+i*190,850+i*210,.19,.08,"sine",i*.085);
  } else playTone(160,270,.28,.075,"triangle");
  updateInventory();
  renderShop();
}
function resolveSupport(now) {
  const wave = support;
  support = null;
  let count = 0;
  for (const enemy of enemies) {
    const tank = enemy.role === "tank";
    if (enemy.state === "down" || tank && wave.id === "wand" ||
      Math.hypot(enemy.x-wave.x,enemy.z-wave.z)>wave.radius+(tank ? tankSize.halfWidth : 0)) continue;
    neutralize(enemy,wave.origin,now);
    count++;
  }
  deployment = {...wave,until:now+1.65};
  showEffect(wave.id === "wand" || wave.name.includes("레이저") ? "beam" : "",now,.43);
  if (wave.id !== "wand") playBlast();
  if (cleared.size === stations.length) finishMission(true);
  else setNotice(wave.name + " · " + count + "명/대 제압",count ? "hit" : "miss");
  updateDisplay();
}
function fire(now = nowSeconds()) {
  if (missionState !== "active") return;
  const origin = { x: cameraX, y: eyeY(), z: cameraZ };
  if (equipment) {
    if (!support) callSupport(origin,now);
    return;
  }
  const ak = weapon === "ak", ap = !ak && usingAP && apRounds > 0;
  if ((!ak && pending) || reloadAt || now < boltUntil) return;
  if ((ak ? akMagazine : magazine) === 0) { setNotice("탄창이 비었습니다 · R","miss"); return; }
  if (ak) akMagazine--;
  else magazine--;
  if (ap && !--apRounds) usingAP = false;
  let shotYaw=visualYaw, shotPitch=visualPitch;
  if (ak) {
    burstHeat=clamp(burstHeat-(now-lastAutomaticShot)*2.3,0,6);
    const spread=(scoped ? .0015 : .003)*burstHeat;
    shotYaw+=(hash(shots,terrainSeed)-.5)*2*spread;
    shotPitch+=(hash(terrainSeed,shots)-.4)*spread;
    burstHeat=Math.min(6,burstHeat+1);
    lastAutomaticShot=now;
  }
  const target = targetInSight(shotYaw,shotPitch);
  const t = target?.t ?? station();
  const z = target?.z ?? t.z;
  const distance = Math.hypot((target?.x ?? t.x)-origin.x,z-origin.z);
  const {aimX,aimY} = shotAim(t,shotYaw,shotPitch,ak,distance);
  const depth = z - origin.z;
  const round = {number:++shots,t,x:origin.x+aimX*depth,y:origin.y+aimY*depth,z,aimX,aimY,origin,start:now,yaw:shotYaw,pitch:shotPitch,
    ak,ap,range:distance,flight:distance < 6 ? 0 : distance/(ak ? 525 : 920)};
  if (ak) automaticRounds.push(round);
  else pending = round;
  recoilAt = now;
  boltUntil = now+(ak ? .10 : .46);
  impact = null;
  byId("fire").disabled = !ak;
  byId("shots").textContent = shots + "발";
  if (!ak && round.flight >= .2) setNotice("탄 비행 중 · " + round.flight.toFixed(1) + "초");
  for (const e of enemies) {
    if (e.state === "down" || Math.hypot(e.x-origin.x,e.z-origin.z)>44) continue;
    e.sound = {x:origin.x+4*Math.sin(shots*3),z:origin.z+4*Math.cos(shots*3),at:now};
    if (e.state === "patrol") signal(e,"listen",e.sound,now);
  }
  playBlast(ak);
  showEffect("",now,.12);
  updateInventory();
  if (!round.flight) resolveShot(now,ak ? automaticRounds.pop() : round);
}
function shotAim(t,yawAngle,pitchAngle,ak,distance = Math.hypot(t.x,t.z)) {
  const cosine = Math.cos(yawAngle), side = cosine >= 0 ? 1 : -1;
  const heading = side*Math.max(.001,Math.abs(cosine));
  const ratio = distance/Math.hypot(t.x,t.z);
  return {aimX:Math.tan(yawAngle)+side*t.drift*(ak ? .82 : .57)*ratio,
    aimY:Math.tan(pitchAngle)/heading-side*t.drop*(ak ? .78 : .48)*ratio};
}
function targetInSight(yawAngle,pitchAngle) {
  let best = Infinity, candidate = null;
  for (const e of enemies) {
    if (e.state === "down") continue;
    const distance = e.z-cameraZ;
    if (distance*Math.cos(yawAngle) <= 0) continue;
    const range = Math.hypot(e.x-cameraX,distance);
    const {aimX,aimY} = shotAim(e.t,yawAngle,pitchAngle,weapon === "ak",range);
    const gap = Math.hypot(cameraX+aimX*distance-e.x,eyeY()+aimY*distance-floorAt(e)-aimHeight(e))/range;
    const score = gap + range*.00004;
    if (score < best) { best = score; candidate = e; }
  }
  return candidate;
}
function rangeTarget() {
  const dx = Math.sin(visualYaw), dz = Math.cos(visualYaw);
  const slope = Math.tan(visualPitch), y = eyeY();
  let nearest = Infinity, target = null;
  for (const enemy of enemies) {
    if (enemy.state === "down") continue;
    const x = enemy.x-cameraX, z = enemy.z-cameraZ;
    const depth = x*dx+z*dz;
    const tolerance = Math.max(1.7,depth*.012);
    if (depth <= 0 || depth >= nearest || Math.abs(x*dz-z*dx)>tolerance ||
      Math.abs(floorAt(enemy)+aimHeight(enemy)-y-slope*depth)>tolerance) continue;
    nearest = depth;
    target = enemy;
  }
  return target;
}
const distanceLabel = range => Math.round(range*8).toLocaleString("ko-KR")+" m";
function measureRange() {
  if (missionState !== "active" || equipment) return;
  if (!scoped) toggleScope();
  const target = rangeTarget();
  const groundHit = target ? null : supportAim(visualYaw,visualPitch);
  if (!target && !groundHit) {
    rangeMeasurement = null;
    byId("range").textContent = "— m";
    setNotice("표적이나 지면을 조준해 거리를 측정하세요.");
    return;
  }
  const point = target ?? groundHit;
  const t = target?.t ?? station();
  const range = Math.hypot(point.x-cameraX,point.z-cameraZ);
  rangeMeasurement = {t,range,label:distanceLabel(range)};
  byId("range").textContent = rangeMeasurement.label;
  playTone(740,990,.13,.09,"sine");
}
function updateRangeHud() {
  const caption = byId("scope-range"), mark = byId("range-reticle");
  caption.hidden = !scoped;
  mark.hidden = !scoped || !rangeMeasurement;
  if (!scoped) return;
  if (!rangeMeasurement) {
    const target = rangeTarget();
    const label = target ? distanceLabel(Math.hypot(target.x-cameraX,target.z-cameraZ))+" · ` 보정" : "` 거리 측정";
    if (caption.textContent !== label) caption.textContent = label;
    return;
  }
  const {t,range,label} = rangeMeasurement;
  const cx = Math.cos(visualYaw), sx = Math.sin(visualYaw);
  const cy = Math.cos(visualPitch), sy = Math.sin(visualPitch);
  if (Math.abs(cx)<.05) { mark.hidden = true; return; }
  const {aimX,aimY} = shotAim(t,visualYaw,visualPitch,weapon === "ak",range);
  const z = range*cx, x = aimX*z, y = aimY*z;
  const depth = x*sx*cy+y*sy+z*cx*cy;
  const pixels = view.clientHeight/(2*Math.tan(fov()/2)*depth);
  const horizontal = (x*cx-z*sx)*pixels;
  const vertical = (x*sx*sy-y*cy+z*cx*sy)*pixels;
  mark.style.transform = "translate(calc(-50% + "+horizontal+"px),calc(-50% + "+vertical+"px))";
  if (caption.textContent !== label) caption.textContent = label;
}

function resolveShot(now, round = pending) {
  const active = living(round.t);
  const direction = Math.sign(Math.cos(round.yaw));
  let modelHit=null;
  let tankHit=null;
  const victim = enemies.filter(e=>e.state!=="down").sort((a,b)=>(a.z-b.z)*direction).find(e => {
    const depth = e.z-round.origin.z;
    if (depth*direction <= 0) return false;
    const range = Math.hypot(e.x-round.origin.x,depth);
    const allowance=e.role==="tank" ? tankSize.halfLength : 0;
    if (range > round.range + allowance + (round.flight ? 8 : 0)) return false;
    if (importedEnemyModel?.joints && e.role!=="tank") {
      modelHit=intersectModel(e,round,now);
      return Boolean(modelHit);
    }
    const {aimX,aimY} = shotAim(e.t,round.yaw,round.pitch,round.ak,range);
    const offset = round.origin.x+aimX*depth-e.x;
    const along = Math.abs(offset);
    const height = round.origin.y+aimY*depth-floorAt(e);
    if (e.role === "tank") {
      const port=tankPort(e), portDepth=port.z-round.origin.z;
      const error=Math.hypot(round.origin.x+aimX*portDepth-port.x,round.origin.y+aimY*portDepth-port.y);
      if (portDepth*direction>0 && error<tankPortRadius) { tankHit={z:port.z,port:true}; return true; }
      const c=Math.cos(e.hullYaw), s=Math.sin(e.hullYaw);
      for (let sample=-25*direction;sample*direction<=25;sample+=direction) {
        const z=e.z+sample;
        const d=z-round.origin.z;
        if (d*direction<=0) continue;
        const dx=round.origin.x+aimX*d-e.x;
        const y=round.origin.y+aimY*d-floorAt(e);
        const localX=dx*c+sample*s, localZ=-dx*s+sample*c;
        const hull=y>=0 && y<=2.25*tankScale && Math.abs(localX)<=tankSize.halfWidth && Math.abs(localZ)<=tankSize.halfLength;
        const turret=y>2.25*tankScale && y<=tankSize.roof && Math.hypot(dx,sample)<2.1*tankScale;
        if (hull || turret) {tankHit={z,port:false};return true;}
      }
      return false;
    }
    if (e.lostLeg) return height >= .2 && height <= 1.3 && along <= .78;
    if (height >= 1.85 && height < 2.92 && along > .57 && Math.sign(offset) === e.lostArm) return false;
    return height >= .2 && height <= 3.8 && along <= (height >= 2.94 ? .59 : 1);
  });
  const actor = victim ?? active[0];
  if (actor) {
    round.t = actor.t;
    const range = Math.hypot(actor.x-round.origin.x,actor.z-round.origin.z);
    Object.assign(round,shotAim(actor.t,round.yaw,round.pitch,round.ak,range));
    round.z = modelHit?.z ?? tankHit?.z ?? actor.z;
    const depth = round.z-round.origin.z;
    round.x = round.origin.x+round.aimX*depth;
    round.y = round.origin.y+round.aimY*depth;
  }
  round.hit = Boolean(victim);
  let eliminated = false, result = "빗나감";
  if (victim) {
    landed++;
    const height = round.y-floorAt(victim);
    const offset = round.x-victim.x;
    const limb = modelHit ? (modelHit.side ? modelHit.part : "") : victim.lostLeg ? "" : height < 1.52 ? "leg" :
      height < 2.92 && height >= 1.85 && Math.abs(offset) > .57 ? "arm" : "";
    const limbSide=modelHit?.side || (offset<0 ? -1 : 1);
    if (victim.role === "tank") {
      eliminated = victim.weakCore && !round.ak && tankHit?.port;
      result = eliminated ? "게임 코어 파괴" : "전차 장갑 · 4 대장갑 장비";
    } else if (round.ap) {
      eliminated = true;
      result = "장갑 관통";
    } else if (!victim.lostLeg && (!modelHit || modelHit.part==="body") && Math.abs(offset) < .23 && Math.abs(height-2.54) < .23) {
      eliminated = true;
      result = "심장부 치명타";
    } else if (!victim.lostLeg && (!modelHit || modelHit.part==="body") && Math.hypot(offset-beltTarget.x,height-beltTarget.y) < beltTarget.radius) {
      eliminated = true;
      result = "허리 장비 치명타";
    } else if (modelHit ? modelHit.part==="head" : height >= 2.94) {
      eliminated = ++victim.headHits >= (stage >= 10 ? 2 : 1);
      result = eliminated ? "헤드샷" : "헬멧 파손";
    } else {
      const distance=Math.hypot(victim.x-round.origin.x,victim.z-round.origin.z);
      const required=round.ak && distance>130 && !limb && !victim.lostLeg ? 3 : stage>=10 && victim.headHits ? 1 : 2;
      eliminated = ++victim.bodyHits >= required;
      result = eliminated ? "제압" : limb === "leg" ? "다리 손상 · 포복" : limb === "arm" ? "팔 손상 · 무기 사용 불가" : "몸통 명중 · 비틀거림";
    }
    if (victim.role !== "tank") {
      if (result !== "헬멧 파손") {
        const facing = Math.cos(round.yaw) >= 0 ? -1 : 1;
        round.bloody = true;
        victim.blood = {offset,height,facing};
        bloodImpacts.push({x:round.x,y:round.y,z:round.z+facing*.46,since:now,seed:round.number,facing});
      }
      victim.hitAt = now;
      victim.staggerUntil = now+(height < 1.52 ? 1.85 : 1.2);
      if (limb === "leg") victim.lostLeg ||= limbSide;
      if (limb === "arm") victim.lostArm ||= limbSide;
      if (limb === "leg" || !victim.injury) victim.injury = limb === "leg" ? "leg" : "upper";
      if (limb) {
        round.detached = limb;
        round.limbSide = limbSide;
      }
      if (damageShot?.source === victim) damageShot = null;
    }
    if (eliminated) neutralize(victim,round.origin,now);
  }
  reactToImpact(round,victim,eliminated,now);
  impact = { ...round, since: now };
  history.unshift({ number: round.number, name: round.t.name, hit: round.hit, result });
  history = history.slice(0, 6);
  if (pending === round) pending = null;
  byId("fire").disabled = !renderer || (Boolean(pending) && weapon !== "ak");
  if (round.hit) {
    if (cleared.size === stations.length) finishMission(true);
    else setNotice(result, "hit");
    playTone(860, 470, .3, .11, "sine");
  } else {
    const horizontal = round.x - (actor?.x ?? round.t.x);
    const vertical = actor ? round.y - floorAt(actor) - aimHeight(actor) : 0;
    const direction = [vertical > .4 ? "위" : vertical < -.4 ? "아래" : "",
      horizontal > .4 ? "오른쪽" : horizontal < -.4 ? "왼쪽" : ""].filter(Boolean).join(" · ");
    setNotice(direction ? "빗나감 · " + direction : "빗나감", "miss");
    playTone(105, 55, .18, .08, "triangle");
  }
  updateDisplay();
}
function finishMission(success,message) {
  missionState = success ? "won" : "lost";
  pending = null;
  automaticRounds.length = 0;
  triggerHeld = false;
  enemyRounds.length = 0;
  damageShot = null;
  byId("fire").disabled = true;
  keys.clear();
  holdKey = holdToggle = false;
  if (document.pointerLockElement === view) document.exitPointerLock();
  equipment = support = supportPreview = null;
  restoreScope();
  const refund = !success ? supportSpent : 0;
  if (refund) credits = attemptCredits;
  supportSpent = 0;
  if (success) {
    if (stage === unlockedStage && stage >= clearedCount) {
      credits += 3+(stage%4 === 3 ? 2 : 0);
      clearedCount = stage+1;
      unlockedStage = Math.min(campaign.length-1,stage+1);
    }
    saveCampaign();
  }
  const outcome = message ?? (success ? (stage === campaign.length-1 ? "캠페인 완료" : "작전 성공 · 장비 보급 획득") : "작전 종료 · 제한 시간 초과");
  setNotice(outcome+(refund ? " · 지원비 "+refund+" C 반환" : ""), success ? "hit" : "miss");
  updateInventory();
  byId("engage").textContent = success && stage < campaign.length-1 ? "다음 스테이지" : "다시 도전";
  byId("engage").hidden = false;
  renderCampaignStages();
}
let deployment = null;

let renderer = null;

function createRenderer(context) {
  const vertex = `
    attribute vec3 point;
    attribute vec3 tint;
    attribute vec2 texCoord;
    attribute vec4 joints;
    attribute vec4 weights;
    uniform vec3 origin;
    uniform vec3 right;
    uniform vec3 up;
    uniform vec3 forward;
    uniform vec2 lens;
    uniform vec3 modelOrigin;
    uniform vec3 modelPose;
    uniform vec2 modelFacing;
    uniform bool skinned;
    uniform vec3 missing;
    uniform vec4 jointRows[48];
    varying vec3 color;
    varying vec2 uv;
    varying float depth;
    varying float removed;
    vec3 skinPoint(float joint,vec4 position) {
      int row=int(joint)*3;
      return vec3(dot(jointRows[row],position),dot(jointRows[row+1],position),dot(jointRows[row+2],position));
    }
    float lost(float joint) {
      return ((missing.x < 0.0 && joint>=4.0 && joint<=6.0) ||
        (missing.x > 0.0 && joint>=10.0 && joint<=12.0) ||
        (missing.y < 0.0 && joint>=7.0 && joint<=9.0) ||
        (missing.y > 0.0 && joint>=13.0 && joint<=15.0)) ? 1.0 : 0.0;
    }
    void main() {
      vec3 p = point;
      removed = 0.0;
      if (skinned) {
        vec4 q=vec4(point,1.0);
        p=skinPoint(joints.x,q)*weights.x + skinPoint(joints.y,q)*weights.y +
          skinPoint(joints.z,q)*weights.z + skinPoint(joints.w,q)*weights.w;
        removed=dot(vec4(lost(joints.x),lost(joints.y),lost(joints.z),lost(joints.w)),weights);
      }
      vec3 posed = vec3(p.x + p.y * modelPose.z,
        p.y * modelPose.x - p.z * modelPose.y,
        p.y * modelPose.y + p.z * modelPose.x);
      posed.xz=vec2(posed.x*modelFacing.x-posed.z*modelFacing.y,
        posed.x*modelFacing.y+posed.z*modelFacing.x);
      vec3 offset = posed + modelOrigin - origin;
      float z = dot(offset, forward);
      gl_Position = vec4(dot(offset, right) * lens.x, dot(offset, up) * lens.y, z * 1.0008 - .18, z);
      color = tint;
      uv = texCoord;
      depth = z;
    }`;
  const fragment = `
    precision mediump float;
    varying vec3 color;
    varying vec2 uv;
    varying float depth;
    varying float removed;
    uniform sampler2D diffuseMap;
    uniform bool textured;
    void main() {
      float fog = 1.0 - exp(-max(depth, 0.0) * .00087);
      vec4 surface = textured ? texture2D(diffuseMap,uv) : vec4(1.0);
      if (surface.a < .1 || removed > .47) discard;
      gl_FragColor = vec4(mix(color*surface.rgb, vec3(.69, .70, .62), fog), 1.0);
    }`;
  function shader(kind, source) {
    const result = context.createShader(kind);
    context.shaderSource(result, source);
    context.compileShader(result);
    if (!context.getShaderParameter(result, context.COMPILE_STATUS)) throw new Error(context.getShaderInfoLog(result));
    return result;
  }
  const program = context.createProgram();
  for (const item of [shader(context.VERTEX_SHADER, vertex),shader(context.FRAGMENT_SHADER, fragment)]) {
    context.attachShader(program,item);
    context.deleteShader(item);
  }
  context.linkProgram(program);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) throw new Error(context.getProgramInfoLog(program));
  const point = context.getAttribLocation(program, "point");
  const tint = context.getAttribLocation(program, "tint");
  const texCoord = context.getAttribLocation(program,"texCoord");
  const jointAttribute = context.getAttribLocation(program,"joints");
  const weightAttribute = context.getAttribLocation(program,"weights");
  const uniforms = Object.fromEntries(["origin","right","up","forward","lens","modelOrigin","modelPose","modelFacing","textured","diffuseMap","skinned","missing","jointRows[0]"].map(name => [name,context.getUniformLocation(program,name)]));
  const land = [], props = [];
  function triangle(mesh, a, b, c, color) {
    mesh.push(...a, ...color, ...b, ...color, ...c, ...color);
  }
  function quad(mesh, a, b, c, d, color) {
    triangle(mesh, a, b, c, color);
    triangle(mesh, a, c, d, color);
  }
  function box(mesh, x, y, z, w, h, d, color) {
    const a = [x-w,y,z-d], b = [x+w,y,z-d], c = [x+w,y+h,z-d], e = [x-w,y+h,z-d];
    const f = [x-w,y,z+d], g = [x+w,y,z+d], i = [x+w,y+h,z+d], j = [x-w,y+h,z+d];
    quad(mesh,a,b,c,e,color);
    quad(mesh,f,g,i,j,color);
    const dark = color.map(value => value * .73);
    quad(mesh,a,f,j,e,dark);
    quad(mesh,b,g,i,c,dark);
    quad(mesh,e,c,i,j,color.map(value => Math.min(1,value * 1.14)));
  }
  function disc(mesh, x, y, z, radius, color) {
    for (let i = 0; i < 32; i++) {
      const a = Math.PI * i / 16, b = Math.PI * (i + 1) / 16;
      triangle(mesh, [x,y,z], [x+Math.cos(a)*radius,y+Math.sin(a)*radius,z], [x+Math.cos(b)*radius,y+Math.sin(b)*radius,z], color);
    }
  }
  function roundedForm(mesh, x, y, z, width, height, depth, color) {
    const divisions = 10;
    const pointAt = (latitude, longitude) => {
      const a = latitude*Math.PI/5-Math.PI/2;
      const b = longitude*Math.PI*2/divisions;
      return [x+width*Math.cos(a)*Math.sin(b),y+height*Math.sin(a),z+depth*Math.cos(a)*Math.cos(b)];
    };
    for (let row=0;row<5;row++) {
      for (let col=0;col<divisions;col++) {
        const light = .75+.25*(Math.cos((col+.5)*Math.PI*2/divisions)*-.55+row/5*.55+.45);
        quad(mesh,pointAt(row,col),pointAt(row,col+1),pointAt(row+1,col+1),pointAt(row+1,col),
          color.map(channel=>Math.min(1,channel*light)));
      }
    }
  }
  function terrainFace(a, b, c) {
    const normalX = (b[1]-a[1])*(c[2]-a[2]) - (b[2]-a[2])*(c[1]-a[1]);
    const normalY = (b[2]-a[2])*(c[0]-a[0]) - (b[0]-a[0])*(c[2]-a[2]);
    const normalZ = (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]);
    const shade = .74 + .24 * (normalX * -.55 + normalY * .78 + normalZ * -.29) / Math.hypot(normalX,normalY,normalZ);
    const layer = Math.sin((a[1]+b[1]+c[1]) * .75) * .035;
    const tone = noise(a[0] / 19, a[2] / 13) * .14 + hash(a[0],a[2]) * .055 + layer;
    triangle(land,a,b,c,[(.59+tone)*shade,(.43+tone)*shade,(.295+tone*.8)*shade]);
  }
  const vertexAt = (x,z) => [x,ground(x,z),z];
  for (let z = -15; z < fieldDepth; z += 4) {
    for (let x = -fieldWidth; x < fieldWidth; x += 4) {
      const a = vertexAt(x,z), b = vertexAt(x+4,z), c = vertexAt(x+4,z+4), d = vertexAt(x,z+4);
      terrainFace(a,d,b);
      terrainFace(b,d,c);
    }
  }
  for (let i = 0; i < 1650; i++) {
    const x = (hash(i,2)-.5)*440, z = hash(i,3)*637 + 8, y = ground(x,z) - .2;
    if (stations.some(t => Math.hypot(t.x-x,t.z-z) < 4)) continue;
    const size = .15 + hash(i,4)**3 * 1.05;
    if (i % 4 === 0) {
      const rock = [.43,.34,.24];
      const top = [x+size*.28,y+size*1.35,z+size*.07];
      const a = [x-size,y,z-size*.65], b = [x+size,y,z-size], c = [x+size*.9,y,z+size], d = [x-size*.75,y,z+size*.7];
      triangle(props,a,b,top,rock);
      triangle(props,b,c,top,[.33,.25,.18]);
      triangle(props,c,d,top,[.36,.28,.20]);
      triangle(props,d,a,top,[.53,.42,.29]);
    } else {
      const color = i % 3 ? [.32,.35,.22] : [.43,.42,.26];
      for (let leaf = 0; leaf < 5; leaf++) {
        const direction = leaf * 2.4 + i;
        triangle(props,[x-.13,y,z],[x+.13,y,z], [x+Math.cos(direction)*size,y+size*(.75+hash(i,leaf)),z+Math.sin(direction)*size],color);
      }
    }
  }
  for (const t of stations) {
    const base = ground(t.x,t.z);
    box(props,t.x-4,base-.4,t.z+4,2.2,1.6,1.2,[.42,.39,.29]);
    box(props,t.x+3,base-.4,t.z+5,1.4,2.1,1.3,[.35,.37,.29]);
  }
  const depot = ground(supplyPoint.x,supplyPoint.z);
  box(props,supplyPoint.x,depot,supplyPoint.z,1.28,1.15,.90,[.55,.64,.30]);
  box(props,supplyPoint.x,depot+1.17,supplyPoint.z,1.46,.20,1.06,[.74,.82,.40]);
  function drawTank(mesh,e,now) {
    const floor=floorAt(e);
    const knockedOut=e.state==="down";
    const armor=knockedOut ? [.24,.22,.19] : [.40,.43,.31];
    const track=[.18,.19,.17], metal=[.27,.30,.25];
    function rotateFrom(start,angle) {
      const c=Math.cos(angle), s=Math.sin(angle);
      for (let i=start;i<mesh.length;i+=6) {
        const x=mesh[i], z=mesh[i+2];
        mesh[i]=e.x+(x*c-z*s)*tankScale;
        mesh[i+1]=floor+(mesh[i+1]-floor)*tankScale;
        mesh[i+2]=e.z+(x*s+z*c)*tankScale;
      }
    }
    const hullStart=mesh.length;
    for (const side of [-1,1]) {
      const x=side*2.52;
      box(mesh,x,floor+.12,0,.72,1.45,5.42,track);
      const treadOffset=(e.steps*.26)%1;
      for (let i=-5;i<=5;i++) {
        const z=i+treadOffset;
        if (z>5.36) continue;
        box(mesh,x,floor+1.43,z,.74,.16,.27,metal);
        box(mesh,x,floor+.11,z,.74,.14,.27,metal);
      }
      for (let i=-4;i<=4;i++) {
        const z=i*1.04;
        roundedForm(mesh,side*3.16,floor+.83,z,.15,.43,.43,metal);
        roundedForm(mesh,side*3.28,floor+.83,z,.12,.19,.19,track);
      }
      box(mesh,side*2.67,floor+1.3,.16,.58,.58,4.94,armor);
    }
    box(mesh,0,floor+.77,0,2.38,1.19,5.4,armor);
    box(mesh,0,floor+1.89,.45,2.39,.36,4.76,armor);
    quad(mesh,[-2.36,floor+1.32,-5.85],[2.36,floor+1.32,-5.85],
      [2.36,floor+2.22,-4.42],[-2.36,floor+2.22,-4.42],armor);
    for (let i=0;i<5;i++) box(mesh,0,floor+2.26,2.72+i*.30,1.45,.08,.065,track);
    box(mesh,-1.85,floor+1.88,-5.39,.26,.21,.11,[.83,.78,.52]);
    box(mesh,1.85,floor+1.88,-5.39,.26,.21,.11,[.83,.78,.52]);
    if (!knockedOut) disc(mesh,0,floor+tankSize.portHeight/tankScale,-4.48,tankPortRadius/tankScale,[.91,.65,.25]);
    rotateFrom(hullStart,e.hullYaw);
    const turretStart=mesh.length;
    const recoil=Math.exp(-9*Math.max(0,now-e.tankFiredAt))*.54;
    roundedForm(mesh,0,floor+2.84,-.4,2.15,1.04,2.7,armor);
    box(mesh,0,floor+2.76,-2.65,.91,.67,.56,metal);
    box(mesh,.79,floor+3.63,.58,.60,.31,.59,metal);
    box(mesh,-.85,floor+3.51,.45,.36,.44,.29,armor);
    box(mesh,-1.2,floor+3.68,1.42,.032,1.04,.032,track);
    const barrelCenter=-4.7+recoil;
    for (let i=0;i<12;i++) {
      const angle=i*Math.PI/6, next=(i+1)*Math.PI/6;
      const ring=(a,z,r)=>[Math.cos(a)*r,floor+tankSize.gunHeight/tankScale+Math.sin(a)*r,z];
      const shade=i<6 ? metal : track;
      quad(mesh,ring(angle,barrelCenter+1.78,.28),ring(next,barrelCenter+1.78,.28),
        ring(next,barrelCenter-1.95,.17),ring(angle,barrelCenter-1.95,.17),shade);
    }
    box(mesh,0,floor+tankSize.gunHeight/tankScale-.23,-6.45+recoil,.26,.46,.22,metal);
    disc(mesh,0,floor+tankSize.gunHeight/tankScale,-6.68+recoil,.14,[.07,.08,.07]);
    rotateFrom(turretStart,e.turretYaw);
  }
  function patrolMesh(mesh, e, now) {
    const { x, z } = e;
    const floor = floorAt(e);
    const stride = Math.sin(e.steps)*.29*Math.min(1,e.pace)*(e.injury === "leg" ? .48 : 1);
    const palettes = [
      {cloth:[.24,.18,.35],vest:[.48,.31,.73],hair:[.28,.17,.44],trim:[.94,.86,.96]},
      {cloth:[.22,.27,.32],vest:[.30,.52,.64],hair:[.68,.33,.24],trim:[.78,.91,.96]},
      {cloth:[.32,.17,.23],vest:[.65,.33,.47],hair:[.78,.60,.36],trim:[.99,.83,.88]}
    ];
    const {cloth,vest,hair,trim} = palettes[(e.index+Math.abs(e.side))%palettes.length];
    const dark = [.14,.12,.19], face = [.70,.52,.42];
    const stainedCloth = e.blood ? cloth.map((channel,i) => mix(channel,[.32,.075,.095][i],.36)) : cloth;
    if (e.role === "tank") {
      drawTank(mesh,e,now);
      return;
    }
    if (e.state === "down") {
      box(mesh,x,floor,z,.55,.34,.98,e.blood ? stainedCloth : vest);
      box(mesh,x,floor,z+.98,.28,.33,.32,dark);
      for (const side of [-1,1]) {
        if (e.lostLeg !== side) box(mesh,x+side*.30,floor,z-1,.20,.24,.56,cloth);
      }
      return;
    }
    if (e.lostLeg) {
      const crawl = Math.sin(e.steps*2)*.25*Math.min(1,e.pace);
      roundedForm(mesh,x,floor+.47,z,.58,.31,.77,e.blood ? stainedCloth : vest);
      roundedForm(mesh,x,floor+.88,z-.62,.34,.33,.37,hair);
      roundedForm(mesh,x,floor+.83,z-.79,.27,.24,.23,face);
      box(mesh,x,floor+.51,z-.53,.42,.14,.35,trim);
      box(mesh,x+e.lostLeg*-.30,floor,z+.91,.22,.26,.60,cloth);
      for (const side of [-1,1]) {
        if (e.lostArm !== side) box(mesh,x+side*.61,floor+.10,z-.43+side*crawl,.17,.24,.55,cloth);
      }
      return;
    }
    const start = mesh.length;
    const legStain = e.blood?.height < 1.52 ? Math.sign(e.blood.offset) || 1 : 0;
    box(mesh,x-.34+stride,floor+.15,z,.22,1.47,.25,legStain < 0 ? stainedCloth : cloth);
    box(mesh,x+.34-stride,floor+.15,z,.22,1.47,.25,legStain > 0 ? stainedCloth : cloth);
    box(mesh,x-.34+stride,floor,z-.07,.24,.24,.32,dark);
    box(mesh,x+.34-stride,floor,z-.07,.24,.24,.32,dark);
    box(mesh,x,floor+1.55,z,.48,.61,.35,dark);
    disc(mesh,x+beltTarget.x,floor+beltTarget.y,z-.37,beltTarget.radius,[.48,.81,1]);
    roundedForm(mesh,x,floor+2.40,z,.60,.58,.39,vest);
    box(mesh,x,floor+1.98,z-.24,.44,.14,.13,trim);
    if (e.lostArm !== -1) box(mesh,x-.67,floor+1.88,z-.09,.17,1.01,.25,cloth);
    if (e.lostArm !== 1) box(mesh,x+.67,floor+1.91,z-.16,.17,.95,.25,cloth);
    roundedForm(mesh,x,floor+3.28,z-.06,.38,.38,.32,face);
    roundedForm(mesh,x,floor+3.41,z+.11,.43,.36,.36,hair);
    const hairLength = [ .33,.46,.57 ][(e.index+Math.abs(e.side))%palettes.length];
    roundedForm(mesh,x+.30,floor+3.14,z+.16,.18,hairLength,.25,hair);
    roundedForm(mesh,x-.34,floor+3.23,z+.13,.14,hairLength*.8,.24,hair);
    triangle(mesh,[x-.38,floor+3.50,z-.34],[x+.25,floor+3.57,z-.34],[x-.11,floor+3.27,z-.38],hair);
    for (const side of [-1,1]) {
      const eye = x+side*.15;
      disc(mesh,eye,floor+3.25,z-.363,.059,[.94,.93,.90]);
      disc(mesh,eye,floor+3.25,z-.367,.041,vest);
      disc(mesh,eye-.009,floor+3.269,z-.371,.016,[1,1,1]);
    }
    box(mesh,x,floor+3.065,z-.315,.047,.018,.015,[.53,.24,.29]);
    box(mesh,x,floor+2.84,z-.36,.32,.11,.09,trim);
    const bowZ = z-.47;
    triangle(mesh,[x, floor+2.86,bowZ],[x-.32,floor+2.99,bowZ],[x-.32,floor+2.73,bowZ],dark);
    triangle(mesh,[x, floor+2.86,bowZ],[x+.32,floor+2.99,bowZ],[x+.32,floor+2.73,bowZ],dark);
    for (const side of [-1,1]) {
      const base = x+side*.23;
      quad(mesh,[base-.12,floor+3.62,z],[base+.12,floor+3.62,z],
        [base+side*.24+.08,floor+4.54,z],[base+side*.24-.08,floor+4.54,z],dark);
      quad(mesh,[base-.064,floor+3.72,z-.025],[base+.064,floor+3.72,z-.025],
        [base+side*.20+.04,floor+4.42,z-.025],[base+side*.20-.04,floor+4.42,z-.025],trim);
    }
    if (!e.lostArm) box(mesh,x+.21,floor+2.07,z-.38,.78,.24,.13,dark);
    disc(mesh,x,floor+2.54,z-.45,.23,[1,.75,.29]);
    if (e.role === "sniper") {
      if (!e.lostArm) box(mesh,x+.60,floor+2.21,z-.48,.15,.15,.69,[.32,.84,.79]);
      box(mesh,x,floor+3.47,z-.35,.43,.16,.17,[.27,.77,.75]);
    }
    if (hasHelmet(e)) box(mesh,x,floor+3.27,z-.02,.45,.46,.43,[.42,.46,.48]);
    if (e.blood && e.blood.height >= 1.52 && e.blood.height < 2.85) {
      const stainX = x+clamp(e.blood.offset,-.43,.43);
      const stainY = floor+e.blood.height;
      const stainZ = z+e.blood.facing*.44;
      disc(mesh,stainX,stainY,stainZ,.14,[.43,.085,.10]);
      disc(mesh,stainX+.07,stainY-.16,stainZ,.065,[.32,.059,.08]);
    }
    if (e.injury) {
      const shock = Math.max(0,1-(now-e.hitAt)/.72);
      const angle = e.injury === "leg" ? .32+.33*shock : .14+.38*shock;
      const lean = Math.sin(angle)*Math.sign(e.side), upright = Math.cos(angle);
      for (let i=start;i<mesh.length;i+=6) {
        const dx = mesh[i]-x, dy = mesh[i+1]-floor;
        mesh[i] = x + dx*upright+dy*lean;
        mesh[i+1] = Math.max(floor,floor+dy*upright-dx*lean);
      }
    }
  }
  function drawBlood(mesh, now) {
    for (const mark of bloodImpacts) {
      const elapsed = now-mark.since;
      if (elapsed < 0 || elapsed > 22) continue;
      const color = [.42,.045,.065];
      if (elapsed < .42) {
        for (let drop=0;drop<12;drop++) {
          const spread = hash(mark.seed,drop)*2-1;
          const speed = 1.2+hash(drop,mark.seed)*2.3;
          const x = mark.x+spread*elapsed*3.6;
          const z = mark.z+mark.facing*elapsed*speed;
          const y = mark.y+(speed*.52)*elapsed-7*elapsed*elapsed;
          disc(mesh,x,y,z,(.05+Math.abs(spread)*.07)*(1-elapsed/.55),color);
        }
      }
      if (elapsed >= .23) {
        const z = mark.z+mark.facing*.45;
        const radius = .28+Math.min(.22,elapsed*.2);
        const edges = Array.from({length:9},(_,i) => {
          const angle = i/9*Math.PI*2;
          const distance = radius*(.66+.34*hash(mark.seed,i));
          const x = mark.x+Math.cos(angle)*distance;
          const depth = z+Math.sin(angle)*distance;
          return [x,ground(x,depth)+.10,depth];
        });
        const center = [mark.x,ground(mark.x,z)+.10,z];
        for (let i=0;i<edges.length;i++) triangle(mesh,center,edges[i],edges[(i+1)%edges.length],color);
      }
    }
  }
  function buffer(vertices, usage) {
    const handle = context.createBuffer();
    context.bindBuffer(context.ARRAY_BUFFER, handle);
    context.bufferData(context.ARRAY_BUFFER, new Float32Array(vertices), usage);
    return { handle, count: vertices.length/6 };
  }
  const terrainBuffer = buffer(land,context.STATIC_DRAW);
  const propsBuffer = buffer(props,context.STATIC_DRAW);
  const actorBuffer = buffer([],context.DYNAMIC_DRAW);
  const markerBuffer = buffer([],context.DYNAMIC_DRAW);
  const importedBuffer = buffer([],context.STATIC_DRAW);
  const importedUv = context.createBuffer();
  const importedSkin = context.createBuffer();
  let importedTextures = [];
  let uploadedModel = null;
  function upload(mesh, vertices) {
    context.bindBuffer(context.ARRAY_BUFFER,mesh.handle);
    context.bufferData(context.ARRAY_BUFFER,new Float32Array(vertices),context.DYNAMIC_DRAW);
    mesh.count = vertices.length/6;
  }
  function draw(mesh,start=0,count=mesh.count) {
    context.bindBuffer(context.ARRAY_BUFFER,mesh.handle);
    context.vertexAttribPointer(point,3,context.FLOAT,false,24,0);
    context.vertexAttribPointer(tint,3,context.FLOAT,false,24,12);
    context.drawArrays(context.TRIANGLES,start,count);
  }
  function drawImportedEnemies(now) {
    if (!importedEnemyModel) return;
    if (uploadedModel !== importedEnemyModel) {
      for (const texture of importedTextures) if (texture) context.deleteTexture(texture);
      upload(importedBuffer,importedEnemyModel.mesh);
      context.bindBuffer(context.ARRAY_BUFFER,importedUv);
      context.bufferData(context.ARRAY_BUFFER,importedEnemyModel.uv,context.STATIC_DRAW);
      if (importedEnemyModel.skin) {
        context.bindBuffer(context.ARRAY_BUFFER,importedSkin);
        context.bufferData(context.ARRAY_BUFFER,importedEnemyModel.skin,context.STATIC_DRAW);
      }
      importedTextures=importedEnemyModel.images.map(image=>{
        if (!image) return null;
        const texture=context.createTexture();
        context.bindTexture(context.TEXTURE_2D,texture);
        context.texImage2D(context.TEXTURE_2D,0,context.RGBA,context.RGBA,context.UNSIGNED_BYTE,image);
        context.texParameteri(context.TEXTURE_2D,context.TEXTURE_WRAP_S,context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D,context.TEXTURE_WRAP_T,context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D,context.TEXTURE_MIN_FILTER,context.LINEAR);
        return texture;
      });
      uploadedModel = importedEnemyModel;
    }
    context.bindBuffer(context.ARRAY_BUFFER,importedUv);
    context.vertexAttribPointer(texCoord,2,context.FLOAT,false,0,0);
    context.enableVertexAttribArray(texCoord);
    const skinned=Boolean(importedEnemyModel.skin);
    context.uniform1i(uniforms.skinned,skinned);
    if (skinned) {
      context.bindBuffer(context.ARRAY_BUFFER,importedSkin);
      context.vertexAttribPointer(jointAttribute,4,context.FLOAT,false,32,0);
      context.vertexAttribPointer(weightAttribute,4,context.FLOAT,false,32,16);
      context.enableVertexAttribArray(jointAttribute);
      context.enableVertexAttribArray(weightAttribute);
    }
    for (const enemy of enemies) {
      if (enemy.role === "tank") continue;
      const {x,y,z,prone,yaw}=modelPlacement(enemy);
      context.uniform3f(uniforms.modelOrigin,x,y,z);
      context.uniform3f(uniforms.modelPose,prone ? 0 : 1,prone ? -1 : 0,0);
      context.uniform2f(uniforms.modelFacing,Math.cos(yaw),Math.sin(yaw));
      if (skinned) {
        context.uniform4fv(uniforms["jointRows[0]"],enemyPose(importedEnemyModel,enemy,now));
        context.uniform3f(uniforms.missing,enemy.lostArm,enemy.lostLeg,0);
      }
      for (const material of importedEnemyModel.groups) {
        if (!material.count || material.pass==="helmet" && !hasHelmet(enemy)) continue;
        if (material.pass==="face" && !importedTextures[1] || material.pass==="faceFallback" && importedTextures[1]) continue;
        const texture=importedTextures[material.texture];
        context.uniform1i(uniforms.textured,Boolean(texture));
        if (texture) context.bindTexture(context.TEXTURE_2D,texture);
        draw(importedBuffer,material.start,material.count);
      }
    }
    context.disableVertexAttribArray(texCoord);
    if (skinned) {
      context.disableVertexAttribArray(jointAttribute);
      context.disableVertexAttribArray(weightAttribute);
    }
    context.uniform1i(uniforms.skinned,0);
    context.uniform1i(uniforms.textured,0);
    context.uniform3f(uniforms.modelOrigin,0,0,0);
    context.uniform3f(uniforms.modelPose,1,0,0);
    context.uniform2f(uniforms.modelFacing,1,0);
  }
  function drawEnemyWeapon(mesh,enemy,now) {
    if (enemy.state==="down" || enemy.lostArm || enemy.lostLeg) return;
    const {grip,direction,tip}=enemyWeapon(enemy,now);
    const horizontal=Math.hypot(direction[0],direction[2])||1;
    const side=[-direction[2]/horizontal,0,direction[0]/horizontal];
    const up=[-direction[1]*side[2],horizontal,direction[1]*side[0]];
    const start=mesh.length;
    const stock=[.30,.23,.17], receiver=[.20,.24,.27], barrel=[.12,.14,.17];
    box(mesh,0,-.08,-.29,.071,.16,.18,stock);
    box(mesh,0,-.075,.055,.078,.15,.25,receiver);
    box(mesh,0,-.23,.13,.063,.17,.09,receiver);
    box(mesh,0,-.055,.38,.067,.12,.15,stock);
    box(mesh,0,-.0325,.60,.031,.065,enemy.role==="sniper" ? .55 : .26,barrel);
    if (enemy.role==="sniper") box(mesh,0,.095,.08,.054,.09,.13,[.28,.48,.50]);
    for (let i=start;i<mesh.length;i+=6) {
      const [x,y,z]=[mesh[i],mesh[i+1],mesh[i+2]];
      for (let axis=0;axis<3;axis++) mesh[i+axis]=grip[axis]+side[axis]*x+up[axis]*y+direction[axis]*z;
    }
    if (now-(enemy.lastRifleShot??-Infinity)<.09) disc(mesh,...tip,.21,[1,.83,.42]);
  }
  function playerMesh(now) {
    const mesh = [];
    const jacket = [.25,.30,.27], glove = [.16,.19,.20], steel = [.27,.31,.34];
    const dark = [.12,.16,.18], detail = [.46,.51,.49];
    const kick = Math.exp(-12*(now-recoilAt))*.23;
    const sway = Math.sin(walkPhase)*walkBob*.27;
    const dip = reloadAt ? -.29 : 0;
    const x = .43+sway, y = -.52+kick*.58+dip, z = .95-kick;
    box(mesh,.37,-1.78,.42,.44,.85,.31,jacket);
    box(mesh,.49,-.96+dip,.55,.18,.46,.24,jacket);
    box(mesh,.13+sway,-.77+dip,1.08,.15,.28,.21,jacket);
    box(mesh,x+.02,y-.14,z-.11,.115,.17,.13,glove);
    box(mesh,x-.115,y-.13,z+.51,.13,.17,.19,glove);
    box(mesh,x,y-.11,z-.29,.125,.14,.37,glove);
    box(mesh,x,y,z,.125,.15,.42,steel);
    box(mesh,x,y-.25,z-.10,.083,.26,.13,dark);
    box(mesh,x,y+.045,z+.72,.055,.075,weapon==="ak" ? .37 : .65,dark);
    box(mesh,x,y+.135,z+.05,.083,.16,.25,dark);
    box(mesh,x,y+.129,z+.27,.079,.11,.024,detail);
    box(mesh,x,y+.13,z-.17,.084,.12,.027,detail);
    if (kick>.12) disc(mesh,x,y+.09,z+1.4,.13,[1,.74,.25]);
    return mesh;
  }
  const drawScene = (now, yawAngle, pitchAngle) => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = Math.round(view.clientWidth * ratio), h = Math.round(view.clientHeight * ratio);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const sy = Math.sin(yawAngle), cy = Math.cos(yawAngle), sp = Math.sin(pitchAngle), cp = Math.cos(pitchAngle);
    context.viewport(0,0,w,h);
    context.clearColor(.58,.67,.67,1);
    context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
    context.enable(context.DEPTH_TEST);
    context.useProgram(program);
    context.uniform1i(uniforms.diffuseMap,0);
    context.uniform1i(uniforms.textured,0);
    context.enableVertexAttribArray(point);
    context.enableVertexAttribArray(tint);
    context.uniform3f(uniforms.origin,cameraX,eyeY(),cameraZ);
    context.uniform3f(uniforms.right,cy,0,-sy);
    context.uniform3f(uniforms.up,-sy*sp,cp,-cy*sp);
    context.uniform3f(uniforms.forward,sy*cp,sp,cy*cp);
    const zoom = 1 / Math.tan(fov()/2);
    context.uniform2f(uniforms.lens,zoom*h/w,zoom);
    context.uniform3f(uniforms.modelOrigin,0,0,0);
    context.uniform3f(uniforms.modelPose,1,0,0);
    context.uniform2f(uniforms.modelFacing,1,0);
    draw(terrainBuffer);
    draw(propsBuffer);
    const actors = [];
    for (const enemy of enemies) {
      if (!importedEnemyModel || enemy.role === "tank") patrolMesh(actors,enemy,now);
      else drawEnemyWeapon(actors,enemy,now);
    }
    drawBlood(actors,now);
    upload(actorBuffer,actors);
    draw(actorBuffer);
    drawImportedEnemies(now);
    const marker = [];
    for (const shot of enemyRounds) {
      if (shot.launched) {
        const progress = clamp((now-shot.start)/(shot.at-shot.start),0,1);
        const {x,y,z} = shot.from;
        const back = Math.max(0,progress-.15);
        const point = fraction => [mix(x,shot.x,fraction),mix(y,shot.targetY,fraction),mix(z,shot.z,fraction)];
        const front = point(progress), tail = point(back);
        const width = shot.source.role === "tank" ? .23 : .07;
        quad(marker,[front[0]-width,front[1],front[2]],[front[0]+width,front[1],front[2]],
          [tail[0]+width*.35,tail[1],tail[2]],[tail[0]-width*.35,tail[1],tail[2]],[1,.76,.31]);
        if (progress < .19) disc(marker,x,y,z,.34,[1,.86,.47]);
      } else if (shot.source.role === "tank") {
        const {x,y,z}=tankMuzzle(shot.source,now);
        disc(marker,x,y,z,.3+.19*Math.sin(now*16)**2,[1,.45,.17]);
      }
    }
    if (impactBlast && now-impactBlast.since < .7) {
      const age = now-impactBlast.since;
      const {x,z} = impactBlast;
      const y = ground(x,z);
      for (let part=0;part<10;part++) {
        const offset = (part-4.5)*age*2.2;
        disc(marker,x+offset,y+.35+age*(part%3+1)*4,z+offset*.2,
          (.55+age*3)*(1-age/.76),part%3 ? [1,.53,.18] : [.43,.32,.23]);
      }
    }
    if (scoped) {
      for (const enemy of enemies) {
        if (!enemy.lostLeg || enemy.state === "down") continue;
        const depth = (enemy.x-cameraX)*sy+(enemy.z-cameraZ)*cy;
        if (depth <= 1) continue;
        const size = Math.max(.22,depth*.0035);
        const x = enemy.x, y = floorAt(enemy)+1.48, z = enemy.z;
        triangle(marker,[x-size,y+size,z],[x+size,y+size,z],[x,y,z],[1,.72,.32]);
      }
    }
    if (damageShot && now < damageShot.at && damageShot.source.state !== "down") {
      const source = damageShot.source;
      const x = source.x+.5, y = floorAt(source)+2.6, z = source.z-.65;
      const size = .75 + .49*Math.sin(now*31)**2;
      disc(marker,x,y,z,.22,[1,1,.94]);
      quad(marker,[x-size,y,z],[x,y+.11,z],[x+size,y,z],[x,y-.11,z],[.52,1,.94]);
      quad(marker,[x,y-size,z],[x+.11,y,z],[x,y+size,z],[x-.11,y,z],[.52,1,.94]);
    }
    for (const round of pending ? [pending,...automaticRounds] : automaticRounds) {
      const fraction = clamp((now - round.start) / round.flight, 0, 1);
      if (fraction > .17) {
        const depth = round.z - round.origin.z;
        const x = mix(round.origin.x,round.x,fraction) - round.t.drift*depth*fraction*(1-fraction);
        const y = mix(round.origin.y,round.y,fraction) + round.t.drop*depth*fraction*(1-fraction);
        disc(marker,x,y,mix(round.origin.z,round.z,fraction),.095*Math.abs(depth)/90,[1,.76,.33]);
      }
    }
    if (support || deployment && now < deployment.until) {
      const wave = support ?? deployment;
      const y = ground(wave.x,wave.z)+.7;
      const beam = wave.id === "wand" || wave.name.includes("레이저");
      const color = beam ? [1,.48,.95] : [1,.62,.21];
      disc(marker,wave.x,y,wave.z,.9,color);
      if (wave.name.includes("헬기")) {
        const drift = (now-wave.at)*12;
        box(marker,wave.x+drift,y+18,wave.z,2.6,1.4,1.25,[.35,.40,.26]);
        box(marker,wave.x+drift,y+19.6,wave.z,6,.13,.20,[.58,.59,.42]);
        box(marker,wave.x+drift-4,y+18.6,wave.z,2.1,.30,.26,[.35,.40,.26]);
      }
      if (wave === deployment) {
        const height = beam ? 52 : 8;
        quad(marker,[wave.x-.38,y,wave.z],[wave.x+.38,y,wave.z],[wave.x+1.2,y+height,wave.z],[wave.x-1.2,y+height,wave.z],color);
      }
    }
    if (supportPreview) {
      const {x,z} = supportPreview;
      const radius = kits[equipment].radius;
      for (let i=0;i<48;i+=2) {
        const a = i*Math.PI/24, b = (i+1)*Math.PI/24;
        const point = (angle,distance) => {
          const ringX = x+Math.cos(angle)*distance, ringZ = z+Math.sin(angle)*distance;
          return [ringX,ground(ringX,ringZ)+.25,ringZ];
        };
        quad(marker,point(a,radius-.35),point(b,radius-.35),point(b,radius+.35),point(a,radius+.35),[1,.69,.30]);
      }
    }
    if (impact && now - impact.since < 7) {
      const color = impact.hit ? [.84,1,.27] : [1,.48,.24];
      const size = Math.max(.30,impact.t.z*.0035);
      const {x,y} = impact;
      const z = impact.z-.36;
      const elapsed = now-impact.since;
      if (impact.hit && elapsed < .36 && !impact.bloody) {
        for (let spark=0;spark<7;spark++) {
          const drift = (spark-3)*elapsed*1.6, lift = elapsed*(.8+spark%3)-elapsed*elapsed*4;
          disc(marker,x+drift,y+lift,z-.08,.065*(1-elapsed/.36),[.96,.75,.41]);
        }
      }
      if (impact.detached && elapsed < 2) {
        const height = Math.max(ground(x,z)+.12,y+elapsed*1.4-elapsed*elapsed*5);
        box(marker,x+impact.limbSide*Math.min(elapsed,1.3)*.85,height,z+.15,.16,.23,.31,[.26,.23,.34]);
      }
      quad(marker,[x-size,y-.055,z],[x+size,y-.055,z],[x+size,y+.055,z],[x-size,y+.055,z],color);
      quad(marker,[x-.055,y-size,z],[x+.055,y-size,z],[x+.055,y+size,z],[x-.055,y+size,z],color);
    }
    if (marker.length) {
      upload(markerBuffer,marker);
      context.disable(context.DEPTH_TEST);
      draw(markerBuffer);
    }
    if (!scoped && !equipment && missionState !== "ready") {
      context.clear(context.DEPTH_BUFFER_BIT);
      context.enable(context.DEPTH_TEST);
      context.uniform3f(uniforms.origin,0,0,0);
      context.uniform3f(uniforms.right,1,0,0);
      context.uniform3f(uniforms.up,0,1,0);
      context.uniform3f(uniforms.forward,0,0,1);
      upload(actorBuffer,playerMesh(now));
      draw(actorBuffer);
    }
  };
  drawScene.dispose = () => {
    for (const item of [terrainBuffer,propsBuffer,actorBuffer,markerBuffer,importedBuffer]) context.deleteBuffer(item.handle);
    context.deleteBuffer(importedUv);
    context.deleteBuffer(importedSkin);
    for (const texture of importedTextures) if (texture) context.deleteTexture(texture);
    context.deleteProgram(program);
  };
  return drawScene;
}

let previous = performance.now() / 1000;
function tick(timestamp) {
  const now = timestamp / 1000, dt = Math.min(.045, Math.max(0, now - previous));
  previous = now;
  const step = fov()*dt*.19;
  yaw += step*(Number(keys.has("ArrowRight"))-Number(keys.has("ArrowLeft")));
  pitch += step*(Number(keys.has("ArrowUp"))-Number(keys.has("ArrowDown")));
  yaw = Math.atan2(Math.sin(yaw),Math.cos(yaw));
  pitch = clamp(pitch, -.56, .55);
  if (missionState === "active") {
    const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
    const side = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    const stride = dt * (scoped ? 10.5 : 31.5) / Math.max(1, Math.hypot(forward,side));
    walkPhase += dt*(scoped ? 8 : 12);
    walkBob = mix(walkBob, forward || side ? Math.sin(walkPhase)*(scoped ? .023 : .11) : 0,Math.min(1,12*dt));
    cameraX = clamp(cameraX + stride*(Math.sin(yaw)*forward+Math.cos(yaw)*side),-155,155);
    cameraZ = clamp(cameraZ + stride*(Math.cos(yaw)*forward-Math.sin(yaw)*side),-11,550);
    updateEnemies(now,dt);
    const shotTime = Math.min(now,missionStart+missionDuration());
    if (pending && pending.start+pending.flight <= shotTime) resolveShot(now);
    while (missionState === "active" && automaticRounds.length && automaticRounds[0].start+automaticRounds[0].flight <= shotTime) {
      resolveShot(now,automaticRounds.shift());
    }
    if (missionState === "active" && support && shotTime >= support.at) resolveSupport(now);
    if (missionState === "active" && reloadAt && now >= reloadAt) finishReload();
    resolveEnemyFire(now);
    renderEnemyStatus();
    updateTimer(now);
    if (now - missionStart >= missionDuration() && missionState === "active") finishMission(false);
  }
  if (flashUntil && now >= flashUntil) {
    byId("effect").hidden = true;
    flashUntil = 0;
  }
  const stabilizing = (holdKey || holdToggle) && breath > .001;
  breath = clamp(breath + (stabilizing ? -.28 : holdKey || holdToggle ? 0 : .35)*dt,0,1);
  if (breath <= .001) {
    breath = 0;
    holdToggle = false;
  }
  byId("breathbar").style.width = (breath*100) + "%";
  byId("hold").setAttribute("aria-pressed",stabilizing);
  const sway = stabilizing ? .00045 : scoped && weapon==="rifle" ? .0011 : .0028;
  const kickAge = now-recoilAt;
  const recoil = Math.exp(-11*kickAge)*(weapon === "ak" ? .021 : .058);
  visualYaw = yaw + Math.sin(now*2.15)*sway + Math.sin(now*.89)*sway*.32;
  const shock = now-cannonKickAt;
  const shake = shock < .7 ? Math.exp(-6*shock)*Math.sin(shock*55)*.035 : 0;
  visualPitch = pitch + Math.sin(now*2.74+.7)*sway*.82 + recoil+shake;
  if (equipment) { visualYaw = yaw; visualPitch = pitch; }
  if (triggerHeld && weapon === "ak" && !equipment && now >= boltUntil && !reloadAt) {
    if (akMagazine) fire(now);
    else if (akReserve) reload();
    else {
      triggerHeld = false;
      setNotice("예비 탄약 없음 · 보급 상자에서 E","miss");
    }
  }
  updateSupportHud(now,visualYaw,visualPitch);
  updateRangeHud();
  if (renderer) renderer(now,visualYaw,visualPitch);
  requestAnimationFrame(tick);
}

let drag = null;
function moveAim(dx,dy, sensitivity) {
  const scale = 2*Math.tan(fov()/2) / view.clientHeight;
  yaw += dx*scale*sensitivity;
  pitch -= dy*scale*sensitivity;
}
view.addEventListener("pointerdown", event => {
  if (event.target.closest("button") || event.button !== 0) return;
  if (missionState !== "active") return;
  if (document.pointerLockElement === view) {
    triggerHeld = weapon === "ak" && !equipment;
    fire();
    return;
  }
  view.focus();
  view.setPointerCapture(event.pointerId);
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, travel: 0 };
  if (weapon === "ak" && !equipment) {
    drag.automatic = triggerHeld = true;
    fire();
  }
});
document.addEventListener("mousedown",event => {
  if (event.button !== 2 || document.pointerLockElement !== view) return;
  event.preventDefault();
  rightUnlockAt = nowSeconds();
  if (equipment) cancelKit();
  document.exitPointerLock();
});
view.addEventListener("pointermove", event => {
  if (drag?.id !== event.pointerId) return;
  drag.travel += Math.hypot(event.clientX-drag.x,event.clientY-drag.y);
  moveAim(event.clientX-drag.x,event.clientY-drag.y,.75);
  drag.x = event.clientX;
  drag.y = event.clientY;
});
view.addEventListener("pointerup",event => {
  if (drag?.id === event.pointerId && !drag.automatic && drag.travel < 4 && (event.pointerType !== "touch" || equipment)) fire();
});
document.addEventListener("pointerup",event => { if (event.button === 0) triggerHeld = false; });
document.addEventListener("pointercancel",() => { triggerHeld = false; });
document.addEventListener("mousemove",event => {
  if (document.pointerLockElement === view && missionState === "active") moveAim(event.movementX,event.movementY,.48);
});
let rightUnlockAt = -Infinity;
view.addEventListener("contextmenu",event => {
  if (event.target.closest("button")) return;
  event.preventDefault();
  if (nowSeconds()-rightUnlockAt < 1) return;
  if (document.pointerLockElement === view) {
    if (equipment) cancelKit();
    document.exitPointerLock();
  } else if (equipment) cancelKit();
  else toggleScope();
});
view.addEventListener("lostpointercapture", event => { if (drag?.id === event.pointerId) drag = null; });
let lastZoomWheel = -Infinity;
view.addEventListener("wheel", event => {
  event.preventDefault();
  const now = nowSeconds();
  if (event.deltaY && now-lastZoomWheel >= .12) {
    changeZoom(event.deltaY < 0 ? 1 : -1);
    lastZoomWheel = now;
  }
}, { passive: false });
document.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === "Shift") holdKey = true;
  if (missionState === "active" && ["KeyW","KeyA","KeyS","KeyD"].includes(event.code)) keys.add(event.code);
  if (event.code === "KeyV" && !event.repeat) {
    event.preventDefault();
    toggleScope();
  }
  if (["Equal","NumpadAdd","Minus","NumpadSubtract"].includes(event.code) && !event.repeat) {
    event.preventDefault();
    changeZoom(event.code === "Equal" || event.code === "NumpadAdd" ? 1 : -1);
  }
  if (!event.repeat) {
    const actions = {KeyF:captureAim,KeyR:() => { captureAim(); reload(); },KeyT:toggleAP,KeyX:toggleAK,KeyC:cancelKit,
      KeyE:resupply,KeyB:markSupply,KeyQ:nextSector,KeyG:openShop,Backquote:measureRange};
    if (actions[event.code]) {
      event.preventDefault();
      actions[event.code]();
    }
  }
  if (event.code.startsWith("Digit") && !event.repeat) {
    const index = Number(event.key) - 1;
    if (index >= 0 && index < stations.length) byId("stages").children[index].click();
    else if (index >= 3 && index < 7) armKit(Object.keys(kits)[index-3]);
  }
  if (event.code === "Space" && !event.target.closest?.("button")) {
    event.preventDefault();
    if (!event.repeat) {
      triggerHeld = weapon === "ak" && !equipment;
      fire();
    }
  }
  if (event.key.startsWith("Arrow") && (document.activeElement === view || !event.target.closest?.("button"))) {
    event.preventDefault();
    keys.add(event.key);
  }
});
function nextSector() {
  if (pending) return;
  for (let offset=1;offset<=stations.length;offset++) {
    const index = (stationIndex+offset)%stations.length;
    if (!cleared.has(index)) { byId("stages").children[index].click(); return; }
  }
}
function syncLock() {
  const locked = document.pointerLockElement === view;
  if (!locked) triggerHeld = false;
  byId("lock-state").textContent = locked ? "FPS 조준 중 · 우클릭 / Esc 해제" : "풀림 · F / R로 복구";
  byId("capture").hidden = locked;
}
function captureAim() {
  if (missionState !== "active" || document.pointerLockElement === view) return;
  view.focus();
  try { view.requestPointerLock?.()?.catch(syncLock); }
  catch { syncLock(); }
}
function openShop() {
  if (document.pointerLockElement === view) document.exitPointerLock();
  const first = Array.from(byId("gear").children).find(button => !button.disabled);
  (first ?? byId("ap")).focus();
}
document.addEventListener("pointerlockchange",syncLock);
document.addEventListener("pointerlockerror",syncLock);
document.addEventListener("keyup", event => {
  if (event.key === "Shift") holdKey = false;
  if (event.code === "Space") triggerHeld = false;
  keys.delete(event.key);
  keys.delete(event.code);
});
window.addEventListener("blur", () => {
  triggerHeld = false;
  holdKey = false;
  holdToggle = false;
  keys.clear();
});
byId("fire").onclick = () => { fire(); view.focus(); };
byId("in").onclick = () => changeZoom(1);
byId("out").onclick = () => changeZoom(-1);
byId("scope").onclick = toggleScope;
byId("capture").onclick = captureAim;
byId("reload").onclick = () => { captureAim(); reload(); };
byId("ap").onclick = toggleAP;
byId("ak").onclick = toggleAK;
byId("resupply").onclick = resupply;
byId("supply-waypoint").onclick = markSupply;
byId("hold").onclick = () => { holdToggle = !holdToggle && breath > .12; view.focus(); };
async function setSound(enabled) {
  const button = byId("sound");
  if (enabled) {
    try {
      currentAudio ??= new AudioContext();
      await currentAudio.resume();
    } catch {
      button.textContent = "소리 사용 불가";
      return;
    }
  }
  button.setAttribute("aria-pressed", enabled);
  button.textContent = enabled ? "소리 켬" : "소리 끔";
}
byId("sound").onclick = () => {
  const enabled = byId("sound").getAttribute("aria-pressed") === "false";
  soundDisabledByPlayer = !enabled;
  setSound(enabled);
};
function updateTimer(now) {
  const duration = missionDuration();
  const left = missionStart === null ? duration : Math.max(0, Math.ceil(missionStart + duration - now));
  byId("timer").textContent = Math.floor(left/60) + ":" + String(left%60).padStart(2,"0");
  byId("timer").classList.toggle("urgent",left <= 15);
}
function resetMission() {
  rangeMeasurement = null;
  if (missionState === "active" && supportSpent) credits = attemptCredits;
  supportSpent = 0;
  automaticRounds.length = 0;
  triggerHeld = false;
  rollBattlefield();
  if (gl) {
    renderer?.dispose();
    renderer = createRenderer(gl);
  }
  stationIndex = 0;
  lensIndex = 1;
  shots = hits = landed = 0;
  magazine = 5;
  reserve = 15;
  akMagazine = 30;
  akReserve = 120;
  burstHeat = 0;
  lastAutomaticShot = -Infinity;
  apRounds = stage ? Math.min(8,2+Math.floor(stage/2)) : 0;
  usingAP = false;
  health = 100;
  weapon = "rifle";
  reloadAt = flashUntil = boltUntil = 0;
  equipment = support = deployment = damageShot = null;
  enemyRounds.length = 0;
  impactBlast = null;
  walkPhase = walkBob = 0;
  cannonKickAt = -Infinity;
  scopeBeforeSupport = supportPreview = null;
  byId("effect").hidden = true;
  scoped = false;
  cameraX = cameraZ = 0;
  missionStart = null;
  missionState = "ready";
  breath = 1;
  holdKey = holdToggle = false;
  keys.clear();
  pending = impact = null;
  bloodImpacts.length = 0;
  recoilAt = -100;
  history = [];
  cleared.clear();
  resetEnemies();
  aimAtTarget();
  if (document.pointerLockElement === view) document.exitPointerLock();
  renderReadyState();
  updateDisplay();
}
byId("reset").onclick = resetMission;
byId("engage").onclick = () => {
  if (missionState === "won" && stage < campaign.length-1) {
    stage++;
    saveCampaign();
  }
  if (missionState !== "ready") resetMission();
  missionStart = nowSeconds();
  credits = Math.max(credits,stage >= 7 ? 6 : stage >= 4 ? 3 : 0);
  attemptCredits = credits;
  updateInventory();
  renderShop();
  missionState = "active";
  renderCampaignStages();
  aimAtTarget();
  visualYaw = yaw;
  visualPitch = pitch;
  byId("engage").hidden = true;
  byId("fire").disabled = !renderer;
  view.focus();
  setNotice("작전 개시 · 1–3 키로 구역 전환");
  captureAim();
  if (!soundDisabledByPlayer) setSound(true);
};
function renderReadyState() {
  byId("mission-label").textContent = "STAGE " + String(stage+1).padStart(2,"0") + " / " + campaign.length;
  byId("mission-title").textContent = campaign[stage];
  const duration = missionDuration();
  byId("objective").textContent = enemies.length + "개 목표 제압 · "+Math.floor(duration/60)+"분 "+duration%60+"초" +
    (stage >= 10 ? " · 중장 헬멧" : stage >= 3 ? " · 적 저격수 출현" : "");
  byId("mission-title").textContent=campaign[stage]+" · "+mapProfile.name;
  renderShop();
  renderCampaignStages();
  setNotice("작전 대기");
  byId("engage").textContent = "작전 시작";
  byId("engage").hidden = !renderer;
  byId("graphics-error").hidden = Boolean(renderer);
  byId("fire").disabled = true;
  updateTimer(0);
  syncLock();
}
function renderCampaignStages() {
  const active = missionState === "active";
  byId("campaign-progress").textContent = active ? "작전 종료 후 선택" : clearedCount+" / "+campaign.length+" 클리어";
  byId("campaign-stages").replaceChildren(...campaign.map((name,index)=>{
    const button=document.createElement("button");
    const unlocked=index<=unlockedStage;
    button.className="campaign-stage";
    button.disabled=active || !unlocked;
    button.setAttribute("aria-pressed",index===stage);
    const status=index<clearedCount ? "클리어" : unlocked ? "플레이 가능" : "잠김";
    button.innerHTML="<b>"+String(index+1).padStart(2,"0")+"</b><strong>"+name+"</strong><small>"+status+"</small>";
    button.addEventListener("click",()=>{
      if (missionState==="active" || index>unlockedStage) return;
      stage=index;
      resetMission();
      byId("engage").focus();
    });
    return button;
  }));
}
resetMission();
loadWhiteJade();
requestAnimationFrame(tick);
