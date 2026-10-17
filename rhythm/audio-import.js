// Load authorized audio from a direct HTTP(S) file URL into this browser only.
// Does NOT extract YouTube audio, bypass player restrictions, or use converter services.
(()=>{'use strict';
const MAX_BYTES=80*1024*1024;
const blockedHost=host=> /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com|googlevideo\.com|ssyoutube\.com|ss\.youtube)$/.test(host.toLowerCase());
async function load(input,onProgress=()=>{}){
  let url;
  try { url=new URL(String(input).trim()); }catch{throw Error('MP3 파일의 직접 URL을 입력하세요.')}
  if(!['http:','https:'].includes(url.protocol)||blockedHost(url.hostname))throw Error('유튜브 페이지 주소는 음원 주소가 아닙니다. 이용 권한이 있는 MP3·WAV·OGG 직접 링크를 사용하세요.');
  const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),60000);
  let response,reader;
  try{
    response=await fetch(url.href,{signal:ac.signal,mode:'cors',credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok)throw Error('음원 서버 응답 오류: HTTP '+response.status);
    const finalUrl=new URL(response.url);
    if(blockedHost(finalUrl.hostname))throw Error('유튜브 서버의 음원 추출 링크는 지원하지 않습니다.');
    const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(type&&!(type.startsWith('audio/')||['application/octet-stream','binary/octet-stream','application/x-octet-stream'].includes(type)))throw Error('MP3 파일이 아닌 응답입니다. 원본 파일의 직접 URL이 필요합니다.');
    const declared=Number(response.headers.get('content-length')||0);
    if(declared>MAX_BYTES)throw Error('80MB를 초과하는 파일은 사용할 수 없습니다.');
    let chunks=[],total=0;
    if(response.body?.getReader){
      reader=response.body.getReader();
      while(true){
        const {done,value}=await reader.read();if(done)break;
        total+=value.byteLength;
        if(total>MAX_BYTES)throw Error('80MB를 초과하는 파일은 사용할 수 없습니다.');
        chunks.push(value);
        onProgress(total,declared);
      }
    }else{
      let bytes=new Uint8Array(await response.arrayBuffer());
      if(bytes.byteLength>MAX_BYTES)throw Error('80MB를 초과하는 파일은 사용할 수 없습니다.');
      total=bytes.byteLength;chunks=[bytes];onProgress(total,declared);
    }
    if(total===0)throw Error('비어 있는 오디오 파일입니다.');
    let safeName=decodeURIComponent(finalUrl.pathname.split('/').pop()||'music.mp3').split(/[?#]/)[0].replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,90);
    if(!/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(safeName))safeName='imported-audio.mp3';
    return new File(chunks,safeName,{type:type||'audio/mpeg'});
  }catch(e){
    if(e?.name==='AbortError')throw Error('파일 가져오기가 60초를 초과했습니다.');
    if(e instanceof TypeError)throw Error('파일 서버가 직접 다운로드/CORS를 허용하지 않습니다. MP3 파일을 내려받아 파일 선택으로 가져오세요.');
    throw e;
  }finally{
    try{reader?.releaseLock()}catch{}
    clearTimeout(timeout);
  }
}
window.RhythmAudioImport=Object.freeze({MAX_BYTES,load});
})();