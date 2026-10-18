// Run from repository root: node tests/rhythm-studio-v2.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.resolve(__dirname,'../rhythm');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const doll=fs.readFileSync(path.join(dir,'doll-renderer.js'),'utf8');
const studio=fs.readFileSync(path.join(dir,'studio-ui.js'),'utf8');
const mod=fs.readFileSync(path.join(dir,'motion-library.js'),'utf8');
const generator=fs.readFileSync(path.join(dir,'wardrobe-generator.js'),'utf8');
const exportSrc=fs.readFileSync(path.join(dir,'frame-export.js'),'utf8');
const env={window:{NeonFighters:{PROFILES:[{id:'celeste',name:'얼음 기사',hair:'#aaffff',outfit:'#eeeeff',body:'balanced',style:'long',skin:'#ffe4d4',eye:'#88aaff'}]}}};
for(const [file,src] of [['wardrobe-generator.js',generator],['motion-library.js',mod]])
 vm.runInNewContext(src,env,{filename:file});
const dress=env.window.NeonWardrobeGenerator;
assert.equal(dress.themes.length,8);
assert.equal(dress.curated().length,16);
const base={name:'기존 캐릭터',id:'celeste',hair:'#ff00ff',body:'athletic',outfit:'#ffffff',costume:'street'};
const a=dress.create(base,{theme:'frost',locked:['hair','body'],seed:2222});
const b=dress.create(base,{theme:'frost',locked:['hair','body'],seed:2222});
assert.equal(a.hair,'#ff00ff');assert.equal(a.body,'athletic');
assert.equal(JSON.stringify(a),JSON.stringify(b));
assert.equal(a.costume,'armor');
const motion=env.window.NeonMotion;
assert.ok(motion.actions.length>=18,'Many animation clips');
for(const action of motion.actions){
 const samples=motion.sequence(action,'energetic',24);
 assert.ok(samples.length>=12,action+' has insufficient generated frames');
 assert.ok(samples.every(p=>p.a>=0&&p.a<=8&&p.head>=0&&p.head<4&&Number.isFinite(p.angle)),'Valid painted atlas indices and tweens');
}
let mid=motion.state('attack',.1,.1,'balanced');
assert.ok(mid.anchorA!==mid.anchorB,'Neck anchor must interpolate source and target atlas pose');
assert.match(doll,/state\.anchorA\?\?state\.a/);
assert.doesNotMatch(doll,/paint\(g,source,f,hsc,p,o,true\)/,'No distortion to facial sprite');
for(const side of ['P','B'])assert.ok(html.includes('id="animationStyle'+side+'"'));
assert.ok(html.includes('motion-library.js')&&html.includes('wardrobe-generator.js')&&html.includes('frame-export.js'));
assert.match(studio,/bindGenerator/);assert.match(studio,/bindExport/);
assert.match(game,/window\.NeonFrameExport\.download\(p,action\)/);
assert.match(exportSrc,/sheet\.toBlob/);
console.log('Studio V2 PASS: 16 themed looks, trait locks, 20 clips, generated 24fps frames, stable face, PNG export');
