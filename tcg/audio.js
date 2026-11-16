(() => {
 'use strict';
 const STORE='dimension-war-audio-v1';
 let ctx=null,musicGain=null,timer=0,step=0,musicOn=true,sfxOn=true,initialized=false;
 const chords=[[146.83,174.61,220,293.66],[116.54,146.83,174.61,233.08],[130.81,164.81,196,261.63],[110,130.81,164.81,220]];
 const melody=[0,2,1,3,2,1,0,2,3,1,2,0,1,3,2,1];
 function read(){try{const v=JSON.parse(localStorage.getItem(STORE)||'null');if(v){musicOn=v.music!==false;sfxOn=v.sfx!==false;}}catch{}}
 function save(){try{localStorage.setItem(STORE,JSON.stringify({music:musicOn,sfx:sfxOn}));}catch{}}
 function context(){
  if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;ctx=new Audio();musicGain=ctx.createGain();musicGain.gain.value=.0001;musicGain.connect(ctx.destination);}
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  return ctx;
 }
 function tone(freq,start,duration,volume,type='triangle',destination=musicGain){
  const c=context();if(!c||!destination)return;
  const osc=c.createOscillator(),amp=c.createGain(),filter=c.createBiquadFilter();
  osc.type=type;osc.frequency.setValueAtTime(freq,start);filter.type='lowpass';filter.frequency.value=1250;
  amp.gain.setValueAtTime(.0001,start);amp.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.045);
  amp.gain.setTargetAtTime(.0001,start+duration*.58,duration*.16);
  osc.connect(filter);filter.connect(amp);amp.connect(destination);osc.start(start);osc.stop(start+duration);
 }
 function scheduleBar(){
  if(!musicOn||!ctx)return;
  const c=ctx,now=c.currentTime,bar=Math.floor(step/16)%chords.length,notes=chords[bar],index=step%16;
  if(index===0)notes.forEach((n,i)=>tone(n/2,now,5.5,i===0?.018:.009,'sine'));
  const pitch=notes[melody[index]%notes.length]*(index%4===3?2:1);
  tone(pitch,now,1.05,index%4===0?.026:.014,'triangle');
  if(index===7||index===15)tone(notes[2]*2,now,.36,.008,'sine');
  step=(step+1)%64;
 }
 function musicStart(){
  context();if(!ctx||!musicGain)return;
  musicGain.gain.cancelScheduledValues(ctx.currentTime);musicGain.gain.setTargetAtTime(.32,ctx.currentTime,.45);
  if(!timer){step=0;scheduleBar();timer=setInterval(scheduleBar,375);}
 }
 function musicStop(){
  if(timer){clearInterval(timer);timer=0;}
  if(ctx&&musicGain){musicGain.gain.cancelScheduledValues(ctx.currentTime);musicGain.gain.setTargetAtTime(.0001,ctx.currentTime,.12);}
 }
 function hit(amount=5){
  if(!sfxOn||amount<=0)return;const c=context();if(!c)return;
  const now=c.currentTime,blast=amount>=15,big=amount>=10,master=c.createGain();
  master.gain.setValueAtTime(blast?.42:big?.32:.23,now);master.gain.exponentialRampToValueAtTime(.0001,now+(blast?.72:big?.48:.28));master.connect(c.destination);
  const osc=c.createOscillator(),og=c.createGain();osc.type='sine';osc.frequency.setValueAtTime(blast?92:big?118:164,now);osc.frequency.exponentialRampToValueAtTime(blast?34:big?46:58,now+(blast?.34:.22));og.gain.setValueAtTime(.9,now);og.gain.exponentialRampToValueAtTime(.0001,now+(blast?.6:.32));osc.connect(og);og.connect(master);osc.start(now);osc.stop(now+(blast?.65:.36));
  const buffer=c.createBuffer(1,Math.floor(c.sampleRate*(blast?.42:.16)),c.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
  const noise=c.createBufferSource(),ng=c.createGain(),filter=c.createBiquadFilter();noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=blast?1800:950;ng.gain.setValueAtTime(blast?.72:.42,now);ng.gain.exponentialRampToValueAtTime(.0001,now+(blast?.4:.15));noise.connect(filter);filter.connect(ng);ng.connect(master);noise.start(now);
 }
 function sync(){
  const musicButton=document.getElementById('bgmToggle'),sfxButton=document.getElementById('sfxToggle');
  if(musicButton){musicButton.textContent=musicOn?'배경음 켬':'배경음 끔';musicButton.setAttribute('aria-pressed',String(musicOn));}
  if(sfxButton){sfxButton.textContent=sfxOn?'타격음 켬':'타격음 끔';sfxButton.setAttribute('aria-pressed',String(sfxOn));}
 }
 function init(){if(initialized)return;initialized=true;read();sync();document.addEventListener('pointerdown',()=>{if(musicOn)musicStart();},{once:true});}
 function toggleMusic(){musicOn=!musicOn;save();if(musicOn)musicStart();else musicStop();sync();return musicOn;}
 function toggleSfx(){sfxOn=!sfxOn;save();sync();return sfxOn;}
 function start(){if(musicOn)musicStart();}
 window.TCG_AUDIO={init,start,toggleMusic,toggleSfx,hit};
})();
