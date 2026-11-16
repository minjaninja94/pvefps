/* Each row belongs to the existing u0–u4, m0–m2, h0–h2 card IDs. */
(() => {
  const effects = [
    [ // 이세계 조선
      ['홍련의 선봉','enter',['guard','self'],['atk','ally',1]],
      ['화승 조준','enter',['damage','weak',3]],
      ['도깨비의 샛길','in',['draw',1],['healCore',2]],
      ['비검의 반격','engage',['ward','self'],['atk','self',1]],
      ['성루의 봉화','death',['recover','basic',1],['healCore',1]],
      ['화군의 돌격','in',['damage','clashFoe',5],['atk','self',2]],
      ['청룡의 호령','enter',['atk','allAllies',2]],
      ['왕명 계승','spell',['atk','self',2]],
      ['홍련 총진군','enter',['atk','allAllies',3],['guard','ally'],['damage','strong',4]],
      ['백야의 결계','start',['ward','self'],['repair','ally',3]],
      ['천명의 방망이','occupy',['core',4],['damage','weak',5]],
    ],
    [ // 네온 아이돌
      ['첫 소절','enter',['draw',1]],
      ['스텝 체인지','out',['atk','self',2],['repair','self',2]],
      ['네온 애드리브','direct',['core',2]],
      ['라이브 믹싱','gear',['repair','self',3],['atk','self',1]],
      ['홀로그램 리플레이','death',['draw',1],['healCore',3]],
      ['세라의 댄스 브레이크','in',['atk','self',3],['repair','ally',3]],
      ['유키의 리마스터','enter',['recover','tactic',1],['healCore',3]],
      ['센터 스포트라이트','spell',['atk','ally',2],['healCore',1]],
      ['루나의 은하 공연','occupy',['healCore',8],['draw',1]],
      ['피날레 리턴','death',['recover','reaction',1],['draw',1]],
      ['끝나지 않는 무대','end',['repair','all',3],['atk','ally',2]],
    ],
    [ // 철심 기계도시
      ['Q1 정찰 스캔','enter',['damage','strong',2]],
      ['하역 보급','gear',['draw',1]],
      ['정비용 납땜','enter',['repair','ally',4]],
      ['차폐판 전개','enter',['guard','self'],['ward','self']],
      ['기동 추진기','in',['atk','self',2],['damage','weak',2]],
      ['강철 보수','start',['repair','self',4]],
      ['구리 코일 과충전','engage',['atk','self',2],['damage','clashFoe',2]],
      ['모듈 재결합','enter',['recover','gear',1],['repair','ally',3]],
      ['거신 열차단판','start',['ward','self'],['ward','ally']],
      ['제로 방벽','enter',['guard','self'],['ward','all'],['shield',1]],
      ['오메가 방열 폭발','end',['damage','allFoes',3]],
    ],
    [ // 황혼 혈족
      ['종복의 체온','direct',['healCore',3]],
      ['황혼의 매복','enter',['weaken','strong',2]],
      ['장미 유혈','death',['core',2],['healCore',2]],
      ['묘지의 메아리','enter',['recover','basic',1]],
      ['계승자의 대가','enter',['pay',3],['draw',1],['atk','self',2]],
      ['백작의 가시','engage',['weaken','strong',2]],
      ['공작의 만찬','end',['healCore',4]],
      ['핏빛 징수','in',['core',3],['healCore',3]],
      ['진조의 피의 맹세','occupy',['healCore',6],['repair','self',4]],
      ['월하의 징벌','enter',['damage','allFoes',4],['healCore',4]],
      ['왕좌의 불멸','death',['recover','basic',2],['shield',1]],
    ],
    [ // 녹음 수호자
      ['새싹의 씨앗','enter',['healCore',2],['repair','ally',2]],
      ['초목 치료','start',['repair','ally',2]],
      ['이끼 매복','engage',['repair','self',2],['atk','self',2]],
      ['씨앗의 바람길','out',['draw',1]],
      ['덩굴 울타리','enter',['guard','self'],['repair','ally',3]],
      ['봄비 치유','end',['repair','all',2]],
      ['그늘에 숨다','out',['ward','self'],['ward','ally']],
      ['가시 덫','in',['weaken','clashFoe',3],['guard','self']],
      ['세계수의 샘','occupy',['repair','all',3],['healCore',5]],
      ['태초의 개화','enter',['repair','all',6],['recover','basic',1]],
      ['영원한 숲의 서약','start',['repair','all',3],['shield',1]],
    ],
    [ // 심해 군체
      ['유생의 산성낭','death',['damage','weak',2]],
      ['침식','engage',['weaken','target',1],['atk','self',1]],
      ['해류 탐지','in',['draw',1],['damage','weak',1]],
      ['기생 흡착','direct',['repair','self',3],['healCore',2]],
      ['부유 포자','death',['weaken','strong',2],['damage','weak',1]],
      ['심연의 이빨','enter',['damage','weak',5]],
      ['수압 장갑','enter',['ward','self'],['weaken','clashFoe',3]],
      ['군체 신호','end',['atk','ally',2],['repair','ally',1]],
      ['모체의 알무리','enter',['recover','basic',2],['guard','self']],
      ['해구 우두머리','in',['damage','clashFoe',7],['atk','self',1]],
      ['아비수스의 수압파','occupy',['damage','allFoes',3],['core',2]],
    ],
    [ // 성운 항해단
      ['루미의 보정 좌표','enter',['ward','self'],['draw',1]],
      ['궤도 스캔','in',['weaken','strong',2],['draw',1]],
      ['선원의 구조 로프','out',['repair','ally',4]],
      ['측량 기준점','spell',['atk','self',1],['repair','self',2]],
      ['별바람의 잔광','death',['healCore',3],['recover','gear',1]],
      ['순간 좌표 이동','out',['ward','self'],['atk','self',3]],
      ['추진로 정비','gear',['repair','all',2]],
      ['궤도 교란','in',['freeze','clashFoe'],['damage','strong',2]],
      ['기함 항로 개방','enter',['recover','tactic',1],['ward','all']],
      ['루미의 호위 항로','in',['ward','allAllies'],['healCore',4]],
      ['차원의 정복','occupy',['weaken','allFoes',2],['draw',1]],
    ],
    [ // 유리 마도원
      ['견습생의 첫 공명','spell',['repair','self',2]],
      ['유리 정찰 렌즈','enter',['weaken','weak',1],['draw',1]],
      ['수정판 사본','death',['recover','tactic',1]],
      ['거울 칼날','engage',['ward','self'],['weaken','target',1]],
      ['관측 수치 축적','gear',['atk','self',2],['healCore',2]],
      ['육각 결계','enter',['ward','ally'],['shield',1]],
      ['수정 파동','spell',['damage','weak',2]],
      ['프리즘 판결','in',['freeze','strong'],['repair','self',2]],
      ['대현자의 증폭','spell',['damage','strong',3],['atk','self',1]],
      ['천면의 파편','death',['damage','allFoes',3],['recover','reaction',1]],
      ['마도회의 공명','end',['recover','tactic',1],['atk','allAllies',1]],
    ],
  ];
  const timing = {
    enter:'등장할 때', in:'격돌존에 진입할 때', out:'격돌존에서 철수할 때', death:'피해로 파괴될 때',
    engage:'몬스터를 공격하기 직전', direct:'직접 공격이 처리된 직후', occupy:'단독 점령 피해 처리 직후',
    spell:'내 턴에 마법 해결 후 첫 1회', gear:'내 턴에 장비 장착 후 첫 1회',
    start:'내 턴 드로우 직후', end:'내 턴 종료 직전', hold:'내 턴 시작 · 격돌존 유지 중',
  };
  const targets = {
    self:'이 몬스터', ally:'내 다른 몬스터 중 내구도가 가장 낮은 1기', all:'내 몬스터 전부', allAllies:'내 다른 몬스터 전부',
    weak:'상대 몬스터 중 내구도가 가장 낮은 1기', strong:'상대 몬스터 중 공격력이 가장 높은 1기',
    clashFoe:'상대 격돌존 몬스터', allFoes:'상대 몬스터 전부', target:'공격 대상',
  };
  const recoverNames = {basic:'하수 몬스터', tactic:'마법', reaction:'함정', gear:'장비'};
  function describe([op,a,b]) {
    const t=targets[a];
    return {
      atk:()=>`${t} 공격력 +${b}`, weaken:()=>`${t} 공격력 −${b} (최소 1)`,
      repair:()=>`${t} 내구도 ${b} 회복 (최대 내구도까지)`, damage:()=>`${t}에 피해 ${b}`,
      guard:()=>`${t}에 수호 부여 (상대 직접 공격 차단)`, ward:()=>`${t} 보호막 부여 (다음 피해 최대 5 감소)`,
      freeze:()=>`${t}의 공격을 해당 몬스터 주인의 턴 종료까지 봉쇄`,
      draw:()=>`카드 ${a}장 드로우`, healCore:()=>`내 생명력 ${a} 회복`, core:()=>`상대 생명력에 피해 ${a}`,
      shield:()=>`내 본진이 다음에 받는 피해 ${a}회 무효`, pay:()=>`내 생명력이 ${a}보다 많으면 ${a} 소모`,
      recover:()=>`내 데스존에서 가장 먼저 들어간 ${recoverNames[a]} 최대 ${b}장을 손패로 회수`,
    }[op]();
  }
  function ability(name,event,actions,condition){
    const steps=actions.map(describe);
    const details=actions[0][0]==='pay'?steps[0]+'하고 '+steps.slice(1).join(' · '):steps.join(' · ');
    const rules=(condition?condition.text+'라면, ':'')+details+'.';
    return {name,event,actions,timing:timing[event],rules,condition};
  }
  const result = {};
  effects.forEach((faction,i) => faction.forEach(([name,event,...actions],n) => {
    const id='f'+i+(n<5?'u'+n:n<8?'m'+(n-5):'h'+(n-8));
    result[id]=ability(name,event,actions);
  }));
  const clashHold = [
    [['홍련 진형 유지',[['atk','allAllies',1]]],['군령의 보급',[['recover','basic',1]]]],
    [['무대의 잔향',[['draw',1]]],['앙코르 회복',[['repair','all',2],['healCore',2]]]],
    [['철심 고정 장치',[['repair','self',3]]],['방벽 축전',[['shield',1]]]],
    [['핏빛 점유',[['core',2],['healCore',2]]],['진조의 포식',[['atk','self',2]]]],
    [['세계수의 그늘',[['repair','all',2]]],['뿌리의 숨결',[['healCore',3],['repair','self',2]]]],
    [['군체의 견제',[['weaken','clashFoe',1]]],['심해의 포식',[['recover','reaction',1]]]],
    [['항로 좌표 보정',[['draw',1]]],['기함의 방위',[['ward','self'],['repair','self',2]]]],
    [['마도원의 억제진',[['weaken','clashFoe',1]]],['공명의 축적',[['recover','tactic',1]]]],
  ];
  clashHold.forEach((pair,f)=>pair.forEach(([name,actions],n)=>{
    const id='f'+f+(n===0?'u4':'m2');
    result[id].holdAbility=ability(name,'hold',actions,f===1&&n===0?{key:'handLow',value:3,text:'손패가 3장 이하'}:undefined);
  }));
  window.TCG_CREATE_ABILITY=ability;
  window.TCG_MONSTER_EFFECTS=result;
})();
