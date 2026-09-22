import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignDepth,progressionDepth,usesMixedRoster,namedChance,canHaveImmunity,namedTraits,elementalDamageMultiplier} from '../progression-system.js';
import {mixedMonsterProfile} from '../sprite-system.js';

test('campaign floor five unlocks the complete mixed monster roster',()=>{
  assert.equal(campaignDepth(2,2),5);
  assert.equal(usesMixedRoster(campaignDepth(2,1)),false);
  assert.equal(usesMixedRoster(campaignDepth(2,2)),true);
  const atlases=new Set(Array.from({length:30},(_,index)=>mixedMonsterProfile(index).atlas||'monsters'));
  assert.deepEqual([...atlases],['monsters','act2Monsters','act3Monsters','act4Monsters','act5Monsters']);
});

test('named enemies start at floor six with resistance',()=>{
  assert.equal(namedChance(5),0);
  assert.ok(namedChance(6)>0);
  const traits=namedTraits(6,()=>0);
  assert.equal(traits.resistance,'COLD');
  assert.equal(traits.immunity,null);
  assert.equal(elementalDamageMultiplier(traits,'COLD'),.6);
  assert.equal(elementalDamageMultiplier(traits,'FIRE'),1);
});

test('element immunity is impossible before depth 25',()=>{
  assert.equal(canHaveImmunity(24),false);
  assert.equal(namedTraits(24,()=>0).immunity,null);
  assert.equal(canHaveImmunity(25),true);
  const traits=namedTraits(25,()=>0);
  assert.equal(traits.immunity,'COLD');
  assert.equal(elementalDamageMultiplier(traits,'COLD'),0);
  assert.equal(progressionDepth({abyssMode:true,abyssTier:25}),25);
});
