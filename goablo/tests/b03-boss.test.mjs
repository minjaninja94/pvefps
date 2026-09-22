import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {b03BossProfile} from '../sprite-system.js';

test('B03 boss atlas and combat profile are integrated',()=>{
  const def=SPRITE_MANIFEST.bossB03,profile=b03BossProfile();
  assert.deepEqual([def.columns,def.rows,def.chromaKey],[8,1,false]);
  assert.deepEqual([profile.id,profile.name,profile.dbIndex,profile.row,profile.atlas,profile.behavior,profile.boss],['B03','천개의다리고아',22,0,'bossB03','centipedeboss',true]);
  const png=fs.readFileSync(new URL('../'+def.image,import.meta.url));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
});

test('B03 queue entry records the runtime asset',()=>{
  const queue=JSON.parse(fs.readFileSync(new URL('../GOABLO_sprite_queue(1).json',import.meta.url),'utf8'));
  const boss=queue.bosses.find(item=>item.id==='B03');
  assert.equal(boss.status,'integrated');
  assert.equal(boss.source,'assets/sprites/b03-thousand-legs.png');
  assert.equal(boss.atlas,'bossB03');
});

test('B03 has a dedicated eight-frame combat motion row',()=>{const profile=b03BossProfile(),def=SPRITE_MANIFEST[profile.attackAtlas];assert.deepEqual([def.columns,def.rows,profile.attackRow],[8,5,0]);const png=fs.readFileSync(new URL('../'+def.image,import.meta.url));assert.equal(png[25],6);});
