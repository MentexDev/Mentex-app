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
function ActivityRow({ a, onOpenPlayer }) {
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
        background: a.done ? 'rgba(61,255,209,0.15)' : 'rgba(255,255,255,0.04)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color: a.done ? 'var(--neon)' : 'var(--ink-1)',
      }}>
        {a.done
          ? <IcCheck size={20} stroke="currentColor" strokeWidth={2.5}/>
          : <a.Ic size={18} stroke="currentColor"/>
        }
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2,
                      color: a.playing ? 'var(--neon)' : 'var(--ink-3)' }}>
          {a.kind}{a.playing && ' · ahora'}
        </div>
        <div style={{ fontSize:14, fontWeight:600, color:'var(--ink-1)', textDecoration: a.done ? 'line-through' : 'none',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {a.title}
        </div>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>{a.dur}</div>
      </div>

      {a.playing ? (
        <Waveform bars={4} h={14} accent="var(--neon)"/>
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

// ── HomeActive ────────────────────────────────────────────────────────────────
function HomeActive({ tweaks, onNotif = () => {}, notifCount = 0, blockedApps = [], onOpenPlayer = () => {} }) {
  const [seconds,  setSeconds]  = React.useState(45 * 60 - 13 * 60);

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
    <div style={{ paddingTop:60, paddingBottom:200, animation:'mtx-fade-up .4s ease both' }}>

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

      {/* ── Timer card ────────────────────────────────────────────────────── */}
      <div style={{ padding:'0 20px 24px' }}>
        <div className="mtx-glass" style={{
          borderRadius:28, padding:'28px 20px 24px',
          display:'flex', flexDirection:'column', alignItems:'center',
          background:'radial-gradient(70% 80% at 50% 0%, rgba(61,255,209,0.07), transparent 60%), var(--glass-2)',
          borderColor:'rgba(61,255,209,0.12)',
          position:'relative', overflow:'hidden',
        }}>
          {/* Ambient halo */}
          <div style={{
            position:'absolute', top:-50, left:'50%', transform:'translateX(-50%)',
            width:260, height:90, borderRadius:'50%',
            background:'radial-gradient(60% 100% at 50% 50%, rgba(61,255,209,0.16), transparent 70%)',
            pointerEvents:'none', filter:'blur(24px)',
          }}/>

          {/* Ring */}
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

          {/* Sub-label */}
          <div style={{ marginTop:4, marginBottom:16, fontSize:12, color:'var(--ink-3)', textAlign:'center' }}>
            de {Math.floor(total / 60)} min · {elMin === 0 ? 'Recién empezaste' : `${elMin} min de claridad`}
          </div>

          {/* Divider */}
          <div style={{ width:'100%', height:'0.5px', background:'rgba(255,255,255,0.06)', marginBottom:16 }}/>

          {/* Apps protegidas */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, width:'100%' }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', display:'flex', alignItems:'center', gap:4 }}>
              <IcShield size={9} stroke="currentColor"/>
              Protección activa · {blockedApps.length} apps
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
              {APPS.filter(a => blockedApps.includes(a.id)).slice(0, 5).map(app => (
                <div key={app.id} style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'4px 10px 4px 4px', borderRadius:999,
                  background:'rgba(255,255,255,0.04)',
                  border:'0.5px solid rgba(255,255,255,0.06)',
                  fontSize:11, color:'var(--ink-2)',
                }}>
                  <app.Icon size={20}/>
                  {app.name}
                  <IcLock size={9} stroke="var(--neon)"/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Actividades del día ───────────────────────────────────────────── */}
      <div style={{ marginBottom:24 }}>
        <MtxSectionHead
          title="Tu ritual de hoy"
          eyebrow={`${ACTIVITIES.filter(a => a.done).length} de ${ACTIVITIES.length} completadas`}
        />
        <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'0 20px' }}>
          {ACTIVITIES.map(a => (
            <ActivityRow key={a.id} a={a} onOpenPlayer={onOpenPlayer}/>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeActive, NowPlayingScreen, ACTIVITIES });
