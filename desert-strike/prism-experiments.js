/* EXPERIMENTAL: Ten legendary Prism powers per faction (100 cards).
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
const limit=bonus=>({kind:'prism_limit',bonus});
const brood=(extra,alive,proc=0)=>({kind:'prism_brood',extra,alive,proc});
const recruit=(extra,proc=0)=>({kind:'prism_recruit',extra,proc});
const burst=(role,mult=1.5,every=4)=>({kind:'prism_burst',role,mult,every});
const chain=(role,ratio=.35,radius=135,every=5)=>({kind:'prism_chain',role,ratio,radius,every});
const leech=(role,pct=.2,every=3)=>({kind:'prism_leech',role,pct,every});
const mark=(role,duration=2,every=4)=>({kind:'prism_mark',role,duration,every});
const execute=(role,threshold=.3,bonus=.6)=>({kind:'prism_execute',role,threshold,bonus});
const frenzy=(role,mult=1.4,seconds=10)=>({kind:'prism_frenzy',role,mult,seconds});
const revenge=(role,count=1,every=3)=>({kind:'prism_revenge',role,count,every});
const reflect=(role,ratio=.32,every=4)=>({kind:'prism_reflect',role,ratio,every});
const field=(role,pct=.015,every=2)=>({kind:'prism_field',role,pct,every});
const factionCards=[
 // 0 철갑연합: immovable line, anti-siege retaliation, fortress logistics
 [
 ['이동 요새화','매 2웨이브마다 아군 핵심 기지 최대 체력의 4%를 복구합니다.',repair(.04,2)],
 ['철갑 예비사단','매 3웨이브마다 장갑병 2기가 추가 출격합니다. 병력 상한 적용.',sp(3,2,3)],
 ['철의 역습','장갑병이 4번째 피격될 때마다 받은 피해의 45%를 공격자에게 반사합니다.',reflect(3,.45,4)],
 ['비상동원령','아군 병력 상한이 220→252(싱글), 라인당 75→87(멀티)로 해제됩니다.',limit(32)],
 ['포성 공명','포격병의 매 4번째 공격이 주변 적 한 명에게 50% 연쇄 피해를 줍니다.',chain(5,.5,145,4)],
 ['강철 심장','매 2웨이브마다 생존 아군 병력이 최대 체력의 9%를 회복합니다.',heal(.09,2)],
 ['최후의 기갑진','장갑병이 적 체력 30% 미만을 공격하면 피해량이 85% 추가됩니다.',execute(3,.30,.85)],
 ['전선 보급열차','매 웨이브 추가 보급 70 CR을 지급합니다.',cash(70)],
 ['벙커 브레이커','대장갑병의 매 4번째 타격이 2.1배 관통 피해를 입힙니다.',burst(2,2.1,4)],
 ['진격하는 철벽','웨이브 시작 후 12초 동안 돌격병이 1.6배의 공격력을 얻습니다.',frenzy(0,1.6,12)]
 ],
 // 1 심연군체: reproduction, plague, brood over-limit
 [
 ['군체 해방령','웨이브당 공생충 상한 +8, 동시 생존 상한 +10, 부화 확률 +12%p.',brood(8,10,.12)],
 ['혈육의 조수','매 2웨이브마다 돌격병 3기가 추가 부화합니다.',sp(0,3,2)],
 ['포식의 전염','돌격병의 4번째 타격은 목표에게 2초 먹물 약화 상태를 남깁니다.',mark(0,2,4)],
 ['기생 재생','매 2웨이브마다 생존 군체 병력의 체력 12%를 복구합니다.',heal(.12,2)],
 ['산란 폭주','공생충 상한 +5, 동시 생존 상한 +6, 부화 확률 +18%p.',brood(5,6,.18)],
 ['무저갱 확장','아군 병력 상한을 싱글 +36, 멀티 라인당 +14 확장합니다.',limit(36)],
 ['영양분 회수','돌격병이 3번째 타격을 할 때 피해의 35%를 흡수해 자가 치유합니다.',leech(0,.35,3)],
 ['변이 역류','적 처치 4회마다 돌격병 공생체 1기가 무료 출격합니다. 상한 적용.',revenge(0,1,4)],
 ['폭식의 군집','돌격병의 5번째 공격이 근처 적에게 60% 연쇄 피해를 입힙니다.',chain(0,.6,100,5)],
 ['심연의 부화제','매 3웨이브마다 지원병 2기가 더 태어납니다. 생산 제한 준수.',sp(7,2,3)]
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
 ['결사의 확장','아군 병력 제한이 싱글 +28, 멀티 라인당 +10 상승합니다.',limit(28)]
 ],
 // 3 해병성채: logistics, looting, conscription, shock infantry
 [
 ['무제한 자진입대','웨이브당 자진입대 제한 +3명, 적 처치 후 징집 확률 +15%p.',recruit(3,.15)],
 ['긴빠이 보급망','매 웨이브 훔쳐온 전리품 85 CR을 추가 지급합니다.',cash(85)],
 ['오도봉고 기갑행진','매 3웨이브 돌격 기수 2기가 추가 출격합니다.',sp(6,2,3)],
 ['황룡 무한지원','매 2웨이브 추가 지원병 2기가 출격합니다.',sp(7,2,2)],
 ['악기바리 역공','돌격병은 매 4번째 피격마다 피해의 60%를 반사합니다.',reflect(0,.6,4)],
 ['해병의 재배치','아군 병력 제한을 싱글 +30, 멀티 라인당 +12 상향합니다.',limit(30)],
 ['싸제 포격','포격병의 4번째 타격이 인접한 적 1명에게 65% 연쇄 폭발을 발생시킵니다.',chain(5,.65,135,4)],
 ['부활한 전우','적 처치 4회마다 아군 돌격병 1기를 지원 생산합니다.',revenge(0,1,4)],
 ['해병수육 대잔치','매 2웨이브 생존 해병 전체 체력이 11% 회복됩니다.',heal(.11,2)],
 ['기열 처형식','돌격병이 체력 30% 미만인 적에게 추가 90% 피해를 줍니다.',execute(0,.3,.9)]
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
 ['짐승왕의 부대','아군 한도를 싱글 +38, 멀티 라인당 +15 확장합니다.',limit(38)],
 ['사냥의 전리품','매 웨이브 추가 60 CR을 받습니다.',cash(60)]
 ],
 // 5 은월 엘프족: focus fire, soft control, ranged punishment
 [
 ['달빛 연쇄화살','사격병의 4번째 명중이 주변 적에게 60% 연쇄 피해를 줍니다.',chain(1,.6,175,4)],
 ['은월 저격수','대장갑병이 체력 40% 미만의 적을 추가 75% 피해로 처형합니다.',execute(2,.4,.75)],
 ['시공의 화살','사격병의 4번째 명중이 적을 3초 감속시킵니다.',mark(1,3,4)],
 ['달의 집중','웨이브 시작 후 12초 동안 대장갑병 공격력 1.7배.',frenzy(2,1.7,12)],
 ['별빛 사수','매 3웨이브 사격병 3기 추가 소환합니다.',sp(1,3,3)],
 ['유성분열탄','포격병의 5번째 사격이 주변 적에게 80% 연쇄 피해.',chain(5,.8,185,5)],
 ['월광의 맹세','매 2웨이브 전체 엘프 병력이 8% 회복됩니다.',heal(.08,2)],
 ['끝없는 화살통','아군 인원 상한을 싱글 +32, 멀티 라인당 +12 확장합니다.',limit(32)],
 ['정령의 반격','대공병이 매 4번째 피격될 때 공격자에게 받은 피해의 55%를 반사합니다.',reflect(4,.55,4)],
 ['숲의 조달','웨이브마다 보급 65 CR을 추가 수급합니다.',cash(65)]
 ],
 // 6 월영 수인 / beastfolk riders: pack dynamics
 [
 ['늑대 무리 행진','매 2웨이브 돌격 기수 2기가 출격합니다.',sp(6,2,2)],
 ['야수 합창','돌격병은 4번째 타격에 주변 적 1명에게 55% 연쇄 피해를 가합니다.',chain(0,.55,110,4)],
 ['붉은달 광분','시작 12초 동안 돌격병 공격력 1.75배.',frenzy(0,1.75,12)],
 ['무리의 치유','매 2웨이브 생존 병력 체력을 10% 복구합니다.',heal(.10,2)],
 ['질풍 추격','돌격 기수의 4번째 공격은 2초 감속을 부여합니다.',mark(6,2,4)],
 ['강철 송곳니','돌격병 체력 흡수: 3번째 공격마다 피해의 38%를 회복합니다.',leech(0,.38,3)],
 ['달의 군단','싱글 병력 상한 +40, 멀티 라인당 +15 확장합니다.',limit(40)],
 ['두 번째 사냥','적 처치 3회마다 돌격 기수 1기가 지원 출격합니다.',revenge(6,1,3)],
 ['발톱의 응징','돌격병이 적 체력 35% 이하일 때 추가 피해 75%.',execute(0,.35,.75)],
 ['질주의 보급','매 웨이브 추가 65 CR 수령.',cash(65)]
 ],
 // 7 기계연방: drones and overclock, automated retaliation
 [
 ['나노 재생막','2웨이브마다 기계 병력 전체 체력 12% 복구.',heal(.12,2)],
 ['드론 편대','3웨이브마다 특수 비행기 2기가 지원 출격.',sp(6,2,3)],
 ['재조립 병기','적 처치 4회마다 돌격병 로봇 1기 제조.',revenge(0,1,4)],
 ['자동 반격 포탑','장갑병의 3번째 피격이 공격자에게 피해 60% 반사.',reflect(3,.6,3)],
 ['대공 방화벽','대공병의 4번째 공격이 인접 적에게 65% 연쇄 피해.',chain(4,.65,160,4)],
 ['CPU 오버클럭','웨이브 시작 13초 동안 사격병 공격력 1.7배.',frenzy(1,1.7,13)],
 ['생산 프로토콜 해제','싱글 한도 +40, 멀티 라인당 +15 확장.',limit(40)],
 ['전자 교란막','사격병 4번째 공격 적에게 3초 감속.',mark(1,3,4)],
 ['재생 코어','매 2웨이브 아군 핵심 기지 내구도 4.5% 복구.',repair(.045,2)],
 ['고철 회수장','웨이브마다 추가 75 CR 생산.',cash(75)]
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
 ['무저갱 영역','싱글 한도 +35, 멀티 라인당 +13 확장.',limit(35)],
 ['해구의 심판','웨이브 시작 12초 동안 포격병 공격력 1.7배.',frenzy(5,1.7,12)]
 ],
 // 9 페어리: bloom-healing, fairy chain, empathy
 [
 ['꽃잎 연쇄','매 2웨이브마다 꽃잎의 축복으로 생존 아군 전원의 체력을 13% 회복합니다.',heal(.13,2)],
 ['분홍 꽃가루 폭풍','사격병의 4번째 명중이 주변 적에게 65% 연쇄 피해.',chain(1,.65,145,4)],
 ['생명나무 축복','웨이브당 2회마다 생존 병력 체력 15% 회복.',heal(.15,2)],
 ['요정 여왕의 사절','2웨이브마다 지원병 2기가 추가 출격.',sp(7,2,2)],
 ['봄바람 지원군','3웨이브마다 사격병 3기가 지원 출격.',sp(1,3,3)],
 ['꽃잎 방패','돌격병의 4번째 피격이 공격자에게 피해 50%를 반사.',reflect(0,.5,4)],
 ['요정계 확장','싱글 병력 +28, 멀티 라인당 +10 한도 상승.',limit(28)],
 ['달콤한 덫','대공병 4번째 타격으로 적 3초 감속.',mark(4,3,4)],
 ['벚꽃의 심판','대장갑병이 체력 35% 아래의 적에게 80% 추가 피해.',execute(2,.35,.8)],
 ['꽃가루 조달','매 웨이브 70 CR 추가 보급.',cash(70)]
 ]
];
const cards=factionCards.flatMap((items,faction)=>items.map(([name,description,...effects],index)=>Object.freeze({
 id:'exp-prism-'+faction+'-'+index,scope:'faction-'+faction,tier:'prismatic',
 name:name+' · 초월 프리즘',description,experimental:true,effects
})));
const enabled=()=>global.DesertPrismExperimentalEnabled!==false;
function findEffects(selected=[],kind=null){
 if(!enabled()||!selected?.length)return [];
 const ids=new Set(selected),out=[];
 for(const card of cards)if(ids.has(card.id))for(const effect of card.effects)if(!kind||effect.kind===kind)out.push(effect);
 return out;
}
function bonus(selected,kind){
 return findEffects(selected,kind).reduce((sum,e)=>sum+(e.bonus||0),0);
}
function populationLimit(selected,standard,multiplayer=false){
 // Existing limits remain intact unless the corresponding card is selected.
 return standard+(multiplayer?Math.min(18,Math.ceil(bonus(selected,'prism_limit')*.38)):Math.min(55,bonus(selected,'prism_limit')));
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
 const result={cash:0,heals:[],repairs:[],spawns:[]};
 for(const e of findEffects(selected)){
  if(!e.every||wave%e.every!==0)continue;
  if(e.kind==='prism_cash')result.cash+=e.amount;
  if(e.kind==='prism_heal')result.heals.push(e.pct);
  if(e.kind==='prism_repair')result.repairs.push(e.pct);
  if(e.kind==='prism_spawn')result.spawns.push({role:e.role,count:e.count});
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
  const target=nearby.find(x=>x!==victim&&x.hp>0&&Math.hypot(x.x-victim.x,x.y-victim.y)<=e.radius);
  if(target)result.secondary.push({target,damage:Math.min(300,damage*e.ratio)});
 }
 for(const e of trigger(selected,'prism_leech',role,attacker,now))result.heal+=Math.min(120,damage*e.pct);
 for(const e of trigger(selected,'prism_mark',role,attacker,now))result.marked=Math.max(result.marked||0,e.duration);
 return result;
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
 return out;
}
const api=Object.freeze({cards,enabled,populationLimit,broodLimits,recruitLimits,augmentStats,waveEffects,hitEffects,reflectEffects,deathEffects,findEffects});
global.DesertPrism=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
