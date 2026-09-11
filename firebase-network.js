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
    return authPromise;
  }
  function message(e) {
    if (/operation-not-allowed|admin-restricted-operation/.test(e?.code || '')) return 'Firebase에서 익명 로그인을 활성화해야 합니다. MULTIPLAYER_SETUP.md의 1번을 확인해 주세요.';
    if (/permission-denied/.test(e?.code || '')) return '멀티플레이 접근 규칙이 아직 적용되지 않았습니다. MULTIPLAYER_SETUP.md의 2번을 확인해 주세요.';
    if (/resource-exhausted|quota-exceeded/.test(e?.code || '')) return 'Firebase 무료 사용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.';
    return e?.message || '연결하지 못했습니다. 다시 시도해 주세요.';
  }
  window.IronFirebase = Object.freeze({ ready, identity, message });
})();
