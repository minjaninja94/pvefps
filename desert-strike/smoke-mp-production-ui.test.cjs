'use strict';
// Real UI module: three production lanes are selected inside the build board and by horizontal drag.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname,src=fs.readFileSync(path.join(root,'tri-lane-ui.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style-v2.css'),'utf8');
for(const id of ['mpBuildSwipe','mpPrevLane','mpNextLane','mpLaneHint','mpDeploymentPanel','mpLaneTabs','mpBuildGrid','mpBattleView','mpBaseView','mpUpgradeView','mpViewTabs','mpRepairButton','mpWeaponButton','mpArmorButton','mpBarrageButton','mpNukeButton'])
 assert.ok(html.includes('id="'+id+'"'),'missing in-board control '+id);
assert.ok(html.indexOf('id="mpUnitCards"')<html.indexOf('id="mpLaneTabs"'));
assert.ok(html.indexOf('id="mpLaneTabs"')<html.indexOf('id="mpBuildGrid"'));
assert.ok(html.indexOf('id="mpBuildGrid"')<html.indexOf('id="mpBattleCanvas"'),'production board appears before live battlefield');
assert.match(css,/#view-multiplayer \.mp-build-grid\{[^}]*repeat\(5,minmax\(0,1fr\)\)/);
assert.match(css,/touch-action:pan-y/);
const no=()=>{},calls=[],records=new Map();
const g=new Proxy({createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}},{get(o,k){return k in o?o[k]:no;}});
const nav=Array.from({length:3},(_,i)=>({dataset:{mpView:['base','battle','upgrade'][i]},attrs:{},classList:{toggle(k,v){this[k]=v;}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}}));
const repair=Array.from({length:3},(_,i)=>({dataset:{repairLane:String(i)},classList:{toggle(k,v){this[k]=v;}}}));
const buttons=Array.from({length:3},(_,i)=>{
 const count={textContent:'0 / 75'};
 return {dataset:{lane:String(i)},classList:{toggle(n,on){this[n]=on;}},attrs:{},
  setAttribute(k,v){this.attrs[k]=v;},querySelector(){return count;},count};
});
function item(id){
 if(records.has(id))return records.get(id);
 const handlers={};
 const el={id,hidden:id!=='frontLobby',value:'',textContent:'',innerHTML:'',dataset:{},style:{},disabled:false,
  attrs:{},handlers,children:[],scrollTop:0,
  classList:{toggle(){},contains(){return true;}},setAttribute(k,v){this.attrs[k]=v;},
  addEventListener(k,fn,capture){(handlers[k]||(handlers[k]=[])).push({fn,capture:!!capture});},
  dispatch(k,event={}){for(const entry of handlers[k]||[])entry.fn({...event,currentTarget:this});},
  append(...x){this.children.push(...x);},replaceChildren(...xs){this.children=xs.flatMap(x=>x.children||[x]);},
  querySelector(q){return id==='mpBuildSwipe'&&q==='.mp-grid-viewport'?viewport:null;},
  querySelectorAll(q){if(id==='mpLaneTabs'&&q==='[data-lane]')return buttons;
    if(id==='mpViewTabs'&&q==='[data-mp-view]')return nav;
    if(id==='mpRepairLanes'&&q==='[data-repair-lane]')return repair;return [];},
  getContext(){return g;},showModal(){this.open=true;},close(){this.open=false;},getBoundingClientRect(){return {top:0,left:0,width:1000,height:100};},
  scrollIntoView(){this.scrolled=true;},setPointerCapture(){},removeAttribute(){}};
 if(id==='frontLobby')el.hidden=true;
 records.set(id,el);return el;
}
const viewport={scrollTop:150};
const doc={readyState:'complete',hidden:false,body:{dataset:{playMode:'multi'}},
 getElementById:item,addEventListener:no,createElement(tag){
  const el={tagName:tag,dataset:{},children:[],get childElementCount(){return this.children.length;},attrs:{},style:{},classList:{add(){}},className:'',textContent:'',title:'',disabled:false,
    width:0,height:0,append(...xs){this.children.push(...xs);},setAttribute(k,v){this.attrs[k]=v;},
    getContext(){return g;},addEventListener(){}};
  return el;
 },createDocumentFragment(){return {children:[],append(x){this.children.push(x);}};}};
