const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),catalog=require('../skin-catalog.js');
test('100 unique concepts, ten per faction, cosmetics only',()=>{
 assert.equal(catalog.SKINS.length,100);assert.equal(new Set(catalog.SKINS.map(s=>s.id)).size,100);
 for(let f=0;f<10;f++)assert.equal(catalog.SKINS.filter(s=>s.faction===f).length,10);
 for(const s of catalog.SKINS){assert.equal(s.filter,'none');assert.ok(!('damage'in s));assert.ok(!('hp'in s));assert.ok(!catalog.validFor(s.id,(s.faction+1)%10));}
 assert.ok(!catalog.validFor('not-a-skin',0));
});
function fixture(){
 const images=[],draws=[];
 class Image{constructor(){images.push(this);}set src(v){this.url=v;}good(w=384,h=192){this.naturalWidth=w;this.naturalHeight=h;this.onload();}}
 const w={DesertSkinCatalog:catalog,dispatchEvent(){}};
 const document={createElement:()=>({getContext:()=>({drawImage:(...args)=>draws.push(args)})})};
 vm.runInNewContext(fs.readFileSync(path.join(root,'blood-iron-art.js'),'utf8'),{window:w,Image,Event:class{},CustomEvent:class{},document});
 return {art:w.DesertSkinArt,images,draws};
}
test('lazy loading, specialist roles, eight exact poses and faction rejection',()=>{
 const {art,images,draws}=fixture();assert.equal(images.length,0);art.preload('blood-iron');assert.equal(images.length,10);
 assert.match(images[8].url,/sniper/);assert.match(images[9].url,/assassin/);images.forEach(i=>i.good());assert.equal(art.loadedCount('blood-iron'),10);
 for(let p=0;p<8;p++){assert.ok(art.frame('blood-iron',0,9,'pose-'+p));assert.deepEqual(draws.at(-1).slice(1,5),[p%4*96,Math.floor(p/4)*96,96,96]);}
 assert.equal(art.frame('blood-iron',1,0),null);assert.equal(art.frame('blood-iron',0,8),null);assert.equal(art.frame('invalid',0,0),null);
 art.preload('blood-iron');assert.equal(images.length,10);
});
test('wrong dimensions and failures never count as loaded; retry is explicit',()=>{
 const {art,images}=fixture();art.preload('blood-iron');images[0].good(100,100);images[1].onerror();assert.equal(art.failedCount('blood-iron'),2);assert.equal(art.loadedCount('blood-iron'),0);
 art.retry('blood-iron');assert.equal(images.length,12);assert.equal(art.failedCount('blood-iron'),0);images[10].good();images[11].good();assert.equal(art.loadedCount('blood-iron'),2);
});
test('multiplayer engine preserves valid faction skins and rejects cross-faction skins',()=>{
 require('../tri-lane-engine.js');const E=global.DesertTriEngine;
 const e=E.create({mode:'classic',size:1,seed:1,members:[{uid:'host',team:0,faction:0,skin:'blood-iron'},{uid:'guest',team:1,faction:1,skin:'blood-iron'}]});
 assert.equal(e.state.players.find(p=>p.uid==='host').skin,'blood-iron');assert.equal(e.state.players.find(p=>p.uid==='guest').skin,'default');
});
