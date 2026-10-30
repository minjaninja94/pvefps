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
const ROLE_NAMES=['돌격','사격','대장갑','장갑','대공','포격','특수','지원'];
// Designed around each faction's actual combat identity. Each row is a signature
// ability family (name / affected unit role / on-hit mode), not a generic list of mercenary names.
const IDENTITIES=[
 [
  ['움직이는 산성벽',3,'fortify'],['무쇠 증기기관차',0,'shockwave'],['대공 철조망',4,'snare'],
  ['궤도 대포',5,'meteor'],['초중량 전차',3,'shatter'],['강철 벌집탄',1,'pierce'],
  ['대장갑 망치',2,'shatter'],['방패 파열진',3,'shock'],['백색 포화',5,'storm'],['철의 최후통첩',2,'execute']
 ],
 [
  ['살아있는 알집',0,'spores'],['흡혈 송곳니',0,'vampire'],['기생 점액탄',1,'snare'],
  ['포식 장갑',3,'harvest'],['군체 촉수폭풍',5,'spores'],['공생충 폭식',0,'execute'],
  ['유전자 붕괴',2,'shatter'],['피묻은 부화',6,'spores'],['무저갱 수확',0,'harvest'],['산란 여왕의 포효',1,'storm']
 ],
 [
  ['성운 낙뢰',5,'meteor'],['유성 유탄',2,'meteor'],['별무리 산탄',1,'pierce'],
  ['성좌 봉쇄',4,'snare'],['차원 균열',6,'storm'],['황금 성운폭발',5,'shockwave'],
  ['별빛 파쇄',2,'shatter'],['천궁의 심판',1,'execute'],['밤하늘 반사경',3,'fortify'],['초신성의 후광',5,'meteor']
 ],
 [
  ['오도 돌격',0,'shock'],['황룡의 기상나팔',6,'shockwave'],['긴빠이 폭약',5,'meteor'],
  ['싸제 소총 연사',1,'pierce'],['해병식 탄막',0,'roulette'],['기합 포신',2,'shatter'],
  ['포탄 낙하',5,'shockwave'],['악기바리 역공',3,'fortify'],['훈련소 대폭발',4,'storm'],['상륙함 돌격',6,'shock']
 ],
 [
  ['발톱 회오리',6,'shockwave'],['달밤 포식',0,'harvest'],['송곳니 끝장',6,'execute'],
  ['짐승 발목잡기',0,'snare'],['포식자의 맹습',3,'shatter'],['핏빛 갈기',6,'vampire'],
  ['갈가리 찢기',2,'execute'],['매복 사냥꾼',0,'roulette'],['발굽의 지진',6,'shockwave'],['짐승왕의 식사',0,'harvest']
 ],
 [
  ['월광 삼연시',1,'pierce'],['은월 저격궤도',2,'execute'],['잎새 관통화살',1,'split'],
  ['숲의 속박',4,'snare'],['정령 화살비',5,'storm'],['초승달 궤적',6,'pierce'],
  ['달빛 별똥별',5,'meteor'],['나무의 저주',2,'shatter'],['밤안개 유도탄',1,'pierce'],['정령왕의 화살통',1,'split']
 ],
 [
  ['늑대떼 추격',6,'snare'],['피의 질주',0,'vampire'],['붉은달 살육',6,'execute'],
  ['발톱 분열',0,'split'],['맹수의 목덜미',3,'harvest'],['무리 사냥',6,'shock'],
  ['고속 기습',2,'execute'],['달빛 포효',0,'shockwave'],['그림자 추격',6,'roulette'],['야수왕 군림',6,'execute']
 ],
 [
  ['CPU 과부하',1,'shock'],['드론 레이저망',4,'pierce'],['자동 조준포',2,'execute'],
  ['플라즈마 쐐기',5,'meteor'],['나노 갑옷',3,'fortify'],['재조립 포화',1,'split'],
  ['기계식 전류',4,'shockwave'],['광자빔 절단',2,'shatter'],['화염 방화벽',5,'storm'],['최종 프로토콜',6,'shock']
 ],
 [
  ['암흑 먹물비',1,'spores'],['촉수의 족쇄',0,'snare'],['심연의 대포',5,'storm'],
  ['수압 분쇄',2,'shatter'],['독가스 점착',4,'spores'],['심해 흡혈',0,'harvest'],
  ['검은 해류',5,'shockwave'],['묵빛 집어등',1,'snare'],['바다 포식',3,'vampire'],['크라켄의 먹물',5,'spores']
 ],
 [
  ['벚꽃 소나기',1,'bloom'],['요정의 반짝 화살',1,'split'],['수호 꽃잎',4,'fortify'],
  ['봄바람 속박',2,'snare'],['생명나무 섬광',5,'bloom'],['별사탕 폭발',1,'roulette'],
  ['꽃씨 퍼뜨리기',4,'spores'],['분홍빛 마법',2,'bloom'],['꽃밭의 대포',5,'shockwave'],['요정여왕의 축복탄',1,'bloom']
 ]
];
const LINKED=[{faction:7,role:3},{faction:8,role:0},{faction:5,role:1},{faction:0,role:3},{faction:6,role:6},
 {faction:2,role:5},{faction:4,role:6},{faction:0,role:3},{faction:1,role:0},{faction:5,role:1}];
