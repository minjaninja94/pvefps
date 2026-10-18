
'use strict';
(()=>{
const $=id=>document.getElementById(id), canvas=$('stage'), g=canvas.getContext('2d'), ARROWS=['←','↓','↑','→'], COLORS=['#ff4b68','#35cafa','#39ed8a','#af70ff'], KEYMAP=['ArrowLeft','ArrowDown','ArrowUp','ArrowRight'];
const intro=2.5, SEG=8, GROUPS=20, BALANCE={easy:{botHit:.61,botPush:.20,miss:0.85,perfect:3.20,great:2.45,good:1.40,window:.235,perfectWindow:.070,greatWindow:.150},normal:{botHit:.77,botPush:.41,miss:1.35,perfect:2.30,great:1.65,good:.95,window:.195,perfectWindow:.055,greatWindow:.125},hard:{botHit:.90,botPush:.65,miss:2.25,perfect:1.85,great:1.30,good:.65,window:.155,perfectWindow:.045,greatWindow:.098}}, SETTINGS={neon:{bpm:136,root:52,title:'NEON SHOWDOWN'},midnight:{bpm:158,root:48,title:'MIDNIGHT CLASH'}};
let onlineMode=false, sourceMode="neon", yt=null, ytReady=false, ytPlaying=false, ytPromise=null, localFile=null, youtubeAudioAttached=false, fileSource=null, remoteSeen=new Set(),localSeq=0,lastClockSent=0,preparedAudio=null,peerAudioHash="",matchGroups=GROUPS,ytValidated=false,pendingStart=null,requestedChartId='', net=window.RhythmOnline;let audio=null,master=null,noise=null,activeVoices=[],timer=null,raf=0,session=0,st='menu',paused=false,record=null,notes=[],beat=0,finishTime=0,startAt=0,stepCursor=0,noteCursor=0;
let preparing=false;let ending=null,remoteComplete=false,awaitingEnd=0;let fight=null,attackFx=null,fighterP='celeste',fighterB='ruby';
let pressed=[false,false,false,false],strength=50,score=0,combo=0,maxCombo=0,accSum=0,counts={perfect:0,great:0,good:0,miss:0},botHits=0,botMissUntil=0,judgement='',judgeEnd=0,prevPhrase=-1,flashLanes=[0,0,0,0],playerSing=0,botSing=0,lastShown=0,effects=[],wasFinished=false;
const feedback=window.NeonFeedback.create(),feedbackG=$('feedbackStage').getContext('2d');let rivalCombo=0,powerPulse=null,rigClock=0,rigLast=performance.now()/1000;
let options=window.NeonProfileStore.load();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(n)=>{let x=Math.sin(n*127.1+78.233)*43758.5453;return x-Math.floor(x)};
function show(which){['menu','game','results'].forEach(id=>$(id).style.display=id===which?'block':'none');st=which;window.scrollTo({top:0,behavior:'instant'})}
function inputTime(){return time()-options.offset/1000}
function initAudio(){if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();let sr=audio.sampleRate;noise=audio.createBuffer(1,Math.round(sr*.35),sr);let d=noise.getChannelData(0),seed=913;for(let i=0;i<d.length;i++){seed=(1664525*seed+1013904223)>>>0;d[i]=seed/2147483648-1}}return audio}
function trackVoice(v){activeVoices.push(v);v.onended=()=>{activeVoices=activeVoices.filter(x=>x!==v);try{v.disconnect()}catch{}}}
function tone(f,start,dur,type,vol){if(!audio||!master)return;let osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(f,start);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+dur);osc.connect(gain);gain.connect(master);osc.start(start);osc.stop(start+dur+.02);trackVoice(osc)}
function noiseShot(when,dur,vol,filterFreq){if(!master)return;let src=audio.createBufferSource(),filter=audio.createBiquadFilter(),env=audio.createGain();src.buffer=noise;filter.type='highpass';filter.frequency.value=filterFreq;env.gain.setValueAtTime(vol,when);env.gain.exponentialRampToValueAtTime(.001,when+dur);src.connect(filter);filter.connect(env);env.connect(master);src.start(when);src.stop(when+dur+.01);trackVoice(src)}
function kick(at){if(!master)return;let o=audio.createOscillator(),v=audio.createGain();o.type='sine';o.frequency.setValueAtTime(140,at);o.frequency.exponentialRampToValueAtTime(42,at+.15);v.gain.setValueAtTime(.38,at);v.gain.exponentialRampToValueAtTime(.001,at+.21);o.connect(v);v.connect(master);o.start(at);o.stop(at+.23);trackVoice(o)}
function musicalNote(lane,owner,at,extra=0){if(!options.notes)return;let shift=[0,3,7,10][lane]+extra;let root=record.root-12+shift+(owner==='player'?12:0);let hz=440*Math.pow(2,(root-69)/12);tone(hz,at,.17,owner==='player'?'sawtooth':'triangle',(owner==='player'?.095:.14)*options.notes);tone(hz/2,at,.12,'sine',.07*options.notes)}
function percussion(step,at){let s=step%16;let rootShift=[0,-5,-7,-2][Math.floor(step/64)%4];if(s===0||s===8||s===10)kick(at);if(s===4||s===12)noiseShot(at,.13,.19,900);if(s%2===0)noiseShot(at,.042,s%4===0?.042:.026,6200);
if(s===0||s===6||s===8||s===14){let hz=440*Math.pow(2,((record.root-24+rootShift)-69)/12);tone(hz,at,.25,'sawtooth',.055)}
if(s%4===0){let hz=440*Math.pow(2,((record.root+12+rootShift+[0,3,7,10][Math.floor(step/4)%4])-69)/12);tone(hz,at,.15,'triangle',.045)}
}
function stopSound(){if(timer){clearInterval(timer);timer=null}if(master){try{master.gain.cancelScheduledValues(audio.currentTime);master.gain.setValueAtTime(.00001,audio.currentTime);master.disconnect()}catch(e){}master=null}for(let o of activeVoices){try{o.stop()}catch(e){}}activeVoices=[]}

function hashId(str){let n=2166136261;for(let c of str)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0}
function parseYouTube(raw){try{let u=new URL(raw),host=u.hostname.toLowerCase().replace(/^www\./,''),id=null;if(host==='youtu.be')id=u.pathname.slice(1).split('/')[0];else if(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(host))id=u.searchParams.get('v')||u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1];return /^[\w-]{11}$/.test(id||'')?id:null}catch{return null}}

function chartCacheKey(videoId){return 'neon-duel-chart-v2:'+videoId}
function cachedYouTubeChart(videoId){
 try{
  let raw=localStorage.getItem(chartCacheKey(videoId));if(!raw)return null;
  const data=JSON.parse(raw);
  window.RhythmChart.unpack(data,'guest');
  if(!data.entries.length)throw Error('노트가 없습니다');
  return data;
 }catch(e){return null}
}
function listSavedCharts(){
 const result=[];
 try{
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);
   if(!key||!key.startsWith('neon-duel-chart-v2:'))continue;
   const id=key.slice('neon-duel-chart-v2:'.length);
   if(!/^[A-Za-z0-9_-]{11}$/.test(id))continue;
   const data=cachedYouTubeChart(id);
   if(data)result.push({id,count:data.entries.length,bpm:data.bpm,duration:data.duration});
  }
 }catch(e){$('selectedChartStatus').textContent='브라우저 저장소에 접근할 수 없습니다. 저장한 브라우저와 주소에서 접속해 주세요.'}
 return result
}
function refreshSavedCharts(){
 const saved=listSavedCharts();
 const container=$('savedCharts');
 const selected=parseYouTube($('youtubeUrl').value);
 if(saved.length){
  container.innerHTML=saved.map(x=>'<button type="button" data-chart="'+x.id+'" data-selected="'+(x.id===selected)+'">♫ '+x.id+' <span style="opacity:.8">'+x.count+'노트 · '+Math.round(x.bpm)+' BPM</span></button>').join('');
 }else{
  container.textContent='저장된 채보 없음. 위 「유튜브 링크만으로 실제 리듬 채보 제작」에서 저장한 뒤 돌아오세요.';
 }
 updateSelectedChartStatus()
}
function updateSelectedChartStatus(){
 const id=parseYouTube($('youtubeUrl').value);
 const isYT=$('track').value==='youtube';
 const status=$('selectedChartStatus');
 const btn=$('start');
 if(!isYT){status.textContent=listSavedCharts().length+'개의 유튜브 채보가 저장돼 있습니다. 사용하려면 위에서 YouTube를 선택하세요.';if(!onlineMode)btn.textContent='▶ START BATTLE';return}
 if(!id){status.textContent='유효한 YouTube 영상 링크를 입력하세요.';if(!onlineMode)btn.textContent='▶ YouTube 링크 확인 필요';return}
 const chart=cachedYouTubeChart(id);
 status.textContent=chart
 ?'✓ 분석 완료된 저장 채보 연결됨 · '+chart.entries.length+'노트 · '+chart.bpm+' BPM · '+Math.round(chart.duration)+'초 · 게임 시작 시 이 채보를 사용합니다.'
 :'⚠ 이 영상에 저장된 분석 채보가 없습니다. 채보 제작기에서 저장한 동일한 영상을 선택하세요.';
 if(!onlineMode)btn.textContent=chart?'▶ 저장된 채보로 배틀 시작':'▶ BPM 채보로 시작 (분석 채보 없음)';
 $('savedCharts').querySelectorAll('button[data-chart]').forEach(btn=>btn.dataset.selected=String(btn.dataset.chart===id))
}
function restoreSavedChartSelection(){
 let id=null;
 try{
  const params=new URLSearchParams(location.search),fromLink=params.get('chart');
  if(fromLink&&/^[A-Za-z0-9_-]{11}$/.test(fromLink)){id=fromLink;requestedChartId=id}
  if(!id){
   const last=localStorage.getItem('neon-duel-last-video');
   if(last&&cachedYouTubeChart(last))id=last;
  }
 }catch(e){}
 if(!id){const charts=listSavedCharts();if(charts.length)id=charts[charts.length-1].id}
 if(id){
  $('track').value='youtube';
  $('youtubeUrl').value='https://www.youtube.com/watch?v='+id;
 }
 settingsUI();refreshSavedCharts();
}
function rememberYouTubeChart(videoId,chart){try{localStorage.setItem(chartCacheKey(videoId),JSON.stringify(chart));return true}catch(e){return false}}

