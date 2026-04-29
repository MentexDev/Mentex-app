// profile.jsx — Pantalla de perfil con logros (v1)

const ACHIEVEMENTS = [
  { id:'mente-acero',    name:'Mente de Acero',  tagline:'30 días seguidos con enfoque',         current:12, total:30,  unit:'días',        Ic:IcShield, accent:'#FFD66B', rarity:'Épico',      glow:'rgba(255,214,107,0.45)' },
  { id:'maraton-mental', name:'Maratón Mental',  tagline:'100 horas totales en foco profundo',    current:47, total:100, unit:'horas',       Ic:IcTarget, accent:'#3dffd1', rarity:'Raro',       glow:'rgba(61,255,209,0.45)'  },
  { id:'sabio-naciente', name:'Sabio Naciente',  tagline:'50 contenidos completados',             current:23, total:50,  unit:'contenidos',  Ic:IcBook,   accent:'#9b8aff', rarity:'Raro',       glow:'rgba(155,138,255,0.45)' },
  { id:'guerrero-zen',   name:'Guerrero Zen',    tagline:'7 días consecutivos sin distracciones', current:4,  total:7,   unit:'días',        Ic:IcLeaf,   accent:'#ff8b6a', rarity:'Legendario', glow:'rgba(255,139,106,0.45)' },
];


// ── AchievementBadge ──────────────────────────────────────────────────────────
function AchievementBadge({ Ic, accent, size = 64 }) {
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <style>{`
        @keyframes mtxBadgeRotate { to { transform:rotate(360deg); } }
        @keyframes mtxBadgePulse  { 0%,100% { opacity:0.55; } 50% { opacity:0.95; } }
      `}</style>
      <div style={{
        position:'absolute', inset:-3, borderRadius:'50%',
        background:`conic-gradient(from 0deg, transparent 0%, ${accent}cc 25%, transparent 50%, ${accent}88 75%, transparent 100%)`,
        animation:'mtxBadgeRotate 5s linear infinite',
        filter:'blur(6px)', opacity:0.6,
      }}/>
      <div style={{
        position:'absolute', inset:0, borderRadius:'50%',
        background:`radial-gradient(60% 60% at 50% 30%, ${accent}55, ${accent}1a 70%, transparent 100%)`,
        border:`1.5px solid ${accent}88`,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:`0 0 24px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -8px 16px ${accent}22`,
      }}>
        <Ic size={size * 0.42} stroke={accent} strokeWidth={1.6}/>
      </div>
      <div style={{
        position:'absolute', top:-2, right:6, width:4, height:4, borderRadius:'50%',
        background:accent, boxShadow:`0 0 8px ${accent}`,
        animation:'mtxBadgePulse 1.8s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', bottom:4, left:-2, width:3, height:3, borderRadius:'50%',
        background:accent, boxShadow:`0 0 6px ${accent}`,
        animation:'mtxBadgePulse 2.4s ease-in-out 0.6s infinite',
      }}/>
    </div>
  );
}


