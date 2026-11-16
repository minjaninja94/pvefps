(() => {
  const data=window.TCG_DATA, $=id=>document.getElementById(id);
  const newArt=new Set(window.TCG_NEW_ART||[]);
  const key=window.TCG_ACCOUNTS.key('dimension-war-collection-v1'), price=100;
  const fresh=()=>({starter:null,starterPacks:{},coins:0,tutorialCoins:0,owned:{},gold:{},dust:{},recent:{},acquiredSeq:0,tutorial:0,tutorialDone:false,beginnerClaimed:[],progressCounts:{},packs:0,day:{date:'',counts:{},claimed:[]}});
  function load(){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      if(value&&Number.isInteger(value.coins)&&value.coins>=0&&value.owned&&value.gold&&value.day){value.dust??={};value.starterPacks??={};value.tutorialCoins??=0;value.tutorialDone??=value.tutorial>=6||!!value.comboReward;value.beginnerClaimed??=[];value.progressCounts??={};if(!value.recent||typeof value.recent!=='object'||Array.isArray(value.recent))value.recent={};if(!Number.isInteger(value.acquiredSeq)||value.acquiredSeq<0)value.acquiredSeq=0;if(value.starter!==null)value.starterPacks[value.starter]=true;return value;}
    }catch{}
    return fresh();
  }
  const state=load();
  function starterAce(){
    if(state.starter===null||!state.tutorialDone||state.comboReward)return;
    for(const id of data.makeAceDeck(state.starter).slice(0,3)){if(!state.owned[id])markAcquired(id);state.owned[id]=Math.max(1,state.owned[id]||0);}
    state.comboReward=true;save();
  }
  const plates=[
    ['standard','균열 전초기지','#a2bbed','#253a6a'],['royal','어명 궁문','#efbd51','#833b3c'],
    ['neon','네온 라이브 스테이지','#ff9fe5','#7732ae'],['iron','제로 방열판','#ffd097','#564238'],
    ['dusk','진홍 영묘','#ff8796','#4f1431'],['green','개화의 세계수','#a8f590','#235842'],
    ['abyss','심연의 숨결','#78f3e5','#184967'],['nebula','좌표 전이 기함','#a5c4ff','#302e75'],
    ['glass','공명 수정궁','#e6afff','#5b376c'],['eventide','금빛 균열 왕좌','#ffda6c','#69451b'],
  ];
  state.plates=Array.isArray(state.plates)?state.plates:['standard'];
  state.plate=state.plate||'standard';
  let lastPlate='';
  const rank=c=>({C:1,R:2,SR:3,UR:3,LR:4}[c.rarity]||1);
  const ranks=['','일반','희귀','고급 희귀','전설'];
  const label=(card,gold)=>gold?(rank(card)===4?'황금 전설':'황금 희귀'):ranks[rank(card)];
  const pool=data.factions.map((_,i)=>[1,2,3,4].map(r=>data.cards.filter(c=>rank(c)===r&&(c.faction===i||c.faction===-1))));
  const missions=[
    ['duel','AI 대전 완주',1,180],['win','AI 대전 승리',1,260],['summon','몬스터 배치·강림',5,135],
    ['spell','마법 해결',4,140],['gear','장비 마법 장착',2,130],['attack','몬스터 공격 처리',5,150],
    ['clash','격돌존 진입',3,150],['occupy','격돌존 단독 점령',2,165],['trap','함정 발동',2,150],
    ['turn','내 턴 종료',6,140],['high','고수 강림 성공',1,185],['pack','진영 팩 개봉',2,100],
  ];
  const beginnerMissions=[
    ['duel-one','첫 AI 대전 완료','duel',1,250],['special-five','특수 소환 5회','special',5,350],
    ['search-three','덱에서 카드 3회 서치','search',3,300],['spell-five','마법 5회 해결','spell',5,300],
    ['attack-eight','공격 8회 처리','attack',8,350],['win-one','AI 대전 첫 승리','win',1,450],
    ['ace-one','에이스 강림 1회','high',1,500],['duel-three','AI 대전 3회 완주','duel',3,500],
  ];
  const lessons=[
    ['손패와 카드 프레임','노란 몬스터는 전장에 남아 싸웁니다. 파란 마법은 발동하면 해결되고, 장비 마법은 장착된 채 유지됩니다. 붉은 함정은 상대 행동에 대응합니다. 카드 이미지나 전장에 공개된 카드의 설명에서 효과를 확인할 수 있습니다.','상대 공격에 대응할 카드는?',['몬스터','함정','일반 마법'],1],
    ['배치와 강림','하수는 기본 배치로 내 턴에 1기까지 놓습니다. 중수는 아군 몬스터 2기 또는 이번 턴 마법 1회 해결이 필요합니다. 고수는 첫 턴 이후 진영 고유 조건과 대가를 만족해야 합니다.','마법을 아직 쓰지 않았다면 중수 강림에 필요한 아군 몬스터는?',['1기','2기','5기'],1],
    ['공격과 수호','전투 단계에서 아군을 고른 뒤 상대 공개 카드를 누르면 상세와 공격 버튼이 나옵니다. 새로 등장한 몬스터는 그 턴에 공격할 수 없습니다. 상대 수호 몬스터가 있으면 본진 직접 공격이 막힙니다.','본진 직접 공격을 막는 효과는?',['수호','드로우','격리'],0],
    ['격돌존과 점령','아군을 선택하고 격돌존에 진입하면 그 턴에는 그 몬스터가 움직임을 마칩니다. 다음 내 턴 종료부터 상대 격돌존이 비어 있으면 단독 점령 피해를 줍니다.','단독 점령 피해를 계산하는 때는?',['격돌존에 들어가는 즉시','다음 내 턴 종료부터','상대 덱을 섞을 때'],1],
    ['카드 효과의 발동 시점','효과 상단의 조건을 읽으세요. 등장, 파괴, 격돌존 진입·철수, 마법 해결, 턴 시작·종료는 서로 다른 발동 시점입니다. 고수 에이스는 진영 시너지를 갖춰야 결전 효과가 폭발합니다.','피해로 파괴될 때 효과가 있는 몬스터를 손패로 돌리면?',['파괴 효과가 발동한다','두 번 발동한다','파괴 효과가 발동하지 않는다'],2],
    ['진영 팩과 덱 개조','한 팩은 100 균열석에 카드 5장입니다. 어느 진영 팩에서도 범용 카드가 나옵니다. 갖고 있는 카드만 덱에 넣을 수 있고 덱은 40장, 같은 카드 최대 3장입니다. 황금 카드는 애니메이션 외형으로 사용할 수 있습니다.','다른 진영 팩에서도 나오는 카드 종류는?',['범용 카드','모든 진영 전용 카드','스타터 전체'],0],
  ];
  let mode='', results=[], opened=0, chosenPack=0, preview=()=>{}, change=()=>{}, revealRun=0, sequence=false;
  let drag=null,skipClick=false;
  function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{}}
  function markAcquired(id){state.acquiredSeq=(state.acquiredSeq||0)+1;state.recent[id]=state.acquiredSeq;}
  function dateKey(){const d=new Date();return [d.getFullYear(),d.getMonth()+1,d.getDate()].join('-');}
  function today(){const date=dateKey();if(state.day.date!==date){state.day={date,counts:{},claimed:[]};save();}return state.day;}
  function count(metric,n=1){const day=today();day.counts[metric]=(day.counts[metric]||0)+n;state.progressCounts[metric]=(state.progressCounts[metric]||0)+n;save();}
  function notify(){save();if($('coinBalance'))$('coinBalance').textContent=state.coins.toLocaleString()+' ◆';change();}
  function chooseStarter(faction){
    if(!window.TCG_ACCOUNTS.active||state.starter!==null||!data.factions[faction])return false;
    state.starter=faction;
    state.starterPacks[faction]=true;
    for(const id of data.makeStarter(faction)){state.owned[id]=(state.owned[id]||0)+1;markAcquired(id);}
    notify();change(faction);return true;
  }
  function buyStarter(faction){
    if(!Number.isInteger(faction)||!data.factions[faction]||state.starterPacks[faction]||state.coins<500)return false;
    state.coins-=500;state.starterPacks[faction]=true;
    for(const id of data.makeStarter(faction)){state.owned[id]=(state.owned[id]||0)+1;markAcquired(id);}
    notify();change(faction);return true;
  }
  function hasStarter(faction){return !!state.starterPacks[faction];}
  function owned(id){return (state.owned[id]||0)+(state.gold[id]||0);}
  function hasDeck(deck,faction){
    if(!data.isValidDeck(deck,faction))return false;
    const qty={};
    return deck.every(id=>(qty[id]=(qty[id]||0)+1)<=owned(id));
  }
  function suggested(faction){
    if(state.starterPacks[faction]&&hasDeck(data.makeStarter(faction),faction))return data.makeStarter(faction);
    return data.cards.filter(c=>c.rank!==2&&(c.faction===faction||c.faction===-1)).flatMap(c=>Array(Math.min(3,owned(c.id))).fill(c.id)).slice(0,40);
  }
  function payDuel(won,turns){
    count('duel');if(won)count('win');
    state.coins+=won?140:Math.min(80,Math.max(20,turns*10));notify();
  }
  function pull(faction,n,random=Math.random){
    if(state.starter===null||!pool[faction]||![1,10].includes(n))return [];
    const cost=n*price,tutorialSpend=faction===state.starter?Math.min(cost,state.tutorialCoins):0;
    if(state.coins+tutorialSpend<cost)return [];
    state.tutorialCoins-=tutorialSpend;state.coins-=cost-tutorialSpend;
    const draws=Array.from({length:n*5},(_,i)=>{
      const weights=i%5===4?[0,72,24,4]:[70,23,6,1];
      let value=random()*100;
      const group=pool[faction][weights.findIndex(w=>(value-=w)<0)];
      const card=group[Math.floor(random()*group.length)];
      const gold=rank(card)>=2&&random()<.10, book=gold?state.gold:state.owned;
      const previousCopies=owned(card.id),overflow=previousCopies>=3;
      if(overflow)state.dust[rank(card)]=(state.dust[rank(card)]||0)+1;
      else {book[card.id]=(book[card.id]||0)+1;markAcquired(card.id);}
      return {card,gold:overflow?false:gold,newCopy:!overflow&&previousCopies===0,overflow,revealed:false};
    });
    state.packs+=n;count('pack',n);notify();return draws;
  }
  function dailyList(){
    const day=today(),[y,m,d]=day.date.split('-').map(Number),offset=Math.floor(Date.UTC(y,m-1,d)/86400000)%missions.length;
    return Array.from({length:5},(_,i)=>missions[(offset+i*5)%missions.length]);
  }
  function claim(metric){
    const day=today(),mission=dailyList().find(m=>m[0]===metric);
    if(!mission||day.claimed.includes(metric)||(day.counts[metric]||0)<mission[2])return false;
    day.claimed.push(metric);state.coins+=mission[3];notify();return true;
  }
  function completeTutorial(){if(state.starter===null||state.tutorialDone)return false;state.tutorialDone=true;state.tutorialCoins+=1000;starterAce();notify();return true;}
  function claimBeginner(id){
    const mission=beginnerMissions.find(item=>item[0]===id);
    if(!mission||state.beginnerClaimed.includes(id)||(state.progressCounts[mission[2]]||0)<mission[3])return false;
    state.beginnerClaimed.push(id);state.coins+=mission[4];notify();return true;
  }
  function plate(){return plates.find(item=>item[0]===state.plate)||plates[0];}
  function pullPlate(){
    const available=plates.filter(item=>!state.plates.includes(item[0]));
    if(state.coins<100||!available.length)return false;
    const result=available[Math.floor(Math.random()*available.length)];
    state.coins-=100;state.plates.push(result[0]);lastPlate=result[1];notify();return true;
  }
  function inDeck(id){
    for(let faction=0;faction<data.factions.length;faction++){
      let main=null,extra=null;
      try{main=JSON.parse(localStorage.getItem(window.TCG_ACCOUNTS.key('dw-tcg-deck-'+faction))||'null');}catch{}
      try{extra=JSON.parse(localStorage.getItem(window.TCG_ACCOUNTS.key('dw-tcg-aces-'+faction))||'null');}catch{}
      if(!Array.isArray(main)&&state.starter===faction)main=data.makeStarter(faction);
      if(!Array.isArray(extra)&&state.starter===faction)extra=data.cards.filter(card=>card.faction===faction&&card.rank===2&&owned(card.id)>0).map(card=>card.id);
      if(main?.includes(id)||extra?.includes(id))return true;
    }
    return false;
  }
  function dismantle(id,gold=false){
    const card=data.byId[id],book=gold?state.gold:state.owned;
    if(!card||!book[id]||inDeck(id))return false;
    book[id]--;if(!book[id])delete book[id];
    if(gold&&owned(id)<3)state.owned[id]=(state.owned[id]||0)+1;
    else state.dust[rank(card)]=(state.dust[rank(card)]||0)+1;
    notify();return true;
  }
  function craft(id,faction){
    const card=data.byId[id];if(!card||(card.faction!==-1&&card.faction!==faction)||owned(id)>=3)return false;
    const tier=rank(card);if((state.dust[tier]||0)<3)return false;
    state.dust[tier]-=3;state.owned[id]=(state.owned[id]||0)+1;markAcquired(id);notify();return true;
  }
  function screen(name){
    mode=name;render();if(!$('progressDialog').open)$('progressDialog').showModal();
  }
  function stopReveal(){revealRun++;sequence=false;if(typeof packEffects!=='undefined')packEffects.clear(true);}
  function render(){
    const body=$('progressBody');
    if(mode==='starter'){
      $('progressTitle').textContent='첫 스타터 덱';
      body.innerHTML='<p>무료 스타터 진영 하나를 고르세요. 다른 진영은 진영별 스타터 팩을 각각 500 ◆에 구매해 덱을 열 수 있습니다.</p><div class="progress-factions">'+data.factions.map((f,i)=>'<button class="ghost-btn" data-starter="'+i+'">'+f.glyph+' '+f.name+'</button>').join('')+'</div>';return;
    }
    if(mode==='tutorial'){
      $('progressTitle').textContent='첫 대전 튜토리얼';
      body.innerHTML='<p>퀴즈 없이 선택한 진영으로 AI와 짧게 대전합니다. 필드에서 일반 소환, 덱에서 직접 카드 선택, 특수 소환, 전투를 단계별로 안내합니다.</p><p class="tutorial-reward">완료 보상: 선택 진영 팩에만 쓸 수 있는 1,000 ◆'+(state.tutorialDone?' · 이미 받음':'')+' · 에이스 3장</p><button data-start-tutorial class="primary-btn">'+(state.tutorialDone?'튜토리얼 다시 하기':'AI 튜토리얼 시작')+'</button>';return;
    }
    if(mode==='starters'){
      $('progressTitle').textContent='진영별 스타터 팩';
      body.innerHTML='<p>각 스타터 팩은 해당 진영의 기본 덱 40장을 한 번 지급합니다. 게임 재화 500 ◆ · 실제 결제 없음.</p><div class="progress-factions starter-shop-grid">'+data.factions.map((f,i)=>'<article class="starter-shop-card"><strong>'+f.glyph+' '+f.name+'</strong><small>메인 덱 40장</small><button class="ghost-btn" data-buy-starter="'+i+'" '+(state.starterPacks[i]||state.coins<500?'disabled':'')+'>'+(state.starterPacks[i]?'보유 중':'스타터 구매 · 500 ◆')+'</button></article>').join('')+'</div>';return;
    }
    if(mode==='quests'){
      $('progressTitle').textContent='일일 퀘스트';
      const day=today(),beginnerTotal=beginnerMissions.reduce((sum,m)=>sum+m[4],0);
      body.innerHTML='<h3>초보자 미션 · 누적 보상 '+beginnerTotal.toLocaleString()+' ◆</h3><p>서치·강림·전투를 익히며 보상을 모으세요. 일반 AI 대전 3~5회, 약 1시간 플레이를 목표로 구성했습니다.</p><ul class="quest-list">'+beginnerMissions.map(([id,title,metric,goal,coins])=>{
        const n=Math.min(goal,state.progressCounts[metric]||0),claimed=state.beginnerClaimed.includes(id);
        return '<li><div><strong>'+title+'</strong><small>'+n+' / '+goal+' · 보상 '+coins+' ◆</small></div><button class="ghost-btn" data-claim-beginner="'+id+'" '+(n<goal||claimed?'disabled':'')+'>'+(claimed?'수령 완료':'받기')+'</button></li>';
      }).join('')+'</ul><h3>일일 미션</h3><p>매일 자정 갱신 · AI 대전 승리 보너스 140 ◆</p><ul class="quest-list">'+dailyList().map(([metric,title,goal,coins])=>{
        const n=Math.min(goal,day.counts[metric]||0),claimed=day.claimed.includes(metric);
        return '<li><div><strong>'+title+'</strong><small>'+n+' / '+goal+' · 보상 '+coins+' ◆</small></div><button class="ghost-btn" data-claim="'+metric+'" '+(n<goal||claimed?'disabled':'')+'>'+(claimed?'수령 완료':'받기')+'</button></li>';
      }).join('')+'</ul>';return;
    }
    if(mode==='plates'){
      $('progressTitle').textContent='본진 장식 팩';
      body.innerHTML='<p>100 균열석으로 아직 없는 본진판을 무작위 획득합니다. 장식 효과는 외형에 적용됩니다.</p><div class="pack-controls"><button class="primary-btn" data-plate-pull '+(state.coins<100||state.plates.length===plates.length?'disabled':'')+'>장식 1회 뽑기 · 100 ◆</button></div><p role="status">'+(lastPlate?'새 장식 · '+lastPlate:'')+'</p><div class="progress-factions">'+plates.map(([id,name,accent,base])=>'<button class="base-plate" style="--base-accent:'+accent+';--base-fill:'+base+'" data-plate="'+id+'" '+(!state.plates.includes(id)?'disabled':'')+'>'+name+'<small>'+(state.plate===id?'장착 중':state.plates.includes(id)?'장착 가능':'잠김')+'</small></button>').join('')+'</div>';return;
    }
    if(mode==='craft'){
      $('progressTitle').textContent='카드 제작 · 분해';
      const selectedRank=Number($('craftRank')?.value)||1, eligible=data.cards.filter(c=>rank(c)===selectedRank&&(c.faction===chosenPack||c.faction===-1));
      const chosen=eligible.find(c=>c.id===chosenCraftTarget)||eligible[0];
      const ownedCards=data.cards.filter(c=>rank(c)===selectedRank&&(c.faction===chosenPack||c.faction===-1)&&owned(c.id)>0);
      body.innerHTML='<div class="pack-shopbar"><label>진영<select id="packFaction">'+data.factions.map((f,i)=>'<option value="'+i+'" '+(i===chosenPack?'selected':'')+'>'+f.name+'</option>').join('')+'</select></label><strong>등급 재료</strong></div>'+
       '<div class="craft-dust">'+[1,2,3,4].map(r=>'<span>'+ranks[r]+' <b>'+Number(state.dust[r]||0)+'</b></span>').join('')+'</div>'+ 
       '<div class="craft-controls"><label>제작 등급<select id="craftRank">'+[1,2,3,4].map(r=>'<option value="'+r+'" '+(r===selectedRank?'selected':'')+'>'+ranks[r]+' · 3장</option>').join('')+'</select></label><label>제작 카드<select id="craftTarget">'+eligible.map(c=>'<option value="'+c.id+'" '+(c.id===chosen?.id?'selected':'')+'>'+c.name+' · '+c.rarity+'</option>').join('')+'</select></label><button class="primary-btn" data-craft="'+(chosen?.id||'')+'" '+(!chosen||(state.dust[selectedRank]||0)<3||owned(chosen.id)>=3?'disabled':'')+'>같은 등급 1장 제작</button></div>'+ 
       '<p>일반 카드 3장을 분해하면 같은 등급 재료 3개를 얻습니다. 황금 카드를 분해하면 같은 카드의 일반판 1장으로 바뀝니다. 4번째부터 중복 팩 카드는 자동 분해됩니다.</p>'+ 
       '<div class="craft-list">'+(ownedCards.length?ownedCards.map(c=>'<div class="craft-row"><strong>'+c.name+'</strong><small>'+c.rarity+' · 일반 '+Number(state.owned[c.id]||0)+' · 황금 '+Number(state.gold[c.id]||0)+'</small><button class="ghost-btn" data-dismantle="'+c.id+'" '+(!state.owned[c.id]||inDeck(c.id)?'disabled':'')+'>일반 분해 +1</button><button class="ghost-btn" data-dismantle-gold="'+c.id+'" '+(!state.gold[c.id]||inDeck(c.id)?'disabled':'')+'>황금 → 일반판</button></div>').join(''):'<p>이 등급에서 분해할 보유 카드가 없습니다.</p>')+'</div>';
      return;
    }
    $('progressTitle').textContent='진영 카드팩';
    const availableCoins=state.coins+(chosenPack===state.starter?state.tutorialCoins:0);
    body.innerHTML='<div class="pack-shopbar"><label>진영 팩<select id="packFaction">'+data.factions.map((f,i)=>'<option value="'+i+'" '+(i===chosenPack?'selected':'')+'>'+f.name+'</option>').join('')+'</select></label><strong>'+state.coins.toLocaleString()+' ◆</strong></div>'+
      '<p>팩마다 5장 · 마지막 카드는 희귀 이상 · 희귀 이상 카드의 10% 확률로 황금판 · 모든 팩에 범용 80종 포함</p><p class="tutorial-wallet">선택 진영 전용 튜토리얼 재화: <b>'+state.tutorialCoins.toLocaleString()+' ◆</b>'+(chosenPack===state.starter?' · 이 진영 팩에서만 자동 사용':' · 다른 진영 팩에는 쓸 수 없음')+'</p><div class="pack-controls"><button data-pull="1" class="primary-btn" '+(availableCoins<price?'disabled':'')+'>1팩 · 100 ◆</button><button data-pull="10" class="ghost-btn" '+(availableCoins<price*10?'disabled':'')+'>10팩 · 1,000 ◆</button><button data-sound class="ghost-btn">연출 소리 켜기 / 끄기</button><button id="packRevealAll" class="ghost-btn" '+(!results.some(r=>!r.revealed)?'disabled':'')+'>순차 공개</button></div><p id="packResultsStatus" aria-live="polite"></p><div id="packResults"></div>';
    renderResults();
  }
  function art(card,gold){
    const file=(card.artRef&&!newArt.has(card.id)?card.artRef:card.id)+'.webp';
    return '<picture>'+(gold?'<source media="(prefers-reduced-motion: no-preference)" srcset="art/gold/'+file+'">':'')+'<img alt="" src="art/normal/'+file+'" loading="lazy"></picture>';
  }
  function pullHtml(item,index){
    if(!item.revealed)return '<button class="pack-result-card pack-back" data-pull-index="'+index+'" aria-label="'+(index+1)+'번째 카드 공개">◇</button>';
    const {card,gold}=item;
    return '<button class="pack-result-card '+(gold?'pack-gold':'')+'" data-card-type="'+card.type+'" data-pull-index="'+index+'">'+art(card,gold)+'<strong>'+card.name+'</strong><small>'+label(card,gold)+(item.overflow?' · 중복 자동 분해 +1 재료':item.newCopy?' · 신규':'')+'</small></button>';
  }
  function renderResults(){
    $('packResultsStatus').textContent=opened?opened+'팩 · '+results.filter(x=>x.revealed).length+' / '+results.length+'장 공개':'';
    $('packResults').innerHTML=Array.from({length:opened},(_,p)=>{
      const group=results.slice(p*5,p*5+5);
      return '<section class="result-pack" data-hint="'+Math.max(...group.map(x=>rank(x.card)))+'" '+(group.some(x=>x.gold)?'data-golden-hint':'')+'>'+group.map((item,i)=>pullHtml(item,p*5+i)).join('')+'</section>';
    }).join('');
  }
  function reveal(index,automatic=false){
    const item=results[index], old=$('packResults').querySelector('[data-pull-index="'+index+'"]');
    if(item.revealed){preview(item.card.id,item.gold);return 0;}
    item.revealed=true;old.outerHTML=pullHtml(item,index);
    const card=$('packResults').querySelector('[data-pull-index="'+index+'"]');
    if(!automatic)card.focus({preventScroll:true});
    $('packResultsStatus').textContent=opened+'팩 · '+results.filter(x=>x.revealed).length+' / '+results.length+'장 공개';
    if(results.every(x=>x.revealed))$('packRevealAll').disabled=true;
    return packEffects.reveal(card,rank(item.card),label(item.card,item.gold),item.gold);
  }
  async function revealSequence(){
    if(sequence){stopReveal();$('packRevealAll').textContent='순차 공개';return;}
    sequence=true;const run=++revealRun;
    $('packRevealAll').textContent='공개 멈춤';packEffects.unlockSound();
    for(let i=0;i<results.length&&run===revealRun;i++)if(!results[i].revealed){
      const delay=reveal(i,true);await new Promise(resolve=>setTimeout(resolve,Math.max(140,delay)));
    }
    if(run===revealRun){sequence=false;$('packRevealAll').textContent='순차 공개';}
  }
  function init(callbacks){
    ({preview,change}=callbacks);
    starterAce();
    $('tutorialOpen').onclick=()=>screen(state.starter===null?'starter':'tutorial');
    $('questOpen').onclick=()=>screen(state.starter===null?'starter':'quests');
    $('starterShopOpen').onclick=()=>screen(state.starter===null?'starter':'starters');
    $('shopOpen').onclick=()=>screen(state.starter===null?'starter':'shop');
    $('baseShopOpen').onclick=()=>screen(state.starter===null?'starter':'plates');
    $('craftOpen').onclick=()=>screen(state.starter===null?'starter':'craft');
    $('progressDialog').addEventListener('close',stopReveal);
    $('progressBody').addEventListener('pointerdown',e=>{
      const card=e.target.closest('.pack-back');if(card&&e.isPrimary)drag={id:e.pointerId,x:e.clientX,first:Number(card.dataset.pullIndex),active:false};
    });
    document.addEventListener('pointermove',e=>{
      if(!drag||e.pointerId!==drag.id)return;
      if(!drag.active){
        if(Math.abs(e.clientX-drag.x)<14)return;
        drag.active=true;skipClick=true;packEffects.unlockSound();
        if(!results[drag.first].revealed)reveal(drag.first,true);
      }
      const card=document.elementFromPoint(e.clientX,e.clientY)?.closest('.pack-back');
      if(card)reveal(Number(card.dataset.pullIndex),true);
    });
    for(const type of ['pointerup','pointercancel'])document.addEventListener(type,e=>{
      if(e.pointerId===drag?.id){drag=null;setTimeout(()=>{skipClick=false;},0);}
    });
    $('progressBody').onchange=e=>{if(e.target.id==='packFaction')chosenPack=Number(e.target.value);if(e.target.id==='craftRank')chosenCraftTarget='';if(e.target.id==='craftTarget')chosenCraftTarget=e.target.value;if(e.target.id==='packFaction'||e.target.id==='craftRank'||e.target.id==='craftTarget')render();};
    $('progressBody').onclick=e=>{
      const button=e.target.closest('button');if(!button)return;
      const d=button.dataset;
      if(d.starter!==undefined&&chooseStarter(Number(d.starter))){chosenPack=state.starter;screen('tutorial');}
      if(d.startTutorial!==undefined){$('progressDialog').close();window.DimensionWar?.startTutorial?.();}
      if(d.buyStarter!==undefined&&buyStarter(Number(d.buyStarter)))render();
      if(d.claimBeginner!==undefined&&claimBeginner(d.claimBeginner))render();
      if(d.claim!==undefined&&claim(d.claim))render();
      if(d.openShop!==undefined)screen('shop');
      if(d.platePull!==undefined&&pullPlate())render();
      if(d.plate&&state.plates.includes(d.plate)){state.plate=d.plate;notify();render();}
      if(d.dismantle!==undefined&&dismantle(d.dismantle,false))render();
      if(d.dismantleGold!==undefined&&dismantle(d.dismantleGold,true))render();
      if(d.craft!==undefined&&craft(d.craft,chosenPack))render();
      if(d.sound!==undefined)$('sound-toggle').click();
      if(d.pull!==undefined){
        stopReveal();packEffects.open();const n=Number(d.pull),drawn=pull(chosenPack,n);
        if(drawn.length){results=drawn;opened=n;render();packEffects.scanPacks([...$('packResults').children]);}
      }
      if(d.pullIndex!==undefined&&!skipClick){if(sequence)stopReveal();packEffects.unlockSound();reveal(Number(d.pullIndex));}
      if(button.id==='packRevealAll')void revealSequence();
    };
    if(state.starter!==null)chosenPack=state.starter;
    notify();
  }
  let chosenCraftTarget='';
  window.TCG_PROGRESS={state,owned,hasDeck,hasStarter,suggested,payDuel,count,init,screen,chooseStarter,buyStarter,pull,completeTutorial,claimBeginner,dailyList,claim,plate,pullPlate,dismantle,craft};
})();
