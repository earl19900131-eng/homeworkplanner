// ── 학부모 보고서 섹션 ───────────────────────────────────────────────────────
function ParentReportsSection({ studentId, studentName, studentClass }) {
  const [reports, setReports] = React.useState([]);
  const [modal, setModal] = React.useState(null);
  const READ_KEY = `hwp-read-reports-${studentId}`;
  const [readKeys, setReadKeys] = React.useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); }
    catch { return new Set(); }
  });

  const markRead = (lessonKey) => {
    setReadKeys(prev => {
      const next = new Set(prev);
      next.add(lessonKey);
      localStorage.setItem(READ_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  React.useEffect(() => {
    const ref = db.ref(`parentReportIndex/${studentId}`);
    ref.on("value", snap => {
      const data = snap.val() || {};
      const arr = Object.entries(data)
        .map(([lessonKey, v]) => ({ ...v, lessonKey }))
        .sort((a, b) => (b.sentAt || "").localeCompare(a.sentAt || ""));
      setReports(arr);
    });
    return () => ref.off();
  }, [studentId]);

  const DOW = ["일","월","화","수","목","금","토"];
  const fmtDate = (d) => { if (!d) return ""; try { const o = new Date(d); return `${d} (${DOW[o.getDay()]})`; } catch { return d; } };
  const fmtSentTime = (iso) => { if (!iso) return ""; const d = new Date(iso); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };

  if (reports.length === 0) return (
    <div className="rounded-2xl border border-dashed p-8 text-sm text-slate-400 text-center">
      아직 발송된 보고서가 없습니다.<br/>수업 후 선생님이 보고서를 발송하면 여기에 표시됩니다.
    </div>
  );

  const NEG_TAGS = new Set(["지각","결석","무단결석","숙제미이행","노트미지참"]);
  const section = (title, children) => (
    <div className="space-y-1">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</div>
      <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 text-sm text-slate-700">{children}</div>
    </div>
  );

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">수업 보고서</h2>
      {reports.map(r => {
        const tags = r.tags || [];
        const isAbsent = tags.includes("결석") || tags.includes("무단결석");
        const isLate = tags.includes("지각");
        return (
          <button key={r.lessonKey} type="button"
            className="w-full text-left rounded-2xl border bg-white px-4 py-3 flex items-center justify-between gap-2 hover:border-blue-200 hover:shadow-sm transition"
            style={{borderColor: readKeys.has(r.lessonKey) ? "#e2e8f0" : "#fca5a5"}}
            onClick={() => { setModal(r); markRead(r.lessonKey); }}>
            <div className="flex items-center gap-3 flex-wrap">
              {!readKeys.has(r.lessonKey) && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-red-500 text-white shrink-0">NEW</span>
              )}
              <div className="text-sm font-bold" style={{color:"#1a2340"}}>{fmtDate(r.date)}</div>
              <div className="text-xs text-slate-500">{r.lessonTitle}</div>
              {isAbsent && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-red-100 text-red-600">결석</span>}
              {isLate && !isAbsent && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-amber-100 text-amber-600">지각</span>}
            </div>
            <span className="text-[10px] text-slate-400 shrink-0">수신 {fmtSentTime(r.sentAt)} →</span>
          </button>
        );
      })}

      {/* 보고서 모달 */}
      {modal && (() => {
        const r = modal;
        const tags = r.tags || [];
        const hwDone = tags.includes("숙제해옴");
        const hwMiss = tags.includes("숙제미이행");
        const isAbsent = tags.includes("결석") || tags.includes("무단결석");
        const isLate = tags.includes("지각");
        const dateLabel = fmtDate(r.date);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModal(null)}>
            <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* 헤더 */}
              <div className="p-6 pb-4 border-b border-slate-200" style={{background:"linear-gradient(135deg,#1a2340,#2d3a6b)"}}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-blue-300 font-medium mb-1">수업 보고서</div>
                    <div className="text-xl font-bold text-white">{studentName}</div>
                    <div className="text-sm text-blue-200 mt-0.5">{studentClass}</div>
                  </div>
                  <button onClick={() => setModal(null)} className="text-white/60 hover:text-white text-2xl font-bold">×</button>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-3">
                  <div>
                    <div className="text-xs text-blue-300">{r.lessonTitle}</div>
                    <div className="text-xs text-blue-200">{dateLabel}{r.time ? " · " + r.time.slice(0,5) : ""}</div>
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
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg border ${hwDone?"bg-emerald-50 text-emerald-700 border-emerald-200":hwMiss?"bg-red-50 text-red-600 border-red-200":"bg-slate-100 text-slate-400 border-slate-200"}`}>
                      {hwDone?"✓ 해옴":hwMiss?"✗ 미이행":"미확인"}
                    </span>
                    <span className="text-slate-600">{r.hwText || <span className="text-slate-300">내용 없음</span>}</span>
                  </div>
                )}

                {/* 행동태그 */}
                {tags.length > 0 && section("행동태그",
                  <div className="flex flex-wrap gap-1">
                    {tags.map(name => (
                      <span key={name} className={`text-[10px] px-1.5 py-0.5 rounded-lg border font-medium ${NEG_TAGS.has(name)?"bg-red-50 text-red-600 border-red-200":"bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{name}</span>
                    ))}
                  </div>
                )}

                {/* 결석 사유 */}
                {isAbsent && r.absenceReason && section("결석 사유",
                  <span className="text-red-600">{r.absenceReason}</span>
                )}

                {/* 강사 코멘트 */}
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
    </div>
  );
}

