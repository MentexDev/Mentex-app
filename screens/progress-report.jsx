// ── progress-report.jsx — v2 ────────────────────────────────────────────────
// Mi Progreso · Reportes semanales tipo Instagram Stories
// v2: espejo emocional de transformación — ciencia del cerebro, percentil
//     cognitivo, efecto compuesto, slide tipográfico, share card aurora.

// ── BRAIN_IMPACT ─────────────────────────────────────────────────────────────
const BRAIN_IMPACT = {
  'Audiolibros':  {
    headline: 'Neuroplasticidad activa',
    detail: 'Activa 8 regiones cerebrales simultáneamente. Cada hora equivale a absorber décadas de experiencia humana condensada.',
    color: '#6ab8ff',
  },
  'Meditaciones': {
    headline: 'Cortisol reducido ~23%',
    detail: 'Aumenta la materia gris en la corteza prefrontal. Tu cerebro literalmente crece con cada práctica.',
    color: '#9b8aff',
  },
  'Sonidos':      {
    headline: 'Ondas theta / alpha',
    detail: '4–12 Hz. Inducen concentración profunda, creatividad y estado de flow sin esfuerzo consciente.',
    color: '#9bd45e',
  },
  'Series':       {
    headline: 'Memoria episódica',
    detail: 'El aprendizaje secuencial activa la retención a largo plazo y el pensamiento estructurado.',
    color: '#ff8b6a',
  },
};

// ── WEEKLY_REPORTS ───────────────────────────────────────────────────────────
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
      diasActivos: 6,
      contenidoCompletado: 4,
      distribucion: [
        { label: 'Audiolibros',  min: 72, color: '#6ab8ff' },
        { label: 'Meditaciones', min: 48, color: '#9b8aff' },
        { label: 'Sonidos',      min: 27, color: '#9bd45e' },
      ],
      proyeccionAnual: { horas: 442, dias: 18 },
      percentilAprendizaje: 94,
      equivalencias: { libros: 2.4, coaching: 4, librosAnuales: 125 },
      contenidoTitulos: ['Hábitos Atómicos', 'El Poder del Ahora', 'Focus: Deep Work', 'Sonidos Theta'],
      sabiaQue: 'El scroll pasivo en redes activa los mismos circuitos de ansiedad que revisar correos de trabajo.',
    },
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
      diasActivos: 5,
      contenidoCompletado: 2,
      distribucion: [
        { label: 'Audiolibros',  min: 55, color: '#6ab8ff' },
        { label: 'Meditaciones', min: 43, color: '#9b8aff' },
      ],
      proyeccionAnual: { horas: 322, dias: 13 },
      percentilAprendizaje: 88,
      equivalencias: { libros: 1.6, coaching: 2.5, librosAnuales: 84 },
      contenidoTitulos: ['Hábitos Atómicos', 'El Poder del Ahora'],
      sabiaQue: 'Cada hora de lectura reduce el estrés hasta un 68%, más que caminar o escuchar música.',
    },
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
      diasActivos: 3,
      contenidoCompletado: 1,
      distribucion: [
        { label: 'Meditaciones', min: 37, color: '#9b8aff' },
        { label: 'Sonidos',      min: 25, color: '#9bd45e' },
      ],
      proyeccionAnual: { horas: 208, dias: 8 },
      percentilAprendizaje: 76,
      equivalencias: { libros: 1.0, coaching: 1.5, librosAnuales: 52 },
      contenidoTitulos: ['Meditación para principiantes'],
      sabiaQue: 'La meditación de solo 8 minutos al día mejora la memoria de trabajo y la concentración.',
    },
  },
];

// ── SlotMachineNumber ─────────────────────────────────────────────────────────
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
          fontSize: size * 0.4,
          color: settled ? color : 'rgba(255,255,255,0.5)',
          fontFamily: 'var(--ff-display)',
          fontWeight: 700,
          transition: 'color 0.3s',
        }}>{suffix}</span>
      )}
    </div>
  );
}

// ── StoryProgressBar ──────────────────────────────────────────────────────────
function StoryProgressBar({ total, current, progress }) {
  return (
    <div style={{ display:'flex', gap:4 }}>
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

// ── DonutChart ────────────────────────────────────────────────────────────────
function DonutChart({ segments, size=160 }) {
  const [animated, setAnimated] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 400);
    return () => clearTimeout(t);
  }, []);

  const r = 58, cx = size / 2, cy = size / 2;
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

