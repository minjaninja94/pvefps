import test from 'node:test';
import assert from 'node:assert/strict';
import {POTION_LEVELS,potionIndex,upgradePotion,gambleItem,MERCHANT_SLOTS} from '../merchant-system.js';
import {DB} from '../data/database.js';
test('potions follow v0.2 and invalid saves normalize safely',()=>{
 assert.deepEqual(POTION_LEVELS.map(p=>p.cooldown),[10,9,8,7,6,5]);
 assert.deepEqual(POTION_LEVELS.map(p=>p.heal),[.25,.28,.32,.36,.4,.45]);
 for(const input of [undefined,NaN,'bad',-1])assert.equal(potionIndex(input),0);
 assert.equal(potionIndex(99),5);
});
test('upgrades charge once, reject insufficient gold and max level',()=>{
 const p={gold:149,potionLevel:0};assert.equal(upgradePotion(p),false);
 p.gold=150;assert.equal(upgradePotion(p),true);assert.deepEqual(p,{gold:0,potionLevel:1});
 p.potionLevel=5;p.gold=10000;assert.equal(upgradePotion(p),false);assert.equal(p.gold,10000);
});
test('merchant rolls preserve requested slot and exclude parent tier',()=>{
 for(const slot of MERCHANT_SLOTS)for(const roll of [0,.05,.5,.999]){
  const item=gambleItem(DB,slot,3,2,()=>roll);
  assert.equal(item.slot,slot);assert.ok(['희귀','전설','유니크'].includes(item.rarity));assert.equal(item.level,3);
 }
 assert.throws(()=>gambleItem(DB,'invalid',1,1));
});
