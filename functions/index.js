const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onValueWritten } = require("firebase-functions/v2/database");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();

// ── 로그 저장 헬퍼 ────────────────────────────────────────────────────────────
async function saveLog({ type, title, body, successNames, failedNames, sentCount, failCount }) {
  const id = Date.now().toString();
  await db.ref(`notificationLogs/${id}`).set({
    type,        // "auto_daily" | "manual_overdue" | "report"
    title,
    body: body || "",
    successNames: successNames || "",
    failedNames: failedNames || "",
    sentCount: sentCount || 0,
    failCount: failCount || 0,
    sentAt: new Date().toISOString(),
  });
}

// ── 매일 밤 23:59 (KST) 미완료 체크 → 학생 알림 발송 ─────────────────────────
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
      await saveLog({ type: "auto_daily", title: `[자동] ${today} 오늘 숙제 미완료 알림`, body: "미완료 학생 없음", targets: [], sentCount: 0, failCount: 0 });
      return null;
    }

    const messages = [];
    const messageUserIds = []; // null = 선생님 메시지 (실패 추적 불필요)

    // 선생님 토큰들에게 전체 요약 알림
    const teacherTokens = Object.values(tokens)
      .filter((t) => t.role === "teacher")
      .map((t) => t.token);

    if (teacherTokens.length > 0) {
      const names = incompleteList.map(([, v]) => v.name).join(", ");
      teacherTokens.forEach((token) => {
        messages.push({
          token,
          data: { title: `⚠️ 오늘 미완료 학생 ${incompleteList.length}명`, body: names },
        });
        messageUserIds.push(null);
      });
    }

    // 각 학생에게 개인 알림
    incompleteList.forEach(([studentId, info]) => {
      Object.values(tokens)
        .filter((t) => t.role === "student" && t.userId === studentId)
        .forEach((t) => {
          messages.push({
            token: t.token,
            data: { title: "📚 오늘 숙제 미완료", body: `${info.count}개 숙제가 아직 완료되지 않았습니다!` },
          });
          messageUserIds.push(studentId);
        });
    });

    // 토큰 없는 학생 = 발송 시도조차 못한 실패
    const studentIdsWithTokens = new Set(messageUserIds.filter(Boolean));
    const noTokenStudentIds = incompleteList.filter(([id]) => !studentIdsWithTokens.has(id)).map(([id]) => id);

    let sentCount = 0, failCount = 0;
    const succeededUserIds = new Set();
    const failedUserIds = new Set(noTokenStudentIds);
    if (messages.length > 0) {
      for (let i = 0; i < messages.length; i += 500) {
        const batch = messages.slice(i, i + 500);
        const batchUserIds = messageUserIds.slice(i, i + 500);
        const result = await admin.messaging().sendEach(batch);
        sentCount += result.successCount;
        failCount += result.failureCount;
        result.responses.forEach((r, j) => {
          const uid = batchUserIds[j];
          if (!uid) return;
          if (r.success) succeededUserIds.add(uid);
          else failedUserIds.add(uid);
        });
      }
    }

    const targets = incompleteList.map(([id, v]) => ({ id, name: v.name }));
    // 하나라도 성공하면 성공으로 간주
    const successNames = targets.filter(t => succeededUserIds.has(t.id)).map(t => t.name);
    const failedNames = targets.filter(t => failedUserIds.has(t.id) && !succeededUserIds.has(t.id)).map(t => t.name);
    await saveLog({
      type: "auto_daily",
      title: `[자동] ${today} 오늘 숙제 미완료 알림`,
      body: `오늘 숙제가 아직 완료되지 않았습니다!`,
      successNames: successNames.join(", "),
      failedNames: failedNames.join(", "),
      sentCount,
      failCount,
    });

    console.log(`알림 발송 완료: ${sentCount}건 성공, ${failCount}건 실패`);
    return null;
  });

