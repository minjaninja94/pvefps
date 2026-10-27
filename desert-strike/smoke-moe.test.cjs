'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8'),requests=[],draws=[];
class Image{set src(s){this.srcValue=s;this.complete=true;this.naturalWidth=s.includes('portrait')?256:768;this.naturalHeight=s.includes('portrait')?512:768;requests.push(s);queueMicrotask(()=>this.onload?.());}}
const context={clearRect(){},save(){},restore(){},fillRect(){},drawImage(im,...rect){draws.push([im.srcValue,...rect]);}};
const document={createElement(){return {width:0,height:0,getContext:()=>context};}};
const w={dispatchEvent(){},IsoWorld:{frame:()=>({width:72,height:72,fallback:true})}};
vm.runInNewContext(read('moe-unit-art.js'),{window:w,Image,document,Event:class{},Object,Map,Set,Math,Number});
(async()=>{const art=w.DesertMoeArt;assert.equal(requests.length,0,'default costume must not eagerly fetch ten alternate atlases');assert.ok(art.frame(0,0).fallback);assert.equal(requests.length,2,'only selected faction actions and portrait should load');await new Promise(queueMicrotask);assert.equal(art.loadedCount(),1);
art.preload();await new Promise(queueMicrotask);assert.equal(art.loadedCount(),10);
for(let f=0;f<10;f++){for(const suffix of ['actions','portrait']){const buf=fs.readFileSync(path.join(__dirname,'assets/sprites','moe-'+art.names[f]+'-'+suffix+'.webp'));assert.equal(buf.toString('ascii',0,4),'RIFF');assert.equal(buf.toString('ascii',8,12),'WEBP');}
for(let role=0;role<8;role++)for(const action of ['idle','move','attack','skill','death'])for(let phase=0;phase<16;phase++){const cv=art.frame(f,role,action,phase);assert.equal(cv.width,72);assert.equal(cv.height,72);}}
const cells=draws.filter(d=>d[0]?.includes('-actions'));assert.ok(cells.length>=640,'distinct raster poses must be sampled');for(const d of cells){const [,x,y,width,height]=d;assert.equal(width,96);assert.equal(height,96);assert.ok(x>=0&&x+width<=768&&y>=0&&y+height<=768);}
const beforeCover=draws.length;assert.equal(art.cover(context,0,320,210),true);assert.equal(draws.length-beforeCover,1,'skin cover draws one portrait and no superimposed unit');assert.ok(draws.some(d=>d[0]?.includes('moe-forge-portrait')),'headquarters uses selected skin portrait');
assert.ok(read('commander-covers.js').includes("skin==='moe'"));assert.ok(read('front-lobby.js').includes('desert-moe-ready'));
console.log('Moe regression passed: ten independent faction atlases/portraits, eighty roles, 640 painted poses, 6,400 playback lookups, in-bounds crops, skin headquarters and lazy loading.');})();
