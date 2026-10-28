'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto'),source=fs.readFileSync(path.join(__dirname,'tri-lane-network.js'),'utf8');
test('public browser lists only live public room metadata and private invites stay hidden',async()=>{
 const db={},records=new Map(),clone=x=>JSON.parse(JSON.stringify(x)),snapshot=o=>({exists:()=>o!==undefined,data:()=>clone(o)});
 const firestore={
  doc:(_,...parts)=>({path:parts.join('/')}),collection:(_,...parts)=>({path:parts.join('/')}),
  query:(ref,...filters)=>({path:ref.path,filters}),limit:n=>({limit:n}),
  async getDoc(ref){return snapshot(records.get(ref.path));},
  async getDocs(q){const docs=[...records].filter(([key])=>key.startsWith(q.path+'/')&&key.split('/').length===2).map(([key,data])=>({id:key.split('/')[1],data:()=>clone(data)}));return {docs};},
  async setDoc(ref,value){records.set(ref.path,clone(value));},
  async deleteDoc(ref){records.delete(ref.path);},
  onSnapshot(){return ()=>{};},
  async runTransaction(_,fn){const actions=[];const tx={async get(ref){return snapshot(records.get(ref.path));},update:(ref,value)=>actions.push([ref,value])};
   await fn(tx);for(const [ref,change] of actions)records.set(ref.path,{...records.get(ref.path),...clone(change)});}
 };
 const w={IronFirebase:{identity:async()=>({db,fs:firestore,uid:'ownerUid'}),message:e=>e.message||String(e)}};
 vm.runInNewContext(source,{window:w,crypto:webcrypto,performance,Date,Math,Number,Object,Array,Map,Set,Promise,console,RTCPeerConnection:class{},setInterval,clearInterval,setTimeout,clearTimeout},{filename:'tri-lane-network.js'});
 const api=w.DesertTriNetwork;
 api.configure({});
 const visible=await api.create({mode:'pvp',size:1,name:'테스트',faction:0,publicRoom:true});
 assert.equal(records.get('desertRooms/'+visible).publicRoom,true);
 assert.equal(records.get('desertPublicRooms/'+visible).owner,'ownerUid');
 let listed=await api.browse();assert.equal(listed.length,1);assert.equal(listed[0].code,visible);
 assert.equal(listed[0].members,1);assert.equal(listed[0].capacity,2);
 await api.leave();assert.equal(records.has('desertPublicRooms/'+visible),false);
 const privateCode=await api.create({mode:'pvp',size:1,name:'비공개',faction:1,publicRoom:false});
 assert.equal(records.has('desertPublicRooms/'+privateCode),false);
 listed=await api.browse();assert.equal(listed.length,0);
 await api.leave();
});
