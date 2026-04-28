// learning-views.jsx — Card, bottom-sheet de detalle y pantalla "Ver más"

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const LEARN_STATUS = {
  new:       { label: 'NUEVO',     dot: '#3dffd1' },
  scheduled: { label: 'AGENDADO',  dot: '#3dffd1' },
  saved:     { label: 'GUARDADO',  dot: '#9b8aff' },
  played:    { label: 'ESCUCHADO', dot: 'rgba(255,255,255,0.55)' },
};

const formatPlays = (n) => {
  if (typeof n !== 'string') return n;
  return n;
};

// ─────────────────────────────────────────────────────────────
// MtxLearningCard — usado en home y "Ver más"
// ─────────────────────────────────────────────────────────────
function MtxLearningCard({ item: l, onClick, variant = 'default' }) {
  const isScheduled = l.status === 'scheduled';
  const isSaved     = l.status === 'saved';
  const isPlayed    = l.status === 'played';

  return (
    <div onClick={onClick} className="mtx-glass mtx-tap" style={{
      width: variant === 'grid' ? '100%' : 200,
      borderRadius: 18, overflow: 'hidden', cursor: 'pointer',
      border: isScheduled
        ? `0.5px solid ${l.accent}55`
        : '0.5px solid var(--glass-stroke)',
      background: 'var(--glass-1)',
      boxShadow: isScheduled
        ? `0 0 0 1px ${l.accent}22, 0 14px 36px -12px ${l.accent}40`
        : 'var(--shadow-card)',
      position: 'relative',
      opacity: isPlayed ? 0.82 : 1,
    }}>
      {/* Cover area */}
      <div style={{
        height: variant === 'grid' ? 150 : 130,
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'flex-end', padding: 12,
        background: l.bg,
      }}>
        {l.cover && (
          <img src={l.cover} alt="" loading="lazy" style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: isPlayed ? 0.55 : 0.78,
            filter: 'saturate(0.9) contrast(1.05)',
          }}/>
        )}
        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)',
        }}/>
        {/* Color tint */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, ${l.accent}22, transparent 60%)`,
          mixBlendMode: 'soft-light',
        }}/>

        {/* Pin "agendado para hoy" — top-right pill */}
        {isScheduled && (
          <div style={{
            position: 'absolute', top: 10, right: 10, zIndex: 3,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 9px 4px 8px', borderRadius: 999,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            border: `0.5px solid ${l.accent}66`,
            boxShadow: `0 0 14px ${l.accent}55`,
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
            color: l.accent, textTransform: 'uppercase',
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: 999,
              background: l.accent, boxShadow: `0 0 6px ${l.accent}`,
              animation: 'mtx-pulse 1.6s ease-in-out infinite',
            }}/>
            Hoy
          </div>
        )}

        {/* Kind chip — only when no scheduled pin */}
        {!isScheduled && (
          <div style={{
            position: 'absolute', top: 10, right: 10, zIndex: 2,
            width: 28, height: 28, borderRadius: 999,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
            border: '0.5px solid rgba(255,255,255,0.15)',
          }}>
            {isPlayed
              ? <IcCheck size={11} stroke="currentColor" strokeWidth={2.5}/>
              : isSaved
                ? <IcBookmarkFill size={11} stroke="currentColor"/>
                : <IcPlay size={12}/>}
          </div>
        )}

        {/* Kind tag — top-left */}
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 2,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: l.accent,
          padding: '3px 8px', borderRadius: 999,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          border: `0.5px solid ${l.accent}40`,
        }}>{l.kind}</div>

        {/* Duration */}
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.85)', position: 'relative', zIndex: 2,
          fontWeight: 500, textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <IcClock size={10} stroke="currentColor"/>
          {l.dur}
        </div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {l.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{l.author}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MtxLearningDetail — bottom-sheet con preview y CTAs
// ─────────────────────────────────────────────────────────────
function MtxLearningDetail({ item: l, onClose, onPlay, onSchedule, onSave }) {
  if (!l) return null;
  const isScheduled = l.status === 'scheduled';
  const isSaved     = l.status === 'saved';
  const isPlayed    = l.status === 'played';

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      display: 'flex', alignItems: 'flex-end',
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      animation: 'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background: 'rgba(15,19,19,0.94)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderBottom: 0,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        width: '100%', maxHeight: '88%',
        overflowY: 'auto',
        paddingBottom: 28,
        boxShadow: '0 -20px 60px -12px rgba(0,0,0,0.6)',
        animation: 'mtx-sheet-up .32s cubic-bezier(.2,.9,.3,1.2)',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 6 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Hero — full-bleed cover */}
        <div style={{
          position: 'relative', height: 220, margin: '6px 16px 18px',
          borderRadius: 22, overflow: 'hidden',
          background: l.bg,
          border: `0.5px solid ${l.accent}33`,
        }}>
          {l.cover && (
            <img src={l.cover} alt="" style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: 0.85, filter: 'saturate(1.05) contrast(1.05)',
            }}/>
          )}
          {/* Gradient bottom overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 100%)',
          }}/>
          {/* Color blend */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at 80% 20%, ${l.accent}30, transparent 55%)`,
            mixBlendMode: 'screen',
          }}/>

          {/* Close */}
          <button onClick={onClose} aria-label="Cerrar" className="mtx-tap" style={{
            position: 'absolute', top: 12, right: 12,
            width: 36, height: 36, borderRadius: 999,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(10px)',
            border: '0.5px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-1)', cursor: 'pointer',
          }}><IcClose size={16} stroke="currentColor"/></button>

          {/* Kind chip */}
          <div style={{
            position: 'absolute', top: 14, left: 14,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: l.accent,
            padding: '5px 10px', borderRadius: 999,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(10px)',
            border: `0.5px solid ${l.accent}55`,
          }}>{l.kind}</div>

          {/* Title block bottom-left */}
          <div style={{
            position: 'absolute', left: 18, right: 18, bottom: 16,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{
              fontSize: 22, fontWeight: 700, color: '#fff',
              letterSpacing: '-0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.6)',
              fontFamily: 'var(--ff-display)',
            }}>
              {l.title}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', fontWeight: 500 }}>
              {l.author}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 20px', marginBottom: 18 }}>
          <DetailLearnStat label="Duración" value={l.dur} icon={<IcClock size={11} stroke="currentColor"/>}/>
          <DetailLearnStat label="Rating" value={`${l.rating} ★`}/>
          <DetailLearnStat label="Reproducciones" value={l.plays}/>
        </div>

        {/* Narrator */}
        <div style={{ padding: '0 20px', marginBottom: 18 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 999,
              background: `${l.accent}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: l.accent,
            }}>
              <IcMic size={13} stroke="currentColor"/>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>{l.narrator}</div>
          </div>
        </div>

        {/* Sinopsis */}
        <div style={{ padding: '0 20px', marginBottom: 18 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8,
          }}>Sinopsis</div>
          <div style={{
            fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)',
            textWrap: 'pretty',
          }}>{l.desc}</div>
        </div>

        {/* Capítulos */}
        <div style={{ padding: '0 20px', marginBottom: 22 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10,
          }}>Capítulos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {l.chapters.map((ch, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: l.accent,
                  width: 18, textAlign: 'center',
                  fontVariantNumeric: 'tabular-nums',
                }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>
                  {ch.t}
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--ink-3)',
                  fontVariantNumeric: 'tabular-nums',
                }}>{ch.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="mtx-btn-neon mtx-tap" style={{ width: '100%' }}
                  onClick={() => onPlay && onPlay(l.id)}>
            <IcPlay size={14} stroke="currentColor"/>
            {isPlayed ? 'Volver a escuchar' : 'Reproducir'}
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="mtx-tap" style={{
              height: 50, borderRadius: 14,
              border: isScheduled ? `0.5px solid ${l.accent}55` : '0.5px solid var(--glass-stroke)',
              background: isScheduled
                ? `linear-gradient(180deg, ${l.accent}1f, ${l.accent}08)`
                : 'var(--glass-2)',
              color: isScheduled ? l.accent : 'var(--ink-1)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--ff-sans)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: isScheduled ? `0 0 14px ${l.accent}33` : 'none',
            }} onClick={() => onSchedule && onSchedule(l.id)}>
              <IcCalendar size={14} stroke="currentColor"/>
              {isScheduled ? 'Agendado · hoy' : 'Agendar para hoy'}
            </button>

            <button className="mtx-tap" style={{
              height: 50, borderRadius: 14,
              border: isSaved ? '0.5px solid rgba(155,138,255,0.45)' : '0.5px solid var(--glass-stroke)',
              background: isSaved
                ? 'linear-gradient(180deg, rgba(155,138,255,0.18), rgba(155,138,255,0.06))'
                : 'var(--glass-2)',
              color: isSaved ? '#c8b8ff' : 'var(--ink-1)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--ff-sans)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: isSaved ? '0 0 14px rgba(155,138,255,0.3)' : 'none',
            }} onClick={() => onSave && onSave(l.id)}>
              {isSaved
                ? <IcBookmarkFill size={13} stroke="currentColor"/>
                : <IcBookmark size={13} stroke="currentColor"/>}
              {isSaved ? 'Guardado' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailLearnStat({ label, value, icon }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 14,
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--ink-3)',
      }}>{label}</div>
      <div style={{
        fontSize: 13, fontWeight: 600, color: 'var(--ink-1)',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {icon}{value}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LearningAllScreen — pantalla full "Ver más"
// Vista preview tipo "explorar": pills por tipo de contenido,
// header centrado minimalista, sin métricas personales.
// ─────────────────────────────────────────────────────────────
function LearningAllScreen({ learning, onBack, onLearningClick }) {
  const [filter, setFilter] = React.useState('all');
  const [query, setQuery]   = React.useState('');

  // Construir TABS dinámicamente desde los kinds presentes
  const TABS = React.useMemo(() => {
    const kinds = Array.from(new Set(learning.map(l => l.kind)));
    // Orden preferido — kinds reconocidos primero, otros al final
    const order = ['Resumen', 'Meditación', 'Sonido', 'Biografía', 'Charla', 'Curso'];
    const sorted = kinds.sort((a, b) => {
      const ai = order.indexOf(a); const bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    // Pluralización ligera
    const pluralize = (k) => {
      if (k === 'Meditación') return 'Meditaciones';
      if (k === 'Biografía')  return 'Biografías';
      if (k === 'Charla')     return 'Charlas';
      if (k === 'Resumen')    return 'Resúmenes';
      if (k === 'Sonido')     return 'Sonidos';
      if (k === 'Curso')      return 'Cursos';
      return k;
    };
    return [
      { id: 'all', label: 'Todos', count: learning.length },
      ...sorted.map(k => ({
        id: k, label: pluralize(k),
        count: learning.filter(l => l.kind === k).length,
      })),
    ];
  }, [learning]);

  const filtered = React.useMemo(() => {
    return learning.filter(l => {
      if (filter !== 'all' && l.kind !== filter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return l.title.toLowerCase().includes(q)
            || l.author.toLowerCase().includes(q)
            || l.kind.toLowerCase().includes(q)
            || (l.category || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [learning, filter, query]);

  return (
    <div className="mtx-no-scrollbar" style={{
      width: '100%', minHeight: '100%',
      background: 'var(--bg-0)',
      position: 'relative',
      animation: 'mtx-fade-up .28s ease',
    }}>
      {/* Background ambient — fixed to fill */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background:
          'radial-gradient(80% 50% at 100% 0%, rgba(155,138,255,0.04) 0%, transparent 60%),' +
          'radial-gradient(60% 60% at 0% 100%, rgba(61,255,209,0.025) 0%, transparent 60%)',
      }}/>

      {/* Header — centered title, back button absolute left */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '60px 20px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 60,
      }}>
        <button onClick={onBack} aria-label="Atrás" className="mtx-tap" style={{
          position: 'absolute', left: 20, top: 56,
          width: 40, height: 40, borderRadius: 999,
          background: 'var(--glass-2)',
          border: '0.5px solid var(--glass-stroke)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-1)', cursor: 'pointer',
        }}>
          <IcChevL size={17} stroke="currentColor"/>
        </button>
        <div style={{
          fontSize: 18, fontWeight: 600, color: 'var(--ink-1)',
          letterSpacing: '-0.01em', fontFamily: 'var(--ff-display)',
        }}>Aprendizaje</div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', zIndex: 1, padding: '4px 20px 12px' }}>
        <div className="mtx-glass" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          height: 46, padding: '0 14px', borderRadius: 14,
          background: 'var(--glass-1)',
          border: '0.5px solid var(--glass-stroke)',
        }}>
          <IcSearch size={16} stroke="var(--ink-3)"/>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
                 placeholder="Buscar autor, título o categoría…"
                 style={{
                   flex: 1, border: 0, background: 'transparent', outline: 'none',
                   color: 'var(--ink-1)', fontSize: 14, fontFamily: 'var(--ff-sans)',
                 }}/>
          {query && (
            <button onClick={() => setQuery('')} aria-label="Limpiar" style={{
              border: 0, background: 'transparent', color: 'var(--ink-3)',
              cursor: 'pointer', padding: 4,
            }}><IcClose size={14} stroke="currentColor"/></button>
          )}
        </div>
      </div>

      {/* Filter pills — by kind */}
      <div className="mtx-scroll-x" style={{
        position: 'relative', zIndex: 1,
        paddingLeft: 20, paddingRight: 20, gap: 8, paddingBottom: 14,
      }}>
        {TABS.map(t => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)} className="mtx-tap" style={{
              height: 36, padding: '0 14px', borderRadius: 999,
              background: active
                ? 'linear-gradient(180deg, rgba(61,255,209,0.16), rgba(61,255,209,0.06))'
                : 'var(--glass-2)',
              border: active
                ? '0.5px solid rgba(61,255,209,0.45)'
                : '0.5px solid var(--glass-stroke)',
              color: active ? 'var(--neon)' : 'var(--ink-2)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--ff-sans)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: active ? '0 0 16px rgba(61,255,209,0.25)' : 'none',
              flexShrink: 0,
            }}>
              {t.label}
              <span style={{
                fontSize: 10, fontWeight: 700,
                padding: '2px 6px', borderRadius: 999,
                background: active ? 'rgba(61,255,209,0.18)' : 'rgba(255,255,255,0.06)',
                color: active ? 'var(--neon)' : 'var(--ink-3)',
                fontVariantNumeric: 'tabular-nums',
              }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ position: 'relative', zIndex: 1,
                    padding: '4px 20px 24px',
                    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            padding: '50px 20px', textAlign: 'center',
            color: 'var(--ink-3)', fontSize: 13,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.6 }}>·</div>
            Nada coincide con tu búsqueda.
          </div>
        ) : filtered.map(l => (
          <MtxLearningCard key={l.id} item={l} variant="grid"
            onClick={() => onLearningClick(l)}/>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  MtxLearningCard, MtxLearningDetail, LearningAllScreen,
});
