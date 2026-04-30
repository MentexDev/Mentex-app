// profile-stats-sheets.jsx — Bottom sheets para Lv / Horas / Seguidores
// Patrón consistente con BreakPickerSheet (session-flow.jsx): backdrop blur,
// drag-handle, slide-up, swipe-down close, ESC close.

// ── LEVEL_TIERS — ladder oficial Mentex con progresión y % de comunidad ─────
const _LEVEL_TIERS = [
  { lvl: 1,  label: 'Mente Curiosa',     desc: 'Diste el primer paso. La curiosidad es el motor.',                            percentile: 100, Ic: IcSpark,    accent: '#a8a8a8' },
  { lvl: 3,  label: 'Mente Inquieta',    desc: 'Empiezas a hacerte preguntas mejores que respuestas.',                        percentile: 62,  Ic: IcCompass,  accent: '#9bd45e' },
  { lvl: 5,  label: 'Mente en Foco',     desc: 'Has aprendido a sostener tu atención cuando todos la regalan.',               percentile: 28,  Ic: IcTarget,   accent: '#5dd3ff' },
  { lvl: 7,  label: 'Mente Despierta',   desc: 'Has cruzado el umbral del foco sostenido. Aprendes con intención.',           percentile: 8,   Ic: IcBrain,    accent: '#3dffd1' },
  { lvl: 10, label: 'Maestro del Foco',  desc: 'Tu atención es un activo escaso. Pocos llegan tan lejos.',                    percentile: 3,   Ic: IcShield,   accent: '#FFD66B' },
  { lvl: 12, label: 'Mente Sabia',       desc: 'Conectas ideas a través de campos. Tu mente es una red, no una estantería.',  percentile: 1.5, Ic: IcSparkles, accent: '#ff8b6a' },
  { lvl: 15, label: 'Sabio Naciente',    desc: 'No solo aprendes — transformas lo que aprendes en quién eres.',                percentile: 0.6, Ic: IcCrown,    accent: '#9b8aff' },
  { lvl: 18, label: 'Mente Maestra',     desc: 'Has hecho del aprendizaje un deporte de alto rendimiento.',                    percentile: 0.2, Ic: IcTrophy,   accent: '#FFD66B' },
];

const _findCurrentTier = (level) => {
  let current = _LEVEL_TIERS[0];
  for (const t of _LEVEL_TIERS) {
    if (t.lvl <= level) current = t;
  }
  return current;
};
const _findNextTier = (level) => {
  for (const t of _LEVEL_TIERS) {
    if (t.lvl > level) return t;
  }
  return null;
};

// ── Hook común: drag-to-dismiss, ESC, body scroll lock ─────────────────────
function useStatSheet(onClose) {
  const [dragY, setDragY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStart = React.useRef(0);
  const dragActive = React.useRef(false);

  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = e.clientY;
    dragActive.current = true;
    setIsDragging(true);
  };
  const onMove = (e) => {
    if (!dragActive.current) return;
    setDragY(Math.max(0, e.clientY - dragStart.current));
  };
  const onUp = () => {
    dragActive.current = false;
    setIsDragging(false);
    if (dragY > 80) onClose?.();
    else setDragY(0);
  };

  React.useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (typing) return;
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return { dragY, isDragging, onDown, onMove, onUp };
}

