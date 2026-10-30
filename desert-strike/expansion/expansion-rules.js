/* Opt-in preparation module. Never registers units in the live roster. */
(function(global){'use strict';
const VERSION=1,EXTRACTOR=8,SNIPER=9,ASSASSIN=10;
const FACTIONS=['forge','brood','astral','marine','beastkin','elf','furry','robot','octoper','fairy'];
const MUT=[[1.055,1,.96],[.995,1,1.12],[.99,1.09,1],[1.09,1.06,1.01],[1,1,1.08],[.94,1,.99],[1.02,1,1.07],[1.07,1,.99],[.99,1,1.01],[1,1,1.01]];
const NAMES=[['원점 저격수','망령 침투병'],['심연 침저격충','그림자 절단충'],['성운 관측자','공허 위상검사'],['황병장 · 대물저격','야간 잠행 해병'],['설원 살쾡이 사수','흑표 그림자'],['월광 장궁수','은월 그림자무희'],['붉은여우 명사수','밤늑대 추적자'],['분광 저격 드론','영점 암살기'],['심해 작살술사','먹물 잠행자'],['이슬 정밀술사','가시 그림자']];
const CANDIDATES={
 [SNIPER]:{key:'sniper',name:'저격',cost:380,hp:78,damage:300,armor:0,range:370,rate:4.8,speed:44,kind:'ground',airTarget:false,aim:.65,armorPierce:.5,good:[],bad:[0,10]},
 [ASSASSIN]:{key:'assassin',name:'암살',cost:330,hp:52,damage:180,armor:0,range:30,rate:1.45,speed:96,kind:'ground',airTarget:false,aim:.18,armorPierce:0,good:[],bad:[0,3],stealth:true}
};
const RULES=Object.freeze({detectionRadius:190,attackRevealSeconds:1.05,stealthOpacity:.58,infiltrationTrigger:250,infiltrationReach:380,infiltrationWindup:.35,infiltrationTravel:.45,landingRecovery:.45,firstStrikeMultiplier:1.2});
function definition(role,faction=0){
 const b=CANDIDATES[role];if(!b)return null;const [hp,damage,speed]=MUT[faction]||MUT[0];
 return {...b,role,faction,unitName:NAMES[faction]?.[role===SNIPER?0:1]||b.name,hp:b.hp*hp*2.25,damage:b.damage*damage*.94,speed:b.speed*speed*.84,range:b.range*(role===SNIPER&&faction===5?1.1:1)};
}
const side=u=>u.team??u.side;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function detected(unit,units,now=0){
 if(unit.role!==ASSASSIN)return true;
 if((unit.revealedUntil||0)>now)return true;
 return units.some(v=>v.hp>0&&side(v)!==side(unit)&&v.role===7&&!v.detectionDisabled&&distance(v,unit)<=RULES.detectionRadius);
}
function canTarget(attacker,target,units,now=0){return target.hp>0&&side(attacker)!==side(target)&&(target.role!==ASSASSIN||detected(target,units,now));}
function presentation(unit,units,now=0){
 const found=detected(unit,units,now),stealth=unit.role===ASSASSIN;
 return {visible:true,opacity:stealth&&!found?RULES.stealthOpacity:1,label:stealth?(found?((unit.revealedUntil||0)>now?'공격 노출!':'탐지됨'):'은신!'):unit.role===7&&unit.hp>0?'디텍팅!':'',detectionRadius:unit.role===7&&unit.hp>0?RULES.detectionRadius:0,targetable:unit.hp>0&&(!stealth||found)};
}
function infiltration(unit,enemies,now=0){
 if(unit.role!==ASSASSIN||unit.infiltrationUsed||!enemies.some(v=>v.hp>0&&distance(unit,v)<=RULES.infiltrationTrigger))return null;
 const direction=side(unit)===0?1:-1;
 const known=enemies.filter(v=>v.hp>0&&distance(unit,v)<=420);
 const rear=known.filter(v=>[SNIPER,5,7,1].includes(v.role));
 if(!rear.length)return null;
 rear.sort((a,b)=>(([SNIPER,5,7,1].indexOf(a.role)-[SNIPER,5,7,1].indexOf(b.role))||a.id-b.id));
 const target=rear[Math.abs(unit.id||0)%rear.length],rawX=target.x+direction*20;
 const dx=rawX-unit.x,dy=target.y-unit.y,len=Math.hypot(dx,dy)||1,scale=Math.min(1,RULES.infiltrationReach/len);
 return {from:{x:unit.x,y:unit.y},to:{x:unit.x+dx*scale,y:unit.y+dy*scale},start:now,landAt:now+RULES.infiltrationWindup+RULES.infiltrationTravel,readyAt:now+RULES.infiltrationWindup+RULES.infiltrationTravel+RULES.landingRecovery,target:target.id};
}
function revealOnAttack(unit,now){if(unit.role===ASSASSIN)unit.revealedUntil=Math.max(unit.revealedUntil||0,now+RULES.attackRevealSeconds);}
function snapshot(unit,units,now){
 // Both players receive the assassin's position and presentation state.
 return {id:unit.id,team:side(unit),role:unit.role,faction:unit.faction,x:unit.x,y:unit.y,hp:unit.hp,infiltrationUsed:!!unit.infiltrationUsed,phase:unit.phase||'normal',...presentation(unit,units,now)};
}
function precisionMultiplier(attacker,target){
 if(attacker.role!==SNIPER)return 1;
 const kind=target.def?.kind||target.kind;
 return target.role===3||(target.role===6&&kind==='ground')?1.6:target.heroCount===20?1.25:1;
}
const api=Object.freeze({VERSION,EXTRACTOR,SNIPER,ASSASSIN,FACTIONS,NAMES,RULES,CANDIDATES,definition,precisionMultiplier,detected,canTarget,presentation,infiltration,revealOnAttack,snapshot,liveEnabled:false});
global.DesertExpansion=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
