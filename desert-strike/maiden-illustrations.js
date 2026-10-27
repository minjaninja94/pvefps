/* Desert Front — real generated illustration atlas, 2 faction hero portraits + 16 unit images.
 * The source is an actual binary WebP committed to assets/, NOT canvas-drawn stand-in art.
 * Sprites are composited with the animated 2.5D lower bodies/weapon rigs.
 */
(function(global){
 'use strict';
 const SRC='./assets/maiden-atlas.webp?v=illustration1';
 const TILE_W=64,TILE_H=80,cache=new Map();
 const atlas={src:SRC,loaded:false,failed:false,heroBox(f){return f===4?[0,0,256,192]:f===5?[256,0,256,192]:null;},
  portraitBox(f,r){return f>=4&&f<=5&&r>=0&&r<8?[r*64,192+(f-4)*80,TILE_W,TILE_H]:null;},
  getImage(){return image;}, 
  invalidate(){cache.clear();}
 };
 let image=null;
 function spriteTile(f,r){
  const key=f+':'+r;if(cache.has(key))return cache.get(key);
  const box=atlas.portraitBox(f,r);
  if(!box||!atlas.loaded||!image)return null;
  const can=document.createElement('canvas');can.width=64;can.height=80;
  const c=can.getContext('2d',{willReadFrequently:true});if(!c)return null;
  c.clearRect(0,0,64,80);c.drawImage(image,...box,0,0,64,80);
  // Edge vignette + dark matte extraction. Existing sprite armor and legs remain underneath.
  // Character face/hair highlights remain untouched, black backdrop is removed.
  try{
   const pixels=c.getImageData(0,0,64,80),p=pixels.data;
   for(let y=0;y<80;y++)for(let x=0;x<64;x++){
    const i=(y*64+x)*4,r0=p[i],g0=p[i+1],b0=p[i+2];
    const lum=Math.max(r0,g0,b0),saturation=Math.max(r0,g0,b0)-Math.min(r0,g0,b0);
    const edge=Math.min(1,(x+2)/5,(65-x)/5,(y+3)/5,(81-y)/9);
    let alpha=Math.max(0,Math.min(255,(lum-21)*4.4+saturation*.65))*edge;
    if(lum<24)alpha=0;
    p[i+3]=Math.round(alpha);
   }
   c.putImageData(pixels,0,0);
  }catch(e){/* If getImageData is unavailable keep normal pixel art fallback. */}
  cache.set(key,can);return can;
 }
 function overlay(g,f,role,mode,frame){
  const tile=spriteTile(f,role);if(!tile)return false;
  const t=frame/16,rad=t*Math.PI*2,move=mode==='move',attack=mode==='attack'||mode==='siege',dead=mode==='death';
  const bounce=move?Math.abs(Math.sin(rad))*2:Math.sin(rad)*.65;
  const lean=attack?Math.sin(t*Math.PI)*3:move?Math.sin(rad)*1.1:0;
  // 2.5D weapon rigs + leg animation are still drawn by HeroineFactions.
  g.save();g.globalAlpha=dead?Math.max(0,1-t):.97;g.imageSmoothingEnabled=false;
  g.translate(lean, -bounce);
  if(dead){g.translate(36,47);g.rotate(t*.45);g.translate(-36,-47);}
  g.drawImage(tile,f===4?9:7,f===4?7:5,f===4?54:57,f===4?59:62);
  // Coordinated 2.5D luminous trim and fluttering cape for both illustrated heroine races.
  const accent=f===4?'#f4b7c4':'#b6f7df',back=f===4?'#86607c':'#607f96';
  g.globalAlpha=dead?.20:.65;
  g.strokeStyle=back;g.lineWidth=2;g.beginPath();
  g.moveTo(20,47);g.quadraticCurveTo(17-Math.sin(rad)*3,52,14-Math.sin(rad)*5,59);g.stroke();
  g.strokeStyle=accent;g.lineWidth=1;g.beginPath();
  g.moveTo(20,48);g.quadraticCurveTo(17-Math.sin(rad)*3,52,14-Math.sin(rad)*5,59);g.stroke();
  if(!dead){
   g.globalAlpha=.8;g.fillStyle=accent;
   const glitter=(frame+role*3)%16;
   g.fillRect(52+Math.sin(rad)*3,11+glitter*.25,2,2);
   g.fillRect(19-Math.sin(rad)*3,8+(glitter%5),1,2);
  }
  g.globalAlpha=dead?Math.max(0,1-t):.97;
  if(attack&&frame>=7&&frame<=10){
   g.globalCompositeOperation='screen';g.fillStyle=f===4?'#f3abb1':'#afeecf';
   g.fillRect(60,12,3,20);g.fillRect(65,18,3,10);
  }
  g.restore();return true;
 }
 function drawStandalone(g,f,role,mode,frame){
  const tile=spriteTile(f,role);if(!tile)return false;
  const t=frame/16,theta=t*Math.PI*2,walk=mode==='move',strike=mode==='attack'||mode==='siege',dy=walk?Math.abs(Math.sin(theta))*2.5:Math.sin(theta)*.8;
  const dead=mode==='death',fall=dead?t:0;
  g.save();g.imageSmoothingEnabled=false;g.translate(0,-dy);
  if(dead){g.translate(35,55);g.rotate(fall*.93);g.translate(-35,-55);g.globalAlpha=Math.max(.08,1-fall);}
  // Preserve every pixel within canvas: animal girls are compact shortstacks,
  // elves taller/long-legged. Full cutouts, never a second hidden humanoid model.
  const size=f===4?{x:12,y:7,w:48,h:59}:{x:9,y:2,w:55,h:66};
  if(walk)g.translate(Math.sin(theta)*1.4,0);
  g.drawImage(tile,0,0,64,80,size.x,size.y,size.w,size.h);
  // Independent foreground weapon motion and highlight for existing 16-frame actions.
  const weapon=f===4?'#f2b2c2':'#a9fce5',swing=strike?Math.sin(Math.PI*t)*12:0;
  g.strokeStyle=weapon;g.lineWidth=f===4?3:2;g.lineCap='round';
  g.beginPath();g.moveTo(53,48);g.lineTo(60,21-swing);g.lineTo(64,10-swing);g.stroke();
  g.fillStyle=weapon;g.fillRect(62,6-swing,3,7);
  if(strike&&frame>=6&&frame<=11){g.globalAlpha=.7;g.fillRect(66,18-swing,3,18);g.fillRect(59,12-swing,2,7);}
  g.restore();return true;
 }
 atlas.drawStandalone=drawStandalone;atlas.overlay=overlay;atlas.spriteTile=spriteTile;
 global.MaidenArt=atlas;
 if(typeof Image==='undefined'||!global.document){return;}
 image=new Image();image.decoding='async';
 image.onload=()=>{
  atlas.loaded=true;cache.clear();
  if(typeof global.CustomEvent==='function')global.dispatchEvent(new global.CustomEvent('maiden-art-ready'));
  else if(typeof global.Event==='function')global.dispatchEvent(new global.Event('maiden-art-ready'));
 };
 image.onerror=()=>{atlas.failed=true;console.warn('미소녀 이미지 아틀라스를 불러오지 못했습니다.',SRC);};
 image.src=SRC;
})(window);
