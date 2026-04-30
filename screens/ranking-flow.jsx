// ranking-flow.jsx — Leaderboard semanal estilo eSports / Apple Sport

// ── Mock data: 30 usuarios con horas distribuidas por categoría ─────────────
// Nota: cada user tiene horas total + por categoría (audiobook/meditation/series/talk/sound)
//        + streak + movement (subió/bajó/igual desde la semana pasada)
const _RANKING_USERS = [
  { id:'tomas',    name:'Tomás Mendoza',    initial:'T', accent:'#5dd3ff', tagline:'Curioso profesional',     hours:{ total:312, audiobook:142, meditation:38, series:62, talk:48, sound:22 }, streak:45, movement:'up',   delta:1 },
  { id:'andres',   name:'Andrés Castaño',   initial:'A', accent:'#3dffd1', tagline:'Aprendiendo en deep work', hours:{ total:226, audiobook:98,  meditation:18, series:42, talk:54, sound:14 }, streak:38, movement:'down', delta:1 },
  { id:'mariana',  name:'Mariana Soto',     initial:'M', accent:'#9b8aff', tagline:'Lectora obsesiva',         hours:{ total:184, audiobook:134, meditation:8,  series:12, talk:22, sound:8  }, streak:28, movement:'up',   delta:2 },
  { id:'isabella', name:'Isabella Peña',    initial:'I', accent:'#ff8b6a', tagline:'Diseñadora & filósofa',    hours:{ total:156, audiobook:48,  meditation:32, series:24, talk:42, sound:10 }, streak:21, movement:'same', delta:0 },
  { id:'rodrigo',  name:'Rodrigo Lara',     initial:'R', accent:'#9bd45e', tagline:'Calma y enfoque',          hours:{ total:134, audiobook:24,  meditation:48, series:18, talk:14, sound:30 }, streak:17, movement:'up',   delta:3 },
  { id:'sofia-a',  name:'Sofía Aguilar',    initial:'S', accent:'#FFD66B', tagline:'Curadora del silencio',    hours:{ total:128, audiobook:42,  meditation:36, series:20, talk:18, sound:12 }, streak:15, movement:'down', delta:2 },
  { id:'mateo',    name:'Mateo Rodríguez',  initial:'M', accent:'#5dd3ff', tagline:'Filósofo amateur',         hours:{ total:118, audiobook:58,  meditation:14, series:12, talk:24, sound:10 }, streak:23, movement:'up',   delta:1 },
  { id:'valeria',  name:'Valeria Cruz',     initial:'V', accent:'#9b8aff', tagline:'Estoica práctica',         hours:{ total:112, audiobook:36,  meditation:42, series:8,  talk:18, sound:8  }, streak:19, movement:'same', delta:0 },
  { id:'lucia',    name:'Lucía Rivera',     initial:'L', accent:'#FFD66B', tagline:'Buscando claridad',        hours:{ total:98,  audiobook:38,  meditation:18, series:14, talk:22, sound:6  }, streak:14, movement:'down', delta:3 },
  { id:'diego-b',  name:'Diego Bermúdez',   initial:'D', accent:'#3dffd1', tagline:'Productividad consciente', hours:{ total:96,  audiobook:46,  meditation:8,  series:18, talk:18, sound:6  }, streak:12, movement:'up',   delta:2 },
  { id:'camila',   name:'Camila Núñez',     initial:'C', accent:'#ff8b6a', tagline:'Hábitos pequeños, cambios grandes', hours:{ total:88, audiobook:24, meditation:28, series:14, talk:16, sound:6 }, streak:11, movement:'same', delta:0 },
  { id:'pablo',    name:'Pablo Restrepo',   initial:'P', accent:'#9bd45e', tagline:'Mente quieta, ojos abiertos', hours:{ total:82, audiobook:18, meditation:32, series:6, talk:14, sound:12 }, streak:24, movement:'up', delta:5 },
  { id:'ana-m',    name:'Ana María Torres', initial:'A', accent:'#5dd3ff', tagline:'Aprendiz eterna',          hours:{ total:74,  audiobook:32,  meditation:16, series:8,  talk:12, sound:6  }, streak:9,  movement:'down', delta:1 },
  { id:'me',       name:'Tú · Juan Diego',  initial:'J', accent:'#3dffd1', tagline:'Mente despierta',          hours:{ total:47,  audiobook:18,  meditation:12, series:6,  talk:8,  sound:3  }, streak:12, movement:'up',   delta:2, isMe:true },
  { id:'felipe',   name:'Felipe Quintero',  initial:'F', accent:'#FFD66B', tagline:'Disciplina sin rigidez',   hours:{ total:42,  audiobook:14,  meditation:6,  series:8,  talk:10, sound:4  }, streak:6,  movement:'up',   delta:4 },
  { id:'natalia',  name:'Natalia Ospina',   initial:'N', accent:'#9b8aff', tagline:'Contemplativa urbana',     hours:{ total:38,  audiobook:8,   meditation:18, series:4,  talk:6,  sound:2  }, streak:8,  movement:'same', delta:0 },
  { id:'carlos-v', name:'Carlos Velasco',   initial:'C', accent:'#ff8b6a', tagline:'Builder de cosas inútiles', hours:{ total:34, audiobook:16, meditation:4, series:6, talk:6, sound:2 }, streak:5, movement:'down', delta:2 },
  { id:'paola',    name:'Paola Castro',     initial:'P', accent:'#9bd45e', tagline:'Naturaleza como maestra',   hours:{ total:30,  audiobook:6,   meditation:10, series:4,  talk:4,  sound:6  }, streak:7,  movement:'up',   delta:1 },
  { id:'sebas',    name:'Sebastián Marín',  initial:'S', accent:'#5dd3ff', tagline:'Curiosidad infinita',      hours:{ total:28,  audiobook:14,  meditation:4,  series:4,  talk:4,  sound:2  }, streak:4,  movement:'same', delta:0 },
  { id:'lina',     name:'Lina Pacheco',     initial:'L', accent:'#3dffd1', tagline:'Productividad zen',        hours:{ total:24,  audiobook:8,   meditation:8,  series:2,  talk:4,  sound:2  }, streak:3,  movement:'up',   delta:6 },
  { id:'jorge',    name:'Jorge Henao',      initial:'J', accent:'#9b8aff', tagline:'Pensador silencioso',      hours:{ total:22,  audiobook:10,  meditation:4,  series:2,  talk:4,  sound:2  }, streak:5,  movement:'down', delta:3 },
  { id:'daniela',  name:'Daniela Gómez',    initial:'D', accent:'#ff8b6a', tagline:'Diseñadora del descanso',  hours:{ total:20,  audiobook:4,   meditation:8,  series:2,  talk:2,  sound:4  }, streak:6,  movement:'up',   delta:2 },
  { id:'ignacio',  name:'Ignacio Salas',    initial:'I', accent:'#FFD66B', tagline:'Estudiante perpetuo',      hours:{ total:18,  audiobook:6,   meditation:4,  series:2,  talk:4,  sound:2  }, streak:2,  movement:'same', delta:0 },
  { id:'silvia',   name:'Silvia Mejía',     initial:'S', accent:'#9bd45e', tagline:'Ritmo lento, profundo',    hours:{ total:16,  audiobook:4,   meditation:6,  series:2,  talk:2,  sound:2  }, streak:4,  movement:'up',   delta:1 },
  { id:'oscar',    name:'Óscar Vélez',      initial:'O', accent:'#5dd3ff', tagline:'Calladamente curioso',     hours:{ total:14,  audiobook:6,   meditation:2,  series:2,  talk:2,  sound:2  }, streak:1,  movement:'down', delta:4 },
  { id:'rosa',     name:'Rosa Linares',     initial:'R', accent:'#3dffd1', tagline:'Pequeñas dosis diarias',   hours:{ total:12,  audiobook:4,   meditation:4,  series:1,  talk:2,  sound:1  }, streak:3,  movement:'same', delta:0 },
  { id:'leo',      name:'Leonardo Ríos',    initial:'L', accent:'#9b8aff', tagline:'Inquieto y reflexivo',     hours:{ total:10,  audiobook:4,   meditation:2,  series:1,  talk:2,  sound:1  }, streak:2,  movement:'up',   delta:3 },
  { id:'gabriela', name:'Gabriela Mora',    initial:'G', accent:'#ff8b6a', tagline:'Buscadora de significado',  hours:{ total:8,   audiobook:2,   meditation:2,  series:1,  talk:2,  sound:1  }, streak:1,  movement:'down', delta:1 },
  { id:'andrea',   name:'Andrea Patiño',    initial:'A', accent:'#FFD66B', tagline:'Aprende oyendo',           hours:{ total:6,   audiobook:2,   meditation:1,  series:1,  talk:1,  sound:1  }, streak:1,  movement:'up',   delta:2 },
  { id:'roberto',  name:'Roberto Salazar',  initial:'R', accent:'#9bd45e', tagline:'Curiosidad serena',        hours:{ total:4,   audiobook:1,   meditation:1,  series:1,  talk:1,  sound:0  }, streak:1,  movement:'same', delta:0 },
];

