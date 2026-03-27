// ── 모의고사DB ────────────────────────────────────────────────────────────────

const MOCK_CURRICULUM = {
  "15개정": ["수학(상)","수학(하)","수학1","수학2","미적분","확률과통계","기하"],
  "22개정": ["공통수학1","공통수학2","대수","미적분1","확률과통계","미적분2"],
};
const MOCK_CURRS = ["15개정","22개정"];

// curriculumMap: { "15개정": "수학1", "22개정": "대수" } 형태
// 각 개정마다 해당 과목을 독립적으로 지정. "해당없음"은 과목값으로 사용.
// value = curriculumMap 객체, onChange(newMap)
function SubjectPicker({ value, onChange }) {
  const map = value || {};
  const btnBase = "px-2.5 py-1 text-xs rounded-lg border font-medium transition shrink-0";
  const selCls  = "rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300";

  const toggle = (c) => {
    const next = { ...map };
    if (next[c] !== undefined) delete next[c]; else next[c] = "";
    onChange(next);
  };
  const setSubject = (c, s) => onChange({ ...map, [c]: s });

  return (
    <div className="space-y-2">
      {MOCK_CURRS.map(c => (
        <div key={c} className="flex items-center gap-2">
          <button type="button" onClick={()=>toggle(c)}
            className={`${btnBase} w-16 ${map[c]!==undefined ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
            {c}
          </button>
          {map[c] !== undefined && (
            <select value={map[c]} onChange={e=>setSubject(c,e.target.value)} className={selCls}>
              <option value="">과목 선택</option>
              <option value="해당없음">해당없음</option>
              {(MOCK_CURRICULUM[c]||[]).map(s=><option key={s}>{s}</option>)}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
const MOCK_GRADES     = ["중1","중2","중3","고1","고2","고3"];
const MOCK_TYPES      = ["객관식","서술형","단답형"];
const MOCK_DIFFICULTY = ["상","중","하"];
const MOCK_MONTHS     = ["01","02","03","04","05","06","07","08","09","10","11","12"];

// ── 태그 관리 탭 ────────────────────────────────────────────────────────────
function TagManager({ tags }) {
  const [form, setForm] = React.useState({ name:"", curriculumMap:{} });
  const [saving, setSaving] = React.useState(false);

  const grouped = React.useMemo(() => {
    const g = {};
    Object.entries(tags).forEach(([id, t]) => {
      const pairs = Object.entries(t.curriculumMap || {})
        .map(([c,s]) => s ? `${c} ${s}` : c).join(", ") || "기타";
      if (!g[pairs]) g[pairs] = [];
      g[pairs].push({ id, ...t });
    });
    return g;
  }, [tags]);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await db.ref("mockTags").push({ name: form.name.trim(), curriculumMap: form.curriculumMap });
    setForm({ name:"", curriculumMap:{} });
    setSaving(false);
  };

  const del = async (id) => {
    if (!confirm("태그를 삭제할까요?")) return;
    await db.ref(`mockTags/${id}`).remove();
  };

  return (
    <div className="space-y-5">
      {/* 추가 폼 */}
      <Card className="p-4 space-y-3">
        <h3 className="font-bold text-sm">태그 추가</h3>
        <div className="flex gap-3 flex-wrap items-start">
          <div className="space-y-1">
            <Lbl>태그명 *</Lbl>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              onKeyDown={e=>e.key==="Enter"&&save()}
              placeholder="예: 이차함수"
              className="w-36 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
          </div>
          <div className="space-y-1">
            <Lbl>개정별 과목</Lbl>
            <SubjectPicker value={form.curriculumMap} onChange={v=>setForm(f=>({...f,curriculumMap:v}))}/>
          </div>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm rounded-xl bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 self-end">
            추가
          </button>
        </div>
      </Card>

      {/* 태그 목록 */}
      {Object.keys(grouped).length === 0
        ? <div className="text-sm text-slate-400 text-center py-8 border border-dashed rounded-xl">등록된 태그가 없습니다.</div>
        : Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).map(([subj, list]) => (
            <Card key={subj} className="p-4 space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{subj}</div>
              <div className="flex flex-wrap gap-2">
                {list.sort((a,b)=>a.name.localeCompare(b.name)).map(t => (
                  <div key={t.id} className="flex items-center gap-1 bg-slate-100 rounded-xl px-3 py-1.5">
                    <span className="text-sm text-slate-700">{t.name}</span>
                    <button onClick={()=>del(t.id)} className="text-slate-300 hover:text-red-500 text-xs leading-none ml-1">✕</button>
                  </div>
                ))}
              </div>
            </Card>
          ))
      }
    </div>
  );
}

// ── 문제 편집 모달 ───────────────────────────────────────────────────────────
function ProblemEditModal({ tags, initial, examId, onSave, onClose }) {
  const blankForm = {
    num:"", curriculumMap:{}, grade:"", year:"", month:"", source:"",
    type:"객관식", difficulty:"중", question:"", solution:"", tags:{}
  };
  const [form, setForm]   = React.useState(initial || blankForm);
  const [tab, setTab]     = React.useState("question");
  const [saving, setSaving] = React.useState(false);

  const f = (key, val) => setForm(p => ({...p, [key]: val}));

  const toggleTag = (id) => setForm(p => {
    const t = {...p.tags};
    if (t[id]) delete t[id]; else t[id] = true;
    return {...p, tags: t};
  });

  const save = async () => {
    if (!form.question.trim()) return;
    setSaving(true);
    const data = {
      ...form,
      num: parseInt(form.num) || null,
      updatedAt: new Date().toISOString()
    };
    let problemId = initial && initial.id;
    if (problemId) {
      await db.ref(`mockProblems/${problemId}`).update(data);
    } else {
      const ref = await db.ref("mockProblems").push({ ...data, createdAt: new Date().toISOString() });
      problemId = ref.key;
    }
    // 시험과 연결된 경우 problems 맵에 추가
    if (examId && !initial) {
      await db.ref(`mockExams/${examId}/problems/${problemId}`).set(form.num || true);
    }
    setSaving(false);
    onSave && onSave(problemId);
  };

  const tagsBySubj = React.useMemo(() => {
    const g = {};
    Object.entries(tags).forEach(([id,t]) => {
      const s = t.subject || "기타";
      if(!g[s]) g[s] = [];
      g[s].push({id,...t});
    });
    return g;
  }, [tags]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{maxWidth:"1100px", maxHeight:"92vh"}}
        onClick={e=>e.stopPropagation()}>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-bold text-base">{initial ? "문제 편집" : "새 문제 추가"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* 좌측: 메타 정보 */}
          <div className="w-56 border-r border-slate-100 p-4 space-y-3 overflow-y-auto shrink-0">
            <div className="space-y-1">
              <Lbl>문제번호</Lbl>
              <input type="number" value={form.num} onChange={e=>f("num",e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
            </div>
            <div className="space-y-1">
              <Lbl>개정별 과목</Lbl>
              <SubjectPicker value={form.curriculumMap} onChange={v=>f("curriculumMap",v)}/>
            </div>
            <div className="space-y-1">
              <Lbl>학년</Lbl>
              <select value={form.grade} onChange={e=>f("grade",e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                <option value="">선택</option>
                {MOCK_GRADES.map(g=><option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Lbl>연도</Lbl>
                <input value={form.year} onChange={e=>f("year",e.target.value)}
                  placeholder="2025"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
              </div>
              <div className="space-y-1">
                <Lbl>월</Lbl>
                <select value={form.month} onChange={e=>f("month",e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                  <option value="">-</option>
                  {MOCK_MONTHS.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Lbl>출처</Lbl>
              <input value={form.source} onChange={e=>f("source",e.target.value)}
                placeholder="예: 3월 모의고사"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Lbl>유형</Lbl>
                <select value={form.type} onChange={e=>f("type",e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                  {MOCK_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Lbl>난이도</Lbl>
                <select value={form.difficulty} onChange={e=>f("difficulty",e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                  {MOCK_DIFFICULTY.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* 태그 선택 */}
            <div className="space-y-2">
              <Lbl>태그</Lbl>
              {Object.keys(tagsBySubj).length === 0
                ? <div className="text-xs text-slate-400">태그 관리에서 먼저 등록하세요</div>
                : Object.entries(tagsBySubj).sort(([a],[b])=>a.localeCompare(b)).map(([subj, list]) => (
                    <div key={subj}>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{subj}</div>
                      <div className="flex flex-wrap gap-1">
                        {list.sort((a,b)=>a.name.localeCompare(b.name)).map(t => (
                          <button key={t.id} onClick={()=>toggleTag(t.id)}
                            className={`text-xs px-2 py-1 rounded-lg transition ${form.tags[t.id] ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* 우측: HTML 편집 + 미리보기 */}
          <div className="flex-1 flex flex-col min-w-0 p-4 space-y-3">
            {/* 탭 */}
            <div className="flex gap-1 border-b border-slate-100 shrink-0">
              {[["question","문제"],["solution","해설"]].map(([key,label])=>(
                <button key={key} onClick={()=>setTab(key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab===key ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
                  {label}
                  {key==="question" && form.question && <span className="ml-1.5 text-[10px] text-emerald-500">●</span>}
                  {key==="solution" && form.solution && <span className="ml-1.5 text-[10px] text-emerald-500">●</span>}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
              <div className="flex flex-col space-y-1">
                <Lbl>HTML 편집</Lbl>
                <textarea
                  value={tab==="question" ? form.question : form.solution}
                  onChange={e => { const v=e.target.value; f(tab, v); }}
                  placeholder={`<p>${tab==="question"?"문제":"해설"} 내용을 HTML로 입력</p>`}
                  className="flex-1 font-mono text-xs rounded-xl border border-slate-200 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
                  style={{minHeight:"300px"}}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <Lbl>미리보기</Lbl>
                <div className="flex-1 rounded-xl border border-slate-200 p-4 overflow-y-auto bg-white text-sm leading-relaxed"
                  style={{minHeight:"300px"}}
                  dangerouslySetInnerHTML={{__html: tab==="question" ? form.question : form.solution}}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100">취소</button>
          <button onClick={save} disabled={saving || !form.question.trim()}
            className="px-5 py-2 text-sm rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:opacity-40">
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 문제 목록 탭 ────────────────────────────────────────────────────────────
function ProblemListTab({ tags }) {
  const [problems, setProblems] = React.useState({});
  const [modal, setModal]       = React.useState(null); // null | "new" | { id, ...prob }
  // filterCurr: ""|"15개정"|"22개정", filterSubject: ""| 과목명
  const [filter, setFilter]     = React.useState({ filterCurr:"", filterSubject:"", grade:"", year:"", difficulty:"", tag:"" });

  React.useEffect(() => {
    const ref = db.ref("mockProblems");
    ref.on("value", snap => setProblems(snap.val() || {}));
    return () => ref.off();
  }, []);

  const del = async (id) => {
    if (!confirm("문제를 삭제할까요?")) return;
    await db.ref(`mockProblems/${id}`).remove();
  };

  const filtered = React.useMemo(() => {
    return Object.entries(problems).filter(([,p]) => {
      if (filter.filterCurr) {
        const pMap = p.curriculumMap || {};
        if (pMap[filter.filterCurr] === undefined) return false;
        if (filter.filterSubject && pMap[filter.filterCurr] !== filter.filterSubject) return false;
      }
      if (filter.grade     && p.grade     !== filter.grade)     return false;
      if (filter.year      && p.year      !== filter.year)      return false;
      if (filter.difficulty && p.difficulty !== filter.difficulty) return false;
      if (filter.tag       && !(p.tags && p.tags[filter.tag]))  return false;
      return true;
    }).sort(([,a],[,b]) => {
      const dc = (b.year||"").localeCompare(a.year||"");
      if (dc !== 0) return dc;
      return (a.num||0) - (b.num||0);
    });
  }, [problems, filter]);

  const tagList = Object.entries(tags).sort(([,a],[,b])=>a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      {/* 필터 바 */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Lbl>개정</Lbl>
            <select value={filter.filterCurr} onChange={e=>setFilter(f=>({...f,filterCurr:e.target.value,filterSubject:""}))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
              <option value="">전체</option>
              {MOCK_CURRS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          {filter.filterCurr && (
            <div className="space-y-1">
              <Lbl>과목</Lbl>
              <select value={filter.filterSubject} onChange={e=>setFilter(f=>({...f,filterSubject:e.target.value}))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                <option value="">전체</option>
                <option value="해당없음">해당없음</option>
                {(MOCK_CURRICULUM[filter.filterCurr]||[]).map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          {[
            ["grade",   "학년", ["", ...MOCK_GRADES]],
            ["difficulty","난이도",["","상","중","하"]],
          ].map(([key,label,opts])=>(
            <div key={key} className="space-y-1">
              <Lbl>{label}</Lbl>
              <select value={filter[key]} onChange={e=>setFilter(f=>({...f,[key]:e.target.value}))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                {opts.map(o=><option key={o} value={o}>{o||"전체"}</option>)}
              </select>
            </div>
          ))}
          <div className="space-y-1">
            <Lbl>태그</Lbl>
            <select value={filter.tag} onChange={e=>setFilter(f=>({...f,tag:e.target.value}))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
              <option value="">전체</option>
              {tagList.map(([id,t])=><option key={id} value={id}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Lbl>연도</Lbl>
            <input value={filter.year} onChange={e=>setFilter(f=>({...f,year:e.target.value}))}
              placeholder="예: 2025"
              className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
          </div>
          <div className="ml-auto flex items-end">
            <button onClick={()=>setModal("new")}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
              + 문제 추가
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400">{filtered.length}개 문제</div>
      </Card>

      {/* 문제 테이블 */}
      {filtered.length === 0
        ? <div className="text-sm text-slate-400 text-center py-10 border border-dashed rounded-xl">조건에 맞는 문제가 없습니다.</div>
        : <div className="space-y-2">
            {filtered.map(([id, p]) => (
              <Card key={id} className="p-4 hover:shadow-md transition cursor-pointer" onClick={()=>setModal({id,...p})}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-12 text-center">
                    <div className="text-lg font-bold text-slate-700">{p.num ?? "-"}</div>
                    <div className="text-[10px] text-slate-400">번</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {p.curriculumMap && Object.entries(p.curriculumMap).map(([c,s])=>(
                        <Badge key={c} gray>{c}{s?` ${s}`:""}</Badge>
                      ))}
                      {p.grade      && <Badge>{p.grade}</Badge>}
                      {(p.year||p.month) && <Badge>{[p.year,p.month].filter(Boolean).join("-")}</Badge>}
                      {p.source     && <Badge gray>{p.source}</Badge>}
                      {p.type       && <Badge gray>{p.type}</Badge>}
                      {p.difficulty && <Badge color={p.difficulty==="상"?"red":p.difficulty==="하"?"blue":"yellow"}>{p.difficulty}</Badge>}
                    </div>
                    {p.tags && Object.keys(p.tags).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(p.tags).map(tid => tags[tid] && (
                          <span key={tid} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">{tags[tid].name}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1.5 text-xs text-slate-400 truncate"
                      dangerouslySetInnerHTML={{__html: (p.question||"").replace(/<[^>]+>/g,"").slice(0,80)+"…"}}/>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.question?"bg-indigo-100 text-indigo-600":"bg-slate-100 text-slate-400"}`}>문제</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.solution?"bg-emerald-100 text-emerald-600":"bg-slate-100 text-slate-400"}`}>해설</span>
                  </div>
                  <button onClick={e=>{e.stopPropagation();del(id);}}
                    className="shrink-0 text-slate-300 hover:text-red-500 text-sm">✕</button>
                </div>
              </Card>
            ))}
          </div>
      }

      {modal && (
        <ProblemEditModal
          tags={tags}
          initial={modal==="new" ? null : modal}
          onSave={() => setModal(null)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── 작은 뱃지 헬퍼 ──────────────────────────────────────────────────────────
function Badge({ children, gray, color }) {
  const cls = gray
    ? "bg-slate-100 text-slate-500"
    : color==="red" ? "bg-red-100 text-red-600"
    : color==="blue" ? "bg-blue-100 text-blue-600"
    : color==="yellow" ? "bg-amber-100 text-amber-700"
    : "bg-slate-800 text-white";
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cls}`}>{children}</span>;
}

// ── 시험 목록 탭 ────────────────────────────────────────────────────────────
function ExamListTab({ tags }) {
  const [exams, setExams]       = React.useState({});
  const [allProblems, setAllProblems] = React.useState({});
  const [selId, setSelId]       = React.useState(null);
  const [addingExam, setAddingExam] = React.useState(false);
  const [examForm, setExamForm] = React.useState({ title:"", year:"", month:"", grade:"" });
  const [probModal, setProbModal] = React.useState(false);

  React.useEffect(() => {
    const r1 = db.ref("mockExams");
    r1.on("value", snap => setExams(snap.val() || {}));
    const r2 = db.ref("mockProblems");
    r2.on("value", snap => setAllProblems(snap.val() || {}));
    return () => { r1.off(); r2.off(); };
  }, []);

  const saveExam = async () => {
    if (!examForm.title.trim()) return;
    const ref = await db.ref("mockExams").push({ ...examForm, createdAt: new Date().toISOString() });
    setExamForm({ title:"", year:"", month:"", grade:"" });
    setAddingExam(false);
    setSelId(ref.key);
  };

  const delExam = async (id) => {
    if (!confirm("시험을 삭제할까요?")) return;
    await db.ref(`mockExams/${id}`).remove();
    if (selId === id) setSelId(null);
  };

  const linkProblem = async (problemId) => {
    if (!selId) return;
    const p = allProblems[problemId];
    await db.ref(`mockExams/${selId}/problems/${problemId}`).set(p?.num || true);
    setProbModal(false);
  };

  const unlinkProblem = async (problemId) => {
    await db.ref(`mockExams/${selId}/problems/${problemId}`).remove();
  };

  const selExam = exams[selId];
  const linkedIds = selExam?.problems ? Object.keys(selExam.problems) : [];
  const unlinkedProblems = Object.entries(allProblems).filter(([id]) => !linkedIds.includes(id));

  return (
    <div className="flex gap-4 items-start">
      {/* 시험 목록 */}
      <Card className="p-4 space-y-3 shrink-0" style={{width:"260px"}}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">시험 목록</h3>
          <button onClick={()=>setAddingExam(v=>!v)}
            className="px-3 py-1.5 text-xs rounded-xl bg-slate-900 text-white hover:bg-slate-700">+ 추가</button>
        </div>

        {addingExam && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            {[["title","시험 제목 *",""],["source","출처",""],].map(([k,l,ph])=>(
              <div key={k} className="space-y-1">
                <Lbl>{l}</Lbl>
                <input value={examForm[k]||""} onChange={e=>setExamForm(f=>({...f,[k]:e.target.value}))}
                  placeholder={ph}
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Lbl>학년</Lbl>
                <select value={examForm.grade} onChange={e=>setExamForm(f=>({...f,grade:e.target.value}))}
                  className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-sm bg-white focus:outline-none">
                  <option value="">-</option>
                  {MOCK_GRADES.map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Lbl>연도</Lbl>
                <input value={examForm.year} onChange={e=>setExamForm(f=>({...f,year:e.target.value}))}
                  placeholder="2025"
                  className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-sm focus:outline-none"/>
              </div>
              <div className="space-y-1">
                <Lbl>월</Lbl>
                <select value={examForm.month} onChange={e=>setExamForm(f=>({...f,month:e.target.value}))}
                  className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-sm bg-white focus:outline-none">
                  <option value="">-</option>
                  {MOCK_MONTHS.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setAddingExam(false)} className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100">취소</button>
              <button onClick={saveExam} className="px-3 py-1.5 text-xs rounded-xl bg-slate-900 text-white hover:bg-slate-700">저장</button>
            </div>
          </div>
        )}

        {Object.entries(exams).length === 0
          ? <div className="text-xs text-slate-400 text-center py-4">시험이 없습니다.</div>
          : <div className="space-y-1">
              {Object.entries(exams)
                .sort(([,a],[,b])=>(b.year||"").localeCompare(a.year||"") || (b.month||"").localeCompare(a.month||""))
                .map(([id,ex])=>(
                <div key={id} onClick={()=>setSelId(id)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition ${selId===id?"bg-slate-900 text-white":"bg-slate-50 hover:bg-slate-100 text-slate-700"}`}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{ex.title}</div>
                    <div className={`text-[10px] ${selId===id?"text-white/60":"text-slate-400"}`}>
                      {[ex.grade, ex.year&&ex.month?`${ex.year}.${ex.month}`:ex.year].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();delExam(id);}}
                    className={`text-xs ml-2 shrink-0 ${selId===id?"text-white/40 hover:text-white":"text-slate-300 hover:text-red-500"}`}>✕</button>
                </div>
              ))}
            </div>
        }
      </Card>

      {/* 선택된 시험의 문제 목록 */}
      {selExam ? (
        <Card className="flex-1 p-4 space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">{selExam.title}</h3>
              <span className="text-xs text-slate-400">{linkedIds.length}문제 연결됨</span>
            </div>
            <button onClick={()=>setProbModal(true)}
              className="px-3 py-1.5 text-sm rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
              + 문제 연결
            </button>
          </div>

          {linkedIds.length === 0
            ? <div className="text-sm text-slate-400 text-center py-8 border border-dashed rounded-xl">연결된 문제가 없습니다.</div>
            : <div className="space-y-2">
                {linkedIds
                  .map(id => allProblems[id] ? [id, allProblems[id]] : null)
                  .filter(Boolean)
                  .sort(([,a],[,b]) => (a.num||0)-(b.num||0))
                  .map(([id,p]) => (
                    <div key={id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 bg-slate-50">
                      <span className="font-bold text-slate-700 w-8 shrink-0">{p.num??"-"}번</span>
                      <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                        {p.curriculumMap && Object.entries(p.curriculumMap).map(([c,s])=>(
                          <Badge key={c} gray>{c}{s?` ${s}`:""}</Badge>
                        ))}
                        {p.difficulty && <Badge color={p.difficulty==="상"?"red":p.difficulty==="하"?"blue":"yellow"}>{p.difficulty}</Badge>}
                        {p.tags && Object.keys(p.tags).map(tid=>tags[tid]&&(
                          <span key={tid} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">{tags[tid].name}</span>
                        ))}
                      </div>
                      <button onClick={()=>unlinkProblem(id)} className="text-slate-300 hover:text-red-500 text-xs shrink-0">연결해제</button>
                    </div>
                  ))
                }
              </div>
          }

          {/* 문제 연결 모달 */}
          {probModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={()=>setProbModal(false)}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[80vh] flex flex-col"
                onClick={e=>e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">문제 연결</h3>
                  <button onClick={()=>setProbModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-2">
                  {unlinkedProblems.length === 0
                    ? <div className="text-sm text-slate-400 text-center py-6">연결할 수 있는 문제가 없습니다.</div>
                    : unlinkedProblems
                        .sort(([,a],[,b])=>(a.num||0)-(b.num||0))
                        .map(([id,p])=>(
                          <div key={id} onClick={()=>linkProblem(id)}
                            className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition">
                            <span className="font-bold text-slate-700 w-8">{p.num??"-"}번</span>
                            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                              {p.curriculumMap && Object.entries(p.curriculumMap).map(([c,s])=>(
                                <Badge key={c} gray>{c}{s?` ${s}`:""}</Badge>
                              ))}
                              {p.grade && <Badge gray>{p.grade}</Badge>}
                              {p.difficulty && <Badge color={p.difficulty==="상"?"red":p.difficulty==="하"?"blue":"yellow"}>{p.difficulty}</Badge>}
                              {p.tags && Object.keys(p.tags).map(tid=>tags[tid]&&(
                                <span key={tid} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">{tags[tid].name}</span>
                              ))}
                            </div>
                          </div>
                        ))
                  }
                </div>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400 py-16">
          좌측에서 시험을 선택하세요.
        </div>
      )}
    </div>
  );
}

// ── 메인 MockExamManager ─────────────────────────────────────────────────────
function MockExamManager() {
  const [tab, setTab]   = React.useState("problems");
  const [tags, setTags] = React.useState({});

  React.useEffect(() => {
    const ref = db.ref("mockTags");
    ref.on("value", snap => setTags(snap.val() || {}));
    return () => ref.off();
  }, []);

  const TABS = [["problems","📄 문제DB"],["exams","📋 시험목록"],["tagmgr","🏷️ 태그관리"]];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 bg-white rounded-2xl shadow-sm p-1">
        {TABS.map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition ${tab===key?"bg-slate-900 text-white":"text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab==="problems" && <ProblemListTab tags={tags}/>}
      {tab==="exams"    && <ExamListTab    tags={tags}/>}
      {tab==="tagmgr"   && <TagManager     tags={tags}/>}
    </div>
  );
}
