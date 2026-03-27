// ── 오답관리 ─────────────────────────────────────────────────────────────────
function WrongAnswerManager({ students = [], materials = [] }) {
  const [selectedStudentId, setSelectedStudentId] = React.useState("");
  const [selectedMaterialId, setSelectedMaterialId] = React.useState("");
  const [statuses, setStatuses] = React.useState({}); // { problemNum: "correct"|"wrong"|"unknown" }
  const [studentMaterials, setStudentMaterials] = React.useState([]); // materials connected via curriculum

  // 학생의 커리큘럼 연결 교재 목록 로드
  React.useEffect(() => {
    if (!selectedStudentId) { setStudentMaterials([]); setSelectedMaterialId(""); return; }
    const ref = db.ref("curriculumNodes");
    ref.once("value", snap => {
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
      setSelectedMaterialId(mats.length > 0 ? mats[0].id : "");
    });
  }, [selectedStudentId]);

  // 문제 상태 로드
  React.useEffect(() => {
    if (!selectedStudentId || !selectedMaterialId) { setStatuses({}); return; }
    const ref = db.ref(`problemStatus/${selectedStudentId}/${selectedMaterialId}`);
    ref.on("value", snap => setStatuses(snap.val() || {}));
    return () => ref.off();
  }, [selectedStudentId, selectedMaterialId]);

  const STATUS_CYCLE = [null, "correct", "wrong", "unknown"];
  const STATUS_STYLE = {
    correct: { bg: "#22c55e", text: "#fff", label: "맞음" },
    wrong:   { bg: "#ef4444", text: "#fff", label: "틀림" },
    unknown: { bg: "#f97316", text: "#fff", label: "모름" },
    null:    { bg: "#f1f5f9", text: "#94a3b8", label: "미체크" },
  };

  const toggleStatus = async (num) => {
    const cur = statuses[num] || null;
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
    const ref = db.ref(`problemStatus/${selectedStudentId}/${selectedMaterialId}/${num}`);
    if (next === null) await ref.remove();
    else await ref.set(next);
  };

  const mat = studentMaterials.find(m => m.id === selectedMaterialId);
  const totalProblems = mat ? Number(mat.totalProblems) || 0 : 0;

  const counts = { correct: 0, wrong: 0, unknown: 0, null: 0 };
  for (let i = 1; i <= totalProblems; i++) counts[statuses[i] || "null"]++;

  const COLS = 20;
  const rows = [];
  for (let r = 0; r < Math.ceil(totalProblems / COLS); r++) {
    rows.push(Array.from({ length: Math.min(COLS, totalProblems - r * COLS) }, (_, c) => r * COLS + c + 1));
  }

  return (
    <div className="space-y-4">
      {/* 선택 영역 */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 min-w-[140px]">
            <option value="">학생 선택</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
          </select>
          <select value={selectedMaterialId} onChange={e => setSelectedMaterialId(e.target.value)}
            disabled={studentMaterials.length === 0}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 min-w-[160px]">
            {studentMaterials.length === 0
              ? <option value="">교재 없음</option>
              : studentMaterials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.totalProblems}문제)</option>)
            }
          </select>
          {/* 범례 */}
          {mat && (
            <div className="flex gap-3 ml-auto flex-wrap">
              {[["correct","맞음"],["wrong","틀림"],["unknown","모름"],["null","미체크"]].map(([k,label]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-4 h-4 rounded" style={{ background: STATUS_STYLE[k].bg }}/>
                  {label} {counts[k]}개
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* 문제 그리드 */}
      {!selectedStudentId && (
        <Card className="p-8 text-center text-sm text-slate-400">학생을 선택해 주세요.</Card>
      )}
      {selectedStudentId && studentMaterials.length === 0 && (
        <Card className="p-8 text-center text-sm text-slate-400">커리큘럼에 연결된 교재가 없습니다.</Card>
      )}
      {mat && totalProblems > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{mat.name}</h3>
            <span className="text-xs text-slate-400">총 {totalProblems}문제 · 클릭: 미체크 → 맞음 → 틀림 → 모름 → 미체크</span>
          </div>
          <div className="space-y-1 overflow-x-auto">
            {rows.map((row, ri) => (
              <div key={ri} className="flex gap-1">
                <div className="w-10 text-right text-[10px] text-slate-400 shrink-0 self-center pr-1">
                  {row[0]}~
                </div>
                {row.map(num => {
                  const st = statuses[num] || null;
                  const style = STATUS_STYLE[st];
                  return (
                    <button key={num} onClick={() => toggleStatus(num)}
                      title={`${num}번 — ${style.label}`}
                      style={{ background: style.bg, color: style.text }}
                      className="w-7 h-7 rounded text-[9px] font-bold transition hover:opacity-80 shrink-0 border border-white/30">
                      {num}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