// ── Wrapper común para los 3 sheets ────────────────────────────────────────
// `zIndex` configurable para casos donde el sheet vive sobre otro overlay
// con z-index alto (ej. RankingScreen con z=165).
// `footer` opcional renderiza un bloque fijo al fondo (no scrollea con el body).
function StatSheetShell({ onClose, accent = '#3dffd1', children, footer, maxHeight = '88%', zIndex = 90 }) {
  const drag = useStatSheet(onClose);
  return (
    <div style={{
      position:'absolute', inset:0, zIndex,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.62)',
      backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <style>{`
        @keyframes mtxStatSheetUp { from { transform:translateY(100%); opacity:0.6; } to { transform:translateY(0); opacity:1; } }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        position:'relative',
        background:'linear-gradient(180deg, rgba(20,24,22,0.97) 0%, rgba(10,14,13,0.99) 100%)',
        backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight,
        display:'flex', flexDirection:'column',
        boxShadow:`0 -24px 72px -16px rgba(0,0,0,0.7), 0 -1px 0 ${accent}1a inset`,
        transform:`translateY(${drag.dragY}px)`,
        transition: drag.isDragging ? 'none' : 'transform .35s cubic-bezier(.25,.8,.25,1)',
        animation:'mtxStatSheetUp .42s cubic-bezier(.2,.9,.3,1.1) both',
        overflow:'hidden',
        fontFamily:'var(--ff-sans)',
      }}>
        {/* Halo accent en el top edge */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:120,
          background:`radial-gradient(60% 100% at 50% 0%, ${accent}24 0%, transparent 70%)`,
          pointerEvents:'none',
        }}/>

        {/* Drag handle */}
        <div onPointerDown={drag.onDown} onPointerMove={drag.onMove} onPointerUp={drag.onUp} onPointerCancel={drag.onUp}
          style={{ display:'flex', justifyContent:'center', paddingTop:14, paddingBottom:8, cursor:'grab', touchAction:'none', position:'relative', zIndex:2, flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.22)' }}/>
        </div>

        {/* Scroll body */}
        <div className="mtx-no-scrollbar" style={{
          flex:1, overflowY:'auto', overflowX:'hidden', WebkitOverflowScrolling:'touch',
          position:'relative', zIndex:1,
          paddingBottom: footer ? 16 : 32,
        }}>
          {children}
        </div>

        {/* Footer fijo (opcional) — sobre el scroll body */}
        {footer && (
          <div style={{
            flexShrink:0,
            padding:'14px 20px 22px',
            background:'linear-gradient(180deg, rgba(15,19,18,0.6) 0%, rgba(10,14,13,0.98) 50%)',
            borderTop:'0.5px solid rgba(255,255,255,0.06)',
            backdropFilter:'blur(20px) saturate(140%)',
            WebkitBackdropFilter:'blur(20px) saturate(140%)',
            position:'relative', zIndex:2,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// LevelSheet — info del nivel + percentil + roadmap
// ─────────────────────────────────────────────────────────────────────────────
function LevelSheet({ profile, onClose }) {
  if (!profile) return null;

  const tier = _findCurrentTier(profile.level);
  const nextTier = _findNextTier(profile.level);
  const accent = tier.accent;
  const xpPct = Math.min(1, profile.xp / profile.xpToNext);

  // Stats orgullo (mock estables por user)
  const seed = (profile.id || 'me').charCodeAt(0) || 65;
  const totalXp = profile.level * 380 + profile.xp + (seed * 13) % 90;
  const daysSinceStart = 30 + (seed * 7) % 200;
  const completedItems = Math.max(8, ((profile.hours || 47) >> 1) + (seed * 3) % 14);

  // Requisitos hacia next level (mock)
  const xpRemaining = profile.xpToNext - profile.xp;
  const requirementsToNext = nextTier ? [
    { Ic: IcZap,       label: `${xpRemaining} XP`,                    sub: 'Suma puntos completando contenido',  color: '#FFD66B' },
    { Ic: IcEdit,      label: `${Math.max(1, 5 - (seed % 4))} reseñas`, sub: 'Publica tus reflexiones',             color: '#3dffd1' },
    { Ic: IcFlame,     label: '7 días consecutivos',                  sub: 'Mantén tu racha activa',              color: '#ff8b6a' },
  ] : [];

  return (
    <StatSheetShell onClose={onClose} accent={accent}>
      {/* Hero — Badge gigante con conic ring + halo */}
      <div style={{
        padding:'6px 24px 18px',
        textAlign:'center', position:'relative',
      }}>
        <div className="mtx-eyebrow" style={{
          fontSize:10, color: accent, letterSpacing:'0.16em', fontWeight:700,
          marginBottom:18,
          textShadow:`0 0 12px ${accent}55`,
        }}>
          Tu nivel actual
        </div>

        {/* Badge XL */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
          {window.AchievementBadge
            ? <window.AchievementBadge Ic={tier.Ic} accent={accent} size={120}/>
            : null}
        </div>

        <div style={{
          fontSize:42, fontWeight:800, color:'var(--ink-1)',
          fontFamily:'var(--ff-display)', letterSpacing:'-0.035em', lineHeight:1,
          marginBottom:6,
        }}>
          Lv {profile.level}
        </div>
        <div style={{
          fontSize:18, fontWeight:700, color: accent,
          letterSpacing:'-0.018em', lineHeight:1.1,
          marginBottom:10,
          textShadow:`0 0 14px ${accent}33`,
        }}>
          {tier.label}
        </div>
        <div style={{
          fontSize:13.5, color:'var(--ink-2)', lineHeight:1.55,
          letterSpacing:'-0.005em',
          maxWidth:300, margin:'0 auto', textWrap:'pretty',
        }}>
          {tier.desc}
        </div>
      </div>

      {/* Percentil — pill prominente */}
      <div style={{ padding:'0 24px 18px' }}>
        <div className="mtx-glass" style={{
          padding:'14px 16px', borderRadius:16,
          background:`linear-gradient(180deg, ${accent}14, rgba(255,255,255,0.012))`,
          border:`0.5px solid ${accent}30`,
          boxShadow:`0 0 0 0.5px ${accent}1a, 0 12px 28px -16px ${accent}50`,
          display:'flex', alignItems:'center', gap:12,
        }}>
          <div style={{
            width:42, height:42, borderRadius:12, flexShrink:0,
            background:`linear-gradient(135deg, ${accent}33, ${accent}10)`,
            border:`0.5px solid ${accent}55`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: accent,
            boxShadow:`0 0 12px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.14)`,
          }}>
            <IcCrown size={20} stroke="currentColor"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.012em', lineHeight:1.2 }}>
              Solo el {tier.percentile}% llega aquí
            </div>
            <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:3, letterSpacing:'-0.005em', lineHeight:1.4 }}>
              De toda la comunidad de Mentex.
            </div>
          </div>
        </div>
      </div>

      {/* Stats orgullo grid */}
      <div style={{
        padding:'0 24px 18px',
        display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8,
      }}>
        {[
          { label: 'XP total',     value: totalXp.toLocaleString(),       unit: 'puntos',     color: '#FFD66B' },
          { label: 'Tu travesía',  value: String(daysSinceStart),         unit: 'días',       color: accent },
          { label: 'Completados',  value: String(completedItems),         unit: 'piezas',     color: '#9b8aff' },
        ].map(s => (
          <div key={s.label} className="mtx-glass" style={{
            padding:'11px 10px', borderRadius:14,
            background:`linear-gradient(180deg, ${s.color}0e, rgba(255,255,255,0.012))`,
            border:`0.5px solid ${s.color}26`,
            textAlign:'center',
          }}>
            <div style={{ fontSize:8.5, fontWeight:700, color: s.color, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:5 }}>
              {s.label}
            </div>
            <div style={{
              fontSize:20, fontWeight:800, color:'var(--ink-1)',
              fontVariantNumeric:'tabular-nums', letterSpacing:'-0.025em', lineHeight:1,
              fontFamily:'var(--ff-display)',
            }}>
              {s.value}
            </div>
            <div style={{ fontSize:10, fontWeight:500, color:'var(--ink-3)', marginTop:3 }}>
              {s.unit}
            </div>
          </div>
        ))}
      </div>

      {/* XP progress hacia next level */}
      {nextTier && (
        <div style={{ padding:'0 24px 4px' }}>
          <div className="mtx-glass" style={{
            padding:'16px 16px 14px', borderRadius:16,
            background:'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))',
            border:'0.5px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:'#FFD66B', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:2 }}>
                  Hacia Lv {nextTier.lvl}
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.012em' }}>
                  {nextTier.label}
                </div>
              </div>
              <div style={{
                fontSize:11, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums', textAlign:'right',
              }}>
                <span style={{ color:'var(--ink-1)', fontWeight:700, fontSize:13 }}>{profile.xp}</span>
                <span style={{ marginLeft:2 }}>/ {profile.xpToNext} XP</span>
              </div>
            </div>
            <div style={{
              height:8, borderRadius:999,
              background:'rgba(255,255,255,0.06)',
              overflow:'hidden', position:'relative',
            }}>
              <div style={{
                height:'100%', width:`${xpPct * 100}%`,
                background:`linear-gradient(90deg, ${accent} 0%, #FFD66B 100%)`,
                boxShadow:`0 0 14px ${accent}88, inset 0 1px 0 rgba(255,255,255,0.32)`,
                borderRadius:999,
                transition:'width .6s cubic-bezier(.25,.8,.25,1)',
              }}/>
            </div>
          </div>
        </div>
      )}

      {/* Requisitos para next level */}
      {nextTier && requirementsToNext.length > 0 && (
        <div style={{ padding:'12px 24px 4px' }}>
          <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2 }}>
            Lo que falta
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {requirementsToNext.map((r, i) => (
              <div key={i} className="mtx-glass" style={{
                padding:'12px 14px', borderRadius:14,
                background:'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.008))',
                border:'0.5px solid rgba(255,255,255,0.06)',
                display:'flex', alignItems:'center', gap:12,
              }}>
                <div style={{
                  width:36, height:36, borderRadius:10, flexShrink:0,
                  background:`linear-gradient(135deg, ${r.color}24, ${r.color}06)`,
                  border:`0.5px solid ${r.color}33`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: r.color,
                }}>
                  <r.Ic size={16} stroke="currentColor" strokeWidth={1.7}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.01em', lineHeight:1.2 }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2, letterSpacing:'-0.005em', lineHeight:1.4 }}>
                    {r.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </StatSheetShell>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// HoursSheet — equivalencias narrativas + breakdown + evolución
// ─────────────────────────────────────────────────────────────────────────────
function HoursSheet({ profile, onClose, segments }) {
  if (!profile) return null;
  const accent = profile.accent || '#3dffd1';
  const hours = profile.hours || 47;

  // Breakdown — usa segments pasados (si existe) o defaults
  const breakdown = segments && segments.length > 0 ? segments : [
    { label: 'Audiolibros',  value: Math.round(hours * 0.42), color: '#3dffd1' },
    { label: 'Meditaciones', value: Math.round(hours * 0.22), color: '#9b8aff' },
    { label: 'Charlas',      value: Math.round(hours * 0.18), color: '#5dd3ff' },
    { label: 'Series',       value: Math.round(hours * 0.10), color: '#FFD66B' },
    { label: 'Sonidos',      value: Math.round(hours * 0.08), color: '#9bd45e' },
  ];
  const totalBreakdown = breakdown.reduce((s, x) => s + x.value, 0) || 1;

  // Evolución 6 meses (mock estable por user)
  const seed = (profile.id || 'me').charCodeAt(0) || 65;
  const months = ['Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr'];
  // Distribución más expresiva: amplitud mayor para que la curva tenga vida
  const monthData = months.map((_, i) => {
    const base = hours / 6;
    const variation = ((seed * (i + 2)) % 14) - 4; // -4..+9
    return Math.max(3, Math.round(base + variation));
  });
  const monthMax = Math.max(...monthData);
  const monthMin = Math.min(...monthData);
  const bestMonthIdx = monthData.indexOf(monthMax);
  const monthsTotal = monthData.reduce((s, v) => s + v, 0);
  const monthsAvg = (monthsTotal / months.length);

  // Travesía en números (métricas universales — no atadas a "libros")
  const sessions = Math.max(20, Math.round(hours * 2.4 + (seed % 10)));
  const daysActive = Math.max(8, Math.min(180, Math.round(hours * 0.7 + (seed * 3) % 24)));
  const avgDailyMin = Math.max(8, Math.round((hours * 60) / Math.max(1, daysActive)));
  const longestSessionMin = Math.max(28, Math.round(35 + (seed % 60) + Math.min(60, hours / 2)));
  const fmtSessionDur = (m) => m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m} min`;

  // Geometría del area chart (SVG path con gradient fill)
  const chartW = 320, chartH = 110, padX = 6, padY = 8;
  const range = Math.max(1, monthMax - monthMin);
  const points = monthData.map((v, i) => {
    const x = padX + (i / (months.length - 1)) * (chartW - padX * 2);
    // Normalizamos con un piso mínimo para que ningún punto toque el bottom
    const norm = (v - monthMin) / range;
    const y = padY + (1 - (norm * 0.85 + 0.10)) * (chartH - padY * 2);
    return { x, y, v, i };
  });
  // Smoothing — Catmull-Rom-ish para que la línea no sea lineal entre puntos
  const pathLine = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cx1 = prev.x + (p.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (p.x - prev.x) / 2;
    const cy2 = p.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
  }, '');
  const pathArea = `${pathLine} L ${chartW - padX} ${chartH} L ${padX} ${chartH} Z`;
  const peakPoint = points[bestMonthIdx];

  return (
    <StatSheetShell onClose={onClose} accent={accent}>
      {/* Hero numérico */}
      <div style={{
        padding:'6px 24px 18px',
        textAlign:'center',
      }}>
        <div className="mtx-eyebrow" style={{
          fontSize:10, color: accent, letterSpacing:'0.16em', fontWeight:700,
          marginBottom:14,
          textShadow:`0 0 12px ${accent}55`,
        }}>
          Tu universo de aprendizaje
        </div>
        <div style={{
          fontSize:88, fontWeight:800, color:'var(--ink-1)',
          fontFamily:'var(--ff-display)',
          letterSpacing:'-0.06em', lineHeight:0.95,
          fontVariantNumeric:'tabular-nums',
          background:`linear-gradient(180deg, var(--ink-1) 0%, ${accent} 100%)`,
          WebkitBackgroundClip:'text', backgroundClip:'text',
          WebkitTextFillColor:'transparent', color:'transparent',
          marginBottom:2,
        }}>
          {hours}
        </div>
        <div style={{
          fontSize:14, fontWeight:700, color:'var(--ink-2)',
          letterSpacing:'0.12em', textTransform:'uppercase',
          marginBottom:14,
        }}>
          Horas de aprendizaje
        </div>
        <div style={{
          fontSize:13.5, color:'var(--ink-2)', lineHeight:1.55,
          letterSpacing:'-0.005em',
          maxWidth:300, margin:'0 auto', textWrap:'pretty',
        }}>
          Cada hora aquí es una hora que no se gastó en scroll vacío. Tu mente está acumulando interés compuesto.
        </div>
      </div>

      {/* Tu travesía en números — 4 stats editoriales (sin iconos pesados, números XL gradient) */}
      <div style={{ padding:'0 24px 18px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2 }}>
          Tu travesía en números
        </div>
        <div className="mtx-glass" style={{
          padding:'4px 2px',
          borderRadius:16,
          background:'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))',
          border:'0.5px solid rgba(255,255,255,0.06)',
          display:'grid', gridTemplateColumns:'1fr 1fr',
        }}>
          {[
            { label: 'Días activos',     value: String(daysActive),                                       unit: daysActive === 1 ? 'día' : 'días', color: accent },
            { label: 'Sesiones',         value: String(sessions),                                         unit: 'piezas',                          color: '#FFD66B' },
            { label: 'Promedio diario',  value: String(avgDailyMin),                                      unit: 'min/día',                         color: '#5dd3ff' },
            { label: 'Sesión más larga', value: longestSessionMin >= 60 ? Math.round(longestSessionMin) : longestSessionMin, unit: 'min',          color: '#ff8b6a' },
          ].map((s, i) => (
            <div key={s.label} style={{
              padding:'14px 16px 13px',
              borderRight: i % 2 === 0 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
              borderBottom: i < 2 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
              minWidth:0,
            }}>
              <div style={{
                fontSize:8.5, fontWeight:700, color:'var(--ink-3)', letterSpacing:'0.12em', textTransform:'uppercase',
                marginBottom:7,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>
                {s.label}
              </div>
              <div style={{
                display:'flex', alignItems:'baseline', gap:5,
                fontFamily:'var(--ff-display)',
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>
                <span style={{
                  fontSize:26, fontWeight:800,
                  fontVariantNumeric:'tabular-nums', letterSpacing:'-0.03em', lineHeight:1,
                  background:`linear-gradient(180deg, var(--ink-1) 0%, ${s.color} 130%)`,
                  WebkitBackgroundClip:'text', backgroundClip:'text',
                  WebkitTextFillColor:'transparent', color:'transparent',
                }}>
                  {s.value}
                </span>
                <span style={{ fontSize:11, fontWeight:600, color:'var(--ink-3)', letterSpacing:'-0.005em' }}>
                  {s.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribución por categoría — donut + leyenda */}
      <div style={{ padding:'0 24px 18px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2 }}>
          Cómo se distribuyen
        </div>
        <div className="mtx-glass" style={{
          padding:'18px 18px 16px', borderRadius:16,
          background:'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))',
          border:'0.5px solid rgba(255,255,255,0.06)',
        }}>
          {/* Donut centrado — reusa StatsDonut del tab Estadísticas */}
          {window.StatsDonut && (
            <window.StatsDonut
              segments={breakdown}
              totalLabel="Total"
              totalValue={totalBreakdown}
              totalUnit="horas"
            />
          )}

          {/* Leyenda 2-col debajo — pills compactas */}
          <div style={{
            marginTop:18,
            display:'grid', gridTemplateColumns:'1fr 1fr', gap:7,
          }}>
            {breakdown.map(seg => {
              const pct = (seg.value / totalBreakdown) * 100;
              return (
                <div key={seg.label} style={{
                  display:'flex', alignItems:'center', gap:9,
                  padding:'8px 11px', borderRadius:10,
                  background:'rgba(255,255,255,0.025)',
                  minWidth:0,
                }}>
                  <span style={{
                    width:8, height:8, borderRadius:'50%', flexShrink:0,
                    background: seg.color, boxShadow:`0 0 6px ${seg.color}88`,
                  }}/>
                  <span style={{
                    flex:1, minWidth:0,
                    fontSize:11.5, fontWeight:600, color:'var(--ink-1)', letterSpacing:'-0.005em',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                    {seg.label}
                  </span>
                  <span style={{
                    fontSize:11, fontWeight:700, color: seg.color, fontVariantNumeric:'tabular-nums', flexShrink:0,
                  }}>
                    {Math.round(pct)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Evolución últimos 6 meses — area chart con peak resaltado */}
      <div style={{ padding:'0 24px 18px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2 }}>
          Evolución
        </div>
        <div className="mtx-glass" style={{
          padding:'16px 16px 14px', borderRadius:16,
          background:'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))',
          border:'0.5px solid rgba(255,255,255,0.06)',
          position:'relative', overflow:'hidden',
        }}>
          {/* Header: KPIs in-line */}
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:10, gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.014em', lineHeight:1.2 }}>
                Últimos 6 meses
              </div>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2, letterSpacing:'-0.005em' }}>
                Promedio: <span style={{ color:'var(--ink-1)', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{monthsAvg.toFixed(1)} hr/mes</span>
              </div>
            </div>
            <div style={{
              padding:'5px 11px', borderRadius:999,
              background:'linear-gradient(180deg, rgba(255,214,107,0.16), rgba(255,214,107,0.04))',
              border:'0.5px solid rgba(255,214,107,0.34)',
              color:'#FFD66B',
              fontSize:11, fontWeight:700,
              fontVariantNumeric:'tabular-nums',
              letterSpacing:'-0.005em',
              display:'inline-flex', alignItems:'center', gap:5,
              boxShadow:'0 0 10px rgba(255,214,107,0.18)',
              flexShrink:0,
            }}>
              <IcTrend size={11} stroke="currentColor" strokeWidth={1.9}/>
              {months[bestMonthIdx]} · {monthData[bestMonthIdx]} hr
            </div>
          </div>

          {/* Area chart SVG */}
          <div style={{ position:'relative', width:'100%', height: chartH + 22 }}>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none"
                 style={{ position:'absolute', inset:0, width:'100%', height: chartH, display:'block' }}>
              <defs>
                <linearGradient id="mtxHoursAreaG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={accent} stopOpacity="0.55"/>
                  <stop offset="60%"  stopColor={accent} stopOpacity="0.16"/>
                  <stop offset="100%" stopColor={accent} stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="mtxHoursLineG" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor={accent} stopOpacity="0.6"/>
                  <stop offset="50%"  stopColor={accent} stopOpacity="1"/>
                  <stop offset="100%" stopColor="#FFD66B" stopOpacity="1"/>
                </linearGradient>
              </defs>

              {/* Grid lines sutiles */}
              {[0.25, 0.5, 0.75].map(p => (
                <line key={p}
                  x1={padX} y1={padY + (chartH - padY * 2) * p}
                  x2={chartW - padX} y2={padY + (chartH - padY * 2) * p}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="2 4"/>
              ))}

              {/* Area fill */}
              <path d={pathArea} fill="url(#mtxHoursAreaG)"/>

              {/* Line */}
              <path d={pathLine} fill="none" stroke="url(#mtxHoursLineG)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ filter: `drop-shadow(0 2px 6px ${accent}66)` }}/>

              {/* Peak point — anillo + dot */}
              <circle cx={peakPoint.x} cy={peakPoint.y} r="6" fill="rgba(255,214,107,0.18)" stroke="#FFD66B" strokeWidth="1.2"/>
              <circle cx={peakPoint.x} cy={peakPoint.y} r="3" fill="#FFD66B"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(255,214,107,0.8))' }}/>

              {/* Other points — pequeños */}
              {points.map((p, i) => i !== bestMonthIdx && (
                <circle key={i} cx={p.x} cy={p.y} r="2.2" fill={accent} opacity="0.85"
                        style={{ filter: `drop-shadow(0 0 4px ${accent}aa)` }}/>
              ))}
            </svg>

            {/* Month labels overlay */}
            <div style={{
              position:'absolute', left:0, right:0, bottom:0,
              display:'flex', justifyContent:'space-between',
              padding:`0 ${padX}px`,
            }}>
              {months.map((m, i) => (
                <span key={m} style={{
                  fontSize:9.5,
                  fontWeight: i === bestMonthIdx ? 700 : 500,
                  color: i === bestMonthIdx ? '#FFD66B' : 'var(--ink-3)',
                  letterSpacing:'0.06em', textTransform:'uppercase',
                  width: `${100 / months.length}%`,
                  textAlign:'center',
                }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </StatSheetShell>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// FollowersSheet — lista con tabs Seguidores/Siguiendo + buscador
// ─────────────────────────────────────────────────────────────────────────────

// Mock followers — en perfil propio (Juan Diego) usamos 6 autores de community + algunos extras
const _MOCK_EXTRA_FOLLOWERS = [
  { id:'sebastian', name:'Sebastián Rojas', accent:'#5dd3ff', initial:'S', tagline:'Estudiante de física' },
  { id:'valeria',   name:'Valeria Ortiz',   accent:'#ff8b6a', initial:'V', tagline:'Diseñadora UX' },
  { id:'martin',    name:'Martín Acuña',    accent:'#9bd45e', initial:'M', tagline:'Founder en stealth' },
  { id:'camila',    name:'Camila Vargas',   accent:'#9b8aff', initial:'C', tagline:'Psicología & flow' },
];

function _resolveDirectoryAuthors() {
  const community = window._MOCK_COMMUNITY_AUTHORS || [];
  return [...community, ..._MOCK_EXTRA_FOLLOWERS];
}

function FollowerRow({ user, isOwn, onTapProfile, accent }) {
  // El perfil propio puede dejar de seguir; en perfil ajeno también puede follow/unfollow al follower
  const [following, setFollowing] = React.useState(() => window.__mtxFollows ? window.__mtxFollows.isFollowing(user.id) : false);
  React.useEffect(() => {
    if (!window.__mtxFollows) return;
    setFollowing(window.__mtxFollows.isFollowing(user.id));
    const h = () => setFollowing(window.__mtxFollows.isFollowing(user.id));
    window.addEventListener('mtx:follows-changed', h);
    return () => window.removeEventListener('mtx:follows-changed', h);
  }, [user.id]);

  const toast = window.useToast ? window.useToast() : { show: () => {} };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!window.__mtxFollows) return;
    if (following) {
      window.__mtxFollows.unfollow(user.id);
      toast.show({ message: `Dejaste de seguir a ${user.name.split(' ')[0]}`, duration: 1500 });
    } else {
      window.__mtxFollows.follow(user.id);
      toast.show({ message: `Ahora sigues a ${user.name.split(' ')[0]}`, duration: 1600 });
    }
  };

  const handleProfile = () => onTapProfile?.(user.id);
  const userAccent = user.accent || '#3dffd1';

  return (
    <div className="mtx-tap" style={{
      display:'flex', alignItems:'center', gap:11,
      padding:'10px 12px', borderRadius:14,
      background:'rgba(255,255,255,0.02)',
      border:'0.5px solid rgba(255,255,255,0.05)',
      transition:'background .18s, border-color .18s',
    }}>
      {/* Avatar + name area — tappable abre perfil */}
      <div
        onClick={handleProfile}
        role="button"
        tabIndex={0}
        aria-label={`Ver perfil de ${user.name}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleProfile(); } }}
        style={{ display:'flex', alignItems:'center', gap:11, flex:1, minWidth:0, cursor:'pointer' }}
      >
        <div style={{
          width:42, height:42, borderRadius:'50%', flexShrink:0,
          background:`linear-gradient(135deg, ${userAccent}55, ${userAccent}1a)`,
          border:`0.5px solid ${userAccent}66`,
          display:'flex', alignItems:'center', justifyContent:'center',
          color: userAccent, fontSize: 18, fontWeight:700,
          fontFamily:'var(--ff-display)', letterSpacing:'-0.02em',
          boxShadow:`0 0 12px ${userAccent}33, inset 0 1px 0 rgba(255,255,255,0.12)`,
          overflow:'hidden',
        }}>
          {user.avatar ? (
            <img src={user.avatar} alt="" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          ) : (
            user.initial
          )}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontSize:13.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.008em',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
            {user.name}
          </div>
          <div style={{
            fontSize:11, color:'var(--ink-3)', letterSpacing:'-0.005em', marginTop:1,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
            {user.tagline}
          </div>
        </div>
      </div>

      {/* Follow toggle CTA — neon transparente estándar (consistente en toda la app) */}
      <button
        onClick={handleToggle}
        aria-label={following ? `Dejar de seguir a ${user.name}` : `Seguir a ${user.name}`}
        className="mtx-tap"
        style={{
          appearance:'none', cursor:'pointer', flexShrink:0,
          display:'inline-flex', alignItems:'center', gap:5,
          padding:'7px 12px', height:30,
          borderRadius:999,
          border: following
            ? '0.5px solid rgba(255,255,255,0.14)'
            : '0.5px solid rgba(61,255,209,0.45)',
          background: following
            ? 'rgba(255,255,255,0.05)'
            : 'linear-gradient(180deg, rgba(61,255,209,0.18), rgba(61,255,209,0.04))',
          color: following ? 'var(--ink-1)' : 'var(--neon)',
          fontFamily:'var(--ff-sans)', fontSize:11.5, fontWeight:700,
          letterSpacing:'-0.005em',
          boxShadow: following
            ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
            : '0 0 0 0.5px rgba(61,255,209,0.18), 0 6px 14px -8px rgba(61,255,209,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          transition:'background .2s, color .2s, box-shadow .25s, border-color .2s',
        }}
      >
        {following ? (
          <>
            <IcUserCheck size={11} stroke="currentColor" strokeWidth={1.9}/>
            Siguiendo
          </>
        ) : (
          <>
            <IcUserPlus size={11} stroke="currentColor" strokeWidth={2}/>
            Seguir
          </>
        )}
      </button>
    </div>
  );
}

function FollowersSheet({ profile, onClose, isOwn = false, initialTab = 'followers' }) {
  if (!profile) return null;
  const accent = profile.accent || '#3dffd1';
  const [tab, setTab] = React.useState(initialTab); // 'followers' | 'following'
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef(null);

  // Re-render reactivo a follows. `followsTick` SE incrementa (es state),
  // a diferencia de `force` (dispatch) que es referencia estable y no invalida memos.
  const [followsTick, bumpFollows] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const h = () => bumpFollows();
    window.addEventListener('mtx:follows-changed', h);
    return () => window.removeEventListener('mtx:follows-changed', h);
  }, []);

  // Listas: derivadas determinísticamente por user. Para MVP, usamos directorio común.
  const directory = React.useMemo(() => _resolveDirectoryAuthors(), []);
  // `isFollowingProfile` necesita re-evaluarse en cada follow/unfollow — leemos cada render
  // (no es memo) y `followsTick` en deps de los memos abajo asegura el re-render correcto.
  const isFollowingProfile = profile.id !== 'me' && window.__mtxFollows ? window.__mtxFollows.isFollowing(profile.id) : false;

  const followersList = React.useMemo(() => {
    // Para perfil propio: muestra todos del directorio (curado)
    // Para perfil ajeno: usamos hash determinístico para variedad
    if (isOwn) return directory;
    const seed = (profile.id || '').charCodeAt(0) || 65;
    const shuffle = directory.filter(u => u.id !== profile.id);
    return shuffle.filter((_, i) => ((seed + i) * 7) % 3 !== 0).slice(0, Math.max(4, shuffle.length - 2));
  }, [directory, isOwn, profile.id]);

  const followingList = React.useMemo(() => {
    if (isOwn) {
      // Set de IDs que el usuario sigue actualmente. Se re-calcula cuando
      // followsTick incrementa (cada follow/unfollow dispara mtx:follows-changed).
      const set = window.__mtxFollows
        ? new Set(directory.filter(u => window.__mtxFollows.isFollowing(u.id)).map(u => u.id))
        : new Set();
      return directory.filter(u => set.has(u.id));
    }
    // Perfil ajeno: lista derivada determinística (a quién sigue ese user)
    const seed = (profile.id || '').charCodeAt(0) || 65;
    const shuffle = directory.filter(u => u.id !== profile.id);
    return shuffle.filter((_, i) => ((seed * (i + 3)) % 4) !== 0).slice(0, Math.max(3, shuffle.length - 3));
  }, [directory, isOwn, profile.id, followsTick]);

  const counts = {
    followers: isOwn
      ? (window.__mtxFollows ? window.__mtxFollows.countMyFollowers() : followersList.length)
      : (window._USER_STATS_MOCK?.[profile.id]?.followers || followersList.length) + (isFollowingProfile ? 1 : 0),
    following: isOwn
      ? (window.__mtxFollows ? window.__mtxFollows.countMyFollowing() : followingList.length)
      : (window._USER_STATS_MOCK?.[profile.id]?.following || followingList.length),
  };

  const activeList = tab === 'followers' ? followersList : followingList;
  const filteredList = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeList;
    return activeList.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.tagline || '').toLowerCase().includes(q)
    );
  }, [activeList, query]);

  const handleTapProfile = (userId) => {
    if (userId === 'me') return;
    onClose?.();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('mtx:open-user-profile', { detail: { userId } }));
    }, 200);
  };

  const TABS = [
    { id: 'followers', label: 'Seguidores', count: counts.followers },
    { id: 'following', label: 'Siguiendo',  count: counts.following },
  ];

  return (
    <StatSheetShell onClose={onClose} accent={accent} maxHeight="92%">
      {/* Header */}
      <div style={{ padding:'4px 24px 12px' }}>
        <div className="mtx-eyebrow" style={{
          fontSize:10, color: accent, letterSpacing:'0.16em', fontWeight:700,
          marginBottom:6,
          textShadow:`0 0 12px ${accent}44`,
        }}>
          {isOwn ? 'Tu comunidad' : `Comunidad de ${profile.name.split(' ')[0]}`}
        </div>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:'var(--ink-1)', letterSpacing:'-0.022em', fontFamily:'var(--ff-display)' }}>
          {isOwn ? 'Las mentes que te rodean' : 'Mentes que orbitan'}
        </h2>
      </div>

      {/* Tabs pill */}
      <div style={{ padding:'0 24px 12px' }}>
        <div style={{
          display:'flex', gap:4,
          padding:4, borderRadius:14,
          background:'rgba(255,255,255,0.05)',
          border:'0.5px solid rgba(255,255,255,0.08)',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
          {TABS.map(t => {
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className="mtx-tap" style={{
                flex:1, height:38, borderRadius:10, border:0, cursor:'pointer',
                background: isActive
                  ? `linear-gradient(180deg, ${accent}24, ${accent}06)`
                  : 'transparent',
                color: isActive ? accent : 'var(--ink-2)',
                fontFamily:'var(--ff-sans)', fontSize:12.5, fontWeight: isActive ? 700 : 600,
                letterSpacing:'-0.005em',
                boxShadow: isActive
                  ? `0 0 0 0.5px ${accent}40, 0 6px 14px -8px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.08)`
                  : 'none',
                display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5,
                transition:'background .22s, color .22s, box-shadow .28s',
              }}>
                {t.label}
                <span style={{
                  fontSize:10.5, fontWeight:700, fontVariantNumeric:'tabular-nums',
                  padding:'1.5px 6px', borderRadius:999,
                  background: isActive ? `${accent}22` : 'rgba(255,255,255,0.06)',
                  color: isActive ? accent : 'var(--ink-3)',
                }}>
                  {typeof t.count === 'number' && t.count >= 1000 ? `${(t.count / 1000).toFixed(1)}k` : t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding:'0 24px 14px' }}>
        <div style={{
          display:'flex', alignItems:'center', gap:9,
          padding:'10px 14px', borderRadius:13,
          background:'rgba(255,255,255,0.04)',
          border:'0.5px solid rgba(255,255,255,0.08)',
        }}>
          <IcSearch size={14} stroke="var(--ink-3)" strokeWidth={1.7}/>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'followers' ? 'Buscar entre seguidores' : 'Buscar entre siguiendo'}
            style={{
              flex:1, background:'transparent', border:0, outline:'none',
              color:'var(--ink-1)',
              fontFamily:'var(--ff-sans)', fontSize:13, letterSpacing:'-0.005em',
              minWidth:0,
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Limpiar" className="mtx-tap" style={{
              appearance:'none', cursor:'pointer', border:0, background:'transparent',
              color:'var(--ink-3)', display:'inline-flex', alignItems:'center',
            }}>
              <IcClose size={13} stroke="currentColor" strokeWidth={1.8}/>
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div style={{ padding:'0 24px 8px', display:'flex', flexDirection:'column', gap:7 }}>
        {filteredList.length === 0 ? (
          <div style={{ padding:'40px 20px', textAlign:'center' }}>
            <div style={{
              width:56, height:56, borderRadius:18, margin:'0 auto 12px',
              background:'rgba(255,255,255,0.04)',
              border:'0.5px solid rgba(255,255,255,0.08)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--ink-3)',
            }}>
              <IcUsers size={22} stroke="currentColor" strokeWidth={1.5}/>
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.014em', marginBottom:4 }}>
              {query ? 'Nadie coincide' : tab === 'followers' ? 'Sin seguidores aún' : 'No sigues a nadie aún'}
            </div>
            <div style={{ fontSize:11.5, color:'var(--ink-3)', maxWidth:260, margin:'0 auto', lineHeight:1.5 }}>
              {query ? 'Intenta con otro nombre.' : tab === 'followers'
                ? 'Cuando alguien te siga aparecerá aquí.'
                : 'Explora reseñas y sigue mentes que te inspiren.'}
            </div>
          </div>
        ) : (
          filteredList.map(u => (
            <FollowerRow
              key={u.id} user={u} isOwn={isOwn}
              onTapProfile={handleTapProfile}
              accent={accent}
            />
          ))
        )}
      </div>
    </StatSheetShell>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// AchievementSheet — detalle de un logro (badge XL + narrativa + percentil + progreso)
// ─────────────────────────────────────────────────────────────────────────────
function AchievementSheet({ achievement, onClose }) {
  if (!achievement) return null;
  const tiers = window._ACHIEVEMENT_TIERS || {};
  const tier = tiers[achievement.tier] || { label:'Logro', color:'#3dffd1', glow:'rgba(61,255,209,0.45)' };
  const accent = tier.color;
  const isUnlocked = !!achievement.unlocked;
  const pct = Math.min(1, achievement.current / achievement.target);
  const left = Math.max(0, achievement.target - achievement.current);

  // Contexto narrativo extra según el tier (qué significa tener este logro)
  const tierContext = {
    common:    'Lo tiene la mayoría de quienes empiezan en serio.',
    rare:      `Solo el ${achievement.percentile}% de la comunidad llega aquí.`,
    epic:      `Solo el ${achievement.percentile}% de Mentex sostiene este nivel.`,
    legendary: `Apenas el ${achievement.percentile}% de toda la comunidad llega tan lejos.`,
    mythic:    `Menos de uno por cada mil. Esto es panteón.`,
  }[achievement.tier] || '';

  return (
    <StatSheetShell onClose={onClose} accent={accent}>
      {/* Hero — Badge XL + tier label + name */}
      <div style={{ padding:'6px 24px 18px', textAlign:'center', position:'relative' }}>
        <div className="mtx-eyebrow" style={{
          fontSize:10, color: accent, letterSpacing:'0.18em', fontWeight:800,
          marginBottom:14,
          textShadow:`0 0 12px ${accent}66`,
        }}>
          {tier.label}
        </div>

        {/* Badge XL */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:18, position:'relative' }}>
          {isUnlocked ? (
            window.AchievementBadge
              ? <window.AchievementBadge Ic={achievement.Ic} accent={accent} size={120}/>
              : null
          ) : (
            <div style={{ position:'relative', width:120, height:120 }}>
              <div style={{
                position:'absolute', inset:0, borderRadius:'50%',
                background:'rgba(255,255,255,0.025)',
                border:'0.5px dashed rgba(255,255,255,0.18)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--ink-3)',
              }}>
                <IcLock size={42} stroke="currentColor" strokeWidth={1.5}/>
              </div>
              {/* Halo aspiracional muy sutil */}
              <div style={{
                position:'absolute', inset:-12, borderRadius:'50%',
                background:`radial-gradient(circle, ${accent}10 0%, transparent 65%)`,
                pointerEvents:'none', filter:'blur(8px)',
              }}/>
            </div>
          )}
        </div>

        <h2 style={{
          margin:0, fontSize:30, fontWeight:800, color:'var(--ink-1)',
          fontFamily:'var(--ff-display)', letterSpacing:'-0.03em', lineHeight:1.05,
          marginBottom:8,
        }}>
          {achievement.name}
        </h2>

        {/* Status pill */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding:'5px 12px', borderRadius:999,
          background: isUnlocked ? `${accent}1f` : 'rgba(255,255,255,0.04)',
          border: isUnlocked ? `0.5px solid ${accent}55` : '0.5px solid rgba(255,255,255,0.08)',
          color: isUnlocked ? accent : 'var(--ink-3)',
          fontSize:11, fontWeight:700, letterSpacing:'-0.005em',
          marginBottom:14,
          boxShadow: isUnlocked ? `0 0 10px ${accent}33` : 'none',
        }}>
          {isUnlocked ? (
            <>
              <IcCheck size={11} stroke="currentColor" strokeWidth={2.2}/>
              Desbloqueado{achievement.unlockedAgoDays === 0 ? ' hoy' : achievement.unlockedAgoDays === 1 ? ' ayer' : achievement.unlockedAgoDays > 0 ? ` hace ${achievement.unlockedAgoDays} días` : ''}
            </>
          ) : (
            <>
              <IcLock size={10} stroke="currentColor" strokeWidth={1.8}/>
              En progreso · {Math.round(pct * 100)}%
            </>
          )}
        </div>

        {/* Narrative — el "porqué" del logro */}
        <div style={{
          fontSize:13.5, color:'var(--ink-2)', lineHeight:1.55,
          letterSpacing:'-0.005em',
          maxWidth:320, margin:'0 auto', textWrap:'pretty',
        }}>
          {achievement.narrative || achievement.tagline}
        </div>
      </div>

      {/* Percentil pill (rareza) */}
      <div style={{ padding:'0 24px 16px' }}>
        <div className="mtx-glass" style={{
          padding:'14px 16px', borderRadius:16,
          background:`linear-gradient(180deg, ${accent}14, rgba(255,255,255,0.012))`,
          border:`0.5px solid ${accent}30`,
          boxShadow:`0 0 0 0.5px ${accent}1a, 0 12px 28px -16px ${accent}50`,
          display:'flex', alignItems:'center', gap:12,
        }}>
          <div style={{
            width:42, height:42, borderRadius:12, flexShrink:0,
            background:`linear-gradient(135deg, ${accent}33, ${accent}10)`,
            border:`0.5px solid ${accent}55`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: accent,
            boxShadow:`0 0 12px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.14)`,
          }}>
            <IcCrown size={20} stroke="currentColor"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.012em', lineHeight:1.2 }}>
              Solo el {achievement.percentile}% llega aquí
            </div>
            <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:3, letterSpacing:'-0.005em', lineHeight:1.4 }}>
              {tierContext}
            </div>
          </div>
        </div>
      </div>

      {/* Progress card — solo si NO desbloqueado */}
      {!isUnlocked && (
        <div style={{ padding:'0 24px 16px' }}>
          <div className="mtx-glass" style={{
            padding:'16px 16px 14px', borderRadius:16,
            background:'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))',
            border:'0.5px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div>
                <div style={{
                  fontSize:9, fontWeight:700, color: accent, letterSpacing:'0.14em', textTransform:'uppercase',
                  marginBottom:3,
                }}>
                  Tu progreso
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.012em' }}>
                  Faltan {left} {achievement.unit}
                </div>
              </div>
              <div style={{
                fontSize:11, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums', textAlign:'right',
              }}>
                <span style={{ color:'var(--ink-1)', fontWeight:700, fontSize:14 }}>{achievement.current}</span>
                <span style={{ marginLeft:2 }}>/ {achievement.target} {achievement.unit}</span>
              </div>
            </div>
            <div style={{
              height:8, borderRadius:999,
              background:'rgba(255,255,255,0.06)',
              overflow:'hidden',
            }}>
              <div style={{
                height:'100%', width:`${pct * 100}%`,
                background:`linear-gradient(90deg, ${accent}aa 0%, ${accent} 100%)`,
                boxShadow:`0 0 14px ${accent}88, inset 0 1px 0 rgba(255,255,255,0.32)`,
                borderRadius:999,
                transition:'width .6s cubic-bezier(.25,.8,.25,1)',
              }}/>
            </div>
          </div>
        </div>
      )}

      {/* Tagline — qué requiere */}
      <div style={{ padding:'0 24px 4px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2 }}>
          Lo que se necesita
        </div>
        <div className="mtx-glass" style={{
          padding:'14px 14px', borderRadius:14,
          background:'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.008))',
          border:'0.5px solid rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', gap:12,
        }}>
          <div style={{
            width:36, height:36, borderRadius:10, flexShrink:0,
            background:`linear-gradient(135deg, ${accent}24, ${accent}06)`,
            border:`0.5px solid ${accent}33`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: accent,
          }}>
            <achievement.Ic size={16} stroke="currentColor" strokeWidth={1.7}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.008em', lineHeight:1.25 }}>
              {achievement.target} {achievement.unit} consecutivos sin redes
            </div>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2, letterSpacing:'-0.005em', lineHeight:1.4 }}>
              Mantén tu racha activa cada día.
            </div>
          </div>
        </div>
      </div>
    </StatSheetShell>
  );
}


Object.assign(window, {
  LevelSheet, HoursSheet, FollowersSheet, AchievementSheet,
  StatSheetShell, useStatSheet,
  _LEVEL_TIERS, _findCurrentTier, _findNextTier,
});
