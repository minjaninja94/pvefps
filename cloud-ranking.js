// App Check와 Cloud Functions 인증 과정을 제거한 순수 연동 파일
(() => {
  let readyPromise;
  async function ready() {
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      const c = window.IRON_FIREBASE;
      const [{ initializeApp }, firestoreSDK] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js')
      ]);
      
      const app = initializeApp({ apiKey: c.apiKey, authDomain: c.authDomain, projectId: c.projectId, appId: c.appId });
      const db = firestoreSDK.getFirestore(app);
      return { db, fs: firestoreSDK };
    })().catch(e => { readyPromise = null; throw e; });
    return readyPromise;
  }

  // 랭킹 데이터를 Firestore에 직접 읽고 쓰는 방식으로 전환
  window.IronCloud = Object.freeze({
    start: async () => 'local-mock-id',
    checkpoint: async () => {},
    finish: async () => {},
    submit: async (id, name, score, time, stage) => {
      const s = await ready();
      const { collection, addDoc } = s.fs;
      await addDoc(collection(s.db, "rankings"), {
        name: name,
        score: Number(score),
        time: Number(time),
        stage: Number(stage),
        createdAt: new Date()
      });
    },
    board: async () => {
      const s = await ready();
      const { collection, getDocs, query, orderBy, limit } = s.fs;
      const q = query(collection(s.db, "rankings"), orderBy("score", "desc"), limit(10));
      const snapshot = await getDocs(q);
      let list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      return list;
    }
  });
})();