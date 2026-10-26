(() => {
'use strict';
const W = 1100, H = 560;
const canvas = document.getElementById('battle'), g = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const el = {
 gold:$('gold'),income:$('income'),econ:$('economyLevel'),wave:$('wave'),count:$('countdown'),
 playerHp:$('playerHp'),enemyHp:$('enemyHp'),playerBar:$('playerHpBar'),enemyBar:$('enemyHpBar'),
 countUnits:$('battleCount'),status:$('battleStatus'),cards:$('unitCards'),detail:$('unitDetail'),
 grid:$('buildGrid'),slots:$('slots'),feed:$('feed'),upgrade:$('upgradeBtn'),upgradeCost:$('upgradeCost'),
 demolish:$('demolishBtn'),overlay:$('battleOverlay'),welcome:$('welcome'),finish:$('finish'),
 flash:$('waveFlash'),pause:$('pauseBtn'),speed:$('speedBtn'),sound:$('soundBtn')
};
const TYPES = [
 {id:'vanguard',name:'돌격병',symbol:'⚔',cost:65,hp:112,dmg:20,armor:1,range:28,rate:.75,speed:78,shot:0,air:false,role:'보병 · 근접 돌진',info:'가격 대비 빠른 돌격. 포병을 잡는 데 효율적입니다.'},
 {id:'rifle',name:'소총병',symbol:'⌖',cost:100,hp:105,dmg:16,armor:1,range:166,rate:.78,speed:56,shot:350,air:true,role:'보병 · 범용 사격',info:'지상과 공중을 모두 사격하는 범용 주력 유닛입니다.'},
 {id:'rocket',name:'로켓병',symbol:'➤',cost:150,hp:92,dmg:51,armor:0,range:205,rate:1.75,speed:47,shot:230,air:true,splash:23,role:'대장갑 · 폭발',info:'중장갑에 큰 피해를 줍니다. 느린 발사 속도에 주의하세요.'},
 {id:'tank',name:'강습 전차',symbol:'▣',cost:205,hp:390,dmg:31,armor:9,range:106,rate:1.22,speed:32,shot:265,air:false,role:'장갑 · 전열 방어',info:'높은 체력과 방어력. 로켓 공격에 취약합니다.'},
 {id:'flak',name:'대공포',symbol:'✣',cost:165,hp:170,dmg:16,armor:3,range:205,rate:.55,speed:45,shot:490,air:true,role:'대공 · 속사',info:'비행 유닛을 우선 조준하고 드론에 큰 추가 피해를 줍니다.'},
 {id:'artillery',name:'야전 포병',symbol:'✺',cost:245,hp:100,dmg:74,armor:0,range:322,rate:2.55,speed:26,shot:235,air:false,splash:55,role:'원거리 · 광역 포격',info:'후방에서 범위 공격. 빠른 돌격병에게 취약합니다.'},
 {id:'drone',name:'전투 드론',symbol:'◇',cost:210,hp:155,dmg:25,armor:1,range:143,rate:.85,speed:90,shot:395,air:true,flying:true,role:'비행 · 기동',info:'근접·전차 공격을 무시하는 공중 유닛. 대공포에 취약합니다.'},
 {id:'medic',name:'의무병',symbol:'✚',cost:145,hp:130,dmg:0,armor:0,range:135,rate:1.15,speed:59,shot:0,air:false,heal:35,role:'지원 · 회복',info:'부상당한 아군을 우선 치료합니다. 공격 능력은 없습니다.'}
];
const BY_ID = Object.fromEntries(TYPES.map(d => [d.id,d]));
const TEAM = ['#74ddea','#ff927a'];
const LANES = [166,280,394];
const DECOR = Array.from({length:66},(_,i)=>({
 x: 60 + ((i*193+71)%970),y:45+((i*241+31)%470),r:4+(i*13%22),
 a:.025+(i%6)*.008
}));
let s, chosen=null, demolish=false, running=false, muted=false, last=0, audio=null;
let flashTimer=0, updateTimer=0;
const random=(a,b)=>a+Math.random()*(b-a);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const fmt=n=>Math.floor(n).toLocaleString('ko-KR');
const costEco=()=>Math.round(155*Math.pow(1.58,s.eco));
function tone(freq=330,len=.08,type='square',volume=.03){
 if(muted || !running) return;
 try {
  audio=audio||new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==='suspended')audio.resume().catch(()=>{});
  const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
  osc.type=type;osc.frequency.setValueAtTime(freq,now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(50,freq*.67),now+len);
  gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+len);
  osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+len+.015);
 } catch(_){}
}
function announce(message){
 el.feed.textContent=message;
}
function initialState(){
 s={cash:600,enemyCash:220,eco:0,enemyEco:0,wave:0,time:0,next:16,
 buildings:Array(15).fill(null),enemyBuildings:Array(15).fill(null),
 units:[],shots:[],sparks:[],labels:[],base:[1800,1800],turret:[0,0],
 ended:false,paused:false,speed:1,nextId:1,ui:0,aiTime:0};
 s.enemyBuildings[1]='vanguard';s.enemyBuildings[6]='rifle';s.enemyBuildings[11]='rifle';
 chosen=null;demolish=false;flashTimer=0;updateTimer=0;
 el.overlay.classList.remove('hidden');el.welcome.classList.remove('hidden');el.finish.classList.add('hidden');
 el.pause.textContent='Ⅱ 일시정지';el.speed.textContent='▶ 1×';
 announce('유닛을 선택하고 생산 격자에 배치하세요.');
 refreshUI();
}
function startGame(){
 initialState();running=true;
 el.overlay.classList.add('hidden');
 announce('작전 개시! 다음 출격까지 16초입니다. 생산 시설을 건설하세요.');
 tone(530,.17,'sawtooth',.035);
}
function selectCard(id){
 if(!BY_ID[id])return;
 chosen = chosen===id ? null : id;
 demolish=false;refreshUI();
 if(chosen)announce(BY_ID[chosen].name+' 선택 — 생산 격자를 터치해 건설하세요.');
}
function demolishCell(i){
 const prev=s.buildings[i];
 if(!prev)return;
 const refund=Math.floor(BY_ID[prev].cost*.55);
 s.cash+=refund;s.buildings[i]=null;
 tone(180,.12,'sine',.06);
 announce(BY_ID[prev].name+' 시설 철거 · '+refund+' CR 반환');
}
function buildCell(i){
 if(!running || s.ended){announce('먼저 작전을 시작하세요.');return;}
 if(s.paused){announce('일시정지 상태입니다.');return;}
 if(demolish){demolishCell(i);refreshUI();return;}
 if(!chosen){ if(s.buildings[i])selectCard(s.buildings[i]);else announce('먼저 왼쪽의 생산 유닛을 선택하세요.');return; }
 const def=BY_ID[chosen],old=s.buildings[i];
 if(old===chosen){announce('이미 같은 시설이 설치되어 있습니다.');return;}
 const refund=old?Math.floor(BY_ID[old].cost*.55):0;
 const charge=def.cost-refund;
 if(s.cash<charge){tone(125,.11,'sawtooth');announce('자금 부족! '+Math.ceil(charge-s.cash)+' CR이 더 필요합니다.');return;}
 s.cash-=charge;s.buildings[i]=chosen;
 s.sparks.push({x:120+i%5*22,y:LANES[Math.floor(i/5)],life:.45,max:.45,color:'#f1d89c',r:13});
 tone(480,.09,'triangle');tone(640,.06,'triangle',.014);
 announce(def.name+' 생산 시설 완공 · 다음 웨이브부터 출격');
 refreshUI();
}
function toggleDemolish(){
 demolish=!demolish;chosen=null;refreshUI();
 announce(demolish?'철거할 생산 시설을 선택하세요.':'철거 모드 해제');
}
function upgradeEconomy(){
 if(!running || s.ended || s.paused)return;
 if(s.eco>=7){announce('경제 레벨이 최대입니다.');return;}
 const price=costEco();
 if(s.cash<price){announce('경제 업그레이드에 '+Math.ceil(price-s.cash)+' CR이 더 필요합니다.');return;}
 s.cash-=price;s.eco++;
 tone(620,.18,'triangle',.055);announce('보급망 Lv.'+s.eco+' 달성! 초당 자금 수입이 증가합니다.');
 refreshUI();
}
function refreshUI(){
 el.gold.textContent=fmt(s.cash);el.econ.textContent=s.eco;
 el.income.textContent='+'+(4+s.eco*2);el.wave.textContent=String(s.wave).padStart(2,'0');
 el.count.textContent=Math.max(0,s.next).toFixed(1);
 el.playerHp.textContent=Math.ceil(s.base[0])+' / 1800';
 el.enemyHp.textContent=Math.ceil(s.base[1])+' / 1800';
 el.playerBar.style.width=(s.base[0]/18)+'%';
 el.enemyBar.style.width=(s.base[1]/18)+'%';
 el.slots.textContent=s.buildings.filter(Boolean).length+' / 15';
 el.cards.innerHTML=TYPES.map((u,i)=>
  '<button type="button" class="unit-card'+(chosen===u.id?' selected':'')+(s.cash<u.cost?' unaffordable':'')+
  '" data-unit="'+u.id+'" aria-pressed="'+(chosen===u.id)+'" title="'+u.role+'">'+
  '<span class="num">0'+(i+1)+'</span><span class="glyph" aria-hidden="true">'+u.symbol+'</span>'+
  '<span class="name">'+u.name+'</span><span class="cost">'+u.cost+' CR</span></button>'
 ).join('');
 el.grid.innerHTML=s.buildings.map((id,i)=>{
  const u=id?BY_ID[id]:null;
  return '<button type="button" class="cell'+(id?' occupied':'')+(demolish&&id?' demolish':'')+
   '" data-cell="'+i+'" aria-label="'+(u?u.name+' 생산 시설':'빈 생산 칸')+' '+(i+1)+'">'+
   (u?'<span class="tile-emoji">'+u.symbol+'</span><span class="tile-name">'+u.name+'</span>':
   '<span class="plus">+</span><span class="tile-id">'+(Math.floor(i/5)+1)+'-'+(i%5+1)+'</span>')+'</button>';
 }).join('');
 el.demolish.classList.toggle('active',demolish);
 el.demolish.setAttribute('aria-pressed',String(demolish));
 if(chosen){
  const u=BY_ID[chosen];el.detail.innerHTML='<strong>'+u.symbol+' '+u.name+' | '+u.role+'</strong> · HP '+u.hp+
   ' / 공격 '+(u.heal?'회복 '+u.heal:u.dmg)+' / 사거리 '+u.range+
   '<br>'+u.info;
 }else el.detail.textContent=demolish?'철거할 시설을 선택하세요. 건설 비용의 55%를 돌려받습니다.':'유닛 카드를 눌러 능력치와 상성을 확인하세요.';
 el.upgradeCost.textContent=s.eco>=7?'최대 레벨':costEco()+' CR';
 el.upgrade.disabled=!running||s.ended||s.paused||s.eco>=7||s.cash<costEco();
 const allies=s.units.filter(u=>u.side===0).length,enemies=s.units.length-allies;
 el.countUnits.textContent='아군 '+allies+' · 적군 '+enemies;
 el.status.textContent=s.ended?'전투 종료':!running?'전투 준비':s.paused?'일시정지':s.wave?'교전 진행 중':'출격 대기';
}
function enemyPick(){
 const counts={};for(const id of s.buildings){if(id)counts[id]=(counts[id]||0)+1;}
 const pool=['vanguard','rifle','rocket','tank','flak','artillery','drone','medic'];
 const weights=[2.5,3,1.8,1.8,1,1.4,1.6,.7];
 if(counts.drone)weights[4]+=counts.drone*4;
 if(counts.tank)weights[2]+=counts.tank*2.5;
 if(counts.artillery)weights[0]+=counts.artillery*3;
 if(counts.flak)weights[3]+=counts.flak*1.3;
 if(counts.vanguard)weights[3]+=counts.vanguard*.8;
 if(s.wave<2){weights[5]=.3;weights[7]=.2;}
 const available=pool.map((id,i)=>({id,w:weights[i]})).filter(o=>BY_ID[o.id].cost<=s.enemyCash);
 const total=available.reduce((a,o)=>a+o.w,0);
 if(!total)return null;
 let pick=Math.random()*total;
 for(const o of available){pick-=o.w;if(pick<=0)return o.id;}
 return available[available.length-1].id;
}
function enemyInvest(){
 const free=[];for(let i=0;i<15;i++)if(!s.enemyBuildings[i])free.push(i);
 let limit=s.wave<3?1:s.wave<7?2:3;
 while(free.length&&limit--){
  const id=enemyPick();if(!id)break;
  const ix=Math.floor(Math.random()*free.length),slot=free.splice(ix,1)[0];
  s.enemyBuildings[slot]=id;s.enemyCash-=BY_ID[id].cost;
 }
 if(s.enemyEco<3&&s.wave>3&&s.wave%4===0&&s.enemyCash>240){
  s.enemyCash-=150;s.enemyEco++;
 }
}
function spawn(side,slot,id){
 const u=BY_ID[id],row=Math.floor(slot/5),col=slot%5;
 const x=side===0?122-col*9:978+col*9;
 const y=LANES[row]+(col-2)*10+random(-6,6);
 s.units.push({
  id:s.nextId++,side,type:id,x,y,hp:u.hp,max:u.hp,cd:random(.2,.8),
  vx:side===0?1:-1,phase:random(0,6.28),fire:0,r:u.flying?12:id==='tank'?15:10
 });
 spark(x,y,TEAM[side],12);
}
function wave(){
 s.wave++;s.cash+=70+s.eco*12;
 s.enemyCash+=115+s.enemyEco*13+s.wave*4;
 enemyInvest();
 for(let i=0;i<15;i++){
  if(s.buildings[i])spawn(0,i,s.buildings[i]);
  if(s.enemyBuildings[i])spawn(1,i,s.enemyBuildings[i]);
 }
 flash('WAVE '+String(s.wave).padStart(2,'0')+' — DEPLOYED');
 tone(280,.19,'sawtooth',.05);tone(480,.21,'triangle',.04);
 announce('웨이브 '+s.wave+' 출격! 아군 시설 '+s.buildings.filter(Boolean).length+'개 · 적군 시설 '+s.enemyBuildings.filter(Boolean).length+'개');
 refreshUI();
}
function flash(message){
 el.flash.textContent=message;el.flash.classList.add('show');
 flashTimer=1.9;
}
function spark(x,y,color='#fbd29b',size=10){
 if(s.sparks.length>170)s.sparks.splice(0,30);
 s.sparks.push({x,y,color,r:size,max:.45,life:.45});
}
function label(x,y,value,color='#e8e9d9'){
 if(s.labels.length>60)s.labels.shift();
 s.labels.push({x,y,text:value,color,life:.85,max:.85});
}
function damage(unit,amount,source){
 if(unit.hp<=0)return;
 const def=BY_ID[unit.type];
 let val=Math.max(3,amount-def.armor*.67);
 if(source==='rocket'&&unit.type==='tank')val*=1.75;
 if(source==='flak'&&def.flying)val*=2.65;
 if(source==='artillery'&&unit.type==='vanguard')val*=.75;
 unit.hp-=val;unit.fire=.13;
 if(Math.random()<.18)label(unit.x,unit.y-20,Math.round(val),TEAM[unit.side===0?1:0]);
 if(unit.hp<=0){
  unit.hp=0;
  s.cash+=unit.side===1?6:0;
  spark(unit.x,unit.y,unit.side===0?'#6dd9ed':'#fa9278',20);
  if(unit.type==='tank'||unit.type==='artillery')spark(unit.x,unit.y,'#fec88f',28);
 }
}
function heal(unit,amount){
 if(!unit||unit.hp<=0)return;
 unit.hp=Math.min(unit.max,unit.hp+amount);
 spark(unit.x,unit.y,'#9bebaf',7);
}
function hitBase(side,dmg){
 if(s.ended)return;
 s.base[side]=Math.max(0,s.base[side]-dmg);
 spark(side===0?100:1000,280,TEAM[side],20);
 if(Math.random()<.34)label(side===0?111:977,random(210,350),'-'+Math.round(dmg),'#ffc896');
 if(s.base[side]<=0)finish(side===1);
}
function fireShot(attacker,target,baseSide=null){
 const d=BY_ID[attacker.type];const targetX=baseSide!==null?(baseSide===0?90:1010):target.x;
 const targetY=baseSide!==null?280:target.y;
 if(d.range<55){
  if(target)damage(target,d.dmg,attacker.type);
  else hitBase(baseSide,d.dmg);
  spark(targetX,targetY,'#ffe0a1',6);
 }else{
  s.shots.push({x:attacker.x,y:attacker.y,tx:targetX,ty:targetY,target:target||null,
   base:baseSide,side:attacker.side,speed:d.shot||340,dmg:d.dmg,source:attacker.type,
   splash:d.splash||0,life:2.2});
  if(s.shots.length>250)s.shots.shift();
 }
 attacker.fire=.13;
 if(Math.random()<.14)tone(attacker.type==='tank'?170:attacker.type==='artillery'?110:350,.04,'sawtooth',.009);
}
function explode(shot,x,y){
 spark(x,y,shot.source==='flak'?'#b5f7f5':'#f6c58c',shot.splash?shot.splash*.5:10);
 if(shot.splash){
  for(const unit of s.units){
   if(unit.hp<=0||unit.side===shot.side)continue;
   if(BY_ID[unit.type].flying && !BY_ID[shot.source].air)continue;
   const r=Math.hypot(unit.x-x,unit.y-y);
   if(r<shot.splash+unit.r)damage(unit,shot.dmg*(1-.57*r/(shot.splash+unit.r)),shot.source);
  }
 }else if(shot.target&&shot.target.hp>0&&Math.hypot(shot.target.x-x,shot.target.y-y)<32){
  damage(shot.target,shot.dmg,shot.source);
 }
}
function findTarget(u,def){
 if(def.heal){
  let best=null,bestScore=1e9;
  for(const other of s.units){
   if(other===u||other.side!==u.side||other.hp<=0||other.hp>=other.max-12)continue;
   const r=dist(u,other),score=r-(1-other.hp/other.max)*115;
   if(score<bestScore){best=other;bestScore=score;}
  }
  return best;
 }
 let best=null,bestScore=1e9;
 for(const other of s.units){
  if(other.side===u.side||other.hp<=0)continue;
  const targetDef=BY_ID[other.type];
  if(targetDef.flying&&!def.air)continue;
  const r=dist(u,other);
  const score=r-(u.type==='flak'&&targetDef.flying?165:0);
  if(score<bestScore){bestScore=score;best=other;}
 }
 return best;
}
function moveTowards(u,x,y,dt,mult=1){
 const dx=x-u.x,dy=y-u.y,d=Math.hypot(dx,dy)||1;
 u.x+=dx/d*BY_ID[u.type].speed*dt*mult;
 u.y+=dy/d*BY_ID[u.type].speed*dt*mult;
 u.vx=dx/d;
 u.x=clamp(u.x,45,1055);u.y=clamp(u.y,70,490);
}
function tickUnits(dt){
 for(const u of s.units){
  if(u.hp<=0)continue;
  const def=BY_ID[u.type];
  u.cd-=dt;u.fire=Math.max(0,u.fire-dt);u.phase+=dt*(def.flying?9:7);
  const target=findTarget(u,def);
  if(def.heal){
   if(target){
    const d=dist(u,target);
    if(d>def.range*.83)moveTowards(u,target.x,target.y,dt);
    else if(u.cd<=0){heal(target,def.heal);u.cd=def.rate;s.sparks.push({x:target.x,y:target.y,color:'#8bebb1',r:17,max:.52,life:.52});}
   }else{
    let teammate=null,nearest=1e6;
    for(const a of s.units)if(a.side===u.side&&a!==u&&a.hp>0&&!BY_ID[a.type].heal){
     const d=dist(u,a);if(d<nearest){nearest=d;teammate=a;}
    }
    if(teammate&&nearest>92)moveTowards(u,teammate.x,teammate.y,dt);
    else if(!teammate)moveTowards(u,u.side===0?650:450,LANES[1],dt,.4);
   }
   continue;
  }
  if(target){
   const d=dist(u,target);
   if(d>def.range*(def.range>60?.89:1))moveTowards(u,target.x,target.y,dt);
   else if(u.cd<=0){fireShot(u,target);u.cd=def.rate*random(.92,1.1);}
  }else{
   const enemyBase=u.side===0?1:0,point={x:enemyBase===0?91:1009,y:280};
   const d=dist(u,point);
   if(d>def.range+41)moveTowards(u,point.x,point.y,dt);
   else if(u.cd<=0){fireShot(u,null,enemyBase);u.cd=def.rate;}
  }
 }
 // Keep soldiers from visually stacking: a small lateral separation force.
 for(let i=0;i<s.units.length;i++){
  const a=s.units[i];if(a.hp<=0)continue;
  for(let j=i+1;j<s.units.length;j++){
   const b=s.units[j];if(b.hp<=0||a.side!==b.side)continue;
   const dx=a.x-b.x,dy=a.y-b.y,dd=dx*dx+dy*dy,need=a.r+b.r-4;
   if(dd>0&&dd<need*need){const d=Math.sqrt(dd),push=(need-d)*.19;a.x+=dx/d*push;b.x-=dx/d*push;a.y+=dy/d*push;b.y-=dy/d*push;}
  }
 }
 s.units=s.units.filter(u=>u.hp>0);
}
function tickShots(dt){
 for(let i=s.shots.length-1;i>=0;i--){
  const p=s.shots[i];p.life-=dt;
  if(p.target&&p.target.hp>0){p.tx=p.target.x;p.ty=p.target.y;}
  const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy);
  const travel=p.speed*dt;
  if(d<=travel+8 || p.life<=0){
   explode(p,p.tx,p.ty);s.shots.splice(i,1);continue;
  }
  p.x+=dx/d*travel;p.y+=dy/d*travel;
 }
}
function tickTurrets(dt){
 for(let side=0;side<=1;side++){
  s.turret[side]-=dt;
  if(s.turret[side]>0)continue;
  const pt={x:side===0?85:1015,y:280};
  let best=null,bestD=192;
  for(const u of s.units){if(u.side===side||u.hp<=0)continue;const d=dist(pt,u);if(d<bestD){bestD=d;best=u;}}
  if(best){
   damage(best,19,'turret');
   spark(best.x,best.y,TEAM[side],8);
   s.sparks.push({x:pt.x+(best.x-pt.x)*.48,y:(pt.y+best.y)*.5,color:TEAM[side],r:5,max:.10,life:.10});
   s.turret[side]=.52;
  }
 }
}
function finish(won){
 if(s.ended)return;
 s.ended=true;
 $('finishEyebrow').textContent=won?'VICTORY — ENEMY BASE DESTROYED':'DEFEAT — BASE LOST';
 $('finishTitle').textContent=won?'작전 승리':'기지 함락';
 $('finishTitle').style.color=won?'#ffe0a9':'#ff9985';
 $('finishDetail').textContent='총 '+s.wave+'웨이브 · 건물 '+s.buildings.filter(Boolean).length+'개 · 경제 Lv.'+s.eco+' · 상대 잔여 HP '+Math.ceil(s.base[1]);
 el.welcome.classList.add('hidden');el.finish.classList.remove('hidden');el.overlay.classList.remove('hidden');
 announce(won?'적 기지를 파괴했습니다.':'아군 기지가 파괴되었습니다.');
 tone(won?740:150,.4,'sawtooth',.065);
 refreshUI();
}
function simulate(dt){
 if(!running||s.paused||s.ended)return;
 const step=dt*s.speed;
 s.time+=step;s.next-=step;
 s.cash+=(4+s.eco*2)*step;
 s.enemyCash+=(4+s.enemyEco*2)*step;
 while(s.next<=0){s.next+=16;wave();}
 tickUnits(step);tickShots(step);tickTurrets(step);
 for(const a of s.sparks){a.life-=step;a.r+=step*8;}
 for(const a of s.labels){a.life-=step;a.y-=step*26;}
 s.sparks=s.sparks.filter(e=>e.life>0);s.labels=s.labels.filter(e=>e.life>0);
 if(flashTimer>0){flashTimer-=step;if(flashTimer<=0)el.flash.classList.remove('show');}
 updateTimer+=dt;
 if(updateTimer>.17){updateTimer=0;refreshUI();}
}
function resize(){
 const ratio=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);
 g.setTransform(ratio,0,0,ratio,0,0);
}
function drawGround(){
 const bg=g.createLinearGradient(0,0,W,H);
 bg.addColorStop(0,'#344448');bg.addColorStop(.50,'#3c403c');bg.addColorStop(1,'#4a3c36');
 g.fillStyle=bg;g.fillRect(0,0,W,H);
 g.fillStyle='#1a272966';g.fillRect(0,54,W,58);g.fillRect(0,449,W,62);
 for(let i=0;i<3;i++){
  const y=LANES[i];g.fillStyle=i===1?'#a18e6120':'#b2a57e13';g.fillRect(0,y-36,W,72);
  g.strokeStyle='#d6b78420';g.setLineDash([17,17]);g.lineWidth=2;
  g.beginPath();g.moveTo(130,y);g.lineTo(970,y);g.stroke();g.setLineDash([]);
 }
 for(const d of DECOR){
  g.fillStyle='rgba(8,17,18,'+d.a+')';
  g.beginPath();g.ellipse(d.x,d.y,d.r*1.7,d.r*.5,-.16,0,Math.PI*2);g.fill();
  g.fillStyle='#e6be8030';g.fillRect(d.x+5,d.y-4,Math.max(2,d.r*.22),2);
 }
 // Central contested zone with weathered tracks.
 g.strokeStyle='#ecbd7e17';g.lineWidth=3;
 for(let y=128;y<=432;y+=152){g.beginPath();g.moveTo(130,y);g.bezierCurveTo(380,y+12,620,y-14,970,y);g.stroke();}
 g.strokeStyle='#d1dbc01e';g.lineWidth=1;
 for(let x=0;x<W;x+=50){g.beginPath();g.moveTo(x,25);g.lineTo(x,H-25);g.stroke();}
 for(let y=0;y<H;y+=50){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
 g.fillStyle='#17282d55';g.fillRect(515,0,70,H);
 g.strokeStyle='#d8c2a03c';g.lineWidth=2;g.setLineDash([9,11]);
 g.beginPath();g.moveTo(550,40);g.lineTo(550,520);g.stroke();g.setLineDash([]);
 g.fillStyle='#e2cfa844';g.font='900 11px monospace';g.textAlign='center';
 g.fillText('CONTESTED',550,38);
}
function poly(points,fill,stroke=null){
 g.beginPath();g.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);g.closePath();
 g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=1.8;g.stroke();}
}
function drawBase(side){
 const x=side===0?70:1030,y=280,ally=side===0,sign=ally?1:-1,c=TEAM[side];
 g.save();g.translate(x,y);
 g.fillStyle='#06111580';g.beginPath();g.ellipse(0,13,66,132,0,0,Math.PI*2);g.fill();
 g.fillStyle=ally?'#2a525d':'#654237';g.strokeStyle=c;g.lineWidth=2;
 g.fillRect(-42,-95,84,190);g.strokeRect(-42,-95,84,190);
 for(let k=-1;k<=1;k++){
  g.fillStyle='#121c23';g.fillRect(-52,k*59-21,104,42);
  g.fillStyle=ally?'#5da8b7':'#aa6655';g.fillRect(-48,k*59-17,96,5);
 }
 g.fillStyle=ally?'#1b3742':'#55362e';g.fillRect(-22,-65,44,130);
 g.strokeStyle=c;g.strokeRect(-22,-65,44,130);
 g.fillStyle=c;g.beginPath();g.arc(sign*23,0,9,0,Math.PI*2);g.fill();
 g.fillStyle='#f8e3ba';g.font='900 11px monospace';g.textAlign='center';g.fillText(ally?'HQ-01':'HQ-X',0,-111);
 const hpPct=s.base[side]/1800;
 g.fillStyle='#112028';g.fillRect(-40,103,80,8);g.fillStyle=c;g.fillRect(-40,103,80*hpPct,8);
 g.restore();
}
function drawSoldier(u,d){
 const side=u.side,c=TEAM[side],t=u.phase,dir=u.vx>=0?1:-1;
 g.save();g.translate(u.x,u.y);
 if(d.flying){
  g.fillStyle='#030e1499';g.beginPath();g.ellipse(0,12,18,7,0,0,7);g.fill();
  g.translate(0,-13+Math.sin(t)*3);
  g.rotate(Math.sin(t*.7)*.10);
  poly([[-20,-4],[-5,-4],[0,-13],[5,-4],[20,-4],[12,7],[-12,7]],c,'#162832');
  g.fillStyle='#18262e';g.fillRect(-7,-3,14,11);
  g.fillStyle='#fbe1b0';g.beginPath();g.arc(0,1,3,0,7);g.fill();
  g.fillStyle=c;for(const x of [-19,19]){g.beginPath();g.arc(x,-4,5,0,7);g.fill();}
 }else if(u.type==='tank'){
  g.fillStyle='#0615178c';g.beginPath();g.ellipse(0,7,21,14,0,0,7);g.fill();
  g.fillStyle='#151f23';g.fillRect(-19,-13,36,8);g.fillRect(-19,6,36,8);
  g.fillStyle=c;g.fillRect(-17,-10,34,19);
  g.strokeStyle='#1c2930';g.lineWidth=2;g.strokeRect(-17,-10,34,19);
  g.save();g.scale(dir,1);g.fillStyle='#263039';g.fillRect(-3,-6,15,12);
  g.strokeStyle='#f1d4a7';g.lineWidth=5;g.beginPath();g.moveTo(8,0);g.lineTo(25,-2);g.stroke();g.restore();
 }else if(u.type==='artillery'){
  g.fillStyle='#152326';g.fillRect(-12,-10,24,25);g.fillStyle=c;g.fillRect(-9,-7,18,18);
  g.strokeStyle='#cab18d';g.lineWidth=6;g.beginPath();g.moveTo(0,-1);g.lineTo(dir*27,-3);g.stroke();
  g.fillStyle='#16252b';for(const x of [-12,12]){g.beginPath();g.arc(x,12,6,0,7);g.fill();}
 }else if(u.type==='flak'){
  g.fillStyle='#07161b99';g.beginPath();g.ellipse(0,5,17,11,0,0,7);g.fill();
  g.fillStyle=c;g.fillRect(-13,-10,26,20);
  g.strokeStyle='#e9ceb0';g.lineWidth=4;
  for(const offset of [-6,6]){g.beginPath();g.moveTo(0,offset);g.lineTo(dir*24,offset);g.stroke();}
  g.fillStyle='#273640';g.fillRect(-6,-4,12,8);
 }else{
  const march=Math.sin(t)*3;
  g.fillStyle='#020e1380';g.beginPath();g.ellipse(0,6,13,7,0,0,7);g.fill();
  g.strokeStyle='#171f22';g.lineWidth=5;
  g.beginPath();g.moveTo(-3,4);g.lineTo(-6+march,11);g.moveTo(5,4);g.lineTo(6-march,11);g.stroke();
  g.fillStyle=c;g.beginPath();g.ellipse(0,0,10,9,0,0,7);g.fill();
  g.fillStyle='#152c35';g.beginPath();g.arc(-2,-4,5.5,0,7);g.fill();
  g.fillStyle='#e2c8a5';g.fillRect(0,-3,3,3);
  g.strokeStyle=u.type==='medic'?'#aaf0bb':'#efe0ba';g.lineWidth=u.type==='rocket'?5:3.5;
  g.beginPath();g.moveTo(dir*4,-1);g.lineTo(dir*(u.type==='rocket'?17:15),-4);g.stroke();
  if(u.type==='medic'){
   g.strokeStyle='#baf3ce';g.lineWidth=2;
   g.beginPath();g.moveTo(-3,0);g.lineTo(3,0);g.moveTo(0,-3);g.lineTo(0,3);g.stroke();
  }
 }
 if(u.fire>0){g.fillStyle='#ffe8b2';g.globalAlpha=u.fire/.13;g.beginPath();g.arc(dir*18,-4,6,0,7);g.fill();g.globalAlpha=1;}
 if(u.hp<u.max){
  g.fillStyle='#0a161b';g.fillRect(-16,d.flying?-28:-23,32,4);
  g.fillStyle=c;g.fillRect(-16,d.flying?-28:-23,32*clamp(u.hp/u.max,0,1),4);
 }
 g.restore();
}
function drawShots(){
 for(const p of s.shots){
  g.strokeStyle=p.source==='rocket'||p.source==='artillery'?'#ffc680':p.side===0?'#9aefff':'#ffc0a0';
  g.lineWidth=p.splash?3.8:2.3;
  g.shadowBlur=12;g.shadowColor=g.strokeStyle;
  g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x+(p.tx-p.x)*.14,p.y+(p.ty-p.y)*.14);g.stroke();g.shadowBlur=0;
  g.fillStyle=g.strokeStyle;g.beginPath();g.arc(p.x,p.y,p.splash?4.2:2.5,0,7);g.fill();
 }
}
function drawSparks(){
 for(const e of s.sparks){
  const a=clamp(e.life/e.max,0,1);
  g.globalAlpha=a*.8;g.strokeStyle=e.color;g.lineWidth=2;
  g.beginPath();g.arc(e.x,e.y,e.r*(1.4-a*.4),0,7);g.stroke();
  g.fillStyle=e.color;g.beginPath();g.arc(e.x,e.y,Math.max(1,3*a),0,7);g.fill();
 }
 g.globalAlpha=1;
 g.font='900 13px monospace';g.textAlign='center';
 for(const l of s.labels){g.globalAlpha=clamp(l.life/l.max,0,1);g.fillStyle=l.color;g.fillText(l.text,l.x,l.y);}
 g.globalAlpha=1;
}
function draw(){
 g.clearRect(0,0,W,H);drawGround();drawBase(0);drawBase(1);
 const ordered=s.units.slice().sort((a,b)=>a.y-b.y);
 for(const u of ordered)drawSoldier(u,BY_ID[u.type]);
 drawShots();drawSparks();
 if(s.paused&&!s.ended){
  g.fillStyle='#05121bb5';g.fillRect(0,0,W,H);
  g.font='900 53px system-ui';g.fillStyle='#ffe0ae';g.textAlign='center';g.fillText('PAUSED',W/2,H/2-4);
  g.font='600 16px system-ui';g.fillStyle='#e9ded2';g.fillText('스페이스바 또는 일시정지 버튼을 눌러 재개',W/2,H/2+34);
 }
}
function loop(now){
 const dt=Math.min((now-last)/1000||0,.04);last=now;
 simulate(dt);draw();requestAnimationFrame(loop);
}
el.cards.addEventListener('click',e=>{
 const btn=e.target.closest('[data-unit]');if(btn)selectCard(btn.dataset.unit);
});
el.grid.addEventListener('click',e=>{
 const btn=e.target.closest('[data-cell]');if(btn)buildCell(Number(btn.dataset.cell));
});
el.grid.addEventListener('contextmenu',e=>{
 const btn=e.target.closest('[data-cell]');if(!btn)return;
 e.preventDefault();demolishCell(Number(btn.dataset.cell));refreshUI();
});
$('startBtn').addEventListener('click',startGame);
$('retryBtn').addEventListener('click',startGame);
$('resetBtn').addEventListener('click',()=>{
 if(!running){startGame();return;}
 startGame();announce('전투를 새로 시작했습니다. 건물을 다시 배치하세요.');
});
$('cancelBtn').addEventListener('click',()=>{chosen=null;demolish=false;refreshUI();});
el.demolish.addEventListener('click',toggleDemolish);
el.upgrade.addEventListener('click',upgradeEconomy);
el.pause.addEventListener('click',()=>{
 if(!running||s.ended)return;
 s.paused=!s.paused;el.pause.textContent=s.paused?'▶ 계속하기':'Ⅱ 일시정지';refreshUI();
});
el.speed.addEventListener('click',()=>{
 if(!running||s.ended)return;s.speed=s.speed===1?2:1;el.speed.textContent='▶ '+s.speed+'×';tone(520,.06,'sine');
});
el.sound.addEventListener('click',()=>{
 muted=!muted;el.sound.textContent=muted?'♪ OFF':'♪ ON';
 if(!muted)tone(560,.08,'sine');
});
$('helpBtn').addEventListener('click',()=>{$('helpDialog').showModal();});
$('closeHelp').addEventListener('click',()=>{$('helpDialog').close();});
document.addEventListener('keydown',e=>{
 if($('helpDialog').open)return;
 if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 if(e.key>='1'&&e.key<='8'){selectCard(TYPES[Number(e.key)-1].id);}
 else if(e.key==='Escape'){chosen=null;demolish=false;refreshUI();}
 else if(e.code==='Space'){
  e.preventDefault();if(running&&!s.ended){s.paused=!s.paused;el.pause.textContent=s.paused?'▶ 계속하기':'Ⅱ 일시정지';refreshUI();}
 }
});
window.addEventListener('resize',resize);
resize();initialState();requestAnimationFrame(loop);
})();