import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {environmentCell,friendlyVfxCell,enemyVfxCell,summonSpriteRow,hirelingProfile,zoneVfxCell,areaVfxCell} from '../visual-assets.js';

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

test('act and abyss portals use pre-baked padded cells without runtime extraction',()=>{const def=SPRITE_MANIFEST.portals,header=pngHeader(def.image);assert.equal(def.image,'assets/sprites/portal-atlas-v4.png');assert.deepEqual([header.width,header.height,header.colorType],[1024,512,6]);assert.deepEqual([def.columns,def.rows],[4,2]);assert.equal(def.isolateComponents,undefined);});

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

test('projectiles and chain links render atlas assets without primitive geometry',()=>{
  const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
  const beam=game.slice(game.indexOf('function beam('),game.indexOf('function number('));
  const projectile=game.slice(game.indexOf('function projectile('),game.indexOf('function summon('));
  assert.match(beam,/createAtlasBillboard/);assert.match(beam,/friendlyVfxCell/);assert.match(beam,/enemyVfxCell/);
  assert.doesNotMatch(beam,/CylinderGeometry|BoxGeometry|SphereGeometry|IcosahedronGeometry/);
  assert.match(projectile,/assetOnlyProjectile/);assert.doesNotMatch(projectile,/IcosahedronGeometry|SphereGeometry|BoxGeometry/);
  assert.match(game,/kind:'LIGHTNING',chain:true/);
});

test('every summon behavior resolves to an atlas row',()=>{
  assert.deepEqual(['skeleton','archer','mage','knight','hire0','hire1','hire2','hire3','shadow','zombie'].map(summonSpriteRow),[0,1,2,3,4,3,1,5,6,7]);
});

test('four human hirelings use pre-baked full-body cells without runtime extraction',()=>{const def=SPRITE_MANIFEST.hirelingSummons,header=pngHeader(def.image);assert.equal(def.image,'assets/sprites/hireling-summons-v3.png');assert.deepEqual([header.width,header.height,header.colorType],[1536,768,6]);assert.deepEqual([def.columns,def.rows,def.chromaKey],[8,4,false]);assert.equal(def.isolateComponents,undefined);assert.deepEqual(['hire0','hire1','hire2','hire3'].map(kind=>hirelingProfile(kind).row),[0,1,2,3]);assert.deepEqual(['hire0','hire1','hire2','hire3'].map(kind=>hirelingProfile(kind).name),['갈고리창 고아','문짝방패 고아','못박이 고아','두칼 고아']);});

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

test('one continuous 3D terrain stays below persistent skill zones',()=>{const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');assert.doesNotMatch(game,/const decal=/);assert.doesNotMatch(game,/atlasTexture\(spriteLibrary,'environment'/);assert.doesNotMatch(game,/CylinderGeometry\(1,1,\.14,28\)/);assert.doesNotMatch(game,/box\(rect\.w,\.14,rect\.h/);assert.match(game,/terrain\.userData\.continuousTerrain=true/);assert.match(game,/isTown\?-\.55:-\.27/);assert.match(game,/CircleGeometry\(r,40\).*position\.set\(x,\.04,z\)/s);});
