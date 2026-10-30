'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
test('main lobby directly exposes both standard and augment choices',()=>{
 const html=read('index.html'),src=read('front-lobby.js');
 const picker=html.indexOf('id="lobbyRulesetPicker"'),solo=html.indexOf('id="lobbySolo"');
 const expanded=html.indexOf('id="lobbyMultiplayerConfig"');
 assert.ok(picker>0&&picker<solo&&expanded>solo,'rule choices must be visible above multiplayer controls');
 for(const id of ['lobbyRulesetStandard','lobbyRulesetAugment','lobbyRulesetPrism','lobbyRulesetDescription','mpRuleset'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'unique control '+id);
 assert.match(html,/증강전.*웨이브별 증강 선택/);
 assert.match(src,/RULESET_KEY/);
 assert.match(src,/function chooseRuleset/);
 assert.match(src,/function restoreRuleset/);
 assert.match(src,/function syncRulesetFromRoom/);
 assert.match(read('tri-lane-ui.js'),/DesertLobby\?\.syncRulesetFromRoom/);
 assert.match(src,/renderRuleset\(\)/);
 assert.match(read('tri-lane-ui.js'),/ruleset:\$\('mpRuleset'\)\.value/);
 assert.match(read('tri-lane-ui.js'),/practice=E\.create\(\{mode,size:1.*ruleset:\$\('mpRuleset'\)\.value/);
});
test('switching to augment updates multiplayer and offline practice, persists, and locks during a room',()=>{
 const saved=new Map(),ruleset={value:'standard',disabled:false,dispatchEvent(){this.events=(this.events||0)+1;}};
 let room=null;const buttons=['standard','augment','prism'].map(v=>({dataset:{ruleset:v},disabled:false,selected:false,attrs:{},
  classList:{toggle(_k,value){this._active=!!value;}},setAttribute(key,value){this.attrs[key]=value;}}));
 const description={textContent:''},mp={querySelector:()=>mpSpan},practice={querySelector:()=>practiceSpan},
  mpSpan={textContent:''},practiceSpan={textContent:''};
 const ids={mpRuleset:ruleset,lobbyRulesetDescription:description,lobbyMulti:mp,lobbyPractice:practice};
 const doc={readyState:'loading',addEventListener(){},getElementById:id=>ids[id]||null,
  querySelectorAll:selector=>selector==='#lobbyRulesetPicker [data-ruleset]'?buttons:[]};
 const w={localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},DesertTriNetwork:{current:()=>({roomId:room})}};
 const source=read('front-lobby.js').replace('})(window);','global.__testRules={chooseRuleset,renderRuleset,restoreRuleset,syncRulesetFromRoom};})(window);');
 vm.runInNewContext(source,{window:w,document:doc,Event:class{constructor(name){this.type=name;}},Math,Number,Array,String,Object,Date,JSON},{filename:'front-lobby.js'});
 const helper=w.__testRules;helper.restoreRuleset();
 assert.equal(ruleset.value,'standard');assert.equal(buttons[0].attrs['aria-pressed'],'true');
 assert.equal(helper.chooseRuleset('augment'),true);
 assert.equal(ruleset.value,'augment');assert.equal(saved.get('desert-front-ruleset-v1'),'augment');
 assert.equal(buttons[1].attrs['aria-pressed'],'true');assert.match(mpSpan.textContent,/증강전/);
 assert.match(practiceSpan.textContent,/증강전/);assert.match(description.textContent,/1·10·20·30·40/);
 assert.equal(helper.chooseRuleset('prism'),true);
 assert.equal(ruleset.value,'prism');assert.equal(buttons[2].attrs['aria-pressed'],'true');
 assert.match(description.textContent,/프리즘 증강만/);assert.match(description.textContent,/50·60·70/);
 assert.match(mpSpan.textContent,/프리즘 모드/);assert.match(practiceSpan.textContent,/프리즘 모드/);
 helper.restoreRuleset();assert.equal(ruleset.value,'prism','restore Prism preference');
 room='ROOM01';assert.equal(helper.chooseRuleset('standard'),false,'joined rooms cannot switch ruleset');
 assert.equal(ruleset.value,'prism');
 helper.renderRuleset();assert.equal(buttons[0].disabled,true);assert.equal(buttons[1].disabled,true);
 helper.syncRulesetFromRoom('standard');assert.equal(buttons[0].attrs['aria-pressed'],'true','show joined room ruleset');
 room=null;ruleset.disabled=false;helper.syncRulesetFromRoom(null);assert.equal(ruleset.value,'prism','restore preferred mode after leaving');
});
