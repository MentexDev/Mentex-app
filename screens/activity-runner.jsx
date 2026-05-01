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
  // completionOpen: true cuando el runner llegó al target o el user marcó
  // como completa → muestra RunnerCompletionScreen ENCIMA del runner.
  // exitConfirmOpen ya no se usa — el modal de confirmación de salida fue
  // eliminado para que cerrar el runner sea instantáneo y el progreso
  // parcial persista en __mtxRunnerProgress.
  let state = { activity: null, queueOpen: false, completionOpen: false };
  const emit = () => window.dispatchEvent(new CustomEvent('mtx:activity-runner-changed', { detail: { ...state } }));
  window.__mtxActivityRunner = {
    get: () => ({ ...state }),
    open: (activity) => {
      if (!activity) return;
      state = { activity, queueOpen: false, completionOpen: false };
      emit();
    },
    // Cerrar instantáneo (antes abría el ConfirmExitRunnerModal). El
    // progreso parcial se preserva via __mtxRunnerProgress al desmontar
    // el body — la bola del play en ActivityRow lo refleja.
    requestExit:    () => { state = { activity: null, queueOpen: false, completionOpen: false }; emit(); },
    openQueue:      () => { state = { ...state, queueOpen: true }; emit(); },
    closeQueue:     () => { state = { ...state, queueOpen: false }; emit(); },
    showCompletion: () => { state = { ...state, completionOpen: true }; emit(); },
    close: () => {
      state = { activity: null, queueOpen: false, completionOpen: false };
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
    : { activity: null, queueOpen: false, completionOpen: false };
}

// ── __mtxRunnerProgress ──────────────────────────────────────────────────────
// Store de progreso parcial por activity. Persiste lo que el usuario lleva
// hecho cuando cierra el runner sin completar — al volver a abrir la misma
// activity arranca desde donde quedó. La bola del botón play en
// ActivityRow lee este progreso (0–1) para pintar el % de cumplimiento.
//   Duration: { current: secondsLeft, target: totalSec, completionPct }
//   Counter:  { current, target, completionPct }
//   Binary:   { marked: false, completionPct: 0 }   (binary se completa
//             en un solo tap → o está al 0% o al 100%, sin parcial)
// Al completar (completionPct = 1), el progreso se borra automáticamente
// (clear) — la rutina queda lista para mostrarse "completada" en el ritual
// del día.
(function() {
  if (typeof window === 'undefined' || window.__mtxRunnerProgress) return;
  let _data = {};
  const _emit = () => window.dispatchEvent(new CustomEvent('mtx:runner-progress-changed', { detail: { ..._data } }));
  window.__mtxRunnerProgress = {
    get:   (id) => (id ? _data[id] : { ..._data }),
    set:   (id, data) => { if (!id) return; _data = { ..._data, [id]: { ...data } }; _emit(); },
    clear: (id) => { if (!id || !_data[id]) return; const next = { ..._data }; delete next[id]; _data = next; _emit(); },
    list:  () => ({ ..._data }),
  };
})();

// Hook reactivo: leer el progreso de un activity dado (re-renderiza al cambiar).
function useRunnerProgress(activityId) {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const h = () => force();
    window.addEventListener('mtx:runner-progress-changed', h);
    return () => window.removeEventListener('mtx:runner-progress-changed', h);
  }, []);
  return (typeof window !== 'undefined' && window.__mtxRunnerProgress)
    ? window.__mtxRunnerProgress.get(activityId)
    : null;
}

// ── __mtxRunnerCompleted ─────────────────────────────────────────────────────
// Set de activities completadas en la sesión actual. Cuando el runner llega
// al 100% (auto-complete o markComplete del menú), la activity se marca aquí
// y ActivityRow renderiza el chulito ✓ en lugar del botón play. Es un Set
// in-memory — no persiste entre reloads (eso vendría con un store de hábitos
// diarios real). Para el alcance actual basta con el state de la sesión.
(function() {
  if (typeof window === 'undefined' || window.__mtxRunnerCompleted) return;
  let _ids = new Set();
  const _emit = () => window.dispatchEvent(new CustomEvent('mtx:runner-completed-changed', { detail: { ids: [..._ids] } }));
  window.__mtxRunnerCompleted = {
    isDone: (id) => !!id && _ids.has(id),
    mark:   (id) => { if (!id || _ids.has(id)) return; _ids.add(id); _emit(); },
    unmark: (id) => { if (!id || !_ids.has(id)) return; _ids.delete(id); _emit(); },
    list:   () => [..._ids],
    clearAll: () => { if (_ids.size === 0) return; _ids = new Set(); _emit(); },
  };
})();

function useRunnerCompleted(activityId) {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const h = () => force();
    window.addEventListener('mtx:runner-completed-changed', h);
    return () => window.removeEventListener('mtx:runner-completed-changed', h);
  }, []);
  return (typeof window !== 'undefined' && window.__mtxRunnerCompleted)
    ? window.__mtxRunnerCompleted.isDone(activityId)
    : false;
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

