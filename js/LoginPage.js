// ── 학생 로그인 폼 (다크 테마) ───────────────────────────────────────────────
function StudentLoginFormDark({ students, onLogin, loginError, setLoginError }) {
  const [nameInput, setNameInput] = useState("");
  const [pin, setPin] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showSugg, setShowSugg] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const inp = { width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, padding:"12px 16px", fontSize:14, color:"white", outline:"none", boxSizing:"border-box" };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setNameInput(val); setSelectedStudent(null); setLoginError(""); setHighlightIdx(-1);
    if (val.trim().length >= 1) {
      const matched = students.filter(s => s.name.includes(val.trim()) || s.className.includes(val.trim()));
      setSuggestions(matched.slice(0, 8)); setShowSugg(true);
    } else { setSuggestions([]); setShowSugg(false); }
  };

  const selectStudent = (s) => {
    setSelectedStudent(s); setNameInput(`${s.name} (${s.className})`);
    setSuggestions([]); setShowSugg(false);
  };

  const handleLogin = () => {
    if (!selectedStudent) { setLoginError("이름을 선택해 주세요."); return; }
    if (pin !== selectedStudent.pin) { setLoginError("PIN이 올바르지 않습니다."); return; }
    onLogin(selectedStudent.id);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ position:"relative" }}>
        <input value={nameInput} onChange={handleNameChange} placeholder="이름 또는 반을 입력하세요"
          onKeyDown={e => {
            if (e.key === "Escape") { setShowSugg(false); setHighlightIdx(-1); }
            else if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, -1)); }
            else if (e.key === "Enter" && highlightIdx >= 0 && suggestions[highlightIdx]) { e.preventDefault(); selectStudent(suggestions[highlightIdx]); }
          }}
          style={inp}/>
        {showSugg && suggestions.length > 0 && (
          <div style={{ position:"absolute", zIndex:20, width:"100%", marginTop:6, background:"#0e2040", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
            {suggestions.map((s, i) => (
              <button key={s.id} type="button" onMouseDown={()=>selectStudent(s)}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", fontSize:13, border:"none", cursor:"pointer", textAlign:"left", background: highlightIdx===i ? "rgba(255,255,255,0.1)" : "transparent", color:"white", transition:"background 0.15s" }}>
                <span style={{ fontWeight:600 }}>{s.name}</span>
                <span style={{ fontSize:11, color:"rgba(140,190,255,0.6)", background:"rgba(120,180,255,0.1)", padding:"2px 8px", borderRadius:6 }}>{s.className}</span>
              </button>
            ))}
          </div>
        )}
        {showSugg && suggestions.length === 0 && nameInput.trim().length >= 1 && (
          <div style={{ position:"absolute", zIndex:20, width:"100%", marginTop:6, background:"#0e2040", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"12px 16px", fontSize:13, color:"rgba(180,210,255,0.5)" }}>
            일치하는 학생이 없습니다.
          </div>
        )}
      </div>
      {selectedStudent && (
        <input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="PIN 입력" onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={inp}/>
      )}
      {loginError && <div style={{ fontSize:13, color:"rgba(255,120,120,0.9)" }}>{loginError}</div>}
      <button onClick={handleLogin} disabled={!selectedStudent}
        style={{ width:"100%", padding:"13px 0", borderRadius:10, border:"none", background: selectedStudent ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)", color: selectedStudent ? "white" : "rgba(255,255,255,0.3)", fontSize:14, fontWeight:700, cursor: selectedStudent ? "pointer" : "default", letterSpacing:0.5 }}>
        학생 로그인
      </button>
    </div>
  );
}

// ── 학생 로그인 폼 (라이트 테마) ─────────────────────────────────────────────
function StudentLoginFormLight({ students, onLogin, loginError, setLoginError }) {
  const [nameInput, setNameInput] = useState("");
  const [pin, setPin] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showSugg, setShowSugg] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const inp = { width:"100%", background:"#ffffff", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"12px 16px", fontSize:14, color:"#1a2340", outline:"none", boxSizing:"border-box", transition:"border-color 0.2s" };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setNameInput(val); setSelectedStudent(null); setLoginError(""); setHighlightIdx(-1);
    if (val.trim().length >= 1) {
      const matched = students.filter(s => s.name.includes(val.trim()) || s.className.includes(val.trim()));
      setSuggestions(matched.slice(0, 8)); setShowSugg(true);
    } else { setSuggestions([]); setShowSugg(false); }
  };

  const selectStudent = (s) => {
    setSelectedStudent(s); setNameInput(`${s.name} (${s.className})`);
    setSuggestions([]); setShowSugg(false);
  };

  const handleLogin = () => {
    if (!selectedStudent) { setLoginError("이름을 선택해 주세요."); return; }
    if (pin !== selectedStudent.pin) { setLoginError("PIN이 올바르지 않습니다."); return; }
    onLogin(selectedStudent.id);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ position:"relative" }}>
        <input value={nameInput} onChange={handleNameChange} placeholder="이름 또는 반을 입력하세요"
          onKeyDown={e => {
            if (e.key === "Escape") { setShowSugg(false); setHighlightIdx(-1); }
            else if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, -1)); }
            else if (e.key === "Enter" && highlightIdx >= 0 && suggestions[highlightIdx]) { e.preventDefault(); selectStudent(suggestions[highlightIdx]); }
          }}
          style={inp}/>
        {showSugg && suggestions.length > 0 && (
          <div style={{ position:"absolute", zIndex:20, width:"100%", marginTop:6, background:"#ffffff", border:"1.5px solid #e2e8f0", borderRadius:12, overflow:"hidden", boxShadow:"0 8px 32px rgba(74,107,214,0.12)" }}>
            {suggestions.map((s, i) => (
              <button key={s.id} type="button" onMouseDown={()=>selectStudent(s)}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", fontSize:13, border:"none", cursor:"pointer", textAlign:"left", background: highlightIdx===i ? "#f0f4ff" : "transparent", color:"#1a2340", transition:"background 0.15s" }}>
                <span style={{ fontWeight:600 }}>{s.name}</span>
                <span style={{ fontSize:11, color:"#4a6bd6", background:"#eef2ff", padding:"2px 8px", borderRadius:6 }}>{s.className}</span>
              </button>
            ))}
          </div>
        )}
        {showSugg && suggestions.length === 0 && nameInput.trim().length >= 1 && (
          <div style={{ position:"absolute", zIndex:20, width:"100%", marginTop:6, background:"#ffffff", border:"1.5px solid #e2e8f0", borderRadius:12, padding:"12px 16px", fontSize:13, color:"#94a3b8" }}>
            일치하는 학생이 없습니다.
          </div>
        )}
      </div>
      {selectedStudent && (
        <input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="PIN 입력" onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={inp}/>
      )}
      {loginError && <div style={{ fontSize:13, color:"#ef4444" }}>{loginError}</div>}
      <button onClick={handleLogin} disabled={!selectedStudent}
        style={{ width:"100%", padding:"13px 0", borderRadius:10, border:"none", background: selectedStudent ? "#4a6bd6" : "#e2e8f0", color: selectedStudent ? "white" : "#94a3b8", fontSize:14, fontWeight:700, cursor: selectedStudent ? "pointer" : "default", letterSpacing:0.5, transition:"background 0.2s" }}>
        학생 로그인
      </button>
    </div>
  );
}

