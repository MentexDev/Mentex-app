// ritual-player.jsx — Fase B · Wiring activities → reproductor de Explorar
// ─────────────────────────────────────────────────────────────────────────────
// Cuando el usuario tap un activity del ritual (durante una sesión activa),
// queremos abrir el VideoSheet → VideoPlayerFullscreen YA EXISTENTES en
// Explorar — cero código nuevo de player. Pero esos componentes viven dentro
// de ExploreScreen y solo se montan cuando ese tab está activo.
//
// Solución: store global pubsub (mismo patrón que __mtxPlayer / __mtxRitual)
// + un componente <RitualPlayerOverlay/> que vive a nivel del MentexApp,
// siempre montado, escucha el store y renderiza VideoSheet o
// VideoPlayerFullscreen sobre cualquier tab. Así el usuario abre el player
// SIN salir del Home activo.
//
// La activity del Home se mapea a un item de EXPLORE_CONTENT vía:
//   1. activity.exploreId (si la mock activity ya lo trae)
//   2. activity.id (si coincide con un id de Explorar — ej. ritualExtras
//      vienen ya en formato Explorar)
//   3. lookup por título en EXPLORE_CONTENT (fallback)
// Si no hay match, se dispara un toast "Próximamente" — esa activity se
// gestionará en Fase C/D (ActivityRunner para gratitud, respiración, etc.).

(function() {
  if (typeof window === 'undefined' || window.__mtxRitualPlayer) return;

  // mode: 'sheet' (VideoSheet de detalle) | 'player' (VideoPlayerFullscreen)
  // null = nada abierto.
  let state = {
    activeItem: null,
    mode: null,
    queueOpen: false, // PlaylistQueueSheet visible encima del fullscreen
  };

  const emit = () => window.dispatchEvent(new CustomEvent('mtx:ritual-player-changed', { detail: { ...state } }));

  window.__mtxRitualPlayer = {
    get: () => ({ ...state }),
    // Abre el VideoSheet de detalle (usuario eligió desde la lista del ritual)
    openSheet: (item) => {
      if (!item) return;
      state = { ...state, activeItem: item, mode: 'sheet', queueOpen: false };
      emit();
    },
    // Salta directo al fullscreen (atajo, ej. tap en activity "ahora playing")
    openPlayer: (item) => {
      if (!item) return;
      state = { ...state, activeItem: item, mode: 'player', queueOpen: false };
      emit();
    },
    // Promueve el sheet al fullscreen (clic en "Reproducir" dentro del sheet)
    promoteToPlayer: (item) => {
      const it = item || state.activeItem;
      if (!it) return;
      state = { ...state, activeItem: it, mode: 'player' };
      emit();
    },
    // Queue sheet (Tu cola personal) controls
    openQueue:  () => { state = { ...state, queueOpen: true  }; emit(); },
    closeQueue: () => { state = { ...state, queueOpen: false }; emit(); },
    selectItem: (item) => {
      if (!item) return;
      state = { ...state, activeItem: item, mode: 'player', queueOpen: false };
      emit();
    },
    close: () => {
      state = { activeItem: null, mode: null, queueOpen: false };
      emit();
    },
  };
})();

function useRitualPlayer() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const handler = () => force();
    window.addEventListener('mtx:ritual-player-changed', handler);
    return () => window.removeEventListener('mtx:ritual-player-changed', handler);
  }, []);
  return window.__mtxRitualPlayer
    ? window.__mtxRitualPlayer.get()
    : { activeItem: null, mode: null, queueOpen: false };
}

