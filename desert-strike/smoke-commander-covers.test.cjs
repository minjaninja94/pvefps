const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const catalog=require('./skin-catalog.js');
const shop=require('./skin-shop.js');

const paths=[];
class FakeImage{
 constructor(){this.complete=true;this.naturalWidth=960;this.naturalHeight=630;}
 set src(value){this.url=value;paths.push(value);}
}
const draws=[];
const context={save(){},restore(){},clearRect(){},drawImage(...args){draws.push(args);}};
const canvas={width:320,height:210,getContext(){return context;}};
const window={Image:FakeImage,DesertSkinCatalog:catalog,DesertSkinShop:shop};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'commander-covers.js'),'utf8'),{window,Image:FakeImage});

const hashes=new Set();
for(const skin of catalog.SKINS){
 const file=path.join(__dirname,'assets','sprites','commander-'+skin.id+'.jpg');
 assert.ok(fs.existsSync(file),`missing cover: ${skin.id}`);
 const bytes=fs.readFileSync(file);
 assert.equal(bytes[0],0xff,`invalid JPEG: ${skin.id}`);
 assert.equal(bytes[1],0xd8,`invalid JPEG: ${skin.id}`);
 hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
 const before=draws.length;
 window.DesertCommanderCovers.draw(canvas,skin.faction,skin.id);
 assert.equal(draws.length,before+1,`cover not drawn: ${skin.id}`);
 assert.ok(paths.at(-1).endsWith('commander-'+skin.id+'.jpg'),`wrong cover: ${skin.id}`);
}
assert.equal(hashes.size,100,'every concept needs a distinct image');
window.DesertCommanderCovers.draw(canvas,3,'faction-3-skin-01~gold');
assert.equal(context.filter,shop.resolve('faction-3-skin-01~gold').filter,'chroma should affect cover');
console.log('Commander covers passed: 100 distinct images, per-skin selection and chroma.');
