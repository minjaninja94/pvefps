/* Cosmetic victory sequence; outcome and HP are locked before this starts. */
(()=>{'use strict';
const DURATION=20,CUES=[0,2.2,3.4,4.6,6.2,7.4,8.6,10,13.2,14,17.3];
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const TYPES={blade:{name:'천공 단절',color:'#8efaff'},claw:{name:'천뢰 연격',color:'#ffb36b'},spell:{name:'성광 추방',color:'#d5a0ff'}};
function sample(age=0,weapon='blade',winner='player'){
 const t=clamp(Number.isFinite(age)?age:0,0,DURATION),type=TYPES[weapon]?weapon:'blade',dir=winner==='bot'?-1:1;
 let hero={x:420,y:552,rotation:0,scale:1.2,action:'idle',actionTime:0},foe={x:775,y:552,rotation:0,scale:1.16,action:'hit',actionTime:.52};
 let phase='도전의 끝',impact=0,charge=0,launch=0;
 if(t>=2&&t<6){phase=type==='blade'?'삼연 참격':type==='claw'?'돌진 연격':'마력 구속';const q=(t-2)%1.2;hero.x=420+smooth(q/.24)*165*(1-smooth((q-.55)/.5));hero.action='attack';hero.actionTime=q;foe.actionTime=Math.max(0,q-.28);foe.x+=Math.sin(q*20)*Math.exp(-q*4)*16;impact=Math.max(0,1-Math.abs(q-.36)/.2)}
 if(t>=6&&t<10){phase=type==='blade'?'상승 베기':type==='claw'?'공중 난타':'중력 역전';const q=(t-6)%1.2;hero.x=555;hero.y=552-(type==='spell'?0:Math.sin(clamp((t-6)/4)*Math.PI)*105);hero.action='attack';hero.actionTime=q;foe.y=552-smooth((t-6)/1.2)*125+Math.sin(t*18)*8;foe.actionTime=Math.max(0,q-.25);foe.rotation=-.22;impact=Math.max(0,1-Math.abs(q-.36)/.2)}
 if(t>=10&&t<14){phase='최후의 일격';charge=smooth((t-10)/3.2);hero.x=490;hero.action='attack';hero.actionTime=.08;foe.y=427+Math.sin(t*4)*5;foe.rotation=-.28;foe.actionTime=.3}
 if(t>=14){phase=t<17.3?'장외 격파':'완전 승리';const q=t-14;launch=smooth(q/2.2);hero.x=490+smooth(q/.2)*130*(1-smooth((q-.6)/1.6));hero.action=q<1.1?'attack':'idle';hero.actionTime=q;foe.x=775+Math.pow(clamp(q/2),1.25)*1550;foe.y=427-520*clamp(q/2)+150*Math.pow(clamp(q/2),2);foe.rotation=q*7;foe.scale=1.16*(1-.3*clamp(q/2));foe.actionTime=.2;impact=Math.max(0,1-q/.65);charge=Math.max(0,1-q/1.2)}
 if(t>=17.3){hero.x=530;hero.scale=1.3;hero.action='idle';hero.actionTime=0}
 const mirror=a=>({...a,x:dir===1?a.x:1200-a.x,rotation:a.rotation*dir,facing:a===hero?dir:-dir});
 return {t,type,dir,phase,hero:mirror(hero),foe:mirror(foe),impact,charge,launch,done:t>=DURATION,color:TYPES[type].color,name:TYPES[type].name};
}
const actorCache=new WeakMap();
function actorSprite(profile,a,t,reduced,drawActor){
 let cache=actorCache.get(profile);if(!cache){cache=new Map();actorCache.set(profile,cache)}
 const tick=Math.floor(t*12)/12,actionTime=Math.floor(a.actionTime*12)/12,key=[a.facing,a.action,actionTime,tick,reduced].join(':');
 if(cache.has(key))return cache.get(key);
 const c=document.createElement('canvas');c.width=600;c.height=640;const ctx=c.getContext('2d');
 drawActor(ctx,300,600,profile,{facing:a.facing,scale:1,t:tick,action:a.action,actionTime,attack:a.action==='attack'?1:0,hit:a.action==='hit'?.8:0,super:true,reduced});
 cache.set(key,c);while(cache.size>4){const old=cache.keys().next().value,expired=cache.get(old);cache.delete(old);expired.width=expired.height=1}return c;
}
function draw(g,age,winner,loser,{weapon='blade',side='player',reduced=false}={},drawActor){
 const s=sample(age,weapon,side),{t,color:c}=s;
 g.save();g.fillStyle='#020611';g.fillRect(0,0,1200,700);
 const bg=g.createRadialGradient(600,330,30,600,330,660);bg.addColorStop(0,c+'45');bg.addColorStop(1,'#080d1e');g.fillStyle=bg;g.fillRect(0,0,1200,700);
 // Receding arena floor and hard boundary establish the ring-out direction.
 g.strokeStyle=c+'30';g.lineWidth=2;for(let i=0;i<13;i++){g.beginPath();g.moveTo(600,420);g.lineTo(i*140-240,650);g.stroke()}
 for(let i=0;i<5;i++){g.beginPath();g.moveTo(0,450+i*i*9);g.lineTo(1200,450+i*i*9);g.stroke()}
 const shake=!reduced?s.impact*9:0;g.save();g.translate(Math.sin(t*83)*shake,Math.cos(t*97)*shake*.5);
 // Establishing close-up, then pull back to show the entire launch trajectory.
 const zoom=reduced?1:t<2?1+Math.sin(t/2*Math.PI)*.14:t>=10&&t<14?1+s.charge*.08:1;
 g.translate(600,350);g.scale(zoom,zoom);g.translate(-600,-350);
 if(!reduced){g.strokeStyle=c+'28';g.lineWidth=2;for(let i=0;i<22;i++){const y=90+(i*37)%480,x=((i*113+t*(s.launch?900:100))%1500)-150;g.beginPath();g.moveTo(x,y);g.lineTo(x-70-s.launch*160,y);g.stroke()}}
 const actor=(p,a,ghost=0)=>{const sprite=actorSprite(p,a,t,reduced,drawActor);g.save();g.globalAlpha=ghost||1;g.translate(a.x,a.y);g.rotate(a.rotation);g.scale(a.scale,a.scale);g.drawImage(sprite,-300,-600);g.restore()};
 if(t>=14&&t<16&&!reduced){for(let i=3;i>0;i--){const old=sample(Math.max(14,t-i*.065),weapon,side);actor(loser,old.foe,.1*(4-i))}}
 if(t<16.5)actor(loser,s.foe);
 actor(winner,s.hero);
 g.save();g.translate(600,0);g.scale(s.dir,1);g.translate(-600,0);g.strokeStyle=c;g.fillStyle=c;g.shadowColor=c;g.shadowBlur=reduced?0:28;
 if(s.charge>0){
  const radius=38+s.charge*85;g.globalAlpha=.3+s.charge*.5;g.lineWidth=3;
  for(let i=0;i<3;i++){g.beginPath();g.ellipse(545,365,radius+i*18,radius*.5+i*12,t*(i%2?-.9:.7),0,Math.PI*2);g.stroke()}
 }
 if(s.impact>0){g.save();g.translate(0,t<14?s.foe.y-552:-125);g.globalAlpha=s.impact;
  if(s.type==='blade'){
   for(let i=0;i<(t>=14?5:2);i++){g.lineWidth=t>=14?14-i*2:7;g.beginPath();g.ellipse(710,345,110+i*28,155+i*12,-.65,-1.5,1.7);g.stroke()}
  }else if(s.type==='claw'){
   g.lineWidth=t>=14?12:6;for(let i=0;i<5;i++){g.beginPath();g.moveTo(610+i*18,245);g.lineTo(790+i*18,415);g.stroke()}
   for(let i=0;i<3;i++){g.beginPath();g.arc(780,350,38+i*29,0,Math.PI*2);g.stroke()}
  }else{
   const beam=t>=14?90:28;g.fillStyle=c+'77';g.fillRect(530,345-beam/2,650,beam);g.fillStyle='#fff';g.fillRect(530,340,650,10);g.beginPath();g.arc(775,345,80+s.impact*45,0,Math.PI*2);g.stroke()
  }
  if(!reduced){g.strokeStyle='#fff';g.lineWidth=3;for(let i=0;i<22;i++){const a=i*Math.PI/11,r=35+(1-s.impact)*190;g.beginPath();g.moveTo(775+Math.cos(a)*r,345+Math.sin(a)*r);g.lineTo(775+Math.cos(a)*(r+35),345+Math.sin(a)*(r+35));g.stroke()}}
  g.restore();
 }
 if(t>=15&&t<17.8){const q=clamp((t-15)/2.8);g.globalAlpha=1-q;g.lineWidth=5;g.strokeStyle=c;for(let i=0;i<14;i++){const a=i*Math.PI/7,r=40+q*230;g.beginPath();g.moveTo(1175,300);g.lineTo(1175+Math.cos(a)*r,300+Math.sin(a)*r);g.stroke()}}
 g.restore();g.restore();
 // Cinematic matte, attack name, and a final unmistakable ring-out card.
 g.fillStyle='#02040bef';g.fillRect(0,0,1200,64);g.fillRect(0,620,1200,80);g.textAlign='center';g.fillStyle=c;g.font='900 20px system-ui';g.fillText('VICTORY FINISH · '+TYPES[s.type].name,600,40);
 g.fillStyle='#fff';g.font='900 24px system-ui';g.fillText(s.phase,600,658);
 if(t<2||t>=17.3){const final=t>=17.3,cx=final?(s.dir===1?900:300):600,w=final?500:780,cy=final?275:210;
  g.fillStyle='#040915dc';g.fillRect(cx-w/2,cy-64,w,122);g.fillStyle=final?'#fff':c;g.font='italic 1000 '+(final?48:58)+'px system-ui';g.fillText(final?'RING OUT!':'FINAL ATTACK',cx,cy);g.fillStyle=c;g.font='800 21px system-ui';g.fillText((winner.name||'WINNER')+' · '+(final?'완전 승리':TYPES[s.type].name),cx,cy+35)}
 g.fillStyle='#ffffff44';g.fillRect(390,683,420,3);g.fillStyle=c;g.fillRect(390,683,420*t/DURATION,3);g.restore();return s;
}
function sound(ctx,weapon,heavy,volume){
 if(!ctx||ctx.state!=='running'||volume<=0)return [];
 const root=weapon==='spell'?523:weapon==='claw'?130:880,voices=[];
 for(let i=0;i<(heavy?3:1);i++){
  const at=ctx.currentTime+i*.045,osc=ctx.createOscillator(),gain=ctx.createGain(),duration=heavy?.65:.22;
  osc.type=weapon==='spell'?'triangle':weapon==='claw'?'sine':'sawtooth';osc.frequency.setValueAtTime(root*(i===1?1.5:i===2?2:1),at);osc.frequency.exponentialRampToValueAtTime(weapon==='spell'?130:35,at+duration);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume*(heavy?.16:.11),at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+duration+.02);osc.addEventListener('ended',()=>gain.disconnect(),{once:true});voices.push(osc);
 }
 return voices;
}
window.NeonFinisher=Object.freeze({DURATION,CUES,TYPES,sample,draw,sound});
})();
