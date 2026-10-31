'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname,read=file=>fs.readFileSync(path.join(root,file),'utf8');
function mount(persistedMember){
 const nodes=new Map(),storage=new Map(),calls=[],accountEvents=[];
 const el=id=>{
  if(!nodes.has(id))nodes.set(id,{id,textContent:'',dataset:{},hidden:false,
   toggleAttribute(){},addEventListener(){},classList:{add(){},remove(){},contains(){return false}}});
  return nodes.get(id);
 };
 let wallet={points:3000,owned:[]};
 const db={
  auth:{getSession:async()=>({data:{session:persistedMember?{user:{id:'test-member'}}:null},error:null})},
  from:table=>({select:()=>({eq:()=>({maybeSingle:async()=>({
   data:table==='desert_web_members'?persistedMember:table==='desert_ranked_scores'?{rating:1000,wins:0,losses:0}:null,error:null
  })})})}),
  rpc:async(name,args)=>{
   calls.push({name,args});
   if(name==='desert_skin_state')return {data:wallet,error:null};
   if(name==='desert_rank_ladder')return {data:[],error:null};
   if(name==='desert_begin_solo_skin')return {data:{runId:args.p_run_id,difficulty:args.p_difficulty},error:null};
   if(name==='desert_finish_solo_skin'){
    if(args.p_won)wallet={...wallet,points:wallet.points+150};
    return {data:{reward:args.p_won?150:0,wallet},error:null};
   }
   throw Error('Unexpected RPC '+name);
  }
 };
 const window={
  addEventListener(){},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val)},
  crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},
  DesertSkinShop:{setAccount:(id,details)=>accountEvents.push({id,details})},
  DesertCareer:{setMode(){},render(){},setLadders(){},setServerRating(){}},
  DesertLobby:{importProgress(){},exportProgress(){return null;},useGuestProfile(){}}
 };
 const document={readyState:'loading',getElementById:el,addEventListener(){}};
 const src=read('desert-member.js').replace('import(SDK)','Promise.resolve({createClient:()=>db})');
 vm.runInNewContext(src,{window,document,db,console,Date,Promise,setTimeout,clearTimeout},{filename:'desert-member.js'});
 return {member:window.DesertMember,el,calls,accountEvents};
}
test('restored logged-in practice registers an owned run and awards points after a win',async()=>{
 const fixture=mount({user_id:'test-member',username:'test',nickname:'QA',selected_faction:0,selected_skin:'default'});
 assert.equal(fixture.member.account(),null,'simulate pressing practice before asynchronous login restoration');
 assert.equal(await fixture.member.beginSolo('hard','multi'),true);
 assert.equal(fixture.member.account().userId,'test-member');
 assert.equal(fixture.calls.filter(x=>x.name==='desert_begin_solo_skin').length,1);
 await fixture.member.finishSolo(true,'multi');
 assert.match(fixture.el('multiSkinReward').textContent,/150 P 지급 완료/);
 assert.equal(fixture.accountEvents.at(-1).details.points,3150);
 await fixture.member.finishSolo(true,'multi');
 assert.equal(fixture.calls.filter(x=>x.name==='desert_finish_solo_skin').length,1,'no duplicate payment');
});
test('guest practice preserves free play but clearly states no point reward',async()=>{
 const fixture=mount(null);
 assert.equal(await fixture.member.beginSolo('normal','multi'),true);
 assert.equal(fixture.calls.some(x=>x.name==='desert_begin_solo_skin'),false);
 assert.match(fixture.el('multiSkinReward').textContent,/게스트 경기/);
 await fixture.member.finishSolo(true,'multi');
 assert.match(fixture.el('multiSkinReward').textContent,/게스트 경기는 승패 기록만 저장/);
 assert.equal(fixture.calls.some(x=>x.name==='desert_finish_solo_skin'),false);
});
test('3-line result dialog stays visible before practice reward settlement and auth status is explicit',()=>{
 const ui=read('tri-lane-ui.js'),report=read('battle-report.js'),lobby=read('front-lobby.js'),html=read('index.html');
 const start=ui.indexOf('if(v.ended){'),end=ui.indexOf('renderAugment();',start),done=ui.slice(start,end);
 assert.ok(done.indexOf('showMulti?.(v,myId,{practice:!!practice')>=0);
 assert.ok(done.indexOf('showMulti?.(')<done.indexOf('finishSolo?.('),'show reward label before async RPC can modify it');
 assert.match(ui,/finishSolo\?\.\(v\.winner===side,'multi'\)/);
 assert.match(report,/practice=false/);
 assert.match(report,/게스트 연습: 승패 기록만 저장/);
 assert.match(lobby,/로그인 필요 · /);
 assert.ok(html.includes('desert-member.js?v=practice-reward-visible1'));
});
