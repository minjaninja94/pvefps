/* Shared round-by-round augment pick history for solo and multiplayer drafts.
 * Reads only the current viewer's chosen IDs. Full descriptions appear on
 * mouse hover, keyboard focus, and tap/click; never interpret card text as HTML.
 */
(function(global){
'use strict';
const ROUNDS=[1,10,20,30,40];
const TIER_NAME={silver:'실버',gold:'골드',prismatic:'프리즘'};
const make=(tag,className,text)=>{
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
function render(target,selected=[],currentRound=1){
 if(!target)return;
 const ids=Array.isArray(selected)?selected.slice(0,5):[];
 const stage=Number(currentRound)||1;
 const root=make('section','augment-history');
 root.setAttribute('aria-label','라운드별 이전 증강 선택 기록');
 const header=make('div','augment-history-heading');
 header.append(make('strong','', '이전 증강 선택 기록'),
  make('small','',ids.length+' / '+ROUNDS.length+'개 선택 · 올리거나 누르면 효과 확인'));
 const strip=make('div','augment-history-strip');
 const preview=make('div','augment-history-preview');
 preview.setAttribute('aria-live','polite');
 const hint='기존 증강에 마우스를 올리거나 터치하면 상세 능력치를 확인할 수 있습니다.';
 const hintNode=make('p','augment-history-hint',hint);
 preview.append(hintNode);
 let pinned=null;
 const chips=[];
 function details(index){
  const card=global.DesertAugments?.card?.(ids[index]);
  preview.replaceChildren();
  if(!card){preview.append(make('p','augment-history-hint',hint));return;}
  const title=make('strong','augment-history-preview-title',card.name||'증강 카드');
  const meta=make('small','augment-history-preview-meta',
   'WAVE '+ROUNDS[index]+' · '+(TIER_NAME[card.tier]||card.tier||'증강')+' · 누적 '+(index+1)+'번째');
  const effect=make('p','augment-history-effect',card.description||'능력 효과 설명 없음');
  preview.append(meta,title,effect);
 }
 function select(index){
  for(let i=0;i<chips.length;i++)if(chips[i])chips[i].classList.toggle('inspected',i===index);
  if(index===null){preview.replaceChildren(make('p','augment-history-hint',hint));return;}
  details(index);
 }
 for(let i=0;i<ROUNDS.length;i++){
  const round=ROUNDS[i],id=ids[i],card=id?global.DesertAugments?.card?.(id):null;
  const chip=make(card?'button':'div','augment-history-chip '+(card?'is-picked':'is-empty'));
  const wave=make('small','augment-history-round','WAVE '+String(round).padStart(2,'0'));
  const name=make('span','augment-history-name',card?.name||(round===stage?'이번 선택':round<stage?'미선택':'대기'));
  chip.append(wave,name);
  if(card){
   chip.type='button';
   chip.dataset.tier=card.tier||'silver';
   chip.title='WAVE '+round+' · '+card.name+' — '+(card.description||'');
   chip.setAttribute('aria-label','WAVE '+round+' 선택 증강 '+card.name+' · 상세 효과 확인');
   chip.addEventListener('mouseenter',()=>select(i));
   chip.addEventListener('mouseleave',()=>{if(pinned!==null)select(pinned);else select(null);});
   chip.addEventListener('focus',()=>select(i));
   chip.addEventListener('blur',()=>{if(pinned!==null)select(pinned);else select(null);});
   chip.addEventListener('click',()=>{
    pinned=pinned===i?null:i;
    select(pinned===null?i:pinned);
   });
   chips[i]=chip;
  }else{
   chip.setAttribute('aria-label','WAVE '+round+' · '+(round===stage?'이번 선택':round<stage?'미선택':'대기'));
  }
  strip.append(chip);
 }
 root.append(header,strip,preview);
 target.replaceChildren(root);
}
global.DesertAugmentHistory=Object.freeze({render,ROUNDS});
})(window);
