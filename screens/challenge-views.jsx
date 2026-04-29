// challenge-views.jsx — Tarjeta, bottom-sheet de detalle y pantalla "Ver todo"

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const STATUS_COPY = {
  available: { label: 'DISPONIBLE', cta: 'Únete al desafío' },
  joined: { label: 'EN CURSO', cta: 'Continuar hoy' },
  completed: { label: 'COMPLETADO', cta: 'Ver tu resumen' }
};

const formatParticipants = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

// ─────────────────────────────────────────────────────────────
// MtxChallengeCard — usado en home y en "Ver todo"
// ─────────────────────────────────────────────────────────────
function MtxChallengeCard({ challenge: c, onClick, variant = 'default' }) {
  const pct = c.total > 0 ? c.day / c.total : 0;
  const isJoined = c.status === 'joined';
  const isDone = c.status === 'completed';
  const isAvail = c.status === 'available';
  const isGrid = variant === 'grid';

  // ── Grid variant: vertical layout (icon centered top → chip → title → meta → progress)
  if (isGrid) {
    return (
      <div onClick={onClick} className="mtx-glass mtx-tap" style={{
        width: '100%',
        padding: '18px 14px 16px',
        borderRadius: 18,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, minHeight: 200,
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        background: isJoined ?
        'linear-gradient(180deg, rgba(61,255,209,0.06), rgba(61,255,209,0.005))' :
        isDone ?
        'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.005))' :
        'var(--glass-2)',
        border: isJoined ?
        '0.5px solid rgba(61,255,209,0.22)' :
        isDone ?
        '0.5px solid rgba(255,255,255,0.07)' :
        '0.5px solid var(--glass-stroke)',
        boxShadow: isJoined ?
        '0 8px 24px -10px rgba(61,255,209,0.22), inset 0 0 18px rgba(61,255,209,0.04)' :
        'var(--shadow-card)',
        opacity: isDone ? 0.78 : 1
      }}>
        {/* Subtle joined glow */}
        {isJoined &&
        <div style={{
          position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
          width: 120, height: 80,
          background: 'radial-gradient(closest-side, rgba(61,255,209,0.12), transparent 70%)',
          pointerEvents: 'none', filter: 'blur(10px)'
        }} />
        }

        {/* Icon (large, centered) */}
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: isJoined ? 'rgba(61,255,209,0.16)' : isDone ? 'rgba(255,255,255,0.05)' : 'rgba(61,255,209,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isDone ? 'var(--ink-2)' : 'var(--neon)',
          boxShadow: isJoined ? '0 0 18px rgba(61,255,209,0.3)' : 'none',
          position: 'relative', zIndex: 1
        }}>
          <c.Ic size={22} stroke="currentColor" />
        </div>

        {/* Status chip (small, below icon) */}
        <span style={{
          fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em',
          padding: '2px 7px', borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          color: isDone ? 'rgba(255,255,255,0.55)' : 'var(--neon)',
          background: isDone ? 'rgba(255,255,255,0.04)' : 'rgba(61,255,209,0.08)',
          border: isDone ? '0.5px solid rgba(255,255,255,0.07)' : '0.5px solid rgba(61,255,209,0.25)',
          position: 'relative', zIndex: 1
        }}>
          {isDone && <IcCheck size={9} stroke="currentColor" strokeWidth={2.5} />}
          {isJoined && <span style={{
            width: 4, height: 4, borderRadius: 999, background: 'var(--neon)',
            boxShadow: '0 0 5px var(--neon-glow)',
            animation: 'mtx-pulse 2s ease-in-out infinite'
          }} />}
          {STATUS_COPY[c.status].label}
        </span>

        {/* Title (centered, 2 lines max) */}
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--ink-1)',
          letterSpacing: '-0.01em', textAlign: 'center', lineHeight: 1.3,
          textDecoration: isDone ? 'line-through' : 'none',
          textDecorationColor: 'rgba(255,255,255,0.2)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          overflowWrap: 'anywhere', wordBreak: 'break-word',
          minWidth: 0, maxWidth: '100%',
          flex: 1
        }}>
          {c.title}
        </div>

        {/* Meta (1 line, centered) */}
        <div style={{
          fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center',
          lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', maxWidth: '100%'
        }}>
          {isJoined && c.day > 0 ? `Día ${c.day} de ${c.total}` :
          isDone ? 'Completado' :
          `${formatParticipants(c.participants)} personas`}
        </div>

        {/* Progress bar (full width) */}
        <div style={{
          width: '100%',
          height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 999,
          overflow: 'hidden', position: 'relative', marginTop: 2
        }}>
          <div style={{
            position: 'absolute', inset: 0, width: `${Math.max(pct * 100, isAvail ? 0 : 4)}%`,
            background: isDone ?
            'linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.32))' :
            'linear-gradient(90deg, var(--neon-soft), var(--neon-deep))',
            boxShadow: isDone ? 'none' : '0 0 8px var(--neon-glow)'
          }} />
        </div>
      </div>);

  }

  // ── Default variant: horizontal (used in home carousel)
  return (
    <div onClick={onClick} className="mtx-glass mtx-tap" style={{
      width: 220,
      padding: 16, borderRadius: 20,
      display: 'flex', flexDirection: 'column', gap: 12,
      cursor: 'pointer', position: 'relative', overflow: 'hidden',
      background: isJoined ?
      'linear-gradient(180deg, rgba(61,255,209,0.08), rgba(61,255,209,0.01))' :
      isDone ?
      'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))' :
      'var(--glass-2)',
      border: isJoined ?
      '0.5px solid rgba(61,255,209,0.28)' :
      isDone ?
      '0.5px solid rgba(255,255,255,0.08)' :
      '0.5px solid var(--glass-stroke)',
      boxShadow: isJoined ?
      '0 0 0 1px rgba(61,255,209,0.12), 0 14px 36px -12px rgba(61,255,209,0.35), inset 0 0 24px rgba(61,255,209,0.06)' :
      'var(--shadow-card)',
      opacity: isDone ? 0.78 : 1
    }}>
      {/* Soft accent glow on joined */}
      {isJoined &&
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 100, height: 100,
        borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(61,255,209,0.18), transparent 70%)',
        pointerEvents: 'none', filter: 'blur(8px)'
      }} />
      }

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: isJoined ? 'rgba(61,255,209,0.18)' : isDone ? 'rgba(255,255,255,0.06)' : 'rgba(61,255,209,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isDone ? 'var(--ink-2)' : 'var(--neon)',
          boxShadow: isJoined ? '0 0 16px rgba(61,255,209,0.35)' : 'none'
        }}>
          <c.Ic size={19} stroke="currentColor" />
        </div>

        {/* Status chip */}
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
          padding: '3px 7px', borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          color: isDone ? 'rgba(255,255,255,0.6)' : 'var(--neon)',
          background: isDone ? 'rgba(255,255,255,0.05)' : 'rgba(61,255,209,0.10)',
          border: isDone ? '0.5px solid rgba(255,255,255,0.08)' : '0.5px solid rgba(61,255,209,0.3)'
        }}>
          {isDone && <IcCheck size={10} stroke="currentColor" strokeWidth={2.5} />}
          {isJoined && <span style={{
            width: 5, height: 5, borderRadius: 999, background: 'var(--neon)',
            boxShadow: '0 0 6px var(--neon-glow)',
            animation: 'mtx-pulse 2s ease-in-out infinite'
          }} />}
          {STATUS_COPY[c.status].label}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 3, letterSpacing: '-0.01em',
          textDecoration: isDone ? 'line-through' : 'none',
          textDecorationColor: 'rgba(255,255,255,0.2)' }}>
          {c.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {isJoined && c.day > 0 ? `Día ${c.day} de ${c.total}` :
          isDone ? `Completaste los ${c.total} días` :
          `${c.total} días · ${formatParticipants(c.participants)} personas`}
        </div>
      </div>

      <div style={{
        height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999,
        overflow: 'hidden', position: 'relative'
      }}>
        <div style={{
          position: 'absolute', inset: 0, width: `${pct * 100}%`,
          background: isDone ?
          'linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.35))' :
          'linear-gradient(90deg, var(--neon-soft), var(--neon-deep))',
          boxShadow: isDone ? 'none' : '0 0 12px var(--neon-glow)'
        }} />
      </div>
    </div>);

}

