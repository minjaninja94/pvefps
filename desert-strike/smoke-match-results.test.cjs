'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const load=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
test('real factory deployment counts persist, even when units consolidate or die',()=>{
 const window={};
 const ctx={window,Math,Array,Map,Set,Number,JSON,Date,Object,console};
 vm.runInNewContext(load('tri-lane-engine.js'),ctx,{filename:'tri-lane-engine.js'});
 const engine=window.DesertTriEngine.create({mode:'pvp',size:1,members:[
  {uid:'me',name:'나',team:0,faction:0},{uid:'foe',name:'상대',team:1,faction:1}
 ]});
 assert.equal(engine.order('me',{type:'build',lane:0,slot:0,role:0}).ok,true);
 assert.equal(engine.order('foe',{type:'build',lane:0,slot:0,role:1}).ok,true);
 const state=engine.state;
 engine.wave();engine.wave();
 assert.equal(state.players[0].produced[0],2);
 assert.equal(state.players[1].produced[1],2);
 assert.equal(state.players[0].produced.reduce((n,v)=>n+v,0),2);
 assert.equal(engine.snapshot('me').players[1].produced,null,'enemy totals hidden while playing');
 assert.equal(engine.snapshot('me').players[1].combatStats,null,'enemy damage and hero totals must not leak before the result');
 state.units.length=0;
 assert.equal(state.players[0].produced[0],2,'dead units still counted');
 state.ended=true;state.winner=0;
 const result=engine.snapshot('me');
 assert.equal(result.players[1].produced[1],2,'enemy totals available after final result');
 assert.equal(result.players[0].produced[0],2);
 assert.equal(result.players[1].combatStats.damage.length,8,'battle report includes full 8-role telemetry for enemy');
 assert.equal(result.players[0].combatStats.heroes.length,8);
});
test('a player sees a permanent match report until they explicitly click lobby',()=>{
 const html=load('index.html'),game=load('game-v2.js'),ui=load('tri-lane-ui.js'),report=load('battle-report.js');
 for(const name of ['soloProductionStats','mpResultOverlay','mpResultTitle','mpResultProduction','mpResultStatus','mpResultLobby','mpResultRetry'])
  assert.ok(html.includes('id="'+name+'"'),name);
 assert.match(game,/state\.produced\[side\]\[role\]\+\+/);
 assert.match(game,/createUnit\(side,0,window\.DesertGuardian\?\.ROLE\?\?0,false\)/);
 assert.match(game,/DesertBattleReport\?\.showSolo/);
 assert.match(ui,/DesertBattleReport\?\.showMulti/);
 assert.match(ui,/resultKey!==key/);
 assert.match(ui,/NET\.reportWinner\?\.\(v\.winner\)/);
 assert.match(ui,/mpResultLobby.*returnToLobby/);
 assert.match(ui,/serverResult:data/);
 assert.match(report,/replaceChildren/);
 assert.doesNotMatch(report,/\.innerHTML\s*=/,'player names must never be interpreted as HTML');
});
test('safe report displays both teams and never invents disconnected opponents counts',()=>{
 class FakeNode {
  constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.className='';this.textContent='';this.hidden=false;
   this._classes=new Set();this.classList={add:x=>this._classes.add(x),remove:x=>this._classes.delete(x),contains:x=>this._classes.has(x)};}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
 }
 const ids=new Map(),document={
  getElementById:id=>{if(!ids.has(id))ids.set(id,new FakeNode());return ids.get(id);},
  createElement:tag=>new FakeNode(tag),
  body:new FakeNode('body')
 };
 ids.get('mpResultOverlay')?.classList.add('hidden');
 const window={document};
 vm.runInNewContext(load('battle-report.js'),{window,document,Number,Array,Math,Object},{filename:'battle-report.js'});
 const result=window.DesertBattleReport;
 const v={ended:true,winner:0,mode:'pvp',seconds:97,wave:6,viewerTeam:0,
   players:[{uid:'u0',name:'나',faction:0,team:0,produced:[12,1,0,0,0,0,0,0],
             combatStats:{damage:[750,0,0,0,0,0,0,0],kills:[8,0,0,0,0,0,0,0],
              losses:[3,0,0,0,0,0,0,0],heroes:[1,0,0,0,0,0,0,0],heroDamage:[520,0,0,0,0,0,0,0]}},
            {uid:'u1',name:'상대',faction:1,team:1,produced:[0,5,0,0,0,1,0,0]}]};
 result.showMulti(v,'u0',{serverStatus:'서버 접수 대기'});
 assert.equal(ids.get('mpResultTitle').textContent,'승리');
 assert.equal(ids.get('mpResultProduction').children.length,2);
 assert.equal(ids.get('mpResultProduction').children[0].children[0].textContent,'아군 · 나 · 총 13기');
 assert.equal(ids.get('mpResultProduction').children[1].children[0].textContent,'상대 · 상대 · 총 6기');
 const panel=ids.get('mpResultProduction').children[0];
 assert.match(panel.children[1].textContent,/유닛 피해 750.*처치 8.*손실 3.*영웅 생성 1기/);
 assert.match(panel.children[2].children[0].children[2].textContent,/피해 750.*영웅 피해 520/);
 assert.equal(ids.get('mpResultStatus').textContent,'서버 접수 대기');
 result.serverStatus('✓ 서버 기록 완료');assert.match(ids.get('mpResultStatus').textContent,/완료/);
 v.players[1].produced=null;
 result.showMulti(v,'u0');
 assert.equal(ids.get('mpResultProduction').children[1].children[1].textContent,'상대 연결이 끊겨 생산 통계를 수신하지 못했습니다.');
 result.hideMulti();assert.equal(ids.get('mpResultOverlay').classList.contains('hidden'),true);
});
