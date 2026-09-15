import test from 'node:test';
import assert from 'node:assert/strict';
import {DB} from '../data/database.js';
import {CLASS_WEAPON_IDS,assignWeaponIdentity,defaultWeaponIndex,equippedWeaponIndex,nextClassWeaponIndex,syncEquippedWeapon} from '../weapon-system.js';

test('each class starts with its intended weapon',()=>{
 const expected={C01:'W05',C02:'W04',C03:'W13',C04:'W12',C05:'W14',C06:'W01'};
 for(const [classId,weaponId] of Object.entries(expected))assert.equal(DB.weapons[defaultWeaponIndex(DB,classId)].id,weaponId);
});

test('weapon drops receive a deterministic class-compatible identity',()=>{
 const first={uid:'fixed-drop',slot:'무기'};
 const second={uid:'fixed-drop',slot:'무기'};
 assignWeaponIdentity(DB,first,'C05');
 assignWeaponIdentity(DB,second,'C05');
 assert.equal(first.weaponId,second.weaponId);
 assert.ok(CLASS_WEAPON_IDS.C05.includes(first.weaponId));
});

test('equipping and unequipping a weapon synchronizes the active attack weapon',()=>{
 const player={classId:'C06',weapon:15,inventory:[{uid:'axe',slot:'무기',weaponId:'W03'}],equipment:{무기:'axe'}};
 assert.equal(DB.weapons[equippedWeaponIndex(DB,player)].id,'W03');
 assert.equal(DB.weapons[syncEquippedWeapon(DB,player)].id,'W03');
 delete player.equipment['무기'];
 assert.equal(DB.weapons[syncEquippedWeapon(DB,player)].id,'W01');
});

test('weapon swap stays inside the current class weapon pool',()=>{
 let index=defaultWeaponIndex(DB,'C01');
 for(let i=0;i<CLASS_WEAPON_IDS.C01.length*2;i++){
  index=nextClassWeaponIndex(DB,'C01',index);
  assert.ok(CLASS_WEAPON_IDS.C01.includes(DB.weapons[index].id));
 }
});