function selectedConfig(){let mode=$('track').value,cfg={mode,diff:$('difficulty').value,speed:Number($('speed').value),arena:$('arena').value,practice:onlineMode?'off':$('practice').value};if(mode==='youtube'){let id=parseYouTube($('youtubeUrl').value);if(!id){alert('유튜브 링크를 확인하세요.');return null}cfg.videoId=id;cfg.bpm=clamp(Number($('customBpm').value)||136,60,220);cfg.offset=clamp(Number($('beatOffset').value)||0,0,60);cfg.root=40+hashId(id)%24;cfg.title='YOUTUBE / '+id;cfg.chart=cachedYouTubeChart(id)||undefined}return cfg}
function analyzeFile(buffer){let pcm=buffer.getChannelData(0),sr=buffer.sampleRate,hop=512,values=[],onsets=[];let len=Math.min(pcm.length,sr*270);
for(let i=0;i+hop<len;i+=hop){let power=0;for(let j=0;j<hop;j+=4)power+=pcm[i+j]*pcm[i+j];values.push(Math.sqrt(power/(hop/4)))}
let prior=-100;for(let i=25;i<values.length-2;i++){let avg=0;for(let j=1;j<=20;j++)avg+=values[i-j]/20;let delta=values[i]-values[i-3];if(i-prior>sr/hop*.13&&values[i]>Math.max(.012,avg*1.38)&&delta>Math.max(.004,avg*.22)&&values[i]>=values[i+1]){onsets.push(i*hop/sr);prior=i}}
let votes=new Map();for(let i=0;i<onsets.length;i++)for(let j=i+1;j<Math.min(i+8,onsets.length);j++){let x=60/(onsets[j]-onsets[i]);while(x<75)x*=2;while(x>180)x/=2;let k=Math.round(x);votes.set(k,(votes.get(k)||0)+1)}
let bpm=[...votes].sort((a,b)=>b[1]-a[1])[0]?.[0]||136;return {bpm,onsets:onsets.slice(0,1500)}}
window.onYouTubeIframeAPIReady=()=>{};
function validateYTDuration(){if(!ytReady||!yt)return false;const duration=Number(yt.getDuration());if(duration>window.RhythmChart.LIMIT+.01){yt.stopVideo();ytPlaying=false;stop();show('menu');$('analysisStatus').textContent='이 영상은 '+Math.round(duration)+'초입니다. 5분(300초) 이하 영상만 사용할 수 있습니다.';return false}if(duration>0){ytValidated=true;finishTime=Math.min(finishTime,duration);return true}return false}
async function prepareYouTube(id){
if(!window.YT?.Player){await new Promise((resolve,reject)=>{let start=Date.now();const check=()=>{if(window.YT?.Player)resolve();else if(Date.now()-start>15000)reject(Error('YouTube API가 응답하지 않습니다.'));else setTimeout(check,100)};check()})}
if(!yt){ytReady=false;yt=await new Promise((resolve,reject)=>{let player=new YT.Player('ytPlayer',{videoId:id,playerVars:{controls:1,playsinline:1,origin:location.origin},events:{onReady:()=>{ytReady=true;resolve(player)},onStateChange:ev=>{ytPlaying=ev.data===1;$('tvPlay').hidden=ytPlaying;$('tvPlay').disabled=ev.data===3;$('tvPlay').textContent=ev.data===3?'버퍼링…':'클릭해서 재생';if(st!=='game'||sourceMode!=='youtube')return;if(ytPlaying){if(!validateYTDuration()){$('syncInfo').textContent='영상 길이를 확인 중입니다 (최대 5분).';return}$('playHint').style.display='none';canvas.focus({preventScroll:true});$('syncInfo').textContent='공식 YouTube 재생 시간으로 채보 동기화 · '+record.bpm+' BPM '+(record.chart?'(파형 분석 채보)':'(직접 입력 채보)');let length=yt.getDuration();if(length>12)finishTime=Math.min(finishTime,length)}else if(ev.data===0){settleFight(time(),true);if(st==='game')complete()}else if(ev.data===2||ev.data===3)$('syncInfo').textContent='영상 일시정지/버퍼링 중 — 채보도 멈춥니다.'},onError:()=>{$('syncInfo').textContent='이 영상은 임베드가 제한될 수 있습니다. 다른 링크로 시도하세요.'}}});setTimeout(()=>reject(Error('유튜브 초기화 타임아웃')),16000)})}
return yt
}


async function prepareLocalAudio(){
 if(preparedAudio?.file===localFile){if(preparedAudio.difficulty!==$('difficulty').value){preparedAudio.chart=window.RhythmChart.makeChart(preparedAudio.analysis,{difficulty:$('difficulty').value,seed:Number.parseInt(preparedAudio.hash.slice(0,8),16)});preparedAudio.difficulty=$('difficulty').value}return preparedAudio}
 if(!localFile)throw Error('음악 파일을 선택하세요. 양쪽에서 같은 파일을 선택해야 합니다.');
 if(localFile.size>80*1024*1024)throw Error('파일 크기는 80MB 이하여야 합니다.');
 $('analysisStatus').textContent='음원 로딩 중 (1/3) · 파일을 읽고 있습니다';
 const bytes=await localFile.arrayBuffer();
 const digest=await window.RhythmChart.fingerprint(bytes);
 $('analysisStatus').textContent='파형 분석 중 (2/3) · 리듬 강세와 BPM 추출';
 initAudio();const decoded=await audio.decodeAudioData(bytes.slice(0));
 const analysis=window.RhythmChart.inspect(decoded);
 const chart=window.RhythmChart.makeChart(analysis,{difficulty:$('difficulty').value,seed:Number.parseInt(digest.slice(0,8),16)});
 $('analysisStatus').textContent='채보 준비 완료 (3/3) · '+Math.round(analysis.bpm)+' BPM / '+chart.entries.length+' 노트 / '+Math.round(decoded.duration)+'초';
 preparedAudio={file:localFile,buffer:decoded,hash:digest,chart,analysis,difficulty:$('difficulty').value};
 return preparedAudio;
}
function showPrepError(e){$('analysisStatus').textContent='준비 오류: '+(e?.message||e);if(onlineMode)roomStatus('준비 오류: '+(e?.message||e))}

