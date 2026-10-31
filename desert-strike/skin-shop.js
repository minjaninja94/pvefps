/* Shared cosmetic IDs, chroma presentation and account wallet view. */
(function(global){'use strict';
const catalog=global.DesertSkinCatalog||(typeof require==='function'?require('./skin-catalog.js'):null);
const CHROMAS=Object.freeze([
 {id:'original',name:'기본 색상',icon:'◆',tone:'#b8d7d4',filter:'none'},
 {id:'twilight',name:'황혼',icon:'☾',tone:'#ba91f2',filter:'hue-rotate(55deg) saturate(1.3)'},
 {id:'aurora',name:'오로라',icon:'✧',tone:'#8bdff6',filter:'hue-rotate(145deg) saturate(1.15)'},
 {id:'gold',name:'황금 근위',icon:'♛',tone:'#e9c47f',filter:'sepia(.62) saturate(1.35) contrast(1.05)'}
].map(Object.freeze));
const BASES=Object.freeze([
 {id:'default',name:'기본 제복',desc:'기본 외형',tone:'#a9d9ce',status:'ready'},
 {id:'moe',name:'모에화 빔',desc:'SD 외형',tone:'#f4afd5',status:'ready'},
 ...(catalog?.SKINS||[])
].map(s=>Object.freeze({...s,price:['default','moe'].includes(s.id)?0:1000})));
const SKINS=Object.freeze(BASES.flatMap(base=>CHROMAS.map(chroma=>Object.freeze({
 ...base,id:chroma.id==='original'?base.id:base.id+'~'+chroma.id,baseId:base.id,chroma:chroma.id,
 name:base.name+(chroma.id==='original'?'':' · '+chroma.name),filter:chroma.filter,
 tone:chroma.id==='original'?base.tone:chroma.tone,price:chroma.id==='original'?base.price:200
}))));
const byId=new Map(SKINS.map(s=>[s.id,s]));
function resolve(id){return byId.get(['twilight','aurora','gold'].includes(id)?'default~'+id:id)||null;}
function validFor(id,faction){const s=resolve(id);return !!s&&s.status==='ready'&&(s.faction===undefined||s.faction===faction);}
let wallet=null,userId=null;
function emit(){global.dispatchEvent?.(new Event('desert-skin-wallet'));}
function setAccount(id,data){userId=id||null;wallet=id&&data?{points:Number(data.points)||0,owned:new Set(data.owned||[]),grant:Number(data.grant)||0}:null;emit();}
function owns(id){const s=resolve(id);return !!s&&(s.price===0||!!wallet?.owned.has(s.id));}
function snapshot(){return {userId,ready:!!wallet,points:wallet?.points||0,owned:wallet?[...wallet.owned]:[],grant:wallet?.grant||0};}
const api=Object.freeze({BASES,SKINS,CHROMAS,resolve,validFor,owns,snapshot,setAccount,
 variant:(base,chroma='original')=>resolve(chroma==='original'?base:base+'~'+chroma)});
global.DesertSkinShop=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