// ── RunnerOptionsSheet — bottom sheet "···" del runner ───────────────────────
// Reusa el mismo lenguaje visual del PlaylistOptionsSheet (explore-flow.jsx)
// para mantener consistencia: drag handle, header con ícono + label, lista de
// opciones, botón Cancelar al fondo. Abre desde abajo en lugar del dropdown
// inline previo (que rompía la jerarquía visual del fullscreen runner).
function RunnerOptionsSheet({
  activity, onClose, onMarkComplete, onReset,
  // Fase 2+: el label/desc del reset varía por métrica ("Reiniciar contador",
  // "Reiniciar distancia", etc.). Los defaults preservan el comportamiento
  // de Duration que existía antes del refactor.
  resetLabel = 'Empezar desde cero',
  resetDesc  = 'Reinicia el cronómetro al inicio',
  // Fase 3: binary no tiene reset semántico (no hay state acumulado que
  // resetear). El sheet entonces solo muestra "Marcar como completada".
  hideReset = false,
  // Add more — extiende el objetivo (cuando el user va más allá del
  // target original). Solo se muestra si onAddMore está provisto;
  // binary lo omite (no aplica a hábitos sí/no).
  onAddMore = null,
  addMoreLabel = 'Añadir más',
  addMoreDesc  = 'Extiende el objetivo',
  // Slot opcional para controles específicos de la métrica activa
  // (ej. selector de step size en distance). Se renderiza ANTES de la
  // lista de opciones, dentro del mismo sheet, sin nesting.
  topExtras = null,
}) {
  if (!activity) return null;
  const accent = activity?.accent || '#3dffd1';

  const options = [
    { id: 'mark-complete', label: 'Marcar como completada', desc: 'Termina la actividad y celebra', Ic: IcCheck,   accent: accent,    handler: onMarkComplete },
    ...(onAddMore ? [
      { id: 'add-more',    label: addMoreLabel,             desc: addMoreDesc,                      Ic: IcPlus,    accent: '#5dd3ff', handler: onAddMore },
    ] : []),
    ...(hideReset ? [] : [
      { id: 'reset',       label: resetLabel,               desc: resetDesc,                        Ic: IcRefresh, accent: '#ffd47a', handler: onReset },
    ]),
  ];

  const handleSelect = (opt) => {
    onClose();
    setTimeout(() => { opt.handler?.(); }, 220);
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:5,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight:'85%', overflowY:'auto', paddingBottom:24,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header — eyebrow + título de la actividad */}
        <div style={{ padding:'10px 22px 16px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:48, height:48, borderRadius:13, flexShrink:0,
            background: `linear-gradient(135deg, ${accent}33, ${accent}10)`,
            border:`0.5px solid ${accent}40`,
            boxShadow:`0 6px 16px -6px ${accent}55`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: accent,
          }}>
            <span style={{ width:8, height:8, borderRadius:999, background: accent, boxShadow:`0 0 10px ${accent}` }}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', fontWeight:700, marginBottom:3 }}>
              {activity?.kind || 'Actividad'}
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.018em', lineHeight:1.2,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {activity?.title || 'En curso'}
            </div>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>
              Opciones del cronómetro
            </div>
          </div>
        </div>

        {/* Top extras — slot opcional para controles del body activo
            (ej. DistanceStepSelector). Se renderiza ANTES de las opciones
            estándar (Marcar como completada / Reiniciar) para que el
            usuario los encuentre primero. */}
        {topExtras && (
          <div style={{ padding:'0 18px 14px' }}>
            {topExtras}
          </div>
        )}

        {/* Options list */}
        <div style={{ padding:'0 18px', display:'flex', flexDirection:'column', gap:6 }}>
          {options.map(opt => (
            <button key={opt.id} onClick={() => handleSelect(opt)} className="mtx-tap" style={{
              appearance:'none', cursor:'pointer', textAlign:'left',
              padding:'12px 14px', borderRadius:14,
              border:'0.5px solid rgba(255,255,255,0.06)',
              background:'rgba(255,255,255,0.025)',
              display:'flex', alignItems:'center', gap:12,
              fontFamily:'var(--ff-sans)',
              transition:'background .15s, border-color .15s',
            }}>
              <div style={{
                width:38, height:38, borderRadius:11, flexShrink:0,
                background: `linear-gradient(135deg, ${opt.accent}26, ${opt.accent}06)`,
                border: `0.5px solid ${opt.accent}40`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: opt.accent,
              }}>
                <opt.Ic size={15} stroke="currentColor" strokeWidth={1.7}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink-1)', letterSpacing:'-0.005em' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1, letterSpacing:'-0.005em' }}>
                  {opt.desc}
                </div>
              </div>
              <IcChevR size={14} stroke="var(--ink-3)" strokeWidth={1.6}/>
            </button>
          ))}
        </div>

        {/* Cancel */}
        <div style={{ padding:'14px 18px 0' }}>
          <button onClick={onClose} className="mtx-tap" style={{
            width:'100%', height:48, borderRadius:14, cursor:'pointer',
            border:'0.5px solid var(--glass-stroke)',
            background:'var(--glass-2)', color:'var(--ink-2)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RunnerShell ───────────────────────────────────────────────────────────────
// Shell genérico del runner full-screen. Envuelve cualquier body de métrica
// (Duration, Counter, Distance, Binary…) con la misma:
//   • estructura: container con Aurora + flex column + safe space + sheets
//   • header: back chev + chip eyebrow del kind + botón "···" más opciones
//   • companion bar (cuando hasCompanion=true) — para métricas que pueden
//     reproducir audio durante la actividad (Duration, Cantidad, Distancia)
//   • efecto de player.stop + setFullscreenOpen al montar/desmontar
//   • RunnerOptionsSheet con onMarkComplete + onReset que el body provee
// El body se renderiza como children y maneja su propio state interno
// (countdown, contador, etc.). Esta separación permite que cada métrica
// tenga su lógica sin duplicar layout/header/sheets.
function RunnerShell({
  activity,
  onRequestClose,
  onMarkComplete,
  onReset,
  hasCompanion = true,
  resetLabel,
  resetDesc,
  // Fase 3: binary oculta la opción reset del menú (no aplica a hábitos
  // sin estado acumulable).
  hideReset = false,
  // Add more — extiende el target. Counter/Duration lo proveen; Binary
  // lo omite (no aplica a hábitos sí/no).
  onAddMore = null,
  addMoreLabel,
  addMoreDesc,
  // Slot opcional pasado al RunnerOptionsSheet (ej. selector de step
  // size para distance).
  optionsTopExtras = null,
  children,
}) {
  const accent = activity?.accent || '#3dffd1';
  const copy = _resolveCopy(activity?.runnerKind);
  const [optionsOpen, setOptionsOpen] = React.useState(false);

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
        {/* Botón 3-puntos horizontales — abre RunnerOptionsSheet (bottom sheet) */}
        <button onClick={() => setOptionsOpen(true)} aria-label="Más opciones" className="mtx-tap" style={{
          width:38, height:38, borderRadius:999, border:0, cursor:'pointer',
          background: optionsOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
          backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
          color:'var(--ink-1)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'background .2s',
        }}>
          <IcMoreH size={18} stroke="currentColor"/>
        </button>
      </div>

      {/* Body slot — el componente body de cada métrica se renderiza aquí.
          flex:1 + center alignment + padding lateral consistente. */}
      <div style={{
        flex:1, position:'relative', zIndex:2,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'8px 28px',
      }}>
        {children}
      </div>

      {/* Companion al fondo del runner — solo en métricas que tienen sentido
          con audio (Duration, Cantidad, Distancia). Páginas y Hecho lo
          omiten via hasCompanion=false. */}
      {hasCompanion && (
        <RunnerCompanionBar
          activity={activity}
          suggestionCount={_resolveSuggestions(activity).length}
        />
      )}

      {/* Safe space inferior — 28 px deja aire al borde del iPhone sin
          quedar pegado al home indicator. */}
      <div style={{ height:28, flexShrink:0 }}/>

      {/* Bottom sheet de opciones (3 puntos del header) */}
      {optionsOpen && (
        <RunnerOptionsSheet
          activity={activity}
          onClose={() => setOptionsOpen(false)}
          onMarkComplete={() => { setOptionsOpen(false); onMarkComplete?.(); }}
          onReset={() => { setOptionsOpen(false); onReset?.(); }}
          resetLabel={resetLabel}
          resetDesc={resetDesc}
          hideReset={hideReset}
          onAddMore={onAddMore ? () => { setOptionsOpen(false); onAddMore?.(); } : null}
          addMoreLabel={addMoreLabel}
          addMoreDesc={addMoreDesc}
          topExtras={optionsTopExtras}
        />
      )}
    </div>
  );
}

// ── DurationRunnerBody ────────────────────────────────────────────────────────
// Body para activities con metricType='duration': timer countdown circular
// con anillo de progreso, skip ±30s, play/pause grande, phase text.
//
// Este es el comportamiento clásico que viene desde Fase C — preservado
// pixel-perfect post-refactor (Fase 1 del plan de métricas alternativas).
function DurationRunnerBody({ activity, onRequestClose, onComplete }) {
  const baseTotalSec = Math.max(60, Number(activity?.runnerDurationSec) || (activity?.totalSec) || 5 * 60);
  const accent = activity?.accent || '#3dffd1';
  const copy = _resolveCopy(activity?.runnerKind);

  // Restaurar state — prioridad: 1) progreso parcial guardado;
  // 2) activity completed (reabre con secondsLeft=0, pausado); 3) fresh.
  const _saved = (typeof window !== 'undefined' && window.__mtxRunnerProgress)
    ? window.__mtxRunnerProgress.get(activity?.id) : null;
  const _wasCompleted = (typeof window !== 'undefined' && window.__mtxRunnerCompleted)
    ? window.__mtxRunnerCompleted.isDone(activity?.id) : false;
  const _restoredSeconds = (_saved && _saved.metricType === 'duration' && _saved.target === baseTotalSec)
    ? Math.max(0, _saved.current)
    : (_wasCompleted ? 0 : baseTotalSec);
  // Si reabre completed, no auto-arranca el countdown — el user puede
  // skip back, reset o "Añadir más" desde el menú "···".
  const _initialPlaying = !_wasCompleted;

  // Extend totalSec: el user puede sumar 5 min al objetivo desde "···"
  // → "Añadir más". Reset vuelve extendBy a 0.
  const [extendSec, setExtendSec] = React.useState(0);
  const totalSec = baseTotalSec + extendSec;

  const [secondsLeft, setSecondsLeft] = React.useState(_restoredSeconds);
  const [isPlaying, setIsPlaying] = React.useState(_initialPlaying);
  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => { onCompleteRef.current = onComplete; });

  // Auto-unmark cuando el user retrocede el timer (skip back / reset)
  // sobre una activity completed — vuelve a estar pendiente.
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.__mtxRunnerCompleted || !activity?.id) return;
    if (secondsLeft > 0 && window.__mtxRunnerCompleted.isDone(activity.id)) {
      window.__mtxRunnerCompleted.unmark(activity.id);
    }
  }, [secondsLeft, activity?.id]);

  // Skip-completion ref — si la activity venía completed al mount, el
  // countdown que arranque después de un resume con secondsLeft=0 NO
  // debe disparar la celebración otra vez. Igual que en Counter, el
  // flag se desactiva cuando secondsLeft > 0 (user retrocedió o añadió).
  const _initialCompletedRef = React.useRef(_wasCompleted);
  React.useEffect(() => {
    if (secondsLeft > 0) _initialCompletedRef.current = false;
  }, [secondsLeft]);

  // Countdown del timer
  React.useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(id);
          // Skip celebración si la activity ya estaba completed al mount
          // y el user no retrocedió el timer (current sigue en 0). Esto
          // ocurre si user reabre completed y tap "Reanudar" sin avanzar.
          if (!_initialCompletedRef.current) {
            setTimeout(() => onCompleteRef.current?.(), 200);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying]);

  const elapsed = totalSec - secondsLeft;
  const pct = elapsed / totalSec;

  // Snapshot genérico — el shape soporta cualquier métrica (Duration/
  // Counter/Distance/Binary). RunnerCompletionScreen lee via los campos
  // derivados (completionPct, primaryValue, primaryUnit, statLabel) sin
  // tener que conocer la implementación de cada body.
  // También persiste el progreso parcial en __mtxRunnerProgress para
  // que la bola del play en ActivityRow muestre el % cumplido y el user
  // pueda retomar al reabrir.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const elapsedMin = Math.max(0, Math.floor(elapsed / 60));
    window.dispatchEvent(new CustomEvent('mtx:runner-snapshot', {
      detail: {
        metricType: 'duration',
        completionPct: pct,
        primaryValue: String(elapsedMin),
        primaryUnit: 'min',
        statLabel: 'Tiempo',
        secondsLeft, totalSec,
      },
    }));
    // Persistencia: si pct < 1 guarda parcial, si llega a 1 borra.
    if (window.__mtxRunnerProgress && activity?.id) {
      if (pct >= 1) {
        window.__mtxRunnerProgress.clear(activity.id);
      } else {
        window.__mtxRunnerProgress.set(activity.id, {
          metricType: 'duration',
          current: secondsLeft,
          target: totalSec,
          completionPct: pct,
        });
      }
    }
  }, [secondsLeft, totalSec, elapsed, pct, activity?.id]);
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
  const handleReset = () => {
    setExtendSec(0);
    setSecondsLeft(baseTotalSec);
    setIsPlaying(true);
  };
  const handleMarkComplete = () => onCompleteRef.current?.();
  // "Añadir más" — extiende totalSec en 5 min y arranca countdown si
  // estaba pausado al final (reabrió completed).
  const handleAddMore = () => {
    const ADD_SEC = 5 * 60;
    setExtendSec(e => e + ADD_SEC);
    setSecondsLeft(s => s + ADD_SEC);
    setIsPlaying(true);
    _initialCompletedRef.current = false;
  };

  return (
    <RunnerShell
      activity={activity}
      onRequestClose={onRequestClose}
      onMarkComplete={handleMarkComplete}
      onReset={handleReset}
      hasCompanion={true}
      onAddMore={handleAddMore}
      addMoreLabel="Añadir 5 min más"
      addMoreDesc={`Sube el objetivo a ${Math.floor((totalSec + 5*60) / 60)} min`}
    >
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
    </RunnerShell>
  );
}

