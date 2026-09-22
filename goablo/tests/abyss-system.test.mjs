import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureAbyssState,abyssDifficulty,formatClearTime,makeAbyssRecord,rankAbyssRecords,completeAbyss} from '../abyss-system.js';

const player=()=>({classId:'C01',specialization:'S01',equipment:{무기:'a'},loadout:['x']});

test('legacy saves receive a stable abyss progression state',()=>{const p=player();ensureAbyssState(p);assert.equal(p.abyssTier,1);assert.equal(p.abyssBestTier,0);assert.equal(p.nickname,'이름없는고아');});
test('abyss difficulty rises without explosive damage scaling',()=>{assert.deepEqual(abyssDifficulty(1),{health:1,damage:1,eliteChance:.115,loot:1});const high=abyssDifficulty(20);assert.ok(high.health>high.damage);assert.equal(high.eliteChance,.65);});
test('clear updates the next tier and captures a compact build snapshot',()=>{const p=player();ensureAbyssState(p);const record=completeAbyss(p,3,82.4);assert.equal(p.abyssTier,4);assert.equal(p.abyssBestTier,3);assert.deepEqual(record.build,{equipment:['a'],skills:['x']});assert.equal(formatClearTime(record.time),'01:22');});
test('ranking keeps each build best and sorts tier before time',()=>{const p=player(),a=makeAbyssRecord({...p,nickname:'가'},2,50),b=makeAbyssRecord({...p,nickname:'가'},3,90),c=makeAbyssRecord({...p,nickname:'나'},3,70);assert.deepEqual(rankAbyssRecords([a,b,c]).map(x=>x.nickname),['나','가']);});