function generateChart(){let diff=$('difficulty').value,denom=diff==='easy'?1:diff==='normal'?.5:.25,notesOut=[],duration=intro+GROUPS*SEG*beat+1.4;for(let phrase=0;phrase<GROUPS;phrase++){let side=(onlineMode&&net.role==='host')?(phrase%2===0?'player':'bot'):(phrase%2===0?'bot':'player'),base=intro+phrase*SEG*beat+(record.offset||0),steps=Math.round(SEG/denom);for(let i=0;i<steps;i++){let seed=phrase*233+i*41+record.root,lane=Math.floor(rand(seed+14)*4),pick=rand(seed+37),should=diff==='easy'?pick>.13:diff==='normal'?pick>.22:(i%2===0||pick>.44);if(!should)continue;
let when=base+i*denom*beat;let sustain=diff==='easy'?0:(i%11===4&&i<steps-3?denom*beat*1.8:0);
notesOut.push({id:notesOut.length,phrase,side,lane,t:when,duration:sustain,done:false,hold:false,missed:false,botDone:false})}}return {items:notesOut.sort((a,b)=>a.t-b.t),duration}}
async function newRound(cfg){if(preparing)return;preparing=true;$('start').disabled=true;try{await prepareRound(cfg)}catch(e){stop();show('menu');showPrepError(e)}finally{preparing=false;$('start').disabled=false}}
async function prepareRound(presetConfig){
 stop();wasFinished=false;ending=null;remoteComplete=false;awaitingEnd=0;initAudio();await audio.resume();
 let cfg=presetConfig||selectedConfig();if(!cfg)return;
 if(cfg.mode==='youtube'&&requestedChartId===cfg.videoId&&!cfg.chart&&!(localFile&&youtubeAudioAttached)){
  $('analysisStatus').textContent='저장된 채보를 찾지 못했습니다. 제작기에서 저장한 브라우저·사이트 주소가 동일한지 확인하세요. BPM 임시 채보로 대체하지 않았습니다.';
  show('menu');refreshSavedCharts();return;
 }
 if(!['neon','midnight','youtube','file'].includes(cfg.mode)||!['easy','normal','hard'].includes(cfg.diff)||![1,1.25,1.5,1.8].includes(cfg.speed)){showPrepError(Error('대결 설정이 올바르지 않습니다.'));return}
 if(onlineMode)cfg.practice='off';
 let base=SETTINGS[cfg.mode]||SETTINGS.neon;
 record={...base,...cfg,diff:cfg.diff||$('difficulty').value,speed:cfg.speed||Number($('speed').value),root:cfg.root||base.root,bpm:cfg.bpm||base.bpm,title:cfg.title||base.title};
 sourceMode=cfg.mode;beat=60/record.bpm;

 let chart;
 if(sourceMode==='youtube'&&youtubeAudioAttached&&localFile&&(!onlineMode||net.role==='host')){try{const prep=await prepareLocalAudio();cfg.chart=prep.chart;rememberYouTubeChart(record.videoId,cfg.chart)}catch(e){showPrepError(e);return}}if(sourceMode==='youtube')record.chart=cfg.chart||null;
 if(sourceMode==='file'){
  try{
   const prep=await prepareLocalAudio();
   if(onlineMode&&cfg.assetHash!==prep.hash)throw Error('양쪽 음원 파일이 서로 다릅니다. 같은 파일을 골라주세요.');
   record.buffer=prep.buffer;
   chart=onlineMode?cfg.chart:prep.chart;
   if(!chart)throw Error('호스트 채보를 아직 받지 못했습니다.');
   record.bpm=chart.bpm;record.offset=Number(chart.offset)||0;
   beat=60/record.bpm;
   record.title=localFile.name.slice(0,36);
   notes=window.RhythmChart.unpack(chart,onlineMode?net.role:'guest');
   matchGroups=chart.groups;
   finishTime=chart.duration;
   $('analysisStatus').textContent='채보 로딩 완료 · '+notes.length+'개 노트';
  }catch(e){showPrepError(e);return}
 }else if(sourceMode==='youtube'&&cfg.chart){try{chart=cfg.chart;notes=window.RhythmChart.unpack(chart,onlineMode?net.role:'guest');matchGroups=chart.groups;record.bpm=chart.bpm;beat=60/record.bpm;const shift=Number(cfg.offset)||0;record.offset=(Number(chart.offset)||0)+shift;for(const n of notes)n.t+=shift;finishTime=chart.duration+shift;$('analysisStatus').textContent='실제 음원 분석 채보 적용: '+notes.length+'개 노트'}catch(e){showPrepError(e);return}
 }else{
  chart=generateChart();notes=chart.items;matchGroups=GROUPS;finishTime=chart.duration+(record.offset||0);
 }
 const layoutSeed=hashId(JSON.stringify(notes.map(n=>[n.id,n.t,n.duration,n.phrase]))+'|'+record.bpm);
 window.RhythmChart.remix(notes,layoutSeed);window.NeonPowerNotes.apply(notes,layoutSeed,finishTime);powerPulse=null;
 fight=window.RhythmClash.make(notes);attackFx=null;$('battleAnnounce').textContent='';
 fighterP=fromForm('P');fighterB=onlineMode&&remoteAppearance?remoteAppearance:fromForm('B');
 $('fighterPName').textContent=window.NeonFighters.get(fighterP).name;
 $('fighterBName').textContent=window.NeonFighters.get(fighterB).name;
 $('rivalType').textContent=onlineMode?'2P · RIVAL':'CPU · RIVAL';
 updateFightHUD();
 stepCursor=noteCursor=0;strength=50;score=combo=maxCombo=accSum=botHits=0;counts={perfect:0,great:0,good:0,miss:0};
 feedback.clear();rivalCombo=0;pressed=[false,false,false,false];flashLanes=[0,0,0,0];judgeEnd=0;prevPhrase=-1;playerSing=botSing=0;botMissUntil=0;effects=[];lastShown=0;paused=false;ytPlaying=false;ytValidated=false;remoteSeen.clear();localSeq=0;lastClockSent=0;
 $('chartSource').textContent=sourceMode==='youtube'?(record.chart?'✓ 저장된 실제 분석 채보 '+notes.length+'개 사용 중 · 영상 '+record.videoId:'⚠ 저장 채보 없음 — '+notes.length+'개의 BPM 기반 임시 채보'):(sourceMode==='file'?'✓ 로컬 음원 분석 채보 '+notes.length+'개':'내장 데모 채보 '+notes.length+'개');
 $('pause').disabled=false;$('skipFinish').hidden=true;$('pause').textContent='Ⅱ PAUSE (ESC)';$('trackname').textContent=record.title;$('round').textContent='1/'+Math.ceil(matchGroups/2);updateHUD();
 $('youtubeOverlay').style.display=sourceMode==='youtube'?'block':'none';document.querySelector('.gameboard').classList.toggle('hasTV',sourceMode==='youtube');document.querySelector('.fightHUD').classList.toggle('hasTV',sourceMode==='youtube');$('tvPlay').hidden=false;$('tvPlay').disabled=true;$('tvPlay').textContent='로딩…';
 $('playHint').style.display=sourceMode==='youtube'?'block':'none';
 $('syncInfo').textContent=sourceMode==='youtube'?(cfg.chart?'저장 채보 적용 완료 · '+notes.length+'노트 · 공식 영상 ▶을 눌러주세요':'저장된 채보 없음 · 임시 BPM 채보 · 영상 ▶을 눌러주세요'):sourceMode==='file'?'음향 강세 분석 완료 · '+notes.length+'개 채보를 로딩했습니다':'자체 제작 배틀곡';
 show('game');render(0);const loadSession=session;
 if(sourceMode==='youtube'){
  initAudio();await audio.resume();
  $('syncInfo').textContent='채보 준비 완료 · 공식 YouTube 플레이어를 불러오는 중…';raf=requestAnimationFrame(safeLoop);
  try{await prepareYouTube(record.videoId);if(session!==loadSession)return;yt.cueVideoById(record.videoId);yt.setVolume(options.music*100);$('tvPlay').disabled=false;$('tvPlay').textContent='클릭해서 재생';$('syncInfo').textContent='채보 '+notes.length+'개 적용 완료 · 공식 영상 ▶을 눌러주세요'}
  catch(e){stop();show('menu');showPrepError(Error('YouTube 플레이어 로딩 실패: '+e.message))}
  return
 }
 try{
  initAudio();await audio.resume();master=audio.createGain();master.gain.value=.72*options.music;master.connect(audio.destination);startAt=audio.currentTime+Math.max(.3,cfg.startsAt?(cfg.startsAt-Date.now())/1000:.45);
  if(sourceMode==='file'){fileSource=audio.createBufferSource();fileSource.buffer=record.buffer;fileSource.connect(master);fileSource.start(startAt)}
  else{session++;let current=session;timer=setInterval(()=>{if(current!==session||st!=='game'||paused)return;let until=audio.currentTime+.18,maxSteps=GROUPS*SEG*4;while(stepCursor<maxSteps&&startAt+intro+stepCursor*beat/4<until){percussion(stepCursor,startAt+intro+stepCursor*beat/4);stepCursor++}},28)}
  raf=requestAnimationFrame(safeLoop)
 }catch(e){alert('오디오 재생 실패: '+e.message);stop();show('menu')}
}
function stop(){session++;ending=null;$('skipFinish').hidden=true;cancelAnimationFrame(raf);if(fileSource){try{fileSource.stop()}catch(e){}fileSource.disconnect();fileSource=null}if(yt&&ytPlaying)try{yt.pauseVideo()}catch(e){}ytPlaying=false;stopSound();if(audio?.state==='suspended')audio.resume().catch(()=>{});paused=false;pressed.fill(false);document.querySelectorAll('[data-lane]').forEach(b=>b.classList.remove('held'))}
function time(){return sourceMode==='youtube'?(ytReady&&yt?Math.max(0,Number(yt.getCurrentTime())||0):0):(audio?audio.currentTime-startAt:0)}
function modifyStrength(v){strength=clamp(strength+v,0,100)}
function judge(kind,lane,noteId){const balance=BALANCE[record.diff];if(onlineMode&&net.isConnected())net.send({type:'judge',id:noteId,kind,seq:++localSeq});
 if(fight)window.RhythmClash.register(fight,'player',noteId,kind);counts[kind]++;judgement=kind.toUpperCase();judgeEnd=time()+.55;flashLanes[lane]=time()+.25;if(kind==='miss'){combo=0}else{combo++;maxCombo=Math.max(maxCombo,combo);let val={perfect:1,great:.68,good:.34}[kind];accSum+=val;score+=Math.round({perfect:1000,great:650,good:300}[kind]*(1+Math.min(combo,120)/150));playerSing=time()+.27;if(lane<4&&record.practice==='auto'&&sourceMode!=='youtube'&&audio&&master)musicalNote(lane,'player',Math.max(audio.currentTime,startAt),0);for(let i=0;i<(lane===4?0:10);i++)effects.push({x:74+lane*68,y:553,vx:(rand(i+time()*37)-.5)*12,vy:(rand(i+time()*19+45)-.7)*12,life:1,col:COLORS[lane]})}
if(lane===4)powerPulse={side:'player',kind,t:time(),energy:{perfect:24,great:18,good:12}[kind]||0};else feedback.show('player',kind,lane,time(),combo);updateHUD();updateFightHUD()}
function updateHUD(){let total=counts.perfect+counts.great+counts.good+counts.miss;$('score').textContent=score.toLocaleString();$('combo').textContent=combo;$('accuracy').textContent=(total?accSum/total*100:100).toFixed(1)+'%'}
function hit(lane){
 if(st!=='game'||paused||ending)return;
 const t=inputTime(),balance=BALANCE[record.diff];let candidate=null,diff=balance.window;
 for(const n of notes){if(n.side!=='player'||n.done||n.hold||n.lane!==lane)continue;const d=Math.abs(n.t-t);if(d<diff){diff=d;candidate=n}}
 if(!candidate)return;
 candidate.grade=diff<=balance.perfectWindow?'perfect':diff<=balance.greatWindow?'great':'good';
 if(candidate.duration>0){candidate.hold=true;candidate.holdUntil=candidate.t+candidate.duration;judgement='HOLD';judgeEnd=t+.4;flashLanes[lane]=t+.25;feedback.show('player','hold',lane,time(),combo)}
 else finishNote(candidate,candidate.grade);
}
function finishNote(n,grade){
 if(n.done)return;
 n.done=true;n.hold=false;judge(grade,n.lane,n.id);
 if(grade!=='miss'&&n.duration>0){score+=250;updateHUD()}
}
function release(lane){const t=inputTime();for(const n of notes)if(n.side==='player'&&n.lane===lane&&n.hold&&!n.done)finishNote(n,t<n.holdUntil-.105?'miss':n.grade||'good')}
function rivalJudgement(kind,lane,t){rivalCombo=kind==='miss'?0:rivalCombo+1;if(lane===4)powerPulse={side:'bot',kind,t,energy:{perfect:24,great:18,good:12}[kind]||0};else feedback.show('bot',kind,lane,t,rivalCombo)}
function autoBot(t){if(onlineMode)return;const balance=BALANCE[record.diff];for(let n of notes){if(n.side==='bot'&&!n.done&&t>=n.t-.07){n.done=true;const succeeds=rand(n.id*99+record.root)<balance.botHit,kind=succeeds?(rand(n.id*131+record.root)>.4?'perfect':'great'):'miss';
 if(succeeds){if(n.lane<4&&sourceMode!=='youtube'&&audio&&master)musicalNote(n.lane,'bot',Math.max(audio.currentTime,startAt+n.t));botHits++;botSing=n.t+.29}else botMissUntil=t+.37;
 window.RhythmClash.register(fight,'bot',n.id,kind);rivalJudgement(kind,n.lane,t);
}}}


