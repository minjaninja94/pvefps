import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {DB} from '../data/database.js';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {act1BossProfile,act1MonsterProfile,act2MonsterProfile,monsterSpriteRow,playerSpriteRow} from '../sprite-system.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const queue=JSON.parse(fs.readFileSync(path.join(root,'GOABLO_sprite_queue(1).json'),'utf8'));
const spriteMaster=fs.readFileSync(path.join(root,'GOABLO_SPRITE_MASTER(1).md'),'utf8');

test('sprite generation rules reference the latest requirements',()=>{
  assert.equal(queue.requirements,'GOABLO_WORK_REQUIREMENTS_V0.2.md');
  assert.ok(fs.existsSync(path.join(root,queue.requirements)));
  assert.deepEqual({requirementsFirst:queue.rules.requirements_first,originalDesign:queue.rules.original_design_only,corpse:queue.rules.corpse_required,runtimeIntegration:queue.rules.runtime_integration_required},{requirementsFirst:true,originalDesign:true,corpse:true,runtimeIntegration:true});
  assert.match(spriteMaster,/GOABLO_WORK_REQUIREMENTS_V0\.2\.md/);
  assert.match(spriteMaster,/manifest 등록, 게임 연결, death에서 corpse 전환과 실행 검증/);
});

function pngHeader(file){
  const bytes=fs.readFileSync(path.join(root,file));
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],`${file}: PNG signature`);
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),bitDepth:bytes[24],colorType:bytes[25]};
}

test('sprite atlases match the runtime grid and expected source formats',()=>{
  const players=pngHeader(SPRITE_MANIFEST.players.image);
  const monsters=pngHeader(SPRITE_MANIFEST.monsters.image);
  const monsterSource=pngHeader(SPRITE_MANIFEST.monsters.sourceImage);

  assert.deepEqual(players,{width:1448,height:1086,bitDepth:8,colorType:2});
  assert.deepEqual(monsters,{width:1182,height:1330,bitDepth:8,colorType:6});
  assert.deepEqual(monsterSource,{width:1182,height:1330,bitDepth:8,colorType:2});
  assert.equal(SPRITE_MANIFEST.players.columns,queue.runtime.grid.columns);
  assert.equal(SPRITE_MANIFEST.players.rows,queue.runtime.grid.playerRows);
  assert.equal(SPRITE_MANIFEST.monsters.columns,queue.runtime.grid.columns);
  assert.equal(SPRITE_MANIFEST.monsters.rows,queue.runtime.grid.monsterRows);
});

test('all six player classes use their queued atlas rows',()=>{
  assert.equal(queue.players.length,6);
  for(const player of queue.players){
    assert.equal(player.status,'integrated');
    assert.equal(player.source,SPRITE_MANIFEST.players.image);
    assert.equal(playerSpriteRow(`C${player.id.slice(1)}`),player.row);
  }
  assert.deepEqual([...new Set(queue.players.map(player=>player.row))],[0,1,2,3,4,5]);
});

test('Act 1 encounters use the queued monster rows and compatible behaviors',()=>{
  const jobs=queue.acts.find(entry=>entry.act===1).jobs;
  const expectedBehavior=['melee','fast','rush','web','consume','shield'];
  assert.equal(jobs.length,6);

  jobs.forEach((job,index)=>{
    const profile=act1MonsterProfile(index);
    assert.deepEqual({id:profile.id,name:profile.name,row:profile.row},{id:job.id,name:job.name,row:job.row});
    assert.equal(job.status,'integrated');
    assert.equal(job.source,SPRITE_MANIFEST.monsters.image);
    assert.equal(DB.monsters[profile.dbIndex].behavior,expectedBehavior[index]);
    assert.match(profile.name,/고아/);
  });

  assert.deepEqual([...new Set(jobs.map(job=>job.row))],[0,2,3,5,4,6]);
});

test('Act 1 boss and animation columns match the queue',()=>{
  const queuedBoss=queue.bosses.find(entry=>entry.id==='B01');
  const boss=act1BossProfile();
  assert.deepEqual({id:boss.id,name:boss.name,row:boss.row},{id:queuedBoss.id,name:queuedBoss.name,row:queuedBoss.row});
  assert.equal(DB.monsters[boss.dbIndex].id,'GOA_B01');
  assert.equal(monsterSpriteRow('GOA_B01',boss.dbIndex,true),boss.row);

  for(const [state,frames] of Object.entries(queue.runtime.animations)){
    assert.deepEqual(SPRITE_MANIFEST.animations[state].frames,frames);
  }
});

test('Act 2 uses the integrated spider mother boss sprite',()=>{
  const queuedBoss=queue.bosses.find(entry=>entry.id==='B02');
  const boss=DB.monsters.find(entry=>entry.id==='GOA_B02');
  assert.equal(queuedBoss.status,'integrated');
  assert.deepEqual({name:boss.name,behavior:boss.behavior},{name:queuedBoss.name,behavior:'spiderboss'});
  assert.equal(monsterSpriteRow(boss.id,21,true),queuedBoss.row);
  assert.equal(queuedBoss.row,8);
});

test('Act 2 venom stinger uses its generated eight-frame strip',()=>{
  const queued=queue.acts.find(entry=>entry.act===2).jobs[0];
  const profile=act2MonsterProfile(4);
  assert.deepEqual({status:queued.status,source:queued.source,atlas:queued.atlas,row:queued.row},{status:'integrated',source:SPRITE_MANIFEST.act2Venom.image,atlas:'act2Venom',row:0});
  assert.deepEqual(profile,{id:'A2_001',name:'독침고아',dbIndex:4,row:0,atlas:'act2Venom'});
  assert.deepEqual(pngHeader(queued.source),{width:2176,height:724,bitDepth:8,colorType:6});
  assert.equal(SPRITE_MANIFEST.act2Venom.columns,8);
});
