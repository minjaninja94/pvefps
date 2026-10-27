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
    const edge=Math.min(1,x/7,(63-x)/7,y/6,(79-y)/12);
    let alpha=Math.max(0,Math.min(255,(lum-29)*4.3+saturation*.8))*edge;
    if(lum<33)alpha=0;
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
  if(attack&&frame>=7&&frame<=10){
   g.globalCompositeOperation='screen';g.fillStyle=f===4?'#f3abb1':'#afeecf';
   g.fillRect(60,12,3,20);g.fillRect(65,18,3,10);
  }
  g.restore();return true;
 }
 atlas.overlay=overlay;atlas.spriteTile=spriteTile;
 global.MaidenArt=Object.freeze(atlas);
 if(typeof Image==='undefined'||!global.document){return;}
 image=new Image();image.decoding='async';
 image.onload=()=>{
  atlas.loaded=true;cache.clear();
  if(typeof global.CustomEvent==='function')global.dispatchEvent(new CustomEvent('maiden-art-ready'));
  else if(typeof global.Event==='function')global.dispatchEvent(new Event('maiden-art-ready'));
 };
 image.onerror=()=>{atlas.failed=true;console.warn('미소녀 이미지 아틀라스를 불러오지 못했습니다.',SRC);};
 image.src=SRC;
})(window);
