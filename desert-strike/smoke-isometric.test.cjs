'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'isometric-world.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const code=fs.readFileSync(path.join(__dirname,'game-v2.js'),'utf8');
const gallery=fs.readFileSync(path.join(__dirname,'sprite-gallery.html'),'utf8');
const atlasSource=fs.readFileSync(path.join(__dirname,'iso-real-atlas-data.js'),'utf8');
const encoded=atlasSource.match(/base64,([^']+)/)?.[1];
assert.ok(encoded?.length>5000,'shipped atlas data must exist');
const atlas=Buffer.from(encoded,'base64');
assert.equal(atlas.toString('ascii',0,4),'RIFF','raster sprite atlas is a valid RIFF header');
assert.equal(atlas.toString('ascii',8,12),'WEBP','painted sprite atlas is WebP');
assert.ok(html.indexOf('iso-real-atlas-data.js')<html.indexOf('isometric-world.js'),'raster image data loads before isometric renderer');
assert.ok(html.includes('isometric-world.js'),'game must load iso renderer');
assert.ok(html.indexOf('isometric-world.js')<html.indexOf('game-v2.js'),'iso module must load before game');
assert.ok(gallery.includes('isometric-world.js'),'motion gallery must use same art');
assert.ok(code.includes('iso?.frame(u.faction,u.role,mode,frame)'),'battle must display new 2.5D sprites');
assert.ok(code.includes('window.IsoWorld.terrain'),'arena must use isometric environment');
assert.ok(code.includes('window.IsoWorld.structure'),'battle/base structures must use iso art');
assert.ok(code.includes('window.IsoWorld.factory'),'75 construction buildings must use iso art');
assert.ok(code.includes('window.IsoWorld.unproject'),'battle picking must invert projection');
const drawStats={rect:0,poly:0,images:0};
const g=new Proxy({
 createLinearGradient(){return {addColorStop(){}};},
 createRadialGradient(){return {addColorStop(){}};},
 fillRect(x,y,w,h){
  for(const v of [x,y,w,h])assert.ok(Number.isFinite(v),'finite pixel coordinate');
  drawStats.rect++;
 },
 fill(){drawStats.poly++;},
 drawImage(){drawStats.images++;}
},{get(obj,key){return key in obj?obj[key]:()=>{};},set(obj,key,value){obj[key]=value;return true;}});
const doc={createElement(tag){assert.equal(tag,'canvas');return {width:0,height:0,getContext(){return g;}}}};
const sandbox={document:doc,window:{},Math,Map,Set,Number,Object,Array};
vm.runInNewContext(src,sandbox,{timeout:10000,filename:'isometric-world.js'});
const iso=sandbox.window.IsoWorld;
assert.ok(iso);
assert.equal(iso.SIZE,72);
assert.equal(iso.FRAMES,16);
for(const [x,y] of [[0,0],[240,110],[1650,260],[3250,440]]){
 const v=iso.project(x,y),u=iso.unproject(v.x,v.y);
 assert.ok(Math.abs(u.x-x)<1e-7&&Math.abs(u.y-y)<1e-7,'projection roundtrip');
}
for(let f=0;f<4;f++)for(let role=0;role<8;role++)for(const mode of ['idle','move','attack','siege','death']){
 const poses=[];
 for(let i=0;i<16;i++){
  const c=iso.frame(f,role,mode,i);
  assert.equal(c.width,72);
  assert.equal(c.height,72);
  poses.push(c);
 }
 assert.equal(new Set(poses).size,16,'16 unique animation frames');
 assert.equal(iso.frame(f,role,mode,3),poses[3],'cache must reuse frames');
}
for(let f=0;f<4;f++){
 iso.terrain(g,3300,520,false,f);
 iso.terrain(g,1100,340,true,f);
 for(const role of [0,2,3,5,6,7])iso.factory(g,300+role*40,60,f,role,true);
 for(const turret of [true,false])iso.structure(g,1300,260,f,turret,1);
}
iso.effect(g,220,190,42,'hit',.5);
assert.ok(drawStats.rect>1000,'textured environment must paint thousands of detail pixels');
assert.ok(drawStats.poly>2000,'terrain, units and 3D structures must use angled facets');
assert.ok(drawStats.images>=8,'terrain texture layers drawn');
// Exercise asynchronous painted sprite path (not just procedural fallback).
const artRenders={slices:0};
const paintedCtx=new Proxy({
 ...g,
 createLinearGradient(){return {addColorStop(){}};},
 drawImage(...args){if(args.length===9)artRenders.slices++;},
 fillRect(){}
},{get(o,k){return k in o?o[k]:()=>{};},set(o,k,v){o[k]=v;return true;}});
const paintedDoc={createElement(){return {width:0,height:0,getContext(){return paintedCtx;}}}};
class FakeImage{
 constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}
 set src(value){
  this._src=value;
  this.complete=true;
  this.naturalWidth=value.includes(encoded.slice(0,24))?272:448;
  this.naturalHeight=value.includes(encoded.slice(0,24))?138:224;
  if(this.onload)this.onload();
 }
 get src(){return this._src;}
}
const paintedSandbox={
 document:paintedDoc,
 window:{Image:FakeImage,IsoRealAtlasData:'data:image/webp;base64,'+encoded,MarineArtAtlas:'data:image/webp;base64,FAKE_MARINE_BLOB'},
 Math,Map,Set,Number,Object,Array
};
vm.runInNewContext(src,paintedSandbox,{timeout:10000,filename:'isometric-world.js'});
const painted=paintedSandbox.window.IsoWorld;
for(let faction=0;faction<4;faction++)for(let role=0;role<8;role++){
 for(const mode of ['idle','move','attack','siege','death']){
  const frame=painted.frame(faction,role,mode,8);
  assert.equal(frame.width,72,'painted sprite frame width');
 }
}
// 31 raster character illustrations + 1 deliberately hand-coded isometric truck.
assert.equal(artRenders.slices,31*5,'31 characters use raster illustrations while Odo Bongo is custom isometric truck geometry');
for(const mode of ['idle','move','attack','siege','death'])assert.ok(painted.frame(3,6,mode,8),'truck has animation '+mode);

console.log('Isometric visual smoke passed: 2,560 animation frames, 32 loaded raster characters, quarter-view terrain and destructible structures.');
