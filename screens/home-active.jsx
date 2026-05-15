// home-active.jsx — Sesión de enfoque activa (v5)

// ── Session Whisper — bubble del coach IA al inicio de sesión ──────────────
// Dos variantes por voz: empty (sin ritual/recordatorios) y with (con contenido).
// Anti-spam via prop sessionStartedAt: cada click en "Comenzar" genera un nuevo
// timestamp → el useEffect se dispara, sin depender de sessionStorage.
const _ACTIVE_WHISPER_MAP = {
  warm: {
    empty: (n)    => ({ msg: `${n ? n + ', tu' : 'Tu'} sesión acaba de empezar sin complementos ni recordatorios. ¿Quieres que te ayude a configurar tu ritual del día para sacar el máximo de este tiempo?`, cta: 'Configurar mi ritual' }),
    with:  (n, c) => ({ msg: `${n ? n + ', tienes' : 'Tienes'} ${c} ${c === 1 ? 'elemento' : 'elementos'} en tu ritual de hoy. ¿Te ayudo a repartirlos durante la sesión para aprovecharlos bien?`, cta: 'Organizar mi ritual' }),
  },
  energetic: {
    empty: (n)    => ({ msg: `¡Sesión activa${n ? ', ' + n : ''}! Sin complementos todavía — ¿sumamos algunos para hacerla épica?`, cta: 'Armar mi ritual' }),
    with:  (n, c) => ({ msg: `¡${c} ${c === 1 ? 'elemento' : 'elementos'} en tu ritual${n ? ', ' + n : ''}! ¿Coordinamos cómo distribuirlos para que no quede nada fuera?`, cta: 'Coordinar mi ritual' }),
  },
  contemplative: {
    empty: (n)    => ({ msg: `Tu sesión ya empezó${n ? ', ' + n : ''}. Sin complementos todavía — ¿agendamos algunos para darle más profundidad a este tiempo?`, cta: 'Configurar con intención' }),
    with:  (n, c) => ({ msg: `Tienes ${c} ${c === 1 ? 'elemento' : 'elementos'} esperando${n ? ', ' + n : ''}. ¿Los distribuimos con intención a lo largo de la sesión?`, cta: 'Distribuir con intención' }),
  },
  wise: {
    empty: (n)    => ({ msg: `Cada minuto tiene potencial${n ? ', ' + n : ''}. Aún no tienes complementos — ¿agendamos algunos para este tiempo?`, cta: 'Agendar mi ritual' }),
    with:  (n, c) => ({ msg: `${c} ${c === 1 ? 'elemento' : 'elementos'} en tu ritual${n ? ', ' + n : ''}. ¿Te ayudo a agendar un espacio para cada uno durante la sesión?`, cta: 'Agendar mis elementos' }),
  },
};
function _coachActiveWhisperMessage(coachVoice, firstName, ritualCount, remindersPending) {
  const voice = _ACTIVE_WHISPER_MAP[coachVoice] || _ACTIVE_WHISPER_MAP.warm;
  const total = (ritualCount || 0) + (remindersPending || 0);
  return total > 0 ? voice.with(firstName || '', total) : voice.empty(firstName || '');
}

