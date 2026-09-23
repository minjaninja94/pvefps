import {defaultWeaponIndex} from './weapon-system.js';

export function changeCharacterState(DB,player,nextClassId){
 const next=DB.characters.find(character=>character.id===nextClassId);if(!next)throw Error('Unknown character');
 const level=Math.max(1,Number(player.level)||1),specialization=next.specs[0];
 return {...player,classId:next.id,specialization,loadout:DB.skills.filter(skill=>skill.specializationId===specialization).map(skill=>skill.id),skillLevels:{},branches:{},points:3+(level-1)*3,equipment:{},weapon:defaultWeaponIndex(DB,next.id),faith:0,sin:0,souls:0,suspicion:0,combo:0,cd:{},buffs:{}};
}
