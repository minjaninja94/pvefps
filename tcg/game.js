/* Dimension War TCG · playable single-player rules prototype
   Rules source: tcg/README.md v5.0. Unspecified timings are local alpha choices. */
(() => {
'use strict';
const DATA=window.TCG_DATA;
const PROGRESS=window.TCG_PROGRESS;
const ACCOUNTS=window.TCG_ACCOUNTS;
const COMBO=window.TCG_COMBO;
const AUDIO=window.TCG_AUDIO||{init(){},start(){},hit(){},toggleMusic(){return false;},toggleSfx(){return false;}};
const NEW_ART=new Set(window.TCG_NEW_ART||[]);
if(!DATA)throw new Error('Missing card registry');
const $=id=>document.getElementById(id), C=id=>DATA.byId[id];
const F=id=>DATA.factions[id];
const clone=a=>a.slice();
const shuffle=a=>{const b=clone(a);for(let i=b.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
const random=n=>Math.floor(Math.random()*n);
const within=(x,low,high)=>Math.max(low,Math.min(high,x));
const other=s=>1-s;
const typeK={unit:'몬스터',tactic:'마법',reaction:'함정',gear:'장비 마법'};
const readyLabel={summon:'소환 가능',effect:'효과 사용 가능',ace:'에이스 강림 가능'};
const goldKey=ACCOUNTS.key('dw-tcg-gold-cards');
const goldCards=new Set();
try {
 const saved=JSON.parse(localStorage.getItem(goldKey)||'[]');
 if(Array.isArray(saved))for(const id of saved)if(DATA.byId[id])goldCards.add(id);
} catch {}
function usesGold(id){return !!PROGRESS.state.gold[id]&&(goldCards.has(id)||!PROGRESS.state.owned[id]);}
let previewCardId=null;

function cardArtwork(card,glyph,{animate=true,lazy=false,gold=usesGold(card.id)}={}){
 const file=encodeURIComponent(card.artRef&&!NEW_ART.has(card.id)?card.artRef:card.id)+'.webp';
 const motion=gold&&animate?'<source media="(prefers-reduced-motion: no-preference)" srcset="art/gold/'+file+'">':'';
 return '<span class="art-placeholder" aria-hidden="true">'+glyph+'</span><picture class="card-picture">'+motion+
  '<img alt="" src="art/normal/'+file+'"'+(lazy?' loading="lazy"':'')+' decoding="async"></picture>';
}
function cardTypeLine(card){return typeK[card.type]+(card.tier?' · '+card.tier:'');}
function cardRules(card){
 if(card.rank===2){
  const style=COMBO.factions[card.faction];
  return '<div class="rules-box ace-rules"><strong>'+style.name+' · '+['결전','수호','진형','추격','소재','보급','전술','봉쇄','격돌','압박','재생'][aceBonus(card)]+'</strong><p>'+style.aceRule+'</p><strong>'+style.power+' · 소재 1장</strong><p>등장 다음 턴부터 내 턴에 1회. '+style.powerRule+' 추가로 '+aceBonusText[aceBonus(card)]+'.</p></div>';
 }
 const a=card.ability;
 const flag={royal:'어명',performance:'공연',device:'차원 장치'}[card.flag];
 const heading=a?'<strong>'+a.name+'</strong><span class="rule-timing">'+a.timing+'</span>':'<strong>'+typeK[card.type]+' 효과'+(flag?' · '+flag:'')+'</strong>';
 const style=COMBO.factions[card.faction];
 const signature=card.effectProfile?'<p class="signature-rule">'+card.profileText+'</p>':'';
 const hold=card.holdAbility?'<p class="hold-rule"><b>격돌 유지 · '+card.holdAbility.timing+'</b> '+card.holdAbility.rules+'</p>':'';
 const extender=COMBO.relay(card)?'<div class="combo-rule"><strong>'+style.relay+'</strong><p>손패 특수 소환 · '+style.relayRule+' 이번 턴 서치가 2회 미만이면 추가 연계 카드 1장 서치.</p></div>':
  COMBO.opener(card)?'<div class="combo-rule"><strong>'+style.opening+'</strong><p>등장 시 덱에서 같은 진영의 연계 카드 1장을 서치. 연계 서치는 턴당 최대 2회.</p></div>':'';
 return '<div class="rules-box">'+heading+'<p>'+(a?.rules??card.desc)+'</p>'+signature+hold+extender+'</div>';
}

function showArtPreview(id,variant){
 const card=C(id),faction=F(card.faction),gold=variant??usesGold(id),dialog=$('artPreview');
 previewCardId=id;
 $('artPreviewTitle').textContent=card.name;
 $('artPreviewFrame').dataset.cardType=card.type;
 $('artPreviewRules').innerHTML='<div class="preview-card-meta"><span>'+cardTypeLine(card)+'</span><span>'+card.rarity+(card.type==='unit'?' · 공격 '+card.atk+' / 내구 '+card.hp:'')+'</span></div>'+cardRules(card);
 $('artPreviewImage').innerHTML=cardArtwork(card,faction?.glyph||'◇',{gold});
 $('artPreviewImage').classList.toggle('gold-art',gold);
 $('artPreviewGold').setAttribute('aria-pressed',String(gold));
 $('artPreviewGold').disabled=!PROGRESS.state.gold[id]||!PROGRESS.state.owned[id];
 $('artPreviewGold').textContent=!PROGRESS.state.gold[id]?'황금판은 팩에서 획득':!PROGRESS.state.owned[id]?'황금판 보유':gold?'일반판 보기':'황금판 사용';
 if(!dialog.open)dialog.showModal();
}
let pickedFaction=0,editDeckList=[],editAceList=[],filterType='all',searchText='',deckSort='recent',hideGeneric=false;
let game=null,uidCounter=0,gameCounter=0,pendingReact=null,toastTimer=0,aiBusy=false,tutorialMatch=false,tutorialStep=0;
function getSaved(f){try{const x=JSON.parse(localStorage.getItem(ACCOUNTS.key('dw-tcg-deck-'+f))||'null');if(PROGRESS.hasDeck(x,f))return x;}catch{}return PROGRESS.suggested(f);}
function saveDeck(f,arr){try{localStorage.setItem(ACCOUNTS.key('dw-tcg-deck-'+f),JSON.stringify(arr));}catch{}}
function getAceDeck(f){
 const legal=id=>C(id)?.faction===f&&C(id).rank===2&&PROGRESS.owned(id)>0;
 try{const x=JSON.parse(localStorage.getItem(ACCOUNTS.key('dw-tcg-aces-'+f))||'null');if(Array.isArray(x))return [...new Set(x.filter(legal))].slice(0,COMBO.maxAces);}catch{}
 return DATA.cards.filter(c=>legal(c.id)).sort((a,b)=>Number(b.rarity==='LR')-Number(a.rarity==='LR')).slice(0,COMBO.maxAces).map(c=>c.id);
}
function saveAces(f,aces){try{localStorage.setItem(ACCOUNTS.key('dw-tcg-aces-'+f),JSON.stringify(aces));}catch{}}
function log(text,kind='info'){if(!game)return;game.logs.unshift({text,kind});game.logs.length=Math.min(game.logs.length,28);}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2100);}
function setTutorialStep(step){
 if(!tutorialMatch)return;tutorialStep=step;
 const copy=[
  ['1 · 첫 소환','손패에서 이름이 다른 하수 몬스터를 골라 필드에 배치하세요. 튜토리얼 손패를 준비해 두었습니다.'],
  ['2 · 덱 서치','서치 창에서 다음에 전개할 카드를 직접 고르세요. 선택한 카드만 덱에서 손패로 옵니다.'],
  ['3 · 특수 소환','방금 가져온 연계 몬스터를 손패에서 다시 내세요. 조건을 만족하면 기본 소환을 소비하지 않습니다.'],
  ['4 · 후속 연계','두 번째 서치에서는 중수 몬스터나 진영 지원을 고를 수 있습니다. 골라 온 중수를 특수 소환해 보세요.'],
  ['5 · 턴 넘기기','전개를 마쳤으면 중앙의 턴 종료를 눌러 AI의 대응을 확인하세요.'],
  ['6 · AI의 대응','AI가 짧게 전개하고 턴을 마칩니다. AI가 한 번 행동하면 다시 내 턴으로 돌아옵니다.'],
  ['7 · 전투 준비','AI 턴이 끝났습니다. 중앙의 전투 진입 버튼을 눌러 전투 단계를 여세요.'],
  ['8 · 공격하기','아군 몬스터를 선택하고 상대 몬스터나 본진을 눌러 공격하세요. 새로 소환한 몬스터는 다음 턴부터 공격합니다.'],
  ['완료','짧은 대전에서 배치, 서치, 특수 소환, 전투를 익혔습니다. 상대 본진을 쓰러뜨리면 보상을 받습니다.'],
 ];
 const [title,description]=copy[Math.min(step,copy.length-1)];
 $('tutorialGuideTitle').textContent=title;$('tutorialGuideText').textContent=description;$('tutorialGuide').classList.remove('hidden');
}
const newComboTurn=()=>({special:0,searches:0,names:new Set(),spells:new Set(),lateral:0,lastSlot:null,echo:false});
function makePlayer(side,f,deck,aces=[]){return{side,faction:f,hp:100,deck:shuffle(deck),aces:[...aces],hand:[],grave:[],exile:[],units:[null,null,null,null,null],spells:[null,null,null,null,null],clash:null,basicUsed:false,clashUsed:false,flags:{occupyBlock:false,shield:0},metrics:{seen:new Set(),tactics:new Set(),movement:0,turnMoves:0,turnSummons:0,traitUsed:false,turnTactics:0,lateral:0,occupies:0},combo:newComboTurn(),ownTurns:0};}
function allUnits(side){const p=game.players[side];return p.units.filter(Boolean).concat(p.clash?[p.clash]:[]);}
function emptyUnitIndex(p){return p.units.findIndex(x=>!x);}
function cardName(id){return C(id)?.name||'알 수 없는 카드';}
function setPhase(phase){game.stage=phase;game.selected=null;game.viewedEnemy=null;game.pendingTarget=null;log(phase==='combat'?'전투 단계 진입':'전개 단계 진입','important');render();}
function draw(side,n=1){const p=game.players[side];for(let k=0;k<n;k++){if(!p.deck.length){p.flags.fatigue=(p.flags.fatigue||0)+1;applyCoreDamage(side,4*p.flags.fatigue,'덱 소진');if(game.winner!==null)return;continue;}p.hand.push(p.deck.pop());}if(n&&game.winner===null)log((side===0?'플레이어':'AI')+'가 '+n+'장 드로우',side===0?'my':'enemy');}
function playCardFlight(side,id,handIndex,target){
 const portal=$('battleVfx');if(!portal||typeof document.querySelector!=='function'||typeof document.createElement!=='function')return;
 const source=side===0?document.querySelector('#myHand [data-hand="'+handIndex+'"]'):document.querySelector('.opponent-hud');
 const destination=target||document.querySelector('.field');if(!destination)return;
 const from=source?.getBoundingClientRect?.(),to=destination.getBoundingClientRect?.();if(!to)return;
 const card=C(id),node=document.createElement('div');node.className='vfx-card-flight';
 node.innerHTML='<img alt="" src="art/normal/'+encodeURIComponent(card.artRef&&!NEW_ART.has(id)?card.artRef:id)+'.webp"><b>'+card.name+'</b>';
 const sx=from?.left??to.left+to.width/2-46,sy=from?.top??(side===1?24:to.top+to.height-140),sw=from?.width??92,sh=from?.height??132;
 node.style.left=sx+'px';node.style.top=sy+'px';node.style.width=sw+'px';node.style.height=sh+'px';portal.append(node);
 const dx=to.left+to.width/2-(sx+sw/2),dy=to.top+to.height/2-(sy+sh/2),scale=Math.min(to.width/sw,to.height/sh,1.15);
 const animation=node.animate?.([{transform:'translate(0,0) scale(1) rotate(0deg)',opacity:1},{transform:'translate('+dx+'px,'+dy+'px) scale('+scale+') rotate('+((side===0?-1:1)*5)+'deg)',opacity:.12}],{duration:560,easing:'cubic-bezier(.16,.82,.22,1)',fill:'forwards'});
 if(animation)animation.onfinish=()=>node.remove();else setTimeout(()=>node.remove(),600);
}
function playAttackLunge(unit,target){
 if(typeof document.querySelector!=='function')return;
 const source=document.querySelector('[data-uid="'+unit.uid+'"]'),portal=$('battleVfx');if(!source||!target||!portal)return;
 const from=source.getBoundingClientRect(),to=target.getBoundingClientRect(),ghost=source.cloneNode(true);
 ghost.classList.add('vfx-attacker');ghost.style.left=from.left+'px';ghost.style.top=from.top+'px';ghost.style.width=from.width+'px';ghost.style.height=from.height+'px';portal.append(ghost);
 const dx=to.left+to.width/2-(from.left+from.width/2),dy=to.top+to.height/2-(from.top+from.height/2);
 const animation=ghost.animate?.([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+dx+'px,'+dy+'px) scale(1.18)',opacity:1,offset:.62},{transform:'translate('+dx*.82+'px,'+dy*.82+'px) scale(.92)',opacity:.65}],{duration:360,easing:'cubic-bezier(.18,.8,.2,1)',fill:'forwards'});
 if(animation)animation.onfinish=()=>ghost.remove();else setTimeout(()=>ghost.remove(),380);
}
function playImpact(element,amount,kind='hit'){
 AUDIO.hit(amount);
 const portal=$('battleVfx'),screen=$('gameScreen');if(!portal||!element?.getBoundingClientRect)return;
 const rect=element.getBoundingClientRect(),big=amount>=10,blast=amount>=15;
 const fx=document.createElement('div');fx.className='vfx-impact '+(blast?'blast':big?'heavy':'light');
 fx.style.left=(rect.left+rect.width/2)+'px';fx.style.top=(rect.top+rect.height/2)+'px';
 fx.innerHTML='<i></i><b>'+(blast?'펑!!!!':big?'쾅!!!':'팍!')+'</b><strong>−'+Math.max(0,amount)+'</strong>'+(blast?'<small>와아아우!</small>':'');portal.append(fx);
 setTimeout(()=>fx.remove(),1050);
 if(big){screen?.classList.add('screen-hit');setTimeout(()=>screen?.classList.remove('screen-hit'),430);}
 if(kind==='core')element.classList.add('base-impact');
 setTimeout(()=>element.classList.remove('base-impact'),480);
}
function applyCoreDamage(side,amount,source='공격'){if(!game||game.winner!==null)return;const p=game.players[side];const raw=Math.max(0,amount);const dmg=p.flags.shield>0?(p.flags.shield--,0):raw;const base=$((side===0?'my':'enemy')+'BasePlate');if(dmg)playImpact(base,dmg,'core');p.hp=within(p.hp-dmg,0,100);log(source+' → '+(side===0?'플레이어':'AI')+' 생명력 '+(dmg?'−'+dmg:'방어 성공'),dmg?'important':'info');if(p.hp<=0)finishGame(other(side),source);}
function heal(side,n){const p=game.players[side],was=p.hp;p.hp=within(p.hp+n,0,100);if(p.hp>was)log((side===0?'아군':'상대')+' 생명력 +'+(p.hp-was),side===0?'my':'enemy');}
function makeUnit(cid){const card=C(cid);return{cid,uid:++uidCounter,atk:card.atk,hp:card.hp,maxHp:card.hp,used:false,entered:game.serial,clashEntered:-1,guard:false,ward:false,frozen:false,damageBlocked:false};}
function removeUnit(side,unit,destination='grave'){
 const p=game.players[side],index=p.units.findIndex(x=>x&&x.uid===unit.uid);
 if(index>=0)p.units[index]=null;else if(p.clash?.uid===unit.uid)p.clash=null;else return false;
 const id=unit.originCid||unit.cid;
 if(destination==='hand')(unit.ace?p.aces:p.hand).push(id);
 if(destination==='exile')p.exile.push(id);
 if(destination==='grave')p.grave.push(id);
 if(destination!=='material'&&unit.materials?.length){p.grave.push(...unit.materials.map(m=>m.id));unit.materials=[];}
 for(let i=0;i<p.spells.length;i++){if(p.spells[i]?.target===unit.uid){p.grave.push(p.spells[i].cid);p.spells[i]=null;}}
 if(destination==='grave'&&unit.token&&p.faction===5&&!p.flags.tokenReplacement){
  const slot=emptyUnitIndex(p);
  if(slot>=0){const token=makeUnit('f5u0');token.token=true;token.atk=2;token.hp=token.maxHp=4;p.units[slot]=token;p.flags.tokenReplacement=true;if(side===0)PROGRESS.count('summon');log('심해 군체 특성 · 첫 토큰 파괴로 유생체 생성',side===0?'important':'enemy');}
 }
 log(cardName(unit.cid)+' → '+({grave:'데스존',hand:'손패',exile:'단절된 이계'}[destination]||'필드 이탈'),side===0?'my':'enemy');
 return true;
}
function wound(side,unit,damage,source){
 if(!unit||damage<=0||game.winner!==null||!allUnits(side).includes(unit))return;
 const amount=unit.ward?(unit.ward=false,Math.max(0,damage-5)):damage;
 const node=typeof document.querySelector==='function'?document.querySelector('[data-uid="'+unit.uid+'"]'):null;playImpact(node,amount);
 unit.hp-=amount;
 log(source+' · '+cardName(unit.cid)+' '+amount+' 피해',side===0?'my':'enemy');
 if(unit.hp<=0&&removeUnit(side,unit))triggerUnit('death',side,unit);
}
function abilityCondition(side,ability){
 if(!ability.condition)return true;
 const {key,value}=ability.condition,p=game.players[side];
 const current={seen:p.metrics.seen.size,summons:p.metrics.turnSummons,gears:p.metrics.gears||0,
  guarded:allUnits(side).filter(u=>u.guard).length,grave:p.grave.filter(id=>C(id)?.type==='unit').length,
  moved:p.metrics.movement,spells:p.metrics.tactics.size,life:p.hp,handLow:p.hand.length}[key];
 return key==='life'||key==='handLow'?current<=value:current>=value;
}
function signatureReady(side,card,event){
 const profile=card.effectProfile;if(!profile)return false;
 const p=game.players[side],enemy=game.players[other(side)],units=allUnits(side),foes=allUnits(other(side));
 const gates={
  hand4:()=>p.hand.length>=4,hand2:()=>p.hand.length<=2,allies2:()=>units.length>=2,ally1:()=>units.length===1,
  foes2:()=>foes.length>=2,foe1:()=>foes.length<=1,grave2:()=>p.grave.filter(id=>C(id)?.type==='unit').length>=2,
  life60:()=>p.hp<=60,foeLife60:()=>enemy.hp<=60,myClash:()=>!!p.clash,foeClash:()=>!!enemy.clash,
  spells2:()=>p.spells.filter(Boolean).length>=2,tactics2:()=>p.metrics.turnTactics>=2,turn3:()=>p.ownTurns>=3,
  injured:()=>units.some(u=>u.hp<u.maxHp),occupy:()=>p.metrics.occupies>0
 };
 return !!gates[profile.gate]?.();
}
function applySignature(side,card,target,event){
 const profile=card.effectProfile;if(game.winner!==null||!profile||!signatureReady(side,card,event))return;
 const p=game.players[side],foes=allUnits(other(side)),friends=allUnits(side),power=profile.power;
 switch(profile.action){
  case'repair':{const u=(target&&friends.includes(target)?target:null)||p.clash||friends.filter(x=>x.hp<x.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(u)u.hp=Math.min(u.maxHp,u.hp+power);break;}
  case'draw':draw(side,1);break;
  case'atk':{const u=(target&&friends.includes(target)?target:null)||friends.slice().sort((a,b)=>b.atk-a.atk)[0];if(u)u.atk+=power;break;}
  case'core':applyCoreDamage(other(side),power,card.name+' 고유 연계');break;
  case'weaken':{const u=foes.slice().sort((a,b)=>b.atk-a.atk)[0];if(u)u.atk=Math.max(1,u.atk-power);break;}
  case'restore':heal(side,power);repairAll(side,power);break;
  case'shield':p.flags.shield++;break;
  case'recover':{const i=p.grave.findIndex(id=>C(id)?.type==='unit'&&C(id)?.rank===0);if(i>=0)p.hand.push(p.grave.splice(i,1)[0]);break;}
 }
 log(card.name+' 고유 연계 효과 발동',side===0?'important':'enemy');
}
function triggerUnit(event,side,unit,target){
 const card=C(unit.cid),ability=event==='hold'?(card.holdAbility||card.ability):card.ability;
 if(unit.ace||game.winner!==null||!ability||ability.event!==event||(event!=='death'&&!allUnits(side).includes(unit))||!abilityCondition(side,ability))return;
 const p=game.players[side], foeSide=other(side);
 if(event==='spell'||event==='gear'){
  if(unit.lastAbilityTurn===game.serial)return;
  unit.lastAbilityTurn=game.serial;
 }
 const cost=ability.actions[0];
 if(cost[0]==='pay'&&p.hp<=cost[1])return;
 log(cardName(unit.cid)+' · '+ability.name,side===0?'my':'enemy');
 for(const [op,arg,amount] of ability.actions){
  if(game.winner!==null)break;
  if(op==='pay'){p.hp-=arg;continue;}
  if(op==='draw'){draw(side,arg);continue;}
  if(op==='healCore'){heal(side,arg);continue;}
  if(op==='core'){applyCoreDamage(foeSide,arg,ability.name);continue;}
  if(op==='shield'){p.flags.shield+=arg;continue;}
  if(op==='recover'){
   for(let n=0;n<amount;n++){
    const i=p.grave.findIndex(id=>arg==='basic'?C(id)?.rank===0:C(id)?.type===arg);
    if(i<0)break;
    p.hand.push(p.grave.splice(i,1)[0]);
   }
   continue;
  }
  const friends=allUnits(side), foes=allUnits(foeSide);
  const candidates={
   self:()=>friends.includes(unit)?[unit]:[], ally:()=>friends.filter(u=>u!==unit).sort((a,b)=>a.hp-b.hp).slice(0,1),
   all:()=>friends,allAllies:()=>friends.filter(u=>u!==unit),
   weak:()=>foes.sort((a,b)=>a.hp-b.hp).slice(0,1),strong:()=>foes.sort((a,b)=>b.atk-a.atk).slice(0,1),
   clashFoe:()=>foes.filter(u=>u===game.players[foeSide].clash),allFoes:()=>foes,target:()=>foes.filter(u=>u===target),
  }[arg]();
  for(const u of candidates){
   switch(op){
    case'atk':u.atk+=amount;break;
    case'weaken':u.atk=Math.max(1,u.atk-amount);break;
    case'repair':u.hp=Math.min(u.maxHp,u.hp+amount);break;
    case'damage':wound(foeSide,u,amount,ability.name);break;
    case'guard':u.guard=true;break;
    case'ward':u.ward=true;break;
    case'freeze':u.frozen=true;break;
   }
  }
 }
 applySignature(side,card,target,event);
}
function triggerBoard(event,side){for(const u of allUnits(side))triggerUnit(event,side,u);}
function moveToClash(side,unit,fromEffect=false){
 const p=game.players[side];if(p.clash||(!fromEffect&&p.clashUsed))return false;
 const i=p.units.findIndex(x=>x?.uid===unit.uid);if(i<0)return false;
 p.units[i]=null;p.clash=unit;unit.clashEntered=game.serial;unit.used=true;p.clashUsed=true;p.metrics.movement++;p.metrics.turnMoves++;
 log(cardName(unit.cid)+' 격돌존 진입',side===0?'my':'enemy');
 if(side===0)PROGRESS.count('clash');
 moveTrait(side);triggerUnit('in',side,unit);return true;
}
function retreat(side){const p=game.players[side];if(!p.clash||emptyUnitIndex(p)<0)return false;const u=p.clash;p.clash=null;p.units[emptyUnitIndex(p)]=u;u.used=true;p.metrics.movement++;p.metrics.turnMoves++;log(cardName(u.cid)+' 격돌존 철수',side===0?'my':'enemy');moveTrait(side);triggerUnit('out',side,u);return true;}
function moveTrait(side){const p=game.players[side];if(p.faction===6&&p.metrics.turnMoves===1){draw(side,1);if(p.hand.length>5){p.grave.push(p.hand.shift());log('성운 항해단 특성: 과잉 손패 1장 순환','important');}else log('성운 항해단 특성: 첫 위치 이동 · 1장 드로우','important');}}
function relaySlots(side){
 const p=game.players[side];
 const anchors=p.combo.lastSlot!==null?[p.combo.lastSlot]:p.units.flatMap((u,i)=>u?[i]:[]);
 return [...new Set(anchors.flatMap(i=>[i-1,i+1]))].filter(i=>i>=0&&i<p.units.length&&!p.units[i]);
}
function specialCheck(side,card,slot){
 const p=game.players[side],own=allUnits(side),f=p.faction;
 if(p.combo.special>=COMBO.maxSpecial)return '이번 턴 특수 소환은 최대 3회입니다.';
 if(p.combo.names.has(card.id))return '같은 이름의 몬스터는 이 방식으로 턴당 한 번만 특수 소환할 수 있습니다.';
 if(card.rank===1&&!COMBO.relay(card))return own.length>=2||p.metrics.turnTactics>=1?null:'상급 특수 소환: 아군 2기 또는 이번 턴 마법 1회 해결 필요';
 if(!COMBO.relay(card))return '이 카드에는 손패 특수 소환 조건이 없습니다.';
 const hasOther=own.some(u=>u.cid!==card.id);
 const ready=[
  hasOther,hasOther,hasOther||p.spells.some(x=>x?.target!=null),
  p.hp>2&&(hasOther||p.grave.some(id=>C(id)?.faction===3&&C(id).type==='unit')),
  hasOther,own.some(u=>C(u.cid).faction===5&&C(u.cid).rank===0),
  relaySlots(side).some(i=>slot===undefined||slot===i),own.length>0||p.metrics.turnTactics>0,
 ][f];
 return ready?null:COMBO.factions[f].relayRule;
}
function summonMethod(side,card,method='auto'){
 if(method!=='auto')return method;
 return card.rank===0&&!game.players[side].basicUsed?'normal':'special';
}
function rankCheck(side,card,method='auto',slot){
 const p=game.players[side];
 if(!card||card.type!=='unit'||card.faction!==p.faction)return '내 진영의 몬스터 카드가 필요합니다.';
 if(card.rank===2)return '고수 몬스터는 에이스 존의 소재를 사용해 강림합니다.';
 if(emptyUnitIndex(p)<0||slot!==undefined&&(slot<0||slot>=p.units.length||p.units[slot]))return '빈 몬스터 슬롯이 필요합니다.';
 if(summonMethod(side,card,method)==='normal')return card.rank!==0?'하수 몬스터만 기본 배치할 수 있습니다.':p.basicUsed?'이번 턴 기본 배치를 이미 사용했습니다.':null;
 return specialCheck(side,card,slot);
}
function searchCandidates(side,unit,method){
 const p=game.players[side],card=C(unit.cid);
 if(p.combo.searches>=2||game.winner!==null||(!COMBO.opener(card)&&!(method==='special'&&COMBO.relay(card))))return[];
 const ownedIds=new Set([...p.hand,...allUnits(side).map(u=>u.cid),...p.combo.names]);
 const inDeck=id=>p.deck.includes(id)&&!ownedIds.has(id)&&id!==card.id;
 const summonable=c=>c?.type==='unit'&&c.faction===p.faction&&c.rank<2&&inDeck(c.id)&&!specialCheck(side,c,undefined);
 const relays=DATA.cards.filter(c=>c.faction===p.faction&&COMBO.relay(c)&&summonable(c));
 if(p.combo.searches===0)return relays.filter(c=>c.rank===0);
 const reserveType=({0:'royal',1:'performance',2:'gear',3:'reaction',4:'reaction',5:'reaction',6:'device',7:'tactic'})[p.faction];
 const reserve=DATA.cards.filter(c=>c.faction===p.faction&&inDeck(c.id)&&
  (reserveType==='royal'?c.flag==='royal'&&![...p.metrics.tactics].some(key=>C(key)?.flag==='royal'):
   reserveType==='performance'?c.flag==='performance':
   reserveType==='device'?c.flag==='device':c.type===reserveType&&(c.type!=='tactic'||!p.metrics.tactics.has(c.id))));
 const mids=DATA.cards.filter(c=>c.faction===p.faction&&c.type==='unit'&&c.rank===1&&summonable(c));
 return [...new Map([...relays,...mids,...reserve].map(c=>[c.id,c])).values()];
}
function chooseAiSearch(candidates,side){
 const p=game.players[side],unitCount=allUnits(side).length;
 return candidates.slice().sort((a,b)=>{
  const score=c=>c.type==='unit'?(c.rank===1&&unitCount>=2?100:c.rank===0&&COMBO.relay(c)?70:30):
   c.type==='gear'&&!allUnits(side).some(u=>!u.gear)?55:c.type==='tactic'?45:35;
  return score(b)-score(a)||b.atk-a.atk;
 })[0];
}
function searchRelay(side,unit,method){
 const p=game.players[side],card=C(unit.cid),candidates=searchCandidates(side,unit,method);
 if(!candidates.length)return;
 const searchNo=++p.combo.searches;
 if(side===0&&typeof document.querySelector==='function'){
  game.pendingSearch={side,source:card.id,candidates:candidates.map(c=>c.id),searchNo};
  $('searchTitle').textContent=searchNo===1?'연계 카드를 골라 서치':'후속 전개 카드를 골라 서치';
  $('searchReason').textContent=card.name+' · '+COMBO.factions[p.faction].opening+' 효과 ('+searchNo+'/2) — 덱에 남은 카드를 직접 선택하세요.';
  $('searchCandidates').innerHTML=candidates.map(c=>'<article class="search-option" style="--search-color:'+(F(c.faction)?.color||'#ddc184')+'"><img src="art/normal/'+encodeURIComponent(c.artRef&&!NEW_ART.has(c.id)?c.artRef:c.id)+'.webp" alt="" loading="lazy"><div><strong>'+c.name+'</strong><small>'+cardTypeLine(c)+' · '+c.rarity+(c.type==='unit'?' · ⚔ '+c.atk+' / ♥ '+c.hp:'')+'</small><p>'+c.desc+'</p></div><button type="button" class="primary-btn" data-search-choice="'+c.id+'">덱에서 가져오기</button></article>').join('');
  $('searchOverlay').classList.remove('hidden');return;
 }
 const choice=chooseAiSearch(candidates,side);
 if(choice)resolveSearchChoice(side,choice.id);
}
function resolveSearchChoice(side,id){
 const pending=game?.pendingSearch;
 if(!pending||pending.side!==side||!pending.candidates.includes(id))return false;
 const p=game.players[side],index=p.deck.indexOf(id);
 if(index<0){game.pendingSearch=null;$('searchOverlay').classList.add('hidden');render();return false;}
 p.hand.push(p.deck.splice(index,1)[0]);game.pendingSearch=null;
 $('searchOverlay').classList.add('hidden');
 log(cardName(pending.source)+' · '+COMBO.factions[p.faction].opening+' → '+cardName(id)+' 서치',side===0?'my':'enemy');
 if(side===0){PROGRESS.count('search');toast(cardName(id)+'을(를) 덱에서 가져왔습니다.');if(tutorialMatch)setTutorialStep(pending.searchNo===1?2:4);}
 render();return true;
}
function summon(side,handIndex,preferredSlot,method='auto'){
 const p=game.players[side],cid=p.hand[handIndex],card=C(cid);
 if(game.winner!==null||!card)return false;
 const way=summonMethod(side,card,method);
 const reason=rankCheck(side,card,way,preferredSlot);if(reason){if(side===0)toast(reason);return false;}
 const autoSlot=way==='special'&&p.faction===6&&COMBO.relay(card)?relaySlots(side)[0]:
  p.faction===1&&!p.units[2]?2:emptyUnitIndex(p);
 const slot=preferredSlot??autoSlot;
 const target=typeof document.querySelector==='function'?document.querySelector('[data-lane="units"][data-lane-side="'+side+'"][data-lane-index="'+slot+'"]'):null;
 playCardFlight(side,cid,handIndex,target);
 p.hand.splice(handIndex,1);const u=makeUnit(cid);p.units[slot]=u;
 if(way==='normal')p.basicUsed=true;
 else{
  p.combo.special++;p.combo.names.add(cid);
  if(p.faction===3&&COMBO.relay(card))p.hp-=2;
 }
 p.metrics.seen.add(cid);p.metrics.turnSummons++;
 if(tutorialMatch&&side===0){if(way==='normal'&&tutorialStep===0)setTutorialStep(1);else if(way==='special')setTutorialStep(card.rank===1?4:3);}
 if(p.faction===0&&p.metrics.seen.size>=2&&!p.metrics.traitUsed){u.atk+=2;p.metrics.traitUsed=true;log('조선 특성 발동: 공격력 +2','important');}
 if(p.faction===1&&p.metrics.turnSummons===3&&!p.metrics.traitUsed){draw(side,1);p.metrics.traitUsed=true;}
 log((way==='normal'?'기본 배치: ':'특수 소환: ')+card.name,side===0?'my':'enemy');
 if(side===0){PROGRESS.count('summon');if(way==='special')PROGRESS.count('special');}
 triggerUnit('enter',side,u);
 searchRelay(side,u,way);
 return true;
}
function reposition(side,uid,slot){
 const p=game.players[side],i=p.units.findIndex(u=>u?.uid===uid);
 if(game.winner!==null||game.owner!==side||game.stage!=='main'||![1,6].includes(p.faction)||p.combo.lateral>=(p.faction===6?2:1)||
   i<0||p.faction===1&&i!==2||!Number.isInteger(slot)||slot<0||slot>=p.units.length||Math.abs(i-slot)!==1||p.units[slot])return false;
 const u=p.units[i];p.units[i]=null;p.units[slot]=u;
 p.combo.lateral++;p.combo.lastSlot=slot;p.metrics.lateral++;p.metrics.movement++;
 p.metrics.turnMoves++;moveTrait(side);
 log(cardName(u.cid)+' · '+(p.faction===6?'항로 이동 ':'무대 이동 ')+(i+1)+' → '+(slot+1),side===0?'my':'enemy');
 searchRelay(side,u,'special');
 return true;
}
function raiseEcho(side){
 const p=game.players[side],slot=emptyUnitIndex(p);
 if(p.faction!==5||slot<0||p.combo.echo||p.ownTurns-(p.flags.echoTurn??-2)<3||p.combo.special>=COMBO.maxSpecial||game.winner!==null||game.owner!==side||game.stage!=='main')return false;
 const at=p.grave.findIndex(id=>C(id)?.type==='reaction');
 if(at<0)return false;
 const id=p.grave.splice(at,1)[0],u=makeUnit('f5u0');
 u.originCid=id;u.token=true;u.atk=2;u.hp=u.maxHp=4;p.units[slot]=u;
 p.combo.echo=true;p.combo.special++;p.metrics.turnSummons++;p.flags.echoTurn=p.ownTurns;
 if(side===0){PROGRESS.count('summon');PROGRESS.count('special');}
 log(cardName(id)+' → 함정 유생으로 특수 소환',side===0?'my':'enemy');
 return true;
}
function aceMaterials(side){
 const p=game.players[side],f=p.faction;
 const fields=allUnits(side).filter(u=>!u.ace&&C(u.cid)?.faction===f).sort((a,b)=>a.atk-b.atk);
 const battlefield=fields.map(unit=>({id:unit.originCid||unit.cid,unit,source:'전장'}));
 const inGrave=(test)=>p.grave.flatMap((id,index)=>test(C(id))?[{id,index,source:'데스존'}]:[]);
 const distinct=items=>items.filter((m,i)=>items.findIndex(n=>n.id===m.id)===i);
 const low=battlefield.filter(m=>C(m.unit.cid).rank===0);
 const graveUnits=inGrave(c=>c?.type==='unit'&&c.faction===f);
 switch(f){
  case 0:{
   if(![...p.metrics.tactics].some(id=>C(id)?.flag==='royal')||!battlefield.length)return [];
   const hand=p.hand.flatMap((id,index)=>C(id)?.faction===f&&C(id).type==='unit'&&C(id).rank<2?[{id,index,source:'손패'}]:[]);
   const pair=distinct([...battlefield,...hand]).slice(0,2);return pair.length===2?pair:[];
  }
  case 1:{
   const center=p.units[2],performance=[...p.metrics.tactics].some(id=>C(id)?.flag==='performance');
   if(!center&&!performance)return [];
   const pair=distinct([...battlefield.filter(m=>m.unit===center),...battlefield]).slice(0,2);
   return pair.length===2?pair:[];
  }
  case 2:{
   const index=p.spells.findIndex(s=>s?.target!=null&&C(s.cid)?.type==='gear');
   return battlefield.length>=1&&index>=0?[...battlefield.slice(0,2),{id:p.spells[index].cid,index,source:'장착'}]:[];
  }
  case 3:{
   if(!battlefield.length||p.hp<=4)return [];
   const at=p.hand.findIndex(id=>C(id)?.type==='unit'&&C(id).faction===3&&C(id).rank<2);
   const blood=graveUnits[0]||(at>=0?{id:p.hand[at],index:at,source:'손패'}:null);
   return blood?[battlefield[0],blood]:[];
  }
  case 4:{
   const roots=distinct(battlefield);
   return roots.length>=2?[...roots.slice(0,2),...graveUnits.slice(0,1)]:[];
  }
  case 5:{
   const trap=inGrave(c=>c?.type==='reaction')[0];
   const echo=low.find(m=>m.unit.originCid);
   if(echo&&low.length>=2)return [echo,low.find(m=>m!==echo)];
   if(trap&&low.length)return [low[0],trap];
   return low.length>=2?low.slice(0,2):[];
  }
  case 6:{
   const pair=distinct(battlefield).slice(0,2);return p.metrics.lateral&&pair.length===2?pair:[];
  }
  case 7:{
   if(allUnits(side).some(u=>u.ace))return [];
   const words=distinct(inGrave(c=>c?.type==='tactic')).slice(0,2),mages=distinct(battlefield).slice(0,2);
   return mages.length===2&&words.length===2?[...mages,...words]:[];
  }
  default:return [];
 }
}
function aceOptions(side){
 const p=game.players[side],materials=aceMaterials(side),style=COMBO.factions[p.faction];
 const slot=emptyUnitIndex(p);
 const freesSlot=materials.some(m=>p.units.includes(m.unit));
 const locked=game.owner!==side||game.stage!=='main'||game.winner!==null?'내 전개 단계에 강림할 수 있습니다.':
  p.combo.ace?'에이스 강림은 턴당 한 번입니다.':
  !materials.length?style.aceRule:slot<0&&!freesSlot?'일반 몬스터 슬롯이 필요합니다.':null;
 return p.aces.map(id=>({id,reason:locked,materials}));
}
function takeAceMaterials(side,materials){
 const p=game.players[side];
 const ordered=[...materials].sort((a,b)=>(b.index??-1)-(a.index??-1));
 for(const entry of ordered){
  switch(entry.source){
   case'손패':p.hand.splice(entry.index,1);break;
   case'데스존':p.grave.splice(entry.index,1);break;
   case'장착':{
    const gear=p.spells[entry.index],target=allUnits(side).find(u=>u.uid===gear.target);
    p.spells[entry.index]=null;
    if(target&&!materials.some(m=>m.unit===target)){
     if(C(gear.cid).effect==='power')target.atk=Math.max(1,target.atk-3);
     else{target.maxHp=Math.max(1,target.maxHp-5);target.hp=Math.min(target.hp,target.maxHp);}
    }
    break;
   }
   case'전장':removeUnit(side,entry.unit,'material');break;
  }
 }
 return materials.map(({id,source})=>({id,source}));
}
function summonAce(side,id,preferredSlot){
 const p=game.players[side],option=aceOptions(side).find(c=>c.id===id);
 if(!option||option.reason)return false;
 if(preferredSlot!==undefined&&(!Number.isInteger(preferredSlot)||preferredSlot<0||preferredSlot>=p.units.length||
   p.units[preferredSlot]&&!option.materials.some(m=>m.unit===p.units[preferredSlot])))return false;
 const materials=takeAceMaterials(side,option.materials);
 const slot=preferredSlot??emptyUnitIndex(p),target=typeof document.querySelector==='function'?document.querySelector('[data-lane="units"][data-lane-side="'+side+'"][data-lane-index="'+slot+'"]'):null;
 playCardFlight(side,id,-1,target);
 if(p.faction===3)p.hp-=4;
 p.aces.splice(p.aces.indexOf(id),1);
 const u=makeUnit(id);u.ace=true;u.materials=materials;
 p.units[slot]=u;p.combo.ace=true;p.metrics.seen.add(id);p.metrics.turnSummons++;
 if(side===0){PROGRESS.count('summon');PROGRESS.count('high');}
 log(COMBO.factions[p.faction].name+' · '+cardName(id)+' 강림 ['+materials.map(m=>cardName(m.id)).join(' + ')+']','important');
 return true;
}
function cancelAce(side,id){
 const p=game.players[side],index=p.aces.indexOf(id);if(index<0)return;
 p.grave.push(p.aces.splice(index,1)[0]);p.combo.ace=true;
 log(cardName(id)+'의 강림이 함정으로 무효화되었습니다.','important');
}
function humanSummonAce(id){
 if(!game||game.owner!==0||game.stage!=='main')return;
 const option=aceOptions(0).find(x=>x.id===id);
 if(!option||option.reason){if(option?.reason)toast(option.reason);return;}
 const event=aiReaction({type:'summon',cid:id,canceled:false,description:cardName(id)+' 에이스 강림'});
 if(game.winner!==null)return;
 if(event.canceled)cancelAce(0,id);else summonAce(0,id);
 game.selected=null;game.pendingTarget=null;game.viewedEnemy=null;render();
}
const aceBonusText=['자신의 내구도 2 회복','내 본진 생명력 2 회복 · 아군 내구도 1 회복','최저 내구도 다른 아군 공격력 +1','상대 본진 추가 피해 2','자신에게 피해 흡수 보호막','데스존 첫 함정 회수','카드 1장 추가 드로우','상대 최저 내구도 몬스터 공격 봉쇄','격돌 몬스터 공격력 +2 · 내구도 2 회복 (없으면 강제 진입)','상대 격돌 몬스터 공격력 -2 (없으면 본진 피해 2)','격돌 중이면 상대 본진 피해 3 · 아군 격돌 몬스터 내구도 1 회복 (없으면 방패 1회)'];
function aceBonus(card){return card.aceProfile??0;}
function canActivateAce(side,u){
 return !!(game.winner===null&&game.owner===side&&u?.ace&&u.materials.length&&u.entered!==game.serial&&u.lastAcePower!==game.serial&&allUnits(side).includes(u));
}
function activateAce(side,uid,materialIndex){
 const p=game.players[side],enemySide=other(side),u=allUnits(side).find(unit=>unit.uid===uid);
 if(!canActivateAce(side,u))return false;
 const preferred={2:'gear',5:'reaction',7:'tactic'}[p.faction];
 const index=materialIndex??Math.max(0,u.materials.findIndex(m=>C(m.id)?.type===preferred));
 if(!Number.isInteger(index)||index<0||index>=u.materials.length)return false;
 const [spent]=u.materials.splice(index,1),style=COMBO.factions[p.faction],type=C(spent.id).type;
 p.grave.push(spent.id);u.lastAcePower=game.serial;
 const friend=allUnits(side).filter(m=>m!==u).sort((a,b)=>a.hp-b.hp)[0];
 const foes=allUnits(enemySide).sort((a,b)=>a.hp-b.hp),weak=foes[0];
 log(cardName(u.cid)+' · '+style.power+' ['+cardName(spent.id)+' 소재 사용]','important');
 switch(p.faction){
  case 0:if(weak)wound(enemySide,[...foes].sort((a,b)=>b.atk-a.atk)[0],12,style.power);else applyCoreDamage(enemySide,8,style.power);break;
  case 1:{
   const dancer=allUnits(side).find(m=>m!==u&&m.used&&m.entered!==game.serial&&p.clash!==m);
   if(dancer)dancer.used=false;draw(side);break;
  }
  case 2:if(weak)wound(enemySide,weak,type==='gear'?16:12,style.power);else p.flags.shield++;break;
  case 3:applyCoreDamage(enemySide,7,style.power);if(game.winner===null)heal(side,7);break;
  case 4:{
   ownHeal(side,4);if(friend)friend.ward=true;wound(enemySide,weak,4,style.power);
   const slot=emptyUnitIndex(p),at=p.grave.lastIndexOf(spent.id);
   if(game.winner===null&&C(spent.id).rank===0&&slot>=0&&at>=0){
    const [id]=p.grave.splice(at,1);const seed=p.units[slot]=makeUnit(id);
    p.metrics.seen.add(id);p.metrics.turnSummons++;
    log(cardName(id)+' · 떼어낸 씨앗 다시 심기','important');triggerUnit('enter',side,seed);
   }
   break;
  }
  case 5:if(type==='reaction')foes.forEach(m=>wound(enemySide,m,3,style.power));else wound(enemySide,game.players[enemySide].clash||weak,7,style.power);break;
  case 6:{
   const same=game.players[enemySide].units[p.units.indexOf(u)];
   if(same)same.frozen=true;wound(enemySide,same||weak,same?6:5,style.power);break;
  }
  case 7:{
   wound(enemySide,weak,3,style.power);
   const at=p.grave.lastIndexOf(spent.id);
   if(type==='tactic'&&at>=0&&game.winner===null)p.deck.unshift(p.grave.splice(at,1)[0]);
   break;
  }
 }
 if(game.winner!==null)return true;
 switch(aceBonus(C(u.cid))){
  case 0:u.hp=Math.min(u.maxHp,u.hp+2);break;
  case 1:heal(side,2);break;
  case 2:if(friend)friend.atk++;break;
  case 3:applyCoreDamage(enemySide,2,style.power);break;
  case 4:u.ward=true;break;
  case 5:{const at=p.grave.findIndex(id=>C(id).type==='reaction');if(at>=0)p.hand.push(p.grave.splice(at,1)[0]);break;}
  case 6:draw(side);break;
  case 7:{const remaining=allUnits(enemySide).sort((a,b)=>a.hp-b.hp)[0];if(remaining)remaining.frozen=true;break;}
  case 8:if(p.clash){p.clash.atk+=2;p.clash.hp=Math.min(p.clash.maxHp,p.clash.hp+2);}else{const first=p.units.find(Boolean);if(first&&!p.clashUsed)moveToClash(side,first,true);}break;
  case 9:if(enemy.clash)enemy.clash.atk=Math.max(1,enemy.clash.atk-2);else applyCoreDamage(enemySide,2,style.power);break;
  case 10:if(p.clash){applyCoreDamage(enemySide,3,style.power);p.clash.hp=Math.min(p.clash.maxHp,p.clash.hp+1);}else p.flags.shield++;break;
 }
 return true;
}
function ownHeal(side,amount){allUnits(side).forEach(u=>u.hp=Math.min(u.maxHp,u.hp+amount));}
function repairAll(side,amount){let repaired=0;for(const u of allUnits(side)){const was=u.hp;u.hp=Math.min(u.maxHp,u.hp+amount);repaired+=u.hp-was;}if(repaired)log('아군 몬스터 내구도 회복 +'+repaired,side===0?'my':'enemy');}
function targetsFor(side,card){
 if(!card)return [];
 const p=game.players[side],friend=allUnits(side),foe=allUnits(other(side));
 if(card.type==='gear'||['buff','guard'].includes(card.effect))return friend;
 if(['strike','weaken','dice'].includes(card.effect))return foe;
 if(card.effect==='bounce')return foe.filter(u=>card.faction!==-1||C(u.cid).rank===0);
 if(card.effect==='freeze')return foe.filter(u=>!u.frozen&&(card.faction!==-1||C(u.cid).rank===0));
 if(card.effect==='banish')return game.players[other(side)].units.filter(Boolean);
 if(['shift','challenge'].includes(card.effect)&&!p.clash)return p.units.filter(Boolean);
 return [];
}
function handAction(card){
 if(!card||game?.owner!==0||game.stage!=='main'||game.winner!==null)return '';
 if(card.type==='unit')return rankCheck(0,card)?'':summonMethod(0,card)==='special'?'effect':'summon';
 if(card.type==='reaction'||card.type==='gear'){
  if(!game.players[0].spells.includes(null)||(card.type==='gear'&&!targetsFor(0,card).length))return '';
 }
 if(['weaken','bounce','freeze','banish'].includes(card.effect)&&!targetsFor(0,card).length)return '';
 return 'effect';
}
function useEffect(side,card,target){
 const p=game.players[side],enemy=game.players[other(side)],e=card.effect,friend=allUnits(side);
 const foe=allUnits(other(side));
 const weak=card.faction===-1,scaled=n=>weak?Math.max(1,Math.floor(n*.7)):n;
 switch(e){
  case'draw':draw(side,weak?1:2);break;
  case'supply':draw(side,1);heal(side,scaled(4));repairAll(side,scaled(1));break;
  case'heal':heal(side,scaled(9));repairAll(side,scaled(2));break;
  case'blast':applyCoreDamage(other(side),scaled(8),card.name);break;
  case'buff':{const u=target||friend.sort((a,b)=>b.atk-a.atk)[0];if(u)u.atk+=scaled(4);else heal(side,scaled(3));break;}
  case'weaken':{const u=target||foe.sort((a,b)=>b.atk-a.atk)[0];if(u)u.atk=Math.max(1,u.atk-scaled(4));break;}
  case'strike':{const u=target||foe.sort((a,b)=>a.hp-b.hp)[0];if(u)wound(other(side),u,scaled(7),card.name);else applyCoreDamage(other(side),scaled(4),card.name);break;}
  case'freeze':{const u=target||foe.find(x=>!x.frozen&&(card.faction!==-1||C(x.cid).rank===0));if(u)u.frozen=true;break;}
  case'bounce':{const u=target||foe.find(x=>card.faction!==-1||C(x.cid).rank===0);if(u)removeUnit(other(side),u,'hand');break;}
  case'banish':{const u=target||enemy.units.find(Boolean);if(u)removeUnit(other(side),u,'exile');break;}
  case'recover':{const ix=p.grave.findIndex(id=>C(id)?.type==='unit'&&C(id)?.rank===0);if(ix>=0)p.hand.push(p.grave.splice(ix,1)[0]);else draw(side,1);break;}
  case'deploy':{const ix=p.grave.findIndex(id=>C(id)?.rank===0);const slot=emptyUnitIndex(p);if(ix>=0&&slot>=0){const id=p.grave.splice(ix,1)[0];const unit=p.units[slot]=makeUnit(id);log('데스존 하수 소생: '+cardName(id),'important');triggerUnit('enter',side,unit);}else draw(side,1);break;}
  case'shift':{if(!p.clash&&p.units.some(Boolean)){moveToClash(side,target||p.units.find(Boolean),true);}else if(p.clash&&emptyUnitIndex(p)>=0){retreat(side);}else draw(side,1);break;}
  case'challenge':{const u=target||p.units.find(Boolean);if(u&&!p.clash)moveToClash(side,u,true);else p.flags.shield++;break;}
  case'fog':enemy.flags.occupyBlock=true;break;
  case'guard':{const u=target||friend[0];if(u)u.guard=true;else p.flags.shield++;break;}
  case'dice':{const rolls=[1+random(6),1+random(6),1+random(6)],hits=rolls.filter(n=>n>=4).length;log('D6 포격 ['+rolls.join(' · ')+'] · 명중 '+hits,'important');const u=target||enemy.clash||foe[0];if(u)wound(other(side),u,hits*scaled(6),card.name);else applyCoreDamage(other(side),hits*scaled(3),card.name);break;}
  default:draw(side,1);
 }
 if(p.faction===7&&p.combo.spells?.size>=2&&!p.metrics.traitUsed){p.metrics.traitUsed=true;applyCoreDamage(other(side),3,'유리 마도원 공명');}
 applySignature(side,card,target,'spell');
}
function playNonUnit(side,index,chosenTarget,preferredSlot){
 const p=game.players[side],id=p.hand[index],card=C(id);if(!card)return false;
 if(card.type==='reaction'||card.type==='gear'){
  const idx=preferredSlot??p.spells.findIndex(x=>!x);if(idx<0||idx>=p.spells.length||p.spells[idx]){if(side===0)toast('마법·함정 칸이 비어 있지 않습니다.');return false;}
  if(card.type==='gear'&&!allUnits(side).length){if(side===0)toast('장비를 부착할 몬스터가 없습니다.');return false;}
  const target=card.type==='gear'?(chosenTarget||allUnits(side)[0]):null;
  const destination=card.type==='gear'&&target?document.querySelector?.('[data-uid="'+target.uid+'"]'):document.querySelector?.('[data-lane="spells"][data-lane-side="'+side+'"][data-lane-index="'+idx+'"]');
  playCardFlight(side,id,index,destination);
  p.hand.splice(index,1);
  p.spells[idx]={cid:id,faceDown:card.type==='reaction',target:target?.uid??null};
  if(card.type==='gear'&&target){target.atk+=card.effect==='power'?3:0;target.maxHp+=card.effect==='ward'?5:0;target.hp+=card.effect==='ward'?5:0;target.guard=card.effect==='ward'?true:target.guard;applySignature(side,card,target,'gear');}
  log((side===0?'아군':'AI')+' '+(card.type==='gear'?'장비 부착':'함정 세트')+': '+card.name,side===0?'my':'enemy');
  if(target){p.metrics.gears=(p.metrics.gears||0)+1;if(side===0)PROGRESS.count('gear');triggerBoard('gear',side);}return true;
 }
 playCa�^��G����ƭy�e=>{
  pendingReact={event,resolve};
  $('reactionText').textContent=event.description;
  $('reactionOptions').innerHTML=options.map((x,i)=>'<button class="ghost-btn" data-card-type="reaction" data-ready="effect" data-react="'+i+'">'+C(x.cid).name+' · '+(C(x.cid).desc||'대응')+'</button>').join('');
  $('reactionOverlay').classList.remove('hidden');
  $('reactionOptions').onclick=ev=>{const btn=ev.target.closest('[data-react]');if(!btn||!pendingReact)return;const n=Number(btn.dataset.react);const selected=options[n];if(!selected)return;applyReaction(0,selected,event);endReaction();};
 });
}
function endReaction(){if(!pendingReact)return;const {event,resolve}=pendingReact;pendingReact=null;$('reactionOverlay').classList.add('hidden');resolve(event);}
function humanPlay(index,{target,slot,method='auto'}={}){
 if(!game||game.owner!==0||game.stage!=='main'||game.winner!==null)return;
 const p=game.players[0],id=p.hand[index],card=C(id);if(!card)return;
 let event={type:card.type==='unit'?'summon':'tactic',cid:id,canceled:false,description:card.name};
 if(card.type==='unit'){const why=rankCheck(0,card,method,slot);if(why){toast(why);return;}}
 else if(!handAction(card)){toast('대상 또는 빈 마법·함정 칸이 필요합니다.');return;}
 const options=card.type==='reaction'?[]:targetsFor(0,card);
 if(target&&!options.includes(target)){toast('이 카드가 지정할 수 없는 대상입니다.');return;}
 if(!target&&options.length){
  game.pendingTarget={index,id,slot};game.selected={kind:'hand',index};game.viewedEnemy=null;render();return;
 }
 game.pendingTarget=null;
 if(card.type==='tactic'||card.type==='unit')event=aiReaction(event);
 if(game.winner!==null)return;
 if(event.canceled||(target&&!targetsFor(0,card).includes(target))){
  p.hand.splice(index,1);p.grave.push(id);log(card.name+'의 효과가 '+(event.canceled?'무효화됐습니다.':'유효한 대상을 잃었습니다.'),'enemy');
 }
 else if(card.type==='unit')summon(0,index,slot,method);
 else playNonUnit(0,index,target,slot);
 game.selected=null;render();testVictory();
}
function activeGuards(side){return allUnits(side).filter(u=>u.guard);}
function canAttack(unit,core=false,target){
 if(!unit||game?.owner!==0||game.stage!=='combat'||game.winner!==null||unit.used||unit.frozen||unit.entered===game.serial)return false;
 const [mine,enemy]=game.players;
 return core?mine.clash!==unit&&!activeGuards(1).length:!!target&&(mine.clash!==unit||!enemy.clash||target===enemy.clash);
}
function attack(side,attacker,targetSide,target,core=false,prevented=false){
 if(game.winner!==null||attacker.used||attacker.frozen||!allUnits(side).includes(attacker))return false;
 if(attacker.entered===game.serial)return false;
 const p=game.players[side];
 if(p.clash?.uid===attacker.uid&&core)return false;
 if(p.clash?.uid===attacker.uid&&game.players[other(side)].clash&&target?.uid!==game.players[other(side)].clash.uid)return false;
 if(core&&activeGuards(other(side)).length)return false;
 attacker.used=true;
 if(tutorialMatch&&side===0)setTutorialStep(8);
 if(prevented){log('반응 카드가 공격을 무효화했습니다.','important');return true;}
 if(side===0)PROGRESS.count('attack');
 if(core){const base=$(other(side)===0?'myBasePlate':'enemyBasePlate');playAttackLunge(attacker,base);applyCoreDamage(other(side),attacker.atk,cardName(attacker.cid)+' 직접 공격');triggerUnit('direct',side,attacker);return true;}
 if(!target)return false;
 triggerUnit('engage',side,attacker,target);
 if(game.winner!==null||!allUnits(side).includes(attacker)||!allUnits(targetSide).includes(target))return true;
 const atk=attacker.atk,retaliate=target.atk;
 const targetElement=typeof document.querySelector==='function'?document.querySelector('[data-uid="'+target.uid+'"]'):null;playAttackLunge(attacker,targetElement);
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
 if(side===0)PROGRESS.count('occupy');
 p.metrics.occupies++;
 const c=C(u.cid),value=u.ace?8:c.occupation||(c.rank===2?12:c.rank===1?7:4);
 applyCoreDamage(other(side),value,c.name+' 단독 점령');
 triggerUnit('occupy',side,u);
}
function finishGame(winner,reason){if(game.winner!==null)return;const wasTutorial=tutorialMatch;game.winner=winner;game.stage='finished';if(wasTutorial&&winner===0)PROGRESS.completeTutorial();tutorialMatch=false;$('tutorialGuide').classList.add('hidden');$('resultHeading').textContent=winner===0?'VICTORY':'DEFEAT';$('resultSymbol').textContent=winner===0?'✦':'◇';$('resultMessage').textContent=(winner===0?'상대 차원을 무너뜨렸습니다.':'차원 연결이 끊어졌습니다.')+' · '+reason+(wasTutorial&&winner===0?' · 튜토리얼 보상: 선택 진영 전용 1,000 ◆ + 에이스 3장':wasTutorial?' · 튜토리얼에서 패배해도 보상 없이 다시 도전할 수 있습니다.':'');$('resultSummary').innerHTML='<span>나의 생명력<b>'+game.players[0].hp+'</b></span><span>AI 생명력<b>'+game.players[1].hp+'</b></span><span>진행 턴<b>'+game.serial+'</b></span>';$('resultOverlay').classList.remove('hidden');if(reason!=='기권')PROGRESS.payDuel(winner===0,game.serial);render();}
function testVictory(){if(!game||game.winner!==null)return;if(game.players[0].hp<=0)finishGame(1,'생명력 0');else if(game.players[1].hp<=0)finishGame(0,'생명력 0');}
function finishTurn(side){
 if(!game||game.winner!==null||game.owner!==side)return;
 if(tutorialMatch&&side===0)setTutorialStep(5);
 if(side===0)PROGRESS.count('turn');
 occupy(side);testVictory();if(game.winner!==null){render();return;}
 triggerBoard('end',side);if(game.winner!==null){render();return;}
 allUnits(side).forEach(u=>{u.frozen=false;});
 const p=game.players[side];
 p.flags.occupyBlock=false;
 game.owner=other(side);game.serial++;game.stage='main';game.selected=null;game.viewedEnemy=null;game.pendingTarget=null;
 const q=game.players[game.owner];q.ownTurns++;q.basicUsed=false;q.clashUsed=false;
 q.metrics.turnMoves=0;q.metrics.turnSummons=0;q.metrics.turnTactics=0;q.metrics.traitUsed=false;
 q.combo=newComboTurn();
 allUnits(game.owner).forEach(u=>{u.used=false;});
 if(q.faction===4){ownHeal(game.owner,2);for(const plant of allUnits(game.owner))if(!plant.ace)plant.atk++;}
 draw(game.owner,1);
 triggerBoard('start',game.owner);
 if(game.players[game.owner].clash)triggerUnit('hold',game.owner,game.players[game.owner].clash);
 game.round=Math.ceil(game.serial/2);log((game.owner===0?'플레이어':'AI')+' 턴 시작','important');if(tutorialMatch&&game.owner===0)setTutorialStep(6);render();
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
 const live=()=>gameCounter===token&&game.winner===null;
 if(tutorialMatch){
  const low=p.hand.findIndex(id=>C(id).rank===0&&!rankCheck(1,C(id),'normal'));
  if(low>=0&&!p.basicUsed)await aiTryAction('summon',low,token);
  if(!live())return;
  game.stage='combat';
  const attacker=allUnits(1).find(u=>u.entered!==game.serial&&!u.used&&!u.frozen),defenders=allUnits(0);
  if(attacker){
   const target=defenders.slice().sort((a,b)=>a.hp-b.hp)[0];
   attack(1,attacker,target?0:1,target||null,!target,false);
  }
  render();await pause(250);if(live())finishTurn(1);return;
 }
 const opener=p.hand.findIndex(id=>COMBO.opener(C(id))&&!rankCheck(1,C(id),'normal'));
 const low=opener>=0?opener:p.hand.findIndex(id=>C(id).rank===0&&!rankCheck(1,C(id),'normal'));
 if(low>=0)await aiTryAction('summon',low,token);
 let spells=0, geared=false;
 for(let step=0;step<9&&live();step++){
  if(p.faction===5&&raiseEcho(1)){render();continue;}
  if(p.faction===6&&!p.combo.lateral){
   const move=p.units.findIndex((u,i)=>u&&[i-1,i+1].some(k=>k>=0&&k<p.units.length&&!p.units[k]));
   if(move>=0){const dest=[move-1,move+1].find(k=>k>=0&&k<p.units.length&&!p.units[k]);reposition(1,p.units[move].uid,dest);render();}
  }
  const gear=p.hand.findIndex(id=>C(id).type==='gear'&&allUnits(1).length&&p.spells.includes(null));
  if(gear>=0&&!geared&&(p.faction===2||step>=4)){geared=true;playNonUnit(1,gear);render();continue;}
  const stronger=p.hand.findIndex(id=>COMBO.relay(C(id))&&!rankCheck(1,C(id),'special')&&p.basicUsed);
  const special=stronger>=0?stronger:p.hand.findIndex(id=>C(id).rank===1&&!rankCheck(1,C(id),'special'));
  if(special>=0){await aiTryAction('summon',special,token);continue;}
  const tactic=p.hand.findIndex(id=>C(id).type==='tactic'&&(targetsFor(1,C(id)).length||!['weaken','bounce','freeze','banish'].includes(C(id).effect)));
  if(tactic>=0&&spells<2){spells++;await aiTryAction('tactic',tactic,token);continue;}
  if(!p.basicUsed){
   const lead=p.hand.findIndex(id=>C(id).rank===0&&!rankCheck(1,C(id),'normal'));
   if(lead>=0){await aiTryAction('summon',lead,token);continue;}
  }
  break;
 }
 if(!live())return;
 const planned=aceOptions(1).find(x=>!x.reason);
 if(planned){
  const event=await humanReaction({type:'summon',cid:planned.id,canceled:false,description:'AI가 에이스 '+cardName(planned.id)+' 강림을 선언했습니다.'});
  if(!live())return;
  if(event.canceled)cancelAce(1,planned.id);else summonAce(1,planned.id);
  render();
 }
 if(p.faction!==1)for(const u of allUnits(1))if(canActivateAce(1,u))activateAce(1,u.uid);
 const trap=p.hand.findIndex(id=>C(id).type==='reaction');
 if(trap>=0&&p.spells.includes(null)){playNonUnit(1,trap);render();}
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
function tutorialOpening(player,faction){
 const planned=[`f${faction}u0`,`f${faction}u1`,`f${faction}u0`,`f${faction}m0`,`f${faction}t0`];
 for(const id of planned){const index=player.deck.indexOf(id);if(index>=0)player.deck.splice(index,1);}
 player.deck.push(...planned.slice().reverse());
}
function startTutorial(){
 if(PROGRESS.state.starter===null){PROGRESS.screen('starter');return false;}
 pickedFaction=PROGRESS.state.starter;tutorialStep=0;return initGame(true);
}
function initGame(training=false){
 AUDIO.start();
 if(PROGRESS.state.starter===null){PROGRESS.screen('starter');return;}
 const f=pickedFaction,enemyChoices=[...Array(8).keys()].filter(x=>x!==f),ef=training?(f+1)%8:enemyChoices[random(enemyChoices.length)],ourDeck=training?DATA.makeStarter(f):getSaved(f),enemyDeck=training?DATA.makeStarter(ef):DATA.makeComboDeck(ef);
 if(!PROGRESS.hasDeck(ourDeck,f)){toast('덱 편집에서 보유 카드로 40장을 채우세요.');return;}
 gameCounter++;uidCounter=0;pendingReact=null;aiBusy=false;
 game={players:[makePlayer(0,f,ourDeck,getAceDeck(f)),makePlayer(1,ef,enemyDeck,DATA.makeAceDeck(ef).slice(0,3))],owner:0,serial:1,round:1,stage:'main',selected:null,winner:null,logs:[]};
 tutorialMatch=training;game.tutorial=training;
 if(training){tutorialOpening(game.players[0],f);game.players[1].hp=28;}
 game.players[0].ownTurns=1;
 draw(0,5);draw(1,5);
 log('결투 개시! 선공은 첫 턴 드로우와 공격을 건너뜁니다.','important');
 $('lobbyScreen').classList.add('hidden');$('resultOverlay').classList.add('hidden');$('gameScreen').classList.remove('hidden');
 render();if(training)setTutorialStep(0);else $('tutorialGuide').classList.add('hidden');toast((training?'TUTORIAL · ':'DUEL START · ')+F(f).name+' VS '+F(ef).name);return true;
}
function materialChips(unit){
 return (unit.materials||[]).map((m,i)=>{
  const c=C(m.id),glyph=F(c.faction)?.glyph||'◇';
  return '<span class="material-card" style="--stack:'+i+'" data-card-type="'+c.type+'" title="'+c.name+' · '+m.source+'">'+cardArtwork(c,glyph,{gold:false,animate:false})+'</span>';
 }).join('');
}
function renderCombo(){
 const p=game.players[0],style=COMBO.factions[p.faction],choices=aceOptions(0);
 const echo=p.faction===5&&game.owner===0&&game.stage==='main'&&!p.combo.echo&&p.ownTurns-(p.flags.echoTurn??-2)>=3&&
  p.combo.special<COMBO.maxSpecial&&emptyUnitIndex(p)>=0&&p.grave.some(id=>C(id)?.type==='reaction');
 $('comboRail').innerHTML='<div class="combo-count"><strong>'+style.name+'</strong><span>서치 '+p.combo.searches+'/2 · 특수 '+p.combo.special+'/'+COMBO.maxSpecial+'</span></div>'+
  '<div class="ace-choices">'+(choices.length?choices.map(({id,reason,materials})=>{
   const c=C(id),glyph=F(c.faction).glyph;
   const title=reason||materials.map(m=>C(m.id).name+' ('+m.source+')').join(' + ');
   return '<div class="ace-choice"><button type="button" class="ace-art" data-art-preview="'+id+'" aria-label="'+c.name+' 상세 보기">'+cardArtwork(c,glyph,{animate:false})+'</button><div><strong>'+c.name+'</strong>'+
    '<button type="button" class="ace-action" data-summon-ace="'+id+'" data-ready="'+(reason?'':'ace')+'" title="'+title+'" '+(reason?'disabled':'')+'>'+(reason?'강림 조건 필요':'소재 '+materials.length+'장으로 강림')+'</button></div></div>';
  }).join(''):'<span class="ace-empty">에이스 존 · 덱 편집에서 보유한 에이스를 등록</span>')+'</div>'+
  (echo?'<button class="ghost-btn" data-raise-echo data-ready="effect">함정 유생 부활</button>':'');
}
function unitHtml(unit,side,zone,index){
 const card=C(unit.cid),f=F(card.faction),selected=game.selected?.uid===unit.uid,attackable=game.selected?.kind==='field'&&game.selected.side===0&&side===1&&game.stage==='combat';
 const gold=side===0&&usesGold(card.id);
 const directReady=side===0&&canAttack(unit,true), clashAttackReady=side===0&&allUnits(1).some(target=>canAttack(unit,false,target));
 const attackReady=directReady||clashAttackReady;
 const movementReady=side===0&&game.owner===0&&game.stage==='main'&&game.winner===null&&card.ability.event===(zone==='clash'?'out':'in')&&
  (zone==='clash'?emptyUnitIndex(game.players[0])>=0:!game.players[0].clash&&!game.players[0].clashUsed);
 const target=game.pendingTarget&&targetsFor(0,C(game.pendingTarget.id)).includes(unit);
 const event=card.ability.event;
 const endReady=side===0&&game.owner===0&&game.stage==='combat'&&game.winner===null&&(event==='end'||
  event==='occupy'&&zone==='clash'&&!game.players[1].clash&&unit.clashEntered<game.serial&&!game.players[0].flags.occupyBlock);
 const linkedType={spell:'tactic',gear:'gear'}[event];
 const linkedReady=side===0&&linkedType&&unit.lastAbilityTurn!==game.serial&&game.players[0].hand.some(id=>C(id).type===linkedType&&handAction(C(id)));
 const ready=unit.ace?(canActivateAce(side,unit)?'ace':''):abilityCondition(side,card.ability)&&(movementReady||endReady||linkedReady||event==='direct'&&directReady||event==='engage'&&clashAttackReady)
  ?card.rank===2?'ace':'effect':'';
 const materials=unit.ace?'<div class="material-stack" title="남은 소재 '+unit.materials.length+'장">'+materialChips(unit)+'<small>'+unit.materials.length+'</small></div>':'';
 return '<button class="unit-mini '+(gold?'gold-art ':'')+(selected?'selected ':'')+(attackable?'attackable ':'')+(unit.used||unit.entered===game.serial?'exhausted':'')+'" data-uid="'+unit.uid+'" data-card-type="unit" data-side="'+side+'" data-zone="'+zone+'" data-index="'+index+'" data-ready="'+ready+'" data-targetable="'+!!target+'" draggable="'+(side===0&&game.owner===0&&game.stage==='main'||attackReady)+'" style="--c:'+f.color+'" title="'+card.name+'"><small class="summon-rank">'+(card.rank===2?'◆':card.rank===1?'◇':'·')+'</small><small class="status-mark">'+(unit.guard?'▣':'')+(unit.ward?'◈':'')+(unit.frozen?'❄':'')+'</small><div class="unit-glyph">'+cardArtwork(card,f.glyph,{gold})+'</div>'+materials+'<div class="unit-name">'+card.name+'</div><div class="unit-stats"><span>⚔ '+unit.atk+'</span><span class="'+(unit.hp<unit.maxHp?'hurt':'')+'">♥ '+unit.hp+'</span></div></button>';
}
function slotHtml(unit,side,zone,index){return'<div class="slot '+(unit?'occupied':'empty')+'" data-lane="'+zone+'" data-lane-side="'+side+'" data-lane-index="'+index+'" data-slot="'+(zone==='spells'?'MAGIC':'UNIT')+' '+(index+1)+'">'+(unit?zone==='spells'?spellHtml(unit,side,index):unitHtml(unit,side,zone,index):'')+'</div>';}
function spellHtml(s,side,index){const card=C(s.cid),hidden=side===1&&s.faceDown;return'<button class="trap-chip" data-card-type="'+(hidden?'hidden':card.type)+'" data-spell-side="'+side+'" data-spell-index="'+index+'" title="'+(hidden?'상대 세트 카드':card.name)+'">'+(s.faceDown?'▤':card.type==='gear'?'⚙':'✦')+'<small>'+(s.faceDown?'SET':card.name)+'</small></button>';}
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
 const ready=handAction(card);
 return '<button class="card-face '+(usesGold(card.id)?'gold-art ':'')+(game.selected?.kind==='hand'&&game.selected.index===index?'selected':'')+'" data-card-type="'+card.type+'" data-hand="'+index+'" data-ready="'+ready+'" draggable="'+!!ready+'" title="'+card.name+' / '+card.desc+(ready?' · '+readyLabel[ready]:'')+'"><div class="card-header"><b>'+card.name+'</b><i>'+card.rarity+'</i></div><div class="card-art">'+cardArtwork(card,faction.glyph)+'</div>'+cardRules(card)+'<div class="card-footer"><span class="card-kind">'+cardTypeLine(card)+'</span><span class="card-stat">'+(card.type==='unit'?card.atk+' / '+card.hp:'')+'</span></div></button>';
}
function selectedCard(){
 if(game?.viewedEnemy)return C(game.viewedEnemy.cid);
 if(!game?.selected)return null;
 const s=game.selected;if(s.kind==='hand'){const cid=game.players[0].hand[s.index];return cid?C(cid):null;}
 if(s.kind==='field'){const u=allUnits(s.side).find(x=>x.uid===s.uid);return u?C(u.cid):null;}
 return null;
}
function renderInspector(){
 const el=$('inspector'),view=game.viewedEnemy,s=view||game.selected,c=selectedCard();
 if(!c){el.innerHTML='<div class="inspector-empty">손패나 전장의 공개 카드를<br>선택해 주세요.</div>';return;}
 const f=c.faction<0?{glyph:'◇',color:'#d9c399',name:'범용'}:F(c.faction);
 let html='<div class="inspection-card" data-card-type="'+c.type+'"><div class="inspect-head"><div class="inspect-emblem" style="--fcolor:'+f.color+'">'+f.glyph+'</div><div><small>'+f.name+' · '+cardTypeLine(c)+' · '+c.rarity+'</small><b>'+c.name+'</b></div></div>';
 const gold=!view&&usesGold(c.id);
 html+='<button class="inspect-art '+(gold?'gold-art':'')+'" data-art-preview="'+c.id+'"'+(view?' data-enemy-art':'')+' aria-label="'+c.name+' 일러스트 크게 보기">'+cardArtwork(c,f.glyph,{gold})+'</button>';
 html+=cardRules(c);
 const unit=s.kind==='field'?allUnits(s.side).find(x=>x.uid===s.uid):null;
 if(c.type==='unit')html+='<div class="inspect-stats">공격 '+(unit?.atk??c.atk)+' <span>내구 '+(unit?.hp??c.hp)+'</span></div>';
 html+='</div><div class="inspect-action">';
 if(view?.kind==='field'&&game.selected?.kind==='field'&&
    canAttack(allUnits(0).find(u=>u.uid===game.selected.uid),false,allUnits(1).find(u=>u.uid===view.uid)))
  html+='<button class="primary-btn" data-inspect-action="enemy">선택한 아군으로 공격</button>';
 const allowed=!view&&game.owner===0&&game.winner===null;
 if(s.kind==='hand'&&allowed&&game.stage==='main'){
  const special=c.type==='unit'&&summonMethod(0,c)==='special';
  html+='<button class="primary-btn" data-inspect-action="play" '+(!handAction(c)?'disabled':'')+'>'+(c.type==='unit'?special?'특수 소환':'기본 배치':c.type==='reaction'?'함정 세트':'카드 발동')+'</button>';
  if(c.type==='unit'&&!special&&!rankCheck(0,c,'special'))html+='<button class="ghost-btn" data-inspect-action="special">특수 소환</button>';
 }
 if(game.pendingTarget)html+='<button class="ghost-btn" data-inspect-action="cancel-target">대상 지정 취소</button>';
 if(s.kind==='field'&&allowed){
  if(game.stage==='main'){if(s.zone==='units')html+='<button class="ghost-btn" data-inspect-action="clash">격돌존 진입</button>';if(s.zone==='clash')html+='<button class="ghost-btn" data-inspect-action="retreat">격돌존 철수</button>';}
  if(game.stage==='combat'&&!allUnits(0).find(x=>x.uid===s.uid)?.used){html+='<button class="primary-btn" data-inspect-action="core">상대 본진 공격</button>';}
  const p=game.players[0],position=p.units.indexOf(unit);
  if(game.stage==='main'&&position>=0&&(p.faction===6&&p.combo.lateral<2||p.faction===1&&position===2&&!p.combo.lateral))
   for(const i of [position-1,position+1])if(i>=0&&i<p.units.length&&!p.units[i])
    html+='<button class="ghost-btn" data-move-slot="'+i+'">'+(i<position?'←':'→')+' '+(i+1)+'번 칸 이동</button>';
 }
 if(unit?.ace){
  const available=allowed&&canActivateAce(0,unit);
  html+='<div class="material-inspector"><strong>에이스 소재 · '+unit.materials.length+'장</strong>'+
   (unit.materials.length?unit.materials.map((m,i)=>'<button class="ghost-btn" data-detach-material="'+i+'" '+(available?'data-ready="ace"':'disabled')+'>'+C(m.id).name+' · '+m.source+(available?' 떼기':'')+'</button>').join(''):'<p>남은 소재가 없습니다.</p>')+'</div>';
 }
 html+='</div>';el.innerHTML=html;
}
function render(){
 if(!game)return;const mine=game.players[0],enemy=game.players[1],mineF=F(mine.faction),enemyF=F(enemy.faction);
 $('myFactionLabel').textContent=mineF.name;$('enemyFactionLabel').textContent=enemyF.name;$('myAvatar').textContent=mineF.glyph;$('enemyAvatar').textContent=enemyF.glyph;$('myAvatar').style.setProperty('--fcolor',mineF.color);$('enemyAvatar').style.setProperty('--fcolor',enemyF.color);
 for(let side=0;side<=1;side++){const p=game.players[side],pre=side===0?'my':'enemy';$(pre+'Hp').textContent=p.hp;$(pre+'HpFill').style.width=p.hp+'%';$(pre+'Deck').textContent=p.deck.length;$(pre+'Grave').textContent=p.grave.length;if(side===0){$('myExile').textContent=p.exile.length;$('myExtra').textContent=p.aces.length;}else $('enemyHand').textContent=p.hand.length;}
 $('roundLabel').textContent='TURN '+String(game.serial).padStart(2,'0');
 $('turnTitle').textContent=game.owner===0?'YOUR TURN':'OPPONENT TURN';
 $('turnTitle').style.color=game.owner===0?'#efc37e':'#ff9d9d';
 $('phaseLabel').textContent=game.stage==='main'?'전개 단계':game.stage==='combat'?'전투 단계':'결투 종료';
 renderBoard();
 renderCombo();
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
 const [plateId,plateName,accent,base]=PROGRESS.plate();
 $('myBaseName').textContent=plateName;$('myBaseHp').textContent=mine.hp+' LP';$('enemyBaseHp').textContent=enemy.hp+' LP';
 $('myBasePlate').dataset.plateSkin=plateId;
 $('enemyBasePlate').dataset.targetable=String(canAttack(unit,true));
 $('myBasePlate').style.setProperty('--base-accent',accent);$('myBasePlate').style.setProperty('--base-fill',base);
 $('hint').textContent=game.pendingTarget?'빛나는 대상 중 하나를 선택하세요.':game.owner!==0?'AI가 행동 중입니다. 대응 카드가 있으면 함정 창이 열립니다.':game.stage==='main'?'흰색 소환 · 노란색 효과 · 붉은색 에이스 | 손패를 드래그해 배치 또는 발동':'아군을 상대 몬스터 또는 본진판에 드래그해 공격';
}
function selectHand(index){if(!game||game.owner!==0||game.stage!=='main'||game.winner!==null)return;game.viewedEnemy=null;game.pendingTarget=null;if(game.selected?.kind==='hand'&&game.selected.index===index)humanPlay(index);else{game.selected={kind:'hand',index};render();}}
function selectField(side,zone,index){
 if(!game||game.winner!==null)return;
 const p=game.players[side],u=zone==='clash'?p.clash:p.units[index];if(!u)return;
 if(game.pendingTarget){const {index:handIndex,id,slot}=game.pendingTarget;if(game.players[0].hand[handIndex]===id)humanPlay(handIndex,{target:u,slot});return;}
 if(side===1){game.viewedEnemy={kind:'field',cid:u.cid,side,uid:u.uid,zone,index};renderInspector();return;}
 if(game.owner!==0)return;
 game.viewedEnemy=null;
 if(game.selected?.uid===u.uid)game.selected=null;else game.selected={kind:'field',side:0,zone,index,uid:u.uid};
 render();
}
function enterClash(){const s=game?.selected;if(!s||game.owner!==0||game.stage!=='main')return;const u=allUnits(0).find(x=>x.uid===s.uid);if(u&&moveToClash(0,u)){game.selected=null;render();}else toast('격돌존 진입 조건을 확인하세요.');}
function withdraw(){if(game?.owner===0&&game.stage==='main'&&retreat(0)){game.selected=null;render();}}
function renderFactionLobby(starterPicked){
 if(Number.isInteger(starterPicked))pickedFaction=starterPicked;
 $('factionGrid').innerHTML=DATA.factions.map((f,i)=>'<button class="faction-tile '+(i===pickedFaction?'active':'')+'" style="--fcolor:'+f.color+'" data-faction="'+i+'" '+(PROGRESS.hasStarter(i)?'':'disabled title="스타터 팩을 먼저 구매하세요 · 500 ◆"')+'><span class="f-glyph">'+f.glyph+'</span><b>'+f.name+'</b><small>'+f.short+(PROGRESS.hasStarter(i)?'':' · 잠김')+'</small></button>').join('');
 const f=F(pickedFaction);$('factionDetail').style.setProperty('--fcolor',f.color);
 $('factionDetail').innerHTML='<div><strong>'+f.name+'</strong><p>'+f.trait+'</p></div><div class="tier-text">'+f.tiers.join('<br>↓<br>')+'</div>';
 $('deckCount').textContent=getSaved(pickedFaction).length+' / 40';
 $('startGame').textContent=PROGRESS.state.starter===null?'스타터 덱 선택':'AI 대전 시작';
}
function showZone(side,zone){
 if(!game)return;
 const p=game.players[side],ids=zone==='grave'?p.grave:zone==='exile'?p.exile:p.aces;
 const names={grave:'데스존',exile:'단절된 이계',extra:'에이스 존'};
 $('zoneTitle').textContent=(side===0?'내 ':'상대 ')+names[zone]+' · '+ids.length+'장';
 $('zoneCards').innerHTML=ids.length?ids.map((id,i)=>{const c=C(id),f=F(c.faction),glyph=f?.glyph||'◇';return '<button class="zone-card" data-art-preview="'+id+'"><span class="zone-card-image">'+cardArtwork(c,glyph,{animate:false,lazy:true,gold:false})+'</span><strong>'+c.name+'</strong><small>'+cardTypeLine(c)+' · '+c.rarity+(zone==='extra'?' · 강림 조건 확인':'')+'</small></button>';}).join(''):'<div class="inspector-empty">이 영역에 카드가 없습니다.</div>';
 $('zoneDialog').showModal();
}
function openDeck(){if(PROGRESS.state.starter===null){PROGRESS.screen('starter');return;}editDeckList=getSaved(pickedFaction).slice();editAceList=getAceDeck(pickedFaction);filterType='all';searchText='';deckSort='recent';hideGeneric=false;$('cardSearch').value='';$('typeFilter').value='all';$('deckSort').value=deckSort;$('hideGeneric').checked=false;$('deckOverlay').classList.remove('hidden');renderCatalog();}
function deckQty(cid){return editDeckList.filter(x=>x===cid).length;}
function renderCatalog(){
 const f=pickedFaction,query=searchText.toLowerCase();
 const cards=DATA.cards.filter(c=>(c.faction===-1||c.faction===f)&&(!hideGeneric||c.faction!==-1)&&(filterType==='all'||filterType==='ace'&&c.rank===2||c.type===filterType)&&c.name.toLowerCase().includes(query));
 const recent=PROGRESS.state.recent||{};
 cards.sort((a,b)=>deckSort==='name'?a.name.localeCompare(b.name,'ko'):deckSort==='faction'?(Number(b.faction===f)-Number(a.faction===f))||Number(recent[b.id]||0)-Number(recent[a.id]||0):Number(recent[b.id]||0)-Number(recent[a.id]||0));
 $('cardCatalog').innerHTML=cards.map(c=>{
  const count=deckQty(c.id),owned=PROGRESS.owned(c.id),fc=c.faction===-1?{glyph:'◇',color:'#d6c491'}:F(c.faction);
  const enrolled=editAceList.includes(c.id);
  const buttons=c.rank===2?'<button type="button" class="catalog-ace" data-register-ace="'+c.id+'" aria-pressed="'+enrolled+'" '+(!owned||!enrolled&&editAceList.length>=COMBO.maxAces?'disabled':'')+'>'+(enrolled?'해제':'등록')+'</button>':
   '<button data-minus="'+c.id+'" '+(count===0?'disabled':'')+'>−</button><b>'+count+'</b><button data-plus="'+c.id+'" '+(count>=Math.min(3,owned)||editDeckList.length>=40?'disabled':'')+'>+</button>';
  return '<div class="catalog-row" data-card-type="'+c.type+'" style="--c:'+fc.color+'"><button class="catalog-art '+(usesGold(c.id)?'gold-art':'')+'" data-art-preview="'+c.id+'" aria-label="'+c.name+' 일러스트·황금 버전 보기">'+cardArtwork(c,fc.glyph,{animate:false,lazy:true})+'</button><div class="catalog-info"><b title="'+c.name+'">'+c.name+'</b><small>'+cardTypeLine(c)+' · '+c.rarity+' · 보유 '+owned+' · '+(c.type==='unit'?c.atk+' / '+c.hp:c.desc)+(c.profileText?' · '+c.profileText:'')+(c.holdAbility?' · 격돌 유지: '+c.holdAbility.rules:'')+'</small></div><div class="catalog-buttons">'+buttons+'</div></div>';
 }).join('');
 $('deckCurrent').textContent=editDeckList.length+' / 40';
 $('aceDeckCurrent').textContent='에이스 '+editAceList.length+' / '+COMBO.maxAces;
 $('deckWarning').textContent=editDeckList.length===40?'대전용 40장 덱이 완성되었습니다.':'40장이 되도록 카드를 조정해 주세요.';
 $('saveDeck').disabled=!PROGRESS.hasDeck(editDeckList,f);
}
function wireDrag(){
 const root=$('gameScreen');
 let dragging=null;
 function fieldUnit(element){
  if(!element)return null;
  const {side,zone,index}=element.dataset, p=game.players[Number(side)];
  return zone==='clash'?p.clash:p.units[Number(index)];
 }
 function destination(node){
  if(!dragging||!game||game.winner!==null||game.owner!==0)return null;
  if(node.closest('[data-phase-drop="combat"]')&&dragging.kind==='attack'&&game.stage==='main')return {phase:true};
  const marker=node.closest('[data-side]'),target=fieldUnit(marker);
  const lane=node.closest('[data-lane]'),slot=lane?Number(lane.dataset.laneIndex):undefined;
  if(dragging.kind==='attack'){
   const attacker=allUnits(0).find(u=>u.uid===dragging.uid);
   if(node.closest('[data-base="enemy"]')&&canAttack(attacker,true))return {core:true,attacker};
   if(marker?.dataset.side==='1'&&canAttack(attacker,false,target))return {core:false,attacker,zone:marker.dataset.zone,index:Number(marker.dataset.index)};
   return null;
  }
  const c=C(game.players[0].hand[dragging.index]);
  if(c?.id!==dragging.cid||!handAction(c))return null;
  if(target&&c.type!=='reaction'&&targetsFor(0,c).includes(target))return {target};
  if(lane?.dataset.laneSide!=='0'||!lane.classList.contains('empty'))return null;
  if(c.type==='unit'&&lane.dataset.lane==='units')return {slot};
  if(c.type!=='unit'&&lane.dataset.lane==='spells')return c.type==='tactic'?{}:{slot};
  return null;
 }
 function cleanup(){
  dragging=null;root.classList.remove('dragging-card');
  root.querySelectorAll('.drag-legal').forEach(x=>x.classList.remove('drag-legal'));
 }
 root.addEventListener('dragstart',e=>{
  const button=e.target.closest('[draggable="true"]');if(!button||!game)return;
  if(button.dataset.hand!==undefined){
   const index=Number(button.dataset.hand);dragging={kind:'hand',index,cid:game.players[0].hand[index]};
  }else{
   const unit=fieldUnit(button);if(!unit)return;
   dragging={kind:'attack',uid:unit.uid};
  }
  e.dataTransfer.setData('text/plain','dimension-war-card');e.dataTransfer.effectAllowed='move';
  root.classList.add('dragging-card');
  for(const node of root.querySelectorAll('[data-lane], [data-side], [data-base="enemy"], [data-phase-drop]')){
   if(destination(node))node.classList.add('drag-legal');
  }
 });
 root.addEventListener('dragover',e=>{if(destination(e.target)){e.preventDefault();e.dataTransfer.dropEffect='move';}});
 root.addEventListener('dragend',cleanup);
 root.addEventListener('drop',e=>{
  const move=destination(e.target), source=dragging;
  if(!move)return;
  e.preventDefault();cleanup();
  if(move.phase){setPhase('combat');return;}
  if(source.kind==='hand'){humanPlay(source.index,{target:move.target,slot:move.slot});return;}
  const u=move.attacker;
  game.selected={kind:'field',side:0,uid:u.uid,zone:game.players[0].clash===u?'clash':'units'};
  game.viewedEnemy=null;humanAttack(move.core,move.zone,move.index);
 });
}
function onEvent(){
 $('factionGrid').addEventListener('click',ev=>{const b=ev.target.closest('[data-faction]');if(!b)return;pickedFaction=Number(b.dataset.faction);renderFactionLobby();});
 $('startGame').addEventListener('click',initGame);
 $('bgmToggle').addEventListener('click',()=>{const enabled=AUDIO.toggleMusic();$('bgmToggle').textContent=enabled?'배경음 켬':'배경음 끔';$('bgmToggle').setAttribute('aria-pressed',String(enabled));});
 $('sfxToggle').addEventListener('click',()=>{const enabled=AUDIO.toggleSfx();$('sfxToggle').textContent=enabled?'타격음 켬':'타격음 끔';$('sfxToggle').setAttribute('aria-pressed',String(enabled));if(enabled)AUDIO.hit(5);});
 $('editDeck').addEventListener('click',openDeck);
 $('closeDeck').addEventListener('click',()=>$('deckOverlay').classList.add('hidden'));
 $('cardSearch').addEventListener('input',ev=>{searchText=ev.target.value;renderCatalog();});
 $('typeFilter').addEventListener('change',ev=>{filterType=ev.target.value;renderCatalog();});
 $('deckSort').addEventListener('change',ev=>{deckSort=ev.target.value;renderCatalog();});
 $('hideGeneric').addEventListener('change',ev=>{hideGeneric=ev.target.checked;renderCatalog();});
 $('cardCatalog').addEventListener('click',ev=>{
  const register=ev.target.closest('[data-register-ace]');
  if(register){
   const id=register.dataset.registerAce,index=editAceList.indexOf(id);
   if(index>=0)editAceList.splice(index,1);
   else if(editAceList.length<COMBO.maxAces&&PROGRESS.owned(id)&&C(id)?.rank===2)editAceList.push(id);
   renderCatalog();return;
  }
  const plus=ev.target.closest('[data-plus]'),minus=ev.target.closest('[data-minus]');
  if(!plus&&!minus)return;
  if(plus&&editDeckList.length<40&&deckQty(plus.dataset.plus)<Math.min(3,PROGRESS.owned(plus.dataset.plus)))editDeckList.push(plus.dataset.plus);
  if(minus){const n=editDeckList.indexOf(minus.dataset.minus);if(n>=0)editDeckList.splice(n,1);}
  renderCatalog();
 });
 document.addEventListener('click',ev=>{
  const zone=ev.target.closest('[data-zone-view]');if(zone){showZone(Number(zone.dataset.side),zone.dataset.zoneView);return;}
  const button=ev.target.closest('[data-art-preview]');
  if(button)showArtPreview(button.dataset.artPreview,Object.hasOwn(button.dataset,'enemyArt')?false:undefined);
 });
 document.addEventListener('error',ev=>{
  const picture=ev.target.closest?.('.card-picture');
  if(!picture)return;
  const source=picture.querySelector('source');
  if(source)source.remove();
  else picture.remove();
 },true);
 $('artPreviewGold').addEventListener('click',()=>{
  const id=previewCardId;
  if(!C(id)||!PROGRESS.state.gold[id]||!PROGRESS.state.owned[id])return;
  if(goldCards.has(id))goldCards.delete(id);else goldCards.add(id);
  try {localStorage.setItem(goldKey,JSON.stringify([...goldCards]));} catch {}
  showArtPreview(id);
 });
 $('artPreview').addEventListener('close',()=>{
  $('artPreviewImage').replaceChildren();
  if(!$('deckOverlay').classList.contains('hidden'))renderCatalog();
  if(game&&!$('gameScreen').classList.contains('hidden'))render();
 });
 $('resetDeck').addEventListener('click',()=>{editDeckList=PROGRESS.suggested(pickedFaction);renderCatalog();});
 $('saveDeck').addEventListener('click',()=>{if(!PROGRESS.hasDeck(editDeckList,pickedFaction))return;saveDeck(pickedFaction,editDeckList);saveAces(pickedFaction,editAceList);$('deckOverlay').classList.add('hidden');renderFactionLobby();toast('메인 덱 40장과 에이스 존 '+editAceList.length+'장 저장');});
 $('myHand').addEventListener('click',ev=>{const b=ev.target.closest('[data-hand]');if(b)selectHand(Number(b.dataset.hand));});
 const clickField=ev=>{
  const s=ev.target.closest('[data-side]');if(s)selectField(Number(s.dataset.side),s.dataset.zone,Number(s.dataset.index));
  const sp=ev.target.closest('[data-spell-index]');if(sp){const side=Number(sp.dataset.spellSide),c=game.players[side].spells[Number(sp.dataset.spellIndex)];if(c){if(side===1&&c.faceDown)toast('상대의 세트 카드');else showArtPreview(c.cid);}}
 };
 ['enemyUnits','myUnits','enemyClash','myClash','enemySpells','mySpells'].forEach(id=>$(id).addEventListener('click',clickField));
 $('inspector').addEventListener('click',ev=>{const b=ev.target.closest('[data-inspect-action]');if(!b)return;const a=b.dataset.inspectAction;if(a==='play')humanPlay(game.selected.index);if(a==='clash')enterClash();if(a==='retreat')withdraw();if(a==='core')humanAttack(true);if(a==='cancel-target'){game.pendingTarget=null;render();}if(a==='enemy'){const view=game.viewedEnemy;game.viewedEnemy=null;humanAttack(false,view.zone,view.index);}});
 $('inspector').addEventListener('click',ev=>{
  const open=ev.target.closest('[data-inspect-action="special"]');
  if(open&&game.selected?.kind==='hand')humanPlay(game.selected.index,{method:'special'});
  const move=ev.target.closest('[data-move-slot]');
  if(move&&game.selected?.kind==='field'&&reposition(0,game.selected.uid,Number(move.dataset.moveSlot))){
   game.selected.index=Number(move.dataset.moveSlot);render();
  }
  const detach=ev.target.closest('[data-detach-material]');
  if(detach&&game.selected?.kind==='field'&&activateAce(0,game.selected.uid,Number(detach.dataset.detachMaterial)))render();
 });
 $('comboRail').addEventListener('click',ev=>{
  const ace=ev.target.closest('[data-summon-ace]');if(ace)humanSummonAce(ace.dataset.summonAce);
  if(ev.target.closest('[data-raise-echo]')&&raiseEcho(0))render();
 });
 $('searchOverlay').addEventListener('click',ev=>{
  const choice=ev.target.closest('[data-search-choice]');
  if(choice)resolveSearchChoice(0,choice.dataset.searchChoice);
 });
 $('attackCoreBtn').addEventListener('click',()=>humanAttack(true));
 $('enemyBasePlate').addEventListener('click',()=>humanAttack(true));
 $('clashBtn').addEventListener('click',enterClash);
 $('withdrawBtn').addEventListener('click',withdraw);
 $('combatPhaseBtn').addEventListener('click',()=>{if(game?.owner===0&&game.stage==='main')setPhase('combat');});
 $('mainPhaseBtn').addEventListener('click',()=>{if(game?.owner===0&&game.stage==='combat')setPhase('main');});
 $('endTurnBtn').addEventListener('click',()=>{if(game?.owner===0&&game.stage==='combat')finishTurn(0);});
 $('reactionPass').addEventListener('click',endReaction);
 $('surrenderBtn').addEventListener('click',()=>{if(game&&game.winner===null&&confirm('정말 기권하시겠습니까?'))finishGame(1,'기권');});
 $('rematchBtn').addEventListener('click',()=>game?.tutorial&&!PROGRESS.state.tutorialDone?startTutorial():initGame());
 $('backLobbyBtn').addEventListener('click',()=>{$('resultOverlay').classList.add('hidden');$('gameScreen').classList.add('hidden');$('lobbyScreen').classList.remove('hidden');renderFactionLobby();});
 document.addEventListener('keydown',ev=>{
  if($('artPreview').open)return;
  if(ev.key==='Escape'&&game?.pendingTarget){game.pendingTarget=null;render();return;}
  if(ev.key==='Escape'&&(!$('deckOverlay').classList.contains('hidden')))$('deckOverlay').classList.add('hidden');
  if(ev.key==='Enter'&&pendingReact)endReaction();
 });
 wireDrag();
}
if(PROGRESS.state.starter!==null)pickedFaction=PROGRESS.state.starter;
onEvent();
PROGRESS.init({preview:showArtPreview,change:renderFactionLobby});
 ACCOUNTS.init();
AUDIO.init();
if(ACCOUNTS.active&&PROGRESS.state.starter===null)PROGRESS.screen('starter');
// Lightweight public diagnostic hook for smoke testing card/deck constraints.
window.DimensionWar={data:DATA,getState:()=>game,validateDeck:DATA.isValidDeck,startTutorial};
})();
