// ID + password + nickname. No real email collection. All secrets server-side.
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const base = Deno.env.get("SUPABASE_URL") || "";
const headers = {
 "Access-Control-Allow-Origin": "https://minjaninja94.github.io",
 "Access-Control-Allow-Methods":"POST,OPTIONS",
 "Access-Control-Allow-Headers":"apikey,authorization,content-type,x-client-info",
 "Vary":"Origin"
};
function reply(status:number,body:Record<string,unknown>){
 return new Response(JSON.stringify(body),{status,headers:{...headers,"content-type":"application/json;charset=utf-8","cache-control":"no-store"}});
}
async function admin(path:string,method:string,body?:unknown){
 return fetch(base+path,{method,headers:{"content-type":"application/json","apikey":service,"Authorization":"Bearer "+service},
 body:body===undefined?undefined:JSON.stringify(body)});
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply(405,{error:"허용되지 않은 요청입니다."});
 const origin=req.headers.get("origin");
 if(origin && origin!=="https://minjaninja94.github.io" && !/^http:\/\/localhost(:[0-9]+)?$/.test(origin))
  return reply(403,{error:"허용되지 않은 웹사이트입니다."});
 if(!base || !service)return reply(503,{error:"서버 인증 설정이 없습니다."});
 try{
  if(Number(req.headers.get("content-length")||0)>2048)return reply(413,{error:"입력 정보가 너무 깁니다."});
  const data=await req.json();
  const username=String(data?.username||"").trim().toLowerCase();
  const password=String(data?.password||"");
  const nickname=String(data?.nickname||"").trim();
  if(!/^[a-z0-9_]{4,20}$/.test(username))return reply(400,{error:"아이디는 영문 소문자·숫자·_ 4~20자여야 합니다."});
  if(password.length<8||password.length>72)return reply(400,{error:"비밀번호는 8~72자로 설정해 주세요."});
  if(nickname.length<1||Array.from(nickname).length>16||/[<>\u0000-\u001f]/.test(nickname))return reply(400,{error:"닉네임은 1~16자로 입력해 주세요."});
  const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const salted=new TextEncoder().encode(ip+"|"+service.slice(-40));
  const digest=await crypto.subtle.digest("SHA-256",salted);
  const key=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,"0")).join("");
  const limit=await admin("/rest/v1/rpc/desert_allow_signup","POST",{p_hash:key});
  if(!limit.ok)return reply(503,{error:"가입 제한 기능을 확인할 수 없습니다."});
  if(await limit.json()!==true)return reply(429,{error:"잠시 후 가입을 다시 시도해 주세요."});
  const existing=await admin("/rest/v1/desert_web_members?select=user_id&username=eq."+encodeURIComponent(username)+"&limit=1","GET");
  if(!existing.ok)return reply(503,{error:"아이디 사용 가능 여부를 조회하지 못했습니다."});
  if((await existing.json()).length)return reply(409,{error:"이미 사용 중인 아이디입니다."});
  const email=username+"@accounts.desertfront.invalid";
  const created=await admin("/auth/v1/admin/users","POST",{email,password,email_confirm:true,user_metadata:{nickname}});
  if(!created.ok){
   const err=await created.text();
   return reply(created.status===422||err.includes("already")?409:503,{error:err.includes("already")?"이미 사용 중인 아이디입니다.":"회원가입을 완료하지 못했습니다."});
  }
  const user=await created.json();
  if(!user?.id)return reply(503,{error:"회원 인증 정보를 만들지 못했습니다."});
  const inserted=await admin("/rest/v1/desert_web_members","POST",{user_id:user.id,username,nickname});
  if(!inserted.ok){
   await admin("/auth/v1/admin/users/"+user.id,"DELETE").catch(()=>{});
   return reply(inserted.status===409?409:503,{error:inserted.status===409?"이미 사용 중인 아이디입니다.":"프로필 저장에 실패했습니다."});
  }
  return reply(201,{ok:true,username,nickname});
 }catch(_){return reply(400,{error:"요청 형식을 확인해 주세요."});}
});
