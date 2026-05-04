// ── progress-report.jsx — v1
// Mi Progreso · Reportes semanales tipo Instagram Stories

// ── WEEKLY_REPORTS ──────────────────────────────────────────────────────────
const WEEKLY_REPORTS = [
  {
    id: 'w-2026-04-27',
    weekLabel: '27 abr — 3 may 2026',
    shortLabel: 'Última semana',
    isNew: true,
    stats: {
      horasRecuperadas: 8.5,
      minutosEnMentex: 147,
      racha: 6,
      rachaTotal: 12,
      contenidoCompletado: 4,
      mejorDia: 'Domingo',
      mejorDiaMin: 55,
      distribucion: [
        { label:'Audiolibros',  min:72,  color:'#6ab8ff',  icon:'IcBook'   },
        { label:'Meditaciones', min:48,  color:'#9b8aff',  icon:'IcLeaf'   },
        { label:'Sonidos',      min:27,  color:'#9bd45e',  icon:'IcSpark'  },
      ],
      diasSemana: [
        { day:'Lun', mentexMin:22 },
        { day:'Mar', mentexMin:35 },
        { day:'Mié', mentexMin:48 },
        { day:'Jue', mentexMin:18 },
        { day:'Vie', mentexMin:12 },
        { day:'Sáb', mentexMin:52 },
        { day:'Dom', mentexMin:55 },
      ],
      proyeccionAnual: { horas: 442, semanas: 52 },
      vidaRecuperada: { valor: 18, unidad: 'días' },
    }
  },
  {
    id: 'w-2026-04-20',
    weekLabel: '20 — 26 abr 2026',
    shortLabel: '20 abr',
    isNew: false,
    stats: {
      horasRecuperadas: 6.2,
      minutosEnMentex: 98,
      racha: 4,
      rachaTotal: 6,
      contenidoCompletado: 2,
      mejorDia: 'Sábado',
      mejorDiaMin: 38,
      distribucion: [
        { label:'Audiolibros',  min:55,  color:'#6ab8ff',  icon:'IcBook'   },
        { label:'Meditaciones', min:43,  color:'#9b8aff',  icon:'IcLeaf'   },
      ],
      diasSemana: [
        { day:'Lun', mentexMin:8  },
        { day:'Mar', mentexMin:0  },
        { day:'Mié', mentexMin:25 },
        { day:'Jue', mentexMin:15 },
        { day:'Vie', mentexMin:12 },
        { day:'Sáb', mentexMin:38 },
        { day:'Dom', mentexMin:0  },
      ],
      proyeccionAnual: { horas: 322, semanas: 52 },
      vidaRecuperada: { valor: 13, unidad: 'días' },
    }
  },
  {
    id: 'w-2026-04-13',
    weekLabel: '13 — 19 abr 2026',
    shortLabel: '13 abr',
    isNew: false,
    stats: {
      horasRecuperadas: 4.0,
      minutosEnMentex: 62,
      racha: 3,
      rachaTotal: 3,
      contenidoCompletado: 1,
      mejorDia: 'Martes',
      mejorDiaMin: 25,
      distribucion: [
        { label:'Meditaciones', min:37,  color:'#9b8aff',  icon:'IcLeaf'   },
        { label:'Sonidos',      min:25,  color:'#9bd45e',  icon:'IcSpark'  },
      ],
      diasSemana: [
        { day:'Lun', mentexMin:0  },
        { day:'Mar', mentexMin:25 },
        { day:'Mié', mentexMin:12 },
        { day:'Jue', mentexMin:0  },
        { day:'Vie', mentexMin:18 },
        { day:'Sáb', mentexMin:7  },
        { day:'Dom', mentexMin:0  },
      ],
      proyeccionAnual: { horas: 208, semanas: 52 },
      vidaRecuperada: { valor: 8, unidad: 'días' },
    }
  },
];

// ── SlotMachineNumber ────────────────────────────────────────────────────────
function SlotMachineNumber({ value, suffix='', prefix='', color='#3dffd1', size=80, delay=500 }) {
  const [displayed, setDisplayed] = React.useState(0);
  const [settled, setSettled] = React.useState(false);

  React.useEffect(() => {
    setDisplayed(0);
    setSettled(false);
    const tid = setTimeout(() => {
      let count = 0;
      const totalCycles = 18;
      const id = setInterval(() => {
        count++;
        if (count < totalCycles) {
          const progress = count / totalCycles;
          const spread = Math.max(1, Math.round(value * (1 - progress) * 0.8));
          setDisplayed(Math.floor(Math.random() * spread * 2) + Math.floor(value * progress * 0.9));
        } else {
          setDisplayed(value);
          setSettled(true);
          clearInterval(id);
        }
      }, 40 + count * 3);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(tid);
  }, [value, delay]);

  return (
    <div style={{ display:'inline-flex', alignItems:'baseline', gap:8 }}>
      {prefix && (
        <span style={{ fontSize:size*0.5, color, fontFamily:'var(--ff-display)', fontWeight:800 }}>{prefix}</span>
      )}
      <span style={{
        fontSize: size,
        fontWeight: 900,
        color: settled ? color : 'rgba(255,255,255,0.6)',
        fontFamily: 'var(--ff-display)',
        letterSpacing: '-0.04em',
        lineHeight: 1,
        textShadow: settled ? `0 0 40px ${color}80, 0 0 80px ${color}40` : 'none',
        transition: 'color 0.3s, text-shadow 0.3s',
      }}>{displayed}</span>
      {suffix && (
        <span style={{
          fontSize: size*0.4,
          color: settled ? color : 'rgba(255,255,255,0.5)',
          fontFamily: 'var(--ff-display)',
          fontWeight: 700,
          transition: 'color 0.3s',
        }}>{suffix}</span>
      )}
    </div>
  );
}

// ── StoryProgressBar ─────────────────────────────────────────────────────────
function StoryProgressBar({ total, current, progress }) {
  return (
    <div style={{ display:'flex', gap:4, padding:'0 16px' }}>
      {Array.from({length:total}).map((_, i) => (
        <div key={i} style={{
          flex:1, height:2.5, borderRadius:999,
          background:'rgba(255,255,255,0.25)', overflow:'hidden',
        }}>
          <div style={{
            height: '100%',
            borderRadius: 999,
            background: '#fff',
            width: i < current ? '100%' : i === current ? `${progress * 100}%` : '0%',
            transition: i === current ? 'none' : 'width 0.2s',
          }}/>
        </div>
      ))}
    </div>
  );
}

// ── DonutChart ───────────────────────────────────────────────────────────────
function DonutChart({ segments, size=160 }) {
  const [animated, setAnimated] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 400);
    return () => clearTimeout(t);
  }, []);

  const r = 58, cx = size/2, cy = size/2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.min, 0);

  let offset = 0;
  const arcs = segments.map(seg => {
    const len = (seg.min / total) * circumference;
    const arc = { ...seg, dasharray: `${len} ${circumference}`, dashoffset: -offset };
    offset += len;
    return arc;
  });

  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={18}/>
      {arcs.map((arc, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={arc.color}
          strokeWidth={18}
          strokeDasharray={animated ? arc.dasharray : `0 ${circumference}`}
          strokeDashoffset={arc.dashoffset}
          strokeLinecap="round"
          style={{ transition: `stroke-dasharray ${0.8 + i * 0.3}s cubic-bezier(.25,.8,.25,1) ${i * 0.2}s` }}
        />
      ))}
    </svg>
  );
}

