import http from 'node:http';import {DatabaseSync} from 'node:sqlite';import {readFileSync,readdirSync,mkdirSync} from 'node:fs';import worker from '../dist/server/index.js';
mkdirSync('.data',{recursive:true});const sqlite=new DatabaseSync('.data/ranking.sqlite');sqlite.exec('PRAGMA foreign_keys=ON');sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations(name TEXT PRIMARY KEY)');
for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())if(!sqlite.prepare('SELECT name FROM local_migrations WHERE name=?').get(name)){sqlite.exec('BEGIN');try{sqlite.exec(readFileSync('drizzle/'+name,'utf8'));sqlite.prepare('INSERT INTO local_migrations(name) VALUES(?)').run(name);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}
const DB={
 prepare(query){
  return {bind(...values){
   const stmt=sqlite.prepare(query);
   return {
    async first(){return stmt.get(...values)||null;},
    async all(){return {results:stmt.all(...values)};},
    async run(){const r=stmt.run(...values);return {meta:{changes:Number(r.changes)}};}
   };
  }};
 }
};
const port=Number(process.env.PORT||8080);http.createServer(async(req,res)=>{try{const chunks=[];let length=0;for await(const c of req){length+=c.length;if(length>8192){res.writeHead(413);res.end();return;}chunks.push(c);}const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);const request=new Request('http://localhost:'+port+req.url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});const response=await worker.fetch(request,{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){console.error(e);res.writeHead(500);res.end('Server error');}}).listen(port,'127.0.0.1',()=>console.log('IRON SECTOR http://localhost:'+port));
