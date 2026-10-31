'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
const sql=read('sql/desert_mixed_pvp_member_rewards.sql');
const html=read('index.html');
const member=read('desert-member.js');
const network=read('tri-lane-network.js');
const ui=read('tri-lane-ui.js');
const career=read('career-profile.js');
const lobby=read('front-lobby.js');

assert.match(sql,/add column if not exists member_at_start boolean not null default false/);
assert.match(sql,/member_at_start=exists\([\s\S]*?public\.desert_web_members/);
assert.match(sql,/join auth\.users u on u\.id=w\.user_id[\s\S]*?u\.is_anonymous is not true/);
assert.match(sql,/where p\.room_code=p_code and p\.member_at_start/g);
assert.match(sql,/where mp\.room_code=new\.room_code and mp\.member_at_start/);
assert.match(sql,/case when p\.team=new\.winner_team then 500 else 200 end/);
assert.match(sql,/rankEligibleMembers/);
assert.match(sql,/guestParticipants/);
assert.match(career,/lobbyRankLogin.*addEventListener/);
assert.match(member,/lobbyRankLogin.*toggleAttribute/);
assert.match(lobby,/게스트는 PvP 가능/);
assert.match(network,/게스트 상대 경기라도 승패·RP·포인트 반영/);
assert.match(ui,/mpResultLogin.*addEventListener/);
assert.match(html,/게스트도 자유롭게 PvP/);
assert.match(html,/id="mpResultLogin"/);
assert.match(html,/id="lobbyRankLogin"/);

function runResult(loggedIn){
 const ids=new Map();
 const el=id=>{
  if(!ids.has(id))ids.set(id,{
    id,children:[],textContent:'',dataset:{},hidden:false,classList:{add(){},remove(){}},
    append(...xs){this.children.push(...xs);},replaceChildren(...xs){this.children=[...xs];}
  });return ids.get(id);
 };
 const document={
  getElementById:el,
  createElement(tag){return {tagName:tag,children:[],classList:{add(){}},append(...xs){this.children.push(...xs);},textContent:'',dataset:{}};},
  body:{classList:{add(){}}}
 };
 const win={document,DesertMember:{account:()=>loggedIn?{userId:'member-1'}:null},DesertRoster:{getDef:()=>({unitName:'보병'})}};
 vm.runInNewContext(read('battle-report.js'),{window:win,document,Array,Math,Number,String,Intl}, {filename:'battle-report.js'});
 win.DesertBattleReport.showMulti({
  ended:true,winner:0,wave:35,seconds:400,mode:'pvp',players:[
   {uid:'player',name:'지휘관',team:0,faction:0,produced:Array(11).fill(0)},
   {uid:'other',name:'상대',team:1,faction:1,produced:Array(11).fill(0)}
  ]
 },'player');
 return {text:el('multiSkinReward').textContent,login:el('mpResultLogin').hidden};
}
const memberResult=runResult(true);
assert.match(memberResult.text,/500P/);
assert.match(memberResult.text,/랭킹/);
assert.equal(memberResult.login,true,'logged-in player is not asked to sign in');
const guestResult=runResult(false);
assert.match(guestResult.text,/적립되지 않습니다/);
assert.match(guestResult.text,/다음 경기부터/);
assert.equal(guestResult.login,false,'guest sees official rank sign-in action');
console.log('Mixed PvP member scoring contract, guest rank exclusion and match result CTA passed.');