// ── DayBars ──────────────────────────────────────────────────────────────────
function DayBars({ days }) {
  const [animated, setAnimated] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);
  const maxMin = Math.max(...days.map(d => d.mentexMin), 1);
  return (
    <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:100 }}>
      {days.map((d, i) => (
        <div key={d.day} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
          <div style={{
            width:'100%', flex:1, display:'flex', alignItems:'flex-end',
            borderRadius:6, overflow:'hidden',
          }}>
            <div style={{
              width: '100%',
              height: animated ? `${(d.mentexMin / maxMin) * 100}%` : '0%',
              minHeight: d.mentexMin > 0 ? 4 : 0,
              background: d.mentexMin > 20
                ? 'linear-gradient(180deg, #3dffd1, #1ab89c)'
                : d.mentexMin > 0
                  ? 'linear-gradient(180deg, #9b8aff, #6b5adf)'
                  : 'rgba(255,255,255,0.06)',
              borderRadius: '4px 4px 0 0',
              transition: `height 0.7s cubic-bezier(.25,.8,.25,1) ${i * 0.08}s`,
              boxShadow: d.mentexMin > 20 ? '0 0 12px rgba(61,255,209,0.4)' : 'none',
            }}/>
          </div>
          <span style={{ fontSize:10, color:'var(--ink-3)', fontWeight:600, fontFamily:'var(--ff-sans)' }}>{d.day}</span>
        </div>
      ))}
    </div>
  );
}