let remoteAppearance=null;const customImages={P:'',B:''};
function shade(hex,mul=.57){
 if(!/^#[0-9a-f]{6}$/i.test(hex))return '#25335d';
 return '#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*mul).toString(16).padStart(2,'0')).join('');
}
function fromForm(side){
 const base=window.NeonFighters.get($('avatar'+side).value);
 const hair=$('color'+side).value,eye=$('eyeColor'+side).value,outfit=$('dressColor'+side).value;
 return {...base,...Object.fromEntries(['bustSize','waist','hips','height','headScale'].map(k=>[k,Number($(k+side).value)])),accessory:$('accessory'+side).value,palette:$('palette'+side).value,motion:Number($('motion'+side).value),bustMotion:Number($('bustMotion'+side).value),expression:$('expression'+side).value,faceParts:$('faceParts'+side).value!=='off',blinkMode:$('blinkMode'+side).value,hairAccent:$('hairAccent'+side).value!=='off',animationStyle:$('animationStyle'+side).value,lookStrength:Number($('lookStrength'+side).value),name:$('name'+side).value||base.name,skin:$('skin'+side).value,weapon:$('weapon'+side).value,art:$('art'+side).value,image:customImages[side],hair,hairDark:shade(hair),eye,outfit,style:$('hair'+side).value,
   species:$('species'+side).value,body:$('body'+side).value,
   bust:$('bust'+side).value,eyeShape:$('eyes'+side).value,costume:$('costume'+side).value};
}
function legalAppearance(data){return window.NeonStudio.legal(data)}
function applyProfile(side,profile){
 const p=legalAppearance(profile)||window.NeonFighters.PROFILES[side==='P'?0:1];
 for(const k of ['bustSize','waist','hips','height','headScale'])$(k+side).value=p[k]??(k==='bustSize'?.5:1);$('accessory'+side).value=p.accessory||'none';
 $('palette'+side).value=p.palette||'original';$('motion'+side).value=p.motion??.7;$('bustMotion'+side).value=p.bustMotion??.7;
 $('expression'+side).value=p.expression||'calm';$('faceParts'+side).value=p.faceParts===false?'off':'on';$('blinkMode'+side).value=p.blinkMode||'auto';$('hairAccent'+side).value=p.hairAccent===false?'off':'on';$('lookStrength'+side).value=p.lookStrength??.85;$('animationStyle'+side).value=p.animationStyle||'balanced';
 $('avatar'+side).value=p.id;customImages[side]=p.image||'';
 $('name'+side).value=p.name;$('skin'+side).value=p.skin;$('weapon'+side).value=p.weapon;$('art'+side).value=p.art||'vector';
 for(const [k,v] of [['hair',p.style||'long'],['species',p.species||'human'],['body',p.body||'balanced'],['bust',p.bust||'standard'],['costume',p.costume||'armor'],['eyes',p.eyeShape||'normal'],['color',p.hair],['eyeColor',p.eye],['dressColor',p.outfit]])$(k+side).value=v;
 syncStudioMode(side);previewProfile(side);
}
const previewActions={P:{action:'idle',start:0},B:{action:'idle',start:0}};
const portraitPresence={P:window.NeonPresence.create(.25),B:window.NeonPresence.create(.91)};
function previewProfile(side){
 const canvas=$('preview'+side),ctx=canvas.getContext('2d'),p=fromForm(side);
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.save();
 const now=performance.now()/1000,a=previewActions[side],age=now-a.start;
 const clip=window.NeonMotion?.clips[a.action],current=clip&&age>clip.duration&&!clip.loop?'idleA':a.action;
 const presence=portraitPresence[side].tick(now,{reduced:options.reduced,expression:p.expression});
 const facing=side==='P'?1:-1,strength=p.lookStrength??.85;
 presence.lookX*=strength*facing;presence.lookY*=strength;presence.tilt*=strength*facing;
 window.NeonStudio.draw(ctx,210,canvas.height-25,p,{facing:side==='P'?1:-1,scale:1.33,t:now,action:current,actionTime:current==='idleA'?now:age,presence,reduced:options.reduced});
 $('motionLabel'+side).textContent=current.toUpperCase();
 document.querySelectorAll('[data-doll-side="'+side+'"]').forEach(el=>el.classList.toggle('selected',el.dataset.dollKind==='head'?el.dataset.dollValue===p.style:el.dataset.dollValue===p.costume));
 ctx.restore();
}
function sendAppearance(){
 if(onlineMode&&net.isConnected())net.send({type:'appearance',profile:fromForm('P')});
}
function generateStyle(side,theme,locked=[]){
 const base=fromForm(side);
 const next=window.NeonWardrobeGenerator.create(base,{theme,locked,seed:Math.floor(Math.random()*0x7fffffff)});
 const profile=window.NeonStudio.legal(next);
 if(!profile)return;
 applyProfile(side,profile);if(side==='P')sendAppearance();
 $('studioStatus').textContent=profile.name+' · 테마 생성 완료'+(locked.length?' · 고정 '+locked.length+'개':'');
}
function applyLook(side,look){
 const valid=window.NeonStudio.legal({...fromForm(side),...look});
 if(!valid)return;
 applyProfile(side,valid);if(side==='P')sendAppearance();
 $('studioStatus').textContent='프리셋 적용: '+valid.name+' · 마음에 들면 저장해 주세요.';
}
function randomStyle(side){
 const pick=(list)=>list[Math.floor(Math.random()*list.length)];
 for(const id of ['avatar','hair','species','body','bust','eyes','costume']){
  const select=$(id+side);
  const options=[...select.options].filter(o=>!o.disabled);
  select.value=pick(options).value;
 }
 const colors=['#82eaff','#ffa5dc','#e3b0ff','#ffe3aa','#bbfc93','#f4769e','#b3bafc','#57dcc9','#f4eaf8'];
 $('color'+side).value=pick(colors);
 $('eyeColor'+side).value=pick(['#4beeff','#f3ae56','#ac7cfb','#48e49d','#d7567f','#438ae8']);
 $('dressColor'+side).value=pick(['#efeefc','#d45481','#5b3687','#365b85','#103e48','#443b60']);
 for(const [k,a,b]of [['bustSize',0,1],['waist',.85,1.1],['hips',.9,1.15],['height',.95,1.05],['headScale',.9,1.1]])$(k+side).value=(a+Math.random()*(b-a)).toFixed(2);$('accessory'+side).value=pick(['none','star','crystal','halo']);$('art'+side).value='doll';$('palette'+side).value=pick(['original','rose','midnight','emerald']);$('name'+side).value=window.NeonFighters.get($('avatar'+side).value).name;previewProfile(side);sendAppearance()
}
function setupCharacterStudio(){
 for(const side of ['P','B']){
  const choose=$('avatar'+side);
  choose.addEventListener('change',()=>{applyProfile(side,{...window.NeonFighters.get(choose.value),art:'doll'});sendAppearance()});
  for(const k of ['bustSize','waist','hips','height','headScale','accessory','palette','motion','bustMotion','expression','faceParts','blinkMode','hairAccent','lookStrength','animationStyle','name','skin','weapon','art','hair','species','body','bust','eyes','costume','color','eyeColor','dressColor'])
   $(k+side).addEventListener('input',()=>{syncStudioMode(side);previewProfile(side);if(side==='P')sendAppearance()});
  const portrait=$('preview'+side),controller=portraitPresence[side];
  portrait.addEventListener('pointermove',ev=>{
   const r=portrait.getBoundingClientRect();
   if(!r.width||!r.height)return;
   controller.aim(((ev.clientX-r.left)/r.width-.5)*2,((ev.clientY-r.top)/r.height-.48)*2);
  });
  portrait.addEventListener('pointerleave',()=>controller.release());
  portrait.addEventListener('pointercancel',()=>controller.release());
  portrait.addEventListener('pointerdown',()=>{controller.tap(performance.now()/1000);previewProfile(side)});
  $('random'+side).onclick=()=>generateStyle(side,$('theme'+side)?.value||'mixed',[...document.querySelectorAll('input[data-lock-group="'+side+'"]:checked')].map(c=>c.value));
  $('save'+side).onclick=()=>{try{const p=fromForm(side);window.NeonStudio.save(p);localStorage.setItem('neon-duel-fighter-'+side,JSON.stringify(p));$('save'+side).textContent='✓ 저장됨';renderWardrobe();$('studioStatus').textContent='보관함 저장 완료 · 최근 24명까지 보관합니다.'}catch(e){$('save'+side).textContent='저장 실패'}};
  let saved;try{saved=JSON.parse(localStorage.getItem('neon-duel-fighter-'+side)||'null')}catch(e){}
  applyProfile(side,saved?{...saved,art:saved.art==='custom'?'custom':'doll'}:{...window.NeonFighters.PROFILES[side==='P'?0:1],art:'doll',costume:side==='P'?'armor':'idol'});
  $('image'+side).onchange=async e=>{try{customImages[side]=await window.NeonStudio.imageFile(e.target.files[0]);$('art'+side).value='custom';syncStudioMode(side);previewProfile(side);sendAppearance();$('studioStatus').textContent='개인 이미지 적용 완료. 저장 버튼으로 보관하세요.'}catch(e){$('studioStatus').textContent=e.message}finally{e.target.value=''}};
 }
}

function syncStudioMode(side){
 const mode=$('art'+side).value,isDoll=mode==='doll';$('dressColor'+side).closest('label').hidden=isDoll&&$('palette'+side).value!=='custom';$('dollChoices'+side).hidden=!isDoll;
 for(const key of ['species','eyes','eyeColor'])$(key+side).closest('label').hidden=isDoll;
 for(const key of ['palette','motion','bustMotion'])$(key+side).closest('label').hidden=!isDoll;window.NeonStudioUI?.refresh(side);
}
function buildDollChoices(){
 for(const side of ['P','B']){
  for(const [kind,values,names]of [['head',window.NeonDoll.HEADS,['빙결','화염 여우','별빛','사이버 고양이']],['outfit',window.NeonDoll.COSTUMES,['기사','스테이지','스트리트','마도사','사이버']]]){
   const root=$(kind==='head'?'headChoices'+side:'outfitChoices'+side);root.replaceChildren();
   for(let i=0;i<values.length;i++){
    const value=values[i],btn=document.createElement('button'),c=document.createElement('canvas'),label=document.createElement('span');btn.type='button';btn.className='dollChoice';btn.dataset.dollSide=side;btn.dataset.dollKind=kind;btn.dataset.dollValue=value;btn.setAttribute('aria-label',names[i]);c.width=80;c.height=kind==='head'?80:114;
    if(kind==='head')window.NeonDoll.headIcon(c.getContext('2d'),value,c.width,c.height);else window.NeonDoll.draw(c.getContext('2d'),40,110,{...fromForm(side),costume:value,motion:0},{scale:.29,t:0,reduced:true});
    label.textContent=names[i];btn.append(c,label);btn.onclick=()=>{$((kind==='head'?'hair':'costume')+side).value=value;$('art'+side).value='doll';if(kind==='head')$('color'+side).value={long:'#84ebff',twin:'#ff7a98',wave:'#c9a6ff',short:'#b9ffcc'}[value];syncStudioMode(side);previewProfile(side);if(side==='P')sendAppearance()};root.append(btn);
   }
  }
 }
}
for(const btn of document.querySelectorAll('[data-preview-action]'))btn.onclick=()=>{const side=btn.dataset.previewSide;previewActions[side]={action:btn.dataset.previewAction,start:performance.now()/1000};previewProfile(side)};
let lastPreview=0;function animateStudio(now){if(st==='menu'&&document.querySelector('.fighterWorkshop').open&&now-lastPreview>33){lastPreview=now;const card=document.querySelector('.styleCard.studioActive');if(card)previewProfile(card.dataset.side||'P')}requestAnimationFrame(animateStudio)}
window.NeonDoll.onRefresh(()=>{const status=window.NeonDoll.status();$('dollLoadStatus').textContent='AI 파츠 '+status.loaded+' / '+status.total+' 로딩 중…'});
window.NeonDoll.ready().then(ok=>{$('dollLoadStatus').hidden=ok;$('dollLoadStatus').textContent=ok?'얼굴·헤어 4세트 × 의상 5종 · 대기/공격/피격 모션 준비 완료':'일부 파츠를 불러오지 못했습니다. 페이지를 새로고침해 주세요.';buildDollChoices();renderWardrobe();previewProfile('P');previewProfile('B')});
requestAnimationFrame(animateStudio);

function renderWardrobe(){
 const root=$('wardrobe');root.replaceChildren();
 for(const item of window.NeonStudio.list()){
  const card=document.createElement('article'),title=document.createElement('strong');title.textContent=item.profile.name;card.append(title);const thumb=document.createElement('canvas');thumb.width=100;thumb.height=135;window.NeonStudio.draw(thumb.getContext('2d'),50,130,item.profile,{scale:.35,t:0});card.append(thumb);
  for(const [label,fn] of [['1P 적용',()=>{applyProfile('P',item.profile);sendAppearance()}],['상대 적용',()=>applyProfile('B',item.profile)],['삭제',()=>{try{window.NeonStudio.remove(item.id);renderWardrobe()}catch(e){$('studioStatus').textContent=e.message}}]]){const btn=document.createElement('button');btn.type='button';btn.textContent=label;btn.onclick=fn;card.append(btn)}root.append(card);
 }
}
$('exportWardrobe').onclick=()=>window.NeonStudio.download('neon-clash-wardrobe.json',{format:'neon-clash-wardrobe',version:1,fighters:window.NeonStudio.list().map(v=>v.profile)});
$('importWardrobe').onchange=async e=>{try{const count=window.NeonStudio.importWardrobe(await window.NeonStudio.read(e.target.files[0]));renderWardrobe();$('studioStatus').textContent=count+'명의 파이터를 가져왔습니다.'}catch(e){$('studioStatus').textContent='가져오기 실패: '+e.message}finally{e.target.value=''}};
window.NeonStudio.onRefresh(()=>{previewProfile('P');previewProfile('B')});

function updateFightHUD(){
 if(!fight)return;
 for(const [side,h,superEl,name] of [['player','p','pSuper','fighterPName'],['bot','b','bSuper','fighterBName']]){
   const amount=Math.max(0,Math.min(100,fight.hp[side]));
   $(h+'HP').textContent=Math.round(amount);
   $(h+'HPBar').style.width=amount+'%';
   $(superEl).textContent=Math.round(fight.super[side]);
 }
 $('matchRound').textContent='ROUND '+String(Math.min(Math.ceil(matchGroups/2),fight.nextRound+1)).padStart(2,'0');
 const round=fight.nextRound;
 const p=window.RhythmClash.stats(fight,'player',round);
 const b=window.RhythmClash.stats(fight,'bot',round);
 $('pTurnScore').textContent='1P '+p.score+' / 1000';
 $('bTurnScore').textContent=(onlineMode?'2P ':'CPU ')+b.score+' / 1000';
}
function onFightResult(result){
 attackFx={side:result.winner,winner:result.winner,t:time(),round:result.round,damage:result.damage,finisher:result.finisher};

 let names={player:window.NeonFighters.get(fighterP).name,bot:window.NeonFighters.get(fighterB).name};
 $('battleAnnounce').textContent=result.winner==='draw'
 ?'DRAW · 무기 충돌! 힘겨루기!'
 :names[result.winner]+' 공격! -'+result.damage+' HP'+'';
 updateFightHUD();
}
function settleFight(t,force=false){
 if(!fight)return;
 if(force){for(const n of notes)if(n.side==='player'&&!n.done)finishNote(n,n.hold&&t>=n.holdUntil-.105?n.grade||'good':'miss')}
 const count=Math.ceil(matchGroups/2);
 while(fight.nextRound<count){
   const roundNotes=notes.filter(n=>Math.floor(n.phrase/2)===fight.nextRound);
   const boundary=Math.max(intro+(record.offset||0)+(fight.nextRound+1)*SEG*beat*2,...roundNotes.map(n=>n.t+(n.duration||0)+BALANCE[record.diff].window));
   if(!force&&t<boundary+(onlineMode?.3:.035))break;
   if(force&&roundNotes.every(n=>n.t>t))break;
   if(onlineMode&&net.role!=='host')break; // Host arbitrates turn score and damage.
   const result=window.RhythmClash.resolve(fight,fight.nextRound);
   if(!result)break;
   if(onlineMode&&net.isConnected())net.send({type:'roundResult',result});
   onFightResult(result);
   if((fight.hp.player<=0||fight.hp.bot<=0)&&(!record.practice||record.practice==='off')){complete();return}
 }
}

function progress(t){let anchor=intro+(record?.offset||0);if(t<anchor)return {phrase:-1,side:'intro',round:0,fraction:0};let q=Math.floor((t-anchor)/(SEG*beat));q=clamp(q,0,matchGroups-1);return {phrase:q,side:(onlineMode&&net.role==='host')?(q%2===0?'player':'bot'):(q%2===0?'bot':'player'),round:Math.floor(q/2)+1,fraction:((t-anchor)/(SEG*beat))%1}}
function safeLoop(){try{loop()}catch(e){console.error('NEON DUEL rendering error',e);const message='게임 화면 처리 오류: '+String(e?.message||e).slice(0,160);stop();show('menu');$('analysisStatus').textContent=message+' · 다시 시작해 주세요.'}}
function loop(){if(st!=='game')return;let t=time();if(!paused){if(sourceMode==='youtube'&&(!ytPlaying||!ytValidated)){if(ytPlaying)validateYTDuration();render(lastShown);raf=requestAnimationFrame(safeLoop);return}if(onlineMode&&net.role==='host'&&t-lastClockSent>3&&net.isConnected()){lastClockSent=t;net.send({type:'sync',t,hp:{...fight.hp},super:{...fight.super}})}autoBot(t);if(record.practice==='auto'&&!onlineMode){for(const n of notes)if(n.side==='player'&&!n.done&&inputTime()>=n.t)finishNote(n,'perfect')}for(let n of notes){if(n.side!=='player'||n.done)continue;if(n.hold){if(inputTime()>=n.holdUntil)finishNote(n,n.grade||'good');else if(!pressed[n.lane])finishNote(n,'miss')}else if(inputTime()>n.t+BALANCE[record.diff].window)finishNote(n,'miss')}let p=progress(t);if(p.phrase!==prevPhrase){prevPhrase=p.phrase;$('round').textContent=p.round+'/'+Math.ceil(matchGroups/2)}settleFight(t);if(st!=='game'||ending)return;if(t>=finishTime){settleFight(t,true);complete();return}lastShown=t}
render(lastShown);raf=requestAnimationFrame(safeLoop)}
function complete(fail=false){
 if(st!=='game'||wasFinished||ending)return;
 if(onlineMode&&net.role==='guest'&&!remoteComplete&&!fail){
  if(!awaitingEnd)awaitingEnd=performance.now();
  if(performance.now()-awaitingEnd<6000){$('syncInfo').textContent='방장의 최종 턴 결과를 확인 중…';raf=requestAnimationFrame(safeLoop);return}
  fail=true;
 }
 if(onlineMode&&net.role==='host'&&net.isConnected())net.send({type:'finish'});
 const winner=fight.hp.player===fight.hp.bot?'draw':fight.hp.player>fight.hp.bot?'player':'bot';
 const cinematic=!fail&&winner!=='draw'&&(!record.practice||record.practice==='off');
 const finalClash=!fail&&winner==='draw'&&(!record.practice||record.practice==='off');
 stop();const token=session;ending={start:performance.now(),fail,cinematic,finalClash,winner,cueIndex:0};
 if(finalClash){attackFx={side:'draw',winner:'draw',t:lastShown,damage:0,finisher:false,sounded:false};$('battleAnnounce').textContent='DRAW · 최종 합 겨루기!'}
 if(cinematic){$('youtubeOverlay').style.display='none';document.querySelector('.gameboard').classList.remove('hasTV');document.querySelector('.fightHUD').classList.remove('hasTV');$('pause').disabled=true;$('skipFinish').hidden=false;$('battleAnnounce').textContent=(winner==='player'?fighterP.name:fighterB.name)+' WIN';$('syncInfo').textContent='마무리 공격 · 상대를 장외로 날려보냅니다.'}
 const animate=()=>{if(session!==token||st!=='game'||!ending)return;try{render(lastShown);if(performance.now()-ending.start<(cinematic?window.NeonFinisher.DURATION*1000:finalClash?window.NeonCombatFX.CLASH_DURATION*1000:1000))raf=requestAnimationFrame(animate);else{ending=null;finishMatch(fail)}}catch(e){console.error('Victory animation failed',e);finishMatch(fail)}};
 raf=requestAnimationFrame(animate);
}
function finishMatch(fail=false){
 if(st!=='game'||wasFinished)return;wasFinished=true;stop();
 const total=counts.perfect+counts.great+counts.good+counts.miss,acc=total?accSum/total*100:0;
 const outcome=fail?'lose':fight.hp.player===fight.hp.bot?'draw':fight.hp.player>fight.hp.bot?'win':'lose',training=record.practice&&record.practice!=='off';
 const grade=acc>=95?'SS':acc>=86?'S':acc>=76?'A':acc>=62?'B':'C';
 $('results').classList.toggle('lose',outcome==='lose');
 $('resulttitle').textContent=fail?'DISCONNECTED':training?'PRACTICE END':outcome==='draw'?'DRAW!':outcome==='win'?'YOU WIN!':onlineMode?'RIVAL WINS!':'BOT WINS!';
 $('resultdesc').textContent=(training?'연습 대결 · 전적에 기록하지 않습니다. ':fail?'연결이 종료되어 전적에 기록하지 않았습니다. ':'')+'랭크 '+grade+' · HP '+Math.round(fight.hp.player)+' : '+Math.round(fight.hp.bot)+' · 턴 대결 '+fight.results.length+'회';
 $('rscore').textContent=score.toLocaleString();$('racc').textContent=acc.toFixed(1)+'%';$('rmax').textContent=maxCombo;$('rperfect').textContent=counts.perfect;$('rmedium').textContent=counts.great+' / '+counts.good;$('rmiss').textContent=counts.miss;
 const table=document.createElement('table');const head=table.createTHead().insertRow();for(const label of ['턴','내 점수','상대 점수','공격 / 피해']){const th=document.createElement('th');th.textContent=label;head.append(th)}
 const body=table.createTBody();for(const r of fight.results){const row=body.insertRow();row.className=r.winner==='player'?'won':r.winner==='bot'?'lost':'';for(const value of [r.round+1,r.player?.score??0,r.bot?.score??0,r.winner==='draw'?'방어':(r.winner==='player'?'내 공격':'상대 공격')+' −'+r.damage+' HP'+(r.finisher?' ★':'')])row.insertCell().textContent=value}
 $('roundHistory').replaceChildren(table);
 if(!training&&!fail){try{window.NeonProfileStore.result({title:record.title,key:record.videoId||record.assetHash||record.mode,diff:record.diff,mode:onlineMode?'online':'solo',score,accuracy:acc,combo:maxCombo,outcome});renderHistory()}catch(e){$('resultdesc').textContent+=' · 전적 저장 실패: 브라우저 저장 공간을 확인하세요.'}}
 show('results');
}
function togglePause(remote=false){if(st!=='game'||ending)return;paused=!paused;if(sourceMode==='youtube'){if(paused)yt?.pauseVideo();else yt?.playVideo()}else if(audio){if(paused)audio.suspend();else audio.resume()}$('pause').textContent=paused?'▶ RESUME':'Ⅱ PAUSE (ESC)';if(!remote&&onlineMode)net.send({type:'pause',paused})}
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h)}
function rounded(x,y,w,h,r,color){g.fillStyle=color;g.beginPath();g.roundRect(x,y,w,h,r);g.fill()}
function line(x,y,x2,y2,color,width=2){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke()}
function text(s,x,y,font,color,align='center'){g.font=font;g.textAlign=align;g.fillStyle=color;g.fillText(s,x,y)}
function circle(x,y,r,col){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=col;g.fill()}
function star(x,y,r,col){g.save();g.translate(x,y);g.rotate(Math.PI/4);rect(-r/2,-r/2,r,r,col);g.restore()}
function arrow(x,y,lane,size,col,alpha=1){g.save();g.translate(x,y);g.globalAlpha=alpha;g.rotate([Math.PI,Math.PI/2,-Math.PI/2,0][lane]);g.shadowColor=col;g.shadowBlur=18;g.beginPath();g.moveTo(size*.55,0);g.lineTo(-size*.02,-size*.54);g.lineTo(-size*.02,-size*.27);g.lineTo(-size*.65,-size*.27);g.lineTo(-size*.65,size*.27);g.lineTo(-size*.02,size*.27);g.lineTo(-size*.02,size*.54);g.closePath();g.fillStyle=col;g.fill();g.strokeStyle='#ffffffb8';g.lineWidth=2;g.stroke();g.shadowBlur=0;g.restore()}
function speakers(){g.save();g.translate(600,535);rounded(-70,-74,140,195,10,'#080d23');rounded(-64,-67,128,182,8,'#38324e');for(let pos of [-22,66]){circle(0,pos,44,'#11182d');circle(0,pos,33,'#6853b9');circle(0,pos,24,'#241e48');circle(0,pos,10,'#a872ff')}rounded(-45,-65,90,16,4,'#120d24');g.restore()}
// Vector anime fighters are supplied by NeonFighters.draw().
function fighterStage(t){
 const age=attackFx?Math.max(0,t-attackFx.t)+(ending?(performance.now()-ending.start)/1000:0):99;
 const isDraw=attackFx?.winner==='draw';
 const clash=isDraw?window.NeonCombatFX.clashMotion(age,options.reduced):null;
 const clashing=!!clash?.active;
 const active=!clashing&&age<1.3&&attackFx?.side!=='draw';
 const m=window.NeonCombatFX.motion(age,attackFx?.finisher),isP=attackFx?.side==='player',reduced=typeof options!=='undefined'&&options.reduced;
 const endAge=ending?Math.min(1,(performance.now()-ending.start)/750):0;
 const pKO=ending&&(ending.fail||fight.hp.player<fight.hp.bot)?endAge:0,bKO=ending&&!ending.fail&&fight.hp.bot<fight.hp.player?endAge:0;
 if(reduced)m.reach=0;
 const pX=430+(clashing?clash.advance+clash.shove:active?(isP?m.reach:-m.hit*25):0);
 const bX=770+(clashing?-clash.advance-clash.shove:active?(!isP?-m.reach:m.hit*25):0);
 // Both fighters lunge, brace against each other's weapon, struggle, then recoil.
 // Their atlas poses are held at the weapon-contact frame during the lock.
 const strike=['attack','attack2','attack3'][Math.abs(attackFx?.round||0)%3];
 const phase=progress(t),elapsed=t-(intro+(record?.offset||0)+Math.max(0,phase.phrase)*SEG*beat);
 const pIdle=fighterP?.animationStyle==='graceful'?'idleB':fighterP?.animationStyle==='energetic'?'idleC':'idleA';
 const bIdle=fighterB?.animationStyle==='graceful'?'idleB':fighterB?.animationStyle==='energetic'?'idleC':'idleA';
 const pReady=phase.side==='player'&&elapsed>=0&&elapsed<.8;
 const bReady=phase.side==='bot'&&elapsed>=0&&elapsed<.8;
 const pAction=clashing?'drawClash':active?(isP?strike:'hit'):pReady?'ready':pIdle;
 const bAction=clashing?'drawClash':active?(!isP?strike:'hit'):bReady?'ready':bIdle;
 const pActionTime=clashing?clash.poseTime:active?(isP?age:age-.34):pReady?elapsed:rigClock;
 const bActionTime=clashing?clash.poseTime:active?(!isP?age:age-.34):bReady?elapsed:rigClock;
 window.NeonStudio.draw(g,pX,538,fighterP,{facing:1,t:rigClock,attack:clashing?clash.lock:active&&isP?m.strike:0,hit:active&&!isP?m.hit:0,scale:1.07,super:attackFx?.finisher,ko:pKO,action:pAction,actionTime:pActionTime,reduced});
 window.NeonStudio.draw(g,bX,538,fighterB,{facing:-1,t:rigClock,attack:clashing?clash.lock:active&&!isP?m.strike:0,hit:active&&isP?m.hit:0,scale:1.07,super:attackFx?.finisher,ko:bKO,action:bAction,actionTime:bActionTime,reduced});
 if(clashing){
  if(age>=.33&&!attackFx.sounded){attackFx.sounded=true;window.NeonCombatFX.clashSound(audio,options.sfx)}
  window.NeonCombatFX.drawClash(g,age,fighterP.weapon,fighterB.weapon,reduced);
 }else{
  if(active&&age>=.34&&!attackFx.sounded){attackFx.sounded=true;window.NeonCombatFX.sound(audio,attackFx.finisher,options.sfx)}
  if(active)window.NeonCombatFX.draw(g,age,attackFx,(isP?fighterP:fighterB).weapon,reduced);
 }
 if(ending){g.save();g.globalAlpha=Math.min(1,endAge*2);rounded(390,250,420,85,10,'#0a102dcc');text(fight.hp.player===fight.hp.bot?'DRAW':fight.hp.player<=0||fight.hp.bot<=0?'K.O.':'BATTLE OVER',600,310,'italic 1000 49px system-ui','#fff');g.restore()}
}
function background(t){let grd=g.createLinearGradient(0,0,1200,700);const palettes={city:['#112a48','#25133d','#48142e'],temple:['#10283e','#292746','#323d66'],reactor:['#062c35','#101a31','#143d3e']},pal=palettes[record?.arena]||palettes.city;grd.addColorStop(0,pal[0]);grd.addColorStop(.48,pal[1]);grd.addColorStop(1,pal[2]);g.fillStyle=grd;g.fillRect(0,0,1200,700);
for(let i=0;i<45;i++){let x=(i*169)%1200,y=255+rand(i+33)*185,h=120+rand(i+2)*170;rect(x,y,34+(i%4)*10,h,'#0b122ca8');if(i%2===0)for(let j=0;j<4;j++)rect(x+9,y+13+j*28,6,8,i%3?'#50c2f533':'#f77bb633')}
for(let i=0;i<9;i++){let x=i*157-20;line(x,205,x-150,690,'#9f8bff1b',2)}for(let i=0;i<9;i++){let x=i*167;let v=(x+Math.sin(t*1.2+i)*26);line(600,170,v,700,i%2?'#ae40fb1d':'#22d9ec20',4)}
if(record?.arena==='temple'){circle(600,240,65,'#d0edff40');for(const x of [350,850]){rounded(x-18,180,36,360,4,'#7791ae55');rounded(x-35,170,70,20,4,'#baccea55')}}else if(record?.arena==='reactor'){g.save();g.translate(600,325);g.rotate(t*.15);for(let i=0;i<6;i++){g.rotate(Math.PI/3);line(65,0,165,0,'#5affc544',14)}g.restore();circle(600,325,50,'#48efb922')}
rect(0,632,1200,68,'#080d25');for(let i=0;i<29;i++)rect(i*45,642+Math.sin(t*2+i)*3,29,8,i%2?'#b345b73a':'#20dcdf30');rect(0,680,1200,6,'#8559db')}
function healthHUD(){
 const p=window.RhythmClash.stats(fight,'player',fight.nextRound);
 const b=window.RhythmClash.stats(fight,'bot',fight.nextRound);
 text('BEAT SCORE '+p.score,140,32,'800 17px system-ui','#9ceeff','left');
 text(b.score+' BEAT SCORE',1060,32,'800 17px system-ui','#ffb0d6','right');
 text('TURN '+String(fight.nextRound+1).padStart(2,'0'),600,40,'1000 22px system-ui','#fff')
}
const LANE_LAYOUT={player:{x:74,step:68},bot:{x:922,step:68},top:150,bottom:608,hit:553};
function lanes(t,p){
 const v=145*record.speed,top=LANE_LAYOUT.top,bottom=LANE_LAYOUT.bottom,hitY=LANE_LAYOUT.hit;
 for(const side of ['player','bot']){
  const {x:offset,step}=LANE_LAYOUT[side],active=p.side===side,laneTime=t-(side==='player'?options.offset/1000:0);
  rounded(offset-32,top-10,step*3+64,bottom-top+20,13,active?'#08162ee8':'#0a1025d8');
  g.save();g.beginPath();g.rect(offset-34,top,step*3+68,bottom-top);g.clip();
  for(let lane=0;lane<4;lane++){
   const x=offset+lane*step;rect(x-29,top,58,bottom-top,active?'#ffffff09':'#ffffff04');
   line(x-29,top,x-29,bottom,'#ffffff16',1);
   arrow(x,hitY,lane,25,COLORS[lane],active?.6:.3);
   if(side==='player'&&(pressed[lane]||flashLanes[lane]>t))arrow(x,hitY,lane,30,COLORS[lane]);
  }
  for(const n of notes){
   if(n.done||n.side!==side||n.kind==='power')continue;
   const y=hitY-(n.t-laneTime)*v,endY=y-(n.duration||0)*v;
   if(y<top-35||endY>bottom+35)continue;
   const x=offset+n.lane*step,head=n.hold?hitY:y;
   if(n.duration>0){rounded(x-8,Math.max(top,endY),16,Math.max(3,Math.min(head,bottom)-Math.max(top,endY)),5,COLORS[n.lane]+'b0');line(x,Math.max(top,endY),x,Math.min(head,bottom),'#ffffff88',3)}
   arrow(x,head,n.lane,25,COLORS[n.lane],n.hold?1:active?1:.7);
  }
  g.restore();text(side==='player'?'←  ↓  ↑  →   /   D F J K':onlineMode?'RIVAL':'CPU',offset+102,635,'800 12px system-ui',side==='player'?'#8df4ff':'#ffb0d7');
 }
}
function banner(t,p){
 if(p.side==='intro'){
   if(sourceMode==='youtube'&&!ytPlaying)return;
   text(String(Math.max(1,Math.ceil(intro-t))),600,242,'900 38px system-ui','#bee7ff');
   return;
 }
 const sectionStart=intro+(record.offset||0)+p.phrase*SEG*beat,delta=t-sectionStart;
 rounded(472,74,256,42,11,p.side==='bot'?'#7d285dd5':'#165c82e5');
 text(p.side==='bot'?(onlineMode?'RIVAL TURN':'CPU TURN'):'YOUR TURN',600,102,'1000 21px system-ui','#fff');
 rounded(480,118,240,6,3,'#ffffff33');
 rect(480,118,240*clamp(delta/(SEG*beat),0,1),6,p.side==='player'?'#59dff2':'#f77dc1');
 if(attackFx&&t-attackFx.t<1.25){
   const remaining=1.25-(t-attackFx.t);
   g.save();g.globalAlpha=clamp(remaining,0,1);
   const message=attackFx.side==='draw'?'WEAPON CLASH!':(attackFx.finisher?'SUPER FINISH!':'COUNTER STRIKE!');
   if(attackFx.side==='draw')text(message,600,213,'italic 1000 29px system-ui','#ffe7aa');
   else text('-'+attackFx.damage+' HP',600,335,'900 30px system-ui','#ffdc8b');
   g.restore();
 }
}
function render(t){const rigNow=performance.now()/1000;if(!paused)rigClock+=Math.min(.1,Math.max(0,rigNow-rigLast));rigLast=rigNow;
 if(ending?.cinematic){
  const age=(performance.now()-ending.start)/1000,winner=ending.winner==='player'?fighterP:fighterB,loser=ending.winner==='player'?fighterB:fighterP,weapon=winner.weapon||'blade';
  feedbackG.clearRect(0,0,1200,700);
  window.NeonFinisher.draw(g,age,winner,loser,{weapon,side:ending.winner,reduced:options.reduced},window.NeonStudio.draw);
  while(ending.cueIndex<window.NeonFinisher.CUES.length&&age>=window.NeonFinisher.CUES[ending.cueIndex]){const cue=window.NeonFinisher.CUES[ending.cueIndex++];if(age-cue<.25)for(const voice of window.NeonFinisher.sound(audio,weapon,cue===14,options.sfx))trackVoice(voice)}
  return;
 }
 g.save();const a=attackFx?t-attackFx.t:99;g.save();if(!options.reduced&&a>.34&&a<.5)g.translate(Math.sin(a*240)*4,Math.cos(a*210)*2);background(options.reduced?0:t);fighterStage(t);g.restore();healthHUD();let p=progress(t);lanes(t,p);banner(t,p);

for(let e of options.reduced?[]:effects){e.x+=e.vx;e.y+=e.vy;e.vy+=.3;e.life-=.035;g.globalAlpha=Math.max(0,e.life);star(e.x,e.y,7,e.col)}g.globalAlpha=1;effects=effects.filter(e=>e.life>0);
let elapsed=clamp(t,0,finishTime);text(Math.floor(elapsed/60)+':'+String(Math.floor(elapsed%60)).padStart(2,'0')+' / '+Math.floor(finishTime/60)+':'+String(Math.floor(finishTime%60)).padStart(2,'0'),600,655,'bold 17px system-ui','#e0d9f4');rect(360,670,480,5,'#77738f88');rect(360,670,480*elapsed/finishTime,5,'#7be9ff');
if(paused){rect(0,0,1200,700,'#050619df');text('PAUSED',600,321,'900 83px system-ui','#fff');text('ESC / RESUME 버튼으로 계속',600,366,'bold 21px system-ui','#ddd1ee')}
g.restore();feedback.draw(feedbackG,t,{reduced:options.reduced,paused,rival:onlineMode});if(!paused)window.NeonPowerNotes.draw(feedbackG,notes,t,t-options.offset/1000,powerPulse,options.reduced,onlineMode,LANE_LAYOUT)}

