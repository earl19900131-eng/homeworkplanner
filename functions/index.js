const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onValueCreated } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();

// ── 매일 저녁 9시 (KST) 미완료 체크 → 알림 발송 ─────────────────────────────
exports.dailyIncompleteAlert = onSchedule(
  { schedule: "59 23 * * *", timeZone: "Asia/Seoul" },
  async () => {
    const today = getTodayKST();

    const [studentsSnap, homeworksSnap, tokensSnap] = await Promise.all([
      db.ref("students").get(),
      db.ref("homeworks").get(),
      db.ref("fcmTokens").get(),
    ]);

    const students = studentsSnap.val() || {};
    const homeworks = homeworksSnap.val() || {};
    const tokens = tokensSnap.val() || {};

    // 오늘 미완료 학생 찾기
    const incompleteMap = {};
    Object.values(homeworks).forEach((hw) => {
      const chunks = hw.chunks ? Object.values(hw.chunks) : [];
      const todayChunk = chunks.find((c) => c.date === today);
      if (todayChunk && !todayChunk.done) {
        if (!incompleteMap[hw.studentId]) {
          const s = students[hw.studentId];
          if (!s) return;
          incompleteMap[hw.studentId] = { name: s.name, className: s.className, count: 0 };
        }
        incompleteMap[hw.studentId].count++;
      }
    });

    const incompleteList = Object.entries(incompleteMap);
    if (incompleteList.length === 0) {
      console.log("오늘 미완료 학생 없음");
      return null;
    }

    const messages = [];

    // 선생님 토큰들에게 전체 요약 알림
    const teacherTokens = Object.values(tokens)
      .filter((t) => t.role === "teacher")
      .map((t) => t.token);

    if (teacherTokens.length > 0) {
      const names = incompleteList.map(([, v]) => v.name).join(", ");
      teacherTokens.forEach((token) => {
        messages.push({
          token,
          notification: {
            title: `⚠️ 오늘 미완료 학생 ${incompleteList.length}명`,
            body: names,
          },
        });
      });
    }

    // 각 학생에게 개인 알림
    incompleteList.forEach(([studentId, info]) => {
      Object.values(tokens)
        .filter((t) => t.role === "student" && t.userId === studentId)
        .forEach((t) => {
          messages.push({
            token: t.token,
            notification: {
              title: "📚 오늘 숙제 미완료",
              body: `${info.count}개 숙제가 아직 완료되지 않았습니다!`,
            },
          });
        });
    });

    if (messages.length === 0) {
      console.log("발송할 토큰 없음");
      return null;
    }

    for (let i = 0; i < messages.length; i += 500) {
      await admin.messaging().sendEach(messages.slice(i, i + 500));
    }

    console.log(`알림 발송 완료: ${messages.length}건`);
    return null;
  });

// ── 보고서 발송 시 학부모 FCM 알림 ─────────────────────────────────────────────
exports.sendReportNotification = onValueCreated(
  {
    ref: "parentReportIndex/{studentId}/{lessonKey}",
    region: "us-central1",
    instance: "homeworkplanner-e90a3-default-rtdb",
  },
  async (event) => {
    const { studentId } = event.params;
    const report = event.data.val();
    if (!report) return null;

    const parentUserId = studentId + "PA";
    const tokensSnap = await db.ref("fcmTokens").get();
    const tokens = tokensSnap.val() || {};

    const messages = Object.values(tokens)
      .filter(t => t.role === "parent" && t.userId === parentUserId)
      .map(t => ({
        token: t.token,
        notification: {
          title: "📋 수업 보고서 도착",
          body: `${report.date} ${report.lessonTitle} 수업 보고서가 발송되었습니다.`,
        },
      }));

    if (messages.length === 0) {
      console.log(`학부모 토큰 없음 (studentId: ${studentId})`);
      return null;
    }

    await admin.messaging().sendEach(messages);
    console.log(`보고서 알림 발송: ${messages.length}건 (studentId: ${studentId})`);
    return null;
  }
);

// ── KST 오늘 날짜 반환 ────────────────────────────────────────────────────────
function getTodayKST() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
