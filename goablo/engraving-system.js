export const ENGRAVING_CATALYSTS=Object.freeze([
  {id:'ifrit',name:'이프리트의 돌',tags:['FIRE'],description:'화염·연소 피해 +15%',color:'#ef6b38'},
  {id:'undine',name:'운디네의 돌',tags:['COLD'],description:'냉기·빙결 피해 +15%',color:'#7fc8df'},
  {id:'thunder',name:'뇌신의 파편',tags:['LIGHTNING'],description:'번개·연쇄 피해 +15%',color:'#d6c55c'},
  {id:'scripture',name:'신성한 성서',tags:['LIGHT','SHIELD'],description:'신성·수호 피해 +15%, 물약 회복 +3%',color:'#eadf9a'},
  {id:'blood',name:'피의 갈망 수정',tags:['BLEED','BLOOD'],description:'출혈·혈액 피해 +15%, 피해 회복 +1%',color:'#a83242'},
  {id:'abyss',name:'심연의 눈물',tags:['SHADOW','SPACE'],description:'암흑·그림자·공간 피해 +15%',color:'#7d5ca8'},
  {id:'agility',name:'민첩의 룬',tags:[],description:'공격·시전속도 +4%',color:'#65bc8a',speed:.04},
  {id:'strength',name:'힘의 각인',tags:[],description:'모든 피해 +8%',color:'#cb8150',damage:.08},
  {id:'intellect',name:'지능의 눈',tags:[],description:'치명 확률 +3%',color:'#718ed0',crit:.03}
]);

export function engravingSlots(item){
  return ['부모급'].includes(item?.rarity)?3:['전설','세트 전설','유니크'].includes(item?.rarity)?2:1;
}

export function ensureEngravingState(player){
  player.catalysts??={};for(const catalyst of ENGRAVING_CATALYSTS)player.catalysts[catalyst.id]??=0;
  player.engravingRewardAct??=0;return player.catalysts;
}

export function grantActCatalyst(player,act,random=Math.random){
  ensureEngravingState(player);if(player.engravingRewardAct>=act)return null;
  const catalyst=ENGRAVING_CATALYSTS[Math.floor(random()*ENGRAVING_CATALYSTS.length)];
  player.catalysts[catalyst.id]++;player.engravingRewardAct=act;return catalyst;
}

export function applyEngraving(player,item,catalystId,slotIndex=0){
  ensureEngravingState(player);const catalyst=ENGRAVING_CATALYSTS.find(entry=>entry.id===catalystId),slots=engravingSlots(item);
  if(!item||!catalyst||slotIndex<0||slotIndex>=slots||player.catalysts[catalystId]<1)return false;
  item.engravings=Array.from({length:slots},(_,index)=>item.engravings?.[index]||null);
  const replaced=item.engravings[slotIndex];if(replaced)player.catalysts[replaced]=(player.catalysts[replaced]||0)+1;
  player.catalysts[catalystId]--;item.engravings[slotIndex]=catalystId;return true;
}

export function engravingBonuses(items){
  const result={damage:0,speed:0,crit:0,potion:0,leech:0,tags:{}};
  for(const item of items||[])for(const id of item.engravings||[]){const catalyst=ENGRAVING_CATALYSTS.find(entry=>entry.id===id);if(!catalyst)continue;
    result.damage+=catalyst.damage||0;result.speed+=catalyst.speed||0;result.crit+=catalyst.crit||0;
    if(id==='scripture')result.potion+=.03;if(id==='blood')result.leech+=.01;
    for(const tag of catalyst.tags)result.tags[tag]=(result.tags[tag]||0)+.15;
  }
  return result;
}
