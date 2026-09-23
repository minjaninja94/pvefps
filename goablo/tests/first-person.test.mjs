import test from 'node:test';
import assert from 'node:assert/strict';
import {viewMovement,aimDistance} from '../first-person.js';
test('first person movement follows yaw without diagonal speed boost',()=>{
 assert.deepEqual(viewMovement(0,1,0),{x:0,z:-1});
 const side=viewMovement(0,1,Math.PI/2);assert.ok(Math.abs(side.x+1)<1e-8);
 const diagonal=viewMovement(1,1,0);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-1)<1e-8);
});
test('ground aim stays bounded when looking at the horizon or sky',()=>{
 for(const pitch of [-1.15,-.1,0,1])assert.ok(aimDistance(pitch)>=2&&aimDistance(pitch)<=24);
});
