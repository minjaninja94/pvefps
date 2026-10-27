/* Original 72px isometric combat rigs for Wildfur, Chrome and Abyssal Octoper.
   Nine-faction renderer uses identical shadow, light direction, five actions and 16 frames. */
(function(global){'use strict';
const SIZE=72,TAU=Math.PI*2;
const fur=[
 ['#edd3a5','#9b7050','#e3a36c','#624c60','#f1c995'],
 ['#eed6be','#a37e70','#edba85','#594d5d','#e7c4ac'],
 ['#c8b0a2','#775e6c','#f1d1a5','#4d3948','#f5adbf'],
 ['#a48c6e','#534235','#d1c5aa','#3b3d45','#f5d39c'],
 ['#dcdfd0','#859f9c','#b8e9dc','#47556b','#ebd8bb'],
 ['#a77c5d','#513a31','#dbc092','#6c503f','#f2b17e'],
 ['#b7a6b0','#463845','#f3b0c8','#413b52','#ead6d4'],
 ['#f1ded5','#b993ab','#d1f5db','#56546c','#f6dadf']
];
const robot=[
 ['#a9d3e7','#355e7d','#78ebff','#1c344a','#cce9f5'],
 ['#ccd9ee','#48688c','#7be6e9','#2c3a68','#fff9f4'],
 ['#b9c5cc','#415669','#9cddff','#293747','#f2dec6'],
 ['#94afb8','#3b5871','#5de9d7','#2a354f','#b2f3ff'],
 ['#d6b9d3','#64567c','#8af4fc','#42345c','#f7f2ff'],
 ['#aebacc','#414c69','#ffbd9f','#343f53','#e8e2f1'],
 ['#cbdcea','#4e74a7','#63e2ff','#303d60','#ffffff'],
 ['#d5ebe8','#447b81','#9cf7c2','#283b56','#f2f6e2']
];
const octo=[
 ['#a894d8','#533876','#9af1d6','#292c50','#f6cff0'],
 ['#b197ee','#605093','#93f5ed','#292a67','#e6f4ff'],
 ['#b3a1e5','#69548f','#f6c1fb','#382451','#d8f9ff'],
 ['#8996b8','#485277','#8eeef2','#262c53','#c9e7f4'],
 ['#a78ed5','#493e83','#74ebe4','#242055','#e8dfff'],
 ['#bb82db','#5e3288','#c5feef','#332364','#eadafb'],
 ['#8ba6d7','#445c93','#9aeeff','#25345d','#faf0ff'],
 ['#c2a3ce','#75538e','#c4ffd7','#423050','#ffe8f3']
];
function rect(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
function ell(g,x,y,rx,ry,c){g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fill();}
function poly(g,points,c){g.fillStyle=c;g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1))g.lineTo(...p);g.closePath();g.fill();}
function stroke(g,points,c,w){g.strokeStyle=c;g.lineWidth=w;g.lineCap='round';g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1))g.lineTo(...p);g.stroke();}
function draw(g,f,role,mode,frame){
 const C=(f===6?fur:f===7?robot:octo)[role],step=Math.sin(frame/16*TAU),walk=mode==='move',combat=mode==='attack'||mode==='siege',dead=mode==='death',impact=combat&&frame>=6&&frame<=11;
 const bob=walk?Math.abs(step)*3:Math.sin(frame/16*TAU)*.8,arm=combat?Math.sin(Math.PI*frame/16)*12:step*(walk?3:1);
 g.save();g.translate(0,dead?frame*.88: -bob);
 if(dead){g.translate(36,47);g.rotate(frame/15*.92);g.translate(-36,-47);g.globalAlpha=frame>12?(15-frame)/3:1;}
 ell(g,36,62,23,5,'#10172077');
 if(f===6){
  // Fully anthropomorphic muzzles, dense cheek/neck fur and large bushy tail, not human ears on a body.
  stroke(g,[[40,51],[53+step*2,52],[62+step*3,43],[61,32]],C[1],11);
  ell(g,60+step*2,35,8,12,C[0]);ell(g,58,37,4,8,C[2]);
  stroke(g,[[27,48],[25-step*3,59],[22,65]],C[1],9);
  stroke(g,[[42,48],[44+step*3,59],[46,65]],C[1],10);
  for(const xx of [21,40])poly(g,[[xx,62],[xx+12,62],[xx+9,66],[xx-3,65]],C[3]);
  poly(g,[[24,32],[39,28],[49,45],[40,56],[25,52],[19,43]],C[1]);
  poly(g,[[24,33],[38,32],[45,45],[34,51],[23,47]],C[3]);
  for(let i=0;i<6;i++)poly(g,[[21+i*4,33],[18+i*4,27],[26+i*4,32]],i%2?C[0]:C[2]);
  ell(g,34,20,16,15,C[0]);
  poly(g,[[22,12],[18,0],[31,11]],C[1]);poly(g,[[43,12],[52,-1],[51,21]],C[1]);
  poly(g,[[22,10],[21,3],[29,12]],C[2]);poly(g,[[44,10],[49,3],[47,13]],C[2]);
  ell(g,34,25,11,7,C[2]);ell(g,38,26,5,4,C[4]);ell(g,41,25,3,2,C[3]);
  rect(g,27,17,4,3,C[4]);rect(g,40,16,4,3,C[4]);rect(g,29,18,2,2,C[3]);rect(g,41,17,2,2,C[3]);
  for(let i=0;i<4;i++)rect(g,21+i*8,36+(i%2),2,2,C[4]);
  stroke(g,[[23,34],[18-arm*.2,42],[16-arm*.3,49]],C[0],8);
  stroke(g,[[44,33],[52,42-arm*.25],[54,47-arm*.4]],C[0],9);
  rect(g,48,41-arm*.25,12,3,C[4]);
 }else if(f===7){
  // Android: every body part hard metallic panels. No skin/flesh. LED face and articulating hydraulics.
  for(const [sx,sy] of [[25,47],[43,47]]){stroke(g,[[sx,sy],[sx+(walk?step*3:0),59],[sx+2,65]],C[1],10);rect(g,sx-3,53,9,4,C[0]);rect(g,sx-5,62,13,4,C[3]);}
  poly(g,[[22,28],[42,26],[54,48],[40,54],[20,51],[16,36]],C[1]);
  poly(g,[[24,31],[41,31],[47,45],[38,48],[23,45]],C[0]);
  poly(g,[[29,31],[41,32],[43,40],[30,40]],C[3]);
  rect(g,31,33,10,3,C[2]);rect(g,33,38,6,2,C[4]);
  for(const side of [-1,1]){
   const x=side<0?19:49;ell(g,x,33,8,7,C[1]);
   stroke(g,[[x,35],[x+side*4,44-arm*.15],[x+side*5,51-arm*.3]],C[0],9);
   rect(g,x+side*2-3,42,7,3,C[2]);
  }
  poly(g,[[21,11],[28,6],[46,8],[52,17],[48,29],[29,30],[20,21]],C[1]);
  poly(g,[[25,13],[43,10],[47,19],[42,25],[28,25],[24,19]],C[0]);
  poly(g,[[27,17],[44,16],[42,21],[29,22]],C[3]);rect(g,29,18,13,2,C[2]);
  stroke(g,[[27,12],[22,5],[19,4]],C[4],2);ell(g,19,4,3,3,C[2]);
  for(let i=0;i<4;i++){rect(g,22+i*8,48,3,2,C[4]);rect(g,24+i*8,49,1,2,C[2]);}
 }else{
  // Eight individually animated tentacles with suckers: six grounding + two manipulators.
  for(let i=0;i<8;i++){
   const a=i*TAU/8,x=36+Math.cos(a)*24,y=45+Math.sin(a)*12;
   const tipX=x+Math.cos(a)*13+step*(i%2?2:-2),tipY=56+Math.sin(a)*7+(i%3)*2;
   g.strokeStyle=i%2?C[1]:C[0];g.lineWidth=i===2||i===6?7:10;g.lineCap='round';
   g.beginPath();g.moveTo(36,41);g.bezierCurveTo(x,41-8*Math.sin(a),tipX-3,tipY+5,tipX,tipY);g.stroke();
   for(let j=0;j<3;j++)ell(g,tipX-(j+1)*2.4,tipY-(j%2)*2,1.8,1.2,C[2]);
  }
  ell(g,36,38,17,17,C[1]);ell(g,36,37,12,13,C[0]);
  poly(g,[[21,32],[22,16],[32,8],[44,10],[51,24],[50,36]],C[1]);
  ell(g,36,24,17,17,C[0]);ell(g,36,17,13,8,C[4]);
  ell(g,29,24,5,6,C[3]);ell(g,43,24,5,6,C[3]);
  ell(g,30,24,2.4,3.6,C[2]);ell(g,44,24,2.4,3.6,C[2]);
  for(let j=0;j<4;j++)rect(g,27+j*6,38+(j%2)*2,2,3,C[2]);
  stroke(g,[[21,37],[13-arm*.15,26],[9,19-arm*.3]],C[0],7);
  stroke(g,[[50,38],[58+arm*.2,27],[63,17-arm*.4]],C[0],7);
  ell(g,61,16-arm*.4,6+Math.sin(frame*.6),6+Math.sin(frame*.6),C[2]);
 }
 // Eight distinct silhouettes for eight common roles; consistent armor/weapon palette.
 if(role===0||role===2||role===4){
  stroke(g,[[56,46-arm*.3],[61,25-arm],[67,7-arm*.4]],C[3],4);
  poly(g,[[64,11-arm*.4],[60,0-arm*.4],[70,7-arm*.4],[67,21-arm*.4]],C[4]);
 }else if(role===1||role===5){
  stroke(g,[[55,43],[63,29-arm*.4],[69,25-arm*.4]],C[3],5);
  rect(g,54,30-arm*.4,16,6,C[1]);rect(g,65,31-arm*.4,7,3,C[2]);
  if(role===5){ell(g,61,16,10,10,C[2]);ell(g,61,16,5,5,C[4]);}
 }else if(role===3){
  poly(g,[[11,26],[21,21],[30,42],[22,57],[10,48]],C[1]);
  poly(g,[[14,29],[20,25],[25,43],[20,51],[14,45]],C[4]);
 }else if(role===6){
  poly(g,[[13,38],[2,17],[7,10],[27,26]],C[1]);
  poly(g,[[56,40],[68,18],[63,9],[46,27]],C[2]);
 }else{
  stroke(g,[[56,47],[62,25-arm*.4],[60,7]],C[4],4);
  ell(g,60,7,7,7,C[2]);
 }
 if(impact)for(let i=0;i<4;i++){rect(g,51+i*5,10+(i%2)*6,2,4,C[2]);rect(g,57+i*4,7+(i%3)*5,2,2,C[4]);}
 if(mode==='idle')for(let i=0;i<4;i++)ell(g,10+i*17,15+(i%2)*12+step,1,1,C[2]);
 g.restore();
}
global.ExpansionArt=Object.freeze({SIZE,draw});})(window);
