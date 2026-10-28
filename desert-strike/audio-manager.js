/* Desert Front sound mixer. Audio begins only after user interaction. */
(function(global){
'use strict';
const base='../desert-front-godot/assets/audio/';
const tracks={menu:'title',ready:'sector',battle:'pulse',urgent:'urgent',result:'transmission'};
const weapon=['blade','rifle','breaker','armor','antiair','siege','flyer','heal'];
const settings={music:.22,voice:.5,effects:.3,mute:false};
const slots=[new Audio(),new Audio()];
for(const slot of slots){slot.loop=true;slot.preload='none';}
let current=-1,scene='',unlocked=false,fade=null,lastAlarm=0;
const active=new Set(),voices=new Set(),lastCue=new Map(),atlases=new Map();
let voiceIndex={};
const castReady=fetch(base+'voice_index.json').then(r=>r.json()).then(data=>{voiceIndex=data.clips||{};}).catch(()=>{});
const context=window.AudioContext?new AudioContext():null;
function atlas(name){
 if(!context)return Promise.resolve(null);
 if(!atlases.has(name))atlases.set(name,fetch(base+'voices/'+name).then(r=>{if(!r.ok)throw Error('voice atlas');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).catch(()=>null));
 return atlases.get(name);
}
function volume(group,gain=1){return settings.mute||document.hidden?0:Math.min(1,settings[group]*gain);}
function music(next){
 if(!unlocked||document.hidden||scene===next)return;
 scene=next;
 const name=tracks[next]||tracks.menu;
 const previous=current;current=1-current;
 const target=slots[current];
 target.src=base+'music/'+name+'.ogg';target.currentTime=0;target.volume=0;
 target.play().catch(()=>{});
 if(fade)clearInterval(fade);
 let step=0;fade=setInterval(()=>{
  step++;target.volume=volume('music',Math.min(1,step/12));
  if(previous>=0)slots[previous].volume=volume('music',Math.max(0,1-step/12));
  if(step>=12){clearInterval(fade);fade=null;if(previous>=0)slots[previous].pause();}
 },45);
}
function cue(kind,x=1650,group='effects'){
 if(!unlocked||document.hidden||active.size>=8)return;
 const now=performance.now(),previous=lastCue.get(kind)||0;
 if(now-previous<95)return;
 lastCue.set(kind,now);
 const audio=new Audio(base+'sfx/'+kind+'.wav');
 const distance=Math.max(.3,1-Math.abs(x-1650)/2200);
 audio.volume=volume(group,distance);if(!audio.volume)return;
 active.add(audio);audio.onended=audio.onerror=()=>active.delete(audio);
 audio.play().catch(()=>active.delete(audio));
}
function unit(faction,role,skin,event,x=1650){
 if(!unlocked||document.hidden||active.size+voices.size>=8||!context)return;
 const variant=skin==='moe'?'moe':'default';
 const key=variant+'/'+faction+'-'+role+'-'+event;
 const clip=voiceIndex[key]||voiceIndex['default/'+faction+'-'+role+'-'+event];
 if(!clip)return;
 const cooldown='unit-'+faction+'-'+role+'-'+event;
 const now=performance.now();
 if(now-(lastCue.get(cooldown)||0)<240)return;
 lastCue.set(cooldown,now);
 const distance=Math.max(.25,1-Math.abs(x-1650)/2200),gain=volume('voice',distance);
 if(!gain)return;
 atlas(clip.atlas).then(buffer=>{
  if(!buffer||document.hidden||settings.mute||active.size+voices.size>=8)return;
  if(context.state==='suspended')context.resume().catch(()=>{});
  const source=context.createBufferSource(),level=context.createGain();
  source.buffer=buffer;level.gain.value=gain;
  source.connect(level);level.connect(context.destination);
  voices.add(source);
  source.onended=()=>{voices.delete(source);source.disconnect();level.disconnect();};
  source.start(0,clip.start,clip.duration);
 }).catch(()=>{});
}
function alarm(){
 const now=performance.now();
 if(now-lastAlarm<9000)return;
 lastAlarm=now;cue('alarm',1650);
}
function refresh(){if(current>=0)slots[current].volume=volume('music');}
function unlock(){
 if(unlocked)return;
 unlocked=true;if(context)context.resume().catch(()=>{});music(document.getElementById('frontLobby')?.hidden?'battle':'menu');
}
document.addEventListener('pointerdown',unlock,{once:true});
document.addEventListener('keydown',unlock,{once:true});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){slots.forEach(x=>x.pause());for(const audio of active)audio.pause();active.clear();for(const voice of voices)voice.stop();voices.clear();if(context)context.suspend().catch(()=>{});}
 else if(unlocked){if(context)context.resume().catch(()=>{});scene='';music(document.getElementById('frontLobby')?.hidden?'battle':'menu');}
});
function init(){
 for(const group of ['music','voice','effects']){
  const input=document.getElementById('audio-'+group);
  if(input)input.addEventListener('input',()=>{settings[group]=Number(input.value)/100;refresh();});
 }
 const mute=document.getElementById('audio-mute');
 if(mute)mute.addEventListener('change',()=>{settings.mute=mute.checked;if(settings.mute){for(const voice of voices)voice.stop();voices.clear();}refresh();});
 setInterval(()=>{
  if(!unlocked||document.hidden)return;
  const lobby=document.getElementById('frontLobby');
  const multi=document.getElementById('view-multiplayer');
  if(lobby&&!lobby.hidden)music('menu');
  else if(multi?.classList.contains('active')&&document.getElementById('mpCommand')?.hidden)music('ready');
  else if(!multi?.classList.contains('active'))music('battle');
 },1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
global.DesertAudio=Object.freeze({music,cue,unit,alarm,castReady});
})(window);
