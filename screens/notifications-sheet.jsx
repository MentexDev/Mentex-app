// notifications-sheet.jsx — Pantalla completa de notificaciones (v2)

const NOTIFICATIONS_SEED = [
  // RECORDATORIOS
  { id:'n1', kind:'reminder', icon:'clock', accent:'#5EC3FF',
    title:'Hora de meditar',
    body:'Tu rutina de 10 min de Mente te espera.',
    time:'Hace 2 min', unread:true,
    cta:'Iniciar ahora' },
  { id:'n2', kind:'reminder', icon:'flame', accent:'#FFB561',
    title:'Tu racha está en juego',
    body:'Llevas 12 días seguidos. Cierra el de hoy antes de las 23:00.',
    time:'Hace 18 min', unread:true,
    cta:'Mantener racha' },
  { id:'n3', kind:'reminder', icon:'leaf', accent:'#3DFFD1',
    title:'Respiración programada',
    body:'Pausa breve de 5 min antes de tu siguiente bloque.',
    time:'Hace 1 h', unread:false },

  // LOGROS
  { id:'n4', kind:'achievement', icon:'trophy', accent:'#3DFFD1',
    title:'¡Desbloqueaste "Mente clara"!',
    body:'7 días consecutivos de meditación. Tu primera medalla de constancia.',
    time:'Ayer · 21:14', unread:true,
    cta:'Ver medalla' },
  { id:'n5', kind:'achievement', icon:'target', accent:'#9B8AFF',
    title:'Reto completado',
    body:'Cerraste "Enfoque profundo · 21 días". Puntos: +320',
    time:'Hace 3 días', unread:false,
    cta:'Compartir' },
  { id:'n6', kind:'achievement', icon:'spark', accent:'#7DFFE0',
    title:'Subiste a nivel 4',
    body:'Tu progreso desbloqueó nuevas rutinas avanzadas.',
    time:'Hace 5 días', unread:false },

  // INSIGHTS
  { id:'n7', kind:'insight', icon:'trend', accent:'#3DFFD1',
    title:'Esta semana enfocaste 6h 12min',
    body:'+38% vs la semana pasada. Tu mejor martes en 3 meses.',
    time:'Hoy · 08:00', unread:true,
    spark:[3, 5, 4, 8, 6, 9, 7] },
  { id:'n8', kind:'insight', icon:'brain', accent:'#9B8AFF',
    title:'Tu pico es entre 9 y 11 AM',
    body:'Considera mover tus sesiones más exigentes a esa franja.',
    time:'Ayer · 19:30', unread:false },
  { id:'n9', kind:'insight', icon:'shield', accent:'#5EC3FF',
    title:'Bloqueaste 47 distracciones',
    body:'Instagram lideró la lista esta semana. Te ahorraste ~2h.',
    time:'Hace 2 días', unread:false,
    bigStat:'47' },
];

const FILTERS = [
  { id:'all',         label:'Todas'         },
  { id:'reminder',    label:'Recordatorios' },
  { id:'achievement', label:'Logros'        },
  { id:'insight',     label:'Insights'      },
];

const ICON_MAP = {
  clock:'IcClock', flame:'IcFlame', leaf:'IcLeaf',
  trophy:'IcTarget', target:'IcTarget', spark:'IcSpark',
  trend:'IcTrend', brain:'IcBrain', shield:'IcShield',
};

const getIc = (id) => window[ICON_MAP[id] || 'IcBell'] || window.IcBell;

const getGroup = (t) => {
  if (t.includes('Ayer')) return 'yesterday';
  if (t.includes('días')) return 'earlier';
  return 'today';
};

const GROUP_LABELS = {
  today:     'Hoy',
  yesterday: 'Ayer',
  earlier:   'Antes',
};


