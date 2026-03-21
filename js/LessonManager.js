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
          <div className="space-y-1.5">
            <Lbl>수업명</Lbl>
            <Inp value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 수학 특강" />
          </div>
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

// ── 수업일지 메인 ─────────────────────────────────────────────────────────
function LessonManager({ students }) {
  const today = todayString();
  const todayDate = new Date(today);
  const [year, setYear] = React.useState(todayDate.getFullYear());
  const [month, setMonth] = React.useState(todayDate.getMonth());
  const [lessons, setLessons] = React.useState([]);
  const [attendance, setAttendance] = React.useState({});
  const [addModal, setAddModal] = React.useState(null);
  const [editingCell, setEditingCell] = React.useState(null); // { lessonKey, studentId, field }
  const [editValue, setEditValue] = React.useState("");

  React.useEffect(() => {
    const lRef = db.ref("lessons");
    lRef.on("value", snap => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([key, val]) => ({ ...val, _key: key }));
        setLessons(arr);
      } else setLessons([]);
    });
    const aRef = db.ref("lessonAttendance");
    aRef.on("value", snap => setAttendance(snap.val() || {}));
    return () => { lRef.off(); aRef.off(); };
  }, []);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthLessons = lessons
    .filter(l => l.date?.startsWith(monthStr))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));

  const sortedStudents = [...students].sort((a, b) =>
    a.className.localeCompare(b.className) || a.name.localeCompare(b.name));

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const handleSaveLesson = async (data) => {
    if (addModal?.lesson) {
      await db.ref(`lessons/${addModal.lesson._key}`).update(data);
    } else {
      const id = "lesson-" + Date.now();
      await db.ref(`lessons/${id}`).set({ ...data, createdAt: today });
    }
  };

  const handleDeleteLesson = async (key) => {
    if (!window.confirm("이 수업을 삭제할까요? 출석 기록도 함께 삭제됩니다.")) return;
    await db.ref(`lessons/${key}`).remove();
    await db.ref(`lessonAttendance/${key}`).remove();
  };

  // 태그 클릭 시 순환
  const cycleTag = async (lessonKey, studentId, current) => {
    const opts = ["출석", "지각", "결석", "조퇴", null];
    const idx = opts.indexOf(current || null);
    const next = opts[(idx + 1) % opts.length];
    await db.ref(`lessonAttendance/${lessonKey}/${studentId}/status`).set(next);
  };

  const startEdit = (lessonKey, studentId, field, current) => {
    setEditingCell({ lessonKey, studentId, field });
    setEditValue(current ?? "");
  };

  const saveCell = async (lessonKey, studentId, field, val) => {
    const value = (field === "xp" || field === "cp")
      ? (val === "" ? null : Number(val))
      : (val === "" ? null : val);
    if (value === null) {
      await db.ref(`lessonAttendance/${lessonKey}/${studentId}/${field}`).remove();
    } else {
      await db.ref(`lessonAttendance/${lessonKey}/${studentId}/${field}`).set(value);
    }
    setEditingCell(null);
  };

  const isEditing = (lessonKey, studentId, field) =>
    editingCell?.lessonKey === lessonKey && editingCell?.studentId === studentId && editingCell?.field === field;

  // 날짜 포맷: "2026-03-21" → "0321"
  const fmtMMDD = (date) => date?.slice(5).replace("-", "") ?? "";

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold">‹</button>
            <span className="text-lg font-bold min-w-[7rem] text-center">{year}년 {month + 1}월</span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold">›</button>
          </div>
          <Btn onClick={() => setAddModal({ date: today })}>+ 수업 등록</Btn>
        </div>
      </Card>

      {/* 표 */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse" style={{ minWidth: monthLessons.length > 0 ? `${140 + monthLessons.length * 260}px` : "100%" }}>
            <thead>
              {/* 수업명 행 */}
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-bold text-slate-500 border-b border-r border-slate-200 min-w-[130px]">
                  학생
                </th>
                {monthLessons.length === 0 ? (
                  <th className="px-6 py-3 text-xs text-slate-400 border-b font-normal">
                    이번 달 수업이 없습니다. <button onClick={() => setAddModal({ date: today })} className="text-slate-600 font-medium underline">수업 등록</button>
                  </th>
                ) : monthLessons.map(l => (
                  <th key={l._key} colSpan={4}
                    className="px-3 py-2.5 text-center text-xs font-bold text-slate-700 border-b border-r border-slate-200">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <span className="font-bold">{fmtMMDD(l.date)}</span>
                      <span className="text-slate-500 font-medium">{l.title}</span>
                      {l.time && <span className="text-slate-400 font-normal">{l.time.slice(0, 5)}</span>}
                      <button onClick={() => setAddModal({ date: l.date, lesson: l })}
                        className="text-slate-300 hover:text-slate-600 text-xs transition ml-0.5">✏️</button>
                      <button onClick={() => handleDeleteLesson(l._key)}
                        className="text-slate-300 hover:text-red-500 text-sm font-bold transition leading-none">×</button>
                    </div>
                  </th>
                ))}
              </tr>
              {/* 서브컬럼 행 */}
              {monthLessons.length > 0 && (
                <tr className="bg-slate-50/70">
                  <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200" />
                  {monthLessons.map(l => (
                    <React.Fragment key={l._key}>
                      {[
                        [fmtMMDD(l.date) + " 현행", "w-[100px]"],
                        [fmtMMDD(l.date) + " 태그", "w-[64px]"],
                        [fmtMMDD(l.date) + " XP", "w-[56px]"],
                        [fmtMMDD(l.date) + " CP", "w-[56px]"],
                      ].map(([label, w]) => (
                        <th key={label} className={`${w} px-2 py-2 text-[10px] font-semibold text-slate-400 border-b border-r border-slate-100 text-center whitespace-nowrap`}>
                          {label}
                        </th>
                      ))}
                    </React.Fragment>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {sortedStudents.map((s, si) => (
                <tr key={s.id} className={`hover:bg-slate-50/80 transition ${si % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                  {/* 학생 이름 (sticky) */}
                  <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 border-b border-r border-slate-200 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">{s.name[0]}</div>
                      <span className="font-semibold text-sm">{s.name}</span>
                      <span className="text-[10px] text-slate-400">{s.className}</span>
                    </div>
                  </td>

                  {/* 수업별 셀 */}
                  {monthLessons.map(l => {
                    const inLesson = (l.studentIds || []).includes(s.id);
                    const rec = attendance[l._key]?.[s.id] || {};

                    if (!inLesson) {
                      return (
                        <React.Fragment key={l._key}>
                          {[0, 1, 2, 3].map(i => (
                            <td key={i} className="border-b border-r border-slate-100 bg-slate-50/50 text-center text-slate-200 text-xs py-2">—</td>
                          ))}
                        </React.Fragment>
                      );
                    }

                    return (
                      <React.Fragment key={l._key}>
                        {/* 현행 */}
                        <td className="border-b border-r border-slate-100 px-2 py-2 cursor-text"
                          onClick={() => !isEditing(l._key, s.id, "현행") && startEdit(l._key, s.id, "현행", rec.현행)}>
                          {isEditing(l._key, s.id, "현행") ? (
                            <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                              onBlur={() => saveCell(l._key, s.id, "현행", editValue)}
                              onKeyDown={e => { if (e.key === "Enter") saveCell(l._key, s.id, "현행", editValue); if (e.key === "Escape") setEditingCell(null); }}
                              className="w-full text-xs border-b border-slate-400 outline-none bg-transparent" />
                          ) : (
                            <span className="text-xs text-slate-600 block truncate max-w-[90px]">
                              {rec.현행 || <span className="text-slate-300">—</span>}
                            </span>
                          )}
                        </td>

                        {/* 태그 */}
                        <td className="border-b border-r border-slate-100 text-center cursor-pointer py-2 px-1"
                          onClick={() => cycleTag(l._key, s.id, rec.status)}>
                          {rec.status ? (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-lg border font-medium ${statusStyle(rec.status)}`}>{rec.status}</span>
                          ) : (
                            <span className="text-[10px] text-slate-300 hover:text-slate-400">클릭</span>
                          )}
                        </td>

                        {/* XP */}
                        <td className="border-b border-r border-slate-100 text-center cursor-text py-2 px-1"
                          onClick={() => !isEditing(l._key, s.id, "xp") && startEdit(l._key, s.id, "xp", rec.xp)}>
                          {isEditing(l._key, s.id, "xp") ? (
                            <input autoFocus type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                              onBlur={() => saveCell(l._key, s.id, "xp", editValue)}
                              onKeyDown={e => { if (e.key === "Enter") saveCell(l._key, s.id, "xp", editValue); if (e.key === "Escape") setEditingCell(null); }}
                              className="w-12 text-xs text-center border-b border-slate-400 outline-none bg-transparent" />
                          ) : (
                            <span className="text-xs text-slate-600">
                              {rec.xp != null ? rec.xp : <span className="text-slate-300">—</span>}
                            </span>
                          )}
                        </td>

                        {/* CP */}
                        <td className="border-b border-r border-slate-100 text-center cursor-text py-2 px-1"
                          onClick={() => !isEditing(l._key, s.id, "cp") && startEdit(l._key, s.id, "cp", rec.cp)}>
                          {isEditing(l._key, s.id, "cp") ? (
                            <input autoFocus type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                              onBlur={() => saveCell(l._key, s.id, "cp", editValue)}
                              onKeyDown={e => { if (e.key === "Enter") saveCell(l._key, s.id, "cp", editValue); if (e.key === "Escape") setEditingCell(null); }}
                              className="w-12 text-xs text-center border-b border-slate-400 outline-none bg-transparent" />
                          ) : (
                            <span className="text-xs text-slate-600">
                              {rec.cp != null ? rec.cp : <span className="text-slate-300">—</span>}
                            </span>
                          )}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={1 + monthLessons.length * 4} className="p-8 text-center text-sm text-slate-400">
                    학생을 먼저 등록해 주세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {addModal && (
        <LessonModal
          lesson={addModal.lesson || { date: addModal.date, studentIds: [] }}
          students={students}
          onClose={() => setAddModal(null)}
          onSave={handleSaveLesson}
        />
      )}
    </div>
  );
}
