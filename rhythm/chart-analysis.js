// Pure chart builder for USER-SUPPLIED audio. No YouTube media capture or download.
// Input AudioBuffer only; soundtrack bytes remain on the player's device.
(()=>{'use strict';
const LIMIT=300;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function inspect(buffer){
 if(!buffer||!Number.isFinite(buffer.duration)||buffer.duration<=0)throw Error('오디오 데이터가 유효하지 않습니다.');
 if(buffer.duration>LIMIT+.01)throw Error('5분(300초)을 초과하는 음원은 사용할 수 없습니다.');
 if(buffer.sampleRate<8000||buffer.numberOfChannels<1)throw Error('지원하지 않는 오디오 형식입니다.');
 const ch=buffer.getChannelData(0),sr=buffer.sampleRate,hop=512,frame=[],hits=[];
 for(let i=0;i+hop<ch.length;i+=hop){let sum=0;for(let j=0;j<hop;j+=4)sum+=ch[i+j]*ch[i+j];frame.push(Math.sqrt(sum/(hop/4)))}
 let last=-1000;
 for(let i=22;i<frame.length-2;i++){
   let avg=0;for(let j=1;j<=20;j++)avg+=frame[i-j]/20;
   const rise=frame[i]-frame[i-3],time=i*hop/sr;
   if(i-last<.13*sr/hop||frame[i]<Math.max(.008,avg*1.28)||rise<Math.max(.003,avg*.20)||frame[i]<frame[i+1])continue;
   hits.push({t:time,strength:rise});last=i;
 }
 let scores=new Map();
 for(let i=0;i<hits.length;i++)for(let j=i+1;j<Math.min(i+9,hits.length);j++){
   const diff=hits[j].t-hits[i].t;if(diff<=0)continue;
   let b=60/diff;while(b<75)b*=2;while(b>180)b/=2;let rounded=Math.round(b);
   if(Number.isFinite(rounded))scores.set(rounded,(scores.get(rounded)||0)+Math.min(1,hits[i].strength*10));
 }
 const bpm=scores.size?[...scores].sort((a,b)=>b[1]-a[1])[0][0]:120;
 const maxStrength=hits.reduce((m,h)=>Math.max(m,h.strength),.001);
 return {bpm,beats:hits.filter(h=>h.t<LIMIT).map(h=>[Math.round(h.t*1000)/1000,Math.round(100*h.strength/maxStrength)/100]),duration:buffer.duration};
}
function makeChart(analysis,{difficulty='normal',seed=2,offset=0}={}){
 if(!analysis||!Array.isArray(analysis.beats))throw Error('채보 분석 결과가 없습니다.');
 const bpm=clamp(Number(analysis.bpm)||120,60,220),gap=60/bpm,anchor=2.5+offset,
 phraseDuration=gap*8,count=clamp(Math.ceil((analysis.duration-anchor)/phraseDuration),1,96);
 const minGap=difficulty==='easy'?.34:difficulty==='hard'?.105:.175;
 const entries=[];let last=-10;
 // Pick rhythmically salient transient peaks, avoiding impossible rapid-fire clusters.
 for(let i=0;i<analysis.beats.length;i++){
   let event=analysis.beats[i],t=event[0],strength=event[1];
   if(t<anchor||t>analysis.duration-.22||t-last<minGap)continue;
   if(strength<(difficulty==='easy'?.09:difficulty==='normal'?.05:.025))continue;
   let phrase=Math.floor((t-anchor)/phraseDuration);if(phrase>=count)continue;
   let lane=((Math.imul(i+3,2654435761)^seed^(phrase*101))>>>0)%4;
   entries.push([Math.round(t*1000)/1000,lane,0,phrase]);last=t;
   if(entries.length>=1000)break;
 }
 // A quiet recording can be playable without inventing notes beyond the song clock.
 if(entries.length<10){for(let t=anchor;t<analysis.duration-.2&&entries.length<1000;t+=gap*(difficulty==='easy'?1:.5)){
   let phrase=Math.floor((t-anchor)/phraseDuration),lane=(entries.length*7+seed)%4;
   entries.push([Math.round(t*1000)/1000,lane,0,phrase])
 }}
 return {bpm,entries,duration:analysis.duration,groups:count,offset};
}
function unpack(chart,side='guest'){
 if(!chart||!Array.isArray(chart.entries)||chart.entries.length>1000||!Number.isFinite(chart.duration)||chart.duration>LIMIT+.01)throw Error('채보 데이터가 유효하지 않습니다.');
 const host=side==='host';
 return chart.entries.map((entry,id)=>{
   if(!Array.isArray(entry)||entry.length!==4)throw Error('채보가 손상되었습니다.');
   const [t,lane,duration,phrase]=entry;
   if(!Number.isFinite(t)||t<0||t>LIMIT||!Number.isInteger(lane)||lane<0||lane>3||!Number.isInteger(phrase)||phrase<0||phrase>=96)throw Error('채보 좌표가 잘못되었습니다.');
   return {id,t,lane,duration:duration||0,phrase,side:phrase%2==0?(host?'player':'bot'):(host?'bot':'player'),done:false,hold:false}
 });
}
async function fingerprint(bytes){if(!globalThis.crypto?.subtle)throw Error('HTTPS 보안 연결이 필요합니다.');const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('')}
window.RhythmChart=Object.freeze({LIMIT,inspect,makeChart,unpack,fingerprint});
})();