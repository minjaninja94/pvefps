// Loaded on demand: a CDN or Firebase outage never prevents local gameplay.
(() => {
  let readyPromise;
  async function ready() {
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      const c = window.IRON_FIREBASE;
      if (!c?.appCheckSiteKey) throw Error('온라인 랭킹의 App Check 설정이 아직 완료되지 않았습니다.');
      const [{ initializeApp }, authSDK, appCheckSDK, functionsSDK] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check.js'),
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-functions.js')
      ]);
      const app = initializeApp({ apiKey:c.apiKey, authDomain:c.authDomain, projectId:c.projectId, appId:c.appId });
      appCheckSDK.initializeAppCheck(app, { provider:new appCheckSDK.ReCaptchaEnterpriseProvider(c.appCheckSiteKey), isTokenAutoRefreshEnabled:true });
      const auth = authSDK.getAuth(app);
      await auth.authStateReady();
      if (!auth.currentUser) await authSDK.signInAnonymously(auth);
      return { functions:functionsSDK.getFunctions(app,c.region), call:functionsSDK.httpsCallable };
    })().catch(e => { readyPromise = null; throw e; });
    return readyPromise;
  }
  async function request(name, data={}) {
    let timer;
    try {
      return await Promise.race([
        (async()=> {const s=await ready();return (await s.call(s.functions,name,{timeout:12000})(data)).data;})(),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('온라인 랭킹 연결 시간이 초과되었습니다.')),15000);})
      ]);
    } catch(e) {
      const code=e.code||'';
      if(code.includes('unauthenticated')||code.includes('permission-denied'))throw Error('인증 또는 App Check가 차단되었습니다. Firebase 설정을 확인하세요.');
      if(code.includes('resource-exhausted'))throw Error('요청이 너무 잦습니다. 잠시 후 다시 시도하세요.');
      if(code.includes('internal')||code.includes('unavailable')||code.includes('not-found'))throw Error('랭킹 서비스가 준비되지 않았거나 연결할 수 없습니다.');
      throw e;
    } finally {clearTimeout(timer);}
  }
  window.IronCloud = Object.freeze({
    start:nonce=>request('startRankedRun',{version:5,nonce}),
    checkpoint:(id,entry)=>request('checkpointRankedRun',{id,...entry}),
    finish:id=>request('finishRankedRun',{id}),
    submit:(id,name)=>request('submitRankedResult',{id,name}),
    board:()=>request('getRankedBoard')
  });
})();