// ── ActivityRunner — router por metricType ───────────────────────────────────
// Entry point del runner full-screen. Selecciona el body apropiado según
// activity.metricType (default 'duration' para backward compat con activities
// pre-feature que solo tenían runnerType='timer'). Fases 2-4 agregarán:
//   • CounterRunnerBody  (cantidad + páginas)
//   • DistanceRunnerBody (distancia, métrica nueva)
//   • BinaryRunnerBody   (hecho)
function ActivityRunner({ activity, onRequestClose, onComplete }) {
  // Router por metricType. Backward compat: si activity no tiene metricType
  // explícito, asumimos 'duration' (el único body que existía antes de Fase 2).
  // count, pages y distance comparten CounterRunnerBody — el cuerpo se
  // parametriza por unit/statLabel/companion sin duplicar JSX.
  const metric = activity?.metricType || 'duration';
  if (metric === 'count' || metric === 'pages' || metric === 'distance') {
    return <CounterRunnerBody activity={activity} onRequestClose={onRequestClose} onComplete={onComplete}/>;
  }
  if (metric === 'binary') {
    return <BinaryRunnerBody activity={activity} onRequestClose={onRequestClose} onComplete={onComplete}/>;
  }
  return <DurationRunnerBody activity={activity} onRequestClose={onRequestClose} onComplete={onComplete}/>;
}

// ── DistanceStepSelector ─────────────────────────────────────────────────────
// Mini control de pills para elegir el incremento por tap del runner de
// distance: 0.1 / 0.25 / 0.5 / 1 km. Se renderiza dentro del
// RunnerOptionsSheet (slot topExtras) — el usuario abre "···" del header
// y elige el tamaño del paso sin salir del runner.
//
// Diseño consistente con las pills de "Tipo de medición" del
// RoutineCreateSheet: scroll-x si fuera necesario (4 pills caben en
// pantalla), pill activa con accent + glow, transición suave.
const _DISTANCE_STEPS = [
  { value: 0.1,  label: '0.1 km' },
  { value: 0.25, label: '0.25 km' },
  { value: 0.5,  label: '0.5 km' },
  { value: 1,    label: '1 km' },
];