// ── WeekCalendar ─────────────────────────────────────────────────────────────
function WeekCalendar({ days }) {
  const [animated, setAnimated] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
      {days.map((d, i) => {
        const isActive = d.mentexMin > 0;
        return (
          <div key={d.day} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{
              width:38, height:38, borderRadius:999,
              background: isActive && animated ? 'linear-gradient(135deg, #3dffd1, #1ab89c)' : 'rgba(255,255,255,0.06)',
              border: isActive && animated ? 'none' : '0.5px solid rgba(255,255,255,0.1)',
              boxShadow: isActive && animated ? '0 0 16px rgba(61,255,209,0.45), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: `all 0.4s cubic-bezier(.25,.8,.25,1) ${i * 0.07}s`,
            }}>
              {isActive && animated && <IcCheck size={16} stroke="#050706" strokeWidth={2.5}/>}
            </div>
            <span style={{
              fontSize:10,
              color: isActive && animated ? '#3dffd1' : 'var(--ink-3)',
              fontWeight:600,
              fontFamily:'var(--ff-sans)',
              transition: `color 0.3s ${i * 0.07}s`,
            }}>{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ value, unit='', label, color='#3dffd1', IcComp, wide=false }) {
  return (
    <div style={{
      flex: wide ? '1 1 100%' : '1 1 calc(50% - 6px)',
      padding: '16px 14px',
      borderRadius: 20,
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(255,255,255,0.09)',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {IcComp && <IcComp size={18} stroke={color}/>}
      <div style={{ fontSize:28, fontWeight:800, color, fontFamily:'var(--ff-display)', letterSpacing:'-0.03em', lineHeight:1 }}>
        {value}<span style={{ fontSize:16, fontWeight:700 }}>{unit}</span>
      </div>
      <div style={{ fontSize:12, color:'var(--ink-3)', fontWeight:500 }}>{label}</div>
    </div>
  );
}

// ── HeroSlide ────────────────────────────────────────────────────────────────
function HeroSlide({ report }) {
  const [showArrow, setShowArrow] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setShowArrow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Particles — generated once
  const particles = React.useMemo(() => (
    Array.from({length:28}).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.1,
      delay: Math.random() * 4,
      dur: Math.random() * 3 + 3,
    }))
  ), []);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 90% 60% at 50% 40%, rgba(61,255,209,0.12) 0%, rgba(155,138,255,0.08) 40%, transparent 70%), #050706',
      padding: '0 28px',
      textAlign: 'center',
    }}>
      <style>{`
        @keyframes mtxHeroFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes mtxHeroPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.06)} }
        @keyframes mtxParticle { 0%,100%{opacity:var(--op)} 50%{opacity:calc(var(--op) * 0.3)} }
        @keyframes mtxHeroIn { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Particles */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {particles.map(p => (
          <div key={p.id} style={{
            position:'absolute',
            left:`${p.x}%`, top:`${p.y}%`,
            width: p.size, height: p.size,
            borderRadius: 999,
            background: p.id % 3 === 0 ? '#3dffd1' : p.id % 3 === 1 ? '#9b8aff' : '#fff',
            opacity: p.opacity,
            '--op': p.opacity,
            animation: `mtxParticle ${p.dur}s ${p.delay}s ease-in-out infinite`,
          }}/>
        ))}
      </div>

      {/* Glow ring behind icon */}
      <div style={{
        position:'relative',
        width:120, height:120,
        borderRadius:999,
        background:'rgba(61,255,209,0.07)',
        border:'0.5px solid rgba(61,255,209,0.2)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 0 60px rgba(61,255,209,0.2), 0 0 120px rgba(61,255,209,0.1)',
        animation:'mtxHeroFloat 4s ease-in-out infinite',
        marginBottom:32,
      }}>
        <IcBrain size={56} stroke="#3dffd1" strokeWidth={1.2}/>
        {/* inner glow ring */}
        <div style={{
          position:'absolute', inset:-12,
          borderRadius:999,
          border:'0.5px solid rgba(61,255,209,0.12)',
          animation:'mtxHeroFloat 4s ease-in-out infinite',
          animationDelay:'0.5s',
        }}/>
      </div>

      {/* Headline */}
      <div style={{
        fontSize:13, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
        color:'rgba(61,255,209,0.7)', fontFamily:'var(--ff-sans)', marginBottom:10,
        animation:'mtxHeroIn .6s .1s both',
      }}>Reporte semanal</div>
      <h1 style={{
        fontSize:40, fontWeight:900, color:'var(--ink-1)', fontFamily:'var(--ff-display)',
        letterSpacing:'-0.03em', lineHeight:1.1, margin:0, marginBottom:10,
        animation:'mtxHeroIn .6s .2s both',
      }}>Tu semana{'\n'}en Mentex</h1>
      <p style={{
        fontSize:16, color:'var(--ink-3)', fontWeight:500, fontFamily:'var(--ff-sans)',
        margin:0, marginBottom:32,
        animation:'mtxHeroIn .6s .35s both',
      }}>{report.weekLabel}</p>

      {/* CTA pill */}
      <div style={{
        display:'inline-flex', alignItems:'center', gap:8,
        background:'rgba(255,255,255,0.07)',
        border:'0.5px solid rgba(255,255,255,0.15)',
        borderRadius:999, padding:'10px 20px',
        animation:'mtxHeroIn .6s .5s both',
      }}>
        <span style={{ fontSize:14, color:'var(--ink-2)', fontWeight:600, fontFamily:'var(--ff-sans)' }}>
          Toca para descubrir
        </span>
        <IcChevR size={14} stroke="var(--ink-3)" strokeWidth={2}/>
      </div>

      {/* Pulsing arrow bottom */}
      {showArrow && (
        <div style={{
          position:'absolute', bottom:36,
          animation:'mtxHeroPulse 1.4s ease-in-out infinite',
        }}>
          <IcChevD size={22} stroke="rgba(255,255,255,0.35)" strokeWidth={2}/>
        </div>
      )}
    </div>
  );
}

// ── RecoveredSlide ───────────────────────────────────────────────────────────
function RecoveredSlide({ report }) {
  const hrs = report.stats.horasRecuperadas;
  const whole = Math.floor(hrs);
  const mins = Math.round((hrs - whole) * 60);

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(61,255,209,0.07) 0%, transparent 70%), #050706',
      padding:'0 28px', textAlign:'center',
    }}>
      <style>{`@keyframes mtxClockSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

      {/* Clock halo */}
      <div style={{
        position:'relative',
        width:90, height:90,
        borderRadius:999,
        background:'rgba(61,255,209,0.05)',
        border:'0.5px solid rgba(61,255,209,0.18)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 0 40px rgba(61,255,209,0.15)',
        marginBottom:28,
      }}>
        <IcClock size={40} stroke="#3dffd1" strokeWidth={1.2}/>
        {/* Orbital ring */}
        <div style={{
          position:'absolute', inset:-16,
          borderRadius:999,
          border:'0.5px dashed rgba(61,255,209,0.15)',
          animation:'mtxClockSpin 12s linear infinite',
        }}>
          <div style={{
            position:'absolute', top:-3, left:'50%',
            transform:'translateX(-50%)',
            width:6, height:6, borderRadius:999,
            background:'#3dffd1',
            boxShadow:'0 0 8px #3dffd1',
          }}/>
        </div>
      </div>

      <p style={{
        fontSize:18, fontWeight:700, color:'var(--ink-2)',
        fontFamily:'var(--ff-sans)', margin:'0 0 4px',
      }}>Esta semana...</p>
      <p style={{
        fontSize:22, fontWeight:800, color:'var(--ink-1)',
        fontFamily:'var(--ff-display)', letterSpacing:'-0.02em',
        margin:'0 0 28px',
      }}>...elegiste diferente</p>

      {/* Big number */}
      <SlotMachineNumber value={whole} suffix={mins > 0 ? `h ${mins}m` : 'h'} color="#3dffd1" size={88} delay={400}/>

      <p style={{
        fontSize:15, fontWeight:500, color:'var(--ink-3)',
        fontFamily:'var(--ff-sans)', margin:'16px 0 32px', lineHeight:1.5,
      }}>de redes sociales<br/>devueltas a tu vida</p>

      {/* "¿Sabías que?" card */}
      <div style={{
        width:'100%', maxWidth:320,
        padding:'14px 18px',
        borderRadius:18,
        background:'rgba(61,255,209,0.06)',
        border:'0.5px solid rgba(61,255,209,0.2)',
        display:'flex', alignItems:'flex-start', gap:12,
      }}>
        <IcSparkles size={18} stroke="#3dffd1" style={{flexShrink:0, marginTop:2}}/>
        <p style={{
          margin:0, fontSize:13, color:'var(--ink-2)',
          fontFamily:'var(--ff-sans)', lineHeight:1.55, fontWeight:500,
          textAlign:'left',
        }}>
          <strong style={{color:'#3dffd1'}}>¿Sabías que?</strong> El scroll pasivo en redes activa los mismos circuitos de ansiedad que revisar correos de trabajo.
        </p>
      </div>
    </div>
  );
}

// ── InvestmentSlide ──────────────────────────────────────────────────────────
function InvestmentSlide({ report }) {
  const { distribucion, minutosEnMentex, mejorDia, mejorDiaMin } = report.stats;
  const total = distribucion.reduce((s, d) => s + d.min, 0);

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'radial-gradient(ellipse 70% 45% at 50% 40%, rgba(155,138,255,0.1) 0%, transparent 65%), #050706',
      padding:'0 24px', textAlign:'center',
      overflowY:'auto',
    }}>
      <p style={{
        fontSize:13, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
        color:'rgba(155,138,255,0.7)', fontFamily:'var(--ff-sans)', margin:'0 0 6px',
      }}>Y las invertiste en ti</p>
      <div style={{ marginBottom:6 }}>
        <SlotMachineNumber value={minutosEnMentex} suffix="min" color="#9b8aff" size={64} delay={300}/>
      </div>
      <p style={{
        fontSize:14, color:'var(--ink-3)', fontFamily:'var(--ff-sans)',
        margin:'0 0 24px',
      }}>en contenido que te hace crecer</p>

      {/* Donut + legend */}
      <div style={{ position:'relative', marginBottom:20 }}>
        <DonutChart segments={distribucion} size={160}/>
        {/* Center label */}
        <div style={{
          position:'absolute', inset:0,
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          transform:'rotate(0deg)',
        }}>
          <span style={{ fontSize:22, fontWeight:900, color:'var(--ink-1)', fontFamily:'var(--ff-display)', letterSpacing:'-0.03em' }}>{total}</span>
          <span style={{ fontSize:11, color:'var(--ink-3)', fontWeight:600 }}>min</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%', maxWidth:280, marginBottom:20 }}>
        {distribucion.map(seg => (
          <div key={seg.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:10, height:10, borderRadius:3, background:seg.color, flexShrink:0, boxShadow:`0 0 8px ${seg.color}80` }}/>
            <span style={{ flex:1, fontSize:13, color:'var(--ink-2)', fontFamily:'var(--ff-sans)', fontWeight:500, textAlign:'left' }}>{seg.label}</span>
            <span style={{ fontSize:13, color:seg.color, fontFamily:'var(--ff-display)', fontWeight:700 }}>{seg.min} min</span>
          </div>
        ))}
      </div>

      {/* Best day badge */}
      <div style={{
        display:'inline-flex', alignItems:'center', gap:8,
        background:'rgba(255,214,107,0.08)',
        border:'0.5px solid rgba(255,214,107,0.25)',
        borderRadius:999, padding:'8px 16px',
      }}>
        <IcStar size={14} stroke="#FFD66B" fill="rgba(255,214,107,0.4)"/>
        <span style={{ fontSize:13, color:'#FFD66B', fontWeight:600, fontFamily:'var(--ff-sans)' }}>
          Tu mejor día: {mejorDia} — {mejorDiaMin} min
        </span>
      </div>
    </div>
  );
}

