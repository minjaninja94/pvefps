(()=>{'use strict';
const PREF='neon-clash-settings-v1',HISTORY='neon-clash-history-v1';
const clamp=(v,a,b,f)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):f;
function prefs(data={}){return {music:clamp(data.music,0,1,.65),sfx:clamp(data.sfx,0,1,.6),notes:clamp(data.notes,0,1,.3),offset:clamp(data.offset,-250,250,0),reduced:!!data.reduced,diff:['easy','normal','hard'].includes(data.diff)?data.diff:'normal',speed:[1,1.25,1.5,1.8].includes(data.speed)?data.speed:1.25,arena:['city','temple','reactor'].includes(data.arena)?data.arena:'city'}}
function load(){try{return prefs(JSON.parse(localStorage.getItem(PREF)||'{}'))}catch{return prefs()}}
function save(data){const p=prefs(data);localStorage.setItem(PREF,JSON.stringify(p));return p}
function history(){try{const x=JSON.parse(localStorage.getItem(HISTORY)||'[]');return Array.isArray(x)?x.filter(v=>Number.isFinite(v.score)&&typeof v.title==='string'&&Number.isFinite(v.accuracy)).slice(0,100):[]}catch{return []}}
function result(data){const x={title:String(data.title).slice(0,80),key:String(data.key).slice(0,120),diff:data.diff,mode:data.mode,score:Math.max(0,Math.round(data.score)),accuracy:clamp(data.accuracy,0,100,0),combo:Math.max(0,Math.round(data.combo)),outcome:['win','lose','draw'].includes(data.outcome)?data.outcome:'draw',created:Date.now()};localStorage.setItem(HISTORY,JSON.stringify([x,...history()].slice(0,100)));return x}
window.NeonProfileStore=Object.freeze({prefs,load,save,history,result});
})();
