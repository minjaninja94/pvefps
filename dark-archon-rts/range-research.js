/* Brood War "사업" research. No unit damage, HP or cooldown changes.
 * The shared attackRange() is used by AI, attack checks, target leash and HUD circles.
 */
(() => {
 'use strict';
 const RESEARCH=Object.freeze({
  marine:Object.freeze({name:'U-238 탄환',base:4,upgraded:5,bonus:1,kind:'both'}),
  hydra:Object.freeze({name:'가시지느러미',base:4,upgraded:5,bonus:1,kind:'both'}),
  dragoon:Object.freeze({name:'싱귤래리티 차지',base:4,upgraded:6,bonus:2,kind:'both'}),
  goliath:Object.freeze({name:'카론 부스터',base:5,upgraded:8,bonus:3,kind:'air'})
 });
 const enemyResearchWaves=Object.freeze({marine:21,hydra:31,dragoon:41,goliath:51});
 const researched={friendly:Object.create(null),enemy:Object.create(null)};
 for(const side of ['friendly','enemy'])
  for(const name of Object.keys(RESEARCH))researched[side][name]=false;

 const previousAttackRange=attackRange,previousDrawUnit=drawUnit;
 const sideOf=u=>u&&u.enemy?'enemy':'friendly';
 const isAir=target=>!!target&&!target.core&&!!TYPES[target.type]?.flying;
 const hasResearch=u=>!!u&&!!RESEARCH[u.type]&&!!researched[sideOf(u)][u.type];
 function activeFor(u,target){
  if(!hasResearch(u))return false;
  return RESEARCH[u.type].kind!=='air'||isAir(target);
 }
 attackRange=function(u,target=null){
  const base=previousAttackRange(u,target);
  if(!activeFor(u,target))return base;
  return base+RESEARCH[u.type].bonus*RANGE_PX_PER_TILE;
 };
 drawUnit=function(u){
  previousDrawUnit(u);
  if(u.hp<=0||!hasResearch(u))return;
  // The research is visible on both captured units and researched enemy waves.
  const d=TYPES[u.type];
  ctx.save();
  ctx.textAlign='center';ctx.font='bold 11px sans-serif';
  ctx.shadowColor=u.enemy?'#ff7550':'#5debc5';ctx.shadowBlur=6;
  ctx.fillStyle=u.enemy?'#ffc4a1':'#92ffe0';
  ctx.fillText(u.type==='goliath'?'↑ 대공 사업':'↑ 사업',u.x,u.y-d.r-64);
  ctx.restore();
 };
 const api={
  definitions:RESEARCH,
  isResearched:(side,type)=>!!researched[side]?.[type],
  isActiveFor:(u,target)=>activeFor(u,target),
  setFriendly(type,enabled){
   if(!(type in RESEARCH))return false;
   researched.friendly[type]=!!enabled;return true;
  },
  setEnemyWave(wave){
   for(const [unit,first] of Object.entries(enemyResearchWaves))
    researched.enemy[unit]=Number(wave)>=first;
  },
  reset(){
   for(const side of ['friendly','enemy'])
    for(const unit of Object.keys(RESEARCH))researched[side][unit]=false;
  },
  snapshot(){
   return {friendly:{...researched.friendly},enemy:{...researched.enemy}};
  }
 };
 window.DarkArchonRangeUpgrades=Object.freeze(api);
})();
