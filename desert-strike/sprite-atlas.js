/* Extracted reference actions: 8 frames × 5 actions × 8 roles. */
(function(global){'use strict';
 const NAMES=Object.freeze(['forge','brood','astral','marine','beastkin','elf','furry','robot','octoper','fairy']);
 const ACTIONS=Object.freeze(['idle','move','attack','skill','death']);
 const assets=NAMES.map(()=>({status:'new',image:null})),cache=new Map(),portraits=[],banners=[];
 const action=a=>({siege:'skill',hit:'attack',spawn:'idle'}[a]||a);
 function frame(f,r,a,n){
  const s=assets[f];if(s?.status==='new')load(f);if(!s||s.status!=='ready'||r<0||r>7)return null;
  a=action(a);const row=Math.max(0,ACTIONS.indexOf(a));
  const phase=Math.min(7,Math.floor(((n%16+16)%16)/2)),key=f+'-'+r+'-'+row+'-'+phase;
  if(cache.has(key))return cache.get(key);
  const cv=document.createElement('canvas');cv.width=cv.height=72;
  const g=cv.getContext('2d');if(!g)return null;
  g.imageSmoothingEnabled=false;g.drawImage(s.image,phase*96,(r*5+row)*96,96,96,0,0,72,72);
  if(cache.size>=1600)cache.delete(cache.keys().next().value);
  cache.set(key,cv);return cv;
 }
 function load(f){const s=assets[f];if(!s||s.status!=='new'||typeof Image==='undefined')return;
  s.status='loading';const im=new Image();im.decoding='async';
  im.onload=()=>{s.image=im;s.status='ready';cache.clear();global.IsoWorld?.invalidateSpriteFaction?.(f);global.dispatchEvent?.(new Event('desert-real-sprites-ready'));};
  im.onerror=()=>{s.status='error';};im.src='./assets/sprites/'+NAMES[f]+'-actions.webp?v=reference3';
  loadArt(f);
 }
 function loadArt(f){if(typeof Image==='undefined'||portraits[f])return;
  for(const [list,suffix] of [[portraits,'portrait'],[banners,'banner']]){const img=new Image();img.decoding='async';img.onload=()=>global.dispatchEvent?.(new Event('desert-real-sprites-ready'));img.src='./assets/sprites/'+NAMES[f]+'-'+suffix+'.webp?v=reference3';list[f]=img;}
 }

 function cover(g,f,x,y,w,h,portrait=false){loadArt(f);const im=(portrait?portraits:banners)[f];if(!im?.complete||!im.naturalWidth)return false;g.drawImage(im,x,y,w,h);return true;}
 global.DesertRealSprites=Object.freeze({names:NAMES,actions:ACTIONS,frame,cover,preload:()=>NAMES.forEach((_,f)=>load(f)),load,status:f=>assets[f]?.status||'error',loadedCount:()=>assets.filter(x=>x.status==='ready').length});
 if(typeof document!=='undefined')load(0);
})(window);
