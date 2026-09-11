(() => {
  const net=window.IronMultiplayer, P=window.IronLobbyPolicy, $=id=>document.getElementById(id);
  let kind='coop',pending=false,opened=false;
  const show=(id,visible)=>$(id).classList.toggle('hidden',!visible);
  const error=e=>$('mperror').textContent=typeof e==='string'?e:window.IronFirebase.message(e);
  async function act(fn){if(pending)return;pending=true;$('mpstatus').textContent='연결 중…';error('');try{await fn();}catch(e){error(e);}finally{pending=false;$('mpstatus').textContent='';draw();}}
  function button(text,fn,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=disabled;b.onclick=()=>act(fn);return b;}
  async function open(mode){kind=mode;opened=true;show('multiplayer',true);$('mptitle').textContent=mode==='coop'?'협력 작전':'팀 데스매치';show('mpdifficultywrap',mode==='coop');show('mpmatch',mode==='coop');show('mpcreate',mode==='pvp');$('mpname').value=sessionStorage.getItem('iron-mp-name')||'';draw();}
  async function identify(){sessionStorage.setItem('iron-mp-name',$('mpname').value);await net.connect($('mpname').value);}
  function draw(){
    if(!opened)return;
    const room=net.room;show('mpbrowser',!room);show('mplobby',!!room);show('mpvote',!!room?.proposal);
    const candidates=net.rooms.filter(r=>r.mode===kind&&r.lease>Date.now());
    $('mpwaiting').textContent='매칭 대기 '+candidates.reduce((n,r)=>n+P.live(r,Date.now()).length,0)+'명';
    if(!room){const list=$('mprooms');list.replaceChildren();for(const r of candidates){const row=document.createElement('div');row.className='mproom';const label=document.createElement('span');label.textContent=r.title+' · '+P.members(r).length+'/'+r.capacity+(r.mode==='coop'?' · '+['쉬움','중간','극한'][r.difficulty]:'');row.append(label,button('입장',async()=>{await identify();await net.join(r.id);},!!r.proposal||P.members(r).length>=r.capacity));list.append(row);}if(!candidates.length){const p=document.createElement('p');p.textContent='대기 중인 방이 없습니다. 매칭을 시작하거나 방을 만들어 주세요.';list.append(p);}return;}
    const people=P.members(room),me=room.members[net.uid];$('mpcode').textContent=net.id;$('mpcount').textContent=people.length+' / '+room.capacity+'명 · '+(room.mode==='coop'?'적 체력 ×'+people.length:'팀 합산 30킬 선취');
    const list=$('mpplayers');list.replaceChildren();for(const p of people){const row=document.createElement('div');row.className='mpplayer team'+p.team;const name=document.createElement('b');name.textContent=p.name+(p.id===net.uid?' (나)':'')+(p.id===room.host?' · HOST':'');const state=document.createElement('span');const ping=net.peers.get(p.id)?.rtt;state.textContent=(room.mode==='pvp'?'팀 '+p.team+' · ':'')+(p.ready?'준비 완료':p.connected?'연결 완료':'연결 중')+(ping!==null&&ping!==undefined?' · '+ping+'ms':'');row.append(name,state);list.append(row);}
    show('mpteams',room.mode==='pvp');for(const team of [1,2]){$('mpteam'+team).classList.toggle('active',me?.team===team);$('mpteam'+team).disabled=pending||!!room.proposal;}
    show('mpready',people.length>=2);$('mpready').textContent=me?.ready?'준비 취소':'준비';$('mpready').disabled=pending||!me?.connected||room.status!=='lobby';show('mppropose',P.ready(room)&&!room.proposal);$('mppropose').disabled=pending;
    if(room.proposal){const p=room.proposal,requester=room.members[p.by]?.name||'참가자';$('mpvotetext').textContent=requester+'님이 현재 '+people.length+'명으로 시작하자고 합니다. 수락하시겠습니까?';$('mpvotetime').textContent=P.members(room).filter(m=>m.vote===p.id).length+'/'+people.length+'명 수락 · '+Math.max(0,Math.ceil((p.until-Date.now())/1000))+'초';$('mpyes').disabled=pending||me?.vote===p.id;$('mpno').disabled=pending;}
  }
  $('opencoop').onclick=()=>open('coop');$('openpvp').onclick=()=>open('pvp');
  $('mpmatch').onclick=()=>act(async()=>{await identify();await net.match(Number($('mpdifficulty').value));});
  $('mpcreate').onclick=()=>act(async()=>{await identify();await net.create('pvp',1,$('mproomname').value.trim());});
  $('mprefresh').onclick=()=>act(async()=>{await identify();net.closeList();net.watchList();});
  $('mpjoin').onclick=()=>act(async()=>{await identify();await net.join($('mpjoincode').value);});
  $('mpready').onclick=()=>act(()=>net.mutate('ready',!net.room.members[net.uid].ready));
  $('mppropose').onclick=()=>act(()=>net.mutate('propose',crypto.randomUUID()));
  $('mpyes').onclick=()=>act(()=>net.mutate('vote',true));$('mpno').onclick=()=>act(()=>net.mutate('vote',false));
  for(const team of [1,2])$('mpteam'+team).onclick=()=>act(()=>net.mutate('team',team));
  $('mpleave').onclick=()=>act(()=>net.leave());
  $('mpclose').onclick=()=>act(async()=>{await net.leave();net.closeList();opened=false;show('multiplayer',false);});
  net.on('rooms',draw);net.on('room',draw);net.on('ping',draw);net.on('clock',draw);net.on('error',error);
  net.on('start',()=>{opened=false;show('multiplayer',false);net.closeList();});
  net.on('ended',reason=>{opened=true;show('multiplayer',true);error(reason);draw();});
})();