// ── HeroSlide ─────────────────────────────────────────────────────────────────
function HeroSlide({ report }) {
  const [showArrow, setShowArrow] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setShowArrow(true), 1500);
    return () => clearTimeout(t);
  }, []);

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
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background: [
        'radial-gradient(ellipse 80% 60% at 75% 85%, rgba(61,255,209,0.2) 0%, transparent 55%)',
        'radial-gradient(ellipse 80% 60% at 25% 15%, rgba(155,138,255,0.16) 0%, transparent 55%)',
        '#050706',
      ].join(', '),
      padding:'0 28px', textAlign:'center',
    }}>
      <style>{`
        @keyframes mtxHeroFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes mtxHeroPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.06)} }
        @keyframes mtxParticle  { 0%,100%{opacity:var(--op)} 50%{opacity:calc(var(--op)*0.3)} }
        @keyframes mtxHeroIn    { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {particles.map(p => (
          <div key={p.id} style={{
            position:'absolute',
            left:`${p.x}%`, top:`${p.y}%`,
            width:p.size, height:p.size, borderRadius:999,
            background: p.id % 3 === 0 ? '#3dffd1' : p.id % 3 === 1 ? '#9b8aff' : '#fff',
            opacity:p.opacity, '--op':p.opacity,
            animation:`mtxParticle ${p.dur}s ${p.delay}s ease-in-out infinite`,
          }}/>
        ))}
      </div>

      <div style={{
        position:'relative', width:120, height:120, borderRadius:999,
        background:'rgba(61,255,209,0.07)',
        border:'0.5px solid rgba(61,255,209,0.2)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 0 60px rgba(61,255,209,0.22), 0 0 120px rgba(61,255,209,0.1)',
        animation:'mtxHeroFloat 4s ease-in-out infinite',
        marginBottom:32,
      }}>
        <IcBrain size={56} stroke="#3dffd1" strokeWidth={1.2}/>
        <div style={{
          position:'absolute', inset:-12, borderRadius:999,
          border:'0.5px solid rgba(61,255,209,0.12)',
          animation:'mtxHeroFloat 4s ease-in-out infinite',
          animationDelay:'0.5s',
        }}/>
      </div>

      <div style={{
        fontSize:13, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
        color:'rgba(61,255,209,0.7)', fontFamily:'var(--ff-sans)', marginBottom:10,
        animation:'mtxHeroIn .6s .1s both',
      }}>Reporte semanal</div>

      <h1 style={{
        fontSize:40, fontWeight:900, color:'var(--ink-1)', fontFamily:'var(--ff-display)',
        letterSpacing:'-0.03em', lineHeight:1.1, margin:'0 0 10px',
        animation:'mtxHeroIn .6s .2s both',
      }}>Tu semana{'\n'}en Mentex</h1>

      <p style={{
        fontSize:16, color:'var(--ink-3)', fontWeight:500, fontFamily:'var(--ff-sans)',
        margin:'0 0 32px',
        animation:'mtxHeroIn .6s .35s both',
      }}>{report.weekLabel}</p>

      <div style={{
        display:'inline-flex', alignItems:'center', gap:8,
        background:'rgba(255,255,255,0.07)', border:'0.5px solid rgba(255,255,255,0.15)',
        borderRadius:999, padding:'10px 20px',
        animation:'mtxHeroIn .6s .5s both',
      }}>
        <span style={{ fontSize:14, color:'var(--ink-2)', fontWeight:600, fontFamily:'var(--ff-sans)' }}>
          Toca para descubrir
        </span>
        <IcChevR size={14} stroke="var(--ink-3)" strokeWidth={2}/>
      </div>

      {showArrow && (
        <div style={{ position:'absolute', bottom:36, animation:'mtxHeroPulse 1.4s ease-in-out infinite' }}>
          <IcChevD size={22} stroke="rgba(255,255,255,0.35)" strokeWidth={2}/>
        </div>
      )}
    </div>
  );
}

// ── RecoveredSlide ────────────────────────────────────────────────────────────
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

      <div style={{
        position:'relative', width:90, height:90, borderRadius:999,
        background:'rgba(61,255,209,0.05)', border:'0.5px solid rgba(61,255,209,0.18)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 0 40px rgba(61,255,209,0.15)', marginBottom:28,
      }}>
        <IcClock size={40} stroke="#3dffd1" strokeWidth={1.2}/>
        <div style={{
          position:'absolute', inset:-16, borderRadius:999,
          border:'0.5px dashed rgba(61,255,209,0.15)',
          animation:'mtxClockSpin 12s linear infinite',
        }}>
          <div style={{
            position:'absolute', top:-3, left:'50%', transform:'translateX(-50%)',
            width:6, height:6, borderRadius:999, background:'#3dffd1', boxShadow:'0 0 8px #3dffd1',
          }}/>
        </div>
      </div>

      <p style={{ fontSize:18, fontWeight:700, color:'var(--ink-2)', fontFamily:'var(--ff-sans)', margin:'0 0 4px' }}>
        Esta semana...
      </p>
      <p style={{ fontSize:22, fontWeight:800, color:'var(--ink-1)', fontFamily:'var(--ff-display)', letterSpacing:'-0.02em', margin:'0 0 28px' }}>
        ...elegiste diferente
      </p>

      <SlotMachineNumber value={whole} suffix={mins > 0 ? `h ${mins}m` : 'h'} color="#3dffd1" size={88} delay={400}/>

      <p style={{ fontSize:15, fontWeight:500, color:'var(--ink-3)', fontFamily:'var(--ff-sans)', margin:'16px 0 32px', lineHeight:1.5 }}>
        de redes sociales<br/>devueltas a tu vida
      </p>

      <div style={{
        width:'100%', maxWidth:320, padding:'14px 18px', borderRadius:18,
        background:'rgba(61,255,209,0.06)', border:'0.5px solid rgba(61,255,209,0.2)',
        display:'flex', alignItems:'flex-start', gap:12,
      }}>
        <IcSparkles size={18} stroke="#3dffd1" style={{flexShrink:0, marginTop:2}}/>
        <p style={{ margin:0, fontSize:13, color:'var(--ink-2)', fontFamily:'var(--ff-sans)', lineHeight:1.55, fontWeight:500, textAlign:'left' }}>
          <strong style={{color:'#3dffd1'}}>¿Sabías que?</strong>{' '}{report.stats.sabiaQue}
        </p>
      </div>
    </div>
  );
}

// ── BrainSlide ────────────────────────────────────────────────────────────────
function BrainSlide({ report }) {
  const { distribucion, minutosEnMentex } = report.stats;
  const total = distribucion.reduce((s, d) => s + d.min, 0);
  const dominant = distribucion.reduce((a, b) => a.min > b.min ? a : b);
  const impact = BRAIN_IMPACT[dominant.label] || BRAIN_IMPACT['Audiolibros'];

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background: [
        `radial-gradient(ellipse 70% 50% at 50% 30%, ${dominant.color}18 0%, transparent 65%)`,
        '#050706',
      ].join(', '),
      padding:'0 24px', textAlign:'center',
    }}>
      <style>{`@keyframes mtxBrainIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <p style={{
        fontSize:12, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
        color:'rgba(255,255,255,0.35)', fontFamily:'var(--ff-sans)', margin:'0 0 20px',
        animation:'mtxBrainIn .5s .05s both',
      }}>Tu inversión cerebral</p>

      {/* Donut + center */}
      <div style={{ position:'relative', marginBottom:18, animation:'mtxBrainIn .5s .1s both' }}>
        <DonutChart segments={distribucion} size={180}/>
        <div style={{
          position:'absolute', inset:0,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        }}>
          <span style={{ fontSize:26, fontWeight:900, color:'var(--ink-1)', fontFamily:'var(--ff-display)', letterSpacing:'-0.03em', lineHeight:1 }}>{total}</span>
          <span style={{ fontSize:11, color:'var(--ink-3)', fontWeight:600, fontFamily:'var(--ff-sans)' }}>min</span>
        </div>
      </div>

      {/* Category pills */}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap', justifyContent:'center', animation:'mtxBrainIn .5s .25s both' }}>
        {distribucion.map(seg => (
          <div key={seg.label} style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'6px 12px', borderRadius:999,
            background:`${seg.color}14`, border:`0.5px solid ${seg.color}35`,
          }}>
            <div style={{ width:6, height:6, borderRadius:999, background:seg.color, boxShadow:`0 0 6px ${seg.color}` }}/>
            <span style={{ fontSize:12, color:seg.color, fontWeight:700, fontFamily:'var(--ff-sans)' }}>{seg.label}</span>
            <span style={{ fontSize:12, color:`${seg.color}99`, fontFamily:'var(--ff-sans)', fontWeight:500 }}>{seg.min}m</span>
          </div>
        ))}
      </div>

      {/* Brain science callout */}
      <div style={{
        width:'100%', maxWidth:320, borderRadius:22,
        background:`linear-gradient(135deg, ${dominant.color}0f, ${dominant.color}06)`,
        border:`0.5px solid ${dominant.color}30`,
        padding:'18px 20px',
        boxShadow:`0 8px 32px ${dominant.color}18`,
        animation:'mtxBrainIn .5s .4s both',
        textAlign:'left',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <div style={{ width:8, height:8, borderRadius:999, background:dominant.color, boxShadow:`0 0 8px ${dominant.color}` }}/>
          <span style={{ fontSize:11, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:`${dominant.color}cc`, fontFamily:'var(--ff-sans)' }}>
            {dominant.label}
          </span>
        </div>
        <p style={{ margin:'0 0 6px', fontSize:17, fontWeight:800, color:'var(--ink-1)', fontFamily:'var(--ff-display)', letterSpacing:'-0.01em', lineHeight:1.2 }}>
          {impact.headline}
        </p>
        <p style={{ margin:0, fontSize:13, color:'var(--ink-3)', fontFamily:'var(--ff-sans)', lineHeight:1.6, fontWeight:400 }}>
          {impact.detail}
        </p>
      </div>
    </div>
  );
}