function DistanceStepSelector({ value, onChange, accent = '#3dffd1' }) {
  return (
    <div>
      <div style={{
        fontSize: 9.5, fontWeight: 700, color: 'var(--ink-3)',
        letterSpacing: '0.16em', textTransform: 'uppercase',
        marginBottom: 8, padding: '0 2px',
      }}>
        Tamaño del paso
      </div>
      <div className="mtx-scroll-x" style={{
        display: 'flex', gap: 8, padding: '0 0 4px',
      }}>
        {_DISTANCE_STEPS.map(s => {
          const active = Math.abs(s.value - value) < 0.001;
          return (
            <button key={s.value}
              onClick={() => onChange(s.value)}
              className="mtx-tap"
              style={{
                flexShrink: 0,
                appearance: 'none', cursor: 'pointer',
                padding: '8px 14px',
                borderRadius: 999,
                border: active ? `0.5px solid ${accent}66` : '0.5px solid rgba(255,255,255,0.08)',
                background: active
                  ? `linear-gradient(180deg, ${accent}1f, ${accent}05)`
                  : 'rgba(255,255,255,0.03)',
                color: active ? accent : 'var(--ink-2)',
                fontFamily: 'var(--ff-sans)', fontSize: 12.5,
                fontWeight: active ? 700 : 500,
                letterSpacing: '-0.005em',
                fontVariantNumeric: 'tabular-nums',
                boxShadow: active ? `0 0 12px ${accent}33, inset 0 0 10px ${accent}10` : 'none',
                transition: 'all .22s cubic-bezier(.34,1.56,.64,1)',
              }}>
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── CounterRunnerBody ─────────────────────────────────────────────────────────
// Body para métricas que se cuentan en incrementos discretos:
//   • metricType='count'    → "veces" (visualizaciones, gratitudes, push-ups)
//   • metricType='pages'    → "pp" (lectura)
//   • metricType='distance' → "km" (caminar, correr) — soporta decimales
//
// Companion ON para todas estas métricas — leer/contar/caminar va bien con
// música ambiente o playlists motivacionales (sonidos lo-fi, lluvia, etc.).
//
// Reusa <RunnerShell> 100% (header + safe + options sheet + player effect).
// Diseño espejo del DurationRunnerBody:
//   • Mismo ring SVG (RING_SIZE 232, R 104, tick marks)
//   • Centro: número grande `current` + sub-label `/ target unit`
//   • Status line: "X / Y completadas · Y unit total"
//   • Controles: −1 (corregir) · +1 BIG (primary action) · +5 (skip si target>5)
// Auto-complete cuando current >= target tras un setTimeout breve para que el
// usuario vea el último +1 antes del completion screen.
function CounterRunnerBody({ activity, onRequestClose, onComplete }) {
  const accent = activity?.accent || '#3dffd1';
  const rawMetric = activity?.metricType;
  const metricType = (rawMetric === 'pages' || rawMetric === 'distance') ? rawMetric : 'count';
  const unit = activity?.metricUnit || (
    metricType === 'pages'    ? 'pp'
    : metricType === 'distance' ? 'km'
    : 'veces'
  );
  // Target: clamp [0.5, ∞), default 10. Distance acepta decimales (3.5 km),
  // count/pages se redondean a enteros.
  const rawTarget = Number(activity?.metricValue) || 10;
  const target = metricType === 'distance'
    ? Math.max(0.5, rawTarget)
    : Math.max(1, Math.round(rawTarget));
  const motto = activity?.runnerLabel || (
    metricType === 'pages'    ? 'Una página a la vez.'
    : metricType === 'distance' ? 'A tu propio ritmo.'
    : 'Cada repetición cuenta.'
  );

  // Restaurar state inicial — orden de prioridad:
  //   1. Progreso parcial guardado (user salió antes del target) → continúa.
  //   2. Activity marcada como completed (user reabre para revisar) → current=target.
  //   3. Default → current=0 (rutina fresh).
  const _saved = (typeof window !== 'undefined' && window.__mtxRunnerProgress)
    ? window.__mtxRunnerProgress.get(activity?.id) : null;
  const _wasCompleted = (typeof window !== 'undefined' && window.__mtxRunnerCompleted)
    ? window.__mtxRunnerCompleted.isDone(activity?.id) : false;
  const _restoredCurrent = (_saved && _saved.metricType === metricType && _saved.target === target)
    ? Math.max(0, Math.min(target, _saved.current))
    : (_wasCompleted ? target : 0);

  const [current, setCurrent] = React.useState(_restoredCurrent);

  // Extend target — el user puede sumar al objetivo desde el menú "···"
  // → "Añadir más" cuando quiere ir más allá del original (ej. caminó
  // 4 km cuando el ritual era de 3). Step por métrica:
  //   count    → +1 vez
  //   pages    → +5 páginas
  //   distance → +1 km
  // Reset vuelve current y extendBy a 0.
  const baseTarget = target;
  const [extendBy, setExtendBy] = React.useState(0);
  const effectiveTarget = baseTarget + extendBy;

  // Step size — cuánto suma cada tap del botón "+1".
  //   • count, pages → 1 (siempre entero).
  //   • distance     → user puede elegir 0.1 / 0.25 / 0.5 / 1 km desde
  //     el menú "···" (RunnerOptionsSheet con DistanceStepSelector).
  //     Default 1 km. Persiste durante la sesión del runner; al cerrar
  //     vuelve al default.
  const [stepSize, setStepSize] = React.useState(1);
  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => { onCompleteRef.current = onComplete; });

  // Si el user reabre una activity completed y modifica el state hacia
  // abajo (decrement, reset, quickAdd que aterriza menos por floating),
  // se desmarca automáticamente — la activity vuelve a estar pendiente
  // hasta que el ring vuelva a llenarse.
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.__mtxRunnerCompleted || !activity?.id) return;
    if (current < effectiveTarget && window.__mtxRunnerCompleted.isDone(activity.id)) {
      window.__mtxRunnerCompleted.unmark(activity.id);
    }
  }, [current, effectiveTarget, activity?.id]);

  // Flag mutable: la activity ya estaba completed al mount inicial. Si
  // current sigue en effectiveTarget desde el mount (user solo abrió a
  // revisar sin tocar nada), NO se dispara la celebración. Una vez current
  // cae debajo del target, el flag se desactiva y el siguiente full
  // re-llenado SÍ dispara la celebración normal.
  const _initialCompletedRef = React.useRef(_wasCompleted);

  // Auto-complete cuando se alcanza el target. Pequeño delay para que el
  // último +1 se vea antes del completion screen.
  React.useEffect(() => {
    if (current >= effectiveTarget) {
      if (_initialCompletedRef.current) return; // skip al reabrir completed
      const t = setTimeout(() => onCompleteRef.current?.(), 380);
      return () => clearTimeout(t);
    } else {
      _initialCompletedRef.current = false;
    }
  }, [current, effectiveTarget]);

  const pct = Math.max(0, Math.min(1, current / effectiveTarget));
  // Stat tile primario para exit/completion + pluralización de unit:
  //   count    → "Repeticiones" / 1 vez · 2 veces · ...
  //   pages    → "Páginas"      / "pp" siempre
  //   distance → "Distancia"    / "km" siempre (decimal preservado)
  const displayUnit = metricType === 'count' && current === 1 ? 'vez' : unit;
  const statLabel = (
    metricType === 'pages'    ? 'Páginas'
    : metricType === 'distance' ? 'Distancia'
    : 'Repeticiones'
  );

  // Snapshot polimórfico — RunnerCompletionScreen lee completionPct +
  // primaryValue + primaryUnit + statLabel. Persiste progreso parcial
  // en __mtxRunnerProgress: si pct<1 guarda parcial, al completar borra.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('mtx:runner-snapshot', {
      detail: {
        metricType,
        completionPct: pct,
        primaryValue: String(current),
        primaryUnit: displayUnit,
        statLabel,
        current, target: effectiveTarget, unit,
      },
    }));
    if (window.__mtxRunnerProgress && activity?.id) {
      if (pct >= 1) {
        window.__mtxRunnerProgress.clear(activity.id);
      } else {
        window.__mtxRunnerProgress.set(activity.id, {
          metricType, current, target: effectiveTarget, completionPct: pct,
        });
      }
    }
  }, [current, effectiveTarget, pct, metricType, displayUnit, statLabel, unit, activity?.id]);

  const RING_SIZE = 232;
  const R = 104;
  const C = 2 * Math.PI * R;
  const dashOffset = C * (1 - pct);

  // Helpers — usan stepSize para count/pages (=1 fijo) y distance
  // (configurable). _round corrige el float drift cuando step es 0.1
  // (ej. 0.1+0.1+0.1 = 0.30000000000000004 sin round).
  const _round = (n) => Math.round(n * 1000) / 1000;
  const handleIncrement = () => setCurrent(c => _round(Math.min(effectiveTarget, c + stepSize)));
  const handleDecrement = () => setCurrent(c => _round(Math.max(0, c - stepSize)));
  const handleQuickAdd  = () => setCurrent(c => _round(Math.min(effectiveTarget, c + stepSize * 5)));
  const handleReset = () => { setCurrent(0); setExtendBy(0); };
  const handleMarkComplete = () => onCompleteRef.current?.();
  // "Añadir más" — extiende el target. Step depende de la métrica.
  const handleAddMore = () => {
    const extendStep = (
      metricType === 'distance' ? 1
      : metricType === 'pages'  ? 5
      : 1 // count
    );
    setExtendBy(e => _round(e + extendStep));
    // Si el user añade después de completar, vuelve a permitir auto-complete
    _initialCompletedRef.current = false;
  };

  // El skip rápido +5 solo aparece para targets grandes (>5 step units) —
  // para targets chicos sería overshoot inmediato y confunde la UX.
  const showQuickAdd = effectiveTarget > stepSize * 5;

  // Labels de los botones reflejan el stepSize actual:
  //   distance step 0.5 → "−0.5", "+0.5", "+2.5"
  //   count   step 1   → "−1",   "+1",   "+5"
  const _fmtStep = (n) => {
    const x = _round(n);
    return Number.isInteger(x) ? String(x) : String(x);
  };
  const labelDecrement = `−${_fmtStep(stepSize)}`;
  const labelIncrement = `+${_fmtStep(stepSize)}`;
  const labelQuickAdd  = `+${_fmtStep(stepSize * 5)}`;

  // Companion ON para count, pages y distance:
  //   count    → música motivacional (gratitudes, reps, visualizaciones)
  //   pages    → sonidos ambiente para leer (lo-fi, lluvia, café)
  //   distance → running playlist (caminar/correr)
  const hasCompanion = true;

  // Reset label específico por métrica
  const resetLabel = (
    metricType === 'distance' ? 'Reiniciar distancia'
    : 'Reiniciar contador'
  );

  return (
    <RunnerShell
      activity={activity}
      onRequestClose={onRequestClose}
      onMarkComplete={handleMarkComplete}
      onReset={handleReset}
      hasCompanion={hasCompanion}
      resetLabel={resetLabel}
      resetDesc="Vuelve a cero y empieza de nuevo"
      onAddMore={handleAddMore}
      addMoreLabel={(() => {
        const extendStep = metricType === 'distance' ? 1 : metricType === 'pages' ? 5 : 1;
        return `Añadir ${extendStep} ${displayUnit} más`;
      })()}
      addMoreDesc={`Sube el objetivo a ${effectiveTarget + (metricType === 'pages' ? 5 : 1)} ${unit}`}
      optionsTopExtras={metricType === 'distance' ? (
        <DistanceStepSelector
          value={stepSize}
          accent={accent}
          onChange={(s) => setStepSize(s)}
        />
      ) : null}
    >
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <h1 style={{
          margin:0, fontSize:23, fontWeight:800,
          color:'var(--ink-1)', letterSpacing:'-0.025em', lineHeight:1.2,
          fontFamily:'var(--ff-display)',
        }}>
          {activity?.title || (
            metricType === 'pages'    ? 'Lectura'
            : metricType === 'distance' ? 'Caminata'
            : 'Cuenta tus repeticiones'
          )}
        </h1>
        <p style={{
          margin:'8px 0 0', fontSize:12.5, color:'rgba(255,255,255,0.6)',
          letterSpacing:'-0.005em', lineHeight:1.5, maxWidth:280, marginInline:'auto',
        }}>
          {motto}
        </p>
      </div>

      <div style={{ position:'relative', width:RING_SIZE, height:RING_SIZE }}>
        <div style={{
          position:'absolute', inset:-30, borderRadius:'50%',
          background:`radial-gradient(50% 50% at 50% 50%, ${accent}40 0%, transparent 70%)`,
          filter:'blur(24px)', pointerEvents:'none',
        }}/>
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} style={{ transform:'rotate(-90deg)', position:'relative' }}>
          <defs>
            <linearGradient id="counter-runner-grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#6affd9"/>
              <stop offset="1" stopColor="#1ad9ad"/>
            </linearGradient>
            <filter id="counter-runner-glow">
              <feGaussianBlur stdDeviation="3.5"/>
              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5"/>
          <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={R} fill="none"
            stroke="url(#counter-runner-grad)" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={dashOffset}
            filter="url(#counter-runner-glow)"
            style={{ transition:'stroke-dashoffset .35s cubic-bezier(.34,1.56,.64,1)' }}/>
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
          gap:2,
        }}>
          {/* Número grande del contador con micro-animation al cambiar.
              _fmtStep formatea decimales para evitar float drift visual
              (0.1+0.1+0.1 → 0.3 en lugar de 0.30000000000000004). */}
          <div key={current} style={{
            fontSize:72, fontWeight:600, color:'var(--ink-1)',
            fontVariantNumeric:'tabular-nums', letterSpacing:'-0.04em', lineHeight:1,
            fontFamily:'var(--ff-display)',
            textShadow:`0 0 20px ${accent}55`,
            animation:'mtxCounterPulse .35s cubic-bezier(.34,1.56,.64,1)',
          }}>{_fmtStep(current)}</div>
          <div style={{
            fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.55)',
            letterSpacing:'-0.01em', marginTop:4,
            fontVariantNumeric:'tabular-nums',
          }}>
            de {_fmtStep(effectiveTarget)} {unit}
          </div>
          <style>{`@keyframes mtxCounterPulse { 0% { transform:scale(0.92); opacity:0.65; } 60% { transform:scale(1.04); opacity:1; } 100% { transform:scale(1); opacity:1; } }`}</style>
        </div>
      </div>

      <div style={{
        marginTop:18, fontSize:11, fontWeight:600,
        color:'rgba(255,255,255,0.5)', letterSpacing:'-0.005em',
        fontVariantNumeric:'tabular-nums',
      }}>
        {Math.round(pct * 100)}% completado · {_fmtStep(effectiveTarget)} {unit} totales
      </div>

      <div style={{
        marginTop:22,
        display:'flex', alignItems:'center', justifyContent:'center', gap:32,
      }}>
        <button onClick={handleDecrement} disabled={current === 0}
          aria-label={`Restar ${_fmtStep(stepSize)}`}
          className="mtx-tap" style={{
            appearance:'none', cursor: current === 0 ? 'not-allowed' : 'pointer',
            background:'rgba(255,255,255,0.06)',
            border:'0.5px solid rgba(255,255,255,0.1)',
            backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
            width:48, height:48, borderRadius:'50%',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', gap:1,
            opacity: current === 0 ? 0.4 : 1,
            transition:'opacity .2s',
          }}>
          <IcChevL size={17} stroke="currentColor" strokeWidth={1.8}/>
          <span style={{ fontSize:8, fontWeight:700, color:'var(--ink-3)', letterSpacing:'0.04em' }}>{labelDecrement}</span>
        </button>
        <button onClick={handleIncrement} disabled={current >= effectiveTarget}
          aria-label={`Sumar ${_fmtStep(stepSize)} · ${_round(current + stepSize)} de ${_fmtStep(effectiveTarget)}`}
          className="mtx-tap" style={{
            appearance:'none', cursor: current >= target ? 'not-allowed' : 'pointer',
            width:74, height:74, borderRadius:'50%', border:0,
            background:`linear-gradient(180deg, ${accent}cc 0%, ${accent} 100%)`,
            color:'#0a1410',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:`0 0 0 1px ${accent}88, 0 0 44px ${accent}aa, inset 0 1px 0 rgba(255,255,255,0.4)`,
            flexShrink:0,
            opacity: current >= target ? 0.5 : 1,
            transition:'opacity .25s, transform .12s',
          }}>
            <IcPlus size={28} stroke="currentColor" strokeWidth={2.4}/>
        </button>
        {showQuickAdd ? (
          <button onClick={handleQuickAdd} disabled={current >= effectiveTarget}
            aria-label={`Sumar ${_fmtStep(stepSize * 5)}`}
            className="mtx-tap" style={{
              appearance:'none', cursor: current >= target ? 'not-allowed' : 'pointer',
              background:'rgba(255,255,255,0.06)',
              border:'0.5px solid rgba(255,255,255,0.1)',
              backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
              width:48, height:48, borderRadius:'50%',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              color:'var(--ink-1)', gap:1,
              opacity: current >= target ? 0.4 : 1,
              transition:'opacity .2s',
            }}>
            <IcChevR size={17} stroke="currentColor" strokeWidth={1.8}/>
            <span style={{ fontSize:8, fontWeight:700, color:'var(--ink-3)', letterSpacing:'0.04em' }}>{labelQuickAdd}</span>
          </button>
        ) : (
          // Spacer simétrico cuando no hay quick add — preserva el balance
          // visual del row (botón central queda perfectamente centrado).
          <div style={{ width:48, height:48, flexShrink:0 }} aria-hidden/>
        )}
      </div>
    </RunnerShell>
  );
}

