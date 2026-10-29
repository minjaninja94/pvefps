// Shared Firebase connection. Combat packets never pass through Firestore.
(() => {
  let readyPromise, authPromise;
  const SDK = 'https://www.gstatic.com/firebasejs/12.18.0/';
  async function ready() {
    if (!readyPromise) readyPromise = (async () => {
      const c = window.IRON_FIREBASE;
      if (!c?.projectId) throw Error('Firebase 설정을 찾지 못했습니다.');
      const [apps, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-firestore.js')]);
      const app = apps.getApps().find(a => a.name === '[DEFAULT]') || apps.initializeApp(c);
      return { app, db: fs.getFirestore(app), fs };
    })().catch(e => { readyPromise = null; throw e; });
    return readyPromise;
  }
  async function identity() {
    if (!authPromise) authPromise = (async () => {
      const shared = await ready(), authSDK = await import(SDK + 'firebase-auth.js');
      const auth = authSDK.getAuth(shared.app);
      await authSDK.setPersistence(auth, authSDK.browserSessionPersistence);
      await auth.authStateReady();
      const user = auth.currentUser || (await authSDK.signInAnonymously(auth)).user;
      return { ...shared, uid: user.uid };
    })().catch(e => { authPromise = null; throw e; });
    const cached=await authPromise;
    // OAuth linking or guest sign-out may change the UID after the first login.
    // Never reuse a stale UID when creating network rooms.
    const sdk=await import(SDK + 'firebase-auth.js');
    const auth=sdk.getAuth(cached.app);await auth.authStateReady();
    if(!auth.currentUser)await sdk.signInAnonymously(auth);
    return {...cached,uid:auth.currentUser.uid};
  }
  function message(e) {
    if (/operation-not-allowed|admin-restricted-operation/.test(e?.code || '')) return '새 기기에서 Firebase 익명 로그인이 차단되었습니다. Firebase 콘솔 → Authentication → 로그인 방법 → 익명 사용을 켜야 외부 테스터가 방을 만들 수 있습니다.';
    if (/unauthorized-domain/.test(e?.code || '')) return '현재 사이트 주소가 Firebase Authentication 승인 도메인에 등록되지 않았습니다.';
    if (/permission-denied/.test(e?.code || '')) return 'Firebase 방 생성/참가 권한이 거부되었습니다. Firebase 콘솔에서 최신 Firestore 보안 규칙 게시 여부를 확인해야 합니다.';
    if (/resource-exhausted|quota-exceeded/.test(e?.code || '')) return 'Firebase 무료 사용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.';
    return e?.message || '연결하지 못했습니다. 다시 시도해 주세요.';
  }
  window.IronFirebase = Object.freeze({ ready, identity, message });
})();
