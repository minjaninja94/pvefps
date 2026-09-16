export const POTION_LEVELS=Object.freeze([{heal:.25,cooldown:10,cost:0},{heal:.28,cooldown:9,cost:150},{heal:.32,cooldown:8,cost:350},{heal:.36,cooldown:7,cost:700},{heal:.4,cooldown:6,cost:1200},{heal:.45,cooldown:5,cost:2000}]);
export function potionIndex(value){return Number.isFinite(value)?Math.max(0,Math.min(5,Math.floor(value))):0;}
export function upgradePotion(player){
  const current=potionIndex(player.potionLevel),next=POTION_LEVELS[current+1];
  if(!next||player.gold<next.cost)return false;
  player.gold-=next.cost;player.potionLevel=current+1;return true;
}
export const MERCHANT_SLOTS=['무기','보조무기','투구','갑옷','장갑','바지','신발','목걸이','반지'];
export function gambleItem(db,slot,level,act,random=Math.random){
  if(!MERCHANT_SLOTS.includes(slot))throw new Error('Invalid equipment slot');
  const roll=random(),rarity=roll<.01?'유니크':roll<.1?'전설':'희귀';
  const pool=db.items.filter(item=>item.slot===slot&&item.rarity===rarity);
  const item=pool.length?{...pool[Math.floor(random()*pool.length)]}:{id:'merchant',name:'상인의 '+slot,slot,rarity:'희귀',power:12,description:'공격력 증가 · 방어 보조',effect:'기본'};
  return {...item,level,power:(item.power||12)+Math.floor(act*1.5)};
}
