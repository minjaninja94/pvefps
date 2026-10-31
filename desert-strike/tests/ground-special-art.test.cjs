const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'../assets/sprites'),manifest=require('../assets/sprites/ground-special-manifest.json');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
test('all 48 default, moe and faction skin replacements retain their generated ground sources',()=>{
 assert.equal(manifest.sets,48);assert.equal(manifest.poses,384);assert.equal(manifest.entries.length,48);
 for(const faction of [3,4,6,7]){
  const rows=manifest.entries.filter(x=>x.faction===faction);assert.equal(rows.length,12);
  const source=require(path.join(root,'sources/ground-special/faction-'+faction+'-manifest.json'));
  assert.equal(hash(source.source),source.source_sha256);assert.equal(source.rows.length,13);assert.equal(source.columns.length,9);
  assert.equal(new Set(rows.map(x=>x.skin)).size,12);
  for(const row of rows){assert.equal(row.kind,'ground');assert.equal(hash(row.file),row.sha256);}
 }
});
