(()=>{
'use strict';
const $=id=>document.getElementById(id);
const CW=1100,CH=520,HOME_H=340,MAX_BASE=2000,MAX_TURRET=520,INTERVAL=20;
const COLORS=['#79dfee','#ff9a79'],LANES=[148,260,372];
const ROLE=[
 {key:'charge',name:'돌격',mark:'⚔',token:'⚔',cost:65,hp:115,damage:21,armor:1,range:29,rate:.77,speed:82,airTarget:false,kind:'ground',tips:'적 포병·지원병 후방을 빠르게 찌릅니다.',good:[5,7],bad:[3,1]},
 {key:'rifle',name:'사격',mark:'⌖',token:'⌖',cost:95,hp:108,damage:17,armor:1,range:164,rate:.8,speed:60,airTarget:true,kind:'ground',tips:'저렴한 범용 원거리 병력. 공중도 공격합니다.',good:[0,7],bad:[3,5]},
 {key:'breaker',name:'대장갑',mark:'◆',token:'◆',cost:150,hp:94,damage:47,armor:0,range:208,rate:1.76,speed:49,airTarget:true,kind:'ground',tips:'전차·중장갑을 파괴하지만 근접 압박에 취약합니다.',good:[3,4],bad:[0,1]},
 {key:'armor',name:'장갑',mark:'▣',token:'▣',cost:205,hp:390,damage:32,armor:9,range:120,rate:1.27,speed:35,airTarget:false,kind:'ground',tips:'앞줄에서 버티며 일반 총격을 흡수합니다.',good:[1,4],bad:[2,6]},
 {key:'antiair',name:'대공',mark:'✣',token:'✣',cost:165,hp:175,damage:16,armor:3,range:228,rate:.57,speed:47,airTarget:true,kind:'ground',tips:'비행체를 우선 공격하며 대공 피해량이 높습니다.',good:[6],bad:[3,2]},
 {key:'siege',name:'포격',mark:'✹',token:'✹',cost:245,hp:114,damage:69,armor:0,range:317,rate:2.55,speed:30,airTarget:false,kind:'ground',blast:58,tips:'후열 광역 화력. 근접 침투에는 취약합니다.',good:[1,4],bad:[0,6]},
 {key:'flyer',name:'비행',mark:'◇',token:'◇',cost:205,hp:160,damage:24,armor:1,range:149,rate:.86,speed:92,airTarget:true,kind:'air',tips:'대부분의 지상 공격을 회피합니다. 대공포를 조심하세요.',good:[0,3],bad:[4,1]},
 {key:'support',name:'지원',mark:'✚',token:'✚',cost:145,hp:136,damage:0,heal:36,armor:1,range:139,rate:1.24,speed:61,airTarget:false,kind:'ground',tips:'부상당한 전열을 치료하며 전투 지속력을 높입니다.',good:[3,1],bad:[0,5]}
];
const FACTIONS=[
 {id:'forge',name:'철갑연합',tag:'FORGE UNION',logo:'▦',color:'#79ddea',bonus:'최대 HP +9% · 이동 속도 −4%',mut:{hp:1.09,dmg:1,speed:.96},units:['진격 보병','기관총병','관통 로켓','철갑 전차','복합 대공포','궤도 자주포','추적 비행기','전장 구호병'],slogan:'공학·화력·단단한 전열',secondary:'#224956'},
 {id:'brood',name:'심연군체',tag:'DUSK BROOD',logo:'♜',color:'#b9df8d',bonus:'이동 속도 +12% · 최대 HP −8%',mut:{hp:.92,dmg:1,speed:1.12},units:['송곳 발톱','산성 침벌','부식 포자충','거대 갑각수','가시 포자탑','폭식 투석충','비행 포식자','치유 공생충'],slogan:'생체 돌파·기동·포식',secondary:'#344d2b'},
 {id:'astral',name:'성운결사',tag:'ASTRAL ORDER',logo:'✧',color:'#d6b8ff',bonus:'공격/치유 +8% · 최대 HP −5%',mut:{hp:.95,dmg:1.08,speed:1},units:['수호 창병','광자 사수','균열 파괴자','수정 방패병','영점 수호기','공명 투창대','섬광 비행체','생명 융합사'],slogan:'에너지·보호막·정밀 타격',secondary:'#443257'}
];
const RNAME=ROLE.map(r=>r.name),SPRITES=new Map();
let selectedFaction=0,state=null,selectedRole=null,demolition=false,activeView='base',lastFrame=0,uiElapsed=0;
let audio=null,bannerSeconds=0,barrageSeconds=0,stamp=0;
function clamp(n,a,b){return Math.min(b,Math.max(a,n));}
function random(a,b){return a+Math.random()*(b-a);}
function money(n){return Math.floor(n).toLocaleString('ko-KR');}
function getDef(role,faction){
 const r=ROLE[role],f=FACTIONS[faction];
 return {...r,unitName:f.units[role],factionName:f.name,hp:r.hp*f.mut.hp,damage:r.damage*f.mut.dmg,heal:(r.heal||0)*f.mut.dmg,speed:r.speed*f.mut.speed};
}
function ecoCost(){return Math.round(155*Math.pow(1.6,state.eco));}
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
 state={live:false,ended:false,paused:false,rate:1,cash:600,enemyCash:230,eco:0,enemyEco:0,weapon:0,armor:0,
 wave:0,next:INTERVAL,elapsed:0,baseHP:[MAX_BASE,MAX_BASE],turretHP:[MAX_TURRET,MAX_TURRET],
 built:Array(15).fill(null),enemyBuilt:Array(15).fill(null),units:[],shots:[],effects:[],floaters:[],
 nukes:1,barrageCd:0,faction:selectedFaction,enemyFaction:(selectedFaction+1+Math.floor(Math.random()*2))%3,
 nextUnitId:1,attackCount:0};
 state.enemyBuilt[1]=0;state.enemyBuilt[7]=1;state.enemyBuilt[13]=1;
 selectedRole=null;demolition=false;bannerSeconds=0;barrageSeconds=0;
 $('startOverlay').classList.remove('hidden');$('endOverlay').classList.add('hidden');
 $('pauseButton').textContent='Ⅱ 일시정지';$('speedButton').textContent='▶ 1×';
 updateUI(true);setMessage('진영을 선택하고 전투를 시작하세요.');
}
function start(){
 selectedFaction=Number(document.querySelector('[data-faction].selected')?.dataset.faction||selectedFaction);
 reset();
 state.faction=selectedFaction;
 state.enemyFaction=(selectedFaction+1+Math.floor(Math.random()*2))%3;
 state.live=true;
 $('startOverlay').classList.add('hidden');
 changeView('base');
 setMessage('전투 시작! 20초 이내에 생산 시설을 배치하세요.');
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
 if(old===selectedRole){setMessage('이미 같은 시설이 설치되어 있습니다.');return;}
 const refund=old===null?0:Math.floor(ROLE[old].cost*.55),price=ROLE[selectedRole].cost-refund;
 if(price>state.cash){setMessage('자원 부족 · '+Math.ceil(price-state.cash)+' CR이 더 필요합니다.');return;}
 state.cash-=price;state.built[index]=selectedRole;
 setMessage(FACTIONS[state.faction].units[selectedRole]+' 생산 시설 설치 완료');
 chirp(540,.07);updateUI(true);
}
function upgrade(kind){
 if(!state.live||state.paused||state.ended)return;
 if(kind==='econ'&&state.eco<7&&state.cash>=ecoCost()){
  state.cash-=ecoCost();state.eco++;
  setMessage('채굴망 Lv.'+state.eco+' · 초당 +'+(4+state.eco*2)+' CR');chirp(650,.14);
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
 for(const u of invaders){u.hp=0;pulse(u.x,u.y,'#f2d489',40);}
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
 const row=Math.floor(slot/5),col=slot%5;
 const x=side===0?226+col*9:874-col*9;
 const y=LANES[row]+(col-2)*9+random(-5,5);
 const bonus=side===0?1+.09*state.armor:1;
 state.units.push({uid:state.nextUnitId++,side,role,faction,x,y,hp:def.hp*bonus,maxHP:def.hp*bonus,
  cooldown:random(.1,.7),anim:random(0,6),facing:side===0?1:-1,blink:0});
 pulse(x,y,COLORS[side],12);
}
function aiChoose(){
 const counts=Array(8).fill(0);
 for(const r of state.built)if(r!==null)counts[r]++;
 const weights=[3,3.1,2.4,2.1,1.7,1.6,1.7,.6];
 weights[4]+=counts[6]*5;
 weights[2]+=counts[3]*4;
 weights[0]+=counts[5]*3+counts[7]*2;
 weights[3]+=counts[1]*1.7;
 weights[6]+=counts[3]*1.3;
 weights[5]+=counts[4]*1.2;
 if(state.wave<3){weights[5]*=.25;weights[7]*=.45;}
 let opts=ROLE.map((r,i)=>({i,w:weights[i]})).filter(z=>ROLE[z.i].cost<=state.enemyCash);
 if(!opts.length)return null;
 let roll=Math.random()*opts.reduce((a,b)=>a+b.w,0);
 for(const item of opts){roll-=item.w;if(roll<=0)return item.i;}
 return opts[opts.length-1].i;
}
function aiInvest(){
 const open=state.enemyBuilt.map((v,i)=>v===null?i:null).filter(v=>v!==null);
 let count=state.wave<2?1:state.wave<5?2:3;
 while(open.length&&count--){
  const role=aiChoose();if(role===null)break;
  const ix=Math.floor(Math.random()*open.length),slot=open.splice(ix,1)[0];
  state.enemyBuilt[slot]=role;state.enemyCash-=ROLE[role].cost;
 }
 if(state.wave>4&&state.wave%5===0&&state.enemyEco<4&&state.enemyCash>=155){state.enemyCash-=155;state.enemyEco++;}
}
function wave(){
 state.wave++;state.cash+=65+10*state.eco;
 state.enemyCash+=90+state.wave*5+state.enemyEco*10;
 aiInvest();
 for(let i=0;i<15;i++){
  if(state.built[i]!==null)createUnit(0,i,state.built[i]);
  if(state.enemyBuilt[i]!==null)createUnit(1,i,state.enemyBuilt[i]);
 }
 banner('WAVE '+String(state.wave).padStart(2,'0')+' · DEPLOYED');
 setMessage('웨이브 '+state.wave+' 출격 · 아군 '+state.built.filter(v=>v!==null).length+'기 / 적군 '+state.enemyBuilt.filter(v=>v!==null).length+'기');
 chirp(430,.17);updateUI(true);
}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function calcDamage(attacker,target,amount){
 let out=amount;
 if(attacker!==null){
  const role=ROLE[attacker];
  if(role.good.includes(target.role))out*=1.55;
  if(role.bad.includes(target.role))out*=.7;
 }
 const armor=getDef(target.role,target.faction).armor;
 return Math.max(3,out-armor*.66);
}
function damage(u,amount,source){
 if(u.hp<=0)return;
 const hit=calcDamage(typeof source==='number'?source:null,u,amount);
 u.hp-=hit;u.blink=.12;
 if(Math.random()<.15)floatText(u.x,u.y-25,Math.round(hit),COLORS[u.side===0?1:0]);
 if(u.hp<=0){u.hp=0;pulse(u.x,u.y,COLORS[u.side],22);if(u.side===1)state.cash+=5;}
}
function heal(u,amount){u.hp=Math.min(u.maxHP,u.hp+amount);pulse(u.x,u.y,'#94f7a9',11);}
function structureHit(side,amount){
 if(state.turretHP[side]>0){
  state.turretHP[side]=Math.max(0,state.turretHP[side]-amount);
  pulse(side===0?188:912,260,'#fcb78b',23);
  if(state.turretHP[side]===0){
   floatText(side===0?188:912,190,'DEFENSE DOWN','#ffad82');
   setMessage(side===0?'아군 방어 포탑 파괴! 핵심 기지를 방어하세요.':'적군 방어 포탑 파괴! 핵심 기지를 공격합니다.');
  }
 }else{
  state.baseHP[side]=Math.max(0,state.baseHP[side]-amount);
  pulse(side===0?89:1011,260,'#f8aa8a',32);
  if(state.baseHP[side]<=0)endMatch(side===1);
 }
}
function nearestUnit(u,def){
 let candidate=null,score=1e7;
 for(const v of state.units){
  if(v.hp<=0||v.side===u.side||(!def.airTarget&&ROLE[v.role].kind==='air'))continue;
  const d=distance(u,v);
  const bonus=u.role===4&&ROLE[v.role].kind==='air'?175:0;
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
function move(u,x,y,dt){
 const dx=x-u.x,dy=y-u.y,d=Math.hypot(dx,dy)||1,def=getDef(u.role,u.faction);
 const step=def.speed*dt;
 u.x+=dx/d*Math.min(step,d);u.y+=dy/d*Math.min(step,d);
 u.facing=dx>=0?1:-1;u.x=clamp(u.x,30,1070);u.y=clamp(u.y,72,448);
}
function fire(u,t=null,baseSide=null){
 const def=getDef(u.role,u.faction),x=t?t.x:baseSide===0?(state.turretHP[0]>0?190:90):(state.turretHP[1]>0?910:1010),y=t?t.y:260;
 if(def.range<48){
  if(t)damage(t,def.damage*(u.side===0?1+.08*state.weapon:1),u.role);
  else structureHit(baseSide,def.damage*(u.side===0?1+.08*state.weapon:1));
  pulse(x,y,'#ffdbae',6);
 }else{
  state.shots.push({side:u.side,source:u.role,x:u.x,y:u.y,tx:x,ty:y,
   target:t,baseSide,damage:def.damage*(u.side===0?1+.08*state.weapon:1),
   speed:200+(def.range<200?205:120),blast:def.blast||0,ttl:3.5});
 }
 u.blink=.13;
}
function projectileImpact(p){
 const x=p.tx,y=p.ty;
 pulse(x,y,p.source===4?'#8cebf4':'#ffc88d',p.blast?45:12);
 if(p.baseSide!==null){structureHit(p.baseSide,p.damage);return;}
 if(p.blast){
  for(const v of state.units)if(v.hp>0&&v.side!==p.side){
   if(ROLE[v.role].kind==='air'&&!ROLE[p.source].airTarget)continue;
   const d=Math.hypot(v.x-x,v.y-y);
   if(d<=p.blast+10)damage(v,p.damage*(1-.48*d/(p.blast+10)),p.source);
  }
 }else if(p.target&&p.target.hp>0&&Math.hypot(p.target.x-x,p.target.y-y)<40){
  damage(p.target,p.damage,p.source);
 }
}
function tick(dt){
 if(!state.live||state.paused||state.ended)return;
 const ds=dt*state.rate;
 state.elapsed+=ds;state.next-=ds;state.cash+=(4+2*state.eco)*ds;
 state.enemyCash+=(4+2*state.enemyEco)*ds;
 state.barrageCd=Math.max(0,state.barrageCd-ds);
 while(state.next<=0){state.next+=INTERVAL;wave();}
 for(const u of state.units){
  if(u.hp<=0)continue;
  const def=getDef(u.role,u.faction);
  u.cooldown-=ds;u.anim+=ds*9;u.blink=Math.max(0,u.blink-ds);
  if(u.role===7){
   const mate=nearInjured(u);
   if(mate){
    if(distance(u,mate)>def.range*.72)move(u,mate.x,mate.y,ds);
    else if(u.cooldown<=0){heal(mate,def.heal*(u.side===0?1+.08*state.weapon:1));u.cooldown=def.rate;}
   }else{
    const mate2=state.units.find(v=>v.side===u.side&&v.role!==7&&v.hp>0);
    if(mate2&&distance(u,mate2)>94)move(u,mate2.x,mate2.y,ds);
    else if(!mate2)move(u,u.side===0?850:250,260,ds);
   }
   continue;
  }
  const target=nearestUnit(u,def);
  if(target){
   if(distance(u,target)>def.range*(def.range>65?.88:1))move(u,target.x,target.y,ds);
   else if(u.cooldown<=0){fire(u,target);u.cooldown=def.rate*random(.9,1.09);}
  }else{
   const side=1-u.side,tx=side===0?(state.turretHP[0]>0?190:90):(state.turretHP[1]>0?910:1010);
   const d=Math.hypot(u.x-tx,u.y-260);
   if(d>def.range+15)move(u,tx,260,ds);
   else if(u.cooldown<=0){fire(u,null,side);u.cooldown=def.rate;}
  }
 }
 for(let i=state.shots.length-1;i>=0;i--){
  const p=state.shots[i];p.ttl-=ds;
  if(p.target&&p.target.hp>0){p.tx=p.target.x;p.ty=p.target.y;}
  const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy),step=p.speed*ds;
  if(d<step+6||p.ttl<=0){projectileImpact(p);state.shots.splice(i,1);}
  else{p.x+=dx/d*step;p.y+=dy/d*step;}
 }
 for(let side=0;side<=1;side++){
  const near=state.units.filter(u=>u.side!==side&&u.hp>0&&Math.hypot(u.x-(side===0?190:910),u.y-260)<190);
  if(near.length&&state.turretHP[side]>0){
   state['cool'+side]=(state['cool'+side]||0)-ds;
   if(state['cool'+side]<=0){
    state['cool'+side]=.48;
    const target=near.reduce((a,b)=>distance(a,{x:side===0?190:910,y:260})<distance(b,{x:side===0?190:910,y:260})?a:b);
    damage(target,23,'turret');pulse(target.x,target.y,COLORS[side],9);
   }
  }
 }
 state.units=state.units.filter(v=>v.hp>0);
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
 $('endTitle').textContent=win?'작전 승리':'기지 함락';
 $('endTitle').style.color=win?'#fbd89b':'#f69a8e';
 $('endSummary').textContent=state.wave+'웨이브 · '+state.built.filter(v=>v!==null).length+'개 생산 시설 · 무기 Lv.'+state.weapon+' / 장갑 Lv.'+state.armor;
 $('endOverlay').classList.remove('hidden');
 setMessage(win?'적군 핵심 기지 파괴 · 승리':'아군 핵심 기지 파괴 · 패배');
}
function roleMatchupHtml(role){
 const r=ROLE[role];
 return '<span class="tag strong">'+(role===7?'시너지 ':'강점 ')+r.good.map(i=>ROLE[i].mark+ROLE[i].name).join(' · ')+'</span>'+
 '<span class="tag weak">약점 '+r.bad.map(i=>ROLE[i].mark+ROLE[i].name).join(' · ')+'</span>';
}
function updateUI(full=false){
 if(!state)return;
 $('cash').textContent=money(state.cash);
 $('income').textContent='+'+(4+2*state.eco);
 $('wave').textContent=String(state.wave).padStart(2,'0');
 $('timer').textContent=Math.max(0,state.next).toFixed(1);
 $('myHealth').textContent=Math.ceil(state.baseHP[0])+' / '+MAX_BASE;
 $('enemyHealth').textContent=Math.ceil(state.baseHP[1])+' / '+MAX_BASE;
 $('myHealthFill').style.width=100*state.baseHP[0]/MAX_BASE+'%';
 $('enemyHealthFill').style.width=100*state.baseHP[1]/MAX_BASE+'%';
 $('factionLabel').textContent=FACTIONS[state.faction].name;
 $('enemyFactionLabel').textContent='VS '+FACTIONS[state.enemyFaction].name;
 const inv=state.units.filter(u=>u.side===1&&u.x<410).length;
 $('baseAlert').textContent=inv>0?'침공 경보 · '+inv+'기':state.turretHP[0]===0?'방어 포탑 파괴':'기지 안전';
 $('baseAlert').classList.toggle('danger',inv>0||state.turretHP[0]===0);
 $('warningDot').hidden=!(inv>0||state.turretHP[0]===0);
 $('builtCount').textContent=state.built.filter(x=>x!==null).length+' / 15';
 $('friendlyCount').textContent=state.units.filter(x=>x.side===0).length;
 $('hostileCount').textContent=state.units.filter(x=>x.side===1).length;
 $('frontStatus').textContent=inv?'⚠ 아군 기지 침공':state.units.some(x=>x.side===0&&x.x>690)?'적 기지 압박':'중앙 전선';
 $('battleStatus').textContent=state.ended?'전투 종료':!state.live?'작전 대기':state.paused?'일시정지':inv?'⚠ 본진 침공':'전투 진행 중';
 const nukeTargets=state.units.filter(u=>u.side===1&&u.x<=550);
 const nukeAllowed=(state.baseHP[0]<=1400||nukeTargets.some(u=>u.x<370))&&nukeTargets.length>0;
 $('nukeInfo').textContent=state.nukes?'1회 남음 · '+(nukeAllowed?'발동 가능':'침공/위기 시 사용 가능'):'사용 완료';
 $('nukeButton').disabled=!(state.nukes&&nukeAllowed&&state.live&&!state.paused&&!state.ended);
 $('barrageInfo').textContent=state.barrageCd>0?'재충전 '+Math.ceil(state.barrageCd)+'초':'비용 260 CR · 적 병력 필수';
 $('barrageButton').disabled=!(state.live&&!state.ended&&!state.paused&&state.barrageCd<=0&&state.cash>=260&&state.units.some(u=>u.side===1));
 const econ=ecoCost(),weapon=weaponCost(),armor=armorCost();
 $('econInfo').textContent='레벨 '+state.eco+' / 7 · 수입 +'+(4+state.eco*2)+'/초';
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
   const portrait=sprite(state.faction,i,0);
   const icon=typeof portrait.toDataURL==='function'?'<img class="pixel-preview" src="'+portrait.toDataURL('image/png')+'" alt="" aria-hidden="true">':r.token;
   return '<button class="unit-card'+(selectedRole===i?' selected':'')+'" data-role="'+i+'" title="'+r.tips+
    '"><span class="uc-top">'+r.mark+' '+r.name+' <span>0'+(i+1)+'</span></span><span class="uc-sprite">'+icon+
    '</span><span class="uc-name">'+f.units[i]+'</span><span class="uc-role">'+r.name+' · '+(r.kind==='air'?'공중':'지상')+'</span>'+
    '<span class="uc-cost">'+r.cost+' CR</span><span class="good-counter">'+(i===7?'지원':'강점')+': '+r.good.map(x=>ROLE[x].mark).join(' ')+'</span><span class="bad-counter">약점: '+r.bad.map(x=>ROLE[x].mark).join(' ')+'</span></button>';
  }).join('');
  $('buildGrid').innerHTML=state.built.map((id,i)=>
   '<button class="build-cell'+(id!==null?' occupied':'')+(demolition&&id!==null?' demolition':'')+'" data-cell="'+i+'" aria-label="'+(id!==null?f.units[id]:'빈 슬롯')+'">'+
   (id!==null?'<span class="cell-icon">'+ROLE[id].mark+'</span><span class="cell-name">'+f.units[id]+'</span>':
    '<span class="cell-icon">+</span><span class="cell-position">'+(Math.floor(i/5)+1)+'-'+(i%5+1)+'</span>')+'</button>').join('');
  $('demolishButton').classList.toggle('selected',demolition);
  $('unitDetails').innerHTML=selectedRole!==null?'<b>'+f.units[selectedRole]+'</b> · '+ROLE[selectedRole].name+
    ' / '+ROLE[selectedRole].cost+' CR<br>'+ROLE[selectedRole].tips+'<div class="matchups">'+roleMatchupHtml(selectedRole)+
    '</div><span>HP '+Math.round(getDef(selectedRole,state.faction).hp)+' · 피해 '+Math.round(getDef(selectedRole,state.faction).damage)+
    ' · 사거리 '+ROLE[selectedRole].range+' · '+(ROLE[selectedRole].airTarget?'대공 가능':'지상 공격')+'</span>':
    '<b>전술 안내</b> — 역할 마크와 상성표는 진영이 달라도 동일합니다. 유닛을 선택하세요.';
  state.lastCards=Math.floor(state.cash/30);
 }
}
function initFactions(){
 $('factionCards').innerHTML=FACTIONS.map((f,i)=>
 '<button class="faction-card'+(i===selectedFaction?' selected':'')+'" data-faction="'+i+'"><span class="faction-icon" style="color:'+f.color+'">'+f.logo+
 '</span><strong>'+f.name+'</strong><span class="eyebrow">'+f.tag+'</span><small>'+f.slogan+'</small><span class="bonus">'+f.bonus+'</span></button>').join('');
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
 const flying=u.role===6,phase=Math.floor(u.anim)%2;
 const width=(u.role===3?40:u.role===6?40:35)*scale;
 const height=(u.role===3?40:u.role===6?40:35)*scale;
 g.fillStyle='#05141c77';g.beginPath();g.ellipse(u.x,u.y+12*scale,18*scale,5*scale,0,0,Math.PI*2);g.fill();
 g.save();g.imageSmoothingEnabled=false;
 g.drawImage(sprite(u.faction,u.role,phase),u.x-width/2,u.y-height/2-(flying?10+Math.sin(u.anim)*3:0),width,height);
 g.restore();
 if(u.blink>0){g.fillStyle='#ffe6a4';g.globalAlpha=u.blink*3;g.fillRect(u.x-8*scale,u.y-7*scale,16*scale,15*scale);g.globalAlpha=1;}
 const role=ROLE[u.role],y=u.y-31*scale-(flying?8:0);
 g.fillStyle='#07161cd9';g.fillRect(u.x-11*scale,y-8*scale,22*scale,16*scale);
 g.strokeStyle=u.side===0?'#85e9fa':'#fdad92';g.lineWidth=1.4;g.strokeRect(u.x-11*scale,y-8*scale,22*scale,16*scale);
 g.fillStyle=u.side===0?'#d0f9ff':'#ffe4d0';g.textAlign='center';g.font='900 '+Math.round(13*scale)+'px monospace';
 g.fillText(role.mark,u.x,y+4*scale);
 if(u.hp<u.maxHP){
  g.fillStyle='#06171c';g.fillRect(u.x-16*scale,u.y-24*scale,32*scale,4*scale);
  g.fillStyle=COLORS[u.side];g.fillRect(u.x-16*scale,u.y-24*scale,32*scale*(u.hp/u.maxHP),4*scale);
 }
}
function ground(g,w,h,base=false){
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
  for(const y of LANES){g.beginPath();g.moveTo(150,y);g.lineTo(950,y);g.stroke();}
  g.setLineDash([]);
  g.fillStyle='#12272f54';g.fillRect(535,0,30,h);
  g.fillStyle='#f2d79d99';g.font='900 13px monospace';g.textAlign='center';g.fillText('FRONT LINE',550,36);
 }
}
function structure(g,x,y,side,turret=true,health=1){
 g.save();g.translate(x,y);
 const col=COLORS[side];
 g.fillStyle='#07161988';g.beginPath();g.ellipse(0,27,turret?31:49,turret?20:37,0,0,7);g.fill();
 g.fillStyle=side===0?'#315665':'#74493b';
 if(turret){
  g.fillRect(-23,-23,46,48);g.strokeStyle=col;g.lineWidth=2;g.strokeRect(-23,-23,46,48);
  g.fillStyle='#172a32';g.fillRect(-18,-31,36,20);
  g.fillStyle=col;g.fillRect(-5,-18,10,23);
  g.fillStyle='#f5d9ae';g.fillRect(side===0?0:-33,-15,33,6);
 }else{
  g.fillRect(-37,-48,74,96);g.strokeStyle=col;g.lineWidth=3;g.strokeRect(-37,-48,74,96);
  g.fillStyle='#172d36';g.fillRect(-25,-27,50,58);
  g.fillStyle=col;g.fillRect(-10,-16,20,26);
  g.fillStyle='#f9dbad';g.fillRect(-6,-8,12,12);
  for(const v of [-24,24]){g.fillStyle=col;g.fillRect(v-6,-40,12,15);}
 }
 if(health<=0){
  g.globalAlpha=.8;g.fillStyle='#1c2225';g.fillRect(-26,-29,52,45);
  g.fillStyle='#da775b';g.fillRect(-8,-23,16,5);
 }
 g.restore();
}
function drawBattle(){
 const c=$('battleCanvas'),g=c.getContext('2d');if(!g)return;
 g.clearRect(0,0,CW,CH);ground(g,CW,CH);
 structure(g,90,260,0,false,state.baseHP[0]);structure(g,1010,260,1,false,state.baseHP[1]);
 structure(g,190,260,0,true,state.turretHP[0]);structure(g,910,260,1,true,state.turretHP[1]);
 for(const u of state.units.slice().sort((a,b)=>a.y-b.y))drawUnit(g,u,1);
 for(const p of state.shots){
  g.strokeStyle=p.side===0?'#a7eaff':'#ffbaa4';g.lineWidth=p.blast?4:2.5;
  g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x+(p.tx-p.x)*.17,p.y+(p.ty-p.y)*.17);g.stroke();
  g.fillStyle=p.blast?'#ffcf89':'#fff5c3';g.fillRect(p.x-2,p.y-2,4,4);
 }
 for(const e of state.effects){
  const a=clamp(e.time/.5,0,1);g.globalAlpha=a;
  g.strokeStyle=e.color;g.lineWidth=3;g.beginPath();g.arc(e.x,e.y,e.size*(1.25-.3*a),0,7);g.stroke();
 }g.globalAlpha=1;
 for(const o of state.floaters){
  g.fillStyle=o.color;g.globalAlpha=clamp(o.time/.85,0,1);
  g.font='900 13px monospace';g.textAlign='center';g.fillText(o.t,o.x,o.y);
 }g.globalAlpha=1;
 if(state.paused){g.fillStyle='#0c1d27b0';g.fillRect(0,0,CW,CH);
  g.fillStyle='#ffdfac';g.font='900 56px monospace';g.textAlign='center';g.fillText('PAUSED',550,260);}
}
function drawBase(){
 const g=$('baseCanvas').getContext('2d');if(!g)return;
 g.clearRect(0,0,CW,HOME_H);ground(g,CW,HOME_H,true);
 g.fillStyle='#20383e77';g.fillRect(0,215,CW,125);
 g.strokeStyle='#eac79a51';g.setLineDash([12,15]);g.lineWidth=3;
 g.beginPath();g.moveTo(220,282);g.lineTo(1060,282);g.stroke();g.setLineDash([]);
 g.fillStyle='#f0dbbc';g.font='900 12px monospace';g.textAlign='left';g.fillText('PROTECTED PRODUCTION ZONE',365,21);
 // 15 protected production structures are displayed as three rows of five.
 for(let i=0;i<15;i++){
  const role=state.built[i],row=Math.floor(i/5),col=i%5;
  const x=390+col*133,y=48+row*53;
  g.fillStyle='#0b222bb5';g.fillRect(x-40,y-19,80,40);
  g.strokeStyle=role!==null?FACTIONS[state.faction].color:'#54707c';
  g.lineWidth=1.7;g.strokeRect(x-40,y-19,80,40);
  g.fillStyle='#2d4851';g.fillRect(x-34,y-12,68,26);
  if(role!==null){
   g.fillStyle=FACTIONS[state.faction].color;g.fillRect(x-29,y-7,22,17);
   g.font='900 19px monospace';g.fillStyle='#fff1cc';g.textAlign='center';
   g.fillText(ROLE[role].mark,x+10,y+8);
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
 const raiders=state.units.filter(u=>u.side===1&&u.x<550);
 const friends=state.units.filter(u=>u.side===0&&u.x<550);
 for(const u of [...friends,...raiders]){
  const mappedX=clamp(260+(u.x-190)*1.9,220,1064),mappedY=260+(u.y-260)*.18;
  drawUnit(g,{...u,x:mappedX,y:mappedY},.80);
 }
 if(raiders.length){
  g.fillStyle='#7d302ad9';g.fillRect(818,226,248,23);
  g.fillStyle='#ffdbbd';g.font='900 12px monospace';g.textAlign='center';
  g.fillText('⚠ BREACH · '+raiders.length+' HOSTILES',942,242);
 }
 // Turret destruction is shown as damage, production buildings aren't falsely destructible.
 if(state.turretHP[0]<=0){
  g.fillStyle='#ffba90';g.font='900 17px monospace';g.textAlign='center';g.fillText('DEFENSE DESTROYED',250,198);
 }
}
function frame(now){
 const delta=Math.min((now-lastFrame)/1000||0,.045);lastFrame=now;
 if(state){tick(delta);drawBattle();drawBase();}
 requestAnimationFrame(frame);
}
function inspectBattle(event){
 const c=$('battleCanvas'),bounds=c.getBoundingClientRect();
 const x=(event.clientX-bounds.left)/bounds.width*CW,y=(event.clientY-bounds.top)/bounds.height*CH;
 let picked=null,best=48;
 for(const u of state.units){const d=Math.hypot(u.x-x,u.y-y);if(d<best){best=d;picked=u;}}
 if(!picked)return;
 const def=getDef(picked.role,picked.faction);
 $('inspect').innerHTML='<b>'+FACTIONS[picked.faction].name+' · '+def.unitName+' '+ROLE[picked.role].mark+'</b> | HP '+
 Math.ceil(picked.hp)+' / '+Math.ceil(picked.maxHP)+' · '+(picked.side===0?'아군':'적군')+
 '<br><span class="matchups">'+roleMatchupHtml(picked.role)+'</span>';
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
 $('restartButton').addEventListener('click',()=>{initFactions();reset();});
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
initFactions();wire();reset();requestAnimationFrame(frame);
})();