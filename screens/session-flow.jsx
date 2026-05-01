// session-flow.jsx — Break picker, Break active, Reflection delay, Completion

const BREAK_OPTIONS = [5, 10, 15, 20, 30];

// ── BreakPickerSheet ──────────────────────────────────────────────────────────
function BreakPickerSheet({ onClose, onPick, breakCount = 2 }) {
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
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <style>{`@keyframes mtxSheetUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

        {/* Drag handle */}
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          style={{ display:'flex', justifyContent:'center', paddingTop:14, paddingBottom:10, cursor:'grab', touchAction:'none' }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'4px 24px 18px' }}>
          <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--neon)', marginBottom:6, letterSpacing:'0.14em' }}>
            Descanso · #{breakCount + 1}
          </div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em' }}>
            Tómate un descanso
          </h2>
          <p style={{ margin:'6px 0 0', fontSize:13, color:'var(--ink-3)' }}>
            Respira, estira, vuelve renovado.
          </p>
        </div>

        {/* Visual preview ring */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
          <div style={{ position:'relative', width:140, height:140 }}>
            <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform:'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="break-grad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#6affd9"/>
                  <stop offset="1" stopColor="#1ad9ad"/>
                </linearGradient>
              </defs>
              <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
              <circle cx="70" cy="70" r="58" fill="none"
                stroke="url(#break-grad)" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 58}
                strokeDashoffset={2 * Math.PI * 58 * (1 - picked / 30)}
                style={{ transition:'stroke-dashoffset .35s cubic-bezier(.25,.8,.25,1)' }}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{
                fontSize:42, fontWeight:600, color:'var(--ink-1)',
                fontVariantNumeric:'tabular-nums', letterSpacing:'-0.04em', lineHeight:1,
                fontFamily:'var(--ff-display)',
              }}>{picked}</div>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:4 }}>min</div>
            </div>
          </div>
        </div>

        {/* Quick chips */}
        <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', padding:'0 20px', marginBottom:20 }}>
          {BREAK_OPTIONS.map(m => {
            const active = picked === m;
            return (
              <button key={m} onClick={() => setPicked(m)} className="mtx-tap" style={{
                height:44, minWidth:64, padding:'0 16px', borderRadius:14, cursor:'pointer',
                border: active ? '0.5px solid rgba(61,255,209,0.55)' : '0.5px solid var(--glass-stroke)',
                background: active ? 'linear-gradient(180deg, rgba(61,255,209,0.18), rgba(61,255,209,0.06))' : 'rgba(255,255,255,0.04)',
                color: active ? 'var(--neon)' : 'var(--ink-1)',
                fontSize:14, fontWeight:600,
                fontFamily:'var(--ff-sans)',
                boxShadow: active ? '0 0 0 1px rgba(61,255,209,0.25), 0 6px 20px -8px rgba(61,255,209,0.5)' : 'none',
                transform: active ? 'translateY(-1px)' : 'translateY(0)',
                transition:'transform .2s ease, box-shadow .25s ease, background .2s ease, border-color .2s ease',
              }}>
                {m} min
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ padding:'0 20px' }}>
          <button onClick={() => onPick(picked)} className="mtx-tap" style={{
            width:'100%', height:54, borderRadius:18, border:0, cursor:'pointer',
            background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
            color:'#0a1410', fontSize:15, fontWeight:700,
            fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
            boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 12px 32px -8px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            <IcPause size={16} stroke="currentColor" strokeWidth={2.4}/>
            Comenzar descanso de {picked} min
          </button>
        </div>
      </div>
    </div>
  );
}


// ── BreakActiveScreen ─────────────────────────────────────────────────────────
function BreakActiveScreen({ minutes, breakNumber, onEnd }) {
  const total = minutes * 60;
  const [seconds, setSeconds] = React.useState(total);
  const onEndRef = React.useRef(onEnd);
  React.useEffect(() => { onEndRef.current = onEnd; });

  React.useEffect(() => {
    let endTimer = null;
    const id = setInterval(() => setSeconds(s => {
      if (s <= 1) {
        clearInterval(id);
        endTimer = setTimeout(() => onEndRef.current?.(), 600);
        return 0;
      }
      return s - 1;
    }), 1000);
    return () => {
      clearInterval(id);
      if (endTimer) clearTimeout(endTimer);
    };
  }, []);

  const pct = (total - seconds) / total;
  const R = 110, C = 2 * Math.PI * R;
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  const timeStr = `${mm}:${String(ss).padStart(2, '0')}`;

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:90,
      background:'radial-gradient(80% 60% at 50% 0%, rgba(155,138,255,0.18), transparent 60%), radial-gradient(60% 80% at 50% 100%, rgba(61,255,209,0.1), transparent 60%), #0a0d12',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between',
      padding:'80px 24px 56px',
      animation:'mtxBreakIn .5s cubic-bezier(.25,.8,.25,1) both',
    }}>
      <style>{`
        @keyframes mtxBreakIn { from { opacity:0; transform:scale(1.04); } to { opacity:1; transform:scale(1); } }
        @keyframes mtxBreathe { 0%,100% { transform:scale(1); opacity:0.4; } 50% { transform:scale(1.15); opacity:0.7; } }
      `}</style>

      {/* Header */}
      <div style={{ textAlign:'center' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'#9b8aff', marginBottom:6, letterSpacing:'0.14em' }}>
          Descanso · #{breakNumber}
        </div>
        <h1 style={{ margin:0, fontSize:24, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em' }}>
          Respira, estira, mira lejos
        </h1>
        <p style={{ margin:'8px 0 0', fontSize:13, color:'var(--ink-3)' }}>
          Tu mente vuelve mejor cuando descansa.
        </p>
      </div>

      {/* Ring */}
      <div style={{ position:'relative', width:264, height:264 }}>
        {/* Breathing halo */}
        <div style={{
          position:'absolute', inset:-20, borderRadius:'50%',
          background:'radial-gradient(50% 50% at 50% 50%, rgba(155,138,255,0.18), transparent 70%)',
          animation:'mtxBreathe 4s ease-in-out infinite',
          pointerEvents:'none',
        }}/>

        <svg width="264" height="264" viewBox="0 0 264 264" style={{ transform:'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="break-active-grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#c8a8ff"/>
              <stop offset="1" stopColor="#6affd9"/>
            </linearGradient>
            <filter id="break-glow">
              <feGaussianBlur stdDeviation="3"/>
              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx="132" cy="132" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
          <circle cx="132" cy="132" r={R} fill="none"
            stroke="url(#break-active-grad)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
            filter="url(#break-glow)"/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', marginBottom:6 }}>
            Termina en
          </div>
          <div style={{
            fontSize:64, fontWeight:600, color:'var(--ink-1)',
            fontVariantNumeric:'tabular-nums', letterSpacing:'-0.04em', lineHeight:1,
            fontFamily:'var(--ff-display)',
          }}>
            {timeStr}
          </div>
          <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:8 }}>
            de {minutes} min
          </div>
        </div>
      </div>

      {/* Skip */}
      <button onClick={onEnd} className="mtx-tap" style={{
        background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.1)',
        color:'var(--ink-2)', fontSize:13, fontWeight:600, cursor:'pointer',
        padding:'12px 22px', borderRadius:999,
        fontFamily:'var(--ff-sans)',
      }}>
        Saltar descanso
      </button>
    </div>
  );
}


// ── ReflectionDelayScreen ─────────────────────────────────────────────────────
// Modal de confirmación al tap "Finalizar sesión". Muestra el costo real de
// salir ahora: tiempo restante + rituales sin completar. El primary CTA es
// SIEMPRE seguir enfocado — terminar es la opción secundaria.
//
// Countdown integrado: si el usuario no decide en 10s, asumimos que no quería
// salir (tap accidental) y volvemos al enfoque automáticamente. El mini-ring
// vive a la izquierda del CTA primary "Volver al enfoque" para que se entienda
// que ESE es el destino al que vamos.
function ReflectionDelayScreen({
  elapsedMin = 13,
  remainingMin = 32,
  pendingRituals = 4,
  onCancel,
  onConfirm,
}) {
  const COUNTDOWN_TOTAL = 10;
  const [seconds, setSeconds] = React.useState(COUNTDOWN_TOTAL);
  const onCancelRef = React.useRef(onCancel);
  React.useEffect(() => { onCancelRef.current = onCancel; });

  React.useEffect(() => {
    let autoCancelTimer = null;
    const id = setInterval(() => setSeconds(s => {
      if (s <= 1) {
        clearInterval(id);
        autoCancelTimer = setTimeout(() => onCancelRef.current?.(), 200);
        return 0;
      }
      return s - 1;
    }), 1000);
    return () => {
      clearInterval(id);
      if (autoCancelTimer) clearTimeout(autoCancelTimer);
    };
  }, []);

  const ringPct = (COUNTDOWN_TOTAL - seconds) / COUNTDOWN_TOTAL;
  const ringR = 11, ringC = 2 * Math.PI * ringR;

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:95,
      background:'rgba(0,0,0,0.82)',
      backdropFilter:'blur(20px) saturate(140%)',
      WebkitBackdropFilter:'blur(20px) saturate(140%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'40px 28px',
      animation:'mtx-fade-up .28s ease',
    }}>
      <div style={{
        position:'absolute', top:'18%', left:'50%', transform:'translateX(-50%)',
        width:260, height:140, borderRadius:'50%',
        background:'radial-gradient(50% 100% at 50% 50%, rgba(255,107,107,0.18), transparent 70%)',
        filter:'blur(28px)', pointerEvents:'none',
      }}/>

      <div style={{
        display:'inline-flex', alignItems:'center', gap:6,
        padding:'5px 11px 5px 9px', borderRadius:999,
        background:'rgba(255,107,107,0.1)',
        border:'0.5px solid rgba(255,107,107,0.3)',
        color:'rgba(255,140,140,0.95)',
        fontSize:10, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase',
        marginBottom:18, position:'relative', zIndex:1,
      }}>
        <span style={{
          width:6, height:6, borderRadius:999, background:'rgba(255,107,107,0.95)',
          boxShadow:'0 0 8px rgba(255,107,107,0.6)',
        }}/>
        Romper el momentum
      </div>

      <h1 style={{
        margin:'0 0 10px', fontSize:26, fontWeight:800,
        color:'var(--ink-1)', letterSpacing:'-0.028em', lineHeight:1.15,
        fontFamily:'var(--ff-display)', textAlign:'center', position:'relative', zIndex:1,
      }}>
        Tu mente se está afilando.
        <br/>¿Detener ahora?
      </h1>
      <p style={{
        margin:'0 0 24px', fontSize:13.5, color:'var(--ink-3)',
        textAlign:'center', lineHeight:1.5, maxWidth:300, position:'relative', zIndex:1,
      }}>
        Llevas <span style={{ color:'var(--neon)', fontWeight:700 }}>{elapsedMin} min</span> sosteniendo el foco. Estás a un paso de cerrar el ritual.
      </p>

      {/* Stats grid — cards en UN solo renglón cada una. La de rituales usa
          eyebrow corto "EN CURSO" + valor "X pendientes" para que entre. */}
      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:10,
        width:'100%', maxWidth:320, marginBottom:24,
        position:'relative', zIndex:1,
      }}>
        <div style={{
          padding:'12px 14px', borderRadius:14,
          background:'rgba(255,255,255,0.03)',
          border:'0.5px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:4 }}>
            Te faltan
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
            <span style={{
              fontSize:22, fontWeight:700, color:'var(--ink-1)',
              fontVariantNumeric:'tabular-nums', letterSpacing:'-0.025em', lineHeight:1,
              fontFamily:'var(--ff-display)',
            }}>{remainingMin}</span>
            <span style={{ fontSize:11, color:'var(--ink-3)' }}>min</span>
          </div>
        </div>
        <div style={{
          padding:'12px 14px', borderRadius:14,
          background:'rgba(255,255,255,0.03)',
          border:'0.5px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:4 }}>
            En curso
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
            <span style={{
              fontSize:22, fontWeight:700, color:'var(--ink-1)',
              fontVariantNumeric:'tabular-nums', letterSpacing:'-0.025em', lineHeight:1,
              fontFamily:'var(--ff-display)',
            }}>{pendingRituals}</span>
            <span style={{ fontSize:11, color:'var(--ink-3)' }}>pendientes</span>
          </div>
        </div>
      </div>

      {/* Primary: seguir enfocado · con mini-ring countdown a la izquierda */}
      <button onClick={onCancel} className="mtx-tap" style={{
        width:'100%', maxWidth:320, height:54, borderRadius:18, border:0, cursor:'pointer',
        background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
        color:'#0a1410', fontSize:15, fontWeight:700,
        fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
        boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 12px 32px -8px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
        marginBottom:12, position:'relative', zIndex:1,
        display:'inline-flex', alignItems:'center', justifyContent:'center', gap:10,
      }}>
        {/* Mini ring countdown — indica que en X seg vuelve solo al enfoque */}
        <span style={{ position:'relative', width:26, height:26, flexShrink:0 }}>
          <svg width="26" height="26" viewBox="0 0 26 26" style={{ transform:'rotate(-90deg)' }}>
            <circle cx="13" cy="13" r={ringR} fill="none" stroke="rgba(10,20,16,0.18)" strokeWidth="2"/>
            <circle cx="13" cy="13" r={ringR} fill="none"
              stroke="#0a1410" strokeWidth="2" strokeLinecap="round"
              strokeDasharray={ringC}
              strokeDashoffset={ringC * (1 - ringPct)}
              style={{ transition:'stroke-dashoffset 1s linear' }}/>
          </svg>
          <span style={{
            position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:800, color:'#0a1410',
            fontVariantNumeric:'tabular-nums', fontFamily:'var(--ff-display)',
          }}>{seconds}</span>
        </span>
        Volver al enfoque
      </button>

      <button onClick={onConfirm} className="mtx-tap" style={{
        background:'transparent', border:0, cursor:'pointer',
        color:'rgba(255,107,107,0.85)', fontSize:13, fontWeight:600,
        fontFamily:'var(--ff-sans)', padding:'8px 12px',
        position:'relative', zIndex:1,
      }}>
        Sí, finalizar la sesión
      </button>
    </div>
  );
}


// ── CompletionScreen ──────────────────────────────────────────────────────────
// Aparece SOLO cuando el cronómetro llega a 0 — es decir, el usuario completó
// el tiempo planeado. Tono celebratorio, score grande, confetti, comparte
// como CTA principal. Si el usuario interrumpe la sesión antes, va a
// SessionInterruptedScreen (otra historia visual).
function CompletionScreen({ elapsedMin = 32, activitiesCompleted = 3, contentMin = 18, distractionsBlocked = 47, score = 84, scoreBreakdown, onShare, onShareExternal, onClose }) {
  const bd = scoreBreakdown || { foco: 34, contenido: 22, rutinas: 18, racha: 10 };
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:100,
      background:'radial-gradient(80% 50% at 50% 0%, rgba(61,255,209,0.12), transparent 60%), #050706',
      display:'flex', flexDirection:'column',
      animation:'mtxCompletionIn .55s cubic-bezier(.25,.8,.25,1) both',
      overflow:'hidden',
    }}>
      <style>{`
        @keyframes mtxCompletionIn { from { opacity:0; transform:scale(1.05); } to { opacity:1; transform:scale(1); } }
        @keyframes mtxConfetti0 { 0% { transform:translateY(-20px) rotate(0); opacity:0; } 10% { opacity:1; } 100% { transform:translateY(900px) rotate(360deg); opacity:0; } }
        @keyframes mtxConfetti1 { 0% { transform:translateY(-20px) rotate(0); opacity:0; } 10% { opacity:1; } 100% { transform:translateY(800px) rotate(-360deg); opacity:0; } }
        @keyframes mtxConfetti2 { 0% { transform:translateY(-20px) rotate(0); opacity:0; } 10% { opacity:1; } 100% { transform:translateY(950px) rotate(180deg); opacity:0; } }
        @keyframes mtxScoreGlow { 0%,100% { text-shadow:0 0 24px rgba(61,255,209,0.35); } 50% { text-shadow:0 0 36px rgba(61,255,209,0.65); } }
      `}</style>

      {/* Confetti */}
      {Array.from({ length: 28 }).map((_, i) => {
        const colors = ['#3dffd1', '#7dffe0', '#a8ffec', '#FFD66B', '#9b8aff'];
        const left = (i * 13 + 7) % 100;
        const delay = (i * 0.18) % 4;
        const dur = 2.8 + (i % 5) * 0.4;
        const animIdx = i % 3;
        const size = 5 + (i % 3) * 2;
        return (
          <div key={i} style={{
            position:'absolute', top:-10, left:`${left}%`,
            width:size, height:size, borderRadius: i % 2 === 0 ? '50%' : 2,
            background:colors[i % colors.length],
            boxShadow:`0 0 6px ${colors[i % colors.length]}`,
            animation:`mtxConfetti${animIdx} ${dur}s cubic-bezier(.25,.46,.45,.94) ${delay}s infinite`,
            pointerEvents:'none',
          }}/>
        );
      })}

      {/* Top-right share icon (compartir externo: Twitter/X, screenshot, etc.) */}
      <button onClick={onShareExternal} aria-label="Compartir" className="mtx-tap" style={{
        position:'absolute', top:24, right:24, zIndex:3,
        width:40, height:40, borderRadius:999,
        background:'rgba(255,255,255,0.06)',
        border:'0.5px solid rgba(255,255,255,0.12)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'var(--ink-1)', cursor:'pointer',
      }}>
        <IcShare size={16} stroke="currentColor" strokeWidth={1.8}/>
      </button>

      {/* Top: title */}
      <div style={{ padding:'80px 28px 0', textAlign:'center', position:'relative', zIndex:2 }}>
        <div className="mtx-eyebrow" style={{ fontSize:10, color:'var(--neon)', marginBottom:8, letterSpacing:'0.14em' }}>
          Sesión completada
        </div>
        <h1 style={{ margin:0, fontSize:30, fontWeight:800, color:'var(--ink-1)', letterSpacing:'-0.03em', lineHeight:1.1 }}>
          ¡Lo lograste!
        </h1>
        <p style={{ margin:'10px 0 0', fontSize:14, color:'var(--ink-3)' }}>
          Cerraste el ritual completo. Tu mente acaba de afilarse.
        </p>
      </div>

      {/* Center: score */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 28px', position:'relative', zIndex:2 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:6 }}>
          <span style={{ fontSize:18, fontWeight:700, color:'var(--neon)' }}>+</span>
          <span style={{
            fontSize:88, fontWeight:700, color:'var(--ink-1)',
            fontVariantNumeric:'tabular-nums', letterSpacing:'-0.05em', lineHeight:1,
            fontFamily:'var(--ff-display)',
            animation:'mtxScoreGlow 2.4s ease-in-out infinite',
          }}>{score}</span>
          <span style={{ fontSize:18, fontWeight:600, color:'var(--ink-3)' }}>pts</span>
        </div>
        <div style={{ fontSize:14, fontWeight:600, color:'var(--neon)', letterSpacing:'-0.01em' }}>
          Sesión excelente
        </div>

        {/* Score breakdown */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center', marginTop:14, padding:'0 8px' }}>
          {[
            { lbl:'Foco',       v:bd.foco,       color:'#3dffd1' },
            { lbl:'Aprendizaje', v:bd.contenido,  color:'#7dffe0' },
            { lbl:'Rutinas',    v:bd.rutinas,    color:'#a8ffec' },
            { lbl:'Racha',      v:bd.racha,      color:'#FFD66B' },
          ].map(it => (
            <div key={it.lbl} style={{
              display:'inline-flex', alignItems:'center', gap:5,
              padding:'5px 10px 5px 8px', borderRadius:999,
              background:`${it.color}10`,
              border:`0.5px solid ${it.color}33`,
              fontSize:11, fontWeight:600,
            }}>
              <span style={{ color:it.color, fontWeight:700, fontVariantNumeric:'tabular-nums' }}>+{it.v}</span>
              <span style={{ color:'var(--ink-3)', fontSize:10 }}>{it.lbl}</span>
            </div>
          ))}
        </div>

        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10, width:'100%', marginTop:32 }}>
          <CompletionStat label="Tiempo enfocado" value={`${elapsedMin}`} unit="min" Ic={IcClock}/>
          <CompletionStat label="Actividades" value={`${activitiesCompleted}`} unit="hechas" Ic={IcCheck}/>
          <CompletionStat label="Aprendido" value={`${contentMin}`} unit="min" Ic={IcBook}/>
          <CompletionStat label="Bloqueadas" value={`${distractionsBlocked}`} unit="distracciones" Ic={IcShield}/>
        </div>
      </div>

      {/* Bottom: CTAs */}
      <div style={{ padding:'0 24px 36px', display:'flex', flexDirection:'column', gap:10, position:'relative', zIndex:2 }}>
        {/* Primary: ir a Comunidad y publicar el logro. Cablea al tab community. */}
        <button onClick={onShare} className="mtx-tap" style={{
          width:'100%', height:54, borderRadius:18, border:0, cursor:'pointer',
          background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
          color:'#0a1410', fontSize:15, fontWeight:700,
          fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
          boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 14px 36px -10px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}>
          <IcUsers size={16} stroke="currentColor" strokeWidth={2.2}/>
          Compartir con la comunidad
        </button>

        <button onClick={onClose} className="mtx-tap" style={{
          width:'100%', height:50, borderRadius:16, cursor:'pointer',
          background:'rgba(255,255,255,0.04)',
          border:'0.5px solid rgba(255,255,255,0.08)',
          color:'var(--ink-1)', fontSize:14, fontWeight:600,
          fontFamily:'var(--ff-sans)',
        }}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

// ── SessionInterruptedScreen ──────────────────────────────────────────────────
// Aparece cuando el usuario decide detener la sesión antes de tiempo. Mismo
// chasis visual que CompletionScreen para que se sienta familiar, pero el
// tono es REFLEXIVO, no celebratorio:
// - Sin confetti, sin score gigante glow.
// - Eyebrow ámbar (no neon), título neutral.
// - Stats muestran lo que SÍ se logró (no lo que faltó) — Mentex apoya.
// - CTA primary es "Volver al inicio" (cerrar sin más); secondary "Empezar
//   otra sesión" para que el usuario pueda re-comprometerse.
function SessionInterruptedScreen({
  elapsedMin = 13,
  plannedMin = 45,
  activitiesCompleted = 1,
  distractionsBlocked = 18,
  onClose,
  onStartAgain,
}) {
  const completionPct = Math.min(1, Math.max(0, plannedMin > 0 ? elapsedMin / plannedMin : 0));
  const completionPctText = Math.round(completionPct * 100);
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:100,
      background:'radial-gradient(80% 50% at 50% 0%, rgba(255,179,71,0.07), transparent 60%), #050706',
      display:'flex', flexDirection:'column',
      animation:'mtxCompletionIn .45s cubic-bezier(.25,.8,.25,1) both',
      overflow:'hidden',
    }}>
      {/* Top: title */}
      <div style={{ padding:'80px 28px 0', textAlign:'center', position:'relative', zIndex:2 }}>
        <div className="mtx-eyebrow" style={{
          display:'inline-flex', alignItems:'center', gap:6,
          fontSize:10, color:'#FFB347', letterSpacing:'0.14em',
          marginBottom:10,
        }}>
          <span style={{
            width:5, height:5, borderRadius:999, background:'#FFB347',
            boxShadow:'0 0 6px rgba(255,179,71,0.5)',
          }}/>
          Sesión interrumpida
        </div>
        <h1 style={{ margin:0, fontSize:28, fontWeight:800, color:'var(--ink-1)', letterSpacing:'-0.03em', lineHeight:1.15 }}>
          Decidiste pausar.
        </h1>
        <p style={{ margin:'10px 0 0', fontSize:13.5, color:'var(--ink-3)', lineHeight:1.5, maxWidth:300, marginInline:'auto' }}>
          Lo que invertiste cuenta. Tu mente vuelve cuando esté lista.
        </p>
      </div>

      {/* Center: progreso real (no score) */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 28px', position:'relative', zIndex:2 }}>
        {/* Progress ring sutil que muestra el % de la sesión que sí completaste */}
        <div style={{ position:'relative', width:172, height:172, marginBottom:24 }}>
          <svg width="172" height="172" viewBox="0 0 172 172" style={{ transform:'rotate(-90deg)' }}>
            <defs>
              <linearGradient id="interrupted-grad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#FFD66B"/>
                <stop offset="1" stopColor="#FF9F40"/>
              </linearGradient>
            </defs>
            <circle cx="86" cy="86" r="74" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
            <circle cx="86" cy="86" r="74" fill="none"
              stroke="url(#interrupted-grad)" strokeWidth="3.5" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 74}
              strokeDashoffset={2 * Math.PI * 74 * (1 - completionPct)}
              style={{ filter:'drop-shadow(0 0 6px rgba(255,179,71,0.5))' }}/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#FFB347', marginBottom:4 }}>
              Completaste
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
              <span style={{
                fontSize:48, fontWeight:700, color:'var(--ink-1)',
                fontVariantNumeric:'tabular-nums', letterSpacing:'-0.04em', lineHeight:1,
                fontFamily:'var(--ff-display)',
              }}>{completionPctText}</span>
              <span style={{ fontSize:16, fontWeight:600, color:'var(--ink-3)' }}>%</span>
            </div>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:6, fontVariantNumeric:'tabular-nums' }}>
              {elapsedMin} de {plannedMin} min
            </div>
          </div>
        </div>

        {/* Stats — solo lo que sí se logró */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10, width:'100%' }}>
          <CompletionStat label="Tiempo enfocado" value={`${elapsedMin}`} unit="min" Ic={IcClock}/>
          <CompletionStat label="Actividades" value={`${activitiesCompleted}`} unit="hechas" Ic={IcCheck}/>
        </div>
        <div style={{
          marginTop:14, fontSize:12, color:'var(--ink-3)', textAlign:'center', maxWidth:280, lineHeight:1.5,
        }}>
          Bloqueaste <span style={{ color:'var(--ink-2)', fontWeight:700 }}>{distractionsBlocked} distracciones</span> mientras estuviste presente.
        </div>
      </div>

      {/* Bottom: CTAs */}
      <div style={{ padding:'0 24px 36px', display:'flex', flexDirection:'column', gap:10, position:'relative', zIndex:2 }}>
        <button onClick={onStartAgain} className="mtx-tap" style={{
          width:'100%', height:54, borderRadius:18, border:0, cursor:'pointer',
          background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
          color:'#0a1410', fontSize:15, fontWeight:700,
          fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
          boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 14px 36px -10px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}>
          <IcShield size={15} stroke="currentColor" strokeWidth={2.2}/>
          Empezar otra sesión
        </button>

        <button onClick={onClose} className="mtx-tap" style={{
          width:'100%', height:50, borderRadius:16, cursor:'pointer',
          background:'rgba(255,255,255,0.04)',
          border:'0.5px solid rgba(255,255,255,0.08)',
          color:'var(--ink-1)', fontSize:14, fontWeight:600,
          fontFamily:'var(--ff-sans)',
        }}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

function CompletionStat({ label, value, unit, Ic }) {
  return (
    <div className="mtx-glass" style={{
      padding:'14px 14px', borderRadius:16,
      background:'rgba(255,255,255,0.03)',
      border:'0.5px solid rgba(255,255,255,0.06)',
      display:'flex', flexDirection:'column', gap:4,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--ink-3)' }}>
        <Ic size={11} stroke="currentColor"/>
        <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase' }}>{label}</span>
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

Object.assign(window, {
  // BreakPickerSheet y BreakActiveScreen siguen exportados por compat con
  // imports antiguos, pero el flow del Home activo ya no los usa: el descanso
  // es ahora contextual dentro de la card de apps protegidas (Fase A).
  BreakPickerSheet, BreakActiveScreen,
  ReflectionDelayScreen, CompletionScreen, SessionInterruptedScreen,
});
