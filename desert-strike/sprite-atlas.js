/* Real generated 10-faction sprite atlas driver.
   Each transparent WEBP: 480×768, 8 roles × 5 illustrated action poses;
   additional motion phases are tweened for all 16 frame positions.
   All races, PvP, solo, lobby and the sprite gallery share IsoWorld.frame. */
(function(global){'use strict';
 const NAMES=Object.freeze(['forge','brood','astral','marine','beastkin','elf','furry','robot','octoper','fairy']);
 const ACTIONS=Object.freeze(['idle','move','attack','skill','death']);
 const W=96,HEIGHT=72,FRAMES=16;
 const registered=NAMES.map(()=>({status:'new',image:null,error:null}));
 const cache=new Map();
 const mapAction=action=>({idle:'idle',move:'move',attack:'attack',siege:'skill',skill:'skill',spawn:'idle',hit:'attack',death:'death'}[action]||'idle');
 function get(faction,role,action,frame){
  if(!Number.isInteger(faction)||faction<0||faction>=NAMES.length
   ||!Number.isInteger(role)||role<0||role>7)return null;
  const asset=registered[faction];if(asset.status!=='ready')return null;
  const phase=((Math.floor(frame)||0)%FRAMES+FRAMES)%FRAMES;
  const mode=mapAction(action),key=faction+'-'+role+'-'+mode+'-'+phase;
  if(cache.has(key))return cache.get(key);
  const cv=document.createElement('canvas');cv.width=W;cv.height=HEIGHT;
  const g=cv.getContext('2d');if(!g)return null;
  const fraction=phase/(FRAMES-1),rad=fraction*Math.PI*2;
  const pose=ACTIONS.indexOf(mode);
  const x=pose*W,y=role*W;
  const stride=mode==='move'?Math.sin(rad)*3:0;
  const bounce=mode==='move'?Math.abs(Math.sin(rad))*3:mode==='idle'?Math.sin(rad)*.8:0;
  const slash=mode==='attack'||mode==='skill',fallen=mode==='death';
  const scale=mode==='move'?1+.015*Math.sin(rad):1;
  g.save();g.imageSmoothingEnabled=false;
  g.translate(W/2+stride,HEIGHT*.5-bounce);
  if(fallen){g.translate(fraction*8,fraction*8);g.rotate(fraction*.87);g.globalAlpha=Math.max(.12,1-fraction*.88);}
  else if(slash){g.rotate(Math.sin(Math.PI*fraction)*-.09);}
  g.scale(scale,scale);
  // transparent source animation sheets contain no unit names, UI or backgrounds
  // Scale the full 96x96 atlas cell into a padded 72px canvas. No top/bottom clipping.
  const fitted=64;
  g.drawImage(asset.image,x,y,W,W,-fitted/2,-fitted/2,fitted,fitted);
  if(mode==='attack'&&phase>=5&&phase<=11){
   g.globalAlpha=.65;g.strokeStyle=faction===8?'#d674fb':faction===7?'#87e5ff':'#ffe2ad';
   g.lineWidth=2;g.beginPath();
   g.moveTo(25,-14);g.lineTo(37,-19);g.stroke();
  }
  g.restore();cache.set(key,cv);return cv;
 }
 function ready(faction,img){
  const s=registered[faction];s.image=img;s.status='ready';
  for(const key of cache.keys())if(key.startsWith(faction+'-'))cache.delete(key);
  global.IsoWorld?.invalidateSpriteFaction?.(faction);
  global.dispatchEvent?.(new Event('desert-real-sprites-ready',{detail:{faction}}));
 }
 function load(faction){
  const s=registered[faction];if(!s||s.status!=='new'||typeof Image==='undefined')return;
  s.status='loading';
  const img=new Image();img.decoding='async';
  img.onload=()=>{
   if(img.naturalWidth===480&&img.naturalHeight===768)ready(faction,img);
   else{s.status='error';s.error='Atlas must be 480×768.';}
  };
  img.onerror=()=>{s.status='error';s.error='Missing sprite asset: '+NAMES[faction];};
  img.src='./assets/sprites/'+NAMES[faction]+'.webp?v=real-atlas-2';
 }
 function preload(){NAMES.forEach((_,f)=>load(f));}
 global.DesertRealSprites=Object.freeze({
  names:NAMES,actions:ACTIONS,frame:get,preload,load,
  status:f=>registered[f]?.status||'error',loadedCount:()=>registered.filter(a=>a.status==='ready').length
 });
 if(typeof document!=='undefined')preload();
})(window);
