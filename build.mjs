import {readFile,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
for(const file of ['game.js','cloud-ranking.js','firebase-config.js','goablo/game.js','goablo/data/database.js','goablo/vendor/three.module.js']){const content=await readFile(path.join(root,file),'utf8');const p=spawnSync(process.execPath,['--input-type=module','--check'],{input:content,stdio:['pipe','inherit','inherit']});if(p.status)process.exit(p.status);}
for(const page of ['index.html','fps.html','goablo/index.html']){const html=await readFile(path.join(root,page),'utf8');for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){const value=m[1];if(!value.includes(':'))await access(path.resolve(root,path.dirname(page),value));}}
console.log('Game entrypoints, local assets and JavaScript syntax checked. No gameplay or effect tests were run.');