const network={configure(handlers){this.handlers=handlers;},sendOrder(cmd){calls.push({...cmd});return {ok:true};}};
const cost=[65,100,185,285,185,360,300,220],unitNames=['돌격','사격','대장갑','장갑','대공','포격','기동','지원'];
const engine={SLOTS:75,COST:cost,NAMES:unitNames,EXTRACTOR:8,OPENING_PREP_SECONDS:10,FACTORY_BUILD_SECONDS:12,incomePerTick:level=>[1,2.2,3.2,4.05,4.8,5.45,6,6.45][level],ecoBuildSeconds:level=>12+4*(level-1),ecoPrice(){return 70;},ecoStabilize(){return 8;},WEAPON_COST(n){return Math.round(200*Math.pow(1.65,n));},ARMOR_COST(n){return Math.round(190*Math.pow(1.63,n));}};
const window={DesertTriEngine:engine,DesertTriNetwork:network,addEventListener:no,
 DesertRoster:{FACTIONS:[{name:'철갑연합',units:unitNames}],getDef(){return {kind:'ground',tips:'테스트 병력'};}},};
vm.runInNewContext(src,{window,document:doc,performance:{now:()=>1000},requestAnimationFrame:no,console,Math,Number,Array,Object,Promise,setInterval:no,clearInterval:no},{filename:'tri-lane-ui.js',timeout:10000});
network.handlers.room({uid:'local',host:true,id:'test',room:{status:'playing',players:{local:{team:0,name:'시험',faction:0,ready:true}},host:'local'}});
const buildings=Array.from({length:3},()=>Array(75).fill(null));
buildings[1][3]=0;buildings[2][7]=2;
const snapshot={width:3300,height:1560,players:[{uid:'local',team:0,faction:0,cash:300,eco:0,ecoReadyAt:0,weapon:0,armor:0,nukes:1,barrageCd:0,buildings}],
 seconds:0,wave:1,next:20,ended:false,cores:[[2500,2500],[2500,2500],[2500,2500]],
 turrets:[[1250,1250],[1250,1250],[1250,1250]],forwardHP:[[1000,1000],[1000,1000],[1000,1000]],
 lanePressure:[.5,.5,.5],units:[],effects:[],fog:[false,false,false],viewerTeam:0};
