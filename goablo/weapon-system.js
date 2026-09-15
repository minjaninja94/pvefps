export const CLASS_WEAPON_IDS=Object.freeze({
 C01:Object.freeze(['W05','W06','W07','W08','W09','W10']),
 C02:Object.freeze(['W02','W04','W08']),
 C03:Object.freeze(['W10','W13']),
 C04:Object.freeze(['W11','W12']),
 C05:Object.freeze(['W14','W15','W16']),
 C06:Object.freeze(['W01','W02','W03'])
});

const DEFAULT_WEAPON_ID=Object.freeze({C01:'W05',C02:'W04',C03:'W13',C04:'W12',C05:'W14',C06:'W01'});

const indexOfWeapon=(db,id)=>db.weapons.findIndex(weapon=>weapon.id===id);
const stableIndex=(value,size)=>{
 let hash=0;
 for(const char of String(value||''))hash=(hash*31+char.charCodeAt(0))>>>0;
 return size?hash%size:0;
};

export function defaultWeaponIndex(db,classId){
 const index=indexOfWeapon(db,DEFAULT_WEAPON_ID[classId]);
 return index>=0?index:0;
}

export function assignWeaponIdentity(db,item,classId){
 if(!item||item.slot!=='무기')return item;
 if(indexOfWeapon(db,item.weaponId)>=0)return item;
 const pool=CLASS_WEAPON_IDS[classId]||db.weapons.map(weapon=>weapon.id);
 item.weaponId=pool[stableIndex(item.uid||item.id||item.name,pool.length)];
 return item;
}

export function equippedWeaponIndex(db,player){
 const uid=player.equipment?.['무기'];
 const item=player.inventory?.find(candidate=>candidate.uid===uid);
 const index=indexOfWeapon(db,item?.weaponId);
 return index>=0?index:defaultWeaponIndex(db,player.classId);
}

export function syncEquippedWeapon(db,player){
 player.weapon=equippedWeaponIndex(db,player);
 return player.weapon;
}

export function nextClassWeaponIndex(db,classId,currentIndex){
 const pool=CLASS_WEAPON_IDS[classId]||db.weapons.map(weapon=>weapon.id);
 const currentId=db.weapons[currentIndex]?.id;
 const nextId=pool[(Math.max(-1,pool.indexOf(currentId))+1)%pool.length];
 const index=indexOfWeapon(db,nextId);
 return index>=0?index:defaultWeaponIndex(db,classId);
}

const ATTACK_PROFILES=Object.freeze({
 W01:{motion:'stab',reach:.9,radius:.55,duration:.14,tag:'MELEE'},
 W02:{motion:'slash',reach:1,radius:.8,duration:.2,tag:'MELEE'},
 W03:{motion:'chop',reach:1,radius:.75,duration:.23,tag:'BLEED',status:{bleed:4}},
 W04:{motion:'smash',reach:.9,radius:.9,duration:.28,tag:'STAGGER',status:{stagger:.45}},
 W05:{motion:'sweep',reach:1.05,radius:1.15,duration:.34,tag:'MELEE'},
 W06:{motion:'cleave',reach:1.05,radius:1,duration:.38,tag:'BLEED',status:{bleed:5}},
 W07:{motion:'slam',reach:.9,radius:1.35,duration:.44,tag:'STAGGER',status:{stagger:.8}},
 W08:{motion:'thrust',reach:1.25,radius:.55,duration:.3,tag:'MELEE'},
 W09:{motion:'long-thrust',reach:1.4,radius:.5,duration:.34,tag:'MELEE'},
 W10:{motion:'reap',reach:1.05,radius:1.25,duration:.36,tag:'MELEE'},
 W11:{motion:'cast',projectile:true,speed:22,size:.12,color:'#8bbfff',duration:.18,tag:'PROJECTILE'},
 W12:{motion:'cast-heavy',projectile:true,speed:15,size:.22,color:'#a497ff',duration:.34,tag:'PROJECTILE'},
 W13:{motion:'curse',projectile:true,speed:17,size:.18,color:'#83c8a4',duration:.28,tag:'PROJECTILE'},
 W14:{motion:'quick-shot',projectile:true,speed:24,size:.11,color:'#d8c58f',duration:.18,tag:'PROJECTILE'},
 W15:{motion:'power-shot',projectile:true,speed:30,size:.14,color:'#e8d49a',duration:.32,tag:'SNIPER'},
 W16:{motion:'crossbow-shot',projectile:true,pierce:true,speed:26,size:.18,color:'#d9b26d',duration:.38,tag:'PROJECTILE'}
});

export function basicAttackProfile(db,weaponIndex){
 const weapon=db.weapons[weaponIndex]||db.weapons[0];
 return {...ATTACK_PROFILES[weapon.id],weaponId:weapon.id,range:weapon.range};
}
