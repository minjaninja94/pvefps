// node tests/rhythm-clash.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.resolve(__dirname,'../rhythm');
function load(file){
 const context={window:{},console};
 vm.runInNewContext(fs.readFileSync(path.join(dir,file),'utf8'),context,{filename:file});
 return context.window;
}
const {RhythmClash:b}=load('battle-system.js');
const {NeonFighters:f}=load('fighters.js');
assert.equal(f.PROFILES.length,4);
assert.ok(f.PROFILES.every(p=>p.species&&p.outfit&&p.skin&&p.eye));
const drawContext=new Proxy({}, {get(obj,key){return key in obj?obj[key]:()=>{}},set(obj,key,val){obj[key]=val;return true}});
for(const preset of f.PROFILES){
 for(const costume of ['armor','idol','street','mage','cyber']){
  for(const build of ['slender','balanced','curvy','athletic','petite','giant']){
   const profile={...preset,costume,body:build,species:'cat',eyeShape:'soft',bust:'large'};
   assert.doesNotThrow(()=>f.draw(drawContext,120,270,profile,{facing:1,t:1.2,attack:.4,hit:.2,scale:.75}));
  }
 }
}

const notes=[];for(let phrase=0;phrase<4;phrase++)for(let lane=0;lane<6;lane++)notes.push({id:notes.length,phrase,side:phrase%2?'player':'bot',t:phrase*2+lane*.2,lane:lane%4});
const state=b.make(notes);
for(const n of notes)assert.equal(b.register(state,n.side,n.id,n.side==='player'?'perfect':'miss'),true);
assert.equal(b.register(state,'bot',1,'perfect'),false);
const first=b.resolve(state,0);
assert.equal(first.winner,'player');
assert.equal(first.player.score,1000);
assert.equal(first.bot.score,0);
assert.equal(first.damage,16);
assert.equal(first.hp.bot,84);
assert.equal(b.resolve(state,0),null);
const second=b.resolve(state,1);
assert.equal(second.round,1);
assert.equal(state.nextRound,2);
const mirror=b.make(notes.map(n=>({...n,side:n.side==='bot'?'player':'bot'})));
const guest=b.applyRemote(mirror,first);
assert.equal(guest.winner,'bot');
assert.equal(guest.hp.player,first.hp.bot);
assert.equal(guest.hp.bot,first.hp.player);
assert.equal(b.applyRemote(mirror,first),null);
const even=b.make(notes);for(const n of notes)b.register(even,n.side,n.id,'perfect');
const draw=b.resolve(even,0);
assert.equal(draw.winner,'draw');
assert.equal(draw.damage,0);
assert.equal(draw.hp.player,100);
assert.equal(draw.hp.bot,100);
console.log('Rhythm Clash: 4 fighter presets, 120 costume/body render variants, round scoring, HP damage, duplicate prevention, mirror sync, and draws PASS');

// Incomplete final phrases cannot create a free strike against a missing side.
const partial=b.make([{id:0,side:'player',phrase:0}]);b.register(partial,'player',0,'perfect');assert.equal(b.resolve(partial,0).winner,'draw');
assert.equal(b.applyRemote(b.make(notes),{round:0,winner:'player',hp:{player:'bad'}}),null);
const {RhythmChart:chart}=load('chart-analysis.js');
const valid={bpm:120,duration:12,groups:3,offset:0,entries:[[3,0,1,0],[5,1,0,0],[11,2,0,2]]};
assert.equal(chart.unpack(valid).length,3);
for(const bad of [
 {...valid,groups:0},{...valid,bpm:NaN},{...valid,duration:-2},
 {...valid,entries:[[3,0,-1,0]]},{...valid,entries:[[3,0,20,0]]},
 {...valid,entries:[[4,0,0,0],[3,1,0,0]]},
 {...valid,entries:[[3,0,2,0],[4,0,0,0]]},
 {...valid,entries:[[3,0,0,9]]}
])assert.throws(()=>chart.unpack(bad));
console.log('Final-phrase fairness, malformed packets, chart clock/hold/group validation PASS');

// Local/peer profiles must survive corrupted storage and reject executable URLs.
const memory=new Map(),context={window:{NeonFighters:f},console,crypto:require('node:crypto').webcrypto,localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}};
vm.createContext(context);for(const file of ['studio.js','profile-store.js','combat-fx.js'])vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),context);
const studio=context.window.NeonStudio,store=context.window.NeonProfileStore;
assert.equal(studio.legal({id:'unknown'}),null);
assert.equal(studio.legal({id:'ruby',name:'<img>\x00',art:'custom',image:'javascript:alert(1)'}).art,'vector');
assert.equal(studio.legal({id:'ruby',skin:'url(x)'}).skin,f.PROFILES[1].skin);
assert.equal(studio.legal({id:'ruby',name:'x'.repeat(200)}).name.length,24);
studio.save({id:'ruby',name:'keep',art:'ruby'});assert.equal(studio.list().length,1);
assert.throws(()=>studio.importWardrobe({format:'neon-clash-wardrobe',fighters:[{id:'oops'}]}));assert.equal(studio.list()[0].profile.name,'keep');
for(let i=0;i<30;i++)studio.save({id:'jade',name:'slot'+i});assert.equal(studio.list().length,24);
assert.equal(store.prefs({offset:999,music:-2,diff:'bad'}).offset,250);assert.equal(store.prefs({music:-2}).music,0);assert.equal(store.prefs({diff:'bad'}).diff,'normal');
memory.set('neon-clash-settings-v1','broken');assert.equal(store.load().speed,1.25);
for(let i=0;i<105;i++)store.result({title:'song',key:'song',score:i,accuracy:96,combo:2,outcome:'win'});assert.equal(store.history().length,100);
for(const t of [0,.1,.3,.5,1,2])assert.ok(Number.isFinite(context.window.NeonCombatFX.motion(t).reach));
console.log('Profile validation, corrupted storage, bounded wardrobe/history, invalid import atomicity and combat timeline PASS');

const {NeonDoll:doll}=load('doll-renderer.js');
assert.equal(doll.frameAt('attack',.25,0).head,2);
assert.equal(doll.frameAt('hit',.2,0).head,3);
assert.equal(doll.frameAt('attack',2,0).state,'idle');
assert.equal(doll.frameAt('idle',0,4.2).head,1);
assert.equal(studio.legal({id:'ruby',art:'doll',palette:'rose',motion:.4}).art,'doll');
assert.equal(studio.legal({id:'ruby',art:'doll',palette:'bad',motion:99}).palette,'original');
assert.equal(studio.legal({id:'ruby',motion:99}).motion,1);
console.log('Painted wardrobe profile/motion bounds and action/expression timeline PASS');
