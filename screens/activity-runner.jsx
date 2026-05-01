// activity-runner.jsx — Fase C · Runner timer-puro para activities sin contenido
// ─────────────────────────────────────────────────────────────────────────────
// Cuando el usuario tap una activity tipo "Respirar 5 min", "Visualizar",
// "Estudiar" o "Entrenar" — actividades que NO tienen un audiolibro, charla
// o sonido en Explorar — se abre este runner fullscreen. La experiencia es
// puro timer guiado: un ring grande con countdown, un mensaje contextual
// que respira ("Inhala / Exhala"), play/pause hero y skip ±30s.
//
// El runner se monta a nivel del MentexApp (siempre disponible, cualquier
// tab) via portal a 'mtx-overlay-root' — mismo patrón que GlobalPlayerOverlay.
//
// API:
//   __mtxActivityRunner.open(activity)   { activity con runnerType:'timer' }
//   __mtxActivityRunner.close()
//   __mtxActivityRunner.get()
//
// La activity puede traer estos campos opcionales:
//   - runnerType: 'timer' (requerido para detectar tipo)
//   - runnerKind: 'breath' | 'silence' | 'movement' (estilo de mensajes)
//   - runnerDurationSec: duración total
//   - runnerLabel: subtitulo dentro del ring (ej. "Vuelve al cuerpo")
//   - title / kind / accent: ya vienen de la activity

(function() {
  if (typeof window === 'undefined' || window.__mtxActivityRunner) return;

  let state = { activity: null };
  const emit = () => window.dispatchEvent(new CustomEvent('mtx:activity-runner-changed', { detail: { ...state } }));

  window.__mtxActivityRunner = {
    get: () => ({ ...state }),
    open: (activity) => {
      if (!activity) return;
      state = { activity };
      emit();
    },
    close: () => {
      state = { activity: null };
      emit();
    },
  };
})();

function useActivityRunner() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const handler = () => force();
    window.addEventListener('mtx:activity-runner-changed', handler);
    return () => window.removeEventListener('mtx:activity-runner-changed', handler);
  }, []);
  return window.__mtxActivityRunner
    ? window.__mtxActivityRunner.get()
    : { activity: null };
}

// ── _runnerCopy ──────────────────────────────────────────────────────────────
// Mapping kind → set de mensajes alternantes y meta visual. Cada activity tipo
// timer puede declarar `runnerKind` para escoger un set; default 'breath'.
const _RUNNER_COPY = {
  breath: {
    phases: ['Inhala', 'Exhala'],
    phaseEvery: 4,             // segundos por fase
    eyebrow: 'Respira con calma',
    motto: 'Vuelve al ritmo natural',
  },
  silence: {
    phases: ['Sostén', 'Suelta'],
    phaseEvery: 5,
    eyebrow: 'Espacio para ti',
    motto: 'El silencio cuenta',
  },
  movement: {
    phases: ['Empuja', 'Respira'],
    phaseEvery: 3,
    eyebrow: 'Cuerpo presente',
    motto: 'Cada repetición suma',
  },
  focus: {
    phases: ['Atiende', 'Sostén'],
    phaseEvery: 6,
    eyebrow: 'Foco profundo',
    motto: 'Sin distracciones',
  },
};

function _resolveCopy(kind) {
  return _RUNNER_COPY[kind] || _RUNNER_COPY.breath;
}

