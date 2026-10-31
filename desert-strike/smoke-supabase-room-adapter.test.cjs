'use strict';
// Mock the deployed Supabase RPC contracts while exercising the shipped browser adapter.
// The real database RPCs are separately checked in a rollback-only SQL integration test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'supabase-room-adapter.js'),'utf8');
const rooms=new Map(),signals=new Map(),subscriptions=[];
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const hostId='11111111-1111-4111-8111-111111111111',guestId='22222222-2222-4222-8222-222222222222';
function database(uid){
 function current(){return uid;}
 async function rpc(name,args){
  const id=current(),code=args.p_code,key=code+'|'+args.p_guest,record=rooms.get(code);
  try{
   let data=null;
   if(name==='desert_lobby_create'){
    if(record)throw Error('duplicate key');
    const p=args.p_room,player=p.player;
    data={version:1,host:id,mode:p.mode,size:p.size,ruleset:p.ruleset,seed:p.seed,
     publicRoom:p.publicRoom,status:'lobby',created:Date.now(),expires:Date.now()+7200000,
     players:{[id]:{...player,team:0,ready:false}}};
    rooms.set(code,clone(data));
   }else if(name==='desert_lobby_get'){
    data=record&&record.expires>Date.now()&&(record.status==='lobby'||record.players[id])?clone(record):null;
   }else if(name==='desert_lobby_action'){
    if(!record)throw Error('room not found');
    if(args.p_action==='join'){
     if(record.status!=='lobby')throw Error('not lobby');
     const p=args.p_data;record.players[id]={name:p.name,faction:p.faction,skin:p.skin,team:p.team,ready:false};data=clone(record);
    }else if(args.p_action==='ready'){
     if(!record.players[id]||record.status!=='lobby')throw Error('not member');
     record.players[id].ready=!!args.p_data.ready;data=clone(record);
    }else if(args.p_action==='start'){
     if(record.host!==id)throw Error('host only');
     if(!Object.values(record.players).every(p=>p.ready))throw Error('not ready');
     record.status='playing';record.publicRoom=false;data=clone(record);
    }else if(args.p_action==='leave'){
     if(id===record.host){rooms.delete(code);for(const key of signals.keys())if(key.startsWith(code+'|'))signals.delete(key);}
     else {delete record.players[id];signals.delete(code+'|'+id);}
     data=null;
    }
   }else if(name==='desert_lobby_signal'){
    if(!record)throw Error('no room');
    if(args.p_action==='offer'){
     if(record.host!==id)throw Error('host only');
     signals.set(key,{room_code:code,guest_uid:args.p_guest,offer:args.p_sdp,answer:''});
    }else if(args.p_action==='answer'){
     if(id!==args.p_guest)throw Error('guest only');
     const sig=signals.get(key);if(!sig)throw Error('no offer');sig.answer=args.p_sdp;
    }
   }else throw Error('RPC not mocked '+name);
   return {data,error:null};
  }catch(error){return {data:null,error};}
 }
 function from(table){
  const filters={},q={
   select(){return q;},eq(col,value){filters[col]=value;return q;},
   gt(col,value){filters[col+'__gt']=value;return q;},
   order(){return q;},limit(){return q;},
   async maybeSingle(){
    const code=filters.code;
    if(table==='desert_lobby_signals')return {data:clone(signals.get(filters.room_code+'|'+filters.guest_uid))||null,error:null};
    const x=rooms.get(code);return {data:x?{public_room:x.publicRoom,expires_at:new Date(x.expires).toISOString()}:null,error:null};
   },
   then(resolve,reject){
    let data=[];
    if(table==='desert_lobbies'){
     data=[...rooms.entries()].filter(([,r])=>r.publicRoom&&r.expires>Date.now())
     .map(([code,payload])=>({code,payload:clone(payload),expires_at:new Date(payload.expires).toISOString()}));
    }
    return Promise.resolve({data,error:null}).then(resolve,reject);
   }
  };return q;
 }
 return {rpc,from,
  channel(topic){const ch={on(type,params,callback){subscriptions.push({topic,type,params,callback});return ch;},
   subscribe(callback){queueMicrotask(()=>callback('SUBSCRIBED'));return ch;}};return ch;},
  async removeChannel(){return 'ok';}
 };
}
function client(uid){
 const db=database(uid),w={DesertMember:{async onlineSession(){return {db,uid};}}};
 vm.runInNewContext(source,{window:w,structuredClone:clone,Date,Math,JSON,Object,Error,
  Promise,setInterval,clearInterval,queueMicrotask});
 return {db,api:w.DesertSupabaseRooms};
}
async function run(){
 const a=client(hostId),b=client(guestId),ac=await a.api.identity(),bc=await b.api.identity();
 assert.equal(ac.uid,hostId);assert.equal(bc.uid,guestId);
 const code='ABCDEF',room=ac.fs.doc(ac.db,'desertRooms',code);
 await ac.fs.setDoc(room,{mode:'pvp',size:1,ruleset:'prism',seed:37,publicRoom:true,
  players:{[hostId]:{name:'Host',faction:0,skin:'default'}}});
 const list=await ac.fs.getDocs(ac.fs.query(ac.fs.collection(ac.db,'desertPublicRooms'),ac.fs.limit(60)));
 assert.equal(list.docs[0].id,code,'public browser uses Supabase room data');
 const guestRoom=bc.fs.doc(bc.db,'desertRooms',code);
 await bc.fs.runTransaction(bc.db,async tx=>{
  const snap=await tx.get(guestRoom);
  const players=snap.data().players;players[guestId]={name:'Guest',team:1,faction:2,skin:'default',ready:false};
  tx.update(guestRoom,{players});
 });
 assert.equal(Object.keys((await ac.fs.getDoc(room)).data().players).length,2);
 for(const [ctx,ref,uid] of [[ac,room,hostId],[bc,guestRoom,guestId]]){
  await ctx.fs.runTransaction(ctx.db,async tx=>{
   const snap=await tx.get(ref),players=snap.data().players;
   players[uid].ready=true;tx.update(ref,{players});
  });
 }
 await assert.rejects(()=>bc.fs.updateDoc(guestRoom,{status:'playing'}),/host only/);
 const hostSignal=ac.fs.doc(ac.db,'desertRooms',code,'signals',guestId);
 await ac.fs.setDoc(hostSignal,{offer:'fake-offer'});
 const guestSignal=bc.fs.doc(bc.db,'desertRooms',code,'signals',guestId);
 assert.equal((await bc.fs.getDoc(guestSignal)).data().offer,'fake-offer');
 await bc.fs.updateDoc(guestSignal,{answer:'fake-answer'});
 assert.equal((await ac.fs.getDoc(hostSignal)).data().answer,'fake-answer');
 await ac.fs.updateDoc(room,{status:'playing'});
 assert.equal((await bc.fs.getDoc(guestRoom)).data().status,'playing');
 await ac.fs.deleteDoc(room);
 assert.equal((await bc.fs.getDoc(guestRoom)).exists(),false);
 assert.equal(signals.size,0,'room closure cascades SDP');
 console.log('Supabase room adapter: create, discover, join, ready, host-only start, SDP, close PASS');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
