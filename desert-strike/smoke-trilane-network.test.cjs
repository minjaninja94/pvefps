'use strict';
// Offline integration replay of the actual Firestore/WebRTC room transport.
// Simulates two independent clients using the same signaling store and RTC links.
const assert=require('node:assert/strict');
const fsNode=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const networkSource=fsNode.readFileSync(path.join(__dirname,'tri-lane-network.js'),'utf8');
const engineSource=fsNode.readFileSync(path.join(__dirname,'tri-lane-engine.js'),'utf8');
const records=new Map(),listeners=new Map();
const clone=o=>o===undefined?undefined:JSON.parse(JSON.stringify(o));
function key(ref){return ref.path;}
function docSnap(data){return {exists:()=>data!==undefined,data:()=>clone(data)};}
function notify(k){
 const subs=listeners.get(k)||[];
 for(const cb of [...subs])queueMicrotask(()=>cb(docSnap(records.get(k))));
}
const firestore={
 doc(db,...parts){return {path:parts.join('/')};},
 async setDoc(ref,value){if(ref.path.startsWith('desertRooms/')&&!ref.path.includes('/signals/'))for(const p of Object.values(value.players||{}))assert.ok(['default','moe','twilight','aurora','gold'].includes(p.skin),'legacy deployed rules still accept room cosmetics');records.set(key(ref),clone(value));notify(key(ref));},
 async updateDoc(ref,p){const old=records.get(key(ref));if(!old)throw Error('document missing');
  records.set(key(ref),{...clone(old),...clone(p)});notify(key(ref));},
 async deleteDoc(ref){records.delete(key(ref));notify(key(ref));},
 onSnapshot(ref,callback){
  const k=key(ref);if(!listeners.has(k))listeners.set(k,[]);listeners.get(k).push(callback);
  queueMicrotask(()=>callback(docSnap(records.get(k))));
  return ()=>listeners.set(k,(listeners.get(k)||[]).filter(fn=>fn!==callback));
 },
 async runTransaction(db,fn){
  const actions=[],tx={
   async get(ref){return docSnap(records.get(key(ref)));},
   set(ref,value){actions.push(['set',ref,value]);},
   update(ref,value){actions.push(['update',ref,value]);}
  };
  const result=await fn(tx);
  for(const [kind,ref,value] of actions)await (kind==='set'?firestore.setDoc:firestore.updateDoc)(ref,value);
  return result;
 }
};
let nextOffer=1,droppedAppearance=false;const offered=new Map();
class Channel {
 constructor(){this.readyState='connecting';this.onopen=null;this.onmessage=null;this.onclose=null;this.peer=null;}
 connect(other){this.peer=other;other.peer=this;this.readyState='open';other.readyState='open';
  queueMicrotask(()=>{this.onopen?.();other.onopen?.();});}
 send(data){if(this.readyState!=='open'||!this.peer)throw Error('channel closed');
  const packet=JSON.parse(data);if(packet.type==='appearance'&&packet.skin==='blood-iron~aurora'&&!droppedAppearance){droppedAppearance=true;return;}
  queueMicrotask(()=>this.peer.onmessage?.({data}));}
 close(){this.readyState='closed';this.onclose?.();}
}
class FakePeer {
 constructor(){this.iceGatheringState='complete';this.connectionState='connected';this.localDescription=null;this.currentRemoteDescription=null;this.ondatachannel=null;}
 createDataChannel(){const ch=new Channel();this.channel=ch;this.offerId=nextOffer++;offered.set(this.offerId,ch);return ch;}
 async createOffer(){return {type:'offer',sdp:'TEST-SDP-OFFER-'+this.offerId};}
 async createAnswer(){return {type:'answer',sdp:'TEST-SDP-ANSWER'};}
 async setLocalDescription(sdp){this.localDescription=sdp;}
 async setRemoteDescription(sdp){
  this.currentRemoteDescription=sdp;
  if(sdp.type==='offer'){
   const id=Number(sdp.sdp.split('-').pop()),hostChannel=offered.get(id);
   if(!hostChannel)throw Error('Invalid or missing offer '+id);
   const remote=new Channel();
   this.ondatachannel?.({channel:remote});
   hostChannel.connect(remote);
  }
 }
 addEventListener(){}removeEventListener(){}close(){}
}
function buildClient(uid){
 const w={addEventListener(){},DesertGuardian:require('./defense-guardian.js'),DesertConsolidation:require('./unit-consolidation.js')},env={
  window:w,crypto:webcrypto,RTCPeerConnection:FakePeer,
  fetch:async()=>({ok:true,json:async()=>JSON.parse(fsNode.readFileSync(path.join(__dirname,'assets/augments.json'),'utf8'))}),
  setInterval,clearInterval,setTimeout,clearTimeout,performance,Date,Math,Number,String,Object,Array,Map,Set,console
 };
 w.IronFirebase={async identity(){return {db:{},fs:firestore,uid};},message:e=>e?.message||String(e)};
 for(const file of ['skin-catalog.js','skin-shop.js','prism-experiments.js','augment-rules.js'])vm.runInNewContext(fsNode.readFileSync(path.join(__dirname,file),'utf8'),env,{filename:file});
 vm.runInNewContext(engineSource,env,{filename:'tri-lane-engine.js'});
 vm.runInNewContext(networkSource,env,{filename:'tri-lane-network.js'});
 let match=null;const baseEngine=w.DesertTriEngine;w.DesertTriEngine={...baseEngine,create(opts){match=baseEngine.create(opts);return match;}};
 const events={room:[],status:[],snap:[],peers:[]};
 w.DesertTriNetwork.configure({room:x=>events.room.push(x),status:x=>events.status.push(x),snapshot:x=>events.snap.push(x),peers:x=>events.peers.push(x)});
 return {network:w.DesertTriNetwork,augments:w.DesertAugments,events,get match(){return match;}};

}
async function until(fn,ms=1800){
 const end=Date.now()+ms;
 while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,20));}
 throw Error('Timed out waiting for multi handshake');
}
async function main(){
 const host=buildClient('hostUser'),guest=buildClient('guestUser');
 const room=await host.network.create({mode:'pvp',size:1,name:'방장',faction:0,skin:'blood-iron~gold'});
 assert.match(room,/^[A-HJ-NP-Z2-9]{6}$/);
 assert.ok(records.has('desertRooms/'+room));
 const joined=await guest.network.join({code:room,name:'손님',faction:0,skin:'blood-iron~aurora',team:1});
 assert.equal(joined,room);
 await until(()=>host.network.current().peers.has('guestUser'));
 assert.ok(host.events.status.some(s=>s.includes('연결')),'WebRTC data channel open');
 await host.network.ready(true);await guest.network.ready(true);
 await until(()=>host.network.current().room?.players.guestUser.ready &&host.network.current().room?.players.hostUser.ready);
 await host.network.start();
 await until(()=>guest.events.snap.some(s=>s?.players?.length===2));
 const result=guest.network.sendOrder({type:'build',lane:2,slot:8,role:1});
 assert.equal(result.ok,true,'guest sends validated order');
 await until(()=>guest.events.snap.some(s=>s?.players?.find(p=>p.uid==='guestUser')?.buildings[2][8]===1));
 const received=guest.events.snap.find(s=>s?.players?.find(p=>p.uid==='guestUser')?.buildings[2][8]===1);
 assert.equal(received.players.find(p=>p.uid==='hostUser').skin,'blood-iron~gold','host cosmetic survives the peer snapshot');
 assert.equal(received.players.find(p=>p.uid==='guestUser').skin,'blood-iron~aurora','guest cosmetic reaches the host over WebRTC');
 assert.equal(received.players.find(p=>p.uid==='guestUser').cash,260);
 assert.equal(received.players.find(p=>p.uid==='hostUser').cash,null,'unscouted opponent cash must not leak over WebRTC');
 assert.equal(host.events.snap.at(-1).players.find(p=>p.uid==='guestUser').cash,null,'host UI also receives per-viewer redaction');
 assert.ok(received.players.find(p=>p.uid==='hostUser').buildings.every(l=>l.every(x=>x===null)),'opponent facilities hidden from guest data packets');
 assert.ok(droppedAppearance,'first cosmetic packet deliberately lost; start requests and receives it again');
 host.network.sendOrder({type:'build',lane:1,slot:0,role:0});
 host.match.state.seconds=20;host.match.wave();
 for(const u of host.match.state.units){u.x=1650;u.y=u.lane*520+260;}
 host.match.state.musicStage=1;host.network.sendOrder({type:'build',lane:1,slot:1,role:0});
 await until(()=>guest.events.snap.at(-1)?.musicStage===1);
 for(const client of [host,guest]){
  const packet=client.events.snap.at(-1);
  assert.ok(packet.units.some(u=>u.uid==='hostUser'&&u.skin==='blood-iron~gold'),'host units preserve selected paid chroma for both viewers');
  assert.ok(packet.units.some(u=>u.uid==='guestUser'&&u.skin==='blood-iron~aurora'),'guest units preserve distinct paid chroma for both viewers');
 }
 host.match.state.musicStage=2;host.network.sendOrder({type:'build',lane:1,slot:2,role:0});
 await until(()=>guest.events.snap.at(-1)?.musicStage===2);
 assert.equal(host.events.snap.at(-1).musicStage,2,'highlight stage travels unchanged to both clients');
 const invalid=host.network.sendOrder({type:'build',lane:4,slot:7,role:0});
 assert.equal(invalid.ok,false,'bad lane rejected');
 await host.network.leave();
 await until(()=>!records.has('desertRooms/'+room));
 assert.ok(!records.has('desertRooms/'+room+'/signals/guestUser'),'host deletes SDP on room close');
 await guest.network.leave();
 console.log('Mocked end-to-end 1v1 passed: Firebase room, signed join, P2P offer/answer, ready, host start, guest build, authoritative credits, cleanup');

 // Also reproduce full 2v2, 3v3 and 2/3-player co-op invite rooms and SDP.
 for(const [mode,size] of [['classic',1],['pvp',2],['pvp',3],['coop',2],['coop',3]]){
  const hostId='H_'+mode+size,leader=buildClient(hostId);
  const count=mode==='coop'?size:size*2;
  const guests=Array.from({length:count-1},(_,i)=>buildClient('G_'+mode+size+'_'+i));
  const id=await leader.network.create({mode,size,name:'캡틴',faction:4});
  for(let i=0;i<guests.length;i++){
   const team=mode==='coop'?0:i<size-1?0:1;
   await guests[i].network.join({code:id,name:'조력자'+i,faction:i%6,team});
  }
  await until(()=>leader.network.current().peers.size===guests.length,3500);
  await leader.network.ready(true);
  for(const client of guests)await client.network.ready(true);
  await until(()=>Object.values(leader.network.current().room.players).every(p=>p.ready));
  await leader.network.start();
  const actual=count+(mode==='coop'?size:0);
  await until(()=>guests.every(c=>c.events.snap.some(packet=>packet?.players?.length===actual)),3000);
  for(const client of guests){
   const own=client.network.current().uid;
   assert.equal(client.network.sendOrder({type:'build',lane:0,slot:2,role:0}).ok,true);
   await until(()=>client.events.snap.some(packet=>packet?.players?.find(p=>p.uid===own)?.buildings[0][2]===0));
  }
  const state=guests[0].events.snap.at(-1);
  assert.equal(state.players.length,actual);
  assert.equal(state.size,size);assert.equal(state.mode,mode);
  assert.equal(state.height,mode==='classic'?520:1560,'each guest receives the selected world height');
  assert.equal(state.lanes,mode==='classic'?1:3,'map lane count must match the room');
  if(mode==='classic'){
   assert.equal(state.players[0].buildings.length,1,'classic online lobby has one factory grid');
   assert.equal(state.coreMaxHP,8640,'classic solo-sized core HP arrives at guest');
   assert.equal(guests[0].network.sendOrder({type:'build',lane:2,slot:3,role:0}).ok,true);
   await until(()=>guests[0].events.status.some(x=>x.includes('건설 위치 오류')));
  }
  if(mode==='coop')assert.equal(state.players.filter(p=>p.bot).length,size);
  await leader.network.leave();await until(()=>!records.has('desertRooms/'+id));
  for(const client of guests)await client.network.leave();
  console.log('Mocked '+mode+' '+size+'-per-team P2P room passed: '+count+' people, '+actual+' commanders/AI');
 }

 for(const ruleset of ['augment','prism']){
  const leader=buildClient('draftHost_'+ruleset),guest=buildClient('draftGuest_'+ruleset);
  const id=await leader.network.create({mode:'classic',size:1,ruleset,name:'방장',faction:0,publicRoom:false});
  assert.equal(records.get('desertRooms/'+id).ruleset,ruleset);
  await guest.network.join({code:id,name:'손님',faction:1,team:1});
  await until(()=>leader.network.current().peers.size===1);
  assert.equal(guest.network.current().room.ruleset,ruleset);
  await leader.network.ready(true);await guest.network.ready(true);
  await until(()=>Object.values(leader.network.current().room.players).every(p=>p.ready));
  await leader.network.start();
  await until(()=>guest.events.snap.some(s=>s?.augmentChoice));
  const draft=guest.events.snap.at(-1);
  assert.equal(draft.ruleset,ruleset);
  if(ruleset==='prism')assert.equal(draft.augmentChoice.tier,'prismatic');
  assert.ok(draft.augmentChoice.cards.every(id=>leader.augments.card(id)?.tier===draft.augmentChoice.tier));
  const previous=draft.augmentChoice.cards[1];
  guest.network.sendOrder({type:'augment_reroll',slot:1});
  await until(()=>guest.events.snap.at(-1)?.augmentChoice?.cards[1]!==previous);
  guest.network.sendOrder({type:'augment_pick',slot:1});
  assert.equal(leader.network.sendOrder({type:'augment_pick',slot:0}).ok,true);
  await until(()=>guest.events.snap.some(s=>s.augmentChoice===null&&s.players.every(p=>p.augments.length===1)));
  await leader.network.leave();await guest.network.leave();
  assert.ok(!records.has('desertRooms/'+id));
  console.log('Mocked '+ruleset+' room passed: persisted rule, P2P draft, reroll, picks, cleanup');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
