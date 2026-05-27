// screens/coach-skills-menu.jsx — Sprint A.7 · C11b · Skills Menu
// ─────────────────────────────────────────────────────────────────────────────
// Botón ⚡ aparte del + (attach). Bottom-sheet que muestra las skills REALES
// del store __mtxIASkills (oficiales + mías) — sin hardcoded ni cosmético.
//
// Diferencia con Attach Menu (C11a):
//   • Attach (+) = el USER agrega algo al mensaje (archivo, foto, URL, snapshot)
//   • Skills (⚡) = el USER activa una capacidad del COACH (planear, recomendar,
//     reservar, etc.) — usa el primer trigger del skill como prompt template
//
// Cuando user tappea una skill:
//   1. Cierra el sheet
//   2. Inyecta el primer trigger del skill al input del chat (NO auto-envía,
//      permite que el user edite/extienda antes de send)
//
// Cuando llegue backend (Sprint B):
//   __mtxIASkills.list() ya está mapeado a tabla `user_skills` con RLS.
//   El UI no cambia — solo la fuente de datos es API REST en lugar de mock.
//
// Empty state si user no tiene skills propias: CTA "Crear tu primera" → abre
// Settings → tab Skills (donde puede crear via Mentex Structurer).
// ─────────────────────────────────────────────────────────────────────────────


(function() {
  if (typeof window === 'undefined' || window.__mtxSkillsMenu) return;
  var _isOpen = false;
  function _emit() {
    window.dispatchEvent(new CustomEvent('mtx:skills-menu-state', {
      detail: { open: _isOpen },
    }));
  }
  window.__mtxSkillsMenu = {
    open: function() { _isOpen = true; _emit(); },
    close: function() { if (!_isOpen) return; _isOpen = false; _emit(); },
    isOpen: function() { return _isOpen; },
  };
})();


