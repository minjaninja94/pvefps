import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LOOT_RARITIES,LOOT_SOUND_FILES,lootSoundFile,lootSoundStrength} from '../audio-system.js';

const root=new URL('../',import.meta.url);
function wavInfo(relative){const data=fs.readFileSync(new URL(relative,root));return{riff:data.toString('ascii',0,4),wave:data.toString('ascii',8,12),channels:data.readUInt16LE(22),rate:data.readUInt32LE(24),bytes:data.length};}

test('every item rarity has a generated stereo loot chime',()=>{
 assert.deepEqual(LOOT_RARITIES,['일반','마법','희귀','전설','유니크','부모급']);
 let previous=0;
 for(const rarity of LOOT_RARITIES){
  const file=lootSoundFile(rarity),info=wavInfo(file);
  assert.equal(info.riff,'RIFF');assert.equal(info.wave,'WAVE');assert.equal(info.channels,2);assert.equal(info.rate,44100);
  assert.ok(info.bytes>previous,`${rarity} chime should have a longer, stronger tail`);previous=info.bytes;
 }
});

test('rarity strength and fallback mappings are deterministic',()=>{
 for(const [index,rarity] of LOOT_RARITIES.entries()){assert.equal(lootSoundStrength(rarity),index);assert.equal(LOOT_SOUND_FILES[rarity],`assets/audio/loot/drop-${index}.wav`);}
 assert.equal(lootSoundFile('알 수 없음'),LOOT_SOUND_FILES['일반']);
});

test('runtime plays drop chimes and high-rarity equip chimes from decoded samples',()=>{
 const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
 assert.match(game,/function lootChime\(/);assert.match(game,/lootChime\(item\.rarity,x\)/);
 assert.match(game,/\['전설','유니크','부모급'\]\.includes\(i\.rarity\)/);
 assert.match(game,/lootChime\(i\.rarity,hero\.position\.x,true\)/);
 assert.match(game,/Object\.values\(LOOT_SOUND_FILES\)/);
 assert.doesNotMatch(game,/createOscillator/);
});
