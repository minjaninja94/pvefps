/* Dedicated full-screen touch command deck. Shared simulation, no page scrolling. */
(() => {
 'use strict';
 const main=document.querySelector('main'),frame=document.querySelector('.frame');
 const viewport=document.getElementById('touchViewport'),gamebar=frame.querySelector('.gamebar');
 const $m=id=>document.getElementById(id);
 const settings=document.createElement('section');
 settings.className='panel mobileSettings';
 settings.setAttribute('aria-label','게임 설정');
 const soundbar=document.querySelector('.soundbar');
 if(soundbar)settings.appendChild(soundbar);
 gamebar.appendChild(settings);
 const pause=$m('pause');if(pause)document.querySelector('header').appendChild(pause);
 const quick=document.createElement('div');quick.className='mobileQuick';
 quick.setAttribute('role','toolbar');quick.setAttribute('aria-label','항상 보이는 RTS 명령');
 const commands=[
  ['move','➜','이동'],
  ['attackmove','⚔','공격 이동'],
  ['mind','✦','정신 지배'],
  ['storm','ϟ','사이오닉 스톰'],
  ['siege','◉','시즈모드'],
  ['stop','■','정지']
 ];
 for(const [key,icon,title] of commands){
  const button=document.createElement('button');
  button.dataset.quick=key;
  button.innerHTML=icon+'<small>'+title+'</small>';
  button.type='button';
  button.onclick=()=>{
   const origin=document.querySelector('.commandsPanel .command[data-command="'+key+'"]');
   if(origin&&!origin.disabled)origin.click();
   sync();
  };
  quick.appendChild(button);
 }
 const tabs=document.createElement('div');tabs.className='mobileTabs';tabs.setAttribute('role','tablist');
 const sections=[
  ['selectionPanel','유닛'],
  ['commandsPanel','명령'],
  ['campaignPanel','강화'],
  ['mapPanel','지도'],
  ['mobileSettings','설정']
 ];
 let tab='selectionPanel';
 function selectTab(id){
  tab=id;
  for(const [name] of sections){
   const panel=gamebar.querySelector('.'+name);
   if(panel)panel.classList.toggle('mobileActive',name===id);
  }
  for(const b of tabs.querySelectorAll('button'))b.setAttribute('aria-selected',String(b.dataset.sheet===id));
 }
 for(const [key,title] of sections){
  const b=document.createElement('button');
  b.dataset.sheet=key;b.type='button';b.textContent=title;b.setAttribute('role','tab');b.setAttribute('aria-selected','false');
  b.onclick=()=>selectTab(key);
  tabs.appendChild(b);
 }
 frame.appendChild(quick);frame.appendChild(tabs);
 const message=$m('message');if(message)frame.appendChild(message);
 selectTab(tab);
 // Keep the normal canvas-to-world coordinate conversion unchanged, but fill
 // the available height so the whole vertical battlefield fits without scrolling.
 viewport.classList.remove('zoomActive');
 mobileZoomed=false;
 const zoom=$m('mobileZoom');
 zoom.onclick=()=>{
  const rect=cv.getBoundingClientRect();
  const x=(viewport.scrollLeft+viewport.clientWidth/2)/Math.max(1,rect.width)*W;
  const y=(viewport.scrollTop+viewport.clientHeight/2)/Math.max(1,rect.height)*H;
  mobileZoomed=!mobileZoomed;
  viewport.classList.toggle('zoomActive',mobileZoomed);
  zoom.textContent=mobileZoomed?'🔍 전체 보기':'🔎 확대';
  requestAnimationFrame(()=>centerMobileCamera(x,y,'instant'));
 };
 zoom.textContent='🔎 확대';
 function sync(){
  for(const b of quick.querySelectorAll('[data-quick]')){
   const key=b.dataset.quick,origin=document.querySelector('.commandsPanel .command[data-command="'+key+'"]');
   b.disabled=!origin||origin.disabled||(key==='siege'&&origin.hidden);
   b.classList.toggle('on',key!=='siege'&&mode===key);
   b.classList.toggle('siegeReady',key==='siege'&&origin&&!origin.hidden&&!origin.disabled);
   if(key==='siege')b.querySelector('small').textContent=chosen().some(u=>u.type==='siegetank'&&u.sieged)?'시즈 해제':'시즈모드';
  }
 }
 const oldUpdate=updateUI;
 updateUI=function(){oldUpdate();sync()};
 // Recenter on window size/orientation changes while keeping the battlefield visible.
 let lastWidth=0,lastHeight=0;
 const resize=()=>{
  const rect=cv.getBoundingClientRect(),w=viewport.clientWidth,h=viewport.clientHeight;
  if(!w||!h||Math.abs(lastWidth-w)<3&&Math.abs(lastHeight-h)<3)return;
  lastWidth=w;lastHeight=h;
  if(rect.width)centerMobileCamera(Math.max(HOME.x+190,Math.min(W-320,(viewport.scrollLeft+w/2)/rect.width*W)),H/2,'instant');
 };
 window.addEventListener('resize',resize);
 window.addEventListener('orientationchange',()=>requestAnimationFrame(resize));
 requestAnimationFrame(()=>{resize();sync()});
})();
