
'use strict';
const cv=document.getElementById('field'),ctx=cv.getContext('2d');
const minimap=document.getElementById('minimap'),mc=minimap.getContext('2d');
const W=cv.width,H=cv.height,$=id=>document.getElementById(id);
const TYPES={
 darkarchon:{name:'암흑 집정관',race:'protoss',hp:280,damage:0,range:0,speed:125,r:24,cool:1,color:'#d35b9e',glyph:'✦'},
 ultra:{name:'울트라리스크',race:'zerg',hp:1200,damage:95,range:68,speed:52,r:37,cool:1.05,color:'#d1a27f',glyph:'◆'},
 marine:{name:'해병',race:'terran',hp:55,damage:8,range:166,speed:63,r:13,cool:.7,color:'#88bdd9',glyph:'▣'},
 zealot:{name:'광전사',race:'protoss',hp:135,damage:19,range:34,speed:67,r:19,cool:.9,color:'#f0cc82',glyph:'◇'},
 hydra:{name:'히드라리스크',race:'zerg',hp:110,damage:16,range:150,speed:54,r:18,cool:.96,color:'#b58dce',glyph:'♠'},
 goliath:{name:'골리앗',race:'terran',hp:230,damage:24,range:198,speed:44,r:23,cool:1.15,color:'#99bdaa',glyph:'▤'},
 archon:{name:'집정관',race:'protoss',hp:340,damage:36,range:154,speed:52,r:25,cool:1.2,color:'#aa9aea',glyph:'✧'}
};
const spriteImages={},spriteSheets={},spriteProblems={},spriteCrops={},spriteUrls={},spriteThumbs={};
function updateSpriteThumb(type){
 const im=spriteImages[type];if(!im||!im.width)return;
 const crop=spriteCrops[type],ok=crop&&crop.w>0&&crop.h>0&&crop.x>=0&&crop.y>=0&&crop.x+crop.w<=im.width&&crop.y+crop.h<=im.height;
 const sx=ok?crop.x:0,sy=ok?crop.y:0,sw=ok?crop.w:im.width,sh=ok?crop.h:im.height;
 const el=document.createElement('canvas');el.width=96;el.height=96;const q=el.getContext('2d');
 const scale=Math.min(88/sw,88/sh);const dw=sw*scale,dh=sh*scale;
 q.drawImage(im,sx,sy,sw,sh,(96-dw)/2,(96-dh)/2,dw,dh);
 try{spriteThumbs[type]=el.toDataURL('image/png')}catch{spriteThumbs[type]=im.src}
}

