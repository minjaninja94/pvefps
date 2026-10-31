/* Desert Front: generated blood-iron skin sheets. Each role has 4×2 transparent 96px poses. */
(function(global){'use strict';
const names=['assault','rifle','antiarmor','heavy','antiair','siege','flyer','support','sniper','assassin'];
const sheets=names.map(()=>null),requested=new Set(),failed=new Set(),cache=new Map();
const actions={idle:[0,1],move:[2,3],attack:[4,5],siege:[4,6],skill:[6],hit:[5],spawn:[0],death:[7]};
function slot(role){return role>=0&&role<=7?role:role===9?8:role===10?9:-1;}
function load(role){
 const i=slot(role);if(i<0||requested.has(i)||typeof Image==='undefined')return;
 requested.add(i);const im=new Image();im.decoding='async';
 im.onload=()=>{sheets[i]=im;cache.clear();global.dispatchEvent?.(new Event('desert-blood-iron-ready'));};
 im.onerror=()=>{failed.add(i);global.dispatchEvent?.(new Event('desert-blood-iron-ready'));};
 im.src='./assets/sprites/blood-iron-'+names[i]+'-actions.webp?v=blood-iron1';
}
function frame(role,action='idle',phase=0){
 const i=slot(role);if(i<0)return null;load(role);
 const source=sheets[i];if(!source?.naturalWidth)return null;
 const f=((Math.floor(phase)||0)%16+16)%16,poses=actions[action]||actions.idle;
 const pose=poses.length===1?poses[0]:poses[Math.min(poses.length-1,Math.floor(f/8))];
 const key=i+':'+pose;if(cache.has(key))return cache.get(key);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=72;
 const g=canvas.getContext('2d');if(!g)return null;
 g.imageSmoothingEnabled=false;g.drawImage(source,(pose%4)*96,Math.floor(pose/4)*96,96,96,0,0,72,72);
 if(cache.size>140)cache.delete(cache.keys().next().value);
 cache.set(key,canvas);return canvas;
}
function preload(){for(const r of [0,1,2,3,4,5,6,7,9,10])load(r);}
global.DesertBloodIronArt=Object.freeze({frame,load,preload,loadedCount:()=>sheets.filter(Boolean).length,failedCount:()=>failed.size});
})(window);