const MODE_TEXT={
 fortify:'피격으로 무너진 전열을 재정비하듯 공격자가 자가 치유하고 반격합니다',
 shockwave:'충격파가 주변 적까지 튀어나가 피해를 줍니다',
 snare:'목표와 주변 적을 느리게 만들고 방해합니다',
 meteor:'강한 직격 피해와 주변 폭발을 일으킵니다',
 shatter:'장갑병과 영웅 유닛에게 추가 파쇄 피해를 줍니다',
 pierce:'투사체가 주변 적 최대 4기까지 관통 분열합니다',
 shock:'직격 피해를 증폭하고 목표를 감속시킵니다',
 storm:'주변 적에게 연쇄 폭풍과 감속을 남깁니다',
 execute:'체력이 부족한 적에게 마무리 피해를 줍니다',
 spores:'먹물·포자가 이웃 적에게 전염돼 피해와 감속을 줍니다',
 vampire:'명중 피해를 흡수하면서 인접 적도 찌릅니다',
 harvest:'피해를 흡수하고 부상한 적을 강하게 마무리합니다',
 roulette:'연쇄타격·치유·직격강화가 순환해서 발동합니다',
 split:'투사체가 주변 최대 3명에게 갈라집니다',
 bloom:'적을 공격할 때 자신과 부상한 아군에게 꽃잎 치유를 나눕니다'
};
function identityPassive(faction,role,index){
 switch(faction){
  case 0:return index%3===0?reflect(3,.4,3):index%3===1?chain(5,.5,165,4,2):execute(2,.37,.62);
  case 1:return index%3===0?revenge(0,1,4):index%3===1?leech(0,.36,3):mark(1,3,4);
  case 2:return index%3===0?chain(5,.56,190,4,3):index%3===1?reflect(3,.36,4):mark(4,3,3);
  case 3:return index%3===0?revenge(0,1,4):index%3===1?chain(5,.48,170,4,2):reflect(3,.4,4);
  case 4:return index%3===0?leech(6,.38,3):index%3===1?execute(6,.4,.65):mark(0,2.5,4);
  case 5:return index%3===0?chain(1,.5,195,4,3):index%3===1?mark(2,3,3):execute(2,.4,.7);
  case 6:return index%3===0?revenge(6,1,4):index%3===1?leech(0,.3,3):execute(6,.4,.65);
  case 7:return index%3===0?reboot(3,.35,32):index%3===1?chain(4,.55,180,4,3):reflect(3,.38,4);
  case 8:return index%3===0?mark(1,4,3):index%3===1?chain(5,.53,185,4,3):leech(0,.32,3);
  case 9:return index%3===0?echo(7,.5,3,210,5):index%3===1?chain(1,.43,185,4,3):reflect(0,.38,3);
 }
}
function describePassive(e){
 switch(e.kind){
  case 'prism_reflect':return ROLE_NAMES[e.role]+'병이 '+e.every+'번째 피격마다 받은 피해를 반사';
  case 'prism_chain':return ROLE_NAMES[e.role]+'병의 '+e.every+'번째 명중이 '+e.targets+'기에게 연쇄 피해';
  case 'prism_revenge':return ROLE_NAMES[e.role]+'병이 적 '+e.every+'기 처치할 때 같은 종족 병력 '+e.count+'기 추가 출격';
  case 'prism_leech':return ROLE_NAMES[e.role]+'병이 '+e.every+'번째 명중 때 피해 흡수';
  case 'prism_execute':return ROLE_NAMES[e.role]+'병이 빈사 적을 처형';
  case 'prism_mark':return ROLE_NAMES[e.role]+'병이 '+e.every+'번째 명중으로 감속';
  case 'prism_reboot':return ROLE_NAMES[e.role]+'병이 치명상 후 재가동';
  case 'prism_echo':return '지원병 치유가 부상 아군 '+e.count+'명에게 전파';
  default:return '';
 }
}
// Existing 10 per faction are preserved. The 30 new cards use faction-specific
// hit, kill, survival or healing mechanics; only two themed alliances per faction.
const extraCards=IDENTITIES.flatMap((concepts,faction)=>Array.from({length:30},(_,index)=>{
 const stage=Math.floor(index/10),offset=index%10,[concept,role,mode]=concepts[offset];
 const every=stage===0?3+(offset%2):stage===1?4+(offset%2):3;
 const ratio=stage===0?.42+offset*.012:stage===1?.48+offset*.014:.58+offset*.013;
 const radius=135+offset*9+stage*15;
 const anomaly={kind:'prism_anomaly',role,mode,every,ratio,radius};
 const effects=[anomaly],passive=identityPassive(faction,role,offset);
 let description=ROLE_NAMES[role]+'병이 '+every+'번째 명중할 때 '+MODE_TEXT[mode]+'.';
 if(stage>0){
  effects.push(passive);description+=' '+describePassive(passive)+' 효과도 발동합니다.';
 }
 if(stage===2&&offset<8){
  const extra=identityPassive(faction,role,offset+1);
  if(extra.kind!==passive.kind){effects.push(extra);description+=' 또한 '+describePassive(extra)+' 효과가 발생합니다.';}
 }
 if(stage===2&&offset>=8){
  const ally=LINKED[faction],name=FACTION_NAMES[ally.faction];
  if(offset===8){
   effects.push({kind:'prism_foreign_wave',role:ally.role,count:1,every:4,faction:ally.faction});
   description+=' 전쟁 동맹 '+name+'의 '+ROLE_NAMES[ally.role]+'병 1기가 4웨이브마다 지원 출격합니다.';
  }else{
   effects.push({kind:'prism_foreign_kill',role,every:5,count:1,faction:ally.faction,allyRole:ally.role});
   description+=' 적 5기 처치 시 동맹 '+name+'의 '+ROLE_NAMES[ally.role]+'병 1기를 전장에 호출합니다.';
  }
 }
 const epithet=stage===0?'특이점':stage===1?'전투각성':'초월폭주';
 return Object.freeze({id:'exp-prism-'+faction+'-'+(index+10),scope:'faction-'+faction,tier:'prismatic',
  name:concept+' · '+epithet,description,experimental:true,effects});
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
function hitEffects(selected,attacker,victim,damage,now,nearby=[],allies=[]){
 if(!attacker||!victim||!Number.isFinite(damage)||damage<=0)return {bonus:0,heal:0,secondary:[],marked:false};
 const role=attacker.role;
 const result={bonus:0,heal:0,secondary:[],marked:false,allyHeal:[]};
 for(const e of trigger(selected,'prism_burst',role,attacker,now))result.bonus+=damage*(e.mult-1);
 for(const e of findEffects(selected,'prism_execute'))if(e.role===role&&victim.hp<=victim.maxHP*e.threshold)result.bonus+=damage*e.bonus;
 for(const e of trigger(selected,'prism_chain',role,attacker,now)){
  const targets=nearby.filter(x=>x!==victim&&x.hp>0&&Math.hypot(x.x-victim.x,x.y-victim.y)<=e.radius)
   .slice(0,Math.max(1,Math.min(5,e.targets||1)));
  for(const target of targets)result.secondary.push({target,damage:Math.min(300,damage*e.ratio)});
 }
 for(const e of trigger(selected,'prism_leech',role,attacker,now))result.heal+=Math.min(120,damage*e.pct);
 for(const e of trigger(selected,'prism_mark',role,attacker,now))result.marked=Math.max(result.marked||0,e.duration);
 for(const e of trigger(selected,'prism_anomaly',role,attacker,now)){
  const nearbyTargets=nearby.filter(x=>x!==victim&&x.hp>0&&Math.hypot(x.x-victim.x,x.y-victim.y)<=e.radius).slice(0,5);
  const splash=(count,ratio,marked=0)=>{for(const x of nearbyTargets.slice(0,count))result.secondary.push({target:x,damage:Math.min(260,damage*ratio),marked});};
  if(e.mode==='split')splash(3,e.ratio);
  else if(e.mode==='pierce')splash(4,e.ratio);
  else if(e.mode==='shockwave'){result.bonus+=damage*e.ratio*.3;splash(3,e.ratio);}
  else if(e.mode==='snare'){result.marked=Math.max(result.marked,4);splash(2,e.ratio*.45,3);}
  else if(e.mode==='spores'){result.marked=Math.max(result.marked,3);splash(3,e.ratio*.65,3);}
  else if(e.mode==='shatter'){if(victim.role===3||victim.heroCount===20)result.bonus+=damage*(e.ratio+.4);splash(1,e.ratio*.5);}
  else if(e.mode==='meteor'){result.bonus+=damage*e.ratio*.6;splash(4,e.ratio*.65);}
  else if(e.mode==='fortify'){result.bonus+=damage*e.ratio*.3;result.heal+=Math.min(100,damage*e.ratio);}
  else if(e.mode==='harvest'){result.heal+=Math.min(120,damage*e.ratio);if(victim.hp/victim.maxHP<.4)result.bonus+=damage*.55;}
  else if(e.mode==='bloom'){
   result.heal+=Math.min(90,damage*.30);
   for(const ally of allies)if(ally!==attacker&&ally.hp>0&&ally.hp<ally.maxHP
      &&Math.hypot(ally.x-victim.x,ally.y-victim.y)<=e.radius*2){
    result.allyHeal.push({unit:ally,amount:Math.min(65,Math.max(1,damage*e.ratio*.35))});
    if(result.allyHeal.length>=3)break;
   }
  }
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
