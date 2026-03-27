// ── 모의고사DB ────────────────────────────────────────────────────────────────

function MockExamManager() {
  const [exams, setExams]       = React.useState({});
  const [selExamId, setSelExamId] = React.useState(null);
  const [problems, setProblems] = React.useState({});
  const [selNum, setSelNum]     = React.useState(null);   // 편집 중인 문제번호
  const [editMode, setEditMode] = React.useState(false);  // 문제 편집 패널 열림

  // 시험 폼
  const [examForm, setExamForm] = React.useState({ title:"", subject:"", year:"" });
  const [addingExam, setAddingExam] = React.useState(false);

  // 문제 편집 폼
  const [probForm, setProbForm] = React.useState({ num:"", question:"", solution:"" });
  const [preview, setPreview]   = React.useState("question"); // "question" | "solution"

  // ── 시험 목록 로드
  React.useEffect(() => {
    const ref = db.ref("mockExams");
    ref.on("value", snap => setExams(snap.val() || {}));
    return () => ref.off();
  }, []);

  // ── 선택된 시험의 문제 로드
  React.useEffect(() => {
    if (!selExamId) { setProblems({}); return; }
    const ref = db.ref(`mockExamProblems/${selExamId}`);
    ref.on("value", snap => setProblems(snap.val() || {}));
    return () => ref.off();
  }, [selExamId]);

  // ── 시험 저장
  const saveExam = async () => {
    if (!examForm.title.trim()) return;
    const id = "exam-" + Date.now();
    await db.ref(`mockExams/${id}`).set({
      title:   examForm.title.trim(),
      subject: examForm.subject.trim(),
      year:    examForm.year.trim(),
      createdAt: new Date().toISOString()
    });
    setExamForm({ title:"", subject:"", year:"" });
    setAddingExam(false);
    setSelExamId(id);
  };

  // ── 시험 삭제
  const deleteExam = async (id) => {
    if (!confirm("시험을 삭제할까요? 모든 문제가 함께 삭제됩니다.")) return;
    await db.ref(`mockExams/${id}`).remove();
    await db.ref(`mockExamProblems/${id}`).remove();
    if (selExamId === id) { setSelExamId(null); setEditMode(false); }
  };

  // ── 문제 저장
  const saveProb = async () => {
    const num = parseInt(probForm.num);
    if (!selExamId || !num || isNaN(num)) return;
    await db.ref(`mockExamProblems/${selExamId}/${num}`).set({
      num,
      question: probForm.question,
      solution: probForm.solution,
      updatedAt: new Date().toISOString()
    });
    setEditMode(false);
    setSelNum(null);
  };

  // ── 문제 삭제
  const deleteProb = async (num) => {
    if (!confirm(`${num}번 문제를 삭제할까요?`)) return;
    await db.ref(`mockExamProblems/${selExamId}/${num}`).remove();
    if (selNum === num) { setEditMode(false); setSelNum(null); }
  };

  // ── 문제 편집 열기
  const openEdit = (num) => {
    const p = problems[num] || {};
    setProbForm({ num: String(num), question: p.question || "", solution: p.solution || "" });
    setSelNum(num);
    setPreview("question");
    setEditMode(true);
  };

  // ── 새 문제 추가
  const openNew = () => {
    const nums = Object.keys(problems).map(Number);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    setProbForm({ num: String(next), question: "", solution: "" });
    setSelNum(null);
    setPreview("question");
    setEditMode(true);
  };

  const sortedNums = Object.keys(problems).map(Number).sort((a,b)=>a-b);
  const selExam    = exams[selExamId];

  return (
    <div className="space-y-4">
      {/* ── 상단: 시험 목록 ── */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">모의고사 목록</h2>
          <button onClick={() => setAddingExam(v => !v)}
            className="px-3 py-1.5 text-sm font-medium rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition">
            + 시험 추가
          </button>
        </div>

        {/* 시험 추가 폼 */}
        {addingExam && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-3 sm:col-span-1">
                <Lbl>시험 제목 *</Lbl>
                <input value={examForm.title} onChange={e=>setExamForm(f=>({...f,title:e.target.value}))}
                  placeholder="예: 2025년 3월 고1 모의고사"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
              </div>
              <div className="space-y-1">
                <Lbl>과목</Lbl>
                <input value={examForm.subject} onChange={e=>setExamForm(f=>({...f,subject:e.target.value}))}
                  placeholder="예: 수학"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
              </div>
              <div className="space-y-1">
                <Lbl>연도/시기</Lbl>
                <input value={examForm.year} onChange={e=>setExamForm(f=>({...f,year:e.target.value}))}
                  placeholder="예: 2025-03"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setAddingExam(false)}
                className="px-4 py-1.5 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100">취소</button>
              <button onClick={saveExam}
                className="px-4 py-1.5 text-sm rounded-xl bg-slate-900 text-white hover:bg-slate-700">저장</button>
            </div>
          </div>
        )}

        {/* 시험 카드 목록 */}
        {Object.keys(exams).length === 0
          ? <div className="text-sm text-slate-400 text-center py-6 border border-dashed rounded-xl">등록된 시험이 없습니다.</div>
          : <div className="flex flex-wrap gap-2">
              {Object.entries(exams)
                .sort(([,a],[,b]) => (b.createdAt||"").localeCompare(a.createdAt||""))
                .map(([id, ex]) => (
                <div key={id}
                  onClick={() => { setSelExamId(id); setEditMode(false); setSelNum(null); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition text-sm ${selExamId===id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"}`}>
                  <span className="font-medium">{ex.title}</span>
                  {ex.subject && <span className={`text-xs px-1.5 py-0.5 rounded ${selExamId===id?"bg-white/20":"bg-slate-100 text-slate-500"}`}>{ex.subject}</span>}
                  {ex.year && <span className={`text-xs ${selExamId===id?"text-white/60":"text-slate-400"}`}>{ex.year}</span>}
                  <button onClick={e=>{e.stopPropagation(); deleteExam(id);}}
                    className={`ml-1 text-xs leading-none ${selExamId===id?"text-white/60 hover:text-white":"text-slate-300 hover:text-red-500"}`}>✕</button>
                </div>
              ))}
            </div>
        }
      </Card>

      {/* ── 하단: 문제 관리 ── */}
      {selExam && (
        <div className="flex gap-4 items-start">

          {/* 문제 목록 패널 */}
          <Card className="p-4 space-y-3 flex-shrink-0" style={{width: editMode ? "200px" : "100%"}}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{selExam.title}</h3>
                <span className="text-xs text-slate-400">{sortedNums.length}문제 등록됨</span>
              </div>
              <button onClick={openNew}
                className="px-3 py-1.5 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition">
                + 문제 추가
              </button>
            </div>

            {sortedNums.length === 0
              ? <div className="text-sm text-slate-400 text-center py-8 border border-dashed rounded-xl">
                  문제를 추가해주세요.
                </div>
              : <div className={`grid gap-2 ${editMode ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"}`}>
                  {sortedNums.map(num => {
                    const p = problems[num];
                    const hasQ = !!(p && p.question);
                    const hasS = !!(p && p.solution);
                    return (
                      <div key={num}
                        className={`rounded-xl border p-3 cursor-pointer transition ${selNum===num && editMode ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-400 bg-white"}`}>
                        <div className="flex items-center justify-between">
                          <button onClick={() => openEdit(num)}
                            className="font-bold text-sm text-slate-800">{num}번</button>
                          <button onClick={() => deleteProb(num)}
                            className="text-xs text-slate-300 hover:text-red-500">✕</button>
                        </div>
                        {!editMode && (
                          <div className="flex gap-1 mt-1.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${hasQ ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>문제</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${hasS ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>해설</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
            }
          </Card>

          {/* 문제 편집 패널 */}
          {editMode && (
            <Card className="p-4 space-y-4 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">
                  {selNum ? `${selNum}번 문제 편집` : "새 문제 추가"}
                </h3>
                <button onClick={() => { setEditMode(false); setSelNum(null); }}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
              </div>

              {/* 문제 번호 (신규만) */}
              {!selNum && (
                <div className="space-y-1">
                  <Lbl>문제 번호 *</Lbl>
                  <input type="number" value={probForm.num} onChange={e=>setProbForm(f=>({...f,num:e.target.value}))}
                    className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
                </div>
              )}

              {/* 탭: 문제 / 해설 */}
              <div className="flex gap-1 border-b border-slate-100">
                {[["question","문제"],["solution","해설"]].map(([key,label])=>(
                  <button key={key} onClick={()=>setPreview(key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition ${preview===key ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* HTML 편집 + 미리보기 */}
              <div className="grid grid-cols-2 gap-3" style={{minHeight:"360px"}}>
                {/* 편집 */}
                <div className="space-y-1 flex flex-col">
                  <Lbl>HTML 편집</Lbl>
                  <textarea
                    value={preview==="question" ? probForm.question : probForm.solution}
                    onChange={e => {
                      const val = e.target.value;
                      setProbForm(f => preview==="question" ? {...f, question:val} : {...f, solution:val});
                    }}
                    placeholder={`<p>문제 내용을 HTML로 입력하세요</p>\n<img src="..." />`}
                    className="flex-1 font-mono text-xs rounded-xl border border-slate-200 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
                    style={{minHeight:"320px"}}
                  />
                </div>
                {/* 미리보기 */}
                <div className="space-y-1 flex flex-col">
                  <Lbl>미리보기</Lbl>
                  <div className="flex-1 rounded-xl border border-slate-200 p-3 overflow-y-auto bg-white text-sm"
                    style={{minHeight:"320px"}}
                    dangerouslySetInnerHTML={{__html: preview==="question" ? probForm.question : probForm.solution}}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => { setEditMode(false); setSelNum(null); }}
                  className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100">취소</button>
                <button onClick={saveProb}
                  className="px-4 py-2 text-sm rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-medium">저장</button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