// ── StreakSlide ──────────────────────────────────────────────────────────────
function StreakSlide({ report }) {
  const { racha, rachaTotal, diasSemana } = report.stats;
  const msgs = [
    '',
    '¡Empezaste bien! Un día ya es un hábito.',
    '¡Dos días! La constancia se construye.',
    '¡Tres en raya! El momentum comienza.',
    '¡Cuatro días! Ya es rutina.',
    '¡Cinco días! Tu mente lo agradece.',
    '¡Seis días! Casi una semana perfecta.',
    '¡Semana perfecta! Eres imparable.',
  ];
  const msg = msgs[Math.min(racha, 7)] || '';

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'radial-gradient(ellipse 80% 50% at 50% 35%, rgba(255,214,107,0.1) 0%, rgba(255,139,106,0.06) 50%, transparent 70%), #050706',
      padding:'0 24px', textAlign:'center',
    }}>
      {/* Flame hero */}
      <div style={{
        width:80, height:80, borderRadius:999,
        background:'rgba(255,139,106,0.1)',
        border:'0.5px solid rgba(255,139,106,0.25)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 0 40px rgba(255,139,106,0.2)',
        marginBottom:20,
      }}>
        <IcFlame size={42} stroke="#ff8b6a" strokeWidth={1.3}/>
      </div>

      {/* Streak number */}
      <div style={{ marginBottom:8 }}>
        <SlotMachineNumber value={racha} suffix=" días" color="#FFD66B" size={80} delay={350}/>
      </div>
      <p style={{
        fontSize:15, color:'var(--ink-2)', fontFamily:'var(--ff-sans)',
        margin:'0 0 6px', fontWeight:500,
      }}>{racha} de 7 días con Mentex esta semana</p>
      <p style={{
        fontSize:13, color:'var(--ink-3)', fontFamily:'var(--ff-sans)',
        margin:'0 0 28px',
      }}>Racha acumulada: <strong style={{color:'#ff8b6a'}}>{rachaTotal} días</strong></p>

      {/* Calendar */}
      <div style={{ marginBottom:24, width:'100%' }}>
        <WeekCalendar days={diasSemana}/>
      </div>

      {/* Day bars */}
      <div style={{ width:'100%', marginBottom:20 }}>
        <DayBars days={diasSemana}/>
      </div>

      {/* Motivational */}
      {msg && (
        <div style={{
          padding:'12px 18px', borderRadius:16,
          background:'rgba(255,214,107,0.07)',
          border:'0.5px solid rgba(255,214,107,0.2)',
        }}>
          <p style={{ margin:0, fontSize:13, color:'#FFD66B', fontWeight:600, fontFamily:'var(--ff-sans)' }}>{msg}</p>
        </div>
      )}
    </div>
  );
}