// ── _buildRitualPlaylist ──────────────────────────────────────────────────────
// Construye una "playlist sintética" desde ACTIVITIES + ritualExtras del Home
// activo. Esta playlist alimenta el queue (Tu cola personal) del
// VideoPlayerFullscreen cuando el reproductor se abrió desde el ritual.
//
// Regla de inclusión: solo activities que resuelven a un item de Explorar
// (las de tipo journaling/gratitud/respiración sin contenido se omiten —
// no son reproducibles en el player).
//
// Marcamos isWatchLater:true para que el queue se etiquete como "Tu cola
// personal" (string que VideoPlayerFullscreen y PlaylistQueueSheet usan
// con ese flag).
function _buildRitualPlaylist() {
  if (typeof window === 'undefined') return null;
  const activities = Array.isArray(window.ACTIVITIES) ? window.ACTIVITIES : [];
  const ritualExtras = (typeof window.useRitualItems === 'function')
    ? [] // En el overlay no podemos llamar al hook fuera de render — los extras se inyectan vía RitualPlayerOverlay
    : [];

  // Resolver TODOS los activities a items de Explorar
  const resolvedItems = [];
  const seenIds = new Set();
  activities.forEach(a => {
    const item = window._resolveActivityToExploreItem
      ? window._resolveActivityToExploreItem(a)
      : null;
    if (item && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      resolvedItems.push(item);
    }
  });

  if (resolvedItems.length === 0) return null;

  return {
    id: 'ritual-today',
    title: 'Tu ritual de hoy',
    author: { name: 'Tu día', isOfficial: false },
    isWatchLater: true,         // → "Tu cola personal" string en el queue sheet
    isPublic: false,
    createdBy: 'user',
    accent: '#3dffd1',
    bg: 'linear-gradient(135deg, #1a3a35, #0f2520)',
    items: resolvedItems.map(it => it.id),
    totalVideos: resolvedItems.length,
  };
}

// ── _resolveActivityToExploreItem ─────────────────────────────────────────────
// Toma una activity (formato del Home: { id, kind, title, ... }) y devuelve
// el item correspondiente de EXPLORE_CONTENT, o null si no hay match.
// Estrategias en orden:
//   1. activity.exploreId definido explícitamente (mapping curado)
//   2. activity.id ya coincide con un id de Explorar (ritualExtras de Explorar)
//   3. Lookup por título exacto (case-insensitive)
//   4. Lookup por título normalizado (sin acentos, lowercase)
function _resolveActivityToExploreItem(activity) {
  if (!activity) return null;
  const EC = (typeof window !== 'undefined' && window.EXPLORE_CONTENT) || [];
  if (!EC.length) return null;

  // 1. exploreId explícito
  if (activity.exploreId) {
    const byExploreId = EC.find(c => c.id === activity.exploreId);
    if (byExploreId) return byExploreId;
  }

  // 2. id directo (ritualExtras vienen con id de Explorar)
  if (activity.id) {
    const byId = EC.find(c => c.id === activity.id);
    if (byId) return byId;
  }

  // 3. Título exacto (normalizado: lowercase + trim)
  if (activity.title) {
    const target = activity.title.trim().toLowerCase();
    const byTitle = EC.find(c => (c.title || '').trim().toLowerCase() === target);
    if (byTitle) return byTitle;
  }

  // 4. Título sin acentos
  if (activity.title) {
    const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const target = norm(activity.title);
    const byNorm = EC.find(c => norm(c.title) === target);
    if (byNorm) return byNorm;
  }

  return null;
}

// ── openActivity ──────────────────────────────────────────────────────────────
// Single entry point para abrir una activity desde el Home activo. Resuelve
// el mapping y abre el VideoSheet, o muestra toast si no hay contenido.
function openRitualActivity(activity) {
  const item = _resolveActivityToExploreItem(activity);
  if (item) {
    window.__mtxRitualPlayer?.openSheet(item);
    return true;
  }
  // No match — toast informativo. Fase C/D habilitará ActivityRunner para
  // gratitud / respiración / journaling / visualización / estudiar / leer.
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('mtx:toast', {
      detail: {
        message: `${activity.title || 'Esta actividad'} · próximamente`,
        duration: 1800,
      },
    }));
  }
  return false;
}

