// ── 메인 앱 ──────────────────────────────────────────────────────────────────
function App() {
  const [students, setStudents] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(() => sessionStorage.getItem(SESSION_KEY));
  const [loginRole, setLoginRole] = useState("student");
  const [studentLoginId, setStudentLoginId] = useState("");
  const [loginSecret, setLoginSecret] = useState("");
  const [loginError, setLoginError] = useState("");
  const [materials, setMaterials] = useState([]);
  const [activeTab, setActiveTab] = useState("today");
  const [editingHW, setEditingHW] = useState(null); // { key, form }
  const [deleteConfirmHW, setDeleteConfirmHW] = useState(null);
  const [teacherTab, setTeacherTab] = useState("dashboard");
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [overdueGradeFilter, setOverdueGradeFilter] = useState("all");
  const [teacherViewId, setTeacherViewId] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [today, setToday] = useState(todayString);

  useEffect(() => { const id = setInterval(()=>setToday(todayString()),60000); return ()=>clearInterval(id); }, []);

  useEffect(() => {
    let loaded = { s: false, h: false };
    const check = () => { if (loaded.s && loaded.h) setLoading(false); };
    const sRef = db.ref("students");
    sRef.on("value", snap => {
      const data = snap.val();
      setStudents(data ? Object.values(data).sort((a,b)=>a.className.localeCompare(b.className)||a.name.localeCompare(b.name)) : []);
      loaded.s = true; check();
    });
    const hRef = db.ref("homeworks");
    hRef.on("value", snap => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([key,val])=>({...val,_key:key,chunks:val.chunks?Object.values(val.chunks):[]}));
        arr.sort((a,b)=>b.id-a.id);
        setHomeworks(arr);
      } else setHomeworks([]);
      loaded.h = true; check();
    });
    const mRef = db.ref("materials");
    mRef.on("value", snap => {
      const data = snap.val();
      setMaterials(data ? Object.values(data) : []);
    });
    return () => { sRef.off(); hRef.off(); mRef.off(); };
  }, []);

  useEffect(() => {
    if (currentUserId) sessionStorage.setItem(SESSION_KEY, currentUserId);
    else sessionStorage.removeItem(SESSION_KEY);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || currentUserId===TEACHER.id) return;
    if (students.length>0 && !students.find(s=>s.id===currentUserId)) setCurrentUserId(null);
  }, [students, currentUserId]);

  useEffect(() => { if (students.length>0 && !studentLoginId) setStudentLoginId(students[0].id); }, [students]);

  useEffect(() => {
    if (!currentStudent) return;
    const saved = localStorage.getItem('lastSubject_' + currentStudent.id);
    if (saved) setForm(f => ({...f, subject: saved}));
  }, [currentStudent?.id]);

  const currentUser = currentUserId===TEACHER.id ? TEACHER : students.find(s=>s.id===currentUserId)??null;
  const currentStudent = currentUser && currentUser.id!==TEACHER.id ? currentUser : null;
  const currentTeacher = currentUser?.id===TEACHER.id ? TEACHER : null;

  const hwByStudent = useMemo(()=>homeworks.reduce((acc,hw)=>{ (acc[hw.studentId]||(acc[hw.studentId]=[])).push(hw); return acc; },{}), [homeworks]);

  const teacherStats = useMemo(()=>students.map(s=>{
    const items=hwByStudent[s.id]??[];
    let total=0,done=0,overdue=0,todayInc=0;
    items.forEach(hw=>(hw.chunks||[]).forEach(c=>{ total++; if(c.done) done++; if(!c.done&&c.date<today) overdue++; if(!c.done&&c.date===today) todayInc++; }));
    return {...s,homeworkCount:items.length,totalChunks:total,doneChunks:done,overdueChunks:overdue,todayIncomplete:todayInc,progress:total>0?Math.round(done/total*100):0};
  }),[students,hwByStudent,today]);

  const teacherDash = useMemo(()=>({
    totalStudents:students.length,
    activeStudents:teacherStats.filter(s=>s.homeworkCount>0).length,
    incompleteToday:teacherStats.filter(s=>s.todayIncomplete>0).length,
    dangerStudents:teacherStats.filter(s=>s.overdueChunks>=1).length,
  }),[teacherStats,students.length]);

  const selectedTeacherStudent = teacherViewId==="all"?null:students.find(s=>s.id===teacherViewId)??null;
  const selectedTeacherHW = useMemo(() => {
    if (selectedTeacherStudent) return hwByStudent[selectedTeacherStudent.id]??[];
    let hws = homeworks;
    if (gradeFilter !== "all") hws = hws.filter(hw => students.find(s=>s.id===hw.studentId)?.className === gradeFilter);
    if (subjectFilter !== "all") hws = hws.filter(hw => hw.subject === subjectFilter);
    return hws;
  }, [selectedTeacherStudent, homeworks, gradeFilter, subjectFilter, hwByStudent, students]);
  const studentHW = currentStudent?hwByStudent[currentStudent.id]??[]:[];
  const todayTasks = studentHW.flatMap(hw=>(hw.chunks||[]).filter(c=>c.date===today).map(c=>({...c,hwKey:hw._key,title:hw.title,subject:hw.subject})));
  const overdueTasks = studentHW.flatMap(hw=>(hw.chunks||[]).filter(c=>c.date<today&&!c.done).map(c=>({...c,hwKey:hw._key,title:hw.title,subject:hw.subject})));

  const streak = useMemo(()=>{
    const doneDates=new Set(studentHW.flatMap(hw=>(hw.chunks||[])).filter(c=>c.done).map(c=>c.date));
    const startFrom=doneDates.has(today)?today:addDays(today,-1);
    let count=0; const cur=new Date(startFrom);
    while(doneDates.has(formatDate(cur))){ count++; cur.setDate(cur.getDate()-1); }
    return count;
  },[studentHW,today]);

  const previewChunks = useMemo(()=>(!form.totalAmount||!form.startDate||!form.dueDate)?[]:splitHomework({...form, customDates: form.selectedDates}),[form]);

  const handleCreate = async () => {
    if (!currentStudent) return;
    if (!form.title.trim()) { setFormError("숙제명을 입력해 주세요."); return; }
    if (!form.totalAmount||!form.startDate||!form.dueDate) { setFormError("총 문제 수, 시작일, 마감일을 모두 입력해 주세요."); return; }
    const chunks = splitHomework({...form, customDates: form.selectedDates});
    if (!chunks.length) { setFormError("기간이나 최대 문제 수를 조정해 주세요."); return; }
    const id = Date.now();
    setSaving(true);
    try {
      await db.ref(`homeworks/${id}`).set({ id, title:form.title.trim(), subject:form.subject||"수학", studentId:currentStudent.id, studentName:currentStudent.name, totalAmount:Number(form.totalAmount), startDate:form.startDate, dueDate:form.dueDate, includeWeekend:form.includeWeekend, dailyMax:form.dailyMax?Number(form.dailyMax):null, createdAt:today, chunks });
      localStorage.setItem('lastSubject_' + currentStudent.id, form.subject);
      const savedSubject = form.subject;
      setForm({...defaultForm(), subject: savedSubject}); setFormError(""); setActiveTab("today");
    } catch(e) { setFormError("저장 실패: "+e.message); }
    setSaving(false);
  };

  const toggleDone = async (hwKey, date) => {
    const hw=homeworks.find(h=>h._key===hwKey); if(!hw) return;
    const idx=(hw.chunks||[]).findIndex(c=>c.date===date); if(idx===-1) return;
    const chunk=hw.chunks[idx]; const done=!chunk.done;
    const now = new Date();
    const submittedAt = done
      ? `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`
      : null;
    try { await db.ref(`homeworks/${hwKey}/chunks/${idx}`).update({done, completedAmount:done?chunk.plannedAmount:0, submittedAt}); }
    catch(e) { alert("저장 실패: "+e.message); }
  };

  const redistribute = async (hwKey) => {
    const hw=homeworks.find(h=>h._key===hwKey); if(!hw) return;
    const updated=redistributeHomework(hw,today);
    setSaving(true);
    try { await db.ref(`homeworks/${hwKey}/chunks`).set(updated.chunks); }
    catch(e) { alert("저장 실패: "+e.message); }
    setSaving(false);
  };

  const handleUpdateHW = async () => {
    if (!editingHW) return;
    const { key, form: ef } = editingHW;
    if (!ef.title.trim()) { alert("숙제명을 입력해 주세요."); return; }
    if (!ef.totalAmount || !ef.startDate || !ef.dueDate) { alert("총 문제 수, 시작일, 마감일을 모두 입력해 주세요."); return; }
    const newChunks = splitHomework({...ef, customDates: ef.selectedDates});
    if (!newChunks.length) { alert("기간이나 최대 문제 수를 조정해 주세요."); return; }
    const oldChunks = homeworks.find(h=>h._key===key)?.chunks || [];
    const doneMap = {};
    oldChunks.forEach(c => { if (c.done) doneMap[c.date] = c; });
    const mergedChunks = newChunks.map(c => doneMap[c.date] ? {...c, done: true, completedAmount: doneMap[c.date].completedAmount, submittedAt: doneMap[c.date].submittedAt} : c);
    setSaving(true);
    try {
      await db.ref(`homeworks/${key}`).update({ title: ef.title.trim(), subject: ef.subject, totalAmount: Number(ef.totalAmount), startDate: ef.startDate, dueDate: ef.dueDate, includeWeekend: ef.includeWeekend, dailyMax: ef.dailyMax ? Number(ef.dailyMax) : null, chunks: mergedChunks });
      setEditingHW(null);
    } catch(e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  const handleDeleteHW = async (hwKey) => {
    setSaving(true);
    try { await db.ref(`homeworks/${hwKey}`).remove(); setDeleteConfirmHW(null); }
    catch(e) { alert("삭제 실패: " + e.message); }
    setSaving(false);
  };

  const loginAsTeacher = () => {
    if(loginSecret!==TEACHER.password) { setLoginError("비밀번호가 올바르지 않습니다."); return; }
    setCurrentUserId(TEACHER.id); setLoginSecret(""); setLoginError("");
    registerFCMToken(TEACHER.id, "teacher");
  };
  const logout = () => { setCurrentUserId(null); setLoginSecret(""); setLoginError(""); setFormError(""); };

  if (loading) return <Spinner />;

  // ── 로그인 화면 ─────────────────────────────────────────────────────────────
  if (!currentUser) return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <Card className="p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">숙제 소분 플래너</h1>
              <p className="mt-1 text-sm text-slate-500">학생이 숙제를 직접 등록하면 매일 할 양으로 자동 분배됩니다.</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs text-emerald-600 font-medium">Firebase 연결됨</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">실시간 동기화</Badge>
            </div>
          </div>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold">로그인</h2>
              <p className="text-sm text-slate-500 mt-1">학생은 이름을 타이핑해서 선택 후 PIN 입력, 선생님은 관리자 비밀번호를 입력합니다.</p>
            </div>
            <div className="flex gap-2 bg-slate-100 rounded-2xl p-1">
              {["student","teacher"].map(r=>(
                <button key={r} onClick={()=>{setLoginRole(r);setLoginSecret("");setLoginError("");}}
                  className={`flex-1 py-2 text-sm font-medium rounded-xl transition ${loginRole===r?"bg-white shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
                  {r==="student"?"학생":"선생님"}
                </button>
              ))}
            </div>

            {loginRole==="student" ? (
              <div className="space-y-4">
                {students.length===0
                  ? <AlertBox className="bg-amber-50 text-amber-700">⚠️ 등록된 학생이 없습니다. 선생님 계정으로 먼저 학생을 추가해 주세요.</AlertBox>
                  : <StudentLoginForm students={students} onLogin={(id)=>{setCurrentUserId(id);setLoginError("");registerFCMToken(id,"student");}} loginError={loginError} setLoginError={setLoginError}/>
                }
              </div>
            ) : (
              <div className="space-y-4">
                <AlertBox className="bg-slate-50 text-slate-700">🛡️ 학생 현황 확인 및 학생 추가/삭제를 할 수 있는 관리자 화면입니다.</AlertBox>
                <div className="space-y-2">
                  <Lbl>관리자 비밀번호</Lbl>
                  <Inp type="password" value={loginSecret} onChange={e=>setLoginSecret(e.target.value)} placeholder="관리자 비밀번호" onKeyDown={e=>e.key==="Enter"&&loginAsTeacher()}/>
                </div>
                {loginError&&<AlertBox className="bg-red-50 text-red-700">{loginError}</AlertBox>}
                <Btn onClick={loginAsTeacher} className="w-full">선생님 로그인</Btn>
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-3">
            <h2 className="text-xl font-bold">시작하는 방법</h2>
            {[["1️⃣ 선생님 먼저 로그인","관리자 비밀번호로 로그인합니다."],
              ["2️⃣ 학생 관리 탭","학생 이름, 반, PIN을 입력해 학생을 추가합니다."],
              ["3️⃣ 학생에게 공유","이 페이지 주소를 학생들에게 공유합니다."],
              ["4️⃣ 학생 로그인","학생은 본인 이름 선택 + PIN으로 접속합니다."],
              ["5️⃣ 숙제 등록 & 체크","학생이 숙제 등록하면 선생님 화면에 실시간 반영됩니다."]
            ].map(([t,d])=>(
              <div key={t} className="rounded-2xl border p-3">
                <div className="text-sm font-semibold">{t}</div>
                <div className="text-xs text-slate-500 mt-0.5">{d}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );

  // ── 로그인 후 화면 ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <Card className="p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">숙제 소분 플래너</h1>
                <Badge>{currentTeacher?"선생님":"학생"}</Badge>
                {saving&&<span className="text-xs text-slate-400 animate-pulse">저장 중...</span>}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {currentTeacher?`${TEACHER.name} · 관리자`:`${currentStudent?.name} (${currentStudent?.className})`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 bg-slate-100 rounded-2xl px-3 py-1.5">📅 {today}</span>
              <Btn variant="outline" onClick={logout}>로그아웃</Btn>
            </div>
          </div>
        </Card>

        {/* ── 선생님 ── */}
        {currentTeacher && (
          <div className="space-y-4">
            <div className="flex gap-2 bg-white rounded-2xl shadow-sm p-1">
              {[["dashboard","📊 현황"],["stats","📈 통계"],["students","👥 학생 관리"],["curriculum","📚 커리큘럼"]].map(([tab,label])=>(
                <button key={tab} onClick={()=>setTeacherTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition ${teacherTab===tab?"bg-slate-900 text-white":"text-slate-500 hover:text-slate-700"}`}>
                  {label}
                </button>
              ))}
            </div>

            {showOverdueModal && (() => {
              const GRADES = ["중1","중2","중3","고1","고2","고3"];
              const overdueList = teacherStats.filter(s=>s.overdueChunks>=1);
              const filtered = overdueGradeFilter==="all" ? overdueList : overdueList.filter(s=>s.className===overdueGradeFilter);
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={()=>setShowOverdueModal(false)}>
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4 flex flex-col"
                    style={{resize:"vertical", overflow:"hidden", minHeight:"260px", maxHeight:"90vh"}}
                    onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center justify-between shrink-0">
                      <h2 className="text-lg font-bold">⚠️ 밀린 학생 목록</h2>
                      <button onClick={()=>setShowOverdueModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
                    </div>
                    <div className="flex gap-2 flex-wrap shrink-0">
                      <button onClick={()=>setOverdueGradeFilter("all")} className={`px-3 py-1 rounded-xl text-sm font-medium border transition ${overdueGradeFilter==="all"?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>전체</button>
                      {GRADES.map(g=>(
                        <button key={g} onClick={()=>setOverdueGradeFilter(g)} className={`px-3 py-1 rounded-xl text-sm font-medium border transition ${overdueGradeFilter===g?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>{g}</button>
                      ))}
                    </div>
                    {filtered.length===0
                      ? <div className="text-sm text-slate-400 text-center py-6 shrink-0">해당 학년에 밀린 학생이 없습니다.</div>
                      : <div className="space-y-2 overflow-y-auto flex-1">
                          {filtered.map(s=>(
                            <div key={s.id} className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3">
                              <div>
                                <span className="font-semibold text-sm">{s.name}</span>
                                <span className="ml-2 text-xs text-slate-400 bg-slate-200 rounded px-1.5 py-0.5">{s.className}</span>
                              </div>
                              <span className="text-sm text-red-600 font-medium">밀림 {s.overdueChunks}개</span>
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                </div>
              );
            })()}

            {teacherTab==="dashboard" && (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <SummaryCard title="전체 학생" value={`${teacherDash.totalStudents}명`} description="등록된 학생 수" icon="👥"/>
                  <SummaryCard title="숙제 입력 학생" value={`${teacherDash.activeStudents}명`} description="숙제를 한 번 이상 등록" icon="📖"/>
                  <SummaryCard title="오늘 미완료" value={`${teacherDash.incompleteToday}명`} description="오늘 할 양 미체크" icon="⏰"/>
                  <div className="cursor-pointer" onClick={()=>{setShowOverdueModal(true);setOverdueGradeFilter("all");}}><SummaryCard title="밀린 학생" value={`${teacherDash.dangerStudents}명`} description="클릭해서 목록 보기" icon="⚠️"/></div>
                </div>
                <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
                  <Card className="p-5 space-y-3">
                    <h2 className="text-lg font-bold">학생별 진행 현황</h2>
                    {teacherStats.length===0
                      ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">학생 관리 탭에서 학생을 먼저 추가해 주세요.</div>
                      : <ClassGroupList teacherStats={teacherStats} teacherViewId={teacherViewId} setTeacherViewId={setTeacherViewId} homeworks={homeworks} gradeFilter={gradeFilter} setGradeFilter={setGradeFilter} subjectFilter={subjectFilter} setSubjectFilter={setSubjectFilter}/>
                    }
                  </Card>
                  <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold">상세 보기</h2>
                        <p className="text-sm text-slate-500">{selectedTeacherStudent?`${selectedTeacherStudent.name} 학생의 숙제 목록`:"학생을 선택하세요"}</p>
                      </div>
                      <Btn variant={teacherViewId==="all"?"default":"outline"} size="sm" onClick={()=>setTeacherViewId("all")}>전체</Btn>
                    </div>
                    {selectedTeacherHW.length===0
                      ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">아직 숙제가 없습니다.</div>
                      : selectedTeacherHW.map(hw=>{
                        const done=(hw.chunks||[]).filter(c=>c.done).length;
                        const pct=hw.chunks?.length>0?Math.round(done/hw.chunks.length*100):0;
                        return(
                          <TeacherHWCard key={hw._key} hw={hw} done={done} pct={pct} today={today}/>
                        );
                      })
                    }
                  </Card>
                </div>
              </div>
            )}

            {teacherTab==="stats" && <TeacherStatsTab students={students} homeworks={homeworks} today={today}/>}
            {teacherTab==="students" && <StudentManager students={students} homeworks={homeworks}/>}
            {teacherTab==="curriculum" && <CurriculumManager students={students} materials={materials}/>}
          </div>
        )}

        {/* ── 학생 ── */}
        {currentStudent && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryCard title="오늘 할 숙제" value={`${todayTasks.length}개`} description="오늘 배정된 숙제 수" icon="📖"/>
              <SummaryCard title="밀린 숙제" value={`${overdueTasks.length}개`} description="완료 못한 지난 날짜 숙제" icon="⚠️"/>
              <SummaryCard title="연속 수행일" value={`${streak}일`} description="매일 체크하는 습관 지표" icon="🔥"/>
            </div>

            <Card className="p-3">
              <div className="flex gap-2 bg-slate-100 rounded-2xl p-1 mb-4">
                {[["today","오늘"],["create","등록"],["all","전체"],["curriculum","커리큘럼"],["mypage","마이페이지"]].map(([tab,label])=>(
                  <button key={tab} onClick={()=>setActiveTab(tab)}
                    className={`flex-1 py-2 text-sm font-medium rounded-xl transition ${activeTab===tab?"bg-white shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {activeTab==="today" && (
                <div className="space-y-4">
                  <div><h2 className="text-lg font-bold">오늘 해야 할 숙제</h2><p className="text-sm text-slate-500">완료 체크하면 선생님 화면에 즉시 반영됩니다.</p></div>
                  <div className="space-y-3">
                    {todayTasks.length===0
                      ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">오늘 배정된 숙제가 없습니다.</div>
                      : todayTasks.map(task=>(
                        <div key={`${task.hwKey}-${task.date}`} className={`rounded-2xl border p-4 ${task.done?"bg-emerald-50 border-emerald-200":""}`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{task.title}</span>
                                <Badge variant="secondary">{task.subject}</Badge>
                                {task.done&&<Badge variant="success">✓ 완료</Badge>}
                              </div>
                              <p className="mt-1 text-sm text-slate-600">오늘은 {task.startProblem}번 ~ {task.endProblem}번 ({task.plannedAmount}문제)</p>
                            </div>
                            <Btn variant={task.done?"outline":"default"} onClick={()=>toggleDone(task.hwKey,task.date)}>
                              {task.done?"완료 취소":"완료 체크"}
                            </Btn>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  {overdueTasks.length>0&&<AlertBox className="bg-amber-50 text-amber-700">⚠️ 밀린 숙제가 있습니다. <b>전체 탭</b>에서 자동 재분배를 눌러보세요.</AlertBox>}
                </div>
              )}

              {activeTab==="create" && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div><h2 className="text-lg font-bold">숙제 직접 등록</h2><p className="text-sm text-slate-500">공지된 숙제를 입력하면 하루 분량이 자동 계산됩니다.</p></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2"><Lbl>숙제명</Lbl><Inp value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="예: 수학 숙제 1~30번"/></div>
                      <div className="space-y-1.5"><Lbl>과목</Lbl>
                        <select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}
                          className="w-full rounded-xl border border-input px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                          {["중1-1","중1-2","중2-1","중2-2","중3-1","중3-2","공통수학1","공통수학2","대수","미적분1","기하","미적분","확률과통계"].map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5"><Lbl>총 문제 수</Lbl><Inp type="number" value={form.totalAmount} onChange={e=>setForm({...form,totalAmount:e.target.value})} placeholder="30"/></div>
                      <div className="space-y-1.5"><Lbl>시작일</Lbl><Inp type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value,selectedDates:null})}/></div>
                      <div className="space-y-1.5"><Lbl>마감일</Lbl><Inp type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value,selectedDates:null})}/></div>
                      <div className="space-y-1.5"><Lbl>하루 최대 문제 수</Lbl><Inp type="number" value={form.dailyMax} onChange={e=>setForm({...form,dailyMax:e.target.value})} placeholder="선택 입력"/></div>
                      <div className="flex items-center gap-3 rounded-2xl border bg-slate-50 p-3">
                        <input type="checkbox" id="weekend" checked={form.includeWeekend} onChange={e=>setForm({...form,includeWeekend:e.target.checked,selectedDates:null})} className="w-4 h-4 cursor-pointer"/>
                        <label htmlFor="weekend" className="text-sm font-medium cursor-pointer">주말 포함</label>
                      </div>
                    </div>
                    {form.startDate && form.dueDate && (
                      <DatePicker
                        startDate={form.startDate}
                        dueDate={form.dueDate}
                        includeWeekend={form.includeWeekend}
                        selectedDates={form.selectedDates}
                        onChange={(dates) => setForm(f => ({...f, selectedDates: dates}))}
                      />
                    )}
                    {formError&&<AlertBox className="bg-red-50 text-red-700">{formError}</AlertBox>}
                    <Btn onClick={handleCreate} className="w-full" disabled={saving}>{saving?"저장 중...":"숙제 등록"}</Btn>
                  </div>
                  <div className="space-y-3">
                    <div><h2 className="text-lg font-bold">분배 미리보기</h2><p className="text-sm text-slate-500">입력한 조건으로 하루 분량을 실시간 확인합니다.</p></div>
                    {previewChunks.length===0
                      ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">문제 수와 날짜를 입력하면 여기에 표시됩니다.</div>
                      : <div className="space-y-2">
                          {previewChunks.map(c=>(
                            <div key={c.date} className="flex items-center justify-between rounded-2xl border bg-slate-50 px-4 py-2.5 text-sm">
                              <span className="text-slate-600">{c.date}</span>
                              <span className="font-medium">{c.startProblem}~{c.endProblem}번</span>
                              <Badge variant="secondary">{c.plannedAmount}문제</Badge>
                            </div>
                          ))}
                          <div className="text-right text-xs text-slate-400 pt-1">총 {previewChunks.reduce((s,c)=>s+c.plannedAmount,0)}문제 · {previewChunks.length}일</div>
                        </div>
                    }
                  </div>
                </div>
              )}

              {activeTab==="all" && (
                <div className="space-y-4">
                  <div><h2 className="text-lg font-bold">등록된 숙제 전체</h2><p className="text-sm text-slate-500">밀린 숙제는 자동 재분배로 남은 날짜에 다시 나눌 수 있습니다.</p></div>
                  {studentHW.length===0
                    ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">아직 등록된 숙제가 없습니다.</div>
                    : studentHW.map(hw=>{
                      const doneCount=(hw.chunks||[]).filter(c=>c.done).length;
                      const pct=hw.chunks?.length>0?Math.round(doneCount/hw.chunks.length*100):0;
                      const hasOverdue=(hw.chunks||[]).some(c=>!c.done&&c.date<today);
                      const isEditing = editingHW?.key === hw._key;
                      const isDeleting = deleteConfirmHW === hw._key;
                      const ef = editingHW?.form;
                      return(
                        <div key={hw._key} className={`rounded-2xl border bg-white p-4 space-y-3 ${isDeleting?"border-red-300":""}`}>
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{hw.title}</span>
                                <Badge variant="outline">{hw.subject}</Badge>
                                {hasOverdue&&<Badge variant="destructive">밀림</Badge>}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">{hw.startDate} ~ {hw.dueDate} · 총 {hw.totalAmount}문제</div>
                              <div className="mt-2"><ProgressBar value={pct}/></div>
                              <div className="text-xs text-slate-400 mt-1">{doneCount}/{hw.chunks?.length||0}일 완료 ({pct}%)</div>
                            </div>
                            <div className="flex gap-1.5 flex-wrap shrink-0">
                              {hasOverdue&&<Btn variant="outline" size="sm" onClick={()=>redistribute(hw._key)} disabled={saving}>재분배</Btn>}
                              {!isDeleting && !isEditing && <Btn variant="outline" size="sm" onClick={()=>setEditingHW({key:hw._key, form:{title:hw.title,subject:hw.subject,totalAmount:hw.totalAmount,startDate:hw.startDate,dueDate:hw.dueDate,includeWeekend:hw.includeWeekend||false,dailyMax:hw.dailyMax||"",selectedDates:null}})}>수정</Btn>}
                              {!isDeleting && !isEditing && <Btn variant="danger" size="sm" onClick={()=>setDeleteConfirmHW(hw._key)}>삭제</Btn>}
                              {isDeleting && <>
                                <span className="text-xs text-red-600 self-center">삭제할까요?</span>
                                <Btn variant="danger" size="sm" onClick={()=>handleDeleteHW(hw._key)} disabled={saving}>확인</Btn>
                                <Btn variant="outline" size="sm" onClick={()=>setDeleteConfirmHW(null)}>취소</Btn>
                              </>}
                              {isEditing && <>
                                <Btn size="sm" onClick={handleUpdateHW} disabled={saving}>{saving?"저장 중...":"저장"}</Btn>
                                <Btn variant="outline" size="sm" onClick={()=>setEditingHW(null)}>취소</Btn>
                              </>}
                            </div>
                          </div>
                          {isEditing && ef && (
                            <div className="border-t pt-3 space-y-2">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1 sm:col-span-2"><Lbl>숙제명</Lbl><Inp value={ef.title} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,title:e.target.value}}))} /></div>
                                <div className="space-y-1"><Lbl>과목</Lbl>
                                  <select value={ef.subject} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,subject:e.target.value}}))}
                                    className="w-full rounded-xl border border-input px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                                    {["중1-1","중1-2","중2-1","중2-2","중3-1","중3-2","공통수학1","공통수학2","대수","미적분1","기하","미적분","확률과통계"].map(s=><option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                                <div className="space-y-1"><Lbl>총 문제 수</Lbl><Inp type="number" value={ef.totalAmount} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,totalAmount:e.target.value}}))} /></div>
                                <div className="space-y-1"><Lbl>시작일</Lbl><Inp type="date" value={ef.startDate} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,startDate:e.target.value,selectedDates:null}}))} /></div>
                                <div className="space-y-1"><Lbl>마감일</Lbl><Inp type="date" value={ef.dueDate} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,dueDate:e.target.value,selectedDates:null}}))} /></div>
                                <div className="space-y-1"><Lbl>하루 최대 문제 수</Lbl><Inp type="number" value={ef.dailyMax} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,dailyMax:e.target.value}}))} placeholder="선택"/></div>
                                <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2">
                                  <input type="checkbox" id={`weekend-${hw._key}`} checked={ef.includeWeekend} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,includeWeekend:e.target.checked,selectedDates:null}}))} className="w-4 h-4 cursor-pointer"/>
                                  <label htmlFor={`weekend-${hw._key}`} className="text-sm font-medium cursor-pointer">주말 포함</label>
                                </div>
                              </div>
                            </div>
                          )}
                          {!isEditing && <div className="space-y-1">
                            {(hw.chunks||[]).map(chunk=>{
                              const isOverdue=!chunk.done&&chunk.date<today;
                              const isToday=chunk.date===today;
                              return(
                                <button key={chunk.date} type="button" onClick={()=>toggleDone(hw._key,chunk.date)}
                                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition text-left ${chunk.done?"bg-emerald-50 text-emerald-700":isOverdue?"bg-red-50 text-red-700":isToday?"bg-blue-50 text-blue-700":"bg-slate-50 text-slate-600"}`}>
                                  <span>{chunk.date}{isToday?" · 오늘":""}</span>
                                  <span className="font-medium">{chunk.startProblem}~{chunk.endProblem}번 ({chunk.plannedAmount}문제) {chunk.done?"✓":isOverdue?"⚠":""}</span>
                                </button>
                              );
                            })}
                          </div>}
                        </div>
                      );
                    })
                  }
                </div>
              )}

              {activeTab==="curriculum" && (
                <StudentCurriculumView studentId={currentStudent.id}/>
              )}

              {activeTab==="mypage" && (
                <StudentMyPage studentHW={studentHW} studentName={currentStudent?.name} studentId={currentStudent?.id} currentPin={currentStudent?.pin} today={today}/>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
