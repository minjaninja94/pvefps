export const SPRITE_MANIFEST={
  version:1,
  players:{
    image:'file_00000000856882099666f57bd54d2176.png',
    columns:8,
    rows:6,
    chromaKey:true,
    rowByClassId:{C01:0,C02:1,C03:2,C04:3,C05:4,C06:5},
    labels:['힘쎈고아','교회고아','뼈고아','마법고아','활고아','도둑고아']
  },
  monsters:{
    image:'file_0000000079208209bcc6152b2280e786.png',
    sourceImage:'file_00000000b7388207b0cc35754ac3753e.png',
    columns:8,
    rows:9,
    isolateComponents:true,
    componentMinArea:20,
    componentOutputSize:180,
    componentPadding:4,
    chromaKey:false,
    normalRows:[0,1,2,3,4,5,6],
    rowByMonsterId:{GOA_001:0,GOA_002:2,GOA_008:3,GOA_006:5,GOA_B01:7,GOA_B02:8},
    rowLabels:['좀비고아','역병 변이체','해골고아','구울고아','시체 먹는 고아','묘지 고아 거미','관에서 나온 고아','역병군주고아','거미어미고아'],
    act1Roster:[
      {id:'A1_001',name:'좀비고아',dbIndex:0,row:0},
      {id:'A1_002',name:'해골고아',dbIndex:1,row:2},
      {id:'A1_003',name:'구울고아',dbIndex:3,row:3},
      {id:'A1_004',name:'묘지 고아 거미',dbIndex:5,row:5},
      {id:'A1_005',name:'시체 먹는 고아',dbIndex:7,row:4},
      {id:'A1_006',name:'관에서 나온 고아',dbIndex:8,row:6}
    ],
    act1Boss:{id:'B01',name:'역병군주고아',dbIndex:20,row:7}
  },
  act2Monsters:{
    image:'assets/sprites/act2-monsters.png',
    columns:8,
    rows:6,
    chromaKey:false,
    roster:[
      {id:'A2_001',name:'독침고아',dbIndex:4,row:0,atlas:'act2Monsters'},
      {id:'A2_002',name:'기생고아',dbIndex:11,row:1,atlas:'act2Monsters'},
      {id:'A2_003',name:'유충고아',dbIndex:7,row:2,atlas:'act2Monsters'},
      {id:'A2_004',name:'다리 많은 고아',dbIndex:3,row:3,atlas:'act2Monsters'},
      {id:'A2_005',name:'산성고아',dbIndex:13,row:4,atlas:'act2Monsters'},
      {id:'A2_006',name:'벌레 숙주 고아',dbIndex:15,row:5,atlas:'act2Monsters'}
    ]
  },
  act3Monsters:{
    image:'assets/sprites/act3-monsters.png',
    columns:8,
    rows:6,
    chromaKey:false,
    roster:[
      {id:'A3_001',name:'광신도고아',dbIndex:9,row:0,atlas:'act3Monsters'},
      {id:'A3_002',name:'타락 수도고아',dbIndex:12,row:1,atlas:'act3Monsters'},
      {id:'A3_003',name:'날개고아',dbIndex:2,row:2,atlas:'act3Monsters'},
      {id:'A3_004',name:'눈먼고아',dbIndex:3,row:3,atlas:'act3Monsters'},
      {id:'A3_005',name:'성당 고아 악마',dbIndex:13,row:4,atlas:'act3Monsters'},
      {id:'A3_006',name:'타락 사제고아',dbIndex:15,row:5,atlas:'act3Monsters'}
    ]
  },
  act4Monsters:{
    image:'assets/sprites/act4-monsters.png',
    columns:8,
    rows:6,
    chromaKey:false,
    roster:[
      {id:'A4_001',name:'해골 고아 기사',dbIndex:17,row:0,atlas:'act4Monsters'},
      {id:'A4_002',name:'궁수고아',dbIndex:2,row:1,atlas:'act4Monsters'},
      {id:'A4_003',name:'방패고아',dbIndex:8,row:2,atlas:'act4Monsters'},
      {id:'A4_004',name:'처형고아',dbIndex:16,row:3,atlas:'act4Monsters'},
      {id:'A4_005',name:'목없는 고아 기사',dbIndex:9,row:4,atlas:'act4Monsters'},
      {id:'A4_006',name:'시체 병사고아',dbIndex:10,row:5,atlas:'act4Monsters'}
    ]
  },
  animations:{
    idle:{frames:[0,1],fps:2.2},
    walk:{frames:[0,1,2],fps:7},
    attack:{frames:[3,4],fps:10},
    hit:{frames:[5],fps:1},
    death:{frames:[6],fps:1},
    corpse:{frames:[7],fps:1}
  }
};
