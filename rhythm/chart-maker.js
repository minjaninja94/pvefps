/* NEON DUEL YouTube Beat Lab
 * Processes frequency-energy features from a tab audio stream explicitly shared by
 * the user. This page does not download, record, transmit or save source media.
 * Only numerical onset timestamps and a compact game chart can be saved.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const MAX=300, MIN_POINTS=12, LIMIT=1000;
const values={player:null, videoId:'', ready:false, playing:false, duration:0, capturing:false,
  stream:null,ctx:null,source:null,analyser:null,arr:null,prev:null,previousFlux:0,olderFlux:0,
  recent:[],lastMediaTime:0,lastSpike:-10,peaks:[],chart:null,raf:0,started:false,animationSeq:0};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const label=s=>{$('status').textContent=s};
const fmt=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
function youtubeId(url){
 try{const u=new URL(url),domain=u.hostname.toLowerCase().replace(/^www\./,'');let id='';
  if(domain==='youtu.be')id=u.pathname.split('/')[1]||'';
  else if(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(domain))
   id=u.searchParams.get('v')||u.pathname.match(/\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/)?.[1]||'';
  return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
 }catch{return null}
}
function hash(s){let n=2166136261;for(let c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0}
function resetAnalysis(){
 values.peaks=[];values.recent=[];values.previousFlux=0;values.olderFlux=0;values.lastMediaTime=0;values.lastSpike=-10;values.chart=null;values.started=false;
 if(values.prev)values.prev.fill(0);
 $('result').hidden=true;$('onsetCount').textContent='0';$('noteCount').textContent='0';$('bpm').textContent='—';$('bar').style.width='0%';
 $('stateLabel').textContent='대기 중';
 draw();
}
function validateDuration(){
 if(!values.player||!values.ready)return false;
 let duration=Number(values.player.getDuration());
 if(!Number.isFinite(duration)||duration<=0)return false;
 if(duration>MAX+.01){
  label('이 영상은 '+Math.round(duration)+'초입니다. 최대 5분(300초)까지만 허용됩니다.');
  values.player.stopVideo();closeCapture();$('capture').disabled=true;return false;
 }
 values.duration=duration;return true
}
async function readyAPI(){
 if(window.YT?.Player)return;
 await new Promise((resolve,reject)=>{
  const begun=Date.now();const poll=()=>{
   if(window.YT?.Player)resolve();
   else if(Date.now()-begun>15000)reject(Error('YouTube 공식 플레이어를 불러오지 못했습니다.'));
   else setTimeout(poll,120)
  };poll()
 })
}
function onState(ev){
 values.playing=ev.data===1;
 if(values.playing){
  if(!validateDuration()){label('영상 길이를 확인하는 중입니다. 5분을 초과하면 분석을 차단합니다.');return}
  if(!values.capturing){label('영상이 재생 중입니다. 비트 분석을 시작하려면 ② 이 탭 오디오 공유를 누르세요.');return}
  values.started=true;
  $('stateLabel').textContent='재생·실시간 분석 중';
  label('실시간 분석 중 · 영상이 끝나면 자동으로 채보가 생성됩니다.');
 }
 if(ev.data===0 && values.capturing && values.peaks.length>=MIN_POINTS)finishCapture();
 if(ev.data===2&&values.capturing)label('일시정지됨 · YouTube ▶를 누르면 이어서 분석합니다.');
}
async function loadVideo(){
 const id=youtubeId($('url').value.trim());
 if(!id){label('올바른 YouTube 링크를 입력하세요.');return}
 $('load').disabled=true;closeCapture();resetAnalysis();values.videoId=id;values.ready=false;values.duration=0;
 try{
  await readyAPI();
  if(values.player){
   values.player.cueVideoById(id);
   values.ready=true;
  }else{
   await new Promise((resolve,reject)=>{
    let settled=false;const tm=setTimeout(()=>{if(!settled){settled=true;reject(Error('플레이어 시간 초과'))}},16000);
    let p=new YT.Player('youtube-player',{videoId:id,playerVars:{controls:1,playsinline:1,rel:0,origin:location.origin},events:{
     onReady:()=>{if(!settled){settled=true;clearTimeout(tm);values.player=p;values.ready=true;resolve()}},
     onStateChange:onState,
     onError:e=>label('영상 재생이 제한됐습니다 (YouTube 오류 '+e.data+'). 다른 영상 링크로 시도하세요.')
    }})
   })
  }
  $('capture').disabled=false;
  label('영상 준비 완료. ②를 누르고 공유 창에서 이 탭과 탭 오디오 공유를 선택하세요. 그 후 YouTube ▶로 처음부터 재생하세요.');
 }catch(e){label('영상 로딩 실패: '+(e.message||e))}
 finally{$('load').disabled=false}
}
function closeCapture(){
 values.capturing=false;values.animationSeq++;
 cancelAnimationFrame(values.raf);
 if(values.stream){for(let t of values.stream.getTracks())try{t.stop()}catch{}}
 try{values.source?.disconnect()}catch{}
 try{values.analyser?.disconnect()}catch{}
 try{values.ctx?.close()}catch{}
 values.stream=null;values.source=null;values.ctx=null;values.analyser=null;values.arr=null;values.prev=null;
 $('finish').disabled=true;
}
async function shareTabAudio(){
 if(!values.ready){label('먼저 ①에서 영상 링크를 불러오세요.');return}
 if(!navigator.mediaDevices?.getDisplayMedia){label('이 브라우저는 탭 오디오 공유를 지원하지 않습니다. 데스크톱 Chrome 또는 Edge의 HTTPS 페이지에서 실행하세요.');return}
 // Must be invoked synchronously from the button's user activation.
 const task=navigator.mediaDevices.getDisplayMedia({
  video:{displaySurface:'browser'},audio:{echoCancellation:false,noiseSuppression:false},
  preferCurrentTab:true,selfBrowserSurface:'include',systemAudio:'exclude',surfaceSwitching:'exclude'
 });
 $('capture').disabled=true;
 let stream;
 try{stream=await task}catch(e){$('capture').disabled=false;label('공유가 취소되었거나 제한되었습니다: '+(e.message||e));return}
 if(!stream.getAudioTracks().length){
  stream.getTracks().forEach(t=>t.stop());$('capture').disabled=false;
  label('오디오가 공유되지 않았습니다. 다시 시도하고 화면 공유창의 「탭 오디오 공유」를 체크하세요.');return
 }
 closeCapture();resetAnalysis();
 values.stream=stream;
 try{
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)throw Error('Web Audio 미지원');
  values.ctx=new C();await values.ctx.resume();
  const audioTrack=stream.getAudioTracks()[0];
  values.source=values.ctx.createMediaStreamSource(new MediaStream([audioTrack]));
  values.analyser=values.ctx.createAnalyser();
  values.analyser.fftSize=2048;
  values.analyser.smoothingTimeConstant=.18;
  values.arr=new Uint8Array(values.analyser.frequencyBinCount);values.prev=new Uint8Array(values.arr.length);
  values.source.connect(values.analyser);
  stream.getVideoTracks()[0]?.addEventListener('ended',()=>{if(values.capturing){label('화면 공유가 종료됐습니다. 검출된 비트가 충분하면 ③을 눌러 채보를 생성할 수 있습니다.');closeCapture();if(values.peaks.length>=MIN_POINTS)finishCapture(true)}} ,{once:true});
  audioTrack.addEventListener('ended',()=>{if(values.capturing){label('오디오 공유가 종료됐습니다.');closeCapture()}},{once:true});
  values.capturing=true;values.started=false;
  $('capture').disabled=false;$('capture').textContent='↻ 공유 다시 선택';
  $('finish').disabled=false;
  values.player.pauseVideo();
  values.player.seekTo(0,true);
  label('탭 오디오 공유 완료. 이 탭의 YouTube 플레이어에서 ▶를 눌러 처음부터 음악을 재생하세요. 비트 검출이 시작됩니다.');
  values.raf=requestAnimationFrame(loop);
 }catch(e){closeCapture();$('capture').disabled=false;label('오디오 분석 시작 실패: '+e.message)}
}
function captureFrame(time){
 if(!values.analyser||!values.playing)return;
 values.analyser.getByteFrequencyData(values.arr);
 let flux=0,level=0,n=0;
 // Spectral flux gives peaks on percussion and melodic attacks, not wall-clock random notes.
 for(let k=5;k<Math.min(values.arr.length,240);k++){
  const v=values.arr[k];
  flux+=Math.max(0,v-values.prev[k])*(k<115?1:.62);
  level+=v;n++;values.prev[k]=v
 }
 flux/=n||1;level/=n||1;
 const recent=values.recent;
 const avg=recent.length?recent.reduce((a,b)=>a+b,0)/recent.length:0;
 const peak=values.previousFlux;
 const prevTime=values.lastMediaTime;
 const localPeak=values.olderFlux<=peak&&peak>flux&&peak>Math.max(1.4,avg*1.65);
 if(localPeak && level>9 && prevTime-values.lastSpike>.14){
  const strength=clamp(peak/18,.03,1);
  values.peaks.push([Math.round(prevTime*1000)/1000,Math.round(strength*1000)/1000]);
  values.lastSpike=prevTime;
  $('onsetCount').textContent=values.peaks.length;
 }
 values.olderFlux=peak;values.previousFlux=flux;
 recent.push(flux);if(recent.length>45)recent.shift();
 values.lastMediaTime=time;
}
function draw(){
 const c=$('beats'),g=c.getContext('2d');if(!g)return;
 g.fillStyle='#080f21';g.fillRect(0,0,c.width,c.height);
 const d=values.duration||300;
 for(let i=1;i<10;i++){g.strokeStyle='#48537744';g.beginPath();g.moveTo(c.width*i/10,0);g.lineTo(c.width*i/10,c.height);g.stroke()}
 const peaks=values.peaks;
 g.fillStyle='#63e5ff';
 for(const [t,v] of peaks){
  const x=t/d*c.width;const h=clamp(10+v*110,8,120);
  g.fillRect(x,c.height-h,Math.max(1,c.width/d*.06),h)
 }
 g.fillStyle='#ff64ac';g.fillRect(values.lastMediaTime/d*c.width,0,2,c.height)
}
function loop(){
 if(!values.capturing)return;
 const t=values.player?Number(values.player.getCurrentTime())||0:0;
 if(values.playing){
  if(!validateDuration()){return}
  if(values.lastMediaTime && t+1.5<values.lastMediaTime){
   label('영상 재생 위치가 뒤로 이동했습니다. 검출 결과를 새로 시작합니다.');
   resetAnalysis();
  }
  if(t>=values.duration-.06&&values.duration>0){finishCapture();return}
  if(t>=0&&t<=MAX){captureFrame(t);values.started=true}
 }
 $('position').textContent=fmt(Math.max(0,t))+' / '+fmt(values.duration||0);
 $('bar').style.width=(values.duration?clamp(t/values.duration*100,0,100):0)+'%';
 const current=values.animationSeq;
 if(values.capturing){values.raf=requestAnimationFrame(()=>{if(current===values.animationSeq){draw();loop()}})}
}
function tempo(points){
 let scores=new Map();
 for(let i=0;i<points.length;i++){
  for(let j=i+1;j<Math.min(points.length,i+12);j++){
   let diff=points[j][0]-points[i][0];
   if(diff<.14||diff>4)continue;
   let bpm=60/diff;
   while(bpm<75)bpm*=2;while(bpm>180)bpm/=2;
   const rounded=Math.round(bpm);
   scores.set(rounded,(scores.get(rounded)||0)+(points[i][1]+points[j][1])*.5)
  }
 }
 let ranked=[...scores].sort((a,b)=>b[1]-a[1]);
 return ranked[0]?.[0]||120
}
function finishCapture(fromEnded=false){
 if(!fromEnded && !values.capturing)return;
 const duration=values.duration, peaks=values.peaks.slice();
 closeCapture();
 values.playing=false;
 try{values.player?.pauseVideo()}catch{}
 if(peaks.length<MIN_POINTS){label('검출한 박자가 '+peaks.length+'개뿐입니다. 오디오 공유 여부를 확인하고 영상을 다시 재생하세요.');return}
 if(duration>MAX||duration<=0){label('5분 이하 길이가 확인된 영상만 채보 생성이 가능합니다.');return}
 const bpm=tempo(peaks);
 const chart=window.RhythmChart.makeChart({bpm,beats:peaks,duration},{difficulty:$('difficulty').value,seed:hash(values.videoId),offset:0});
 if(!chart.entries.length){label('채보가 생성되지 않았습니다. 음질/공유 상태를 점검하세요.');return}
 values.chart=chart;
 $('noteCount').textContent=chart.entries.length;
 $('bpm').textContent=chart.bpm;
 $('result').hidden=false;
 $('resultText').textContent='영상 ID: '+values.videoId+' · 분석 '+peaks.length+'개 비트 · 채보 '+chart.entries.length+'개 노트 · 추정 '+chart.bpm+' BPM · 길이 '+fmt(duration)+'. 채보 데이터만 저장됩니다.';
 $('stateLabel').textContent='채보 생성 완료';
 label('분석을 마쳤습니다. ④ 게임에 채보 저장을 누르면 NEON DUEL에서 이 영상 링크를 선택했을 때 자동으로 불러옵니다.');
 draw()
}
function save(){
 if(!values.chart)return;
 try{
  localStorage.setItem('neon-duel-chart-v2:'+values.videoId,JSON.stringify(values.chart));
  $('status').textContent='✓ 게임에 채보 저장 완료. NEON DUEL에서 같은 YouTube 링크로 시작하세요.';
  $('save').textContent='✓ 저장됨';
 }catch(e){label('차트 저장 실패 (브라우저 저장소 사용 제한): '+e.message)}
}
function exportJson(){
 if(!values.chart)return;
 const body=JSON.stringify({generator:'NEON DUEL YouTube Beat Lab',videoId:values.videoId,chart:values.chart},null,2);
 const url=URL.createObjectURL(new Blob([body],{type:'application/json'}));
 const a=document.createElement('a');
 a.href=url;a.download='chart-'+values.videoId+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)
}
$('load').onclick=loadVideo;
$('capture').onclick=shareTabAudio;
$('finish').onclick=()=>finishCapture();
$('reset').onclick=()=>{closeCapture();resetAnalysis();$('capture').disabled=!values.ready;label('분석 초기화 완료. 오디오 공유를 다시 선택하세요.');};
$('save').onclick=save;$('export').onclick=exportJson;
window.addEventListener('pagehide',closeCapture);
window.NeonBeatLab=Object.freeze({youtubeId,tempo});
draw();
})();