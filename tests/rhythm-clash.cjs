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
