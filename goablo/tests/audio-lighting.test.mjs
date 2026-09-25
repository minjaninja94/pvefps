import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CREATURE_FAMILIES,CREATURE_VOICE_BANKS,CREATURE_VOICE_FILES,creatureFamily,voiceBank,voiceCooldown} from '../audio-system.js';
import {START_MENU_MUSIC,ACT_MUSIC_TRACKS,musicTrackForAct} from '../music-system.js';

test('every creature voice bank points to a valid WAV sample',()=>{
 assert.equal(CREATURE_VOICE_FILES.length,15);
 for(const relativePath of CREATURE_VOICE_FILES){
  const file=new URL('../'+relativePath,import.meta.url),header=fs.readFileSync(file).subarray(0,12);
  assert.equal(header.subarray(0,4).toString(),'RIFF',relativePath);
  assert.equal(header.subarray(8,12).toString(),'WAVE',relativePath);
 }
 for(const family of CREATURE_FAMILIES)for(const event of ['notice','attack','hit','special','death'])assert.ok(CREATURE_VOICE_BANKS[family][event].length,`${family}:${event}`);
 assert.deepEqual(voiceBank('death','angel'),CREATURE_VOICE_BANKS.angel.death);
 assert.equal(creatureFamily({name:'타락천사고아',behavior:'fallenangelboss'}),'angel');
 assert.equal(creatureFamily({name:'거미어미고아',behavior:'spiderboss'}),'insect');
 assert.equal(creatureFamily({name:'구울고아',category:'일반/언데드'}),'ghoul');
 assert.equal(creatureFamily({name:'좀비고아',category:'일반/언데드'}),'zombie');
 assert.ok(voiceCooldown('attack',true)>voiceCooldown('attack',false));
});

test('combat uses decoded positional voices and transient lights',()=>{
 const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
 assert.match(game,/decodeAudioData/);assert.match(game,/createBufferSource/);assert.match(game,/createStereoPanner/);
 assert.match(game,/creatureVoice\('notice'/);assert.match(game,/creatureVoice\('attack'/);assert.match(game,/creatureVoice\('hit'/);assert.match(game,/creatureVoice\('death'/);
 assert.match(game,/function combatLight/);assert.match(game,/dynamicLight/);assert.match(game,/s\.light\.position\.set/);
 assert.match(game,/lootLightPillar/);assert.match(game,/height:5\.8/);
 assert.doesNotMatch(game,/createOscillator|function sound\(/);
});

test('menu and every Act use MP3 looping music assets',()=>{
 assert.equal(START_MENU_MUSIC,'assets/audio/music/Cold_Weight_in_the_Hallway.mp3');
 assert.equal(ACT_MUSIC_TRACKS.length,5);
 for(const [index,relativePath] of ACT_MUSIC_TRACKS.entries()){
  assert.match(relativePath,/\.mp3$/);assert.doesNotMatch(relativePath,/\.ogg/);
  assert.equal(musicTrackForAct(index+1),relativePath);
 }
 const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
 assert.match(game,/backgroundMusic\.loop=true/);assert.match(game,/menu\?START_MENU_MUSIC/);assert.match(game,/startMenuMusic/);assert.match(game,/setBackgroundMusic\(false\)/);assert.match(game,/setBackgroundMusic\(true\)/);
});
