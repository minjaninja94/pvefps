import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {finalBossPhase,finalBossDamageMultiplier,finalBossWindowDuration,finalBossArenaPattern} from '../final-boss-system.js';

test('orphan king has four deterministic health phases',()=>{
  assert.deepEqual([finalBossPhase(100,100),finalBossPhase(74,100),finalBossPhase(49,100),finalBossPhase(24,100)],[1,2,3,4]);
});

test('phase transition blocks damage and core window rewards attacks',()=>{
  assert.equal(finalBossDamageMultiplier({phaseShield:1,vulnerableUntil:99},10),0);
  assert.equal(finalBossDamageMultiplier({phaseShield:0,vulnerableUntil:20},10),1.75);
  assert.equal(finalBossDamageMultiplier({phaseShield:0,vulnerableUntil:0},10),.3);
  assert.ok(finalBossWindowDuration(4)>finalBossWindowDuration(1));
});

test('each phase materially changes arena hazard positions',()=>{
  const signatures=[1,2,3,4].map(phase=>JSON.stringify(finalBossArenaPattern(phase)));
  assert.equal(new Set(signatures).size,4);assert.equal(finalBossArenaPattern(4).length,8);
});

test('runtime connects final boss phase, arena and damage window rules',()=>{
  const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
  assert.match(game,/shiftFinalBossPhase/);assert.match(game,/finalBossDamageMultiplier/);assert.match(game,/vulnerableUntil/);
});
