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
  let state = { activeItem: null, mode: null };

  const emit = () => window.dispatchEvent(new CustomEvent('mtx:ritual-player-changed', { detail: { ...state } }));

  window.__mtxRitualPlayer = {
    get: () => ({ ...state }),
    // Abre el VideoSheet de detalle (usuario eligió desde la lista del ritual)
    openSheet: (item) => {
      if (!item) return;
      state = { activeItem: item, mode: 'sheet' };
      emit();
    },
    // Salta directo al fullscreen (atajo, ej. tap en activity "ahora playing")
    openPlayer: (item) => {
      if (!item) return;
      state = { activeItem: item, mode: 'player' };
      emit();
    },
    // Promueve el sheet al fullscreen (clic en "Reproducir" dentro del sheet)
    promoteToPlayer: (item) => {
      const it = item || state.activeItem;
      if (!it) return;
      state = { activeItem: it, mode: 'player' };
      emit();
    },
    close: () => {
      state = { activeItem: null, mode: null };
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
    : { activeItem: null, mode: null };
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
  const { activeItem, mode } = useRitualPlayer();
  const toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: () => {} };

  if (!activeItem || !mode) return null;

  const VideoSheet = (typeof window !== 'undefined' && window.VideoSheet) || null;
  const VideoPlayerFullscreen = (typeof window !== 'undefined' && window.VideoPlayerFullscreen) || null;

  const handleClose = () => window.__mtxRitualPlayer?.close();
  const handlePlay  = (it) => window.__mtxRitualPlayer?.promoteToPlayer(it || activeItem);

  // Sheet handlers son no-op informativos en este flow (estamos DENTRO del
  // ritual, no agregando contenido nuevo). Si el user pidiera más adelante
  // habilitarlos, se conectarían igual que en ExploreScreen.
  const handleShare = () => toast.show({ message: 'Compartir · próximamente', duration: 1500 });
  const handleSaveToPlaylist = () => toast.show({ message: 'Guardar a playlist · próximamente', duration: 1500 });
  const handleScheduleForToday = () => toast.show({ message: 'Ya está en tu ritual de hoy', duration: 1700 });

  // Portal a `mtx-overlay-root` — anclado al IOSDevice (no al mtx-bg scrolleable).
  // Mismo patrón que usa ExploreScreen para sus overlays. Si por algún motivo
  // el portal root no existe, fallback inline (no debería pasar en producción).
  const overlayRoot = typeof document !== 'undefined'
    ? document.getElementById('mtx-overlay-root')
    : null;
  const reactDom = typeof window !== 'undefined' ? window.ReactDOM : null;

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
      <VideoPlayerFullscreen
        item={activeItem}
        onClose={handleClose}
        onComplete={() => {
          // Al terminar el contenido, cerramos el player. La marca de
          // "completed" en el ritual es trabajo de una fase posterior
          // (cuando conectemos las activities del ritual al store real).
          handleClose();
        }}
        onOptions={() => toast.show({ message: 'Opciones · próximamente', duration: 1500 })}
        activePlaylist={null}
        activePlaylistItems={[]}
        canPrev={false}
        canNext={false}
      />
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
