// ── 교재 관리 탭 ─────────────────────────────────────────────────────────────
function MaterialsTab({ materials }) {
  const empty = { name: "", subject: "수학", totalProblems: "", minutesPerProblem: "" };
  const [form, setForm] = React.useState(empty);
  const [editId, setEditId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSave = async () => {
    if (!form.name.trim()) { setError("교재명을 입력해 주세요."); return; }
    if (!form.totalProblems) { setError("총 문제 수를 입력해 주세요."); return; }
    setSaving(true); setError("");
    const data = {
      name: form.name.trim(), subject: form.subject || "수학",
      totalProblems: Number(form.totalProblems),
      minutesPerProblem: Number(form.minutesPerProblem) || 0,
    };
    try {
      if (editId) { await db.ref(`materials/${editId}`).update(data); }
      else { const id = Date.now().toString(); await db.ref(`materials/${id}`).set({ id, ...data }); }
      setForm(empty); setEditId(null);
    } catch(e) { setError("저장 실패: " + e.message); }
    setSaving(false);
  };

  const handleEdit = (mat) => {
    setForm({ name: mat.name, subject: mat.subject, totalProblems: mat.totalProblems, minutesPerProblem: mat.minutesPerProblem || "" });
    setEditId(mat.id);
  };

  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-bold">{editId ? "교재 수정" : "교재 추가"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Lbl>교재명</Lbl>
            <Inp value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="예: 매쓰플랫 공수1 기본개념서"/>
          </div>
          <div className="space-y-1.5"><Lbl>과목</Lbl>
            <select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}
              className="w-full rounded-xl border border-input px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
              {["중1-1","중1-2","중2-1","중2-2","중3-1","중3-2","공통수학1","공통수학2","대수","미적분1","기하","미적분","확률과통계"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Lbl>총 문제 수</Lbl><Inp type="number" value={form.totalProblems} onChange={e=>setForm({...form,totalProblems:e.target.value})} placeholder="300"/></div>
          <div className="space-y-1.5"><Lbl>문제당 예상 시간 (분)</Lbl><Inp type="number" value={form.minutesPerProblem} onChange={e=>setForm({...form,minutesPerProblem:e.target.value})} placeholder="5"/></div>
        </div>
        {error && <AlertBox className="bg-red-50 text-red-700">{error}</AlertBox>}
        <div className="flex gap-2">
          <Btn onClick={handleSave} disabled={saving}>{saving?"저장 중...":(editId?"수정 완료":"교재 추가")}</Btn>
          {editId && <Btn variant="outline" onClick={()=>{ setEditId(null); setForm(empty); setError(""); }}>취소</Btn>}
        </div>
      </Card>
      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-bold">등록된 교재 ({materials.length})</h2>
        {materials.length === 0
          ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">아직 등록된 교재가 없습니다.</div>
          : <div className="space-y-2">
              {materials.map(mat => {
                const est = mat.minutesPerProblem ? Math.round(mat.totalProblems * mat.minutesPerProblem / 60 * 10) / 10 : null;
                return (
                  <div key={mat.id} className="flex items-center gap-3 rounded-2xl border px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{mat.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {mat.subject} · {mat.totalProblems}문제 · 문제당 {mat.minutesPerProblem||"?"}분
                        {est !== null && ` · 예상 ${est}시간`}
                      </div>
                    </div>
                    <Btn variant="outline" size="sm" onClick={()=>handleEdit(mat)}>수정</Btn>
                    <Btn variant="outline" size="sm" onClick={async()=>{ if(!confirm("삭제?")) return; await db.ref(`materials/${mat.id}`).remove(); }}>삭제</Btn>
                  </div>
                );
              })}
            </div>
        }
      </Card>
    </div>
  );
}

// ── 커리큘럼 비주얼 에디터 ───────────────────────────────────────────────────
const NODE_W = 105;
const NODE_H = 50;
const PORT_SIZE = 14;
const PATH_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f59e0b"];

// 노드 스타일
function getNodeStyle(node) {
  if (node.type === "material") return { border: "#cbd5e1", bg: "#fff", headerBg: "#f1f5f9", headerText: "#475569", title: "📚 교재" };
  if (node.type === "start")    return { border: "#f9a8d4", bg: "#fdf2f8", headerBg: "#fbcfe8", headerText: "#9d174d", title: "▶ START" };
  /* end */                     return { border: "#86efac", bg: "#f0fdf4", headerBg: "#bbf7d0", headerText: "#166534", title: "■ END" };
}

function CurriculumVisualEditor({ boardId, students, materials }) {
  const [nodes, setNodes] = React.useState({});
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const [connectingFrom, setConnectingFrom] = React.useState(null);
  const [dragging, setDragging] = React.useState(null); // { offsets: {nodeId: {ox,oy}} }
  const [boxSelect, setBoxSelect] = React.useState(null); // { x1,y1,x2,y2 } canvas coords
  const [localPos, setLocalPos] = React.useState({});
  const [showAddStudent, setShowAddStudent] = React.useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = React.useState([]);
  const [zoom, setZoom] = React.useState(1);
  const [studentPaths, setStudentPaths] = React.useState({});
  const [activePathStudentId, setActivePathStudentId] = React.useState(null);
  const [pathEditMode, setPathEditMode] = React.useState(false);
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const ref = db.ref(`curriculumNodes/${boardId}`);
    ref.on("value", snap => setNodes(snap.val() || {}));
    return () => ref.off();
  }, [boardId]);

  React.useEffect(() => {
    const ref = db.ref(`studentPaths/${boardId}`);
    ref.on("value", snap => setStudentPaths(snap.val() || {}));
    return () => ref.off();
  }, [boardId]);

  React.useEffect(() => {
    const el = canvasRef.current;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(prev => Math.min(3, Math.max(0.2, prev - e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  React.useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") setConnectingFrom(null); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const nodeList = Object.values(nodes);
  const getPos = (node) => ({ x: localPos[node.id]?.x ?? node.x ?? 80, y: localPos[node.id]?.y ?? node.y ?? 80 });
  const nodesRef = `curriculumNodes/${boardId}`;

  const addMaterialNode = async () => {
    if (materials.length === 0) return;
    const id = Date.now().toString();
    const mat = materials[0];
    const existing = nodeList.filter(n => n.type === "material");
    await db.ref(`${nodesRef}/${id}`).set({
      id, type: "material",
      materialId: mat.id, materialName: mat.name, totalProblems: mat.totalProblems,
      nextNodes: [],
      x: 120 + (existing.length % 4) * 160,
      y: 160 + Math.floor(existing.length / 4) * 140,
      createdAt: new Date().toISOString(),
    });
    setSelectedIds(new Set([id]));
  };

  const addStudentNodes = async () => {
    if (selectedStudentIds.length === 0) return;
    const existingCount = nodeList.filter(n => n.type === "start").length;
    for (let i = 0; i < selectedStudentIds.length; i++) {
      const sid = selectedStudentIds[i];
      const student = students.find(s => s.id === sid);
      if (!student || nodes[`start_${sid}`]) continue;
      const baseY = 60 + (existingCount + i) * 60;
      await db.ref(`${nodesRef}/start_${sid}`).set({
        id: `start_${sid}`, type: "start", studentId: student.id, studentName: student.name,
        nextNodes: [], x: 30, y: baseY, createdAt: new Date().toISOString(),
      });
      await db.ref(`${nodesRef}/end_${sid}`).set({
        id: `end_${sid}`, type: "end", studentId: student.id, studentName: student.name,
        nextNodes: [], x: 800, y: baseY, createdAt: new Date().toISOString(),
      });
    }
    setShowAddStudent(false);
    setSelectedStudentIds([]);
  };

  // 캔버스 좌표 계산
  const canvasXY = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      cx: (e.clientX - rect.left + canvasRef.current.scrollLeft) / zoom,
      cy: (e.clientY - rect.top + canvasRef.current.scrollTop) / zoom,
    };
  };

  const handlePortClick = (e, nodeId) => {
    e.stopPropagation(); e.preventDefault();
    if (connectingFrom) {
      if (connectingFrom !== nodeId) {
        const from = nodes[connectingFrom];
        const cur = from.nextNodes || [];
        if (!cur.includes(nodeId))
          db.ref(`${nodesRef}/${connectingFrom}`).update({ nextNodes: [...cur, nodeId] });
      }
      setConnectingFrom(null);
    } else {
      setSelectedIds(new Set([nodeId]));
      setConnectingFrom(nodeId);
    }
  };

  const handleNodeMouseDown = (e, nodeId) => {
    if (e.target.dataset.port) return;
    e.preventDefault(); e.stopPropagation();

    // 연결 모드
    if (connectingFrom) {
      if (connectingFrom !== nodeId) {
        const from = nodes[connectingFrom];
        const cur = from.nextNodes || [];
        if (!cur.includes(nodeId))
          db.ref(`${nodesRef}/${connectingFrom}`).update({ nextNodes: [...cur, nodeId] });
      }
      setConnectingFrom(null);
      setSelectedIds(new Set([nodeId]));
      return;
    }

    // 선택 처리
    const nextSelected = e.shiftKey
      ? new Set([...selectedIds, nodeId])
      : selectedIds.has(nodeId) ? selectedIds : new Set([nodeId]);
    setSelectedIds(nextSelected);

    // 학생 노드 클릭 시 경로 자동 표시
    const clickedNode = nodes[nodeId];
    if (clickedNode?.type === "start" || clickedNode?.type === "end") {
      setActivePathStudentId(clickedNode.studentId);
      setPathEditMode(false);
    } else {
      setActivePathStudentId(null);
      setPathEditMode(false);
    }

    // 드래그 오프셋 계산 (선택된 모든 노드)
    const { cx, cy } = canvasXY(e);
    const dragNodeIds = nextSelected.has(nodeId) ? [...nextSelected] : [nodeId];
    const offsets = {};
    for (const nid of dragNodeIds) {
      const pos = getPos(nodes[nid]);
      offsets[nid] = { ox: cx - pos.x, oy: cy - pos.y };
    }
    setDragging({ offsets });
  };

  // 빈 캔버스 mousedown → 박스 선택 시작
  const handleCanvasMouseDown = (e) => {
    if (connectingFrom) { setConnectingFrom(null); return; }
    if (pathEditMode) return;
    const { cx, cy } = canvasXY(e);
    setBoxSelect({ x1: cx, y1: cy, x2: cx, y2: cy });
    setSelectedIds(new Set());
    setActivePathStudentId(null);
  };

  const handleMouseMove = (e) => {
    const { cx, cy } = canvasXY(e);
    if (dragging) {
      const newPos = {};
      for (const [nid, off] of Object.entries(dragging.offsets)) {
        newPos[nid] = { x: Math.max(0, cx - off.ox), y: Math.max(0, cy - off.oy) };
      }
      setLocalPos(prev => ({ ...prev, ...newPos }));
    }
    if (boxSelect) {
      setBoxSelect(prev => ({ ...prev, x2: cx, y2: cy }));
    }
  };

  const handleMouseUp = () => {
    if (dragging) {
      const updates = Object.keys(dragging.offsets);
      for (const nid of updates) {
        const pos = localPos[nid];
        if (pos) db.ref(`${nodesRef}/${nid}`).update({ x: pos.x, y: pos.y });
      }
      setDragging(null);
    }
    if (boxSelect) {
      const { x1, y1, x2, y2 } = boxSelect;
      const minX = Math.min(x1, x2), maxX2 = Math.max(x1, x2);
      const minY = Math.min(y1, y2), maxY2 = Math.max(y1, y2);
      const hit = nodeList.filter(n => {
        const p = getPos(n);
        return p.x + NODE_W > minX && p.x < maxX2 && p.y + NODE_H > minY && p.y < maxY2;
      });
      if (hit.length > 0) setSelectedIds(new Set(hit.map(n => n.id)));
      setBoxSelect(null);
    }
  };

  const removeConnection = async (fromId, toId) => {
    const n = nodes[fromId]; if (!n) return;
    await db.ref(`${nodesRef}/${fromId}`).update({ nextNodes: (n.nextNodes||[]).filter(x=>x!==toId) });
  };

  const deleteSelected = async () => {
    if (!confirm(`${selectedIds.size}개 노드를 삭제할까요?`)) return;
    for (const nodeId of selectedIds) {
      for (const n of nodeList)
        if ((n.nextNodes||[]).includes(nodeId))
          await db.ref(`${nodesRef}/${n.id}`).update({ nextNodes: n.nextNodes.filter(x=>x!==nodeId) });
      await db.ref(`${nodesRef}/${nodeId}`).remove();
    }
    setSelectedIds(new Set());
  };

  const toggleEdge = async (fromId, toId) => {
    if (!activePathStudentId) return;
    const key = `${fromId}__${toId}`;
    const isSet = (studentPaths[activePathStudentId] || {})[key];
    if (isSet) await db.ref(`studentPaths/${boardId}/${activePathStudentId}/${key}`).remove();
    else await db.ref(`studentPaths/${boardId}/${activePathStudentId}/${key}`).set(true);
  };

  // 학생 경로 계산: 커스텀 있으면 사용, 없으면 DFS 첫 번째 경로
  const computeStudentPath = (studentId) => {
    const custom = studentPaths[studentId];
    if (custom && Object.keys(custom).length > 0) return new Set(Object.keys(custom));
    const pathEdges = new Set();
    let curId = `start_${studentId}`;
    const visited = new Set();
    while (curId && !visited.has(curId)) {
      visited.add(curId);
      const cur = nodes[curId];
      if (!cur || !cur.nextNodes?.length) break;
      const nextId = cur.nextNodes[0];
      pathEdges.add(`${curId}__${nextId}`);
      curId = nextId;
    }
    return pathEdges;
  };

  const activePath = activePathStudentId ? computeStudentPath(activePathStudentId) : new Set();

  const maxX = Math.max(900, ...nodeList.map(n => getPos(n).x + NODE_W + PORT_SIZE * 2 + 80));
  const maxY = Math.max(500, ...nodeList.map(n => getPos(n).y + NODE_H + 80));

  // 단일 선택일 때만 사이드패널 표시
  const selectedId = selectedIds.size === 1 ? [...selectedIds][0] : null;
  const selectedNode = selectedId ? nodes[selectedId] : null;

  const portStyle = (active) => ({
    width: PORT_SIZE, height: PORT_SIZE, borderRadius: "50%",
    border: `2px solid ${active ? "#64748b" : "#cbd5e1"}`,
    background: active ? "#64748b" : "#fff",
    color: active ? "#fff" : "#94a3b8",
    fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", zIndex: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    userSelect: "none", flexShrink: 0,
  });

  return (
    <div className="space-y-3">
      {/* 툴바 + 상태창 한 줄 */}
      <div className="flex items-center gap-2 border rounded-xl bg-white px-3 overflow-hidden" style={{ height: 44, minHeight: 44 }}>
        <Btn onClick={addMaterialNode} disabled={materials.length === 0}>+ 교재 노드</Btn>
        <Btn variant="outline" onClick={() => setShowAddStudent(s=>!s)}>+ 학생 노드</Btn>
        <div className="h-4 w-px bg-slate-200 shrink-0"/>
        {connectingFrom ? (
          <>
            <span className="text-sm text-slate-600 truncate">"{nodes[connectingFrom]?.materialName || nodes[connectingFrom]?.studentName}" → 연결할 노드 클릭</span>
            <button onClick={() => setConnectingFrom(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none shrink-0">×</button>
          </>
        ) : selectedIds.size > 1 ? (
          <>
            <span className="text-sm font-semibold text-slate-600 shrink-0">{selectedIds.size}개 선택됨</span>
            <Btn variant="outline" size="sm" onClick={deleteSelected}>선택 삭제</Btn>
          </>
        ) : selectedNode ? (
          <>
            <span className="text-sm font-semibold text-slate-600 shrink-0">
              {selectedNode.type === "material" ? "교재 노드"
                : selectedNode.type === "start" ? `${selectedNode.studentName} · 시작`
                : `${selectedNode.studentName} · 끝`}
            </span>
            {selectedNode.type === "material" && (
              <>
                <div className="h-4 w-px bg-slate-200 shrink-0"/>
                <span className="text-xs text-slate-400 shrink-0">교재</span>
                <select value={selectedNode.materialId}
                  onChange={async e => {
                    const mat = materials.find(m => m.id === e.target.value);
                    if (mat) await db.ref(`${nodesRef}/${selectedId}`).update({
                      materialId: mat.id, materialName: mat.name, totalProblems: mat.totalProblems
                    });
                  }}
                  className="rounded-lg border px-2 py-1 text-sm bg-white shrink-0">
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </>
            )}
            {(selectedNode.type === "start" || selectedNode.type === "end") && (
              <>
                <div className="h-4 w-px bg-slate-200 shrink-0"/>
                <button onClick={() => setPathEditMode(p => !p)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 ${pathEditMode ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {pathEditMode ? "✏️ 화살표 클릭 → 경로 추가/제거" : "경로 편집"}
                </button>
                {pathEditMode && studentPaths[selectedNode.studentId] && (
                  <button onClick={async () => { if(confirm("커스텀 경로를 초기화할까요? 기본 경로로 돌아갑니다.")) await db.ref(`studentPaths/${boardId}/${selectedNode.studentId}`).remove(); }}
                    className="text-xs text-slate-400 hover:text-red-500 shrink-0">초기화</button>
                )}
              </>
            )}
            <div className="h-4 w-px bg-slate-200 shrink-0"/>
            <span className="text-xs text-slate-400 shrink-0">다음</span>
            <div className="flex items-center gap-1 overflow-x-auto flex-1">
              {(selectedNode.nextNodes||[]).length === 0
                ? <span className="text-xs text-slate-300 whitespace-nowrap">없음 — ⊕로 연결</span>
                : (selectedNode.nextNodes||[]).map(nid => {
                    const n = nodes[nid]; if (!n) return null;
                    return (
                      <span key={nid} className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-0.5 text-xs whitespace-nowrap shrink-0">
                        {n.materialName || `${n.studentName} ${n.type==="end"?"끝":"시작"}`}
                        <button onClick={() => removeConnection(selectedId, nid)} className="text-slate-400 hover:text-red-500">✕</button>
                      </span>
                    );
                  })
              }
            </div>
            <Btn variant="outline" size="sm" className="shrink-0" onClick={deleteSelected}>삭제</Btn>
            <button onClick={() => setSelectedIds(new Set())} className="text-slate-300 hover:text-slate-500 text-lg leading-none shrink-0">×</button>
          </>
        ) : (
          <span className="text-xs text-slate-400">드래그로 이동 · 좌우 ⊕ 클릭 후 다른 노드 클릭으로 연결 · ESC로 취소</span>
        )}
        {materials.length === 0 && <span className="text-xs text-amber-600 shrink-0 ml-auto">⚠ 먼저 교재를 등록하세요</span>}
      </div>


      {/* 학생 노드 추가 패널 */}
      {showAddStudent && (
        <Card className="p-4 space-y-3">
          <div className="font-medium text-sm text-slate-600">학생 시작/끝 노드 추가 (여러 명 선택 가능)</div>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {students.map(s => {
              const alreadyAdded = !!nodes[`start_${s.id}`];
              const checked = selectedStudentIds.includes(s.id);
              return (
                <label key={s.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm cursor-pointer transition select-none
                  ${alreadyAdded ? "opacity-40 cursor-not-allowed bg-slate-50" : checked ? "bg-slate-900 text-white border-slate-900 font-medium" : "bg-white hover:bg-slate-50 text-slate-700"}`}>
                  <input type="checkbox" checked={checked} disabled={alreadyAdded}
                    onChange={e => setSelectedStudentIds(prev =>
                      e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                    )}
                    className="w-3.5 h-3.5"
                  />
                  {s.name} <span className={`text-xs ${checked ? "text-slate-300" : "text-slate-400"}`}>({s.className})</span>
                  {alreadyAdded && <span className="text-xs text-slate-400">추가됨</span>}
                </label>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Btn size="sm" onClick={addStudentNodes} disabled={selectedStudentIds.length === 0}>
              {selectedStudentIds.length > 0 ? `${selectedStudentIds.length}명 추가` : "추가"}
            </Btn>
            <Btn size="sm" variant="outline" onClick={()=>{ setShowAddStudent(false); setSelectedStudentIds([]); }}>취소</Btn>
            <button onClick={() => setSelectedStudentIds(students.filter(s=>!nodes[`start_${s.id}`]).map(s=>s.id))}
              className="text-xs text-slate-400 hover:text-slate-600 hover:underline ml-1">전체 선택</button>
          </div>
        </Card>
      )}

      {/* 캔버스 */}
      <div style={{ position: "relative" }}>
        <div
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full border rounded-2xl overflow-auto bg-slate-50"
          style={{ height: 560, cursor: dragging ? "grabbing" : boxSelect ? "crosshair" : "default" }}
          onMouseDown={handleCanvasMouseDown}
        >
          <div style={{ width: maxX * zoom, height: maxY * zoom }}>
          <div style={{ width: maxX, height: maxY, position: "relative", transform: `scale(${zoom})`, transformOrigin: "top left" }}>
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <defs>
                <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="12" cy="12" r="1" fill="#e2e8f0"/>
                </pattern>
                <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0,8 3,0 6" fill="#cbd5e1"/>
                </marker>
                <marker id="arr-active" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0,8 3,0 6" fill="#334155"/>
                </marker>
              </defs>
              <rect width="100%" height="100%" fill="url(#dots)" style={{ pointerEvents: "none" }}/>
              {boxSelect && (() => {
                const { x1,y1,x2,y2 } = boxSelect;
                return <rect style={{ pointerEvents: "none" }}
                  x={Math.min(x1,x2)} y={Math.min(y1,y2)}
                  width={Math.abs(x2-x1)} height={Math.abs(y2-y1)}
                  fill="rgba(100,116,139,0.08)" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3"/>;
              })()}

              {/* 엣지 (굵기로 경로 구분) */}
              {nodeList.flatMap(node =>
                (node.nextNodes||[]).map(tid => {
                  const to = nodes[tid]; if (!to) return null;
                  const fp = getPos(node), tp = getPos(to);
                  const x1 = fp.x + NODE_W + PORT_SIZE, y1 = fp.y + NODE_H / 2;
                  const x2 = tp.x, y2 = tp.y + NODE_H / 2;
                  const cx = (x1 + x2) / 2;
                  const d = `M${x1} ${y1} C${cx} ${y1},${cx} ${y2},${x2} ${y2}`;
                  const inPath = activePath.has(`${node.id}__${tid}`);
                  return (
                    <path key={`edge-${node.id}-${tid}`} d={d}
                      stroke={inPath ? "#334155" : "#cbd5e1"}
                      strokeWidth={inPath ? 3 : 1.5} fill="none"
                      markerEnd={inPath ? "url(#arr-active)" : "url(#arr)"}
                      style={{ pointerEvents: "none" }}/>
                  );
                }).filter(Boolean)
              )}

              {/* 클릭 히트 영역 (경로 편집 모드) */}
              {pathEditMode && activePathStudentId && nodeList.flatMap(node =>
                (node.nextNodes||[]).map(tid => {
                  const to = nodes[tid]; if (!to) return null;
                  const fp = getPos(node), tp = getPos(to);
                  const x1 = fp.x + NODE_W + PORT_SIZE, y1 = fp.y + NODE_H / 2;
                  const x2 = tp.x, y2 = tp.y + NODE_H / 2;
                  const cx = (x1 + x2) / 2;
                  const d = `M${x1} ${y1} C${cx} ${y1},${cx} ${y2},${x2} ${y2}`;
                  const inPath = activePath.has(`${node.id}__${tid}`);
                  return (
                    <path key={`hit-${node.id}-${tid}`} d={d}
                      stroke={inPath ? "#334155" : "rgba(0,0,0,0.06)"}
                      strokeWidth="16" fill="none" opacity={0.2}
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onClick={e => { e.stopPropagation(); toggleEdge(node.id, tid); }}/>
                  );
                }).filter(Boolean)
              )}
            </svg>

            {nodeList.map(node => {
              const pos = getPos(node);
              const s = getNodeStyle(node);
              const isSelected = selectedIds.has(node.id);
              const isConnSrc = connectingFrom === node.id;

              return (
                <div key={node.id} style={{
                  position: "absolute", left: pos.x, top: pos.y,
                  width: NODE_W + PORT_SIZE * 2,
                  display: "flex", alignItems: "center",
                  zIndex: isSelected ? 10 : 2, userSelect: "none",
                }}>
                  {/* 왼쪽 포트 */}
                  <button data-port="left"
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
                    onClick={e => handlePortClick(e, node.id)}
                    style={portStyle(isConnSrc)}>⊕</button>

                  {/* 노드 본체 */}
                  <div onMouseDown={e => handleNodeMouseDown(e, node.id)} style={{
                    flex: 1, height: NODE_H,
                    cursor: dragging?.nodeId === node.id ? "grabbing" : "grab",
                    border: `2px solid ${isSelected ? "#64748b" : s.border}`,
                    background: s.bg, borderRadius: 10, overflow: "hidden",
                    boxShadow: isSelected ? "0 0 0 2px #cbd5e1, 0 4px 12px rgba(0,0,0,0.1)" : "0 1px 4px rgba(0,0,0,0.08)",
                    display: "flex", flexDirection: "column",
                  }}>
                    {/* 헤더 */}
                    <div style={{
                      background: s.headerBg, color: s.headerText,
                      fontSize: 8, fontWeight: 700, padding: "2px 6px",
                      letterSpacing: "0.04em", whiteSpace: "nowrap",
                    }}>
                      {s.title}
                    </div>
                    {/* 바디 */}
                    <div style={{ flex: 1, padding: "3px 6px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      {node.type === "material" ? (
                        <>
                          <div style={{ fontSize: 9, fontWeight: 600, lineHeight: 1.2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {node.materialName}
                          </div>
                          <div style={{ fontSize: 8, color: "#94a3b8", marginTop: 1 }}>{node.totalProblems}문제</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 9, fontWeight: 700, textAlign: "center", color: s.headerText }}>
                          {node.studentName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽 포트 */}
                  <button data-port="right"
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
                    onClick={e => handlePortClick(e, node.id)}
                    style={portStyle(isConnSrc)}>⊕</button>
                </div>
              );
            })}

            {nodeList.length === 0 && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                color: "#94a3b8", fontSize: 13, gap: 6, pointerEvents: "none",
              }}>
                <div>1. 교재 탭에서 교재 등록</div>
                <div>2. "+ 교재 노드" 로 노드 추가</div>
                <div>3. "+ 학생 노드" 로 학생 시작/끝 추가</div>
                <div>4. ⊕ 버튼으로 연결</div>
              </div>
            )}
          </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── 평가 관리 탭 ──────────────────────────────────────────────────────────────
function AssessmentsTab() {
  const SUBJECTS = ["중1-1","중1-2","중2-1","중2-2","중3-1","중3-2","공통수학1","공통수학2","대수","미적분1","기하","미적분","확률과통계"];
  const [step, setStep] = React.useState("select");
  const [testName, setTestName] = React.useState("");
  const [dbEditId, setDbEditId] = React.useState(null);
  const [tree, setTree] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [assessments, setAssessments] = React.useState([]);

  React.useEffect(() => {
    const ref = db.ref("assessments");
    ref.on("value", snap => {
      const data = snap.val();
      setAssessments(data ? Object.values(data).sort((a,b) => (b.createdAt||"").localeCompare(a.createdAt||"")) : []);
    });
    return () => ref.off();
  }, []);

  const nid = () => genId();
  const emptyMajor  = () => ({ id: nid(), major: "", subject: "공통수학1", open: true, middles: [] });
  const emptyMiddle = () => ({ id: nid(), middle: "", open: true, minors: [] });
  const emptyMinor  = () => ({ id: nid(), num: "", minor: "" });

  const updMajor  = (mId, u)            => setTree(t => t.map(m => m.id===mId ? {...m,...u} : m));
  const delMajor  = (mId)               => setTree(t => t.filter(m => m.id!==mId));
  const addMiddle = (mId)               => setTree(t => t.map(m => m.id===mId ? {...m, middles:[...m.middles, emptyMiddle()]} : m));
  const updMiddle = (mId,midId,u)       => setTree(t => t.map(m => m.id===mId ? {...m, middles:m.middles.map(d => d.id===midId ? {...d,...u} : d)} : m));
  const delMiddle = (mId,midId)         => setTree(t => t.map(m => m.id===mId ? {...m, middles:m.middles.filter(d => d.id!==midId)} : m));
  const addMinor  = (mId,midId)         => setTree(t => t.map(m => m.id===mId ? {...m, middles:m.middles.map(d => d.id===midId ? {...d, minors:[...d.minors, emptyMinor()]} : d)} : m));
  const updMinor  = (mId,midId,minId,u) => setTree(t => t.map(m => m.id===mId ? {...m, middles:m.middles.map(d => d.id===midId ? {...d, minors:d.minors.map(n => n.id===minId ? {...n,...u} : n)} : d)} : m));
  const delMinor  = (mId,midId,minId)   => setTree(t => t.map(m => m.id===mId ? {...m, middles:m.middles.map(d => d.id===midId ? {...d, minors:d.minors.filter(n => n.id!==minId)} : d)} : m));

  const startCreate = () => { setStep("daily_test"); setDbEditId(null); setTestName(""); setTree([emptyMajor()]); };
  const startEditAssessment = (a) => { setStep("daily_test"); setDbEditId(a.id); setTestName(a.name); setTree(a.tree || []); };

  const handleSave = async () => {
    if (!testName.trim()) { alert("테스트 제목을 입력해 주세요."); return; }
    setSaving(true);
    const data = { type: "일일테스트", name: testName.trim(), createdAt: todayString(), tree };
    try {
      if (dbEditId) { await db.ref(`assessments/${dbEditId}`).update(data); }
      else { const id = Date.now().toString(); await db.ref(`assessments/${id}`).set({ id, ...data }); }
      setStep("select");
    } catch(e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  if (step === "daily_test") {
    const INP = "border-0 border-b border-slate-200 px-1 py-0.5 text-sm bg-transparent outline-none focus:border-blue-400 min-w-0 flex-1";
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>setStep("select")} className="text-sm text-slate-500 hover:text-slate-800">← 뒤로</button>
          <h2 className="text-lg font-bold">일일테스트 만들기</h2>
        </div>
        <Card className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Lbl>테스트 제목</Lbl>
            <Inp value={testName} onChange={e=>setTestName(e.target.value)} placeholder="예: 3월 1주차 일일테스트"/>
          </div>

          <div className="space-y-2">
            {tree.map(major => (
              <div key={major.id} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-2">
                  <button type="button" onClick={()=>updMajor(major.id,{open:!major.open})} className="text-slate-400 text-xs w-3 shrink-0">{major.open?"▼":"▶"}</button>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0 tracking-wide">대단원</span>
                  <input className={INP + " font-semibold"} value={major.major} onChange={e=>updMajor(major.id,{major:e.target.value})} placeholder="대단원명"/>
                  <select value={major.subject} onChange={e=>updMajor(major.id,{subject:e.target.value})}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white outline-none shrink-0 focus:ring-1 focus:ring-blue-300">
                    {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  <button type="button" onClick={()=>delMajor(major.id)} className="text-slate-300 hover:text-red-400 ml-1 shrink-0 text-lg leading-none">×</button>
                </div>
                {major.open && (
                  <div className="px-3 py-2 space-y-1.5">
                    {major.middles.map(middle => (
                      <div key={middle.id} className="rounded-lg border border-slate-100 overflow-hidden">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5">
                          <button type="button" onClick={()=>updMiddle(major.id,middle.id,{open:!middle.open})} className="text-slate-300 text-xs w-3 shrink-0">{middle.open?"▼":"▶"}</button>
                          <span className="text-[10px] text-slate-400 shrink-0">중단원</span>
                          <input className={INP} value={middle.middle} onChange={e=>updMiddle(major.id,middle.id,{middle:e.target.value})} placeholder="중단원명"/>
                          <button type="button" onClick={()=>delMiddle(major.id,middle.id)} className="text-slate-300 hover:text-red-400 ml-1 shrink-0 text-base leading-none">×</button>
                        </div>
                        {middle.open && (
                          <div className="px-4 py-1.5 space-y-0.5">
                            {middle.minors.map(minor => (
                              <div key={minor.id} className="flex items-center gap-2 py-0.5">
                                <span className="text-slate-200 shrink-0">·</span>
                                <span className="text-[10px] text-slate-400 shrink-0">소단원</span>
                                <input className="border-0 border-b border-slate-200 px-1 py-0.5 text-xs bg-transparent outline-none focus:border-blue-400 w-10 shrink-0 text-center" value={minor.num} onChange={e=>updMinor(major.id,middle.id,minor.id,{num:e.target.value})} placeholder="번호"/>
                                <input className={INP + " text-sm"} value={minor.minor} onChange={e=>updMinor(major.id,middle.id,minor.id,{minor:e.target.value})} placeholder="소단원명"/>
                                <button type="button" onClick={()=>delMinor(major.id,middle.id,minor.id)} className="text-slate-200 hover:text-red-400 shrink-0 text-base leading-none">×</button>
                              </div>
                            ))}
                            <button type="button" onClick={()=>addMinor(major.id,middle.id)}
                              className="text-xs text-blue-500 hover:text-blue-700 pl-4 py-0.5">+ 소단원</button>
                          </div>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={()=>addMiddle(major.id)}
                      className="text-xs text-blue-500 hover:text-blue-700 pl-2 py-0.5">+ 중단원</button>
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={()=>setTree(t=>[...t,emptyMajor()])}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-2 rounded-xl border border-dashed border-blue-200 hover:bg-blue-50 transition w-full">
              + 대단원 추가
            </button>
          </div>

          <div className="flex gap-2 justify-end">
            <Btn variant="outline" onClick={()=>setStep("select")}>취소</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving?"저장 중...":(dbEditId?"수정 완료":"저장")}</Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-bold">평가 추가 — 종류 선택</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button type="button" onClick={startCreate}
            className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition space-y-2 group">
            <div className="text-2xl">📋</div>
            <div className="font-semibold text-sm group-hover:text-blue-700">일일테스트</div>
            <div className="text-xs text-slate-400">소단원별 테스트 구성</div>
          </button>
        </div>
      </Card>
      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-bold">등록된 평가 ({assessments.length})</h2>
        {assessments.length === 0
          ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">아직 등록된 평가가 없습니다.</div>
          : <div className="space-y-2">
              {assessments.map(a => (
                <div key={a.id} className="flex items-center gap-3 rounded-2xl border px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{a.name}</span>
                      <Badge variant="secondary">{a.type}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {a.createdAt}{a.tree ? " · " + a.tree.length + "개 대단원" : ""}
                    </div>
                  </div>
                  <Btn variant="outline" size="sm" onClick={()=>startEditAssessment(a)}>수정</Btn>
                  <Btn variant="outline" size="sm" onClick={async()=>{ if(!confirm("삭제?")) return; await db.ref(`assessments/${a.id}`).remove(); }}>삭제</Btn>
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  );
}
// ── 커리큘럼 매니저 (선생님용) ───────────────────────────────────────────────
function CurriculumManager({ students, materials }) {
  const [subTab, setSubTab] = React.useState("editor");
  const [boards, setBoards] = React.useState([]);
  const [activeBoardId, setActiveBoardId] = React.useState(null);
  const [editingBoardId, setEditingBoardId] = React.useState(null);
  const [editingName, setEditingName] = React.useState("");

  React.useEffect(() => {
    const ref = db.ref("curriculumBoards");
    ref.on("value", snap => {
      const data = snap.val();
      const list = data ? Object.values(data).sort((a,b) => a.createdAt - b.createdAt) : [];
      setBoards(list);
      setActiveBoardId(id => id && list.find(b => b.id === id) ? id : (list[0]?.id || null));
    });
    return () => ref.off();
  }, []);

  const addBoard = async () => {
    const id = Date.now().toString();
    await db.ref(`curriculumBoards/${id}`).set({ id, name: `캔버스 ${boards.length + 1}`, createdAt: id });
    setActiveBoardId(id);
  };

  const renameBoard = async (id, name) => {
    if (!name.trim()) return;
    await db.ref(`curriculumBoards/${id}`).update({ name: name.trim() });
    setEditingBoardId(null);
  };

  const deleteBoard = async (id) => {
    if (!confirm("이 캔버스와 모든 노드를 삭제할까요?")) return;
    await db.ref(`curriculumBoards/${id}`).remove();
    await db.ref(`curriculumNodes/${id}`).remove();
    const remaining = boards.filter(b => b.id !== id);
    setActiveBoardId(remaining[0]?.id || null);
  };

  return (
    <div className="space-y-4">
      {/* 메인 탭 */}
      <div className="flex gap-2 bg-white rounded-2xl shadow-sm p-1">
        {[["editor","🗺️ 커리큘럼 편집"],["materials","📚 교재 관리"],["assessments","📝 평가 관리"]].map(([tab,label])=>(
          <button key={tab} onClick={()=>setSubTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition ${subTab===tab?"bg-slate-900 text-white":"text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {subTab === "editor" && (
        <div className="space-y-3">
          {/* 캔버스 탭 목록 */}
          <div className="flex items-center gap-2 flex-wrap">
            {boards.map(board => (
              <div key={board.id} className="flex items-center gap-1">
                {editingBoardId === board.id ? (
                  <form onSubmit={e => { e.preventDefault(); renameBoard(board.id, editingName); }}>
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => renameBoard(board.id, editingName)}
                      className="border rounded-xl px-2 py-1 text-sm w-28 outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </form>
                ) : (
                  <button
                    onClick={() => setActiveBoardId(board.id)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${activeBoardId === board.id ? "bg-slate-900 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"}`}
                  >
                    {board.name}
                  </button>
                )}
                {activeBoardId === board.id && editingBoardId !== board.id && (
                  <button
                    onClick={() => { setEditingBoardId(board.id); setEditingName(board.name); }}
                    className="text-slate-400 hover:text-slate-600 text-sm"
                    title="이름 수정"
                  >✎</button>
                )}
              </div>
            ))}
            <button
              onClick={addBoard}
              className="px-3 py-1.5 rounded-xl text-sm border border-dashed text-slate-400 hover:text-slate-600 hover:border-slate-400 transition"
            >+ 캔버스 추가</button>
            {activeBoardId && boards.length > 0 && (
              <button onClick={() => deleteBoard(activeBoardId)} className="text-xs text-red-400 hover:text-red-600 ml-1">
                삭제
              </button>
            )}
          </div>

          {activeBoardId
            ? <CurriculumVisualEditor key={activeBoardId} boardId={activeBoardId} students={students} materials={materials}/>
            : <div className="rounded-2xl border border-dashed p-10 text-sm text-slate-400 text-center">
                "+ 캔버스 추가" 를 눌러 첫 번째 캔버스를 만드세요.
              </div>
          }
        </div>
      )}
      {subTab === "materials" && <MaterialsTab materials={materials}/>}
      {subTab === "assessments" && <AssessmentsTab/>}
    </div>
  );
}

// ── 학생용 커리큘럼 뷰 ───────────────────────────────────────────────────────
function StudentCurriculumView({ studentId }) {
  const [allNodes, setAllNodes] = React.useState({});

  React.useEffect(() => {
    // 모든 캔버스의 노드를 하나로 합쳐서 경로 탐색
    const ref = db.ref("curriculumNodes");
    ref.on("value", snap => {
      const data = snap.val() || {};
      const merged = {};
      Object.values(data).forEach(boardNodes => Object.assign(merged, boardNodes));
      setAllNodes(merged);
    });
    return () => ref.off();
  }, []);

  const startNodeId = `start_${studentId}`;
  const endNodeId = `end_${studentId}`;

  const getPath = () => {
    if (!allNodes[startNodeId] || !allNodes[endNodeId]) return [];
    const visited = new Set();
    const dfs = (nodeId) => {
      if (visited.has(nodeId)) return null;
      visited.add(nodeId);
      if (nodeId === endNodeId) return [nodeId];
      const node = allNodes[nodeId];
      if (!node) return null;
      for (const nid of (node.nextNodes || [])) {
        const result = dfs(nid);
        if (result !== null) return [nodeId, ...result];
      }
      return null;
    };
    const fullPath = dfs(startNodeId);
    if (!fullPath) return [];
    return fullPath.map(id => allNodes[id]).filter(n => n && n.type === "material");
  };

  const path = getPath();

  if (!allNodes[startNodeId]) return (
    <div className="rounded-2xl border border-dashed p-8 text-sm text-slate-400 text-center">
      아직 커리큘럼이 설정되지 않았습니다.<br/>선생님께 문의하세요.
    </div>
  );

  if (path.length === 0) return (
    <div className="rounded-2xl border border-dashed p-8 text-sm text-slate-400 text-center">
      커리큘럼 경로가 연결되지 않았습니다.<br/>선생님께 문의하세요.
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-600 mb-3">총 {path.length}개 교재</div>
      {path.map((node, idx) => (
        <div key={node.id}>
          <div className="rounded-2xl border px-4 py-3 bg-white flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{node.materialName}</div>
              <div className="text-xs text-slate-500">{node.totalProblems}문제</div>
            </div>
          </div>
          {idx < path.length - 1 && (
            <div className="flex justify-center py-0.5 text-slate-200 text-lg select-none">↓</div>
          )}
        </div>
      ))}
    </div>
  );
}
