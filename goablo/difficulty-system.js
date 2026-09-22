export function automaticDifficulty(depth){
  const level=Math.max(1,Math.floor(Number(depth)||1));
  if(level<5)return {id:'normal',name:'일반',health:1+(level-1)*.12,damage:1+(level-1)*.07,speed:1+(level-1)*.01,loot:1};
  if(level<13)return {id:'nightmare',name:'악몽',health:1.55+(level-5)*.16,damage:1.32+(level-5)*.09,speed:1.06+(level-5)*.012,loot:1.15+(level-5)*.025};
  return {id:'hell',name:'지옥',health:2.8+(level-13)*.2,damage:2+(level-13)*.1,speed:1.18+Math.min(.28,(level-13)*.012),loot:1.4+Math.min(.8,(level-13)*.035)};
}
