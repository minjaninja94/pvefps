/* Desert Front soundtrack: lobby and battle tracks share one persistent BGM setting. */
(function (global) {
 'use strict';
 const KEY = 'desert-front-lobby-music-enabled';
 const SOURCES = {
  lobby: './assets/audio/lobby-theme.mp3',
  battle: './assets/audio/battle-theme.mp3'
 };
 const VOLUMES = {lobby: 0.3, battle: 0.35};
 const VOLUME_KEY='desert-front-volume-music';
 try{const n=global.localStorage.getItem(VOLUME_KEY);if(n!==null&&n!==''&&Number.isFinite(Number(n))){VOLUMES.lobby=VOLUMES.battle=Math.min(1,Math.max(0,Number(n)/100));}}catch(_){}
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
   audio.volume = VOLUMES[kind];
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
  if (next === 'battle') {
   const audio = getPlayer('battle');
   try { audio.currentTime = 0; } catch (_) {}
  }
  tryPlay();
 }
 function enterLobby() { setScene('lobby'); }
 function exitLobby() { setScene('battle'); }
 function stopBattle() { if (scene === 'battle') setScene('none'); }
 function setEnabled(value) {
  enabled = Boolean(value);
  try { global.localStorage.setItem(KEY, String(enabled)); } catch (_) {}
  renderButton();
  if (enabled) tryPlay();
  else pauseAll();
 }
 function setVolume(value) {
  const next=Math.min(1,Math.max(0,Number(value)/100||0));VOLUMES.lobby=VOLUMES.battle=next;
  try{global.localStorage.setItem(VOLUME_KEY,String(Math.round(next*100)));}catch(_){}
  for(const kind of Object.keys(players))players[kind].volume=next;
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
 global.DesertLobbyMusic = Object.freeze({enterLobby, exitLobby, stopBattle, setEnabled,setVolume,volume,isEnabled:()=>enabled});
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
 else init();
})(window);
