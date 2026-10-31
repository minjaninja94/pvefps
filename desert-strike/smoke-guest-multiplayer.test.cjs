'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'desert-member.js'),'utf8').replace('import(SDK)','Promise.resolve({createClient:()=>window.__client})');
const adapter=fs.readFileSync(path.join(__dirname,'supabase-room-adapter.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const network=fs.readFileSync(path.join(__dirname,'tri-lane-network.js'),'utf8');
function fixture(enabled=true){
 let current=null, anonymousCalls=0;
 const rpcCalls=[];
 const user={id:'anonymous-test-uid',is_anonymous:true,identities:[]};
 const client={
  auth:{
   async getSession(){return {data:{session:current},error:null};},
   async signInAnonymously(){anonymousCalls++;if(!enabled)return {error:{message:'Anonymous sign-ins are disabled'}};current={user,access_token:'test-auth-token'};return {data:{session:current},error:null};},
   async getUser(){return {data:{user},error:null};}
  },
  async rpc(name,args){
   rpcCalls.push({name,args});
   if(name==='desert_join_match')return {data:{room:args.p_code,registered:true},error:null};
   if(name==='desert_lobby_create')return {data:{host:user.id,status:'lobby'},error:null};
   return {data:null,error:null};
  },
  from(table){
   return {
    select(){return {eq(){return {async maybeSingle(){return {data:null,error:null}}}}}}
   };
  }
 };
 const elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{id,textContent:'',hidden:false,toggleAttribute(){}});return elements.get(id)};
 const document={readyState:'loading',getElementById:element,addEventListener(){}};
 const window={__client:client,document,location:{origin:'https://example.test',pathname:'/desert-strike/'},localStorage:{getItem(){return null},setItem(){}},addEventListener(){},
  DesertSkinShop:{setAccount(){}},DesertCareer:{setMode(){},render(){},setLadders(){}},DesertLobby:{importProgress(){}}};
 const env={window,document,Promise,Date,Math,Array,JSON,Object,Error,Map,Set,structuredClone,setInterval,clearInterval,setTimeout,clearTimeout};
 vm.runInNewContext(src,env,{filename:'desert-member.js'});
 vm.runInNewContext(adapter,env,{filename:'supabase-room-adapter.js'});
 return {member:window.DesertMember,rooms:window.DesertSupabaseRooms,client,rpcCalls,anonCount:()=>anonymousCalls};
}
(async()=>{
 assert.match(html,/lobby-guest-multi-note/,'guest multiplayer must be discoverable');
 assert.match(html,/careerGuest" class="btn outline">게스트로 바로 플레이/);
 assert.doesNotMatch(network,/Firebase 네트워크 모듈이 아직 준비되지 않았습니다/);
 const guest=fixture();
 assert.equal(guest.member.account(),null,'guest does not own member-only data');
 const one=await guest.member.onlineSession();
 assert.equal(one.uid,'anonymous-test-uid');
 assert.equal(guest.anonCount(),1,'guest receives a real authenticated anonymous Supabase user');
 const two=await guest.rooms.identity();
 assert.equal(two.uid,one.uid,'P2P room uses the same anonymous identity');
 assert.equal(guest.anonCount(),1,'room operation must reuse anonymous session');
 const r=await guest.member.joinMatch({code:'ABC234',mode:'pvp',size:1,team:0,host:true});
 assert.equal(r.ok,true,'anonymous guests can join multiplayer match tracking');
 assert.ok(guest.rpcCalls.some(c=>c.name==='desert_join_match'));
 const db=await guest.rooms.ready();
 const roomRef=db.fs.doc(db.db,'desertRooms','ABC234');
 await db.fs.setDoc(roomRef,{mode:'pvp',size:1,ruleset:'standard',seed:1,publicRoom:true,players:{[db.uid]:{name:'Guest',faction:0,skin:'default',team:0,ready:false}}});
 assert.ok(guest.rpcCalls.some(c=>c.name==='desert_lobby_create'),'anonymous guests create signed server room');
 assert.ok(!guest.rpcCalls.some(c=>c.name==='desert_discord_claim_member'),'guest never requires Discord OAuth');
 assert.equal(guest.member.account(),null,'anonymous multiplayer does not upgrade to game membership');
 const blocked=fixture(false);
 await assert.rejects(blocked.member.onlineSession(),/Anonymous Sign-Ins/,'disabled setting must show actionable error');
 console.log('Anonymous guest multiplayer login and room creation passed, no Discord or account needed.');
})().catch(e=>{console.error(e);process.exitCode=1});
