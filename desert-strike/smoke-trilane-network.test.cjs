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
 async setDoc(ref,value){records.set(key(ref),clone(value));notify(key(ref));},
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
let hostPending=null;
class Channel {
 constructor(){this.readyState='connecting';this.onopen=null;this.onmessage=null;this.onclose=null;this.peer=null;}
 connect(other){this.peer=other;other.peer=this;this.readyState='open';other.readyState='open';
  queueMicrotask(()=>{this.onopen?.();other.onopen?.();});}
 send(data){if(this.readyState!=='open'||!this.peer)throw Error('channel closed');
  queueMicrotask(()=>this.peer.onmessage?.({data}));}
 close(){this.readyState='closed';this.onclose?.();}
}
class FakePeer {
 constructor(){this.iceGatheringState='complete';this.connectionState='connected';this.localDescription=null;this.currentRemoteDescription=null;this.ondatachannel=null;}
 createDataChannel(){const ch=new Channel();hostPending={pc:this,ch};return ch;}
 async createOffer(){return {type:'offer',sdp:'TEST-SDP-OFFER'};}
 async createAnswer(){return {type:'answer',sdp:'TEST-SDP-ANSWER'};}
 async setLocalDescription(sdp){this.localDescription=sdp;}
 async setRemoteDescription(sdp){
  this.currentRemoteDescription=sdp;
  if(sdp.type==='offer'&&hostPending){
   const remote=new Channel(),pair=hostPending;
   this.ondatachannel?.({channel:remote});
   pair.ch.connect(remote);
  }
 }
 addEventListener(){}removeEventListener(){}close(){}
}
function buildClient(uid){
 const w={addEventListener(){}},env={
  window:w,crypto:webcrypto,RTCPeerConnection:FakePeer,
  setInterval,clearInterval,setTimeout,clearTimeout,performance,Date,Math,Number,String,Object,Array,Map,Set,console
 };
 w.IronFirebase={async identity(){return {db:{},fs:firestore,uid};},message:e=>e?.message||String(e)};
 vm.runInNewContext(engineSource,env,{filename:'tri-lane-engine.js'});
 vm.runInNewContext(networkSource,env,{filename:'tri-lane-network.js'});
 const events={room:[],status:[],snap:[],peers:[]};
 w.DesertTriNetwork.configure({room:x=>events.room.push(x),status:x=>events.status.push(x),snapshot:x=>events.snap.push(x),peers:x=>events.peers.push(x)});
 return {network:w.DesertTriNetwork,events};
}
async function until(fn,ms=1800){
 const end=Date.now()+ms;
 while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,20));}
 throw Error('Timed out waiting for multi handshake');
}
async function main(){
 const host=buildClient('hostUser'),guest=buildClient('guestUser');
 const room=await host.network.create({mode:'pvp',size:1,name:'방장',faction:4});
 assert.match(room,/^[A-HJ-NP-Z2-9]{6}$/);
 assert.ok(records.has('desertRooms/'+room));
 const joined=await guest.network.join({code:room,name:'손님',faction:5,team:1});
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
 assert.equal(received.players.find(p=>p.uid==='guestUser').cash,265);
 assert.equal(received.players.find(p=>p.uid==='hostUser').cash,360,'client build only spends own currency');
 const invalid=host.network.sendOrder({type:'build',lane:4,slot:7,role:0});
 assert.equal(invalid.ok,false,'bad lane rejected');
 await host.network.leave();
 await until(()=>!records.has('desertRooms/'+room));
 assert.ok(!records.has('desertRooms/'+room+'/signals/guestUser'),'host deletes SDP on room close');
 await guest.network.leave();
 console.log('Mocked end-to-end 1v1 passed: Firebase room, signed join, P2P offer/answer, ready, host start, guest build, authoritative credits, cleanup');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
