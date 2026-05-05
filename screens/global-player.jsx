// global-player.jsx — Sub-fase 0.3 · Player unificado
// ─────────────────────────────────────────────────────────────────────────────
// ÚNICO punto de montaje del VideoSheet + VideoPlayerFullscreen + PlaylistQueueSheet
// en toda la app. Antes vivían tanto en ExploreScreen como en RitualPlayerOverlay
// y eso producía dos instancias paralelas — al cambiar de tab el state se
// rompía (la cola saltaba de "Ritual de hoy" a "Ver más tarde", el listener del
// mini player se confundía, etc.).
//
// Ahora todo el estado del player vive en este store y este overlay. Los
// componentes que producen "intent de reproducir" (ExploreScreen, ritual del
// Home, mini player tap) sólo disparan API del store o eventos.
//
// La cola activa la decide __mtxActiveQueue (sub-fase 0.1/0.2). El player
// global la consume vía useActiveQueue().
//
// Sheets adyacentes (Share, SaveToPlaylist, ScheduleToday, Completion,
// VideoOptions) siguen viviendo en ExploreScreen — se abren reaccionando a
// eventos custom que dispara el player global cuando aplica:
//   mtx:request-share          { item }
//   mtx:request-save            { item }
//   mtx:request-schedule        { item }
//   mtx:request-options         { item, currentTime }
//   mtx:player-completed        { item }
// Cuando el usuario está en Explorar, esos sheets aparecen ahí. Si está en
// otro tab, el evento se ignora silenciosamente (eventualmente podríamos
// mostrar una versión global de esos sheets, pero por ahora no es necesario).

(function() {
  if (typeof window === 'undefined' || window.__mtxGlobalPlayer) return;

  // mode: 'sheet' (VideoSheet de detalle) | 'player' (VideoPlayerFullscreen)
  // queueOpen: PlaylistQueueSheet visible (sólo cuando mode='player')
  let state = { activeItem: null, mode: null, queueOpen: false };

  const emit = () => window.dispatchEvent(new CustomEvent('mtx:global-player-changed', { detail: { ...state } }));

  window.__mtxGlobalPlayer = {
    get: () => ({ ...state }),

    // Abre el VideoSheet de detalle (clic en card de Explorar, ritual, etc.)
    openSheet: (item) => {
      if (!item) return;
      state = { activeItem: item, mode: 'sheet', queueOpen: false };
      emit();
    },
    // Salta directo al fullscreen (atajo: tap en mini player, item "ahora")
    openPlayer: (item) => {
      if (!item) return;
      state = { activeItem: item, mode: 'player', queueOpen: false };
      emit();
    },
    // Promueve el sheet al fullscreen (clic en "Reproducir" dentro del sheet)
    promoteToPlayer: (item) => {
      const it = item || state.activeItem;
      if (!it) return;
      state = { activeItem: it, mode: 'player', queueOpen: false };
      emit();
    },
    // Queue sheet (Tu cola personal) controls
    openQueue:  () => { state = { ...state, queueOpen: true  }; emit(); },
    closeQueue: () => { state = { ...state, queueOpen: false }; emit(); },
    // Cambiar de item desde el queue → vuelve al fullscreen con el nuevo
    selectItem: (item) => {
      if (!item) return;
      state = { ...state, activeItem: item, mode: 'player', queueOpen: false };
      emit();
    },
    // Cierre completo (X del player)
    close: () => {
      state = { activeItem: null, mode: null, queueOpen: false };
      emit();
    },
  };
})();

// Hook reactivo
function useGlobalPlayer() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const handler = () => force();
    window.addEventListener('mtx:global-player-changed', handler);
    return () => window.removeEventListener('mtx:global-player-changed', handler);
  }, []);
  return window.__mtxGlobalPlayer
    ? window.__mtxGlobalPlayer.get()
    : { activeItem: null, mode: null, queueOpen: false };
}

