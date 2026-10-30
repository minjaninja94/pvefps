'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,assets=path.join(root,'assets','audio');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('Original Godot voices and all 80 new Nemo Japanese specialists are packaged without Godot music',()=>{
 const index=JSON.parse(fs.readFileSync(path.join(assets,'voice_index.json'),'utf8'));
 const cast=JSON.parse(fs.readFileSync(path.join(assets,'voice_cast.json'),'utf8'));
 assert.equal(index.schema,1);assert.equal(Object.keys(index.clips).length,704);
 assert.equal(cast.units.length,80);
 const atlases=new Set();
 for(const [id,clip] of Object.entries(index.clips)){
  assert.match(id,/^(default|moe)\/[0-9]-(?:[0-7]|9|10)-(spawn|attack|hit|death)$/);
  assert.ok(clip.start>=0&&clip.duration>0);
  atlases.add(clip.atlas);
 }
 assert.equal(atlases.size,27);
 for(const name of atlases)assert.equal(fs.readFileSync(path.join(assets,'voices',name)).subarray(0,4).toString(),'OggS');
 const effects=['alarm','antiair','armor','blade','breaker','building','death','explosion','flyer','heal','hit','rifle','siege'];
 for(const name of effects)assert.equal(fs.readFileSync(path.join(assets,'sfx',name+'.wav')).subarray(0,4).toString(),'RIFF');
 assert.equal(fs.existsSync(path.join(assets,'music')),false);
});
test('Web BGM stays separate from combat voices',()=>{
 const music=read('lobby-music.js'),combat=read('combat-audio.js'),html=read('index.html');
 assert.match(music,/lobby-theme\.mp3/);assert.match(music,/battle-theme\.mp3/);
 assert.doesNotMatch(combat,/new Audio\(.+music/);
 assert.match(combat,/VOICEVOX Nemo attribution/);
 assert.ok(html.indexOf('combat-audio.js')<html.indexOf('tri-lane-ui.js'));
 assert.ok(html.includes('combatAudioToggle'));
 assert.ok(html.includes('VOICEVOX Nemo'));
});
test('Both solo and multiplayer emit audio on real unit events',()=>{
 const solo=read('game-v2.js'),multi=read('tri-lane-ui.js');
 for(const word of ["'spawn'","'hit'","'death'","'heal'","'explosion'"])assert.ok(solo.includes(word),word);
 assert.match(solo,/DesertCombatAudio\?\.attack/);
 assert.match(multi,/combatAudioSnapshot\(v\)/);
 assert.match(multi,/audio\.attack\(/);
 assert.match(multi,/fog-redacted/);
});
