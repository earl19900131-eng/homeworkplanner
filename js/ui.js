// ── 공통 UI 컴포넌트 ───────────────────────────────────────────────────────────
const Card = ({ children, className="" }) => <div className={`bg-white rounded-3xl transition-[box-shadow] duration-150 ease-out ${className}`} style={{boxShadow:"var(--shadow-border)"}}>{children}</div>;

const Badge = ({ children, variant="default" }) => {
  const v = { default:"bg-slate-900 text-white", secondary:"bg-slate-100 text-slate-700", outline:"border border-slate-200 text-slate-700", destructive:"bg-red-100 text-red-700", success:"bg-emerald-100 text-emerald-700" };
  return <span className={`inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-semibold ${v[variant]||v.default}`}>{children}</span>;
};

const Btn = ({ children, onClick, variant="default", size="md", className="", disabled=false }) => {
  const s = { md:"px-4 py-2 text-sm", sm:"px-3 py-1.5 text-xs" };
  const v = { default:"bg-slate-900 text-white hover:bg-slate-700", outline:"border border-slate-200 bg-white text-slate-700 hover:bg-slate-50", danger:"bg-red-50 border border-red-200 text-red-600 hover:bg-red-100" };
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center font-medium rounded-2xl transition-[color,background-color,transform,box-shadow,opacity] duration-150 ease-out active:not-disabled:scale-[0.96] focus:outline-none disabled:opacity-40 cursor-pointer ${s[size]||s.md} ${v[variant]||v.default} ${className}`}>{children}</button>;
};

const Inp = ({ value, onChange, type="text", placeholder="", onKeyDown, className="" }) =>
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
    className={`w-full border border-slate-200 rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition ${className}`} />;

const Lbl = ({ children, htmlFor }) => <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">{children}</label>;

const ProgressBar = ({ value=0 }) => (
  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
    <div className="h-full bg-slate-900 rounded-full progress-bar" style={{width:`${Math.min(100,Math.max(0,value))}%`}}/>
  </div>
);

const AlertBox = ({ children, className="" }) => <div className={`rounded-2xl p-4 text-sm ${className}`}>{children}</div>;

const SummaryCard = ({ title, value, description, icon }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-3">
      <div><div className="text-xs text-slate-500 font-medium">{title}</div><div className="mt-1 text-3xl font-bold tracking-tight" style={{fontVariantNumeric:"tabular-nums"}}>{value}</div></div>
      <div className="text-2xl">{icon}</div>
    </div>
    <div className="mt-2 text-xs text-slate-500">{description}</div>
  </Card>
);

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center space-y-3"><div className="text-4xl animate-spin inline-block">⏳</div><p className="text-slate-500 text-sm">Firebase 연결 중...</p></div>
  </div>
);