function renderHistory(){
 const root=$('historyList'),items=window.NeonProfileStore.history();root.replaceChildren();
 if(!items.length){root.textContent='아직 기록이 없습니다. 정식 대결을 완주해 보세요.';return}
 const table=document.createElement('table'),head=table.createTHead().insertRow();for(const label of ['곡 / 난이도','결과','점수','정확도','콤보','일시']){const th=document.createElement('th');th.textContent=label;head.append(th)}
 const body=table.createTBody();for(const r of items.slice(0,20)){const tr=body.insertRow();for(const value of [r.title+' / '+r.diff,{win:'승',lose:'패',draw:'무'}[r.outcome],r.score.toLocaleString(),r.accuracy.toFixed(1)+'%',r.combo,new Date(r.created).toLocaleString('ko-KR')])tr.insertCell().textContent=value}root.append(table);
}
function setupPreferences(){
 for(const [id,key]of [['musicVolume','music'],['sfxVolume','sfx'],['noteVolume','notes'],['inputOffset','offset'],['difficulty','diff'],['speed','speed'],['arena','arena']]){
  $(id).value=options[key];$(id).addEventListener('input',()=>{
   options[key]=['diff','arena'].includes(key)?$(id).value:Number($(id).value);saveOptions();
  });
 }
 $('reducedMotion').checked=options.reduced;$('reducedMotion').onchange=()=>{options.reduced=$('reducedMotion').checked;saveOptions()};saveOptions(false);
}
function saveOptions(persist=true){
 if(persist)try{options=window.NeonProfileStore.save(options);$('settingsStatus').textContent='설정 저장됨 · 입력 보정 '+options.offset+'ms'}catch(e){$('settingsStatus').textContent='설정 저장 실패: 브라우저 저장소를 확인하세요.'}
 for(const [id,key]of [['musicValue','music'],['sfxValue','sfx'],['noteValue','notes']])$(id).textContent=Math.round(options[key]*100)+'%';
 if(master&&audio)master.gain.setValueAtTime(.72*options.music,audio.currentTime);if(ytReady)yt.setVolume(options.music*100);
}
$('exportChart').onclick=()=>{const id=parseYouTube($('youtubeUrl').value),chart=id&&cachedYouTubeChart(id);if(!chart){$('selectedChartStatus').textContent='먼저 저장된 채보를 선택하세요.';return}window.NeonStudio.download('chart-'+id+'.json',{generator:'NEON CLASH',videoId:id,chart})};
$('deleteChart').onclick=()=>{const id=parseYouTube($('youtubeUrl').value);if(!id||!cachedYouTubeChart(id))return;try{localStorage.removeItem(chartCacheKey(id));requestedChartId='';refreshSavedCharts();$('selectedChartStatus').textContent='선택한 채보를 삭제했습니다.'}catch(e){$('selectedChartStatus').textContent='삭제 실패: '+e.message}};
$('importChart').onchange=async e=>{try{const data=await window.NeonStudio.read(e.target.files[0]);if(!/^[A-Za-z0-9_-]{11}$/.test(data.videoId||''))throw Error('영상 ID가 올바르지 않습니다.');window.RhythmChart.unpack(data.chart);if(!rememberYouTubeChart(data.videoId,data.chart))throw Error('브라우저 저장 공간이 부족합니다.');$('track').value='youtube';$('youtubeUrl').value='https://youtu.be/'+data.videoId;requestedChartId=data.videoId;youtubeAudioAttached=false;settingsUI();refreshSavedCharts();$('selectedChartStatus').textContent='채보 가져오기 완료 · '+data.chart.entries.length+'노트'}catch(e){$('selectedChartStatus').textContent='채보 가져오기 실패: '+e.message}finally{e.target.value=''}};
window.addEventListener('pagehide',()=>{stop();net.leave().catch(()=>{})});

