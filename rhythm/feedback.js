'use strict';
(()=>{
const COLORS=['#ff4b68','#35cafa','#39ed8a','#af70ff'];
const GRADES={perfect:'#7dffff',great:'#ffe783',good:'#c9adff',miss:'#ff6889',hold:'#8affc9'};
function create(){
 const states={player:null,bot:null};
 return {
  clear(){states.player=states.bot=null},
  show(side,kind,lane,t,combo=0){if(!['player','bot'].includes(side)||!GRADES[kind]||!Number.isFinite(t))return;states[side]={kind,lane:Math.max(0,Math.min(3,lane)),t,combo}},
  draw(g,t,{reduced=false,paused=false,rival=false}={}){
   g.clearRect(0,0,1200,700);if(paused)return;
   for(const side of ['player','bot']){
    const s=states[side];if(!s)continue;const age=t-s.t;if(age<0||age>.85)continue;
    const x=side==='player'?176:1024,col=GRADES[s.kind],fade=Math.min(1,(.85-age)/.18),pop=reduced?1:1+Math.exp(-age*16)*.12;
    g.save();g.globalAlpha=fade;g.translate(x,96);g.scale(pop,pop);
    // Opaque plate and heavy outline keep the grade readable over any video.
    g.fillStyle='#060b19f5';g.strokeStyle=col;g.lineWidth=2.5;g.shadowColor=col;g.shadowBlur=reduced?0:18;
    g.beginPath();g.roundRect(-118,-55,236,111,15);g.fill();g.stroke();g.shadowBlur=0;
    g.font='800 12px system-ui';g.textAlign='center';g.fillStyle='#d2deef';g.fillText(side==='player'?'1P · YOU':rival?'2P · RIVAL':'2P · CPU',0,-30);
    g.font='italic 1000 34px system-ui';g.lineJoin='round';g.strokeStyle='#000';g.lineWidth=7;g.strokeText(s.kind.toUpperCase(),0,9);g.fillStyle=col;g.fillText(s.kind.toUpperCase(),0,9);
    g.font='900 16px system-ui';g.fillStyle='#fff';g.fillText(s.kind==='miss'?'COMBO BREAK':s.kind==='hold'?'KEEP HOLDING':s.combo+' COMBO',0,37);g.restore();
    if(reduced||age>.4)continue;
    const laneX=(side==='player'?74:922)+s.lane*68,k=age/.4,r=25+k*66;
    g.save();g.globalAlpha=(1-k)*.95;g.strokeStyle=s.kind==='miss'?col:COLORS[s.lane];g.lineWidth=7*(1-k)+1;g.shadowBlur=18;g.shadowColor=col;
    g.beginPath();g.ellipse(laneX,553,r,r*.62,0,0,Math.PI*2);g.stroke();
    for(let i=0;i<12;i++){const a=i*Math.PI/6;g.beginPath();g.moveTo(laneX+Math.cos(a)*(r+4),553+Math.sin(a)*(r+4)*.7);g.lineTo(laneX+Math.cos(a)*(r+14+12*k),553+Math.sin(a)*(r+14+12*k)*.7);g.stroke()}g.restore();
   }
  }
 };
}
// Input monitoring has its own envelope and bypasses music volume, including
// YouTube mode. One short kick + tonal click per fresh press, even on empty lanes.
function keySound(ctx,lane,volume){
 if(!ctx||ctx.state!=='running'||!Number.isFinite(volume)||volume<=0)return [];
 const at=ctx.currentTime,vol=Math.min(1,volume),out=ctx.createGain();out.gain.value=vol;out.connect(ctx.destination);
 const voices=[];let remaining=2;
 for(const [freq,end,dur,level,type]of [[125+lane*18,48+lane*6,.085,.19,'sine'],[620+lane*145,360+lane*85,.045,.055,'triangle']]){
  const osc=ctx.createOscillator(),env=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,at);osc.frequency.exponentialRampToValueAtTime(end,at+dur);env.gain.setValueAtTime(.0001,at);env.gain.exponentialRampToValueAtTime(level,at+.003);env.gain.exponentialRampToValueAtTime(.0001,at+dur);osc.connect(env);env.connect(out);osc.start(at);osc.stop(at+dur+.01);
  osc.addEventListener('ended',()=>{env.disconnect();if(!--remaining)out.disconnect()},{once:true});voices.push(osc);
 }
 return voices;
}
window.NeonFeedback=Object.freeze({create,keySound});
})();