// Categorías del ranking — incluye "Todas" + las 5 de contenido
const _RANK_CATEGORIES = [
  { id:'all',        label:'General',     unit:'hrs',  Ic:IcTrophy },
  { id:'audiobook',  label:'Audiolibros', unit:'hrs',  Ic:IcBook },
  { id:'meditation', label:'Meditación',  unit:'hrs',  Ic:IcLeaf },
  { id:'series',     label:'Series',      unit:'hrs',  Ic:IcTarget },
  { id:'talk',       label:'Charlas',     unit:'hrs',  Ic:IcMic },
  { id:'sound',      label:'Sonidos',     unit:'hrs',  Ic:IcWind },
];

// Tier colors para top 3
const _TIER_GOLD   = { primary:'#FFD66B', deep:'#d4a02a', glow:'rgba(255,214,107,0.6)',  label:'Oro'    };
const _TIER_SILVER = { primary:'#dde2ea', deep:'#8a92a0', glow:'rgba(221,226,234,0.45)', label:'Plata'  };
const _TIER_BRONZE = { primary:'#d4955a', deep:'#8c5a3a', glow:'rgba(212,149,90,0.45)',  label:'Bronce' };

// ── Avatar — versión específica del ranking (con borde tier opcional) ──────
function RankAvatar({ user, size = 40, tier = null }) {
  if (!user) return null;
  const accent = user.accent || '#3dffd1';
  const tierBorder = tier ? `2px solid ${tier.primary}` : `0.5px solid ${accent}66`;
  const tierShadow = tier
    ? `0 0 22px ${tier.glow}, inset 0 1px 0 rgba(255,255,255,0.18)`
    : `0 0 12px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.12)`;
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background:`linear-gradient(135deg, ${accent}55, ${accent}1a)`,
      border: tierBorder,
      display:'flex', alignItems:'center', justifyContent:'center',
      color: accent, fontSize: Math.round(size * 0.42), fontWeight:700,
      fontFamily:'var(--ff-display)', letterSpacing:'-0.02em',
      boxShadow: tierShadow,
    }}>
      {user.initial || '?'}
    </div>
  );
}

