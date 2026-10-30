/* Desert Front web combat voices and effects copied from the native Godot port.
 * Intentionally separate from lobby-music.js: never replace or start BGM here.
 * VOICEVOX Nemo attribution: see AUDIO_CREDITS.md.
 */
(function (global) {
 'use strict';
 const ROOT = './assets/audio/';
 const ENABLED_KEY = 'desert-front-combat-audio-enabled';
 const WEAPONS = Object.freeze(['blade','rifle','breaker','armor','antiair','siege','flyer','heal','heal','breaker','blade']);
 const CUES = new Set(['alarm','antiair','armor','blade','breaker','building','death','explosion','flyer','heal','hit','rifle','siege']);
 const activeEffects = new Set();
 const activeVoices = new Set();
 const cooldowns = new Map();
 const atlases = new Map();
 const Context = global.AudioContext || global.webkitAudioContext;
 let enabled = true, context = null, voiceIndex = null, indexPromise = null, generation = 0;
 let specialSpeaking = false;
 const SPECIALIST_LINES=Object.freeze({
  9:{spawn:'저격 위치 확보',attack:'목표 조준 완료',hit:'엄폐 위치 변경',death:'저격수 이탈'},
  10:{spawn:'은밀 침투 시작',attack:'급소 포착',hit:'적에게 발각됐다',death:'침투 종료'}
 });
 function specialistLine(faction,role,event){
  if(faction===3&&role===9)return {spawn:'쾌흥태, 포복 저격 투입!',attack:'오도 대물탄 발사!',hit:'쾌흥태, 재조준!',death:'쾌흥태, 위치 이탈!'}[event];
  if(faction===3&&role===10)return {spawn:'견쌍섭, 은신 침투!',attack:'긴빠이 작전 개시!',hit:'견쌍섭, 들켰다!',death:'견쌍섭, 작전 종료!'}[event];
  const names=global.DesertExpansion?.NAMES?.[faction],subject=names?.[role===9?0:1]|| (role===9?'저격병':'암살자');
  return subject+', '+SPECIALIST_LINES[role][event]+'!';
 }
 function speakSpecial(faction,role,event){
  const synth=global.speechSynthesis,Utterance=global.SpeechSynthesisUtterance;
  if(!synth||typeof Utterance!=='function'||synth.speaking||synth.pending||specialSpeaking)return false;
  const voices=synth.getVoices?.()||[];
  const voice=voices.find(v=>/^ko(?:-|$)/i.test(v.lang));
  if(!voice)return false; // Fallback to shipped VOICEVOX clips on systems without Korean TTS.
  try{
   const u=new Utterance(specialistLine(faction,role,event));
   u.lang='ko-KR';u.voice=voice;u.volume=Math.min(1,levels.voice);
   u.rate=role===9?.91:1.17;u.pitch=role===9?.78:1.05;
   specialSpeaking=true;
   u.onend=u.onerror=()=>{specialSpeaking=false;};
   synth.speak(u);return true;
  }catch(_){specialSpeaking=false;return false;}
 }

 const levels={voice:.5,effects:.32};
 for(const key of ['voice','effects'])try{const n=global.localStorage.getItem('desert-front-volume-'+key);if(n!==null&&Number.isFinite(Number(n)))levels[key]=Math.min(1,Math.max(0,Number(n)/100));}catch(_){}
 try { enabled = global.localStorage.getItem(ENABLED_KEY) !== 'false'; } catch (_) {}

 function toggle() { return document.getElementById('combatAudioToggle'); }
 function renderToggle() {
  const button = toggle();
  if (!button) return;
  button.textContent = enabled ? '🔊 전투음 ON' : '🔇 전투음 OFF';
  button.setAttribute('aria-pressed', String(enabled));
  button.title = '유닛 음성 및 전투 효과음 켜기 / 끄기 (배경음악과 별도)';
 }
 function inBattle() {
  return enabled && !document.hidden && document.body &&
   document.body.dataset.playMode !== undefined &&
   !document.body.classList.contains('lobby-active');
 }
 function canPlay(key, cooldown) {
  if (!inBattle()) return false;
  const now = performance.now(), last = cooldowns.get(key);
  if (last !== undefined && now-last < cooldown) return false;
  cooldowns.set(key, now);
  if (cooldowns.size > 300) for (const [old, time] of cooldowns) if (now-time > 10000) cooldowns.delete(old);
  return true;
 }
 function distanceGain(x) {
  return Math.max(.25, 1-Math.abs((Number.isFinite(x) ? x : 1650)-1650)/2200);
 }
 function unlock() {
  if (!enabled || !Context) return;
  try {
   if (!context) context = new Context();
   if (context.state === 'suspended') {
    const result = context.resume();
    if (result && result.catch) result.catch(() => {});
   }
  } catch (_) {}
 }
 function loadIndex() {
  if (!indexPromise) indexPromise = global.fetch(ROOT+'voice_index.json')
   .then(response => { if (!response.ok) throw new Error('Voice index unavailable'); return response.json(); })
   .then(data => { voiceIndex = data.clips || {}; return voiceIndex; })
   .catch(() => { voiceIndex = {}; return voiceIndex; });
  return indexPromise;
 }
 function atlas(name) {
  if (!context || !/^f\d+-(?:default|moe)\.ogg$/.test(name)) return Promise.resolve(null);
  if (!atlases.has(name)) {
   const decoder = context;
   atlases.set(name, global.fetch(ROOT+'voices/'+name)
    .then(response => { if (!response.ok) throw new Error('Voice atlas unavailable'); return response.arrayBuffer(); })
    .then(buffer => decoder.decodeAudioData(buffer))
    .catch(() => null));
  }
  return atlases.get(name);
 }
 function cue(kind, x=1650) {
  if (!CUES.has(kind) || activeEffects.size >= 7 || !canPlay('sfx:'+kind, kind==='alarm'?9000:kind==='hit'?115:kind==='rifle'?95:kind==='heal'?300:180)) return;
  let audio;
  try {
   audio = new Audio(ROOT+'sfx/'+kind+'.wav');
   audio.volume = Math.min(1, levels.effects*distanceGain(x));
   audio.preload = 'auto';
   activeEffects.add(audio);
   const cleanup = () => { activeEffects.delete(audio); audio.onended = null; audio.onerror = null; };
   audio.onended = cleanup; audio.onerror = cleanup;
   const pending = audio.play();
   if (pending && pending.catch) pending.catch(cleanup);
  } catch (_) { if (audio) activeEffects.delete(audio); }
 }
 function unit(faction, role, skin, event, x=1650) {
  if (!Number.isInteger(faction) || faction<0 || faction>9 ||
      !Number.isInteger(role) || role<0 || role>10 ||
      !['spawn','attack','hit','death'].includes(event) || !inBattle()) return;
  if(role===9||role===10){
   const delay=event==='attack'?2400:1900;
   if(!canPlay('special-voice:'+faction+'-'+role+'-'+event,delay))return;
   if(speakSpecial(faction,role,event))return;
   // No Korean speech engine: use existing faction-specific voice atlas clips.
   role=role===9?2:0;
  }
  if(activeVoices.size>=4||!context)return;
  const variant = skin === 'moe' ? 'moe' : 'default';
  const name = variant+'/'+faction+'-'+role+'-'+event;
  const delay = event==='attack' ? 850 : event==='hit' ? 1050 : 950;
  if (!canPlay('voice:'+name, delay)) return;
  const token = generation, requestedAt = performance.now();
  loadIndex().then(clips => {
   const clip = clips[name] || clips['default/'+faction+'-'+role+'-'+event];
   if (!clip || !context || token!==generation) return null;
   return atlas(clip.atlas).then(buffer => ({buffer,clip}));
  }).then(result => {
   if (!result || !result.buffer || !context || token!==generation ||
       performance.now()-requestedAt>1400 || !inBattle() || activeVoices.size>=4) return;
   const clip = result.clip, buffer = result.buffer;
   const offset = Number(clip.start), length = Number(clip.duration);
   if (!Number.isFinite(offset) || !Number.isFinite(length) || offset<0 ||
       length<=0 || offset+length>buffer.duration+.05) return;
   const source = context.createBufferSource(), gain = context.createGain();
   source.buffer = buffer;
   gain.gain.value = Math.min(1, levels.voice*distanceGain(x));
   source.connect(gain); gain.connect(context.destination);source.gainNode=gain;
   activeVoices.add(source);
   source.onended = () => {
    activeVoices.delete(source);
    try { source.disconnect(); gain.disconnect(); } catch (_) {}
   };
   source.start(0, offset, length);
  }).catch(() => {});
 }
 function attack(faction,role,skin,x) {
  cue(WEAPONS[role] || 'hit', x);
  unit(faction,role,skin,'attack',x);
 }
 function stop() {
  if(specialSpeaking){try{global.speechSynthesis?.cancel?.();}catch(_){}specialSpeaking=false;}
  generation++;
  for (const source of activeVoices) { try { source.stop(); } catch (_) {} }
  activeVoices.clear();
  for (const audio of activeEffects) {
   try { audio.pause(); audio.currentTime = 0; } catch (_) {}
  }
  activeEffects.clear();
 }
 function setVolume(group,value){
  if(!Object.prototype.hasOwnProperty.call(levels,group))return;
  levels[group]=Math.min(1,Math.max(0,Number(value)/100||0));
  try{global.localStorage.setItem('desert-front-volume-'+group,String(Math.round(levels[group]*100)));}catch(_){}
  if(group==='effects')for(const audio of activeEffects)audio.volume=Math.min(audio.volume,levels.effects);
  else for(const source of activeVoices)if(source.gainNode)source.gainNode.gain.value=levels.voice;
 }
 function volume(group){return Math.round((levels[group]||0)*100);}
 function setEnabled(value) {
  enabled = Boolean(value);
  try { global.localStorage.setItem(ENABLED_KEY, String(enabled)); } catch (_) {}
  if (!enabled) stop(); else unlock();
  renderToggle();
 }
 function init() {
  const button = toggle();
  if (button) button.addEventListener('click', () => setEnabled(!enabled));
  document.addEventListener('pointerdown', unlock, {passive:true});
  document.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => {
   if (document.hidden) stop();
   else unlock();
  });
  global.addEventListener('pagehide', stop);
  renderToggle();
 }
 global.DesertCombatAudio = Object.freeze({cue,unit,attack,stop,setEnabled,setVolume,volume,isEnabled:()=>enabled,loadIndex});
 if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
 else init();
})(window);
