// thread-flow.jsx — Sistema de comentarios + thread (Twitter style)

// ── Comments store ──────────────────────────────────────────────────────────
// shape: { [reviewId]: [{ id, authorId, parentId|null, text, createdAt, likes, isOwn }, ...] }
const _COMMENTS_EVENT = 'mtx:comments-changed';
if (typeof window !== 'undefined' && !window.__mtxComments) {
  // Mock seed: comments precargados para las 7 reviews del community feed
  // Authors disponibles: mariana, andres, lucia, tomas, isabella, rodrigo
  // El usuario actual es 'me'
  let _store = {
    'cr-1': [
      { id:'c-1-1', authorId:'tomas',    parentId:null,    text:'Esta idea sola me cambió toda la lectura. La identidad como brújula > las metas como zanahorias.', createdAt: Date.now() - 1000*60*72, likes: 14 },
      { id:'c-1-2', authorId:'isabella', parentId:'c-1-1', text:'Exacto. Y lo más sutil es que las metas requieren disciplina, la identidad solo requiere consistencia.', createdAt: Date.now() - 1000*60*55, likes: 9 },
      { id:'c-1-3', authorId:'lucia',    parentId:'c-1-1', text:'Para mí lo conectó con lo de "no decides cómo te sientes, decides cómo respondes".', createdAt: Date.now() - 1000*60*42, likes: 4 },
      { id:'c-1-4', authorId:'andres',   parentId:null,    text:'Lo que me lo hizo concreto fue el ejemplo del fumador: no es "no quiero fumar" sino "no soy fumador". El cambio de tense lo es todo.', createdAt: Date.now() - 1000*60*30, likes: 22 },
      { id:'c-1-5', authorId:'rodrigo',  parentId:null,    text:'Es la mejor reseña que he leído de este libro. Justo describiste lo que yo no podía articular.', createdAt: Date.now() - 1000*60*18, likes: 8 },
    ],
    'cr-2': [
      { id:'c-2-1', authorId:'mariana',  parentId:null,    text:'El shutdown ritual es brutal. Llevo dos semanas y duermo distinto.', createdAt: Date.now() - 1000*60*180, likes: 11 },
      { id:'c-2-2', authorId:'andres',   parentId:'c-2-1', text:'¿Cuál haces? Yo cierro con: revisar agenda mañana → "schedule shutdown complete".', createdAt: Date.now() - 1000*60*160, likes: 5 },
      { id:'c-2-3', authorId:'mariana',  parentId:'c-2-1', text:'Casi igual. Solo añadí escribir 1 línea de qué fue lo más importante del día. Ancla emocional.', createdAt: Date.now() - 1000*60*150, likes: 7 },
      { id:'c-2-4', authorId:'tomas',    parentId:null,    text:'La idea más subestimada del libro: la atención fragmentada NO es procrastinación. Es daño cognitivo acumulado.', createdAt: Date.now() - 1000*60*120, likes: 18 },
    ],
    'cr-3': [
      { id:'c-3-1', authorId:'rodrigo',  parentId:null,    text:'Las partes lentas son las que más me sirvieron. Tolle no escribe para informar, escribe para que pares.', createdAt: Date.now() - 1000*60*60*5, likes: 16 },
      { id:'c-3-2', authorId:'lucia',    parentId:'c-3-1', text:'Cierto. Si lo lees con prisa, no funciona. Es casi un libro de práctica más que de lectura.', createdAt: Date.now() - 1000*60*60*4, likes: 9 },
      { id:'c-3-3', authorId:'isabella', parentId:null,    text:'Recomendado a quien viva en su cabeza más que en su cuerpo. (Yo).', createdAt: Date.now() - 1000*60*60*3, likes: 12 },
    ],
    'cr-4': [
      { id:'c-4-1', authorId:'andres',   parentId:null,    text:'Esto me explotó la cabeza la primera vez que lo leí. Que el dinero también es una "ficción útil" coordinada.', createdAt: Date.now() - 1000*60*60*8, likes: 24 },
      { id:'c-4-2', authorId:'mariana',  parentId:'c-4-1', text:'Y los derechos humanos. Y las naciones. Todo lo que sostenemos colectivamente.', createdAt: Date.now() - 1000*60*60*7, likes: 13 },
      { id:'c-4-3', authorId:'rodrigo',  parentId:null,    text:'Lo más perturbador es darse cuenta de cuántas de esas ficciones son útiles vs. cuántas son solo viejas.', createdAt: Date.now() - 1000*60*60*5, likes: 17 },
      { id:'c-4-4', authorId:'lucia',    parentId:null,    text:'Tu reseña en sí ya es una ficción útil — me hiciste querer escucharlo de nuevo.', createdAt: Date.now() - 1000*60*60*3, likes: 6 },
    ],
    'cr-5': [
      { id:'c-5-1', authorId:'mariana',  parentId:null,    text:'Me gusta cómo lo planteas. La respiración como ancla a la elección consciente.', createdAt: Date.now() - 1000*60*60*24*1.5, likes: 8 },
      { id:'c-5-2', authorId:'tomas',    parentId:null,    text:'12 minutos exactos es el sweet spot. Suficiente para entrar, no tanto para que se vuelva tarea.', createdAt: Date.now() - 1000*60*60*24, likes: 5 },
    ],
    'cr-6': [
      { id:'c-6-1', authorId:'andres',   parentId:null,    text:'Build, ship, learn. Lo escribo en mi muro. Tres meses esperando "estar listo" = tres meses sin feedback real.', createdAt: Date.now() - 1000*60*60*24*2.5, likes: 19 },
      { id:'c-6-2', authorId:'isabella', parentId:'c-6-1', text:'El "build" es la parte fácil. El "ship" es donde mueren los proyectos.', createdAt: Date.now() - 1000*60*60*24*2, likes: 11 },
      { id:'c-6-3', authorId:'mariana',  parentId:null,    text:'Esto debería ser obligatorio antes de empezar cualquier proyecto. Ahorraría meses.', createdAt: Date.now() - 1000*60*60*24*1.8, likes: 9 },
    ],
    'cr-7': [
      { id:'c-7-1', authorId:'lucia',    parentId:null,    text:'La voz hipnótica es real. Tres veces que la pongo, tres veces que no llego al final.', createdAt: Date.now() - 1000*60*60*24*3, likes: 15 },
      { id:'c-7-2', authorId:'rodrigo',  parentId:null,    text:'Lo escucho con audífonos buenos y es otra experiencia. Las frecuencias bajas hacen el trabajo.', createdAt: Date.now() - 1000*60*60*24*2.5, likes: 8 },
      { id:'c-7-3', authorId:'isabella', parentId:'c-7-2', text:'Confirmado. Hace una diferencia enorme.', createdAt: Date.now() - 1000*60*60*24*2, likes: 3 },
      { id:'c-7-4', authorId:'andres',   parentId:null,    text:'Llevo 7 noches en racha. Es legítimamente medicinal.', createdAt: Date.now() - 1000*60*60*24*1.5, likes: 22 },
    ],
  };

  window.__mtxComments = {
    list: (reviewId) => (_store[reviewId] || []).slice(),
    countFor: (reviewId) => (_store[reviewId] || []).length,
    add: (reviewId, comment) => {
      if (!_store[reviewId]) _store[reviewId] = [];
      const entry = { ...comment, id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() };
      _store[reviewId] = [..._store[reviewId], entry];
      window.dispatchEvent(new CustomEvent(_COMMENTS_EVENT, { detail: { reviewId, action:'add', entry } }));
      return entry;
    },
    remove: (reviewId, commentId) => {
      if (!_store[reviewId]) return false;
      // Eliminar el comment + cualquier reply huérfano (parentId = commentId)
      const before = _store[reviewId].length;
      _store[reviewId] = _store[reviewId].filter(c => c.id !== commentId && c.parentId !== commentId);
      const removed = before - _store[reviewId].length;
      if (removed > 0) window.dispatchEvent(new CustomEvent(_COMMENTS_EVENT, { detail: { reviewId, action:'remove', commentId } }));
      return removed > 0;
    },
  };
}