// ── GlobalPlayerOverlay ──────────────────────────────────────────────────────
// Único overlay del player en toda la app. Vive a nivel del MentexApp,
// siempre montado, escucha el store y renderiza VideoSheet,
// VideoPlayerFullscreen y PlaylistQueueSheet via portal a `mtx-overlay-root`.
//
// Listeners:
//   mtx:expand-player       — tap en mini player → openPlayer(item)
//   mtx:explore-open-item   — emitido por Comunidad/Perfil para abrir sheet
//                             de un item de Explorar.
function GlobalPlayerOverlay() {
  const { activeItem, mode, queueOpen } = useGlobalPlayer();
  const aq = (typeof window !== 'undefined' && window.useActiveQueue)
    ? window.useActiveQueue()
    : { activePlaylist: null, activePlaylistItems: [] };
  const toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: () => {} };

  const activePlaylist = aq.activePlaylist;
  const activePlaylistItems = aq.activePlaylistItems || [];

  // Cola efectiva para navegación prev/next. Si el ítem actual no está en la
  // activeQueue (currentIndex=-1), construimos una cola contextual con todos
  // los ítems de EXPLORE_CONTENT del mismo tipo — así las flechas funcionan
  // desde cualquier ítem, no solo los que están en "Ver más tarde".
  const { effectiveItems, effectiveIndex } = React.useMemo(() => {
    if (!activeItem) return { effectiveItems: activePlaylistItems, effectiveIndex: -1 };
    const rawIdx = activePlaylistItems.findIndex(i => i && i.id === activeItem.id);
    if (rawIdx !== -1) return { effectiveItems: activePlaylistItems, effectiveIndex: rawIdx };
    // Item fuera de la queue activa — construir cola contextual por tipo
    const EC = (window.EXPLORE_CONTENT || []).filter(c => c && c.status !== 'coming-soon');
    const sameType = EC.filter(c => c.type === activeItem.type);
    const pool = sameType.length >= 3 ? sameType : EC;
    const ctxIdx = pool.findIndex(c => c.id === activeItem.id);
    return { effectiveItems: pool, effectiveIndex: ctxIdx };
  }, [activePlaylistItems, activeItem?.id, activeItem?.type]);

  const currentIndex = effectiveIndex;

  // Listener: expandir desde mini player
  React.useEffect(() => {
    const handler = (e) => {
      const item = e.detail && e.detail.item;
      if (!item) return;
      // Hidratamos desde EXPLORE_CONTENT por seguridad si tenemos id
      const EC = window.EXPLORE_CONTENT || [];
      const it = item.id ? (EC.find(c => c.id === item.id) || item) : item;
      window.__mtxGlobalPlayer?.openPlayer(it);
    };
    window.addEventListener('mtx:expand-player', handler);
    return () => window.removeEventListener('mtx:expand-player', handler);
  }, []);

  // Listener: abrir sheet de un item por id (desde Comunidad/Perfil)
  React.useEffect(() => {
    const handler = (e) => {
      const itemId = e.detail && e.detail.itemId;
      if (!itemId) return;
      const EC = window.EXPLORE_CONTENT || [];
      const it = EC.find(c => c.id === itemId);
      if (!it) return;
      // Si es coming-soon, ExploreScreen maneja eso aparte. El global player
      // sólo reacciona a items reproducibles.
      if (it.status === 'coming-soon') return;
      window.__mtxGlobalPlayer?.openSheet(it);
    };
    window.addEventListener('mtx:explore-open-item', handler);
    return () => window.removeEventListener('mtx:explore-open-item', handler);
  }, []);

  const VideoSheet = (typeof window !== 'undefined' && window.VideoSheet) || null;
  const VideoPlayerFullscreen = (typeof window !== 'undefined' && window.VideoPlayerFullscreen) || null;
  const PlaylistQueueSheet = (typeof window !== 'undefined' && window.PlaylistQueueSheet) || null;

  const handleClose = () => window.__mtxGlobalPlayer?.close();
  const handlePlay  = (it) => window.__mtxGlobalPlayer?.promoteToPlayer(it || activeItem);
  const handleOpenQueue = () => window.__mtxGlobalPlayer?.openQueue();
  const handleCloseQueue = () => window.__mtxGlobalPlayer?.closeQueue();
  const handleSelectFromQueue = (idx) => {
    const it = activePlaylistItems[idx];
    if (it) window.__mtxGlobalPlayer?.selectItem(it);
  };
  const handlePrev = () => {
    if (currentIndex > 0) {
      window.__mtxGlobalPlayer?.selectItem(effectiveItems[currentIndex - 1]);
    }
  };
  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < effectiveItems.length - 1) {
      window.__mtxGlobalPlayer?.selectItem(effectiveItems[currentIndex + 1]);
    }
  };

  // Sheets adyacentes (Share, Save, Schedule, Options, Completion) — el player
  // global emite eventos request y los listeners viven en ExploreScreen, que
  // los abre como sheets locales del tab Explorar. Si el usuario está en otro
  // tab, el evento se silencia (ExploreScreen no está montado).
  const dispatchRequest = (kind, payload) => {
    window.dispatchEvent(new CustomEvent(`mtx:request-${kind}`, { detail: payload }));
  };
  const handleShare = (it) => dispatchRequest('share', { item: it || activeItem });
  const handleSaveToPlaylist = (it) => dispatchRequest('save', { item: it || activeItem });
  const handleScheduleForToday = (it) => dispatchRequest('schedule', { item: it || activeItem });
  const handleOptions = (currentTime) => dispatchRequest('options', { item: activeItem, currentTime });
  const handleComplete = (it) => {
    dispatchRequest('completed', { item: it || activeItem });
    handleClose();
  };

  const overlayRoot = typeof document !== 'undefined'
    ? document.getElementById('mtx-overlay-root')
    : null;
  const reactDom = typeof window !== 'undefined' ? window.ReactDOM : null;

  if (!activeItem || !mode) return null;

  let content = null;
  if (mode === 'sheet' && VideoSheet) {
    content = (
      <VideoSheet
        item={activeItem}
        onClose={handleClose}
        onPlay={handlePlay}
        onShare={handleShare}
        onSaveToPlaylist={handleSaveToPlaylist}
        onScheduleForToday={handleScheduleForToday}
      />
    );
  } else if (mode === 'player' && VideoPlayerFullscreen) {
    content = (
      <>
        <VideoPlayerFullscreen
          item={activeItem}
          onClose={handleClose}
          onComplete={handleComplete}
          onOptions={handleOptions}
          activePlaylist={activePlaylist}
          activePlaylistItems={activePlaylistItems}
          onOpenQueue={handleOpenQueue}
          onPrev={handlePrev}
          onNext={handleNext}
          canPrev={currentIndex > 0}
          canNext={currentIndex >= 0 && currentIndex < effectiveItems.length - 1}
        />
        {queueOpen && PlaylistQueueSheet && activePlaylist && (
          <PlaylistQueueSheet
            playlist={activePlaylist}
            items={activePlaylistItems}
            currentIndex={Math.max(0, currentIndex)}
            onSelect={handleSelectFromQueue}
            onClose={handleCloseQueue}
            onShareItem={handleShare}
            onRemoveItem={() => toast.show({ message: 'Para editar tu cola, usa el switcher o tu biblioteca', duration: 1900 })}
            onAddMore={() => dispatchRequest('add-to-playlist', { playlist: activePlaylist })}
          />
        )}
      </>
    );
  }

  if (!content) return null;
  return (overlayRoot && reactDom && reactDom.createPortal)
    ? reactDom.createPortal(content, overlayRoot)
    : content;
}

