/* One defensive single-target assault hero per destroyed forward tower. */
(function(global){'use strict';
const HP=1000,BONUS=150,ROLE=0,COUNT=20;
const towerX=(side,width=3300)=>side===0?width/4:width*3/4;
function mark(u,side,lane=0,width=3300){
 u.guardian=true;u.guardianSide=side;u.guardianLane=lane;u.guardianHomeX=towerX(side,width)+(side===0?-40:40);
 u.heroCount=COUNT;u.hp*=COUNT;u.maxHP*=COUNT;u.x=u.guardianHomeX;u.y=(lane+.5)*520;
 if(Number.isFinite(u.radius))u.radius*=2;if(Number.isFinite(u.hitRadius))u.hitRadius*=2;
 return u;
}
function clampUnit(u,{width=3300,multiplayer=false}={}){
 if(!u.guardian)return;
 const side=u.team??u.side??u.guardianSide,r=Math.max(68,u.radius||u.hitRadius||34),lane=multiplayer?u.guardianLane:0;
 u.x=Math.max(side===0?35:width/2+r,Math.min(side===0?width/2-r:width-35,u.x));
 u.y=Math.max(lane*520+r,Math.min((lane+1)*520-r,u.y));
 if(multiplayer)u.lane=lane;
}
function canTarget(u,v,range,{width=3300,multiplayer=false}={}){
 if(!u.guardian)return true;
 if(multiplayer&&Math.floor(v.y/520)!==u.guardianLane)return false;
 const ownHalf=(u.team??u.side??u.guardianSide)===0?v.x<=width/2:v.x>=width/2;
 return ownHalf||Math.hypot(v.x-u.x,v.y-u.y)<=range*.88;
}
// External healing only. Intrinsic regeneration/lifesteal remains faction behavior.
function healAmount(u,amount,now){
 if(!u.guardian)return amount;
 return amount*(now-(u.lastDamagedAt??-Infinity)<3?.10:.25);
}
function reward(players,team){
 const recipients=players.filter(p=>p.team===team).sort((a,b)=>String(a.uid).localeCompare(String(b.uid)));
 recipients.forEach((p,i)=>{p.cash+=Math.floor(BONUS/recipients.length)+(i<BONUS%recipients.length?1:0);});
}
const api=Object.freeze({HP,BONUS,ROLE,COUNT,towerX,mark,clampUnit,canTarget,healAmount,reward});
global.DesertGuardian=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
