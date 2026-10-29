'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fsNode=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const networkSource=fsNode.readFileSync(path.join(__dirname,'tri-lane-network.js'),'utf8');
const records=new Map(),events=[];
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const snap=x=>({exists:()=>x!==undefined,data:()=>clone(x)});
let failRoomCreate=false;
const store={
 doc:(_,...p)=>({path:p.join('/')}),
 async setDoc(ref,data){
  if(failRoomCreate&&ref.path.startsWith('desertRooms/')){
   failRoomCreate=false;
   const error=new Error('permission-denied');error.code='permission-denied';throw error;
  }
  records.set(ref.path,clone(data));
 },
 async deleteDoc(ref){records.delete(ref.path);},
 onSnapshot(ref,callback){queueMicrotask(()=>callback(snap(records.get(ref.path))));return ()=>{};},
 async runTransaction(_,fn){
  const updates=[],tx={
   get:async ref=>snap(records.get(ref.path)),
   update:(ref,value)=>updates.push([ref,value])
  };
  await fn(tx);
  for(const [ref,patch] of updates)records.set(ref.path,{...records.get(ref.path),...clone(patch)});
 }
};
function client(uid,ledger){
 const w={IronFirebase:{identity:async()=>({db:{},fs:store,uid}),message:e=>e?.message||String(e)},
  DesertMember:{joinMatch:ledger,endMatch(){},forfeit:async()=>null}};
 vm.runInNewContext(networkSource,{window:w,crypto:webcrypto,Date,Math,Number,String,Object,Array,Map,Set,Promise,performance,setTimeout,clearTimeout,setInterval,clearInterval,RTCPeerConnection:class{},console});
 const statuses=[];
 w.DesertTriNetwork.configure({status:s=>statuses.push(s),room:x=>events.push(x)});
 return {net:w.DesertTriNetwork,statuses};
}
test('fresh external visitors can open and join a Firebase room while Supabase is unavailable',async()=>{
 const never=new Promise(()=>{});
 const host=client('external-host',()=>never),guest=client('external-guest',()=>never);
 const created=await Promise.race([host.net.create({mode:'classic',size:1,name:'외부테스터',faction:0,publicRoom:false}),new Promise((_,reject)=>setTimeout(()=>reject(Error('creation blocked by ledger')),250))]);
 assert.match(created,/^[A-HJ-NP-Z2-9]{6}$/);
 assert.ok(records.has('desertRooms/'+created));
 assert.ok(host.statuses.some(x=>x.includes('생성 완료')));
 const joined=await Promise.race([guest.net.join({code:created,team:1,name:'참가자',faction:1}),new Promise((_,reject)=>setTimeout(()=>reject(Error('join blocked by ledger')),250))]);
 assert.equal(joined,created);
 assert.equal(Object.keys(records.get('desertRooms/'+created).players).length,2);
 assert.ok(guest.statuses.some(x=>x.includes('참가 완료')));
 await host.net.leave();await guest.net.leave();
});
test('Firestore permission error resets failed room and next attempt may succeed',async()=>{
 const c=client('new-browser',async()=>({ok:false,reason:'Supabase 게스트 인증 비활성'}));
 failRoomCreate=true;
 await assert.rejects(c.net.create({mode:'classic',size:1,name:'테스터',faction:0,publicRoom:false}),/방 생성 실패/);
 assert.equal(c.net.current().roomId,null,'must not retain unusable room code');
 const room=await c.net.create({mode:'classic',size:1,name:'테스터',faction:0,publicRoom:false});
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(c.statuses.some(x=>x.includes('비공식 경기')));
 assert.ok(records.has('desertRooms/'+room));
 await c.net.leave();
});
test('device identity has session and memory persistence fallback for storage-restricted visitors',()=>{
 const device=fsNode.readFileSync(path.join(__dirname,'device-account.js'),'utf8');
 assert.match(device,/browserSessionPersistence/);
 assert.match(device,/inMemoryPersistence/);
});
