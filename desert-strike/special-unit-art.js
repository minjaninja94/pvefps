/* Dedicated 72px animations for mounted, mechanical and supernatural units. */
(function(global){'use strict';
const TAU=Math.PI*2, SPECIAL=new Set(['0-6','1-6','2-6','4-6','5-6','6-6','7-6','8-5','8-6','9-6','9-7']);
function rect(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function poly(g,pts,c){g.fillStyle=c;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();g.fill();}
function eye(g,x,y,c='#e8e9ec'){rect(g,x,y,3,2,c);}
function shadow(g,w=20){g.fillStyle='#07141e88';g.beginPath();g.ellipse(36,61,w,4,0,0,TAU);g.fill();}
function face(g,x,y,main,trim,eyes){
 rect(g,x-10,y-12,20,22,'#151927');rect(g,x-8,y-11,16,19,main);
 rect(g,x-10,y-16,20,6,trim);eye(g,x-5,y,eyes);eye(g,x+3,y,eyes);
}
function mount(g,f,attack,frame){
 const canine=f===6,p=['#352b30','#5e4756','#9e7482','#dfb89d','#ee8e88'],q=canine?['#242e34','#475464','#83969b','#c4b9a1','#a2e4f5']:p;
 const hop=Math.sin(frame*TAU/16)*2;
 shadow(g,25);
 g.save();g.translate(0,hop);
 // Animal body, deep chest and four planted legs.
 poly(g,[[11,40],[18,32],[42,32],[56,40],[60,48],[51,54],[23,52],[13,49]],q[0]);
 poly(g,[[15,39],[21,34],[43,35],[53,40],[51,48],[23,48]],q[1]);
 for(const x of [18,27,46,53]){rect(g,x,47,7,11,q[0]);rect(g,x,55,9,3,'#151920');}
 poly(g,[[49,34],[54,26],[62,27],[67,36],[61,44],[54,43]],q[1]);
 poly(g,[[55,28],[59,19],[62,28],[64,24],[66,36],[59,34]],q[2]);eye(g,61,34,canine?'#7beeff':'#f8b1b1');
 poly(g,[[11,41],[4,36],[6,29],[12,34],[18,36]],q[2]);
 rect(g,27,32,17,5,'#bc6d4b');rect(g,32,28,8,11,'#e8d0a5');
 // Rider: wolf knight in red mantle / furry alpha in steel-gray cloak.
 poly(g,[[31,27],[27,18],[34,16],[44,18],[47,28],[43,37],[31,36]],canine?'#345264':'#a43d43');
 face(g,37,13,canine?'#7c8b9b':'#e0b09e',canine?'#445a69':'#a44548','#fe625d');
 poly(g,[[28,6],[30,-1],[37,6]],q[2]);poly(g,[[44,6],[49,-1],[47,9]],q[2]);
 rect(g,25,27,9,5,'#d1b38a');rect(g,46,26,5,6,'#cbb6a1');
 if(attack&&frame>=4&&frame<=11){poly(g,[[50,21],[68,12],[67,17],[54,30]],'#e8d0b0');rect(g,62,12,4,14,'#8fe0d8');}
 else{rect(g,50,12,3,22,canine?'#afd0d0':'#efd9c1');}
 g.restore();
}
function mech(g,attack,frame){
 shadow(g,25);const step=Math.sin(frame*TAU/16)*2;
 g.save();g.translate(0,step);
 for(const x of [16,45]){
  rect(g,x,43,14,13,'#152734');rect(g,x+2,45,10,10,'#4e728c');rect(g,x-3,54,20,5,'#1b3547');
 }
 poly(g,[[16,17],[28,11],[46,12],[59,19],[56,46],[17,45]],'#142633');
 poly(g,[[22,18],[31,15],[43,16],[54,23],[49,39],[24,39]],'#5a8298');
 rect(g,28,21,19,14,'#091a2c');rect(g,31,23,13,8,'#85d7fa');
 rect(g,28,18,18,3,'#a3e9ff');rect(g,20,37,30,5,'#1f3448');
 for(const [x,dx] of [[9,-1],[53,1]]){rect(g,x,22,11,25,'#1e4059');rect(g,x+2,24,8,18,'#678ca3');rect(g,x+3,43,7,6,'#253b48');}
 poly(g,[[48,23],[67,27],[68,36],[53,35]],'#294455');
 rect(g,53,30,13,6,attack?'#ffb47b':'#658398');
 if(attack&&frame>=5&&frame<12){rect(g,65,29,5,5,'#f2f2a9');rect(g,69,31,3,2,'#fff0cf');}
 rect(g,32,36,4,3,'#9ff1fa');rect(g,39,36,4,3,'#9ff1fa');
 g.restore();
}
function flyer(g,f,frame,attack){
 const t=frame*TAU/16,bob=Math.sin(t)*3;shadow(g,14);
 g.save();g.translate(0,-4+bob);
 const C={0:['#435968','#7395ae','#abdbec'],1:['#282338','#7e527d','#ed8c9e'],2:['#3a3660','#998bce','#d4f3ff'],5:['#315b58','#9dcfbc','#e9d9bb'],8:['#302143','#876ac3','#e7c5ff'],9:['#654268','#f3a9d2','#c7fbe7']}[f];
 if(f===0){
  poly(g,[[9,36],[29,20],[49,20],[64,37],[50,43],[26,43]],C[0]);
  poly(g,[[17,34],[30,24],[45,24],[57,35]],C[1]);
  rect(g,29,28,17,6,'#243c56');rect(g,32,29,10,4,'#8ef5ff');
  rect(g,4,40,19,5,'#243849');rect(g,50,40,18,5,'#243849');
  for(const x of [9,57]){rect(g,x,25,5,18,C[2]);rect(g,x-5,26,15,3,C[1]);}
 }else if(f===2){
  for(let i=0;i<6;i++){const a=i*TAU/6+t*.15;
   poly(g,[[36,36],[36+Math.cos(a)*30,36+Math.sin(a)*20],[36+Math.cos(a+.5)*18,36+Math.sin(a+.5)*12]],i%2?C[1]:C[0]);}
  poly(g,[[36,11],[51,35],[36,56],[21,35]],C[1]);
  poly(g,[[36,17],[47,35],[36,49],[25,35]],C[2]);rect(g,33,32,6,6,'#fff0b7');
 }else if(f===1||f===8){
  const purple=f===8;
  for(let i=0;i<6;i++){
   const a=i*TAU/6,xx=36+Math.cos(a)*27,yy=36+Math.sin(a)*16;
   poly(g,[[34,34],[xx,yy],[xx+Math.sin(t+i)*4,yy+11]],i%2?C[0]:C[1]);
  }
  g.fillStyle=C[0];g.beginPath();g.ellipse(36,34,17,14,0,0,TAU);g.fill();
  g.fillStyle=C[1];g.beginPath();g.ellipse(36,31,13,9,0,0,TAU);g.fill();
  for(const x of [29,36,43])eye(g,x,31,purple?'#afffff':'#ffcb7f');
  if(attack){rect(g,32,47,8,8,C[2]);rect(g,34,54,5,5,'#f0dfff');}
 }else if(f===9){
  for(const side of [-1,1]){
   poly(g,[[36,32],[36+side*29,13],[36+side*25,39],[36+side*20,45]],C[1]);
   poly(g,[[36,34],[36+side*15,27],[36+side*27,52],[36+side*9,48]],C[2]);
  }
  face(g,36,29,'#f6d1ba','#eb9dd0','#fff8d0');
  rect(g,29,41,14,11,'#9acdb6');rect(g,33,50,3,7,'#ffe1e5');rect(g,40,50,3,7,'#ffe1e5');
 }else{
  // Elven flying witch on a moon crescent, not a winged infantry sprite.
  poly(g,[[10,47],[20,53],[48,54],[61,37],[55,55],[26,62]],'#e9dfad');
  poly(g,[[23,41],[29,19],[41,15],[47,42],[53,49],[23,49]],C[0]);
  face(g,36,20,'#f0ceb9',C[1],'#a6fff2');
  poly(g,[[18,18],[35,1],[47,18]],'#34645d');rect(g,27,14,20,5,'#b6eabf');
  rect(g,51,20,3,27,'#bad9cd');rect(g,48,17,10,9,'#7eebde');
 }
 g.restore();
}
function ritual(g,frame,attack,healer=false){
 const c=healer?['#55755d','#a8d9af','#f6accf']:['#24203c','#835ba5','#d0a5ef'];
 shadow(g,14);
 g.save();g.translate(0,-Math.abs(Math.sin(frame*TAU/16))*2);
 for(let i=0;i<6;i++){
  const xx=22+i*5;
  poly(g,[[xx,43],[xx+Math.sin(frame/3+i)*4,54],[xx-1,58]],i%2?c[1]:c[0]);
 }
 poly(g,[[27,31],[19,51],[53,51],[46,31]],c[0]);
 poly(g,[[28,29],[35,18],[45,25],[47,42],[26,43]],c[1]);
 face(g,36,19,healer?'#f4cdbc':'#9b78c4',c[0],healer?'#d5ffef':'#f7b8fb');
 rect(g,49,18,3,30,c[1]);
 if(attack){g.strokeStyle=c[2];g.lineWidth=3;g.beginPath();g.arc(48,20,9,0,TAU);g.stroke();}
 if(healer){
  for(let i=0;i<4;i++){rect(g,15+i*11,13+i%2*7,4,4,c[2]);}
 }
 g.restore();
}
function draw(g,f,role,mode,frame){
 if(!SPECIAL.has(f+'-'+role))return false;
 const attack=mode==='attack'||mode==='siege'||mode==='skill',death=mode==='death',t=((Math.floor(frame)||0)%16+16)%16;
 g.save();g.imageSmoothingEnabled=false;
 if(death){g.translate(36,55);g.rotate(t/15*.95);g.translate(-36,-55);g.globalAlpha=Math.max(.04,1-t/16);}
 if(role===6&&[4,6].includes(f))mount(g,f,attack,t);
 else if(f===7&&role===6)mech(g,attack,t);
 else if(role===6)flyer(g,f,t,attack);
 else if(f===8&&role===5)ritual(g,t,attack);
 else if(f===9&&role===7)ritual(g,t,attack,true);
 g.restore();return true;
}
global.DesertSpecialArt=Object.freeze({draw,isSpecial:(f,r)=>SPECIAL.has(f+'-'+r)});
})(window);