let tapTimes=[];$('tapBpm').onclick=()=>{let now=performance.now();tapTimes.push(now);tapTimes=tapTimes.filter(t=>now-t<5500).slice(-12);if(tapTimes.length>=3){let gaps=tapTimes.slice(1).map((t,i)=>t-tapTimes[i]).filter(x=>x>=260&&x<=1000).sort((a,b)=>a-b);if(gaps.length){let median=gaps[Math.floor(gaps.length/2)];$('customBpm').value=Math.round(60000/median);$('tapBpm').textContent='♫ '+$('customBpm').value+' BPM'}}};
function settingsUI(){
 const kind=$('track').value;
 $('musicExtras').style.display=kind==='youtube'||kind==='file'?'grid':'none';
 $('youtubeField').style.display=kind==='youtube'?'block':'none';
 $('fileField').style.display=kind==='file'||kind==='youtube'?'block':'none';
 $('directAudioField').style.display=kind==='file'||kind==='youtube'?'block':'none';
 $('customBpm').parentElement.style.display=kind==='file'?'none':'block';
 $('beatOffset').parentElement.style.display=kind==='file'?'none':'block';
 /* Local audio is allowed online when both players choose identical files. */
}
function roomStatus(value){$('roomStatus').textContent=value}
function modeUI(){
 $('soloMode').classList.toggle('chosen',!onlineMode);$('onlineMode').classList.toggle('chosen',onlineMode);
 $('roomPanel').style.display=onlineMode?'block':'none';
 $('track').querySelector('option[value="file"]').disabled=false;
 $('start').textContent=onlineMode?'⚔ HOST START (BOTH READY)':'▶ START BATTLE';document.querySelector('.matchHeader .enemy').textContent=onlineMode?'RIVAL / RIGHT ●':'BOT / RIGHT ●';
 settingsUI()
}
$('track').onchange=()=>{youtubeAudioAttached=false;preparedAudio=null;settingsUI();refreshSavedCharts()};
$('youtubeUrl').addEventListener('input',()=>{requestedChartId='';refreshSavedCharts()});
$('savedCharts').addEventListener('click',e=>{const target=e.target.closest('button[data-chart]');if(!target)return;const id=target.dataset.chart;requestedChartId=id;youtubeAudioAttached=false;$('track').value='youtube';$('youtubeUrl').value='https://www.youtube.com/watch?v='+id;settingsUI();refreshSavedCharts()});
$('audioFile').onchange=e=>{localFile=e.target.files[0]||null;youtubeAudioAttached=$('track').value==='youtube';preparedAudio=null;peerAudioHash='';$('analysisStatus').textContent='';if(net.readySelf)net.ready(false)};
$('importAudioUrl').onclick=async()=>{
 const button=$('importAudioUrl'),url=$('directAudioUrl').value.trim();
 if(!url){$('analysisStatus').textContent='먼저 MP3·WAV·OGG 원본 파일 주소를 입력하세요.';return}
 button.disabled=true;
 try{
   $('analysisStatus').textContent='권한 있는 오디오 파일 다운로드 중 (이 브라우저 안에서만 처리)';
   const file=await window.RhythmAudioImport.load(url,(got,total)=>{
     $('analysisStatus').textContent='오디오 가져오는 중 · '+(got/1048576).toFixed(1)+' MB'+(total?' / '+(total/1048576).toFixed(1)+' MB':'');
   });
   localFile=file;youtubeAudioAttached=$('track').value==='youtube';preparedAudio=null;peerAudioHash='';
   $('audioFile').value='';
   if(net.readySelf)net.ready(false);
   const prep=await prepareLocalAudio();
   $('analysisStatus').textContent='URL 음원 로딩·분석 완료: '+prep.file.name+' · '+prep.analysis.bpm+' BPM · '+prep.chart.entries.length+'개 노트. 이제 시작할 수 있습니다.';
 }catch(e){showPrepError(e)}finally{button.disabled=false}
};
$('soloMode').onclick=async()=>{if(st==='game')return;onlineMode=false;await net.leave();modeUI()};
$('onlineMode').onclick=()=>{if(st==='game')return;onlineMode=true;modeUI()};
$('createRoom').onclick=async()=>{try{let cfg=selectedConfig();if(!cfg)return;roomStatus('방 생성 중…');let id=await net.create(cfg);roomStatus('초대 코드 '+id+' · 친구가 입장하면 준비를 누르세요.')}catch(e){roomStatus('오류: '+(e.message||e))}};
$('joinRoom').onclick=async()=>{try{roomStatus('입장 중…');await net.join($('joinCode').value);roomStatus('상대와 P2P 연결을 설정 중입니다.')}catch(e){roomStatus('오류: '+(e.message||e))}};
$('readyRoom').onclick=async()=>{if(!net.isConnected()){roomStatus('친구와 P2P 연결이 된 뒤 준비할 수 있습니다.');return}const ready=!net.readySelf;$('readyRoom').disabled=true;try{initAudio();await audio.resume();if(ready&&$('track').value==='file'){let asset=await prepareLocalAudio();net.send({type:'asset',hash:asset.hash,duration:asset.chart.duration});if(peerAudioHash&&peerAudioHash!==asset.hash)throw Error('상대방과 음원 파일이 달라서 준비할 수 없습니다.');}net.ready(ready);$('readyRoom').textContent=net.readySelf?'준비 취소':'준비'}catch(e){showPrepError(e);net.ready(false)}finally{$('readyRoom').disabled=false}};
$('leaveRoom').onclick=async()=>{await net.leave();$('roomCode').textContent='';roomStatus('방에서 나갔습니다.')};
net.on('code',id=>{$('roomCode').textContent=id});
net.on('room',r=>{if(r&&st==='menu'){if(net.role==='guest'){$('track').value=r.videoId?'youtube':r.track||'neon';if(r.videoId)$('youtubeUrl').value='https://youtu.be/'+r.videoId;if(r.bpm)$('customBpm').value=r.bpm;if(Number.isFinite(r.offset))$('beatOffset').value=r.offset;settingsUI()}roomStatus(r.guest?'2명 입장 완료 · 연결 후 서로 준비하세요.':'친구 대기 중 · 코드 '+net.roomId)}});
net.on('connected',()=>{roomStatus('P2P 연결 완료! 양쪽 모두 준비를 누르세요.');sendAppearance()});
net.on('ready',v=>{roomStatus('나: '+(v.self?'준비 완료':'대기')+' | 친구: '+(v.peer?'준비 완료':'대기')+(net.role==='host'&&v.self&&v.peer?' → START BATTLE을 누르세요.':''))});
net.on('error',message=>roomStatus('연결 오류: '+message));
net.on('disconnect',message=>{remoteAppearance=null;roomStatus('상대 연결 종료: '+message);if(st==='game'&&onlineMode)complete(true)});
net.on('packet',v=>{
 if(!onlineMode)return;
 if(v.type==='finish'&&st==='game'&&net.role==='guest'){remoteComplete=true;complete();return}
 if(v.type==='appearance'){remoteAppearance=legalAppearance(v.profile);if(remoteAppearance)roomStatus('상대 커스텀 파이터: '+remoteAppearance.name+' · 준비 가능');return}
 if(v.type==='asset'&&typeof v.hash==='string'&&/^[a-f0-9]{64}$/.test(v.hash)){peerAudioHash=v.hash;if(preparedAudio&&preparedAudio.hash!==v.hash)roomStatus('음원 불일치! 양쪽에서 동일한 파일을 선택하세요.');else roomStatus('친구 음원 검증 완료 · 서로 준비하세요.');return}
 if(v.type==='prepare'&&st==='menu'&&net.role==='guest'&&v.cfg){(async()=>{try{if(v.cfg.mode==='file'){let file=await prepareLocalAudio();if(file.hash!==v.cfg.assetHash)throw Error('양쪽 음악 파일이 달라서 시작할 수 없습니다.');}if(v.cfg.chart)window.RhythmChart.unpack(v.cfg.chart,'guest');net.send({type:'loaded'});roomStatus('내 채보 로딩 완료 · 방장 시작 신호 대기 중')}catch(e){net.send({type:'loadError',message:String(e?.message||e).slice(0,110)});showPrepError(e)}})();return}
 if(v.type==='loaded'&&st==='menu'&&net.role==='host'&&pendingStart){const cfg=pendingStart;pendingStart=null;cfg.startsAt=Date.now()+6500;roomStatus('양쪽 채보 로딩 완료 · 잠시 후 경기 시작');if(net.send({type:'start',cfg}))newRound(cfg);return}
 if(v.type==='loadError'&&net.role==='host'){pendingStart=null;roomStatus('상대방 로딩 실패: '+String(v.message||'음원 파일 확인 필요').slice(0,150));return}
 if(v.type==='start'&&st==='menu'&&net.role==='guest'&&v.cfg){roomStatus('동기화 완료 · 경기 시작');newRound(v.cfg);return}
 if(v.type==='pause'&&st==='game'&&paused!==!!v.paused){togglePause(true);return}
 if(v.type==='roundResult'&&st==='game'&&net.role==='guest'&&fight){const result=window.RhythmClash.applyRemote(fight,v.result);if(result){onFightResult(result);if(fight.hp.player<=0||fight.hp.bot<=0)complete()}return}
 if(v.type==='sync'&&st==='game'&&net.role==='guest'&&Number.isFinite(v.t)){if(sourceMode==='youtube'&&ytReady&&ytPlaying&&Number.isFinite(v.t)){let diff=Number(v.t)+.1-time();if(Math.abs(diff)>.6){yt.seekTo(Math.max(0,Number(v.t)+.1),true);$('syncInfo').textContent='상대 영상 시간 '+Math.abs(diff).toFixed(1)+'초 보정';}}return}
 if(v.type==='judge'&&st==='game'&&record&&Number.isInteger(v.seq)&&!remoteSeen.has(v.seq)&&Number.isInteger(v.id)&&['perfect','great','good','miss'].includes(v.kind)){
   let n=notes.find(x=>x.id===v.id&&x.side==='bot');if(!n)return;
   remoteSeen.add(v.seq);if(remoteSeen.size>600)remoteSeen.clear();
   n.done=true;
   window.RhythmClash.register(fight,'bot',n.id,v.kind);rivalJudgement(v.kind,n.lane,time());updateFightHUD();
   if(v.kind==='miss')botMissUntil=time()+.36;else botSing=time()+.29
 }
});

