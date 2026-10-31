const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const shop=require('../skin-shop.js');
test('102 base appearances each have four independent, faction-scoped variants',()=>{
 assert.equal(shop.BASES.length,102);assert.equal(shop.SKINS.length,408);
 assert.equal(new Set(shop.SKINS.map(s=>s.id)).size,408);
 for(const base of shop.BASES)for(const c of shop.CHROMAS){
  const skin=shop.variant(base.id,c.id);assert.equal(skin.baseId,base.id);assert.equal(skin.price,c.id==='original'?base.price:200);
  if(base.faction!==undefined){assert.ok(shop.validFor(skin.id,base.faction));assert.ok(!shop.validFor(skin.id,(base.faction+1)%10));}
 }
 assert.equal(shop.resolve('gold').id,'default~gold');assert.equal(shop.resolve('blood-iron~invalid'),null);
});
test('wallet replacement and logout cannot inherit another account entitlements',()=>{
 shop.setAccount(null,null);assert.ok(shop.owns('default'));assert.ok(shop.owns('moe'));assert.ok(!shop.owns('blood-iron'));
 shop.setAccount('a',{points:1800,owned:['blood-iron','blood-iron~gold']});assert.ok(shop.owns('blood-iron~gold'));assert.ok(!shop.owns('blood-iron~aurora'));
 const copy=shop.snapshot();copy.owned.push('gold');assert.ok(!shop.owns('gold'));
 shop.setAccount('b',null);assert.ok(!shop.owns('blood-iron'));assert.equal(shop.snapshot().ready,false);
 shop.setAccount(null,null);assert.ok(!shop.owns('blood-iron~gold'));
});
test('chroma rendering uses the original atlas plus the chosen filter',()=>{
 const draws=[],context={save(){},translate(){},drawImage:(...a)=>draws.push({args:a,filter:context.filter}),restore(){}};
 const original={},w={DesertSkinShop:shop,DesertSkinArt:{frame:(id)=>{assert.equal(id,'blood-iron');return original;}},IsoWorld:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../unit-motion.js'),'utf8'),{window:w,Math,Object});
 assert.ok(w.DesertUnitMotion.draw(context,{skin:'blood-iron~gold'}));assert.equal(draws[0].args[0],original);assert.equal(draws[0].filter,shop.resolve('blood-iron~gold').filter);
});
