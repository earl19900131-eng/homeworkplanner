// ── 학생 마이페이지 ───────────────────────────────────────────────────────────
const GRADE_ROWS = [
  { label: "중1-1",    mid: "중1-1-a",    fin: "중1-1-b" },
  { label: "중2-1",    mid: "중2-1-a",    fin: "중2-1-b" },
  { label: "중3-1",    mid: "중3-1-a",    fin: "중3-1-b" },
  { label: "중3-2",    mid: "중3-2-a",    fin: "중3-2-b" },
  { label: "공통수학1", mid: "공통수학1-a", fin: "공통수학1-b" },
  { label: "공통수학2", mid: "공통수학2-a", fin: "공통수학2-b" },
  { label: "대수",     mid: "대수-a",     fin: "대수-b" },
  { label: "미적분1",  mid: "미적분1-a",  fin: "미적분1-b" },
  { label: "기하",     mid: "기하-a",     fin: "기하-b" },
  { label: "미적분",   mid: "미적분-a",   fin: "미적분-b" },
  { label: "확통",     mid: "확통-a",     fin: "확통-b" },
];

function gradeFromBirthYear(birthYear) {
  if (!birthYear) return null;
  const currentYear = new Date().getFullYear();
  const koreanAge = currentYear - Number(birthYear) + 1;
  return { 14:"중1", 15:"중2", 16:"중3", 17:"고1", 18:"고2", 19:"고3" }[koreanAge] || null;
}

const scoreColor = (v) => {
  if (v === undefined || v === "") return "text-slate-400";
  const n = Number(v);
  if (n >= 90) return "text-emerald-600 font-bold";
  if (n >= 70) return "text-blue-600 font-bold";
  if (n >= 50) return "text-amber-600 font-bold";
  return "text-red-600 font-bold";
};

