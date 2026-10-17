/* Rhythm VS 1:1: Firebase Auth/Firestore signaling; WebRTC DataChannel for gameplay.
 * Independent from IRON SECTOR PvP and Firebase rankings.
 * Casual peer-hosted matches; no authoritative anti-cheat or TURN relay. */
(()=>{
'use strict';
const ROOT='rhythmRooms', STUN=[{urls:'stun:stun.l.google.com:19302'}];
class RhythmOnline{
  constructor(){this.listeners={};this.reset();}
  reset(){this.roomId='';this.role='';this.room=null;this.shared=null;this.ref=null;this.offRoom=null;this.offSignal=null;this.pc=null;this.channel=null;this.readySelf=false;this.readyPeer=false;this.starting=false;this.connecting=false;this.closed=false;}
  on(k,fn){(this.listeners[k]??=[]).push(fn);return()=>this.listeners[k]=this.listeners[k].filter(f=>f!==fn)}
  emit(k,detail){for(const f of this.listeners[k]||[])try{f(detail)}catch(e){console.error(e)}}
  error(e){this.emit('error',window.IronFirebase?.message(e)||e?.message||String(e))}
  async identity(){if(!window.IronFirebase)throw Error('Firebase 연결 스크립트를 로드하지 못했습니다.');this.shared=await window.IronFirebase.identity();return this.shared}
  doc(id=this.roomId){const {db,fs}=this.shared;return fs.doc(db,ROOT,id)}
  signalDoc(){const {db,fs}=this.shared;return fs.doc(db,ROOT,this.roomId,'signals','channel')}
  isConnected(){return this.channel?.readyState==='open'}
  async create(config){await this.leave();await this.identity();const {fs}=this.shared;let id='';for(let i=0;i<5;i++){id=Array.from(crypto.getRandomValues(new Uint8Array(5)),v=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%32]).join('');const room={host:this.shared.uid,guest:null,status:'lobby',videoId:config.videoId||'',bpm:config.bpm,offset:config.offset||0,track:config.track||'neon',created:Date.now(),expires:Date.now()+30*60*1000,startsAt:null};try{await fs.runTransaction(this.shared.db,async tx=>{let d=this.doc(id);if((await tx.get(d)).exists())throw Error('DUPLICATE');tx.set(d,room)});break}catch(e){if(e.message!=='DUPLICATE')throw e;id=''}}if(!id)throw Error('방 코드 생성에 실패했습니다.');this.roomId=id;this.role='host';this.watchRoom();this.emit('code',id);return id}
  async join(code){await this.leave();await this.identity();code=String(code||'').trim().toUpperCase();if(!/^[A-Z2-9]{5}$/.test(code))throw Error('초대 코드 5자리를 입력하세요.');const {fs}=this.shared;await fs.runTransaction(this.shared.db,async tx=>{const d=this.doc(code),s=await tx.get(d);if(!s.exists())throw Error('방이 존재하지 않습니다.');const r=s.data();if(r.status!=='lobby'||r.guest||r.host===this.shared.uid||r.expires<Date.now())throw Error('입장할 수 없는 방입니다.');tx.update(d,{guest:this.shared.uid})});this.roomId=code;this.role='guest';this.watchRoom();this.emit('code',code);return code}
  watchRoom(){this.offRoom?.();const {fs}=this.shared;this.offRoom=fs.onSnapshot(this.doc(),snap=>{if(!snap.exists()){this.emit('disconnect','방이 종료되었습니다.');this.disconnect();return}const r=snap.data();if(r.host!==this.shared.uid&&r.guest!==this.shared.uid){this.emit('disconnect','방에서 나갔습니다.');this.disconnect();return}this.room=r;this.emit('room',r);if(r.guest&&!this.pc&&!this.connecting)this.startPeer().catch(e=>this.error(e));if(!r.guest&&this.pc){this.destroyPeer();this.emit('disconnect','상대가 나갔습니다.')}},e=>this.error(e))}
  async startPeer(){this.connecting=true;try{
    let pc=new RTCPeerConnection({iceServers:STUN});this.pc=pc;
    pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'||pc.connectionState==='closed'){this.emit('disconnect','P2P 연결이 끊어졌습니다.');this.readyPeer=false}};
    if(this.role==='host'){this.wire(pc.createDataChannel('rhythm',{ordered:true}));const offer=await pc.createOffer();await pc.setLocalDescription(offer);await this.gather(pc);if(this.pc!==pc)return;await this.shared.fs.setDoc(this.signalDoc(),{offer:pc.localDescription.sdp,answer:'',expires:Date.now()+30*60*1000})}
    else pc.ondatachannel=e=>this.wire(e.channel);
    this.offSignal=this.shared.fs.onSnapshot(this.signalDoc(),async snap=>{if(!snap.exists()||this.pc!==pc)return;let v=snap.data();try{
      if(this.role==='guest'&&v.offer&&!pc.remoteDescription){await pc.setRemoteDescription({type:'offer',sdp:v.offer});await pc.setLocalDescription(await pc.createAnswer());await this.gather(pc);if(this.pc===pc)await this.shared.fs.updateDoc(this.signalDoc(),{answer:pc.localDescription.sdp})}
      if(this.role==='host'&&v.answer&&!pc.remoteDescription)await pc.setRemoteDescription({type:'answer',sdp:v.answer});
    }catch(e){this.error(e)}},e=>this.error(e));
  }finally{this.connecting=false}}
  async gather(pc){if(pc.iceGatheringState==='complete')return;await new Promise(resolve=>{const finish=()=>{clearTimeout(timeout);pc.removeEventListener('icegatheringstatechange',check);resolve()},check=()=>{if(pc.iceGatheringState==='complete')finish()},timeout=setTimeout(finish,8500);pc.addEventListener('icegatheringstatechange',check)})}
  wire(channel){this.channel=channel;channel.onopen=()=>{this.emit('connected');this.send({type:'hello'});if(this.readySelf)this.send({type:'ready',ready:true})};
    channel.onmessage=e=>{let v;try{if(typeof e.data!=='string'||e.data.length>2000)return;v=JSON.parse(e.data)}catch{return}if(!v||typeof v.type!=='string')return;if(v.type==='ready'){this.readyPeer=!!v.ready;this.emit('ready',{self:this.readySelf,peer:this.readyPeer})}else if(v.type==='hello'){this.emit('connected');if(this.readySelf)this.send({type:'ready',ready:true})}else this.emit('packet',v)};
    channel.onclose=()=>{this.readyPeer=false;this.emit('disconnect','상대와 연결이 종료되었습니다.')}};
  ready(yes){this.readySelf=!!yes;this.send({type:'ready',ready:this.readySelf});this.emit('ready',{self:this.readySelf,peer:this.readyPeer})}
  send(v){if(this.channel?.readyState==='open'){this.channel.send(JSON.stringify(v));return true}return false}
  destroyPeer(){this.offSignal?.();this.offSignal=null;try{this.channel?.close()}catch{}try{this.pc?.close()}catch{}this.pc=null;this.channel=null;this.readyPeer=false}
  disconnect(){this.offRoom?.();this.offRoom=null;this.destroyPeer();this.roomId='';this.room=null;this.role='';this.readySelf=false;this.readyPeer=false;this.connecting=false}
  async leave(){let roomId=this.roomId,role=this.role,shared=this.shared;this.disconnect();if(!roomId||!shared)return;const {fs,db,uid}=shared;try{if(role==='host'){await fs.deleteDoc(fs.doc(db,ROOT,roomId,'signals','channel')).catch(()=>{});await fs.deleteDoc(fs.doc(db,ROOT,roomId))}else{await fs.runTransaction(db,async tx=>{let doc=fs.doc(db,ROOT,roomId),snap=await tx.get(doc);if(snap.exists()&&snap.data().guest===uid)tx.update(doc,{guest:null})})}}catch(e){this.error(e)}}
}
window.RhythmOnline=new RhythmOnline();
})();