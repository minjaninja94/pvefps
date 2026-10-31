'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const raw=fs.readFileSync(path.join(__dirname,'desert-member.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const sql=fs.readFileSync(path.join(__dirname,'sql/desert_discord_member_v1.sql'),'utf8');
assert.match(raw,/detectSessionInUrl:true/,'OAuth session must be recovered after redirect');
assert.match(sql,/auth\.identities/);
assert.match(sql,/i\.provider='discord'/);
assert.match(sql,/revoke all on function .* from public, anon/);
for(const id of ['careerDiscordLogin','careerDiscordLink','careerDiscordConnected','careerDiscordSetup','careerDiscordUsername','careerDiscordNickname','careerDiscordFinish'])assert.ok(html.includes('id="'+id+'"'),id+' missing in login UI');
function setup({member=false,discord=false,guestProgress=null}={}){
 const state={
  user:{id:'stable-user-id',identities:discord?[{provider:'discord'}]:[{provider:'email'}]},
  memberRow:member?{user_id:'stable-user-id',username:'original_id',nickname:'Old Name',xp:450,wins:4,losses:2,mp_wins:3,mp_losses:1,selected_faction:0,selected_skin:'default',ai_difficulty:'normal'}:null,
  oauthCalls:[],links:[],claimCalls:[],imported:[],skinAccount:[],mode:'',modalOpens:0
 };
 const elements=new Map();
 function el(id){
  if(!elements.has(id))elements.set(id,{id,textContent:'',value:'',hidden:false,dataset:{},listeners:{},
   toggleAttribute(name,yes){if(name==='hidden')this.hidden=!!yes;},
   addEventListener(name,fn){this.listeners[name]=fn;}
  });
  return elements.get(id);
 }
 const document={readyState:'loading',getElementById:el,addEventListener(){}};
 const mock={
  auth:{
   async getSession(){return {data:{session:{user:state.user,access_token:'mock'}},error:null};},
   async getUser(){return {data:{user:state.user},error:null};},
   async signInWithOAuth(params){state.oauthCalls.push(params);return {error:null};},
   async linkIdentity(params){state.links.push(params);return {error:null};},
   async signOut(){return {error:null};}
  },
  from(table){
   return {
    select(){return {eq(){return {async maybeSingle(){return {data:table==='desert_web_members'?state.memberRow:null,error:null};}};}};},
    update(next){return {async eq(){state.memberRow={...state.memberRow,...next};return {error:null};}};}
   };
  },
  async rpc(name,args){
   if(name==='desert_discord_claim_member'){
    state.claimCalls.push(args);
    if(!state.user.identities.some(i=>i.provider==='discord'))return {error:new Error('not Discord')};
    state.memberRow={user_id:state.user.id,username:args.p_username,nickname:args.p_nickname,xp:0,wins:0,losses:0,mp_wins:0,mp_losses:0,selected_faction:0,selected_skin:'default',ai_difficulty:'normal'};
    return {data:state.memberRow,error:null};
   }
   return {data:name==='desert_skin_state'?{points:3000,owned:[]}:[],error:null};
  }
 };
 const localStorage={getItem(){return null;},setItem(){}};
 const win={
  document,localStorage,location:{origin:'https://example.test',pathname:'/desert-strike/'},__mockClient:mock,
  DesertSkinShop:{setAccount(...p){state.skinAccount.push(p);},resolve:()=>({id:'default'}),owns:()=>true},
  DesertCareer:{setMode(m){state.mode=m;},render(){},open(){state.modalOpens++;},close(){},setLadders(){},setServerRating(){}},
  DesertLobby:{exportProgress(){return guestProgress;},importProgress(p){state.imported.push(p);},useGuestProfile(){}},
  addEventListener(){},
 };
 const source=raw.replace('import(SDK)','Promise.resolve({createClient:()=>window.__mockClient})');
 vm.runInNewContext(source,{window:win,document,Promise,Date,Array,JSON,Object,Error,Math,setTimeout,clearTimeout});
 return {api:win.DesertMember,state,el};
}
(async()=>{
 let ctx=setup();
 await ctx.api.signInDiscord();
 assert.equal(ctx.state.oauthCalls[0].provider,'discord');
 assert.equal(ctx.state.oauthCalls[0].options.redirectTo,'https://example.test/desert-strike/');
 await assert.rejects(ctx.api.finishDiscordSignup('test_id','Nick'),/Discord 인증/);

 ctx=setup({member:true});
 await ctx.api.restore();
 assert.equal(ctx.api.account().userId,'stable-user-id');
 assert.equal(ctx.api.account().username,'original_id');
 await assert.rejects(ctx.api.signInDiscord(),/기존 회원/);
 await ctx.api.linkDiscord();
 assert.equal(ctx.state.links.length,1,'existing member must link, never sign into a new user');
 assert.equal(ctx.state.links[0].provider,'discord');
 assert.equal(ctx.state.oauthCalls.length,0);
 assert.equal(ctx.state.memberRow.xp,450,'linking must preserve member progression');
 assert.equal(ctx.state.memberRow.mp_wins,3);

 ctx=setup({discord:true});
 await ctx.api.restore();
 assert.equal(ctx.api.account(),null,'Discord user cannot impersonate an existing game member');
 assert.equal(ctx.state.modalOpens,1,'new OAuth user needs explicit game username selection');
 await assert.rejects(ctx.api.finishDiscordSignup('x','Nick'),/아이디는/);
 const result=await ctx.api.finishDiscordSignup('discord_new','Discord Nick');
 assert.equal(result.userId,'stable-user-id');
 assert.equal(ctx.state.claimCalls.length,1);
 assert.equal(ctx.state.claimCalls[0].p_username,'discord_new');
 assert.equal(ctx.api.account().nickname,'Discord Nick');
 assert.equal(ctx.state.memberRow.user_id,'stable-user-id');
 assert.equal(ctx.el('careerDiscordSetup').hidden,true);
 assert.equal(ctx.el('careerDiscordConnected').hidden,false);
 console.log('Discord OAuth, existing account link, and new member onboarding smoke passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
