// user-profile-flow.jsx — Perfil de OTRO usuario (overlay full-screen, fase 4-B)
// Reutiliza el lenguaje visual de ProfileScreen pero con CTA Follow/Following prominente
// y data enriquecida desde _USER_PROFILES_DETAIL.

// ── Datos enriquecidos por usuario (bio, avatar, link, socials, achievements seed) ─
const _USER_PROFILES_DETAIL = {
  mariana: {
    id:'mariana', name:'Mariana Soto', handle:'@mariana.soto', initial:'M', accent:'#9b8aff',
    avatar:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    tagline:'Lectora obsesiva · Mente curiosa',
    bio:'Devoro libros como otros devoran series. Cada subrayado es una conversación con mi yo de ayer. Buscando los hilos que conectan ideas a través de los siglos.',
    link:'mariana.substack.com',
    levelLabel:'Mente Sabia',
    xp:412, xpToNext:600,
    socials:[
      { id:'instagram', label:'Instagram', accent:'#e879c5', handle:'@mariana.lee' },
      { id:'twitter',   label:'X',         accent:'#e8e8e8', handle:'@marianasoto'   },
      { id:'spotify',   label:'Spotify',   accent:'#1DB954', handle:'Mariana Soto'   },
    ],
  },
  andres: {
    id:'andres', name:'Andrés Castaño', handle:'@andrescastano', initial:'A', accent:'#3dffd1',
    avatar:'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
    tagline:'Aprendiendo en deep work',
    bio:'Ingeniero por formación, filósofo por accidente. Me fascina cómo la atención sostenida transforma la materia gris. Construyendo hábitos como bloques LEGO.',
    link:'andrescastano.dev',
    levelLabel:'Maestro del Foco',
    xp:520, xpToNext:700,
    socials:[
      { id:'twitter',  label:'X',        accent:'#e8e8e8', handle:'@andresfocus' },
      { id:'linkedin', label:'LinkedIn', accent:'#0a66c2', handle:'andrescastanoa' },
      { id:'github',   label:'GitHub',   accent:'#a8a8a8', handle:'acastanoa' },
    ],
  },
  lucia: {
    id:'lucia', name:'Lucía Rivera', handle:'@lucia.rivera', initial:'L', accent:'#FFD66B',
    avatar:'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80',
    tagline:'Buscando claridad',
    bio:'A veces se aprende más en silencio que leyendo mil libros. Practico meditación, escritura matutina y caminatas largas sin teléfono.',
    link:'',
    levelLabel:'Mente Despierta',
    xp:280, xpToNext:500,
    socials:[
      { id:'instagram', label:'Instagram', accent:'#e879c5', handle:'@lucia.escribe' },
      { id:'tiktok',    label:'TikTok',    accent:'#69c9d0', handle:'@lucia.calma' },
    ],
  },
  tomas: {
    id:'tomas', name:'Tomás Mendoza', handle:'@tomasmendoza', initial:'T', accent:'#5dd3ff',
    avatar:'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80',
    tagline:'Curioso profesional',
    bio:'Coleccionista de modelos mentales. Estudio cómo otros piensan para pensar mejor. Si pudiera, leería 24 horas al día.',
    link:'tomasmendoza.com',
    levelLabel:'Sabio Naciente',
    xp:680, xpToNext:900,
    socials:[
      { id:'twitter',  label:'X',        accent:'#e8e8e8', handle:'@tomasmm' },
      { id:'linkedin', label:'LinkedIn', accent:'#0a66c2', handle:'tomasmendoza' },
      { id:'spotify',  label:'Spotify',  accent:'#1DB954', handle:'Tomas Mendoza' },
      { id:'github',   label:'GitHub',   accent:'#a8a8a8', handle:'tmendoza' },
    ],
  },
  isabella: {
    id:'isabella', name:'Isabella Peña', handle:'@isa.pena', initial:'I', accent:'#ff8b6a',
    avatar:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    tagline:'Diseñadora & filósofa',
    bio:'El diseño es filosofía aplicada. La estética es ética hecha tangible. Trabajo con marcas que quieren significar algo más allá del consumo.',
    link:'isapena.studio',
    levelLabel:'Mente Despierta',
    xp:340, xpToNext:500,
    socials:[
      { id:'instagram', label:'Instagram', accent:'#e879c5', handle:'@isa.studio' },
      { id:'twitter',   label:'X',         accent:'#e8e8e8', handle:'@isapena' },
      { id:'linkedin',  label:'LinkedIn',  accent:'#0a66c2', handle:'isabellapena' },
    ],
  },
  rodrigo: {
    id:'rodrigo', name:'Rodrigo Lara', handle:'@rodrigo.lara', initial:'R', accent:'#9bd45e',
    avatar:'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&q=80',
    tagline:'Calma y enfoque',
    bio:'Founder en stealth. Construyendo en silencio mientras todos hablan. La concentración es mi único superpoder real.',
    link:'rodrigolara.co',
    levelLabel:'Sabio Naciente',
    xp:215, xpToNext:500,
    socials:[
      { id:'twitter',  label:'X',        accent:'#e8e8e8', handle:'@rodrigobuilds' },
      { id:'github',   label:'GitHub',   accent:'#a8a8a8', handle:'rlara' },
      { id:'linkedin', label:'LinkedIn', accent:'#0a66c2', handle:'rodrigolara' },
    ],
  },
};

