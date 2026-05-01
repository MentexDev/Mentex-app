// activity-runner.jsx — Fase C + C.2 · Runner timer-puro modal con audio companion
// ─────────────────────────────────────────────────────────────────────────────
// Diseño y lógica:
//
//   El runner es MODAL (no minimizable) — al intentar cerrar muestra
//   ConfirmExitRunnerModal con ring countdown + stats. Esto resuelve la
//   ambigüedad de "qué está sonando" durante una actividad: el ritual
//   sostenido es el protagonista, el audio es acompañamiento.
//
//   El runner trae 3 capas adentro:
//     1. Audio companion inline — widget compacto que muestra cover + título
//        + play/pause del item activo en window.__mtxPlayer (mismo store del
//        mini-bar). Cuando el runner está activo seteamos fullscreenOpen=true
//        en el store para ocultar la mini-bar (evita doble UI).
//     2. Sugerencias contextuales — scroll horizontal de items de
//        EXPLORE_CONTENT pre-curados según runnerKind. Tap → __mtxPlayer.play.
//     3. Switcher de cola — chip "Cambiar fuente" que abre
//        __mtxActiveQueue.openSwitcher() (reusa el ya existente).

(function() {
  if (typeof window === 'undefined' || window.__mtxActivityRunner) return;
  let state = { activity: null, exitConfirmOpen: false };
  const emit = () => window.dispatchEvent(new CustomEvent('mtx:activity-runner-changed', { detail: { ...state } }));
  window.__mtxActivityRunner = {
    get: () => ({ ...state }),
    open: (activity) => {
      if (!activity) return;
      state = { activity, exitConfirmOpen: false };
      emit();
    },
    requestExit:  () => { state = { ...state, exitConfirmOpen: true  }; emit(); },
    cancelExit:   () => { state = { ...state, exitConfirmOpen: false }; emit(); },
    close: () => {
      state = { activity: null, exitConfirmOpen: false };
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
    : { activity: null, exitConfirmOpen: false };
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
// Mapping pre-curado: cada kind tiene un set de IDs de EXPLORE_CONTENT que
// tienen sentido como acompañamiento. Si la activity declara su propio
// `runnerSuggestionIds`, se respeta sobre el default.
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
  return ids
    .map(id => EC.find(c => c.id === id))
    .filter(Boolean);
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

  // Theme rotativo aurora
  const theme = React.useMemo(() => {
    if (typeof window !== 'undefined' && window._pickAndAdvanceModalTheme) {
      return window._pickAndAdvanceModalTheme();
    }
    return null;
  }, []);
  const Aurora = (typeof window !== 'undefined' && window.ConfirmAuroraBackground) || (() => null);

  // Mientras el runner está activo, ocultamos el mini-bar (MtxNowPlayingBar)
  // marcando fullscreenOpen=true en el store del player. Si hay audio
  // sonando, los controles compactos del companion abajo lo manejan.
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.__mtxPlayer && window.__mtxPlayer.setFullscreenOpen) {
      window.__mtxPlayer.setFullscreenOpen(true);
      return () => window.__mtxPlayer.setFullscreenOpen(false);
    }
  }, []);

  // Countdown principal
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

  // Snapshot del progreso al window para que el ConfirmExitRunnerModal pueda
  // leer secondsLeft/totalSec sin tener que duplicar el state.
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
        <div style={{ width:38 }}/>
      </div>

      {/* Body scrolleable */}
      <div className="mtx-no-scrollbar" style={{
        flex:1, position:'relative', zIndex:2,
        overflowY:'auto', WebkitOverflowScrolling:'touch',
        display:'flex', flexDirection:'column', alignItems:'center',
        padding:'4px 0 8px',
      }}>
        {/* Title + subtitle */}
        <div style={{ textAlign:'center', padding:'8px 28px 24px' }}>
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

        {/* Ring hero */}
        <div style={{
          position:'relative', width:RING_SIZE, height:RING_SIZE,
          transform:`scale(${breathScale})`,
          transition:'transform 1s ease-in-out',
          flexShrink:0,
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

        {/* Sub-stats */}
        <div style={{
          marginTop:18, fontSize:11, fontWeight:600,
          color:'rgba(255,255,255,0.5)', letterSpacing:'-0.005em',
          fontVariantNumeric:'tabular-nums', flexShrink:0,
        }}>
          {Math.round(pct * 100)}% completado · {Math.floor(totalSec / 60)} min totales
        </div>

        {/* Controles play/pause + skip */}
        <div style={{
          marginTop:18, marginBottom:22,
          display:'flex', alignItems:'center', justifyContent:'center', gap:32,
          flexShrink:0,
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

        {/* Audio companion + sugerencias */}
        <RunnerAudioCompanion activity={activity}/>
        <RunnerSuggestionsRow activity={activity}/>
      </div>

      {/* Footer sticky */}
      <div style={{
        position:'relative', zIndex:2,
        padding:'10px 28px 24px',
        display:'flex', justifyContent:'center',
        flexShrink:0,
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

// ── RunnerAudioCompanion ──────────────────────────────────────────────────────
// Widget compacto al fondo del runner. Muestra el item activo en
// __mtxPlayer (mismo store del mini-bar). Si no hay audio, muestra CTA
// vacío con un chip "Cambiar fuente" que abre el switcher.
function RunnerAudioCompanion({ activity }) {
  const useNowPlaying = (typeof window !== 'undefined' && window.useNowPlaying) || (() => ({ currentItem:null, isPlaying:false }));
  const { currentItem, isPlaying } = useNowPlaying();
  const accent = activity?.accent || '#3dffd1';

  const handleTogglePlay = () => {
    if (!window.__mtxPlayer) return;
    if (isPlaying) window.__mtxPlayer.pause();
    else window.__mtxPlayer.resume();
  };

  const handleOpenSwitcher = () => {
    if (window.__mtxActiveQueue && window.__mtxActiveQueue.openSwitcher) {
      window.__mtxActiveQueue.openSwitcher();
    }
  };

  if (!currentItem) {
    return (
      <div style={{
        margin:'0 18px 14px', padding:'14px 14px',
        borderRadius:18, width:'calc(100% - 36px)', maxWidth:360,
        boxSizing:'border-box',
        background:'rgba(255,255,255,0.04)',
        border:`0.5px dashed ${accent}40`,
        display:'flex', alignItems:'center', gap:11,
        flexShrink:0,
      }}>
        <div style={{
          width:40, height:40, borderRadius:11, flexShrink:0,
          background:`linear-gradient(135deg, ${accent}26, ${accent}06)`,
          border:`0.5px solid ${accent}45`,
          display:'flex', alignItems:'center', justifyContent:'center',
          color: accent,
        }}>
          <IcSparkles size={17} stroke="currentColor" strokeWidth={1.7}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontSize:12.5, fontWeight:700, color:'var(--ink-1)',
            letterSpacing:'-0.01em', lineHeight:1.2, marginBottom:2,
          }}>Acompáñate con sonido</div>
          <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.55)', letterSpacing:'-0.005em' }}>
            Elige algo abajo o cambia tu cola
          </div>
        </div>
        <button onClick={handleOpenSwitcher} aria-label="Cambiar fuente" className="mtx-tap" style={{
          appearance:'none', cursor:'pointer', flexShrink:0,
          padding:'7px 11px', borderRadius:999,
          background:'rgba(255,255,255,0.06)',
          border:'0.5px solid rgba(255,255,255,0.12)',
          color:'var(--ink-2)',
          fontSize:11, fontWeight:600, letterSpacing:'-0.005em',
          fontFamily:'var(--ff-sans)',
          display:'inline-flex', alignItems:'center', gap:5,
        }}>
          <IcList size={11} stroke="currentColor" strokeWidth={1.8}/>
          Cambiar
        </button>
      </div>
    );
  }

  const itemAccent = currentItem.accent || '#3dffd1';
  return (
    <div style={{
      margin:'0 18px 14px', padding:'10px 12px 10px 10px',
      borderRadius:18, width:'calc(100% - 36px)', maxWidth:360,
      boxSizing:'border-box',
      background:'linear-gradient(180deg, rgba(20,24,22,0.85), rgba(15,19,18,0.95))',
      border:`0.5px solid ${itemAccent}33`,
      boxShadow:`0 -2px 14px ${itemAccent}1f, inset 0 1px 0 rgba(255,255,255,0.06)`,
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      display:'flex', alignItems:'center', gap:10,
      flexShrink:0, position:'relative', overflow:'hidden',
    }}>
      <div style={{
        width:42, height:42, borderRadius:12, flexShrink:0,
        position:'relative', overflow:'hidden',
        background: currentItem.bg || `linear-gradient(135deg, ${itemAccent}33, ${itemAccent}10)`,
        border:`0.5px solid ${itemAccent}40`,
      }}>
        {currentItem.cover && (
          <img src={currentItem.cover} alt="" loading="lazy" style={{
            position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
          }}/>
        )}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontSize:9, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase',
          color: itemAccent, marginBottom:2,
        }}>Sonando</div>
        <div style={{
          fontSize:13, fontWeight:700, color:'var(--ink-1)',
          letterSpacing:'-0.005em', lineHeight:1.2,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>{currentItem.title || 'Sin título'}</div>
        <div style={{
          fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:1.5,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>{currentItem.author || ''}</div>
      </div>
      <button onClick={handleTogglePlay} aria-label={isPlaying ? 'Pausar audio' : 'Reanudar audio'} className="mtx-tap" style={{
        appearance:'none', cursor:'pointer', flexShrink:0,
        width:38, height:38, borderRadius:'50%',
        border:`0.5px solid ${itemAccent}55`,
        background:`linear-gradient(180deg, ${itemAccent}28 0%, ${itemAccent}0d 100%)`,
        color: itemAccent,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:`0 0 12px ${itemAccent}40`,
      }}>
        {isPlaying
          ? <IcPause size={14} stroke="currentColor" strokeWidth={1.8}/>
          : <IcPlay size={13} stroke="currentColor"/>
        }
      </button>
      <button onClick={handleOpenSwitcher} aria-label="Cambiar fuente" className="mtx-tap" style={{
        appearance:'none', cursor:'pointer', flexShrink:0,
        width:30, height:30, borderRadius:'50%',
        border:'0.5px solid rgba(255,255,255,0.1)',
        background:'rgba(255,255,255,0.04)',
        color:'var(--ink-3)',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <IcList size={12} stroke="currentColor" strokeWidth={1.8}/>
      </button>
    </div>
  );
}

// ── RunnerSuggestionsRow ──────────────────────────────────────────────────────
function RunnerSuggestionsRow({ activity }) {
  const suggestions = React.useMemo(() => _resolveSuggestions(activity), [activity?.id, activity?.runnerKind]);
  if (!suggestions.length) return null;

  const handlePick = (item) => {
    if (typeof window === 'undefined' || !window.__mtxPlayer) return;
    window.__mtxPlayer.play({
      id: item.id,
      title: item.title,
      author: item.author,
      cover: item.cover,
      accent: item.accent,
      bg: item.bg,
      type: item.type,
      dur: item.dur,
    });
  };

  return (
    <div style={{ width:'100%', flexShrink:0, paddingBottom:6 }}>
      <div style={{
        padding:'0 22px 8px',
        display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10,
      }}>
        <div style={{
          fontSize:9.5, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase',
          color:'rgba(255,255,255,0.45)',
        }}>
          Sugerencias para tu actividad
        </div>
      </div>
      <div className="mtx-no-scrollbar" style={{
        display:'flex', gap:10, overflowX:'auto', WebkitOverflowScrolling:'touch',
        padding:'0 18px 4px',
      }}>
        {suggestions.map(it => (
          <RunnerSuggestionCard key={it.id} item={it} onClick={() => handlePick(it)}/>
        ))}
      </div>
    </div>
  );
}

function RunnerSuggestionCard({ item, onClick }) {
  const accent = item.accent || '#3dffd1';
  return (
    <button onClick={onClick} className="mtx-tap" aria-label={`Reproducir ${item.title}`} style={{
      appearance:'none', cursor:'pointer', textAlign:'left',
      flexShrink:0, width:148, padding:0, borderRadius:14, border:0,
      background:'transparent',
      fontFamily:'var(--ff-sans)',
    }}>
      <div style={{
        position:'relative', width:148, height:88,
        borderRadius:14, overflow:'hidden',
        background: item.bg || `linear-gradient(135deg, ${accent}33, ${accent}10)`,
        border:`0.5px solid ${accent}40`,
        boxShadow:`0 0 12px ${accent}20`,
      }}>
        {item.cover && (
          <img src={item.cover} alt="" loading="lazy" style={{
            position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
            opacity:0.78,
          }}/>
        )}
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.65) 100%)',
        }}/>
        <div style={{
          position:'absolute', top:8, right:8,
          width:26, height:26, borderRadius:'50%',
          background:`${accent}cc`, color:'#0a1410',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 0 10px ${accent}70`,
        }}>
          <IcPlay size={11} stroke="currentColor"/>
        </div>
        <div style={{
          position:'absolute', bottom:6, left:8, right:8,
          fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.95)',
          letterSpacing:'-0.005em', lineHeight:1.2,
          textShadow:'0 1px 4px rgba(0,0,0,0.6)',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>{item.title}</div>
      </div>
      <div style={{ padding:'6px 4px 0' }}>
        <div style={{
          fontSize:10, color:'var(--ink-3)', letterSpacing:'-0.005em',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>{item.author || ''}{item.dur ? ` · ${item.dur}` : ''}</div>
      </div>
    </button>
  );
}

// ── ConfirmExitRunnerModal ────────────────────────────────────────────────────
// Modal persuasivo cuando el user intenta cerrar el runner. Mismo lenguaje
// que ReflectionDelayScreen pero adaptado: ring countdown 5s + stats de
// progreso de la actividad. Si no decide, asume que el tap fue accidental
// y vuelve a la actividad.
function ConfirmExitRunnerModal({ activity, secondsLeft, totalSec, onCancel, onConfirm }) {
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

      {/* Ring countdown 140 hero */}
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        marginBottom:30, position:'relative', zIndex:1,
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
        background:'rgba(255,107,107,0.14)',
        border:'0.5px solid rgba(255,107,107,0.35)',
        backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
        color:'rgba(255,160,160,1)',
        fontSize:10, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase',
        marginBottom:14, position:'relative', zIndex:1,
      }}>
        <span style={{
          width:6, height:6, borderRadius:999, background:'rgba(255,107,107,1)',
          boxShadow:'0 0 8px rgba(255,107,107,0.7)',
        }}/>
        Salir de la actividad
      </div>

      <h1 style={{
        margin:'0 0 8px', fontSize:22, fontWeight:800,
        color:'var(--ink-1)', letterSpacing:'-0.025em', lineHeight:1.22,
        fontFamily:'var(--ff-display)', textAlign:'center', position:'relative', zIndex:1,
        maxWidth:300,
      }}>
        ¿Soltar la actividad ahora?
      </h1>
      <p style={{
        margin:'0 0 20px', fontSize:12.5, color:'rgba(255,255,255,0.65)',
        textAlign:'center', lineHeight:1.5, maxWidth:280, position:'relative', zIndex:1,
      }}>
        El timer se detiene. Si quieres escuchar algo mientras continúas, abajo tienes sugerencias y un switcher de cola.
      </p>

      {/* Stats de progreso */}
      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:10,
        width:'100%', maxWidth:320, marginBottom:18,
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

      <button onClick={onCancel} className="mtx-tap" style={{
        width:'100%', maxWidth:320, height:52, borderRadius:18, border:0, cursor:'pointer',
        background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.9)), var(--neon-deep, #1ad9ad))',
        color:'#0a1410', fontSize:15, fontWeight:700,
        fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
        boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 14px 36px -10px rgba(61,255,209,0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
        marginBottom:10, position:'relative', zIndex:1,
      }}>
        Volver a la actividad
      </button>

      <button onClick={onConfirm} className="mtx-tap" style={{
        background:'transparent', border:0, cursor:'pointer',
        color:'rgba(255,140,140,0.92)', fontSize:13, fontWeight:600,
        fontFamily:'var(--ff-sans)', padding:'8px 12px',
        position:'relative', zIndex:1,
      }}>
        Sí, soltar la actividad
      </button>
    </div>
  );
}

// ── ActivityRunnerOverlay ────────────────────────────────────────────────────
function ActivityRunnerOverlay() {
  const { activity, exitConfirmOpen } = useActivityRunner();
  const toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: () => {} };
  // Re-tomar el state actual del runner (secondsLeft, totalSec) cuando exit
  // confirm se abre. Como el state vive dentro de ActivityRunner (component
  // child), publicamos snapshot via window al cambiar countdown.
  const [snapshot, setSnapshot] = React.useState({ secondsLeft: 0, totalSec: 0 });

  React.useEffect(() => {
    const handler = (e) => setSnapshot(e.detail || { secondsLeft: 0, totalSec: 0 });
    window.addEventListener('mtx:runner-snapshot', handler);
    return () => window.removeEventListener('mtx:runner-snapshot', handler);
  }, []);

  const overlayRoot = typeof document !== 'undefined'
    ? document.getElementById('mtx-overlay-root')
    : null;
  const reactDom = typeof window !== 'undefined' ? window.ReactDOM : null;

  if (!activity) return null;

  const handleRequestClose = () => window.__mtxActivityRunner?.requestExit();
  const handleConfirmExit = () => {
    window.__mtxActivityRunner?.close();
  };
  const handleComplete = () => {
    toast.show({ message: `${activity.title || 'Actividad'} · completada`, duration: 1900 });
    window.__mtxActivityRunner?.close();
  };

  const content = (
    <>
      <ActivityRunner
        activity={activity}
        onRequestClose={handleRequestClose}
        onComplete={handleComplete}
      />
      {exitConfirmOpen && (
        <ConfirmExitRunnerModal
          activity={activity}
          secondsLeft={snapshot.secondsLeft}
          totalSec={snapshot.totalSec}
          onCancel={() => window.__mtxActivityRunner?.cancelExit()}
          onConfirm={handleConfirmExit}
        />
      )}
    </>
  );

  return (overlayRoot && reactDom && reactDom.createPortal)
    ? reactDom.createPortal(content, overlayRoot)
    : content;
}

Object.assign(window, {
  ActivityRunner, ActivityRunnerOverlay, ConfirmExitRunnerModal,
  RunnerAudioCompanion, RunnerSuggestionsRow, RunnerSuggestionCard,
  useActivityRunner,
});
