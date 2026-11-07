/* 70-WAVE campaign extension. Shared by desktop and touch builds.
 * Preserves TYPES, HERO_STATS, original attacks, splash rules and base stats. */
(() => {
 'use strict';
 const storageKey='darkarchon-70-checkpoint-v1',bestKey='darkarchon-70-best';
 const rules={
  regen:{name:'PSI 발전',max:8,start:1},
  supply:{name:'지원 병력',max:5,start:2},
  repair:{name:'넥서스 보수',max:5,start:1},
  recover:{name:'병력 정비',max:5,start:1}
 };
 const ranks={regen:0,supply:0,repair:0,recover:0};
 let points=0,clearedWave=0,rewardTimer=0,overdriveUsed=0,lastRender=-1;
 const originalStartWave=startWave,originalTick=tick,originalReset=reset,originalUpdateUI=updateUI,originalSpawn=spawn;
 spawn=function(type,enemy,x,y,isHero=false){
  const unit=originalSpawn(type,enemy,x,y,isHero);
  // Reinforcements spawned by the original timer must march toward the Nexus.
  if(enemy&&battleMode==='defense'&&wave>10&&!unit.fixed&&!unit.neutral)unit.order={type:'attackmove',x:HOME.x,y:HOME.y,target:null};
  return unit;
 };
 const phases=[
  {name:'저그 대군',pool:['zergling','zergling','hydra','lurker','ultra','mutalisk','guardian','scourge']},
  {name:'테란 기갑전',pool:['marine','firebat','vulture','siegetank','siegetank','goliath','wraith','battlecruiser']},
  {name:'프로토스 총공세',pool:['zealot','dragoon','dragoon','darktemplar','reaver','archon','scout','corsair','carrier']},
  {name:'공중 침공',pool:['mutalisk','mutalisk','wraith','scout','corsair','valkyrie','scourge','goliath','dragoon','hydra']},
  {name:'포격 교착전',pool:['siegetank','siegetank','reaver','lurker','guardian','vulture','zealot','dragoon']},
  {name:'혼합 병력전',pool:['zergling','marine','zealot','hydra','dragoon','goliath','mutalisk','siegetank','reaver','ultra']},
  {name:'전면 대회전',pool:COMBAT_TYPES}
 ];
 function rand(w,n){let x=(Math.imul(w,2654435761)+Math.imul(n,1597334677))>>>0;x^=x>>>16;x=Math.imul(x,2246822507);x^=x>>>13;return(x>>>0)/4294967296}
 function spec(n){
  if(n<=10)return {...CAMPAIGN_WAVES[n-1],name:n===10?'첫 번째 관문':'영웅 확보 작전',waves:0};
  const chapter=Math.ceil(n/10),boss=n%10===0,theme=n===70?phases[6]:phases[(n+chapter)%phases.length],normal={};
  const count=Math.min(119,Math.round(21+(n-10)*1.20+(boss?11:0)));
  for(let i=0;i<count;i++){const type=theme.pool[Math.floor(rand(n,i+29)*theme.pool.length)];normal[type]=(normal[type]||0)+1}
  if(n===70){for(const type of COMBAT_TYPES)normal[type]=Math.max(1,normal[type]||0)}
  // Guarantee a large infantry front so that captured artillery remains useful.
  for(let i=0;i<Math.ceil(count*.16);i++){const type=['zergling','marine','hydra','zealot'][i%4];normal[type]=(normal[type]||0)+1}
  const heroCount=Math.min(8,4+Math.floor((n-11)/14)+(boss?1:0)),heroCandidates=[...(boss?['siegetank','carrier','ultra']:[]),...theme.pool,...COMBAT_TYPES],heroes=[];
  for(let i=0;heroes.length<heroCount&&i<250;i++){const choice=heroCandidates[Math.floor(rand(n,900+i)*heroCandidates.length)];if(!heroes.includes(choice))heroes.push(choice)}
  return {heroes,ordinary:normal,name:boss?chapter+'장 결전 · 지휘관 습격':theme.name,waves:n<17?0:n<30?1:n<50?2:3};
 }
 const price=t=>rules[t].start+ranks[t];
 function best(){try{return Math.max(0,Number(localStorage.getItem(bestKey)||0))}catch{return 0}}
 function checkpoint(){try{return JSON.parse(localStorage.getItem(storageKey)||'null')}catch{return null}}
 const panel=document.createElement('section');
 panel.className='campaignPanel';
 panel.innerHTML='<div class="campaignHead"><strong>70 WAVE · 장기 캠페인</strong><span id="campaignPhase">영웅 포획 작전</span><span class="points">전술 점수 <b id="campaignPoints">0</b> TP</span><span class="countdown" id="campaignCountdown">전선 준비</span></div><div class="campaignChoices">'+
  '<button data-buy="regen">✦ PSI 발전<small>마나 재생 +4/초 · Lv. 0</small><b>1 TP</b></button>'+
  '<button data-buy="supply">⚙ 지원 병력<small>3웨이브마다 추가 지원 · Lv. 0</small><b>2 TP</b></button>'+
  '<button data-buy="repair">✚ 넥서스 보수<small>웨이브 종료 기지 복구 · Lv. 0</small><b>1 TP</b></button>'+
  '<button data-buy="recover">✛ 병력 정비<small>생존 병력 체력 회복 · Lv. 0</small><b>1 TP</b></button>'+
  '<button id="campaignBoost">⚡ 긴급 PSI 보급<small>마나 +150 · 현재 웨이브 1회</small><b>2 TP</b></button>'+
  '<button id="campaignSkip">▶ 다음 웨이브<small>준비 시간 단축</small><b>바로 시작</b></button>'+
  '<button id="campaignContinue">⤴ 체크포인트 이어하기<small>최근 클리어 웨이브부터</small><b>복원</b></button>'+
  '</div><div class="campaignRecord" id="campaignRecord">10웨이브마다 기념 카드 · 원작 유닛 능력치 변경 없음</div>';
 document.querySelector('.gamebar').appendChild(panel);
 const reward=document.createElement('div');
 reward.className='campaignToast';reward.hidden=true;reward.setAttribute('role','status');reward.setAttribute('aria-live','polite');
 reward.innerHTML='<div class="campaignPoster" id="campaignPoster">✦</div><div class="campaignToastCopy"><strong id="campaignRewardTitle">작전 완료</strong><span id="campaignRewardText">10단계 달성</span><small>기념 일러스트 슬롯 · 다음 승리를 향해</small></div><button id="campaignRewardClose" aria-label="기념 카드 닫기">×</button>';
 document.body.appendChild(reward);
 const label={regen:'PSI 발전',supply:'지원 병력',repair:'넥서스 보수',recover:'병력 정비'};
 function render(force=false){
  if(!force&&performance.now()-lastRender<140)return;
  lastRender=performance.now();
  const cur=Math.min(70,Math.max(1,wave)),c=spec(cur);
  $('campaignPhase').textContent=Math.ceil(cur/10)+'장 · '+c.name;
  $('campaignPoints').textContent=points;
  $('campaignCountdown').textContent=over?'전투 종료':interval>0?'다음 전선 '+Math.ceil(Math.max(0,8-interval))+'초':'영웅 '+c.heroes.length+'기 · 병력 '+(enemies().length+spawns.length)+'기';
  $('campaignRecord').textContent='최고 '+Math.max(best(),cur)+' WAVE · 10/20/30/40/50/60/70 챕터 보상 · 원작 유닛 능력치 유지';
  for(const btn of panel.querySelectorAll('[data-buy]')){
   const kind=btn.dataset.buy,n=ranks[kind],rule=rules[kind];
   btn.disabled=battleMode!=='defense'||n>=rule.max||points<price(kind);
   const detail=kind==='regen'?'현재 +'+(n*4)+'/초':kind==='supply'?'3웨이브마다 '+n+'기':kind==='repair'?'종료 시 +'+(n*40)+' HP':'종료 시 회복 +'+(n*7)+'%';
   btn.querySelector('small').textContent=detail+' · Lv.'+n;
   btn.querySelector('b').textContent=n>=rule.max?'MAX':price(kind)+' TP';
  }
  $('campaignBoost').disabled=battleMode!=='defense'||over||points<2||overdriveUsed===wave||energy>=245;
  $('campaignSkip').disabled=battleMode!=='defense'||over||interval<=0;
  const save=checkpoint();$('campaignContinue').disabled=!save||save.wave<2||battleMode!=='defense';
  $('campaignContinue').querySelector('small').textContent=save&&save.wave<=70?save.wave+'웨이브부터':'저장된 기록 없음';
 }
 function buy(type){
  const r=rules[type];if(!r||battleMode!=='defense')return;
  if(ranks[type]>=r.max||points<price(type))return;
  points-=price(type);ranks[type]++;
  notify(label[type]+' '+ranks[type]+'단계 구매 · '+points+' TP 남음');render(true);
 }
 function starterEscort(){
  if(battleMode!=='defense'||wave!==1)return;
  const has=u=>units.some(v=>!v.enemy&&v.type===u);
  if(!has('marine')){const u=spawn('marine',false,HOME.x+240,H/2-72);u.order={type:'hold',x:u.x,y:u.y}}
  if(!has('zealot')){const u=spawn('zealot',false,HOME.x+260,H/2+68);u.order={type:'hold',x:u.x,y:u.y}}
 }
 function supply(){
  if(!ranks.supply||wave%3!==0||battleMode!=='defense')return;
  const pools=['marine','zealot','hydra','dragoon','goliath','siegetank'];
  for(let i=0;i<ranks.supply;i++){
   const type=pools[(Math.floor(wave/3)+i)%pools.length],u=spawn(type,false,HOME.x+190+(i%3)*55,H/2+(i-(ranks.supply-1)/2)*70);
   u.order={type:'guard',x:u.x,y:u.y,target:null};
  }
  notify('보급 지원군 '+ranks.supply+'기 도착 · 원작 공격력/체력 그대로');
 }
 function member(entry,index,reinforce=false){
  const row=index%8,col=Math.floor(index/8),hero=!!entry.hero;
  const x=hero?W-345-(index%4)*53:W-84-col*50+(index%2)*9;
  const y=hero?H/2+[0,-85,85,-160,160,-225,225,0][index%8]:(reinforce?index%2?H-89:92:79+row*(H-158)/7);
  const u=spawn(entry.type,true,x,y,hero);
  u.order={type:'attackmove',x:HOME.x,y:HOME.y,target:null};
 }
 function advancedStartWave(){
  time=0;interval=0;spawns=[];
  const c=spec(wave),roster=[],allyCount=allies().filter(u=>!u.fixed&&u.type!=='darkarchon').length;
  // When almost wiped out, reduce only numbers, never enemy HP/damage.
  const handicap=allyCount<=2?.76:allyCount<6?.89:1;
  for(const [type,count] of Object.entries(c.ordinary))for(let j=0;j<Math.max(1,Math.round(count*handicap));j++)roster.push({type,hero:false});
  for(const type of c.heroes)roster.push({type,hero:true});
  for(let i=roster.length-1;i>0;i--){const j=Math.floor(rand(wave,i+202)* (i+1));[roster[i],roster[j]]=[roster[j],roster[i]]}
  let queued=0,visible=0,heroIndex=0;
  for(let i=0;i<roster.length;i++){
   const unit=roster[i];
   if(c.waves&&!unit.hero&&rand(wave,i+411)<(c.waves===1?.16:c.waves===2?.25:.30)){
    spawns.push({type:unit.type,hero:false,t:c.waves>1&&i%2?19:11,index:i});queued++;
   }else member(unit,unit.hero?heroIndex++:i),visible++;
  }
  spawns.sort((a,b)=>a.t-b.t);
  supply();
  notify('WAVE '+wave+'/70 · '+c.name+' · 선봉 '+visible+'기 + 증원 '+queued+'기 · 붉은 영웅 '+c.heroes.length+'기');
  render(true);
 }
 startWave=function(){
  if(wave<=10){originalStartWave();supply()}else advancedStartWave();
  render(true);
 };
 function milestone(n){
  const names=['marine','dragoon','hydra','zealot','wraith','ultra','carrier'];
  const key=names[Math.min(6,Math.floor(n/10)-1)];
  $('campaignRewardTitle').textContent=n+' WAVE CLEAR · 챕터 완주';
  $('campaignRewardText').textContent=TYPES[key].name+' 작전 포스터 · 최고 기록 저장';
  const art=$('campaignPoster');art.replaceChildren();
  if(spriteThumbs[key]){const img=document.createElement('img');img.src=spriteThumbs[key];img.alt=TYPES[key].name+' 아틀라스 이미지';art.appendChild(img)}
  else art.textContent=TYPES[key].glyph;
  reward.hidden=false;rewardTimer=6;
 }
 function saveCheckpoint(){
  try{
   const roster=allies().filter(u=>u.hp>0).map(u=>({
    type:u.type,x:u.x,y:u.y,hp:u.hp,shield:u.shield,hero:!!u.hero,sieged:!!u.sieged,
    max:u.max,maxShield:u.maxShield
   }));
   const snap={version:1,wave:Math.min(70,wave+1),points,ranks:{...ranks},energy,nexus,kills,conversions,roster};
   localStorage.setItem(storageKey,JSON.stringify(snap));
   localStorage.setItem(bestKey,String(Math.max(best(),wave)));
  }catch{}
 }
 function restore(){
  const data=checkpoint();if(!data||data.version!==1||data.wave<2||data.wave>70)return;
  reset();battleMode='defense';
  units=[];selected.clear();spawns=[];effects=[];projectiles=[];storms=[];corpses=[];
  points=data.points||0;Object.keys(ranks).forEach(k=>ranks[k]=Math.max(0,Math.min(rules[k].max,data.ranks?.[k]||0)));
  wave=data.wave;energy=Math.max(0,Math.min(250,data.energy||200));nexus=Math.max(1,Math.min(750,data.nexus||500));
  kills=data.kills||0;conversions=data.conversions||0;clearedWave=wave-1;overdriveUsed=0;
  for(const x of (data.roster||[]).slice(0,110)){
   if(!TYPES[x.type])continue;
   const u=spawn(x.type,false,Math.max(28,Math.min(W-28,x.x)),Math.max(28,Math.min(H-28,x.y)),!!x.hero);
   u.hp=Math.max(.5,Math.min(u.max,x.hp));u.shield=Math.max(0,Math.min(u.maxShield,x.shield));
   if(u.type==='siegetank'){u.sieged=!!x.sieged;u.siegeTarget=u.sieged}
   u.order={type:'guard',x:u.x,y:u.y,target:null};
  }
  if(!units.some(u=>u.type==='darkarchon'))spawn('darkarchon',false,235,H/2);
  const hero=units.find(u=>u.type==='darkarchon');if(hero)selected.add(hero.id);
  startWave();refreshSelection(true);originalUpdateUI();render(true);notify('체크포인트 복원 · '+wave+'웨이브부터 다시 시작');
 }
 function waveReward(){
  clearedWave=wave;
  points+=1+(wave%5===0?1:0)+(wave%10===0?2:0);
  nexus=Math.min(750,nexus+10+40*ranks.repair);
  for(const u of allies()){
   u.hp=Math.min(u.max,u.hp+u.max*ranks.recover*.07);
   u.shield=Math.min(u.maxShield,u.shield+u.maxShield*ranks.recover*.05);
  }
  energy=Math.min(250,energy+25);
  if(wave%10===0)milestone(wave);
  saveCheckpoint();
  notify(wave+'웨이브 돌파 · 전술 점수 획득 · 전투를 준비하며 강화 항목을 고르세요');
  render(true);
 }
 tick=function(dt){
  const wasOver=over;
  originalTick(dt);
  if(battleMode!=='defense')return;
  if(!over)energy=Math.min(250,energy+4*ranks.regen*dt);
  if(!over&&spawns.length&&spawns[0].t<=time){
   // The original tick handles queued spawns. No hero is ever hidden in reinforcements.
  }
  if(!over&&spawns.length===0&&enemies().length===0&&interval>0&&clearedWave!==wave)waveReward();
  if(over&&!wasOver&&nexus>0&&wave===70){milestone(70);try{localStorage.setItem(bestKey,'70');localStorage.removeItem(storageKey)}catch{}}
  if(rewardTimer>0){rewardTimer=Math.max(0,rewardTimer-dt);if(!rewardTimer)reward.hidden=true}
  // Keep late-game particles bounded on low-power mobile GPUs.
  if(effects.length>175)effects.splice(0,effects.length-175);
  if(corpses.length>135)corpses.splice(0,corpses.length-135);
 };
 updateUI=function(){originalUpdateUI();render()};
 reset=function(){
  points=0;clearedWave=0;rewardTimer=0;overdriveUsed=0;
  for(const k of Object.keys(ranks))ranks[k]=0;
  reward.hidden=true;originalReset();starterEscort();render(true);
 };
 $('restart').onclick=reset;
 for(const btn of panel.querySelectorAll('[data-buy]'))btn.onclick=()=>buy(btn.dataset.buy);
 $('campaignBoost').onclick=()=>{
  if(battleMode!=='defense'||over||overdriveUsed===wave||points<2||energy>=245)return;
  points-=2;energy=Math.min(250,energy+150);overdriveUsed=wave;
  notify('긴급 PSI 보급! 영웅 정신 지배 기회 추가');render(true);
 };
 $('campaignSkip').onclick=()=>{if(battleMode==='defense'&&interval>0&&!over)interval=7.99};
 $('campaignContinue').onclick=restore;
 $('campaignRewardClose').onclick=()=>{rewardTimer=0;reward.hidden=true};
 starterEscort();render(true);
})();
