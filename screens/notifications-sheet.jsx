// notifications-sheet.jsx — Panel de notificaciones premium

// ─────────────────────────────────────────────────────────────
// Mock data — notifs por categoría
// ─────────────────────────────────────────────────────────────
const NOTIFICATIONS_SEED = [
  // RECORDATORIOS
  { id: 'n1', kind: 'reminder', icon: 'clock', accent: '#5EC3FF',
    title: 'Hora de meditar',
    body: 'Tu rutina de 10 min de Mente te espera.',
    time: 'Hace 2 min', unread: true,
    cta: 'Iniciar ahora' },
  { id: 'n2', kind: 'reminder', icon: 'flame', accent: '#FFB561',
    title: 'Tu racha está en juego',
    body: 'Llevas 12 días seguidos. Cierra el de hoy antes de las 23:00.',
    time: 'Hace 18 min', unread: true,
    cta: 'Mantener racha' },
  { id: 'n3', kind: 'reminder', icon: 'leaf', accent: '#3DFFD1',
    title: 'Respiración programada',
    body: 'Pausa breve de 5 min antes de tu siguiente bloque.',
    time: 'Hace 1 h', unread: false },

  // LOGROS
  { id: 'n4', kind: 'achievement', icon: 'trophy', accent: '#3DFFD1',
    title: '¡Desbloqueaste "Mente clara"!',
    body: '7 días consecutivos de meditación. Tu primera medalla de constancia.',
    time: 'Ayer · 21:14', unread: true,
    cta: 'Ver medalla' },
  { id: 'n5', kind: 'achievement', icon: 'target', accent: '#9B8AFF',
    title: 'Reto completado',
    body: 'Cerraste "Enfoque profundo · 21 días". Puntos: +320',
    time: 'Hace 3 días', unread: false,
    cta: 'Compartir' },
  { id: 'n6', kind: 'achievement', icon: 'spark', accent: '#7DFFE0',
    title: 'Subiste a nivel 4',
    body: 'Tu progreso desbloqueó nuevas rutinas avanzadas.',
    time: 'Hace 5 días', unread: false },

  // INSIGHTS
  { id: 'n7', kind: 'insight', icon: 'trend', accent: '#3DFFD1',
    title: 'Esta semana enfocaste 6h 12min',
    body: '+38% vs la semana pasada. Tu mejor martes en 3 meses.',
    time: 'Hoy · 08:00', unread: true,
    spark: [3, 5, 4, 8, 6, 9, 7] },
  { id: 'n8', kind: 'insight', icon: 'brain', accent: '#9B8AFF',
    title: 'Tu pico es entre 9 y 11 AM',
    body: 'Considera mover tus sesiones más exigentes a esa franja.',
    time: 'Ayer · 19:30', unread: false },
  { id: 'n9', kind: 'insight', icon: 'shield', accent: '#5EC3FF',
    title: 'Bloqueaste 47 distracciones',
    body: 'Instagram lideró la lista esta semana. Te ahorraste ~2h.',
    time: 'Hace 2 días', unread: false,
    bigStat: '47' },
];

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'reminder', label: 'Recordatorios' },
  { id: 'achievement', label: 'Logros' },
  { id: 'insight', label: 'Insights' },
];

const ICON_MAP = {
  clock: 'IcClock', flame: 'IcFlame', leaf: 'IcLeaf',
  trophy: 'IcTarget', target: 'IcTarget', spark: 'IcSpark',
  trend: 'IcTrend', brain: 'IcBrain', shield: 'IcShield',
};

const getIc = (id) => window[ICON_MAP[id] || 'IcBell'] || window.IcBell;

