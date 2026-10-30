'use strict';
// Buildings use faction-specific original art as cached raster sprites in both engines.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
function canvasContext(){
 const methods={};
 let rendered=0;
 methods.drawImage=(...args)=>{rendered++;methods.lastImage=args;};
 methods.createLinearGradient=()=>({addColorStop(){}});
 methods.createRadialGradient=()=>({addColorStop(){}});
 const proxy=new Proxy(methods,{get:(obj,key)=>key in obj?obj[key]:()=>{}});
 return {ctx:proxy,drawCount:()=>rendered};
}
test('every faction has different cached core, turret and forward tower raster sprites with ruined variants',()=>{
 const creations=[],document={createElement(name){
  assert.equal(name,'canvas');
  const art=canvasContext(),canvas={width:0,height:0,getContext:()=>art.ctx};
  creations.push(canvas);return canvas;
 }};
 const window={};vm.runInNewContext(read('isometric-world.js'),{window,document,Math,Map,Set,Array,Object,Number,String},{filename:'isometric-world.js'});
 const iso=window.IsoWorld;assert.equal(typeof iso.structureSprite,'function');
 const unique=new Set();
 for(let faction=0;faction<10;faction++){
  for(const kind of ['core','turret','forward']){
   const good=iso.structureSprite(faction,kind,false),ruined=iso.structureSprite(faction,kind,true);
   assert.ok(good&&ruined,'missing '+faction+' '+kind);
   assert.notStrictEqual(good,ruined,'destruction gets a different sprite');
   assert.strictEqual(good,iso.structureSprite(faction,kind,false),'cache must reuse one sprite per state');
   assert.equal(good.width,240);assert.equal(good.height,220);
   assert.equal(good.getContext(),good.getContext());
   unique.add(good);unique.add(ruined);
  }
 }
 assert.equal(unique.size,60,'10 factions × 3 buildings × live/ruined');
 assert.equal(creations.length,60,'no duplicate canvas allocation for cached structures');
 const scene=canvasContext(),outpost=iso.structureSprite(5,'forward',false);
 iso.structure(scene.ctx,825,260,5,true,1,'forward');
 assert.equal(scene.drawCount(),1);
 assert.strictEqual(scene.ctx.lastImage[0],outpost,'battle draws the existing Silverwood tower sprite');
 iso.structure(scene.ctx,825,260,5,true,0,'forward');
 assert.strictEqual(scene.ctx.lastImage[0],iso.structureSprite(5,'forward',true),'destroyed outpost uses ruined sprite');
 assert.equal(iso.structureSprite(-1,'forward'),null,'bad faction cannot become wrong sprite');
});
test('single base, single battle and multiplayer battle all use one faction-aware structure sprite API',()=>{
 const solo=read('game-v2.js'),multi=read('tri-lane-ui.js'),html=read('index.html'),iso=read('isometric-world.js');
 assert.match(solo,/structureSprite\?\.\(state\.faction,'forward',state\.forwardHP\[0\]<=0\)/,'single build view shows the outpost miniature');
 assert.match(solo,/structure\(g,x,260,side,true,state\.forwardHP\[side\],'forward'\)/,'single battlefield renders specialized tower');
 assert.match(multi,/fort\(x,t,true,hp,1000,'forward'\)/,'multiplayer and practice use the same special sprite');
 assert.match(iso,/structureCache\.set\(key,canvas\)/,'render once, reuse the bitmap');
 assert.match(html,/isometric-world\.js\?v=buildings-20261030/,'browser receives current building art');
 assert.match(html,/game-v2\.js\?v=buildings-20261030/);
 assert.match(html,/tri-lane-ui\.js\?v=buildings-20261030/);
});