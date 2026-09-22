export const ABYSS_CAMPAIGN_ACT=12;
export const ABYSS_RANKING_KEY='goablo-abyss-ranking-v1';

export function ensureAbyssState(player){
  player.abyssUnlocked??=false;
  player.abyssTier=Math.max(1,Number(player.abyssTier)||1);
  player.abyssBestTier=Math.max(0,Number(player.abyssBestTier)||0);
  player.abyssBestTime=Number.isFinite(player.abyssBestTime)?player.abyssBestTime:null;
  player.nickname=(player.nickname||'이름없는고아').slice(0,12);
  return player;
}

export function abyssDifficulty(tier){
  const level=Math.max(1,Number(tier)||1);
  return {health:1+(level-1)*.24,damage:1+(level-1)*.12,eliteChance:Math.min(.65,.08+level*.035),loot:1+(level-1)*.08};
}

export function formatClearTime(seconds){
  const total=Math.max(0,Math.floor(Number(seconds)||0));
  const minutes=Math.floor(total/60),rest=total%60;
  return `${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`;
}

export function makeAbyssRecord(player,tier,seconds,date=new Date()){
  return {nickname:(player.nickname||'이름없는고아').slice(0,12),classId:player.classId,specialization:player.specialization,tier:Math.max(1,Math.floor(tier)),time:Math.max(0,Number(seconds)||0),date:date.toISOString().slice(0,10),build:{equipment:Object.values(player.equipment||{}).filter(Boolean),skills:[...(player.loadout||[])]}};
}

export function rankAbyssRecords(records,limit=50){
  const best=new Map();
  for(const record of records||[]){if(!record?.nickname||!Number.isFinite(record.tier)||!Number.isFinite(record.time))continue;const key=`${record.nickname}\0${record.classId||''}\0${record.specialization||''}`,previous=best.get(key);if(!previous||record.tier>previous.tier||(record.tier===previous.tier&&record.time<previous.time))best.set(key,record);}
  return [...best.values()].sort((a,b)=>b.tier-a.tier||a.time-b.time||String(a.date).localeCompare(String(b.date))).slice(0,limit);
}

export function completeAbyss(player,tier,seconds){
  ensureAbyssState(player);const cleared=Math.max(1,Math.floor(tier));
  if(cleared>player.abyssBestTier||(cleared===player.abyssBestTier&&(player.abyssBestTime===null||seconds<player.abyssBestTime))){player.abyssBestTier=cleared;player.abyssBestTime=seconds;}
  player.abyssTier=Math.max(player.abyssTier,cleared+1);
  return makeAbyssRecord(player,cleared,seconds);
}
