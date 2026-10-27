'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=__dirname,read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html'),game=read('game-v2.js'),css=read('style-v2.css');
for(const id of ['frontLobby','lobbySolo','lobbyMulti','lobbyPractice','lobbyFactions','lobbySkins','lobbyGoogle','lobbyGuest','lobbyLevel','lobbyRank','backToLobby'])assert.ok(html.includes('id="'+id+'"'),'lobby must include '+id);
assert.ok(html.indexOf('expansion-art.js')<html.indexOf('isometric-world.js'),'expansion sprite rigs load before isometric renderer');
assert.ok(html.indexOf('game-v2.js')<html.indexOf('front-lobby.js'),'roster loads before lobby startup');
assert.match(css,/\.lobby-factions/);
const doc={createElement(t){assert.equal(t,'canvas');return {width:0,height:0,getContext(){return canvasCtx;}}}};
let paints=0,pixels=0;
const canvasCtx=new Proxy({fill(){paints++;},fillRect(){pixels++;},createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}},{get(o,p){return p in o?o[p]:()=>{}},set(o,p,v){o[p]=v;return true;}});
const artWindow={};
vm.runInNewContext(read('expansion-art.js'),{window:artWindow,Math,Array,Object},{timeout:10000});
vm.runInNewContext(read('isometric-world.js'),{window:artWindow,document:doc,Math,Map,Set,Array,Object,Number},{timeout:10000});
assert.equal(artWindow.ExpansionArt.SIZE,72);
for(let faction=6;faction<=8;faction++)for(let role=0;role<8;role++)for(const mode of ['idle','move','attack','siege','death']){
 const frames=[];for(let frame=0;frame<16;frame++)frames.push(artWindow.IsoWorld.frame(faction,role,mode,frame));
 assert.equal(new Set(frames).size,16,'must render independent animated frames '+[faction,role,mode]);
}
for(let i=6;i<=8;i++){artWindow.IsoWorld.structure(canvasCtx,150,260,i,false,1);artWindow.IsoWorld.structure(canvasCtx,150,260,i,true,.5);}
assert.ok(paints>5000,'original nine-faction sprites contain vector contour geometry');
assert.ok(pixels>5000,'each robot/fur/tentacle design has original details');
const engineWin={};
vm.runInNewContext(game.replace('initFactions();wire();reset();',''),{
 window:engineWin,document:{getElementById(){return {}},querySelectorAll(){return []},querySelector(){return null}},
 requestAnimationFrame(){},console,Math,Array,Object,Number,Map,Set,Date
},{timeout:10000});
assert.equal(engineWin.DesertRoster.FACTIONS.length,9);
assert.equal(engineWin.DesertRoster.FACTIONS.map(f=>f.units.length).reduce((a,b)=>a+b),72);
for(let f=0;f<9;f++)for(let r=0;r<8;r++){
 const u=engineWin.DesertRoster.getDef(r,f);
 for(const k of ['hp','damage','range','rate','speed'])assert.ok(Number.isFinite(u[k]),'finite '+f+'/'+r+'/'+k);
 assert.ok(u.hp>0&&u.range>0&&u.rate>0);
}
assert.ok(engineWin.DesertRoster.getDef(5,8).blast>engineWin.DesertRoster.getDef(5,0).blast);
assert.ok(engineWin.DesertRoster.getDef(7,7).heal<engineWin.DesertRoster.getDef(7,0).heal);
assert.ok(engineWin.DesertRoster.getDef(0,6).damage>engineWin.DesertRoster.getDef(0,0).damage);
const elements=new Map(),store=new Map(),listeners={};
const fakeEl=id=>{
 if(!elements.has(id)){elements.set(id,{id,style:{},dataset:{},hidden:false,value:'',textContent:'',innerHTML:'',disabled:false,handlers:{},
  addEventListener(k,fn){this.handlers[k]=fn;},querySelectorAll(){return []},getContext(){return {clearRect(){},drawImage(){},filter:'none'}},
  click(){this.handlers.click?.({target:this})},classList:{add(){},remove(){}}});}
 return elements.get(id);
};
const fakeDoc={readyState:'complete',body:{classList:{add(){},remove(){}}},getElementById:fakeEl,querySelectorAll(){return []},querySelector(){return null}};
const modelWindow={DesertRoster:engineWin.DesertRoster,IsoWorld:{portrait(){return {}},frame(){return {}}},addEventListener(k,fn){listeners[k]=fn;}};
vm.runInNewContext(read('front-lobby.js'),{window:modelWindow,document:fakeDoc,localStorage:{getItem(k){return store.get(k)||null},setItem(k,v){store.set(k,v)}},console,Math,Number,String,Object,Array,Map,Set,JSON},{timeout:10000});
const lobby=modelWindow.DesertLobby;
assert.equal(lobby.levelFromXP(0).level,1);
assert.equal(lobby.selectedSkin(),'default');
assert.equal(lobby.chooseSkin('gold'),false,'locked skin cannot be selected');
lobby.chooseFaction(8);assert.equal(lobby.selectedFaction(),8);
lobby.completeSolo({win:true,wave:22});assert.match(fakeEl('lobbyRecord').textContent,/싱글 1승/);
lobby.grantXP(6000);assert.ok(lobby.levelFromXP(6000).level>=6);
assert.equal(lobby.chooseSkin('aurora'),true);
assert.ok(lobby.filterForSkin(lobby.selectedSkin())!=='none');
lobby.completeMultiplayer({winner:0,side:0,matchId:'room-1'});lobby.completeMultiplayer({winner:0,side:0,matchId:'room-1'});
assert.match(fakeEl('lobbyRecord').textContent,/온라인 1승/,'duplicate reports are not awarded');
assert.ok(store.has('desert-front-training-v2'),'guest progression saved locally');
console.log('Nine-faction test passed: 72 unique units, 1,920 generated 2.5D frames, 3 structures, lobby mode/UI, XP ranks, unlockable cosmetics.');
