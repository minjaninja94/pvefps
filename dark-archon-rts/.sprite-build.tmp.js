(function(){
const data=[
["zergling","beast","zerg",2],["dragoon","walker","protoss",5],["firebat","troop","terran",3],["vulture","bike","terran",4],["siegetank","tank","terran",5],["wraith","fighter","terran",4],["valkyrie","fighter","terran",5],["battlecruiser","ship","terran",7],["darktemplar","troop","protoss",3],["reaver","tank","protoss",5],["scout","fighter","protoss",4],["corsair","fighter","protoss",4],["carrier","ship","protoss",7],["lurker","beast","zerg",5],["mutalisk","bat","zerg",4],["guardian","bat","zerg",5],["devourer","bat","zerg",6],["scourge","bat","zerg",2]
],pals={zerg:[[83,48,76],[136,85,106],[176,226,99],[41,38,54]],terran:[[53,62,75],[126,145,160],[235,170,96],[31,34,46]],protoss:[[90,72,70],[207,166,88],[80,220,255],[35,42,64]]};
const hex=x=>[(x>>>24)&255,(x>>>16)&255,(x>>>8)&255,x&255];
function crc(a){let c=-1;for(let i=0;i<a.length;i++){c^=a[i];for(let k=0;k<8;k++)c=c&1?(c>>>1)^0xedb88320:c>>>1}return(c^-1)>>>0}
function chunk(name,data){let t=[...name].map(c=>c.charCodeAt(0)),b=t.concat(Array.from(data));return hex(data.length).concat(b,hex(crc(b)))}
function png(b,w,h){
 let raw=new Uint8Array(h*(w*4+1));for(let y=0;y<h;y++)raw.set(b.subarray(y*w*4,(y+1)*w*4),y*(w*4+1)+1);
 let a=1,z=0;for(let i=0;i<raw.length;i++){a=(a+raw[i])%65521;z=(z+a)%65521}
 let body=[0x78,0x01];for(let o=0;o<raw.length;){let n=Math.min(65535,raw.length-o),end=o+n===raw.length;body.push(end?1:0,n&255,n>>>8,(~n)&255,((~n)>>>8)&255);for(let i=0;i<n;i++)body.push(raw[o+i]);o+=n}
 body.push(...hex(((z<<16)|a)>>>0));
 return Uint8Array.from([137,80,78,71,13,10,26,10,...chunk("IHDR",[...hex(w),...hex(h),8,6,0,0,0]),...chunk("IDAT",body),...chunk("IEND",[])]);
}
function b64(bytes){const a="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",out=[];for(let i=0;i<bytes.length;i+=3){let x=(bytes[i]<<16)|((bytes[i+1]||0)<<8)|(bytes[i+2]||0);out.push(a[x>>>18&63],a[x>>>12&63],i+1<bytes.length?a[x>>>6&63]:"=",i+2<bytes.length?a[x&63]:"=")}return out.join("")}
function render(name){
 const sp=data.find(x=>x[0]===name);if(!sp)throw Error("missing "+name);
 const [key,shape,race,scale]=sp,w=256,h=256,b=new Uint8Array(w*h*4),pal=pals[race],radius=Math.min(5,Math.max(2,scale*.55));
 for(let dir=0;dir<16;dir++)for(let frame=0;frame<16;frame++){
 const ox=frame*16,oy=dir*16,angle=dir*Math.PI/8,co=Math.cos(angle),si=Math.sin(angle),v=frame>=4&&frame<10?Math.sin((frame-4)*Math.PI/3):0;
 const alpha=frame>=13?(frame===13?185:frame===14?115:50):255;
 function pt(x,y,c){const px=Math.round(7.5+x*co-y*si),py=Math.round(7.5+x*si+y*co);if(px<0||px>=16||py<0||py>=16)return;const i=((oy+py)*w+ox+px)*4;b[i]=c[0];b[i+1]=c[1];b[i+2]=c[2];b[i+3]=alpha}
 function el(x,y,rx,ry,c){for(let yy=-Math.floor(ry);yy<=ry;yy++)for(let xx=-Math.floor(rx);xx<=rx;xx++)if(xx*xx/(rx*rx+.01)+yy*yy/(ry*ry+.01)<=1)pt(x+xx,y+yy,c)}
 function ln(x,y,X,Y,c){let n=Math.max(1,Math.ceil(Math.hypot(X-x,Y-y)*2));for(let i=0;i<=n;i++)pt(x+(X-x)*i/n,y+(Y-y)*i/n,c)}
 const [outline,body,accent,dark]=pal;
 if(shape==="beast"){
  for(let k of [-1,1])for(let m of [-1,1]){ln(k,2*m,k*(4+v),m*5,outline);pt(k*5,m*5,accent)}
  el(0,0,radius+1,radius+1,dark);el(0,0,radius,radius+1,body);ln(0,-1,0,-6,accent);
  if(key==="zergling"||key==="lurker")for(let k of [-1,1])ln(k*2,-1,k*6,-5,accent);
 }else if(shape==="walker"){
  for(let k of [-1,1])for(let m of [-1,1])ln(k*2,m*2,k*6,m*4+v,outline);
  el(0,0,radius+1,radius,outline);el(0,0,radius,radius,body);el(0,0,2,2,accent);ln(0,-2,0,-6,accent);
 }else if(shape==="troop"){
  for(let k of [-1,1]){ln(k,2,k*2,5+v,outline);ln(k*2,0,k*4,-3,body)}
  el(0,0,3,4,outline);el(0,0,2,3,body);el(0,-2,1,2,accent);
  if(key==="darktemplar")ln(2,-2,5,-6,accent);
 }else if(shape==="bike"||shape==="tank"){
  for(let k of [-1,1]){ln(k*4,-5,k*4,5,outline);ln(k*5,-5,k*5,5,body)}
  el(0,0,shape==="tank"?4:2,5,body);el(0,-1,2,2,outline);ln(0,-1,0,-7,accent);
 }else{
  for(let k of [-1,1]){ln(0,-4,k*(shape==="ship"?6:7),shape==="bat"?0:2,outline);ln(k*6,1,k*3,5,body)}
  el(0,0,shape==="ship"?4:2,shape==="ship"?6:5,outline);el(0,-1,shape==="ship"?3:2,3,body);ln(0,-4,0,-7,accent);
  if(shape==="bat")for(let k of [-1,1])ln(k*5,1,k*7,4,accent);
 }
 if(frame>=10&&frame<=12){el(0,-6,2,2,accent);pt(1,-7,[255,242,188])}
 pt(0,-1,accent);
 }
 return b64(png(b,w,h));
}
return {names:data.map(x=>x[0]),render};
})()