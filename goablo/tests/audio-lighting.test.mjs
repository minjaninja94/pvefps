import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CREATURE_VOICE_BANKS,CREATURE_VOICE_FILES,voiceBank,voiceCooldown} from '../audio-system.js';

test('every creature voice bank points to a valid WAV sample',()=>{
 assert.ok(CREATURE_VOICE_FILES.length>=20);
 for(const relativePath of CREATURE_VOICE_FILES){
  const file=new URL('../'+relativePath,import.meta.url),header=fs.readFileSync(file).subarray(0,12);
  assert.equal(header.subarray(0,4).toString(),'RIFF',relativePath);
  assert.equal(header.subarray(8,12).toString(),'WAVE',relativePath);
 }
 for(const event of ['notice','attack','hit','death'])assert.ok(CREATURE_VOICE_BANKS[event].length);
 assert.deepEqual(voiceBank('death',true),CREATURE_VOICE_BANKS.bossDeath);
 assert.ok(voiceCooldown('attack',true)>voiceCooldown('attack',false));
});

test('combat uses decoded positional voices and transient lights',()=>{
 const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
 assert.match(game,/decodeAudioData/);assert.match(game,/createBufferSource/);assert.match(game,/createStereoPanner/);
 assert.match(game,/creatureVoice\('notice'/);assert.match(game,/creatureVoice\('attack'/);assert.match(game,/creatureVoice\('hit'/);assert.match(game,/creatureVoice\('death'/);
 assert.match(game,/function combatLight/);assert.match(game,/dynamicLight/);assert.match(game,/s\.light\.position\.set/);
 assert.match(game,/lootLightPillar/);assert.match(game,/height:5\.8/);
});
