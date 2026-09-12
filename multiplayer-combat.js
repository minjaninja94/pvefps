// Installed inside game.js via a narrow adapter; singleton owns only multiplayer state.
// Fixed 60 Hz movement, 20 Hz snapshots, client prediction and authoritative host combat.
(() => {
  window.createIronMultiplayerCombat = function (A) {
    const net=window.IronMultiplayer, $=id=>document.getElementById(id), STEP=1/60;
    const M={active:false,starting:null,players:new Map(),context:null,actions:[],acc:0,snapshotClock:0,tick:0,seq:0,pending:[],history:[],teams:[0,0],done:false};
    const copy=x=>JSON.parse(JSON.stringify(x));
    const finite=v=>typeof v==='number'&&Number.isFinite(v);
    const alive=()=>[...M.players.values()].filter(p=>p.hp>0&&p.connected);
    const self=()=>M.players.get(net.uid);
    const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
    const direction=p=>[-Math.sin(p.yaw)*Math.cos(p.pitch),Math.sin(p.pitch),-Math.cos(p.yaw)*Math.cos(p.pitch)];
    const member=(id,p,i)=>({id,name:p.name,team:p.team,p:[(i%4-1.5)*2,1.7,19],yaw:0,pitch:0,jumpV:0,hp:100,shield:20,shieldTimer:0,weapon:0,ammo:[30,12,0,8],rpg:0,grenades:0,reload:0,cooldown:0,melee:0,grenadeDelay:0,kills:0,deaths:0,respawn:0,invuln:0,connected:true,ack:0,queue:[],input:{},budget:0,history:[],fireAnim:0});
    function withPlayer(p,fn){const prev=M.context;M.context=p;try{return A.withView(p,fn);}finally{M.context=prev;}}
    function target(e){const live=alive();return live.sort((a,b)=>dist(a.p,e.p)-dist(b.p,e.p))[0];}
    function enemyTarget(e,fn){const p=target(e);if(p)return withPlayer(p,fn);}
    function damage(p,amount,source,attacker=null){
      if(!net.host||!p||p.hp<=0||M.done||p.invuln>0||!finite(amount))return;
      if(attacker&&attacker!==p&&attacker.team===p.team&&M.mode==='pvp')return;
      if(attacker&&attacker!==p&&M.mode==='coop')return;
      p.shieldTimer=0;const absorb=Math.min(p.shield,amount);p.shield-=absorb;p.hp=Math.max(0,p.hp-(amount-absorb));p.invuln=.001;
      event({kind:'hurt',id:p.id,source,amount});
      if(p.hp<=0){p.deaths++;p.respawn=M.mode==='pvp'?3:0;p.input={};p.queue=[];if(attacker&&attacker!==p&&attacker.team!==p.team&&M.mode==='pvp'){attacker.kills++;M.teams[attacker.team-1]++;}event({kind:'kill',name:p.name,by:attacker?.name||'적'});if(M.teams.some(n=>n>=30))finish(M.teams[0]>=30?1:2);}
    }
    function event(data){const packet={type:'combat',data};net.broadcast(packet);effect(data);}
    function effect(e){if(e.kind==='hurt'&&e.id===net.uid)A.hurt(e.source);if(e.kind==='shot'){A.shotEffect({...e,silent:!net.host&&e.id===net.uid});const p=M.players.get(e.id);if(p)p.fireAnim=.12;}if(e.kind==='blast')A.blastEffect(e);if(e.kind==='kill')A.announce(e.by+' → '+e.name,2);}
    function spawnPlayer(p){
      const others=[...M.players.values()].filter(x=>x.team!==p.team&&x.hp>0);
      const candidates=(p.team===1?[[-13,1.7,24],[0,1.7,25],[13,1.7,24]]:[[-13,1.7,-24],[0,1.7,-25],[13,1.7,-24]]);
      p.p=copy(candidates.sort((a,b)=>Math.min(...others.map(o=>dist(b,o.p)),100)-Math.min(...others.map(o=>dist(a,o.p)),100))[0]);
      p.yaw=p.team===1?0:Math.PI;p.pitch=0;p.jumpV=0;p.hp=100;p.shield=20;p.invuln=2;p.shieldTimer=0;p.ammo=[30,12,0,8];p.rpg=p.grenades=0;p.reload=p.cooldown=0;p.queue=[];p.history=[];if(p.id===net.uid)A.setCamera(p);
    }
    function validInput(i){return i&&Number.isSafeInteger(i.seq)&&i.seq>0&&finite(i.yaw)&&Math.abs(i.yaw)<1e6&&finite(i.pitch)&&Math.abs(i.pitch)<=1.36&&finite(i.fw)&&Math.abs(i.fw)<=1&&finite(i.rt)&&Math.abs(i.rt)<=1&&Number.isInteger(i.weapon)&&i.weapon>=0&&i.weapon<4&&(!i.actions||Array.isArray(i.actions)&&i.actions.length<=4&&i.actions.every(a=>['reload','punch','grenade'].includes(a)));}
    function movement(p,i){
      if(p.hp<=0)return;
      p.yaw=i.yaw;p.pitch=i.pitch;p.sprint=!!i.sprint&&Math.hypot(i.fw,i.rt)>.1;p.aim=!!i.aim&&!p.sprint;
      const speed=p.sprint?32:5.8*(p.aim?.57:1),l=Math.max(1,Math.hypot(i.fw,i.rt));
      A.move(p.p,(-Math.sin(p.yaw)*i.fw+Math.cos(p.yaw)*i.rt)*speed*STEP/l,(-Math.cos(p.yaw)*i.fw-Math.sin(p.yaw)*i.rt)*speed*STEP/l,.35);
      if(i.jump&&p.p[1]<=1.71)p.jumpV=6;
      if(p.p[1]>1.7||p.jumpV>0){p.jumpV-=15*STEP;p.p[1]+=p.jumpV*STEP;if(p.p[1]<1.7){p.p[1]=1.7;p.jumpV=0;}}
    }
    function inputFrame(){const i=A.input();i.seq=++M.seq;i.actions=M.actions.splice(0,4);return i;}
    function request(action){if(M.active&&!M.done&&self()?.hp>0&&M.actions.length<4)M.actions.push(action);}
    function switchTo(n){if(M.active){M.weapon=n;return true;}return false;}
    function hostInput(p,i){if(p.hp<=0)return;movement(p,i);p.ack=i.seq;p.input=i;if(p.weapon!==i.weapon){p.weapon=i.weapon;p.reload=0;p.cooldown=Math.max(p.cooldown,.25);}for(const a of i.actions||[])action(p,a);}
    function action(p,kind){
      const w=A.weapons[p.weapon];if(p.hp<=0||M.done)return;
      if(kind==='reload'){if(p.weapon!==2&&!p.reload&&p.ammo[p.weapon]<w.capacity)p.reload=w.reload;return;}
      if(kind==='grenade'){if(p.grenades<=0||p.grenadeDelay>0)return;p.grenades--;p.grenadeDelay=.65;withPlayer(p,()=>{const b=A.makeGrenade();b.shooter=p.id;A.ordnance.push(b);});event({kind:'shot',id:p.id,weapon:2,origin:p.p,dir:direction(p),range:1});return;}
      if(kind==='punch'){if(p.melee>0)return;p.melee=.65;const h=hit(p,direction(p),2.4);if(h.player)damage(h.player,65,p.p,p);else if(h.obj?.e)withPlayer(p,()=>A.applyDamage(h.obj,65));event({kind:'shot',id:p.id,weapon:-1,origin:p.p,dir:direction(p),range:h.t});return;}
      if(kind!=='shoot'||p.sprint||p.cooldown>0||p.reload>0)return;
      const ammunition=p.weapon===2?p.rpg:p.ammo[p.weapon];if(ammunition<=0){action(p,'reload');return;}
      if(p.weapon===2)p.rpg--;else p.ammo[p.weapon]--;p.cooldown=w.delay;p.invuln=0;
      if(p.weapon===2){withPlayer(p,()=>{const b=A.makeRocket();b.shooter=p.id;A.ordnance.push(b);});event({kind:'shot',id:p.id,weapon:p.weapon,origin:p.p,dir:direction(p),range:1});return;}
      const d=direction(p),right=[Math.cos(p.yaw),0,-Math.sin(p.yaw)];let first=null,landed=false;
      for(let i=0;i<(p.weapon===3?9:1);i++){
        landed=false;
        const spread=p.weapon===3?(i-4)/4*(p.aim?.08:.13):(Math.random()-.5)*(p.aim?.0018:.009),ray=A.norm(d.map((v,j)=>v+right[j]*spread));
        const h=hit(p,ray,p.weapon===3?24:100);first ||= h;
        const amount=p.weapon===3?A.shotgunDamage(h.t,!!h.obj?.e?.type.melee):w.damage;
        if(h.player){const before=h.player.hp+h.player.shield;damage(h.player,amount*(h.head?1.3:1),p.p,p);landed=h.player.hp+h.player.shield<before;}
        else if(h.obj?.e){const before=h.obj.hp;withPlayer(p,()=>A.applyDamage(h.obj,amount*(h.obj.name==='머리'?1.3:1)));landed=h.obj.hp<before;}
        event({kind:'shot',id:p.id,weapon:p.weapon,origin:[...p.p],dir:ray,range:h.t,pellet:i>0,hit:landed,target:landed&&h.obj?.e?{enemy:h.obj.e.netId,part:h.obj.name}:null});
      }
    }
    function hit(p,d,max){
      const wall=A.trace(p.p,d,M.mode==='coop',max);let result={...wall};
      if(M.mode==='pvp')for(const other of alive())if(other.id!==p.id&&other.team!==p.team){
        // Rewind targets by at most 150ms of measured one-way latency.
        const rewind=Math.min(.15,(net.peers.get(p.id)?.rtt||0)/2000),at=M.time-rewind;
        const sample=[...other.history].reverse().find(s=>s.t<=at);const q=sample?.p||other.p;
        const body={p:[q[0],q[1]-.65,q[2]],s:[.65,1.3,.5]},head={p:[q[0],q[1]+.03,q[2]],s:[.36,.4,.36]};
        for(const [b,isHead]of [[body,false],[head,true]]){const t=A.rayBox(p.p,d,b);if(t!==null&&t<result.t)result={t,player:other,head:isHead,obj:null};}
      }
      return result;
    }
    function explosion(point,amount,radius,shooterId){
      const shooter=M.players.get(shooterId);if(!net.host)return;
      if(M.mode==='coop')withPlayer(shooter||self(),()=>A.playerExplosion(point,amount,radius));
      for(const p of alive()){if(p!==shooter&&(M.mode==='coop'||p.team===shooter?.team))continue;const distance=dist(point,p.p);if(distance<radius&&A.lineOfSight(point,p.p))damage(p,p===shooter?Math.min(55,amount*.12)*(1-distance/radius):amount*(1-.65*distance/radius),point,shooter);}
      event({kind:'blast',point, radius});
    }
    function enemyExplosion(b,point){for(const p of alive()){const d=dist(p.p,point);if(d<3.2&&A.lineOfSight(point,p.p))damage(p,b.damage*(1-d/4.5),b.source);}event({kind:'blast',point,radius:3.2});}
    function projectiles(dt){
      for(let i=A.bolts.length-1;i>=0;i--){const b=A.bolts[i],p=M.players.get(b.target)||target({p:b.p});
        if(b.kind==='missile'&&p){b.age=(b.age||0)+dt;const q=b.age<(b.arcTime??.65)?[p.p[0],p.p[1]+(b.targetLift??4.3),p.p[2]]:p.p,d=A.norm(q.map((v,j)=>v-b.p[j])),old=A.norm(b.v),turn=Math.min(1,dt*(b.turnRate??2.4));b.v=A.norm(old.map((v,j)=>v*(1-turn)+d[j]*turn)).map(v=>v*(b.speed||22));}
        const speed=Math.hypot(...b.v),d=A.norm(b.v),travel=speed*dt,wall=A.projectileWall(b.p,d,travel+.001,b.radius||0);let struck=null,t=wall.obj?wall.t:travel+.001;
        for(const p of alive()){const r=b.radius||0,q=A.rayBox(b.p,d,{p:[p.p[0],p.p[1]-.45,p.p[2]],s:[.7+r*2,1.25+r*2,.7+r*2]});if(q!==null&&q<t&&q<=travel){t=q;struck=p;}}
        const point=b.p.map((v,j)=>v+d[j]*Math.min(t,travel));b.life-=dt;
        if(struck||wall.obj||b.life<=0){if(b.kind==='missile')enemyExplosion(b,point);else if(struck)damage(struck,b.damage,b.source);A.bolts.splice(i,1);}else b.p=point;
      }
      for(let i=A.ordnance.length-1;i>=0;i--){const b=A.ordnance[i];let end=A.stepOrdnance(b,dt);if(!end&&b.kind==='rocket'&&M.mode==='pvp'){const shooter=M.players.get(b.shooter);for(const p of alive())if(p.id!==b.shooter&&p.team!==shooter?.team&&dist(p.p,b.p)<.9)end=true;}
        if(end){explosion(b.p,b.damage,b.radius,b.shooter);A.ordnance.splice(i,1);}
      }
    }
    function bossAttacks(dt){
      for(let i=A.scheduled.length-1;i>=0;i--){const s=A.scheduled[i];s.delay-=dt;if(s.owner.dead){A.scheduled.splice(i,1);continue;}if(s.delay<=0){enemyTarget(s.owner,s.fn);A.scheduled.splice(i,1);}}
      for(let i=A.sweeps.length-1;i>=0;i--){const s=A.sweeps[i],e=s.owner;s.life-=dt;e.angle+=dt*7;s.ticks ||= {};for(const p of alive()){s.ticks[p.id]=(s.ticks[p.id]||0)-dt;if(!e.dead&&s.ticks[p.id]<=0&&Math.hypot(p.p[0]-e.p[0],p.p[2]-e.p[2])<A.sweepRadius(e)&&A.lineOfSight([e.p[0],1.2,e.p[2]],p.p)){damage(p,e.final?35:25,e.p);s.ticks[p.id]=e.final?.4:.65;}}if(e.dead||s.life<=0)A.sweeps.splice(i,1);}
      for(let i=A.lasers.length-1;i>=0;i--){const l=A.lasers[i];if(l.owner.dead||!A.activeParts(l.owner,l.mouth?'머리':'가슴 코어').length){A.lasers.splice(i,1);continue;}l.life-=dt;l.age+=dt;l.tick-=dt;if(l.tick<=0){const {origin,dir,length}=A.beamData(l);for(const p of alive()){const delta=p.p.map((v,j)=>v-origin[j]),along=A.dot(delta,dir),off=Math.hypot(...delta.map((v,j)=>v-dir[j]*along));if(along>0&&along<length&&off<(l.mouth?.5:1.45)&&A.lineOfSight(origin,p.p))damage(p,7,l.owner.p);}l.tick=.18;}if(l.life<=0)A.lasers.splice(i,1);}
      for(let i=A.shockwaves.length-1;i>=0;i--){const s=A.shockwaves[i],before=s.r||0;s.r=before+s.speed*dt;s.hitIds ||= [];for(const p of alive()){const d=Math.hypot(p.p[0]-s.p[0],p.p[2]-s.p[2]);if(!s.hitIds.includes(p.id)&&d>=before-.6&&d<=Math.min(s.radius,s.r)+.6&&p.p[1]<2.65&&A.lineOfSight([s.p[0],.6,s.p[2]],p.p)){damage(p,s.damage,s.p);s.hitIds.push(p.id);}}if(s.r>=s.radius)A.shockwaves.splice(i,1);}
    }
    function pickups(){for(let i=A.pickups.length-1;i>=0;i--){const item=A.pickups[i];for(const p of alive()){const can=item.kind==='rpg'?p.rpg<5:item.kind==='grenade'?p.grenades<4:p.hp<100;if(can&&dist([p.p[0],.45,p.p[2]],item.p)<1.25&&A.lineOfSight(p.p,item.p)){if(item.kind==='rpg')p.rpg++;else if(item.kind==='grenade')p.grenades++;else p.hp=Math.min(100,p.hp+item.heal);A.pickups.splice(i,1);break;}}}}
    function simulate(){
      M.time+=STEP;M.tick++;
      for(const p of M.players.values()){
        for(const k of ['cooldown','melee','grenadeDelay','invuln','fireAnim'])p[k]=Math.max(0,p[k]-STEP);
        if(p.hp<=0){if(M.mode==='pvp'&&p.connected){p.respawn-=STEP;if(p.respawn<=0)spawnPlayer(p);}continue;}
        p.shieldTimer+=STEP;if(p.shieldTimer>=6)p.shield=20;
        if(p.reload>0){p.reload-=STEP;if(p.reload<=0){p.reload=0;p.ammo[p.weapon]=A.weapons[p.weapon].capacity;}}
        p.budget=Math.min(.15,p.budget+STEP);
        while(p.queue.length&&p.budget>=STEP){const input=p.queue.shift();hostInput(p,input);p.budget-=STEP;}
        if(p.input.fire&&(p.weapon===0||!p.wasFire))action(p,'shoot');p.wasFire=!!p.input.fire;
        p.history.push({t:M.time,p:[...p.p]});if(p.history.length>20)p.history.shift();
      }
      if(M.mode==='coop'){
        A.spawnStep(STEP);
        for(const e of A.enemies){if(e.dead)continue;if(!e.mpScaled){e.mpScaled=true;e.netId=++M.enemyId;e.hp*=M.count;e.max*=M.count;for(const p of e.parts){p.hp*=M.count;p.max*=M.count;}}
          e.attackAnim=Math.max(0,(e.attackAnim||0)-STEP);if(e.dropping){e.p[1]=Math.max(0,e.p[1]-28*STEP);if(!e.p[1])e.dropping=false;continue;}enemyTarget(e,()=>e.boss?A.updateBoss(e,STEP):A.updateEnemy(e,STEP));}
        bossAttacks(STEP);
      }
      projectiles(STEP);pickups();
      if(M.mode==='coop'){
        const lead=alive().sort((a,b)=>a.p[2]-b.p[2])[0];if(!lead){finish(0);return;}
        const old=A.get().wave;withPlayer(lead,()=>A.advanceSector(STEP));const state=A.get();
        if(state.wave!==old){for(const p of M.players.values())if(p.connected){if(p.hp<=0){p.hp=100;p.shield=20;}p.p[2]=Math.min(p.p[2],-60*(state.wave-1)+27);p.p[0]=Math.max(-3,Math.min(3,p.p[0]));p.p[1]=1.7;p.jumpV=0;p.ammo=[30,12,0,8];p.reload=0;}}
      }else if(M.tick%900===0&&A.pickups.length<12){for(const z of [-8,8])A.pickups.push({kind:'rpg',p:[9,.45,z],amount:1},{kind:'grenade',p:[-9,.45,z],amount:1});}
    }
    const enemyKeys=['boss','final','type','typeIndex','variant','p','hp','max','scale','angle','age','phase','gait','dead','dropping','attackAnim','warning','windup','attackName','aerial','landingWarning','landingPoint','sweepDelay','charge','laserGuide','slam','tentacleWindup','kick','netId'];
    function enemyDTO(e){const o={};for(const k of enemyKeys)if(e[k]!==undefined)o[k]=e[k];o.parts=e.parts.map(p=>({name:p.name,hp:p.hp,max:p.max,local:p.local,s:p.s,c:p.c,shield:!!p.shield,drone:!!p.drone,noScore:!!p.noScore,destroyed:!!p.destroyed}));return o;}
    function snapshots(){
      const players=[...M.players.values()].map(p=>{const {queue,input,budget,history,...wire}=p;return wire;});
      const ownerList=arr=>arr.map(x=>{const {owner,...rest}=x;return {...rest,owner:owner?.netId};});
      net.broadcast({type:'snapshot',tick:M.tick,time:M.time,players,teams:M.teams,game:A.stageState(),enemies:A.enemies.filter(e=>!e.dead).map(enemyDTO),bolts:A.bolts,ordnance:A.ordnance.map(b=>{const {preview,previewAt,...wire}=b;return wire;}),pickups:A.pickups,lasers:ownerList(A.lasers),sweeps:ownerList(A.sweeps),shockwaves:ownerList(A.shockwaves)},true);
    }
    function receive(from,data){
      if(!M.active)return;
      if(net.host){if(data.type!=='input'||!Array.isArray(data.frames)||data.frames.length>12)return;const p=M.players.get(from);if(!p||!p.connected)return;for(const i of data.frames){if(!validInput(i)||i.seq<=Math.max(p.ack,p.queue.at(-1)?.seq||0))continue;if(p.hp<=0){p.ack=i.seq;continue;}p.queue.push(i);}if(p.queue.length>120)p.queue.splice(0,p.queue.length-120);return;}
      if(from!==net.room?.host)return;
      if(data.type==='combat'){effect(data.data);return;}
      if(data.type==='result'){finishLocal(data.winner);return;}
      if(data.type!=='snapshot'||!Number.isInteger(data.tick)||data.tick<=(M.lastSnapshot||-1)||!Array.isArray(data.players)||data.players.length>8||!Array.isArray(data.enemies)||data.enemies.length>100)return;
      M.lastSnapshot=data.tick;M.time=data.time;M.teams=data.teams;M.history.push({at:performance.now(),players:data.players});if(M.history.length>4)M.history.shift();
      for(const wire of data.players){const p=M.players.get(wire.id);if(!p)continue;const oldP=p.p,respawned=p.hp<=0&&wire.hp>0;Object.assign(p,wire);if(p.id===net.uid){if(respawned){M.pending=[];A.setCamera(p);}M.pending=M.pending.filter(i=>i.seq>p.ack);for(const input of M.pending)movement(p,input);if(dist(oldP,p.p)<.03)p.p=oldP;}}
      const list=data.enemies.map(w=>{const old=A.enemies.find(x=>x.netId===w.netId),e={...w};e.parts=w.parts.map(p=>({...p,p:p.local,e,hitFlashUntil:old?.parts.find(q=>q.name===p.name)?.hitFlashUntil||0}));return e;});A.replaceEnemies(list);const lookup=id=>list.find(e=>e.netId===id);
      for(const [key,target]of [['bolts',A.bolts],['ordnance',A.ordnance],['pickups',A.pickups]]){target.splice(0,target.length,...data[key]);}
      for(const [key,target]of [['lasers',A.lasers],['sweeps',A.sweeps],['shockwaves',A.shockwaves]])target.splice(0,target.length,...data[key].map(x=>({...x,owner:lookup(x.owner)})).filter(x=>x.owner||key==='shockwaves'));
      A.setStage(data.game);A.syncSelf(self());
    }
    function finish(winner){if(M.done)return;M.done=true;net.broadcast({type:'result',winner});finishLocal(winner);}
    function finishLocal(winner){M.done=true;A.result(M.mode==='pvp'?'팀 '+winner+' 승리':winner?'협력 작전 완료':'협력 작전 실패',M.mode==='pvp'?'BLUE '+M.teams[0]+' : '+M.teams[1]+' RED':'스테이지 '+A.get().wave+' · '+Math.floor(M.time)+'초',[...M.players.values()]);}
    async function begin(room){
      M.starting=room;M.mode=room.mode;M.count=room.session.count;M.players.clear();PReset();
      Object.entries(room.members).forEach(([id,p],i)=>M.players.set(id,member(id,p,i)));
      await A.begin(room);M.active=true;M.starting=null;M.wait=Math.max(0,(room.session.starts-Date.now())/1000);M.weapon=0;
      if(M.mode==='pvp')for(const p of M.players.values())spawnPlayer(p);
      A.syncSelf(self());A.setCamera(self());$('mpscore')?.classList.remove('hidden');
    }
    function PReset(){Object.assign(M,{acc:0,tick:0,time:0,seq:0,pending:[],outbox:[],actions:[],history:[],teams:[0,0],enemyId:0,done:false,snapshotClock:0,lastSnapshot:-1,localFireClock:0});}
    function end(){if(!M.active&&!M.starting)return;M.active=false;M.starting=null;M.players.clear();A.restoreWorld();$('mpscore')?.classList.add('hidden');$('mpspectate')?.classList.add('hidden');$('mpnames')?.replaceChildren();net.leave();}
    function update(dt){
      if(!M.active)return false;if(M.done){A.visualStep(dt);return true;}
      if(M.wait>0){M.wait-=dt;$('mpmatchscore').textContent='시작까지 '+Math.max(1,Math.ceil(M.wait));return true;}
      M.acc=Math.min(.1,M.acc+dt);
      while(M.acc>=STEP){M.acc-=STEP;const p=self(),input=inputFrame();input.weapon=M.weapon;
        M.localFireClock=Math.max(0,M.localFireClock-STEP);
        if(!net.host&&p.hp>0&&input.fire&&!input.sprint&&!p.reload&&M.localFireClock<=0&&(M.weapon===0||!M.wasFire)&&(M.weapon===2?p.rpg:p.ammo[M.weapon])>0){M.localFireClock=A.weapons[M.weapon].delay;A.shotEffect({kind:'shot',id:net.uid,weapon:M.weapon,origin:p.p,dir:direction({...p,yaw:input.yaw,pitch:input.pitch}),range:1});}
        M.wasFire=!!input.fire;
        if(p.hp>0){if(net.host){hostInput(p,input);p.budget=0;}else{movement(p,input);M.pending.push(input);if(M.pending.length>180){A.announce('호스트 응답을 기다리고 있습니다',1);M.pending.shift();}}}
        if(!net.host){M.outbox ||= [];M.outbox.push(input);if(M.outbox.length>=3){net.send(net.room.host,{type:'input',frames:M.outbox});M.outbox=[];}}
        if(net.host)simulate();
      }
      M.snapshotClock+=dt;if(net.host&&M.snapshotClock>=.05){M.snapshotClock=0;snapshots();}
      A.syncSelf(self());const dead=self().hp<=0;M.spectated=dead&&M.mode==='coop'?alive()[0]?.id:null;if(M.spectated)A.spectate(M.players.get(M.spectated));A.visualStep(dt);hud();return true;
    }
    function hud(){const p=self();if(!p)return;const ping=net.host?'HOST':Math.round(net.peers.get(net.room?.host)?.rtt||0)+'ms';$('mpmatchscore').textContent=M.mode==='pvp'?'BLUE '+M.teams[0]+' / 30 : '+M.teams[1]+' RED':'CO-OP · '+alive().length+'/'+M.count+'명 · 적 HP ×'+M.count;$('mpmatchstatus').textContent=ping+' · '+(M.mode==='pvp'?'나 '+p.kills+'킬 / '+p.deaths+'데스':'스테이지 '+A.get().wave+' / 10');$('mpspectate').classList.toggle('hidden',p.hp>0);$('mpspectate').textContent=p.hp>0?'':M.mode==='pvp'?Math.max(1,Math.ceil(p.respawn))+'초 후 재출전':'관전 중 · 다음 스테이지에서 부활';}
    function draw(time){if(!M.active)return;A.beforeHumans();const local=self();for(const p of M.players.values()){if(p.id===net.uid||p.id===M.spectated||p.hp<=0||!p.connected)continue;let position=p.p;if(!net.host&&M.history.length>=2){const recent=M.history.at(-1),old=M.history.at(-2),a=old.players.find(x=>x.id===p.id),b=recent.players.find(x=>x.id===p.id);if(a&&b){const t=Math.max(0,Math.min(1,(performance.now()-recent.at)/50));position=a.p.map((v,i)=>v+(b.p[i]-v)*t);}}A.drawHuman({...p,p:position},time,M.mode==='coop'||p.team===local?.team);}}
    net?.on('start',r=>begin(r).catch(e=>{end();net.fail(e);}));net?.on('packet',({from,data})=>receive(from,data));
    net?.on('disconnect',id=>{if(!M.active)return;if(!net.host){net.connectionLost('호스트와 연결이 끊어져 경기를 종료했습니다.');return;}const p=M.players.get(id);if(p){p.connected=false;p.hp=0;p.queue=[];p.input={};A.announce(p.name+'님 연결 종료',4);}});
    net?.on('ended',()=>{end();A.menu();});
    return Object.assign(M,{update,draw,request,switchTo,damage,enemyTarget,target,withPlayer,explosion,begin,end,self,receive,simulate,finish,validInput,movement,spawnPlayer,action,hit});
  };
})();
