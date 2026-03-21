// ── 수업일지 ────────────────────────────────────────────────────────────────

const BEHAVIOR_TAGS = [
  { name: "지각안함",         xp:  3,   cp:   10, group: "출결" },
  { name: "지각",             xp: -5,   cp:    0, group: "출결" },
  { name: "출석",             xp: 10,   cp:   30, group: "출결" },
  { name: "결석",             xp:  0,   cp:    0, group: "출결" },
  { name: "무단결석",         xp: -50,  cp:    0, group: "출결" },
  { name: "숙제해옴",         xp:  5,   cp:   40, group: "숙제" },
  { name: "숙제미이행",       xp: -10,  cp:    0, group: "숙제" },
  { name: "노트미지참",       xp: -5,   cp:    0, group: "준비물" },
  { name: "진단평가1",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가2",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가3",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가4",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가5",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가6",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가7",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가8",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "추가숙제1",        xp:  2,   cp:   10, group: "추가숙제" },
  { name: "추가숙제2",        xp:  2,   cp:   10, group: "추가숙제" },
  { name: "추가숙제3",        xp:  2,   cp:   10, group: "추가숙제" },
  { name: "추가숙제4",        xp:  2,   cp:   10, group: "추가숙제" },
  { name: "지필100점(중등)",   xp: 50,  cp: 1000, group: "지필성적" },
  { name: "지필90~100(중등)", xp: 45,  cp:  900, group: "지필성적" },
  { name: "지필80~90(중등)",  xp: 40,  cp:  800, group: "지필성적" },
  { name: "지필30상승(중고등)",xp: 50,  cp:  500, group: "지필성적" },
  { name: "지필1등급(9등급)", xp: 50,  cp: 1000, group: "지필성적" },
  { name: "지필2등급(9등급)", xp: 45,  cp:  900, group: "지필성적" },
  { name: "지필1등급(5등급)", xp: 50,  cp: 1000, group: "지필성적" },
  { name: "리뷰이벤트",       xp:  0,  cp:  200, group: "기타" },
  { name: "100cp",            xp:  0,  cp:  100, group: "기타" },
];

const TAG_GROUPS = [...new Set(BEHAVIOR_TAGS.map(t => t.group))];

function calcPoints(tags) {
  return (tags || []).reduce(
    (acc, name) => {
      const t = BEHAVIOR_TAGS.find(b => b.name === name);
      if (t) { acc.xp += t.xp; acc.cp += t.cp; }
      return acc;
    },
    { xp: 0, cp: 0 }
  );
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

// ── 태그 선택 모달 (즉시 적용, 저장 버튼 없음) ──────────────────────────
function TagSelectorModal({ studentName, currentTags, onToggle, onClose }) {
  const { xp, cp } = calcPoints(currentTags);

  React.useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 pb-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base">{studentName} · 행동태그</h3>
              <div className="text-sm mt-1 flex gap-3">
                <span>획득 XP: <span className={`font-bold ${xp >= 0 ? "text-emerald-600" : "text-red-600"}`}>{xp >= 0 ? "+" : ""}{xp}</span></span>
                <span>획득 CP: <span className="font-bold text-blue-600">+{cp}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Esc · 바깥 클릭으로 닫기</span>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {TAG_GROUPS.map(group => (
            <div key={group}>
              <div className="text-xs font-bold text-slate-400 tracking-wide mb-2">{group}</div>
              <div className="flex flex-wrap gap-1.5">
                {BEHAVIOR_TAGS.filter(t => t.group === group).map(tag => {
                  const sel = currentTags.includes(tag.name);
                  const negXP = tag.xp < 0;
                  return (
                    <button key={tag.name} type="button" onClick={() => onToggle(tag.name)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1 ${sel ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                      <span>{tag.name}</span>
                      <span className={`text-[9px] font-normal ${sel ? "text-slate-400" : negXP ? "text-red-400" : "text-emerald-500"}`}>
                        {tag.xp !== 0 ? (tag.xp > 0 ? "+" : "") + tag.xp + "xp" : ""}
                        {tag.xp !== 0 && tag.cp !== 0 ? " " : ""}
                        {tag.cp !== 0 ? "+" + tag.cp + "cp" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
    try { await onSave({ title: title.trim(), date, time, studentIds: selectedIds }); onClose(); }
    catch (e) { setErr("저장 실패: " + e.message); }
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

// ── 수업 상세 표 ──────────────────────────────────────────────────────────
// col: 0=현행숙제, 1=행동태그
function LessonDetailView({ lesson, students, attendance, allAttendance, onBack, onEdit }) {
  const [editingHW, setEditingHW] = React.useState(null);
  const [hwValue, setHwValue] = React.useState("");
  const [editingEval, setEditingEval] = React.useState(null);
  const [evalValue, setEvalValue] = React.useState("");
  const [tagModal, setTagModal] = React.useState(null);       // studentId
  const [tagModalOriginal, setTagModalOriginal] = React.useState([]); // 모달 열릴 때 태그 스냅샷
  const [focusedCell, setFocusedCell] = React.useState(null); // { row, col }
  const [clipboard, setClipboard] = React.useState(null);     // { type:'hw'|'tags', value }
  const [copyFlash, setCopyFlash] = React.useState(false);
  const [undoStack, setUndoStack] = React.useState([]);        // [{ studentId, field, value }]
  const containerRef = React.useRef(null);

  const lessonStudents = (lesson.studentIds || [])
    .map(id => students.find(s => s.id === id))
    .filter(Boolean)
    .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));

  const rec = attendance[lesson._key] || {};

  const cumulativeTotals = React.useMemo(() => {
    const totals = {};
    Object.values(allAttendance).forEach(lessonRec => {
      Object.entries(lessonRec).forEach(([studentId, r]) => {
        if (!totals[studentId]) totals[studentId] = { xp: 0, cp: 0 };
        totals[studentId].xp += Number(r.xp) || 0;
        totals[studentId].cp += Number(r.cp) || 0;
      });
    });
    return totals;
  }, [allAttendance]);

  const refocusContainer = () => setTimeout(() => containerRef.current?.focus(), 30);

  const pushUndo = (studentId, field, prevValue) =>
    setUndoStack(prev => [...prev.slice(-29), { studentId, field, prevValue }]);

  // 낮은 수준 저장 (undo 스택 안 쌓음)
  const rawSaveHW = async (studentId, val) => {
    if (val === "") await db.ref(`lessonAttendance/${lesson._key}/${studentId}/현행숙제`).remove();
    else await db.ref(`lessonAttendance/${lesson._key}/${studentId}/현행숙제`).set(val);
  };
  const rawSaveEval = async (studentId, val) => {
    if (val === "") await db.ref(`lessonAttendance/${lesson._key}/${studentId}/현행평가`).remove();
    else await db.ref(`lessonAttendance/${lesson._key}/${studentId}/현행평가`).set(val);
  };
  const rawSaveTags = async (studentId, tags) => {
    const { xp, cp } = calcPoints(tags);
    await db.ref(`lessonAttendance/${lesson._key}/${studentId}`).update({ tags, xp, cp });
  };

  // 사용자 액션 저장 (undo 스택 쌓음)
  const saveHW = async (studentId, val) => {
    pushUndo(studentId, "hw", (rec[studentId] || {}).현행숙제 || "");
    await rawSaveHW(studentId, val);
    setEditingHW(null);
    refocusContainer();
  };
  const saveEval = async (studentId, val) => {
    pushUndo(studentId, "eval", (rec[studentId] || {}).현행평가 || "");
    await rawSaveEval(studentId, val);
    setEditingEval(null);
    refocusContainer();
  };

  // 태그 모달 열기 (원본 스냅샷 저장)
  const openTagModal = (studentId) => {
    setTagModalOriginal([...((rec[studentId] || {}).tags || [])]);
    setTagModal(studentId);
  };

  // 태그 즉시 토글 저장 (undo 안 쌓음 — 모달 닫을 때 한 번에 쌓음)
  const handleTagToggle = async (studentId, name) => {
    const current = (rec[studentId] || {}).tags || [];
    const newTags = current.includes(name) ? current.filter(t => t !== name) : [...current, name];
    await rawSaveTags(studentId, newTags);
  };

  // 태그 모달 닫기 (변경 있으면 undo 스택에 원본 추가)
  const closeTagModal = () => {
    const currentTags = (rec[tagModal] || {}).tags || [];
    if (JSON.stringify(currentTags) !== JSON.stringify(tagModalOriginal)) {
      pushUndo(tagModal, "tags", tagModalOriginal);
    }
    setTagModal(null);
    refocusContainer();
  };

  const undoAction = async () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    if (last.field === "hw")   await rawSaveHW(last.studentId, last.prevValue);
    if (last.field === "eval") await rawSaveEval(last.studentId, last.prevValue);
    if (last.field === "tags") await rawSaveTags(last.studentId, last.prevValue);
  };

  const selectCell = (row, col) => {
    setFocusedCell({ row, col });
    containerRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (editingHW || editingEval || tagModal) return;
    if (!focusedCell) return;
    const { row, col } = focusedCell;
    const maxRow = lessonStudents.length - 1;

    if (e.key === "ArrowUp")    { e.preventDefault(); if (row > 0)     setFocusedCell({ row: row - 1, col }); return; }
    if (e.key === "ArrowDown")  { e.preventDefault(); if (row < maxRow) setFocusedCell({ row: row + 1, col }); return; }
    if (e.key === "ArrowLeft")  { e.preventDefault(); if (col > 0)      setFocusedCell({ row, col: col - 1 }); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); if (col < 2)      setFocusedCell({ row, col: col + 1 }); return; }
    if (e.key === "Escape")     { setFocusedCell(null); return; }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const s = lessonStudents[row];
      const sRec = rec[s.id] || {};
      if (col === 0) { setEditingHW(s.id);   setHwValue(sRec.현행숙제 || ""); }
      if (col === 1) { setEditingEval(s.id); setEvalValue(sRec.현행평가 || ""); }
      if (col === 2) { openTagModal(s.id); }
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      const s = lessonStudents[row];
      const sRec = rec[s.id] || {};
      if (col === 0) saveHW(s.id, "");
      if (col === 1) saveEval(s.id, "");
      if (col === 2) { pushUndo(s.id, "tags", [...(sRec.tags || [])]); rawSaveTags(s.id, []); }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      undoAction();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      e.preventDefault();
      const s = lessonStudents[row];
      const sRec = rec[s.id] || {};
      if (col === 0) setClipboard({ type: "hw",   value: sRec.현행숙제 || "" });
      if (col === 1) setClipboard({ type: "eval", value: sRec.현행평가 || "" });
      if (col === 2) setClipboard({ type: "tags", value: [...(sRec.tags || [])] });
      setCopyFlash(true);
      setTimeout(() => setCopyFlash(false), 900);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      e.preventDefault();
      if (!clipboard) return;
      const s = lessonStudents[row];
      const sRec = rec[s.id] || {};
      if (col === 0 && clipboard.type === "hw") {
        pushUndo(s.id, "hw", sRec.현행숙제 || "");
        rawSaveHW(s.id, clipboard.value);
      }
      if (col === 1 && clipboard.type === "eval") {
        pushUndo(s.id, "eval", sRec.현행평가 || "");
        rawSaveEval(s.id, clipboard.value);
      }
      if (col === 2 && clipboard.type === "tags") {
        pushUndo(s.id, "tags", [...(sRec.tags || [])]);
        rawSaveTags(s.id, clipboard.value);
      }
      return;
    }
  };

  const isFocused = (row, col) => focusedCell?.row === row && focusedCell?.col === col;
  const focusRing = "ring-2 ring-inset ring-blue-400 bg-blue-50/60";

  const tagModalStudent = tagModal ? students.find(s => s.id === tagModal) : null;

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
              <div className="text-sm text-slate-500">{lesson.date}{lesson.time ? " · " + lesson.time.slice(0, 5) : ""} · {lessonStudents.length}명</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {clipboard && (
              <span className={`text-[11px] px-2 py-1 rounded-lg border transition ${copyFlash ? "bg-blue-100 text-blue-600 border-blue-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                {copyFlash ? "복사됨" : `클립보드: ${clipboard.type === "hw" ? "현행숙제" : "태그"}`}
              </span>
            )}
            {undoStack.length > 0 && (
              <button onClick={undoAction}
                className="text-[11px] px-2 py-1 rounded-lg border bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 transition">
                ↩ 실행취소 ({undoStack.length})
              </button>
            )}
            <span className="text-[11px] text-slate-400 hidden sm:block">↑↓←→ · Enter · Del · Ctrl+C/V/Z</span>
            <Btn variant="outline" size="sm" onClick={onEdit}>✏️ 수업 편집</Btn>
          </div>
        </div>
      </Card>

      {/* 표 */}
      <Card className="p-0 overflow-hidden">
        <div ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown} className="overflow-x-auto outline-none">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-bold text-slate-500 border-b border-r border-slate-200 min-w-[140px]">학생</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 border-b border-r border-slate-200 min-w-[160px]">현행숙제</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 border-b border-r border-slate-200 min-w-[160px]">현행평가</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 border-b border-r border-slate-200 min-w-[200px]">행동태그</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 border-b border-r border-slate-200 min-w-[80px]">획득 XP</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 border-b border-slate-200 min-w-[80px]">획득 CP</th>
              </tr>
            </thead>
            <tbody>
              {lessonStudents.map((s, si) => {
                const sRec = rec[s.id] || {};
                const tags = sRec.tags || [];
                const { xp, cp } = calcPoints(tags);
                const total = cumulativeTotals[s.id] || { xp: 0, cp: 0 };

                return (
                  <tr key={s.id} className={si % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-3 border-b border-r border-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">{s.name[0]}</div>
                        <div>
                          <div className="font-semibold text-sm">{s.name}</div>
                          <div className="text-[10px] text-slate-400 flex gap-2">
                            <span>{s.className}</span>
                            <span className="text-slate-300">|</span>
                            <span>누적 <span className="text-emerald-600 font-medium">{total.xp >= 0 ? "+" : ""}{total.xp}XP</span></span>
                            <span className="text-blue-600 font-medium">+{total.cp}CP</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 현행숙제 */}
                    <td className={`border-b border-r border-slate-100 px-3 py-2.5 cursor-text transition ${isFocused(si, 0) ? focusRing : ""}`}
                      onClick={() => { selectCell(si, 0); if (editingHW !== s.id) { setEditingHW(s.id); setHwValue(sRec.현행숙제 || ""); } }}>
                      {editingHW === s.id ? (
                        <input autoFocus value={hwValue} onChange={e => setHwValue(e.target.value)}
                          onBlur={() => saveHW(s.id, hwValue)}
                          onKeyDown={e => { if (e.key === "Enter") saveHW(s.id, hwValue); if (e.key === "Escape") { setEditingHW(null); refocusContainer(); } }}
                          className="w-full text-xs border-b border-slate-400 outline-none bg-transparent py-0.5" />
                      ) : (
                        <span className="text-xs text-slate-600 block">{sRec.현행숙제 || <span className="text-slate-300">입력</span>}</span>
                      )}
                    </td>

                    {/* 현행평가 */}
                    <td className={`border-b border-r border-slate-100 px-3 py-2.5 cursor-text transition ${isFocused(si, 1) ? focusRing : ""}`}
                      onClick={() => { selectCell(si, 1); if (editingEval !== s.id) { setEditingEval(s.id); setEvalValue(sRec.현행평가 || ""); } }}>
                      {editingEval === s.id ? (
                        <input autoFocus value={evalValue} onChange={e => setEvalValue(e.target.value)}
                          onBlur={() => saveEval(s.id, evalValue)}
                          onKeyDown={e => { if (e.key === "Enter") saveEval(s.id, evalValue); if (e.key === "Escape") { setEditingEval(null); refocusContainer(); } }}
                          className="w-full text-xs border-b border-slate-400 outline-none bg-transparent py-0.5" />
                      ) : (
                        <span className="text-xs text-slate-600 block">{sRec.현행평가 || <span className="text-slate-300">입력</span>}</span>
                      )}
                    </td>

                    {/* 행동태그 */}
                    <td className={`border-b border-r border-slate-100 px-3 py-2 cursor-pointer transition ${isFocused(si, 2) ? focusRing : ""}`}
                      onClick={() => { selectCell(si, 2); openTagModal(s.id); }}>
                      {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {tags.map(name => {
                            const t = BEHAVIOR_TAGS.find(b => b.name === name);
                            const neg = t && t.xp < 0;
                            return (
                              <span key={name} className={`text-[10px] px-1.5 py-0.5 rounded-lg border font-medium ${neg ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                                {name}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-300">태그 선택</span>
                      )}
                    </td>

                    <td className="border-b border-r border-slate-100 text-center py-2.5 px-3">
                      {tags.length > 0 ? <span className={`text-sm font-bold ${xp >= 0 ? "text-emerald-600" : "text-red-600"}`}>{xp >= 0 ? "+" : ""}{xp}</span> : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="border-b border-slate-100 text-center py-2.5 px-3">
                      {tags.length > 0 ? <span className="text-sm font-bold text-blue-600">+{cp}</span> : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {tagModal && tagModalStudent && (
        <TagSelectorModal
          studentName={tagModalStudent.name}
          currentTags={(rec[tagModal] || {}).tags || []}
          onToggle={(name) => handleTagToggle(tagModal, name)}
          onClose={closeTagModal}
        />
      )}
    </div>
  );
}

// ── 달력 뷰 ──────────────────────────────────────────────────────────────
function LessonCalendar({ lessons, today, onDayClick, onLessonClick, onAddLesson, onPasteLesson }) {
  const todayDate = new Date(today);
  const [year, setYear] = React.useState(todayDate.getFullYear());
  const [month, setMonth] = React.useState(todayDate.getMonth());
  const [focusedDate, setFocusedDate] = React.useState(today);
  const [calClipboard, setCalClipboard] = React.useState(null); // [{...lesson}]
  const [copyFlash, setCopyFlash] = React.useState(false);
  const containerRef = React.useRef(null);

  const DOW = ["일", "월", "화", "수", "목", "금", "토"];
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const lessonsByDate = {};
  lessons.forEach(l => {
    if (!lessonsByDate[l.date]) lessonsByDate[l.date] = [];
    lessonsByDate[l.date].push(l);
  });

  const shiftDate = (dateStr, n) => {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + n);
    return fmtYMD(d.getFullYear(), d.getMonth(), d.getDate());
  };

  // 포커스 날짜가 현재 표시 월을 벗어나면 월 자동 이동
  React.useEffect(() => {
    const [fy, fm] = focusedDate.split("-").map(Number);
    if (fy !== year || fm !== month + 1) {
      setYear(fy);
      setMonth(fm - 1);
    }
  }, [focusedDate]);

  const prevMonth = () => {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    setYear(newYear); setMonth(newMonth);
    setFocusedDate(fmtYMD(newYear, newMonth, 1));
  };
  const nextMonth = () => {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    setYear(newYear); setMonth(newMonth);
    setFocusedDate(fmtYMD(newYear, newMonth, 1));
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft")  { e.preventDefault(); setFocusedDate(d => shiftDate(d, -1)); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); setFocusedDate(d => shiftDate(d, 1));  return; }
    if (e.key === "ArrowUp")    { e.preventDefault(); setFocusedDate(d => shiftDate(d, -7)); return; }
    if (e.key === "ArrowDown")  { e.preventDefault(); setFocusedDate(d => shiftDate(d, 7));  return; }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const dayLessons = lessonsByDate[focusedDate] || [];
      if (dayLessons.length === 1) onLessonClick(dayLessons[0]);
      else onDayClick(focusedDate);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      e.preventDefault();
      const dayLessons = lessonsByDate[focusedDate] || [];
      if (dayLessons.length > 0) {
        setCalClipboard(dayLessons);
        setCopyFlash(true);
        setTimeout(() => setCopyFlash(false), 900);
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      e.preventDefault();
      if (!calClipboard) return;
      calClipboard.forEach(lesson => onPasteLesson(focusedDate, lesson));
      return;
    }
  };

  const days = getMonthDays(year, month);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold">‹</button>
            <span className="text-lg font-bold min-w-[7rem] text-center">{year}년 {month + 1}월</span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold">›</button>
          </div>
          <div className="flex items-center gap-2">
            {calClipboard && (
              <span className={`text-[11px] px-2 py-1 rounded-lg border transition ${copyFlash ? "bg-blue-100 text-blue-600 border-blue-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                {copyFlash ? "복사됨" : `클립보드: ${calClipboard.length}개 수업`}
              </span>
            )}
            <span className="text-[11px] text-slate-400 hidden sm:block">↑↓←→ 이동 · Enter 열기 · Ctrl+C/V 복붙</span>
            <Btn onClick={() => onAddLesson(focusedDate || today)}>+ 수업 등록</Btn>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="grid grid-cols-7 mb-1">
          {DOW.map((d, i) => (
            <div key={d} className={`text-center text-xs font-bold py-2 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-400"}`}>{d}</div>
          ))}
        </div>
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100 outline-none"
        >
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="bg-white min-h-[90px]" />;
            const dateStr = fmtYMD(year, month, day);
            const dayLessons = lessonsByDate[dateStr] || [];
            const isToday = dateStr === today;
            const isFocused = dateStr === focusedDate;
            const dow = idx % 7;
            return (
              <div key={dateStr}
                className={`bg-white min-h-[90px] p-1.5 cursor-pointer hover:bg-slate-50 transition
                  ${isToday ? "ring-2 ring-inset ring-slate-900" : ""}
                  ${isFocused && !isToday ? "ring-2 ring-inset ring-blue-400 bg-blue-50/40" : ""}
                  ${isFocused && isToday ? "ring-2 ring-inset ring-blue-500" : ""}`}
                onClick={() => { setFocusedDate(dateStr); containerRef.current?.focus(); onDayClick(dateStr); }}>
                <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isFocused && !isToday ? "bg-blue-500 text-white" : isToday ? "bg-slate-900 text-white" : dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-slate-700"}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayLessons.map(l => (
                    <div key={l._key}
                      onClick={e => { e.stopPropagation(); setFocusedDate(dateStr); containerRef.current?.focus(); onLessonClick(l); }}
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
  const [lessons, setLessons] = React.useState([]);
  const [attendance, setAttendance] = React.useState({});
  const [selectedLessonKey, setSelectedLessonKey] = React.useState(null);
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

  const currentLesson = selectedLessonKey ? lessons.find(l => l._key === selectedLessonKey) ?? null : null;

  const handleSaveLesson = async (data) => {
    if (addModal?.lesson) {
      await db.ref(`lessons/${addModal.lesson._key}`).update(data);
    } else {
      const id = "lesson-" + Date.now();
      await db.ref(`lessons/${id}`).set({ ...data, createdAt: today });
    }
  };

  const handlePasteLesson = async (date, lesson) => {
    const { _key, createdAt, date: _d, ...rest } = lesson;
    const id = "lesson-" + Date.now() + "-" + Math.random().toString(36).slice(2, 5);
    await db.ref(`lessons/${id}`).set({ ...rest, date, createdAt: today });
  };

  if (currentLesson) {
    return (
      <>
        <LessonDetailView
          lesson={currentLesson}
          students={students}
          attendance={attendance}
          allAttendance={attendance}
          onBack={() => setSelectedLessonKey(null)}
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

  return (
    <>
      <LessonCalendar
        lessons={lessons} today={today}
        onDayClick={(date) => setAddModal({ date })}
        onLessonClick={(lesson) => setSelectedLessonKey(lesson._key)}
        onAddLesson={(date) => setAddModal({ date })}
        onPasteLesson={handlePasteLesson}
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
