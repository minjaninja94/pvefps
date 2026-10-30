/* EXPERIMENTAL: Forty legendary Prism powers per faction (400 cards).
 * To remove the experiment later, set window.DesertPrismExperimentalEnabled=false
 * before this file loads. Original 300 cards and balance are then untouched.
 * All combat effects execute in the existing simulation/authoritative P2P host.
 */
(function(global){
'use strict';
const sp=(role,count=1,every=2)=>({kind:'prism_spawn',role,count,every});
const cash=(amount,every=1)=>({kind:'prism_cash',amount,every});
const heal=(pct,every=2)=>({kind:'prism_heal',pct,every});
const repair=(pct,every=2)=>({kind:'prism_repair',pct,every});
const brood=(extra,alive,proc=0)=>({kind:'prism_brood',extra,alive,proc});
const recruit=(extra,proc=0)=>({kind:'prism_recruit',extra,proc});
const burst=(role,mult=1.5,every=4)=>({kind:'prism_burst',role,mult,every});
const chain=(role,ratio=.35,radius=135,every=5,targets=1)=>({kind:'prism_chain',role,ratio,radius,every,targets});
const leech=(role,pct=.2,every=3)=>({kind:'prism_leech',role,pct,every});
const mark=(role,duration=2,every=4)=>({kind:'prism_mark',role,duration,every});
const execute=(role,threshold=.3,bonus=.6)=>({kind:'prism_execute',role,threshold,bonus});
const frenzy=(role,mult=1.4,seconds=10)=>({kind:'prism_frenzy',role,mult,seconds});
const revenge=(role,count=1,every=3)=>({kind:'prism_revenge',role,count,every});
const reflect=(role,ratio=.32,every=4)=>({kind:'prism_reflect',role,ratio,every});
const field=(role,pct=.015,every=2)=>({kind:'prism_field',role,pct,every});
const laststand=(pct=.5,repair=.08,role=3,count=4)=>({kind:'prism_laststand',pct,repair,role,count});
const reboot=(role=3,pct=.38,cooldown=30)=>({kind:'prism_reboot',role,pct,cooldown});
const echo=(role=7,pct=.5,count=2,radius=180,cooldown=5)=>({kind:'prism_echo',role,pct,count,radius,cooldown});
const factionCards=[
 // 0 철갑연합: immovable line, anti-siege retaliation, fortress logistics
 [
 ['이동 요새화','매 2웨이브 본진 내구도 4% 복구. 본진 체력 50% 이하로 웨이브를 시작하면 장갑병 4기 긴급 출격 + 기지 8% 복구(경기당 1회).',repair(.04,2),laststand(.5,.08,3,4)],
 ['철갑 예비사단','매 3웨이브마다 장갑병 2기가 추가 출격합니다. 생산 시설과 별개로 추가 출격합니다.',sp(3,2,3)],
 ['철의 역습','장갑병이 4번째 피격될 때마다 받은 피해의 45%를 공격자에게 반사합니다.',reflect(3,.45,4)],
 ['철갑 전선 고정','장갑병이 3번째 피격될 때 피해 55%를 반사하고 포격병의 4번째 명중은 주변 2기에 연쇄 폭발합니다.',reflect(3,.55,3),chain(5,.48,160,4,2)],
 ['포성 공명','포격병의 매 4번째 공격이 주변 적 한 명에게 50% 연쇄 피해를 줍니다.',chain(5,.5,145,4)],
 ['강철 심장','매 2웨이브마다 생존 아군 병력이 최대 체력의 9%를 회복합니다.',heal(.09,2)],
 ['최후의 기갑진','장갑병이 적 체력 30% 미만을 공격하면 피해량이 85% 추가됩니다.',execute(3,.30,.85)],
 ['전선 보급열차','매 웨이브 추가 보급 70 CR을 지급합니다.',cash(70)],
 ['벙커 브레이커','대장갑병의 매 4번째 타격이 2.1배 관통 피해를 입힙니다.',burst(2,2.1,4)],
 ['초월 철갑 열차','매 2웨이브 장갑병 4기가 돌진 출격하고 4웨이브마다 기지 내구도 7% 복구. 장갑병 처치 2회마다 돌격병 증원.',sp(3,4,2),repair(.07,4),revenge(0,1,2)]
 ],
 // 1 심연군체: reproduction, plague, brood over-limit
 [
 ['군체 해방령','웨이브당 공생충 상한 +8, 동시 생존 상한 +10, 부화 확률 +12%p.',brood(8,10,.12)],
 ['혈육의 조수','매 2웨이브마다 돌격병 3기가 추가 부화합니다.',sp(0,3,2)],
 ['포식의 전염','돌격병의 4번째 타격은 목표에게 2초 먹물 약화 상태를 남깁니다.',mark(0,2,4)],
 ['기생 재생','매 2웨이브마다 생존 군체 병력의 체력 12%를 복구합니다.',heal(.12,2)],
 ['산란 폭주','공생충 상한 +5, 동시 생존 상한 +6, 부화 확률 +18%p.',brood(5,6,.18)],
 ['식육의 바다','적을 3기 처치하면 공생 돌격병 1기가 튀어나오고, 돌격병의 3번째 타격이 체력을 30% 흡수합니다.',revenge(0,1,3),leech(0,.3,3)],
 ['영양분 회수','돌격병이 3번째 타격을 할 때 피해의 35%를 흡수해 자가 치유합니다.',leech(0,.35,3)],
 ['변이 역류','적 처치 4회마다 돌격병 공생체 1기가 무료 출격합니다. 능력 자체의 발동 횟수만 제한됩니다.',revenge(0,1,4)],
 ['폭식의 군집','돌격병의 5번째 공격이 근처 적에게 60% 연쇄 피해를 입힙니다.',chain(0,.6,100,5)],
 ['우주를 먹는 산란장','군체 부화 상한 대폭 해제(+15/+24), 부화 확률 +25%p. 매 2웨이브 돌격병 5기 추가 탄생.',brood(15,24,.25),sp(0,5,2)]
 ],
 // 2 성운결사: ward, spectral echoes, punishment for striking
 [
 ['별빛 반격','돌격병은 3번째 피격마다 공격자에게 피해 65%를 반사합니다.',reflect(0,.65,3)],
 ['성운 파동','포격병의 5번째 타격이 165 범위의 적 1명에게 75% 연쇄 피해를 입힙니다.',chain(5,.75,165,5)],
 ['결계 부흥','매 2웨이브마다 아군 핵심 기지 내구도 5%를 복구합니다.',repair(.05,2)],
 ['유성 강하','매 3웨이브 대장갑병 2기가 지원 낙하합니다.',sp(2,2,3)],
 ['하늘의 기도','매 2웨이브 살아있는 병력 전체 체력 10%를 회복합니다.',heal(.1,2)],
 ['성좌의 명령','매 웨이브 보급 65 CR을 추가로 받습니다.',cash(65)],
 ['심판의 별','대장갑병이 적 체력 35% 아래의 적에게 추가 75% 피해를 줍니다.',execute(2,.35,.75)],
 ['차원 증폭','웨이브 시작 후 12초 동안 포격병 공격력이 1.65배가 됩니다.',frenzy(5,1.65,12)],
 ['성운 수호진','장갑병의 매 4번째 피격이 받은 피해의 55%를 반사합니다.',reflect(3,.55,4)],
 ['차원 폭주 성운낙하','포격병 매 3타격이 적 4명에게 95% 연쇄 피해. 매 3웨이브 대장갑병 3기 낙하.',chain(5,.95,230,3,4),sp(2,3,3)]
 ],
 // 3 해병성채: logistics, looting, conscription, shock infantry
 [
 ['무제한 자진입대','웨이브당 자진입대 제한 +3명, 적 처치 후 징집 확률 +15%p.',recruit(3,.15)],
 ['긴빠이 보급망','매 웨이브 훔쳐온 전리품 85 CR을 추가 지급합니다.',cash(85)],
 ['오도봉고 기갑행진','매 3웨이브 돌격 기수 2기가 추가 출격합니다.',sp(6,2,3)],
 ['황룡 무한지원','매 2웨이브 추가 지원병 2기가 출격합니다.',sp(7,2,2)],
 ['악기바리 역공','돌격병은 매 4번째 피격마다 피해의 60%를 반사합니다.',reflect(0,.6,4)],
 ['해병 강제 징집령','처치 후 징집 확률 +10%p, 징집 한도 +2. 돌격병이 3기를 처치하면 추가 돌격병이 출격합니다.',recruit(2,.1),revenge(0,1,3)],
 ['싸제 포격','포격병의 4번째 타격이 인접한 적 1명에게 65% 연쇄 폭발을 발생시킵니다.',chain(5,.65,135,4)],
 ['부활한 전우','적 처치 4회마다 아군 돌격병 1기를 지원 생산합니다.',revenge(0,1,4)],
 ['해병수육 대잔치','매 2웨이브 생존 해병 전체 체력이 11% 회복됩니다.',heal(.11,2)],
 ['초월 징집 광기','자진입대 최대 +6명, 처치 후 징집 확률 +25%p. 매 2웨이브 돌격병 4명 지원.',recruit(6,.25),sp(0,4,2)]
 ],
 // 4 월영 수인족: predation and high mobility
 [
 ['짐승의 혈욕','돌격병 3번째 타격마다 피해량 40%를 회복합니다.',leech(0,.40,3)],
 ['포식자 각성','돌격 기수는 체력 35% 이하인 적을 90% 추가 피해로 마무리합니다.',execute(6,.35,.9)],
 ['무리의 포효','웨이브 시작 후 13초 동안 돌격 기수의 공격력이 1.7배입니다.',frenzy(6,1.7,13)],
 ['야생의 번식','매 3웨이브 돌격병 3기 추가 출격합니다.',sp(0,3,3)],
 ['피 묻은 발톱','돌격 기수의 4번째 공격이 인접 적에게 55% 피해를 연쇄합니다.',chain(6,.55,100,4)],
 ['달빛 회복','매 2웨이브 생존 수인 병력이 체력 11%를 회복합니다.',heal(.11,2)],
 ['송곳니 추격','돌격병의 5번째 공격이 적에게 3초 감속을 남깁니다.',mark(0,3,5)],
 ['포식 본능','돌격병이 체력 30% 아래인 적에게 추가 80% 피해를 줍니다.',execute(0,.3,.8)],
 ['짐승왕의 대사냥','돌격 기수 공격 시 빈사 적에게 80% 추가 피해를 주고 3번째 적중마다 체력 40%를 흡수합니다.',execute(6,.34,.8),leech(6,.4,3)],
 ['짐승왕의 월식','웨이브 시작 15초간 돌격 기수 공격력 2.2배. 매 2웨이브 돌격 기수 4기 추가 돌진.',frenzy(6,2.2,15),sp(6,4,2)]
 ],
 // 5 은월 엘프족: focus fire, soft control, ranged punishment
 [
 ['달빛 연쇄화살','사격병의 4번째 명중이 주변 적 최대 3명에게 각각 60% 연쇄 피해를 줍니다.',chain(1,.6,175,4,3)],
 ['은월 저격수','대장갑병이 체력 40% 미만의 적을 추가 75% 피해로 처형합니다.',execute(2,.4,.75)],
 ['시공의 화살','사격병의 4번째 명중이 적을 3초 감속시킵니다.',mark(1,3,4)],
 ['달의 집중','웨이브 시작 후 12초 동안 대장갑병 공격력 1.7배.',frenzy(2,1.7,12)],
 ['별빛 사수','매 3웨이브 사격병 3기 추가 소환합니다.',sp(1,3,3)],
 ['유성분열탄','포격병의 5번째 사격이 주변 적에게 80% 연쇄 피해.',chain(5,.8,185,5)],
 ['월광의 맹세','매 2웨이브 전체 엘프 병력이 8% 회복됩니다.',heal(.08,2)],
 ['끝없는 화살통','사격병 3번째 명중마다 월광 화살이 적 3명에게 분열해 55% 피해를 주고, 대장갑 궁수의 명중탄도 인접 적에게 튕깁니다.',{kind:'prism_anomaly',role:1,mode:'pierce',every:3,ratio:.55,radius:230},chain(2,.4,165,4,2)],
 ['정령의 반격','대공병이 매 4번째 피격될 때 공격자에게 받은 피해의 55%를 반사합니다.',reflect(4,.55,4)],
 ['달빛 유도탄 폭우','사격병 매 3번째 공격이 반경 240의 적 최대 4명에게 90% 연쇄 피해. 3웨이브마다 사격병 4명 지원.',chain(1,.9,240,3,4),sp(1,4,3)]
 ],
 // 6 월영 수인 / beastfolk riders: pack dynamics
 [
 ['늑대 무리 행진','매 2웨이브 돌격 기수 2기가 출격합니다.',sp(6,2,2)],
 ['야수 합창','돌격병은 4번째 타격에 주변 적 1명에게 55% 연쇄 피해를 가합니다.',chain(0,.55,110,4)],
 ['붉은달 광분','시작 12초 동안 돌격병 공격력 1.75배.',frenzy(0,1.75,12)],
 ['무리의 치유','매 2웨이브 생존 병력 체력을 10% 복구합니다.',heal(.10,2)],
 ['질풍 추격','돌격 기수의 4번째 공격은 2초 감속을 부여합니다.',mark(6,2,4)],
 ['강철 송곳니','돌격병 체력 흡수: 3번째 공격마다 피해의 38%를 회복합니다.',leech(0,.38,3)],
 ['달의 군단','돌격 기수의 적 3기 처치마다 기수 1기가 무리에서 뛰어들고, 체력 35% 미만의 적을 75% 더 세게 공격합니다.',revenge(6,1,3),execute(6,.35,.75)],
 ['두 번째 사냥','적 처치 3회마다 돌격 기수 1기가 지원 출격합니다.',revenge(6,1,3)],
 ['발톱의 응징','돌격병이 적 체력 35% 이하일 때 추가 피해 75%.',execute(0,.35,.75)],
 ['피의 초승달','적 처치 2회마다 돌격 기수 2기 출격. 근접병 3번째 공격마다 적에게 대량 흡혈.',revenge(6,2,2),leech(0,.55,3)]
 ],
 // 7 기계연방: drones and overclock, automated retaliation
 [
 ['나노 재생막','2웨이브마다 기계 병력 전체 체력 12% 복구.',heal(.12,2)],
 ['드론 편대','3웨이브마다 특수 비행기 2기가 지원 출격.',sp(6,2,3)],
 ['재조립 병기','적 처치 4회마다 돌격병 로봇 1기 제조. 장갑병은 치명적인 피해를 받아도 체력 38%로 재부팅(개체별 35초 재사용).',revenge(0,1,4),reboot(3,.38,35)],
 ['자동 반격 포탑','장갑병의 3번째 피격이 공격자에게 피해 60% 반사.',reflect(3,.6,3)],
 ['대공 방화벽','대공병의 4번째 공격이 인접 적에게 65% 연쇄 피해.',chain(4,.65,160,4)],
 ['CPU 오버클럭','웨이브 시작 13초 동안 사격병 공격력 1.7배.',frenzy(1,1.7,13)],
 ['생산 프로토콜 해제','장갑 로봇이 치명상을 입으면 30초마다 체력 35%로 재부팅하며, 대공 드론의 네 번째 공격이 주변 적 2명에게 전류를 전이합니다.',reboot(3,.35,30),chain(4,.52,160,4,2)],
 ['전자 교란막','사격병 4번째 공격 적에게 3초 감속.',mark(1,3,4)],
 ['재생 코어','매 2웨이브 아군 핵심 기지 내구도 4.5% 복구.',repair(.045,2)],
 ['무한 복제 공장','적 처치 2회마다 로봇 돌격병 2기 복제. 장갑병은 치명타 후 체력 45%로 20초마다 재부팅.',revenge(0,2,2),reboot(3,.45,20)]
 ],
 // 8 심해문어족: ink, tentacles, slow and infection
 [
 ['심해 먹물 장막','사격병 3번째 명중이 대상에게 4초 이동 감속.',mark(1,4,3)],
 ['촉수 파도','포격병 4번째 타격이 주변 적에게 65% 연쇄 피해.',chain(5,.65,175,4)],
 ['먹물 확산','대공병 4번째 공격 시 4초 감속.',mark(4,4,4)],
 ['바다의 재생','2웨이브마다 살아있는 병력이 체력 12% 회복.',heal(.12,2)],
 ['먹이 고정','대장갑병이 체력 40% 아래 적에게 피해 70% 추가.',execute(2,.4,.7)],
 ['심연 보급선','매 웨이브 보급 70 CR 확보.',cash(70)],
 ['촉수 증식','매 2웨이브 돌격병 3기 추가 출격.',sp(0,3,2)],
 ['암흑 포식','돌격병이 3번째 타격마다 피해 35% 흡혈.',leech(0,.35,3)],
 ['무저갱 영역','촉수 사격의 세 번째 명중이 4초 먹물로 감속시키고, 포격병의 네 번째 공격이 주변 3기에게 먹물 폭발을 퍼뜨립니다.',mark(1,4,3),chain(5,.5,175,4,3)],
 ['촉수 대폭발','포격병 3번째 타격이 반경 260의 적 5명에게 100% 연쇄 피해. 2웨이브마다 포격병 3기 지원.',chain(5,1,260,3,5),sp(5,3,2)]
 ],
 // 9 페어리: bloom-healing, fairy chain, empathy
 [
 ['꽃잎 연쇄','매 2웨이브 전군 체력 13% 회복. 지원병의 치유는 주변 부상병 2명에게 회복량 50%씩 추가로 확산(5초 간격).',heal(.13,2),echo(7,.5,2,180,5)],
 ['분홍 꽃가루 폭풍','사격병의 4번째 명중이 주변 적에게 65% 연쇄 피해.',chain(1,.65,145,4)],
 ['생명나무 축복','웨이브당 2회마다 생존 병력 체력 15% 회복.',heal(.15,2)],
 ['요정 여왕의 사절','2웨이브마다 지원병 2기가 추가 출격.',sp(7,2,2)],
 ['봄바람 지원군','3웨이브마다 사격병 3기가 지원 출격.',sp(1,3,3)],
 ['꽃잎 방패','돌격병의 4번째 피격이 공격자에게 피해 50%를 반사.',reflect(0,.5,4)],
 ['요정계 확장','치유사가 아군을 치유하면 근처 부상병 3명에게 치유의 55%가 꽃잎처럼 전파되고, 돌격 요정은 3회 피격마다 피해를 되돌립니다.',echo(7,.55,3,190,5),reflect(0,.4,3)],
 ['달콤한 덫','대공병 4번째 타격으로 적 3초 감속.',mark(4,3,4)],
 ['벚꽃의 심판','대장갑병이 체력 35% 아래의 적에게 80% 추가 피해.',execute(2,.35,.8)],
 ['요정계 무한 생명 폭발','2웨이브마다 전 병력 20% 치유. 지원병 치유는 부상 아군 4명에 85% 확산. 단, 전쟁 장기화 화력 압박에는 취약합니다.',heal(.20,2),echo(7,.85,4,280,4)]
 ]
];

const FACTION_NAMES=['철갑연합','심연군체','성운결사','해병성채','월영 수인족','은월 엘프족','야월 퍼리족','크롬 로보족','옥토퍼 군체','농농 페어리족'];
const THEMES=[
 ['무쇠','기갑','초중량','강철','불도저','철벽','공성','방패','장갑','열차'],
 ['포식','점액','변종','촉수','산란','부화','세포','기생','육식','군집'],
 ['성운','유성','별가루','천체','차원','무중력','우주','광륜','천궁','초신성'],
 ['오도','황룡','긴빠이','해병','기열','기합','악기바리','자진입대','돌격','보급'],
 ['핏빛','야성','송곳니','사냥','광분','초원','늑대','호랑이','질주','월식'],
 ['달빛','은화살','저격','정령','사냥꾼','은월','숲','별화살','장궁','표적'],
 ['늑대왕','달의무리','붉은달','발톱','야수','질풍','맹수','그림자','포효','초승달'],
 ['나노','CPU','드론','회로','불꽃','재부팅','증식','메카','과부하','광자'],
 ['먹물','심해','문어','촉수','파도','수압','심연','소용돌이','해류','독먹물'],
 ['꽃비','요정','반짝','봄바람','생명나무','꽃가루','꿀단지','벚꽃','치유','마법']
];
const EVENTS=[
 '차원 용병 계약','적군을 훔치는 초대장','다른 세계 파병','포획된 군대','평행 우주 징집','몰래 온 동맹',
 '탄환 분열','연쇄 감염','흡혈 로또','뒤집어진 처형','눈보라 폭격','광기의 슬롯머신',
 '불사 보험','피격 반송','역습 도박','보복 루프','생환 코어','유언 주문',
 '원군 차원문','교환된 전열','적성 무기 배송','소환 폭주','이계 투하','차원 전이',
 '최후의 이중계약','왕의 딸깍','우주 대혼란','외계인 난입','방어선 반전','초월 대환장'
];
const SIGNATURES=[[3,5,2,0,6,1,4,7],[0,6,3,2,1,5,7,4],[5,2,4,1,3,0,6,7],
 [0,6,7,5,3,2,1,4],[6,0,3,1,2,4,5,7],[1,2,5,4,7,3,0,6],
 [6,0,1,3,4,2,5,7],[3,4,1,6,5,2,0,7],[5,1,0,2,6,4,3,7],[7,1,4,2,0,5,3,6]];
// Thirty additional, individually named mechanics per faction: 300 more cards.
// Unlike periodic income/regen upgrades these trigger on real hits, kills or foreign-faction deployments.
const extraCards=FACTION_NAMES.flatMap((factionName,faction)=>EVENTS.map((label,index)=>{
 const role=SIGNATURES[faction][index%8],donor=(faction+1+index%9)%10,allyRole=(index+role+2)%8;
 const every=2+index%3, effects=[];
 let description='';
 if(index<6){
  effects.push({kind:'prism_foreign_kill',role,every,count:1+(index===5?1:0),faction:donor,allyRole});
  effects.push(chain(role,.30+index*.04,125+index*12,4+index%2,1+(index%2)));
  description='해당 병종이 적 '+every+'기를 직접 처치할 때 '+FACTION_NAMES[donor]+' 소속 지원군이 전장에 합류합니다. 공격은 주변 적에게 연쇄됩니다.';
 }else if(index<12){
  const mode=['split','shock','vampire','execute','storm','roulette'][index-6];
  effects.push({kind:'prism_anomaly',role,mode,every,ratio:.35+(index-6)*.07,radius:130+(index-6)*25});
  description='해당 병종이 '+every+'번째 명중할 때 '+({split:'투사체 파편이 다수 적에게 튀는',shock:'적을 교란하고 연타하는',vampire:'체력을 빨아들이고 주변까지 찌르는',execute:'빈사 적을 마무리하는',storm:'광역 폭풍과 감속을 일으키는',roulette:'추가 타격·흡혈·연쇄 중 하나가 순환 발동하는'}[mode])+' 기묘한 공격을 발동합니다.';
 }else if(index<18){
  const modes=[reboot(role,.26+index*.014,22),reflect(role,.34,3),leech(role,.28,3),
   execute(role,.38,.62),reboot(role,.42,34),reflect(role,.48,4)];
  effects.push(modes[index-12],{kind:'prism_foreign_kill',role,every:4,count:1,faction:donor,allyRole});
  description='해당 병종은 '+['치명타를 버티고 재가동','피격을 적에게 되돌림','공격 적중 시 피흡','부상한 적을 처형','전투 중 재기동','기습 반격'][index-12]+'합니다. 적 4기 처치마다 '+FACTION_NAMES[donor]+' 지원군을 호출합니다.';
 }else if(index<24){
  effects.push({kind:'prism_foreign_wave',role:allyRole,count:1+(index%3===0?1:0),every:3+index%3,faction:donor});
  effects.push({kind:'prism_anomaly',role,mode:['storm','split','execute','shock','roulette','vampire'][index-18],every:3+index%2,ratio:.46,radius:185});
  description=FACTION_NAMES[donor]+' 타종족 파병을 주기적으로 받고, 직접 명중할 때마다 '+['폭풍','파편','처형','교란','랜덤 폭발','흡혈'][index-18]+' 기믹이 추가 발동합니다.';
 }else{
  effects.push({kind:'prism_foreign_kill',role,every:3,count:2,faction:donor,allyRole});
  effects.push({kind:'prism_anomaly',role,mode:['roulette','storm','split','shock','execute','vampire'][index-24],every:3,ratio:.55,radius:195});
  effects.push(index%2?reboot(role,.3,40):chain(role,.43,160,4,2));
  description='3회 명중마다 비정상적인 공격이 발생하고, 적 3기 처치마다 '+FACTION_NAMES[donor]+' 지원군 2기가 난입합니다. '+(index%2?'치명상 재기동':'연쇄 폭발')+'도 결합됩니다.';
 }
 return Object.freeze({id:'exp-prism-'+faction+'-'+(index+10),scope:'faction-'+faction,tier:'prismatic',
  name:factionName+' '+THEMES[faction][index%10]+' · '+label,description,experimental:true,effects});
}));

const cards=factionCards.flatMap((items,faction)=>items.map(([name,description,...effects],index)=>Object.freeze({
 id:'exp-prism-'+faction+'-'+index,scope:'faction-'+faction,tier:'prismatic',
 name:name+' · 초월 프리즘',description,experimental:true,effects
}))).concat(extraCards);
const cardById=new Map(cards.map(c=>[c.id,c]));
const enabled=()=>global.DesertPrismExperimentalEnabled!==false;
function findEffects(selected=[],kind=null){
 if(!enabled()||!selected?.length)return [];
 const out=[];
 for(const id of selected){const card=cardById.get(id);if(card)for(const effect of card.effects)if(!kind||effect.kind===kind)out.push(effect);}
 return out;
}
function broodLimits(selected,baseCap,baseAlive,baseChance){
 const x=findEffects(selected,'prism_brood');
 return {cap:baseCap+x.reduce((n,v)=>n+v.extra,0),alive:baseAlive+x.reduce((n,v)=>n+v.alive,0),
  chance:Math.min(.65,baseChance+x.reduce((n,v)=>n+v.proc,0))};
}
function recruitLimits(selected,baseCap,baseChance){
 const x=findEffects(selected,'prism_recruit');
 return {cap:baseCap+x.reduce((n,v)=>n+v.extra,0),chance:Math.min(.65,baseChance+x.reduce((n,v)=>n+v.proc,0))};
}
function augmentStats(base,selected,role,elapsed=0,waveAt=-Infinity){
 let out=base;
 for(const e of findEffects(selected,'prism_frenzy'))if(e.role===role&&elapsed-waveAt>=0&&elapsed-waveAt<e.seconds){
  if(out===base)out={...base};
  out.damage=(out.damage||0)*e.mult;
 }
 return out;
}
function waveEffects(selected,wave){
 const result={cash:0,heals:[],repairs:[],spawns:[],laststands:findEffects(selected,'prism_laststand')};
 for(const e of findEffects(selected)){
  if(!e.every||wave%e.every!==0)continue;
  if(e.kind==='prism_cash')result.cash+=e.amount;
  if(e.kind==='prism_heal')result.heals.push(e.pct);
  if(e.kind==='prism_repair')result.repairs.push(e.pct);
  if(e.kind==='prism_spawn')result.spawns.push({role:e.role,count:e.count});
  if(e.kind==='prism_foreign_wave')result.spawns.push({role:e.role,count:e.count,faction:e.faction});
 }
 return result;
}
function trigger(selected,kind,role,unit,now){
 const matches=findEffects(selected,kind).filter(e=>e.role===role);
 const fired=[];for(const [i,e] of matches.entries()){
  const key='prism-'+kind+'-'+role+'-'+i;
  unit._prismCounter=unit._prismCounter||{};
  const count=(unit._prismCounter[key]||0)+1;unit._prismCounter[key]=count;
  if(count%e.every===0)fired.push(e);
 }
 return fired;
}
function hitEffects(selected,attacker,victim,damage,now,nearby=[]){
 if(!attacker||!victim||!Number.isFinite(damage)||damage<=0)return {bonus:0,heal:0,secondary:[],marked:false};
 const role=attacker.role;
 const result={bonus:0,heal:0,secondary:[],marked:false};
 for(const e of trigger(selected,'prism_burst',role,attacker,now))result.bonus+=damage*(e.mult-1);
 for(const e of findEffects(selected,'prism_execute'))if(e.role===role&&victim.hp<=victim.maxHP*e.threshold)result.bonus+=damage*e.bonus;
 for(const e of trigger(selected,'prism_chain',role,attacker,now)){
  const targets=nearby.filter(x=>x!==victim&&x.hp>0&&Math.hypot(x.x-victim.x,x.y-victim.y)<=e.radius)
   .slice(0,Math.max(1,Math.min(3,e.targets||1)));
  for(const target of targets)result.secondary.push({target,damage:Math.min(300,damage*e.ratio)});
 }
 for(const e of trigger(selected,'prism_leech',role,attacker,now))result.heal+=Math.min(120,damage*e.pct);
 for(const e of trigger(selected,'prism_mark',role,attacker,now))result.marked=Math.max(result.marked||0,e.duration);
 for(const e of trigger(selected,'prism_anomaly',role,attacker,now)){
  const nearbyTargets=nearby.filter(x=>x.hp>0&&Math.hypot(x.x-victim.x,x.y-victim.y)<=e.radius).slice(0,4);
  const splash=(count,ratio)=>{for(const x of nearbyTargets.slice(0,count))result.secondary.push({target:x,damage:Math.min(260,damage*ratio)});};
  if(e.mode==='split')splash(3,e.ratio);
  else if(e.mode==='shock'){result.bonus+=damage*e.ratio;result.marked=Math.max(result.marked,2);}
  else if(e.mode==='vampire'){result.heal+=Math.min(125,damage*(e.ratio+.1));splash(1,.25);}
  else if(e.mode==='execute'){if(victim.hp/victim.maxHP<=.45)result.bonus+=damage*(.8+e.ratio);}
  else if(e.mode==='storm'){splash(4,e.ratio);result.marked=Math.max(result.marked,1.5);}
  else if(e.mode==='roulette'){
   attacker.prismRoulette=(attacker.prismRoulette||0)+1;
   if(attacker.prismRoulette%3===0)result.heal+=Math.min(120,damage*.55);
   else if(attacker.prismRoulette%3===1)splash(2,.55);
   else result.bonus+=damage*.9;
  }
 }
 return result;
}
function survival(selected,unit,now,afterHp){
 if(!unit||afterHp>0||unit.isHatchling||unit.guardian)return 0;
 for(const effect of findEffects(selected,'prism_reboot'))if(effect.role===unit.role
   &&(!Number.isFinite(unit.prismRebootAt)||now-unit.prismRebootAt>=effect.cooldown)){
  unit.prismRebootAt=now;return Math.max(1,unit.maxHP*effect.pct);
 }
 return 0;
}
function healEcho(selected,healer,target,recovered,units,now){
 if(!healer||!target||recovered<=0)return [];
 const out=[];
 for(const e of findEffects(selected,'prism_echo'))if(healer.role===e.role
    &&(!Number.isFinite(healer.prismEchoAt)||now-healer.prismEchoAt>=e.cooldown)){
  healer.prismEchoAt=now;
  for(const ally of units)if(ally!==healer&&ally!==target&&ally.hp>0&&!ally.isHatchling
   &&(ally.side??ally.team)===(healer.side??healer.team)&&ally.hp<ally.maxHP
   &&Math.hypot(ally.x-target.x,ally.y-target.y)<=e.radius){
    out.push({unit:ally,amount:Math.min(recovered*e.pct,ally.maxHP*.1)});
    if(out.length>=e.count)break;
  }
 }
 return out;
}
function reflectEffects(selected,defender,attacker,incoming){
 if(!defender||!attacker||incoming<=0)return 0;
 return trigger(selected,'prism_reflect',defender.role,defender,0)
  .reduce((n,e)=>n+Math.min(90,incoming*e.ratio),0);
}
function deathEffects(selected,attacker){
 if(!attacker)return [];
 const out=[];
 for(const e of trigger(selected,'prism_revenge',attacker.role,attacker,0))out.push({role:e.role,count:e.count});
 for(const e of trigger(selected,'prism_foreign_kill',attacker.role,attacker,0))out.push({role:e.allyRole,count:e.count,faction:e.faction});
 return out;
}
const api=Object.freeze({cards,enabled,broodLimits,recruitLimits,augmentStats,waveEffects,hitEffects,reflectEffects,deathEffects,survival,healEcho,findEffects});
global.DesertPrism=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
