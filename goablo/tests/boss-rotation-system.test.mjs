import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {drawBossNumber,ensureBossRotation,ROTATING_BOSS_NUMBERS} from '../boss-rotation-system.js';

test('campaign Acts keep their authored boss order',()=>{for(let act=1;act<=12;act++)assert.equal(drawBossNumber(null,{act,abyssMode:false,abyssTier:99}).bossNumber,act);});

test('orphan king appears only on every tenth abyss tier',()=>{
 let state=ensureBossRotation();
 for(let tier=1;tier<=40;tier++){const result=drawBossNumber(state,{act:12,abyssMode:true,abyssTier:tier},()=>.37);state=result.state;if(tier%10===0)assert.equal(result.bossNumber,12,`tier ${tier}`);else assert.notEqual(result.bossNumber,12,`tier ${tier}`);}
});

test('the other eleven bosses are exhausted evenly before reshuffling',()=>{
 let state=ensureBossRotation(),drawn=[];for(const tier of [1,2,3,4,5,6,7,8,9,11,12]){const result=drawBossNumber(state,{act:12,abyssMode:true,abyssTier:tier},()=>.42);state=result.state;drawn.push(result.bossNumber);}
 assert.deepEqual([...new Set(drawn)].sort((a,b)=>a-b),ROTATING_BOSS_NUMBERS);
 const next=drawBossNumber(state,{act:12,abyssMode:true,abyssTier:13},()=>.42);assert.notEqual(next.bossNumber,drawn.at(-1));
});

test('runtime selects abyss bosses through the persisted shuffle bag',()=>{const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');assert.match(game,/drawBossNumber\(p\.bossRotation/);assert.match(game,/p\.bossRotation=selection\.state/);assert.match(game,/bossNumber===1\?act1BossProfile/);});
