// ── 날짜 선택 달력 ────────────────────────────────────────────────────────────
function DatePicker({ startDate, dueDate, includeWeekend, selectedDates, onChange, rangeOverride }) {
  const months = useMemo(() => {
    const s0 = rangeOverride && rangeOverride.length ? rangeOverride[0] : startDate;
    const e0 = rangeOverride && rangeOverride.length ? rangeOverride[rangeOverride.length-1] : dueDate;
    if (!s0 || !e0) return [];
    const s = new Date(s0), e = new Date(e0);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return [];
    const result = [];
    const cur = new Date(s.getFullYear(), s.getMonth(), 1);
    const endMonth = new Date(e.getFullYear(), e.getMonth(), 1);
    while (cur <= endMonth) {
      result.push(new Date(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
    return result;
  }, [startDate, dueDate, rangeOverride]);

  if (months.length === 0) return null;

  const rangeSet = rangeOverride ? new Set(rangeOverride) : new Set(enumerateDates(startDate, dueDate, includeWeekend));
  const selectedSet = new Set(selectedDates || [...rangeSet]);

  const toggle = (date) => {
    const newSet = new Set(selectedSet);
    if (newSet.has(date)) {
      if (newSet.size <= 1) return;
      newSet.delete(date);
    } else {
      if (rangeSet.has(date)) newSet.add(date);
    }
    onChange([...newSet].sort());
  };

  const DOW = ["일","월","화","수","목","금","토"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{rangeOverride ? <>못하는 날 선택 <span className="text-slate-400 font-normal">(클릭으로 제외/복원)</span></> : <>날짜 선택 <span className="text-slate-400 font-normal">(클릭으로 빼거나 추가)</span></>}</span>
        <div className="flex gap-2 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-900 inline-block"/>포함</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-200 inline-block"/>제외</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-100 border inline-block"/>범위밖</span>
        </div>
      </div>
      {months.map(month => {
        const year = month.getFullYear(), mon = month.getMonth();
        const firstDay = new Date(year, mon, 1).getDay();
        const daysInMonth = new Date(year, mon + 1, 0).getDate();
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        return (
          <div key={`${year}-${mon}`} className="rounded-2xl border p-3">
            <div className="text-sm font-bold text-center mb-2">{year}년 {mon+1}월</div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {DOW.map((d,i) => (
                <div key={d} className={"text-xs py-1 font-medium " + (i===0?"text-red-400":i===6?"text-blue-400":"text-slate-400")}>{d}</div>
              ))}
              {cells.map((d, i) => {
                if (!d) return <div key={"e"+i}/>;
                const dateStr = `${year}-${String(mon+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                const inRange = rangeSet.has(dateStr);
                const isSelected = selectedSet.has(dateStr);
                const dow = (firstDay + d - 1) % 7;
                const isSun = dow === 0, isSat = dow === 6;
                return (
                  <button key={d} type="button" onClick={() => inRange && toggle(dateStr)}
                    className={"rounded-lg py-1.5 text-xs transition font-medium " + (
                      !inRange ? "text-slate-300 cursor-default" :
                      isSelected ? "bg-slate-900 text-white" :
                      "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    ) + (!inRange?"":isSun?" !text-red-400":isSat?" !text-blue-400":"")
                    }
                    style={isSelected && isSun ? {backgroundColor:"#1e293b",color:"#f87171"} :
                           isSelected && isSat ? {backgroundColor:"#1e293b",color:"#60a5fa"} : {}}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="text-xs text-slate-500 text-right">선택된 날짜: {selectedSet.size}일</div>
    </div>
  );
}
