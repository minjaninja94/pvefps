import {readFileSync,writeFileSync} from 'node:fs';
const id=process.argv[2];if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)){console.error('Usage: node scripts/configure-d1.mjs YOUR_D1_DATABASE_ID');process.exit(1);}
const config=JSON.parse(readFileSync('wrangler.json','utf8'));config.d1_databases=[{binding:'DB',database_name:'pvefps-ranking',database_id:id,migrations_dir:'drizzle'}];writeFileSync('wrangler.json',JSON.stringify(config,null,2)+'\n');console.log('D1 binding configured.');
