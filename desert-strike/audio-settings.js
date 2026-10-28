/* Independent music, voice and sound effect volume controls. */
(function(global){
 'use strict';
 function init(){
  for(const [id,out,group,api] of [
   ['audioMusicVolume','audioMusicValue','music',global.DesertLobbyMusic],
   ['audioVoiceVolume','audioVoiceValue','voice',global.DesertCombatAudio],
   ['audioEffectsVolume','audioEffectsValue','effects',global.DesertCombatAudio]
  ]){
   const input=document.getElementById(id),label=document.getElementById(out);if(!input||!api)return;
   const initial=api.volume(group);
   input.value=Number.isFinite(initial)?initial:input.value;
   label.textContent=input.value+'%';
   input.addEventListener('input',()=>{
    if(group==='music')api.setVolume(Number(input.value));else api.setVolume(group,Number(input.value));
    label.textContent=input.value+'%';
   });
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})(window);