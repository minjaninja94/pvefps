import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {environmentCell,friendlyVfxCell,enemyVfxCell,summonSpriteRow,zoneVfxCell,areaVfxCell} from '../visual-assets.js';

function pngHeader(file){const bytes=fs.readFileSync(new URL('../'+file,import.meta.url));return {signature:[...bytes.subarray(0,8)],width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),colorType:bytes[25]};}

test('environment, attack and summon atlases are transparent runtime sheets',()=>{
  const expected={environment:[1280,800,8,5],enemyVfx:[1280,640,8,4],friendlyVfx:[1280,640,8,4],areaVfx:[1280,640,8,4],summons:[960,960,8,8]};
  for(const [key,[width,height,columns,rows]] of Object.entries(expected)){
    const def=SPRITE_MANIFEST[key],header=pngHeader(def.image);
    assert.deepEqual(header.signature,[137,80,78,71,13,10,26,10]);
    assert.deepEqual([header.width,header.height,header.colorType],[width,height,3]);
    assert.deepEqual([def.columns,def.rows,def.chromaKey],[columns,rows,false]);
  }
});

test('all five Acts and special room landmarks have stable map cells',()=>{
  assert.deepEqual(environmentCell(1,'floor'),{row:0,column:0});
  assert.deepEqual(environmentCell(5,'reward'),{row:4,column:7});
  assert.deepEqual(environmentCell(99,'trap'),{row:4,column:6});
});

test('friendly and enemy attacks resolve projectile and impact sprites',()=>{
  assert.deepEqual(friendlyVfxCell('FIRE'),{row:1,column:0});
  assert.deepEqual(friendlyVfxCell('W16'),{row:0,column:2});
  assert.deepEqual(friendlyVfxCell('LIGHTNING',true),{row:3,column:4});
  assert.deepEqual(enemyVfxCell('web'),{row:0,column:3});
  assert.deepEqual(enemyVfxCell('fallenangelboss'),{row:2,column:3});
  assert.deepEqual(enemyVfxCell('abyss',true),{row:3,column:7});
});

test('every summon behavior resolves to an atlas row',()=>{
  assert.deepEqual(['skeleton','archer','mage','knight','hire0','hire1','hire2','hire3','shadow','zombie'].map(summonSpriteRow),[0,1,2,3,4,3,1,5,6,7]);
});

test('persistent zones and wide attacks resolve distinct ground cells',()=>{
  assert.deepEqual(zoneVfxCell('fire'),{row:0,column:0});
  assert.deepEqual(zoneVfxCell('web'),{row:0,column:2});
  assert.deepEqual(zoneVfxCell('tentacle'),{row:1,column:2});
  assert.deepEqual(zoneVfxCell('arrowstorm'),{row:1,column:6});
  assert.deepEqual(areaVfxCell('MELEE'),{row:2,column:0});
  assert.deepEqual(areaVfxCell('COLD'),{row:2,column:4});
  assert.deepEqual(areaVfxCell('BLOOD'),{row:2,column:6});
  assert.deepEqual(areaVfxCell('FIRE'),{row:3,column:0});
});