const touchBtns=Array.from(document.querySelectorAll('[data-lane]'));
function keyDown(lane){if(st!=='game'||paused||ending||pressed[lane])return;pressed[lane]=true;for(const voice of window.NeonFeedback.keySound(audio,lane,options.notes))trackVoice(voice);flashLanes[lane]=time()+.18;hit(lane);let btn=touchBtns[lane];if(btn)btn.classList.add('held')}
function keyUp(lane){if(!pressed[lane])return;pressed[lane]=false;release(lane);let btn=touchBtns[lane];if(btn)btn.classList.remove('held')}
window.addEventListener('keydown',e=>{if(st!=='game'||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.code==='Escape'){e.preventDefault();if(!e.repeat)togglePause();return}let k=KEYMAP.indexOf(e.code);if(k<0)k=['KeyD','KeyF','KeyJ','KeyK'].indexOf(e.code);if(e.code==='Space')k=4;if(k>=0){e.preventDefault();if(!e.repeat&&st==='game'&&!paused)keyDown(k)}});
window.addEventListener('keyup',e=>{let k=KEYMAP.indexOf(e.code);if(k<0)k=['KeyD','KeyF','KeyJ','KeyK'].indexOf(e.code);if(e.code==='Space')k=4;if(k>=0){e.preventDefault();keyUp(k)}});
window.addEventListener('blur',()=>{const focusedIframe=sourceMode==='youtube';if(st==='game'&&!paused&&!focusedIframe)togglePause();for(let i=0;i<4;i++)keyUp(i)});
$('focusControls').onclick=()=>{canvas.focus({preventScroll:true});$('syncInfo').textContent='⌨ 게임 조작 활성화 · 방향키 ← ↓ ↑ → 를 누르세요. (영상 재생 중에는 자동 일시정지되지 않습니다.)'};
for(let b of touchBtns){let lane=Number(b.dataset.lane);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(st==='game'&&!paused)keyDown(lane)});b.addEventListener('pointerup',e=>{e.preventDefault();keyUp(lane)});b.addEventListener('pointercancel',()=>keyUp(lane))}
const canvasPointers=new Map();
canvas.addEventListener('pointerdown',e=>{if(st!=='game'||paused||ending)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*1200,y=(e.clientY-r.top)/r.height*700;if(Math.hypot(x-600,y-445)<85){e.preventDefault();canvas.setPointerCapture(e.pointerId);canvasPointers.set(e.pointerId,4);keyDown(4);return}if(x>=40&&x<312&&y>=145&&y<=620){const lane=clamp(Math.floor((x-40)/68),0,3);e.preventDefault();canvas.setPointerCapture(e.pointerId);canvasPointers.set(e.pointerId,lane);keyDown(lane)}});
function endPointer(e){if(canvasPointers.has(e.pointerId)){const lane=canvasPointers.get(e.pointerId);canvasPointers.delete(e.pointerId);if(![...canvasPointers.values()].includes(lane))keyUp(lane)}}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);
$('tvPlay').onclick=()=>{if(st==='game'&&ytReady){initAudio().resume();yt.playVideo()}};
$('skipFinish').onclick=()=>{if(ending&&st==='game')finishMatch(ending.fail)};
$('start').onclick=async()=>{if(!onlineMode){await newRound();return}if(net.role!=='host'||!net.isConnected()||!net.readySelf||!net.readyPeer){roomStatus('방장과 친구 모두 P2P 접속 및 준비 완료가 필요합니다.');return}let cfg=selectedConfig();if(!cfg)return;if(cfg.mode==='file'){let asset;try{asset=await prepareLocalAudio()}catch(e){showPrepError(e);return}if(peerAudioHash!==asset.hash){roomStatus('상대방이 동일한 음원을 로딩했는지 확인하세요.');return}cfg.bpm=asset.chart.bpm;cfg.chart=asset.chart;cfg.assetHash=asset.hash;cfg.title=localFile.name.slice(0,36)}else if(cfg.mode==='youtube'&&youtubeAudioAttached&&localFile){try{const asset=await prepareLocalAudio();cfg.chart=asset.chart;rememberYouTubeChart(cfg.videoId,cfg.chart)}catch(e){showPrepError(e);return}}if(cfg.chart){try{window.RhythmChart.unpack(cfg.chart,'host')}catch(e){showPrepError(e);return}}pendingStart=cfg;roomStatus('채보 준비 완료 · 친구의 로딩 응답을 기다리는 중');if(!net.send({type:'prepare',cfg})){pendingStart=null;roomStatus('준비 패킷 전송 실패')}};$('retry').onclick=()=>{if(onlineMode){show('menu');net.ready(false);roomStatus('온라인 재대결은 양쪽에서 준비를 다시 해주세요.')}else newRound()};$('pause').onclick=()=>togglePause();$('quit').onclick=()=>{stop();show('menu');if(onlineMode)net.ready(false)};$('select').onclick=()=>{stop();show('menu');if(onlineMode)net.ready(false)};setupPreferences();renderHistory();modeUI();setupCharacterStudio();window.NeonStudioUI.mount();
window.NeonStudioUI.bindGenerator(generateStyle);window.NeonStudioUI.bindPreset(applyLook);
window.NeonStudioUI.bindMotion((side,action)=>{
 previewActions[side]={action,start:performance.now()/1000};
 previewProfile(side);
});
window.NeonStudioUI.bindExport(async(side,action,count=24)=>{
 const p=fromForm(side);if(p.art!=='doll')throw Error('프레임 생성은 일러스트 파츠 모드에서 지원합니다.');
 const result=await window.NeonFrameExport.download(p,action,count);
 $('studioStatus').textContent=p.name+' · '+action+' · '+result.count+'프레임 PNG 저장 완료 ('+result.width+'×'+result.height+')';
});
restoreSavedChartSelection();renderWardrobe();
})();