// ── 학부모 알림 섹션 ─────────────────────────────────────────────────────────
function ParentNoticesSection({ studentId }) {
  const [tab, setTab] = React.useState("broadcast");
  const [broadcasts, setBroadcasts] = React.useState([]);
  const [personal, setPersonal] = React.useState([]);
  const BC_READ_KEY = "hwp-read-bc";
  const PM_READ_KEY = `hwp-read-pm-${studentId}`;
  const [readBc, setReadBc] = React.useState(() => { try { return new Set(JSON.parse(localStorage.getItem(BC_READ_KEY)||"[]")); } catch { return new Set(); } });
  const [readPm, setReadPm] = React.useState(() => { try { return new Set(JSON.parse(localStorage.getItem(PM_READ_KEY)||"[]")); } catch { return new Set(); } });

  React.useEffect(() => {
    const ref = db.ref("parentBroadcast");
    ref.on("value", snap => {
      const data = snap.val() || {};
      setBroadcasts(Object.entries(data).map(([k,v])=>({...v,id:k})).sort((a,b)=>b.sentAt.localeCompare(a.sentAt)));
    });
    return () => ref.off();
  }, []);

  React.useEffect(() => {
    const ref = db.ref(`parentMessages/${studentId}`);
    ref.on("value", snap => {
      const data = snap.val() || {};
      setPersonal(Object.entries(data).map(([k,v])=>({...v,id:k})).sort((a,b)=>b.sentAt.localeCompare(a.sentAt)));
    });
    return () => ref.off();
  }, [studentId]);

  const DOW = ["일","월","화","수","목","금","토"];
  const fmtDate = (iso) => { if (!iso) return ""; const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} (${DOW[d.getDay()]}) ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };

  const markBc = (id) => setReadBc(prev => { const n=new Set(prev);n.add(id);localStorage.setItem(BC_READ_KEY,JSON.stringify([...n]));return n; });
  const markPm = (id) => setReadPm(prev => { const n=new Set(prev);n.add(id);localStorage.setItem(PM_READ_KEY,JSON.stringify([...n]));return n; });

  const [openItem, setOpenItem] = React.useState(null);

  const bcUnread = broadcasts.filter(n=>!readBc.has(n.id)).length;
  const pmUnread = personal.filter(n=>!readPm.has(n.id)).length;

  const NoticeCard = ({ item, isRead, onOpen }) => (
    <button type="button" onClick={onOpen}
      className="w-full text-left rounded-2xl border bg-white px-4 py-3 space-y-1 hover:border-blue-200 hover:shadow-sm transition"
      style={{borderColor: isRead ? "#e2e8f0" : "#fca5a5"}}>
      <div className="flex items-center gap-2">
        {!isRead && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-red-500 text-white shrink-0">NEW</span>}
        <span className="text-sm font-bold text-slate-800">{item.title}</span>
      </div>
      <div className="text-xs text-slate-400">{fmtDate(item.sentAt)}</div>
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2 bg-slate-100 rounded-2xl p-1">
        {[["broadcast", `전체 알림${bcUnread>0?` (${bcUnread})`:"" }`],["personal",`개인 알림${pmUnread>0?` (${pmUnread})`:"" }`]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition ${tab===k?"bg-white shadow-sm text-slate-800":"text-slate-500"}`}>{l}
          </button>
        ))}
      </div>

      {tab==="broadcast" && (
        broadcasts.length===0
          ? <div className="rounded-2xl border border-dashed p-8 text-sm text-slate-400 text-center">전체 알림이 없습니다.</div>
          : broadcasts.map(n => <NoticeCard key={n.id} item={n} isRead={readBc.has(n.id)} onOpen={()=>{setOpenItem({...n,type:"bc"});markBc(n.id);}}/>)
      )}
      {tab==="personal" && (
        personal.length===0
          ? <div className="rounded-2xl border border-dashed p-8 text-sm text-slate-400 text-center">개인 알림이 없습니다.</div>
          : personal.map(n => <NoticeCard key={n.id} item={n} isRead={readPm.has(n.id)} onOpen={()=>{setOpenItem({...n,type:"pm"});markPm(n.id);}}/>)
      )}

      {openItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={()=>setOpenItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-400 mb-1">{openItem.type==="bc"?"전체 알림":"개인 알림"} · {fmtDate(openItem.sentAt)}</div>
                <div className="text-lg font-bold text-slate-800">{openItem.title}</div>
              </div>
              <button onClick={()=>setOpenItem(null)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold ml-3">×</button>
            </div>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl px-4 py-3">{openItem.body}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 밀린 학생 모달 ────────────────────────────────────────────────────────────
function OverdueModal({ teacherStats, overdueGradeFilter, setOverdueGradeFilter, onClose }) {
  const [msgSending, setMsgSending] = React.useState(false);
  const [msgDone, setMsgDone] = React.useState(false);
  const GRADES = ["중1","중2","중3","고1","고2","고3"];
  const overdueList = teacherStats.filter(s => s.overdueChunks >= 1);
  const filtered = overdueGradeFilter === "all" ? overdueList : overdueList.filter(s => s.className === overdueGradeFilter);

  const sendOverdueMsg = async () => {
    if (!filtered.length) return;
    setMsgSending(true);
    const studentIds = filtered.map(s => ({ id: s.id, name: s.name, overdueCount: s.overdueHyun + s.overdueSum }));
    try {
      const res = await fetch("https://us-central1-homeworkplanner-e90a3.cloudfunctions.net/sendOverdueAlert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds }),
      });
      const data = await res.json();
      console.log("알림 발송:", data);
    } catch(e) { console.error("알림 발송 실패", e); }
    setMsgSending(false); setMsgDone(true);
    setTimeout(() => setMsgDone(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4 flex flex-col"
        style={{resize:"vertical", overflow:"hidden", minHeight:"260px", maxHeight:"90vh"}}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold">⚠️ 밀린 학생 목록</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <button onClick={() => setOverdueGradeFilter("all")} className={`px-3 py-1 rounded-xl text-sm font-medium border transition ${overdueGradeFilter==="all"?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>전체</button>
          {GRADES.map(g => (
            <button key={g} onClick={() => setOverdueGradeFilter(g)} className={`px-3 py-1 rounded-xl text-sm font-medium border transition ${overdueGradeFilter===g?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>{g}</button>
          ))}
        </div>
        {filtered.length === 0
          ? <div className="text-sm text-slate-400 text-center py-6 shrink-0">해당 학년에 밀린 학생이 없습니다.</div>
          : <div className="space-y-2 overflow-y-auto flex-1">
              {filtered.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3">
                  <div>
                    <span className="font-semibold text-sm">{s.name}</span>
                    <span className="ml-2 text-xs text-slate-400 bg-slate-200 rounded px-1.5 py-0.5">{s.className}</span>
                  </div>
                  <span className="text-sm text-red-600 font-medium">
                    {s.overdueHyun>0&&s.overdueSum>0 ? `현 ${s.overdueHyun}개 / 추 ${s.overdueSum}개 밀림`
                      : s.overdueHyun>0 ? `현행 ${s.overdueHyun}개 밀림`
                      : `추가 ${s.overdueSum}개 밀림`}
                  </span>
                </div>
              ))}
            </div>
        }
        {filtered.length > 0 && (
          <button onClick={sendOverdueMsg} disabled={msgSending || msgDone}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white shrink-0 transition"
            style={{background: msgDone ? "#22c55e" : "#dc2626", opacity: msgSending ? 0.6 : 1}}>
            {msgSending ? "발송 중..." : msgDone ? `✓ ${filtered.length}명 발송 완료` : `📢 밀린 학생 ${filtered.length}명에게 알림 발송`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── 선생님 학부모 알림 발송 탭 ────────────────────────────────────────────────
function TeacherNoticesTab({ students }) {
  const [tab, setTab] = React.useState("broadcast");
  const [selStudentId, setSelStudentId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sentOk, setSentOk] = React.useState(false);
  const [broadcasts, setBroadcasts] = React.useState([]);
  const [personal, setPersonal] = React.useState([]);
  const [logs, setLogs] = React.useState([]);

  React.useEffect(() => {
    const ref = db.ref("parentBroadcast");
    ref.on("value", snap => {
      const data = snap.val() || {};
      setBroadcasts(Object.entries(data).map(([k,v])=>({...v,id:k})).sort((a,b)=>b.sentAt.localeCompare(a.sentAt)));
    });
    return () => ref.off();
  }, []);

  React.useEffect(() => {
    if (!selStudentId) { setPersonal([]); return; }
    const ref = db.ref(`parentMessages/${selStudentId}`);
    ref.on("value", snap => {
      const data = snap.val() || {};
      setPersonal(Object.entries(data).map(([k,v])=>({...v,id:k})).sort((a,b)=>b.sentAt.localeCompare(a.sentAt)));
    });
    return () => ref.off();
  }, [selStudentId]);

  React.useEffect(() => {
    if (tab !== "logs") return;
    const ref = db.ref("notificationLogs");
    ref.on("value", snap => {
      const data = snap.val() || {};
      setLogs(Object.entries(data).map(([k,v])=>({...v,id:k})).sort((a,b)=>b.sentAt.localeCompare(a.sentAt)));
    });
    return () => ref.off();
  }, [tab]);

  const DOW = ["일","월","화","수","목","금","토"];
  const fmtDate = (iso) => { if (!iso) return ""; const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} (${DOW[d.getDay()]}) ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };

  const send = async () => {
    if (!title.trim() || !body.trim()) return;
    if (tab==="personal" && !selStudentId) return;
    setSending(true);
    const sentAt = new Date().toISOString();
    const id = Date.now().toString();
    if (tab==="broadcast") {
      await db.ref(`parentBroadcast/${id}`).set({ title:title.trim(), body:body.trim(), sentAt });
    } else {
      await db.ref(`parentMessages/${selStudentId}/${id}`).set({ title:title.trim(), body:body.trim(), sentAt });
    }
    setTitle(""); setBody(""); setSending(false); setSentOk(true);
    setTimeout(()=>setSentOk(false), 2000);
  };

  const del = async (type, id, studentId) => {
    if (!confirm("삭제할까요?")) return;
    if (type==="bc") await db.ref(`parentBroadcast/${id}`).remove();
    else await db.ref(`parentMessages/${studentId}/${id}`).remove();
  };

  const inp = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300";
  const TYPE_LABEL = { auto_daily:"자동(미완료)", manual_overdue:"수동(밀림)", report:"보고서" };
  const TYPE_COLOR = { auto_daily:"text-amber-600 bg-amber-50", manual_overdue:"text-red-600 bg-red-50", report:"text-blue-600 bg-blue-50" };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
      <div className="inline-flex gap-2 bg-white rounded-2xl p-1" style={{boxShadow:"0px 0px 0px 1px rgba(74,107,214,0.08), 0px 2px 8px rgba(74,107,214,0.06)"}}>
        {[["broadcast","전체 알림"],["personal","개인 알림"],["logs","발송 로그"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`py-2 px-6 text-sm font-bold rounded-xl transition ${tab===k?"text-white":"text-slate-500"}`}
            style={tab===k?{background:"#1a2340"}:{}}>
            {l}
          </button>
        ))}
      </div>
      </div>

      {tab !== "logs" && <Card className="p-4 space-y-3">
        <h3 className="font-bold text-sm">새 {tab==="broadcast"?"전체":"개인"} 알림 발송</h3>
        {tab==="personal" && (
          <select value={selStudentId} onChange={e=>setSelStudentId(e.target.value)} className={inp}>
            <option value="">학생 선택...</option>
            {students.map(s=><option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
          </select>
        )}
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="제목" className={inp}/>
        <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="내용" rows={4} className={`${inp} resize-none`}/>
        <button onClick={send} disabled={sending||sentOk||!title.trim()||!body.trim()||(tab==="personal"&&!selStudentId)}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition"
          style={{background: sentOk?"#22c55e":"#1a2340", opacity: (sending||!title.trim()||!body.trim())?0.5:1}}>
          {sending?"발송 중...":sentOk?"발송 완료!":"발송"}
        </button>
      </Card>}

      {tab !== "logs" && <Card className="p-4 space-y-3">
        <h3 className="font-bold text-sm text-slate-500">발송 내역</h3>
        {tab==="broadcast" && (
          broadcasts.length===0
            ? <div className="text-xs text-slate-400 text-center py-4">발송 내역 없음</div>
            : broadcasts.map(n=>(
              <div key={n.id} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                <div>
                  <div className="text-sm font-medium text-slate-800">{n.title}</div>
                  <div className="text-xs text-slate-400">{fmtDate(n.sentAt)}</div>
                </div>
                <button onClick={()=>del("bc",n.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">삭제</button>
              </div>
            ))
        )}
        {tab==="personal" && (
          !selStudentId
            ? <div className="text-xs text-slate-400 text-center py-4">학생을 선택하면 내역이 표시됩니다.</div>
            : personal.length===0
              ? <div className="text-xs text-slate-400 text-center py-4">발송 내역 없음</div>
              : personal.map(n=>(
                <div key={n.id} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{n.title}</div>
                    <div className="text-xs text-slate-400">{fmtDate(n.sentAt)}</div>
                  </div>
                  <button onClick={()=>del("personal",n.id,selStudentId)} className="text-xs text-red-400 hover:text-red-600 shrink-0">삭제</button>
                </div>
              ))
        )}
      </Card>}

      {tab==="logs" && <Card className="p-4 space-y-3">
        <h3 className="font-bold text-sm text-slate-500">알림 발송 로그 ({logs.length}건)</h3>
        {logs.length===0
          ? <div className="text-xs text-slate-400 text-center py-6">로그 없음</div>
          : logs.map(log=>(
            <div key={log.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLOR[log.type]||"text-slate-600 bg-slate-100"}`}>{TYPE_LABEL[log.type]||log.type}</span>
                <span className="text-sm font-medium text-slate-800">{log.title}</span>
              </div>
              <div className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                <span className="font-bold text-slate-500">메시지:</span> {log.body}
              </div>
              <div className="text-xs text-slate-400">{fmtDate(log.sentAt)}</div>
              {(() => {
                const succList = log.successNames ? log.successNames.split(", ").filter(Boolean) : [];
                const failList = log.failedNames ? log.failedNames.split(", ").filter(Boolean) : [];
                return (<>
                  {succList.length > 0 && (
                    <div className="text-xs bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-emerald-700">
                      <div className="font-bold mb-0.5">✓ 수신 성공 ({succList.length}명)</div>
                      <div>{succList.join(", ")}</div>
                    </div>
                  )}
                  {failList.length > 0 && (
                    <div className="text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-red-600">
                      <div className="font-bold mb-0.5">✗ 수신 실패 ({failList.length}명)</div>
                      <div>{failList.join(", ")}</div>
                    </div>
                  )}
                  {succList.length === 0 && failList.length === 0 && log.sentCount === 0 && (
                    <div className="text-xs text-slate-400">발송 대상 없음</div>
                  )}
                </>);
              })()}
            </div>
          ))
        }
      </Card>}
    </div>
  );
}

// ── 학부모 출결 캘린더 ────────────────────────────────────────────────────────
function ParentAttendanceCalendar({ studentId }) {
  const today = new Date();
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth()); // 0-indexed
  const [lessons, setLessons] = React.useState([]);
  const [attendance, setAttendance] = React.useState({});
  const [selectedDay, setSelectedDay] = React.useState(null);

  React.useEffect(() => {
    const ref = db.ref("lessons");
    ref.on("value", snap => {
      const data = snap.val() || {};
      setLessons(Object.entries(data).map(([k,v])=>({...v,_key:k})).filter(l=>(l.studentIds||[]).includes(studentId)));
    });
    return () => ref.off();
  }, [studentId]);

  React.useEffect(() => {
    const ref = db.ref(`lessonAttendance`);
    ref.on("value", snap => {
      const data = snap.val() || {};
      // { lessonKey: { studentId: { tags, absenceReason, ... } } }
      const result = {};
      Object.entries(data).forEach(([lessonKey, students]) => {
        if (students[studentId]) result[lessonKey] = students[studentId];
      });
      setAttendance(result);
    });
    return () => ref.off();
  }, [studentId]);

  const prevMonth = () => { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); setSelectedDay(null); };
  const nextMonth = () => { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); setSelectedDay(null); };

  // 날짜별 수업 맵
  const dayMap = React.useMemo(() => {
    const m = {};
    lessons.forEach(l => {
      if (!l.date) return;
      const [y,mo,d] = l.date.split("-").map(Number);
      if (y===year && mo-1===month) {
        if (!m[d]) m[d] = [];
        const rec = attendance[l._key] || {};
        m[d].push({ lesson:l, rec });
      }
    });
    return m;
  }, [lessons, attendance, year, month]);

  const getStatus = (entries) => {
    for (const { rec } of entries) {
      const tags = rec.tags || [];
      if (tags.includes("무단결석")) return "무단결석";
      if (tags.includes("결석")) return "결석";
      if (tags.includes("지각")) return "지각";
      if (tags.includes("출석")) return tags.includes("지각안함") ? "지각안함" : "출석";
    }
    return "수업";
  };

  const STATUS_COLOR = {
    "출석":    { bg:"#dcfce7", text:"#15803d", dot:"#22c55e", label:"출석" },
    "지각안함": { bg:"#dcfce7", text:"#15803d", dot:"#22c55e", label:"출석" },
    "지각":    { bg:"#fef9c3", text:"#a16207", dot:"#eab308", label:"지각" },
    "결석":    { bg:"#fee2e2", text:"#dc2626", dot:"#ef4444", label:"결석" },
    "무단결석": { bg:"#fce7f3", text:"#9d174d", dot:"#ec4899", label:"무단결석" },
    "수업":    { bg:"#f1f5f9", text:"#64748b", dot:"#94a3b8", label:"수업" },
  };

  const DOW_LABELS = ["일","월","화","수","목","금","토"];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells = [];
  for (let i=0;i<firstDay;i++) cells.push(null);
  for (let d=1;d<=daysInMonth;d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  // 월 통계
  const stats = { 출석:0, 지각:0, 결석:0, 무단결석:0 };
  Object.values(dayMap).forEach(entries => {
    const s = getStatus(entries);
    if (s==="출석"||s==="지각안함") stats["출석"]++;
    else if (s==="지각") stats["지각"]++;
    else if (s==="결석") stats["결석"]++;
    else if (s==="무단결석") stats["무단결석"]++;
  });

  const selEntries = selectedDay ? (dayMap[selectedDay] || []) : [];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 text-sm font-bold">‹</button>
        <div className="text-base font-bold" style={{color:"#1a2340"}}>{year}년 {month+1}월</div>
        <button onClick={nextMonth} className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 text-sm font-bold">›</button>
      </div>

      {/* 월 통계 */}
      <div className="grid grid-cols-4 gap-2">
        {[["출석","#22c55e"],["지각","#eab308"],["결석","#ef4444"],["무단결석","#ec4899"]].map(([k,color])=>(
          <div key={k} className="bg-white rounded-xl border border-slate-100 px-2 py-2 text-center">
            <div className="text-lg font-bold" style={{color}}>{stats[k]}</div>
            <div className="text-[10px] text-slate-400">{k}</div>
          </div>
        ))}
      </div>

      {/* 캘린더 */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DOW_LABELS.map((d,i)=>(
            <div key={d} className="py-2 text-center text-xs font-medium" style={{color: i===0?"#ef4444":i===6?"#3b82f6":"#64748b"}}>{d}</div>
          ))}
        </div>
        {/* 날짜 셀 */}
        <div className="grid grid-cols-7">
          {cells.map((d,i)=>{
            if (!d) return <div key={`e${i}`} className="aspect-square border-r border-b border-slate-50"/>;
            const entries = dayMap[d] || [];
            const hasLesson = entries.length > 0;
            const status = hasLesson ? getStatus(entries) : null;
            const sc = status ? STATUS_COLOR[status] : null;
            const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const isToday = dateStr === todayStr;
            const isSel = selectedDay === d;
            const dow = (firstDay + d - 1) % 7;
            return (
              <div key={d} onClick={()=>hasLesson&&setSelectedDay(isSel?null:d)}
                className={`aspect-square border-r border-b border-slate-50 flex flex-col items-center justify-center gap-0.5 transition ${hasLesson?"cursor-pointer hover:opacity-80":""} ${isSel?"ring-2 ring-inset ring-blue-400":""}`}
                style={sc ? {background:sc.bg} : {}}>
                <span className="text-xs font-medium" style={{color: isToday?"#4a6bd6": dow===0?"#ef4444":dow===6?"#3b82f6":"#374151", fontWeight: isToday?800:undefined}}>
                  {d}
                </span>
                {sc && <div className="w-1.5 h-1.5 rounded-full" style={{background:sc.dot}}/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 범례 */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(STATUS_COLOR).filter(([k])=>k!=="지각안함"&&k!=="수업").map(([k,v])=>(
          <div key={k} className="flex items-center gap-1 text-xs text-slate-500">
            <div className="w-2.5 h-2.5 rounded-full" style={{background:v.dot}}/>
            {k}
          </div>
        ))}
      </div>

      {/* 선택 날짜 상세 */}
      {selectedDay && selEntries.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-bold text-slate-600">{month+1}월 {selectedDay}일 수업</div>
          {selEntries.map(({lesson:l, rec},i) => {
            const tags = rec.tags || [];
            const isAbsent = tags.includes("결석")||tags.includes("무단결석");
            const isLate = tags.includes("지각");
            const NEG = new Set(["지각","결석","무단결석","숙제미이행","노트미지참"]);
            return (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{l.title}</span>
                  {l.time && <span className="text-xs text-slate-400">{l.time.slice(0,5)}</span>}
                </div>
                {tags.length>0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.filter(t=>["출석","지각안함","지각","결석","무단결석"].includes(t)).map(t=>(
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-lg border font-medium"
                        style={NEG.has(t)?{background:"#fee2e2",color:"#dc2626",borderColor:"#fca5a5"}:{background:"#dcfce7",color:"#15803d",borderColor:"#86efac"}}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {isAbsent && rec.absenceReason && (
                  <div className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">사유: {rec.absenceReason}</div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center bg-slate-50 rounded-lg py-1.5">
                    <div className="text-slate-400 text-[10px]">등원</div>
                    <div className="font-bold" style={{color:"#15803d"}}>{rec.arrivalTime||"—"}</div>
                  </div>
                  <div className="text-center bg-slate-50 rounded-lg py-1.5">
                    <div className="text-slate-400 text-[10px]">하원</div>
                    <div className="font-bold" style={{color:"#1d4ed8"}}>{rec.departureTime||"—"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 완료 체크 오답 입력 모달 ────────────────────────────────────────────────
function CompletionModal({ startProblem, endProblem, problemNums, studentId, materialId, onClose, onConfirm }) {
  const [statuses, setStatuses] = React.useState({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!studentId || !materialId) { setLoading(false); return; }
    db.ref(`problemStatus/${studentId}/${materialId}`).once("value", snap => {
      setStatuses(snap.val() || {});
      setLoading(false);
    });
  }, [studentId, materialId]);

  // problemNums가 있으면 그것만, 없으면 startProblem~endProblem 순차
  const problems = React.useMemo(() => {
    if (problemNums && problemNums.length > 0) return problemNums;
    const arr = [];
    for (let p = startProblem; p <= endProblem; p++) arr.push(p);
    return arr;
  }, [problemNums, startProblem, endProblem]);

  const CYCLE = [null, "correct", "wrong", "unknown"];
  const STYLE = {
    correct: { bg:"#22c55e", text:"#fff", label:"맞음" },
    wrong:   { bg:"#ef4444", text:"#fff", label:"틀림" },
    unknown: { bg:"#8b5cf6", text:"#fff", label:"모름" },
    null:    { bg:"#f1f5f9", text:"#94a3b8", label:"미체크" },
  };

  const toggle = (num) => {
    const cur = statuses[num] || null;
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
    setStatuses(s => next === null ? (({ [num]: _, ...rest }) => rest)(s) : { ...s, [num]: next });
  };

  const handleConfirm = async () => {
    const updates = {};
    let checkedCount = 0;
    for (const p of problems) {
      const s = statuses[p] || null;
      updates[`problemStatus/${studentId}/${materialId}/${p}`] = s;
      if (s) checkedCount++;
    }
    await db.ref().update(updates);
    onConfirm(checkedCount, problems.length);
  };

  const COLS = 10;
  const rows = [];
  for (let r = 0; r < Math.ceil(problems.length / COLS); r++) {
    rows.push(problems.slice(r * COLS, r * COLS + COLS));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">오답 입력 ({startProblem}~{endProblem}번)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>
        <p className="text-xs text-slate-500">각 문제를 눌러 상태를 입력하세요. 미입력은 미체크로 저장됩니다.</p>
        <div className="flex gap-3 flex-wrap">
          {[["correct","맞음","#22c55e"],["wrong","틀림","#ef4444"],["unknown","모름","#8b5cf6"],["null","미체크","#f1f5f9"]].map(([k,label,bg])=>(
            <div key={k} className="flex items-center gap-1 text-xs text-slate-500">
              <div className="w-3.5 h-3.5 rounded" style={{background:bg,border:"1px solid #e2e8f0"}}/>
              {label}
            </div>
          ))}
        </div>
        {loading ? <div className="text-sm text-slate-400 text-center py-4">불러오는 중...</div> : (
          <div className="space-y-1.5 overflow-x-auto">
            {rows.map((row, ri) => (
              <div key={ri} className="flex gap-1.5">
                {row.map(num => {
                  const st = statuses[num] || null;
                  const sty = STYLE[st];
                  return (
                    <button key={num} onClick={() => toggle(num)}
                      style={{ background:sty.bg, color:sty.text }}
                      className="w-9 h-9 rounded-lg text-[11px] font-bold transition hover:opacity-80 shrink-0 border border-white/20">
                      {num}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={handleConfirm} className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700">완료 확인</button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50">취소</button>
        </div>
      </div>
    </div>
  );
}

// ── 학생 오늘 수업 섹션 ───────────────────────────────────────────────────────
const _BEHAVIOR_TAGS_MAP = (() => {
  const m = {};
  [
    { name:"지각안함",xp:3 },{ name:"지각",xp:-5 },{ name:"출석",xp:10 },{ name:"결석",xp:0 },{ name:"무단결석",xp:-50 },
    { name:"숙제해옴",xp:5 },{ name:"숙제미이행",xp:-10 },{ name:"노트미지참",xp:-5 },
  ].forEach(t => { m[t.name] = t; });
  return m;
})();

function StudentTodayLessonSection({ studentId, today, isParent }) {
  const [todayLessons, setTodayLessons] = React.useState([]);
  const [attendance, setAttendance] = React.useState({});
  const [profile, setProfile] = React.useState({});
  const [assessments, setAssessments] = React.useState({});

  React.useEffect(() => {
    const ref = db.ref("lessons");
    ref.on("value", snap => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([k, v]) => ({ ...v, _key: k }))
        .filter(l => l.date === today && (l.studentIds || []).includes(studentId));
      setTodayLessons(list);
    });
    return () => ref.off();
  }, [studentId, today]);

  React.useEffect(() => {
    if (todayLessons.length === 0) return;
    const refs = todayLessons.map(l => {
      const ref = db.ref(`lessonAttendance/${l._key}/${studentId}`);
      ref.on("value", snap => setAttendance(prev => ({ ...prev, [l._key]: snap.val() || {} })));
      return ref;
    });
    return () => refs.forEach(r => r.off());
  }, [todayLessons.map(l => l._key).join(","), studentId]);

  React.useEffect(() => {
    const pRef = db.ref(`studentProfiles/${studentId}`);
    pRef.on("value", snap => setProfile(snap.val() || {}));
    const aRef = db.ref("assessments");
    aRef.on("value", snap => {
      const data = snap.val() || {};
      setAssessments(data);
    });
    return () => { pRef.off(); aRef.off(); };
  }, [studentId]);

  const calcXpCp = (tags) => {
    let xp = 0, cp = 0;
    tags.forEach(name => { const t = _BEHAVIOR_TAGS_MAP[name]; if (t) { xp += t.xp || 0; } });
    return { xp, cp };
  };

  const handleArrival = async (lesson, currentRec) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2,"0");
    const mm = String(now.getMinutes()).padStart(2,"0");
    const arrTime = `${hh}:${mm}`;

    // 지각/출석 자동 태그
    const lessonTime = lesson.time ? lesson.time.slice(0,5) : null;
    const isLate = lessonTime && arrTime > lessonTime;

    const prevTags = currentRec.tags || [];
    let newTags = prevTags.filter(t => t !== "지각안함" && t !== "지각" && t !== "출석");
    if (isLate) {
      newTags.unshift("출석");
      newTags.unshift("지각");
    } else {
      newTags.unshift("지각안함");
      newTags.unshift("출석");
    }

    const { xp, cp } = calcXpCp(newTags);
    await db.ref(`lessonAttendance/${lesson._key}/${studentId}`).update({
      arrivalTime: arrTime,
      tags: newTags,
      xp, cp,
    });
  };

  const handleDeparture = async (lessonKey) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2,"0");
    const mm = String(now.getMinutes()).padStart(2,"0");
    await db.ref(`lessonAttendance/${lessonKey}/${studentId}/departureTime`).set(`${hh}:${mm}`);
  };

  const removeTag = async (lessonKey, tagName, currentRec) => {
    const newTags = (currentRec.tags || []).filter(t => t !== tagName);
    const { xp, cp } = calcXpCp(newTags);
    await db.ref(`lessonAttendance/${lessonKey}/${studentId}`).update({ tags: newTags, xp, cp });
  };

  if (todayLessons.length === 0) return null;

  const SESSION_COLORS = {
    "평가": { bg:"#fff7ed", border:"#fed7aa", text:"#c2410c" },
    "보강": { bg:"#f0fdf4", border:"#bbf7d0", text:"#15803d" },
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">오늘 수업</h2>
      {todayLessons.map(lesson => {
        const rec = attendance[lesson._key] || {};
        const sc = SESSION_COLORS[lesson.sessionType] || { bg:"#f8fafc", border:"#e2e8f0", text:"#475569" };
        const curType = rec.lessonType || "현행";
        const hwText = curType === "추가1" ? rec["추가1숙제"] : curType === "추가2" ? rec["추가2숙제"] : rec["현행숙제"];
        const tags = rec.tags || [];

        // 평가 정보
        const asmId = (curType === "추가1" || curType === "추가2") ? profile.advanceAssessment : profile.currentAssessment;
        const asm = asmId ? assessments[asmId] : null;
        // 단원번호 → 이름 변환
        const curUnitNum = profile.currentUnit || null;
        let unitName = null;
        if (asm && asm.type !== "누적테스트" && curUnitNum && asm.tree) {
          asm.tree.forEach((maj, mi) => {
            (maj.middles || []).forEach((mid, di) => {
              (mid.minors || []).forEach((min, ni) => {
                if (`${mi+1}${di+1}${ni+1}` === String(curUnitNum)) unitName = min.minor;
              });
            });
          });
        }
        const remaining = profile.remainingProblems != null ? profile.remainingProblems : (asm?.totalProblems || null);

        return (
          <div key={lesson._key} className="rounded-2xl border p-4 space-y-3"
            style={{ background: sc.bg, borderColor: sc.border }}>

            {/* 수업 헤더 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base">{lesson.title}</span>
              {lesson.sessionType && lesson.sessionType !== "수업" && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg border"
                  style={{ color: sc.text, borderColor: sc.border, background:"#fff" }}>
                  {lesson.sessionType}
                </span>
              )}
              {lesson.time && <span className="text-xs text-slate-400">{lesson.time.slice(0,5)}</span>}
            </div>

            {/* 숙제 + 평가 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-0.5">
                <div className="text-xs text-slate-400 font-medium">숙제</div>
                <div className="text-slate-700">{hwText || <span className="text-slate-300">없음</span>}</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-slate-400 font-medium">평가</div>
                {asm ? (
                  <div className="space-y-0.5">
                    <div className="text-slate-700 text-xs font-medium">{asm.name}</div>
                    {asm.type === "누적테스트"
                      ? <div className="text-xs text-slate-400">남은 문제: {remaining ?? "-"}문제</div>
                      : unitName
                        ? <div className="text-xs text-slate-400">소단원: {curUnitNum} {unitName}</div>
                        : <div className="text-xs text-slate-300">소단원 미지정</div>
                    }
                  </div>
                ) : <span className="text-slate-300 text-xs">미배정</span>}
              </div>
            </div>

            {/* 행동태그 */}
            {tags.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-slate-400 font-medium">행동태그</div>
                <div className="flex flex-wrap gap-1">
                  {tags.map(t => {
                    const def = _BEHAVIOR_TAGS_MAP[t];
                    const isNeg = def && def.xp < 0;
                    return (
                      <button key={t} type="button"
                        onClick={() => removeTag(lesson._key, t, rec)}
                        className={`text-[10px] px-1.5 py-0.5 rounded-lg border font-medium transition hover:opacity-70 ${isNeg ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                        {t} ×
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 등원/하원 버튼 - 학부모 화면에서는 시간만 표시 */}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => !isParent && handleArrival(lesson, rec)} disabled={isParent}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border transition hover:opacity-80"
                style={rec.arrivalTime
                  ? { background:"#dcfce7", color:"#15803d", borderColor:"#86efac" }
                  : { background:"#f1f5f9", color:"#475569", borderColor:"#e2e8f0" }}>
                {rec.arrivalTime ? `✓ 등원 ${rec.arrivalTime}` : "등원"}
              </button>
              <button type="button" onClick={() => !isParent && handleDeparture(lesson._key)} disabled={isParent}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border transition hover:opacity-80"
                style={rec.departureTime
                  ? { background:"#dbeafe", color:"#1d4ed8", borderColor:"#93c5fd" }
                  : { background:"#f1f5f9", color:"#475569", borderColor:"#e2e8f0" }}>
                {rec.departureTime ? `✓ 하원 ${rec.departureTime}` : "하원"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 메인 앱 ──────────────────────────────────────────────────────────────────
function App() {
  const [students, setStudents] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const REMEMBER_KEY = "hwp-parent-remember-v1";
  const [currentUserId, setCurrentUserId] = useState(() => sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(REMEMBER_KEY));
  const [loginRole, setLoginRole] = useState("student");
  const [studentLoginId, setStudentLoginId] = useState("");
  const [loginId, setLoginId] = useState("");
  const [loginSecret, setLoginSecret] = useState("");
  const [loginError, setLoginError] = useState("");
  const [materials, setMaterials] = useState([]);
  const [activeTab, setActiveTab] = useState("today");
  const [editingHW, setEditingHW] = useState(null); // { key, form }
  const [deleteConfirmHW, setDeleteConfirmHW] = useState(null);
  const [redistState, setRedistState] = useState(null); // { hwKey }
  const [chunkInput, setChunkInput] = useState(null); // { hwKey, idx, val }
  const [teacherTab, setTeacherTab] = useState("dashboard");
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [overdueGradeFilter, setOverdueGradeFilter] = useState("all");
  const [teacherViewId, setTeacherViewId] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [hwVerifyTab, setHwVerifyTab] = useState("확인전");
  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [today, setToday] = useState(todayString);
  const [confirmedHw, setConfirmedHw] = useState(null);
  const [copyToast, setCopyToast] = useState(false);
  const [autoHwData, setAutoHwData] = useState(null); // { startProblem, materialNodeId, materialId }
  const [completionModal, setCompletionModal] = useState(null); // { hwKey, chunkIdx, startProblem, endProblem, studentId, materialId }

  useEffect(() => { const id = setInterval(()=>setToday(todayString()),60000); return ()=>clearInterval(id); }, []);

  useEffect(() => {
    const unsub = firebase.auth().onAuthStateChanged(user => {
      if (user) setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    let loaded = { s: false, h: false };
    const check = () => { if (loaded.s && loaded.h) setLoading(false); };
    const sRef = db.ref("students");
    sRef.on("value", snap => {
      const data = snap.val();
      setStudents(data ? Object.values(data).sort((a,b)=>a.className.localeCompare(b.className)||a.name.localeCompare(b.name)) : []);
      loaded.s = true; check();
    });
    const hRef = db.ref("homeworks");
    hRef.on("value", snap => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([key,val])=>({...val,_key:key,chunks:val.chunks?Object.values(val.chunks):[]}));
        arr.sort((a,b)=>b.id-a.id);
        setHomeworks(arr);
      } else setHomeworks([]);
      loaded.h = true; check();
    });
    const mRef = db.ref("materials");
    mRef.on("value", snap => {
      const data = snap.val();
      setMaterials(data ? Object.values(data) : []);
    });
    return () => { sRef.off(); hRef.off(); mRef.off(); };
  }, [authReady]);

  useEffect(() => {
    if (currentUserId) {
      sessionStorage.setItem(SESSION_KEY, currentUserId);
      // 학부모 자동복원 시 FCM 토큰 재등록 (localStorage 복원 포함)
      if (currentUserId.endsWith("PA")) {
        registerFCMToken(currentUserId, "parent");
      }
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(REMEMBER_KEY);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || currentUserId===TEACHER.id || currentUserId===VIEWER.id || currentUserId.endsWith("PA")) return;
    if (students.length>0 && !students.find(s=>s.id===currentUserId)) setCurrentUserId(null);
  }, [students, currentUserId]);

  useEffect(() => { if (students.length>0 && !studentLoginId) setStudentLoginId(students[0].id); }, [students]);

  // ── 실시간 접속자 추적 ─────────────────────────────────────────────────────
  const [onlineUsers, setOnlineUsers] = React.useState([]);
  const presenceRegisteredRef = React.useRef(false);

  useEffect(() => {
    if (!currentUserId) { presenceRegisteredRef.current = false; return; }
    const isStudent = currentUserId !== TEACHER.id && currentUserId !== VIEWER.id && !currentUserId.endsWith("PA");
    if (!isStudent) return;
    if (presenceRegisteredRef.current) return; // 이미 등록됨
    const student = students.find(s => s.id === currentUserId);
    if (!student) return; // students 아직 미로드 → students 변경 시 재시도
    presenceRegisteredRef.current = true;
    const presenceRef = db.ref(`presence/${currentUserId}`);
    const connectedRef = db.ref(".info/connected");
    const onConnected = snap => {
      if (!snap.val()) return;
      presenceRef.onDisconnect().remove();
      presenceRef.set({ name: student.name, loginAt: Date.now() });
    };
    connectedRef.on("value", onConnected);
    return () => {
      connectedRef.off("value", onConnected);
      presenceRef.remove();
      presenceRegisteredRef.current = false;
    };
  }, [currentUserId, students]);

  useEffect(() => {
    if (!currentUserId || (currentUserId !== TEACHER.id && currentUserId !== VIEWER.id)) return;
    const ref = db.ref("presence");
    ref.on("value", snap => {
      const data = snap.val() || {};
      setOnlineUsers(Object.values(data).sort((a, b) => a.loginAt - b.loginAt));
    });
    return () => ref.off();
  }, [currentUserId]);

  const isParent = !!(currentUserId?.endsWith("PA"));
  const parentStudentId = isParent ? currentUserId.slice(0, -2) : null;
  const currentUser = currentUserId===TEACHER.id ? TEACHER : currentUserId===VIEWER.id ? VIEWER : students.find(s=>s.id===currentUserId)??null;
  const currentStudent = isParent
    ? (students.find(s=>s.id===parentStudentId) ?? null)
    : (currentUser && currentUser.role!=="teacher" && currentUser.role!=="viewer" ? currentUser : null);
  const currentTeacher = currentUser?.id===TEACHER.id ? TEACHER : null;
  const currentViewer  = currentUser?.id===VIEWER.id  ? VIEWER  : null;

  useEffect(() => {
    if (!currentStudent) return;
    const saved = localStorage.getItem('lastSubject_' + currentStudent.id);
    if (saved) setForm(f => ({...f, subject: saved}));
  }, [currentStudent?.id]);

  // 학부모는 접근 불가 탭으로 이동 시 오늘 탭으로 리셋
  useEffect(() => {
    if (isParent && ["create","exam","mypage"].includes(activeTab)) setActiveTab("notices");
    if (!isParent && ["notices","attendance"].includes(activeTab)) setActiveTab("today");
  }, [isParent, activeTab]);

  useEffect(() => {
    if (!currentStudent) { setConfirmedHw(null); return; }
    const ref = db.ref(`studentProfiles/${currentStudent.id}/confirmedHw`);
    ref.on("value", snap => setConfirmedHw(snap.val() || null));
    return () => ref.off();
  }, [currentStudent?.id]);

  const hwByStudent = useMemo(()=>homeworks.reduce((acc,hw)=>{ (acc[hw.studentId]||(acc[hw.studentId]=[])).push(hw); return acc; },{}), [homeworks]);

  const teacherStats = useMemo(()=>students.map(s=>{
    const items=hwByStudent[s.id]??[];
    let total=0,done=0,overdue=0,overdueHyun=0,overdueSum=0,todayInc=0;
    items.forEach(hw=>(hw.chunks||[]).forEach(c=>{
      if(!hw.teacherVerified){ total++; if(c.done) done++; }
      if(!c.done&&c.date<today&&!hw.teacherVerified){ overdue++; if(hw.hwType==="추가1"||hw.hwType==="추가2") overdueSum++; else overdueHyun++; }
      if(!c.done&&c.date===today&&!hw.teacherVerified) todayInc++;
    }));
    return {...s,homeworkCount:items.length,totalChunks:total,doneChunks:done,overdueChunks:overdue,overdueHyun,overdueSum,todayIncomplete:todayInc,progress:total>0?Math.round(done/total*100):0};
  }),[students,hwByStudent,today]);

  const teacherDash = useMemo(()=>({
    totalStudents:students.length,
    activeStudents:teacherStats.filter(s=>s.homeworkCount>0).length,
    incompleteToday:teacherStats.filter(s=>s.todayIncomplete>0).length,
    dangerStudents:teacherStats.filter(s=>s.overdueChunks>=1).length,
  }),[teacherStats,students.length]);

  const selectedTeacherStudent = teacherViewId==="all"?null:students.find(s=>s.id===teacherViewId)??null;
  const selectedTeacherHW = useMemo(() => {
    if (selectedTeacherStudent) return hwByStudent[selectedTeacherStudent.id]??[];
    let hws = homeworks;
    if (gradeFilter !== "all") hws = hws.filter(hw => students.find(s=>s.id===hw.studentId)?.className === gradeFilter);
    if (subjectFilter !== "all") hws = hws.filter(hw => hw.subject === subjectFilter);
    return hws;
  }, [selectedTeacherStudent, homeworks, gradeFilter, subjectFilter, hwByStudent, students]);
  const studentHW = currentStudent?(hwByStudent[currentStudent.id]??[]).filter(hw=>!hw.teacherVerified):[];
  const todayTasks = studentHW.flatMap(hw=>(hw.chunks||[]).filter(c=>c.date===today).map(c=>({...c,hwKey:hw._key,title:hw.title,subject:hw.subject,isAuto:hw.isAuto,materialId:hw.materialId})));
  const overdueTasks = studentHW.flatMap(hw=>(hw.chunks||[]).filter(c=>c.date<today&&!c.done).map(c=>({...c,hwKey:hw._key,title:hw.title,subject:hw.subject})));

  const streak = useMemo(()=>{
    const doneDates=new Set(studentHW.flatMap(hw=>(hw.chunks||[])).filter(c=>c.done).map(c=>c.date));
    const startFrom=doneDates.has(today)?today:addDays(today,-1);
    let count=0; const cur=new Date(startFrom);
    while(doneDates.has(formatDate(cur))){ count++; cur.setDate(cur.getDate()-1); }
    return count;
  },[studentHW,today]);

  const applyAutoHwOffset = (rawChunks, autoHwData) => {
    const unc = autoHwData?.uncheckedProblems;
    if (unc && unc.length > 0) {
      return rawChunks.map(c => ({ ...c, startProblem: unc[c.startProblem-1] ?? c.startProblem, endProblem: unc[c.endProblem-1] ?? c.endProblem }));
    }
    const offset = autoHwData && autoHwData.startProblem > 1 ? autoHwData.startProblem - 1 : 0;
    return offset > 0 ? rawChunks.map(c => ({ ...c, startProblem: c.startProblem + offset, endProblem: c.endProblem + offset })) : rawChunks;
  };

  const previewChunks = useMemo(() => {
    if (!form.totalAmount || !form.startDate || !form.dueDate) return [];
    const raw = splitHomework({...form, customDates: form.selectedDates});
    return applyAutoHwOffset(raw, autoHwData);
  }, [form, autoHwData]);

  const handleCreate = async () => {
    if (!currentStudent) return;
    if (!form.title.trim()) { setFormError("숙제명을 입력해 주세요."); return; }
    if (!form.totalAmount||!form.startDate||!form.dueDate) { setFormError("총 문제 수, 시작일, 마감일을 모두 입력해 주세요."); return; }
    const rawChunks = splitHomework({...form, customDates: form.selectedDates});
    if (!rawChunks.length) { setFormError("기간이나 최대 문제 수를 조정해 주세요."); return; }
    const chunks = applyAutoHwOffset(rawChunks, autoHwData);
    const autoExtra = autoHwData?.materialNodeId ? { isAuto: true, materialNodeId: autoHwData.materialNodeId, materialId: autoHwData.materialId, uncheckedProblems: autoHwData.uncheckedProblems || null } : {};
    const id = Date.now();
    setSaving(true);
    try {
      await db.ref(`homeworks/${id}`).set({ id, title:form.title.trim(), subject:form.subject||"수학", hwType:form.hwType||"현행", studentId:currentStudent.id, studentName:currentStudent.name, totalAmount:Number(form.totalAmount), startDate:form.startDate, dueDate:form.dueDate, includeWeekend:form.includeWeekend, dailyMax:form.dailyMax?Number(form.dailyMax):null, createdAt:today, chunks, ...autoExtra });
      localStorage.setItem('lastSubject_' + currentStudent.id, form.subject);
      const savedSubject = form.subject;
      setAutoHwData(null);
      setForm({...defaultForm(), subject: savedSubject}); setFormError(""); setActiveTab("today");
    } catch(e) { setFormError("저장 실패: "+e.message); }
    setSaving(false);
  };

  const toggleDone = async (hwKey, date) => {
    const hw=homeworks.find(h=>h._key===hwKey); if(!hw) return;
    const idx=(hw.chunks||[]).findIndex(c=>c.date===date); if(idx===-1) return;
    const chunk=hw.chunks[idx];
    // 입력 모드 중이면 row 클릭 무시 (숫자 영역 탭으로만 제어)
    if (chunkInput?.hwKey===hwKey && chunkInput?.idx===idx) return;
    const isYellow = !chunk.done && (chunk.completedAmount||0) > 0;
    if (isYellow) {
      // 노란색 → 안함
      try { await db.ref(`homeworks/${hwKey}/chunks/${idx}`).update({done:false, completedAmount:0, submittedAt:null}); }
      catch(e) { alert("저장 실패: "+e.message); }
    } else if (!chunk.done) {
      // 안함 → 완료
      const now = new Date();
      const submittedAt = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      try { await db.ref(`homeworks/${hwKey}/chunks/${idx}`).update({done:true, completedAmount:chunk.plannedAmount, submittedAt}); }
      catch(e) { alert("저장 실패: "+e.message); }
      // isAuto 숙제: 완료된 청크의 endProblem 기준으로 진행 현황 기록
      if (hw.isAuto && hw.materialNodeId) {
        const allChunks = hw.chunks.map((c,i) => i===idx ? {...c, done:true} : c);
        const maxEnd = allChunks.filter(c=>c.done).reduce((m,c)=>Math.max(m, c.endProblem||0), chunk.endProblem);
        try {
          await db.ref(`studentProfiles/${hw.studentId}/materialProgress/${hw.materialNodeId}`).set({
            currentProblem: maxEnd + 1,
            completedAt: submittedAt,
          });
        } catch(e) { console.warn("materialProgress 저장 실패", e); }
      }
    } else {
      // 완료 → 노란색 (DB에 partial 상태로 저장, 입력 없이)
      try { await db.ref(`homeworks/${hwKey}/chunks/${idx}`).update({done:false, completedAmount:chunk.completedAmount||chunk.plannedAmount, submittedAt:null}); }
      catch(e) { alert("저장 실패: "+e.message); }
    }
  };

  const confirmChunkInput = async () => {
    if (!chunkInput) return;
    const { hwKey, idx, val } = chunkInput;
    const hw = homeworks.find(h=>h._key===hwKey); if(!hw) return;
    const amount = parseInt(val);
    if (!isNaN(amount) && amount >= 0) {
      try { await db.ref(`homeworks/${hwKey}/chunks/${idx}`).update({done:false, completedAmount:amount, submittedAt:null}); }
      catch(e) { alert("저장 실패: "+e.message); }
    }
    setChunkInput(null);
  };

  const redistribute = async (hwKey) => {
    const hw=homeworks.find(h=>h._key===hwKey); if(!hw) return;
    const solvedMap = {};
    setSaving(true);
    try {
      if (hw.materialId && hw.uncheckedProblems && hw.uncheckedProblems.length > 0 && currentStudent) {
        // 원래 숙제의 미체크 문제 목록에서 아직 안 푼 것만 추출
        const snap = await db.ref(`problemStatus/${currentStudent.id}/${hw.materialId}`).once("value");
        const statusData = snap.val() || {};
        const stillUnchecked = hw.uncheckedProblems.filter(p => !statusData[p]);
        if (!stillUnchecked.length) { setSaving(false); setRedistState(null); return; }
        const future = (hw.chunks||[]).filter(c => !c.done && c.date >= today);
        if (!future.length) { setSaving(false); setRedistState(null); return; }
        const redist = splitHomework({ totalAmount: stillUnchecked.length, startDate: future[0].date, dueDate: future[future.length-1].date, includeWeekend: hw.includeWeekend, dailyMax: hw.dailyMax });
        if (!redist.length) { setSaving(false); setRedistState(null); return; }
        const newChunks = redist.map(c => ({ ...c, startProblem: stillUnchecked[c.startProblem-1], endProblem: stillUnchecked[c.endProblem-1] }));
        const completed = (hw.chunks||[]).filter(c => c.done);
        const allChunks = [...completed, ...newChunks].sort((a,b) => a.date.localeCompare(b.date));
        await db.ref(`homeworks/${hwKey}/chunks`).set(allChunks);
      } else {
        (hw.chunks||[]).forEach(c => { if (!c.done && c.completedAmount > 0) solvedMap[c.date] = c.completedAmount; });
        const updated = redistributeHomework(hw, today, solvedMap);
        await db.ref(`homeworks/${hwKey}/chunks`).set(updated.chunks);
      }
    } catch(e) { alert("저장 실패: "+e.message); }
    setSaving(false);
    setRedistState(null);
  };

  const handleUpdateHW = async () => {
    if (!editingHW) return;
    const { key, form: ef } = editingHW;
    if (!ef.title.trim()) { alert("숙제명을 입력해 주세요."); return; }
    if (!ef.totalAmount || !ef.startDate || !ef.dueDate) { alert("총 문제 수, 시작일, 마감일을 모두 입력해 주세요."); return; }
    const newChunks = splitHomework({...ef, customDates: ef.selectedDates});
    if (!newChunks.length) { alert("기간이나 최대 문제 수를 조정해 주세요."); return; }
    const oldChunks = homeworks.find(h=>h._key===key)?.chunks || [];
    const doneMap = {};
    oldChunks.forEach(c => { if (c.done) doneMap[c.date] = c; });
    const mergedChunks = newChunks.map(c => doneMap[c.date] ? {...c, done: true, completedAmount: doneMap[c.date].completedAmount, submittedAt: doneMap[c.date].submittedAt} : c);
    setSaving(true);
    try {
      await db.ref(`homeworks/${key}`).update({ title: ef.title.trim(), subject: ef.subject, totalAmount: Number(ef.totalAmount), startDate: ef.startDate, dueDate: ef.dueDate, includeWeekend: ef.includeWeekend, dailyMax: ef.dailyMax ? Number(ef.dailyMax) : null, chunks: mergedChunks });
      setEditingHW(null);
    } catch(e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  const handleDeleteHW = async (hwKey) => {
    setSaving(true);
    try { await db.ref(`homeworks/${hwKey}`).remove(); setDeleteConfirmHW(null); }
    catch(e) { alert("삭제 실패: " + e.message); }
    setSaving(false);
  };

  const loginAsTeacher = () => {
    if (loginId === VIEWER.name && loginSecret === VIEWER.password) {
      setCurrentUserId(VIEWER.id); setLoginId(""); setLoginSecret(""); setLoginError(""); return;
    }
    if (loginId === TEACHER.name && loginSecret === TEACHER.password) {
      setCurrentUserId(TEACHER.id); setLoginId(""); setLoginSecret(""); setLoginError("");
      registerFCMToken(TEACHER.id, "teacher"); return;
    }
    setLoginError("아이디 또는 비밀번호가 올바르지 않습니다.");
  };
  const logout = () => { setCurrentUserId(null); setLoginId(""); setLoginSecret(""); setLoginError(""); setFormError(""); };

  if (loading) return <Spinner />;

  // ── 로그인 화면 ─────────────────────────────────────────────────────────────
  if (!currentUser && !isParent) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(145deg, #f8fafc 0%, #f0f4ff 50%, #e8f0fe 100%)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden", fontFamily:"'Segoe UI', sans-serif" }}>

      {/* 배경 기하 도형 */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", right:"8%", top:"8%", width:320, height:320, border:"1px solid rgba(100,130,220,0.15)", background:"rgba(100,130,220,0.04)", borderRadius:6, transform:"perspective(1200px) rotateX(22deg) rotateY(-28deg) rotateZ(4deg)" }}/>
        <div style={{ position:"absolute", right:"14%", top:"18%", width:220, height:220, border:"1px solid rgba(100,130,220,0.1)", background:"rgba(100,130,220,0.03)", borderRadius:4, transform:"perspective(1200px) rotateX(18deg) rotateY(-22deg) rotateZ(2deg)" }}/>
        <div style={{ position:"absolute", right:"5%", top:"42%", width:160, height:160, border:"1px solid rgba(100,130,220,0.1)", background:"rgba(100,130,220,0.03)", borderRadius:4, transform:"perspective(1200px) rotateX(25deg) rotateY(-35deg) rotateZ(6deg)" }}/>
        <div style={{ position:"absolute", right:"28%", top:"65%", width:90, height:90, border:"1px solid rgba(100,130,220,0.12)", background:"rgba(100,130,220,0.03)", borderRadius:3, transform:"perspective(800px) rotateX(20deg) rotateY(-25deg)" }}/>
        <div style={{ position:"absolute", right:"2%", bottom:"10%", width:120, height:120, border:"1px solid rgba(100,130,220,0.08)", background:"rgba(100,130,220,0.02)", borderRadius:4, transform:"perspective(800px) rotateX(15deg) rotateY(-20deg)" }}/>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, background:"linear-gradient(90deg, transparent, rgba(100,130,220,0.12), transparent)" }}/>
        <div style={{ position:"absolute", bottom:32, left:32, width:28, height:28, borderLeft:"2px solid rgba(100,130,220,0.2)", borderBottom:"2px solid rgba(100,130,220,0.2)" }}/>
        <div style={{ position:"absolute", top:32, left:32, width:28, height:28, borderLeft:"2px solid rgba(100,130,220,0.2)", borderTop:"2px solid rgba(100,130,220,0.2)" }}/>
      </div>

      {/* 콘텐츠 */}
      <div style={{ position:"relative", zIndex:10, width:"100%", maxWidth:480, padding:"0 28px" }}>

        {/* 브랜드 */}
        <div style={{ marginBottom:40 }}>
          <div style={{ fontSize:12, color:"#6b7ecc", letterSpacing:4, textTransform:"uppercase", marginBottom:16, fontWeight:700 }}>Beyond The Line Math</div>
          <h1 style={{ fontSize:42, fontWeight:800, color:"#1a2340", lineHeight:1.15, marginBottom:14, letterSpacing:-0.5 }}>
            한계를 넘어서,<br/>
            <span style={{ color:"#4a6bd6" }}>다음 단계의 나를</span><br/>
            만나다
          </h1>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", display:"inline-block", boxShadow:"0 0 6px #22c55e" }}/>
            <span style={{ fontSize:12, color:"#64748b", fontWeight:500 }}>실시간 연결됨</span>
          </div>
        </div>

        {/* 로그인 카드 */}
        <div style={{ background:"rgba(255,255,255,0.75)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", border:"1px solid rgba(100,130,220,0.15)", borderRadius:20, padding:"32px 32px 28px", boxShadow:"0 8px 40px rgba(100,130,220,0.1)" }}>
          {/* 탭 */}
          <div style={{ display:"flex", gap:6, background:"rgba(100,130,220,0.07)", borderRadius:12, padding:5, marginBottom:28 }}>
            {["student","parent","teacher"].map(r=>(
              <button key={r} onClick={()=>{setLoginRole(r);setLoginSecret("");setLoginError("");}}
                style={{ flex:1, padding:"9px 0", fontSize:13, fontWeight:600, borderRadius:9, border:"none", cursor:"pointer", transition:"all 0.2s",
                  background: loginRole===r ? "#ffffff" : "transparent",
                  color: loginRole===r ? "#1a2340" : "#94a3b8",
                  boxShadow: loginRole===r ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                {r==="student" ? "학생" : r==="parent" ? "학부모" : "선생님"}
              </button>
            ))}
          </div>

          {loginRole==="student" ? (
            <div>
              {students.length===0
                ? <div style={{ fontSize:13, color:"#92400e", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"12px 16px" }}>⚠️ 등록된 학생이 없습니다. 선생님 계정으로 먼저 학생을 추가해 주세요.</div>
                : <StudentLoginFormLight students={students} onLogin={(id)=>{setCurrentUserId(id);setLoginError("");registerFCMToken(id,"student");}} loginError={loginError} setLoginError={setLoginError}/>
              }
            </div>
          ) : loginRole==="parent" ? (
            <div>
              {students.length===0
                ? <div style={{ fontSize:13, color:"#92400e", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"12px 16px" }}>⚠️ 등록된 학생이 없습니다.</div>
                : <ParentLoginFormLight students={students} onLogin={(id, remember)=>{setCurrentUserId(id);setLoginError("");registerFCMToken(id,"parent");if(remember)localStorage.setItem(REMEMBER_KEY,id);}} loginError={loginError} setLoginError={setLoginError}/>
              }
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <input value={loginId} onChange={e=>setLoginId(e.target.value)} placeholder="아이디" onKeyDown={e=>e.key==="Enter"&&loginAsTeacher()}
                style={{ width:"100%", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 16px", fontSize:14, color:"#1a2340", outline:"none", boxSizing:"border-box" }}/>
              <input type="password" value={loginSecret} onChange={e=>setLoginSecret(e.target.value)} placeholder="비밀번호" onKeyDown={e=>e.key==="Enter"&&loginAsTeacher()}
                style={{ width:"100%", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 16px", fontSize:14, color:"#1a2340", outline:"none", boxSizing:"border-box" }}/>
              {loginError && <div style={{ fontSize:13, color:"#ef4444" }}>{loginError}</div>}
              <button onClick={loginAsTeacher}
                style={{ width:"100%", padding:"13px 0", borderRadius:10, border:"none", background:"#1a2340", color:"white", fontSize:14, fontWeight:700, cursor:"pointer", letterSpacing:0.5 }}>
                로그인
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── 로그인 후 화면 ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-3 py-4 md:px-6 md:py-6" style={{background:"linear-gradient(145deg, #f8fafc 0%, #f0f4ff 50%, #e8f0fe 100%)", minHeight:"100vh"}}>
      <div className={`space-y-4 ${(currentTeacher||currentViewer) ? "w-full" : "mx-auto max-w-6xl"}`}>
        <Card className="p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight" style={{color:"#1a2340"}}>Beyond The Line Math</h1>
                <Badge>{currentTeacher?"선생님":isParent?"학부모":"학생"}</Badge>
                {saving&&<span className="text-xs text-slate-400 animate-pulse">저장 중...</span>}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {currentTeacher?`${TEACHER.name} 선생님 · 관리자`:currentViewer?`${VIEWER.name} · 뷰어`:isParent?`${currentStudent?.name} 학부모님`:`${currentStudent?.name} (${currentStudent?.className})`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {(currentTeacher || currentViewer) && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl" style={{background:"#f0fdf4", border:"1px solid #bbf7d0"}}>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400" style={{boxShadow:"0 0 0 2px #86efac"}}></span>
                  <span className="text-xs font-medium text-green-700">
                    {onlineUsers.length > 0
                      ? `접속 중 ${onlineUsers.length}명: ${onlineUsers.map(u => u.name).join(", ")}`
                      : "접속 중인 학생 없음"}
                  </span>
                </div>
              )}
              <span className="text-sm px-3 py-1.5 rounded-2xl" style={{color:"#4a6bd6", background:"#eef2ff"}}>📅 {today}</span>
              <Btn variant="outline" onClick={logout}>로그아웃</Btn>
            </div>
          </div>
        </Card>

        {/* ── 선생님 / 뷰어 ── */}
        {(currentTeacher || currentViewer) && (
          <div className="space-y-4">
            <div className="flex gap-2 bg-white rounded-2xl p-1" style={{boxShadow:"0px 0px 0px 1px rgba(74,107,214,0.08), 0px 2px 8px rgba(74,107,214,0.06)"}}>
              {(currentViewer
                ? [["lessons","📓 수업일지"],["dashboard","📊 숙제 현황"],["wronganswer","❌ 오답관리"],["stats","📈 통계"]]
                : [["lessons","📓 수업일지"],["dashboard","📊 숙제 현황"],["wronganswer","❌ 오답관리"],["stats","📈 통계"],["students","👥 학생 관리"],["curriculum","📚 커리큘럼"],["assessments","📝 평가"],["notices","📢 알림"]]
              ).map(([tab,label])=>(
                <button key={tab} onClick={()=>setTeacherTab(tab)}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl transition"
                  style={teacherTab===tab ? {background:"#1a2340", color:"white"} : {color:"#64748b"}}>
                  {label}
                </button>
              ))}
            </div>

            {showOverdueModal && <OverdueModal teacherStats={teacherStats} overdueGradeFilter={overdueGradeFilter} setOverdueGradeFilter={setOverdueGradeFilter} onClose={()=>setShowOverdueModal(false)}/>}

            {teacherTab==="dashboard" && (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <SummaryCard title="전체 학생" value={`${teacherDash.totalStudents}명`} description="등록된 학생 수" icon="👥"/>
                  <SummaryCard title="숙제 입력 학생" value={`${teacherDash.activeStudents}명`} description="숙제를 한 번 이상 등록" icon="📖"/>
                  <SummaryCard title="오늘 미완료" value={`${teacherDash.incompleteToday}명`} description="오늘 할 양 미체크" icon="⏰"/>
                  <div className="cursor-pointer" onClick={()=>{setShowOverdueModal(true);setOverdueGradeFilter("all");}}><SummaryCard title="밀린 학생" value={`${teacherDash.dangerStudents}명`} description="클릭해서 목록 보기" icon="⚠️"/></div>
                </div>
                <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
                  <Card className="p-5 space-y-3">
                    <h2 className="text-lg font-bold">학생별 진행 현황</h2>
                    {teacherStats.length===0
                      ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">학생 관리 탭에서 학생을 먼저 추가해 주세요.</div>
                      : <ClassGroupList teacherStats={teacherStats} teacherViewId={teacherViewId} setTeacherViewId={setTeacherViewId} homeworks={homeworks} gradeFilter={gradeFilter} setGradeFilter={setGradeFilter} subjectFilter={subjectFilter} setSubjectFilter={setSubjectFilter}/>
                    }
                  </Card>
                  <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold">상세 보기</h2>
                        <p className="text-sm text-slate-500">{selectedTeacherStudent?`${selectedTeacherStudent.name} 학생의 숙제 목록`:"학생을 선택하세요"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedTeacherStudent && (
                          <button type="button" onClick={()=>setCurrentUserId(selectedTeacherStudent.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition hover:opacity-80"
                            style={{background:"#eef2ff", color:"#4a6bd6", border:"1px solid #c7d2fe"}}>
                            👤 학생화면
                          </button>
                        )}
                        <Btn variant={teacherViewId==="all"?"default":"outline"} size="sm" onClick={()=>setTeacherViewId("all")}>전체</Btn>
                      </div>
                    </div>
                    {selectedTeacherHW.length > 0 && (
                      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                        {["확인전","확인후"].map(t=>(
                          <button key={t} type="button" onClick={()=>setHwVerifyTab(t)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${hwVerifyTab===t?"bg-white shadow text-slate-900":"text-slate-500 hover:text-slate-700"}`}>
                            {t==="확인전"
                              ? `확인 전 ${selectedTeacherHW.filter(hw=>!hw.teacherVerified).length}`
                              : `확인 후 ${selectedTeacherHW.filter(hw=>hw.teacherVerified).length}`}
                          </button>
                        ))}
                      </div>
                    )}
                    {(() => {
                      const filtered = selectedTeacherHW.filter(hw => hwVerifyTab==="확인전" ? !hw.teacherVerified : !!hw.teacherVerified);
                      if (selectedTeacherHW.length===0) return <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">아직 숙제가 없습니다.</div>;
                      if (filtered.length===0) return <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">{hwVerifyTab==="확인전"?"확인 전 숙제가 없습니다.":"확인 후 숙제가 없습니다."}</div>;
                      return filtered.map(hw=>{
                        const done=(hw.chunks||[]).filter(c=>c.done).length;
                        const pct=hw.chunks?.length>0?Math.round(done/hw.chunks.length*100):0;
                        return <TeacherHWCard key={hw._key} hw={hw} done={done} pct={pct} today={today}/>;
                      });
                    })()}
                  </Card>
                </div>
              </div>
            )}

            {teacherTab==="lessons" && <LessonManager students={students} materials={materials} isViewer={!!currentViewer} onViewStudent={id=>setCurrentUserId(id)}/>}
            {teacherTab==="wronganswer" && <WrongAnswerManager students={students} materials={materials}/>}
            {teacherTab==="stats" && <TeacherStatsTab students={students} homeworks={homeworks} today={today}/>}
            {teacherTab==="students" && !currentViewer && <StudentManager students={students} homeworks={homeworks}/>}
            {teacherTab==="curriculum" && !currentViewer && <CurriculumManager students={students} materials={materials}/>}
            {teacherTab==="assessments" && !currentViewer && <AssessmentsTab students={students}/>}
            {teacherTab==="notices" && !currentViewer && <TeacherNoticesTab students={students}/>}
          </div>
        )}

        {/* ── 학생 ── */}
        {currentStudent && (
          <div className="space-y-4">
            {!isParent && (
              <div className="grid gap-3 md:grid-cols-3">
                <SummaryCard title="오늘 할 숙제" value={`${todayTasks.length}개`} description="오늘 배정된 숙제 수" icon="📖"/>
                <SummaryCard title="밀린 숙제" value={`${overdueTasks.length}개`} description="완료 못한 지난 날짜 숙제" icon="⚠️"/>
                <SummaryCard title="연속 수행일" value={`${streak}일`} description="매일 체크하는 습관 지표" icon="🔥"/>
              </div>
            )}

            <Card className="p-3">
              <div className="flex gap-2 bg-slate-100 rounded-2xl p-1 mb-4">
                {(isParent
                  ? [["notices","알림"],["today","보고서"],["all","숙제"],["attendance","출결"],["curriculum","커리큘럼"]]
                  : [["today","오늘"],["create","등록"],["all","전체"],["curriculum","커리큘럼"],["exam","평가"],["mypage","마이페이지"]]
                ).map(([tab,label])=>(
                  <button key={tab} onClick={()=>setActiveTab(tab)}
                    className={`flex-1 py-2 text-sm font-medium rounded-xl transition ${activeTab===tab?"bg-white shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {activeTab==="today" && isParent && (
                <ParentReportsSection studentId={currentStudent.id} studentName={currentStudent.name} studentClass={currentStudent.className}/>
              )}

              {activeTab==="today" && !isParent && (
                <div className="space-y-4">
                  <div><h2 className="text-lg font-bold">오늘 해야 할 숙제</h2><p className="text-sm text-slate-500">완료 체크하면 선생님 화면에 즉시 반영됩니다.</p></div>
                  <div className="space-y-3">
                    {todayTasks.length===0
                      ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">오늘 배정된 숙제가 없습니다.</div>
                      : todayTasks.map(task=>(
                        <div key={`${task.hwKey}-${task.date}`} className={`rounded-2xl border p-4 ${task.done?"bg-emerald-50 border-emerald-200":""}`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{task.title}</span>
                                <Badge variant="secondary">{task.subject}</Badge>
                                {task.done&&<Badge variant="success">✓ 완료</Badge>}
                              </div>
                              <p className="mt-1 text-sm text-slate-600">오늘은 {task.startProblem}번 ~ {task.endProblem}번 ({task.plannedAmount}문제)</p>
                            </div>
                            <Btn variant={task.done?"outline":"default"} onClick={()=>{
                              if (task.isAuto && task.materialId && !task.done) {
                                const _hw = homeworks.find(h=>h._key===task.hwKey);
                                const _unc = _hw?.uncheckedProblems;
                                const _pnums = _unc ? _unc.slice(_unc.indexOf(task.startProblem), _unc.indexOf(task.endProblem)+1) : null;
                                setCompletionModal({hwKey:task.hwKey,date:task.date,startProblem:task.startProblem,endProblem:task.endProblem,problemNums:_pnums,studentId:currentStudent.id,materialId:task.materialId});
                              } else { toggleDone(task.hwKey,task.date); }
                            }}>
                              {task.done?"완료 취소":task.completedAmount>0?`${task.completedAmount}/${task.plannedAmount} 수정`:"완료 체크"}
                            </Btn>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  {overdueTasks.length>0&&<AlertBox className="bg-amber-50 text-amber-700">⚠️ 밀린 숙제가 있습니다. <b>전체 탭</b>에서 자동 재분배를 눌러보세요.</AlertBox>}
                  <StudentTodayLessonSection studentId={currentStudent.id} today={today} isParent={isParent}/>
                </div>
              )}


              {activeTab==="create" && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div><h2 className="text-lg font-bold">숙제 직접 등록</h2><p className="text-sm text-slate-500">공지된 숙제를 입력하면 하루 분량이 자동 계산됩니다.</p></div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                      <div className="text-xs font-bold text-slate-500 mb-1">📌 선생님이 공지한 최신 숙제</div>
                      {!confirmedHw?.현행 && !confirmedHw?.추가1 && !confirmedHw?.추가2 && (
                        <div className="text-xs text-slate-400 py-1">아직 공지된 숙제가 없습니다.</div>
                      )}
                      {confirmedHw?.현행 && (
                        <div className="flex items-center justify-between gap-2 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">
                          <span className="text-sm"><span className="text-[11px] font-bold text-sky-600 mr-1.5">(현)</span>{confirmedHw.현행.text}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-slate-400">{confirmedHw.현행.date && (() => { const d=new Date(confirmedHw.현행.date); return `${confirmedHw.현행.date} (${["일","월","화","수","목","금","토"][d.getDay()]})`; })()}</span>
                            {confirmedHw.현행.isAuto
                              ? <button type="button" onClick={() => { const hw=confirmedHw.현행; const matSubj=materials.find(m=>m.id===hw.autoMaterialId)?.subject||hw.autoSubject; const cd=hw.checkDates&&hw.checkDates.length?hw.checkDates:null; const hasDates=!!(hw.hwDueDate||cd); const sd=hasDates?(hw.hwStartDate||cd?.[0]):null; const dd=hasDates?(hw.hwDueDate||cd?.[cd.length-1]):null; const selDates=cd||(sd&&dd?enumerateDates(sd,dd,true):null); setForm(f=>({...f,title:hw.text,hwType:hw.autoHwType||"현행",subject:matSubj||f.subject,totalAmount:String(hw.autoTotalAmount||""),startDate:sd||f.startDate,dueDate:dd||f.dueDate,selectedDates:selDates,fromTeacher:hasDates})); setAutoHwData({startProblem:hw.autoStartProblem||1,materialNodeId:hw.autoMaterialNodeId,materialId:hw.autoMaterialId,uncheckedProblems:hw.autoUncheckedProblems||null}); setActiveTab("create"); }} className="text-xs px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-200 shrink-0">(자동)</button>
                              : <button type="button" title="복사" onClick={() => { navigator.clipboard?.writeText(confirmedHw.현행.text); setCopyToast(true); setTimeout(()=>setCopyToast(false),2000); }} className="text-slate-400 hover:text-slate-600 text-base">⧉</button>
                            }
                          </div>
                        </div>
                      )}
                      {confirmedHw?.추가1 && (
                        <div className="flex items-center justify-between gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                          <span className="text-sm"><span className="text-[11px] font-bold text-violet-600 mr-1.5">(추1)</span>{confirmedHw.추가1.text}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-slate-400">{confirmedHw.추가1.date && (() => { const d=new Date(confirmedHw.추가1.date); return `${confirmedHw.추가1.date} (${["일","월","화","수","목","금","토"][d.getDay()]})`; })()}</span>
                            {confirmedHw.추가1.isAuto
                              ? <button type="button" onClick={() => { const hw=confirmedHw.추가1; const matSubj=materials.find(m=>m.id===hw.autoMaterialId)?.subject||hw.autoSubject; const cd=hw.checkDates&&hw.checkDates.length?hw.checkDates:null; const hasDates=!!(hw.hwDueDate||cd); const sd=hasDates?(hw.hwStartDate||cd?.[0]):null; const dd=hasDates?(hw.hwDueDate||cd?.[cd.length-1]):null; const selDates=cd||(sd&&dd?enumerateDates(sd,dd,true):null); setForm(f=>({...f,title:hw.text,hwType:hw.autoHwType||"추가1",subject:matSubj||f.subject,totalAmount:String(hw.autoTotalAmount||""),startDate:sd||f.startDate,dueDate:dd||f.dueDate,selectedDates:selDates,fromTeacher:hasDates})); setAutoHwData({startProblem:hw.autoStartProblem||1,materialNodeId:hw.autoMaterialNodeId,materialId:hw.autoMaterialId,uncheckedProblems:hw.autoUncheckedProblems||null}); setActiveTab("create"); }} className="text-xs px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-200 shrink-0">(자동)</button>
                              : <button type="button" title="복사" onClick={() => { navigator.clipboard?.writeText(confirmedHw.추가1.text); setCopyToast(true); setTimeout(()=>setCopyToast(false),2000); }} className="text-slate-400 hover:text-slate-600 text-base">⧉</button>
                            }
                          </div>
                        </div>
                      )}
                      {confirmedHw?.추가2 && (
                        <div className="flex items-center justify-between gap-2 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                          <span className="text-sm"><span className="text-[11px] font-bold text-rose-600 mr-1.5">(추2)</span>{confirmedHw.추가2.text}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-slate-400">{confirmedHw.추가2.date && (() => { const d=new Date(confirmedHw.추가2.date); return `${confirmedHw.추가2.date} (${["일","월","화","수","목","금","토"][d.getDay()]})`; })()}</span>
                            {confirmedHw.추가2.isAuto
                              ? <button type="button" onClick={() => { const hw=confirmedHw.추가2; const matSubj=materials.find(m=>m.id===hw.autoMaterialId)?.subject||hw.autoSubject; const cd=hw.checkDates&&hw.checkDates.length?hw.checkDates:null; const hasDates=!!(hw.hwDueDate||cd); const sd=hasDates?(hw.hwStartDate||cd?.[0]):null; const dd=hasDates?(hw.hwDueDate||cd?.[cd.length-1]):null; const selDates=cd||(sd&&dd?enumerateDates(sd,dd,true):null); setForm(f=>({...f,title:hw.text,hwType:hw.autoHwType||"추가2",subject:matSubj||f.subject,totalAmount:String(hw.autoTotalAmount||""),startDate:sd||f.startDate,dueDate:dd||f.dueDate,selectedDates:selDates,fromTeacher:hasDates})); setAutoHwData({startProblem:hw.autoStartProblem||1,materialNodeId:hw.autoMaterialNodeId,materialId:hw.autoMaterialId,uncheckedProblems:hw.autoUncheckedProblems||null}); setActiveTab("create"); }} className="text-xs px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-200 shrink-0">(자동)</button>
                              : <button type="button" title="복사" onClick={() => { navigator.clipboard?.writeText(confirmedHw.추가2.text); setCopyToast(true); setTimeout(()=>setCopyToast(false),2000); }} className="text-slate-400 hover:text-slate-600 text-base">⧉</button>
                            }
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Lbl>종류</Lbl>
                        <div className="flex gap-2">
                          {["현행","추가1","추가2"].map(t=>(
                            <button key={t} type="button" onClick={()=>setForm({...form,hwType:t})}
                              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${form.hwType===t?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2"><Lbl>숙제명</Lbl><Inp value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="예: 수학 숙제 1~30번"/></div>
                      <div className="space-y-1.5"><Lbl>과목</Lbl>
                        <select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}
                          className="w-full rounded-xl border border-input px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                          {["중1-1","중1-2","중2-1","중2-2","중3-1","중3-2","공통수학1","공통수학2","대수","미적분1","기하","미적분","확률과통계"].map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5"><Lbl>총 문제 수</Lbl><Inp type="number" value={form.totalAmount} onChange={e=>setForm({...form,totalAmount:e.target.value})} placeholder="30"/></div>
                      {!form.fromTeacher && <div className="space-y-1.5"><Lbl>시작일</Lbl><Inp type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value,selectedDates:null})}/></div>}
                      {!form.fromTeacher && <div className="space-y-1.5"><Lbl>마감일</Lbl><Inp type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value,selectedDates:null})}/></div>}
                      <div className="space-y-1.5"><Lbl>하루 최대 문제 수</Lbl><Inp type="number" value={form.dailyMax} onChange={e=>setForm({...form,dailyMax:e.target.value})} placeholder="선택 입력"/></div>
                      {!form.fromTeacher && <div className="flex items-center gap-3 rounded-2xl border bg-slate-50 p-3">
                        <input type="checkbox" id="weekend" checked={form.includeWeekend} onChange={e=>setForm({...form,includeWeekend:e.target.checked,selectedDates:null})} className="w-4 h-4 cursor-pointer"/>
                        <label htmlFor="weekend" className="text-sm font-medium cursor-pointer">주말 포함</label>
                      </div>}
                    </div>
                    {form.fromTeacher && form.selectedDates && form.selectedDates.length > 0 && (
                      <div className="rounded-2xl border bg-blue-50 px-4 py-2.5 text-sm text-blue-700 mb-1">
                        선생님이 설정한 기간입니다. 못하는 날을 클릭해 제외하세요.
                      </div>
                    )}
                    {(form.fromTeacher ? (form.selectedDates && form.selectedDates.length > 0) : (form.startDate && form.dueDate)) && (
                      <DatePicker
                        startDate={form.startDate}
                        dueDate={form.dueDate}
                        includeWeekend={form.includeWeekend}
                        selectedDates={form.selectedDates}
                        onChange={(dates) => setForm(f => ({...f, selectedDates: dates}))}
                        rangeOverride={form.fromTeacher ? form.selectedDates : undefined}
                      />
                    )}
                    {formError&&<AlertBox className="bg-red-50 text-red-700">{formError}</AlertBox>}
                    <Btn onClick={handleCreate} className="w-full" disabled={saving}>{saving?"저장 중...":"숙제 등록"}</Btn>
                  </div>
                  <div className="space-y-3">
                    <div><h2 className="text-lg font-bold">분배 미리보기</h2><p className="text-sm text-slate-500">입력한 조건으로 하루 분량을 실시간 확인합니다.</p></div>
                    {previewChunks.length===0
                      ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">문제 수와 날짜를 입력하면 여기에 표시됩니다.</div>
                      : <div className="space-y-2">
                          {previewChunks.map(c=>(
                            <div key={c.date} className="flex items-center justify-between rounded-2xl border bg-slate-50 px-4 py-2.5 text-sm">
                              <span className="text-slate-600">{c.date}</span>
                              <span className="font-medium">{c.startProblem}~{c.endProblem}번</span>
                              <Badge variant="secondary">{c.plannedAmount}문제</Badge>
                            </div>
                          ))}
                          <div className="text-right text-xs text-slate-400 pt-1">총 {previewChunks.reduce((s,c)=>s+c.plannedAmount,0)}문제 · {previewChunks.length}일</div>
                        </div>
                    }
                  </div>
                </div>
              )}

              {activeTab==="all" && (
                <div className="space-y-4">
                  <div><h2 className="text-lg font-bold">등록된 숙제 전체</h2><p className="text-sm text-slate-500">밀린 숙제는 자동 재분배로 남은 날짜에 다시 나눌 수 있습니다.</p></div>
                  {studentHW.length===0
                    ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-400 text-center">아직 등록된 숙제가 없습니다.</div>
                    : studentHW.map(hw=>{
                      const doneCount=(hw.chunks||[]).filter(c=>c.done).length;
                      const pct=hw.chunks?.length>0?Math.round(doneCount/hw.chunks.length*100):0;
                      const hasOverdue=(hw.chunks||[]).some(c=>!c.done&&c.date<today);
                      const isEditing = editingHW?.key === hw._key;
                      const isDeleting = deleteConfirmHW === hw._key;
                      const ef = editingHW?.form;
                      return(
                        <div key={hw._key} className={`rounded-2xl border bg-white p-4 space-y-3 ${isDeleting?"border-red-300":""}`}>
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{hw.title}</span>
                                <Badge variant="outline">{hw.subject}</Badge>
                                {hasOverdue&&<Badge variant="destructive">밀림</Badge>}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">{hw.startDate} ~ {hw.dueDate} · 총 {hw.totalAmount}문제</div>
                              <div className="mt-2"><ProgressBar value={pct}/></div>
                              <div className="text-xs text-slate-400 mt-1">{doneCount}/{hw.chunks?.length||0}일 완료 ({pct}%)</div>
                            </div>
                            <div className="flex gap-1.5 flex-wrap shrink-0">
                              {hasOverdue&&<Btn variant="outline" size="sm" onClick={()=>setRedistState(s=>s?.hwKey===hw._key?null:{hwKey:hw._key})} disabled={saving}>{redistState?.hwKey===hw._key?"취소":"재분배"}</Btn>}
                              {!isDeleting && !isEditing && <Btn variant="outline" size="sm" onClick={()=>setEditingHW({key:hw._key, form:{title:hw.title,subject:hw.subject,totalAmount:hw.totalAmount,startDate:hw.startDate,dueDate:hw.dueDate,includeWeekend:hw.includeWeekend||false,dailyMax:hw.dailyMax||"",selectedDates:null}})}>수정</Btn>}
                              {!isDeleting && !isEditing && <Btn variant="danger" size="sm" onClick={()=>setDeleteConfirmHW(hw._key)}>삭제</Btn>}
                              {isDeleting && <>
                                <span className="text-xs text-red-600 self-center">삭제할까요?</span>
                                <Btn variant="danger" size="sm" onClick={()=>handleDeleteHW(hw._key)} disabled={saving}>확인</Btn>
                                <Btn variant="outline" size="sm" onClick={()=>setDeleteConfirmHW(null)}>취소</Btn>
                              </>}
                              {isEditing && <>
                                <Btn size="sm" onClick={handleUpdateHW} disabled={saving}>{saving?"저장 중...":"저장"}</Btn>
                                <Btn variant="outline" size="sm" onClick={()=>setEditingHW(null)}>취소</Btn>
                              </>}
                            </div>
                          </div>
                          {redistState?.hwKey === hw._key && (
                            <div className="border-t pt-3 space-y-2">
                              <div className="text-xs text-slate-500">맞음/틀림/모름 체크된 문제를 제외하고 남은 문제를 미래 날짜에 재분배합니다.</div>
                              <div className="flex gap-2 justify-end">
                                <Btn variant="outline" size="sm" onClick={()=>setRedistState(null)}>취소</Btn>
                                <Btn size="sm" onClick={()=>redistribute(hw._key)} disabled={saving}>{saving?"처리 중...":"재분배 실행"}</Btn>
                              </div>
                            </div>
                          )}
                          {isEditing && ef && (
                            <div className="border-t pt-3 space-y-2">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1 sm:col-span-2"><Lbl>숙제명</Lbl><Inp value={ef.title} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,title:e.target.value}}))} /></div>
                                <div className="space-y-1"><Lbl>과목</Lbl>
                                  <select value={ef.subject} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,subject:e.target.value}}))}
                                    className="w-full rounded-xl border border-input px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                                    {["중1-1","중1-2","중2-1","중2-2","중3-1","중3-2","공통수학1","공통수학2","대수","미적분1","기하","미적분","확률과통계"].map(s=><option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                                <div className="space-y-1"><Lbl>총 문제 수</Lbl><Inp type="number" value={ef.totalAmount} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,totalAmount:e.target.value}}))} /></div>
                                <div className="space-y-1"><Lbl>시작일</Lbl><Inp type="date" value={ef.startDate} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,startDate:e.target.value,selectedDates:null}}))} /></div>
                                <div className="space-y-1"><Lbl>마감일</Lbl><Inp type="date" value={ef.dueDate} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,dueDate:e.target.value,selectedDates:null}}))} /></div>
                                <div className="space-y-1"><Lbl>하루 최대 문제 수</Lbl><Inp type="number" value={ef.dailyMax} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,dailyMax:e.target.value}}))} placeholder="선택"/></div>
                                <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2">
                                  <input type="checkbox" id={`weekend-${hw._key}`} checked={ef.includeWeekend} onChange={e=>setEditingHW(p=>({...p,form:{...p.form,includeWeekend:e.target.checked,selectedDates:null}}))} className="w-4 h-4 cursor-pointer"/>
                                  <label htmlFor={`weekend-${hw._key}`} className="text-sm font-medium cursor-pointer">주말 포함</label>
                                </div>
                              </div>
                            </div>
                          )}
                          {!isEditing && <div className="space-y-1">
                            {(hw.chunks||[]).map((chunk, cidx)=>{
                              const isOverdue=!chunk.done&&chunk.date<today;
                              const isToday=chunk.date===today;
                              const isYellow = !chunk.done && (chunk.completedAmount||0) > 0;
                              const isInputMode = chunkInput?.hwKey===hw._key && chunkInput?.idx===cidx;
                              return(
                                <div key={chunk.date}
                                  onClick={()=>{
                                    if (hw.isAuto && hw.materialId && !chunk.done) {
                                      const _unc = hw.uncheckedProblems;
                                      const _pnums = _unc ? _unc.slice(_unc.indexOf(chunk.startProblem), _unc.indexOf(chunk.endProblem)+1) : null;
                                      setCompletionModal({hwKey:hw._key,date:chunk.date,startProblem:chunk.startProblem,endProblem:chunk.endProblem,problemNums:_pnums,studentId:currentStudent.id,materialId:hw.materialId});
                                    } else { toggleDone(hw._key,chunk.date); }
                                  }}
                                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition cursor-pointer
                                    ${isYellow||isInputMode?"bg-amber-50 text-amber-700":chunk.done?"bg-emerald-50 text-emerald-700":isOverdue?"bg-red-50 text-red-700":isToday?"bg-blue-50 text-blue-700":"bg-slate-50 text-slate-600"}`}>
                                  <span>{chunk.date}{isToday?" · 오늘":""}</span>
                                  <span className="font-medium flex items-center gap-1">
                                    {isYellow && hw.isAuto ? (
                                      <span>{chunk.completedAmount}/{chunk.plannedAmount}문제 (클릭해서 수정)</span>
                                    ) : isInputMode ? (
                                      <>
                                        <input type="number" min="0" max={chunk.plannedAmount}
                                          value={chunkInput.val}
                                          onChange={e=>setChunkInput(s=>({...s,val:e.target.value}))}
                                          onKeyDown={e=>{e.stopPropagation();if(e.key==="Enter")confirmChunkInput();if(e.key==="Escape")setChunkInput(null);}}
                                          onClick={e=>e.stopPropagation()}
                                          className="w-14 border border-amber-300 rounded px-1 py-0.5 text-xs text-center bg-white"/>
                                        <span className="text-xs">문제</span>
                                        <button onClick={e=>{e.stopPropagation();confirmChunkInput();}} className="text-amber-700 hover:text-amber-900 font-bold">✓</button>
                                        <button onClick={e=>{e.stopPropagation();setChunkInput(null);}} className="text-slate-400 hover:text-slate-600">✕</button>
                                      </>
                                    ) : isYellow ? (
                                      <span onClick={e=>{e.stopPropagation();setChunkInput({hwKey:hw._key,idx:cidx,val:String(chunk.completedAmount)});}}
                                        className="underline decoration-dotted cursor-pointer">
                                        {chunk.completedAmount}/{chunk.plannedAmount}문제
                                      </span>
                                    ) : (
                                      <>
                                        {chunk.startProblem}~{chunk.endProblem}번 ({chunk.plannedAmount}문제)
                                        {chunk.done ? " ✓" : isOverdue?" ⚠":""}
                                      </>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>}
                        </div>
                      );
                    })
                  }
                </div>
              )}

              {activeTab==="curriculum" && (
                <StudentCurriculumView studentId={currentStudent.id} materials={materials}/>
              )}

              {activeTab==="notices" && isParent && (
                <ParentNoticesSection studentId={currentStudent.id}/>
              )}

              {activeTab==="attendance" && isParent && (
                <ParentAttendanceCalendar studentId={currentStudent.id}/>
              )}

              {activeTab==="exam" && (
                <StudentExamTab studentId={currentStudent.id}/>
              )}

              {activeTab==="mypage" && (
                <StudentMyPage studentHW={studentHW} studentName={currentStudent?.name} studentId={currentStudent?.id} currentPin={currentStudent?.pin} today={today}/>
              )}
            </Card>
          </div>
        )}
      </div>
      {completionModal && (
        <CompletionModal
          startProblem={completionModal.startProblem}
          endProblem={completionModal.endProblem}
          problemNums={completionModal.problemNums}
          studentId={completionModal.studentId}
          materialId={completionModal.materialId}
          onClose={() => setCompletionModal(null)}
          onConfirm={async (checkedCount, totalCount) => {
            const { hwKey, date } = completionModal;
            const hw = homeworks.find(h => h._key === hwKey);
            const idx = (hw?.chunks||[]).findIndex(c => c.date === date);
            if (hw && idx !== -1) {
              const done = checkedCount === totalCount;
              const now = new Date();
              const submittedAt = done ? `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}` : null;
              await db.ref(`homeworks/${hwKey}/chunks/${idx}`).update({ done, completedAmount: checkedCount, submittedAt });
              if (done && hw.isAuto && hw.materialNodeId) {
                const allChunks = hw.chunks.map((c,i) => i===idx ? {...c, done:true} : c);
                const maxEnd = allChunks.filter(c=>c.done).reduce((m,c)=>Math.max(m, c.endProblem||0), hw.chunks[idx].endProblem);
                await db.ref(`studentProfiles/${hw.studentId}/materialProgress/${hw.materialNodeId}`).set({ currentProblem: maxEnd+1, completedAt: submittedAt }).catch(()=>{});
              }
            }
            setCompletionModal(null);
          }}
        />
      )}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-4 py-2 rounded-xl shadow-lg pointer-events-none transition-opacity duration-500 ${copyToast ? "opacity-100" : "opacity-0"}`}>
        클립보드에 복사되었습니다
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
