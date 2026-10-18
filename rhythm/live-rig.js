/* Runtime mesh rig for the project's painted atlases. This is not Cubism Core. */
(()=>{'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));let engine=null,failed=false;
function pose(p={},o={}){
 const t=Number.isFinite(o.t)?o.t:0,m=o.reduced||o.ko?0:clamp(p.motion??.7,0,1),strength=o.reduced||o.ko?0:clamp(p.bustMotion??.7,0,1),mass={small:.8,standard:1,large:1.15,full:1.3}[p.bust]||1;
 const support={armor:.65,idol:1,street:1,mage:.95,cyber:.85}[p.costume]||1,age=Number.isFinite(o.actionTime)?o.actionTime:-1;
 let impulse=0;if(age>=0&&(o.action==='attack'||o.action==='hit')){const a=age-(o.action==='attack'?.2:0);if(a>=0)impulse=Math.sin(a*16/Math.sqrt(mass))*Math.exp(-a*4.5)*(o.action==='hit'?7:5)}
 const gain=strength*support*mass;
 const presence=o.presence||window.NeonPresence?.idle(t,o.seed||0,o.reduced)||{};
 const lookX=clamp(Number(presence.lookX)||0,-1.1,1.1),lookY=clamp(Number(presence.lookY)||0,-1.1,1.1);
 const blink=o.reduced||o.ko?0:clamp(Number(presence.blink)||0,0,1);
 const lag=lookX*(1-Math.exp(-Math.max(0,t)*.5))*.6;
 return {sway:Math.sin(t*1.25)*3.6*m+lookX*1.3*m,
  breath:-Math.sin(t*2.1)*2.4*m,head:Math.sin(t*1.15-.3)*.026*m+(Number(presence.tilt)||0),
  hair:Math.sin(t*1.55-.5)*3.2*m-lag*2.2*m,
  lookX,lookY,blink,smile:clamp(Number(presence.smile)||0,-1,1),
  left:(Math.sin(t*3.9-.7)*6.2+Math.sin(t*2.1)*1.1+impulse)*gain,
  right:(Math.sin(t*3.9-.95)*6.2+Math.sin(t*2.1)*1.1+impulse)*gain};

}
function init(){
 if(engine||failed)return engine;
 try{
  const canvas=document.createElement('canvas');canvas.width=660;canvas.height=620;const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL unavailable');
  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 a;attribute vec2 uv;varying vec2 v;void main(){v=uv;gl_Position=vec4(a.x/330.0-1.0,1.0-a.y/310.0,0.,1.);}'));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 v;uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,v);}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Mesh shader failed');gl.useProgram(program);
  const cols=24,rows=40,uv=[],indices=[];for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)uv.push(x/cols,y/rows);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1)}
  const buffer=(loc,data,dynamic)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);return b};
  const vertices=new Float32Array(uv.length),position=buffer(gl.getAttribLocation(program,'a'),vertices,true);buffer(gl.getAttribLocation(program,'uv'),new Float32Array(uv),false);const index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.viewport(0,0,660,620);
  engine={canvas,gl,cols,rows,vertices,position,count:indices.length,textures:[],sources:new WeakMap()};return engine;
 }catch(e){failed=true;return null}
}
function paint(g,source,f,sc,p,o={},head=false){
 const e=init();if(!e||e.gl.isContextLost())return false;const {gl}=e,rig=pose(p,o);
 let list=e.sources.get(source);if(!list){list=new Map();e.sources.set(source,list)}const key=f.sx+':'+f.sy+':'+head;let entry=list.get(key);
 if(!entry){const c=document.createElement('canvas');c.width=f.w;c.height=f.h;const ctx=c.getContext('2d');ctx.drawImage(source,f.sx,f.sy,f.w,f.h,0,0,f.w,f.h);if(!head&&f.headMask)ctx.clearRect(f.headMask.l,0,f.headMask.r-f.headMask.l,f.headMask.bottom);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);entry={texture,list,key};list.set(key,entry);e.textures.push(entry);while(e.textures.length>24){const old=e.textures.shift();old.list.delete(old.key);gl.deleteTexture(old.texture)}}
 const bodyWidth={slender:.93,balanced:1,curvy:1.05,athletic:1.04,petite:.97,giant:1.04}[p.body]||1,bust={small:.9,standard:1,large:1.08,full:1.16}[p.bust]||1,shape=(p.bustSize??.5)-.5;
 let i=0;for(let y=0;y<=e.rows;y++)for(let x=0;x<=e.cols;x++){
  const px=x/e.cols*f.w,py=y/e.rows*f.h;let dx,dy;
  if(head){
   dx=(px-f.faceX)*sc;dy=(py-f.faceY)*sc;
   const tail=clamp((dy+5)/65,0,1),edge=clamp((Math.abs(dx)-18)/25,0,1);
   // Parallax face movement: features follow the pointer, outer hair reacts later.
   const faceWeight=Math.exp(-Math.pow(dx/64,4))*Math.exp(-Math.pow((dy+4)/88,4));
   dx+=rig.lookX*(3.1*faceWeight+1.2)+rig.hair*tail*edge;
   dy+=rig.lookY*2.6*faceWeight+rig.hair*edge*tail*.25;
   // Eye-band deformation compresses the painted eye details during a blink.
   // Continuous Gaussian weighting avoids visible rectangular texture seams.
   const eyeCenter=-16,eyeRegion=Math.exp(-Math.pow((dy-eyeCenter)/12,4))*Math.exp(-Math.pow(dx/67,4));
   dy+=(eyeCenter-dy)*rig.blink*.76*eyeRegion;
   const mouthRegion=Math.exp(-Math.pow((dy-23)/9,4))*Math.exp(-Math.pow(dx/38,4));
   dy-=rig.smile*1.2*mouthRegion;
   dx*=p.headScale??1;dy*=p.headScale??1;
  }
  else{const u=(py-f.ny)/(f.b.b-f.ny),upper=1-clamp(u,0,1),chest=u>0&&u<.38?Math.pow(Math.sin(Math.PI*u/.38),2):0,waist=Math.exp(-Math.pow((u-.35)/.12,2)),hips=Math.exp(-Math.pow((u-.52)/.14,2));
   dx=(px-f.w*.5)*sc*bodyWidth*(1+(bust-1+shape*.24)*chest+((p.waist??1)-1)*waist+((p.hips??1)-1)*hips);dy=(py-f.b.b)*sc;
   const relative=(px-f.nx)*sc,local=Math.exp(-Math.pow(relative/44,4));dy+=rig.breath*upper+chest*local*(relative<0?rig.left:rig.right);dx+=rig.sway*upper+chest*local*(rig.left+rig.right)*.08+rig.lookX*upper*1.2;
  }
  e.vertices[i++]=330+dx;e.vertices[i++]=(head?300:570)+dy;
 }
 gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.bindBuffer(gl.ARRAY_BUFFER,e.position);gl.bufferSubData(gl.ARRAY_BUFFER,0,e.vertices);gl.bindTexture(gl.TEXTURE_2D,entry.texture);gl.drawElements(gl.TRIANGLES,e.count,gl.UNSIGNED_SHORT,0);g.drawImage(e.canvas,-330,head?-300:-570);return true;
}
window.NeonLiveRig=Object.freeze({pose,paint,status:()=>({ready:!!engine,failed})});
})();
