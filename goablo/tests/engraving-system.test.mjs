import test from 'node:test';
import assert from 'node:assert/strict';
import {ENGRAVING_CATALYSTS,engravingSlots,ensureEngravingState,grantActCatalyst,applyEngraving,engravingBonuses} from '../engraving-system.js';
import fs from 'node:fs';

test('engraving slots scale with rarity',()=>{
  assert.equal(engravingSlots({rarity:'희귀'}),1);
  assert.equal(engravingSlots({rarity:'전설'}),2);
  assert.equal(engravingSlots({rarity:'부모급'}),3);
});

test('act reward is granted once and persists',()=>{
  const player={};ensureEngravingState(player);
  assert.equal(grantActCatalyst(player,3,()=>0).id,'ifrit');
  assert.equal(grantActCatalyst(player,3,()=>.5),null);
  assert.equal(player.catalysts.ifrit,1);
});

test('engraving replacement refunds previous catalyst',()=>{
  const player={catalysts:{ifrit:1,undine:1}},item={rarity:'전설'};
  assert.equal(applyEngraving(player,item,'ifrit',0),true);
  assert.equal(applyEngraving(player,item,'undine',0),true);
  assert.equal(player.catalysts.ifrit,1);
  assert.deepEqual(item.engravings,['undine',null]);
});

test('equipped engravings contribute real combat bonuses',()=>{
  const bonuses=engravingBonuses([{engravings:['strength','agility','ifrit','scripture','blood']}]);
  assert.equal(bonuses.damage,.08);assert.equal(bonuses.speed,.04);assert.equal(bonuses.tags.FIRE,.15);
  assert.equal(bonuses.potion,.03);assert.equal(bonuses.leech,.01);
  assert.equal(ENGRAVING_CATALYSTS.length,9);
});

test('town UI and combat runtime consume engraving bonuses',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
  assert.match(html,/id="engravingBtn"/);
  assert.match(game,/function engravingPanel/);
  assert.match(game,/st\.engraving\.tags\[tag\]/);
  assert.match(game,/grantActCatalyst\(p,act\)/);
});
