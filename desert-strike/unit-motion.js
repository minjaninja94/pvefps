/* Shared animation presentation for all ten factions and eight unit classes.
   16 frames each: idle/move/attack/siege/death + spawn/hit/skill embellishments. */
(function(global){'use strict';
const TAU=Math.PI*2,LIST=[
 ['idle','대기',7],['move','이동',12],['attack','공격',15],['siege','공성',12],
 ['hit','피격',15],['skill','스킬',12],['spawn','소환',12],['death','사망',11]];
const ACTIONS=Object.freeze(LIST.map(([id,label,fps])=>({id,label,fps})));
const byId=Object.fromEntries(ACTIONS.map(a=>[a.id,a])),BASE={hit:'attack',skill:'siege',spawn:'idle'};
function frameAt(action,seconds){return Math.floor(Math.max(0,seconds)*(byId[action]||byId.idle).fps)%16;}
function draw(ctx,{faction=0,role=0,action='idle',frame=0,x=0,y=0,size=72,filter='none',skin='default',isHatchling=false}={}){
 if(!ctx)return false;
 const bloodIron=skin==='blood-iron'&&faction===0&&!isHatchling?global.DesertBloodIronArt?.frame?.(role,action,frame):null;
 if(!bloodIron&&(role===9||role===10)&&global.DesertExpansionArt)return global.DesertExpansionArt.draw(ctx,{faction,role,action,frame,x,y,size,filter,skin:skin==='moe'?'moe':'base'});
 if(!global.IsoWorld)return false;
 if(!byId[action])action='idle';
 const t=((Math.floor(frame)%16)+16)%16/15;
 const source=bloodIron||(isHatchling?global.IsoWorld.broodlingFrame?.(BASE[action]||action,Math.floor(t*15)):
  skin==='moe'&&global.DesertMoeArt?global.DesertMoeArt.frame(faction,role,BASE[action]||action,Math.floor(t*15)):
  global.IsoWorld.frame(faction,role,BASE[action]||action,Math.floor(t*15)));
 if(!source)return false;
 const hue=['#9be7fa','#bdda9c','#bfb1fb','#f5ab8a','#ffd0d6','#bdfae9','#e9cda9','#82e8fa','#c49cfa','#fad2d6'][faction]||'#f4e8cc';
 ctx.save();ctx.translate(x+size/2,y+size/2);
 if(action==='spawn'){const z=.35+.65*Math.min(1,t*2.7);ctx.scale(z,z);ctx.globalAlpha=Math.min(1,.18+t*4);}
 if(action==='hit'){ctx.translate(-Math.sin(t*Math.PI)*size*.07,0);ctx.rotate(-Math.sin(t*Math.PI)*.12);}
 if(action==='skill')ctx.translate(0,-Math.sin(t*Math.PI)*size*.045);
 ctx.filter=filter;ctx.drawImage(source,-size/2,-size/2,size,size);ctx.filter='none';
 if(action==='hit'){ctx.fillStyle='#ff6677';ctx.globalAlpha=(1-t)*.35;ctx.fillRect(-size*.34,-size*.43,size*.68,size*.82);}
 if(action==='spawn'||action==='skill'){
  ctx.strokeStyle=hue;ctx.lineWidth=Math.max(1,size/45);ctx.globalAlpha=.3+.5*(1-t);
  ctx.beginPath();ctx.ellipse(0,size*(action==='spawn'?.3:0),size*(.21+.21*t),size*(.055+.08*t),0,0,TAU);ctx.stroke();
  if(action==='skill')for(let i=0;i<5;i++){const a=t*TAU+i*TAU/5;ctx.fillStyle=hue;ctx.fillRect(Math.cos(a)*size*.32,Math.sin(a)*size*.28,3,3);}
 }
 ctx.restore();return true;
}
global.DesertUnitMotion=Object.freeze({ACTIONS,frameAt,draw,FRAMES:16});
})(window);
