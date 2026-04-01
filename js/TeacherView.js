// ── 학생 달력 모달 (숙제현황 / 출결현황 공용) ─────────────────────────────────
// lessonEntries = [{ date, status("이행"|"미이행"), lessonType("현행"|"추가1"|"추가2") }]
// lessons/attendance = 출결달력용
function StudentCalendarModal({ type, student, lessonEntries, lessons, attendance, onClose }) {
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth());

  // 날짜별 배열 맵
  const dayMap = React.useMemo(() => {
    const map = {};
    if (type === "homework") {
      (lessonEntries || []).forEach(({ date, status, lessonType }) => {
        if (!date) return;
        if (!map[date]) map[date] = [];
        map[date].push({ status, lessonType });
      });
    } else {
      (lessons || []).forEach(l => {
        if (!(l.studentIds || []).includes(student.id)) return;
        const tags = (attendance[l._key]?.[student.id]?.tags) || [];
        let status = null;
        if (tags.includes("무단결석")) status = "무단결석";
        else if (tags.includes("결석")) status = "결석";
        else if (tags.includes("지각")) status = "지각";
        else if (tags.includes("출석")) status = "출석";
        if (status) {
          if (!map[l.date]) map[l.date] = [];
          map[l.date].push({ status });
        }
      });
    }
    return map;
  }, [type, lessonEntries, lessons, attendance, student]);

  const cells = React.useMemo(() => {
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const result = [];
    for (let i = 0; i < startDow; i++) result.push(null);
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      result.push({ d, dateStr });
    }
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [year, month]);

  const hwDotColor = (status) => status === "이행" ? "bg-emerald-400" : "bg-red-400";
  const hwTypeLabel = (lt) => lt === "추가1" ? "추1" : lt === "추가2" ? "추2" : "현";
  const hwTypeColor = (lt) => lt === "추가1" ? "text-violet-500" : lt === "추가2" ? "text-rose-500" : "text-sky-500";

  const attDotColor = (status) => {
    if (status === "출석") return "bg-emerald-400";
    if (status === "지각") return "bg-amber-400";
    if (status === "결석") return "bg-red-400";
    if (status === "무단결석") return "bg-pink-500";
    return "bg-slate-300";
  };
  const cellBg = (entries) => {
    if (!entries || entries.length === 0) return "";
    if (type === "homework") {
      return entries.some(e=>e.status==="미이행") ? "bg-red-50" : "bg-emerald-50";
    } else {
      const s = entries[0].status;
      if (s==="출석") return "bg-emerald-50";
      if (s==="지각") return "bg-amber-50";
      if (s==="결석") return "bg-red-50";
      if (s==="무단결석") return "bg-pink-50";
      return "";
    }
  };

  const prevMonth = () => { if (month === 0) { setYear(y=>y-1); setMonth(11); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y=>y+1); setMonth(0); } else setMonth(m=>m+1); };

  const hwLegends = [["bg-emerald-400","이행"],["bg-red-400","미이행"]];
  const attLegends = [["bg-emerald-400","출석"],["bg-amber-400","지각"],["bg-red-400","결석"],["bg-pink-500","무단결석"]];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e=>e.stopPropagation()}>
        <div className="p-5 pb-3 border-b" style={{background:"linear-gradient(135deg,#1a2340,#2d3a6b)"}}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-blue-300 font-medium mb-0.5">{type === "homework" ? "숙제 이행 달력" : "출결 달력"}</div>
              <div className="text-lg font-bold text-white">{student.name}</div>
              <div className="text-sm text-blue-200">{student.className}</div>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white text-2xl font-bold leading-none">×</button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg border flex items-center justify-center text-slate-500 hover:bg-slate-50">‹</button>
            <div className="font-bold text-slate-800">{year}년 {month+1}월</div>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg border flex items-center justify-center text-slate-500 hover:bg-slate-50">›</button>
          </div>

          <div className="grid grid-cols-7 text-center">
            {["일","월","화","수","목","금","토"].map((d,i) => (
              <div key={d} className={`text-xs font-bold py-1 ${i===0?"text-red-400":i===6?"text-blue-400":"text-slate-400"}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              if (!cell) return <div key={i}/>;
              const entries = dayMap[cell.dateStr] || [];
              const dow = i % 7;
              return (
                <div key={cell.dateStr} className={`rounded-lg p-1 min-h-[48px] flex flex-col items-center gap-0.5 ${cellBg(entries)}`}>
                  <div className={`text-xs font-medium ${dow===0?"text-red-400":dow===6?"text-blue-400":"text-slate-600"}`}>{cell.d}</div>
                  {type === "homework"
                    ? entries.map((e, ei) => (
                        <div key={ei} className="flex flex-col items-center gap-0">
                          <div className={`w-2 h-2 rounded-full ${hwDotColor(e.status)}`}/>
                          <span className={`text-[7px] font-bold leading-none ${hwTypeColor(e.lessonType)}`}>{hwTypeLabel(e.lessonType)}</span>
                        </div>
                      ))
                    : entries.map((e, ei) => (
                        <div key={ei} className="flex flex-col items-center gap-0">
                          <div className={`w-2 h-2 rounded-full ${attDotColor(e.status)}`}/>
                          <span className="text-[7px] text-slate-400 leading-none">{e.status==="무단결석"?"무단":e.status}</span>
                        </div>
                      ))
                  }
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 pt-1 border-t">
            {(type === "homework" ? hwLegends : attLegends).map(([cls, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${cls}`}/>
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            ))}
            {type === "homework" && (
              <>
                <div className="flex items-center gap-1"><span className="text-[9px] font-bold text-sky-500">현</span><span className="text-xs text-slate-400">현행</span></div>
                <div className="flex items-center gap-1"><span className="text-[9px] font-bold text-violet-500">추1</span><span className="text-xs text-slate-400">추가1</span></div>
                <div className="flex items-center gap-1"><span className="text-[9px] font-bold text-rose-500">추2</span><span className="text-xs text-slate-400">추가2</span></div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 선생님 통계 탭 ────────────────────────────────────────────────────────────
function TeacherStatsTab({ students, homeworks, today }) {
  const [statsTab, setStatsTab] = useState("homework"); // "homework" | "attendance"

  return (
    <div className="space-y-4">
      <div className="flex gap-2 bg-white rounded-2xl p-1" style={{boxShadow:"0px 0px 0px 1px rgba(74,107,214,0.08), 0px 2px 8px rgba(74,107,214,0.06)"}}>
        {[["homework","숙제통계"],["attendance","출결통계"]].map(([k,l])=>(
          <button key={k} onClick={()=>setStatsTab(k)}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition ${statsTab===k?"text-white":"text-slate-500"}`}
            style={statsTab===k?{background:"#1a2340"}:{}}>
            {l}
          </button>
        ))}
      </div>
      {statsTab==="homework" && <HomeworkStatsSection students={students}/>}
      {statsTab==="attendance" && <AttendanceStatsSection students={students}/>}
    </div>
  );
}

function HomeworkStatsSection({ students }) {
  const [allAttendance, setAllAttendance] = React.useState({});
  const [allLessons, setAllLessons] = React.useState([]);
  const classes = [...new Set(students.map(s=>s.className))].sort();
  const [selectedClass, setSelectedClass] = useState("all");
  const [calendarModal, setCalendarModal] = useState(null);

  React.useEffect(() => {
    const r1 = db.ref("lessonAttendance");
    const r2 = db.ref("lessons");
    const h1 = r1.on("value", snap => setAllAttendance(snap.val() || {}));
    const h2 = r2.on("value", snap => {
      const val = snap.val() || {};
      setAllLessons(Object.entries(val).map(([k,v])=>({...v,_key:k})));
    });
    return () => { r1.off("value",h1); r2.off("value",h2); };
  }, []);

  const filteredStudents = selectedClass === "all" ? students : students.filter(s=>s.className===selectedClass);

  // 학생별: 타입별 이행/미이행 집계
  const studentStats = useMemo(() => {
    return filteredStudents.map(s => {
      const typeMap = { 현행:{이행:0,미이행:0}, 추가1:{이행:0,미이행:0}, 추가2:{이행:0,미이행:0} };
      allLessons.forEach(l => {
        if (!(l.studentIds||[]).includes(s.id)) return;
        const rec = allAttendance[l._key]?.[s.id] || {};
        const tags = rec.tags || [];
        const lt = rec.lessonType || "현행";
        const bucket = typeMap[lt] || typeMap["현행"];
        if (tags.includes("숙제해옴")) bucket.이행++;
        else if (tags.includes("숙제미이행")) bucket.미이행++;
      });
      const types = Object.entries(typeMap)
        .map(([t, stat]) => { const total=stat.이행+stat.미이행; return { type:t, ...stat, total, rate: total>0?Math.round(stat.이행/total*100):null }; })
        .filter(t => t.total > 0);
      const totalAll = types.reduce((a,t)=>a+t.total,0);
      const doneAll = types.reduce((a,t)=>a+t.이행,0);
      const overallRate = totalAll > 0 ? Math.round(doneAll/totalAll*100) : null;
      return { ...s, types, overallRate, totalAll, doneAll };
    }).sort((a,b) => (b.overallRate??-1)-(a.overallRate??-1));
  }, [filteredStudents, allLessons, allAttendance]);

  // 반별 집계
  const classStats = useMemo(() => classes.map(cls => {
    const group = students.filter(s=>s.className===cls);
    let done=0, total=0;
    group.forEach(s => {
      allLessons.forEach(l => {
        if (!(l.studentIds||[]).includes(s.id)) return;
        const tags = allAttendance[l._key]?.[s.id]?.tags || [];
        if (tags.includes("숙제해옴")) { done++; total++; }
        else if (tags.includes("숙제미이행")) total++;
      });
    });
    return { cls, avg: total>0?Math.round(done/total*100):0, count: group.length, total };
  }), [classes, students, allLessons, allAttendance]);

  const rateColor = (r) => {
    if (r===null) return "bg-slate-100 text-slate-400";
    if (r>=80) return "bg-emerald-100 text-emerald-700";
    if (r>=50) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  const typeColor = (t) => t==="추가1"?"text-violet-600":t==="추가2"?"text-rose-600":"text-sky-600";

  // 달력 모달용 lessonEntries 생성
  const getLessonEntries = (studentId) => {
    const entries = [];
    allLessons.forEach(l => {
      if (!(l.studentIds||[]).includes(studentId)) return;
      const rec = allAttendance[l._key]?.[studentId] || {};
      const tags = rec.tags || [];
      const lt = rec.lessonType || "현행";
      let status = null;
      if (tags.includes("숙제해옴")) status = "이행";
      else if (tags.includes("숙제미이행")) status = "미이행";
      if (status) entries.push({ date: l.date, status, lessonType: lt });
    });
    return entries;
  };

  return (
    <div className="space-y-5">
      {calendarModal && (
        <StudentCalendarModal
          type="homework"
          student={calendarModal.student}
          lessonEntries={calendarModal.entries}
          onClose={() => setCalendarModal(null)}
        />
      )}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {classStats.map(c => (
          <Card key={c.cls} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">{c.cls}</div>
                <div className="text-xs text-slate-400 mt-0.5">총 {c.total}회 판정</div>
              </div>
              <div className="text-2xl font-bold">{c.total>0?c.avg+"%":"-"}</div>
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
          <p className="text-xs text-slate-400 mt-0.5">수업일지 행동태그(숙제해옴/숙제미이행) 기준 · 현행/추가1/추가2 구분</p>
        </div>
        {studentStats.length === 0
          ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">데이터가 없습니다.</div>
          : <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {studentStats.map(s => (
                <div key={s.id} className="rounded-2xl border p-3 space-y-2 cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setCalendarModal({ student: s, entries: getLessonEntries(s.id) })}>
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-sm font-semibold truncate">{s.name}</div>
                    <div className={`rounded-xl px-2 py-0.5 text-xs font-bold ${rateColor(s.overallRate)}`}>
                      {s.overallRate !== null ? s.overallRate+"%" : "-"}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{s.className}</Badge>
                  <ProgressBar value={s.overallRate??0}/>
                  <div className="space-y-0.5">
                    {s.types.map(t => (
                      <div key={t.type} className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${typeColor(t.type)}`}>{t.type}</span>
                        <span>
                          <span className="text-emerald-600">{t.이행}</span>
                          <span className="text-slate-300 mx-0.5">/</span>
                          <span className="text-red-500">{t.미이행}</span>
                          <span className={`ml-1 font-bold ${rateColor(t.rate).split(" ")[1]}`}>{t.rate!==null?t.rate+"%":"-"}</span>
                        </span>
                      </div>
                    ))}
                    {s.types.length===0 && <div className="text-xs text-slate-300">기록 없음</div>}
                  </div>
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  );
}

function AttendanceStatsSection({ students }) {
  const [allAttendance, setAllAttendance] = React.useState({});
  const [allLessons, setAllLessons] = React.useState([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [calendarModal, setCalendarModal] = useState(null); // { student }
  const classes = [...new Set(students.map(s=>s.className))].sort();

  React.useEffect(() => {
    const ref = db.ref("lessonAttendance");
    ref.on("value", snap => setAllAttendance(snap.val() || {}));
    return () => ref.off();
  }, []);

  React.useEffect(() => {
    const ref = db.ref("lessons");
    ref.on("value", snap => {
      const data = snap.val() || {};
      setAllLessons(Object.entries(data).map(([k,v])=>({...v,_key:k})));
    });
    return () => ref.off();
  }, []);

  // 학생별 출결 집계
  const studentStats = useMemo(() => {
    const filtered = selectedClass === "all" ? students : students.filter(s=>s.className===selectedClass);
    return filtered.map(s => {
      let 출석=0, 지각=0, 결석=0, 무단결석=0, 총수업=0;
      allLessons.forEach(l => {
        if (!(l.studentIds||[]).includes(s.id)) return;
        총수업++;
        const rec = allAttendance[l._key]?.[s.id] || {};
        const tags = rec.tags || [];
        if (tags.includes("무단결석")) 무단결석++;
        else if (tags.includes("결석")) 결석++;
        else if (tags.includes("지각")) 지각++;
        else if (tags.includes("출석")) 출석++;
      });
      const 출석률 = 총수업 > 0 ? Math.round((출석+지각) / 총수업 * 100) : null;
      return { ...s, 출석, 지각, 결석, 무단결석, 총수업, 출석률 };
    }).sort((a,b) => (b.출석률??-1) - (a.출석률??-1));
  }, [students, allLessons, allAttendance, selectedClass]);

  // 반별 집계
  const classStats = useMemo(() => classes.map(cls => {
    const group = students.filter(s=>s.className===cls);
    let 출석=0, 지각=0, 결석=0, 무단결석=0, 총수업=0;
    group.forEach(s => {
      allLessons.forEach(l => {
        if (!(l.studentIds||[]).includes(s.id)) return;
        총수업++;
        const tags = (allAttendance[l._key]?.[s.id]?.tags) || [];
        if (tags.includes("무단결석")) 무단결석++;
        else if (tags.includes("결석")) 결석++;
        else if (tags.includes("지각")) 지각++;
        else if (tags.includes("출석")) 출석++;
      });
    });
    const 출석률 = 총수업 > 0 ? Math.round((출석+지각) / 총수업 * 100) : 0;
    return { cls, 출석, 지각, 결석, 무단결석, 총수업, 출석률, count: group.length };
  }), [classes, students, allLessons, allAttendance]);

  const rateColor = (r) => {
    if (r===null) return "bg-slate-100 text-slate-400";
    if (r>=90) return "bg-emerald-100 text-emerald-700";
    if (r>=70) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div className="space-y-5">
      {calendarModal && (
        <StudentCalendarModal
          type="attendance"
          student={calendarModal.student}
          lessons={allLessons}
          attendance={allAttendance}
          onClose={() => setCalendarModal(null)}
        />
      )}
      {/* 반별 카드 */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {classStats.map(c => (
          <Card key={c.cls} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">{c.cls}</div>
                <div className="text-xs text-slate-400 mt-0.5">총 {c.총수업}회 수업</div>
              </div>
              <div className="text-2xl font-bold">{c.총수업>0?c.출석률+"%":"-"}</div>
            </div>
            <ProgressBar value={c.출석률}/>
            <div className="flex gap-3 text-xs">
              <span className="text-emerald-600">출석 {c.출석}</span>
              <span className="text-amber-600">지각 {c.지각}</span>
              <span className="text-red-500">결석 {c.결석}</span>
              <span className="text-pink-600">무단 {c.무단결석}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* 반 필터 */}
      <div className="flex gap-2 flex-wrap">
        {["all",...classes].map(cls=>(
          <button key={cls} type="button" onClick={()=>setSelectedClass(cls)}
            className={"px-3 py-1.5 rounded-xl text-sm font-medium transition border " + (selectedClass===cls?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
            {cls==="all"?"전체":cls}
          </button>
        ))}
      </div>

      {/* 학생별 출결 */}
      <Card className="p-5 space-y-3">
        <div>
          <h2 className="text-lg font-bold">학생별 출결 현황</h2>
          <p className="text-xs text-slate-400 mt-0.5">수업일지에 행동태그가 입력된 수업 기준</p>
        </div>
        {studentStats.length === 0
          ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">데이터가 없습니다.</div>
          : <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {studentStats.map(s => (
                <div key={s.id} className="rounded-2xl border p-3 space-y-2 cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setCalendarModal({ student: s })}>
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-sm font-semibold truncate">{s.name}</div>
                    <div className={`rounded-xl px-2 py-0.5 text-xs font-bold ${rateColor(s.출석률)}`}>
                      {s.출석률 !== null ? s.출석률+"%" : "-"}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{s.className}</Badge>
                  <ProgressBar value={s.출석률??0}/>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                    <span>총 <b>{s.총수업}</b>회</span>
                    <span className="text-emerald-600">출석 <b>{s.출석}</b></span>
                    <span className="text-amber-600">지각 <b>{s.지각}</b></span>
                    <span className="text-red-500">결석 <b>{s.결석}</b></span>
                    {s.무단결석 > 0 && <span className="text-pink-600">무단 <b>{s.무단결석}</b></span>}
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
              <div className="mt-1 text-xs text-slate-400">미완료 {s.todayIncomplete} · {s.overdueHyun>0&&s.overdueSum>0?`현 ${s.overdueHyun}/추 ${s.overdueSum} 밀림`:s.overdueHyun>0?`현행 ${s.overdueHyun} 밀림`:s.overdueSum>0?`추가 ${s.overdueSum} 밀림`:"밀림 없음"}</div>
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
  const [chunkInputIdx, setChunkInputIdx] = useState(null);
  const [chunkInputVal, setChunkInputVal] = useState("");
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

  const toggleChunkDone = async (chunk, idx) => {
    // 입력 모드 중이면 row 클릭 무시
    if (chunkInputIdx === idx) return;
    const isYellow = !chunk.done && (chunk.completedAmount||0) > 0;
    if (isYellow) {
      // 노란색 → 안함
      try { await db.ref(`homeworks/${hw._key}/chunks/${idx}`).update({done:false, completedAmount:0, submittedAt:null}); }
      catch(err) { alert("저장 실패: "+err.message); }
    } else if (!chunk.done) {
      // 안함 → 완료
      const now = new Date();
      const submittedAt = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      try { await db.ref(`homeworks/${hw._key}/chunks/${idx}`).update({ done: true, completedAmount: chunk.plannedAmount, submittedAt }); }
      catch(err) { alert("저장 실패: "+err.message); }
      // isAuto 숙제: 완료된 청크의 endProblem 기준으로 진행 현황 기록
      if (hw.isAuto && hw.materialNodeId) {
        const allChunks = hw.chunks.map((c,i) => i===idx ? {...c, done:true} : c);
        const maxEnd = allChunks.filter(c=>c.done).reduce((m,c)=>Math.max(m, c.endProblem||0), chunk.endProblem);
        try {
          await db.ref(`studentProfiles/${hw.studentId}/materialProgress/${hw.materialNodeId}`).set({
            currentProblem: maxEnd + 1,
            completedAt: submittedAt,
          });
        } catch(e) { console.warn("materialProgress 저장 실패", e); }
      }
    } else {
      // 완료 → 노란색 (DB에 partial 상태로 저장, 입력 없이)
      try { await db.ref(`homeworks/${hw._key}/chunks/${idx}`).update({done:false, completedAmount:chunk.completedAmount||chunk.plannedAmount, submittedAt:null}); }
      catch(err) { alert("저장 실패: "+err.message); }
    }
  };

  const confirmChunkInput = async (chunk, idx) => {
    const amount = parseInt(chunkInputVal);
    if (isNaN(amount) || amount < 0) { setChunkInputIdx(null); setChunkInputVal(""); return; }
    try { await db.ref(`homeworks/${hw._key}/chunks/${idx}`).update({ done: false, completedAmount: amount, submittedAt: null }); }
    catch(err) { alert("저장 실패: "+err.message); }
    setChunkInputIdx(null);
    setChunkInputVal("");
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
                  {hw.hwType==="추가1"
                    ? <span className="text-xs font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-lg px-2 py-0.5">추가1</span>
                    : hw.hwType==="추가2"
                    ? <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2 py-0.5">추가2</span>
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
                  {["현행","추가1","추가2"].map(t=>(
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
          {(hw.chunks||[]).map((chunk, idx)=>{
            const isOverdue = !chunk.done && chunk.date < today;
            const isToday = chunk.date === today;
            const isYellow = !chunk.done && (chunk.completedAmount||0) > 0;
            const isInputMode = chunkInputIdx === idx;
            return (
              <div key={chunk.date}
                onClick={() => toggleChunkDone(chunk, idx)}
                className={"flex items-center justify-between rounded-xl px-3 py-2 text-xs transition " +
                  (isYellow||isInputMode ? "bg-amber-50 text-amber-700 cursor-pointer hover:opacity-80" :
                   chunk.done ? "bg-emerald-50 text-emerald-700 cursor-pointer hover:opacity-80" :
                   isOverdue ? "bg-red-50 text-red-600 cursor-pointer hover:opacity-80" :
                   isToday ? "bg-blue-50 text-blue-700 cursor-pointer hover:opacity-80" :
                   "bg-white text-slate-500 cursor-pointer hover:opacity-80")}>
                <span className="font-medium">{chunk.date}{isToday?" · 오늘":""}</span>
                <span>{chunk.startProblem}~{chunk.endProblem}번 ({chunk.plannedAmount}문제)</span>
                <span className="font-semibold w-40 text-right flex items-center justify-end gap-1">
                  {isInputMode ? (
                    <>
                      <input
                        type="number" min="0" max={chunk.plannedAmount}
                        value={chunkInputVal}
                        onChange={e => setChunkInputVal(e.target.value)}
                        onKeyDown={e => { e.stopPropagation(); if(e.key==="Enter") confirmChunkInput(chunk,idx); if(e.key==="Escape"){setChunkInputIdx(null);setChunkInputVal("");} }}
                        onClick={e => e.stopPropagation()}
                        className="w-14 border border-amber-300 rounded px-1 py-0.5 text-xs text-center bg-white"
                      />
                      <span className="text-amber-600">문제</span>
                      <button onClick={e=>{e.stopPropagation();confirmChunkInput(chunk,idx);}} className="text-amber-700 hover:text-amber-900 font-bold">✓</button>
                      <button onClick={e=>{e.stopPropagation();setChunkInputIdx(null);setChunkInputVal("");}} className="text-slate-400 hover:text-slate-600">✕</button>
                    </>
                  ) : isYellow ? (
                    <span onClick={e=>{e.stopPropagation();setChunkInputIdx(idx);setChunkInputVal(String(chunk.completedAmount));}}
                      className="underline decoration-dotted cursor-pointer">
                      {chunk.completedAmount}/{chunk.plannedAmount}문제
                    </span>
                  ) : chunk.done ? (
                    chunk.submittedAt ? "✓ "+chunk.submittedAt : "✓ 완료"
                  ) : isOverdue ? "⚠ 미완료" : "- 클릭해서 완료"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
