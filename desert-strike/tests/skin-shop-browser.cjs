const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
 const profile={user_id:'skin-test-account',username:'skin_test',nickname:'스킨 검증',xp:0,wins:0,losses:0,mp_wins:0,mp_losses:0,selected_faction:0,selected_skin:'default',ai_difficulty:'normal'};
 let logged=false,points=3000,initialized=false,purchases=0;const owned=new Set(),runs=new Map(),multiRewards=new Map();let activeMatch='',failNextSolo=false;
 const state=()=>({points,owned:[...owned],grant:initialized?0:3000});
 const sdk=`export function createClient(){
 const req=async(op,args)=>{const r=await fetch('http://127.0.0.1:8765/__skin_test__',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op,args})});return r.json();};
 return {auth:{getSession:()=>req('session'),signInWithPassword:()=>req('login'),signOut:()=>req('logout')},
 from:table=>({select:()=>({eq:()=>({maybeSingle:()=>req('select',table)})}),update:values=>({eq:()=>req('update',values)})}),rpc:(name,args)=>req(name,args)};
 }`;
 page.on('pageerror',e=>{if(!e.message.includes('Failed to fetch dynamically imported module'))errors.push(e.message);});
 await page.route('**/*',async route=>{
  const url=route.request().url();
  if(url.startsWith('https://esm.sh/@supabase/supabase-js@'))return route.fulfill({contentType:'text/javascript',body:sdk,headers:{'access-control-allow-origin':'*'}});
  if(url.includes('/__skin_test__')){
   const {op,args}=route.request().postDataJSON();let result={data:null,error:null};
   if(op==='session')result.data={session:logged?{user:{id:profile.user_id},access_token:'fixture'}:null};
   else if(op==='login'){logged=true;result.data={user:{id:profile.user_id}};}
   else if(op==='logout')logged=false;
   else if(op==='select')result.data=args==='desert_web_members'?profile:{rating:1000,wins:0,losses:0};
   else if(op==='update'){Object.assign(profile,args);}
   else if(op==='desert_rank_ladder')result.data=[];
   else if(op==='desert_skin_state'){result.data=state();initialized=true;}
   else if(op==='desert_begin_solo_skin'){runs.set(args.p_run_id,{difficulty:args.p_difficulty,done:false,reward:0});result.data={runId:args.p_run_id,difficulty:args.p_difficulty};}
   else if(op==='desert_finish_solo_skin'){
    if(failNextSolo){failNextSolo=false;return route.fulfill({contentType:'application/json',body:JSON.stringify({data:null,error:{message:'temporary network error',code:'NETWORK'}})});}
    const r=runs.get(args.p_run_id);if(!r)result.error={message:'진행한 대전 없음'};
    else {if(!r.done){r.done=true;r.reward=args.p_won?({easy:50,normal:100,hard:150,veryhard:200,impossible:250}[r.difficulty]):0;points+=r.reward;}result.data={reward:r.reward,wallet:state()};}
   }
   else if(op==='desert_join_match'){activeMatch=args.p_code;result.data={state:'lobby'};}
   else if(op==='desert_start_match')result.data={state:'playing'};
   else if(op==='desert_report_match_result'){if(!multiRewards.has(activeMatch)){const reward=args.p_winner===0?500:200;multiRewards.set(activeMatch,reward);points+=reward;}result.data={state:'done',winner_team:args.p_winner};}
   else if(op==='desert_match_skin_reward')result.data={reward:multiRewards.get(args.p_code)||0,wallet:state()};
   else if(op==='desert_buy_skin'){
    purchases++;const id=args.p_skin,base=id.split('~')[0],price=id.includes('~')?200:1000;
    if(!logged)result.error={message:'로그인 필요'};
    else if(!owned.has(id)){
     if(id.includes('~')&&!['default','moe'].includes(base)&&!owned.has(base))result.error={message:'기본 스킨 먼저 해금'};
     else if(points<price)result.error={message:'스킨 포인트가 부족합니다.'};
     else {points-=price;owned.add(id);}
    }
    result.data=state();
   }
   return route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
  }
  if(url.startsWith('http://127.0.0.1:8765/'))return route.continue();
  return route.abort();
 });
 await page.goto('http://127.0.0.1:8765/desert-strike/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.DesertLobby&&window.DesertSkinShop);
 assert.equal(await page.locator('#lobbyFactionDialog').isVisible(),false);
 await page.locator('#lobbyFactionOpen').click();
 assert.equal(await page.locator('#lobbyFactionDialog [data-faction]').count(),10);
 assert.ok((await page.locator('#lobbyFactionDialog').boundingBox()).width>1000,'faction dialog escapes old 550px help-dialog cap');
 await page.locator('#lobbyFactionDialog [data-faction="7"]').click();
 assert.equal(await page.locator('#lobbyFactionDialog').isVisible(),false);
 await page.waitForFunction(()=>document.activeElement?.id==='lobbyFactionOpen');
 assert.match(await page.locator('#lobbySelectedFaction').innerText(),/크롬/);
 await page.locator('#lobbyFactionOpen').click();await page.locator('#lobbyFactionDialog [data-faction="0"]').click();
 await page.locator('#lobbySkinOpen').click();
 await page.keyboard.press('Escape');assert.equal(await page.locator('#lobbySkinDialog').isVisible(),false);
 await page.locator('#lobbySkinOpen').click();
 assert.ok((await page.locator('#lobbySkinDialog').boundingBox()).width>1000,'skin dialog uses enlarged viewport width');
 assert.equal(await page.locator('.lobby-skin-item').count(),12);
 assert.equal(await page.locator('[data-chroma]').count(),132);
 assert.equal(await page.evaluate(()=>{DesertLobby.grantXP(100000);return DesertLobby.chooseSkin('blood-iron');}),false);
 await page.evaluate(()=>DesertMember.login('skin_test','password-fixture'));
 await page.waitForFunction(()=>DesertSkinShop.snapshot().ready);
 assert.match(await page.locator('#skinWallet').innerText(),/3,000/);
 assert.equal(await page.locator('#lobbySkinPoints').innerText(),'3,000 P');
 assert.equal(await page.locator('#lobbySkinPoints').evaluate(e=>getComputedStyle(e).fontSize),await page.locator('#lobbyRankWL').evaluate(e=>getComputedStyle(e).fontSize));
 await page.waitForFunction(()=>DesertSkinArt.loadedCount('blood-iron')===10);
 const original=await page.locator('[data-shop-art="blood-iron"]').evaluate(c=>c.toDataURL());
 const colored=[];
 for(const chroma of await page.evaluate(()=>DesertSkinShop.CHROMAS.filter(c=>c.id!=='original').map(c=>c.id))){
  await page.locator('[data-base="blood-iron"][data-chroma="'+chroma+'"]').click();
  colored.push(await page.locator('[data-shop-art="blood-iron~'+chroma+'"]').evaluate(c=>c.toDataURL()));
 }
 assert.equal(new Set(colored).size,10,'all ten chromas change the actual image differently');
 await page.locator('[data-base="blood-iron"][data-chroma="gold"]').click();
 const gold=await page.locator('[data-shop-art="blood-iron~gold"]').evaluate(c=>c.toDataURL());assert.notEqual(gold,original,'chroma changes actual pixels');
 await page.locator('[data-buy-skin="blood-iron"]').click();
 await page.waitForFunction(()=>DesertSkinShop.owns('blood-iron'));
 assert.equal(points,2000);
 await page.evaluate(()=>{const b=document.querySelector('[data-buy-skin="blood-iron~gold"]');b.click();b.click();});
 await page.waitForFunction(()=>DesertLobby.selectedSkin()==='blood-iron~gold');
 assert.equal(await page.locator('#lobbySkinPoints').innerText(),'1,800 P');
 assert.equal(points,1800);assert.equal(purchases,2,'double click never buys twice');
 await page.locator('[data-preview-skin="blood-iron~gold"]').click();
 assert.equal(await page.locator('[data-preview-select]').count(),10);
 await page.locator('[data-preview-action="pose-7"]').click();await page.keyboard.press('Escape');
 assert.equal(await page.locator('#lobbySkinDialog').isVisible(),true,'Escape closes nested preview before shop');
 await page.waitForTimeout(650);assert.equal(profile.selected_skin,'blood-iron~gold');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>DesertMember.account()&&DesertSkinShop.owns('blood-iron~gold')&&DesertLobby.selectedSkin()==='blood-iron~gold');
 await page.locator('#lobbySkinOpen').click();
 assert.match(await page.locator('#skinWallet').innerText(),/1,800/);
 assert.equal(await page.evaluate(()=>{DesertLobby.chooseFaction(1);return DesertLobby.chooseSkin('blood-iron~gold');}),false);
 await page.evaluate(()=>DesertLobby.chooseFaction(0));
 await page.locator('#skinWallet').scrollIntoViewIfNeeded();
 await page.screenshot({path:'skin-shop-browser.png'});
 await page.setViewportSize({width:390,height:844});
 const widths=await page.locator('#lobbySkins').evaluate(e=>({content:e.scrollWidth,width:e.clientWidth}));assert.ok(widths.content<=widths.width+1,'mobile chromas fit the enlarged card grid');
 assert.equal(await page.locator('[data-chroma]').evaluateAll(buttons=>buttons.every(b=>b.scrollWidth<=b.clientWidth+1)),true,'individual chroma labels fit on mobile');
 await page.evaluate(async()=>{
  for(const difficulty of ['easy','normal','hard','veryhard','impossible']){await DesertMember.beginSolo(difficulty);await DesertMember.finishSolo(true);await DesertMember.finishSolo(true);}
 });
 assert.equal(points,2550,'all five victory rewards paid once');
 await page.evaluate(async()=>{await DesertMember.beginSolo('impossible');await DesertMember.finishSolo(false);});assert.equal(points,2550,'AI losses do not pay');
 await page.evaluate(()=>DesertMember.beginSolo('easy'));failNextSolo=true;
 await page.evaluate(()=>DesertLobby.completeSolo({win:true,wave:5,seconds:100}));
 await page.waitForFunction(()=>document.querySelector('#soloSkinReward').textContent.includes('지급 대기'));
 assert.equal(points,2550,'failed reward response remains pending');
 await page.evaluate(()=>DesertMember.retrySoloRewards());assert.equal(points,2600,'pending victory reward is retried once');
 await page.evaluate(async()=>{await DesertMember.joinMatch({code:'RWDABC',mode:'classic',size:1,team:0,host:true});await DesertMember.startMatch();await DesertMember.reportResult(0);await DesertMember.reportResult(0);});assert.equal(points,3100,'confirmed multiplayer win pays once');
 await page.evaluate(async()=>{await DesertMember.joinMatch({code:'RWDBCD',mode:'pvp',size:1,team:0,host:true});await DesertMember.startMatch();await DesertMember.reportResult(1);});assert.equal(points,3300,'confirmed multiplayer loss pays 200');
 assert.equal(await page.evaluate(()=>DesertSkinShop.snapshot().points),3300,'wallet reflects match rewards');
 assert.equal(await page.locator('#lobbySkinPoints').innerText(),'3,300 P');
 await page.evaluate(()=>DesertMember.logout());
 assert.equal(await page.evaluate(()=>DesertSkinShop.owns('blood-iron~gold')),false);
 assert.equal(await page.evaluate(()=>DesertLobby.selectedSkin()),'default');
 assert.deepEqual(errors,[]);
 console.log('Shop and rewards browser passed: guest locks, point grant, chroma pixels, base/chroma purchase, duplicate click, account persistence, faction restriction and logout isolation.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
