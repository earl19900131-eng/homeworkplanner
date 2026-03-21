// ── 학생 관리 탭 (선생님용) ────────────────────────────────────────────────────
function StudentManager({ students, homeworks }) {
  const [newName, setNewName] = useState("");
  const [newBirthYear, setNewBirthYear] = useState("");
  const [newSchool, setNewSchool] = useState("");
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editPin, setEditPin] = useState({});
  const [expandedEdit, setExpandedEdit] = useState(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkErr, setBulkErr] = useState("");
  const [bulkTab, setBulkTab] = useState("single");
  const [profiles, setProfiles] = useState({});
  const [focusedRow, setFocusedRow] = useState(0);
  const tableRef = React.useRef(null);

  useEffect(() => {
    const ref = db.ref("studentProfiles");
    ref.on("value", snap => setProfiles(snap.val() || {}));
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

  const updatePin = async (studentId, newPinVal) => {
    if (!newPinVal || newPinVal.length < 4) { alert("PIN은 4자리 이상이어야 합니다."); return; }
    try {
      await db.ref(`students/${studentId}/pin`).set(newPinVal);
      setEditPin(prev => { const n={...prev}; delete n[studentId]; return n; });
    } catch(e) { alert("저장 실패: " + e.message); }
  };

  const toggleProfileLock = async (studentId, currentLocked) => {
    try { await db.ref(`studentProfiles/${studentId}/locked`).set(!currentLocked); }
    catch(e) { alert("저장 실패: " + e.message); }
  };

  const classes = [...new Set(students.map(s => s.className))].sort();
  const sortedStudents = [...students].sort((a, b) =>
    a.className.localeCompare(b.className) || a.name.localeCompare(b.name));

  const handleTableKeyDown = (e) => {
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocusedRow(r => Math.max(r - 1, 0)); }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedRow(r => Math.min(r + 1, sortedStudents.length - 1)); }
  };

  return (
    <div className="space-y-6">
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
        <div className="p-5 flex items-center justify-between flex-wrap gap-2 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold">학생 목록</h2>
            <p className="text-sm text-slate-500">총 {students.length}명 등록됨</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {classes.map(c=><Badge key={c} variant="secondary">{c} {students.filter(s=>s.className===c).length}명</Badge>)}
          </div>
        </div>

        {students.length === 0
          ? <div className="p-8 text-center text-sm text-slate-400 border border-dashed m-4 rounded-2xl">아직 등록된 학생이 없습니다.</div>
          : <div ref={tableRef} tabIndex={0} onKeyDown={handleTableKeyDown} className="outline-none overflow-x-auto">
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
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((s, rowIdx) => {
                    const hwCount = homeworks.filter(hw => hw.studentId === s.id).length;
                    const profile = profiles[s.id];
                    const isLocked = profile?.locked;
                    const hasProfile = profile && (profile.school || profile.birthYear || Object.values(profile.grades||{}).some(v=>v!==""));
                    const isFocused = focusedRow === rowIdx;
                    const isConfirming = deleteConfirm === s.id;
                    const isEditingPin = editPin[s.id] !== undefined;
                    const isExpanded = expandedEdit === s.id;
                    return (
                      <React.Fragment key={s.id}>
                        <tr
                          onClick={() => { setFocusedRow(rowIdx); tableRef.current?.focus(); }}
                          className={`border-b border-slate-50 cursor-pointer transition ${isFocused ? "bg-blue-50" : "hover:bg-slate-50"}`}
                        >
                          <td className={`px-4 py-2.5 text-xs text-slate-400 ${isFocused ? "border-l-2 border-blue-500" : ""}`}>{rowIdx + 1}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">{s.name[0]}</div>
                              <span className="font-semibold">{s.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5"><Badge variant="secondary">{s.className}</Badge></td>
                          <td className="px-4 py-2.5 text-slate-500">{profile?.school || "-"}</td>
                          <td className="px-4 py-2.5 text-slate-500">{profile?.birthYear ? profile.birthYear + "년" : "-"}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-500 text-xs">{s.pin}</td>
                          <td className="px-4 py-2.5 text-slate-500">{hwCount}</td>
                          <td className="px-4 py-2.5">
                            {isLocked
                              ? <span className="text-xs text-emerald-600 font-medium">🔒 확정</span>
                              : hasProfile
                                ? <span className="text-xs text-amber-600 font-medium">📝 미확정</span>
                                : <span className="text-xs text-slate-300">-</span>}
                          </td>
                        </tr>
                        {isFocused && (
                          <tr className="bg-blue-50/60">
                            <td colSpan={8} className="px-4 py-2 border-b border-blue-100">
                              {isConfirming ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-red-600">숙제 {hwCount}개도 삭제됩니다. 정말 삭제할까요?</span>
                                  <Btn variant="danger" size="sm" onClick={()=>deleteStudent(s.id)} disabled={saving}>확인</Btn>
                                  <Btn variant="outline" size="sm" onClick={()=>setDeleteConfirm(null)}>취소</Btn>
                                </div>
                              ) : isEditingPin ? (
                                <div className="flex items-center gap-2">
                                  <input value={editPin[s.id]} onChange={e=>setEditPin(p=>({...p,[s.id]:e.target.value}))}
                                    className="border border-slate-200 rounded-xl px-2 py-1 text-xs w-24 outline-none focus:ring-1 focus:ring-slate-300" placeholder="새 PIN"/>
                                  <Btn size="sm" onClick={()=>updatePin(s.id, editPin[s.id])}>저장</Btn>
                                  <Btn variant="outline" size="sm" onClick={()=>setEditPin(p=>{const n={...p};delete n[s.id];return n;})}>취소</Btn>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {hasProfile && (
                                    <Btn size="sm" variant={isLocked?"outline":"default"} onClick={()=>toggleProfileLock(s.id, isLocked)}>
                                      {isLocked ? "🔓 확정 해제" : "🔒 프로필 확정"}
                                    </Btn>
                                  )}
                                  <Btn variant="outline" size="sm" onClick={()=>setExpandedEdit(isExpanded ? null : s.id)}>
                                    {isExpanded ? "닫기" : "수정"}
                                  </Btn>
                                  <Btn variant="outline" size="sm" onClick={()=>setEditPin(p=>({...p,[s.id]:s.pin}))}>PIN</Btn>
                                  <Btn variant="danger" size="sm" onClick={()=>setDeleteConfirm(s.id)}>삭제</Btn>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="px-4 pb-4 pt-2 border-b bg-slate-50/80">
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
    </div>
  );
}