// Cada activity declara cómo se reproduce:
//   - exploreId  : abre VideoSheet → VideoPlayerFullscreen del global player.
//   - runnerType : 'timer' → abre ActivityRunner (Fase C, sin contenido,
//                  sólo countdown guiado).
//   - sin nada   : toast "próximamente" (reservado para Fase D — actividades
//                  con input como journaling/gratitud).
//
// runnerKind ('breath' | 'silence' | 'movement' | 'focus') escoge el set de
// mensajes alternantes y meta visual que muestra el ActivityRunner.
// Activities base del Home activo. Mapeo 1:1 con DEFAULT_ROUTINES vía
// `routineId` — HomeActive filtra por state.routines (selección del
// HomeInactive) y muestra solo las activities seleccionadas.
//
// Cada activity lleva metricType + metricValue + metricUnit alineados
// con su rutina default. El runner enruta al body correcto según
// metricType (Duration/Counter/Binary/Distance).
//
// Activities con runnerType:'timer' van al ActivityRunner. Activities
// con sólo exploreId (sin runnerType) van al player de Explorar — útil
// cuando user agrega contenido de Explorar al ritual via __mtxRitual.add.
const ACTIVITIES = [
  { id:'a-meditate',    routineId:'meditate',    kind:'Meditación',    title:'Respira y vuelve a ti',     dur:'10 min',   Ic:IcLeaf,     accent:'#3DFFD1', done:false,
    runnerType:'timer', metricType:'duration', metricValue:10, metricUnit:'min',
    runnerKind:'silence', runnerDurationSec:600, runnerLabel:'Diez minutos para volver a ti.' },
  { id:'a-read',        routineId:'read',        kind:'Lectura',        title:'Lectura del día',           dur:'20 pp',    Ic:IcBook,     accent:'#3DFFD1', done:false,
    runnerType:'timer', metricType:'pages', metricValue:20, metricUnit:'pp',
    runnerLabel:'Una página a la vez.' },
  { id:'a-study',       routineId:'study',       kind:'Estudio',        title:'Sesión de estudio',         dur:'45 min',   Ic:IcBrain,    accent:'#9B8AFF', done:false,
    runnerType:'timer', metricType:'duration', metricValue:45, metricUnit:'min',
    runnerKind:'focus', runnerDurationSec:2700, runnerLabel:'Atención profunda durante cuarenta y cinco minutos.' },
  { id:'a-breathe',     routineId:'breathe',     kind:'Respiración',   title:'Respira profundo',           dur:'5 min',    Ic:IcWind,     accent:'#5EC3FF', done:false,
    runnerType:'timer', metricType:'duration', metricValue:5,  metricUnit:'min',
    runnerKind:'breath',  runnerDurationSec:300,  runnerLabel:'Vuelve a tu cuerpo en cinco minutos.' },
  { id:'a-gratitude',   routineId:'gratitude',   kind:'Gratitud',       title:'Escribe tu gratitud',       dur:'3 veces',  Ic:IcHeart,    accent:'#3DFFD1', done:false,
    runnerType:'timer', metricType:'count', metricValue:3, metricUnit:'veces',
    runnerLabel:'Tres motivos para agradecer hoy.' },
  { id:'a-train',       routineId:'train',       kind:'Entrenar',       title:'Movimiento consciente',     dur:'30 min',   Ic:IcDumbbell, accent:'#9B8AFF', done:false,
    runnerType:'timer', metricType:'duration', metricValue:30, metricUnit:'min',
    runnerKind:'movement', runnerDurationSec:1800, runnerLabel:'Treinta minutos de presencia.' },
  { id:'a-journal',     routineId:'journal',     kind:'Journaling',     title:'Escribe tu día',            dur:'15 min',   Ic:IcEdit,     accent:'#5EC3FF', done:false,
    runnerType:'timer', metricType:'duration', metricValue:15, metricUnit:'min',
    runnerKind:'silence', runnerDurationSec:900,  runnerLabel:'Quince minutos para poner ideas en palabras.' },
  { id:'a-visualize',   routineId:'visualize',   kind:'Visualización', title:'Visualiza tu día',           dur:'8 min',    Ic:IcEye,      accent:'#9B8AFF', done:false,
    runnerType:'timer', metricType:'duration', metricValue:8,  metricUnit:'min',
    runnerKind:'silence', runnerDurationSec:480,  runnerLabel:'Imagina, sostén, suelta.' },
  { id:'a-walk',        routineId:'walk',        kind:'Cardio',         title:'Caminata del día',          dur:'3 km',     Ic:IcTarget,   accent:'#5EC3FF', done:false,
    runnerType:'timer', metricType:'distance', metricValue:3, metricUnit:'km',
    runnerLabel:'Tres kilómetros a tu ritmo.' },
  { id:'a-supplements', routineId:'supplements', kind:'Hábito',         title:'Tomé mis suplementos',      dur:'Hecho',    Ic:IcSpark,    accent:'#9B8AFF', done:false,
    runnerType:'timer', metricType:'binary', metricValue:0, metricUnit:'',
    runnerLabel:'Confirma cuando los hayas tomado hoy.' },
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
          willChange:'transform',
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
            position:'absolute', bottom:-50, left:'50%', transform:'translateX(-50%) translateZ(0)',
            width:160, height:50,
            background:'radial-gradient(50% 100% at 50% 0%, rgba(61,255,209,0.22), transparent)',
            filter:'blur(18px)', pointerEvents:'none',
            willChange:'transform',
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

// ── ActivityRow helpers ───────────────────────────────────────────────────────
function _formatScheduledTime(time) {
  if (!time) return null;
  var parts = time.split(':');
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var period = h >= 12 ? 'pm' : 'am';
  var h12 = h % 12 || 12;
  var mStr = m < 10 ? '0' + m : '' + m;
  return 'Hoy a las ' + h12 + ':' + mStr + ' ' + period;
}

// ── ActivityRow ───────────────────────────────────────────────────────────────
// Tap en cualquier activity NO completada abre el reproductor:
//   - Si la activity está en reproducción ("ahora") → atajo directo al
//     VideoPlayerFullscreen (resuelve el item de Explorar y lo abre).
//   - Si la activity está pendiente → abre VideoSheet de detalle primero.
//   - Si la activity NO tiene contenido en Explorar (ej. journaling, gratitud)
//     → toast "próximamente" (Fase C/D habilitará ActivityRunner).
// onRemove eliminado intencionalmente (2026-05-14): los items fromExplore
// agregados desde HomeInactive ya no muestran un botón ✕ inline para
// "Quitar del ritual" — esa acción ahora vive en el ContentDetailScreen
// (botón "✓ Agendado" hace toggle desagendar). Esto da consistencia visual
// con las activities normales del ritual, que siempre muestran botón Play
// al frente.
function ActivityRow({ a, onOpenPlayer }) {
  // Hora asignada por el agente IA — null si no hay hora programada
  const _useScheduledTime = (typeof window !== 'undefined' && window.useScheduledTime) || (() => null);
  const scheduledTime = _useScheduledTime(a.id);

  // Progreso parcial del runner — la bola del play en el botón derecho
  // se va llenando con accent según completionPct. Si el user salió del
  // runner sin completar, queda visualmente reflejado aquí.
  const _useRunnerProgress = (typeof window !== 'undefined' && window.useRunnerProgress) || (() => null);
  const runnerProgress = _useRunnerProgress(a.id);
  const partialPct = (runnerProgress && typeof runnerProgress.completionPct === 'number')
    ? Math.max(0, Math.min(1, runnerProgress.completionPct)) : 0;

  // Completed today — cuando el runner alcanza 100% (auto-complete o
  // markComplete), __mtxRunnerCompleted.mark(a.id) hace que esta hook
  // retorne true. La activity entera pasa a "done" visualmente
  // (opacity, chulito ✓, line-through) PERO sigue siendo clickeable —
  // el usuario puede reabrir para revisar, devolverse o reiniciar. El
  // body restaura el state como "completado" y permite modificarlo;
  // bajar del target unmark automáticamente.
  const _useRunnerCompleted = (typeof window !== 'undefined' && window.useRunnerCompleted) || (() => false);
  const completedToday = _useRunnerCompleted(a.id);
  const effectiveDone = a.done || completedToday;

  // Siempre clickeable — incluyendo activities done. El styling visual
  // (opacity, chulito ✓) sigue reflejando el estado completado, pero el
  // tap reabre el runner para que el usuario pueda corregir errores.
  const handleActivate = () => {
    // Si había notificación programada, cancelarla — el usuario inicia ahora.
    if (scheduledTime && typeof window !== 'undefined' && window.__mtxScheduler) {
      window.__mtxScheduler.cancel(a.id);
    }
    if (a.playing && typeof window !== 'undefined') {
      // Atajo: si está en reproducción, salta directo al fullscreen.
      const item = window._resolveActivityToExploreItem
        ? window._resolveActivityToExploreItem(a)
        : null;
      if (item) {
        window.__mtxRitualPlayer?.openPlayer(item);
        return;
      }
    }
    // Default: abre VideoSheet de detalle (o toast si no hay contenido)
    if (typeof window !== 'undefined' && window.openRitualActivity) {
      window.openRitualActivity(a);
    }
  };

  return (
    <div className="mtx-glass mtx-tap" style={{
      display:'flex', alignItems:'center', gap:12, padding:14,
      borderRadius:18, position:'relative', overflow:'hidden',
      opacity: effectiveDone ? 0.5 : 1,
      transition:'transform .25s ease, box-shadow .3s ease',
      cursor: 'pointer',
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
    onClick={handleActivate}
    role="button"
    tabIndex={0}
    aria-label={`Abrir ${a.title}`}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(); }
    }}
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
          : (effectiveDone ? 'rgba(61,255,209,0.15)' : 'rgba(255,255,255,0.04)'),
        border: a.fromExplore ? `0.5px solid ${a.accent}55` : '0',
        display:'flex', alignItems:'center', justifyContent:'center',
        color: effectiveDone ? 'var(--neon)' : 'var(--ink-1)',
        position:'relative', overflow:'hidden',
      }}>
        {a.fromExplore && a.cover ? (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.18)' }}/>
        ) : null}
        {effectiveDone
          ? <IcCheck size={20} stroke="currentColor" strokeWidth={2.5}/>
          : (a.fromExplore && a.cover ? null : <a.Ic size={18} stroke="currentColor"/>)
        }
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2,
                      color: a.playing ? 'var(--neon)' : (a.fromExplore ? a.accent : 'var(--ink-3)') }}>
          {a.kind}{a.playing && ' · ahora'}{a.fromExplore && !a.playing && ' · agendado'}
        </div>
        <div style={{ fontSize:14, fontWeight:600, color:'var(--ink-1)', textDecoration: effectiveDone ? 'line-through' : 'none',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {a.title}
        </div>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2, display:'flex', alignItems:'center', gap:5 }}>
          <span>{a.dur}</span>
          {scheduledTime && <span style={{ opacity:0.35 }}>·</span>}
          {scheduledTime && (
            <span style={{ fontVariantNumeric:'tabular-nums' }}>
              {_formatScheduledTime(scheduledTime)}
            </span>
          )}
        </div>
      </div>

      {a.playing ? (
        <Waveform bars={4} h={14} accent="var(--neon)"/>
      ) : (
        // Botón con anillo SVG superpuesto al play/check.
        // Aplica a TODAS las activities, incluyendo fromExplore — la
        // desagendar live ahora en ContentDetailScreen (botón Agendado).
        //   • effectiveDone → ring lleno al 100% + IcCheck (revisable)
        //   • partialPct > 0 → ring al % cumplido + IcPlay (continuar)
        //   • sin progreso → ring invisible + IcPlay (empezar)
        // En todos los casos el tap reabre el runner — el usuario puede
        // corregir errores incluso después de completar.
        (() => {
          const SIZE = 40;
          const STROKE = 1.6;
          const R = (SIZE - STROKE) / 2;
          const C = 2 * Math.PI * R;
          const accent = a.accent || '#3dffd1';
          const ringPct = effectiveDone ? 1 : partialPct;
          const showRing = ringPct > 0;
          return (
            <div style={{ position:'relative', width:SIZE, height:SIZE, flexShrink:0 }}>
              {showRing && (
                <svg width={SIZE} height={SIZE} style={{ position:'absolute', inset:0, transform:'rotate(-90deg)', pointerEvents:'none' }}>
                  <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
                    stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE}/>
                  <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
                    stroke={accent} strokeWidth={STROKE} strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - ringPct)}
                    style={{
                      transition:'stroke-dashoffset .4s cubic-bezier(.34,1.56,.64,1)',
                      filter:`drop-shadow(0 0 4px ${accent}66)`,
                    }}/>
                </svg>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleActivate(); }}
                aria-label={effectiveDone
                  ? `Revisar ${a.title} · completado`
                  : `Reproducir ${a.title}${partialPct > 0 ? ` · ${Math.round(partialPct * 100)}% completado` : ''}`}
                className="mtx-tap"
                style={{
                  position:'absolute', inset:STROKE + 1,
                  borderRadius:999, border:0,
                  background: showRing ? `${accent}1a` : 'rgba(255,255,255,0.06)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer',
                  color: showRing ? accent : 'var(--ink-1)',
                  transition:'background .25s, color .25s',
                }}
              >
                {effectiveDone
                  ? <IcCheck size={14} stroke="currentColor" strokeWidth={2.6}/>
                  : <IcPlay size={14} stroke="currentColor"/>}
              </button>
            </div>
          );
        })()
      )}
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
    breakState: null,           // null = protegidas; { totalSec, secondsLeft } = pausa temporal
    pickerOpen: false,          // sheet abierto
    protectionDisabled: false,  // true cuando el usuario "finalizó la protección" — apps quedan libres hasta que retome
    confirmDisableOpen: false,  // modal de confirmación "¿soltar la mente al ruido?"
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
      state = { ...state, breakState: { totalSec, secondsLeft: totalSec }, pickerOpen: false, protectionDisabled: false };
      emit();
      startInterval();
    },
    stop: () => {
      stopInterval();
      state = { ...state, breakState: null };
      emit();
    },
    // Apaga la protección por completo (no es una pausa temporal, es desactivar).
    // Se cancelan los descansos activos y se cierra cualquier sheet/modal abierto.
    requestDisable: () => { state = { ...state, confirmDisableOpen: true, pickerOpen: false }; emit(); },
    cancelDisable:  () => { state = { ...state, confirmDisableOpen: false }; emit(); },
    confirmDisable: () => {
      stopInterval();
      state = { ...state, breakState: null, pickerOpen: false, confirmDisableOpen: false, protectionDisabled: true };
      emit();
    },
    // Retomar protección — vuelve al estado normal de apps bloqueadas.
    resume: () => { state = { ...state, protectionDisabled: false, breakState: null }; emit(); },
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
    : { breakState: null, pickerOpen: false, protectionDisabled: false, confirmDisableOpen: false };
}

