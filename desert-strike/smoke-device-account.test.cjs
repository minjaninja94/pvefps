'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'device-account.js'),'utf8'),storage=new Map();
function client(uid='supabase-guest'){
 let calls=0,offline=false,current=uid;
 const w={crypto:webcrypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  DesertSupabaseRooms:{async identity(){calls++;if(offline)throw Error('offline');return {db:{},fs:{},uid:current};}}};
 vm.runInNewContext(source,{window:w,Uint8Array,Date,Array,JSON,Object,Error,Promise});
 return {api:w.DesertDeviceAccount,setUid:v=>{current=v;},setOffline:v=>{offline=v;},calls:()=>calls};
}
(async()=>{
 let c=client();const a=c.api.status();
 assert.match(a.accountId,/^U-[a-f0-9]{24}$/);assert.match(a.deviceId,/^D-[a-f0-9]{24}$/);
 assert.notEqual(a.accountId.slice(2),a.deviceId.slice(2));assert.equal(a.online,false);
 const [one,two]=await Promise.all([c.api.identity(),c.api.identity()]);
 assert.equal(one.uid,'supabase-guest');assert.equal(two.uid,one.uid);assert.equal(c.calls(),1);
 c.setUid('signed-in-member');assert.equal((await c.api.identity()).uid,'signed-in-member','must follow session changes');
 c=client('other-supabase-user');assert.equal(c.api.status().accountId,a.accountId);
 assert.equal((await c.api.identity()).uid,'other-supabase-user','public device ID cannot impersonate Supabase auth');
 c.setOffline(true);await assert.rejects(c.api.identity());
 assert.equal(c.api.status().accountId,a.accountId,'offline local solo identity remains available');
 const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),lobby=fs.readFileSync(path.join(__dirname,'front-lobby.js'),'utf8');
 assert.doesNotMatch(html,/firebase-network\.js|firebase-config\.js/);
 assert.ok(html.includes('supabase-room-adapter.js'));
 assert.ok(html.includes('lobbyDeviceId')&&html.includes('careerRegister'));
 assert.doesNotMatch(lobby,/IronFirebase/);
 console.log('Supabase device identity regression passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
