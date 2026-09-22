import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {automaticDifficulty} from '../difficulty-system.js';

test('difficulty automatically advances from normal to nightmare to hell',()=>{
  assert.equal(automaticDifficulty(1).name,'일반');
  assert.equal(automaticDifficulty(4).name,'일반');
  assert.equal(automaticDifficulty(5).name,'악몽');
  assert.equal(automaticDifficulty(12).name,'악몽');
  assert.equal(automaticDifficulty(13).name,'지옥');
});

test('each deeper floor materially raises enemy pressure',()=>{
  for(let depth=2;depth<=30;depth++){
    const before=automaticDifficulty(depth-1),now=automaticDifficulty(depth);
    assert.ok(now.health>before.health,`health at ${depth}`);
    assert.ok(now.damage>before.damage,`damage at ${depth}`);
    assert.ok(now.speed>=before.speed,`speed at ${depth}`);
  }
});

test('every skill cast consumes the generated effect atlases',()=>{
  const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
  assert.match(game,/skillCastVfx\(s,x,z,tx,tz\)/);
  assert.match(game,/atlas:'friendlyVfx'/);
  assert.match(game,/atlas:'areaVfx'/);
  assert.doesNotMatch(game,/id="difficultySetting"/);
});
