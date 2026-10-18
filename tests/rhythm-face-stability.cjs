// Run: node tests/rhythm-face-stability.cjs
// Prevent regression: never squash or stretch the painted eyes to simulate blinking.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.join(__dirname,'../rhythm');
const rigSource=fs.readFileSync(path.join(dir,'live-rig.js'),'utf8');
const dollSource=fs.readFileSync(path.join(dir,'doll-renderer.js'),'utf8');
const presenceSource=fs.readFileSync(path.join(dir,'live-presence.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
assert.doesNotMatch(rigSource,/eyeRegion|mouthRegion|eyeCenter-dy/);
assert.doesNotMatch(dollSource,/paint\(g,source,f,hsc,p,o,true\)/);
assert.match(dollSource,/g\.drawImage\(source,f\.sx\+b\.l,f\.sy\+b\.t/);
assert.match(html,/live-rig\.js\?v=stable-eyes-1/);
assert.match(html,/doll-renderer\.js\?v=stable-eyes-1/);
const buffers=[];
const webgl=new Proxy({
 isContextLost(){return false},
 getShaderParameter(){return true},
 getProgramParameter(){return true},
 getAttribLocation(){return 0},
 bufferSubData(target,offset,buffer){buffers.push(Array.from(buffer))}
},{get(obj,key){
 if(key in obj)return obj[key];
 if(typeof key==='string'&&key===key.toUpperCase())return 1;
 return ()=>({});
}});
const canvas2d={drawImage(){},clearRect(){}};
const document={createElement(){return{width:0,height:0,getContext(kind){return kind==='webgl'?webgl:canvas2d}}}};
const context={window:{},document};
vm.runInNewContext(rigSource,context,{filename:'live-rig.js'});
vm.runInNewContext(presenceSource,context,{filename:'live-presence.js'});
const painter=context.window.NeonLiveRig;
const frame={sx:0,sy:0,w:256,h:256,faceX:128,faceY:140,nx:128,ny:120,b:{t:0,l:0,r:256,b:256}};
const profile={body:'balanced',bust:'standard',headScale:1,motion:.7};
const ctx={drawImage(){}},image={};
const none={lookX:0,lookY:0,tilt:0,blink:0,smile:0};
const expressive={lookX:1,lookY:-1,tilt:.15,blink:1,smile:1};
assert.equal(painter.paint(ctx,image,frame,.8,profile,{t:3,presence:none},true),true);
assert.equal(painter.paint(ctx,image,frame,.8,profile,{t:3,presence:expressive},true),true);
assert.equal(buffers[0].length,buffers[1].length);
assert.deepEqual(buffers[0],buffers[1],'A rigid head must preserve ALL facial vertices across blink and gaze');
assert.equal(painter.paint(ctx,image,frame,.8,profile,{t:2},false),true);
assert.equal(painter.paint(ctx,image,frame,.8,profile,{t:3},false),true);
assert.ok(buffers[2].some((v,i)=>v!==buffers[3][i]),'Body and clothes still animate');
const portrait=context.window.NeonPresence.create(.4);
portrait.tap(1);
let nod=portrait.tick(1.2);
assert.ok(nod.tilt>.02,'Click should cause non-distorting head nod');
console.log('Face stability PASS: all facial vertices rigid, body animated, click nod intact');
