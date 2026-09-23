export const CREATURE_VOICE_BANKS=Object.freeze({
 notice:['../walker-alert.wav','../lizard-alert.wav','../heavy-alert.wav','../soldier-alert.wav','../scout-alert.wav'],
 attack:['../walker-attack.wav','../lizard-attack.wav','../heavy-attack.wav','../soldier-attack.wav','../scout-attack.wav'],
 hit:['../lizard-attack.wav','../walker-attack.wav','../heavy-attack.wav'],
 death:['../walker-death.wav','../lizard-death.wav','../heavy-death.wav','../soldier-death.wav','../scout-death.wav'],
 bossNotice:['../boss-alert.wav'],
 bossAttack:['../boss-attack.wav','../boss-blades.wav','../boss-sweep.wav'],
 bossSpecial:['../boss-burst.wav','../boss-missiles.wav','../boss-laser.wav'],
 bossDeath:['../boss-death.wav'],
 playerHit:['../soldier-death.wav','../scout-death.wav']
});

export const CREATURE_VOICE_FILES=Object.freeze([...new Set(Object.values(CREATURE_VOICE_BANKS).flat())]);

export function voiceBank(event,boss=false){
 const key=boss?({notice:'bossNotice',attack:'bossAttack',special:'bossSpecial',death:'bossDeath'}[event]||'bossAttack'):event;
 return CREATURE_VOICE_BANKS[key]||CREATURE_VOICE_BANKS.attack;
}

export function voiceCooldown(event,boss=false){
 if(event==='death')return 0;
 if(event==='notice'||event==='special')return boss?2.8:2.1;
 if(event==='hit')return boss?2.4:1.7;
 return boss?1.7:1.25;
}