// ── Stats donut data por usuario (variación creíble) ───────────────────────
// Consumido por window.ProfileStatsTab cuando se renderiza con isOwn=false
// (ver _deriveStatsFor en profile.jsx). _USER_ACHIEVEMENTS viejo se eliminó:
// los logros del perfil ajeno ahora se derivan vía _buildAchievementsForUser.
const _USER_STATS_DONUT = {
  mariana:  [{label:'Audiolibros',value:212,color:'#3dffd1'},{label:'Charlas',value:78,color:'#5dd3ff'},{label:'Series',value:34,color:'#FFD66B'},{label:'Meditaciones',value:58,color:'#9b8aff'},{label:'Sonidos',value:18,color:'#9bd45e'}],
  andres:   [{label:'Charlas',value:184,color:'#5dd3ff'},{label:'Audiolibros',value:142,color:'#3dffd1'},{label:'Meditaciones',value:88,color:'#9b8aff'},{label:'Series',value:56,color:'#FFD66B'},{label:'Sonidos',value:42,color:'#9bd45e'}],
  lucia:    [{label:'Meditaciones',value:148,color:'#9b8aff'},{label:'Sonidos',value:96,color:'#9bd45e'},{label:'Audiolibros',value:64,color:'#3dffd1'},{label:'Charlas',value:38,color:'#5dd3ff'},{label:'Series',value:14,color:'#FFD66B'}],
  tomas:    [{label:'Audiolibros',value:298,color:'#3dffd1'},{label:'Charlas',value:142,color:'#5dd3ff'},{label:'Series',value:78,color:'#FFD66B'},{label:'Meditaciones',value:62,color:'#9b8aff'},{label:'Sonidos',value:24,color:'#9bd45e'}],
  isabella: [{label:'Charlas',value:128,color:'#5dd3ff'},{label:'Audiolibros',value:112,color:'#3dffd1'},{label:'Series',value:68,color:'#FFD66B'},{label:'Meditaciones',value:54,color:'#9b8aff'},{label:'Sonidos',value:32,color:'#9bd45e'}],
  rodrigo:  [{label:'Audiolibros',value:118,color:'#3dffd1'},{label:'Meditaciones',value:84,color:'#9b8aff'},{label:'Charlas',value:62,color:'#5dd3ff'},{label:'Sonidos',value:46,color:'#9bd45e'},{label:'Series',value:22,color:'#FFD66B'}],
};

// ── Hook reactivo al store de follows ──────────────────────────────────────
function useFollow(userId) {
  const [following, setFollowing] = React.useState(() => {
    return window.__mtxFollows ? window.__mtxFollows.isFollowing(userId) : false;
  });
  React.useEffect(() => {
    if (!window.__mtxFollows) return;
    setFollowing(window.__mtxFollows.isFollowing(userId));
    const handler = () => setFollowing(window.__mtxFollows.isFollowing(userId));
    window.addEventListener('mtx:follows-changed', handler);
    return () => window.removeEventListener('mtx:follows-changed', handler);
  }, [userId]);
  return following;
}