// ── CognitiveEdgeSlide ────────────────────────────────────────────────────────
function CognitiveEdgeSlide({ report }) {
  const { percentilAprendizaje, equivalencias, minutosEnMentex } = report.stats;
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  const eqCards = [
    { value: equivalencias.libros, label: 'libros leídos', unit: '', color: '#6ab8ff', suffix: ' libros', note: 'esta semana' },
    { value: equivalencias.coaching, label: 'sesiones de coaching', unit: '', color: '#3dffd1', suffix: ' sesiones', note: 'de valor equivalente' },
    { value: equivalencias.librosAnuales, label: 'libros al año', unit: '', color: '#9b8aff', suffix: ' libros/año', note: 'si mantienes el ritmo' },
  ];

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background: [
        'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(93,211,255,0.1) 0%, transparent 65%)',
        'radial-gradient(ellipse 50% 40% at 50% 100%, rgba(155,138,255,0.08) 0%, transparent 60%)',
        '#050706',
      ].join(', '),
      padding:'0 24px', textAlign:'center',
    }}>
      <style>{`@keyframes mtxEdgeIn { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }`}</style>

      <p style={{
        fontSize:12, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
        color:'rgba(93,211,255,0.6)', fontFamily:'var(--ff-sans)', margin:'0 0 12px',
        opacity: visible ? 1 : 0, transition:'opacity .4s .1s',
      }}>Tu ventaja cognitiva</p>

      {/* Percentile hero */}
      <div style={{
        display:'flex', alignItems:'flex-end', gap:4, marginBottom:8,
        opacity: visible ? 1 : 0, transition:'opacity .5s .25s, transform .5s .25s',
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
      }}>
        <SlotMachineNumber value={percentilAprendizaje} color="#5dd3ff" size={96} delay={400}/>
        <span style={{
          fontSize:28, fontWeight:700, color:'rgba(93,211,255,0.6)',
          fontFamily:'var(--ff-display)', letterSpacing:'-0.02em', paddingBottom:8,
        }}>/100</span>
      </div>

      <p style={{
        fontSize:17, fontWeight:700, color:'var(--ink-1)', fontFamily:'var(--ff-sans)',
        margin:'0 0 6px', lineHeight:1.4,
        opacity: visible ? 1 : 0, transition:'opacity .4s .45s',
      }}>
        De cada 100 adultos,<br/>
        <span style={{color:'#5dd3ff'}}>tú aprendes más que {percentilAprendizaje}</span>
      </p>

      <p style={{
        fontSize:12, color:'var(--ink-4)', fontFamily:'var(--ff-sans)',
        margin:'0 0 28px',
        opacity: visible ? 1 : 0, transition:'opacity .4s .55s',
      }}>
        El adulto promedio lee 1 libro al año
      </p>

      {/* Equivalence cards */}
      <div style={{
        display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:320,
        opacity: visible ? 1 : 0, transition:'opacity .5s .65s',
      }}>
        {eqCards.map((eq, i) => (
          <div key={i} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'14px 18px', borderRadius:18,
            background:`${eq.color}0d`, border:`0.5px solid ${eq.color}28`,
          }}>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:11, color:`${eq.color}99`, fontFamily:'var(--ff-sans)', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>
                {eq.label}
              </div>
              <div style={{ fontSize:11, color:'var(--ink-4)', fontFamily:'var(--ff-sans)' }}>{eq.note}</div>
            </div>
            <div style={{
              fontSize:24, fontWeight:900, color:eq.color,
              fontFamily:'var(--ff-display)', letterSpacing:'-0.04em', lineHeight:1,
              textShadow:`0 0 20px ${eq.color}60`,
            }}>{eq.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ProjectionSlide ───────────────────────────────────────────────────────────
function ProjectionSlide({ report }) {
  const { proyeccionAnual, horasRecuperadas, equivalencias } = report.stats;
  const [settled, setSettled] = React.useState(false);
  const [flash, setFlash] = React.useState(false);

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
      id:i, x:Math.random()*100, y:Math.random()*100,
      size:Math.random()*2+0.5, opacity:Math.random()*0.6+0.05,
      delay:Math.random()*6, dur:Math.random()*4+4,
    }))
  ), []);

  const humanCards = [
    { value:`${proyeccionAnual.horas}h`, label:'recuperadas al año', color:'#3dffd1' },
    { value:`${equivalencias.librosAnuales}`, label:'libros leídos / año', color:'#6ab8ff' },
    { value:`${proyeccionAnual.dias}`, label:'días de vida extra', color:'#9b8aff' },
  ];

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      textAlign:'center', padding:'0 28px',
      transition:'background 0.8s ease',
      background: flash
        ? 'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(61,255,209,0.22) 0%, rgba(61,255,209,0.08) 50%, #050706 100%)'
        : 'radial-gradient(ellipse 90% 60% at 50% 40%, rgba(93,211,255,0.1) 0%, rgba(155,138,255,0.08) 40%, #050706 100%)',
    }}>
      <style>{`
        @keyframes mtxStarTwinkle { 0%,100%{opacity:var(--op)} 50%{opacity:calc(var(--op)*0.15)} }
        @keyframes mtxImpactIn    { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes mtxImpactGlow  { 0%,100%{text-shadow:0 0 40px #3dffd180,0 0 80px #3dffd140} 50%{text-shadow:0 0 80px #3dffd1cc,0 0 140px #3dffd170} }
      `}</style>

      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {stars.map(s => (
          <div key={s.id} style={{
            position:'absolute', left:`${s.x}%`, top:`${s.y}%`,
            width:s.size, height:s.size, borderRadius:999, background:'#fff',
            opacity:s.opacity, '--op':s.opacity,
            animation:`mtxStarTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
          }}/>
        ))}
      </div>

      <div style={{ position:'absolute', inset:0, background:'rgba(61,255,209,0.12)', opacity:flash?1:0, transition:'opacity 0.4s ease', pointerEvents:'none', zIndex:5 }}/>

      <p style={{ fontSize:15, fontWeight:600, color:'var(--ink-3)', fontFamily:'var(--ff-sans)', margin:'0 0 16px', animation:'mtxImpactIn .5s .1s both' }}>
        Si mantienes este ritmo...
      </p>

      <div style={{ animation:'mtxImpactIn .5s .3s both', position:'relative', zIndex:10 }}>
        <SlotMachineNumber value={proyeccionAnual.dias} color="#3dffd1" size={110} delay={500}/>
      </div>

      <div style={{
        fontSize:32, fontWeight:800,
        color: settled ? 'rgba(61,255,209,0.85)' : 'rgba(255,255,255,0.4)',
        fontFamily:'var(--ff-display)', letterSpacing:'-0.02em',
        marginTop:4, marginBottom:24,
        transition:'color 0.4s',
        animation: settled ? 'mtxImpactGlow 2.5s ease-in-out infinite' : 'none',
      }}>días</div>

      <p style={{ fontSize:14, color:'var(--ink-3)', fontFamily:'var(--ff-sans)', margin:'0 0 28px', lineHeight:1.5, animation:'mtxImpactIn .5s .6s both' }}>
        devueltos a tu vida en el próximo año<br/>
        <span style={{color:'var(--ink-4)', fontSize:12}}>basado en {horasRecuperadas}h/semana en Mentex</span>
      </p>

      {/* Human equivalences */}
      <div style={{ display:'flex', gap:8, animation:'mtxImpactIn .5s .8s both' }}>
        {humanCards.map((c, i) => (
          <div key={i} style={{
            flex:1, padding:'12px 10px', borderRadius:16, textAlign:'center',
            background:`${c.color}0d`, border:`0.5px solid ${c.color}25`,
          }}>
            <div style={{ fontSize:20, fontWeight:900, color:c.color, fontFamily:'var(--ff-display)', letterSpacing:'-0.03em', lineHeight:1, marginBottom:5 }}>{c.value}</div>
            <div style={{ fontSize:10, color:'var(--ink-4)', fontFamily:'var(--ff-sans)', lineHeight:1.3 }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TransformationSlide ───────────────────────────────────────────────────────
function TransformationSlide({ report }) {
  const { minutosEnMentex, diasActivos, contenidoCompletado, rachaTotal } = report.stats;
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const pills = [
    { label:`${diasActivos}/7 días activos` },
    { label:`${contenidoCompletado} obras completadas` },
    { label:`${rachaTotal} días de racha` },
  ];

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background: [
        'radial-gradient(ellipse 60% 40% at 30% 20%, rgba(155,138,255,0.1) 0%, transparent 60%)',
        'radial-gradient(ellipse 50% 35% at 70% 80%, rgba(61,255,209,0.07) 0%, transparent 60%)',
        '#050706',
      ].join(', '),
      padding:'0 32px', textAlign:'center',
    }}>
      <style>{`
        @keyframes mtxTransIn { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Quote */}
      <div style={{ marginBottom:32 }}>
        <h2 style={{
          fontSize:28, fontWeight:900, color:'var(--ink-1)', fontFamily:'var(--ff-display)',
          letterSpacing:'-0.03em', lineHeight:1.25, margin:0,
          opacity: visible ? 1 : 0, transition:'opacity .7s .1s, transform .7s .1s',
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
        }}>
          "Cada minuto que{' '}
          <span style={{color:'#3dffd1'}}>inviertes en tu mente</span>
          {' '}te hace más difícil de engañar."
        </h2>
      </div>

      <p style={{
        fontSize:20, fontWeight:700, color:'var(--ink-2)', fontFamily:'var(--ff-display)',
        letterSpacing:'-0.02em', margin:'0 0 10px',
        opacity: visible ? 1 : 0, transition:'opacity .6s .45s, transform .6s .45s',
        transform: visible ? 'translateY(0)' : 'translateY(14px)',
      }}>
        Más difícil de distraer.
      </p>

      <p style={{
        fontSize:28, fontWeight:900, fontFamily:'var(--ff-display)',
        letterSpacing:'-0.03em', margin:'0 0 32px',
        color:'#9b8aff',
        textShadow:'0 0 40px rgba(155,138,255,0.6)',
        opacity: visible ? 1 : 0, transition:'opacity .7s .65s, transform .7s .65s',
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
      }}>
        Más libre.
      </p>

      <p style={{
        fontSize:15, color:'var(--ink-3)', fontFamily:'var(--ff-sans)', fontWeight:500,
        margin:'0 0 28px', lineHeight:1.5,
        opacity: visible ? 1 : 0, transition:'opacity .5s .85s',
      }}>
        Esta semana diste{' '}
        <strong style={{color:'var(--ink-1)'}}>{minutosEnMentex} pasos</strong>
        {' '}en esa dirección.
      </p>

      {/* Pills */}
      <div style={{
        display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', marginBottom:28,
        opacity: visible ? 1 : 0, transition:'opacity .5s 1s',
      }}>
        {pills.map((p, i) => (
          <div key={i} style={{
            padding:'7px 14px', borderRadius:999,
            background:'rgba(255,255,255,0.06)',
            border:'0.5px solid rgba(255,255,255,0.12)',
          }}>
            <span style={{ fontSize:12, color:'var(--ink-2)', fontFamily:'var(--ff-sans)', fontWeight:600 }}>{p.label}</span>
          </div>
        ))}
      </div>

      {/* Footer quote */}
      <p style={{
        fontSize:12, color:'var(--ink-4)', fontFamily:'var(--ff-sans)', fontStyle:'italic', lineHeight:1.5,
        opacity: visible ? 1 : 0, transition:'opacity .5s 1.2s',
      }}>
        "El conocimiento es el único activo<br/>que nadie te puede quitar."
      </p>
    </div>
  );
}

// ── ShareSlide ────────────────────────────────────────────────────────────────
function ShareSlide({ report, onClose }) {
  const [copied, setCopied] = React.useState(false);
  const { horasRecuperadas, minutosEnMentex, racha, diasActivos, proyeccionAnual, distribucion } = report.stats;
  const hrs = horasRecuperadas;
  const whole = Math.floor(hrs);
  const minsRem = Math.round((hrs - whole) * 60);
  const hrsLabel = minsRem > 0 ? `${whole}.${Math.round(minsRem * 10 / 60)}h` : `${whole}h`;

  const handleShare = async () => {
    const text =
      `Esta semana recuperé ${horasRecuperadas}h de mi vida con Mentex.\n` +
      `Invertí ${minutosEnMentex} min aprendiendo. ` +
      `Si mantengo el ritmo, recupero ${proyeccionAnual.dias} días en un año.\n\n` +
      `#Mentex #FocusMode #DesarrolloPersonal`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Mi Progreso Semanal — Mentex', text }); } catch (_) {}
    } else {
      try { await navigator.clipboard.writeText(text); } catch (_) {}
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      if (window.__mtxToast) window.__mtxToast.show('Copiado al portapapeles', { duration: 2000 });
    }
  };

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background: [
        'radial-gradient(ellipse 90% 70% at 15% 95%, rgba(61,255,209,0.22) 0%, transparent 55%)',
        'radial-gradient(ellipse 80% 60% at 85% 5%, rgba(155,138,255,0.2) 0%, transparent 50%)',
        'linear-gradient(160deg, #0a0820 0%, #0d1f1a 25%, #050706 55%, #100a22 100%)',
      ].join(', '),
      padding:'0 24px', textAlign:'center',
    }}>
      <style>{`
        @keyframes mtxShareGlow { 0%,100%{text-shadow:0 0 60px #3dffd1cc,0 0 120px #3dffd170} 50%{text-shadow:0 0 100px #3dffd1,0 0 180px #3dffd190} }
        @keyframes mtxShareIn   { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      {/* Mentex logo pill */}
      <div style={{
        display:'inline-flex', alignItems:'center', gap:8,
        padding:'6px 14px', borderRadius:999,
        background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.12)',
        marginBottom:28,
        animation:'mtxShareIn .5s .05s both',
      }}>
        <IcBrain size={14} stroke="#3dffd1" strokeWidth={1.5}/>
        <span style={{ fontSize:12, fontWeight:700, color:'var(--ink-2)', fontFamily:'var(--ff-sans)', letterSpacing:'0.04em' }}>MENTEX</span>
      </div>

      {/* Giant hours number */}
      <div style={{ animation:'mtxShareIn .6s .15s both', marginBottom:4 }}>
        <span style={{
          fontSize:100, fontWeight:900, color:'#3dffd1',
          fontFamily:'var(--ff-display)', letterSpacing:'-0.05em', lineHeight:1,
          animation:'mtxShareGlow 2.5s ease-in-out infinite',
          display:'block',
        }}>{horasRecuperadas}h</span>
      </div>

      <p style={{ fontSize:16, color:'var(--ink-3)', fontFamily:'var(--ff-sans)', fontWeight:500, margin:'0 0 24px', animation:'mtxShareIn .5s .3s both' }}>
        horas recuperadas esta semana
      </p>

      {/* Color distribution bar */}
      <div style={{
        display:'flex', width:'100%', maxWidth:280, height:4,
        borderRadius:999, overflow:'hidden', gap:2, marginBottom:20,
        animation:'mtxShareIn .5s .4s both',
      }}>
        {distribucion.map(seg => (
          <div key={seg.label} style={{
            flex:seg.min, background:seg.color,
            boxShadow:`0 0 8px ${seg.color}80`,
          }}/>
        ))}
      </div>
      <div style={{
        display:'flex', gap:14, marginBottom:28, justifyContent:'center',
        animation:'mtxShareIn .5s .45s both',
      }}>
        {distribucion.map(seg => (
          <div key={seg.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:6, height:6, borderRadius:999, background:seg.color }}/>
            <span style={{ fontSize:11, color:'var(--ink-4)', fontFamily:'var(--ff-sans)' }}>{seg.label}</span>
          </div>
        ))}
      </div>

      {/* Stat pills row */}
      <div style={{
        display:'flex', gap:8, marginBottom:32, justifyContent:'center',
        animation:'mtxShareIn .5s .55s both',
      }}>
        {[
          { val:`${minutosEnMentex}min`, label:'en Mentex' },
          { val:`${diasActivos}/7`, label:'días activos' },
          { val:`${proyeccionAnual.dias}días`, label:'este año' },
        ].map((s, i) => (
          <div key={i} style={{
            padding:'8px 14px', borderRadius:12,
            background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.1)',
            textAlign:'center',
          }}>
            <div style={{ fontSize:16, fontWeight:900, color:'var(--ink-1)', fontFamily:'var(--ff-display)', letterSpacing:'-0.03em', lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:10, color:'var(--ink-4)', fontFamily:'var(--ff-sans)', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bottom handle + watermark */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        width:'100%', maxWidth:280, marginBottom:24,
        animation:'mtxShareIn .5s .65s both',
      }}>
        <span style={{ fontSize:12, color:'rgba(61,255,209,0.5)', fontFamily:'var(--ff-sans)', fontWeight:600 }}>@juandiego</span>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)', fontFamily:'var(--ff-sans)' }}>mentex.app</span>
      </div>

      {/* CTA */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:300, animation:'mtxShareIn .5s .75s both' }}>
        <button
          onClick={handleShare}
          style={{
            width:'100%', padding:'15px 24px', borderRadius:16, border:0, cursor:'pointer',
            background: copied ? 'rgba(61,255,209,0.15)' : 'linear-gradient(135deg, #3dffd1, #1ab89c)',
            color: copied ? '#3dffd1' : '#050706',
            fontSize:15, fontWeight:800, fontFamily:'var(--ff-sans)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            boxShadow: copied ? 'none' : '0 0 28px rgba(61,255,209,0.4)',
            transition:'all 0.3s',
          }}
        >
          <IcShare size={16} stroke={copied ? '#3dffd1' : '#050706'} strokeWidth={2}/>
          {copied ? 'Copiado al portapapeles' : 'Compartir mi progreso'}
        </button>
        <button
          onClick={onClose}
          style={{
            width:'100%', padding:'14px 24px', borderRadius:16,
            border:'0.5px solid rgba(255,255,255,0.12)',
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

// ── ReportStoryPlayer ─────────────────────────────────────────────────────────
function ReportStoryPlayer({ report, onClose }) {
  const SLIDE_COMPONENTS = [HeroSlide, RecoveredSlide, BrainSlide, CognitiveEdgeSlide, ProjectionSlide, TransformationSlide, ShareSlide];
  const TOTAL_SLIDES = SLIDE_COMPONENTS.length;
  const DURATIONS = [5000, 8000, 9000, 9000, 10000, 9000, 0];

  const [current, setCurrent] = React.useState(0);
  const [segProgress, setSegProgress] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const startTime = React.useRef(Date.now());
  const rafRef = React.useRef(null);
  const pauseRef = React.useRef(false);

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

  React.useEffect(() => {
    if (DURATIONS[current] === 0) return;
    startTime.current = Date.now();

    const tick = () => {
      if (pauseRef.current) { rafRef.current = requestAnimationFrame(tick); return; }
      const p = Math.min(1, (Date.now() - startTime.current) / DURATIONS[current]);
      setSegProgress(p);
      if (p >= 1) { goNext(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [current, goNext]);

  const handlePointerDown = React.useCallback(() => {
    pauseRef.current = true;
    setPaused(true);
  }, []);

  const handlePointerUp = React.useCallback(() => {
    if (!pauseRef.current) return;
    pauseRef.current = false;
    setPaused(false);
    startTime.current = Date.now() - segProgress * DURATIONS[current];
  }, [segProgress, current]);

  const handleTap = React.useCallback((e) => {
    if (paused) return;
    const x = e.clientX;
    const w = e.currentTarget.getBoundingClientRect().width;
    if (x < w * 0.33) goPrev(); else goNext();
  }, [paused, goPrev, goNext]);

  const CurrentSlide = SLIDE_COMPONENTS[current];

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:200,
      background:'#050706',
      display:'flex', flexDirection:'column',
      overflow:'hidden',
      animation:'mtxStoryEnter .35s cubic-bezier(.25,.8,.25,1) both',
    }}>
      <style>{`
        @keyframes mtxStoryEnter { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      {/* Progress bar + close — flex row, no overlap */}
      <div style={{ flexShrink:0, paddingTop:52, paddingBottom:10, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, paddingLeft:16, paddingRight:16 }}>
          <div style={{ flex:1 }}>
            <StoryProgressBar total={TOTAL_SLIDES} current={current} progress={segProgress}/>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              flexShrink:0, width:32, height:32, borderRadius:999, border:0,
              background:'rgba(255,255,255,0.1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer',
            }}
          >
            <IcClose size={15} stroke="#fff" strokeWidth={2}/>
          </button>
        </div>
      </div>

      {/* Slide area */}
      <div
        style={{ flex:1, position:'relative', overflow:'hidden', cursor:'pointer' }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleTap}
      >
        <CurrentSlide report={report} onNext={goNext} onClose={onClose}/>
        {paused && (
          <div style={{
            position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
            background:'rgba(0,0,0,0.55)', borderRadius:999, padding:'12px 20px',
            pointerEvents:'none', zIndex:50,
            display:'flex', alignItems:'center', gap:6,
          }}>
            <div style={{ width:4, height:18, background:'#fff', borderRadius:2 }}/>
            <div style={{ width:4, height:18, background:'#fff', borderRadius:2 }}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ReportCard ────────────────────────────────────────────────────────────────
function ReportCard({ report, onOpen }) {
  const accentColor = report.isNew ? '#3dffd1' : '#9b8aff';
  const hrs = report.stats.horasRecuperadas;
  const whole = Math.floor(hrs);
  const minsRem = Math.round((hrs - whole) * 60);
  const hrsLabel = minsRem > 0 ? `${whole}h ${minsRem}m` : `${whole}h`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(report)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(report); } }}
      style={{
        position:'relative', borderRadius:22,
        background:'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        border:`0.5px solid ${accentColor}28`,
        padding:'18px 18px 16px', cursor:'pointer',
        boxShadow:`0 0 0 0.5px ${accentColor}18, 0 12px 32px rgba(0,0,0,0.45)`,
        overflow:'hidden', marginBottom:12,
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
      {/* Subtle orb */}
      <div style={{
        position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:999,
        background:`radial-gradient(circle, ${accentColor}18, transparent 70%)`, pointerEvents:'none',
      }}/>

      {/* Top row */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <div style={{
            fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
            color:`${accentColor}99`, fontFamily:'var(--ff-sans)', marginBottom:4,
          }}>
            {report.isNew ? (
              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                <span style={{ width:5, height:5, borderRadius:999, background:accentColor, display:'inline-block', boxShadow:`0 0 6px ${accentColor}` }}/>
                Nuevo reporte
              </span>
            ) : 'Reporte semanal'}
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--ink-1)', fontFamily:'var(--ff-display)', letterSpacing:'-0.01em' }}>
            {report.weekLabel}
          </div>
        </div>
        <div style={{
          padding:'4px 10px', borderRadius:999,
          background:`${accentColor}14`, border:`0.5px solid ${accentColor}30`,
          fontSize:10, fontWeight:800, color:accentColor,
          letterSpacing:'0.07em', textTransform:'uppercase', fontFamily:'var(--ff-sans)',
        }}>
          {report.stats.percentilAprendizaje}%
        </div>
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

      {/* Distribution bar */}
      <div style={{ display:'flex', width:'100%', height:3, borderRadius:999, overflow:'hidden', gap:1, marginBottom:12 }}>
        {report.stats.distribucion.map(seg => (
          <div key={seg.label} style={{ flex:seg.min, background:seg.color, opacity:0.7 }}/>
        ))}
      </div>

      {/* Secondary stats + CTA */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <IcBrain size={12} stroke="var(--ink-4)"/>
            <span style={{ fontSize:12, color:'var(--ink-3)', fontFamily:'var(--ff-sans)' }}>{report.stats.minutosEnMentex} min</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <IcFlame size={12} stroke="var(--ink-4)"/>
            <span style={{ fontSize:12, color:'var(--ink-3)', fontFamily:'var(--ff-sans)' }}>{report.stats.diasActivos}/7 días</span>
          </div>
        </div>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:5,
          padding:'7px 12px', borderRadius:999,
          background:`${accentColor}14`, border:`0.5px solid ${accentColor}30`,
          fontSize:12, fontWeight:700, color:accentColor, fontFamily:'var(--ff-sans)',
        }}>
          {report.isNew ? 'Ver mi historia' : 'Abrir'}
          {report.isNew
            ? <IcPlay size={11} stroke={accentColor} fill={accentColor} strokeWidth={2}/>
            : <IcChevR size={11} stroke={accentColor} strokeWidth={2.5}/>
          }
        </div>
      </div>
    </div>
  );
}

