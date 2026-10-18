/* Sprite sheet export: 24 real rasterized tween frames from local illustrated parts. */
(()=>{'use strict';
const allowed=/^[\w-]+$/;
async function render(profile,action='idleA',opts={}){
 if(!window.NeonDoll||!window.NeonMotion)throw Error('캐릭터 파츠를 불러올 수 없습니다.');
 const loaded=await window.NeonDoll.ready();
 if(!loaded)throw Error('일러스트 시트 로딩이 끝나지 않았습니다.');
 const clips=window.NeonMotion.clips,clip=clips[action]||clips.idleA;
 const count=Math.max(8,Math.min(48,Number(opts.count)||24)),cols=6,rows=Math.ceil(count/cols),cw=260,ch=380;
 const sheet=document.createElement('canvas');sheet.width=cw*cols;sheet.height=ch*rows;
 const g=sheet.getContext('2d');if(!g)throw Error('2D 캔버스 사용 불가');
 const art={...profile,art:'doll'};
 const cells=[];
 for(let i=0;i<count;i++){
  const time=i/count*clip.duration;
  const col=i%cols,row=Math.floor(i/cols);
  g.save();g.translate(col*cw,row*ch);
  window.NeonDoll.draw(g,cw/2,ch-18,art,{t:time,action,actionTime:time,scale:.98,reduced:false});
  g.restore();
  cells.push({index:i,time:+time.toFixed(3),rect:[col*cw,row*ch,cw,ch]});
  // Yield to rendering every six frames to keep the studio responsive.
  if((i+1)%6===0)await new Promise(resolve=>requestAnimationFrame(resolve));
 }
 const blob=await new Promise((ok,fail)=>sheet.toBlob(b=>b?ok(b):fail(Error('이미지 내보내기 실패')),'image/png'));
 return {blob,count,width:sheet.width,height:sheet.height,frames:cells,duration:clip.duration,action};
}
async function download(profile,action='idleA'){
 const result=await render(profile,action);
 const safeName=(profile?.name||'fighter').replace(/[^\w가-힣-]/g,'_').slice(0,28)||'fighter';
 const file='neon-clash-'+safeName+'-'+action+'-24frames.png';
 const uri=URL.createObjectURL(result.blob);
 try{const a=document.createElement('a');a.href=uri;a.download=file;document.body.append(a);a.click();a.remove();}
 finally{setTimeout(()=>URL.revokeObjectURL(uri),5000)}
 return result;
}
window.NeonFrameExport=Object.freeze({render,download});
})();