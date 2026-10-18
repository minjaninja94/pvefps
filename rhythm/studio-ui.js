(()=>{'use strict';
let generator=null,preset=null,motion=null,exporter=null;
function readLocks(side){return [...document.querySelectorAll('input[data-lock-group="'+side+'"]:checked')].map(n=>n.value)}
const groups={face:['name','skin','headScale','eyes','eyeColor','expression'],hair:['hair','color','accessory'],body:['body','bust','bustSize','waist','hips','height'],outfit:['costume','palette','weapon','dressColor'],motion:['motion','bustMotion','lookStrength','animationStyle'],extra:['art','image','species']},active={P:'face',B:'face'};let mounted=false;
function refresh(side){
 if(!mounted)return;
 for(const [group,keys]of Object.entries(groups))for(const key of keys){const input=document.getElementById(key+side);input?.closest('label').classList.toggle('categoryHidden',group!==active[side])}
 const choices=document.getElementById('dollChoices'+side);choices.hidden=document.getElementById('art'+side).value!=='doll'||!['hair','outfit'].includes(active[side]);choices.querySelectorAll('[data-choice-group]').forEach(el=>el.hidden=el.dataset.choiceGroup!==active[side]);
}
function mount(){
 if(mounted)return;mounted=true;const grid=document.querySelector('.studioGrid'),tabs=document.createElement('div');tabs.className='studioSideTabs';tabs.setAttribute('aria-label','꾸밀 파이터');
 for(const [side,name]of [['P','내 캐릭터'],['B','상대 캐릭터']]){
  const card=document.querySelector('.styleCard[data-side="'+side+'"]'),button=document.createElement('button');button.type='button';button.textContent=name;button.dataset.studioSide=side;button.classList.toggle('selected',side==='P');card.classList.toggle('studioActive',side==='P');button.onclick=()=>{document.querySelectorAll('.styleCard').forEach(c=>c.classList.toggle('studioActive',c===card));tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===button))};tabs.append(button);
  const preview=card.querySelector('.fighterPreview'),panel=document.createElement('div');panel.className='previewPanel';preview.before(panel);panel.append(preview,card.querySelector('.motionPreview'),card.querySelector('.styleActions'));
  if(window.NeonMotion){
   const motionBar=document.createElement('div');motionBar.className='motionLibrary';
   const actions=document.createElement('select');actions.id='motionClip'+side;actions.setAttribute('aria-label','애니메이션 클립 선택');
   for(const [key,title]of [['idleA','대기 A'],['idleB','대기 B'],['idleC','대기 C'],['ready','준비'],['step','전진'],['dodge','회피'],['guard','가드'],['attack','공격 1'],['attack2','공격 2'],['attack3','공격 3'],['hit','경피격'],['hitHeavy','강피격'],['drawClash','무승부 합겨루기'],['drawPush','밀어내기'],['drawRecover','후퇴'],['superCharge','필살기 준비'],['superRelease','필살기'],['win','승리'],['lose','패배'],['intro','등장']]){
    const op=document.createElement('option');op.value=key;op.textContent=title;actions.append(op);
   }
   const play=document.createElement('button');play.type='button';play.textContent='▶ 모션 재생';play.onclick=()=>motion?.(side,actions.value);
   const exportBtn=document.createElement('button');exportBtn.type='button';exportBtn.textContent='24프레임 PNG 생성';
   exportBtn.onclick=async()=>{if(!exporter)return;exportBtn.disabled=true;exportBtn.textContent='PNG 만드는 중…';try{await exporter(side,actions.value)}catch(e){const node=document.getElementById('studioStatus');node.textContent='프레임 생성 실패: '+(e?.message||e)}finally{exportBtn.disabled=false;exportBtn.textContent='24프레임 PNG 생성'}};
   motionBar.append(actions,play,exportBtn);panel.append(motionBar);
  }const hint=document.createElement('div');hint.className='livePreviewHint';hint.innerHTML='<b>LIVE PORTRAIT</b> · 마우스를 움직이면 고개와 시선이 따라옵니다. 클릭하면 살짝 고개를 끄덕입니다. 눈·얼굴은 원형을 유지합니다.';panel.append(hint);
  const choices=document.getElementById('dollChoices'+side);for(const [kind,group]of [['head','hair'],['outfit','outfit']]){const root=document.getElementById(kind+'Choices'+side),title=root.previousElementSibling,wrap=document.createElement('div');wrap.dataset.choiceGroup=group;wrap.append(title,root);choices.append(wrap)}card.querySelector('.styleInputs').append(choices);
  const nav=document.createElement('div');nav.className='studioCategoryTabs';for(const [key,label]of [['face','얼굴'],['hair','헤어'],['body','체형'],['outfit','의상'],['motion','움직임'],['extra','기타']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.studioCategory=key;b.dataset.side=side;b.classList.toggle('selected',key==='face');b.onclick=()=>{active[side]=key;nav.querySelectorAll('button').forEach(n=>n.classList.toggle('selected',n===b));refresh(side)};nav.append(b)}card.querySelector('.styleCardTitle').after(nav);
  const gen=window.NeonWardrobeGenerator;
  if(gen){
   const designer=document.createElement('details');designer.className='lookDesigner';designer.open=side==='P';
   const summary=document.createElement('summary');summary.textContent='✦ 테마 디자인 / 프리셋 16종 / 요소 잠금';designer.append(summary);
   const controls=document.createElement('div');controls.className='lookDesignerControls';
   const theme=document.createElement('select');theme.id='theme'+side;
   theme.setAttribute('aria-label','랜덤 테마');for(const item of [{id:'mixed',name:'모든 테마 섞기'},...gen.themes]){const op=document.createElement('option');op.value=item.id;op.textContent=item.name;theme.append(op)}
   const make=document.createElement('button');make.type='button';make.textContent='✦ 선택 조건으로 생성';make.onclick=()=>generator?.(side,theme.value,readLocks(side));
   controls.append(theme,make);designer.append(controls);
   const lockGroup=document.createElement('div');lockGroup.className='lookLocks';
   for(const [key,title]of [['identity','기본 캐릭터'],['face','얼굴'],['hair','헤어'],['body','체형'],['outfit','의상'],['motion','모션']]){
    const wrap=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.value=key;check.dataset.lockGroup=side;
    wrap.append(check,document.createTextNode(title+' 고정'));lockGroup.append(wrap);
   }
   designer.append(lockGroup);
   const caption=document.createElement('p');caption.textContent='마음에 드는 얼굴·의상을 고정한 상태로 나머지만 다시 생성할 수 있습니다.';designer.append(caption);
   const cards=document.createElement('div');cards.className='lookPresets';for(const [i,p]of gen.curated().entries()){
    const item=document.createElement('button');item.type='button';item.className='lookPreset';
    const swatch=document.createElement('span');swatch.className='lookPresetSwatch';swatch.style.background='linear-gradient(135deg,'+p.hair+', '+p.outfit+')';
    const label=document.createElement('span');label.textContent=p.name+' '+(i%2===0?'A':'B');
    item.append(swatch,label);item.title='이 프리셋 적용';item.onclick=()=>preset?.(side,p);cards.append(item);
   }
   designer.append(cards);nav.before(designer);
  }
  for(const key of ['skin','color']){const input=document.getElementById(key+side),row=document.createElement('div');row.className='swatchRow';const values=key==='skin'?['#ffe4d4','#f8d7c1','#d6a17c','#9c6954','#704d43']:['#84ebff','#ff7a98','#c9a6ff','#b9ffcc','#eee8df','#272f48'];for(const value of values){const b=document.createElement('button');b.type='button';b.style.background=value;b.setAttribute('aria-label',key+' '+value);b.onclick=()=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))};row.append(b)}input.after(row)}refresh(side);
 }
 grid.before(tabs);
}
window.NeonStudioUI=Object.freeze({mount,refresh,bindGenerator(fn){generator=fn},bindPreset(fn){preset=fn},bindMotion(fn){motion=fn},bindExport(fn){exporter=fn}});
})();
