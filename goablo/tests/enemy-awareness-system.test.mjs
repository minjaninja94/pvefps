import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ENEMY_AWARENESS,canNoticePlayer,alertEnemyGroup,noticeAndAlert} from '../enemy-awareness-system.js';

const mob=(x,z,boss=false)=>({x,z,dead:false,alerted:false,def:{boss}});

test('ordinary enemies notice the player from a broad distance',()=>{
 const enemy=mob(0,0),player={x:ENEMY_AWARENESS.sightRange-1,z:0};
 assert.equal(canNoticePlayer(enemy,player),true);
 player.x=ENEMY_AWARENESS.sightRange+1;assert.equal(canNoticePlayer(enemy,player),false);
 assert.ok(ENEMY_AWARENESS.sightRange>=36);
 assert.ok(ENEMY_AWARENESS.pursuitRange>=150);
});

test('a ranged hit wakes nearby packs and relays the alarm through allies',()=>{
 const enemies=[mob(0,0),mob(18,0),mob(36,0),mob(60,0)];
 const awakened=alertEnemyGroup(enemies,enemies[0]);
 assert.deepEqual(awakened,enemies.slice(0,3));
 assert.equal(enemies[3].alerted,false);
});

test('one sighting makes the connected group attack without entering its room',()=>{
 const enemies=[mob(30,0),mob(47,0),mob(65,0)];
 const awakened=noticeAndAlert(enemies,{x:0,z:0});
 assert.equal(awakened.length,3);
 assert.ok(enemies.every(enemy=>enemy.alerted));
});

test('runtime uses awareness rather than room activation to gate attacks',()=>{
 const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
 assert.match(game,/function updateEnemyAwareness\(\)/);
 assert.match(game,/wakeEnemyPack\(e,'hit'\)/);
 assert.match(game,/if\(!e\.alerted\)return/);
 assert.doesNotMatch(game,/activeRooms\.has\(e\.roomId\)\)return/);
 assert.match(game,/ENEMY_AWARENESS\.pursuitRange/);
});
