// ── 학생 마이페이지 ───────────────────────────────────────────────────────────
function StudentMyPage({ studentHW, studentName, today }) {
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
  const daysWithHW = dailyData.filter(d => d.total > 0).length;
  const daysAllDone = dailyData.filter(d => d.total > 0 && d.rate === 100).length;

  const barColor = (rate) => {
    if (rate === null) return "bg-slate-100";
    if (rate === 100) return "bg-emerald-400";
    if (rate >= 50) return "bg-amber-400";
    return "bg-red-400";
  };

  return (
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
                      <div className={"h-full rounded-xl transition-all " + barColor(d.rate)}
                        style={{width: d.rate+"%"}}/>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {viewMode === "daily" && (
          <div>
            <div className="flex items-end gap-0.5 h-32">
              {dailyData.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
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
  );
}