const isAvailableStatus = (c) => c.status === 'available';

// ─────────────────────────────────────────────────────────────
// MtxChallengeDetail — bottom-sheet con detalle y CTA
// ─────────────────────────────────────────────────────────────
function MtxChallengeDetail({ challenge: c, onClose, onJoin, onLeave }) {
  if (!c) return null;
  const isJoined = c.status === 'joined';
  const isDone = c.status === 'completed';
  const status = STATUS_COPY[c.status];
  const pct = c.total > 0 ? c.day / c.total : 0;

  // grid de días (para joined / completed)
  const days = Array.from({ length: c.total }, (_, i) => i + 1);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 110,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      animation: 'mtx-fade-up .25s ease'
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background: 'rgba(15,19,19,0.94)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        borderTop: '0.5px solid rgba(255,255,255,0.12)',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        padding: '12px 0 28px',
        boxShadow: '0 -24px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)',
        maxHeight: '92%', overflow: 'auto',
        animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)'
      }}>
        {/* Grabber */}
        <div style={{
          width: 38, height: 4, borderRadius: 999, margin: '0 auto 16px',
          background: 'rgba(255,255,255,0.18)'
        }} />

        {/* Hero */}
        <div style={{
          margin: '0 20px 18px', borderRadius: 22, padding: '24px 22px',
          background: `radial-gradient(90% 130% at 0% 0%, ${c.accent}26, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))`,
          border: `0.5px solid ${c.accent}33`,
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Decorative orb */}
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%',
            background: `radial-gradient(closest-side, ${c.accent}22, transparent 70%)`,
            pointerEvents: 'none', filter: 'blur(14px)'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 18,
              background: `linear-gradient(180deg, ${c.accent}30, ${c.accent}10)`,
              border: `0.5px solid ${c.accent}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: c.accent, boxShadow: `0 0 24px ${c.accent}44`
            }}>
              <c.Ic size={28} stroke="currentColor" />
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="mtx-tap" style={{
              width: 36, height: 36, borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-1)', cursor: 'pointer'
            }}><IcClose size={16} stroke="currentColor" /></button>
          </div>

          <div className="mtx-eyebrow" style={{ color: c.accent, marginBottom: 6, fontSize: 10 }}>
            {c.category} · {status.label}
          </div>
          <h2 className="mtx-h-1" style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {c.title}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>
            {c.tagline}
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 20px', marginBottom: 18 }}>
          <DetailStat label="Dificultad"
          value={
          <span style={{ display: 'inline-flex', gap: 2 }}>
                {[1, 2, 3].map((i) =>
            <span key={i} style={{
              width: 6, height: 14, borderRadius: 2,
              background: i <= c.difficulty ? c.accent : 'rgba(255,255,255,0.08)',
              boxShadow: i <= c.difficulty ? `0 0 6px ${c.accent}77` : 'none'
            }} />
            )}
              </span>
          } />
          <DetailStat label="Por día" value={`${c.dailyMin} min`} />
          <DetailStat label="Comunidad" value={formatParticipants(c.participants)} sub="activos" />
        </div>

        {/* Description */}
        <div style={{ padding: '0 20px', marginBottom: 18 }}>
          <div className="mtx-eyebrow" style={{ marginBottom: 8, fontSize: 10 }}>Sobre el desafío</div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-2)', textWrap: 'pretty' }}>
            {c.desc}
          </p>
        </div>

        {/* Daily includes */}
        <div style={{ padding: '0 20px', marginBottom: 18 }}>
          <div className="mtx-eyebrow" style={{ marginBottom: 10, fontSize: 10 }}>Cada día incluye</div>
          <div className="mtx-glass" style={{ borderRadius: 18, padding: 4 }}>
            {c.daily.map((d, i) =>
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              borderTop: i === 0 ? 0 : '0.5px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{
                width: 22, height: 22, borderRadius: 7,
                background: `${c.accent}1a`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: c.accent
              }}>
                  <span style={{ fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>{d}</div>
              </div>
            )}
          </div>
        </div>

        {/* Day grid (only if joined or completed) */}
        {(isJoined || isDone) &&
        <div style={{ padding: '0 20px', marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="mtx-eyebrow" style={{ fontSize: 10 }}>Tu progreso</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {Math.round(pct * 100)}% · {c.day}/{c.total} días
              </div>
            </div>
            <div style={{
            display: 'grid',
            gridTemplateColumns: c.total <= 14 ?
            `repeat(${c.total}, 1fr)` :
            'repeat(10, 1fr)',
            gap: 6
          }}>
              {days.map((d) => {
              const completed = d <= c.day;
              const isToday = isJoined && d === c.day + 1;
              return (
                <div key={d} style={{
                  aspectRatio: '1', borderRadius: 8,
                  background: completed ?
                  `linear-gradient(180deg, ${c.accent}33, ${c.accent}15)` :
                  isToday ?
                  `${c.accent}14` :
                  'rgba(255,255,255,0.04)',
                  border: completed ?
                  `0.5px solid ${c.accent}55` :
                  isToday ?
                  `1px dashed ${c.accent}77` :
                  '0.5px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600,
                  color: completed ? c.accent : isToday ? c.accent : 'var(--ink-3)',
                  boxShadow: completed ? `0 0 10px ${c.accent}33` : 'none'
                }}>
                    {completed ? <IcCheck size={10} stroke="currentColor" strokeWidth={2.5} /> : d}
                  </div>);

            })}
            </div>
          </div>
        }

        {/* CTA */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="mtx-btn-neon mtx-tap" style={{ width: '100%' }}
          onClick={() => {onJoin(c.id);}}>
            {isJoined && <IcPlay size={14} stroke="currentColor" />}
            {isAvailableStatus(c) && <IcPlus size={16} stroke="currentColor" strokeWidth={2} />}
            {isDone && <IcCheck size={14} stroke="currentColor" strokeWidth={2.5} />}
            {status.cta}
          </button>
          {isJoined &&
          <button className="mtx-tap" style={{
            width: '100%', height: 48, borderRadius: 14,
            background: 'transparent', border: '0.5px solid rgba(255,255,255,0.1)',
            color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--ff-sans)'
          }} onClick={() => onLeave(c.id)}>
              Abandonar desafío
            </button>
          }
        </div>
      </div>
    </div>);

}

function DetailStat({ label, value, sub }) {
  return (
    <div className="mtx-glass" style={{
      padding: '10px 12px', borderRadius: 14,
      display: 'flex', flexDirection: 'column', gap: 4
    }}>
      <div className="mtx-eyebrow" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: 4 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>{sub}</div>}
    </div>);

}

// ─────────────────────────────────────────────────────────────
// ChallengesAllScreen — pantalla full "Ver todo"
// ─────────────────────────────────────────────────────────────
function ChallengesAllScreen({ challenges, onBack, onChallengeClick }) {
  const [filter, setFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');

  // Filtros por categoría (mismo patrón que Aprendizaje)
  const TABS = React.useMemo(() => {
    const cats = Array.from(new Set(challenges.map((c) => c.category).filter(Boolean)));
    const order = ['Mindfulness', 'Productividad', 'Bienestar', 'Aprendizaje', 'Disciplina'];
    const sorted = cats.sort((a, b) => {
      const ai = order.indexOf(a);const bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return [
    { id: 'all', label: 'Todos', count: challenges.length },
    ...sorted.map((cat) => ({
      id: cat, label: cat,
      count: challenges.filter((c) => c.category === cat).length
    }))];

  }, [challenges]);

  const filtered = React.useMemo(() => {
    return challenges.filter((c) => {
      if (filter !== 'all' && c.category !== filter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return c.title.toLowerCase().includes(q) ||
        (c.tagline || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [challenges, filter, query]);

  return (
    <div style={{
      width: '100%', minHeight: '100%',
      background: 'var(--bg-app)',
      position: 'relative',
      animation: 'mtx-fade-up .3s ease both'
    }} className="mtx-no-scrollbar">
      {/* Background ambient — sutil, mismo patrón que Aprendizaje */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background:
        'radial-gradient(80% 50% at 100% 0%, rgba(155,138,255,0.035) 0%, transparent 60%),' +
        'radial-gradient(60% 50% at 0% 0%, rgba(61,255,209,0.02) 0%, transparent 60%)'
      }} />

      {/* Header centrado y minimalista */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '60px 20px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 60
      }}>
        <button onClick={onBack} aria-label="Atrás" className="mtx-tap" style={{
          position: 'absolute', left: 20, top: 56,
          width: 40, height: 40, borderRadius: 999,
          background: 'var(--glass-2)',
          border: '0.5px solid var(--glass-stroke)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-1)', cursor: 'pointer'
        }}>
          <IcChevL size={17} stroke="currentColor" />
        </button>
        <div style={{
          fontSize: 18, fontWeight: 600, color: 'var(--ink-1)',
          letterSpacing: '-0.01em', fontFamily: 'var(--ff-display)'
        }}>Desafíos</div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', zIndex: 1, padding: '4px 20px 12px' }}>
        <div className="mtx-glass" style={{
          height: 46, borderRadius: 14,
          background: 'var(--glass-1)',
          border: '0.5px solid var(--glass-stroke)',
          display: 'flex', alignItems: 'center', gap: 10, padding: "0 14px"
        }}>
          <IcSearch size={16} stroke="var(--ink-3)" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar desafío o categoría…"
          style={{
            flex: 1, height: '100%', border: 0, background: 'transparent',
            color: 'var(--ink-1)', fontSize: 14, outline: 'none',
            fontFamily: 'var(--ff-sans)'
          }} />
          {query &&
          <button onClick={() => setQuery('')} aria-label="Limpiar" style={{
            border: 0, background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer',
            padding: 4
          }}><IcClose size={14} stroke="currentColor" /></button>
          }
        </div>
      </div>

      {/* Filter pills */}
      <div className="mtx-scroll-x" style={{
        position: 'relative', zIndex: 1,
        paddingLeft: 20, paddingRight: 20, gap: 8, paddingBottom: 14
      }}>
        {TABS.map((t) => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)} className="mtx-tap" style={{
              height: 36, padding: '0 14px', borderRadius: 999,
              background: active ?
              'linear-gradient(180deg, rgba(61,255,209,0.16), rgba(61,255,209,0.06))' :
              'var(--glass-2)',
              border: active ?
              '0.5px solid rgba(61,255,209,0.45)' :
              '0.5px solid var(--glass-stroke)',
              color: active ? 'var(--neon)' : 'var(--ink-2)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--ff-sans)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: active ? '0 0 16px rgba(61,255,209,0.25)' : 'none',
              flexShrink: 0
            }}>
              {t.label}
              <span style={{
                fontSize: 10, fontWeight: 700,
                padding: '2px 6px', borderRadius: 999,
                background: active ? 'rgba(61,255,209,0.18)' : 'rgba(255,255,255,0.06)',
                color: active ? 'var(--neon)' : 'var(--ink-3)',
                fontVariantNumeric: 'tabular-nums'
              }}>{t.count}</span>
            </button>);

        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ?
      <div style={{ position: 'relative', zIndex: 1, padding: '50px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.6, color: 'var(--ink-3)' }}>·</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Nada coincide con tu búsqueda.</div>
        </div> :

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12,
        padding: '4px 20px 24px'
      }}>
          {filtered.map((c) =>
        <MtxChallengeCard key={c.id} challenge={c} variant="grid"
        onClick={() => onChallengeClick(c)} />
        )}
        </div>
      }
    </div>);

}

function HeroStat({ value, label, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{
        fontSize: 26, fontWeight: 800,
        color: accent ? 'var(--neon)' : 'var(--ink-1)',
        letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums',
        textShadow: accent ? '0 0 18px rgba(61,255,209,0.4)' : 'none'
      }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
    </div>);

}

Object.assign(window, {
  MtxChallengeCard, MtxChallengeDetail, ChallengesAllScreen
});