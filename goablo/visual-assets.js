export const ENVIRONMENT_COLUMNS=Object.freeze({floor:0,floorAlt:1,wall:2,gate:3,landmark:4,clutter:5,trap:6,reward:7});

export function environmentCell(act,kind='floor'){
  return {row:Math.max(0,Math.min(4,(act||1)-1)),column:ENVIRONMENT_COLUMNS[kind]??0};
}

const FRIENDLY_PROJECTILES=Object.freeze({
  PROJECTILE:[0,0],SNIPER:[0,1],WEAPON:[0,4],MELEE:[0,5],STAGGER:[0,5],SHIELD:[0,6],
  W11:[1,2],W12:[1,3],W13:[1,6],W14:[0,0],W15:[0,1],W16:[0,2],
  FIRE:[1,0],COLD:[1,1],LIGHTNING:[1,2],SPACE:[1,3],SHADOW:[1,4],STEALTH:[0,3],
  BLOOD:[1,5],SUMMON:[2,4],SPIRIT:[1,7],LIGHT:[2,0],JUDGMENT:[2,1],POISON:[2,7]
});
const FRIENDLY_IMPACTS=Object.freeze({
  PROJECTILE:1,SNIPER:1,WEAPON:0,MELEE:0,STAGGER:0,SHIELD:5,FIRE:2,COLD:3,LIGHTNING:4,
  W11:4,W12:6,W13:7,W14:1,W15:1,W16:1,
  SPACE:6,SHADOW:6,STEALTH:6,BLOOD:6,SUMMON:7,SPIRIT:7,LIGHT:5,JUDGMENT:5,POISON:7
});

export function friendlyVfxCell(tag='PROJECTILE',impact=false){
  const key=String(tag||'PROJECTILE').toUpperCase();
  if(impact)return {row:3,column:FRIENDLY_IMPACTS[key]??0};
  const [row,column]=FRIENDLY_PROJECTILES[key]||FRIENDLY_PROJECTILES.PROJECTILE;
  return {row,column};
}

const ENEMY_PROJECTILES=Object.freeze({
  ranged:[0,0],poison:[0,2],web:[0,3],hook:[0,4],blade:[0,5],explode:[0,6],rush:[0,7],
  fire:[1,0],cold:[1,1],lightning:[1,2],acid:[1,3],angel:[1,4],magic:[1,5],blood:[1,6],abyss:[1,7],
  plagueboss:[2,0],spiderboss:[2,1],centipedeboss:[2,2],fallenangelboss:[2,3],temptressboss:[2,4],
  dullahanboss:[2,5],collectorboss:[2,6],demonlordboss:[2,7],bladelordboss:[0,5],bonekingboss:[0,1],orphankingboss:[1,7]
});
const ENEMY_IMPACTS=Object.freeze({
  ranged:0,bone:0,poison:1,acid:1,web:2,fire:3,cold:4,lightning:5,blood:6,abyss:7,magic:7,
  plagueboss:1,spiderboss:2,centipedeboss:1,fallenangelboss:5,temptressboss:6,dullahanboss:3,
  bladelordboss:0,collectorboss:6,demonlordboss:3,bonekingboss:0,orphankingboss:7
});

export function enemyVfxCell(kind='ranged',impact=false){
  const key=String(kind||'ranged').toLowerCase();
  if(impact)return {row:3,column:ENEMY_IMPACTS[key]??0};
  const [row,column]=ENEMY_PROJECTILES[key]||ENEMY_PROJECTILES.ranged;
  return {row,column};
}

export const SUMMON_ROWS=Object.freeze({
  skeleton:0,archer:1,mage:2,knight:3,hire0:4,hire1:3,hire2:1,hire3:5,shadow:6,zombie:7
});

export function summonSpriteRow(kind){return SUMMON_ROWS[kind]??0;}

const ZONE_CELLS=Object.freeze({
  FIRE:[0,0],POISON:[0,1],WEB:[0,2],COLD:[0,3],LIGHTNING:[0,4],HEAL:[0,5],LIGHT:[0,5],BLOOD:[0,6],GRAVITY:[0,7],SPACE:[0,7],SHADOW:[0,7],
  TRAP:[1,0],BLADE:[1,1],TENTACLE:[1,2],PLAGUE:[1,3],FLESH:[1,4],METEOR:[1,5],ARROWSTORM:[1,6],MAGIC:[1,7],CHARM:[0,6],KINGARENA:[0,7],EXPLOSION:[1,4]
});
const AREA_CELLS=Object.freeze({
  MELEE:[2,0],WEAPON:[2,1],SHIELD:[2,2],STAGGER:[2,3],COLD:[2,4],LIGHTNING:[2,5],BLOOD:[2,6],SPACE:[2,7],SHADOW:[2,7],STEALTH:[2,7],
  FIRE:[3,0],POISON:[3,1],WEB:[3,2],LIGHT:[3,3],JUDGMENT:[3,3],SUMMON:[3,4],SPIRIT:[3,4],FLESH:[3,5],ABYSS:[3,6],KING:[3,7],PROJECTILE:[2,0],SNIPER:[2,0]
});

function mappedCell(map,key,fallback){const cell=map[String(key||'').toUpperCase()]||fallback;return {row:cell[0],column:cell[1]};}
export function zoneVfxCell(tag='magic'){return mappedCell(ZONE_CELLS,tag,ZONE_CELLS.MAGIC);}
export function areaVfxCell(tag='MELEE'){return mappedCell(AREA_CELLS,tag,AREA_CELLS.MELEE);}
