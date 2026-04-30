// now-playing-bar.jsx — Mini player persistente estilo YouTube Music / Spotify
// Aparece encima del tab bar cuando hay contenido reproduciéndose. Tap → expande
// al VideoPlayerFullscreen de Explorar. X → cierra y limpia el store.

// ── Store global del player ─────────────────────────────────────────────────
// Patrón pubsub: cualquier punto de la app puede llamar __mtxPlayer.play(item) y
// el mini player aparece en cualquier tab. Mismo patrón que __mtxFollows /
// __mtxReviews / __mtxComments.
const _PLAYER_EVENT = 'mtx:player-changed';
if (typeof window !== 'undefined' && !window.__mtxPlayer) {
  let _state = {
    currentItem: null,    // { id, title, author, cover, accent, type, dur }
    isPlaying: false,
    progress: 0,          // 0-1
    durationSec: 0,
    fullscreenOpen: false, // true cuando VideoPlayerFullscreen está montado
  };
  const _emit = () => window.dispatchEvent(new CustomEvent(_PLAYER_EVENT, { detail: { ..._state } }));
  window.__mtxPlayer = {
    get: () => ({ ..._state }),
    // Inicia reproducción de un nuevo item (resetea progress)
    play: (item) => {
      if (!item) return;
      _state = { ..._state, currentItem: item, isPlaying: true, progress: 0 };
      _emit();
    },
    // Ya tenemos un item — solo cambiar isPlaying
    pause:  () => { _state = { ..._state, isPlaying: false }; _emit(); },
    resume: () => { _state = { ..._state, isPlaying: true  }; _emit(); },
    // Sync de progress / duration desde el VideoPlayerFullscreen
    setProgress: (p) => {
      const clamped = Math.max(0, Math.min(1, Number(p) || 0));
      _state = { ..._state, progress: clamped };
      _emit();
    },
    setDuration: (sec) => {
      _state = { ..._state, durationSec: Math.max(0, Number(sec) || 0) };
    },
    // Toggle del flag de fullscreen — el mini se oculta cuando es true
    setFullscreenOpen: (open) => {
      _state = { ..._state, fullscreenOpen: !!open };
      _emit();
    },
    // Cierra el mini player y limpia el item activo
    stop: () => {
      _state = { currentItem: null, isPlaying: false, progress: 0, durationSec: 0, fullscreenOpen: false };
      _emit();
    },
  };
}

// ── Hook reactivo al store ──────────────────────────────────────────────────
function useNowPlaying() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const handler = () => force();
    window.addEventListener(_PLAYER_EVENT, handler);
    return () => window.removeEventListener(_PLAYER_EVENT, handler);
  }, []);
  return window.__mtxPlayer
    ? window.__mtxPlayer.get()
    : { currentItem: null, isPlaying: false, progress: 0, durationSec: 0, fullscreenOpen: false };
}

