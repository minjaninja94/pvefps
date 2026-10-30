/* Prepared cosmetic rewards. No account writes or live unlocks. */
(function(global){'use strict';
const SKINS=Object.freeze([
 {id:'field-scout',name:'전선 정찰대',milestone:'멀티 완료 5회',matches:5,pvpWins:0,filter:'sepia(.3) saturate(.8)',accent:'#dbc48d',insignia:'stripe'},
 {id:'night-vanguard',name:'야간 선봉대',milestone:'PvP 승리 10회',matches:0,pvpWins:10,filter:'brightness(.8) saturate(.7) hue-rotate(15deg)',accent:'#8ce6ff',insignia:'chevron'},
 {id:'platinum-veteran',name:'백금 베테랑',milestone:'PvP 승리 30회',matches:0,pvpWins:30,filter:'saturate(.6) brightness(1.15)',accent:'#f0d47c',insignia:'star'}
]);
function eligible(skinId,stats){
 const skin=SKINS.find(x=>x.id===skinId);if(!skin||stats?.serverVerified!==true)return false;
 return Number(stats.completedOnlineMatches)>=skin.matches&&Number(stats.verifiedPvPWins)>=skin.pvpWins;
}
function preview(ctx,skinId,size=72){
 const skin=SKINS.find(x=>x.id===skinId);if(!skin)return;
 ctx.save();ctx.fillStyle=skin.accent;ctx.strokeStyle=skin.accent;ctx.lineWidth=2;
 const x=size*.7,y=size*.35;
 if(skin.insignia==='stripe'){ctx.fillRect(x,y,3,10);ctx.fillRect(x+5,y,3,10);}
 else if(skin.insignia==='chevron'){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+6,y+6);ctx.lineTo(x+12,y);ctx.stroke();}
 else {ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?3:7;const px=x+6+Math.cos(a)*r,py=y+5+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();}
 ctx.restore();
}
const api=Object.freeze({SKINS,eligible,preview,liveEnabled:false,statsAuthority:'server-confirmed match results only; local counters are not an entitlement'});
global.DesertExpansionRewards=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
