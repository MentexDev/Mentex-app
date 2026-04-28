// home-active.jsx — Home con sesión de enfoque activa

const ACTIVE_BLOCKED = ['Instagram', 'TikTok', 'YouTube', 'X', 'Facebook'];

const ACTIVITIES = [
  { id: 'a1', kind: 'Meditación', title: 'Respira y vuelve a ti', dur: '10 min', Ic: IcLeaf, accent: '#3dffd1', done: true },
  { id: 'a2', kind: 'Resumen', title: 'Hábitos Atómicos', dur: '18 min', Ic: IcBook, accent: '#7dffe0', done: false, playing: true },
  { id: 'a3', kind: 'Desafío · Día 3', title: 'Meditación de 7 días', dur: '12 min', Ic: IcTarget, accent: '#a8ffec', done: false },
  { id: 'a4', kind: 'Journaling', title: 'Escribe tu gratitud', dur: '5 min', Ic: IcEdit, accent: '#3dffd1', done: false },
  { id: 'a5', kind: 'Lección', title: 'La mente del enfoque', dur: '8 min', Ic: IcBrain, accent: '#7dffe0', done: false },
];

function HomeActive({ tweaks, onStop, onNotif = () => {}, notifCount = 0 }) {
  // Live timer
  const [seconds, setSeconds] = React.useState(45 * 60 - 13 * 60); // 32 min restantes
  React.useEffect(() => {
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const total = 45 * 60;
  const elapsed = total - seconds;
  const pct = elapsed / total;
  const mm = Math.floor(seconds / 60), ss = seconds % 60;
  const remaining = `${mm}:${String(ss).padStart(2, '0')}`;

  const R = 110, C = 2 * Math.PI * R;

  return (
    <div style={{
      paddingTop: 60, paddingBottom: 200,
      animation: 'mtx-fade-up .4s ease both',
    }}>
      {/* ── Header sesión activa ─────────────────────── */}
      <div style={{ padding: '8px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="mtx-eyebrow" style={{ marginBottom: 6, color: 'var(--neon)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: 999, background: 'var(--neon)',
              boxShadow: '0 0 10px var(--neon-glow)',
              animation: 'mtx-pulse 2s ease-in-out infinite',
            }}/>
            Sesión activa
          </div>
          <h1 className="mtx-h-1" style={{ margin: 0, color: 'var(--ink-1)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Estás aquí, ahora.
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            El ruido está fuera. Tu mente, dentro.
          </p>
        </div>
        <button onClick={onNotif} aria-label="Notificaciones" className="mtx-tap" style={{
          position: 'relative', width: 44, height: 44, borderRadius: 999,
          background: 'var(--glass-2)', border: '0.5px solid var(--glass-stroke)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-1)', cursor: 'pointer', flexShrink: 0,
        }}>
          <IcBell size={20} stroke="var(--ink-1)"/>
          {notifCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2,
              minWidth: 16, height: 16, padding: '0 4px',
              borderRadius: 999, background: 'var(--neon)',
              color: '#0a1410', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 10px var(--neon-glow)',
              border: '1.5px solid #0a0d0a',
            }}>{notifCount}</span>
          )}
        </button>
      </div>

      {/* ── Timer hero ───────────────────────────────── */}
      <div style={{ padding: '8px 20px 24px', display: 'flex', justifyContent: 'center' }}>
        <div className="mtx-glass" style={{
          width: '100%', padding: '32px 20px 28px', borderRadius: 28,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'radial-gradient(80% 100% at 50% 0%, rgba(61,255,209,0.08), transparent 70%), var(--glass-2)',
          borderColor: 'rgba(61,255,209,0.15)',
          position: 'relative',
        }}>
          {/* Glow halo */}
          <div style={{
            position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
            width: 240, height: 80, borderRadius: '50%',
            background: 'radial-gradient(60% 100% at 50% 50%, rgba(61,255,209,0.18), transparent 70%)',
            pointerEvents: 'none', filter: 'blur(20px)',
          }}/>

          {/* Ring + label */}
          <div style={{ position: 'relative', width: 240, height: 240, marginBottom: 12 }}>
            <svg width="240" height="240" viewBox="0 0 240 240" style={{ transform: 'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="ring-g" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#6affd9"/>
                  <stop offset="1" stopColor="#1ad9ad"/>
                </linearGradient>
                <filter id="ring-glow">
                  <feGaussianBlur stdDeviation="3"/>
                  <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <circle cx="120" cy="120" r={R} fill="none"
                      stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
              <circle cx="120" cy="120" r={R} fill="none"
                      stroke="url(#ring-g)" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={C}
                      strokeDashoffset={C * (1 - pct)}
                      filter="url(#ring-glow)"/>
              {/* tick markers */}
              {Array.from({length:60}).map((_, i) => {
                const angle = (i / 60) * Math.PI * 2;
                const x1 = 120 + Math.cos(angle) * 122;
                const y1 = 120 + Math.sin(angle) * 122;
                const x2 = 120 + Math.cos(angle) * (i % 5 === 0 ? 128 : 125);
                const y2 = 120 + Math.sin(angle) * (i % 5 === 0 ? 128 : 125);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                              stroke="rgba(255,255,255,0.1)" strokeWidth={i % 5 === 0 ? 1.2 : 0.5}/>;
              })}
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div className="mtx-eyebrow" style={{ fontSize: 9, color: 'var(--ink-3)', marginBottom: 6 }}>
                Restante
              </div>
              <div className="mtx-num" style={{
                fontSize: 56, fontWeight: 600, color: 'var(--ink-1)',
                letterSpacing: '-0.05em', lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>{remaining}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IcClock size={12} stroke="currentColor"/>
                de 45 min · llevas {Math.floor(elapsed/60)} min en foco
              </div>
            </div>
          </div>

          {/* Apps bloqueadas chips */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <div className="mtx-eyebrow" style={{ fontSize: 9, color: 'var(--ink-3)' }}>
              <IcShield size={10} stroke="currentColor" style={{ verticalAlign: 'middle', marginRight: 4 }}/>
              Protección activa · {ACTIVE_BLOCKED.length} apps
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {APPS.slice(0, 5).map(app => (
                <div key={app.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px 4px 4px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                  fontSize: 11, color: 'var(--ink-2)',
                }}>
                  <app.Icon size={20}/>
                  {app.name}
                  <IcLock size={10} stroke="var(--neon)"/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Actividades del día ─────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <MtxSectionHead title="Tu ritual de hoy" eyebrow="3 de 5 completadas"/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 20px' }}>
          {ACTIVITIES.map(a => (
            <div key={a.id} className="mtx-glass mtx-tap" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: 14, borderRadius: 18,
              opacity: a.done ? 0.55 : 1,
              transition: 'transform .25s ease, box-shadow .3s ease',
              ...(a.playing ? {
                borderColor: 'rgba(61,255,209,0.35)',
                background: 'linear-gradient(180deg, rgba(61,255,209,0.08), rgba(61,255,209,0.01))',
                boxShadow: '0 0 0 1px rgba(61,255,209,0.18), 0 12px 32px -10px rgba(61,255,209,0.5), inset 0 0 24px rgba(61,255,209,0.08)',
                transform: 'translateY(-1px)',
              } : {}),
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: a.done ? 'rgba(61,255,209,0.15)' : 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: a.done ? 'var(--neon)' : 'var(--ink-1)',
                flexShrink: 0,
              }}>
                {a.done ? <IcCheck size={20} stroke="currentColor" strokeWidth={2.5}/>
                        : <a.Ic size={18} stroke="currentColor"/>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
                              color: a.playing ? 'var(--neon)' : 'var(--ink-3)',
                              textTransform: 'uppercase', marginBottom: 2 }}>
                  {a.kind}{a.playing && ' · ahora'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)',
                              textDecoration: a.done ? 'line-through' : 'none' }}>
                  {a.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{a.dur}</div>
              </div>
              <button className="mtx-tap" style={{
                width: 40, height: 40, borderRadius: 999, border: 0,
                background: a.playing
                  ? 'linear-gradient(180deg, var(--neon-soft), var(--neon-deep))'
                  : 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: a.playing ? '#0a1410' : 'var(--ink-1)',
                boxShadow: a.playing
                  ? '0 0 0 1px rgba(61,255,209,0.4), 0 0 28px rgba(61,255,209,0.65), inset 0 1px 0 rgba(255,255,255,0.5)'
                  : 'none',
                transition: 'transform .2s ease, box-shadow .3s ease',
              }}>
                {a.playing ? <IcPause size={16} stroke="currentColor" strokeWidth={2.2}/>
                           : <IcPlay size={14} stroke="currentColor"/>}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeActive, ACTIVE_BLOCKED });
