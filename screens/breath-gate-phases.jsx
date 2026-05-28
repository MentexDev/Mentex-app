// screens/breath-gate-phases.jsx — Sprint A.11 · 3 fases alternativas al breath
// ─────────────────────────────────────────────────────────────────────────────
//
// Componentes de las 3 modalidades adicionales del BreathGate:
//   • _ImagePhase           — foto persona icónica + frase + countdown
//   • _GratitudePhase       — 5 inputs "Hoy agradezco..." con auto-flow
//   • _AffirmationsPhase    — 5 prefijos completables (Yo soy___, etc.)
//
// La 4ta modalidad ('breath') vive ya en [[breath-gate]] como _BreathPhase.
//
// Patrón visual unificado:
//   • Header igual al breath: botón Volver (izq) + botón menú ☰ (der)
//   • Centro: contenido específico de la modalidad
//   • Footer: progress / cta
//
// Cada componente recibe props uniformes:
//   { onAdvance, onDismiss, onOpenSettings, durationSec }
//
// La modalidad 'breath' tiene su propio sweep automático.
// Las otras tienen progreso manual via "Siguiente" / "Continuar".
//
// Persistencia: gratitudes y decretos llaman __mtxBreathGateModes.recordTexts()
// al confirmar, lo que escribe al wellness-history.
//
// Reusa primitives:
//   • __mtxColorTokens.core (neon, purple, sky)
//   • @keyframes mtx-fade-up / mtx-pulse-soft / mtx-breathe-halo (mtx-animations)
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxBreathGatePhases) return;

  function _tokens() {
    return (window.__mtxColorTokens && window.__mtxColorTokens.core) || {
      neon: '#3dffd1', purple: '#9b8aff', sky: '#5a8fff',
    };
  }
  function _vibrate(pattern) {
    try {
      if (navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch (e) { /* no-op */ }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _GateHeader — header reusable con Volver + Menú
  // ──────────────────────────────────────────────────────────────────────────
  // Patrón compartido: Volver izq · Menú ⚙ der. Reemplaza la implementación
  // inline del breath-gate original que solo tenía Volver + Skip opcional.
  function _GateHeader(props) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '54px 22px 0',
        flexShrink: 0,
      }}>
        <button type="button"
          onClick={props.onDismiss}
          className="mtx-tap"
          aria-label="Volver · cancelar descanso"
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '8px 14px', borderRadius: 999,
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--ff-sans)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          <span aria-hidden="true">←</span>
          <span>Volver</span>
        </button>
        <button type="button"
          onClick={props.onOpenSettings}
          className="mtx-tap"
          aria-label="Configurar modalidades del descanso"
          style={{
            appearance: 'none', cursor: 'pointer',
            width: 38, height: 38, borderRadius: 999,
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 18, fontWeight: 600,
            fontFamily: 'var(--ff-sans)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <span aria-hidden="true">⚙</span>
        </button>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _ImagePhase — foto persona icónica + frase curada
  // ──────────────────────────────────────────────────────────────────────────
  // Como no tenemos backend para servir fotos reales, generamos un "portrait
  // mockup" con SVG: gradiente del color del autor + iniciales + decoración.
  // Visualmente legendario sin asset binarios.
  //
  // Lifecycle:
  //   • Mount → pickQuote() del store
  //   • Botón "Continuar" → onAdvance() → reconsider phase
  function _ImagePhase(props) {
    var t = _tokens();
    var quoteState = React.useState(function() {
      return (window.__mtxBreathGateModes && window.__mtxBreathGateModes.pickQuote()) || null;
    });
    var quote = quoteState[0]; var setQuote = quoteState[1];

    React.useEffect(function() { _vibrate(30); }, []);

    function handleNext() {
      _vibrate(40);
      if (window.__mtxBreathGateModes) {
        setQuote(window.__mtxBreathGateModes.pickQuote());
      }
    }
    function handleAdvance() {
      _vibrate([25, 30, 25]);
      props.onAdvance();
    }

    if (!quote) {
      return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 220, background: 'rgba(8,8,21,0.96)' }}/>
      );
    }

    // Iniciales para el portrait mockup
    var initials = quote.author.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(function(s) { return s[0]; })
      .join('').toUpperCase();
    var bg = quote.color || t.neon;

    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 220,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(45,37,73,0.92), rgba(8,8,21,0.98))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        <_GateHeader onDismiss={props.onDismiss} onOpenSettings={props.onOpenSettings}/>

        {/* Centro: portrait + frase */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '20px 28px',
        }}>
          {/* Portrait mockup SVG */}
          <div style={{
            position: 'relative',
            marginBottom: 28,
            animation: 'mtx-fade-up .45s ease both',
          }}>
            {/* Halo */}
            <div style={{
              position: 'absolute', inset: -16,
              borderRadius: '50%',
              background: 'radial-gradient(circle, ' + bg + '40, transparent 70%)',
              filter: 'blur(12px)',
            }} aria-hidden="true"/>
            {/* Frame circular con iniciales */}
            <div style={{
              position: 'relative',
              width: 124, height: 124, borderRadius: '50%',
              background: 'linear-gradient(135deg, ' + bg + ', ' + bg + 'AA)',
              border: '1.5px solid ' + bg + 'FF',
              boxShadow: '0 0 30px ' + bg + '70, inset 0 0 24px rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 38, fontWeight: 800,
              color: 'rgba(255,255,255,0.95)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.02em',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>{initials}</div>
          </div>

          {/* Tag */}
          <div style={{
            fontSize: 10, color: bg,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 10,
            opacity: 0.85,
          }}>{quote.tag}</div>

          {/* Quote */}
          <div style={{
            fontSize: 18, fontWeight: 500,
            color: 'white',
            fontFamily: 'var(--ff-serif, Georgia, serif)',
            textAlign: 'center',
            lineHeight: 1.45,
            maxWidth: 360,
            marginBottom: 18,
            letterSpacing: '-0.005em',
            textShadow: '0 1px 6px rgba(0,0,0,0.4)',
          }}>"{quote.quote}"</div>

          {/* Author */}
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: 'rgba(255,255,255,0.92)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            textAlign: 'center',
            marginBottom: 2,
          }}>— {quote.author}</div>
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.45)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '0.02em',
          }}>{quote.era}</div>
        </div>

        {/* Footer: acciones */}
        <div style={{
          padding: '0 28px 38px',
          display: 'flex', flexDirection: 'column', gap: 10,
          flexShrink: 0,
        }}>
          <button type="button"
            onClick={handleAdvance}
            className="mtx-tap"
            aria-label="Continuar tras absorber la frase"
            style={{
              appearance: 'none', cursor: 'pointer',
              padding: '14px 18px', borderRadius: 14,
              background: 'linear-gradient(135deg, ' + t.neon + ', ' + t.neon + 'BB)',
              color: '#0a1410',
              border: 0,
              fontSize: 14, fontWeight: 800,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              boxShadow: '0 6px 20px -4px ' + t.neon + '60',
            }}>Absorbí · continuar</button>
          <button type="button"
            onClick={handleNext}
            className="mtx-tap"
            aria-label="Mostrar otra frase"
            style={{
              appearance: 'none', cursor: 'pointer',
              padding: '11px 18px', borderRadius: 14,
              background: 'transparent',
              border: '0.5px solid rgba(255,255,255,0.14)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12.5, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
            }}>↻ Otra frase</button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _GratitudePhase — 5 inputs "Hoy agradezco..."
  // ──────────────────────────────────────────────────────────────────────────
  // Patrón mecánico:
  //   1. Mount → 5 slots vacíos.
  //   2. User llena 1 → enter / tap "siguiente" → next slot autofocus.
  //   3. Cuando user llenó 5 (o pulsó "terminar" con N>=1) → recordTexts() →
  //      onAdvance() pasa a reconsider.
  //
  // Anti-loss: persistencia ligera durante escritura por si la app se
  // re-renderiza. NO se persiste si user dismisses sin completar.
  function _GratitudePhase(props) {
    var t = _tokens();
    var itemsState = React.useState(['', '', '', '', '']);
    var items = itemsState[0]; var setItems = itemsState[1];
    var focusedState = React.useState(0);
    var focused = focusedState[0]; var setFocused = focusedState[1];

    var inputRefs = React.useRef([null, null, null, null, null]);

    React.useEffect(function() { _vibrate(30); }, []);
    React.useEffect(function() {
      // Autofocus el primer slot al mount, con delay para evitar fight con
      // el body overflow hidden + transitions.
      var to = setTimeout(function() {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
      }, 280);
      return function() { clearTimeout(to); };
    }, []);

    function updateItem(idx, val) {
      var next = items.slice();
      next[idx] = val;
      setItems(next);
    }
    function moveTo(idx) {
      if (idx < 0 || idx > 4) return;
      setFocused(idx);
      // Focus async para que el state se aplique primero
      setTimeout(function() {
        if (inputRefs.current[idx]) inputRefs.current[idx].focus();
      }, 50);
    }
    function handleKey(idx, e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (idx < 4) moveTo(idx + 1);
        else handleConfirm();
      } else if (e.key === 'Tab' && !e.shiftKey && idx < 4) {
        e.preventDefault();
        moveTo(idx + 1);
      }
    }

    var filledCount = items.filter(function(s) { return s.trim().length > 0; }).length;
    var canSubmit = filledCount >= 1;

    function handleConfirm() {
      if (!canSubmit) return;
      _vibrate([30, 50, 30]);
      // Persistir + advance
      if (window.__mtxBreathGateModes) {
        window.__mtxBreathGateModes.recordTexts('gratitude', items);
      }
      props.onAdvance();
    }

    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 220,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(60,40,80,0.92), rgba(8,8,21,0.98))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        <_GateHeader onDismiss={props.onDismiss} onOpenSettings={props.onOpenSettings}/>

        {/* Centro: 5 inputs */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          padding: '14px 22px 18px',
          overflowY: 'auto',
        }}>
          {/* Eyebrow + title */}
          <div style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: t.neon,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: 6,
              textAlign: 'center',
            }}>🙏 Gratitud · 5 cosas</div>
            <div style={{
              fontSize: 19, fontWeight: 700,
              color: 'white',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.01em',
              textAlign: 'center',
              lineHeight: 1.3,
              marginBottom: 8,
            }}>¿Qué agradecés ahora mismo?</div>
            <div style={{
              fontSize: 12, color: 'rgba(255,255,255,0.55)',
              fontFamily: 'var(--ff-sans)',
              textAlign: 'center',
              lineHeight: 1.45,
              padding: '0 12px',
            }}>Escribí lo primero que llegue. Sin filtros. Sin pensar mucho.</div>
          </div>

          {/* 5 slots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {items.map(function(val, idx) {
              var isFocused = focused === idx;
              var isFilled = val.trim().length > 0;
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: isFocused ? 'rgba(61,255,209,0.06)' : 'rgba(255,255,255,0.03)',
                  border: '0.5px solid ' + (isFocused ? t.neon + '70' : 'rgba(255,255,255,0.08)'),
                  transition: 'background .2s, border-color .2s',
                }}>
                  <div style={{
                    flexShrink: 0,
                    width: 24, height: 24, borderRadius: '50%',
                    background: isFilled ? t.neon : 'rgba(255,255,255,0.06)',
                    color: isFilled ? '#0a1410' : 'rgba(255,255,255,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                    fontFamily: 'var(--ff-sans)',
                  }}>{isFilled ? '✓' : (idx + 1)}</div>
                  <input
                    ref={function(el) { inputRefs.current[idx] = el; }}
                    type="text"
                    value={val}
                    onChange={function(e) { updateItem(idx, e.target.value); }}
                    onFocus={function() { setFocused(idx); }}
                    onKeyDown={function(e) { handleKey(idx, e); }}
                    placeholder={idx === 0 ? 'mi salud / el café de la mañana / poder respirar' : 'algo más...'}
                    style={{
                      flex: 1, minWidth: 0,
                      appearance: 'none',
                      background: 'transparent', border: 0, outline: 'none',
                      color: 'white',
                      fontSize: 14,
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                    }}
                    maxLength={120}
                    aria-label={'Gratitud ' + (idx + 1) + ' de 5'}
                  />
                </div>
              );
            })}
          </div>

          {/* Helper text */}
          <div style={{
            marginTop: 14,
            fontSize: 11, color: 'rgba(255,255,255,0.4)',
            fontFamily: 'var(--ff-sans)',
            textAlign: 'center',
            letterSpacing: '0.01em',
          }}>{filledCount > 0 ? filledCount + (filledCount === 1 ? ' gratitud · pulsá Enter o Listo' : ' gratitudes · seguí o pulsá Listo') : 'Empezá con la primera que te llegue'}</div>
        </div>

        {/* Footer: acción */}
        <div style={{
          padding: '14px 28px 36px',
          flexShrink: 0,
        }}>
          <button type="button"
            onClick={handleConfirm}
            className="mtx-tap"
            disabled={!canSubmit}
            aria-label={canSubmit ? 'Guardar y continuar' : 'Escribí al menos una gratitud para continuar'}
            style={{
              appearance: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
              width: '100%',
              padding: '14px 18px', borderRadius: 14,
              background: canSubmit
                ? 'linear-gradient(135deg, ' + t.neon + ', ' + t.neon + 'BB)'
                : 'rgba(255,255,255,0.08)',
              color: canSubmit ? '#0a1410' : 'rgba(255,255,255,0.4)',
              border: 0,
              fontSize: 14, fontWeight: 800,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              boxShadow: canSubmit ? '0 6px 20px -4px ' + t.neon + '60' : 'none',
              opacity: canSubmit ? 1 : 0.6,
              transition: 'opacity .2s',
            }}>{canSubmit ? 'Listo · continuar' : 'Escribí al menos 1 gratitud'}</button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _AffirmationsPhase — 5 prefijos completables
  // ──────────────────────────────────────────────────────────────────────────
  // Mismo patrón mecánico que gratitud, pero cada slot tiene un prefijo
  // fijo y el user solo completa la cola.
  //
  //   Yo soy ________
  //   Gracias por ________
  //   Yo tengo ________
  //   Yo merezco ________
  //   Yo elijo ________
  //
  // Persistencia: se guarda el TEXTO COMPLETO (prefijo + completion) para
  // que en wellness-history sea legible.
  function _AffirmationsPhase(props) {
    var t = _tokens();
    var prefixes = (window.__mtxBreathGateModes && window.__mtxBreathGateModes.AFFIRMATION_PREFIXES) || [];

    var completionsState = React.useState(function() {
      return prefixes.map(function() { return ''; });
    });
    var completions = completionsState[0]; var setCompletions = completionsState[1];
    var focusedState = React.useState(0);
    var focused = focusedState[0]; var setFocused = focusedState[1];

    var inputRefs = React.useRef(prefixes.map(function() { return null; }));

    React.useEffect(function() { _vibrate(30); }, []);
    React.useEffect(function() {
      var to = setTimeout(function() {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
      }, 280);
      return function() { clearTimeout(to); };
    }, []);

    function updateItem(idx, val) {
      var next = completions.slice();
      next[idx] = val;
      setCompletions(next);
    }
    function moveTo(idx) {
      if (idx < 0 || idx >= prefixes.length) return;
      setFocused(idx);
      setTimeout(function() {
        if (inputRefs.current[idx]) inputRefs.current[idx].focus();
      }, 50);
    }
    function handleKey(idx, e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (idx < prefixes.length - 1) moveTo(idx + 1);
        else handleConfirm();
      } else if (e.key === 'Tab' && !e.shiftKey && idx < prefixes.length - 1) {
        e.preventDefault();
        moveTo(idx + 1);
      }
    }

    var filledCount = completions.filter(function(s) { return s.trim().length > 0; }).length;
    var canSubmit = filledCount >= 1;

    function handleConfirm() {
      if (!canSubmit) return;
      _vibrate([30, 50, 30]);
      if (window.__mtxBreathGateModes) {
        // Construir frases completas para historial
        var fullTexts = completions.map(function(c, idx) {
          var clean = (c || '').trim();
          if (!clean) return '';
          return prefixes[idx].prefix + ' ' + clean;
        });
        window.__mtxBreathGateModes.recordTexts('affirmations', fullTexts);
      }
      props.onAdvance();
    }

    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 220,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(80,55,100,0.92), rgba(8,8,21,0.98))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        <_GateHeader onDismiss={props.onDismiss} onOpenSettings={props.onOpenSettings}/>

        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          padding: '14px 22px 18px',
          overflowY: 'auto',
        }}>
          {/* Eyebrow + title */}
          <div style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: t.purple,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: 6,
              textAlign: 'center',
            }}>✨ Decretos · 5 frases</div>
            <div style={{
              fontSize: 19, fontWeight: 700,
              color: 'white',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.01em',
              textAlign: 'center',
              lineHeight: 1.3,
              marginBottom: 8,
            }}>Completá lo que sentís hoy</div>
            <div style={{
              fontSize: 12, color: 'rgba(255,255,255,0.55)',
              fontFamily: 'var(--ff-sans)',
              textAlign: 'center',
              lineHeight: 1.45,
              padding: '0 12px',
            }}>Estas frases reorganizan tu sistema nervioso. Decilas mientras escribís.</div>
          </div>

          {/* Slots con prefijo fijo + input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {prefixes.map(function(p, idx) {
              var val = completions[idx];
              var isFocused = focused === idx;
              var isFilled = val.trim().length > 0;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: isFocused ? 'rgba(155,138,255,0.08)' : 'rgba(255,255,255,0.03)',
                  border: '0.5px solid ' + (isFocused ? t.purple + '80' : 'rgba(255,255,255,0.08)'),
                  transition: 'background .2s, border-color .2s',
                }}>
                  <div style={{
                    flexShrink: 0,
                    width: 24, height: 24, borderRadius: '50%',
                    background: isFilled ? t.purple : 'rgba(255,255,255,0.06)',
                    color: isFilled ? '#fff' : 'rgba(255,255,255,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11,
                    fontFamily: 'var(--ff-sans)',
                  }} aria-hidden="true">{isFilled ? '✓' : p.icon}</div>
                  <div style={{
                    flexShrink: 0,
                    fontSize: 13.5, fontWeight: 700,
                    color: isFilled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)',
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                  }}>{p.prefix}</div>
                  <input
                    ref={function(el) { inputRefs.current[idx] = el; }}
                    type="text"
                    value={val}
                    onChange={function(e) { updateItem(idx, e.target.value); }}
                    onFocus={function() { setFocused(idx); }}
                    onKeyDown={function(e) { handleKey(idx, e); }}
                    placeholder={p.placeholder}
                    style={{
                      flex: 1, minWidth: 0,
                      appearance: 'none',
                      background: 'transparent', border: 0, outline: 'none',
                      color: 'white',
                      fontSize: 14,
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                    }}
                    maxLength={80}
                    aria-label={'Decreto ' + p.prefix}
                  />
                </div>
              );
            })}
          </div>

          {/* Helper text */}
          <div style={{
            marginTop: 14,
            fontSize: 11, color: 'rgba(255,255,255,0.4)',
            fontFamily: 'var(--ff-sans)',
            textAlign: 'center',
            letterSpacing: '0.01em',
          }}>{filledCount > 0 ? filledCount + ' de ' + prefixes.length + ' · sentí cada frase' : 'Empezá con "Yo soy"'}</div>
        </div>

        <div style={{
          padding: '14px 28px 36px',
          flexShrink: 0,
        }}>
          <button type="button"
            onClick={handleConfirm}
            className="mtx-tap"
            disabled={!canSubmit}
            aria-label={canSubmit ? 'Sellar decretos y continuar' : 'Completá al menos un decreto'}
            style={{
              appearance: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
              width: '100%',
              padding: '14px 18px', borderRadius: 14,
              background: canSubmit
                ? 'linear-gradient(135deg, ' + t.purple + ', ' + t.purple + 'BB)'
                : 'rgba(255,255,255,0.08)',
              color: canSubmit ? '#fff' : 'rgba(255,255,255,0.4)',
              border: 0,
              fontSize: 14, fontWeight: 800,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              boxShadow: canSubmit ? '0 6px 20px -4px ' + t.purple + '70' : 'none',
              opacity: canSubmit ? 1 : 0.6,
              transition: 'opacity .2s',
            }}>{canSubmit ? 'Sellar · continuar' : 'Completá al menos 1 decreto'}</button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Export
  // ──────────────────────────────────────────────────────────────────────────
  window.__mtxBreathGatePhases = {
    GateHeader: _GateHeader,
    ImagePhase: _ImagePhase,
    GratitudePhase: _GratitudePhase,
    AffirmationsPhase: _AffirmationsPhase,
  };
})();
