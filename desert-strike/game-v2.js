(()=>{
'use strict';
const $=id=>document.getElementById(id);
const CW=1100,CH=520,WORLD_W=3300,HOME_H=340,MAX_BASE=7200,MAX_TURRET=1700,INTERVAL=24,COLS=15,ROWS=5,SLOTS=COLS*ROWS,INCOME_PERIOD=.5,SIDE_SUPPLY=220;
const COLORS=['#79dfee','#ff9a79'],LANES=[110,180,260,340,410];
const initialIncome=1,WAVE_STIPEND=24,MAX_ECONOMY=7;
const TOWER_RANGE=285,TOWER_PERIOD=.31,TOWER_DAMAGE=28,FOG_END_WAVE=6,ENEMY_FOG_X=WORLD_W-770;
const HEAL_WINDOW=1,HEAL_BUDGET=80;
// Marine-only logistics. Low-probability transfer + fragile capture, max two recruits each wave.
const MARINE_LOOT_CHANCE=.08,MARINE_RECRUIT_CHANCE=.23,MARINE_RECRUIT_HP=.10,MARINE_RECRUIT_CAP=1,HUANGLONG_INTERVAL=8;
const ROLE=[
 {key:'charge',name:'돌격',mark:'⚔',token:'⚔',cost:65,hp:115,damage:21,armor:1,range:29,rate:.77,speed:82,airTarget:false,kind:'ground',tips:'적 포병·지원병 후방을 빠르게 찌릅니다. 장갑 기지 공격력은 낮습니다.',good:[5,7],bad:[3,1]},
 {key:'rifle',name:'사격',mark:'⌖',token:'⌖',cost:95,hp:108,damage:17,armor:1,range:164,rate:.8,speed:60,airTarget:true,kind:'ground',tips:'저렴한 범용 원거리 병력. 공중도 공격합니다.',good:[0,7],bad:[3,5]},
 {key:'breaker',name:'대장갑',mark:'◆',token:'◆',cost:150,hp:94,damage:47,armor:0,range:208,rate:1.76,speed:49,airTarget:true,kind:'ground',tips:'전차·중장갑을 파괴하지만 근접 압박에 취약합니다.',good:[3,4],bad:[0,1]},
 {key:'armor',name:'장갑',mark:'▣',token:'▣',cost:205,hp:390,damage:32,armor:9,range:120,rate:1.27,speed:35,airTarget:false,kind:'ground',tips:'앞줄에서 버티며 일반 총격을 흡수합니다.',good:[1,4],bad:[2,6]},
 {key:'antiair',name:'대공',mark:'✣',token:'✣',cost:165,hp:175,damage:16,armor:3,range:228,rate:.57,speed:47,airTarget:true,kind:'ground',tips:'비행체를 우선 공격하며 대공 피해량이 높습니다.',good:[6],bad:[3,2]},
 {key:'siege',name:'포격',mark:'✹',token:'✹',cost:245,hp:114,damage:69,armor:0,range:317,rate:2.55,speed:30,airTarget:false,kind:'ground',blast:58,tips:'후열 광역 화력. 근접 침투에는 취약합니다.',good:[1,4],bad:[0,6]},
 {key:'flyer',name:'비행',mark:'◇',token:'◇',cost:205,hp:160,damage:24,armor:1,range:149,rate:.86,speed:92,airTarget:true,kind:'air',tips:'대부분의 지상 공격을 회피합니다. 대공포를 조심하세요.',good:[0,3],bad:[4,1]},
 {key:'support',name:'지원',mark:'✚',token:'✚',cost:145,hp:136,damage:0,heal:36,armor:1,range:139,rate:1.24,speed:61,airTarget:false,kind:'ground',tips:'부상당한 전열을 치료하며 전투 지속력을 높입니다.',good:[3,1],bad:[0,5]}
];
const FACTIONS=[
 {id:'forge',name:'철갑연합',tag:'FORGE UNION',logo:'▦',color:'#79ddea',bonus:'최대 HP +5.5% · 이동 속도 −4%',mut:{hp:1.055,dmg:1,speed:.96},units:['진격 보병','기관총병','관통 로켓','철갑 전차','복합 대공포','궤도 자주포','추적 비행기','전장 구호병'],slogan:'공학·화력·단단한 전열',secondary:'#224956'},
 {id:'brood',name:'심연군체',tag:'DUSK BROOD',logo:'♜',color:'#b9df8d',bonus:'이동 속도 +12% · 최대 HP −0.5%',mut:{hp:.995,dmg:1,speed:1.12},units:['송곳 발톱','산성 침벌','부식 포자충','거대 갑각수','가시 포자탑','폭식 투석충','비행 포식자','치유 공생충'],slogan:'생체 돌파·기동·포식',secondary:'#344d2b'},
 {id:'astral',name:'성운결사',tag:'ASTRAL ORDER',logo:'✧',color:'#d6b8ff',bonus:'공격/치유 +9% · 최대 HP −1%',mut:{hp:.99,dmg:1.09,speed:1},units:['수호 창병','광자 사수','균열 파괴자','수정 방패병','영점 수호기','공명 투창대','섬광 비행체','생명 융합사'],slogan:'에너지·보호막·정밀 타격',secondary:'#443257'},
 {id:'marine',name:'해병성채',tag:'MARINE FORTRESS',logo:'★',color:'#dba77c',bonus:'긴빠이·자진입대 · 황룡 8초 간격 3회 투입',mut:{hp:1.09,dmg:1.06,speed:1.01},units:['무모칠 · 오도돌격','박철곤 · 중기관총','조조팔 · 대장갑포','황근출 · 배틀액스','톤톤정 · 대공 난사','마철두 · 포격특공','오도봉고 · 전우애 돌격','황룡 · 해병수육'],	slogan:'모히칸·붉은 군모·검은 얼굴·해병수육',secondary:'#58412f'},
 {id:'beastkin',name:'월영 수인족',tag:'MOONFANG CLAN',logo:'♞',color:'#f0b4a6',bonus:'근접 피해 +22% · 기동 +14% / 원거리 피해 −13%',mut:{hp:1.04,dmg:1,speed:1.06},units:['백랑 검사','여우불 투척수','스라소니 창투사','맹호 방패기사','매의눈 사냥꾼','설표 돌도끼병','흑표 돌격기수','토끼족 치유사'],slogan:'늑대귀·여우꼬리·야수 기병·근접 난전',secondary:'#603d46'},
 {id:'elf',name:'은월 엘프족',tag:'SILVERWOOD ELVES',logo:'✦',color:'#b2e6cf',bonus:'원거리 사거리 +10% · 화력 +4.5% / 근접 피해 −16%',mut:{hp:.94,dmg:1,speed:.99},units:['달빛 검호','실바람 궁수','별무리 관통궁','고목 수호기사','별빛 대공궁','숲의 대마법사','초승달 비행마녀','샘물 치유사'],slogan:'긴 귀·은발·장궁·마법 결정·후방 화력',secondary:'#375c52'},
 {id:'furry',name:'야월 퍼리족',tag:'WILDFUR PACK',logo:'♣',color:'#e8c392',bonus:'야성 근접 +10% · 생존 기동 +7% / 사격 −7%',mut:{hp:1.02,dmg:1,speed:1.07},units:['늑대 추적자','여우총 사냥꾼','송곳니 분쇄자','곰 털갑옷 수호자','하울 창투사','들소 포격수','알파 늑대 기수','달빛 무리치유사'],slogan:'전신 털·주둥이·갈기·늑대 무리',secondary:'#634634'},
 {id:'robot',name:'크롬 로보족',tag:'CHROME SYNDICATE',logo:'⬡',color:'#83c5fd',bonus:'기계 장갑 +6% · 정밀사격 +4% / 회복 −30%',mut:{hp:1.06,dmg:1,speed:0.95},units:['블레이드 오토마타','레이저 정찰기','레일 관통병기','티탄 실드 워커','플랙 대공드론','공성 캐논','전술 변형 메카','나노 정비유닛'],slogan:'완전 기계·안드로이드·워커·합금 신체',secondary:'#264e67'},
 {id:'octoper',name:'옥토퍼 군체',tag:'ABYSSAL OCTOPER',logo:'✺',color:'#c5a0fa',bonus:'마도포격 +10% · 광역 반경 +12% / 전열 체력 −7%',mut:{hp:0.93,dmg:1,speed:1.01},units:['팔완 돌격체','먹물 주술사','심해 관통술사','갑각 문어수호자','팔완 대공술사','심연 의식술사','마력 비행수','군체 사제'],slogan:'여덟 촉수·흡반·발광 마력·심해 군체',secondary:'#4a3370'},
 {id:'fairy',name:'농농 페어리족',tag:'PETAL FAIRIES',logo:'❀',color:'#ffadd4',bonus:'치유 +12% · 기동 +8% / 체력 −12%',mut:{hp:.88,dmg:1,speed:1.08},units:['꽃잎 소검사','이슬 마도사','씨앗 관통술사','버섯껍질 방패수','반딧불 대공술사','꽃가루 폭격사','별빛 나비정령','꽃샘 치유사'],slogan:'작고 귀여운 요정·꽃잎날개·치유·요정 마법',secondary:'#84577c'}
];
const RNAME=ROLE.map(r=>r.name),SPRITES=new Map();
let selectedFaction=0,state=null,selectedRole=null,demolition=false,activeView='base',lastFrame=0,uiElapsed=0;
let audio=null,bannerSeconds=0,barrageSeconds=0,stamp=0;
function clamp(n,a,b){return Math.min(b,Math.max(a,n));}
function random(a,b){return a+Math.random()*(b-a);}
function money(n){return Math.floor(n).toLocaleString('ko-KR');}
function getDef(role,faction){
 const r=ROLE[role],f=FACTIONS[faction];
 const isBongo=faction===3&&role===6;
 const isBeast=faction===4,isElf=faction===5,isFurry=faction===6,isRobot=faction===7,isOcto=faction===8,isFairy=faction===9,isProwler=isBeast&&role===6;
 const melee=(isBeast||isFurry)&&(role===0||role===3||role===6);
 const rangeBoost=isElf&&[1,2,4,5,6].includes(role);
 return {...r,unitName:f.units[role],factionName:f.name,name:isBongo?'차량':isProwler?'기병':r.name,mark:isBongo?'▰':isProwler?'♞':r.mark,
  hp:isBongo?565:r.hp*f.mut.hp*2.25*(isElf&&role===0?.88:isBeast&&role===3?1.13:1),
  damage:isBongo?36:isProwler?37:r.damage*f.mut.dmg*.94*(isBeast?(melee?1.22:.87):isElf?(rangeBoost?1.045:role===0?.84:1):isFurry?(melee?1.10:.93):isRobot&&[1,2,4,5].includes(role)?1.04:isOcto&&[2,4,5].includes(role)?1.10:1),
  heal:(r.heal||0)*f.mut.dmg*1.5*(isRobot?.70:isFairy?1.12:1),blast:(r.blast||0)*(isOcto?1.12:1),speed:isBongo?77:isProwler?90:r.speed*f.mut.speed*.84*(melee?1.14:1),
  kind:isBongo||isProwler?'ground':r.kind,armor:isBongo?7:isProwler?3:r.armor,
  range:isBongo?43:isProwler?40:r.range*(rangeBoost?1.10:isRobot&&[1,2,4,5].includes(role)?1.04:1),
  rate:isBongo?1.45:isProwler?.95:r.rate,
  airTarget:isBongo||isProwler?false:r.airTarget,
  good:isBongo||isProwler?[0,7]:r.good,bad:isBongo||isProwler?[2,3]:r.bad,
  tips:isBongo?'오도봉고: 공군 대신 출격하는 지상 돌파 차량. 돌격병 밀집 부대를 들이받아 최대 3명까지 범위 피해. 대장갑에 취약하고 기지 피해는 약합니다.':
  isProwler?'흑표 돌격기수: 공중이 아닌 지상 기병으로 적 전열에 급습합니다. 근접 돌진에 강하지만 대장갑·중장갑에 취약합니다.':
  isBeast?'수인족: 근접 전투·기동력이 강하지만 후방 사격 화력은 낮습니다. '+r.tips:
  isElf?'엘프족: 후방 장궁·마법에 강하지만 전위 난전이 취약합니다. '+r.tips:
  isFurry?'퍼리족: 전신 털과 야성적인 추격으로 근접전에 강합니다. '+r.tips:
  isRobot?'로보족: 합금 장갑과 정밀사격이 강하지만 수리 효율은 낮습니다. '+r.tips:
  isOcto?'옥토퍼: 팔완 마법사가 포격·주술에 강합니다. '+r.tips:
  isFairy?'페어리: 작은 날개와 치유 마법으로 아군을 지원합니다. '+r.tips:
  faction===3&&role===7?'해병수육: 생산 시설마다 매 웨이브 0·8·16초에 순차 3기 출격. 아군 광역 회복 뒤 자신은 소모됩니다.':r.tips};
}
function ecoCostFor(level){return Math.round(70*Math.pow(1.36,level));}
function ecoCost(){return ecoCostFor(state.eco);}
function weaponCost(){return Math.round(200*Math.pow(1.65,state.weapon));}
function armorCost(){return Math.round(190*Math.pow(1.63,state.armor));}
function setMessage(t){$('notification').textContent=t;}
function floatText(x,y,t,color='#fff1cb'){if(state.floaters.length>60)state.floaters.shift();state.floaters.push({x,y,t,color,time:.85});}
function pulse(x,y,color='#f8d09e',size=19){
 if(state.effects.length>130)state.effects.shift();
 state.effects.push({x,y,color,size,time:.5});
}
function chirp(hz=420,length=.08){
 try{
  audio=audio||new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==='suspended')audio.resume().catch(()=>{});
  const osc=audio.createOscillator(),amp=audio.createGain(),t=audio.currentTime;
  osc.type='triangle';osc.frequency.setValueAtTime(hz,t);
  amp.gain.setValueAtTime(.025,t);amp.gain.exponentialRampToValueAtTime(.001,t+length);
  osc.connect(amp).connect(audio.destination);osc.start(t);osc.stop(t+length);
 }catch(_){}
}
function reset(){
 state={live:false,ended:false,paused:false,rate:1,cash:360,enemyCash:360,eco:0,enemyEco:0,weapon:0,armor:0,incomeClock:0,cameraX:1100,followFront:true,
 wave:0,next:INTERVAL,elapsed:0,baseHP:[MAX_BASE,MAX_BASE],turretHP:[MAX_TURRET,MAX_TURRET],
 built:Array(SLOTS).fill(null),enemyBuilt:Array(SLOTS).fill(null),units:[],deadUnits:[],shots:[],effects:[],floaters:[],structureFX:[],
 marineSupports:[],marineRecruitCount:[0,0],marineStats:{loot:0,lootedCR:0,recruits:0,huangSpawns:0,bongoCharges:0},
 towerShots:[],aiSight:new Set(),nukes:1,barrageCd:0,faction:selectedFaction,enemyFaction:(selectedFaction+1+Math.floor(Math.random()*(FACTIONS.length-1)))%FACTIONS.length,
 nextUnitId:1,attackCount:0};
 selectedRole=null;demolition=false;bannerSeconds=0;barrageSeconds=0;
 $('startOverlay').classList.remove('hidden');$('endOverlay').classList.add('hidden');
 $('pauseButton').textContent='Ⅱ 일시정지';$('speedButton').textContent='▶ 1×';
 updateUI(true);setMessage('진영을 선택하고 전투를 시작하세요.');
}
function start(){
 selectedFaction=Number(document.querySelector('[data-faction].selected')?.dataset.faction||selectedFaction);
 reset();
 state.faction=selectedFaction;
 state.enemyFaction=(selectedFaction+1+Math.floor(Math.random()*(FACTIONS.length-1)))%FACTIONS.length;
 state.live=true;
 aiInitialBuild();
 $('startOverlay').classList.add('hidden');
 changeView('base');
 setMessage('전투 시작! 24초 이내에 생산 시설을 배치하세요.');
 updateUI(true);chirp(530,.16);
}
function changeView(id){
 activeView=id;
 document.querySelectorAll('.screen').forEach(a=>a.classList.toggle('active',a.id==='view-'+id));
 document.querySelectorAll('.tab').forEach(a=>{
  const on=a.dataset.view===id;a.classList.toggle('active',on);
  if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
 });
}
function getSelectedRoleButton(){
 return selectedRole!==null?ROLE[selectedRole]:null;
}
function selectRole(i){
 if(i<0||i>=ROLE.length)return;
 selectedRole=(selectedRole===i?null:i);demolition=false;
 updateUI(true);
 if(selectedRole!==null)setMessage(FACTIONS[state.faction].units[selectedRole]+' 선택 · 빈 생산 슬롯을 클릭하세요.');
}
function place(index){
 if(!state.live||state.ended){setMessage('전투를 먼저 시작하세요.');return;}
 if(state.paused){setMessage('일시정지 중에는 건설할 수 없습니다.');return;}
 const old=state.built[index];
 if(demolition){
  if(old!==null){
   const refund=Math.floor(ROLE[old].cost*.55);
   state.cash+=refund;state.built[index]=null;
   setMessage(FACTIONS[state.faction].units[old]+' 생산 시설 철거 · '+refund+' CR 반환');chirp(210,.11);
  }
  updateUI(true);return;
 }
 if(selectedRole===null){setMessage('먼저 생산할 유닛을 선택하세요.');return;}
 if(old!==null){
  setMessage('이미 생산시설이 설치된 자리입니다. 다른 시설을 건설하려면 철거 버튼이나 우클릭으로 먼저 철거하세요.');return;
 }
 const price=ROLE[selectedRole].cost;
 if(price>state.cash){setMessage('자원 부족 · '+Math.ceil(price-state.cash)+' CR이 더 필요합니다.');return;}
 state.cash-=price;state.built[index]=selectedRole;
 setMessage(FACTIONS[state.faction].units[selectedRole]+' 생산 시설 설치 완료');
 chirp(540,.07);updateUI(true);
}
function upgrade(kind){
 if(!state.live||state.paused||state.ended)return;
 if(kind==='econ'&&state.eco<MAX_ECONOMY&&state.cash>=ecoCost()){
  state.cash-=ecoCost();state.eco++;
  setMessage('채굴망 Lv.'+state.eco+' · 0.5초마다 +'+(1+state.eco)+' CR · 원금 회수 약 '+Math.ceil(ecoCostFor(state.eco-1)/2)+'초');chirp(650,.14);
 }
 if(kind==='weapon'&&state.weapon<5&&state.cash>=weaponCost()){
  state.cash-=weaponCost();state.weapon++;setMessage('무기 강화 Lv.'+state.weapon+' · 모든 아군 공격력 증가');chirp(650,.14);
 }
 if(kind==='armor'&&state.armor<5&&state.cash>=armorCost()){
  state.cash-=armorCost();state.armor++;
  for(const u of state.units)if(u.side===0&&u.hp>0){
   const extra=u.maxHP*(.09/(1+.09*(state.armor-1)));
   u.maxHP+=extra;u.hp+=extra;
  }
  setMessage('장갑 강화 Lv.'+state.armor+' · 아군 최대 HP 증가');chirp(650,.14);
 }
 if(kind==='repair'&&state.cash>=180&&state.turretHP[0]<MAX_TURRET){
  state.cash-=180;state.turretHP[0]=Math.min(MAX_TURRET,state.turretHP[0]+310);
  setMessage('기지 방어 포탑을 수리했습니다.');chirp(650,.14);pulse(196,260,'#9df2bd',32);
 }
 updateUI(true);
}
function emergency(){
 if(!state.live||state.ended||state.paused||!state.nukes)return;
 const invaders=state.units.filter(u=>u.side===1&&u.hp>0&&u.x<=550);
 const eligible=state.baseHP[0]<=MAX_BASE*.7||invaders.some(u=>u.x<370);
 if(!eligible||!invaders.length){setMessage('핵폭탄은 기지가 위기일 때 침공한 적에게 사용할 수 있습니다.');return;}
 state.nukes=0;
 for(const u of invaders){killUnit(u);pulse(u.x,u.y,'#f2d489',40);}
 state.units=state.units.filter(u=>u.hp>0);
 state.shots=state.shots.filter(p=>p.side===0);
 setMessage('긴급 핵폭탄 발동! 아군 영토로 침입한 적 '+invaders.length+'기를 제거했습니다.');
 banner('☢ EMERGENCY STRIKE');chirp(130,.3);updateUI(true);
}
function barrage(){
 if(!state.live||state.ended||state.paused||state.cash<260||state.barrageCd>0)return;
 const enemies=state.units.filter(u=>u.side===1&&u.hp>0);
 if(!enemies.length){setMessage('폭격할 적 병력이 없습니다.');return;}
 let target=enemies[0],best=-1;
 for(const u of enemies){
  let score=0;for(const v of enemies){if(Math.hypot(u.x-v.x,u.y-v.y)<110)score+=ROLE[v.role].cost;}
  if(score>best){best=score;target=u;}
 }
 state.cash-=260;state.barrageCd=32;
 for(const u of enemies){
  const d=Math.hypot(u.x-target.x,u.y-target.y);
  if(d<118){damage(u,260*(1-.45*d/118),'barrage');pulse(u.x,u.y,'#ffdf91',27);}
 }
 pulse(target.x,target.y,'#fff3be',120);
 banner('✷ ORBITAL BARRAGE');setMessage('궤도 폭격! 적 밀집 구역에 고폭탄을 투하했습니다.');
 chirp(180,.23);updateUI(true);
}
function banner(t){$('waveBanner').textContent=t;$('waveBanner').classList.add('show');bannerSeconds=2;}
function createUnit(side,slot,role){
 const faction=side===0?state.faction:state.enemyFaction,def=getDef(role,faction);
 const row=Math.floor(slot/COLS),col=slot%COLS;
 const x=side===0?240+col*7:WORLD_W-240-col*7;
 const y=LANES[row]+(col-7)*3+random(-7,7);
 const bonus=side===0?1+.09*state.armor:1;
 const isBongo=faction===3&&role===6;
 if(faction===3&&role===7)state.marineStats.huangSpawns++;
 state.units.push({uid:state.nextUnitId++,side,role,faction,x,y,hp:def.hp*bonus,maxHP:def.hp*bonus,
  cooldown:random(.1,.7),anim:random(0,16),facing:side===0?1:-1,blink:0,spawnAge:0,hitAge:0,skillAge:0,moving:false,strike:null,
  hitRadius:isBongo?30:faction===4&&role===6?22:role===3?26:role===6?14:role===5?17:role===0?17:15,ramCooldown:0});
 pulse(x,y,COLORS[side],12);
}
// AI spends the same credits as the player, but actually studies the player's build.
// Low-cost single-role rushes must trigger counter-production, not extra/free AI income.
const AI_COUNTER_ROLES=[
 [1,6,3], // charge -> ranged, air (untargetable by melee), heavy armor
 [3,5],   // rifle -> armor, siege
 [0,1],   // armor breaker -> charge/rifle
 [2,6],   // tank -> armor breaker/air
 [2,3],   // anti-air -> armor breaker/armor
 [0,6],   // artillery -> charge/air
 [4,1],   // flier -> anti-air/rifle
 [0,5]    // medic -> charge/siege
];
function aiReadOpponent(){
 // The AI sees enemy composition only after its troops observe it. No hidden factory reads.
 const sightings=state.aiSight||(state.aiSight=new Set());
 const counts=Array(ROLE.length).fill(0);
 for(const foe of state.units){
  if(foe.side!==0||foe.hp<=0||sightings.has(foe.uid))continue;
  if(foe.x>=WORLD_W*.57||state.units.some(u=>u.side===1&&u.hp>0&&Math.hypot(u.x-foe.x,u.y-foe.y)<=340))sightings.add(foe.uid);
 }
 for(const foe of state.units)if(foe.side===0&&foe.hp>0&&sightings.has(foe.uid))counts[foe.role]++;
 const sum=counts.reduce((a,b)=>a+b,0);
 let major=0;
 for(let i=1;i<counts.length;i++)if(counts[i]>counts[major])major=i;
 const dominant=sum>=3&&counts[major]/sum>=.63?major:null;
 return {counts,total:sum,dominant,major};
}
function aiCountersFor(role){
 if(role===6&&(state.faction===3||state.faction===4))return [2,3]; // Player Marine truck is ground armor, not aircraft.
 if(role===0&&(state.enemyFaction===3||state.enemyFaction===4))return [1,3,6]; // Marines field an Odo Bongo rather than a flier.
 if(role===3&&(state.enemyFaction===3||state.enemyFaction===4))return [2]; // Odo Bongo cannot counter heavy tanks; use actual armor breakers.
 return AI_COUNTER_ROLES[role];
}
function aiChoose(budget=state.enemyCash){
 const intel=aiReadOpponent();
 const affordable=ROLE.map((role,id)=>id).filter(id=>ROLE[id].cost<=budget);
 if(!affordable.length)return null;
 const myCounts=Array(ROLE.length).fill(0);
 for(const role of state.enemyBuilt)if(role!==null)myCounts[role]++;
 // Mixed heavy/air/healer compositions require two real counter types, not a random counter.
 const groundVehicle=state.faction===3||state.faction===4;
 const tanks=intel.counts[3]+(groundVehicle?intel.counts[6]:0),air=groundVehicle?0:intel.counts[6],medics=intel.counts[7];
 if(tanks>=2&&air>=2){
  if(affordable.includes(4)&&myCounts[4]<Math.ceil(air*.9))return 4;
  if(affordable.includes(2)&&myCounts[2]<Math.ceil(tanks*1.05))return 2;
  if(medics>=2&&affordable.includes(5)&&myCounts[5]<Math.ceil(medics*.5))return 5;
 }
 if(tanks>=2&&medics>=2&&affordable.includes(2)&&myCounts[2]<tanks)return 2;
 if(air>=2&&medics>=2&&affordable.includes(4)&&myCounts[4]<air)return 4;
 if(intel.dominant!==null){
  const primary=aiCountersFor(intel.dominant);
  const matching=primary.filter(id=>affordable.includes(id));
  if(matching.length){
   // Melee-only armies cannot attack aircraft. Buy one air unit once affordable,
   // then mix rifle + armor rather than exploit an unlimited flier swarm.
   if(intel.dominant===0 && state.enemyFaction!==4 && state.wave>=2 && affordable.includes(6) && myCounts[6]<Math.max(1,Math.floor(intel.counts[0]/6)))return 6;
   // Dedicated anti-air is essential against air-only forces; rifles alone are insufficient.
   if(intel.dominant===6&&state.faction!==3&&affordable.includes(4)&&myCounts[4]<Math.ceil(intel.counts[6]*.85))return 4;
   // Against tank spam, prioritize armor breakers. Marines must never answer tanks with trucks.
   if(intel.dominant===3&&affordable.includes(2)&&myCounts[2]<Math.ceil(intel.counts[3]*1.1))return 2;
   matching.sort((a,b)=>{
    const ac=myCounts[a]/Math.max(1,Math.ceil(intel.counts[intel.dominant]*.55));
    const bc=myCounts[b]/Math.max(1,Math.ceil(intel.counts[intel.dominant]*.55));
    return ac-bc || ROLE[a].cost-ROLE[b].cost;
   });
   return matching[0];
  }
 }
 // A mixed army is answered with a diverse mixture weighted by real enemy roles.
 const scores=affordable.map(id=>{
  const role=ROLE[id];
  const matchup=intel.counts.reduce((score,n,enemyRole)=>
   score+n*(role.good.includes(enemyRole)?3.5:role.bad.includes(enemyRole)?-2.5:0),0);
  const antiSpam=myCounts[id]*2.5;
  const utility=id===7&&myCounts.reduce((a,b)=>a+b,0)<4?-8:0;
  return {id,score:matchup-antiSpam+utility-(role.cost-90)/100};
 });
 scores.sort((a,b)=>b.score-a.score);
 const top=scores.slice(0,Math.min(3,scores.length));
 const random=Math.random()*top.reduce((a,b)=>a+Math.max(1,8+b.score-scores[0].score),0);
 let left=random;
 for(const entry of top){left-=Math.max(1,8+entry.score-scores[0].score);if(left<=0)return entry.id;}
 return top[0].id;
}
function aiInitialBuild(){
 // Equal starting resources. Both buildings are paid for out of the AI's 360 CR.
 for(const [slot,role] of [[1,0],[17,1]]){
  if(state.enemyBuilt[slot]!==null||state.enemyCash<ROLE[role].cost)continue;
  state.enemyBuilt[slot]=role;state.enemyCash-=ROLE[role].cost;
 }
}
function aiAdaptFacilities(intel){
 // The opponent uses building replacement under the exact same 55% refund as the player.
 // At most one conversion per 2 waves. React only to clear, repeated single-role spam.
 if(intel.dominant===null||intel.total<4||state.wave<2||state.wave%2!==0)return false;
 const counters=aiCountersFor(intel.dominant);
 const aiCount=state.enemyBuilt.filter(r=>r!==null).length;
 const counterCount=state.enemyBuilt.filter(r=>counters.includes(r)).length;
 if(counterCount>=Math.ceil(aiCount*.55))return false;
 const badIndex=state.enemyBuilt.findIndex(role=>role!==null&&!counters.includes(role));
 if(badIndex<0)return false;
 const oldRole=state.enemyBuilt[badIndex],refund=Math.floor(ROLE[oldRole].cost*.55);
 const options=counters.filter(role=>ROLE[role].cost-refund<=state.enemyCash);
 if(!options.length)return false;
 const target=options.sort((a,b)=>ROLE[a].cost-ROLE[b].cost)[0];
 state.enemyCash-=ROLE[target].cost-refund;
 state.enemyBuilt[badIndex]=target;
 return true;
}
function aiInvest(){
 const intel=aiReadOpponent();
 const enemyCount=state.enemyBuilt.filter(role=>role!==null).length;
 const invaded=state.units.some(u=>u.side===0&&u.x>WORLD_W-580&&u.hp>0);
 const heavyRush=intel.total>=4&&intel.dominant!==null;
 // Spend normal starting income on a genuine early offensive army to punish pure eco greed.
 const opening=Math.min(12,4+Math.floor(Math.max(0,state.wave-1)*1.2));
 // Keep pace with a committed enemy production build, but not by spawning free units.
 const isAirRush=heavyRush&&intel.dominant===6&&state.faction!==3&&state.faction!==4;
 const isTankRush=heavyRush&&intel.dominant===3;
 const isTruckRush=heavyRush&&intel.dominant===6&&(state.faction===3||state.faction===4);
 // Single-unit spam has little tactical flexibility. Counter it by investing earned credits
 // in a stronger specialist army rather than hoarding cash at a same-size facility cap.
 const focusMultiplier=isAirRush?1.6:isTankRush?1.45:isTruckRush?1.4:heavyRush?1.05:.85;
 const desired=Math.min(SLOTS,Math.max(opening,2+Math.floor(state.wave/3)+Math.floor(Math.max(0,state.wave-9)/2),
  Math.ceil(intel.total*focusMultiplier),invaded?intel.total+2:0));
 // One reasonable purchasing opportunity per wave, up to three early in a rush.
 let purchases=Math.min(invaded||isAirRush||isTankRush||isTruckRush?4:heavyRush?3:state.wave<=5?2:3,Math.max(0,desired-enemyCount));
 const reserve=invaded||heavyRush||state.wave<=4?0:50;
 if(state.wave>=5&&state.wave%3===0&&!invaded&&state.enemyEco<MAX_ECONOMY){
  const wantLevel=Math.min(MAX_ECONOMY,Math.floor(state.wave/4));
  const ecoPrice=ecoCostFor(state.enemyEco);
  if(state.enemyEco<wantLevel&&state.enemyCash>=ecoPrice+150){
   state.enemyCash-=ecoPrice;state.enemyEco++;
  }
 }
 aiAdaptFacilities(intel);
 const slots=state.enemyBuilt.map((v,i)=>v===null?i:-1).filter(i=>i>=0);
 while(slots.length&&purchases-->0){
  const role=aiChoose(state.enemyCash-reserve);
  if(role===null)break;
  const slot=slots.splice(Math.floor(Math.random()*slots.length),1)[0];
  state.enemyBuilt[slot]=role;state.enemyCash-=ROLE[role].cost;
 }
}
function wave(){
 state.wave++;state.cash+=WAVE_STIPEND;
 state.marineSupports=[];state.marineRecruitCount=[0,0];
 state.enemyCash+=WAVE_STIPEND;
 aiInvest();
 const headcount=[state.units.filter(u=>u.side===0).length,state.units.filter(u=>u.side===1).length];
 for(let i=0;i<SLOTS;i++){
  if(state.built[i]!==null){
   const role=state.built[i];
   if(headcount[0]<SIDE_SUPPLY){createUnit(0,i,role);headcount[0]++;}
   if(state.faction===3&&role===7)for(const interval of [1,2])state.marineSupports.push({side:0,slot:i,role,wave:state.wave,due:state.elapsed+HUANGLONG_INTERVAL*interval});
  }
  if(state.enemyBuilt[i]!==null){
   const role=state.enemyBuilt[i];
   if(headcount[1]<SIDE_SUPPLY){createUnit(1,i,role);headcount[1]++;}
   if(state.enemyFaction===3&&role===7)for(const interval of [1,2])state.marineSupports.push({side:1,slot:i,role,wave:state.wave,due:state.elapsed+HUANGLONG_INTERVAL*interval});
  }
 }
 banner('WAVE '+String(state.wave).padStart(2,'0')+' · DEPLOYED');
 setMessage('웨이브 '+state.wave+' 출격 · 아군 '+state.built.filter(v=>v!==null).length+'기 / 상대의 실제 병력은 정찰로 확인');
 chirp(430,.17);updateUI(true);
}
function deployMarineSupports(){
 if(!state.marineSupports.length)return;
 state.marineSupports=state.marineSupports.filter(job=>{
  if(job.wave!==state.wave)return false;
  if(job.due>state.elapsed+1e-6)return true;
  const buildings=job.side===0?state.built:state.enemyBuilt;
  const faction=job.side===0?state.faction:state.enemyFaction;
  if(faction===3&&buildings[job.slot]===7&&state.units.filter(u=>u.hp>0&&u.side===job.side).length<SIDE_SUPPLY)createUnit(job.side,job.slot,7);
  return false;
 });
}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function structureDamage(role,amount){
 // Buildings are armored structures: light melee cannot be the strongest base breaker.
 // Exactly the same modifiers apply to player and AI troops.
 const factor=[.52,.88,1.12,1.08,.82,1.55,.87,.4][role]??1;
 return amount*factor;
}
function calcDamage(attacker,target,amount){
 let out=amount;
 if(attacker!==null){
  const role=ROLE[attacker];
  if(target.role===6&&(target.faction===3||target.faction===4)){if(attacker===2)out*=1.65;else if(attacker===0)out*=.68;else if(attacker===4)out*=.78;}
  else{if(role.good.includes(target.role))out*=1.55;if(role.bad.includes(target.role))out*=.7;}
 }
 const armor=getDef(target.role,target.faction).armor;
 return Math.max(3,out-armor*.66);
}
function killUnit(u){
 if(u.hp<=0 && u.killed)return;
 u.hp=0;u.killed=true;u.strike=null;
 u.deathAge=0;state.deadUnits.push(u);
 if(state.deadUnits.length>120)state.deadUnits.shift();
 pulse(u.x,u.y,COLORS[u.side],24);
}
function beginStrike(u,target=null,baseSide=null,healing=false){
 if(u.strike)return;
 const def=getDef(u.role,u.faction);
 const duration=clamp(def.rate*.75,.5,.83);
 u.strike={mode:baseSide!==null?'siege':'attack',target,baseSide,healing,age:0,duration,hit:false};
 if(healing)u.skillAge=.62;
 u.cooldown=def.rate*random(.92,1.07);
}
function resolveStrike(u,hit){
 if(hit.healing){
  if(u.faction===3&&u.role===7){
   // 황룡의 해병수육: one summoned support unit is consumed to heal all injured allies nearby.
   // This is a special skill, not a normal renewable healing attack.
   const radius=195;
   let healed=0;
   for(const mate of state.units){
    if(mate.side!==u.side||mate===u||mate.hp<=0||mate.hp>=mate.maxHP)continue;
    const d=Math.hypot(mate.x-u.x,mate.y-u.y);
    if(d<=radius){
     const before=mate.hp;
     const amount=Math.min(mate.maxHP-mate.hp,Math.max(135,mate.maxHP*.32)*(u.side===0?1+.08*state.weapon:1));
     heal(mate,amount,true);healed+=mate.hp-before;
    }
   }
   if(healed>0){
    floatText(u.x,u.y-30,'해병수육!', '#ffe3a0');
    pulse(u.x,u.y,'#f3bd75',68);
    for(let i=0;i<5;i++)pulse(u.x+Math.sin(i*1.5)*28,u.y+Math.cos(i*1.2)*25,'#f6dc9a',13);
    killUnit(u);
   }
  }else if(hit.target&&hit.target.hp>0&&hit.target.hp<hit.target.maxHP)
   heal(hit.target,getDef(u.role,u.faction).heal*(u.side===0?1+.08*state.weapon:1));
 }else if(hit.baseSide!==null){
  fire(u,null,hit.baseSide);
 }else if(hit.target&&hit.target.hp>0){
  fire(u,hit.target);
 }else {
  pulse(u.x+u.facing*27,u.y,'#b4af91',9);
 }
}
// Kills by living, non-conscripted Marine units can trigger one-time logistics effects.
// No credit for defensive turrets, nukes, artillery buttons or already captured conscripts.
function marineSpoils(v,attacker,roll=Math.random){
 if(!attacker||attacker.faction!==3||attacker.side===v.side||attacker.conscripted||v.conscripted)return;
 if(roll()<MARINE_LOOT_CHANCE){
  const amount=Math.min(24,Math.floor(ROLE[v.role].cost*.12));
  const key=v.side===0?'cash':'enemyCash',to=attacker.side===0?'cash':'enemyCash';
  const stolen=Math.min(amount,Math.max(0,Math.floor(state[key])));
  if(stolen>0){state[key]-=stolen;state[to]+=stolen;state.marineStats.loot++;state.marineStats.lootedCR+=stolen;floatText(v.x,v.y-28,'긴빠이 +'+stolen+' CR','#f8d292');}
 }
 if(state.marineRecruitCount[attacker.side]>=MARINE_RECRUIT_CAP||roll()>=MARINE_RECRUIT_CHANCE)return;
 if(state.units.filter(x=>x.hp>0&&x.side===attacker.side).length>=SIDE_SUPPLY)return;
 state.marineRecruitCount[attacker.side]++;
 state.marineStats.recruits++;
 state.units.push({...v,uid:state.nextUnitId++,side:attacker.side,hp:Math.max(1,Math.floor(v.maxHP*MARINE_RECRUIT_HP)),killed:false,conscripted:true,strike:null,
  cooldown:1.5,blink:.4,spawnAge:0,hitAge:0,skillAge:0,ramCooldown:1.8,moving:false,facing:attacker.side===0?1:-1});
 floatText(v.x,v.y-43,'자진입대!','#f7e0ac');
}
function damage(u,amount,source,attacker=null,roll=Math.random){
 if(u.hp<=0)return;
 const hit=calcDamage(typeof source==='number'?source:null,u,amount);
 u.hp-=hit;u.blink=.12;u.hitAge=.36;
 if(Math.random()<.15)floatText(u.x,u.y-25,Math.round(hit),COLORS[u.side===0?1:0]);
 if(u.hp<=0){killUnit(u);marineSpoils(u,attacker,roll);}
}
function heal(u,amount,burst=false){
 if(!burst){
  if(u.healWindowStart===undefined||state.elapsed-u.healWindowStart>=HEAL_WINDOW){u.healWindowStart=state.elapsed;u.healWindowUsed=0;}
  amount=Math.max(0,Math.min(amount,Math.max(HEAL_BUDGET,u.maxHP*.085)-u.healWindowUsed));
  u.healWindowUsed+=amount;
 }
 if(amount<=0)return;
 u.hp=Math.min(u.maxHP,u.hp+amount);pulse(u.x,u.y,'#94f7a9',11);
}
function structureHit(side,amount){
 if(state.turretHP[side]>0){
  state.turretHP[side]=Math.max(0,state.turretHP[side]-amount);
  state.structureFX.push({side,part:'turret',mode:state.turretHP[side]<=0?'ruin':'hit',age:0,duration:state.turretHP[side]<=0?1:.5});
  pulse(side===0?188:WORLD_W-188,260,'#fcb78b',23);
  if(state.turretHP[side]===0){
   floatText(side===0?188:WORLD_W-188,190,'DEFENSE DOWN','#ffad82');
   setMessage(side===0?'아군 방어 포탑 파괴! 핵심 기지를 방어하세요.':'적군 방어 포탑 파괴! 핵심 기지를 공격합니다.');
  }
 }else{
  state.baseHP[side]=Math.max(0,state.baseHP[side]-amount);
  state.structureFX.push({side,part:'core',mode:state.baseHP[side]<=0?'ruin':'hit',age:0,duration:state.baseHP[side]<=0?1:.5});
  pulse(side===0?89:WORLD_W-89,260,'#f8aa8a',32);
  if(state.baseHP[side]<=0)endMatch(side===1);
 }
}
function nearestUnit(u,def){
 const targets=state.sortedTeams?.[1-u.side]||state.units.filter(v=>v.side!==u.side).sort((a,b)=>a.x-b.x);
 if(!targets.length)return null;
 let lo=0,hi=targets.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(targets[mid].x<u.x)lo=mid+1;else hi=mid;}
 let a=lo-1,b=lo,candidate=null,score=Infinity;
 // Sorted world-space positions reduce target search from full army scan to adjacent combatants.
 while(a>=0||b<targets.length){
  const dxA=a>=0?Math.abs(targets[a].x-u.x):Infinity;
  const dxB=b<targets.length?Math.abs(targets[b].x-u.x):Infinity;
  const next=Math.min(dxA,dxB);
  if(candidate&&next>(score+175))break;
  const v=dxA<=dxB?targets[a--]:targets[b++];
  if(v.hp<=0||v.side===u.side||(!def.airTarget&&getDef(v.role,v.faction).kind==='air'))continue;
  const dy=Math.abs(u.y-v.y);
  const d=Math.hypot(next,dy);
  const bonus=(u.role===4&&getDef(v.role,v.faction).kind==='air'?175:0)+(def.good.includes(v.role)?Math.min(35,def.range*.2):0);
  if(d-bonus<score){score=d-bonus;candidate=v;}
 }
 return candidate;
}
function nearInjured(u){
 let candidate=null,score=1e7;
 for(const v of state.units)if(v.side===u.side&&v.hp>0&&v!==u&&v.hp<v.maxHP-12){
  const d=distance(u,v)-(1-v.hp/v.maxHP)*80;
  if(d<score){score=d;candidate=v;}
 }
 return candidate;
}
// Local spatial-hash collision prevents 200+ units piling on a single pixel.
// Ground units of either side have physical footprints. Aircraft float over ground
// but still avoid other aircraft. Rebuild hash per pass so resolution stays stable.
function unitRadius(u){return u.hitRadius||(u.faction===3&&u.role===6?30:u.faction===4&&u.role===6?22:u.role===3?26:u.role===6?14:u.role===5?17:u.role===0?17:15);}
function physicalLayer(u){return getDef(u.role,u.faction).kind==='air'?'air':'ground';}
function separateUnits(){
 const CELL=76;
 for(let pass=0;pass<2;pass++){
  const grid=new Map();
  for(const u of state.units){
   if(u.hp<=0)continue;
   const key=Math.floor(u.x/CELL)+','+Math.floor(u.y/CELL);
   if(!grid.has(key))grid.set(key,[]);
   grid.get(key).push(u);
  }
  for(const u of state.units){
   if(u.hp<=0)continue;
   const gx=Math.floor(u.x/CELL),gy=Math.floor(u.y/CELL),layer=physicalLayer(u);
   for(let iy=gy-1;iy<=gy+1;iy++)for(let ix=gx-1;ix<=gx+1;ix++){
    const neighbours=grid.get(ix+','+iy);if(!neighbours)continue;
    for(const v of neighbours){
     if(v===u||v.uid<=u.uid||v.hp<=0||physicalLayer(v)!==layer)continue;
     let dx=v.x-u.x,dy=v.y-u.y,d=Math.hypot(dx,dy);
     const min=unitRadius(u)+unitRadius(v);
     if(d>=min)continue;
     if(d<.00001){const angle=((u.uid*19+v.uid*13)%13)*Math.PI*2/13;dx=Math.cos(angle);dy=Math.sin(angle);d=1;}
     const overlap=Math.min(min-d,24)*.53,nx=dx/d,ny=dy/d;
     const ru=unitRadius(u),rv=unitRadius(v),shareU=rv/(ru+rv),shareV=ru/(ru+rv);
     u.x=clamp(u.x-nx*overlap*shareU*2,30,WORLD_W-30);
     u.y=clamp(u.y-ny*overlap*shareU*2,68,452);
     v.x=clamp(v.x+nx*overlap*shareV*2,30,WORLD_W-30);
     v.y=clamp(v.y+ny*overlap*shareV*2,68,452);
    }
   }
  }
 }
}
function bongoImpact(u,dt){
 if(!((u.faction===3||u.faction===4)&&u.role===6)||u.hp<=0)return;
 u.ramCooldown=Math.max(0,(u.ramCooldown||0)-dt);
 if(u.ramCooldown>0)return;
 const candidates=state.units.filter(v=>v.side!==u.side&&v.hp>0&&getDef(v.role,v.faction).kind==='ground'&&Math.hypot(v.x-u.x,v.y-u.y)<unitRadius(u)+unitRadius(v)+9)
  .sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y));
 if(!candidates.length)return;
 u.ramCooldown=u.faction===4?2.2:1.85;
 if(u.faction===3)state.marineStats.bongoCharges++;
 const mods=u.side===0?1+state.weapon*.08:1;
 for(const v of candidates.slice(0,3)){
  // Drive-by anti-melee, reduced against true heavy armor; no building bonus.
  const antiMelee=v.role===0?1.45:v.role===3?.38:1;
  damage(v,(u.faction===4?30:42)*mods*antiMelee,null,u);
  v.x=clamp(v.x+u.facing*13,30,WORLD_W-30);
  pulse(v.x,v.y,'#edb46c',14);
 }
 floatText(u.x,u.y-25,u.faction===4?'흑표 돌진!':'오도봉고!',u.faction===4?'#ffcae9':'#f4ce8e');
 pulse(u.x,u.y,u.faction===4?'#e68db6':'#bd734e',31);
}
function move(u,x,y,dt){
 const dx=x-u.x,dy=y-u.y,d=Math.hypot(dx,dy)||1,def=getDef(u.role,u.faction);
 const step=def.speed*dt;
 u.x+=dx/d*Math.min(step,d);u.y+=dy/d*Math.min(step,d);
 u.facing=dx>=0?1:-1;u.moving=d>1;u.x=clamp(u.x,30,WORLD_W-30);u.y=clamp(u.y,68,452);
}
function fire(u,t=null,baseSide=null){
 const def=getDef(u.role,u.faction),x=t?t.x:baseSide===0?(state.turretHP[0]>0?190:90):(state.turretHP[1]>0?WORLD_W-190:WORLD_W-90),y=t?t.y:260;
 if(def.range<48){
  if(t && u.faction===3&&u.role===6){
   // Armored bumper: splash up to three clustered ground enemies, not flying units.
   let hits=0;
   for(const v of state.units){
    if(v.side===u.side||v.hp<=0||getDef(v.role,v.faction).kind==='air')continue;
    if(Math.hypot(t.x-v.x,t.y-v.y)>48)continue;
    damage(v,def.damage*(u.side===0?1+.08*state.weapon:1)*(v.role===0?1.3:v.role===3?.55:1),null,u);
    if(++hits>=3)break;
   }
   pulse(t.x,t.y,'#f1af72',23);
  }
  else if(t)damage(t,def.damage*(u.side===0?1+.08*state.weapon:1),u.role,u);
  else structureHit(baseSide,structureDamage(u.role,def.damage*(u.side===0?1+.08*state.weapon:1)));
  pulse(x,y,'#ffdbae',6);
 }else{
  state.shots.push({side:u.side,faction:u.faction,conscripted:!!u.conscripted,source:u.role,x:u.x,y:u.y,tx:x,ty:y,
   target:t,baseSide,damage:def.damage*(u.side===0?1+.08*state.weapon:1),
   speed:200+(def.range<200?205:120),blast:def.blast||0,ttl:3.5});
 }
 u.blink=.13;
}
function projectileImpact(p){
 const x=p.tx,y=p.ty;
 pulse(x,y,p.source===4?'#8cebf4':'#ffc88d',p.blast?45:12);
 if(p.baseSide!==null){structureHit(p.baseSide,structureDamage(p.source,p.damage));return;}
 if(p.blast){
  for(const v of state.units)if(v.hp>0&&v.side!==p.side){
   if(getDef(v.role,v.faction).kind==='air'&&!ROLE[p.source].airTarget)continue;
   const d=Math.hypot(v.x-x,v.y-y);
   if(d<=p.blast+10)damage(v,p.damage*(1-.48*d/(p.blast+10)),p.source,p);
  }
 }else if(p.target&&p.target.hp>0&&Math.hypot(p.target.x-x,p.target.y-y)<40){
  damage(p.target,p.damage,p.source,p);
 }
}
function tick(dt){
 if(!state.live||state.paused||state.ended)return;
 if(state.followFront){
  const left=state.units.filter(u=>u.side===0),right=state.units.filter(u=>u.side===1);
  let center=WORLD_W/2;
  if(left.length&&right.length){
   const lead=Math.max(...left.map(u=>u.x)),near=Math.min(...right.map(u=>u.x));
   center=(lead+near)/2;
  }else if(left.length)center=Math.max(...left.map(u=>u.x))+100;
  else if(right.length)center=Math.min(...right.map(u=>u.x))-100;
  const target=clamp(center-CW/2,0,WORLD_W-CW);
  state.cameraX+=clamp(target-state.cameraX,-750*dt,750*dt);
 }
 const ds=dt*state.rate;
 state.elapsed+=ds;state.next-=ds;state.incomeClock+=ds;
 while(state.incomeClock>=INCOME_PERIOD){state.incomeClock-=INCOME_PERIOD;state.cash+=initialIncome+state.eco;state.enemyCash+=initialIncome+state.enemyEco;}
 state.barrageCd=Math.max(0,state.barrageCd-ds);
 while(state.next<=0){state.next+=INTERVAL;wave();}
 deployMarineSupports();
 state.sortedTeams=[state.units.filter(u=>u.side===0).sort((a,b)=>a.x-b.x),state.units.filter(u=>u.side===1).sort((a,b)=>a.x-b.x)];
 for(const u of state.units){
  if(u.hp<=0)continue;
  const def=getDef(u.role,u.faction);
  u.cooldown-=ds;u.anim+=ds*12;u.blink=Math.max(0,u.blink-ds);
  u.spawnAge=Math.min(5,(u.spawnAge||0)+ds);u.hitAge=Math.max(0,(u.hitAge||0)-ds);u.skillAge=Math.max(0,(u.skillAge||0)-ds);u.moving=false;
  if(u.strike){
   const hit=u.strike;hit.age+=ds;
   if(!hit.hit && hit.age>=hit.duration*.47){hit.hit=true;resolveStrike(u,hit);}
   if(hit.age>=hit.duration)u.strike=null;
   continue;
  }
  if(u.role===7){
   const mate=nearInjured(u);
   if(mate){
    if(distance(u,mate)>def.range*.72)move(u,mate.x,mate.y,ds);
    else if(u.cooldown<=0)beginStrike(u,mate,null,true);
   }else{
    const mate2=state.units.find(v=>v.side===u.side&&v.role!==7&&v.hp>0);
    if(mate2&&distance(u,mate2)>94)move(u,mate2.x,mate2.y,ds);
    else if(!mate2)move(u,u.side===0?WORLD_W-350:350,260,ds);
   }
   continue;
  }
  const target=nearestUnit(u,def);
  if(target){
   const reach=def.range<48?Math.max(def.range,unitRadius(u)+unitRadius(target)+7):def.range*(def.range>65?.88:1);
   if(distance(u,target)>reach)move(u,target.x,target.y,ds);
   else if(u.cooldown<=0)beginStrike(u,target);
  }else{
   const side=1-u.side,tx=side===0?(state.turretHP[0]>0?190:90):(state.turretHP[1]>0?WORLD_W-190:WORLD_W-90);
   const d=Math.hypot(u.x-tx,u.y-260);
   if(d>def.range+15)move(u,tx,260,ds);
   else if(u.cooldown<=0)beginStrike(u,null,side);
  }
 }
 separateUnits();
 for(const u of state.units)if((u.faction===3||u.faction===4)&&u.role===6&&u.hp>0)bongoImpact(u,ds);
 for(let i=state.shots.length-1;i>=0;i--){
  const p=state.shots[i];p.ttl-=ds;
  if(p.target&&p.target.hp>0){p.tx=p.target.x;p.ty=p.target.y;}
  const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy),step=p.speed*ds;
  if(d<step+6||p.ttl<=0){projectileImpact(p);state.shots.splice(i,1);}
  else{p.x+=dx/d*step;p.y+=dy/d*step;}
 }
 // Rapid defensive single-target turret, per side; targets air and armor as well.
 for(let side=0;side<=1;side++){
  if(state.turretHP[side]<=0)continue;
  const origin={x:side===0?190:WORLD_W-190,y:260};
  state['cool'+side]=Math.max(0,(state['cool'+side]||0)-ds);
  if(state['cool'+side]>0)continue;
  const near=state.units.filter(u=>u.side!==side&&u.hp>0&&distance(u,origin)<=TOWER_RANGE);
  if(!near.length)continue;
  near.sort((a,b)=>distance(a,origin)*.55+a.hp/a.maxHP*42-(a.role===7?35:0)
   -(distance(b,origin)*.55+b.hp/b.maxHP*42-(b.role===7?35:0)));
  const target=near[0],def=getDef(target.role,target.faction);
  damage(target,TOWER_DAMAGE*(def.kind==='air'?1.25:target.role===3?1.12:1),'turret');
  state['cool'+side]=TOWER_PERIOD;
  state.towerShots.push({side,x:origin.x,y:origin.y,tx:target.x,ty:target.y,time:.14});
 }
 for(const shot of state.towerShots)shot.time-=ds;
 state.towerShots=state.towerShots.filter(x=>x.time>0);
 state.units=state.units.filter(v=>v.hp>0);
 for(const u of state.deadUnits)u.deathAge+=ds;
 state.deadUnits=state.deadUnits.filter(u=>u.deathAge<1.08);
 for(const impact of state.structureFX)impact.age+=ds;
 state.structureFX=state.structureFX.filter(impact=>impact.age<impact.duration);
 for(const e of state.effects)e.time-=ds;
 state.effects=state.effects.filter(v=>v.time>0);
 for(const v of state.floaters){v.time-=ds;v.y-=ds*20;}
 state.floaters=state.floaters.filter(v=>v.time>0);
 if(bannerSeconds>0){bannerSeconds-=ds;if(bannerSeconds<=0)$('waveBanner').classList.remove('show');}
 uiElapsed+=dt;if(uiElapsed>=.23){uiElapsed=0;updateUI(false);}
}
function endMatch(win){
 if(state.ended)return;
 state.ended=true;
 window.DesertLobby?.completeSolo?.({win,matchedFaction:state.faction,wave:state.wave});
 $('endTitle').textContent=win?'작전 승리':'기지 함락';
 $('endTitle').style.color=win?'#fbd89b':'#f69a8e';
 $('endSummary').textContent=state.wave+'웨이브 · '+state.built.filter(v=>v!==null).length+'개 생산 시설 · 무기 Lv.'+state.weapon+' / 장갑 Lv.'+state.armor;
 $('endOverlay').classList.remove('hidden');
 setMessage(win?'적군 핵심 기지 파괴 · 승리':'아군 핵심 기지 파괴 · 패배');
}
function roleMatchupHtml(role,faction=state?.faction??0){
 const r=getDef(role,faction);
 return '<span class="tag strong">'+(role===7?'시너지 ':'강점 ')+r.good.map(i=>ROLE[i].mark+ROLE[i].name).join(' · ')+'</span>'+
 '<span class="tag weak">약점 '+r.bad.map(i=>ROLE[i].mark+ROLE[i].name).join(' · ')+'</span>';
}
function updateUI(full=false){
 if(!state)return;
 const cameraStatus=$('cameraStatus');if(cameraStatus)cameraStatus.textContent=state.followFront?'전선 자동 추적':'수동 이동 · '+Math.round((state.cameraX+CW/2)/WORLD_W*100)+'%';
 $('cash').textContent=money(state.cash);
 $('income').textContent='+'+(1+state.eco);
 $('wave').textContent=String(state.wave).padStart(2,'0');
 $('timer').textContent=Math.max(0,state.next).toFixed(1);
 $('myHealth').textContent=Math.ceil(state.baseHP[0])+' / '+MAX_BASE;
 $('enemyHealth').textContent=enemyBaseVisible()?Math.ceil(state.baseHP[1])+' / '+MAX_BASE:'정찰 전';
 $('myHealthFill').style.width=100*state.baseHP[0]/MAX_BASE+'%';
 $('enemyHealthFill').style.width=(enemyBaseVisible()?100*state.baseHP[1]/MAX_BASE:0)+'%';
 $('factionLabel').textContent=FACTIONS[state.faction].name;
 const marineOps=$('marineAbilityStatus');
 if(marineOps){marineOps.hidden=state.faction!==3; if(state.faction===3)marineOps.textContent='★ 해병성채 | 긴빠이 '+state.marineStats.loot+'회 (+'+state.marineStats.lootedCR+' CR) | 자진입대 '+state.marineStats.recruits+'회 · 이번 웨이브 '+state.marineRecruitCount[0]+'/'+MARINE_RECRUIT_CAP+' | 황룡 '+state.marineStats.huangSpawns+'기 소환 | 오도봉고 '+(state.marineStats.bongoCharges||0)+'회 돌진';}
 $('enemyFactionLabel').textContent='VS '+FACTIONS[state.enemyFaction].name;
 const inv=state.units.filter(u=>u.side===1&&u.x<490).length;
 $('baseAlert').textContent=inv>0?'침공 경보 · '+inv+'기':state.turretHP[0]===0?'방어 포탑 파괴':'기지 안전';
 $('baseAlert').classList.toggle('danger',inv>0||state.turretHP[0]===0);
 $('warningDot').hidden=!(inv>0||state.turretHP[0]===0);
 $('builtCount').textContent=state.built.filter(x=>x!==null).length+' / '+SLOTS;
 $('friendlyCount').textContent=state.units.filter(x=>x.side===0).length;
 $('hostileCount').textContent=state.units.filter(x=>x.side===1).length;
 $('frontStatus').textContent=inv?'⚠ 아군 기지 침공':state.units.some(x=>x.side===0&&x.x>WORLD_W-490)?'적 기지 압박':'중앙 전선';
 $('battleStatus').textContent=state.ended?'전투 종료':!state.live?'작전 대기':state.paused?'일시정지':inv?'⚠ 본진 침공':'전투 진행 중';
 const nukeTargets=state.units.filter(u=>u.side===1&&u.x<=550);
 const nukeAllowed=(state.baseHP[0]<=MAX_BASE*.7||nukeTargets.some(u=>u.x<370))&&nukeTargets.length>0;
 $('nukeInfo').textContent=state.nukes?'1회 남음 · '+(nukeAllowed?'발동 가능':'침공/위기 시 사용 가능'):'사용 완료';
 $('nukeButton').disabled=!(state.nukes&&nukeAllowed&&state.live&&!state.paused&&!state.ended);
 $('barrageInfo').textContent=state.barrageCd>0?'재충전 '+Math.ceil(state.barrageCd)+'초':'비용 260 CR · 적 병력 필수';
 $('barrageButton').disabled=!(state.live&&!state.ended&&!state.paused&&state.barrageCd<=0&&state.cash>=260&&state.units.some(u=>u.side===1));
 const econ=ecoCost(),weapon=weaponCost(),armor=armorCost();
 $('econInfo').textContent='레벨 '+state.eco+' / 7 · 0.5초마다 +'+(1+state.eco)+' CR'+(state.eco<MAX_ECONOMY?' · 다음 투자금 회수 '+Math.ceil(ecoCostFor(state.eco)/2)+'초':' · 최대 강화');
 $('weaponInfo').textContent='레벨 '+state.weapon+' / 5 · 공격력 +'+state.weapon*8+'%';
 $('armorInfo').textContent='레벨 '+state.armor+' / 5 · HP +'+state.armor*9+'%';
 $('repairInfo').textContent='방어 포탑 '+Math.ceil(state.turretHP[0])+' / '+MAX_TURRET;
 const upgradeButtons=[['econButton',state.eco,7,econ,'경제'],['weaponButton',state.weapon,5,weapon,'무기'],['armorButton',state.armor,5,armor,'장갑']];
 for(const [id,lv,max,price,label] of upgradeButtons){
  $(id).textContent=lv>=max?'최대 강화 완료':label+' 강화 · '+price+' CR';
  $(id).disabled=!(state.live&&!state.paused&&!state.ended&&lv<max&&state.cash>=price);
 }
 $('repairButton').disabled=!(state.live&&!state.paused&&!state.ended&&state.cash>=180&&state.turretHP[0]<MAX_TURRET);
 if(full||state.lastCards===undefined||Math.floor(state.cash/30)!==state.lastCards){
  const f=FACTIONS[state.faction];
  $('unitCards').innerHTML=ROLE.map((r,i)=>{
   const portrait=window.IsoWorld?.portrait(state.faction,i)||window.DesertSprites?.portrait(state.faction,i)||sprite(state.faction,i,0);
   const icon=(state.faction===4||state.faction===5)
     ?'<span class="maiden-unit-portrait" aria-hidden="true" style="background-position:-'+(i*64)+'px -'+(192+(state.faction-4)*80)+'px"></span>'
     :typeof portrait.toDataURL==='function'?'<img class="pixel-preview" src="'+portrait.toDataURL('image/png')+'" alt="" aria-hidden="true">':r.token;
   return '<button class="unit-card'+(selectedRole===i?' selected':'')+'" data-role="'+i+'" title="'+getDef(i,state.faction).tips+
    '"><span class="uc-top">'+getDef(i,state.faction).mark+' '+getDef(i,state.faction).name+' <span>0'+(i+1)+'</span></span><span class="uc-sprite">'+icon+
    '</span><span class="uc-name">'+f.units[i]+'</span><span class="uc-role">'+getDef(i,state.faction).name+' · '+(getDef(i,state.faction).kind==='air'?'공중':'지상')+'</span>'+
    '<span class="uc-cost">'+r.cost+' CR</span><span class="good-counter">'+(i===7?'지원':'강점')+': '+getDef(i,state.faction).good.map(x=>ROLE[x].mark).join(' ')+'</span><span class="bad-counter">약점: '+getDef(i,state.faction).bad.map(x=>ROLE[x].mark).join(' ')+'</span></button>';
  }).join('');
  $('buildGrid').innerHTML=state.built.map((id,i)=>
   '<button class="build-cell'+(id!==null?' occupied':'')+(demolition&&id!==null?' demolition':'')+'" data-cell="'+i+'" aria-label="'+(id!==null?f.units[id]:'빈 슬롯')+'">'+
   (id!==null?'<span class="cell-icon">'+getDef(id,state.faction).mark+'</span><span class="cell-name">'+f.units[id]+'</span>':
    '<span class="cell-icon">+</span><span class="cell-position">'+(Math.floor(i/COLS)+1)+'-'+(i%COLS+1)+'</span>')+'</button>').join('');
  $('demolishButton').classList.toggle('selected',demolition);
  $('unitDetails').innerHTML=selectedRole!==null?'<b>'+f.units[selectedRole]+'</b> · '+getDef(selectedRole,state.faction).name+
    ' / '+ROLE[selectedRole].cost+' CR<br>'+getDef(selectedRole,state.faction).tips+'<div class="matchups">'+roleMatchupHtml(selectedRole,state.faction)+
    '</div><span>HP '+Math.round(getDef(selectedRole,state.faction).hp)+' · 피해 '+Math.round(getDef(selectedRole,state.faction).damage)+
    ' · 사거리 '+getDef(selectedRole,state.faction).range+' · '+(getDef(selectedRole,state.faction).airTarget?'대공 가능':'지상 공격')+'</span>':
    '<b>전술 안내</b> — 역할 마크와 상성표는 진영이 달라도 동일합니다. 유닛을 선택하세요.';
  state.lastCards=Math.floor(state.cash/30);
 }
}
function initFactions(){
 $('factionCards').innerHTML=FACTIONS.map((f,i)=>{
  const art=i>=4?'<img class="faction-hero-new" src="./assets/portraits/'+f.id+'.svg" alt="'+f.name+' 초상화" loading="lazy">':'';
  return '<button class="faction-card'+(i===selectedFaction?' selected':'')+(i>=4?' faction-maiden':'')+'" data-faction="'+i+'">'+
   '<span class="faction-icon" style="color:'+f.color+'">'+f.logo+'</span>'+art+
   '<strong>'+f.name+'</strong><span class="eyebrow">'+f.tag+'</span><small>'+f.slogan+'</small><span class="bonus">'+f.bonus+'</span></button>';
 }).join('');
 $('factionCards').querySelectorAll('[data-art-faction]').forEach(c=>{
  const f=Number(c.dataset.artFaction),portrait=window.IsoWorld?.portrait(f,f===8?5:f===7?1:0);
  if(portrait)c.getContext('2d')?.drawImage(portrait,0,0,72,72);
 });
 $('counterMatrix').innerHTML=ROLE.map((r,i)=>'<div class="matrix-item"><b>'+r.mark+' '+r.name+'</b>'+
 '<div class="good">'+(i===7?'조합 시너지: ':'강점: ')+r.good.map(x=>ROLE[x].mark+ROLE[x].name).join(' / ')+'</div>'+
 '<div class="bad">약점: '+r.bad.map(x=>ROLE[x].mark+ROLE[x].name).join(' / ')+'</div></div>').join('');
}
function px(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function buildSprite(faction,role,phase){
 const c=document.createElement('canvas');c.width=32;c.height=32;
 const p=c.getContext('2d');if(!p)return c;
 const main=FACTIONS[faction].color,shade=FACTIONS[faction].secondary;
 const dark='#12202a',light=faction===2?'#fbecdb':'#fff1be',moving=phase?1:0;
 const b=(x,y,w,h,col=main)=>px(p,x,y,w,h,col);
 // Each faction has a separate shape language. Roles add clear weapons/horns/wings.
 if(faction===0){
  b(12,6,8,7,shade);b(13,4,6,6,main);b(14,6,4,2,light);b(10,12,12,11,main);b(13,14,6,5,shade);
  b(7,14,4,8,shade);b(21,14,4,8,shade);b(12,23,4,7,shade);b(17,23+moving,4,7-moving,shade);
  b(12,12,8,2,light);
 }else if(faction===1){
  b(12,5,8,6,shade);b(8,8,4,6,main);b(20,8,4,6,main);b(10,12,12,11,main);
  b(7,13,4,10,shade);b(21,13,4,10,shade);
  b(11,23,5,6,shade);b(18,23+moving,5,6-moving,shade);
  b(13,9,2,2,light);b(18,9,2,2,light);
  b(10,7,4,2,main);b(19,7,4,2,main);b(14,15,4,4,shade);
 }else{
  b(13,3,6,5,light);b(11,8,10,4,main);b(10,12,12,11,shade);b(8,14,4,8,main);
  b(20,14,4,8,main);b(12,23,4,7,main);b(17,23+moving,4,7-moving,main);
  b(12,13,8,9,main);b(15,15,3,3,light);
  b(10,6,3,3,main);b(20,6,3,3,main);
 }
 if(role===0){
  b(23,6,3,21,light);b(21,5,7,3,main);b(4,17,6,4,shade);
  if(faction===1){b(2,20,8,4,main);b(23,20,7,4,main);}
 }else if(role===1){
  b(21,14,10,4,dark);b(21,14,8,2,light);b(6,17,6,4,shade);
  if(faction===1)b(24,14,7,4,'#aad875');
 }else if(role===2){
  b(19,9,12,9,shade);b(21,11,11,4,light);b(24,9,5,3,main);b(6,14,5,11,shade);
 }else if(role===3){
  p.clearRect(0,0,32,32);
  if(faction===0){
   b(4,11,24,14,main);b(7,8,18,6,shade);b(10,6,12,7,main);
   b(17,10,15,4,light);b(3,24,26,5,dark);
   for(let x=5;x<26;x+=7)b(x,24,4,4,'#93a3a1');
  }else if(faction===1){
   b(7,12,18,14,shade);b(11,7,12,9,main);b(4,15,6,10,main);b(23,15,6,10,main);
   b(6,9,8,4,main);b(20,9,8,4,main);b(12,24,6,6,main);b(22,24,6,6,main);
   b(13,11,2,3,light);b(20,11,2,3,light);
  }else{
   b(6,8,21,17,shade);b(9,5,16,19,main);b(13,9,8,12,light);
   b(2,14,6,12,main);b(26,14,5,12,main);b(11,23,4,7,shade);b(21,23,4,7,shade);
  }
 }else if(role===4){
  b(6,7,6,14,shade);b(20,7,6,14,shade);b(6,5,7,4,light);b(19,5,7,4,light);
  b(3,17,8,5,main);b(21,17,8,5,main);
 }else if(role===5){
  b(2,4,24,7,shade);b(5,2,21,5,light);b(20,8,8,7,main);
  if(faction===1){b(4,3,5,7,main);b(14,3,5,7,main);}
 }else if(role===6){
  p.clearRect(0,0,32,32);
  b(12,9+moving,8,13,main);b(15,12,3,4,light);
  if(faction===0){b(1,8+moving,13,6,shade);b(20,8+moving,11,6,shade);
   b(5,15,7,4,light);b(22,15,7,4,light);b(11,19,11,5,shade);}
  else if(faction===1){b(0,5+moving,12,8,main);b(20,5+moving,12,8,main);
   b(3,15,10,4,shade);b(20,15,10,4,shade);b(13,21,6,8,shade);}
  else{b(0,8+moving,12,3,light);b(20,8+moving,12,3,light);
   b(4,5,8,6,main);b(20,5,8,6,main);b(13,23,6,5,main);}
 }else if(role===7){
  b(12,11,8,12,'#7ad5a6');b(14,9,4,16,light);b(9,15,14,5,light);
  b(3,11,5,8,shade);b(24,11,5,8,shade);
 }
 // Role and species distinct pixel silhouettes, not ripped game assets.
 return c;
}
function sprite(f,r,phase){
 const key=f+'-'+r+'-'+phase;
 if(!SPRITES.has(key))SPRITES.set(key,buildSprite(f,r,phase));
 return SPRITES.get(key);
}
function drawUnit(g,u,scale=1){
 const dead=u.killed===true;
 const flying=getDef(u.role,u.faction).kind==='air';
 const mode=dead?'death':u.hitAge>0?'hit':u.spawnAge<.42?'spawn':u.skillAge>0?'skill':u.strike?.mode||(u.moving?'move':'idle');
 const frame=dead?Math.min(15,Math.floor((u.deathAge||0)/1.08*16))
  :u.strike?Math.min(15,Math.floor(u.strike.age/u.strike.duration*16))
  :mode==='spawn'?Math.min(15,Math.floor((u.spawnAge||0)/.42*16))
  :mode==='hit'?Math.min(15,Math.floor((1-(u.hitAge||0)/.36)*16))
  :mode==='skill'?Math.min(15,Math.floor((1-(u.skillAge||0)/.62)*16))
  :Math.floor(u.anim)%16;
 const iso=window.IsoWorld,at=iso?iso.project(u.x,u.y):{x:u.x,y:u.y};
 const w=(iso?(u.role===3?78:u.role===6?77:68):(u.role===3?55:u.role===6?52:47))*scale;
 const h=(iso?(u.role===3?78:u.role===6?77:68):(u.role===3?55:u.role===6?52:47))*scale;
 const baseMode=['idle','move','attack','siege','death'].includes(mode)?mode:'idle';
 const artwork=iso?.frame(u.faction,u.role,baseMode,frame)||window.DesertSprites?.frame(u.faction,u.role,baseMode,frame)||sprite(u.faction,u.role,frame%2);
 g.fillStyle='#05141c88';g.beginPath();g.ellipse(at.x,at.y+13*scale,17*scale,4*scale,0,0,Math.PI*2);g.fill();
 g.save();g.translate(at.x,at.y);
 if(u.facing<0)g.scale(-1,1);
 g.imageSmoothingEnabled=false;
 const filter=u.side===0?window.DesertLobby?.skinFilter?.(u.faction)||'none':'none';
 if(iso&&window.DesertUnitMotion)window.DesertUnitMotion.draw(g,{faction:u.faction,role:u.role,action:mode,frame,x:-w/2,y:-h/2-(flying?9+Math.sin(u.anim)*2:0),size:w,filter});
 else{g.filter=filter;g.drawImage(artwork,-w/2,-h/2-(flying?9+Math.sin(u.anim)*2:0),w,h);g.filter='none';}
 g.restore();
 if(dead)return;
 if(u.conscripted){g.strokeStyle='#f7d277';g.lineWidth=2*scale;g.beginPath();g.ellipse(at.x,at.y+10*scale,17*scale,5*scale,0,0,Math.PI*2);g.stroke();}
 const role=ROLE[u.role],y=at.y-47*scale-(flying?9:0);
 g.fillStyle='#07161cd8';g.fillRect(at.x-10*scale,y-8*scale,20*scale,16*scale);
 g.strokeStyle=u.side===0?'#85e9fa':'#fdad92';g.lineWidth=1;g.strokeRect(at.x-10*scale,y-8*scale,20*scale,16*scale);
 g.fillStyle=u.side===0?'#d0f9ff':'#ffe4d0';g.textAlign='center';g.font='900 '+Math.round(13*scale)+'px monospace';
 g.fillText(getDef(u.role,u.faction).mark,at.x,y+4*scale);
 if(u.hp<u.maxHP){
  g.fillStyle='#06171c';g.fillRect(at.x-16*scale,y-12*scale,32*scale,4*scale);
  g.fillStyle=COLORS[u.side];g.fillRect(at.x-16*scale,y-12*scale,32*scale*Math.max(0,u.hp/u.maxHP),4*scale);
 }
}
function ground(g,w,h,base=false){
 if(window.IsoWorld){window.IsoWorld.terrain(g,w,h,base,state?.faction||0);return;}
 const grad=g.createLinearGradient(0,0,w,h);
 grad.addColorStop(0,'#3c4b4b');grad.addColorStop(.52,'#4b4940');grad.addColorStop(1,'#635242');
 g.fillStyle=grad;g.fillRect(0,0,w,h);
 g.strokeStyle='#d2a97819';g.lineWidth=1;
 for(let x=0;x<w;x+=43){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
 for(let y=0;y<h;y+=43){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
 for(let i=0;i<62;i++){
  const x=(i*173+27)%w,y=(i*83+39)%h;
  g.fillStyle=i%3?'#1b28271e':'#b4a17e23';g.fillRect(x,y,8+i%7,2+i%3);
 }
 if(!base){
  g.fillStyle='#293c4066';g.fillRect(0,95,w,60);g.fillRect(0,350,w,65);
  g.fillStyle='#a3a18625';for(const y of LANES)g.fillRect(0,y-33,w,66);
  g.strokeStyle='#ffe3ab33';g.setLineDash([14,16]);g.lineWidth=2;
  for(const y of LANES){g.beginPath();g.moveTo(150,y);g.lineTo(WORLD_W-150,y);g.stroke();}
  g.setLineDash([]);
  g.fillStyle='#12272f54';g.fillRect(WORLD_W/2-15,0,30,h);
  g.fillStyle='#f2d79d99';g.font='900 13px monospace';g.textAlign='center';g.fillText('FRONT LINE',WORLD_W/2,36);
 }
}
function structure(g,x,y,side,turret=true,health=1){
 if(window.IsoWorld){window.IsoWorld.structure(g,x,y,side===0?state.faction:state.enemyFaction,turret,health/(turret?MAX_TURRET:MAX_BASE));return;}
 g.save();g.translate(x,y);
 g.imageSmoothingEnabled=false;
 const faction=side===0?state.faction:state.enemyFaction;
 const palette=[
  {metal:'#608994',dark:'#203741',trim:'#f1bb7c',glow:'#93ebec'},
  {metal:'#72924b',dark:'#334628',trim:'#d3a46b',glow:'#d3f192'},
  {metal:'#947cc6',dark:'#322b62',trim:'#e7c3ff',glow:'#a5eeff'},
  {metal:'#78634b',dark:'#231c1a',trim:'#bd322c',glow:'#e6d9a2'},
  {metal:'#9b7987',dark:'#3d3041',trim:'#ebbbcd',glow:'#ffe3e8'},
  {metal:'#7bada5',dark:'#2e5a52',trim:'#def6d2',glow:'#b2ffe2'},
  {metal:'#886b50',dark:'#403026',trim:'#ecc893',glow:'#ffd5a2'},
  {metal:'#638ba8',dark:'#162d47',trim:'#b6dff5',glow:'#77e4ff'},
  {metal:'#8066b0',dark:'#2b1949',trim:'#ccb8f8',glow:'#c1f7fe'},
  {metal:'#c47fa5',dark:'#63385b',trim:'#ffe1b4',glow:'#ffd0f3'}
 ][faction]||{metal:'#648b91',dark:'#203b44',trim:'#ffe3b2',glow:'#9cf4df'};
 const cx=palette.glow;
 g.fillStyle='#07161988';g.beginPath();g.ellipse(0,27,turret?31:49,turret?20:37,0,0,7);g.fill();
 function block(px,py,w,h,color=palette.metal){g.fillStyle=color;g.fillRect(px,py,w,h);}
 function diamond(px,py,r,color){
  g.fillStyle=color;g.beginPath();g.moveTo(px,py-r);g.lineTo(px+r,py);g.lineTo(px,py+r);g.lineTo(px-r,py);g.closePath();g.fill();
 }
 if(faction===0){ // Forge Union: stacked steel plates, tracked armored defenses.
  if(turret){
   block(-28,-20,56,45,palette.dark);block(-24,-17,48,35,palette.metal);
   block(-18,-27,36,15,palette.dark);block(-14,-24,28,11,palette.metal);
   for(let i=-1;i<=1;i++){block(-20+i*16,10,11,5,palette.trim);block(-20+i*16,-11,10,3,palette.dark);}
   block(side===0?7:-45,-22,40,7,'#1b2f39');
   block(side===0?12:-45,-20,31,3,palette.trim);
   block(-5,-17,10,14,cx);
  }else{
   block(-42,-45,84,94,palette.dark);block(-36,-37,72,80,palette.metal);
   block(-42,-19,84,13,palette.dark);
   block(-28,-52,19,24,palette.metal);block(12,-52,19,24,palette.metal);
   for(let i=-2;i<=2;i++)block(i*12-5,21,9,8,palette.dark);
   block(-17,-26,34,42,palette.dark);block(-11,-20,22,29,palette.glow);
   block(-4,-14,8,16,palette.dark);
   block(-24,-37,11,5,palette.trim);block(14,-37,11,5,palette.trim);
  }
 }else if(faction===1){ // Brood: asymmetrical carapace and living hives.
  if(turret){
   diamond(0,-9,27,palette.dark);diamond(0,-9,21,palette.metal);
   for(let i=-1;i<=1;i++){const xx=i*18;diamond(xx,-17-Math.abs(i)*3,8,palette.trim);}
   block(-16,3,32,24,palette.dark);
   diamond(0,-14,7,cx);
   block(side===0?13:-39,-18,28,6,palette.trim);
   block(-23,15,46,4,palette.metal);
  }else{
   diamond(0,-11,55,palette.dark);diamond(0,-15,44,palette.metal);
   diamond(0,-14,24,palette.dark);diamond(0,-14,12,cx);
   for(const xx of [-30,-16,16,30]){
    diamond(xx,-44+Math.abs(xx)/3,12,palette.trim);
    block(xx-4,19,9,24,palette.dark);
   }
   block(-38,34,76,10,palette.metal);
  }
 }else if(faction===3){ // Marine Fortress: armoured bunker, red banner and dark observation slit.
  if(turret){
   block(-30,-17,60,43,palette.dark);block(-25,-26,50,24,palette.metal);
   block(-21,-14,42,12,'#32302b');block(-14,-8,28,7,'#a32828');
   block(side===0?10:-44,-15,34,8,'#242326');block(side===0?10:-43,-14,31,4,palette.trim);
   block(-10,6,20,16,palette.dark);block(-8,9,16,7,palette.trim);
  }else{
   block(-48,-47,96,94,palette.dark);block(-40,-36,80,72,palette.metal);
   block(-30,-38,60,14,'#7d2728');block(-34,-15,68,13,palette.dark);
   block(-27,-4,54,29,'#272521');block(-12,2,24,16,'#a12d26');
   block(-41,-58,17,22,palette.dark);block(24,-58,17,22,palette.dark);
   block(-33,-55,11,7,palette.trim);block(26,-55,11,7,palette.trim);
  }
 }else{ // Astral: levitating crystal conduits, sharply opposed to steel/hive.
  if(turret){
   diamond(0,-14,30,palette.dark);diamond(0,-14,20,palette.metal);
   diamond(0,-14,10,cx);
   diamond(-26,-24,10,palette.trim);diamond(26,-24,10,palette.trim);
   block(-18,12,36,22,palette.dark);
   block(-12,20,24,6,palette.glow);
  }else{
   diamond(0,-26,51,palette.dark);diamond(0,-30,40,palette.metal);
   diamond(0,-26,28,palette.dark);diamond(0,-26,13,palette.glow);
   for(const xx of [-36,36]){
    diamond(xx,-40,15,palette.trim);
    block(xx-5,4,10,40,palette.dark);
   }
   block(-27,14,54,28,palette.dark);
   for(let i=-1;i<=1;i++)block(i*15-4,20,8,13,palette.trim);
  }
 }
 if(health<=0){
  g.globalAlpha=.93;block(-26,-29,52,45,'#1b2225');block(-8,-24,16,8,'#d77557');
  for(let i=0;i<5;i++)block(-22+i*11,-18+i%3*10,5,5,palette.dark);
 }
 g.restore();
}
function enemyBaseVisible(){
 return state.wave>=FOG_END_WAVE||state.units.some(u=>u.side===0&&u.hp>0&&u.x>=ENEMY_FOG_X-220);
}
function enemyUnitVisible(u){return u.side===0||u.x<ENEMY_FOG_X||enemyBaseVisible();}
function drawBattle(){
 const c=$('battleCanvas'),g=c.getContext('2d');if(!g)return;
 g.clearRect(0,0,CW,CH);
 g.save();g.beginPath();g.rect(0,0,CW,CH);g.clip();g.translate(-state.cameraX,0);
 ground(g,WORLD_W,CH);
 structure(g,90,260,0,false,state.baseHP[0]);structure(g,WORLD_W-90,260,1,false,state.baseHP[1]);
 structure(g,190,260,0,true,state.turretHP[0]);structure(g,WORLD_W-190,260,1,true,state.turretHP[1]);
 for(const u of [...state.units,...state.deadUnits].filter(u=>u.x>=state.cameraX-85&&u.x<=state.cameraX+CW+85&&enemyUnitVisible(u)).sort((a,b)=>a.y-b.y))drawUnit(g,u,1);
 if(window.DesertSprites){
  for(const impact of state.structureFX){
   const x=impact.side===0?(impact.part==='turret'?190:90):(impact.part==='turret'?WORLD_W-190:WORLD_W-90);
   if(window.IsoWorld)window.IsoWorld.effect(g,x,260,60,impact.mode,impact.age/impact.duration);
   else window.DesertSprites.structureImpact(g,x,260,impact.side===0?state.faction:state.enemyFaction,impact.mode,impact.age/impact.duration);
  }
 }
 for(const shot of state.towerShots){
  g.strokeStyle=shot.side===0?'#91f2ea':'#ffc6aa';g.lineWidth=2.5;
  const start=window.IsoWorld?window.IsoWorld.project(shot.x,shot.y):shot;
  const end=window.IsoWorld?window.IsoWorld.project(shot.tx,shot.ty):{x:shot.tx,y:shot.ty};
  g.beginPath();g.moveTo(start.x,start.y);g.lineTo(end.x,end.y);g.stroke();
 }
 for(const p of state.shots){
  if(p.side===1&&p.x>=ENEMY_FOG_X&&!enemyBaseVisible())continue;
  g.strokeStyle=p.side===0?'#a7eaff':'#ffbaa4';g.lineWidth=p.blast?4:2.5;
  const src=window.IsoWorld?window.IsoWorld.project(p.x,p.y):p;
  const dest=window.IsoWorld?window.IsoWorld.project(p.x+(p.tx-p.x)*.17,p.y+(p.ty-p.y)*.17):{x:p.x+(p.tx-p.x)*.17,y:p.y+(p.ty-p.y)*.17};
  g.beginPath();g.moveTo(src.x,src.y);g.lineTo(dest.x,dest.y);g.stroke();
  g.fillStyle=p.blast?'#ffcf89':'#fff5c3';g.fillRect(src.x-2,src.y-2,4,4);
 }
 for(const e of state.effects){
  if(e.x>=ENEMY_FOG_X&&!enemyBaseVisible())continue;
  const a=clamp(e.time/.5,0,1);g.globalAlpha=a;
  const pos=window.IsoWorld?window.IsoWorld.project(e.x,e.y):e;
  g.strokeStyle=e.color;g.lineWidth=3;g.beginPath();g.ellipse(pos.x,pos.y,e.size*(1.25-.3*a),e.size*.53*(1.25-.3*a),0,0,7);g.stroke();
 }g.globalAlpha=1;
 for(const o of state.floaters){
  if(o.x>=ENEMY_FOG_X&&!enemyBaseVisible())continue;
  g.fillStyle=o.color;g.globalAlpha=clamp(o.time/.85,0,1);
  g.font='900 13px monospace';g.textAlign='center';const fp=window.IsoWorld?window.IsoWorld.project(o.x,o.y):o;g.fillText(o.t,fp.x,fp.y);
 }g.globalAlpha=1;
 if(!enemyBaseVisible()){
  g.fillStyle='#07121af0';g.fillRect(ENEMY_FOG_X,-120,WORLD_W-ENEMY_FOG_X+180,CH+260);
  g.strokeStyle='#9bb6ba88';g.lineWidth=3;g.beginPath();g.moveTo(ENEMY_FOG_X,0);g.lineTo(ENEMY_FOG_X,CH);g.stroke();
  g.fillStyle='#bdd4d1';g.font='bold 14px monospace';g.textAlign='left';g.fillText('정찰 전 · 적 후방 미확인',ENEMY_FOG_X+24,58);
 }
 g.restore();
 if(state.paused){g.fillStyle='#0c1d27b0';g.fillRect(0,0,CW,CH);
  g.fillStyle='#ffdfac';g.font='900 56px monospace';g.textAlign='center';g.fillText('PAUSED',550,260);}
}
function drawBase(){
 const g=$('baseCanvas').getContext('2d');if(!g)return;
 g.clearRect(0,0,CW,HOME_H);ground(g,CW,HOME_H,true);
 if(window.IsoWorld){
  g.fillStyle='#071215aa';g.beginPath();
  g.moveTo(265,266);g.lineTo(1082,256);g.lineTo(1096,310);g.lineTo(270,330);g.closePath();g.fill();
  g.strokeStyle='#baac8066';g.setLineDash([15,13]);g.lineWidth=2;
  g.beginPath();g.moveTo(266,280);g.lineTo(1068,269);g.stroke();g.setLineDash([]);
 }else{
  g.fillStyle='#20383e77';g.fillRect(0,215,CW,125);
  g.strokeStyle='#eac79a51';g.setLineDash([12,15]);g.lineWidth=3;
  g.beginPath();g.moveTo(220,282);g.lineTo(1060,282);g.stroke();g.setLineDash([]);
 }
 g.fillStyle='#f0dbbc';g.font='900 12px monospace';g.textAlign='left';g.fillText('PROTECTED PRODUCTION ZONE',365,21);
 // 15 protected production structures are displayed as three rows of five.
 for(let i=0;i<SLOTS;i++){
  const role=state.built[i],row=Math.floor(i/COLS),col=i%COLS;
  const x=315+col*48+row*14,y=53+row*39;
  if(window.IsoWorld){window.IsoWorld.factory(g,x,y,state.faction,role,role!==null);continue;}
  g.fillStyle='#0b222bb5';g.fillRect(x-23,y-15,47,28);
  g.strokeStyle=role!==null?FACTIONS[state.faction].color:'#54707c';
  g.lineWidth=1.7;g.strokeRect(x-23,y-15,47,28);
  g.fillStyle='#2d4851';g.fillRect(x-20,y-12,41,23);
  if(role!==null){
   g.fillStyle=FACTIONS[state.faction].color;g.fillRect(x-20,y-11,16,15);
   const art=window.IsoWorld?.portrait(state.faction,role)||window.DesertSprites?.portrait(state.faction,role);
   if(art){g.imageSmoothingEnabled=false;g.drawImage(art,x-11,y-12,25,24);}
   else{g.font='900 19px monospace';g.fillStyle='#fff1cc';g.textAlign='center';g.fillText(ROLE[role].mark,x+7,y+6);}
  }else{g.textAlign='center';g.font='900 14px monospace';g.fillStyle='#506a72';g.fillText('+',x,y+5);}
 }
 // Defensive turret is destructible. Production zone itself stays protected.
 structure(g,138,196,0,false,state.baseHP[0]);
 structure(g,260,270,0,true,state.turretHP[0]);
 g.fillStyle='#fbefdb';g.textAlign='center';g.font='900 13px monospace';g.fillText('CORE',138,108);
 g.font='900 11px monospace';g.fillText('DEFENSE',260,227);
 g.fillStyle='#122631';g.fillRect(91,264,97,10);
 g.fillStyle='#74dbdf';g.fillRect(91,264,97*state.baseHP[0]/MAX_BASE,10);
 g.fillStyle='#11252d';g.fillRect(224,315,72,8);
 g.fillStyle='#c2dbac';g.fillRect(224,315,72*state.turretHP[0]/MAX_TURRET,8);
 const raiders=state.units.filter(u=>u.side===1&&u.x<600);
 const friends=state.units.filter(u=>u.side===0&&u.x<600);
 for(const u of [...friends,...raiders,...state.deadUnits.filter(u=>u.x<600)]){
  const mappedX=clamp(260+(u.x-190)*1.9,220,1064),mappedY=260+(u.y-260)*.18;
  drawUnit(g,{...u,x:mappedX,y:mappedY},.80);
 }
 if(raiders.length){
  g.fillStyle='#7d302ad9';g.fillRect(818,226,248,23);
  g.fillStyle='#ffdbbd';g.font='900 12px monospace';g.textAlign='center';
  g.fillText('⚠ BREACH · '+raiders.length+' HOSTILES',942,242);
 }
 // Turret destruction is shown as damage, production buildings aren't falsely destructible.
 if(window.DesertSprites){
  for(const impact of state.structureFX)if(impact.side===0)
   window.DesertSprites.structureImpact(g,impact.part==='turret'?260:138,impact.part==='turret'?270:196,state.faction,impact.mode,impact.age/impact.duration);
 }
 if(state.turretHP[0]<=0){
  g.fillStyle='#ffba90';g.font='900 17px monospace';g.textAlign='center';g.fillText('DEFENSE DESTROYED',250,198);
 }
}
function drawMinimap(){
 const c=$('battleMinimap');if(!c)return;
 const g=c.getContext('2d');if(!g)return;
 g.clearRect(0,0,1100,82);
 g.fillStyle='#101b23';g.fillRect(0,0,1100,82);
 for(let i=0;i<5;i++){
  const y=LANES[i]/CH*82;
  g.fillStyle=i%2?'#6b635123':'#84977d19';g.fillRect(0,y-5,1100,10);
 }
 for(const u of state.units){
  if(!enemyUnitVisible(u))continue;
  g.fillStyle=u.side===0?'#78dde8':'#ff896b';
  g.fillRect(Math.floor(u.x/WORLD_W*1100),Math.floor(u.y/CH*82),u.role===3?4:3,u.role===3?4:3);
 }
 if(!enemyBaseVisible()){g.fillStyle='#091621e8';g.fillRect(ENEMY_FOG_X/WORLD_W*1100,0,1100*(WORLD_W-ENEMY_FOG_X)/WORLD_W,82);}
 for(const side of [0,1]){
  if(side===1&&!enemyBaseVisible())continue;
  g.fillStyle=side===0?'#72ddea':'#f18c72';
  g.fillRect(side===0?2:1087,30,10,22);
 }
 const left=state.cameraX/WORLD_W*1100;
 g.fillStyle='#fff3bb14';g.fillRect(left,0,CW/WORLD_W*1100,82);
 g.strokeStyle='#fce0a7';g.lineWidth=3;g.strokeRect(left+1,2,CW/WORLD_W*1100-2,78);
}
function drawProductionMinimap(){
 const c=$('productionMinimap'),status=$('productionFrontStatus');
 if(!c||!status||!state)return;
 const g=c.getContext('2d');if(!g)return;
 const w=c.width,h=c.height;
 g.clearRect(0,0,w,h);g.fillStyle='#10212c';g.fillRect(0,0,w,h);
 for(const y of LANES){g.fillStyle='#b2c4b422';g.fillRect(0,y/CH*h-3,w,6);}
 const friendly=state.units.filter(u=>u.side===0&&u.hp>0),enemy=state.units.filter(u=>u.side===1&&u.hp>0);
 let frontline=0;
 for(const u of state.units)if(u.hp>0&&enemyUnitVisible(u)){g.fillStyle=u.side===0?'#74e4e2':'#ff8e7d';g.fillRect(Math.floor(u.x/WORLD_W*w),Math.floor(u.y/CH*h),u.role===3?5:3,3);}
 if(friendly.length&&enemy.length){
  const mine=Math.max(...friendly.map(u=>u.x)),theirs=Math.min(...enemy.map(u=>u.x));
  frontline=(mine+theirs)/2;
 }else if(friendly.length)frontline=Math.max(...friendly.map(u=>u.x));
 else if(enemy.length)frontline=Math.min(...enemy.map(u=>u.x));
 else frontline=WORLD_W/2;
 const ratio=frontline/WORLD_W;
 g.fillStyle='#70d9dd';g.fillRect(0,h-5,Math.max(1,w*ratio),5);
 g.fillStyle='#f08e7f';g.fillRect(w*ratio,h-5,w*(1-ratio),5);
 if(!enemyBaseVisible()){g.fillStyle='#091621ec';g.fillRect(ENEMY_FOG_X/WORLD_W*w,0,w*(WORLD_W-ENEMY_FOG_X)/WORLD_W,h);}
 g.strokeStyle='#f9e8b7';g.lineWidth=2;g.strokeRect(state.cameraX/WORLD_W*w,1,CW/WORLD_W*w,h-7);
 for(const x of [3,w-8]){g.fillStyle=x<10?'#9af0e8':'#ffa28c';g.fillRect(x,h/2-8,5,16);}
 const breached=enemy.filter(u=>u.x<550).length,press=friendly.filter(u=>u.x>WORLD_W-550).length;
 let label=breached?'위험 · 적 '+breached+'기 기지 침공':ratio<.42?'열세 · 아군 방면으로 전선 후퇴':ratio>.58?'우세 · 적 진영 압박':press?'우세 · 적 본진 공격 중':'교착 · 중앙 전선 대치';
 if(state.turretHP[0]<=0)label='위험 · 아군 포탑 파괴 / '+label;
 status.textContent=label;
 status.dataset.tendency=breached||ratio<.42?'danger':ratio>.58?'advantage':'even';
}
function frame(now){
 const delta=Math.min((now-lastFrame)/1000||0,.045);lastFrame=now;
 if(state&&activeView!=='multiplayer'){tick(delta);drawBattle();drawBase();drawMinimap();drawProductionMinimap();}
 requestAnimationFrame(frame);
}
function inspectBattle(event){
 const c=$('battleCanvas'),bounds=c.getBoundingClientRect();
 const sx=(event.clientX-bounds.left)/bounds.width*CW+state.cameraX,sy=(event.clientY-bounds.top)/bounds.height*CH;
 const world=window.IsoWorld?window.IsoWorld.unproject(sx,sy):{x:sx,y:sy},x=world.x,y=world.y;
 let picked=null,best=60;
 for(const u of state.units){const d=Math.hypot(u.x-x,u.y-y);if(d<best){best=d;picked=u;}}
 if(!picked)return;
 const def=getDef(picked.role,picked.faction);
 $('inspect').innerHTML='<b>'+FACTIONS[picked.faction].name+' · '+def.unitName+' '+def.mark+'</b> | HP '+
 Math.ceil(picked.hp)+' / '+Math.ceil(picked.maxHP)+' · '+(picked.side===0?'아군':'적군')+
 '<br><span class="matchups">'+roleMatchupHtml(picked.role,picked.faction)+'</span>';
}
function wire(){
 document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>changeView(btn.dataset.view)));
 $('factionCards').addEventListener('click',e=>{
  const btn=e.target.closest('[data-faction]');if(!btn)return;
  selectedFaction=Number(btn.dataset.faction);
  $('factionCards').querySelectorAll('[data-faction]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.faction)===selectedFaction));
  chirp(540,.07);
 });
 $('startButton').addEventListener('click',start);
 $('restartButton').addEventListener('click',()=>{initFactions();reset();if(window.DesertLobby){$('startOverlay').classList.add('hidden');window.DesertLobby.show();}});
 $('unitCards').addEventListener('click',e=>{const b=e.target.closest('[data-role]');if(b)selectRole(Number(b.dataset.role));});
 $('buildGrid').addEventListener('click',e=>{const b=e.target.closest('[data-cell]');if(b)place(Number(b.dataset.cell));});
 $('buildGrid').addEventListener('contextmenu',e=>{const b=e.target.closest('[data-cell]');if(!b)return;e.preventDefault();
  const previous=demolition;demolition=true;place(Number(b.dataset.cell));demolition=previous;updateUI(true);
 });
 $('demolishButton').addEventListener('click',()=>{
  demolition=!demolition;selectedRole=null;updateUI(true);setMessage(demolition?'철거할 건물을 선택하세요.':'철거 모드 해제');
 });
 $('clearButton').addEventListener('click',()=>{selectedRole=null;demolition=false;updateUI(true);});
 $('pauseButton').addEventListener('click',()=>{
  if(!state.live||state.ended)return;state.paused=!state.paused;
  $('pauseButton').textContent=state.paused?'▶ 계속하기':'Ⅱ 일시정지';updateUI(true);
 });
 $('speedButton').addEventListener('click',()=>{
  if(!state.live||state.ended)return;state.rate=state.rate===1?2:1;
  $('speedButton').textContent='▶ '+state.rate+'×';
 });
 $('nukeButton').addEventListener('click',emergency);
 $('barrageButton').addEventListener('click',barrage);
 $('econButton').addEventListener('click',()=>upgrade('econ'));
 $('weaponButton').addEventListener('click',()=>upgrade('weapon'));
 $('armorButton').addEventListener('click',()=>upgrade('armor'));
 $('repairButton').addEventListener('click',()=>upgrade('repair'));
 $('battleCanvas').addEventListener('click',inspectBattle);
 const pan=direction=>{state.followFront=false;state.cameraX=clamp(state.cameraX+direction*CW*.65,0,WORLD_W-CW);updateUI(false);};
 $('panLeft').addEventListener('click',()=>pan(-1));
 $('panRight').addEventListener('click',()=>pan(1));
 $('followFront').addEventListener('click',()=>{state.followFront=true;updateUI(false);});
 $('productionMinimap').addEventListener('click',e=>{
  const rect=e.currentTarget.getBoundingClientRect();
  state.cameraX=clamp((e.clientX-rect.left)/rect.width*WORLD_W-CW/2,0,WORLD_W-CW);
  state.followFront=false;changeView('battle');updateUI(false);
 });
 $('battleMinimap').addEventListener('click',e=>{
  const rect=e.currentTarget.getBoundingClientRect();
  state.cameraX=clamp(((e.clientX-rect.left)/rect.width)*WORLD_W-CW/2,0,WORLD_W-CW);
  state.followFront=false;updateUI(false);
 });
 let dragX=null;
 $('battleCanvas').addEventListener('pointerdown',e=>{dragX=e.clientX;});
 $('battleCanvas').addEventListener('pointerup',e=>{
  if(dragX===null)return;
  if(Math.abs(e.clientX-dragX)>18){
   state.cameraX=clamp(state.cameraX+(dragX-e.clientX)/e.currentTarget.getBoundingClientRect().width*CW,0,WORLD_W-CW);
   state.followFront=false;
  }
  dragX=null;
 });
 $('helpButton').addEventListener('click',()=>$('helpDialog').showModal());
 $('helpClose').addEventListener('click',()=>$('helpDialog').close());
 document.addEventListener('keydown',e=>{
  if($('helpDialog').open)return;
  if(e.altKey&&['1','2','3'].includes(e.key)){e.preventDefault();changeView(['base','battle','special'][Number(e.key)-1]);return;}
  if(e.target&&['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  if(e.key>='1'&&e.key<='8')selectRole(Number(e.key)-1);
  else if(e.key==='Escape'){selectedRole=null;demolition=false;updateUI(true);}
  else if(e.code==='Space'){e.preventDefault();if(state.live&&!state.ended){state.paused=!state.paused;
   $('pauseButton').textContent=state.paused?'▶ 계속하기':'Ⅱ 일시정지';updateUI(true);}}
 });
}
window.DesertRoster=Object.freeze({FACTIONS,ROLE,getDef,cost:(role)=>ROLE[role]?.cost??Infinity});
initFactions();wire();reset();
if(typeof window.addEventListener==='function')window.addEventListener('marine-art-ready',()=>updateUI(true));
if(typeof window.addEventListener==='function')window.addEventListener('isometric-art-ready',()=>updateUI(true));
if(typeof window.addEventListener==='function')window.addEventListener('maiden-art-ready',()=>{window.IsoWorld?.invalidateMaiden?.();initFactions();updateUI(true);});
requestAnimationFrame(frame);
})();