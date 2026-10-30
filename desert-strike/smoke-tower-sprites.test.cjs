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
 assert.match(html,/isometric-world\.js\?v=desktop-original-png-20261030/,'browser receives current building art');
 assert.match(html,/game-v2\.js\?v=[^" ]+/,'browser loads a versioned solo game script');
 assert.match(html,/tri-lane-ui\.js\?v=stealth-counter-live2/);
});

test('battle tower HP HUD paints current / maximum for both engines and respects enemy fog',()=>{
 const solo=read('game-v2.js'),multi=read('tri-lane-ui.js'),host=read('tri-lane-engine.js');
 const soloStart=solo.indexOf('function drawStructureHealth('),soloEnd=solo.indexOf('\nfunction enemyBaseVisible(){',soloStart);
 const multiStart=multi.indexOf(' function drawStructureHealth('),multiEnd=multi.indexOf('\n ctx.clearRect(0,0,W,H);',multiStart);
 assert.ok(soloStart>=0&&soloEnd>soloStart,'solo battle health painter is present');
 assert.ok(multiStart>=0&&multiEnd>multiStart,'multiplayer battle health painter is present');
 const soloCode=solo.slice(soloStart,soloEnd),multiCode=multi.slice(multiStart,multiEnd);
 const labels=[],rects=[],g={save(){},restore(){},strokeRect(){},fillText(s){labels.push(s);},fillRect(x,y,w,h){rects.push([x,y,w,h]);}};
 // The helper is evaluated in isolation with a projected tower center and team colors.
 const isolatedSolo=vm.runInNewContext(soloCode+'\ndrawStructureHealth',{window:{IsoWorld:{project:(x,y)=>({x,y})}},COLORS:['cyan','orange'],Math});
 const isolatedMulti=vm.runInNewContext('(function(ctx){const pos=(x,y)=>({x,y});'+multiCode+';return drawStructureHealth;})',{Math});
 for(const kind of ['forward','turret','core']){
  const max=kind==='forward'?1000:kind==='turret'?1250:8640;
  for(const team of [0,1]){
   labels.length=0;rects.length=0;isolatedSolo(g,team===0?825:2475,team,kind,max/2,max);
   assert.ok(labels.includes(Math.ceil(max/2)+' / '+max),'solo '+kind+' '+team+' numeric health');
   assert.ok(rects.some(v=>v[2]===50&&v[3]===6),'solo '+kind+' proportional bar');
   labels.length=0;rects.length=0;isolatedMulti(g)(team===0?825:2475,team,kind,max/2,max);
   assert.ok(labels.includes(Math.ceil(max/2)+' / '+max),'multi '+kind+' '+team+' numeric health');
   assert.ok(rects.some(v=>v[2]===50&&v[3]===6),'multi '+kind+' proportional bar');
  }
 }
 labels.length=0;rects.length=0;isolatedSolo(g,825,0,'forward',0,1000);
 assert.ok(labels.includes('0 / 1000')&&labels.includes('중간 타워 파괴'));
 labels.length=0;rects.length=0;isolatedMulti(g)(825,0,'forward',0,1000);
 assert.ok(labels.includes('0 / 1000')&&labels.includes('중간 타워 파괴'));
 assert.match(solo,/drawStructureHealth\(g,forwardX,side,'forward',state\.forwardHP\[side\],1000\)/);
 assert.match(solo,/if\(side===1&&!enemyBaseVisible\(\)\)continue/);
 assert.match(multi,/hiddenTower\(team,forwardX\)/);
 assert.match(multi,/snap\.forwardHP\?\.\[lane\]\?\.\[team\]/);
 assert.match(host,/forwardHP:state\.forwardHP/,'server sends current per-lane tower HP');
});
