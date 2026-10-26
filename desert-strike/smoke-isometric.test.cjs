'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'isometric-world.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const code=fs.readFileSync(path.join(__dirname,'game-v2.js'),'utf8');
const gallery=fs.readFileSync(path.join(__dirname,'sprite-gallery.html'),'utf8');
assert.ok(html.includes('isometric-world.js'),'game must load iso renderer');
assert.ok(html.indexOf('isometric-world.js')<html.indexOf('game-v2.js'),'iso module must load before game');
assert.ok(gallery.includes('isometric-world.js'),'motion gallery must use same art');
assert.ok(code.includes('window.IsoWorld?.frame'),'battle must display new 2.5D sprites');
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
console.log('Isometric visual smoke passed: 4 factions × 8 roles × 5 animations × 16 frames (2,560), projected combat, 3D buildings and terrain.');
