// screens/breath-gate.jsx — Sprint A.10 · BreathGate full-screen
// ─────────────────────────────────────────────────────────────────────────────
//
// Pantalla full-screen que aparece ANTES de iniciar un descanso de apps.
// Patrón híbrido inspirado en:
//   • one sec (Frederik Riedel · Max Planck study reducción 57% del impulso)
//   • Opal Waiting Room ("Breathe in" / "Breathe out" / "Almost there")
//
// Filosofía: crear fricción consciente. El user que iba a ceder al impulso
// respira 8s + reflexiona, y muchas veces YA NO necesita el break.
//
// Flujo state machine (3 fases):
//   1. 'breath'      → 8s respirando + countdown progress bar
//                      → al completar → breathGateAdvance() → fase 'reconsider'
//   2. 'reconsider'  → "¿Aún querés tomar el descanso de N min?"
//                      → tap "Sí, descansar" → breathGateConfirm() → break inicia
//                      → tap "No, sigo" → breathGateDismiss() → vuelve protegido
//   3. (esc/back)    → breathGateDismiss() en cualquier momento
//
// Reusa primitives:
//   • @keyframes mtx-breathe + mtx-breathe-halo + mtx-fade-up (mtx-animations.jsx)
//   • __mtxColorTokens.core.neon + palettes.meditation (mtx-design-tokens.jsx)
//   • useBreathPhase hook NO se reusa (es para 5s, queremos 4s sincronizado)
//
// Drop-in ready: backend puede ajustar durationSec por user level o
// adaptive (más tiempo si lo usa mucho).
//
// Settings persisten en localStorage 'mtx-breath-gate:settings':
//   { enabled, durationSec, allowSkip }
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.BreathGateScreen) return;

  function _tokens() {
    return (window.__mtxColorTokens && window.__mtxColorTokens.core) || {
      neon: '#3dffd1', purple: '#9b8aff', sky: '#5a8fff',
    };
  }

  // Vibración háptica suave (graceful en desktop)
  function _vibrate(pattern) {
    try {
      if (navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch (e) { /* no-op */ }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Hook: useBreathTimer — countdown del breath phase con RAF + phase cycling
  // ──────────────────────────────────────────────────────────────────────────
  // Cada ciclo respiratorio = 4s (2s in, 2s out). En 8s totales = 2 ciclos.
  // En 10s = 2.5 ciclos. La fase activa se calcula del elapsed.
  function _useBreathTimer(durationSec, onComplete) {
    var secondsLeftState = React.useState(durationSec);
    var secondsLeft = secondsLeftState[0]; var setSecondsLeft = secondsLeftState[1];
    var phaseLabelState = React.useState('Take a deep breath');
    var phaseLabel = phaseLabelState[0]; var setPhaseLabel = phaseLabelState[1];
    var breathPhaseState = React.useState('in');
    var breathPhase = breathPhaseState[0]; var setBreathPhase = breathPhaseState[1];  // 'in' | 'out'

    var rafRef = React.useRef(null);
    var startedAtRef = React.useRef(0);
    var lastBreathPhaseRef = React.useRef('in');
    var lastLabelRef = React.useRef('Take a deep breath');

    React.useEffect(function() {
      startedAtRef.current = Date.now();
      _vibrate(40);  // small haptic al iniciar
      var tick = function() {
        var elapsed = (Date.now() - startedAtRef.current) / 1000;
        var left = Math.max(0, durationSec - elapsed);
        setSecondsLeft(left);

        // Phase cycling cada 2s (in/out)
        var cycleIdx = Math.floor(elapsed / 2) % 2;  // 0=in, 1=out
        var newBreathPhase = cycleIdx === 0 ? 'in' : 'out';
        if (newBreathPhase !== lastBreathPhaseRef.current) {
          lastBreathPhaseRef.current = newBreathPhase;
          setBreathPhase(newBreathPhase);
          _vibrate(newBreathPhase === 'in' ? [25, 30, 25] : 50);
        }

        // Label cycling según tiempo
        var newLabel;
        if (elapsed < 1) newLabel = 'Take a deep breath';
        else if (left < 2) newLabel = 'Almost there';
        else newLabel = newBreathPhase === 'in' ? 'Breathe in' : 'Breathe out';
        if (newLabel !== lastLabelRef.current) {
          lastLabelRef.current = newLabel;
          setPhaseLabel(newLabel);
        }

        if (left <= 0) {
          if (onComplete) onComplete();
          rafRef.current = null;
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return function() {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      };
    }, [durationSec]);

    return {
      secondsLeft: secondsLeft,
      phaseLabel: phaseLabel,
      breathPhase: breathPhase,
      progress: 1 - (secondsLeft / durationSec),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BreathGateScreen — full-screen overlay con state machine 3 fases
  // ──────────────────────────────────────────────────────────────────────────
  function BreathGateScreen() {
    // HOOKS FIRST — todos antes de cualquier early return (Rules of Hooks)
    var snapState = React.useState(
      (window.__mtxAppsBreak && window.__mtxAppsBreak.get()) || { breathGate: null }
    );
    var snap = snapState[0]; var setSnap = snapState[1];

    React.useEffect(function() {
      if (!window.__mtxAppsBreak) return;
      var handler = function() { setSnap(window.__mtxAppsBreak.get()); };
      window.addEventListener('mtx:apps-break-changed', handler);
      return function() { window.removeEventListener('mtx:apps-break-changed', handler); };
    }, []);

    // ESC para volver (no es jail). Solo activo cuando gate visible.
    var gateActive = !!(snap.breathGate && snap.breathGate.active);
    React.useEffect(function() {
      if (!gateActive) return;
      function onKey(e) {
        if (e.isComposing || e.keyCode === 229) return;
        if (e.key === 'Escape') {
          _vibrate(20);
          if (window.__mtxAppsBreak) window.__mtxAppsBreak.breathGateDismiss();
        }
      }
      window.addEventListener('keydown', onKey);
      var prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return function() {
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = prev;
      };
    }, [gateActive]);

    // Después de todos los hooks: early return seguro
    if (!gateActive) return null;
    if (!window.__mtxAppsBreak) return null;

    var phase = snap.breathGate.phase;  // 'breath' | 'reconsider'
    var settings = snap.gateSettings || { durationSec: 8, allowSkip: false };
    var durationSec = settings.durationSec;
    var allowSkip = !!settings.allowSkip;

    function handleDismiss() {
      _vibrate(20);
      window.__mtxAppsBreak.breathGateDismiss();
    }
    function handleSkip() {
      _vibrate(20);
      window.__mtxAppsBreak.breathGateSkip();
    }
    function handleConfirm() {
      _vibrate([30, 50, 30]);
      window.__mtxAppsBreak.breathGateConfirm();
    }
    function handleBreathDone() {
      window.__mtxAppsBreak.breathGateAdvance();
    }

    if (phase === 'breath') {
      return <_BreathPhase
        durationSec={durationSec}
        allowSkip={allowSkip}
        onDone={handleBreathDone}
        onDismiss={handleDismiss}
        onSkip={handleSkip}
      />;
    }
    if (phase === 'reconsider') {
      return <_ReconsiderPhase
        onConfirm={handleConfirm}
        onDismiss={handleDismiss}
      />;
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _BreathPhase — fase 1: 8s respirando con círculo + halos + progress
  // ──────────────────────────────────────────────────────────────────────────
  function _BreathPhase(props) {
    var durationSec = props.durationSec;
    var allowSkip = props.allowSkip;
    var t = _tokens();
    var timer = _useBreathTimer(durationSec, props.onDone);

    // Progress bar smooth — CSS-driven (no React re-render por frame).
    // Setea width 100% al mount + transition de durationSec full linear.
    // El browser interpola en GPU, suave puro. Reemplaza el approach previo
    // que cambiaba width cada frame (causaba pulsing brusco con .1s linear).
    var progressBarRef = React.useRef(null);
    React.useEffect(function() {
      // RAF doble para garantizar que el browser pintó el width:0% antes
      // de aplicar la transición a 100%. Sin esto, el width salta directo
      // a 100% sin animación.
      var raf1 = requestAnimationFrame(function() {
        var raf2 = requestAnimationFrame(function() {
          if (progressBarRef.current) {
            progressBarRef.current.style.width = '100%';
          }
        });
        // cleanup raf2 si unmount entre frames
        return function() { cancelAnimationFrame(raf2); };
      });
      return function() { cancelAnimationFrame(raf1); };
    }, []);

    // Scale del círculo: in = grow, out = shrink
    var scale = timer.breathPhase === 'in' ? 1.15 : 0.85;

    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 220,
        background: 'radial-gradient(ellipse at 50% 40%, rgba(45,37,73,0.85), rgba(8,8,21,0.96))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {/* Header: Volver (izq) + Skip (der opcional) */}
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
          {allowSkip ? (
            <button type="button"
              onClick={props.onSkip}
              className="mtx-tap"
              aria-label="Saltar respiración"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '8px 14px', borderRadius: 999,
                background: 'transparent',
                border: '0.5px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.55)',
                fontSize: 11.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
              }}>Saltar</button>
          ) : <div/>}
        </div>

        {/* Centro: círculo respirando con halos */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '20px 30px',
          position: 'relative',
        }}>
          {/* Halos expandiendo (3 stagger) */}
          <div style={{
            position: 'relative',
            width: 220, height: 220,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {[0, 1, 2].map(function(i) {
              return (
                <span key={i} style={{
                  position: 'absolute',
                  width: 180, height: 180, borderRadius: '50%',
                  border: '1px solid ' + t.neon + '40',
                  animation: 'mtx-breathe-halo 4s ease-out infinite',
                  animationDelay: (i * 1.3) + 's',
                  pointerEvents: 'none',
                }}/>
              );
            })}
            {/* Core circle */}
            <div style={{
              width: 160 * scale, height: 160 * scale,
              borderRadius: '50%',
              background: 'radial-gradient(circle, ' + t.neon + '40, ' + t.neon + '10)',
              border: '1.5px solid ' + t.neon + 'BB',
              boxShadow: '0 0 40px ' + t.neon + '60, inset 0 0 30px ' + t.neon + '15',
              transition: 'width 1.9s ease-in-out, height 1.9s ease-in-out',
            }}/>
          </div>

          {/* Phase label */}
          <div style={{
            marginTop: 40,
            fontSize: 26, fontWeight: 700,
            color: 'white',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.01em',
            textAlign: 'center',
            textShadow: '0 0 18px ' + t.neon + '40',
            transition: 'opacity .3s',
          }}>{timer.phaseLabel}</div>

          {/* Countdown sutil */}
          <div style={{
            marginTop: 12,
            fontSize: 13, color: 'rgba(255,255,255,0.55)',
            fontFamily: 'var(--ff-mono, monospace)',
            letterSpacing: '0.05em',
          }}>{Math.ceil(timer.secondsLeft)}s</div>
        </div>

        {/* Footer: progress bar + contexto */}
        <div style={{
          padding: '0 32px 40px',
          flexShrink: 0,
        }}>
          <div style={{
            width: '100%', height: 3, borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
            marginBottom: 14,
          }}>
            <div ref={progressBarRef} style={{
              // Width inicial 0%, useEffect lo cambia a 100% tras mount.
              // Transición linear de durationSec asegura sweep suave en GPU
              // sin re-renders por frame de React.
              width: '0%',
              height: '100%',
              background: 'linear-gradient(90deg, ' + t.neon + ', ' + t.purple + ')',
              boxShadow: '0 0 8px ' + t.neon + '80',
              transition: 'width ' + durationSec + 's linear',
              willChange: 'width',
            }}/>
          </div>
          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,0.55)',
            fontFamily: 'var(--ff-sans)',
            textAlign: 'center',
            letterSpacing: '0.005em',
            lineHeight: 1.5,
          }}>
            Tu mente merece este instante de claridad<br/>
            <span style={{ color: 'rgba(255,255,255,0.75)' }}>
              Respira primero · después decidís si querés un descanso
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _ReconsiderPhase — fase 2: "¿aún querés el descanso?"
  // ──────────────────────────────────────────────────────────────────────────
  // Aparece tras los 8s de respiración. La pregunta crítica que separa
  // impulso de elección consciente. one sec study: 57% del impulso se
  // abandona acá.
  function _ReconsiderPhase(props) {
    var t = _tokens();
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 220,
        background: 'radial-gradient(ellipse at 50% 40%, rgba(45,37,73,0.92), rgba(8,8,21,0.98))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 30px',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {/* Icon center */}
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'radial-gradient(circle, ' + t.neon + '30, ' + t.neon + '08)',
          border: '1px solid ' + t.neon + 'AA',
          boxShadow: '0 0 30px ' + t.neon + '50',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38,
          marginBottom: 32,
          animation: 'mtx-pulse-soft 2.4s ease-in-out infinite',
        }} aria-hidden="true">🌿</div>

        {/* Primary question */}
        <div style={{
          fontSize: 22, fontWeight: 700,
          color: 'white',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.01em',
          textAlign: 'center',
          maxWidth: 320,
          lineHeight: 1.35,
          marginBottom: 12,
        }}>¿Aún necesitás el descanso?</div>

        {/* Subline */}
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,0.65)',
          fontFamily: 'var(--ff-sans)',
          textAlign: 'center',
          maxWidth: 300,
          lineHeight: 1.5,
          marginBottom: 36,
        }}>Después de respirar, muchas veces el impulso ya pasó. Ahora decidís con calma, no con prisa.</div>

        {/* Actions stacked */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          width: '100%', maxWidth: 320,
        }}>
          <button type="button"
            onClick={props.onConfirm}
            className="mtx-tap"
            aria-label="Sí, elegir tiempo de descanso"
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
            }}>Sí, elegir tiempo de descanso</button>
          <button type="button"
            onClick={props.onDismiss}
            className="mtx-tap"
            aria-label="No, sigo enfocado"
            style={{
              appearance: 'none', cursor: 'pointer',
              padding: '14px 18px', borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.92)',
              fontSize: 14, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>No, sigo enfocado</button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Export
  // ──────────────────────────────────────────────────────────────────────────
  window.BreathGateScreen = BreathGateScreen;
})();
