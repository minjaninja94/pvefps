const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
 page.on('pageerror',e=>{if(!/Failed to fetch dynamically imported module/.test(e.message))errors.push(e.message);});
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765')?r.continue():r.abort());
 await page.goto('http://127.0.0.1:8765/desert-strike/');
 await page.waitForFunction(()=>window.DesertTriUI&&window.DesertSkinShop&&window.IsoWorld);
 const report=await page.evaluate(()=>{
  const E=DesertTriEngine,ui=DesertTriUI;
  const match=E.create({mode:'pvp',size:1,members:[{uid:'a',team:0,faction:0},{uid:'b',team:1,faction:1}]});
  const s=match.snapshot('a');s.wave=1;s.seconds=20;s.units=Array.from({length:360},(_,i)=>({id:i,uid:'',team:i%2,faction:i%10,skin:i%2?'default~obsidian':'default',role:i%11,lane:i%3,x:1150+i%35*25,y:(i%3)*520+210+(i%9)*12,hp:100,maxHP:100,frame:0,act:'move',opacity:1,heroCount:1}));
  ui.onSnapshot(s);ui.setView('battle');
  const marks=[],skins=[],proto=CanvasRenderingContext2D.prototype,fill=proto.fillText,original=DesertUnitMotion;
  proto.fillText=function(text,...args){marks.push(String(text));return fill.call(this,text,...args);};
  window.DesertUnitMotion={...original,draw(g,o){skins.push(o.skin);return original.draw(g,o);}};
  ui.draw();
  const hasObsidian=skins.includes('default~obsidian'),hasMarks=marks.some(x=>x===DesertRoster.getDef(0,0).mark);
  for(let i=0;i<5;i++)ui.draw();const times=[];
  for(let i=0;i<40;i++){const t=performance.now();ui.draw();times.push(performance.now()-t);}
  document.querySelector('[data-mp-lane="1"]').click();marks.length=0;ui.draw();const laneMarks=marks.length;
  proto.fillText=fill;window.DesertUnitMotion=original;
  function brightness(skin){const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d');DesertUnitMotion.draw(g,{faction:0,role:0,action:'idle',frame:0,x:0,y:0,size:96,skin});const d=g.getImageData(0,0,96,96).data;let sum=0,weight=0;for(let i=0;i<d.length;i+=4){const a=d[i+3]/255;sum+=(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])*a;weight+=a;}return sum/weight;}
  times.sort((a,b)=>a-b);
  return {hasObsidian,hasMarks,laneMarks,units:s.units.length,medianMs:times[20],p95Ms:times[38],originalLuma:brightness('default'),obsidianLuma:brightness('default~obsidian')};
 });
 assert.ok(report.hasObsidian);assert.ok(report.hasMarks);assert.ok(report.laneMarks>0);
 assert.ok(report.obsidianLuma>=report.originalLuma*.85,JSON.stringify(report));assert.deepEqual(errors,[]);
 await page.screenshot({path:'/tmp/desert-multiplayer-lane.png'});
 await page.locator('[data-mp-scope="all"]').click();
 await page.screenshot({path:'/tmp/desert-multiplayer-all.png'});
 console.log(JSON.stringify(report));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
