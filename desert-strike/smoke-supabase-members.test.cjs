'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,read=file=>fs.readFileSync(path.join(root,file),'utf8');
test('email-free username sign-up, saved progress and guest login coexist',()=>{
 const html=read('index.html'),member=read('desert-member.js'),lobby=read('front-lobby.js'),career=read('career-profile.js');
 assert.match(html,/<input id="careerEmail" type="text"/);
 assert.match(html,/id="careerNickname"/);
 assert.match(html,/id="careerPassword" type="password"/);
 assert.match(html,/id="careerGuest"/);
 assert.match(html,/id="careerLogout"/);
 assert.ok(html.indexOf('desert-member.js')<html.indexOf('career-profile.js'));
 assert.match(member,/desert-signup/);
 assert.match(member,/signInWithPassword/);
 assert.match(member,/signInAnonymously/);
 assert.match(member,/persistSession:true/);
 assert.match(member,/desert_web_members/);
 assert.doesNotMatch(member,/SUPABASE_SERVICE_ROLE_KEY|service_role|sk_live/i);
 assert.match(lobby,/function storageKey/);
 assert.match(lobby,/function importProgress/);
 assert.match(lobby,/function useGuestProfile/);
 assert.match(lobby,/global.DesertMember\?\.saveProgress/);
 assert.match(career,/server.*rating/);
});
test('server-backed quit/victory protocol is wired into P2P transport',()=>{
 const network=read('tri-lane-network.js'),ui=read('tri-lane-ui.js'),account=read('desert-member.js');
 for(const name of ['desert_join_match','desert_start_match','desert_ping_match','desert_forfeit_match','desert_report_match_result'])
  assert.ok(account.includes(name),name);
 assert.match(network,/joinMatch/);
 assert.match(network,/startMatch/);
 assert.match(network,/beginServerHeartbeat/);
 assert.match(network,/\.forfeit\?\.\(/);
 assert.match(network,/reportWinner/);
 assert.match(ui,/forcedResult/);
 assert.match(ui,/NET\.reportWinner/);
 assert.match(account,/pagehide/);
 assert.match(account,/keepalive:true/);
});
