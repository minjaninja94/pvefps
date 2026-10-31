/* Desert Front Supabase lobby and WebRTC signaling adapter.
 * Firestore-shaped room methods are retained for the existing P2P transport only.
 * No Firebase SDK, Firestore, or combat packets are involved.
 */
(function(global){
'use strict';
const TABLE='desert_lobbies',SIGNALS='desert_lobby_signals';
let scope=null;
const snapshot=value=>({exists:()=>value!==null&&value!==undefined,data:()=>value===null||value===undefined?undefined:structuredClone(value)});
const call=async(db,name,args)=>{
 const {data,error}=await db.rpc(name,args);
 if(error)throw error;return data;
};
function doc(db,...parts){
 if(parts[0]==='desertRooms'&&parts[2]==='signals')return {kind:'signal',code:parts[1],guest:parts[3],path:parts.join('/')};
 if(parts[0]==='desertRooms')return {kind:'room',code:parts[1],path:parts.join('/')};
 if(parts[0]==='desertPublicRooms')return {kind:'public',code:parts[1],path:parts.join('/')};
 return {kind:'obsolete',path:parts.join('/')};
}
async function getDoc(ref){
 const db=(await ready()).db;
 if(ref.kind==='room'){
  const data=await call(db,'desert_lobby_get',{p_code:ref.code});
  return snapshot(data);
 }
 if(ref.kind==='signal'){
  const {data,error}=await db.from(SIGNALS).select('offer,answer,updated_at').eq('room_code',ref.code).eq('guest_uid',ref.guest).maybeSingle();
  if(error)throw error;return snapshot(data);
 }
 if(ref.kind==='public'){
  const {data,error}=await db.from(TABLE).select('public_room,expires_at').eq('code',ref.code).maybeSingle();
  if(error)throw error;
  return snapshot(data?.public_room?{owner:'',expires:Date.parse(data.expires_at)}:null);
 }
 return snapshot(null);
}
async function setDoc(ref,value){
 const {db,uid}=await ready();
 if(ref.kind==='room'){
  return call(db,'desert_lobby_create',{p_code:ref.code,p_room:{
   mode:value.mode,size:value.size,ruleset:value.ruleset,seed:value.seed,
   publicRoom:value.publicRoom,player:value.players?.[uid]
  }});
 }
 if(ref.kind==='signal'){
  return call(db,'desert_lobby_signal',{p_code:ref.code,p_action:'offer',p_guest:ref.guest,p_sdp:value.offer});
 }
 if(ref.kind==='public')return;
 throw Error('지원되지 않는 데이터 경로');
}
async function updateDoc(ref,values){
 const {db}=await ready();
 if(ref.kind==='signal')return call(db,'desert_lobby_signal',{
  p_code:ref.code,p_action:'answer',p_guest:ref.guest,p_sdp:values.answer
 });
 if(ref.kind==='room'&&values.status==='playing')return call(db,'desert_lobby_action',{
  p_code:ref.code,p_action:'start',p_data:{}
 });
 throw Error('허용되지 않은 방 수정');
}
async function deleteDoc(ref){
 const {db}=await ready();
 if(ref.kind==='room')return call(db,'desert_lobby_action',{p_code:ref.code,p_action:'leave',p_data:{}});
 // Public listing belongs to desert_lobbies.public_room; room closure cascades signals.
 if(ref.kind==='public'||ref.kind==='signal')return;
 throw Error('허용되지 않은 방 삭제');
}
async function runTransaction(db,fn){
 const before=new Map(),actions=[];
 const tx={
  async get(ref){const s=await getDoc(ref);before.set(ref.path,s.data());return s;},
  update(ref,changes){actions.push({ref,changes});}
 };
 const ret=await fn(tx);
 for(const {ref,changes} of actions){
  if(ref.kind!=='room'||!changes.players)throw Error('허용되지 않은 트랜잭션');
  const current=before.get(ref.path);
  if(!current)throw Error('방이 종료되었습니다.');
  const old=current.players||{},next=changes.players||{};
  const {uid}=await ready();
  const joined=Object.keys(next).filter(id=>!old[id]);
  if(joined.length===1&&joined[0]===uid){
   const p=next[uid];
   await call(db,'desert_lobby_action',{p_code:ref.code,p_action:'join',p_data:{
    name:p.name,team:p.team,faction:p.faction,skin:p.skin
   }});
  }else if(old[uid]&&!next[uid]){
   await call(db,'desert_lobby_action',{p_code:ref.code,p_action:'leave',p_data:{}});
  }else if(old[uid]&&next[uid]&&old[uid].ready!==next[uid].ready){
   await call(db,'desert_lobby_action',{p_code:ref.code,p_action:'ready',p_data:{ready:!!next[uid].ready}});
  }else throw Error('요청한 방 변경을 실행할 수 없습니다.');
 }
 return ret;
}
function onSnapshot(ref,callback,onError){
 let cancelled=false,previous=null,reading=false;
 const poll=async()=>{
  if(cancelled||reading)return;
  reading=true;
  try{
   const s=await getDoc(ref);
   if(cancelled)return;
   const key=JSON.stringify(s.data()??null);
   if(key!==previous){previous=key;callback(s);}
  }catch(e){if(!cancelled)onError?.(e);}
  finally{reading=false;}
 };
 const timer=setInterval(poll,2400);
 let channel=null;
 void ready().then(({db})=>{
  if(cancelled)return;
  const table=ref.kind==='signal'?SIGNALS:TABLE;
  const filter=ref.kind==='signal'?'room_code=eq.'+ref.code:'code=eq.'+ref.code;
  channel=db.channel('desert-'+ref.kind+'-'+ref.code+'-'+Math.random().toString(36).slice(2))
    .on('postgres_changes',{event:'*',schema:'public',table,filter},()=>void poll())
    .subscribe((state)=>{if(state==='SUBSCRIBED')void poll();});
 }).catch(e=>onError?.(e));
 void poll();
 return ()=>{cancelled=true;clearInterval(timer);if(channel)void scope?.db.removeChannel(channel);};
}
function collection(db,name){return {kind:'collection',name};}
function limit(count){return {count};}
function query(target,limitArg){return {...target,count:limitArg?.count||60};}
async function getDocs(ref){
 const {db}=await ready();
 if(ref.name!=='desertPublicRooms')throw Error('허용되지 않은 목록 조회');
 const {data,error}=await db.from(TABLE).select('code,payload,expires_at')
 .eq('public_room',true).gt('expires_at',new Date().toISOString())
 .order('updated_at',{ascending:false}).limit(ref.count||60);
 if(error)throw error;
 return {docs:(data||[]).map(r=>({id:r.code,data:()=>({
  owner:r.payload?.host||'',expires:Date.parse(r.expires_at)
 })}))};
}
const fs=Object.freeze({doc,getDoc,setDoc,updateDoc,deleteDoc,runTransaction,onSnapshot,collection,limit,query,getDocs});
async function ready(){
 const account=await global.DesertMember.onlineSession();
 scope={db:account.db,fs,uid:account.uid};return scope;
}
const identity=ready;
global.DesertSupabaseRooms=Object.freeze({ready,identity,message:e=>e?.message||String(e)});
})(window);
