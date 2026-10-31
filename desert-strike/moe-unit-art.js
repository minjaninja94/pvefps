/* Independent illustrated skin animation atlases: 8 roles × 8 painted poses each. */
(function(global){'use strict';
const NAMES=['forge','brood','astral','marine','beastkin','elf','furry','robot','octoper','fairy'],assets=NAMES.map(()=>null),portraits=[],loading=new Set(),cache=new Map();
const poses={idle:[0,1],move:[2,3],attack:[4,5],siege:[4,6],skill:[4,6],hit:[5],spawn:[0],death:[7]};
// Several supplied columns contain two or three portraits stacked vertically.
// Select one complete face instead of fitting the entire reference column.
const portraitRows=[[0,235],[0,260],[300,512],[155,400],[42,512],[30,512],[0,285],[0,260],[280,512],[0,280]];
function frame(f,r,action='idle',phase=0){
 if(!Number.isInteger(f)||f<0||f>9||!Number.isInteger(r)||r<0||r>7)return null;
 load(f);const image=assets[f];if(!image)return global.IsoWorld?.frame(f,r,action,phase)||null;
 const n=((Math.floor(phase)||0)%16+16)%16,list=poses[action]||poses.idle;
 const index=action==='move'||action==='idle'?Math.floor(n/2)%list.length:Math.min(list.length-1,Math.floor(n/16*list.length));
 const pose=list[index],fade=action==='death'?Math.floor(n/2):0,key=[f,r,pose,fade].join(':');if(cache.has(key))return cache.get(key);
 const cv=document.createElement('canvas');cv.width=cv.height=72;const g=cv.getContext('2d');if(!g)return null;
 g.imageSmoothingEnabled=false;if(action==='death')g.globalAlpha=1-n/20;
 g.drawImage(image,pose*96,r*96,96,96,0,0,72,72);if(cache.size>=1200)cache.delete(cache.keys().next().value);cache.set(key,cv);return cv;
}
function cover(g,f,w,h){
 loadPortrait(f);const image=portraits[f];if(!image?.complete||!image.naturalWidth)return false;
 g.save();g.clearRect(0,0,w,h);g.fillStyle='#211c36';g.fillRect(0,0,w,h);
 const [top,bottom]=portraitRows[f],sy=top/512*image.naturalHeight,sh=(bottom-top)/512*image.naturalHeight;
 const scale=Math.min(w/image.naturalWidth,h/sh),dw=image.naturalWidth*scale,dh=sh*scale;
 g.drawImage(image,0,sy,image.naturalWidth,sh,(w-dw)/2,(h-dh)/2,dw,dh);
 g.fillStyle='#ef9bcc';g.fillRect(0,h-3,w,3);g.restore();return true;
}
function ready(){global.dispatchEvent?.(new Event('desert-moe-ready'));}
function loadPortrait(f){if(portraits[f]||typeof Image==='undefined')return;const im=new Image();im.decoding='async';im.onload=ready;im.src='./assets/sprites/moe-'+NAMES[f]+'-portrait.webp?v=ground-special-20261031';portraits[f]=im;}
function load(f){if(loading.has(f)||typeof Image==='undefined')return;loading.add(f);loadPortrait(f);const im=new Image();im.decoding='async';im.onerror=()=>loading.delete(f);im.onload=()=>{assets[f]=im;cache.clear();ready();};im.src='./assets/sprites/moe-'+NAMES[f]+'-actions.webp?v=ground-special-20261031';}
function preload(){NAMES.forEach((_,f)=>load(f));}
global.DesertMoeArt=Object.freeze({frame,cover,load,preload,names:NAMES,loadedCount:()=>assets.filter(Boolean).length});
})(window);
