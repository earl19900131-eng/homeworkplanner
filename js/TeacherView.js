// ── 선생님 통계 탭 ────────────────────────────────────────────────────────────
function TeacherStatsTab({ students, homeworks, today }) {
  const hwByStudent = useMemo(() => homeworks.reduce((acc,hw)=>{ (acc[hw.studentId]||(acc[hw.studentId]=[])).push(hw); return acc; },{}), [homeworks]);
  const classes = [...new Set(students.map(s=>s.className))].sort();
  const [selectedClass, setSelectedClass] = useState("all");

  const filteredStudents = selectedClass === "all" ? students : students.filter(s=>s.className===selectedClass);

  const studentRates = useMemo(() => filteredStudents.map(s => {
    const hws = hwByStudent[s.id] ?? [];
    const allChunks = hws.flatMap(hw=>(hw.chunks||[]).filter(c=>c.date<=today));
    const total = allChunks.length;
    const done = allChunks.filter(c=>c.done).length;
    return { ...s, rate: total>0?Math.round(done/total*100):null, done, total };
  }).sort((a,b) => (b.rate??-1) - (a.rate??-1)), [filteredStudents, hwByStudent, today]);

  const classRates = useMemo(() => classes.map(cls => {
    const group = students.filter(s=>s.className===cls);
    const rates = group.map(s => {
      const hws = hwByStudent[s.id]??[];
      const chunks = hws.flatMap(hw=>(hw.chunks||[]).filter(c=>c.date<=today));
      return chunks.length>0 ? Math.round(chunks.filter(c=>c.done).length/chunks.length*100) : null;
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
                <div className="text-xs text-slate-400 mt-0.5">{c.count}명 중 {c.active}명 활동</div>
              </div>
              <div className="text-2xl font-bold">{c.avg}%</div>
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
        <h2 className="text-lg font-bold">학생별 이행률</h2>
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
                  <div className="text-xs text-slate-400 shrink-0 w-16 text-right">{s.done}/{s.total}일</div>
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

function ClassGroupList({ teacherStats, teacherViewId, setTeacherViewId, homeworks }) {
  const [gradeFilter, setGradeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

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
      <div className="space-y-1 max-h-72 overflow-y-auto pr-0.5">
        {filtered.length === 0
          ? <div className="text-sm text-slate-400 text-center py-4">해당하는 학생이 없습니다.</div>
          : filtered.map(s=>(
            <button key={s.id} type="button" onClick={()=>setTeacherViewId(s.id)}
              className={`w-full px-3 py-2.5 rounded-xl text-left transition border ${teacherViewId===s.id?"bg-slate-100 border-slate-300":"bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{s.name}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 rounded-md px-1.5 py-0.5">{s.className}</span>
                  {s.overdueChunks>=2&&<Badge variant="destructive">위험</Badge>}
                  {s.homeworkCount===0&&<Badge variant="outline">미등록</Badge>}
                </div>
                <span className="text-sm font-bold shrink-0 text-slate-700">{s.progress}%</span>
              </div>
              <div className="mt-1.5"><ProgressBar value={s.progress}/></div>
              <div className="mt-1 text-xs text-slate-400">오늘 미완료 {s.todayIncomplete}개 · 밀림 {s.overdueChunks}개</div>
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

  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      await db.ref(`homeworks/${hw._key}`).remove();
      setDeleteConfirm(false);
    } catch(err) { alert("삭제 실패: " + err.message); }
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${deleteConfirm?"border-red-300":""}`}>
      <div className="p-4">
        <div className="flex items-start gap-2">
          <button type="button" onClick={()=>setExpanded(p=>!p)} className="flex-1 text-left">
            <div className="flex flex-col gap-2 md:flex-row md:justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{hw.title}</span>
                  <Badge variant="secondary">{hw.studentName}</Badge>
                  <Badge variant="outline">{hw.subject}</Badge>
                </div>
                <div className="text-xs text-slate-500 mt-1">{hw.startDate} ~ {hw.dueDate} · 총 {hw.totalAmount}문제</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold">{pct}%</span>
                <span className="text-slate-400 text-xs">{expanded?"▲":"▼"}</span>
              </div>
            </div>
            <div className="mt-2"><ProgressBar value={pct}/></div>
            <div className="text-xs text-slate-400 mt-1">{done}/{hw.chunks?.length||0}일 완료 · 클릭해서 제출 시각 확인</div>
          </button>
          <div className="shrink-0 flex items-center gap-1.5 ml-1">
            {deleteConfirm ? (
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
            )}
          </div>
        </div>
        {deleteConfirm && (
          <div className="mt-2 text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">
            이 숙제를 삭제하면 복구할 수 없습니다. 확인을 눌러주세요.
          </div>
        )}
      </div>
      {expanded && (
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
