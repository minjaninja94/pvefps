/* Desert Front WebRTC room transport. Firestore handles lobby/SDP only.
 * Authoritative match + construction validation run on the host; never send
 * per-frame unit state to Firestore. Requires rules from FIREBASE_SETUP.md.
 */
(function(global){
'use strict';
const ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
let events={},scope=null,db=null,fs=null,uid=null,roomId=null,room=null,host=false,localPeer=null;
let roomUnsub=null,peerSubs=new Map(),channels=new Map(),pcs=new Map(),clock=null,engine=null,seq=0,lastFrame=0;
let active=false,answering=false,hostPeerOpen=new Set();
const msg=e=>global.IronFirebase?.message?.(e)||e?.message||String(e);
function notify(key,data){try{events[key]?.(data);}catch(e){console.error('멀티 UI 갱신 오류',e);}}
function status(s){notify('status',s);}
function validateName(s){return String(s||'지휘관').trim().replace(/[<>]/g,'').slice(0,16)||'지휘관';}
function code(){const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);return Array.from(bytes,n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');}
const path=()=>fs.doc(db,'desertRooms',roomId);
const signalPath=guest=>fs.doc(db,'desertRooms',roomId,'signals',guest);
async function identity(){
 if(!global.IronFirebase)throw Error('Firebase 네트워크 모듈이 아직 준비되지 않았습니다.');
 scope=await global.IronFirebase.identity();
 db=scope.db;fs=scope.fs;uid=scope.uid;return scope;
}
function members(){return Object.entries(room?.players||{}).map(([id,p])=>({uid:id,...p}));}
function everyoneReady(r){
 const p=Object.values(r?.players||{});
 if(r.mode==='coop')return p.length===r.size&&p.every(x=>x.ready&&x.team===0);
 return p.length===r.size*2&&p.every(x=>x.ready)&&[0,1].every(team=>p.filter(x=>x.team===team).length===r.size);
}
function resetLocal(){
 if(clock){clearInterval(clock);clock=null;}
 if(roomUnsub){roomUnsub();roomUnsub=null;}
 for(const stop of peerSubs.values())stop();peerSubs.clear();
 for(const ch of channels.values())try{ch.close();}catch(e){}
 for(const pc of pcs.values())try{pc.close();}catch(e){}
 channels.clear();pcs.clear();hostPeerOpen.clear();
 engine=null;room=null;roomId=null;uid=null;host=false;seq=0;lastFrame=0;active=false;answering=false;scope=null;db=null;fs=null;
}
async function leave(){
 if(!roomId)return resetLocal();
 const id=roomId,currentUid=uid,isHost=host;
 try{
  if(isHost){
   // Delete SDP docs before removing the parent; Firestore does not cascade child deletion.
   for(const m of members())if(m.uid!==currentUid){
    try{await fs.deleteDoc(signalPath(m.uid));}catch(e){}
   }
   await fs.deleteDoc(path());
  }else await fs.runTransaction(db,async tx=>{
   const r=await tx.get(path());if(!r.exists())return;
   const players={...r.data().players};delete players[currentUid];
   tx.update(path(),{players});
  });
 }catch(e){status('방 나가기 처리: '+msg(e));}
 resetLocal();notify('room',null);notify('snapshot',null);status('방에서 나왔습니다.');
}
function listenRoom(){
 roomUnsub=fs.onSnapshot(path(),snap=>{
  if(!snap.exists()){status('방이 닫혔습니다.');resetLocal();notify('room',null);return;}
  room=snap.data();notify('room',{id:roomId,room,uid,host,ready:everyoneReady(room)});
  if(host&&room.status==='lobby')for(const m of members())if(m.uid!==uid&&!pcs.has(m.uid))void makeOffer(m.uid).catch(e=>status('연결 제안 오류: '+msg(e)));
  if(!host&&!pcs.size&&room.status==='lobby')listenGuest();
 },e=>status('대기실 수신 오류: '+msg(e)));
}
async function create(opts){
 if(roomId)await leave();
 await identity();
 if(!['pvp','coop'].includes(opts.mode)||![1,2,3].includes(Number(opts.size))||opts.mode==='coop'&&Number(opts.size)<2)throw Error('잘못된 인원/모드');
 roomId=code();host=true;
 room={version:1,host:uid,mode:opts.mode,size:Number(opts.size),status:'lobby',created:Date.now(),expires:Date.now()+7200000,
  players:{[uid]:{name:validateName(opts.name),faction:Number(opts.faction),team:0,ready:false}}};
 await fs.setDoc(path(),room);
 listenRoom();status('방 코드 '+roomId+' · 상대에게 코드를 공유하세요.');
 return roomId;
}
async function join(opts){
 if(roomId)await leave();
 await identity();
 roomId=String(opts.code||'').trim().toUpperCase();
 if(!/^[A-HJ-NP-Z2-9]{6}$/.test(roomId))throw Error('6자리 방 코드가 필요합니다.');
 host=false;
 await fs.runTransaction(db,async tx=>{
  const ref=path(),snap=await tx.get(ref);
  if(!snap.exists())throw Error('존재하지 않는 방입니다.');
  const r=snap.data();
  if(r.status!=='lobby'||r.expires<Date.now())throw Error('대기 중인 방만 참가할 수 있습니다.');
  const players={...r.players};
  if(uid in players)throw Error('이미 같은 방에 참가했습니다.');
  let team=r.mode==='coop'?0:Number(opts.team);
  if(![0,1].includes(team))throw Error('잘못된 팀');
  const cap=r.size;
  if(Object.values(players).filter(p=>p.team===team).length>=cap){
   if(r.mode==='pvp'&&Object.values(players).filter(p=>p.team===1-team).length<cap)team=1-team;
   else throw Error('두 팀 모두 정원이 가득 찼습니다.');
  }
  if(Object.keys(players).length>=r.size*(r.mode==='pvp'?2:1))throw Error('방 정원이 가득 찼습니다.');
  players[uid]={name:validateName(opts.name),team,faction:Number(opts.faction),ready:false};
  if(players[uid].faction<0||players[uid].faction>8)throw Error('종족 선택 오류');
  tx.update(ref,{players});
 });
 listenRoom();status('방 '+roomId+' 참가 완료 · 연결과 준비 상태를 확인하세요.');
 return roomId;
}
async function ready(value){
 if(!roomId)throw Error('방에 먼저 입장해 주세요.');
 await fs.runTransaction(db,async tx=>{
  const ref=path(),snap=await tx.get(ref);if(!snap.exists())throw Error('방이 종료되었습니다.');
  const r=snap.data();if(r.status!=='lobby'||!r.players?.[uid])throw Error('현재 준비 변경 불가');
  tx.update(ref,{players:{...r.players,[uid]:{...r.players[uid],ready:!!value}}});
 });
}
function waitIce(pc){
 return new Promise(resolve=>{
  if(pc.iceGatheringState==='complete')return resolve();
  let complete=false;
  const finish=()=>{if(complete)return;complete=true;pc.removeEventListener('icegatheringstatechange',onChange);clearTimeout(timer);resolve();};
  const onChange=()=>{if(pc.iceGatheringState==='complete')finish();};
  pc.addEventListener('icegatheringstatechange',onChange);
  const timer=setTimeout(finish,5000);
 });
}
function listenHostAnswer(guest,pc){
 const stop=fs.onSnapshot(signalPath(guest),async snap=>{
  const signal=snap.data();
  if(signal?.answer&&!pc.currentRemoteDescription){
   try{await pc.setRemoteDescription({type:'answer',sdp:signal.answer});}
   catch(e){status('SDP 응답 처리 실패: '+msg(e));}
  }
 });
 peerSubs.set(guest,stop);
}
function handleChannel(guest,ch){
 channels.set(guest,ch);
 ch.onopen=()=>{
  hostPeerOpen.add(guest);status('실시간 연결: '+hostPeerOpen.size+'명');
  notify('peers',new Set(hostPeerOpen));
  if(host&&engine)send(ch,{type:'snapshot',state:engine.snapshot()});
 };
 ch.onclose=()=>{hostPeerOpen.delete(guest);notify('peers',new Set(hostPeerOpen));status('연결 종료: '+guest.slice(0,6));};
 ch.onerror=()=>status('P2P 연결 오류. 일부 네트워크는 TURN 릴레이 없이는 연결되지 않습니다.');
 ch.onmessage=e=>{
  let data;try{data=JSON.parse(e.data);}catch(err){return;}
  if(host){
   if(!engine||data?.type!=='order'||typeof data.seq!=='number')return;
   const old=ch._lastSeq||0;if(data.seq<=old||data.seq>old+1000)return;ch._lastSeq=data.seq;
   // The peer connection determines the owner UID, never a client-provided ID.
   const result=engine.order(guest,data.order);
   send(ch,{type:'ack',seq:data.seq,result});
   if(result.ok)broadcast(true);
  }else if(data?.type==='snapshot'){
   if(data.state?.lanes!==3&&data.state?.width!==3300)return;
   notify('snapshot',data.state);
  }else if(data?.type==='ack'&&!data.result.ok){status(data.result.reason);}
 };
}
function send(ch,obj){if(ch?.readyState==='open')try{ch.send(JSON.stringify(obj));}catch(e){status('동기화 데이터 전송 실패');}}
async function makeOffer(guest){
 if(pcs.has(guest)||!room?.players?.[guest])return;
 const pc=new RTCPeerConnection({iceServers:ICE});pcs.set(guest,pc);
 pc.onconnectionstatechange=()=>{if(['failed','disconnected'].includes(pc.connectionState))status('접속 불안정: '+guest.slice(0,6));};
 const ch=pc.createDataChannel('front',{ordered:true});handleChannel(guest,ch);
 listenHostAnswer(guest,pc);
 const offer=await pc.createOffer();await pc.setLocalDescription(offer);await waitIce(pc);
 await fs.setDoc(signalPath(guest),{offer:pc.localDescription.sdp,answer:'',updated:Date.now()});
}
function listenGuest(){
 if(!room?.players?.[uid]||peerSubs.has(uid))return;
 const stop=fs.onSnapshot(signalPath(uid),async snap=>{
  const signal=snap.data();if(!signal?.offer||answering||pcs.size)return;
  answering=true;
  try{
   const pc=new RTCPeerConnection({iceServers:ICE});pcs.set(uid,pc);
   pc.ondatachannel=ev=>handleChannel(room.host,ev.channel);
   await pc.setRemoteDescription({type:'offer',sdp:signal.offer});
   await pc.setLocalDescription(await pc.createAnswer());await waitIce(pc);
   await fs.updateDoc(signalPath(uid),{answer:pc.localDescription.sdp,updated:Date.now()});
  }catch(e){answering=false;status('상대 P2P 연결 실패: '+msg(e));}
 },e=>status('신호 수신 실패: '+msg(e)));
 peerSubs.set(uid,stop);
}
function broadcast(force=false){
 if(!engine)return;
 const now=performance.now();
 if(!force&&now-lastFrame<200)return;
 lastFrame=now;
 const pkt={type:'snapshot',state:engine.snapshot()};
 for(const ch of channels.values())send(ch,pkt);
 notify('snapshot',pkt.state);
}
async function start(){
 if(!host||!room)throw Error('방장만 경기를 시작할 수 있습니다.');
 if(!everyoneReady(room))throw Error('설정된 인원과 전원 준비가 필요합니다.');
 const guests=members().filter(m=>m.uid!==uid);
 if(guests.some(g=>channels.get(g.uid)?.readyState!=='open'))throw Error('모든 참가자의 P2P 연결이 완료되지 않았습니다.');
 if(!global.DesertTriEngine)throw Error('3라인 전투 엔진이 준비되지 않았습니다.');
 engine=global.DesertTriEngine.create({mode:room.mode,size:room.size,members:members()});
 await fs.updateDoc(path(),{status:'playing'});
 let last=performance.now();
 clock=setInterval(()=>{
  const now=performance.now();const dt=Math.max(0,Math.min((now-last)/1000,.2));last=now;
  if(!engine||engine.state.ended)return broadcast();
  engine.tick(dt);broadcast();
 },50);
 broadcast(true);active=true;status('3라인 경기 시작 · 방장 실시간 판정 중');
}
function sendOrder(order){
 if(!roomId||room?.status!=='playing')return {ok:false,reason:'경기가 시작되지 않았습니다.'};
 if(host){if(!engine)return {ok:false,reason:'전투 생성 대기'};
  const r=engine.order(uid,order);if(r.ok)broadcast(true);return r;}
 const ch=channels.get(room?.host);if(ch?.readyState!=='open')return {ok:false,reason:'호스트 연결 끊김'};
 send(ch,{type:'order',seq:++seq,order});return {ok:true,pending:true};
}
function configure(callbacks){events={...callbacks};}
function current(){return {roomId,room,uid,host,peers:new Set(hostPeerOpen),active};}
global.DesertTriNetwork=Object.freeze({configure,identity,create,join,ready,start,leave,sendOrder,current,validateName});
})(window);
