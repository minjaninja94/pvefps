/* Shared battle report: accurate cumulative factory deployments, never current survivors.
 * DOM textContent only: no untrusted player names in innerHTML.
 */
(function(global){
'use strict';
const $=id=>document.getElementById(id);
const roles=['돌격','사격','대장갑','장갑','대공','포격','특수','지원'];
const zero=()=>Array(8).fill(0);
const normalized=a=>roles.map((_,i)=>Number.isFinite(a?.[i])?Math.max(0,Math.floor(a[i])):0);
const count=a=>normalized(a).reduce((s,v)=>s+v,0);
function duration(seconds){
 const n=Math.max(0,Math.floor(Number(seconds)||0));return Math.floor(n/60)+'분 '+String(n%60).padStart(2,'0')+'초';
}
function make(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;}
function unitStats(target,groups){
 if(!target)return;
 target.replaceChildren();
 for(const g of groups){
  const list=normalized(g.counts);
  const panel=make('section','result-production-team');
  panel.append(make('div','result-team-title',g.label+' · 총 '+count(list)+'기'));
  const grid=make('div','result-production-grid');
  for(let i=0;i<8;i++){
   const detail=global.DesertRoster?.getDef?.(i,g.faction)?.unitName;
   const row=make('div','result-production-row');
   row.append(make('span','result-unit-role',detail||roles[i]),make('strong','result-unit-count',list[i]+'기'));
   if(!list[i])row.classList.add('empty');grid.append(row);
  }
  panel.append(grid);target.append(panel);
 }
}
function showSolo(state){
 const target=$('soloProductionStats');if(!target)return;
 const friendly=state?.produced?.[0]||zero(),enemy=state?.produced?.[1]||zero();
 unitStats(target,[{label:'내가 생산한 유닛',counts:friendly,faction:state?.faction},{label:'상대 AI 생산 유닛',counts:enemy,faction:state?.enemyFaction}]);
}
function showMulti(v,playerId,{serverStatus='서버 경기 결과 확인 중…'}={}){
 if(!v?.ended)return;
 const me=v.players?.find(p=>p.uid===playerId),side=me?.team??v.viewerTeam??0,winner=v.winner;
 const panel=$('mpResultOverlay');if(!panel)return;
 $('mpResultTitle').textContent=winner===null?'무승부':winner===side?'승리':'패배';
 $('mpResultTitle').dataset.outcome=winner===null?'draw':winner===side?'win':'lose';
 $('mpResultSummary').textContent='WAVE '+v.wave+' · '+duration(v.seconds)+' · '+(v.mode==='classic'?'클래식 1:1':v.mode==='coop'?'협동전':'3라인 대전');
 const label=(p)=>p.bot?p.name+' (AI)':p.name;
 const groups=[];
 for(const team of [side,1-side]){
  const people=(v.players||[]).filter(p=>p.team===team);
  let merged=zero(),any=false;
  for(const p of people){if(Array.isArray(p.produced)){merged=merged.map((x,i)=>x+normalized(p.produced)[i]);any=true;}}
  groups.push({label:(team===side?'아군':'상대')+' · '+people.map(label).join(', ') + (!any?' (생산 내역 수신 대기)':''),counts:merged,faction:people[0]?.faction});
 }
 unitStats($('mpResultProduction'),groups);
 $('mpResultStatus').textContent=serverStatus;
 panel.classList.remove('hidden');
 document.body.classList.add('result-visible');
}
function serverStatus(message){const node=$('mpResultStatus');if(node&&!$('mpResultOverlay')?.classList.contains('hidden'))node.textContent=message;}
function hideMulti(){
 $('mpResultOverlay')?.classList.add('hidden');document.body.classList.remove('result-visible');
}
global.DesertBattleReport=Object.freeze({showSolo,showMulti,serverStatus,hideMulti,unitStats,duration,count});
})(window);
