// community-flow.jsx — Feed de Comunidad + stores compartidos para perfiles

// ── User stats mock (mock authors + Juan Diego) ─────────────────────────────
const _USER_STATS_MOCK = {
  'me':       { followers: 247,  following: 89,  hours: 47,  level: 7,  xp: 234, xpToNext: 500 },
  'mariana':  { followers: 1247, following: 489, hours: 184, level: 12 },
  'andres':   { followers: 892,  following: 234, hours: 226, level: 14 },
  'lucia':    { followers: 567,  following: 312, hours: 98,  level: 8 },
  'tomas':    { followers: 2103, following: 145, hours: 312, level: 18 },
  'isabella': { followers: 1456, following: 678, hours: 156, level: 11 },
  'rodrigo':  { followers: 723,  following: 234, hours: 134, level: 9 },
};

// ── Follows store — gestión real de following / followers ───────────────────
const _FOLLOWS_EVENT = 'mtx:follows-changed';
if (typeof window !== 'undefined' && !window.__mtxFollows) {
  // Pre-poblamos con algunas relaciones para que las métricas tengan vida
  let _followingByMe = new Set(['mariana', 'andres', 'tomas']);
  window.__mtxFollows = {
    isFollowing: (userId) => _followingByMe.has(userId),
    follow: (userId) => {
      _followingByMe.add(userId);
      window.dispatchEvent(new CustomEvent(_FOLLOWS_EVENT, { detail: { action:'follow', userId } }));
    },
    unfollow: (userId) => {
      _followingByMe.delete(userId);
      window.dispatchEvent(new CustomEvent(_FOLLOWS_EVENT, { detail: { action:'unfollow', userId } }));
    },
    countMyFollowing: () => (_USER_STATS_MOCK.me.following + _followingByMe.size - 3),
    countMyFollowers: () => _USER_STATS_MOCK.me.followers,
    countFor: (userId) => _USER_STATS_MOCK[userId] || { followers: 0, following: 0, hours: 0, level: 1 },
  };
}

// ── Mock authors (usuarios ficticios para sembrar el feed) ──────────────────
const _MOCK_COMMUNITY_AUTHORS = [
  { id:'mariana',  name:'Mariana Soto',     accent:'#9b8aff', initial:'M', tagline:'Lectora obsesiva' },
  { id:'andres',   name:'Andrés Castaño',   accent:'#3dffd1', initial:'A', tagline:'Aprendiendo en deep work' },
  { id:'lucia',    name:'Lucía Rivera',     accent:'#FFD66B', initial:'L', tagline:'Buscando claridad' },
  { id:'tomas',    name:'Tomás Mendoza',    accent:'#5dd3ff', initial:'T', tagline:'Curioso profesional' },
  { id:'isabella', name:'Isabella Peña',    accent:'#ff8b6a', initial:'I', tagline:'Diseñadora & filósofa' },
  { id:'rodrigo',  name:'Rodrigo Lara',     accent:'#9bd45e', initial:'R', tagline:'Calma y enfoque' },
];

// ── Mock seed reviews ───────────────────────────────────────────────────────
const _MOCK_COMMUNITY_REVIEWS = [
  { id:'cr-1', authorId:'mariana',  itemId:'c-habitos',     rating:5, text:'Lo más valioso fue cómo reformula los hábitos como votos a la persona que quieres ser. No son metas — son identidad en construcción.', timeAgo:'2h',  likes:42,  comments:5  },
  { id:'cr-2', authorId:'andres',   itemId:'c-deepwork',    rating:5, text:'Me hizo pensar en cuántas veces interrumpo mi propio enfoque. La idea del "shutdown ritual" cambió mi semana entera.',           timeAgo:'5h',  likes:28,  comments:3  },
  { id:'cr-3', authorId:'lucia',    itemId:'c-poder-ahora', rating:4, text:'Lo recomiendo a quien necesite recordar que el presente es lo único real. Algunas partes lentas, pero la idea central es transformadora.', timeAgo:'1d',  likes:67,  comments:12 },
  { id:'cr-4', authorId:'tomas',    itemId:'c-sapiens',     rating:5, text:'Lo aplicaría a entender cualquier sistema humano: empresas, religiones, mercados. Todos son ficciones útiles que coordinamos en masa.', timeAgo:'1d',  likes:89,  comments:18 },
  { id:'cr-5', authorId:'isabella', itemId:'c-respira',     rating:4, text:'Doce minutos exactos para volver a sentirte tú. Lo más valioso fue redescubrir que la respiración es lo único que siempre podemos elegir.', timeAgo:'2d',  likes:34,  comments:6  },
  { id:'cr-6', authorId:'rodrigo',  itemId:'c-mvp',         rating:5, text:'Si tienes una idea, este es el framework. Me hizo pensar en cómo paso meses puliendo cosas que nadie quiere. Build, ship, learn.',     timeAgo:'3d',  likes:51,  comments:9  },
  { id:'cr-7', authorId:'mariana',  itemId:'c-dormir',      rating:5, text:'Llevo tres noches escuchándola y me duermo antes de los primeros cinco minutos. La voz es hipnótica.',                                  timeAgo:'4d',  likes:122, comments:20 },
];

