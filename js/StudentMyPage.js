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

const gradeColor = (v) => {
  if (!v) return "text-slate-400";
  const s = String(v).toUpperCase();
  if (s === "A" || s === "1") return "text-emerald-600 font-bold";
  if (s === "B" || s === "2" || s === "3") return "text-blue-600 font-bold";
  if (s === "C" || s === "4" || s === "5") return "text-amber-600 font-bold";
  return "text-red-600 font-bold";
};

function StudentProfileTab({ studentId, studentName, currentPin, teacherMode = false }) {
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [draftName, setDraftName] = useState(studentName);
  const [saving, setSaving] = useState(false);
  const [pinForm, setPinForm] = useState({ current: "", next: "", confirm: "" });
  const [pinMsg, setPinMsg] = useState(null); // { type: "ok"|"err", text }
  const [editing, setEditing] = useState(teacherMode);

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
      if (teacherMode && draftName.trim()) await db.ref(`students/${studentId}/name`).set(draftName.trim());
      if (!teacherMode) setEditing(false);
    } catch(e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  const handlePinChange = async () => {
    setPinMsg(null);
    if (pinForm.current !== currentPin) { setPinMsg({ type:"err", text:"현재 비밀번호가 틀렸습니다." }); return; }
    if (pinForm.next.length < 4) { setPinMsg({ type:"err", text:"새 비밀번호는 4자리 이상이어야 합니다." }); return; }
    if (pinForm.next !== pinForm.confirm) { setPinMsg({ type:"err", text:"새 비밀번호가 일치하지 않습니다." }); return; }
    try {
      await db.ref(`students/${studentId}/pin`).set(pinForm.next);
      setPinMsg({ type:"ok", text:"비밀번호가 변경되었습니다." });
      setPinForm({ current:"", next:"", confirm:"" });
    } catch(e) { setPinMsg({ type:"err", text:"저장 실패: "+e.message }); }
  };

  const cancelEdit = () => {
    setDraft({ school: profile.school||"", birthYear: profile.birthYear||"", grades: {...(profile.grades||{})} });
    setDraftName(studentName);
    if (!teacherMode) setEditing(false);
  };

  if (!profile || !draft) return <div className="text-sm text-slate-400 text-center py-8">불러오는 중...</div>;

  const locked = !teacherMode && profile.locked;
  const canEdit = teacherMode || !locked;
  const autoGrade = gradeFromBirthYear(editing ? draft.birthYear : profile.birthYear);

  const prevXp    = Number(profile.prevSeasonXp || 0);
  const season3Xp = Number(profile.season3Xp || 0);
  const allXp     = prevXp + season3Xp;
  const level     = Math.floor(1.25 * Math.sqrt(Math.max(allXp, 0)));
  const tier      = season3Xp >= 600 ? "마스터"
                  : season3Xp >= 350 ? "다이아"
                  : season3Xp >= 200 ? "플래티넘"
                  : season3Xp >= -50 ? "골드"
                  : season3Xp >= -200 ? "실버"
                  : "브론즈";
  const tierColor = tier === "마스터"   ? "text-purple-600 bg-purple-50 border-purple-200"
                  : tier === "다이아"   ? "text-cyan-500 bg-cyan-50 border-cyan-200"
                  : tier === "플래티넘" ? "text-teal-500 bg-teal-50 border-teal-200"
                  : tier === "골드"     ? "text-yellow-500 bg-yellow-50 border-yellow-200"
                  : tier === "실버"     ? "text-slate-400 bg-slate-50 border-slate-200"
                  :                      "text-orange-400 bg-orange-50 border-orange-200";

  return (
    <div className="space-y-4">
      {!teacherMode && (
        <Card className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className={`px-3 py-1 rounded-xl border font-bold text-sm ${tierColor}`}>{tier}</div>
            <div className="text-slate-700 font-bold text-lg">Lv. {level}</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-2xl p-3 text-center">
              <div className="text-xs text-slate-400 mb-1">이전 시즌 XP</div>
              <div className="text-base font-bold text-slate-600">{prevXp >= 0 ? "+" : ""}{prevXp}</div>
            </div>
            <div className="bg-blue-50 rounded-2xl p-3 text-center">
              <div className="text-xs text-blue-400 mb-1">현재 시즌 XP</div>
              <div className={`text-base font-bold ${season3Xp >= 0 ? "text-blue-600" : "text-red-500"}`}>{season3Xp >= 0 ? "+" : ""}{season3Xp}</div>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-3 text-center">
              <div className="text-xs text-emerald-400 mb-1">누적 XP</div>
              <div className={`text-base font-bold ${allXp >= 0 ? "text-emerald-600" : "text-red-500"}`}>{allXp >= 0 ? "+" : ""}{allXp}</div>
            </div>
          </div>
        </Card>
      )}
      {locked && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 text-sm text-emerald-700 font-medium">
          🔒 선생님이 프로필을 확정했습니다. 수정하려면 선생님에게 문의하세요.
        </div>
      )}

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">기본 정보</h2>
          {canEdit && !teacherMode && !editing && <Btn size="sm" variant="outline" onClick={()=>setEditing(true)}>수정</Btn>}
          {canEdit && !teacherMode && editing && (
            <div className="flex gap-1.5">
              <Btn size="sm" onClick={handleSave} disabled={saving}>{saving?"저장 중...":"저장"}</Btn>
              <Btn size="sm" variant="outline" onClick={cancelEdit}>취소</Btn>
            </div>
          )}
          {teacherMode && (
            <Btn size="sm" onClick={handleSave} disabled={saving}>{saving?"저장 중...":"저장"}</Btn>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Lbl>이름</Lbl>
            {teacherMode
              ? <Inp value={draftName} onChange={e=>setDraftName(e.target.value)}/>
              : <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">{studentName}</div>
            }
          </div>
          <div className="space-y-1.5">
            <Lbl>학교</Lbl>
            {(editing || teacherMode)
              ? <Inp value={draft.school} onChange={e=>setDraft(p=>({...p,school:e.target.value}))} placeholder="학교명 입력"/>
              : <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">{profile.school || <span className="text-slate-400">미입력</span>}</div>
            }
          </div>
          <div className="space-y-1.5">
            <Lbl>출생연도</Lbl>
            {(editing || teacherMode)
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
          <h2 className="text-lg font-bold">학교 성적</h2>
          {!locked && !editing && <Btn size="sm" variant="outline" onClick={()=>setEditing(true)}>수정</Btn>}
        </div>
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-xs min-w-[560px]">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-3 py-2 font-bold text-slate-500 w-24" rowSpan={2}>과목</th>
                <th className="text-center px-2 py-1.5 font-bold text-slate-600 border-l border-slate-200" colSpan={3}>중간</th>
                <th className="text-center px-2 py-1.5 font-bold text-slate-600 border-l border-slate-200" colSpan={3}>기말</th>
              </tr>
              <tr className="bg-slate-50 border-b">
                <th className="text-center px-2 py-1 font-medium text-slate-400 border-l border-slate-200 w-16">원점수</th>
                <th className="text-center px-2 py-1 font-medium text-slate-400 w-14">등수</th>
                <th className="text-center px-2 py-1 font-medium text-slate-400 w-14">등급</th>
                <th className="text-center px-2 py-1 font-medium text-slate-400 border-l border-slate-200 w-16">원점수</th>
                <th className="text-center px-2 py-1 font-medium text-slate-400 w-14">등수</th>
                <th className="text-center px-2 py-1 font-medium text-slate-400 w-14">등급</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {GRADE_ROWS.map(row => {
                const g = editing ? draft.grades : (profile.grades || {});
                const mk = row.mid, fk = row.fin;
                const fields = [
                  { key: mk,           type: "number", borderL: true },
                  { key: mk+"-rank",   type: "number", borderL: false },
                  { key: mk+"-grade",  type: "text",   borderL: false },
                  { key: fk,           type: "number", borderL: true },
                  { key: fk+"-rank",   type: "number", borderL: false },
                  { key: fk+"-grade",  type: "text",   borderL: false },
                ];
                return (
                  <tr key={row.label} className="hover:bg-slate-50/50">
                    <td className="px-3 py-1.5 font-medium text-slate-600">{row.label}</td>
                    {fields.map(f => {
                      const val = g[f.key] ?? "";
                      const isGrade = f.key.endsWith("-grade");
                      const isScore = !f.key.endsWith("-rank") && !isGrade;
                      return (
                        <td key={f.key} className={"py-1 text-center " + (f.borderL ? "border-l border-slate-200 px-2" : "px-1")}>
                          {editing
                            ? <input
                                type={f.type} min={f.type==="number"?"0":undefined} max={isScore?"100":undefined}
                                value={val}
                                onChange={e=>setDraft(p=>({...p,grades:{...p.grades,[f.key]:e.target.value}}))}
                                className="w-full text-center rounded-lg border border-slate-200 px-1 py-1 focus:outline-none focus:ring-1 focus:ring-slate-300 text-xs"
                              />
                            : <span className={isGrade ? gradeColor(val) : isScore ? scoreColor(val) : (val ? "text-slate-600 font-medium" : "text-slate-400")}>
                                {val !== "" ? val : "-"}
                              </span>
                          }
                        </td>
                      );
                    })}
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

      {!teacherMode && (
        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-bold">비밀번호 변경</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Lbl>현재 비밀번호</Lbl>
              <Inp type="password" value={pinForm.current} onChange={e=>setPinForm(p=>({...p,current:e.target.value}))} placeholder="현재 PIN"/>
            </div>
            <div className="space-y-1.5">
              <Lbl>새 비밀번호</Lbl>
              <Inp type="password" value={pinForm.next} onChange={e=>setPinForm(p=>({...p,next:e.target.value}))} placeholder="4자리 이상"/>
            </div>
            <div className="space-y-1.5">
              <Lbl>새 비밀번호 확인</Lbl>
              <Inp type="password" value={pinForm.confirm} onChange={e=>setPinForm(p=>({...p,confirm:e.target.value}))} placeholder="다시 입력" onKeyDown={e=>e.key==="Enter"&&handlePinChange()}/>
            </div>
          </div>
          {pinMsg && (
            <div className={`text-sm rounded-xl px-3 py-2 ${pinMsg.type==="ok"?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>
              {pinMsg.text}
            </div>
          )}
          <Btn onClick={handlePinChange}>비밀번호 변경</Btn>
        </Card>
      )}
    </div>
  );
}

function StudentLogTab({ studentId }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const ref = db.ref(`studentLogs/${studentId}`);
    ref.on("value", snap => {
      const data = snap.val();
      if (!data) { setLogs([]); return; }
      setLogs(Object.values(data).sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => ref.off();
  }, [studentId]);

  if (logs.length === 0) {
    return <Card className="p-8 text-center text-sm text-slate-400">아직 기록이 없습니다.</Card>;
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="divide-y divide-slate-100">
        {logs.map(log => {
          const hasXp = log.xpDelta !== 0;
          const hasCp = log.cpDelta !== 0;
          const isPos = log.xpDelta > 0;
          return (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3">
              <div className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm"
                style={{ background: isPos ? "#ecfdf5" : "#fef2f2" }}>
                {isPos ? "⭐" : "📉"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400">{log.date}</span>
                  <div className="flex gap-1 flex-wrap">
                    {(log.tags || []).map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-3 flex-wrap">
                  {hasXp && (
                    <span className={`text-xs font-bold ${log.xpDelta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {log.xpDelta > 0 ? "+" : ""}{log.xpDelta} XP
                    </span>
                  )}
                  {hasCp && (
                    <span className="text-xs font-bold text-blue-500">+{log.cpDelta} CP</span>
                  )}
                  <span className="text-[10px] text-slate-400">
                    누적 {log.totalXp ?? "-"} XP · 미지급 {log.totalCp ?? "-"} CP
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function StudentMyPage({ studentHW, studentName, studentId, currentPin, today }) {
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
        {[["stats","📊 학습 통계"],["log","📋 활동 로그"],["profile","👤 내 정보"]].map(([t,l]) => (
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

      {tab === "log" && <StudentLogTab studentId={studentId}/>}

      {tab === "profile" && (
        <StudentProfileTab studentId={studentId} studentName={studentName} currentPin={currentPin}/>
      )}
    </div>
  );
}

// ── 학생 평가 탭 ──────────────────────────────────────────────────────────────
function StudentExamTab({ studentId }) {
  const [exams, setExams] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [savedResult, setSavedResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ref = db.ref("mockExams");
    ref.on("value", snap => {
      const data = snap.val() || {};
      const list = Object.values(data).filter(e => Object.values(e.students||{}).includes(studentId));
      setExams(list.sort((a,b) => a.round - b.round));
    });
    return () => ref.off();
  }, [studentId]);

  const openExam = async (exam) => {
    setActiveExam(exam);
    const snap = await db.ref(`mockExamResults/${exam.id}/${studentId}`).once("value");
    const result = snap.val();
    if (result) { setAnswers(result.answers || {}); setSavedResult(result); }
    else { setAnswers({}); setSavedResult(null); }
  };

  const toggle = (qNum) => {
    setAnswers(prev => {
      const cur = prev[qNum];
      if (cur === "O") return {...prev, [qNum]: "X"};
      if (cur === "X") { const next = {...prev}; delete next[qNum]; return next; }
      return {...prev, [qNum]: "O"};
    });
  };

  const calcScore = () => {
    if (!activeExam) return null;
    const scoringType = activeExam.scoringType || "auto";
    if (scoringType === "none") return null;
    const correct = Object.entries(answers).filter(([,v]) => v === "O").map(([q]) => Number(q));
    if (scoringType === "manual" && activeExam.scoring) {
      const sc = activeExam.scoring;
      return correct.reduce((sum, q) => sum + (Number(sc[q]) || 0), 0);
    }
    const total = activeExam.totalScore || 100;
    const qCount = activeExam.questionCount || 20;
    return Math.round(correct.length * (total / qCount));
  };

  const handleSubmit = async () => {
    setSaving(true);
    const score = calcScore();
    const data = { answers, submittedAt: new Date().toISOString().slice(0,10) };
    if (score !== null) data.score = score;
    await db.ref(`mockExamResults/${activeExam.id}/${studentId}`).set(data);
    setSavedResult(data);
    setSaving(false);
  };

  if (activeExam) {
    const qCount = activeExam.questionCount || 20;
    const correctCount = Object.values(answers).filter(v => v === "O").length;
    const wrongCount = Object.values(answers).filter(v => v === "X").length;
    const score = calcScore();
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveExam(null)} className="text-sm text-slate-500 hover:text-slate-800">← 뒤로</button>
          <div>
            <span className="font-bold">{activeExam.name}</span>
            <span className="ml-2 text-sm text-indigo-500 font-medium">{activeExam.round}차</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
          번호를 눌러 O/X 표시 · 한 번 더 누르면 취소됩니다 (미표시 → O → X → 미표시)
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {Array.from({length: qCount}, (_, i) => i+1).map(qNum => {
            const ans = answers[qNum];
            return (
              <button key={qNum} onClick={() => toggle(qNum)}
                className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition
                  ${ans === "O" ? "bg-emerald-50 border-emerald-400 text-emerald-600"
                    : ans === "X" ? "bg-red-50 border-red-400 text-red-600"
                    : "bg-white border-slate-200 text-slate-300"}`}>
                <span className="text-[10px] text-slate-400 font-normal leading-none">{qNum}</span>
                <span className="text-base font-bold leading-none">{ans === "O" ? "O" : ans === "X" ? "X" : "·"}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="space-y-0.5">
            {score !== null && (
              <div className="text-sm text-slate-600">
                점수 <span className="font-bold text-xl text-indigo-600">{score}점</span>
              </div>
            )}
            <div className="text-xs text-slate-400">
              O: {correctCount}개 · X: {wrongCount}개 · 미표시: {qCount - correctCount - wrongCount}개
            </div>
          </div>
          <Btn onClick={handleSubmit} disabled={saving}>{saving?"제출 중...":"제출"}</Btn>
        </div>
        {savedResult && (
          <div className="text-xs text-slate-400 text-right">
            마지막 제출: {savedResult.submittedAt}
            {savedResult.score !== undefined && savedResult.score !== null && ` · ${savedResult.score}점`}
          </div>
        )}
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-400">
        배정된 시험이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exams.map(exam => (
        <button key={exam.id} onClick={() => openExam(exam)}
          className="w-full text-left rounded-2xl border px-4 py-4 hover:bg-slate-50 transition">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{exam.name}</span>
            <span className="text-xs bg-indigo-100 text-indigo-600 rounded-lg px-2 py-0.5">{exam.round}차</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">{exam.questionCount}문항 · 총 {exam.totalScore ? Math.round(exam.totalScore*100)/100 : "-"}점</div>
        </button>
      ))}
    </div>
  );
}