// ── RitualPlayerOverlay ──────────────────────────────────────────────────────
// Componente que vive a nivel del MentexApp (siempre montado). Renderiza
// VideoSheet o VideoPlayerFullscreen según el state del store. Cuando el
// store está vacío, no renderiza nada.
//
// Reusa los componentes globales window.VideoSheet y window.VideoPlayerFullscreen
// que ya están exportados desde explore-flow.jsx — cero código nuevo de player.
function RitualPlayerOverlay() {
  const { activeItem, mode, queueOpen } = useRitualPlayer();
  const toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: () => {} };

  // Playlist sintética del ritual del día — alimenta "Tu cola personal" del
  // VideoPlayerFullscreen. Se recalcula cuando cambia el set de ritualExtras
  // (consumimos useRitualItems aquí porque sí estamos en render).
  const ritualExtras = (typeof window !== 'undefined' && window.useRitualItems)
    ? window.useRitualItems()
    : [];

  const ritualPlaylist = React.useMemo(() => {
    const base = _buildRitualPlaylist();
    if (!base) return null;
    // Si hay ritualExtras (del Explorar agregados al ritual), añadirlos a la
    // playlist como _extraItemIds para que aparezcan al final del queue.
    if (Array.isArray(ritualExtras) && ritualExtras.length > 0) {
      const extraIds = ritualExtras
        .map(e => e.id)
        .filter(id => !base.items.includes(id));
      if (extraIds.length > 0) {
        return { ...base, _extraItemIds: extraIds, totalVideos: base.totalVideos + extraIds.length };
      }
    }
    return base;
  }, [ritualExtras]);

  const ritualPlaylistItems = React.useMemo(() => {
    if (!ritualPlaylist || typeof window === 'undefined' || !window.EXPLORE_CONTENT) return [];
    const baseIds = ritualPlaylist.items || [];
    const extraIds = ritualPlaylist._extraItemIds || [];
    return [...baseIds, ...extraIds]
      .map(id => window.EXPLORE_CONTENT.find(c => c.id === id))
      .filter(Boolean);
  }, [ritualPlaylist]);

  const currentIndex = React.useMemo(() => {
    if (!activeItem) return -1;
    return ritualPlaylistItems.findIndex(i => i.id === activeItem.id);
  }, [ritualPlaylistItems, activeItem?.id]);

  const VideoSheet = (typeof window !== 'undefined' && window.VideoSheet) || null;
  const VideoPlayerFullscreen = (typeof window !== 'undefined' && window.VideoPlayerFullscreen) || null;
  const PlaylistQueueSheet = (typeof window !== 'undefined' && window.PlaylistQueueSheet) || null;

  const handleClose = () => window.__mtxRitualPlayer?.close();
  const handlePlay  = (it) => window.__mtxRitualPlayer?.promoteToPlayer(it || activeItem);
  const handleOpenQueue = () => window.__mtxRitualPlayer?.openQueue();
  const handleCloseQueue = () => window.__mtxRitualPlayer?.closeQueue();
  const handleSelectFromQueue = (idx) => {
    const it = ritualPlaylistItems[idx];
    if (it) window.__mtxRitualPlayer?.selectItem(it);
  };
  const handlePrev = () => {
    if (currentIndex > 0) {
      window.__mtxRitualPlayer?.selectItem(ritualPlaylistItems[currentIndex - 1]);
    }
  };
  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < ritualPlaylistItems.length - 1) {
      window.__mtxRitualPlayer?.selectItem(ritualPlaylistItems[currentIndex + 1]);
    }
  };

  const handleShare = () => toast.show({ message: 'Compartir · próximamente', duration: 1500 });
  const handleSaveToPlaylist = () => toast.show({ message: 'Guardar a playlist · próximamente', duration: 1500 });
  const handleScheduleForToday = () => toast.show({ message: 'Ya está en tu ritual de hoy', duration: 1700 });

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
          onComplete={() => handleClose()}
          onOptions={() => toast.show({ message: 'Opciones · próximamente', duration: 1500 })}
          activePlaylist={ritualPlaylist}
          activePlaylistItems={ritualPlaylistItems}
          onOpenQueue={handleOpenQueue}
          onPrev={handlePrev}
          onNext={handleNext}
          canPrev={currentIndex > 0}
          canNext={currentIndex >= 0 && currentIndex < ritualPlaylistItems.length - 1}
        />
        {/* PlaylistQueueSheet — montado encima del player cuando queueOpen=true.
            Lista todos los items del ritual con el actual marcado. */}
        {queueOpen && PlaylistQueueSheet && ritualPlaylist && (
          <PlaylistQueueSheet
            playlist={ritualPlaylist}
            items={ritualPlaylistItems}
            currentIndex={currentIndex}
            onSelect={handleSelectFromQueue}
            onClose={handleCloseQueue}
            onShareItem={handleShare}
            onRemoveItem={() => toast.show({ message: 'Para quitar items, edita tu ritual desde el Home', duration: 2000 })}
            onAddMore={() => toast.show({ message: 'Agrega más contenido desde Explorar', duration: 1700 })}
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

Object.assign(window, {
  RitualPlayerOverlay,
  useRitualPlayer,
  openRitualActivity,
  _resolveActivityToExploreItem,
});
