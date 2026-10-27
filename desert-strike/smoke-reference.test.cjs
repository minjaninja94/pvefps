'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const calls=[];
const document={createElement(tag){
 assert.equal(tag,'canvas');
 return {width:0,height:0,getContext(){
  return {imageSmoothingEnabled:false,save(){},restore(){},clearRect(){},fillRect(){},drawImage(im,...args){
   if(args.length===8){const [sx,sy,sw,sh]=args;assert.ok(sx>=0&&sy>=0&&sx+sw<=im.naturalWidth&&sy+sh<=im.naturalHeight,'source cell must stay within its image');}
   assert.ok(args.every(Number.isFinite),'finite image rectangle');calls.push([im.src,...args]);
  }};
 }};
}};

class Image{set src(value){this._src=value;const special=value.includes('special-actions'),uniform=value.includes('/uniform-');this.naturalWidth=special||uniform?768:384;this.naturalHeight=special?576:uniform?96:384;this.complete=true;queueMicrotask(()=>this.onload?.());}get src(){return this._src;}}
const w={dispatchEvent(){},IsoWorld:{invalidateSpriteFaction(){}}},ctx={window:w,document,Image,Map,Set,Object,Math,Number,Event:class{}};
for(const f of ['sprite-atlas.js','special-unit-art.js','commander-covers.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx);
(async()=>{await new Promise(queueMicrotask);assert.equal(w.DesertRealSprites.loadedCount(),1,'only selected default faction should eagerly load');w.DesertRealSprites.preload();await new Promise(queueMicrotask);assert.equal(w.DesertRealSprites.loadedCount(),10);
for(let f=0;f<10;f++){const name=w.DesertRealSprites.names[f];for(const suffix of ['portrait','banner']){const file=fs.readFileSync(path.join(__dirname,'assets/sprites',name+'-'+suffix+'.webp'));assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.toString('ascii',8,12),'WEBP');}
 for(let r=0;r<8;r++){const file=fs.readFileSync(path.join(__dirname,'assets/sprites','uniform-'+name+'-'+r+'.webp'));assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.toString('ascii',8,12),'WEBP');assert.equal(file.toString('ascii',12,16),'VP8L');const dimensions=file.readUInt32LE(21);assert.equal((dimensions&0x3fff)+1,768);assert.equal(((dimensions>>>14)&0x3fff)+1,96,'each unit has exactly one isolated row');} for(let r=0;r<8;r++)for(const action of ['idle','move','attack','skill','death'])for(let n=0;n<16;n++){const cv=w.DesertRealSprites.frame(f,r,action,n);assert.equal(cv.width,72);assert.equal(cv.height,72);}}
assert.equal(w.DesertRealSprites.frame(-1,0,'idle',0),null);
assert.equal(w.DesertRealSprites.frame(0,-1,'idle',0),null);
const coverCanvas=document.createElement('canvas');coverCanvas.width=320;coverCanvas.height=210;
for(let f=0;f<10;f++){const before=calls.length;w.DesertCommanderCovers.draw(coverCanvas,f,'default');assert.equal(calls.length-before,1,'headquarters and faction cover draw only one image');assert.ok(calls.at(-1)[0].includes('-portrait.webp'),'use a single portrait rather than a multi-character banner');}
assert.ok(!calls.some(c=>c[0].match(/\/(forge|brood|astral|marine|beastkin|elf|furry|robot|octoper|fairy)-actions/)),'legacy source-board action atlases are never requested');
for(const [f,r,row] of [[3,6,0],[4,6,1],[6,6,2],[7,6,3],[3,7,4]]){for(const action of ['idle','move','attack','skill','death'])for(let n=0;n<16;n++){const cv=w.DesertSpecialArt.frame(f,r,action,n);assert.equal(cv.width,72);}assert.ok(calls.some(c=>c[0].includes('uniform-'+w.DesertRealSprites.names[f]+'-'+r+'.webp')&&c[2]===0),'dedicated unit strip must render');}
assert.equal(w.DesertSpecialArt.frame(0,6,'idle',0),null,'ordinary aircraft stay on faction artwork');
const index=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');assert.ok(!index.includes('mpUnitType'),'recruitment must not use a unit dropdown');assert.ok(index.includes('mpUnitCards'));
console.log('Reference sprite regression passed: 80 independent WebP unit strips, 10 factions, all action cells in bounds, five dedicated special units and image recruitment markup.');})();