// ── Resolve full user data: detail + stats + base author info ──────────────
function resolveUserProfile(userId) {
  const detail = _USER_PROFILES_DETAIL[userId];
  if (!detail) return null;
  const stats = (window._USER_STATS_MOCK && window._USER_STATS_MOCK[userId]) || { followers:0, following:0, hours:0, level:1 };
  return {
    ...detail,
    level: stats.level,
    followers: stats.followers,
    following: stats.following,
    hours: stats.hours,
  };
}


// ── UserProfileScreen — overlay full-screen del perfil de otro usuario ─────
function UserProfileScreen({ userId, onClose }) {
  const profile = React.useMemo(() => resolveUserProfile(userId), [userId]);
  const [tab, setTab] = React.useState('reviews');
  const [shareEntity, setShareEntity] = React.useState(null);
  const [threadReview, setThreadReview] = React.useState(null);
  const [statSheet, setStatSheet] = React.useState(null); // 'level' | 'hours' | 'followers' | null
  const [achievementSheet, setAchievementSheet] = React.useState(null); // achievement object | null
  const isFollowing = useFollow(userId);
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  // Reviews del usuario desde el seed mock
  const userReviews = React.useMemo(() => {
    if (!profile) return [];
    const seed = window._MOCK_COMMUNITY_REVIEWS || [];
    return seed
      .filter(r => r.authorId === userId)
      .map(r => {
        const item = (window.EXPLORE_CONTENT || []).find(c => c.id === r.itemId);
        return { ...r, item };
      })
      .filter(r => r.item);
  }, [userId, profile]);

  // Convierte un string "Ahora" | "Nm" | "Nh" | "Nd" → timestamp aproximado en ms.
  // Función pura sin closure — no requiere useCallback (evita memo overhead).
  const timeAgoToTs = (timeAgo) => {
    if (!timeAgo || timeAgo === 'Ahora') return Date.now();
    const m = String(timeAgo).match(/^(\d+)\s*([mhd])$/i);
    if (!m) return Date.now();
    const n = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    const ms = unit === 'm' ? n * 60_000
             : unit === 'h' ? n * 60 * 60_000
             :                n * 24 * 60 * 60_000; // d
    return Date.now() - ms;
  };

  if (!profile) return null;

  const accent = profile.accent;
  const xpPct = Math.min(1, profile.xp / profile.xpToNext);
  const followersDisplay = isFollowing ? profile.followers + 1 : profile.followers;
  const followersFmt = followersDisplay >= 1000
    ? `${(followersDisplay / 1000).toFixed(1)}k`
    : followersDisplay.toLocaleString();

  // Logros derivados por window._buildAchievementsForUser (en profile.jsx).
  // Solo necesitamos el count para el badge del tab — el render usa AwardsTab.
  const achievementsCount = window._buildAchievementsForUser
    ? window._buildAchievementsForUser(profile).filter(a => a.unlocked).length
    : 0;

  const handleFollowToggle = () => {
    if (!window.__mtxFollows) return;
    if (isFollowing) {
      window.__mtxFollows.unfollow(userId);
      toast.show({ message: `Dejaste de seguir a ${profile.name.split(' ')[0]}`, duration: 1600 });
    } else {
      window.__mtxFollows.follow(userId);
      toast.show({ message: `Ahora sigues a ${profile.name.split(' ')[0]}`, duration: 1800 });
    }
  };

  const handleItemTap = (itemOrReview) => {
    const id = itemOrReview?.itemId || itemOrReview?.id;
    if (!id) return;
    onClose?.();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('mtx:open-item-from-community', { detail: { itemId: id } }));
    }, 220);
  };

  const handleThreadTap = (review) => {
    if (!review.item) {
      const item = (window.EXPLORE_CONTENT || []).find(c => c.id === review.itemId);
      if (!item) return;
      review = { ...review, item };
    }
    const enriched = {
      ...review,
      author: { id: profile.id, name: profile.name, initial: profile.initial, accent: profile.accent, tagline: profile.tagline, avatar: profile.avatar },
      timeAgo: review.timeAgo || 'Hace poco',
    };
    setThreadReview(enriched);
  };

  const handleShareTap = (entity) => setShareEntity(entity);
  const handleSocialTap = (s) => toast.show({ message: `Abriendo ${s.label}…`, duration: 1400 });
  const handleShareProfile = () => {
    setShareEntity({
      id: profile.id,
      title: profile.name,
      author: profile.handle,
      cover: null,
      accent: profile.accent,
    });
  };
  const handleAuthorTapInsideThread = (author) => {
    if (author?.id === profile.id) return; // ya estamos en su perfil
    if (!author?.id || author.id === 'me') return;
    setThreadReview(null);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('mtx:open-user-profile', { detail: { userId: author.id } }));
    }, 200);
  };

  const TABS = [
    { id: 'reviews', label: 'Reseñas',     count: userReviews.length },
    { id: 'stats',   label: 'Estadísticas' },
    { id: 'awards',  label: 'Logros',      count: achievementsCount },
  ];

  const getSocialIcon = (id) => {
    if (id === 'instagram') return IcInstagramBrand;
    if (id === 'twitter')   return IcXBrand;
    if (id === 'spotify')   return IcSpotifyBrand;
    if (id === 'tiktok')    return IcTikTok;
    if (id === 'youtube')   return IcYoutube;
    if (id === 'linkedin')  return IcLinkedIn;
    if (id === 'github')    return IcGithub;
    return IcGlobe;
  };

  // Body scroll lock mientras está abierto
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ESC cierra
  React.useEffect(() => {
    const onKey = (e) => {
      const target = e.target;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ProfileReviewCardCmp = window.ProfileReviewCard;
  const AchievementCardCmp = window.AchievementCard;

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:60,
      background:'#050706',
      animation:'mtx-fade-up .35s cubic-bezier(.25,.8,.25,1) both',
      overflow:'auto', WebkitOverflowScrolling:'touch',
      fontFamily:'var(--ff-sans)',
    }}>
      <style>{`
        @keyframes mtxFollowPulse { 0% { transform:scale(1); } 50% { transform:scale(1.04); } 100% { transform:scale(1); } }
      `}</style>

      <div style={{ paddingBottom:80 }}>

        {/* Cover banner — gradient atmosphère + halo accent */}
        <div style={{
          position:'relative',
          height:128,
          background:`
            radial-gradient(70% 60% at 50% 100%, ${accent}1c 0%, transparent 60%),
            radial-gradient(50% 80% at 85% 0%, ${accent}28 0%, transparent 70%),
            radial-gradient(60% 60% at 15% 30%, rgba(155,138,255,0.12) 0%, transparent 60%),
            linear-gradient(180deg, #0a1410 0%, #060809 100%)
          `,
          overflow:'hidden',
        }}>
          <div style={{
            position:'absolute', inset:0,
            background:`
              radial-gradient(circle at 30% 40%, ${accent}14 0%, transparent 35%),
              radial-gradient(circle at 75% 70%, rgba(255,214,107,0.08) 0%, transparent 40%)
            `,
            opacity: 0.85,
            pointerEvents:'none',
          }}/>

          <div style={{
            position:'absolute', bottom:0, left:0, right:0, height:50,
            background:`linear-gradient(180deg, transparent 0%, rgba(5,7,6,0.85) 100%)`,
            pointerEvents:'none',
          }}/>

          {/* Back button absolute top-left */}
          <button onClick={onClose} aria-label="Cerrar perfil" className="mtx-tap" style={{
            position:'absolute', top:48, left:16, zIndex:2,
            width:40, height:40, borderRadius:999, border:0,
            background:'rgba(20,24,22,0.7)',
            backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
            boxShadow:'inset 0 0 0 0.5px rgba(255,255,255,0.1)',
            color:'var(--ink-1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer',
          }}>
            <IcChevL size={18} stroke="currentColor" strokeWidth={1.8}/>
          </button>

          {/* Share button absolute top-right */}
          <button onClick={handleShareProfile} aria-label="Compartir perfil" className="mtx-tap" style={{
            position:'absolute', top:48, right:16, zIndex:2,
            width:40, height:40, borderRadius:999, border:0,
            background:'rgba(20,24,22,0.7)',
            backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
            boxShadow:'inset 0 0 0 0.5px rgba(255,255,255,0.1)',
            color:'var(--ink-1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer',
          }}>
            <IcShare size={17} stroke="currentColor" strokeWidth={1.6}/>
          </button>
        </div>

        {/* Avatar overlapping */}
        <div style={{ position:'relative', padding:'0 20px', marginTop:-40 }}>
          <div style={{ position:'relative', display:'inline-block' }}>
            <div style={{
              width:88, height:88, borderRadius:'50%',
              background: profile.avatar
                ? `url(${profile.avatar}) center/cover, radial-gradient(60% 60% at 50% 30%, ${accent}55, ${accent}1a 70%, transparent 100%)`
                : `radial-gradient(60% 60% at 50% 30%, ${accent}55, ${accent}1a 70%, transparent 100%)`,
              backgroundSize: profile.avatar ? 'cover' : undefined,
              backgroundPosition: profile.avatar ? 'center' : undefined,
              border:`3px solid #050706`,
              boxShadow:`0 0 0 2px ${accent}66, 0 0 28px ${accent}40, inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -10px 18px ${accent}1a`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color: accent, fontSize:36, fontWeight:700,
              fontFamily:'var(--ff-display)', letterSpacing:'-0.02em',
              overflow:'hidden',
            }}>
              {!profile.avatar && profile.initial}
            </div>
            {/* Level badge — compacto, contenido legible */}
            <div style={{
              position:'absolute', bottom:-2, right:-4,
              minWidth:32, height:28, padding:'0 9px',
              borderRadius:999,
              background:'linear-gradient(135deg, #FFD66B, #ff8b6a)',
              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:3,
              color:'#0a1410',
              fontSize:12.5, fontWeight:800,
              fontFamily:'var(--ff-display)', letterSpacing:'-0.01em',
              boxShadow:'0 0 18px rgba(255,214,107,0.55), inset 0 1px 0 rgba(255,255,255,0.45)',
              border:'2px solid #050706',
              fontVariantNumeric:'tabular-nums',
            }}>
              <IcCrown size={10} stroke="currentColor"/>
              {profile.level}
            </div>
          </div>
        </div>

        {/* Identity block — name + handle + Follow CTA inline */}
        <div style={{ padding:'12px 20px 0', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{
                fontSize:22, fontWeight:800, color:'var(--ink-1)',
                letterSpacing:'-0.025em', lineHeight:1.1,
                fontFamily:'var(--ff-display)',
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>
                {profile.name}
              </div>
              <div style={{
                fontSize:13, color:'var(--ink-3)', marginTop:3,
                letterSpacing:'-0.005em',
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>
                {profile.handle}
              </div>
            </div>

            {/* Follow CTA — prominent */}
            <button
              onClick={handleFollowToggle}
              aria-label={isFollowing ? `Dejar de seguir a ${profile.name}` : `Seguir a ${profile.name}`}
              className="mtx-tap"
              style={{
                appearance:'none', cursor:'pointer', flexShrink:0,
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'9px 16px', height:36,
                borderRadius:999,
                border: isFollowing
                  ? '0.5px solid rgba(255,255,255,0.14)'
                  : `0.5px solid ${accent}66`,
                background: isFollowing
                  ? 'rgba(255,255,255,0.05)'
                  : `linear-gradient(180deg, ${accent} 0%, ${accent}cc 100%)`,
                color: isFollowing ? 'var(--ink-1)' : '#0a1410',
                fontFamily:'var(--ff-sans)', fontSize:12.5, fontWeight:700,
                letterSpacing:'-0.005em',
                boxShadow: isFollowing
                  ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
                  : `0 0 0 1px ${accent}22, 0 8px 20px -8px ${accent}88, inset 0 1px 0 rgba(255,255,255,0.32)`,
                transition:'background .22s, color .22s, box-shadow .28s, border-color .22s',
              }}
            >
              {isFollowing ? (
                <>
                  <IcUserCheck size={13} stroke="currentColor" strokeWidth={1.8}/>
                  Siguiendo
                </>
              ) : (
                <>
                  <IcUserPlus size={13} stroke="currentColor" strokeWidth={1.9}/>
                  Seguir
                </>
              )}
            </button>
          </div>

          {/* Tagline más blanco */}
          {profile.tagline && (
            <div style={{
              marginTop:10,
              fontSize:12.5, color:'var(--ink-1)', fontWeight:500,
              letterSpacing:'-0.005em', lineHeight:1.4,
            }}>
              {profile.tagline}
            </div>
          )}

          {/* Bio multi-línea */}
          {profile.bio && (
            <p style={{
              margin:'10px 0 0',
              fontSize:13, color:'var(--ink-2)', lineHeight:1.55,
              letterSpacing:'-0.005em', textWrap:'pretty',
            }}>
              {profile.bio}
            </p>
          )}

          {/* Web link */}
          {profile.link && (
            <a href={`https://${profile.link}`} target="_blank" rel="noreferrer" style={{
              display:'inline-flex', alignItems:'center', gap:6,
              marginTop:8,
              fontSize:12.5, color: accent, fontWeight:600,
              textDecoration:'none', letterSpacing:'-0.005em',
            }}>
              <IcLink size={12} stroke="currentColor" strokeWidth={1.8}/>
              {profile.link}
            </a>
          )}

          {/* Métricas — 3 stats tappables */}
          <div className="mtx-glass" style={{
            marginTop:18,
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
            padding:'8px 4px', borderRadius:16,
            background:'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012))',
            border:'0.5px solid rgba(255,255,255,0.06)',
            fontFamily:'var(--ff-sans)',
          }}>
            {[
              { id:'level',     value:`Lv ${profile.level}`,    sub: profile.levelLabel, color:'#FFD66B',     Ic: IcCrown, label: `Ver detalle de nivel ${profile.level}` },
              { id:'hours',     value:`${profile.hours} hr`,    sub:'de aprendizaje',    color:'var(--ink-1)',             Ic: null,    label: 'Ver detalle de horas de aprendizaje' },
              { id:'followers', value: followersFmt,            sub:'seguidores',        color:'var(--ink-1)',             Ic: null,    label: 'Ver seguidores' },
            ].map((m, i) => (
              <button
                key={m.id}
                onClick={() => setStatSheet(m.id)}
                aria-label={m.label}
                className="mtx-tap"
                style={{
                  appearance:'none', cursor:'pointer', border:0, background:'transparent',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                  padding:'8px 6px',
                  borderLeft: i > 0 ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
                  borderRadius:0, position:'relative',
                  transition:'background .18s',
                }}
              >
                <div style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  fontSize:22, fontWeight:800,
                  color: m.color,
                  fontVariantNumeric:'tabular-nums', letterSpacing:'-0.025em', lineHeight:1,
                  fontFamily:'var(--ff-display)',
                }}>
                  {m.Ic && <m.Ic size={13} stroke={m.color}/>}
                  <span>{m.value}</span>
                </div>
                <div style={{
                  fontSize:10.5, color:'var(--ink-3)',
                  letterSpacing:'-0.005em', fontWeight:500,
                  lineHeight:1.2, textAlign:'center',
                }}>
                  {m.sub}
                </div>
              </button>
            ))}
          </div>

          {/* XP progress bar */}
          <div style={{ marginTop:12, padding:'0 2px' }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:10.5, fontWeight:700, color:'#FFD66B', letterSpacing:'0.1em', textTransform:'uppercase' }}>
                Hacia Lv {profile.level + 1}
              </span>
              <span style={{ fontSize:10.5, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums', letterSpacing:'-0.005em' }}>
                <span style={{ color:'var(--ink-1)', fontWeight:700 }}>{profile.xp}</span> / {profile.xpToNext} XP
              </span>
            </div>
            <div style={{
              height:5, borderRadius:999,
              background:'rgba(255,255,255,0.06)',
              overflow:'hidden', position:'relative',
            }}>
              <div style={{
                height:'100%', width:`${xpPct * 100}%`,
                background:'linear-gradient(90deg, #FFD66B 0%, #ff8b6a 100%)',
                boxShadow:'0 0 12px rgba(255,214,107,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
                borderRadius:999,
                transition:'width .5s cubic-bezier(.25,.8,.25,1)',
              }}/>
            </div>
          </div>
        </div>

        {/* Section unificada — bg natural del mtx-bg, sin wrappers extra */}
        <div style={{ marginTop:22 }}>
          {/* Social icons row — encapsulado con linecitas sutiles arriba y abajo */}
          {profile.socials && profile.socials.filter(s => s.handle && s.handle.trim()).length > 0 && (
            <div style={{
              padding:'18px 20px',
              display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap',
              borderTop:'0.5px solid rgba(255,255,255,0.11)',
              borderBottom:'0.5px solid rgba(255,255,255,0.05)',
            }}>
              {profile.socials.filter(s => s.handle && s.handle.trim()).map(s => {
                const Ic = getSocialIcon(s.id);
                const brand = window._getSocialBrand
                  ? window._getSocialBrand(s.id)
                  : { bg: s.accent, glow: `${s.accent}55`, border: 0 };
                return (
                  <button key={s.id} onClick={() => handleSocialTap(s)} aria-label={`${s.label} · ${s.handle}`} className="mtx-tap" style={{
                    appearance:'none', cursor:'pointer',
                    width:42, height:42, borderRadius:'50%',
                    border: brand.border || 0,
                    background: brand.bg,
                    color: '#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:`0 0 16px ${brand.glow}, inset 0 1px 0 rgba(255,255,255,0.16)`,
                    transition:'transform .15s, box-shadow .25s',
                  }}>
                    <Ic size={18} stroke="#fff"/>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tabs sticky — backdrop blur transparente para mezclarse con el mtx-bg */}
          <div style={{
            position:'sticky', top:0, zIndex:5,
            padding:'18px 20px',
            background:'rgba(5,7,6,0.72)',
            backdropFilter:'blur(18px) saturate(140%)',
            WebkitBackdropFilter:'blur(18px) saturate(140%)',
          }}>
            <div style={{
              display:'flex', gap:4,
              padding:4, borderRadius:14,
              background:'rgba(255,255,255,0.05)',
              border:'0.5px solid rgba(255,255,255,0.08)',
              boxShadow:'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}>
              {TABS.map(t => {
                const isActive = tab === t.id;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)} className="mtx-tap" style={{
                    flex:1, height:38, borderRadius:10, border:0, cursor:'pointer',
                    background: isActive
                      ? 'linear-gradient(180deg, rgba(61,255,209,0.16), rgba(61,255,209,0.04))'
                      : 'transparent',
                    color: isActive ? 'var(--neon)' : 'var(--ink-2)',
                    fontFamily:'var(--ff-sans)', fontSize:12.5, fontWeight: isActive ? 700 : 600,
                    letterSpacing:'-0.005em',
                    boxShadow: isActive
                      ? '0 0 0 0.5px rgba(61,255,209,0.3), 0 6px 14px -8px rgba(61,255,209,0.45), inset 0 1px 0 rgba(255,255,255,0.08)'
                      : 'none',
                    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5,
                    transition:'background .22s, color .22s, box-shadow .28s',
                  }}>
                    {t.label}
                    {t.count != null && (
                      <span style={{
                        fontSize:10, fontWeight:700, fontVariantNumeric:'tabular-nums',
                        padding:'1.5px 5px', borderRadius:999,
                        background: isActive ? 'rgba(61,255,209,0.22)' : 'rgba(255,255,255,0.06)',
                        color: isActive ? 'var(--neon)' : 'var(--ink-3)',
                      }}>{t.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ paddingTop:0, paddingBottom:14 }}>
            {tab === 'reviews' && (
              <div style={{ animation:'mtx-fade-up .25s ease both' }}>
                {userReviews.length === 0 ? (
                  <div style={{ padding:'20px 20px 0' }}>
                    <div className="mtx-glass" style={{
                      padding:'20px 18px', borderRadius:18,
                      background:'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.008))',
                      border:'1px dashed rgba(255,255,255,0.14)',
                      display:'flex', alignItems:'center', gap:14,
                    }}>
                      <div style={{
                        width:46, height:46, borderRadius:13, flexShrink:0,
                        background:`linear-gradient(135deg, ${accent}26, ${accent}06)`,
                        border:`0.5px solid ${accent}40`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color: accent,
                      }}>
                        <IcEdit size={18} stroke="currentColor" strokeWidth={1.6}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.01em', marginBottom:3 }}>
                          Aún no hay reseñas públicas
                        </div>
                        <div style={{ fontSize:11.5, color:'var(--ink-3)', lineHeight:1.45 }}>
                          {profile.name.split(' ')[0]} aún no ha publicado reseñas en su muro.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding:'10px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                    {userReviews.map(r => {
                      // Enriquecemos con TODOS los campos que ProfileReviewCard espera
                      // (itemTitle/itemAuthor/itemCover/itemAccent/isPublic/createdAt) porque las
                      // mock community reviews vienen con esquema distinto al de window.__mtxReviews.
                      const enriched = {
                        ...r,
                        author: { id: profile.id, name: profile.name, initial: profile.initial, accent: profile.accent, tagline: profile.tagline, avatar: profile.avatar },
                        itemTitle: r.item.title,
                        itemAuthor: r.item.author,
                        itemCover: r.item.cover,
                        itemAccent: r.item.accent || profile.accent,
                        isPublic: true,
                        createdAt: timeAgoToTs(r.timeAgo),
                      };
                      return ProfileReviewCardCmp ? (
                        <ProfileReviewCardCmp
                          key={r.id} review={enriched}
                          onItemTap={(item) => handleItemTap(item)}
                          onShareTap={handleShareTap}
                          onThreadTap={handleThreadTap}
                        />
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'stats' && window.ProfileStatsTab && (
              <window.ProfileStatsTab profile={profile} isOwn={false}/>
            )}

            {tab === 'awards' && window.AwardsTab && (
              <window.AwardsTab
                profile={profile}
                isOwn={false}
                onAchievementTap={(a) => setAchievementSheet(a)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Achievement sheet — portal-mounted */}
      {achievementSheet && window.AchievementSheet && (() => {
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const sheet = (
          <window.AchievementSheet
            achievement={achievementSheet}
            onClose={() => setAchievementSheet(null)}
          />
        );
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(sheet, overlayRoot)
          : sheet;
      })()}

      {/* Stat sheets — portal-mounted */}
      {statSheet && (() => {
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        let sheet = null;
        if (statSheet === 'level' && window.LevelSheet) {
          sheet = <window.LevelSheet profile={profile} onClose={() => setStatSheet(null)}/>;
        } else if (statSheet === 'hours' && window.HoursSheet) {
          // Para perfil ajeno, derivamos breakdown desde _USER_STATS_DONUT
          const segs = window._USER_STATS_DONUT?.[userId];
          sheet = <window.HoursSheet profile={profile} onClose={() => setStatSheet(null)} segments={segs}/>;
        } else if (statSheet === 'followers' && window.FollowersSheet) {
          sheet = <window.FollowersSheet profile={profile} onClose={() => setStatSheet(null)} isOwn={false}/>;
        }
        if (!sheet) return null;
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(sheet, overlayRoot)
          : sheet;
      })()}

      {/* Share sheet — portal-mounted */}
      {shareEntity && window.ShareSheet && (() => {
        const ShareSheetCmp = window.ShareSheet;
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const sheet = <ShareSheetCmp item={shareEntity} onClose={() => setShareEntity(null)}/>;
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(sheet, overlayRoot)
          : sheet;
      })()}

      {/* Review thread — overlay portal-mounted */}
      {threadReview && window.ReviewThreadScreen && (() => {
        const ThreadCmp = window.ReviewThreadScreen;
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const screen = (
          <ThreadCmp
            review={threadReview}
            onClose={() => setThreadReview(null)}
            onItemTap={(item) => {
              setThreadReview(null);
              setTimeout(() => handleItemTap({ itemId: item.id }), 200);
            }}
            onShareTap={(entity) => setShareEntity(entity)}
            onAuthorTap={handleAuthorTapInsideThread}
          />
        );
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(screen, overlayRoot)
          : screen;
      })()}
    </div>
  );
}

Object.assign(window, {
  UserProfileScreen, useFollow, resolveUserProfile,
  _USER_PROFILES_DETAIL, _USER_STATS_DONUT,
});

// Expose _USER_STATS_MOCK al window namespace para resolver desde aquí
if (typeof window !== 'undefined' && window._USER_STATS_MOCK == null) {
  // community-flow.jsx lo declara como const local — lo re-exponemos vía cierre tras carga
  // Esta línea es defensiva: si community-flow ya lo asignó al Object.assign al final, ya estará disponible
}