// ═════════════════════════════════════════════════════════════════════════════
function CoachSkillsMenu() {
  var openState = React.useState(false);
  var open = openState[0]; var setOpen = openState[1];

  var tabState = React.useState('official');
  var tab = tabState[0]; var setTab = tabState[1];

  React.useEffect(function() {
    function onState(e) {
      var d = (e && e.detail) || {};
      setOpen(!!d.open);
    }
    window.addEventListener('mtx:skills-menu-state', onState);
    return function() { window.removeEventListener('mtx:skills-menu-state', onState); };
  }, []);

  React.useEffect(function() {
    if (!open) return;
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      handleClose();
    }
    window.addEventListener('keydown', onKey);
    return function() {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function handleClose() {
    if (window.__mtxSkillsMenu) window.__mtxSkillsMenu.close();
  }

  function handleActivateSkill(skill) {
    // Inyecta el primer trigger al input del chat (event consumido por
    // ia-flow que escribe al textarea). NO auto-envía.
    var trigger = (skill.triggers && skill.triggers[0]) || skill.title || skill.name;
    window.dispatchEvent(new CustomEvent('mtx:skill-activate', {
      detail: { skill: skill, prompt: trigger },
    }));
    // Track activation localmente
    try {
      if (window.__mtxIASkills && window.__mtxIASkills.incrementActivation) {
        window.__mtxIASkills.incrementActivation(skill.id);
      }
    } catch (_) {}
    handleClose();
  }

  function handleOpenSettings() {
    // Navega a Settings IA → tab Skills
    window.dispatchEvent(new CustomEvent('mtx:open-ia-settings', {
      detail: { tab: 'skills' },
    }));
    handleClose();
  }

  if (!open) return null;
  if (typeof document === 'undefined') return null;
  var portalRoot = document.getElementById('mtx-overlay-root');
  if (!portalRoot) return null;

  // Lee skills reales del store
  var officialSkills = [];
  var mineSkills = [];
  if (window.__mtxIASkills) {
    try {
      officialSkills = window.__mtxIASkills.getOfficialSkills() || [];
      mineSkills = window.__mtxIASkills.getMineSkills() || [];
    } catch (_) {}
  }
  var categories = (window.__mtxIASkills && window.__mtxIASkills.getCategories)
    ? window.__mtxIASkills.getCategories()
    : {};

  // Mostramos TODAS las oficiales (catálogo completo). El toggle on/off vive
  // en Settings → Skills; aquí en el chat el menu sirve para ACTIVAR cualquiera
  // (decisión de producto: el user quiere ver qué hay disponible, no qué tiene
  // marcado como "habilitado").
  var visibleSkills = tab === 'official' ? officialSkills : mineSkills;

  var content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Activar una habilidad del coach"
      onClick={function(e) { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        // position:absolute respeta el device frame iPhone. Backdrop más claro
        // post-feedback Diego (0.40 + blur 4px).
        position: 'absolute', inset: 0, zIndex: 1090,
        background: 'rgba(10,20,16,0.40)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'mtx-fade-up .2s ease both',
      }}>
      <div style={{
        width: '100%',
        maxHeight: '72vh',
        background: '#0a1410',
        borderRadius: '18px 18px 0 0',
        borderTop: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: '0 -16px 48px -16px rgba(0,0,0,0.55)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'mtx-fade-up .28s cubic-bezier(0.16, 1, 0.3, 1) both',
        paddingBottom: 34,
      }}>
        {/* Drag handle */}
        <div style={{
          padding: '10px 0 4px',
          display: 'flex', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.18)',
          }}/>
        </div>

        {/* Header — compacto post-feedback Diego */}
        <div style={{
          padding: '6px 20px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: 'rgba(255,255,255,0.42)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'var(--ff-sans)',
          }}>Habilidades del coach</div>
          <button
            type="button"
            onClick={handleOpenSettings}
            className="mtx-tap"
            aria-label="Administrar skills"
            style={{
              appearance: 'none', cursor: 'pointer',
              padding: '5px 10px', borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.10)',
              color: 'var(--ink-3)',
              fontSize: 10.5, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.02em',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Gestionar
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          padding: '0 20px',
          display: 'flex', gap: 6,
          marginBottom: 10,
          flexShrink: 0,
        }}>
          {[
            { id: 'official', label: 'Oficiales', count: officialSkills.length },
            { id: 'mine', label: 'Mías', count: mineSkills.length },
          ].map(function(t) {
            var isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={function() { setTab(t.id); }}
                className="mtx-tap"
                aria-pressed={isActive}
                style={{
                  appearance: 'none', cursor: 'pointer',
                  flex: 1,
                  padding: '8px 12px', borderRadius: 10,
                  background: isActive ? 'rgba(61,255,209,0.12)' : 'rgba(255,255,255,0.03)',
                  border: '0.5px solid ' + (isActive ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.06)'),
                  color: isActive ? 'var(--neon)' : 'var(--ink-2)',
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background .15s, border-color .15s, color .15s',
                }}>
                <span>{t.label}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  opacity: 0.65,
                  fontVariantNumeric: 'tabular-nums',
                }}>{t.count}</span>
              </button>
            );
          })}
        </div>

        {/* Skills list — scroll si excede */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 12px 12px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {visibleSkills.length === 0 ? (
            <div style={{
              padding: '24px 20px',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 32, marginBottom: 8,
              }} aria-hidden="true">⚡</div>
              <div style={{
                fontSize: 13.5, fontWeight: 600,
                color: 'var(--ink-2)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                marginBottom: 4,
              }}>{tab === 'mine' ? 'Aún no has creado skills propias' : 'Sin skills oficiales activas'}</div>
              <div style={{
                fontSize: 11.5,
                color: 'var(--ink-3)',
                fontFamily: 'var(--ff-sans)',
                lineHeight: 1.5,
                maxWidth: 280, margin: '0 auto 14px',
              }}>{tab === 'mine'
                ? 'Crea workflows personalizados que el coach activa cuando se los pidas en chat.'
                : 'Activa las skills oficiales desde Configuración.'}</div>
              <button
                type="button"
                onClick={handleOpenSettings}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '9px 18px', borderRadius: 999,
                  background: 'rgba(61,255,209,0.12)',
                  border: '0.5px solid rgba(61,255,209,0.40)',
                  color: 'var(--neon)',
                  fontSize: 12, fontWeight: 700,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                }}>{tab === 'mine' ? 'Crear mi primera skill' : 'Abrir configuración'}</button>
            </div>
          ) : (
            visibleSkills.map(function(skill, i) {
              var cat = categories[skill.category] || { accent: 'var(--neon)' };
              var accent = cat.accent || 'var(--neon)';
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={function() { handleActivateSkill(skill); }}
                  className="mtx-tap"
                  aria-label={'Activar habilidad: ' + (skill.title || skill.name)}
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    width: '100%',
                    padding: '10px 12px', borderRadius: 12,
                    background: 'transparent',
                    border: 0,
                    color: 'var(--ink-1)',
                    textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 11,
                    transition: 'background .15s',
                    animation: 'mtx-fade-up .22s cubic-bezier(0.16, 1, 0.3, 1) both',
                    animationDelay: (i * 0.02) + 's',
                  }}
                  onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    flexShrink: 0,
                    background: accent + '18',
                    border: '0.5px solid ' + accent + '32',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                  }} aria-hidden="true">{skill.icon || '⚡'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: 'var(--ink-1)',
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                      marginBottom: 1,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{skill.title || skill.name}</div>
                    {skill.description && (
                      <div style={{
                        fontSize: 10.5, lineHeight: 1.4,
                        color: 'var(--ink-3)',
                        fontFamily: 'var(--ff-sans)',
                        letterSpacing: '-0.005em',
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                      }}>{skill.description}</div>
                    )}
                    {skill.category && categories[skill.category] && (
                      <div style={{
                        marginTop: 4,
                        display: 'inline-flex',
                        fontSize: 9.5, fontWeight: 700,
                        color: accent,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        fontFamily: 'var(--ff-sans)',
                      }}>{categories[skill.category].label}</div>
                    )}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(255,255,255,0.30)" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0 }} aria-hidden="true">
                    <line x1="7" y1="17" x2="17" y2="7"/>
                    <polyline points="7 7 17 7 17 17"/>
                  </svg>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, portalRoot);
}


window.CoachSkillsMenu = CoachSkillsMenu;
