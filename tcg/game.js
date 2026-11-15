/* Dimension War TCG · playable single-player rules prototype
   Rules source: tcg/README.md v5.0. Unspecified timings are local alpha choices. */
(() => {
'use strict';
const DATA=window.TCG_DATA;
if(!DATA)throw new Error('Missing card registry');
const $=id=>document.getElementById(id), C=id=>DATA.byId[id];
const F=id=>DATA.factions[id];
const clone=a=>a.slice();
const shuffle=a=>{const b=clone(a);for(let i=b.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
const random=n=>Math.floor(Math.random()*n);
const within=(x,low,high)=>Math.max(low,Math.min(high,x));
const other=s=>1-s;
const typeK={unit:'몬스터',tactic:'전술',reaction:'반응',gear:'장비'};
let pickedFaction=0,customDeck={},editDeckList=[],filterType='all',searchText='';
let game=null,uidCounter=0,gameCounter=0,pendingReact=null,toastTimer=0,aiBusy=false;
function getSaved(f){try{const x=JSON.parse(localStorage.getItem('dw-tcg-deck-'+f)||'null');return DATA.isValidDeck(x,f)?x:DATA.makeDeck(f);}catch{return DATA.makeDeck(f);}}
function saveDeck(f,arr){try{localStorage.setItem('dw-tcg-deck-'+f,JSON.stringify(arr));}catch{}}
function log(text,kind='info'){if(!game)return;game.logs.unshift({text,kind});game.logs.length=Math.min(game.logs.length,28);}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2100);}
function makePlayer(side,f,deck){return{side,faction:f,hp:100,deck:shuffle(deck),hand:[],grave:[],exile:[],units:[null,null,null,null,null],spells:[null,null,null,null,null],clash:null,basicUsed:false,clashUsed:false,flags:{occupyBlock:false,shield:0},metrics:{seen:new Set(),tactics:new Set(),movement:0,turnMoves:0,turnSummons:0,traitUsed:false,turnTactics:0},ownTurns:0};}
function allUnits(side){const p=game.players[side];return p.units.filter(Boolean).concat(p.clash?[p.clash]:[]);}
function emptyUnitIndex(p){return p.units.findIndex(x=>!x);}
function cardName(id){return C(id)?.name||'알 수 없는 카드';}
function setPhase(phase){game.stage=phase;game.selected=null;log(phase==='combat'?'전투 단계 진입':'전개 단계 진입','important');render();}
function draw(side,n=1){const p=game.players[side];for(let k=0;k<n;k++){if(!p.deck.length){p.flags.fatigue=(p.flags.fatigue||0)+1;applyCoreDamage(side,4*p.flags.fatigue,'덱 소진');if(game.winner!==null)return;continue;}p.hand.push(p.deck.pop());}if(n&&game.winner===null)log((side===0?'플레이어':'AI')+'가 '+n+'장 드로우',side===0?'my':'enemy');}
function applyCoreDamage(side,amount,source='공격'){if(!game||game.winner!==null)return;const p=game.players[side];const raw=Math.max(0,amount);const dmg=p.flags.shield>0?(p.flags.shield--,0):raw;p.hp=within(p.hp-dmg,0,100);log(source+' → '+(side===0?'플레이어':'AI')+' 생명력 '+(dmg?'−'+dmg:'방어 성공'),dmg?'important':'info');if(p.hp<=0)finishGame(other(side),source);}
function heal(side,n){const p=game.players[side],was=p.hp;p.hp=within(p.hp+n,0,100);if(p.hp>was)log((side===0?'아군':'상대')+' 생명력 +'+(p.hp-was),side===0?'my':'enemy');}
function makeUnit(cid){const card=C(cid);return{cid,uid:++uidCounter,atk:card.atk,hp:card.hp,maxHp:card.hp,used:false,entered:game.serial,clashEntered:-1,guard:false,ward:false,frozen:false,damageBlocked:false};}
function removeUnit(side,unit,destination='grave'){
 const p=game.players[side],index=p.units.findIndex(x=>x&&x.uid===unit.uid);
 if(index>=0)p.units[index]=null;else if(p.clash?.uid===unit.uid)p.clash=null;else return false;
 if(destination==='hand')p.hand.push(unit.cid);
 if(destination==='exile')p.exile.push(unit.cid);
 if(destination==='grave')p.grave.push(unit.cid);
 for(let i=0;i<p.spells.length;i++){if(p.spells[i]?.target===unit.uid){p.grave.push(p.spells[i].cid);p.spells[i]=null;}}
 log(cardName(unit.cid)+' → '+({grave:'데스존',hand:'손패',exile:'단절된 이계'}[destination]||'필드 이탈'),side===0?'my':'enemy');
 return true;
}
function wound(side,unit,damage,source){if(!unit||damage<=0)return;const amount=unit.ward?(unit.ward=false,Math.max(0,damage-5)):damage;unit.hp-=amount;log(source+' · '+cardName(unit.cid)+' '+amount+' 피해',side===0?'my':'enemy');if(unit.hp<=0)removeUnit(side,unit);}
function moveToClash(side,unit,fromEffect=false){
 const p=game.players[side];if(p.clash||(!fromEffect&&p.clashUsed))return false;
 const i=p.units.findIndex(x=>x?.uid===unit.uid);if(i<0)return false;
 p.units[i]=null;p.clash=unit;unit.clashEntered=game.serial;unit.used=true;p.clashUsed=true;p.metrics.movement++;p.metrics.turnMoves++;
 log(cardName(unit.cid)+' 격돌존 진입',side===0?'my':'enemy');
 moveTrait(side);return true;
}
function retreat(side){const p=game.players[side];if(!p.clash||emptyUnitIndex(p)<0)return false;const u=p.clash;p.clash=null;p.units[emptyUnitIndex(p)]=u;u.used=true;p.metrics.movement++;p.metrics.turnMoves++;log(cardName(u.cid)+' 격돌존 철수',side===0?'my':'enemy');moveTrait(side);return true;}
function moveTrait(side){const p=game.players[side];if(p.faction===6&&p.metrics.turnMoves===1){draw(side,1);if(p.hand.length){p.grave.push(p.hand.shift());log('성운 항해단 특성: 1장 드로우 후 1장 버림','important');}}}
function rankCheck(side,card){
 const p=game.players[side],own=allUnits(side),m=p.metrics;
 if(card.type!=='unit')return'몬스터 카드가 아닙니다.';
 if(emptyUnitIndex(p)<0)return'몬스터존 5칸이 모두 찼습니다.';
 if(card.rank===0)return p.basicUsed?'이번 턴 기본 배치를 이미 사용했습니다.':null;
 if(card.rank===1)return own.length>=2||m.turnTactics>=1?null:'중수 강림: 아군 몬스터 2기 또는 이번 턴 전술 1회 해결 필요';
 if(p.ownTurns<=1)return'양쪽 모두 자신의 첫 턴에는 고수 강림 불가';
 const f=p.faction,distinct=m.seen.size,tactics=m.tactics;
 if(f===0&&!(distinct>=2&&[...tactics].some(id=>C(id)?.flag==='royal')))return'어명 강림: 조선 몬스터 2종 등장 + 왕명 선포 필요';
 if(f===1&&!(distinct>=3&&[...tactics].some(id=>C(id)?.flag==='performance')))return'앙코르: 아이돌 3종 등장 + 첫 번째 공연 필요';
 if(f===2&&!(own.length>=2&&p.spells.some(s=>s&&C(s.cid).type==='gear')))return'도킹: 아군 기체 2기와 장비 1장 필요';
 if(f===3&&!(p.grave.filter(id=>C(id)?.type==='unit').length>=2&&p.hp>10))return'혈계 계승: 데스존 혈족 2장 + 생명력 10 필요';
 if(f===4&&!(own.length>=2&&own.some(x=>x.entered<game.serial)))return'개화: 생존한 정령 1기와 몬스터 2기 필요';
 if(f===5&&own.length<3)return'포식 진화: 아군 군체 3기 필요';
 if(f===6&&!(m.movement>=2&&[...tactics].some(id=>C(id)?.flag==='device')))return'좌표 전이: 몬스터 이동 누적 2회 + 차원 장치 필요';
 if(f===7&&!(tactics.size>=3&&p.grave.some(id=>C(id)?.type==='tactic')))return'공명 현현: 서로 다른 전술 3종 해결 + 데스존 전술 필요';
 if(f===0||f===1||f===4||f===6||f===7){if(!own.length)return'강림 대가로 사용할 아군 몬스터 필요';}
 return null;
}
function payHigh(side){
 const p=game.players[side];const f=p.faction;let own=allUnits(side);
 if(f===3){p.hp-=p.metrics.traitUsed?10:6;p.metrics.traitUsed=true;let done=0;for(let i=p.grave.length-1;i>=0&&done<2;i--){if(C(p.grave[i])?.type==='unit'){p.exile.push(p.grave.splice(i,1)[0]);done++;}}log('혈계 계승: 생명력 소모 + 혈족 2장 격리','important');}
 else if(f===5){own.slice(0,3).forEach(x=>removeUnit(side,x));}
 else if(f===2){own.slice(0,2).forEach(x=>removeUnit(side,x));const g=p.spells.findIndex(s=>s&&C(s.cid).type==='gear');if(g>=0){const card=p.spells[g].cid;p.spells[g]=null;p.hand.push(card);log('도킹 특성: 장비 손패 회수','important');}}
 else if(f===7){const i=p.grave.findIndex(id=>C(id)?.type==='tactic');if(i>=0)p.exile.push(p.grave.splice(i,1)[0]);if(own.length)removeUnit(side,own[0]);}
 else if(own.length)removeUnit(side,own.find(x=>C(x.cid).rank===0)||own[0]);
}
function summon(side,handIndex){
 const p=game.players[side],cid=p.hand[handIndex],card=C(cid);if(!card)return false;
 const reason=rankCheck(side,card);if(reason){if(side===0)toast(reason);return false;}
 if(card.rank===2)payHigh(side);
 const slot=emptyUnitIndex(p);if(slot<0)return false;
 p.hand.splice(handIndex,1);const u=makeUnit(cid);p.units[slot]=u;
 if(card.rank===0)p.basicUsed=true;
 p.metrics.seen.add(cid);p.metrics.turnSummons++;
 if(p.faction===0&&p.metrics.seen.size>=2&&!p.metrics.traitUsed){u.atk+=2;p.metrics.traitUsed=true;log('조선 특성 발동: 공격력 +2','important');}
 if(p.faction===1&&p.metrics.turnSummons===3&&!p.metrics.traitUsed){draw(side,1);p.metrics.traitUsed=true;}
 if(p.faction===5&&card.rank===2&&emptyUnitIndex(p)>=0){const token='f5u0';p.units[emptyUnitIndex(p)]=makeUnit(token);log('심해 모체: 유생체 증식','important');}
 if(p.faction===4&&card.rank===2){ownHeal(side,3);}
 log((side===0?'플레이어':'AI')+' 강림: '+card.name+' ['+card.tier+']',side===0?'my':'enemy');
 return true;
}
function ownHeal(side,amount){allUnits(side).forEach(u=>u.hp=Math.min(u.maxHp,u.hp+amount));}
function useEffect(side,card){
 const p=game.players[side],enemy=game.players[other(side)],e=card.effect,friend=allUnits(side);
 const foe=allUnits(other(side));
 switch(e){
  case'draw':draw(side,2);break;
  case'supply':draw(side,1);heal(side,4);break;
  case'heal':heal(side,9);break;
  case'blast':applyCoreDamage(other(side),8,card.name);break;
  case'buff':{const u=friend.sort((a,b)=>b.atk-a.atk)[0];if(u)u.atk+=4;else heal(side,3);break;}
  case'weaken':{const u=foe.sort((a,b)=>b.atk-a.atk)[0];if(u)u.atk=Math.max(1,u.atk-4);break;}
  case'strike':{const u=foe.sort((a,b)=>a.hp-b.hp)[0];if(u)wound(other(side),u,7,card.name);else applyCoreDamage(other(side),4,card.name);break;}
  case'freeze':{const u=foe.find(x=>!x.frozen);if(u)u.frozen=true;break;}
  case'bounce':{const u=enemy.clash||enemy.units.find(Boolean);if(u)removeUnit(other(side),u,'hand');break;}
  case'banish':{const u=enemy.units.find(Boolean);if(u)removeUnit(other(side),u,'exile');break;}
  case'recover':{const ix=p.grave.findIndex(id=>C(id)?.type==='unit'&&C(id)?.rank===0);if(ix>=0)p.hand.push(p.grave.splice(ix,1)[0]);else draw(side,1);break;}
  case'deploy':{const ix=p.grave.findIndex(id=>C(id)?.rank===0);const slot=emptyUnitIndex(p);if(ix>=0&&slot>=0){const id=p.grave.splice(ix,1)[0];p.units[slot]=makeUnit(id);log('데스존 하수 소생: '+cardName(id),'important');}else draw(side,1);break;}
  case'shift':{if(!p.clash&&p.units.some(Boolean)){moveToClash(side,p.units.find(Boolean),true);}else if(p.clash&&emptyUnitIndex(p)>=0){retreat(side);}else draw(side,1);break;}
  case'challenge':{const u=p.units.find(Boolean);if(u&&!p.clash)moveToClash(side,u,true);else p.flags.shield++;break;}
  case'fog':enemy.flags.occupyBlock=true;break;
  case'guard':{const u=friend[0];if(u)u.guard=true;else p.flags.shield++;break;}
  case'dice':{const rolls=[1+random(6),1+random(6),1+random(6)],hits=rolls.filter(n=>n>=4).length;log('D6 포격 ['+rolls.join(' · ')+'] · 명중 '+hits,'important');const u=enemy.clash||foe[0];if(u)wound(other(side),u,hits*6,card.name);else applyCoreDamage(other(side),hits*3,card.name);break;}
  default:draw(side,1);
 }
 if(p.faction===7&&p.metrics.tactics.size>=2&&!p.metrics.traitUsed){p.metrics.traitUsed=true;applyCoreDamage(other(side),3,'유리 마도원 공명');}
}
function playNonUnit(side,index){
 const p=game.players[side],id=p.hand[index],card=C(id);if(!card)return false;
 if(card.type==='reaction'||card.type==='gear'){
  const idx=p.spells.findIndex(x=>!x);if(idx<0){if(side===0)toast('전술존에 빈 칸이 없습니다.');return false;}
  if(card.type==='gear'&&!allUnits(side).length){if(side===0)toast('장비를 부착할 몬스터가 없습니다.');return false;}
  p.hand.splice(index,1);
  const target=card.type==='gear'?allUnits(side)[0]:null;
  p.spells[idx]={cid:id,faceDown:card.type==='reaction',target:target?.uid??null};
  if(card.type==='gear'&&target){target.atk+=card.effect==='power'?3:0;target.maxHp+=card.effect==='ward'?5:0;target.hp+=card.effect==='ward'?5:0;target.guard=card.effect==='ward'?true:target.guard;}
  log((side===0?'아군':'AI')+' '+(card.type==='gear'?'장비 부착':'반응 카드 세트')+': '+card.name,side===0?'my':'enemy');return true;
 }
 p.hand.splice(index,1);p.grave.push(id);
 p.metrics.tactics.add(id);p.metrics.turnTactics++;
 log((side===0?'아군':'AI')+' 전술 발동: '+card.name,side===0?'my':'enemy');
 useEffect(side,card);return true;
}
function availableReact(side,event){
 const p=game.players[side],can=card=>{
  if(card.type!=='reaction')return false;
  if(card.effect==='shield'&&event.type!=='attack'&&event.type!=='tactic')return false;
  if(card.effect==='challenge'&&event.type!=='attack'&&event.type!=='occupy')return false;
  return true;
 };
 return [...p.hand.map((cid,i)=>({cid,from:'hand',index:i})),...p.spells.map((s,i)=>s?({cid:s.cid,from:'spells',index:i}):null).filter(Boolean)].filter(item=>can(C(item.cid)));
}
function applyReaction(side,item,event){
 const p=game.players[side],card=C(item.cid);
 if(item.from==='hand')p.hand.splice(item.index,1);else p.spells[item.index]=null;
 p.grave.push(item.cid);
 switch(card.effect){
  case'negate':event.canceled=true;break;
  case'shield':event.prevented=true;break;
  case'challenge':{const u=p.units.find(Boolean);if(u&&!p.clash)moveToClash(side,u,true);else p.flags.shield++;break;}
  case'guard':{const u=allUnits(side)[0];if(u)u.guard=true;else p.flags.shield++;break;}
  case'counter':applyCoreDamage(other(side),4,card.name);heal(side,4);break;
  case'draw':draw(side,1);break;
 }
 log((side===0?'플레이어':'AI')+' 반응 발동: '+card.name,'important');render();
}
function aiReaction(event){
 if(game.winner!==null)return event;
 const options=availableReact(1,event);
 let choice=options.find(x=>C(x.cid).effect==='negate');
 if(event.type==='attack')choice=options.find(x=>C(x.cid).effect==='shield')||choice;
 if(!choice)choice=options[0];
 if(choice&&Math.random()<.63)applyReaction(1,choice,event);
 return event;
}
function humanReaction(event){
 if(game.winner!==null)return Promise.resolve(event);
 const options=availableReact(0,event);if(!options.length)return Promise.resolve(event);
 return new Promise(resolve=>{
  pendingReact={event,resolve};
  $('reactionText').textContent=event.description;
  $('reactionOptions').innerHTML=options.map((x,i)=>'<button class="ghost-btn" data-react="'+i+'">'+C(x.cid).name+' · '+(C(x.cid).desc||'대응')+'</button>').join('');
  $('reactionOverlay').classList.remove('hidden');
  $('reactionOptions').onclick=ev=>{const btn=ev.target.closest('[data-react]');if(!btn||!pendingReact)return;const n=Number(btn.dataset.react);const selected=options[n];if(!selected)return;applyReaction(0,selected,event);endReaction();};
 });
}
function endReaction(){if(!pendingReact)return;const {event,resolve}=pendingReact;pendingReact=null;$('reactionOverlay').classList.add('hidden');resolve(event);}
function humanPlay(index){
 if(!game||game.owner!==0||game.stage!=='main'||game.winner!==null)return;
 const p=game.players[0],id=p.hand[index],card=C(id);if(!card)return;
 let event={type:card.type==='unit'?'summon':'tactic',cid:id,canceled:false,description:card.name};
 if(card.type==='unit'){const why=rankCheck(0,card);if(why){toast(why);return;}}
 else if(card.type==='gear'&&!allUnits(0).length){toast('장착 대상이 필요합니다.');return;}
 if(card.type==='tactic'||card.type==='unit')event=aiReaction(event);
 if(event.canceled){p.hand.splice(index,1);p.grave.push(id);log('상대가 '+card.name+'의 발동을 무효화했습니다.','enemy');}
 else if(card.type==='unit')summon(0,index);
 else playNonUnit(0,index);
 game.selected=null;render();testVictory();
}
function activeGuards(side){return allUnits(side).filter(u=>u.guard);}
function attack(side,attacker,targetSide,target,core=false,prevented=false){
 if(game.winner!==null||attacker.used||attacker.frozen)return false;
 if(attacker.entered===game.serial)return false;
 const p=game.players[side];
 if(p.clash?.uid===attacker.uid&&core)return false;
 if(p.clash?.uid===attacker.uid&&game.players[other(side)].clash&&target?.uid!==game.players[other(side)].clash.uid)return false;
 if(core&&activeGuards(other(side)).length)return false;
 attacker.used=true;
 if(prevented){log('반응 카드가 공격을 무효화했습니다.','important');return true;}
 if(core){applyCoreDamage(other(side),attacker.atk,cardName(attacker.cid)+' 직접 공격');return true;}
 if(!target)return false;
 const atk=attacker.atk,retaliate=target.atk;
 log(cardName(attacker.cid)+' ⚔ '+cardName(target.cid),'important');
 wound(other(side),target,atk,'전투');
 // both sides exchange damage, even if the target was destroyed
 if(allUnits(side).some(u=>u.uid===attacker.uid))wound(side,attacker,retaliate,'반격');
 return true;
}
function humanAttack(core,targetType,index){
 if(!game||game.owner!==0||game.stage!=='combat')return;
 const sel=game.selected;if(!sel||sel.kind!=='field'||sel.side!==0)return toast('아군 몬스터를 먼저 선택하세요.');
 const unit=allUnits(0).find(x=>x.uid===sel.uid);
 if(!unit||unit.used||unit.frozen||unit.entered===game.serial)return toast('해당 유닛은 아직 공격할 수 없습니다.');
 let target=null;
 if(!core){target=targetType==='clash'?game.players[1].clash:game.players[1].units[index];if(!target)return;}
 if(core&&activeGuards(1).length)return toast('수호 몬스터가 직접 공격을 막고 있습니다.');
 if(core&&game.players[0].clash?.uid===unit.uid)return toast('격돌 몬스터는 본진에 직접 공격할 수 없습니다.');
 if(game.players[0].clash?.uid===unit.uid&&game.players[1].clash&&!core&&target.uid!==game.players[1].clash.uid)return toast('격돌존의 상대를 먼저 공격해야 합니다.');
 const event=aiReaction({type:'attack',cid:unit.cid,canceled:false,prevented:false,description:cardName(unit.cid)+' 공격'});
 if(event.canceled){unit.used=true;log('AI가 공격을 무효화했습니다.','enemy');}
 else attack(0,unit,1,target,core,event.prevented);
 game.selected=null;render();testVictory();
}
function occupy(side){
 const p=game.players[side],enemy=game.players[other(side)],u=p.clash;
 if(!u||enemy.clash||u.clashEntered>=game.serial)return;
 if(p.flags.occupyBlock){log('봉쇄 연막: 점령 피해가 취소되었습니다.','important');p.flags.occupyBlock=false;return;}
 const c=C(u.cid),value=c.occupation||(c.rank===2?12:c.rank===1?7:4);
 applyCoreDamage(other(side),value,c.name+' 단독 점령');
 if(c.id==='f1h0')heal(side,8);
 if(c.id==='f3h0')heal(side,Math.floor(value/2));
 if(c.id==='f4h0')ownHeal(side,3);
}
function finishGame(winner,reason){if(game.winner!==null)return;game.winner=winner;game.stage='finished';$('resultHeading').textContent=winner===0?'VICTORY':'DEFEAT';$('resultSymbol').textContent=winner===0?'✦':'◇';$('resultMessage').textContent=(winner===0?'상대 차원을 무너뜨렸습니다.':'차원 연결이 끊어졌습니다.')+' · '+reason;$('resultSummary').innerHTML='<span>나의 생명력<b>'+game.players[0].hp+'</b></span><span>AI 생명력<b>'+game.players[1].hp+'</b></span><span>진행 턴<b>'+game.serial+'</b></span>';$('resultOverlay').classList.remove('hidden');render();}
function testVictory(){if(!game||game.winner!==null)return;if(game.players[0].hp<=0)finishGame(1,'생명력 0');else if(game.players[1].hp<=0)finishGame(0,'생명력 0');}
function finishTurn(side){
 if(!game||game.winner!==null||game.owner!==side)return;
 occupy(side);testVictory();if(game.winner!==null){render();return;}
 const p=game.players[side];
 p.flags.occupyBlock=false;
 game.owner=other(side);game.serial++;game.stage='main';game.selected=null;
 const q=game.players[game.owner];q.ownTurns++;q.basicUsed=false;q.clashUsed=false;
 q.metrics.turnMoves=0;q.metrics.turnSummons=0;q.metrics.turnTactics=0;q.metrics.traitUsed=false;
 allUnits(game.owner).forEach(u=>{u.used=false;u.frozen=false;u.ward=C(u.cid)?.id==='f2h0';});
 if(q.faction===4)ownHeal(game.owner,2);
 draw(game.owner,1);
 game.round=Math.ceil(game.serial/2);log((game.owner===0?'플레이어':'AI')+' 턴 시작','important');render();
 if(game.owner===1&&game.winner===null){aiBusy=true;const current=gameCounter;setTimeout(()=>runAiTurn(current),700);}
}
function pause(ms){return new Promise(r=>setTimeout(r,ms));}
async function aiTryAction(kind,idx,token){
 if(gameCounter!==token||game.winner!==null)return false;
 const p=game.players[1],cid=p.hand[idx],card=C(cid);if(!card)return false;
 let event={type:kind,cid,canceled:false,description:'AI가 '+card.name+' '+(kind==='summon'?'강림을 선언했습니다.':'전술 발동을 선언했습니다.')};
 if(kind==='summon'&&rankCheck(1,card))return false;
 event=await humanReaction(event);
 if(gameCounter!==token||game.winner!==null)return false;
 const ix=p.hand.indexOf(cid);if(ix<0)return false;
 if(event.canceled){p.grave.push(p.hand.splice(ix,1)[0]);log('AI의 '+card.name+' 발동 무효','my');}
 else if(kind==='summon')summon(1,ix);
 else playNonUnit(1,ix);
 render();await pause(300);return true;
}
async function runAiTurn(token){
 try{
 if(gameCounter!==token||game.owner!==1||game.winner!==null)return;
 let p=game.players[1];
 // Improve position by spells, then seek high and mid summons, then a single basic deployment.
 const tacticIdx=p.hand.findIndex(id=>C(id).type==='tactic'&&['draw','buff','deploy','shift','heal','strike'].includes(C(id).effect));
 if(tacticIdx>=0)await aiTryAction('tactic',tacticIdx,token);
 if(gameCounter!==token)return;
 const low=p.hand.findIndex(id=>C(id).type==='unit'&&C(id).rank===0);
 if(low>=0)await aiTryAction('summon',low,token);
 if(gameCounter!==token)return;
 const another=p.hand.findIndex(id=>C(id).type==='tactic');
 if(another>=0&&Math.random()<.7)await aiTryAction('tactic',another,token);
 if(gameCounter!==token)return;
 for(let k=0;k<2;k++){
  const index=p.hand.findIndex(id=>C(id).type==='unit'&&C(id).rank===2&&!rankCheck(1,C(id)));
  const mid=index<0?p.hand.findIndex(id=>C(id).type==='unit'&&C(id).rank===1&&!rankCheck(1,C(id))):index;
  if(mid<0)break;await aiTryAction('summon',mid,token);if(gameCounter!==token)return;
 }
 const gear=p.hand.findIndex(id=>C(id).type==='gear'&&allUnits(1).length);
 if(gear>=0){playNonUnit(1,gear);render();await pause(250);}
 const trap=p.hand.findIndex(id=>C(id).type==='reaction');
 if(trap>=0&&p.spells.some(s=>!s)&&Math.random()<.7){playNonUnit(1,trap);render();}
 if(gameCounter!==token||game.winner!==null)return;
 if(!p.clash&&p.units.some(Boolean)){const target=p.units.slice().filter(Boolean).sort((a,b)=>b.atk-a.atk)[0];moveToClash(1,target);render();await pause(350);}
 game.stage='combat';log('AI 전투 단계','enemy');render();await pause(400);
 let own=allUnits(1).filter(u=>u.entered!==game.serial&&!u.used&&!u.frozen);
 for(const attacker of own){
  if(gameCounter!==token||game.winner!==null)return;
  if(!allUnits(1).some(x=>x.uid===attacker.uid))continue;
  const clashOwn=p.clash?.uid===attacker.uid,foe=game.players[0];
  let target=clashOwn&&foe.clash?foe.clash:null;
  if(!target){let targets=allUnits(0);target=targets.sort((a,b)=>a.hp-b.hp)[0]||null;}
  let core=!clashOwn&&activeGuards(0).length===0&&(target===null||Math.random()<.68);
  if(core)target=null;
  const event=await humanReaction({type:'attack',cid:attacker.cid,description:'AI '+cardName(attacker.cid)+'의 '+(core?'본진 직접 공격':'몬스터 공격')+' 선언',canceled:false,prevented:false});
  if(gameCounter!==token||game.winner!==null)return;
  if(event.canceled){attacker.used=true;log('플레이어가 AI 공격을 무효화했습니다.','my');}
  else{
   if(core&&activeGuards(0).length){core=false;target=activeGuards(0)[0];}
   if(!core&&clashOwn&&foe.clash)target=foe.clash;
   if(!core&&!target)target=allUnits(0)[0]||null;
   if(core||target)attack(1,attacker,0,target,core,event.prevented);
  }
  render();await pause(550);
 }
 if(gameCounter!==token||game.winner!==null)return;
 finishTurn(1);
 }catch(err){console.error('AI turn',err);if(game&&game.owner===1&&game.winner===null){log('AI 처리 오류 복구: 턴 종료','important');finishTurn(1);}}
 finally{aiBusy=false;}
}
function initGame(){
 const f=pickedFaction,enemyChoices=[...Array(8).keys()].filter(x=>x!==f),ef=enemyChoices[random(enemyChoices.length)],ourDeck=getSaved(f),enemyDeck=DATA.makeDeck(ef);
 gameCounter++;uidCounter=0;pendingReact=null;aiBusy=false;
 game={players:[makePlayer(0,f,ourDeck),makePlayer(1,ef,enemyDeck)],owner:0,serial:1,round:1,stage:'main',selected:null,winner:null,logs:[]};
 game.players[0].ownTurns=1;
 draw(0,5);draw(1,6);
 log('결투 개시! 선공은 첫 턴 드로우와 공격을 건너뜁니다.','important');
 $('lobbyScreen').classList.add('hidden');$('resultOverlay').classList.add('hidden');$('gameScreen').classList.remove('hidden');
 render();toast('DUEL START · '+F(f).name+' VS '+F(ef).name);
}
function unitHtml(unit,side,zone,index){
 const card=C(unit.cid),f=F(card.faction),selected=game.selected?.uid===unit.uid,attackable=game.selected?.kind==='field'&&game.selected.side===0&&side===1&&game.stage==='combat';
 return '<button class="unit-mini '+(selected?'selected ':'')+(attackable?'attackable ':'')+(unit.used||unit.entered===game.serial?'exhausted':'')+'" data-side="'+side+'" data-zone="'+zone+'" data-index="'+index+'" style="--c:'+f.color+'" title="'+card.name+' / '+card.desc+'"><small class="summon-rank">'+(card.rank===2?'◆':card.rank===1?'◇':'·')+'</small><small class="status-mark">'+(unit.guard?'▣':'')+(unit.frozen?'❄':'')+'</small><div class="unit-glyph">'+f.glyph+'</div><div class="unit-name">'+card.name+'</div><div class="unit-stats"><span>⚔ '+unit.atk+'</span><span class="'+(unit.hp<unit.maxHp?'hurt':'')+'">♥ '+unit.hp+'</span></div></button>';
}
function slotHtml(unit,side,zone,index){return'<div class="slot '+(unit?'occupied':'empty')+'" data-slot="'+(zone==='spells'?'TACTIC':'UNIT')+' '+(index+1)+'">'+(unit?zone==='spells'?spellHtml(unit,side,index):unitHtml(unit,side,zone,index):'')+'</div>';}
function spellHtml(s,side,index){const card=C(s.cid);return'<button class="trap-chip" data-spell-side="'+side+'" data-spell-index="'+index+'" title="'+(side===1&&s.faceDown?'상대 세트 카드':card.name)+'">'+(s.faceDown?'▤':card.type==='gear'?'⚙':'✦')+'<small>'+(s.faceDown?'SET':card.name)+'</small></button>';}
function renderBoard(){
 for(const [id,side,zone] of [['enemyUnits',1,'units'],['myUnits',0,'units'],['enemySpells',1,'spells'],['mySpells',0,'spells']]){
  const p=game.players[side];$(id).innerHTML=p[zone].map((u,i)=>slotHtml(u,side,zone,i)).join('');
 }
 $('enemyClash').innerHTML=game.players[1].clash?unitHtml(game.players[1].clash,1,'clash',0):'';
 $('myClash').innerHTML=game.players[0].clash?unitHtml(game.players[0].clash,0,'clash',0):'';
 $('clashState').textContent=game.players[0].clash&&game.players[1].clash?'대치 중':game.players[0].clash?'아군 점령':game.players[1].clash?'상대 점령':'중립';
}
function cardHtml(card,index){
 const faction=card.faction<0?{color:'#d4c28d',glyph:'◇'}:F(card.faction);
 return '<button class="card-face '+(game.selected?.kind==='hand'&&game.selected.index===index?'selected':'')+'" data-hand="'+index+'" style="--c:'+faction.color+'" title="'+card.name+' / '+card.desc+'"><div class="card-header"><b>'+card.name+'</b><i>'+(card.rank===2?'◆':card.rank===1?'◇':card.rank===0?'·':'✦')+'</i></div><div class="card-art"><span class="art-glyph">'+faction.glyph+'</span></div><div class="card-footer"><span class="rarity">'+card.rarity+'</span><span class="card-kind">'+(card.tier||typeK[card.type])+'</span><span class="card-stat">'+(card.type==='unit'?card.atk+' / '+card.hp:'✧')+'</span></div></button>';
}
function selectedCard(){
 if(!game?.selected)return null;
 const s=game.selected;if(s.kind==='hand'){const cid=game.players[0].hand[s.index];return cid?C(cid):null;}
 if(s.kind==='field'){const u=allUnits(s.side).find(x=>x.uid===s.uid);return u?C(u.cid):null;}
 return null;
}
function renderInspector(){
 const el=$('inspector'),s=game.selected,c=selectedCard();
 if(!c){el.innerHTML='<div class="inspector-empty">손패 또는 아군 몬스터를<br>선택해 주세요.</div>';return;}
 const f=c.faction<0?{glyph:'◇',color:'#d9c399',name:'범용'}:F(c.faction);
 let html='<div class="inspect-head"><div class="inspect-emblem" style="--fcolor:'+f.color+'">'+f.glyph+'</div><div><small>'+f.name+' · '+(c.tier||typeK[c.type])+' · '+c.rarity+'</small><b>'+c.name+'</b></div></div>';
 if(c.type==='unit'){const u=s.kind==='field'?allUnits(0).find(x=>x.uid===s.uid):null;html+='<div class="inspect-stats">⚔ '+(u?.atk||c.atk)+' <span>♥ '+(u?.hp||c.hp)+'</span></div>';}
 html+='<div class="inspect-desc">'+c.desc+'</div><div class="inspect-action">';
 const allowed=game.owner===0&&game.winner===null;
 if(s.kind==='hand'&&allowed&&game.stage==='main')html+='<button class="primary-btn" data-inspect-action="play">'+(c.type==='unit'?'강림 / 배치':c.type==='reaction'?'반응 세트':'카드 발동')+'</button>';
 if(s.kind==='field'&&allowed){
  if(game.stage==='main'){if(s.zone==='units')html+='<button class="ghost-btn" data-inspect-action="clash">격돌존 진입</button>';if(s.zone==='clash')html+='<button class="ghost-btn" data-inspect-action="retreat">격돌존 철수</button>';}
  if(game.stage==='combat'&&!allUnits(0).find(x=>x.uid===s.uid)?.used){html+='<button class="primary-btn" data-inspect-action="core">상대 본진 공격</button>';}
 }
 html+='</div>';el.innerHTML=html;
}
function render(){
 if(!game)return;const mine=game.players[0],enemy=game.players[1],mineF=F(mine.faction),enemyF=F(enemy.faction);
 $('myFactionLabel').textContent=mineF.name;$('enemyFactionLabel').textContent=enemyF.name;$('myAvatar').textContent=mineF.glyph;$('enemyAvatar').textContent=enemyF.glyph;$('myAvatar').style.setProperty('--fcolor',mineF.color);$('enemyAvatar').style.setProperty('--fcolor',enemyF.color);
 for(let side=0;side<=1;side++){const p=game.players[side],pre=side===0?'my':'enemy';$(pre+'Hp').textContent=p.hp;$(pre+'HpFill').style.width=p.hp+'%';$(pre+'Deck').textContent=p.deck.length;$(pre+'Grave').textContent=p.grave.length;if(side===0)$('myExile').textContent=p.exile.length;else $('enemyHand').textContent=p.hand.length;}
 $('roundLabel').textContent='TURN '+String(game.serial).padStart(2,'0');
 $('turnTitle').textContent=game.owner===0?'YOUR TURN':'OPPONENT TURN';
 $('turnTitle').style.color=game.owner===0?'#efc37e':'#ff9d9d';
 $('phaseLabel').textContent=game.stage==='main'?'전개 단계':game.stage==='combat'?'전투 단계':'결투 종료';
 renderBoard();
 $('myHand').innerHTML=mine.hand.map((id,i)=>cardHtml(C(id),i)).join('');
 $('handSize').textContent=mine.hand.length+' CARDS';
 $('battleLog').innerHTML=game.logs.slice(0,11).map(l=>'<div class="'+(l.kind==='my'?'my-log':l.kind==='enemy'?'enemy-log':l.kind==='important'?'important-log':'')+'">'+l.text+'</div>').join('');
 renderInspector();
 const yours=game.owner===0&&game.winner===null,selected=game.selected,unit=selected?.kind==='field'&&selected.side===0?allUnits(0).find(x=>x.uid===selected.uid):null;
 $('combatPhaseBtn').disabled=!yours||game.stage!=='main';
 $('mainPhaseBtn').disabled=!yours||game.stage!=='combat';
 $('endTurnBtn').disabled=!yours||game.stage!=='combat';
 $('attackCoreBtn').disabled=!yours||game.stage!=='combat'||!unit||unit.used||unit.frozen||unit.entered===game.serial||mine.clash?.uid===unit.uid||activeGuards(1).length>0;
 $('clashBtn').disabled=!yours||game.stage!=='main'||!unit||selected.zone!=='units'||mine.clash||mine.clashUsed;
 $('withdrawBtn').disabled=!yours||game.stage!=='main'||!unit||selected.zone!=='clash'||emptyUnitIndex(mine)<0;
 $('hint').textContent=game.owner!==0?'AI가 행동 중입니다. 대응 카드가 있으면 반응 창이 열립니다.':game.stage==='main'?'손패를 클릭해 강림/발동 · 몬스터를 클릭해 격돌존 진입':'아군 몬스터 선택 → 상대 몬스터 또는 본진 공격';
}
function selectHand(index){if(!game||game.owner!==0||game.stage!=='main'||game.winner!==null)return;if(game.selected?.kind==='hand'&&game.selected.index===index)humanPlay(index);else{game.selected={kind:'hand',index};render();}}
function selectField(side,zone,index){
 if(!game||game.winner!==null)return;
 const p=game.players[side],u=zone==='clash'?p.clash:p.units[index];if(!u)return;
 if(side===1){if(game.owner===0&&game.stage==='combat'&&game.selected?.kind==='field')humanAttack(false,zone,index);else{toast(u?cardName(u.cid)+' · 공격 '+u.atk+' / 내구 '+u.hp:'');}return;}
 if(game.owner!==0)return;
 if(game.selected?.uid===u.uid)game.selected=null;else game.selected={kind:'field',side:0,zone,index,uid:u.uid};
 render();
}
function enterClash(){const s=game?.selected;if(!s||game.owner!==0||game.stage!=='main')return;const u=allUnits(0).find(x=>x.uid===s.uid);if(u&&moveToClash(0,u)){game.selected=null;render();}else toast('격돌존 진입 조건을 확인하세요.');}
function withdraw(){if(game?.owner===0&&game.stage==='main'&&retreat(0)){game.selected=null;render();}}
function renderFactionLobby(){
 $('factionGrid').innerHTML=DATA.factions.map((f,i)=>'<button class="faction-tile '+(i===pickedFaction?'active':'')+'" style="--fcolor:'+f.color+'" data-faction="'+i+'"><span class="f-glyph">'+f.glyph+'</span><b>'+f.name+'</b><small>'+f.short+'</small></button>').join('');
 const f=F(pickedFaction);$('factionDetail').style.setProperty('--fcolor',f.color);
 $('factionDetail').innerHTML='<div><strong>'+f.name+'</strong><p>'+f.trait+'</p></div><div class="tier-text">'+f.tiers.join('<br>↓<br>')+'</div>';
 $('deckCount').textContent=getSaved(pickedFaction).length+' / 40';
}
function openDeck(){editDeckList=getSaved(pickedFaction).slice();filterType='all';searchText='';$('cardSearch').value='';$('typeFilter').value='all';$('deckOverlay').classList.remove('hidden');renderCatalog();}
function deckQty(cid){return editDeckList.filter(x=>x===cid).length;}
function renderCatalog(){
 const f=pickedFaction,query=searchText.toLowerCase();
 const cards=DATA.cards.filter(c=>(c.faction===-1||c.faction===f)&&(filterType==='all'||c.type===filterType)&&c.name.toLowerCase().includes(query));
 $('cardCatalog').innerHTML=cards.map(c=>{const count=deckQty(c.id),fc=c.faction===-1?{glyph:'◇',color:'#d6c491'}:F(c.faction);return'<div class="catalog-row" style="--c:'+fc.color+'"><div class="catalog-art">'+fc.glyph+'</div><div class="catalog-info"><b title="'+c.name+'">'+c.name+'</b><small>'+(c.tier||typeK[c.type])+' · '+c.rarity+' · '+(c.type==='unit'?c.atk+' / '+c.hp:c.desc)+'</small></div><div class="catalog-buttons"><button data-minus="'+c.id+'" '+(count===0?'disabled':'')+'>−</button><b>'+count+'</b><button data-plus="'+c.id+'" '+(count===3||editDeckList.length>=40?'disabled':'')+'>+</button></div></div>';}).join('');
 $('deckCurrent').textContent=editDeckList.length+' / 40';
 $('deckWarning').textContent=editDeckList.length===40?'대전용 40장 덱이 완성되었습니다.':'40장이 되도록 카드를 조정해 주세요.';
 $('saveDeck').disabled=!DATA.isValidDeck(editDeckList,f);
}
function onEvent(){
 $('factionGrid').addEventListener('click',ev=>{const b=ev.target.closest('[data-faction]');if(!b)return;pickedFaction=Number(b.dataset.faction);renderFactionLobby();});
 $('startGame').addEventListener('click',initGame);
 $('editDeck').addEventListener('click',openDeck);
 $('closeDeck').addEventListener('click',()=>$('deckOverlay').classList.add('hidden'));
 $('cardSearch').addEventListener('input',ev=>{searchText=ev.target.value;renderCatalog();});
 $('typeFilter').addEventListener('change',ev=>{filterType=ev.target.value;renderCatalog();});
 $('cardCatalog').addEventListener('click',ev=>{
  const plus=ev.target.closest('[data-plus]'),minus=ev.target.closest('[data-minus]');
  if(plus&&editDeckList.length<40&&deckQty(plus.dataset.plus)<3)editDeckList.push(plus.dataset.plus);
  if(minus){const n=editDeckList.indexOf(minus.dataset.minus);if(n>=0)editDeckList.splice(n,1);}
  renderCatalog();
 });
 $('resetDeck').addEventListener('click',()=>{editDeckList=DATA.makeDeck(pickedFaction);renderCatalog();});
 $('saveDeck').addEventListener('click',()=>{if(!DATA.isValidDeck(editDeckList,pickedFaction))return;saveDeck(pickedFaction,editDeckList);$('deckOverlay').classList.add('hidden');renderFactionLobby();toast('덱 저장 완료 · 40장');});
 $('myHand').addEventListener('click',ev=>{const b=ev.target.closest('[data-hand]');if(b)selectHand(Number(b.dataset.hand));});
 const clickField=ev=>{
  const s=ev.target.closest('[data-side]');if(s)selectField(Number(s.dataset.side),s.dataset.zone,Number(s.dataset.index));
  const sp=ev.target.closest('[data-spell-index]');if(sp){const p=game.players[Number(sp.dataset.spellSide)],c=p.spells[Number(sp.dataset.spellIndex)];if(c)toast(Number(sp.dataset.spellSide)===1&&c.faceDown?'상대의 세트 카드':cardName(c.cid));}
 };
 ['enemyUnits','myUnits','enemyClash','myClash','enemySpells','mySpells'].forEach(id=>$(id).addEventListener('click',clickField));
 $('inspector').addEventListener('click',ev=>{const b=ev.target.closest('[data-inspect-action]');if(!b)return;const a=b.dataset.inspectAction;if(a==='play')humanPlay(game.selected.index);if(a==='clash')enterClash();if(a==='retreat')withdraw();if(a==='core')humanAttack(true);});
 $('attackCoreBtn').addEventListener('click',()=>humanAttack(true));
 $('clashBtn').addEventListener('click',enterClash);
 $('withdrawBtn').addEventListener('click',withdraw);
 $('combatPhaseBtn').addEventListener('click',()=>{if(game?.owner===0&&game.stage==='main')setPhase('combat');});
 $('mainPhaseBtn').addEventListener('click',()=>{if(game?.owner===0&&game.stage==='combat')setPhase('main');});
 $('endTurnBtn').addEventListener('click',()=>{if(game?.owner===0&&game.stage==='combat')finishTurn(0);});
 $('reactionPass').addEventListener('click',endReaction);
 $('surrenderBtn').addEventListener('click',()=>{if(game&&game.winner===null&&confirm('정말 기권하시겠습니까?'))finishGame(1,'기권');});
 $('rematchBtn').addEventListener('click',initGame);
 $('backLobbyBtn').addEventListener('click',()=>{$('resultOverlay').classList.add('hidden');$('gameScreen').classList.add('hidden');$('lobbyScreen').classList.remove('hidden');renderFactionLobby();});
 document.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'&&(!$('deckOverlay').classList.contains('hidden')))$('deckOverlay').classList.add('hidden');
  if(ev.key==='Enter'&&pendingReact)endReaction();
 });
}
renderFactionLobby();onEvent();
// Lightweight public diagnostic hook for smoke testing card/deck constraints.
window.DimensionWar={data:DATA,getState:()=>game,validateDeck:DATA.isValidDeck};
})();