for(const key in TYPES){
 const img=new Image();img.onload=()=>{spriteImages[key]=img};img.onerror=()=>{spriteProblems[key]=true};
 img.src='assets/units/'+key+'.png';
 fetch('assets/units/'+key+'.json').then(r=>r.ok?r.json():null).then(meta=>{
  if(!meta?.frameWidth||!meta.frameHeight||!meta.frames)return;
  const atlas=new Image();atlas.onload=()=>{spriteSheets[key]={image:atlas,meta}};
  atlas.src='assets/units/'+(meta.image||key+'-sheet.png');
 }).catch(()=>{});
}
const catalog={
 darkarchon:{grp:'Stargus unit-protoss-dark-archon',source:'https://github.com/Wargus/stargus/blob/master/dataset/units.json'},
 ultra:{grp:'unit\\zerg\\ultra.grp',source:'https://www.spriters-resource.com/pc_computer/starcraft/asset/59999/'},
 marine:{grp:'unit\\terran\\marine.grp',source:'https://www.spriters-resource.com/pc_computer/starcraft/asset/31462/'},
 zealot:{grp:'unit\\protoss\\zealot.grp',source:'https://www.spriters-resource.com/pc_computer/starcraft/asset/59953/'},
 hydra:{grp:'unit\\zerg\\hydra.grp',source:'https://www.spriters-resource.com/pc_computer/starcraft/asset/60014/'},
 goliath:{grp:'unit\\terran\\goliath.grp + goliatht.grp',source:'https://github.com/Wargus/stargus'},
 archon:{grp:'unit\\protoss\\archon.grp',source:'https://www.spriters-resource.com/pc_computer/starcraft/asset/60077/'}
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let units=[],selected=new Set(),groups=Array.from({length:5},()=>[]),spawns=[],effects=[],wave=1,energy=250,nexus=750,kills=0,conversions=0,idCounter=0,time=0,interval=0,mode='select',paused=false,over=false,drag=null,clickMemory={id:0,time:0},lastUI=0,selectionStamp='',viewOffset=0;
const particle=(x,y,color,r=40)=>effects.push({x,y,color,r,ttl:.48,total:.48});
const notify=text=>{$('message').textContent=text};
const allies=()=>units.filter(u=>!u.enemy&&u.hp>0);
const enemies=()=>units.filter(u=>u.enemy&&u.hp>0);
const chosen=()=>units.filter(u=>selected.has(u.id)&&!u.enemy&&u.hp>0);
function spawn(type,enemy,x,y){
 const d=TYPES[type],u={id:++idCounter,type,enemy,x,y,hp:d.hp,max:d.hp,face:0,attackTimer:0,cool:rnd(0,.4),stun:0,moving:false,order:{type:enemy?'attackmove':'hold',x,y},orders:[],frameTime:rnd(0,10)};
 units.push(u);return u;
}
function startWave(){
 time=0;interval=0;spawns=[];
 if(wave===1)spawns=[{t:.8,type:'marine'},{t:2,type:'ultra'},{t:8,type:'marine'},{t:12,type:'zealot'},{t:17,type:'marine'}];
 else {
  const n=5+wave*3;
  for(let i=0;i<n;i++){const pool=wave<4?['marine','zealot','hydra']:['marine','zealot','hydra','goliath','archon'];
   spawns.push({t:1.2+i*Math.max(.7,1.55-wave*.04),type:(wave%2===0&&i===Math.floor(n*.52))?'ultra':pool[Math.floor(rnd(0,pool.length))]});
  }
 }
 notify('웨이브 '+wave+' 시작 · '+(wave===1?'울트라리스크를 정신 지배하세요':'병력을 지휘해 방어하세요'));
}
function reset(){
 units=[];selected.clear();groups=Array.from({length:5},()=>[]);effects=[];wave=1;energy=250;nexus=750;kills=conversions=0;idCounter=0;mode='select';paused=over=false;drag=null;
 const hero=spawn('darkarchon',false,235,315);selected.add(hero.id);startWave();refreshSelection(true);updateUI();
}
function setMode(next){mode=next;updateCommands();notify(next==='mind'?'정신 지배: 적 유닛 클릭 (120 에너지)':next==='mael'?'마엘스트롬: 지점 클릭 (75 에너지)':next==='attackmove'?'공격 이동: 지점 클릭':'명령 취소')}
const getUnit=(p,filter=()=>true)=>[...units].reverse().find(u=>u.hp>0&&filter(u)&&distance(u,p)<TYPES[u.type].r+12);
function setSelected(u,add=false){
 if(!add)selected.clear();
 if(u&&!u.enemy){if(add&&selected.has(u.id))selected.delete(u.id);else selected.add(u.id)}
 refreshSelection(true);
}
function selectBox(a,b,add=false){
 if(!add)selected.clear();
 const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y);
 for(const u of allies())if(u.x>=x0&&u.x<=x1&&u.y>=y0&&u.y<=y1)selected.add(u.id);
 refreshSelection(true);
}
function selectSame(type){
 selected=new Set(allies().filter(u=>u.type===type).map(u=>u.id));refreshSelection(true);
}
function completeOrder(u){
 if(u.orders.length){u.order=u.orders.shift();return}
 u.order={type:'hold',x:u.x,y:u.y};
}
function command(type,p,target=null,append=false){
 const arr=chosen();if(!arr.length){notify('먼저 아군 유닛을 선택하세요');return}
 const cols=Math.ceil(Math.sqrt(arr.length)),rows=Math.ceil(arr.length/cols);
 arr.forEach((u,i)=>{
  const spacing=Math.max(40,TYPES[u.type].r*2.1);
  const o={type,x:clamp(p.x+(i%cols-(cols-1)/2)*spacing,30,W-30),y:clamp(p.y+(Math.floor(i/cols)-(rows-1)/2)*spacing,30,H-30),target:target?.id||null};
  if(append){if(u.orders.length<12)u.orders.push(o)}
  else{u.order=o;u.orders=[]}
 });
 particle(p.x,p.y,type==='attackmove'?'#ffa58c':'#7bebc2',28);
 notify((append?'예약: ':'')+({move:'이동',attack:'집중 공격',attackmove:'공격 이동'}[type]||'명령')+' · '+arr.length+'기');
 refreshSelection();
}
function stop(type){
 const arr=chosen();for(const u of arr){u.order={type,x:u.x,y:u.y};u.orders=[]}
 notify((type==='stop'?'정지':'위치 사수')+' · '+arr.length+'기');refreshSelection();
}
function mind(target){
 const hero=allies().find(u=>u.type==='darkarchon');
 if(!hero){notify('다크 아콘이 없습니다');return}
 if(!target||!target.enemy){notify('적 유닛을 클릭하세요');return}
 if(distance(hero,target)>930){notify('사거리 밖 · 다크 아콘 이동 필요');return}
 if(energy<120){notify('에너지 부족');return}
 energy-=120;target.enemy=false;target.hp=target.max;target.stun=0;target.order={type:'hold',x:target.x,y:target.y};target.orders=[];conversions++;selected.clear();selected.add(target.id);
 particle(target.x,target.y,'#ff77b4',115);notify(TYPES[target.type].name+' 정신 지배 성공 · 우클릭으로 직접 지휘하세요');
 mode='select';refreshSelection(true);
}
function mael(p){
 const hero=allies().find(u=>u.type==='darkarchon');
 if(!hero||distance(hero,p)>930){notify('마엘스트롬 사거리 밖');return}
 if(energy<75){notify('에너지 부족');return}
 energy-=75;for(const u of enemies())if(distance(u,p)<140)u.stun=4;
 particle(p.x,p.y,'#b5a0ff',140);notify('마엘스트롬!');mode='select';updateCommands();
}
function coords(ev){
 const r=cv.getBoundingClientRect();return{x:clamp((ev.clientX-r.left)*W/r.width,0,W),y:clamp((ev.clientY-r.top)*H/r.height,0,H)};
}
cv.addEventListener('pointerdown',ev=>{
 if(ev.button===2){ev.preventDefault();if(over)return;const p=coords(ev),victim=getUnit(p,u=>u.enemy);command(victim?'attack':'move',p,victim,ev.shiftKey);return}
 if(ev.button!==0)return;
 ev.preventDefault();const p=coords(ev);
 if(mode==='mind'){mind(getUnit(p,u=>u.enemy));return}
 if(mode==='mael'){mael(p);return}
 if(mode==='attackmove'){command('attackmove',p,null,ev.shiftKey);setMode('select');return}
 drag={begin:p,end:p,add:ev.shiftKey,pointerId:ev.pointerId,started:performance.now()};
 try{cv.setPointerCapture(ev.pointerId)}catch{}
});
cv.addEventListener('pointermove',ev=>{if(drag?.pointerId===ev.pointerId)drag.end=coords(ev)});
function releasePointer(ev){
 if(!drag||ev.pointerId!==drag.pointerId)return;
 const state=drag;drag=null;
 const p=coords(ev);
 if(distance(state.begin,p)>7){selectBox(state.begin,p,state.add);return}
 const u=getUnit(p);
 if(u&&!u.enemy&&clickMemory.id===u.id&&performance.now()-clickMemory.time<340&&!state.add){selectSame(u.type);clickMemory={id:0,time:0}}
 else {setSelected(u,state.add);clickMemory={id:u?.id||0,time:performance.now()}}
}
cv.addEventListener('pointerup',releasePointer);
cv.addEventListener('pointercancel',()=>{drag=null});
cv.addEventListener('lostpointercapture',()=>{drag=null});
cv.addEventListener('contextmenu',ev=>ev.preventDefault());
const modifierKeys=new Set(['CONTROL','SHIFT','ALT','META']);
window.addEventListener('keydown',ev=>{
 if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
 const k=ev.key.toLowerCase();
 if([' ','arrowdown','arrowup','arrowleft','arrowright'].includes(k))ev.preventDefault();
 if(ev.repeat||modifierKeys.has(ev.key.toUpperCase()))return;
 if(ev.ctrlKey&&/^[1-5]$/.test(k)){
  ev.preventDefault();
  groups[+k-1]=chosen().map(u=>u.id);notify(k+'번 부대 저장: '+groups[+k-1].length+'기');updateGroups();return;
 }
 if(/^[1-5]$/.test(k)){selected=new Set(groups[+k-1].filter(id=>allies().some(u=>u.id===id)));refreshSelection(true);return}
 if(k==='a')setMode('attackmove');
 if(k==='m')setMode('mind');
 if(k==='e')setMode('mael');
 if(k==='s')stop('stop');
 if(k==='h')stop('hold');
 if(k==='escape')setMode('select');
 if(k===' '){paused=!paused;notify(paused?'일시정지':'재개');$('pause').textContent=paused?'재개':'일시정지'}
});
$('pause').onclick=()=>{paused=!paused;notify(paused?'일시정지':'재개');$('pause').textContent=paused?'재개':'일시정지'};
$('restart').onclick=reset;
document.querySelectorAll('[data-command]').forEach(btn=>btn.onclick=()=>{
 const cmd=btn.dataset.command;
 if(cmd==='move'){setMode('attackmove');notify('공격 이동: 지점 클릭')}
 else if(cmd==='stop'||cmd==='hold')stop(cmd);
 else setMode(cmd);
});
function stepToward(u,p,dt){
 const d=distance(u,p),sp=TYPES[u.type].speed;
 if(d<Math.max(6,TYPES[u.type].r*.3)){if(u.order.type==='move'||u.order.type==='attackmove')completeOrder(u);return}
 let vx=(p.x-u.x)/d,vy=(p.y-u.y)/d;
 u.face=Math.atan2(vy,vx);
 let x=u.x+vx*Math.min(d,sp*dt),y=u.y+vy*Math.min(d,sp*dt);
 for(const v of units){if(v===u||v.hp<=0)continue;
  const gap=Math.hypot(x-v.x,y-v.y),minGap=(TYPES[u.type].r+TYPES[v.type].r)*.68;
  if(gap<minGap){const ax=gap<.001?Math.sin(u.id*2):((x-v.x)/gap),ay=gap<.001?Math.cos(u.id*2):((y-v.y)/gap);
   x+=ax*(minGap-gap)*.24;y+=ay*(minGap-gap)*.24;
  }
 }
 u.x=clamp(x,27,W-27);u.y=clamp(y,28,H-28);u.moving=true;
}
function damage(t,n){if(t.core){nexus=Math.max(0,nexus-n);return}if(t.hp<=0)return;t.hp-=n;if(t.hp<=0&&t.enemy)kills++}
function strike(u,t){
 const d=TYPES[u.type];u.cool=d.cool;u.attackTimer=.3;
 if(u.type==='ultra'&&!t.core){
  for(const v of units){if(v.enemy!==u.enemy&&v.hp>0&&distance(v,t)<106){const fall=Math.max(.42,1-distance(v,t)/155);damage(v,Math.round(d.damage*fall))}}
  particle(t.x,t.y,'#e5ab79',87);
 }else{
  damage(t,t.core&&u.type==='ultra'?36:d.damage);
  particle(t.x,t.y,u.enemy?'#ff8d83':'#88e8f3',u.type==='ultra'?72:18);
 }
}
function tick(dt){
 if(over||paused)return;
 time+=dt;energy=Math.min(250,energy+14*dt);
 while(spawns.length&&spawns[0].t<=time){const s=spawns.shift();spawn(s.type,true,rnd(995,1030),rnd(95,505))}
 for(const u of units){
  if(u.hp<=0)continue;u.cool-=dt;u.stun=Math.max(0,u.stun-dt);u.attackTimer=Math.max(0,u.attackTimer-dt);u.frameTime+=dt;u.moving=false;
  if(u.stun>0)continue;
  const o=u.order,d=TYPES[u.type];
  if(u.type==='darkarchon'){if(['move','attackmove'].includes(o.type))stepToward(u,o,dt);continue}
  const opponents=units.filter(v=>v.hp>0&&v.enemy!==u.enemy);
  let target=null,td=Infinity,forced=false;
  if(o.target){target=opponents.find(v=>v.id===o.target)||null;forced=!!target;
   if(!target){completeOrder(u);continue}
  }
  if(!target&&o.type!=='move'&&o.type!=='stop'){
   const aggro=(u.enemy||o.type==='attackmove')?225:d.range+15;
   for(const v of opponents){const gap=distance(u,v);if(gap<aggro&&gap<td){td=gap;target=v}}
  }
  if(u.enemy){
   const core={x:96,y:308,core:true};
   const cdist=distance(u,core);
   if(!target||cdist<distance(u,target)-15)target=core;
  }
  if(target&&o.type==='stop')target=null;
  if(target){
   const range=d.range+(target.core?23:TYPES[target.type].r*.35);
   if(distance(u,target)<=range){if(u.cool<=0)strike(u,target)}
   else if(u.enemy||forced||o.type==='attackmove')stepToward(u,target,dt);
   else if(o.type==='move')stepToward(u,o,dt);
  }else if(o.type==='move'||o.type==='attackmove')stepToward(u,o,dt);
 }
 units=units.filter(u=>u.hp>0);const prev=selected.size;selected=new Set([...selected].filter(id=>allies().some(u=>u.id===id)));if(selected.size!==prev)refreshSelection(true);
 if(nexus<=0){over=true;notify('패배 · 넥서스가 파괴됐습니다')}
 if(!spawns.length&&!enemies().length){interval+=dt;if(interval>3){if(wave===10){over=true;notify('승리 · 10웨이브 격파')}else{wave++;energy=Math.min(250,energy+85);for(const u of allies())u.hp=Math.min(u.max,u.hp+u.max*.2);startWave()}}}
 else interval=0;
}
function atlasDraw(u,scale){
 const sheet=spriteSheets[u.type];if(!sheet)return false;
 const {image,meta}=sheet,dirs=meta.directions||8,face=((u.face||0)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
 const dir=Math.round(face/(2*Math.PI)*dirs)%dirs;
 const fs=meta.frames,state=u.attackTimer>0?'attack':u.moving?'move':'idle';
 const frames=fs[state]||1,offset=state==='attack'?(fs.idle||1)+(fs.move||1):state==='move'?(fs.idle||1):0;
 const cols=Math.floor(image.width/meta.frameWidth),col=offset+Math.floor(u.frameTime*((meta.fps||{})[state]||8))%frames;
 if(col>=cols)return false;
 const fw=meta.frameWidth,fh=meta.frameHeight,sw=scale,sh=sw*fh/fw;
 ctx.drawImage(image,col*fw,dir*fh,fw,fh,-sw/2,-sh*.74,sw,sh);return true;
}
function drawUnit(u){
 const d=TYPES[u.type];ctx.save();ctx.translate(u.x,u.y);
 ctx.fillStyle='#03050888';ctx.beginPath();ctx.ellipse(0,d.r*.65,d.r,Math.max(6,d.r*.35),0,0,Math.PI*2);ctx.fill();
 const w=d.r*3;
 if(atlasDraw(u,w)){}
 else if(spriteImages[u.type]){
  const crop=spriteCrops[u.type],im=spriteImages[u.type];
  if(crop&&crop.w>0&&crop.h>0&&crop.x>=0&&crop.y>=0&&crop.x+crop.w<=im.width&&crop.y+crop.h<=im.height)
   ctx.drawImage(im,crop.x,crop.y,crop.w,crop.h,-w/2,-w*.72,w,w);
  else ctx.drawImage(im,-w/2,-w*.72,w,w);
 }
 else {
  ctx.shadowBlur=u.type==='darkarchon'?28:10;ctx.shadowColor=d.color;ctx.fillStyle=d.color;ctx.strokeStyle=u.enemy?'#ef9c90':'#a4e9ff';ctx.lineWidth=2;
  ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4+u.face,r=d.r*(i%2?.82:1);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
  if(u.type==='ultra'){ctx.fillStyle='#efe2ba';for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(12,side*8);ctx.lineTo(55,side*32);ctx.lineTo(28,side*24);ctx.closePath();ctx.fill()}}
  if(u.type==='darkarchon'){ctx.fillStyle='#1b1026';ctx.beginPath();ctx.moveTo(-17,-24);ctx.lineTo(0,-39);ctx.lineTo(17,-24);ctx.lineTo(0,27);ctx.closePath();ctx.fill();ctx.fillStyle='#ffb0d2';ctx.fillRect(-11,-14,8,4);ctx.fillRect(3,-14,8,4)}
 }
 if(selected.has(u.id)){ctx.strokeStyle='#73ffd0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,6,d.r+9,d.r*.56+6,0,0,Math.PI*2);ctx.stroke()}
 ctx.fillStyle='#211c1f';ctx.fillRect(-d.r,-d.r-17,d.r*2,5);
 ctx.fillStyle=u.enemy?'#f7878a':'#77ddc3';ctx.fillRect(-d.r,-d.r-17,d.r*2*clamp(u.hp/u.max,0,1),5);
 if(u.stun>0){ctx.fillStyle='#d5b9fa';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText('✣',0,-d.r-24)}
 ctx.restore();
}
function draw(){
 ctx.fillStyle='#101924';ctx.fillRect(0,0,W,H);
 const grd=ctx.createRadialGradient(520,290,30,520,290,770);
 grd.addColorStop(0,'#344350');grd.addColorStop(1,'#0b131e');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#a6bac414';ctx.lineWidth=1;
 for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
 for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 ctx.fillStyle='#243b4b';ctx.fillRect(50,256,92,96);ctx.strokeStyle='#81d9f0';ctx.lineWidth=2;ctx.strokeRect(50,256,92,96);
 ctx.fillStyle='#73d0e5';ctx.beginPath();ctx.arc(96,304,20,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#d0eefa';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('NEXUS',96,371);
 ctx.strokeStyle='#ec7b8650';ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(925,0);ctx.lineTo(925,H);ctx.stroke();ctx.setLineDash([]);
 for(const u of [...units].sort((a,b)=>a.y-b.y))drawUnit(u);
 for(const e of effects){ctx.globalAlpha=clamp(e.ttl/e.total,0,1);ctx.strokeStyle=e.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,e.r*(1-e.ttl/e.total),0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;
 if(drag&&distance(drag.begin,drag.end)>7){
  const a=drag.begin,b=drag.end,x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);
  ctx.fillStyle='#6cf7c315';ctx.strokeStyle='#83f5bd';ctx.lineWidth=1;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);
 }
 if(mode!=='select'){ctx.textAlign='left';ctx.font='bold 17px sans-serif';ctx.fillStyle='#ffe6b6';ctx.fillText({mind:'정신 지배: 적을 클릭',mael:'마엘스트롬: 지점 클릭',attackmove:'공격 이동: 지점 클릭'}[mode],20,34)}
 if(interval>0&&!over){ctx.font='bold 22px sans-serif';ctx.fillStyle='#dccca4';ctx.textAlign='center';ctx.fillText('WAVE CLEAR · +85 에너지',W/2,82)}
 if(over||paused){ctx.fillStyle='#090a16d9';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#f1b3d3';ctx.font='bold 44px sans-serif';ctx.fillText(paused?'PAUSED':nexus>0?'VICTORY':'DEFEAT',W/2,H/2);ctx.fillStyle='#d1c4b6';ctx.font='17px sans-serif';ctx.fillText('새 전투 버튼으로 재시작',W/2,H/2+42)}
}
function drawMinimap(){
 mc.fillStyle='#0c1624';mc.fillRect(0,0,minimap.width,minimap.height);
 mc.strokeStyle='#5a778c';mc.lineWidth=1;mc.strokeRect(3,3,minimap.width-6,minimap.height-6);
 mc.fillStyle='#78a9b3';mc.fillRect(14,minimap.height/2-4,9,8);
 for(const u of units){mc.fillStyle=u.enemy?'#f57569':'#7ce7c0';let x=u.x/W*minimap.width,y=u.y/H*minimap.height;
 mc.fillRect(x-2,y-2,u.type==='ultra'?6:4,u.type==='ultra'?6:4)}
}
const tileIcon=t=>'<span class="glyph" style="color:'+TYPES[t].color+'">'+TYPES[t].glyph+'</span>';
function updateGroups(){
 const area=$('groupBar');area.innerHTML='';
 for(let i=0;i<5;i++){
  const alive=groups[i].filter(id=>allies().some(u=>u.id===id)),btn=document.createElement('button');btn.className='groupbtn';
  btn.textContent=(i+1)+' · '+alive.length;btn.title='클릭: 부대 선택 / Ctrl+'+(i+1)+': 부대 지정';
  btn.onclick=()=>{selected=new Set(alive);refreshSelection(true)};area.appendChild(btn);
 }
}
function refreshSelection(force=false){
 const arr=chosen(),stamp=arr.map(u=>u.id).join(',');
 if(stamp!==selectionStamp||force){
  selectionStamp=stamp;
  const grid=$('selectedList');grid.innerHTML='';
  const visible=arr.slice(0,16);
  for(const u of visible){
   const tile=document.createElement('button');tile.className='unitTile';tile.title=TYPES[u.type].name;
   if(spriteImages[u.type]){const img=document.createElement('img');img.src=spriteThumbs[u.type]||spriteImages[u.type].src;img.alt=TYPES[u.type].name;tile.appendChild(img)}
   else tile.innerHTML=tileIcon(u.type);
   const text=document.createElement('span');text.className='short';text.textContent=Math.max(0,Math.ceil(u.hp));tile.appendChild(text);
   const bar=document.createElement('div');bar.className='uhp';bar.style.width=(clamp(u.hp/u.max,0,1)*100)+'%';tile.appendChild(bar);
   tile.onclick=e=>{setSelected(u,e.shiftKey)};grid.appendChild(tile);
  }
  if(arr.length>16){const more=document.createElement('span');more.textContent='+'+(arr.length-16);grid.appendChild(more)}
  updateGroups();
 }
 const first=arr[0],portrait=$('portraitVisual');
 portrait.replaceChildren();
 if(first){
  if(spriteImages[first.type]){const img=document.createElement('img');img.src=spriteThumbs[first.type]||spriteImages[first.type].src;img.alt=TYPES[first.type].name;portrait.appendChild(img)}
  else {portrait.textContent=TYPES[first.type].glyph;portrait.style.color=TYPES[first.type].color}
  $('portraitName').textContent=arr.length>1?TYPES[first.type].name+' 외 '+(arr.length-1)+'기':TYPES[first.type].name;
  $('portraitHP').textContent=Math.ceil(first.hp)+' / '+first.max;
  $('portraitBar').style.width=clamp(first.hp/first.max*100,0,100)+'%';
 }else{
  portrait.textContent='—';$('portraitName').textContent='유닛 미선택';$('portraitHP').textContent='0 / 0';$('portraitBar').style.width='0%';
 }
 updateCommands();
}
function updateCommands(){
 const has=chosen().length>0,hero=allies().some(u=>u.type==='darkarchon');
 for(const btn of document.querySelectorAll('[data-command]')){
  let type=btn.dataset.command;btn.disabled=(type==='mind'||type==='mael')?!hero:!has;
  btn.classList.toggle('active',mode===type||(type==='move'&&mode==='attackmove'));
 }
}
function updateUI(){
 $('wave').textContent=wave+' / 10';$('energy').textContent=Math.floor(energy)+' / 250';$('nexusHP').textContent=Math.ceil(nexus)+' / 750';
 $('army').textContent=allies().length+' / '+(enemies().length+spawns.length);$('kills').textContent=kills+' / '+conversions;
 refreshSelection();drawMinimap();
}
minimap.addEventListener('contextmenu',e=>{e.preventDefault();const r=minimap.getBoundingClientRect();const x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;command('move',{x,y},null,e.shiftKey)});
minimap.addEventListener('click',e=>{const r=minimap.getBoundingClientRect();const x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;notify('미니맵 위치: '+Math.round(x)+', '+Math.round(y)+' · 우클릭으로 이동 명령')});

function initSpriteImport(){
 const type=$('spriteType'),file=$('spriteFile'),status=$('spriteStatus');
 if(!type||!file)return;
 function readCrop(){
  const get=v=>Number($('crop'+v)?.value)||0;
  return {x:get('X'),y:get('Y'),w:get('W'),h:get('H')};
 }
 async function apply(){
  const f=file.files?.[0];if(!f){status.textContent='PNG 파일을 선택하세요';return}
  const key=type.value;
  if(!TYPES[key])return;
  const url=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{
   if(spriteUrls[key])URL.revokeObjectURL(spriteUrls[key]);
   spriteUrls[key]=url;spriteImages[key]=im;delete spriteSheets[key];
   spriteCrops[key]=readCrop();updateSpriteThumb(key);
   status.textContent=TYPES[key].name+' 이미지 연결 완료 ('+im.width+'×'+im.height+') · 원본 전체 시트면 잘라낼 좌표를 설정하세요';
   refreshSelection(true);
  };
  im.onerror=()=>{URL.revokeObjectURL(url);status.textContent='이미지 파일을 읽지 못했습니다'};
  im.src=url;
 }
 $('spriteApply')?.addEventListener('click',apply);
 $('cropSet')?.addEventListener('click',()=>{
  const key=type.value;if(!spriteImages[key]){status.textContent='먼저 이미지를 불러오세요';return}
  spriteCrops[key]=readCrop();updateSpriteThumb(key);status.textContent=TYPES[key].name+' 크롭 좌표 적용';refreshSelection(true);
 });
}
initSpriteImport();

let last=0;
function loop(now){
 const dt=Math.min(.04,(now-last)/1000||.016);last=now;tick(dt);
 for(const e of effects)e.ttl-=dt;effects=effects.filter(e=>e.ttl>0);
 draw();
 if(now-lastUI>170){updateUI();lastUI=now}
 requestAnimationFrame(loop);
}
reset();requestAnimationFrame(loop);
