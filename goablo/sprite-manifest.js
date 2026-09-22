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
  act5Monsters:{
    image:'assets/sprites/act5-monsters.png',columns:8,rows:6,chromaKey:false,
    roster:[
      {id:'A5_001',name:'칼날고아',dbIndex:9,row:0,atlas:'act5Monsters'},
      {id:'A5_002',name:'살덩이고아',dbIndex:7,row:1,atlas:'act5Monsters'},
      {id:'A5_003',name:'촉수고아',dbIndex:16,row:2,atlas:'act5Monsters'},
      {id:'A5_004',name:'폭발고아',dbIndex:11,row:3,atlas:'act5Monsters'},
      {id:'A5_005',name:'꿰맨고아',dbIndex:19,row:4,atlas:'act5Monsters'},
      {id:'A5_006',name:'지옥마법사고아',dbIndex:18,row:5,atlas:'act5Monsters'}
    ]
  },
  bossB03:{
    image:'assets/sprites/b03-thousand-legs.png',columns:8,rows:1,chromaKey:false,
    profile:{id:'B03',name:'천개의다리고아',dbIndex:22,row:0,atlas:'bossB03',attackAtlas:'bossAttacksB03B07',attackRow:0,behavior:'centipedeboss',boss:true}
  },
  bossAttacksB03B07:{image:'assets/sprites/boss-attacks-b03-b07.png',columns:8,rows:5,chromaKey:false},
  bossB04:{image:'assets/sprites/b04-fallen-angel.png',columns:8,rows:1,chromaKey:false,profile:{id:'B04',name:'타락천사고아',dbIndex:23,row:0,atlas:'bossB04',attackAtlas:'bossAttacksB03B07',attackRow:1,behavior:'fallenangelboss',boss:true,scale:3}},
  bossB05:{image:'assets/sprites/b05-temptress.png',columns:8,rows:1,chromaKey:false,profile:{id:'B05',name:'유혹하는고아',dbIndex:24,row:0,atlas:'bossB05',attackAtlas:'bossAttacksB03B07',attackRow:2,behavior:'temptressboss',boss:true,scale:2.7}},
  bossB06:{image:'assets/sprites/b06-headless-knight.png',columns:8,rows:1,chromaKey:false,profile:{id:'B06',name:'목없는고아기사',dbIndex:23,row:0,atlas:'bossB06',attackAtlas:'bossAttacksB03B07',attackRow:3,behavior:'dullahanboss',boss:true,scale:3}},
  bossB07:{image:'assets/sprites/b07-blade-lord.png',columns:8,rows:1,chromaKey:false,profile:{id:'B07',name:'칼날군주고아',dbIndex:24,row:0,atlas:'bossB07',attackAtlas:'bossAttacksB03B07',attackRow:4,behavior:'bladelordboss',boss:true,scale:3.3}},
  bossAttacksB08B11:{image:'assets/sprites/boss-attacks-b08-b11.png',columns:8,rows:4,chromaKey:false},
  bossB08:{image:'assets/sprites/b08-flesh-collector.png',columns:8,rows:1,chromaKey:false,profile:{id:'B08',name:'육체수집가고아',dbIndex:20,row:0,atlas:'bossB08',attackAtlas:'bossAttacksB08B11',attackRow:0,behavior:'collectorboss',boss:true,scale:3.6}},
  bossB09:{image:'assets/sprites/b09-abyss-tentacle.png',columns:8,rows:1,chromaKey:false,profile:{id:'B09',name:'심연의촉수고아',dbIndex:21,row:0,atlas:'bossB09',attackAtlas:'bossAttacksB08B11',attackRow:1,behavior:'abyssboss',boss:true,scale:3.8}},
  bossB10:{image:'assets/sprites/b10-demon-lord.png',columns:8,rows:1,chromaKey:false,profile:{id:'B10',name:'악마군주고아',dbIndex:24,row:0,atlas:'bossB10',attackAtlas:'bossAttacksB08B11',attackRow:2,behavior:'demonlordboss',boss:true,scale:3.5}},
  bossB11:{image:'assets/sprites/b11-skeleton-king.png',columns:8,rows:1,chromaKey:false,profile:{id:'B11',name:'해골왕고아',dbIndex:22,row:0,atlas:'bossB11',attackAtlas:'bossAttacksB08B11',attackRow:3,behavior:'bonekingboss',boss:true,scale:3.2}},
  bossB12:{image:'assets/sprites/b12-orphan-king.png',columns:8,rows:1,chromaKey:false,profile:{id:'B12',name:'고아들의왕',dbIndex:24,row:0,atlas:'bossB12',attackAtlas:'bossB12Attacks',behavior:'orphankingboss',boss:true,scale:4,hp:4500,damage:38}},
  bossB12Attacks:{image:'assets/sprites/b12-orphan-king-attacks.png',columns:8,rows:4,chromaKey:false},
  environment:{image:'assets/sprites/environment-atlas.png',columns:8,rows:5,chromaKey:false},
  enemyVfx:{image:'assets/sprites/enemy-vfx-atlas.png',columns:8,rows:4,chromaKey:false},
  friendlyVfx:{image:'assets/sprites/friendly-vfx-atlas.png',columns:8,rows:4,chromaKey:false},
  areaVfx:{image:'assets/sprites/area-vfx-atlas.png',columns:8,rows:4,chromaKey:false},
  summons:{image:'assets/sprites/summons-atlas.png',columns:8,rows:8,chromaKey:false},
  hirelingSummons:{image:'assets/sprites/hireling-summons-v3.png',columns:8,rows:4,chromaKey:false},
  itemIcons:{image:'assets/sprites/item-icons-atlas.png',columns:8,rows:8,chromaKey:false},
  skillIcons1:{image:'assets/sprites/skill-icons-1.png',columns:8,rows:8,chromaKey:false},
  skillIcons2:{image:'assets/sprites/skill-icons-2.png',columns:8,rows:8,chromaKey:false},
  skillIcons3:{image:'assets/sprites/skill-icons-3.png',columns:8,rows:8,chromaKey:false},
  portals:{image:'assets/sprites/portal-atlas-v4.png',columns:4,rows:2,chromaKey:false},
  animations:{
    idle:{frames:[0,1],fps:2.2},
    walk:{frames:[0,1,2],fps:7},
    attack:{frames:[3,4],fps:10},
    hit:{frames:[5],fps:1},
    death:{frames:[6],fps:1},
    corpse:{frames:[7],fps:1}
  }
};
