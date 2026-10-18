(()=>{'use strict';
const COLOR='#ffd77d',WINDOW=.23;
function apply(notes,seed,duration){
 const rng=window.RhythmChart.random(seed^0x79ea32b1),groups=new Map();
 for(const n of notes)if(!n.duration&&n.t>=5&&n.t<=duration-.5){if(!groups.has(n.phrase))groups.set(n.phrase,[]);groups.get(n.phrase).push(n)}
 let last=-10;const picked=[];
 for(const [phrase,list]of groups){
  const pool=list.filter(n=>n.t-last>=4.5);if(!pool.length||rng()>.72)continue;
  const n=pool[Math.floor(rng()*pool.length)];n.kind='power';n.originalLane=n.lane;n.lane=4;last=n.t;picked.push(n);
 }
 // Guarantee an encounter in a playable phrase even when random rolls all miss.
 if(!picked.length&&groups.size){const list=[...groups.values()][0],n=list[Math.floor(rng()*list.length)];n.kind='power';n.originalLane=n.lane;n.lane=4;picked.push(n)}
 return notes;
}
function draw(g,notes,t,inputT,pulse,reduced=false){
 const pending=notes.filter(n=>n.kind==='power'&&!n.done&&n.t-t<2.4&&n.t-t>-.3).sort((a,b)=>a.t-b.t),n=pending[0];
 const flash=pulse&&t-pulse.t>=0&&t-pulse.t<.75;
 if(!n&&!flash)return;
 const cx=600,cy=445,r=61,delta=n?n.t-(n.side==='player'?inputT:t):0,approach=Math.max(0,Math.min(1,delta/2.2));
 g.save();g.textAlign='center';g.fillStyle='#090c1bf2';g.strokeStyle=COLOR;g.lineWidth=4;g.shadowColor=COLOR;g.shadowBlur=reduced?0:18;
 g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.fill();g.stroke();
 if(n){g.globalAlpha=.85;g.lineWidth=5;g.beginPath();g.arc(cx,cy,r+approach*67,0,Math.PI*2);g.stroke();g.globalAlpha=1;
  g.fillStyle=n.side==='player'?'#fff':'#ffb6dd';g.font='900 13px system-ui';g.fillText(n.side==='player'?'YOUR POWER':'RIVAL POWER',cx,cy-r-18);g.fillStyle=COLOR;g.font='1000 22px system-ui';g.fillText(n.side==='player'?'SPACE':'CPU',cx,cy+7);g.font='800 12px system-ui';g.fillText('POWER UP',cx,cy+28);
  if(Math.abs(delta)<WINDOW){g.strokeStyle='#fff';g.lineWidth=7;g.beginPath();g.arc(cx,cy,r-8,0,Math.PI*2);g.stroke()}
 }
 if(flash){const age=t-pulse.t;g.globalAlpha=Math.min(1,(.75-age)/.2);g.fillStyle=pulse.kind==='miss'?'#ff7594':COLOR;g.font='1000 21px system-ui';g.fillText(pulse.kind==='miss'?'MISS':'+'+pulse.energy+' POWER',cx,cy-6);g.font='800 13px system-ui';g.fillText(pulse.side==='player'?'YOU':'RIVAL',cx,cy+20);if(!reduced){g.lineWidth=6*(1-age/.75);g.beginPath();g.arc(cx,cy,r+age*110,0,Math.PI*2);g.stroke()}}
 g.restore();
}
window.NeonPowerNotes=Object.freeze({apply,draw,WINDOW});
})();