// ── ProgressReportGallery ─────────────────────────────────────────────────────
function ProgressReportGallery({ onClose }) {
  const [openReport, setOpenReport] = React.useState(null);

  if (openReport) {
    return <ReportStoryPlayer report={openReport} onClose={() => setOpenReport(null)}/>;
  }

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:150,
      background:'#050706',
      display:'flex', flexDirection:'column',
      overflow:'hidden',
      animation:'mtxNotifInFull .35s cubic-bezier(.25,.8,.25,1) both',
    }}>
      <style>{`
        @keyframes mtxNotifInFull { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      {/* Nav header */}
      <div style={{ flexShrink:0, paddingTop:54, paddingLeft:20, paddingRight:20, paddingBottom:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button
            onClick={onClose}
            style={{
              width:38, height:38, borderRadius:999,
              border:'0.5px solid rgba(255,255,255,0.1)',
              background:'rgba(255,255,255,0.05)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', flexShrink:0,
            }}
          >
            <IcChevL size={18} stroke="var(--ink-1)" strokeWidth={2}/>
          </button>
          <div>
            <h1 style={{
              fontSize:22, fontWeight:900, color:'var(--ink-1)',
              fontFamily:'var(--ff-display)', letterSpacing:'-0.02em', margin:0,
            }}>Mi Progreso</h1>
            <p style={{ fontSize:12, color:'var(--ink-3)', fontFamily:'var(--ff-sans)', margin:'2px 0 0' }}>
              Reportes semanales de tu transformación
            </p>
          </div>
        </div>
      </div>

      {/* Cards list */}
      <div className="mtx-no-scrollbar" style={{ flex:1, overflowY:'auto', paddingBottom:40 }}>
        <div style={{ padding:'0 20px' }}>
          {WEEKLY_REPORTS.map(r => (
            <ReportCard key={r.id} report={r} onOpen={setOpenReport}/>
          ))}
        </div>

        <div style={{ padding:'12px 20px 0', textAlign:'center' }}>
          <p style={{ fontSize:12, color:'var(--ink-4)', fontFamily:'var(--ff-sans)', lineHeight:1.6 }}>
            Reportes actualizados cada domingo.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Local icon fallbacks ──────────────────────────────────────────────────────
const IcStar = (typeof window !== 'undefined' && window.IcStar)
  ? window.IcStar
  : (p) => (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24"
      fill={p.fill||'none'} stroke={p.stroke||'currentColor'}
      strokeWidth={p.strokeWidth||1.5} strokeLinecap="round" strokeLinejoin="round"
      style={{flexShrink:0}}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>
    </svg>
  );

const IcTrophy = (typeof window !== 'undefined' && window.IcTrophy)
  ? window.IcTrophy
  : (p) => (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24"
      fill={p.fill||'none'} stroke={p.stroke||'currentColor'}
      strokeWidth={p.strokeWidth||1.5} strokeLinecap="round" strokeLinejoin="round"
      style={{flexShrink:0}}>
      <path d="M6 9H4a2 2 0 01-2-2V5h4M18 9h2a2 2 0 002-2V5h-4M12 17v4M8 21h8M5 5h14v4a7 7 0 01-14 0z"/>
    </svg>
  );

Object.assign(window, { ProgressReportGallery, ReportStoryPlayer });
