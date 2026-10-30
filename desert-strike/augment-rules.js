/* Shared native-Godot augment catalogue, applied by the existing host-authoritative JS engine. */
(function(global){
'use strict';
const TIERS=['silver','gold','prismatic'],STAGES=[1,10,20,30,40,50,60,70];
const WEIGHTS=[[45,40,15],[35,40,25],[26,42,32],[22,38,40],[18,35,47],[14,32,54],[10,27,63],[8,22,70]];
// Eight baseline boosts for the two live specialist classes (silver/gold).
const specialistCards=Object.freeze([
 {id:'special-sniper-range',name:'장거리 조준선',description:'저격병의 사거리가 12% 증가합니다.',tier:'silver',scope:'common',effects:[{kind:'stat',roles:[9],stat:'range',value:.12}]},
 {id:'special-sniper-armor',name:'안정화 사격 자세',description:'저격병의 체력이 15% 증가하여 첫 돌격을 버팁니다.',tier:'silver',scope:'common',effects:[{kind:'stat',roles:[9],stat:'hp',value:.15}]},
 {id:'special-assassin-speed',name:'어둠 속 질주',description:'암살자의 이동속도가 18% 증가합니다.',tier:'silver',scope:'common',effects:[{kind:'stat',roles:[10],stat:'speed',value:.18}]},
 {id:'special-assassin-hp',name:'초경량 잠행복',description:'암살자의 체력이 18% 증가합니다. 탐지되지 않은 상태는 그대로 유지됩니다.',tier:'silver',scope:'common',effects:[{kind:'stat',roles:[10],stat:'hp',value:.18}]},
 {id:'special-sniper-damage',name:'대물탄 정밀 개조',description:'저격병의 공격력이 26% 증가합니다. 장갑 관통 및 조준 시간은 변하지 않습니다.',tier:'gold',scope:'common',effects:[{kind:'stat',roles:[9],stat:'damage',value:.26}]},
 {id:'special-sniper-extra',name:'전술적 재배치',description:'저격병 이동속도가 20% 증가하여 적 돌격을 피해 사격 위치를 다시 잡습니다.',tier:'gold',scope:'common',effects:[{kind:'stat',roles:[9],stat:'speed',value:.20}]},
 {id:'special-assassin-damage',name:'급소 노림수',description:'암살자의 공격력이 25% 증가합니다. 탐지 가능 범위는 그대로입니다.',tier:'gold',scope:'common',effects:[{kind:'stat',roles:[10],stat:'damage',value:.25}]},
 {id:'special-assassin-extra',name:'암영 생존술',description:'암살자 체력이 25% 증가하여 적진에서의 생존력이 높아집니다.',tier:'gold',scope:'common',effects:[{kind:'stat',roles:[10],stat:'hp',value:.25}]}
]);
let cards=[],byId=new Map(),loading,baseReady=false;
function load(){
 if(!loading)loading=fetch('./assets/audio/../augments.json').then(r=>{if(!r.ok)throw Error('증강 카드 파일을 불러올 수 없습니다.');return r.json();}).then(data=>{
  if(data.schema!==1||!Array.isArray(data.cards)||data.cards.length!==300)throw Error('증강 카드 300종 검증 실패');
  baseReady=true;cards=data.cards.concat(specialistCards,global.DesertPrism?.enabled?.()?global.DesertPrism.cards:[]);byId=new Map(cards.map(x=>[x.id,x]));return data;
 }).catch(e=>{loading=null;throw e;});
 return loading;
}
function ready(){return baseReady&&cards.length===300+specialistCards.length+(global.DesertPrism?.enabled?.()?(global.DesertPrism?.cards?.length||0):0);}
function rng(seed){
 let state=(seed>>>0)||1;
 return function(){state^=(state<<13);state^=state>>>17;state^=(state<<5);return (state>>>0)/4294967296;};
}
function create(seed=1,{prismOnly=false}={}){
 const roll=rng(seed),schedule=prismOnly?Array(STAGES.length).fill('prismatic'):WEIGHTS.map(w=>{const n=roll()*100;return TIERS[n<w[0]?0:n<w[0]+w[1]?1:2]});
 function draw(tier,scopes,blocked){
  const pool=cards.filter(c=>c.tier===tier&&scopes.includes(c.scope)&&!blocked.has(c.id));if(!pool.length)return '';
  // Make the two newly introduced class transcendences discoverable without
  // excluding older Prism cards; every card remains available and unique.
  const weights=pool.map(c=>tier==='prismatic'&&c.id.startsWith('exp-specialist-')?4:1);
  let pick=roll()*weights.reduce((sum,n)=>sum+n,0),index=0;
  while(index<pool.length-1&&pick>=weights[index])pick-=weights[index++];
  const id=pool[index].id;blocked.add(id);return id;
 }
 function offer(tier,faction,chosen=[]){const blocked=new Set(chosen),own='faction-'+faction;return tier==='prismatic'
  ?Array.from({length:3},()=>draw(tier,[own,'common'],blocked))
  :[draw(tier,[own],blocked),draw(tier,['common'],blocked),draw(tier,['common'],blocked)];}
 function reroll(tier,chosen,offered,slot,faction){const prev=byId.get(offered[slot]);if(!prev)return '';const own=Number.isInteger(faction)?'faction-'+faction:offered.map(id=>byId.get(id)?.scope).find(s=>s?.startsWith('faction-'));
  return draw(tier,tier==='prismatic'?[...(own?[own]:[]),'common']:[prev.scope],new Set([...chosen,...offered]));}
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
 list:()=>cards.map(c=>({id:c.id,name:c.name,description:c.description,tier:c.tier,scope:c.scope,experimental:!!c.experimental})),specialistCards,STAGES,TIERS});
global.DesertAugments=api;
if(typeof document!=='undefined')void load().catch(()=>{});
})(typeof window==='undefined'?globalThis:window);