// ─────────────────────────────────────────────────────────────
// NotificationsSheet
// ─────────────────────────────────────────────────────────────
function NotificationsSheet({ onClose, onCountChange }) {
  const [exiting, setExiting] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const [items, setItems] = React.useState(NOTIFICATIONS_SEED);
  const [removingId, setRemovingId] = React.useState(null);
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  const unreadCount = items.filter(n => n.unread).length;

  React.useEffect(() => {
    onCountChange && onCountChange(unreadCount);
  }, [unreadCount, onCountChange]);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose && onClose(), 300);
  };

  const visible = filter === 'all' ? items : items.filter(n => n.kind === filter);

  const markAllRead = () => {
    setItems(prev => prev.map(n => ({ ...n, unread: false })));
    toast.show({ message: 'Todas marcadas como leídas', duration: 2200 });
  };

  const dismiss = (id) => {
    const target = items.find(n => n.id === id);
    if (!target) return;
    setRemovingId(id);
    setTimeout(() => {
      setItems(prev => prev.filter(n => n.id !== id));
      setRemovingId(null);
      toast.show({
        message: 'Notificación descartada',
        action: 'Deshacer',
        duration: 4000,
        onAction: () => setItems(prev => [target, ...prev]),
      });
    }, 240);
  };

  const markRead = (id) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      animation: exiting ? 'sheetFadeOut .28s ease forwards' : 'sheetFadeIn .32s ease forwards',
    }}>
      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}/>

      {/* Sheet */}
      <div className="mtx-glass" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: '88%',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        background: 'rgba(14,17,20,0.96)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderBottom: 0,
        boxShadow: '0 -30px 80px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: exiting ? 'sheetSlideOut .28s cubic-bezier(.4,0,1,1) forwards'
                           : 'sheetSlideIn .42s cubic-bezier(.34,1.4,.64,1) forwards',
      }}>
        {/* Grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.02em', fontFamily: 'var(--ff-sans)' }}>
                Notificaciones
              </div>
              {unreadCount > 0 && (
                <div style={{
                  fontSize: 10, fontWeight: 700, color: '#0a1410',
                  background: 'var(--neon)',
                  padding: '2px 7px', borderRadius: 99,
                  letterSpacing: '0.02em',
                  boxShadow: '0 0 12px var(--neon-glow)',
                }}>{unreadCount} nuevas</div>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
              Tu día, en señales útiles
            </div>
          </div>
          <button onClick={handleClose} className="mtx-tap" style={{
            width: 32, height: 32, borderRadius: 999, border: 0,
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--ink-2)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcClose size={16} stroke="currentColor"/>
          </button>
        </div>

        {/* Filtros + acción */}
        <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {FILTERS.map(f => {
              const active = filter === f.id;
              const count = f.id === 'all' ? items.length : items.filter(n => n.kind === f.id).length;
              return (
                <button key={f.id} onClick={() => setFilter(f.id)} className="mtx-tap" style={{
                  appearance: 'none', cursor: 'pointer', flexShrink: 0,
                  padding: '7px 12px', borderRadius: 99,
                  border: active ? '0.5px solid rgba(61,255,209,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
                  background: active ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.03)',
                  color: active ? 'var(--neon)' : 'var(--ink-2)',
                  fontFamily: 'var(--ff-sans)', fontSize: 12, fontWeight: 600,
                  letterSpacing: '-0.005em',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  transition: 'all .18s ease',
                }}>
                  {f.label}
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: active ? 'var(--neon)' : 'var(--ink-3)',
                    opacity: 0.7,
                  }}>{count}</span>
                </button>
              );
            })}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="mtx-tap" style={{
              appearance: 'none', cursor: 'pointer', flexShrink: 0,
              padding: '7px 10px', borderRadius: 8, border: 0,
              background: 'transparent',
              color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)', fontSize: 11, fontWeight: 600,
              letterSpacing: '-0.005em',
            }}>Marcar leídas</button>
          )}
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 24 }}>
          {visible.length === 0 ? (
            <NotifEmpty filter={filter}/>
          ) : (
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visible.map(n => (
                <NotifCard
                  key={n.id}
                  notif={n}
                  removing={removingId === n.id}
                  onTap={() => { if (n.unread) markRead(n.id); }}
                  onDismiss={() => dismiss(n.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes mtxNotifIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mtxNotifOut {
          from { opacity: 1; transform: translateX(0) scale(1); max-height: 200px; margin-bottom: 10px; }
          to   { opacity: 0; transform: translateX(60px) scale(0.96); max-height: 0; margin-bottom: 0; }
        }
        @keyframes mtxDotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.4); opacity: 0.7; }
        }
        @keyframes mtxAchievementGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(61,255,209,0); }
          50%      { box-shadow: 0 0 20px rgba(61,255,209,0.18); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NotifCard — tarjeta de notificación con variantes
// ─────────────────────────────────────────────────────────────
function NotifCard({ notif: n, removing, onTap, onDismiss }) {
  const Ic = getIc(n.icon);
  const isAchievement = n.kind === 'achievement';

  return (
    <div
      onClick={onTap}
      className="mtx-tap"
      style={{
        position: 'relative',
        padding: '14px',
        borderRadius: 16,
        background: n.unread ? 'rgba(61,255,209,0.04)' : 'var(--glass-2)',
        border: n.unread
          ? '0.5px solid rgba(61,255,209,0.18)'
          : '0.5px solid var(--glass-stroke)',
        boxShadow: n.unread
          ? '0 4px 16px rgba(61,255,209,0.05), inset 0 1px 0 rgba(255,255,255,0.04)'
          : 'var(--shadow-card)',
        cursor: 'pointer',
        animation: removing
          ? 'mtxNotifOut .24s ease forwards'
          : (isAchievement && n.unread ? 'mtxAchievementGlow 3s ease-in-out infinite, mtxNotifIn .3s ease both' : 'mtxNotifIn .3s ease both'),
        overflow: 'hidden',
      }}>
      {/* Dot unread (top-right) */}
      {n.unread && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          width: 7, height: 7, borderRadius: 999,
          background: 'var(--neon)',
          boxShadow: '0 0 8px var(--neon-glow)',
          animation: 'mtxDotPulse 2s ease-in-out infinite',
        }}/>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(180deg, ${n.accent}26, ${n.accent}06)`,
          border: `0.5px solid ${n.accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: n.accent,
          boxShadow: `inset 0 0 14px ${n.accent}10`,
          position: 'relative',
        }}>
          <Ic size={19} stroke="currentColor" strokeWidth={1.8}/>
          {isAchievement && (
            <div style={{
              position: 'absolute', inset: -2,
              borderRadius: 14,
              border: `0.5px solid ${n.accent}40`,
              animation: 'mtxAchievementGlow 3s ease-in-out infinite',
              pointerEvents: 'none',
            }}/>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: n.unread ? 14 : 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 600,
            color: 'var(--ink-1)',
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
          }}>{n.title}</div>
          <div style={{
            fontSize: 12.5, color: 'var(--ink-2)',
            marginTop: 3, lineHeight: 1.4,
            textWrap: 'pretty',
          }}>{n.body}</div>

          {/* Mini sparkline para insights */}
          {n.spark && <NotifSparkline data={n.spark} accent={n.accent}/>}

          {/* Big stat para insights */}
          {n.bigStat && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{
                fontSize: 28, fontWeight: 700,
                color: n.accent,
                letterSpacing: '-0.04em',
                fontFamily: 'var(--ff-sans)',
                lineHeight: 1,
                textShadow: `0 0 18px ${n.accent}40`,
              }}>{n.bigStat}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                distracciones
              </span>
            </div>
          )}

          {/* Footer: tiempo + CTAs */}
          <div style={{
            marginTop: n.cta ? 10 : 6,
            display: 'flex', alignItems: 'center', gap: 8,
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 11, color: 'var(--ink-3)',
              letterSpacing: '-0.005em',
              flex: n.cta ? 'unset' : 1,
            }}>{n.time}</span>
            {n.cta && (
              <>
                <span style={{ flex: 1 }}/>
                <button
                  onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                  className="mtx-tap"
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: '6px 10px', borderRadius: 8, border: 0,
                    background: 'transparent',
                    color: 'var(--ink-3)',
                    fontFamily: 'var(--ff-sans)', fontSize: 11, fontWeight: 500,
                  }}>Descartar</button>
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="mtx-tap"
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: '7px 12px', borderRadius: 8, border: 0,
                    background: `linear-gradient(180deg, ${n.accent}28, ${n.accent}10)`,
                    border: `0.5px solid ${n.accent}40`,
                    color: n.accent,
                    fontFamily: 'var(--ff-sans)', fontSize: 12, fontWeight: 600,
                    letterSpacing: '-0.005em',
                    boxShadow: `inset 0 0 10px ${n.accent}10`,
                  }}>{n.cta}</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sparkline mini para insights
