// home-active.jsx — Sesión de enfoque activa (v5)

const ACTIVITIES = [
  { id:'a1', kind:'Meditación',      title:'Respira y vuelve a ti',  dur:'10 min', totalSec:600,  Ic:IcLeaf,   accent:'#3dffd1', done:true,  playPct:1.0  },
  { id:'a2', kind:'Resumen',          title:'Hábitos Atómicos',        dur:'18 min', totalSec:1080, Ic:IcBook,   accent:'#7dffe0', done:false, playing:true, playPct:0.38 },
  { id:'a3', kind:'Desafío · Día 3', title:'Meditación de 7 días',   dur:'12 min', totalSec:720,  Ic:IcTarget, accent:'#a8ffec', done:false },
  { id:'a4', kind:'Journaling',       title:'Escribe tu gratitud',    dur:'5 min',  totalSec:300,  Ic:IcEdit,   accent:'#3dffd1', done:false },
  { id:'a5', kind:'Lección',          title:'La mente del enfoque',   dur:'8 min',  totalSec:480,  Ic:IcBrain,  accent:'#7dffe0', done:false },
];

// ── Waveform ──────────────────────────────────────────────────────────────────
function Waveform({ accent = 'var(--neon)', bars = 4, h = 14 }) {
  const SCALE = [0.65, 1.0, 0.55, 0.85, 0.75, 0.9, 0.6];
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:2.5, height:h + 2, flexShrink:0 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} style={{
          width:3, borderRadius:999, background:accent,
          height: Math.round(SCALE[i % SCALE.length] * h),
          transformOrigin:'bottom',
          animation:`mtxWave${i % 3} ${0.7 + i * 0.12}s ease-in-out ${i * 0.1}s infinite alternate`,
          boxShadow:`0 0 4px ${accent}77`,
        }}/>
      ))}
      <style>{`
        @keyframes mtxWave0 { from { transform:scaleY(0.35); } to { transform:scaleY(1); } }
        @keyframes mtxWave1 { from { transform:scaleY(0.45); } to { transform:scaleY(1); } }
        @keyframes mtxWave2 { from { transform:scaleY(0.25); } to { transform:scaleY(1); } }
      `}</style>
    </div>
  );
}

