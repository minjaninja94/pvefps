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
 assert.equal(items.length,3);
 assert.ok(items[2].src.endsWith('horizon-of-the-titan.mp3'));assert.equal(items[2].paused,true,'next battle track preloads without overlapping playback');
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

test('in-game gear changes persistent music, voice and effects volumes and syncs lobby sliders',()=>{
 const ids=new Map(),handlers={};
 function el(id){
  if(!ids.has(id))ids.set(id,{
   id,value:'',textContent:'',hidden:id==='battleAudioSettingsPanel',listeners:{},attrs:{},
   addEventListener(type,fn){this.listeners[type]=fn;},
   setAttribute(name,value){this.attrs[name]=value;},
   contains(target){return target===this;},focus(){this.focused=true;}
  });
  return ids.get(id);
 }
 const state={music:30,voice:50,effects:32,musicOn:true,effectsOn:true};
 const window={
  DesertLobbyMusic:{
   volume:()=>state.music,setVolume:v=>{state.music=Number(v);},
   isEnabled:()=>state.musicOn,setEnabled:v=>{state.musicOn=!!v;}
  },
  DesertCombatAudio:{
   volume:key=>state[key],setVolume:(key,v)=>{state[key]=Number(v);},
   isEnabled:()=>state.effectsOn,setEnabled:v=>{state.effectsOn=!!v;}
  }
 };
 const document={readyState:'complete',getElementById:el,addEventListener:(k,fn)=>{handlers[k]=fn;}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'audio-settings.js'),'utf8'),{window,document});
 assert.equal(el('battleMusicVolume').value,'30');
 assert.equal(el('battleVoiceVolume').value,'50');
 assert.equal(el('battleEffectsVolume').value,'32');
 el('battleAudioSettingsButton').listeners.click();
 assert.equal(el('battleAudioSettingsPanel').hidden,false);
 assert.equal(el('battleAudioSettingsButton').attrs['aria-expanded'],'true');
 el('battleMusicVolume').value='15';el('battleMusicVolume').listeners.input();
 assert.equal(state.music,15);
 assert.equal(el('audioMusicVolume').value,'15','lobby slider follows live battle music volume');
 el('audioVoiceVolume').value='41';el('audioVoiceVolume').listeners.input();
 assert.equal(el('battleVoiceVolume').value,'41','battle slider follows lobby voice volume');
 el('battleEffectsVolume').value='5';el('battleEffectsVolume').listeners.input();
 assert.equal(state.effects,5);
 assert.equal(el('audioEffectsValue').textContent,'5%');
 el('battleMusicToggle').listeners.click();
 el('battleEffectsToggle').listeners.click();
 assert.equal(state.musicOn,false);assert.equal(state.effectsOn,false);
 assert.equal(el('battleMusicToggle').attrs['aria-pressed'],'false');
 assert.equal(el('battleEffectsToggle').attrs['aria-pressed'],'false');
 handlers.keydown({key:'Escape'});
 assert.equal(el('battleAudioSettingsPanel').hidden,true);
 assert.equal(el('battleAudioSettingsButton').attrs['aria-expanded'],'false');
 const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
 assert.ok(html.indexOf('id="backToLobby"')>=0&&
  html.indexOf('id="battleAudioSettingsButton"')>html.indexOf('id="backToLobby"'),
  'gear control must appear after the lobby button in the battle HUD');
 for(const id of ['battleAudioSettingsPanel','battleMusicVolume','battleVoiceVolume','battleEffectsVolume'])
  assert.ok(html.includes('id="'+id+'"'),id);
});
