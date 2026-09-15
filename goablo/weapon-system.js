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
