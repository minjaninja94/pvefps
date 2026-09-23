export const SKILL_AFFIX_DEFINITIONS=Object.freeze([
  Object.freeze({type:'damage',label:'피해',min:15,max:40,weight:26}),
  Object.freeze({type:'cooldown',label:'재사용 대기시간 감소',min:8,max:22,weight:18}),
  Object.freeze({type:'attackSpeed',label:'공격·시전 속도',min:8,max:20,weight:16}),
  Object.freeze({type:'area',label:'공격 범위',min:10,max:30,weight:14}),
  Object.freeze({type:'dot',label:'4초 지속 피해',min:18,max:45,weight:14}),
  Object.freeze({type:'resource',label:'자원 소모 감소',min:8,max:22,weight:12})
]);

const RARITY_ROLLS=Object.freeze({전설:{base:1,bonus:.25},유니크:{base:2,bonus:.35},부모급:{base:3,bonus:.3}});
const limit=(value,min,max)=>Math.max(min,Math.min(max,value));
const randomValue=random=>limit(Number(random())||0,0,.999999999);

function weightedPick(pool,random){
  let roll=randomValue(random)*pool.reduce((sum,entry)=>sum+entry.weight,0);
  for(const entry of pool){roll-=entry.weight;if(roll<0)return entry;}
  return pool.at(-1);
}

export function rollSkillAffixes(item,skills,random=Math.random){
  const rarity=RARITY_ROLLS[item?.rarity];
  if(!rarity||!Array.isArray(skills)||!skills.length)return {...item};
  const existing=skills.find(skill=>skill.id===item.skillId),skill=existing||skills[Math.floor(randomValue(random)*skills.length)];
  const count=Math.min(SKILL_AFFIX_DEFINITIONS.length,rarity.base+(randomValue(random)<rarity.bonus?1:0));
  const available=[...SKILL_AFFIX_DEFINITIONS],skillAffixes=[];
  while(skillAffixes.length<count){
    const definition=weightedPick(available,random),index=available.indexOf(definition);
    available.splice(index,1);
    const value=Math.round(definition.min+randomValue(random)*(definition.max-definition.min));
    skillAffixes.push({type:definition.type,value});
  }
  return {...item,skillId:skill.id,skillAffixes};
}

export function skillAffixBonuses(items,skillId){
  const totals={damage:0,cooldownReduction:0,attackSpeed:0,area:0,dotDamage:0,resourceReduction:0};
  const keys={damage:'damage',cooldown:'cooldownReduction',attackSpeed:'attackSpeed',area:'area',dot:'dotDamage',resource:'resourceReduction'};
  for(const item of items||[])if(item?.skillId===skillId)for(const affix of item.skillAffixes||[]){
    const key=keys[affix.type];if(key)totals[key]+=Math.max(0,Number(affix.value)||0)/100;
  }
  totals.cooldownReduction=Math.min(.55,totals.cooldownReduction);
  totals.attackSpeed=Math.min(.6,totals.attackSpeed);
  totals.area=Math.min(.8,totals.area);
  totals.dotDamage=Math.min(.8,totals.dotDamage);
  totals.resourceReduction=Math.min(.5,totals.resourceReduction);
  return totals;
}

export function skillAffixLines(item,skills){
  const affixes=Array.isArray(item?.skillAffixes)?item.skillAffixes:[];
  if(!affixes.length)return [];
  const skillName=skills?.find(skill=>skill.id===item.skillId)?.name||'지정 스킬';
  return affixes.map(affix=>{
    const definition=SKILL_AFFIX_DEFINITIONS.find(entry=>entry.type===affix.type);
    return `${skillName} · ${definition?.label||affix.type} +${Math.round(affix.value)}%`;
  });
}
