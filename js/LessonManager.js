// ── 수업일지 ────────────────────────────────────────────────────────────────

const BEHAVIOR_TAGS = [
  { name: "지각안함",         xp:  3,   cp:   10, group: "출결" },
  { name: "지각",             xp: -5,   cp:    0, group: "출결" },
  { name: "출석",             xp: 10,   cp:   30, group: "출결" },
  { name: "결석",             xp:  0,   cp:    0, group: "출결" },
  { name: "무단결석",         xp: -50,  cp:    0, group: "출결" },
  { name: "숙제해옴",         xp:  5,   cp:   40, group: "숙제" },
  { name: "숙제미이행",       xp: -10,  cp:    0, group: "숙제" },
  { name: "노트미지참",       xp: -5,   cp:    0, group: "준비물" },
  { name: "진단평가1",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가2",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가3",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가4",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가5",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가6",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가7",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "진단평가8",        xp:  3,   cp:   30, group: "진단평가" },
  { name: "추가숙제1",        xp:  2,   cp:   10, group: "추가숙제" },
  { name: "추가숙제2",        xp:  2,   cp:   10, group: "추가숙제" },
  { name: "추가숙제3",        xp:  2,   cp:   10, group: "추가숙제" },
  { name: "추가숙제4",        xp:  2,   cp:   10, group: "추가숙제" },
  { name: "지필100점(중등)",   xp: 50,  cp: 1000, group: "지필성적" },
  { name: "지필90~100(중등)", xp: 45,  cp:  900, group: "지필성적" },
  { name: "지필80~90(중등)",  xp: 40,  cp:  800, group: "지필성적" },
  { name: "지필30상승(중고등)",xp: 50,  cp:  500, group: "지필성적" },
  { name: "지필1등급(9등급)", xp: 50,  cp: 1000, group: "지필성적" },
  { name: "지필2등급(9등급)", xp: 45,  cp:  900, group: "지필성적" },
  { name: "지필1등급(5등급)", xp: 50,  cp: 1000, group: "지필성적" },
  { name: "리뷰이벤트",       xp:  0,  cp:  200, group: "기타" },
  { name: "100cp",            xp:  0,  cp:  100, group: "기타" },
];

const TAG_GROUPS = [...new Set(BEHAVIOR_TAGS.map(t => t.group))];

function calcPoints(tags) {
  return (tags || []).reduce(
    (acc, name) => {
      const t = BEHAVIOR_TAGS.find(b => b.name === name);
      if (t) { acc.xp += t.xp; acc.cp += t.cp; }
      return acc;
    },
    { xp: 0, cp: 0 }
  );
}

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const cells = [];
  // 이전 달 채우기
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push({ date: fmtYMD(d.getFullYear(), d.getMonth(), d.getDate()), current: false });
  }
  // 현재 달
  for (let d = 1; d <= lastDay; d++) {
    cells.push({ date: fmtYMD(year, month, d), current: true });
  }
  // 다음 달 채우기
  let next = 1;
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, next++);
    cells.push({ date: fmtYMD(d.getFullYear(), d.getMonth(), d.getDate()), current: false });
  }
  return cells;
}

