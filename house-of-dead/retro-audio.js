// Original WebAudio horror score + infected vocal design. Synthesized: no third-party audio assets.
export function createHorrorAudio(){
 let ctx=null,master=null,ambient=null,noiseBuffer=null,active=false,muted=false,lastGrowl=-20,lastBeat=-20,voices=[];
 const A=()=>window.AudioContext||window.webkitAudioContext;
 function init(){
  if(ctx)return ctx;
  const Klass=A();if(!Klass)return null;
  ctx=new Klass();master=ctx.createGain();master.gain.value=0;
  master.connect(ctx.destination);
  ambient=ctx.createGain();ambient.gain.value=.36;ambient.connect(master);
  noiseBuffer=ctx.createBuffer(1,Math.round(ctx.sampleRate*3),ctx.sampleRate);
  const data=noiseBuffer.getChannelData(0);let last=0;
  for(let i=0;i<data.length;i++){last=last*.82+(Math.random()*2-1)*.18;data[i]=last}
  return ctx
 }
 function gain(dest,amount,t,dur,attack=.012){
  const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002,amount),t+Math.max(.003,attack));
  g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(.03,dur));g.connect(dest);return g
 }
 function tone(freq,end,dur,amp,shape='sawtooth',dest=master,startAt=null){
  if(!active||!ctx)return;
  const t=startAt??ctx.currentTime,o=ctx.createOscillator(),g=gain(dest,amp,t,dur,Math.min(.18,dur*.25));
  o.type=shape;o.frequency.setValueAtTime(Math.max(1,freq),t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1,end),t+dur);
  o.connect(g);o.start(t);o.stop(t+dur+.02);
 }
 function hiss(dur,amp,low=170,high=950,dest=master,startAt=null){
  if(!active||!ctx||!noiseBuffer)return;
  const t=startAt??ctx.currentTime,src=ctx.createBufferSource(),filter=ctx.createBiquadFilter();
  src.buffer=noiseBuffer;src.loop=true;filter.type='bandpass';filter.Q.value=.7;filter.frequency.setValueAtTime(low,t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(low+1,high),t+dur);
  const g=gain(dest,amp,t,dur);src.connect(filter).connect(g);
  src.start(t);src.stop(t+dur+.02);
 }
 function begin(){
  if(!init())return false;
  ctx.resume().catch(()=>{});
  if(!active){
   active=true;
   // Sustained low drone: beating detuned frequencies through lowpass; independent of game FPS.
   const cut=ctx.createBiquadFilter();cut.type='lowpass';cut.frequency.value=210;cut.Q.value=1.4;cut.connect(ambient);
   for(const [hz,vol,type] of [[42,.12,'sawtooth'],[42.44,.12,'sawtooth'],[61.25,.045,'triangle'],[82.25,.030,'sine']]){
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=hz;g.gain.value=vol;
    o.connect(g).connect(cut);o.start();voices.push(o)
   }
   const wind=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),v=ctx.createGain();
   wind.buffer=noiseBuffer;wind.loop=true;filter.type='lowpass';filter.frequency.value=260;v.gain.value=.12;wind.connect(filter).connect(v).connect(ambient);wind.start();voices.push(wind);
  }
  master.gain.setTargetAtTime(muted?0:.58,ctx.currentTime,.18);return true;
 }
 function stop(){if(ctx&&master)master.gain.setTargetAtTime(0,ctx.currentTime,.10)}
 function toggle(){muted=!muted;if(ctx&&master)master.gain.setTargetAtTime(muted?0:.58,ctx.currentTime,.1);return muted}
 function cue(kind,seed=0){
  if(!active||!ctx||muted)return;
  const n=((Math.sin(seed*19.2+ctx.currentTime*3.1)+1)*.5);
  if(kind==='shot'){tone(165,44,.19,.28,'sawtooth');hiss(.15,.13,190,2100)}
  if(kind==='reload'){tone(440,260,.075,.07,'triangle');tone(670,320,.09,.07,'triangle',master,ctx.currentTime+.16)}
  if(kind==='growl'){tone(67+n*24,39+n*18,.58+n*.6,.065,'sawtooth');tone(103+n*52,48,.44,.035,'square');hiss(.46,.11,95,580)}
  if(kind==='lunge'){tone(125,57,.29,.11,'sawtooth');hiss(.25,.15,600,2200)}
  if(kind==='spit'){hiss(.64,.19,160,2200);tone(83,30,.38,.13)}
  if(kind==='throw'){hiss(.41,.17,210,1180);tone(144,61,.33,.14)}
  if(kind==='hit'){hiss(.19,.08,440,1400);tone(89,35,.15,.12)}
  if(kind==='death'){tone(69+n*40,18,.9,.09,'sawtooth');hiss(.36,.095,120,820)}
  if(kind==='boss'){tone(49,27,1.7,.15,'sawtooth');tone(58,30,1.5,.095,'square');hiss(1.2,.14,75,370)}
  if(kind==='grenade'){tone(184,40,.62,.22);hiss(.83,.28,90,2300);tone(48,20,1.15,.18,'triangle')}
  if(kind==='fuse'){tone(1040,420,.07,.037,'square')}
 }
 function tick(time,stage,alive){
  if(!active||!ctx||muted)return;
  if(time-lastBeat>(stage%5===4?1.2:2.3)){
   lastBeat=time;const t=ctx.currentTime;
   tone(52,38,.42,.055,'sine',ambient,t);
   tone(47,29,.40,.035,'sine',ambient,t+.22);
   if(stage%5===4){tone(92,43,.33,.07,'triangle',ambient,t+.48)}
   if(Math.sin(stage*19+time)>.15)hiss(.26,.031,70,370,ambient,t+.55);
  }
  if(alive>0&&time-lastGrowl>2.7+Math.abs(Math.sin(time*.13+stage))*2.2){
   lastGrowl=time;cue('growl',stage*13+time)
  }
 }
 return {begin,stop,toggle,cue,tick,get muted(){return muted}};
}
