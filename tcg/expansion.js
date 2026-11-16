(() => {
  const branches = [
    ['홍련 화군','백야 금군','봉화 정찰대','청룡 기병','도깨비 궁방','어명 집행국','천문 무관','월영 선비단'],
    ['루나 스포트','세라 안무단','유키 믹서즈','네온 프리스타일','프리즘 스튜디오','엔코어 스테이지','홀로 팬클럽','펄 아레나'],
    ['황동 작업반','제로 차폐국','오메가 공방','전자포 병기국','나노 정비대','증폭 코어군','스크랩 견인대','하역 자동화반'],
    ['장미 궁정','백은 영묘','혈계 예배당','달빛 유랑단','밤의 추격대','진홍 연회','망각 서고','불멸 왕좌'],
    ['봄비 순례단','이끼 능선','여명 숲길','가시 덩굴단','호박씨 성소','그늘 뿌리단','옹이 수호목','태초 꽃밭'],
    ['해구 포식군','산성 부유종','심해 알무리','검은 해류','청록 발광종','열수 잠복군','갈고리 갑각군','아비수스 군락'],
    ['루미 측량대','은하 구난대','백색 항로국','궤도 기동대','세라믹 선단','워프 차단대','성운 수리국','차원 개척함대'],
    ['수정 필경회','육각 결계실','거울 회랑','청유리 실험반','자수정 소환실','백색 프리즘','공명 법정','대현자 평의회'],
  ];
  const conditions = [
    ['seen',4,'등장 기록에 서로 다른 몬스터가 4종 이상'], ['summons',2,'이번 턴에 기본 배치·강림을 2회 이상 처리한 상태'],
    ['gears',2,'이번 대전에서 장비 마법을 누적 2회 이상 장착한 상태'], ['life',45,'내 생명력이 45 이하'],
    ['guarded',1,'내 전장에 수호 몬스터가 1기 이상'], ['grave',4,'내 데스존에 몬스터가 4장 이상'],
    ['moved',3,'이번 대전 내 몬스터의 격돌존 이동이 누적 3회 이상'], ['spells',4,'서로 다른 마법 해결 기록이 4종 이상'],
  ].map(([key,value,text])=>({key,value,text}));
  const schools = [
    [['atk','ally',2],['recover','basic',1],['guard','ally'],['atk','allAllies',4]],
    [['draw',1],['healCore',3],['atk','ally',2],['draw',3]],
    [['ward','self'],['repair','ally',3],['recover','gear',1],['ward','all']],
    [['healCore',3],['weaken','strong',2],['recover','basic',1],['healCore',13]],
    [['repair','ally',3],['guard','self'],['repair','all',2],['repair','all',10]],
    [['damage','weak',2],['weaken','strong',2],['recover','basic',1],['damage','allFoes',7]],
    [['draw',1],['ward','ally'],['damage','clashFoe',4],['weaken','allFoes',5]],
    [['recover','tactic',1],['damage','strong',2],['ward','ally'],['damage','allFoes',6]],
  ];
  const events = ['enter','in','out','engage','death','start','spell','gear'];
  const follow = [
    ['repair','ally',2],['damage','weak',2],['healCore',3],['atk','ally',1],
    ['weaken','strong',2],['draw',1],['guard','ally'],['ward','ally'],
  ];
  const aceMoves = [
    ['core',15],['shield',2],['damage','allFoes',8],['atk','allAllies',4],
    ['freeze','allFoes'],['core',12],['weaken','allFoes',6],['repair','all',10],
  ];
  const spellSchool = [
    ['buff','challenge','recover','guard'],['draw','supply','buff','blast'],['guard','deploy','strike','supply'],
    ['heal','blast','weaken','recover'],['heal','guard','deploy','supply'],['deploy','strike','blast','weaken'],
    ['shift','challenge','bounce','dice'],['draw','freeze','banish','strike'],
  ];
  const origins=['u0','u2','m0','h0'];
  const suffixes=[['척후','수호병','선봉장','대권좌'],['코러스','퍼포머','메인 디렉터','그랜드 스타'],
    ['검사기','지원 모듈','전력 기체','종결 병기'],['시종','혈계인','고위 귀족','초대 진조'],['새싹','뿌리 정령','숲지기','고대 세계목'],
    ['유생','공생체','포식종','최종 심연주'],['탐사조','정비원','항로 지휘관','성간 기함'],['견습','연구원','집행관','초월 대현자']];
  window.TCG_EXPANSION=branches.flatMap((labels,faction)=>labels.flatMap((theme,branch)=>{
    const id='p'+faction+'b'+branch;
    const monsters=origins.map((art,n)=>{
      const rank=n<2?0:n===2?1:2;
      const name=theme+' '+suffixes[faction][n];
      const event=n===3?['enter','occupy','end','in','start','spell','engage','direct'][branch]:events[(branch+n*3)%events.length];
      const actions=n===3?[schools[faction][3],aceMoves[branch],['core',branch===0?5:7]]:
        [schools[faction][n],follow[(branch+n+faction)%follow.length]];
      if(faction===6&&branch===4&&n===0)actions[1]=['healCore',4];
      if(faction===2&&branch===5&&n===0)actions[1]=['repair','ally',2];
      return {id:id+'u'+n,name,faction,type:'unit',rank,atk:rank===2?18+branch%4:rank===1?11+branch%3:6+branch%3,
        hp:rank===2?21+branch%4:rank===1?13+branch%3:8+branch%3,rarity:n===3?'LR':n===2?'SR':n===1?'R':'C',
        artRef:'f'+faction+art,occupation:n===3?15:undefined,
        ability:window.TCG_CREATE_ABILITY(name+'의 '+['신호','연계','전개','결전'][n],event,actions,n===3?conditions[faction]:undefined)};
    });
    const flag=({0:'royal',1:'performance',6:'device'})[faction];
    return [...monsters,
      {id:id+'s0',name:theme+' 재편',faction,type:'tactic',flag,effect:spellSchool[faction][branch%4],rarity:'C',artRef:'f'+faction+'t'+branch%4},
      {id:id+'s1',name:theme+' 비전',faction,type:'tactic',effect:spellSchool[faction][(branch+1)%4],rarity:'SR',artRef:'f'+faction+'t'+(branch+2)%4},
      {id:id+'r',name:theme+' 역전',faction,type:'reaction',effect:['negate','guard','shield','counter','challenge','draw'][branch%6],rarity:'R',artRef:'f'+faction+'r'+branch%3},
      {id:id+'g',name:theme+' 전용 장비',faction,type:'gear',effect:branch%2?'ward':'power',rarity:'R',artRef:'f'+faction+'g'+branch%2},
    ];
  }));
})();
