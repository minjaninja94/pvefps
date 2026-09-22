import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {bossProfileForAct} from '../sprite-system.js';

const expected=[
  ['B04','타락천사고아','fallenangelboss'],['B05','유혹하는고아','temptressboss'],
  ['B06','목없는고아기사','dullahanboss'],['B07','칼날군주고아','bladelordboss'],
  ['B08','육체수집가고아','collectorboss'],['B09','심연의촉수고아','abyssboss'],
  ['B10','악마군주고아','demonlordboss'],['B11','해골왕고아','bonekingboss'],
  ['B12','고아들의왕','orphankingboss']
];

test('B04-B12 boss atlases and profiles are complete',()=>{
  for(let i=0;i<expected.length;i++){
    const act=i+4,[id,name,behavior]=expected[i],def=SPRITE_MANIFEST['boss'+id],profile=bossProfileForAct(act);
    assert.deepEqual([def.columns,def.rows,def.chromaKey],[8,1,false]);
    assert.deepEqual([profile.id,profile.name,profile.behavior,profile.boss,profile.row],[id,name,behavior,true,0]);
    const png=fs.readFileSync(new URL('../'+def.image,import.meta.url));
    assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  }
});

test('B04-B12 queue entries are integrated',()=>{
  const queue=JSON.parse(fs.readFileSync(new URL('../GOABLO_sprite_queue(1).json',import.meta.url),'utf8'));
  for(const [id] of expected){const boss=queue.bosses.find(item=>item.id===id);assert.equal(boss.status,'integrated');assert.equal(boss.atlas,'boss'+id);assert.equal(boss.row,0);}
});

test('B04-B11 use dedicated eight-frame attack motion rows',()=>{for(let act=4;act<=11;act++){const profile=bossProfileForAct(act),def=SPRITE_MANIFEST[profile.attackAtlas];assert.ok(def);assert.equal(def.columns,8);assert.ok(profile.attackRow>=0&&profile.attackRow<def.rows);const png=fs.readFileSync(new URL('../'+def.image,import.meta.url));assert.equal(png[25],6);}});

test('boss frames anchor their lowest opaque pixel to the ground',()=>{const runtime=fs.readFileSync(new URL('../sprite-system.js',import.meta.url),'utf8'),game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');assert.match(runtime,/textureGroundAnchor/);assert.match(runtime,/spriteGrounding:boss/);assert.match(runtime,/sprite\.center\.y=data\.spriteFrames\[frame\]\.userData\.groundAnchor/);assert.match(game,/sprite\.center\.y=motion\.frames\[frame\]\.userData\.groundAnchor/);});
