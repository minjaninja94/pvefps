import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DB} from '../data/database.js';
import {changeCharacterState} from '../character-switch-system.js';

test('character change preserves journey progress and inventory',()=>{
 const inventory=[{uid:'old-weapon',slot:'무기',weaponId:'W01'}],before={classId:'C01',level:14,xp:73,gold:912,inventory,equipment:{무기:'old-weapon'},skillLevels:{S01_01:5},branches:{S01_01:'power'},points:2,potionLevel:3,abyssTier:8,abyssBestTier:7,bossRotation:{bag:[2,5],last:4}};
 const after=changeCharacterState(DB,before,'C04');
 assert.equal(after.classId,'C04');assert.equal(after.level,14);assert.equal(after.xp,73);assert.equal(after.gold,912);assert.equal(after.inventory,inventory);assert.equal(after.potionLevel,3);assert.equal(after.abyssTier,8);assert.deepEqual(after.bossRotation,before.bossRotation);
 assert.deepEqual(after.equipment,{});assert.deepEqual(after.skillLevels,{});assert.deepEqual(after.branches,{});assert.equal(after.points,42);assert.ok(after.loadout.every(id=>id.startsWith('S13_')));
});

test('character flow uses in-game panels without a browser confirmation or reload',()=>{const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8'),change=game.slice(game.indexOf('function characterChangePanel'),game.indexOf('function newJourneyConfirmation')),journey=game.slice(game.indexOf('function newJourneyConfirmation'),game.indexOf('function chooseClass'));assert.match(change,/changeCharacterState/);assert.doesNotMatch(change,/location\.reload|confirm\(/);assert.match(journey,/showPanel\('새 여정 확인'/);assert.doesNotMatch(journey,/location\.reload|confirm\(/);const start=game.slice(game.indexOf('const hasSavedJourney'),game.indexOf("window.addEventListener('keydown'"));assert.doesNotMatch(start,/confirm\(/);});
