/* Desert Front lobby-only background music. Browser autoplay is resumed by the first user gesture. */
(function (global) {
 'use strict';
 const KEY = 'desert-front-lobby-music-enabled';
 const MUSIC_URL = './assets/audio/lobby-theme.mp3';
 let player = null;
 let inLobby = false;
 let enabled = true;
 try { enabled = global.localStorage.getItem(KEY) !== 'false'; } catch (_) {}

 function toggleButton() { return document.getElementById('lobbyMusicToggle'); }
 function renderButton() {
  const button = toggleButton();
  if (!button) return;
  button.textContent = enabled ? '♫ BGM 끄기' : '♫ BGM 켜기';
  button.setAttribute('aria-pressed', String(enabled));
  button.title = '로비 배경음악 켜기 / 끄기';
 }
 function getPlayer() {
  if (!player) {
   player = new Audio(MUSIC_URL);
   player.loop = true;
   player.preload = 'auto';
   player.volume = 0.3;
  }
  return player;
 }
 function pause() {
  if (player && !player.paused) player.pause();
 }
 function tryPlay() {
  if (!inLobby || !enabled || document.hidden) return;
  const audio = getPlayer();
  if (!audio.paused) return;
  try {
   const pending = audio.play();
   if (pending && typeof pending.catch === 'function') pending.catch(() => {
    // Autoplay is normally blocked until a pointer or keyboard interaction.
   });
  } catch (_) {}
 }
 function enterLobby() {
  inLobby = true;
  tryPlay();
 }
 function exitLobby() {
  inLobby = false;
  pause();
 }
 function setEnabled(value) {
  enabled = Boolean(value);
  try { global.localStorage.setItem(KEY, String(enabled)); } catch (_) {}
  renderButton();
  if (enabled) tryPlay();
  else pause();
 }
 function init() {
  const button = toggleButton();
  if (button) button.addEventListener('click', () => setEnabled(!enabled));
  // Mobile and desktop browsers require a gesture before starting audio.
  document.addEventListener('pointerdown', tryPlay, {passive:true});
  document.addEventListener('keydown', tryPlay);
  document.addEventListener('visibilitychange', () => {
   if (document.hidden) pause();
   else tryPlay();
  });
  global.addEventListener('pagehide', pause);
  renderButton();
  if (document.body.classList.contains('lobby-active')) enterLobby();
 }
 global.DesertLobbyMusic = Object.freeze({enterLobby, exitLobby, setEnabled});
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
 else init();
})(window);