function fmtYMD(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── 태그 선택 모달 (즉시 적용, 저장 버튼 없음) ──────────────────────────
function TagSelectorModal({ studentName, currentTags, onToggle, onClose }) {
  const { xp, cp } = calcPoints(currentTags);
  const [focusedIdx, setFocusedIdx] = React.useState(0);
  const bodyRef = React.useRef(null);

  React.useEffect(() => { bodyRef.current?.focus(); }, []);

  // 포커스 태그가 스크롤 범위 밖이면 스크롤
  React.useEffect(() => {
    const el = bodyRef.current?.querySelector(`[data-tagidx="${focusedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedIdx]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocusedIdx(i => Math.min(i + 1, BEHAVIOR_TAGS.length - 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocusedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const allEls = Array.from(bodyRef.current?.querySelectorAll("[data-tagidx]") || []);
      const curEl = bodyRef.current?.querySelector(`[data-tagidx="${focusedIdx}"]`);
      if (!curEl) return;
      const curRect = curEl.getBoundingClientRect();
      const curMidX = curRect.left + curRect.width / 2;
      if (e.key === "ArrowDown") {
        const below = allEls.filter(el => el.getBoundingClientRect().top > curRect.bottom - 4);
        if (!below.length) return;
        const minTop = Math.min(...below.map(el => el.getBoundingClientRect().top));
        const sameRow = below.filter(el => el.getBoundingClientRect().top <= minTop + 10);
        const best = sameRow.reduce((a, b) => {
          const aRect = a.getBoundingClientRect(); const bRect = b.getBoundingClientRect();
          return Math.abs(aRect.left + aRect.width/2 - curMidX) <= Math.abs(bRect.left + bRect.width/2 - curMidX) ? a : b;
        });
        setFocusedIdx(Number(best.dataset.tagidx));
      } else {
        const above = allEls.filter(el => el.getBoundingClientRect().bottom < curRect.top + 4);
        if (!above.length) return;
        const maxBottom = Math.max(...above.map(el => el.getBoundingClientRect().bottom));
        const sameRow = above.filter(el => el.getBoundingClientRect().bottom >= maxBottom - 10);
        const best = sameRow.reduce((a, b) => {
          const aRect = a.getBoundingClientRect(); const bRect = b.getBoundingClientRect();
          return Math.abs(aRect.left + aRect.width/2 - curMidX) <= Math.abs(bRect.left + bRect.width/2 - curMidX) ? a : b;
        });
        setFocusedIdx(Number(best.dataset.tagidx));
      }
    } else if (e.key === " ") {
      e.preventDefault();
      onToggle(BEHAVIOR_TAGS[focusedIdx].name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 pb-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base">{studentName} · 행동태그</h3>
              <div className="text-sm mt-1 flex gap-3">
                <span>획득 XP: <span className={`font-bold ${xp >= 0 ? "text-emerald-600" : "text-red-600"}`}>{xp >= 0 ? "+" : ""}{xp}</span></span>
                <span>획득 CP: <span className="font-bold text-blue-600">+{cp}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">↑↓←→ 이동 · Space 선택 · Esc 닫기</span>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
          </div>
        </div>

        <div ref={bodyRef} tabIndex={0} onKeyDown={handleKeyDown}
          className="overflow-y-auto flex-1 p-5 space-y-4 outline-none">
          {TAG_GROUPS.map(group => (
            <div key={group}>
              <div className="text-xs font-bold text-slate-400 tracking-wide mb-2">{group}</div>
              <div className="flex flex-wrap gap-1.5">
                {BEHAVIOR_TAGS.filter(t => t.group === group).map(tag => {
                  const idx = BEHAVIOR_TAGS.findIndex(b => b.name === tag.name);
                  const sel = currentTags.includes(tag.name);
                  const isFocused = focusedIdx === idx;
                  const negXP = tag.xp < 0;
                  return (
                    <button key={tag.name} type="button" data-tagidx={idx}
                      onClick={() => { setFocusedIdx(idx); onToggle(tag.name); }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1
                        ${sel ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}
                        ${isFocused ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}>
                      <span>{tag.name}</span>
                      <span className={`text-[9px] font-normal ${sel ? "text-slate-400" : negXP ? "text-red-400" : "text-emerald-500"}`}>
                        {tag.xp !== 0 ? (tag.xp > 0 ? "+" : "") + tag.xp + "xp" : ""}
                        {tag.xp !== 0 && tag.cp !== 0 ? " " : ""}
                        {tag.cp !== 0 ? "+" + tag.cp + "cp" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 수업 등록/편집 모달 ────────────────────────────────────────────────────
const SESSION_DEFAULT_COLORS = { "수업": "#1e293b", "평가": "#f59e0b", "보강": "#059669" };
const COLOR_PALETTE = [
  "#1e293b","#3b82f6","#6366f1","#8b5cf6","#ec4899",
  "#ef4444","#f59e0b","#10b981","#059669","#0891b2",
  "#7c3aed","#dc2626","#d97706","#16a34a","#0284c7",
];

function LessonModal({ lesson, students, onClose, onSave }) {
  const isNew = !lesson._key;
  const [title, setTitle] = React.useState(lesson.title || "");
  const [date, setDate] = React.useState(lesson.date || "");
  const [time, setTime] = React.useState(lesson.time || "");
  const [sessionType, setSessionType] = React.useState(lesson.sessionType || "수업");
  const [color, setColor] = React.useState(lesson.color || SESSION_DEFAULT_COLORS[lesson.sessionType || "수업"]);
  const [selectedIds, setSelectedIds] = React.useState(lesson.studentIds || []);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");
  const titleRef = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  React.useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 50);
  }, []);

  const toggleStudent = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectClass = (cls) => {
    const ids = students.filter(s => s.className === cls).map(s => s.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected
      ? prev.filter(id => !ids.includes(id))
      : [...new Set([...prev, ...ids])]);
  };

  const classes = [...new Set(students.map(s => s.className))].sort();

  const handleSave = async () => {
    if (!title.trim()) { setErr("수업명을 입력해 주세요."); return; }
    if (!date) { setErr("날짜를 선택해 주세요."); return; }
    if (selectedIds.length === 0) { setErr("학생을 최소 1명 선택해 주세요."); return; }
    setSaving(true);
    try { await onSave({ title: title.trim(), date, time, sessionType, color, studentIds: selectedIds }); onClose(); }
    catch (e) { setErr("저장 실패: " + e.message); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{isNew ? "수업 등록" : "수업 편집"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Lbl>수업 유형</Lbl>
            <div className="flex gap-2">
              {[["수업","🎓"],["평가","📝"],["보강","🔧"]].map(([type, icon]) => {
                const sel = sessionType === type;
                return (
                  <button key={type} type="button" onClick={() => { setSessionType(type); setColor(SESSION_DEFAULT_COLORS[type]); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-medium border transition ${sel ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
                    style={sel ? { background: SESSION_DEFAULT_COLORS[type] } : {}}>
                    <span>{icon}</span><span>{type}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Lbl>달력 색상</Lbl>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PALETTE.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition hover:scale-110 border-2"
                  style={{ background: c, borderColor: color === c ? "#1a2340" : "transparent", boxShadow: color === c ? "0 0 0 2px white, 0 0 0 4px " + c : "none" }}/>
              ))}
              <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer ml-1">
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" style={{background:"none"}}/>
                직접입력
              </label>
            </div>
          </div>
          <div className="space-y-1.5"><Lbl>수업명</Lbl><input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 수학 특강" className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Lbl>날짜</Lbl><Inp type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Lbl>시간 (선택)</Lbl><Inp type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
          </div>
        </div>
        <div className="space-y-3">
          <Lbl>포함 학생</Lbl>
          {classes.map(cls => {
            const clsIds = students.filter(s => s.className === cls).map(s => s.id);
            const allSel = clsIds.every(id => selectedIds.includes(id));
            return (
              <div key={cls}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-slate-400 tracking-wide">{cls}</span>
                  <button type="button" onClick={() => selectClass(cls)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${allSel ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
                    {allSel ? "전체 해제" : "전체 선택"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {students.filter(s => s.className === cls).sort((a, b) => a.name.localeCompare(b.name)).map(s => {
                    const sel = selectedIds.includes(s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => toggleStudent(s.id)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition ${sel ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {err && <AlertBox className="bg-red-50 text-red-700">{err}</AlertBox>}
        <div className="flex gap-2">
          <Btn onClick={handleSave} disabled={saving} className="flex-1">{saving ? "저장 중..." : isNew ? "✅ 수업 등록" : "저장"}</Btn>
          <Btn variant="outline" onClick={onClose}>취소</Btn>
        </div>
      </div>
    </div>
  );
}

// ── 수업 상세 표 ──────────────────────────────────────────────────────────
// col: 0=현행숙제, 1=행동태그
// ── 소단원 선택 모달 ──────────────────────────────────────────────────────────
function UnitPickerModal({ studentName, assessmentName, flatUnits, currentNum, onSelect, onClose }) {
  const allUnits = [{ num: "000", major: "", middle: "", minor: "시작 전" }, ...flatUnits];
  const startIdx = Math.max(0, allUnits.findIndex(u => u.num === currentNum));
  const [idx, setIdx] = React.useState(startIdx);
  const unit = allUnits[idx];
  const mountTime = React.useRef(Date.now());

  React.useEffect(() => {
    const handler = (e) => {
      if (Date.now() - mountTime.current < 50) return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); e.stopPropagation(); setIdx(i => Math.max(0, i - 1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); setIdx(i => Math.min(allUnits.length - 1, i + 1)); }
      if (e.key === "Enter")  { e.preventDefault(); e.stopPropagation(); onSelect(allUnits[idx]?.num || ""); onClose(); }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [idx, flatUnits]);

  if (!flatUnits.length) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-5 text-sm text-slate-500 text-center" onClick={e => e.stopPropagation()}>
        <div className="font-medium mb-1">{studentName}</div>
        <div>학생관리에서 평가를 등록해 주세요.</div>
        <button onClick={onClose} className="mt-3 text-blue-500 text-xs">닫기</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-5 w-[300px]" onClick={e => e.stopPropagation()}>
        <div className="text-xs text-slate-400 mb-1">{studentName}</div>
        <div className="text-xs font-medium text-slate-600 mb-3 truncate">{assessmentName}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIdx(i => Math.max(0, i-1))} disabled={idx === 0}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xl w-8 shrink-0">‹</button>
          <div className="flex-1 text-center py-2">
            <div className={`text-3xl font-bold font-mono leading-none ${unit?.num === "000" ? "text-slate-400" : "text-blue-600"}`}>{unit?.num}</div>
            {unit?.num === "000"
              ? <div className="text-sm text-slate-400 mt-1.5">시작 전</div>
              : <>
                  <div className="text-[11px] text-slate-400 mt-1.5">{unit?.major} › {unit?.middle}</div>
                  <div className="text-sm font-medium text-slate-700 mt-0.5 leading-snug">{unit?.minor}</div>
                </>
            }
          </div>
          <button onClick={() => setIdx(i => Math.min(allUnits.length-1, i+1))} disabled={idx === allUnits.length-1}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xl w-8 shrink-0">›</button>
        </div>
        <div className="text-[11px] text-slate-300 text-center mt-2">{idx+1} / {allUnits.length}</div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 text-xs text-slate-500 border border-slate-200 rounded-xl py-2 hover:bg-slate-50">취소</button>
          <button onClick={() => { onSelect(unit?.num || ""); onClose(); }}
            className="flex-1 text-xs text-white bg-blue-500 hover:bg-blue-600 rounded-xl py-2 font-semibold">선택</button>
        </div>
      </div>
    </div>
  );
}

// ── 남은 문제 선택 모달 ──────────────────────────────────────────────────────
function RemainingPickerModal({ studentName, assessmentName, totalProblems, currentRemaining, onSelect, onClose }) {
  const init = currentRemaining != null ? currentRemaining : totalProblems;
  const [count, setCount] = React.useState(init);
  const mountTime = React.useRef(Date.now());

  React.useEffect(() => {
    const handler = (e) => {
      if (Date.now() - mountTime.current < 50) return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); e.stopPropagation(); setCount(c => Math.max(0, c - 1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); setCount(c => Math.min(totalProblems, c + 1)); }
      if (e.key === "Enter")  { e.preventDefault(); e.stopPropagation(); onSelect(count); onClose(); }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [count, totalProblems]);

  const pct = totalProblems > 0 ? Math.round((1 - count / totalProblems) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-5 w-[280px]" onClick={e => e.stopPropagation()}>
        <div className="text-xs text-slate-400 mb-0.5">{studentName}</div>
        <div className="text-xs font-medium text-slate-600 mb-3 truncate">{assessmentName}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCount(c => Math.max(0, c - 1))} disabled={count === 0}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xl w-8 shrink-0">‹</button>
          <div className="flex-1 text-center py-2">
            <div className="text-3xl font-bold text-orange-500 font-mono leading-none">{count}</div>
            <div className="text-[11px] text-slate-400 mt-1.5">남은 문제 / 전체 {totalProblems}문제</div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div className="bg-orange-400 h-1.5 rounded-full transition-all" style={{width: pct + "%"}}></div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{pct}% 완료</div>
          </div>
          <button onClick={() => setCount(c => Math.min(totalProblems, c + 1))} disabled={count === totalProblems}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xl w-8 shrink-0">›</button>
        </div>
        <div className="text-[11px] text-slate-300 text-center mt-1">← → 조절 · Enter 저장</div>
        <div className="flex gap-2 mt-3">
          <button onClick={onClose} className="flex-1 text-xs text-slate-500 border border-slate-200 rounded-xl py-2 hover:bg-slate-50">취소</button>
          <button onClick={() => { onSelect(count); onClose(); }}
            className="flex-1 text-xs text-white bg-orange-500 hover:bg-orange-600 rounded-xl py-2 font-semibold">저장</button>
        </div>
      </div>
    </div>
  );
}

function LessonDetailView({ lesson, lessons = [], students, materials = [], attendance, allAttendance, isViewer = false, onBack, onEdit, onDelete, onViewStudent }) {
  const [editingHW, setEditingHW] = React.useState(null);
  const [hwValue, setHwValue] = React.useState("");
  const [unitModal, setUnitModal] = React.useState(null); // studentId
  const [remainingModal, setRemainingModal] = React.useState(null); // studentId
  const [profiles, setProfiles] = React.useState({});
  const [assessmentList, setAssessmentList] = React.useState([]);
  const [mockExams, setMockExams] = React.useState([]);
  const [mockExamFolders, setMockExamFolders] = React.useState([]);
  const [tagModal, setTagModal] = React.useState(null);       // studentId
  const [tagModalOriginal, setTagModalOriginal] = React.useState([]); // 모달 열릴 때 태그 스냅샷
  const [focusedCell, setFocusedCell] = React.useState(null); // { row, col }
  const [clipboard, setClipboard] = React.useState(null);     // { type:'hw'|'tags', value }
  const [copyFlash, setCopyFlash] = React.useState(false);
  const [undoStack, setUndoStack] = React.useState([]);        // [{ studentId, field, value }]
  const [confirmDone, setConfirmDone] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [autoHwModal, setAutoHwModal] = React.useState(null);
  const [addHwExpanded, setAddHwExpanded] = React.useState({}); // { [studentId]: bool }
  const [confirmModal, setConfirmModal] = React.useState(null); // { selectedDates: Set<string> }
  const [reportModal, setReportModal] = React.useState(null); // { student, rec, assessmentInfo }
  // { studentId, studentName, materials:[{nodeId,materialName,totalProblems,startNum}], selectedIdx, days, minPerProb, coeff }
  const fullscreenRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const isMockSession = lesson.sessionType === "평가";
  const COL_KEYS = ["학생", "지난숙제", "숙제", "평가", "행동태그", "데일리코멘트", "등원", "하원", "XP", "CP", "보고서", "발송"];
  const COL_DEFAULTS = [170, 220, 220, 180, 220, 220, 80, 80, 80, 80, 70, 130];
  const MOCK_COL_DEFAULTS = [170, 220, 200, 80, 80, 80, 80];
  const [colWidths, setColWidths] = React.useState(isMockSession ? MOCK_COL_DEFAULTS : COL_DEFAULTS);
  const resizingRef = React.useRef(null); // { colIdx, startX, startW }

  const onResizeStart = (colIdx, e) => {
    e.preventDefault();
    resizingRef.current = { colIdx, startX: e.clientX, startW: colWidths[colIdx] };
    const onMove = (me) => {
      const { colIdx, startX, startW } = resizingRef.current;
      const newW = Math.max(60, startW + me.clientX - startX);
      setColWidths(prev => { const next = [...prev]; next[colIdx] = newW; return next; });
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); resizingRef.current = null; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      fullscreenRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  React.useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const lessonStudents = (lesson.studentIds || [])
    .map(id => students.find(s => s.id === id))
    .filter(Boolean)
    .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));

  const rec = attendance[lesson._key] || {};

  const cumulativeTotals = React.useMemo(() => {
    const totals = {};
    Object.values(allAttendance).forEach(lessonRec => {
      Object.entries(lessonRec).forEach(([studentId, r]) => {
        if (!totals[studentId]) totals[studentId] = { xp: 0, cp: 0 };
        totals[studentId].xp += Number(r.xp) || 0;
        totals[studentId].cp += Number(r.cp) || 0;
      });
    });
    return totals;
  }, [allAttendance]);

  // 학생별 이전 수업 숙제: 현재 수업 날짜 이전에서 가장 최근 수업의 현행숙제
  // 학생별 이전 수업 숙제: 타입(현행/추가1/추가2)별로 가장 최근 숙제를 각각 찾음
  const prevHwMap = React.useMemo(() => {
    const map = {};
    const sortedLessons = [...lessons]
      .filter(l => l._key !== lesson._key && l.date < lesson.date)
      .sort((a, b) => b.date.localeCompare(a.date));
    lessonStudents.forEach(s => {
      const found = {}; // { 현행: {text,date}, 추가1: {text,date}, 추가2: {text,date} }
      for (const l of sortedLessons) {
        if (!(l.studentIds || []).includes(s.id)) continue;
        const r = (allAttendance[l._key] || {})[s.id] || {};
        const hw = r.현행숙제;
        const type = r.lessonType || "현행";
        if (hw && !found[type]) found[type] = { text: hw, date: l.date };
        if (Object.keys(found).length === 3) break; // 세 타입 모두 찾으면 중단
      }
      if (Object.keys(found).length > 0) map[s.id] = found;
    });
    return map;
  }, [lessons, lesson._key, lesson.date, lessonStudents, allAttendance]);

  const refocusContainer = () => setTimeout(() => containerRef.current?.focus(), 30);

  // 상세 뷰 진입 시 컨테이너 자동 포커스
  React.useEffect(() => { containerRef.current?.focus(); }, []);

  // studentProfiles, assessments 구독
  React.useEffect(() => {
    const ref1 = db.ref("studentProfiles");
    const ref2 = db.ref("assessments");
    const h1 = ref1.on("value", snap => setProfiles(snap.val() || {}));
    const h2 = ref2.on("value", snap => {
      const val = snap.val() || {};
      setAssessmentList(Object.values(val));
    });
    return () => { ref1.off("value", h1); ref2.off("value", h2); };
  }, []);

  // 모의평가 관련 데이터 (평가 수업용)
  React.useEffect(() => {
    if (!isMockSession) return;
    const r1 = db.ref("mockExams");
    const r2 = db.ref("mockExamFolders");
    const h1 = r1.on("value", snap => {
      const val = snap.val() || {};
      setMockExams(Object.values(val).sort((a,b) => (a.round||0)-(b.round||0)));
    });
    const h2 = r2.on("value", snap => {
      const val = snap.val() || {};
      setMockExamFolders(Object.values(val).sort((a,b) => (a.createdAt||0)-(b.createdAt||0)));
    });
    return () => { r1.off("value", h1); r2.off("value", h2); };
  }, [isMockSession]);

  // assessmentId → 평가 정보 반환 (lessonType: "추가1"/"추가2" 이면 advanceAssessment 사용)
  const getStudentAssessmentInfo = (studentId, lessonType) => {
    const profile = profiles[studentId] || {};
    const assessmentId = (lessonType === "추가1" || lessonType === "추가2") ? profile.advanceAssessment : profile.currentAssessment;
    if (!assessmentId) return { name: "", type: "", units: [], totalProblems: 0 };
    const assessment = assessmentList.find(a => a.id === assessmentId);
    if (!assessment) return { name: "", type: "", units: [], totalProblems: 0 };
    if (assessment.type === "누적테스트") {
      return { name: assessment.name, type: "누적테스트", units: [], totalProblems: assessment.totalProblems || 0, subject: assessment.subject || "" };
    }
    const units = [];
    (assessment.tree || []).forEach((maj, mi) => {
      (maj.middles || []).forEach((mid, di) => {
        (mid.minors || []).forEach((min, ni) => {
          units.push({ num: `${mi+1}${di+1}${ni+1}`, major: maj.major, middle: mid.middle, minor: min.minor });
        });
      });
    });
    return { name: assessment.name, type: assessment.type || "일일테스트", units, totalProblems: 0 };
  };

  // 현행평가 소단원 저장 (studentProfile에 저장)
  const saveUnit = async (studentId, unitNum) => {
    await db.ref(`studentProfiles/${studentId}/currentUnit`).set(unitNum || null);
    setUnitModal(null);
    refocusContainer();
  };

  // 누적테스트 남은 문제수 저장
  const saveRemaining = async (studentId, count) => {
    await db.ref(`studentProfiles/${studentId}/remainingProblems`).set(count);
    setRemainingModal(null);
    refocusContainer();
  };

  // 숙제 확정 (달력 없이 바로 저장)
  const confirmHomework = async () => {
    if (editingHW && hwValue !== undefined) {
      await rawSaveHW(editingHW, hwValue);
      setEditingHW(null);
    }
    const snap = await db.ref(`lessonAttendance/${lesson._key}`).once("value");
    const freshRec = snap.val() || {};
    const hasHw = lessonStudents.some(s => (freshRec[s.id]?.현행숙제 || "").trim());
    if (!hasHw) { alert("확정할 숙제가 없습니다.\n(숙제 열에 내용을 먼저 입력해 주세요)"); return; }
    await doConfirmHomework([], freshRec);
  };

  // 검사 날짜 확정 후 실제 저장
  const doConfirmHomework = async (dates, freshRec) => {
    const checkDates = dates.filter(d => d.selected).map(d => d.date);
    const updates = {};
    for (const s of lessonStudents) {
      const sRec = freshRec[s.id] || {};
      const text = (sRec.현행숙제 || "").trim();
      if (!text) continue;
      const type = sRec.lessonType === "추가1" ? "추가1" : sRec.lessonType === "추가2" ? "추가2" : "현행";
      updates[`studentProfiles/${s.id}/confirmedHw/${type}/text`] = text;
      updates[`studentProfiles/${s.id}/confirmedHw/${type}/date`] = lesson.date;
      updates[`studentProfiles/${s.id}/confirmedHw/${type}/checkDates`] = checkDates.length ? checkDates : null;
    }
    if (Object.keys(updates).length === 0) return;
    try {
      await db.ref().update(updates);
      setConfirmDone(true);
      setTimeout(() => setConfirmDone(false), 2000);
    } catch(e) {
      alert("저장 실패: " + e.message);
    }
    setConfirmModal(null);
  };

  function fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  const pushUndo = (studentId, field, prevValue) =>
    setUndoStack(prev => [...prev.slice(-29), { studentId, field, prevValue }]);

  // 낮은 수준 저장 (undo 스택 안 쌓음)
  const rawSaveHW = async (studentId, val) => {
    if (val === "") await db.ref(`lessonAttendance/${lesson._key}/${studentId}/현행숙제`).remove();
    else await db.ref(`lessonAttendance/${lesson._key}/${studentId}/현행숙제`).set(val);
  };
  const rawSaveEval = async (studentId, val) => {
    if (val === "") await db.ref(`lessonAttendance/${lesson._key}/${studentId}/현행평가`).remove();
    else await db.ref(`lessonAttendance/${lesson._key}/${studentId}/현행평가`).set(val);
  };
  const saveAbsenceReason = async (studentId, val) => {
    if (val.trim()) await db.ref(`lessonAttendance/${lesson._key}/${studentId}/absenceReason`).set(val.trim());
    else await db.ref(`lessonAttendance/${lesson._key}/${studentId}/absenceReason`).remove();
  };
  const saveAbsenceResponse = async (studentId, val) => {
    if (val.trim()) await db.ref(`lessonAttendance/${lesson._key}/${studentId}/absenceResponse`).set(val.trim());
    else await db.ref(`lessonAttendance/${lesson._key}/${studentId}/absenceResponse`).remove();
  };

  const saveDailyComment = async (studentId, val) => {
    if (val.trim()) await db.ref(`lessonAttendance/${lesson._key}/${studentId}/dailyComment`).set(val.trim());
    else await db.ref(`lessonAttendance/${lesson._key}/${studentId}/dailyComment`).remove();
  };

  const saveArrivalTime = async (studentId, val) => {
    if (val) await db.ref(`lessonAttendance/${lesson._key}/${studentId}/arrivalTime`).set(val);
    else await db.ref(`lessonAttendance/${lesson._key}/${studentId}/arrivalTime`).remove();
  };

  const saveDepartureTime = async (studentId, val) => {
    if (val) await db.ref(`lessonAttendance/${lesson._key}/${studentId}/departureTime`).set(val);
    else await db.ref(`lessonAttendance/${lesson._key}/${studentId}/departureTime`).remove();
  };

  const saveMockExamId = async (studentId, examId) => {
    await db.ref(`lessonAttendance/${lesson._key}/${studentId}/mockExamId`).set(examId || null);
  };

  const sendReport = async (student, rec) => {
    const sentAt = new Date().toISOString();
    const curType = rec.lessonType || "현행";
    const hwText = curType === "추가1" ? rec["추가1숙제"] : curType === "추가2" ? rec["추가2숙제"] : rec["현행숙제"];
    const reportData = {
      lessonTitle: lesson.title || "",
      date: lesson.date || "",
      time: lesson.time || "",
      sentAt,
      arrivalTime: rec.arrivalTime || null,
      departureTime: rec.departureTime || null,
      tags: rec.tags || [],
      dailyComment: rec.dailyComment || "",
      absenceReason: rec.absenceReason || "",
      hwText: hwText || "",
      lessonType: curType,
    };
    await db.ref().update({
      [`lessonAttendance/${lesson._key}/${student.id}/reportSentAt`]: sentAt,
      [`parentReportIndex/${student.id}/${lesson._key}`]: reportData,
    });
  };

  const rawSaveTags = async (studentId, tags) => {
    const { xp: newXp, cp: newCp } = calcPoints(tags);

    // 이전 값 읽어서 delta 계산
    const oldSnap = await db.ref(`lessonAttendance/${lesson._key}/${studentId}`).get();
    const old = oldSnap.val() || {};
    const xpDelta = newXp - (old.xp || 0);
    const cpDelta = newCp - (old.cp || 0);
    const tagsChanged = JSON.stringify(tags) !== JSON.stringify(old.tags || []);

    // lessonAttendance 저장
    await db.ref(`lessonAttendance/${lesson._key}/${studentId}`).update({ tags, xp: newXp, cp: newCp });

    // studentProfiles에 누적 + 로그 기록
    if (tagsChanged) {
      const profileSnap = await db.ref(`studentProfiles/${studentId}`).get();
      const profile = profileSnap.val() || {};
      const updates = {};
      const newTotalXp = Number(profile.season3Xp || 0) + xpDelta;
      const newTotalCp = Math.max(0, Number(profile.unpaidCp || 0) + cpDelta);
      if (xpDelta !== 0) updates[`studentProfiles/${studentId}/season3Xp`] = newTotalXp;
      if (cpDelta !== 0) updates[`studentProfiles/${studentId}/unpaidCp`] = newTotalCp;

      // 로그 기록
      const logId = Date.now().toString();
      updates[`studentLogs/${studentId}/${logId}`] = {
        id: logId, type: "tags",
        date: lesson.date || todayString(),
        tags,
        xpDelta, cpDelta,
        totalXp: newTotalXp,
        totalCp: newTotalCp,
        createdAt: Date.now(),
      };
      await db.ref().update(updates);
    }
  };

  // 사용자 액션 저장 (undo 스택 쌓음)
  const saveHW = async (studentId, val) => {
    pushUndo(studentId, "hw", (rec[studentId] || {}).현행숙제 || "");
    await rawSaveHW(studentId, val);
    setEditingHW(null);
    refocusContainer();
  };

  // 자동 숙제 계산 모달 열기
  const openAutoHwModal = async (studentId, studentName, lessonType = "현행") => {
    // 커리큘럼 + studentPaths + 학생 프로필(계수+진행현황) + 오답상태 병렬 로드
    const [nodesSnap, pathsSnap, profileSnap, statusSnap] = await Promise.all([
      db.ref("curriculumNodes").once("value"),
      db.ref("studentPaths").once("value"),
      db.ref(`studentProfiles/${studentId}`).once("value"),
      db.ref(`problemStatus/${studentId}`).once("value"),
    ]);
    const allBoards = nodesSnap.val() || {};
    const allPaths = pathsSnap.val() || {};
    const profile = profileSnap.val() || {};
    const allStatus = statusSnap.val() || {};
    const mats = [];
    for (const [boardId, board] of Object.entries(allBoards)) {
      const startNodeId = `start_${studentId}`;
      const startNode = board[startNodeId];
      if (!startNode) continue;
      // lessonType에 맞는 보드만 사용 (기본값 "현행")
      if ((startNode.hwType || "현행") !== (lessonType || "현행")) continue;
      const customEdges = allPaths[boardId]?.[studentId];
      const hasCustom = customEdges && Object.keys(customEdges).length > 0;
      const visited = new Set();

      const processMat = (matNode, fromId) => {
        const edgeStartNum = startNode.edgeMeta?.[matNode.id]?.startNum || 1;
        const matStatus = allStatus[matNode.materialId] || {};
        const matSrc = materials.find(m => m.id === matNode.materialId);
        const totalProblems = matNode.totalProblems || matSrc?.totalProblems || 0;
        const problemStart = matSrc?.problemStart || edgeStartNum;
        const problemEnd = matSrc?.problemEnd || (problemStart + totalProblems - 1);
        const floorNum = Math.max(problemStart, edgeStartNum);
        const checkedNums = Object.keys(matStatus).map(Number).filter(n => n >= floorNum);
        const checkedSet = new Set(checkedNums);
        let startNum = floorNum;
        while (startNum <= problemEnd && checkedSet.has(startNum)) startNum++;
        const checked = Object.entries(matStatus).filter(([k]) => Number(k) >= floorNum);
        const correct = checked.filter(([,v]) => v === "correct").length;
        const wrong   = checked.filter(([,v]) => v === "wrong").length;
        const unknown = checked.filter(([,v]) => v === "unknown").length;
        const checkedCount = checked.length;
        const lastDone = checkedCount > 0
          ? [correct && `맞음 ${correct}`, wrong && `틀림 ${wrong}`, unknown && `모름 ${unknown}`].filter(Boolean).join(" / ")
          : null;
        const matData = materials.find(m => m.id === matNode.materialId);
        mats.push({
          nodeId: matNode.id,
          materialNodeId: matNode.materialId,
          materialName: matNode.materialName,
          totalProblems,
          problemEnd,
          startNum,
          lastDone,
          hwType: startNode.hwType || "현행",
          subject: matData?.subject || "공통수학1",
          minutesPerProblem: matData?.minutesPerProblem || 3,
        });
      };

      if (hasCustom) {
        // 커스텀 경로: 지정된 엣지만 따라가며 순서대로 탐색
        let curId = startNodeId;
        while (curId && !visited.has(curId)) {
          visited.add(curId);
          const node = board[curId];
          if (!node) break;
          if (node.type === "material") processMat(node, curId);
          const nextId = (node.nextNodes || []).find(nid => customEdges[`${curId}__${nid}`]);
          curId = nextId || null;
        }
      } else {
        // 커스텀 경로 없으면 BFS
        const queue = [...(startNode.nextNodes || [])];
        while (queue.length) {
          const toId = queue.shift();
          if (visited.has(toId)) continue;
          visited.add(toId);
          const matNode = board[toId];
          if (!matNode) continue;
          if (matNode.type !== "material") {
            for (const nid of (matNode.nextNodes || [])) queue.push(nid);
            continue;
          }
          processMat(matNode, toId);
          for (const nid of (matNode.nextNodes || [])) queue.push(nid);
        }
      }
    }
    // 완료된 교재 건너뛰고 첫 번째 미완료 교재 선택
    const firstActiveIdx = mats.findIndex(m => m.startNum <= m.problemEnd);
    const selectedIdx = firstActiveIdx >= 0 ? firstActiveIdx : 0;
    // 오답숙제용: 학생의 problemStatus 로드
    const statusSnap2 = await db.ref(`problemStatus/${studentId}`).once("value");
    const problemStatus = statusSnap2.val() || {};

    setAutoHwModal({
      mode: "curriculum", // "curriculum" | "wronganswer"
      studentId, studentName, lessonType, materials: mats, selectedIdx,
      days: "4",
      subject: mats[selectedIdx]?.subject || "공통수학1",
      coeff: profile.problemCoeff != null ? String(profile.problemCoeff) : "1",
      problemStatus,
      wrongCount: "20",
      hwDueDate: "",
      hwRemoved: new Set(),
    });
  };

  const saveCoeff = async (studentId, val) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0)
      await db.ref(`studentProfiles/${studentId}/problemCoeff`).set(num);
  };

  // 자동 계산 결과 생성 (BFS 순서로 여러 교재에 걸쳐 채움)
  const calcAutoHw = (modal) => {
    if (!modal || modal.materials.length === 0) return null;
    const days = parseInt(modal.days) || 1;
    const coeff = parseFloat(modal.coeff) || 1;
    const totalMin = days * 120;

    // 첫 번째 미완료 교재 찾기
    const startIdx = modal.materials.findIndex(m => m.startNum <= m.problemEnd);
    if (startIdx < 0) return { text: "모든 교재 완료", numProblems: 0, parts: [] };

    const curMat = modal.materials[startIdx];
    const minPerProb = parseFloat(curMat.minutesPerProblem) || 3;
    let needed = Math.max(1, Math.floor(totalMin / (minPerProb * coeff)));

    const parts = [];
    const allUnchecked = []; // 전체 미체크 문제 번호 목록 (순서대로)
    for (let i = startIdx; i < modal.materials.length && needed > 0; i++) {
      const m = modal.materials[i];
      const matStatus = (modal.problemStatus || {})[m.materialNodeId] || {};
      // 미체크 문제만 순서대로 수집
      const unchecked = [];
      for (let p = m.startNum; p <= m.problemEnd; p++) {
        if (!matStatus[p]) unchecked.push(p);
      }
      const remaining = unchecked.length;
      if (remaining <= 0) continue;
      const take = Math.min(needed, remaining);
      const endProblem = unchecked[take - 1];
      parts.push({ materialName: m.materialName, start: m.startNum, end: endProblem, count: take, nodeId: m.nodeId, materialNodeId: m.materialNodeId });
      allUnchecked.push(...unchecked.slice(0, take));
      needed -= take;
    }

    const numProblems = parts.reduce((s, p) => s + p.count, 0);
    const text = parts.map(p => `${p.materialName} ${p.start}~${p.end}번`).join(' + ') + ` (${numProblems}문제)`;
    return { text, numProblems, parts, uncheckedProblems: allUnchecked };
  };

  // 현행/추가 저장
  const saveLessonType = async (studentId, val) => {
    await db.ref(`lessonAttendance/${lesson._key}/${studentId}/lessonType`).set(val);
  };

  // 태그 모달 열기 (원본 스냅샷 저장)
  const openTagModal = (studentId) => {
    setTagModalOriginal([...((rec[studentId] || {}).tags || [])]);
    setTagModal(studentId);
  };

  // 태그 즉시 토글 저장 (undo 안 쌓음 — 모달 닫을 때 한 번에 쌓음)
  const handleTagToggle = async (studentId, name) => {
    const current = (rec[studentId] || {}).tags || [];
    const newTags = current.includes(name) ? current.filter(t => t !== name) : [...current, name];
    await rawSaveTags(studentId, newTags);
  };

  // 태그 모달 닫기 (변경 있으면 undo 스택에 원본 추가)
  const closeTagModal = () => {
    const currentTags = (rec[tagModal] || {}).tags || [];
    if (JSON.stringify(currentTags) !== JSON.stringify(tagModalOriginal)) {
      pushUndo(tagModal, "tags", tagModalOriginal);
    }
    setTagModal(null);
    refocusContainer();
  };

  const undoAction = async () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    if (last.field === "hw")   await rawSaveHW(last.studentId, last.prevValue);
    if (last.field === "eval") await rawSaveEval(last.studentId, last.prevValue);
    if (last.field === "tags") await rawSaveTags(last.studentId, last.prevValue);
  };

  const selectCell = (row, col) => {
    setFocusedCell({ row, col });
    containerRef.current?.focus();
  };

  const keyStateRef = React.useRef({});
  keyStateRef.current = { editingHW, unitModal, remainingModal, tagModal, focusedCell, lessonStudents, rec, profiles, clipboard, onBack, saveHW, saveUnit, rawSaveHW, rawSaveTags, pushUndo, undoAction, openTagModal, getStudentAssessmentInfo, setUnitModal, setRemainingModal, setEditingHW, setHwValue, setFocusedCell };

  const mainHandlerRef = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
      const { editingHW, unitModal, remainingModal, tagModal, focusedCell, lessonStudents, rec, profiles, clipboard, onBack, saveHW, saveUnit, rawSaveHW, rawSaveTags, pushUndo, undoAction, openTagModal, getStudentAssessmentInfo, setUnitModal: _setUnitModal, setRemainingModal: _setRemainingModal, setEditingHW: _setEditingHW, setHwValue: _setHwValue, setFocusedCell: _setFocusedCell } = keyStateRef.current;
      if (editingHW || unitModal || remainingModal || tagModal) return;
      if (!focusedCell) {
        if (e.key === "Backspace" || e.key === "Escape") { e.preventDefault(); onBack(); return; }
        if (e.key === "Tab") { e.preventDefault(); _setFocusedCell({ row: 0, col: 0 }); return; }
        return;
      }
      const { row, col } = focusedCell;
      const maxRow = lessonStudents.length - 1;

      if (e.key === "ArrowUp")    { e.preventDefault(); if (row > 0)     _setFocusedCell({ row: row - 1, col }); return; }
      if (e.key === "ArrowDown")  { e.preventDefault(); if (row < maxRow) _setFocusedCell({ row: row + 1, col }); return; }
      if (e.key === "ArrowLeft")  { e.preventDefault(); if (col > 0)      _setFocusedCell({ row, col: col - 1 }); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); if (col < 2)      _setFocusedCell({ row, col: col + 1 }); return; }
      if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); _setFocusedCell(null); onBack(); return; }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const s = lessonStudents[row];
        if (!s) return;
        const sRec = rec[s.id] || {};
        if (col === 0) { _setEditingHW(s.id); _setHwValue(sRec.현행숙제 || ""); }
        if (col === 1) {
          const info = getStudentAssessmentInfo(s.id, sRec.lessonType);
          if (info.type === "누적테스트") _setRemainingModal(s.id);
          else _setUnitModal(s.id);
        }
        if (col === 2) { openTagModal(s.id); }
        return;
      }

      if (e.key === "Delete") {
        e.preventDefault();
        const s = lessonStudents[row];
        const sRec = rec[s.id] || {};
        if (col === 0) saveHW(s.id, "");
        if (col === 1) saveUnit(s.id, null);
        if (col === 2) { pushUndo(s.id, "tags", [...(sRec.tags || [])]); rawSaveTags(s.id, []); }
        return;
      }

      const isKey = (k, code) => (e.ctrlKey || e.metaKey) && (e.key === k || e.key === k.toUpperCase() || e.keyCode === code);

      if (isKey("z", 90)) {
        e.preventDefault();
        undoAction();
        return;
      }

      if (isKey("c", 67)) {
        e.preventDefault();
        const s = lessonStudents[row];
        const sRec = rec[s.id] || {};
        if (col === 0) setClipboard({ type: "hw",   value: sRec.현행숙제 || "" });
        if (col === 1) { const cur = (profiles[s.id] || {}).currentUnit || ""; setClipboard({ type: "unit", value: cur }); }
        if (col === 2) setClipboard({ type: "tags", value: [...(sRec.tags || [])] });
        setCopyFlash(true);
        setTimeout(() => setCopyFlash(false), 900);
        return;
      }

      if (isKey("v", 86)) {
        e.preventDefault();
        if (!clipboard) return;
        const s = lessonStudents[row];
        const sRec = rec[s.id] || {};
        if (col === 0 && clipboard.type === "hw") {
          pushUndo(s.id, "hw", sRec.현행숙제 || "");
          rawSaveHW(s.id, clipboard.value);
        }
        if (col === 1 && clipboard.type === "unit") {
          saveUnit(s.id, clipboard.value);
        }
        if (col === 2 && clipboard.type === "tags") {
          pushUndo(s.id, "tags", [...(sRec.tags || [])]);
          rawSaveTags(s.id, clipboard.value);
        }
        return;
      }
    };
    mainHandlerRef.current = handler;
    window.addEventListener("keydown", handler, true);
    return () => { window.removeEventListener("keydown", handler, true); mainHandlerRef.current = null; };
  }, []);

  const isFocused = (row, col) => focusedCell?.row === row && focusedCell?.col === col;
  const focusRing = "ring-2 ring-inset ring-blue-400 bg-blue-50/60";

  const tagModalStudent = tagModal ? students.find(s => s.id === tagModal) : null;

  // 검사 날짜 지정 모달 렌더
  const renderConfirmModal = () => {
    if (!confirmModal) return null;
    const { freshRec, dueDate, removed } = confirmModal;
    // removed: Set of date strings the teacher clicked to remove
    const set = (patch) => setConfirmModal(prev => ({ ...prev, ...patch }));
    const startDate = lesson.date;
    const DOW_KR = ["일","월","화","수","목","금","토"];

    // 달력: startDate 기준 월 표시 (startDate 포함 3주치)
    const startD = new Date(startDate + "T00:00:00");
    const calYear = startD.getFullYear();
    const calMonth = startD.getMonth();
    // 해당 달의 1일부터 말일까지 + 앞뒤 패딩
    const firstOfMonth = new Date(calYear, calMonth, 1);
    const lastOfMonth = new Date(calYear, calMonth + 1, 0);
    const padStart = firstOfMonth.getDay();
    const calDays = [];
    for (let i = 0; i < padStart; i++) calDays.push(null);
    for (let d = 1; d <= lastOfMonth.getDate(); d++) calDays.push(new Date(calYear, calMonth, d));
    // 다음달도 조금 표시 (6주 고정)
    const nextDays = 42 - calDays.length;
    for (let d = 1; d <= nextDays; d++) calDays.push(new Date(calYear, calMonth + 1, d));

    // 선택된 날짜: startDate ~ dueDate 사이에서 removed에 없는 것
    const checkDates = [];
    if (dueDate && dueDate > startDate) {
      let d = new Date(startDate + "T00:00:00");
      const end = new Date(dueDate + "T00:00:00");
      while (d <= end) {
        const ymd = fmtDate(d);
        if (!removed.has(ymd)) checkDates.push(ymd);
        d.setDate(d.getDate() + 1);
      }
    }

    const handleDayClick = (ymd) => {
      if (ymd === startDate) return; // 시작일 고정
      if (!dueDate || ymd > dueDate || ymd < startDate) {
        // 범위 밖이면 마감일로 설정
        if (ymd > startDate) set({ dueDate: ymd, removed: new Set() });
        return;
      }
      // 범위 안이면 제거/복원 토글
      const next = new Set(removed);
      if (next.has(ymd)) next.delete(ymd); else next.add(ymd);
      set({ removed: next });
    };

    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}
        onClick={() => setConfirmModal(null)}>
        <div style={{ background:"white", borderRadius:16, padding:"20px 24px", minWidth:320, maxWidth:400, boxShadow:"0 8px 32px rgba(0,0,0,0.18)" }}
          onClick={e => e.stopPropagation()}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:4, color:"#1e293b" }}>📌 숙제 확정 — 검사 날짜 지정</div>
          <div style={{ fontSize:12, color:"#64748b", marginBottom:14 }}>
            시작일 <b style={{color:"#1e293b"}}>{startDate}</b> · 마감일 클릭으로 지정 후 제외할 날 클릭
          </div>

          {/* 달력 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:12 }}>
            {DOW_KR.map((d,i) => (
              <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:700, paddingBottom:3,
                color: i===0?"#ef4444":i===6?"#3b82f6":"#94a3b8" }}>{d}</div>
            ))}
            {calDays.map((d, i) => {
              if (!d) return <div key={"e"+i}/>;
              const ymd = fmtDate(d);
              const dow = d.getDay();
              const isStart = ymd === startDate;
              const isDue = ymd === dueDate;
              const inRange = dueDate && ymd >= startDate && ymd <= dueDate;
              const isRemoved = removed.has(ymd);
              const isCurrentMonth = d.getMonth() === calMonth;

              let bg = "transparent";
              let color = isCurrentMonth ? (dow===0?"#ef4444":dow===6?"#3b82f6":"#334155") : "#d1d5db";
              let fontWeight = 500;

              if (isStart) { bg="#1e293b"; color="white"; fontWeight=700; }
              else if (isDue) { bg="#7c3aed"; color="white"; fontWeight=700; }
              else if (inRange && !isRemoved) { bg="#dbeafe"; color="#1d4ed8"; fontWeight=600; }
              else if (inRange && isRemoved) { bg="transparent"; color="#cbd5e1"; }

              return (
                <button key={ymd} onClick={() => isCurrentMonth && handleDayClick(ymd)}
                  style={{ borderRadius:7, border:"none", padding:"6px 0", fontSize:12, fontWeight,
                    background: bg, color,
                    cursor: isStart ? "default" : isCurrentMonth ? "pointer" : "default",
                    opacity: isCurrentMonth ? 1 : 0.35,
                    textDecoration: inRange && isRemoved ? "line-through" : "none" }}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {!dueDate && (
            <div style={{ fontSize:12, color:"#94a3b8", marginBottom:14 }}>마감일을 달력에서 클릭해 선택하세요.</div>
          )}
          {dueDate && (
            <div style={{ fontSize:12, color:"#64748b", marginBottom:14 }}>
              검사일 <b style={{color:"#1e293b"}}>{checkDates.length}일</b>
              <span style={{ color:"#94a3b8", marginLeft:8, fontSize:11 }}>
                {checkDates.map(d=>d.slice(5).replace("-","/")).join(", ")}
              </span>
            </div>
          )}

          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => checkDates.length > 0 && doConfirmHomework(
                checkDates.map(d => ({ date: d, selected: true })), freshRec
              )}
              disabled={checkDates.length === 0}
              style={{ flex:1, padding:"9px 0", borderRadius:8, border:"none", fontSize:13, fontWeight:700,
                cursor: checkDates.length > 0 ? "pointer" : "not-allowed",
                background: checkDates.length > 0 ? "#1e293b" : "#e2e8f0",
                color: checkDates.length > 0 ? "white" : "#94a3b8" }}>
              확정
            </button>
            <button onClick={() => setConfirmModal(null)}
              style={{ flex:1, padding:"9px 0", borderRadius:8, border:"1.5px solid #e2e8f0", background:"white", color:"#64748b", fontWeight:600, fontSize:13, cursor:"pointer" }}>
              취소
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 자동 숙제 모달 렌더
  const renderAutoHwModal = () => {
    if (!autoHwModal) return null;
    const m = autoHwModal;
    const result = calcAutoHw(m);
    const set = (patch) => setAutoHwModal(prev => ({ ...prev, ...patch }));
    const inputCls = "w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300";

    // 오답 기준 모드: 커리큘럼 순서대로 틀림/모름 문제 수집
    const wrongResult = (() => {
      if (m.mode !== "wronganswer") return null;
      const limit = parseInt(m.wrongCount) || 0;
      if (limit <= 0) return null;
      const allWrong = []; // { materialName, num, status }
      for (const mat of m.materials) {
        const matStatus = (m.problemStatus || {})[mat.materialNodeId] || {};
        const startNum = Number(mat.problemStart) || 1;
        const endNum = mat.problemEnd ? Number(mat.problemEnd) : startNum + (mat.totalProblems || 0) - 1;
        for (let n = startNum; n <= endNum; n++) {
          const s = matStatus[n];
          if (s === "wrong" || s === "unknown") {
            allWrong.push({ materialName: mat.materialName, materialNodeId: mat.materialNodeId, num: n, status: s });
          }
        }
      }
      const taken = allWrong.slice(0, limit);
      if (taken.length === 0) return { taken: [], text: null, total: 0, totalAvail: allWrong.length };
      // 교재별로 그룹화해서 텍스트 생성
      const grouped = {};
      for (const p of taken) {
        if (!grouped[p.materialName]) grouped[p.materialName] = [];
        grouped[p.materialName].push(p.num);
      }
      const parts = Object.entries(grouped).map(([name, nums]) => `${name} ${nums.join(",")}번`);
      const text = parts.join(" + ") + ` (오답 ${taken.length}문제)`;
      return { taken, text, total: taken.length, totalAvail: allWrong.length };
    })();

    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}
        onClick={() => setAutoHwModal(null)}>
        <div style={{ background:"white", borderRadius:14, padding:"20px 24px", minWidth:340, maxWidth:420, boxShadow:"0 8px 32px rgba(0,0,0,0.18)" }}
          onClick={e => e.stopPropagation()}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:12, color:"#1e293b" }}>📐 자동 숙제 계산 — {m.studentName}</div>

          {/* 모드 토글 */}
          <div style={{ display:"flex", gap:4, background:"#f1f5f9", borderRadius:10, padding:4, marginBottom:14 }}>
            {[["curriculum","📚 커리큘럼"],["wronganswer","❌ 오답"]].map(([mode, label]) => (
              <button key={mode} onClick={() => set({ mode, selectedMockExamId:"", mockExamResult:null, selectedMockExam:null })}
                style={{ flex:1, padding:"6px 0", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s",
                  background: m.mode===mode ? "white" : "transparent",
                  color: m.mode===mode ? "#1e293b" : "#94a3b8",
                  boxShadow: m.mode===mode ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── 커리큘럼 모드 ── */}
          {m.mode === "curriculum" && (
            <>
              {m.materials.length === 0 ? (
                <div style={{ fontSize:13, color:"#94a3b8", marginBottom:16 }}>커리큘럼에 연결된 교재가 없습니다.<br/>커리큘럼 편집에서 학생 노드와 교재 노드를 연결하세요.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>과목</div>
                    <select value={m.subject} onChange={e=>set({subject:e.target.value})} className={inputCls}>
                      {["중1-1","중1-2","중2-1","중2-2","중3-1","중3-2","공통수학1","공통수학2","대수","미적분1","기하","미적분","확률과통계"].map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <div>
                      <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>몇 일치</div>
                      <input type="number" min="1" value={m.days} onChange={e=>set({days:e.target.value})} className={inputCls} style={{ textAlign:"center" }}/>
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>계수</div>
                      <input type="number" min="0.1" step="0.1" value={m.coeff} onChange={e=>set({coeff:e.target.value})} onBlur={e=>saveCoeff(m.studentId, e.target.value)} className={inputCls} style={{ textAlign:"center" }}/>
                    </div>
                  </div>
                  {(() => {
                    const activeIdx = m.materials.findIndex(mat => mat.startNum <= mat.problemEnd);
                    const activeMat = activeIdx >= 0 ? m.materials[activeIdx] : null;
                    if (!activeMat) return null;
                    return (
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ fontSize:11, color:"#64748b", whiteSpace:"nowrap" }}>시작 번호 ({activeMat.materialName})</div>
                        <input type="number" min="1" value={activeMat.startNum}
                          onChange={e => {
                            const v = parseInt(e.target.value) || 1;
                            set({ materials: m.materials.map((mat, i) => i === activeIdx ? { ...mat, startNum: v } : mat) });
                          }}
                          className={inputCls} style={{ textAlign:"center", width:70 }} />
                      </div>
                    );
                  })()}
                  {result && result.parts && result.parts.length > 0 && (
                    <div style={{ fontSize:11, color:"#64748b" }}>
                      하루 2시간 × {m.days}일 = {(parseInt(m.days)||0)*120}분 ÷ ({result.parts[0] && (m.materials.find(mat=>mat.nodeId===result.parts[0].nodeId)?.minutesPerProblem||3)}분 × {m.coeff}) = <b>{result.numProblems}문제</b>
                    </div>
                  )}
                  {result && result.numProblems > 0 && (
                    <div style={{ background:"#eef2ff", borderRadius:8, padding:"8px 12px", fontSize:13, fontWeight:600, color:"#3730a3" }}>
                      📝 {result.text}
                    </div>
                  )}
                  {result && result.numProblems === 0 && (
                    <div style={{ fontSize:13, color:"#10b981" }}>✅ 모든 교재 완료</div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── 오답 모드 ── */}
          {m.mode === "wronganswer" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
              <div>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>
                  몇 문제 낼까요?
                  {wrongResult && <span style={{ color:"#94a3b8", marginLeft:6 }}>(총 오답 {wrongResult.totalAvail}문제)</span>}
                </div>
                <input type="number" min="1" value={m.wrongCount}
                  onChange={e => set({ wrongCount: e.target.value })}
                  className={inputCls} style={{ textAlign:"center" }} placeholder="예: 20"/>
              </div>
              {wrongResult && wrongResult.totalAvail === 0 && (
                <div style={{ fontSize:13, color:"#10b981" }}>✅ 틀림/모름 문제가 없습니다.</div>
              )}
              {wrongResult && wrongResult.taken.length > 0 && (
                <>
                  <div style={{ background:"#f8fafc", borderRadius:8, padding:"8px 12px", maxHeight:100, overflowY:"auto" }}>
                    {Object.entries(
                      wrongResult.taken.reduce((acc, p) => {
                        if (!acc[p.materialName]) acc[p.materialName] = { wrong:[], unknown:[] };
                        acc[p.materialName][p.status === "wrong" ? "wrong" : "unknown"].push(p.num);
                        return acc;
                      }, {})
                    ).map(([name, { wrong, unknown }]) => (
                      <div key={name} style={{ marginBottom:4 }}>
                        <span style={{ fontSize:11, fontWeight:600, color:"#334155" }}>{name}</span>
                        {wrong.length > 0 && <span style={{ fontSize:11, color:"#ef4444", marginLeft:6 }}>❌ {wrong.join(",")}번</span>}
                        {unknown.length > 0 && <span style={{ fontSize:11, color:"#8b5cf6", marginLeft:6 }}>❓ {unknown.join(",")}번</span>}
                      </div>
                    ))}
                  </div>
                  <div style={{ background:"#eef2ff", borderRadius:8, padding:"8px 12px", fontSize:13, fontWeight:600, color:"#3730a3" }}>
                    📝 {wrongResult.text}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── 공통: 마감일 달력 ── */}
          {(() => {
            const hwText = m.mode === "curriculum" ? (result?.numProblems > 0 ? result.text : null) : (wrongResult?.text || null);
            if (!hwText) return null;
            const startDate = lesson.date;
            const due = m.hwDueDate;
            const removed = m.hwRemoved;
            const DOW_KR = ["일","월","화","수","목","금","토"];

            const startD = new Date(startDate + "T00:00:00");
            const calYear = startD.getFullYear(), calMonth = startD.getMonth();
            const firstOfMonth = new Date(calYear, calMonth, 1);
            const lastOfMonth = new Date(calYear, calMonth + 1, 0);
            const calDays = [];
            for (let i = 0; i < firstOfMonth.getDay(); i++) calDays.push(null);
            for (let d = 1; d <= lastOfMonth.getDate(); d++) calDays.push(new Date(calYear, calMonth, d));
            const nextDays = 42 - calDays.length;
            for (let d = 1; d <= nextDays; d++) calDays.push(new Date(calYear, calMonth + 1, d));

            const checkDates = [];
            if (due && due > startDate) {
              let d = new Date(startDate + "T00:00:00");
              const end = new Date(due + "T00:00:00");
              while (d <= end) { const ymd = fmtDate(d); if (!removed.has(ymd)) checkDates.push(ymd); d.setDate(d.getDate()+1); }
            }

            const handleDay = (ymd) => {
              if (ymd === startDate) return;
              if (ymd === due) { set({ hwDueDate: "", hwRemoved: new Set() }); return; }
              if (ymd > startDate) set({ hwDueDate: ymd, hwRemoved: new Set() });
            };

            const applyHw = async () => {
              if (m.mode === "curriculum") {
                const firstPart = result.parts[0];
                const firstMat = m.materials.find(mat => mat.nodeId === firstPart?.nodeId) || m.materials[0];
                const hwType = m.lessonType || firstMat.hwType || "현행";
                await saveHW(m.studentId, result.text);
                await db.ref(`studentProfiles/${m.studentId}/confirmedHw/${hwType}`).set({
                  text: result.text, date: lesson.date || todayString(), isAuto: true,
                  autoSubject: m.subject || "수학", autoHwType: hwType,
                  autoTotalAmount: result.numProblems, autoStartProblem: firstPart?.start,
                  autoUncheckedProblems: result.uncheckedProblems || null,
                  autoMaterialNodeId: firstMat.nodeId, autoMaterialId: firstMat.materialNodeId,
                  checkDates: checkDates.length ? checkDates : null,
                  hwStartDate: lesson.date || todayString(),
                  hwDueDate: due || null,
                });
              } else {
                await saveHW(m.studentId, wrongResult.text);
                const hwType = m.lessonType || "현행";
                await db.ref(`studentProfiles/${m.studentId}/confirmedHw/${hwType}`).update({
                  text: wrongResult.text, date: lesson.date || todayString(),
                  checkDates: checkDates.length ? checkDates : null,
                });
              }
              setAutoHwModal(null);
            };

            return (
              <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:12, marginTop:4 }}>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:6 }}>
                  마감일 클릭
                  {due && <span style={{ marginLeft:8, color:"#1e293b", fontWeight:600 }}>검사일 {checkDates.length}일</span>}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:8 }}>
                  {DOW_KR.map((d,i) => (
                    <div key={d} style={{ textAlign:"center", fontSize:9, fontWeight:700, paddingBottom:2, color:i===0?"#ef4444":i===6?"#3b82f6":"#94a3b8" }}>{d}</div>
                  ))}
                  {calDays.map((d, i) => {
                    if (!d) return <div key={"e"+i}/>;
                    const ymd = fmtDate(d);
                    const dow = d.getDay();
                    const isStart = ymd === startDate;
                    const isDue = ymd === due;
                    const inRange = due && ymd >= startDate && ymd <= due;
                    const isRemoved = removed.has(ymd);
                    const isCurrentMonth = d.getMonth() === calMonth;
                    let bg = "transparent", color = isCurrentMonth?(dow===0?"#ef4444":dow===6?"#3b82f6":"#334155"):"#d1d5db", fw = 500;
                    if (isStart) { bg="#1e293b"; color="white"; fw=700; }
                    else if (isDue) { bg="#7c3aed"; color="white"; fw=700; }
                    else if (inRange && !isRemoved) { bg="#dbeafe"; color="#1d4ed8"; fw=600; }
                    else if (inRange && isRemoved) { color="#cbd5e1"; }
                    return (
                      <button key={ymd} onClick={() => isCurrentMonth && handleDay(ymd)}
                        style={{ borderRadius:6, border:"none", padding:"4px 0", fontSize:11, fontWeight:fw, background:bg, color,
                          cursor: isStart?"default":isCurrentMonth?"pointer":"default",
                          opacity: isCurrentMonth?1:0.3,
                          textDecoration: inRange&&isRemoved?"line-through":"none" }}>
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={applyHw}
                    style={{ flex:1, padding:"8px 0", borderRadius:8, border:"none", background:"#1e293b", color:"white", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                    적용
                  </button>
                  <button onClick={() => setAutoHwModal(null)}
                    style={{ flex:1, padding:"8px 0", borderRadius:8, border:"1.5px solid #e2e8f0", background:"white", color:"#64748b", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                    취소
                  </button>
                </div>
              </div>
            );
          })()}
          {/* 아직 결과 없으면 취소만 */}
          {(m.mode==="curriculum" ? !(result?.numProblems>0) : !(wrongResult?.text)) && (
            <button onClick={() => setAutoHwModal(null)}
              style={{ width:"100%", padding:"8px 0", borderRadius:8, border:"1.5px solid #e2e8f0", background:"white", color:"#64748b", fontWeight:600, fontSize:13, cursor:"pointer" }}>
              취소
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={fullscreenRef} className={isFullscreen ? "bg-white p-4 min-h-screen overflow-auto flex flex-col" : "space-y-4"}>
      {renderConfirmModal()}
      {renderAutoHwModal()}
      {/* 헤더 */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {!isFullscreen && <button onClick={onBack}
              className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold text-lg">‹</button>}
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${isFullscreen ? "text-xl" : "text-base"}`}>{lesson.title}</span>
                {lesson.sessionType && lesson.sessionType !== "수업" && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border ${
                    lesson.sessionType === "평가" ? "bg-amber-50 text-amber-600 border-amber-200"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>
                    {lesson.sessionType === "평가" ? "📝 평가" : "🔧 보강"}
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-500">{lesson.date}{lesson.time ? " · " + lesson.time.slice(0, 5) : ""} · {lessonStudents.length}명</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isFullscreen && clipboard && (
              <span className={`text-[11px] px-2 py-1 rounded-lg border transition ${copyFlash ? "bg-blue-100 text-blue-600 border-blue-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                {copyFlash ? "복사됨" : `클립보드: ${clipboard.type === "hw" ? "현행숙제" : "태그"}`}
              </span>
            )}
            {!isFullscreen && undoStack.length > 0 && (
              <button onClick={undoAction}
                className="text-[11px] px-2 py-1 rounded-lg border bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 transition">
                ↩ 실행취소 ({undoStack.length})
              </button>
            )}
            {!isFullscreen && <span className="text-[11px] text-slate-400 hidden sm:block">↑↓←→ · Enter · Del · Ctrl+C/V/Z</span>}
            {!isFullscreen && <button onClick={confirmHomework}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition ${confirmDone ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"}`}>
              {confirmDone ? "✅ 확정 완료" : "📌 숙제 확정"}
            </button>}
            {!isViewer && !isFullscreen && <Btn variant="outline" size="sm" onClick={onEdit}>✏️ 수업 편집</Btn>}
            {!isViewer && !isFullscreen && onDelete && (
              <button onClick={() => { if (confirm("수업을 삭제하시겠습니까? 출결 기록도 함께 삭제됩니다.")) onDelete(); }}
                className="text-xs px-3 py-1.5 rounded-lg font-bold border transition bg-red-50 text-red-600 border-red-200 hover:bg-red-100">
                🗑 수업 삭제
              </button>
            )}
            <button onClick={toggleFullscreen}
              className="text-xs px-3 py-1.5 rounded-lg font-bold border bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 transition">
              {isFullscreen ? "⛶ 전체화면 종료" : "⛶ 전체화면"}
            </button>
          </div>
        </div>
      </Card>

      {/* 전체화면: 2단 카드 그리드 */}
      {isFullscreen ? (
        <div className="grid grid-cols-2 gap-3 flex-1 mt-1" style={{zoom: 3.36}}>
          {lessonStudents.map((s) => {
            const sRec = rec[s.id] || {};
            const tags = sRec.tags || [];
            const { xp, cp } = calcPoints(tags);
            const { name: asmName, type, units, totalProblems } = getStudentAssessmentInfo(s.id, sRec.lessonType);
            const profile = profiles[s.id] || {};
            const curUnit = profile.currentUnit || "";
            const unitObj = units.find(u => u.num === curUnit);
            const rem = profile.remainingProblems != null ? profile.remainingProblems : totalProblems;
            return (
              <div key={s.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                <div className="px-4 py-2.5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{s.name[0]}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900">{s.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${sRec.lessonType === "추가1" ? "bg-violet-100 text-violet-700 border-violet-200" : sRec.lessonType === "추가2" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-sky-50 text-sky-600 border-sky-200"}`}>
                        {sRec.lessonType === "추가1" ? "추가1" : sRec.lessonType === "추가2" ? "추가2" : "현행"}
                      </span>
                      <span className="text-xs text-slate-400">{s.className}</span>
                      {tags.length > 0 && <span className={`text-xs font-bold ml-auto ${xp >= 0 ? "text-emerald-600" : "text-red-500"}`}>{xp >= 0 ? "+" : ""}{xp}XP</span>}
                      {tags.length > 0 && <span className="text-xs font-bold text-blue-600">+{cp}CP</span>}
                      <button
                        onClick={e => { e.stopPropagation(); setAddHwExpanded(prev => ({ ...prev, [s.id]: !prev[s.id] })); }}
                        className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition"
                        style={{ background: addHwExpanded[s.id] ? "#1e293b" : "#f1f5f9", color: addHwExpanded[s.id] ? "white" : "#64748b" }}>
                        {addHwExpanded[s.id] ? "×" : "+"}
                      </button>
                    </div>
                    {sRec.현행숙제 && (
                      <div className="text-sm text-slate-700">
                        <span className={`text-[10px] font-bold mr-1 ${sRec.lessonType === "추가1" ? "text-violet-500" : sRec.lessonType === "추가2" ? "text-rose-500" : "text-sky-500"}`}>{sRec.lessonType === "추가1" ? "(추1)" : sRec.lessonType === "추가2" ? "(추2)" : "(현)"}</span>
                        {sRec.현행숙제}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {asmName && (
                        <span className="text-xs text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                          {type === "누적테스트" ? `${asmName} · 남은 ${rem}문제` : `${asmName}${curUnit ? " · " + curUnit : ""}`}
                        </span>
                      )}
                      {tags.map(name => {
                        const t = BEHAVIOR_TAGS.find(b => b.name === name);
                        const neg = t && t.xp < 0;
                        return <span key={name} className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${neg ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{name}</span>;
                      })}
                    </div>
                  </div>
                </div>
                {addHwExpanded[s.id] && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">숙제 추가:</span>
                    {["현행", "추가1", "추가2"].map(tab => (
                      <button key={tab} onClick={e => { e.stopPropagation(); setAddHwExpanded(prev => ({ ...prev, [s.id]: false })); openAutoHwModal(s.id, s.name, tab); }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border transition ${tab === "추가1" ? "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100" : tab === "추가2" ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" : "bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100"}`}>
                        {tab}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
      /* 일반 표 */
      <Card className="p-0 overflow-hidden">
        <div ref={containerRef} tabIndex={0} className="overflow-x-auto outline-none">
          <table className="text-sm border-collapse" style={{tableLayout:"fixed", minWidth: colWidths.reduce((a,b)=>a+b,0)}}>
            <colgroup>
              {colWidths.map((w, i) => <col key={i} style={{width: w}}/>)}
            </colgroup>
            <thead>
              <tr className="bg-slate-50">
                {(isMockSession
                  ? [["학생","left","text-slate-500",true],["행동태그","left","text-slate-600",false],["모의평가 내용","left","text-slate-600",false],["등원","center","text-slate-600",false],["하원","center","text-slate-600",false],["획득 XP","center","text-slate-600",false],["획득 CP","center","text-slate-600",false]]
                  : [["학생","left","text-slate-500",true],["지난 숙제","left","text-slate-400",false],["숙제","left","text-slate-600",false],["평가","left","text-slate-600",false],["행동태그","left","text-slate-600",false],["데일리코멘트","left","text-slate-600",false],["등원","center","text-slate-600",false],["하원","center","text-slate-600",false],["획득 XP","center","text-slate-600",false],["획득 CP","center","text-slate-600",false],["보고서","center","text-slate-600",false]]
                ).map(([label, align, color, sticky], ci) => (
                  <th key={ci} className={`${sticky?"sticky left-0 z-10 bg-slate-50 ":""}px-4 py-3 text-${align} text-xs font-bold ${color} border-b border-r border-slate-200 select-none overflow-hidden`}
                    style={{position: sticky ? "sticky" : "relative", width: colWidths[ci]}}>
                    <span className="truncate block">{label}</span>
                    <div onMouseDown={e => onResizeStart(ci, e)}
                      style={{position:"absolute",right:0,top:0,bottom:0,width:6,cursor:"col-resize",zIndex:10,background:"transparent"}}
                      className="hover:bg-blue-300 opacity-0 hover:opacity-60 transition-opacity"/>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lessonStudents.map((s, si) => {
                const sRec = rec[s.id] || {};
                const tags = sRec.tags || [];
                const { xp, cp } = calcPoints(tags);
                const total = cumulativeTotals[s.id] || { xp: 0, cp: 0 };

                if (isMockSession) {
                  return (
                    <tr key={s.id} className={si % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                      {/* 학생 */}
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-3 border-b border-r border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">{s.name[0]}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-sm">{s.name}</span>
                              {onViewStudent && (
                                <button type="button" onClick={e => { e.stopPropagation(); onViewStudent(s.id); }}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md font-bold border transition shrink-0"
                                  style={{background:"#eef2ff", color:"#4a6bd6", borderColor:"#c7d2fe"}}>
                                  👤
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 flex gap-2">
                              <span>{s.className}</span>
                              <span className="text-slate-300">|</span>
                              <span>누적 <span className="text-emerald-600 font-medium">{total.xp >= 0 ? "+" : ""}{total.xp}XP</span></span>
                              <span className="text-blue-600 font-medium">+{total.cp}CP</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* 행동태그 */}
                      <td className={`border-b border-r border-slate-100 px-3 py-2 cursor-pointer transition ${isFocused(si, 0) ? focusRing : ""}`}
                        onClick={() => { selectCell(si, 0); openTagModal(s.id); }}>
                        {tags.length > 0 ? (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap gap-1">
                              {tags.map(name => {
                                const t = BEHAVIOR_TAGS.find(b => b.name === name);
                                const neg = t && t.xp < 0;
                                return (
                                  <span key={name} className={`text-[10px] px-1.5 py-0.5 rounded-lg border font-medium ${neg ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                                    {name}
                                  </span>
                                );
                              })}
                            </div>
                            {(tags.includes("결석") || tags.includes("무단결석")) && (
                              <div className="space-y-1" onClick={e => e.stopPropagation()}>
                                <input
                                  defaultValue={sRec.absenceReason || ""}
                                  onBlur={e => saveAbsenceReason(s.id, e.target.value)}
                                  placeholder="결석 사유..."
                                  className="w-full text-[11px] text-slate-600 outline-none bg-red-50 border border-red-200 rounded-lg px-2 py-1 placeholder-red-300"
                                />
                                <input
                                  defaultValue={sRec.absenceResponse || ""}
                                  onBlur={e => saveAbsenceResponse(s.id, e.target.value)}
                                  placeholder="처리 내용..."
                                  className="w-full text-[11px] text-slate-600 outline-none bg-orange-50 border border-orange-200 rounded-lg px-2 py-1 placeholder-orange-300"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-300">태그 선택</span>
                        )}
                      </td>
                      {/* 모의평가 내용 */}
                      {(() => {
                        const selectedExam = mockExams.find(e => e.id === sRec.mockExamId);
                        const selectedFolderId = sRec.mockFolderId || (selectedExam ? selectedExam.folderId : "");
                        const folderExams = mockExams.filter(e => e.folderId === selectedFolderId);
                        return (
                          <td className="border-b border-r border-slate-100 px-3 py-2 space-y-1.5">
                            {/* 폴더(과목) 선택 */}
                            <select
                              value={selectedFolderId || ""}
                              onChange={e => {
                                e.stopPropagation();
                                db.ref(`lessonAttendance/${lesson._key}/${s.id}/mockFolderId`).set(e.target.value || null);
                                db.ref(`lessonAttendance/${lesson._key}/${s.id}/mockExamId`).set(null);
                              }}
                              onClick={e => e.stopPropagation()}
                              className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 outline-none focus:ring-2 focus:ring-slate-300">
                              <option value="">과목 선택</option>
                              {mockExamFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            {/* 시험지 선택 */}
                            {selectedFolderId && (
                              <select
                                value={sRec.mockExamId || ""}
                                onChange={e => { e.stopPropagation(); saveMockExamId(s.id, e.target.value); }}
                                onClick={e => e.stopPropagation()}
                                className="w-full text-xs rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 outline-none focus:ring-2 focus:ring-amber-300">
                                <option value="">시험지 선택</option>
                                {folderExams.map(e => <option key={e.id} value={e.id}>{e.name}{e.round ? ` (${e.round}회)` : ""}</option>)}
                              </select>
                            )}
                          </td>
                        );
                      })()}
                      {/* 등원 */}
                      <td className="border-b border-r border-slate-100 text-center py-1.5 px-2">
                        <input type="time" defaultValue={sRec.arrivalTime || ""}
                          onBlur={e => saveArrivalTime(s.id, e.target.value)}
                          className="w-full text-xs text-center outline-none bg-transparent text-slate-600"
                          onClick={e => e.stopPropagation()}/>
                      </td>
                      {/* 하원 */}
                      <td className="border-b border-r border-slate-100 text-center py-1.5 px-2">
                        <input type="time" defaultValue={sRec.departureTime || ""}
                          onBlur={e => saveDepartureTime(s.id, e.target.value)}
                          className="w-full text-xs text-center outline-none bg-transparent text-slate-600"
                          onClick={e => e.stopPropagation()}/>
                      </td>
                      {/* XP */}
                      <td className="border-b border-r border-slate-100 text-center py-2.5 px-3">
                        {tags.length > 0 ? <span className={`text-sm font-bold ${xp >= 0 ? "text-emerald-600" : "text-red-600"}`}>{xp >= 0 ? "+" : ""}{xp}</span> : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      {/* CP */}
                      <td className="border-b border-r border-slate-100 text-center py-2.5 px-3">
                        {tags.length > 0 ? <span className="text-sm font-bold text-blue-600">+{cp}</span> : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                }

                return (<React.Fragment key={s.id}>
                  <tr className={si % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-3 border-b border-r border-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">{s.name[0]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm">{s.name}</span>
                            <button type="button"
                              onClick={e => { e.stopPropagation(); saveLessonType(s.id, sRec.lessonType === "현행" ? "추가1" : sRec.lessonType === "추가1" ? "추가2" : "현행"); }}
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border transition shrink-0
                                ${sRec.lessonType === "추가1"
                                  ? "bg-violet-100 text-violet-700 border-violet-300 hover:bg-violet-200"
                                  : sRec.lessonType === "추가2"
                                  ? "bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200"
                                  : "bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100"}`}>
                              {sRec.lessonType === "추가1" ? "추가1" : sRec.lessonType === "추가2" ? "추가2" : "현행"}
                            </button>
                            {onViewStudent && (
                              <button type="button" onClick={e => { e.stopPropagation(); onViewStudent(s.id); }}
                                className="text-[10px] px-1.5 py-0.5 rounded-md font-bold border transition shrink-0"
                                style={{background:"#eef2ff", color:"#4a6bd6", borderColor:"#c7d2fe"}}>
                                👤
                              </button>
                            )}
                            <button type="button" onClick={e => { e.stopPropagation(); setAddHwExpanded(prev => ({ ...prev, [s.id]: !prev[s.id] })); }}
                              className="text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border transition shrink-0"
                              style={addHwExpanded[s.id] ? {background:"#1e293b",color:"white",borderColor:"#1e293b"} : {background:"#f8fafc",color:"#94a3b8",borderColor:"#e2e8f0"}}>
                              {addHwExpanded[s.id] ? "×" : "+"}
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 flex gap-2">
                            <span>{s.className}</span>
                            <span className="text-slate-300">|</span>
                            <span>누적 <span className="text-emerald-600 font-medium">{total.xp >= 0 ? "+" : ""}{total.xp}XP</span></span>
                            <span className="text-blue-600 font-medium">+{total.cp}CP</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 지난 숙제 — 현재 lessonType과 같은 타입의 이전 숙제만 표시 */}
                    {(() => {
                      const curType = sRec.lessonType || "현행";
                      const entry = prevHwMap[s.id]?.[curType];
                      return (
                        <td className="border-b border-r border-slate-100 px-3 py-2.5">
                          {entry ? (
                            <div>
                              <div className="text-xs text-slate-600 leading-snug">{entry.text}</div>
                              <div className="text-[10px] text-slate-300 mt-0.5">{entry.date}</div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-200">—</span>
                          )}
                        </td>
                      );
                    })()}

                    {/* 숙제 */}
                    <td className={`border-b border-r border-slate-100 px-3 py-2.5 cursor-text transition ${isFocused(si, 0) ? focusRing : ""}`}
                      onClick={() => selectCell(si, 0)}
                      onDoubleClick={() => { selectCell(si, 0); setEditingHW(s.id); setHwValue(sRec.현행숙제 || ""); }}>
                      {editingHW === s.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold shrink-0 ${sRec.lessonType === "추가1" ? "text-violet-500" : sRec.lessonType === "추가2" ? "text-rose-500" : "text-sky-500"}`}>
                            {sRec.lessonType === "추가1" ? "(추1)" : sRec.lessonType === "추가2" ? "(추2)" : "(현)"}
                          </span>
                          <input autoFocus value={hwValue} onChange={e => setHwValue(e.target.value)}
                            onBlur={() => saveHW(s.id, hwValue)}
                            onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); saveHW(s.id, hwValue); const next = si + 1; if (next < lessonStudents.length) setFocusedCell({ row: next, col: 0 }); } if (e.key === "Escape") { e.stopPropagation(); setEditingHW(null); setFocusedCell(null); refocusContainer(); } }}
                            className="flex-1 text-xs border-b border-slate-400 outline-none bg-transparent py-0.5" />
                          <button onMouseDown={e=>e.preventDefault()} onClick={e=>{e.stopPropagation();openAutoHwModal(s.id,s.name,sRec.lessonType||"현행");}}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 shrink-0 font-bold">자동</button>
                          <button onMouseDown={e=>e.preventDefault()} onClick={e=>{e.stopPropagation();}}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 shrink-0 font-bold">수동</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold shrink-0 ${sRec.lessonType === "추가1" ? "text-violet-500" : sRec.lessonType === "추가2" ? "text-rose-500" : "text-sky-500"}`}>
                            {sRec.lessonType === "추가1" ? "(추1)" : sRec.lessonType === "추가2" ? "(추2)" : "(현)"}
                          </span>
                          <span className="text-xs text-slate-600 flex-1">{sRec.현행숙제 || <span className="text-slate-300">입력</span>}</span>
                          <button onMouseDown={e=>e.preventDefault()} onClick={e=>{e.stopPropagation();openAutoHwModal(s.id,s.name,sRec.lessonType||"현행");}}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 shrink-0 font-bold opacity-60 hover:opacity-100">자동</button>
                          <button onMouseDown={e=>e.preventDefault()} onClick={e=>{e.stopPropagation();selectCell(si,0);setEditingHW(s.id);setHwValue(sRec.현행숙제||"");}}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 shrink-0 font-bold opacity-60 hover:opacity-100">수동</button>
                        </div>
                      )}
                    </td>

                    {/* 현행평가 */}
                    {(() => {
                      const { name: asmName, type, units, totalProblems } = getStudentAssessmentInfo(s.id, sRec.lessonType);
                      const profile = profiles[s.id] || {};
                      const openModal = () => {
                        selectCell(si, 1);
                        if (type === "누적테스트") setRemainingModal(s.id);
                        else setUnitModal(s.id);
                      };
                      if (type === "누적테스트") {
                        const rem = profile.remainingProblems != null ? profile.remainingProblems : totalProblems;
                        const pct = totalProblems > 0 ? Math.round((1 - rem / totalProblems) * 100) : 0;
                        return (
                          <td className={`border-b border-r border-slate-100 px-3 py-2.5 cursor-pointer transition ${isFocused(si, 1) ? focusRing : ""}`}
                            onClick={() => selectCell(si, 1)} onDoubleClick={openModal}>
                            <div>
                              <div className="text-xs text-slate-400 truncate">{asmName}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-sm font-bold text-orange-500 font-mono">{rem}</span>
                                <span className="text-xs text-slate-400">/ {totalProblems}</span>
                                <span className="text-xs text-slate-400">({pct}%완료)</span>
                              </div>
                            </div>
                          </td>
                        );
                      }
                      const curUnit = profile.currentUnit || "";
                      const unitObj = units.find(u => u.num === curUnit);
                      return (
                        <td className={`border-b border-r border-slate-100 px-3 py-2.5 cursor-pointer transition ${isFocused(si, 1) ? focusRing : ""}`}
                          onClick={() => selectCell(si, 1)} onDoubleClick={openModal}>
                          {asmName ? (
                            <div>
                              <div className="text-xs text-slate-400 truncate">{asmName}</div>
                              <div className="text-sm font-semibold text-blue-600 font-mono">
                                {curUnit || <span className="text-slate-300 font-normal">미설정</span>}
                                {unitObj && <span className="text-xs text-slate-400 font-normal ml-1">{unitObj.minor}</span>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">평가 없음</span>
                          )}
                        </td>
                      );
                    })()}

                    {/* 행동태그 */}
                    <td className={`border-b border-r border-slate-100 px-3 py-2 cursor-pointer transition ${isFocused(si, 2) ? focusRing : ""}`}
                      onClick={() => { selectCell(si, 2); openTagModal(s.id); }}>
                      {tags.length > 0 ? (
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1">
                            {tags.map(name => {
                              const t = BEHAVIOR_TAGS.find(b => b.name === name);
                              const neg = t && t.xp < 0;
                              return (
                                <span key={name} className={`text-[10px] px-1.5 py-0.5 rounded-lg border font-medium ${neg ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                                  {name}
                                </span>
                              );
                            })}
                          </div>
                          {(tags.includes("결석") || tags.includes("무단결석")) && (
                            <div className="space-y-1" onClick={e => e.stopPropagation()}>
                              <input
                                defaultValue={sRec.absenceReason || ""}
                                onBlur={e => saveAbsenceReason(s.id, e.target.value)}
                                placeholder="결석 사유..."
                                className="w-full text-[11px] text-slate-600 outline-none bg-red-50 border border-red-200 rounded-lg px-2 py-1 placeholder-red-300"
                              />
                              <input
                                defaultValue={sRec.absenceResponse || ""}
                                onBlur={e => saveAbsenceResponse(s.id, e.target.value)}
                                placeholder="처리 내용..."
                                className="w-full text-[11px] text-slate-600 outline-none bg-orange-50 border border-orange-200 rounded-lg px-2 py-1 placeholder-orange-300"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-300">태그 선택</span>
                      )}
                    </td>

                    <td className="border-b border-r border-slate-100 px-3 py-2">
                      <textarea
                        defaultValue={sRec.dailyComment || ""}
                        onBlur={e => saveDailyComment(s.id, e.target.value)}
                        placeholder="코멘트 입력..."
                        rows={2}
                        className="w-full text-xs text-slate-700 resize-none outline-none bg-transparent placeholder-slate-300 leading-relaxed"
                        style={{minWidth:0}}
                        onClick={e => e.stopPropagation()}
                      />
                    </td>

                    <td className="border-b border-r border-slate-100 text-center py-1.5 px-2">
                      <input type="time" defaultValue={sRec.arrivalTime || ""}
                        onBlur={e => saveArrivalTime(s.id, e.target.value)}
                        className="w-full text-xs text-center outline-none bg-transparent text-slate-600"
                        onClick={e => e.stopPropagation()}/>
                    </td>
                    <td className="border-b border-r border-slate-100 text-center py-1.5 px-2">
                      <input type="time" defaultValue={sRec.departureTime || ""}
                        onBlur={e => saveDepartureTime(s.id, e.target.value)}
                        className="w-full text-xs text-center outline-none bg-transparent text-slate-600"
                        onClick={e => e.stopPropagation()}/>
                    </td>

                    <td className="border-b border-r border-slate-100 text-center py-2.5 px-3">
                      {tags.length > 0 ? <span className={`text-sm font-bold ${xp >= 0 ? "text-emerald-600" : "text-red-600"}`}>{xp >= 0 ? "+" : ""}{xp}</span> : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="border-b border-r border-slate-100 text-center py-2.5 px-3">
                      {tags.length > 0 ? <span className="text-sm font-bold text-blue-600">+{cp}</span> : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="border-b border-r border-slate-100 text-center py-2 px-2">
                      <button type="button"
                        onClick={e => { e.stopPropagation(); setReportModal({ student: s, rec: sRec, lesson }); }}
                        className="text-[11px] px-2 py-1 rounded-lg font-semibold border transition hover:opacity-80"
                        style={{background:"#eef2ff", color:"#4a6bd6", borderColor:"#c7d2fe"}}>
                        보고서
                      </button>
                    </td>
                    <td className="border-b border-slate-100 text-center py-2 px-2">
                      <div className="flex flex-col items-center gap-1">
                        <button type="button"
                          onClick={e => { e.stopPropagation(); sendReport(s, sRec); }}
                          className="text-[11px] px-2 py-1 rounded-lg font-semibold border transition hover:opacity-80"
                          style={{background:"#f0fdf4", color:"#15803d", borderColor:"#86efac"}}>
                          발송
                        </button>
                        {sRec.reportSentAt && (
                          <span className="text-[9px] text-slate-400">
                            {(() => { const d = new Date(sRec.reportSentAt); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; })()}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {addHwExpanded[s.id] && (
                    <tr key={s.id + "_addhw"} className="bg-indigo-50/50">
                      <td className="sticky left-0 z-10 bg-indigo-50 px-4 py-2 border-b border-r border-indigo-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-medium">숙제 추가:</span>
                          {["현행", "추가1", "추가2"].map(tab => (
                            <button key={tab} type="button" onClick={e => { e.stopPropagation(); setAddHwExpanded(prev => ({ ...prev, [s.id]: false })); openAutoHwModal(s.id, s.name, tab); }}
                              className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border transition ${tab === "추가1" ? "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100" : tab === "추가2" ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" : "bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100"}`}>
                              {tab}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td colSpan={colWidths.length - 1} className="border-b border-indigo-100 bg-indigo-50/30" />
                    </tr>
                  )}
                </React.Fragment>);
              })}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      {reportModal && (() => {
        const { student, rec: r, lesson: l } = reportModal;
        const rTags = r.tags || [];
        const hwDone = rTags.includes("숙제해옴");
        const hwMiss = rTags.includes("숙제미이행");
        const isAbsent = rTags.includes("결석") || rTags.includes("무단결석");
        const isLate = rTags.includes("지각");
        const profile = profiles[student.id] || {};
        const { name: asmName, type: asmType, units } = getStudentAssessmentInfo(student.id, curType);
        const curUnitNum = profile.currentUnit || null;
        const unitObj = units?.find(u => u.num === String(curUnitNum));
        const remaining = profile.remainingProblems != null ? profile.remainingProblems : null;
        const curType = r.lessonType || "현행";
        const hwText = curType === "추가1" ? r["추가1숙제"] : curType === "추가2" ? r["추가2숙제"] : r["현행숙제"];
        const DOW = ["일","월","화","수","목","금","토"];
        const dateObj = l.date ? new Date(l.date) : null;
        const dateLabel = dateObj ? `${l.date} (${DOW[dateObj.getDay()]})` : l.date;
        const section = (title, children) => (
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</div>
            <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 text-sm text-slate-700">{children}</div>
          </div>
        );
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReportModal(null)}>
            <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* 헤더 */}
              <div className="p-6 pb-4 border-b border-slate-200" style={{background:"linear-gradient(135deg,#1a2340,#2d3a6b)"}}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-blue-300 font-medium mb-1">수업 보고서</div>
                    <div className="text-xl font-bold text-white">{student.name}</div>
                    <div className="text-sm text-blue-200 mt-0.5">{student.className}</div>
                  </div>
                  <button onClick={() => setReportModal(null)} className="text-white/60 hover:text-white text-2xl font-bold">×</button>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-3">
                  <div>
                    <div className="text-xs text-blue-300">{l.title}</div>
                    <div className="text-xs text-blue-200">{dateLabel}{l.time ? " · " + l.time.slice(0,5) : ""}</div>
                  </div>
                  {isAbsent && <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-lg bg-red-500 text-white">결석</span>}
                  {isLate && !isAbsent && <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-400 text-white">지각</span>}
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* 등/하원 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 text-center">
                    <div className="text-xs text-slate-400 font-medium mb-1">등원</div>
                    <div className="text-lg font-bold" style={{color:"#15803d"}}>{r.arrivalTime || <span className="text-slate-300 text-sm font-normal">미기록</span>}</div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 text-center">
                    <div className="text-xs text-slate-400 font-medium mb-1">하원</div>
                    <div className="text-lg font-bold" style={{color:"#1d4ed8"}}>{r.departureTime || <span className="text-slate-300 text-sm font-normal">미기록</span>}</div>
                  </div>
                </div>

                {/* 숙제 */}
                {section("숙제",
                  <div className="flex items-start gap-2">
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg border ${hwDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" : hwMiss ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                      {hwDone ? "✓ 해옴" : hwMiss ? "✗ 미이행" : "미확인"}
                    </span>
                    <span className="text-slate-600">{hwText || <span className="text-slate-300">내용 없음</span>}</span>
                  </div>
                )}

                {/* 평가 */}
                {asmName && section("평가",
                  <div className="space-y-1">
                    <div className="font-medium text-slate-800">{asmName}</div>
                    {asmType === "누적테스트"
                      ? <div className="text-xs text-slate-500">남은 문제: <span className="font-semibold text-slate-700">{remaining ?? "-"}문제</span></div>
                      : curUnitNum
                        ? <div className="text-xs text-slate-500">현재 소단원: <span className="font-semibold text-slate-700">{curUnitNum}{unitObj ? ` ${unitObj.minor}` : ""}</span></div>
                        : <div className="text-xs text-slate-400">소단원 미지정</div>
                    }
                  </div>
                )}

                {/* 행동태그 전체 */}
                {rTags.length > 0 && section("행동태그",
                  <div className="flex flex-wrap gap-1">
                    {rTags.map(name => {
                      const def = BEHAVIOR_TAGS.find(b => b.name === name);
                      const isNeg = def && def.xp < 0;
                      return <span key={name} className={`text-[10px] px-1.5 py-0.5 rounded-lg border font-medium ${isNeg ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{name}</span>;
                    })}
                  </div>
                )}

                {/* 결석 사유 / 처리 */}
                {isAbsent && r.absenceReason && section("결석 사유",
                  <span className="text-red-600">{r.absenceReason}</span>
                )}
                {isAbsent && r.absenceResponse && section("처리",
                  <span className="text-orange-600">{r.absenceResponse}</span>
                )}

                {/* 데일리 코멘트 */}
                {section("강사 코멘트",
                  r.dailyComment
                    ? <span className="leading-relaxed">{r.dailyComment}</span>
                    : <span className="text-slate-300">코멘트 없음</span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {tagModal && tagModalStudent && (
        <TagSelectorModal
          studentName={tagModalStudent.name}
          currentTags={(rec[tagModal] || {}).tags || []}
          onToggle={(name) => handleTagToggle(tagModal, name)}
          onClose={closeTagModal}
        />
      )}

      {unitModal && (() => {
        const s = students.find(st => st.id === unitModal);
        if (!s) return null;
        const modalLessonType = (rec[unitModal] || {}).lessonType;
        const { name: asmName, units } = getStudentAssessmentInfo(unitModal, modalLessonType);
        const curUnit = (profiles[unitModal] || {}).currentUnit || "";
        return (
          <UnitPickerModal
            studentName={s.name}
            assessmentName={asmName}
            flatUnits={units}
            currentNum={curUnit}
            onSelect={(num) => saveUnit(unitModal, num)}
            onClose={() => { setUnitModal(null); refocusContainer(); }}
          />
        );
      })()}

      {remainingModal && (() => {
        const s = students.find(st => st.id === remainingModal);
        if (!s) return null;
        const remLessonType = (rec[remainingModal] || {}).lessonType;
        const { name: asmName, totalProblems } = getStudentAssessmentInfo(remainingModal, remLessonType);
        const profile = profiles[remainingModal] || {};
        const rem = profile.remainingProblems != null ? profile.remainingProblems : totalProblems;
        return (
          <RemainingPickerModal
            studentName={s.name}
            assessmentName={asmName}
            totalProblems={totalProblems}
            currentRemaining={rem}
            onSelect={(count) => saveRemaining(remainingModal, count)}
            onClose={() => { setRemainingModal(null); refocusContainer(); }}
          />
        );
      })()}
    </div>
  );
}

// ── 출결보고 모달 ─────────────────────────────────────────────────────────
function AttendanceReportModal({ date, lessons, attendance, students, profiles, onClose }) {
  // 해당 날짜의 모든 수업에서 결석 학생 추출 (중복 제거)
  const absentMap = {}; // studentId -> { student, lessonKey, absenceReason, absenceResponse }
  lessons.forEach(lesson => {
    const rec = attendance[lesson._key] || {};
    (lesson.studentIds || []).forEach(sid => {
      const sRec = rec[sid] || {};
      const tags = sRec.tags || [];
      if (tags.includes("결석") || tags.includes("무단결석")) {
        if (!absentMap[sid]) {
          absentMap[sid] = { student: students.find(s => s.id === sid), lessonKey: lesson._key, sRec };
        }
      }
    });
  });
  const absentList = Object.values(absentMap);

  const saveResponse = async (lessonKey, studentId, val) => {
    if (val.trim()) await db.ref(`lessonAttendance/${lessonKey}/${studentId}/absenceResponse`).set(val.trim());
    else await db.ref(`lessonAttendance/${lessonKey}/${studentId}/absenceResponse`).remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 pb-3 border-b shrink-0 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">출결보고</h3>
            <div className="text-sm text-slate-500 mt-0.5">{date} · 결석 {absentList.length}명</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {absentList.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">결석한 학생이 없습니다</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 w-16">학년</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 w-24">이름</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 w-20">담당T</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">결석사유</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">처리</th>
                </tr>
              </thead>
              <tbody>
                {absentList.map(({ student, lessonKey, sRec }) => {
                  const profile = profiles[student?.id] || {};
                  return (
                    <tr key={student?.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-700">{student?.className || "-"}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{student?.name || "-"}</td>
                      <td className="py-2 px-3 text-slate-500">{profile.teacher || "-"}</td>
                      <td className="py-2 px-3 text-slate-600">{sRec.absenceReason || <span className="text-slate-300">-</span>}</td>
                      <td className="py-2 px-3">
                        <input
                          defaultValue={sRec.absenceResponse || ""}
                          onBlur={e => saveResponse(lessonKey, student?.id, e.target.value)}
                          placeholder="처리 내용..."
                          className="w-full text-xs outline-none bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 placeholder-slate-300 focus:ring-2 focus:ring-blue-300"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 달력 뷰 ──────────────────────────────────────────────────────────────
function LessonCalendar({ lessons, today, focusDateOverride, focusTrigger, onDayClick, onLessonClick, onAddLesson, onPasteLesson, onDeleteLesson, onAttendanceReport }) {
  const todayDate = new Date(today);
  const [year, setYear] = React.useState(todayDate.getFullYear());
  const [month, setMonth] = React.useState(todayDate.getMonth());
  const [focusedDate, setFocusedDate] = React.useState(today);

  React.useEffect(() => {
    if (!focusDateOverride) return;
    const [fy, fm] = focusDateOverride.split("-").map(Number);
    setFocusedDate(focusDateOverride);
    setYear(fy);
    setMonth(fm - 1);
    setTimeout(() => containerRef.current?.focus(), 50);
  }, [focusDateOverride]);
  const [calClipboard, setCalClipboard] = React.useState(null); // [{...lesson}]
  const [copyFlash, setCopyFlash] = React.useState(false);
  const [undoStack, setUndoStack] = React.useState([]); // { type:'paste'|'delete', data }
  const [dayMenu, setDayMenu] = React.useState(null); // { date, lessons }
  const [dayMenuIdx, setDayMenuIdx] = React.useState(0);
  const containerRef = React.useRef(null);

  React.useEffect(() => { containerRef.current?.focus(); }, []);
  React.useEffect(() => { if (focusTrigger) setTimeout(() => containerRef.current?.focus(), 50); }, [focusTrigger]);

  const DOW = ["일", "월", "화", "수", "목", "금", "토"];
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const lessonsByDate = {};
  lessons.forEach(l => {
    if (!lessonsByDate[l.date]) lessonsByDate[l.date] = [];
    lessonsByDate[l.date].push(l);
  });
  Object.values(lessonsByDate).forEach(arr => arr.sort((a, b) => (a.time || "").localeCompare(b.time || "")));

  const shiftDate = (dateStr, n) => {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + n);
    return fmtYMD(d.getFullYear(), d.getMonth(), d.getDate());
  };

  // 포커스 날짜가 현재 표시 월을 벗어나면 월 자동 이동
  React.useEffect(() => {
    const [fy, fm] = focusedDate.split("-").map(Number);
    if (fy !== year || fm !== month + 1) {
      setYear(fy);
      setMonth(fm - 1);
    }
  }, [focusedDate]);

  const prevMonth = () => {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    setYear(newYear); setMonth(newMonth);
    setFocusedDate(fmtYMD(newYear, newMonth, 1));
  };
  const nextMonth = () => {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    setYear(newYear); setMonth(newMonth);
    setFocusedDate(fmtYMD(newYear, newMonth, 1));
  };

  const pushUndo = (entry) =>
    setUndoStack(prev => [...prev.slice(-29), entry]);

  const undoAction = async () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    if (last.type === "paste") {
      // 붙여넣기 취소 → 만든 수업들 삭제
      for (const key of last.keys) await onDeleteLesson(key);
    } else if (last.type === "delete") {
      // 삭제 취소 → 수업들 복원
      for (const lesson of last.lessons) {
        const { _key, ...data } = lesson;
        await db.ref(`lessons/${_key}`).set(data);
      }
    }
  };

  const handlePaste = async () => {
    if (!calClipboard) return;
    const newKeys = [];
    for (const lesson of calClipboard) {
      const id = await onPasteLesson(focusedDate, lesson);
      if (id) newKeys.push(id);
    }
    if (newKeys.length > 0) pushUndo({ type: "paste", keys: newKeys });
  };

  const handleDelete = async () => {
    const dayLessons = lessonsByDate[focusedDate] || [];
    if (dayLessons.length === 0) return;
    pushUndo({ type: "delete", lessons: dayLessons.map(l => ({ ...l })) });
    for (const l of dayLessons) await onDeleteLesson(l._key);
  };

  const calKeyRef = React.useRef({});
  calKeyRef.current = { focusedDate, lessonsByDate, calClipboard, undoAction, handlePaste, handleDelete, onLessonClick, onDayClick, onAddLesson, dayMenu, dayMenuIdx };

  React.useEffect(() => {
    const handler = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
      const { focusedDate, lessonsByDate, calClipboard, undoAction, handlePaste, handleDelete, onLessonClick, onDayClick, onAddLesson, dayMenu, dayMenuIdx } = calKeyRef.current;
      const isKey = (k, code) => (e.ctrlKey || e.metaKey) && (e.key === k || e.key === k.toUpperCase() || e.keyCode === code);

      // dayMenu 열려있으면 메뉴 내부 키 처리
      if (dayMenu) {
        const items = dayMenu.lessons;
        const total = items.length + 1; // +1 for 추가하기
        if (e.key === "ArrowUp")    { e.preventDefault(); setDayMenuIdx(i => Math.max(0, i - 1)); return; }
        if (e.key === "ArrowDown")  { e.preventDefault(); setDayMenuIdx(i => Math.min(total - 1, i + 1)); return; }
        if (e.key === "Escape")     { e.preventDefault(); setDayMenu(null); return; }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (dayMenuIdx === 0) onAddLesson(dayMenu.date);
          else onLessonClick(dayMenu.lessons[dayMenuIdx - 1]);
          setDayMenu(null);
          return;
        }
        return;
      }

      if (e.key === "ArrowLeft")  { e.preventDefault(); setFocusedDate(d => shiftDate(d, -1)); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); setFocusedDate(d => shiftDate(d, 1));  return; }
      if (e.key === "ArrowUp")    { e.preventDefault(); setFocusedDate(d => shiftDate(d, -7)); return; }
      if (e.key === "ArrowDown")  { e.preventDefault(); setFocusedDate(d => shiftDate(d, 7));  return; }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const dayLessons = lessonsByDate[focusedDate] || [];
        if (dayLessons.length >= 1) {
          setDayMenu({ date: focusedDate, lessons: dayLessons });
          setDayMenuIdx(0);
        } else {
          onAddLesson(focusedDate);
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
        return;
      }

      if (isKey("z", 90)) { e.preventDefault(); undoAction(); return; }

      if (isKey("c", 67)) {
        e.preventDefault();
        const dayLessons = lessonsByDate[focusedDate] || [];
        if (dayLessons.length > 0) {
          setCalClipboard(dayLessons);
          setCopyFlash(true);
          setTimeout(() => setCopyFlash(false), 900);
        }
        return;
      }

      if (isKey("v", 86)) { e.preventDefault(); handlePaste(); return; }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  const days = getMonthDays(year, month);

  return (
    <div className="space-y-4">
      {dayMenu && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center" onClick={() => setDayMenu(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-3 min-w-[200px]" onClick={e => e.stopPropagation()}>
            <div className="text-xs text-slate-400 mb-2 px-2">{dayMenu.date}</div>
            {[{ label: "＋ 추가하기", action: () => onAddLesson(dayMenu.date) },
              ...dayMenu.lessons.map(l => ({ label: l.title, action: () => onLessonClick(l) }))
            ].map((item, i) => (
              <div key={i}
                className={`px-3 py-2 rounded-xl cursor-pointer text-sm transition ${dayMenuIdx === i ? "bg-blue-500 text-white" : "hover:bg-slate-50 text-slate-700"}`}
                onMouseEnter={() => setDayMenuIdx(i)}
                onClick={() => { item.action(); setDayMenu(null); }}>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      )}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold">‹</button>
            <span className="text-lg font-bold min-w-[7rem] text-center">{year}년 {month + 1}월</span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold">›</button>
          </div>
          <div className="flex items-center gap-2">
            {calClipboard && (
              <span className={`text-[11px] px-2 py-1 rounded-lg border transition ${copyFlash ? "bg-blue-100 text-blue-600 border-blue-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                {copyFlash ? "복사됨" : `클립보드: ${calClipboard.length}개 수업`}
              </span>
            )}
            {undoStack.length > 0 && (
              <button onClick={undoAction}
                className="text-[11px] px-2 py-1 rounded-lg border bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 transition">
                ↩ 실행취소 ({undoStack.length})
              </button>
            )}
            <span className="text-[11px] text-slate-400 hidden sm:block">↑↓←→ · Del · Ctrl+C/V/Z</span>
            <Btn onClick={() => onAddLesson(focusedDate || today)}>+ 수업 등록</Btn>
          </div>
        </div>
      </Card>
      <Card className="p-4" onClick={() => containerRef.current?.focus()}>
        <div className="grid grid-cols-7 mb-1">
          {DOW.map((d, i) => (
            <div key={d} className={`text-center text-xs font-bold py-2 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-400"}`}>{d}</div>
          ))}
        </div>
        <div
          ref={containerRef}
          tabIndex={0}
          className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100 outline-none"
        >
          {days.map((cell, idx) => {
            const { date: dateStr, current } = cell;
            const SESSION_ORDER = { "수업": 0, "평가": 1, "보강": 2 };
            const dayLessons = (lessonsByDate[dateStr] || []).slice().sort((a, b) => {
              const od = (SESSION_ORDER[a.sessionType] ?? 3) - (SESSION_ORDER[b.sessionType] ?? 3);
              if (od !== 0) return od;
              return (a.time || "").localeCompare(b.time || "");
            });
            const isToday = dateStr === today;
            const isFocused = dateStr === focusedDate;
            const dow = idx % 7;
            const dayNum = Number(dateStr.slice(8));
            return (
              <div key={dateStr}
                className={`min-h-[90px] p-1.5 cursor-pointer transition
                  ${current ? "bg-white hover:bg-slate-50" : "bg-slate-50/60 hover:bg-slate-100/60"}
                  ${isFocused ? "ring-2 ring-inset ring-blue-500 bg-blue-50/50" : isToday ? "ring-2 ring-inset ring-slate-900" : ""}`}
                onClick={() => { setFocusedDate(dateStr); containerRef.current?.focus(); }}
                onDoubleClick={() => onDayClick(dateStr)}>
                <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isFocused ? "bg-blue-500 text-white" : isToday ? "bg-slate-900 text-white"
                    : !current ? "text-slate-300"
                    : dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-slate-700"}`}>
                  {dayNum}
                </div>
                <div className="space-y-0.5">
                  {dayLessons.map(l => {
                    const defaultColor = SESSION_DEFAULT_COLORS[l.sessionType] || "#1e293b";
                    const bg = !current ? "#94a3b8" : (l.color || defaultColor);
                    return (
                      <div key={l._key}
                        onClick={e => { e.stopPropagation(); setFocusedDate(dateStr); containerRef.current?.focus(); onLessonClick(l); }}
                        className="rounded-lg px-1.5 py-0.5 text-[10px] font-medium truncate transition cursor-pointer text-white hover:opacity-80"
                        style={{ background: bg }}>
                        {l.time ? l.time.slice(0, 5) + " " : ""}{l.title} ({(l.studentIds || []).length}명)
                      </div>
                    );
                  })}
                  {dayLessons.length === 0 && current && (
                    <div className="text-[10px] text-slate-300 text-center mt-4">+</div>
                  )}
                </div>
                {dayLessons.length > 0 && current && onAttendanceReport && (
                  <button
                    onClick={e => { e.stopPropagation(); onAttendanceReport(dateStr); }}
                    className="mt-1 w-full text-[9px] text-slate-400 hover:text-red-500 hover:bg-red-50 rounded px-1 py-0.5 transition text-center border border-transparent hover:border-red-200">
                    출결보고
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── 수업일지 메인 ─────────────────────────────────────────────────────────
function LessonManager({ students, materials = [], isViewer = false, onViewStudent }) {
  const today = todayString();
  const [lessons, setLessons] = React.useState([]);
  const [attendance, setAttendance] = React.useState({});
  const [profiles, setProfiles] = React.useState({});
  const [selectedLessonKey, setSelectedLessonKey] = React.useState(null);
  const [addModal, setAddModal] = React.useState(null);
  const [attendanceReportDate, setAttendanceReportDate] = React.useState(null);
  const [calendarFocusDate, setCalendarFocusDate] = React.useState(null);
  const [calendarFocusTrigger, setCalendarFocusTrigger] = React.useState(0);

  const closeModal = () => { setAddModal(null); setCalendarFocusTrigger(t => t + 1); };

  const handleBack = () => {
    const lesson = lessons.find(l => l._key === selectedLessonKey);
    if (lesson) setCalendarFocusDate(lesson.date);
    setSelectedLessonKey(null);
  };

  React.useEffect(() => {
    const lRef = db.ref("lessons");
    lRef.on("value", snap => {
      const data = snap.val();
      setLessons(data ? Object.entries(data).map(([key, val]) => ({ ...val, _key: key })) : []);
    });
    const aRef = db.ref("lessonAttendance");
    aRef.on("value", snap => setAttendance(snap.val() || {}));
    const pRef = db.ref("studentProfiles");
    pRef.on("value", snap => setProfiles(snap.val() || {}));
    return () => { lRef.off(); aRef.off(); pRef.off(); };
  }, []);

  const currentLesson = selectedLessonKey ? lessons.find(l => l._key === selectedLessonKey) ?? null : null;

  const handleSaveLesson = async (data) => {
    if (addModal?.lesson) {
      await db.ref(`lessons/${addModal.lesson._key}`).update(data);
    } else {
      const id = "lesson-" + Date.now();
      await db.ref(`lessons/${id}`).set({ ...data, createdAt: today });
    }
  };

  const handlePasteLesson = async (date, lesson) => {
    const { _key, createdAt, date: _d, ...rest } = lesson;
    const id = "lesson-" + Date.now() + "-" + Math.random().toString(36).slice(2, 5);
    await db.ref(`lessons/${id}`).set({ ...rest, date, createdAt: today });
    return id;
  };

  const handleDeleteLesson = async (key) => {
    await db.ref(`lessons/${key}`).remove();
    await db.ref(`lessonAttendance/${key}`).remove();
  };

  if (currentLesson) {
    return (
      <>
        <LessonDetailView
          lesson={currentLesson}
          lessons={lessons}
          students={students}
          materials={materials}
          attendance={attendance}
          allAttendance={attendance}
          isViewer={isViewer}
          onBack={handleBack}
          onEdit={() => setAddModal({ date: currentLesson.date, lesson: currentLesson })}
          onDelete={async () => { await handleDeleteLesson(currentLesson._key); handleBack(); }}
          onViewStudent={onViewStudent}
        />
        {addModal && (
          <LessonModal
            lesson={addModal.lesson || { date: addModal.date, studentIds: [] }}
            students={students}
            onClose={() => setAddModal(null)}
            onSave={handleSaveLesson}
          />
        )}
      </>
    );
  }

  return (
    <>
      <LessonCalendar
        lessons={lessons} today={today}
        focusDateOverride={calendarFocusDate}
        focusTrigger={calendarFocusTrigger}
        onDayClick={(date) => setAddModal({ date })}
        onLessonClick={(lesson) => setSelectedLessonKey(lesson._key)}
        onAddLesson={(date) => setAddModal({ date })}
        onPasteLesson={handlePasteLesson}
        onDeleteLesson={handleDeleteLesson}
        onAttendanceReport={(date) => setAttendanceReportDate(date)}
      />
      {addModal && (
        <LessonModal
          lesson={addModal.lesson || { date: addModal.date, studentIds: [] }}
          students={students}
          onClose={closeModal}
          onSave={handleSaveLesson}
        />
      )}
      {attendanceReportDate && (
        <AttendanceReportModal
          date={attendanceReportDate}
          lessons={lessons.filter(l => l.date === attendanceReportDate)}
          attendance={attendance}
          students={students}
          profiles={profiles}
          onClose={() => setAttendanceReportDate(null)}
        />
      )}
    </>
  );
}
