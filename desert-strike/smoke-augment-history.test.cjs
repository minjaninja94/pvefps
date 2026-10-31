'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname,load=p=>fs.readFileSync(path.join(root,p),'utf8');
const catalogue=JSON.parse(load('assets/augments.json')).cards;
const byId=new Map(catalogue.map(c=>[c.id,c]));
class Node {
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.attributes={};this.className='';this.textContent='';this.type='';this.title='';this.handlers={};this.classList={toggle:(name,active)=>{this.toggled=this.toggled||{};this.toggled[name]=!!active;}};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 setAttribute(name,value){this.attributes[name]=value;}
 addEventListener(event,fn){this.handlers[event]=fn;}
 fire(event){assert.equal(typeof this.handlers[event],'function','expected '+event+' handler on '+this.tag);this.handlers[event]({target:this});}
}
function mount(){
 const document={createElement:tag=>new Node(tag)},window={DesertAugments:{card:id=>byId.get(id)||null}};
 vm.runInNewContext(load('augment-history.js'),{window,document,Array,Number,Object,String,Math},{filename:'augment-history.js'});
 return {renderer:window.DesertAugmentHistory,container:new Node(),window};
}
test('round 10 draft renders wave 1 selection beneath new cards and readable hover/focus details',()=>{
 const {renderer,container}=mount(),previous=catalogue[0];
 renderer.render(container,[previous.id],10);
 const root=container.children[0],header=root.children[0],strip=root.children[1],detail=root.children[2];
 assert.equal(root.attributes['aria-label'],'라운드별 이전 증강 선택 기록');
 assert.equal(strip.children.length,8);
 assert.match(header.children[1].textContent,/1 \/ 8개 선택/);
 assert.equal(strip.children[0].children[0].textContent,'WAVE 01');
 assert.equal(strip.children[0].children[1].textContent,previous.name);
 assert.equal(strip.children[1].children[1].textContent,'이번 선택');
 assert.equal(strip.children[2].children[1].textContent,'대기');
 assert.match(detail.children[0].textContent,/마우스/);
 strip.children[0].fire('mouseenter');
 assert.equal(detail.children[1].textContent,previous.name);
 assert.equal(detail.children[2].textContent,previous.description);
 assert.equal(detail.children[0].textContent.includes('WAVE 1'),true);
 strip.children[0].fire('mouseleave');
 assert.match(detail.children[0].textContent,/터치/);
 strip.children[0].fire('focus');
 assert.equal(detail.children[2].textContent,previous.description);
 strip.children[0].fire('blur');
 assert.match(detail.children[0].textContent,/마우스/);
 strip.children[0].fire('click');
 strip.children[0].fire('mouseleave');
 assert.equal(detail.children[2].textContent,previous.description,'mobile tap pins preview');
});
test('selected rounds have individual card names, tiers and full original effects',()=>{
 const {renderer,container}=mount();
 const ids=catalogue.filter(c=>c.scope==='common').slice(0,5).map(c=>c.id);
 renderer.render(container,ids,40);
 const [,strip,detail]=container.children[0].children;
 assert.equal(strip.children.length,8);
 for(let i=0;i<5;i++){
  const chip=strip.children[i],card=byId.get(ids[i]);
  assert.equal(chip.children[0].textContent,'WAVE '+String([1,10,20,30,40][i]).padStart(2,'0'));
  assert.equal(chip.children[1].textContent,card.name);
  assert.equal(chip.dataset.tier,card.tier);
  assert.match(chip.attributes['aria-label'],/선택 증강/);
  chip.fire('mouseenter');
  assert.equal(detail.children[2].textContent,card.description);
 }
 assert.equal(renderer.ROUNDS.length,8);
});
test('only own augment IDs are used, and client does not expose unselected opponent cards',()=>{
 const ui=load('tri-lane-ui.js'),solo=load('game-v2.js'),html=load('index.html');
 assert.match(ui,/DesertAugmentHistory\?\.render\?\.\(history,my\(\)\?\.augments\|\|\[\],choice\.round\)/);
 assert.match(solo,/DesertAugmentHistory\?\.render\?\.\(\$\('soloAugmentHistory'\),state\.augments,choice\.round\)/);
 assert.match(ui,/const key=JSON\.stringify\(\[choice\.cards,choice\.rerolls,choice\.tier,choice\.round,choice\.selected,my\(\)\?\.augments\|\|\[\]\]\)/);
 assert.doesNotMatch(ui,/Math\.ceil\(choice\.remaining\),choice\.tier/,'timer ticks should not rebuild hovered history');
 assert.ok(html.indexOf('augment-history.js')>html.indexOf('augment-rules.js'));
 assert.ok(html.indexOf('augment-history.js')<html.indexOf('tri-lane-ui.js'));
 assert.ok(html.indexOf('augment-history.js')<html.indexOf('game-v2.js'));
 assert.match(load('style-v2.css'),/\.augment-history-preview/);
 assert.match(html,/id="soloAugmentHistory"/);
});