// ── BinaryRunnerBody ──────────────────────────────────────────────────────────
// Body para metricType='binary' — hábitos sin medición acumulable, solo
// "hecho / no hecho" (suplementos, frío matinal, vitamina, oración matinal).
//
// Diseño espejo del CounterRunnerBody (consistencia visual):
//   • Mismo ring SVG (RING_SIZE 232, R 104, tick marks)
//   • Centro: ícono grande del activity (no número) + sub-label sutil
//   • Botón central 74×74 con IcCheck (donde Counter tiene +1)
//   • Sin -1, sin +5, sin status line numérico — un solo tap completa
//   • Sin companion (hábitos instantáneos, sin sugerencias)
// Al tap, el ring se llena al 100% (transición suave) y luego se dispara
// la celebración (RunnerCompletionScreen).
function BinaryRunnerBody({ activity, onRequestClose, onComplete }) {
  const accent = activity?.accent || '#3dffd1';
  const Ic = activity?.Ic || (typeof window !== 'undefined' && window.IcCheck) || (() => null);
  const motto = activity?.runnerLabel || 'Confirma cuando lo hayas completado.';
  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => { onCompleteRef.current = onComplete; });

  // Estado: marked toggle. Si la activity ya estaba completed (user
  // reabre para revisar), arranca en true. El user puede tap el botón
  // para desmarcar — útil para corregir un tap accidental.
  const _wasCompleted = (typeof window !== 'undefined' && window.__mtxRunnerCompleted)
    ? window.__mtxRunnerCompleted.isDone(activity?.id) : false;
  const [marked, setMarked] = React.useState(_wasCompleted);
  // doneCount — para hábitos repetibles (vitamina, suplementos, agua)
  // que se completan varias veces al día. Cada tap del CTA marca,
  // cada "Añadir una más" del menú "···" incrementa el contador.
  // Reset vuelve doneCount=0 y marked=false.
  const [doneCount, setDoneCount] = React.useState(_wasCompleted ? 1 : 0);
  const pct = marked ? 1 : 0;

  // Snapshot — emite tanto al mount como al cambiar `marked` o `doneCount`.
  // Si doneCount > 1, el primaryValue pasa a number+unit ("3 veces") en
  // lugar de la palabra "Hecho" — útil para hábitos repetibles donde el
  // completion screen muestra el conteo total del día.
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mtx:runner-snapshot', {
        detail: {
          metricType: 'binary',
          completionPct: pct,
          primaryValue: marked ? (doneCount > 1 ? String(doneCount) : 'Hecho') : '—',
          primaryUnit:  marked && doneCount > 1 ? (doneCount === 1 ? 'vez' : 'veces') : '',
          statLabel:    marked && doneCount > 1 ? 'Veces hoy' : 'Estado',
        },
      }));
    }
  }, [marked, pct, doneCount]);

  // Auto-complete con delay tras marcar — coherente con CounterRunnerBody
  // (380 ms): el usuario ve el ring llenarse antes del completion screen.
  // Solo dispara cuando _justMarked es true (acción del user en este
  // mount). Si el user reabre activity completed (marked inicial=true por
  // _wasCompleted), NO se vuelve a abrir el completion screen — el state
  // ya está marcado, el user vino solo a revisar.
  const [_justMarked, setJustMarked] = React.useState(false);
  React.useEffect(() => {
    if (!_justMarked) return;
    const t = setTimeout(() => onCompleteRef.current?.(), 480);
    return () => clearTimeout(t);
  }, [_justMarked]);

  // Toggle: si marked, untap → unmark + libera (vuelve a estar pendiente).
  // Si not marked, tap → mark + dispara completion tras delay.
  const handleToggleMark = () => {
    if (marked) {
      setMarked(false);
      setDoneCount(0);
      if (typeof window !== 'undefined' && window.__mtxRunnerCompleted && activity?.id) {
        window.__mtxRunnerCompleted.unmark(activity.id);
      }
    } else {
      setMarked(true);
      setDoneCount(1);
      setJustMarked(true);
    }
  };
  const handleMarkComplete = () => onCompleteRef.current?.();
  // "Añadir una más" — para hábitos repetibles (suplementos 3 veces al día).
  // Incrementa doneCount sin re-disparar celebración. Solo aplica cuando
  // ya está marked (la primera vez se marca con el tap del CTA).
  const handleAddMore = () => {
    if (!marked) {
      setMarked(true);
      setDoneCount(1);
      setJustMarked(true);
    } else {
      setDoneCount(c => c + 1);
    }
  };
  // Reset — vuelve binary a pendiente (marked=false, doneCount=0, unmark).
  const handleReset = () => {
    setMarked(false);
    setDoneCount(0);
    if (typeof window !== 'undefined' && window.__mtxRunnerCompleted && activity?.id) {
      window.__mtxRunnerCompleted.unmark(activity.id);
    }
  };

  const RING_SIZE = 232;
  const R = 104;
  const C = 2 * Math.PI * R;
  const dashOffset = C * (1 - pct);

  return (
    <RunnerShell
      activity={activity}
      onRequestClose={onRequestClose}
      onMarkComplete={handleMarkComplete}
      onReset={handleReset}
      hasCompanion={false}
      hideReset={false}
      resetLabel="Reiniciar"
      resetDesc="Vuelve el hábito a pendiente"
      onAddMore={handleAddMore}
      addMoreLabel={marked ? 'Añadir una más' : 'Marcar otra vez'}
      addMoreDesc={marked
        ? `Incrementa el contador (van ${doneCount}${doneCount === 1 ? '' : ''})`
        : 'Marca el hábito como hecho hoy'}
    >
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <h1 style={{
          margin:0, fontSize:23, fontWeight:800,
          color:'var(--ink-1)', letterSpacing:'-0.025em', lineHeight:1.2,
          fontFamily:'var(--ff-display)',
        }}>
          {activity?.title || 'Tu hábito'}
        </h1>
        <p style={{
          margin:'8px 0 0', fontSize:12.5, color:'rgba(255,255,255,0.6)',
          letterSpacing:'-0.005em', lineHeight:1.5, maxWidth:280, marginInline:'auto',
        }}>
          {motto}
        </p>
      </div>

      <div style={{ position:'relative', width:RING_SIZE, height:RING_SIZE }}>
        <div style={{
          position:'absolute', inset:-30, borderRadius:'50%',
          background:`radial-gradient(50% 50% at 50% 50%, ${accent}40 0%, transparent 70%)`,
          filter:'blur(24px)', pointerEvents:'none',
        }}/>
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} style={{ transform:'rotate(-90deg)', position:'relative' }}>
          <defs>
            <linearGradient id="binary-runner-grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#6affd9"/>
              <stop offset="1" stopColor="#1ad9ad"/>
            </linearGradient>
            <filter id="binary-runner-glow">
              <feGaussianBlur stdDeviation="3.5"/>
              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5"/>
          <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={R} fill="none"
            stroke="url(#binary-runner-grad)" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={dashOffset}
            filter="url(#binary-runner-glow)"
            style={{ transition:'stroke-dashoffset .55s cubic-bezier(.34,1.56,.64,1)' }}/>
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
          color: accent,
        }}>
          <Ic size={56} stroke="currentColor" strokeWidth={1.6}/>
          <div style={{
            fontSize:11, fontWeight:700, color: accent,
            letterSpacing:'0.22em', textTransform:'uppercase', marginTop:2,
            opacity: marked ? 1 : 0.6,
            transition:'opacity .35s ease',
            fontVariantNumeric:'tabular-nums',
          }}>
            {marked ? (doneCount > 1 ? `Hecho · ${doneCount}×` : 'Hecho') : 'Pendiente'}
          </div>
        </div>
      </div>

      {/* Sub-line para mantener consistencia vertical con Counter/Duration */}
      <div style={{
        marginTop:18, fontSize:11, fontWeight:600,
        color:'rgba(255,255,255,0.5)', letterSpacing:'-0.005em',
      }}>
        Toca cuando lo hayas completado
      </div>

      {/* Botón central — espejo del +1 BIG del Counter, con check icon.
          Spacers laterales 48×48 mantienen el balance visual del row. */}
      <div style={{
        marginTop:22,
        display:'flex', alignItems:'center', justifyContent:'center', gap:32,
      }}>
        <div style={{ width:48, height:48, flexShrink:0 }} aria-hidden/>
        {/* Botón toggle — siempre clickeable. Si marked, tap lo desmarca
            (unmark + ring vuelve a 0). Si no, tap marca y dispara
            completion. Permite corregir errores: tap accidental →
            tap de nuevo y vuelve a pendiente. */}
        <button onClick={handleToggleMark}
          aria-label={marked ? 'Desmarcar como hecho' : 'Marcar como hecho'}
          aria-pressed={marked}
          className="mtx-tap" style={{
            appearance:'none', cursor:'pointer',
            width:74, height:74, borderRadius:'50%', border:0,
            background:`linear-gradient(180deg, ${accent}cc 0%, ${accent} 100%)`,
            color:'#0a1410',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:`0 0 0 1px ${accent}88, 0 0 44px ${accent}aa, inset 0 1px 0 rgba(255,255,255,0.4)`,
            flexShrink:0,
            opacity: marked ? 0.65 : 1,
            transform: marked ? 'scale(0.96)' : 'scale(1)',
            transition:'opacity .25s, transform .2s',
          }}>
          <IcCheck size={28} stroke="currentColor" strokeWidth={2.6}/>
        </button>
        <div style={{ width:48, height:48, flexShrink:0 }} aria-hidden/>
      </div>
    </RunnerShell>
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
  const useNowPlaying = (typeof window !== 'undefined' && window.useNowPlaying) || (() => ({ currentItem:null, isPlaying:false, progress:0, durationSec:0 }));
  const { currentItem, isPlaying, progress, durationSec } = useNowPlaying();
  const accent = activity?.accent || '#3dffd1';

  const handleOpenQueue = () => window.__mtxActivityRunner?.openQueue();
  const handleTogglePlay = (e) => {
    e.stopPropagation();
    if (!window.__mtxPlayer) return;
    if (isPlaying) window.__mtxPlayer.pause();
    else window.__mtxPlayer.resume();
  };

  // Progress sintético — el VideoPlayerFullscreen es el que llama
  // __mtxPlayer.setProgress() cada segundo, pero cuando el usuario está
  // dentro del runner ese fullscreen no está montado, así que progress
  // queda en 0 indefinidamente y la barra no se mueve. Simulamos un tick
  // local que avanza progress mientras isPlaying=true. Usa el dur del
  // item parseado para calcular incremento por segundo.
  // IMPORTANTE: hooks ANTES del early return (Hook Rules).
  const itemDurSec = React.useMemo(() => {
    if (durationSec && durationSec > 0) return durationSec;
    const d = currentItem?.dur || '';
    let total = 0;
    const hM = d.match(/(\d+)\s*h/i); if (hM) total += parseInt(hM[1], 10) * 3600;
    const mM = d.match(/(\d+)\s*(?:m|min)/i); if (mM) total += parseInt(mM[1], 10) * 60;
    const sM = d.match(/(\d+)\s*s(?!\w)/i); if (sM) total += parseInt(sM[1], 10);
    return total > 0 ? total : 600; // default 10 min si no parsea
  }, [currentItem?.id, durationSec]);

  // RunnerCompanionBar solo se monta dentro del ActivityRunner overlay,
  // entonces NO hay VideoPlayerFullscreen real concurrente — siempre que
  // está montado, este timer es la única fuente de progreso.
  // Demo speed: tick cada 250ms con incremento 1/itemDurSec → ~4x velocidad
  // real. Como el contenido es mock (sin audio/video real), avanzar más
  // rápido que el reloj hace que la barra sea perceptiblemente activa
  // durante una sesión de prueba en lugar de quedarse "congelada" 1px.
  React.useEffect(() => {
    if (!isPlaying || !currentItem || !window.__mtxPlayer) return;
    const interval = setInterval(() => {
      const cur = window.__mtxPlayer.get().progress || 0;
      const inc = 1 / itemDurSec;
      const next = Math.min(1, cur + inc);
      window.__mtxPlayer.setProgress(next);
    }, 250);
    return () => clearInterval(interval);
  }, [isPlaying, currentItem?.id, itemDurSec]);

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
  // currentItem.dur es la duración total formateada del item ("5h 18m",
  // "30 min", etc.). Se muestra al final del subtitle para que el usuario
  // sepa cuánto dura sin tener que abrir el item.
  const subParts = [
    currentItem.author,
    (window.CONTENT_TYPES || []).find(t => t.id === currentItem.type)?.label,
    currentItem.dur,
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
        {/* Barra de progreso superpuesta arriba — track con contraste
            (rgba 0.16 vs 0.06 previo, prácticamente invisible) + height:4.
            Avanza vía useEffect arriba que llama __mtxPlayer.setProgress
            cada segundo cuando isPlaying y NO hay fullscreen montado. */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:4,
          background:'rgba(255,255,255,0.16)',
          zIndex:2, borderRadius:'20px 20px 0 0', overflow:'hidden',
        }}>
          <div style={{
            width:`${progressPct * 100}%`, height:'100%',
            background: itemAccent,
            boxShadow:`0 0 12px ${itemAccent}cc, 0 0 18px ${itemAccent}66`,
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
// Recibe el snapshot polimórfico del runner activo. Lee:
//   • completionPct (0-1) → para el stat "Progreso N%"
//   • primaryValue / primaryUnit → para el stat "Has hecho X unit"
//   • statLabel → label del primer stat tile ("Tiempo", "Repeticiones", etc.)
//   • secondsLeft / totalSec → backward compat con consumidores legacy
//     (Duration aún los emite). Si el body no los emite, computamos
//     elapsedStr desde primaryValue para Duration en formato "mm:ss".
function ConfirmExitRunnerModal({ activity, snapshot, onCancel, onComplete, onAbandon }) {
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

  // Para Duration: mostrar "12:34" como "Has hecho". Para count/pages
  // mostrar el primaryValue ("5"). El snapshot trae:
  //   - Duration: secondsLeft, totalSec, primaryValue (min), primaryUnit
  //   - Counter:  current, target, primaryValue (current), primaryUnit
  const metricType = snapshot?.metricType || 'duration';
  const completionPct = Math.round(((snapshot?.completionPct) || 0) * 100);
  let elapsedStr = '0';
  let elapsedUnit = '';
  if (metricType === 'duration' && snapshot?.totalSec != null) {
    const elapsed = Math.max(0, snapshot.totalSec - (snapshot.secondsLeft ?? 0));
    const mm = Math.floor(elapsed / 60);
    const ss = elapsed % 60;
    elapsedStr = `${mm}:${String(ss).padStart(2,'0')}`;
    elapsedUnit = '';
  } else {
    // count / pages / distance: usar primaryValue + primaryUnit del snapshot
    elapsedStr = String(snapshot?.primaryValue ?? '0');
    elapsedUnit = snapshot?.primaryUnit || '';
  }

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
          <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
            <span style={{
              fontSize:18, fontWeight:700, color:'var(--ink-1)',
              fontVariantNumeric:'tabular-nums', letterSpacing:'-0.025em', lineHeight:1,
              fontFamily:'var(--ff-display)',
            }}>{elapsedStr}</span>
            {elapsedUnit && (
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>{elapsedUnit}</span>
            )}
          </div>
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
// Recibe el snapshot polimórfico del último estado del runner. Computa
// el primer stat tile según metricType:
//   • duration → "X min" usando totalSec
//   • count    → "N veces" usando primaryValue
//   • pages    → "N pp" usando primaryValue
//   • distance → "X km" usando primaryValue
function RunnerCompletionScreen({ activity, snapshot, onClose }) {
  const accent = activity?.accent || '#3dffd1';
  const copy = _resolveCopy(activity?.runnerKind);
  const metricType = snapshot?.metricType || 'duration';

  // Stat principal: el body del runner ya emitió primaryValue + primaryUnit
  // ajustados a su métrica (ej. para Duration: "X" min con elapsed). Si no
  // hay snapshot (edge case), fallback a totalSec del activity.
  let statValue, statUnit, statLabel = snapshot?.statLabel || 'Tiempo';
  if (snapshot?.primaryValue != null) {
    statValue = snapshot.primaryValue;
    statUnit = snapshot.primaryUnit || '';
  } else {
    // Fallback Duration legacy
    statValue = String(Math.max(1, Math.floor((activity?.runnerDurationSec || activity?.totalSec || 0) / 60)));
    statUnit = 'min';
  }

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

        {/* Stats compactos — primer tile parametrizado por métrica
            (Tiempo / Repeticiones / Páginas / Distancia). El segundo
            siempre muestra "Actividad: 1 hecha". */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10, width:'100%', maxWidth:320 }}>
          <CompletionStatTile label={statLabel} value={statValue} unit={statUnit} Ic={IcClock} accent={accent}/>
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
  const { activity, queueOpen, completionOpen } = useActivityRunner();
  const toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: () => {} };
  // Snapshot polimórfico — Duration emite { secondsLeft, totalSec, ... },
  // Counter emite { current, target, ... }, etc. Los modales abajo leen
  // los campos derivados (completionPct, primaryValue, primaryUnit,
  // statLabel) que cada body computa según su métrica.
  const [snapshot, setSnapshot] = React.useState({
    metricType: 'duration', completionPct: 0,
    primaryValue: '0', primaryUnit: '', statLabel: 'Tiempo',
  });

  React.useEffect(() => {
    const handler = (e) => setSnapshot(e.detail || {});
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
    // Marcar la activity como completada en el set global — ActivityRow
    // del HomeActive renderiza el chulito ✓ en lugar del botón play.
    // También limpia el progreso parcial (redundante con el body al
    // alcanzar pct=1, pero garantiza el clear si el complete vino del
    // menú "Marcar como completada" antes de llegar al target).
    if (activity?.id) {
      window.__mtxRunnerCompleted?.mark(activity.id);
      window.__mtxRunnerProgress?.clear(activity.id);
    }
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
      {/* ConfirmExitRunnerModal eliminado — cerrar el runner es instantáneo.
          El progreso parcial se persiste en __mtxRunnerProgress y se
          refleja en la bola del play de cada ActivityRow. Esto soporta
          el modelo de hábito acumulable: el usuario puede salir, hacer
          algo más, y al volver retomar desde donde quedó. */}
      {completionOpen && (
        <RunnerCompletionScreen
          activity={activity}
          snapshot={snapshot}
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
            footerBottomOffset={currentItem ? 84 : 14}
          />
          {/* Mini player (RunnerCompanionBar en estado activo) flotante encima
              del AddContentScreen cuando hay item reproduciéndose. Reusa el
              mismo componente del companion del runner para diseño consistente.
              bottom:0 lo pega al borde inferior del frame del iPhone — el
              footerBottomOffset del AddContent (84) lo deja justo encima sin
              gap. */}
          {currentItem && (
            <div style={{
              position:'absolute', left:0, right:0, bottom:0,
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
          position:'absolute', left:0, right:0, bottom:0, zIndex:232,
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
  // Bodies por métrica — extraídos en Fases 1-2 del plan. Cada body usa
  // <RunnerShell> y dispara snapshots polimórficos que ConfirmExit y
  // RunnerCompletionScreen leen sin acoplarse a una métrica específica.
  RunnerShell,
  DurationRunnerBody,    // Fase 1 — timer countdown circular
  CounterRunnerBody,     // Fase 2 — contador +1/-1/+5 (count + pages + distance)
  BinaryRunnerBody,      // Fase 3 — ring + botón check central
  useRunnerProgress,
  useRunnerCompleted,
  useActivityRunner,
});