// ─────────────────────────────────────────────────────────────
function NotifSparkline({ data, accent }) {
  const w = 120, h = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${h - ((v - min) / range) * h}`).join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <div style={{ marginTop: 10, position: 'relative' }}>
      <svg width={w} height={h} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`sparkfill-${accent.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={accent} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#sparkfill-${accent.replace('#','')})`}/>
        <polyline points={points} fill="none" stroke={accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        {/* punto final */}
        <circle
          cx={(data.length - 1) * stepX}
          cy={h - ((data[data.length - 1] - min) / range) * h}
          r="2.5" fill={accent}
          style={{ filter: `drop-shadow(0 0 4px ${accent})` }}/>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────
function NotifEmpty({ filter }) {
  const copy = {
    all:         { title: 'Bandeja en silencio', body: 'Aquí aparecerán tus recordatorios, logros e insights.' },
    reminder:    { title: 'Sin recordatorios pendientes', body: 'Tu día está bajo control. Bien hecho.' },
    achievement: { title: 'Tu próximo logro está cerca', body: 'Sigue tu rutina y desbloquéalo.' },
    insight:     { title: 'Generando tus primeros insights', body: 'Necesitamos algunas sesiones más para mostrarte patrones.' },
  }[filter] || { title: '', body: '' };

  return (
    <div style={{
      padding: '40px 36px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: 'rgba(61,255,209,0.05)',
        border: '0.5px solid rgba(61,255,209,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--neon)',
        boxShadow: 'inset 0 0 24px rgba(61,255,209,0.05)',
      }}>
        <IcBell size={26} stroke="currentColor" strokeWidth={1.4}/>
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
          {copy.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4, maxWidth: 240, lineHeight: 1.4 }}>
          {copy.body}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { NotificationsSheet });
