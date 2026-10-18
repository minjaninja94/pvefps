/* Local wardrobe and illustration renderer. AI assets are pre-generated; no API keys. */
(()=>{'use strict';
const KEY='neon-clash-wardrobe-v1',ART=['vector','celeste','ruby','violet','jade','custom'];
const variants={style:['long','wave','short','twin'],species:['human','cat','fox','rabbit'],body:['slender','balanced','curvy','athletic','petite','giant'],bust:['small','standard','large','full'],eyeShape:['normal','sharp','soft'],costume:['armor','idol','street','mage','cyber'],weapon:['blade','claw','spell']};
function legal(data){
 if(!data||typeof data!=='object')return null;
 const base=window.NeonFighters.PROFILES.find(p=>p.id===data.id);if(!base)return null;
 const p={...base};for(const [k,allowed]of Object.entries(variants))if(allowed.includes(data[k]))p[k]=data[k];
 for(const k of ['hair','hairDark','eye','outfit','skin'])if(/^#[a-f\d]{6}$/i.test(data[k]||''))p[k]=data[k];
 p.name=String(data.name||base.name).replace(/[<>\x00-\x1f]/g,'').trim().slice(0,24)||base.name;
 p.art=ART.includes(data.art)?data.art:'vector';
 if(p.art==='custom'&&typeof data.image==='string'&&data.image.length<=48000&&/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z\d+/=]+$/.test(data.image))p.image=data.image;
 else if(p.art==='custom')p.art='vector';
 return p;
}
function list(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x.slice(0,24).map(v=>({...v,profile:legal(v.profile)})).filter(v=>v.profile&&typeof v.id==='string'):[]}catch{return []}}
function save(profile){const p=legal(profile);if(!p)throw Error('파이터 데이터가 올바르지 않습니다.');const xs=list(),id=crypto.randomUUID();xs.unshift({id,profile:p,created:Date.now()});localStorage.setItem(KEY,JSON.stringify(xs.slice(0,24)));return id}
function remove(id){localStorage.setItem(KEY,JSON.stringify(list().filter(v=>v.id!==id)))}
function download(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function read(file){if(!file||file.size>1500000)throw Error('JSON 파일은 1.5MB 이하여야 합니다.');return JSON.parse(await file.text())}
function importWardrobe(data){if(data?.format!=='neon-clash-wardrobe'||!Array.isArray(data.fighters)||!data.fighters.length||data.fighters.length>24)throw Error('NEON CLASH 보관함 JSON이 아닙니다.');const profiles=data.fighters.map(legal);if(profiles.some(p=>!p))throw Error('잘못된 파이터 정보가 있습니다.');const all=[...profiles.map(profile=>({id:crypto.randomUUID(),profile,created:Date.now()})),...list()].slice(0,24);localStorage.setItem(KEY,JSON.stringify(all));return profiles.length}
async function imageFile(file){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('8MB 이하 PNG/JPEG/WebP 이미지를 선택하세요.');
 const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>40000000){bitmap.close();throw Error('이미지는 4천만 화소 이하로 선택하세요.')}
 const c=document.createElement('canvas'),scale=Math.min(1,440/bitmap.height,380/bitmap.width);c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();
 for(const q of [.82,.65,.45,.25]){const url=c.toDataURL('image/webp',q);if(url.length<=48000)return url}
 throw Error('이미지가 복잡해서 저장할 수 없습니다. 작은 이미지를 사용하세요.');
}
const cache=new Map();let refresh=()=>{};
function imageFor(p){const src=p.art==='custom'?p.image:'./assets/fighters/'+p.art+'.webp';if(!src)return null;if(!cache.has(src)){const im=new Image();im.onload=()=>refresh();im.onerror=()=>refresh();im.src=src;cache.set(src,im)}const im=cache.get(src);return im.complete&&im.naturalWidth?im:null}
function draw(g,x,y,profile,o={}){
 const p=typeof profile==='object'?profile:window.NeonFighters.get(profile);
 if(!p.art||p.art==='vector'){window.NeonFighters.draw(g,x,y,p,o);return}
 const im=imageFor(p);if(!im){window.NeonFighters.draw(g,x,y,p,o);return}
 const scale=o.scale||1,height=350*scale*(p.body==='giant'?1.1:p.body==='petite'?.92:1),w=height*im.width/im.height;
 g.save();g.translate(x,y+Math.sin((o.t||0)*3)*2);g.scale(o.facing===-1?-1:1,1);
 if(o.ko){g.rotate(-.8*o.ko);g.translate(-25*o.ko,35*o.ko)}
 if(o.hit)g.translate(-o.hit*20,0);
 g.rotate((o.attack||0)*-.08);if(o.hit>.1)g.filter='brightness(1.6)';
 g.drawImage(im,-w/2,-height,w,height);g.restore();
}
window.NeonStudio=Object.freeze({ART,legal,list,save,remove,download,read,importWardrobe,imageFile,draw,onRefresh(fn){refresh=fn}});
})();
