// active-queue.jsx — Sub-fase 0.1 · Store global de "Tu cola personal"
// ─────────────────────────────────────────────────────────────────────────────
// Única fuente de verdad sobre cuál es la playlist activa que muestra el
// PlaylistQueueBar/Sheet del VideoPlayerFullscreen. Antes había dos sistemas
// independientes (Explorar usaba watch-later por default, RitualPlayerOverlay
// construía el ritual del día) y el cambio de tab podía cambiar la cola
// inesperadamente. Ahora ambos consumen este store y la jerarquía es
// predecible.
//
// JERARQUÍA DE PRIORIDAD (de mayor a menor):
//   1. override        — usuario eligió manualmente desde el switcher.
//   2. ritualPlaylist  — sesión activa con activities reproducibles.
//   3. exploreContext  — está reproduciendo desde una playlist concreta de
//                        Explorar (PlaylistOverview → "Reproducir todo").
//   4. watch-later     — default ("Ver más tarde").
//   5. null            — nada disponible (cola vacía).
//
// API:
//   __mtxActiveQueue.get()                       → snapshot { activePlaylist, activePlaylistItems }
//   __mtxActiveQueue.setRitualPlaylist(p)        → HomeActive lo llama en mount/unmount
//   __mtxActiveQueue.setExploreContext(p)        → ExploreScreen cuando reproduce desde playlist
//   __mtxActiveQueue.setOverride(p)              → user manual (PlaylistSwitcherSheet)
//   __mtxActiveQueue.clearOverride()             → vuelve al default
//   __mtxActiveQueue._debugInputs()              → para tests/diagnóstico
//
// Eventos:
//   'mtx:active-queue-changed' — emitido en cada recompute con detail = snapshot.

(function() {
  if (typeof window === 'undefined' || window.__mtxActiveQueue) return;

  // Inputs — empujados por los componentes que tienen contexto. El store no
  // los inspecciona, sólo los integra al recomputar.
  let inputs = {
    ritualPlaylist: null,    // playlist sintética del ritual (HomeActive)
    exploreContext: null,    // playlist activa de Explorar
    override: null,          // playlist elegida manualmente por user
  };

  // Snapshot cacheado del último compute — devuelto por get() sin recalcular.
  // switcherOpen es UI state: cuando true, el ActiveQueueSwitcherOverlay
  // monta PlaylistSwitcherSheet para que el usuario elija otra playlist.
  let snapshot = { activePlaylist: null, activePlaylistItems: [], switcherOpen: false };

  // Aplica jerarquía y devuelve la playlist activa (o null).
  function compute() {
    if (inputs.override)        return inputs.override;
    if (inputs.ritualPlaylist)  return inputs.ritualPlaylist;
    if (inputs.exploreContext)  return inputs.exploreContext;
    // Default: watch-later
    const EP = window.EXPLORE_PLAYLISTS || [];
    const wl = EP.find(p => p && p.isWatchLater);
    return wl || null;
  }

  // Resuelve el array de items a partir del playlist usando el resolver de
  // explore-flow.jsx si está disponible (maneja _extraItemIds y
  // _removedItemIds correctamente). Fallback: items array directo.
  function resolveItems(playlist) {
    if (!playlist) return [];
    if (typeof window._resolvePlaylistItems === 'function') {
      return window._resolvePlaylistItems(playlist);
    }
    if (Array.isArray(playlist.items)) {
      const EC = window.EXPLORE_CONTENT || [];
      return playlist.items.map(id => EC.find(c => c.id === id)).filter(Boolean);
    }
    return [];
  }

  function recompute() {
    const playlist = compute();
    const items = resolveItems(playlist);
    // Preserva switcherOpen entre recomputes — es UI state, no derivado de inputs.
    snapshot = { activePlaylist: playlist, activePlaylistItems: items, switcherOpen: snapshot.switcherOpen };
    window.dispatchEvent(new CustomEvent('mtx:active-queue-changed', { detail: { ...snapshot } }));
  }

  function emitSwitcher(open) {
    snapshot = { ...snapshot, switcherOpen: !!open };
    window.dispatchEvent(new CustomEvent('mtx:active-queue-changed', { detail: { ...snapshot } }));
  }

  window.__mtxActiveQueue = {
    get: () => ({
      activePlaylist: snapshot.activePlaylist,
      activePlaylistItems: snapshot.activePlaylistItems,
      switcherOpen: snapshot.switcherOpen,
    }),

    setRitualPlaylist: (playlist) => {
      inputs.ritualPlaylist = playlist || null;
      recompute();
    },
    setExploreContext: (playlist) => {
      inputs.exploreContext = playlist || null;
      recompute();
    },
    setOverride: (playlist) => {
      inputs.override = playlist || null;
      recompute();
    },
    clearOverride: () => {
      inputs.override = null;
      recompute();
    },

    // Switcher UI controls (sub-fase 0.2)
    openSwitcher:  () => emitSwitcher(true),
    closeSwitcher: () => emitSwitcher(false),

    _debugInputs: () => ({ ...inputs }),
  };

  // Initial compute con los inputs vacíos → cae al default (watch-later si
  // existe). Se redispara cuando cualquier input cambia.
  recompute();

  // Si EXPLORE_PLAYLISTS aún no está cargada cuando este script corre,
  // re-recomputar después del primer tick para hidratar el watch-later default.
  setTimeout(() => recompute(), 0);
})();

// Hook reactivo — fuerza re-render cuando el snapshot cambia.
function useActiveQueue() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const handler = () => force();
    window.addEventListener('mtx:active-queue-changed', handler);
    return () => window.removeEventListener('mtx:active-queue-changed', handler);
  }, []);
  return window.__mtxActiveQueue
    ? window.__mtxActiveQueue.get()
    : { activePlaylist: null, activePlaylistItems: [] };
}

Object.assign(window, { useActiveQueue });