// ── MtxNowPlayingBar — el mini player ───────────────────────────────────────
// `tabBarHeight` se le pasa desde el host (Mentex Home.html sabe la altura del
// tab bar). `hidden` permite ocultarlo cuando el VideoPlayerFullscreen está
// activo (sería redundante).
function MtxNowPlayingBar({ tabBarHeight = 78, hidden = false }) {
  const { currentItem, isPlaying, progress, fullscreenOpen } = useNowPlaying();

  // Ocultar si el host pasa hidden=true o si el VideoPlayerFullscreen está montado
  // (sería redundante mostrar mini + fullscreen del mismo item)
  if (!currentItem || hidden || fullscreenOpen) return null;

  const accent = currentItem.accent || '#3dffd1';
  const itemTitle = currentItem.title || 'Sin título';
  const subtitleParts = [
    currentItem.author,
    (window.CONTENT_TYPES || []).find(t => t.id === currentItem.type)?.label,
  ].filter(Boolean);
  const subtitle = subtitleParts.join(' · ');

  const handleTogglePlay = (e) => {
    e.stopPropagation();
    if (isPlaying) window.__mtxPlayer.pause();
    else window.__mtxPlayer.resume();
  };

  const handleClose = (e) => {
    e.stopPropagation();
    window.__mtxPlayer.stop();
  };

  const handleExpand = () => {
    // El host (Mentex Home.html) escucha este evento y abre el
    // VideoPlayerFullscreen con el item del store.
    window.dispatchEvent(new CustomEvent('mtx:expand-player', { detail: { item: currentItem } }));
  };

  return (
    <div
      onClick={handleExpand}
      role="button"
      tabIndex={0}
      aria-label={`Reproduciendo ${itemTitle}. Toca para expandir`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleExpand(); } }}
      style={{
        position:'absolute',
        bottom: tabBarHeight,
        left: 0, right: 0,
        zIndex: 55,
        cursor:'pointer',
        animation:'mtxNowPlayingSlideUp .35s cubic-bezier(.2,.9,.3,1.2) both',
        fontFamily:'var(--ff-sans)',
      }}
    >
      <style>{`
        @keyframes mtxNowPlayingSlideUp { from { transform: translateY(100%); opacity: 0.6; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* Bar contenido */}
      <div style={{
        position:'relative',
        background:'linear-gradient(180deg, rgba(20,24,22,0.88) 0%, rgba(15,19,18,0.96) 100%)',
        backdropFilter:'blur(28px) saturate(160%)',
        WebkitBackdropFilter:'blur(28px) saturate(160%)',
        borderTop:`0.5px solid ${accent}33`,
        boxShadow:`0 -10px 32px -12px rgba(0,0,0,0.6), 0 -1px 0 ${accent}1a inset`,
        padding:'9px 12px 10px',
        display:'flex', alignItems:'center', gap:11,
      }}>
        {/* Halo accent en el top edge — muy sutil */}
        <div style={{
          position:'absolute', top:0, left:'10%', right:'10%', height:60,
          background:`radial-gradient(60% 100% at 50% 0%, ${accent}1a 0%, transparent 70%)`,
          pointerEvents:'none',
        }}/>

        {/* Progress bar — superpuesta al borde superior, fina con glow del accent */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:1.5,
          background:'rgba(255,255,255,0.05)',
          zIndex:2,
        }}>
          <div style={{
            width:`${Math.max(0, Math.min(1, progress)) * 100}%`, height:'100%',
            background: accent,
            boxShadow:`0 0 8px ${accent}cc, 0 0 14px ${accent}55`,
            transition:'width .3s linear',
          }}/>
        </div>

        {/* Cover — gradient + image, mismo lenguaje que VideoSheet */}
        <div style={{
          width:42, height:42, borderRadius:11, flexShrink:0,
          position:'relative', overflow:'hidden', zIndex:1,
          background: currentItem.bg || `linear-gradient(135deg, ${accent}33, ${accent}10)`,
          border:`0.5px solid ${accent}40`,
          boxShadow:`0 0 12px ${accent}28, inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}>
          {currentItem.cover && (
            <img src={currentItem.cover} alt="" loading="lazy" style={{
              position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'cover',
            }}/>
          )}
          {/* Pulse sutil cuando está playing */}
          {isPlaying && (
            <div style={{
              position:'absolute', inset:0, borderRadius:11,
              boxShadow:`inset 0 0 0 1px ${accent}55`,
              animation:'mtxCoverPulse 2.4s ease-in-out infinite',
              pointerEvents:'none',
            }}/>
          )}
          <style>{`
            @keyframes mtxCoverPulse { 0%,100% { opacity:0.3; } 50% { opacity:0.9; } }
          `}</style>
        </div>

        {/* Info — title + subtitle */}
        <div style={{ flex:1, minWidth:0, position:'relative', zIndex:1 }}>
          <div style={{
            fontSize:13.5, fontWeight:700, color:'var(--ink-1)',
            letterSpacing:'-0.008em', lineHeight:1.2,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
            {itemTitle}
          </div>
          {subtitle && (
            <div style={{
              fontSize:11, color:'var(--ink-3)', letterSpacing:'-0.005em',
              marginTop:1.5,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* Play/Pause con accent glow */}
        <button
          onClick={handleTogglePlay}
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          className="mtx-tap"
          style={{
            appearance:'none', cursor:'pointer', flexShrink:0,
            width:38, height:38, borderRadius:'50%',
            border:`0.5px solid ${accent}55`,
            background:`linear-gradient(180deg, ${accent}26 0%, ${accent}0a 100%)`,
            color: accent,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:`0 0 12px ${accent}44, inset 0 1px 0 rgba(255,255,255,0.16)`,
            transition:'background .18s, box-shadow .25s',
            position:'relative', zIndex:1,
          }}
        >
          {isPlaying
            ? <IcPause size={15} stroke="currentColor" strokeWidth={1.8}/>
            : <IcPlay   size={14} stroke="currentColor"/>
          }
        </button>

        {/* Close (X) */}
        <button
          onClick={handleClose}
          aria-label="Cerrar reproductor"
          className="mtx-tap"
          style={{
            appearance:'none', cursor:'pointer', flexShrink:0,
            width:30, height:30, borderRadius:'50%',
            border:'0.5px solid rgba(255,255,255,0.08)',
            background:'rgba(255,255,255,0.04)',
            color:'var(--ink-3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'background .18s, color .18s',
            position:'relative', zIndex:1,
          }}
        >
          <IcClose size={13} stroke="currentColor" strokeWidth={2}/>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { MtxNowPlayingBar, useNowPlaying });
