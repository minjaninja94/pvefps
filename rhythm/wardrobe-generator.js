/* NEON CLASH wardrobe designer — repeatable themed adult fighter builds. */
(()=>{'use strict';
const groups=Object.freeze({
 identity:['id','name','weapon','art'],face:['skin','eye','eyeShape','expression','headScale','lookStrength'],
 hair:['style','hair','hairDark','accessory'],body:['body','bust','bustSize','waist','hips','height'],
 outfit:['costume','palette','outfit'],motion:['motion','bustMotion','animationStyle']
});
const themes=Object.freeze([
 {id:'frost',name:'빙결 기사',costume:'armor',style:'long',hair:'#a6e8fb',eye:'#7a9aff',outfit:'#e9f7ff',palette:'original',weapon:'blade',accessory:'crystal',species:'human',body:'athletic'},
 {id:'ember',name:'홍염 검사',costume:'armor',style:'twin',hair:'#ff7e85',eye:'#febf65',outfit:'#792c49',palette:'rose',weapon:'blade',accessory:'star',species:'fox',body:'curvy'},
 {id:'midnight',name:'달빛 마도사',costume:'mage',style:'wave',hair:'#b9a1ff',eye:'#b08dff',outfit:'#492b80',palette:'midnight',weapon:'spell',accessory:'halo',species:'human',body:'slender'},
 {id:'neon',name:'사이버 닌자',costume:'cyber',style:'short',hair:'#8cf4cd',eye:'#66e8ff',outfit:'#1c4255',palette:'emerald',weapon:'blade',accessory:'crystal',species:'cat',body:'athletic'},
 {id:'stage',name:'아이돌 파이터',costume:'idol',style:'twin',hair:'#ffb5e9',eye:'#ff80b8',outfit:'#f4d5ed',palette:'rose',weapon:'spell',accessory:'star',species:'human',body:'balanced'},
 {id:'urban',name:'스트리트 격투가',costume:'street',style:'short',hair:'#edddd1',eye:'#b6caff',outfit:'#2d3758',palette:'midnight',weapon:'claw',accessory:'none',species:'human',body:'athletic'},
 {id:'forest',name:'숲의 수인',costume:'mage',style:'long',hair:'#b9e59f',eye:'#77ae72',outfit:'#5d7d5a',palette:'emerald',weapon:'spell',accessory:'star',species:'fox',body:'curvy'},
 {id:'celestial',name:'별빛 성기사',costume:'armor',style:'wave',hair:'#f1e7c5',eye:'#a2beff',outfit:'#dadbea',palette:'original',weapon:'blade',accessory:'halo',species:'human',body:'giant'}
]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rng(seed){let state=(seed>>>0)||0x123ab;return()=>{state=(state+0x6d2b79f5)|0;let v=Math.imul(state^(state>>>15),1|state);v^=v+Math.imul(v^(v>>>7),61|v);return ((v^(v>>>14))>>>0)/4294967296}}
const color=(hex,f=.6)=>/^#[a-f0-9]{6}$/i.test(hex)?'#'+[1,3,5].map(i=>Math.round(clamp(parseInt(hex.slice(i,i+2),16)*f,0,255)).toString(16).padStart(2,'0')).join(''):'#292c46';
function create(base,{theme='mixed',locked=[],seed=Date.now()}={}){
 const random=rng(Number(seed)||1),pick=xs=>xs[Math.floor(random()*xs.length)],isLocked=k=>locked.includes(k);
 const motif=themes.find(x=>x.id===theme)||pick(themes);
 const baseProfile=base&&typeof base==='object'?base:{};
 const result={...baseProfile};
 const choose=(key,value)=>{if(!isLocked(key)&&value!==undefined)result[key]=value};
 choose('id',pick(['celeste','ruby','violet','jade']));choose('art','doll');
 choose('costume',motif.costume);choose('style',motif.style);
 choose('hair',motif.hair);choose('eye',motif.eye);choose('outfit',motif.outfit);
 choose('palette',motif.palette);choose('weapon',motif.weapon);choose('accessory',motif.accessory);
 choose('body',motif.body);choose('species',motif.species);
 choose('skin',pick(['#ffe4d4','#f8d7c1','#e8bda5','#c78b67','#956451']));
 choose('expression',pick(['calm','smile','serious']));
 choose('bust',pick(['small','standard','large','full']));
 choose('headScale',+(0.96+random()*.10).toFixed(2));
 choose('waist',+(0.93+random()*.15).toFixed(2));
 choose('hips',+(0.94+random()*.17).toFixed(2));
 choose('height',+(0.96+random()*.09).toFixed(2));
 choose('bustSize',+(.2+random()*.7).toFixed(2));
 choose('motion',+.55+random()*.25);
 choose('animationStyle',pick(['balanced','graceful','energetic']));
 choose('lookStrength',.85);
 choose('hairDark',color(result.hair));
 choose('eyeShape',pick(['normal','soft','sharp']));
 choose('name',motif.name);
 // Visual consistency rules: never mix an incompatible palette with its original
 // costume tint; palette and hair darkness follow chosen style unless locked.
 if(!isLocked('outfit')&&!isLocked('palette'))result.palette=motif.palette;
 if(isLocked('hair')&&!isLocked('hairDark'))result.hairDark=color(result.hair);
 if(result.body==='giant'&&!isLocked('headScale'))result.headScale=1.05;
 if(result.body==='petite'&&!isLocked('headScale'))result.headScale=1;
 return result;
}
function curated(){
 return themes.flatMap((theme,i)=>[
  create({}, {theme:theme.id,seed:1000+i*53}),
  create({}, {theme:theme.id,seed:2000+i*71})
 ]);
}
window.NeonWardrobeGenerator=Object.freeze({groups,themes,create,curated,color});
})();