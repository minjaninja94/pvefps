'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname,read=name=>fs.readFileSync(path.join(root,name),'utf8');
const original=JSON.parse(read('assets/augments.json'));
class FakeNode{
 constructor(tag='div',id=''){this.tag=tag;this.id=id;this.children=[];this.attributes={};this.dataset={};this.className='';this.hidden=false;this.value='';this.textContent='';this.handlers={};this.open=false;this._classes=new Set();this.classList={toggle:(x,selected)=>selected?this._classes.add(x):this._classes.delete(x),contains:x=>this._classes.has(x)};}
 append(...x){this.children.push(...x);}
 replaceChildren(...x){this.children=[...x];}
 setAttribute(k,v){this.attributes[k]=String(v);if(k==='open')this.open=true;}
 removeAttribute(k){delete this.attributes[k];if(k==='open')this.open=false;}
 addEventListener(k,fn){this.handlers[k]=fn;}
 focus(){this.focused=true;}
 showModal(){this.open=true;}
 close(){this.open=false;}
 closest(q){return q.includes('codex-scope')&&this.dataset.codexScope||q.includes('codex-tier')&&this.dataset.codexTier?this:null;}
 fire(type,other){assert.ok(this.handlers[type],'missing '+type+' handler on '+this.id);this.handlers[type]({target:other||this});}
}
function env(){
 const map=new Map();
 const $=id=>{if(!map.has(id))map.set(id,new FakeNode('div',id));return map.get(id);};
 $('augmentCodexDialog').tag='dialog';
 const common=new FakeNode('button'),faction=new FakeNode('button');
 common.dataset.codexScope='common';faction.dataset.codexScope='faction';
 const tiers=['all','silver','gold','prismatic'].map(x=>{const el=new FakeNode('button');el.dataset.codexTier=x;return el;});
 const document={readyState:'loading',activeElement:new FakeNode('button','originalFocus'),getElementById:$,createElement:tag=>new FakeNode(tag),
  onready:null,addEventListener(k,fn){if(k==='DOMContentLoaded')this.onready=fn;},
  querySelectorAll:q=>q==='#augmentCodexTabs [data-codex-scope]'?[common,faction]:q==='#augmentCodexTiers [data-codex-tier]'?tiers:[]};
 const w={DesertRoster:{FACTIONS:Array.from({length:10},(_,i)=>({name:'테스트종족'+i}))},DesertLobby:{selectedFaction:()=>7}};
 vm.runInNewContext(read('prism-experiments.js'),{window:w,Math,Array,Object,Number,Set},{filename:'prism-experiments.js'});
 vm.runInNewContext(read('augment-rules.js'),{window:w,fetch:async()=>({ok:true,json:async()=>original}),Math,Map,Set,Number,Object,Array},{filename:'augment-rules.js'});
 vm.runInNewContext(read('augment-codex.js'),{window:w,document,Array,Object,String,Number,Math},{filename:'augment-codex.js'});
 document.onready();
 return {map,$,w,document,common,faction,tiers};
}
test('lobby has a small accessible ? codex help button and dialog with all filters',()=>{
 const html=read('index.html'),css=read('style-v2.css'),wf=read('../.github/workflows/desert-front.yml');
 const trigger=html.indexOf('id="augmentCodexOpen"'),heading=html.indexOf('id="lobbyRulesetPicker"'),solo=html.indexOf('id="lobbySolo"');
 assert.ok(heading<trigger&&trigger<solo,'button must be beside ruleset above launch buttons');
 assert.match(html,/id="augmentCodexOpen"[^>]*aria-haspopup="dialog"/);
 for(const id of ['augmentCodexDialog','augmentCodexClose','augmentCodexTabs','augmentCodexFaction','augmentCodexSearch','augmentCodexTiers','augmentCodexResults','augmentCodexStatus'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' must be unique');
 assert.ok(html.indexOf('augment-codex.js')>html.indexOf('augment-rules.js'),'script follows catalogue API');
 assert.match(css,/\.augment-codex-dialog::backdrop/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(wf,/smoke-augment-codex\.test\.cjs/);
});
test('existing shared catalogue exposes 400 read-only entries without changing game rules',async()=>{
 const {w}=env();await w.DesertAugments.load();
 const data=w.DesertAugments.list();
 assert.equal(data.length,400);
 assert.equal(data.filter(c=>c.scope==='common').length,50);
 for(let i=0;i<10;i++)assert.equal(data.filter(c=>c.scope==='faction-'+i).length,35);
 assert.equal(data.find(c=>c.id===original.cards[0].id).description,original.cards[0].description);
 assert.ok(data.every(c=>typeof c.name==='string'&&typeof c.tier==='string'));
 assert.equal(w.DesertAugments.STAGES.join(','),'1,10,20,30,40');
 const again=w.DesertAugments.list();again.pop();assert.equal(w.DesertAugments.list().length,400);
});
test('popup opens from selected faction, filters by common/faction, tier, and search, then restores focus',async()=>{
 const e=env(),{$,w,document,common,faction,tiers}=e;
 $('augmentCodexOpen').fire('click');
 // The click handler awaits the card load; let both microtask chains complete.
 await w.DesertAugments.load();await new Promise(r=>setImmediate(r));
 assert.equal($('augmentCodexDialog').open,true);
 assert.equal($('augmentCodexFaction').value,'7');
 assert.equal($('augmentCodexFaction').children.length,10);
 assert.equal($('augmentCodexResults').children.length,3,'silver, gold, prismatic common groups');
 assert.match($('augmentCodexStatus').textContent,/50 \/ 50종 표시 \(전체 400종\)/);
 assert.equal($('augmentCodexResults').children.reduce((n,sec)=>n+sec.children[1].children.length,0),50);
 $('augmentCodexTabs').fire('click',faction);
 assert.equal($('augmentCodexFactionLabel').hidden,false);
 assert.match($('augmentCodexStatus').textContent,/테스트종족7 전용 · 35 \/ 35종/);
 assert.equal($('augmentCodexResults').children.reduce((n,sec)=>n+sec.children[1].children.length,0),25);
 $('augmentCodexTiers').fire('click',tiers[2]);
 assert.match($('augmentCodexStatus').textContent,/\/ 35종/);
 assert.ok($('augmentCodexResults').children.every(sec=>sec.children[0].textContent.startsWith('골드')));
 const selected=original.cards.find(c=>c.scope==='faction-7'&&c.tier==='gold');
 $('augmentCodexSearch').value=selected.name;
 $('augmentCodexSearch').fire('input');
 assert.equal($('augmentCodexResults').children[0].children[1].children[0].children[1].textContent,selected.name);
 assert.equal($('augmentCodexResults').children[0].children[1].children[0].children[2].textContent,selected.description);
 $('augmentCodexSearch').value='절대로 존재하지 않는 카드 987654';
 $('augmentCodexSearch').fire('input');
 assert.match($('augmentCodexStatus').textContent,/0 \/ 35종/);
 assert.match($('augmentCodexResults').children[0].textContent,/해당하는 증강 카드가 없습니다/);
 $('augmentCodexClose').fire('click');
 assert.equal($('augmentCodexDialog').open,false);
 assert.equal(document.activeElement.focused,true,'dialog returns focus to launcher');
});
test('no card names or effect descriptions are interpolated into HTML',()=>{
 const source=read('augment-codex.js');
 assert.doesNotMatch(source,/\.innerHTML\s*=/);
 assert.match(source,/textContent=String\(text\)/);
 assert.match(source,/global\.DesertAugments\.list\(\)/);
});
