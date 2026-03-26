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
function LessonModal({ lesson, students, onClose, onSave }) {
  const isNew = !lesson._key;
  const [title, setTitle] = React.useState(lesson.title || "");
  const [date, setDate] = React.useState(lesson.date || "");
  const [time, setTime] = React.useState(lesson.time || "");
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
    try { await onSave({ title: title.trim(), date, time, studentIds: selectedIds }); onClose(); }
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

function LessonDetailView({ lesson, students, attendance, allAttendance, isViewer = false, onBack, onEdit }) {
  const [editingHW, setEditingHW] = React.useState(null);
  const [hwValue, setHwValue] = React.useState("");
  const [unitModal, setUnitModal] = React.useState(null); // studentId
  const [remainingModal, setRemainingModal] = React.useState(null); // studentId
  const [profiles, setProfiles] = React.useState({});
  const [assessmentList, setAssessmentList] = React.useState([]);
  const [tagModal, setTagModal] = React.useState(null);       // studentId
  const [tagModalOriginal, setTagModalOriginal] = React.useState([]); // 모달 열릴 때 태그 스냅샷
  const [focusedCell, setFocusedCell] = React.useState(null); // { row, col }
  const [clipboard, setClipboard] = React.useState(null);     // { type:'hw'|'tags', value }
  const [copyFlash, setCopyFlash] = React.useState(false);
  const [undoStack, setUndoStack] = React.useState([]);        // [{ studentId, field, value }]
  const [confirmDone, setConfirmDone] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const fullscreenRef = React.useRef(null);
  const containerRef = React.useRef(null);

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

  // assessmentId → 평가 정보 반환 (lessonType: "선행" 이면 advanceAssessment 사용)
  const getStudentAssessmentInfo = (studentId, lessonType) => {
    const profile = profiles[studentId] || {};
    const assessmentId = lessonType === "선행" ? profile.advanceAssessment : profile.currentAssessment;
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

  // 숙제 확정: 각 학생의 hw를 studentProfiles에 저장 (Firebase에서 최신 데이터 직접 읽기)
  const confirmHomework = async () => {
    // 현재 편집 중인 hw가 있으면 먼저 저장
    if (editingHW && hwValue !== undefined) {
      await rawSaveHW(editingHW, hwValue);
      setEditingHW(null);
    }
    // Firebase에서 직접 최신 데이터 읽기 (race condition 방지)
    const snap = await db.ref(`lessonAttendance/${lesson._key}`).once("value");
    const freshRec = snap.val() || {};
    const updates = {};
    for (const s of lessonStudents) {
      const sRec = freshRec[s.id] || {};
      const text = (sRec.현행숙제 || "").trim();
      if (!text) continue;
      const type = sRec.lessonType === "선행" ? "선행" : "현행";
      updates[`studentProfiles/${s.id}/confirmedHw/${type}`] = { text, date: lesson.date };
    }
    if (Object.keys(updates).length === 0) { alert("확정할 숙제가 없습니다.\n(숙제 열에 내용을 먼저 입력해 주세요)"); return; }
    try {
      await db.ref().update(updates);
      setConfirmDone(true);
      setTimeout(() => setConfirmDone(false), 2000);
    } catch(e) {
      alert("저장 실패: " + e.message);
      console.error("[확정] 저장 실패:", e);
    }
  };

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
  const rawSaveTags = async (studentId, tags) => {
    const { xp, cp } = calcPoints(tags);
    await db.ref(`lessonAttendance/${lesson._key}/${studentId}`).update({ tags, xp, cp });
  };

  // 사용자 액션 저장 (undo 스택 쌓음)
  const saveHW = async (studentId, val) => {
    pushUndo(studentId, "hw", (rec[studentId] || {}).현행숙제 || "");
    await rawSaveHW(studentId, val);
    setEditingHW(null);
    refocusContainer();
  };

  // 현행/선행 저장
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

  return (
    <div ref={fullscreenRef} className={isFullscreen ? "bg-white p-4 min-h-screen overflow-auto flex flex-col" : "space-y-4"}>
      {/* 헤더 */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {!isFullscreen && <button onClick={onBack}
              className="w-8 h-8 rounded-xl border hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold text-lg">‹</button>}
            <div>
              <div className={`font-bold ${isFullscreen ? "text-xl" : "text-base"}`}>{lesson.title}</div>
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
              <div key={s.id} className="border border-slate-200 rounded-xl px-4 py-2.5 flex items-start gap-3 bg-white">
                <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{s.name[0]}</div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900">{s.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${sRec.lessonType === "선행" ? "bg-violet-100 text-violet-700 border-violet-200" : "bg-sky-50 text-sky-600 border-sky-200"}`}>
                      {sRec.lessonType === "선행" ? "선행" : "현행"}
                    </span>
                    <span className="text-xs text-slate-400">{s.className}</span>
                    {tags.length > 0 && <span className={`text-xs font-bold ml-auto ${xp >= 0 ? "text-emerald-600" : "text-red-500"}`}>{xp >= 0 ? "+" : ""}{xp}XP</span>}
                    {tags.length > 0 && <span className="text-xs font-bold text-blue-600">+{cp}CP</span>}
                  </div>
                  {sRec.현행숙제 && (
                    <div className="text-sm text-slate-700">
                      <span className={`text-[10px] font-bold mr-1 ${sRec.lessonType === "선행" ? "text-violet-500" : "text-sky-500"}`}>{sRec.lessonType === "선행" ? "(선)" : "(현)"}</span>
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
            );
          })}
        </div>
      ) : (
      /* 일반 표 */
      <Card className="p-0 overflow-hidden">
        <div ref={containerRef} tabIndex={0} className="overflow-x-auto outline-none">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-bold text-slate-500 border-b border-r border-slate-200 min-w-[140px]">학생</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 border-b border-r border-slate-200 min-w-[160px]">숙제</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 border-b border-r border-slate-200 min-w-[160px]">평가</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 border-b border-r border-slate-200 min-w-[200px]">행동태그</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 border-b border-r border-slate-200 min-w-[80px]">획득 XP</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 border-b border-slate-200 min-w-[80px]">획득 CP</th>
              </tr>
            </thead>
            <tbody>
              {lessonStudents.map((s, si) => {
                const sRec = rec[s.id] || {};
                const tags = sRec.tags || [];
                const { xp, cp } = calcPoints(tags);
                const total = cumulativeTotals[s.id] || { xp: 0, cp: 0 };

                return (
                  <tr key={s.id} className={si % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-3 border-b border-r border-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">{s.name[0]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm">{s.name}</span>
                            <button type="button"
                              onClick={e => { e.stopPropagation(); saveLessonType(s.id, sRec.lessonType === "선행" ? "현행" : "선행"); }}
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border transition shrink-0
                                ${sRec.lessonType === "선행"
                                  ? "bg-violet-100 text-violet-700 border-violet-300 hover:bg-violet-200"
                                  : "bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100"}`}>
                              {sRec.lessonType === "선행" ? "선행" : "현행"}
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

                    {/* 숙제 */}
                    <td className={`border-b border-r border-slate-100 px-3 py-2.5 cursor-text transition ${isFocused(si, 0) ? focusRing : ""}`}
                      onClick={() => selectCell(si, 0)}
                      onDoubleClick={() => { selectCell(si, 0); setEditingHW(s.id); setHwValue(sRec.현행숙제 || ""); }}>
                      {editingHW === s.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold shrink-0 ${sRec.lessonType === "선행" ? "text-violet-500" : "text-sky-500"}`}>
                            {sRec.lessonType === "선행" ? "(선)" : "(현)"}
                          </span>
                          <input autoFocus value={hwValue} onChange={e => setHwValue(e.target.value)}
                            onBlur={() => saveHW(s.id, hwValue)}
                            onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); saveHW(s.id, hwValue); const next = si + 1; if (next < lessonStudents.length) setFocusedCell({ row: next, col: 0 }); } if (e.key === "Escape") { e.stopPropagation(); setEditingHW(null); setFocusedCell(null); refocusContainer(); } }}
                            className="flex-1 text-xs border-b border-slate-400 outline-none bg-transparent py-0.5" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold shrink-0 ${sRec.lessonType === "선행" ? "text-violet-500" : "text-sky-500"}`}>
                            {sRec.lessonType === "선행" ? "(선)" : "(현)"}
                          </span>
                          <span className="text-xs text-slate-600">{sRec.현행숙제 || <span className="text-slate-300">입력</span>}</span>
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
                      ) : (
                        <span className="text-[11px] text-slate-300">태그 선택</span>
                      )}
                    </td>

                    <td className="border-b border-r border-slate-100 text-center py-2.5 px-3">
                      {tags.length > 0 ? <span className={`text-sm font-bold ${xp >= 0 ? "text-emerald-600" : "text-red-600"}`}>{xp >= 0 ? "+" : ""}{xp}</span> : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="border-b border-slate-100 text-center py-2.5 px-3">
                      {tags.length > 0 ? <span className="text-sm font-bold text-blue-600">+{cp}</span> : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      )}

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

// ── 달력 뷰 ──────────────────────────────────────────────────────────────
function LessonCalendar({ lessons, today, focusDateOverride, focusTrigger, onDayClick, onLessonClick, onAddLesson, onPasteLesson, onDeleteLesson }) {
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
            const dayLessons = lessonsByDate[dateStr] || [];
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
                  {dayLessons.map(l => (
                    <div key={l._key}
                      onClick={e => { e.stopPropagation(); setFocusedDate(dateStr); containerRef.current?.focus(); onLessonClick(l); }}
                      className={`rounded-lg px-1.5 py-0.5 text-[10px] font-medium truncate transition cursor-pointer
                        ${current ? "bg-slate-800 text-white hover:bg-slate-600" : "bg-slate-300 text-white hover:bg-slate-400"}`}>
                      {l.time ? l.time.slice(0, 5) + " " : ""}{l.title} ({(l.studentIds || []).length}명)
                    </div>
                  ))}
                  {dayLessons.length === 0 && current && (
                    <div className="text-[10px] text-slate-300 text-center mt-4">+</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── 수업일지 메인 ─────────────────────────────────────────────────────────
function LessonManager({ students, isViewer = false }) {
  const today = todayString();
  const [lessons, setLessons] = React.useState([]);
  const [attendance, setAttendance] = React.useState({});
  const [selectedLessonKey, setSelectedLessonKey] = React.useState(null);
  const [addModal, setAddModal] = React.useState(null);
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
    return () => { lRef.off(); aRef.off(); };
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
          students={students}
          attendance={attendance}
          allAttendance={attendance}
          isViewer={isViewer}
          onBack={handleBack}
          onEdit={() => setAddModal({ date: currentLesson.date, lesson: currentLesson })}
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
      />
      {addModal && (
        <LessonModal
          lesson={addModal.lesson || { date: addModal.date, studentIds: [] }}
          students={students}
          onClose={closeModal}
          onSave={handleSaveLesson}
        />
      )}
    </>
  );
}
