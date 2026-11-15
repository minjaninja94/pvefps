'use strict';
/* Run with: node --test tests/tcg-smoke.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..','tcg');
const source=f=>fs.readFileSync(path.join(root,f),'utf8');
function runtime(){
 const elements=new Map(),timers=[];
 function el(id){
  if(!elements.has(id)){
   const classes=new Set(['hidden']);
   elements.set(id,{id,textContent:'',innerHTML:'',value:'',disabled:false,style:{setProperty(){}},listeners:{},
    classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),contains:n=>classes.has(n)},
    addEventListener(n,fn){this.listeners[n]=fn;}});
  }
  return elements.get(id);
 }
 const ctx={window:{},document:{getElementById:el,addEventListener(){}},
  localStorage:{getItem(){return null;},setItem(){}},confirm:()=>true,
  setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){},console};
 vm.createContext(ctx);vm.runInContext(source('cards.js'),ctx,{filename:'cards.js'});vm.runInContext(source('game.js'),ctx,{filename:'game.js'});
 return {data:ctx.window.TCG_DATA,api:ctx.window.DimensionWar,el,timers};
}
function handClick(r,index){const target={closest:selector=>selector==='[data-hand]'?{dataset:{hand:String(index)}}:null};r.el('myHand').listeners.click({target});}
test('registry has 8 factions, exactly 240 unique cards and 80 common cards',()=>{
 const r=runtime();
 assert.equal(r.data.factions.length,8);
 assert.equal(r.data.cards.length,240);
 assert.equal(new Set(r.data.cards.map(c=>c.id)).size,240);
 assert.equal(r.data.cards.filter(c=>c.faction===-1).length,80);
 for(let f=0;f<8;f++)assert.equal(r.data.cards.filter(c=>c.faction===f).length,20);
});
test('40-card deck, maximum three copies and faction isolation',()=>{
 const r=runtime();
 for(let f=0;f<8;f++){
  const deck=r.data.makeDeck(f);
  assert.equal(deck.length,40);assert.ok(r.data.isValidDeck(deck,f));
  assert.equal(r.data.isValidDeck(deck.slice(1),f),false);
  const bad=deck.slice();bad[0]=r.data.factions.length===f+1?'f0u0':'f'+(f+1)+'u0';
  assert.equal(r.data.isValidDeck(bad,f),false);
 }
});
test('player starts with five cards, AI six, 100 LP and stage transitions',()=>{
 const r=runtime();r.el('startGame').listeners.click();
 let s=r.api.getState();
 assert.equal(s.players[0].hp,100);assert.equal(s.players[1].hp,100);
 assert.equal(s.players[0].hand.length,5);assert.equal(s.players[1].hand.length,6);
 assert.equal(s.players[0].deck.length,35);assert.equal(s.players[1].deck.length,34);
 assert.equal(s.owner,0);assert.equal(s.stage,'main');
 r.el('combatPhaseBtn').listeners.click();assert.equal(s.stage,'combat');
 r.el('mainPhaseBtn').listeners.click();assert.equal(s.stage,'main');
 r.el('combatPhaseBtn').listeners.click();
 r.el('endTurnBtn').listeners.click();
 s=r.api.getState();
 assert.equal(s.owner,1);assert.equal(s.stage,'main');assert.equal(s.players[1].hand.length,7);
});
test('one basic summon per turn; units enter the board and are exhausted',()=>{
 const r=runtime();r.el('startGame').listeners.click();const s=r.api.getState(),p=s.players[0];
 let low=p.hand.findIndex(id=>r.data.byId[id].rank===0);
 if(low<0){let ix=p.deck.findIndex(id=>r.data.byId[id].rank===0);assert.ok(ix>=0);[p.hand[0],p.deck[ix]]=[p.deck[ix],p.hand[0]];low=0;}
 handClick(r,low);handClick(r,low);
 assert.equal(p.units.filter(Boolean).length,1);assert.equal(p.basicUsed,true);
 assert.equal(p.units.filter(Boolean)[0].entered,s.serial);
 let next=p.hand.findIndex(id=>r.data.byId[id].rank===0);
 if(next>=0){handClick(r,next);handClick(r,next);assert.equal(p.units.filter(Boolean).length,1);}
});
test('HTML has all expected arena and deck UI mount points',()=>{
 const html=source('index.html');
 for(const id of ['factionGrid','gameScreen','myHand','enemyUnits','myUnits','myClash','enemyClash','inspector','reactionOverlay','resultOverlay','cardCatalog'])
 assert.match(html,new RegExp('id="'+id+'"'));
});
