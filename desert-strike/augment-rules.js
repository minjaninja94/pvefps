/* Shared native-Godot augment catalogue, applied by the existing host-authoritative JS engine. */
(function(global){
'use strict';
const TIERS=['silver','gold','prismatic'],STAGES=[1,10,20,30,40];
const WEIGHTS=[[75,23,2],[55,38,7],[35,50,15],[20,55,25],[10,50,40]];
let cards=[],byId=new Map(),loading,baseReady=false;
function load(){
 if(!loading)loading=fetch('./assets/audio/../augments.json').then(r=>{if(!r.ok)throw Error('증강 카드 파일을 불러올 수 없습니다.');return r.json();}).then(data=>{
  if(data.schema!==1||!Array.isArray(data.cards)||data.cards.length!==300)throw Error('증강 카드 300종 검증 실패');
  baseReady=true;cards=data.cards.concat(global.DesertPrism?.enabled?.()?global.DesertPrism.cards:[]);byId=new Map(cards.map(x=>[x.id,x]));return data;
 }).catch(e=>{loading=null;throw e;});
 return loading;
}
function ready(){return baseReady&&cards.length===(global.DesertPrism?.enabled?.()?400:300);}
function rng(seed){
 let state=(seed>>>0)||1;
 return function(){state^=(state<<13);state^=state>>>17;state^=(state<<5);return (state>>>0)/4294967296;};
}
function create(seed=1){
 const roll=rng(seed),schedule=WEIGHTS.map(w=>{const n=roll()*100;return TIERS[n<w[0]?0:n<w[0]+w[1]?1:2]});
 function draw(tier,scope,blocked){const pool=cards.filter(c=>c.tier===tier&&c.scope===scope&&!blocked.has(c.id));if(!pool.length)return '';const id=pool[Math.floor(roll()*pool.length)].id;blocked.add(id);return id;}
 function offer(tier,faction,chosen=[]){const blocked=new Set(chosen);return [draw(tier,'faction-'+faction,blocked),draw(tier,'common',blocked),draw(tier,'common',blocked)];}
 function reroll(tier,chosen,offered,slot){const prev=byId.get(offered[slot]);if(!prev)return '';return draw(tier,prev.scope,new Set([...chosen,...offered]));}
 function pick(){return Math.floor(roll()*3);}
 return {schedule,offer,reroll,pick};
}
function apply(base,selected=[],role){
 if(!selected?.length)return base;
 const d={...base};
 for(const id of selected){const card=byId.get(id);if(!card)continue;
  for(const e of card.effects||[]){
   if(e.kind!=='stat'||(e.roles?.length&&!e.roles.includes(role)))continue;
   const key=e.stat,value=Number(e.value)||0;if(!Number.isFinite(value))continue;
   if(key==='regen'){d.regen=Math.min(.005,(d.regen||0)+value);continue;}
   if(!Number.isFinite(d[key]))continue;
   if(key==='armor')d[key]=Math.min(50,d[key]+value);
   else if(key==='rate')d[key]=Math.max(.25,d[key]*(1+value));
   else d[key]=Math.max(0,d[key]*(1+value));
  }
 }
 return d;
}
function extra(selected=[],role){
 let count=0;
 for(const id of selected){const c=byId.get(id);if(!c)continue;
  for(const e of c.effects||[])if(e.kind==='extra_spawn'&&e.roles?.includes(role))count+=Number(e.value)||0;
 }
 return Math.max(0,Math.min(3,count));
}
const api=Object.freeze({load,ready,create,apply,extra,card:id=>byId.get(id)||null,
 list:()=>cards.map(c=>({id:c.id,name:c.name,description:c.description,tier:c.tier,scope:c.scope,experimental:!!c.experimental})),STAGES,TIERS});
global.DesertAugments=api;
if(typeof document!=='undefined')void load().catch(()=>{});
})(typeof window==='undefined'?globalThis:window);
