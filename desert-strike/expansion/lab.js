(function(){'use strict';
const $=id=>document.getElementById(id),X=window.DesertExpansion,A=window.DesertExpansionArt,R=window.DesertExpansionRewards;
const names=['철갑연합','심연군체','성운결사','해병성채','월영 수인족','은월 엘프족','야월 퍼리족','크롬 로보족','옥토퍼 군체','농농 페어리족'];
const roleNames=['돌격','사격','대장갑','장갑','대공','포격','비행·특수','지원','자원채취','저격','암살'];
const presets=[[[9],[1]],[[0,0,9],[1]],[[9],[3]],[[10],[9]],[[10],[0]],[[10],[0,0,7,9]],[[10],[0,0,1,1,7]],[[0,1,10],[3,1,9,5]],[[0,0,5,1],[3,7,9]],[[0,0,9],[6]]];
let catalogue=null,battle=null,paused=false,last=0,carry=0,tab='battle';
for(const id of ['faction','enemy'])names.forEach((name,i)=>{const op=document.createElement('option');op.value=String(i);op.textContent=name;$(id).append(op);});
$('scenario').value='5';
for(const button of document.querySelectorAll('[data-tab]'))button.addEventListener('click',()=>{tab=button.dataset.tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b===button));for(const id of ['battle','gallery','rewards'])$(id).hidden=id!==tab;});
function describe(side){const rows=battle.originals.filter(u=>u.side===side),counts=new Map();for(const u of rows)counts.set(u.role,(counts.get(u.role)||0)+1);return [...counts].map(([r,n])=>roleNames[r]+' '+n+'기').join(' · ')+' / '+battle.spent[side]+' CR 사용';}
function start(){if(!catalogue)return;paused=false;$('pause').textContent='일시정지';carry=0;battle=window.DesertExpansionModel.create({catalogue,factions:[Number($('faction').value),Number($('enemy').value)],patterns:presets[Number($('scenario').value)],budget:Number($('budget').value),seed:17});$('ours').textContent=describe(0);$('theirs').textContent=describe(1);$('result').textContent='4배속 전투 시험 중';}
$('start').addEventListener('click',start);$('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'계속':'일시정지';});
const gallery=[];
for(const skin of ['base','moe'])for(let faction=0;faction<10;faction++)for(const role of [9,10]){
 const card=document.createElement('article');card.className='unit-card';const cv=document.createElement('canvas');cv.width=cv.height=140;
 const title=document.createElement('h3');title.textContent=X.definition(role,faction).unitName;
 const note=document.createElement('small');note.textContent=names[faction]+' · '+(skin==='moe'?'모에화':'기본')+' · '+X.definition(role,faction).cost+' CR';card.append(cv,title,note);$('galleryGrid').append(card);gallery.push({cv,skin,faction,role});
}
const rewards=[];for(const skin of R.SKINS){const card=document.createElement('article');card.className='reward-card';const h=document.createElement('h2');h.textContent=skin.name;const p=document.createElement('p');p.textContent=skin.milestone;const cv=document.createElement('canvas');cv.width=360;cv.height=160;const note=document.createElement('small');note.textContent='능력치 동일 · 전용 색조와 부대 표식 · 기본/모에화 대응';card.append(h,p,cv,note);$('rewardGrid').append(card);rewards.push({cv,skin});}
function drawBattle(){
 const cv=$('field'),g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);g.fillStyle='#18272c';g.fillRect(0,0,cv.width,cv.height);
 g.strokeStyle='#29404a';g.lineWidth=1;for(let y=50;y<430;y+=40){g.beginPath();g.moveTo(0,y);g.lineTo(1200,y);g.stroke();}g.setLineDash([5,8]);g.beginPath();g.moveTo(600,0);g.lineTo(600,430);g.stroke();g.setLineDash([]);
 if(!battle){g.fillStyle='#91a8b6';g.font='16px system-ui';g.textAlign='center';g.fillText('편성을 선택하고 시험을 시작하세요.',600,210);return;}
 const sx=.7,offset=40,py=u=>u.y*.85+20,px=u=>u.x*sx+offset;
 for(const u of battle.units)if(u.hp>0&&u.role===7){g.save();g.strokeStyle='#65c9df';g.globalAlpha=.35;g.fillStyle='#318ca11a';g.beginPath();g.ellipse(px(u),py(u),X.RULES.detectionRadius*sx,X.RULES.detectionRadius*.85,0,0,Math.PI*2);g.fill();g.stroke();g.restore();}
 const list=battle.units.slice().sort((a,b)=>a.y-b.y);
 for(const u of list){
  if(u.hp<=0&&battle.time-(u.deathAt||0)>1)continue;
  const x=px(u),y=py(u),state=X.presentation(u,battle.units,battle.time),dead=u.hp<=0;
  const action=dead?'death':u.phase!=='normal'?'skill':u.pending?'attack':u.cooldown>u.def.rate-.35?'attack':'move';
  const frame=dead?Math.min(15,Math.floor((battle.time-(u.deathAt||0))*16)):Math.floor(battle.time*(action==='move'?12:15))%16;
  const drawn=A.draw(g,{faction:u.faction,role:u.role,skin:$('skin').value,action,frame,x:x-30,y:y-45,size:60,facing:u.side===0?1:-1,opacity:state.opacity});
  if(!drawn){g.save();g.globalAlpha=state.opacity;g.fillStyle=u.side===0?'#80cddd':'#e8aa8c';g.fillRect(x-6,y-16,12,16);g.restore();}
  if(dead)continue;
  g.fillStyle='#0b131a';g.fillRect(x-18,y-40,36,4);g.fillStyle=u.side===0?'#7fd4dd':'#e8aa8b';g.fillRect(x-18,y-40,36*Math.max(0,u.hp)/u.maxHP,4);
  if(state.label){g.font='bold 10px system-ui';g.textAlign='center';g.lineWidth=3;g.strokeStyle='#10151d';g.strokeText(state.label,x,y-48);g.fillStyle=u.role===7?'#88e6f0':state.targetable?'#ffd49f':'#dab9ff';g.fillText(state.label,x,y-48);}
 }
 for(const e of battle.events){if(e.type!=='attack'||battle.time-e.at>.12)continue;const a=battle.units.find(u=>u.id===e.unit),b=battle.units.find(u=>u.id===e.target);if(!a||!b||a.role!==9)continue;g.strokeStyle='#edcc83';g.lineWidth=1.5;g.beginPath();g.moveTo(px(a),py(a)-18);g.lineTo(px(b),py(b)-18);g.stroke();}
 $('clock').textContent=battle.time.toFixed(1)+'초';if(battle.finished){const r=battle.result;$('result').textContent=r.winner===0?'아군 승리':r.winner===1?'상대 승리':r.winner==='draw'?'상호 전멸':'150초 종료 · 승패 미확정';}
}
function drawGallery(seconds){for(const row of gallery){const g=row.cv.getContext('2d');g.clearRect(0,0,140,140);const action=$('action').value;A.draw(g,{faction:row.faction,role:row.role,skin:row.skin,action,frame:Math.floor(seconds*(action==='idle'?7:12))%16,size:140});}}
function drawRewards(seconds){for(const {cv,skin} of rewards){const g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);let i=0;for(const mode of ['base','moe'])for(const role of [9,10]){const x=i++*90;A.draw(g,{faction:Number($('faction').value),role,skin:mode,action:'idle',frame:Math.floor(seconds*7)%16,x,y:25,size:90,filter:skin.filter});g.save();g.translate(x,25);R.preview(g,skin.id,90);g.restore();}}}
function frame(ms){const dt=Math.min(.1,(ms-last)/1000||0);last=ms;if(battle&&!battle.finished&&!paused&&tab==='battle'){carry+=dt*4;while(carry>=.05){battle.tick(.05);carry-=.05;if(battle.finished)break;}}if(tab==='battle')drawBattle();else if(tab==='gallery')drawGallery(ms/1000);else drawRewards(ms/1000);requestAnimationFrame(frame);}
fetch('./base-roster.json').then(r=>{if(!r.ok)throw Error('기존 병종 자료를 불러오지 못했습니다.');return r.json();}).then(data=>{catalogue=data;start();}).catch(error=>{$('result').textContent=error.message;});requestAnimationFrame(frame);
})();
