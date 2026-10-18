/* Pre-generated painted wardrobe: independent head-expression and costume-action atlases.
 * No AI service runs in the browser. Source sprites remain unmodified in the repository. */
(()=>{'use strict';
const COSTUMES=['armor','idol','street','mage','cyber'],HEADS=['long','twin','wave','short'];
const palettes=['original','rose','midnight','emerald','custom'];
const files=[...COSTUMES.map(id=>({key:'body:'+id,url:'./assets/doll/body-'+id+'.webp',cols:3,rows:3,kind:'body'})),...HEADS.map(id=>({key:'head:'+id,url:'./assets/doll/head-'+id+'.webp',cols:2,rows:2,kind:'head'}))];
const sheets=new Map(),dyed=new Map();let readyTask=null,refresh=()=>{};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function frameAt(action='idle',age=0,t=0){
 if(action==='attack'&&age>=0&&age<1.12){
  if(age<.18)return {a:0,b:3,mix:age/.18,head:2,state:'attack'};
  if(age<.4)return {a:3,b:4,mix:(age-.18)/.22,head:2,state:'attack'};
  if(age<.72)return {a:4,b:5,mix:(age-.4)/.32,head:2,state:'attack'};
  return {a:5,b:0,mix:(age-.72)/.4,head:0,state:'recover'};
 }
 if(action==='hit'&&age>=0&&age<.85){
  if(age<.13)return {a:6,b:7,mix:age/.13,head:3,state:'hit'};
  if(age<.4)return {a:7,b:8,mix:(age-.13)/.27,head:3,state:'hit'};
  return {a:8,b:0,mix:(age-.4)/.45,head:0,state:'recover'};
 }
 // Generated idle tiles differ in anatomy and cloth contours, so crossfading
 // them produced ghosting/static. Keep one stable painting and animate locally.
 return {a:0,b:0,mix:0,head:0,state:'idle'};
}
function warm(r,g,b){return r>90&&g>55&&r>g*1.04&&g>b*1.03&&(r-Math.min(g,b))/Math.max(r,1)<.57}
function bounds(data,w,h){let l=w,r=0,t=h,b=0;for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){if(data[(y*w+x)*4+3]>100){l=Math.min(l,x);r=Math.max(r,x+2);t=Math.min(t,y);b=Math.max(b,y+2)}}return t<h?{l:Math.max(0,l-2),r:Math.min(w,r+2),t:Math.max(0,t-2),b:Math.min(h,b+2)}:{l:0,r:w,t:0,b:h}}
function analyze(im,f){
 const c=document.createElement('canvas');c.width=Math.floor(im.width/f.cols);c.height=Math.floor(im.height/f.rows);const ctx=c.getContext('2d',{willReadFrequently:true}),w=c.width,h=c.height,frames=[];
 for(let i=0;i<f.cols*f.rows;i++){
  const sx=(i%f.cols)*w,sy=Math.floor(i/f.cols)*h;ctx.clearRect(0,0,w,h);ctx.drawImage(im,sx,sy,w,h,0,0,w,h);const bytes=ctx.getImageData(0,0,w,h).data,b=bounds(bytes,w,h);
  let nx=w*.5,ny=f.kind==='body'?h*.25:h*.88,faceX=w*.57,faceY=h*.12,headMask=null;
  if(f.kind==='head'){
   let last=-1,totalX=0,count=0;
   for(let y=Math.floor(h*.5);y<Math.min(h,b.b);y++)for(let x=Math.floor(w*.33);x<w*.72;x++){const n=(y*w+x)*4;if(bytes[n+3]>180&&warm(bytes[n],bytes[n+1],bytes[n+2])){if(y>last){last=y;totalX=0;count=0}if(y===last){totalX+=x;count++}}}
   if(last>h*.55){ny=last;nx=count?totalX/count:nx}
   let sxFace=0,syFace=0,nFace=0;for(let y=Math.floor(h*.32);y<h*.66;y++)for(let x=Math.floor(w*.33);x<w*.82;x++){const k=(y*w+x)*4;if(bytes[k+3]>180&&warm(bytes[k],bytes[k+1],bytes[k+2])){sxFace+=x;syFace+=y;nFace++}}if(nFace){faceX=sxFace/nFace;faceY=syFace/nFace}
  }
  // Locate face features on the original full-body underpaint. Bind the larger
  // independent head to the face in each pose; never crop arms at a neck line.
  if(f.kind==='body'){
   // Find the largest connected warm-skin region near the face. Gold costume trim
   // must not be mistaken for the neck; retain arms/shoulders above collar height.
   const x0=Math.floor(w*.25),x1=Math.floor(w*.8),y0=Math.floor(h*.02),y1=Math.floor(h*.18),seen=new Uint8Array(w*h);let best=[];
   const skin=(x,y)=>{const n=(y*w+x)*4,[hue,sat]=hsv(bytes[n],bytes[n+1],bytes[n+2]);return bytes[n+3]>180&&warm(bytes[n],bytes[n+1],bytes[n+2])&&hue<.105&&sat>.12};
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const start=y*w+x;if(seen[start])continue;seen[start]=1;if(!skin(x,y))continue;const queue=[start];
    for(let q=0;q<queue.length;q++){const pos=queue[q],xx=pos%w,yy=Math.floor(pos/w);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const tx=xx+dx,ty=yy+dy,k=ty*w+tx;if(tx<x0||tx>=x1||ty<y0||ty>=y1||seen[k])continue;seen[k]=1;if(skin(tx,ty))queue.push(k)}}
    if(queue.length>best.length&&Math.min(...queue.map(v=>Math.floor(v/w)))<h*.155)best=queue;
   }
   if(best.length>20){const bottom=Math.max(...best.map(v=>Math.floor(v/w))),band=best.filter(v=>Math.floor(v/w)>=bottom-2);ny=bottom+1;nx=band.reduce((sum,v)=>sum+v%w,0)/band.length;
    const top=Math.min(...best.map(v=>Math.floor(v/w))),faceBand=best.filter(v=>Math.floor(v/w)<=top+h*.08);faceX=faceBand.reduce((sum,v)=>sum+v%w,0)/faceBand.length;faceY=faceBand.reduce((sum,v)=>sum+Math.floor(v/w),0)/faceBand.length;headMask={l:Math.max(0,Math.min(...best.map(v=>v%w))-w*.085),r:Math.min(w,Math.max(...best.map(v=>v%w))+w*.05),bottom:bottom+h*.018};
   }else{ny=h*.19;nx=w*.52;}
  }
  frames.push({sx,sy,w,h,b,nx,ny,faceX,faceY,headMask});
 }
 return {im,frames,scale:350/Math.max(1,frames[0].b.b-frames[0].b.t),...f};
}
function ready(){if(readyTask)return readyTask;readyTask=Promise.all(files.map(f=>new Promise(resolve=>{const im=new Image();im.onload=()=>{try{sheets.set(f.key,analyze(im,f));resolve(true)}catch{resolve(false)}refresh()};im.onerror=()=>{resolve(false);refresh()};im.src=f.url}))).then(result=>result.every(Boolean));return readyTask}
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
function hsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h/=6;if(h<0)h++}return [h,max?d/max:0,max]}
function fromHSV(h,s,v){const i=Math.floor(h*6),f=h*6-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);return [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][((i%6)+6)%6].map(x=>Math.round(x*255))}
function tinted(sheet,p){
 const palette=palettes.includes(p.palette)?p.palette:'original',skin=/^#[a-f\d]{6}$/i.test(p.skin||'')?p.skin:'#ffe4d4',hair=/^#[a-f\d]{6}$/i.test(p.hair||'')?p.hair:'#84ebff';
 if(sheet.kind==='body'&&palette==='original'&&skin.toLowerCase()==='#ffe4d4')return sheet.im;
 const key=sheet.key+'|'+palette+'|'+skin+'|'+(p.outfit||'')+(sheet.kind==='head'?'|'+hair:'');if(dyed.has(key))return dyed.get(key);
 const c=document.createElement('canvas');c.width=sheet.im.width;c.height=sheet.im.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(sheet.im,0,0);const data=ctx.getImageData(0,0,c.width,c.height),a=data.data,targetSkin=rgb(skin),hairHSV=hsv(...rgb(hair));
 const baseHue={long:.58,twin:.94,wave:.58,short:.43}[sheet.key.split(':')[1]]??.58;
 for(let i=0;i<a.length;i+=4){if(a[i+3]<24)continue;let r=a[i],g=a[i+1],b=a[i+2];const [h,s,v]=hsv(r,g,b),isSkin=warm(r,g,b);
  if(isSkin){const light=(r+g+b)/(255+210+185);a[i]=clamp(targetSkin[0]*light,0,255);a[i+1]=clamp(targetSkin[1]*light,0,255);a[i+2]=clamp(targetSkin[2]*light,0,255)}
  else if(sheet.kind==='head'&&Math.min(Math.abs(h-baseHue),1-Math.abs(h-baseHue))<.17&&s>.08){const col=fromHSV(hairHSV[0],clamp(s*.6+hairHSV[1]*.35,.05,.9),v);a[i]=col[0];a[i+1]=col[1];a[i+2]=col[2]}
  else if(sheet.kind==='body'&&palette!=='original'&&s>.14){const custom=hsv(...rgb(/^#[a-f\d]{6}$/i.test(p.outfit||'')?p.outfit:'#84ebff')),target=palette==='custom'?custom[0]:{rose:.94,midnight:.64,emerald:.44}[palette],col=fromHSV(target,palette==='custom'?Math.max(.2,custom[1]):s,palette==='midnight'?v*.72:v);a[i]=col[0];a[i+1]=col[1];a[i+2]=col[2]}
 }
 ctx.putImageData(data,0,0);dyed.set(key,c);while(dyed.size>10){const old=dyed.keys().next().value;dyed.delete(old)}return c;
}
// Analytic damped springs use the game clock, so pause/replay and frame mixing
// cannot advance physics twice. Strength is independent of hair/cloth sway.
function chestMotion(p={},o={}){
 const strength=o.reduced||o.ko?0:clamp(Number.isFinite(p.bustMotion)?p.bustMotion:.7,0,1);
 if(!strength)return {x:0,y:0,breath:0};
 const support={armor:.65,idol:1,street:1,mage:.95,cyber:.85}[p.costume]??.3;
 const mass={small:.75,standard:1,large:1.14,full:1.25}[p.bust]||1;
 const t=Number.isFinite(o.t)?o.t:0,age=Number.isFinite(o.actionTime)?o.actionTime:-1;
 const spring=(start,amplitude)=>{const a=age-start;return a<0?0:amplitude*Math.sin(a*17/Math.sqrt(mass))*Math.exp(-a*(support<.5?7:4.8))};
 let impulse=0;
 if(o.action==='attack'&&age>=0)impulse=spring(.05,-2.6)+spring(.27,o.super?7:5);
 if(o.action==='hit'&&age>=0)impulse=spring(0,o.super?8:6);
 const gain=strength*support*mass;
 return {y:clamp((Math.sin(t*3.9-.7)*4.6+Math.sin(t*2.1)*1.1+impulse)*gain,-7,7),x:clamp(impulse*gain*.22,-1.5,1.5),breath:Math.sin(t*2.25)*.32*gain};
}
let blendLayer=null;
function drawBody(g,sheet,index,p,o,alpha){
 // Apply crossfade opacity once to the completed mesh, not to every overlapping
 // strip; otherwise strip edges become visible during attack/hit transitions.
 if(alpha<1){
  if(!blendLayer){blendLayer=document.createElement('canvas');blendLayer.width=720;blendLayer.height=640}
  const layer=blendLayer.getContext('2d');layer.clearRect(0,0,720,640);layer.save();layer.translate(360,600);drawBody(layer,sheet,index,p,o,1);layer.restore();
  g.save();g.globalAlpha*=alpha;g.drawImage(blendLayer,-360,-600);g.restore();return;
 }
 const f=sheet.frames[index],b=f.b,source=tinted(sheet,p),height=272,sc=sheet.scale,width={slender:.93,balanced:1,curvy:1.05,athletic:1.04,petite:.97,giant:1.04}[p.body]||1;
 const chest={small:.93,standard:1,large:1.04,full:1.07}[p.bust]||1,physics=o.reduced?0:clamp(Number.isFinite(p.motion)?p.motion:.7,0,1),t=o.t||0;
 if(window.NeonLiveRig?.paint(g,source,f,sc,p,o))return;
 const breathe=-Math.sin(t*2.1)*2.4*physics,secondary=chestMotion(p,o);
 g.save();g.globalAlpha*=alpha;
 for(let y=b.t;y<b.b;y+=5){const h=Math.min(5,b.b-y),u=(y-f.ny)/(b.b-f.ny),chestWeight=Math.exp(-Math.pow((u-.18)/.115,2)),hipWeight=Math.exp(-Math.pow((u-.45)/.14,2));
  const stretch=width*(1+(chest-1+((p.bustSize??.5)-.5)*.24)*chestWeight+((p.waist??1)-1)*Math.exp(-Math.pow((u-.35)/.12,2))+((p.hips??1)-1+(p.body==='curvy'?.035:0))*hipWeight),sway=Math.sin(t*1.25)*3.6*physics*(1-clamp(u,0,1));
  const yy=(y-b.b)*sc+breathe*(1-clamp(u*1.8,0,1)),xx=(b.l-f.w*.5)*sc*stretch+sway;
  // A local torso mesh leaves neck, shoulders, arms and hem anchored. Adjacent
  // strips share the same displacement function, including their bottom edge.
  const chestAt=py=>{const v=(py-f.ny)/(b.b-f.ny);return v<=0||v>=.36?0:Math.pow(Math.sin(Math.PI*v/.36),3)};
  const paint=(l,r)=>{if(r<=l)return;
   if(u<=0||u>=.36||(!secondary.x&&!secondary.y&&!secondary.breath)){g.drawImage(source,f.sx+l,f.sy+y,r-l,h,xx+(l-b.l)*sc*stretch,yy,(r-l)*sc*stretch,h*sc+.45);return}
   const step=(r-l)/8;
   for(let i=0;i<8;i++){
    const left=l+i*step,mid=left+step*.5,dx=(mid-f.nx)*sc;
    const local=Math.exp(-Math.pow(dx/29,4));
    const offset=py=>chestAt(py)*local*(secondary.y+secondary.breath*(dx<0?.9:1.1));
    const top=offset(y),bottom=offset(y+h);
    g.drawImage(source,f.sx+left,f.sy+y,step,h,xx+(left-b.l)*sc*stretch+secondary.x*chestAt(y)*local,yy+top,step*sc*stretch+.4,h*sc+bottom-top+.45);
   }
  };
  if(f.headMask&&y<f.headMask.bottom){paint(b.l,Math.min(b.r,f.headMask.l));paint(Math.max(b.l,f.headMask.r),b.r)}else paint(b.l,b.r);
 }
 g.restore();
}
function draw(g,x,footY,p,o={}){
 const costume=COSTUMES.includes(p.costume)?p.costume:'armor',head=HEADS.includes(p.style)?p.style:'long',body=sheets.get('body:'+costume),face=sheets.get('head:'+head);if(!body||!face){ready();return false}
 const state=o.ko?{a:8,b:8,mix:0,head:3,state:'ko'}:(window.NeonMotion?.state(o.action||'idleA',o.actionTime??0,o.t||0,p.animationStyle||'balanced',o.reduced)||frameAt(o.action,o.actionTime,o.t)),scale=(o.scale||1)*(p.body==='giant'?1.1:p.body==='petite'?.95:1)*(p.height??1),physics=o.reduced?0:clamp(Number.isFinite(p.motion)?p.motion:.7,0,1),t=o.t||0;
 g.save();g.translate(x,footY);g.scale((o.facing===-1?-1:1)*scale,scale);g.translate(state.shiftX||0,state.shiftY||0);g.rotate(state.angle||0);
 if(o.ko){g.rotate(-.8*o.ko);g.translate(-25*o.ko,35*o.ko)}
 if(o.hit>.1)g.filter='brightness(1.13)';
 g.save();g.scale(1,.17);g.beginPath();g.ellipse(0,12,55,14,0,0,Math.PI*2);g.fillStyle='#02071166';g.fill();g.restore();
 // Use opaque primary frames; short crossfades soften hand/cloth transitions.
 if(state.a===state.b){drawBody(g,body,state.a,p,o,1)}else if(state.mix<.5){drawBody(g,body,state.a,p,o,1);if(state.mix>.36)drawBody(g,body,state.b,p,o,(state.mix-.36)/.14)}else{drawBody(g,body,state.b,p,o,1);if(state.mix<.64)drawBody(g,body,state.a,p,o,(.64-state.mix)/.14)}
 const f=face.frames[state.head],b=f.b,hsc=79/Math.max(1,f.ny-b.t),source=tinted(face,p),headSway=Math.sin(t*1.55)*.014*physics;
 const ba=body.frames[state.anchorA??state.a],bb=body.frames[state.anchorB??state.b],mix=clamp(state.anchorMix??state.mix,0,1),facePX=((ba.faceX-ba.w*.5)*(1-mix)+(bb.faceX-bb.w*.5)*mix)*body.scale,facePY=((ba.faceY-ba.b.b)*(1-mix)+(bb.faceY-bb.b.b)*mix)*body.scale;
 const rig=window.NeonLiveRig?.pose(p,o)||{sway:0,breath:0,head:0,lookX:0,lookY:0};
 // Keep the entire painted head (including both eyes) rigid. Since the source
 // atlas has no isolated eyelid sprites, a blink cannot be synthesized by
 // stretching the face without destroying the eye shapes.
 g.save();
 g.translate(facePX+rig.sway+(rig.lookX||0)*3.2,facePY+rig.breath+(rig.lookY||0)*2.2);
 g.rotate(rig.head+headSway+(state.state==='hit'?-.06:state.state==='attack'?.035:0));
 g.drawImage(source,f.sx+b.l,f.sy+b.t,b.r-b.l,b.b-b.t,
   (b.l-f.faceX)*hsc*(p.headScale??1),
   (b.t-f.faceY)*hsc*(p.headScale??1),
   (b.r-b.l)*hsc*(p.headScale??1),
   (b.b-b.t)*hsc*(p.headScale??1));
 if(p.accessory&&p.accessory!=='none'){g.save();g.fillStyle=p.accessory==='star'?'#ffe7a2':'#b9faff';g.shadowColor=g.fillStyle;g.shadowBlur=6;g.scale(p.headScale??1,p.headScale??1);if(p.accessory==='halo'){g.strokeStyle=g.fillStyle;g.lineWidth=2;g.beginPath();g.ellipse(0,-60,35,8,-.1,0,Math.PI*2);g.stroke()}else{g.translate(-26,-24);g.beginPath();if(p.accessory==='crystal'){g.moveTo(0,-10);g.lineTo(6,0);g.lineTo(0,11);g.lineTo(-6,0)}else for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?3:8;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();g.fill()}g.restore()}g.restore();g.restore();return true;
}
function headIcon(g,style,w,h){const sheet=sheets.get('head:'+(HEADS.includes(style)?style:'long'));if(!sheet)return;const f=sheet.frames[0],b=f.b,sc=Math.min(w/(b.r-b.l),h/(b.b-b.t))*.94;g.drawImage(sheet.im,f.sx+b.l,f.sy+b.t,b.r-b.l,b.b-b.t,(w-(b.r-b.l)*sc)/2,(h-(b.b-b.t)*sc)/2,(b.r-b.l)*sc,(b.b-b.t)*sc)}
function status(){return {loaded:sheets.size,total:files.length,ready:sheets.size===files.length}}
window.NeonDoll=Object.freeze({COSTUMES,HEADS,palettes,frameAt,chestMotion,ready,draw,headIcon,status,onRefresh(fn){refresh=fn}});
})();