// ── Avatar — círculo con inicial sobre gradient del accent del autor ────────
function CommunityAvatar({ author, size = 38 }) {
  if (!author) return null;
  const accent = author.accent || '#3dffd1';
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background:`linear-gradient(135deg, ${accent}55, ${accent}1a)`,
      border:`0.5px solid ${accent}66`,
      display:'flex', alignItems:'center', justifyContent:'center',
      color: accent, fontSize: Math.round(size * 0.42), fontWeight:700,
      fontFamily:'var(--ff-display)', letterSpacing:'-0.02em',
      boxShadow:`0 0 12px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.12)`,
    }}>
      {author.initial || '?'}
    </div>
  );
}

// ── Star rating row ─────────────────────────────────────────────────────────
function CommunityRating({ rating = 0, size = 11, color = '#FFD66B' }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
             fill={i < rating ? color : 'none'}
             stroke={i < rating ? color : 'rgba(255,255,255,0.18)'}
             strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
}

// ── CommunityReviewCard — un post del feed ──────────────────────────────────
function CommunityReviewCard({ review, onItemTap, onShareTap, onThreadTap, onAuthorTap }) {
  const [liked, setLiked] = React.useState(false);
  const [likeBurst, setLikeBurst] = React.useState(0);

  // Comment count reactivo al store de comments
  const liveCommentCount = window.useCommentCount ? window.useCommentCount(review?.id) : (review?.comments || 0);

  if (!review || !review.author || !review.item) return null;

  const author = review.author;
  const item = review.item;
  const accent = author.accent || '#3dffd1';
  const itemAccent = item.accent || '#3dffd1';
  const totalLikes = (review.likes || 0) + (liked ? 1 : 0);
  // Comment count viene reactivo del store (`useCommentCount`), no mezclamos
  // con `review.comments` mock — el store es la única fuente de verdad.
  const commentCount = liveCommentCount;

  // Tap en avatar/nombre → abre perfil del autor (no aplica a la reseña propia)
  const canOpenAuthor = !review.isOwn && author.id && author.id !== 'me';
  const handleAuthorTap = (e) => {
    if (!canOpenAuthor) return;
    e.stopPropagation();
    onAuthorTap?.(author);
  };

  const handleLike = (e) => {
    e.stopPropagation();
    const willLike = !liked;
    setLiked(willLike);
    if (willLike) setLikeBurst(b => b + 1);
  };
  const handleShare = (e) => {
    e.stopPropagation();
    if (onShareTap) {
      onShareTap({
        id: review.id,
        title: item.title,
        author: `${author.name} · ${item.author}`,
        cover: item.cover,
        accent: accent,
      });
    }
  };
  const handleComment = (e) => {
    e.stopPropagation();
    onThreadTap?.(review);
  };
  const handleTextTap = () => {
    onThreadTap?.(review);
  };

  return (
    <div className="mtx-glass" style={{
      padding:'14px 16px 12px', borderRadius:18,
      background: review.isOwn
        ? `linear-gradient(180deg, ${accent}10, rgba(255,255,255,0.012))`
        : 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))',
      border: review.isOwn ? `0.5px solid ${accent}40` : '0.5px solid rgba(255,255,255,0.06)',
      boxShadow: review.isOwn ? `0 0 0 0.5px ${accent}1a, 0 12px 28px -16px ${accent}40` : 'var(--shadow-card)',
      position:'relative', overflow:'hidden',
      fontFamily:'var(--ff-sans)',
    }}>
      {review.isOwn && (
        <div style={{
          position:'absolute', top:0, right:0,
          padding:'4px 10px 4px 12px',
          fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase',
          color:'#0a1410',
          background: accent,
          borderBottomLeftRadius:12,
          boxShadow:`0 0 12px ${accent}66`,
        }}>
          Tu reseña
        </div>
      )}

      {/* Header: Avatar + name + tagline + time — tap abre perfil del autor */}
      <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:11 }}>
        <div
          onClick={handleAuthorTap}
          role={canOpenAuthor ? 'button' : undefined}
          tabIndex={canOpenAuthor ? 0 : undefined}
          aria-label={canOpenAuthor ? `Ver perfil de ${author.name}` : undefined}
          onKeyDown={canOpenAuthor ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAuthorTap(e); } } : undefined}
          style={{ cursor: canOpenAuthor ? 'pointer' : 'default', flexShrink:0, borderRadius:'50%' }}
          className={canOpenAuthor ? 'mtx-tap' : undefined}
        >
          <CommunityAvatar author={author} size={38}/>
        </div>
        <div
          onClick={handleAuthorTap}
          role={canOpenAuthor ? 'button' : undefined}
          tabIndex={canOpenAuthor ? 0 : undefined}
          aria-label={canOpenAuthor ? `Ver perfil de ${author.name}` : undefined}
          onKeyDown={canOpenAuthor ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAuthorTap(e); } } : undefined}
          style={{ flex:1, minWidth:0, cursor: canOpenAuthor ? 'pointer' : 'default' }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
            <span style={{
              fontSize:13.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.01em',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:160,
            }}>
              {author.name}
            </span>
            <span style={{ width:3, height:3, borderRadius:'50%', background:'var(--ink-3)', opacity:0.5, flexShrink:0 }}/>
            <span style={{ fontSize:11, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums', letterSpacing:'-0.005em' }}>
              {review.timeAgo}
            </span>
          </div>
          <div style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'-0.005em',
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {author.tagline}
          </div>
        </div>
        <CommunityRating rating={review.rating} size={11}/>
      </div>

      {/* Review text — clickable abre thread */}
      <div
        onClick={handleTextTap}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTextTap(); } }}
        style={{
          fontSize:14, lineHeight:1.55, color:'var(--ink-1)',
          letterSpacing:'-0.005em', marginBottom:13,
          textWrap:'pretty', cursor:'pointer',
        }}
      >
        {review.text}
      </div>

      {/* Item card embed */}
      <div
        onClick={() => onItemTap?.(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onItemTap?.(item); } }}
        className="mtx-tap"
        style={{
          display:'flex', alignItems:'center', gap:11,
          padding:'9px 11px 9px 9px', borderRadius:13, cursor:'pointer',
          background:`linear-gradient(165deg, ${itemAccent}10 0%, rgba(255,255,255,0.018) 70%)`,
          border:`0.5px solid ${itemAccent}28`,
          marginBottom:11,
          transition:'background .2s, border-color .2s',
        }}
      >
        <div style={{
          width:42, height:42, borderRadius:10, flexShrink:0,
          position:'relative', overflow:'hidden',
          background: item.bg || `linear-gradient(135deg, ${itemAccent}33, ${itemAccent}10)`,
          border:`0.5px solid ${itemAccent}40`,
        }}>
          {item.cover && (
            <img src={item.cover} alt="" loading="lazy" style={{
              position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'cover',
            }}/>
          )}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="mtx-eyebrow" style={{ fontSize:8.5, color: itemAccent, letterSpacing:'0.14em', fontWeight:700, marginBottom:2 }}>
            {(window.CONTENT_TYPES || []).find(t => t.id === item.type)?.label || item.type}
          </div>
          <div style={{
            fontSize:13, fontWeight:700, color:'var(--ink-1)',
            letterSpacing:'-0.005em', lineHeight:1.18,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
            {item.title}
          </div>
          <div style={{
            fontSize:10.5, color:'var(--ink-3)', marginTop:1,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
            {item.author} · {item.dur}
          </div>
        </div>
        <div style={{
          width:30, height:30, borderRadius:'50%', flexShrink:0,
          background:`linear-gradient(180deg, ${itemAccent}26, ${itemAccent}0a)`,
          border:`0.5px solid ${itemAccent}45`,
          color: itemAccent,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 0 10px ${itemAccent}22, inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}>
          <IcPlay size={10} stroke="currentColor"/>
        </div>
      </div>

      {/* Actions footer */}
      <div style={{
        display:'flex', alignItems:'center', gap:18,
        paddingTop:8,
        borderTop:'0.5px solid rgba(255,255,255,0.05)',
      }}>
        {/* Like con animación cinemática */}
        <button onClick={handleLike} className="mtx-tap" aria-label={liked ? 'Quitar like' : 'Like'} style={{
          appearance:'none', cursor:'pointer', border:0, background:'transparent',
          display:'inline-flex', alignItems:'center', gap:5,
          color: liked ? '#ff8b8b' : 'var(--ink-3)',
          fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:600,
          fontVariantNumeric:'tabular-nums',
          padding:'4px 0', position:'relative',
          transition:'color .15s',
        }}>
          <span style={{ position:'relative', display:'inline-flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24"
                 fill={liked ? '#ff8b8b' : 'none'}
                 stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                 style={{
                   transform: liked ? 'scale(1.08)' : 'scale(1)',
                   transition:'transform .25s cubic-bezier(.34,1.56,.64,1)',
                   filter: liked ? 'drop-shadow(0 0 5px rgba(255,139,139,0.7))' : 'none',
                 }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {/* Burst particles */}
            {likeBurst > 0 && (
              <span key={likeBurst} aria-hidden="true" style={{
                position:'absolute', inset:0, pointerEvents:'none',
              }}>
                {[0, 1, 2, 3].map(i => (
                  <span key={i} style={{
                    position:'absolute', top:'50%', left:'50%',
                    width:3, height:3, borderRadius:'50%',
                    background:'#ff8b8b',
                    boxShadow:'0 0 4px rgba(255,139,139,0.9)',
                    animation:`mtxLikeBurst${i} .65s ease-out forwards`,
                    opacity:0,
                  }}/>
                ))}
                <style>{`
                  @keyframes mtxLikeBurst0 { 0% { transform:translate(-50%,-50%) scale(0.5); opacity:1; } 100% { transform:translate(-50%, -240%) scale(0.4); opacity:0; } }
                  @keyframes mtxLikeBurst1 { 0% { transform:translate(-50%,-50%) scale(0.5); opacity:1; } 100% { transform:translate(120%, -200%) scale(0.3); opacity:0; } }
                  @keyframes mtxLikeBurst2 { 0% { transform:translate(-50%,-50%) scale(0.5); opacity:1; } 100% { transform:translate(-220%, -200%) scale(0.3); opacity:0; } }
                  @keyframes mtxLikeBurst3 { 0% { transform:translate(-50%,-50%) scale(0.4); opacity:1; } 100% { transform:translate(-50%, -180%) scale(0.2); opacity:0; } }
                `}</style>
              </span>
            )}
          </span>
          {totalLikes}
        </button>

        <button onClick={handleComment} className="mtx-tap" aria-label="Comentar" style={{
          appearance:'none', cursor:'pointer', border:0, background:'transparent',
          display:'inline-flex', alignItems:'center', gap:5,
          color: commentCount > 0 ? 'var(--ink-2)' : 'var(--ink-3)',
          fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:600,
          fontVariantNumeric:'tabular-nums', padding:'4px 0',
        }}>
          <IcMessage size={13} stroke="currentColor" strokeWidth={1.6}/>
          {commentCount}
        </button>

        <button onClick={handleShare} className="mtx-tap" aria-label="Compartir" style={{
          appearance:'none', cursor:'pointer', border:0, background:'transparent',
          display:'inline-flex', alignItems:'center', gap:5,
          color:'var(--ink-3)',
          fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:600,
          padding:'4px 0', marginLeft:'auto',
        }}>
          <IcShare size={13} stroke="currentColor" strokeWidth={1.6}/>
        </button>
      </div>
    </div>
  );
}

// ── CommunityScreen — feed unificado de reseñas ────────────────────────────
function CommunityScreen() {
  const [, force] = React.useReducer(x => x + 1, 0);
  const [filter, setFilter] = React.useState('all'); // all | audiobook | meditation | series | talk | sound | mine
  const [shareEntity, setShareEntity] = React.useState(null);
  const [rankingOpen, setRankingOpen] = React.useState(false);
  const [threadReview, setThreadReview] = React.useState(null);
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  React.useEffect(() => {
    const handler = () => force();
    window.addEventListener('mtx:reviews-changed', handler);
    return () => window.removeEventListener('mtx:reviews-changed', handler);
  }, []);

  const feed = React.useMemo(() => {
    const userReviews = (window.__mtxReviews ? window.__mtxReviews.list() : [])
      .filter(r => r.isPublic)
      .map(r => {
        const item = (window.EXPLORE_CONTENT || []).find(c => c.id === r.itemId);
        return {
          ...r,
          author: { id:'me', name:'Tú', initial:'J', accent:'#3dffd1', tagline:'Tu reflexión más reciente' },
          item,
          timeAgo: 'Ahora',
          isOwn: true,
        };
      })
      .filter(r => r.item);

    const mockEnriched = _MOCK_COMMUNITY_REVIEWS.map(r => {
      const author = _MOCK_COMMUNITY_AUTHORS.find(a => a.id === r.authorId);
      const item = (window.EXPLORE_CONTENT || []).find(c => c.id === r.itemId);
      return { ...r, author, item, isOwn: false };
    }).filter(r => r.item && r.author);

    let all = [...userReviews, ...mockEnriched];

    if (filter === 'mine') all = all.filter(r => r.isOwn);
    else if (filter !== 'all') all = all.filter(r => r.item.type === filter);

    return all;
  }, [filter, window.__mtxReviews ? window.__mtxReviews.list().length : 0]); // eslint-disable-line

  const handleItemTap = (item) => {
    window.dispatchEvent(new CustomEvent('mtx:open-item-from-community', { detail: { itemId: item.id } }));
  };
  const handleRanking = () => setRankingOpen(true);
  const handleShareTap = (entity) => {
    setShareEntity(entity);
  };
  const handleThreadTap = (review) => {
    setThreadReview(review);
  };
  const handleAuthorTap = (author) => {
    if (!author?.id || author.id === 'me') return;
    window.dispatchEvent(new CustomEvent('mtx:open-user-profile', { detail: { userId: author.id } }));
  };

  // Filtros: Todo + tipos disponibles + Mis reseñas
  const FILTERS = React.useMemo(() => {
    const base = [{ id: 'all', label: 'Todo', Ic: null }];
    const types = (window.CONTENT_TYPES || []).filter(t => t.id !== 'all');
    const mine = [{ id: 'mine', label: 'Mis reseñas', Ic: null }];
    return [...base, ...types, ...mine];
  }, []);

  return (
    <div style={{ paddingTop:60, paddingBottom:140, animation:'mtx-fade-up .4s ease both' }}>

      {/* Header */}
      <div style={{ padding:'8px 20px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="mtx-eyebrow" style={{ marginBottom:6, color:'var(--neon)', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{
              width:6, height:6, borderRadius:999, background:'var(--neon)',
              boxShadow:'0 0 8px var(--neon)',
              animation:'mtxPulseDot 2s ease-in-out infinite',
            }}/>
            <style>{`@keyframes mtxPulseDot { 0%,100% { opacity:0.6; } 50% { opacity:1; } }`}</style>
            Comunidad
          </div>
          <h1 className="mtx-h-1" style={{ margin:0, color:'var(--ink-1)', fontSize:26, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1 }}>
            Lo que la mente colectiva está descubriendo.
          </h1>
          <p style={{ margin:'8px 0 0', fontSize:13, color:'var(--ink-3)', lineHeight:1.5 }}>
            Reflexiones reales de personas que terminaron lo que tú estás por empezar.
          </p>
        </div>

        {/* Ranking button (sola acción del header) */}
        <button onClick={handleRanking} aria-label="Ranking semanal" className="mtx-tap" style={{
          position:'relative', width:44, height:44, borderRadius:999,
          background:'linear-gradient(180deg, rgba(255,214,107,0.14), rgba(255,214,107,0.04))',
          border:'0.5px solid rgba(255,214,107,0.32)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#FFD66B', cursor:'pointer', flexShrink:0, marginLeft:10,
          boxShadow:'inset 0 0 12px rgba(255,214,107,0.08), 0 0 14px rgba(255,214,107,0.18)',
          transition:'background .2s',
        }}>
          <IcTrophy size={20} stroke="currentColor" strokeWidth={1.6}/>
        </button>
      </div>

      {/* Filtros por categoría */}
      <div className="mtx-no-scrollbar" style={{ padding:'0 20px 22px', display:'flex', gap:8, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
        {FILTERS.map(f => {
          const isActive = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)} className="mtx-tap" style={{
              appearance:'none', cursor:'pointer',
              flexShrink:0,
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'8px 14px', borderRadius:999,
              border: isActive ? '0.5px solid rgba(61,255,209,0.45)' : '0.5px solid rgba(255,255,255,0.08)',
              background: isActive ? 'linear-gradient(180deg, rgba(61,255,209,0.16), rgba(61,255,209,0.04))' : 'rgba(255,255,255,0.04)',
              color: isActive ? 'var(--neon)' : 'var(--ink-2)',
              fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:600,
              letterSpacing:'-0.005em',
              boxShadow: isActive ? '0 0 0 1px rgba(61,255,209,0.18), 0 6px 16px -8px rgba(61,255,209,0.4)' : 'none',
              transition:'background .2s, border-color .2s, color .2s, box-shadow .25s',
            }}>
              {f.Ic && <f.Ic size={12} stroke="currentColor" strokeWidth={1.7}/>}
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:14 }}>
        {feed.length === 0 ? (
          <div style={{ padding:'56px 28px', textAlign:'center' }}>
            <div style={{
              width:72, height:72, borderRadius:22, margin:'0 auto 16px',
              background:'rgba(255,255,255,0.04)',
              border:'0.5px solid rgba(255,255,255,0.08)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--ink-3)',
            }}>
              <IcUsers size={26} stroke="currentColor" strokeWidth={1.5}/>
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.018em', marginBottom:6 }}>
              Aún no hay reseñas con ese filtro
            </div>
            <div style={{ fontSize:12, color:'var(--ink-3)', maxWidth:260, margin:'0 auto', lineHeight:1.5 }}>
              Cambia el filtro o publica tu propia reseña al terminar un contenido.
            </div>
          </div>
        ) : (
          feed.map(r => (
            <CommunityReviewCard
              key={r.id} review={r}
              onItemTap={handleItemTap}
              onShareTap={handleShareTap}
              onThreadTap={handleThreadTap}
              onAuthorTap={handleAuthorTap}
            />
          ))
        )}
      </div>

      {/* Share sheet — portal-mounted al viewport del IOSDevice */}
      {shareEntity && window.ShareSheet && (() => {
        const ShareSheetCmp = window.ShareSheet;
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const sheet = <ShareSheetCmp item={shareEntity} onClose={() => setShareEntity(null)}/>;
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(sheet, overlayRoot)
          : sheet;
      })()}

      {/* Ranking screen — overlay full screen portal-mounted */}
      {rankingOpen && window.RankingScreen && (() => {
        const RankingScreenCmp = window.RankingScreen;
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const screen = <RankingScreenCmp onClose={() => setRankingOpen(false)}/>;
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(screen, overlayRoot)
          : screen;
      })()}

      {/* Review thread screen — overlay portal-mounted */}
      {threadReview && window.ReviewThreadScreen && (() => {
        const ThreadCmp = window.ReviewThreadScreen;
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const screen = (
          <ThreadCmp
            review={threadReview}
            onClose={() => setThreadReview(null)}
            onItemTap={(item) => {
              setThreadReview(null);
              setTimeout(() => handleItemTap(item), 200);
            }}
            onShareTap={(entity) => setShareEntity(entity)}
            onAuthorTap={(author) => {
              if (!author?.id || author.id === 'me') return;
              setThreadReview(null);
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('mtx:open-user-profile', { detail: { userId: author.id } }));
              }, 200);
            }}
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
  CommunityScreen, CommunityReviewCard, CommunityAvatar, CommunityRating,
  _MOCK_COMMUNITY_AUTHORS, _MOCK_COMMUNITY_REVIEWS, _USER_STATS_MOCK,
});
