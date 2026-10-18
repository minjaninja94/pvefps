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
function draw(g,notes,t,inputT,pulse,reduced=false,online=false,layout=null){
 const bounds=layout||{player:{x:74,step:68},bot:{x:922,step:68},top:150,bottom:608};
 const cy=(bounds.top+bounds.bottom)*.5+12;
 const pending=notes.filter(n=>n.kind==='power'&&!n.done&&n.t-t<2.4&&n.t-t>-.32);
 for(const side of ['player','bot']){
  const n=pending.filter(n=>n.side===side).sort((a,b)=>a.t-b.t)[0];
  const flash=pulse&&pulse.side===side&&t-pulse.t>=0&&t-pulse.t<.8;
  if(!n&&!flash)continue;
  // Align the SPACE/POWER prompt with the exact center of this fighter's four-note lane.
  const region=bounds[side],cx=region.x+region.step*1.5,r=47;
  const delta=n?n.t-(side==='player'?inputT:t):0,approach=Math.max(0,Math.min(1,delta/2.2));
  const accent=side==='player'?'#68efff':'#fca1cf';
  g.save();g.textAlign='center';g.textBaseline='middle';
  g.shadowColor=COLOR;g.shadowBlur=reduced?0:18;g.lineWidth=3;
  g.fillStyle='#090d20ed';g.strokeStyle=accent;
  g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.fill();g.stroke();
  if(n){
   g.strokeStyle=COLOR;g.lineWidth=5;g.globalAlpha=.92;
   g.beginPath();g.arc(cx,cy,r+8+approach*34,0,Math.PI*2);g.stroke();
   g.globalAlpha=1;g.fillStyle=accent;g.font='900 13px system-ui';
   g.fillText(side==='player'?'1P · POWER':online?'2P · POWER':'CPU · POWER',cx,cy-r-16);
   g.fillStyle='#ffe4a1';g.font='1000 23px system-ui';
   g.fillText(side==='player'?'SPACE':online?'POWER':'CPU',cx,cy-4);
   g.font='800 11px system-ui';g.fillText('POWER UP',cx,cy+19);
   if(Math.abs(delta)<WINDOW){
    g.strokeStyle='#ffffff';g.lineWidth=6;g.beginPath();g.arc(cx,cy,r-7,0,Math.PI*2);g.stroke();
   }
  }
  if(flash){
   const age=t-pulse.t;
   g.globalAlpha=Math.max(0,Math.min(1,(.8-age)/.2));
   g.fillStyle=pulse.kind==='miss'?'#ff7594':COLOR;
   g.font='1000 20px system-ui';
   g.fillText(pulse.kind==='miss'?'MISS':'+'+pulse.energy+' POWER',cx,cy-5);
   g.font='800 12px system-ui';
   g.fillText(side==='player'?'YOU':online?'RIVAL':'CPU',cx,cy+22);
   if(!reduced){g.strokeStyle=COLOR;g.lineWidth=Math.max(1,6*(1-age/.8));g.beginPath();g.arc(cx,cy,r+age*76,0,Math.PI*2);g.stroke()}
  }
  g.restore();
 }
}
window.NeonPowerNotes=Object.freeze({apply,draw,WINDOW});
})();
