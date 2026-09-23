import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SKILL_AFFIX_DEFINITIONS,rollSkillAffixes,skillAffixBonuses,skillAffixLines} from '../skill-affix-system.js';

const skills=[{id:'S01',name:'불꽃 베기'},{id:'S02',name:'연쇄 번개'}];
const sequence=(...values)=>{let index=0;return()=>values[index++%values.length];};

test('skill specializations begin at legendary and higher tiers roll more options',()=>{
 const rare=rollSkillAffixes({rarity:'희귀'},skills,()=>0);
 assert.equal(rare.skillAffixes,undefined);
 const legendary=rollSkillAffixes({rarity:'전설'},skills,()=>.99);
 const unique=rollSkillAffixes({rarity:'유니크'},skills,()=>.99);
 const parent=rollSkillAffixes({rarity:'부모급'},skills,()=>.99);
 assert.equal(legendary.skillAffixes.length,1);
 assert.equal(unique.skillAffixes.length,2);
 assert.equal(parent.skillAffixes.length,3);
});

test('rolls target a current-class skill with unique weighted affix types and valid values',()=>{
 const item=rollSkillAffixes({rarity:'부모급',skillId:'OTHER'},skills,sequence(.8,.1,.2,.3,.4,.5,.6,.7,.8));
 assert.ok(skills.some(skill=>skill.id===item.skillId));
 assert.equal(new Set(item.skillAffixes.map(affix=>affix.type)).size,item.skillAffixes.length);
 for(const affix of item.skillAffixes){
  const definition=SKILL_AFFIX_DEFINITIONS.find(entry=>entry.type===affix.type);
  assert.ok(definition);
  assert.ok(affix.value>=definition.min&&affix.value<=definition.max);
 }
});

test('equipped affixes stack only for their skill and respect combat caps',()=>{
 const items=[
  {skillId:'S01',skillAffixes:[{type:'damage',value:30},{type:'cooldown',value:40},{type:'area',value:55},{type:'dot',value:45}]},
  {skillId:'S01',skillAffixes:[{type:'cooldown',value:30},{type:'area',value:40},{type:'dot',value:50},{type:'resource',value:80},{type:'attackSpeed',value:70}]},
  {skillId:'S02',skillAffixes:[{type:'damage',value:99}]}
 ];
 assert.deepEqual(skillAffixBonuses(items,'S01'),{damage:.3,cooldownReduction:.55,attackSpeed:.6,area:.8,dotDamage:.8,resourceReduction:.5});
 assert.equal(skillAffixBonuses(items,'S02').damage,.99);
 assert.match(skillAffixLines(items[0],skills)[0],/불꽃 베기/);
});

test('runtime removes manual branches and applies every item specialization in combat',()=>{
 const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
 assert.doesNotMatch(game,/data-branch/);
 assert.doesNotMatch(game,/p\.branches\[s\.id\]/);
 assert.match(game,/rollSkillAffixes\(item,charSkills\(\)\)/);
 assert.match(game,/cooldownReduction/);
 assert.match(game,/attackSpeed/);
 assert.match(game,/resourceReduction/);
 assert.match(game,/skillAffix\.area/);
 assert.match(game,/skillAffix\?\.dotDamage/);
});
