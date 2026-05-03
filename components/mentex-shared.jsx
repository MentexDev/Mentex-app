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
          position: 'absolute', top: 1, right: 1,
          width: 18, height: 18, padding: 0,
          borderRadius: 999, background: 'var(--neon)',
          color: '#0a1410', fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 10px var(--neon-glow)',
          border: '1.5px solid #0a0d0a',
          lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        }}>{notifCount > 9 ? '9+' : notifCount}</span>
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
const MtxSectionHead = ({ title, action, eyebrow, subtitle, onAction, actionIcon, actionLabel, actionRadius = 999 }) =>
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
      {actionIcon
        ? <button onClick={onAction} className="mtx-tap"
            aria-label={actionLabel || 'Acción'}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)',
              padding: 0, cursor: 'pointer', color: 'var(--ink-1)',
              width: 30, height: 30, borderRadius: actionRadius,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, alignSelf: 'center',
              // Margins negativos: el button (30px) NO debe extender la
              // altura del row del header (h2 es ~22px). Sin esto, el row
              // crece a 30px y el subtitle queda 8px más separado del
              // título cuando hay actionIcon vs cuando no — inconsistente.
              marginTop: -4, marginBottom: -4,
              transition: 'background .2s, border-color .2s',
            }}>
            {actionIcon}
          </button>
        : action &&
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


// ── MtxScoreHero — hero card de Puntuación Mentex semanal ──────────────────────
const MtxScoreHero = ({ score = 78, delta = 12, max = 100, weekData = [58, 64, 70, 68, 75, 78, 80] }) => {
  const pct = Math.max(0, Math.min(1, score / max));
  const R = 42, C = 2 * Math.PI * R;
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const todayIdx = weekData.length - 1;
  const maxVal = Math.max(...weekData, 1);
  const positive = delta >= 0;

  return (
    <div className="mtx-glass" style={{
      margin: '0 20px 22px',
      padding: '18px 18px 14px',
      borderRadius: 24,
      background: 'radial-gradient(120% 80% at 0% 0%, rgba(61,255,209,0.12), transparent 55%), radial-gradient(80% 60% at 100% 100%, rgba(61,255,209,0.05), transparent 60%), var(--glass-2)',
      borderColor: 'rgba(61,255,209,0.22)',
      boxShadow: '0 0 0 0.5px rgba(61,255,209,0.12), 0 18px 44px -18px rgba(61,255,209,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes mtxScoreShine { 0%,100% { opacity: 0.45; } 50% { opacity: 0.85; } }
      `}</style>

      {/* Top-right ambient glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 160, height: 160, borderRadius: '50%',
        background: 'radial-gradient(50% 50% at 50% 50%, rgba(61,255,209,0.18), transparent 70%)',
        pointerEvents: 'none', filter: 'blur(20px)',
        animation: 'mtxScoreShine 4s ease-in-out infinite',
      }}/>

      {/* Top: ring + headline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
        {/* Ring */}
        <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <defs>
              <linearGradient id="hero-score-grad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#6affd9"/>
                <stop offset="1" stopColor="#1ad9ad"/>
              </linearGradient>
              <filter id="hero-score-glow">
                <feGaussianBlur stdDeviation="1.8"/>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5"/>
            <circle cx="50" cy="50" r={R} fill="none"
              stroke="url(#hero-score-grad)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
              filter="url(#hero-score-glow)"/>
            {/* tick markers */}
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i / 24) * Math.PI * 2;
              const r1 = 47, r2 = i % 6 === 0 ? 52 : 50;
              return (
                <line key={i}
                  x1={50 + Math.cos(a) * r1} y1={50 + Math.sin(a) * r1}
                  x2={50 + Math.cos(a) * r2} y2={50 + Math.sin(a) * r2}
                  stroke="rgba(255,255,255,0.08)" strokeWidth={i % 6 === 0 ? 0.8 : 0.4}/>
              );
            })}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              fontSize: 32, fontWeight: 700, color: 'var(--ink-1)',
              letterSpacing: '-0.04em', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              fontFamily: 'var(--ff-display)',
            }}>{score}</div>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 3, letterSpacing: '0.06em' }}>de {max}</div>
          </div>
        </div>

        {/* Right text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mtx-eyebrow" style={{ fontSize: 9, color: 'var(--neon)', marginBottom: 6, letterSpacing: '0.16em', fontWeight: 700 }}>
            Puntuación Mentex
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 8 }}>
            Esta semana
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px 4px 7px', borderRadius: 999,
            background: positive ? 'rgba(61,255,209,0.12)' : 'rgba(255,107,107,0.12)',
            border: `0.5px solid ${positive ? 'rgba(61,255,209,0.3)' : 'rgba(255,107,107,0.3)'}`,
            fontSize: 11, fontWeight: 700,
            color: positive ? 'var(--neon)' : '#ff8b8b',
          }}>
            <span style={{ fontSize: 12, lineHeight: 1 }}>{positive ? '↑' : '↓'}</span>
            {Math.abs(delta)} <span style={{ fontWeight: 500, color: 'var(--ink-3)', fontSize: 10 }}>vs anterior</span>
          </div>
        </div>
      </div>

      {/* Bottom: 7-day mini bars */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        marginTop: 16, paddingTop: 14,
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
        position: 'relative', zIndex: 1,
      }}>
        {weekData.map((v, i) => {
          const h = Math.max(6, (v / maxVal) * 36);
          const isToday = i === todayIdx;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: isToday ? 'var(--neon)' : 'rgba(255,255,255,0.18)',
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              }}>{v}</span>
              <div style={{
                width: '100%', height: h,
                background: isToday
                  ? 'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))',
                borderRadius: 5,
                boxShadow: isToday ? '0 0 10px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)' : 'none',
                transition: 'height .35s cubic-bezier(.25,.8,.25,1)',
              }}/>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: isToday ? 'var(--neon)' : 'var(--ink-3)',
                letterSpacing: '0.04em',
              }}>{days[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

Object.assign(window, {
  MtxHeader, MtxTabBar, MtxStatCard, Sparkline, MtxSectionHead, MtxScoreHero
});