// App Check와 Cloud Functions 인증 과정을 제거한 순수 Firestore 연동 파일
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

      const app = initializeApp({
        apiKey: c.apiKey,
        authDomain: c.authDomain,
        projectId: c.projectId,
        appId: c.appId
      });
      const db = firestoreSDK.getFirestore(app);
      return { db, fs: firestoreSDK };
    })().catch(e => {
      readyPromise = null;
      throw e;
    });
    return readyPromise;
  }

  // 플레이 진행 중인 세션 데이터 임시 저장
  const sessions = new Map();

  // 스테이지별 점수 계산 함수
  function calculateScore(checkpoints) {
    let total = 0;
    const hpTable = [70, 150, 400, 240, 320, 130];
    for (const chk of checkpoints) {
      if (chk.kills && Array.isArray(chk.kills)) {
        chk.kills.forEach((cnt, idx) => {
          total += (cnt || 0) * (hpTable[idx] || 100) * 10;
        });
      }
      total += (chk.parts || 0) * 100;
      total += (chk.bossParts || 0) * 500;
      if (chk.boss) total += chk.stage === 10 ? 40000 : 20000;
      if (chk.outcome !== 'dead') total += 1000;
    }
    return total;
  }

  window.IronCloud = Object.freeze({
    // 1. 게임 시작: game.js가 { id: '...' } 객체를 받도록 구현
    start: async (nonce) => {
      const id = nonce || (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
      sessions.set(id, {
        id,
        checkpoints: [],
        status: 'playing',
        startTime: Date.now()
      });
      return { id };
    },

    // 2. 체크포인트: 스테이지 완료 상황 수집
    checkpoint: async (id, entry) => {
      const session = sessions.get(id) || { id, checkpoints: [], startTime: Date.now() };
      session.checkpoints.push(entry);
      if (entry.outcome && entry.outcome !== 'playing') {
        session.status = entry.outcome;
      }
      sessions.set(id, session);
      return { outcome: session.status || 'playing' };
    },

    // 3. 작전 종료 (사망 또는 클리어)
    finish: async (id) => {
      const session = sessions.get(id);
      if (session && session.status === 'playing') {
        session.status = 'clear';
      }
      return { outcome: session ? session.status : 'clear' };
    },

    // 4. 최종 결과 등록: Firestore 'rankings' 컬렉션에 추가
    submit: async (id, name) => {
      const s = await ready();
      const { collection, addDoc } = s.fs;

      const session = sessions.get(id) || { checkpoints: [], startTime: Date.now() - 1000 };
      const score = calculateScore(session.checkpoints);
      const lastEntry = session.checkpoints[session.checkpoints.length - 1] || {};
      const elapsedMs = Date.now() - (session.startTime || Date.now());
      const stage = lastEntry.stage || 1;
      const outcome = session.status || lastEntry.outcome || 'clear';

      const recordData = {
        name: (name || 'ANONYMOUS').trim(),
        score: Number(score),
        elapsedMs: Number(elapsedMs),
        stage: Number(stage),
        outcome: outcome,
        createdAt: Date.now()
      };

      await addDoc(collection(s.db, "rankings"), recordData);

      return { score: score };
    },

    // 5. 랭킹 목록 조회: game.js가 요구하는 { rows: [...] } 구조로 반환
  board: async () => {
      try {
        const s = await ready();
        const { collection, getDocs, query, orderBy, limit } = s.fs;
        const q = query(
          collection(s.db, "rankings"),
          orderBy("score", "desc"),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const rows = [];
        
        snapshot.forEach(doc => {
          const data = doc.data() || {};
          rows.push({
            id: doc.id,
            name: data.name || 'ANONYMOUS',
            score: Number(data.score || 0),
            elapsedMs: Number(data.elapsedMs || data.time || 0),
            stage: Number(data.stage || 10),
            outcome: data.outcome || 'clear'
          });
        });

        // 점수 동점 시 시간 순 정렬
        rows.sort((a, b) => b.score - a.score || a.elapsedMs - b.elapsedMs);

        // game.js가 { rows: [...] } 구조를 원할 경우와 
        // rows 자체에 .entries()를 찾을 경우를 모두 만족하도록 안전 장치 추가
        const resultObj = {
          rows: rows,
          entries: function* () {
            for (let i = 0; i < rows.length; i++) {
              yield [i, rows[i]];
            }
          },
          [Symbol.iterator]: function* () {
            yield* rows;
          }
        };

        // 혹시 rows 배열 자체에 직접 .entries()를 찾는 경우를 대비해 배열에도 심어줌
        rows.rows = rows;
        rows.entries = resultObj.entries;

        return resultObj;
      } `catch` (err) {
        console.error("랭킹 조회 실패:", err);
        const emptyRows = [];
        emptyRows.rows = [];
        emptyRows.entries = function* () {};
        return { rows: [], entries: function* () {} };
      }
    }
  });
})();
