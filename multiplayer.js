// Firebase stores lobby and SDP only; all simulation traffic uses WebRTC.
(() => {
  const P = window.IronLobbyPolicy;
  class Multiplayer {
    constructor() {
      this.room = null; this.id = null; this.uid = null; this.peers = new Map(); this.rooms = [];
      this.listeners = new Map(); this.unsubs = []; this.busy = false; this.started = null; this.closed = false; this.packetSeq=0;
      this.ticker = setInterval(() => this.tick().catch(e => this.fail(e)), 1000);
    }
    on(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); return () => this.listeners.get(name).delete(fn); }
    emit(name, value) { for (const fn of this.listeners.get(name) || []) fn(value); }
    fail(e) { this.emit('error', window.IronFirebase.message(e)); }
    get host() { return !!this.room && this.room.host === this.uid; }
    async connect(name) {
      if (!window.RTCPeerConnection) throw Error('이 브라우저는 WebRTC를 지원하지 않습니다. 최신 Chrome 또는 Edge를 사용해 주세요.');
      this.shared ||= await window.IronFirebase.identity(); this.uid = this.shared.uid;
      this.name = (name || '').trim().slice(0, 16) || 'OPERATOR';
      if (!this.listOff) this.watchList();
    }
    ref(id = this.id) { return this.shared.fs.doc(this.shared.db, 'mpRooms', id); }
    watchList() {
      const { fs, db } = this.shared;
      // One range field: no composite index or per-frame writes required.
      this.listOff = fs.onSnapshot(fs.query(fs.collection(db, 'mpRooms'), fs.where('lease', '>', Date.now()), fs.orderBy('lease','desc'), fs.limit(50)), snap => {
        this.rooms = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.status === 'lobby' && r.version === P.VERSION);
        this.emit('rooms', this.rooms); this.autoMatch().catch(e => this.fail(e));
      }, e => this.fail(e));
    }
    async create(mode, difficulty = 1, title = '') {
      if (this.id) await this.leave();
      const id = crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
      const room = P.create(this.uid, this.name, mode, difficulty, title || (mode === 'coop' ? '협력 작전' : 'WAREHOUSE · 팀 데스매치'), Date.now());
      const { fs } = this.shared;
      await fs.runTransaction(this.shared.db, async tx => { const ref = this.ref(id); if ((await tx.get(ref)).exists()) throw Error('방 코드를 다시 생성해 주세요.'); tx.set(ref, room); });
      this.attach(id); return id;
    }
    async join(id) {
      id = id.trim().toUpperCase(); if (!/^[A-Z0-9]{10}$/.test(id)) throw Error('10자리 방 코드를 확인해 주세요.');
      if (this.id && this.id !== id) await this.leave();
      await this.mutate('join', { name: this.name }, id); this.attach(id);
    }
    async match(difficulty) {
      this.matching = difficulty;
      const candidate = this.rooms.filter(r => r.mode === 'coop' && r.difficulty === difficulty && !r.proposal && P.members(r).length < 4 && r.lease > Date.now()).sort((a, b) => a.created - b.created)[0];
      if (candidate) { try { await this.join(candidate.id); return; } catch {} }
      await this.create('coop', difficulty); this.matching = difficulty;
    }
    async autoMatch() {
      // Resolve two simultaneous lone matchmakers without polling the database.
      if (this.matchBusy || this.matching === undefined || !this.host || !this.room || P.members(this.room).length !== 1 || this.room.proposal) return;
      const older = this.rooms.filter(r => r.id !== this.id && r.mode === 'coop' && r.difficulty === this.matching && r.status === 'lobby' && !r.proposal && P.members(r).length < 4 && (r.created < this.room.created || r.created === this.room.created && r.id < this.id) && r.lease > Date.now()).sort((a,b) => a.created-b.created)[0];
      if (!older) return;
      this.matchBusy = true; const difficulty = this.matching;
      try { await this.join(older.id); this.matching = difficulty; } finally { this.matchBusy = false; }
    }
    async mutate(action, value, id = this.id) {
      const { fs, db } = this.shared;
      await fs.runTransaction(db, async tx => { const ref = this.ref(id), snap = await tx.get(ref); if (!snap.exists()) throw Error('방을 찾지 못했습니다.'); tx.set(ref, P.change(snap.data(), this.uid, action, value, Date.now())); });
    }
    attach(id) {
      this.detach(); this.id = id; this.closed = false; this.lastBeat = Date.now();
      const { fs } = this.shared;
      this.unsubs.push(fs.onSnapshot(this.ref(), snap => {
        if (!snap.exists()) { this.connectionLost('방이 종료되었습니다.'); return; }
        const r = snap.data(); this.room = r;
        if (r.status === 'closed' || !r.members[this.uid]) { this.connectionLost('방장이 나갔거나 참가 연결이 종료되었습니다.'); return; }
        this.syncPeers(); this.emit('room', { id: this.id, ...r });
        if (r.status === 'playing' && this.started !== r.session.id) { this.started = r.session.id; this.matching = undefined; this.emit('start', { ...r, uid: this.uid, roomId: this.id }); }
        this.autoMatch().catch(e => this.fail(e));
      }, e => this.fail(e)));
    }
    syncPeers() {
      if (!this.room) return;
      const wanted = this.host ? Object.keys(this.room.members).filter(id => id !== this.uid) : [this.room.host];
      for (const [id, p] of this.peers) if (!wanted.includes(id)) { p.off?.(); p.pc.close(); this.peers.delete(id); }
      for (const id of wanted) if (!this.peers.has(id)) this.openPeer(id).catch(e => this.fail(e));
    }
    async gather(pc) {
      if (pc.iceGatheringState === 'complete') return;
      await new Promise(resolve => { const done = () => { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', check); resolve(); }, check = () => { if (pc.iceGatheringState === 'complete') done(); }, timer = setTimeout(done, 8000); pc.addEventListener('icegatheringstatechange', check); });
    }
    async openPeer(id) {
      const host = this.host, { fs, db } = this.shared;
      const signalRef = fs.doc(db, 'mpRooms', this.id, 'signals', host ? id : this.uid);
      const pc = new RTCPeerConnection({ iceServers: window.IRON_MULTIPLAYER?.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }], iceCandidatePoolSize: 2 });
      const peer = { pc, id, opened: Date.now(), last: Date.now(), rtt: null, linked: false, signalBusy: false, fragments:new Map() }; this.peers.set(id, peer);
      const wire = channel => {
        if (!['control','state'].includes(channel.label)) { channel.close(); return; }
        peer[channel.label] = channel;
        channel.onopen = () => { if (peer.control?.readyState === 'open' && peer.state?.readyState === 'open') { peer.linked = true; peer.last = Date.now(); this.connectedChanged(); } };
        channel.onmessage = event => {
          if (typeof event.data !== 'string' || event.data.length > 240000) return;
          let msg; try { msg = JSON.parse(event.data); } catch { return; }
          if (!msg || typeof msg !== 'object') return; peer.last = Date.now();
          if (msg.type === 'ping') { this.send(id, { type:'pong', at:msg.at }); return; }
          if (msg.type === 'pong') { peer.rtt = Math.max(0, Date.now()-msg.at); this.emit('ping', { id, ms:peer.rtt }); return; }
          if (msg.type === 'fragment') {
            if (typeof msg.id!=='string'||!Number.isInteger(msg.count)||msg.count<1||msg.count>32||!Number.isInteger(msg.index)||msg.index<0||msg.index>=msg.count||typeof msg.part!=='string'||msg.part.length>12000) return;
            for(const [key,f]of peer.fragments)if(Date.now()-f.at>1500)peer.fragments.delete(key);
            if(!peer.fragments.has(msg.id)){if(peer.fragments.size>=4)return;peer.fragments.set(msg.id,{at:Date.now(),parts:Array(msg.count),received:0});}
            const f=peer.fragments.get(msg.id);if(f.parts.length!==msg.count)return;if(f.parts[msg.index]===undefined){f.parts[msg.index]=msg.part;f.received++;}
            if(f.received!==msg.count)return;peer.fragments.delete(msg.id);try{msg=JSON.parse(f.parts.join(''));}catch{return;}
          }
          this.emit('packet', { from:id, data:msg });
        };
        channel.onclose = () => { if (this.peers.get(id) !== peer) return; peer.linked = false; this.connectedChanged(); if (this.room?.status === 'playing') this.emit('disconnect', id); };
      };
      pc.ondatachannel = e => wire(e.channel);
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') { peer.linked=false; this.connectedChanged(); this.emit('disconnect', id); this.fail(Error('직접 연결에 실패했습니다. 다른 네트워크로 접속해 주세요. 이 버전은 유료 중계 서버를 사용하지 않습니다.')); } };
      peer.off = fs.onSnapshot(signalRef, async snap => {
        if (!snap.exists() || peer.signalBusy || this.peers.get(id) !== peer) return;
        const s = snap.data();
        try {
          peer.signalBusy = true;
          if (host && s.answer && !pc.remoteDescription) await pc.setRemoteDescription({ type:'answer', sdp:s.answer });
          if (!host && s.offer && !pc.remoteDescription) {
            await pc.setRemoteDescription({ type:'offer', sdp:s.offer }); await pc.setLocalDescription(await pc.createAnswer()); await this.gather(pc);
            if (this.peers.get(id) === peer) await fs.updateDoc(signalRef, { answer:pc.localDescription.sdp });
          }
        } catch (e) { this.fail(e); } finally { peer.signalBusy = false; }
      }, e => this.fail(e));
      if (host) {
        wire(pc.createDataChannel('control', { ordered:true })); wire(pc.createDataChannel('state', { ordered:false, maxRetransmits:0 }));
        await pc.setLocalDescription(await pc.createOffer()); await this.gather(pc);
        if (this.peers.get(id) === peer) await fs.setDoc(signalRef, { offer:pc.localDescription.sdp, answer:'', expires:Date.now()+150000 });
      }
    }
    connectedChanged() {
      if (!this.room || this.room.status !== 'lobby' || this.host) return;
      const connected = !!this.peers.get(this.room.host)?.linked;
      if (this.room.members[this.uid]?.connected !== connected) this.mutate('connected', connected).catch(e=>this.fail(e));
    }
    send(id, data, fast = false) {
      const p=this.peers.get(id), channel=p?.[fast?'state':'control'];
      if (channel?.readyState !== 'open' || channel.bufferedAmount > (fast?128000:512000)) return false;
      try { const text=JSON.stringify(data);if(text.length>360000)return false;if(text.length<=12000)channel.send(text);else{const id=String(++this.packetSeq|| (this.packetSeq=1)),count=Math.ceil(text.length/12000);for(let i=0;i<count;i++)channel.send(JSON.stringify({type:'fragment',id,count,index:i,part:text.slice(i*12000,(i+1)*12000)}));}return true; } catch { return false; }
    }
    broadcast(data, fast = false) { for (const id of this.peers.keys()) this.send(id,data,fast); }
    async tick() {
      const now=Date.now();
      for (const [id,p] of this.peers) {
        if (p.linked && now-(p.pingAt||0)>2000) { p.pingAt=now; this.send(id,{type:'ping',at:now}); }
        if (p.linked && now-p.last>15000) { p.linked=false; this.emit('disconnect',id); }
        if (!p.linked && !p.reported && now-p.opened>25000) { p.reported=true; this.fail(Error('연결 대기 시간이 초과되었습니다. 방을 나갔다 다시 참가하거나 다른 네트워크를 이용해 주세요.')); }
      }
      if (!this.room || this.busy) return;
      this.busy=true;
      try {
        if (this.room.lease<now && this.room.status==='lobby') { this.connectionLost('대기실 연결이 만료되었습니다. 다시 매칭해 주세요.'); return; }
        if (now-this.lastBeat>60000 && this.room.status==='lobby') { this.lastBeat=now; await this.mutate('heartbeat'); }
        if (this.host && this.room.status==='lobby') {
          if (P.members(this.room).some(p=>now-p.seen>=P.LEASE)) await this.mutate('prune');
          const p=this.room.proposal;
          if (p && (p.until<now || !P.ready(this.room) || P.members(this.room).some(m=>m.vote==='no') || p.roster!==Object.keys(this.room.members).sort().join(','))) await this.mutate('cancel');
          else if (p && P.members(this.room).every(m=>m.vote===p.id) && [...this.peers.values()].every(x=>x.linked)) await this.mutate('start', crypto.getRandomValues(new Uint32Array(1))[0]);
        }
        this.emit('clock',now);
      } finally { this.busy=false; }
    }
    detach() { for(const off of this.unsubs)off(); this.unsubs=[]; for(const p of this.peers.values()){p.off?.();p.pc.close();}this.peers.clear();this.room=null;this.id=null;this.started=null; }
    async leave() { this.matching=undefined;const id=this.id,room=this.room,host=this.host;this.detach();this.emit('room',null);if(id)try{const {fs,db}=this.shared;const ids=host?Object.keys(room?.members||{}).filter(x=>x!==this.uid):[this.uid];for(const guest of ids)await fs.deleteDoc(fs.doc(db,'mpRooms',id,'signals',guest)).catch(()=>{});if(host)await fs.deleteDoc(this.ref(id));else await this.mutate('leave',null,id);}catch{} }
    connectionLost(reason) { if(this.closed)return;this.closed=true;this.emit('ended',reason);this.detach();this.emit('room',null); }
    closeList() { this.listOff?.();this.listOff=null; }
  }
  window.IronMultiplayer = new Multiplayer();
})();
