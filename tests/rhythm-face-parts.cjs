// node tests/rhythm-face-parts.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'../rhythm');
const source=fs.readFileSync(path.join(root,'face-parts.js'),'utf8');
const renderer=fs.readFileSync(path.join(root,'doll-renderer.js'),'utf8');
const studio=fs.readFileSync(path.join(root,'studio.js'),'utf8');
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
const page=fs.readFileSync(path.join(root,'index.html'),'utf8');
const drawn=[],canvases=[];
const fakeContext=new Proxy({
 drawImage(...args){drawn.push({kind:'draw',args})},
 createRadialGradient(){return{addColorStop(){}}},
 fillRect(){},save(){},restore(){},beginPath(){},moveTo(){},
 bezierCurveTo(){},stroke(){}
},{get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true}});
const document={createElement(name){assert.equal(name,'canvas');const result={width:0,height:0,getContext(){return fakeContext}};canvases.push(result);return result}};
const context={window:{},document};
vm.runInNewContext(source,context,{filename:'face-parts.js'});
const api=context.window.NeonFaceParts;
const face={w:256,h:256,faceX:176,faceY:105};
const sheet={frames:Array.from({length:4},(_,i)=>({...face,sx:(i%2)*256,sy:Math.floor(i/2)*256}))};
const head={};const opts={source:head,sheet,style:'twin',frame:sheet.frames[0],scale:1,profile:{headScale:1,expression:'talk',hair:'#ff779c'},rig:{blink:1,hair:3},time:2};
api.draw(fakeContext,opts);
assert.equal(canvases.length,6,'Six independent painted eye/mouth sub-sprites expected');
assert.ok(drawn.filter(d=>d.args[0]===head).length===6,'Feature sources must come from real painted atlas tiles');
assert.ok(drawn.some(d=>canvases.includes(d.args[0])),'Composite eyelids/mouth separately from the original head art');
const calls=drawn.length;
api.draw(fakeContext,{...opts,rig:{blink:0,hair:0}});
assert.equal(canvases.length,6,'Reuse cached feature sprites; avoid per-frame canvas allocation');
assert.ok(drawn.length>calls,'Feature painting must still work with opened eyes');
const without=drawn.length;
api.draw(fakeContext,{...opts,profile:{...opts.profile,faceParts:false}});
assert.ok(drawn.length>without,'Feature API remains callable; main doll controls disabling');
api.settings({eyes:false,mouth:false,hair:false});
const disable=drawn.length;
api.draw(fakeContext,opts);
assert.equal(drawn.length,disable,'Every independent facial layer must be optional');
api.settings({eyes:true,mouth:true,hair:true});
assert.match(renderer,/window\.NeonFaceParts\?\.draw/,'Painted head renderer must use stable feature layer');
assert.doesNotMatch(renderer,/paint\(g,source,f,hsc,p,o,true\)/,'Do not use eye-distorting mesh');
for(const side of ['P','B']){
 for(const name of ['expression','faceParts','blinkMode','hairAccent'])assert.ok(page.includes('id="'+name+side+'"'),side+'/'+name+' UI exists');
}
assert.match(studio,/p\.faceParts=data\.faceParts!==false/);
assert.match(game,/faceParts:\$\('faceParts'\+side\)\.value!=='off'/);
assert.match(game,/hairAccent:\$\('hairAccent'\+side\)\.value!=='off'/);
assert.ok(page.indexOf('face-parts.js')<page.indexOf('doll-renderer.js'),'Face layers must load before their renderer');
console.log('Face parts PASS: painted atlas masks, separate blink/lip sprites, cached layers, eye stability, player customization');
