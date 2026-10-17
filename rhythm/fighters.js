// Procedural anime-style adult fighter illustrations; no external assets or API keys.
(() => {
'use strict';
const PROFILES=Object.freeze([
 {id:'celeste',name:'세레스티아',title:'빙결의 검희',hair:'#84ebff',hairDark:'#1885b4',skin:'#ffe4d4',eye:'#285bba',outfit:'#f3f0ff',trim:'#55d7fe',bottom:'#293d82',accent:'#7aecff',style:'long',species:'human',weapon:'blade'},
 {id:'ruby',name:'루비나',title:'화염의 여우 검사',hair:'#ff7a98',hairDark:'#922a65',skin:'#f5c8a9',eye:'#f9b45a',outfit:'#632943',trim:'#ffd27d',bottom:'#2b1c41',accent:'#ffa058',style:'twin',species:'fox',weapon:'claw'},
 {id:'violet',name:'아스트라',title:'밤의 마도사',hair:'#c9a6ff',hairDark:'#583cb6',skin:'#e9c5ad',eye:'#a05cff',outfit:'#48306d',trim:'#cba5ff',bottom:'#1f1a42',accent:'#e58fff',style:'wave',species:'human',weapon:'spell'},
 {id:'jade',name:'미라',title:'네온 사이버 닌자',hair:'#b9ffcc',hairDark:'#268d7f',skin:'#e5bdab',eye:'#3dfbe9',outfit:'#173e54',trim:'#51e4b4',bottom:'#132134',accent:'#63ffe0',style:'short',species:'cat',weapon:'blade'}
]);
const fill=(g,path,c,stroke='#15142c',width=4)=>{g.beginPath();path(g);g.fillStyle=c;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}};
const line=(g,pts,c,w=4)=>{g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.strokeStyle=c;g.lineWidth=w;g.lineCap='round';g.lineJoin='round';g.stroke()};
const circle=(g,x,y,r,c)=>{g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=c;g.fill()};
function draw(g,x,footY,profile,opts={}){
 const p=typeof profile==='string'?PROFILES.find(p=>p.id===profile)||PROFILES[0]:profile||PROFILES[0];
 const t=opts.t||0,hit=opts.hit||0,atk=opts.attack||0,ultimate=opts.super||false;
 const facing=opts.facing===-1?-1:1;
 const idle=Math.sin(t*3.1+(facing>0?0:1))*(hit>0?.5:2.7);
 g.save();g.translate(x,footY+idle);g.scale(facing*(opts.scale||1),opts.scale||1);
 if(hit>0)g.translate(-Math.sin(Math.min(1,hit)*Math.PI)*17,3);
 if(atk>0)g.translate(25*Math.sin(Math.min(1,atk)*Math.PI),-3);
 g.lineJoin='round';g.lineCap='round';
 // soft ground shadow
 g.save();g.scale(1/facing,1);g.beginPath();g.ellipse(0,5,76,13,0,0,Math.PI*2);g.fillStyle='#0509168b';g.fill();g.restore();
 // back hair: multi-strand color masses
 if(p.style!=='short'){
  fill(g,z=>{z.moveTo(-34,-295);z.bezierCurveTo(-73,-303,-82,-257,-83,-183);z.quadraticCurveTo(-98,-125,-65,-101);z.quadraticCurveTo(-60,-143,-42,-177);z.quadraticCurveTo(19,-100,61,-129);z.bezierCurveTo(89,-175,69,-274,37,-293);z.closePath()},p.hairDark,'#1b1830',5);
  for(let k=0;k<4;k++)line(g,[[-53+k*30,-288],[-56+k*33,-236],[-68+k*38,-167]],p.hair,8);
 }
 if(p.style==='twin'){
  fill(g,z=>{z.moveTo(-33,-302);z.bezierCurveTo(-119,-316,-103,-194,-107,-141);z.quadraticCurveTo(-70,-172,-67,-241);z.closePath()},p.hair,'#20142d',4);
  fill(g,z=>{z.moveTo(31,-305);z.bezierCurveTo(118,-313,110,-193,100,-133);z.quadraticCurveTo(66,-169,63,-238);z.closePath()},p.hairDark,'#20142d',4);
 }
 // legs + stockings
 const walk=Math.sin(t*3.1)*2;
 fill(g,z=>{z.moveTo(-39,-135);z.lineTo(-29,-28);z.quadraticCurveTo(-27,-15,-7,-14);z.lineTo(-3,-27);z.lineTo(-4,-135);z.closePath()},p.bottom);
 fill(g,z=>{z.moveTo(10,-140);z.lineTo(9,-23);z.quadraticCurveTo(10,-11,31,-15);z.lineTo(41,-25);z.lineTo(36,-138);z.closePath()},p.bottom);
 line(g,[[-29,-74],[-11,-73]],p.trim,3);line(g,[[10,-74],[35,-73]],p.trim,3);
 fill(g,z=>{z.moveTo(-31,-36);z.lineTo(-32,-11);z.lineTo(-56,-4);z.lineTo(-54,2);z.lineTo(-4,2);z.lineTo(-5,-32);z.closePath()},'#181e44',p.trim,3);
 fill(g,z=>{z.moveTo(9,-35);z.lineTo(8,-11);z.lineTo(31,-3);z.lineTo(57,1);z.lineTo(6,3);z.closePath()},'#181e44',p.trim,3);
 // skirt / armored coat flares
 fill(g,z=>{z.moveTo(-35,-191);z.quadraticCurveTo(-64,-149,-73,-116);z.quadraticCurveTo(-19,-99,6,-120);z.quadraticCurveTo(52,-105,76,-122);z.quadraticCurveTo(57,-159,36,-194);z.closePath()},p.bottom,'#141729',5);
 for(let k=-2;k<=2;k++)line(g,[[k*26,-153],[k*28,-121]],p.trim,2);
 // shoulder, torso jacket with fitted but nonsexual fashion
 fill(g,z=>{z.moveTo(-45,-222);z.lineTo(-20,-241);z.quadraticCurveTo(5,-254,27,-239);z.lineTo(47,-219);z.lineTo(37,-163);z.quadraticCurveTo(0,-154,-37,-165);z.closePath()},p.outfit,'#1c1738',5);
 fill(g,z=>{z.moveTo(-22,-237);z.lineTo(0,-198);z.lineTo(24,-239);z.lineTo(14,-185);z.lineTo(-11,-184);z.closePath()},p.trim,'#242a55',2);
 fill(g,z=>{z.moveTo(-32,-188);z.quadraticCurveTo(2,-178,33,-188);z.lineTo(36,-174);z.quadraticCurveTo(0,-160,-34,-177);z.closePath()},p.hairDark,null,0);
 circle(g,0,-190,6,p.trim);
 // left sleeve and gloved hand
 fill(g,z=>{z.moveTo(-42,-221);z.quadraticCurveTo(-63,-204,-69,-165);z.lineTo(-51,-160);z.quadraticCurveTo(-44,-185,-28,-205);z.closePath()},p.outfit,'#20172c',4);
 fill(g,z=>{z.moveTo(-69,-172);z.quadraticCurveTo(-83,-150,-64,-137);z.quadraticCurveTo(-46,-139,-52,-169);z.closePath()},p.trim,'#22203c',3);
 // right combat sleeve, swing with attack
 g.save();g.translate(28,-223);g.rotate(atk>0?-.7*atk+Math.sin(t*2)*.12:Math.sin(t*2.6)*.06);
 fill(g,z=>{z.moveTo(6,0);z.quadraticCurveTo(34,9,42,55);z.lineTo(25,62);z.lineTo(-9,18);z.closePath()},p.outfit,'#24182e',5);
 fill(g,z=>{z.moveTo(23,56);z.lineTo(43,54);z.lineTo(51,76);z.quadraticCurveTo(31,94,23,77);z.closePath()},p.trim,'#1b1e30',4);
 // signature energy blade or spell
 if(p.weapon!=='spell'){
  line(g,[[43,69],[76,-35]],'#13233b',9);
  line(g,[[45,58],[82,-50]],ultimate?'#fff':p.accent,5);
  line(g,[[33,59],[63,67]],p.trim,6);
 }else{
  circle(g,52,75,22,p.accent+'aa');circle(g,52,75,12,'#f3e9ff');
  for(let k=0;k<5;k++){let a=k*Math.PI*2/5+t*2;circle(g,52+Math.cos(a)*27,75+Math.sin(a)*27,3,p.trim)}
 }
 g.restore();
 // neck and head silhouette, mature features
 fill(g,z=>{z.moveTo(-12,-253);z.lineTo(-12,-225);z.lineTo(15,-225);z.lineTo(11,-251);z.closePath()},p.skin,'#28213c',3);
 fill(g,z=>{z.moveTo(-41,-317);z.bezierCurveTo(-52,-295,-40,-258,-18,-247);z.quadraticCurveTo(0,-235,22,-249);z.bezierCurveTo(48,-268,51,-298,30,-317);z.quadraticCurveTo(0,-337,-41,-317);z.closePath()},p.skin,'#241a35',4);
 // fox/cat ears, adult fantasy cosplay
 if(p.species!=='human'){
  const cat=p.species==='cat';
  for(const side of [-1,1]){
   g.save();g.translate(side*31,-329);g.scale(side,1);
   fill(g,z=>{z.moveTo(-20,19);z.lineTo(1,cat?-32:-45);z.lineTo(27,12);z.closePath()},p.hairDark,'#1c1832',4);
   fill(g,z=>{z.moveTo(-10,10);z.lineTo(2,cat?-17:-28);z.lineTo(16,7);z.closePath()},'#f6aac5',null,0);
   g.restore()
  }
 }
 // eye shape, detailed lashes
 for(const side of [-1,1]){
  const center=side*17;
  fill(g,z=>{z.moveTo(center-10,-285);z.quadraticCurveTo(center,-296,center+9,-285);z.quadraticCurveTo(center,-274,center-10,-285);z.closePath()},'#fefcff','#201b3d',3);
  g.beginPath();g.ellipse(center,-285,5,8,0,0,Math.PI*2);g.fillStyle=p.eye;g.fill();
  circle(g,center+1,-286,2,'#080f27');circle(g,center-2,-289,2,'#fff');
  line(g,[[center-10,-293],[center+9,-294]],p.hairDark,2);
 }
 line(g,[[-4,-263],[4,-263]],'#b56f78',2);
 circle(g,-31,-268,7,'#f9a6ac38');circle(g,31,-268,7,'#f9a6ac38');
 // crown and bangs, hair layers
 fill(g,z=>{z.moveTo(-45,-298);z.bezierCurveTo(-54,-337,-25,-355,8,-350);z.bezierCurveTo(45,-352,62,-325,42,-287);z.lineTo(25,-307);z.quadraticCurveTo(13,-298,4,-305);z.quadraticCurveTo(-10,-295,-18,-312);z.quadraticCurveTo(-29,-298,-46,-294);z.closePath()},p.hair,'#211930',5);
 fill(g,z=>{z.moveTo(-39,-312);z.quadraticCurveTo(-7,-335,22,-336);z.quadraticCurveTo(3,-328,-10,-307);z.quadraticCurveTo(-27,-301,-39,-312);z.closePath()},p.hairDark,null,0);
 line(g,[[-34,-331],[6,-345],[31,-331]],'#ffffff80',3);
 if(p.style==='short'){line(g,[[-46,-306],[-43,-269]],p.hairDark,10);line(g,[[43,-310],[46,-269]],p.hairDark,9)}
 // hair ornaments
 circle(g,36,-325,7,p.trim);circle(g,36,-325,3,'#ffffff');
 // Attack spark / hit flash
 if(atk>0){g.globalAlpha=clamp(atk,0,1);for(let i=0;i<5;i++){let a=t*3+i*1.23;circle(g,100+Math.cos(a)*35,-195+Math.sin(a)*36,3+i%3,p.accent)}}
 if(hit>0){g.globalAlpha=clamp(hit*.5,0,.55);fill(g,z=>{z.ellipse(0,-205,100,160,0,0,Math.PI*2)},'#ffffff',null,0)}
 g.restore();
}
window.NeonFighters=Object.freeze({PROFILES,draw,get:id=>PROFILES.find(p=>p.id===id)||PROFILES[0]});
})();