/* Desert Front - Isometric Visual System 3
 * Original three-quarter-view pixel characters and terrain.
 * Render-only: combat uses unchanged world coordinates; this layer applies camera-space projection.
 */
(function(global){
'use strict';
const SIZE=72,FRAMES=16, cache=new Map(), terrainCache=new Map();
let realAtlas=null,marineAtlas=null;
function imageAtlas(data,group){
 if(typeof global.Image!=='function'||typeof data!=='string')return null;
 const img=new global.Image();
 img.onload=()=>{
  for(const key of [...cache.keys()])if(Number(key.split('-')[0])===group||group===-1&&Number(key.split('-')[0])<3)cache.delete(key);
  if(typeof global.dispatchEvent==='function'&&typeof global.Event==='function')
   global.dispatchEvent(new global.Event('isometric-art-ready'));
 };
 img.onerror=()=>{};
 img.src=data;return img;
}
realAtlas=imageAtlas(global.IsoRealAtlasData,-1);
marineAtlas=imageAtlas(global.MarineArtAtlas,3);
const PAL=[
 {outline:'#0d171b',shadow:'#192b33',low:'#315264',base:'#53788a',high:'#9ac0bb',trim:'#b9a376',glow:'#8ccfea',dark:'#101d27',skin:'#c09b7d'},
 {outline:'#1a1719',shadow:'#302026',low:'#60373a',base:'#8a4a4b',high:'#bc7e60',trim:'#cf9d52',glow:'#d2ac55',dark:'#291a20',skin:'#8b6550'},
 {outline:'#12151f',shadow:'#292f4e',low:'#5c668d',base:'#888db5',high:'#d0bdad',trim:'#daa84f',glow:'#86d9ef',dark:'#161b36',skin:'#c1a29c'},
 {outline:'#171512',shadow:'#272625',low:'#585846',base:'#77775d',high:'#b9ad80',trim:'#ae352b',glow:'#edbc6f',dark:'#201f1d',skin:'#a8755e'},
 {outline:'#251e2e',shadow:'#49323a',low:'#71505d',base:'#9f7a83',high:'#ead7cf',trim:'#ecafbd',glow:'#f4d2dc',dark:'#221d29',skin:'#f1d1bf'},
 {outline:'#1a2931',shadow:'#294b49',low:'#476c68',base:'#739e90',high:'#c9e6d4',trim:'#b7dac8',glow:'#c6f7e1',dark:'#1b3034',skin:'#f3dacc'},
 {outline:'#35241c',shadow:'#4b362b',low:'#80624b',base:'#c19a71',high:'#f1d1a7',trim:'#efbb88',glow:'#f9d28c',dark:'#30251f',skin:'#efd3a6'},
 {outline:'#091827',shadow:'#183e58',low:'#315e79',base:'#6798b9',high:'#d0e9fa',trim:'#81e4f1',glow:'#7cf7ff',dark:'#102b42',skin:'#bdd4e2'},
 {outline:'#20152f',shadow:'#34254f',low:'#664d92',base:'#ac82d9',high:'#edd6ff',trim:'#8eecdc',glow:'#a8fff1',dark:'#1d1e45',skin:'#bcabdc'}
];
const rnd=Math.round,clamp=(a,b,c)=>Math.min(c,Math.max(b,a));
const hash=(a,b=0)=>{let x=(a*374761393+b*668265263)|0;x=(x^(x>>13))*1274126177;return ((x^(x>>16))>>>0)/4294967295;};
const worldToScreen=(x,y)=>({x:x+(y-260)*.34,y:260+(y-260)*.77});
const screenToWorld=(x,y)=>{const wy=260+(y-260)/.77;return {x:x-(wy-260)*.34,y:wy};};
function p(g,points,color){
 g.fillStyle=color;g.beginPath();g.moveTo(rnd(points[0][0]),rnd(points[0][1]));
 for(let i=1;i<points.length;i++)g.lineTo(rnd(points[i][0]),rnd(points[i][1]));
 g.closePath();g.fill();
}
function box(g,x,y,w,h,d,top,front,right){
 // Top, frontal elevation and side face: true isometric volume (not flat emoji).
 p(g,[[x,y],[x+w,y],[x+w+d,y-d*.55],[x+d,y-d*.55]],top);
 p(g,[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],front);
 p(g,[[x+w,y],[x+w+d,y-d*.55],[x+w+d,y+h-d*.55],[x+w,y+h]],right);
}
function stone(g,x,y,z,shade){
 const b=['#393b36','#47463c','#575346','#676052','#302e2a'][shade%5];
 p(g,[[x-12,y+3],[x,y-6-z],[x+15,y-4-z],[x+22,y+4],[x+7,y+10]],b);
 p(g,[[x-12,y+3],[x+7,y+10],[x+7,y+16],[x-12,y+8]],'#252c2b');
 p(g,[[x+7,y+10],[x+22,y+4],[x+20,y+11],[x+7,y+16]],'#31342e');
 g.fillStyle='#88816a';g.fillRect(x-4,y-3-z,9,2);
}
function paintTerrain(g,w,h,base,faction){
 const bg=g.createLinearGradient(0,0,0,h);
 bg.addColorStop(0,'#201f1d');bg.addColorStop(.22,'#37372e');
 bg.addColorStop(.48,'#4a493a');bg.addColorStop(.78,'#333a32');bg.addColorStop(1,'#1d2625');
 g.fillStyle=bg;g.fillRect(0,0,w,h);
 // Layered isometric rhombus cobbles: highlights on NW, black edge to SE.
 const tw=88,th=39;
 for(let j=-3;j<Math.ceil(h/th)+3;j++){
  for(let i=-3;i<Math.ceil(w/tw)+3;i++){
   const x=i*tw+(j%2)*tw*.5,y=j*th;
   const roll=hash(i+200,j+450);
   const b=roll>.63?'#515142':roll>.36?'#49483b':'#414439';
   p(g,[[x,y],[x+tw*.5,y+th*.43],[x,y+th*.85],[x-tw*.5,y+th*.43]],b);
   g.strokeStyle=roll>.35?'#8c806540':'#1d241eb0';g.lineWidth=1;
   g.beginPath();g.moveTo(x,y);g.lineTo(x+tw*.5,y+th*.43);g.lineTo(x,y+th*.85);g.stroke();
   if(roll>.45){
    g.fillStyle='#9b8e6d34';g.fillRect(x-15+roll*18,y+10,13,2);
    g.fillStyle='#131a1690';g.fillRect(x+12,y+24,8,2);
   }
   if(hash(j,i)>.82){
    g.strokeStyle='#1a2421a6';g.beginPath();g.moveTo(x-12,y+8);g.lineTo(x+4,y+17);g.lineTo(x+18,y+15);g.stroke();
   }
  }
 }
 // Elevated cliffs make camera read as 2.5D; rocky ledges and dark trench shadows.
 for(let row=0;row<2;row++){
  const sy=row? h-25:27;
  g.fillStyle='#141c1b66';g.fillRect(0,row?h-82:0,w,70);
  for(let i=0;i<Math.ceil(w/63);i++){
   const x=i*63+hash(i,row)*25,yy=sy+hash(i,3+row)*(row?-13:21);
   const tall=14+hash(i,9+row)*27;
   stone(g,x,yy,tall,(i+row)%5);
   if(hash(i,23+row)>.7)stone(g,x+19,yy+7,tall*.5,(i+2)%5);
  }
 }
 // Scattered track damage, shells, abandoned supplies, craters - deterministic.
 for(let i=0;i<Math.ceil(w/42);i++){
  const x=i*42+hash(i,9)*44,y=92+hash(i,15)*(h-184);
  const roll=hash(i,21);
  if(roll>.86){
   g.strokeStyle='#1c231fa6';g.lineWidth=4;g.beginPath();g.ellipse(x,y,7+hash(i,6)*9,3+hash(i,8)*4,0,0,7);g.stroke();
   g.strokeStyle='#c8a17d3f';g.lineWidth=1;g.beginPath();g.ellipse(x,y,5+hash(i,6)*9,2+hash(i,8)*4,0,0,7);g.stroke();
  }else if(roll>.77){
   stone(g,x,y,3+(i%4),i%5);
  }else{
   g.fillStyle=roll>.48?'#7b7c632d':'#111e1a7c';g.fillRect(x,y,(i%4)+2,2);
  }
 }
 if(base){
  // Base floor is built from raised gunmetal panels with beveled north-east borders.
  p(g,[[260,20],[1095,20],[1040,270],[265,270]],'#263331ca');
  for(let yy=35;yy<280;yy+=38){
   for(let xx=315;xx<1060;xx+=54){
    box(g,xx,yy,38,21,8,'#54605b','#2d393c','#1c2529');
    g.fillStyle='#b4a87c56';g.fillRect(xx+4,yy+4,21,2);
   }
  }
  g.fillStyle='#e8d3a895';g.font='bold 13px monospace';g.fillText('PRODUCTION / ISOMETRIC FACTORY DECK',344,29);
 }else{
  // Full-width center trench is crossed by bolted isometric bridges.
  const mid=w/2;
  g.fillStyle='#101b1aba';g.fillRect(mid-54,60,112,h-120);
  for(let yy=85;yy<h-40;yy+=58){
   p(g,[[mid-65,yy],[mid+53,yy-8],[mid+80,yy+10],[mid-39,yy+18]],'#4e5047');
   p(g,[[mid-39,yy+18],[mid+80,yy+10],[mid+80,yy+18],[mid-39,yy+26]],'#262d2d');
   g.strokeStyle='#c3b18b66';g.beginPath();g.moveTo(mid-65,yy);g.lineTo(mid+53,yy-8);g.stroke();
  }
  // Base-side ramp markings blend into the terrain, without a cartoony colored divider.
  for(const xx of [140,w-265]){
   p(g,[[xx-85,215],[xx+55,205],[xx+105,292],[xx-35,312]],'#151f22aa');
   g.strokeStyle='#ab97685d';g.setLineDash([13,14]);g.beginPath();g.moveTo(xx-70,259);g.lineTo(xx+91,249);g.stroke();g.setLineDash([]);
  }
 }
}
function terrain(g,w,h,base=false,faction=0){
 const key=[w,h,Number(base),faction].join(':');
 let cv=terrainCache.get(key);
 if(!cv){
  cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const ctx=cv.getContext('2d');if(ctx)paintTerrain(ctx,w,h,base,faction);
  terrainCache.set(key,cv);
 }
 g.drawImage(cv,0,0);
}
function structure(g,x,y,faction,turret,hpRatio=1){
 const z=worldToScreen(x,y);
 g.save();g.translate(z.x,z.y);g.imageSmoothingEnabled=false;
 const a=PAL[faction]||PAL[0];
 g.fillStyle='#070e1099';g.beginPath();g.ellipse(0,20,turret?36:76,turret?17:33,0,0,7);g.fill();
 if(faction===1){
  // Organic hive: layered shell, legs and tooth-like spires.
  p(g,[[-47,13],[-44,-18],[-17,-43],[20,-39],[48,-6],[46,16]],a.shadow);
  p(g,[[-42,-15],[-15,-51],[19,-49],[43,-10],[11,8],[-27,7]],a.base);
  for(let t=0;t<5;t++){
   const xx=-37+t*18;
   p(g,[[xx,-11],[xx+7,-27-t%3*8],[xx+13,-8]],a.trim);
  }
  p(g,[[-21,-10],[2,-35],[26,-12],[12,8]],a.low);
  g.fillStyle=a.glow;g.fillRect(-3,-19,13,9);
  }else if(faction===4){
  // Moonfang warrior lodge: layered timber, clawed totems and moonstone gate.
  const w=turret?44:81,h=turret?37:68;
  box(g,-w*.5,-h*.7,w,h,24,'#c7aeb0','#715563','#342a39');
  p(g,[[-w*.6,-h*.72],[0,-h-26],[w*.63,-h*.72],[13,-h*.47],[-11,-h*.47]],'#55414d');
  p(g,[[-w*.5,-h*.74],[0,-h-22],[0,-h*.45]],'#a87c89');
  p(g,[[0,-h-22],[w*.55,-h*.74],[0,-h*.45]],'#d6adb4');
  for(const xx of [-(w*.42),w*.35]){
   p(g,[[xx-4,12],[xx-8,-21],[xx, -40],[xx+8,-22],[xx+5,15]],'#83656d');
   p(g,[[xx,-43],[xx-8,-62],[xx+9,-52]],'#f4c3d1');
  }
  g.fillStyle=a.glow;g.fillRect(-11,-h*.38,22,14);
  g.fillStyle=a.dark;g.fillRect(-6,-h*.3,12,21);
 }else if(faction===5){
  // Silverwood elf spire: a living tree-arc and crystalline floating arrow towers.
  const w=turret?38:66,top=turret?-68:-105;
  box(g,-w*.5,-25,w,55,24,'#afdfc9','#477a6b','#244b47');
  p(g,[[-24,10],[-35,-23],[-14,top+20],[0,top],[14,top+20],[35,-23],[24,10]],'#355c50');
  p(g,[[-18,-7],[-26,-25],[-7,top+19],[0,top],[7,top+19],[26,-25],[18,-7]],'#9ac8b4');
  p(g,[[0,top],[16,top+30],[0,top+49],[-14,top+30]],'#daf6dd');
  p(g,[[0,top],[16,top+30],[0,top+49]],'#75b9ae');
  g.fillStyle='#b6f8e1';g.fillRect(-4,top+23,8,12);
  for(const xx of [-26,25]){
   p(g,[[xx-4,4],[xx-11,-23],[xx,-41],[xx+10,-22],[xx+5,7]],'#4b7768');
  }
 }else if(faction===6){
  // Fur-clan wooden battlements, snarling mask and two fang standards.
  const w=turret?43:77;
  box(g,-w/2,-36,w,turret?48:67,23,'#bf9b75','#614734','#342923');
  p(g,[[-w/2-9,-35],[0,-83],[w/2+9,-35],[0,-46]],a.shadow);
  p(g,[[-w/2-7,-36],[0,-79],[0,-46]],a.high);
  for(const xx of [-25,25]){p(g,[[xx-7,-45],[xx-9,-78],[xx,-95],[xx+8,-76],[xx+7,-45]],a.base);p(g,[[xx-4,-74],[xx,-93],[xx+4,-74]],a.high);}
  g.fillStyle=a.glow;g.fillRect(-13,-25,26,15);
 }else if(faction===7){
  // All-metal factory: three stacked shield panels, powered cyan reactor.
  box(g,-36,-51,turret?62:85,turret?51:87,26,a.high,a.base,a.shadow);
  box(g,-16,-87,33,32,12,a.trim,a.low,a.dark);
  for(let i=0;i<3;i++){g.fillStyle=a.dark;g.fillRect(-31+i*23,-32,17,30);g.fillStyle=a.glow;g.fillRect(-28+i*23,-25,11,6);}
  g.fillStyle=a.glow;g.fillRect(-9,-65,18,7);
 }else if(faction===8){
  // Living octopus hive; precisely eight stalks and a magic-core bell.
  for(let i=0;i<8;i++){
   const xx=Math.cos(i*Math.PI/4)*44,yy=Math.sin(i*Math.PI/4)*20;
   g.strokeStyle=i%2?a.low:a.base;g.lineWidth=turret?8:12;
   g.beginPath();g.moveTo(0,5);g.quadraticCurveTo(xx*.48,-25,xx,yy+8);g.stroke();
   g.fillStyle=a.trim;g.fillRect(xx-2,yy+4,4,3);
  }
  p(g,[[-36,2],[-31,-48],[0,-86],[31,-48],[36,2]],a.shadow);
  p(g,[[-30,-26],[-16,-66],[0,-80],[16,-66],[30,-26]],a.base);
  g.fillStyle=a.glow;g.beginPath();g.ellipse(0,-39,13,17,0,0,7);g.fill();
 }else if(faction===2){
  // Crystal order: floating prismatic tower with a real left/right face.
  box(g,-34,-37,turret?51:78,turret?40:82,28,a.high,a.low,a.shadow);
  p(g,[[-27,-38],[0,-86],[29,-36],[0,-13]],a.base);
  p(g,[[-27,-38],[0,-86],[0,-13]],a.dark);
  p(g,[[0,-86],[29,-36],[0,-13]],a.glow);
  g.fillStyle=a.trim;g.fillRect(-24,5,46,5);
 }else{
  // Forge / Marine: offset fortified turrets, rivets, muzzle, ramp and roof.
  const ww=turret?55:103, hh=turret?35:87;
  box(g,-ww*.54,-hh*.8,ww,hh,32,a.high,a.base,a.shadow);
  box(g,-ww*.42,-hh*.84,ww*.58,hh*.37,16,a.trim,a.low,a.outline);
  if(turret){
   box(g,7,-48,45,9,7,a.trim,a.low,a.shadow);
   g.fillStyle=a.dark;g.fillRect(40,-44,14,5);
  }else{
   for(let i=0;i<4;i++){
    g.fillStyle=a.dark;g.fillRect(-45+i*25,12,11,21);
    g.fillStyle=a.glow;g.fillRect(-43+i*25,14,7,4);
   }
  }
  for(let i=0;i<6;i++){
   g.fillStyle='#131c1a';g.fillRect(-ww*.45+(i%3)*ww*.28,-hh*.59+(i>=3?22:0),3,3);
  }
 }
 if(hpRatio<=0){
  g.fillStyle='#0e1618d9';g.fillRect(-24,-55,48,58);
  g.fillStyle='#d76b43';g.fillRect(-8,-35,13,6);
 }
 g.restore();
}
function factory(g,x,y,faction,role,active){
 g.save();g.translate(x,y);g.imageSmoothingEnabled=false;
 const a=PAL[faction]||PAL[0];
 // Raised industrial pad in protective rear: isometric even when empty.
 box(g,-19,3,32,6,13,active?a.low:'#444940','#2a3031','#1e2428');
 if(active){
  box(g,-12,-12,22,17,9,a.high,a.base,a.shadow);
  g.fillStyle=a.glow;g.fillRect(-5,-8,10,4);
  if(faction===4){
   p(g,[[-16,-12],[-9,-26],[1,-17],[14,-25],[20,-13]],'#e2b1bd');
   g.fillStyle='#412c41';g.fillRect(-2,-12,5,6);
  }else if(faction===5){
   p(g,[[-15,-15],[0,-34],[15,-15],[0,-9]],'#97d9b8');
   p(g,[[0,-34],[15,-15],[0,-9]],'#497d78');
   g.fillStyle='#defbe2';g.fillRect(-2,-20,5,6);
  }
  if(role===5||role===3){g.fillStyle=a.trim;g.fillRect(-3,-19,7,9);}
  if(role===6){p(g,[[-12,-10],[2,-23],[15,-12]],a.trim);}
  g.fillStyle='#0d1419';g.fillRect(-10,-3,3,4);
 }else{
  g.fillStyle='#80918a88';g.fillRect(-4,-1,7,3);
 }
 g.restore();
}
// The Odo Bongo is a physical troop transporter, never a flying marine.
function drawOdoBongo(g,mode,frame){
 const a=PAL[3],t=frame/16;
 const rolling=mode==='move'?Math.sin(t*Math.PI*2)*1.8:0;
 const impact=(mode==='attack'||mode==='siege')&&frame>=6&&frame<=10;
 const dead=mode==='death',fall=dead?frame/15:0;
 g.save();g.imageSmoothingEnabled=false;g.translate(0,rolling);
 if(dead){g.translate(fall*8,fall*6);g.rotate(fall*.28);g.globalAlpha=1-fall*.72;}
 // Shadows and angled tire positions show chassis contact with the ground.
 g.fillStyle='#091313ad';g.beginPath();g.ellipse(34,57,30,8,-.07,0,7);g.fill();
 const wheel=(x,y)=>{
  g.fillStyle=a.outline;g.fillRect(x-7,y-3,14,14);
  g.fillStyle='#171b1c';g.fillRect(x-5,y-1,11,11);
  g.fillStyle='#626359';g.fillRect(x-2,y+2,5,5);
 };
 wheel(18,46);wheel(51,50);
 // Heavy body in 3/4 perspective: dark front, ochre roof and red marine panels.
 p(g,[[9,28],[22,18],[60,23],[66,39],[56,49],[17,46]],a.outline);
 p(g,[[13,28],[24,20],[56,24],[60,35],[17,36]],'#756b4d');
 p(g,[[17,36],[60,35],[58,47],[17,46]],'#4b4c41');
 p(g,[[60,35],[65,38],[61,44],[58,47]],'#262d2c');
 p(g,[[23,20],[34,11],[58,17],[56,24]],'#ada07a');
 p(g,[[34,11],[58,17],[60,26],[29,21]],'#544c42');
 p(g,[[27,23],[35,15],[45,18],[44,27]],'#202c30');
 p(g,[[46,18],[55,20],[56,27],[45,27]],'#2b3d42');
 // Window bolts, blood-red warning stripe, spiked bumper.
 g.fillStyle=a.trim;g.fillRect(16,35,43,4);
 g.fillStyle='#b7342b';g.fillRect(16,40,35,4);
 g.fillStyle='#d2c293';g.fillRect(18,29,6,2);
 g.fillStyle='#d2a66a';g.fillRect(54,31,7,3);
 for(let i=0;i<4;i++)p(g,[[56+i*2,42],[59+i*2,42],[60+i*2,49]],'#b6b8a7');
 if(impact){
  for(let i=0;i<4;i++){g.fillStyle=i%2?'#f6e4a4':'#e58542';g.fillRect(62+i*2,31+i%2*4,5,2);}
 }
 if(mode==='move'){
  // Dust puff and wheel rattle in all sixteen steps.
  for(let i=0;i<3;i++){g.fillStyle='#9e926457';g.fillRect(12-i*5,48+((frame+i)%3),4+i,2);}
 }
 if(dead){
  g.fillStyle='#242321';g.fillRect(24,19,19,15);
  for(let i=0;i<5;i++){g.fillStyle=i%2?'#b48352':'#bf4332';g.fillRect(17+i*10,36-i%2*6,3,3);}
 }
 g.restore();
}
function renderFactionSprite(f,role,mode,frame){
 const key=[f,role,mode,frame].join('-');
 const old=cache.get(key);if(old)return old;
 const cv=document.createElement('canvas');cv.width=SIZE;cv.height=SIZE;
 const g=cv.getContext('2d');if(!g)return cv;
 const a=PAL[f]||PAL[0],t=frame/16,cyc=t*Math.PI*2,walk=mode==='move',hit=mode==='attack'||mode==='siege';
 if(f===3&&role===6){drawOdoBongo(g,mode,frame);cache.set(key,cv);return cv;}
 if(f>=6&&f<=8&&global.ExpansionArt){global.ExpansionArt.draw(g,f,role,mode,frame);cache.set(key,cv);return cv;}
 if((f===4||f===5)&&global.HeroineFactions){
  global.HeroineFactions.draw(g,f,role,mode,frame);
  // Overlay authentic generated maiden portraits, maintaining the 16-frame rig underneath.
  global.MaidenArt?.overlay(g,f,role,mode,frame);
  cache.set(key,cv);return cv;
 }
 const atlas=f===3?marineAtlas:f>=4?null:realAtlas;
 if(atlas&&atlas.complete&&atlas.naturalWidth>0){
  const cols=f===3?4:8,rows=f===3?2:3;
  const sw=atlas.naturalWidth/cols,sh=atlas.naturalHeight/rows;
  const col=f===3?role%4:role,row=f===3?Math.floor(role/4):f;
  const dying=mode==='death',impact=(mode==='attack'||mode==='siege')&&frame>=6&&frame<=10;
  const stride=mode==='move'?Math.sin(cyc)*3.3:0;
  const bounce=mode==='move'?Math.abs(Math.sin(cyc))*3:mode==='idle'?Math.sin(cyc)*.7:0;
  g.save();g.imageSmoothingEnabled=false;
  g.translate(36+stride,56-bounce);
  if(dying){
   const fall=frame/15;
   g.translate(fall*10,fall*7);g.rotate(fall*1.12);g.globalAlpha=fall>.88?(1-fall)*8:1;
  }else if(impact)g.rotate(-.11+.20*(frame-6)/5);
  else if(mode==='attack'||mode==='siege')g.rotate(-.055*Math.sin(cyc));
  // Icon rows at the foot of the three-faction concept sheet are intentionally excluded.
  const cropH=f===3?sh*.94:sh*.74,sy=f===3?0:sh*.035;
  const dw=role===3?67:role===6?67:61,dh=role===3?70:role===6?66:64;
  g.drawImage(atlas,col*sw,row*sh+sy,sw,cropH,-dw*.5,-dh*.93,dw,dh);
  if(impact){
   g.globalAlpha=1;
   for(let i=0;i<5;i++){
    g.fillStyle=i%2?'#ffedb5':'#f09942';
    g.fillRect(27+i*3,-36-i%3*4,4+i%2,2+(i+frame)%3);
   }
  }
  if(dying){
   g.globalAlpha=Math.max(.15,1-frame/16);
   for(let i=0;i<6;i++){
    g.fillStyle=i%2?a.trim:a.low;
    g.fillRect(-19+i*8,7-frame%5+i%3,2+i%2,2);
   }
  }
  g.restore();cache.set(key,cv);return cv;
 }
 const swing=walk?Math.sin(cyc)*6:hit?Math.sin(t*Math.PI)*-9:Math.sin(cyc)*1.2;
 const br=hit?(frame>=6&&frame<=9):false,dead=mode==='death',fall=dead?frame/15:0;
 function part(q,col){p(g,q,col||a.base);}
 function rect(x,y,w,h,col){g.fillStyle=col||a.base;g.fillRect(rnd(x),rnd(y),rnd(w),rnd(h));}
 function edge(x,y,w,h,col){rect(x-2,y-2,w+4,h+4,a.outline);rect(x,y,w,h,col);}
 const heavy=role===3||role===5||role===4,air=role===6,healer=role===7;
 g.clearRect(0,0,SIZE,SIZE);
 g.save();g.translate(36,54);
 if(dead){g.rotate(fall*1.25);g.translate(fall*15,fall*9);g.globalAlpha=fall>.75?1-(fall-.75)*3:1;}
 else if(walk)g.translate(0,-Math.abs(Math.sin(cyc))*2);
 // Depth silhouette and real cast shadow.
 if(!air){g.fillStyle='#061116b1';g.beginPath();g.ellipse(0,7,heavy?25:17,5,0,0,7);g.fill();}
 if(air)g.translate(0,-8+Math.sin(cyc)*2);
 // Isometric legs, chassis and handed weapons vary by faction and unit class.
 if(role===3){
  if(f===1){
   for(let k=0;k<6;k++){
    const xx=-20+k*8;
    part([[xx,3],[xx+5,-10+(k%3)*3],[xx+9,-4],[xx+7,8]],k%2?a.shadow:a.low);
   }
   part([[-27,-7],[-16,-34],[5,-46],[23,-29],[28,-1],[8,10],[-18,9]],a.outline);
   part([[-24,-10],[-14,-34],[4,-41],[21,-25],[24,-4],[3,5]],a.base);
   part([[-13,-30],[6,-38],[17,-25],[3,-16]],a.high);
   rect(7,-22,8,5,a.glow);
  }else{
   // Heavy tread and angled front plates.
   part([[-29,5],[-22,-18],[9,-26],[28,-8],[25,7],[6,14]],a.outline);
   part([[-25,1],[-18,-18],[8,-23],[24,-6],[20,5],[3,11]],a.base);
   part([[-23,-16],[7,-29],[25,-17],[-7,-5]],a.high);
   part([[-4,-28],[10,-43],[25,-27],[11,-13]],a.low);
   part([[11,-25],[36+swing*.1,-31],[38+swing*.1,-24],[13,-18]],a.trim);
   for(let i=0;i<4;i++)rect(-17+i*10,8,5,3,a.outline);
  }
 }else if(role===6){
  part([[-29,-12],[-6,-32],[4,-36],[31,-20],[25,0],[4,-8]],a.outline);
  part([[-25,-11],[-5,-30],[8,-29],[27,-18],[20,-2],[5,-10]],a.base);
  part([[-28,-11],[-6,-19],[-5,-4]],a.trim);
  part([[0,-37],[23,-33],[31,-24],[6,-24]],a.high);
  rect(10,-23,7,4,a.glow);
  rect(-11,1,8,6,br?'#ffae50':a.trim);
  rect(9,0,7,6,a.trim);
 }else{
  // Boots and torso constructed as 3/4-view colored facets, shaded left-right.
  const l=walk?Math.sin(cyc)*6:0;
  part([[-12,1],[-11+l*.43,-14],[-2+l*.2,-15],[3+l*.5,1]],a.shadow);
  part([[5,0],[3-l*.43,-16],[14-l*.2,-17],[19-l*.5,2]],a.low);
  part([[-16,0],[-9,7],[1,6],[1,0]],a.outline);
  part([[6,0],[11,9],[23,7],[17,-1]],a.outline);
  // torso diagonals and backpack.
  part([[-21,-34],[-11,-44],[12,-43],[22,-32],[16,-12],[-18,-12]],a.outline);
  part([[-17,-35],[-9,-42],[8,-40],[18,-30],[11,-15],[-14,-15]],a.base);
  part([[-13,-36],[-5,-42],[6,-40],[9,-27],[-8,-24]],a.high);
  part([[9,-39],[18,-31],[12,-15],[4,-24]],a.low);
  // offset backpack/shoulder
  part([[-23,-39],[-13,-43],[-8,-31],[-19,-26]],a.shadow);
  part([[10,-38],[22,-34],[23,-23],[13,-24]],a.trim);
  // head faceted iso helmet and face visor with 3px eyes
  part([[-11,-47],[-1,-57],[13,-53],[19,-43],[12,-34],[-3,-37]],a.outline);
  part([[-7,-49],[0,-54],[11,-51],[15,-44],[9,-37],[-2,-40]],f===3?a.skin:a.high);
  part([[1,-54],[11,-51],[15,-44],[8,-44]],a.low);
  rect(6,-46,7,3,f===1?'#e9bc83':a.glow);
  // marine exposed face + red scarf, alien antenna, astral crystal.
  if(f===3){
   rect(-1,-38,18,4,a.trim);rect(5,-46,6,2,a.dark);
  }else if(f===1){
   part([[-7,-51],[-14,-63],[-2,-54]],a.trim);
   part([[12,-51],[20,-62],[15,-45]],a.trim);
  }else if(f===2){
   part([[0,-56],[3,-65],[12,-54]],a.glow);
  }
  // articulated arms with visible two-tone side contour
  part([[-19,-34],[-25,-26+swing*.2],[-20,-12],[-11,-17]],a.low);
  part([[13,-34],[25,-23-swing*.3],[20,-13],[11,-19]],a.shadow);
  // role-specific weapons, not just recolored humanoids
  if(role===0){
   part([[19,-26],[34+br*7,-46-swing],[39+br*5,-44-swing],[25,-17]],a.trim);
   rect(24,-18,11,3,a.outline);
  }else if(role===1){
   part([[10,-26],[27+swing*.2,-28],[34+swing*.2,-20],[14,-17]],a.outline);
   part([[14,-26],[37+swing*.2,-24],[33+swing*.2,-20],[13,-19]],a.low);
   rect(27+swing*.2,-22,12,3,a.trim);
  }else if(role===2){
   part([[11,-29],[19,-37],[41+swing*.3,-32],[42+swing*.3,-23],[18,-18]],a.outline);
   part([[16,-32],[22,-36],[39+swing*.3,-31],[36,-25],[15,-24]],a.low);
   rect(30,-33,10,3,a.trim);
  }else if(role===4){
   for(let i=0;i<3;i++){
    part([[12+i*5,-40],[18+i*5,-46],[23+i*5,-21]],i%2?a.high:a.trim);
   }
  }else if(role===5){
   part([[13,-42],[20,-49],[46+swing*.3,-43],[45+swing*.3,-34],[16,-30]],a.outline);
   part([[15,-40],[20,-47],[42+swing*.3,-41],[41+swing*.3,-36]],a.trim);
   rect(33,-38,11,5,a.dark);
  }else if(healer){
   rect(15,-32,16,17,a.outline);rect(17,-31,11,10,a.low);
   rect(21,-28,6,5,'#b3da92');rect(18,-26,12,3,a.glow);
  }
 }
 // Three-sided metal edge glints and painted weathering, no flat cartoon strokes.
 if(!dead){
  for(let k=0;k<8;k++){
   const rx=-17+Math.floor(hash(k,role+f*19)*35),ry=-36+Math.floor(hash(k+3,f*31+role)*28);
   rect(rx,ry,2,1,k%3===0?a.trim:a.high);
  }
  if(hit&&br){
   for(let k=0;k<4;k++){
    part([[28+k*3,-33],[37+k*4,-39-k*2],[34+k*4,-29]],k%2?'#ffd687':'#ff753e');
   }
  }
 }else{
  for(let k=0;k<7;k++){
   const ang=k*2.5;
   rect(Math.cos(ang)*fall*17,Math.sin(ang)*fall*15-23,2+k%2,3,a.trim);
  }
 }
 g.restore();
 cache.set(key,cv);
 if(cache.size>1900){
  for(const k of cache.keys()){cache.delete(k);if(cache.size<=1600)break;}
 }
 return cv;
}
function effect(g,x,y,scale,mode='hit',frame=0){
 const q=worldToScreen(x,y);const t=clamp(frame,0,1);
 g.save();g.translate(q.x,q.y);
 g.globalAlpha=Math.max(0,1-t);
 g.strokeStyle=mode==='heal'?'#9be8a9':'#efba68';
 g.lineWidth=3;g.beginPath();g.ellipse(0,0,8+scale*t,3+(scale*.45)*t,0,0,7);g.stroke();
 for(let i=0;i<7;i++){
  const a=i*2.4;
  g.fillStyle=i%2?'#fff1bc':'#c65b3e';
  g.fillRect(Math.cos(a)*t*scale,Math.sin(a)*t*scale-(1-t)*12,3,2);
 }
 g.restore();
}
global.IsoWorld=Object.freeze({
 SIZE,FRAMES,project:worldToScreen,unproject:screenToWorld,
 terrain,structure,factory,frame:renderFactionSprite,effect,
 portrait(f,role){return renderFactionSprite(f,role,'idle',4);},
 invalidateMaiden(){for(const k of [...cache.keys()])if(k.startsWith('4-')||k.startsWith('5-'))cache.delete(k);},
 get cachedFrames(){return cache.size;}
});
})(window);