// ── ActivityRunner ───────────────────────────────────────────────────────────
function ActivityRunner({ activity, onClose, onComplete }) {
  const totalSec = Math.max(60, Number(activity?.runnerDurationSec) || (activity?.totalSec) || 5 * 60);
  const accent = activity?.accent || '#3dffd1';
  const copy = _resolveCopy(activity?.runnerKind);

  const [secondsLeft, setSecondsLeft] = React.useState(totalSec);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => { onCompleteRef.current = onComplete; });

  // Theme rotativo aurora (reusa el de session-flow.jsx). Cada apertura del
  // runner avanza el índice — si el user tap "Respirar" hoy y mañana ve
  // distintas paletas.
  const theme = React.useMemo(() => {
    if (typeof window !== 'undefined' && window._pickAndAdvanceModalTheme) {
      return window._pickAndAdvanceModalTheme();
    }
    return null;
  }, []);
  const Aurora = (typeof window !== 'undefined' && window.ConfirmAuroraBackground) || (() => null);

  // Countdown principal
  React.useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(id);
          // Disparar onComplete fuera del setState para evitar warnings
          setTimeout(() => onCompleteRef.current?.(), 200);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying]);

  const elapsed = totalSec - secondsLeft;
  const pct = elapsed / totalSec;
  const phaseIdx = Math.floor(elapsed / copy.phaseEvery) % copy.phases.length;
  const phaseText = copy.phases[phaseIdx];

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const timeStr = `${mm}:${String(ss).padStart(2, '0')}`;

  // Ring config — hero size 240x240
  const RING_SIZE = 240;
  const R = 108;
  const C = 2 * Math.PI * R;
  const dashOffset = C * (1 - pct);

  // Halo "respira" — pulsa con el phase
  const phaseSec = elapsed % copy.phaseEvery;
  const breathScale = 1 + (Math.sin((phaseSec / copy.phaseEvery) * Math.PI) * 0.04);

  const handleSkipForward = () => setSecondsLeft(s => Math.max(0, s - 30));
  const handleSkipBack = () => setSecondsLeft(s => Math.min(totalSec, s + 30));

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:200,
      display:'flex', flexDirection:'column',
      padding:'0',
      background:'#0a0d0a',
      overflow:'hidden',
      animation:'mtx-fade-up .35s ease',
    }}>
      <Aurora theme={theme}/>

      {/* Header sticky con close + kind chip */}
      <div style={{
        position:'relative', zIndex:2,
        padding:'18px 18px 0',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
      }}>
        <button onClick={onClose} aria-label="Cerrar runner" className="mtx-tap" style={{
          width:38, height:38, borderRadius:999, border:0, cursor:'pointer',
          background:'rgba(255,255,255,0.06)',
          backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
          color:'var(--ink-1)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <IcChevD size={18} stroke="currentColor"/>
        </button>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding:'5px 11px 5px 9px', borderRadius:999,
          background:'rgba(255,255,255,0.06)',
          backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
          border:'0.5px solid rgba(255,255,255,0.1)',
          color: accent,
          fontSize:10, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase',
        }}>
          <span style={{
            width:5, height:5, borderRadius:999, background: accent,
            boxShadow:`0 0 6px ${accent}`,
            animation:'mtxPulseDotHome 2s ease-in-out infinite',
          }}/>
          {activity?.kind || copy.eyebrow}
        </div>
        <div style={{ width:38 }}/>
      </div>

      {/* Body — ring central */}
      <div style={{
        flex:1, position:'relative', zIndex:2,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'8px 28px',
      }}>
        {/* Title + subtitle arriba del ring */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{
            margin:0, fontSize:24, fontWeight:800,
            color:'var(--ink-1)', letterSpacing:'-0.025em', lineHeight:1.2,
            fontFamily:'var(--ff-display)',
          }}>
            {activity?.title || copy.eyebrow}
          </h1>
          <p style={{
            margin:'8px 0 0', fontSize:13, color:'rgba(255,255,255,0.6)',
            letterSpacing:'-0.005em', lineHeight:1.5, maxWidth:280, marginInline:'auto',
          }}>
            {activity?.runnerLabel || copy.motto}
          </p>
        </div>

        {/* Ring hero */}
        <div style={{
          position:'relative', width:RING_SIZE, height:RING_SIZE,
          transform:`scale(${breathScale})`,
          transition:'transform 1s ease-in-out',
        }}>
          {/* Halo radial detrás */}
          <div style={{
            position:'absolute', inset:-30, borderRadius:'50%',
            background:`radial-gradient(50% 50% at 50% 50%, ${accent}40 0%, transparent 70%)`,
            filter:'blur(24px)', pointerEvents:'none',
          }}/>
          <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} style={{ transform:'rotate(-90deg)', position:'relative' }}>
            <defs>
              <linearGradient id="runner-grad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#6affd9"/>
                <stop offset="1" stopColor="#1ad9ad"/>
              </linearGradient>
              <filter id="runner-glow">
                <feGaussianBlur stdDeviation="3.5"/>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5"/>
            <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={R} fill="none"
              stroke="url(#runner-grad)" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={dashOffset}
              filter="url(#runner-glow)"
              style={{ transition:'stroke-dashoffset 1s linear' }}/>
            {/* Marcas tipo dial */}
            {Array.from({ length: 60 }).map((_, i) => {
              const a = (i / 60) * Math.PI * 2;
              const r1 = R + 12, r2 = i % 5 === 0 ? R + 18 : R + 14;
              return (
                <line key={i}
                  x1={RING_SIZE/2 + Math.cos(a) * r1} y1={RING_SIZE/2 + Math.sin(a) * r1}
                  x2={RING_SIZE/2 + Math.cos(a) * r2} y2={RING_SIZE/2 + Math.sin(a) * r2}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={i % 5 === 0 ? 1 : 0.5}/>
              );
            })}
          </svg>
          {/* Centro: countdown + breath text */}
          <div style={{
            position:'absolute', inset:0,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:6,
          }}>
            <div style={{
              fontSize:64, fontWeight:600, color:'var(--ink-1)',
              fontVariantNumeric:'tabular-nums', letterSpacing:'-0.04em', lineHeight:1,
              fontFamily:'var(--ff-display)',
              textShadow:`0 0 20px ${accent}55`,
            }}>{timeStr}</div>
            <div key={phaseText} style={{
              fontSize:11, fontWeight:700, color: accent,
              letterSpacing:'0.22em', textTransform:'uppercase',
              animation:'mtxRunnerPhaseIn .35s ease both',
            }}>
              {phaseText}
            </div>
            <style>{`@keyframes mtxRunnerPhaseIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }`}</style>
          </div>
        </div>

        {/* Sub-stats: total + completado */}
        <div style={{
          marginTop:28, fontSize:11, fontWeight:600,
          color:'rgba(255,255,255,0.5)', letterSpacing:'-0.005em',
          fontVariantNumeric:'tabular-nums',
        }}>
          {Math.round(pct * 100)}% completado · {Math.floor(totalSec / 60)} min totales
        </div>
      </div>

      {/* Controles — play/pause hero + skip ± */}
      <div style={{
        position:'relative', zIndex:2,
        padding:'0 28px 14px',
        display:'flex', alignItems:'center', justifyContent:'center', gap:32,
      }}>
        <button onClick={handleSkipBack} aria-label="Retroceder 30 segundos" className="mtx-tap" style={{
          appearance:'none', cursor:'pointer',
          background:'rgba(255,255,255,0.06)',
          border:'0.5px solid rgba(255,255,255,0.1)',
          backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
          width:50, height:50, borderRadius:'50%',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          color:'var(--ink-1)', gap:1,
        }}>
          <IcChevL size={18} stroke="currentColor" strokeWidth={1.8}/>
          <span style={{ fontSize:8, fontWeight:700, color:'var(--ink-3)', letterSpacing:'0.04em' }}>30s</span>
        </button>

        <button onClick={() => setIsPlaying(p => !p)} aria-label={isPlaying ? 'Pausar' : 'Reanudar'} className="mtx-tap" style={{
          appearance:'none', cursor:'pointer',
          width:78, height:78, borderRadius:'50%', border:0,
          background:`linear-gradient(180deg, ${accent}cc 0%, ${accent} 100%)`,
          color:'#0a1410',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 0 0 1px ${accent}88, 0 0 48px ${accent}aa, inset 0 1px 0 rgba(255,255,255,0.4)`,
          flexShrink:0,
        }}>
          {isPlaying
            ? <IcPause size={28} stroke="currentColor" strokeWidth={2.2}/>
            : <IcPlay  size={26} stroke="currentColor" strokeWidth={2}/>
          }
        </button>

        <button onClick={handleSkipForward} aria-label="Avanzar 30 segundos" className="mtx-tap" style={{
          appearance:'none', cursor:'pointer',
          background:'rgba(255,255,255,0.06)',
          border:'0.5px solid rgba(255,255,255,0.1)',
          backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
          width:50, height:50, borderRadius:'50%',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          color:'var(--ink-1)', gap:1,
        }}>
          <IcChevR size={18} stroke="currentColor" strokeWidth={1.8}/>
          <span style={{ fontSize:8, fontWeight:700, color:'var(--ink-3)', letterSpacing:'0.04em' }}>30s</span>
        </button>
      </div>

      {/* Footer — finalizar antes */}
      <div style={{
        position:'relative', zIndex:2,
        padding:'4px 28px 32px',
        display:'flex', justifyContent:'center',
      }}>
        <button onClick={() => onCompleteRef.current?.()} className="mtx-tap" style={{
          background:'transparent', border:0, cursor:'pointer',
          color:'rgba(255,255,255,0.5)', fontSize:12.5, fontWeight:600,
          fontFamily:'var(--ff-sans)', padding:'8px 14px',
          letterSpacing:'-0.005em',
        }}>
          Marcar como completa
        </button>
      </div>
    </div>
  );
}

// ── ActivityRunnerOverlay ────────────────────────────────────────────────────
// Mount único a nivel del MentexApp. Renderiza ActivityRunner via portal a
// 'mtx-overlay-root' cuando el store tiene una activity.
function ActivityRunnerOverlay() {
  const { activity } = useActivityRunner();
  const toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: () => {} };

  const overlayRoot = typeof document !== 'undefined'
    ? document.getElementById('mtx-overlay-root')
    : null;
  const reactDom = typeof window !== 'undefined' ? window.ReactDOM : null;

  if (!activity) return null;

  const handleClose = () => window.__mtxActivityRunner?.close();
  const handleComplete = () => {
    // Por ahora cerramos + toast. Cuando conectemos las activities al store
    // real, aquí marcaríamos la activity como done.
    toast.show({ message: `${activity.title || 'Actividad'} · completada`, duration: 1900 });
    window.__mtxActivityRunner?.close();
  };

  const content = (
    <ActivityRunner
      activity={activity}
      onClose={handleClose}
      onComplete={handleComplete}
    />
  );

  return (overlayRoot && reactDom && reactDom.createPortal)
    ? reactDom.createPortal(content, overlayRoot)
    : content;
}

Object.assign(window, {
  ActivityRunner, ActivityRunnerOverlay, useActivityRunner,
});
