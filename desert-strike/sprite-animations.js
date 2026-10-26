/*
 * Desert Front animation engine.
 * ORIGINAL procedural pixel art: 24 faction/role silhouettes, five 16-frame actions.
 * Each animation is a distinct cached 48x48 transparent canvas, no external assets.
 */
(function(global) {
'use strict';
const SIZE=48, FRAMES=16, PI=Math.PI, cache=new Map();
const MODES=['idle','move','attack','siege','death'];
const PAL=[
 {line:'#0d1b26',body:'#6fadb9',lit:'#b5e7e6',dark:'#315362',trim:'#efc778',weapon:'#a1c4d1',glow:'#8deeff',ground:'#556b72',flash:'#ffe2a3'},
 {line:'#17221b',body:'#7fa753',lit:'#c1e38a',dark:'#405c35',trim:'#d0a16a',weapon:'#e0b881',glow:'#c9f279',ground:'#576148',flash:'#f4edac'},
 {line:'#16152b',body:'#987cce',lit:'#e3cbfc',dark:'#493e82',trim:'#dbaafa',weapon:'#b9defb',glow:'#b6fcff',ground:'#6b6688',flash:'#f8c8ff'},
 {line:'#1b1716',body:'#705c43',lit:'#bd9575',dark:'#3c342c',trim:'#a32721',weapon:'#7e8585',glow:'#e53727',ground:'#393630',flash:'#ffde98'}
];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const rnd=(v)=>Math.round(v);
function pose(mode,frame,role=0){
 const t=clamp(frame,0,15)/16,cycle=t*2*PI;
 const step=Math.sin(cycle),step2=Math.cos(cycle);
 const isWalk=mode==='move',isStrike=mode==='attack'||mode==='siege',isSiege=mode==='siege';
 const impact=isSiege? (frame>=8&&frame<=11) : (frame>=6&&frame<=9);
 const anticipation=isSiege? Math.min(1,frame/7):Math.min(1,frame/5);
 const decay=isSiege?clamp((frame-11)/4,0,1):clamp((frame-9)/6,0,1);
 const attackTilt=isStrike?(impact?2:-3*anticipation)*(1-decay):0;
 return {
  frame,mode,progress:t,
  bob:isWalk?rnd(Math.abs(step)*2):mode==='idle'?rnd(Math.sin(cycle)*.65):impact?2:0,
  stride:isWalk?rnd(step*5):0,otherStride:isWalk?rnd(-step*5):0,
  arm:isWalk?rnd(step2*3):mode==='idle'?rnd(Math.sin(cycle)*.6):impact?-5:rnd(4*anticipation),
  tilt:attackTilt,
  recoil:impact?-4:(!isStrike?0:rnd(2*anticipation*(1-decay))),
  muzzle:isStrike&&impact,
  wing:isWalk?rnd(Math.sin(cycle)*7):isStrike?rnd(Math.sin(cycle*2)*5):rnd(Math.sin(cycle)*3),
  die:mode==='death'?clamp((frame+.3)/15,0,1):0,
  flash:frame===7||frame===8,
  shock:isSiege&&impact,
  support:role===7
 };
}
function makeCanvas(){
 const c=document.createElement('canvas');c.width=SIZE;c.height=SIZE;return c;
}

function paintMarine(g,p,role,mode,frame){
 // Fictional Marine Fortress: unique eight character silhouettes, volumetric grime and texture.
 const q=pose(mode,frame,role),sin=Math.sin(frame*Math.PI/8),down=q.die,bob=q.bob;
 g.clearRect(0,0,48,48);
 const face=role===3?'#111315':role===4?'#302925':'#ac7758';
 const metal='#42403b',edge='#161816',red=role===3?'#ae1c17':'#852924';
 const rect=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const poly=(points,c)=>{g.fillStyle=c;g.beginPath();g.moveTo(Math.round(points[0][0]),Math.round(points[0][1]));for(let i=1;i<points.length;i++)g.lineTo(Math.round(points[i][0]),Math.round(points[i][1]));g.closePath();g.fill();};
 const gradient=(x,y,w,h,stops)=>{const gr=g.createLinearGradient(x,y,x+w,y+h);for(const [t,v] of stops)gr.addColorStop(t,v);return gr;};
 const armour=gradient(12,15,26,19,[[0,'#a77e59'],[.3,'#504838'],[.73,'#3a332a'],[1,'#191f21']]);
 const skin=gradient(14,5,18,15,[[0,'#efc198'],[.46,face],[1,'#352c28']]);
 const isDead=mode==='death';
 if(isDead&&down>.85){
  for(let i=0;i<8;i++){rect(6+i*5,42-Math.round(i%3*down*3),3,2,i%2?'#3d322a':'#752d28');}
  return;
 }
 // Actual keyframes control hand recoil, stride, falling, jet flutter, and muzzle flashes.
 g.save();
 if(isDead){g.translate(24,40);g.rotate(down*1.4);g.scale(1,1-down*.7);g.translate(-24,-40);}
 else g.translate(q.tilt,bob);
 rect(9,41,28,2,'#1718167a');
 const walking=mode==='move';
 const stride=walking?Math.round(sin*3):0;
 if(role===6){ // 쾌흥태 — modified jetpack
  poly([[6,23-q.wing/2],[14,13],[20,25],[24,33],[10,31]],'#454c45');
  poly([[42,23+q.wing/2],[34,13],[28,25],[24,33],[38,31]],'#4f534d');
  rect(6,19,9,8,'#8b382d');rect(34,19,9,8,'#8b382d');
  rect(10,27,6,10,'#b78540');rect(32,27,6,10,'#b78540');
 }
 if(role===4){ // 톤톤정 — heavy black AA exosuit
  poly([[7,19],[4,36],[17,39],[22,27]],'#232528');
  poly([[41,19],[44,36],[31,39],[27,27]],'#232528');
  rect(4,19,8,17,'#515351');rect(36,19,8,17,'#505050');
 }
 if(role===3){ // 황근출 — massive charcoal body, eyes red
  poly([[8,13],[3,28],[13,34],[21,17]],'#322723');
  poly([[40,13],[45,28],[35,34],[27,17]],'#2e231f');
 }
 // Deep shadow against bright rim, wider shoulders for main frontliner.
 const height=role===3?21:18;
 rect(16+stride,31,7,12,'#242c29');rect(26-stride,31,7,12,'#29302d');
 rect(14+stride,40,10,3,'#101817');rect(25-stride,40,10,3,'#101817');
 poly([[10,14],[18,12],[31,13],[39,19],[36,35],[12,35],[8,22]],armour);
 poly([[10,15],[4,19],[7,31],[14,29]],'#4c4339');
 poly([[36,14],[44,19],[40,33],[34,29]],'#514237');
 poly([[13,15],[19,12],[30,14],[34,19],[32,28],[17,28]],'#6d5b46');
 rect(18,23,13,4,'#302c25');rect(21,23,7,3,'#ac3326');
 if(role===4||role===3){rect(7,15,6,13,'#23211e');rect(35,15,6,13,'#2c2520');}
 // Face, camo cap, black occult visor and scarred skin.
 poly([[17,8],[28,7],[33,10],[33,19],[29,24],[18,21],[15,15]],skin);
 rect(14,8,20,5,role===3?'#53534e':'#4b5547');
 rect(12,11,23,4,'#323b35');
 rect(18,7,14,2,'#727965');
 rect(24,10,6,3,'#a12627');
 if(role===3){rect(19,15,5,2,'#f24329');rect(27,15,5,2,'#e73123');}
 else{rect(20,15,4,2,'#342b23');rect(27,15,3,2,'#342720');rect(23,20,6,2,'#4a302b');}
 if(role===0){ // 무모칠: red spike and long knife
  for(let k=0;k<5;k++)poly([[16+k*3,9],[18+k*3,1-k%2*2],[21+k*3,10]],'#a92921');
  poly([[37-q.recoil,17+q.arm],[46,5+q.arm],[43,25+q.arm]],'#afb4ad');
  rect(36,24+q.arm,7,4,'#872f2b');
 }else if(role===1){ // 박철곤: bright long-range automatic rifle
  rect(29+q.recoil,21,18,5,'#232929');rect(27,20,17,3,'#717978');
  rect(40+q.recoil,18,4,3,'#b3a68a');
 }else if(role===2){ // 조조팔: enormous warhead launcher
  rect(27+q.recoil,11,20,12,'#212727');rect(29,10,16,5,'#8a8b79');
  rect(42+q.recoil,15,5,5,'#b13e2d');rect(33,22,4,9,'#544d3c');
 }else if(role===3){ // 황근출: large crimson double-edged axe
  rect(37+q.recoil,6,3,30,'#514e49');
  poly([[34,5+q.arm],[47,2+q.arm],[43,17+q.arm],[34,15+q.arm]],'#ab3228');
  rect(37,9+q.arm,7,3,'#e0a69c');
 }else if(role===4){ // 톤톤정: twin rotary anti-air cannons
  rect(30+q.recoil,17,15,6,'#151c22');rect(30+q.recoil,25,15,6,'#151c22');
  for(let i=0;i<3;i++){rect(38+q.recoil,18+i*2,10,1,'#8c9389');rect(38+q.recoil,26+i*2,10,1,'#a5a091');}
 }else if(role===5){ // 마철두: industrial mortar
  rect(28+q.recoil,9,16,18,'#292f31');rect(32+q.recoil,10,13,13,'#77776b');
  rect(43+q.recoil,11,5,11,'#15191b');
 }else if(role===6){rect(29+q.recoil,20,17,5,'#626963');rect(39,22,7,3,'#272d2c');}
 else if(role===7){ // 황룡: camouflage cook with bronze steaming pot
  rect(25,25,19,10,'#7b5530');rect(23,24,23,4,'#d3a260');
  rect(27,21,15,4,'#f4cb75');rect(27,29,15,4,'#f5b759');
  for(let i=0;i<3;i++)rect(27+i*5,16-Math.round(Math.sin(frame*.6+i)*4),2,7,'#b6d3b0');
  rect(18,10,17,4,'#879273');rect(20,14,10,3,'#e6c693');
 }
 // Chipped edges, muted specular lighting and anisotropic wear.
 if(role!==7){rect(13,18,4,2,'#c8a578');rect(18,30,13,1,'#131b1b');}
 for(let k=0;k<6;k++){const x=11+((role*9+k*7)%24),y=18+((k*11+role*3)%13);rect(x,y,1,1,k%2?'#20251e':'#9c8470');}
 if(q.muzzle){rect(43,17,5,4,'#fff1bc');rect(46,13,2,10,'#dfaa56');}
 if(q.shock){rect(39,31,7,3,'#ca8350');rect(35,35,9,2,'#dfaa60');}
 if(isDead&&down>.4){rect(13,34,19,4,'#632f2b');}
 g.restore();
}

function paint(g,p,f,role,mode,frame){
 if(f===3){paintMarine(g,p,role,mode,frame);return;}
 const q=pose(mode,frame,role),D=q.die,bob=q.bob,col=f===0?'#fff2d3':p.lit;
 g.clearRect(0,0,SIZE,SIZE);
 // Deliberately avoid anti-aliased shapes. Every part is on a whole-pixel grid.
 function r(x,y,w,h,color=p.body){
  if(w<=0||h<=0)return;
  g.fillStyle=color;g.fillRect(rnd(x),rnd(y),rnd(w),rnd(h));
 }
 function poly(points,color=p.body){
  g.fillStyle=color;g.beginPath();g.moveTo(rnd(points[0][0]),rnd(points[0][1]));
  for(let i=1;i<points.length;i++)g.lineTo(rnd(points[i][0]),rnd(points[i][1]));
  g.closePath();g.fill();
 }
 function plate(x,y,w,h,color=p.body){r(x-1,y-1,w+2,h+2,p.line);r(x,y,w,h,color);}
 function beam(x,y,w,h,color=p.glow){r(x-1,y-1,w+2,h+2,p.line);r(x,y,w,h,color);}
 // Shadow and frame-specific death particle field.
 if(mode==='death'){
  const spread=rnd(6+D*18),lift=rnd(D*21);
  r(12+spread*.24,42,26-spread*.65,2,p.ground);
  if(D>.36){
   const chunks=role===3?10:7;
   for(let i=0;i<chunks;i++){
    const angle=(i*2.4+role*.51),rad=D*(10+i%4*3);
    const px=24+Math.cos(angle)*rad,py=24+Math.sin(angle)*rad+lift*(i%3===0?-.5:.33);
    r(px,py,3+(i%2),2+(i%3),i%3===0?p.trim:i%3===1?p.dark:p.glow);
   }
  }
  if(D>.9){
   for(let i=0;i<4;i++)r(14+i*6,41-(i%2)*2,4,2,i%2?p.dark:p.ground);
   return;
  }
 } else {
  r(10,42,28,2,p.ground);
  if(role===6)r(13,44,22,2,p.ground);
 }
 const squash=mode==='death'?clamp(1-D*1.2,.12,1):1;
 const lean=mode==='death'?rnd(D*11):q.tilt;
 const yOffset=(mode==='death'?rnd(D*17):0) +bob;
 g.save();g.translate(lean,yOffset);
 if(mode==='death'){g.translate(24,42);g.rotate(D*1.16);g.translate(-24,-42);g.scale(1,squash);}
 // Separate silhouette shape language: industrial power suit / chitinous creature / floating psionic automaton.
 if(role===3){
  if(f===0){
   plate(7,19,33,20,p.dark);plate(5,28,8,8,p.line);plate(35,28,8,8,p.line);
   for(let i=0;i<5;i++){r(6+i*6,35,4,3,p.lit);}
   plate(12,14,23,15,p.body);plate(16,11,13,9,p.dark);r(19,14,8,4,p.glow);
   plate(23+q.recoil,16,19,5,p.weapon);r(36,17,6,2,p.trim);
  } else if(f===1){
   plate(8,15,32,19,p.body);plate(11,11,26,14,p.dark);
   for(let i=0;i<3;i++)plate(12+i*8,10-(i%2)*2,7,6,p.lit);
   for(let i=0;i<4;i++){const z=i*8;plate(6+z,30+((i+frame)%2)*2,5,12,p.dark);}
   plate(16,17,15,10,p.body);r(27,20,4,3,p.glow);beam(36+q.recoil,15,8,5,p.weapon);
   poly([[10,16],[4,11],[6,24]],p.trim);poly([[37,14],[44,10],[40,23]],p.trim);
  } else {
   plate(10,10,28,27,p.dark);plate(14,7,20,30,p.body);
   poly([[24,3],[17,14],[24,17],[31,14]],p.trim);
   plate(18,17,12,12,p.lit);r(21,20,6,6,p.glow);
   plate(7,17+q.stride/2,7,17,p.dark);plate(36,17-q.stride/2,7,17,p.dark);
   plate(16,36,7,8,p.dark);plate(27,36,7,8,p.dark);
  }
 } else if(role===6){
  // Unique flight silhouette, articulated thrusters / membrane wings / crystal fins.
  const lift=q.wing;
  if(f===0){
   poly([[2,21+lift/2],[19,17],[27,14],[44,21-lift/2],[33,30],[16,30]],p.line);
   poly([[6,21+lift/2],[18,21],[24,15],[30,21],[42,21-lift/2],[33,27],[15,27]],p.body);
   plate(18,13,12,15,p.dark);r(22,17,5,6,p.glow);
   r(11,27,6,6,p.trim);r(31,27,6,6,p.trim);
   beam(19,31,4,4,p.glow);beam(26,31,4,4,p.glow);
  } else if(f===1){
   poly([[24,20],[3,10+lift],[6,29-lift/2],[20,31]],p.line);
   poly([[24,20],[45,10-lift],[42,29+lift/2],[28,31]],p.line);
   poly([[22,21],[5,12+lift],[11,26],[19,29]],p.body);
   poly([[26,21],[43,12-lift],[37,26],[29,29]],p.body);
   plate(18,12,12,21,p.dark);plate(20,10,8,18,p.body);
   r(21,16,3,3,p.glow);r(26,16,3,3,p.glow);
   poly([[22,11],[18,4],[25,9]],p.trim);poly([[28,11],[33,4],[26,9]],p.trim);
  } else {
   poly([[23,6],[14,24],[23,34],[33,24]],p.body);
   poly([[17,13],[2,21+lift],[16,27]],p.dark);poly([[31,13],[46,21-lift],[32,27]],p.dark);
   poly([[21,10],[10,24],[20,26]],p.lit);poly([[27,10],[38,24],[28,26]],p.lit);
   plate(19,17,10,12,p.dark);r(22,20,4,7,p.glow);
   beam(20,32,8,3,p.glow);
  }
 } else if(role===5||role===4){
  // Heavy turrets: walking field artillery, organic artillery beast, prism projector.
  if(f===0){
   plate(13,24+q.stride/3,8,14,p.dark);plate(29,24-q.stride/3,8,14,p.dark);
   plate(10,19,30,17,p.body);plate(15,16,19,13,p.dark);
   plate(19,13,12,8,p.lit);
   if(role===5){plate(25+q.recoil,5,17,7,p.weapon);beam(38+q.recoil,7,5,3,p.trim);}
   else{
    plate(12,5,5,17,p.weapon);plate(31,5,5,17,p.weapon);
    r(14,3,3,5,p.glow);r(33,3,3,5,p.glow);
   }
  }else if(f===1){
   plate(14,18,21,19,p.dark);plate(17,13,18,18,p.body);
   plate(10,30+q.stride/3,8,10,p.dark);plate(29,30-q.stride/3,8,10,p.dark);
   poly([[14,18],[8,11],[18,13]],p.trim);poly([[34,18],[42,10],[31,12]],p.trim);
   if(role===5){plate(25+q.recoil,6,10,22,p.weapon);r(27,7,6,9,p.glow);}
   else{for(let i=0;i<3;i++)poly([[13+i*10,16],[16+i*9,2],[20+i*9,17]],p.trim);}
   r(26,24,5,4,p.glow);
  }else{
   plate(13,25,9,15,p.dark);plate(28,25,9,15,p.dark);
   poly([[11,16],[24,7],[39,16],[36,32],[14,32]],p.body);
   plate(18,17,13,11,p.dark);beam(22,18,6,8,p.glow);
   if(role===5)poly([[24,14],[33+q.recoil,1],[37+q.recoil,8],[28,20]],p.lit);
   else{poly([[10,15],[8,3],[17,12]],p.lit);poly([[38,15],[40,3],[31,12]],p.lit);}
  }
 }else{
  // Running limbs use different sin offsets in every one of the 16 poses.
  const a=q.stride,b=q.otherStride;
  if(f===0){
   plate(14+a/2,30,7,11,p.dark);plate(27+b/2,30,7,11,p.dark);
   r(12+a/2,39,10,3,p.line);r(27+b/2,39,11,3,p.line);
   plate(13,17,22,19,p.dark);plate(16,16,16,19,p.body);
   plate(9,18+q.arm,8,15,p.body);plate(33,18-q.arm,7,14,p.body);
   plate(16,6,16,13,p.dark);plate(18,4,12,12,p.body);
   r(19,7,10,3,p.trim);r(26,11,5,4,p.glow);
   plate(15,15,9,5,p.lit);r(19,23,8,4,p.dark);
  }else if(f===1){
   // Chitin: four hooked legs, mandibles, horns, tapered body.
   plate(12+a/2,29,7,12,p.dark);plate(29+b/2,29,7,12,p.dark);
   plate(7+a/3,29,8,8,p.body);plate(34+b/3,29,7,8,p.body);
   plate(12,17,24,18,p.dark);plate(15,16,18,18,p.body);
   poly([[8,23+q.arm],[2,31+q.arm],[13,28]],p.dark);
   poly([[39,23-q.arm],[45,32-q.arm],[33,29]],p.dark);
   plate(15,6,17,14,p.dark);plate(17,8,13,11,p.body);
   poly([[19,8],[12,1],[16,12]],p.trim);poly([[30,8],[36,1],[30,13]],p.trim);
   r(22,12,3,3,p.glow);r(29,12,3,3,p.glow);
   r(22,25,9,4,p.dark);
  }else{
   // Astral: faceless helm, floating segmented lower robes, luminous crystal core.
   plate(16+a/3,31,6,8,p.dark);plate(28+b/3,31,6,8,p.dark);
   poly([[13,19],[24,13],[36,19],[33,37],[15,37]],p.dark);
   plate(17,17,14,17,p.body);beam(23,21,6,8,p.glow);
   poly([[11,15+q.arm],[7,23+q.arm],[13,32]],p.body);
   poly([[36,15-q.arm],[42,23-q.arm],[36,32]],p.body);
   poly([[24,3],[15,11],[19,19],[29,19],[33,11]],p.body);
   plate(21,9,8,9,p.dark);r(24,12,3,3,p.glow);
   poly([[13,9],[7,4],[12,17]],p.trim);poly([[35,9],[41,4],[36,17]],p.trim);
  }
  // Equip role-specific signatures so every position reads independently of skin.
  if(role===0){
   if(f===0){plate(32+q.recoil,3+q.arm,6,25,p.weapon);r(31,8+q.arm,10,3,p.trim);}
   else if(f===1){
    poly([[34,17+q.arm],[44,8+q.arm],[42,27+q.arm]],p.trim);
    r(33,22+q.arm,6,6,p.weapon);
   }else{
    poly([[37,5+q.arm],[43,1+q.arm],[40,25+q.arm],[35,31+q.arm]],p.lit);
    r(36,22+q.arm,5,3,p.glow);
   }
  }else if(role===1){
   if(f===0){plate(27+q.recoil,19,17,5,p.weapon);r(42+q.recoil,20,5,2,p.trim);}
   else if(f===1){plate(33+q.recoil,20,10,6,p.dark);r(40+q.recoil,21,6,3,p.glow);}
   else{beam(32+q.recoil,17,10,6,p.glow);r(36+q.recoil,14,6,3,p.trim);}
  }else if(role===2){
   if(f===0){plate(30+q.recoil,12,16,11,p.dark);r(38+q.recoil,14,6,7,p.trim);}
   else if(f===1){plate(29+q.recoil,14,13,15,p.weapon);r(34+q.recoil,17,7,7,p.glow);}
   else{poly([[32+q.recoil,11],[45+q.recoil,17],[32+q.recoil,23]],p.lit);beam(40+q.recoil,17,5,3,p.glow);}
  }else if(role===7){
   beam(14,21,6,11,p.glow);r(9,23,16,4,p.lit);
   if(f===0){plate(32,15,9,13,p.weapon);r(35,17,3,9,'#91efa6');r(33,20,7,3,'#91efa6');}
   else if(f===1){plate(31,14,12,14,p.dark);r(34,18,7,6,'#c1f69a');poly([[38,14],[34,7],[42,14]],p.trim);}
   else{poly([[37,8],[32,20],[38,30],[44,20]],p.glow);r(35,18,6,4,p.lit);}
  }
 }
 // Separate keyframed strike / building strike cycles, including recoil, flash and impact lines.
 if(q.muzzle&&role!==7){
  const tip=(role===0?40:role===6?38:role===3?43:45),yy=(role===5||role===4)?13:role===6?19:role===0?11:22;
  r(tip,yy-2,q.shock?4:3,5,p.flash);r(tip+2,yy-1,3,3,p.glow);
  if(q.shock){
   for(let n=0;n<4;n++){
    const x=tip+2+n*2;
    r(x,yy-11+(n%2)*4,2,3,n%2?p.flash:p.trim);
    r(x,yy+6+(n%2)*3,2,3,p.flash);
   }
  }
 }
 if(role===7&&q.muzzle){
  r(7,9,5,5,'#b5f6c2');r(10,5,3,3,p.glow);r(4,19,6,3,p.glow);
 }
 if(mode==='idle'){if((frame+role)%8<2)r(24,11,2,2,p.glow);}
 g.restore();
 // Material pass: isometric top-left lighting and hand-painted pixel clusters.
 // METAL: weathered iron/rivets; BIO: wet chitin/granular skin; ARCANE: refractive faceted light.
 // Guard allows no-pixel-buffer test contexts to use the geometry pass unchanged.
 if(typeof g.getImageData==='function'&&typeof g.putImageData==='function'){
  const image=g.getImageData(0,0,SIZE,SIZE);
  if(image&&image.data){
   const pixels=image.data;
   for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const index=(y*SIZE+x)*4,alpha=pixels[index+3];
    if(alpha<80)continue;
    // Pixel-bound deterministic texture. Coarse dither blocks emulate baked 90s RTS sprites.
    let h=Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^Math.imul(role+1,1442695041)^Math.imul(f+1,2246822519);
    h^=h>>>13;h=Math.imul(h,1274126177);h^=h>>>16;
    const grain=((h>>>0)%29)-14;
    const light=clamp(1.04+(20-y)*.012+(24-x)*.005+grain*.014,.61,1.37);
    const blueShift=f===2?Math.max(0,grain*.32):0;
    const warmth=f===1?grain*.29:grain*.10;
    pixels[index]=clamp(Math.round(pixels[index]*light+warmth),0,255);
    pixels[index+1]=clamp(Math.round(pixels[index+1]*light+grain*(f===1?.42:.19)),0,255);
    pixels[index+2]=clamp(Math.round(pixels[index+2]*light+blueShift-grain*.09),0,255);
    // Restrained specular flecks follow armor plate and scaled-shell patterns.
    const glint=((x*11+y*17+role*7+f*23)%47===0)&&y<30;
    if(glint){const v=f===1?[182,208,145]:f===2?[213,196,246]:[192,217,222];
     pixels[index]=v[0];pixels[index+1]=v[1];pixels[index+2]=v[2];}
   }
   g.putImageData(image,0,0);
  }
 }

}
function frame(faction,role,mode='idle',index=0){
 faction=clamp(Math.floor(faction),0,3);role=clamp(Math.floor(role),0,7);
 if(!MODES.includes(mode))mode='idle';
 const n=clamp(Math.floor(index),0,FRAMES-1);
 const key=faction+'|'+role+'|'+mode+'|'+n;
 let canvas=cache.get(key);
 if(!canvas){
  canvas=makeCanvas();
  const g=canvas.getContext('2d');
  if(g)paint(g,PAL[faction],faction,role,mode,n);
  cache.set(key,canvas);
 }
 return canvas;
}
function portrait(faction,role){
 // Idle pose already incorporates the faction/role geometry.
 return frame(faction,role,'idle',4);
}
// Destruction animation: each of 16 stages emits expanding debris and damage flashes.
function structureImpact(g,x,y,faction,mode,progress){
 const p=PAL[clamp(faction,0,3)],idx=clamp(Math.floor(progress*16),0,15);
 const t=idx/15,amount=mode==='ruin'?1:0.55;
 g.save();g.translate(x,y);
 g.globalAlpha=(1-t)*.85;
 for(let i=0;i<10;i++){
  const angle=(i*2.4+idx*.17),radius=(9+idx*1.9)*(i%3+1)/3;
  const xx=Math.cos(angle)*radius,yy=Math.sin(angle)*radius-t*24;
  g.fillStyle=i%3?p.trim:p.glow;
  g.fillRect(rnd(xx),rnd(yy),rnd(3+amount*(i%4)),rnd(3+(i%3)));
 }
 g.strokeStyle=p.flash;g.lineWidth=3;
 g.beginPath();g.arc(0,0,8+idx*(mode==='ruin'?4.1:2.2),0,PI*2);g.stroke();
 if(idx<6){
  g.fillStyle=p.flash;g.globalAlpha=(1-idx/7)*.7;
  g.fillRect(-18,-18,36,36);
 }
 g.restore();
}
global.DesertSprites=Object.freeze({
 FPS:16,FRAMES,MODES:MODES.slice(),SIZE,
 frame,portrait,pose,structureImpact,
 get cacheSize(){return cache.size;},
 // Used only by a standalone sprite-sheet gallery. Never blocks gameplay.
 renderSheet(faction,role,mode){
  const sheet=document.createElement('canvas');
  sheet.width=SIZE*16;sheet.height=SIZE;
  const g=sheet.getContext('2d');
  if(g){g.imageSmoothingEnabled=false;for(let i=0;i<16;i++)g.drawImage(frame(faction,role,mode,i),i*SIZE,0);}
  return sheet;
 }
});
})(window);
