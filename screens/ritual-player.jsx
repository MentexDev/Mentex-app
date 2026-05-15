// ritual-player.jsx — Fase B · Wiring activities → reproductor + Sub-fase 0.3
// ─────────────────────────────────────────────────────────────────────────────
// HISTORIA:
//   Fase B introdujo el flujo "tap en activity del ritual abre VideoSheet →
//   VideoPlayerFullscreen". Para evitar duplicar código de player, este archivo
//   originalmente creó su propio store __mtxRitualPlayer con su propio overlay.
//
//   Sub-fase 0.3 unifica: ahora hay UN solo player global (window.__mtxGlobalPlayer
//   + GlobalPlayerOverlay en screens/global-player.jsx). Este archivo se
//   convierte en un módulo delgado de helpers: resuelve activities a items de
//   Explorar y abre el player global. Los componentes que aún consumen
//   __mtxRitualPlayer reciben un alias retro-compatible que delega al global.
//
// EXPORTS:
//   _buildRitualPlaylist()                    → playlist sintética del día
//   _resolveActivityToExploreItem(activity)   → item de Explorar o null
//   openRitualActivity(activity)              → entry point único: abre player
//                                               o muestra toast si no hay match.
//   __mtxRitualPlayer                         → alias retro-compat al global
//                                               player. Las llamadas a openSheet/
//                                               openPlayer/etc. pasan al global.

// ── Alias retro-compatible ──────────────────────────────────────────────────
// Mantener por si código viejo aún llama window.__mtxRitualPlayer.* directo.
// Todas las llamadas redirigen al global player. Hook useRitualPlayer también.
(function() {
  if (typeof window === 'undefined') return;
  if (window.__mtxRitualPlayer && window.__mtxRitualPlayer.__isAlias) return;

  const GP = () => window.__mtxGlobalPlayer;
  window.__mtxRitualPlayer = {
    __isAlias: true,
    get:           ()       => GP() ? GP().get() : { activeItem: null, mode: null, queueOpen: false },
    openSheet:     (item)   => GP()?.openSheet(item),
    openPlayer:    (item)   => GP()?.openPlayer(item),
    promoteToPlayer: (item) => GP()?.promoteToPlayer(item),
    openQueue:     ()       => GP()?.openQueue(),
    closeQueue:    ()       => GP()?.closeQueue(),
    selectItem:    (item)   => GP()?.selectItem(item),
    close:         ()       => GP()?.close(),
  };
})();

// Hook retro-compatible — en código nuevo preferir useGlobalPlayer().
function useRitualPlayer() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const handler = () => force();
    window.addEventListener('mtx:global-player-changed', handler);
    return () => window.removeEventListener('mtx:global-player-changed', handler);
  }, []);
  return window.__mtxRitualPlayer
    ? window.__mtxRitualPlayer.get()
    : { activeItem: null, mode: null, queueOpen: false };
}

// ── _buildRitualPlaylist ──────────────────────────────────────────────────────
// Construye la playlist sintética desde ACTIVITIES + helper resolver.
// Consumida por el MentexApp para empujarla a __mtxActiveQueue cuando hay
// sesión activa.
function _buildRitualPlaylist() {
  if (typeof window === 'undefined') return null;
  const activities = Array.isArray(window.ACTIVITIES) ? window.ACTIVITIES : [];

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
    isWatchLater: true,         // → "Tu cola personal" en el queue sheet
    isPublic: false,
    createdBy: 'user',
    accent: '#3dffd1',
    bg: 'linear-gradient(135deg, #1a3a35, #0f2520)',
    items: resolvedItems.map(it => it.id),
    totalVideos: resolvedItems.length,
  };
}

// ── _resolveActivityToExploreItem ─────────────────────────────────────────────
// Toma una activity (formato del Home: { id, kind, title, exploreId? }) y
// devuelve el item correspondiente de EXPLORE_CONTENT, o null si no hay match.
function _resolveActivityToExploreItem(activity) {
  if (!activity) return null;
  const EC = (typeof window !== 'undefined' && window.EXPLORE_CONTENT) || [];
  if (!EC.length) return null;

  if (activity.exploreId) {
    const byExploreId = EC.find(c => c.id === activity.exploreId);
    if (byExploreId) return byExploreId;
  }
  if (activity.id) {
    const byId = EC.find(c => c.id === activity.id);
    if (byId) return byId;
  }
  if (activity.title) {
    const target = activity.title.trim().toLowerCase();
    const byTitle = EC.find(c => (c.title || '').trim().toLowerCase() === target);
    if (byTitle) return byTitle;
  }
  if (activity.title) {
    const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const target = norm(activity.title);
    const byNorm = EC.find(c => norm(c.title) === target);
    if (byNorm) return byNorm;
  }
  return null;
}

// ── openRitualActivity ────────────────────────────────────────────────────────
// Single entry point para abrir una activity desde el Home activo. Decide
// qué experiencia montar según el tipo:
//   1. runnerType === 'timer'        → ActivityRunner fullscreen (Fase C).
//   2. fromExplore + exploreId       → ContentDetailScreen nuevo (Explorar).
//   3. Activity base resuelve a item → VideoSheet (player global) [legacy].
//   4. Sin match                      → toast "próximamente" (Fase D pendiente).
function openRitualActivity(activity) {
  if (!activity) return false;

  // 1. runnerType:'timer' → ActivityRunner (PRIORIDAD máxima).
  // Las activities con metricType propio (count/pages/binary/distance) y
  // las defaults de Mente/Cuerpo necesitan el runner full-screen aunque
  // tengan exploreId (que apunta a contenido recomendado del Explorar).
  // El companion del runner ya muestra la playlist de sugerencias del
  // Explorar — duplicar abriendo el player rompería el flow.
  if (activity.runnerType === 'timer' && window.__mtxActivityRunner) {
    window.__mtxActivityRunner.open(activity);
    return true;
  }

  // 2. Items agregados via __mtxRitual.add() desde HomeInactive
  //    (audiolibros/charlas/meditaciones agendadas desde la sección
  //    "Aprende hoy") → abren el ContentDetailScreen nuevo de Explorar,
  //    NO el VideoSheet legacy. El detail screen ya tiene CTA "Reproducir"
  //    + botón "Agendado" (toggle desagendar). Patrón idéntico al usado
  //    por Comunidad/Perfil: dispatch al shell, el shell cambia tab a
  //    'explore' y forwarda a explore-flow.jsx para abrir el detail.
  const exploreId = activity.exploreId || activity.id;
  if (activity.fromExplore && exploreId) {
    window.dispatchEvent(new CustomEvent('mtx:open-item-from-community', {
      detail: { itemId: exploreId },
    }));
    return true;
  }

  // 3. Activity base del ritual con match en EXPLORE_CONTENT → player
  //    global (VideoSheet legacy). Mantenido por compat para activities
  //    no-fromExplore que aún dependen de este flow.
  const item = _resolveActivityToExploreItem(activity);
  if (item) {
    window.__mtxGlobalPlayer?.openSheet(item);
    return true;
  }

  // 4. Default → toast informativo
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

Object.assign(window, {
  // Helpers usados por home-active.jsx, MentexApp y global-player.jsx
  _buildRitualPlaylist,
  _resolveActivityToExploreItem,
  openRitualActivity,
  useRitualPlayer,
});
