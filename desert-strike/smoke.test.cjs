'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const js = fs.readFileSync(path.join(__dirname,'game.js'),'utf8');
const html = fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const css = fs.readFileSync(path.join(__dirname,'style.css'),'utf8');
assert.match(html,/id="battle"/);
assert.match(html,/game\.js/);
assert.match(css,/@media\(max-width:560px\)/);
const dummies = new Map();
const ctx = new Proxy({
 createLinearGradient(){return {addColorStop(){}};},
 createRadialGradient(){return {addColorStop(){}};}
},{
 get(target,prop){return prop in target?target[prop]:()=>{};},
 set(target,prop,value){target[prop]=value;return true;}
});
function dummy(id){
 if(dummies.has(id))return dummies.get(id);
 const listeners={};
 const names=new Set();
 const item={
  id,style:{},dataset:{},listeners,innerHTML:'',textContent:'',disabled:false,open:false,
  width:1100,height:560,
  classList:{
   add(v){names.add(v);},
   remove(v){names.delete(v);},
   toggle(v,b){if(b===undefined)b=!names.has(v);if(b)names.add(v);else names.delete(v);return b;},
   contains(v){return names.has(v);}
  },
  setAttribute(){},
  addEventListener(type,fn){listeners[type]=fn;},
  getContext(){return ctx;},
  showModal(){item.open=true;},
  close(){item.open=false;}
 };
 dummies.set(id,item);return item;
}
const document={
 getElementById:dummy,
 addEventListener(){},
};
const callbacks=[];
const sandbox={
 document,
 window:{devicePixelRatio:1,addEventListener(){}, AudioContext:undefined},
 requestAnimationFrame(fn){callbacks.push(fn);},
 console,Math,Array,Object,Number,Date,Map,Set,String,
};
vm.runInNewContext(js,sandbox,{filename:'game.js',timeout:4000});
assert.equal(dummy('gold').textContent,'600');
function click(id,targetDataset){
 const listener=dummy(id).listeners.click;
 assert.equal(typeof listener,'function','Missing click handler: '+id);
 listener({target:{closest:()=>targetDataset?{dataset:targetDataset}:null},preventDefault(){}});
}
let now=0;
function frames(n,ms=38){
 for(let i=0;i<n;i++){
  const f=callbacks.shift();assert.equal(typeof f,'function','Frame request not scheduled');
  now+=ms;f(now);
 }
}
click('startBtn');
assert.equal(dummy('battleOverlay').classList.contains('hidden'),true);
click('unitCards',{unit:'rifle'});
click('buildGrid',{cell:'0'});
assert.equal(dummy('gold').textContent,'500','building should spend credits');
assert.match(dummy('slots').textContent,/1 \/ 15/);
frames(450);
assert.equal(dummy('wave').textContent,'01','first deployment must fire');
assert.match(dummy('battleCount').textContent,/아군 [1-9]/);
click('pauseBtn');
const waveBefore=dummy('wave').textContent;
frames(500);
assert.equal(dummy('wave').textContent,waveBefore,'paused simulation must not advance');
click('pauseBtn');
click('speedBtn');
frames(450);
assert.ok(Number(dummy('wave').textContent)>=2,'simulation must resume and accelerate');
click('demolishBtn');
click('buildGrid',{cell:'0'});
assert.match(dummy('slots').textContent,/0 \/ 15/,'demolition should remove building');
click('resetBtn');
assert.equal(dummy('wave').textContent,'00','restart must reset wave');
assert.equal(dummy('gold').textContent,'600','restart must reset economy');
console.log('Desert Front smoke checks passed: startup, construction, spawn, pause, speed, demolition, restart.');