// ── AchievementCard ───────────────────────────────────────────────────────────
function AchievementCard({ a }) {
  const pct  = a.current / a.total;
  const left = a.total - a.current;

  return (
    <div className="mtx-glass" style={{
      width:308, flexShrink:0,
      scrollSnapAlign:'center',
      borderRadius:24, padding:'14px 16px 16px',
      background:`
        linear-gradient(180deg, ${a.accent}14, transparent 50%),
        radial-gradient(120% 80% at 100% 0%, ${a.accent}1f, transparent 60%),
        var(--glass-2)
      `,
      borderColor:`${a.accent}33`,
      boxShadow:`0 12px 32px -16px ${a.glow}, 0 0 0 0.5px ${a.accent}22, inset 0 1px 0 rgba(255,255,255,0.04)`,
      position:'relative', overflow:'hidden',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span className="mtx-eyebrow" style={{ fontSize:9, fontWeight:700, color:'var(--ink-3)', letterSpacing:'0.14em' }}>
          Logro en curso
        </span>
        <span style={{
          fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
          padding:'3px 8px', borderRadius:999,
          background:`${a.accent}1a`, color:a.accent,
          border:`0.5px solid ${a.accent}44`,
        }}>
          {a.rarity}
        </span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
        <AchievementBadge Ic={a.Ic} accent={a.accent} size={64}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', lineHeight:1.15, marginBottom:3 }}>
            {a.name}
          </div>
          <div style={{ fontSize:11, color:'var(--ink-3)', lineHeight:1.35 }}>
            {a.tagline}
          </div>
        </div>
      </div>

      <div style={{ position:'relative', height:6, borderRadius:999, background:'rgba(255,255,255,0.06)', overflow:'hidden', marginBottom:10 }}>
        <div style={{
          position:'absolute', inset:0,
          width:`${Math.round(pct * 100)}%`,
          background:`linear-gradient(90deg, ${a.accent}aa, ${a.accent})`,
          borderRadius:999,
          boxShadow:`0 0 12px ${a.accent}88`,
        }}/>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
          <span style={{
            fontSize:20, fontWeight:700, color:'var(--ink-1)',
            fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em',
            fontFamily:'var(--ff-display)',
          }}>{a.current}</span>
          <span style={{ fontSize:12, color:'var(--ink-3)' }}>de {a.total} {a.unit}</span>
        </div>
        <span style={{ fontSize:13, fontWeight:700, color:a.accent, fontVariantNumeric:'tabular-nums' }}>
          {Math.round(pct * 100)}%
        </span>
      </div>

      <div style={{ marginTop:6, fontSize:10, color:'var(--ink-3)' }}>
        Faltan {left} {a.unit} para desbloquear
      </div>
    </div>
  );
}


// ── ProfileScreen ─────────────────────────────────────────────────────────────
function ProfileScreen({ onNotif = () => {}, notifCount = 0 }) {
  return (
    <div style={{ paddingTop:60, paddingBottom:120, animation:'mtx-fade-up .4s ease both' }}>

      {/* Header */}
      <div style={{ padding:'8px 20px 20px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ flex:1 }}>
          <div className="mtx-eyebrow" style={{ marginBottom:6, color:'var(--neon)' }}>Perfil</div>
          <h1 className="mtx-h-1" style={{ margin:0, color:'var(--ink-1)', fontSize:26, fontWeight:800, letterSpacing:'-0.03em' }}>
            Hola, Juan
          </h1>
          <p style={{ margin:'6px 0 0', fontSize:13, color:'var(--ink-3)' }}>
            Cada día construyes una mente más afilada.
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

      {/* Avatar + nombre */}
      <div style={{ padding:'0 20px 24px', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
        <div style={{
          width:88, height:88, borderRadius:'50%',
          background:'radial-gradient(60% 60% at 50% 30%, rgba(61,255,209,0.4), rgba(61,255,209,0.1))',
          border:'1.5px solid rgba(61,255,209,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 0 32px rgba(61,255,209,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
          color:'var(--neon)', fontSize:32, fontWeight:700,
          fontFamily:'var(--ff-display)', letterSpacing:'-0.02em',
        }}>
          J
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em' }}>
            Juan Diego
          </div>
          <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>
            Nivel 7 · Mente Despierta
          </div>
        </div>
      </div>

      {/* Puntuación Mentex hero */}
      <MtxScoreHero score={78} delta={12} weekData={[58, 64, 70, 68, 75, 72, 78]}/>

      {/* Logros en curso */}
      <div style={{ marginBottom:24 }}>
        <div style={{ padding:'0 20px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--neon)', letterSpacing:'0.14em', marginBottom:3 }}>
              Tu progreso
            </div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em' }}>
              Logros en curso
            </h2>
          </div>
          <span style={{ fontSize:11, color:'var(--ink-3)' }}>{ACHIEVEMENTS.length} activos</span>
        </div>

        <div style={{
          display:'flex', gap:12,
          overflowX:'auto', overflowY:'hidden',
          padding:'4px 20px 12px',
          scrollSnapType:'x mandatory',
          scrollPaddingLeft:20,
          WebkitOverflowScrolling:'touch',
        }}>
          {ACHIEVEMENTS.map(a => <AchievementCard key={a.id} a={a}/>)}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProfileScreen });
