(()=>{'use strict';
const groups={face:['name','hair','skin','color','headScale','accessory'],body:['body','bust','bustSize','waist','hips','height'],outfit:['costume','palette','weapon','dressColor'],motion:['motion','bustMotion'],extra:['art','image','species','eyes','eyeColor']},active={P:'face',B:'face'};let mounted=false;
function refresh(side){
 if(!mounted)return;
 for(const [group,keys]of Object.entries(groups))for(const key of keys){const input=document.getElementById(key+side);input?.closest('label').classList.toggle('categoryHidden',group!==active[side])}
 const choices=document.getElementById('dollChoices'+side);choices.hidden=document.getElementById('art'+side).value!=='doll'||!['face','outfit'].includes(active[side]);choices.querySelectorAll('[data-choice-group]').forEach(el=>el.hidden=el.dataset.choiceGroup!==active[side]);
}
function mount(){
 if(mounted)return;mounted=true;const grid=document.querySelector('.studioGrid'),tabs=document.createElement('div');tabs.className='studioSideTabs';tabs.setAttribute('aria-label','꾸밀 파이터');
 for(const [side,name]of [['P','내 캐릭터'],['B','상대 캐릭터']]){
  const card=document.querySelector('.styleCard[data-side="'+side+'"]'),button=document.createElement('button');button.type='button';button.textContent=name;button.dataset.studioSide=side;button.classList.toggle('selected',side==='P');card.classList.toggle('studioActive',side==='P');button.onclick=()=>{document.querySelectorAll('.styleCard').forEach(c=>c.classList.toggle('studioActive',c===card));tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===button))};tabs.append(button);
  const preview=card.querySelector('.fighterPreview'),panel=document.createElement('div');panel.className='previewPanel';preview.before(panel);panel.append(preview,card.querySelector('.motionPreview'),card.querySelector('.styleActions'));
  const choices=document.getElementById('dollChoices'+side);for(const [kind,group]of [['head','face'],['outfit','outfit']]){const root=document.getElementById(kind+'Choices'+side),title=root.previousElementSibling,wrap=document.createElement('div');wrap.dataset.choiceGroup=group;wrap.append(title,root);choices.append(wrap)}card.querySelector('.styleInputs').append(choices);
  const nav=document.createElement('div');nav.className='studioCategoryTabs';for(const [key,label]of [['face','얼굴·헤어'],['body','체형'],['outfit','의상'],['motion','움직임'],['extra','기타']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.studioCategory=key;b.dataset.side=side;b.classList.toggle('selected',key==='face');b.onclick=()=>{active[side]=key;nav.querySelectorAll('button').forEach(n=>n.classList.toggle('selected',n===b));refresh(side)};nav.append(b)}card.querySelector('.styleCardTitle').after(nav);
  for(const key of ['skin','color']){const input=document.getElementById(key+side),row=document.createElement('div');row.className='swatchRow';const values=key==='skin'?['#ffe4d4','#f8d7c1','#d6a17c','#9c6954','#704d43']:['#84ebff','#ff7a98','#c9a6ff','#b9ffcc','#eee8df','#272f48'];for(const value of values){const b=document.createElement('button');b.type='button';b.style.background=value;b.setAttribute('aria-label',key+' '+value);b.onclick=()=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))};row.append(b)}input.after(row)}refresh(side);
 }
 grid.before(tabs);
}
window.NeonStudioUI=Object.freeze({mount,refresh});
})();