// ── NowPlayingScreen ──────────────────────────────────────────────────────────
function NowPlayingScreen({ activity, onClose }) {
  const [isPlaying,  setIsPlaying]  = React.useState(true);
  const [progress,   setProgress]   = React.useState(activity?.playPct ?? 0.38);
  const [dragY,      setDragY]      = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const progressBarRef = React.useRef(null);
  const dragStartY     = React.useRef(0);
  const dragActiveRef  = React.useRef(false);

  React.useEffect(() => {
    if (!isPlaying || !activity) return;
    const id = setInterval(() => {
      setProgress(p => Math.min(1, p + 1 / (activity.totalSec ?? 600)));
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying, activity]);

  const onHandleDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartY.current  = e.clientY;
    dragActiveRef.current = true;
    setIsDragging(true);
  };
  const onHandleMove = (e) => {
    if (!dragActiveRef.current) return;
    setDragY(Math.max(0, e.clientY - dragStartY.current));
  };
  const onHandleUp = () => {
    dragActiveRef.current = false;
    setIsDragging(false);
    if (dragY > 110) { onClose(); return; }
    setDragY(0);
  };

  const onSeek = (e) => {
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (!rect) return;
    setProgress(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  const skip = (sec) => {
    const tot = activity?.totalSec ?? 600;
    setProgress(p => Math.max(0, Math.min(1, p + sec / tot)));
  };

  if (!activity) return null;

  const tot    = activity.totalSec ?? 600;
  const curSec = Math.round(progress * tot);
  const fmt    = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:200,
      background:'radial-gradient(80% 50% at 50% 0%, rgba(61,255,209,0.05), transparent 60%), #050706',
      transform:`translateY(${dragY}px)`,
      transition: isDragging ? 'none' : 'transform .4s cubic-bezier(.25,.8,.25,1)',
      animation:'mtxNowSlide .4s cubic-bezier(.25,.8,.25,1) both',
      display:'flex', flexDirection:'column',
      willChange:'transform',
    }}>
      <style>{`@keyframes mtxNowSlide { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

      {/* Drag handle */}
      <div
        style={{ paddingTop:14, display:'flex', flexDirection:'column', alignItems:'center', cursor:'grab', touchAction:'none' }}
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
      >
        <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.2)', marginBottom:14 }}/>
        <div style={{ width:'100%', display:'flex', alignItems:'center', padding:'0 16px 10px', justifyContent:'space-between' }}>
          <button onClick={onClose} className="mtx-tap" style={{
            width:36, height:36, borderRadius:999, border:0,
            background:'rgba(255,255,255,0.06)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', cursor:'pointer',
          }}>
            <IcChevD size={20} stroke="currentColor"/>
          </button>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'var(--ink-3)', textTransform:'uppercase' }}>
            {activity.kind}
          </div>
          <div style={{ width:36 }}/>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 36px' }}>
        {/* Cover */}
        <div style={{
          width:210, height:210, borderRadius:30, marginBottom:32,
          background:'radial-gradient(55% 70% at 38% 28%, rgba(61,255,209,0.18), rgba(61,255,209,0.04))',
          border:'1px solid rgba(61,255,209,0.18)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 28px 72px -16px rgba(61,255,209,0.28), 0 0 0 1px rgba(61,255,209,0.1)',
          position:'relative',
        }}>
          <div style={{
            position:'absolute', bottom:-50, left:'50%', transform:'translateX(-50%)',
            width:160, height:50,
            background:'radial-gradient(50% 100% at 50% 0%, rgba(61,255,209,0.22), transparent)',
            filter:'blur(18px)', pointerEvents:'none',
          }}/>
          <activity.Ic size={68} stroke="var(--neon)" strokeWidth={1.2}/>
        </div>

        {/* Title */}
        <div style={{ textAlign:'center', marginBottom:28, width:'100%' }}>
          <div style={{ fontSize:22, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', lineHeight:1.2, marginBottom:6 }}>
            {activity.title}
          </div>
          <div style={{ fontSize:13, color:'var(--ink-3)' }}>{activity.kind} · {activity.dur}</div>
        </div>

        {/* Progress bar */}
        <div style={{ width:'100%', marginBottom:6 }}>
          <div ref={progressBarRef} onClick={onSeek} style={{
            height:4, borderRadius:999, background:'rgba(255,255,255,0.1)', cursor:'pointer', position:'relative',
          }}>
            <div style={{
              width:`${Math.round(progress * 100)}%`, height:'100%', borderRadius:999,
              background:'linear-gradient(90deg, var(--neon-deep, #1ad9ad), var(--neon))',
              boxShadow:'0 0 12px var(--neon)', position:'relative',
            }}>
              <div style={{
                position:'absolute', right:-6, top:'50%', transform:'translateY(-50%)',
                width:12, height:12, borderRadius:999, background:'var(--neon)', boxShadow:'0 0 8px var(--neon)',
              }}/>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:11, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
            <span>{fmt(curSec)}</span>
            <span>{fmt(tot)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', gap:28, marginTop:12 }}>
          <button onClick={() => skip(-15)} className="mtx-tap" style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            background:'none', border:0, cursor:'pointer', color:'var(--ink-2)',
          }}>
            <IcChevL size={30} stroke="currentColor" strokeWidth={1.8}/>
            <span style={{ fontSize:9, fontWeight:700, color:'var(--ink-3)', letterSpacing:'0.04em' }}>15s</span>
          </button>

          <button onClick={() => setIsPlaying(p => !p)} className="mtx-tap" style={{
            width:74, height:74, borderRadius:999, border:0, cursor:'pointer', color:'#0a1410',
            background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 0 1px rgba(61,255,209,0.4),0 0 44px rgba(61,255,209,0.5),inset 0 1px 0 rgba(255,255,255,0.4)',
            flexShrink:0,
          }}>
            {isPlaying
              ? <IcPause size={28} stroke="currentColor" strokeWidth={2.2}/>
              : <IcPlay  size={26} stroke="currentColor" strokeWidth={2}/>
            }
          </button>

          <button onClick={() => skip(15)} className="mtx-tap" style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            background:'none', border:0, cursor:'pointer', color:'var(--ink-2)',
          }}>
            <IcChevR size={30} stroke="currentColor" strokeWidth={1.8}/>
            <span style={{ fontSize:9, fontWeight:700, color:'var(--ink-3)', letterSpacing:'0.04em' }}>15s</span>
          </button>
        </div>
      </div>

      <div style={{ height:40 }}/>
    </div>
  );
}

// ── ActivityRow ───────────────────────────────────────────────────────────────
function ActivityRow({ a, onOpenPlayer, onRemove }) {
  const handleRemove = onRemove ? (e) => {
    e.stopPropagation();
    onRemove();
  } : null;
  return (
    <div className="mtx-glass mtx-tap" style={{
      display:'flex', alignItems:'center', gap:12, padding:14,
      borderRadius:18, position:'relative', overflow:'hidden',
      opacity: a.done ? 0.5 : 1,
      transition:'transform .25s ease, box-shadow .3s ease',
      cursor: a.playing ? 'pointer' : 'default',
      ...(a.playing ? {
        borderColor:'rgba(61,255,209,0.35)',
        background:'linear-gradient(180deg,rgba(61,255,209,0.08),rgba(61,255,209,0.01))',
        boxShadow:'0 0 0 1px rgba(61,255,209,0.18),0 12px 32px -10px rgba(61,255,209,0.5),inset 0 0 24px rgba(61,255,209,0.08)',
        transform:'translateY(-1px)',
      } : {}),
      ...(a.fromExplore ? {
        borderColor:`${a.accent}40`,
        background:`linear-gradient(180deg, ${a.accent}0c, ${a.accent}02)`,
      } : {}),
    }}
    onClick={a.playing ? onOpenPlayer : undefined}
    role={a.playing ? 'button' : undefined}
    tabIndex={a.playing ? 0 : undefined}
    onKeyDown={a.playing ? (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenPlayer?.(); }
    } : undefined}
    >
      {a.playing && (
        <div style={{
          position:'absolute', bottom:0, left:0,
          width:`${Math.round((a.playPct || 0) * 100)}%`,
          height:3, background:'var(--neon)',
          boxShadow:'0 0 8px var(--neon)', borderRadius:'0 999px 999px 0',
        }}/>
      )}

      <div style={{
        width:40, height:40, borderRadius:12, flexShrink:0,
        background: a.fromExplore && a.cover
          ? `url(${a.cover}) center/cover`
          : (a.done ? 'rgba(61,255,209,0.15)' : 'rgba(255,255,255,0.04)'),
        border: a.fromExplore ? `0.5px solid ${a.accent}55` : '0',
        display:'flex', alignItems:'center', justifyContent:'center',
        color: a.done ? 'var(--neon)' : 'var(--ink-1)',
        position:'relative', overflow:'hidden',
      }}>
        {a.fromExplore && a.cover ? (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.18)' }}/>
        ) : null}
        {a.done
          ? <IcCheck size={20} stroke="currentColor" strokeWidth={2.5}/>
          : (a.fromExplore && a.cover ? null : <a.Ic size={18} stroke="currentColor"/>)
        }
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2,
                      color: a.playing ? 'var(--neon)' : (a.fromExplore ? a.accent : 'var(--ink-3)') }}>
          {a.kind}{a.playing && ' · ahora'}{a.fromExplore && !a.playing && ' · agendado'}
        </div>
        <div style={{ fontSize:14, fontWeight:600, color:'var(--ink-1)', textDecoration: a.done ? 'line-through' : 'none',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {a.title}
        </div>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>{a.dur}</div>
      </div>

      {a.playing ? (
        <Waveform bars={4} h={14} accent="var(--neon)"/>
      ) : a.fromExplore && handleRemove ? (
        <button onClick={handleRemove} aria-label="Quitar del ritual" className="mtx-tap" style={{
          width:32, height:32, borderRadius:999, border:0, flexShrink:0,
          background:'rgba(255,255,255,0.04)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', color:'var(--ink-3)',
          transition:'background .15s, color .15s',
        }}>
          <IcClose size={13} stroke="currentColor" strokeWidth={2}/>
        </button>
      ) : !a.done ? (
        <button className="mtx-tap" style={{
          width:40, height:40, borderRadius:999, border:0, flexShrink:0,
          background:'rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', color:'var(--ink-1)',
        }}>
          <IcPlay size={14} stroke="currentColor"/>
        </button>
      ) : null}
    </div>
  );
}

// ── Store global del descanso de apps ────────────────────────────────────────
// Patrón pubsub idéntico a __mtxPlayer / __mtxRitual / __mtxFollows. Vive en
// window porque el sheet del picker debe renderizarse a nivel del MentexApp
// (para que el position:absolute inset:0 cubra el device viewport, no el
// scroll completo de la página). La card que muestra el countdown vive en
// HomeActive y se sincroniza vía useAppsBreak().
const APPS_BREAK_OPTIONS = [5, 10, 15, 30];
const _APPS_BREAK_EVENT = 'mtx:apps-break-changed';

// IIFE para encapsular completamente el estado interno. Sin esto, Babel-standalone
// puede hoist-ar `let` → `var` al scope global y el `_state` del player y este
// terminan apuntando al mismo binding. Confirmado: el bug aparece como el get()
// de un store devolviendo campos de OTRO store. Lección: cualquier store global
// nuevo debe encapsularse en una IIFE en este proyecto.
(function() {
  if (typeof window === 'undefined' || window.__mtxAppsBreak) return;

  let state = {
    breakState: null,    // null = protegidas; { totalSec, secondsLeft } = pausa
    pickerOpen: false,
  };
  let intervalId = null;

  const emit = () => window.dispatchEvent(new CustomEvent(_APPS_BREAK_EVENT, { detail: { ...state } }));

  const stopInterval = () => {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
  };

  const startInterval = () => {
    stopInterval();
    intervalId = setInterval(() => {
      if (!state.breakState) { stopInterval(); return; }
      const next = state.breakState.secondsLeft - 1;
      if (next <= 0) {
        state = { ...state, breakState: null };
        stopInterval();
      } else {
        state = { ...state, breakState: { ...state.breakState, secondsLeft: next } };
      }
      emit();
    }, 1000);
  };

  window.__mtxAppsBreak = {
    get: () => ({ ...state }),
    openPicker:  () => { state = { ...state, pickerOpen: true  }; emit(); },
    closePicker: () => { state = { ...state, pickerOpen: false }; emit(); },
    pick: (minutes) => {
      const totalSec = Math.max(1, Math.floor(minutes * 60));
      state = { breakState: { totalSec, secondsLeft: totalSec }, pickerOpen: false };
      emit();
      startInterval();
    },
    stop: () => {
      stopInterval();
      state = { ...state, breakState: null };
      emit();
    },
  };
})();

function useAppsBreak() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const handler = () => force();
    window.addEventListener(_APPS_BREAK_EVENT, handler);
    return () => window.removeEventListener(_APPS_BREAK_EVENT, handler);
  }, []);
  return window.__mtxAppsBreak
    ? window.__mtxAppsBreak.get()
    : { breakState: null, pickerOpen: false };
}

// ── AppsProtectionCard ────────────────────────────────────────────────────────
// Card independiente para mostrar las apps bloqueadas y permitir un descanso
// CONTEXTUAL (las apps se desbloquean por X minutos sin parar la sesión).
// El countdown corre DENTRO de esta card — no en una pantalla fullscreen
// porque "descansar del aprendizaje" no tiene sentido en una app de aprendizaje.
function AppsProtectionCard({ blockedApps = [] }) {
  const { breakState } = useAppsBreak();
  const startBreakPicker = () => window.__mtxAppsBreak?.openPicker();
  const stopBreak = () => window.__mtxAppsBreak?.stop();

  const isOnBreak = !!breakState;
  const breakMin = isOnBreak ? Math.floor(breakState.secondsLeft / 60) : 0;
  const breakSs  = isOnBreak ? breakState.secondsLeft % 60 : 0;
  const breakStr = isOnBreak ? `${breakMin}:${String(breakSs).padStart(2,'0')}` : '';
  const breakPct = isOnBreak ? (breakState.totalSec - breakState.secondsLeft) / breakState.totalSec : 0;

  // Color de estado: neon = protegidas, ámbar = en pausa
  const accent = isOnBreak ? '#FFB347' : 'var(--neon)';
  const accentRaw = isOnBreak ? '255,179,71' : '61,255,209';

  return (
    <div style={{ padding:'0 20px 16px' }}>
      <div className="mtx-glass" style={{
        borderRadius:22, padding:'18px 18px 16px',
        background: isOnBreak
          ? 'radial-gradient(70% 100% at 50% 0%, rgba(255,179,71,0.06), transparent 60%), var(--glass-2)'
          : 'radial-gradient(70% 100% at 50% 0%, rgba(61,255,209,0.05), transparent 60%), var(--glass-2)',
        border: isOnBreak ? '0.5px solid rgba(255,179,71,0.25)' : '0.5px solid rgba(61,255,209,0.12)',
        position:'relative', overflow:'hidden',
        transition:'background .3s, border-color .3s',
      }}>
        {/* Header de estado */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
            <div style={{
              width:30, height:30, borderRadius:'50%',
              background: `rgba(${accentRaw},0.14)`,
              border: `0.5px solid rgba(${accentRaw},0.35)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color: accent, flexShrink:0,
            }}>
              {isOnBreak
                ? <IcPause size={13} stroke="currentColor" strokeWidth={2.4}/>
                : <IcShield size={14} stroke="currentColor" strokeWidth={2}/>
              }
            </div>
            <div style={{ minWidth:0 }}>
              <div className="mtx-eyebrow" style={{ fontSize:9, color: accent, marginBottom:2, letterSpacing:'0.14em' }}>
                {isOnBreak ? 'Pausa activa' : 'Protección activa'}
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--ink-1)', letterSpacing:'-0.01em' }}>
                {isOnBreak
                  ? <span style={{ fontVariantNumeric:'tabular-nums' }}>{breakStr} restantes</span>
                  : `${blockedApps.length} apps fuera de tu mente`}
              </div>
            </div>
          </div>

          {/* CTA contextual: en protección → "Tomar descanso"; en pausa → "Reanudar" */}
          {!isOnBreak ? (
            <button
              onClick={startBreakPicker}
              className="mtx-tap"
              style={{
                appearance:'none', cursor:'pointer', flexShrink:0,
                padding:'7px 12px', borderRadius:999,
                background:'rgba(255,255,255,0.05)',
                border:'0.5px solid rgba(255,255,255,0.1)',
                color:'var(--ink-2)',
                fontSize:11.5, fontWeight:600, letterSpacing:'-0.005em',
                fontFamily:'var(--ff-sans)',
                display:'inline-flex', alignItems:'center', gap:5,
                transition:'background .2s, color .2s, border-color .2s',
              }}
            >
              <IcPause size={11} stroke="currentColor" strokeWidth={2}/>
              Descanso
            </button>
          ) : (
            <button
              onClick={stopBreak}
              className="mtx-tap"
              aria-label="Reanudar protección"
              style={{
                appearance:'none', cursor:'pointer', flexShrink:0,
                padding:'7px 12px', borderRadius:999,
                background:`rgba(${accentRaw},0.16)`,
                border:`0.5px solid rgba(${accentRaw},0.4)`,
                color: accent,
                fontSize:11.5, fontWeight:700, letterSpacing:'-0.005em',
                fontFamily:'var(--ff-sans)',
                display:'inline-flex', alignItems:'center', gap:5,
              }}
            >
              <IcShield size={11} stroke="currentColor" strokeWidth={2}/>
              Reanudar
            </button>
          )}
        </div>

        {/* Progress bar de la pausa (solo cuando hay break) */}
        {isOnBreak && (
          <div style={{
            height:3, borderRadius:999, background:'rgba(255,255,255,0.05)',
            marginBottom:14, overflow:'hidden',
          }}>
            <div style={{
              width:`${breakPct * 100}%`, height:'100%',
              background: `linear-gradient(90deg, ${accent}, ${accent}aa)`,
              boxShadow: `0 0 8px ${accent}99`,
              transition:'width 1s linear',
            }}/>
          </div>
        )}

        {/* Lista compacta de apps con icon + lock/unlock por estado */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {APPS.filter(a => blockedApps.includes(a.id)).slice(0, 6).map(app => (
            <div key={app.id} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'5px 10px 5px 5px', borderRadius:999,
              background:'rgba(255,255,255,0.04)',
              border:'0.5px solid rgba(255,255,255,0.06)',
              fontSize:11, color: isOnBreak ? 'rgba(255,255,255,0.45)' : 'var(--ink-2)',
              opacity: isOnBreak ? 0.7 : 1,
              transition:'opacity .3s, color .3s',
            }}>
              <app.Icon size={20}/>
              {app.name}
              {isOnBreak
                ? <IcUnlock size={9} stroke={accent} strokeWidth={1.8}/>
                : <IcLock   size={9} stroke="var(--neon)" strokeWidth={1.8}/>
              }
            </div>
          ))}
        </div>
      </div>
      {/* El sheet del picker se monta a nivel del MentexApp (no aquí) para
          que su position:absolute cubra el device viewport, no el scroll
          completo. Ver AppsBreakPickerSheet en Mentex Home.html. */}
    </div>
  );
}

