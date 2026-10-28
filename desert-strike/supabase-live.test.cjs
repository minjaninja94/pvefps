'use strict';
const assert=require('node:assert/strict');const crypto=require('node:crypto');
const API='https://gshcrhfqpkkcwinrbqjm.supabase.co';
const KEY='sb_publishable_w5JXAnoVsKky54QgiAPtAg_UyzmZAli';
const suffix=crypto.randomBytes(5).toString('hex'),password=crypto.randomBytes(21).toString('base64url')+'A9';
const users=['qa_'+suffix+'a','qa_'+suffix+'b'];
async function call(url,body,token){
 const r=await fetch(API+url,{method:'POST',headers:{'content-type':'application/json','apikey':KEY,...(token?{'Authorization':'Bearer '+token}:{})},body:JSON.stringify(body)});
 const txt=await r.text();let data;try{data=JSON.parse(txt)}catch(_){data=txt}
 return {status:r.status,ok:r.ok,data};
}
async function member(id){
 let r=await call('/functions/v1/desert-signup',{username:id,password,nickname:'QA테스터'});
 assert.equal(r.status,201,'signup '+id+': '+JSON.stringify(r.data));
 const t=await call('/auth/v1/token?grant_type=password',{email:id+'@accounts.desertfront.invalid',password});
 assert.equal(t.status,200,'login '+id+': '+JSON.stringify(t.data));
 assert.ok(t.data.access_token,'token exists');return t.data;
}
async function rpc(token,fn,body){
 let r=await call('/rest/v1/rpc/'+fn,body,token.access_token);
 assert.ok(r.ok,fn+': HTTP '+r.status+' '+JSON.stringify(r.data));return r.data;
}
(async()=>{
 const a=await member(users[0]),b=await member(users[1]);
 const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',room=Array.from(crypto.randomBytes(6),n=>chars[n%chars.length]).join('');
 await rpc(a,'desert_join_match',{p_code:room,p_mode:'pvp',p_size:1,p_team:0,p_host:true});
 await rpc(b,'desert_join_match',{p_code:room,p_mode:'pvp',p_size:1,p_team:1,p_host:false});
 await rpc(a,'desert_start_match',{p_code:room});
 const before=await rpc(b,'desert_ping_match',{p_code:room});
 assert.equal(before.state,'playing');
 const result=await rpc(a,'desert_forfeit_match',{p_code:room});
 assert.equal(result.winner_team,1);
 const after=await rpc(b,'desert_my_match',{p_code:room});
 assert.equal(after.state,'done');assert.equal(after.winner_team,1);
 const res=await fetch(API+'/rest/v1/desert_ranked_scores?select=user_id,rating,wins,losses',{headers:{'apikey':KEY,'Authorization':'Bearer '+b.access_token}});
 assert.equal(res.status,200);
 const rows=await res.json();
 const rowA=rows.find(x=>x.user_id===a.user.id),rowB=rows.find(x=>x.user_id===b.user.id);
 assert.equal(rowA.rating,976);assert.equal(rowA.losses,1);
 assert.equal(rowB.rating,1024);assert.equal(rowB.wins,1);
 await rpc(a,'desert_forfeit_match',{p_code:room});
 const res2=await fetch(API+'/rest/v1/desert_ranked_scores?select=user_id,rating,wins,losses',{headers:{'apikey':KEY,'Authorization':'Bearer '+b.access_token}});
 const check=await res2.json();
 assert.equal(check.find(x=>x.user_id===b.user.id).wins,1,'idempotent forfeit');
 console.log('SUPABASE LIVE E2E PASS',JSON.stringify({qaUsers:users,room,memberId:a.user.id,opponentId:b.user.id,winner:1,idempotent:true}));
})().catch(e=>{console.error('SUPABASE LIVE E2E ERROR',e.stack||e);process.exitCode=1;console.error('QA USERS',users.join(','));});