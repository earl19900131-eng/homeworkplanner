// ── 문제 이미지 관리 ──────────────────────────────────────────────────────────
function ProblemImageManager({ materialId }) {
  const [images, setImages] = React.useState({});
  const [startNum, setStartNum] = React.useState("");
  const [progress, setProgress] = React.useState(null); // { current, total, num }
  const [uploadError, setUploadError] = React.useState("");
  const fileRef = React.useRef();
  // 단건 교체용
  const [replaceNum, setReplaceNum] = React.useState(null);
  const replaceRef = React.useRef();
  const cancelledRef = React.useRef(false);
  const currentTaskRef = React.useRef(null);

  React.useEffect(() => {
    const ref = db.ref(`problemImages/${materialId}`);
    ref.on("value", snap => setImages(snap.val() || {}));
    return () => ref.off();
  }, [materialId]);

  const uploadFile = async (file, num) => {
    const ext = file.name.split(".").pop();
    const ref = storage.ref(`problemImages/${materialId}/${num}.${ext}`);
    const task = ref.put(file);
    currentTaskRef.current = task;
    await task;
    currentTaskRef.current = null;
    const url = await ref.getDownloadURL();
    await db.ref(`problemImages/${materialId}/${num}`).set(url);
  };

  const handleBulkUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const start = parseInt(startNum);
    if (!start || isNaN(start)) { setUploadError("시작 번호를 먼저 입력하세요."); return; }
    setUploadError("");
    cancelledRef.current = false;
    for (let i = 0; i < files.length; i++) {
      if (cancelledRef.current) break;
      const num = start + i;
      setProgress({ current: i + 1, total: files.length, num });
      try { await uploadFile(files[i], num); }
      catch(err) {
        if (cancelledRef.current) break;
        setUploadError(`${num}번 업로드 실패: ${err.message}`); break;
      }
    }
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    if (currentTaskRef.current) currentTaskRef.current.cancel();
    setProgress(null);
    setUploadError("업로드가 취소되었습니다.");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleReplace = async (e) => {
    const file = e.target.files[0];
    if (!file || !replaceNum) return;
    try { await uploadFile(file, replaceNum); }
    catch(err) { setUploadError(`${replaceNum}번 교체 실패: ${err.message}`); }
    setReplaceNum(null);
    if (replaceRef.current) replaceRef.current.value = "";
  };

  const handleDelete = async (num) => {
    if (!confirm(`${num}번 이미지를 삭제할까요?`)) return;
    await db.ref(`problemImages/${materialId}/${num}`).remove();
  };

  const sortedNums = Object.keys(images).sort((a, b) => Number(a) - Number(b));

  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-base font-bold">문제 이미지 관리</h2>
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1.5">
          <Lbl>시작 번호</Lbl>
          <input type="number" value={startNum} onChange={e => setStartNum(e.target.value)}
            placeholder="예: 35"
            className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
        </div>
        <div className="space-y-1.5">
          <Lbl>이미지 파일 (여러 장 선택 가능)</Lbl>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleBulkUpload} disabled={!!progress}
            className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"/>
        </div>
      </div>
      {/* 숨겨진 교체용 파일 input */}
      <input ref={replaceRef} type="file" accept="image/*" onChange={handleReplace} className="hidden"/>
      {progress && (
        <div className="text-sm text-indigo-600 bg-indigo-50 rounded-xl px-4 py-2">
          <div className="flex items-center justify-between">
            <span>업로드 중... {progress.current}/{progress.total} ({progress.num}번)</span>
            <button onClick={handleCancel}
              className="text-xs px-2 py-0.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 font-medium ml-3">
              취소
            </button>
          </div>
          <div className="mt-1 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{width:`${progress.current/progress.total*100}%`}}/>
          </div>
        </div>
      )}
      {uploadError && <div className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{uploadError}</div>}
      {sortedNums.length === 0
        ? <div className="rounded-xl border border-dashed p-4 text-sm text-slate-400 text-center">등록된 이미지가 없습니다.</div>
        : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {sortedNums.map(num => (
              <div key={num} className="rounded-xl border border-slate-200 overflow-hidden">
                <img src={images[num]} alt={`${num}번`} className="w-full object-contain bg-slate-50" style={{maxHeight:"140px"}}/>
                <div className="flex items-center justify-between px-2 py-1.5 bg-white border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700">{num}번</span>
                  <div className="flex gap-1">
                    <button onClick={() => { setReplaceNum(Number(num)); if(replaceRef.current) replaceRef.current.click(); }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">교체</button>
                    <button onClick={() => handleDelete(num)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 hover:bg-red-100">삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
      }
    </Card>
  );
}

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
  const SUBJECTS = ["초5-1","초5-2","초6-1","초6-2","중1-1","중1-2","중2-1","중2-2","중3-1","중3-2","공통수학1","공통수학2","대수","미적분1","기하","미적분","확률과통계"];
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
  const [syncing, setSyncing] = React.useState(false);
  const [syncResult, setSyncResult] = React.useState(null); // { updated, total }

  // 커리큘럼 노드의 totalProblems를 교재 원본과 동기화
  const syncNodes = async () => {
    if (!confirm("모든 커리큘럼 보드의 교재 노드 문제수를 현재 교재 등록 정보 기준으로 동기화할까요?")) return;
    setSyncing(true);
    setSyncResult(null);
    const snap = await db.ref("curriculumNodes").once("value");
    const allBoards = snap.val() || {};
    const matMap = {};
    materials.forEach(m => { matMap[m.id] = m; });
    const updates = {};
    let total = 0, updated = 0;
    Object.entries(allBoards).forEach(([boardId, boardNodes]) => {
      Object.entries(boardNodes || {}).forEach(([nodeId, node]) => {
        if (node.type !== "material" || !node.materialId) return;
        total++;
        const mat = matMap[node.materialId];
        if (!mat) return;
        if (Number(node.totalProblems) !== Number(mat.totalProblems)) {
          updates[`curriculumNodes/${boardId}/${nodeId}/totalProblems`] = mat.totalProblems;
          updated++;
        }
      });
    });
    if (Object.keys(updates).length > 0) await db.ref().update(updates);
    setSyncing(false);
    setSyncResult({ updated, total });
    setTimeout(() => setSyncResult(null), 4000);
  };
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
    <div className="flex flex-wrap gap-2">
      {folderList.map(folder => {
        const directMats = materials.filter(m => m.folderId === folder.id).length;
        const subCount = folders.filter(f => f.parentId === folder.id).length;
        const isDragOver = draggingMatId && dragOverTarget === folder.id;
        const countLabel = directMats > 0 || subCount > 0
          ? [(directMats > 0 ? `교재 ${directMats}` : ""), (subCount > 0 ? `폴더 ${subCount}` : "")].filter(Boolean).join(" · ")
          : "비어있음";
        return (
          <div key={folder.id} className="group relative"
            onDragOver={draggingMatId ? (e => { e.preventDefault(); setDragOverTarget(folder.id); }) : undefined}
            onDragLeave={draggingMatId ? (() => setDragOverTarget(null)) : undefined}
            onDrop={draggingMatId ? (e => { e.preventDefault(); dropMaterial(folder.id); }) : undefined}>
            {editingFolderId === folder.id ? (
              <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-blue-200 bg-blue-50" style={{width:130,height:130}}>
                <span className="text-3xl leading-none">📁</span>
                <input autoFocus value={editingFolderName} onChange={e=>setEditingFolderName(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter") saveEditFolder(); if(e.key==="Escape") setEditingFolderId(null); }}
                  onBlur={saveEditFolder}
                  className="text-xs border-b border-blue-400 bg-transparent outline-none text-center w-24"/>
              </div>
            ) : (
              <button type="button" onClick={() => !draggingMatId && openFolder(folder)}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 transition
                  ${isDragOver ? "border-blue-400 bg-blue-50 shadow" : "border-amber-200 bg-amber-50 hover:bg-amber-100"}`}
                style={{width:130,height:130}}>
                <span className="text-3xl leading-none">{isDragOver ? "📂" : "📁"}</span>
                <span className="text-xs font-semibold text-amber-900 text-center leading-tight line-clamp-2 px-2">{folder.name}</span>
                <span className="text-[10px] text-amber-600">{isDragOver ? "여기에 놓기" : countLabel}</span>
              </button>
            )}
            {!draggingMatId && (
              <div className="absolute -top-1.5 -right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                <button type="button"
                  onClick={e=>{ e.stopPropagation(); setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}
                  className="w-4 h-4 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-blue-500 text-[9px] leading-none flex items-center justify-center">✎</button>
                <button type="button"
                  onClick={e=>{ e.stopPropagation(); deleteFolder(folder.id); }}
                  className="w-4 h-4 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 text-[9px] leading-none flex items-center justify-center">×</button>
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
              placeholder="새 폴더명 입력 (예: 공통수학1, 중2 추가)"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
            <Btn onClick={addFolder}>+ 폴더 추가</Btn>
            <button onClick={syncNodes} disabled={syncing}
              className="px-3 py-1.5 text-sm rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 font-medium whitespace-nowrap">
              {syncing ? "동기화 중..." : "🔄 문제수 동기화"}
            </button>
          </div>
          {syncResult && <div className="text-xs text-emerald-600">{syncResult.updated}개 노드 업데이트됨 (총 {syncResult.total}개)</div>}
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

      {/* 문제 이미지 관리 — 수정 모드일 때만 표시 */}
      {editId && <ProblemImageManager materialId={editId} />}

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
const NODE_H_START = 72;
const NODE_H_END = 72;
const PORT_SIZE = 14;
const getNodeH = (node) => node?.type === "start" ? NODE_H_START : node?.type === "end" ? NODE_H_END : NODE_H;
const PATH_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f59e0b"];

// 노드 스타일
function getNodeStyle(node) {
  if (node.type === "material")   return { border: "#cbd5e1", bg: "#fff",     headerBg: "#f1f5f9", headerText: "#475569", title: "📚 교재" };
  if (node.type === "assessment") return { border: "#c4b5fd", bg: "#faf5ff", headerBg: "#ede9fe", headerText: "#5b21b6", title: "📝 평가" };
  if (node.type === "start")      return { border: "#f9a8d4", bg: "#fdf2f8", headerBg: "#fbcfe8", headerText: "#9d174d", title: "▶ START" };
  if (node.type === "end")        return { border: "#86efac", bg: "#f0fdf4", headerBg: "#bbf7d0", headerText: "#166534", title: "■ END" };
  return { border: "#cbd5e1", bg: "#fff", headerBg: "#f1f5f9", headerText: "#475569", title: "?" };
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
  const [showAddMaterial, setShowAddMaterial] = React.useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = React.useState([]);
  const [materialFolderFilter, setMaterialFolderFilter] = React.useState("전체");
  const [matFolders, setMatFolders] = React.useState({});
  const [zoom, setZoom] = React.useState(1);
  const [studentPaths, setStudentPaths] = React.useState({});
  const [activePathStudentId, setActivePathStudentId] = React.useState(null);
  const [pathEditMode, setPathEditMode] = React.useState(false);
  const [hoveredEdge, setHoveredEdge] = React.useState(null); // { fromId, toId }
  const [spaceDown, setSpaceDown] = React.useState(false);
  const [panning, setPanning] = React.useState(null); // { startX, startY, scrollLeft, scrollTop }
  const [pendingEdge, setPendingEdge] = React.useState(null); // { fromId, toId } — 시작번호 입력 대기
  const [pendingStartNum, setPendingStartNum] = React.useState("1");
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
    const ref = db.ref("materialFolders");
    ref.once("value", snap => {
      const data = snap.val() || {};
      setMatFolders(data);
    });
  }, []);

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

  const selectedIdsRef = React.useRef(selectedIds);
  React.useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
  const connectingFromRef = React.useRef(connectingFrom);
  React.useEffect(() => { connectingFromRef.current = connectingFrom; }, [connectingFrom]);
  const deleteSelectedRef = React.useRef(null);

  React.useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") { setConnectingFrom(null); setSelectedIds(new Set()); setActivePathStudentId(null); return; }
      const tag = document.activeElement?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.code === "Space" && !inInput) {
        e.preventDefault();
        setSpaceDown(true);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !inInput && selectedIdsRef.current.size > 0) {
        e.preventDefault();
        deleteSelectedRef.current?.();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
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
      const baseY = 60 + (existingCount + i) * 80;
      const updates = {};
      updates[`${nodesRef}/start_${sid}`] = {
        id: `start_${sid}`, type: "start", studentId: student.id, studentName: student.name,
        nextNodes: [], x: 30, y: baseY, createdAt: new Date().toISOString(),
      };
      updates[`${nodesRef}/end_${sid}`] = {
        id: `end_${sid}`, type: "end", studentId: student.id, studentName: student.name,
        nextNodes: [], x: 400, y: baseY, createdAt: new Date().toISOString(),
      };
      await db.ref().update(updates);
    }
    setShowAddStudent(false);
    setSelectedStudentIds([]);
  };

  // 경로 역추적으로 end 노드 통계 계산
  const computeEndNodeStats = (endNodeId) => {
    const prev = {};
    nodeList.forEach(n => { (n.nextNodes || []).forEach(toId => { if (!prev[toId]) prev[toId] = []; prev[toId].push(n.id); }); });
    const visited = new Set();
    const queue = [endNodeId];
    while (queue.length) { const id = queue.shift(); if (visited.has(id)) continue; visited.add(id); (prev[id] || []).forEach(pid => queue.push(pid)); }
    let totalProblems = 0, estimatedMins = 0;
    visited.forEach(id => {
      const n = nodes[id];
      if (n?.type !== "material") return;
      const cnt = Number(n.totalProblems) || 0;
      totalProblems += cnt;
      const mat = materials.find(m => m.id === n.materialId);
      const mpp = Number(mat?.minutesPerProblem) || 3;
      estimatedMins += cnt * mpp;
    });
    return { totalProblems, estimatedMins };
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
    const cf = connectingFromRef.current;
    if (cf) {
      if (cf !== nodeId) {
        const from = nodes[cf];
        const cur = from?.nextNodes || [];
        if (!cur.includes(nodeId)) {
          const toNode = nodes[nodeId];
          const isFromStudent = from?.type === "start" || cf.startsWith("start_");
          const isToMaterial = toNode?.type === "material" || (toNode?.materialId !== undefined);
          if (isFromStudent && isToMaterial) {
            setPendingEdge({ fromId: cf, toId: nodeId });
            setPendingStartNum("1");
            setConnectingFrom(null);
            return;
          }
          db.ref(`${nodesRef}/${cf}`).update({ nextNodes: [...cur, nodeId] });
        }
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
    const cf = connectingFromRef.current;
    if (cf) {
      if (cf !== nodeId) {
        const from = nodes[cf];
        const cur = from?.nextNodes || [];
        if (!cur.includes(nodeId)) {
          const toNode = nodes[nodeId];
          const isFromStudent = from?.type === "start" || cf.startsWith("start_");
          const isToMaterial = toNode?.type === "material" || (toNode?.materialId !== undefined);
          if (isFromStudent && isToMaterial) {
            setPendingEdge({ fromId: cf, toId: nodeId });
            setPendingStartNum("1");
            setConnectingFrom(null);
            setSelectedIds(new Set([nodeId]));
            return;
          }
          db.ref(`${nodesRef}/${cf}`).update({ nextNodes: [...cur, nodeId] });
        }
      }
      setConnectingFrom(null);
      setSelectedIds(new Set([nodeId]));
      return;
    }

    // 선택 처리
    const clickedNode = nodes[nodeId];
    const isOnlySelected = selectedIds.has(nodeId) && selectedIds.size === 1;
    const isInMultiSelection = selectedIds.has(nodeId) && selectedIds.size > 1;
    const nextSelected = e.shiftKey
      ? new Set([...selectedIds, nodeId])
      : isOnlySelected ? new Set()        // 단독 선택 노드 재클릭 → 해제
      : isInMultiSelection ? selectedIds  // 다중 선택 중 하나 클릭 → 유지
      : new Set([nodeId]);                // 미선택 노드 클릭 → 단독 선택
    setSelectedIds(nextSelected);

    // 학생 노드 클릭 시 경로 자동 표시 (토글)
    if (clickedNode?.type === "start") {
      setActivePathStudentId(isOnlySelected ? null : clickedNode.studentId);
      setPathEditMode(false);
    } else {
      setActivePathStudentId(null);
      setPathEditMode(false);
    }

    // 드래그 오프셋 계산 (선택된 모든 노드)
    const { cx, cy } = canvasXY(e);
    const dragIds = isInMultiSelection ? [...selectedIds] : (nextSelected.has(nodeId) ? [...nextSelected] : [nodeId]);
    const dragNodeIds = dragIds;
    const offsets = {};
    for (const nid of dragNodeIds) {
      const n = nodes[nid];
      if (!n) continue;
      const pos = getPos(n);
      offsets[nid] = { ox: cx - pos.x, oy: cy - pos.y };
    }
    setDragging({ offsets });
  };

  // 빈 캔버스 mousedown → pan or 박스 선택 시작
  const handleCanvasMouseDown = (e) => {
    if (spaceDown) {
      e.preventDefault();
      const el = canvasRef.current;
      setPanning({ startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop });
      return;
    }
    if (connectingFrom) { setConnectingFrom(null); return; }
    if (pathEditMode) return;
    const { cx, cy } = canvasXY(e);
    setBoxSelect({ x1: cx, y1: cy, x2: cx, y2: cy });
  };

  const handleMouseMove = (e) => {
    if (panning) {
      const el = canvasRef.current;
      el.scrollLeft = panning.scrollLeft - (e.clientX - panning.startX);
      el.scrollTop  = panning.scrollTop  - (e.clientY - panning.startY);
      return;
    }
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
    if (panning) { setPanning(null); return; }
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
        return p.x + NODE_W > minX && p.x < maxX2 && p.y + getNodeH(n) > minY && p.y < maxY2;
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
    const ids = selectedIdsRef.current;
    if (ids.size === 0) return;
    if (!confirm(`${ids.size}개 노드를 삭제할까요?`)) return;
    for (const nodeId of ids) {
      for (const n of nodeList)
        if ((n.nextNodes||[]).includes(nodeId))
          await db.ref(`${nodesRef}/${n.id}`).update({ nextNodes: n.nextNodes.filter(x=>x!==nodeId) });
      await db.ref(`${nodesRef}/${nodeId}`).remove();
    }
    setSelectedIds(new Set());
  };
  deleteSelectedRef.current = deleteSelected;

  const addMaterialNodes = async () => {
    if (selectedMaterialIds.length === 0) return;
    const existing = nodeList.filter(n => n.type === "material").length;
    for (let i = 0; i < selectedMaterialIds.length; i++) {
      const mat = materials.find(m => m.id === selectedMaterialIds[i]);
      if (!mat) continue;
      const id = Date.now().toString() + "_" + i;
      const idx = existing + i;
      await db.ref(`${nodesRef}/${id}`).set({
        id, type: "material",
        materialId: mat.id, materialName: mat.name, totalProblems: mat.totalProblems,
        nextNodes: [],
        x: 120 + (idx % 4) * 160,
        y: 160 + Math.floor(idx / 4) * 140,
        createdAt: new Date().toISOString(),
      });
    }
    setShowAddMaterial(false);
    setSelectedMaterialIds([]);
  };

  const confirmEdgeStart = async () => {
    if (!pendingEdge) return;
    const { fromId, toId } = pendingEdge;
    const from = nodes[fromId];
    const cur = from?.nextNodes || [];
    const num = parseInt(pendingStartNum) || 1;
    await db.ref(`${nodesRef}/${fromId}`).update({ nextNodes: [...cur, toId] });
    await db.ref(`${nodesRef}/${fromId}/edgeMeta/${toId}`).set({ startNum: num });
    setPendingEdge(null);
    setPendingStartNum("1");
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
  const maxY = Math.max(500, ...nodeList.map(n => getPos(n).y + getNodeH(n) + 80));

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
        <Btn onClick={() => { setShowAddMaterial(s=>!s); setShowAddStudent(false); }} disabled={materials.length === 0}>+ 교재 노드</Btn>
        <Btn variant="outline" onClick={addAssessmentNode} disabled={assessments.length === 0}>+ 평가 노드</Btn>
        <Btn variant="outline" onClick={() => { setShowAddStudent(s=>!s); setShowAddMaterial(false); }}>+ 학생 노드</Btn>
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
                : selectedNode.type === "end" ? "끝 노드"
                : selectedNode.type === "start" ? `${selectedNode.studentName} · 시작`
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

      {showAddMaterial && (() => {
        const folderIds = [...new Set(materials.map(m => m.folderId).filter(Boolean))];
        const getFolderName = (fid) => matFolders[fid]?.name || fid;
        const visibleMats = materialFolderFilter === "전체"
          ? materials
          : materialFolderFilter === "__none__"
          ? materials.filter(m => !m.folderId)
          : materials.filter(m => m.folderId === materialFolderFilter);
        return (
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-slate-600 shrink-0">교재 추가</span>
              <div className="flex gap-1 flex-wrap">
                {["전체", ...(materials.some(m=>!m.folderId)?["__none__"]:[]), ...folderIds].map(fid => {
                  const label = fid === "전체" ? "전체" : fid === "__none__" ? "미분류" : getFolderName(fid);
                  return (
                    <button key={fid} onClick={() => setMaterialFolderFilter(fid)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${materialFolderFilter === fid ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {visibleMats.map(mat => {
                const checked = selectedMaterialIds.includes(mat.id);
                return (
                  <label key={mat.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm cursor-pointer transition select-none
                    ${checked ? "bg-slate-900 text-white border-slate-900 font-medium" : "bg-white hover:bg-slate-50 text-slate-700"}`}>
                    <input type="checkbox" checked={checked}
                      onChange={e => setSelectedMaterialIds(prev =>
                        e.target.checked ? [...prev, mat.id] : prev.filter(id => id !== mat.id)
                      )}
                      className="w-3.5 h-3.5"
                    />
                    <span>{mat.name}</span>
                    <span className={`text-xs ${checked ? "text-slate-300" : "text-slate-400"}`}>{mat.totalProblems}문제</span>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Btn size="sm" onClick={addMaterialNodes} disabled={selectedMaterialIds.length === 0}>
                {selectedMaterialIds.length > 0 ? `${selectedMaterialIds.length}개 추가` : "추가"}
              </Btn>
              <Btn size="sm" variant="outline" onClick={()=>{ setShowAddMaterial(false); setSelectedMaterialIds([]); setMaterialFolderFilter("전체"); }}>취소</Btn>
              <button onClick={() => setSelectedMaterialIds(visibleMats.map(m => m.id))}
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
          style={{ height: 560, cursor: panning ? "grabbing" : spaceDown ? "grab" : dragging ? "grabbing" : boxSelect ? "crosshair" : "default" }}
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
                  const x1 = fp.x + NODE_W + PORT_SIZE, y1 = fp.y + getNodeH(node) / 2;
                  const x2 = tp.x, y2 = tp.y + getNodeH(to) / 2;
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
                      {/* 시작번호 라벨 (학생→교재) */}
                      {(() => {
                        const startNum = node.edgeMeta?.[tid]?.startNum;
                        if (!startNum) return null;
                        const lx = x1 + (x2 - x1) * 0.22;
                        const ly = y1 + (y2 - y1) * 0.22 - 10;
                        const label = `${startNum}번~`;
                        return (
                          <g style={{ pointerEvents: "none" }}>
                            <rect x={lx - 16} y={ly - 8} width={32} height={14} rx={4} fill="white" stroke="#64748b" strokeWidth={1}/>
                            <text x={lx} y={ly + 2} textAnchor="middle" fontSize={8} fill="#334155" fontWeight={700}>{label}</text>
                          </g>
                        );
                      })()}
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
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); handlePortClick(e, node.id); }}
                        style={portStyle(isConnSrc)}>⊕</button>
                    : <div style={{width: PORT_SIZE}}/>
                  }

                  {/* 노드 본체 */}
                  <div onMouseDown={e => handleNodeMouseDown(e, node.id)} style={{
                    flex: 1, height: getNodeH(node),
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
                      {node.type === "end" ? (() => {
                        const { totalProblems: total, estimatedMins: mins } = computeEndNodeStats(node.id);
                        const h = Math.floor(mins / 60), m = Math.round(mins % 60);
                        const timeStr = h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`;
                        return (
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                            <div style={{ fontSize:9, fontWeight:700, color:"#166534", textAlign:"center" }}>{node.studentName}</div>
                            <div style={{ fontSize:8, color:"#15803d" }}>{total > 0 ? `${total}문제 · 약 ${timeStr}` : "연결 없음"}</div>
                          </div>
                        );
                      })() : node.type === "material" ? (
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
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: s.headerText, textAlign: "center", lineHeight: 1.2 }}>
                            {node.studentName}
                          </div>
                          <div style={{ display: "flex", gap: 2, width: "100%" }}
                            onMouseDown={e => e.stopPropagation()}>
                            <select
                              value={node.hwType || "현행"}
                              onChange={async e => { e.stopPropagation(); await db.ref(`${nodesRef}/${node.id}`).update({ hwType: e.target.value }); }}
                              onClick={e => e.stopPropagation()}
                              style={{ flex: 1, fontSize: 7, padding: "1px 0px", borderRadius: 4, border: "1px solid #f9a8d4", background: "#fdf2f8", color: "#9d174d", cursor: "pointer", minWidth: 0 }}>
                              <option value="현행">현행</option>
                              <option value="추가1">추가1</option>
                              <option value="추가2">추가2</option>
                            </select>
                            <select
                              value={node.trackType || "진도"}
                              onChange={async e => { e.stopPropagation(); await db.ref(`${nodesRef}/${node.id}`).update({ trackType: e.target.value }); }}
                              onClick={e => e.stopPropagation()}
                              style={{ flex: 1, fontSize: 7, padding: "1px 0px", borderRadius: 4, border: "1px solid #f9a8d4", background: "#fdf2f8", color: "#9d174d", cursor: "pointer", minWidth: 0 }}>
                              <option value="진도">진도</option>
                              <option value="평가">평가</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽 포트 (end 노드는 숨김) */}
                  {node.type !== "end"
                    ? <button data-port="right"
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); handlePortClick(e, node.id); }}
                        style={portStyle(isConnSrc)}>⊕</button>
                    : <div style={{width: PORT_SIZE}}/>
                  }
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

        {/* 시작번호 입력 모달 */}
        {pendingEdge && (() => {
          const fromNode = nodes[pendingEdge.fromId];
          const toNode = nodes[pendingEdge.toId];
          return (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 9999,
            }} onClick={e => e.stopPropagation()}>
              <div style={{
                background: "white", borderRadius: 14, padding: "20px 24px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)", minWidth: 280,
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "#1e293b" }}>시작 번호 설정</div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
                  <span style={{ fontWeight: 600, color: "#334155" }}>{fromNode?.studentName}</span>
                  {" → "}
                  <span style={{ fontWeight: 600, color: "#334155" }}>{toNode?.materialName}</span>
                  <br/>몇 번 문제부터 시작할까요?
                </div>
                <input
                  type="number" min="1" max={toNode?.totalProblems || 9999}
                  value={pendingStartNum}
                  onChange={e => setPendingStartNum(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") confirmEdgeStart(); if (e.key === "Escape") { setPendingEdge(null); setPendingStartNum("1"); } }}
                  autoFocus
                  style={{
                    width: "100%", border: "1.5px solid #cbd5e1", borderRadius: 8,
                    padding: "6px 10px", fontSize: 20, fontWeight: 700, textAlign: "center",
                    outline: "none", marginBottom: 14, boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={confirmEdgeStart} style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                    background: "#1e293b", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>확인</button>
                  <button onClick={() => { setPendingEdge(null); setPendingStartNum("1"); }} style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, border: "1.5px solid #e2e8f0",
                    background: "white", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}>취소</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── 평가 관리 탭 ──────────────────────────────────────────────────────────────
function AssessmentsTab({ students = [] }) {
  const SUBJECTS = ["초5-1","초5-2","초6-1","초6-2","중1-1","중1-2","중2-1","중2-2","중3-1","중3-2","공통수학1","공통수학2","대수","미적분1","기하","미적분","확률과통계"];
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
  const [allMockResults, setAllMockResults] = React.useState({}); // examId → { studentId → result }
  const [scoreInputs, setScoreInputs] = React.useState({});
  const [mockResultsTab, setMockResultsTab] = React.useState("results"); // "results" | "images"
  const [mockPicked, setMockPicked] = React.useState({}); // { "studentId:q" → true }
  const [mockPickMode, setMockPickMode] = React.useState(false);
  const [mockFolders, setMockFolders] = React.useState([]);
  const [activeFolderId, setActiveFolderId] = React.useState(null);
  const [folderForm, setFolderForm] = React.useState("");
  const [editingFolderId, setEditingFolderId] = React.useState(null);
  const [editingFolderName, setEditingFolderName] = React.useState("");
  const [assessmentFolders, setAssessmentFolders] = React.useState([]);
  const [assessmentFolderForm, setAssessmentFolderForm] = React.useState("");
  const [activeAssessmentFolderId, setActiveAssessmentFolderId] = React.useState(null);
  const [editingAssessmentFolderId, setEditingAssessmentFolderId] = React.useState(null);
  const [editingAssessmentFolderName, setEditingAssessmentFolderName] = React.useState("");
  const [draggingAssessmentId, setDraggingAssessmentId] = React.useState(null);
  const [dragOverAssessmentFolder, setDragOverAssessmentFolder] = React.useState(null);
  const [folderViewMode, setFolderViewMode] = React.useState("rounds"); // "rounds" | "student"
  const [folderViewStudentId, setFolderViewStudentId] = React.useState("");
  const [svPicked, setSvPicked] = React.useState({}); // { "examId:q" → true }
  const [svPickMode, setSvPickMode] = React.useState(false);

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

  React.useEffect(() => {
    const ref = db.ref("mockExamResults");
    ref.on("value", snap => setAllMockResults(snap.val() || {}));
    return () => ref.off();
  }, []);

  React.useEffect(() => {
    const ref = db.ref("assessmentFolders");
    ref.on("value", snap => {
      const data = snap.val();
      setAssessmentFolders(data ? Object.values(data).sort((a,b) => a.createdAt - b.createdAt) : []);
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
  const openFolder = (folder) => { setActiveFolderId(folder.id); setStep("folder_view"); setFolderViewMode("rounds"); setFolderViewStudentId(""); setSvPicked({}); setSvPickMode(false); };

  const dropAssessment = async (targetFolderId) => {
    if (!draggingAssessmentId) return;
    await db.ref(`assessments/${draggingAssessmentId}/folderId`).set(targetFolderId || null);
    setDraggingAssessmentId(null);
    setDragOverAssessmentFolder(null);
  };

  const addAssessmentFolder = async () => {
    if (!assessmentFolderForm.trim()) return;
    const id = Date.now().toString();
    await db.ref(`assessmentFolders/${id}`).set({ id, name: assessmentFolderForm.trim(), createdAt: Number(id) });
    setAssessmentFolderForm("");
  };
  const saveEditAssessmentFolder = async () => {
    if (!editingAssessmentFolderName.trim()) return;
    await db.ref(`assessmentFolders/${editingAssessmentFolderId}`).update({ name: editingAssessmentFolderName.trim() });
    setEditingAssessmentFolderId(null);
  };
  const deleteAssessmentFolder = async (id) => {
    if (!confirm("폴더를 삭제하면 안에 있는 평가도 모두 삭제됩니다. 계속하시겠습니까?")) return;
    for (const a of assessments.filter(a => a.folderId === id)) await db.ref(`assessments/${a.id}`).remove();
    await db.ref(`assessmentFolders/${id}`).remove();
  };
  const openAssessmentFolder = (folder) => { setActiveAssessmentFolderId(folder.id); setStep("assessment_folder_view"); };

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
    setMockResultsTab("results");
    setMockPicked({});
    setMockPickMode(false);
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
    const next = !cur ? "O" : cur === "O" ? "X" : cur === "X" ? "R" : cur === "R" ? "S" : null;
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
        score = parseFloat((correct.length * total / (exam.questionCount || 20)).toFixed(2));
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
    if (!dbEditId && activeAssessmentFolderId) data.folderId = activeAssessmentFolderId;
    try {
      if (dbEditId) { await db.ref(`assessments/${dbEditId}`).update(data); }
      else { const id = Date.now().toString(); await db.ref(`assessments/${id}`).set({ id, ...data }); }
      setStep(activeAssessmentFolderId && !dbEditId ? "assessment_folder_view" : "select");
    } catch(e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  const handleSaveGeneral = async () => {
    if (!generalName.trim()) { alert("평가 제목을 입력해 주세요."); return; }
    if (!generalTotal || isNaN(Number(generalTotal)) || Number(generalTotal) <= 0) { alert("전체 문제 수를 입력해 주세요."); return; }
    setSaving(true);
    const data = { type: "누적테스트", name: generalName.trim(), subject: generalSubject, totalProblems: Number(generalTotal), createdAt: todayString() };
    if (!dbEditId && activeAssessmentFolderId) data.folderId = activeAssessmentFolderId;
    try {
      if (dbEditId) { await db.ref(`assessments/${dbEditId}`).update(data); }
      else { const id = Date.now().toString(); await db.ref(`assessments/${id}`).set({ id, ...data }); }
      setStep(activeAssessmentFolderId && !dbEditId ? "assessment_folder_view" : "select");
    } catch(e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  if (step === "general_test") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>setStep(activeAssessmentFolderId ? "assessment_folder_view" : "select")} className="text-sm text-slate-500 hover:text-slate-800">← 뒤로</button>
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
            <Btn variant="outline" onClick={()=>setStep(activeAssessmentFolderId ? "assessment_folder_view" : "select")}>취소</Btn>
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
          <button type="button" onClick={()=>setStep(activeAssessmentFolderId ? "assessment_folder_view" : "select")} className="text-sm text-slate-500 hover:text-slate-800">← 뒤로</button>
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
            <Btn variant="outline" onClick={()=>setStep(activeAssessmentFolderId ? "assessment_folder_view" : "select")}>취소</Btn>
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
          {dbEditId && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <Lbl>문제 이미지</Lbl>
              <ProblemImageManager materialId={dbEditId}/>
            </div>
          )}
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
    const assignedStudents = (exam.students||[]).map(sid => students.find(s=>s.id===sid)).filter(Boolean);
    const qCount = exam.questionCount || 20;

    const toggleMockPick = (key) => setMockPicked(prev => {
      const copy = {...prev};
      if (copy[key]) delete copy[key]; else copy[key] = true;
      return copy;
    });

    const pickedList = [];
    for (const s of assignedStudents) {
      const result = mockResults[s.id];
      for (let q = 1; q <= qCount; q++) {
        const key = `${s.id}:${q}`;
        if (mockPicked[key]) pickedList.push({ key, studentId: s.id, studentName: s.name, q, ans: (result?.answers||{})[q] });
      }
    }

    const handleMockPrint = async () => {
      const imgUrls = {};
      await Promise.all(pickedList.map(async p => {
        const snap = await db.ref(`problemImages/${exam.id}/${p.q}`).once("value");
        imgUrls[p.key] = snap.val() || null;
      }));
      const groups = [];
      for (let i = 0; i < pickedList.length; i += 4) groups.push(pickedList.slice(i, i+4));
      const ansColor = a => a==="X"?"#ef4444":a==="O"?"#22c55e":"#94a3b8";
      const problemBox = p => p ? `
        <div class="problem">
          <div class="problem-header">${p.studentName} — ${p.q}번 <span style="color:${ansColor(p.ans)};font-size:10px;margin-left:4px">${p.ans||"·"}</span></div>
          <div class="problem-body">${imgUrls[p.key]?`<img src="${imgUrls[p.key]}" style="max-width:100%;height:auto;display:block"/>`:""}</div>
        </div>` : `<div class="problem empty"></div>`;
      const pages = groups.map((g,gi) => `
        <div class="page">
          <div class="page-header"><span class="exam-name">${exam.name} ${exam.round}차</span><span class="page-info">${gi*4+1}–${Math.min(gi*4+4,pickedList.length)}번째</span></div>
          <div class="cols"><div class="col">${problemBox(g[0])}${problemBox(g[1])}</div><div class="col">${problemBox(g[2])}${problemBox(g[3])}</div></div>
        </div>`).join("");
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif}
        @page{size:A4 portrait;margin:12mm 15mm}
        .page{width:100%;page-break-after:always}.page:last-child{page-break-after:avoid}
        .page-header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #1e293b;padding-bottom:4px;margin-bottom:6mm}
        .exam-name{font-size:16px;font-weight:800;color:#0f172a}.page-info{font-size:10px;color:#94a3b8}
        .cols{display:grid;grid-template-columns:1fr 1fr;gap:8mm;height:240mm}
        .col{display:flex;flex-direction:column;gap:8mm}.problem{flex:1;display:flex;flex-direction:column}
        .problem-header{padding:0 0 4px;font-size:11px;font-weight:700;color:#334155;border-bottom:1px solid #cbd5e1;flex-shrink:0;margin-bottom:4px}
        .problem-body{flex:1}
      </style></head><body>${pages}</body></html>`;
      const win = window.open("","_blank");
      win.document.write(html); win.document.close();
      win.onload = () => { win.focus(); win.print(); };
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>setStep(exam.folderId ? "folder_view" : "select")} className="text-sm text-slate-500 hover:text-slate-800">← 뒤로</button>
          <h2 className="text-lg font-bold">{exam.name} — {exam.round}차 결과</h2>
        </div>


        {/* 결과 입력 탭 */}
        {mockResultsTab === "results" && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={()=>{ setMockPickMode(p=>!p); setMockPicked({}); }}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition ${mockPickMode?"bg-indigo-600 text-white border-indigo-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                {mockPickMode ? "✓ 인쇄 선택 모드 ON" : "인쇄 선택 모드"}
              </button>
              {mockPickMode && pickedList.length > 0 && (
                <>
                  <span className="text-xs text-indigo-600 font-medium">{pickedList.length}개 선택됨</span>
                  <button onClick={()=>setMockPicked({})} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">선택 해제</button>
                  <button onClick={handleMockPrint} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">🖨️ 인쇄</button>
                </>
              )}
            </div>
            {mockPickMode && <div className="text-xs text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2">인쇄 선택 모드 — 클릭으로 문제 선택/해제, O/X는 변경되지 않습니다</div>}
            <Card className="p-5 space-y-3">
              {assignedStudents.length === 0
                ? <div className="text-sm text-slate-400 text-center py-4">배정된 학생이 없습니다.</div>
                : assignedStudents.map(s => {
                    const result = mockResults[s.id];
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
                              onBlur={()=>saveMockScore(s.id)} onKeyDown={e=>e.key==="Enter"&&saveMockScore(s.id)}
                              className="w-16 text-center text-sm rounded-lg border border-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300"/>
                            <span className="text-sm text-slate-400">점</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({length: qCount}, (_,i)=>i+1).map(q => {
                            const ans = (result?.answers||{})[q];
                            const isPicked = !!mockPicked[`${s.id}:${q}`];
                            return (
                              <button key={q} type="button"
                                onClick={() => mockPickMode ? toggleMockPick(`${s.id}:${q}`) : toggleAnswer(s.id, q)}
                                className={`inline-flex flex-col items-center w-7 rounded-md border text-[10px] py-0.5 transition hover:opacity-70 cursor-pointer
                                  ${isPicked?"ring-2 ring-indigo-500 ring-offset-1":""}
                                  ${ans==="O"?"bg-emerald-50 border-emerald-300 text-emerald-600":ans==="X"?"bg-red-50 border-red-300 text-red-500":ans==="R"?"bg-orange-50 border-orange-300 text-orange-500":ans==="S"?"bg-blue-50 border-blue-300 text-blue-500":"bg-slate-50 border-slate-200 text-slate-300"}`}>
                                <span className="leading-none text-slate-400">{q}</span>
                                <span className="font-bold leading-none">{ans==="O"?"O":ans==="X"?"X":ans==="R"?"범":ans==="S"?"해":"·"}</span>
                              </button>
                            );
                          })}
                        </div>
                        {!mockPickMode && <div className="text-[10px] text-slate-400">클릭: · → <span className="text-emerald-600">맞음</span> → <span className="text-red-500">틀림</span> → <span className="text-orange-500">범위x</span> → <span className="text-blue-500">해결</span> → ·</div>}
                      </div>
                    );
                  })
              }
            </Card>
          </>
        )}

      </div>
    );
  }

  if (step === "assessment_folder_view") {
    const folder = assessmentFolders.find(f => f.id === activeAssessmentFolderId);
    const folderAssessments = assessments.filter(a => a.folderId === activeAssessmentFolderId)
      .sort((a,b) => (b.createdAt||"").localeCompare(a.createdAt||""));
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>setStep("select")} className="text-sm text-slate-500 hover:text-slate-800">← 뒤로</button>
          {editingAssessmentFolderId === activeAssessmentFolderId
            ? <input autoFocus value={editingAssessmentFolderName} onChange={e=>setEditingAssessmentFolderName(e.target.value)}
                onBlur={saveEditAssessmentFolder} onKeyDown={e=>e.key==="Enter"&&saveEditAssessmentFolder()}
                className="text-lg font-bold border-b border-slate-400 outline-none bg-transparent"/>
            : <h2 className="text-lg font-bold cursor-pointer hover:text-slate-600" onClick={()=>{ setEditingAssessmentFolderId(activeAssessmentFolderId); setEditingAssessmentFolderName(folder?.name||""); }}>
                📁 {folder?.name}
              </h2>
          }
          <div className="ml-auto flex gap-2">
            <Btn onClick={()=>{ setActiveAssessmentFolderId(activeAssessmentFolderId); startCreate(); }}>+ 일일테스트</Btn>
            <Btn onClick={()=>{ setActiveAssessmentFolderId(activeAssessmentFolderId); startCreateGeneral(); }}>+ 누적테스트</Btn>
          </div>
        </div>
        <Card className="p-5 space-y-3">
          {folderAssessments.length === 0
            ? <div className="rounded-2xl border border-dashed p-8 text-sm text-slate-400 text-center">평가를 추가해 주세요.</div>
            : <div className="space-y-2">
                {folderAssessments.map(a => (
                  <div key={a.id} draggable
                    onDragStart={()=>setDraggingAssessmentId(a.id)}
                    onDragEnd={()=>{setDraggingAssessmentId(null);setDragOverAssessmentFolder(null);}}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition cursor-grab active:cursor-grabbing ${draggingAssessmentId===a.id?"opacity-40":""}`}>
                    <span className="text-slate-300 text-sm select-none">⠿</span>
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
      </div>
    );
  }

  if (step === "folder_view") {
    const folder = mockFolders.find(f => f.id === activeFolderId);
    const folderExams = mockExams.filter(e => e.folderId === activeFolderId).sort((a,b) => a.round - b.round);

    return (
      <div className="space-y-4">
        {/* 헤더 */}
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

        {/* 뷰 모드 토글 */}
        <div className="flex justify-center">
          <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-1">
            {[["rounds","🗓️ 회차 기준"],["student","👤 학생 기준"]].map(([m,l]) => (
              <button key={m} onClick={() => { setFolderViewMode(m); setFolderViewStudentId(""); setSvPicked({}); setSvPickMode(false); }}
                className={`px-5 py-1.5 rounded-lg text-sm font-medium transition ${folderViewMode===m?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* 학생 기준 뷰 */}
        {folderViewMode === "student" && (() => {
          const allStudentIds = [...new Set(folderExams.flatMap(e => e.students||[]))];
          const allFolderStudents = allStudentIds.map(sid => students.find(s=>s.id===sid)).filter(Boolean).sort((a,b)=>a.className.localeCompare(b.className)||a.name.localeCompare(b.name));
          const selectedStudent = allFolderStudents.find(s => s.id === folderViewStudentId) || null;
          const studentExams = folderExams.filter(e => (e.students||[]).includes(folderViewStudentId));

          const toggleSvPick = (key) => setSvPicked(prev => { const c={...prev}; if(c[key]) delete c[key]; else c[key]=true; return c; });

          const toggleSvAnswer = async (examId, qNum) => {
            const exam = mockExams.find(e => e.id === examId);
            if (!exam) return;
            const cur = ((allMockResults[examId]||{})[folderViewStudentId]?.answers||{})[qNum];
            const next = !cur ? "O" : cur === "O" ? "X" : cur === "X" ? "R" : cur === "R" ? "S" : null;
            const existing = (allMockResults[examId]||{})[folderViewStudentId] || {};
            const newAnswers = { ...(existing.answers||{}) };
            if (next === null) delete newAnswers[qNum]; else newAnswers[qNum] = next;
            const scoringType = exam.scoringType || "auto";
            let score = null;
            if (scoringType !== "none") {
              const correct = Object.entries(newAnswers).filter(([,v]) => v === "O").map(([q]) => Number(q));
              if (scoringType === "manual" && exam.scoring) {
                score = correct.reduce((sum, q) => sum + (Number(exam.scoring[q]) || 0), 0);
              } else {
                const total = exam.totalScore || 100;
                score = parseFloat((correct.length * total / (exam.questionCount || 20)).toFixed(2));
              }
            }
            const updates = { answers: newAnswers, submittedAt: existing.submittedAt || new Date().toISOString().slice(0,10) };
            if (score !== null) updates.score = score;
            await db.ref(`mockExamResults/${examId}/${folderViewStudentId}`).set(updates);
          };

          const handleSvPrint = async () => {
            const keys = Object.keys(svPicked);
            if (keys.length === 0) return;
            const items = [];
            for (const key of keys) {
              const [examId, qStr] = key.split(":");
              const q = Number(qStr);
              const exam = mockExams.find(e => e.id === examId);
              const result = (allMockResults[examId]||{})[folderViewStudentId];
              const ans = (result?.answers||{})[q];
              items.push({ key, examId, q, ans, exam });
            }
            const imgUrls = {};
            await Promise.all(items.map(async p => {
              const snap = await db.ref(`problemImages/${p.examId}/${p.q}`).once("value");
              imgUrls[p.key] = snap.val() || null;
            }));
            const groups = [];
            for (let i = 0; i < items.length; i += 4) groups.push(items.slice(i, i+4));
            const ansColor = a => a==="X"?"#ef4444":a==="O"?"#22c55e":"#94a3b8";
            const problemBox = p => p ? `
              <div class="problem">
                <div class="problem-header">${p.exam?.name||""} ${p.exam?.round||""}차 — ${p.q}번 <span style="color:${ansColor(p.ans)};font-size:10px;margin-left:4px">${p.ans||"·"}</span></div>
                <div class="problem-body">${imgUrls[p.key]?`<img src="${imgUrls[p.key]}" style="max-width:100%;height:auto;display:block"/>`:""}</div>
              </div>` : `<div class="problem empty"></div>`;
            const pages = groups.map((g,gi) => `
              <div class="page">
                <div class="page-header"><span class="student-name">${selectedStudent?.className||""} ${selectedStudent?.name||""}</span><span class="page-info">${gi*4+1}–${Math.min(gi*4+4,items.length)}번째</span></div>
                <div class="cols"><div class="col">${problemBox(g[0])}${problemBox(g[1])}</div><div class="col">${problemBox(g[2])}${problemBox(g[3])}</div></div>
              </div>`).join("");
            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
              *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif}
              @page{size:A4 portrait;margin:12mm 15mm}
              .page{width:100%;page-break-after:always}.page:last-child{page-break-after:avoid}
              .page-header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #1e293b;padding-bottom:4px;margin-bottom:6mm}
              .student-name{font-size:16px;font-weight:800;color:#0f172a}.page-info{font-size:10px;color:#94a3b8}
              .cols{display:grid;grid-template-columns:1fr 1fr;gap:8mm;height:240mm}
              .col{display:flex;flex-direction:column;gap:8mm}.problem{flex:1;display:flex;flex-direction:column}
              .problem-header{padding:0 0 4px;font-size:11px;font-weight:700;color:#334155;border-bottom:1px solid #cbd5e1;flex-shrink:0;margin-bottom:4px}
              .problem-body{flex:1}
            </style></head><body>${pages}</body></html>`;
            const win = window.open("","_blank");
            win.document.write(html); win.document.close();
            win.onload = () => { win.focus(); win.print(); };
          };

          return (
            <div className="space-y-4">
              {/* 학생 선택 */}
              <Card className="p-4 flex flex-wrap gap-3 items-center">
                <select value={folderViewStudentId} onChange={e => { setFolderViewStudentId(e.target.value); setSvPicked({}); setSvPickMode(false); }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 min-w-[140px]">
                  <option value="">학생 선택</option>
                  {allFolderStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                </select>
                {folderViewStudentId && (
                  <>
                    <button onClick={() => { setSvPickMode(p=>!p); setSvPicked({}); }}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition ${svPickMode?"bg-indigo-600 text-white border-indigo-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                      {svPickMode ? "✓ 인쇄 선택 모드 ON" : "인쇄 선택 모드"}
                    </button>
                    {svPickMode && Object.keys(svPicked).length > 0 && (
                      <>
                        <span className="text-xs text-indigo-600 font-medium">{Object.keys(svPicked).length}개 선택됨</span>
                        <button onClick={() => setSvPicked({})} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">선택 해제</button>
                        <button onClick={handleSvPrint} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">🖨️ 인쇄</button>
                      </>
                    )}
                  </>
                )}
              </Card>

              {!folderViewStudentId && <Card className="p-8 text-center text-sm text-slate-400">학생을 선택해 주세요.</Card>}

              {folderViewStudentId && studentExams.length === 0 && (
                <Card className="p-8 text-center text-sm text-slate-400">이 폴더에 배정된 시험이 없습니다.</Card>
              )}

              {folderViewStudentId && studentExams.map(exam => {
                const qCount = exam.questionCount || 20;
                const result = (allMockResults[exam.id]||{})[folderViewStudentId];
                const score = result?.score;
                return (
                  <Card key={exam.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold">{exam.name}</span>
                      <Badge variant="secondary">{exam.round}차</Badge>
                      {score != null
                        ? <span className="text-xs bg-emerald-100 text-emerald-700 rounded-lg px-2 py-0.5 font-medium">{parseFloat(Number(score).toFixed(2))}점</span>
                        : <span className="text-xs bg-slate-100 text-slate-400 rounded-lg px-2 py-0.5">미채점</span>
                      }
                      {svPickMode && (
                        <button onClick={() => {
                          const keys = Array.from({length:qCount},(_,i)=>`${exam.id}:${i+1}`);
                          const allPicked = keys.every(k => svPicked[k]);
                          setSvPicked(prev => {
                            const c={...prev};
                            if(allPicked) keys.forEach(k=>delete c[k]);
                            else keys.forEach(k=>{ c[k]=true; });
                            return c;
                          });
                        }} className="ml-auto text-xs px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                          {Array.from({length:qCount},(_,i)=>`${exam.id}:${i+1}`).every(k=>svPicked[k]) ? "전체 해제" : "전체 선택"}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({length:qCount},(_,i)=>i+1).map(q => {
                        const ans = (result?.answers||{})[q];
                        const key = `${exam.id}:${q}`;
                        const isPicked = !!svPicked[key];
                        return (
                          <button key={q} type="button"
                            onClick={() => svPickMode ? toggleSvPick(key) : toggleSvAnswer(exam.id, q)}
                            className={`inline-flex flex-col items-center w-7 rounded-md border text-[10px] py-0.5 transition cursor-pointer hover:opacity-70
                              ${isPicked ? "ring-2 ring-indigo-500 ring-offset-1" : ""}
                              ${ans==="O"?"bg-emerald-50 border-emerald-300 text-emerald-600":ans==="X"?"bg-red-50 border-red-300 text-red-500":ans==="R"?"bg-orange-50 border-orange-300 text-orange-500":ans==="S"?"bg-blue-50 border-blue-300 text-blue-500":"bg-slate-50 border-slate-200 text-slate-300"}`}>
                            <span className="leading-none text-slate-400">{q}</span>
                            <span className="font-bold leading-none">{ans==="O"?"O":ans==="X"?"X":ans==="R"?"범":ans==="S"?"해":"·"}</span>
                          </button>
                        );
                      })}
                    </div>
                    {svPickMode
                      ? <div className="text-[10px] text-indigo-500">인쇄할 문제를 클릭해서 선택</div>
                      : <div className="text-[10px] text-slate-400">클릭: · → <span className="text-emerald-600">맞음</span> → <span className="text-red-500">틀림</span> → <span className="text-orange-500">범위x</span> → <span className="text-blue-500">해결</span> → ·</div>
                    }
                  </Card>
                );
              })}
            </div>
          );
        })()}

        {folderViewMode === "rounds" && folderExams.length === 0
          ? <Card className="p-8 text-center text-sm text-slate-400">시험을 등록해 주세요.</Card>
          : folderViewMode === "rounds" && (() => {
              // 폴더 내 모든 학생 집합
              const allStudentIds = [...new Set(folderExams.flatMap(e => e.students||[]))];
              const allFolderStudents = allStudentIds.map(sid => students.find(s=>s.id===sid)).filter(Boolean);
              const COLORS = ["#4a6bd6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#f97316","#14b8a6","#6366f1"];

              // 그래프 내부 컴포넌트 (useState 사용 위해 별도 함수)
              const FolderChart = () => {
                const [selectedIds, setSelectedIds] = React.useState(allStudentIds);
                const toggleStudent = (sid) => setSelectedIds(prev =>
                  prev.includes(sid) ? prev.filter(id=>id!==sid) : [...prev, sid]
                );

                // 그래프 데이터
                const PAD = { top:24, right:60, bottom:32, left:44 };
                const W = 1248, H = 468;
                const innerW = W - PAD.left - PAD.right;
                const innerH = H - PAD.top - PAD.bottom;

                const xCount = folderExams.length;
                const xStep = xCount > 1 ? innerW / (xCount - 1) : innerW / 2;
                const xPos = (i) => xCount > 1 ? PAD.left + i * xStep : PAD.left + innerW / 2;

                // y축 범위
                const allScores = folderExams.flatMap(exam =>
                  (exam.students||[]).filter(sid=>selectedIds.includes(sid)).map(sid => allMockResults[exam.id]?.[sid]?.score).filter(v=>v!=null)
                );
                const maxTotal = Math.max(...folderExams.map(e=>e.totalScore||100), 100);
                const yMax = allScores.length > 0 ? Math.max(...allScores, maxTotal * 0.1) : maxTotal;
                const yMin = 0;
                const yRange = yMax - yMin || 1;
                const yPos = (val) => PAD.top + innerH - ((val - yMin) / yRange) * innerH;

                // y축 눈금
                const yTicks = [];
                const tickStep = Math.ceil(yMax / 5 / 10) * 10 || 10;
                for (let v = 0; v <= yMax + tickStep; v += tickStep) { if (v <= yMax + tickStep * 0.5) yTicks.push(v); }

                const [hovered, setHovered] = React.useState(null); // { examIdx, studentId, x, y, score }

                return (
                  <div style={{display:"flex", flexDirection:"column", gap:"0.5rem"}}>
                    {/* 학생 필터 */}
                    <div style={{maxHeight:"5rem", overflowY:"auto"}} className="flex flex-wrap gap-1.5">
                      <button onClick={() => setSelectedIds(selectedIds.length===allStudentIds.length?[]:[...allStudentIds])}
                        className="text-xs px-2.5 py-1 rounded-lg border font-medium transition bg-slate-100 text-slate-600 hover:bg-slate-200">
                        {selectedIds.length===allStudentIds.length?"전체 해제":"전체 선택"}
                      </button>
                      {allFolderStudents.map((s, i) => {
                        const color = COLORS[i % COLORS.length];
                        const on = selectedIds.includes(s.id);
                        return (
                          <button key={s.id} onClick={() => toggleStudent(s.id)}
                            className="text-xs px-2.5 py-1 rounded-lg border font-medium transition"
                            style={on ? {background:color+"22", color, borderColor:color+"66"} : {background:"#f8fafc",color:"#94a3b8",borderColor:"#e2e8f0"}}>
                            {s.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* SVG 그래프 */}
                    <div className="rounded-2xl border bg-white overflow-hidden">
                      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:"block", maxWidth:"100%"}}>
                        {/* 배경 가이드라인 */}
                        {yTicks.map(v => (
                          <g key={v}>
                            <line x1={PAD.left} x2={W-PAD.right} y1={yPos(v)} y2={yPos(v)} stroke="#f1f5f9" strokeWidth="1"/>
                            <text x={PAD.left-6} y={yPos(v)+4} textAnchor="end" fontSize="13.5" fill="#94a3b8">{v}</text>
                          </g>
                        ))}
                        {/* x축 레이블 */}
                        {folderExams.map((exam, i) => (
                          <text key={exam.id} x={xPos(i)} y={H-PAD.bottom+14} textAnchor="middle" fontSize="15" fill="#64748b">
                            {exam.round}차
                          </text>
                        ))}
                        {/* 축 */}
                        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H-PAD.bottom} stroke="#e2e8f0" strokeWidth="1"/>
                        <line x1={PAD.left} x2={W-PAD.right} y1={H-PAD.bottom} y2={H-PAD.bottom} stroke="#e2e8f0" strokeWidth="1"/>

                        {/* 학생별 선 */}
                        {allFolderStudents.map((s, si) => {
                          if (!selectedIds.includes(s.id)) return null;
                          const color = COLORS[si % COLORS.length];
                          const points = folderExams.map((exam, i) => {
                            const score = allMockResults[exam.id]?.[s.id]?.score;
                            if (score == null) return null;
                            return { x: xPos(i), y: yPos(score), score, examIdx: i };
                          });
                          const validPoints = points.filter(Boolean);
                          if (validPoints.length === 0) return null;

                          // polyline
                          const pathD = validPoints.map((p,pi) => `${pi===0?"M":"L"} ${p.x} ${p.y}`).join(" ");

                          const lastPt = validPoints[validPoints.length - 1];
                          return (
                            <g key={s.id}>
                              <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
                              {validPoints.map((p, pi) => (
                                <circle key={pi} cx={p.x} cy={p.y} r="4" fill={color} stroke="white" strokeWidth="1.5"
                                  style={{cursor:"pointer"}}
                                  onMouseEnter={() => setHovered({examIdx:p.examIdx, studentId:s.id, x:p.x, y:p.y, score:p.score, name:s.name, color})}
                                  onMouseLeave={() => setHovered(null)}/>
                              ))}
                              {lastPt && (
                                <text x={lastPt.x + 7} y={lastPt.y + 4} fontSize="13.5" fill={color} fontWeight="700">{s.name}</text>
                              )}
                            </g>
                          );
                        })}

                        {/* 툴팁 */}
                        {hovered && (() => {
                          const exam = folderExams[hovered.examIdx];
                          const total = exam?.totalScore ? Math.round(exam.totalScore*100)/100 : null;
                          const tx = Math.min(hovered.x + 8, W - 90);
                          const ty = Math.max(hovered.y - 36, PAD.top);
                          return (
                            <g>
                              <rect x={tx} y={ty} width="88" height="34" rx="6" fill="white" stroke={hovered.color} strokeWidth="1.2" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.15))"/>
                              <text x={tx+8} y={ty+13} fontSize="15" fill="#1e293b" fontWeight="600">{hovered.name}</text>
                              <text x={tx+8} y={ty+26} fontSize="15" fill={hovered.color} fontWeight="700">
                                {Math.round(hovered.score*100)/100}{total?`/${total}`:""}점
                              </text>
                            </g>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* 범례 */}
                    <div className="flex flex-wrap gap-3 px-1" style={{flexShrink:0}}>
                      {allFolderStudents.filter(s=>selectedIds.includes(s.id)).map((s,i) => {
                        const color = COLORS[allFolderStudents.indexOf(s) % COLORS.length];
                        return (
                          <div key={s.id} className="flex items-center gap-1.5">
                            <div className="w-4 h-0.5 rounded-full" style={{background:color}}/>
                            <div className="w-2 h-2 rounded-full" style={{background:color}}/>
                            <span className="text-xs text-slate-600">{s.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              };

              return (
              <div className="grid gap-4" style={{gridTemplateColumns:"2fr 1fr", alignItems:"start"}}>
              {/* ── 왼쪽: 꺾은선 그래프 대시보드 ── */}
              <Card className="p-4 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">성적 추이</div>
                {allFolderStudents.length === 0
                  ? <div className="text-sm text-slate-400 text-center py-8">배정된 학생이 없습니다.</div>
                  : <FolderChart/>
                }
              </Card>

              {/* ── 오른쪽: 시험 카드 목록 ── */}
              <div style={{position:"sticky", top:"1rem", maxHeight:"calc(100vh - 200px)", overflowY:"auto", display:"flex", flexDirection:"column", gap:"0.75rem"}}>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">시험 목록</div>
                {folderExams.map(e => (
                  <Card key={e.id} className="p-3 space-y-2" style={{flexShrink:0}}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm flex-1 min-w-0 truncate">{e.name}</span>
                      <Badge variant="secondary">{e.round}차</Badge>
                    </div>
                    <div className="text-xs text-slate-500">
                      {e.questionCount}문항 · {e.totalScore ? Math.round(e.totalScore*100)/100 : "-"}점 · {(e.students||[]).length}명
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={()=>openMockResults(e)}
                        className="text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-medium hover:bg-indigo-100 border border-indigo-100">결과입력</button>
                      <button onClick={()=>startEditMock(e)}
                        className="text-xs px-2 py-1 rounded-lg bg-slate-50 text-slate-600 font-medium hover:bg-slate-100 border border-slate-200">수정</button>
                      <button onClick={async()=>{ if(!confirm("삭제?")) return; await db.ref(`mockExams/${e.id}`).remove(); }}
                        className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500 font-medium hover:bg-red-100 border border-red-100">삭제</button>
                    </div>
                  </Card>
                ))}
              </div>

            </div>
              );
            })()
        }
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-bold">등록된 평가 ({assessments.length})</h2>

        {/* 폴더 */}
        <div>
          <div className="flex gap-2 mb-3">
            <input value={assessmentFolderForm} onChange={e=>setAssessmentFolderForm(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addAssessmentFolder()}
              placeholder="새 폴더명 입력"
              className="flex-1 rounded-xl border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"/>
            <Btn onClick={addAssessmentFolder}>+ 폴더 추가</Btn>
          </div>
          {assessmentFolders.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {assessmentFolders.map(folder => {
                const count = assessments.filter(a => a.folderId === folder.id).length;
                const isDragOver = draggingAssessmentId && dragOverAssessmentFolder === folder.id;
                return (
                  <div key={folder.id} className="group relative"
                    onDragOver={draggingAssessmentId ? (e=>{e.preventDefault();setDragOverAssessmentFolder(folder.id);}) : undefined}
                    onDragLeave={draggingAssessmentId ? (()=>setDragOverAssessmentFolder(null)) : undefined}
                    onDrop={draggingAssessmentId ? (e=>{e.preventDefault();dropAssessment(folder.id);}) : undefined}>
                    <button type="button" onClick={() => !draggingAssessmentId && openAssessmentFolder(folder)}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 transition
                        ${isDragOver ? "border-blue-500 bg-blue-200 shadow" : "border-blue-200 bg-blue-50 hover:bg-blue-100"}`}
                      style={{width:130,height:130}}>
                      <span className="text-3xl leading-none">📁</span>
                      <span className="text-xs font-semibold text-blue-900 text-center leading-tight line-clamp-2 px-2">{folder.name}</span>
                      <span className="text-[10px] text-blue-600">{isDragOver ? "여기에 놓기" : `${count}개`}</span>
                    </button>
                    {!draggingAssessmentId && (
                      <button type="button"
                        onClick={e=>{e.stopPropagation(); deleteAssessmentFolder(folder.id);}}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 text-[9px] leading-none opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 미분류 평가 */}
        {(() => {
          const unclassified = assessments.filter(a => !a.folderId);
          if (unclassified.length === 0 && assessmentFolders.length > 0) return null;
          return (
            <div>
              {assessmentFolders.length > 0 && <div className="text-xs font-semibold text-slate-400 mb-2">미분류</div>}
              {unclassified.length === 0
                ? <div
                    onDragOver={draggingAssessmentId ? (e=>{e.preventDefault();setDragOverAssessmentFolder("__root__");}) : undefined}
                    onDragLeave={draggingAssessmentId ? (()=>setDragOverAssessmentFolder(null)) : undefined}
                    onDrop={draggingAssessmentId ? (e=>{e.preventDefault();dropAssessment(null);}) : undefined}
                    className={`rounded-2xl border border-dashed p-6 text-sm text-center transition ${dragOverAssessmentFolder==="__root__"?"border-blue-400 bg-blue-50 text-blue-500":"text-slate-400"}`}>
                    {dragOverAssessmentFolder==="__root__" ? "여기에 놓으면 미분류로 이동" : "아직 등록된 평가가 없습니다."}
                  </div>
                : <div className="space-y-2"
                    onDragOver={draggingAssessmentId ? (e=>{e.preventDefault();setDragOverAssessmentFolder("__root__");}) : undefined}
                    onDragLeave={draggingAssessmentId ? (e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOverAssessmentFolder(null);}) : undefined}
                    onDrop={draggingAssessmentId ? (e=>{e.preventDefault();dropAssessment(null);}) : undefined}>
                    {unclassified.map(a => (
                      <div key={a.id} draggable
                        onDragStart={()=>setDraggingAssessmentId(a.id)}
                        onDragEnd={()=>{setDraggingAssessmentId(null);setDragOverAssessmentFolder(null);}}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition cursor-grab active:cursor-grabbing ${draggingAssessmentId===a.id?"opacity-40":""}`}>
                        <span className="text-slate-300 text-sm select-none">⠿</span>
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
            </div>
          );
        })()}
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
          : <div className="flex flex-wrap gap-2">
              {mockFolders.map(folder => {
                const examCount = mockExams.filter(e => e.folderId === folder.id).length;
                return (
                  <div key={folder.id} className="group relative">
                    <button type="button" onClick={() => openFolder(folder)}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition"
                      style={{width:130,height:130}}>
                      <span className="text-3xl leading-none">📁</span>
                      <span className="text-xs font-semibold text-amber-900 text-center leading-tight line-clamp-2 px-2">{folder.name}</span>
                      <span className="text-[10px] text-amber-600">{examCount}개</span>
                    </button>
                    <button type="button"
                      onClick={e=>{e.stopPropagation(); deleteFolder(folder.id);}}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 text-[9px] leading-none opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
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
      <div className="flex justify-center">
      <div className="inline-flex gap-2 bg-white rounded-2xl shadow-sm p-1">
        {[["editor","🗺️ 커리큘럼 편집"],["materials","📚 교재 관리"]].map(([tab,label])=>(
          <button key={tab} onClick={()=>setSubTab(tab)}
            className={`py-2.5 px-8 text-sm font-medium rounded-xl transition ${subTab===tab?"bg-slate-900 text-white":"text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>
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
    </div>
  );
}

// ── 학생/학부모용 간단 교재 카드 (이미지/편집 없음) ──────────────────────────
function StudentMatCard({ node, allStatuses }) {
  const totalProblems = Number(node.totalProblems) || 0;
  const startNum = Number(node.problemStart) || 1;
  const endNum = node.problemEnd ? Number(node.problemEnd) : startNum + totalProblems - 1;
  const statuses = allStatuses[node.materialId] || {};

  const counts = { correct: 0, wrong: 0, unknown: 0, null: 0 };
  for (let i = startNum; i <= endNum; i++) counts[statuses[i] || "null"]++;

  const CARD_COLS = 20;
  const rows = [];
  for (let r = 0; r < Math.ceil(totalProblems / CARD_COLS); r++) {
    const rowStart = startNum + r * CARD_COLS;
    const rowEnd = Math.min(endNum, rowStart + CARD_COLS - 1);
    rows.push(Array.from({ length: rowEnd - rowStart + 1 }, (_, c) => rowStart + c));
  }

  if (totalProblems === 0) return null;

  const doneCount = counts.correct + counts.wrong + counts.unknown;
  const pct = totalProblems ? Math.round(doneCount / totalProblems * 100) : 0;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{node.materialName}</h3>
          <span className="text-xs text-slate-400">{doneCount}/{totalProblems} ({pct}%)</span>
        </div>
        <div className="flex gap-3">
          {[["correct","맞음"],["wrong","틀림"],["unknown","모름"],["null","미체크"]].map(([k,label]) => (
            <div key={k} className="flex items-center gap-1 text-xs text-slate-500">
              <div className="w-3 h-3 rounded" style={{ background: STATUS_STYLE[k].bg }}/>
              <span>{label} {counts[k]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1 overflow-x-auto">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1">
            <div className="w-10 text-right text-[10px] text-slate-400 shrink-0 self-center pr-1">{row[0]}~</div>
            {row.map(num => {
              const st = statuses[num] || null;
              const sty = STATUS_STYLE[st];
              return (
                <div key={num}
                  style={{ background: sty.bg, color: sty.text, width:24, height:24, borderRadius:4, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {num}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── 학생용 커리큘럼 뷰 ───────────────────────────────────────────────────────
function StudentCurriculumView({ studentId, materials = [] }) {
  const [allNodes, setAllNodes] = React.useState({});
  const [allPaths, setAllPaths] = React.useState({});
  const [allStatuses, setAllStatuses] = React.useState({});

  React.useEffect(() => {
    const ref = db.ref("curriculumNodes");
    ref.on("value", snap => setAllNodes(snap.val() || {}));
    return () => ref.off();
  }, []);

  React.useEffect(() => {
    const ref = db.ref("studentPaths");
    ref.on("value", snap => setAllPaths(snap.val() || {}));
    return () => ref.off();
  }, []);

  React.useEffect(() => {
    if (!studentId) return;
    const ref = db.ref(`problemStatus/${studentId}`);
    ref.on("value", snap => setAllStatuses(snap.val() || {}));
    return () => ref.off();
  }, [studentId]);

  // 보드별로 start_studentId를 찾아 경로 수집
  // studentPaths가 있으면 해당 엣지만 따라감, 없으면 BFS
  const getPath = () => {
    const startNodeId = `start_${studentId}`;
    const result = [];
    const visitedGlobal = new Set();
    Object.entries(allNodes).forEach(([boardId, boardNodes]) => {
      if (!boardNodes[startNodeId]) return;
      const customEdges = allPaths[boardId]?.[studentId]; // { "fromId__toId": true }
      const hasCustom = customEdges && Object.keys(customEdges).length > 0;
      let curId = startNodeId;
      const visited = new Set();
      if (hasCustom) {
        // 커스텀 경로: 엣지 셋에 포함된 연결만 따라가며 순서대로 탐색
        while (curId && !visited.has(curId)) {
          visited.add(curId);
          visitedGlobal.add(curId);
          const node = boardNodes[curId];
          if (!node) break;
          if (node.type === "material") result.push(node);
          const nextId = (node.nextNodes || []).find(nid => customEdges[`${curId}__${nid}`]);
          curId = nextId || null;
        }
      } else {
        // 커스텀 경로 없으면 BFS
        const queue = [startNodeId];
        while (queue.length) {
          const nodeId = queue.shift();
          if (visited.has(nodeId) || visitedGlobal.has(nodeId)) continue;
          visited.add(nodeId);
          visitedGlobal.add(nodeId);
          const node = boardNodes[nodeId];
          if (!node) continue;
          if (node.type === "material") result.push(node);
          for (const nid of (node.nextNodes || [])) queue.push(nid);
        }
      }
    });
    return result;
  };

  const path = getPath();

  const startNodeId = `start_${studentId}`;
  const hasStart = Object.values(allNodes).some(b => b[startNodeId]);
  if (!hasStart) return (
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
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-600">총 {path.length}개 교재</div>
      {path.map((node) => {
        const fullMat = materials.find(m => m.id === node.materialId) || {};
        const mergedNode = { ...fullMat, ...node, materialName: node.materialName || fullMat.name };
        return (
          <StudentMatCard
            key={node.id}
            node={mergedNode}
            allStatuses={allStatuses}
          />
        );
      })}
    </div>
  );
}
