'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
const asset=path.join(__dirname,'assets/desert-original-buildings-shots.webp');
test('real image raster atlas from the original PNGs is present, small, and shipped for mobile',()=>{
 const bytes=fs.readFileSync(asset);
 assert.equal(bytes.subarray(0,4).toString(),'RIFF');
 assert.equal(bytes.subarray(8,12).toString(),'WEBP');
 assert.ok(bytes.length>=5000&&bytes.length<40000,'mobile atlas must be packed, not a placeholder');
 assert.match(read('isometric-world.js'),/desert-original-buildings-shots\.webp/);
});
test('original 10-faction art is sampled at six building states plus four projectile frames',()=>{
 const painted=[];
 function context(){
  return new Proxy({drawImage(...args){painted.push(args);},createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(a,k)=>k in a?a[k]:()=>{}});
 }
 const canvas={getContext:context,width:0,height:0},window={};
 class ImageMock{
  set src(value){this.source=value;this.complete=true;this.naturalWidth=320;this.naturalHeight=320;this.onload?.();}
 }
 window.Image=ImageMock;
 const document={createElement:()=>({...canvas})};
 vm.runInNewContext(read('isometric-world.js'),{window,document,console,Math,Map,Set,Array,Number,String},{filename:'isometric-world.js'});
 const iso=window.IsoWorld;
 for(let f=0;f<10;f++)for(const kind of ['core','forward','turret'])for(const destroyed of [false,true]){
  const pic=iso.structureSprite(f,kind,destroyed);
  assert.ok(pic);
  const last=painted.at(-1),row=(kind==='core'?0:kind==='forward'?2:4)+(destroyed?1:0);
  assert.equal(last[1],f*32);assert.equal(last[2],row*32);
  assert.equal(last[3],32);assert.equal(last[4],32);
 }
 const g=context(),prior=painted.length;
 for(let f=0;f<10;f++)for(let frame=0;frame<4;frame++){
  assert.equal(iso.projectile(g,800,260,f,1,frame,0),true);
  const last=painted.at(-1);
  assert.equal(last[1],f*32);assert.equal(last[2],(6+frame)*32);
 }
 assert.equal(painted.length-prior,40,'every original projectile cell is used');
});
test('solo and multiplayer render real sprite projectiles without altering authoritative hit math',()=>{
 const solo=read('game-v2.js'),host=read('tri-lane-engine.js'),ui=read('tri-lane-ui.js');
 assert.match(solo,/IsoWorld\?\.projectile\?\.\(g,p\.x,p\.y,p\.faction,p\.source/);
 assert.match(host,/kind:'projectile',x:a\.x,y:a\.y,tx:v\.x,ty:v\.y/);
 assert.match(ui,/e\.kind==='projectile'/);
 assert.match(ui,/iso\?\.projectile\?\.\(ctx,px,py,e\.faction,e\.role/);
 assert.match(solo,/for\(const shot of state\.towerShots\)/);
 assert.match(solo,/IsoWorld\?\.projectile\?\.\(g,bx,by,faction,4/);
 assert.match(host,/role:4,faction,team,lane,time:\.38/);
});