// ── VideoOptionsOverlay ──────────────────────────────────────────────────────
// Antes: el listener de `mtx:request-options` y el VideoOptionsSheet vivían
// dentro de ExploreScreen. Cuando el usuario abría el VideoPlayerFullscreen
// desde un item del ritual del día (estando en el tab Home), ExploreScreen
// no estaba montado → el evento se ignoraba → los 3 puntos no respondían.
// Bug fix: este overlay se monta a nivel del MentexApp (siempre presente),
// captura el evento global y muestra el sheet sin importar el tab activo.
// Las acciones del sheet (Compartir, Guardar, Agendar) siguen disparando
// `mtx:request-share` / `save` / `schedule` que ExploreScreen escucha; si
// user está en otro tab, esos sheets secundarios aún no aparecen, pero el
// menú primario al menos se abre.
function VideoOptionsOverlay() {
  const [ctx, setCtx] = React.useState(null);
  const toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: () => {} };

  React.useEffect(() => {
    const handler = (e) => {
      if (!e.detail?.item) return;
      setCtx({ item: e.detail.item, currentTime: e.detail.currentTime, fromPlayer: true });
    };
    window.addEventListener('mtx:request-options', handler);
    return () => window.removeEventListener('mtx:request-options', handler);
  }, []);

  const VideoOptionsSheet = (typeof window !== 'undefined' && window.VideoOptionsSheet) || null;
  const _formatTime = (typeof window !== 'undefined' && window._formatTime) || ((s) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`);

  if (!ctx || !VideoOptionsSheet) return null;

  const close = () => setCtx(null);
  const dispatchAction = (kind, payload) => {
    close();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(`mtx:request-${kind}`, { detail: payload }));
    }, 220);
  };

  const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
  const reactDom = typeof window !== 'undefined' ? window.ReactDOM : null;

  const content = (
    <VideoOptionsSheet
      item={ctx.item}
      playlist={ctx.playlist}
      currentTime={ctx.currentTime}
      skipSeconds={typeof window !== 'undefined' ? (window.__mtxSkipSec || 15) : 15}
      onClose={close}
      onSchedule={(it) => dispatchAction('schedule', { item: it })}
      onSaveToPlaylist={(it) => dispatchAction('save', { item: it })}
      onShare={(it) => dispatchAction('share', { item: it })}
      onShareMoment={(it, t) => {
        close();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('mtx:request-share', { detail: { item: { ...it, _shareMomentSec: t } } }));
          toast.show({ message: `Compartiendo desde ${_formatTime(t)}`, duration: 1700 });
        }, 220);
      }}
      onConfigureSkip={ctx.fromPlayer ? () => {
        close();
        setTimeout(() => window.dispatchEvent(new CustomEvent('mtx:open-skip-config')), 220);
      } : null}
      onOpenBookmarks={ctx.fromPlayer ? () => {
        close();
        setTimeout(() => window.dispatchEvent(new CustomEvent('mtx:open-bookmarks')), 220);
      } : null}
      onRemoveFromPlaylist={() => close()}
    />
  );

  return (overlayRoot && reactDom && reactDom.createPortal)
    ? reactDom.createPortal(content, overlayRoot)
    : content;
}

Object.assign(window, {
  GlobalPlayerOverlay,
  VideoOptionsOverlay,
  useGlobalPlayer,
});
