const asset=(family,event)=>`assets/audio/creatures/${family}-${event}.wav`;
const familyBank=family=>({notice:[asset(family,'alert')],attack:[asset(family,'attack')],hit:[asset(family,'attack')],special:[asset(family,'alert'),asset(family,'attack')],death:[asset(family,'death')]});
export const CREATURE_FAMILIES=Object.freeze(['zombie','ghoul','insect','angel','human']);
export const CREATURE_VOICE_BANKS=Object.freeze(Object.fromEntries(CREATURE_FAMILIES.map(family=>[family,Object.freeze(familyBank(family))])));
export const CREATURE_VOICE_FILES=Object.freeze([...new Set(Object.values(CREATURE_VOICE_BANKS).flatMap(bank=>Object.values(bank).flat()))]);

export function creatureFamily(def={}){
 const signature=`${def.name||''} ${def.category||''} ${def.behavior||''}`.toLowerCase();
 if(/천사|angel/.test(signature))return 'angel';
 if(/거미|독침|벌레|박쥐|spider|centipede|web|poison|bat/.test(signature))return 'insect';
 if(/구울|흡혈|ghoul|vampire|demon|악마/.test(signature))return 'ghoul';
 if(/좀비|해골|언데드|zombie|skeleton|plague|revive/.test(signature))return 'zombie';
 return 'human';
}

export function voiceBank(event,family='zombie'){
 const bank=CREATURE_VOICE_BANKS[family]||CREATURE_VOICE_BANKS.zombie;
 return bank[event]||bank.attack;
}

export function voiceCooldown(event,boss=false){
 if(event==='death')return 0;
 if(event==='notice'||event==='special')return boss?2.8:2.1;
 if(event==='hit')return boss?2.4:1.7;
 return boss?1.7:1.25;
}
