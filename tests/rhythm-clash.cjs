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
assert.equal(doll.frameAt('idle',0,4.2).head,0);
assert.equal(studio.legal({id:'ruby',art:'doll',palette:'rose',motion:.4}).art,'doll');
assert.equal(studio.legal({id:'ruby',art:'doll',palette:'bad',motion:99}).palette,'original');
assert.equal(studio.legal({id:'ruby',motion:99}).motion,1);
console.log('Painted wardrobe profile/motion bounds and action/expression timeline PASS');

// Secondary physics is deterministic, bounded and independent of hair sway.
const cp={costume:'street',bust:'full',motion:0,bustMotion:1};
assert.equal(studio.legal({id:'ruby',bustMotion:99}).bustMotion,1);
assert.equal(studio.legal({id:'ruby',bustMotion:-2}).bustMotion,0);
assert.equal(studio.legal({id:'ruby'}).bustMotion,.7);
for(const action of ['idle','attack','hit'])for(let age=0;age<3;age+=.017){
 const o={action,actionTime:age,t:0},m=doll.chestMotion(cp,o);
 assert.ok(Number.isFinite(m.y)&&Math.abs(m.y)<=7&&Math.abs(m.x)<=1.5);
 assert.deepEqual(m,doll.chestMotion(cp,o));
 assert.ok(Object.values(doll.chestMotion(cp,{...o,reduced:true})).every(v=>v===0));
 assert.ok(Object.values(doll.chestMotion({...cp,bustMotion:0},o)).every(v=>v===0));
}
const response=(p,age)=>Math.abs(doll.chestMotion(p,{action:'hit',actionTime:age,t:0}).y-doll.chestMotion(p,{t:0}).y);
assert.ok(response(cp,.1)>response(cp,2));
assert.ok(response(cp,.1)>response({...cp,costume:'armor'},.1));
assert.ok(response(cp,0)<response(cp,.1));
assert.ok(Number.isFinite(doll.chestMotion(cp,{t:NaN,actionTime:NaN}).y));
console.log('Localized chest spring: strength, support, delay, decay, bounds, pause determinism and reduced motion PASS');

const {NeonFeedback:feedbackModule}=load('feedback.js');
const audioEvents=[],destination={};
const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
const fakeAudio={state:'running',currentTime:3,destination,createGain(){return {gain:param,connect(to){if(to===destination)audioEvents.push('destination')},disconnect(){}}},createOscillator(){return {frequency:param,connect(){},start(at){audioEvents.push(at)},stop(){},addEventListener(){}}}};
assert.equal(feedbackModule.keySound(fakeAudio,0,0).length,0);
assert.equal(feedbackModule.keySound({...fakeAudio,state:'suspended'},0,1).length,0);
assert.equal(feedbackModule.keySound(fakeAudio,3,.7).length,2);
assert.deepEqual(audioEvents,['destination',3,3]);
console.log('Input beats: independent destination, two bounded voices, mute and suspended context PASS');

const {NeonFinisher:finisher}=load('finisher.js');
assert.equal(finisher.DURATION,20);
for(const weapon of ['blade','claw','spell'])for(let t=0;t<=20;t+=.05){
 const a=finisher.sample(t,weapon,'player'),b=finisher.sample(t,weapon,'bot');
 for(const actor of [a.hero,a.foe,b.hero,b.foe])for(const key of ['x','y','rotation','scale','actionTime'])assert.ok(Number.isFinite(actor[key]));
 assert.ok(Math.abs(a.hero.x+b.hero.x-1200)<.001);assert.ok(Math.abs(a.foe.x+b.foe.x-1200)<.001);
 assert.ok(a.hero.scale>0&&a.foe.scale>0);
}
assert.equal(finisher.sample(19.999).done,false);assert.equal(finisher.sample(20).done,true);
assert.ok(finisher.sample(16,'blade','player').foe.x>2000);
assert.ok(finisher.sample(16,'claw','bot').foe.x< -800);
assert.equal(finisher.sample(10).phase,'최후의 일격');assert.equal(finisher.sample(18).phase,'완전 승리');
assert.notEqual(finisher.sample(7,'spell').hero.y,finisher.sample(7,'claw').hero.y);
assert.equal(finisher.sample(NaN).t,0);assert.equal(finisher.sample(-10).t,0);
console.log('20s victory choreography: phases, finite poses, mirrored winners, full ring-out and exact duration PASS');

