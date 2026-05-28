// screens/coach-attach-menu.jsx — Sprint A.7 · C11a · Botón + Attach Menu
// ─────────────────────────────────────────────────────────────────────────────
// El botón `+` REEMPLAZA el file picker estándar viejo. Bottom-sheet con 4
// opciones de attach — TODO está atado a algo que el user puede usar real:
//
//   📎 Archivo          → file picker nativo (PDF, imagen, doc)
//   📷 Foto              → cámara directa
//   🔗 Pegar URL         → trigger explícito de web_fetch (B2)
//   ❤️ Snapshot wearable → adjunta lectura actual de Apple Health al msg
//
// Diego rechazó "pensar profundo" y "planear mi semana" como cosméticos
// (esos los detecta el coach por keywords del prompt natural).
//
// Las **skills** viven en SU PROPIO botón (⚡ aparte). Workflows NO van aquí
// (son automatizaciones cron/event sin intervención del user).
//
// API pública:
//   window.__mtxAttachMenu.open()
//   window.__mtxAttachMenu.close()
//   window.__mtxAttachMenu.isOpen()
//
// Eventos emitidos al elegir opción:
//   mtx:coach-attach { kind: 'file'|'camera'|'url'|'wearable', value? }
//
// El listener vive en ia-flow.jsx y dispara el flow correspondiente
// (file input nativo, prompt URL, snapshot wearable→ msg attach, etc.)
// ─────────────────────────────────────────────────────────────────────────────


(function() {
  if (typeof window === 'undefined' || window.__mtxAttachMenu) return;

  var _isOpen = false;
  function _emit() {
    window.dispatchEvent(new CustomEvent('mtx:attach-menu-state', {
      detail: { open: _isOpen },
    }));
  }
  window.__mtxAttachMenu = {
    open: function() { _isOpen = true; _emit(); },
    close: function() { if (!_isOpen) return; _isOpen = false; _emit(); },
    isOpen: function() { return _isOpen; },
  };
})();


