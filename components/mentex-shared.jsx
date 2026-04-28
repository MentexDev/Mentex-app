// mentex-shared.jsx — Componentes compartidos: header, tabbar, glass primitives

const MtxHeader = ({ name = 'Juan', subtitle, notifCount = 3, onNotif }) => {
  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Buenas noches' :
  hour < 12 ? 'Buenos días' :
  hour < 19 ? 'Buenas tardes' :
  'Buenas noches';
  const dynamicSub = subtitle || (
  hour < 12 ? 'Empieza con intención. Termina con claridad.' :
  hour < 19 ? 'Tu mente, en sus mejores términos.' :
  'Cierra el día con presencia.');
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '8px 20px 18px', gap: 12
    }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <h1 className="mtx-h-display" style={{ margin: 0, color: 'var(--ink-1)', fontSize: "29px" }}>
        {greeting}, {name}
      </h1>
      <p className="mtx-body" style={{ margin: '6px 0 0', color: 'var(--ink-3)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {dynamicSub}
      </p>
    </div>
    <button onClick={onNotif} aria-label="Notificaciones" className="mtx-tap" style={{
        position: 'relative', width: 44, height: 44, borderRadius: 999,
        background: 'var(--glass-2)',
        border: '0.5px solid var(--glass-stroke)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink-1)', cursor: 'pointer', flexShrink: 0,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)'
      }}>
      <IcBell size={20} stroke="var(--ink-1)" strokeWidth={1.6} />
      {notifCount > 0 &&
        <span style={{
          position: 'absolute', top: 2, right: 2,
          minWidth: 16, height: 16, padding: '0 4px',
          borderRadius: 999, background: 'var(--neon)',
          color: '#0a1410', fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 10px var(--neon-glow)',
          border: '1.5px solid #0a0d0a'
        }}>{notifCount}</span>
        }
    </button>
  </div>);

};

const MtxTabBar = ({ active = 'home', onChange = () => {} }) => {
  const tabs = [
  { id: 'home', label: 'Home', Ic: IcHome },
  { id: 'explore', label: 'Explorar', Ic: IcCompass },
  { id: 'ai', label: 'IA', Ic: IcSpark },
  { id: 'community', label: 'Comunidad', Ic: IcUsers },
  { id: 'profile', label: 'Perfil', Ic: IcUser }];

  return (
    <div className="mtx-tabbar-bar">
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            flex: 1, height: '100%', border: 0, background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 4, cursor: 'pointer',
            color: isActive ? 'var(--neon)' : 'var(--ink-3)',
            position: 'relative',
            padding: 0,
            transition: 'color 220ms ease'
          }}>
            <t.Ic size={22}
            stroke="currentColor"
            strokeWidth={isActive ? 2 : 1.6}
            style={{
              filter: isActive ? 'drop-shadow(0 0 8px var(--neon-glow))' : 'none',
              transition: 'filter 220ms ease'
            }} />
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 600 : 500,
              letterSpacing: '0.01em'
            }}>{t.label}</span>
          </button>);

      })}
    </div>);

};

// Stat card for horizontal scroll
const MtxStatCard = ({ label, value, unit, sub, accent = false, sparkData }) =>
<div className="mtx-glass" style={{
  width: 168, padding: 16, borderRadius: 22,
  display: 'flex', flexDirection: 'column', gap: 4,
  ...(accent ? {
    background: 'linear-gradient(180deg, rgba(61,255,209,0.08), rgba(61,255,209,0.02))',
    borderColor: 'rgba(61,255,209,0.25)'
  } : {})
}}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span className="mtx-eyebrow" style={{ fontSize: 10, color: accent ? 'var(--neon)' : 'var(--ink-3)' }}>
        {label}
      </span>
      {sparkData && <Sparkline data={sparkData} color={accent ? '#3dffd1' : 'rgba(255,255,255,0.4)'} />}
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
      <span className="mtx-num" style={{
      fontSize: 30, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.04em',
      lineHeight: 1
    }}>{value}</span>
      {unit && <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>{unit}</span>}
    </div>
    <span style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</span>
  </div>;


const Sparkline = ({ data = [3, 5, 4, 6, 5, 7, 8], color = '#fff', width = 44, height = 18 }) => {
  const max = Math.max(...data),min = Math.min(...data);
  const r = max - min || 1;
  const pts = data.map((v, i) => {
    const x = i / (data.length - 1) * width;
    const y = height - (v - min) / r * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

};

// Section header used across blocks
const MtxSectionHead = ({ title, action, eyebrow, subtitle, onAction }) =>
<div style={{ padding: '0 20px', marginBottom: 14 }}>
    <div style={{
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    gap: 12
  }}>
      <h2 className="mtx-h-2" style={{
      margin: 0, color: 'var(--ink-1)',
      fontWeight: 700, letterSpacing: '-0.025em',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      flexShrink: 1, minWidth: 0
    }}>{title}</h2>
      {action &&
    <button onClick={onAction} className="mtx-tap" style={{
      background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
      color: 'var(--neon)', fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 4,
      flexShrink: 0, whiteSpace: 'nowrap',
      fontFamily: 'var(--ff-sans)'
    }}>
          {action} <IcChevR size={14} stroke="currentColor" />
        </button>
    }
    </div>
    {(subtitle || eyebrow) &&
  <div style={{
    marginTop: 3, fontSize: 13, fontWeight: 400,
    color: 'var(--ink-3)', letterSpacing: '-0.005em',
    fontFamily: 'var(--ff-sans)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
  }}>{subtitle || eyebrow}</div>
  }
  </div>;


Object.assign(window, {
  MtxHeader, MtxTabBar, MtxStatCard, Sparkline, MtxSectionHead
});