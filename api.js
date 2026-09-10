const VERSION=3;
function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function db(env){if(!env.DB)throw Error('랭킹 데이터베이스가 연결되지 않았습니다.');return env.DB;}
async function body(request){const text=await request.text();if(text.length>4096)throw Error('요청이 너무 큽니다.');return JSON.parse(text);}
function expectedKills(stage){const count=stage%5===0?4:4+stage;const kills=[0,0,0];for(let i=0;i<count;i++)kills[i%3]++;return kills;}
export async function api(request,env){const url=new URL(request.url),path=url.pathname;if(!path.startsWith('/api/'))return null;
try{
if(!['GET','POST'].includes(request.method))return json({error:'지원하지 않는 요청입니다.'},405);
if(request.method==='POST'&&request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json({error:'허용되지 않은 출처입니다.'},403);
const DB=db(env),now=Date.now();
if(path==='/api/leaderboard'&&request.method==='GET'){const rows=await DB.prepare('SELECT name,score,elapsed_ms AS elapsedMs FROM records WHERE version=? ORDER BY score DESC,elapsed_ms ASC,created_at ASC LIMIT 100').bind(VERSION).all();return json({rows:rows.results});}
if(path==='/api/runs'&&request.method==='POST'){const b=await body(request);if(b.version!==VERSION)return json({error:'새로고침 후 다시 시작해주세요.'},409);const id=crypto.randomUUID();await DB.prepare('INSERT INTO runs(id,version,started_at) VALUES(?,?,?)').bind(id,VERSION,now).run();return json({id,startedAt:now});}
const match=path.match(/^\/api\/runs\/([a-f0-9-]{36})(\/stage)?$/);
if(match){const run=await DB.prepare('SELECT * FROM runs WHERE id=? AND version=?').bind(match[1],VERSION).first();if(!run)return json({error:'플레이 기록을 찾지 못했습니다.'},404);
if(request.method==='GET'&&!match[2]){if(run.stage!==10)return json({error:'10스테이지 클리어 후 등록할 수 있습니다.'},409);return json({score:run.score,elapsedMs:run.elapsed_ms});}
if(request.method==='POST'&&match[2]){const b=await body(request),stage=b.stage;if(!Number.isInteger(stage)||stage<1||stage>10)return json({error:'스테이지 값이 잘못되었습니다.'},400);if(stage<=run.stage)return json({stage:run.stage,score:run.score});if(stage!==run.stage+1||now-run.started_at>86400000||now-run.started_at<stage*1000)return json({error:'스테이지 순서 또는 플레이 시간이 올바르지 않습니다.'},409);const expected=expectedKills(stage),bossStage=stage%5===0;
if(!Array.isArray(b.kills)||b.kills.length!==3||!b.kills.every((v,i)=>Number.isInteger(v)&&v===expected[i])||b.boss!==bossStage||!Number.isInteger(b.parts)||b.parts<0||b.parts>expected.reduce((a,v)=>a+v,0)*5||!Number.isInteger(b.bossParts)||b.bossParts<0||b.bossParts>(bossStage?7:0))return json({error:'클리어 기록의 수치가 올바르지 않습니다.'},400);
const points=1000+expected.reduce((n,v,i)=>n+v*[700,1500,4000][i],0)+b.parts*100+b.bossParts*500+(bossStage?(stage===10?40000:20000):0);
const result=await DB.prepare('UPDATE runs SET stage=?,score=score+?,finished_at=?,elapsed_ms=? WHERE id=? AND stage=?').bind(stage,points,stage===10?now:null,stage===10?now-run.started_at:null,run.id,stage-1).run();if(result.meta?.changes===0)return json({error:'기록 갱신 중입니다. 다시 시도해주세요.'},409);return json({stage,score:run.score+points});}}
if(path==='/api/leaderboard'&&request.method==='POST'){const b=await body(request),name=typeof b.name==='string'?b.name.trim():'';if(!name||[...name].length>16||/[\u0000-\u001f\u007f]/.test(name)||typeof b.id!=='string')return json({error:'이름을 1~16자로 입력하세요.'},400);const run=await DB.prepare('SELECT * FROM runs WHERE id=? AND version=? AND stage=10').bind(b.id,VERSION).first();if(!run||!run.elapsed_ms)return json({error:'완료된 랭킹 기록이 없습니다.'},409);await DB.prepare('INSERT INTO records(id,version,name,score,elapsed_ms,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(run.id,VERSION,name,run.score,run.elapsed_ms,now).run();return json({saved:true});}
return json({error:'요청을 찾지 못했습니다.'},404);
}catch(error){console.error('Ranking request failed:',error.message);return json({error:'랭킹 서버에서 기록을 처리하지 못했습니다. 잠시 후 다시 시도하세요.'},503);}}