// ═════════════════════════════════════════════════════════════════════════════
// CoachAttachMenu — bottom-sheet React
// ═════════════════════════════════════════════════════════════════════════════
function CoachAttachMenu() {
  var openState = React.useState(false);
  var open = openState[0]; var setOpen = openState[1];

  // URL input modal sub-state
  var urlInputOpenState = React.useState(false);
  var urlInputOpen = urlInputOpenState[0]; var setUrlInputOpen = urlInputOpenState[1];
  var urlValueState = React.useState('');
  var urlValue = urlValueState[0]; var setUrlValue = urlValueState[1];

  // Sprint A.9.5 — wellness picker sub-state (5ª opción del menu)
  var wellnessPickerOpenState = React.useState(false);
  var wellnessPickerOpen = wellnessPickerOpenState[0]; var setWellnessPickerOpen = wellnessPickerOpenState[1];

  React.useEffect(function() {
    function onState(e) {
      var d = (e && e.detail) || {};
      setOpen(!!d.open);
      if (!d.open) {
        setUrlInputOpen(false);
        setUrlValue('');
        setWellnessPickerOpen(false);
      }
    }
    window.addEventListener('mtx:attach-menu-state', onState);
    return function() { window.removeEventListener('mtx:attach-menu-state', onState); };
  }, []);

  // Body scroll lock + ESC
  React.useEffect(function() {
    if (!open) return;
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) {
        if (urlInputOpen) {
          // En modo URL input, ESC vuelve al menu principal
          setUrlInputOpen(false);
          setUrlValue('');
          return;
        }
        return;
      }
      if (urlInputOpen) {
        setUrlInputOpen(false);
        setUrlValue('');
        return;
      }
      if (wellnessPickerOpen) {
        setWellnessPickerOpen(false);
        return;
      }
      handleClose();
    }
    window.addEventListener('keydown', onKey);
    return function() {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, urlInputOpen, wellnessPickerOpen]);

  function handleClose() {
    if (window.__mtxAttachMenu) window.__mtxAttachMenu.close();
  }

  function emit(kind, value) {
    window.dispatchEvent(new CustomEvent('mtx:coach-attach', {
      detail: { kind: kind, value: value || null },
    }));
    handleClose();
  }

  function handleFile() {
    emit('file');
  }
  function handleCamera() {
    emit('camera');
  }
  function handleUrlSubmit() {
    var trimmed = String(urlValue || '').trim();
    if (!trimmed) return;
    // Auto-prefix https:// si user solo pegó "ejemplo.com/path"
    var url = /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
    emit('url', url);
  }
  function handleWearable() {
    emit('wearable');
  }

  // Sprint A.9.5 — abre el sub-picker de ejercicios wellness
  function handleOpenWellnessPicker() {
    setWellnessPickerOpen(true);
  }

  // Sprint A.9.5 — al elegir un ejercicio, dispara wellness trigger directo
  function handlePickWellness(type) {
    window.dispatchEvent(new CustomEvent('mtx:coach-trigger-wellness', {
      detail: { type: type },
    }));
    handleClose();
  }

  if (!open) return null;
  if (typeof document === 'undefined') return null;
  var portalRoot = document.getElementById('mtx-overlay-root');
  if (!portalRoot) return null;

  var OPTIONS = [
    {
      id: 'file',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.7"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      ),
      label: 'Archivo',
      desc: 'PDF, imagen, doc',
      accent: '#3dffd1',
      onClick: handleFile,
    },
    {
      id: 'camera',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.7"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      ),
      label: 'Tomar foto',
      desc: 'Cámara',
      accent: '#9b8aff',
      onClick: handleCamera,
    },
    {
      id: 'url',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.7"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      ),
      label: 'Pegar URL',
      desc: 'El coach lee y resume el enlace',
      accent: '#ffc850',
      onClick: function() { setUrlInputOpen(true); },
    },
    {
      id: 'wearable',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.7"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
      label: 'Snapshot wearable',
      desc: 'Lectura actual de tu salud al chat',
      accent: '#fb4868',
      onClick: handleWearable,
    },
    {
      // Sprint A.9.5 — Pausa / Relajación: 7 ejercicios somáticos
      // Encaja semánticamente en el + porque es "lo que el user le da al chat":
      // un momento de pausa para sí mismo. Skill no aplica (es ritual, no habilidad).
      id: 'wellness',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.7"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12h3l3-8 4 16 3-8h7"/>
        </svg>
      ),
      label: 'Pausa de relajación',
      desc: 'Respiración, body scan, estiramiento…',
      accent: '#3dffd1',
      onClick: handleOpenWellnessPicker,
    },
  ];

  var content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Adjuntar al chat"
      onClick={function(e) { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        // position:absolute (no fixed) — el padre del portal es #mtx-overlay-root
        // que vive DENTRO del device frame iPhone. Con fixed se anclaba al
        // viewport del browser saliéndose del frame mobile.
        // Backdrop más claro (post-feedback Diego): 0.40 alpha + blur 4px
        // para que se vea el chat detrás sin distraer.
        position: 'absolute', inset: 0, zIndex: 1090,
        background: 'rgba(10,20,16,0.40)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'mtx-fade-up .2s ease both',
      }}>
      <div style={{
        width: '100%',
        background: '#0a1410',
        borderRadius: '18px 18px 0 0',
        borderTop: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: '0 -16px 48px -16px rgba(0,0,0,0.55)',
        animation: 'mtx-fade-up .28s cubic-bezier(0.16, 1, 0.3, 1) both',
        paddingBottom: 34,  // home indicator zone
      }}>
        {/* Drag handle */}
        <div style={{
          padding: '10px 0 4px',
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.18)',
          }}/>
        </div>

        {/* Header — más compacto y sutil */}
        <div style={{
          padding: '6px 20px 10px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: 'rgba(255,255,255,0.42)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'var(--ff-sans)',
          }}>{urlInputOpen ? 'Pegar URL' : wellnessPickerOpen ? 'Pausa de relajación' : 'Adjuntar al chat'}</div>
        </div>

        {/* Wellness picker mode — Sprint A.9.5 */}
        {wellnessPickerOpen ? (
          <_WellnessPicker
            onPick={handlePickWellness}
            onBack={function() { setWellnessPickerOpen(false); }}
          />
        ) : urlInputOpen ? (
          <div style={{ padding: '0 20px 16px' }}>
            <input
              type="url"
              autoFocus
              value={urlValue}
              onChange={function(e) { setUrlValue(e.target.value); }}
              onKeyDown={function(e) {
                if (e.key === 'Enter') { e.preventDefault(); handleUrlSubmit(); }
              }}
              placeholder="https://hubermanlab.com/optimizing-sleep"
              style={{
                width: '100%',
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,200,80,0.30)',
                color: 'var(--ink-1)',
                fontSize: 13.5,
                fontFamily: 'var(--ff-mono, ui-monospace, monospace)',
                letterSpacing: '0.01em',
                outline: 'none',
                marginBottom: 12,
              }}/>
            <div style={{
              display: 'flex', gap: 8,
            }}>
              <button
                type="button"
                onClick={function() { setUrlInputOpen(false); setUrlValue(''); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  flex: 1,
                  padding: '11px 16px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  color: 'var(--ink-2)',
                  fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                }}>Cancelar</button>
              <button
                type="button"
                onClick={handleUrlSubmit}
                disabled={!urlValue.trim()}
                className="mtx-tap"
                style={{
                  appearance: 'none',
                  cursor: !urlValue.trim() ? 'not-allowed' : 'pointer',
                  flex: 1.4,
                  padding: '11px 16px', borderRadius: 999,
                  background: !urlValue.trim()
                    ? 'rgba(255,255,255,0.06)'
                    : 'linear-gradient(135deg, #ffc850, #ff9b40)',
                  border: 0,
                  color: !urlValue.trim() ? 'var(--ink-4)' : '#0a1410',
                  fontSize: 13, fontWeight: 700,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  opacity: !urlValue.trim() ? 0.5 : 1,
                  transition: 'opacity .15s',
                }}>Adjuntar al chat</button>
            </div>
          </div>
        ) : (
          // Options list — compacto post-feedback Diego (40→34 icons,
          // 14.5→13 labels, 11.5→10.5 desc, gap 14→11)
          <div style={{
            padding: '0 12px 12px',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {OPTIONS.map(function(opt, i) {
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={opt.onClick}
                  className="mtx-tap"
                  aria-label={opt.label + '. ' + opt.desc}
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
                    animationDelay: (i * 0.025) + 's',
                  }}
                  onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    flexShrink: 0,
                    background: opt.accent + '18',
                    border: '0.5px solid ' + opt.accent + '30',
                    color: opt.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }} aria-hidden="true">{React.cloneElement(opt.icon, { width: 18, height: 18 })}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: 'var(--ink-1)',
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                      marginBottom: 1,
                    }}>{opt.label}</div>
                    <div style={{
                      fontSize: 10.5,
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                    }}>{opt.desc}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(255,255,255,0.28)" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0 }} aria-hidden="true">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, portalRoot);
}


