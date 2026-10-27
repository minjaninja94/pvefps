/* Alternate chibi costume art for all eighty units; separate from the default atlas. */
(function(global){'use strict';
const SIZE=72,cache=new Map(),TAU=Math.PI*2;
const PALETTES=[
 ['#8dbfdd','#314c60','#e6c99f','#8de5ef'],
 ['#ba97d8','#48345b','#e1b2b0','#d7ff9e'],
 ['#e1dcff','#5f5395','#eacfc4','#aaf5ff'],
 ['#ed8585','#4a3537','#e7bd9e','#fa5454'],
 ['#e9ac9d','#70515b','#ffd6b4','#ffe6a6'],
 ['#e0e7b9','#457e71','#f3dec1','#96ffdc'],
 ['#c8b29a','#676256','#eecaa7','#aef2eb'],
 ['#cee3fc','#466681','#d6e8fa','#72fbff'],
 ['#d0b9ed','#59447b','#e1c5de','#a5f7e0'],
 ['#f4bedf','#bb83a8','#fce2d6','#d6fff0']
];
function rect(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function poly(g,p,c){g.fillStyle=c;g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);g.closePath();g.fill();}
function frame(f,r,mode='idle',phase=0){
 const n=((Math.floor(phase)||0)%16+16)%16,key=[f,r,mode,n].join(':');
 if(cache.has(key))return cache.get(key);
 const cv=document.createElement('canvas');cv.width=SIZE;cv.height=SIZE;
 const g=cv.getContext('2d');if(!g)return null;
 g.imageSmoothingEnabled=false;
 const pal=PALETTES[f]||PALETTES[0],t=n*TAU/16,step=mode==='move'?Math.sin(t)*2:0,active=['attack','siege','skill'].includes(mode);
 // Preserve the special vehicles and mounts, replacing their pilots/riders only.
 if(r===6&&[3,4,6,7].includes(f)){
  const chassis=global.IsoWorld?.frame(f,r,mode,n);
  if(chassis)g.drawImage(chassis,0,0,SIZE,SIZE);
  const hx=f===3?38:f===7?36:38,hy=f===3?20:f===7?23:13;
  rect(g,hx-7,hy-8,14,12,pal[1]);rect(g,hx-5,hy-6,10,11,pal[2]);
  rect(g,hx-7,hy-10,15,5,pal[0]);rect(g,hx-4,hy,3,2,'#18232e');rect(g,hx+2,hy,3,2,'#18232e');
  rect(g,hx-2,hy+4,5,2,'#e8abb0');
 }else{
  g.fillStyle='#11212a7b';g.beginPath();g.ellipse(36,62,16,4,0,0,TAU);g.fill();
  g.save();g.translate(step,-Math.abs(step));
  if(mode==='death'){g.translate(36,51);g.rotate(n/15*.9);g.translate(-36,-51);g.globalAlpha=Math.max(.1,1-n/16);}
  if(r===6&&[0,1,2,5,8,9].includes(f)){
   for(let side of [-1,1]){
    const wing=f===9?'#f7bcdc':f===1?'#946d96':f===8?'#a78dd0':f===5?'#acd8bc':pal[0];
    poly(g,[[36,36],[36+side*23,17],[36+side*28,40],[36+side*19,49]],wing);
    poly(g,[[36,37],[36+side*18,30],[36+side*24,53]],pal[3]);
   }
  }
  // Distinct body and civilian-safe full costume for each faction and role.
  rect(g,26,43,8,15,'#1e2b35');rect(g,39,43,8,15,'#1e2b35');
  rect(g,25,55,11,4,pal[1]);rect(g,38,55,11,4,pal[1]);
  poly(g,[[26,34],[33,30],[42,30],[50,36],[48,50],[25,50]],pal[1]);
  rect(g,31,35,12,10,pal[0]);rect(g,34,36,4,10,pal[3]);
  rect(g,20,34,7,14,pal[0]);rect(g,48,34,7,14,pal[0]);
  // Hair has a complete silhouette inside the atlas cell, even with wings/ears.
  rect(g,21,9,30,27,pal[1]);rect(g,24,11,24,23,pal[0]);rect(g,26,19,20,18,pal[2]);
  rect(g,21,25,6,15,pal[0]);rect(g,47,24,6,14,pal[0]);
  rect(g,27,11,19,6,pal[0]);rect(g,24,17,11,5,pal[0]);
  rect(g,29,27,4,3,'#1e2e3d');rect(g,41,27,4,3,'#1e2e3d');
  rect(g,30,27,2,2,pal[3]);rect(g,42,27,2,2,pal[3]);
  rect(g,34,34,6,2,'#d492a2');
  if(f===3){rect(g,24,12,25,7,'#992f32');rect(g,32,9,7,5,'#e3bd8a');}
  if(f===4||f===6){
   poly(g,[[25,15],[26,2],[36,13]],pal[0]);poly(g,[[41,13],[48,2],[49,16]],pal[0]);
   rect(g,23,31,4,5,pal[1]);rect(g,48,32,4,5,pal[1]);
  }
  if(f===5){poly(g,[[24,25],[16,28],[24,32]],pal[2]);poly(g,[[49,25],[58,28],[48,32]],pal[2]);}
  if(f===8){for(let i=0;i<4;i++)rect(g,19+i*11,7+(i%2)*3,4,8,pal[1]);}
  if(f===7){rect(g,23,13,26,8,'#375470');rect(g,27,22,20,12,'#b7dcf2');rect(g,29,27,4,2,'#28608a');}
  if(f===9){rect(g,24,10,25,6,'#fbd7ed');rect(g,34,7,6,6,'#c9f49d');}
  // Equipment changes per role: no identical-looking 80-unit sprite grid.
  if(r===0||r===3){
   rect(g,54,23+(active?7:0),3,29,'#cfd5d5');rect(g,53,24+(active?7:0),7,4,pal[3]);
   if(r===3)rect(g,18,33,8,20,pal[3]);
  }else if([1,2,4].includes(r)){
   rect(g,49,34,19,5,pal[1]);rect(g,55,35,11,2,pal[3]);
   if(r===2)rect(g,49,32,14,3,'#dfc793');
  }else if(r===5){
   rect(g,54,13,3,32,pal[3]);rect(g,50,10,12,8,pal[0]);
   if(active){rect(g,60,9,5,5,'#ffe1a1');}
  }else if(r===7){
   rect(g,55,18,3,30,pal[0]);rect(g,49,15,14,6,pal[3]);
   if(active){for(let i=0;i<3;i++)rect(g,16+i*20,11+(i%2)*4,4,4,pal[3]);}
  }else if(r===6){rect(g,53,28,16,4,pal[3]);}
  g.restore();
 }
 cache.set(key,cv);
 if(cache.size>6500){for(const k of cache.keys()){cache.delete(k);if(cache.size<5200)break;}}
 return cv;
}
global.DesertMoeArt=Object.freeze({frame});
})(window);
