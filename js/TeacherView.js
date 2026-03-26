// ── 선생님 통계 탭 ────────────────────────────────────────────────────────────
function TeacherStatsTab({ students, homeworks, today }) {
  const hwByStudent = useMemo(() => homeworks.reduce((acc,hw)=>{ (acc[hw.studentId]||(acc[hw.studentId]=[])).push(hw); return acc; },{}), [homeworks]);
  const classes = [...new Set(students.map(s=>s.className))].sort();
  const [selectedClass, setSelectedClass] = useState("all");

  const filteredStudents = selectedClass === "all" ? students : students.filter(s=>s.className===selectedClass);

  // 이행/미이행 기반 통계 (마감일이 지난 숙제만)
  const studentRates = useMemo(() => filteredStudents.map(s => {
    const hws = (hwByStudent[s.id] ?? []).filter(hw => hw.dueDate <= today);
    const verified = hws.filter(hw=>hw.teacherVerified==="이행").length;
    const unverified = hws.filter(hw=>hw.teacherVerified==="미이행").length;
    const pending = hws.filter(hw=>!hw.teacherVerified).length;
    const judged = verified + unverified;
    const rate = judged > 0 ? Math.round(verified / judged * 100) : null;
    return { ...s, rate, verified, unverified, pending, judged };
  }).sort((a,b) => (b.rate??-1) - (a.rate??-1)), [filteredStudents, hwByStudent, today]);

  const classRates = useMemo(() => classes.map(cls => {
    const group = students.filter(s=>s.className===cls);
    const rates = group.map(s => {
      const hws = (hwByStudent[s.id]??[]).filter(hw=>hw.dueDate<=today);
      const verified = hws.filter(hw=>hw.teacherVerified==="이행").length;
      const unverified = hws.filter(hw=>hw.teacherVerified==="미이행").length;
      const judged = verified + unverified;
      return judged > 0 ? Math.round(verified/judged*100) : null;
    }).filter(r=>r!==null);
    return { cls, avg: rates.length>0?Math.round(rates.reduce((a,b)=>a+b,0)/rates.length):0, count: group.length, active: rates.length };
  }), [classes, students, hwByStudent, today]);

  const rateColor = (r) => {
    if (r===null) return "bg-slate-100 text-slate-400";
    if (r>=80) return "bg-emerald-100 text-emerald-700";
    if (r>=50) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {classRates.map(c => (
          <Card key={c.cls} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">{c.cls}</div>
                <div className="text-xs text-slate-400 mt-0.5">{c.count}명 중 {c.active}명 판정 있음</div>
              </div>
              <div className="text-2xl font-bold">{c.avg > 0 ? c.avg+"%" : "-"}</div>
            </div>
            <div className="mt-2"><ProgressBar value={c.avg}/></div>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={()=>setSelectedClass("all")}
          className={"px-3 py-1.5 rounded-xl text-sm font-medium transition border " + (selectedClass==="all"?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
          전체
        </button>
        {classes.map(cls=>(
          <button key={cls} type="button" onClick={()=>setSelectedClass(cls)}
            className={"px-3 py-1.5 rounded-xl text-sm font-medium transition border " + (selectedClass===cls?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
            {cls}
          </button>
        ))}
      </div>

      <Card className="p-5 space-y-3">
        <div>
          <h2 className="text-lg font-bold">학생별 숙제 이행률</h2>
          <p className="text-xs text-slate-400 mt-0.5">마감일이 지난 숙제 중 관리자가 이행/미이행 판정한 항목 기준</p>
        </div>
        {studentRates.length === 0
          ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">데이터가 없습니다.</div>
          : <div className="space-y-2">
              {studentRates.map(s => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl border px-4 py-2.5">
                  <div className="w-16 text-sm font-semibold shrink-0">{s.name}</div>
                  <Badge variant="secondary" className="shrink-0">{s.className}</Badge>
                  <div className="flex-1 min-w-0">
                    <ProgressBar value={s.rate??0}/>
                  </div>
                  <div className={`shrink-0 rounded-xl px-2.5 py-0.5 text-xs font-bold ${rateColor(s.rate)}`}>
                    {s.rate !== null ? s.rate+"%" : "-"}
                  </div>
                  <div className="text-xs text-slate-400 shrink-0 text-right">
                    <span className="text-emerald-600">이행 {s.verified}</span> / <span className="text-red-500">미이행 {s.unverified}</span>
                    {s.pending > 0 && <span className="text-slate-400"> · 미판정 {s.pending}</span>}
                  </div>
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  );
}

// ── 학년별/과목별 필터 리스트 ─────────────────────────────────────────────────
const GRADES = ["중1","중2","중3","고1","고2","고3"];
const SUBJECTS = ["중1-1","중1-2","중2-1","중2-2","중3-1","중3-2","공통수학1","공통수학2","대수","미적분1","기하","미적분","확률과통계"];

function ClassGroupList({ teacherStats, teacherViewId, setTeacherViewId, homeworks, gradeFilter, setGradeFilter, subjectFilter, setSubjectFilter }) {

  const hwByStudent = useMemo(() => (homeworks||[]).reduce((acc,hw)=>{
    (acc[hw.studentId]||(acc[hw.studentId]=[])).push(hw); return acc;
  },{}), [homeworks]);

  const usedSubjects = useMemo(() => {
    const set = new Set((homeworks||[]).map(hw=>hw.subject).filter(Boolean));
    return SUBJECTS.filter(s=>set.has(s));
  }, [homeworks]);

  const filtered = useMemo(() => {
    let list = teacherStats;
    if (gradeFilter !== "all") list = list.filter(s=>s.className===gradeFilter);
    if (subjectFilter !== "all") list = list.filter(s=>(hwByStudent[s.id]||[]).some(hw=>hw.subject===subjectFilter));
    return list;
  }, [teacherStats, gradeFilter, subjectFilter, hwByStudent]);

  const FilterBtn = ({value, current, onClick, children}) => (
    <button type="button" onClick={onClick}
      className={"px-2.5 py-1 rounded-lg text-xs font-medium transition border " +
        (current===value?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>
      {children}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="text-xs text-slate-400 font-medium">학년</div>
        <div className="flex gap-1.5 flex-wrap">
          <FilterBtn value="all" current={gradeFilter} onClick={()=>setGradeFilter("all")}>전체</FilterBtn>
          {GRADES.map(g=>(
            <FilterBtn key={g} value={g} current={gradeFilter} onClick={()=>setGradeFilter(g)}>{g}</FilterBtn>
          ))}
        </div>
      </div>
      {usedSubjects.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-slate-400 font-medium">과목</div>
          <div className="flex gap-1.5 flex-wrap">
            <FilterBtn value="all" current={subjectFilter} onClick={()=>setSubjectFilter("all")}>전체</FilterBtn>
            {usedSubjects.map(s=>(
              <FilterBtn key={s} value={s} current={subjectFilter} onClick={()=>setSubjectFilter(s)}>{s}</FilterBtn>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1 overflow-y-auto pr-0.5" style={{maxHeight:"36rem"}}>
        {filtered.length === 0
          ? <div className="col-span-2 text-sm text-slate-400 text-center py-4">해당하는 학생이 없습니다.</div>
          : filtered.map(s=>(
            <button key={s.id} type="button" onClick={()=>setTeacherViewId(s.id)}
              className={`px-3 py-2.5 rounded-xl text-left transition border ${teacherViewId===s.id?"bg-slate-100 border-slate-300":"bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-sm">{s.name}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 rounded-md px-1.5 py-0.5">{s.className}</span>
                  {s.overdueChunks>=1&&<Badge variant="destructive">밀림</Badge>}
                  {s.homeworkCount===0&&<Badge variant="outline">미등록</Badge>}
                </div>
                <span className="text-sm font-bold shrink-0 text-slate-700">{s.progress}%</span>
              </div>
              <div className="mt-1.5"><ProgressBar value={s.progress}/></div>
              <div className="mt-1 text-xs text-slate-400">미완료 {s.todayIncomplete} · {s.overdueHyun>0&&s.overdueSum>0?`현 ${s.overdueHyun}/선 ${s.overdueSum} 밀림`:s.overdueHyun>0?`현행 ${s.overdueHyun} 밀림`:s.overdueSum>0?`선행 ${s.overdueSum} 밀림`:"밀림 없음"}</div>
            </button>
          ))
        }
      </div>
    </div>
  );
}

// ── 선생님 숙제 카드 ─────────────────────────────────────────────────────────
function TeacherHWCard({ hw, done, pct, today }) {
  const [expanded, setExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const hasOverdue = (hw.chunks||[]).some(c=>!c.done&&c.date<today);

  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      await db.ref(`homeworks/${hw._key}`).remove();
      setDeleteConfirm(false);
    } catch(err) { alert("삭제 실패: " + err.message); }
  };

  const startEdit = (e) => {
    e.stopPropagation();
    setEditForm({ title:hw.title, subject:hw.subject, hwType:hw.hwType||"현행", totalAmount:hw.totalAmount, startDate:hw.startDate, dueDate:hw.dueDate, includeWeekend:hw.includeWeekend||false, dailyMax:hw.dailyMax||"" });
    setEditing(true);
    setExpanded(false);
  };

  const handleUpdate = async () => {
    if (!editForm.title.trim()) { alert("숙제명을 입력해 주세요."); return; }
    if (!editForm.totalAmount||!editForm.startDate||!editForm.dueDate) { alert("총 문제 수, 시작일, 마감일을 입력해 주세요."); return; }
    const newChunks = splitHomework({...editForm, customDates:null});
    if (!newChunks.length) { alert("기간이나 최대 문제 수를 조정해 주세요."); return; }
    const doneMap = {};
    (hw.chunks||[]).forEach(c=>{ if(c.done) doneMap[c.date]=c; });
    const merged = newChunks.map(c=>doneMap[c.date]?{...c,done:true,completedAmount:doneMap[c.date].completedAmount,submittedAt:doneMap[c.date].submittedAt}:c);
    setSaving(true);
    try {
      await db.ref(`homeworks/${hw._key}`).update({ title:editForm.title.trim(), subject:editForm.subject, hwType:editForm.hwType||"현행", totalAmount:Number(editForm.totalAmount), startDate:editForm.startDate, dueDate:editForm.dueDate, includeWeekend:editForm.includeWeekend, dailyMax:editForm.dailyMax?Number(editForm.dailyMax):null, chunks:merged });
      setEditing(false);
    } catch(err) { alert("저장 실패: "+err.message); }
    setSaving(false);
  };

  const handleRedistribute = async (e) => {
    e.stopPropagation();
    const updated = redistributeHomework(hw, today);
    setSaving(true);
    try { await db.ref(`homeworks/${hw._key}/chunks`).set(updated.chunks); }
    catch(err) { alert("저장 실패: "+err.message); }
    setSaving(false);
  };

  const handleVerify = async (value) => {
    setSaving(true);
    try { await db.ref(`homeworks/${hw._key}/teacherVerified`).set(value); }
    catch(err) { alert("저장 실패: "+err.message); }
    setSaving(false);
  };

  const isPastDue = hw.dueDate <= today;
  const verified = hw.teacherVerified; // null | "이행" | "미이행"

  const ef = editForm;
  const setEF = (fn) => setEditForm(p=>typeof fn==="function"?fn(p):fn);

  return (
    <div className={`rounded-2xl border overflow-hidden ${deleteConfirm?"border-red-300":verified==="이행"?"border-emerald-300":verified==="미이행"?"border-red-300":""}`}>
      <div className="p-4">
        <div className="flex items-start gap-2">
          <button type="button" onClick={()=>!editing&&setExpanded(p=>!p)} className="flex-1 text-left">
            <div className="flex flex-col gap-2 md:flex-row md:justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{hw.title}</span>
                  <Badge variant="secondary">{hw.studentName}</Badge>
                  {hw.hwType==="선행"
                    ? <span className="text-xs font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-lg px-2 py-0.5">선행</span>
                    : <span className="text-xs font-bold text-sky-600 bg-sky-50 border border-sky-200 rounded-lg px-2 py-0.5">현행</span>}
                  <Badge variant="outline">{hw.subject}</Badge>
                  {verified==="이행"&&<span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5">✓ 이행</span>}
                  {verified==="미이행"&&<span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-0.5">✗ 미이행</span>}
                  {isPastDue && !verified && <span className="text-xs text-slate-400 bg-slate-100 rounded-lg px-2 py-0.5">미판정</span>}
                </div>
                <div className="text-xs text-slate-500 mt-1">{hw.startDate} ~ {hw.dueDate} · 총 {hw.totalAmount}문제</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold">{pct}%</span>
                {!editing&&<span className="text-slate-400 text-xs">{expanded?"▲":"▼"}</span>}
              </div>
            </div>
            <div className="mt-2"><ProgressBar value={pct}/></div>
            <div className="text-xs text-slate-400 mt-1">{done}/{hw.chunks?.length||0}일 완료 · 클릭해서 제출 시각 확인</div>
          </button>
          <div className="shrink-0 flex items-center gap-1.5 ml-1 flex-wrap justify-end">
            {!editing && !deleteConfirm && isPastDue && (
              verified ? (
                <button type="button" onClick={()=>handleVerify(null)} disabled={saving}
                  className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition">판정 취소</button>
              ) : (<>
                <button type="button" onClick={()=>handleVerify("이행")} disabled={saving}
                  className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition">✓ 이행</button>
                <button type="button" onClick={()=>handleVerify("미이행")} disabled={saving}
                  className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition">✗ 미이행</button>
              </>)
            )}
            {!editing && !deleteConfirm && hasOverdue && (
              <button type="button" onClick={handleRedistribute} disabled={saving}
                className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition">재분배</button>
            )}
            {!editing && !deleteConfirm && (
              <button type="button" onClick={startEdit}
                className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition">수정</button>
            )}
            {editing && (
              <>
                <button type="button" onClick={handleUpdate} disabled={saving}
                  className="px-2 py-1 text-xs font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition">{saving?"저장 중...":"저장"}</button>
                <button type="button" onClick={()=>setEditing(false)}
                  className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition">취소</button>
              </>
            )}
            {!editing && (deleteConfirm ? (
              <>
                <button type="button" onClick={handleDelete}
                  className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-xl hover:bg-red-600 transition">확인</button>
                <button type="button" onClick={e=>{e.stopPropagation();setDeleteConfirm(false);}}
                  className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition">취소</button>
              </>
            ) : (
              <button type="button" onClick={e=>{e.stopPropagation();setDeleteConfirm(true);}}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-50 rounded-xl transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
        {deleteConfirm && (
          <div className="mt-2 text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">
            이 숙제를 삭제하면 복구할 수 없습니다. 확인을 눌러주세요.
          </div>
        )}
        {editing && ef && (
          <div className="mt-3 border-t pt-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Lbl>종류</Lbl>
                <div className="flex gap-2">
                  {["현행","선행"].map(t=>(
                    <button key={t} type="button" onClick={()=>setEF(p=>({...p,hwType:t}))}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition ${ef.hwType===t?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1 sm:col-span-2"><Lbl>숙제명</Lbl><Inp value={ef.title} onChange={e=>setEF(p=>({...p,title:e.target.value}))}/></div>
              <div className="space-y-1"><Lbl>과목</Lbl>
                <select value={ef.subject} onChange={e=>setEF(p=>({...p,subject:e.target.value}))}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                  {["중1-1","중1-2","중2-1","중2-2","중3-1","중3-2","공통수학1","공통수학2","대수","미적분1","기하","미적분","확률과통계"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Lbl>총 문제 수</Lbl><Inp type="number" value={ef.totalAmount} onChange={e=>setEF(p=>({...p,totalAmount:e.target.value}))}/></div>
              <div className="space-y-1"><Lbl>시작일</Lbl><Inp type="date" value={ef.startDate} onChange={e=>setEF(p=>({...p,startDate:e.target.value}))}/></div>
              <div className="space-y-1"><Lbl>마감일</Lbl><Inp type="date" value={ef.dueDate} onChange={e=>setEF(p=>({...p,dueDate:e.target.value}))}/></div>
              <div className="space-y-1"><Lbl>하루 최대 문제 수</Lbl><Inp type="number" value={ef.dailyMax} onChange={e=>setEF(p=>({...p,dailyMax:e.target.value}))} placeholder="선택"/></div>
              <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2">
                <input type="checkbox" id={`tw-weekend-${hw._key}`} checked={ef.includeWeekend} onChange={e=>setEF(p=>({...p,includeWeekend:e.target.checked}))} className="w-4 h-4 cursor-pointer"/>
                <label htmlFor={`tw-weekend-${hw._key}`} className="text-sm font-medium cursor-pointer">주말 포함</label>
              </div>
            </div>
          </div>
        )}
      </div>
      {expanded && !editing && (
        <div className="border-t bg-slate-50 p-3 space-y-1">
          {(hw.chunks||[]).map(chunk=>{
            const isOverdue = !chunk.done && chunk.date < today;
            const isToday = chunk.date === today;
            return (
              <div key={chunk.date}
                className={"flex items-center justify-between rounded-xl px-3 py-2 text-xs " +
                  (chunk.done?"bg-emerald-50 text-emerald-700":isOverdue?"bg-red-50 text-red-600":isToday?"bg-blue-50 text-blue-700":"bg-white text-slate-500")}>
                <span className="font-medium">{chunk.date}{isToday?" · 오늘":""}</span>
                <span>{chunk.startProblem}~{chunk.endProblem}번 ({chunk.plannedAmount}문제)</span>
                <span className="font-semibold w-32 text-right">
                  {chunk.done
                    ? (chunk.submittedAt ? "✓ "+chunk.submittedAt : "✓ 완료")
                    : isOverdue ? "⚠ 미완료" : "-"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
