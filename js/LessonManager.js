// ── 수업일지 ────────────────────────────────────────────────────────────────

// 달력 헬퍼
function getMonthDays(year, month) {
  // month: 0-based
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  // 앞 빈칸 (일요일 시작)
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

function fmtYMD(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const STATUS_OPTIONS = [
  { value: "출석", label: "출석", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "지각", label: "지각", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "결석", label: "결석", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "조퇴", label: "조퇴", color: "bg-purple-100 text-purple-700 border-purple-200" },
];

function statusStyle(val) {
  return STATUS_OPTIONS.find(o => o.value === val)?.color ?? "bg-slate-100 text-slate-600 border-slate-200";
}

// ── 수업 등록/편집 모달 ────────────────────────────────────────────────────
function LessonModal({ lesson, students, onClose, onSave }) {
  const isNew = !lesson._key;
  const [title, setTitle] = React.useState(lesson.title || "");
  const [date, setDate] = React.useState(lesson.date || "");
  const [time, setTime] = React.useState(lesson.time || "");
  const [selectedIds, setSelectedIds] = React.useState(lesson.studentIds || []);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  const toggleStudent = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const classes = [...new Set(students.map(s => s.className))].sort();

  const handleSave = async () => {
    if (!title.trim()) { setErr("수업명을 입력해 주세요."); return; }
    if (!date) { setErr("날짜를 선택해 주세요."); return; }
    if (selectedIds.length === 0) { setErr("학생을 최소 1명 선택해 주세요."); return; }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), date, time, studentIds: selectedIds });
      onClose();
    } catch (e) {
      setErr("저장 실패: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{isNew ? "수업 등록" : "수업 편집"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Lbl>수업명</Lbl>
            <Inp value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 수학 특강" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Lbl>날짜</Lbl>
              <Inp type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Lbl>시간 (선택)</Lbl>
              <Inp type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Lbl>포함 학생</Lbl>
          {classes.map(cls => (
            <div key={cls}>
              <div className="text-xs font-bold text-slate-400 px-1 pb-1 tracking-wide">{cls}</div>
              <div className="flex flex-wrap gap-2">
                {students.filter(s => s.className === cls).sort((a, b) => a.name.localeCompare(b.name)).map(s => {
                  const selected = selectedIds.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleStudent(s.id)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition ${selected
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {err && <AlertBox className="bg-red-50 text-red-700">{err}</AlertBox>}

        <div className="flex gap-2">
          <Btn onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "저장 중..." : isNew ? "✅ 수업 등록" : "저장"}
          </Btn>
          <Btn variant="outline" onClick={onClose}>취소</Btn>
        </div>
      </div>
    </div>
  );
}

// ── 출석 편집 모달 ────────────────────────────────────────────────────────
function AttendanceModal({ lesson, students, attendance, onClose }) {
  const [records, setRecords] = React.useState(() => {
    const init = {};
    (lesson.studentIds || []).forEach(id => {
      init[id] = attendance[id] || { status: "출석", memo: "" };
    });
    return init;
  });
  const [saving, setSaving] = React.useState(false);

  const setStatus = (id, status) => setRecords(r => ({ ...r, [id]: { ...r[id], status } }));
  const setMemo = (id, memo) => setRecords(r => ({ ...r, [id]: { ...r[id], memo } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {};
      Object.entries(records).forEach(([id, rec]) => {
        updates[`lessonAttendance/${lesson._key}/${id}`] = rec;
      });
      await db.ref().update(updates);
      onClose();
    } catch (e) {
      alert("저장 실패: " + e.message);
    }
    setSaving(false);
  };

  const lessonStudents = (lesson.studentIds || []).map(id => students.find(s => s.id === id)).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{lesson.title}</h2>
            <p className="text-sm text-slate-500">{lesson.date}{lesson.time ? " · " + lesson.time : ""} · {lessonStudents.length}명</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>

        <div className="space-y-3">
          {lessonStudents.map(s => {
            const rec = records[s.id] || { status: "출석", memo: "" };
            return (
              <div key={s.id} className="rounded-2xl border px-4 py-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">{s.name[0]}</div>
                    <span className="font-semibold text-sm">{s.name}</span>
                    <span className="text-xs text-slate-400">{s.className}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {STATUS_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setStatus(s.id, opt.value)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition ${rec.status === opt.value ? opt.color : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input value={rec.memo || ""} onChange={e => setMemo(s.id, e.target.value)}
                  placeholder="메모 (선택)"
                  className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-slate-300" />
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Btn onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "저장 중..." : "💾 출석 저장"}
          </Btn>
          <Btn variant="outline" onClick={onClose}>닫기</Btn>
        </div>
      </div>
    </div>
  );
}

// ── 수업일지 메인 컴포넌트 ─────────────────────────────────────────────────
function LessonManager({ students }) {
  const today = todayString();
  const todayDate = new Date(today);
  const [year, setYear] = React.useState(todayDate.getFullYear());
  const [month, setMonth] = React.useState(todayDate.getMonth()); // 0-based
  const [lessons, setLessons] = React.useState([]);
  const [attendance, setAttendance] = React.useState({});
  const [addModal, setAddModal] = React.useState(null); // null | { date, lesson? }
  const [attendModal, setAttendModal] = React.useState(null); // null | lesson
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);
  const [viewMode, setViewMode] = React.useState("calendar"); // "calendar" | "list"

  // Firebase 구독
  React.useEffect(() => {
    const lRef = db.ref("lessons");
    lRef.on("value", snap => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([key, val]) => ({ ...val, _key: key }));
        arr.sort((a, b) => b.date.localeCompare(a.date));
        setLessons(arr);
      } else setLessons([]);
    });
    const aRef = db.ref("lessonAttendance");
    aRef.on("value", snap => setAttendance(snap.val() || {}));
    return () => { lRef.off(); aRef.off(); };
  }, []);

  const handleSaveLesson = async (data) => {
    if (addModal?.lesson) {
      // 수정
      await db.ref(`lessons/${addModal.lesson._key}`).update(data);
    } else {
      // 신규
      const id = "lesson-" + Date.now();
      await db.ref(`lessons/${id}`).set({ ...data, createdAt: today });
    }
  };

  const handleDelete = async (key) => {
    try {
      await db.ref(`lessons/${key}`).remove();
      await db.ref(`lessonAttendance/${key}`).remove();
      setDeleteConfirm(null);
    } catch (e) {
      alert("삭제 실패: " + e.message);
    }
  };

  // 이번 달 수업들
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthLessons = lessons.filter(l => l.date && l.date.startsWith(monthStr));

  // 날짜별 수업 맵
  const lessonsByDate = {};
  monthLessons.forEach(l => {
    if (!lessonsByDate[l.date]) lessonsByDate[l.date] = [];
    lessonsByDate[l.date].push(l);
  });

  const days = getMonthDays(year, month);
  const DOW = ["일", "월", "화", "수", "목", "금", "토"];

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  // 수업별 출석 요약
  const getAttendSummary = (lessonKey, studentIds) => {
    const rec = attendance[lessonKey] || {};
    const counts = { 출석: 0, 지각: 0, 결석: 0, 조퇴: 0, 미기록: 0 };
    (studentIds || []).forEach(id => {
      const s = rec[id]?.status;
      if (s && counts[s] !== undefined) counts[s]++;
      else counts["미기록"]++;
    });
    return counts;
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600">‹</button>
            <h2 className="text-xl font-bold min-w-[7rem] text-center">{year}년 {month + 1}월</h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600">›</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-0.5">
              {[["calendar", "달력"], ["list", "목록"]].map(([v, l]) => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === v ? "bg-white shadow-sm" : "text-slate-500"}`}>
                  {l}
                </button>
              ))}
            </div>
            <Btn onClick={() => setAddModal({ date: today })}>+ 수업 등록</Btn>
          </div>
        </div>
      </Card>

      {viewMode === "calendar" ? (
        <Card className="p-4">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-1">
            {DOW.map((d, i) => (
              <div key={d} className={`text-center text-xs font-bold py-2 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-400"}`}>{d}</div>
            ))}
          </div>
          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="bg-white min-h-[80px]" />;
              const dateStr = fmtYMD(year, month, day);
              const dayLessons = lessonsByDate[dateStr] || [];
              const isToday = dateStr === today;
              const dow = (idx) % 7;
              const isSun = dow === 0;
              const isSat = dow === 6;
              return (
                <div key={dateStr}
                  className={`bg-white min-h-[80px] p-1.5 cursor-pointer hover:bg-slate-50 transition relative ${isToday ? "ring-2 ring-inset ring-slate-900" : ""}`}
                  onClick={() => setAddModal({ date: dateStr })}>
                  <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-slate-900 text-white" : isSun ? "text-red-500" : isSat ? "text-blue-500" : "text-slate-700"}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayLessons.map(l => {
                      const cnt = (l.studentIds || []).length;
                      return (
                        <div key={l._key}
                          onClick={e => { e.stopPropagation(); setAttendModal(l); }}
                          className="rounded-lg bg-slate-800 text-white px-1.5 py-0.5 text-[10px] font-medium truncate hover:bg-slate-700 transition">
                          {l.time ? l.time.slice(0, 5) + " " : ""}{l.title} ({cnt}명)
                        </div>
                      );
                    })}
                    {dayLessons.length === 0 && (
                      <div className="text-[10px] text-slate-300 text-center mt-3">+</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        // 목록 뷰
        <div className="space-y-2">
          {lessons.length === 0 ? (
            <Card className="p-8 text-center text-sm text-slate-400">등록된 수업이 없습니다.</Card>
          ) : (
            lessons.map(l => {
              const summary = getAttendSummary(l._key, l.studentIds);
              const total = (l.studentIds || []).length;
              const isConfirming = deleteConfirm === l._key;
              return (
                <Card key={l._key} className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-xs text-slate-400">{l.date?.slice(5)}</div>
                        {l.time && <div className="text-xs text-slate-500 font-medium">{l.time.slice(0, 5)}</div>}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{l.title}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-xs text-slate-400">{total}명</span>
                          {summary.출석 > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">출석 {summary.출석}</span>}
                          {summary.지각 > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-amber-100 text-amber-700 border border-amber-200">지각 {summary.지각}</span>}
                          {summary.결석 > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-red-100 text-red-700 border border-red-200">결석 {summary.결석}</span>}
                          {summary.조퇴 > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-purple-100 text-purple-700 border border-purple-200">조퇴 {summary.조퇴}</span>}
                          {summary.미기록 > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">미기록 {summary.미기록}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      {isConfirming ? (
                        <>
                          <span className="text-xs text-red-600">삭제할까요?</span>
                          <Btn variant="danger" size="sm" onClick={() => handleDelete(l._key)}>확인</Btn>
                          <Btn variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>취소</Btn>
                        </>
                      ) : (
                        <>
                          <Btn size="sm" onClick={() => setAttendModal(l)}>출석 기록</Btn>
                          <Btn variant="outline" size="sm" onClick={() => setAddModal({ date: l.date, lesson: l })}>수정</Btn>
                          <Btn variant="danger" size="sm" onClick={() => setDeleteConfirm(l._key)}>삭제</Btn>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* 수업 등록/편집 모달 */}
      {addModal && (
        <LessonModal
          lesson={addModal.lesson || { date: addModal.date, studentIds: [] }}
          students={students}
          onClose={() => setAddModal(null)}
          onSave={handleSaveLesson}
        />
      )}

      {/* 출석 기록 모달 */}
      {attendModal && (
        <AttendanceModal
          lesson={attendModal}
          students={students}
          attendance={attendance[attendModal._key] || {}}
          onClose={() => setAttendModal(null)}
        />
      )}
    </div>
  );
}
