'use strict';
const POINTS=[700,1500,4000,2400,3200,1300];
function roster(stage){const count=stage%5===0?4:4+stage,unlocked=stage===1?[0,1]:stage===2?[0,1,3]:stage===3?[0,1,2,3,4]:[0,1,2,3,4,5];const counts=Array(6).fill(0);for(let i=0;i<count;i++)counts[unlocked[(i+stage-1)%unlocked.length]]++;return counts;}
function int(v,min,max){if(!Number.isSafeInteger(v)||v<min||v>max)throw Error('invalid-number');return v;}
function identifier(v){if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(v))throw Error('invalid-id');return v;}
function playerName(v){if(typeof v!=='string')throw Error('invalid-name');const name=v.trim();if(!name||[...name].length>16||/[\u0000-\u001f\u007f]/.test(name))throw Error('invalid-name');return name;}
function validateEntry(data){const stage=int(data.stage,1,10),expected=roster(stage);if(!['clear','dead'].includes(data.outcome)||!Array.isArray(data.kills)||data.kills.length!==6||typeof data.boss!=='boolean')throw Error('invalid-entry');const kills=data.kills.map((n,i)=>int(n,0,expected[i]));if(data.boss&&stage%5!==0)throw Error('invalid-boss');if(data.outcome==='clear'&&(kills.some((n,i)=>n!==expected[i])||(stage%5===0&&!data.boss)))throw Error('incomplete-stage');
 // Per-enemy part bounds include shields and quadruped weapons, excluding indestructible body.
 const parts=int(data.parts,0,expected.reduce((n,k,i)=>n+k*[5,5,6,5,6,7][i],0)),bossParts=int(data.bossParts,0,stage===10?13:stage===5?7:0);
 return {stage,kills,parts,bossParts,boss:data.boss,outcome:data.outcome};}
function stageScore(entry){return entry.kills.reduce((sum,n,i)=>sum+n*POINTS[i],0)+entry.parts*100+entry.bossParts*500+(entry.boss?(entry.stage===10?40000:20000):0)+(entry.outcome==='clear'?1000:0);}
function publicRecord(row){return {id:row.id,name:row.name,score:row.score,elapsedMs:row.elapsedMs,stage:row.stage,outcome:row.outcome,createdAt:row.createdAt};}
module.exports={roster,int,identifier,playerName,validateEntry,stageScore,publicRecord};