// ── AppsProtectionCard ────────────────────────────────────────────────────────
// Card independiente para mostrar las apps bloqueadas y permitir un descanso
// CONTEXTUAL (las apps se desbloquean por X minutos sin parar la sesión).
// El countdown corre DENTRO de esta card — no en una pantalla fullscreen
// porque "descansar del aprendizaje" no tiene sentido en una app de aprendizaje.
function AppsProtectionCard({ blockedApps = [], onEditApps = () => {} }) {
  const { breakState, protectionDisabled } = useAppsBreak();
  const startBreakPicker = () => window.__mtxAppsBreak?.openPicker();
  const stopBreak = () => window.__mtxAppsBreak?.stop();
  const resumeProtection = () => window.__mtxAppsBreak?.resume();

  // Empty state: el user inició sesión sin seleccionar apps a bloquear.
  // "PROTECCIÓN ACTIVA · 0 apps" + botón "Descanso" no tiene sentido — no
  // hay nada que descansar. Card invitando a activar la protección. Tap
  // "Activar" abre el AppsEditorSheet (mismo modal que ya existe), el user
  // puede escoger apps sin tener que finalizar la sesión.
  if (blockedApps.length === 0 && !protectionDisabled && !breakState) {
    return (
      <div style={{ padding:'0 20px 16px' }}>
        <div className="mtx-glass" style={{
          borderRadius:22, padding:'18px 18px 16px',
          background:'radial-gradient(70% 100% at 50% 0%, rgba(255,255,255,0.04), transparent 60%), var(--glass-2)',
          border:'0.5px solid rgba(255,255,255,0.08)',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
              <div style={{
                width:32, height:32, borderRadius:'50%',
                background:'rgba(255,255,255,0.05)',
                border:'0.5px solid rgba(255,255,255,0.10)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--ink-3)', flexShrink:0,
              }}>
                <IcShield size={14} stroke="currentColor" strokeWidth={1.8}/>
              </div>
              <div style={{ minWidth:0 }}>
                <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-4)', marginBottom:2, letterSpacing:'0.14em' }}>
                  Protección
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--ink-1)', letterSpacing:'-0.01em' }}>
                  Sin apps protegidas
                </div>
              </div>
            </div>
            <button
              onClick={onEditApps}
              className="mtx-tap"
              aria-label="Activar protección — seleccionar apps a bloquear"
              style={{
                appearance:'none', cursor:'pointer', flexShrink:0,
                padding:'8px 14px', borderRadius:999,
                background:'linear-gradient(180deg, rgba(61,255,209,0.18), rgba(61,255,209,0.06))',
                border:'0.5px solid rgba(61,255,209,0.40)',
                color:'var(--neon)',
                fontSize:12, fontWeight:700, letterSpacing:'-0.005em',
                fontFamily:'var(--ff-sans)',
                display:'inline-flex', alignItems:'center', gap:6,
                boxShadow:'0 0 0 1px rgba(61,255,209,0.16), inset 0 0 12px rgba(61,255,209,0.06)',
              }}
            >
              <IcShield size={12} stroke="currentColor" strokeWidth={2.2}/>
              Activar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Estado especial: el usuario apagó la protección por completo. La card se
  // muestra en gris-rojizo invitando a retomar — no hay apps "bloqueadas"
  // mientras esto esté activo.
  if (protectionDisabled) {
    return (
      <div style={{ padding:'0 20px 16px' }}>
        <div className="mtx-glass" style={{
          borderRadius:22, padding:'18px 18px 16px',
          background:'radial-gradient(70% 100% at 50% 0%, rgba(255,107,107,0.05), transparent 60%), var(--glass-2)',
          border:'0.5px solid rgba(255,107,107,0.18)',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
              <div style={{
                width:32, height:32, borderRadius:'50%',
                background:'rgba(255,107,107,0.12)',
                border:'0.5px solid rgba(255,107,107,0.28)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'rgba(255,140,140,0.95)', flexShrink:0,
              }}>
                <IcUnlock size={14} stroke="currentColor" strokeWidth={1.8}/>
              </div>
              <div style={{ minWidth:0 }}>
                <div className="mtx-eyebrow" style={{ fontSize:9, color:'rgba(255,140,140,0.95)', marginBottom:2, letterSpacing:'0.14em' }}>
                  Protección detenida
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--ink-1)', letterSpacing:'-0.01em' }}>
                  Las apps están libres en tu sesión
                </div>
              </div>
            </div>
            <button
              onClick={resumeProtection}
              className="mtx-tap"
              aria-label="Retomar protección"
              style={{
                appearance:'none', cursor:'pointer', flexShrink:0,
                padding:'8px 14px', borderRadius:999,
                background:'linear-gradient(180deg, rgba(61,255,209,0.18), rgba(61,255,209,0.08))',
                border:'0.5px solid rgba(61,255,209,0.45)',
                color:'var(--neon)',
                fontSize:12, fontWeight:700, letterSpacing:'-0.005em',
                fontFamily:'var(--ff-sans)',
                display:'inline-flex', alignItems:'center', gap:6,
                boxShadow:'0 0 0 1px rgba(61,255,209,0.18), 0 6px 18px -8px rgba(61,255,209,0.5)',
              }}
            >
              <IcShield size={12} stroke="currentColor" strokeWidth={2.2}/>
              Retomar
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            marginBottom:10,
          }}>
            <IcUnlock size={15} stroke="currentColor" strokeWidth={2.4}/>
            Desbloquear por {picked} min
          </button>
          {/* Acción secundaria: apagar la protección por completo (no es una
              pausa temporal). Estilo destructivo discreto — el primary sigue
              siendo la pausa, esto es la salida total. */}
          <button
            onClick={() => window.__mtxAppsBreak?.requestDisable()}
            className="mtx-tap"
            style={{
              width:'100%', height:44, borderRadius:14, cursor:'pointer',
              background:'transparent',
              border:'0.5px solid rgba(255,107,107,0.22)',
              color:'rgba(255,140,140,0.78)',
              fontSize:12.5, fontWeight:600, fontFamily:'var(--ff-sans)',
              letterSpacing:'-0.005em',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}
          >
            <IcUnlock size={12} stroke="currentColor" strokeWidth={1.8}/>
            Finalizar protección de hoy
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DisableProtectionConfirmModal ────────────────────────────────────────────
// Modal persuasivo cuando el usuario quiere apagar la protección por completo
// (no una pausa temporal — desactivarla del todo). Mismo lenguaje que el modal
// de finalizar sesión + countdown 10s para consistencia: si el usuario no
// decide, asumimos que no quería soltar el escudo.
function DisableProtectionConfirmModal() {
  const { confirmDisableOpen } = useAppsBreak();
  const onCancel  = () => window.__mtxAppsBreak?.cancelDisable();
  const onConfirm = () => window.__mtxAppsBreak?.confirmDisable();
  const COUNTDOWN_TOTAL = 10;
  const [seconds, setSeconds] = React.useState(COUNTDOWN_TOTAL);
  const onCancelRef = React.useRef(onCancel);
  React.useEffect(() => { onCancelRef.current = onCancel; });

  // Reset countdown cada vez que se abre el modal
  React.useEffect(() => {
    if (!confirmDisableOpen) return;
    setSeconds(COUNTDOWN_TOTAL);
    let autoCancelTimer = null;
    let remaining = COUNTDOWN_TOTAL;
    const id = setInterval(() => {
      remaining -= 1;
      setSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        autoCancelTimer = setTimeout(() => onCancelRef.current?.(), 200);
      }
    }, 1000);
    return () => {
      clearInterval(id);
      if (autoCancelTimer) clearTimeout(autoCancelTimer);
    };
  }, [confirmDisableOpen]);

  // Todos los hooks deben estar antes del early return (Rules of Hooks)
  const theme = React.useMemo(
    () => (typeof window !== 'undefined' && window._pickAndAdvanceModalTheme)
      ? window._pickAndAdvanceModalTheme()
      : null,
    []
  );
  const breathText = (typeof window !== 'undefined' && window.useBreathPhase)
    ? window.useBreathPhase(5000)
    : 'Respira';
  const Aurora = (typeof window !== 'undefined' && window.ConfirmAuroraBackground) || (() => null);

  if (!confirmDisableOpen) return null;

  const ringPct = (COUNTDOWN_TOTAL - seconds) / COUNTDOWN_TOTAL;
  // Ring 180x180 — mismo patrón hero que ReflectionDelayScreen
  const ringR = 82, ringC = 2 * Math.PI * ringR;

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:200,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'32px 28px',
      animation:'mtx-fade-up .32s ease',
      overflow:'hidden',
      background:'#0a0d0a',
    }}>
      <Aurora theme={theme}/>

      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        marginBottom:36, position:'relative', zIndex:1,
      }}>
        <div style={{ position:'relative', width:180, height:180 }}>
          <div style={{
            position:'absolute', inset:-30, borderRadius:'50%',
            background:'radial-gradient(50% 50% at 50% 50%, rgba(61,255,209,0.22), transparent 70%)',
            filter:'blur(20px)', pointerEvents:'none',
            transform:'translateZ(0)', willChange:'transform',
          }}/>
          <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform:'rotate(-90deg)', position:'relative' }}>
            <defs>
              <linearGradient id="disable-grad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#6affd9"/>
                <stop offset="1" stopColor="#1ad9ad"/>
              </linearGradient>
              <filter id="disable-glow">
                <feGaussianBlur stdDeviation="3"/>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="90" cy="90" r={ringR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
            <circle cx="90" cy="90" r={ringR} fill="none"
              stroke="url(#disable-grad)" strokeWidth="4.5" strokeLinecap="round"
              strokeDasharray={ringC}
              strokeDashoffset={ringC * (1 - ringPct)}
              filter="url(#disable-glow)"
              style={{ transition:'stroke-dashoffset 1s linear' }}/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{
              fontSize:62, fontWeight:600, color:'var(--neon)',
              fontVariantNumeric:'tabular-nums', letterSpacing:'-0.04em', lineHeight:1,
              fontFamily:'var(--ff-display)',
              textShadow:'0 0 24px rgba(61,255,209,0.5)',
            }}>{seconds}</div>
            <div style={{
              fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.85)', marginTop:8,
              letterSpacing:'0.18em', textTransform:'uppercase',
              transition:'opacity .4s ease',
            }} key={breathText}>
              {breathText}
            </div>
          </div>
        </div>

        {/* "Escudo / activo" en 2 renglones AFUERA del ring */}
        <div style={{
          marginTop:18, fontSize:9.5, fontWeight:700,
          color:'rgba(255,255,255,0.55)', letterSpacing:'0.22em', textTransform:'uppercase',
          textAlign:'center', lineHeight:1.6,
        }}>
          Escudo<br/>activo
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
        <IcUnlock size={11} stroke="currentColor" strokeWidth={2}/>
        Soltar el escudo
      </div>

      <h1 style={{
        margin:'0 0 10px', fontSize:22, fontWeight:800,
        color:'var(--ink-1)', letterSpacing:'-0.025em', lineHeight:1.22,
        fontFamily:'var(--ff-display)', textAlign:'center', position:'relative', zIndex:1,
        maxWidth:300,
      }}>
        ¿Soltar la mente al ruido?
      </h1>
      <p style={{
        margin:'0 0 22px', fontSize:12.5, color:'rgba(255,255,255,0.65)',
        textAlign:'center', lineHeight:1.5, maxWidth:300, position:'relative', zIndex:1,
      }}>
        Si apagas la protección, las apps quedan libres durante el resto de la sesión.
      </p>

      <button onClick={onCancel} className="mtx-tap" style={{
        width:'100%', maxWidth:320, height:52, borderRadius:18, border:0, cursor:'pointer',
        background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.9)), var(--neon-deep, #1ad9ad))',
        color:'#0a1410', fontSize:15, fontWeight:700,
        fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
        boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 14px 36px -10px rgba(61,255,209,0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
        marginBottom:10, position:'relative', zIndex:1,
      }}>
        Mantener mi escudo
      </button>

      <button onClick={onConfirm} className="mtx-tap" style={{
        background:'transparent', border:0, cursor:'pointer',
        color:'rgba(255,140,140,0.92)', fontSize:13, fontWeight:600,
        fontFamily:'var(--ff-sans)', padding:'8px 12px',
        position:'relative', zIndex:1,
      }}>
        Sí, finalizar la protección
      </button>
    </div>
  );
}