// Hook para suscribirse al store de comments
function useCommentCount(reviewId) {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const handler = (e) => { if (!e.detail || e.detail.reviewId === reviewId) force(); };
    window.addEventListener(_COMMENTS_EVENT, handler);
    return () => window.removeEventListener(_COMMENTS_EVENT, handler);
  }, [reviewId]);
  return window.__mtxComments ? window.__mtxComments.countFor(reviewId) : 0;
}

// ── Helper: format relative time ────────────────────────────────────────────
const _formatRelative = (createdAt) => {
  const diffMs = Date.now() - (createdAt || Date.now());
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  return `${w}sem`;
};

// ── ThreadCommentRow — un comment (root o reply) ────────────────────────────
function ThreadCommentRow({ comment, author, isReply = false, onReplyTap, onDelete, onAuthorTap }) {
  const [liked, setLiked] = React.useState(false);
  const [likeBurst, setLikeBurst] = React.useState(0);
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  if (!author) return null;
  const accent = author.accent || '#3dffd1';
  const totalLikes = (comment.likes || 0) + (liked ? 1 : 0);
  const avatarSize = isReply ? 28 : 34;

  const handleLike = (e) => {
    e.stopPropagation();
    const willLike = !liked;
    setLiked(willLike);
    if (willLike) setLikeBurst(b => b + 1);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(comment);
    toast.show({ message: 'Comentario eliminado', duration: 1400 });
  };

  return (
    <div style={{
      display:'flex', gap:10,
      paddingLeft: isReply ? 36 : 0,
      position:'relative',
      fontFamily:'var(--ff-sans)',
    }}>
      {/* Thread connector line para replies */}
      {isReply && (
        <div style={{
          position:'absolute', left:14, top:-4, bottom:'50%',
          width:14, borderLeft:'1px solid rgba(255,255,255,0.1)',
          borderBottom:'1px solid rgba(255,255,255,0.1)',
          borderBottomLeftRadius:8,
          pointerEvents:'none',
        }}/>
      )}

      {/* Avatar */}
      <div
        onClick={() => onAuthorTap?.(author)}
        role="button"
        tabIndex={0}
        aria-label={`Ver perfil de ${author.name}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAuthorTap?.(author); } }}
        style={{ flexShrink:0, cursor:'pointer' }}
      >
        <CommunityAvatar author={author} size={avatarSize}/>
      </div>

      {/* Body */}
      <div style={{ flex:1, minWidth:0, paddingTop:1 }}>
        {/* Header: name + tagline + time */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
          <span
            onClick={() => onAuthorTap?.(author)}
            role="button"
            tabIndex={0}
            aria-label={`Ver perfil de ${author.name}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAuthorTap?.(author); } }}
            style={{
              fontSize: isReply ? 12 : 12.5, fontWeight:700,
              color:'var(--ink-1)', letterSpacing:'-0.005em',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:140,
              cursor:'pointer',
            }}
          >
            {author.name}
          </span>
          <span style={{ fontSize:10.5, color:'var(--ink-3)', letterSpacing:'-0.005em',
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex:1 }}>
            {author.tagline}
          </span>
          <span style={{ fontSize:10.5, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums', flexShrink:0 }}>
            {_formatRelative(comment.createdAt)}
          </span>
        </div>

        {/* Text */}
        <div style={{
          fontSize: isReply ? 13 : 13.5, lineHeight:1.5, color:'var(--ink-1)',
          letterSpacing:'-0.005em', marginBottom:7, textWrap:'pretty',
        }}>
          {comment.text}
        </div>

        {/* Actions footer */}
        <div style={{ display:'flex', alignItems:'center', gap:14, fontSize:11.5, color:'var(--ink-3)' }}>
          <button onClick={handleLike} className="mtx-tap" aria-label={liked ? 'Quitar like' : 'Like'} style={{
            appearance:'none', cursor:'pointer', border:0, background:'transparent',
            display:'inline-flex', alignItems:'center', gap:4,
            color: liked ? '#ff8b8b' : 'var(--ink-3)',
            fontFamily:'var(--ff-sans)', fontSize:11.5, fontWeight:600,
            fontVariantNumeric:'tabular-nums', padding:'2px 0',
            position:'relative', transition:'color .15s',
          }}>
            <span style={{ position:'relative', display:'inline-flex' }}>
              <svg width="13" height="13" viewBox="0 0 24 24"
                   fill={liked ? '#ff8b8b' : 'none'}
                   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                   style={{
                     transform: liked ? 'scale(1.1)' : 'scale(1)',
                     transition:'transform .25s cubic-bezier(.34,1.56,.64,1)',
                     filter: liked ? 'drop-shadow(0 0 4px rgba(255,139,139,0.7))' : 'none',
                   }}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {likeBurst > 0 && (
                <span key={likeBurst} aria-hidden="true" style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      position:'absolute', top:'50%', left:'50%',
                      width:2.5, height:2.5, borderRadius:'50%',
                      background:'#ff8b8b',
                      boxShadow:'0 0 4px rgba(255,139,139,0.9)',
                      animation:`mtxThreadLikeBurst${i} .55s ease-out forwards`,
                      opacity:0,
                    }}/>
                  ))}
                  <style>{`
                    @keyframes mtxThreadLikeBurst0 { 0% { transform:translate(-50%,-50%) scale(0.5); opacity:1; } 100% { transform:translate(-50%, -240%) scale(0.4); opacity:0; } }
                    @keyframes mtxThreadLikeBurst1 { 0% { transform:translate(-50%,-50%) scale(0.5); opacity:1; } 100% { transform:translate(140%, -200%) scale(0.3); opacity:0; } }
                    @keyframes mtxThreadLikeBurst2 { 0% { transform:translate(-50%,-50%) scale(0.5); opacity:1; } 100% { transform:translate(-240%, -200%) scale(0.3); opacity:0; } }
                  `}</style>
                </span>
              )}
            </span>
            {totalLikes}
          </button>

          {!isReply && (
            <button onClick={() => onReplyTap?.(comment, author)} className="mtx-tap" aria-label="Responder" style={{
              appearance:'none', cursor:'pointer', border:0, background:'transparent',
              display:'inline-flex', alignItems:'center', gap:4,
              color:'var(--ink-3)',
              fontFamily:'var(--ff-sans)', fontSize:11.5, fontWeight:600, padding:'2px 0',
            }}>
              <IcMessage size={12} stroke="currentColor" strokeWidth={1.6}/>
              Responder
            </button>
          )}

          {comment.isOwn && onDelete && (
            <button onClick={handleDelete} className="mtx-tap" aria-label="Eliminar" style={{
              appearance:'none', cursor:'pointer', border:0, background:'transparent',
              display:'inline-flex', alignItems:'center', gap:4,
              color:'rgba(255,140,140,0.7)',
              fontFamily:'var(--ff-sans)', fontSize:11, fontWeight:600,
              padding:'2px 0', marginLeft:'auto',
            }}>
              <IcClose size={11} stroke="currentColor" strokeWidth={1.8}/>
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ThreadInput — input sticky con quick reactions y replying chip ──────────
const _QUICK_REACTIONS = ['💯', '🔥', '🎯', '💡', '❤️', '👏'];

function ThreadInput({ replyingTo, onCancelReply, onSubmit, accent = '#3dffd1' }) {
  const [text, setText] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!replyingTo || !inputRef.current) return;
    // setTimeout con cleanup explícito: si replyingTo cambia o el componente
    // se desmonta antes de los 60ms, cancelamos el focus para evitar foco
    // inesperado en estados intermedios.
    const t = setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 60);
    return () => clearTimeout(t);
  }, [replyingTo]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
    setText('');
  };
  const handleEmoji = (emoji) => {
    setText(t => t + emoji);
    inputRef.current?.focus({ preventScroll: true });
  };

  const valid = text.trim().length > 0;

  return (
    <div style={{
      position:'absolute', left:0, right:0, bottom:0,
      background:'linear-gradient(180deg, rgba(15,19,18,0.6), rgba(15,19,18,0.96) 30%)',
      backdropFilter:'blur(22px)', WebkitBackdropFilter:'blur(22px)',
      borderTop:'0.5px solid rgba(255,255,255,0.06)',
      paddingTop:8, paddingBottom:14,
      animation:'mtx-fade-up .25s ease',
    }}>
      {/* Replying chip */}
      {replyingTo && (
        <div style={{
          padding:'6px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between',
          fontFamily:'var(--ff-sans)',
        }}>
          <div style={{ fontSize:10.5, color: accent, fontWeight:700, letterSpacing:'-0.005em' }}>
            <span style={{ opacity:0.7 }}>Respondiendo a</span> {' '}
            <span style={{ fontWeight:700 }}>@{replyingTo.author.name.split(' ')[0]}</span>
          </div>
          <button onClick={onCancelReply} className="mtx-tap" aria-label="Cancelar respuesta" style={{
            appearance:'none', cursor:'pointer', border:0, background:'transparent',
            color:'var(--ink-3)', display:'inline-flex', alignItems:'center', gap:3,
            fontSize:10.5, fontWeight:600, padding:'2px 6px',
          }}>
            <IcClose size={11} stroke="currentColor" strokeWidth={2}/>
            Cancelar
          </button>
        </div>
      )}

      {/* Quick reactions */}
      <div className="mtx-no-scrollbar" style={{
        display:'flex', gap:6, overflowX:'auto', WebkitOverflowScrolling:'touch',
        padding:'8px 14px',
      }}>
        {_QUICK_REACTIONS.map(emoji => (
          <button key={emoji} onClick={() => handleEmoji(emoji)} className="mtx-tap" style={{
            appearance:'none', cursor:'pointer', flexShrink:0,
            width:36, height:36, borderRadius:'50%',
            border:'0.5px solid rgba(255,255,255,0.08)',
            background:'rgba(255,255,255,0.04)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:17,
            transition:'background .15s, border-color .15s, transform .15s',
          }}>
            {emoji}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div style={{
        padding:'4px 14px 0',
        display:'flex', alignItems:'flex-end', gap:9,
      }}>
        <CommunityAvatar author={{ id:'me', name:'Tú', initial:'J', accent:'#3dffd1' }} size={32}/>
        <div style={{
          flex:1, minWidth:0,
          display:'flex', alignItems:'flex-end', gap:6,
          padding:'8px 10px 8px 14px', borderRadius:18,
          background:'rgba(0,0,0,0.32)',
          border: valid ? `0.5px solid ${accent}45` : '0.5px solid rgba(255,255,255,0.08)',
          boxShadow: valid ? `inset 0 0 0 1px ${accent}24` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
          transition:'border-color .2s, box-shadow .25s',
        }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            maxLength={280}
            placeholder={replyingTo ? `@${replyingTo.author.name.split(' ')[0]} ` : 'Comparte tu pensamiento…'}
            onChange={e => {
              setText(e.target.value);
              // Auto-resize
              e.target.style.height = '24px';
              e.target.style.height = Math.min(96, e.target.scrollHeight) + 'px';
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              if (e.key === 'Escape' && replyingTo) onCancelReply?.();
            }}
            style={{
              appearance:'none', flex:1, minWidth:0,
              border:0, outline:'none', resize:'none',
              background:'transparent',
              color:'var(--ink-1)', fontSize:14, fontWeight:500,
              fontFamily:'var(--ff-sans)', letterSpacing:'-0.005em',
              lineHeight:1.45,
              minHeight:24, maxHeight:96,
              padding:0,
            }}
          />
          <button onClick={handleSubmit} disabled={!valid} aria-label="Enviar" className="mtx-tap" style={{
            appearance:'none', flexShrink:0,
            width:32, height:32, borderRadius:'50%', border:0,
            cursor: valid ? 'pointer' : 'not-allowed',
            background: valid
              ? 'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))'
              : 'rgba(255,255,255,0.06)',
            color: valid ? '#0a1410' : 'var(--ink-3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow: valid ? '0 0 0 1px rgba(61,255,209,0.4), 0 6px 14px -4px rgba(61,255,209,0.5), inset 0 1px 0 rgba(255,255,255,0.4)' : 'none',
            transition:'background .25s, box-shadow .3s',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ReviewThreadScreen — overlay full screen con el hilo de conversación ────
function ReviewThreadScreen({ review, onClose, onItemTap, onShareTap, onAuthorTap }) {
  const [, force] = React.useReducer(x => x + 1, 0);
  const [replyingTo, setReplyingTo] = React.useState(null); // { commentId, author } | null
  const [dragY, setDragY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartY = React.useRef(0);
  const dragActiveRef = React.useRef(false);
  const [postLiked, setPostLiked] = React.useState(false);
  const [postLikeBurst, setPostLikeBurst] = React.useState(0);

  // Filtramos eventos del store de comments por reviewId — sin esto, cambios en
  // CUALQUIER thread re-renderizan este screen aunque sea de otra reseña.
  const reviewId = review?.id;
  React.useEffect(() => {
    const handler = (e) => {
      if (!e.detail || !reviewId || e.detail.reviewId === reviewId) force();
    };
    window.addEventListener(_COMMENTS_EVENT, handler);
    return () => window.removeEventListener(_COMMENTS_EVENT, handler);
  }, [reviewId]);

  if (!review || !review.author || !review.item) return null;

  const accent = review.author.accent || '#3dffd1';
  const item = review.item;
  const itemAccent = item.accent || '#3dffd1';

  // Authors lookup — Map memoizado en lugar de O(n) find() por comment
  const allAuthors = (window._MOCK_COMMUNITY_AUTHORS || []);
  const authorMap = React.useMemo(() => {
    const m = new Map();
    m.set('me', { id:'me', name:'Tú · Juan Diego', initial:'J', accent:'#3dffd1', tagline:'Tu reflexión más reciente' });
    for (const a of allAuthors) m.set(a.id, a);
    return m;
  }, [allAuthors]);
  const lookupAuthor = (authorId) => authorMap.get(authorId);

  // Comments organizados: roots primero (cronológico), replies bajo cada root
  const allComments = window.__mtxComments ? window.__mtxComments.list(review.id) : [];
  const rootComments = allComments.filter(c => !c.parentId).sort((a, b) => a.createdAt - b.createdAt);
  const repliesByParent = allComments.filter(c => c.parentId).reduce((acc, c) => {
    if (!acc[c.parentId]) acc[c.parentId] = [];
    acc[c.parentId].push(c);
    return acc;
  }, {});

  // Drag-to-dismiss
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

  const handleSubmitComment = (text) => {
    const isReplyMode = !!replyingTo;
    let finalText = text;
    if (isReplyMode) {
      const handle = replyingTo.author.name.split(' ')[0];
      const mention = `@${handle}`;
      if (!text.startsWith(mention)) finalText = `${mention} ${text}`;
    }
    window.__mtxComments.add(review.id, {
      authorId: 'me',
      parentId: replyingTo ? replyingTo.commentId : null,
      text: finalText,
      likes: 0,
      isOwn: true,
    });
    setReplyingTo(null);
  };

  const handleReplyTap = (comment, author) => {
    setReplyingTo({ commentId: comment.id, author });
  };
  const handleDeleteComment = (comment) => {
    window.__mtxComments.remove(review.id, comment.id);
  };

  const handlePostLike = () => {
    const willLike = !postLiked;
    setPostLiked(willLike);
    if (willLike) setPostLikeBurst(b => b + 1);
  };
  const handlePostShare = () => {
    onShareTap?.({
      id: review.id,
      title: item.title,
      author: `${review.author.name} · ${item.author}`,
      cover: item.cover,
      accent,
    });
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:166,
      background:'#050706',
      transform:`translateY(${dragY}px)`,
      transition: isDragging ? 'none' : 'transform .4s cubic-bezier(.25,.8,.25,1)',
      animation:'mtxThreadSlide .4s cubic-bezier(.25,.8,.25,1) both',
      display:'flex', flexDirection:'column',
      willChange:'transform', overflow:'hidden',
    }}>
      <style>{`@keyframes mtxThreadSlide { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

      {/* Drag handle */}
      <div
        style={{ paddingTop:14, paddingBottom:8, display:'flex', justifyContent:'center', cursor:'grab', touchAction:'none', flexShrink:0 }}
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
      >
        <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.2)' }}/>
      </div>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', padding:'0 16px 10px', justifyContent:'space-between', flexShrink:0,
                    borderBottom:'0.5px solid rgba(255,255,255,0.05)', paddingBottom:12 }}>
        <button onClick={onClose} aria-label="Cerrar" className="mtx-tap" style={{
          width:36, height:36, borderRadius:999, border:0,
          background:'rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--ink-1)', cursor:'pointer', flexShrink:0,
        }}>
          <IcChevD size={20} stroke="currentColor"/>
        </button>
        <div style={{ textAlign:'center', flex:1, minWidth:0, padding:'0 12px' }}>
          <div className="mtx-eyebrow" style={{ fontSize:9, color: accent, letterSpacing:'0.16em', marginBottom:2 }}>
            Hilo
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.018em', whiteSpace:'nowrap',
                        fontVariantNumeric:'tabular-nums' }}>
            {allComments.length} {allComments.length === 1 ? 'respuesta' : 'respuestas'}
          </div>
        </div>
        <button onClick={handlePostShare} aria-label="Compartir hilo" className="mtx-tap" style={{
          width:36, height:36, borderRadius:999, border:0,
          background:'rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--ink-1)', cursor:'pointer', flexShrink:0,
        }}>
          <IcShare size={15} stroke="currentColor" strokeWidth={1.7}/>
        </button>
      </div>

      {/* Scroll body */}
      <div className="mtx-no-scrollbar" style={{
        flex:1, overflowY:'auto', paddingBottom: 188, // espacio para input + reactions + replying chip + safe area
      }}>
        {/* Original post — vista expandida */}
        <div style={{ padding:'14px 18px 12px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
          {/* Author — tap abre perfil del autor (excepto si es el propio user) */}
          {(() => {
            const canOpenAuthor = review.author.id && review.author.id !== 'me' && !review.isOwn;
            const tap = canOpenAuthor ? (e) => { e?.stopPropagation?.(); onAuthorTap?.(review.author); } : undefined;
            return (
              <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:11 }}>
                <div
                  onClick={tap}
                  role={canOpenAuthor ? 'button' : undefined}
                  tabIndex={canOpenAuthor ? 0 : undefined}
                  aria-label={canOpenAuthor ? `Ver perfil de ${review.author.name}` : undefined}
                  onKeyDown={canOpenAuthor ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(e); } } : undefined}
                  style={{ cursor: canOpenAuthor ? 'pointer' : 'default', flexShrink:0, borderRadius:'50%' }}
                  className={canOpenAuthor ? 'mtx-tap' : undefined}
                >
                  <CommunityAvatar author={review.author} size={44}/>
                </div>
                <div
                  onClick={tap}
                  role={canOpenAuthor ? 'button' : undefined}
                  tabIndex={canOpenAuthor ? 0 : undefined}
                  aria-label={canOpenAuthor ? `Ver perfil de ${review.author.name}` : undefined}
                  onKeyDown={canOpenAuthor ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(e); } } : undefined}
                  style={{ flex:1, minWidth:0, cursor: canOpenAuthor ? 'pointer' : 'default' }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                    <span style={{
                      fontSize:14.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.01em',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:200,
                    }}>
                      {review.author.name}
                    </span>
                    <span style={{ width:3, height:3, borderRadius:'50%', background:'var(--ink-3)', opacity:0.5, flexShrink:0 }}/>
                    <span style={{ fontSize:11, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
                      {review.timeAgo}
                    </span>
                  </div>
                  <div style={{ fontSize:11.5, color:'var(--ink-3)', letterSpacing:'-0.005em',
                                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {review.author.tagline}
                  </div>
                </div>
                <CommunityRating rating={review.rating} size={12}/>
              </div>
            );
          })()}

          {/* Review text — más grande que en el feed */}
          <div style={{
            fontSize:15, lineHeight:1.55, color:'var(--ink-1)',
            letterSpacing:'-0.005em', marginBottom:14,
            textWrap:'pretty',
          }}>
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
              marginBottom:14,
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
                  position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
                }}/>
              )}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="mtx-eyebrow" style={{ fontSize:8.5, color: itemAccent, letterSpacing:'0.14em', fontWeight:700, marginBottom:2 }}>
                {(window.CONTENT_TYPES || []).find(t => t.id === item.type)?.label || item.type}
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.005em', lineHeight:1.18,
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {item.title}
              </div>
              <div style={{ fontSize:10.5, color:'var(--ink-3)', marginTop:1,
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
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

          {/* Footer: like + share del post original */}
          <div style={{ display:'flex', alignItems:'center', gap:18, fontSize:12, color:'var(--ink-3)' }}>
            <button onClick={handlePostLike} className="mtx-tap" style={{
              appearance:'none', cursor:'pointer', border:0, background:'transparent',
              display:'inline-flex', alignItems:'center', gap:5,
              color: postLiked ? '#ff8b8b' : 'var(--ink-3)',
              fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:600,
              fontVariantNumeric:'tabular-nums', padding:'4px 0', position:'relative',
              transition:'color .15s',
            }}>
              <span style={{ position:'relative', display:'inline-flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24"
                     fill={postLiked ? '#ff8b8b' : 'none'}
                     stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                     style={{
                       transform: postLiked ? 'scale(1.08)' : 'scale(1)',
                       transition:'transform .25s cubic-bezier(.34,1.56,.64,1)',
                       filter: postLiked ? 'drop-shadow(0 0 5px rgba(255,139,139,0.7))' : 'none',
                     }}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {postLikeBurst > 0 && (
                  <span key={postLikeBurst} aria-hidden="true" style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
                    {[0, 1, 2, 3].map(i => (
                      <span key={i} style={{
                        position:'absolute', top:'50%', left:'50%',
                        width:3, height:3, borderRadius:'50%',
                        background:'#ff8b8b',
                        boxShadow:'0 0 4px rgba(255,139,139,0.9)',
                        animation:`mtxThreadPostBurst${i} .65s ease-out forwards`,
                        opacity:0,
                      }}/>
                    ))}
                    <style>{`
                      @keyframes mtxThreadPostBurst0 { 0% { transform:translate(-50%,-50%) scale(0.5); opacity:1; } 100% { transform:translate(-50%, -240%) scale(0.4); opacity:0; } }
                      @keyframes mtxThreadPostBurst1 { 0% { transform:translate(-50%,-50%) scale(0.5); opacity:1; } 100% { transform:translate(120%, -200%) scale(0.3); opacity:0; } }
                      @keyframes mtxThreadPostBurst2 { 0% { transform:translate(-50%,-50%) scale(0.5); opacity:1; } 100% { transform:translate(-220%, -200%) scale(0.3); opacity:0; } }
                      @keyframes mtxThreadPostBurst3 { 0% { transform:translate(-50%,-50%) scale(0.4); opacity:1; } 100% { transform:translate(-50%, -180%) scale(0.2); opacity:0; } }
                    `}</style>
                  </span>
                )}
              </span>
              {(review.likes || 0) + (postLiked ? 1 : 0)}
            </button>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:5,
              color:'var(--ink-3)', fontSize:12, fontWeight:600, fontVariantNumeric:'tabular-nums',
            }}>
              <IcMessage size={13} stroke="currentColor" strokeWidth={1.6}/>
              {allComments.length}
            </span>
          </div>
        </div>

        {/* Comments section header */}
        {allComments.length > 0 && (
          <div style={{ padding:'14px 22px 10px', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', fontWeight:700 }}>
              Conversación
            </div>
            <span style={{ fontSize:10, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
              {allComments.length} {allComments.length === 1 ? 'mensaje' : 'mensajes'}
            </span>
          </div>
        )}

        {/* Comments list */}
        <div style={{ padding:'0 18px 16px', display:'flex', flexDirection:'column', gap:14 }}>
          {rootComments.length === 0 ? (
            <div style={{ padding:'30px 20px', textAlign:'center' }}>
              <div style={{
                width:54, height:54, borderRadius:16, margin:'0 auto 12px',
                background:'rgba(255,255,255,0.04)',
                border:'0.5px solid rgba(255,255,255,0.06)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--ink-3)',
              }}>
                <IcMessage size={20} stroke="currentColor" strokeWidth={1.5}/>
              </div>
              <div style={{ fontSize:13.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.005em', marginBottom:5 }}>
                Sé el primero en responder
              </div>
              <div style={{ fontSize:11.5, color:'var(--ink-3)', maxWidth:240, margin:'0 auto', lineHeight:1.5, letterSpacing:'-0.005em' }}>
                ¿Qué piensas? Comparte tu reflexión y empieza la conversación.
              </div>
            </div>
          ) : (
            rootComments.map(c => {
              const author = lookupAuthor(c.authorId);
              const replies = (repliesByParent[c.id] || []).sort((a, b) => a.createdAt - b.createdAt);
              return (
                <div key={c.id} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <ThreadCommentRow
                    comment={c}
                    author={author}
                    isReply={false}
                    onReplyTap={handleReplyTap}
                    onDelete={c.isOwn ? handleDeleteComment : null}
                    onAuthorTap={onAuthorTap}
                  />
                  {replies.map(r => {
                    const replyAuthor = lookupAuthor(r.authorId);
                    return (
                      <ThreadCommentRow
                        key={r.id}
                        comment={r}
                        author={replyAuthor}
                        isReply={true}
                        onReplyTap={handleReplyTap}
                        onDelete={r.isOwn ? handleDeleteComment : null}
                        onAuthorTap={onAuthorTap}
                      />
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sticky input */}
      <ThreadInput
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSubmit={handleSubmitComment}
        accent={accent}
      />
    </div>
  );
}

Object.assign(window, {
  ReviewThreadScreen, ThreadCommentRow, ThreadInput,
  useCommentCount,
});