// ── 학부모 로그인 폼 (라이트 테마) ───────────────────────────────────────────
function ParentLoginFormLight({ students, onLogin, loginError, setLoginError }) {
  const [nameInput, setNameInput] = useState("");
  const [password, setPassword] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showSugg, setShowSugg] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const inp = { width:"100%", background:"#ffffff", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"12px 16px", fontSize:14, color:"#1a2340", outline:"none", boxSizing:"border-box", transition:"border-color 0.2s" };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setNameInput(val); setSelectedStudent(null); setLoginError(""); setHighlightIdx(-1);
    if (val.trim().length >= 1) {
      const matched = students.filter(s => s.name.includes(val.trim()) || s.className.includes(val.trim()));
      setSuggestions(matched.slice(0, 8)); setShowSugg(true);
    } else { setSuggestions([]); setShowSugg(false); }
  };

  const selectStudent = (s) => {
    setSelectedStudent(s); setNameInput(`${s.name} (${s.className})`);
    setSuggestions([]); setShowSugg(false);
  };

  const handleLogin = () => {
    if (!selectedStudent) { setLoginError("자녀 이름을 선택해 주세요."); return; }
    if (password !== "1234") { setLoginError("비밀번호가 올바르지 않습니다."); return; }
    onLogin(selectedStudent.id + "PA");
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ position:"relative" }}>
        <input value={nameInput} onChange={handleNameChange} placeholder="자녀 이름 또는 반을 입력하세요"
          onKeyDown={e => {
            if (e.key === "Escape") { setShowSugg(false); setHighlightIdx(-1); }
            else if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, -1)); }
            else if (e.key === "Enter" && highlightIdx >= 0 && suggestions[highlightIdx]) { e.preventDefault(); selectStudent(suggestions[highlightIdx]); }
          }}
          style={inp}/>
        {showSugg && suggestions.length > 0 && (
          <div style={{ position:"absolute", zIndex:20, width:"100%", marginTop:6, background:"#ffffff", border:"1.5px solid #e2e8f0", borderRadius:12, overflow:"hidden", boxShadow:"0 8px 32px rgba(74,107,214,0.12)" }}>
            {suggestions.map((s, i) => (
              <button key={s.id} type="button" onMouseDown={()=>selectStudent(s)}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", fontSize:13, border:"none", cursor:"pointer", textAlign:"left", background: highlightIdx===i ? "#f0f4ff" : "transparent", color:"#1a2340", transition:"background 0.15s" }}>
                <span style={{ fontWeight:600 }}>{s.name}</span>
                <span style={{ fontSize:11, color:"#4a6bd6", background:"#eef2ff", padding:"2px 8px", borderRadius:6 }}>{s.className}</span>
              </button>
            ))}
          </div>
        )}
        {showSugg && suggestions.length === 0 && nameInput.trim().length >= 1 && (
          <div style={{ position:"absolute", zIndex:20, width:"100%", marginTop:6, background:"#ffffff", border:"1.5px solid #e2e8f0", borderRadius:12, padding:"12px 16px", fontSize:13, color:"#94a3b8" }}>
            일치하는 학생이 없습니다.
          </div>
        )}
      </div>
      {selectedStudent && (
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호 입력" onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={inp}/>
      )}
      {loginError && <div style={{ fontSize:13, color:"#ef4444" }}>{loginError}</div>}
      <button onClick={handleLogin} disabled={!selectedStudent}
        style={{ width:"100%", padding:"13px 0", borderRadius:10, border:"none", background: selectedStudent ? "#4a6bd6" : "#e2e8f0", color: selectedStudent ? "white" : "#94a3b8", fontSize:14, fontWeight:700, cursor: selectedStudent ? "pointer" : "default", letterSpacing:0.5, transition:"background 0.2s" }}>
        학부모 로그인
      </button>
    </div>
  );
}