// ── Movement indicator ─────────────────────────────────────────────────────
function MovementIndicator({ movement, delta }) {
  if (movement === 'same' || delta === 0) {
    return (
      <span style={{
        display:'inline-flex', alignItems:'center', gap:3,
        fontSize:10.5, fontWeight:700, color:'var(--ink-3)',
        letterSpacing:'-0.005em',
      }}>
        <span style={{ width:8, height:1.5, background:'currentColor', borderRadius:1, opacity:0.6 }}/>
      </span>
    );
  }
  const isUp = movement === 'up';
  const color = isUp ? '#9bd45e' : '#ff8b8b';
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:2,
      fontSize:10.5, fontWeight:700, color,
      letterSpacing:'-0.005em', fontVariantNumeric:'tabular-nums',
    }}>
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {isUp ? <path d="M6 9V3M3 6l3-3 3 3"/> : <path d="M6 3v6M3 6l3 3 3-3"/>}
      </svg>
      {delta}
    </span>
  );
}

// ── ResetCountdown — tiempo restante hasta el próximo reset semanal ─────────
function ResetCountdown() {
  // Mock fixed: "3 d 14 h 22 m". Aquí podríamos calcular dinámico al próximo Lunes 00:00
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'5px 10px', borderRadius:999,
      background:'rgba(255,214,107,0.1)',
      border:'0.5px solid rgba(255,214,107,0.28)',
      color:'#FFD66B',
      fontSize:10.5, fontWeight:700, fontFamily:'var(--ff-sans)',
      letterSpacing:'-0.005em', fontVariantNumeric:'tabular-nums',
      boxShadow:'inset 0 0 8px rgba(255,214,107,0.08)',
    }}>
      <IcClock size={10} stroke="currentColor" strokeWidth={1.8}/>
      Reset en 3d 14h
    </div>
  );
}

