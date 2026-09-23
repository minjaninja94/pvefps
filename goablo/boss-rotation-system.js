export const ROTATING_BOSS_NUMBERS=Object.freeze(Array.from({length:11},(_,index)=>index+1));

function shuffledBosses(random){const bag=[...ROTATING_BOSS_NUMBERS];for(let i=bag.length-1;i>0;i--){const j=Math.min(i,Math.floor(Math.max(0,Math.min(.999999,random()))*(i+1)));[bag[i],bag[j]]=[bag[j],bag[i]];}return bag;}

export function ensureBossRotation(value){return {bag:Array.isArray(value?.bag)?value.bag.filter(number=>ROTATING_BOSS_NUMBERS.includes(number)):[],last:Number.isInteger(value?.last)?value.last:null};}

export function drawBossNumber(rotation,progress,random=Math.random){
 const state=ensureBossRotation(rotation),act=Math.max(1,Math.min(12,Number(progress?.act)||1));
 if(!progress?.abyssMode)return {bossNumber:act,state};
 const tier=Math.max(1,Number(progress?.abyssTier)||1);
 if(tier%10===0)return {bossNumber:12,state:{...state,last:12}};
 const bag=state.bag.length?[...state.bag]:shuffledBosses(random);
 if(bag.length>1&&bag[bag.length-1]===state.last)[bag[bag.length-1],bag[bag.length-2]]=[bag[bag.length-2],bag[bag.length-1]];
 const bossNumber=bag.pop();return {bossNumber,state:{bag,last:bossNumber}};
}
