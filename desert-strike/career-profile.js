/* Local detail history. Official member match RP is read-only from the server.
 * Browser records are user-visible history only, never a trusted result ledger.
 */
(function(global){
'use strict';
const KEY='desert-career-v1',TIERS=[[2300,'마스터'],[2000,'다이아몬드'],[1700,'플래티넘'],[1400,'골드'],[1100,'실버'],[0,'브론즈']];
const $=id=>document.getElementById(id),clamp=(x,a,b)=>Math.max(a,Math.min(b,Math.floor(Number(x)||0)));
let local=read(),server=null;
function read(){try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');return {rating:clamp(d.rating||1000,100,3000),records:Array.isArray(d.records)?d.records.slice(0,40):[]};}catch(_){return {rating:1000,records:[]};}}
function tier(r){return TIERS.find(x=>r>=x[0])[1];}
function setServerRating(rating,wins=0,losses=0){server={rating:clamp(rating,100,3000),wins,losses};render();}
function record(input){
 if(!input||!['solo','pvp','classic','coop','practice'].includes(input.mode))return;
 const result=input.winner===null?'무승부':input.winner===input.side?'승리':'패배';
 local.records.unshift({at:new Date().toISOString(),mode:input.mode,result,size:clamp(input.size||1,1,3),faction:clamp(input.faction,0,9),
 wave:clamp(input.wave,0,999),seconds:clamp(input.seconds,0,7200),forfeit:!!input.forfeit});
 local.records=local.records.slice(0,40);
 // Guest RP is strictly practice/unverified; authenticated RP is backend-only.
 if(!global.DesertMember?.isMember?.()&&input.online&&['pvp','classic'].includes(input.mode)&&result!=='무승부')
  local.rating=clamp(local.rating+(result==='승리'?24:-24),100,3000);
 try{localStorage.setItem(KEY,JSON.stringify(local));}catch(_){}
 render();
}
function render(){
 const member=global.DesertMember?.isMember?.(),rating=member?(server?.rating??1000):local.rating;
 const t=$('careerRating');if(t)t.textContent=(member?'서버 기록 · 비공식 ':'게스트 기록 · 비공식 ')+tier(rating)+' · '+rating+' RP'+(server?' · '+server.wins+'승 '+server.losses+'패':'');
 const history=$('careerHistory');if(!history)return;history.replaceChildren();
 if(!local.records.length){history.textContent='아직 이 기기에 저장된 경기 기록이 없습니다.';return;}
 for(const x of local.records){const row=document.createElement('div');row.className='career-record';
  const name={solo:'싱글',pvp:'3라인 PvP',classic:'클래식 1:1',coop:'협동',practice:'AI 연습'}[x.mode]||x.mode;
  row.textContent=new Date(x.at).toLocaleString('ko-KR')+' · '+name+' · '+x.result+(x.forfeit?' (탈주 판정)':'')+' · W'+x.wave+' · '+Math.floor(x.seconds/60)+'분 '+x.seconds%60+'초';
  history.append(row);
 }
}
function init(){
 $('careerOpen')?.addEventListener('click',()=>{const p=$('careerPanel');p.hidden=!p.hidden;if(!p.hidden)render();});
 $('careerClose')?.addEventListener('click',()=>{$('careerPanel').hidden=true;});
 render();
}
global.DesertCareer=Object.freeze({record,render,tier,setServerRating,rating:()=>global.DesertMember?.isMember?.()?(server?.rating??1000):local.rating,history:()=>local.records.slice()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
