export const ENEMY_AWARENESS=Object.freeze({
  sightRange:36,
  bossSightRange:48,
  hitAlarmRange:24,
  allyAlarmRange:20,
  pursuitRange:160
});

const gap=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.z||0)-(b?.z||0));

export function canNoticePlayer(enemy,player,{stealthed=false}={}){
  if(!enemy||enemy.dead||!player||stealthed&&!enemy.def?.boss)return false;
  return gap(enemy,player)<=(enemy.def?.boss?ENEMY_AWARENESS.bossSightRange:ENEMY_AWARENESS.sightRange);
}

export function alertEnemyGroup(enemies,origin,{initialRange=ENEMY_AWARENESS.hitAlarmRange,relayRange=ENEMY_AWARENESS.allyAlarmRange}={}){
  if(!origin)return [];
  const living=(enemies||[]).filter(enemy=>enemy&&!enemy.dead),queue=living.filter(enemy=>enemy===origin||gap(enemy,origin)<=initialRange),newlyAlerted=[];
  const visited=new Set();
  while(queue.length){
    const enemy=queue.shift();if(visited.has(enemy))continue;visited.add(enemy);
    if(!enemy.alerted){enemy.alerted=true;newlyAlerted.push(enemy);}
    for(const ally of living)if(!visited.has(ally)&&gap(enemy,ally)<=relayRange)queue.push(ally);
  }
  return newlyAlerted;
}

export function noticeAndAlert(enemies,player,{stealthed=false}={}){
  const awakened=[];
  for(const enemy of enemies||[]){
    if(enemy.dead||enemy.alerted||!canNoticePlayer(enemy,player,{stealthed}))continue;
    awakened.push(...alertEnemyGroup(enemies,enemy,{initialRange:ENEMY_AWARENESS.allyAlarmRange}));
  }
  return [...new Set(awakened)];
}
