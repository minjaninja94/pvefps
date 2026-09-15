import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.txt':'text/plain; charset=utf-8'};
const server=http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){response.writeHead(error.code==='ENOENT'?404:500).end();return;}
    response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data);
  });
});

await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const port=server.address().port;
const playwrightSpecifier=process.env.GOABLO_PLAYWRIGHT_MODULE||'playwright';
const playwright=await import(playwrightSpecifier.startsWith('/')?pathToFileURL(playwrightSpecifier):playwrightSpecifier);
const browser=await playwright.chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],assets=new Map();

page.on('pageerror',error=>errors.push(`page: ${error}`));
page.on('console',message=>{
  const url=message.location().url||'';
  if(message.type()==='error'&&!url.startsWith('https://fonts.googleapis.com/'))errors.push(`console: ${message.text()} @ ${url}`);
});
page.on('requestfailed',request=>{
  if(!request.url().startsWith('https://fonts.googleapis.com/'))errors.push(`request: ${request.url()} @ ${request.failure()?.errorText}`);
});
page.on('response',response=>{
  const match=response.url().match(/file_0000[^/]+\.png$/);
  if(match)assets.set(match[0],response.status());
});

const snapshot=()=>page.evaluate(()=>globalThis.__goabloTest.snapshot());
const defeatAll=()=>page.evaluate(()=>globalThis.__goabloTest.defeatAll());
const step=seconds=>page.evaluate(value=>globalThis.__goabloTest.step(value),seconds);
const rows=[0,2,3,4,5,6];

try{
  await page.goto(`http://127.0.0.1:${port}/?test=1`,{waitUntil:'networkidle'});
  await page.locator('[data-class="0"]').click();
  await page.locator('#startBtn').click();
  await page.locator('#selectScreen').waitFor({state:'hidden'});

  for(const expectedFloor of [1,2]){
    await page.locator('#enterBtn').click();
    let state=await snapshot();
    assert.equal(state.floor,expectedFloor);
    assert.equal(state.enemies.length,14+expectedFloor*4+1);
    assert.ok(state.enemies.every(enemy=>enemy.atlas==='monsters'&&rows.includes(enemy.row)&&['idle','walk'].includes(enemy.state)&&[0,1,2].includes(enemy.frame)));

    if(expectedFloor===1){
      await page.waitForTimeout(100);
      const point=await page.evaluate(()=>globalThis.__goabloTest.firstEnemyScreenPoint());
      await page.locator('#world').dispatchEvent('pointermove',{clientX:point.x,clientY:point.y});
      await page.waitForTimeout(50);
      let targeting=await page.evaluate(()=>globalThis.__goabloTest.targeting());
      assert.equal(targeting.hover,point.name);
      assert.equal(targeting.hoverMarker,true);
      assert.equal(await page.locator('#world').evaluate(canvas=>canvas.style.cursor),'crosshair');
      const clickPoint=await page.evaluate(()=>globalThis.__goabloTest.firstEnemyScreenPoint());
      await page.locator('#world').dispatchEvent('pointerdown',{button:0,clientX:clickPoint.x,clientY:clickPoint.y});
      await page.locator('#world').dispatchEvent('pointerup',{button:0,clientX:clickPoint.x,clientY:clickPoint.y});
      await page.waitForTimeout(50);
      targeting=await page.evaluate(()=>globalThis.__goabloTest.targeting());
      assert.equal(targeting.selected,clickPoint.name);
      assert.equal(targeting.selectedMarker,true);
    }

    await defeatAll();
    state=await snapshot();
    assert.equal(state.cleared,true);
    assert.equal(state.enemies.length,0);
    assert.ok(state.corpses.every(corpse=>corpse.state==='death'&&corpse.frame===6));
    await step(.6);
    state=await snapshot();
    assert.ok(state.corpses.every(corpse=>corpse.state==='corpse'&&corpse.frame===7));
  }

  await page.locator('#enterBtn').click();
  let state=await snapshot();
  assert.equal(state.floor,3);
  assert.equal(state.enemies.length,7);
  const boss=state.enemies.find(enemy=>enemy.boss);
  assert.deepEqual({name:boss.name,behavior:boss.behavior,row:boss.row},{name:'역병군주고아',behavior:'plagueboss',row:7});
  assert.equal(state.bossBarHidden,false);

  await defeatAll();
  state=await snapshot();
  assert.equal(state.cleared,true);
  assert.ok(state.corpses.some(corpse=>corpse.boss&&corpse.row===7&&corpse.state==='death'&&corpse.frame===6));
  await step(.6);
  state=await snapshot();
  assert.ok(state.corpses.some(corpse=>corpse.boss&&corpse.row===7&&corpse.state==='corpse'&&corpse.frame===7));
  assert.equal(state.bossBarHidden,true);

  await page.locator('#enterBtn').click();
  state=await snapshot();
  assert.deepEqual({town:state.town,act:state.act,floor:state.floor},{town:true,act:2,floor:0});

  for(const expectedFloor of [1,2]){
    await page.locator('#enterBtn').click();
    state=await snapshot();
    assert.deepEqual({act:state.act,floor:state.floor},{act:2,floor:expectedFloor});
    await defeatAll();
    assert.equal((await snapshot()).cleared,true);
  }

  await page.locator('#enterBtn').click();
  state=await snapshot();
  const spiderMother=state.enemies.find(enemy=>enemy.boss);
  assert.deepEqual({act:state.act,floor:state.floor,name:spiderMother.name,behavior:spiderMother.behavior,row:spiderMother.row},{act:2,floor:3,name:'거미어미고아',behavior:'spiderboss',row:8});
  await page.evaluate(()=>globalThis.__goabloTest.protectPlayer());
  await step(8);
  state=await snapshot();
  const spiderMinions=state.enemies.filter(enemy=>!enemy.boss&&enemy.behavior==='web'&&enemy.row===5);
  assert.ok(spiderMinions.length>=4);

  await defeatAll();
  state=await snapshot();
  assert.ok(state.corpses.some(corpse=>corpse.boss&&corpse.row===8&&corpse.state==='death'&&corpse.frame===6));
  await step(.6);
  state=await snapshot();
  assert.ok(state.corpses.some(corpse=>corpse.boss&&corpse.row===8&&corpse.state==='corpse'&&corpse.frame===7));
  await page.locator('#enterBtn').click();
  state=await snapshot();
  assert.deepEqual({town:state.town,act:state.act,floor:state.floor},{town:true,act:3,floor:0});

  assert.equal(state.spriteStatus,'ready');
  assert.equal(assets.get('file_00000000856882099666f57bd54d2176.png'),200);
  assert.equal(assets.get('file_0000000079208209bcc6152b2280e786.png'),200);
  assert.deepEqual(errors,[]);

  const webgl=await page.locator('#world').evaluate(canvas=>(canvas.getContext('webgl2')||canvas.getContext('webgl'))?.getParameter(7938));
  assert.ok(webgl);
  console.log(JSON.stringify({webgl,assets:Object.fromEntries(assets),act1Completed:true,act2Completed:true,spiderMinions:spiderMinions.length,finalState:state,errors},null,2));
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
