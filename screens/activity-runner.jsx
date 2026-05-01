// activity-runner.jsx — Fase C + C.2 v2 · Runner timer-puro modal
// ─────────────────────────────────────────────────────────────────────────────
// Diseño y lógica:
//
//   El runner es MODAL (no minimizable). Adentro trae:
//     1. Mini-player widget al fondo (estilo MtxNowPlayingBar) — tap abre la
//        cola del runner que es el PlaylistQueueSheet existente con
//        sugerencias pre-curadas como items. Cuando hay audio activo,
//        muestra cover + título + play/pause + chevR. Cuando no, muestra
//        CTA "Acompáñate con sonido".
//     2. PlaylistQueueSheet (reusado de explore-flow.jsx) con la playlist
//        sintética runner-suggestions. CTAs: "Agregar más contenido" y
//        "Elegir una playlist" (abre el switcher global).
//
//   Modal de exit con 3 opciones:
//     - "Volver a la actividad" (primary, ring countdown 5s auto-cancel)
//     - "Ya terminé"            (link verde discreto, marca como completa)
//     - "Salir sin completar"   (link rojo discreto, cierra sin marcar)

(function() {
  if (typeof window === 'undefined' || window.__mtxActivityRunner) return;
  // completionOpen: true cuando el timer llegó a 0 o el user marcó como completa
  // → muestra RunnerCompletionScreen ENCIMA del runner antes de cerrar.
  let state = { activity: null, exitConfirmOpen: false, queueOpen: false, completionOpen: false };
  const emit = () => window.dispatchEvent(new CustomEvent('mtx:activity-runner-changed', { detail: { ...state } }));
  window.__mtxActivityRunner = {
    get: () => ({ ...state }),
    open: (activity) => {
      if (!activity) return;
      state = { activity, exitConfirmOpen: false, queueOpen: false, completionOpen: false };
      emit();
    },
    requestExit:    () => { state = { ...state, exitConfirmOpen: true }; emit(); },
    cancelExit:     () => { state = { ...state, exitConfirmOpen: false }; emit(); },
    openQueue:      () => { state = { ...state, queueOpen: true }; emit(); },
    closeQueue:     () => { state = { ...state, queueOpen: false }; emit(); },
    showCompletion: () => { state = { ...state, completionOpen: true, exitConfirmOpen: false }; emit(); },
    close: () => {
      state = { activity: null, exitConfirmOpen: false, queueOpen: false, completionOpen: false };
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
    : { activity: null, exitConfirmOpen: false, queueOpen: false, completionOpen: false };
}

// ── Set de mensajes alternantes según runnerKind ─────────────────────────────
const _RUNNER_COPY = {
  breath:   { phases:['Inhala', 'Exhala'],   phaseEvery:4, eyebrow:'Respira con calma',  motto:'Vuelve al ritmo natural' },
  silence:  { phases:['Sostén', 'Suelta'],   phaseEvery:5, eyebrow:'Espacio para ti',     motto:'El silencio cuenta' },
  movement: { phases:['Empuja', 'Respira'],  phaseEvery:3, eyebrow:'Cuerpo presente',     motto:'Cada repetición suma' },
  focus:    { phases:['Atiende', 'Sostén'],  phaseEvery:6, eyebrow:'Foco profundo',       motto:'Sin distracciones' },
};
const _resolveCopy = (kind) => _RUNNER_COPY[kind] || _RUNNER_COPY.breath;

// ── Sugerencias contextuales por runnerKind ──────────────────────────────────
const _RUNNER_SUGGESTION_MAP = {
  breath:   ['c-lluvia', 'c-bosque', 'c-fuego', 'c-respira', 'c-watts'],
  silence:  ['c-bosque', 'c-lluvia', 'c-watts', 'c-poder-ahora', 'c-respira'],
  movement: ['c-habitos', 'c-deepwork', 'c-jobs', 'c-fuego', 'c-lluvia'],
  focus:    ['c-deepwork', 'c-habitos', 'c-mvp', 'c-foco', 'c-rams'],
};
function _resolveSuggestions(activity) {
  if (typeof window === 'undefined') return [];
  const EC = window.EXPLORE_CONTENT || [];
  const ids = (activity && Array.isArray(activity.runnerSuggestionIds))
    ? activity.runnerSuggestionIds
    : (_RUNNER_SUGGESTION_MAP[activity && activity.runnerKind] || _RUNNER_SUGGESTION_MAP.breath);
  return ids.map(id => EC.find(c => c.id === id)).filter(Boolean);
}

function _buildRunnerPlaylist(activity) {
  const suggestions = _resolveSuggestions(activity);
  if (suggestions.length === 0) return null;
  const accent = activity?.accent || '#3dffd1';
  return {
    id: 'runner-suggestions',
    title: 'Sugerencias para ti',
    author: { name: 'Mentex', isOfficial: true },
    isWatchLater: false,                          // NO es watch-later
    _eyebrowOverride: 'Cola de reproducción',     // override del eyebrow del queue sheet
    isPublic: false,
    createdBy: 'mentex',
    accent,
    bg: activity?.bg || `linear-gradient(135deg, ${accent}33, ${accent}10)`,
    items: suggestions.map(s => s.id),
    totalVideos: suggestions.length,
    _runnerActivityId: activity?.id,
  };
}

// ── ActivityRunner ───────────────────────────────────────────────────────────
function ActivityRunner({ activity, onRequestClose, onComplete }) {
  const totalSec = Math.max(60, Number(activity?.runnerDurationSec) || (activity?.totalSec) || 5 * 60);
  const accent = activity?.accent || '#3dffd1';
  const copy = _resolveCopy(activity?.runnerKind);

  const [secondsLeft, setSecondsLeft] = React.useState(totalSec);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => { onCompleteRef.current = onComplete; });

  const theme = React.useMemo(() => {
    if (typeof window !== 'undefined' && window._pickAndAdvanceModalTheme) {
      return window._pickAndAdvanceModalTheme();
    }
    return null;
  }, []);
  const Aurora = (typeof window !== 'undefined' && window.ConfirmAuroraBackground) || (() => null);

  // Estado inicial del runner: SIN contenido seleccionado. Si el usuario
  // venía escuchando algo en Explorar/mini-bar, se limpia al entrar al
  // runner — la idea es que el companion empiece en su estado vacío
  // ("Recomendados para ti") y el usuario elija qué quiere escuchar mientras
  // hace su actividad. Tras el stop() reactivamos fullscreenOpen para que
  // la mini-bar global no aparezca encima del runner.
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.__mtxPlayer) {
      window.__mtxPlayer.stop();
      if (window.__mtxPlayer.setFullscreenOpen) window.__mtxPlayer.setFullscreenOpen(true);
      return () => {
        if (window.__mtxPlayer.setFullscreenOpen) window.__mtxPlayer.setFullscreenOpen(false);
      };
    }
  }, []);

  // Countdown del timer
  React.useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(id);
          setTimeout(() => onCompleteRef.current?.(), 200);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying]);

  // Snapshot al window para que ConfirmExitRunnerModal lea sin duplicar state
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mtx:runner-snapshot', {
        detail: { secondsLeft, totalSec },
      }));
    }
  }, [secondsLeft, totalSec]);

  const elapsed = totalSec - secondsLeft;
  const pct = elapsed / totalSec;
  const phaseIdx = Math.floor(elapsed / copy.phaseEvery) % copy.phases.length;
  const phaseText = copy.phases[phaseIdx];
  const phaseSec = elapsed % copy.phaseEvery;
  const breathScale = 1 + (Math.sin((phaseSec / copy.phaseEvery) * Math.PI) * 0.04);

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const timeStr = `${mm}:${String(ss).padStart(2, '0')}`;

  const RING_SIZE = 232;
  const R = 104;
  const C = 2 * Math.PI * R;
  const dashOffset = C * (1 - pct);

  const handleSkipForward = () => setSecondsLeft(s => Math.max(0, s - 30));
  const handleSkipBack = () => setSecondsLeft(s => Math.min(totalSec, s + 30));

  // Menú de opciones (3 puntos arriba derecha)
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  const handleReset = () => {
    setSecondsLeft(totalSec);
    setIsPlaying(true);
    setOptionsOpen(false);
  };
  const handleMarkComplete = () => {
    setOptionsOpen(false);
    onCompleteRef.current?.();
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:200,
      display:'flex', flexDirection:'column',
      background:'#0a0d0a',
      overflow:'hidden',
      animation:'mtx-fade-up .35s ease',
    }}>
      <Aurora theme={theme}/>

      {/* Header sticky */}
      <div style={{
        position:'relative', zIndex:2,
        padding:'18px 18px 10px',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
        flexShrink:0,
      }}>
        <button onClick={onRequestClose} aria-label="Cerrar runner" className="mtx-tap" style={{
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
        {/* Botón 3-puntos con menú: Marcar como completada · Reiniciar */}
        <div style={{ position:'relative' }}>
          <button onClick={() => setOptionsOpen(o => !o)} aria-label="Más opciones" className="mtx-tap" style={{
            width:38, height:38, borderRadius:999, border:0, cursor:'pointer',
            background: optionsOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
            backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
            color:'var(--ink-1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'background .2s',
          }}>
            <IcMoreV size={18} stroke="currentColor"/>
          </button>
          {optionsOpen && (
            <>
              {/* Backdrop para cerrar al tap fuera */}
              <div onClick={() => setOptionsOpen(false)} style={{
                position:'fixed', inset:0, zIndex:1,
              }}/>
              {/* Menú dropdown */}
              <div style={{
                position:'absolute', top:'calc(100% + 8px)', right:0,
                minWidth:200, zIndex:5,
                background:'linear-gradient(180deg, rgba(28,32,30,0.96), rgba(20,24,22,0.98))',
                backdropFilter:'blur(28px) saturate(160%)', WebkitBackdropFilter:'blur(28px) saturate(160%)',
                border:'0.5px solid rgba(255,255,255,0.1)',
                borderRadius:14,
                boxShadow:'0 20px 50px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
                padding:6,
                animation:'mtxMenuIn .18s ease both',
                fontFamily:'var(--ff-sans)',
              }}>
                <style>{`@keyframes mtxMenuIn { from { opacity:0; transform:translateY(-4px) scale(0.97); } to { opacity:1; transform:none; } }`}</style>
                <button onClick={handleMarkComplete} className="mtx-tap" style={{
                  appearance:'none', cursor:'pointer', textAlign:'left',
                  width:'100%', padding:'10px 12px', borderRadius:10,
                  border:0, background:'transparent',
                  display:'flex', alignItems:'center', gap:10,
                  color:'var(--ink-1)', fontSize:13, fontWeight:600,
                  fontFamily:'var(--ff-sans)',
                }}>
                  <div style={{
                    width:28, height:28, borderRadius:8, flexShrink:0,
                    background:`${accent}1a`, border:`0.5px solid ${accent}40`,
                    color: accent,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <IcCheck size={13} stroke="currentColor" strokeWidth={2.4}/>
                  </div>
                  <span>Marcar como completada</span>
                </button>
                <button onClick={handleReset} className="mtx-tap" style={{
                  appearance:'none', cursor:'pointer', textAlign:'left',
                  width:'100%', padding:'10px 12px', borderRadius:10,
                  border:0, background:'transparent',
                  display:'flex', alignItems:'center', gap:10,
                  color:'var(--ink-1)', fontSize:13, fontWeight:600,
                  fontFamily:'var(--ff-sans)',
                }}>
                  <div style={{
                    width:28, height:28, borderRadius:8, flexShrink:0,
                    background:'rgba(255,255,255,0.05)',
                    border:'0.5px solid rgba(255,255,255,0.08)',
                    color:'var(--ink-2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <IcRefresh size={13} stroke="currentColor" strokeWidth={1.8}/>
                  </div>
                  <span>Empezar desde cero</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body — cuerpo principal centrado */}
      <div style={{
        flex:1, position:'relative', zIndex:2,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'8px 28px',
      }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <h1 style={{
            margin:0, fontSize:23, fontWeight:800,
            color:'var(--ink-1)', letterSpacing:'-0.025em', lineHeight:1.2,
            fontFamily:'var(--ff-display)',
          }}>
            {activity?.title || copy.eyebrow}
          </h1>
          <p style={{
            margin:'8px 0 0', fontSize:12.5, color:'rgba(255,255,255,0.6)',
            letterSpacing:'-0.005em', lineHeight:1.5, maxWidth:280, marginInline:'auto',
          }}>
            {activity?.runnerLabel || copy.motto}
          </p>
        </div>

        <div style={{
          position:'relative', width:RING_SIZE, height:RING_SIZE,
          transform:`scale(${breathScale})`,
          transition:'transform 1s ease-in-out',
        }}>
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
          <div style={{
            position:'absolute', inset:0,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:6,
          }}>
            <div style={{
              fontSize:60, fontWeight:600, color:'var(--ink-1)',
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

        <div style={{
          marginTop:18, fontSize:11, fontWeight:600,
          color:'rgba(255,255,255,0.5)', letterSpacing:'-0.005em',
          fontVariantNumeric:'tabular-nums',
        }}>
          {Math.round(pct * 100)}% completado · {Math.floor(totalSec / 60)} min totales
        </div>

        <div style={{
          marginTop:22,
          display:'flex', alignItems:'center', justifyContent:'center', gap:32,
        }}>
          <button onClick={handleSkipBack} aria-label="Retroceder 30 segundos" className="mtx-tap" style={{
            appearance:'none', cursor:'pointer',
            background:'rgba(255,255,255,0.06)',
            border:'0.5px solid rgba(255,255,255,0.1)',
            backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
            width:48, height:48, borderRadius:'50%',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', gap:1,
          }}>
            <IcChevL size={17} stroke="currentColor" strokeWidth={1.8}/>
            <span style={{ fontSize:8, fontWeight:700, color:'var(--ink-3)', letterSpacing:'0.04em' }}>30s</span>
          </button>
          <button onClick={() => setIsPlaying(p => !p)} aria-label={isPlaying ? 'Pausar' : 'Reanudar'} className="mtx-tap" style={{
            appearance:'none', cursor:'pointer',
            width:74, height:74, borderRadius:'50%', border:0,
            background:`linear-gradient(180deg, ${accent}cc 0%, ${accent} 100%)`,
            color:'#0a1410',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:`0 0 0 1px ${accent}88, 0 0 44px ${accent}aa, inset 0 1px 0 rgba(255,255,255,0.4)`,
            flexShrink:0,
          }}>
            {isPlaying
              ? <IcPause size={26} stroke="currentColor" strokeWidth={2.2}/>
              : <IcPlay  size={24} stroke="currentColor" strokeWidth={2}/>
            }
          </button>
          <button onClick={handleSkipForward} aria-label="Avanzar 30 segundos" className="mtx-tap" style={{
            appearance:'none', cursor:'pointer',
            background:'rgba(255,255,255,0.06)',
            border:'0.5px solid rgba(255,255,255,0.1)',
            backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
            width:48, height:48, borderRadius:'50%',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', gap:1,
          }}>
            <IcChevR size={17} stroke="currentColor" strokeWidth={1.8}/>
            <span style={{ fontSize:8, fontWeight:700, color:'var(--ink-3)', letterSpacing:'0.04em' }}>30s</span>
          </button>
        </div>
      </div>

      {/* Companion al fondo del runner — sticky bottom + safe space inferior */}
      <RunnerCompanionBar
        activity={activity}
        suggestionCount={_resolveSuggestions(activity).length}
      />

      {/* Safe space inferior */}
      <div style={{ height:18, flexShrink:0 }}/>
    </div>
  );
}

// ── RunnerCompanionBar ────────────────────────────────────────────────────────
// Widget al fondo del runner. Dos estados:
//   - SIN audio (vacío): tile "shortcut" — icono stack-of-cards (tipo cola)
//     + eyebrow neon "≡ RECOMENDADOS PARA TI" + título "Tu ritual de hoy"
//     + count + chev verde grande circular. Tap → abre el queue del runner.
//   - CON audio (activo): mini-bar idéntico al MtxNowPlayingBar — barra
//     progreso accent arriba + cover + título + sub + play/pause grande +
//     icono lista (≡) (en lugar de X) que abre el queue. Tap en el wrap
//     también abre el queue.
function RunnerCompanionBar({ activity, suggestionCount }) {
  const useNowPlaying = (typeof window !== 'undefined' && window.useNowPlaying) || (() => ({ currentItem:null, isPlaying:false, progress:0 }));
  const { currentItem, isPlaying, progress } = useNowPlaying();
  const accent = activity?.accent || '#3dffd1';

  const handleOpenQueue = () => window.__mtxActivityRunner?.openQueue();
  const handleTogglePlay = (e) => {
    e.stopPropagation();
    if (!window.__mtxPlayer) return;
    if (isPlaying) window.__mtxPlayer.pause();
    else window.__mtxPlayer.resume();
  };

  // ── ESTADO VACÍO: shortcut tile ──────────────────────────────────────────
  if (!currentItem) {
    return (
      <div style={{ position:'relative', zIndex:2, padding:'10px 18px 4px', flexShrink:0 }}>
        <button onClick={handleOpenQueue} aria-label="Abrir recomendados" className="mtx-tap" style={{
          appearance:'none', cursor:'pointer', textAlign:'left',
          width:'100%', boxSizing:'border-box',
          padding:'14px 14px', borderRadius:20,
          background:'linear-gradient(180deg, rgba(20,24,22,0.78), rgba(15,19,18,0.92))',
          backdropFilter:'blur(28px) saturate(160%)', WebkitBackdropFilter:'blur(28px) saturate(160%)',
          border:'0.5px solid rgba(255,255,255,0.08)',
          boxShadow:'0 -2px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
          display:'flex', alignItems:'center', gap:13,
          fontFamily:'var(--ff-sans)',
          position:'relative', overflow:'hidden',
        }}>
          {/* Icono stack-of-cards (estilo "cola") con halo neon */}
          <div style={{
            position:'relative', width:54, height:54, flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {/* Cards apiladas — 3 capas con offset y opacity */}
            <div style={{
              position:'absolute', top:6, left:10, width:36, height:42, borderRadius:8,
              background:'rgba(255,255,255,0.04)',
              border:'0.5px solid rgba(255,255,255,0.06)',
            }}/>
            <div style={{
              position:'absolute', top:3, left:6, width:36, height:42, borderRadius:8,
              background:'rgba(255,255,255,0.07)',
              border:'0.5px solid rgba(255,255,255,0.1)',
            }}/>
            <div style={{
              position:'absolute', top:0, left:2, width:38, height:44, borderRadius:9,
              background:'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
              border:'0.5px solid rgba(255,255,255,0.14)',
              boxShadow:`0 0 14px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.08)`,
            }}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:5,
              fontSize:9.5, fontWeight:800, color: accent,
              letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:3,
            }}>
              <IcList size={10} stroke="currentColor" strokeWidth={2}/>
              Cola de reproducción
            </div>
            <div style={{
              fontSize:16, fontWeight:800, color:'var(--ink-1)',
              letterSpacing:'-0.018em', lineHeight:1.18,
              fontFamily:'var(--ff-display)',
            }}>Sugerencias para ti</div>
            <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.5)', marginTop:1, letterSpacing:'-0.005em' }}>
              {suggestionCount} {suggestionCount === 1 ? 'item' : 'items'}
            </div>
          </div>
          {/* Chev verde grande circular */}
          <div style={{
            width:42, height:42, borderRadius:'50%', flexShrink:0,
            border:`1px solid ${accent}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: accent,
            boxShadow:`0 0 12px ${accent}40`,
          }}>
            <IcChevR size={16} stroke="currentColor" strokeWidth={2}/>
          </div>
        </button>
      </div>
    );
  }

  // ── ESTADO ACTIVO: mini-bar con barra progreso ──────────────────────────
  const itemAccent = currentItem.accent || '#3dffd1';
  const subParts = [
    currentItem.author,
    (window.CONTENT_TYPES || []).find(t => t.id === currentItem.type)?.label,
  ].filter(Boolean);
  const subtitle = subParts.join(' · ');
  const progressPct = Math.max(0, Math.min(1, Number(progress) || 0));

  return (
    <div style={{ position:'relative', zIndex:2, padding:'10px 18px 4px', flexShrink:0 }}>
      <div onClick={handleOpenQueue} role="button" tabIndex={0} aria-label="Abrir cola"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenQueue(); } }}
        className="mtx-tap" style={{
          cursor:'pointer',
          padding:'10px 10px 10px 10px', borderRadius:20,
          background:'linear-gradient(180deg, rgba(20,24,22,0.85), rgba(15,19,18,0.95))',
          backdropFilter:'blur(28px) saturate(160%)', WebkitBackdropFilter:'blur(28px) saturate(160%)',
          border:`0.5px solid ${itemAccent}33`,
          boxShadow:`0 -2px 16px ${itemAccent}1f, inset 0 1px 0 rgba(255,255,255,0.06)`,
          display:'flex', alignItems:'center', gap:11,
          fontFamily:'var(--ff-sans)',
          position:'relative', overflow:'hidden',
      }}>
        {/* Barra de progreso superpuesta arriba */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:1.5,
          background:'rgba(255,255,255,0.05)',
          zIndex:2, borderRadius:'20px 20px 0 0',
        }}>
          <div style={{
            width:`${progressPct * 100}%`, height:'100%',
            background: itemAccent,
            boxShadow:`0 0 8px ${itemAccent}cc, 0 0 14px ${itemAccent}55`,
            transition:'width .3s linear',
          }}/>
        </div>

        {/* Cover */}
        <div style={{
          width:46, height:46, borderRadius:12, flexShrink:0,
          position:'relative', overflow:'hidden',
          background: currentItem.bg || `linear-gradient(135deg, ${itemAccent}33, ${itemAccent}10)`,
          border:`0.5px solid ${itemAccent}40`,
          boxShadow:`0 0 10px ${itemAccent}26`,
        }}>
          {currentItem.cover && (
            <img src={currentItem.cover} alt="" loading="lazy" style={{
              position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
            }}/>
          )}
        </div>
        {/* Título + sub */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontSize:13.5, fontWeight:700, color:'var(--ink-1)',
            letterSpacing:'-0.008em', lineHeight:1.2,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>{currentItem.title || 'Sin título'}</div>
          {subtitle && (
            <div style={{
              fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:1.5,
              letterSpacing:'-0.005em',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>{subtitle}</div>
          )}
        </div>
        {/* Play/pause grande */}
        <button onClick={handleTogglePlay} aria-label={isPlaying ? 'Pausar audio' : 'Reanudar audio'} className="mtx-tap" style={{
          appearance:'none', cursor:'pointer', flexShrink:0,
          width:42, height:42, borderRadius:'50%',
          border:`0.5px solid ${itemAccent}55`,
          background:`linear-gradient(180deg, ${itemAccent}33 0%, ${itemAccent}10 100%)`,
          color: itemAccent,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 0 12px ${itemAccent}55, inset 0 1px 0 rgba(255,255,255,0.18)`,
        }}>
          {isPlaying
            ? <IcPause size={15} stroke="currentColor" strokeWidth={1.8}/>
            : <IcPlay size={14} stroke="currentColor"/>
          }
        </button>
        {/* Icono cerrar — quita el contenido seleccionado, el companion vuelve
            al estado vacío "Recomendados para ti" (donde el tap abre la cola).
            No lo confundas con cerrar el RUNNER: solo limpia el __mtxPlayer
            store. El user puede elegir otro audio sin salir de la actividad. */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.__mtxPlayer) window.__mtxPlayer.stop();
          }}
          aria-label="Quitar contenido en reproducción" className="mtx-tap" style={{
            appearance:'none', cursor:'pointer', flexShrink:0,
            width:32, height:32, borderRadius:'50%',
            border:'0.5px solid rgba(255,255,255,0.08)',
            background:'rgba(255,255,255,0.04)',
            color:'var(--ink-3)',
            display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <IcClose size={12} stroke="currentColor" strokeWidth={2}/>
        </button>
      </div>
    </div>
  );
}

// ── ConfirmExitRunnerModal ────────────────────────────────────────────────────
function ConfirmExitRunnerModal({ activity, secondsLeft, totalSec, onCancel, onComplete, onAbandon }) {
  const COUNTDOWN_TOTAL = 5;
  const [seconds, setSeconds] = React.useState(COUNTDOWN_TOTAL);
  const onCancelRef = React.useRef(onCancel);
  React.useEffect(() => { onCancelRef.current = onCancel; });

  React.useEffect(() => {
    let timer = null;
    const id = setInterval(() => setSeconds(s => {
      if (s <= 1) {
        clearInterval(id);
        timer = setTimeout(() => onCancelRef.current?.(), 200);
        return 0;
      }
      return s - 1;
    }), 1000);
    return () => { clearInterval(id); if (timer) clearTimeout(timer); };
  }, []);

  const ringPct = (COUNTDOWN_TOTAL - seconds) / COUNTDOWN_TOTAL;
  const ringR = 64, ringC = 2 * Math.PI * ringR;

  const elapsed = Math.max(0, totalSec - secondsLeft);
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSs = elapsed % 60;
  const elapsedStr = `${elapsedMin}:${String(elapsedSs).padStart(2,'0')}`;
  const completionPct = totalSec > 0 ? Math.round((elapsed / totalSec) * 100) : 0;

  const theme = React.useMemo(() => {
    if (typeof window !== 'undefined' && window._pickAndAdvanceModalTheme) {
      return window._pickAndAdvanceModalTheme();
    }
    return null;
  }, []);
  const Aurora = (typeof window !== 'undefined' && window.ConfirmAuroraBackground) || (() => null);

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:210,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'32px 28px',
      animation:'mtx-fade-up .28s ease',
      overflow:'hidden',
      background:'#0a0d0a',
    }}>
      <Aurora theme={theme}/>

      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        marginBottom:26, position:'relative', zIndex:1,
      }}>
        <div style={{ position:'relative', width:140, height:140 }}>
          <div style={{
            position:'absolute', inset:-22, borderRadius:'50%',
            background:'radial-gradient(50% 50% at 50% 50%, rgba(61,255,209,0.22), transparent 70%)',
            filter:'blur(18px)', pointerEvents:'none',
          }}/>
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform:'rotate(-90deg)', position:'relative' }}>
            <defs>
              <linearGradient id="exit-runner-grad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#6affd9"/>
                <stop offset="1" stopColor="#1ad9ad"/>
              </linearGradient>
              <filter id="exit-runner-glow">
                <feGaussianBlur stdDeviation="2.5"/>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="70" cy="70" r={ringR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
            <circle cx="70" cy="70" r={ringR} fill="none"
              stroke="url(#exit-runner-grad)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={ringC}
              strokeDashoffset={ringC * (1 - ringPct)}
              filter="url(#exit-runner-glow)"
              style={{ transition:'stroke-dashoffset 1s linear' }}/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{
              fontSize:50, fontWeight:600, color:'var(--neon)',
              fontVariantNumeric:'tabular-nums', letterSpacing:'-0.04em', lineHeight:1,
              fontFamily:'var(--ff-display)',
              textShadow:'0 0 20px rgba(61,255,209,0.55)',
            }}>{seconds}</div>
            <div style={{
              fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.65)',
              letterSpacing:'0.18em', textTransform:'uppercase', marginTop:6,
            }}>Volviendo</div>
          </div>
        </div>
      </div>

      <div style={{
        display:'inline-flex', alignItems:'center', gap:6,
        padding:'5px 11px 5px 9px', borderRadius:999,
        background:'rgba(255,255,255,0.08)',
        border:'0.5px solid rgba(255,255,255,0.14)',
        backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
        color:'rgba(255,255,255,0.85)',
        fontSize:10, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase',
        marginBottom:14, position:'relative', zIndex:1,
      }}>
        Pausa de la actividad
      </div>

      <h1 style={{
        margin:'0 0 8px', fontSize:22, fontWeight:800,
        color:'var(--ink-1)', letterSpacing:'-0.025em', lineHeight:1.22,
        fontFamily:'var(--ff-display)', textAlign:'center', position:'relative', zIndex:1,
        maxWidth:300,
      }}>
        ¿Cómo quieres seguir?
      </h1>
      <p style={{
        margin:'0 0 20px', fontSize:12.5, color:'rgba(255,255,255,0.65)',
        textAlign:'center', lineHeight:1.5, maxWidth:300, position:'relative', zIndex:1,
      }}>
        Si terminaste antes, márcala como completa. Si no, puedes volver a la actividad o salir sin completar.
      </p>

      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:10,
        width:'100%', maxWidth:320, marginBottom:20,
        position:'relative', zIndex:1,
      }}>
        <div style={{
          padding:'10px 12px', borderRadius:14,
          background:'rgba(255,255,255,0.06)',
          border:'0.5px solid rgba(255,255,255,0.1)',
          backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', marginBottom:4 }}>
            Has hecho
          </div>
          <div style={{
            fontSize:18, fontWeight:700, color:'var(--ink-1)',
            fontVariantNumeric:'tabular-nums', letterSpacing:'-0.025em', lineHeight:1,
            fontFamily:'var(--ff-display)',
          }}>{elapsedStr}</div>
        </div>
        <div style={{
          padding:'10px 12px', borderRadius:14,
          background:'rgba(255,255,255,0.06)',
          border:'0.5px solid rgba(255,255,255,0.1)',
          backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', marginBottom:4 }}>
            Progreso
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
            <span style={{
              fontSize:18, fontWeight:700, color:'var(--ink-1)',
              fontVariantNumeric:'tabular-nums', letterSpacing:'-0.025em', lineHeight:1,
              fontFamily:'var(--ff-display)',
            }}>{completionPct}</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>%</span>
          </div>
        </div>
      </div>

      {/* Primary: volver */}
      <button onClick={onCancel} className="mtx-tap" style={{
        width:'100%', maxWidth:320, height:52, borderRadius:18, border:0, cursor:'pointer',
        background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.9)), var(--neon-deep, #1ad9ad))',
        color:'#0a1410', fontSize:15, fontWeight:700,
        fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
        boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 14px 36px -10px rgba(61,255,209,0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
        marginBottom:14, position:'relative', zIndex:1,
      }}>
        Volver a la actividad
      </button>

      {/* Secondary row: 2 opciones discretas */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'center', gap:18,
        position:'relative', zIndex:1,
      }}>
        <button onClick={onComplete} className="mtx-tap" style={{
          background:'transparent', border:0, cursor:'pointer',
          color:'rgba(106,255,217,0.95)', fontSize:13, fontWeight:600,
          fontFamily:'var(--ff-sans)', padding:'8px 4px',
          display:'inline-flex', alignItems:'center', gap:5,
          letterSpacing:'-0.005em',
        }}>
          <IcCheck size={12} stroke="currentColor" strokeWidth={2.4}/>
          Ya terminé
        </button>
        <span style={{ width:1, height:14, background:'rgba(255,255,255,0.12)' }}/>
        <button onClick={onAbandon} className="mtx-tap" style={{
          background:'transparent', border:0, cursor:'pointer',
          color:'rgba(255,140,140,0.92)', fontSize:13, fontWeight:600,
          fontFamily:'var(--ff-sans)', padding:'8px 4px',
          letterSpacing:'-0.005em',
        }}>
          Salir sin completar
        </button>
      </div>
    </div>
  );
}

// ── RunnerCompletionScreen ────────────────────────────────────────────────────
// Modal de celebración cuando el runner llega a 0 (o el user marca como
// completada desde el menú). Estilo consistente con CompletionScreen pero
// adaptado: sin score gigante (no estamos cerrando una sesión completa,
// solo una activity), confetti suaves del accent, stats compactas, CTAs
// claros. Tono celebratorio pero no over-the-top.
function RunnerCompletionScreen({ activity, totalSec, onClose }) {
  const accent = activity?.accent || '#3dffd1';
  const totalMin = Math.max(1, Math.floor((totalSec || 0) / 60));
  const copy = _resolveCopy(activity?.runnerKind);

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:215,
      background:`radial-gradient(80% 50% at 50% 0%, ${accent}1f, transparent 60%), #050706`,
      display:'flex', flexDirection:'column',
      animation:'mtxRunnerCompIn .55s cubic-bezier(.25,.8,.25,1) both',
      overflow:'hidden',
    }}>
      <style>{`
        @keyframes mtxRunnerCompIn { from { opacity:0; transform:scale(1.05); } to { opacity:1; transform:scale(1); } }
        @keyframes mtxRunnerConfetti0 { 0% { transform:translateY(-20px) rotate(0); opacity:0; } 10% { opacity:1; } 100% { transform:translateY(900px) rotate(360deg); opacity:0; } }
        @keyframes mtxRunnerConfetti1 { 0% { transform:translateY(-20px) rotate(0); opacity:0; } 10% { opacity:1; } 100% { transform:translateY(820px) rotate(-360deg); opacity:0; } }
        @keyframes mtxRunnerConfetti2 { 0% { transform:translateY(-20px) rotate(0); opacity:0; } 10% { opacity:1; } 100% { transform:translateY(950px) rotate(180deg); opacity:0; } }
      `}</style>

      {/* Confetti — paleta del accent + neon */}
      {Array.from({ length: 22 }).map((_, i) => {
        const colors = [accent, '#ffffff', `${accent}aa`];
        const left = (i * 17 + 5) % 100;
        const delay = (i * 0.21) % 4;
        const dur = 2.6 + (i % 5) * 0.4;
        const animIdx = i % 3;
        const size = 4 + (i % 3) * 2;
        return (
          <div key={i} style={{
            position:'absolute', top:-10, left:`${left}%`,
            width:size, height:size, borderRadius: i % 2 === 0 ? '50%' : 2,
            background: colors[i % colors.length],
            boxShadow:`0 0 6px ${colors[i % colors.length]}`,
            animation:`mtxRunnerConfetti${animIdx} ${dur}s cubic-bezier(.25,.46,.45,.94) ${delay}s infinite`,
            pointerEvents:'none',
          }}/>
        );
      })}

      {/* Top: eyebrow + título */}
      <div style={{ padding:'72px 28px 0', textAlign:'center', position:'relative', zIndex:2 }}>
        <div className="mtx-eyebrow" style={{
          fontSize:10, color: accent, marginBottom:10,
          letterSpacing:'0.16em',
          display:'inline-flex', alignItems:'center', gap:6,
        }}>
          <IcCheck size={11} stroke="currentColor" strokeWidth={2.4}/>
          Actividad completada
        </div>
        <h1 style={{ margin:0, fontSize:30, fontWeight:800, color:'var(--ink-1)', letterSpacing:'-0.03em', lineHeight:1.1 }}>
          ¡Lo lograste!
        </h1>
        <p style={{ margin:'10px 0 0', fontSize:13.5, color:'var(--ink-3)', lineHeight:1.5 }}>
          Otro paso hacia una mente más afilada.
        </p>
      </div>

      {/* Centro: ring grande con check + stats */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 28px', position:'relative', zIndex:2 }}>
        <div style={{ position:'relative', width:172, height:172, marginBottom:24 }}>
          {/* Halo */}
          <div style={{
            position:'absolute', inset:-30, borderRadius:'50%',
            background:`radial-gradient(50% 50% at 50% 50%, ${accent}55 0%, transparent 70%)`,
            filter:'blur(28px)', pointerEvents:'none',
          }}/>
          <svg width="172" height="172" viewBox="0 0 172 172" style={{ position:'relative' }}>
            <defs>
              <linearGradient id="runner-comp-grad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#6affd9"/>
                <stop offset="1" stopColor={accent}/>
              </linearGradient>
              <filter id="runner-comp-glow">
                <feGaussianBlur stdDeviation="3"/>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="86" cy="86" r="74" fill="none" stroke={`${accent}33`} strokeWidth="3.5"/>
            <circle cx="86" cy="86" r="74" fill="none"
              stroke="url(#runner-comp-grad)" strokeWidth="4.5" strokeLinecap="round"
              filter="url(#runner-comp-glow)"
              style={{ strokeDasharray: 2 * Math.PI * 74, strokeDashoffset: 0 }}/>
          </svg>
          <div style={{
            position:'absolute', inset:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: accent,
          }}>
            <IcCheck size={64} stroke="currentColor" strokeWidth={1.8}/>
          </div>
        </div>

        {/* Frase del kind */}
        <div style={{
          fontSize:13, color:'var(--ink-2)', textAlign:'center',
          maxWidth:280, lineHeight:1.55, marginBottom:20,
          letterSpacing:'-0.005em',
        }}>
          {copy.motto}.
        </div>

        {/* Stats compactos */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10, width:'100%', maxWidth:320 }}>
          <CompletionStatTile label="Tiempo" value={`${totalMin}`} unit="min" Ic={IcClock} accent={accent}/>
          <CompletionStatTile label="Actividad" value="1" unit="hecha" Ic={IcCheck} accent={accent}/>
        </div>
      </div>

      {/* Bottom: CTAs */}
      <div style={{ padding:'0 24px 32px', display:'flex', flexDirection:'column', gap:10, position:'relative', zIndex:2 }}>
        <button onClick={onClose} className="mtx-tap" style={{
          width:'100%', height:54, borderRadius:18, border:0, cursor:'pointer',
          background:`linear-gradient(180deg, ${accent}cc 0%, ${accent} 100%)`,
          color:'#0a1410', fontSize:15, fontWeight:700,
          fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
          boxShadow:`0 0 0 1px ${accent}88, 0 14px 36px -10px ${accent}aa, inset 0 1px 0 rgba(255,255,255,0.4)`,
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}>
          Volver al ritual
        </button>
      </div>
    </div>
  );
}

