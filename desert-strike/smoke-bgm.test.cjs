/* Check Desert Front BGM transitions without requiring a browser or an actual MP3 file. */
const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

test('lobby and battle music are exclusive, loop, and obey the persistent switch', () => {
 const items = [], handlers = {};
 const prefs = new Map();
 class FakeAudio {
  constructor(src) { this.src = src; this.paused = true; this.currentTime = 0; this.playCount = 0; items.push(this); }
  play() { this.paused = false; this.playCount++; return Promise.resolve(); }
  pause() { this.paused = true; }
 }
 const button = {
  attributes:{}, listeners:{},
  addEventListener(key,fn){this.listeners[key]=fn;},
  setAttribute(key,v){this.attributes[key]=v;}
 };
 const document = {
  hidden: false, readyState: 'complete',
  body:{classList:{contains:(key)=>key==='lobby-active'}},
  getElementById: (key)=>key==='lobbyMusicToggle'?button:null,
  addEventListener: (key,fn)=>{handlers[key]=fn;}
 };
 const window = {
  localStorage: {getItem:(key)=>prefs.get(key),setItem:(key,v)=>prefs.set(key,v)},
  addEventListener: (key,fn)=>{handlers[key]=fn;}
 };
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'lobby-music.js'),'utf8'),{window,document,Audio:FakeAudio});
 const manager = window.DesertLobbyMusic;
 assert.equal(items.length,1);
 const lobby = items[0];
 assert.equal(lobby.src,'./assets/audio/lobby-theme.mp3');
 assert.equal(lobby.loop,true);
 assert.equal(lobby.paused,false);
 manager.exitLobby();
 assert.equal(items.length,2);
 const battle = items[1];
 assert.equal(battle.src,'./assets/audio/battle-theme.mp3');
 assert.equal(battle.loop,true);
 assert.equal(lobby.paused,true);
 assert.equal(battle.paused,false);
 assert.equal(battle.currentTime,0);
 battle.currentTime=28;
 manager.exitLobby();
 assert.equal(battle.currentTime,28,'repeated battle entry must not restart a running battle');
 document.hidden=true;
 handlers.visibilitychange();
 assert.equal(battle.paused,true);
 document.hidden=false;
 handlers.visibilitychange();
 assert.equal(battle.paused,false);
 manager.stopBattle();
 assert.equal(battle.paused,true);
 manager.enterLobby();
 assert.equal(lobby.paused,false);
 button.listeners.click();
 assert.equal(lobby.paused,true);
 assert.equal(prefs.get('desert-front-lobby-music-enabled'),'false');
 manager.exitLobby();
 assert.equal(battle.paused,true);
 button.listeners.click();
 assert.equal(battle.paused,false);
 assert.equal(prefs.get('desert-front-lobby-music-enabled'),'true');
 manager.enterLobby();
 assert.equal(battle.paused,true);
 assert.equal(lobby.paused,false);
});
