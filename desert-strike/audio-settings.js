/* Persistent, shared lobby and in-battle music/voice/effects mixer. */
(function(global){
 'use strict';
 const $=id=>document.getElementById(id);
 const controls=[
  {group:'music',ids:[['audioMusicVolume','audioMusicValue'],['battleMusicVolume','battleMusicValue']]},
  {group:'voice',ids:[['audioVoiceVolume','audioVoiceValue'],['battleVoiceVolume','battleVoiceValue']]},
  {group:'effects',ids:[['audioEffectsVolume','audioEffectsValue'],['battleEffectsVolume','battleEffectsValue']]}
 ];
 const api=group=>group==='music'?global.DesertLobbyMusic:global.DesertCombatAudio;
 const volume=group=>api(group)?.volume?.(group);
 function refresh(){
  for(const {group,ids} of controls){
   const n=volume(group);
   if(!Number.isFinite(n))continue;
   for(const [id,labelId] of ids){
    const input=$(id),label=$(labelId);
    if(input)input.value=String(n);
    if(label)label.textContent=n+'%';
   }
  }
  for(const [id,kind] of [['battleMusicToggle','music'],['battleEffectsToggle','effects']]){
   const btn=$(id);if(!btn)continue;
   const enabled=api(kind)?.isEnabled?.()!==false;
   btn.setAttribute('aria-pressed',String(enabled));
   btn.textContent=kind==='music'?(enabled?'♫ 배경음악 켜짐':'♫ 배경음악 꺼짐'):
    (enabled?'🔊 음성·효과음 켜짐':'🔇 음성·효과음 꺼짐');
  }
 }
 function update(group,n){
  const a=api(group);if(!a)return;
  if(group==='music')a.setVolume(Number(n));
  else a.setVolume(group,Number(n));
  refresh();
 }
 function init(){
  for(const {group,ids} of controls)for(const [id] of ids){
   const input=$(id);if(input)input.addEventListener('input',()=>update(group,input.value));
  }
  for(const [id,kind] of [['battleMusicToggle','music'],['battleEffectsToggle','effects']]){
   const btn=$(id);if(btn)btn.addEventListener('click',()=>{
    const a=api(kind);a?.setEnabled?.(!(a.isEnabled?.()!==false));refresh();
   });
  }
  const gear=$('battleAudioSettingsButton'),panel=$('battleAudioSettingsPanel'),close=$('battleAudioClose');
  const show=open=>{
   if(!gear||!panel)return;
   panel.hidden=!open;
   gear.setAttribute('aria-expanded',String(open));
   if(open)refresh();
  };
  if(gear&&panel){
   gear.addEventListener('click',()=>show(panel.hidden));
   close?.addEventListener('click',()=>{show(false);gear.focus?.();});
   document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!panel.hidden){show(false);gear.focus?.();}
   });
   document.addEventListener('pointerdown',e=>{
    if(!panel.hidden&&!panel.contains(e.target)&&!gear.contains(e.target))show(false);
   });
  }
  // The three lobby sliders and the battle controls share the exact same
  // persisted API state; changes take effect without leaving the battle.
  refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})(window);