// ── 학생 로그인 폼 ────────────────────────────────────────────────────────────
function StudentLoginForm({ students, onLogin, loginError, setLoginError }) {
  const [nameInput, setNameInput] = useState("");
  const [pin, setPin] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showSugg, setShowSugg] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setNameInput(val);
    setSelectedStudent(null);
    setLoginError("");
    setHighlightIdx(-1);
    if (val.trim().length >= 1) {
      const matched = students.filter(s => s.name.includes(val.trim()) || s.className.includes(val.trim()));
      setSuggestions(matched.slice(0, 8));
      setShowSugg(true);
    } else {
      setSuggestions([]);
      setShowSugg(false);
    }
  };

  const selectStudent = (s) => {
    setSelectedStudent(s);
    setNameInput(`${s.name} (${s.className})`);
    setSuggestions([]);
    setShowSugg(false);
  };

  const handleLogin = () => {
    if (!selectedStudent) { setLoginError("이름을 선택해 주세요."); return; }
    if (pin !== selectedStudent.pin) { setLoginError("PIN이 올바르지 않습니다."); return; }
    onLogin(selectedStudent.id);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 relative">
        <Lbl>이름 입력</Lbl>
        <Inp
          value={nameInput}
          onChange={handleNameChange}
          placeholder="이름 또는 반을 입력하세요"
          onKeyDown={e => {
            if (e.key === "Escape") { setShowSugg(false); setHighlightIdx(-1); }
            else if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, -1)); }
            else if (e.key === "Enter" && highlightIdx >= 0 && suggestions[highlightIdx]) { e.preventDefault(); selectStudent(suggestions[highlightIdx]); }
          }}
        />
        {showSugg && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <button key={s.id} type="button" onMouseDown={()=>selectStudent(s)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition text-left ${highlightIdx===i?"bg-blue-50":"hover:bg-slate-50"}`}>
                <span className="font-medium">{s.name}</span>
                <Badge variant="secondary">{s.className}</Badge>
              </button>
            ))}
          </div>
        )}
        {showSugg && suggestions.length === 0 && nameInput.trim().length >= 1 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg px-4 py-3 text-sm text-slate-400">
            일치하는 학생이 없습니다.
          </div>
        )}
      </div>
      {selectedStudent && (
        <div className="space-y-2">
          <Lbl>PIN (비밀번호)</Lbl>
          <Inp type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="PIN 입력" onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
        </div>
      )}
      {loginError && <AlertBox className="bg-red-50 text-red-700">{loginError}</AlertBox>}
      <Btn onClick={handleLogin} className="w-full" disabled={!selectedStudent}>학생 로그인</Btn>
    </div>
  );
}