// ── 밀린 학생 일괄 푸시 알림 (수동) ──────────────────────────────────────────
exports.sendOverdueAlert = onRequest(
  { region: "us-central1", cors: true },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
    const { studentIds } = req.body; // [{ id, name, overdueCount }]
    if (!studentIds || !studentIds.length) { res.status(400).send("studentIds required"); return; }

    const tokensSnap = await db.ref("fcmTokens").get();
    const tokens = tokensSnap.val() || {};
    const messages = [];

    const messageUserIds = [];
    studentIds.forEach(({ id, name, overdueCount }) => {
      Object.values(tokens)
        .filter(t => t.role === "student" && t.userId === id)
        .forEach(t => {
          messages.push({
            token: t.token,
            data: {
              title: "📚 밀린 숙제 알림",
              body: `밀린 숙제가 ${overdueCount}개 있습니다. 빨리 완료해주세요!`,
            },
            webpush: { fcmOptions: { link: "/" } },
          });
          messageUserIds.push(id);
        });
    });

    // 토큰 없는 학생 = 발송 시도조차 못한 실패
    const studentIdsWithTokens = new Set(messageUserIds.filter(Boolean));
    const noTokenStudentIds = new Set(studentIds.filter(s => !studentIdsWithTokens.has(s.id)).map(s => s.id));

    let sentCount = 0, failCount = 0;
    const succeededUserIds = new Set();
    const failedUserIds = new Set(noTokenStudentIds);
    if (messages.length > 0) {
      const result = await admin.messaging().sendEach(messages);
      sentCount = result.successCount;
      failCount = result.failureCount;
      result.responses.forEach((r, i) => {
        const uid = messageUserIds[i];
        if (!uid) return;
        if (r.success) succeededUserIds.add(uid);
        else failedUserIds.add(uid);
      });
    }

    const targets = studentIds.map(s => ({ id: s.id, name: s.name }));
    const successNames = targets.filter(t => succeededUserIds.has(t.id)).map(t => t.name);
    const failedNames = targets.filter(t => failedUserIds.has(t.id) && !succeededUserIds.has(t.id)).map(t => t.name);
    await saveLog({
      type: "manual_overdue",
      title: `[수동] 밀린 숙제 알림 발송`,
      body: `밀린 숙제가 있습니다. 빨리 완료해주세요!`,
      successNames: successNames.join(", "),
      failedNames: failedNames.join(", "),
      sentCount,
      failCount,
    });

    res.json({ success: true, sent: sentCount, failed: failCount });
  }
);

// ── 보고서 발송 시 학부모 FCM 알림 ─────────────────────────────────────────────
exports.sendReportNotification = onValueWritten(
  {
    ref: "parentReportIndex/{studentId}/{lessonKey}",
    region: "us-central1",
    instance: "homeworkplanner-e90a3-default-rtdb",
  },
  async (event) => {
    if (!event.data.after.exists()) return null;
    const { studentId } = event.params;
    const report = event.data.after.val();
    if (!report) return null;

    const parentUserId = studentId + "PA";
    const tokensSnap = await db.ref("fcmTokens").get();
    const tokens = tokensSnap.val() || {};
    const allTokens = Object.values(tokens);

    const messages = allTokens
      .filter(t => t.role === "parent" && t.userId === parentUserId)
      .map(t => ({
        token: t.token,
        data: {
          title: "📋 수업 보고서 도착",
          body: `${report.date} ${report.lessonTitle} 수업 내용을 확인해주세요.`,
        },
        webpush: { fcmOptions: { link: "/" } },
      }));

    let sentCount = 0, failCount = 0;
    if (messages.length > 0) {
      const result = await admin.messaging().sendEach(messages);
      sentCount = result.successCount;
      failCount = result.failureCount;
      result.responses.forEach((r, i) => {
        if (!r.success) console.error(`토큰 ${i} 실패:`, r.error);
      });
    }

    await saveLog({
      type: "report",
      title: `[보고서] ${report.date} ${report.lessonTitle}`,
      body: `학부모 알림 발송`,
      targets: [{ id: studentId }],
      sentCount,
      failCount,
    });

    console.log(`보고서 알림: ${sentCount}성공 ${failCount}실패`);
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