function StudentProfileTab({ studentId, studentName }) {
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const ref = db.ref(`studentProfiles/${studentId}`);
    ref.on("value", snap => {
      const data = snap.val() || { school: "", birthYear: "", grades: {}, locked: false };
      setProfile(data);
      setDraft({ school: data.school || "", birthYear: data.birthYear || "", grades: { ...(data.grades||{}) } });
    });
    return () => ref.off();
  }, [studentId]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await db.ref(`studentProfiles/${studentId}`).update({ school: draft.school, birthYear: draft.birthYear, grades: draft.grades });
      const grade = gradeFromBirthYear(draft.birthYear);
      if (grade) await db.ref(`students/${studentId}/className`).set(grade);
      setEditing(false);
    } catch(e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  const cancelEdit = () => {
    setDraft({ school: profile.school||"", birthYear: profile.birthYear||"", grades: {...(profile.grades||{})} });
    setEditing(false);
  };

  if (!profile || !draft) return <div className="text-sm text-slate-400 text-center py-8">불러오는 중...</div>;

  const locked = profile.locked;
  const autoGrade = gradeFromBirthYear(editing ? draft.birthYear : profile.birthYear);

  return (
    <div className="space-y-4">
      {locked && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 text-sm text-emerald-700 font-medium">
          🔒 선생님이 프로필을 확정했습니다. 수정하려면 선생님에게 문의하세요.
        </div>
      )}

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">기본 정보</h2>
          {!locked && !editing && <Btn size="sm" variant="outline" onClick={()=>setEditing(true)}>수정</Btn>}
          {!locked && editing && (
            <div className="flex gap-1.5">
              <Btn size="sm" onClick={handleSave} disabled={saving}>{saving?"저장 중...":"저장"}</Btn>
              <Btn size="sm" variant="outline" onClick={cancelEdit}>취소</Btn>
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Lbl>이름</Lbl>
            <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">{studentName}</div>
          </div>
          <div className="space-y-1.5">
            <Lbl>학교</Lbl>
            {editing
              ? <Inp value={draft.school} onChange={e=>setDraft(p=>({...p,school:e.target.value}))} placeholder="학교명 입력"/>
              : <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">{profile.school || <span className="text-slate-400">미입력</span>}</div>
            }
          </div>
          <div className="space-y-1.5">
            <Lbl>출생연도</Lbl>
            {editing
              ? <Inp type="number" value={draft.birthYear} onChange={e=>setDraft(p=>({...p,birthYear:e.target.value}))} placeholder="예: 2010"/>
              : <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">{profile.birthYear || <span className="text-slate-400">미입력</span>}</div>
            }
          </div>
          <div className="space-y-1.5">
            <Lbl>학년</Lbl>
            <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700 font-medium">
              {autoGrade || <span className="text-slate-400">-</span>}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">학교 성적</h2>
            <p className="text-xs text-slate-400 mt-0.5">0~100점 입력</p>
          </div>
          {!locked && !editing && <Btn size="sm" variant="outline" onClick={()=>setEditing(true)}>수정</Btn>}
        </div>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 w-28">과목</th>
                <th className="text-center px-3 py-2 text-xs font-bold text-slate-500 w-20">중간</th>
                <th className="text-center px-3 py-2 text-xs font-bold text-slate-500 w-20">기말</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {GRADE_ROWS.map(row => {
                const midVal = editing ? draft.grades[row.mid] ?? "" : profile.grades?.[row.mid] ?? "";
                const finVal = editing ? draft.grades[row.fin] ?? "" : profile.grades?.[row.fin] ?? "";
                return (
                  <tr key={row.label} className="hover:bg-slate-50/50">
                    <td className="px-3 py-1.5 text-xs font-medium text-slate-600">{row.label}</td>
                    <td className="px-2 py-1.5 text-center">
                      {editing
                        ? <input type="number" min="0" max="100" value={midVal}
                            onChange={e=>setDraft(p=>({...p,grades:{...p.grades,[row.mid]:e.target.value}}))}
                            className="w-16 text-center rounded-lg border border-slate-200 px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"/>
                        : <span className={`text-xs ${scoreColor(midVal)}`}>{midVal !== "" ? midVal : "-"}</span>
                      }
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {editing
                        ? <input type="number" min="0" max="100" value={finVal}
                            onChange={e=>setDraft(p=>({...p,grades:{...p.grades,[row.fin]:e.target.value}}))}
                            className="w-16 text-center rounded-lg border border-slate-200 px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"/>
                        : <span className={`text-xs ${scoreColor(finVal)}`}>{finVal !== "" ? finVal : "-"}</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {editing && (
          <div className="flex justify-end gap-2 pt-1">
            <Btn onClick={handleSave} disabled={saving}>{saving?"저장 중...":"저장"}</Btn>
            <Btn variant="outline" onClick={cancelEdit}>취소</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}

function StudentMyPage({ studentHW, studentName, studentId, today }) {
  const [tab, setTab] = useState("stats");
  const [viewMode, setViewMode] = useState("monthly");

  const allChunks = studentHW.flatMap(hw => (hw.chunks||[]).map(c => ({...c, hwTitle: hw.title})));
  const pastChunks = allChunks.filter(c => c.date <= today);

  const monthlyData = useMemo(() => {
    const map = {};
    pastChunks.forEach(c => {
      const ym = c.date.slice(0,7);
      if (!map[ym]) map[ym] = { total: 0, done: 0 };
      map[ym].total++;
      if (c.done) map[ym].done++;
    });
    return Object.entries(map).sort().map(([ym, v]) => ({
      label: ym.replace("-","년 ")+"월",
      rate: v.total > 0 ? Math.round(v.done/v.total*100) : 0,
      done: v.done, total: v.total
    }));
  }, [pastChunks]);

  const dailyData = useMemo(() => {
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today, -i);
      const dayChunks = allChunks.filter(c => c.date === d);
      if (dayChunks.length === 0) { result.push({ label: d.slice(5), date: d, rate: null, done: 0, total: 0 }); continue; }
      const done = dayChunks.filter(c => c.done).length;
      result.push({ label: d.slice(5), date: d, rate: Math.round(done/dayChunks.length*100), done, total: dayChunks.length });
    }
    return result;
  }, [allChunks, today]);

  const totalDone = allChunks.filter(c => c.done && c.date <= today).length;
  const totalPast = allChunks.filter(c => c.date <= today).length;
  const overallRate = totalPast > 0 ? Math.round(totalDone/totalPast*100) : 0;
  const daysAllDone = dailyData.filter(d => d.total > 0 && d.rate === 100).length;

  const barColor = (rate) => {
    if (rate === null) return "bg-slate-100";
    if (rate === 100) return "bg-emerald-400";
    if (rate >= 50) return "bg-amber-400";
    return "bg-red-400";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 bg-slate-100 rounded-2xl p-1">
        {[["stats","📊 학습 통계"],["profile","👤 내 정보"]].map(([t,l]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={"flex-1 py-2 text-sm font-medium rounded-xl transition " + (tab===t?"bg-white shadow-sm":"text-slate-500 hover:text-slate-700")}>
            {l}
          </button>
        ))}
      </div>

      {tab === "stats" && (
        <div className="space-y-5">
          <div className="grid gap-3 grid-cols-3">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{overallRate}%</div>
              <div className="text-xs text-slate-500 mt-1">전체 이행률</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{daysAllDone}</div>
              <div className="text-xs text-slate-500 mt-1">완벽한 날 (30일)</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{studentHW.length}</div>
              <div className="text-xs text-slate-500 mt-1">등록 숙제 수</div>
            </Card>
          </div>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">숙제 이행률</h2>
              <div className="flex gap-1 bg-slate-100 rounded-xl p-0.5">
                {[["monthly","월별"],["daily","일별(30일)"]].map(([m,l]) => (
                  <button key={m} type="button" onClick={() => setViewMode(m)}
                    className={"px-3 py-1.5 text-xs font-medium rounded-lg transition " + (viewMode===m?"bg-white shadow-sm":"text-slate-500")}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {viewMode === "monthly" && (
              monthlyData.length === 0
                ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">아직 데이터가 없습니다.</div>
                : <div className="space-y-3">
                    {monthlyData.map(d => (
                      <div key={d.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{d.label}</span>
                          <span className="text-slate-500 text-xs">{d.done}/{d.total}일 · <span className="font-bold text-slate-800">{d.rate}%</span></span>
                        </div>
                        <div className="h-6 bg-slate-100 rounded-xl overflow-hidden">
                          <div className={"h-full rounded-xl transition-all " + barColor(d.rate)} style={{width: d.rate+"%"}}/>
                        </div>
                      </div>
                    ))}
                  </div>
            )}

            {viewMode === "daily" && (
              <div>
                <div className="flex items-end gap-0.5 h-32">
                  {dailyData.map(d => (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className={"w-full rounded-sm transition-all " + barColor(d.rate)}
                        style={{height: d.rate !== null ? Math.max(d.rate, 4)+"%" : "4%", opacity: d.total===0?0.2:1}}
                        title={d.total===0 ? d.date+" (숙제없음)" : `${d.date} ${d.rate}% (${d.done}/${d.total})`}/>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>{dailyData[0]?.label}</span>
                  <span>{dailyData[14]?.label}</span>
                  <span>{dailyData[29]?.label}</span>
                </div>
                <div className="flex gap-3 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400 inline-block"/>100%</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block"/>50~99%</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block"/>1~49%</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 inline-block"/>숙제없음</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "profile" && (
        <StudentProfileTab studentId={studentId} studentName={studentName}/>
      )}
    </div>
  );
}
