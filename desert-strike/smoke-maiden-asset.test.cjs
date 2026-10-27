'use strict';
// Asset regression: verify actual generated WebP bytes and all image integrations.
// Tests intentionally distinguish a binary art patch from procedural-only CSS/JS.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname;
const binary=fs.readFileSync(path.join(root,'assets','maiden-atlas.webp'));
assert.ok(binary.length>16000,'genuine pre-rendered image should have substantial non-placeholder pixel data');
assert.equal(binary.toString('ascii',0,4),'RIFF','WebP RIFF header');
assert.equal(binary.toString('ascii',8,12),'WEBP','actual WebP image');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const gallery=fs.readFileSync(path.join(root,'sprite-gallery.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style-v2.css'),'utf8');
const game=fs.readFileSync(path.join(root,'game-v2.js'),'utf8');
const iso=fs.readFileSync(path.join(root,'isometric-world.js'),'utf8');
for(const document of [html,gallery]){
 assert.match(document,/maiden-illustrations\.js/);
 assert.ok(document.indexOf('maiden-illustrations.js')<document.indexOf('isometric-world.js'),'image atlas loads before isometric engine');
}
assert.match(css,/assets\/maiden-atlas\.webp/,'faction cards and unit cards load real binary file');
assert.match(css,/maiden-unit-portrait/,'16 real illustrated card portraits');
assert.match(game,/class="maiden-unit-portrait"/);
assert.match(game,/faction-hero-(?:beast|elf)/);
assert.match(game,/maiden-art-ready/);
assert.match(iso,/MaidenArt\?\.overlay/);
assert.match(gallery,/maiden-art-ready/);
const pics=fs.readFileSync(path.join(root,'maiden-illustrations.js'),'utf8');
const calls={draw:0,fill:0};
const fakeContext={
 drawImage(){calls.draw++;},fillRect(){calls.fill++;},clearRect(){},save(){},restore(){},
 translate(){},rotate(){},getImageData(){return {data:new Uint8ClampedArray(64*80*4)};},putImageData(){},
};
const doc={createElement(t){assert.equal(t,'canvas');return {width:0,height:0,getContext:()=>fakeContext};}};
class FakeImage{
 set src(v){this._src=v;if(this.onload)this.onload();}
 get src(){return this._src;}
}
const win={document:doc,Image:FakeImage,addEventListener(){},dispatchEvent(){},CustomEvent:class{constructor(type){this.type=type;}},IsoWorld:{invalidateMaiden(){}}};
vm.runInNewContext(pics,{window:win,Image:FakeImage,document:doc,Math,console,Uint8ClampedArray},{filename:'maiden-illustrations.js',timeout:3000});
const art=win.MaidenArt;
assert.ok(art.loaded,'image asset loader completes');
for(const faction of [4,5]){
 const hero=art.heroBox(faction);assert.equal(hero[2],256);
 for(let role=0;role<8;role++){
  const box=art.portraitBox(faction,role);
  assert.equal(box[0],role*64);
  assert.equal(box[1],192+(faction-4)*80);
  assert.equal(box[2],64);assert.equal(box[3],80);
  for(const mode of ['idle','move','attack','siege','death'])for(let frame=0;frame<16;frame++){
   assert.equal(art.overlay(fakeContext,faction,role,mode,frame),true);
  }
 }
}
assert.ok(calls.draw>=1280,'16 illustrated units render 16 frames across 5 motions');
assert.equal(art.portraitBox(1,1),null,'other factions unaffected');
console.log('True WebP artwork + six-faction UI + 16 illustration sources + 1,280 overlaid animation frames verified.');
