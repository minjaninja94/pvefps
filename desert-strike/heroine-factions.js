/* Desert Front — two original heroine factions, 72px three-quarter-view pixel art.
 * Each of 8 characters per faction has customized palette, hair, ears, costume,
 * weapon and silhouette. 5 actions × 16 keyframes, rendered without external art.
 */
(function(global){
'use strict';
const S=72,PI=Math.PI;
const B=[
 {hair:'#e9e0e5',low:'#ac9ba5',trim:'#edb5c8',cloth:'#843f63',armor:'#9a6874',eyes:'#74d9eb',fur:'#ebe4e0',weapon:'#e6e6e1'},
 {hair:'#efbb8a',low:'#bc745c',trim:'#e6c77c',cloth:'#65537a',armor:'#9a5679',eyes:'#63d9b8',fur:'#da985f',weapon:'#f7dbaa'},
 {hair:'#c9b4cb',low:'#675785',trim:'#eab8e5',cloth:'#524862',armor:'#bb90b2',eyes:'#f2df84',fur:'#cfb0cc',weapon:'#eac5c5'},
 {hair:'#312933',low:'#665963',trim:'#f0b1c6',cloth:'#57454b',armor:'#a9916d',eyes:'#f0c478',fur:'#ddbea3',weapon:'#d0d6d2'},
 {hair:'#e0a3b7',low:'#8b607a',trim:'#c1d4db',cloth:'#42566a',armor:'#7c7086',eyes:'#92d4e6',fur:'#caa8bb',weapon:'#e6e3bf'},
 {hair:'#dcc5ae',low:'#756276',trim:'#f0bb83',cloth:'#594b62',armor:'#9b6c8c',eyes:'#a1d3a1',fur:'#d8c5bd',weapon:'#e3c9a4'},
 {hair:'#bcb3c8',low:'#41334d',trim:'#eda1bd',cloth:'#403546',armor:'#d5b8a4',eyes:'#c4f4a5',fur:'#46383c',weapon:'#f3d5b1'},
 {hair:'#f3e2cc',low:'#ad9d8d',trim:'#b5d1bb',cloth:'#5b636a',armor:'#9fb7a8',eyes:'#71bda4',fur:'#f7e8dc',weapon:'#d6edd3'}
];
const E=[
 {hair:'#d9eadc',low:'#8ca9a2',trim:'#aeead2',cloth:'#355d51',armor:'#6f938c',eyes:'#bdf3e4',weapon:'#c8ebe1'},
 {hair:'#efecb8',low:'#b1a979',trim:'#d4f6ca',cloth:'#426864',armor:'#86af9a',eyes:'#64c9b3',weapon:'#e5e5bd'},
 {hair:'#f2d5a5',low:'#b1917b',trim:'#a0d9eb',cloth:'#456573',armor:'#789caf',eyes:'#62bad9',weapon:'#e5f7e9'},
 {hair:'#d0c4de',low:'#8e839e',trim:'#d2b2f1',cloth:'#495578',armor:'#9293bd',eyes:'#b0e2ed',weapon:'#dfd6f5'},
 {hair:'#c7e4fa',low:'#819ab7',trim:'#a5f6ee',cloth:'#386681',armor:'#8abac3',eyes:'#9fe1ef',weapon:'#d5fcf3'},
 {hair:'#e6d4f1',low:'#9080ac',trim:'#b9d3ff',cloth:'#42507e',armor:'#8c9aca',eyes:'#c0b7ff',weapon:'#b8d9ff'},
 {hair:'#f9ece4',low:'#b3a9bb',trim:'#d4c6fb',cloth:'#56507a',armor:'#a29fcd',eyes:'#d0ecff',weapon:'#e9d9ff'},
 {hair:'#d6f4b9',low:'#829e8d',trim:'#bcf2e0',cloth:'#4e7770',armor:'#a3d4ba',eyes:'#b8f9ca',weapon:'#cff9ed'}
];
function poly(g,q,color){
 g.fillStyle=color;g.beginPath();g.moveTo(Math.round(q[0][0]),Math.round(q[0][1]));
 for(let i=1;i<q.length;i++)g.lineTo(Math.round(q[i][0]),Math.round(q[i][1]));g.closePath();g.fill();
}
function rect(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function el(g,x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,PI*2);g.fill();}
function line(g,x,y,xx,yy,color,w=2){g.strokeStyle=color;g.lineWidth=w;g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();}
function sparkle(g,x,y,c){
 rect(g,x,y-4,2,9,c);rect(g,x-4,y,10,2,c);
 rect(g,x+5,y-5,2,2,'#fffcdf');
}
function draw(g,f,role,mode,frame){
 const beast=f===4,C=beast?B[role]:E[role],t=frame/16,wave=Math.sin(2*PI*t);
 const move=mode==='move',attack=mode==='attack'||mode==='siege',death=mode==='death';
 const impact=attack&&frame>=6&&frame<=10,fall=death?frame/15:0;
 const bob=move?Math.abs(wave)*2:Math.sin(2*PI*t)*.6;
 const step=move?wave*4:0;
 const sweep=attack?Math.sin(t*PI)*9:0;
 const hairFlow=(move?4:attack?7:2)*Math.sin(2*PI*t)+(attack?Math.sin(t*PI)*4:0);
 const robeFlow=(move?Math.sin(2*PI*t)*5:attack?Math.sin(t*PI)*7:Math.sin(2*PI*t)*1.3);
 g.clearRect(0,0,S,S);g.save();g.imageSmoothingEnabled=false;
 // All sprites share an angled 3/4 view and diagonal ground ellipse.
 el(g,35,64,role===3?21:role===6?24:14,4,'#0714199c');
 if(role===6&&beast){
  // Large black-panther cavalry mount with rider (ground, not a flyer).
  g.translate(0,move?Math.sin(t*PI*4)*2:0);
  poly(g,[[4,38],[15,29],[42,28],[56,38],[57,48],[42,56],[19,54]],'#1d2029');
  poly(g,[[7,38],[18,30],[39,30],[49,40],[38,49],[18,48]],'#4c4857');
  poly(g,[[40,29],[55,22],[67,29],[60,41],[49,42]],'#302a36');
  poly(g,[[50,23],[49,12],[58,20]],'#302a36');
  poly(g,[[59,24],[65,13],[64,28]],'#35313e');
  rect(g,62,31,3,2,'#e6d28e');rect(g,56,31,3,2,'#e6d28e');
  for(const [x,y,d] of [[15,44,1],[26,46,-1],[44,43,-1],[52,44,1]]){
   poly(g,[[x,y],[x+4,y+3],[x+4+step*.25*d,62],[x-3+step*.25*d,61]],'#292733');
   rect(g,x+step*.25*d,59,7,3,'#181c25');
  }
  line(g,8,36,0,24+wave*3,'#302c38',5);
 }else if(role===6&&!beast){
  // Moon elf aerial witch; mana circle under hovering boots.
  el(g,34,63,19,5,'#608ebd55');g.strokeStyle='#c3ccfc';g.lineWidth=1;
  g.beginPath();g.ellipse(34,62,20+wave*2,5,0,0,2*PI);g.stroke();
  for(let i=0;i<5;i++)rect(g,12+i*11,59+(i%2)*3,2,2,'#d7e5ff');
  g.translate(0,-6+wave*2);
 }
 if(death){g.translate(35,52);g.rotate(fall*1.15);g.translate(-35,-52);g.globalAlpha=Math.max(.15,1-fall*.8);}
 else if(role!==6)g.translate(0,-bob);
 const x=34,y=14;
 // Unified fantasy illustration language: layered cape, embroidered edge,
 // charcoal silhouettes and jewel-colored faction fabric.
 if(role!==6||!beast){
  poly(g,[[22,24],[36,20],[51,28],[61+robeFlow,47],[53+robeFlow,64],[43,51],[25,58],[13-robeFlow,64],[16,43]],'#19212d');
  poly(g,[[22,27],[36,22],[48,30],[58+robeFlow,55],[49+robeFlow,61],[41,45],[29,53],[17-robeFlow,60],[19,39]],C.low);
  poly(g,[[46,33],[55+robeFlow,50],[50+robeFlow,58]],C.trim);
  if(!beast){poly(g,[[20,38],[15-robeFlow,63],[29,57]],'#83b2a3');}
 }
 // Beastkin are compact adult shortstacks; elf units retain long-legged proportions.
 poly(g,[[20,35],[31,36],[30+step*.5,57],[21+step*.5,62],[16,60]],'#181e28');
 poly(g,[[36,34],[46,36],[49-step*.6,57],[44-step*.6,63],[35,59]],'#1b2430');
 poly(g,[[20,50],[30,51],[29+step*.5,61],[17+step*.5,63]],C.armor);
 poly(g,[[39,51],[49,51],[49-step*.5,62],[38-step*.5,64]],C.cloth);
 // Tall boots and diagonal stockings emphasize the long-legged adult heroine design.
 rect(g,22+step*.45,54,5,3,C.trim);rect(g,40-step*.45,54,6,3,C.trim);
 rect(g,18+step*.5,61,12,2,'#17222c');rect(g,38-step*.5,62,11,2,'#17222c');
 // Animal tails sway behind torso. Ears remain silhouette-strong at tiny sizes.
 if(beast){
  const sw=Math.sin(t*2*PI)*5;
  if(role===1||role===5||role===7){
   poly(g,[[42,42],[57+sw,36],[66+sw,23],[62+sw,16],[63+sw,35],[50,53]],C.low);
   poly(g,[[52,35],[66+sw,23],[61+sw,17],[59+sw,34]],C.fur);
  }else{
   poly(g,[[43,43],[56+sw,47],[64+sw,36],[65+sw,30],[69+sw,40],[56,54]],C.low);
   poly(g,[[60+sw,36],[67+sw,28],[68+sw,39]],C.fur);
  }
 }
 // Robes/armor in three facets with gold trim and physical left-side shading.
 const width=role===3?20:role===5?18:15;
 poly(g,[[34-width,32],[27,25],[45,25],[34+width,35],[49,54],[20,55]],'#17242a');
 poly(g,[[34-width+2,33],[29,27],[42,28],[34+width-3,34],[46,50],[24,51]],C.cloth);
 poly(g,[[28,26],[36,25],[34,50],[25,49]],C.armor);
 poly(g,[[38,27],[44,29],[46,49],[35,50]],C.trim);
 poly(g,[[31,29],[37,29],[40,46],[29,44]],C.cloth);
 // Shaped fantasy plate over a midriff cuirass; beastkin use a two-piece
 // bikini-armor motif, while elves wear a fitted ornate elven breastplate.
 poly(g,[[28,28],[34,26],[39,32],[36,38],[28,36]],C.armor);
 poly(g,[[36,28],[42,27],[45,35],[38,39],[35,33]],C.high||C.trim);
 if(beast){
  // Armor cups and exposed midriff, retaining full coverage at sprite scale.
  el(g,31,32,7,5,C.armor);el(g,42,32,7,5,C.armor);
  line(g,26,30,34,28,C.trim,2);line(g,39,28,47,30,C.trim,2);
  rect(g,30,39,12,5,'#ebc5af');rect(g,34,40,3,2,C.trim);
 }else{
  el(g,32,32,6,5,C.armor);el(g,41,32,6,5,C.trim);
  line(g,28,30,44,30,'#e4f8e1',1);
 }
 poly(g,[[30,30],[34,30],[33,33],[29,33]],C.trim);
 rect(g,33,35,9,2,'#e8c9a0');
 poly(g,[[29,37],[40,39],[36,42],[29,40]],C.cloth);
 rect(g,26,43,21,3,C.trim);
 rect(g,31,44,11,2,'#e6d8af');
 for(let j=0;j<5;j++)rect(g,21+j*6,52+(j%2),4,2,j%2?C.trim:C.low);
 // Eyes, readable fair face in anime silhouette. Face tilts toward SE.
 poly(g,[[26,17],[31,11],[43,12],[49,21],[44,31],[31,31],[26,25]],'#6a4b43');
 poly(g,[[27,17],[32,12],[42,13],[47,20],[43,29],[32,29],[28,24]],'#f5d6c7');
 poly(g,[[34,25],[38,27],[42,25]],'#e7aba9'); // subtle cheek
 const blinking=mode==='idle'&&(frame===7||frame===8);
 rect(g,33,20,3,blinking?1:4,C.eyes);rect(g,42,20,3,blinking?1:4,C.eyes);
 rect(g,32,19,5,1,'#222a33');rect(g,41,19,5,1,'#222a33');
 rect(g,32,18,1,2,'#232e33');rect(g,45,18,1,2,'#232e33');
 rect(g,34,20,1,1,'#fbf8ef');rect(g,43,20,1,1,'#fbf8ef');
 rect(g,38,27,3,1,'#ba888e');
 rect(g,29,25,2,1,'#efa4a7');rect(g,45,25,2,1,'#efa4a7');
 // Hair crown, off-center bang, long locks, and back braid.
 poly(g,[[26,18],[23,10],[30,6],[39,5],[48,10],[50,18],[44,15],[36,12],[31,19]],C.low);
 poly(g,[[25,16],[29,7],[37,4],[45,8],[49,13],[43,13],[38,11],[33,16]],C.hair);
 poly(g,[[24,14],[29,18],[27,34],[22,39],[22,21]],C.low);
 poly(g,[[48,13],[52+hairFlow*.24,27],[50+hairFlow*.4,41],[44+hairFlow*.26,38],[45,21]],C.hair);
 poly(g,[[21,16],[22-hairFlow*.22,38],[16-hairFlow*.47,54],[25-hairFlow*.19,46],[27,25]],C.hair);
 poly(g,[[47,17],[54+hairFlow*.3,39],[59+hairFlow*.64,55],[48+hairFlow*.3,46],[44,29]],C.low);
 poly(g,[[22-hairFlow*.25,41],[20-hairFlow*.55,52],[27,42]],C.trim);
 poly(g,[[28,11],[39,8],[33,16],[30,24],[27,22]],C.hair);
 rect(g,32,8,10,2,'#fff5dd80');
 // Hair ornament and animal vs elf ear distinction.
 if(beast){
  // Wolf / fox / lynx / rabbit ears vary by role. Twin ears clearly protrude.
  if(role===7){
   poly(g,[[27,13],[22,-5],[31,1],[32,16]],C.hair);
   poly(g,[[42,12],[48,-6],[54,0],[50,18]],C.hair);
   poly(g,[[27,9],[24,-2],[29,4]],C.trim);
   poly(g,[[45,8],[48,-2],[51,4]],C.trim);
  }else{
   poly(g,[[27,13],[17,0],[19,-7],[33,9]],C.hair);
   poly(g,[[41,9],[53,-5],[57,2],[48,17]],C.hair);
   poly(g,[[26,9],[20,1],[23,-2]],C.trim);
   poly(g,[[46,8],[53,-1],[53,6]],C.trim);
  }
  rect(g,43,9,5,2,C.trim);
  // Small tied ribbon and jewel at the root of animal ears.
  poly(g,[[39,12],[45,9],[42,15]],C.trim);
  rect(g,43,11,2,2,'#fff7e7');
 }else{
  // Long horizontal elf ears with hair tucked behind.
  poly(g,[[26,20],[14,16],[22,26],[27,25]],'#dcb8b0');
  poly(g,[[46,20],[62,13],[51,27],[46,26]],'#f7d8cc');
  poly(g,[[48,21],[57,17],[51,23]],'#e6afad');
  rect(g,36,8,9,2,C.trim);
  rect(g,38,5,2,4,C.weapon);
  // Pierced elven ear: silver leaf earring distinct from animal ears.
  rect(g,53,22,2,5,'#dfd6ba');
  rect(g,54,28,2,2,C.trim);
 }
 // Role-specific armor shapes to make 16 units recognizable at small display sizes.
 if(role===3){
  poly(g,[[15,30],[21,23],[28,32],[22,48],[14,45]],C.armor);
  poly(g,[[44,27],[57,25],[63,39],[54,49],[46,40]],C.armor);
  for(let i=0;i<3;i++)line(g,15,34+i*5,23,33+i*5,C.trim,1);
 }
 // Two animated arms. SE arm carries weapon.
 const arm=attack?Math.sin(t*PI)*6:move?Math.sin(t*PI*2)*3:0;
 poly(g,[[22,29],[17,31+arm*.3],[16,44+arm],[24,43],[30,32]],C.armor);
 poly(g,[[44,30],[51,28-arm*.3],[59,40-arm],[53,44-arm],[40,36]],C.cloth);
 rect(g,54,39-arm,6,5,'#edd2c1');
 // Weapons in extended angled plane. Never clip vertically in 72px frame.
 if(role===0){
  line(g,57,39-arm,64+sweep*.35,9-sweep,C.weapon,4);
  line(g,63+sweep*.35,7-sweep,65+sweep*.35,2-sweep,'#fbf6e4',2);
  line(g,23,42,7,20+sweep*.4,C.weapon,3);
 }else if(role===1||role===2||role===4){
  if(beast&&role===2){
   line(g,57,39-arm,65,6-sweep,C.weapon,4);
   poly(g,[[62,10-sweep],[65,-3-sweep],[69,11-sweep]],C.trim);
  }else{
   // Elf composite bow, plucked energy string, and arrow.
   const bowX=58+sweep*.23;
   line(g,bowX,11,bowX+8,22,C.weapon,3);
   line(g,bowX+8,22,bowX,51,C.weapon,3);
   line(g,bowX,11,bowX+7,23,'#cfe6d5',1);
   line(g,bowX+7,23,bowX,51,'#cfe6d5',1);
   if(attack){
    line(g,bowX-9,28,bowX+18+sweep*.6,20-sweep*.3,C.trim,2);
    poly(g,[[bowX+19+sweep*.6,20-sweep*.3],[bowX+11+sweep*.6,16-sweep*.3],[bowX+12+sweep*.6,25-sweep*.3]],'#ffedb2');
   }else line(g,bowX-8,29,bowX+8,25,C.trim,2);
  }
 }else if(role===3){
  poly(g,[[47,34],[58,30],[67,36],[65,54],[50,54]],C.trim);
  poly(g,[[51,35],[59,33],[63,37],[60,49],[53,49]],C.armor);
  rect(g,54,41,7,3,'#f8edd7');
  line(g,16,37,10,8,C.weapon,4);
 }else if(role===5){
  if(beast){
   line(g,55,37-arm,65,11-sweep,C.weapon,6);
   poly(g,[[62,11-sweep],[55,-1-sweep],[67,5-sweep],[71,21-sweep]],C.armor);
  }else{
   line(g,57,42-arm,61,9,C.weapon,4);
   el(g,59,7,7,6,C.trim);sparkle(g,59,7,'#ffffff');
  }
 }else if(role===6){
  if(beast)line(g,54,37-arm,68,11-sweep,C.weapon,3);
  else {
   line(g,55,42,59,8,C.weapon,4);
   sparkle(g,59,7,C.trim);
   for(let i=0;i<3;i++)rect(g,13+i*19,48+(i%2)*6,4,3,C.trim);
  }
 }else if(role===7){
  line(g,56,43-arm,63,9,C.weapon,4);
  el(g,63,7,5,5,beast?'#f0bfb2':'#a6ffd0');
  if(attack){sparkle(g,59,16,C.trim);sparkle(g,22,36,C.trim);}
 }
 // Rhythmic impact and magical particle arcs, distinct from projectile physics.
 if(attack&&impact){
  for(let i=0;i<3;i++)rect(g,52+i*7,15+(i%2)*7,2,4,C.trim);
  if(!beast)for(let i=0;i<3;i++)sparkle(g,48+i*8,5+i*7,'#dcfce8');
 }
 if(death){for(let i=0;i<5;i++)rect(g,20+i*8,56-i%3*4,2+i%3,2,i%2?C.hair:C.trim);}
 // Slight dither highlights suggest metal/fabric texture rather than flat cell art.
 for(let i=0;i<9;i++){
  const rx=22+(i*11+role*3)%27,ry=31+(i*7+role*4)%21;
  rect(g,rx,ry,1,1,i%3?C.armor:C.trim);
 }
 g.restore();
}
global.HeroineFactions=Object.freeze({SIZE:S,draw});
})(window);