// Direction randomization preserves the exact rhythm/holds and remains reproducible.
const variedNotes=Array.from({length:160},(_,i)=>({id:i,t:2.5+i*.25,duration:i%17===0?.65:0,phrase:Math.floor(i/16),side:i%32<16?'player':'bot',lane:i%4}));
const copy=x=>JSON.parse(JSON.stringify(x));
const remixed=chart.remix(copy(variedNotes),82),again=chart.remix(copy(variedNotes),82),other=chart.remix(copy(variedNotes),83);
assert.equal(JSON.stringify(remixed),JSON.stringify(again));assert.notEqual(JSON.stringify(remixed.map(n=>n.lane)),JSON.stringify(other.map(n=>n.lane)));
assert.deepEqual(remixed.map(n=>[n.t,n.duration,n.phrase]),variedNotes.map(n=>[n.t,n.duration,n.phrase]));
const blocked=[-1,-1,-1,-1];for(const n of remixed){assert.ok(n.t>=blocked[n.lane]-.001);blocked[n.lane]=n.t+n.duration}
const quiet=chart.makeChart({bpm:120,duration:24,beats:[]},{seed:1});assert.ok(quiet.entries.length>10);assert.equal(new Set(quiet.entries.map(n=>n[1])).size,4);chart.unpack(quiet);for(let i=3;i<quiet.entries.length;i++){const h=quiet.entries.slice(i-3,i+1).map(n=>n[1]),d=(h[1]-h[0]+4)%4;assert.ok(!((d===1||d===3)&&(h[2]-h[1]+4)%4===d&&(h[3]-h[2]+4)%4===d))}
const sparse=chart.makeChart({bpm:120,duration:12,beats:[[3,.8],[5,.7],[7,.5]]},{seed:8});assert.equal(sparse.entries.length,3);assert.equal(JSON.stringify(sparse.entries.map(n=>n[0])),'[3,5,7]');
const powerContext={window:{RhythmChart:chart},console};vm.runInNewContext(fs.readFileSync(path.join(dir,'power-notes.js'),'utf8'),powerContext);
const powered=powerContext.window.NeonPowerNotes.apply(copy(remixed),82,43),power=powered.filter(n=>n.kind==='power');assert.ok(power.length>0&&power.length<variedNotes.length/5);
for(const n of power){assert.equal(n.lane,4);assert.equal(n.duration,0);assert.ok(n.t>=5);assert.equal(n.t,variedNotes[n.id].t)}
const charge=b.make(powered),target=power[0];assert.equal(b.register(charge,target.side,target.id,'perfect'),true);assert.equal(charge.super[target.side],24);assert.equal(b.register(charge,target.side,target.id,'perfect'),false);assert.equal(charge.super[target.side],24);
const missed=b.make(powered);b.register(missed,target.side,target.id,'miss');assert.equal(missed.super[target.side],0);
for(let t=0;t<12;t+=.01){const idle=doll.frameAt('idle',0,t);assert.equal(idle.a,0);assert.equal(idle.b,0);assert.equal(idle.head,0)}
console.log('Random lanes preserve rhythm/holds, seeded reproducibility, sparse onset safety, power timing/charge once, stable idle pose PASS');

const {NeonLiveRig:liveRig}=load('live-rig.js');
const liveP={costume:'street',bust:'full',bustMotion:1,motion:1};
const rest0=liveRig.pose(liveP,{t:0}),rest1=liveRig.pose(liveP,{t:.5});
assert.ok(Math.abs(rest0.left-rest1.left)>3);assert.ok(Math.abs(rest0.sway-rest1.sway)>1);assert.ok(Math.abs(rest0.left-rest0.right)>.1);
assert.ok(Object.values(liveRig.pose(liveP,{t:3,reduced:true})).every(v=>v===0));
for(const [k,v]of Object.entries({bustSize:.76,waist:.86,hips:1.12,height:1.04,headScale:.94}))assert.equal(studio.legal({id:'ruby',[k]:v})[k],v);
assert.equal(studio.legal({id:'ruby',waist:100}).waist,1.15);assert.equal(studio.legal({id:'ruby',accessory:'star'}).accessory,'star');
console.log('Visible independent rig parameters, reduced motion, shape/accessory profile persistence bounds PASS');

assert.equal(studio.legal({id:'ruby',palette:'custom',outfit:'#f02e55'}).palette,'custom');
