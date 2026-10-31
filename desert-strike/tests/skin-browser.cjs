const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>{if(!e.message.includes('Failed to fetch dynamically imported module'))errors.push(e.message);});
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
 await page.goto('http://127.0.0.1:8765/desert-strike/',{waitUntil:'domcontentloaded'});
 await page.locator('#frontLobby').waitFor({state:'visible'});
 await page.waitForFunction(()=>window.DesertSkinCatalog&&window.DesertLobby&&window.DesertSkinArt);
 assert.equal(await page.evaluate(()=>DesertSkinCatalog.SKINS.length),100);
 const readySkins=await page.evaluate(()=>DesertSkinCatalog.SKINS.filter(s=>s.status==='ready').map(s=>({id:s.id,faction:s.faction})));
 for(const skin of readySkins){
  await page.evaluate(id=>DesertSkinArt.preload(id),skin.id);
  await page.waitForFunction(id=>DesertSkinArt.loadedCount(id)===10,skin.id);
  const failures=await page.evaluate(s=>{
   const failures=[];
   for(const role of DesertSkinArt.roles)for(let pose=0;pose<8;pose++){
    const c=DesertSkinArt.frame(s.id,s.faction,role,'pose-'+pose);
    if(!c||!Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).some((v,i)=>i%4===3&&v>0))failures.push(role+':'+pose);
   }
   return failures;
  },skin);
  assert.deepEqual(failures,[],skin.id+' renders every role and pose');
 }
 console.log('Verified '+readySkins.length+' ready skins, '+readySkins.length*10+' sheets and '+readySkins.length*80+' rendered poses.');
 assert.equal(await page.locator('[data-skin="blood-iron"]').isDisabled(),true);
 await page.locator('[data-preview-skin="blood-iron"]').click();
 await page.waitForFunction(()=>DesertSkinArt.loadedCount('blood-iron')===10);
 assert.equal(await page.locator('[data-preview-select]').count(),10);
 assert.equal(await page.locator('[data-preview-action^="pose-"]').count(),8);
 await page.locator('[data-preview-select="10"]').click();
 await page.locator('[data-preview-action="pose-0"]').click();
 await page.waitForTimeout(160);
 const idle=await page.locator('#skinPreviewCanvas').evaluate(c=>c.toDataURL());
 const hasPixels=await page.locator('#skinPreviewCanvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).some((v,i)=>i%4===3&&v>0));
 assert.ok(hasPixels,'locked skin renders real pixels');
 await page.locator('[data-preview-action="pose-7"]').click();
 await page.waitForTimeout(160);
 assert.notEqual(await page.locator('#skinPreviewCanvas').evaluate(c=>c.toDataURL()),idle,'death pose differs from idle');
 await page.screenshot({path:'skin-browser-preview.png'});
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#skinPreviewLayer').isHidden(),true);
 assert.equal(await page.evaluate(()=>{DesertLobby.grantXP(100000);return DesertLobby.chooseSkin('blood-iron');}),false,'XP does not grant paid skins');
 await page.evaluate(()=>DesertSkinShop.setAccount('browser-fixture',{points:2000,owned:['blood-iron']}));
 assert.equal(await page.evaluate(()=>DesertLobby.chooseSkin('blood-iron')),true);
 assert.equal(await page.evaluate(()=>DesertLobby.selectedSkin()),'blood-iron');
 assert.equal(await page.evaluate(()=>{DesertLobby.chooseFaction(1);return DesertLobby.chooseSkin('blood-iron');}),false);
 assert.equal(await page.evaluate(()=>{DesertLobby.chooseFaction(0);return DesertLobby.chooseSkin('blood-iron');}),true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.DesertLobby?.selectedSkin?.()==='default');
 await page.screenshot({path:'skin-browser-lobby.png'});
 assert.deepEqual(errors,[],'no application errors');
 console.log('Browser passed: locked preview, ten role sheets, eight poses, real pixels, faction restriction and rejection of unverified cached ownership.');
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
