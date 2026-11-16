/* Dimension War TCG · data registry · v0.1 */
(() => {
  'use strict';
  const factions = [
    {key:'joseon',name:'이세계 조선',short:'JOSEON',glyph:'⚔',color:'#e8b773',tiers:['초병','별장','대장군'],trait:'서로 다른 조선 병사 2종을 전개하면 1기 공격력 +2',
      units:['홍련의 포졸','화승총 사수','도깨비 길잡이','비검의 선비','천문대 척후'],mids:['불꽃 군관','청룡의 별장','어명 집행자'],highs:['대장군 홍련','백야의 장군','천명 도깨비왕'],tactics:['왕명 선포','봉화의 진군','어전 군령','진형 재편'],reactions:['암행어사의 개입','금군의 호위','사신의 봉서'],gears:['홍련의 깃발','비늘 갑옷']},
    {key:'idol',name:'네온 아이돌',short:'NEON IDOL',glyph:'✧',color:'#ff80ce',tiers:['연습생','정식 멤버','헤드라이너'],trait:'자기 턴에 세 번째 아이돌이 등장하면 1장 드로우',
      units:['루나의 보컬','별빛 안무가','네온 래퍼','음향 엔지니어','홀로그램 연습생'],mids:['메인 댄서 세라','프로듀서 유키','전광의 센터'],highs:['은하의 디바 루나','절정의 앙코르','무한의 무대주'],tactics:['첫 번째 공연','피날레 리허설','무대의 열기','팬덤의 파도'],reactions:['앵콜 요청','긴급 음향복구','역전의 콜'],gears:['광자 마이크','별빛 코스튬']},
    {key:'machine',name:'철심 기계도시',short:'IRON CITY',glyph:'⚙',color:'#80cfff',tiers:['시제품','실전기','결전기'],trait:'도킹에 소모된 장비 1장을 회수',
      units:['정찰 드론 Q1','구동형 로더','수리 기체','자율 방패기','경량 강습기'],mids:['스틸 프레임','전자포 실전기','모듈 합성체'],highs:['초중장갑 거신','도시 방벽 제로','결전기 오메가'],tactics:['도킹 지시','출력 재분배','나노 복구','방열기 폭발'],reactions:['방화벽 발동','동력 비상차단','방어 모듈 투입'],gears:['플라즈마 엔진','강철 증폭 코어']},
    {key:'blood',name:'황혼 혈족',short:'DUSK COURT',glyph:'☾',color:'#fa8b9b',tiers:['종복','귀족','진조'],trait:'첫 생명력 소모 효과의 비용 4 감소',
      units:['핏빛 종복','황혼의 사냥꾼','장미 시종','묘지 망령','혈계 계승자'],mids:['장미 백작','밤의 공작','핏빛 집행자'],highs:['진조 르네트','월하의 군주','불멸의 여왕'],tactics:['혈계 의식','황혼의 만찬','붉은 속삭임','불사의 거래'],reactions:['피의 계약','장미 가시','밤의 장막'],gears:['유혈의 성배','진홍 왕관']},
    {key:'forest',name:'녹음 수호자',short:'VERDANT',glyph:'❀',color:'#82dbad',tiers:['새싹','정령','세계수'],trait:'상대 턴을 버틴 정령의 내구도 2 회복',
      units:['초록 새싹','숲의 치유사','이끼 사냥꾼','바람의 씨앗','덩굴 수호병'],mids:['봄비 정령','그늘의 정령','가시 군주'],highs:['세계수의 화신','태초의 꽃','영원의 녹음'],tactics:['개화의 노래','녹음의 가호','씨앗의 약속','생명의 샘'],reactions:['대지의 방패','봄바람 응답','가시의 항변'],gears:['순환의 가지','새벽의 이슬']},
    {key:'swarm',name:'심해 군체',short:'ABYSS SWARM',glyph:'☷',color:'#7dcbdb',tiers:['유생체','포식체','심연주'],trait:'대전당 첫 군체 토큰 파괴 시 2/4 유생 생성 · 함정 부활은 3턴마다 1회',
      units:['소형 유생체','침식 촉수','심해 정찰충','기생 개체','어둠 포자'],mids:['심연 포식자','수압 거수','군체 지휘핵'],highs:['심연의 모체','해구 포식군주','완전체 아비수스'],tactics:['포식 진화','심해 증식','산성 분출','검은 해류'],reactions:['탈피 본능','기생 반격','심연의 경고'],gears:['진화 낭포','해저 갑각']},
    {key:'stellar',name:'성운 항해단',short:'STARFARER',glyph:'✦',color:'#a9a7ff',tiers:['탐사대','항행대','기함급'],trait:'턴 첫 위치 이동 시 1장 드로우 · 손패 6장 이상이면 1장 순환',
      units:['공간항법사 루미','좌표 탐사 드론','성운 선원','궤도 측량사','별바람 정찰대'],mids:['차원 항행사','성운 기술장','궤도 전술장교'],highs:['초공간 기함','별의 항로 지휘관','차원의 정복자'],tactics:['차원 전이 장치','좌표 재설정','중력 역전 포격','이계 장치 복구'],reactions:['차원 회피','항행 비상령','워프 인터셉트'],gears:['성도 내비게이터','양자 추진기']},
    {key:'glass',name:'유리 마도원',short:'GLASS ORDER',glyph:'◇',color:'#d6a5fc',tiers:['견습','집행관','대현자'],trait:'서로 다른 전술 2종 해결 시 전술 피해 +3',
      units:['공명 견습생','유리 정찰사','주문 필경사','거울 사도','마력 관측자'],mids:['결계 집행관','수정 소환사','공명 심판관'],highs:['유리 대현자','천면의 현현','마도회의 정점'],tactics:['공명 발동','유리 파동','의식 봉인','프리즘 인장'],reactions:['반사 주문','봉인의 이면','마력 차단선'],gears:['공명 수정구','프리즘 지팡이']}
  ];
  const cardList=[], byId={};
  const add = (obj) => {
    const card={...obj, rarity:obj.rarity||'C'};
    if(card.type==='unit'){
      const ability=obj.ability||window.TCG_MONSTER_EFFECTS?.[card.id];
      if(!ability)throw new Error('Missing monster effect: '+card.id);
      card.ability=ability;
      card.desc=ability.timing+' · '+ability.rules;
    }
    cardList.push(card); byId[card.id]=card;return card;
  };
  const effectLabel={draw:'카드 2장 드로우',heal:'아군 생명력 9 회복',blast:'상대 생명력 8 피해',buff:'아군 몬스터 공격력 +4',bounce:'상대 일반 몬스터 1기 손패로 귀환',recover:'데스존의 하수 1장 회수',banish:'상대 몬스터 1기 단절된 이계로 격리',shift:'아군 몬스터 위치 이동',challenge:'아군 몬스터를 격돌존에 투입',fog:'이번 턴 상대 점령 피해 봉쇄',dice:'D6 3개, 4+ 명중마다 격돌 몬스터 피해 6',guard:'아군에게 수호 부여',weaken:'적 공격력 -4',supply:'카드 1장 드로우·생명력 4 회복',strike:'상대 몬스터에게 피해 7',freeze:'상대 몬스터 공격 불가',deploy:'하수 1기를 데스존에서 소생'};
  Object.assign(effectLabel,{
    buff:'내 몬스터 1기를 지정해 공격력 +4. 내 몬스터가 없으면 내 생명력 3 회복.',
    bounce:'상대 몬스터 1기를 지정해 상대 손패로 되돌립니다.',
    recover:'내 데스존의 첫 하수 몬스터를 손패로 회수합니다. 없다면 카드 1장 드로우.',
    banish:'상대 일반 몬스터존의 몬스터 1기를 지정해 단절된 이계로 보냅니다.',
    shift:'아군 몬스터 1기를 지정해 빈 격돌존에 이동합니다. 내 격돌존이 차 있고 빈 몬스터존이 있으면 철수합니다. 둘 다 불가능하면 1장 드로우.',
    challenge:'아군 몬스터 1기를 지정해 빈 격돌존에 투입합니다. 불가능하면 내 본진이 다음 피해 1회를 막습니다.',
    fog:'상대의 다음 턴 종료 시 단독 점령 피해를 1회 막습니다.',
    dice:'6면 주사위 3개를 굴립니다. 4 이상마다 지정한 상대 몬스터에 피해 6. 몬스터가 없으면 상대 본진에 피해 3씩.',
    guard:'아군 몬스터 1기를 지정해 수호를 부여합니다. 아군 몬스터가 없으면 내 본진이 다음 피해 1회를 막습니다.',
    weaken:'상대 몬스터 1기를 지정해 공격력 −4 (최소 1).',
    strike:'상대 몬스터 1기를 지정해 피해 7. 상대 몬스터가 없으면 본진에 피해 4.',
    freeze:'아직 봉쇄되지 않은 상대 몬스터 1기를 지정해 상대 턴 종료까지 공격을 봉쇄합니다.',
    deploy:'내 데스존의 첫 하수 몬스터를 빈 몬스터존에 소생시킵니다. 소생할 수 없으면 카드 1장 드로우.',
  });
  const trapRules={negate:'상대가 선언한 배치·강림, 마법 또는 공격을 무효화합니다.',shield:'상대 공격에 대응해 해당 공격의 피해를 막습니다.',challenge:'상대 공격에 대응합니다. 첫 아군 몬스터를 빈 격돌존에 투입하고, 불가능하면 내 본진이 다음 피해 1회를 막습니다.',guard:'첫 아군 몬스터에 수호를 부여합니다. 아군 몬스터가 없으면 내 본진이 다음 피해 1회를 막습니다.',counter:'상대 본진에 피해 4를 주고 내 생명력을 4 회복합니다.',draw:'대응할 때 카드 1장을 드로우합니다.'};
  const gearRules={power:'아군 몬스터 1기를 지정해 장착합니다. 공격력 +3.',ward:'아군 몬스터 1기를 지정해 장착합니다. 최대 내구도와 현재 내구도 +5, 수호 부여.'};
  function addFactionCards(f,i){
    const effects=['buff','draw','strike','heal','shift','recover','guard','blast'];
    f.units.forEach((name,n)=>add({id:'f'+i+'u'+n,name,faction:i,type:'unit',rank:0,tier:f.tiers[0],atk:[6,7,5,8,6][n]+(i===2?1:0),hp:[9,8,10,7,9][n]+(i===2?1:0),rarity:n===0?'R':'C',tag:n,role:['선봉','사격','지원','전위','탐사'][n],desc:n===0?'진영 콤보의 시작이 되는 선봉 유닛.':'필드에 배치하여 상위 강림을 준비합니다.',art:n}));
    f.mids.forEach((name,n)=>add({id:'f'+i+'m'+n,name,faction:i,type:'unit',rank:1,tier:f.tiers[1],atk:[10,12,11][n]+(i===2?1:0),hp:[13,11,14][n],rarity:n===2?'SR':'R',tag:n+5,role:['돌격','화력','지원'][n],desc:'아군 전개 또는 전술 해결을 충족해야 강림할 수 있습니다.',art:n+5}));
    f.highs.forEach((name,n)=>{const stats=[[[16,18],[15,18],[17,16]],[[12,17],[15,16],[14,20]],[[18,21],[15,23],[20,18]],[[15,17],[17,19],[14,22]],[[11,24],[14,21],[13,23]],[[17,19],[19,17],[15,22]],[[14,18],[17,17],[15,20]],[[13,16],[17,17],[16,19]]];add({id:'f'+i+'h'+n,name,faction:i,type:'unit',rank:2,tier:f.tiers[2],atk:stats[i][n][0],hp:stats[i][n][1],rarity:n===0?'UR':'SR',tag:n+8,role:'격돌 에이스',desc:'고유 강림 조건을 갖춘 진영 최고위 카드.',art:n+8,occupation:n===0?(i===0?20:12):12});});
    f.tactics.forEach((name,n)=>{const e=i===0?['buff','draw','strike','recover'][n]:i===1?['draw','heal','buff','blast'][n]:i===6?['shift','shift','strike','draw'][n]:i===4?['heal','guard','deploy','heal'][n]:i===5?['deploy','draw','strike','buff'][n]:['draw','buff','strike','heal'][n];add({id:'f'+i+'t'+n,name,faction:i,type:'tactic',effect:e,rarity:n===0?'SR':'R',desc:effectLabel[e],art:n+11,flag:i===0&&n===0?'royal':i===1&&n===0?'performance':i===6&&(n===0||n===3)?'device':null});});
    f.reactions.forEach((name,n)=>add({id:'f'+i+'r'+n,name,faction:i,type:'reaction',effect:['negate','shield','challenge'][n],rarity:n===0?'SR':'R',desc:['상대의 전술 또는 공격 1개를 무효화합니다.','이번에 받을 전투·효과 피해를 0으로 만듭니다.','일반 몬스터 1기를 격돌존으로 즉시 보냅니다.'][n],art:n+15}));
    f.gears.forEach((name,n)=>add({id:'f'+i+'g'+n,name,faction:i,type:'gear',effect:n?'ward':'power',rarity:'R',desc:n?'장착 유닛의 내구도 +5, 수호 획득':'장착 유닛 공격력 +3',art:n+18}));
  }
  factions.forEach(addFactionCards);
  const reactionNames=['차원 감식관','시간의 저격수','전파 차단자','봉인된 증인','중력 관측자','선회하는 구경꾼','손짓하는 수문장','신호 연막병','장례 기록관','공허의 목격자','흔적 지우개','염화 기록자','고장난 나침반','귀환 신호탄','사라진 이름표','차원 사서','급소 보호막','잔향 소녀','대피술사','패잔병 인솔자','전술 재계산기','거울 연기','위장 장의사','재정비의 대가'];
  const commons={
    reaction:reactionNames,
    economy:['전황 분석','사후 수습','긴급 재편','미래 예견','방랑 상인의 계약','작전 재편성','차원 기록','비밀 보급품','전략 회수','탐색 신호','빛의 전령','전장 조사','과거의 서신','다음 기회'],
    removal:['공간 붕괴','철수 신호','추방자 심판','균열 낙하','무력화 작전','봉인 구체','정찰 저격','탈출 통로','전선 혼란','고립의 칼날','역방향 전이','부서진 차원문','퇴각 명령','성역 파괴'],
    heal:['응급 구조','수호 결계','불굴의 맹세','전술 치료','후퇴한 전우','생명의 은총','치유 파동','본진 재건','강철 의지','재생 물약'],
    dice:['견제 사격','조준 보정','대공 요격','확률 개입','탄막 선회','궤도 포격','폭풍의 탄환','치명적 한 발'],
    clash:['도전장','봉쇄 연막','후방 교대','견제 포격','예비 병력','강제 퇴각','영역 잠금','좌표 혼선','전선 보급','결전 명령']
  };
  commons.reaction.forEach((name,n)=>{const e=n%6===0?'negate':n%6===1?'shield':n%6===2?'challenge':n%6===3?'counter':n%6===4?'guard':'draw';add({id:'cr'+n,name,faction:-1,type:'reaction',effect:e,rarity:n%4===0?'SR':'R',desc:e==='negate'?'상대 행동 하나를 취소합니다.':e==='shield'?'이번 피해를 무효화합니다.':e==='challenge'?'아군 몬스터 1기를 격돌존에 즉시 보냅니다.':e==='counter'?'상대 생명력 4 감소, 내 생명력 4 회복.':e==='guard'?'아군 몬스터에게 수호를 부여합니다.':'카드 1장을 드로우합니다.',art:n});});
  commons.economy.forEach((name,n)=>{const e=n%3===0?'draw':n%3===1?'recover':'supply';add({id:'ce'+n,name,faction:-1,type:'tactic',effect:e,rarity:n===0?'R':'C',desc:effectLabel[e],art:n});});
  commons.removal.forEach((name,n)=>{const e=n%4===0?'strike':n%4===1?'bounce':n%4===2?'weaken':'freeze';add({id:'cx'+n,name,faction:-1,type:'tactic',effect:e,rarity:n===0?'SR':'R',desc:effectLabel[e],art:n+2});});
  commons.heal.forEach((name,n)=>{const e=n%3===0?'heal':n%3===1?'guard':'supply';add({id:'ch'+n,name,faction:-1,type:'tactic',effect:e,rarity:n%3===0?'R':'C',desc:effectLabel[e],art:n+7});});
  commons.dice.forEach((name,n)=>{const e=n%2===0?'dice':'strike';add({id:'cd'+n,name,faction:-1,type:'tactic',effect:e,rarity:'R',desc:effectLabel[e],art:n+10});});
  commons.clash.forEach((name,n)=>{const effects=['challenge','fog','recover','dice','deploy','bounce','fog','shift','supply','buff'];const e=effects[n];add({id:'cc'+n,name,faction:-1,type:'tactic',effect:e,rarity:n===3?'SR':'R',desc:effectLabel[e]||'격돌존을 지원하는 전술 카드.',art:n+14});});
  for(const card of window.TCG_EXPANSION){
    add({...card,tier:card.type==='unit'?factions[card.faction].tiers[card.rank]:undefined,desc:effectLabel[card.effect]});
  }
  for(const card of cardList){
    if(card.type==='reaction')card.desc=trapRules[card.effect];
    if(card.type==='gear')card.desc=gearRules[card.effect];
  }
  function makeStarter(f){
    return [
      ...Array.from({length:5},(_,i)=>Array(3).fill('f'+f+'u'+i)).flat(),
      ...Array.from({length:3},(_,i)=>Array(3).fill('f'+f+'m'+i)).flat(),
      ...Array.from({length:4},(_,i)=>Array(2).fill('f'+f+'t'+i)).flat(),
      'f'+f+'r0','f'+f+'r1','f'+f+'r2','f'+f+'g0','f'+f+'g1','ce0','ch0','cc0',
    ];
  }
  function makeDeck(faction){
    const id=(s,n)=>'f'+faction+s+n, deck=[];
    const put=(code,n)=>{for(let k=0;k<n;k++)deck.push(code);};
    [3,3,3,2,2].forEach((n,i)=>put(id('u',i),n));
    [2,2,2].forEach((n,i)=>put(id('m',i),n));
    [1,1,1].forEach((n,i)=>put(id('h',i),n));
    [2,2,2,1].forEach((n,i)=>put(id('t',i),n));
    [2,2,1].forEach((n,i)=>put(id('r',i),n));
    [1,1].forEach((n,i)=>put(id('g',i),n));
    ['ce0','ce1','cc0','cc1'].forEach(x=>put(x,1));
    return deck;
  }
  function makeComboDeck(f){
    const small=Array.from({length:5},(_,i)=>Array(2).fill('f'+f+'u'+i)).flat();
    const cards=[
      ['b0u0',2],['b1u0',2],['b2u1',2],['b3u1',2],['b4u2',1],['b5u2',1],
      ['b0s0',2],['b1s1',2],['b4r',2],['b2g',1],['b3g',1],
    ].flatMap(([key,n])=>Array(n).fill('p'+f+key));
    const support=[['t0',3],['t1',2],['t2',1],['r0',2],['r1',1],['g0',2]]
      .flatMap(([key,n])=>Array(n).fill('f'+f+key));
    return [...small,...cards,...support,'cr0'];
  }
  const makeAceDeck=f=>cardList.filter(card=>card.faction===f&&card.rank===2).map(card=>card.id);
  const isValidDeck=(arr,faction)=>Array.isArray(arr)&&arr.length===40&&arr.every(id=>byId[id]&&byId[id].rank!==2&&(byId[id].faction===-1||byId[id].faction===faction))&&Object.values(arr.reduce((o,id)=>(o[id]=(o[id]||0)+1,o),{})).every(n=>n<=3);
  if(cardList.length!==752||Object.keys(byId).length!==cardList.length)throw new Error('Card registry count or IDs are invalid');
  window.TCG_DATA={factions,cards:cardList,byId,makeDeck:makeComboDeck,makeComboDeck,makeAceDeck,makeStarter,isValidDeck};
})();
