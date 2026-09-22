export function finalBossPhase(hp,maxHp){
  const ratio=Math.max(0,Math.min(1,hp/Math.max(1,maxHp)));
  return Math.min(4,1+Math.floor((1-ratio)*4));
}

export function finalBossDamageMultiplier({phaseShield=0,vulnerableUntil=0},clock){
  if(phaseShield>0)return 0;
  return vulnerableUntil>clock?1.75:.3;
}

export function finalBossWindowDuration(phase){return 3.2+Math.max(1,Math.min(4,phase))*.45;}

export function finalBossArenaPattern(phase){
  const patterns={
    1:[[-18,-18,4], [18,-18,4],[-18,18,4],[18,18,4]],
    2:[[0,-18,4],[-18,0,4],[18,0,4],[0,18,4]],
    3:[[-11,-11,3.5],[11,-11,3.5],[-11,11,3.5],[11,11,3.5],[0,0,3]],
    4:[[0,-20,4],[-14,-14,4],[-20,0,4],[-14,14,4],[0,20,4],[14,14,4],[20,0,4],[14,-14,4]]
  };
  return patterns[Math.max(1,Math.min(4,phase))].map(([x,z,r])=>({x,z,r}));
}
