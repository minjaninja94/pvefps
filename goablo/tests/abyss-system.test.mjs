import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ensureAbyssState,abyssDifficulty,abyssMutators,formatClearTime,makeAbyssRecord,rankAbyssRecords,completeAbyss} from '../abyss-system.js';

const player=()=>({classId:'C01',specialization:'S01',equipment:{무기:'a'},loadout:['x']});

test('legacy saves receive a stable abyss progression state',()=>{const p=player();ensureAbyssState(p);assert.equal(p.abyssTier,1);assert.equal(p.abyssBestTier,0);assert.equal(p.nickname,'이름없는고아');});
test('abyss difficulty rises while loot reaches the old high-floor rate at tier 100',()=>{assert.deepEqual(abyssDifficulty(1),{health:1,damage:1,eliteChance:.115,loot:1});const early=abyssDifficulty(20),high=abyssDifficulty(100);assert.ok(early.health>early.damage);assert.equal(early.eliteChance,.65);assert.ok(early.loot<1.2);assert.equal(high.loot,2.52);});
test('abyss mutators stack every five tiers without early immunity',()=>{assert.deepEqual(abyssMutators(4),[]);assert.deepEqual(abyssMutators(5).map(x=>x.id),['swift']);assert.deepEqual(abyssMutators(15).map(x=>x.id),['swift','fortified','volcanic']);assert.ok(abyssMutators(25).every(x=>!x.id.includes('immune')));});
test('clear updates the next tier and captures a compact build snapshot',()=>{const p=player();ensureAbyssState(p);const record=completeAbyss(p,3,82.4);assert.equal(p.abyssTier,4);assert.equal(p.abyssBestTier,3);assert.deepEqual(record.build,{equipment:['a'],skills:['x']});assert.equal(formatClearTime(record.time),'01:22');});
test('ranking keeps each build best and sorts tier before time',()=>{const p=player(),a=makeAbyssRecord({...p,nickname:'가'},2,50),b=makeAbyssRecord({...p,nickname:'가'},3,90),c=makeAbyssRecord({...p,nickname:'나'},3,70);assert.deepEqual(rankAbyssRecords([a,b,c]).map(x=>x.nickname),['나','가']);});
test('runtime connects campaign unlock, abyss clear and ranking UI',()=>{const game=readFileSync(new URL('../game.js',import.meta.url),'utf8'),html=readFileSync(new URL('../index.html',import.meta.url),'utf8');for(const token of ['enterAbyss()','completeAbyss(p,abyssTier','abyssDifficulty(abyssTier)','function rankingPanel()','function abyssResultPanel()'])assert.match(game,new RegExp(token.replace(/[()]/g,'\\$&')));assert.match(html,/id="rankingBtn"/);});
test('runtime applies swift, fortified and volcanic abyss mutations',()=>{const game=readFileSync(new URL('../game.js',import.meta.url),'utf8');assert.match(game,/abyssMutators\(abyssTier\)/);assert.match(game,/mutators\.includes\('fortified'\)/);assert.match(game,/includes\('swift'\)\?1\.12/);assert.match(game,/includes\('volcanic'\).*addZone/s);});
