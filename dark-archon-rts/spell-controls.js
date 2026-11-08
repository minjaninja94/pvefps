/* Star-style click-to-cast controls. Shared by PC and touch builds.
 * The existing spells retain their effect, cost and attack ranges.
 * Only command targeting, range approach and visual indicators change.
 */
(() => {
 'use strict';
 const spells={
  mind:{label:'정신 지배',range:264,cost:150,kind:'unit',color:'#ff5676'},
  feedback:{label:'피드백',range:330,cost:50,kind:'unit',color:'#ff75d8'},
  mael:{label:'마엘스트롬',range:330,cost:100,kind:'point',aoe:90,color:'#bca0ff'},
  storm:{label:'사이오닉 스톰',range:297,cost:75,kind:'point',aoe:95,color:'#8fbdff'}
 };
 const effects={mind,feedback,mael,storm};
 const parent={
  setMode,reset,setSelected,selectBox,selectSame,command,stop,tick,draw
 };
 let queuedSpell=null,mouseInField=false;
 const caster=()=>units.find(u=>u.hp>0&&friendly(u)&&u.type==='darkarchon');
 const validTarget=(type,u)=>!!u&&u.hp>0&&hostile(u)&&
   (type==='mind'?(u.type!=='darkarchon'&&!u.fixed):(type==='feedback'&&u.type==='darkarchon'));
 const spellPoint=job=>{
  if(!job)return null;
  if(job.targetId){const target=units.find(u=>u.id===job.targetId&&validTarget(job.type,u));return target||null}
  return job.point;
 };
 function cancelSpell(message=''){
  if(queuedSpell){
   const hero=units.find(u=>u.id===queuedSpell.casterId&&u.hp>0);
   if(hero&&hero.order.type==='spellcast'){hero.order={type:'guard',x:hero.x,y:hero.y,target:null};hero.orders=[]}
   queuedSpell=null;
  }
  if(message)notify(message);
 }
 function castNow(type,point){
  const effect=effects[type];
  // Original spell routines preserve all damage/energy/unit conversion rules.
  return effect(point);
 }
 function requestCast(type,aim){
  const spec=spells[type];if(!spec)return;
  const hero=caster();
  if(!hero){cancelSpell();mode='select';updateCommands();notify('다크 아콘이 없습니다');return false}
  if(spec.kind==='unit'&&!validTarget(type,aim)){
   cancelSpell();
   mode='select';updateCommands();
   notify(type==='mind'?'정신 지배 취소 · 빈 땅 또는 시전 불가 대상':'피드백 취소 · 상대 다크 아콘만 지정 가능');
   return false;
  }
  if(spec.kind==='point'&&(!aim||!Number.isFinite(aim.x)||!Number.isFinite(aim.y))){
   cancelSpell();mode='select';updateCommands();notify('마법 위치 지정을 취소했습니다');return false;
  }
  if(currentEnergy()<spec.cost){
   cancelSpell();mode='select';updateCommands();notify(spec.label+' · PSI '+spec.cost+' 필요');return false;
  }
  const aimPoint={x:aim.x,y:aim.y};
  cancelSpell();
  if(distance(hero,aimPoint)<=spec.range-4){
   const success=castNow(type,aim);
   updateCommands();
   return success!==false;
  }
  queuedSpell={
   type,casterId:hero.id,ownerTeam:activeTeam,
   targetId:spec.kind==='unit'?aim.id:0,
   point:spec.kind==='point'?aimPoint:null
  };
  hero.order={type:'spellcast',x:aimPoint.x,y:aimPoint.y,target:spec.kind==='unit'?aim.id:null};
  hero.orders=[];hero.engagedTargetId=0;hero.retaliateFor=0;
  mode='select';updateCommands();
  notify(spec.label+' · 사거리 밖 → 다크 아콘 자동 접근 후 시전 · Esc / 이동 명령으로 취소');
  particle(aimPoint.x,aimPoint.y,spec.color,40);
  return true;
 }
 function approach(dt){
  const order=queuedSpell;if(!order||over||paused)return;
  const hero=units.find(u=>u.id===order.casterId&&u.hp>0&&friendly(u));
  const spec=spells[order.type],point=spellPoint(order);
  if(!hero||activeTeam!==order.ownerTeam||!point){
   cancelSpell('마법 목표가 사라져 자동 시전을 취소했습니다');return;
  }
  if(currentEnergy()<spec.cost){
   cancelSpell(spec.label+' · PSI 부족으로 시전 취소');return;
  }
  const aim=order.targetId?point:{x:order.point.x,y:order.point.y};
  if(distance(hero,aim)<=spec.range-5){
   // Clear first: the underlying routine may change selected units/mode.
   queuedSpell=null;
   if(hero.order.type==='spellcast')hero.order={type:'guard',x:hero.x,y:hero.y,target:null};
   castNow(order.type,aim);updateCommands();
   return;
  }
  if(hero.stun>0)return;
  // Move only until the spell range boundary, not into the target.
  hero.order={type:'spellcast',x:aim.x,y:aim.y,target:order.targetId||null};
  stepToward(hero,aim,dt);
  if(distance(hero,aim)<=spec.range-5){
   queuedSpell=null;
   hero.order={type:'guard',x:hero.x,y:hero.y,target:null};
   castNow(order.type,aim);updateCommands();
  }
 }
 for(const type of Object.keys(spells)){
  const binding=(aim)=>requestCast(type,aim);
  if(type==='mind')mind=binding;
  if(type==='feedback')feedback=binding;
  if(type==='mael')mael=binding;
  if(type==='storm')storm=binding;
 }
 setMode=function(next){
  cancelSpell();
  return parent.setMode(next);
 };
 reset=function(){cancelSpell();mouseInField=false;return parent.reset()};
 setSelected=function(...args){cancelSpell();return parent.setSelected(...args)};
 selectBox=function(...args){cancelSpell();return parent.selectBox(...args)};
 selectSame=function(...args){cancelSpell();return parent.selectSame(...args)};
 command=function(...args){cancelSpell();return parent.command(...args)};
 stop=function(...args){cancelSpell();return parent.stop(...args)};
 tick=function(dt){parent.tick(dt);approach(dt)};
 function ring(x,y,r,color,alpha=1,width=2,dash=[]){
  ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
  ctx.setLineDash(dash);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
  ctx.restore();
 }
 function highlightUnit(u,strong=false){
  const radius=TYPES[u.type].r+9;
  ctx.save();
  ctx.fillStyle=strong?'#ff284a44':'#ff3c5e23';
  ctx.strokeStyle=strong?'#ff284a':'#fb7185';
  ctx.shadowColor='#ff3048';ctx.shadowBlur=strong?23:10;ctx.lineWidth=strong?4:2;
  ctx.beginPath();ctx.ellipse(u.x,u.y+2,radius,radius*.78,0,0,Math.PI*2);
  ctx.fill();ctx.stroke();ctx.restore();
 }
 function drawIndicator(){
  if(over)return;
  const type=spells[mode]?mode:queuedSpell?.type;
  const spec=spells[type];if(!spec)return;
  const hero=queuedSpell?units.find(u=>u.id===queuedSpell.casterId&&u.hp>0):caster();
  if(!hero)return;
  const waiting=!!queuedSpell;
  const range=spec.range;
  ctx.save();
  ctx.fillStyle=spec.color+'0b';ctx.beginPath();ctx.arc(hero.x,hero.y,range,0,Math.PI*2);ctx.fill();
  ring(hero.x,hero.y,range,spec.color,.85,3,[14,9]);
  ring(hero.x,hero.y,24,'#d6ecff',.9,2);
  ctx.textAlign='center';ctx.font='bold 14px sans-serif';
  ctx.fillStyle='#fbe9d8';ctx.fillText(spec.label+' · 사거리 '+range,hero.x,Math.max(26,hero.y-range-8));
  if(spec.kind==='unit'){
   if(waiting){
    const target=spellPoint(queuedSpell);
    if(target){highlightUnit(target,true);ctx.save();ctx.strokeStyle=spec.color;ctx.lineWidth=3;ctx.setLineDash([9,8]);ctx.beginPath();ctx.moveTo(hero.x,hero.y);ctx.lineTo(target.x,target.y);ctx.stroke();ctx.restore();
     ctx.fillStyle='#ffcbcf';ctx.fillText('접근 후 자동 시전',target.x,Math.max(25,target.y-TYPES[target.type].r-23))}
   }else{
    for(const u of units){
     if(validTarget(type,u))highlightUnit(u,u.id===hoveredUnitId||distance(u,hoverPoint)<TYPES[u.type].r+12&&mouseInField);
    }
   }
  }else{
   const point=waiting?queuedSpell.point:mouseInField?hoverPoint:null;
   if(point){
    ctx.save();ctx.fillStyle=spec.color+'32';ctx.beginPath();ctx.arc(point.x,point.y,spec.aoe,0,Math.PI*2);ctx.fill();ctx.restore();
    ring(point.x,point.y,spec.aoe,spec.color,.95,3);
    if(distance(hero,point)>range) {
     ctx.save();ctx.strokeStyle='#ffbc83';ctx.lineWidth=2;ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(hero.x,hero.y);ctx.lineTo(point.x,point.y);ctx.stroke();ctx.restore();
     ctx.fillStyle='#ffd8aa';ctx.fillText('접근 후 시전',point.x,Math.max(26,point.y-spec.aoe-10))
    }
    for(const u of units){
     if(u.hp<=0||u.fixed||distance(u,point)>spec.aoe)continue;
     if(type==='mael'&&(!hostile(u)||u.type==='goliath'))continue;
     if(type==='storm'&&!hostile(u)){ring(u.x,u.y,TYPES[u.type].r+6,'#ffb86f',.85,2);continue}
     highlightUnit(u,true);
    }
   }
  }
  ctx.restore();
 }
 draw=function(){parent.draw();drawIndicator()};
 cv.addEventListener('pointermove',()=>{mouseInField=true});
 cv.addEventListener('pointerleave',()=>{mouseInField=false});
 // The original click handlers call mind(null)/feedback(null) on empty ground:
 // those now cancel targeting without spending PSI or moving the caster.
})();