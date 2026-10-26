'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'game-v2.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'style-v2.css'),'utf8');
for(const id of ['view-base','view-battle','view-special','baseCanvas','battleCanvas','factionCards','startButton','nukeButton','barrageButton','counterMatrix'])assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
assert.match(css,/@media\(max-width:620px\)/);
const ids=new Map(),queue=[],allTabs=['base','battle','special'].map(view=>({dataset:{view},classList:{toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(type,fn){this[type]=fn;}}));
const screens=['base','battle','special'].map(view=>({id:'view-'+view,classList:{toggle(){}},addEventListener(){}}));
const fakeCtx=new Proxy({
 createLinearGradient(){return {addColorStop(){}};},
 createRadialGradient(){return {addColorStop(){}};}
},{get(t,p){return p in t?t[p]:()=>{};},set(t,p,v){t[p]=v;return true;}});
function el(id){
 if(ids.has(id))return ids.get(id);
 const classes=new Set();
 const item={id,style:{},dataset:{},textContent:'',innerHTML:'',disabled:false,hidden:false,
  open:false,handlers:{},
  classList:{add(v){classes.add(v);},remove(v){classes.delete(v);},toggle(v,on){if(on===undefined)on=!classes.has(v);if(on)classes.add(v);else classes.delete(v);return on;},contains(v){return classes.has(v);}},
  addEventListener(t,fn){this.handlers[t]=fn;},
  getContext(){return fakeCtx;},
  getBoundingClientRect(){return {left:0,top:0,width:1100,height:520};},
  querySelectorAll(q){if(q==='[data-faction]')return facItems;return [];},
  querySelector(){return null;},
  setAttribute(){},removeAttribute(){},
  showModal(){item.open=true;},close(){item.open=false;}
 };
 ids.set(id,item);return item;
}
const facItems=[0,1,2].map(i=>{const classes=new Set(i===0?['selected']:[]);return {
 dataset:{faction:String(i)},classList:{
 toggle(key,on){if(on)classes.add(key);else classes.delete(key);},
 contains(key){return classes.has(key);}
 }
};});
const doc={
 getElementById:el,createElement(){return {width:0,height:0,getContext(){return fakeCtx;}};},
 querySelector(q){if(q==='[data-faction].selected')return facItems.find(x=>x.classList.contains('selected'));return null;},
 querySelectorAll(q){return q==='.screen'?screens:q==='.tab'||q==='[data-view]'?allTabs:[];},
 addEventListener(type,fn){doc[type]=fn;}
};
const sandbox={document:doc,window:{addEventListener(){}},requestAnimationFrame(fn){queue.push(fn);},console,Math,Number,String,Object,Array,Map,Set,Date};
vm.runInNewContext(code,sandbox,{timeout:3500,filename:'game-v2.js'});
assert.equal(el('cash').textContent,'600');
assert.match(el('unitCards').innerHTML,/취약:/);
assert.match(el('counterMatrix').innerHTML,/강점:/);
function click(id,data,key='click'){
 const fn=el(id).handlers[key];assert.equal(typeof fn,'function','Missing event '+id+':'+key);
 fn({target:{closest:()=>data?{dataset:data}:null},clientX:520,clientY:260,preventDefault(){}});
}
let time=0;
function steps(n){
 for(let i=0;i<n;i++){const f=queue.shift();assert.equal(typeof f,'function');time+=40;f(time);}
}
click('factionCards',{faction:'1'});
click('startButton');
assert.equal(el('factionLabel').textContent,'심연군체');
assert.equal(el('startOverlay').classList.contains('hidden'),true);
click('unitCards',{role:'0'});
click('buildGrid',{cell:'0'});
assert.equal(el('cash').textContent,'535','construction spends resources');
assert.match(el('builtCount').textContent,/1 \/ 15/);
steps(510);
assert.equal(el('wave').textContent,'01','wave 1 should trigger');
assert.match(el('friendlyCount').textContent,/\d+/);
click('pauseButton');
const stopped=el('timer').textContent;
steps(50);
assert.equal(el('timer').textContent,stopped,'paused time stays unchanged');
click('pauseButton');
click('speedButton');
assert.equal(el('speedButton').textContent,'▶ 2×');
click('econButton');
assert.match(el('econInfo').textContent,/레벨 1/,'economy upgrade works');
click('demolishButton');
click('buildGrid',{cell:'0'});
assert.match(el('builtCount').textContent,/0 \/ 15/,'building demolition works');
click('restartButton');
assert.equal(el('cash').textContent,'600','reset restores cash');
assert.equal(el('wave').textContent,'00','reset restores wave');
assert.equal(el('startOverlay').classList.contains('hidden'),false,'reset requires faction selection');
console.log('V2 smoke passed: 3 views, three factions, 24 variant names, counter table, construction, waves, pause, speed, economy, demolition and reset.');