// Mini sheet (bottom) para elegir minutos de descanso de apps. Patrón anclado
// al device viewport, idéntico al de BreakPickerSheet pero compacto.
// Usa el store global __mtxAppsBreak — abre/pick lo controlan handlers globales.
function AppsBreakPickerSheet() {
  const { pickerOpen } = useAppsBreak();
  if (!pickerOpen) return null;
  return <_AppsBreakPickerImpl
    onClose={() => window.__mtxAppsBreak?.closePicker()}
    onPick={(min) => window.__mtxAppsBreak?.pick(min)}
  />;
}

function _AppsBreakPickerImpl({ onClose, onPick }) {
  const [picked, setPicked] = React.useState(5);
  const [dragY, setDragY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStart = React.useRef(0);
  const dragActive = React.useRef(false);

  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = e.clientY;
    dragActive.current = true;
    setIsDragging(true);
  };
  const onMove = (e) => {
    if (!dragActive.current) return;
    setDragY(Math.max(0, e.clientY - dragStart.current));
  };
  const onUp = () => {
    dragActive.current = false;
    setIsDragging(false);
    if (dragY > 80) onClose();
    else setDragY(0);
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:80,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.55)',
      backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.96), rgba(15,19,18,0.98))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%',
        paddingBottom:32,
        boxShadow:'0 -20px 60px -12px rgba(0,0,0,0.6)',
        transform:`translateY(${dragY}px)`,
        transition: isDragging ? 'none' : 'transform .35s cubic-bezier(.25,.8,.25,1)',
        animation:'mtxAppsBreakUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <style>{`@keyframes mtxAppsBreakUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          style={{ display:'flex', justifyContent:'center', paddingTop:14, paddingBottom:10, cursor:'grab', touchAction:'none' }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>
        <div style={{ padding:'4px 24px 18px' }}>
          <div className="mtx-eyebrow" style={{ fontSize:9, color:'#FFB347', marginBottom:6, letterSpacing:'0.14em' }}>
            Descanso de apps
          </div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em' }}>
            Desbloquea por unos minutos
          </h2>
          <p style={{ margin:'6px 0 0', fontSize:12.5, color:'var(--ink-3)', lineHeight:1.5 }}>
            Tu sesión sigue corriendo. Cuando termine el descanso, las apps vuelven a bloquearse solas.
          </p>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', padding:'0 20px', marginBottom:18 }}>
          {APPS_BREAK_OPTIONS.map(m => {
            const active = picked === m;
            return (
              <button key={m} onClick={() => setPicked(m)} className="mtx-tap" style={{
                height:44, minWidth:64, padding:'0 16px', borderRadius:14, cursor:'pointer',
                border: active ? '0.5px solid rgba(255,179,71,0.55)' : '0.5px solid var(--glass-stroke)',
                background: active ? 'linear-gradient(180deg, rgba(255,179,71,0.18), rgba(255,179,71,0.06))' : 'rgba(255,255,255,0.04)',
                color: active ? '#FFB347' : 'var(--ink-1)',
                fontSize:14, fontWeight:600, fontFamily:'var(--ff-sans)',
                boxShadow: active ? '0 0 0 1px rgba(255,179,71,0.25), 0 6px 20px -8px rgba(255,179,71,0.5)' : 'none',
                transform: active ? 'translateY(-1px)' : 'translateY(0)',
                transition:'transform .2s, box-shadow .25s, background .2s, border-color .2s',
              }}>
                {m} min
              </button>
            );
          })}
        </div>
        <div style={{ padding:'0 20px' }}>
          <button onClick={() => onPick(picked)} className="mtx-tap" style={{
            width:'100%', height:52, borderRadius:16, border:0, cursor:'pointer',
            background:'linear-gradient(180deg, #FFC56B 0%, #FF9F40 100%)',
            color:'#1a0f00', fontSize:14.5, fontWeight:700, fontFamily:'var(--ff-sans)',
            letterSpacing:'-0.01em',
            boxShadow:'0 0 0 1px rgba(255,179,71,0.4), 0 12px 32px -8px rgba(255,159,64,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            <IcUnlock size={15} stroke="currentColor" strokeWidth={2.4}/>
            Desbloquear por {picked} min
          </button>
        </div>
      </div>
    </div>
  );
}

