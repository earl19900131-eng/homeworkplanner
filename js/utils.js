// ── 유틸 ─────────────────────────────────────────────────────────────────────
function formatDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayString() { return formatDate(new Date()); }
function addDays(base, days) {
  const d = new Date(base);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return formatDate(d);
}
function enumerateDates(start, end, includeWeekend) {
  const s = new Date(start), e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return [];
  const result = [], cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (includeWeekend || (day !== 0 && day !== 6)) result.push(formatDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}
function positiveInt(v) {
  const n = Number(v);
  return (!isFinite(n) || n <= 0) ? null : Math.floor(n);
}
function splitHomework({ totalAmount, startDate, dueDate, includeWeekend, dailyMax, customDates }) {
  const total = positiveInt(totalAmount), maxPerDay = positiveInt(dailyMax);
  const dates = customDates && customDates.length > 0 ? [...customDates].sort() : enumerateDates(startDate, dueDate, includeWeekend);
  if (!total || !dates.length) return [];
  if (maxPerDay && total > dates.length * maxPerDay) return [];
  let remaining = total;
  const raw = dates.map((date, i) => {
    let amount = Math.ceil(remaining / (dates.length - i));
    if (maxPerDay) amount = Math.min(amount, maxPerDay);
    remaining -= amount;
    return { date, plannedAmount: amount, completedAmount: 0, done: false };
  });
  let ptr = raw.length - 1;
  while (remaining > 0) {
    if (maxPerDay && raw.every(x => x.plannedAmount >= maxPerDay)) return [];
    if (!maxPerDay || raw[ptr].plannedAmount < maxPerDay) { raw[ptr].plannedAmount++; remaining--; }
    ptr = (ptr - 1 + raw.length) % raw.length;
  }
  let cursor = 1;
  return raw.filter(x => x.plannedAmount > 0).map(x => {
    const sp = cursor, ep = cursor + x.plannedAmount - 1;
    cursor = ep + 1;
    return { ...x, startProblem: sp, endProblem: ep };
  });
}
function redistributeHomework(hw, today, solvedMap = {}) {
  const completed = hw.chunks.filter(c => c.done);
  const future = hw.chunks.filter(c => !c.done && c.date >= today);
  const overdue = hw.chunks.filter(c => !c.done && c.date < today);
  const pending = [...overdue, ...future];
  const partialSolved = pending.reduce((s, c) => s + (Number(solvedMap[c.date]) || 0), 0);
  const remaining = pending.reduce((s, c) => s + Math.max(0, c.plannedAmount - (Number(solvedMap[c.date]) || 0)), 0);
  if (!remaining || !future.length) return hw;
  const redist = splitHomework({ totalAmount: remaining, startDate: future[0].date, dueDate: future[future.length-1].date, includeWeekend: hw.includeWeekend, dailyMax: hw.dailyMax });
  if (!redist.length) return hw;
  const lastCompleted = completed.reduce((m, c) => Math.max(m, c.endProblem), 0);
  let cursor = lastCompleted + partialSolved + 1;
  const adjusted = redist.map(c => { const sp=cursor, ep=cursor+c.plannedAmount-1; cursor=ep+1; return {...c,startProblem:sp,endProblem:ep}; });
  return { ...hw, chunks: [...completed, ...adjusted].sort((a,b)=>a.date.localeCompare(b.date)) };
}
function defaultForm() {
  const t = todayString();
  return { title:"", subject:"공통수학1", hwType:"현행", totalAmount:"", startDate:t, dueDate:addDays(t,4), includeWeekend:true, dailyMax:"", selectedDates:null };
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
