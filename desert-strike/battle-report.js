/* Shared battle report: accurate cumulative factory deployments, never current survivors.
 * DOM textContent only: no untrusted player names in innerHTML.
 */
(function(global){
'use strict';
const $=id=>document.getElementById(id);
const roles=['돌격','사격','대장갑','장갑','대공','포격','특수','지원','자원채취','저격','암살'];
const zero=()=>Array(11).fill(0);
const normalized=a=>roles.map((_,i)=>Number.isFinite(a?.[i])?Math.max(0,Math.floor(a[i])):0);
const count=a=>normalized(a).reduce((s,v)=>s+v,0);
const METRIC_KEYS=['damage','kills','losses','heroes','heroDamage'];
function combineMetrics(a,b){
 if(!b)return a;
 const out=a||Object.fromEntries(METRIC_KEYS.map(k=>[k,zero()]));
 for(const k of METRIC_KEYS)out[k]=out[k].map((n,i)=>n+(Number.isFinite(b?.[k]?.[i])?Math.max(0,b[k][i]):0));
 return out;
}
const pretty=n=>Math.round(Math.max(0,n||0)).toLocaleString('ko-KR');
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
  panel.append(make('div','result-team-title',g.label+(g.unavailable?'':' · 총 '+count(list)+'기')));
  const m=g.metrics;
  if(m)panel.append(make('div','result-team-metrics',
   '유닛 피해 '+pretty(count(m.damage))+' · 처치 '+pretty(count(m.kills))+
   ' · 손실 '+pretty(count(m.losses))+' · 영웅 생성 '+pretty(count(m.heroes))+'기'));

  if(g.unavailable){panel.append(make('p','result-detail-hint','상대 연결이 끊겨 생산 통계를 수신하지 못했습니다.'));target.append(panel);continue;}
  const grid=make('div','result-production-grid');
  for(const i of [0,1,2,3,4,5,6,7,9,10]){
   const detail=global.DesertRoster?.getDef?.(i,g.faction)?.unitName;
   const row=make('div','result-production-row');
   row.append(make('span','result-unit-role',detail||roles[i]),make('strong','result-unit-count',list[i]+'기'));
   if(m){
    row.append(make('small','result-unit-metrics','피해 '+pretty(m.damage?.[i])+
     ' · 처치 '+pretty(m.kills?.[i])+' · 손실 '+pretty(m.losses?.[i])+
     ' · 영웅 '+pretty(m.heroes?.[i])+'기 · 영웅 피해 '+pretty(m.heroDamage?.[i])));
   }
   if(!list[i]&&!(m?.heroes?.[i]||m?.damage?.[i]))row.classList.add('empty');grid.append(row);
  }
  panel.append(grid);target.append(panel);
 }
}
function showSolo(state){
 const target=$('soloProductionStats');if(!target)return;
 const friendly=state?.produced?.[0]||zero(),enemy=state?.produced?.[1]||zero();
 unitStats(target,[{label:'내가 생산한 유닛',counts:friendly,faction:state?.faction,metrics:state?.combatStats?.[0]},
  {label:'상대 AI 생산 유닛',counts:enemy,faction:state?.enemyFaction,metrics:state?.combatStats?.[1]}]);
}
function showMulti(v,playerId,{serverStatus='서버 경기 결과 확인 중…',practice=false}={}){
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
  let merged=zero(),any=false,metrics=null;
  for(const p of people){
   if(Array.isArray(p.produced)){merged=merged.map((x,i)=>x+normalized(p.produced)[i]);any=true;}
   metrics=combineMetrics(metrics,p.combatStats);
  }
  groups.push({label:(team===side?'아군':'상대')+' · '+people.map(label).join(','),counts:merged,faction:people[0]?.faction,metrics,unavailable:!any});
 }
 unitStats($('mpResultProduction'),groups);
 $('mpResultStatus').textContent=serverStatus;
 const reward=$('multiSkinReward'),loggedIn=!!global.DesertMember?.account?.();
 if(reward)reward.textContent=practice
  ?(loggedIn?'AI 대전 스킨 포인트 서버 정산 중…':'게스트 연습: 승패 기록만 저장됩니다. 포인트를 받으려면 로그인 후 새 경기에서 승리하세요.')
  :loggedIn&&['pvp','classic'].includes(v.mode)?'스킨 포인트 확인 중…':'';
 panel.classList.remove('hidden');
 document.body.classList.add('result-visible');
}
function serverStatus(message){const node=$('mpResultStatus');if(node&&!$('mpResultOverlay')?.classList.contains('hidden'))node.textContent=message;}
function hideMulti(){
 $('mpResultOverlay')?.classList.add('hidden');document.body.classList.remove('result-visible');
}
global.DesertBattleReport=Object.freeze({showSolo,showMulti,serverStatus,hideMulti,unitStats,duration,count});
})(window);
