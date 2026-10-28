/* Shared augment rules. The web catalogue and Godot JSON use one source. */
(function (global) {
'use strict';
let cards = [];
const byId = new Map();
const stages = [1, 10, 20, 30, 40];
const weights = [[75,23,2],[55,38,7],[35,50,15],[20,55,25],[10,50,40]];
const tiers = ['silver','gold','prismatic'];
function load(data) {
 if (data?.schema !== 1 || !Array.isArray(data.cards) || data.cards.length !== 300) throw Error('Invalid augment catalogue');
 cards = data.cards; byId.clear(); cards.forEach(card => byId.set(card.id, card));
}
function rng(seed) {
 let value = (seed >>> 0) || 1;
 return () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
}
function schedule(seed) {
 const roll = rng(seed);
 return weights.map(row => { const n=roll()*100; return tiers[n<row[0]?0:n<row[0]+row[1]?1:2]; });
}
function offer(tier,faction,selected,used,roll) {
 const chosen=new Set([...selected,...used]);
 function draw(scope) {
  const pool=cards.filter(c=>c.tier===tier&&c.scope===scope&&!chosen.has(c.id));
  if(!pool.length)throw Error('No eligible augment');
  const card=pool[Math.floor(roll()*pool.length)];chosen.add(card.id);return card.id;
 }
 return [draw('faction-'+faction),draw('common'),draw('common')];
}
function reroll(tier,selected,offerIds,slot,roll) {
 if(!Number.isInteger(slot)||slot<0||slot>2)return null;
 const current=byId.get(offerIds[slot]),blocked=new Set([...selected,...offerIds]);
 const pool=cards.filter(c=>c.tier===tier&&c.scope===current?.scope&&!blocked.has(c.id));
 return pool.length?pool[Math.floor(roll()*pool.length)].id:null;
}
function apply(def,selected,role) {
 const out={...def};
 for(const id of selected||[])for(const e of byId.get(id)?.effects||[]) {
  if(e.kind!=='stat'||e.roles.length&&!e.roles.includes(role)||(!(e.stat in out)&&e.stat!=='regen'))continue;
  if(e.stat==='regen')out.regen=Math.min(.005,(out.regen||0)+e.value);
  else if(e.stat==='armor')out.armor=Math.min(50,out.armor+e.value);
  else if(e.stat==='rate')out.rate=Math.max(.25,out.rate*(1+e.value));
  else out[e.stat]=Math.max(0,out[e.stat]*(1+e.value));
 }
 return out;
}
function extra(selected,role) {
 let count=0;
 for(const id of selected||[])for(const e of byId.get(id)?.effects||[])
  if(e.kind==='extra_spawn'&&e.roles.includes(role))count+=e.value;
 return Math.min(3,count);
}
global.DesertAugments=Object.freeze({load,get:id=>byId.get(id),schedule,offer,reroll,apply,extra,rng,stages});
})(typeof window==='undefined'?globalThis:window);

