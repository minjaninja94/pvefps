import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wav':'audio/wav','.json':'application/json','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(!['.html','.js','.css','.wav','.json','.svg'].includes(path.extname(file))||name.split('/').some(p=>p.startsWith('.'))){res.writeHead(404).end();return;}const content=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(content);}catch{res.writeHead(404).end('Not found');}}).listen(8080,'127.0.0.1',()=>console.log('Game select: http://localhost:8080'));