function CompletionStatTile({ label, value, unit, Ic, accent }) {
  return (
    <div className="mtx-glass" style={{
      padding:'12px 14px', borderRadius:16,
      background:'rgba(255,255,255,0.03)',
      border:'0.5px solid rgba(255,255,255,0.06)',
      display:'flex', flexDirection:'column', gap:4,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, color: accent }}>
        <Ic size={11} stroke="currentColor"/>
        <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-3)' }}>{label}</span>
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
        <span style={{
          fontSize:24, fontWeight:700, color:'var(--ink-1)',
          fontVariantNumeric:'tabular-nums', letterSpacing:'-0.03em', lineHeight:1,
          fontFamily:'var(--ff-display)',
        }}>{value}</span>
        <span style={{ fontSize:11, color:'var(--ink-3)' }}>{unit}</span>
      </div>
    </div>
  );
}

// ── ActivityRunnerOverlay ────────────────────────────────────────────────────
function ActivityRunnerOverlay() {
  const { activity, exitConfirmOpen, queueOpen, completionOpen } = useActivityRunner();
  const toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: () => {} };
  const [snapshot, setSnapshot] = React.useState({ secondsLeft: 0, totalSec: 0 });

  React.useEffect(() => {
    const handler = (e) => setSnapshot(e.detail || { secondsLeft: 0, totalSec: 0 });
    window.addEventListener('mtx:runner-snapshot', handler);
    return () => window.removeEventListener('mtx:runner-snapshot', handler);
  }, []);

  // useNowPlaying para pasar al PlaylistQueueSheet (necesita currentIndex)
  const useNowPlaying = (typeof window !== 'undefined' && window.useNowPlaying) || (() => ({ currentItem:null }));
  const { currentItem } = useNowPlaying();

  // IMPORTANTE: los hooks se llaman ANTES del early return — orden estable
  // en todos los renders (React rule of hooks). Si activity es null, los
  // memos devuelven valores neutros pero el orden de hooks no cambia.
  const runnerPlaylist = React.useMemo(
    () => activity ? _buildRunnerPlaylist(activity) : null,
    [activity?.id]
  );
  const runnerItems = React.useMemo(() => {
    if (!runnerPlaylist || typeof window === 'undefined' || !window.EXPLORE_CONTENT) return [];
    return runnerPlaylist.items
      .map(id => window.EXPLORE_CONTENT.find(c => c.id === id))
      .filter(Boolean);
  }, [runnerPlaylist?.id]);
  const currentIndex = currentItem
    ? runnerItems.findIndex(i => i && i.id === currentItem.id)
    : -1;

  // AddContentScreen montado localmente desde el runner. Como ExploreScreen
  // sólo está montado en el tab Explorar, cuando el runner se abre desde
  // Home no podríamos delegar el evento — montamos el screen aquí mismo,
  // reusando el componente exportado a window.
  // IMPORTANTE: useState ANTES del early return — Hook Rules.
  const [addContentOpen, setAddContentOpen] = React.useState(false);

  const overlayRoot = typeof document !== 'undefined'
    ? document.getElementById('mtx-overlay-root')
    : null;
  const reactDom = typeof window !== 'undefined' ? window.ReactDOM : null;

  if (!activity) return null;

  const handleRequestClose = () => window.__mtxActivityRunner?.requestExit();
  const handleComplete = () => {
    // Mostrar modal de celebración antes de cerrar
    window.__mtxActivityRunner?.showCompletion();
  };
  const handleCompletionClose = () => {
    toast.show({ message: `${activity.title || 'Actividad'} · completada`, duration: 1900 });
    window.__mtxActivityRunner?.close();
  };
  const handleAbandon = () => {
    window.__mtxActivityRunner?.close();
  };

  const PlaylistQueueSheet = (typeof window !== 'undefined' && window.PlaylistQueueSheet) || null;
  const AddContentScreen = (typeof window !== 'undefined' && window.AddContentScreen) || null;

  // Handlers del queue sheet
  const handleQueueClose = () => window.__mtxActivityRunner?.closeQueue();
  const handleQueueSelect = (idx) => {
    const it = runnerItems[idx];
    if (!it || !window.__mtxPlayer) return;
    window.__mtxPlayer.play({
      id: it.id, title: it.title, author: it.author, cover: it.cover,
      accent: it.accent, bg: it.bg, type: it.type, dur: it.dur,
    });
    window.__mtxActivityRunner?.closeQueue();
  };
  const handleQueueAddMore = () => {
    setAddContentOpen(true);
  };
  const handleAddContentBack = () => {
    setAddContentOpen(false);
  };

  const content = (
    <>
      <ActivityRunner
        activity={activity}
        onRequestClose={handleRequestClose}
        onComplete={handleComplete}
      />
      {queueOpen && PlaylistQueueSheet && runnerPlaylist && (
        // Wrapper con zIndex 230 para asegurar que el queue se vea ENCIMA del
        // runner (zIndex 200). El sheet interno usa absolute inset:0 que
        // queda relativo a este wrapper.
        <div style={{ position:'absolute', inset:0, zIndex:230 }}>
          <PlaylistQueueSheet
            playlist={runnerPlaylist}
            items={runnerItems}
            currentIndex={currentIndex}
            onSelect={handleQueueSelect}
            onClose={handleQueueClose}
            onShareItem={() => toast.show({ message: 'Compartir · próximamente', duration: 1500 })}
            onRemoveItem={() => toast.show({ message: 'Estas son sugerencias contextuales', duration: 1700 })}
            onAddMore={handleQueueAddMore}
          />
        </div>
      )}
      {exitConfirmOpen && (
        <ConfirmExitRunnerModal
          activity={activity}
          secondsLeft={snapshot.secondsLeft}
          totalSec={snapshot.totalSec}
          onCancel={() => window.__mtxActivityRunner?.cancelExit()}
          onComplete={handleComplete}
          onAbandon={handleAbandon}
        />
      )}
      {completionOpen && (
        <RunnerCompletionScreen
          activity={activity}
          totalSec={snapshot.totalSec}
          onClose={handleCompletionClose}
        />
      )}
      {addContentOpen && AddContentScreen && runnerPlaylist && (
        // Reusa el AddContentScreen de explore-flow.jsx. Mutará
        // runnerPlaylist._extraItemIds para añadir items seleccionados.
        // Como runnerPlaylist es estable via useMemo([activity?.id]), los
        // ids agregados persisten mientras el runner está abierto.
        <div style={{
          position:'absolute', inset:0, zIndex:235,
          background:'#050706',
          animation:'mtx-fade-up .35s ease',
        }}>
          <AddContentScreen
            playlist={runnerPlaylist}
            onBack={handleAddContentBack}
          />
          {/* Mini player (RunnerCompanionBar en estado activo) flotante encima
              del AddContentScreen cuando hay item reproduciéndose. Reusa el
              mismo componente del companion del runner para diseño consistente. */}
          {currentItem && (
            <div style={{
              position:'absolute', left:0, right:0, bottom:8,
              pointerEvents:'auto',
            }}>
              <RunnerCompanionBar activity={activity} suggestionCount={runnerItems.length}/>
            </div>
          )}
        </div>
      )}
      {/* Mini player flotante también encima del queue sheet, para que el
          usuario sepa qué está reproduciéndose mientras navega la cola. */}
      {queueOpen && currentItem && (
        <div style={{
          position:'absolute', left:0, right:0, bottom:8, zIndex:232,
          pointerEvents:'auto',
        }}>
          <RunnerCompanionBar activity={activity} suggestionCount={runnerItems.length}/>
        </div>
      )}
    </>
  );

  return (overlayRoot && reactDom && reactDom.createPortal)
    ? reactDom.createPortal(content, overlayRoot)
    : content;
}

Object.assign(window, {
  ActivityRunner, ActivityRunnerOverlay, ConfirmExitRunnerModal,
  RunnerCompanionBar, RunnerCompletionScreen,
  useActivityRunner,
});
