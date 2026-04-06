// ── 오답관리 ─────────────────────────────────────────────────────────────────
function ProblemImg({ matId, num }) {
  const [url, setUrl] = React.useState(null);
  React.useEffect(() => {
    db.ref(`problemImages/${matId}/${num}`).once("value", snap => setUrl(snap.val() || null));
  }, [matId, num]);
  if (url) return <img src={url} alt={`${num}번`} style={{width:"100%",height:"auto",display:"block"}} />;
  return <div className="h-36 flex items-center justify-center text-xs text-slate-300 bg-white">이미지 없음</div>;
}

const STATUS_CYCLE = [null, "correct", "wrong", "unknown"];
const STATUS_STYLE = {
  correct: { bg: "#22c55e", text: "#fff", label: "맞음" },
  wrong:   { bg: "#ef4444", text: "#fff", label: "틀림" },
  unknown: { bg: "#8b5cf6", text: "#fff", label: "모름" },
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

  const markAllCorrect = async () => {
    if (!confirm(`"${mat.name}" 전체 ${totalProblems}문제를 모두 맞음으로 처리할까요?`)) return;
    setSaving(true);
    const updates = {};
    for (let i = startNum; i <= endNum; i++) {
      updates[`problemStatus/${studentId}/${mat.id}/${i}`] = "correct";
    }
    await db.ref().update(updates);
    setSaving(false);
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
            ? <div className="flex gap-1.5">
                <button onClick={markAllCorrect} disabled={saving} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-medium hover:bg-emerald-200 disabled:opacity-50">전부 맞음</button>
                <button onClick={enterEdit} className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium hover:bg-slate-200">오답수정</button>
              </div>
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
  const [hwTab, setHwTab] = React.useState("현행");
  const [gradeFilter, setGradeFilter] = React.useState("전체");
  const [studentMaterials, setStudentMaterials] = React.useState([]);
  const [allStatuses, setAllStatuses] = React.useState({});
  const [picked, setPicked] = React.useState({});
  const [showPrint, setShowPrint] = React.useState(false);

  const grades = React.useMemo(() => {
    const set = new Set(students.map(s => s.className).filter(Boolean));
    return ["전체", ...Array.from(set).sort()];
  }, [students]);

  const filteredStudents = React.useMemo(() =>
    gradeFilter === "전체" ? students : students.filter(s => s.className === gradeFilter)
  , [students, gradeFilter]);

  React.useEffect(() => {
    if (!selectedStudentId) { setStudentMaterials([]); return; }
    let nodesData = {};
    let pathsData = {};
    let nodesLoaded = false, pathsLoaded = false;

    const rebuild = () => {
      if (!nodesLoaded || !pathsLoaded) return;
      const mats = [];
      for (const [boardId, board] of Object.entries(nodesData)) {
        const startNodeId = `start_${selectedStudentId}`;
        const startNode = board[startNodeId];
        if (!startNode) continue;
        // hwType 필터: 탭과 다르면 이 보드 건너뜀
        if ((startNode.hwType || "현행") !== hwTab) continue;
        const customEdges = pathsData[boardId]?.[selectedStudentId];
        const hasCustom = customEdges && Object.keys(customEdges).length > 0;
        const visited = new Set();
        if (hasCustom) {
          let curId = startNodeId;
          while (curId && !visited.has(curId)) {
            visited.add(curId);
            const n = board[curId];
            if (!n) break;
            if (n.type === "material") {
              const mat = materials.find(m => m.id === n.materialId);
              if (mat && !mats.find(m => m.id === mat.id))
                mats.push({ ...mat, totalProblems: n.totalProblems || mat.totalProblems });
            }
            const nextId = (n.nextNodes || []).find(nid => customEdges[`${curId}__${nid}`]);
            curId = nextId || null;
          }
        } else {
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
      }
      setStudentMaterials(mats);
      setPicked({});
    };

    const nodesRef = db.ref("curriculumNodes");
    nodesRef.on("value", snap => { nodesData = snap.val() || {}; nodesLoaded = true; rebuild(); });
    const pathsRef = db.ref("studentPaths");
    pathsRef.on("value", snap => { pathsData = snap.val() || {}; pathsLoaded = true; rebuild(); });
    return () => { nodesRef.off(); pathsRef.off(); };
  }, [selectedStudentId, hwTab]);

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
    const targets = [];
    for (let num = startNum; num <= endNum; num++) {
      const s = matStatuses[num] || null;
      if (status === "all" || s === status) targets.push(`${matId}:${num}`);
    }
    if (targets.length === 0) return;
    setPicked(prev => {
      const allSelected = targets.every(k => prev[k]);
      const copy = { ...prev };
      if (allSelected) {
        targets.forEach(k => delete copy[k]);
      } else {
        targets.forEach(k => { copy[k] = true; });
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


  const handlePrint = async () => {
    const student = students.find(s => s.id === selectedStudentId) || {};
    const studentName = student.name || "";
    const studentClass = student.className || "";
    const statusLabel = (s) => s === "wrong" ? "틀림" : s === "unknown" ? "모름" : s === "correct" ? "맞음" : "";
    const statusColor = (s) => s === "wrong" ? "#ef4444" : s === "unknown" ? "#8b5cf6" : "#22c55e";

    // 이미지 URL 로드
    const imgUrls = {};
    await Promise.all(pickedList.map(async p => {
      const snap = await db.ref(`problemImages/${p.matId}/${p.num}`).once("value");
      imgUrls[p.key] = snap.val() || null;
    }));

    // 현재 페이지 숨겨진 div에서 실제 높이 측정 → tall 판단 → 인쇄 창 구성
    const tallMap = await new Promise(resolve => {
      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:0;width:86mm;visibility:hidden;pointer-events:none;";
      document.body.appendChild(container);

      pickedList.forEach((p, idx) => {
        const div = document.createElement("div");
        div.dataset.idx = idx;
        div.style.marginBottom = "0";
        if (imgUrls[p.key]) {
          const img = document.createElement("img");
          img.src = imgUrls[p.key];
          img.style.cssText = "max-width:100%;height:auto;display:block;";
          div.appendChild(img);
        }
        container.appendChild(div);
      });

      const imgs = container.querySelectorAll("img");
      if (imgs.length === 0) {
        const map = {};
        pickedList.forEach((p, idx) => {
          const el = container.querySelector(`[data-idx="${idx}"]`);
          if (el) map[p.key] = el.offsetHeight > 514;
        });
        document.body.removeChild(container);
        resolve(map);
        return;
      }

      let loaded = 0;
      const onDone = () => {
        loaded++;
        if (loaded < imgs.length) return;
        const map = {};
        pickedList.forEach((p, idx) => {
          const el = container.querySelector(`[data-idx="${idx}"]`);
          if (el) map[p.key] = el.offsetHeight > 514;
        });
        document.body.removeChild(container);
        resolve(map);
      };
      imgs.forEach(img => {
        if (img.complete) onDone();
        else { img.onload = onDone; img.onerror = onDone; }
      });
      setTimeout(() => {
        if (!container.parentNode) return;
        const map = {};
        pickedList.forEach((p, idx) => {
          const el = container.querySelector(`[data-idx="${idx}"]`);
          if (el) map[p.key] = el.offsetHeight > 514;
        });
        document.body.removeChild(container);
        resolve(map);
      }, 6000);
    });

    const buildLayout = (tallMap) => {
      const statusLabel2 = (s) => s === "wrong" ? "틀림" : s === "unknown" ? "모름" : s === "correct" ? "맞음" : "";
      const statusColor2 = (s) => s === "wrong" ? "#ef4444" : s === "unknown" ? "#8b5cf6" : "#22c55e";

      const colSlots = [];
      let ci = 0;
      while (ci < pickedList.length) {
        const p = pickedList[ci];
        const tall = tallMap[p.key] || false;
        if (tall) {
          colSlots.push([p, null]);
          ci++;
        } else {
          const next = pickedList[ci + 1];
          if (next && !(tallMap[next.key] || false)) {
            colSlots.push([p, next]);
            ci += 2;
          } else {
            colSlots.push([p, null]);
            ci++;
          }
        }
      }
      const pageSlots = [];
      for (let i = 0; i < colSlots.length; i += 2) pageSlots.push([colSlots[i], colSlots[i + 1] || null]);

      const box = (p) => p ? `
        <div class="problem">
          <div class="problem-header">
            ${p.matName} ${p.num}번
            ${p.status ? `<span style="color:${statusColor2(p.status)};font-size:10px;margin-left:6px">${statusLabel2(p.status)}</span>` : ""}
          </div>
          <div class="problem-body">
            ${imgUrls[p.key] ? `<img src="${imgUrls[p.key]}" style="max-width:100%;height:auto;display:block;" />` : ""}
          </div>
        </div>` : "";

      const col = (slot) => {
        if (!slot) return `<div class="col"></div>`;
        const [p1, p2] = slot;
        return `<div class="col">${box(p1)}${p2 ? box(p2) : ""}</div>`;
      };

      return pageSlots.map((page, gi) => `
        <div class="page">
          <div class="page-header">
            <span class="student-name">${studentClass ? studentClass + " " : ""}${studentName}</span>
            <span class="page-info">오답 문제 (${gi + 1}/${pageSlots.length})</span>
          </div>
          <div class="cols">
            ${col(page[0])}
            ${col(page[1])}
          </div>
        </div>`).join("");
    };

    const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: white; }
  @page { size: A4 portrait; margin: 12mm 15mm; }
  .page { width: 100%; page-break-after: always; }
  .page:last-child { page-break-after: avoid; }
  .page-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #1e293b; padding-bottom: 4px; margin-bottom: 6mm; }
  .student-name { font-size: 16px; font-weight: 800; color: #0f172a; }
  .page-info { font-size: 10px; color: #94a3b8; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
  .col { display: flex; flex-direction: column; gap: 6mm; }
  .problem { display: flex; flex-direction: column; }
  .problem-header { padding: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #334155; border-bottom: 1px solid #cbd5e1; flex-shrink: 0; margin-bottom: 4px; }
  .problem-body img { max-width: 100%; height: auto; display: block; }`;

    const win = window.open("", "_blank");
    const finalHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>${buildLayout(tallMap)}</body></html>`;
    win.document.write(finalHtml);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  return (
    <div className="space-y-4">
      {/* 현행/추가1/추가2 서브탭 */}
      <div className="flex justify-center">
        <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-1">
          {["현행","추가1","추가2"].map(t => (
            <button key={t} onClick={() => { setHwTab(t); setPicked({}); }}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition ${hwTab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {grades.map(g => (
            <button key={g} onClick={() => { setGradeFilter(g); setSelectedStudentId(""); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${gradeFilter === g ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {g}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 min-w-[140px]">
            <option value="">학생 선택</option>
            {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
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
            <div className="grid grid-cols-2 gap-3">
              {pickedList.map(p => (
                <div key={p.key} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 border-b border-slate-200">
                    {p.matName} {p.num}번
                    {p.status && (
                      <span className="ml-2 text-[10px]" style={{ color: p.status === "wrong" ? "#ef4444" : p.status === "unknown" ? "#8b5cf6" : "#22c55e" }}>
                        {p.status === "wrong" ? "틀림" : p.status === "unknown" ? "모름" : "맞음"}
                      </span>
                    )}
                  </div>
                  <ProblemImg matId={p.matId} num={p.num} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
