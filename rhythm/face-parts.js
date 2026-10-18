/* Independently composited painted eyelid, mouth and hair-accent layers.
 * Cut from the project's FOUR aligned illustrated head frames per hairstyle.
 * The underlying face NEVER receives mesh deformation.
 *
 * Atlas expressions: 0 relaxed / 1 closed eyelids / 2 focused & speaking /
 * 3 clenched hit. Feathered sub-sprites preserve the painterly outlines. */
(()=>{
 'use strict';
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const coord=Object.freeze({
  long:{left:[.648,.476,.137,.094],right:[.807,.545,.113,.095],mouth:[.692,.663,.151,.088]},
  twin:{left:[.637,.464,.129,.099],right:[.817,.544,.113,.103],mouth:[.692,.658,.148,.089]},
  wave:{left:[.614,.454,.128,.086],right:[.785,.491,.121,.089],mouth:[.68,.619,.14,.082]},
  short:{left:[.594,.477,.133,.101],right:[.777,.554,.118,.093],mouth:[.693,.686,.147,.094]}
 });
 const cache=new WeakMap();
 const available={eyes:true,mouth:true,hair:true};
 let enabled={...available};
 function patch(source,sheet,frameNo,landmark){
  const f=sheet.frames[frameNo],w=f.w,h=f.h;
  const [ux,uy,uw,uh]=landmark;
  const pw=Math.max(6,Math.round(w*uw)),ph=Math.max(6,Math.round(h*uh));
  const left=clamp(Math.round(w*ux-pw*.5),0,w-pw);
  const top=clamp(Math.round(h*uy-ph*.5),0,h-ph);
  const c=document.createElement('canvas');c.width=pw;c.height=ph;
  const g=c.getContext('2d');if(!g)return null;
  g.drawImage(source,f.sx+left,f.sy+top,pw,ph,0,0,pw,ph);
  g.globalCompositeOperation='destination-in';
  const radius=Math.max(pw,ph)*.56;
  const gradient=g.createRadialGradient(pw*.5,ph*.5,Math.min(pw,ph)*.18,pw*.5,ph*.5,radius);
  gradient.addColorStop(0,'rgba(255,255,255,1)');
  gradient.addColorStop(.67,'rgba(255,255,255,.94)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gradient;g.fillRect(0,0,pw,ph);
  g.globalCompositeOperation='source-over';
  return {canvas:c,left,top,w:pw,h:ph}
 }
 function partsFor(source,sheet,style){
  let pool=cache.get(source);
  if(!pool){pool=new Map();cache.set(source,pool)}
  if(pool.has(style))return pool.get(style);
  const landmarks=coord[style]||coord.long;
  const parts={
   closed:[patch(source,sheet,1,landmarks.left),patch(source,sheet,1,landmarks.right)],
   focused:[patch(source,sheet,2,landmarks.left),patch(source,sheet,2,landmarks.right)],
   mouthTalk:patch(source,sheet,2,landmarks.mouth),
   mouthTense:patch(source,sheet,3,landmarks.mouth)
  };
  pool.set(style,parts);
  return parts;
 }
 function paintPatch(g,part,frame,scale,alpha,shiftX=0,shiftY=0){
  if(!part||alpha<=.005)return;
  g.save();g.globalAlpha*=clamp(alpha);
  g.drawImage(part.canvas,(part.left-frame.faceX)*scale+shiftX,(part.top-frame.faceY)*scale+shiftY,part.w*scale,part.h*scale);
  g.restore();
 }
 function drawHairAccents(g,frame,style,p,rig,scale,t){
  if(!enabled.hair||p.hairAccent===false)return;
  const s=(p.headScale??1)*scale,move=(rig.hair||0)*.37;
  const x=(-frame.w*.11)*s,y=(-frame.h*.26)*s;
  g.save();g.lineCap='round';g.lineJoin='round';
  const color=/^#[0-9a-f]{6}$/i.test(p.hair||'')?p.hair:'#d7dcfa';
  const wisps=style==='short'?2:style==='twin'?4:3;
  for(let i=0;i<wisps;i++){
   const sway=move*(i%2?-.6:1)+Math.sin(t*2.1+i)*.8;
   const px=x+i*frame.w*.085*s,py=y-i*frame.h*.023*s;
   g.globalAlpha=.19+i*.055;
   g.strokeStyle=i%2?'#f3f7ff':color;g.lineWidth=(1.5+i%2)*s;
   g.beginPath();g.moveTo(px,py);g.bezierCurveTo(px+frame.w*.015*s+sway,py+frame.h*.06*s,
    px+frame.w*.03*s+sway,py+frame.h*.13*s,
    px+frame.w*.004*s+sway*2,py+frame.h*.18*s);
   g.stroke();
  }
  g.restore();
 }
 function draw(g,{source,sheet,style='long',frame,scale=1,profile={},rig={},time=0,action='idleA',reduced=false}){
  if(!source||!sheet?.frames?.length||!frame)return;
  const p=partsFor(source,sheet,style),sc=scale*(profile.headScale??1);
  const anim=Number(time)||0;
  const blink=reduced||profile.blinkMode==='off'?0:clamp(rig.blink||0);
  const blinkStrength=Math.pow(blink,1.8); // Quickly replace eye artwork, no stretching.
  if(enabled.eyes){
   const focused=action==='guard'||action==='ready'||action==='superCharge'||profile.expression==='serious';
   if(focused)for(const item of p.focused)paintPatch(g,item,frame,sc,.82*(1-blinkStrength));
   if(blinkStrength>.025)for(const item of p.closed)paintPatch(g,item,frame,sc,blinkStrength);
  }
  if(enabled.mouth){
   const talking=profile.expression==='talk';
   const tense=profile.expression==='serious'||action==='hit'||action==='hitHeavy'||action==='lose';
   if(talking)paintPatch(g,p.mouthTalk,frame,sc,reduced?.5:.82+.12*Math.sin(anim*6));
   else if(tense)paintPatch(g,p.mouthTense,frame,sc,.85);
  }
  drawHairAccents(g,frame,style,profile,rig,scale,anim);
 }
 function settings(flags){if(flags&&typeof flags==='object')for(const key of Object.keys(available))if(typeof flags[key]==='boolean')enabled[key]=flags[key];return {...enabled}}
 window.NeonFaceParts=Object.freeze({draw,settings,landmarks:coord,patchCount:6});
})();