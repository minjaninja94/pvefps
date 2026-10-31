/* Generated faction skins: ten role sheets, each with eight transparent poses. */
(function(global){'use strict';
const catalog=global.DesertSkinCatalog;
const roles=[0,1,2,3,4,5,6,7,9,10];
const names=['assault','rifle','antiarmor','heavy','antiair','siege','flyer','support','sniper','assassin'];
const actions={idle:[0,1],ready:[1],move:[2,3],attack:[4,5],siege:[4,6],skill:[6],hit:[5],spawn:[0],death:[7]};
const entries=new Map(),cache=new Map();
function entry(id){if(!entries.has(id))entries.set(id,{sheets:new Map(),requested:new Set(),failed:new Set()});return entries.get(id);}
function available(id,faction){const s=catalog?.get(id);return !!s&&s.status==='ready'&&(faction===undefined||s.faction===faction);}
function emit(id){global.dispatchEvent?.(new CustomEvent('desert-skin-ready',{detail:{id}}));if(id==='blood-iron')global.dispatchEvent?.(new Event('desert-blood-iron-ready'));}
function load(id,role){
 const slot=roles.indexOf(role);if(slot<0||!available(id)||typeof Image==='undefined')return;
 const e=entry(id);if(e.requested.has(role))return;
 e.requested.add(role);const im=new Image();im.decoding='async';
 im.onload=()=>{if(im.naturalWidth!==384||im.naturalHeight!==192){e.failed.add(role);emit(id);return;}e.sheets.set(role,im);emit(id);};
 im.onerror=()=>{e.failed.add(role);emit(id);};
 im.src='./assets/sprites/'+id+'-'+names[slot]+'-actions.webp?v='+catalog.VERSION;
}
function frame(id,faction,role,action='idle',phase=0){
 if(!available(id,faction))return null;load(id,role);
 const source=entry(id).sheets.get(role);if(!source)return null;
 const f=((Math.floor(phase)||0)%16+16)%16,poses=actions[action]||actions.idle;
 const explicit=/^pose-[0-7]$/.test(action)?Number(action.slice(5)):null;
 const pose=explicit??poses[Math.min(poses.length-1,Math.floor(f/8))],key=id+':'+role+':'+pose;
 if(cache.has(key)){const c=cache.get(key);cache.delete(key);cache.set(key,c);return c;}
 const canvas=document.createElement('canvas');canvas.width=canvas.height=72;
 const g=canvas.getContext('2d');if(!g)return null;
 g.imageSmoothingEnabled=false;g.drawImage(source,(pose%4)*96,Math.floor(pose/4)*96,96,96,0,0,72,72);
 if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,canvas);return canvas;
}
function preload(id){for(const role of roles)load(id,role);}
function retry(id){const e=entries.get(id);if(!e)return;for(const role of e.failed)e.requested.delete(role);e.failed.clear();preload(id);}
function loadedCount(id){return entries.get(id)?.sheets.size||0;}
const api=Object.freeze({frame,load,preload,retry,available,loadedCount,failedCount:id=>entries.get(id)?.failed.size||0,has:id=>!!catalog?.get(id),roles:Object.freeze(roles)});
global.DesertSkinArt=api;
global.DesertBloodIronArt=Object.freeze({frame:(role,action,phase)=>frame('blood-iron',0,role,action,phase),load:role=>load('blood-iron',role),preload:()=>preload('blood-iron'),loadedCount:()=>loadedCount('blood-iron'),failedCount:()=>api.failedCount('blood-iron')});
})(window);
