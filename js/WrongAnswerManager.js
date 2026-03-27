// ── 오답관리 ─────────────────────────────────────────────────────────────────
const STATUS_CYCLE = [null, "correct", "wrong", "unknown"];
const STATUS_STYLE = {
  correct: { bg: "#22c55e", text: "#fff", label: "맞음" },
  wrong:   { bg: "#ef4444", text: "#fff", label: "틀림" },
  unknown: { bg: "#f97316", text: "#fff", label: "모름" },
  null:    { bg: "#f1f5f9", text: "#94a3b8", label: "미체크" },
};
const COLS = 20;

function MaterialStatusCard({ mat, allStatuses, studentId, picked, togglePick, bulkSelect }) {
  const [editMode, setEditMode] = React.useState(false);
  const [local, setLocal] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [previewNum, setPreviewNum] = React.useState(null);
  const [previewImgUrl, setPreviewImgUrl] = React.useState(null);

  React.useEffect(() => {
    if (!previewNum) { setPreviewImgUrl(null); return; }
    db.ref(`problemImages/${mat.id}/${previewNum}`).once("value", snap => {
      setPreviewImgUrl(snap.val() || null);
    });
  }, [previewNum, mat.id]);

  const totalProblems = Number(mat.totalProblems) || 0;
  const startNum = Number(mat.problemStart) || 1;
  const endNum = mat.problemEnd ? Number(mat.problemEnd) : startNum + totalProblems - 1;

  const statuses = editMode ? local : (allStatuses[mat.id] || {});

  const counts = { correct: 0, wrong: 0, unknown: 0, null: 0 };
  for (let i = startNum; i <= endNum; i++) counts[statuses[i] || "null"]++;

  const rows = [];
  for (let r = 0; r < Math.ceil(totalProblems / COLS); r++) {
    const rowStart = startNum + r * COLS;
    const rowEnd = Math.min(endNum, rowStart + COLS - 1);
    rows.push(Array.from({ length: rowEnd - rowStart + 1 }, (_, c) => rowStart + c));
  }

  const enterEdit = () => {
    setLocal({ ...(allStatuses[mat.id] || {}) });
    setEditMode(true);
  };

  const cancel = () => setEditMode(false);

  const save = async () => {
    setSaving(true);
    const prev = allStatuses[mat.id] || {};
    const updates = {};
    for (const [num, status] of Object.entries(local)) {
      updates[`problemStatus/${studentId}/${mat.id}/${num}`] = status;
    }
    for (const num of Object.keys(prev)) {
      if (!(num in local)) updates[`problemStatus/${studentId}/${mat.id}/${num}`] = null;
    }
    await db.ref().update(updates);
    setSaving(false);
    setEditMode(false);
  };

  const handleClick = (num) => {
    if (editMode) {
      const cur = local[num] || null;
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
      setLocal(s => {
        const copy = { ...s };
        if (next === null) delete copy[num]; else copy[num] = next;
        return copy;
      });
    } else {
      setPreviewNum(num);
      togglePick(`${mat.id}:${num}`);
    }
  };

  if (totalProblems === 0) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{mat.name}</h3>
          {!editMode && (
            <button onClick={() => bulkSelect(mat.id, "all", startNum, endNum)}
              className="text-xs text-slate-400 hover:text-slate-700 underline underline-offset-2">
              전체 {totalProblems}개
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-3">
            {[["correct","맞음"],["wrong","틀림"],["unknown","모름"],["null","미체크"]].map(([k,label]) => (
              <button key={k} onClick={() => !editMode && bulkSelect(mat.id, k === "null" ? null : k, startNum, endNum)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 disabled:pointer-events-none"
                disabled={editMode}>
                <div className="w-3.5 h-3.5 rounded" style={{ background: STATUS_STYLE[k].bg }}/>
                {label} {counts[k]}
              </button>
            ))}
          </div>
          {!editMode
            ? <button onClick={enterEdit} className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium hover:bg-slate-200">오답수정</button>
            : <div className="flex gap-1.5">
                <button onClick={save} disabled={saving} className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-700">{saving?"저장 중...":"저장"}</button>
                <button onClick={cancel} className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 font-medium hover:bg-slate-50">취소</button>
              </div>
          }
        </div>
      </div>
      {editMode
        ? <div className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-1.5">수정 중 — 클릭: 미체크 → 맞음 → 틀림 → 모름 → 미체크</div>
        : <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-1.5">클릭해서 문제 선택 — 선택한 문제를 위의 뽑기 버튼으로 인쇄</div>
      }
      <div className="flex gap-3">
        <div className="space-y-1 overflow-x-auto flex-1">
          {rows.map((row, ri) => (
            <div key={ri} className="flex gap-1">
              <div className="w-10 text-right text-[10px] text-slate-400 shrink-0 self-center pr-1">{row[0]}~</div>
              {row.map(num => {
                const st = statuses[num] || null;
                const sty = STATUS_STYLE[st];
                const isPicked = !editMode && !!picked[`${mat.id}:${num}`];
                const isPreview = !editMode && previewNum === num;
                const bg = isPicked ? "#1e293b" : sty.bg;
                const col = isPicked ? "#fff" : sty.text;
                return (
                  <button key={num}
                    onClick={() => handleClick(num)}
                    title={`${num}번 — ${sty.label}${isPicked ? " (선택됨)" : ""}`}
                    style={{ background: bg, color: col, cursor: "pointer", outline: isPreview ? "2px solid #6366f1" : "none", outlineOffset: "1px" }}
                    className="w-7 h-7 rounded text-[9px] font-bold shrink-0 border border-white/30 transition hover:opacity-80">
                    {num}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {/* 미리보기 패널 */}
        {!editMode && (
          <div className="shrink-0 rounded-xl border border-slate-100 overflow-hidden flex flex-col bg-slate-50" style={{width:"352px"}}>
            {previewNum ? (() => {
              const st = (allStatuses[mat.id] || {})[previewNum] || null;
              const sty = STATUS_STYLE[st];
              return (
                <>
                  <div className="px-3 py-2 text-[11px] font-bold text-slate-700 border-b border-slate-100 bg-white flex items-center justify-between">
                    <span>{previewNum}번</span>
                    <span style={{ color: sty.text, background: sty.bg }} className="px-1.5 py-0.5 rounded text-[10px]">{sty.label}</span>
                  </div>
                  {previewImgUrl
                    ? <img src={previewImgUrl} alt={`${previewNum}번`} style={{width:"100%",height:"auto",display:"block"}} />
                    : <div className="flex items-center justify-center text-xs text-slate-300" style={{height:"200px"}}>이미지 없음</div>
                  }
                </>
              );
            })()
            : <div className="flex-1 flex items-center justify-center text-xs text-slate-300 p-3 text-center">문제를 클릭하면 미리보기</div>
            }
          </div>
        )}
      </div>
    </Card>
  );
}

function WrongAnswerManager({ students = [], materials = [] }) {
  const [selectedStudentId, setSelectedStudentId] = React.useState("");
  const [studentMaterials, setStudentMaterials] = React.useState([]);
  const [allStatuses, setAllStatuses] = React.useState({});
  const [picked, setPicked] = React.useState({});
  const [showPrint, setShowPrint] = React.useState(false);

  React.useEffect(() => {
    if (!selectedStudentId) { setStudentMaterials([]); return; }
    db.ref("curriculumNodes").once("value", snap => {
      const allBoards = snap.val() || {};
      const mats = [];
      for (const boardId of Object.keys(allBoards)) {
        const board = allBoards[boardId];
        const startNode = board[`start_${selectedStudentId}`];
        if (!startNode) continue;
        const visited = new Set();
        const queue = [...(startNode.nextNodes || [])];
        while (queue.length) {
          const nid = queue.shift();
          if (visited.has(nid)) continue;
          visited.add(nid);
          const n = board[nid];
          if (!n) continue;
          if (n.type === "material") {
            const mat = materials.find(m => m.id === n.materialId);
            if (mat && !mats.find(m => m.id === mat.id))
              mats.push({ ...mat, totalProblems: n.totalProblems || mat.totalProblems });
          }
          (n.nextNodes || []).forEach(id => queue.push(id));
        }
      }
      setStudentMaterials(mats);
      setPicked({});
    });
  }, [selectedStudentId]);

  React.useEffect(() => {
    if (!selectedStudentId) { setAllStatuses({}); return; }
    const ref = db.ref(`problemStatus/${selectedStudentId}`);
    ref.on("value", snap => setAllStatuses(snap.val() || {}));
    return () => ref.off();
  }, [selectedStudentId]);

  const togglePick = (key) => setPicked(prev => {
    const copy = { ...prev };
    if (copy[key]) delete copy[key]; else copy[key] = true;
    return copy;
  });

  const bulkSelect = (matId, status, startNum, endNum) => {
    const matStatuses = allStatuses[matId] || {};
    setPicked(prev => {
      const copy = { ...prev };
      for (let num = startNum; num <= endNum; num++) {
        const s = matStatuses[num] || null;
        if (status === "all" || s === status) copy[`${matId}:${num}`] = true;
      }
      return copy;
    });
  };

  const pickedCount = Object.keys(picked).length;

  const pickedList = React.useMemo(() => {
    const result = [];
    for (const mat of studentMaterials) {
      const totalProblems = Number(mat.totalProblems) || 0;
      if (totalProblems === 0) continue;
      const startNum = Number(mat.problemStart) || 1;
      const endNum = mat.problemEnd ? Number(mat.problemEnd) : startNum + totalProblems - 1;
      const matStatuses = allStatuses[mat.id] || {};
      for (let num = startNum; num <= endNum; num++) {
        const key = `${mat.id}:${num}`;
        if (picked[key]) {
          result.push({ key, matId: mat.id, matName: mat.name, num, status: matStatuses[num] || null });
        }
      }
    }
    return result;
  }, [picked, studentMaterials, allStatuses]);

  const printGroups = [];
  for (let i = 0; i < pickedList.length; i += 4) printGroups.push(pickedList.slice(i, i + 4));

  const handlePrint = () => {
    const student = students.find(s => s.id === selectedStudentId) || {};
    const studentName = student.name || "";
    const studentClass = student.className || "";
    const statusLabel = (s) => s === "wrong" ? "틀림" : s === "unknown" ? "모름" : s === "correct" ? "맞음" : "";
    const statusColor = (s) => s === "wrong" ? "#ef4444" : s === "unknown" ? "#f97316" : "#22c55e";

    const problemBox = (p) => p ? `
      <div class="problem">
        <div class="problem-header">
          ${p.matName} ${p.num}번
          ${p.status ? `<span style="color:${statusColor(p.status)};font-size:10px;margin-left:6px">${statusLabel(p.status)}</span>` : ""}
        </div>
        <div class="problem-body"></div>
      </div>` : `<div class="problem empty"></div>`;

    const pages = printGroups.map((group, gi) => `
      <div class="page">
        <div class="page-header">
          <span class="student-name">${studentClass ? studentClass + " " : ""}${studentName}</span>
          <span class="page-info">오답 문제 (${gi * 4 + 1}–${Math.min(gi * 4 + 4, pickedList.length)}번째)</span>
        </div>
        <div class="cols">
          <div class="col">
            ${problemBox(group[0])}
            ${problemBox(group[1])}
          </div>
          <div class="col">
            ${problemBox(group[2])}
            ${problemBox(group[3])}
          </div>
        </div>
      </div>`).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: white; }
  @page { size: A4 portrait; margin: 12mm 15mm; }
  .page { width: 100%; page-break-after: always; }
  .page:last-child { page-break-after: avoid; }
  .page-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #1e293b; padding-bottom: 4px; margin-bottom: 6mm; }
  .student-name { font-size: 16px; font-weight: 800; color: #0f172a; }
  .page-info { font-size: 10px; color: #94a3b8; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; height: 240mm; }
  .col { display: flex; flex-direction: column; gap: 8mm; }
  .problem { flex: 1; display: flex; flex-direction: column; }
  .problem.empty { }
  .problem-header { padding: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #334155; border-bottom: 1px solid #cbd5e1; flex-shrink: 0; margin-bottom: 4px; }
  .problem-body { flex: 1; }
</style></head><body>${pages}</body></html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <select value={selectedStudentId} onChange={e => { setSelectedStudentId(e.target.value); }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 min-w-[140px]">
            <option value="">학생 선택</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
          </select>
          {selectedStudentId && (
            <button onClick={() => setShowPrint(true)} disabled={pickedCount === 0}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
              선택 문제 보기 ({pickedCount})
            </button>
          )}
        </div>
      </Card>

      {!selectedStudentId && <Card className="p-8 text-center text-sm text-slate-400">학생을 선택해 주세요.</Card>}
      {selectedStudentId && studentMaterials.length === 0 && <Card className="p-8 text-center text-sm text-slate-400">커리큘럼에 연결된 교재가 없습니다.</Card>}

      {studentMaterials.map(mat => (
        <MaterialStatusCard key={mat.id} mat={mat} allStatuses={allStatuses} studentId={selectedStudentId} picked={picked} togglePick={togglePick} bulkSelect={bulkSelect} />
      ))}

      {/* 뽑기 미리보기 모달 */}
      {showPrint && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-auto py-6 px-4" onClick={() => setShowPrint(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl space-y-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">뽑은 문제 — {pickedList.length}문제</h3>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">🖨️ 인쇄</button>
                <button onClick={() => setShowPrint(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
              </div>
            </div>
            {printGroups.map((group, gi) => (
              <div key={gi} className="grid grid-cols-2 gap-3">
                <div className="space-y-3">
                  {[group[0], group[1]].filter(Boolean).map(p => (
                    <div key={p.key} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 border-b border-slate-200">
                        {p.matName} {p.num}번
                        {p.status && (
                          <span className="ml-2 text-[10px]" style={{ color: p.status === "wrong" ? "#ef4444" : p.status === "unknown" ? "#f97316" : "#22c55e" }}>
                            {p.status === "wrong" ? "틀림" : p.status === "unknown" ? "모름" : "맞음"}
                          </span>
                        )}
                      </div>
                      <div className="h-36 flex items-center justify-center text-xs text-slate-300 bg-white">이미지 없음</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {[group[2], group[3]].filter(Boolean).map(p => (
                    <div key={p.key} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 border-b border-slate-200">
                        {p.matName} {p.num}번
                        {p.status && (
                          <span className="ml-2 text-[10px]" style={{ color: p.status === "wrong" ? "#ef4444" : p.status === "unknown" ? "#f97316" : "#22c55e" }}>
                            {p.status === "wrong" ? "틀림" : p.status === "unknown" ? "모름" : "맞음"}
                          </span>
                        )}
                      </div>
                      <div className="h-36 flex items-center justify-center text-xs text-slate-300 bg-white">이미지 없음</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
