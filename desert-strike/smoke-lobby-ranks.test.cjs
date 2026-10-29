'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=__dirname,read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('all six rank tiers are illustrated with independent vector images',()=>{
 const html=read('index.html'),source=read('career-profile.js');
 for(const id of ['bronze','silver','gold','platinum','diamond','master']){
  const name=path.join(root,'assets','ranks',id+'.svg');
  assert.ok(fs.existsSync(name),'missing '+name);
  const svg=fs.readFileSync(name,'utf8');
  assert.match(svg,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/<path /);
  assert.ok(source.includes("asset:'"+id+"'"),'rank selector missing '+id);
 }
 for(const id of ['lobbyRankBadge','lobbyRankRP','lobbyRankWL','lobbyRankWinrate','lobbyRecentMatches'])
  assert.ok(html.includes('id="'+id+'"'),'commander dashboard: '+id);
 assert.match(source,/lobbyRankBadge/);assert.match(source,/setServerRating/);
});
test('multiplayer setup is directly below command buttons, not at page bottom',()=>{
 const html=read('index.html'),lobby=read('front-lobby.js');
 const button=html.indexOf('id="lobbyMulti"'),actionsEnd=html.indexOf('</div>',button);
 const setup=html.indexOf('id="lobbyMultiplayerConfig"');
 const mainEnd=html.indexOf('</main>',button);
 assert.ok(button>=0&&actionsEnd>button&&setup>actionsEnd&&setup<mainEnd,'multiplayer must expand inside commander main panel');
 assert.equal((html.match(/id="lobbyMultiplayerConfig"/g)||[]).length,1,'setup exists only once');
 assert.ok(html.includes('id="lobbyMultiMount"'));
 assert.match(lobby,/mount\.append\(roomPanel\)/,'original P2P room handlers must be retained');
 assert.match(lobby,/function setMultiplayerExpanded/);
 assert.match(lobby,/aria-expanded/);
 assert.match(lobby,/lobbyMultiplayerConfig.*scrollIntoView/);
});
test('login is a keyboard accessible overlay with guest, signup and match history',()=>{
 const html=read('index.html'),career=read('career-profile.js'),member=read('desert-member.js');
 const ids=['careerLayer','careerPanel','careerClose','careerTabLogin','careerTabSignup','careerEmail','careerPassword','careerNickname','careerGuest','careerLogin','careerRegister','careerHistoryDetails','careerHistory'];
 for(const id of ids)assert.ok(html.includes('id="'+id+'"'),'account layer missing '+id);
 assert.match(html,/role="dialog" aria-modal="true"/);
 assert.match(html,/id="careerLayer"[^>]+ hidden/);
 assert.match(html,/<input id="careerEmail" type="text"/);
 assert.match(career,/e\.key==='Escape'/);
 assert.match(career,/layer\.hidden=false/);
 assert.match(career,/lastFocused\?\.focus/);
 assert.match(career,/careerHistoryDetails.*\.open=true/);
 assert.match(member,/DesertCareer\?\.close\?\.\(\)/);
 assert.match(member,/show\(\)/);
});
test('competitive rating and win/loss render from server for registered members',()=>{
 const html=read('career-profile.js');let signed=false;
 class FakeNode{
  constructor(){this.textContent='';this.src='';this.alt='';this.children=[];this.className='';this.dataset={};this._cls=new Set();this.classList={add:x=>this._cls.add(x),remove:x=>this._cls.delete(x),toggle:(x,b)=>{if(b)this._cls.add(x);else this._cls.delete(x);}};}
  replaceChildren(...items){this.children=[...items];}append(...x){this.children.push(...x);}setAttribute(){}
 }
 const els=new Map();
 const doc={readyState:'loading',addEventListener(){},getElementById:id=>{if(!els.has(id))els.set(id,new FakeNode());return els.get(id)},createElement:()=>new FakeNode()};
 const store={getItem:()=>null,setItem(){}};
 const w={DesertMember:{isMember:()=>signed,account:()=>signed?{userId:'test-user',nickname:'테스트 지휘관'}:null},DesertLobby:{careerStats:()=>({nickname:'게스트',mpWins:2,mpLosses:1})}};
 vm.runInNewContext(html,{window:w,localStorage:store,document:doc,Math,Number,Array,Object,Date,String,JSON},{filename:'career-profile.js'});
 assert.equal(w.DesertCareer.rankInfo().tier.asset,'bronze');
 signed=true;w.DesertCareer.setServerRating(2050,12,8);
 w.DesertCareer.setLadders({all:[{user_id:'test-user',nickname:'테스트 지휘관',mode:'all',wins:12,losses:8,win_rate:'60.0',rank_position:1,total_players:3,tier:'챌린저',provisional:true}],pvp:[],classic:[],coop:[]});
 assert.equal(els.get('lobbyRank').textContent,'챌린저');
 assert.match(els.get('lobbyRankRP').textContent,/#1 \/ 3명/);
 assert.equal(els.get('lobbyRankWinrate').textContent,'60.0%');
 assert.match(els.get('lobbyRankBadge').src,/master\.svg$/);
 assert.doesNotMatch(els.get('careerRating').textContent,/2050|2,050|RP/,'hidden internal rating never appears');
 signed=false;w.DesertCareer.render();
 assert.equal(els.get('lobbyRank').textContent,'게스트');
 assert.equal(els.get('lobbyRankWL').textContent,'2승 1패');
});
