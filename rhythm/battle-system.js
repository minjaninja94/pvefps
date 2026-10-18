// Rhythm Clash: fighting-game round resolution, independent of rendering and networking.
(() => {
  'use strict';
  const WEIGHTS=Object.freeze({perfect:1000,great:720,good:360,miss:0});
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function make(noteList=[]){
    const expected={player:[],bot:[]};
    for(const n of noteList)if((n.side==='player'||n.side==='bot')&&Number.isInteger(n.id))expected[n.side].push(n);
    return {hp:{player:100,bot:100},super:{player:0,bot:0},grades:new Map(),expected,results:[],nextRound:0,version:2};
  }
  function register(state,side,noteId,grade){
    if(!WEIGHTS.hasOwnProperty(grade)||!['player','bot'].includes(side)||!Number.isInteger(noteId))return false;
    const n=state.expected[side].find(n=>n.id===noteId);
    if(!n||state.grades.has(noteId))return false;
    state.grades.set(noteId,{side,grade});
    if(n.kind==='power'&&grade!=='miss')state.super[side]=clamp(state.super[side]+({perfect:24,great:18,good:12}[grade]||0),0,100);
    return true;
  }
  function stats(state,side,round){
    const ns=state.expected[side].filter(n=>Math.floor(n.phrase/2)===round);
    let total=0,hit=0,counts={perfect:0,great:0,good:0,miss:0};
    for(const note of ns){const grade=state.grades.get(note.id)?.grade||'miss';counts[grade]++;total+=WEIGHTS[grade];if(grade!=='miss')hit++;}
    return {notes:ns.length,hits:hit,score:ns.length?Math.round(total/ns.length):0,raw:total,counts};
  }
  function resolve(state,round){
    if(round!==state.nextRound)return null;
    const player=stats(state,'player',round),bot=stats(state,'bot',round);
    const difference=player.score-bot.score;
    const winner=!player.notes||!bot.notes||Math.abs(difference)<40?'draw':difference>0?'player':'bot';
    const loser=winner==='player'?'bot':'player';
    // 4-16 HP per clash; mitigates long songs while rewarding rhythm.
    const damage=winner==='draw'?0:clamp(Math.round(4+Math.abs(difference)/67+(Math.max(player.score,bot.score)>=940?2:0)),4,16);
    if(winner!=='draw'){
      state.hp[loser]=clamp(state.hp[loser]-damage,0,100);
      state.super[winner]=clamp(state.super[winner]+12+Math.round(damage/2),0,100);
      state.super[loser]=clamp(state.super[loser]+6,0,100);
    }else{
      state.super.player=clamp(state.super.player+4,0,100);
      state.super.bot=clamp(state.super.bot+4,0,100);
    }
    let finisher=false;
    if(winner!=='draw'&&state.super[winner]>=100){
      finisher=true;state.super[winner]=0;
      state.hp[loser]=clamp(state.hp[loser]-8,0,100);
    }
    const result={round,winner,damage:damage+(finisher?8:0),player,bot,finisher,hp:{...state.hp},super:{...state.super}};
    state.nextRound++;
    state.results.push(result);
    return result;
  }
  function applyRemote(state,packet){
    if(!packet||!Number.isInteger(packet.round)||packet.round!==state.nextRound||!['player','bot','draw'].includes(packet.winner))return null;
    if(!['player','bot'].every(k=>Number.isFinite(packet.hp?.[k])&&Number.isFinite(packet.super?.[k])))return null;
    const result={
      round:packet.round,
      winner:packet.winner==='player'?'bot':packet.winner==='bot'?'player':'draw',
      damage:clamp(Number(packet.damage)||0,0,24),
      player:packet.bot,
      bot:packet.player,
      finisher:!!packet.finisher,
      hp:{player:clamp(Number(packet.hp?.bot)||0,0,100),bot:clamp(Number(packet.hp?.player)||0,0,100)},
      super:{player:clamp(Number(packet.super?.bot)||0,0,100),bot:clamp(Number(packet.super?.player)||0,0,100)}
    };
    state.hp=result.hp;state.super=result.super;state.nextRound++;state.results.push(result);
    return result;
  }
  window.RhythmClash=Object.freeze({WEIGHTS,make,register,stats,resolve,applyRemote});
})();