// ─────────────────────────────────────────────────────────────
// NotificationsSheet (full screen)
// ─────────────────────────────────────────────────────────────
function NotificationsSheet({ onClose, onCountChange }) {
  const [exiting, setExiting]       = React.useState(false);
  const [filter, setFilter]         = React.useState('all');
  const [items, setItems]           = React.useState(NOTIFICATIONS_SEED);
  const [removingId, setRemovingId] = React.useState(null);
  const toast       = window.useToast ? window.useToast() : { show: () => {} };

  const unreadCount = items.filter(n => n.unread).length;

  React.useEffect(() => { onCountChange && onCountChange(unreadCount); }, [unreadCount, onCountChange]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose && onClose(), 320);
  };
  const handleCloseRef = React.useRef(handleClose);
  React.useEffect(() => { handleCloseRef.current = handleClose; });

  React.useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.key === 'Escape') handleCloseRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const visible = filter === 'all' ? items : items.filter(n => n.kind === filter);

  // Group by relative time
  const groups = visible.reduce((acc, n) => {
    const g = getGroup(n.time);
    (acc[g] = acc[g] || []).push(n);
    return acc;
  }, {});
  const groupOrder = ['today', 'yesterday', 'earlier'].filter(g => groups[g]?.length);

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
        action: 'Deshacer', duration: 4000,
        onAction: () => setItems(prev => [target, ...prev]),
      });
    }, 240);
  };

  const markRead = (id) => setItems(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:100,
      background:'radial-gradient(80% 60% at 50% 0%, rgba(61,255,209,0.05), transparent 60%), #060a08',
      animation: exiting ? 'mtxNotifOutFull .28s cubic-bezier(.4,0,1,1) forwards' : 'mtxNotifInFull .35s cubic-bezier(.25,.8,.25,1) both',
      display:'flex', flexDirection:'column', overflow:'hidden',
    }}>
      <style>{`
        @keyframes mtxNotifInFull  { from { transform:translateX(100%); opacity:0.2; } to { transform:translateX(0); opacity:1; } }
        @keyframes mtxNotifOutFull { from { transform:translateX(0); opacity:1; } to { transform:translateX(100%); opacity:0.2; } }
        @keyframes mtxNotifIn      { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes mtxNotifOut     { from { opacity:1; transform:translateX(0) scale(1); max-height:200px; margin-bottom:10px; } to { opacity:0; transform:translateX(60px) scale(0.96); max-height:0; margin-bottom:0; } }
        @keyframes mtxDotPulse     { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.4); opacity:0.7; } }
        @keyframes mtxAchievementGlow { 0%,100% { box-shadow:0 0 0 rgba(61,255,209,0); } 50% { box-shadow:0 0 20px rgba(61,255,209,0.18); } }
      `}</style>

      {/* ── Nav bar ──────────────────────────────────────────────────────── */}
      <div style={{
        paddingTop:48, paddingLeft:16, paddingRight:16, paddingBottom:10,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexShrink:0, position:'relative',
      }}>
        <button onClick={handleClose} aria-label="Volver" className="mtx-tap" style={{
          width:40, height:40, borderRadius:999, border:0,
          background:'rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--ink-1)', cursor:'pointer',
          position:'relative', zIndex:2,
        }}>
          <IcChevL size={20} stroke="currentColor" strokeWidth={2}/>
        </button>

        <div style={{
          position:'absolute', left:'50%', top:'50%',
          transform:'translate(-50%, calc(-50% + 19px))',
          fontSize:16, fontWeight:700, color:'var(--ink-1)',
          letterSpacing:'-0.015em',
          fontFamily:'var(--ff-sans)',
          pointerEvents:'none',
        }}>
          Notificaciones
        </div>

        {unreadCount > 0 ? (
          <button onClick={markAllRead} aria-label="Marcar todas como leídas" className="mtx-tap" style={{
            width:40, height:40, borderRadius:999,
            border:'0.5px solid rgba(61,255,209,0.3)',
            background:'rgba(61,255,209,0.1)',
            color:'var(--neon)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            position:'relative', zIndex:2,
            boxShadow:'inset 0 0 10px rgba(61,255,209,0.08)',
          }}>
            <IcCheck size={16} stroke="currentColor" strokeWidth={2.4}/>
          </button>
        ) : <div style={{ width:40, height:40 }}/>}
      </div>

      {/* ── Subtítulo ────────────────────────────────────────────────────── */}
      <div style={{ padding:'4px 22px 16px', flexShrink:0, fontSize:12.5, color:'var(--ink-3)', textAlign:'center' }}>
        {unreadCount > 0 && (
          <>
            <span style={{ color:'var(--neon)', fontWeight:700 }}>{unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}</span>
            <span style={{ margin:'0 6px', opacity:0.4 }}>·</span>
          </>
        )}
        Recordatorios, logros e insights
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0 }}>
        <div style={{
          display:'flex', gap:6,
          overflowX:'auto', scrollbarWidth:'none',
          padding:'8px 22px 14px',
        }}>
          {FILTERS.map(f => {
            const active = filter === f.id;
            const count  = f.id === 'all' ? items.length : items.filter(n => n.kind === f.id).length;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} className="mtx-tap" style={{
                appearance:'none', cursor:'pointer', flexShrink:0,
                padding:'8px 14px', borderRadius:999,
                border: active ? '0.5px solid rgba(61,255,209,0.45)' : '0.5px solid rgba(255,255,255,0.08)',
                background: active
                  ? 'linear-gradient(180deg, rgba(61,255,209,0.14), rgba(61,255,209,0.04))'
                  : 'rgba(255,255,255,0.03)',
                color: active ? 'var(--neon)' : 'var(--ink-2)',
                fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:600,
                letterSpacing:'-0.005em',
                display:'inline-flex', alignItems:'center', gap:6,
                boxShadow: active ? '0 0 0 1px rgba(61,255,209,0.18), 0 8px 20px -8px rgba(61,255,209,0.4)' : 'none',
                transform: active ? 'translateY(-1px)' : 'translateY(0)',
                transition:'transform .2s, box-shadow .25s, background .25s, border-color .2s',
              }}>
                {f.label}
                <span style={{
                  fontSize:10, fontWeight:700,
                  color: active ? 'var(--neon)' : 'var(--ink-3)',
                  opacity:0.75,
                  fontVariantNumeric:'tabular-nums',
                }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Lista (scrollable) ───────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', paddingBottom:32 }}>
        {visible.length === 0 ? (
          <NotifEmpty filter={filter}/>
        ) : (
          groupOrder.map(g => (
            <div key={g} style={{ marginBottom:8 }}>
              <div style={{
                padding:'10px 22px 8px',
                display:'flex', alignItems:'center', gap:10,
              }}>
                <div className="mtx-eyebrow" style={{
                  fontSize:9, fontWeight:700,
                  color:'var(--ink-3)', letterSpacing:'0.16em',
                }}>
                  {GROUP_LABELS[g]}
                </div>
                <div style={{ flex:1, height:'0.5px', background:'rgba(255,255,255,0.06)' }}/>
                <span style={{ fontSize:10, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
                  {groups[g].length}
                </span>
              </div>
              <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:10 }}>
                {groups[g].map(n => (
                  <NotifCard
                    key={n.id}
                    notif={n}
                    removing={removingId === n.id}
                    onTap={() => { if (n.unread) markRead(n.id); }}
                    onDismiss={() => dismiss(n.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
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
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap?.(); }
      }}
      className="mtx-tap"
      style={{
        position:'relative',
        padding:'14px 14px 14px 16px',
        borderRadius:18,
        background: n.unread ? 'rgba(61,255,209,0.04)' : 'var(--glass-2)',
        border: n.unread ? '0.5px solid rgba(61,255,209,0.2)' : '0.5px solid var(--glass-stroke)',
        boxShadow: n.unread
          ? '0 4px 18px rgba(61,255,209,0.06), inset 0 1px 0 rgba(255,255,255,0.04)'
          : 'var(--shadow-card)',
        cursor:'pointer',
        animation: removing
          ? 'mtxNotifOut .24s ease forwards'
          : (isAchievement && n.unread
              ? 'mtxAchievementGlow 3s ease-in-out infinite, mtxNotifIn .3s ease both'
              : 'mtxNotifIn .3s ease both'),
        overflow:'hidden',
      }}>
      {/* Left accent bar for unread */}
      {n.unread && (
        <div style={{
          position:'absolute', top:14, bottom:14, left:0,
          width:3, borderRadius:'0 4px 4px 0',
          background:n.accent,
          boxShadow:`0 0 10px ${n.accent}aa`,
        }}/>
      )}

      {/* Dot unread (top-right) */}
      {n.unread && (
        <div style={{
          position:'absolute', top:14, right:14,
          width:7, height:7, borderRadius:999,
          background:'var(--neon)',
          boxShadow:'0 0 8px var(--neon-glow)',
          animation:'mtxDotPulse 2s ease-in-out infinite',
        }}/>
      )}

      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        {/* Icon */}
        <div style={{
          width:42, height:42, borderRadius:13, flexShrink:0,
          background:`linear-gradient(180deg, ${n.accent}28, ${n.accent}06)`,
          border:`0.5px solid ${n.accent}33`,
          display:'flex', alignItems:'center', justifyContent:'center',
          color:n.accent,
          boxShadow:`inset 0 0 14px ${n.accent}10, inset 0 1px 0 rgba(255,255,255,0.06)`,
          position:'relative',
        }}>
          <Ic size={20} stroke="currentColor" strokeWidth={1.8}/>
          {isAchievement && (
            <div style={{
              position:'absolute', inset:-2,
              borderRadius:15,
              border:`0.5px solid ${n.accent}40`,
              animation:'mtxAchievementGlow 3s ease-in-out infinite',
              pointerEvents:'none',
            }}/>
          )}
        </div>

        {/* Content */}
        <div style={{ flex:1, minWidth:0, paddingRight:n.unread ? 14 : 0 }}>
          <div style={{
            fontSize:14, fontWeight:600,
            color:'var(--ink-1)',
            letterSpacing:'-0.01em', lineHeight:1.3,
          }}>{n.title}</div>
          <div style={{
            fontSize:12.5, color:'var(--ink-2)',
            marginTop:3, lineHeight:1.45,
            textWrap:'pretty',
          }}>{n.body}</div>

          {n.spark && <NotifSparkline data={n.spark} accent={n.accent}/>}

          {n.bigStat && (
            <div style={{ marginTop:8, display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{
                fontSize:30, fontWeight:700,
                color:n.accent, letterSpacing:'-0.04em',
                fontFamily:'var(--ff-display)', lineHeight:1,
                textShadow:`0 0 18px ${n.accent}40`,
              }}>{n.bigStat}</span>
              <span style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>
                distracciones
              </span>
            </div>
          )}

          <div style={{
            marginTop: n.cta ? 10 : 6,
            display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
          }}>
            <span style={{
              fontSize:11, color:'var(--ink-3)',
              letterSpacing:'-0.005em',
              flex: n.cta ? 'unset' : 1,
              fontVariantNumeric:'tabular-nums',
            }}>{n.time}</span>
            {n.cta && (
              <>
                <span style={{ flex:1 }}/>
                <button
                  onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                  className="mtx-tap"
                  style={{
                    appearance:'none', cursor:'pointer',
                    padding:'6px 10px', borderRadius:8, border:0,
                    background:'transparent',
                    color:'var(--ink-3)',
                    fontFamily:'var(--ff-sans)', fontSize:11, fontWeight:500,
                  }}>
                  Descartar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="mtx-tap"
                  style={{
                    appearance:'none', cursor:'pointer',
                    padding:'7px 13px', borderRadius:10,
                    background:`linear-gradient(180deg, ${n.accent}33, ${n.accent}10)`,
                    border:`0.5px solid ${n.accent}55`,
                    color:n.accent,
                    fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:600,
                    letterSpacing:'-0.005em',
                    boxShadow:`inset 0 0 10px ${n.accent}10, 0 4px 12px -6px ${n.accent}55`,
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
  const w = 140, h = 30;
  const max  = Math.max(...data);
  const min  = Math.min(...data);
  const r    = max - min || 1;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${h - ((v - min) / r) * h}`).join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  const id = `sparkfill-${accent.replace('#','')}`;

  return (
    <div style={{ marginTop:10, position:'relative' }}>
      <svg width={w} height={h} style={{ display:'block' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4"/>
            <stop offset="100%" stopColor={accent} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#${id})`}/>
        <polyline points={points} fill="none" stroke={accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle
          cx={(data.length - 1) * stepX}
          cy={h - ((data[data.length - 1] - min) / r) * h}
          r="2.5" fill={accent}
          style={{ filter:`drop-shadow(0 0 4px ${accent})` }}/>
      </svg>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────
function NotifEmpty({ filter }) {
  const copy = {
    all:         { title:'Bandeja en silencio',         body:'Aquí aparecerán tus recordatorios, logros e insights.' },
    reminder:    { title:'Sin recordatorios pendientes', body:'Tu día está bajo control. Bien hecho.' },
    achievement: { title:'Tu próximo logro está cerca',  body:'Sigue tu rutina y desbloquéalo.' },
    insight:     { title:'Generando tus insights',       body:'Necesitamos algunas sesiones más para mostrarte patrones.' },
  }[filter] || { title:'', body:'' };

  return (
    <div style={{
      padding:'80px 36px',
      display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:16,
    }}>
      <div style={{
        position:'relative',
        width:88, height:88, borderRadius:24,
        background:'radial-gradient(60% 60% at 50% 30%, rgba(61,255,209,0.18), rgba(61,255,209,0.04))',
        border:'0.5px solid rgba(61,255,209,0.25)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'var(--neon)',
        boxShadow:'0 0 32px rgba(61,255,209,0.18), inset 0 0 24px rgba(61,255,209,0.05)',
      }}>
        <IcBell size={32} stroke="currentColor" strokeWidth={1.4}/>
      </div>
      <div>
        <div style={{ fontSize:18, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em' }}>
          {copy.title}
        </div>
        <div style={{ fontSize:13, color:'var(--ink-3)', marginTop:6, maxWidth:260, lineHeight:1.5 }}>
          {copy.body}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { NotificationsSheet });
