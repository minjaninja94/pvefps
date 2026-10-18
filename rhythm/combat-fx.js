/* Combat choreography is cosmetic: music clock and rhythm input never freeze. */
(()=>{'use strict';
const clamp=n=>Math.max(0,Math.min(1,n));
function motion(age,finisher=false){const wind=clamp(age/.18),dash=clamp((age-.18)/.18),back=clamp((age-.48)/.6);return {reach:age<.18?-14*wind:age<.36?(-14+150*dash):150*(1-back),strike:age>=.28&&age<.52?Math.sin((age-.28)/.24*Math.PI):0,hit:age>=.34?Math.max(0,1-(age-.34)/.65):0,flash:age>=.34&&age<.42?1:0,super:finisher}}

const CLASH_DURATION=1.45;
const smooth=x=>{const p=clamp(x);return p*p*(3-2*p)};
function clashMotion(age,reduced=false){
 if(!Number.isFinite(age)||age<0||age>CLASH_DURATION)return {active:false,advance:0,poseTime:0,lock:0,contact:0,shake:0};
 const approach=smooth(age/.31);
 const retreat=smooth((age-1.01)/.35);
 const hold=smooth((age-.29)/.13)*(1-smooth((age-.96)/.28));
 const advance=(reduced?78:105)*approach*(1-retreat);
 const struggle=reduced?0:Math.sin((age-.37)*28)*hold*3.5;
 const poseTime=age<.32?age*.95:age<.98?.36+Math.sin((age-.37)*9)*.035:.36+(age-.98)*1.8;
 const contact=smooth((age-.29)/.13)*(1-smooth((age-1.08)/.26));
 return {active:true,advance,shove:struggle,poseTime,lock:hold,
  contact,impact:age>=.32&&age<.48?1:0,shake:reduced?0:Math.sin(age*100)*hold*2};
}
function clashWeapon(g,x0,y0,x1,y1,weapon,color){
 g.save();g.lineCap='round';g.lineJoin='round';g.shadowColor=color;g.shadowBlur=16;
 if(weapon==='spell'){
  g.strokeStyle=color;g.lineWidth=12;g.beginPath();g.moveTo(x0,y0);g.quadraticCurveTo((x0+x1)*.5,Math.min(y0,y1)-36,x1,y1);g.stroke();
  g.strokeStyle='#fff';g.lineWidth=3;g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(x1,y1,9,0,Math.PI*2);g.fill();
 }else if(weapon==='claw'){
  for(let k=-1;k<=1;k++){
   g.strokeStyle=color;g.lineWidth=5;g.beginPath();g.moveTo(x0,y0+k*9);g.lineTo(x1,y1+k*6);g.stroke();
   g.strokeStyle='#fff';g.lineWidth=1.5;g.stroke();
  }
 }else{
  g.strokeStyle='#13233e';g.lineWidth=15;g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();
  g.strokeStyle=color;g.lineWidth=8;g.stroke();g.strokeStyle='#fff';g.lineWidth=2.4;g.stroke();
  g.strokeStyle=color;g.lineWidth=6;g.beginPath();g.moveTo(x0-15,y0+4);g.lineTo(x0+15,y0-4);g.stroke();
 }
 g.restore();
}
function drawClash(g,age,leftWeapon='blade',rightWeapon='blade',reduced=false){
 const m=clashMotion(age,reduced);if(!m.active||m.contact<=0)return;
 const flash=smooth((age-.30)/.1)*(1-smooth((age-1.05)/.3));
 const x=600,y=326;
 g.save();g.globalAlpha=m.contact;
 if(!reduced){g.translate(m.shake*.3,-m.shake*.15)}
 const offset=m.shove*.7;
 // Two mirrored weapons physically meet at the same central lock point.
 clashWeapon(g,512+offset,390,656+offset,264,leftWeapon,'#91f5ff');
 clashWeapon(g,688-offset,390,544-offset,264,rightWeapon,'#ff99cd');
 g.save();g.globalAlpha=flash;
 g.shadowColor='#fff';g.shadowBlur=reduced?0:25;g.fillStyle='#fff';
 g.beginPath();g.arc(x,y,7+2*Math.sin(age*45),0,Math.PI*2);g.fill();
 g.strokeStyle='#ffe3a4';g.lineWidth=3.5;
 const count=reduced?4:12;
 for(let i=0;i<count;i++){
  const angle=i*Math.PI*2/count+age*1.4;
  const d=15+Math.max(0,age-.33)*20+(i%3)*5;
  g.beginPath();g.moveTo(x+Math.cos(angle)*d,y+Math.sin(angle)*d);
  g.lineTo(x+Math.cos(angle)*(d+12+m.lock*19),y+Math.sin(angle)*(d+12+m.lock*19));g.stroke();
 }
 g.restore();
 // Growing ring at the moment of the impact, with continuous restrained
 // energy while the two fighters push against each other.
 if(!reduced){
  g.save();g.globalAlpha=flash*.65;g.strokeStyle='#d8f6ff';g.lineWidth=4;
  g.beginPath();g.ellipse(x,y,18+m.lock*47,8+m.lock*34,-.25,0,Math.PI*2);g.stroke();g.restore();
 }
 g.restore();
}
function clashSound(ctx,volume=.6){
 if(!ctx||ctx.state!=='running'||volume<=0)return;
 const now=ctx.currentTime,master=ctx.createGain();master.gain.value=Math.min(1,volume)*.6;master.connect(ctx.destination);
 for(const [i,f] of [1230,930,1560].entries()){
  const osc=ctx.createOscillator(),amp=ctx.createGain(),at=now+i*.012;
  osc.type='triangle';osc.frequency.setValueAtTime(f,at);
  osc.frequency.exponentialRampToValueAtTime(f*.45,at+.24);
  amp.gain.setValueAtTime(.001,at);amp.gain.linearRampToValueAtTime(.14,at+.016);
  amp.gain.exponentialRampToValueAtTime(.001,at+.32);
  osc.connect(amp);amp.connect(master);osc.start(at);osc.stop(at+.34);
  osc.onended=()=>{osc.disconnect();amp.disconnect()};
 }
 // The host audio context owns all nodes; no external audio downloads.
 setTimeout(()=>{try{master.disconnect()}catch{}},450);
}

function draw(g,age,fx,weapon,reduce=false){
 if(age<0||age>1.3||fx.winner==='draw')return;
 const sign=fx.winner==='player'?1:-1,x=sign===1?702:498,y=330,c=sign===1?'#83f8ff':'#ffa0d6',p=clamp((age-.18)/.3),fade=Math.max(0,1-(age-.4)/.8);
 g.save();g.globalAlpha=fade;g.translate(600,0);g.scale(sign,1);g.translate(-600,0);g.strokeStyle=c;g.fillStyle=c;g.lineCap='round';g.shadowColor=c;g.shadowBlur=reduce?0:24;
 if(weapon==='spell'){
  const bx=470+230*p;g.beginPath();g.arc(bx,y,12+17*Math.sin(p*Math.PI),0,Math.PI*2);g.fill();
  if(age>.34){g.lineWidth=4;g.beginPath();g.arc(702,y,15+clamp((age-.34)/.65)*85,0,Math.PI*2);g.stroke()}
 }else if(weapon==='claw'){
  for(let i=0;i<3;i++){g.lineWidth=7;g.beginPath();g.moveTo(520+i*13,300+i*19);g.lineTo(695+i*13*p,340+i*19);g.stroke()}
 }else{
  g.lineWidth=fx.finisher?16:10;g.beginPath();g.ellipse(620,y,100+60*p,90,-.6,-1.3,1.6);g.stroke();g.lineWidth=3;g.strokeStyle='#fff';g.stroke();
 }
 if(age>.34&&age<1){g.translate(702,y);g.lineWidth=3;for(let i=0;i<10;i++){const a=i*Math.PI/5,r=20+(age-.34)*85;g.beginPath();g.moveTo(Math.cos(a)*r,Math.sin(a)*r);g.lineTo(Math.cos(a)*(r+20),Math.sin(a)*(r+20));g.stroke()}}
 g.restore();
 if(fx.finisher&&!reduce&&age<.55){g.save();g.globalAlpha=.14*fade;g.fillStyle=c;g.fillRect(330,120,540,400);g.restore()}
}
function sound(ctx,finisher=false,volume=.6){
 if(!ctx||ctx.state!=='running'||volume<=0)return;
 const t=ctx.currentTime,master=ctx.createGain();master.gain.value=volume;master.connect(ctx.destination);
 for(let i=0;i<(finisher?3:1);i++){
  const at=t+i*.075,o=ctx.createOscillator(),v=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(finisher?210:155,at);o.frequency.exponentialRampToValueAtTime(38,at+.17);v.gain.setValueAtTime(.36,at);v.gain.exponentialRampToValueAtTime(.001,at+.23);o.connect(v);v.connect(master);o.start(at);o.stop(at+.25);o.onended=()=>{o.disconnect();v.disconnect()};
 }
 const b=ctx.createBuffer(1,Math.round(ctx.sampleRate*.17),ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
 const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=b;gain.gain.setValueAtTime(.13,t);gain.gain.exponentialRampToValueAtTime(.001,t+.17);source.connect(gain);gain.connect(master);source.start(t);source.onended=()=>{source.disconnect();gain.disconnect();setTimeout(()=>master.disconnect(),300)};
}
window.NeonCombatFX=Object.freeze({motion,draw,sound,CLASH_DURATION,clashMotion,drawClash,clashSound});
})();
