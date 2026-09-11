// Pure lobby state transitions, shared by the UI and regression tests.
(() => {
  const VERSION = 1, LEASE = 150000;
  const members = room => Object.entries(room.members || {}).map(([id, p]) => ({ id, ...p }));
  const live = (room, now) => members(room).filter(p => now - p.seen < LEASE);
  const ready = room => {
    const p = members(room);
    return p.length >= 2 && p.length <= room.capacity && p.every(x => x.ready && x.connected) &&
      (room.mode !== 'pvp' || [1, 2].every(team => p.some(x => x.team === team)));
  };
  function create(id, name, mode, difficulty, title, now) {
    return { version: VERSION, host: id, mode, difficulty, title: title.slice(0, 32), capacity: mode === 'coop' ? 4 : 8,
      status: 'lobby', created: now, lease: now + LEASE, proposal: null, session: null,
      members: { [id]: { name: name.slice(0, 16), team: 1, ready: false, connected: true, vote: '', seen: now } } };
  }
  function change(source, id, action, value, now) {
    const r = JSON.parse(JSON.stringify(source)), me = r.members[id];
    if (r.version !== VERSION || r.lease < now || r.status === 'closed') throw Error('종료되었거나 오래된 방입니다.');
    if (action === 'join') {
      if (me) return r;
      if (r.status !== 'lobby' || r.proposal || members(r).length >= r.capacity) throw Error('입장할 수 없는 방입니다.');
      const counts = [1, 2].map(t => members(r).filter(p => p.team === t).length);
      r.members[id] = { name: value.name.slice(0, 16), team: counts[0] <= counts[1] ? 1 : 2, ready: false, connected: false, vote: '', seen: now };
      return r;
    }
    if (!me) throw Error('방에 참가한 상태가 아닙니다.');
    if (action === 'leave') {
      delete r.members[id]; r.proposal = null;
      if (id === r.host) r.status = 'closed';
      return r;
    }
    if (action === 'heartbeat') { me.seen = now; if (id === r.host) r.lease = now + LEASE; return r; }
    if (action === 'prune') {
      if (id !== r.host) throw Error('방장만 정리할 수 있습니다.');
      for (const p of members(r)) if (now - p.seen >= LEASE) { delete r.members[p.id]; r.proposal = null; }
      return r;
    }
    if (r.status !== 'lobby') throw Error('이미 경기를 시작했습니다.');
    if (action === 'connected') { me.connected = !!value; if (!value) { me.ready = false; me.vote = ''; } return r; }
    if (action === 'cancel') {
      if (id !== r.host && id !== r.proposal?.by) throw Error('시작 요청을 취소할 수 없습니다.');
      r.proposal = null; return r;
    }
    if (action === 'ready') { if (members(r).length < 2 || !me.connected) throw Error('2명 이상 연결되어야 준비할 수 있습니다.'); me.ready = !!value; me.vote = ''; return r; }
    if (action === 'team') {
      if (r.proposal) throw Error('시작 여부 확인 중에는 팀을 바꿀 수 없습니다.');
      if (![1, 2].includes(value) || members(r).filter(p => p.id !== id && p.team === value).length >= 4) throw Error('이 팀은 정원이 찼습니다.');
      me.team = value; me.ready = false; me.vote = ''; return r;
    }
    if (action === 'propose') {
      if (!ready(r) || r.proposal) throw Error('전원이 준비해야 시작을 제안할 수 있습니다.');
      r.proposal = { id: value, by: id, until: now + 20000, roster: Object.keys(r.members).sort().join(',') };
      me.vote = value; return r;
    }
    if (action === 'vote') {
      if (!r.proposal || r.proposal.until < now || !ready(r)) throw Error('만료된 시작 요청입니다.');
      me.vote = value ? r.proposal.id : 'no'; return r;
    }
    if (action === 'start') {
      if (id !== r.host || !ready(r) || !r.proposal || r.proposal.until < now || r.proposal.roster !== Object.keys(r.members).sort().join(',') || !members(r).every(p => p.vote === r.proposal.id)) throw Error('모든 참가자의 수락이 필요합니다.');
      r.status = 'playing'; r.session = { id: r.proposal.id, seed: value >>> 0, starts: now + 3000, count: members(r).length }; return r;
    }
    throw Error('지원하지 않는 대기실 동작입니다.');
  }
  window.IronLobbyPolicy = Object.freeze({ VERSION, LEASE, members, live, ready, create, change });
})();
