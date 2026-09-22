import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeonLayout,createAbyssLayout,roomById,roomAt,roomInteriorAt,corridorRects,isWalkable,closestWalkable,farthestRoom,explorationSpawnRooms} from '../dungeon-layout.js';
import fs from 'node:fs';

test('dungeon branches and keeps boss farthest from start',()=>{
  const layout=createDungeonLayout(3,2);
  assert.equal(roomById(layout,'start').depth,0);assert.equal(farthestRoom(layout).type,'boss');
  assert.ok(layout.connections.some(([a,b])=>a==='gate'&&b==='west'));
  assert.ok(layout.connections.some(([a,b])=>a==='gate'&&b==='east'));
  assert.ok(layout.connections.length>=layout.rooms.length+4);
  assert.ok(layout.connections.some(([a,b])=>a==='deepWest'&&b==='deepEast'));
});

test('rooms and corridors form walkable exploration space',()=>{
  const layout=createDungeonLayout(4,1);
  assert.ok(layout.rooms.every(room=>room.w>=17&&room.h>=13));
  assert.ok(layout.corridorWidth>=8);assert.ok(corridorRects(layout).length>=layout.connections.length);
  assert.equal(isWalkable(layout,0,33),true);assert.equal(isWalkable(layout,0,25),true);
  assert.equal(isWalkable(layout,50,50),false);
});

test('room discovery and combat activation use different cave thresholds',()=>{
  const layout=createDungeonLayout(1,1),start=roomById(layout,'start'),edgeX=start.x+start.w/2-.4;
  assert.equal(roomAt(layout,edgeX,start.z,.6)?.id,'start');
  assert.equal(roomInteriorAt(layout,edgeX,start.z,1.8),null);
  assert.equal(roomInteriorAt(layout,start.x,start.z,1.8)?.id,'start');
  const snapped=closestWalkable(layout,100,100);assert.equal(isWalkable(layout,snapped.x,snapped.z),true);
});

test('normal spawns avoid entrance, reward and boss rooms',()=>{
  const rooms=explorationSpawnRooms(createDungeonLayout(2,1));
  assert.ok(rooms.length>=4);assert.ok(rooms.every(room=>!['start','reward','boss'].includes(room.type)));
});

test('abyss layout stays open and grows in fixed bands',()=>{const low=createAbyssLayout(1,1),high=createAbyssLayout(31,1);assert.equal(low.mode,'abyss');assert.ok(low.connections.length>createDungeonLayout(1,1).connections.length);assert.ok(high.rooms.find(r=>r.id==='cross').w>low.rooms.find(r=>r.id==='cross').w);assert.ok(high.corridorWidth>=9);});

test('runtime renders discovery map and gates dormant rooms',()=>{
  const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
  assert.match(game,/renderDungeonLayout/);assert.match(game,/updateExploration/);
  assert.match(game,/roomInteriorAt\(dungeonLayout,hero\.position\.x,hero\.position\.z,1\.8\)/);
  assert.match(game,/dungeonLayout\.activeRooms\.has\(e\.roomId\)/);
  assert.match(game,/isWalkable\(dungeonLayout,desiredPosition\.x,desiredPosition\.z\)/);
  assert.match(game,/closestWalkable\(dungeonLayout,bounded\.x,bounded\.z\)/);
  assert.match(game,/if\(exitRoom\)makeFloorReady\(false\)/);
  assert.match(game,/floor===3&&e\.def\.boss/);
  assert.doesNotMatch(game,/if\(!enemies\.some\(x=>!x\.dead\)\)/);
});
