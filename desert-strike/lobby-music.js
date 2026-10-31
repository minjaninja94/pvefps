/* Desert Front soundtrack: lobby and battle tracks share one persistent BGM setting. */
(function (global) {
 'use strict';
 const KEY = 'desert-front-lobby-music-enabled';
 const SOURCES = {
  lobby: './assets/audio/lobby-theme.mp3',
  battle: './assets/audio/battle-theme.mp3',
  horizon: './assets/audio/horizon-of-the-titan.mp3',
  iron: './assets/audio/iron-vanguard.mp3'
 };
 const VOLUMES = {lobby: 0.3, battle: 0.3, horizon: 0.3, iron: 0.3};
 // New masters are approximately -14.4 LUFS; match the older battle master at playback.
 const GAINS={lobby:1,battle:.711,horizon:1,iron:1};
 const BATTLE=['battle','horizon','iron'];let battleStage=0;
 const VOLUME_KEY='desert-front-volume-music';
 try{const n=global.localStorage.getItem(VOLUME_KEY);if(n!==null&&n!==''&&Number.isFinite(Number(n))){for(const kind of Object.keys(VOLUMES))VOLUMES[kind]=Math.min(1,Math.max(0,Number(n)/100));}}catch(_){}
 const players = Object.create(null);
 let scene = 'none';
 let enabled = true;
 try { enabled = global.localStorage.getItem(KEY) !== 'false'; } catch (_) {}

 function toggleButton() { return document.getElementById('lobbyMusicToggle'); }
 function renderButton() {
  const button = toggleButton();
  if (!button) return;
  button.textContent = enabled ? '♫ BGM 끄기' : '♫ BGM 켜기';
  button.setAttribute('aria-pressed', String(enabled));
  button.title = '로비 및 전투 배경음악 켜기 / 끄기';
 }
 function getPlayer(kind) {
  if (!players[kind]) {
   const audio = new Audio(SOURCES[kind]);
   audio.loop = true;
   audio.preload = 'auto';
   audio.volume = VOLUMES[kind]*GAINS[kind];
   players[kind] = audio;
  }
  return players[kind];
 }
 function pauseAll() {
  for (const audio of Object.values(players)) if (!audio.paused) audio.pause();
 }
 function tryPlay() {
  if (!enabled || scene === 'none' || document.hidden) return;
  const audio = getPlayer(scene);
  if (!audio.paused) return;
  try {
   const pending = audio.play();
   if (pending && typeof pending.catch === 'function') pending.catch(() => {
    // Browsers can require a pointer or keyboard gesture to enable audio.
   });
  } catch (_) {}
 }
 function setScene(next) {
  if (scene === next) { tryPlay(); return; }
  pauseAll();
  scene = next;
  if (BATTLE.includes(next)) {
   const audio = getPlayer(next);
   try { audio.currentTime = 0; } catch (_) {}
  }
  tryPlay();
 }
 function enterLobby() { battleStage=0;setScene('lobby'); }
 function exitLobby() { if(!BATTLE.includes(scene)){battleStage=0;setScene('battle');}else tryPlay();if(enabled)getPlayer('horizon'); }
 function resetBattle(){battleStage=0;if(BATTLE.includes(scene))setScene('battle');}
 function setBattleStage(value){
  if(!BATTLE.includes(scene))return;
  const next=Number(value);if(!Number.isInteger(next)||next<0||next>2||next<=battleStage)return;
  battleStage=next;setScene(BATTLE[next]);if(next===1&&enabled)getPlayer('iron');
 }
 function stopBattle() { if (BATTLE.includes(scene)) setScene('none'); }
 function setEnabled(value) {
  enabled = Boolean(value);
  try { global.localStorage.setItem(KEY, String(enabled)); } catch (_) {}
  renderButton();
  if (enabled) tryPlay();
  else pauseAll();
 }
 function setVolume(value) {
  const next=Math.min(1,Math.max(0,Number(value)/100||0));for(const kind of Object.keys(VOLUMES))VOLUMES[kind]=next;
  try{global.localStorage.setItem(VOLUME_KEY,String(Math.round(next*100)));}catch(_){}
  for(const kind of Object.keys(players))players[kind].volume=next*GAINS[kind];
 }
 function volume(){return Math.round(VOLUMES.lobby*100);}
 function init() {
  const button = toggleButton();
  if (button) button.addEventListener('click', () => setEnabled(!enabled));
  document.addEventListener('pointerdown', tryPlay, {passive:true});
  document.addEventListener('keydown', tryPlay);
  document.addEventListener('visibilitychange', () => {
   if (document.hidden) pauseAll();
   else tryPlay();
  });
  global.addEventListener('pagehide', pauseAll);
  renderButton();
  if (document.body.classList.contains('lobby-active')) enterLobby();
 }
 global.DesertLobbyMusic = Object.freeze({enterLobby, exitLobby, stopBattle, resetBattle, setBattleStage, setEnabled,setVolume,volume,isEnabled:()=>enabled});
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
 else init();
})(window);