// ═══════════════════════════════════════════════════════════════════════════
// Sprint A.9.5 — _WellnessPicker · sub-vista del attach menu
// ═══════════════════════════════════════════════════════════════════════════
// Mini-picker con 7 ejercicios somáticos. Lee __mtxWellness.listExercises()
// y muestra cards compactos con icon + label + tagline + cuándo usar.
// Tap card → dispara el ejercicio inline en el chat.
function _WellnessPicker(props) {
  if (!window.__mtxWellness) {
    return (
      <div style={{ padding: '14px 20px 20px', textAlign: 'center' }}>
        <div style={{
          fontSize: 12, color: 'var(--ink-3)',
          fontFamily: 'var(--ff-sans)',
        }}>Cargando ejercicios…</div>
      </div>
    );
  }
  var exercises = window.__mtxWellness.listExercises();
  // "Cuándo usarlo" condensado por tipo — un chip rápido al final de cada card
  var whenMap = {
    box_breathing:      'antes de evento · Navy SEAL',
    four_seven_eight:   'insomnio · pánico',
    coherent_breathing: 'práctica diaria · HRV',
    body_scan:          'mente cansada · noche',
    stretching:         'pausa activa · oficina',
    grounding_54321:    'anti-pánico · clínico',
    eye_rest_202020:    'fatiga visual · 20s',
  };
  return (
    <div style={{
      padding: '4px 12px 14px',
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      {/* Back chip */}
      <button
        type="button"
        onClick={props.onBack}
        className="mtx-tap"
        aria-label="Volver al menú adjuntar"
        style={{
          appearance: 'none', cursor: 'pointer',
          alignSelf: 'flex-start',
          padding: '4px 10px 4px 6px',
          marginLeft: 6, marginBottom: 4,
          borderRadius: 999,
          background: 'transparent',
          border: 0,
          color: 'var(--ink-3)',
          fontSize: 11, fontWeight: 600,
          fontFamily: 'var(--ff-sans)',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Volver
      </button>
      {exercises.map(function(ex, i) {
        return (
          <button
            key={ex.type}
            type="button"
            onClick={function() { if (props.onPick) props.onPick(ex.type); }}
            className="mtx-tap"
            aria-label={ex.label + '. ' + ex.tagline}
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
              animationDelay: (i * 0.025) + 's',
            }}
            onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}>
            {/* Icon tile */}
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: ex.accent + '1A',
              border: '0.5px solid ' + ex.accent + '40',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, flexShrink: 0,
            }} aria-hidden="true">{ex.icon}</div>
            {/* Label + tagline + when chip */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: 'var(--ink-1)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                marginBottom: 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>{ex.label}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                  padding: '1.5px 6px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--ink-3)',
                }}>{ex.durationLabel.toUpperCase()}</span>
              </div>
              <div style={{
                fontSize: 10.5,
                color: 'var(--ink-3)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                marginBottom: 2,
              }}>{ex.tagline}</div>
              <div style={{
                fontSize: 10,
                color: ex.accent,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                fontStyle: 'italic',
                opacity: 0.75,
              }}>{whenMap[ex.type] || ''}</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.28)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0 }} aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        );
      })}
    </div>
  );
}


window.CoachAttachMenu = CoachAttachMenu;
