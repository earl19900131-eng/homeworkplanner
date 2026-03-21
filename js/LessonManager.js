// ── 수업일지 ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "출석", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "지각", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "결석", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "조퇴", color: "bg-purple-100 text-purple-700 border-purple-200" },
];

function statusStyle(val) {
  return STATUS_OPTIONS.find(o => o.value === val)?.color ?? "bg-slate-100 text-slate-600 border-slate-200";
}

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

function fmtYMD(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fmtMMDD(date) {
  return date?.slice(5).replace("-", "") ?? "";
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

  const toggleStudent = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectClass = (cls) => {
    const ids = students.filter(s => s.className === cls).map(s => s.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected
      ? prev.filter(id => !ids.includes(id))
      : [...new Set([...prev, ...ids])]);
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
    } catch (e) { setErr("저장 실패: " + e.message); }
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
          <div className="space-y-1.5"><Lbl>수업명</Lbl><Inp value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 수학 특강" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Lbl>날짜</Lbl><Inp type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Lbl>시간 (선택)</Lbl><Inp type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
          </div>
        </div>
        <div className="space-y-3">
          <Lbl>포함 학생</Lbl>
          {classes.map(cls => {
            const clsIds = students.filter(s => s.className === cls).map(s => s.id);
            const allSel = clsIds.every(id => selectedIds.includes(id));
            return (
              <div key={cls}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-slate-400 tracking-wide">{cls}</span>
                  <button type="button" onClick={() => selectClass(cls)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${allSel ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
                    {allSel ? "전체 해제" : "전체 선택"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {students.filter(s => s.className === cls).sort((a, b) => a.name.localeCompare(b.name)).map(s => {
                    const sel = selectedIds.includes(s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => toggleStudent(s.id)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition ${sel ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {err && <AlertBox className="bg-red-50 text-red-700">{err}</AlertBox>}
        <div className="flex gap-2">
          <Btn onClick={handleSave} disabled={saving} className="flex-1">{saving ? "저장 중..." : isNew ? "✅ 수업 등록" : "저장"}</Btn>
          <Btn variant="outline" onClick={onClose}>취소</Btn>
        </div>
      </div>
    </div>
  );
}

// ── 수업 상세 표 뷰 ───────────────────────────────────────────────────────
function LessonDetailView({ lesson, students, attendance, onBack, onEdit }) {
  const [editingCell, setEditingCell] = React.useState(null);
  const [editValue, setEditValue] = React.useState("");

  const sortedStudents = [...students].sort((a, b) =>
    a.className.localeCompare(b.className) || a.name.localeCompare(b.name));

  const rec = attendance[lesson._key] || {};

  const cycleTag = async (studentId, current) => {
    const opts = ["출석", "지각", "결석", "조퇴", null];
    const idx = opts.indexOf(current || null);
    const next = opts[(idx + 1) % opts.length];
    await db.ref(`lessonAttendance/${lesson._key}/${studentId}/status`).set(next);
  };

  const startEdit = (studentId, field, current) => {
    setEditingCell({ studentId, field });
    setEditValue(current ?? "");
  };

  const saveCell = async (studentId, field, val) => {
    const value = (field === "xp" || field === "cp")
      ? (val === "" ? null : Number(val))
      : (val === "" ? null : val);
    if (value === null) {
      await db.ref(`lessonAttendance/${lesson._key}/${studentId}/${field}`).remove();
    } else {
      await db.ref(`lessonAttendance/${lesson._key}/${studentId}/${field}`).set(value);
    }
    setEditingCell(null);
  };

  const isEditing = (studentId, field) =>
    editingCell?.studentId === studentId && editingCell?.field === field;

  const mmdd = fmtMMDD(lesson.date);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold text-lg">‹</button>
            <div>
              <div className="font-bold text-base">{lesson.title}</div>
              <div className="text-sm text-slate-500">{lesson.date}{lesson.time ? " · " + lesson.time.slice(0, 5) : ""} · {(lesson.studentIds || []).length}명</div>
            </div>
          </div>
          <Btn variant="outline" size="sm" onClick={onEdit}>✏️ 수업 편집</Btn>
        </div>
      </Card>

      {/* 표 */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-bold text-slate-500 border-b border-r border-slate-200 min-w-[130px]">학생</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-slate-600 border-b border-r border-slate-200 min-w-[110px]">{mmdd} 현행</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-slate-600 border-b border-r border-slate-200 min-w-[72px]">{mmdd} 태그</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-slate-600 border-b border-r border-slate-200 min-w-[64px]">{mmdd} XP</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-slate-600 border-b border-r border-slate-200 min-w-[64px]">{mmdd} CP</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((s, si) => {
                const inLesson = (lesson.studentIds || []).includes(s.id);
                const sRec = rec[s.id] || {};
                return (
                  <tr key={s.id} className={`hover:bg-slate-50/80 transition ${si % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                    {/* 이름 */}
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 border-b border-r border-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${inLesson ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-400"}`}>{s.name[0]}</div>
                        <span className={`font-semibold text-sm ${inLesson ? "" : "text-slate-400"}`}>{s.name}</span>
                        <span className="text-[10px] text-slate-400">{s.className}</span>
                      </div>
                    </td>

                    {!inLesson ? (
                      [0,1,2,3].map(i => (
                        <td key={i} className="border-b border-r border-slate-100 bg-slate-50/50 text-center text-slate-200 text-xs py-2.5">—</td>
                      ))
                    ) : (
                      <>
                        {/* 현행 */}
                        <td className="border-b border-r border-slate-100 px-3 py-2.5 cursor-text"
                          onClick={() => !isEditing(s.id, "현행") && startEdit(s.id, "현행", sRec.현행)}>
                          {isEditing(s.id, "현행") ? (
                            <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                              onBlur={() => saveCell(s.id, "현행", editValue)}
                              onKeyDown={e => { if (e.key === "Enter") saveCell(s.id, "현행", editValue); if (e.key === "Escape") setEditingCell(null); }}
                              className="w-full text-xs border-b border-slate-400 outline-none bg-transparent" />
                          ) : (
                            <span className="text-xs text-slate-600 block truncate">
                              {sRec.현행 || <span className="text-slate-300">클릭하여 입력</span>}
                            </span>
                          )}
                        </td>
                        {/* 태그 */}
                        <td className="border-b border-r border-slate-100 text-center cursor-pointer py-2.5 px-2"
                          onClick={() => cycleTag(s.id, sRec.status)}>
                          {sRec.status ? (
                            <span className={`text-[11px] px-2 py-0.5 rounded-lg border font-medium ${statusStyle(sRec.status)}`}>{sRec.status}</span>
                          ) : (
                            <span className="text-[11px] text-slate-300 hover:text-slate-400">클릭</span>
                          )}
                        </td>
                        {/* XP */}
                        <td className="border-b border-r border-slate-100 text-center cursor-text py-2.5 px-2"
                          onClick={() => !isEditing(s.id, "xp") && startEdit(s.id, "xp", sRec.xp)}>
                          {isEditing(s.id, "xp") ? (
                            <input autoFocus type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                              onBlur={() => saveCell(s.id, "xp", editValue)}
                              onKeyDown={e => { if (e.key === "Enter") saveCell(s.id, "xp", editValue); if (e.key === "Escape") setEditingCell(null); }}
                              className="w-14 text-xs text-center border-b border-slate-400 outline-none bg-transparent" />
                          ) : (
                            <span className="text-xs text-slate-600">{sRec.xp != null ? sRec.xp : <span className="text-slate-300">—</span>}</span>
                          )}
                        </td>
                        {/* CP */}
                        <td className="border-b border-r border-slate-100 text-center cursor-text py-2.5 px-2"
                          onClick={() => !isEditing(s.id, "cp") && startEdit(s.id, "cp", sRec.cp)}>
                          {isEditing(s.id, "cp") ? (
                            <input autoFocus type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                              onBlur={() => saveCell(s.id, "cp", editValue)}
                              onKeyDown={e => { if (e.key === "Enter") saveCell(s.id, "cp", editValue); if (e.key === "Escape") setEditingCell(null); }}
                              className="w-14 text-xs text-center border-b border-slate-400 outline-none bg-transparent" />
                          ) : (
                            <span className="text-xs text-slate-600">{sRec.cp != null ? sRec.cp : <span className="text-slate-300">—</span>}</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── 달력 뷰 ──────────────────────────────────────────────────────────────
function LessonCalendar({ year, month, lessons, today, onPrev, onNext, onDayClick, onLessonClick, onAddLesson }) {
  const days = getMonthDays(year, month);
  const DOW = ["일", "월", "화", "수", "목", "금", "토"];
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthLessons = lessons.filter(l => l.date?.startsWith(monthStr));

  const lessonsByDate = {};
  monthLessons.forEach(l => {
    if (!lessonsByDate[l.date]) lessonsByDate[l.date] = [];
    lessonsByDate[l.date].push(l);
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onPrev} className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold">‹</button>
            <span className="text-lg font-bold min-w-[7rem] text-center">{year}년 {month + 1}월</span>
            <button onClick={onNext} className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold">›</button>
          </div>
          <Btn onClick={() => onAddLesson(today)}>+ 수업 등록</Btn>
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid grid-cols-7 mb-1">
          {DOW.map((d, i) => (
            <div key={d} className={`text-center text-xs font-bold py-2 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-400"}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="bg-white min-h-[90px]" />;
            const dateStr = fmtYMD(year, month, day);
            const dayLessons = lessonsByDate[dateStr] || [];
            const isToday = dateStr === today;
            const dow = idx % 7;
            return (
              <div key={dateStr}
                className={`bg-white min-h-[90px] p-1.5 cursor-pointer hover:bg-slate-50 transition ${isToday ? "ring-2 ring-inset ring-slate-900" : ""}`}
                onClick={() => onDayClick(dateStr)}>
                <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-slate-900 text-white" : dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-slate-700"}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayLessons.map(l => (
                    <div key={l._key}
                      onClick={e => { e.stopPropagation(); onLessonClick(l); }}
                      className="rounded-lg bg-slate-800 text-white px-1.5 py-0.5 text-[10px] font-medium truncate hover:bg-slate-600 transition cursor-pointer">
                      {l.time ? l.time.slice(0, 5) + " " : ""}{l.title} ({(l.studentIds || []).length}명)
                    </div>
                  ))}
                  {dayLessons.length === 0 && (
                    <div className="text-[10px] text-slate-300 text-center mt-4">+</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── 수업일지 메인 ─────────────────────────────────────────────────────────
function LessonManager({ students }) {
  const today = todayString();
  const todayDate = new Date(today);
  const [year, setYear] = React.useState(todayDate.getFullYear());
  const [month, setMonth] = React.useState(todayDate.getMonth());
  const [lessons, setLessons] = React.useState([]);
  const [attendance, setAttendance] = React.useState({});
  const [selectedLesson, setSelectedLesson] = React.useState(null); // null = 달력, lesson = 상세
  const [addModal, setAddModal] = React.useState(null);

  React.useEffect(() => {
    const lRef = db.ref("lessons");
    lRef.on("value", snap => {
      const data = snap.val();
      setLessons(data ? Object.entries(data).map(([key, val]) => ({ ...val, _key: key })) : []);
    });
    const aRef = db.ref("lessonAttendance");
    aRef.on("value", snap => setAttendance(snap.val() || {}));
    return () => { lRef.off(); aRef.off(); };
  }, []);

  // selectedLesson은 key로만 추적, 최신 데이터는 lessons에서 가져옴
  const currentLesson = selectedLesson
    ? lessons.find(l => l._key === selectedLesson) ?? null
    : null;

  const handleSaveLesson = async (data) => {
    if (addModal?.lesson) {
      await db.ref(`lessons/${addModal.lesson._key}`).update(data);
    } else {
      const id = "lesson-" + Date.now();
      await db.ref(`lessons/${id}`).set({ ...data, createdAt: today });
    }
  };

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  // 상세 뷰
  if (currentLesson) {
    return (
      <>
        <LessonDetailView
          lesson={currentLesson}
          students={students}
          attendance={attendance}
          onBack={() => setSelectedLesson(null)}
          onEdit={() => setAddModal({ date: currentLesson.date, lesson: currentLesson })}
        />
        {addModal && (
          <LessonModal
            lesson={addModal.lesson || { date: addModal.date, studentIds: [] }}
            students={students}
            onClose={() => setAddModal(null)}
            onSave={handleSaveLesson}
          />
        )}
      </>
    );
  }

  // 달력 뷰 (기본)
  return (
    <>
      <LessonCalendar
        year={year} month={month} lessons={lessons} today={today}
        onPrev={prevMonth} onNext={nextMonth}
        onDayClick={(date) => setAddModal({ date })}
        onLessonClick={(lesson) => setSelectedLesson(lesson._key)}
        onAddLesson={(date) => setAddModal({ date })}
      />
      {addModal && (
        <LessonModal
          lesson={addModal.lesson || { date: addModal.date, studentIds: [] }}
          students={students}
          onClose={() => setAddModal(null)}
          onSave={handleSaveLesson}
        />
      )}
    </>
  );
}
