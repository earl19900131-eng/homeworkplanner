// ── 학생 관리 탭 (선생님용) ────────────────────────────────────────────────────
function StudentManager({ students, homeworks }) {
  const [newName, setNewName] = useState("");
  const [newClass, setNewClass] = useState("중1");
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editPin, setEditPin] = useState({});
  const [editInfo, setEditInfo] = useState({});
  const [bulkText, setBulkText] = useState("");
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkErr, setBulkErr] = useState("");
  const [bulkTab, setBulkTab] = useState("single");
  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    const ref = db.ref("studentProfiles");
    ref.on("value", snap => setProfiles(snap.val() || {}));
    return () => ref.off();
  }, []);

  const addStudent = async () => {
    if (!newName.trim()) { setErr("이름을 입력해 주세요."); return; }
    if (!newClass.trim()) { setErr("학년을 선택해 주세요."); return; }
    if (!newPin.trim() || newPin.length < 4) { setErr("PIN은 4자리 이상 입력해 주세요."); return; }
    if (students.some(s => s.name === newName.trim() && s.className === newClass.trim())) { setErr("같은 이름+반 학생이 이미 있습니다."); return; }
    setSaving(true);
    const id = "student-" + genId();
    try {
      await db.ref(`students/${id}`).set({ id, name: newName.trim(), className: newClass.trim(), pin: newPin.trim(), role: "student", createdAt: todayString() });
      setNewName(""); setNewClass(""); setNewPin(""); setErr("");
    } catch(e) { setErr("저장 실패: " + e.message); }
    setSaving(false);
  };

  const parseBulk = (text) => {
    setBulkErr("");
    const lines = text.trim().split(/\n|\r\n/).filter(l => l.trim());
    const parsed = [];
    const errs = [];
    lines.forEach((line, i) => {
      const cols = line.includes("	") ? line.split("	") : line.split(",");
      const name = (cols[0]||"").trim();
      const className = (cols[1]||"").trim();
      const pin = (cols[2]||"").trim() || name.slice(0,4).padEnd(4,"0");
      if (!name) { errs.push(`${i+1}행: 이름 없음`); return; }
      if (!className) { errs.push(`${i+1}행: 반 없음`); return; }
      parsed.push({ name, className, pin });
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

  const updateInfo = async (studentId, newName, newClass) => {
    if (!newName.trim()) { alert("이름을 입력해 주세요."); return; }
    if (!newClass.trim()) { alert("반을 입력해 주세요."); return; }
    try {
      await db.ref(`students/${studentId}`).update({ name: newName.trim(), className: newClass.trim() });
      const toUpdate = homeworks.filter(hw => hw.studentId === studentId);
      await Promise.all(toUpdate.map(hw => db.ref(`homeworks/${hw._key}/studentName`).set(newName.trim())));
      setEditInfo(prev => { const n={...prev}; delete n[studentId]; return n; });
    } catch(e) { alert("저장 실패: " + e.message); }
  };

  const classes = [...new Set(students.map(s => s.className))].sort();

  const toggleProfileLock = async (studentId, currentLocked) => {
    try {
      await db.ref(`studentProfiles/${studentId}/locked`).set(!currentLocked);
    } catch(e) { alert("저장 실패: " + e.message); }
  };

  return (
    <div className="space-y-6">
      {/* 학생 추가 */}
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold">학생 추가</h2>
        </div>

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
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5"><Lbl>이름</Lbl><Inp value={newName} onChange={e=>setNewName(e.target.value)} placeholder="홍길동" onKeyDown={e=>e.key==="Enter"&&addStudent()}/></div>
              <div className="space-y-1.5"><Lbl>학년</Lbl>
                <select value={newClass} onChange={e=>setNewClass(e.target.value)}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                  {["중1","중2","중3","고1","고2","고3"].map(g=><option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Lbl>PIN</Lbl><Inp value={newPin} onChange={e=>setNewPin(e.target.value)} placeholder="4자리 이상" onKeyDown={e=>e.key==="Enter"&&addStudent()}/></div>
            </div>
            {err && <AlertBox className="bg-red-50 text-red-700">{err}</AlertBox>}
            <Btn onClick={addStudent} disabled={saving}>{saving?"저장 중...":"➕ 학생 추가"}</Btn>
          </div>
        ) : (
          <div className="space-y-3">
            <AlertBox className="bg-blue-50 text-blue-700">
              <div className="font-semibold mb-1">📋 엑셀에서 복사 후 아래에 붙여넣기</div>
              <div>컬럼 순서: <b>이름 | 반 | PIN</b> (PIN 없으면 이름 앞 4글자로 자동 설정)</div>
              <div className="mt-1 text-xs opacity-80">예시: 홍길동 → 홍길동0 / 김민준 → 김민준0</div>
            </AlertBox>
            <textarea
              value={bulkText}
              onChange={e=>{ setBulkText(e.target.value); parseBulk(e.target.value); }}
              placeholder={"홍길동  중3A  1234\n김민준  고1B  5678\n..."}
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
                      <div key={i} className={`flex items-center justify-between rounded-xl px-3 py-1.5 text-sm ${isDup?"bg-amber-50 text-amber-700":"bg-white"}`}>
                        <span className="font-medium">{row.name}</span>
                        <Badge variant="secondary">{row.className}</Badge>
                        <span className="text-slate-400 text-xs">PIN: {row.pin}</span>
                        {isDup && <span className="text-xs text-amber-600">중복 건너뜀</span>}
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
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold">학생 목록</h2>
            <p className="text-sm text-slate-500">총 {students.length}명 등록됨</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {classes.map(c=><Badge key={c} variant="secondary">{c} {students.filter(s=>s.className===c).length}명</Badge>)}
          </div>
        </div>

        {students.length === 0
          ? <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-400">아직 등록된 학생이 없습니다.</div>
          : classes.map(cls=>(
            <div key={cls}>
              <div className="text-xs font-bold text-slate-400 px-1 pb-2 pt-1 tracking-wide">{cls} · {students.filter(s=>s.className===cls).length}명</div>
              <div className="space-y-1.5">
                {students.filter(s=>s.className===cls).sort((a,b)=>a.name.localeCompare(b.name)).map(s=>{
                  const hwCount = homeworks.filter(hw=>hw.studentId===s.id).length;
                  const isConfirming = deleteConfirm === s.id;
                  const isEditingPin = editPin[s.id] !== undefined;
                  const profile = profiles[s.id];
                  const isLocked = profile?.locked;
                  const hasProfile = profile && (profile.school || Object.values(profile.grades||{}).some(v=>v!==""));
                  return (
                    <div key={s.id} className={`rounded-2xl border px-4 py-3 transition ${isConfirming?"border-red-300 bg-red-50":isLocked?"border-emerald-200 bg-emerald-50/30":"bg-white"}`}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">{s.name[0]}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-sm">{s.name}</div>
                              {isLocked && <span className="text-xs text-emerald-600 font-medium">🔒 확정</span>}
                              {hasProfile && !isLocked && <span className="text-xs text-amber-600 font-medium">📝 미확정</span>}
                            </div>
                            <div className="text-xs text-slate-400">PIN: {s.pin} · 숙제 {hwCount}개{profile?.school ? " · "+profile.school : ""}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {isConfirming ? (
                            <>
                              <span className="text-xs text-red-600">숙제 {hwCount}개도 삭제됩니다.</span>
                              <Btn variant="danger" size="sm" onClick={()=>deleteStudent(s.id)} disabled={saving}>확인</Btn>
                              <Btn variant="outline" size="sm" onClick={()=>setDeleteConfirm(null)}>취소</Btn>
                            </>
                          ) : isEditingPin ? (
                            <>
                              <input value={editPin[s.id]} onChange={e=>setEditPin(p=>({...p,[s.id]:e.target.value}))}
                                className="border border-slate-200 rounded-xl px-2 py-1 text-xs w-24 outline-none focus:ring-1 focus:ring-slate-300" placeholder="새 PIN"/>
                              <Btn size="sm" onClick={()=>updatePin(s.id, editPin[s.id])}>저장</Btn>
                              <Btn variant="outline" size="sm" onClick={()=>setEditPin(p=>{const n={...p};delete n[s.id];return n;})}>취소</Btn>
                            </>
                          ) : editInfo[s.id] !== undefined ? (
                            <>
                              <input value={editInfo[s.id].name} onChange={e=>setEditInfo(p=>({...p,[s.id]:{...p[s.id],name:e.target.value}}))}
                                className="border border-slate-200 rounded-xl px-2 py-1 text-xs w-20 outline-none focus:ring-1 focus:ring-slate-300" placeholder="이름"/>
                              <select value={editInfo[s.id].className} onChange={e=>setEditInfo(p=>({...p,[s.id]:{...p[s.id],className:e.target.value}}))}
                                className="border border-slate-200 rounded-xl px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-slate-300 bg-white">
                                {["중1","중2","중3","고1","고2","고3"].map(g=><option key={g} value={g}>{g}</option>)}
                              </select>
                              <Btn size="sm" onClick={()=>updateInfo(s.id, editInfo[s.id].name, editInfo[s.id].className)}>저장</Btn>
                              <Btn variant="outline" size="sm" onClick={()=>setEditInfo(p=>{const n={...p};delete n[s.id];return n;})}>취소</Btn>
                            </>
                          ) : (
                            <>
                              {hasProfile && (
                                <Btn size="sm" variant={isLocked?"outline":"default"} onClick={()=>toggleProfileLock(s.id, isLocked)}>
                                  {isLocked ? "🔓 확정 해제" : "🔒 프로필 확정"}
                                </Btn>
                              )}
                              <Btn variant="outline" size="sm" onClick={()=>setEditInfo(p=>({...p,[s.id]:{name:s.name,className:s.className}}))}>수정</Btn>
                              <Btn variant="outline" size="sm" onClick={()=>setEditPin(p=>({...p,[s.id]:s.pin}))}>PIN</Btn>
                              <Btn variant="danger" size="sm" onClick={()=>setDeleteConfirm(s.id)}>삭제</Btn>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        }
      </Card>
    </div>
  );
}
