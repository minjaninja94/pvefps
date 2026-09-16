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
  animations:{
    idle:{frames:[0,1],fps:2.2},
    walk:{frames:[0,1,2],fps:7},
    attack:{frames:[3,4],fps:10},
    hit:{frames:[5],fps:1},
    death:{frames:[6],fps:1},
    corpse:{frames:[7],fps:1}
  }
};
