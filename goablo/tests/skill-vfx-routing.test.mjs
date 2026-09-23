import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DB} from '../data/database.js';
import {skillVfxRoute,SKILL_VFX_LIMITS} from '../skill-vfx-system.js';

test('only ground-targeted skills place the common effect at the cursor',()=>{
 for(const mode of ['meteor','rain','trap','gravity','judgment','blizzard'])assert.equal(skillVfxRoute(mode),'target',mode);
 for(const mode of ['cleave','slam','flurry','shieldbash'])assert.equal(skillVfxRoute(mode),'melee',mode);
 for(const mode of ['projectile','fireball','wave','chain','snipe'])assert.equal(skillVfxRoute(mode),'projectile',mode);
 for(const mode of ['dash','teleport','evade'])assert.equal(skillVfxRoute(mode),'none',mode);
});

test('every database skill resolves a bounded VFX route',()=>{
 const valid=new Set(['target','projectile','melee','none','self']);
 for(const skill of DB.skills)assert.ok(valid.has(skillVfxRoute(skill.mode)),`${skill.id}:${skill.mode}`);
 assert.ok(SKILL_VFX_LIMITS.dynamicLights<SKILL_VFX_LIMITS.transientEffects);
 assert.ok(SKILL_VFX_LIMITS.projectileLights<=16);
});

test('runtime avoids duplicate cursor decals and caps expensive lights',()=>{
 const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8'),start=game.indexOf('function skillCastVfx('),end=game.indexOf('function impactSprite('),vfx=game.slice(start,end);
 assert.match(vfx,/route==='target'/);assert.match(vfx,/route==='projectile'/);assert.match(vfx,/route==='melee'/);
 assert.equal((vfx.match(/createAtlasGround/g)||[]).length,1);
 assert.match(game,/SKILL_VFX_LIMITS\.dynamicLights/);assert.match(game,/SKILL_VFX_LIMITS\.projectileLights/);
});