window.DesertTriUI.onSnapshot(snapshot);
assert.equal(item('mpAllBattleCanvas').hidden,false,'three-line matches default to the complete overview');
assert.equal(item('mpBattleCanvas').hidden,true,'one-line canvas stays hidden while viewing three lanes');
assert.equal(item('mpTacticalPositions').children.length,4,'production intel includes blue/red position rows for three lanes');
assert.match(src,/function drawAllBattle\(/,'actual three-lane whole battlefield render exists');
assert.doesNotMatch(src,/const matchup=global\.DesertRoster\?\.getDef\?\.\(u\.role,u\.faction\)/,'combat canvas no longer floats matchup charts above units');
assert.match(item('mpSelectedLane').textContent,/중앙/,'central lane is default');
assert.equal(nav[0].attrs['aria-current'],'page','multiplayer base tab starts selected');
window.DesertTriUI.setView('battle');
item('mpAllBattleCanvas').dispatch('click',{clientX:200,clientY:30});
assert.equal(item('mpBattleCanvas').hidden,false,'selecting a row reveals compact detailed lane');
assert.equal(item('mpAllBattleCanvas').hidden,true);
item('mpBattleLaneSelect').dispatch('click',{target:{closest(query){return query==='[data-mp-scope="all"]'?{dataset:{mpScope:'all'}}:null;}}});
assert.equal(item('mpAllBattleCanvas').hidden,false,'all-lane tab restores three-line overview');
item('mpLaneTabs').dispatch('click',{target:{closest(){return buttons[1];}}}); // Restore center build lane after drilling into the top battle.
assert.equal(item('mpBaseView').hidden,true,'battle tab hides production');
assert.equal(item('mpBattleView').hidden,false,'battle tab shows battlefield');
assert.equal(nav[1].attrs['aria-current'],'page');
window.DesertTriUI.setView('upgrade');
assert.equal(item('mpBattleView').hidden,true,'upgrade tab hides battlefield');
assert.equal(item('mpUpgradeView').hidden,false,'upgrade tab shows actual tactics');
item('mpWeaponButton').dispatch('click');
assert.deepEqual(calls.at(-1),{type:'upgrade',kind:'weapon'},'weapon button sends authoritative upgrade order');
item('mpRepairButton').dispatch('click');
assert.deepEqual(calls.at(-1),{type:'tactic',kind:'repair',lane:1},'repair defaults to selected center lane');
window.DesertTriUI.setView('base');
assert.equal(item('mpBaseView').hidden,false,'production still accessible after upgrades');
assert.equal(item('mpBuildGrid').children.length,75,'every lane renders full 75 slots');
assert.equal(buttons[1].attrs['aria-pressed'],'true');
assert.equal(buttons[1].count.textContent,'1 / 75');
assert.equal(buttons[2].count.textContent,'1 / 75');
item('mpBuildGrid').dispatch('click',{target:{closest(){return {dataset:{slot:'5'}};}}});
assert.deepEqual(calls.at(-1),{type:'build',lane:1,slot:5,role:0},'center lane purchase targets lane 1');
item('mpLaneTabs').dispatch('click',{target:{closest(){return buttons[2];}}});
assert.match(item('mpSelectedLane').textContent,/하단/);
assert.equal(item('mpNextLane').disabled,true);
assert.equal(viewport.scrollTop,0,'lane switch resets vertical board scroll');
item('mpBuildGrid').dispatch('click',{target:{closest(){return {dataset:{slot:'8'}};}}});
assert.deepEqual(calls.at(-1),{type:'build',lane:2,slot:8,role:0},'bottom lane purchase targets lane 2');
item('mpPrevLane').dispatch('click');
assert.match(item('mpSelectedLane').textContent,/중앙/);
const swipe=item('mpBuildSwipe'),before=calls.length;
swipe.dispatch('pointerdown',{button:0,pointerId:1,clientX:260,clientY:150});
swipe.dispatch('pointerup',{pointerId:1,clientX:100,clientY:151});
assert.match(item('mpSelectedLane').textContent,/하단/,'left swipe moves to next line');
let prevented=false,stopped=false;
swipe.dispatch('click',{preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
assert.ok(prevented&&stopped,'swipe must suppress unintended build click');
assert.equal(calls.length,before,'swipe cannot spend resources');
swipe.dispatch('pointerdown',{button:0,pointerId:2,clientX:100,clientY:150});
swipe.dispatch('pointerup',{pointerId:2,clientX:250,clientY:150});
assert.match(item('mpSelectedLane').textContent,/중앙/,'right swipe returns to previous line');
swipe.dispatch('pointerdown',{button:0,pointerId:3,clientX:100,clientY:140});
swipe.dispatch('pointerup',{pointerId:3,clientX:102,clientY:250});
assert.match(item('mpSelectedLane').textContent,/중앙/,'vertical scroll does not switch lines');
const classicBuildings=[Array(75).fill(null)];
classicBuildings[0][5]=1;
const classic={...snapshot,mode:'classic',height:520,lanes:1,coreMaxHP:7200,
 players:[{...snapshot.players[0],buildings:classicBuildings}],
 cores:[[7200,7200]],turrets:[[1250,1250]],forwardHP:[[1000,1000]],lanePressure:[.5],fog:[false]};
window.DesertTriUI.onSnapshot(classic);
assert.equal(doc.body.dataset.multiArena,'classic','classic mode identifies single-map layout');
assert.equal(item('mpBattleCanvas').height,400,'compact single-line battle uses the reduced viewport height');
assert.match(item('mpSelectedLane').textContent,/단일 전장/);
assert.equal(item('mpBuildGrid').children.length,75,'one classic 75-slot board remains intact');
const classicBefore=calls.length;
item('mpBuildGrid').dispatch('click',{target:{closest(){return {dataset:{slot:'8'}};}}});
assert.deepEqual(calls.at(-1),{type:'build',lane:0,slot:8,role:0},'classic purchase sends lane 0');
const classicSwipe=item('mpBuildSwipe');
classicSwipe.dispatch('pointerdown',{button:0,pointerId:4,clientX:270,clientY:100});
classicSwipe.dispatch('pointerup',{pointerId:4,clientX:80,clientY:101});
assert.match(item('mpSelectedLane').textContent,/단일 전장/,'classic swipe cannot change the only lane');
assert.equal(calls.length,classicBefore+1,'swipe cannot place extra buildings');
window.DesertTriUI.setView('battle');
assert.equal(item('mpBattleView').hidden,false);
window.DesertTriUI.setView('upgrade');
assert.match(item('mpRepairInfo').textContent,/단일 전장/,'classic can repair its one turret');
// Render real timer transitions, including an extractor after its factory build ends.
classicBuildings[0][6]=8;
const readiness=[Array(75).fill(0)];readiness[0][5]=12;readiness[0][6]=12;
const timed={...classic,seconds:6,players:[{...classic.players[0],eco:1,ecoReadyAt:15,buildingReadyAt:readiness,mineTimings:{'0-6':{startedAt:0,buildEndsAt:12,readyAt:15}}}]};
window.DesertTriUI.onSnapshot(timed);
let cells=item('mpBuildGrid').children;
assert.equal(cells[5].children[1].className,'cell-name','name is directly above timer');
assert.equal(cells[5].children[2].attrs['aria-valuenow'],'50');
assert.equal(cells[6].children[2].children[1].textContent,'건설 6초');
window.DesertTriUI.onSnapshot({...timed,seconds:13});cells=item('mpBuildGrid').children;
assert.equal(cells[5].children.length,2,'completed factory removes timer');
assert.equal(cells[6].children[2].className,'build-progress stabilizing');
assert.equal(cells[6].children[2].children[1].textContent,'안정화 2초');
window.DesertTriUI.onSnapshot({...timed,seconds:15});
assert.equal(item('mpBuildGrid').children[6].children.length,2,'extractor timer clears after stabilization');
const openingReady=[Array(75).fill(0)];openingReady[0][5]=10;
const opening={...classic,wave:0,seconds:0,next:10,preparationEndsAt:10,players:[{...classic.players[0],buildingReadyAt:openingReady}]};
window.DesertTriUI.onSnapshot(opening);
assert.equal(item('mpOpening').hidden,false);assert.equal(item('mpOpeningSeconds').textContent,'10');
assert.match(item('mpStateTag').textContent,/10초 뒤 첫 출격/);
let openingCell=item('mpBuildGrid').children[5];
assert.equal(openingCell.children[2].attrs['aria-valuenow'],'0','opening bar starts at zero');
assert.equal(openingCell.children[2].children[1].textContent,'배치 준비 10초');
window.DesertTriUI.onSnapshot({...opening,seconds:9.8,next:.2});
assert.equal(item('mpOpeningSeconds').textContent,'1');
window.DesertTriUI.onSnapshot({...opening,seconds:10,wave:1,next:12});
assert.equal(item('mpOpening').hidden,true,'countdown clears on first wave');
item('mpUnitCards').dispatch('click',{target:{closest(){return {dataset:{role:'8'}};}}});
for(const [eco,income] of [[0,2.2],[1,3.2],[2,4.05],[3,4.8],[4,5.45],[5,6],[6,6.45],[7,6.45]]){
 const economy={...classic,seconds:240,wave:20,players:[{...classic.players[0],eco,ecoReadyAt:0}]};
 window.DesertTriUI.onSnapshot(economy);
 assert.ok(item('mpUnitDetails').textContent.includes('+'+income+' CR / 0.5초'));
 assert.equal(item('mpUnitCards').children[8].title,item('mpUnitDetails').textContent,'card and selected tooltip use the same live calculation');
 if(eco===7)assert.doesNotMatch(item('mpUnitDetails').textContent,/건설|안정화/);
}
// Regression: shared HUD must always reveal both teams' locked-in cards, even
// after switching away from the production tab. Pending offers remain secret.
window.DesertAugments={ready:()=>true,card:id=>({name:'증강 '+id,description:'효과 '+id})};
const ownPick={...snapshot.players[0],name:'아군',augments:['prism-own-1'],buildingReadyAt:buildings.map(r=>r.map(()=>0))};
const rivalPick={...snapshot.players[0],uid:'rival',name:'상대',team:1,augments:['prism-rival-1'],cash:null,eco:null,weapon:null,armor:null};
const picked={...snapshot,ruleset:'augment',players:[ownPick,rivalPick]};
window.DesertTriUI.onSnapshot(picked);
const trigger=item('mpAugmentOpen'),counter=item('mpAugmentCounts'),dialog=item('mpAugmentDialog'),roster=item('mpAugmentRoster');
assert.equal(trigger.hidden,false,'Prism comparison opens in every augmented game');
assert.match(counter.textContent,/아군 1 · 상대 1/,'both sides selected-count shown on command bar');
window.DesertTriUI.setView('upgrade');
trigger.dispatch('click');
assert.equal(dialog.open,true,'dialog opens from upgrade tab');
assert.equal(roster.hidden,false,'selected cards are rendered in the dialog');
const liveAugments=item('mpAugmentBattleRoster');
assert.equal(liveAugments.hidden,false,'picked Prisms are always visible inline in live battle');
assert.equal(liveAugments.children[1].children.length,2,'battle panel shows allied and opponent Prism columns');
assert.match(liveAugments.children[1].children[0].children[1].children[0].children[0].children[0].textContent,/증강 prism-own-1/,'battle shows friendly chosen Prism');
assert.match(liveAugments.children[1].children[1].children[1].children[0].children[0].children[0].textContent,/증강 prism-rival-1/,'battle shows opponent chosen Prism');
assert.equal(roster.children[2].children.length,2,'both teams are in the comparison');
const friendCards=roster.children[2].children[0].children[1].children[1];
const rivalCards=roster.children[2].children[1].children[1].children[1];
assert.match(friendCards.children[0].children[0].textContent,/증강 prism-own-1/,'my picked card displayed');
assert.match(rivalCards.children[0].children[0].textContent,/증강 prism-rival-1/,'enemy picked card displayed');
assert.match(rivalCards.children[0].children[1].textContent,/효과 prism-rival-1/,'opponent effect displayed');
window.DesertTriUI.onSnapshot({...picked,players:[ownPick,{...rivalPick,augments:['prism-rival-1','prism-rival-2']}]});
assert.match(counter.textContent,/아군 1 · 상대 2/,'a new opponent pick updates while dialog remains open');
assert.equal(roster.children[2].children[1].children[1].children[1].children.length,2,'new opponent card updates without closing');
item('mpAugmentClose').dispatch('click');
assert.equal(dialog.open,false,'close control dismisses comparison');
window.DesertTriUI.setView('battle');
trigger.dispatch('click');
assert.equal(dialog.open,true,'comparison opens from battle tab');
window.DesertTriUI.onSnapshot({...picked,ruleset:'standard'});
assert.equal(trigger.hidden,true,'non-augment matches hide the comparison');
assert.equal(dialog.open,false,'leaving augment mode closes comparison');
assert.ok(html.includes('id="mpAugmentOpen"')&&html.includes('id="mpAugmentDialog"'),'HUD trigger and dialog exist outside hidden tabs');
console.log('Multiplayer production UI passed: embedded lane picker, 75-slot grids, purchase lanes, swipe, click cancellation, vertical scroll.');
