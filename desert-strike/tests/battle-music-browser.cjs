const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {multi}=require('../combat-balance-harness.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const context=await browser.newContext(),errors=[];
 await context.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765')?r.continue():r.abort());
 await context.addInitScript(()=>{
  const OriginalAudio=window.Audio;window.__music=[];
  window.Audio=function(src){const a=new OriginalAudio(src);if(/(?:theme|horizon-of-the-titan|iron-vanguard)\.mp3/.test(src||''))window.__music.push(a);return a;};window.Audio.prototype=OriginalAudio.prototype;
  document.addEventListener('pointerdown',()=>{window.__audioContext ||=new AudioContext();void window.__audioContext.resume();},{once:true});
 });
 const pages=await Promise.all([context.newPage(),context.newPage()]);
 for(const page of pages){
  page.on('pageerror',e=>{if(!/Failed to fetch dynamically imported module/.test(e.message))errors.push(e.message);});
  await page.goto('http://127.0.0.1:8765/desert-strike/');await page.waitForFunction(()=>window.DesertTriUI&&window.DesertLobbyMusic);
  await page.locator('.lobby-mark').click();
 }
 const {E}=multi(),m=E.create({mode:'classic',size:1,members:[{uid:'a',team:0,faction:0,skin:'blood-iron~gold'},{uid:'b',team:1,faction:0,skin:'blood-iron~aurora'}]});
 m.state.seconds=20;m.state.next=999;m.wave();
 m.__test.spawn(m.state.players[0],0,0,0);m.__test.spawn(m.state.players[1],0,0,0);
 const [a,b]=m.state.units;Object.assign(a,{x:1600,y:260,hp:10000,maxHP:10000,spawnAge:1});Object.assign(b,{x:1620,y:260,hp:10000,maxHP:10000,spawnAge:1});
 const observed=[];
 async function checkStage(stage,suffix){
  for(let i=0;i<pages.length;i++){
   const page=pages[i];await page.evaluate(s=>DesertTriUI.onSnapshot(s),JSON.parse(JSON.stringify(m.snapshot(i?'b':'a'))));
   await page.waitForFunction(suffix=>{const a=__music.find(a=>a.src.endsWith(suffix));return a&&!a.paused&&a.readyState>=3&&a.currentTime>.1;},suffix,{timeout:15000});
   const playing=await page.evaluate(()=>__music.filter(a=>!a.paused).map(a=>({src:a.src,volume:a.volume,loop:a.loop})));
   assert.equal(playing.length,1);assert.ok(playing[0].src.endsWith(suffix));assert.ok(playing[0].volume>0);assert.equal(playing[0].loop,true);
   const level=await page.evaluate(async suffix=>{
    const a=__music.find(a=>a.src.endsWith(suffix)),ctx=__audioContext,analyser=ctx.createAnalyser();analyser.fftSize=2048;
    const source=ctx.createMediaElementSource(a);source.connect(analyser);analyser.connect(ctx.destination);a.currentTime=15;
    await new Promise(r=>setTimeout(r,450));const values=new Float32Array(2048);analyser.getFloatTimeDomainData(values);
    return {rms:Math.sqrt(values.reduce((n,v)=>n+v*v,0)/values.length),context:ctx.state,error:a.error?.message||null};
   },suffix);
   assert.equal(level.error,null);assert.equal(level.context,'running');assert.ok(level.rms>.0001,JSON.stringify(level));
   observed.push({client:i,stage,...playing[0],...level});
  }
 }
 await checkStage(0,'battle-theme.mp3');
 for(const page of pages){
  await page.waitForFunction(()=>DesertSkinArt.loadedCount('blood-iron')===10);
  const skins=await page.evaluate(()=>{
   const drawn=[],renderer=DesertUnitMotion;window.DesertUnitMotion={...renderer,draw(g,o){drawn.push(o.skin);return renderer.draw(g,o);}};
   DesertTriUI.setView('battle');DesertTriUI.draw();window.DesertUnitMotion=renderer;
   function pixels(skin){const c=document.createElement('canvas');c.width=c.height=72;const g=c.getContext('2d');renderer.draw(g,{faction:0,role:0,skin,size:72,action:'idle'});return g.getImageData(0,0,72,72).data;}
   const a=pixels('blood-iron~gold'),b=pixels('blood-iron~aurora');let changed=0;for(let i=0;i<a.length;i+=4)if(a[i+3]&&b[i+3]&&Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>15)changed++;
   return {drawn,changed};
  });
  assert.ok(skins.drawn.includes('blood-iron~gold'));assert.ok(skins.drawn.includes('blood-iron~aurora'));assert.ok(skins.changed>100,'opponents paid chromas use loaded custom art and visibly different actual pixels');
 }

 m.__test.applyHit(a,b,10);m.__test.applyHit(b,a,10);assert.equal(m.state.musicStage,1);await checkStage(1,'horizon-of-the-titan.mp3');
 assert.ok(m.order('a',{type:'tactic',kind:'nuke'}).ok);a.x=2600;m.tick(.01);assert.equal(m.state.musicStage,2);await checkStage(2,'iron-vanguard.mp3');
 for(const page of pages){
  await page.evaluate(()=>{DesertLobbyMusic.setVolume(17);DesertLobbyMusic.setEnabled(false);});
  assert.equal(await page.evaluate(()=>__music.filter(a=>!a.paused).length),0);
  await page.evaluate(()=>DesertLobbyMusic.setEnabled(true));
  await page.waitForFunction(()=>__music.some(a=>a.src.endsWith('iron-vanguard.mp3')&&!a.paused));
  assert.equal(await page.evaluate(()=>__music.find(a=>a.src.endsWith('iron-vanguard.mp3')).volume),.17);
  await page.evaluate(()=>DesertLobbyMusic.enterLobby());assert.equal(await page.evaluate(()=>__music.filter(a=>!a.paused&& !a.src.endsWith('lobby-theme.mp3')).length),0);
  await page.evaluate(()=>{DesertLobbyMusic.exitLobby();DesertLobbyMusic.resetBattle();});
  await page.waitForFunction(()=>__music.some(a=>a.src.endsWith('battle-theme.mp3')&&!a.paused));
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify(observed));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
