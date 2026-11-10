/* StarCraft: Brood War supplemental roster — workers, support, transport,
 * specialist attackers and miniature craft. Core spellcaster-only units excluded.
 * Data deliberately reuses the existing 48px-per-range-cell scaling.
 */
const EXTRA_UNIT_TYPES=Object.freeze({
 scv:{name:'SCV',race:'terran',hp:60,shield:0,armor:0,damage:5,range:48,speed:70,r:16,cool:15/24,size:'small',weapon:'normal',canGround:true,canAir:false,worker:'repair',color:'#d5b278',glyph:'⚙'},
 ghost:{name:'고스트',race:'terran',hp:45,shield:0,armor:0,damage:10,range:336,speed:74,r:14,cool:22/24,size:'small',weapon:'concussive',canGround:true,canAir:true,projectile:true,ghost:true,color:'#9eb9b0',glyph:'⌖'},
 dropship:{name:'드랍십',race:'terran',hp:150,shield:0,armor:1,damage:0,range:0,speed:100,r:32,cool:1,size:'large',flying:true,transport:8,support:true,canGround:false,canAir:false,color:'#9cadbd',glyph:'▱'},
 spidermine:{name:'스파이더 마인',race:'terran',hp:20,shield:0,armor:0,damage:125,range:48,speed:94,r:10,cool:1,size:'small',weapon:'explosive',canGround:true,canAir:false,suicide:true,mine:true,color:'#d7a760',glyph:'✹'},
 medic:{name:'메딕',race:'terran',hp:60,shield:0,armor:1,damage:0,range:0,speed:70,r:15,cool:1,size:'small',support:true,healer:true,canGround:false,canAir:false,color:'#dfe4f1',glyph:'✚'},
 probe:{name:'프로브',race:'protoss',hp:20,shield:20,armor:0,damage:5,range:48,speed:74,r:15,cool:22/24,size:'small',weapon:'normal',canGround:true,canAir:false,color:'#9cdeed',glyph:'◉'},
 shuttle:{name:'셔틀',race:'protoss',hp:80,shield:60,armor:1,damage:0,range:0,speed:116,r:30,cool:1,size:'large',flying:true,transport:8,support:true,canGround:false,canAir:false,color:'#edc98a',glyph:'⬡'},
 observer:{name:'옵저버',race:'protoss',hp:40,shield:20,armor:0,damage:0,range:0,speed:96,r:13,cool:1,size:'small',flying:true,cloaked:true,detector:true,support:true,canGround:false,canAir:false,color:'#a4e3e1',glyph:'◎'},
 interceptor:{name:'인터셉터',race:'protoss',hp:40,shield:40,armor:0,damage:6,range:48,speed:145,r:12,cool:25/24,size:'small',flying:true,weapon:'normal',canGround:true,canAir:true,projectile:true,color:'#e9d3a1',glyph:'✦'},
 drone:{name:'드론',race:'zerg',hp:40,shield:0,armor:0,damage:5,range:48,speed:74,r:15,cool:22/24,size:'small',weapon:'normal',canGround:true,canAir:false,color:'#bc99af',glyph:'♣'},
 overlord:{name:'오버로드',race:'zerg',hp:200,shield:0,armor:0,damage:0,range:0,speed:39,r:37,cool:1,size:'large',flying:true,transport:8,detector:true,support:true,canGround:false,canAir:false,color:'#b889b5',glyph:'☁'},
 infestedTerran:{name:'감염된 테란',race:'zerg',hp:60,shield:0,armor:0,damage:500,range:48,speed:110,r:15,cool:1,size:'small',weapon:'explosive',canGround:true,canAir:false,suicide:true,explosive:true,color:'#b3d277',glyph:'☢'},
 broodling:{name:'브루들링',race:'zerg',hp:30,shield:0,armor:0,damage:4,range:48,speed:100,r:12,cool:15/24,size:'small',weapon:'normal',canGround:true,canAir:false,timedLife:180,color:'#c5aa82',glyph:'❧'}
});
for(const [key,stats] of Object.entries(EXTRA_UNIT_TYPES)){
 if(TYPES[key])throw Error('Duplicate unit '+key);
 TYPES[key]={...stats};
 BW_ATTACK_RANGE_TILES[key]=Math.round(stats.range/RANGE_PX_PER_TILE);
 TYPES[key].range=BW_ATTACK_RANGE_TILES[key]*RANGE_PX_PER_TILE;
}
const EXTRA_UNIT_LIST=Object.keys(EXTRA_UNIT_TYPES);
const EXTRA_HERO_EXCLUDE=new Set(['scv','probe','drone','medic','dropship','shuttle','overlord','observer','spidermine','interceptor','broodling']);
const extraTier={
 0:['scv','probe','drone'],
 1:['ghost','medic','broodling'],
 2:['spidermine','infestedTerran'],
 3:['observer','interceptor'],
 4:['dropship','shuttle','overlord']
};
for(const [tier,keys] of Object.entries(extraTier))WAVE_TIERS[Number(tier)].push(...keys);
for(const key of EXTRA_UNIT_LIST)COMBAT_TYPES.push(key);