// ── ImpactSlide ──────────────────────────────────────────────────────────────
function ImpactSlide({ report }) {
  const { vidaRecuperada, horasRecuperadas, proyeccionAnual } = report.stats;
  const [settled, setSettled] = React.useState(false);
  const [flash, setFlash] = React.useState(false);

  // Listen for the slot machine to settle (~delay + 18*50ms ≈ 1.6s)
  React.useEffect(() => {
    const t = setTimeout(() => {
      setSettled(true);
      setFlash(true);
      setTimeout(() => setFlash(false), 800);
    }, 1700);
    return () => clearTimeout(t);
  }, []);

  const stars = React.useMemo(() => (
    Array.from({length:60}).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.6 + 0.05,
      delay: Math.random() * 6,
      dur: Math.random() * 4 + 4,
    }))
  ), []);

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      textAlign:'center', padding:'0 28px',
      transition:'background 0.8s ease',
      background: flash
        ? 'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(61,255,209,0.22) 0%, rgba(61,255,209,0.08) 50%, #050706 100%)'
        : 'radial-gradient(ellipse 90% 60% at 50% 40%, rgba(93,211,255,0.12) 0%, rgba(155,138,255,0.1) 40%, #050706 100%)',
    }}>
      <style>{`
        @keyframes mtxStarTwinkle { 0%,100%{opacity:var(--op)} 50%{opacity:calc(var(--op) * 0.15)} }
        @keyframes mtxImpactIn { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes mtxImpactGlow { 0%,100%{text-shadow:0 0 40px #3dffd180,0 0 80px #3dffd140} 50%{text-shadow:0 0 80px #3dffd1cc,0 0 140px #3dffd170} }
      `}</style>

      {/* Stars */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {stars.map(s => (
          <div key={s.id} style={{
            position:'absolute',
            left:`${s.x}%`, top:`${s.y}%`,
            width:s.size, height:s.size,
            borderRadius:999,
            background:'#fff',
            opacity:s.opacity,
            '--op':s.opacity,
            animation:`mtxStarTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
          }}/>
        ))}
      </div>

      {/* Flash overlay */}
      <div style={{
        position:'absolute', inset:0,
        background:'rgba(61,255,209,0.12)',
        opacity: flash ? 1 : 0,
        transition:'opacity 0.4s ease',
        pointerEvents:'none',
        zIndex:5,
      }}/>

      <p style={{
        fontSize:16, fontWeight:600, color:'var(--ink-3)',
        fontFamily:'var(--ff-sans)', margin:'0 0 20px',
        animation:'mtxImpactIn .5s .1s both',
      }}>Si mantienes este ritmo...</p>

      {/* GIANT number */}
      <div style={{ animation:'mtxImpactIn .5s .3s both', position:'relative', zIndex:10 }}>
        <SlotMachineNumber
          value={vidaRecuperada.valor}
          color="#3dffd1"
          size={120}
          delay={500}
        />
      </div>

      {/* Unit label */}
      <div style={{
        fontSize:36, fontWeight:800,
        color: settled ? 'rgba(61,255,209,0.85)' : 'rgba(255,255,255,0.4)',
        fontFamily:'var(--ff-display)', letterSpacing:'-0.02em',
        marginTop:4, marginBottom:20,
        transition:'color 0.4s',
        animation: settled ? 'mtxImpactGlow 2.5s ease-in-out infinite' : 'none',
      }}>{vidaRecuperada.unidad}</div>

      <p style={{
        fontSize:17, fontWeight:700, color:'var(--ink-1)',
        fontFamily:'var(--ff-sans)', margin:'0 0 8px',
        lineHeight:1.4,
        animation:'mtxImpactIn .5s .6s both',
      }}>...recuperados para ti<br/>en el próximo año</p>

      <p style={{
        fontSize:12, color:'var(--ink-4)', fontFamily:'var(--ff-sans)',
        margin:'0 0 28px',
      }}>Basado en {horasRecuperadas}h/semana en Mentex</p>

      {/* Projection card */}
      <div style={{
        display:'inline-flex', alignItems:'center', gap:10,
        padding:'12px 20px', borderRadius:16,
        background:'rgba(93,211,255,0.06)',
        border:'0.5px solid rgba(93,211,255,0.2)',
        animation:'mtxImpactIn .5s .8s both',
      }}>
        <IcTrend size={16} stroke="#5dd3ff"/>
        <span style={{ fontSize:13, color:'#5dd3ff', fontWeight:600, fontFamily:'var(--ff-sans)' }}>
          {proyeccionAnual.horas}h recuperadas al año
        </span>
      </div>
    </div>
  );
}

// ── RecapSlide ───────────────────────────────────────────────────────────────
function RecapSlide({ report }) {
  const { horasRecuperadas, minutosEnMentex, racha, contenidoCompletado } = report.stats;
  const motivacional = racha >= 6
    ? '¡Semana excepcional! Sigue así.'
    : racha >= 4
      ? 'Vas por buen camino. ¡No te detengas!'
      : '¡Cada semana es una nueva oportunidad!';

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'#050706',
      padding:'0 20px', textAlign:'center',
    }}>
      <p style={{
        fontSize:13, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
        color:'rgba(255,255,255,0.4)', fontFamily:'var(--ff-sans)', margin:'0 0 6px',
      }}>Resumen</p>
      <h2 style={{
        fontSize:26, fontWeight:900, color:'var(--ink-1)', fontFamily:'var(--ff-display)',
        letterSpacing:'-0.02em', margin:'0 0 24px',
      }}>Tu semana en números</h2>

      {/* Stats grid */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:10, width:'100%', maxWidth:340, marginBottom:20 }}>
        <StatCard
          value={horasRecuperadas}
          unit="h"
          label="Horas recuperadas"
          color="#3dffd1"
          IcComp={IcClock}
        />
        <StatCard
          value={minutosEnMentex}
          unit="min"
          label="Minutos en Mentex"
          color="#9b8aff"
          IcComp={IcBrain}
        />
        <StatCard
          value={`${racha}/7`}
          unit=""
          label="Días activos"
          color="#FFD66B"
          IcComp={IcFlame}
        />
        <StatCard
          value={contenidoCompletado}
          unit=""
          label="Items completados"
          color="#ff8b6a"
          IcComp={IcCheck}
        />
      </div>

      {/* Motivational */}
      <div style={{
        width:'100%', maxWidth:320,
        padding:'14px 18px', borderRadius:18,
        background:'rgba(255,255,255,0.04)',
        border:'0.5px solid rgba(255,255,255,0.09)',
        display:'flex', alignItems:'center', gap:12,
      }}>
        <IcSparkles size={18} stroke="#FFD66B"/>
        <p style={{
          margin:0, fontSize:14, color:'var(--ink-2)',
          fontFamily:'var(--ff-sans)', fontWeight:600,
          textAlign:'left',
        }}>{motivacional}</p>
      </div>
    </div>
  );
}

// ── ShareSlide ───────────────────────────────────────────────────────────────
function ShareSlide({ report, onClose }) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    const text =
      `Esta semana recuperé ${report.stats.horasRecuperadas}h de mi vida con Mentex.\n` +
      `Invertí ${report.stats.minutosEnMentex} min en crecer. ` +
      `En un año podría recuperar ${report.stats.vidaRecuperada.valor} ${report.stats.vidaRecuperada.unidad}.\n\n` +
      `#Mentex #FocusMode #DesarrolloPersonal`;

    if (navigator.share) {
      try { await navigator.share({ title: 'Mi Progreso Semanal — Mentex', text }); } catch (_) {}
    } else {
      try { await navigator.clipboard.writeText(text); } catch (_) {}
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (window.__mtxToast) window.__mtxToast.show('Copiado al portapapeles', { duration: 2000 });
    }
  };

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'radial-gradient(ellipse 80% 55% at 50% 40%, rgba(61,255,209,0.09) 0%, rgba(155,138,255,0.07) 50%, transparent 70%), #050706',
      padding:'0 24px', textAlign:'center',
    }}>
      <style>{`@keyframes mtxShareCardIn { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }`}</style>

      {/* Trophy */}
      <div style={{
        width:72, height:72, borderRadius:999,
        background:'rgba(255,214,107,0.1)',
        border:'0.5px solid rgba(255,214,107,0.3)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 0 40px rgba(255,214,107,0.2)',
        marginBottom:16,
      }}>
        <IcTrophy size={36} stroke="#FFD66B" strokeWidth={1.3}/>
      </div>

      <h2 style={{
        fontSize:28, fontWeight:900, color:'var(--ink-1)', fontFamily:'var(--ff-display)',
        letterSpacing:'-0.02em', margin:'0 0 6px',
      }}>¡Lo estás logrando!</h2>
      <p style={{
        fontSize:14, color:'var(--ink-3)', fontFamily:'var(--ff-sans)',
        margin:'0 0 24px', lineHeight:1.5,
      }}>Semana a semana construyes<br/>una versión mejor de ti.</p>

      {/* Share card */}
      <div style={{
        width:'100%', maxWidth:320, borderRadius:22,
        background:'rgba(255,255,255,0.05)',
        border:'0.5px solid rgba(255,255,255,0.12)',
        padding:'18px 20px',
        boxShadow:'0 16px 48px rgba(0,0,0,0.5)',
        marginBottom:20,
        animation:'mtxShareCardIn .5s .2s both',
        textAlign:'left',
      }}>
        {/* Card header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:34, height:34, borderRadius:10,
              background:'linear-gradient(135deg, #3dffd1, #1ab89c)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <IcBrain size={18} stroke="#050706" strokeWidth={1.8}/>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:'var(--ink-1)', fontFamily:'var(--ff-display)', letterSpacing:'-0.01em' }}>Mentex</div>
              <div style={{ fontSize:11, color:'var(--ink-3)', fontFamily:'var(--ff-sans)' }}>Juan</div>
            </div>
          </div>
          <div style={{
            fontSize:11, color:'var(--ink-4)', fontFamily:'var(--ff-sans)',
          }}>{report.stats.racha >= 6 ? '🏆 ' : ''}{report.weekLabel}</div>
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', gap:8, marginBottom:4 }}>
          <div style={{
            flex:1, padding:'10px 12px', borderRadius:12,
            background:'rgba(61,255,209,0.07)',
            border:'0.5px solid rgba(61,255,209,0.15)',
          }}>
            <div style={{ fontSize:18, fontWeight:900, color:'#3dffd1', fontFamily:'var(--ff-display)', letterSpacing:'-0.03em', lineHeight:1 }}>{report.stats.horasRecuperadas}h</div>
            <div style={{ fontSize:10, color:'var(--ink-3)', marginTop:3 }}>recuperadas</div>
          </div>
          <div style={{
            flex:1, padding:'10px 12px', borderRadius:12,
            background:'rgba(155,138,255,0.07)',
            border:'0.5px solid rgba(155,138,255,0.15)',
          }}>
            <div style={{ fontSize:18, fontWeight:900, color:'#9b8aff', fontFamily:'var(--ff-display)', letterSpacing:'-0.03em', lineHeight:1 }}>{report.stats.minutosEnMentex}min</div>
            <div style={{ fontSize:10, color:'var(--ink-3)', marginTop:3 }}>en Mentex</div>
          </div>
          <div style={{
            flex:1, padding:'10px 12px', borderRadius:12,
            background:'rgba(255,214,107,0.07)',
            border:'0.5px solid rgba(255,214,107,0.15)',
          }}>
            <div style={{ fontSize:18, fontWeight:900, color:'#FFD66B', fontFamily:'var(--ff-display)', letterSpacing:'-0.03em', lineHeight:1 }}>{report.stats.racha}d</div>
            <div style={{ fontSize:10, color:'var(--ink-3)', marginTop:3 }}>activos</div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:320 }}>
        <button
          onClick={handleShare}
          style={{
            width:'100%', padding:'15px 24px',
            borderRadius:16, border:0, cursor:'pointer',
            background: copied ? 'rgba(61,255,209,0.15)' : 'linear-gradient(135deg, #3dffd1, #1ab89c)',
            color: copied ? '#3dffd1' : '#050706',
            fontSize:15, fontWeight:800, fontFamily:'var(--ff-sans)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            boxShadow: copied ? 'none' : '0 0 24px rgba(61,255,209,0.35)',
            transition:'all 0.3s',
          }}
        >
          <IcShare size={16} stroke={copied ? '#3dffd1' : '#050706'} strokeWidth={2}/>
          {copied ? 'Copiado al portapapeles' : 'Compartir mi progreso'}
        </button>
        <button
          onClick={onClose}
          style={{
            width:'100%', padding:'14px 24px',
            borderRadius:16, border:'0.5px solid rgba(255,255,255,0.12)',
            background:'rgba(255,255,255,0.05)', cursor:'pointer',
            color:'var(--ink-2)', fontSize:15, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ── ReportStoryPlayer ────────────────────────────────────────────────────────
function ReportStoryPlayer({ report, onClose }) {
  const TOTAL_SLIDES = 7;
  const DURATIONS = [5000, 8000, 9000, 8000, 10000, 7000, 0];

  const [current, setCurrent] = React.useState(0);
  const [segProgress, setSegProgress] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const startTime = React.useRef(Date.now());
  const rafRef = React.useRef(null);
  const pauseRef = React.useRef(false);
  const pausedProgressRef = React.useRef(0);
  const wasPausedRef = React.useRef(false);

  const goNext = React.useCallback(() => {
    if (current < TOTAL_SLIDES - 1) {
      setCurrent(c => c + 1);
      setSegProgress(0);
      startTime.current = Date.now();
    } else {
      onClose();
    }
  }, [current, onClose]);

  const goPrev = React.useCallback(() => {
    setCurrent(c => Math.max(0, c - 1));
    setSegProgress(0);
    startTime.current = Date.now();
  }, []);

  // RAF-based progress animation
  React.useEffect(() => {
    if (DURATIONS[current] === 0) return;
    startTime.current = Date.now();
    pausedProgressRef.current = 0;

    const tick = () => {
      if (pauseRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = Date.now() - startTime.current;
      const p = Math.min(1, elapsed / DURATIONS[current]);
      setSegProgress(p);
      if (p >= 1) {
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [current, goNext]);

  const handlePointerDown = React.useCallback(() => {
    pauseRef.current = true;
    wasPausedRef.current = false;
    setPaused(true);
  }, []);

  const handlePointerUp = React.useCallback((e) => {
    if (!pauseRef.current) return;
    pauseRef.current = false;
    setPaused(false);
    // Recalculate start time so progress continues from where it paused
    startTime.current = Date.now() - segProgress * DURATIONS[current];
  }, [segProgress, current]);

  const handleTap = React.useCallback((e) => {
    if (paused) return;
    const x = e.clientX;
    const w = e.currentTarget.getBoundingClientRect().width;
    if (x < w * 0.33) goPrev();
    else goNext();
  }, [paused, goPrev, goNext]);

  const SLIDE_COMPONENTS = [HeroSlide, RecoveredSlide, InvestmentSlide, StreakSlide, ImpactSlide, RecapSlide, ShareSlide];
  const CurrentSlide = SLIDE_COMPONENTS[current];

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: '#050706',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      animation: 'mtxStoryEnter .35s cubic-bezier(.25,.8,.25,1) both',
    }}>
      <style>{`
        @keyframes mtxStoryEnter { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes mtxStoryPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.05)} }
        @keyframes mtxGlowPulse { 0%,100%{box-shadow:0 0 40px rgba(61,255,209,0.19)} 50%{box-shadow:0 0 80px rgba(61,255,209,0.38)} }
        @keyframes mtxNotifInFull { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes mtxStar { 0%,100%{opacity:var(--op)} 50%{opacity:calc(var(--op)*0.2)} }
      `}</style>

      {/* Progress bar + close button */}
      <div style={{
        flexShrink: 0, paddingTop: 52, paddingBottom: 12,
        paddingLeft: 16, paddingRight: 16, zIndex: 10, position: 'relative',
      }}>
        <StoryProgressBar total={TOTAL_SLIDES} current={current} progress={segProgress}/>
        <div style={{ position:'absolute', right:16, top:48 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              width:36, height:36, borderRadius:999, border:0,
              background:'rgba(255,255,255,0.1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', cursor:'pointer',
            }}
          >
            <IcClose size={16} stroke="currentColor" strokeWidth={2}/>
          </button>
        </div>
      </div>

      {/* Slide area + tap zones */}
      <div
        style={{ flex:1, position:'relative', overflow:'hidden', cursor:'pointer' }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleTap}
      >
        <CurrentSlide report={report} onNext={goNext} onClose={onClose}/>

        {/* Pause indicator */}
        {paused && (
          <div style={{
            position:'absolute', top:'50%', left:'50%',
            transform:'translate(-50%,-50%)',
            background:'rgba(0,0,0,0.55)',
            borderRadius:999, padding:'12px 20px',
            pointerEvents:'none', zIndex:50,
            display:'flex', alignItems:'center', gap:8,
          }}>
            <div style={{ width:4, height:18, background:'#fff', borderRadius:2 }}/>
            <div style={{ width:4, height:18, background:'#fff', borderRadius:2 }}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ReportCard ───────────────────────────────────────────────────────────────
function ReportCard({ report, onOpen }) {
  const accentColor = report.isNew ? '#3dffd1' : '#9b8aff';
  const hrs = report.stats.horasRecuperadas;
  const whole = Math.floor(hrs);
  const mins = Math.round((hrs - whole) * 60);
  const hrsLabel = mins > 0 ? `${whole}h ${mins}m` : `${whole}h`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(report)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(report); } }}
      style={{
        position:'relative',
        borderRadius:22,
        background:`linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))`,
        border:`0.5px solid ${accentColor}28`,
        padding:'18px 18px 16px',
        cursor:'pointer',
        boxShadow:`0 0 0 0.5px ${accentColor}18, 0 12px 32px rgba(0,0,0,0.45)`,
        overflow:'hidden',
        marginBottom:12,
        transition:'transform 0.18s, box-shadow 0.18s',
      }}
      onPointerEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.01)';
        e.currentTarget.style.boxShadow = `0 0 0 0.5px ${accentColor}40, 0 16px 40px rgba(0,0,0,0.55)`;
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = `0 0 0 0.5px ${accentColor}18, 0 12px 32px rgba(0,0,0,0.45)`;
      }}
    >
      {/* Subtle gradient orb */}
      <div style={{
        position:'absolute', right:-30, top:-30,
        width:120, height:120, borderRadius:999,
        background:`radial-gradient(circle, ${accentColor}18, transparent 70%)`,
        pointerEvents:'none',
      }}/>

      {/* Top row */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <div style={{
            fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
            color:`${accentColor}99`, fontFamily:'var(--ff-sans)', marginBottom:4,
          }}>Reporte semanal</div>
          <div style={{
            fontSize:15, fontWeight:700, color:'var(--ink-1)',
            fontFamily:'var(--ff-display)', letterSpacing:'-0.01em',
          }}>{report.weekLabel}</div>
        </div>
        {report.isNew && (
          <div style={{
            padding:'4px 10px', borderRadius:999,
            background:'rgba(61,255,209,0.15)',
            border:'0.5px solid rgba(61,255,209,0.4)',
            fontSize:10, fontWeight:800, color:'#3dffd1',
            letterSpacing:'0.08em', textTransform:'uppercase',
            fontFamily:'var(--ff-sans)',
          }}>Nuevo</div>
        )}
      </div>

      {/* Main stat */}
      <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:10 }}>
        <span style={{
          fontSize:36, fontWeight:900, color:accentColor,
          fontFamily:'var(--ff-display)', letterSpacing:'-0.04em', lineHeight:1,
          textShadow:`0 0 20px ${accentColor}60`,
        }}>{hrsLabel}</span>
        <span style={{ fontSize:13, color:'var(--ink-3)', fontWeight:500, fontFamily:'var(--ff-sans)' }}>recuperadas</span>
      </div>

      {/* Secondary stats */}
      <div style={{ display:'flex', gap:14, marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <IcBrain size={12} stroke="var(--ink-4)"/>
          <span style={{ fontSize:12, color:'var(--ink-3)', fontFamily:'var(--ff-sans)' }}>{report.stats.minutosEnMentex} min</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <IcFlame size={12} stroke="var(--ink-4)"/>
          <span style={{ fontSize:12, color:'var(--ink-3)', fontFamily:'var(--ff-sans)' }}>{report.stats.racha}/7 días</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <IcTarget size={12} stroke="var(--ink-4)"/>
          <span style={{ fontSize:12, color:'var(--ink-3)', fontFamily:'var(--ff-sans)' }}>{report.stats.contenidoCompletado} completados</span>
        </div>
      </div>

      {/* Open button */}
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding:'8px 14px', borderRadius:999,
          background: `${accentColor}14`,
          border: `0.5px solid ${accentColor}30`,
          fontSize:12, fontWeight:700, color:accentColor,
          fontFamily:'var(--ff-sans)',
        }}>
          Abrir
          <IcChevR size={12} stroke={accentColor} strokeWidth={2.5}/>
        </div>
      </div>
    </div>
  );
}