// ── HomeActive ────────────────────────────────────────────────────────────────
function HomeActive({ tweaks, onNotif = () => {}, notifCount = 0, blockedApps = [], onOpenPlayer = () => {} }) {
  const [seconds,  setSeconds]  = React.useState(45 * 60 - 13 * 60);
  const ritualExtras = (window.useRitualItems ? window.useRitualItems() : []);

  React.useEffect(() => {
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const total   = 45 * 60;
  const elapsed = total - seconds;
  const pct     = elapsed / total;
  const R = 96, C = 2 * Math.PI * R;

  const elMin = Math.floor(elapsed / 60);
  const elSs  = elapsed % 60;
  const elStr = `${elMin}:${String(elSs).padStart(2, '0')}`;

  const mm  = Math.floor(seconds / 60);
  const ss  = seconds % 60;
  const rem = `${mm}:${String(ss).padStart(2, '0')}`;

  const headerText =
    elMin === 0  ? 'Aquí y ahora.'     :
    elMin < 5    ? 'Empezaste. Sigue.' :
    elMin < 15   ? 'Estás en la zona.' :
    elMin < 30   ? 'El foco es tuyo.'  :
                   'Dominas tu mente.';

  return (
    <div style={{ paddingTop:60, paddingBottom:160, animation:'mtx-fade-up .4s ease both' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ padding:'8px 20px 12px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ flex:1 }}>
          <div className="mtx-eyebrow" style={{ marginBottom:6, color:'var(--neon)', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{
              width:6, height:6, borderRadius:999, background:'var(--neon)',
              boxShadow:'0 0 10px var(--neon-glow)',
              animation:'mtx-pulse 2s ease-in-out infinite', flexShrink:0,
            }}/>
            Sesión activa
          </div>
          <h1 className="mtx-h-1" style={{ margin:0, color:'var(--ink-1)', fontSize:26, fontWeight:800, letterSpacing:'-0.03em' }}>
            {headerText}
          </h1>
          <p style={{ margin:'6px 0 0', fontSize:13, color:'var(--ink-3)' }}>
            El ruido está fuera. Tu mente, dentro.
          </p>
        </div>
        <button onClick={onNotif} aria-label="Notificaciones" className="mtx-tap" style={{
          position:'relative', width:44, height:44, borderRadius:999,
          background:'var(--glass-2)', border:'0.5px solid var(--glass-stroke)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--ink-1)', cursor:'pointer', flexShrink:0,
        }}>
          <IcBell size={20} stroke="var(--ink-1)"/>
          {notifCount > 0 && (
            <span style={{
              position:'absolute', top:1, right:1,
              width:18, height:18, padding:0,
              borderRadius:999, background:'var(--neon)',
              color:'#0a1410', fontSize:10, fontWeight:700,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 0 10px var(--neon-glow)', border:'1.5px solid #0a0d0a',
              lineHeight:1, fontVariantNumeric:'tabular-nums',
            }}>{notifCount > 9 ? '9+' : notifCount}</span>
          )}
        </button>
      </div>

      {/* ── CARD 1 · Cronómetro (sin apps adentro) ─────────────────────── */}
      <div style={{ padding:'0 20px 16px' }}>
        <div className="mtx-glass" style={{
          borderRadius:28, padding:'24px 20px 20px',
          display:'flex', flexDirection:'column', alignItems:'center',
          background:'radial-gradient(70% 80% at 50% 0%, rgba(61,255,209,0.07), transparent 60%), var(--glass-2)',
          borderColor:'rgba(61,255,209,0.12)',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{
            position:'absolute', top:-50, left:'50%', transform:'translateX(-50%)',
            width:260, height:90, borderRadius:'50%',
            background:'radial-gradient(60% 100% at 50% 50%, rgba(61,255,209,0.16), transparent 70%)',
            pointerEvents:'none', filter:'blur(24px)',
          }}/>

          <div style={{ position:'relative', width:216, height:216 }}>
            <svg width="216" height="216" viewBox="0 0 216 216" style={{ transform:'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="ha-grad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#6affd9"/>
                  <stop offset="1" stopColor="#1ad9ad"/>
                </linearGradient>
                <filter id="ha-glow">
                  <feGaussianBlur stdDeviation="2.5"/>
                  <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <circle cx="108" cy="108" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
              <circle cx="108" cy="108" r={R} fill="none"
                      stroke="url(#ha-grad)" strokeWidth="3.5" strokeLinecap="round"
                      strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
                      filter="url(#ha-glow)"/>
              {Array.from({ length: 48 }).map((_, i) => {
                const a  = (i / 48) * Math.PI * 2;
                const r1 = 100, r2 = i % 4 === 0 ? 107 : 104;
                return (
                  <line key={i}
                    x1={108 + Math.cos(a) * r1} y1={108 + Math.sin(a) * r1}
                    x2={108 + Math.cos(a) * r2} y2={108 + Math.sin(a) * r2}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={i % 4 === 0 ? 1 : 0.5}/>
                );
              })}
            </svg>

            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--neon)', marginBottom:2 }}>
                Recuperaste
              </div>
              <div style={{
                fontSize:52, fontWeight:600, lineHeight:1, letterSpacing:'-0.04em',
                color:'var(--ink-1)', fontVariantNumeric:'tabular-nums',
                fontFamily:'var(--ff-display)',
              }}>
                {elStr}
              </div>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:4 }}>
                quedan {rem}
              </div>
            </div>
          </div>

          <div style={{ marginTop:6, fontSize:12, color:'var(--ink-3)', textAlign:'center' }}>
            de {Math.floor(total / 60)} min · {elMin === 0 ? 'Recién empezaste' : `${elMin} min de claridad`}
          </div>
        </div>
      </div>

      {/* ── CARD 2 · Apps protegidas (con descanso contextual) ─────────── */}
      <AppsProtectionCard blockedApps={blockedApps}/>

      {/* ── CARD 3 · Ritual de hoy (actividades) ───────────────────────── */}
      <div style={{ marginBottom:24 }}>
        <MtxSectionHead
          title="Tu ritual de hoy"
          eyebrow={(() => {
            const total = ACTIVITIES.length + ritualExtras.length;
            const done = ACTIVITIES.filter(a => a.done).length;
            return `${done} de ${total} completadas`;
          })()}
        />
        <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'0 20px' }}>
          {ACTIVITIES.map(a => (
            <ActivityRow key={a.id} a={a} onOpenPlayer={onOpenPlayer}/>
          ))}
          {ritualExtras.map(extra => (
            <ActivityRow
              key={extra.id}
              a={_extraToActivity(extra)}
              onOpenPlayer={onOpenPlayer}
              onRemove={() => window.__mtxRitual?.remove(extra.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Convert a ritual extra (saved from Explore) into an ActivityRow-compatible shape
function _extraToActivity(extra) {
  const iconByKind = {
    'Audiolibros':  IcBook,
    'Meditaciones': IcLeaf,
    'Series':       IcTarget,
    'Charlas':      IcMic,
    'Sonidos':      IcWind,
  };
  return {
    id: extra.id,
    kind: extra.kind || 'Contenido',
    title: extra.title,
    dur: extra.dur,
    totalSec: extra.totalSec || 600,
    Ic: iconByKind[extra.kind] || IcSpark,
    accent: extra.accent || '#3dffd1',
    done: false,
    fromExplore: true,
    cover: extra.cover,
  };
}

Object.assign(window, {
  HomeActive, NowPlayingScreen, ACTIVITIES,
  AppsProtectionCard, AppsBreakPickerSheet, useAppsBreak,
});
