const { useState, useEffect, useMemo } = React;
const SESSION_KEY = "hwp-session-v5";

// ── Firebase 초기화 ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCirm5cPSpeRjaibpd_GiwMPqlGuJpZ69E",
  authDomain: "homeworkplanner-e90a3.firebaseapp.com",
  databaseURL: "https://homeworkplanner-e90a3-default-rtdb.firebaseio.com",
  projectId: "homeworkplanner-e90a3",
  storageBucket: "homeworkplanner-e90a3.firebasestorage.app",
  messagingSenderId: "44265353555",
  appId: "1:44265353555:web:076f9c824ab6c27d8031a6"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();

// ── 멀티테넌시 (B2B) ─────────────────────────────────────────────────────────
const ACADEMY_ID = "academy-1";
// 모든 DB 경로는 aRef()를 통해 academyId로 네임스페이스됨
const aRef = (path) => path
  ? db.ref(`academies/${ACADEMY_ID}/${path}`)
  : db.ref(`academies/${ACADEMY_ID}`);
// Storage 경로 헬퍼
const sRef = (path) => storage.ref(`academies/${ACADEMY_ID}/${path}`);

// ── 익명 인증 (DB 규칙 auth != null 적용을 위해) ──────────────────────────────
firebase.auth().onAuthStateChanged(user => {
  if (!user) firebase.auth().signInAnonymously().catch(e => console.warn("익명 인증 실패:", e));
});

// 선생님 계정은 고정
const TEACHER = { id:"teacher-1", name:"임효재", role:"teacher", password:"1004123" };
const VIEWER  = { id:"viewer-1",  name:"현황판",         role:"viewer",  password:"123456" };

// ── FCM 초기화 ────────────────────────────────────────────────────────────────
const messaging = firebase.messaging();
const VAPID_KEY = "BBce3DZ4LkAM0qRYuRP4VkPjFnE8YIJhux_5S-f97IEOI_bvTj5ZwF56edD9WfiOpsPS098uqG6POHHepPtzFyE";

async function registerFCMToken(userId, role) {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    const token = await messaging.getToken({ vapidKey: VAPID_KEY });
    if (token) {
      await db.ref(`fcmTokens/${token}`).set({ token, userId, role, updatedAt: new Date().toISOString() });
    }
  } catch(e) {
    console.warn("FCM 토큰 등록 실패:", e);
  }
}
