import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DB} from '../data/database.js';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {act3MonsterProfile} from '../sprite-system.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const queue=JSON.parse(fs.readFileSync(path.join(root,'GOABLO_sprite_queue(1).json'),'utf8'));
function pngHeader(file){const bytes=fs.readFileSync(path.join(root,file));return {signature:[...bytes.subarray(0,8)],width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),colorType:bytes[25]};}

test('Act 3 atlas is a transparent 8 by 6 runtime sheet',()=>{
  assert.deepEqual(pngHeader(SPRITE_MANIFEST.act3Monsters.image),{signature:[137,80,78,71,13,10,26,10],width:1182,height:1330,colorType:3});
  assert.deepEqual({columns:SPRITE_MANIFEST.act3Monsters.columns,rows:SPRITE_MANIFEST.act3Monsters.rows},{columns:8,rows:6});
});

test('all six Act 3 monsters use distinct rows and compatible combat behaviors',()=>{
  const jobs=queue.acts.find(entry=>entry.act===3).jobs,behaviors=['rage','cold','ranged','rush','fire','summon'];
  jobs.forEach((job,index)=>{const profile=act3MonsterProfile(index);assert.deepEqual({id:profile.id,name:profile.name,row:profile.row,atlas:profile.atlas},{id:job.id,name:job.name,row:index,atlas:'act3Monsters'});assert.deepEqual({status:job.status,source:job.source,atlas:job.atlas,row:job.row},{status:'integrated',source:SPRITE_MANIFEST.act3Monsters.image,atlas:'act3Monsters',row:index});assert.equal(DB.monsters[profile.dbIndex].behavior,behaviors[index]);});
});
