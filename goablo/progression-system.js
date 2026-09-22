export const ELEMENT_TAGS=['FIRE','COLD','LIGHTNING','POISON','LIGHT','SHADOW','BLOOD','SPACE'];
export const NAMED_AFFIXES=[
  {id:'ice',mark:'冰',name:'서리',element:'COLD'},
  {id:'leech',mark:'吸',name:'흡혈',element:'BLOOD'},
  {id:'swift',mark:'迅',name:'신속',element:'LIGHTNING'},
  {id:'plague',mark:'疫',name:'역병',element:'POISON'},
  {id:'flame',mark:'炎',name:'화염',element:'FIRE'}
];

export function campaignDepth(act,floor){return (Math.max(1,act)-1)*3+Math.max(1,floor);}
export function progressionDepth({act=1,floor=1,abyssMode=false,abyssTier=1}={}){return abyssMode?Math.max(1,abyssTier):campaignDepth(act,floor);}
export function usesMixedRoster(depth){return depth>=5;}
export function namedChance(depth){return depth<6?0:Math.min(.34,.08+(depth-6)*.018);}
export function canHaveImmunity(depth){return depth>=25;}

export function namedTraits(depth,random=Math.random){
  if(depth<6)return null;
  const affix=NAMED_AFFIXES[Math.floor(random()*NAMED_AFFIXES.length)%NAMED_AFFIXES.length];
  const immune=canHaveImmunity(depth)&&random()<Math.min(.28,.08+(depth-25)*.012);
  return {affix,resistance:affix.element,immunity:immune?affix.element:null};
}

export function elementalDamageMultiplier(traits,tag){
  if(!traits||!ELEMENT_TAGS.includes(tag))return 1;
  if(traits.immunity===tag)return 0;
  if(traits.resistance===tag)return .6;
  return 1;
}
