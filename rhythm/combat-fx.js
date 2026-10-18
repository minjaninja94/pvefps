/* Combat choreography is cosmetic: music clock and rhythm input never freeze. */
(()=>{'use strict';
const clamp=n=>Math.max(0,Math.min(1,n));
function motion(age,finisher=false){const wind=clamp(age/.18),dash=clamp((age-.18)/.18),back=clamp((age-.48)/.6);return {reach:age<.18?-14*wind:age<.36?(-14+150*dash):150*(1-back),strike:age>=.28&&age<.52?Math.sin((age-.28)/.24*Math.PI):0,hit:age>=.34?Math.max(0,1-(age-.34)/.65):0,flash:age>=.34&&age<.42?1:0,super:finisher}}
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
window.NeonCombatFX=Object.freeze({motion,draw,sound});
})();
