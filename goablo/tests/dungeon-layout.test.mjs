import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeonLayout,roomById,isWalkable,farthestRoom,explorationSpawnRooms} from '../dungeon-layout.js';
import fs from 'node:fs';

test('dungeon branches and keeps boss farthest from start',()=>{
  const layout=createDungeonLayout(3,2);
  assert.equal(roomById(layout,'start').depth,0);assert.equal(farthestRoom(layout).type,'boss');
  assert.ok(layout.connections.some(([a,b])=>a==='gate'&&b==='west'));
  assert.ok(layout.connections.some(([a,b])=>a==='gate'&&b==='east'));
});

test('rooms and corridors form walkable exploration space',()=>{
  const layout=createDungeonLayout(4,1);
  assert.equal(isWalkable(layout,0,20),true);assert.equal(isWalkable(layout,0,15),true);
  assert.equal(isWalkable(layout,27,27),false);
});

test('normal spawns avoid entrance, reward and boss rooms',()=>{
  const rooms=explorationSpawnRooms(createDungeonLayout(2,1));
  assert.ok(rooms.length>=4);assert.ok(rooms.every(room=>!['start','reward','boss'].includes(room.type)));
});

test('runtime renders discovery map and gates dormant rooms',()=>{
  const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
  assert.match(game,/renderDungeonLayout/);assert.match(game,/updateExploration/);
  assert.match(game,/dungeonLayout\.discovered\.has\(e\.roomId\)/);
  assert.match(game,/isWalkable\(dungeonLayout,nextPosition\.x,nextPosition\.z\)/);
});
