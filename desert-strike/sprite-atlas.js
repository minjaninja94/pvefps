/* Independent default-uniform unit strips. No source-board coordinates at runtime. */
(function(global){'use strict';
 const NAMES=Object.freeze(['forge','brood','astral','marine','beastkin','elf','furry','robot','octoper','fairy']);
 const ACTIONS=Object.freeze(['idle','move','attack','skill','death']);
 const PORTRAIT_ROWS=[[0,384],[0,384],[0,384],[0,300],[0,384],[0,384],[0,384],[0,384],[0,384],[0,384]];
 const POSES=Object.freeze({idle:[0,1],move:[2,3],attack:[4,5],skill:[4,6],siege:[4,6],hit:[5],spawn:[0],death:[7]});
 const assets=NAMES.map(()=>Array.from({length:8},()=>({status:'new',image:null}))),cache=new Map(),portraits=[],banners=[];
 function frame(f,r,a='idle',n=0){
  if(!Number.isInteger(f)||!Number.isInteger(r)||f<0||f>9||r<0||r>7)return null;
  load(f,r);const s=assets[f][r];if(s.status!=='ready')return null;
  const phase=((Math.floor(n)||0)%16+16)%16,list=POSES[a]||POSES.idle;
  const index=a==='move'||a==='idle'?Math.floor(phase/2)%list.length:Math.min(list.length-1,Math.floor(phase/16*list.length));
  const pose=list[index],fade=a==='death'?Math.floor(phase/2):0,key=[f,r,pose,fade].join('-');
  if(cache.has(key))return cache.get(key);
  const cv=document.createElement('canvas');cv.width=cv.height=72;const g=cv.getContext('2d');if(!g)return null;
  g.imageSmoothingEnabled=false;if(a==='death')g.globalAlpha=1-phase/20;
  g.drawImage(s.image,pose*96,0,96,96,0,0,72,72);
  if(cache.size>=1600)cache.delete(cache.keys().next().value);cache.set(key,cv);return cv;
 }
 function load(f,r=0){const s=assets[f]?.[r];if(!s||s.status!=='new'||typeof Image==='undefined')return;
  s.status='loading';const im=new Image();im.decoding='async';
  im.onload=()=>{s.image=im;s.status='ready';cache.clear();global.IsoWorld?.invalidateSpriteFaction?.(f);global.dispatchEvent?.(new Event('desert-real-sprites-ready'));};
  im.onerror=()=>{s.status='error';};im.src='./assets/sprites/uniform-'+NAMES[f]+'-'+r+'.webp?v=ground-special-20261031';
  loadArt(f);
 }
 function loadArt(f,portrait=true){const list=portrait?portraits:banners;if(typeof Image==='undefined'||list[f]||!NAMES[f])return;
  const img=new Image();img.decoding='async';img.onload=()=>global.dispatchEvent?.(new Event('desert-real-sprites-ready'));img.src='./assets/sprites/'+NAMES[f]+'-'+(portrait?'portrait':'banner')+'.webp?v=ground-special-20261031';list[f]=img;
 }
 function cover(g,f,x,y,w,h,portrait=false){loadArt(f,portrait);const im=(portrait?portraits:banners)[f];if(!im?.complete||!im.naturalWidth)return false;
  g.save();g.clearRect(x,y,w,h);g.fillStyle='#172936';g.fillRect(x,y,w,h);
  const rows=portrait?PORTRAIT_ROWS[f]:[0,384],sy=rows[0]/384*im.naturalHeight,sh=(rows[1]-rows[0])/384*im.naturalHeight;
  const scale=Math.min(w/im.naturalWidth,h/sh),dw=im.naturalWidth*scale,dh=sh*scale;
  g.drawImage(im,0,sy,im.naturalWidth,sh,x+(w-dw)/2,y+(h-dh)/2,dw,dh);g.restore();return true;}
 global.DesertRealSprites=Object.freeze({names:NAMES,actions:ACTIONS,frame,cover,preload:()=>NAMES.forEach((_,f)=>{for(let r=0;r<8;r++)load(f,r);}),load,status:f=>assets[f]?.[0]?.status||'error',loadedCount:()=>assets.filter(rows=>rows.some(x=>x.status==='ready')).length});
 if(typeof document!=='undefined')load(0);
})(window);
