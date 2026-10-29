/* Read-only lobby catalogue for all 300 shared augments.
 * No card balance or draft logic here; this views DesertAugments' live card data.
 */
(function(global){
'use strict';
const $=id=>document.getElementById(id);
const TIERS=[['silver','실버'],['gold','골드'],['prismatic','프리즘']];
const LABELS={common:'공통',silver:'실버',gold:'골드',prismatic:'프리즘'};
let scope='common',tier='all',faction='0',keyword='',cards=[],lastFocused=null,ready=false;
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;};
function factionName(i){
 return global.DesertRoster?.FACTIONS?.[i]?.name||'종족 '+(Number(i)+1);
}
function updateTab(){
 for(const b of document.querySelectorAll('#augmentCodexTabs [data-codex-scope]')){
  const chosen=b.dataset.codexScope===scope;
  b.classList.toggle('active',chosen);b.setAttribute('aria-pressed',String(chosen));
 }
 const factionLabel=$('augmentCodexFactionLabel');
 if(factionLabel)factionLabel.hidden=scope==='common';
 for(const b of document.querySelectorAll('#augmentCodexTiers [data-codex-tier]')){
  const chosen=b.dataset.codexTier===tier;
  b.classList.toggle('active',chosen);b.setAttribute('aria-pressed',String(chosen));
 }
}
function formatCard(card){
 const item=make('article','augment-codex-card');
 item.dataset.tier=card.tier;
 item.dataset.scope=card.scope;
 const meta=make('div','augment-codex-card-meta');
 const tag=make('span','augment-codex-tier '+card.tier,LABELS[card.tier]||card.tier);
 const origin=make('small','augment-codex-origin',card.scope==='common'?'공통 카드':factionName(card.scope.split('-')[1])+' 전용');
 meta.append(tag,origin);
 item.append(meta,make('h4','augment-codex-card-title',card.name),make('p','augment-codex-card-effect',card.description||'효과 설명 없음'));
 return item;
}
function render(){
 updateTab();
 const status=$('augmentCodexStatus'),results=$('augmentCodexResults');
 if(!results||!status)return;
 results.replaceChildren();
 if(!ready){
  status.textContent='증강 카드를 불러오는 중입니다…';
  return;
 }
 const query=keyword.toLocaleLowerCase('ko-KR');
 const scopeKey=scope==='common'?'common':'faction-'+faction;
 const chosen=cards.filter(c=>c.scope===scopeKey&&(tier==='all'||c.tier===tier)&&
  (!query||(c.name+' '+c.description).toLocaleLowerCase('ko-KR').includes(query)));
 const total=cards.filter(c=>c.scope===scopeKey).length;
 status.textContent=(scope==='common'?'공통':factionName(faction)+' 전용')+' · '+chosen.length+' / '+total+'종 표시 (전체 '+cards.length+'종)';
 if(!chosen.length){results.append(make('p','augment-codex-empty','검색 조건에 해당하는 증강 카드가 없습니다.'));return;}
 for(const [id,name] of TIERS){
  const set=chosen.filter(c=>c.tier===id);
  if(!set.length)continue;
  const section=make('section','augment-codex-section');
  section.setAttribute('aria-label',name+' 증강 '+set.length+'종');
  const title=make('h3','augment-codex-section-title',name+' · '+set.length+'종');
  const grid=make('div','augment-codex-grid');
  for(const c of set)grid.append(formatCard(c));
  section.append(title,grid);results.append(section);
 }
}
function prepareFactionSelect(){
 const select=$('augmentCodexFaction');if(!select)return;
 select.replaceChildren();
 for(let i=0;i<10;i++){
  const option=make('option','',factionName(i));
  option.value=String(i);select.append(option);
 }
 faction=String(global.DesertLobby?.selectedFaction?.()??0);
 if(!/^(?:[0-9])$/.test(faction))faction='0';
 select.value=faction;
}
async function open(){
 const dialog=$('augmentCodexDialog');if(!dialog)return;
 lastFocused=document.activeElement;
 prepareFactionSelect();
 const query=$('augmentCodexSearch');if(query){query.value='';keyword='';}
 scope='common';tier='all';ready=false;render();
 if(!dialog.open){
  if(typeof dialog.showModal==='function')dialog.showModal();
  else dialog.setAttribute('open','');
 }
 $('augmentCodexClose')?.focus?.();
 try{
  if(!global.DesertAugments?.load)throw Error('증강 시스템을 불러오지 못했습니다.');
  await global.DesertAugments.load();
  if(!dialog.open)return;
  cards=global.DesertAugments.list();
  if(cards.length!==300)throw Error('도감 데이터 300종을 확인할 수 없습니다.');
  ready=true;render();
 }catch(e){
  if(!dialog.open)return;
  const status=$('augmentCodexStatus');
  if(status)status.textContent='도감 로딩 오류: '+(e?.message||String(e))+' · 창을 닫고 다시 열어주세요.';
 }
}
function close(){
 const dialog=$('augmentCodexDialog');if(!dialog)return;
 if(typeof dialog.close==='function'&&dialog.open)dialog.close();
 else dialog.removeAttribute('open');
 lastFocused?.focus?.();
}
function init(){
 $('augmentCodexOpen')?.addEventListener('click',()=>{void open();});
 $('augmentCodexClose')?.addEventListener('click',close);
 $('augmentCodexDialog')?.addEventListener('close',()=>lastFocused?.focus?.());
 $('augmentCodexDialog')?.addEventListener('click',e=>{
  if(e.target===$('augmentCodexDialog'))close();
 });
 $('augmentCodexTabs')?.addEventListener('click',e=>{
  const b=e.target.closest('[data-codex-scope]');if(!b)return;
  scope=b.dataset.codexScope==='faction'?'faction':'common';render();
 });
 $('augmentCodexTiers')?.addEventListener('click',e=>{
  const b=e.target.closest('[data-codex-tier]');if(!b)return;
  tier=TIERS.some(x=>x[0]===b.dataset.codexTier)?b.dataset.codexTier:'all';render();
 });
 $('augmentCodexFaction')?.addEventListener('change',e=>{
  faction=/^[0-9]$/.test(e.target.value)?e.target.value:'0';render();
 });
 $('augmentCodexSearch')?.addEventListener('input',e=>{
  keyword=String(e.target.value||'').trim();render();
 });
}
global.DesertAugmentCodex=Object.freeze({open,close,render});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