// ── HomeActive ────────────────────────────────────────────────────────────────
function HomeActive({
  tweaks,
  onNotif = () => {},
  notifCount = 0,
  onAgenda = () => {},
  blockedApps = [],
  plannedMinutes = 45,
  selectedRoutineIds = [],
  onOpenPlayer = () => {},
  onFinishSession = () => {},
  onEditApps = () => {},
  onEditRoutines = () => {},
  // (ctx) → MentexApp setea editTimeCtx con { initialMinutes,
  // elapsedMinutes, minMinutes } para hidratar el CustomTimeModal global.
  onEditTime = () => {},
  // (ctx) → MentexApp cambia a tab IA y dispara evento mtx:ia-open-session-chat
  // con contexto (apps, tiempo, ritual). Acceso rápido al coach desde la
  // sesión activa — saluda contextualizado y ofrece quick actions.
  onOpenSessionChat = () => {},
  // Timestamp del momento en que el usuario presionó "Comenzar jornada".
  // Cada nuevo valor dispara el whisper bubble — sin depender de sessionStorage.
  sessionStartedAt = 0,
}) {
  // Filtrar ACTIVITIES por las rutinas que el usuario activó en HomeInactive
  // (state.routines). Antes se mostraban todas las defaults siempre, ignorando
  // la selección — bug reportado: "se cargan elementos por defecto que no
  // seleccioné". Ahora solo aparecen las activities cuyo routineId está en
  // selectedRoutineIds. ritualExtras (agregadas desde Explorar) siguen
  // mostrándose siempre.
  const visibleActivities = React.useMemo(
    () => ACTIVITIES.filter(a => selectedRoutineIds.includes(a.routineId)),
    [selectedRoutineIds]
  );
  // El total se basa en lo que el usuario eligió en el Home inactivo (state.time).
  // Fallback a 45 min si no llega prop (ej. en dev/preview).
  const totalMin = plannedMinutes && plannedMinutes > 0 ? plannedMinutes : 45;
  // elapsedSec — segundos transcurridos desde el inicio de la sesión.
  // Antes el state era `seconds` (restantes) inicializado con
  // totalMin*60 - 13*60. Eso bloqueaba la reactividad: si el usuario
  // edita el tiempo desde el lápiz de la card, el remaining no se
  // recomputaba. Ahora elapsedSec sube en cada tick y secondsLeft se
  // deriva — así totalMin nuevo se refleja inmediatamente.
  const [elapsedSec, setElapsedSec] = React.useState(13 * 60);
  const ritualExtras = (window.useRitualItems ? window.useRitualItems() : []);

  // Expone los ítems de sesión activa para que el chip "Organizar mi horario"
  // del chat IA pueda leerlos y asignarles horas vía __mtxScheduler.
  // Sin cleanup: persiste aunque el user navegue al tab IA durante la sesión.
  React.useEffect(() => {
    window.__mtxSessionItems = { rituals: visibleActivities, content: ritualExtras };
  }, [visibleActivities, ritualExtras]);

  // ── Session Whisper ───────────────────────────────────────────────────────
  const onboardingAnswers = React.useMemo(
    () => (window.__mtxOnboarding ? window.__mtxOnboarding.get().answers : null),
    []
  );
  const [sessionWhisperOpen, setSessionWhisperOpen] = React.useState(false);
  React.useEffect(() => {
    if (!sessionStartedAt) return;
    if (typeof window !== 'undefined' && window.__mtxIsPremium && !window.__mtxIsPremium()) return;
    setSessionWhisperOpen(false);
    const t = setTimeout(() => setSessionWhisperOpen(true), 1500);
    return () => clearTimeout(t);
  }, [sessionStartedAt]);
  const dismissSessionWhisper = React.useCallback(() => {
    setSessionWhisperOpen(false);
  }, []);
  const openSessionWhisperChat = React.useCallback(() => {
    setSessionWhisperOpen(false);
    const ritualTotal = visibleActivities.length + ritualExtras.length;
    const ans = onboardingAnswers || {};
    onOpenSessionChat({
      blockedAppsCount: blockedApps.length,
      plannedMinutes: totalMin,
      elapsedMinutes: 0,
      minutesLeft: totalMin,
      ritualTotal,
      ritualDone: 0,
      remindersPending: (window.__mtxIAAgenda ? window.__mtxIAAgenda.get().reminders.filter(r => !r.completed).length : 0),
      fromWhisper: true,
      mode: 'session-start',
    });
  }, [visibleActivities, ritualExtras, onboardingAnswers, blockedApps, totalMin, onOpenSessionChat]);

  // AddContentScreen del ritual del día — se monta a fullscreen overlay
  // cuando el usuario tap el CTA "Agregar al ritual de hoy" debajo de la
  // lista. Reutiliza el mismo AddContentScreen del Explorar via una
  // playlist sintética (_customAdd persiste en window.__mtxRitual).
  const [addToRitualOpen, setAddToRitualOpen] = React.useState(false);

  React.useEffect(() => {
    const id = setInterval(() => setElapsedSec(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // El cableo del store __mtxActiveQueue NO vive aquí — se hace a nivel del
  // MentexApp (Mentex Home.html) basándose en `tweaks.homeState === 'active'`.
  // Esto es importante: HomeActive se desmonta al cambiar de tab, pero la
  // sesión activa NO termina con eso. Si el push estuviera aquí, al ir a
  // Explorar la cola caería a watch-later — el bug que motivó la sub-fase 0.1.

  const total   = totalMin * 60;
  // elapsed se clampa a [0, total] — si el user reduce el totalMin debajo
  // del elapsed actual, la sesión queda completada (pct=1) en lugar de
  // mostrar pct > 1 (visualmente roto).
  const elapsed = Math.min(elapsedSec, total);
  const seconds = Math.max(0, total - elapsedSec);
  const pct     = total > 0 ? elapsed / total : 0;
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
    <div style={{ paddingTop:60, paddingBottom:96, animation:'mtx-fade-up .4s ease both' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ padding:'8px 20px 12px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
        <div style={{ flex:1 }}>
          <div className="mtx-eyebrow" style={{ marginBottom:6, color:'var(--neon)', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{
              width:6, height:6, borderRadius:999, background:'var(--neon)',
              boxShadow:'0 0 10px var(--neon-glow)',
              animation:'mtx-pulse 2s ease-in-out infinite', flexShrink:0,
              willChange:'transform, opacity',
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
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {/* Acceso rápido al coach IA — abre chat con saludo contextualizado
              en función de apps bloqueadas, ritual pendiente, recordatorios y
              tiempo restante. Reutiliza ia-flow.jsx + nueva conv efímera.
              Phase 5.1.1 — mismo glass neutral que el bell para cohesión
              visual. Solo el icon ✦ en neon es el acento. Single source con
              HomeInactive (mismo botón, misma ruta).
              Phase 5.3 — gate: si free, tap → premium lock en lugar de chat. */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.__mtxIsPremium && !window.__mtxIsPremium()) {
                if (window.__mtxOpenPremiumLock) window.__mtxOpenPremiumLock('ia-chat');
                return;
              }
              const completedSet = (typeof window !== 'undefined' && window.__mtxRunnerCompleted)
                ? new Set(window.__mtxRunnerCompleted.list()) : new Set();
              const ritualTotal = visibleActivities.length + ritualExtras.length;
              const ritualDone  = visibleActivities.filter(a => a.done || completedSet.has(a.id)).length;
              const remindersPending = (typeof window !== 'undefined' && window.__mtxIAAgenda)
                ? window.__mtxIAAgenda.get().reminders.filter(r => !r.completed).length
                : 0;
              onOpenSessionChat({
                blockedAppsCount: blockedApps.length,
                plannedMinutes: totalMin,
                elapsedMinutes: Math.floor(elapsedSec / 60),
                minutesLeft: Math.max(0, Math.ceil((total - elapsedSec) / 60)),
                ritualTotal,
                ritualDone,
                remindersPending,
              });
            }}
            aria-label="Abrir coach Mentex"
            className="mtx-tap"
            style={{
              position:'relative', width:44, height:44, borderRadius:999,
              background:'var(--glass-2)', border:'0.5px solid var(--glass-stroke)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--neon)', cursor:'pointer', flexShrink:0,
            }}
          >
            <IcSparkles size={18} stroke="currentColor" strokeWidth={1.7}/>
          </button>
          {/* Experimento: botón Agenda entre Coach y Notificaciones. Abre el
              AgendaSheet existente del coach (vía onAgenda lifted al shell). */}
          <button onClick={onAgenda} aria-label="Agenda" className="mtx-tap" style={{
            position:'relative', width:44, height:44, borderRadius:999,
            background:'var(--glass-2)', border:'0.5px solid var(--glass-stroke)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', cursor:'pointer', flexShrink:0,
          }}>
            <IcCalendar size={19} stroke="var(--ink-1)" strokeWidth={1.6}/>
          </button>
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

          {/* Session Whisper Bubble — sale del botón ✦ al iniciar la sesión.
              Dos mensajes: empty (invita a configurar ritual) o with (organizar
              los que hay). Disparo por sessionStartedAt prop — sin sessionStorage. */}
          {sessionWhisperOpen && typeof window.CoachWhisperBubble !== 'undefined' && (() => {
            const ans = onboardingAnswers || {};
            const ritualCount = visibleActivities.length + ritualExtras.length;
            const remindersPending = (window.__mtxIAAgenda ? window.__mtxIAAgenda.get().reminders.filter(r => !r.completed).length : 0);
            const firstName = (ans.name || '').trim().split(' ')[0] || '';
            const { msg, cta } = _coachActiveWhisperMessage(ans.coachVoice, firstName, ritualCount, remindersPending);
            return (
              <window.CoachWhisperBubble
                coachVoice={ans.coachVoice}
                firstName={firstName}
                msg={msg}
                cta={cta}
                posTop={62}
                posRight={32}
                onOpen={openSessionWhisperChat}
                onDismiss={dismissSessionWhisper}
              />
            );
          })()}
        </div>
      </div>

      {/* ── CARD 1 · Cronómetro (sin apps adentro) ─────────────────────── */}
      <div style={{ padding:'0 20px 16px' }}>
        <div className="mtx-glass" style={{
          borderRadius:28, padding:'24px 20px 20px',
          display:'flex', flexDirection:'column', alignItems:'center',
          // Halo neon directo en el background del card — el radial-gradient
          // se mezcla con var(--glass-2) sin necesidad de un div extra con
          // filter:blur. (Antes había un <div top:-50 filter:blur(24px)>
          // como halo, pero overflow:hidden del card cortaba el blur creando
          // un seam horizontal visible — bug visual reportado).
          background:'radial-gradient(70% 80% at 50% 0%, rgba(61,255,209,0.10), transparent 65%), var(--glass-2)',
          borderColor:'rgba(61,255,209,0.12)',
          position:'relative', overflow:'hidden',
        }}>

          {/* Editar tiempo — lápiz arriba a la derecha de la card. Abre
              el CustomTimeModal global del MentexApp (UNICO mount point)
              hidratado con el totalMin actual, los minutos transcurridos
              y el mínimo viable (para no permitir saltar a completed). */}
          <button
            onClick={() => onEditTime({
              initialMinutes: totalMin,
              elapsedMinutes: Math.floor(elapsedSec / 60),
              minMinutes: Math.max(1, Math.ceil(elapsedSec / 60)),
            })}
            aria-label="Editar tiempo de la sesión"
            className="mtx-tap"
            style={{
              position:'absolute', top:14, right:14, zIndex:2,
              width:32, height:32, borderRadius:999, border:0, cursor:'pointer',
              background:'rgba(255,255,255,0.05)',
              border:'0.5px solid rgba(255,255,255,0.08)',
              color:'var(--ink-2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'background .2s, color .2s, border-color .2s',
              backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
            }}>
            <IcEdit size={13} stroke="currentColor" strokeWidth={1.8}/>
          </button>

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

          {/* Divider sutil entre el cronómetro y la acción secundaria */}
          <div style={{ width:'100%', height:'0.5px', background:'rgba(255,255,255,0.06)', marginTop:18, marginBottom:12 }}/>

          {/* Acción secundaria: Finalizar sesión. Vive DENTRO de la card del
              cronómetro (no flotando) para no estar invitando al usuario a
              terminar todo el tiempo. Estilo discreto — el primary es seguir
              enfocado, no terminar. */}
          <button
            onClick={onFinishSession}
            className="mtx-tap"
            style={{
              appearance:'none', cursor:'pointer',
              background:'transparent', border:0,
              color:'rgba(255,107,107,0.78)',
              fontSize:13, fontWeight:600,
              fontFamily:'var(--ff-sans)', letterSpacing:'-0.005em',
              padding:'6px 10px',
              display:'inline-flex', alignItems:'center', gap:7,
              transition:'color .2s',
            }}
          >
            <span style={{
              width:8, height:8, borderRadius:2,
              background:'rgba(255,107,107,0.8)',
              boxShadow:'0 0 8px rgba(255,107,107,0.5)',
            }}/>
            Finalizar sesión
          </button>
        </div>
      </div>

      {/* ── CARD 2 · Apps protegidas (con descanso contextual) ─────────── */}
      <AppsProtectionCard blockedApps={blockedApps} onEditApps={onEditApps}/>

      {/* ── CARD 3 · Tu ritual de hoy — solo prácticas y hábitos ─────────
          visibleActivities (rutinas seleccionadas en HomeInactive). El pencil
          del header se reemplaza por una card "Configurar rutinas" abajo para
          coherencia visual con la sección de aprendizaje. */}
      <div style={{ marginBottom:24 }}>
        <MtxSectionHead
          title="Tu ritual de hoy"
          eyebrow={(() => {
            const completedSet = (typeof window !== 'undefined' && window.__mtxRunnerCompleted)
              ? new Set(window.__mtxRunnerCompleted.list()) : new Set();
            const done = visibleActivities.filter(a => a.done || completedSet.has(a.id)).length;
            const total = visibleActivities.length;
            return total === 0 ? 'Sin rutinas — agrega las que quieres practicar' : `${done} de ${total} completadas`;
          })()}
          {...(visibleActivities.length > 0 ? {
            actionIcon: <IcPlus size={13} stroke="currentColor" strokeWidth={2.4}/>,
            actionRadius: 9,
            actionLabel: 'Configurar rutinas del ritual',
            onAction: onEditRoutines,
          } : {})}
        />
        <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'0 20px' }}>
          {visibleActivities.map(a => (
            <ActivityRow key={a.id} a={a} onOpenPlayer={onOpenPlayer}/>
          ))}
          {window.MtxAddMoreCard && visibleActivities.length === 0 && (
            <window.MtxAddMoreCard
              onClick={onEditRoutines}
              title="Configurar rutinas del ritual"
              subtitle="Meditación, respiración, movimiento y más"
              neutral
            />
          )}
        </div>
      </div>

      {/* ── CARD 4 · Mi aprendizaje del día — contenido de Explorar ─────────
          ritualExtras: items agregados desde Explorar (audiolibros, charlas,
          meditaciones). Sección propia para no mezclar práctica con contenido.
          "Aprendizaje del día" enfatiza la intención activa de consumir y
          retener, vs. el ritual que es práctica corporal/mental. */}
      <div style={{ marginBottom:24 }}>
        <MtxSectionHead
          title="Mi aprendizaje del día"
          eyebrow={ritualExtras.length === 0
            ? 'Agrega contenido de Explorar para esta sesión'
            : `${ritualExtras.length} ${ritualExtras.length === 1 ? 'contenido' : 'contenidos'} · en sesión`}
          {...(ritualExtras.length > 0 ? {
            actionIcon: <IcPlus size={13} stroke="currentColor" strokeWidth={2.4}/>,
            actionRadius: 9,
            actionLabel: 'Agregar contenido al día',
            onAction: () => setAddToRitualOpen(true),
          } : {})}
        />
        <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'0 20px' }}>
          {ritualExtras.map(extra => (
            <ActivityRow
              key={extra.id}
              a={_extraToActivity(extra)}
              onOpenPlayer={onOpenPlayer}
            />
          ))}
          {window.MtxAddMoreCard && ritualExtras.length === 0 && (
            <window.MtxAddMoreCard
              onClick={() => setAddToRitualOpen(true)}
              title="Agregar contenido al día"
              subtitle="Audiolibros, charlas y meditaciones de Explorar"
              neutral
            />
          )}
        </div>
      </div>

      {/* AddContentScreen overlay para el ritual del día. Se monta a nivel
          del HomeActive (no global) — solo tiene sentido en la sesión activa
          del Home. La playlist sintética enlaza con window.__mtxRitual: los
          items seleccionados se persisten ahí vía _customAdd. items[] lista
          los IDs ya en el ritual (ACTIVITIES base con exploreId resoluble +
          ritualExtras) para que AddContentScreen los excluya del listado de
          "disponibles". */}
      {addToRitualOpen && window.AddContentScreen && (
        <div style={{
          position:'absolute', inset:0, zIndex:200,
          background:'#050706',
          animation:'mtx-fade-up .35s ease',
        }}>
          <window.AddContentScreen
            playlist={_buildRitualSyntheticPlaylist(ritualExtras, visibleActivities)}
            onBack={() => setAddToRitualOpen(false)}
            footerBottomOffset={24}
          />
        </div>
      )}

      {/* CustomTimeModal NO se monta aquí — vive a nivel de MentexApp
          como único mount point. HomeActive abre el modal vía la prop
          onEditTime que actualiza editTimeCtx en MentexApp. Esto evita
          duplicación de instancias y mantiene un solo lugar de verdad
          para la edición del tiempo de enfoque (tanto desde HomeInactive
          como desde HomeActive). */}
    </div>
  );
}

// Playlist sintética del ritual del día — wraps window.__mtxRitual para que
// el AddContentScreen del Explorar funcione tal cual sin saber del store.
//   items:        IDs ya presentes (activities visibles resueltas vía exploreId
//                 + ritualExtras) → AddContentScreen los excluye del grid.
//   _customAdd:   hook que persiste cada selección en __mtxRitual.add().
// Recibe visibleActivities (no ACTIVITIES global) para que tras filtrar por
// selectedRoutineIds del HomeInactive solo se excluyan las activities
// efectivamente presentes en la sesión.
function _buildRitualSyntheticPlaylist(ritualExtras, visibleActivities) {
  const baseExploreIds = (visibleActivities || [])
    .map(a => a.exploreId)
    .filter(Boolean);
  const extraIds = (ritualExtras || []).map(x => x.id);
  const EC = (typeof window !== 'undefined' && window.EXPLORE_CONTENT) || [];
  return {
    id: 'ritual-today-add',
    title: 'el ritual de hoy',
    accent: '#3dffd1',
    bg: 'linear-gradient(135deg, #1a3a35, #0f2520)',
    items: [...baseExploreIds, ...extraIds],
    _customAdd: (ids) => {
      ids.forEach(id => {
        const it = EC.find(c => c.id === id);
        if (!it || !window.__mtxRitual) return;
        window.__mtxRitual.add({
          id: it.id, title: it.title, author: it.author,
          kind: it.type, dur: it.dur, accent: it.accent,
          cover: it.cover, bg: it.bg, exploreId: it.id,
        });
      });
    },
  };
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
  AppsProtectionCard, AppsBreakPickerSheet, DisableProtectionConfirmModal,
  useAppsBreak,
});
