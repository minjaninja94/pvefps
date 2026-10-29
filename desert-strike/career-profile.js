/* Commander rank display, locally-stored history and accessible sign-in layer.
 * Competitive member RP is server-owned; guests are explicitly unverified.
 */
(function(global){
'use strict';
const KEY='desert-career-v1';
const TIERS=[{min:2300,name:'마스터',asset:'master'},{min:2000,name:'다이아몬드',asset:'diamond'},
 {min:1700,name:'플래티넘',asset:'platinum'},{min:1400,name:'골드',asset:'gold'},
 {min:1100,name:'실버',asset:'silver'},{min:0,name:'브론즈',asset:'bronze'}];
const $=id=>document.getElementById(id),clamp=(x,a,b)=>Math.max(a,Math.min(b,Math.floor(Number(x)||0)));
let local=read(),server=null,lastFocused=null,ladders={all:[],pvp:[],classic:[],coop:[]},rankMode='all';
function read(){try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');return {rating:clamp(d.rating||1000,100,3000),records:Array.isArray(d.records)?d.records.slice(0,40):[]};}catch(_){return {rating:1000,records:[]};}}
function tierInfo(r){return TIERS.find(x=>r>=x.min)||TIERS[TIERS.length-1];}
function tier(r){return tierInfo(r).name;}
function rankInfo(){
 const member=!!global.DesertMember?.isMember?.(),career=global.DesertLobby?.careerStats?.()||{};
 const id=global.DesertMember?.account?.()?.userId;
 const row=member?ladders.all.find(p=>p.user_id===id):null;
 const tierName=row?.tier||(member?'배치 대기':'게스트');
 const asset={챌린저:'master',그랜드마스터:'master',마스터:'master',다이아몬드:'diamond',에메랄드:'platinum',플래티넘:'platinum',골드:'gold',실버:'silver',브론즈:'bronze',아이언:'bronze'}[tierName]||'bronze';
 return {member,rating:member?(server?.rating??1000):local.rating,
  tier:{name:tierName,asset},rank:row,
  wins:row?.wins??(member?(career.mpWins??0):(career.mpWins??0)),
  losses:row?.losses??(career.mpLosses??0),
  nickname:global.DesertMember?.account?.()?.nickname||career.nickname||'지휘관'};
}
function setServerRating(rating,wins=0,losses=0){server={rating:clamp(rating,100,3000),wins:clamp(wins,0,1e7),losses:clamp(losses,0,1e7)};render();}
function setLadders(data){
 for(const mode of ['all','pvp','classic','coop'])ladders[mode]=Array.isArray(data?.[mode])?data[mode]:[];
 render();
}
function renderLadders(){
 const ownId=global.DesertMember?.account?.()?.userId;
 const summary=$('lobbyModeRankSummary'),board=$('lobbyLeaderboard');
 if(!summary||!board)return;
 const modes=[['all','전체'],['pvp','3라인 PvP'],['classic','클래식 1:1'],['coop','협동']];
 summary.replaceChildren();
 for(const [mode,title] of modes){
  const row=ladders[mode].find(x=>x.user_id===ownId);
  const div=document.createElement('div');div.className='lobby-mode-rank';
  const heading=document.createElement('strong');heading.textContent=title;
  const line=document.createElement('span');line.textContent=row?
   row.tier+(row.provisional?' · 임시':'')+' · '+row.rank_position+'위':
   '배치 대기';
  const stats=document.createElement('small');stats.textContent=row?row.wins+'승 '+row.losses+'패 · '+row.win_rate+'%':'모드별 확정 기록 없음';
  div.append(heading,line,stats);summary.append(div);
 }
 for(const b of $('lobbyRankModes')?.querySelectorAll('[data-rank-mode]')||[]){
  b.classList.toggle('selected',b.dataset.rankMode===rankMode);
  b.setAttribute('aria-pressed',String(b.dataset.rankMode===rankMode));
 }
 board.replaceChildren();
 if(!global.DesertMember?.isMember?.()){board.textContent='회원 로그인 후 DB 랭킹을 조회할 수 있습니다.';return;}
 const rows=ladders[rankMode];
 if(!rows.length){board.textContent='해당 모드의 서버 확정 기록이 없습니다.';return;}
 for(const r of rows.slice(0,30)){
  const div=document.createElement('div');div.className='lobby-leaderboard-row'+(r.user_id===ownId?' own':'');
  const name=document.createElement('strong');name.textContent='#'+r.rank_position+' '+r.nickname;
  const tier=document.createElement('span');tier.textContent=r.tier+(r.provisional?' (임시)':'');
  const stats=document.createElement('small');stats.textContent=r.wins+'승 '+r.losses+'패 · 승률 '+r.win_rate+'%';
  div.append(name,tier,stats);board.append(div);
 }
}
function record(input){
 if(!input||!['solo','pvp','classic','coop','practice'].includes(input.mode))return;
 const result=input.winner===null?'무승부':input.winner===input.side?'승리':'패배';
 local.records.unshift({at:new Date().toISOString(),mode:input.mode,result,size:clamp(input.size||1,1,3),faction:clamp(input.faction,0,9),
  wave:clamp(input.wave,0,999),seconds:clamp(input.seconds,0,7200),forfeit:!!input.forfeit});
 local.records=local.records.slice(0,40);
 if(!global.DesertMember?.isMember?.()&&input.online&&['pvp','classic'].includes(input.mode)&&result!=='무승부')
  local.rating=clamp(local.rating+(result==='승리'?24:-24),100,3000);
 try{localStorage.setItem(KEY,JSON.stringify(local));}catch(_){}
 render();
}
function render(){
 const info=rankInfo(),t=$('careerRating');
 if(t)t.textContent=info.tier.name+(info.rank?.provisional?' · 임시':'')+' · '+info.wins+'승 '+info.losses+'패 (내부 점수 비공개)';
 const badge=$('lobbyRankBadge');
 if(badge){
  badge.src='./assets/ranks/'+info.tier.asset+'.svg';
  badge.alt=info.tier.name+' 티어 엠블럼';
 }
 const label=$('lobbyRank');if(label)label.textContent=info.tier.name;
 const rp=$('lobbyRankRP');if(rp)rp.textContent=info.rank?'#'+info.rank.rank_position+' / '+info.rank.total_players+'명 · '+info.wins+'승':'멀티 랭킹 배치 대기';
 const type=$('lobbyRankIdentity');if(type)type.textContent=info.nickname+' · '+(info.member?'회원':'게스트');
 const note=$('lobbyRankNote');if(note)note.textContent=info.rank?.provisional?'DB 승수 기준 임시 티어 · 과거 모드 미분류':info.member?'서버 확정 전적 기반':'게스트 기록 · 서버 랭킹 제외';
 const wl=$('lobbyRankWL');if(wl)wl.textContent=info.wins+'승 '+info.losses+'패';
 const wr=$('lobbyRankWinrate');if(wr)wr.textContent=(info.wins+info.losses?((info.wins/(info.wins+info.losses))*100).toFixed(1):'0.0')+'%';
 const recent=$('lobbyRecentMatches');
 if(recent){
  recent.replaceChildren();
  const games=local.records.slice(0,5);
  if(!games.length){recent.textContent='최근 경기 내역이 없습니다.';}
  for(const x of games){
   const item=document.createElement('div');item.className='lobby-recent-game';
   const status=document.createElement('span');status.className='lobby-result-mark '+(x.result==='승리'?'win':x.result==='패배'?'lose':'draw');
   status.textContent=x.result==='승리'?'W':x.result==='패배'?'L':'D';
   const title=document.createElement('span');title.textContent=({solo:'싱글',pvp:'3라인 PvP',classic:'클래식 1:1',coop:'협동',practice:'AI 연습'}[x.mode]||x.mode)+' · W'+x.wave;
   const time=document.createElement('small');time.textContent=new Date(x.at).toLocaleDateString('ko-KR');
   item.append(status,title,time);recent.append(item);
  }
 }
 renderLadders();
 const history=$('careerHistory');if(!history)return;history.replaceChildren();
 if(!local.records.length){history.textContent='아직 이 브라우저에 저장된 경기 기록이 없습니다.';return;}
 for(const x of local.records){const row=document.createElement('div');row.className='career-record';
  const name={solo:'싱글',pvp:'3라인 PvP',classic:'클래식 1:1',coop:'협동',practice:'AI 연습'}[x.mode]||x.mode;
  row.textContent=new Date(x.at).toLocaleString('ko-KR')+' · '+name+' · '+x.result+(x.forfeit?' (탈주 판정)':'')+' · W'+x.wave+' · '+Math.floor(x.seconds/60)+'분 '+x.seconds%60+'초';
  history.append(row);
 }
}
function setMode(mode){
 const panel=$('careerPanel');if(!panel)return;
 mode=global.DesertMember?.isMember?.()?'member':mode==='signup'?'signup':'login';
 panel.dataset.authMode=mode;
 $('careerTabLogin')?.setAttribute('aria-pressed',String(mode==='login'));
 $('careerTabSignup')?.setAttribute('aria-pressed',String(mode==='signup'));
 $('careerTabLogin')?.classList.toggle('active',mode==='login');
 $('careerTabSignup')?.classList.toggle('active',mode==='signup');
 const title=$('careerDialogTitle');if(title)title.textContent=mode==='member'?'회원 정보 · 전적':mode==='signup'?'지휘관 회원가입':'지휘관 로그인';
 const password=$('careerPassword');
 if(password)password.autocomplete=mode==='signup'?'new-password':'current-password';
}
function open({history=false}={}){
 const layer=$('careerLayer');if(!layer)return;
 lastFocused=document.activeElement;
 layer.hidden=false;document.body.classList.add('career-modal-open');
 setMode(global.DesertMember?.isMember?.()?'member':'login');
 render();
 if(history){if($('careerHistoryDetails'))$('careerHistoryDetails').open=true;
  $('careerHistoryDetails')?.scrollIntoView?.({block:'nearest'});}
 else $('careerEmail')?.focus?.();
 if(global.DesertMember?.isMember?.())$('careerClose')?.focus?.();
}
function close(){
 const layer=$('careerLayer');if(!layer||layer.hidden)return;
 layer.hidden=true;document.body.classList.remove('career-modal-open');
 const pw=$('careerPassword');if(pw)pw.value='';
 lastFocused?.focus?.();
}
function init(){
 $('careerOpen')?.addEventListener('click',()=>open());
 $('lobbyRankModes')?.addEventListener('click',e=>{const b=e.target.closest('[data-rank-mode]');if(!b)return;rankMode=b.dataset.rankMode;renderLadders();});
 $('careerHistoryOpen')?.addEventListener('click',()=>open({history:true}));
 $('careerClose')?.addEventListener('click',close);
 $('careerTabLogin')?.addEventListener('click',()=>setMode('login'));
 $('careerTabSignup')?.addEventListener('click',()=>setMode('signup'));
 $('careerLayer')?.addEventListener('click',e=>{if(e.target===$('careerLayer'))close();});
 document.addEventListener('keydown',e=>{
  const layer=$('careerLayer');if(!layer||layer.hidden)return;
  if(e.key==='Escape'){e.preventDefault();close();return;}
  if(e.key==='Tab'){
   const fields=[...layer.querySelectorAll('button:not([hidden]):not(:disabled),input:not([hidden]):not(:disabled)')]
    .filter(el=>el.getClientRects?.().length);
   if(!fields.length)return;
   if(e.shiftKey&&document.activeElement===fields[0]){e.preventDefault();fields[fields.length-1].focus();}
   else if(!e.shiftKey&&document.activeElement===fields[fields.length-1]){e.preventDefault();fields[0].focus();}
  }
 });
 render();
}
global.DesertCareer=Object.freeze({record,render,open,close,setMode,tier,rankInfo,setServerRating,setLadders,rating:()=>rankInfo().rating,history:()=>local.records.slice()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
