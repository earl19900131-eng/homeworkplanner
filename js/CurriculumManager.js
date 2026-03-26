// ── 교재 문제 번호 파싱 ───────────────────────────────────────────────────────
function parseProblemInput(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // 범위: 숫자-숫자 (예: 1-420)
  const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]), end = parseInt(rangeMatch[2]);
    if (start <= end) return { type: "range", start, end, total: end - start + 1 };
  }
  // 목록: 쉼표 또는 줄바꿈으로 구분
  const items = trimmed.split(/[,\n]+/).map(s => s.trim()).filter(s => s.length > 0);
  if (items.length > 0) return { type: "list", items, total: items.length };
  return null;
}

// ── 교재 관리 탭 ─────────────────────────────────────────────────────────────
function MaterialsTab({ materials }) {
  const SUBJECTS = ["중1-1","중1-2","중2-1","중2-2","중3-1","중3-2","공통수학1","공통수학2","대수","미적분1","기하","미적분","확률과통계"];
  const empty = { name: "", subject: "공통수학1", totalProblems: "", minutesPerProblem: "", problemInput: "" };

  const [folders, setFolders] = React.useState([]);
  // folderPath: [{id, name}, ...] — 루트에서 현재 폴더까지의 경로
  const [folderPath, setFolderPath] = React.useState([]);
  const [folderForm, setFolderForm] = React.useState("");
  const [editingFolderId, setEditingFolderId] = React.useState(null);
  const [editingFolderName, setEditingFolderName] = React.useState("");

  const [form, setForm] = React.useState(empty);
  const [editId, setEditId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [subjectFilter, setSubjectFilter] = React.useState("전체");

  // 드래그 앤 드랍
  const [draggingMatId, setDraggingMatId] = React.useState(null);
  const [dragOverTarget, setDragOverTarget] = React.useState(null); // folder id or "__parent__"

  const parsedProblems = React.useMemo(() => parseProblemInput(form.problemInput), [form.problemInput]);

  // 현재 위치
  const activeFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1].id : null;
  const atRoot = folderPath.length === 0;

  React.useEffect(() => {
    const ref = db.ref("materialFolders");
    ref.on("value", snap => {
      const data = snap.val();
      setFolders(data ? Object.values(data).sort((a,b) => (a.createdAt||0) - (b.createdAt||0)) : []);
    });
    return () => ref.off();
  }, []);

  // 현재 위치의 직속 하위 폴더
  const currentSubfolders = folders.filter(f => (f.parentId || null) === activeFolderId);

  // 폴더 CRUD
  const addFolder = async () => {
    if (!folderForm.trim()) return;
    const id = Date.now().toString();
    const data = { id, name: folderForm.trim(), createdAt: id };
    if (activeFolderId) data.parentId = activeFolderId;
    await db.ref(`materialFolders/${id}`).set(data);
    setFolderForm("");
  };

  const saveEditFolder = async () => {
    if (!editingFolderName.trim()) return;
    await db.ref(`materialFolders/${editingFolderId}`).update({ name: editingFolderName.trim() });
    setEditingFolderId(null);
  };

  // 폴더 및 모든 하위 폴더·교재 재귀 삭제
  const deleteFolderRecursive = async (id) => {
    const children = folders.filter(f => f.parentId === id);
    for (const child of children) await deleteFolderRecursive(child.id);
    for (const m of materials.filter(m => m.folderId === id)) await db.ref(`materials/${m.id}`).remove();
    await db.ref(`materialFolders/${id}`).remove();
  };

  const deleteFolder = async (id) => {
    if (!confirm("폴더를 삭제하면 안의 하위 폴더와 교재가 모두 삭제됩니다. 계속하시겠습니까?")) return;
    await deleteFolderRecursive(id);
    // 삭제된 폴더가 현재 경로에 있으면 올라가기
    const idx = folderPath.findIndex(p => p.id === id);
    if (idx !== -1) setFolderPath(folderPath.slice(0, idx));
  };

  const dropMaterial = async (targetFolderId) => {
    if (!draggingMatId) return;
    await db.ref(`materials/${draggingMatId}/folderId`).set(targetFolderId || null);
    setDraggingMatId(null);
    setDragOverTarget(null);
  };

  const openFolder = (folder) => {
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSubjectFilter("전체"); setForm(empty); setEditId(null); setError("");
  };

  const goBack = () => {
    setFolderPath(prev => prev.slice(0, -1));
    setForm(empty); setEditId(null); setError("");
  };

  const navigateTo = (idx) => {
    setFolderPath(prev => prev.slice(0, idx + 1));
    setForm(empty); setEditId(null); setError("");
  };

  // 교재 CRUD
  const handleSave = async () => {
    if (!form.name.trim()) { setError("교재명을 입력해 주세요."); return; }
    const totalFromParsed = parsedProblems?.total;
    const totalFromInput = Number(form.totalProblems);
    if (!totalFromParsed && !totalFromInput) { setError("총 문제 수 또는 문제 번호를 입력해 주세요."); return; }
    setSaving(true); setError("");
    const data = {
      name: form.name.trim(), subject: form.subject || "공통수학1",
      totalProblems: totalFromParsed ?? totalFromInput,
      minutesPerProblem: Number(form.minutesPerProblem) || 0,
      folderId: activeFolderId,
    };
    if (parsedProblems) {
      if (parsedProblems.type === "range") {
        data.problemType = "range"; data.problemStart = parsedProblems.start; data.problemEnd = parsedProblems.end; data.problems = null;
      } else {
        data.problemType = "list"; data.problems = parsedProblems.items; data.problemStart = null; data.problemEnd = null;
      }
    }
    try {
      if (editId) { await db.ref(`materials/${editId}`).update(data); }
      else { const id = Date.now().toString(); await db.ref(`materials/${id}`).set({ id, ...data }); }
      setForm(empty); setEditId(null);
    } catch(e) { setError("저장 실패: " + e.message); }
    setSaving(false);
  };

  const handleEdit = (mat) => {
    let problemInput = "";
    if (mat.problemType === "range") problemInput = `${mat.problemStart}-${mat.problemEnd}`;
    else if (mat.problemType === "list" && mat.problems) problemInput = mat.problems.join(", ");
    setForm({ name: mat.name, subject: mat.subject, totalProblems: mat.totalProblems, minutesPerProblem: mat.minutesPerProblem || "", problemInput });
    setEditId(mat.id);
  };

  // ── 폴더 그리드 (루트 or 하위 폴더 공통) ────────────────────────────────────
  const renderFolderGrid = (folderList) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {folderList.map(folder => {
        const directMats = materials.filter(m => m.folderId === folder.id).length;
        const subCount = folders.filter(f => f.parentId === folder.id).length;
        const isDragOver = draggingMatId && dragOverTarget === folder.id;
        return (
          <div key={folder.id} className="group relative"
            onDragOver={draggingMatId ? (e => { e.preventDefault(); setDragOverTarget(folder.id); }) : undefined}
            onDragLeave={draggingMatId ? (() => setDragOverTarget(null)) : undefined}
            onDrop={draggingMatId ? (e => { e.preventDefault(); dropMaterial(folder.id); }) : undefined}>
            {editingFolderId === folder.id ? (
              <div className="w-full aspect-square rounded-2xl border-2 border-blue-200 bg-blue-50 flex flex-col items-center justify-center gap-2 p-3">
                <span className="text-3xl leading-none">📁</span>
                <input autoFocus value={editingFolderName} onChange={e=>setEditingFolderName(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter") saveEditFolder(); if(e.key==="Escape") setEditingFolderId(null); }}
                  onBlur={saveEditFolder}
                  className="w-full text-center text-xs border-b border-blue-400 bg-transparent outline-none"/>
              </div>
            ) : (
              <button type="button" onClick={() => !draggingMatId && openFolder(folder)}
                className={`w-full aspect-square rounded-2xl border-2 transition flex flex-col items-center justify-center gap-2 p-3
                  ${isDragOver ? "border-blue-400 bg-blue-50 scale-105 shadow-lg" : "border-amber-200 bg-amber-50 hover:bg-amber-100"}`}>
                <span className="text-4xl leading-none">{isDragOver ? "📂" : "📁"}</span>
                <span className="text-xs font-semibold text-amber-900 text-center leading-tight line-clamp-2">{folder.name}</span>
                {isDragOver
                  ? <span className="text-[10px] text-blue-500 font-bold">여기에 놓기</span>
                  : <span className="text-[10px] text-amber-600">
                      {directMats > 0 ? `교재 ${directMats}` : ""}
                      {directMats > 0 && subCount > 0 ? " · " : ""}
                      {subCount > 0 ? `폴더 ${subCount}` : ""}
                      {directMats === 0 && subCount === 0 ? "비어있음" : ""}
                    </span>
                }
              </button>
            )}
            {!draggingMatId && (
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button type="button"
                  onClick={e=>{ e.stopPropagation(); setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}
                  className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300 text-xs leading-none flex items-center justify-center">✎</button>
                <button type="button"
                  onClick={e=>{ e.stopPropagation(); deleteFolder(folder.id); }}
                  className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 text-xs leading-none flex items-center justify-center">×</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── 루트 화면 ─────────────────────────────────────────────────────────────
  if (atRoot) {
    const unclassified = materials.filter(m => !m.folderId);
    const rootFolders = folders.filter(f => !f.parentId);
    return (
      <div className="space-y-5">
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-bold">교재 폴더</h2>
          <div className="flex gap-2">
            <input value={folderForm} onChange={e=>setFolderForm(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addFolder()}
              placeholder="새 폴더명 입력 (예: 공통수학1, 중2 선행)"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
            <Btn onClick={addFolder}>+ 폴더 추가</Btn>
          </div>
          {rootFolders.length === 0 && unclassified.length === 0
            ? <div className="rounded-2xl border border-dashed p-8 text-sm text-slate-400 text-center">폴더를 추가해 주세요.</div>
            : renderFolderGrid(rootFolders)
          }
          {unclassified.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-400">미분류 교재 ({unclassified.length})</div>
              <div className="grid grid-cols-2 gap-2">
                {unclassified.map(mat => {
                  const est = mat.minutesPerProblem ? Math.round(mat.totalProblems * mat.minutesPerProblem / 60 * 10) / 10 : null;
                  const isDragging = draggingMatId === mat.id;
                  return (
                    <div key={mat.id}
                      draggable
                      onDragStart={() => setDraggingMatId(mat.id)}
                      onDragEnd={() => { setDraggingMatId(null); setDragOverTarget(null); }}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 bg-slate-50 cursor-grab active:cursor-grabbing transition ${isDragging ? "opacity-40" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{mat.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{mat.subject} · {mat.totalProblems}문제{est !== null ? ` · 예상 ${est}h` : ""}</div>
                      </div>
                      {rootFolders.length > 0 && (
                        <select defaultValue="" onChange={async e => {
                          if (!e.target.value) return;
                          await db.ref(`materials/${mat.id}/folderId`).set(e.target.value);
                        }} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white outline-none">
                          <option value="">폴더로 이동</option>
                          {rootFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      )}
                      <Btn variant="outline" size="sm" onClick={async()=>{ if(!confirm("삭제?")) return; await db.ref(`materials/${mat.id}`).remove(); }}>삭제</Btn>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ── 폴더 내부 화면 ─────────────────────────────────────────────────────────
  const folderMaterials = materials.filter(m => m.folderId === activeFolderId);
  const usedSubjects = [...new Set(folderMaterials.map(m => m.subject).filter(Boolean))].sort((a,b) => SUBJECTS.indexOf(a) - SUBJECTS.indexOf(b));
  const filtered = subjectFilter === "전체" ? folderMaterials : folderMaterials.filter(m => m.subject === subjectFilter);

  return (
    <div className="space-y-5">
      {/* 브레드크럼 헤더 */}
      <div className="flex items-center gap-1.5 flex-wrap text-sm">
        <button onClick={() => setFolderPath([])}
          onDragOver={draggingMatId ? (e=>{ e.preventDefault(); setDragOverTarget("__root__"); }) : undefined}
          onDragLeave={draggingMatId ? (()=>setDragOverTarget(null)) : undefined}
          onDrop={draggingMatId ? (e=>{ e.preventDefault(); dropMaterial(null); }) : undefined}
          className={`transition rounded-lg px-1.5 py-0.5 ${dragOverTarget==="__root__" ? "bg-blue-100 text-blue-600 font-bold" : "text-slate-400 hover:text-slate-700"}`}>
          교재 폴더
        </button>
        {folderPath.map((p, i) => (
          <React.Fragment key={p.id}>
            <span className="text-slate-300">/</span>
            {i < folderPath.length - 1
              ? <button onClick={() => navigateTo(i)}
                  onDragOver={draggingMatId ? (e=>{ e.preventDefault(); setDragOverTarget("__bc__"+p.id); }) : undefined}
                  onDragLeave={draggingMatId ? (()=>setDragOverTarget(null)) : undefined}
                  onDrop={draggingMatId ? (e=>{ e.preventDefault(); dropMaterial(p.id); }) : undefined}
                  className={`transition rounded-lg px-1.5 py-0.5 ${dragOverTarget==="__bc__"+p.id ? "bg-blue-100 text-blue-600 font-bold" : "text-slate-400 hover:text-slate-700"}`}>
                  {p.name}
                </button>
              : <span className="font-semibold text-slate-800">📁 {p.name}</span>
            }
          </React.Fragment>
        ))}
        <button onClick={goBack} className="ml-2 text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition">← 뒤로</button>
        {draggingMatId && (
          <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg animate-pulse">📦 폴더나 경로에 드랍하세요</span>
        )}
      </div>

      {/* 하위 폴더 */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-bold">하위 폴더</h2>
        </div>
        <div className="flex gap-2">
          <input value={folderForm} onChange={e=>setFolderForm(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addFolder()}
            placeholder="새 하위 폴더명 입력"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
          <Btn onClick={addFolder}>+ 추가</Btn>
        </div>
        {currentSubfolders.length === 0
          ? <div className="rounded-2xl border border-dashed p-4 text-sm text-slate-400 text-center">하위 폴더 없음</div>
          : renderFolderGrid(currentSubfolders)
        }
      </Card>

      {/* 교재 등록/수정 폼 */}
      <Card className="p-5 space-y-4">
        <h2 className="text-base font-bold">{editId ? "교재 수정" : "교재 추가"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Lbl>교재명</Lbl>
            <Inp value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="예: 매쓰플랫 공수1 기본개념서"/>
          </div>
          <div className="space-y-1.5"><Lbl>과목</Lbl>
            <select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}
              className="w-full rounded-xl border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
              {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Lbl>문제 번호 입력 <span className="text-slate-400 font-normal">(선택 — 직접 입력 시 총 문제 수 자동 계산)</span></Lbl>
            <textarea value={form.problemInput} onChange={e=>setForm({...form,problemInput:e.target.value})}
              placeholder={"범위: 1-420\n목록: 개념익히기1, 1-1, 1-2, 개념익히기2, 2-1, 2-2"}
              rows={3} className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition resize-none font-mono"/>
            {parsedProblems && (
              <div className="text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-1.5">
                {parsedProblems.type === "range"
                  ? `✓ 범위 인식: ${parsedProblems.start}번 ~ ${parsedProblems.end}번 · 총 ${parsedProblems.total}문제`
                  : `✓ 목록 인식: 총 ${parsedProblems.total}문제 (${parsedProblems.items.slice(0,5).join(", ")}${parsedProblems.total > 5 ? ` 외 ${parsedProblems.total - 5}개` : ""})`}
              </div>
            )}
            {form.problemInput.trim() && !parsedProblems && (
              <div className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-1.5">인식 실패 — 형식을 확인해 주세요.</div>
            )}
          </div>
          <div className="space-y-1.5">
            <Lbl>총 문제 수 <span className="text-slate-400 font-normal">{parsedProblems ? "(자동)" : ""}</span></Lbl>
            <Inp type="number" value={parsedProblems ? parsedProblems.total : form.totalProblems}
              onChange={e=>setForm({...form,totalProblems:e.target.value})}
              placeholder="300" className={parsedProblems ? "opacity-50 pointer-events-none" : ""}/>
          </div>
          <div className="space-y-1.5"><Lbl>문제당 예상 시간 (분)</Lbl><Inp type="number" value={form.minutesPerProblem} onChange={e=>setForm({...form,minutesPerProblem:e.target.value})} placeholder="5"/></div>
        </div>
        {error && <AlertBox className="bg-red-50 text-red-700">{error}</AlertBox>}
        <div className="flex gap-2">
          <Btn onClick={handleSave} disabled={saving}>{saving?"저장 중...":(editId?"수정 완료":"교재 추가")}</Btn>
          {editId && <Btn variant="outline" onClick={()=>{ setEditId(null); setForm(empty); setError(""); }}>취소</Btn>}
        </div>
      </Card>

      {/* 교재 목록 */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-bold">교재 목록 ({filtered.length}{subjectFilter !== "전체" ? `/${folderMaterials.length}` : ""})</h2>
          {usedSubjects.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {["전체", ...usedSubjects].map(s => (
                <button key={s} onClick={() => setSubjectFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${subjectFilter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        {filtered.length === 0
          ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">아직 등록된 교재가 없습니다.</div>
          : <div className="grid grid-cols-2 gap-2">
              {filtered.map(mat => {
                const est = mat.minutesPerProblem ? Math.round(mat.totalProblems * mat.minutesPerProblem / 60 * 10) / 10 : null;
                const isDragging = draggingMatId === mat.id;
                return (
                  <div key={mat.id}
                    draggable
                    onDragStart={() => setDraggingMatId(mat.id)}
                    onDragEnd={() => { setDraggingMatId(null); setDragOverTarget(null); }}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-grab active:cursor-grabbing transition
                      ${isDragging ? "opacity-40 border-blue-300 bg-blue-50" : "hover:border-slate-300"}`}>
                    <div className="text-slate-300 shrink-0 select-none">⠿</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{mat.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {mat.subject} · {mat.totalProblems}문제{mat.minutesPerProblem ? ` · ${mat.minutesPerProblem}분/문제` : ""}
                        {est !== null && ` · 예상 ${est}h`}
                      </div>
                      {mat.problemType === "range" && (
                        <div className="text-xs text-blue-500 mt-0.5">{mat.problemStart}번 ~ {mat.problemEnd}번</div>
                      )}
                      {mat.problemType === "list" && mat.problems && (
                        <div className="text-xs text-blue-500 mt-0.5 truncate">
                          {mat.problems.slice(0,4).join(", ")}{mat.problems.length > 4 ? ` 외 ${mat.problems.length - 4}개` : ""}
                        </div>
                      )}
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
  if (node.type === "material")   return { border: "#cbd5e1", bg: "#fff",     headerBg: "#f1f5f9", headerText: "#475569", title: "📚 교재" };
  if (node.type === "assessment") return { border: "#c4b5fd", bg: "#faf5ff", headerBg: "#ede9fe", headerText: "#5b21b6", title: "📝 평가" };
  if (node.type === "start")      return { border: "#f9a8d4", bg: "#fdf2f8", headerBg: "#fbcfe8", headerText: "#9d174d", title: "▶ START" };
  /* end */                       return { border: "#86efac", bg: "#f0fdf4", headerBg: "#bbf7d0", headerText: "#166534", title: "■ END" };
}

function CurriculumVisualEditor({ boardId, students, materials, assessments = [] }) {
  const [nodes, setNodes] = React.useState({});
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const [connectingFrom, setConnectingFrom] = React.useState(null);
  const [dragging, setDragging] = React.useState(null); // { offsets: {nodeId: {ox,oy}} }
  const [boxSelect, setBoxSelect] = React.useState(null); // { x1,y1,x2,y2 } canvas coords
  const [localPos, setLocalPos] = React.useState({});
  const [showAddStudent, setShowAddStudent] = React.useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = React.useState([]);
  const [studentGradeFilter, setStudentGradeFilter] = React.useState("전체");
  const [zoom, setZoom] = React.useState(1);
  const [studentPaths, setStudentPaths] = React.useState({});
  const [activePathStudentId, setActivePathStudentId] = React.useState(null);
  const [pathEditMode, setPathEditMode] = React.useState(false);
  const [hoveredEdge, setHoveredEdge] = React.useState(null); // { fromId, toId }
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

  const addAssessmentNode = async () => {
    if (assessments.length === 0) return;
    const id = Date.now().toString();
    const a = assessments[0];
    const existing = nodeList.filter(n => n.type === "assessment");
    await db.ref(`${nodesRef}/${id}`).set({
      id, type: "assessment",
      assessmentId: a.id, assessmentName: a.name, assessmentType: a.type || "일일테스트",
      nextNodes: [],
      x: 120 + (existing.length % 4) * 160,
      y: 300 + Math.floor(existing.length / 4) * 140,
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
    if (clickedNode?.type === "start") {
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
        <Btn variant="outline" onClick={addAssessmentNode} disabled={assessments.length === 0}>+ 평가 노드</Btn>
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
                : selectedNode.type === "assessment" ? "평가 노드"
                : selectedNode.type === "start" || selectedNode.type === "end" ? `${selectedNode.studentName} · ${selectedNode.type === "end" ? "끝(구)" : "시작"}`
                : selectedNode.studentName}
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
            {selectedNode.type === "assessment" && (
              <>
                <div className="h-4 w-px bg-slate-200 shrink-0"/>
                <span className="text-xs text-slate-400 shrink-0">평가</span>
                <select value={selectedNode.assessmentId}
                  onChange={async e => {
                    const a = assessments.find(a => a.id === e.target.value);
                    if (a) await db.ref(`${nodesRef}/${selectedId}`).update({
                      assessmentId: a.id, assessmentName: a.name, assessmentType: a.type || "일일테스트"
                    });
                  }}
                  className="rounded-lg border px-2 py-1 text-sm bg-white shrink-0 max-w-[180px] truncate">
                  {assessments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </>
            )}
            {(selectedNode.type === "start") && (
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
                        {n.materialName || n.assessmentName || n.studentName}
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
      {showAddStudent && (() => {
        const grades = ["전체", ...[...new Set(students.map(s => s.className).filter(Boolean))].sort((a,b) => a.localeCompare(b))];
        const visibleStudents = studentGradeFilter === "전체" ? students : students.filter(s => s.className === studentGradeFilter);
        return (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-slate-600 shrink-0">학생 추가</span>
            <div className="flex gap-1 flex-wrap">
              {grades.map(g => (
                <button key={g} onClick={() => setStudentGradeFilter(g)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${studentGradeFilter === g ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {visibleStudents.map(s => {
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
            <Btn size="sm" variant="outline" onClick={()=>{ setShowAddStudent(false); setSelectedStudentIds([]); setStudentGradeFilter("전체"); }}>취소</Btn>
            <button onClick={() => setSelectedStudentIds(visibleStudents.filter(s=>!nodes[`start_${s.id}`]).map(s=>s.id))}
              className="text-xs text-slate-400 hover:text-slate-600 hover:underline ml-1">전체 선택</button>
          </div>
        </Card>
        );
      })()}

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
                  const isHovered = hoveredEdge?.fromId === node.id && hoveredEdge?.toId === tid;
                  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                  return (
                    <g key={`edge-${node.id}-${tid}`}>
                      <path d={d}
                        stroke={isHovered ? "#ef4444" : inPath ? "#334155" : "#cbd5e1"}
                        strokeWidth={inPath ? 3 : 1.5} fill="none"
                        markerEnd={inPath ? "url(#arr-active)" : "url(#arr)"}
                        style={{ pointerEvents: "none" }}/>
                      {/* 히트 영역 */}
                      <path d={d} stroke="transparent" strokeWidth="16" fill="none"
                        style={{ pointerEvents: "stroke", cursor: "pointer" }}
                        onMouseEnter={() => !pathEditMode && setHoveredEdge({ fromId: node.id, toId: tid })}
                        onMouseLeave={() => setHoveredEdge(null)}
                        onClick={e => { if (pathEditMode) { e.stopPropagation(); toggleEdge(node.id, tid); } }}/>
                      {/* × 삭제 버튼 */}
                      {isHovered && !pathEditMode && (
                        <g transform={`translate(${mx},${my})`}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={() => setHoveredEdge({ fromId: node.id, toId: tid })}
                          onMouseLeave={() => setHoveredEdge(null)}
                          onClick={e => { e.stopPropagation(); removeConnection(node.id, tid); setHoveredEdge(null); }}>
                          <circle r="9" fill="white" stroke="#ef4444" strokeWidth="1.5"/>
                          <text x="0" y="4" textAnchor="middle" fontSize="11" fill="#ef4444" fontWeight="bold" style={{ userSelect: "none" }}>×</text>
                        </g>
                      )}
                    </g>
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
                  {/* 왼쪽 포트 (학생 노드는 숨김) */}
                  {node.type !== "start"
                    ? <button data-port="left"
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
                        onClick={e => handlePortClick(e, node.id)}
                        style={portStyle(isConnSrc)}>⊕</button>
                    : <div style={{width: PORT_SIZE}}/>
                  }

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
                      ) : node.type === "assessment" ? (
                        <>
                          <div style={{ fontSize: 9, fontWeight: 600, lineHeight: 1.2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {node.assessmentName}
                          </div>
                          <div style={{ fontSize: 8, color: "#a78bfa", marginTop: 1 }}>{node.assessmentType || "일일테스트"}</div>
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
function AssessmentsTab({ students = [] }) {
  const SUBJECTS = ["중1-1","중1-2","중2-1","중2-2","중3-1","중3-2","공통수학1","공통수학2","대수","미적분1","기하","미적분","확률과통계"];
  const [step, setStep] = React.useState("select");
  const [testName, setTestName] = React.useState("");
  const [dbEditId, setDbEditId] = React.useState(null);
  const [tree, setTree] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [assessments, setAssessments] = React.useState([]);
  const [focusTarget, setFocusTarget] = React.useState(null);
  const [generalName, setGeneralName] = React.useState("");
  const [generalSubject, setGeneralSubject] = React.useState("공통수학1");
  const [generalTotal, setGeneralTotal] = React.useState("");
  const [mockName, setMockName] = React.useState("");
  const [mockRound, setMockRound] = React.useState(1);
  const [mockQCount, setMockQCount] = React.useState(20);
  const [mockTotalScore, setMockTotalScore] = React.useState(100);
  const [mockStudentIds, setMockStudentIds] = React.useState([]);
  const [mockExams, setMockExams] = React.useState([]);
  const [mockGradeFilter, setMockGradeFilter] = React.useState("전체");
  const [mockScoringType, setMockScoringType] = React.useState("auto"); // "none"|"auto"|"manual"
  const [mockScoring, setMockScoring] = React.useState({});  // {1:4, 2:4, ...} for manual
  const [mockResultExam, setMockResultExam] = React.useState(null);
  const [mockResults, setMockResults] = React.useState({});
  const [scoreInputs, setScoreInputs] = React.useState({});
  const [mockFolders, setMockFolders] = React.useState([]);
  const [activeFolderId, setActiveFolderId] = React.useState(null);
  const [folderForm, setFolderForm] = React.useState("");
  const [editingFolderId, setEditingFolderId] = React.useState(null);
  const [editingFolderName, setEditingFolderName] = React.useState("");

  React.useEffect(() => {
    const ref = db.ref("assessments");
    ref.on("value", snap => {
      const data = snap.val();
      setAssessments(data ? Object.values(data).sort((a,b) => (b.createdAt||"").localeCompare(a.createdAt||"")) : []);
    });
    return () => ref.off();
  }, []);

  React.useEffect(() => {
    const ref = db.ref("mockExams");
    ref.on("value", snap => {
      const data = snap.val();
      setMockExams(data ? Object.values(data).sort((a,b) => a.round - b.round) : []);
    });
    return () => ref.off();
  }, []);

  React.useEffect(() => {
    const ref = db.ref("mockExamFolders");
    ref.on("value", snap => {
      const data = snap.val();
      setMockFolders(data ? Object.values(data).sort((a,b) => a.createdAt - b.createdAt) : []);
    });
    return () => ref.off();
  }, []);

  // 자동 포커스
  React.useEffect(() => {
    if (!focusTarget) return;
    const sel = focusTarget.type === "major"  ? `[data-focus-major="${focusTarget.id}"]`
              : focusTarget.type === "middle" ? `[data-focus-middle="${focusTarget.id}"]`
              :                                 `[data-focus-minor="${focusTarget.id}"]`;
    setTimeout(() => { const el = document.querySelector(sel); el?.focus(); el?.select && el.select(); }, 0);
    setFocusTarget(null);
  }, [focusTarget]);

  const nid = () => genId();
  const emptyMajor  = () => ({ id: nid(), major: "", subject: "공통수학1", open: true, middles: [] });
  const emptyMiddle = () => ({ id: nid(), middle: "", open: true, minors: [] });
  const emptyMinor  = () => ({ id: nid(), minor: "" });

  const updMajor  = (mId, u)            => setTree(t => t.map(m => m.id===mId ? {...m,...u} : m));
  const delMajor  = (mId)               => setTree(t => t.filter(m => m.id!==mId));
  const updMiddle = (mId,midId,u)       => setTree(t => t.map(m => m.id===mId ? {...m, middles:m.middles.map(d => d.id===midId ? {...d,...u} : d)} : m));
  const delMiddle = (mId,midId)         => setTree(t => t.map(m => m.id===mId ? {...m, middles:m.middles.filter(d => d.id!==midId)} : m));
  const updMinor  = (mId,midId,minId,u) => setTree(t => t.map(m => m.id===mId ? {...m, middles:m.middles.map(d => d.id===midId ? {...d, minors:d.minors.map(n => n.id===minId ? {...n,...u} : n)} : d)} : m));
  const delMinor  = (mId,midId,minId)   => setTree(t => t.map(m => m.id===mId ? {...m, middles:m.middles.map(d => d.id===midId ? {...d, minors:d.minors.filter(n => n.id!==minId)} : d)} : m));

  // 키보드: 대단원
  const onMajorKey = (e, majorId) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nm = emptyMajor();
      setTree(t => { const i = t.findIndex(m => m.id===majorId); const a=[...t]; a.splice(i+1,0,nm); return a; });
      setFocusTarget({ type:"major", id: nm.id });
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const nd = emptyMiddle();
      setTree(t => t.map(m => m.id===majorId ? {...m, open:true, middles:[...m.middles, nd]} : m));
      setFocusTarget({ type:"middle", id: nd.id });
    }
  };

  // 키보드: 중단원
  const onMiddleKey = (e, majorId, middleId) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nd = emptyMiddle();
      setTree(t => t.map(m => m.id===majorId ? { ...m, middles: (() => { const i=m.middles.findIndex(d=>d.id===middleId); const a=[...m.middles]; a.splice(i+1,0,nd); return a; })() } : m));
      setFocusTarget({ type:"middle", id: nd.id });
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const nn = emptyMinor();
      setTree(t => t.map(m => m.id===majorId ? {...m, middles:m.middles.map(d => d.id===middleId ? {...d, open:true, minors:[...d.minors, nn]} : d)} : m));
      setFocusTarget({ type:"minor", id: nn.id });
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      setFocusTarget({ type:"major", id: majorId });
    }
  };

  // 키보드: 소단원
  const onMinorKey = (e, majorId, middleId, minorId) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nn = emptyMinor();
      setTree(t => t.map(m => m.id===majorId ? { ...m, middles:m.middles.map(d => d.id===middleId ? { ...d, minors: (() => { const i=d.minors.findIndex(n=>n.id===minorId); const a=[...d.minors]; a.splice(i+1,0,nn); return a; })() } : d) } : m));
      setFocusTarget({ type:"minor", id: nn.id });
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      setFocusTarget({ type:"middle", id: middleId });
    }
  };

  const startCreate = () => {
    const nm = emptyMajor();
    setStep("daily_test"); setDbEditId(null); setTestName(""); setTree([nm]);
    setFocusTarget({ type:"major", id: nm.id });
  };
  const startCreateGeneral = () => {
    setStep("general_test"); setDbEditId(null); setGeneralName(""); setGeneralSubject("공통수학1"); setGeneralTotal("");
  };
  const startEditAssessment = (a) => {
    if (a.type === "누적테스트") {
      setStep("general_test"); setDbEditId(a.id); setGeneralName(a.name); setGeneralSubject(a.subject || "공통수학1"); setGeneralTotal(a.totalProblems || "");
    } else {
      setStep("daily_test"); setDbEditId(a.id); setTestName(a.name); setTree(a.tree || []);
    }
  };
  const addFolder = async () => {
    if (!folderForm.trim()) return;
    const id = Date.now().toString();
    await db.ref(`mockExamFolders/${id}`).set({ id, name: folderForm.trim(), createdAt: id });
    setFolderForm("");
  };
  const saveEditFolder = async () => {
    if (!editingFolderName.trim()) return;
    await db.ref(`mockExamFolders/${editingFolderId}`).update({ name: editingFolderName.trim() });
    setEditingFolderId(null);
  };
  const deleteFolder = async (id) => {
    if (!confirm("폴더를 삭제하면 안에 있는 시험도 모두 삭제됩니다. 계속하시겠습니까?")) return;
    for (const e of mockExams.filter(e => e.folderId === id)) await db.ref(`mockExams/${e.id}`).remove();
    await db.ref(`mockExamFolders/${id}`).remove();
  };
  const openFolder = (folder) => { setActiveFolderId(folder.id); setStep("folder_view"); };

  const startCreateMock = () => {
    setStep("mock_exam"); setDbEditId(null); setMockName(""); setMockRound(1); setMockQCount(20); setMockTotalScore(100); setMockStudentIds([]); setMockScoringType("auto"); setMockScoring({});
  };
  const startEditMock = (e) => {
    setStep("mock_exam"); setDbEditId(e.id); setMockName(e.name); setMockRound(e.round||1); setMockQCount(e.questionCount||20); setMockTotalScore(e.totalScore||100); setMockStudentIds(e.students||[]); setMockScoringType(e.scoringType||"auto"); setMockScoring(e.scoring||{});
  };
  const handleSaveMock = async () => {
    if (!mockName.trim()) { alert("시험 이름을 입력해 주세요."); return; }
    setSaving(true);
    const data = { type: "내신모의평가", name: mockName.trim(), round: Number(mockRound), questionCount: Number(mockQCount), students: mockStudentIds, createdAt: todayString(), scoringType: mockScoringType, folderId: activeFolderId };
    if (mockScoringType === "auto") data.totalScore = Number(mockTotalScore);
    if (mockScoringType === "manual") {
      const scoring = {};
      for (let i = 1; i <= Number(mockQCount); i++) scoring[i] = Number(mockScoring[i]) || 0;
      data.scoring = scoring;
      data.totalScore = Math.round(Object.values(scoring).reduce((a,b)=>a+b, 0) * 100) / 100;
    }
    try {
      if (dbEditId) { await db.ref(`mockExams/${dbEditId}`).update(data); }
      else { const id = Date.now().toString(); await db.ref(`mockExams/${id}`).set({ id, ...data }); }
      setStep(activeFolderId ? "folder_view" : "select");
    } catch(e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  const openMockResults = (exam) => {
    setMockResultExam(exam);
    if (exam.folderId) setActiveFolderId(exam.folderId);
    setStep("mock_results");
    const ref = db.ref(`mockExamResults/${exam.id}`);
    ref.once("value", snap => {
      const data = snap.val() || {};
      setMockResults(data);
      const inputs = {};
      (exam.students||[]).forEach(sid => { inputs[sid] = data[sid]?.score ?? ""; });
      setScoreInputs(inputs);
    });
  };

  const saveMockScore = async (sid) => {
    const score = scoreInputs[sid];
    if (score === "" || score === undefined) return;
    await db.ref(`mockExamResults/${mockResultExam.id}/${sid}/score`).set(Number(score));
    setMockResults(r => ({...r, [sid]: {...(r[sid]||{}), score: Number(score)}}));
  };

  const toggleAnswer = async (sid, qNum) => {
    const exam = mockResultExam;
    const cur = (mockResults[sid]?.answers || {})[qNum];
    const next = cur === "O" ? "X" : cur === "X" ? null : "O";
    const newAnswers = { ...(mockResults[sid]?.answers || {}) };
    if (next === null) delete newAnswers[qNum]; else newAnswers[qNum] = next;
    const scoringType = exam.scoringType || "auto";
    let score = null;
    if (scoringType !== "none") {
      const correct = Object.entries(newAnswers).filter(([,v]) => v === "O").map(([q]) => Number(q));
      if (scoringType === "manual" && exam.scoring) {
        score = correct.reduce((sum, q) => sum + (Number(exam.scoring[q]) || 0), 0);
      } else {
        const total = exam.totalScore || 100;
        score = Math.round(correct.length * ((total) / (exam.questionCount || 20)));
      }
    }
    const existing = mockResults[sid] || {};
    const updates = {
      answers: newAnswers,
      submittedAt: existing.submittedAt || new Date().toISOString().slice(0,10),
    };
    if (score !== null) updates.score = score;
    await db.ref(`mockExamResults/${exam.id}/${sid}`).set(updates);
    setMockResults(r => ({...r, [sid]: updates}));
    if (score !== null) setScoreInputs(p => ({...p, [sid]: score}));
  };

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

  const handleSaveGeneral = async () => {
    if (!generalName.trim()) { alert("평가 제목을 입력해 주세요."); return; }
    if (!generalTotal || isNaN(Number(generalTotal)) || Number(generalTotal) <= 0) { alert("전체 문제 수를 입력해 주세요."); return; }
    setSaving(true);
    const data = { type: "누적테스트", name: generalName.trim(), subject: generalSubject, totalProblems: Number(generalTotal), createdAt: todayString() };
    try {
      if (dbEditId) { await db.ref(`assessments/${dbEditId}`).update(data); }
      else { const id = Date.now().toString(); await db.ref(`assessments/${id}`).set({ id, ...data }); }
      setStep("select");
    } catch(e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  if (step === "general_test") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>setStep("select")} className="text-sm text-slate-500 hover:text-slate-800">← 뒤로</button>
          <h2 className="text-lg font-bold">누적테스트 만들기</h2>
        </div>
        <Card className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Lbl>평가 제목</Lbl>
            <Inp value={generalName} onChange={e=>setGeneralName(e.target.value)} placeholder="예: 3월 누적테스트"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Lbl>과목</Lbl>
              <select value={generalSubject} onChange={e=>setGeneralSubject(e.target.value)}
                className="w-full rounded-xl border border-input px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Lbl>전체 문제 수</Lbl>
              <Inp type="number" value={generalTotal} onChange={e=>setGeneralTotal(e.target.value)} placeholder="예: 100"/>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Btn variant="outline" onClick={()=>setStep("select")}>취소</Btn>
            <Btn onClick={handleSaveGeneral} disabled={saving}>{saving?"저장 중...":(dbEditId?"수정 완료":"저장")}</Btn>
          </div>
        </Card>
      </div>
    );
  }

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

          <div className="space-y-1.5 text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
            <span className="font-medium">입력 방법:</span> 제목 입력 후 <kbd className="bg-white border rounded px-1">Enter</kbd> 같은 레벨 추가 · <kbd className="bg-white border rounded px-1">Tab</kbd> 하위 레벨로 · <kbd className="bg-white border rounded px-1">Shift+Tab</kbd> 상위 레벨로
          </div>

          <div className="space-y-2">
            {tree.map((major, mi) => (
              <div key={major.id} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-2">
                  <button type="button" onClick={()=>updMajor(major.id,{open:!major.open})} className="text-slate-400 text-xs w-3 shrink-0">{major.open?"▼":"▶"}</button>
                  <span className="text-[10px] font-bold text-slate-500 shrink-0 w-4">{mi+1}</span>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">대단원</span>
                  <input
                    data-focus-major={major.id}
                    className={INP + " font-semibold"}
                    value={major.major}
                    onChange={e=>updMajor(major.id,{major:e.target.value})}
                    onKeyDown={e=>onMajorKey(e, major.id)}
                    placeholder="대단원명 입력 후 Enter 또는 Tab"/>
                  <select value={major.subject} onChange={e=>updMajor(major.id,{subject:e.target.value})}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white outline-none shrink-0 focus:ring-1 focus:ring-blue-300">
                    {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  <button type="button" onClick={()=>delMajor(major.id)} className="text-slate-300 hover:text-red-400 ml-1 shrink-0 text-lg leading-none">×</button>
                </div>
                {major.open && (
                  <div className="px-3 py-2 space-y-1.5">
                    {major.middles.map((middle, di) => (
                      <div key={middle.id} className="rounded-lg border border-slate-100 overflow-hidden">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5">
                          <button type="button" onClick={()=>updMiddle(major.id,middle.id,{open:!middle.open})} className="text-slate-300 text-xs w-3 shrink-0">{middle.open?"▼":"▶"}</button>
                          <span className="text-[10px] text-slate-500 shrink-0 w-6">{mi+1}-{di+1}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">중단원</span>
                          <input
                            data-focus-middle={middle.id}
                            className={INP}
                            value={middle.middle}
                            onChange={e=>updMiddle(major.id,middle.id,{middle:e.target.value})}
                            onKeyDown={e=>onMiddleKey(e, major.id, middle.id)}
                            placeholder="중단원명 입력 후 Enter 또는 Tab"/>
                          <button type="button" onClick={()=>delMiddle(major.id,middle.id)} className="text-slate-300 hover:text-red-400 ml-1 shrink-0 text-base leading-none">×</button>
                        </div>
                        {middle.open && (
                          <div className="px-4 py-1.5 space-y-0.5">
                            {middle.minors.map((minor, ni) => {
                              const num = `${mi+1}${di+1}${ni+1}`;
                              return (
                                <div key={minor.id} className="flex items-center gap-2 py-0.5">
                                  <span className="text-[10px] font-mono text-slate-400 shrink-0 w-8">{num}</span>
                                  <span className="text-[10px] text-slate-400 shrink-0">소단원</span>
                                  <input
                                    data-focus-minor={minor.id}
                                    className={INP + " text-sm"}
                                    value={minor.minor}
                                    onChange={e=>updMinor(major.id,middle.id,minor.id,{minor:e.target.value})}
                                    onKeyDown={e=>onMinorKey(e, major.id, middle.id, minor.id)}
                                    placeholder="소단원명 입력 후 Enter"/>
                                  <button type="button" onClick={()=>delMinor(major.id,middle.id,minor.id)} className="text-slate-200 hover:text-red-400 shrink-0 text-base leading-none">×</button>
                                </div>
                              );
                            })}
                            <button type="button" onClick={()=>{ const nn=emptyMinor(); updMiddle(major.id,middle.id,{minors:[...middle.minors,nn]}); setFocusTarget({type:"minor",id:nn.id}); }}
                              className="text-xs text-blue-500 hover:text-blue-700 pl-8 py-0.5">+ 소단원</button>
                          </div>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={()=>{ const nd=emptyMiddle(); updMajor(major.id,{middles:[...major.middles,nd]}); setFocusTarget({type:"middle",id:nd.id}); }}
                      className="text-xs text-blue-500 hover:text-blue-700 pl-2 py-0.5">+ 중단원</button>
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={()=>{ const nm=emptyMajor(); setTree(t=>[...t,nm]); setFocusTarget({type:"major",id:nm.id}); }}
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

  if (step === "mock_exam") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>setStep(activeFolderId?"folder_view":"select")} className="text-sm text-slate-500 hover:text-slate-800">← 뒤로</button>
          <h2 className="text-lg font-bold">내신모의평가 {dbEditId?"수정":"등록"}</h2>
        </div>
        <Card className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Lbl>시험 이름</Lbl>
            <Inp value={mockName} onChange={e=>setMockName(e.target.value)} placeholder="예: 2024 3월 모의고사"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Lbl>회차</Lbl>
              <select value={mockRound} onChange={e=>setMockRound(e.target.value)}
                className="w-full rounded-xl border border-input px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                {Array.from({length:12},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}차</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Lbl>문항 수</Lbl>
              <Inp type="number" min="1" max="30" value={mockQCount} onChange={e=>setMockQCount(e.target.value)} placeholder="20"/>
            </div>
          </div>
          <div className="space-y-2">
            <Lbl>배점 방식</Lbl>
            <div className="flex gap-2">
              {[["none","배점 없음"],["auto","자동 배점"],["manual","직접 입력"]].map(([v,l])=>(
                <button key={v} type="button" onClick={()=>setMockScoringType(v)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition ${mockScoringType===v?"bg-slate-700 text-white border-slate-700":"bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                  {l}
                </button>
              ))}
            </div>
            {mockScoringType === "auto" && (
              <div className="space-y-1.5 pt-1">
                <Lbl>총 배점</Lbl>
                <Inp type="number" min="1" value={mockTotalScore} onChange={e=>setMockTotalScore(e.target.value)} placeholder="100"/>
              </div>
            )}
            {mockScoringType === "manual" && (
              <div className="pt-1 space-y-1.5">
                <Lbl>문항별 배점 입력</Lbl>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {Array.from({length: Number(mockQCount)||20}, (_,i)=>i+1).map(q=>(
                    <div key={q} className="space-y-0.5">
                      <div className="text-[10px] text-slate-400 text-center">{q}번</div>
                      <input type="number" min="0" value={mockScoring[q]||""}
                        onChange={e=>setMockScoring(s=>({...s,[q]:e.target.value}))}
                        className="w-full text-center text-sm rounded-lg border border-slate-200 px-1 py-1 focus:outline-none focus:ring-1 focus:ring-slate-300"/>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-400 text-right">
                  합계: {Math.round(Array.from({length:Number(mockQCount)||20},(_,i)=>Number(mockScoring[i+1])||0).reduce((a,b)=>a+b,0)*100)/100}점
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Lbl>배정 학생</Lbl>
            {students.length === 0
              ? <div className="text-sm text-slate-400">학생 데이터 없음</div>
              : (() => {
                  const grades = ["전체", ...Array.from(new Set(students.map(s=>s.className||"미정"))).sort()];
                  const filtered = mockGradeFilter === "전체" ? students : students.filter(s=>(s.className||"미정")===mockGradeFilter);
                  const filteredIds = filtered.map(s=>s.id);
                  const allOn = filteredIds.length > 0 && filteredIds.every(id=>mockStudentIds.includes(id));
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {grades.map(g => (
                          <button key={g} type="button" onClick={()=>setMockGradeFilter(g)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${mockGradeFilter===g?"bg-slate-700 text-white border-slate-700":"bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
                            {g}
                          </button>
                        ))}
                        <button type="button" onClick={()=>setMockStudentIds(ids=>allOn?ids.filter(id=>!filteredIds.includes(id)):[...new Set([...ids,...filteredIds])])}
                          className="ml-auto px-2.5 py-1 rounded-lg text-xs font-medium border bg-white text-slate-500 border-slate-200 hover:border-indigo-300 transition">
                          {allOn?"전체 해제":"전체 선택"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {filtered.map(s => {
                          const on = mockStudentIds.includes(s.id);
                          return (
                            <button key={s.id} type="button"
                              onClick={()=>setMockStudentIds(ids=>on?ids.filter(id=>id!==s.id):[...ids,s.id])}
                              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition ${on?"bg-indigo-500 text-white border-indigo-500":"bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
            }
          </div>
          <div className="flex gap-2 justify-end">
            <Btn variant="outline" onClick={()=>setStep(activeFolderId?"folder_view":"select")}>취소</Btn>
            <Btn onClick={handleSaveMock} disabled={saving}>{saving?"저장 중...":(dbEditId?"수정 완료":"저장")}</Btn>
          </div>
        </Card>
      </div>
    );
  }

  if (step === "mock_results" && mockResultExam) {
    const exam = mockResultExam;
    const assignedStudents = Object.values(exam.students||{}).map(sid => students.find(s=>s.id===sid)).filter(Boolean);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>setStep(exam.folderId ? "folder_view" : "select")} className="text-sm text-slate-500 hover:text-slate-800">← 뒤로</button>
          <h2 className="text-lg font-bold">{exam.name} — {exam.round}차 결과</h2>
        </div>
        <Card className="p-5 space-y-3">
          {assignedStudents.length === 0
            ? <div className="text-sm text-slate-400 text-center py-4">배정된 학생이 없습니다.</div>
            : assignedStudents.map(s => {
                const result = mockResults[s.id];
                const qCount = exam.questionCount || 20;
                return (
                  <div key={s.id} className="rounded-2xl border px-4 py-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-slate-400">{s.className}</span>
                      {result?.submittedAt
                        ? <span className="text-xs bg-emerald-100 text-emerald-600 rounded-lg px-2 py-0.5">제출 {result.submittedAt}</span>
                        : <span className="text-xs bg-slate-100 text-slate-400 rounded-lg px-2 py-0.5">미제출</span>
                      }
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-sm text-slate-500">점수</span>
                        <input type="number" min="0" value={scoreInputs[s.id]??""} onChange={e=>setScoreInputs(p=>({...p,[s.id]:e.target.value}))}
                          onBlur={()=>saveMockScore(s.id)}
                          onKeyDown={e=>e.key==="Enter"&&saveMockScore(s.id)}
                          className="w-16 text-center text-sm rounded-lg border border-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300"/>
                        <span className="text-sm text-slate-400">점</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({length: qCount}, (_,i)=>i+1).map(q => {
                        const ans = (result?.answers || {})[q];
                        return (
                          <button key={q} type="button" onClick={() => toggleAnswer(s.id, q)}
                            title={ans==="O"?"클릭: X로 변경":ans==="X"?"클릭: 지우기":"클릭: O로 표시"}
                            className={`inline-flex flex-col items-center w-7 rounded-md border text-[10px] py-0.5 transition hover:opacity-70 cursor-pointer
                              ${ans==="O"?"bg-emerald-50 border-emerald-300 text-emerald-600":ans==="X"?"bg-red-50 border-red-300 text-red-500":"bg-slate-50 border-slate-200 text-slate-300"}`}>
                            <span className="leading-none text-slate-400">{q}</span>
                            <span className="font-bold leading-none">{ans==="O"?"O":ans==="X"?"X":"·"}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-slate-400">클릭: · → O → X → · 순서로 토글</div>
                  </div>
                );
              })
          }
        </Card>
      </div>
    );
  }

  if (step === "folder_view") {
    const folder = mockFolders.find(f => f.id === activeFolderId);
    const folderExams = mockExams.filter(e => e.folderId === activeFolderId).sort((a,b) => a.round - b.round);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>setStep("select")} className="text-sm text-slate-500 hover:text-slate-800">← 뒤로</button>
          {editingFolderId === activeFolderId
            ? <input autoFocus value={editingFolderName} onChange={e=>setEditingFolderName(e.target.value)}
                onBlur={saveEditFolder} onKeyDown={e=>e.key==="Enter"&&saveEditFolder()}
                className="text-lg font-bold border-b border-slate-400 outline-none bg-transparent"/>
            : <h2 className="text-lg font-bold cursor-pointer hover:text-slate-600" onClick={()=>{ setEditingFolderId(activeFolderId); setEditingFolderName(folder?.name||""); }}>
                📁 {folder?.name}
              </h2>
          }
          <Btn onClick={startCreateMock} className="ml-auto">+ 시험 등록</Btn>
        </div>
        <Card className="p-5 space-y-3">
          {folderExams.length === 0
            ? <div className="rounded-2xl border border-dashed p-8 text-sm text-slate-400 text-center">시험을 등록해 주세요.</div>
            : <div className="space-y-2">
                {folderExams.map(e => (
                  <div key={e.id} className="flex items-center gap-3 rounded-2xl border px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{e.name}</span>
                        <Badge variant="secondary">{e.round}차</Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {e.questionCount}문항 · {e.totalScore ? Math.round(e.totalScore*100)/100 : "-"}점 · 학생 {Object.values(e.students||{}).length}명
                      </div>
                    </div>
                    <Btn variant="outline" size="sm" onClick={()=>openMockResults(e)}>결과</Btn>
                    <Btn variant="outline" size="sm" onClick={()=>startEditMock(e)}>수정</Btn>
                    <Btn variant="outline" size="sm" onClick={async()=>{ if(!confirm("삭제?")) return; await db.ref(`mockExams/${e.id}`).remove(); }}>삭제</Btn>
                  </div>
                ))}
              </div>
          }
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
          <button type="button" onClick={startCreateGeneral}
            className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-green-400 hover:bg-green-50 transition space-y-2 group">
            <div className="text-2xl">📝</div>
            <div className="font-semibold text-sm group-hover:text-green-700">누적테스트</div>
            <div className="text-xs text-slate-400">전체 문제수 기반 추적</div>
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
                      {a.createdAt}
                      {a.type === "누적테스트" ? (a.subject ? " · " + a.subject : "") + (a.totalProblems ? " · " + a.totalProblems + "문제" : "") : ""}
                      {a.type === "일일테스트" && a.tree ? " · " + a.tree.length + "개 대단원" : ""}
                    </div>
                  </div>
                  <Btn variant="outline" size="sm" onClick={()=>startEditAssessment(a)}>수정</Btn>
                  <Btn variant="outline" size="sm" onClick={async()=>{ if(!confirm("삭제?")) return; await db.ref(`assessments/${a.id}`).remove(); }}>삭제</Btn>
                </div>
              ))}
            </div>
        }
      </Card>
      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-bold">내신모의평가 폴더</h2>
        <div className="flex gap-2">
          <input value={folderForm} onChange={e=>setFolderForm(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addFolder()}
            placeholder="새 폴더명 입력"
            className="flex-1 rounded-xl border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
          <Btn onClick={addFolder}>+ 폴더 추가</Btn>
        </div>
        {mockFolders.length === 0
          ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">폴더를 추가해 주세요.</div>
          : <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {mockFolders.map(folder => {
                const examCount = mockExams.filter(e => e.folderId === folder.id).length;
                return (
                  <div key={folder.id} className="group relative">
                    <button type="button" onClick={() => openFolder(folder)}
                      className="w-full aspect-square rounded-2xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition flex flex-col items-center justify-center gap-2 p-3">
                      <span className="text-4xl leading-none">📁</span>
                      <span className="text-xs font-semibold text-amber-900 text-center leading-tight line-clamp-2">{folder.name}</span>
                      <span className="text-[10px] text-amber-600">{examCount}개</span>
                    </button>
                    <button type="button"
                      onClick={e=>{e.stopPropagation(); deleteFolder(folder.id);}}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 text-xs leading-none opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      ×
                    </button>
                  </div>
                );
              })}
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
  const [editorAssessments, setEditorAssessments] = React.useState([]);
  const [dragBoardId, setDragBoardId] = React.useState(null);
  const [dragOverBoardId, setDragOverBoardId] = React.useState(null);

  React.useEffect(() => {
    const ref = db.ref("assessments");
    ref.on("value", snap => {
      const data = snap.val();
      setEditorAssessments(data ? Object.values(data) : []);
    });
    return () => ref.off();
  }, []);

  React.useEffect(() => {
    const ref = db.ref("curriculumBoards");
    ref.on("value", snap => {
      const data = snap.val();
      const list = data ? Object.values(data).sort((a,b) => (a.order ?? Number(a.createdAt)) - (b.order ?? Number(b.createdAt))) : [];
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

  const handleBoardDragStart = (e, boardId) => {
    setDragBoardId(boardId);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleBoardDragOver = (e, boardId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (boardId !== dragBoardId) setDragOverBoardId(boardId);
  };
  const handleBoardDrop = async (e, targetId) => {
    e.preventDefault();
    if (!dragBoardId || dragBoardId === targetId) { setDragBoardId(null); setDragOverBoardId(null); return; }
    const dragIdx = boards.findIndex(b => b.id === dragBoardId);
    const targetIdx = boards.findIndex(b => b.id === targetId);
    const reordered = [...boards];
    const [dragged] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, dragged);
    for (let i = 0; i < reordered.length; i++)
      await db.ref(`curriculumBoards/${reordered[i].id}`).update({ order: i });
    setDragBoardId(null); setDragOverBoardId(null);
  };
  const handleBoardDragEnd = () => { setDragBoardId(null); setDragOverBoardId(null); };

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
              <div key={board.id} className="flex items-center gap-1"
                draggable
                onDragStart={e => handleBoardDragStart(e, board.id)}
                onDragOver={e => handleBoardDragOver(e, board.id)}
                onDrop={e => handleBoardDrop(e, board.id)}
                onDragEnd={handleBoardDragEnd}
                style={{ opacity: dragBoardId === board.id ? 0.4 : 1, cursor: "grab",
                  outline: dragOverBoardId === board.id ? "2px solid #94a3b8" : "none", borderRadius: 12 }}
              >
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
            ? <CurriculumVisualEditor key={activeBoardId} boardId={activeBoardId} students={students} materials={materials} assessments={editorAssessments}/>
            : <div className="rounded-2xl border border-dashed p-10 text-sm text-slate-400 text-center">
                "+ 캔버스 추가" 를 눌러 첫 번째 캔버스를 만드세요.
              </div>
          }
        </div>
      )}
      {subTab === "materials" && <MaterialsTab materials={materials}/>}
      {subTab === "assessments" && <AssessmentsTab students={students}/>}
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

  const getPath = () => {
    if (!allNodes[startNodeId]) return [];
    const visited = new Set();
    const result = [];
    const dfs = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = allNodes[nodeId];
      if (!node) return;
      if (node.type === "material") result.push(node);
      for (const nid of (node.nextNodes || [])) dfs(nid);
    };
    dfs(startNodeId);
    return result;
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
