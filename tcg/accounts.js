(() => {
  const storageKey='dimension-war-accounts-v1';
  let profiles=[], active=null;
  try{
    const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
    profiles=Array.isArray(saved?.profiles)?saved.profiles:[];
    active=profiles.find(p=>p.id===saved?.active)||null;
  }catch{}
  const initial=active;
  const key=name=>name+(active?':'+active.id:':guest');
  const $=id=>document.getElementById(id);
  function activate(profile){
    try{
      localStorage.setItem(storageKey,JSON.stringify({profiles,active:profile.id}));
    }catch{
      $('accountError').textContent='브라우저가 저장을 차단했습니다. 로컬 저장을 허용해 주세요.';return;
    }
    location.reload();
  }
  function init(){
    const modal=$('accountDialog'), form=$('accountForm'), select=$('accountSelect');
    $('accountOpen').textContent=active?active.name+' · 계정':'로컬 계정';
    $('accountClose').hidden=!active;
    $('accountUse').hidden=!profiles.length;
    select.hidden=!profiles.length;
    for(const account of profiles){
      const option=document.createElement('option');
      option.value=account.id;option.textContent=account.name;option.selected=active?.id===account.id;select.append(option);
    }
    $('accountOpen').onclick=()=>modal.showModal();
    $('accountClose').onclick=()=>modal.close();
    $('accountUse').onclick=()=>{const profile=profiles.find(p=>p.id===select.value);if(profile)activate(profile);};
    modal.addEventListener('cancel',e=>{if(!active)e.preventDefault();});
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const name=$('accountName').value.trim();
      if(name.length<2||name.length>24){$('accountError').textContent='2~24자 이름을 입력하세요.';return;}
      if(profiles.some(p=>p.name.toLowerCase()===name.toLowerCase())){$('accountError').textContent='같은 이름의 계정이 있습니다.';return;}
      const id=crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
      const profile={id,name};
      if(!profiles.length){
        const oldKeys=['dimension-war-collection-v1','dw-tcg-gold-cards',...Array.from({length:8},(_,i)=>'dw-tcg-deck-'+i)];
        try {for(const old of oldKeys){const value=localStorage.getItem(old);if(value!==null)localStorage.setItem(old+':'+profile.id,value);}}
        catch{$('accountError').textContent='이 브라우저에서 계정을 저장할 수 없습니다.';return;}
      }
      profiles.push(profile);activate(profile);
    });
    if(!active)modal.showModal();
  }
  window.TCG_ACCOUNTS={active:initial,key,init};
})();
