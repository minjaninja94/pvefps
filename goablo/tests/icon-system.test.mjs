import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DB} from '../data/database.js';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {itemIconCell,skillIconCell,specIconCell,iconStyle,rarityColor} from '../icon-system.js';

function pngHeader(file){const bytes=fs.readFileSync(new URL('../'+file,import.meta.url));return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),colorType:bytes[25]};}

test('item and skill atlases are square transparent 8 by 8 sheets',()=>{
  for(const key of ['itemIcons','skillIcons1','skillIcons2','skillIcons3']){
    const def=SPRITE_MANIFEST[key],header=pngHeader(def.image);
    assert.deepEqual([header.width,header.height,header.colorType,def.columns,def.rows],[512,512,3,8,8]);
  }
});

test('all 168 skills and 24 specialization crests resolve to valid cells',()=>{
  assert.equal(DB.skills.length,168);assert.equal(DB.specs.length,24);
  for(const skill of DB.skills){const cell=skillIconCell(DB,skill);assert.match(cell.atlas,/^skillIcons[1-3]$/);assert.ok(cell.row>=0&&cell.row<8);assert.ok(cell.column>=0&&cell.column<7);}
  for(const spec of DB.specs){const cell=specIconCell(DB,spec);assert.equal(cell.column,7);assert.ok(cell.row>=0&&cell.row<8);}
});

test('item table rows, rarity colors and inline atlas styles are stable',()=>{
  const weapon=itemIconCell({id:'L001',slot:'무기'}),ring=itemIconCell({id:'R001',slot:'반지'});
  assert.equal(weapon.row,0);assert.equal(ring.row,7);assert.notEqual(iconStyle(weapon,{rotate:true}),iconStyle(ring,{rotate:true}));
  assert.equal(rarityColor('전설'),'#e7a84b');assert.match(iconStyle(weapon),/item-icons-atlas\.png/);
});
