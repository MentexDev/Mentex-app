// apps-editor.jsx — AppsEditorSheet: editor command-palette para apps a bloquear
// Stack: Sugeridas (Mentex AI) + categorías + buscador

function AppsEditorSheet({ blockedApps, onChange, onClose }) {
  const [query, setQuery]     = React.useState('');
  const [activeCat, setCat]   = React.useState('all'); // 'all' | category id
  const [exiting, setExiting] = React.useState(false);
  const inputRef              = React.useRef(null);
  const toast                 = useToast();

  // Auto-focus en search al abrir (con leve delay para esperar la animación)
  React.useEffect(() => {
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 360);
    return () => clearTimeout(t);
  }, []);

  // ESC para cerrar
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose && onClose(), 300);
  };

  const isBlocked = (id) => blockedApps.includes(id);
  const toggle = (id) => {
    const wasBlocked = isBlocked(id);
    const next = wasBlocked ? blockedApps.filter(x => x !== id) : [...blockedApps, id];
    onChange(next);
  };

  // Filtros
  const q = query.trim().toLowerCase();
  const filterByQ = (a) => !q || a.name.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q);
  const filterByCat = (a) => activeCat === 'all' || a.category === activeCat;

  const suggested = APPS.filter(a => SUGGESTED_BLOCK_IDS.includes(a.id));
  const filteredApps = APPS.filter(a => filterByQ(a) && filterByCat(a));

  // Apps agrupadas por categoría
  const grouped = APP_CATEGORIES.map(cat => ({
    ...cat,
    apps: filteredApps.filter(a => a.category === cat.id),
  })).filter(g => g.apps.length > 0);

  const blockedCount = blockedApps.length;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column',
      animation: exiting ? 'sheetFadeOut .28s ease forwards' : 'sheetFadeIn .32s ease forwards',
    }}>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />

      {/* Sheet */}
      <div className="mtx-glass" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: '92%',
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
        <div style={{ display:'flex', justifyContent:'center', paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 14px', display:'flex', alignItems:'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 20, fontWeight: 600, color: 'var(--ink-1)',
              letterSpacing: '-0.02em', fontFamily: 'var(--ff-sans)',
            }}>
              Apps a silenciar
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
              {blockedCount === 0
                ? 'Elige las que más fragmentan tu atención'
                : `${blockedCount} ${blockedCount === 1 ? 'app silenciada' : 'apps silenciadas'}`}
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

        {/* Search bar */}
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px', borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}>
            <IcSearch size={16} stroke="var(--ink-3)" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar app…"
              style={{
                flex: 1, minWidth: 0,
                appearance: 'none', border: 0, outline: 'none', background: 'transparent',
                color: 'var(--ink-1)', fontSize: 14, fontFamily: 'var(--ff-sans)',
                fontWeight: 400,
                letterSpacing: '-0.005em',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} className="mtx-tap" style={{
                appearance: 'none', border: 0, background: 'rgba(255,255,255,0.08)',
                width: 20, height: 20, borderRadius: 999,
                color: 'var(--ink-2)', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IcClose size={11} stroke="currentColor" strokeWidth={2.2}/>
              </button>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div className="mtx-scroll-x" style={{
          paddingLeft: 20, paddingRight: 20, paddingBottom: 12,
          display: 'flex', gap: 8, flexShrink: 0,
        }}>
          <CategoryChip label="Todo" active={activeCat==='all'} onClick={() => setCat('all')} count={APPS.length}/>
          {APP_CATEGORIES.map(c => (
            <CategoryChip key={c.id} label={c.label}
              count={APPS.filter(a => a.category === c.id).length}
              active={activeCat===c.id}
              onClick={() => setCat(c.id)}/>
          ))}
        </div>

        {/* Lista scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 100 }}>
          {/* Sugeridas — solo si no hay query y categoría es 'all' */}
          {!q && activeCat === 'all' && (
            <SuggestedSection
              apps={suggested}
              isBlocked={isBlocked}
              onToggle={toggle}
            />
          )}

          {filteredApps.length === 0 ? (
            <EmptyState query={query}/>
          ) : (q || activeCat !== 'all') ? (
            // Resultados de búsqueda → lista plana
            <FlatList apps={filteredApps} isBlocked={isBlocked} onToggle={toggle}/>
          ) : (
            // Vista por defecto → agrupadas por categoría
            <>
              {grouped.map(g => (
                <CategoryGroup key={g.id} group={g}
                  isBlocked={isBlocked} onToggle={toggle} excludeIds={SUGGESTED_BLOCK_IDS}/>
              ))}
            </>
          )}
        </div>

        {/* Footer fijo: counter + Listo */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '14px 20px 22px',
          background: 'linear-gradient(180deg, rgba(14,17,20,0) 0%, rgba(14,17,20,0.95) 30%, rgba(14,17,20,0.98) 100%)',
          display: 'flex', alignItems: 'center', gap: 10,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Silenciar
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.02em', marginTop: 1 }}>
              {blockedCount} {blockedCount === 1 ? 'aplicación' : 'aplicaciones'}
            </div>
          </div>
          <button onClick={handleClose} className="mtx-btn-neon mtx-tap" style={{ minWidth: 110 }}>
            <IcCheck size={14} stroke="currentColor" strokeWidth={2.4}/> Listo
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sheetFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sheetFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes sheetSlideIn  { from { transform: translateY(40px); } to { transform: translateY(0); } }
        @keyframes sheetSlideOut { from { transform: translateY(0); } to { transform: translateY(60px); } }
      `}</style>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────

function CategoryChip({ label, count, active, onClick }) {
  return (
    <button onClick={onClick} className="mtx-tap" style={{
      flexShrink: 0,
      appearance: 'none',
      padding: '7px 13px',
      borderRadius: 999,
      border: active ? '0.5px solid rgba(61,255,209,0.45)' : '0.5px solid rgba(255,255,255,0.10)',
      background: active
        ? 'linear-gradient(180deg, rgba(61,255,209,0.16), rgba(61,255,209,0.05))'
        : 'rgba(255,255,255,0.03)',
      color: active ? 'var(--neon)' : 'var(--ink-2)',
      fontSize: 12, fontWeight: 500,
      fontFamily: 'var(--ff-sans)',
      letterSpacing: '-0.005em',
      cursor: 'pointer',
      boxShadow: active ? '0 0 14px rgba(61,255,209,0.22), inset 0 0 12px rgba(61,255,209,0.08)' : 'none',
      transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      <span style={{
        fontSize: 10, fontWeight: 600,
        opacity: active ? 0.85 : 0.5,
        background: active ? 'rgba(61,255,209,0.15)' : 'rgba(255,255,255,0.06)',
        padding: '1px 6px', borderRadius: 999,
        minWidth: 14, textAlign: 'center',
      }}>{count}</span>
    </button>
  );
}

function SuggestedSection({ apps, isBlocked, onToggle }) {
  return (
    <div style={{ padding: '4px 20px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 18, height: 18, borderRadius: 999,
          background: 'linear-gradient(135deg, var(--neon), #5ef0c2)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 12px rgba(61,255,209,0.5)',
        }}>
          <IcSpark size={11} stroke="#0a0d0a" strokeWidth={2.4}/>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neon)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Mentex sugiere
        </div>
        <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(61,255,209,0.3), transparent)' }}/>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12, marginTop: -4, lineHeight: 1.5 }}>
        Las apps que más fragmentan tu atención según tus patrones
      </div>
      <div className="mtx-glass" style={{
        padding: 4, borderRadius: 18,
        border: '0.5px solid rgba(61,255,209,0.18)',
        background: 'linear-gradient(180deg, rgba(61,255,209,0.04), rgba(61,255,209,0.01))',
        boxShadow: '0 0 0 1px rgba(61,255,209,0.06), inset 0 0 24px rgba(61,255,209,0.04)',
      }}>
        {apps.map((a, i) => (
          <AppRow key={a.id} app={a} blocked={isBlocked(a.id)} onToggle={onToggle}
            isFirst={i === 0} variant="suggested"/>
        ))}
      </div>
    </div>
  );
}

function CategoryGroup({ group, isBlocked, onToggle, excludeIds = [] }) {
  const apps = group.apps.filter(a => !excludeIds.includes(a.id));
  if (apps.length === 0) return null;
  return (
    <div style={{ padding: '4px 20px 14px' }}>
      <div style={{ marginBottom: 10, paddingLeft: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {group.label}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, opacity: 0.8 }}>
          {group.hint}
        </div>
      </div>
      <div className="mtx-glass" style={{
        padding: 4, borderRadius: 16,
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        {apps.map((a, i) => (
          <AppRow key={a.id} app={a} blocked={isBlocked(a.id)} onToggle={onToggle} isFirst={i === 0}/>
        ))}
      </div>
    </div>
  );
}

function FlatList({ apps, isBlocked, onToggle }) {
  return (
    <div style={{ padding: '4px 20px 14px' }}>
      <div className="mtx-glass" style={{
        padding: 4, borderRadius: 16,
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        {apps.map((a, i) => (
          <AppRow key={a.id} app={a} blocked={isBlocked(a.id)} onToggle={onToggle} isFirst={i === 0}/>
        ))}
      </div>
    </div>
  );
}

function AppRow({ app, blocked, onToggle, isFirst, variant = 'default' }) {
  const showStar = variant === 'suggested';
  return (
    <div className="mtx-tap"
      onClick={() => onToggle(app.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '7px 12px', cursor: 'pointer',
        borderTop: isFirst ? 0 : '0.5px solid rgba(255,255,255,0.04)',
        borderRadius: 12,
        position: 'relative',
        transition: 'background .18s ease',
        background: blocked ? 'rgba(61,255,209,0.04)' : 'transparent',
      }}>
      <app.Icon size={30}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-1)', letterSpacing: '-0.01em',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          {app.name}
          {showStar && (
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: 'var(--neon)',
              padding: '1.5px 6px', borderRadius: 999,
              background: 'rgba(61,255,209,0.10)',
              border: '0.5px solid rgba(61,255,209,0.22)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>Top</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{app.subtitle}</div>
      </div>
      <Checkmark on={blocked}/>
    </div>
  );
}

function Checkmark({ on }) {
  return (
    <div style={{
      width: 24, height: 24, borderRadius: 999,
      border: on ? 0 : '0.5px solid rgba(255,255,255,0.20)',
      background: on
        ? 'radial-gradient(circle at 30% 30%, #5ef0c2, var(--neon))'
        : 'transparent',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color: on ? '#0a0d0a' : 'transparent',
      flexShrink: 0,
      boxShadow: on ? '0 0 0 1px rgba(61,255,209,0.25), 0 0 16px rgba(61,255,209,0.5)' : 'none',
      transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
      transform: on ? 'scale(1)' : 'scale(0.96)',
    }}>
      {on && <IcCheck size={13} stroke="currentColor" strokeWidth={2.6}/>}
    </div>
  );
}

function EmptyState({ query }) {
  return (
    <div style={{
      padding: '60px 20px',
      textAlign: 'center',
      color: 'var(--ink-3)',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 999,
        background: 'rgba(255,255,255,0.04)',
        margin: '0 auto 14px',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink-3)',
      }}>
        <IcSearch size={22} stroke="currentColor"/>
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 4 }}>
        Sin resultados para "{query}"
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>
        Probá con otro nombre o limpiá la búsqueda
      </div>
    </div>
  );
}

Object.assign(window, {
  AppsEditorSheet,
});
