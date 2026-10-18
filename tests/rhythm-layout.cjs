// Run from repo root: node tests/rhythm-layout.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.join(__dirname,'..','rhythm');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const source=fs.readFileSync(path.join(dir,'power-notes.js'),'utf8');
const order=['id="pHPBar"','id="youtubeOverlay"','id="bHPBar"','class="gameboard"'].map(token=>html.indexOf(token));
assert.ok(order.every((n,i)=>n>=0&&(!i||n>order[i-1])),'HP · TV · HP must be one row above the stage');
assert.equal((html.match(/id="youtubeOverlay"/g)||[]).length,1,'Single YouTube TV');
assert.match(html,/#game \.gameboard\.hasTV\{--stage-top:0px\}/,'feedback overlay stays on canvas');
assert.match(html,/#game \.fightHUD\.hasTV \.arenaTVRow\{display:flex\}/,'TV belongs to top fighter HUD');
assert.match(html,/171\.428dvh - 514\.284px/,'Stage width adapts to viewport height');
assert.match(game,/classList\.toggle\('hasTV',sourceMode==='youtube'\)/);
assert.match(game,/powerPulse,options\.reduced,onlineMode,LANE_LAYOUT/);
const state={window:{}};
vm.runInNewContext(source,state,{filename:'power-notes.js'});
const points=[],labels=[];
const canvas=new Proxy({
 beginPath(){},arc(x,y,r){points.push({x,y,r})},fillText(text,x,y){labels.push({text,x,y})},
 save(){},restore(){},fill(){},stroke(){}
},{get(target,key){return key in target?target[key]:()=>{}},set(target,key,v){target[key]=v;return true}});
const notes=[
 {id:0,side:'player',kind:'power',done:false,t:10},
 {id:1,side:'bot',kind:'power',done:false,t:10.1}
];
const layout={player:{x:74,step:68},bot:{x:922,step:68},top:150,bottom:608};
state.window.NeonPowerNotes.draw(canvas,notes,9,9,null,false,true,layout);
assert.deepEqual([...new Set(points.map(p=>p.x))],[176,1024],'Prompts in each four-note lane center');
assert.equal(labels.find(x=>x.text==='SPACE').x,176);
assert.equal(labels.find(x=>x.text==='2P · POWER').x,1024);
assert.ok(!points.some(p=>p.x===600),'No center-screen power prompt');
points.length=0;labels.length=0;
state.window.NeonPowerNotes.draw(canvas,[{id:0,side:'player',kind:'power',done:false,t:10}],9,9,null,false,false,layout);
assert.deepEqual([...new Set(points.map(p=>p.x))],[176],'Solo player power prompt stays on 1P lane');
console.log('Rhythm compact layout: HP-TV-HP, aligned feedback canvas, per-side SPACE prompts PASS');
