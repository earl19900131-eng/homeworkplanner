// ── 행동태그 달력 모달 ────────────────────────────────────────────────────────
function TagCalendarModal({ students, onClose }) {
  const [lessons, setLessons] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [calMonth, setCalMonth] = useState(() => todayString().slice(0, 7));
  const [tagModal, setTagModal] = useState(null); // { lessonKey, studentId }
  const [tagModalOriginal, setTagModalOriginal] = useState([]);

  useEffect(() => {
    const r1 = db.ref("lessons");
    const r2 = db.ref("lessonAttendance");
    r1.on("value", s => { const d = s.val(); setLessons(d ? Object.entries(d).map(([key, val]) => ({ ...val, _key: key })) : []); });
    r2.on("value", s => setAttendance(s.val() || {}));
    return () => { r1.off(); r2.off(); };
  }, []);

  // 날짜별 lessonKey 맵
  const dateMap = React.useMemo(() => {
    const m = {};
    lessons.forEach(l => {
      if (!l.date) return;
      if (!m[l.date]) m[l.date] = [];
      m[l.date].push(l);
    });
    return m;
  }, [lessons]);

  // 태그 저장 (lessonAttendance + studentProfiles + log)
  const saveTags = async (lessonKey, studentId, tags) => {
    const { xp: newXp, cp: newCp } = calcPoints(tags);
    const oldSnap = await db.ref(`lessonAttendance/${lessonKey}/${studentId}`).get();
    const old = oldSnap.val() || {};
    const xpDelta = newXp - (old.xp || 0);
    const cpDelta = newCp - (old.cp || 0);
    const tagsChanged = JSON.stringify(tags) !== JSON.stringify(old.tags || []);
    await db.ref(`lessonAttendance/${lessonKey}/${studentId}`).update({ tags, xp: newXp, cp: newCp });
    if (tagsChanged && (xpDelta !== 0 || cpDelta !== 0)) {
      const profileSnap = await db.ref(`studentProfiles/${studentId}`).get();
      const profile = profileSnap.val() || {};
      const newTotalXp = Number(profile.season3Xp || 0) + xpDelta;
      const newTotalCp = Math.max(0, Number(profile.unpaidCp || 0) + cpDelta);
      const updates = {};
      if (xpDelta !== 0) updates[`studentProfiles/${studentId}/season3Xp`] = newTotalXp;
      if (cpDelta !== 0) updates[`studentProfiles/${studentId}/unpaidCp`] = newTotalCp;
      const logId = Date.now().toString();
      const lesson = lessons.find(l => l._key === lessonKey);
      updates[`studentLogs/${studentId}/${logId}`] = {
        id: logId, type: "tags", date: lesson?.date || selectedDate,
        tags, xpDelta, cpDelta, totalXp: newTotalXp, totalCp: newTotalCp, createdAt: Date.now(),
      };
      await db.ref().update(updates);
    }
    setTagModal(null);
  };

  // 달력 그리드
  const renderCalendar = () => {
    const [y, m] = calMonth.split("-").map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay(); // 0=일
    const daysInMonth = new Date(y, m, 0).getDate();
    const today = todayString();
    const cells = [];
    const startOffset = firstDay; // 일요일 시작
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => {
            const [y2, m2] = calMonth.split("-").map(Number);
            const prev = m2 === 1 ? `${y2-1}-12` : `${y2}-${String(m2-1).padStart(2,"0")}`;
            setCalMonth(prev);
          }} className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold">‹</button>
          <span className="font-bold text-base">{y}년 {m}월</span>
          <button onClick={() => {
            const [y2, m2] = calMonth.split("-").map(Number);
            const next = m2 === 12 ? `${y2+1}-01` : `${y2}-${String(m2+1).padStart(2,"0")}`;
            setCalMonth(next);
          }} className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {["일","월","화","수","목","금","토"].map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1">{d}</div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`}/>;
            const dateStr = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const hasLesson = !!dateMap[dateStr];
            const isToday = dateStr === today;
            const isSel = dateStr === selectedDate;
            return (
              <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
                className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition
                  ${isSel ? "bg-slate-900 text-white" : isToday ? "bg-blue-50 text-blue-700 font-bold" : hasLesson ? "hover:bg-slate-100 text-slate-700" : "text-slate-300 cursor-default"}`}
                disabled={!hasLesson}>
                {d}
                {hasLesson && <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSel ? "bg-white" : "bg-blue-400"}`}/>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // 날짜 상세 - 학생 태그 표
  const renderDayView = () => {
    const dayLessons = dateMap[selectedDate] || [];
    const rows = [];
    dayLessons.forEach(lesson => {
      const lAtt = attendance[lesson._key] || {};
      (lesson.studentIds || []).forEach(sid => {
        const student = students.find(s => s.id === sid);
        if (!student) return;
        const rec = lAtt[sid] || {};
        rows.push({ lessonKey: lesson._key, lesson, student, rec });
      });
    });
    rows.sort((a, b) => a.student.className.localeCompare(b.student.className) || a.student.name.localeCompare(b.student.name));

    const tagModalRec = tagModal ? (attendance[tagModal.lessonKey]?.[tagModal.studentId] || {}) : null;
    const tagModalStudent = tagModal ? students.find(s => s.id === tagModal.studentId) : null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedDate(null)}
            className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold text-lg">‹</button>
          <span className="font-bold">{selectedDate}</span>
          <span className="text-sm text-slate-400">· {rows.length}명</span>
        </div>
        {rows.length === 0
          ? <div className="text-center text-sm text-slate-400 py-8">기록 없음</div>
          : <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="text-sm border-collapse w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-left text-xs font-bold text-slate-500 border-b border-r border-slate-200 min-w-[130px]">학생</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 border-b border-r border-slate-200 min-w-[200px]">행동태그</th>
                    <th className="px-4 py-2.5 text-center text-xs font-bold text-emerald-600 border-b border-r border-slate-200 w-20">XP</th>
                    <th className="px-4 py-2.5 text-center text-xs font-bold text-blue-600 border-b border-slate-200 w-20">CP</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ lessonKey, student, rec }, ri) => {
                    const tags = rec.tags || [];
                    const { xp, cp } = calcPoints(tags);
                    return (
                      <tr key={`${lessonKey}-${student.id}`} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                        <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 border-b border-r border-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">{student.name[0]}</div>
                            <div>
                              <div className="font-semibold text-sm">{student.name}</div>
                              <div className="text-[10px] text-slate-400">{student.className}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 border-b border-r border-slate-100 cursor-pointer hover:bg-blue-50/50 transition"
                          onClick={() => { setTagModalOriginal([...tags]); setTagModal({ lessonKey, studentId: student.id }); }}>
                          {tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {tags.map(name => {
                                const t = BEHAVIOR_TAGS.find(b => b.name === name);
                                const neg = t && t.xp < 0;
                                return <span key={name} className={`text-[10px] px-1.5 py-0.5 rounded-lg border font-medium ${neg ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{name}</span>;
                              })}
                            </div>
                          ) : <span className="text-xs text-slate-300">클릭하여 태그 추가</span>}
                        </td>
                        <td className="px-4 py-2.5 border-b border-r border-slate-100 text-center">
                          {tags.length > 0 && <span className={`text-xs font-bold ${xp >= 0 ? "text-emerald-600" : "text-red-500"}`}>{xp >= 0 ? "+" : ""}{xp}</span>}
                        </td>
                        <td className="px-4 py-2.5 border-b border-slate-100 text-center">
                          {cp > 0 && <span className="text-xs font-bold text-blue-600">+{cp}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }

        {tagModal && tagModalStudent && (
          <TagSelectorModal
            studentName={tagModalStudent.name}
            currentTags={tagModalRec?.tags || []}
            onToggle={tag => {
              const cur = [...(tagModalRec?.tags || [])];
              const idx = cur.indexOf(tag);
              const next = idx >= 0 ? cur.filter(t => t !== tag) : [...cur, tag];
              saveTags(tagModal.lessonKey, tagModal.studentId, next);
            }}
            onClose={() => {
              const cur = tagModalRec?.tags || [];
              if (JSON.stringify(cur) !== JSON.stringify(tagModalOriginal)) {
                // already saved on each toggle
              }
              setTagModal(null);
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold">📅 행동태그 달력</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {selectedDate ? renderDayView() : renderCalendar()}
        </div>
      </div>
    </div>
  );
}

// ── 학생 관리 탭 (선생님용) ────────────────────────────────────────────────────
function StudentManager({ students, homeworks }) {
  const [newName, setNewName] = useState("");
  const [newBirthYear, setNewBirthYear] = useState("");
  const [newSchool, setNewSchool] = useState("");
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingCell, setEditingCell] = useState(null); // { studentId, field }
  const [editValue, setEditValue] = useState("");
  const [expandedEdit, setExpandedEdit] = useState(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkErr, setBulkErr] = useState("");
  const [bulkTab, setBulkTab] = useState("single");
  const [profiles, setProfiles] = useState({});
  const [assessments, setAssessments] = useState([]);
  const [focusedRow, setFocusedRow] = useState(0);
  const [subTab, setSubTab] = useState("students");
  const tableRef = React.useRef(null); // kept for potential future use
  const composingRef = React.useRef(false);

  useEffect(() => {
    const ref = db.ref("studentProfiles");
    ref.on("value", snap => setProfiles(snap.val() || {}));
    return () => ref.off();
  }, []);

  useEffect(() => {
    const ref = db.ref("assessments");
    ref.on("value", snap => {
      const data = snap.val();
      setAssessments(data ? Object.values(data).sort((a,b) => (a.name||"").localeCompare(b.name||"")) : []);
    });
    return () => ref.off();
  }, []);

  useEffect(() => { tableRef.current?.focus(); }, []);

  const newAutoGrade = gradeFromBirthYear(newBirthYear);

  const addStudent = async () => {
    if (!newName.trim()) { setErr("이름을 입력해 주세요."); return; }
    if (!newPin.trim() || newPin.length < 4) { setErr("PIN은 4자리 이상 입력해 주세요."); return; }
    const className = newAutoGrade || "미정";
    if (students.some(s => s.name === newName.trim() && s.className === className)) { setErr("같은 이름+학년 학생이 이미 있습니다."); return; }
    setSaving(true);
    const id = "student-" + genId();
    try {
      await db.ref(`students/${id}`).set({ id, name: newName.trim(), className, pin: newPin.trim(), role: "student", createdAt: todayString() });
      await db.ref(`studentProfiles/${id}`).set({ school: newSchool.trim(), birthYear: newBirthYear, grades: {}, locked: false });
      setNewName(""); setNewBirthYear(""); setNewSchool(""); setNewPin(""); setErr("");
    } catch(e) { setErr("저장 실패: " + e.message); }
    setSaving(false);
  };

  const parseBulk = (text) => {
    setBulkErr("");
    const lines = text.trim().split(/\n|\r\n/).filter(l => l.trim());
    const parsed = [];
    const errs = [];
    lines.forEach((line, i) => {
      const cols = line.includes("\t") ? line.split("\t") : line.split(",");
      const name = (cols[0]||"").trim();
      const birthYear = (cols[1]||"").trim();
      const school = (cols[2]||"").trim();
      const pin = (cols[3]||"").trim() || name.slice(0,4).padEnd(4,"0");
      if (!name) { errs.push(`${i+1}행: 이름 없음`); return; }
      const className = gradeFromBirthYear(birthYear) || "미정";
      parsed.push({ name, birthYear, school, pin, className });
    });
    if (errs.length) setBulkErr(errs.join(" / "));
    setBulkPreview(parsed);
  };

  const handleBulkImport = async () => {
    if (!bulkPreview.length) return;
    setSaving(true);
    let added = 0, skipped = 0;
    for (const row of bulkPreview) {
      if (students.some(s => s.name===row.name && s.className===row.className)) { skipped++; continue; }
      const id = "student-" + genId();
      try {
        await db.ref(`students/${id}`).set({ id, name:row.name, className:row.className, pin:row.pin, role:"student", createdAt:todayString() });
        await db.ref(`studentProfiles/${id}`).set({ school:row.school, birthYear:row.birthYear, grades:{}, locked:false });
        added++;
      } catch(e) {}
    }
    setSaving(false);
    setBulkText(""); setBulkPreview([]); setBulkErr("");
    alert(`완료! ${added}명 추가, ${skipped}명 중복 건너뜀`);
  };

  const deleteStudent = async (studentId) => {
    setSaving(true);
    try {
      await db.ref(`students/${studentId}`).remove();
      await db.ref(`studentProfiles/${studentId}`).remove();
      const toDelete = homeworks.filter(hw => hw.studentId === studentId);
      await Promise.all(toDelete.map(hw => db.ref(`homeworks/${hw._key}`).remove()));
      setDeleteConfirm(null);
    } catch(e) { alert("삭제 실패: " + e.message); }
    setSaving(false);
  };

  const startEdit = (studentId, field, currentVal) => {
    setEditingCell({ studentId, field });
    setEditValue(String(currentVal || ""));
  };

  const saveCell = async (studentId, field, val) => {
    setEditingCell(null);
    try {
      if (field === "name") {
        if (!val.trim()) return;
        await db.ref(`students/${studentId}/name`).set(val.trim());
      } else if (field === "className") {
        await db.ref(`students/${studentId}/className`).set(val.trim() || "미정");
      } else if (field === "school") {
        await db.ref(`studentProfiles/${studentId}/school`).set(val.trim());
      } else if (field === "birthYear") {
        await db.ref(`studentProfiles/${studentId}/birthYear`).set(val);
        await db.ref(`students/${studentId}/className`).set(gradeFromBirthYear(val) || "미정");
      } else if (field === "pin") {
        if (!val || val.length < 4) { alert("PIN은 4자리 이상이어야 합니다."); return; }
        await db.ref(`students/${studentId}/pin`).set(val);
      } else if (field === "problemCoeff" || field === "lectureCoeff") {
        const num = parseFloat(val);
        if (isNaN(num)) { alert("숫자를 입력해 주세요."); return; }
        await db.ref(`studentProfiles/${studentId}/${field}`).set(num);
      }
    } catch(e) { alert("저장 실패: " + e.message); }
  };

  const saveXpField = async (studentId, field, val) => {
    setEditingCell(null);
    try { await db.ref(`studentProfiles/${studentId}/${field}`).set(val === "" ? null : isNaN(Number(val)) ? val : Number(val)); }
    catch(e) { alert("저장 실패: " + e.message); }
  };

  const toggleProfileLock = async (studentId, currentLocked) => {
    try { await db.ref(`studentProfiles/${studentId}/locked`).set(!currentLocked); }
    catch(e) { alert("저장 실패: " + e.message); }
  };

  const updateCurrentAssessment = async (studentId, assessmentId) => {
    try { await db.ref(`studentProfiles/${studentId}/currentAssessment`).set(assessmentId || null); }
    catch(e) { alert("저장 실패: " + e.message); }
  };

  const updateAdvanceAssessment = async (studentId, assessmentId) => {
    try { await db.ref(`studentProfiles/${studentId}/advanceAssessment`).set(assessmentId || null); }
    catch(e) { alert("저장 실패: " + e.message); }
  };

  const classes = [...new Set(students.map(s => s.className))].sort();
  const schools = [...new Set(Object.values(profiles).map(p => p.school).filter(Boolean))].sort();

  const [filterClass, setFilterClass] = useState("");
  const [filterSchool, setFilterSchool] = useState("");

  const sortedStudents = [...students]
    .filter(s => !filterClass || s.className === filterClass)
    .filter(s => !filterSchool || (profiles[s.id]?.school || "") === filterSchool)
    .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));

  const handleTableKeyDown = (e) => {
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocusedRow(r => Math.max(r - 1, 0)); }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedRow(r => Math.min(r + 1, sortedStudents.length - 1)); }
  };

  // ── 경험치관리 탭 ────────────────────────────────────────────────────────
  const XpTab = () => {
    const [showTagCalendar, setShowTagCalendar] = useState(false);
    const ec = editingCell;
    const isEdit = (sid, field) => ec?.studentId === sid && ec?.field === field;

    const XpCell = ({ studentId, field, value, inputCls="w-20" }) => (
      isEdit(studentId, field) ? (
        <input autoFocus value={editValue} onChange={e=>setEditValue(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); saveXpField(studentId,field,editValue); } if(e.key==="Escape") setEditingCell(null); }}
          onBlur={()=>saveXpField(studentId,field,editValue)}
          className={`border-b-2 border-blue-400 bg-transparent outline-none text-sm px-0.5 ${inputCls}`}/>
      ) : (
        <div onClick={()=>startEdit(studentId,field,value)}
          className="cursor-text hover:bg-blue-50 rounded px-1 -mx-1 min-h-[20px]">
          {value != null && value !== "" ? value : <span className="text-slate-300">-</span>}
        </div>
      )
    );

    return (
      <React.Fragment>
      <Card className="p-0 overflow-hidden">
        <div className="p-4 flex items-center gap-3 flex-wrap border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold">경험치 관리</h2>
            <p className="text-sm text-slate-500">{sortedStudents.length === students.length ? `총 ${students.length}명` : `${sortedStudents.length}명 (전체 ${students.length}명)`}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowTagCalendar(true)}
              className="text-xs text-white bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-lg font-medium transition">
              📅 행동태그달력
            </button>
            <select value={filterClass} onChange={e=>setFilterClass(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:ring-1 focus:ring-blue-300">
              <option value="">전체 학년</option>
              {classes.map(c=><option key={c} value={c}>{c} ({students.filter(s=>s.className===c).length}명)</option>)}
            </select>
            <select value={filterSchool} onChange={e=>setFilterSchool(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:ring-1 focus:ring-blue-300">
              <option value="">전체 학교</option>
              {schools.map(sc=><option key={sc} value={sc}>{sc}</option>)}
            </select>
            {(filterClass || filterSchool) && (
              <button onClick={()=>{ setFilterClass(""); setFilterSchool(""); }}
                className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
                초기화
              </button>
            )}
            <button onClick={() => {
              const rows = sortedStudents
                .map(st => {
                  const p = profiles[st.id] || {};
                  const cp = Number(p.unpaidCp || 0);
                  if (!cp && !p.cardNumber) return null;
                  const s3 = Number(p.season3Xp || 0);
                  const rate = s3 >= 600 ? 11 : s3 >= 350 ? 10 : s3 >= 200 ? 9 : s3 >= -50 ? 8 : s3 >= -200 ? 7 : 6;
                  return `="${p.cardNumber || ""}",${cp * rate}`;
                })
                .filter(Boolean);
              const csv = "카드번호,지급액\n" + rows.join("\n");
              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "지급액.csv"; a.click();
              URL.revokeObjectURL(url);
            }}
              className="text-xs text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg font-medium transition">
              📥 지급액 다운로드
            </button>
            <button onClick={async () => {
              if (!confirm(`모든 학생의 시즌3 XP, 미지급 CP, 이전시즌 XP를 0으로 초기화합니다. 계속할까요?`)) return;
              const snap = await db.ref("studentProfiles").get();
              const data = snap.val() || {};
              const updates = {};
              Object.keys(data).forEach(sid => {
                updates[`studentProfiles/${sid}/season3Xp`] = null;
                updates[`studentProfiles/${sid}/unpaidCp`] = null;
                updates[`studentProfiles/${sid}/prevSeasonXp`] = null;
              });
              await db.ref().update(updates);
              alert("초기화 완료!");
            }}
              className="text-xs text-white bg-slate-500 hover:bg-slate-600 px-3 py-1.5 rounded-lg font-medium transition">
              🗑 XP/CP 전체 초기화
            </button>
            <button onClick={async () => {
              if (!confirm(`수업일지 전체 데이터를 읽어 XP/CP를 재계산합니다. 기존 수동 입력값은 덮어씁니다. 계속할까요?`)) return;
              const snap = await db.ref("lessonAttendance").get();
              const allAttendance = snap.val() || {};
              const totals = {};
              Object.values(allAttendance).forEach(lesson => {
                Object.entries(lesson).forEach(([sid, rec]) => {
                  if (!totals[sid]) totals[sid] = { xp: 0, cp: 0 };
                  totals[sid].xp += Number(rec.xp || 0);
                  totals[sid].cp += Number(rec.cp || 0);
                });
              });
              const updates = {};
              Object.entries(totals).forEach(([sid, t]) => {
                updates[`studentProfiles/${sid}/season3Xp`] = t.xp;
                updates[`studentProfiles/${sid}/unpaidCp`] = Math.max(0, t.cp);
              });
              await db.ref().update(updates);
              alert("동기화 완료!");
            }}
              className="text-xs text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg font-medium transition">
              🔄 XP/CP 전체 동기화
            </button>
            <button onClick={async () => {
              if (!confirm(`미지급 CP를 전체 초기화할까요? (${sortedStudents.length}명)`)) return;
              const updates = {};
              sortedStudents.forEach(st => { updates[`studentProfiles/${st.id}/unpaidCp`] = null; });
              await db.ref().update(updates);
            }}
              className="text-xs text-white bg-red-400 hover:bg-red-500 px-3 py-1.5 rounded-lg font-medium transition">
              🗑 미지급 CP 초기화
            </button>
          </div>
        </div>
        {students.length === 0
          ? <div className="p-8 text-center text-sm text-slate-400 border border-dashed m-4 rounded-2xl">아직 등록된 학생이 없습니다.</div>
          : <div className="overflow-x-auto">
              <table className="text-sm border-collapse w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-8">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">이름</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">학년</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">학교</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">티어</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">레벨</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">이전 시즌 누적 XP</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">시즌3 누적 XP</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-emerald-600">All 시즌 누적 XP</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">미지급 CP</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">카드번호</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">미지급액</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((s, rowIdx) => {
                    const profile = profiles[s.id] || {};
                    return (
                      <tr key={s.id} className={`${rowIdx === focusedRow ? "bg-blue-50/40" : rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-blue-50/20 transition-colors`}
                        onClick={()=>setFocusedRow(rowIdx)}>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{rowIdx+1}</td>
                        <td className="px-4 py-2.5 font-medium text-sm">{s.name}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{s.className}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{profile.school || <span className="text-slate-300">-</span>}</td>
                        <td className="px-3 py-2 text-xs font-bold">
                          {(xp => {
                            if (xp >= 600)  return <span className="text-purple-600">마스터</span>;
                            if (xp >= 350)  return <span className="text-cyan-500">다이아</span>;
                            if (xp >= 200)  return <span className="text-teal-500">플래티넘</span>;
                            if (xp >= -50)  return <span className="text-yellow-500">골드</span>;
                            if (xp >= -200) return <span className="text-slate-400">실버</span>;
                            return <span className="text-orange-400">브론즈</span>;
                          })(Number(profile.season3Xp||0))}
                        </td>
                        <td className="px-3 py-2 text-xs font-bold text-blue-600">
                          {Math.floor(1.25 * Math.sqrt(Math.max(Number(profile.prevSeasonXp||0) + Number(profile.season3Xp||0), 0)))}
                        </td>
                        <td className="px-3 py-2 text-xs"><XpCell studentId={s.id} field="prevSeasonXp" value={profile.prevSeasonXp} inputCls="w-20"/></td>
                        <td className="px-3 py-2 text-xs"><XpCell studentId={s.id} field="season3Xp" value={profile.season3Xp} inputCls="w-20"/></td>
                        <td className="px-3 py-2 text-xs font-bold text-emerald-600">
                          {(Number(profile.prevSeasonXp||0) + Number(profile.season3Xp||0)) || <span className="text-slate-300 font-normal">-</span>}
                        </td>
                        <td className="px-3 py-2 text-xs"><XpCell studentId={s.id} field="unpaidCp" value={profile.unpaidCp} inputCls="w-20"/></td>
                        <td className="px-3 py-2 text-xs"><XpCell studentId={s.id} field="cardNumber" value={profile.cardNumber} inputCls="w-28"/></td>
                        <td className="px-3 py-2 text-xs font-bold text-slate-700">
                          {(() => {
                            const cp = Number(profile.unpaidCp || 0);
                            if (!cp) return <span className="text-slate-300 font-normal">-</span>;
                            const s3 = Number(profile.season3Xp || 0);
                            const rate = s3 >= 600 ? 11 : s3 >= 350 ? 10 : s3 >= 200 ? 9 : s3 >= -50 ? 8 : s3 >= -200 ? 7 : 6;
                            return (cp * rate).toLocaleString() + "원";
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </Card>
      {showTagCalendar && <TagCalendarModal students={students} onClose={() => setShowTagCalendar(false)}/>}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
      {/* 하위 탭 */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        {[["students","👤 학생목록"],["grades","📊 성적관리"],["xp","⭐ 경험치관리"]].map(([t,l])=>(
          <button key={t} type="button" onClick={()=>setSubTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition ${subTab===t?"bg-white shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {subTab === "xp" && <XpTab/>}
      {subTab === "grades" && (
        <Card className="p-8 text-center text-sm text-slate-400">성적관리 준비 중</Card>
      )}
      {subTab === "students" && <>
      {/* 학생 추가 */}
      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-bold">학생 추가</h2>
        <div className="flex gap-2 bg-slate-100 rounded-2xl p-1">
          {[["single","한 명씩"],["bulk","엑셀 일괄 등록"]].map(([t,l])=>(
            <button key={t} type="button" onClick={()=>setBulkTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition ${bulkTab===t?"bg-white shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
              {l}
            </button>
          ))}
        </div>

        {bulkTab==="single" ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5"><Lbl>이름</Lbl><Inp value={newName} onChange={e=>setNewName(e.target.value)} placeholder="홍길동" onKeyDown={e=>e.key==="Enter"&&addStudent()}/></div>
              <div className="space-y-1.5">
                <Lbl>출생연도</Lbl>
                <div className="flex gap-2 items-center">
                  <Inp type="number" value={newBirthYear} onChange={e=>setNewBirthYear(e.target.value)} placeholder="예: 2010"/>
                  {newAutoGrade && <span className="text-xs font-bold text-slate-600 whitespace-nowrap bg-slate-100 rounded-lg px-2 py-1">{newAutoGrade}</span>}
                </div>
              </div>
              <div className="space-y-1.5"><Lbl>학교</Lbl><Inp value={newSchool} onChange={e=>setNewSchool(e.target.value)} placeholder="○○중학교"/></div>
              <div className="space-y-1.5"><Lbl>PIN</Lbl><Inp value={newPin} onChange={e=>setNewPin(e.target.value)} placeholder="4자리 이상" onKeyDown={e=>e.key==="Enter"&&addStudent()}/></div>
            </div>
            {err && <AlertBox className="bg-red-50 text-red-700">{err}</AlertBox>}
            <Btn onClick={addStudent} disabled={saving}>{saving?"저장 중...":"➕ 학생 추가"}</Btn>
          </div>
        ) : (
          <div className="space-y-3">
            <AlertBox className="bg-blue-50 text-blue-700">
              <div className="font-semibold mb-1">📋 엑셀에서 복사 후 아래에 붙여넣기</div>
              <div>컬럼 순서: <b>이름 | 출생연도 | 학교 | PIN</b></div>
              <div className="mt-1 text-xs opacity-80">출생연도에서 학년 자동 계산 · PIN 없으면 이름 앞 4글자로 자동 설정</div>
            </AlertBox>
            <textarea
              value={bulkText}
              onChange={e=>{ setBulkText(e.target.value); parseBulk(e.target.value); }}
              placeholder={"홍길동\t2010\t○○고등학교\t1234\n김민준\t2011\t△△중학교\t5678"}
              rows={6}
              className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 font-mono resize-none"
            />
            {bulkErr && <AlertBox className="bg-red-50 text-red-700 text-xs">{bulkErr}</AlertBox>}
            {bulkPreview.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-600">미리보기 ({bulkPreview.length}명)</div>
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-2xl border p-3 bg-slate-50">
                  {bulkPreview.map((row, i) => {
                    const isDup = students.some(s=>s.name===row.name&&s.className===row.className);
                    return (
                      <div key={i} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm ${isDup?"bg-amber-50 text-amber-700":"bg-white"}`}>
                        <span className="font-medium w-16 shrink-0">{row.name}</span>
                        <Badge variant="secondary">{row.className}</Badge>
                        <span className="text-slate-400 text-xs flex-1">{row.school || "-"}</span>
                        <span className="text-slate-400 text-xs">PIN: {row.pin}</span>
                        {isDup && <span className="text-xs text-amber-600">중복</span>}
                      </div>
                    );
                  })}
                </div>
                <Btn onClick={handleBulkImport} disabled={saving} className="w-full">
                  {saving ? "등록 중..." : `✅ ${bulkPreview.filter(r=>!students.some(s=>s.name===r.name&&s.className===r.className)).length}명 일괄 등록`}
                </Btn>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 학생 목록 */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 flex items-center gap-3 flex-wrap border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold">학생 목록</h2>
            <p className="text-sm text-slate-500">{sortedStudents.length === students.length ? `총 ${students.length}명` : `${sortedStudents.length}명 (전체 ${students.length}명)`}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={async () => {
              if (!confirm(`필터된 ${sortedStudents.length}명을 전체 확정할까요?`)) return;
              const updates = {};
              sortedStudents.forEach(st => { updates[`studentProfiles/${st.id}/locked`] = true; });
              await db.ref().update(updates);
            }} className="text-xs text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg font-medium transition">
              🔒 전체 확정
            </button>
            <button onClick={async () => {
              if (!confirm(`필터된 ${sortedStudents.length}명을 전체 미확정으로 변경할까요?`)) return;
              const updates = {};
              sortedStudents.forEach(st => { updates[`studentProfiles/${st.id}/locked`] = false; });
              await db.ref().update(updates);
            }} className="text-xs text-slate-600 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg font-medium border border-slate-200 transition">
              🔓 전체 미확정
            </button>
            <select value={filterClass} onChange={e=>setFilterClass(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:ring-1 focus:ring-blue-300">
              <option value="">전체 학년</option>
              {classes.map(c=><option key={c} value={c}>{c} ({students.filter(s=>s.className===c).length}명)</option>)}
            </select>
            <select value={filterSchool} onChange={e=>setFilterSchool(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:ring-1 focus:ring-blue-300">
              <option value="">전체 학교</option>
              {schools.map(sc=><option key={sc} value={sc}>{sc}</option>)}
            </select>
            {(filterClass || filterSchool) && (
              <button onClick={()=>{ setFilterClass(""); setFilterSchool(""); }}
                className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
                초기화
              </button>
            )}
          </div>
        </div>

        {students.length === 0
          ? <div className="p-8 text-center text-sm text-slate-400 border border-dashed m-4 rounded-2xl">아직 등록된 학생이 없습니다.</div>
          : <div className="overflow-x-auto">
              <table className="text-sm border-collapse w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-8">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">이름</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">학년</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">학교</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">출생연도</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">PIN</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">숙제</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-indigo-500">문제계수</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-indigo-500">강의계수</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">현행평가</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">선행평가</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">상태</th>
                    <th className="px-4 py-2.5 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((s, rowIdx) => {
                    const hwCount = homeworks.filter(hw => hw.studentId === s.id).length;
                    const profile = profiles[s.id];
                    const isLocked = profile?.locked;
                    const hasProfile = profile && (profile.school || profile.birthYear || Object.values(profile.grades||{}).some(v=>v!==""));
                    const isConfirming = deleteConfirm === s.id;
                    const isExpanded = expandedEdit === s.id;
                    const ec = editingCell;
                    const isEdit = (field) => ec?.studentId === s.id && ec?.field === field;

                    const EditCell = ({ field, value, className: cls="", inputCls="w-24", children }) => (
                      isEdit(field) ? (
                        <input autoFocus defaultValue={editValue}
                          onCompositionStart={()=>{ composingRef.current = true; }}
                          onCompositionEnd={()=>{ composingRef.current = false; }}
                          onKeyDown={e=>{ if(e.key==="Enter" && !composingRef.current){ e.preventDefault(); saveCell(s.id,field,e.target.value); } if(e.key==="Escape") setEditingCell(null); }}
                          onBlur={e=>{ if(!composingRef.current) saveCell(s.id,field,e.target.value); }}
                          className={`border-b-2 border-blue-400 bg-transparent outline-none text-sm px-0.5 ${inputCls}`}/>
                      ) : (
                        <div onClick={()=>startEdit(s.id,field,value)}
                          className={`cursor-text hover:bg-blue-50 rounded px-1 -mx-1 min-h-[20px] ${cls}`}>
                          {children || <span className="text-slate-300">-</span>}
                        </div>
                      )
                    );

                    return (
                      <React.Fragment key={s.id}>
                        <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                          <td className="px-4 py-2.5 text-xs text-slate-400">{rowIdx + 1}</td>
                          <td className="px-4 py-2">
                            <EditCell field="name" value={s.name} inputCls="w-28 font-semibold">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">{s.name[0]}</div>
                                <span className="font-semibold">{s.name}</span>
                              </div>
                            </EditCell>
                          </td>
                          <td className="px-4 py-2">
                            <EditCell field="className" value={s.className} inputCls="w-20">
                              <Badge variant="secondary">{s.className}</Badge>
                            </EditCell>
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500">
                            <EditCell field="school" value={profile?.school||""} inputCls="w-28">
                              {profile?.school || <span className="text-slate-300">-</span>}
                            </EditCell>
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500">
                            <select value={profile?.birthYear||""} onChange={e=>saveCell(s.id,"birthYear",e.target.value)}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-blue-300">
                              <option value="">-</option>
                              {Array.from({length:16},(_,i)=>2003+i).map(y=><option key={y} value={y}>{y}년</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <EditCell field="pin" value={s.pin} cls="font-mono" inputCls="w-20 font-mono">
                              <span className="font-mono text-xs text-slate-500">{s.pin}</span>
                            </EditCell>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">{hwCount}</td>
                          <td className="px-3 py-2 text-xs">
                            <EditCell field="problemCoeff" value={profile?.problemCoeff ?? ""} inputCls="w-14">
                              <span className="font-mono">{profile?.problemCoeff != null ? Number(profile.problemCoeff).toFixed(1) : <span className="text-slate-400">1.0</span>}</span>
                            </EditCell>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <EditCell field="lectureCoeff" value={profile?.lectureCoeff ?? ""} inputCls="w-14">
                              <span className="font-mono">{profile?.lectureCoeff != null ? Number(profile.lectureCoeff).toFixed(1) : <span className="text-slate-400">1.0</span>}</span>
                            </EditCell>
                          </td>
                          <td className="px-3 py-2">
                            <select value={profile?.currentAssessment || ""} onChange={e=>updateCurrentAssessment(s.id,e.target.value)}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-blue-300 max-w-[160px]">
                              <option value="">-</option>
                              {assessments.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select value={profile?.advanceAssessment || ""} onChange={e=>updateAdvanceAssessment(s.id,e.target.value)}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-violet-300 max-w-[160px]">
                              <option value="">-</option>
                              {assessments.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            {isLocked
                              ? <span className="text-xs text-emerald-600 font-medium">🔒 확정</span>
                              : hasProfile
                                ? <span className="text-xs text-amber-600 font-medium">📝 미확정</span>
                                : <span className="text-xs text-slate-300">-</span>}
                          </td>
                          <td className="px-3 py-2">
                            {isConfirming ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-red-500">삭제?</span>
                                <button onClick={()=>deleteStudent(s.id)} disabled={saving} className="text-xs text-red-600 font-semibold hover:text-red-800">확인</button>
                                <button onClick={()=>setDeleteConfirm(null)} className="text-xs text-slate-400 hover:text-slate-600">취소</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {hasProfile && (
                                  <button onClick={()=>toggleProfileLock(s.id,isLocked)}
                                    className="text-slate-400 hover:text-emerald-600" title={isLocked?"확정 해제":"프로필 확정"}>
                                    {isLocked ? "🔓" : "🔒"}
                                  </button>
                                )}
                                <button onClick={()=>setDeleteConfirm(s.id)} title="삭제"
                                  className="text-slate-300 hover:text-red-500 transition">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                                  </svg>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={12} className="px-4 pb-4 pt-2 border-b bg-slate-50/80">
                              <StudentProfileTab studentId={s.id} studentName={s.name} teacherMode={true}/>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </Card>
      </>}
    </div>
  );
}
