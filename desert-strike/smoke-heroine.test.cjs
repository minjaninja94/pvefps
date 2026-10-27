'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const folder=__dirname;
const files=['heroine-factions.js','isometric-world.js'];
const html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
const gallery=fs.readFileSync(path.join(folder,'sprite-gallery.html'),'utf8');
const game=fs.readFileSync(path.join(folder,'game-v2.js'),'utf8');
assert.ok(html.includes('heroine-factions.js'),'game loads two heroine species');
assert.ok(html.indexOf('heroine-factions.js')<html.indexOf('isometric-world.js'),'heroine art registered before iso render');
assert.ok(gallery.includes('heroine-factions.js'),'motion gallery loads heroine renderer');
assert.ok(gallery.includes('백랑 검사')&&gallery.includes('실바람 궁수'),'new species in gallery');
assert.ok(game.includes("id:'beastkin'")&&game.includes("id:'elf'"),'both 2.5D heroine races in game');
const stats={facets:0,pixels:0,draw:0},gradient={addColorStop(){}};
const g=new Proxy({
 createLinearGradient(){return gradient;},createRadialGradient(){return gradient;},
 fill(){stats.facets++;},
 fillRect(x,y,w,h){for(const n of [x,y,w,h])assert.ok(Number.isFinite(n));stats.pixels++;},
 drawImage(){stats.draw++;}
},{get(t,k){return k in t?t[k]:()=>{};},set(t,k,v){t[k]=v;return true;}});
const dom={createElement(tag){assert.equal(tag,'canvas');return {width:0,height:0,getContext(){return g;}}}};
const scope={document:dom,window:{},Math,Map,Set,Array,Object,Number};
for(const file of files)vm.runInNewContext(fs.readFileSync(path.join(folder,file),'utf8'),scope,{filename:file,timeout:15000});
const arts=scope.window.HeroineFactions,iso=scope.window.IsoWorld;
assert.equal(arts.SIZE,72);
assert.equal(iso.FRAMES,16);
for(let faction=4;faction<=5;faction++){
 for(let role=0;role<8;role++){
  for(const mode of ['idle','move','attack','siege','death']){
   const frames=[];
   for(let i=0;i<16;i++){
    const pic=iso.frame(faction,role,mode,i);
    assert.equal(pic.width,72);assert.equal(pic.height,72);frames.push(pic);
   }
   assert.equal(new Set(frames).size,16,'dedicated frames for '+faction+'/'+role+'/'+mode);
   assert.equal(iso.frame(faction,role,mode,7),frames[7],'cached animation frame');
  }
  assert.ok(iso.portrait(faction,role),'unit portrait');
 }
 iso.structure(g,100,250,faction,false,1);
 iso.structure(g,100,250,faction,true,.5);
 for(let role=0;role<8;role++)iso.factory(g,50+role*22,150,faction,role,true);
 iso.terrain(g,1100,340,true,faction);
}
assert.ok(stats.facets>9000,'heroine sprites and isometric castles use shaded polygons');
assert.ok(stats.pixels>8000,'heroine sprites use textured clothing and facial detail');
console.log('Heroine race art passed: 2 new factions, 16 distinct sprites, 1,280 animation frames, isometric structures and factory units.');
