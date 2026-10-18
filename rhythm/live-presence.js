/* Live2D-inspired preview controller for layered anime sprites.
 * No Cubism SDK, no camera access, no face tracking, no character data upload. */
(()=>{'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const approach=(v,target,rate,dt)=>v+(target-v)*(1-Math.exp(-rate*dt));
 // Short close + slower reopening, with a small deterministic double-blink.
 function blinkAt(t,seed=0){
  const phase=(t+seed*1.37)%5.7;
  const pulse=(x,start,length)=>{let u=(x-start)/length;if(u<0||u>1)return 0;return Math.pow(Math.sin(Math.PI*u),1.3)};
  return Math.max(pulse(phase,3.3,.19),.57*pulse(phase,3.62,.16));
 }
 function create(seed=0){
  const s={lookX:0,lookY:0,vx:0,vy:0,targetX:0,targetY:0,tilt:0,seed,active:false,lastTime:null,smile:0,blink:0};
  return Object.freeze({
   aim(x,y){s.targetX=clamp(Number(x)||0,-1,1);s.targetY=clamp(Number(y)||0,-1,1);s.active=true},
   release(){s.active=false;s.targetX=0;s.targetY=0},
   tap(time){s.tapTime=Number(time)},
   tick(time,{reduced=false,expression='calm'}={}){
    const dt=s.lastTime===null?1/60:clamp(Number(time)-s.lastTime,0,.065);s.lastTime=Number(time);
    if(reduced){s.lookX=s.lookY=s.vx=s.vy=s.tilt=s.smile=s.blink=0;return {lookX:0,lookY:0,tilt:0,blink:0,smile:0,lookActive:false}}
    // Critically damped head tracking avoids robotic snapping.
    const spring=(axis,target,rate,damping)=>{
     const vKey=axis==='lookX'?'vx':'vy';
     s[vKey]+=(target-s[axis])*rate*dt;
     s[vKey]*=Math.exp(-damping*dt);
     s[axis]=clamp(s[axis]+s[vKey]*dt,-1.12,1.12);
    };
    spring('lookX',s.targetX,94,16);
    spring('lookY',s.targetY,89,16);
    s.tilt=approach(s.tilt,-s.lookX*.072,5.3,dt);
    const targetSmile=expression==='smile'?1:expression==='serious'?-0.45:0.12;
    s.smile=approach(s.smile,targetSmile,3,dt);
    s.blink=Math.max(blinkAt(time,seed),Number.isFinite(s.tapTime)?Math.max(0,1-Math.abs(time-s.tapTime-.12)/.12):0);
    return {lookX:s.lookX,lookY:s.lookY,tilt:s.tilt,blink:s.blink,smile:s.smile,lookActive:s.active}
   },
   reset(){s.lookX=s.lookY=s.vx=s.vy=s.tilt=s.blink=0;s.lastTime=null;s.targetX=s.targetY=0;s.active=false}
  })
 }
 function idle(time,seed=0,reduced=false){
  if(reduced)return {lookX:0,lookY:0,tilt:0,blink:0,smile:0,lookActive:false};
  return {lookX:Math.sin(time*.43+seed)*.18,lookY:Math.sin(time*.32+seed*3)*.12,tilt:Math.sin(time*.64+seed)*.017,
    blink:blinkAt(time,seed),smile:.12,lookActive:false};
 }
 window.NeonPresence=Object.freeze({create,idle,blinkAt});
})();