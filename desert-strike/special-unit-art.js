/* Dedicated illustrated cavalry, vehicle, transformer and human support actions. */
(function(global){'use strict';
const ROWS={'3-6':0,'4-6':1,'6-6':2,'7-6':3,'3-7':4},cache=new Map();
let image=null;
function frame(f,r,action,n){
 const row=ROWS[f+'-'+r];if(row===undefined||!image)return null;
 const phase=Math.max(0,Math.min(15,Math.floor(n)||0));
 const poses=action==='death'?[6,7]:action==='move'?[1,2]:action==='attack'?[3,4]:action==='skill'||action==='siege'?[3,4,5]:action==='hit'?[6]:[0];
 const pose=poses[Math.min(poses.length-1,Math.floor(phase/16*poses.length))],key=row+'-'+pose;
 if(cache.has(key))return cache.get(key);
 const cv=document.createElement('canvas');cv.width=cv.height=72;const g=cv.getContext('2d');if(!g)return null;
 g.imageSmoothingEnabled=false;g.drawImage(image,pose*96,row*96,96,96,0,0,72,72);cache.set(key,cv);return cv;
}
function draw(g,f,r,a,n){const cv=frame(f,r,a,n);if(!cv)return false;g.drawImage(cv,0,0);return true;}
global.DesertSpecialArt=Object.freeze({frame,draw,isSpecial:(f,r)=>ROWS[f+'-'+r]!==undefined});
if(typeof Image!=='undefined'){const im=new Image();im.decoding='async';im.onload=()=>{image=im;for(const key of Object.keys(ROWS))global.IsoWorld?.invalidateSpriteFaction?.(Number(key.split('-')[0]));global.dispatchEvent?.(new Event('desert-real-sprites-ready'));};im.src='./assets/sprites/special-actions.webp?v=reference3';}
})(window);
