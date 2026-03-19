// ── 학생 로그인 폼 ────────────────────────────────────────────────────────────
function StudentLoginForm({ students, onLogin, loginError, setLoginError }) {
  const [nameInput, setNameInput] = useState("");
  const [pin, setPin] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showSugg, setShowSugg] = useState(false);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setNameInput(val);
    setSelectedStudent(null);
    setLoginError("");
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
          onKeyDown={e => { if(e.key==="Escape"){ setShowSugg(false); } }}
        />
        {showSugg && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
            {suggestions.map(s => (
              <button key={s.id} type="button" onMouseDown={()=>selectStudent(s)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition text-left">
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