// ── NewReportHeroBanner ──────────────────────────────────────────────────────
function NewReportHeroBanner({ report, onOpen }) {
  return (
    <div style={{ padding:'0 20px 20px' }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(report)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(report); } }}
        style={{
          borderRadius:24,
          background:'linear-gradient(135deg, rgba(61,255,209,0.12), rgba(155,138,255,0.08))',
          border:'0.5px solid rgba(61,255,209,0.3)',
          padding:'22px 22px 20px',
          cursor:'pointer',
          boxShadow:'0 0 0 0.5px rgba(61,255,209,0.12), 0 16px 48px rgba(0,0,0,0.5)',
          position:'relative', overflow:'hidden',
        }}
      >
        {/* Glow blob */}
        <div style={{
          position:'absolute', right:-20, top:-20,
          width:160, height:160,
          background:'radial-gradient(circle, rgba(61,255,209,0.15), transparent 70%)',
          pointerEvents:'none',
        }}/>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'3px 10px', borderRadius:999,
              background:'rgba(61,255,209,0.15)',
              border:'0.5px solid rgba(61,255,209,0.4)',
              marginBottom:8,
            }}>
              <div style={{ width:6, height:6, borderRadius:999, background:'#3dffd1', animation:'mtxGlowPulse 1.5s ease-in-out infinite' }}/>
              <span style={{ fontSize:10, fontWeight:800, color:'#3dffd1', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:'var(--ff-sans)' }}>
                Nuevo reporte
              </span>
            </div>
            <h3 style={{
              fontSize:20, fontWeight:900, color:'var(--ink-1)',
              fontFamily:'var(--ff-display)', letterSpacing:'-0.02em',
              margin:0,
            }}>Esta semana recuperaste</h3>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:16 }}>
          <span style={{
            fontSize:56, fontWeight:900, color:'#3dffd1',
            fontFamily:'var(--ff-display)', letterSpacing:'-0.04em', lineHeight:1,
            textShadow:'0 0 40px rgba(61,255,209,0.5)',
          }}>{report.stats.horasRecuperadas}h</span>
          <span style={{ fontSize:16, color:'var(--ink-2)', fontWeight:500, fontFamily:'var(--ff-sans)' }}>de tu vida</span>
        </div>

        <div style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'12px 16px', borderRadius:14,
          background:'rgba(255,255,255,0.05)',
          border:'0.5px solid rgba(255,255,255,0.08)',
          justifyContent:'space-between',
        }}>
          <span style={{ fontSize:14, fontWeight:600, color:'var(--ink-1)', fontFamily:'var(--ff-sans)' }}>
            Ver mi reporte completo
          </span>
          <div style={{
            width:32, height:32, borderRadius:999,
            background:'linear-gradient(135deg, #3dffd1, #1ab89c)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <IcPlay size={14} stroke="#050706" fill="#050706" strokeWidth={2}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ProgressReportGallery ────────────────────────────────────────────────────
function ProgressReportGallery({ onClose }) {
  const [openReport, setOpenReport] = React.useState(null);

  if (openReport) {
    return <ReportStoryPlayer report={openReport} onClose={() => setOpenReport(null)}/>;
  }

  const newReport = WEEKLY_REPORTS.find(r => r.isNew);
  const allReports = WEEKLY_REPORTS;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 150,
      background: '#050706',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      animation: 'mtxNotifInFull .35s cubic-bezier(.25,.8,.25,1) both',
    }}>
      <style>{`
        @keyframes mtxNotifInFull { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes mtxGlowPulse { 0%,100%{box-shadow:0 0 40px rgba(61,255,209,0.19)} 50%{box-shadow:0 0 80px rgba(61,255,209,0.38)} }
      `}</style>

      {/* Nav header */}
      <div style={{
        flexShrink:0,
        paddingTop:54, paddingBottom:0,
        paddingLeft:20, paddingRight:20,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button
            onClick={onClose}
            style={{
              width:38, height:38, borderRadius:999,
              border:'0.5px solid rgba(255,255,255,0.1)',
              background:'rgba(255,255,255,0.05)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'var(--ink-1)', flexShrink:0,
            }}
          >
            <IcChevL size={18} stroke="currentColor" strokeWidth={2}/>
          </button>
          <div>
            <h1 style={{
              fontSize:22, fontWeight:900, color:'var(--ink-1)',
              fontFamily:'var(--ff-display)', letterSpacing:'-0.02em', margin:0,
            }}>Mi Progreso</h1>
            <p style={{
              fontSize:12, color:'var(--ink-3)', fontFamily:'var(--ff-sans)',
              margin:0, marginTop:2,
            }}>Reportes semanales de tu viaje</p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        className="mtx-no-scrollbar"
        style={{ flex:1, overflowY:'auto', paddingBottom:40 }}
      >
        {/* New report hero */}
        {newReport && (
          <NewReportHeroBanner report={newReport} onOpen={setOpenReport}/>
        )}

        {/* Section label */}
        <div style={{ padding:'8px 20px 12px' }}>
          <p style={{
            fontSize:12, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase',
            color:'var(--ink-4)', fontFamily:'var(--ff-sans)', margin:0,
          }}>Todos los reportes</p>
        </div>

        {/* Report cards */}
        <div style={{ padding:'0 20px' }}>
          {allReports.map(r => (
            <ReportCard key={r.id} report={r} onOpen={setOpenReport}/>
          ))}
        </div>

        {/* Bottom note */}
        <div style={{ padding:'16px 20px 0', textAlign:'center' }}>
          <p style={{
            fontSize:12, color:'var(--ink-4)', fontFamily:'var(--ff-sans)',
            lineHeight:1.6,
          }}>
            Los reportes muestran tu progreso semanal<br/>y se actualizan cada domingo.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Star icon (needed for InvestmentSlide best day badge) ────────────────────
// IcStar is not in the global list — define a local fallback if not available
const IcStar = (typeof window !== 'undefined' && window.IcStar)
  ? window.IcStar
  : (p) => (
    <svg width={p.size || 20} height={p.size || 20} viewBox="0 0 24 24"
      fill={p.fill || 'none'} stroke={p.stroke || 'currentColor'}
      strokeWidth={p.strokeWidth || 1.5} strokeLinecap="round" strokeLinejoin="round"
      style={{flexShrink:0}}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>
    </svg>
  );

const IcTrophy = (typeof window !== 'undefined' && window.IcTrophy)
  ? window.IcTrophy
  : (p) => (
    <svg width={p.size || 20} height={p.size || 20} viewBox="0 0 24 24"
      fill={p.fill || 'none'} stroke={p.stroke || 'currentColor'}
      strokeWidth={p.strokeWidth || 1.5} strokeLinecap="round" strokeLinejoin="round"
      style={{flexShrink:0}}>
      <path d="M6 9H4a2 2 0 01-2-2V5h4M18 9h2a2 2 0 002-2V5h-4M12 17v4M8 21h8M5 5h14v4a7 7 0 01-14 0z"/>
    </svg>
  );

Object.assign(window, { ProgressReportGallery, ReportStoryPlayer });
