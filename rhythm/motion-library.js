/* NEON CLASH motion director. 24fps generated tween states from painted atlas poses.
 * Extra frames are synthesized at render time; they are NOT new hand-drawn art. */
(()=>{'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>{let x=clamp(t);return x*x*(3-2*x)};
const E=Object.freeze({
 idleA:{duration:2.4,steps:[[0,0,0,0,0],[2.4,0,0,0,0]],loop:true},
 idleB:{duration:2.4,steps:[[0,0,0,0,0],[2.4,0,0,0,0]],loop:true},
 idleC:{duration:2.7,steps:[[0,0,0,0,0],[2.7,0,0,0,0]],loop:true},
 ready:{duration:.85,steps:[[0,0,0,0,0],[.3,3,3,0,2],[.61,3,3,0,2],[.85,0,0,0,0]]},
 attack:{duration:1.12,steps:[[0,0,3,0,0],[.18,3,4,0,2],[.4,4,5,0,2],[.72,5,0,0,0],[1.12,0,0,0,0]]},
 attack2:{duration:1.14,steps:[[0,0,3,0,0],[.21,3,4,0,2],[.47,4,5,0,2],[.74,5,0,0,0],[1.14,0,0,0,0]]},
 attack3:{duration:1.3,steps:[[0,0,3,0,0],[.25,3,4,0,2],[.62,4,5,0,2],[.93,5,0,0,0],[1.3,0,0,0,0]]},
 hit:{duration:.85,steps:[[0,6,7,0,3],[.13,7,8,0,3],[.4,8,0,0,3],[.85,0,0,0,0]]},
 hitHeavy:{duration:1.1,steps:[[0,6,7,0,3],[.15,7,8,0,3],[.65,8,0,0,3],[1.1,0,0,0,0]]},
 guard:{duration:1.1,steps:[[0,0,3,0,0],[.22,3,3,0,2],[.87,3,3,0,2],[1.1,0,0,0,0]]},
 step:{duration:.85,steps:[[0,0,0,0,0],[.85,0,0,0,0]]},
 dodge:{duration:.88,steps:[[0,0,0,0,0],[.88,0,0,0,0]]},
 drawClash:{duration:1.45,steps:[[0,0,3,0,0],[.29,3,4,0,2],[.46,4,4,0,2],[1.04,4,3,0,2],[1.45,0,0,0,0]]},
 drawPush:{duration:1.3,steps:[[0,3,4,0,2],[.24,4,4,0,2],[.92,4,3,0,2],[1.3,0,0,0,0]]},
 drawRecover:{duration:.72,steps:[[0,3,3,0,2],[.72,0,0,0,0]]},
 superCharge:{duration:1.3,steps:[[0,0,3,0,2],[.34,3,3,0,2],[1.3,3,3,0,2]]},
 superRelease:{duration:1.2,steps:[[0,3,4,0,2],[.23,4,5,0,2],[.57,5,5,0,2],[1.2,0,0,0,0]]},
 win:{duration:2.2,steps:[[0,0,3,0,0],[.42,3,5,0,2],[1,5,5,0,0],[2.2,5,5,0,0]]},
 lose:{duration:1.8,steps:[[0,6,7,0,3],[.38,7,8,0,3],[1.8,8,8,0,3]]},
 intro:{duration:1.8,steps:[[0,0,0,0,0],[.5,0,3,0,0],[.95,3,3,0,2],[1.8,0,0,0,0]]}
});
const actions=Object.freeze(Object.keys(E));
function state(action='idle',age=0,clock=0,style='balanced',reduced=false){
 const key=Number.isFinite(age)&&age<0&&!String(action).startsWith('idle')?'idleA':E[action]?action:'idleA';
 const clip=E[key];const speed=style==='energetic'?1.12:style==='graceful'?.86:1;
 const elapsed=Math.max(0,Number(age)||0)*speed;
 const time=clip.loop?elapsed%clip.duration:Math.min(clip.duration,elapsed);
 const steps=clip.steps;let step=steps.length-2;
 for(let i=0;i<steps.length-1;i++)if(time>=steps[i][0]&&time<=steps[i+1][0]){step=i;break}
 const a=steps[step],b=steps[step+1],u=smooth((time-a[0])/Math.max(.001,b[0]-a[0]));
 const mix=u,frame=u<.5?a[1]:b[1],head=u<.5?a[4]:b[4];
 const personality=style==='graceful'?.6:style==='energetic'?1.35:1;
 let shiftX=0,shiftY=0,angle=0;
 switch(key){
  case 'idleA':shiftY=Math.sin(clock*2.1)*1.6;angle=Math.sin(clock*1.4)*.009;break;
  case 'idleB':shiftX=Math.sin(clock*1.35)*2.6;shiftY=Math.sin(clock*1.7)*2;angle=Math.sin(clock*1.1)*.018;break;
  case 'idleC':shiftX=Math.sin(clock*2)*1.8;shiftY=Math.sin(clock*1.05)*2.5;angle=Math.sin(clock*.8)*.024;break;
  case 'step':shiftX=30*Math.sin(Math.PI*time/clip.duration);shiftY=-4*Math.sin(Math.PI*time/clip.duration);break;
  case 'dodge':shiftX=-41*Math.sin(Math.PI*time/clip.duration);shiftY=-8*Math.sin(Math.PI*time/clip.duration);angle=-.09*Math.sin(Math.PI*time/clip.duration);break;
  case 'guard':shiftY=2*smooth(time/.2);angle=-.04*smooth(time/.2);break;
  case 'drawClash':case 'drawPush':shiftX=12*Math.sin(Math.PI*time/clip.duration)+2.2*Math.sin(time*29)*Math.sin(Math.PI*time/clip.duration);angle=-.04*Math.sin(Math.PI*time/clip.duration);break;
  case 'hit':case 'hitHeavy':shiftX=-17*Math.sin(Math.PI*time/clip.duration);angle=-.07*Math.sin(Math.PI*time/clip.duration);break;
  case 'attack':case 'attack2':case 'attack3':shiftX=19*Math.sin(Math.PI*time/clip.duration);shiftY=-7*Math.sin(Math.PI*time/clip.duration);angle=-.034*Math.sin(Math.PI*time/clip.duration);break;
  case 'superCharge':shiftY=Math.sin(clock*9)*2.5;break;
  case 'superRelease':shiftX=36*Math.sin(Math.PI*time/clip.duration);break;
  case 'win':shiftY=-14*smooth(time/.65)+2*Math.sin(clock*3);angle=.05*smooth(time/.7);break;
  case 'lose':shiftY=10*smooth(time/.6);angle=-.09*smooth(time/.6);break;
 }
 if(reduced){shiftX*=.15;shiftY*=.15;angle*=.15}
 return {a:frame,b:frame,mix,anchorA:a[1],anchorB:b[1],anchorMix:mix,head,state:key,shiftX:shiftX*personality,shiftY:shiftY*personality,angle:angle*personality,
  frameIndex:Math.min(Math.floor(time*24),Math.floor(clip.duration*24)),frameCount:Math.ceil(clip.duration*24),duration:clip.duration};
}
function sequence(action,style='balanced',fps=24){
 const clip=E[action]||E.idleA;const total=Math.max(1,Math.ceil(clip.duration*fps));
 return Array.from({length:total},(_,i)=>state(action,i/fps,i/fps,style));
}
window.NeonMotion=Object.freeze({actions,clips:E,state,sequence,FPS:24});
})();