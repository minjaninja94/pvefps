'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'sprite-animations.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const gallery=fs.readFileSync(path.join(__dirname,'sprite-gallery.html'),'utf8');
assert.match(html,/sprite-animations\.js/);
assert.ok(html.indexOf('sprite-animations.js')<html.indexOf('game-v2.js'),'sprite runtime must load before game');
assert.match(html,/sprite-gallery\.html/);
assert.match(gallery,/sprite-animations\.js/);
let paintCalls=0,canvases=0;
const context=new Proxy({fillRect(x,y,w,h){paintCalls++;assert.ok(Number.isFinite(x+y+w+h));},drawImage(){paintCalls++;},createLinearGradient(){return {addColorStop(){}};}},{
 get(o,p){return p in o?o[p]:()=>{};},
 set(o,p,v){o[p]=v;return true;}
});
const document={
 createElement(tag){assert.equal(tag,'canvas');canvases++;return {
   width:0,height:0,getContext(type){assert.equal(type,'2d');return context;}
 };}
};
const sandbox={document,window:{},Math,Object,Array,Map,Set,Number,console};
vm.runInNewContext(source,sandbox,{filename:'sprite-animations.js',timeout:4000});
const S=sandbox.window.DesertSprites;
assert.ok(S,'runtime globally published');
assert.equal(S.FRAMES,16);
assert.equal(S.MODES.length,5);
assert.equal(S.SIZE,48);
assert.equal(new Set(S.MODES).size,5);
for(let f=0;f<4;f++)for(let role=0;role<8;role++)for(const mode of S.MODES){
 const frames=[];
 for(let i=0;i<16;i++){
  const canvas=S.frame(f,role,mode,i);
  assert.equal(canvas.width,48);assert.equal(canvas.height,48);
  frames.push(canvas);
 }
 assert.equal(new Set(frames).size,16,'distinct animation frame canvases: '+f+'/'+role+'/'+mode);
 assert.equal(S.frame(f,role,mode,3),frames[3],'cache must return same image');
}
assert.equal(S.cacheSize,4*8*5*16);
for(const mode of S.MODES){
 const poses=Array.from({length:16},(_,i)=>S.pose(mode,i,0));
 assert.equal(poses.length,16);
 assert.ok(new Set(poses.map(v=>JSON.stringify(v))).size===16);
}
const sheet=S.renderSheet(2,6,'siege');
assert.equal(sheet.width,768);assert.equal(sheet.height,48);
S.structureImpact(context,100,100,3,'ruin',.75);
assert.ok(paintCalls>15000,'all procedural frames should render actual pixel geometry');
const artCode=fs.readFileSync(path.join(__dirname,'marine-art-data.js'),'utf8');
assert.ok(html.indexOf('marine-art-data.js')<html.indexOf('sprite-animations.js'),'generated artwork must preload');
const marineHost={};
vm.runInNewContext(artCode,{window:marineHost},{timeout:4000});
assert.ok(marineHost.MarineArtAtlas.startsWith('data:image/webp;base64,'));
const atlasBytes=Buffer.from(marineHost.MarineArtAtlas.split(',')[1],'base64');
assert.equal(atlasBytes.toString('ascii',0,4),'RIFF');
assert.equal(atlasBytes.toString('ascii',8,12),'WEBP');
assert.ok(atlasBytes.length>20000,'full 2.5D source atlas should be available');
let atlasDraws=0;
const artCtx=new Proxy({createLinearGradient(){return {addColorStop(){}};},drawImage(){atlasDraws++;}},{
 get(t,p){return p in t?t[p]:()=>{};},set(t,p,v){t[p]=v;return true;}
});
marineHost.Image=class{
 set src(value){assert.ok(value.startsWith('data:image/webp;base64,'));this.complete=true;this.naturalWidth=448;if(this.onload)this.onload();}
};
const artDoc={createElement(){return {width:0,height:0,getContext(){return artCtx;}};}};
vm.runInNewContext(source,{document:artDoc,window:marineHost,Math,Object,Array,Map,Set,Number,console},{timeout:4000});
const artFrame=marineHost.DesertSprites.frame(3,3,'attack',8);
assert.equal(artFrame.width,48);
assert.ok(atlasDraws>=1,'Marine Fortress must render from generated image atlas');
console.log('16-frame animation atlas smoke passed: 32 unit silhouettes, 5 actions, 2,560 cached sprites, impact FX and gallery.');