// ── PodiumPedestal — base con el número grande y gradiente del tier ────────
function PodiumPedestal({ position, height, tier }) {
  return (
    <div style={{
      width:'85%',
      height,
      marginTop:8,
      borderRadius:'10px 10px 2px 2px',
      background: `linear-gradient(180deg, ${tier.primary}, ${tier.deep})`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -8px 16px rgba(0,0,0,0.18), 0 -6px 18px ${tier.glow}, 0 4px 0 rgba(0,0,0,0.45)`,
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'rgba(0,0,0,0.55)',
      fontSize: position === 1 ? 36 : 28, fontWeight:900,
      fontFamily:'var(--ff-display)', letterSpacing:'-0.04em',
      fontVariantNumeric:'tabular-nums',
      textShadow:'0 1px 0 rgba(255,255,255,0.4)',
      position:'relative', overflow:'hidden',
    }}>
      {/* Shine sweep sutil */}
      <div style={{
        position:'absolute', top:0, bottom:0, width:30,
        background:'linear-gradient(120deg, transparent, rgba(255,255,255,0.4), transparent)',
        animation:`mtxPodiumShine${position} 4.5s ease-in-out ${position * 0.4}s infinite`,
      }}/>
      <style>{`
        @keyframes mtxPodiumShine1 { 0% { left:-30%; } 60%, 100% { left:130%; } }
        @keyframes mtxPodiumShine2 { 0% { left:-30%; } 60%, 100% { left:130%; } }
        @keyframes mtxPodiumShine3 { 0% { left:-30%; } 60%, 100% { left:130%; } }
      `}</style>
      {position}
    </div>
  );
}

// ── PodiumColumn — una "torre" del podio (avatar + meta + pedestal) ────────
function PodiumColumn({ user, position, tier, hours, unit }) {
  if (!user) return null;
  const isFirst = position === 1;
  const avatarSize = isFirst ? 64 : 52;
  const pedestalHeight = isFirst ? 84 : (position === 2 ? 64 : 50);

  return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column', alignItems:'center',
      position:'relative', zIndex: isFirst ? 2 : 1,
      paddingTop: isFirst ? 0 : 18,
    }}>
      {/* Crown solo en #1 */}
      {isFirst && (
        <div style={{
          marginBottom:6, color: tier.primary,
          filter:`drop-shadow(0 0 8px ${tier.glow})`,
          animation:'mtxCrownFloat 3s ease-in-out infinite',
        }}>
          <IcCrown size={20} stroke="currentColor"/>
        </div>
      )}
      <style>{`
        @keyframes mtxCrownFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-3px); } }
      `}</style>

      <RankAvatar user={user} size={avatarSize} tier={tier}/>

      <div style={{
        marginTop:8,
        fontSize:isFirst ? 12.5 : 11.5, fontWeight:700,
        color:'var(--ink-1)', letterSpacing:'-0.005em',
        textAlign:'center', maxWidth:'95%',
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
      }}>
        {user.name.replace('Tú · ', '')}
      </div>

      <div style={{
        fontSize: isFirst ? 18 : 15, fontWeight:800,
        color: tier.primary,
        fontVariantNumeric:'tabular-nums', letterSpacing:'-0.025em',
        fontFamily:'var(--ff-display)', lineHeight:1, marginTop:4,
        textShadow:`0 0 12px ${tier.glow}`,
      }}>
        {hours}<span style={{ fontSize: isFirst ? 10 : 9, fontWeight:600, marginLeft:2, opacity:0.8 }}>{unit}</span>
      </div>

      {/* Streak chip mini bajo el name */}
      {user.streak > 0 && (
        <div style={{
          marginTop:5, display:'inline-flex', alignItems:'center', gap:3,
          padding:'2px 7px', borderRadius:999,
          background:'rgba(255,140,90,0.12)',
          border:'0.5px solid rgba(255,140,90,0.3)',
          color:'#ff8b6a', fontSize:9.5, fontWeight:700,
          fontVariantNumeric:'tabular-nums', letterSpacing:'-0.005em',
        }}>
          <IcFlame size={9} stroke="currentColor"/>
          {user.streak}
        </div>
      )}

      <PodiumPedestal position={position} height={pedestalHeight} tier={tier}/>
    </div>
  );
}

// ── PodiumStand — los 3 mejores con podio dramatic ─────────────────────────
function PodiumStand({ ranking, unit }) {
  if (!ranking || ranking.length < 3) return null;
  const first = ranking[0];
  const second = ranking[1];
  const third = ranking[2];

  return (
    <div style={{
      padding:'24px 14px 6px',
      display:'flex', alignItems:'flex-end', justifyContent:'center', gap:8,
      position:'relative',
    }}>
      {/* Background halo radial neon detrás del podio */}
      <div style={{
        position:'absolute', top:'10%', left:'15%', right:'15%', bottom:'-10%',
        background:'radial-gradient(50% 60% at 50% 30%, rgba(255,214,107,0.14) 0%, transparent 60%)',
        pointerEvents:'none', zIndex:0,
      }}/>

      <PodiumColumn user={second} position={2} tier={_TIER_SILVER} hours={ranking[1].displayHours} unit={unit}/>
      <PodiumColumn user={first}  position={1} tier={_TIER_GOLD}   hours={ranking[0].displayHours} unit={unit}/>
      <PodiumColumn user={third}  position={3} tier={_TIER_BRONZE} hours={ranking[2].displayHours} unit={unit}/>
    </div>
  );
}

// ── RankRow — fila compacta de la lista #4..#30 + tu posición ───────────────
function RankRow({ user, position, hours, unit }) {
  if (!user) return null;
  const accent = user.accent || '#3dffd1';
  const isMe = !!user.isMe;

  return (
    <div className="mtx-glass" style={{
      display:'flex', alignItems:'center', gap:11,
      padding:'10px 12px', borderRadius:14,
      background: isMe
        ? `linear-gradient(180deg, ${accent}1a, ${accent}06)`
        : 'rgba(255,255,255,0.025)',
      border: isMe ? `0.5px solid ${accent}55` : '0.5px solid rgba(255,255,255,0.06)',
      boxShadow: isMe ? `0 0 0 0.5px ${accent}26, 0 8px 22px -10px ${accent}55` : 'none',
      fontFamily:'var(--ff-sans)', position:'relative',
    }}>
      {/* Position number */}
      <div style={{
        width:26, flexShrink:0, textAlign:'center',
        fontSize:13, fontWeight:800,
        color: isMe ? accent : 'var(--ink-3)',
        fontVariantNumeric:'tabular-nums', letterSpacing:'-0.01em',
        fontFamily:'var(--ff-display)',
      }}>
        {position}
      </div>

      <RankAvatar user={user} size={36}/>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{
            fontSize:13, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.005em',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
            {user.name}
          </span>
          {isMe && (
            <span style={{
              fontSize:8.5, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase',
              padding:'2px 6px', borderRadius:999,
              background: accent, color:'#0a1410',
              boxShadow:`0 0 10px ${accent}66`,
              fontVariantNumeric:'tabular-nums',
            }}>
              Tú
            </span>
          )}
        </div>
        <div style={{
          fontSize:10.5, color:'var(--ink-3)', marginTop:1,
          letterSpacing:'-0.005em',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>
          {user.tagline}
          {user.streak > 0 && (
            <>
              <span style={{ margin:'0 4px', opacity:0.5 }}>·</span>
              <span style={{ color:'#ff8b6a', fontWeight:600 }}>🔥 {user.streak}d</span>
            </>
          )}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, flexShrink:0 }}>
        <div style={{
          fontSize:14, fontWeight:800, color:'var(--ink-1)',
          fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em',
          fontFamily:'var(--ff-display)', lineHeight:1,
        }}>
          {hours}<span style={{ fontSize:9.5, fontWeight:600, color:'var(--ink-3)', marginLeft:2 }}>{unit}</span>
        </div>
        <MovementIndicator movement={user.movement} delta={user.delta}/>
      </div>
    </div>
  );
}

// ── Filtros del Ranking ─────────────────────────────────────────────────────
const _RANK_PERIODS = [
  { id:'week',  label:'Esta semana', sub:'Con reset el domingo',     multiplier:1,    showReset:true  },
  { id:'month', label:'Este mes',    sub:'Acumulado de 4 semanas',   multiplier:4.2,  showReset:false },
  { id:'all',   label:'Histórico',   sub:'Desde que empezaste',      multiplier:14.6, showReset:false },
];
const _RANK_PLACES = [
  { id:'global',  label:'Global',    sub:'Toda la comunidad de Mentex' },
  { id:'country', label:'Mi país',   sub:'Colombia',                    place:'Colombia', topN:6 },
  { id:'city',    label:'Mi ciudad', sub:'Bogotá',                      place:'Bogotá',   topN:4 },
];

// ── _RankFilterSection — sub-componente module-level del FilterSheet ────────
// Extraído FUERA del componente padre porque definirlo dentro causaba que
// React lo tratara como una identidad nueva en cada render del padre, lo que
// provocaba unmount/remount de los 3 Sections en cada tap. Esto es un anti-
// pattern conocido (lección phase-comm-1).
function _RankFilterSection({ eyebrow, title, options, currentId, onPick, getIcon }) {
  return (
    <div style={{ padding:'0 24px 18px' }}>
      <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', marginBottom:6, paddingLeft:2 }}>
        {eyebrow}
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.012em', marginBottom:10, paddingLeft:2 }}>
        {title}
      </div>
      <div className="mtx-glass" style={{
        padding:4, borderRadius:14,
        background:'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.008))',
        border:'0.5px solid rgba(255,255,255,0.06)',
        display:'flex', flexDirection:'column', gap:2,
      }}>
        {options.map(o => {
          const isActive = currentId === o.id;
          const Ic = getIcon ? getIcon(o) : null;
          return (
            <button
              key={o.id}
              onClick={() => onPick(o.id)}
              className="mtx-tap"
              aria-pressed={isActive}
              style={{
                appearance:'none', cursor:'pointer', border:0,
                background: isActive
                  ? 'linear-gradient(180deg, rgba(255,214,107,0.14), rgba(255,214,107,0.04))'
                  : 'transparent',
                borderRadius:11,
                padding:'11px 12px',
                display:'flex', alignItems:'center', gap:11,
                color:'var(--ink-1)',
                fontFamily:'var(--ff-sans)',
                textAlign:'left',
                boxShadow: isActive ? 'inset 0 0 0 0.5px rgba(255,214,107,0.36)' : 'none',
                transition:'background .2s, box-shadow .2s',
              }}
            >
              {Ic && (
                <div style={{
                  width:30, height:30, borderRadius:9, flexShrink:0,
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(255,214,107,0.32), rgba(255,214,107,0.08))'
                    : 'rgba(255,255,255,0.04)',
                  border: isActive ? '0.5px solid rgba(255,214,107,0.45)' : '0.5px solid rgba(255,255,255,0.06)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: isActive ? '#FFD66B' : 'var(--ink-2)',
                  boxShadow: isActive ? '0 0 10px rgba(255,214,107,0.3)' : 'none',
                  transition:'background .2s, color .2s, box-shadow .2s',
                }}>
                  <Ic size={14} stroke="currentColor" strokeWidth={1.7}/>
                </div>
              )}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{
                  fontSize:13, fontWeight:isActive ? 700 : 600,
                  color: isActive ? '#FFD66B' : 'var(--ink-1)',
                  letterSpacing:'-0.005em', lineHeight:1.2,
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                }}>
                  {o.label}
                </div>
                {o.sub && (
                  <div style={{
                    fontSize:10.5, color:'var(--ink-3)', marginTop:2,
                    letterSpacing:'-0.005em', lineHeight:1.35,
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                    {o.sub}
                  </div>
                )}
              </div>
              {/* Radio circle */}
              <div style={{
                width:18, height:18, borderRadius:'50%', flexShrink:0,
                border: isActive ? '1.5px solid #FFD66B' : '1.5px solid rgba(255,255,255,0.18)',
                background: isActive ? 'rgba(255,214,107,0.12)' : 'transparent',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: isActive ? '0 0 8px rgba(255,214,107,0.5)' : 'none',
                transition:'border-color .2s, background .2s, box-shadow .2s',
              }}>
                {isActive && (
                  <div style={{
                    width:8, height:8, borderRadius:'50%',
                    background:'#FFD66B',
                    boxShadow:'0 0 6px rgba(255,214,107,0.7)',
                  }}/>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── RankingFilterSheet — bottom sheet con filtros (Período, Lugar, Contenido)
// Patrón "pending state": los cambios se acumulan localmente y solo se aplican
// con el botón "Aplicar". "Restaurar" vuelve a los defaults. Si el usuario
// cierra sin aplicar (drag down / clic afuera), los cambios se descartan.
function RankingFilterSheet({ period, place, category, onPeriod, onPlace, onCategory, onClose }) {
  const Shell = window.StatSheetShell;
  // State local pending — inicializado con los filtros actualmente aplicados
  const [pendingPeriod, setPendingPeriod] = React.useState(period);
  const [pendingPlace, setPendingPlace] = React.useState(place);
  const [pendingCategory, setPendingCategory] = React.useState(category);

  if (!Shell) return null;

  // Defaults del ranking (sin filtros aplicados)
  const DEFAULT_PERIOD = 'week';
  const DEFAULT_PLACE = 'global';
  const DEFAULT_CATEGORY = 'all';

  // Hay cambios pendientes vs lo aplicado?
  const isDirty = pendingPeriod !== period || pendingPlace !== place || pendingCategory !== category;
  // Los pending están todos en default?
  const isPendingDefault = pendingPeriod === DEFAULT_PERIOD && pendingPlace === DEFAULT_PLACE && pendingCategory === DEFAULT_CATEGORY;

  const handleApply = () => {
    if (pendingPeriod !== period) onPeriod(pendingPeriod);
    if (pendingPlace !== place) onPlace(pendingPlace);
    if (pendingCategory !== category) onCategory(pendingCategory);
    onClose();
  };

  const handleRestore = () => {
    setPendingPeriod(DEFAULT_PERIOD);
    setPendingPlace(DEFAULT_PLACE);
    setPendingCategory(DEFAULT_CATEGORY);
  };

  return (
    <Shell
      onClose={onClose} accent="#FFD66B" maxHeight="90%" zIndex={200}
      footer={
        <div style={{ display:'flex', gap:10, alignItems:'stretch' }}>
          {/* Restaurar — secundario, ghost. Disabled si los pending ya están en default. */}
          <button
            onClick={handleRestore}
            disabled={isPendingDefault}
            aria-label="Restaurar filtros al estado por defecto"
            className="mtx-tap"
            style={{
              appearance:'none',
              cursor: isPendingDefault ? 'not-allowed' : 'pointer',
              flex:'0 0 auto', minWidth:108,
              padding:'13px 18px', borderRadius:14,
              border: '0.5px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.04)',
              color: isPendingDefault ? 'var(--ink-3)' : 'var(--ink-1)',
              fontFamily:'var(--ff-sans)', fontSize:13, fontWeight:700,
              letterSpacing:'-0.005em',
              opacity: isPendingDefault ? 0.55 : 1,
              transition:'background .2s, color .2s, opacity .2s',
              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
            }}
          >
            Restaurar
          </button>

          {/* Aplicar — primario dorado. Disabled si no hay cambios pendientes. */}
          <button
            onClick={handleApply}
            disabled={!isDirty}
            aria-label={isDirty ? 'Aplicar filtros y cerrar' : 'Sin cambios para aplicar'}
            className="mtx-tap"
            style={{
              appearance:'none',
              cursor: isDirty ? 'pointer' : 'not-allowed',
              flex:'1 1 auto',
              padding:'13px 18px', borderRadius:14,
              border: isDirty ? '0.5px solid rgba(255,214,107,0.55)' : '0.5px solid rgba(255,255,255,0.08)',
              background: isDirty
                ? 'linear-gradient(180deg, #FFD66B 0%, #ff8b6a 100%)'
                : 'rgba(255,255,255,0.04)',
              color: isDirty ? '#0a1410' : 'var(--ink-3)',
              fontFamily:'var(--ff-sans)', fontSize:13.5, fontWeight:800,
              letterSpacing:'-0.005em',
              boxShadow: isDirty
                ? '0 0 0 0.5px rgba(255,214,107,0.32), 0 10px 24px -10px rgba(255,214,107,0.7), inset 0 1px 0 rgba(255,255,255,0.4)'
                : 'none',
              opacity: isDirty ? 1 : 0.6,
              transition:'background .22s, color .22s, box-shadow .25s, border-color .22s, opacity .22s',
              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
            }}
          >
            {isDirty ? (
              <>
                <IcCheck size={14} stroke="currentColor" strokeWidth={2.4}/>
                Aplicar
              </>
            ) : 'Sin cambios'}
          </button>
        </div>
      }
    >
      {/* Header */}
      <div style={{ padding:'4px 24px 18px' }}>
        <div className="mtx-eyebrow" style={{
          fontSize:10, color:'#FFD66B', letterSpacing:'0.16em', fontWeight:700,
          marginBottom:6,
          textShadow:'0 0 12px rgba(255,214,107,0.4)',
        }}>
          Filtros
        </div>
        <h2 style={{
          margin:0, fontSize:22, fontWeight:800, color:'var(--ink-1)',
          fontFamily:'var(--ff-display)', letterSpacing:'-0.022em', lineHeight:1.1,
        }}>
          Personaliza tu ranking
        </h2>
        <p style={{ margin:'5px 0 0', fontSize:12, color:'var(--ink-3)', lineHeight:1.45, letterSpacing:'-0.005em' }}>
          Cambia el período, el lugar o el tipo de contenido para verlo desde otra perspectiva.
        </p>
      </div>

      <_RankFilterSection
        eyebrow="Período"
        title="¿Qué intervalo quieres ver?"
        options={_RANK_PERIODS}
        currentId={pendingPeriod}
        onPick={setPendingPeriod}
        getIcon={(o) => o.id === 'all' ? IcClock : IcCalendar}
      />

      <_RankFilterSection
        eyebrow="Lugar"
        title="¿Qué comunidad?"
        options={_RANK_PLACES}
        currentId={pendingPlace}
        onPick={setPendingPlace}
        getIcon={() => IcGlobe}
      />

      <_RankFilterSection
        eyebrow="Contenido"
        title="¿Qué tipo de aprendizaje?"
        options={_RANK_CATEGORIES.map(c => ({ id: c.id, label: c.label }))}
        currentId={pendingCategory}
        onPick={setPendingCategory}
        getIcon={(o) => {
          const cat = _RANK_CATEGORIES.find(c => c.id === o.id);
          return cat?.Ic || null;
        }}
      />
    </Shell>
  );
}

// ── RankingScreen — overlay full screen con el ranking semanal ─────────────
function RankingScreen({ onClose }) {
  const [category, setCategory] = React.useState('all');
  const [period, setPeriod] = React.useState('week');
  const [place, setPlace] = React.useState('global');
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [dragY, setDragY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartY = React.useRef(0);
  const dragActiveRef = React.useRef(false);

  const periodConfig = _RANK_PERIODS.find(p => p.id === period) || _RANK_PERIODS[0];
  const placeConfig = _RANK_PLACES.find(p => p.id === place) || _RANK_PLACES[0];

  // Calcula ranking ordenado según los 3 filtros activos
  const ranking = React.useMemo(() => {
    let list = _RANKING_USERS.map(u => {
      const baseValue = category === 'all' ? u.hours.total : (u.hours[category] || 0);
      // Multiplicador por período (mock — semana × N para simular acumulado)
      const value = Math.round(baseValue * periodConfig.multiplier * 10) / 10;
      return { ...u, displayHours: value };
    });
    list = list.sort((a, b) => b.displayHours - a.displayHours).filter(u => u.displayHours > 0);
    // Filtro por lugar — top N. Aseguramos que "Tú" siempre aparezca.
    if (placeConfig.topN) {
      const meIdx = list.findIndex(u => u.isMe);
      let trimmed = list.slice(0, placeConfig.topN);
      if (meIdx >= 0 && meIdx >= placeConfig.topN) {
        trimmed = [...trimmed, list[meIdx]];
      }
      list = trimmed;
    }
    return list;
    // periodConfig y placeConfig son derivados de [period, place], no hacen falta en deps
  }, [category, period, place]);

  const myEntry = React.useMemo(() => {
    const idx = ranking.findIndex(u => u.isMe);
    return idx >= 0 ? { user: ranking[idx], position: idx + 1 } : null;
  }, [ranking]);

  const activeCat = _RANK_CATEGORIES.find(c => c.id === category) || _RANK_CATEGORIES[0];
  const unit = activeCat.unit;

  // Pointer-down only en el drag handle (los botones siguen clickables)
  const onHandleDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartY.current = e.clientY;
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
    if (dragY > 110) { onClose?.(); return; }
    setDragY(0);
  };

  // Mostrar tu fila como "sticky" si está fuera del podio (positions 4+)
  const isMeOutOfPodium = myEntry && myEntry.position > 3;

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:165,
      background:'radial-gradient(80% 50% at 50% 0%, rgba(255,214,107,0.08), transparent 60%), #050706',
      transform:`translateY(${dragY}px)`,
      transition: isDragging ? 'none' : 'transform .4s cubic-bezier(.25,.8,.25,1)',
      animation:'mtxRankingSlide .4s cubic-bezier(.25,.8,.25,1) both',
      display:'flex', flexDirection:'column',
      willChange:'transform', overflow:'hidden',
    }}>
      <style>{`@keyframes mtxRankingSlide { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

      {/* Drag handle */}
      <div
        style={{ paddingTop:14, paddingBottom:10, display:'flex', justifyContent:'center', cursor:'grab', touchAction:'none', flexShrink:0 }}
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
      >
        <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.2)' }}/>
      </div>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', padding:'0 16px 8px', justifyContent:'space-between', flexShrink:0 }}>
        <button onClick={onClose} aria-label="Cerrar" className="mtx-tap" style={{
          width:36, height:36, borderRadius:999, border:0,
          background:'rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--ink-1)', cursor:'pointer', flexShrink:0,
        }}>
          <IcChevD size={20} stroke="currentColor"/>
        </button>
        <div style={{ textAlign:'center', flex:1, minWidth:0, padding:'0 12px' }}>
          <div className="mtx-eyebrow" style={{ fontSize:9, color:'#FFD66B', letterSpacing:'0.16em', marginBottom:2,
                                               textShadow:'0 0 8px rgba(255,214,107,0.35)' }}>
            Ranking
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.018em', whiteSpace:'nowrap' }}>
            {periodConfig.label}{placeConfig.place ? ` · ${placeConfig.place}` : ''}
          </div>
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          aria-label="Filtros del ranking"
          className="mtx-tap"
          style={{
            width:36, height:36, borderRadius:999,
            border:'0.5px solid rgba(255,214,107,0.32)',
            background:'rgba(255,214,107,0.10)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#FFD66B', cursor:'pointer', flexShrink:0,
            boxShadow:'0 0 12px rgba(255,214,107,0.18), inset 0 1px 0 rgba(255,255,255,0.1)',
            position:'relative',
          }}
        >
          <IcSliders size={16} stroke="currentColor" strokeWidth={1.7}/>
          {/* Dot indicator si hay filtros distintos al default */}
          {(period !== 'week' || place !== 'global') && (
            <span style={{
              position:'absolute', top:6, right:6,
              width:7, height:7, borderRadius:'50%',
              background:'#FFD66B',
              boxShadow:'0 0 8px rgba(255,214,107,0.9)',
              border:'1.5px solid #050706',
            }}/>
          )}
        </button>
      </div>

      {/* Reset countdown — solo aplica al período "Esta semana" */}
      {periodConfig.showReset && (
        <div style={{ display:'flex', justifyContent:'center', padding:'2px 16px 8px', flexShrink:0 }}>
          <ResetCountdown/>
        </div>
      )}

      {/* Category tabs */}
      <div className="mtx-no-scrollbar" style={{
        padding:'4px 18px 10px',
        display:'flex', gap:6, overflowX:'auto', WebkitOverflowScrolling:'touch',
        flexShrink:0,
      }}>
        {_RANK_CATEGORIES.map(c => {
          const isActive = category === c.id;
          return (
            <button key={c.id} onClick={() => setCategory(c.id)} className="mtx-tap" style={{
              appearance:'none', cursor:'pointer', flexShrink:0,
              display:'inline-flex', alignItems:'center', gap:5,
              padding:'7px 12px', borderRadius:999,
              border: isActive ? '0.5px solid rgba(255,214,107,0.45)' : '0.5px solid rgba(255,255,255,0.08)',
              background: isActive ? 'linear-gradient(180deg, rgba(255,214,107,0.16), rgba(255,214,107,0.04))' : 'rgba(255,255,255,0.04)',
              color: isActive ? '#FFD66B' : 'var(--ink-2)',
              fontFamily:'var(--ff-sans)', fontSize:11.5, fontWeight:600,
              letterSpacing:'-0.005em',
              boxShadow: isActive ? '0 0 0 1px rgba(255,214,107,0.18), 0 6px 14px -8px rgba(255,214,107,0.4)' : 'none',
              transition:'background .2s, border-color .2s, color .2s, box-shadow .25s',
            }}>
              {c.Ic && <c.Ic size={11} stroke="currentColor" strokeWidth={1.7}/>}
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Scroll body — podio + lista */}
      <div className="mtx-no-scrollbar" style={{
        flex:1, overflowY:'auto', paddingBottom: isMeOutOfPodium ? 86 : 22,
      }}>
        {ranking.length === 0 ? (
          <div style={{ padding:'56px 28px', textAlign:'center' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--ink-1)', marginBottom:6 }}>
              Sin actividad{period === 'week' ? ' esta semana' : period === 'month' ? ' este mes' : ''}
            </div>
            <div style={{ fontSize:12, color:'var(--ink-3)', maxWidth:260, margin:'0 auto', lineHeight:1.5 }}>
              En "{activeCat.label}"{placeConfig.place ? ` · ${placeConfig.place}` : ''} nadie ha registrado horas todavía.
            </div>
          </div>
        ) : (
          <>
            {ranking.length >= 3 && <PodiumStand ranking={ranking} unit={unit}/>}

            {/* Section header */}
            <div style={{ padding:'14px 22px 8px', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
              <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', fontWeight:700 }}>
                Resto del ranking
              </div>
              <span style={{ fontSize:10, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
                {ranking.length} mentes
              </span>
            </div>

            {/* Resto: positions 4+ */}
            <div style={{ padding:'0 18px', display:'flex', flexDirection:'column', gap:6 }}>
              {ranking.slice(3).map((user, i) => (
                <RankRow
                  key={user.id}
                  user={user}
                  position={i + 4}
                  hours={user.displayHours}
                  unit={unit}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Filter sheet — portal-mounted al viewport del IOSDevice */}
      {filterOpen && (() => {
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const sheet = (
          <RankingFilterSheet
            period={period}
            place={place}
            category={category}
            onPeriod={setPeriod}
            onPlace={setPlace}
            onCategory={setCategory}
            onClose={() => setFilterOpen(false)}
          />
        );
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(sheet, overlayRoot)
          : sheet;
      })()}

      {/* Sticky "tu posición" si estás fuera del podio */}
      {isMeOutOfPodium && (
        <div style={{
          position:'absolute', left:14, right:14, bottom:18, zIndex:5,
          padding:'2px',
          borderRadius:18,
          background:`linear-gradient(135deg, ${myEntry.user.accent}88, ${myEntry.user.accent}33)`,
          boxShadow:`0 12px 30px -10px ${myEntry.user.accent}88, 0 0 0 0.5px ${myEntry.user.accent}55`,
          animation:'mtx-fade-up .3s ease both',
        }}>
          <div style={{
            background:'linear-gradient(180deg, rgba(20,24,22,0.94), rgba(15,19,18,0.99))',
            borderRadius:16,
            padding:'4px',
            backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
          }}>
            <RankRow
              user={myEntry.user}
              position={myEntry.position}
              hours={myEntry.user.displayHours}
              unit={unit}
            />
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  RankingScreen, PodiumStand, PodiumColumn, PodiumPedestal, RankRow, RankAvatar,
  MovementIndicator, ResetCountdown,
  _RANKING_USERS, _RANK_CATEGORIES,
});
