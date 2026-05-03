// explore-flow.jsx — Sección Explorar (Fase 0: cimientos)

// ── Ritual store (compartido entre Home y Explorar) ──────────────────────────
// El Home lee de aquí + ACTIVITIES base. Explorar escribe vía "Agendar para hoy".
const _RITUAL_EVENT = 'mtx:ritual-changed';
if (typeof window !== 'undefined' && !window.__mtxRitual) {
  let _items = [];
  window.__mtxRitual = {
    list: () => _items.slice(),
    has: (id) => _items.some(x => x.id === id),
    add: (entry) => {
      if (_items.some(x => x.id === entry.id)) return false;
      _items = [..._items, { ...entry, addedAt: Date.now() }];
      window.dispatchEvent(new CustomEvent(_RITUAL_EVENT));
      return true;
    },
    remove: (id) => {
      const next = _items.filter(x => x.id !== id);
      if (next.length === _items.length) return false;
      _items = next;
      window.dispatchEvent(new CustomEvent(_RITUAL_EVENT));
      return true;
    },
  };
}

// ── __mtxNav — store global de "estoy en una vista interna" por sección ──────
// Cada tab puede setear si su flow está actualmente en una página interna
// (no la página raíz de la sección). Cuando setInternal('explore', true)
// el shell oculta la tab bar — el user ya navegó y tiene su propio back
// button, así que el menú inferior estorbaría.
//
// Convención: section es el nombre del tab ('home', 'explore', 'community',
// 'profile'). isInternal = true cuando la vista activa NO es la raíz.
//
// IIFE pattern (idéntico a __mtxAutoRoutines): block-scoped `const` con
// arrow functions causaba TDZ-like behavior en Babel-standalone (las
// closures veían `_state.internal` como undefined fuera de snapshot()).
// Wrapping en IIFE function-scoped resuelve.
//
// Helper utilitario: scrollMtxBgToTop() resetea el scroll del frame-iPhone
// a top. Usado al cambiar de vista interna o al transicionar entre estados
// del home (Inactive → Active) para que SIEMPRE se vea el header al entrar
// a un screen nuevo, no quede a mitad de scroll.
(function() {
  if (typeof window === 'undefined' || window.__mtxNav) return;
  var _internal = {};
  function _emit() {
    var copy = {};
    for (var k in _internal) copy[k] = _internal[k];
    window.dispatchEvent(new CustomEvent('mtx:nav-internal-changed', { detail: { internal: copy } }));
  }
  window.__mtxNav = {
    setInternal: function(section, isInternal) {
      var prev = !!_internal[section];
      var next = !!isInternal;
      if (prev === next) return;
      _internal[section] = next;
      _emit();
    },
    getInternal: function(section) { return !!_internal[section]; },
    snapshot: function() {
      var copy = {};
      for (var k in _internal) copy[k] = _internal[k];
      return copy;
    },
  };
})();

if (typeof window !== 'undefined' && !window.scrollMtxBgToTop) {
  // Walk: cada screen renderiza dentro de .mtx-bg, que vive dentro de un
  // contenedor con overflow:auto (el viewport del iPhone frame). Reseteamos
  // tanto el scrollTop del scroll-parent como el del .mtx-bg propio por si
  // futuros cambios mueven la propiedad de overflow.
  window.scrollMtxBgToTop = () => {
    const bg = document.querySelector('.mtx-bg');
    if (!bg) return;
    let p = bg.parentElement;
    while (p) {
      const cs = getComputedStyle(p);
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
        p.scrollTop = 0;
        break;
      }
      p = p.parentElement;
    }
    if (bg.scrollTop) bg.scrollTop = 0;
  };
}

// Hook compartido para suscribirse a cambios del Ritual (re-render al add/remove)
function useRitualItems() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const handler = () => force();
    window.addEventListener(_RITUAL_EVENT, handler);
    return () => window.removeEventListener(_RITUAL_EVENT, handler);
  }, []);
  return (typeof window !== 'undefined' && window.__mtxRitual) ? window.__mtxRitual.list() : [];
}
// Verifica si un item está agendado en el ritual del día. Considera:
//   1. window.__mtxRitual (ritualExtras agregados desde Explorar)
//   2. ACTIVITIES base del Home cuyas activities resuelven a este item via
//      exploreId (vía window._resolveActivityToExploreItem) — si la activity
//      base ya tiene match, NO tiene sentido "agendar" otra vez.
function _isInRitualBase(itemId) {
  if (typeof window === 'undefined') return false;
  const ACTIVITIES = window.ACTIVITIES || [];
  const resolver = window._resolveActivityToExploreItem;
  if (!ACTIVITIES.length || typeof resolver !== 'function') return false;
  return ACTIVITIES.some(a => {
    const resolved = resolver(a);
    return resolved && resolved.id === itemId;
  });
}

function useIsScheduled(id) {
  const computeNow = () => !!(
    (typeof window !== 'undefined' && window.__mtxRitual?.has(id)) ||
    _isInRitualBase(id)
  );
  const [scheduled, setScheduled] = React.useState(computeNow);
  React.useEffect(() => {
    const handler = () => setScheduled(computeNow());
    handler();
    window.addEventListener(_RITUAL_EVENT, handler);
    return () => window.removeEventListener(_RITUAL_EVENT, handler);
  }, [id]);
  return scheduled;
}

// ── Tipos de contenido ────────────────────────────────────────────────────────
const CONTENT_TYPES = [
  { id: 'all',        label: 'Todos',        Ic: IcCompass  },
  { id: 'audiobook',  label: 'Audiolibros',  Ic: IcBook     },
  { id: 'meditation', label: 'Meditaciones', Ic: IcLeaf     },
  { id: 'series',     label: 'Series',       Ic: IcTarget   },
  { id: 'talk',       label: 'Charlas',      Ic: IcMic      },
  { id: 'sound',      label: 'Sonidos',      Ic: IcWind     },
];

// ── Categorías del hub (rows fijas) ───────────────────────────────────────────
const EXPLORE_CATEGORIES = [
  { id: 'continue',     title: 'Continúa donde lo dejaste', sub: 'Retoma tu progreso',                  filter: i => i.playPct != null },
  { id: 'top10',        title: 'Top 10 esta semana',         sub: 'Lo que la comunidad está escuchando', filter: () => true,             tag: 'top10' },
  { id: 'coming-soon',  title: 'Próximamente',                sub: 'Lo que viene en camino',             filter: i => i.status === 'coming-soon' },
  { id: 'audiobooks',   title: 'Audiolibros recomendados',   sub: 'Selección curada para ti',           filter: i => i.type === 'audiobook' },
  { id: 'meditations',  title: 'Meditaciones del día',       sub: 'Encuentra tu centro',                filter: i => i.type === 'meditation' },
  { id: 'talks',        title: 'Charlas que te marcarán',    sub: 'Ideas que cambian perspectivas',     filter: i => i.type === 'talk' },
  { id: 'sounds',       title: 'Sonidos para enfocar',       sub: 'Ambiente sin distracciones',         filter: i => i.type === 'sound' },
];


// ── Taxonomía de categorías de contenido (sistema "Explorar por categoría") ──
const ALL_CATEGORIES = {
  mindfulness:   { id: 'mindfulness',   label: 'Mindfulness',   accent: '#9b8aff', desc: 'Presencia, atención plena y silencio interior.' },
  productividad: { id: 'productividad', label: 'Productividad', accent: '#c8a8ff', desc: 'Enfoque profundo y trabajo significativo.' },
  aprendizaje:   { id: 'aprendizaje',   label: 'Aprendizaje',   accent: '#3dffd1', desc: 'Ideas que expanden cómo piensas.' },
  bienestar:     { id: 'bienestar',     label: 'Bienestar',     accent: '#5dd3ff', desc: 'Equilibrio, gratitud y vida en calma.' },
  filosofia:     { id: 'filosofia',     label: 'Filosofía',     accent: '#FFD66B', desc: 'Sabiduría que atraviesa los siglos.' },
  disciplina:    { id: 'disciplina',    label: 'Disciplina',    accent: '#ff8b6a', desc: 'El arte de hacer lo difícil cuando es difícil.' },
  diseno:        { id: 'diseno',        label: 'Diseño',        accent: '#e8e8e8', desc: 'Forma, función y la belleza de lo esencial.' },
  inspiracion:   { id: 'inspiracion',   label: 'Inspiración',   accent: '#ffd47a', desc: 'Voces que mueven a la acción.' },
  sueno:         { id: 'sueno',         label: 'Sueño',         accent: '#5dd3ff', desc: 'Descanso reparador y noches profundas.' },
  naturaleza:    { id: 'naturaleza',    label: 'Naturaleza',    accent: '#9bd45e', desc: 'Sonidos del mundo para silenciar el ruido.' },
  enfoque:       { id: 'enfoque',       label: 'Enfoque',       accent: '#3dffd1', desc: 'Atención sostenida y trabajo profundo.' },
};

const CATEGORIES_BY_TYPE = {
  all:        ['mindfulness', 'productividad', 'aprendizaje', 'bienestar', 'filosofia'],
  audiobook:  ['productividad', 'aprendizaje', 'filosofia', 'mindfulness'],
  meditation: ['mindfulness', 'sueno', 'enfoque', 'bienestar'],
  series:     ['disciplina', 'productividad', 'mindfulness'],
  talk:       ['filosofia', 'inspiracion', 'diseno', 'productividad'],
  sound:      ['naturaleza'],
};

// ── Mock content (variety, including coming-soon) ─────────────────────────────
const EXPLORE_CONTENT = [
  // Audiolibros
  { id: 'c-habitos',     title: 'Hábitos Atómicos',          author: 'James Clear',       type: 'audiobook', dur: '4h 32m', accent: '#3dffd1', bg: 'linear-gradient(135deg,#1a3a35,#0f2520)', cover: 'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=600&q=80', plays: '124k', rating: 4.9, status: 'available', tags: ['Productividad'], category: 'productividad', narrator: 'Voz · Mentex AI', desc: 'Cómo cambios pequeños y consistentes producen resultados extraordinarios.', playPct: 0.38 },
  { id: 'c-sapiens',     title: 'Sapiens',                    author: 'Yuval Harari',      type: 'audiobook', dur: '6h 12m', accent: '#6ab8ff', bg: 'linear-gradient(135deg,#1f2a3a,#0f1520)', cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80', plays: '156k', rating: 4.7, status: 'available', tags: ['Historia'],         category: 'aprendizaje', narrator: 'Voz · Mentex AI', desc: 'La historia de cómo una especie irrelevante terminó dominando el planeta.', playPct: 0.62 },
  { id: 'c-deepwork',    title: 'Deep Work',                  author: 'Cal Newport',       type: 'audiobook', dur: '5h 18m', accent: '#c8a8ff', bg: 'linear-gradient(135deg,#2a1a3a,#1a0f25)', cover: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&q=80', plays: '178k', rating: 4.9, status: 'available', tags: ['Productividad'], category: 'productividad', narrator: 'Voz · Daniel',     desc: 'La capacidad de hacer trabajo profundo es la habilidad más rara y valiosa.', playPct: 0.15 },
  { id: 'c-poder-ahora', title: 'El poder del ahora',         author: 'Eckhart Tolle',     type: 'audiobook', dur: '5h 40m', accent: '#7dffe0', bg: 'linear-gradient(135deg,#1a2540,#0f1a2a)', cover: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=80', plays: '98k',  rating: 4.8, status: 'available', tags: ['Mindfulness'],   category: 'mindfulness', narrator: 'Voz · Lucía',      desc: 'Tu vida solo ocurre ahora. Aprender a habitar este instante lo cambia todo.' },
  { id: 'c-mvp',         title: 'Cómo construir un MVP',     author: 'Y Combinator',      type: 'audiobook', dur: '38 min', accent: '#ffb47a', bg: 'linear-gradient(135deg,#2a1f15,#1a120a)', cover: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&q=80', plays: '156k', rating: 4.8, status: 'available', tags: ['Startup'],         category: 'aprendizaje', narrator: 'Voz · Michael Seibel', desc: 'El framework para validar una idea sin morir intentándolo.', playPct: 0.74 },

  // Meditaciones
  { id: 'c-respira',     title: 'Respira y vuelve a ti',     author: 'Mentex',            type: 'meditation', dur: '12 min', accent: '#9b8aff', bg: 'linear-gradient(135deg,#2a2540,#15102a)', cover: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=600&q=80', plays: '89k',  rating: 4.8, status: 'available', tags: ['Mindfulness'], category: 'mindfulness', narrator: 'Voz · Lucía', desc: 'Doce minutos para reconectar con tu cuerpo y devolverle silencio a tu mente.' },
  { id: 'c-dormir',      title: 'Meditación para dormir',    author: 'Mentex',            type: 'meditation', dur: '20 min', accent: '#5dd3ff', bg: 'linear-gradient(135deg,#15252a,#0a1518)', cover: 'https://images.unsplash.com/photo-1511295742362-92c96b1cf484?w=600&q=80', plays: '324k', rating: 4.9, status: 'available', tags: ['Sueño'],       category: 'sueno',       narrator: 'Voz · Lucía', desc: 'Sumérgete en un sueño reparador. Libera el estrés del día.' },
  { id: 'c-gratitud',    title: 'Meditación de gratitud',    author: 'Mentex',            type: 'meditation', dur: '8 min',  accent: '#FFD66B', bg: 'linear-gradient(135deg,#2a2515,#1a1610)', cover: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&q=80', plays: '67k',  rating: 4.7, status: 'available', tags: ['Gratitud'],    category: 'bienestar',   narrator: 'Voz · Daniel', desc: 'Reentrena tu mente para notar lo bueno que ya está en tu vida.' },

  // Series
  { id: 'c-disciplina',  title: 'Disciplina mental · Serie', author: 'Mentex Originals',  type: 'series',     dur: '6 eps',  accent: '#ff8b6a', bg: 'linear-gradient(135deg,#3a1a1a,#200f0f)', cover: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80', plays: '45k',  rating: 4.6, status: 'available', tags: ['Disciplina'],    category: 'disciplina',  narrator: 'Voz · Mentex AI', desc: 'Seis episodios para construir disciplina inquebrantable.', episodeCount: 6 },
  { id: 'c-foco',        title: 'La mente del enfoque',      author: 'Mentex Originals',  type: 'series',     dur: '4 eps',  accent: '#3dffd1', bg: 'linear-gradient(135deg,#1a3a35,#0f2520)', cover: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=80', plays: '78k',  rating: 4.8, status: 'available', tags: ['Foco'],          category: 'enfoque',     narrator: 'Voz · Daniel',  desc: 'Entiende y entrena los mecanismos de la atención profunda.', episodeCount: 4 },

  // Charlas
  { id: 'c-jobs',        title: 'Steve Jobs · Stanford 2005', author: 'Charla legendaria', type: 'talk',       dur: '15 min', accent: '#ffd47a', bg: 'linear-gradient(135deg,#2a2a2a,#151515)', cover: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80', plays: '892k', rating: 5.0, status: 'available', tags: ['Inspiración'], category: 'inspiracion',     narrator: 'Voz original',     desc: 'Tres historias sobre conectar puntos, amor y muerte.' },
  { id: 'c-rams',        title: 'Dieter Rams · Menos pero mejor', author: 'Diseño industrial', type: 'talk',  dur: '24 min', accent: '#e8e8e8', bg: 'linear-gradient(135deg,#1a1a1a,#0f0f0f)', cover: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=600&q=80', plays: '67k',  rating: 4.9, status: 'available', tags: ['Diseño'],      category: 'diseno',      narrator: 'Voz · Mentex AI', desc: 'Los 10 principios que redefinieron la disciplina del diseño.' },
  { id: 'c-watts',       title: 'Alan Watts · El silencio',  author: 'Filosofía oriental',type: 'talk',       dur: '18 min', accent: '#9b8aff', bg: 'linear-gradient(135deg,#2a2540,#15102a)', cover: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80', plays: '142k', rating: 4.9, status: 'available', tags: ['Filosofía'],   category: 'filosofia',   narrator: 'Voz original',     desc: 'Descubre el silencio que está debajo del ruido del pensamiento.' },

  // Sonidos
  { id: 'c-lluvia',      title: 'Lluvia profunda',           author: 'Mentex Sound',      type: 'sound',      dur: '60 min', accent: '#5dd3ff', bg: 'linear-gradient(135deg,#15252a,#0a1518)', cover: 'https://images.unsplash.com/photo-1438449805896-28a666819a20?w=600&q=80', plays: '342k', rating: 4.9, status: 'available', tags: ['Naturaleza'],  category: 'naturaleza',      narrator: 'Naturaleza · 60fps', desc: 'Una hora de lluvia constante grabada en el bosque amazónico.' },
  { id: 'c-bosque',      title: 'Bosque al amanecer',        author: 'Mentex Sound',      type: 'sound',      dur: '45 min', accent: '#9bd45e', bg: 'linear-gradient(135deg,#1f2a1a,#101810)', cover: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80', plays: '218k', rating: 4.8, status: 'available', tags: ['Naturaleza'],  category: 'naturaleza',      narrator: 'Naturaleza · binaural', desc: 'Pájaros y viento entre los árboles antes de que el sol toque el suelo.' },
  { id: 'c-fuego',       title: 'Fuego y crepitar',          author: 'Mentex Sound',      type: 'sound',      dur: '55 min', accent: '#ff8b6a', bg: 'linear-gradient(135deg,#2a1f15,#1a120a)', cover: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600&q=80', plays: '156k', rating: 4.7, status: 'available', tags: ['Naturaleza'],  category: 'naturaleza',      narrator: 'Naturaleza · 60fps', desc: 'El crepitar hipnótico de una fogata que abraza el silencio.' },

  // Coming soon
  { id: 'c-cs-stoic',    title: 'Estoicismo para hoy',       author: 'Mentex Originals',  type: 'series',     dur: '8 eps',  accent: '#FFD66B', bg: 'linear-gradient(135deg,#2a2515,#1a1610)', cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80', plays: '—',    rating: 0,    status: 'coming-soon', releaseDate: '15 may 2026', tags: ['Filosofía'], category: 'filosofia', narrator: '—', desc: 'Marco Aurelio, Séneca y Epicteto para una vida con menos ruido y más virtud.', episodeCount: 8 },
  { id: 'c-cs-mindset',  title: 'Mentalidad de élite',       author: 'Carlos Ruiz',       type: 'audiobook',  dur: '6h 20m', accent: '#c8a8ff', bg: 'linear-gradient(135deg,#2a1a3a,#1a0f25)', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80', plays: '—',    rating: 0,    status: 'coming-soon', releaseDate: '02 jun 2026', tags: ['Mindset'],   category: 'productividad', narrator: '—', desc: 'Los hábitos mentales de los más altos performers en deportes, ciencia y arte.' },
  { id: 'c-cs-respiracion', title: 'Respiración consciente · Curso', author: 'Mentex',  type: 'series',     dur: '5 eps',  accent: '#3dffd1', bg: 'linear-gradient(135deg,#1a3a35,#0f2520)', cover: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=80', plays: '—',    rating: 0,    status: 'coming-soon', releaseDate: '10 may 2026', tags: ['Mindfulness'], category: 'mindfulness', narrator: '—', desc: 'Cinco semanas para reentrenar tu sistema nervioso a través de la respiración.', episodeCount: 5 },
];


// ── Mock playlists ────────────────────────────────────────────────────────────
const EXPLORE_PLAYLISTS = [
  { id: 'pl-meditaciones',      title: 'Meditaciones Guiadas para el Despertar', author: { name: 'Equipo Mentex', isOfficial: true  }, totalVideos: 10, totalDuration: '7h 30min',  totalViews: '142K', isPublic: true,  createdBy: 'mentex',
    desc: 'Una colección curada para iniciar tu viaje hacia la presencia plena.',
    thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    accent: '#9b8aff', bg: 'linear-gradient(135deg,#2a2540,#15102a)',
    items: ['c-respira', 'c-dormir', 'c-gratitud'] },
  { id: 'pl-mindfulness-101',   title: 'Mindfulness para Principiantes',         author: { name: 'Equipo Mentex', isOfficial: true  }, totalVideos: 8,  totalDuration: '5h 20min',  totalViews: '98K',  isPublic: true,  createdBy: 'mentex',
    desc: 'Aprende los fundamentos de la atención plena con esta serie introductoria.',
    thumbnail: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80',
    accent: '#3dffd1', bg: 'linear-gradient(135deg,#1a3a35,#0f2520)',
    items: ['c-respira', 'c-poder-ahora', 'c-watts'] },
  { id: 'pl-filosofia',         title: 'Filosofía y Sabiduría Antigua',           author: { name: 'Equipo Mentex', isOfficial: true  }, totalVideos: 12, totalDuration: '9h 45min',  totalViews: '215K', isPublic: true,  createdBy: 'mentex',
    desc: 'Las enseñanzas atemporales de los grandes maestros y filósofos.',
    thumbnail: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&q=80',
    accent: '#FFD66B', bg: 'linear-gradient(135deg,#2a2515,#1a1610)',
    items: ['c-watts', 'c-poder-ahora', 'c-rams'] },
  { id: 'pl-productividad',     title: 'Productividad y Enfoque Extremo',         author: { name: 'Carlos Ruiz',    isOfficial: false }, totalVideos: 9,  totalDuration: '6h 40min',  totalViews: '156K', isPublic: true,  createdBy: 'user',
    desc: 'Domina el arte de la concentración profunda y multiplica tu productividad.',
    thumbnail: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
    accent: '#c8a8ff', bg: 'linear-gradient(135deg,#2a1a3a,#1a0f25)',
    items: ['c-deepwork', 'c-habitos', 'c-foco'] },
  { id: 'pl-dormir',            title: 'Para Dormir Profundamente',               author: { name: 'Equipo Mentex', isOfficial: true  }, totalVideos: 10, totalDuration: '12h 30min', totalViews: '324K', isPublic: true,  createdBy: 'mentex',
    desc: 'Sumérgete en un sueño reparador con estas piezas especialmente diseñadas.',
    thumbnail: 'https://images.unsplash.com/photo-1511295742362-92c96b1cf484?w=800&q=80',
    accent: '#5dd3ff', bg: 'linear-gradient(135deg,#15252a,#0a1518)',
    items: ['c-dormir', 'c-lluvia', 'c-bosque'] },
  { id: 'pl-watch-later',       title: 'Ver más tarde',                            author: { name: 'Tú',             isOfficial: false }, totalVideos: 4,  totalDuration: '2h 15min',  totalViews: '—',    isPublic: false, createdBy: 'user', isWatchLater: true,
    desc: 'Los contenidos que guardaste para cuando tengas tiempo.',
    thumbnail: 'https://images.unsplash.com/photo-1499728603263-13726abce5fd?w=800&q=80',
    accent: '#3dffd1', bg: 'linear-gradient(135deg,#1a3a35,#0f2520)',
    items: ['c-sapiens', 'c-jobs', 'c-rams', 'c-foco'] },
];


// ── Helper hook: history-stack navigation (browser-like back/forward) ─────────
function useExploreNav() {
  const [history, setHistory] = React.useState([{ view: 'home' }]);
  const [index, setIndex]     = React.useState(0);

  const state   = history[index];
  const canBack = index > 0;

  const push = React.useCallback((next) => {
    setHistory(h => {
      const truncated = h.slice(0, index + 1);
      return [...truncated, next];
    });
    setIndex(i => i + 1);
  }, [index]);

  const back = React.useCallback(() => {
    setIndex(i => Math.max(0, i - 1));
  }, []);

  const reset = React.useCallback(() => {
    setHistory([{ view: 'home' }]);
    setIndex(0);
  }, []);

  return { state, push, back, canBack, reset, history, index };
}


// ── ContentTypeFilters — chips horizontales scrolleables ──────────────────────
function ContentTypeFilters({ value, onChange, items = EXPLORE_CONTENT }) {
  const counts = React.useMemo(() => {
    const map = { all: items.length };
    items.forEach(i => { map[i.type] = (map[i.type] || 0) + 1; });
    return map;
  }, [items]);

  return (
    <div style={{ flexShrink:0, marginBottom:8 }}>
      <div className="mtx-scroll-x" style={{
        display:'flex', gap:8,
        paddingTop:8, paddingBottom:12,
        paddingLeft:20, paddingRight:20,
      }}>
        {CONTENT_TYPES.map(t => {
          const active = value === t.id;
          const count  = counts[t.id] ?? 0;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className="mtx-tap"
              style={{
                appearance:'none', cursor:'pointer', flexShrink:0,
                padding:'9px 14px', borderRadius:999,
                border: active ? '0.5px solid rgba(61,255,209,0.45)' : '0.5px solid rgba(255,255,255,0.08)',
                background: active
                  ? 'linear-gradient(180deg, rgba(61,255,209,0.16), rgba(61,255,209,0.05))'
                  : 'rgba(255,255,255,0.03)',
                color: active ? 'var(--neon)' : 'var(--ink-2)',
                fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:600,
                letterSpacing:'-0.005em',
                display:'inline-flex', alignItems:'center', gap:6,
                boxShadow: active
                  ? '0 0 0 1px rgba(61,255,209,0.18), 0 8px 22px -8px rgba(61,255,209,0.45)'
                  : 'none',
                transform: active ? 'translateY(-1px)' : 'translateY(0)',
                transition:'transform .2s, box-shadow .25s, background .2s, border-color .2s, color .2s',
              }}
            >
              <t.Ic size={12} stroke="currentColor" strokeWidth={active ? 2 : 1.6}/>
              {t.label}
              <span style={{
                fontSize:10, fontWeight:700,
                color: active ? 'var(--neon)' : 'var(--ink-3)',
                opacity:0.75,
                fontVariantNumeric:'tabular-nums',
              }}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ── ExploreHeroCard — card cinematográfica del carrusel destacados ────────────
function ExploreHeroCard({ item, onClick, locked = false }) {
  const isComingSoon = item.status === 'coming-soon';
  const isLocked = locked && !isComingSoon;
  const handleTap = () => {
    if (isLocked) {
      if (typeof window !== 'undefined' && window.__mtxOpenPremiumLock) {
        window.__mtxOpenPremiumLock('content');
      }
      return;
    }
    onClick(item);
  };
  return (
    <div
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTap(); } }}
      className="mtx-glass mtx-tap"
      style={{
        width:300, height:210, flexShrink:0,
        scrollSnapAlign:'start',
        borderRadius:22, overflow:'hidden',
        border: `0.5px solid ${isLocked ? 'rgba(61,255,209,0.28)' : item.accent + '33'}`,
        boxShadow: isLocked
          ? '0 0 0 0.5px rgba(61,255,209,0.10), 0 16px 40px -16px rgba(0,0,0,0.6)'
          : `0 0 0 0.5px ${item.accent}1a, 0 16px 40px -16px ${item.accent}55`,
        position:'relative', cursor:'pointer',
        background: item.bg,
        opacity: isLocked ? 0.85 : 1,
      }}
    >
      {/* Cover image */}
      {item.cover && (
        <img src={item.cover} alt="" loading="lazy" style={{
          position:'absolute', inset:0,
          width:'100%', height:'100%', objectFit:'cover',
          opacity: isComingSoon ? 0.35 : (isLocked ? 0.30 : 0.55),
          filter: isLocked ? 'saturate(0.55) contrast(0.95) blur(0.5px)' : 'saturate(0.95) contrast(1.05)',
        }}/>
      )}
      {/* Lock overlay tint */}
      {isLocked && (
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(180deg, rgba(5,7,6,0.50) 0%, rgba(5,7,6,0.78) 100%)',
          pointerEvents:'none',
          zIndex:1,
        }}/>
      )}
      {/* Lock pin top-right (priority over play icon when locked) */}
      {isLocked && (
        <div style={{
          position:'absolute', top:14, right:14, zIndex:3,
          width:34, height:34, borderRadius:999,
          background:'linear-gradient(135deg, rgba(61,255,209,0.22), rgba(61,255,209,0.08))',
          border:'0.5px solid rgba(61,255,209,0.42)',
          boxShadow:'0 0 14px rgba(61,255,209,0.30), inset 0 1px 0 rgba(61,255,209,0.30)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--neon)',
        }}>
          <IcLock size={15} stroke="currentColor" strokeWidth={2.2}/>
        </div>
      )}

      {/* Bottom-up dark gradient + accent tint */}
      <div style={{
        position:'absolute', inset:0,
        background:`linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.78) 100%), radial-gradient(60% 80% at 80% 0%, ${item.accent}25, transparent 60%)`,
        mixBlendMode:'normal',
      }}/>

      {/* Top-left: kind chip */}
      <div style={{
        position:'absolute', top:14, left:14, zIndex:2,
        fontSize:9, fontWeight:700, letterSpacing:'0.14em',
        textTransform:'uppercase', color:item.accent,
        padding:'4px 9px', borderRadius:999,
        background:'rgba(0,0,0,0.5)',
        backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
        border:`0.5px solid ${item.accent}40`,
      }}>
        {CONTENT_TYPES.find(t => t.id === item.type)?.label || item.type}
      </div>

      {/* Top-right: status pin */}
      {isComingSoon ? (
        <div style={{
          position:'absolute', top:14, right:14, zIndex:2,
          fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
          color:'#0a1410',
          padding:'4px 9px', borderRadius:999,
          background:'linear-gradient(135deg, #FFD66B, #ff8b6a)',
          boxShadow:'0 0 14px rgba(255,214,107,0.5)',
        }}>
          Próximamente
        </div>
      ) : (
        <div style={{
          position:'absolute', top:14, right:14, zIndex:2,
          width:36, height:36, borderRadius:999,
          background:'rgba(0,0,0,0.55)',
          backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
          border:`0.5px solid ${item.accent}55`,
          display:'flex', alignItems:'center', justifyContent:'center',
          color:item.accent,
        }}>
          <IcPlay size={14} stroke="currentColor" strokeWidth={2.2}/>
        </div>
      )}

      {/* Bottom: title + author + meta */}
      <div style={{
        position:'absolute', left:16, right:16, bottom:14, zIndex:2,
        display:'flex', flexDirection:'column', gap:5,
      }}>
        <div style={{
          fontSize:18, fontWeight:700, color:'#fff',
          letterSpacing:'-0.02em', lineHeight:1.18,
          textShadow:'0 2px 12px rgba(0,0,0,0.65)',
          fontFamily:'var(--ff-display)',
          overflow:'hidden', textOverflow:'ellipsis',
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
        }}>
          {item.title}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11.5, color:'rgba(255,255,255,0.78)' }}>
          <span style={{ fontWeight:500 }}>{item.author}</span>
          <span style={{ opacity:0.5 }}>·</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontVariantNumeric:'tabular-nums' }}>
            <IcClock size={10} stroke="currentColor"/>
            {item.dur}
          </span>
        </div>
      </div>
    </div>
  );
}


// ── ExploreHero — carrusel cinematográfico de destacados ──────────────────────
// Phase 5.3.C — Premium gate: si free, primeros 2 hero cards libres como
// preview, resto lockeados. Da más espacio que ContentRow porque los hero
// son el "showcase" — el user free debe poder explorar al menos 1-2 sin ver
// solo bloqueos.
function ExploreHero({ items, onItemClick }) {
  if (!items.length) return null;
  const isPremium = (typeof window !== 'undefined' && window.__mtxIsPremium)
    ? window.__mtxIsPremium() : true;
  return (
    <div style={{ marginBottom:22 }}>
      <div style={{ padding:'0 20px 10px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--neon)', letterSpacing:'0.16em', marginBottom:3 }}>
          Destacados
        </div>
        <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em' }}>
          Imperdibles para ti
        </h2>
      </div>
      <div style={{
        display:'flex', gap:12,
        overflowX:'auto', overflowY:'hidden',
        padding:'4px 20px 12px',
        scrollSnapType:'x mandatory',
        scrollPaddingLeft:20,
        WebkitOverflowScrolling:'touch',
      }}>
        {items.map((it, i) => (
          <ExploreHeroCard
            key={it.id}
            item={it}
            onClick={onItemClick}
            locked={!isPremium && i >= 2}
          />
        ))}
      </div>
    </div>
  );
}


// ── ExploreContentCard — card consistente con MtxLearningCard + extensiones ──
function ExploreContentCard({ item, onClick, variant = 'default', locked = false }) {
  const isComingSoon = item.status === 'coming-soon';
  const hasProgress  = item.playPct != null && !isComingSoon;
  const isSeries     = item.type === 'series';
  const isGrid       = variant === 'grid';

  // Phase 5.3.C — Premium gate. Si locked y user free, tap → lock sheet
  // (no abre el item). Coming-soon tiene precedencia visual sobre locked
  // (un item próximamente pero locked sigue mostrando próximamente).
  const isLocked = locked && !isComingSoon;
  const handleTap = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isLocked) {
      if (typeof window !== 'undefined' && window.__mtxOpenPremiumLock) {
        window.__mtxOpenPremiumLock('content');
      }
      return;
    }
    onClick(item);
  };

  return (
    <div
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { handleTap(e); } }}
      className="mtx-glass mtx-tap"
      style={{
        width: isGrid ? '100%' : 200, flexShrink:0,
        borderRadius:18, overflow:'hidden', cursor:'pointer',
        border: isComingSoon
          ? '0.5px solid rgba(255,214,107,0.35)'
          : isLocked
            ? '0.5px solid rgba(61,255,209,0.20)'
            : `0.5px solid var(--glass-stroke)`,
        background:'var(--glass-1)',
        boxShadow: isComingSoon
          ? '0 0 0 1px rgba(255,214,107,0.15), 0 12px 32px -14px rgba(255,214,107,0.4)'
          : isLocked
            ? '0 0 0 1px rgba(61,255,209,0.08), 0 12px 32px -14px rgba(0,0,0,0.6)'
            : 'var(--shadow-card)',
        position:'relative',
        opacity: isComingSoon ? 0.92 : (isLocked ? 0.82 : 1),
      }}
    >
      {/* Cover */}
      <div style={{
        height: isGrid ? 150 : 130,
        position:'relative', overflow:'hidden',
        display:'flex', alignItems:'flex-end', padding:12,
        background:item.bg,
      }}>
        {item.cover && (
          <img src={item.cover} alt="" loading="lazy" style={{
            position:'absolute', inset:0,
            width:'100%', height:'100%', objectFit:'cover',
            opacity: isComingSoon ? 0.35 : (isLocked ? 0.42 : 0.78),
            filter: isLocked ? 'saturate(0.55) contrast(0.95) blur(0.5px)' : 'saturate(0.9) contrast(1.05)',
          }}/>
        )}
        {/* Lock overlay tint — sombra extra dark sobre el cover cuando locked */}
        {isLocked && (
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(180deg, rgba(5,7,6,0.45) 0%, rgba(5,7,6,0.78) 100%)',
            pointerEvents:'none',
            zIndex:1,
          }}/>
        )}
        {/* Vignette */}
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.6) 100%)',
        }}/>
        {/* Color tint */}
        <div style={{
          position:'absolute', inset:0,
          background:`linear-gradient(135deg, ${item.accent}22, transparent 60%)`,
          mixBlendMode:'soft-light',
        }}/>

        {/* Top-left: kind tag */}
        <div style={{
          position:'absolute', top:10, left:10, zIndex:2,
          fontSize:9, fontWeight:700, letterSpacing:'0.12em',
          textTransform:'uppercase', color:item.accent,
          padding:'3px 8px', borderRadius:999,
          background:'rgba(0,0,0,0.5)',
          backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
          border:`0.5px solid ${item.accent}40`,
        }}>
          {CONTENT_TYPES.find(t => t.id === item.type)?.label || item.type}
        </div>

        {/* Top-right: status pin (priority: coming-soon > locked > series > play) */}
        {isComingSoon ? (
          <div style={{
            position:'absolute', top:10, right:10, zIndex:3,
            display:'inline-flex', alignItems:'center', gap:5,
            padding:'4px 9px 4px 8px', borderRadius:999,
            background:'linear-gradient(135deg, #FFD66B, #ff8b6a)',
            boxShadow:'0 0 14px rgba(255,214,107,0.55)',
            fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
            color:'#0a1410',
          }}>
            Próximamente
          </div>
        ) : isLocked ? (
          // Phase 5.3.C — candado pin top-right + glow neon sutil
          <div style={{
            position:'absolute', top:10, right:10, zIndex:3,
            width:30, height:30, borderRadius:999,
            background:'linear-gradient(135deg, rgba(61,255,209,0.22), rgba(61,255,209,0.08))',
            border:'0.5px solid rgba(61,255,209,0.42)',
            boxShadow:'0 0 14px rgba(61,255,209,0.30), inset 0 1px 0 rgba(61,255,209,0.30)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--neon)',
          }}>
            <IcLock size={13} stroke="currentColor" strokeWidth={2.2}/>
          </div>
        ) : isSeries ? (
          <div style={{
            position:'absolute', top:10, right:10, zIndex:2,
            padding:'3px 9px', borderRadius:999,
            background:'rgba(0,0,0,0.55)',
            backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
            border:`0.5px solid ${item.accent}40`,
            fontSize:10, fontWeight:700,
            color:'#fff',
            display:'inline-flex', alignItems:'center', gap:4,
          }}>
            <IcTarget size={10} stroke="currentColor"/>
            {item.episodeCount ?? '·'} eps
          </div>
        ) : (
          <div style={{
            position:'absolute', top:10, right:10, zIndex:2,
            width:28, height:28, borderRadius:999,
            background:'rgba(0,0,0,0.55)',
            backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff',
            border:'0.5px solid rgba(255,255,255,0.15)',
          }}>
            <IcPlay size={12} stroke="currentColor"/>
          </div>
        )}

        {/* Duration (bottom-left of cover) */}
        <div style={{
          fontSize:11, color:'rgba(255,255,255,0.85)', position:'relative', zIndex:2,
          fontWeight:500, textShadow:'0 1px 4px rgba(0,0,0,0.6)',
          display:'inline-flex', alignItems:'center', gap:5,
          fontVariantNumeric:'tabular-nums',
        }}>
          <IcClock size={10} stroke="currentColor"/>
          {item.dur}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:'12px 14px', position:'relative' }}>
        {/* Progress bar at top of body if hasProgress */}
        {hasProgress && (
          <div style={{
            position:'absolute', top:0, left:0,
            width:`${Math.round(item.playPct * 100)}%`,
            height:3, background:'var(--neon)',
            boxShadow:'0 0 8px var(--neon)',
            borderRadius:'0 999px 999px 0',
          }}/>
        )}

        <div style={{
          fontSize:13, fontWeight:600, color:'var(--ink-1)', marginBottom:2,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          letterSpacing:'-0.01em',
        }}>
          {item.title}
        </div>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          gap:6,
        }}>
          <span style={{
            fontSize:11, color:'var(--ink-3)',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            flex:1, minWidth:0,
          }}>{item.author}</span>
          {!isComingSoon && item.plays && item.plays !== '—' && (
            <span style={{
              fontSize:10, color:'var(--ink-3)', opacity:0.7,
              fontVariantNumeric:'tabular-nums', flexShrink:0,
              display:'inline-flex', alignItems:'center', gap:3,
            }}>
              <IcPlay size={8} stroke="currentColor" strokeWidth={2}/>
              {item.plays}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


// ── TopTenCard — card del top 10 con número Netflix-style mitad in/out ──────
function TopTenCard({ item, rank, onClick, locked = false }) {
  const handleTap = () => {
    if (locked) {
      if (typeof window !== 'undefined' && window.__mtxOpenPremiumLock) {
        window.__mtxOpenPremiumLock('content');
      }
      return;
    }
    onClick(item);
  };
  return (
    <div
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTap(); } }}
      style={{
        position:'relative', flexShrink:0,
        width:215, paddingLeft:15,
        cursor:'pointer',
      }}
    >
      {/* Big rank number — Netflix style, left-aligned with row title */}
      <div style={{
        position:'absolute',
        left:0, top:'50%',
        transform:'translateY(-50%)',
        zIndex:2, pointerEvents:'none',
        filter:'drop-shadow(0 6px 16px rgba(0,0,0,0.55))',
      }}>
        <svg viewBox="0 0 100 140" style={{ height:200, width:'auto', overflow:'visible', display:'block' }}>
          <defs>
            <linearGradient id={`top10-grad-${rank}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#f8fafc" stopOpacity="0.96"/>
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.86"/>
            </linearGradient>
          </defs>
          <text
            x="-7" y="108"
            fontSize="130" fontWeight="900"
            textAnchor="start"
            fill={`url(#top10-grad-${rank})`}
            stroke="#050706"
            strokeWidth="6"
            strokeLinejoin="round"
            paintOrder="stroke"
            style={{
              fontFamily:'var(--ff-display), system-ui, sans-serif',
              letterSpacing:'-0.03em',
            }}
          >
            {rank}
          </text>
        </svg>
      </div>

      {/* Image card — 200×250 inside the 50px padding-left gutter */}
      <div className="mtx-glass" style={{
        width:200, height:250,
        borderRadius:18, overflow:'hidden',
        position:'relative',
        background: item.bg,
        border: `0.5px solid ${locked ? 'rgba(61,255,209,0.28)' : item.accent + '28'}`,
        boxShadow: locked
          ? '0 0 0 0.5px rgba(61,255,209,0.10), 0 14px 32px -14px rgba(0,0,0,0.6)'
          : `0 0 0 0.5px ${item.accent}1a, 0 14px 32px -14px ${item.accent}55`,
        opacity: locked ? 0.85 : 1,
      }}>
        {item.cover && (
          <img src={item.cover} alt="" loading="lazy" style={{
            position:'absolute', inset:0,
            width:'100%', height:'100%', objectFit:'cover',
            opacity: locked ? 0.30 : 0.82,
            filter: locked ? 'saturate(0.55) contrast(0.95) blur(0.5px)' : 'saturate(0.95) contrast(1.05)',
          }}/>
        )}
        {/* Lock overlay tint */}
        {locked && (
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(180deg, rgba(5,7,6,0.50) 0%, rgba(5,7,6,0.78) 100%)',
            pointerEvents:'none',
            zIndex:1,
          }}/>
        )}
        {/* Lock pin top-right */}
        {locked && (
          <div style={{
            position:'absolute', top:10, right:10, zIndex:3,
            width:30, height:30, borderRadius:999,
            background:'linear-gradient(135deg, rgba(61,255,209,0.22), rgba(61,255,209,0.08))',
            border:'0.5px solid rgba(61,255,209,0.42)',
            boxShadow:'0 0 14px rgba(61,255,209,0.30), inset 0 1px 0 rgba(61,255,209,0.30)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--neon)',
          }}>
            <IcLock size={13} stroke="currentColor" strokeWidth={2.2}/>
          </div>
        )}
        {/* Vignette + accent tint */}
        <div style={{
          position:'absolute', inset:0,
          background:`linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.78) 100%), radial-gradient(60% 80% at 80% 0%, ${item.accent}25, transparent 60%)`,
        }}/>

        {/* Top-right kind chip */}
        <div style={{
          position:'absolute', top:10, right:10, zIndex:2,
          fontSize:9, fontWeight:700, letterSpacing:'0.12em',
          textTransform:'uppercase', color:item.accent,
          padding:'3px 8px', borderRadius:999,
          background:'rgba(0,0,0,0.5)',
          backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
          border:`0.5px solid ${item.accent}40`,
        }}>
          {CONTENT_TYPES.find(t => t.id === item.type)?.label || item.type}
        </div>

        {/* Bottom info block */}
        <div style={{
          position:'absolute', left:14, right:14, bottom:14, zIndex:2,
          display:'flex', flexDirection:'column', gap:4,
        }}>
          <div style={{
            fontSize:14, fontWeight:700, color:'#fff',
            letterSpacing:'-0.01em', lineHeight:1.2,
            textShadow:'0 1px 6px rgba(0,0,0,0.7)',
            overflow:'hidden', textOverflow:'ellipsis',
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
          }}>
            {item.title}
          </div>
          <div style={{
            fontSize:11, color:'rgba(255,255,255,0.78)',
            display:'flex', alignItems:'center', gap:6,
          }}>
            <span style={{ fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {item.author}
            </span>
            {item.dur && (
              <>
                <span style={{ width:3, height:3, borderRadius:999, background:'rgba(255,255,255,0.4)' }}/>
                <span style={{ fontVariantNumeric:'tabular-nums' }}>{item.dur}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ── TopTenRow — fila scroll-x del Top 10 con cards Netflix-style ─────────────
function TopTenRow({ category, items, onItemClick, onViewAll }) {
  if (!items.length) return null;
  // Phase 5.3.C — Top 3 free como teaser, top 4-10 lockeados.
  const isPremium = (typeof window !== 'undefined' && window.__mtxIsPremium)
    ? window.__mtxIsPremium() : true;
  return (
    <div style={{ marginBottom:24 }}>
      <MtxSectionHead
        title={category.title}
        subtitle={category.sub}
        action="Ver todo"
        onAction={() => onViewAll(category)}
      />
      <div className="mtx-scroll-x" style={{ paddingLeft:17, paddingRight:20, gap:6 }}>
        {items.map((it, i) => (
          <TopTenCard
            key={it.id}
            item={it}
            rank={i + 1}
            onClick={onItemClick}
            locked={!isPremium && i >= 3}
          />
        ))}
      </div>
    </div>
  );
}


// ── ContentRow — fila scroll-x con header + cards ────────────────────────────
// Phase 5.3.C — Premium gate: si user free, primer item de cada row queda
// FREE preview (i === 0), resto LOCKED. Esto da ~10-15% del catálogo
// accesible para preview, el resto requiere premium. El user free puede
// "probar el sabor" pero ve claramente que hay mucho más detrás del paywall.
function ContentRow({ category, items, onItemClick, onViewAll }) {
  if (!items.length) return null;
  const isPremium = (typeof window !== 'undefined' && window.__mtxIsPremium)
    ? window.__mtxIsPremium() : true;
  return (
    <div style={{ marginBottom:24 }}>
      <MtxSectionHead
        title={category.title}
        subtitle={category.sub}
        action="Ver todo"
        onAction={() => onViewAll(category)}
      />
      <div className="mtx-scroll-x" style={{ paddingLeft:20, paddingRight:20 }}>
        {items.map((it, i) => (
          <ExploreContentCard
            key={it.id}
            item={it}
            onClick={onItemClick}
            locked={!isPremium && i > 0}
          />
        ))}
      </div>
    </div>
  );
}


// ── playValue helper (parses "124k", "892k", "—", etc.) ──────────────────────
const _playValue = (p) => {
  if (!p || p === '—') return 0;
  const m = String(p).match(/([\d.]+)\s*([kKmM])?/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const mult = m[2] === 'k' || m[2] === 'K' ? 1000 : (m[2] === 'm' || m[2] === 'M' ? 1000000 : 1);
  return n * mult;
};

// ── Duration helper: "4h 32m" / "12 min" / "60 min" → seconds ────────────────
const _parseDuration = (dur) => {
  if (!dur) return 600;
  const h = (String(dur).match(/(\d+)\s*h/) || [])[1];
  const m = (String(dur).match(/(\d+)\s*m(?:in)?/) || [])[1];
  const total = (parseInt(h || '0') * 3600) + (parseInt(m || '0') * 60);
  return total > 0 ? total : 600;
};
const _formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ── Mock chapters generator ──────────────────────────────────────────────────
const _generateChapters = (item) => {
  const totalMin = Math.floor(_parseDuration(item.dur) / 60);
  const slice = Math.max(2, Math.floor(totalMin / 4));
  return [
    { t: 'Apertura',         d: `${slice} min` },
    { t: 'Idea central',     d: `${slice} min` },
    { t: 'Profundización',   d: `${slice} min` },
    { t: 'Cierre y reflexión', d: `${Math.max(1, totalMin - slice * 3)} min` },
  ];
};

// ── Mock search data ─────────────────────────────────────────────────────────
const _MOCK_RECENT_SEARCHES = [
  'Hábitos atómicos',
  'Meditación para dormir',
  'Steve Jobs Stanford',
  'Filosofía estoica',
  'Sonidos de lluvia',
];
const _TRENDING_TAGS = ['mindfulness', 'productividad', 'aprendizaje', 'filosofia', 'sueno', 'naturaleza'];


// ── Mock library data ────────────────────────────────────────────────────────
const _MOCK_HISTORY = [
  { contentId: 'c-jobs',        group: 'Hoy',           when: '2:30 pm' },
  { contentId: 'c-respira',     group: 'Hoy',           when: '9:15 am' },
  { contentId: 'c-deepwork',    group: 'Ayer',          when: '8:42 pm' },
  { contentId: 'c-watts',       group: 'Ayer',          when: '11:20 am' },
  { contentId: 'c-habitos',     group: 'Esta semana',   when: 'Hace 2 días' },
  { contentId: 'c-rams',        group: 'Esta semana',   when: 'Hace 3 días' },
  { contentId: 'c-lluvia',      group: 'Esta semana',   when: 'Hace 5 días' },
  { contentId: 'c-poder-ahora', group: 'Antes',         when: 'Hace 1 sem' },
  { contentId: 'c-foco',        group: 'Antes',         when: 'Hace 2 sem' },
];
const _MOCK_SAVED_ITEMS     = ['c-deepwork', 'c-jobs', 'c-watts', 'c-bosque', 'c-rams', 'c-foco'];
const _MOCK_SAVED_PLAYLISTS = ['pl-meditaciones', 'pl-filosofia', 'pl-watch-later'];


// ── Mock comments ────────────────────────────────────────────────────────────
const _MOCK_COMMENTS = [
  { id: 'cm1', author: 'María Fernández', initial: 'M', accent: '#9b8aff', time: 'Hace 2 días',  text: 'Esta pieza me cambió la forma de empezar el día. Gracias.', likes: 42 },
  { id: 'cm2', author: 'Juan Pablo',       initial: 'J', accent: '#3dffd1', time: 'Hace 1 sem',   text: 'Llevo un mes con este tipo de contenido. La diferencia es real.', likes: 28 },
  { id: 'cm3', author: 'Laura V.',         initial: 'L', accent: '#FFD66B', time: 'Hace 3 sem',  text: 'Lo escuché dos veces. La segunda fue mejor.', likes: 15 },
  { id: 'cm4', author: 'Sergio Ruiz',      initial: 'S', accent: '#5dd3ff', time: 'Hace 1 mes',   text: 'Calidad de producción excelente. Lo recomiendo a mi equipo.', likes: 9 },
];


// ── Playlist helpers ─────────────────────────────────────────────────────────
const _resolvePlaylistItems = (playlist) => {
  if (!playlist || !playlist.items) return [];
  const baseIds = Array.isArray(playlist.items) ? playlist.items : [];
  const extraIds = Array.isArray(playlist._extraItemIds) ? playlist._extraItemIds : [];
  const removedIds = new Set(Array.isArray(playlist._removedItemIds) ? playlist._removedItemIds : []);
  return [...baseIds, ...extraIds]
    .filter(id => !removedIds.has(id))
    .map(id => EXPLORE_CONTENT.find(c => c.id === id))
    .filter(Boolean);
};


// ── PlaylistCard — card de playlist en scroll horizontal del hub ─────────────
function PlaylistCard({ playlist, onClick, variant = 'scroll' }) {
  if (!playlist) return null;
  const accent = playlist.accent || '#3dffd1';

  return (
    <div
      onClick={() => onClick(playlist)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(playlist); } }}
      className="mtx-glass mtx-tap"
      style={{
        ...(variant === 'grid'
          ? { width:'100%', minWidth:0, boxSizing:'border-box' }
          : { width:200, flexShrink:0 }
        ),
        borderRadius:18, overflow:'hidden', cursor:'pointer',
        border:`0.5px solid ${accent}28`,
        background:'var(--glass-1)',
        boxShadow:`0 0 0 0.5px ${accent}1a, 0 12px 32px -16px ${accent}50`,
        position:'relative',
      }}
    >
      {/* Cover */}
      <div style={{
        height: variant === 'grid' ? 116 : 130, position:'relative', overflow:'hidden',
        display:'flex', alignItems:'flex-end', padding:12,
        background: playlist.bg,
      }}>
        {playlist.thumbnail && (
          <img src={playlist.thumbnail} alt="" loading="lazy" style={{
            position:'absolute', inset:0,
            width:'100%', height:'100%', objectFit:'cover',
            opacity:0.78, filter:'saturate(0.95) contrast(1.05)',
          }}/>
        )}
        {/* Vignette + accent tint */}
        <div style={{
          position:'absolute', inset:0,
          background:`linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.65) 100%), radial-gradient(70% 80% at 80% 0%, ${accent}30, transparent 60%)`,
        }}/>

        {/* Top-left: Playlist eyebrow */}
        <div style={{
          position:'absolute', top:10, left:10, zIndex:2,
          fontSize:9, fontWeight:700, letterSpacing:'0.14em',
          textTransform:'uppercase', color:accent,
          padding:'3px 8px', borderRadius:999,
          background:'rgba(0,0,0,0.55)',
          backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
          border:`0.5px solid ${accent}45`,
          display:'inline-flex', alignItems:'center', gap:5,
        }}>
          <IcTarget size={9} stroke="currentColor" strokeWidth={2}/>
          Playlist
        </div>

        {/* Top-right: Official badge or play */}
        {playlist.author?.isOfficial && (
          <div style={{
            position:'absolute', top:10, right:10, zIndex:2,
            fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
            color:'#0a1410',
            padding:'4px 9px', borderRadius:999,
            background:`linear-gradient(135deg, ${accent}, ${accent}cc)`,
            boxShadow:`0 0 12px ${accent}66`,
          }}>
            Oficial
          </div>
        )}

        {/* Bottom-left: count badge */}
        <div style={{
          position:'relative', zIndex:2,
          fontSize:11, color:'rgba(255,255,255,0.92)',
          fontWeight:600, textShadow:'0 1px 4px rgba(0,0,0,0.6)',
          display:'inline-flex', alignItems:'center', gap:6,
          fontVariantNumeric:'tabular-nums',
        }}>
          <span style={{
            display:'inline-flex', alignItems:'center', gap:4,
            padding:'3px 7px', borderRadius:6,
            background:'rgba(0,0,0,0.5)',
            backdropFilter:'blur(6px)',
            fontSize:10, fontWeight:700, letterSpacing:'0.04em',
          }}>
            {playlist.totalVideos} videos
          </span>
          <span style={{ opacity:0.6 }}>·</span>
          <span>{playlist.totalDuration}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:'12px 14px' }}>
        <div style={{
          fontSize:13, fontWeight:700, color:'var(--ink-1)',
          letterSpacing:'-0.01em', lineHeight:1.25,
          overflow:'hidden', textOverflow:'ellipsis',
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
          marginBottom:4, minHeight:32,
        }}>
          {playlist.title}
        </div>
        <div style={{
          fontSize:11, color:'var(--ink-3)',
          display:'flex', alignItems:'center', gap:5,
        }}>
          {playlist.author?.isOfficial && (
            <IcSpark size={9} stroke={accent} strokeWidth={2.2}/>
          )}
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {playlist.author?.name}
          </span>
        </div>
      </div>
    </div>
  );
}


// ── PlaylistsRow — sección "Colecciones para ti" en el hub ───────────────────
function PlaylistsRow({ playlists, onPlaylistClick, onViewAll }) {
  if (!playlists.length) return null;
  return (
    <div style={{ marginBottom:24 }}>
      <MtxSectionHead
        title="Colecciones para ti"
        subtitle="Playlists curadas por Mentex y la comunidad."
        action="Ver todo"
        onAction={onViewAll}
      />
      <div className="mtx-scroll-x" style={{ paddingLeft:20, paddingRight:20 }}>
        {playlists.map(p => (
          <PlaylistCard key={p.id} playlist={p} onClick={onPlaylistClick}/>
        ))}
      </div>
    </div>
  );
}


// ── SortFilters — chips de orden para CategoryFullView ───────────────────────
const SORT_OPTIONS = [
  { id: 'popular', label: 'Más populares', Ic: IcFlame },
  { id: 'recent',  label: 'Más recientes', Ic: IcClock },
  { id: 'az',      label: 'A–Z',           Ic: null   },
  { id: 'za',      label: 'Z–A',           Ic: null   },
];

function SortFilters({ value, onChange }) {
  return (
    <div style={{ flexShrink:0 }}>
      <div className="mtx-scroll-x" style={{
        display:'flex', gap:8,
        paddingTop:8, paddingBottom:12,
        paddingLeft:20, paddingRight:20,
      }}>
        {SORT_OPTIONS.map(opt => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className="mtx-tap"
              style={{
                appearance:'none', cursor:'pointer', flexShrink:0,
                padding:'8px 13px', borderRadius:999,
                border: active ? '0.5px solid rgba(61,255,209,0.45)' : '0.5px solid rgba(255,255,255,0.08)',
                background: active
                  ? 'linear-gradient(180deg, rgba(61,255,209,0.16), rgba(61,255,209,0.05))'
                  : 'rgba(255,255,255,0.03)',
                color: active ? 'var(--neon)' : 'var(--ink-2)',
                fontFamily:'var(--ff-sans)', fontSize:11.5, fontWeight:600,
                letterSpacing:'-0.005em',
                display:'inline-flex', alignItems:'center', gap:5,
                boxShadow: active
                  ? '0 0 0 1px rgba(61,255,209,0.18), 0 6px 18px -8px rgba(61,255,209,0.4)'
                  : 'none',
                transform: active ? 'translateY(-1px)' : 'translateY(0)',
                transition:'transform .2s, box-shadow .25s, background .2s, border-color .2s, color .2s',
              }}
            >
              {opt.Ic && <opt.Ic size={11} stroke="currentColor" strokeWidth={active ? 2 : 1.6}/>}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ── FilterPanel — desplegable desde arriba con sort + tipo de contenido ─────
function FilterPanel({ sort, onSortChange, filter, onFilterChange, sourceItems, onClose, onReset }) {
  return (
    <div onClick={onClose} style={{
      position:'absolute', inset:0, zIndex:170,
      background:'rgba(0,0,0,0.5)',
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      animation:'mtx-fade-up .2s ease',
    }}>
      <style>{`
        @keyframes mtxFilterDown {
          from { transform:translateY(-100%); opacity:0; }
          to   { transform:translateY(0);     opacity:1; }
        }
      `}</style>
      <div onClick={e => e.stopPropagation()} style={{
        position:'absolute', top:8, left:12, right:12,
        borderRadius:24,
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        boxShadow:'0 24px 60px -12px rgba(0,0,0,0.7)',
        animation:'mtxFilterDown .35s cubic-bezier(.2,.9,.3,1.2) both',
        padding:'52px 4px 18px',
        overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding:'0 18px 14px',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
        }}>
          <div>
            <div className="mtx-eyebrow" style={{
              fontSize:9, color:'var(--neon)',
              letterSpacing:'0.16em', marginBottom:3, fontWeight:700,
            }}>
              Ordenar y filtrar
            </div>
            <h2 style={{
              margin:0, fontSize:18, fontWeight:700, color:'var(--ink-1)',
              letterSpacing:'-0.02em', fontFamily:'var(--ff-display)',
            }}>
              Refina tu vista
            </h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar filtros" className="mtx-tap" style={{
            width:36, height:36, borderRadius:999, border:0, cursor:'pointer',
            background:'rgba(255,255,255,0.06)',
            color:'var(--ink-1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0,
          }}>
            <IcClose size={16} stroke="currentColor"/>
          </button>
        </div>

        {/* Sort section */}
        <div style={{ padding:'0 18px 4px' }}>
          <div style={{
            fontSize:9, fontWeight:700, letterSpacing:'0.14em',
            color:'var(--ink-3)', textTransform:'uppercase',
            marginBottom:8, paddingLeft:4,
          }}>
            Ordenar por
          </div>
        </div>
        <SortFilters value={sort} onChange={onSortChange}/>

        {/* Type section */}
        <div style={{ padding:'0 18px 4px', marginTop:6 }}>
          <div style={{
            fontSize:9, fontWeight:700, letterSpacing:'0.14em',
            color:'var(--ink-3)', textTransform:'uppercase',
            marginBottom:8, paddingLeft:4,
          }}>
            Tipo de contenido
          </div>
        </div>
        <ContentTypeFilters value={filter} onChange={onFilterChange} items={sourceItems}/>

        {/* Footer actions */}
        <div style={{ padding:'14px 18px 0', display:'flex', gap:10 }}>
          <button onClick={onReset} className="mtx-tap" style={{
            flex:1, height:46, borderRadius:14, cursor:'pointer',
            border:'0.5px solid rgba(255,255,255,0.08)',
            background:'transparent',
            color:'var(--ink-2)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}>
            Restablecer
          </button>
          <button onClick={onClose} className="mtx-tap" style={{
            flex:2, height:46, borderRadius:14, border:0, cursor:'pointer',
            background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
            color:'#0a1410',
            fontSize:13, fontWeight:700, fontFamily:'var(--ff-sans)',
            letterSpacing:'-0.005em',
            boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 10px 24px -8px rgba(61,255,209,0.5), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}


// ── CategoryFullView — vista expandida con back, sort, filter, grid 2-col ────
// Sliders icon (inline) for the filter button
const SlidersIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6"   x2="9"  y2="6"/>
    <line x1="14" y1="6"  x2="20" y2="6"/>
    <circle cx="11.5" cy="6"  r="2.4"/>
    <line x1="4" y1="12"  x2="13" y2="12"/>
    <line x1="18" y1="12" x2="20" y2="12"/>
    <circle cx="15.5" cy="12" r="2.4"/>
    <line x1="4" y1="18"  x2="6"  y2="18"/>
    <line x1="11" y1="18" x2="20" y2="18"/>
    <circle cx="8.5" cy="18" r="2.4"/>
  </svg>
);

function CategoryFullView({ category, sourceItems, onBack, onItemClick }) {
  const [sort, setSort]     = React.useState('popular');
  const [filter, setFilter] = React.useState('all');
  const [filterPanelOpen, setFilterPanelOpen] = React.useState(false);

  const finalItems = React.useMemo(() => {
    let arr = sourceItems;
    if (filter !== 'all') arr = arr.filter(i => i.type === filter);
    arr = [...arr];
    if (sort === 'popular')      arr.sort((a, b) => _playValue(b.plays) - _playValue(a.plays));
    else if (sort === 'recent')  arr = arr.reverse();
    else if (sort === 'az')      arr.sort((a, b) => a.title.localeCompare(b.title, 'es'));
    else if (sort === 'za')      arr.sort((a, b) => b.title.localeCompare(a.title, 'es'));
    return arr;
  }, [sourceItems, sort, filter]);

  const activeFilterCount = (sort !== 'popular' ? 1 : 0) + (filter !== 'all' ? 1 : 0);
  const handleReset = () => { setSort('popular'); setFilter('all'); };

  const portalRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
  const filterPanelEl = filterPanelOpen ? (
    <FilterPanel
      sort={sort} onSortChange={setSort}
      filter={filter} onFilterChange={setFilter}
      sourceItems={sourceItems}
      onClose={() => setFilterPanelOpen(false)}
      onReset={handleReset}
    />
  ) : null;
  const portalledFilterPanel = filterPanelEl
    ? (portalRoot && window.ReactDOM ? window.ReactDOM.createPortal(filterPanelEl, portalRoot) : filterPanelEl)
    : null;

  return (
    <div style={{
      paddingBottom:120,
      animation:'mtxNotifInFull .35s cubic-bezier(.25,.8,.25,1) both',
    }}>
      {/* Nav bar — back btn + centered title (mismo patrón que NotificationsSheet) */}
      <div style={{
        paddingTop:48, paddingLeft:16, paddingRight:16, paddingBottom:10,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexShrink:0, position:'relative',
      }}>
        <button onClick={onBack} aria-label="Volver" className="mtx-tap" style={{
          width:40, height:40, borderRadius:999, border:0,
          background:'rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--ink-1)', cursor:'pointer',
          position:'relative', zIndex:2,
        }}>
          <IcChevL size={20} stroke="currentColor" strokeWidth={2}/>
        </button>
        <div style={{
          position:'absolute', left:'50%', top:'50%',
          transform:'translate(-50%, calc(-50% + 19px))',
          fontSize:16, fontWeight:700, color:'var(--ink-1)',
          letterSpacing:'-0.015em', fontFamily:'var(--ff-sans)',
          pointerEvents:'none', maxWidth:240,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>
          {category.title}
        </div>
        <button onClick={() => setFilterPanelOpen(true)} aria-label="Ordenar y filtrar" className="mtx-tap" style={{
          width:40, height:40, borderRadius:999, cursor:'pointer',
          border: activeFilterCount > 0 ? '0.5px solid rgba(61,255,209,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
          background: activeFilterCount > 0 ? 'rgba(61,255,209,0.1)' : 'rgba(255,255,255,0.06)',
          color: activeFilterCount > 0 ? 'var(--neon)' : 'var(--ink-1)',
          display:'flex', alignItems:'center', justifyContent:'center',
          position:'relative', zIndex:2,
          boxShadow: activeFilterCount > 0 ? 'inset 0 0 10px rgba(61,255,209,0.08), 0 0 12px rgba(61,255,209,0.18)' : 'none',
          transition:'background .25s, color .25s, box-shadow .25s, border-color .25s',
        }}>
          <SlidersIcon size={18}/>
          {activeFilterCount > 0 && (
            <span style={{
              position:'absolute', top:1, right:1,
              width:14, height:14, padding:0,
              borderRadius:999, background:'var(--neon)',
              color:'#0a1410', fontSize:9, fontWeight:700,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 0 8px var(--neon-glow)', border:'1.5px solid #0a0d0a',
              lineHeight:1, fontVariantNumeric:'tabular-nums',
            }}>{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Subtítulo */}
      <div style={{ padding:'0 22px 18px', textAlign:'center', flexShrink:0 }}>
        <div style={{ fontSize:12.5, color:'var(--ink-3)' }}>
          <span style={{ color:'var(--neon)', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>
            {finalItems.length}
          </span>
          {' '}{finalItems.length === 1 ? 'pieza' : 'piezas'} · {category.sub.toLowerCase()}
        </div>
      </div>

      {/* Grid 2-col */}
      {finalItems.length === 0 ? (
        <div style={{ padding:'48px 28px', textAlign:'center' }}>
          <div style={{
            width:64, height:64, borderRadius:20, margin:'0 auto 14px',
            background:'rgba(255,255,255,0.04)',
            border:'0.5px solid rgba(255,255,255,0.08)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--ink-3)',
          }}>
            <IcSearch size={24} stroke="currentColor" strokeWidth={1.6}/>
          </div>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--ink-1)', marginBottom:4 }}>
            Nada coincide con estos filtros
          </div>
          <div style={{ fontSize:12, color:'var(--ink-3)' }}>
            Prueba con otro orden o tipo de contenido.
          </div>
        </div>
      ) : (
        <div style={{
          display:'grid', gridTemplateColumns:'1fr 1fr',
          gap:10, padding:'0 20px',
        }}>
          {(() => {
            // Phase 5.3.C — Premium gate. En grid de categoría completa,
            // primera FILA (2 items) free, resto locked. ~10-15% accesible.
            const isPremium = (typeof window !== 'undefined' && window.__mtxIsPremium)
              ? window.__mtxIsPremium() : true;
            return finalItems.map((item, i) => (
              <ExploreContentCard
                key={item.id}
                item={item}
                onClick={onItemClick}
                variant="grid"
                locked={!isPremium && i >= 2}
              />
            ));
          })()}
        </div>
      )}

      {portalledFilterPanel}
    </div>
  );
}


// ── ComingSoonSheet — bottom sheet para contenido próximamente ───────────────
function ComingSoonSheet({ item, onClose }) {
  const [notifying, setNotifying] = React.useState(false);
  const [dragY, setDragY]         = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartY  = React.useRef(0);
  const dragActive  = React.useRef(false);
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  const onHandleDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartY.current = e.clientY;
    dragActive.current = true;
    setIsDragging(true);
  };
  const onHandleMove = (e) => {
    if (!dragActive.current) return;
    setDragY(Math.max(0, e.clientY - dragStartY.current));
  };
  const onHandleUp = () => {
    dragActive.current = false;
    setIsDragging(false);
    if (dragY > 110) { onClose(); return; }
    setDragY(0);
  };

  const toggleNotify = () => {
    const next = !notifying;
    setNotifying(next);
    toast.show({
      message: next ? 'Notificación activada' : 'Notificación desactivada',
      duration: 2200,
    });
  };

  if (!item) return null;
  const accent = item.accent || '#FFD66B';

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:120,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)',
      backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.98), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight:'88%', overflowY:'auto',
        paddingBottom:32,
        boxShadow:'0 -20px 60px -12px rgba(0,0,0,0.6)',
        transform:`translateY(${dragY}px)`,
        transition: isDragging ? 'none' : 'transform .35s cubic-bezier(.25,.8,.25,1)',
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <style>{`@keyframes mtxSheetUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

        {/* Drag handle */}
        <div onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp}
          style={{ display:'flex', justifyContent:'center', paddingTop:14, paddingBottom:10, cursor:'grab', touchAction:'none' }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Hero cover */}
        <div style={{
          position:'relative', height:200, margin:'6px 16px 18px',
          borderRadius:22, overflow:'hidden',
          background: item.bg,
          border:`0.5px solid ${accent}33`,
        }}>
          {item.cover && (
            <img src={item.cover} alt="" style={{
              position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'cover',
              opacity:0.45, filter:'saturate(0.95) contrast(1.05)',
            }}/>
          )}
          {/* Gradient bottom */}
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 100%)',
          }}/>
          {/* Color blend */}
          <div style={{
            position:'absolute', inset:0,
            background:`radial-gradient(circle at 80% 20%, ${accent}40, transparent 55%)`,
            mixBlendMode:'screen',
          }}/>

          {/* Close button */}
          <button onClick={onClose} aria-label="Cerrar" className="mtx-tap" style={{
            position:'absolute', top:12, right:12,
            width:36, height:36, borderRadius:999,
            background:'rgba(0,0,0,0.55)',
            backdropFilter:'blur(10px)',
            border:'0.5px solid rgba(255,255,255,0.12)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', cursor:'pointer',
          }}><IcClose size={16} stroke="currentColor"/></button>

          {/* Próximamente badge gradient */}
          <div style={{
            position:'absolute', top:14, left:14,
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'5px 11px', borderRadius:999,
            background:'linear-gradient(135deg, #FFD66B, #ff8b6a)',
            boxShadow:'0 0 14px rgba(255,214,107,0.55)',
            fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
            color:'#0a1410',
          }}>
            <IcSpark size={11} stroke="currentColor" strokeWidth={2.4}/>
            Próximamente
          </div>

          {/* Title block */}
          <div style={{
            position:'absolute', left:18, right:18, bottom:16,
            display:'flex', flexDirection:'column', gap:4,
          }}>
            <div style={{
              fontSize:22, fontWeight:700, color:'#fff',
              letterSpacing:'-0.02em', textShadow:'0 2px 12px rgba(0,0,0,0.6)',
              fontFamily:'var(--ff-display)', lineHeight:1.2,
            }}>
              {item.title}
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.78)', fontWeight:500 }}>
              {item.author}
            </div>
          </div>
        </div>

        {/* Release date pill */}
        <div style={{ padding:'0 20px', marginBottom:18 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'9px 14px 9px 11px', borderRadius:999,
            background:`linear-gradient(180deg, ${accent}1a, ${accent}08)`,
            border:`0.5px solid ${accent}40`,
            color:accent, fontSize:12, fontWeight:600,
            letterSpacing:'-0.005em',
          }}>
            <IcCalendar size={13} stroke="currentColor" strokeWidth={1.8}/>
            <span style={{ color:'var(--ink-3)', fontWeight:500 }}>Lanzamiento:</span>
            <span style={{ color:accent }}>{item.releaseDate || 'Próximamente'}</span>
          </div>
        </div>

        {/* Description */}
        <div style={{ padding:'0 20px', marginBottom:22 }}>
          <div style={{
            fontSize:10, fontWeight:700, letterSpacing:'0.14em',
            textTransform:'uppercase', color:'var(--ink-3)', marginBottom:8,
          }}>Acerca de</div>
          <div style={{
            fontSize:14, lineHeight:1.55, color:'var(--ink-2)',
            textWrap:'pretty',
          }}>{item.desc}</div>

          {/* Meta chips */}
          <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:5,
              padding:'5px 10px', borderRadius:999,
              background:'rgba(255,255,255,0.04)',
              border:'0.5px solid rgba(255,255,255,0.06)',
              fontSize:11, color:'var(--ink-2)', fontWeight:500,
            }}>
              <IcClock size={11} stroke="currentColor"/>
              {item.dur}
            </div>
            {item.episodeCount && (
              <div style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'5px 10px', borderRadius:999,
                background:'rgba(255,255,255,0.04)',
                border:'0.5px solid rgba(255,255,255,0.06)',
                fontSize:11, color:'var(--ink-2)', fontWeight:500,
              }}>
                <IcTarget size={11} stroke="currentColor"/>
                {item.episodeCount} episodios
              </div>
            )}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:5,
              padding:'5px 10px', borderRadius:999,
              background:'rgba(255,255,255,0.04)',
              border:'0.5px solid rgba(255,255,255,0.06)',
              fontSize:11, color:'var(--ink-2)', fontWeight:500,
              textTransform:'capitalize',
            }}>
              {CONTENT_TYPES.find(t => t.id === item.type)?.label || item.type}
            </div>
          </div>
        </div>

        {/* Notify CTA */}
        <div style={{ padding:'0 20px' }}>
          <button onClick={toggleNotify} className="mtx-tap" style={{
            width:'100%', height:56, borderRadius:18, border:0, cursor:'pointer',
            background: notifying
              ? 'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))'
              : 'rgba(61,255,209,0.06)',
            color: notifying ? '#0a1410' : 'var(--neon)',
            fontSize:15, fontWeight:700,
            fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            border: notifying ? 0 : '0.5px solid rgba(61,255,209,0.3)',
            boxShadow: notifying
              ? '0 0 0 1px rgba(61,255,209,0.4), 0 12px 32px -8px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)'
              : 'inset 0 0 12px rgba(61,255,209,0.08)',
            transition:'background .25s ease, color .25s ease, box-shadow .3s ease',
          }}>
            {notifying ? (
              <>
                <IcCheck size={16} stroke="currentColor" strokeWidth={2.4}/>
                Te avisaré cuando esté disponible
              </>
            ) : (
              <>
                <IcBell size={16} stroke="currentColor" strokeWidth={2}/>
                Notificarme al lanzamiento
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div style={{
          marginTop:14, padding:'0 28px',
          fontSize:11, color:'var(--ink-3)', textAlign:'center', lineHeight:1.5,
        }}>
          Cuando se publique, se agregará automáticamente a tu Biblioteca.
        </div>
      </div>
    </div>
  );
}


// ── VideoSheet — bottom sheet de detalle al click en card available ──────────
function VideoSheet({ item, onClose, onPlay, onShare, onSaveToPlaylist, onScheduleForToday }) {
  const [tab, setTab] = React.useState('about');
  const scheduled = useIsScheduled(item?.id);

  if (!item) return null;
  const accent = item.accent || '#3dffd1';
  const chapters = React.useMemo(() => _generateChapters(item), [item.id]);

  const TABS = [
    { id: 'about',    label: 'Acerca de'   },
    { id: 'chapters', label: 'Capítulos'   },
    { id: 'comments', label: 'Comentarios' },
  ];

  const handleSave = () => onSaveToPlaylist?.(item);
  const handleShare = () => onShare?.(item);
  const handleSchedule = () => onScheduleForToday?.(item);

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:130,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.55)',
      backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight:'92%',
        overflowY:'auto', paddingBottom:14,
        boxShadow:'0 -20px 60px -12px rgba(0,0,0,0.6)',
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <style>{`@keyframes mtxSheetUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Hero cover */}
        <div style={{
          position:'relative', height:220, margin:'6px 16px 18px',
          borderRadius:22, overflow:'hidden',
          background: item.bg,
          border:`0.5px solid ${accent}33`,
        }}>
          {item.cover && (
            <img src={item.cover} alt="" style={{
              position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'cover',
              opacity:0.85, filter:'saturate(1.05) contrast(1.05)',
            }}/>
          )}
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 100%)',
          }}/>
          <div style={{
            position:'absolute', inset:0,
            background:`radial-gradient(circle at 80% 20%, ${accent}30, transparent 55%)`,
            mixBlendMode:'screen',
          }}/>

          {/* Top-right cluster: Share + Close */}
          <div style={{ position:'absolute', top:12, right:12, display:'flex', gap:8 }}>
            <button onClick={handleShare} aria-label="Compartir" className="mtx-tap" style={{
              width:36, height:36, borderRadius:999,
              background:'rgba(0,0,0,0.55)',
              backdropFilter:'blur(10px)',
              border:'0.5px solid rgba(255,255,255,0.12)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--ink-1)', cursor:'pointer',
              transition:'background .2s, transform .15s',
            }}><IcShare size={15} stroke="currentColor"/></button>
            <button onClick={onClose} aria-label="Cerrar" className="mtx-tap" style={{
              width:36, height:36, borderRadius:999,
              background:'rgba(0,0,0,0.55)',
              backdropFilter:'blur(10px)',
              border:'0.5px solid rgba(255,255,255,0.12)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--ink-1)', cursor:'pointer',
            }}><IcClose size={16} stroke="currentColor"/></button>
          </div>

          {/* Kind chip */}
          <div style={{
            position:'absolute', top:14, left:14,
            fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase',
            color:accent,
            padding:'5px 10px', borderRadius:999,
            background:'rgba(0,0,0,0.55)',
            backdropFilter:'blur(10px)',
            border:`0.5px solid ${accent}55`,
          }}>{CONTENT_TYPES.find(t => t.id === item.type)?.label || item.type}</div>

          {/* Title block */}
          <div style={{
            position:'absolute', left:18, right:18, bottom:16,
            display:'flex', flexDirection:'column', gap:4,
          }}>
            <div style={{
              fontSize:22, fontWeight:700, color:'#fff',
              letterSpacing:'-0.02em', textShadow:'0 2px 12px rgba(0,0,0,0.6)',
              fontFamily:'var(--ff-display)', lineHeight:1.2,
            }}>
              {item.title}
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.78)', fontWeight:500 }}>
              {item.author}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, padding:'0 20px', marginBottom:16 }}>
          <div className="mtx-glass" style={{ padding:'10px 12px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:2 }}>Duración</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--ink-1)', display:'flex', alignItems:'center', gap:4 }}>
              <IcClock size={11} stroke="currentColor"/>{item.dur}
            </div>
          </div>
          <div className="mtx-glass" style={{ padding:'10px 12px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:2 }}>Rating</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--ink-1)' }}>{item.rating > 0 ? `${item.rating} ★` : '—'}</div>
          </div>
          <div className="mtx-glass" style={{ padding:'10px 12px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:2 }}>Plays</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--ink-1)' }}>{item.plays}</div>
          </div>
        </div>

        {/* Narrator pill */}
        {item.narrator && item.narrator !== '—' && (
          <div style={{ padding:'0 20px', marginBottom:16 }}>
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'10px 14px', borderRadius:14,
              background:'rgba(255,255,255,0.04)',
              border:'0.5px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width:28, height:28, borderRadius:999,
                background:`${accent}22`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color:accent,
              }}>
                <IcMic size={13} stroke="currentColor"/>
              </div>
              <div style={{ fontSize:12, color:'var(--ink-2)', fontWeight:500 }}>{item.narrator}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ padding:'0 20px', marginBottom:14 }}>
          <div style={{ display:'flex', gap:6 }}>
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className="mtx-tap" style={{
                  flex:1, height:38, borderRadius:12, cursor:'pointer',
                  border: active ? '0.5px solid rgba(61,255,209,0.4)' : '0.5px solid rgba(255,255,255,0.06)',
                  background: active ? 'linear-gradient(180deg, rgba(61,255,209,0.14), rgba(61,255,209,0.04))' : 'rgba(255,255,255,0.025)',
                  color: active ? 'var(--neon)' : 'var(--ink-2)',
                  fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:600,
                  letterSpacing:'-0.005em',
                  boxShadow: active ? '0 0 0 1px rgba(61,255,209,0.18), 0 6px 16px -8px rgba(61,255,209,0.4)' : 'none',
                  transition:'background .2s, border-color .2s, color .2s, box-shadow .25s',
                }}>{t.label}</button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding:'0 20px', minHeight:140, marginBottom:18 }}>
          {tab === 'about' && (
            <div style={{ animation:'mtx-fade-up .25s ease both' }}>
              <div style={{ fontSize:14, lineHeight:1.55, color:'var(--ink-2)', textWrap:'pretty', marginBottom:14 }}>
                {item.desc}
              </div>
              {item.tags && item.tags.length > 0 && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {item.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize:10, fontWeight:600, padding:'4px 10px', borderRadius:999,
                      background:'rgba(255,255,255,0.04)',
                      border:'0.5px solid rgba(255,255,255,0.06)',
                      color:'var(--ink-3)', letterSpacing:'0.04em',
                    }}>#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'chapters' && (
            <div style={{ animation:'mtx-fade-up .25s ease both', display:'flex', flexDirection:'column', gap:6 }}>
              {chapters.map((ch, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'11px 14px', borderRadius:12,
                  background:'rgba(255,255,255,0.03)',
                  border:'0.5px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{
                    fontSize:11, fontWeight:700, color:accent, width:18, textAlign:'center',
                    fontVariantNumeric:'tabular-nums',
                  }}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ flex:1, fontSize:13, color:'var(--ink-1)', fontWeight:500 }}>
                    {ch.t}
                  </div>
                  <div style={{ fontSize:11, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
                    {ch.d}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'comments' && (
            <div style={{ animation:'mtx-fade-up .25s ease both', display:'flex', flexDirection:'column', gap:10 }}>
              {_MOCK_COMMENTS.map(c => (
                <div key={c.id} style={{
                  padding:'12px 14px', borderRadius:14,
                  background:'rgba(255,255,255,0.03)',
                  border:'0.5px solid rgba(255,255,255,0.05)',
                  display:'flex', gap:10,
                }}>
                  <div style={{
                    width:32, height:32, borderRadius:999, flexShrink:0,
                    background:`linear-gradient(180deg, ${c.accent}33, ${c.accent}10)`,
                    border:`0.5px solid ${c.accent}40`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:c.accent, fontSize:13, fontWeight:700,
                    fontFamily:'var(--ff-display)',
                  }}>{c.initial}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:3 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--ink-1)' }}>{c.author}</span>
                      <span style={{ fontSize:10, color:'var(--ink-3)' }}>{c.time}</span>
                    </div>
                    <div style={{ fontSize:12.5, color:'var(--ink-2)', lineHeight:1.45 }}>{c.text}</div>
                    <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--ink-3)' }}>
                      <IcHeart size={11} stroke="currentColor"/>
                      <span style={{ fontVariantNumeric:'tabular-nums' }}>{c.likes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTAs */}
        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => onPlay(item)} className="mtx-tap" style={{
            width:'100%', height:54, borderRadius:18, border:0, cursor:'pointer',
            background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
            color:'#0a1410', fontSize:15, fontWeight:700,
            fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 12px 32px -8px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}>
            <IcPlay size={16} stroke="currentColor" strokeWidth={2.4}/>
            Reproducir
          </button>

          {/* Grid 2-cols siempre presente. El primer botón muta de copy/color
              según `scheduled`: "Agendar para hoy" (gris) → "Agendado"
              (neon, no-op) cuando ya está en el ritual. Mantener la misma
              posición y forma evita el shift de layout que confundía al usuario
              con el chip flotante anterior. */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <button
              onClick={scheduled ? undefined : handleSchedule}
              disabled={scheduled}
              aria-label={scheduled ? 'Ya agendado para hoy' : 'Agendar para hoy'}
              className="mtx-tap" style={{
                height:50, borderRadius:14, cursor: scheduled ? 'default' : 'pointer',
                border: scheduled ? '0.5px solid rgba(61,255,209,0.45)' : '0.5px solid var(--glass-stroke)',
                background: scheduled ? 'rgba(61,255,209,0.12)' : 'var(--glass-2)',
                color: scheduled ? 'var(--neon)' : 'var(--ink-1)',
                fontSize:13, fontWeight: scheduled ? 700 : 600, fontFamily:'var(--ff-sans)',
                display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
                transition:'background .25s, color .25s, box-shadow .25s, border-color .25s',
                boxShadow: scheduled ? '0 0 0 1px rgba(61,255,209,0.18) inset' : 'none',
              }}>
              {scheduled
                ? <IcCheck size={14} stroke="currentColor" strokeWidth={2.4}/>
                : <IcCalendar size={14} stroke="currentColor"/>}
              {scheduled ? 'Agendado' : 'Agendar para hoy'}
            </button>
            <button onClick={handleSave} className="mtx-tap" style={{
              height:50, borderRadius:14, cursor:'pointer',
              border:'0.5px solid var(--glass-stroke)',
              background:'var(--glass-2)', color:'var(--ink-1)',
              fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
              transition:'background .2s, color .2s, border-color .2s',
            }}>
              <IcBookmark size={14} stroke="currentColor"/>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── ShareSheet — bottom sheet de compartir ───────────────────────────────────
function ShareSheet({ item, onClose }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  if (!item) return null;
  const accent = item.accent || '#3dffd1';

  const options = [
    { id: 'link',     label: 'Copiar enlace', Ic: IcLink,    accent: '#9b8aff' },
    { id: 'message',  label: 'Mensaje',       Ic: IcMessage, accent: '#5dd3ff' },
    { id: 'whatsapp', label: 'WhatsApp',      Ic: IcSpark,   accent: '#25D366' },
    { id: 'twitter',  label: 'Twitter / X',   Ic: IcTrend,   accent: '#e8e8e8' },
    { id: 'mail',     label: 'Correo',        Ic: IcMail,    accent: '#ffd47a' },
    { id: 'more',     label: 'Más opciones',  Ic: IcChevR,   accent: '#cbd5e1' },
  ];

  const handleSelect = (opt) => {
    if (opt.id === 'link') {
      try {
        if (navigator.clipboard) navigator.clipboard.writeText(`mentex://content/${item.id}`).catch(() => {});
      } catch {}
      toast.show({ message: 'Enlace copiado al portapapeles', duration: 1800 });
    } else {
      toast.show({ message: `Compartiendo en ${opt.label}…`, duration: 1500 });
    }
    setTimeout(onClose, 250);
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:140,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', paddingBottom:28,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <style>{`@keyframes mtxSheetUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'10px 22px 18px', display:'flex', alignItems:'center', gap:14 }}>
          {item.cover && (
            <div style={{
              width:54, height:54, borderRadius:14, flexShrink:0,
              backgroundImage:`url(${item.cover})`, backgroundSize:'cover', backgroundPosition:'center',
              border:`0.5px solid ${accent}40`,
              boxShadow:`0 6px 16px -6px ${accent}55`,
            }}/>
          )}
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', fontWeight:700, marginBottom:3 }}>
              Compartir
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.018em', lineHeight:1.2,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {item.title}
            </div>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>
              {item.author}
            </div>
          </div>
        </div>

        {/* Options grid */}
        <div style={{ padding:'0 22px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {options.map(opt => (
            <button key={opt.id} onClick={() => handleSelect(opt)} className="mtx-tap" style={{
              appearance:'none', cursor:'pointer', textAlign:'left',
              padding:'13px 14px', borderRadius:16,
              border:`0.5px solid ${opt.accent}26`,
              background:`linear-gradient(155deg, ${opt.accent}14 0%, rgba(255,255,255,0.025) 70%)`,
              display:'flex', alignItems:'center', gap:10,
              fontFamily:'var(--ff-sans)',
              transition:'background .2s, border-color .2s',
            }}>
              <div style={{
                width:36, height:36, borderRadius:12,
                background:`linear-gradient(135deg, ${opt.accent}33, ${opt.accent}10)`,
                border:`0.5px solid ${opt.accent}40`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color:opt.accent, flexShrink:0,
              }}>
                <opt.Ic size={15} stroke="currentColor"/>
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--ink-1)', letterSpacing:'-0.005em' }}>
                {opt.label}
              </div>
            </button>
          ))}
        </div>

        {/* Cancel */}
        <div style={{ padding:'18px 22px 0' }}>
          <button onClick={onClose} className="mtx-tap" style={{
            width:'100%', height:48, borderRadius:14, cursor:'pointer',
            border:'0.5px solid var(--glass-stroke)',
            background:'var(--glass-2)', color:'var(--ink-2)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SaveToPlaylistSheet — guardar a playlist con flujo de creación ───────────
const _SAVED_TO_PLAYLISTS_KEY = '__mtxPlaylistSaves';
if (typeof window !== 'undefined' && !window[_SAVED_TO_PLAYLISTS_KEY]) {
  // Map<itemId, Set<playlistId>>
  window[_SAVED_TO_PLAYLISTS_KEY] = {};
}
const _USER_PLAYLISTS_KEY = '__mtxUserPlaylists';
if (typeof window !== 'undefined' && !window[_USER_PLAYLISTS_KEY]) {
  // Default: "Ver más tarde" pinned
  window[_USER_PLAYLISTS_KEY] = [
    { id: 'watch-later', title: 'Ver más tarde', pinned: true, count: 0 },
    { id: 'favoritos',   title: 'Mis favoritos', pinned: false, count: 0 },
  ];
}

function SaveToPlaylistSheet({ item, onClose }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [, force] = React.useReducer(x => x + 1, 0);

  if (!item) return null;
  const accent = item.accent || '#3dffd1';
  const playlists = window[_USER_PLAYLISTS_KEY] || [];
  const saves = window[_SAVED_TO_PLAYLISTS_KEY] || {};
  const itemSaves = new Set(saves[item.id] || []);

  const togglePlaylist = (plId) => {
    if (!saves[item.id]) saves[item.id] = [];
    const idx = saves[item.id].indexOf(plId);
    const pl = playlists.find(p => p.id === plId);
    if (idx >= 0) {
      saves[item.id].splice(idx, 1);
      if (pl) pl.count = Math.max(0, (pl.count || 0) - 1);
      toast.show({ message: `Removido de "${pl?.title || 'playlist'}"`, duration: 1500 });
    } else {
      saves[item.id].push(plId);
      if (pl) pl.count = (pl.count || 0) + 1;
      toast.show({ message: `Guardado en "${pl?.title || 'playlist'}"`, duration: 1500 });
    }
    force();
  };

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = `pl-${Date.now()}`;
    playlists.push({ id, title: trimmed, pinned: false, count: 0 });
    if (!saves[item.id]) saves[item.id] = [];
    saves[item.id].push(id);
    const pl = playlists.find(p => p.id === id);
    if (pl) pl.count = 1;
    toast.show({ message: `Playlist creada con ${item.title}`, duration: 1800 });
    setNewName('');
    setCreating(false);
    force();
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:140,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight:'85%', overflowY:'auto', paddingBottom:24,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'10px 22px 16px' }}>
          <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', fontWeight:700, marginBottom:4 }}>
            Guardar en…
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', lineHeight:1.2,
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {item.title}
          </div>
        </div>

        {/* Playlist list */}
        <div style={{ padding:'0 18px', display:'flex', flexDirection:'column', gap:6 }}>
          {playlists.map(pl => {
            const checked = itemSaves.has(pl.id);
            return (
              <button key={pl.id} onClick={() => togglePlaylist(pl.id)} className="mtx-tap" style={{
                appearance:'none', cursor:'pointer', textAlign:'left',
                padding:'12px 14px', borderRadius:14,
                border: checked ? `0.5px solid ${accent}55` : '0.5px solid rgba(255,255,255,0.06)',
                background: checked ? `linear-gradient(180deg, ${accent}14, ${accent}04)` : 'rgba(255,255,255,0.025)',
                display:'flex', alignItems:'center', gap:12,
                fontFamily:'var(--ff-sans)',
                transition:'background .2s, border-color .2s',
              }}>
                <div style={{
                  width:38, height:38, borderRadius:11, flexShrink:0,
                  background: pl.pinned
                    ? `linear-gradient(135deg, ${accent}33, ${accent}0c)`
                    : 'rgba(255,255,255,0.05)',
                  border: pl.pinned ? `0.5px solid ${accent}40` : '0.5px solid rgba(255,255,255,0.05)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: pl.pinned ? accent : 'var(--ink-2)',
                }}>
                  {pl.pinned ? <IcClock size={15} stroke="currentColor"/> : <IcList size={15} stroke="currentColor"/>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--ink-1)', letterSpacing:'-0.01em' }}>
                    {pl.title}
                  </div>
                  <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1 }}>
                    {pl.count || 0} {pl.count === 1 ? 'item' : 'items'}{pl.pinned && ' · siempre visible'}
                  </div>
                </div>
                {/* Checkmark indicator */}
                <div style={{
                  width:22, height:22, borderRadius:'50%',
                  border: checked ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.22)',
                  background: checked ? accent : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: '#0a1410', flexShrink:0,
                  boxShadow: checked ? `0 0 10px ${accent}66` : 'none',
                  transition:'background .15s, border-color .15s, box-shadow .2s',
                }}>
                  {checked && <IcCheck size={12} stroke="currentColor" strokeWidth={3}/>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Create new playlist */}
        <div style={{ padding:'14px 18px 6px' }}>
          {creating ? (
            <div style={{
              padding:'14px', borderRadius:16,
              background:'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
              border:'0.5px solid rgba(255,255,255,0.08)',
              boxShadow:'inset 0 1px 0 rgba(255,255,255,0.04)',
              display:'flex', flexDirection:'column', gap:14,
              animation:'mtx-fade-up .2s ease',
            }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  width:30, height:30, borderRadius:10,
                  background:'linear-gradient(135deg, rgba(61,255,209,0.22), rgba(61,255,209,0.06))',
                  border:'0.5px solid rgba(61,255,209,0.35)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'var(--neon)', flexShrink:0,
                  boxShadow:'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 12px rgba(61,255,209,0.18)',
                }}>
                  <IcSparkles size={14} stroke="currentColor"/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--neon)', letterSpacing:'0.16em', fontWeight:700, marginBottom:2 }}>
                    Nueva playlist
                  </div>
                  <div style={{ fontSize:12, color:'var(--ink-3)', letterSpacing:'-0.005em' }}>
                    Será privada por defecto
                  </div>
                </div>
              </div>

              {/* Input */}
              <input
                ref={el => { if (el && document.activeElement !== el) setTimeout(() => el.focus({ preventScroll: true }), 100); }}
                type="text"
                placeholder="Da nombre a tu colección…"
                value={newName}
                maxLength={50}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
                style={{
                  appearance:'none', width:'100%', minWidth:0, boxSizing:'border-box',
                  padding:'13px 14px', borderRadius:12,
                  background:'rgba(0,0,0,0.32)',
                  border: newName.trim() ? '0.5px solid rgba(61,255,209,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
                  color:'var(--ink-1)', fontSize:14, fontWeight:500,
                  fontFamily:'var(--ff-sans)', outline:'none',
                  letterSpacing:'-0.005em',
                  boxShadow: newName.trim()
                    ? 'inset 0 0 0 1px rgba(61,255,209,0.18), 0 0 0 3px rgba(61,255,209,0.06)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  transition:'border-color .2s, box-shadow .25s',
                }}
              />

              {/* Footer: hint + actions */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <div style={{ fontSize:10.5, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums', flexShrink:0 }}>
                  {newName.length}/50
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { setCreating(false); setNewName(''); }} className="mtx-tap" style={{
                    height:40, padding:'0 16px', borderRadius:11, cursor:'pointer',
                    border:'0.5px solid rgba(255,255,255,0.08)',
                    background:'transparent',
                    color:'var(--ink-2)', fontSize:12.5, fontWeight:600,
                    fontFamily:'var(--ff-sans)', letterSpacing:'-0.005em',
                    transition:'background .15s, color .15s, border-color .15s',
                  }}>Cancelar</button>
                  <button onClick={handleCreate} disabled={!newName.trim()} className="mtx-tap" style={{
                    height:40, padding:'0 18px', borderRadius:11,
                    cursor: newName.trim() ? 'pointer' : 'not-allowed',
                    border:0,
                    background: newName.trim()
                      ? 'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))'
                      : 'rgba(255,255,255,0.06)',
                    color: newName.trim() ? '#0a1410' : 'var(--ink-3)',
                    fontSize:12.5, fontWeight:700, fontFamily:'var(--ff-sans)',
                    letterSpacing:'-0.005em',
                    boxShadow: newName.trim()
                      ? '0 0 0 1px rgba(61,255,209,0.4), 0 8px 20px -6px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)'
                      : 'none',
                    display:'inline-flex', alignItems:'center', gap:6,
                    transition:'background .2s, box-shadow .25s',
                  }}>
                    <IcPlus size={12} stroke="currentColor" strokeWidth={2.4}/>
                    Crear playlist
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setCreating(true)} className="mtx-tap" style={{
              width:'100%', padding:'14px', borderRadius:14, cursor:'pointer',
              border:'0.5px dashed rgba(255,255,255,0.18)',
              background:'rgba(255,255,255,0.025)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              color:'var(--ink-2)', fontSize:13, fontWeight:600,
              fontFamily:'var(--ff-sans)',
              transition:'background .2s, border-color .2s, color .2s',
            }}>
              <IcPlus size={14} stroke="currentColor"/>
              Nueva playlist
            </button>
          )}
        </div>

        {/* Done */}
        <div style={{ padding:'8px 18px 0' }}>
          <button onClick={onClose} className="mtx-tap" style={{
            width:'100%', height:48, borderRadius:14, cursor:'pointer',
            border:'0.5px solid var(--glass-stroke)',
            background:'var(--glass-2)', color:'var(--ink-1)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CreatePlaylistSheet — crear playlist standalone (sin item asociado) ──────
function CreatePlaylistSheet({ onClose, onCreated }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const [newName, setNewName] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    // preventScroll evita que el viewport del IOSDevice scrollee al hacer focus
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 320);
    return () => clearTimeout(t);
  }, []);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const playlists = window[_USER_PLAYLISTS_KEY] || [];
    const id = `pl-${Date.now()}`;
    playlists.push({ id, title: trimmed, pinned: false, count: 0 });
    toast.show({ message: `Playlist "${trimmed}" creada`, duration: 2000 });
    onCreated?.({ id, title: trimmed });
    setTimeout(onClose, 200);
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:140,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', paddingBottom:24,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header iconográfico */}
        <div style={{ padding:'14px 22px 18px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:44, height:44, borderRadius:14,
            background:'linear-gradient(135deg, rgba(61,255,209,0.22), rgba(61,255,209,0.06))',
            border:'0.5px solid rgba(61,255,209,0.35)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--neon)', flexShrink:0,
            boxShadow:'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 16px rgba(61,255,209,0.2)',
          }}>
            <IcSparkles size={18} stroke="currentColor"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--neon)', letterSpacing:'0.16em', fontWeight:700, marginBottom:3 }}>
              Nueva playlist
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', lineHeight:1.15 }}>
              Crea tu colección
            </div>
            <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:2, letterSpacing:'-0.005em' }}>
              Será privada por defecto
            </div>
          </div>
        </div>

        {/* Input */}
        <div style={{ padding:'0 22px' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Da nombre a tu colección…"
            value={newName}
            maxLength={50}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') onClose(); }}
            style={{
              appearance:'none', width:'100%', minWidth:0, boxSizing:'border-box',
              padding:'14px 16px', borderRadius:14,
              background:'rgba(0,0,0,0.32)',
              border: newName.trim() ? '0.5px solid rgba(61,255,209,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
              color:'var(--ink-1)', fontSize:15, fontWeight:500,
              fontFamily:'var(--ff-sans)', outline:'none',
              letterSpacing:'-0.005em',
              boxShadow: newName.trim()
                ? 'inset 0 0 0 1px rgba(61,255,209,0.18), 0 0 0 3px rgba(61,255,209,0.06)'
                : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              transition:'border-color .2s, box-shadow .25s',
            }}
          />
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:6,
                        fontSize:10.5, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums', letterSpacing:'0.02em' }}>
            {newName.length}/50
          </div>
        </div>

        {/* CTAs */}
        <div style={{ padding:'14px 22px 0', display:'flex', gap:10 }}>
          <button onClick={onClose} className="mtx-tap" style={{
            flex:1, height:50, borderRadius:14, cursor:'pointer',
            border:'0.5px solid var(--glass-stroke)',
            background:'var(--glass-2)', color:'var(--ink-2)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
            letterSpacing:'-0.005em',
          }}>
            Cancelar
          </button>
          <button onClick={handleCreate} disabled={!newName.trim()} className="mtx-tap" style={{
            flex:1.5, height:50, borderRadius:14,
            cursor: newName.trim() ? 'pointer' : 'not-allowed',
            border:0,
            background: newName.trim()
              ? 'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))'
              : 'rgba(255,255,255,0.06)',
            color: newName.trim() ? '#0a1410' : 'var(--ink-3)',
            fontSize:14, fontWeight:700, fontFamily:'var(--ff-sans)',
            letterSpacing:'-0.005em',
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
            boxShadow: newName.trim()
              ? '0 0 0 1px rgba(61,255,209,0.4), 0 12px 28px -8px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)'
              : 'none',
            transition:'background .25s, box-shadow .3s',
          }}>
            <IcPlus size={14} stroke="currentColor" strokeWidth={2.4}/>
            Crear playlist
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ScheduleTodaySheet — agendar contenido al ritual de hoy ──────────────────
function ScheduleTodaySheet({ item, onClose }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const scheduled = useIsScheduled(item?.id);

  if (!item) return null;
  const accent = item.accent || '#3dffd1';
  const kindLabel = CONTENT_TYPES.find(t => t.id === item.type)?.label || item.type;
  const totalSec = _parseDuration(item.dur);

  const handleAdd = () => {
    const ok = window.__mtxRitual?.add({
      id: item.id,
      title: item.title,
      kind: kindLabel,
      dur: item.dur,
      totalSec,
      accent,
      cover: item.cover,
      type: item.type,
    });
    if (ok) toast.show({ message: 'Añadido a tu ritual de hoy', duration: 2000 });
    setTimeout(onClose, 250);
  };
  const handleRemove = () => {
    window.__mtxRitual?.remove(item.id);
    toast.show({ message: 'Removido de tu ritual', duration: 1800 });
    setTimeout(onClose, 250);
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:140,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', paddingBottom:24,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Hero header */}
        <div style={{ padding:'14px 22px 18px' }}>
          <div style={{
            position:'relative', borderRadius:18, overflow:'hidden',
            border:`0.5px solid ${accent}33`,
            background: item.bg || `linear-gradient(135deg, ${accent}22, ${accent}06)`,
            padding:'18px 18px 16px',
          }}>
            {item.cover && (
              <div style={{
                position:'absolute', inset:0,
                backgroundImage:`url(${item.cover})`, backgroundSize:'cover', backgroundPosition:'center',
                opacity:0.25, filter:'saturate(1.1)',
              }}/>
            )}
            <div style={{
              position:'absolute', inset:0,
              background:`radial-gradient(circle at 80% 0%, ${accent}33, transparent 55%)`,
            }}/>
            <div style={{ position:'relative', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{
                width:54, height:54, borderRadius:14,
                backgroundImage: item.cover ? `url(${item.cover})` : 'none',
                backgroundSize:'cover', backgroundPosition:'center',
                background: item.cover ? undefined : `linear-gradient(135deg, ${accent}55, ${accent}11)`,
                border:`0.5px solid ${accent}55`,
                boxShadow:`0 8px 22px -8px ${accent}66`,
                flexShrink:0,
              }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{
                  fontSize:9, fontWeight:700, color:accent,
                  letterSpacing:'0.16em', textTransform:'uppercase', marginBottom:3,
                }}>
                  {kindLabel}
                </div>
                <div style={{
                  fontSize:15, fontWeight:700, color:'#fff',
                  letterSpacing:'-0.018em', lineHeight:1.2,
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                }}>
                  {item.title}
                </div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', marginTop:2,
                              display:'flex', alignItems:'center', gap:5 }}>
                  <IcClock size={10} stroke="currentColor"/>
                  {item.dur}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Question + body */}
        <div style={{ padding:'0 22px 22px' }}>
          <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--neon)', letterSpacing:'0.16em', fontWeight:700, marginBottom:6 }}>
            Ritual de hoy
          </div>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', marginBottom:8, lineHeight:1.2 }}>
            {scheduled ? 'Ya está en tu ritual' : 'Súmalo a tu ritual de hoy'}
          </div>
          <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.5, textWrap:'pretty' }}>
            {scheduled
              ? 'Lo verás en la sección "Tu ritual de hoy" cuando inicies tu sesión de enfoque. Puedes quitarlo si cambias de idea.'
              : 'Aparecerá en "Tu ritual de hoy" del Home cuando inicies tu sesión de enfoque. Esta es tu intención de hoy.'}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ padding:'0 22px', display:'flex', flexDirection:'column', gap:10 }}>
          {scheduled ? (
            <>
              <button onClick={handleRemove} className="mtx-tap" style={{
                width:'100%', height:52, borderRadius:16, border:0, cursor:'pointer',
                background:'linear-gradient(180deg, rgba(255,140,140,0.18), rgba(255,140,140,0.06))',
                border:'0.5px solid rgba(255,140,140,0.3)',
                color:'#ffb0b0', fontSize:14, fontWeight:600,
                fontFamily:'var(--ff-sans)', letterSpacing:'-0.005em',
                display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
              }}>
                <IcClose size={14} stroke="currentColor" strokeWidth={2}/>
                Quitar de mi ritual
              </button>
              <button onClick={onClose} className="mtx-tap" style={{
                width:'100%', height:48, borderRadius:14, cursor:'pointer',
                border:'0.5px solid var(--glass-stroke)',
                background:'var(--glass-2)', color:'var(--ink-1)',
                fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
              }}>
                Mantener en ritual
              </button>
            </>
          ) : (
            <>
              <button onClick={handleAdd} className="mtx-tap" style={{
                width:'100%', height:54, borderRadius:18, border:0, cursor:'pointer',
                background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
                color:'#0a1410', fontSize:15, fontWeight:700,
                fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 12px 32px -8px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
              }}>
                <IcCalendar size={15} stroke="currentColor" strokeWidth={2}/>
                Agendar para hoy
              </button>
              <button onClick={onClose} className="mtx-tap" style={{
                width:'100%', height:48, borderRadius:14, cursor:'pointer',
                border:'0.5px solid var(--glass-stroke)',
                background:'var(--glass-2)', color:'var(--ink-2)',
                fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
              }}>
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Bookmarks store (per-item timestamps) ────────────────────────────────────
if (typeof window !== 'undefined' && !window.__mtxBookmarks) {
  window.__mtxBookmarks = {}; // { [itemId]: [{ sec, savedAt }] }
}

// ── Reviews store (alimenta perfil + futura comunidad) ───────────────────────
const _REVIEWS_EVENT = 'mtx:reviews-changed';
if (typeof window !== 'undefined' && !window.__mtxReviews) {
  // Mock seed: 3 reseñas pre-pobladas del usuario actual (se eliminan si user las borra)
  let _reviews = [
    {
      id: 'rv-mock-me-1',
      itemId: 'c-habitos',
      itemTitle: 'Hábitos Atómicos',
      itemAuthor: 'James Clear',
      itemCover: 'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=600&q=80',
      itemAccent: '#3dffd1',
      rating: 5,
      text: 'La idea que más me marcó: los hábitos no son lo que haces, son votos a la persona en la que te estás convirtiendo. Cambia el sujeto, cambia la conducta.',
      template: 'Idea valiosa',
      isPublic: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, // hace 2 días
    },
    {
      id: 'rv-mock-me-2',
      itemId: 'c-deepwork',
      itemTitle: 'Deep Work',
      itemAuthor: 'Cal Newport',
      itemCover: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&q=80',
      itemAccent: '#c8a8ff',
      rating: 4,
      text: 'Me hizo pensar en cuánto interrumpo mi propio enfoque. Implementé el shutdown ritual y mi sueño cambió. La concentración profunda es un superpoder escaso.',
      template: 'Reflexión',
      isPublic: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5, // hace 5 días
    },
    {
      id: 'rv-mock-me-3',
      itemId: 'c-poder-ahora',
      itemTitle: 'El poder del ahora',
      itemAuthor: 'Eckhart Tolle',
      itemCover: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=80',
      itemAccent: '#7dffe0',
      rating: 5,
      text: 'Lo recomendaría a quien viva en su cabeza más que en su cuerpo. Algunas partes son lentas, pero la idea central de habitar el presente es transformadora.',
      template: 'Recomendado',
      isPublic: false,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 9, // hace 9 días
    },
  ];
  window.__mtxReviews = {
    list: () => _reviews.slice(),
    forItem: (itemId) => _reviews.filter(r => r.itemId === itemId),
    add: (review) => {
      const entry = { ...review, id: `rv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() };
      _reviews = [entry, ..._reviews];
      window.dispatchEvent(new CustomEvent(_REVIEWS_EVENT, { detail: entry }));
      return entry;
    },
    remove: (id) => {
      const next = _reviews.filter(r => r.id !== id);
      if (next.length === _reviews.length) return false;
      _reviews = next;
      window.dispatchEvent(new CustomEvent(_REVIEWS_EVENT));
      return true;
    },
  };
}

// ── Puntos: tiempo invertido × multiplicador + bonus de completado ───────────
const _calculateEarnedPoints = (item) => {
  const minutes = Math.max(1, Math.floor(_parseDuration(item?.dur) / 60));
  const base = Math.round(minutes * 1.8);
  const completionBonus = 12;
  return Math.max(15, base + completionBonus);
};

// ── Speed cycles for playback control ────────────────────────────────────────
const _SPEED_CYCLE = [1, 1.25, 1.5, 2, 0.75];
const _formatSpeed = (s) => (s === 1 ? '1.0x' : s === 0.75 ? '0.75x' : s === 1.25 ? '1.25x' : s === 1.5 ? '1.5x' : '2.0x');

// ── SleepTimerSheet — selector de duración para apagar reproducción ──────────
function SleepTimerSheet({ activeSec, onClose, onPick, onCancel }) {
  const accent = '#9b8aff'; // sleep tone — calm purple

  const options = [
    { sec: 5 * 60,  label: '5 min',  desc: 'Power nap' },
    { sec: 10 * 60, label: '10 min', desc: 'Sesión corta' },
    { sec: 15 * 60, label: '15 min', desc: 'Antes de dormir' },
    { sec: 30 * 60, label: '30 min', desc: 'Descanso medio' },
    { sec: 45 * 60, label: '45 min', desc: 'Sesión enfocada' },
    { sec: 60 * 60, label: '1 hora', desc: 'Sueño profundo' },
  ];

  const handlePick = (sec) => {
    onPick?.(sec);
    setTimeout(onClose, 200);
  };
  const handleCancel = () => {
    onCancel?.();
    setTimeout(onClose, 200);
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:170,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', paddingBottom:28,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <style>{`@keyframes mtxSheetUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'10px 22px 18px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:44, height:44, borderRadius:14,
            background:`linear-gradient(135deg, ${accent}33, ${accent}0a)`,
            border:`0.5px solid ${accent}55`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: accent, flexShrink:0,
            boxShadow:`inset 0 1px 0 rgba(255,255,255,0.1), 0 0 16px ${accent}22`,
          }}>
            <IcMoon size={18} stroke="currentColor" strokeWidth={1.6}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', fontWeight:700, marginBottom:3 }}>
              Temporizador
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', lineHeight:1.15 }}>
              {activeSec ? 'Cambiar duración' : 'Apagar al terminar'}
            </div>
            <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:2 }}>
              La reproducción se pausará al cumplirse el tiempo
            </div>
          </div>
        </div>

        {/* Options grid */}
        <div style={{ padding:'0 18px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {options.map(opt => {
            const isActive = activeSec && Math.abs(activeSec - opt.sec) < 60;
            return (
              <button key={opt.sec} onClick={() => handlePick(opt.sec)} className="mtx-tap" style={{
                appearance:'none', cursor:'pointer', textAlign:'left',
                padding:'12px 14px', borderRadius:14,
                border: isActive ? `0.5px solid ${accent}55` : '0.5px solid rgba(255,255,255,0.06)',
                background: isActive ? `linear-gradient(180deg, ${accent}18, ${accent}05)` : 'rgba(255,255,255,0.025)',
                display:'flex', flexDirection:'column', gap:2,
                fontFamily:'var(--ff-sans)',
                transition:'background .18s, border-color .18s',
              }}>
                <div style={{ fontSize:14, fontWeight:700, color: isActive ? accent : 'var(--ink-1)', letterSpacing:'-0.015em',
                              fontVariantNumeric:'tabular-nums' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize:10.5, color:'var(--ink-3)', letterSpacing:'-0.005em' }}>
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Cancel timer if active */}
        {activeSec ? (
          <div style={{ padding:'14px 18px 0' }}>
            <button onClick={handleCancel} className="mtx-tap" style={{
              width:'100%', height:48, borderRadius:14, cursor:'pointer',
              border:'0.5px solid rgba(255,140,140,0.2)',
              background:'rgba(255,140,140,0.06)',
              color:'#ffb0b0',
              fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
            }}>
              <IcClose size={13} stroke="currentColor" strokeWidth={2.2}/>
              Cancelar temporizador
            </button>
          </div>
        ) : (
          <div style={{ padding:'14px 18px 0' }}>
            <button onClick={onClose} className="mtx-tap" style={{
              width:'100%', height:48, borderRadius:14, cursor:'pointer',
              border:'0.5px solid var(--glass-stroke)',
              background:'var(--glass-2)', color:'var(--ink-2)',
              fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
            }}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── SkipDurationSheet — calibrar segundos de salto adelante/atrás ────────────
const _SKIP_OPTIONS = [5, 10, 15, 30];

function SkipDurationSheet({ activeSec = 15, onClose, onPick }) {
  const accent = '#3dffd1';
  const handlePick = (sec) => {
    onPick?.(sec);
    setTimeout(onClose, 200);
  };
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:170,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)', borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', paddingBottom:28,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <style>{`@keyframes mtxSheetUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'10px 22px 18px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:44, height:44, borderRadius:14,
            background:`linear-gradient(135deg, ${accent}33, ${accent}0a)`,
            border:`0.5px solid ${accent}55`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: accent, flexShrink:0,
            boxShadow:`inset 0 1px 0 rgba(255,255,255,0.1), 0 0 16px ${accent}22`,
          }}>
            <IcSkipForward size={20} stroke="currentColor" strokeWidth={1.8} seconds={activeSec}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', fontWeight:700, marginBottom:3 }}>
              Saltos
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', lineHeight:1.15 }}>
              Calibra tus saltos
            </div>
            <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:2 }}>
              Aplica a los botones ◀ y ▶ del reproductor
            </div>
          </div>
        </div>

        {/* Options grid */}
        <div style={{ padding:'0 18px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {_SKIP_OPTIONS.map(sec => {
            const isActive = activeSec === sec;
            return (
              <button key={sec} onClick={() => handlePick(sec)} className="mtx-tap" style={{
                appearance:'none', cursor:'pointer', textAlign:'left',
                padding:'14px 16px', borderRadius:14,
                border: isActive ? `0.5px solid ${accent}55` : '0.5px solid rgba(255,255,255,0.06)',
                background: isActive ? `linear-gradient(180deg, ${accent}18, ${accent}05)` : 'rgba(255,255,255,0.025)',
                display:'flex', alignItems:'center', gap:10,
                fontFamily:'var(--ff-sans)',
                transition:'background .18s, border-color .18s',
              }}>
                <div style={{
                  width:32, height:32, borderRadius:9,
                  background: isActive ? `${accent}22` : 'rgba(255,255,255,0.04)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: isActive ? accent : 'var(--ink-2)',
                  flexShrink:0,
                }}>
                  <IcSkipForward size={16} stroke="currentColor" strokeWidth={1.8} seconds={sec}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:700, color: isActive ? accent : 'var(--ink-1)', letterSpacing:'-0.015em', fontVariantNumeric:'tabular-nums' }}>
                    {sec} seg
                  </div>
                  <div style={{ fontSize:10.5, color:'var(--ink-3)', marginTop:1, letterSpacing:'-0.005em' }}>
                    {sec === 5 ? 'Preciso' : sec === 10 ? 'Estándar' : sec === 15 ? 'Recomendado' : 'Rápido'}
                  </div>
                </div>
                {isActive && (
                  <div style={{
                    width:18, height:18, borderRadius:'50%', background: accent,
                    display:'flex', alignItems:'center', justifyContent:'center', color:'#0a1410',
                  }}>
                    <IcCheck size={11} stroke="currentColor" strokeWidth={3}/>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ padding:'14px 18px 0' }}>
          <button onClick={onClose} className="mtx-tap" style={{
            width:'100%', height:48, borderRadius:14, cursor:'pointer',
            border:'0.5px solid var(--glass-stroke)',
            background:'var(--glass-2)', color:'var(--ink-2)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── BookmarkNameSheet — captura el nombre del marcador antes de guardar ─────
function BookmarkNameSheet({ item, currentSec, defaultName, onClose, onSave }) {
  const [name, setName] = React.useState(defaultName || '');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
        inputRef.current.select();
      }
    }, 320);
    return () => clearTimeout(t);
  }, []);

  if (!item) return null;
  const accent = item.accent || '#3dffd1';

  const handleSave = () => {
    const finalName = name.trim() || defaultName || 'Marcador';
    onSave?.(finalName);
    setTimeout(onClose, 200);
  };

  const SUGGESTIONS = [
    { label: 'Idea clave',        emoji: '💡' },
    { label: 'Volver aquí',       emoji: '🎯' },
    { label: 'Cita inspiradora',  emoji: '⭐' },
    { label: 'Pendiente',         emoji: '📌' },
  ];

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:175,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)', borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', paddingBottom:24,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'14px 22px 18px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:44, height:44, borderRadius:14,
            background:`linear-gradient(135deg, ${accent}33, ${accent}0a)`,
            border:`0.5px solid ${accent}55`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: accent, flexShrink:0,
            boxShadow:`inset 0 1px 0 rgba(255,255,255,0.1), 0 0 16px ${accent}22`,
          }}>
            <IcBookmarkFill size={18} stroke="currentColor"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', fontWeight:700, marginBottom:3 }}>
              Nuevo marcador
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', lineHeight:1.15 }}>
              ¿Qué quieres recordar?
            </div>
            <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:2, fontVariantNumeric:'tabular-nums', letterSpacing:'-0.005em' }}>
              Posición {_formatTime(currentSec || 0)}
            </div>
          </div>
        </div>

        {/* Input */}
        <div style={{ padding:'0 22px', marginBottom:10 }}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            maxLength={40}
            placeholder="Nombre del marcador…"
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
            style={{
              appearance:'none', width:'100%', minWidth:0, boxSizing:'border-box',
              padding:'14px 16px', borderRadius:14,
              background:'rgba(0,0,0,0.32)',
              border: name.trim() ? `0.5px solid ${accent}45` : '0.5px solid rgba(255,255,255,0.08)',
              color:'var(--ink-1)', fontSize:15, fontWeight:500,
              fontFamily:'var(--ff-sans)', outline:'none', letterSpacing:'-0.005em',
              boxShadow: name.trim()
                ? `inset 0 0 0 1px ${accent}24, 0 0 0 3px ${accent}10`
                : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              transition:'border-color .2s, box-shadow .25s',
            }}
          />
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:5,
                        fontSize:10, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
            {name.length}/40
          </div>
        </div>

        {/* Quick-pick suggestions */}
        <div style={{ padding:'4px 22px 16px' }}>
          <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', fontWeight:700, marginBottom:8 }}>
            Sugerencias
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {SUGGESTIONS.map(s => {
              const isActive = name.trim() === s.label;
              return (
                <button key={s.label} onClick={() => setName(s.label)} className="mtx-tap" style={{
                  appearance:'none', cursor:'pointer',
                  display:'inline-flex', alignItems:'center', gap:6,
                  padding:'7px 12px', borderRadius:999,
                  border: isActive ? `0.5px solid ${accent}55` : '0.5px solid rgba(255,255,255,0.08)',
                  background: isActive ? `linear-gradient(180deg, ${accent}1c, ${accent}06)` : 'rgba(255,255,255,0.035)',
                  color: isActive ? accent : 'var(--ink-2)',
                  fontFamily:'var(--ff-sans)',
                  fontSize:11.5, fontWeight:600, letterSpacing:'-0.005em',
                  transition:'background .15s, border-color .15s, color .15s',
                }}>
                  <span style={{ fontSize:12 }}>{s.emoji}</span>
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ padding:'0 22px', display:'flex', gap:10 }}>
          <button onClick={onClose} className="mtx-tap" style={{
            flex:1, height:50, borderRadius:14, cursor:'pointer',
            border:'0.5px solid var(--glass-stroke)',
            background:'var(--glass-2)', color:'var(--ink-2)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} className="mtx-tap" style={{
            flex:1.5, height:50, borderRadius:14, cursor:'pointer', border:0,
            background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
            color:'#0a1410', fontSize:14, fontWeight:700,
            fontFamily:'var(--ff-sans)', letterSpacing:'-0.005em',
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
            boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 12px 28px -8px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}>
            <IcBookmarkFill size={13} stroke="currentColor"/>
            Guardar marcador
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BookmarksSheet — lista de marcadores guardados con ir-a / eliminar ───────
function BookmarksSheet({ item, currentSec, onClose, onJumpTo, onRequestSave }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const [, force] = React.useReducer(x => x + 1, 0);
  if (!item) return null;
  const accent = item.accent || '#3dffd1';
  const all = (window.__mtxBookmarks[item.id] || []).slice().sort((a, b) => a.sec - b.sec);

  const handleRemove = (sec) => {
    window.__mtxBookmarks[item.id] = (window.__mtxBookmarks[item.id] || []).filter(b => b.sec !== sec);
    if (window.__mtxBookmarks[item.id].length === 0) delete window.__mtxBookmarks[item.id];
    toast.show({ message: 'Marcador eliminado', duration: 1500 });
    force();
  };
  const handleSaveCurrent = () => {
    // Delegar al padre para abrir BookmarkNameSheet con el nombre
    onRequestSave?.();
  };
  const handleJump = (sec) => {
    onJumpTo?.(sec);
    setTimeout(onClose, 200);
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:170,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)', borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight:'86%', overflowY:'auto', paddingBottom:24,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'10px 22px 14px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:44, height:44, borderRadius:14,
            background:`linear-gradient(135deg, ${accent}33, ${accent}0a)`,
            border:`0.5px solid ${accent}55`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: accent, flexShrink:0,
            boxShadow:`inset 0 1px 0 rgba(255,255,255,0.1), 0 0 16px ${accent}22`,
          }}>
            <IcBookmarkFill size={18} stroke="currentColor"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', fontWeight:700, marginBottom:3 }}>
              Marcadores · {all.length}
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.018em', lineHeight:1.18,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {item.title}
            </div>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2, letterSpacing:'-0.005em' }}>
              Tap para saltar al momento
            </div>
          </div>
        </div>

        {/* Save current CTA */}
        <div style={{ padding:'0 18px 12px' }}>
          <button onClick={handleSaveCurrent} className="mtx-tap" style={{
            width:'100%', minWidth:0, boxSizing:'border-box',
            padding:'12px 14px', borderRadius:14, cursor:'pointer',
            border:'1px dashed rgba(61,255,209,0.34)',
            background:'linear-gradient(165deg, rgba(61,255,209,0.05), rgba(61,255,209,0.012) 70%)',
            display:'flex', alignItems:'center', gap:11,
            fontFamily:'var(--ff-sans)',
            boxShadow:'inset 0 0 18px rgba(61,255,209,0.04)',
          }}>
            <div style={{
              width:36, height:36, borderRadius:10, flexShrink:0,
              background:'linear-gradient(135deg, rgba(61,255,209,0.26), rgba(61,255,209,0.06))',
              border:'0.5px solid rgba(61,255,209,0.45)',
              display:'flex', alignItems:'center', justifyContent:'center', color:'var(--neon)',
              boxShadow:'0 0 14px rgba(61,255,209,0.18), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}>
              <IcPlus size={15} stroke="currentColor" strokeWidth={2.4}/>
            </div>
            <div style={{ flex:1, minWidth:0, textAlign:'left' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--neon)', letterSpacing:'-0.005em' }}>
                Guardar momento actual
              </div>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1, fontVariantNumeric:'tabular-nums' }}>
                Posición {_formatTime(currentSec || 0)}
              </div>
            </div>
          </button>
        </div>

        {/* List */}
        <div style={{ padding:'0 18px' }}>
          {all.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center' }}>
              <div style={{ fontSize:13, color:'var(--ink-2)', fontWeight:600, marginBottom:6 }}>
                Aún no tienes marcadores
              </div>
              <div style={{ fontSize:11.5, color:'var(--ink-3)', maxWidth:260, margin:'0 auto', lineHeight:1.5 }}>
                Guarda momentos importantes para volver a ellos en un tap.
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {all.map((b, i) => {
                const displayName = b.name || `Marcador ${String(i + 1).padStart(2, '0')}`;
                return (
                  <div key={b.sec} style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'10px 12px', borderRadius:14,
                    background:'rgba(255,255,255,0.025)',
                    border:'0.5px solid rgba(255,255,255,0.06)',
                    fontFamily:'var(--ff-sans)',
                  }}>
                    <div style={{
                      width:36, height:36, borderRadius:10, flexShrink:0,
                      background:`linear-gradient(135deg, ${accent}26, ${accent}06)`,
                      border:`0.5px solid ${accent}40`,
                      display:'flex', alignItems:'center', justifyContent:'center', color: accent,
                    }}>
                      <IcBookmarkFill size={13} stroke="currentColor"/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:13.5, fontWeight:700, color:'var(--ink-1)',
                        letterSpacing:'-0.005em', lineHeight:1.18,
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                      }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize:11, color: accent, marginTop:1, fontVariantNumeric:'tabular-nums', fontWeight:600, letterSpacing:'-0.005em' }}>
                        {_formatTime(b.sec)}
                      </div>
                    </div>
                    <button onClick={() => handleJump(b.sec)} className="mtx-tap" aria-label="Ir al marcador" style={{
                      width:34, height:34, borderRadius:'50%', cursor:'pointer',
                      background:`linear-gradient(180deg, ${accent}26, ${accent}0c)`,
                      border:`0.5px solid ${accent}55`,
                      color: accent,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow:`0 0 10px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.08)`,
                      flexShrink:0,
                    }}>
                      <IcPlay size={11} stroke="currentColor"/>
                    </button>
                    <button onClick={() => handleRemove(b.sec)} className="mtx-tap" aria-label="Eliminar marcador" style={{
                      width:30, height:30, borderRadius:'50%', cursor:'pointer',
                      border:0, background:'rgba(255,255,255,0.04)',
                      color:'var(--ink-3)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      flexShrink:0,
                    }}>
                      <IcClose size={12} stroke="currentColor" strokeWidth={2}/>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding:'14px 18px 0' }}>
          <button onClick={onClose} className="mtx-tap" style={{
            width:'100%', height:48, borderRadius:14, cursor:'pointer',
            border:'0.5px solid var(--glass-stroke)',
            background:'var(--glass-2)', color:'var(--ink-2)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── PlayerWaveform — barras pulsantes vivas (latido del reproductor) ─────────
function PlayerWaveform({ accent = 'var(--neon)', active = true, bars = 22, height = 18 }) {
  const SCALE = [0.38, 0.72, 0.5, 0.88, 0.6, 0.95, 0.7, 0.55, 0.82, 0.45, 0.92, 0.5, 0.7, 0.85, 0.62, 0.4, 0.78, 0.55, 0.68, 0.46, 0.84, 0.58];
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center', gap:2.5,
      height, width:'100%',
      opacity: active ? 1 : 0.28,
      filter: active ? 'none' : 'saturate(0.4)',
      transition:'opacity .35s, filter .35s',
    }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} style={{
          width:1.6, borderRadius:999,
          background: accent,
          boxShadow: active ? `0 0 5px ${accent}88` : 'none',
          height: Math.round(SCALE[i % SCALE.length] * (height - 2)),
          animation: active
            ? `mtxPlayerWave${i % 3} ${0.85 + (i % 5) * 0.12}s ease-in-out ${i * 0.045}s infinite alternate`
            : 'none',
          transformOrigin:'center',
        }}/>
      ))}
      <style>{`
        @keyframes mtxPlayerWave0 { from { transform:scaleY(0.28); } to { transform:scaleY(1); } }
        @keyframes mtxPlayerWave1 { from { transform:scaleY(0.5); } to { transform:scaleY(1); } }
        @keyframes mtxPlayerWave2 { from { transform:scaleY(0.18); } to { transform:scaleY(0.85); } }
      `}</style>
    </div>
  );
}

// ── PlaylistAccessCard — card flotante: acceso a la playlist activa ──────────
function PlaylistAccessCard({ playlist, items, accent = '#3dffd1', onOpen }) {
  if (!playlist || !items || items.length === 0) return null;
  const playlistAccent = playlist.accent || accent;
  const stackItems = items.slice(0, 3);

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(); } }}
      className="mtx-tap"
      style={{
        display:'flex', alignItems:'center', gap:13,
        padding:'10px 14px 10px 10px',
        borderRadius:16,
        background:'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018))',
        border:'0.5px solid rgba(255,255,255,0.08)',
        backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
        cursor:'pointer',
        boxShadow:'0 8px 24px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        position:'relative', overflow:'hidden',
        transition:'background .2s, border-color .2s, transform .15s',
      }}
    >
      {/* Subtle accent halo */}
      <div style={{
        position:'absolute', top:-24, left:-24, width:90, height:90,
        background:`radial-gradient(circle, ${playlistAccent}26 0%, transparent 65%)`,
        pointerEvents:'none', filter:'blur(6px)',
      }}/>

      {/* Cover stack — 3 covers superpuestos */}
      <div style={{
        position:'relative', zIndex:1,
        width: 32 + (stackItems.length - 1) * 12 + 4, height:42, flexShrink:0,
      }}>
        {stackItems.map((it, i) => {
          const itAccent = it.accent || playlistAccent;
          return (
            <div key={it.id} style={{
              position:'absolute',
              left: i * 12, top: i * 1.5,
              width:34, height:34, borderRadius:9,
              backgroundImage: it.cover ? `url(${it.cover})` : 'none',
              backgroundSize:'cover', backgroundPosition:'center',
              background: !it.cover ? (it.bg || `${itAccent}33`) : undefined,
              border:'1.5px solid #131815',
              boxShadow: i === 0 ? `0 4px 10px -4px ${itAccent}66` : 'none',
              zIndex: stackItems.length - i,
            }}/>
          );
        })}
      </div>

      {/* Text block */}
      <div style={{ flex:1, minWidth:0, position:'relative', zIndex:1 }}>
        <div className="mtx-eyebrow" style={{
          fontSize:9, fontWeight:700, color: playlistAccent,
          letterSpacing:'0.16em', textTransform:'uppercase', marginBottom:1,
          display:'inline-flex', alignItems:'center', gap:5,
        }}>
          <IcList size={9} stroke="currentColor" strokeWidth={2}/>
          {playlist.isWatchLater
            ? 'Tu cola personal'
            : (playlist.author?.isOfficial ? 'En reproducción · Oficial' : 'En reproducción')}
        </div>
        <div style={{
          fontSize:13.5, fontWeight:700, color:'var(--ink-1)',
          letterSpacing:'-0.01em', lineHeight:1.18,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>
          {playlist.title}
        </div>
        <div style={{
          fontSize:10.5, color:'var(--ink-3)', marginTop:1,
          letterSpacing:'-0.005em', fontVariantNumeric:'tabular-nums',
        }}>
          {items.length} {items.length === 1 ? 'item' : 'items'}{playlist.totalDuration ? ` · ${playlist.totalDuration}` : ''}
        </div>
      </div>

      {/* Open queue button */}
      <div style={{
        width:34, height:34, borderRadius:'50%', flexShrink:0,
        background:`linear-gradient(180deg, ${playlistAccent}26, ${playlistAccent}0c)`,
        border:`0.5px solid ${playlistAccent}55`,
        color: playlistAccent,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:`0 0 12px ${playlistAccent}33, inset 0 1px 0 rgba(255,255,255,0.08)`,
        position:'relative', zIndex:1,
      }}>
        <IcChevR size={13} stroke="currentColor" strokeWidth={2.2}/>
      </div>
    </div>
  );
}

// Skip duration store (window-level, persiste mientras la app esté abierta)
if (typeof window !== 'undefined' && window.__mtxSkipSec == null) {
  window.__mtxSkipSec = 15;
}

// ── VideoPlayerFullscreen — pantalla completa de reproductor ─────────────────
function VideoPlayerFullscreen({
  item, onClose, onComplete, onOptions,
  activePlaylist, activePlaylistItems, onOpenQueue,
  onPrev, onNext, canPrev = false, canNext = false,
}) {
  const totalSec = React.useMemo(() => _parseDuration(item?.dur), [item?.id]);
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [progress,  setProgress]  = React.useState(0);
  const [dragY,     setDragY]     = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
  const [sleepRemaining, setSleepRemaining] = React.useState(null); // seconds
  const [sleepSheetOpen, setSleepSheetOpen] = React.useState(false);
  const [bookmarkTick, setBookmarkTick] = React.useState(0); // force re-render on save
  const [bookmarksSheetOpen, setBookmarksSheetOpen] = React.useState(false);
  const [skipSheetOpen, setSkipSheetOpen] = React.useState(false);
  const [skipSeconds, setSkipSeconds] = React.useState(() => window.__mtxSkipSec || 15);
  const [bookmarkNameSheet, setBookmarkNameSheet] = React.useState(null); // { sec, defaultName }
  const progressBarRef = React.useRef(null);
  const dragStartY     = React.useRef(0);
  const dragActiveRef  = React.useRef(false);
  const onCompleteRef  = React.useRef(onComplete);
  const onCloseRef     = React.useRef(onClose);
  React.useEffect(() => { onCompleteRef.current = onComplete; });
  React.useEffect(() => { onCloseRef.current = onClose; });

  // Reset state when item changes
  React.useEffect(() => {
    setProgress(0);
    setBookmarkTick(t => t + 1);
  }, [item?.id]);

  // ── Sync con el store global del player (window.__mtxPlayer) ──────────────
  // Mantiene el mini player (MtxNowPlayingBar) en sync con esta vista fullscreen.
  // Mount: marca fullscreenOpen=true + setea el item + duración.
  // Unmount: marca fullscreenOpen=false (el mini toma el relevo, NO clearea).
  React.useEffect(() => {
    if (!item || !window.__mtxPlayer) return;
    window.__mtxPlayer.play(item);
    window.__mtxPlayer.setDuration(totalSec);
    window.__mtxPlayer.setFullscreenOpen(true);
    return () => {
      // Solo cerramos el flag de fullscreen — el item sigue activo en el mini.
      window.__mtxPlayer && window.__mtxPlayer.setFullscreenOpen(false);
    };
  }, [item?.id, totalSec]);

  // Sync isPlaying con el store
  React.useEffect(() => {
    if (!window.__mtxPlayer) return;
    if (isPlaying) window.__mtxPlayer.resume();
    else           window.__mtxPlayer.pause();
  }, [isPlaying]);

  // Sync progress con el store (throttled — evita spam: solo emite si cambió >0.5%)
  const lastSyncedProgressRef = React.useRef(0);
  React.useEffect(() => {
    if (!window.__mtxPlayer) return;
    if (Math.abs(progress - lastSyncedProgressRef.current) > 0.005 || progress === 0 || progress >= 1) {
      window.__mtxPlayer.setProgress(progress);
      lastSyncedProgressRef.current = progress;
    }
  }, [progress]);

  // Main playback tick — speed multiplies the increment
  React.useEffect(() => {
    if (!isPlaying || !item) return;
    let completeTimer = null;
    const tickInc = (1 / 40) * playbackSpeed;
    const id = setInterval(() => {
      setProgress(p => {
        const next = Math.min(1, p + tickInc);
        if (next >= 1 && p < 1) {
          clearInterval(id);
          completeTimer = setTimeout(() => onCompleteRef.current?.(item), 600);
        }
        return next;
      });
    }, 250);
    return () => {
      clearInterval(id);
      if (completeTimer) clearTimeout(completeTimer);
    };
  }, [isPlaying, item, totalSec, playbackSpeed]);

  // Listen for custom events from VideoOptionsSheet to open internal sheets
  React.useEffect(() => {
    const onSkipEvt = () => setSkipSheetOpen(true);
    const onBookmarksEvt = () => setBookmarksSheetOpen(true);
    window.addEventListener('mtx:open-skip-config', onSkipEvt);
    window.addEventListener('mtx:open-bookmarks', onBookmarksEvt);
    return () => {
      window.removeEventListener('mtx:open-skip-config', onSkipEvt);
      window.removeEventListener('mtx:open-bookmarks', onBookmarksEvt);
    };
  }, []);

  // Sleep timer countdown — pauses playback at 0
  React.useEffect(() => {
    if (sleepRemaining == null) return;
    if (sleepRemaining <= 0) {
      setIsPlaying(false);
      setSleepRemaining(null);
      toast.show({ message: 'Reproducción pausada · Buenas noches', duration: 2400 });
      return;
    }
    const id = setInterval(() => {
      setSleepRemaining(s => (s == null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(id);
  }, [sleepRemaining]);

  // Speed cycle — tap chip
  const handleCycleSpeed = () => {
    const idx = _SPEED_CYCLE.indexOf(playbackSpeed);
    const next = _SPEED_CYCLE[(idx + 1) % _SPEED_CYCLE.length];
    setPlaybackSpeed(next);
  };

  // Bookmark — abre sheet de nombre antes de guardar (UX premium)
  const requestSaveBookmark = () => {
    if (!item) return;
    const sec = Math.round(progress * totalSec);
    if (!window.__mtxBookmarks[item.id]) window.__mtxBookmarks[item.id] = [];
    const exists = window.__mtxBookmarks[item.id].some(b => Math.abs(b.sec - sec) < 5);
    if (exists) {
      toast.show({ message: 'Ya tienes un marcador cerca', duration: 1500 });
      return;
    }
    const count = window.__mtxBookmarks[item.id].length;
    const defaultName = `Marcador ${String(count + 1).padStart(2, '0')}`;
    setBookmarkNameSheet({ sec, defaultName });
  };
  const commitBookmark = (name) => {
    if (!item || !bookmarkNameSheet) return;
    if (!window.__mtxBookmarks[item.id]) window.__mtxBookmarks[item.id] = [];
    window.__mtxBookmarks[item.id].push({
      sec: bookmarkNameSheet.sec,
      savedAt: Date.now(),
      name,
    });
    setBookmarkTick(t => t + 1);
    toast.show({ message: `"${name}" guardado en ${_formatTime(bookmarkNameSheet.sec)}`, duration: 1800 });
  };
  const handleBookmark = () => {
    const count = (item && window.__mtxBookmarks[item.id]) ? window.__mtxBookmarks[item.id].length : 0;
    if (count === 0) requestSaveBookmark();
    else setBookmarksSheetOpen(true);
  };
  const handleJumpToBookmark = (sec) => {
    setProgress(Math.max(0, Math.min(1, sec / totalSec)));
  };

  // Skip duration handlers
  const handlePickSkip = (sec) => {
    setSkipSeconds(sec);
    window.__mtxSkipSec = sec;
    toast.show({ message: `Saltos de ${sec} segundos`, duration: 1500 });
  };

  // Sleep handlers
  const handlePickSleep = (sec) => setSleepRemaining(sec);
  const handleCancelSleep = () => {
    setSleepRemaining(null);
    toast.show({ message: 'Temporizador cancelado', duration: 1500 });
  };

  // Bookmark count for current item
  const bookmarkCount = item && window.__mtxBookmarks[item.id]
    ? window.__mtxBookmarks[item.id].length
    : 0; // eslint-disable-line no-unused-vars
  React.useEffect(() => {}, [bookmarkTick]); // ensure count refreshes

  // Chapter markers — posiciones porcentuales sobre la progress bar
  const chapterMarkers = React.useMemo(() => {
    if (!item) return [];
    const chapters = _generateChapters(item);
    if (!chapters || chapters.length <= 1) return [];
    const out = [];
    let cum = 0;
    for (let i = 0; i < chapters.length - 1; i++) {
      const m = String(chapters[i].d).match(/(\d+)/);
      const sec = (m ? parseInt(m[1], 10) : 0) * 60;
      cum += sec;
      const pct = Math.max(0, Math.min(100, (cum / totalSec) * 100));
      out.push({ pct, label: chapters[i].t });
    }
    return out;
  }, [item?.id, totalSec]);

  // Bookmark markers en la progress bar (los que el usuario guardó)
  const bookmarkMarkers = React.useMemo(() => {
    if (!item || !window.__mtxBookmarks[item.id]) return [];
    return window.__mtxBookmarks[item.id].map(b => ({
      pct: Math.max(0, Math.min(100, (b.sec / totalSec) * 100)),
      sec: b.sec,
    }));
  }, [item?.id, totalSec, bookmarkTick]);

  const onHandleDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartY.current  = e.clientY;
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
    if (dragY > 110) { onCloseRef.current?.(); return; }
    setDragY(0);
  };

  const onSeek = (e) => {
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (!rect) return;
    setProgress(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  const skip = (sec) => setProgress(p => Math.max(0, Math.min(1, p + sec / totalSec)));

  if (!item) return null;
  const accent = item.accent || '#3dffd1';
  const curSec = Math.round(progress * totalSec);

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:140,
      background:`radial-gradient(80% 50% at 50% 0%, ${accent}15, transparent 60%), #050706`,
      transform:`translateY(${dragY}px)`,
      transition: isDragging ? 'none' : 'transform .4s cubic-bezier(.25,.8,.25,1)',
      animation:'mtxNowSlide .4s cubic-bezier(.25,.8,.25,1) both',
      display:'flex', flexDirection:'column',
      willChange:'transform',
      // Phase 5.3 fix — paddingTop:44 (safe area iOS) baja todo el contenido
      // por debajo del status bar simulado (z-index:150). Sin esto, el
      // chevron close del header queda CUBIERTO por la layer "9:41" + notch
      // y los taps no llegan al botón. El user reportó "ya no funciona el
      // botón de cerrar" — era esto.
      paddingTop:44,
      boxSizing:'border-box',
    }}>
      <style>{`@keyframes mtxNowSlide { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

      {/* Drag handle — only the bar captures pointer (buttons stay clickable) */}
      <div
        style={{ paddingTop:8, paddingBottom:10, display:'flex', justifyContent:'center', cursor:'grab', touchAction:'none' }}
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
      >
        <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.2)' }}/>
      </div>

      {/* Header — close + tipo + opciones (separate from drag handle so clicks land) */}
      <div style={{ display:'flex', alignItems:'center', padding:'0 16px 10px', justifyContent:'space-between' }}>
        <button onClick={onClose} className="mtx-tap" aria-label="Cerrar reproductor" style={{
          width:36, height:36, borderRadius:999, border:0,
          background:'rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--ink-1)', cursor:'pointer', flexShrink:0,
        }}>
          <IcChevD size={20} stroke="currentColor"/>
        </button>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'var(--ink-3)', textTransform:'uppercase', textAlign:'center', flex:1, minWidth:0 }}>
          {CONTENT_TYPES.find(t => t.id === item.type)?.label || item.type}
        </div>
        {onOptions ? (
          <button onClick={() => onOptions(curSec)} className="mtx-tap" aria-label="Más opciones" style={{
            width:36, height:36, borderRadius:999, border:0,
            background:'rgba(255,255,255,0.06)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', cursor:'pointer', flexShrink:0,
          }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}>
              <span style={{ width:3, height:3, borderRadius:'50%', background:'currentColor' }}/>
              <span style={{ width:3, height:3, borderRadius:'50%', background:'currentColor' }}/>
              <span style={{ width:3, height:3, borderRadius:'50%', background:'currentColor' }}/>
            </span>
          </button>
        ) : (
          <div style={{ width:36, flexShrink:0 }}/>
        )}
      </div>

      {/* Body wrapper — centered group + bottom UpNextCard */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'0 32px', minHeight:0 }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:0 }}>
        {/* Cover art */}
        <div style={{
          width:240, height:240, borderRadius:32, marginBottom:32,
          overflow:'hidden', position:'relative',
          background: item.bg,
          border:`1px solid ${accent}33`,
          boxShadow:`0 32px 80px -20px ${accent}55, 0 0 0 1px ${accent}22`,
        }}>
          {item.cover && (
            <img src={item.cover} alt="" style={{
              position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
              opacity:0.92, filter:'saturate(1.05) contrast(1.05)',
            }}/>
          )}
          <div style={{
            position:'absolute', inset:0,
            background:`radial-gradient(circle at 70% 20%, ${accent}30, transparent 60%)`,
            mixBlendMode:'screen',
          }}/>
          <div style={{
            position:'absolute', bottom:-50, left:'50%', transform:'translateX(-50%)',
            width:180, height:50,
            background:`radial-gradient(50% 100% at 50% 0%, ${accent}40, transparent)`,
            filter:'blur(20px)', pointerEvents:'none',
          }}/>
        </div>

        {/* Title + author */}
        <div style={{ textAlign:'center', marginBottom:14, width:'100%' }}>
          <div style={{ fontSize:22, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', lineHeight:1.2, marginBottom:6 }}>
            {item.title}
          </div>
          <div style={{ fontSize:13, color:'var(--ink-3)' }}>{item.author} · {item.dur}</div>
        </div>

        {/* Live waveform — pulsa solo cuando playing */}
        <div style={{ width:'100%', marginBottom:18, padding:'0 8px' }}>
          <PlayerWaveform accent={accent} active={isPlaying} bars={22} height={20}/>
        </div>

        {/* Progress with chapter + bookmark markers */}
        <div style={{ width:'100%', marginBottom:6 }}>
          <div ref={progressBarRef} onClick={onSeek} style={{
            height:4, borderRadius:999, background:'rgba(255,255,255,0.1)', cursor:'pointer', position:'relative',
          }}>
            <div style={{
              width:`${Math.round(progress * 100)}%`, height:'100%', borderRadius:999,
              background:`linear-gradient(90deg, ${accent}aa, ${accent})`,
              boxShadow:`0 0 12px ${accent}`,
              position:'relative',
            }}>
              <div style={{
                position:'absolute', right:-6, top:'50%', transform:'translateY(-50%)',
                width:12, height:12, borderRadius:999, background:accent, boxShadow:`0 0 8px ${accent}`,
              }}/>
            </div>

            {/* Chapter markers — pequeñas líneas verticales */}
            {chapterMarkers.map((m, i) => {
              const passed = (progress * 100) >= m.pct;
              return (
                <div key={`ch-${i}`} title={m.label} style={{
                  position:'absolute', left:`${m.pct}%`, top:'50%', transform:'translate(-50%, -50%)',
                  width:2, height:8, borderRadius:1,
                  background: passed ? 'rgba(10,20,16,0.55)' : 'rgba(255,255,255,0.45)',
                  pointerEvents:'none', zIndex:2,
                }}/>
              );
            })}

            {/* Bookmark markers — puntitos del color del accent */}
            {bookmarkMarkers.map((m, i) => (
              <div key={`bm-${i}`} title={`Marcador en ${_formatTime(m.sec)}`} style={{
                position:'absolute', left:`${m.pct}%`, top:'50%', transform:'translate(-50%, -50%)',
                width:7, height:7, borderRadius:'50%',
                background: accent,
                border:'1.5px solid rgba(10,15,14,1)',
                boxShadow:`0 0 8px ${accent}88`,
                pointerEvents:'none', zIndex:3,
              }}/>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:11, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
            <span>{_formatTime(curSec)}</span>
            <span>{_formatTime(totalSec)}</span>
          </div>
        </div>

        {/* Quick actions — Speed · Sleep · Bookmark */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:14, marginBottom:4 }}>
          {/* Speed chip */}
          <button onClick={handleCycleSpeed} className="mtx-tap" aria-label={`Velocidad ${_formatSpeed(playbackSpeed)}`} style={{
            appearance:'none', cursor:'pointer',
            display:'inline-flex', alignItems:'center', gap:5,
            padding:'8px 13px', borderRadius:999,
            border: playbackSpeed !== 1 ? `0.5px solid ${accent}55` : '0.5px solid rgba(255,255,255,0.08)',
            background: playbackSpeed !== 1
              ? `linear-gradient(180deg, ${accent}1f, ${accent}06)`
              : 'rgba(255,255,255,0.04)',
            color: playbackSpeed !== 1 ? accent : 'var(--ink-2)',
            fontFamily:'var(--ff-sans)',
            fontSize:11.5, fontWeight:700,
            letterSpacing:'-0.005em',
            fontVariantNumeric:'tabular-nums',
            boxShadow: playbackSpeed !== 1 ? `inset 0 0 10px ${accent}10` : 'none',
            transition:'background .2s, border-color .2s, color .2s',
          }}>
            <IcGauge size={11} stroke="currentColor" strokeWidth={2}/>
            {_formatSpeed(playbackSpeed)}
          </button>

          {/* Sleep timer chip */}
          <button onClick={() => setSleepSheetOpen(true)} className="mtx-tap" aria-label="Temporizador de apagado" style={{
            appearance:'none', cursor:'pointer',
            display:'inline-flex', alignItems:'center', gap:5,
            padding:'8px 13px', borderRadius:999,
            border: sleepRemaining != null ? '0.5px solid rgba(155,138,255,0.55)' : '0.5px solid rgba(255,255,255,0.08)',
            background: sleepRemaining != null
              ? 'linear-gradient(180deg, rgba(155,138,255,0.2), rgba(155,138,255,0.06))'
              : 'rgba(255,255,255,0.04)',
            color: sleepRemaining != null ? '#b9a8ff' : 'var(--ink-2)',
            fontFamily:'var(--ff-sans)',
            fontSize:11.5, fontWeight:700,
            letterSpacing:'-0.005em',
            fontVariantNumeric:'tabular-nums',
            boxShadow: sleepRemaining != null ? 'inset 0 0 10px rgba(155,138,255,0.12)' : 'none',
            transition:'background .2s, border-color .2s, color .2s',
          }}>
            <IcMoon size={11} stroke="currentColor" strokeWidth={1.8}/>
            {sleepRemaining != null
              ? `${Math.floor(sleepRemaining / 60)}:${String(sleepRemaining % 60).padStart(2, '0')}`
              : 'Sleep'}
          </button>

          {/* Bookmark chip */}
          <button onClick={handleBookmark} className="mtx-tap" aria-label="Guardar marcador" style={{
            appearance:'none', cursor:'pointer',
            display:'inline-flex', alignItems:'center', gap:5,
            padding:'8px 13px', borderRadius:999,
            border: bookmarkCount > 0 ? `0.5px solid ${accent}55` : '0.5px solid rgba(255,255,255,0.08)',
            background: bookmarkCount > 0
              ? `linear-gradient(180deg, ${accent}1f, ${accent}06)`
              : 'rgba(255,255,255,0.04)',
            color: bookmarkCount > 0 ? accent : 'var(--ink-2)',
            fontFamily:'var(--ff-sans)',
            fontSize:11.5, fontWeight:700,
            letterSpacing:'-0.005em',
            fontVariantNumeric:'tabular-nums',
            boxShadow: bookmarkCount > 0 ? `inset 0 0 10px ${accent}10` : 'none',
            transition:'background .2s, border-color .2s, color .2s',
          }}>
            {bookmarkCount > 0
              ? <IcBookmarkFill size={11} stroke="currentColor"/>
              : <IcBookmark size={11} stroke="currentColor" strokeWidth={1.8}/>}
            {bookmarkCount > 0 ? `${bookmarkCount}` : 'Marcar'}
          </button>
        </div>

        {/* Controls — prev · skip-back · play · skip-forward · next */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14, marginTop:18 }}>
          {/* Previous track */}
          <button onClick={onPrev} disabled={!canPrev} className="mtx-tap" aria-label="Anterior" style={{
            width:42, height:42, borderRadius:999, border:0,
            background:'none',
            cursor: canPrev ? 'pointer' : 'default',
            color: canPrev ? 'var(--ink-2)' : 'rgba(255,255,255,0.16)',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'color .2s',
          }}>
            <IcSkipPrev size={22} stroke="currentColor" strokeWidth={2}/>
          </button>

          {/* Skip back */}
          <button onClick={() => skip(-skipSeconds)} className="mtx-tap" aria-label={`Atrás ${skipSeconds} segundos`} style={{
            width:50, height:50, borderRadius:999, border:0,
            background:'none', cursor:'pointer', color:'var(--ink-1)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <IcSkipBack size={32} stroke="currentColor" strokeWidth={1.7} seconds={skipSeconds}/>
          </button>

          {/* Play / Pause */}
          <button onClick={() => setIsPlaying(p => !p)} className="mtx-tap" aria-label={isPlaying ? 'Pausar' : 'Reproducir'} style={{
            width:74, height:74, borderRadius:999, border:0, cursor:'pointer', color:'#0a1410',
            background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 0 1px rgba(61,255,209,0.4),0 0 44px rgba(61,255,209,0.5),inset 0 1px 0 rgba(255,255,255,0.4)',
            flexShrink:0,
          }}>
            {isPlaying
              ? <IcPause size={28} stroke="currentColor" strokeWidth={2.2}/>
              : <IcPlay  size={26} stroke="currentColor" strokeWidth={2}/>
            }
          </button>

          {/* Skip forward */}
          <button onClick={() => skip(skipSeconds)} className="mtx-tap" aria-label={`Adelante ${skipSeconds} segundos`} style={{
            width:50, height:50, borderRadius:999, border:0,
            background:'none', cursor:'pointer', color:'var(--ink-1)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <IcSkipForward size={32} stroke="currentColor" strokeWidth={1.7} seconds={skipSeconds}/>
          </button>

          {/* Next track */}
          <button onClick={onNext} disabled={!canNext} className="mtx-tap" aria-label="Siguiente" style={{
            width:42, height:42, borderRadius:999, border:0,
            background:'none',
            cursor: canNext ? 'pointer' : 'default',
            color: canNext ? 'var(--ink-2)' : 'rgba(255,255,255,0.16)',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'color .2s',
          }}>
            <IcSkipNext size={22} stroke="currentColor" strokeWidth={2}/>
          </button>
        </div>
      </div>

        {/* Bottom-pinned PlaylistAccessCard — abre la cola completa de la playlist activa */}
        {activePlaylist && activePlaylistItems && activePlaylistItems.length > 0 && (
          <div style={{ paddingTop:18, paddingBottom:8 }}>
            <PlaylistAccessCard
              playlist={activePlaylist}
              items={activePlaylistItems}
              accent={accent}
              onOpen={onOpenQueue}
            />
          </div>
        )}
      </div>

      <div style={{ height:24 }}/>

      {/* Sleep timer sheet */}
      {sleepSheetOpen && (
        <SleepTimerSheet
          activeSec={sleepRemaining}
          onClose={() => setSleepSheetOpen(false)}
          onPick={handlePickSleep}
          onCancel={handleCancelSleep}
        />
      )}

      {/* Bookmarks sheet */}
      {bookmarksSheetOpen && (
        <BookmarksSheet
          item={item}
          currentSec={curSec}
          onClose={() => setBookmarksSheetOpen(false)}
          onJumpTo={handleJumpToBookmark}
          onRequestSave={() => {
            setBookmarksSheetOpen(false);
            setTimeout(requestSaveBookmark, 220);
          }}
        />
      )}

      {/* Skip duration sheet */}
      {skipSheetOpen && (
        <SkipDurationSheet
          activeSec={skipSeconds}
          onClose={() => setSkipSheetOpen(false)}
          onPick={handlePickSkip}
        />
      )}

      {/* Bookmark name sheet — captura nombre antes de guardar */}
      {bookmarkNameSheet && (
        <BookmarkNameSheet
          item={item}
          currentSec={bookmarkNameSheet.sec}
          defaultName={bookmarkNameSheet.defaultName}
          onClose={() => setBookmarkNameSheet(null)}
          onSave={commitBookmark}
        />
      )}
    </div>
  );
}


// ── ReviewSheet — escribir reseña post-completion (alimenta perfil/comunidad)
const _REVIEW_TEMPLATES = [
  { label: 'Idea valiosa',    emoji: '💡', starter: 'Lo más valioso fue ' },
  { label: 'Reflexión',       emoji: '🤔', starter: 'Me hizo pensar en ' },
  { label: 'Aplicable',       emoji: '🎯', starter: 'Lo aplicaría a ' },
  { label: 'Recomendado',     emoji: '⭐', starter: 'Recomiendo a quien ' },
];

function ReviewSheet({ item, earnedPoints, onClose, onPublish }) {
  const [rating, setRating] = React.useState(0);
  const [text, setText] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(true);
  const [activeTemplate, setActiveTemplate] = React.useState(null);
  const textareaRef = React.useRef(null);

  React.useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 360);
    return () => clearTimeout(t);
  }, []);

  if (!item) return null;
  const accent = item.accent || '#3dffd1';
  const valid = rating > 0 && text.trim().length >= 10;

  const handleTemplate = (tpl) => {
    setActiveTemplate(tpl.label);
    if (!text.trim() || _REVIEW_TEMPLATES.some(t => text.startsWith(t.starter))) {
      const cleaned = _REVIEW_TEMPLATES.reduce((acc, t) => acc.replace(t.starter, ''), text).trim();
      setText(tpl.starter + cleaned);
    } else {
      setText(tpl.starter);
    }
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
        const len = (tpl.starter).length;
        try { textareaRef.current.setSelectionRange(len, textareaRef.current.value.length); } catch {}
      }
    }, 50);
  };

  const handlePublish = () => {
    if (!valid) return;
    onPublish?.({ rating, text: text.trim(), template: activeTemplate, isPublic });
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:175,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.65)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)', borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight:'92%', overflowY:'auto', paddingBottom:24,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header con cover + meta + mensaje motivador */}
        <div style={{ padding:'12px 22px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:14 }}>
            <div style={{
              width:54, height:54, borderRadius:14, flexShrink:0,
              position:'relative', overflow:'hidden',
              background: item.bg || `linear-gradient(135deg, ${accent}33, ${accent}10)`,
              border:`0.5px solid ${accent}45`,
              boxShadow:`0 8px 22px -8px ${accent}66`,
            }}>
              {item.cover && (
                <img src={item.cover} alt="" loading="lazy" style={{
                  position:'absolute', inset:0,
                  width:'100%', height:'100%', objectFit:'cover',
                }}/>
              )}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', fontWeight:700, marginBottom:3 }}>
                Tu impacto
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.018em', lineHeight:1.18,
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {item.title}
              </div>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2,
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {item.author}
              </div>
            </div>
          </div>
          <div style={{
            padding:'10px 13px', borderRadius:12,
            background:`linear-gradient(155deg, ${accent}10 0%, rgba(255,255,255,0.018) 70%)`,
            border:`0.5px solid ${accent}26`,
            fontSize:11.5, color:'var(--ink-2)', lineHeight:1.45, letterSpacing:'-0.005em',
          }}>
            <strong style={{ color: accent, fontWeight:700 }}>Tu reflexión inspira</strong> a otros a descubrir lo que vale la pena.
          </div>
        </div>

        {/* Rating 5 estrellas */}
        <div style={{ padding:'0 22px 16px' }}>
          <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', fontWeight:700, marginBottom:8 }}>
            ¿Cómo te impactó?
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {[1, 2, 3, 4, 5].map(n => {
              const filled = n <= rating;
              return (
                <button key={n} onClick={() => setRating(n)} className="mtx-tap" aria-label={`${n} estrellas`} style={{
                  flex:1, height:42, borderRadius:11, cursor:'pointer',
                  border: filled ? `0.5px solid ${accent}55` : '0.5px solid rgba(255,255,255,0.08)',
                  background: filled ? `linear-gradient(180deg, ${accent}1c, ${accent}06)` : 'rgba(255,255,255,0.025)',
                  color: filled ? accent : 'var(--ink-3)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow: filled ? `inset 0 0 8px ${accent}10, 0 0 12px ${accent}22` : 'none',
                  transition:'background .18s, border-color .18s, color .18s, box-shadow .25s',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
              );
            })}
          </div>
          {rating > 0 && (
            <div style={{ marginTop:6, fontSize:11, color: accent, fontWeight:600, textAlign:'center', letterSpacing:'-0.005em', animation:'mtx-fade-up .2s ease' }}>
              {rating === 1 && 'Difícil de seguir'}
              {rating === 2 && 'Algunos buenos puntos'}
              {rating === 3 && 'Vale la pena'}
              {rating === 4 && 'Muy recomendable'}
              {rating === 5 && 'Imprescindible'}
            </div>
          )}
        </div>

        {/* Quick-pick templates */}
        <div style={{ padding:'0 22px 12px' }}>
          <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', fontWeight:700, marginBottom:8 }}>
            Empieza con…
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {_REVIEW_TEMPLATES.map(tpl => {
              const isActive = activeTemplate === tpl.label;
              return (
                <button key={tpl.label} onClick={() => handleTemplate(tpl)} className="mtx-tap" style={{
                  appearance:'none', cursor:'pointer',
                  display:'inline-flex', alignItems:'center', gap:6,
                  padding:'7px 12px', borderRadius:999,
                  border: isActive ? `0.5px solid ${accent}55` : '0.5px solid rgba(255,255,255,0.08)',
                  background: isActive ? `linear-gradient(180deg, ${accent}1c, ${accent}06)` : 'rgba(255,255,255,0.035)',
                  color: isActive ? accent : 'var(--ink-2)',
                  fontFamily:'var(--ff-sans)',
                  fontSize:11.5, fontWeight:600, letterSpacing:'-0.005em',
                  transition:'background .15s, border-color .15s, color .15s',
                }}>
                  <span style={{ fontSize:12 }}>{tpl.emoji}</span>
                  {tpl.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Textarea */}
        <div style={{ padding:'0 22px 14px' }}>
          <textarea
            ref={textareaRef}
            value={text}
            maxLength={280}
            placeholder="¿Qué te llevas? Una idea, una emoción, una decisión…"
            onChange={e => setText(e.target.value)}
            rows={5}
            style={{
              appearance:'none', width:'100%', minWidth:0, boxSizing:'border-box',
              padding:'14px 16px', borderRadius:14,
              background:'rgba(0,0,0,0.32)',
              border: text.trim().length >= 10 ? `0.5px solid ${accent}45` : '0.5px solid rgba(255,255,255,0.08)',
              color:'var(--ink-1)', fontSize:14, fontWeight:500, lineHeight:1.5,
              fontFamily:'var(--ff-sans)', outline:'none', letterSpacing:'-0.005em',
              resize:'none',
              boxShadow: text.trim().length >= 10
                ? `inset 0 0 0 1px ${accent}24, 0 0 0 3px ${accent}10`
                : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              transition:'border-color .2s, box-shadow .25s',
            }}
          />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
            <span style={{ fontSize:10.5, color: text.trim().length < 10 && text.length > 0 ? '#ffb47a' : 'var(--ink-3)', letterSpacing:'-0.005em' }}>
              {text.trim().length < 10 ? `Mínimo 10 caracteres` : 'Tu reflexión es valiosa'}
            </span>
            <span style={{ fontSize:10.5, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
              {text.length}/280
            </span>
          </div>
        </div>

        {/* Visibility toggle */}
        <div style={{ padding:'0 22px 16px' }}>
          <button onClick={() => setIsPublic(p => !p)} className="mtx-tap" style={{
            width:'100%', appearance:'none', cursor:'pointer', textAlign:'left',
            display:'flex', alignItems:'center', gap:11,
            padding:'11px 13px', borderRadius:13,
            background: isPublic ? `${accent}0d` : 'rgba(255,255,255,0.025)',
            border: isPublic ? `0.5px solid ${accent}33` : '0.5px solid rgba(255,255,255,0.06)',
            fontFamily:'var(--ff-sans)',
            transition:'background .15s, border-color .15s',
          }}>
            <div style={{
              width:32, height:32, borderRadius:9, flexShrink:0,
              background: isPublic ? `linear-gradient(135deg, ${accent}33, ${accent}0a)` : 'rgba(255,255,255,0.04)',
              border: isPublic ? `0.5px solid ${accent}45` : '0.5px solid rgba(255,255,255,0.05)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color: isPublic ? accent : 'var(--ink-3)',
              fontSize:14,
            }}>
              {isPublic ? '🌎' : '🔒'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.005em' }}>
                {isPublic ? 'Pública · Visible en la comunidad' : 'Privada · Solo en tu perfil'}
              </div>
              <div style={{ fontSize:10.5, color:'var(--ink-3)', marginTop:1 }}>
                {isPublic ? 'Ayudará a otros a descubrir' : 'Nadie más la verá'}
              </div>
            </div>
            {/* Switch */}
            <div style={{
              width:36, height:20, borderRadius:999, position:'relative', flexShrink:0,
              background: isPublic ? accent : 'rgba(255,255,255,0.12)',
              transition:'background .2s',
            }}>
              <div style={{
                position:'absolute', top:2, left: isPublic ? 18 : 2,
                width:16, height:16, borderRadius:'50%', background:'#fff',
                transition:'left .2s cubic-bezier(.25,.8,.25,1)',
                boxShadow:'0 2px 4px rgba(0,0,0,0.25)',
              }}/>
            </div>
          </button>
        </div>

        {/* CTAs */}
        <div style={{ padding:'0 22px', display:'flex', gap:10 }}>
          <button onClick={onClose} className="mtx-tap" style={{
            flex:1, height:50, borderRadius:14, cursor:'pointer',
            border:'0.5px solid var(--glass-stroke)',
            background:'var(--glass-2)', color:'var(--ink-2)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}>
            Cancelar
          </button>
          <button onClick={handlePublish} disabled={!valid} className="mtx-tap" style={{
            flex:1.6, height:50, borderRadius:14,
            cursor: valid ? 'pointer' : 'not-allowed',
            border:0,
            background: valid
              ? 'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))'
              : 'rgba(255,255,255,0.06)',
            color: valid ? '#0a1410' : 'var(--ink-3)',
            fontSize:14, fontWeight:700, fontFamily:'var(--ff-sans)', letterSpacing:'-0.005em',
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
            boxShadow: valid
              ? '0 0 0 1px rgba(61,255,209,0.4), 0 12px 28px -8px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)'
              : 'none',
            transition:'background .25s, box-shadow .3s',
          }}>
            <IcSparkles size={13} stroke="currentColor"/>
            Publicar reseña
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ReviewSuccessSheet — confetti + agradecimiento + acciones ────────────────
function ReviewSuccessSheet({ review, item, onClose, onShare, onViewProfile }) {
  if (!review || !item) return null;
  const accent = item.accent || '#3dffd1';
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  const handleShare = () => {
    onShare?.(review);
    toast.show({ message: 'Compartiendo tu reseña…', duration: 1700 });
    setTimeout(onClose, 200);
  };
  const handleViewProfile = () => {
    onViewProfile?.();
    toast.show({ message: 'Disponible en tu perfil próximamente', duration: 2000 });
    setTimeout(onClose, 200);
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:180,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.62)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.98), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)', borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', paddingBottom:28,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
        position:'relative', overflow:'hidden',
      }}>
        <style>{`
          @keyframes mtxConfetti0 { 0% { transform:translateY(-20px) rotate(0); opacity:0; } 10% { opacity:1; } 100% { transform:translateY(420px) rotate(360deg); opacity:0; } }
          @keyframes mtxConfetti1 { 0% { transform:translateY(-20px) rotate(0); opacity:0; } 10% { opacity:1; } 100% { transform:translateY(380px) rotate(-360deg); opacity:0; } }
          @keyframes mtxConfetti2 { 0% { transform:translateY(-20px) rotate(0); opacity:0; } 10% { opacity:1; } 100% { transform:translateY(440px) rotate(180deg); opacity:0; } }
        `}</style>

        {/* Confetti */}
        {Array.from({ length: 22 }).map((_, i) => {
          const colors = [accent, '#3dffd1', '#FFD66B', '#9b8aff', '#5dd3ff'];
          const left = (i * 13 + 5) % 100;
          const delay = (i * 0.12) % 2.5;
          const dur = 2.4 + (i % 4) * 0.4;
          const animIdx = i % 3;
          const size = 4 + (i % 3) * 2;
          return (
            <div key={i} style={{
              position:'absolute', top:0, left:`${left}%`,
              width:size, height:size, borderRadius: i % 2 === 0 ? '50%' : 2,
              background: colors[i % colors.length],
              boxShadow: `0 0 6px ${colors[i % colors.length]}`,
              animation:`mtxConfetti${animIdx} ${dur}s cubic-bezier(.25,.46,.45,.94) ${delay}s infinite`,
              pointerEvents:'none', zIndex:1,
            }}/>
          );
        })}

        <div style={{ display:'flex', justifyContent:'center', paddingTop:14, paddingBottom:6, position:'relative', zIndex:2 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Hero */}
        <div style={{ padding:'18px 28px 14px', textAlign:'center', position:'relative', zIndex:2 }}>
          <div style={{
            width:64, height:64, borderRadius:18, margin:'0 auto 14px',
            background:`linear-gradient(135deg, ${accent}40, ${accent}0a)`,
            border:`0.5px solid ${accent}66`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: accent,
            boxShadow:`0 0 28px ${accent}44, inset 0 1px 0 rgba(255,255,255,0.1)`,
          }}>
            <IcSparkles size={26} stroke="currentColor"/>
          </div>
          <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', marginBottom:6 }}>
            Reseña publicada
          </div>
          <h1 style={{
            margin:0, fontSize:22, fontWeight:800, color:'var(--ink-1)',
            letterSpacing:'-0.022em', lineHeight:1.18,
            fontFamily:'var(--ff-display)',
          }}>
            Gracias por contribuir 🌱
          </h1>
          <p style={{ margin:'8px 22px 0', fontSize:12.5, color:'var(--ink-3)', lineHeight:1.5 }}>
            Tu reflexión ahora ayuda a otros a descubrir lo que vale la pena leer.
          </p>
        </div>

        {/* Review preview */}
        <div style={{ padding:'0 22px 18px', position:'relative', zIndex:2 }}>
          <div style={{
            padding:'13px 14px', borderRadius:14,
            background:`linear-gradient(155deg, ${accent}0d 0%, rgba(255,255,255,0.018) 70%)`,
            border:`0.5px solid ${accent}26`,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i < review.rating ? accent : 'none'} stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ))}
            </div>
            <div style={{
              fontSize:13, color:'var(--ink-1)', lineHeight:1.5, letterSpacing:'-0.005em',
              fontStyle:'italic',
              display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical',
              overflow:'hidden', textOverflow:'ellipsis',
            }}>
              "{review.text}"
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding:'0 22px', display:'flex', flexDirection:'column', gap:10, position:'relative', zIndex:2 }}>
          <button onClick={handleShare} className="mtx-tap" style={{
            width:'100%', height:54, borderRadius:18, border:0, cursor:'pointer',
            background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
            color:'#0a1410', fontSize:15, fontWeight:700,
            fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
            boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 14px 36px -10px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}>
            <IcShare size={15} stroke="currentColor" strokeWidth={1.7}/>
            Compartir reseña
          </button>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={handleViewProfile} className="mtx-tap" style={{
              flex:1, height:48, borderRadius:14, cursor:'pointer',
              border:'0.5px solid var(--glass-stroke)',
              background:'var(--glass-2)', color:'var(--ink-1)',
              fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
            }}>
              Ver en mi perfil
            </button>
            <button onClick={onClose} className="mtx-tap" style={{
              flex:1, height:48, borderRadius:14, cursor:'pointer',
              border:'0.5px solid rgba(255,255,255,0.06)',
              background:'rgba(255,255,255,0.03)', color:'var(--ink-2)',
              fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
            }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── VideoCompletionSheet — bottom sheet al terminar ──────────────────────────
function VideoCompletionSheet({ item, nextItem, onNext, onClose, onWriteReview }) {
  if (!item) return null;
  const accent = item.accent || '#3dffd1';
  const minutes = Math.floor(_parseDuration(item.dur) / 60);
  const earnedPoints = _calculateEarnedPoints(item);

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:150,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.62)',
      backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.98), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight:'92%', overflowY:'auto', paddingBottom:24,
        boxShadow:'0 -20px 60px -12px rgba(0,0,0,0.6)',
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
        position:'relative', overflow:'hidden',
      }}>
        <style>{`
          @keyframes mtxConfetti0 { 0% { transform:translateY(-20px) rotate(0); opacity:0; } 10% { opacity:1; } 100% { transform:translateY(420px) rotate(360deg); opacity:0; } }
          @keyframes mtxConfetti1 { 0% { transform:translateY(-20px) rotate(0); opacity:0; } 10% { opacity:1; } 100% { transform:translateY(380px) rotate(-360deg); opacity:0; } }
          @keyframes mtxConfetti2 { 0% { transform:translateY(-20px) rotate(0); opacity:0; } 10% { opacity:1; } 100% { transform:translateY(440px) rotate(180deg); opacity:0; } }
        `}</style>

        {/* Confetti */}
        {Array.from({ length: 18 }).map((_, i) => {
          const colors = [accent, '#3dffd1', '#FFD66B', '#9b8aff', '#5dd3ff'];
          const left = (i * 17 + 5) % 100;
          const delay = (i * 0.16) % 3;
          const dur = 2.4 + (i % 4) * 0.4;
          const animIdx = i % 3;
          const size = 4 + (i % 3) * 2;
          return (
            <div key={i} style={{
              position:'absolute', top:0, left:`${left}%`,
              width:size, height:size, borderRadius: i % 2 === 0 ? '50%' : 2,
              background: colors[i % colors.length],
              boxShadow: `0 0 6px ${colors[i % colors.length]}`,
              animation:`mtxConfetti${animIdx} ${dur}s cubic-bezier(.25,.46,.45,.94) ${delay}s infinite`,
              pointerEvents:'none', zIndex:1,
            }}/>
          );
        })}

        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:14, paddingBottom:6, position:'relative', zIndex:2 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'14px 28px 4px', textAlign:'center', position:'relative', zIndex:2 }}>
          <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', marginBottom:8 }}>
            Completado
          </div>
          <h1 style={{
            margin:0, fontSize:23, fontWeight:800, color:'var(--ink-1)',
            letterSpacing:'-0.025em', lineHeight:1.15,
            fontFamily:'var(--ff-display)',
          }}>
            Una pieza más para ti.
          </h1>
          <p style={{ margin:'8px 0 0', fontSize:12.5, color:'var(--ink-3)', lineHeight:1.5 }}>
            "{item.title}"
          </p>
        </div>

        {/* Stats grid — Tiempo + Ganados */}
        <div style={{ padding:'16px 20px 18px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, position:'relative', zIndex:2 }}>
          <div className="mtx-glass" style={{
            padding:'12px 14px', borderRadius:14,
            background:'rgba(255,255,255,0.03)',
            border:'0.5px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--ink-3)' }}>
              <IcClock size={11} stroke="currentColor"/>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase' }}>Tiempo</span>
            </div>
            <div style={{
              fontSize:22, fontWeight:700, color:'var(--ink-1)',
              fontVariantNumeric:'tabular-nums', letterSpacing:'-0.03em', lineHeight:1, marginTop:5,
              fontFamily:'var(--ff-display)',
            }}>{minutes} <span style={{ fontSize:11, color:'var(--ink-3)', fontWeight:500 }}>min</span></div>
          </div>
          <div style={{
            padding:'12px 14px', borderRadius:14, position:'relative', overflow:'hidden',
            background:`linear-gradient(165deg, ${accent}1a 0%, ${accent}06 60%, rgba(255,255,255,0.018) 100%)`,
            border:`0.5px solid ${accent}40`,
            boxShadow:`inset 0 0 18px ${accent}10, 0 0 0 0.5px ${accent}1a`,
          }}>
            {/* Halo */}
            <div style={{
              position:'absolute', top:-22, right:-22, width:70, height:70, borderRadius:'50%',
              background:`radial-gradient(circle, ${accent}33 0%, transparent 65%)`,
              pointerEvents:'none',
            }}/>
            <div style={{ display:'flex', alignItems:'center', gap:6, color: accent, position:'relative', zIndex:1 }}>
              <IcSparkles size={11} stroke="currentColor"/>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase' }}>Ganados</span>
            </div>
            <div style={{
              fontSize:22, fontWeight:700, color: accent,
              fontVariantNumeric:'tabular-nums', letterSpacing:'-0.03em', lineHeight:1, marginTop:5,
              fontFamily:'var(--ff-display)', position:'relative', zIndex:1,
              textShadow:`0 0 16px ${accent}55`,
            }}>+{earnedPoints} <span style={{ fontSize:11, color:`${accent}aa`, fontWeight:600 }}>pts</span></div>
          </div>
        </div>

        {/* CTA primario — Reseñar (arriba, grande, persuasivo) */}
        <div style={{ padding:'0 20px 12px', position:'relative', zIndex:2 }}>
          <button onClick={onWriteReview} className="mtx-tap" style={{
            width:'100%', minWidth:0, boxSizing:'border-box',
            padding:'14px 16px', borderRadius:18, border:0, cursor:'pointer',
            background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
            color:'#0a1410',
            fontFamily:'var(--ff-sans)', textAlign:'left',
            display:'flex', alignItems:'center', gap:13,
            boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 14px 36px -10px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
            position:'relative', overflow:'hidden',
          }}>
            {/* Shine sweep animado */}
            <div style={{
              position:'absolute', top:0, bottom:0, width:60,
              background:'linear-gradient(120deg, transparent, rgba(255,255,255,0.5), transparent)',
              animation:'mtxShine 2.6s ease-in-out infinite',
              pointerEvents:'none',
            }}/>
            <style>{`@keyframes mtxShine { 0% { left:-30%; } 60%, 100% { left:130%; } }`}</style>

            <div style={{
              width:42, height:42, borderRadius:12, flexShrink:0,
              background:'rgba(10,20,16,0.18)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'inset 0 1px 0 rgba(255,255,255,0.15)',
              position:'relative', zIndex:1,
            }}>
              <IcEdit size={19} stroke="currentColor" strokeWidth={2}/>
            </div>
            <div style={{ flex:1, minWidth:0, position:'relative', zIndex:1 }}>
              <div style={{ fontSize:15, fontWeight:800, letterSpacing:'-0.015em', lineHeight:1.18, marginBottom:2 }}>
                Comparte lo que aprendiste
              </div>
              <div style={{ fontSize:11.5, fontWeight:600, opacity:0.78, letterSpacing:'-0.005em' }}>
                Tu reflexión inspira a la comunidad
              </div>
            </div>
            <div style={{
              width:24, height:24, borderRadius:'50%', flexShrink:0,
              background:'rgba(10,20,16,0.18)',
              display:'flex', alignItems:'center', justifyContent:'center',
              position:'relative', zIndex:1,
            }}>
              <IcChevR size={13} stroke="currentColor" strokeWidth={2.4}/>
            </div>
          </button>
        </div>

        {/* CTAs secundarios — Siguiente + Volver (50/50) */}
        <div style={{ padding:'0 20px', display:'flex', gap:10, position:'relative', zIndex:2 }}>
          {nextItem && (
            <button onClick={onNext} className="mtx-tap" style={{
              flex:1, height:50, borderRadius:14, cursor:'pointer',
              border:'0.5px solid rgba(255,255,255,0.08)',
              background:'rgba(255,255,255,0.04)',
              color:'var(--ink-1)', fontSize:13, fontWeight:600,
              fontFamily:'var(--ff-sans)', letterSpacing:'-0.005em',
              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
            }}>
              <IcPlay size={11} stroke="currentColor" strokeWidth={2.4}/>
              Siguiente
            </button>
          )}
          <button onClick={onClose} className="mtx-tap" style={{
            flex:1, height:50, borderRadius:14, cursor:'pointer',
            background:'rgba(255,255,255,0.04)',
            border:'0.5px solid rgba(255,255,255,0.08)',
            color:'var(--ink-1)', fontSize:13, fontWeight:600,
            fontFamily:'var(--ff-sans)', letterSpacing:'-0.005em',
          }}>
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}


// ── PlaylistItemRow — item compacto en la lista de PlaylistOverview ──────────
function PlaylistItemRow({ item, index, onClick, isPlaying }) {
  if (!item) return null;
  const accent = item.accent || '#3dffd1';

  return (
    <div
      onClick={() => onClick(item, index)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(item, index); } }}
      className="mtx-glass mtx-tap"
      style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'10px 12px', borderRadius:14, cursor:'pointer',
        background: isPlaying ? `linear-gradient(180deg, ${accent}14, ${accent}04)` : 'rgba(255,255,255,0.025)',
        border: isPlaying ? `0.5px solid ${accent}40` : '0.5px solid rgba(255,255,255,0.05)',
        boxShadow: isPlaying ? `0 0 0 1px ${accent}26, 0 8px 22px -10px ${accent}55` : 'none',
        position:'relative', overflow:'hidden',
        transform: isPlaying ? 'translateY(-1px)' : 'translateY(0)',
        transition:'transform .25s, box-shadow .3s, background .25s',
      }}
    >
      {/* Index */}
      <div style={{
        width:24, flexShrink:0, textAlign:'center',
        fontSize:11, fontWeight:700,
        color: isPlaying ? accent : 'var(--ink-3)',
        fontVariantNumeric:'tabular-nums',
      }}>
        {isPlaying ? <IcPlay size={11} stroke="currentColor" strokeWidth={2.4}/> : String(index + 1).padStart(2, '0')}
      </div>

      {/* Cover */}
      <div style={{
        width:48, height:48, borderRadius:10, flexShrink:0,
        position:'relative', overflow:'hidden',
        background: item.bg,
        border:`0.5px solid ${accent}28`,
      }}>
        {item.cover && (
          <img src={item.cover} alt="" loading="lazy" style={{
            position:'absolute', inset:0,
            width:'100%', height:'100%', objectFit:'cover',
            opacity:0.78,
          }}/>
        )}
        <div style={{
          position:'absolute', inset:0,
          background:`linear-gradient(135deg, ${accent}22, transparent 60%)`,
        }}/>
      </div>

      {/* Text */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontSize:9, fontWeight:700, letterSpacing:'0.1em',
          color: isPlaying ? accent : 'var(--ink-3)', textTransform:'uppercase',
          marginBottom:2,
        }}>
          {CONTENT_TYPES.find(t => t.id === item.type)?.label || item.type}
        </div>
        <div style={{
          fontSize:13, fontWeight:600, color:'var(--ink-1)',
          letterSpacing:'-0.01em',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>
          {item.title}
        </div>
      </div>

      {/* Duration */}
      <div style={{
        fontSize:11, color:'var(--ink-3)', flexShrink:0,
        fontVariantNumeric:'tabular-nums',
        display:'inline-flex', alignItems:'center', gap:4,
      }}>
        <IcClock size={10} stroke="currentColor"/>
        {item.dur}
      </div>
    </div>
  );
}


// ── PlaylistOverviewScreen — full screen view de la playlist ─────────────────
function PlaylistOverviewScreen({ playlist, onBack, onPlayAll, onShuffle, onItemPlay, onAddContent }) {
  const [optionsOpen, setOptionsOpen]       = React.useState(false);
  const [shareEntity, setShareEntity]       = React.useState(null);
  const [editOpen, setEditOpen]             = React.useState(false);
  const items = React.useMemo(() => _resolvePlaylistItems(playlist), [playlist?.id]);
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  if (!playlist) return null;
  const accent = playlist.accent || '#3dffd1';

  // Normaliza la playlist al shape que espera ShareSheet (item-like)
  const playlistAsShareEntity = React.useCallback(() => ({
    id: playlist.id,
    title: playlist.title,
    author: playlist.author?.name || 'Playlist',
    cover: playlist.thumbnail,
    accent,
  }), [playlist, accent]);

  const handleRemove = () => {
    toast.show({ message: `"${playlist.title}" removida de tu biblioteca`, duration: 1800 });
    setTimeout(() => onBack?.(), 350);
  };

  return (
    <div style={{
      paddingBottom:120,
      animation:'mtxNotifInFull .35s cubic-bezier(.25,.8,.25,1) both',
    }}>
      {/* Nav bar */}
      <div style={{
        paddingTop:48, paddingLeft:16, paddingRight:16, paddingBottom:10,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexShrink:0, position:'relative',
      }}>
        <button onClick={onBack} aria-label="Volver" className="mtx-tap" style={{
          width:40, height:40, borderRadius:999, border:0,
          background:'rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--ink-1)', cursor:'pointer', position:'relative', zIndex:2,
        }}>
          <IcChevL size={20} stroke="currentColor" strokeWidth={2}/>
        </button>
        <div style={{
          position:'absolute', left:'50%', top:'50%',
          transform:'translate(-50%, calc(-50% + 19px))',
          fontSize:11, fontWeight:700, color:'var(--ink-3)',
          letterSpacing:'0.14em', textTransform:'uppercase',
          fontFamily:'var(--ff-sans)', pointerEvents:'none',
        }}>
          Playlist
        </div>
        <button onClick={() => setOptionsOpen(true)} aria-label="Más opciones" className="mtx-tap" style={{
          width:40, height:40, borderRadius:999, cursor:'pointer',
          border:0,
          background:'rgba(255,255,255,0.06)',
          color:'var(--ink-1)',
          display:'flex', alignItems:'center', justifyContent:'center',
          position:'relative', zIndex:2,
        }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:3.5 }}>
            <span style={{ width:3.5, height:3.5, borderRadius:'50%', background:'currentColor' }}/>
            <span style={{ width:3.5, height:3.5, borderRadius:'50%', background:'currentColor' }}/>
            <span style={{ width:3.5, height:3.5, borderRadius:'50%', background:'currentColor' }}/>
          </span>
        </button>
      </div>

      {/* Hero — thumbnail + title + author */}
      <div style={{ padding:'8px 20px 16px' }}>
        <div style={{
          position:'relative', height:200,
          borderRadius:24, overflow:'hidden',
          background: playlist.bg,
          border:`0.5px solid ${accent}33`,
          boxShadow:`0 16px 44px -16px ${accent}55, 0 0 0 0.5px ${accent}1a`,
        }}>
          {playlist.thumbnail && (
            <img src={playlist.thumbnail} alt="" style={{
              position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'cover',
              opacity:0.78, filter:'saturate(0.95) contrast(1.05)',
            }}/>
          )}
          <div style={{
            position:'absolute', inset:0,
            background:`linear-gradient(180deg, rgba(0,0,0,0.18) 30%, rgba(0,0,0,0.85) 100%), radial-gradient(circle at 80% 20%, ${accent}30, transparent 55%)`,
          }}/>

          {/* Top: Eyebrow */}
          <div style={{
            position:'absolute', top:14, left:14,
            fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase',
            color:accent,
            padding:'4px 9px', borderRadius:999,
            background:'rgba(0,0,0,0.55)',
            backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
            border:`0.5px solid ${accent}45`,
            display:'inline-flex', alignItems:'center', gap:5,
          }}>
            <IcTarget size={9} stroke="currentColor" strokeWidth={2}/>
            {playlist.author?.isOfficial ? 'Oficial Mentex' : 'Comunidad'}
          </div>

          {/* Bottom: title + author */}
          <div style={{
            position:'absolute', left:18, right:18, bottom:16,
            display:'flex', flexDirection:'column', gap:5,
          }}>
            <div style={{
              fontSize:22, fontWeight:700, color:'#fff',
              letterSpacing:'-0.02em', lineHeight:1.18,
              textShadow:'0 2px 12px rgba(0,0,0,0.65)',
              fontFamily:'var(--ff-display)',
            }}>
              {playlist.title}
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.78)', fontWeight:500, display:'inline-flex', alignItems:'center', gap:5 }}>
              {playlist.author?.isOfficial && <IcSpark size={11} stroke={accent} strokeWidth={2.2}/>}
              {playlist.author?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ padding:'0 20px', marginBottom:18, display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
        <div className="mtx-glass" style={{ padding:'12px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.05)', textAlign:'center' }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:3 }}>Videos</div>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--ink-1)', fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em', fontFamily:'var(--ff-display)' }}>{playlist.totalVideos}</div>
        </div>
        <div className="mtx-glass" style={{ padding:'12px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.05)', textAlign:'center' }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:3 }}>Duración</div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.01em', marginTop:3 }}>{playlist.totalDuration}</div>
        </div>
        <div className="mtx-glass" style={{ padding:'12px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.05)', textAlign:'center' }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:3 }}>Plays</div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.01em', marginTop:3 }}>{playlist.totalViews}</div>
        </div>
      </div>

      {/* CTAs row: Play all + Shuffle */}
      <div style={{ padding:'0 20px', marginBottom:14, display:'grid', gridTemplateColumns:'2fr 1fr', gap:10 }}>
        <button onClick={onPlayAll} className="mtx-tap" style={{
          height:50, borderRadius:14, border:0, cursor:'pointer',
          background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
          color:'#0a1410', fontSize:14, fontWeight:700,
          fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
          display:'flex', alignItems:'center', justifyContent:'center', gap:7,
          boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 10px 28px -8px rgba(61,255,209,0.5), inset 0 1px 0 rgba(255,255,255,0.4)',
        }}>
          <IcPlay size={14} stroke="currentColor" strokeWidth={2.4}/>
          Reproducir todo
        </button>
        <button onClick={onShuffle} className="mtx-tap" style={{
          height:50, borderRadius:14, cursor:'pointer',
          border:'0.5px solid var(--glass-stroke)',
          background:'var(--glass-2)', color:'var(--ink-1)',
          fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5,
        }}>
          <IcZap size={13} stroke="currentColor"/>
          Aleatorio
        </button>
      </div>

      {/* Description */}
      {playlist.desc && (
        <div style={{ padding:'10px 20px 18px' }}>
          <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.5, textWrap:'pretty' }}>
            {playlist.desc}
          </div>
        </div>
      )}

      {/* Items list */}
      <div style={{ padding:'0 20px' }}>
        <div style={{
          fontSize:10, fontWeight:700, letterSpacing:'0.14em',
          textTransform:'uppercase', color:'var(--ink-3)',
          marginBottom:10, paddingLeft:4,
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <span>Cola de reproducción</span>
          <span style={{ fontVariantNumeric:'tabular-nums' }}>{items.length}</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {items.length === 0 ? (
            <div style={{ padding:'24px', textAlign:'center', fontSize:13, color:'var(--ink-3)' }}>
              Esta playlist aún no tiene contenido.
            </div>
          ) : (
            items.map((it, i) => (
              <PlaylistItemRow key={it.id} item={it} index={i} onClick={onItemPlay}/>
            ))
          )}
        </div>
      </div>

      {/* Sheets — portal-mounted al viewport del IOSDevice */}
      {(optionsOpen || shareEntity || editOpen) && (() => {
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const sheets = (
          <>
            {optionsOpen && (
              <PlaylistOptionsSheet
                playlist={playlist}
                onClose={() => setOptionsOpen(false)}
                onPlayAll={onPlayAll}
                onShuffle={onShuffle}
                onShare={() => setShareEntity(playlistAsShareEntity())}
                onAddContent={() => onAddContent?.(playlist)}
                onEdit={() => setEditOpen(true)}
                onRemove={handleRemove}
              />
            )}
            {shareEntity && (
              <ShareSheet item={shareEntity} onClose={() => setShareEntity(null)}/>
            )}
            {editOpen && (
              <EditPlaylistSheet playlist={playlist} onClose={() => setEditOpen(false)}/>
            )}
          </>
        );
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(sheets, overlayRoot)
          : sheets;
      })()}
    </div>
  );
}


// ── PlaylistOptionsSheet — menú "···" sobre una playlist ──────────────────────
function PlaylistOptionsSheet({ playlist, onClose, onPlayAll, onShuffle, onShare, onAddContent, onEdit, onRemove }) {
  if (!playlist) return null;
  const accent = playlist.accent || '#3dffd1';

  const options = [
    { id: 'add-content', label: 'Agregar contenido',  desc: 'Suma items a esta playlist',         Ic: IcPlus,        accent: accent      },
    { id: 'play-all',    label: 'Reproducir todo',    desc: 'Inicia desde el primer item',       Ic: IcPlay,        accent: '#3dffd1'   },
    { id: 'shuffle',     label: 'Reproducir aleatorio', desc: 'Orden aleatorio de la cola',        Ic: IcZap,         accent: '#ffd47a'   },
    { id: 'share',       label: 'Compartir playlist', desc: 'Envía un enlace a quien quieras',   Ic: IcShare,       accent: '#9b8aff'   },
    { id: 'edit',        label: 'Editar detalles',    desc: 'Cambia título y descripción',         Ic: IcEdit,      accent: '#5dd3ff'   },
    { id: 'remove',      label: 'Quitar de biblioteca', desc: 'Se removerá de tus playlists',      Ic: IcClose,       accent: '#ff8b8b', destructive: true },
  ];

  const handleSelect = (opt) => {
    onClose();
    setTimeout(() => {
      if (opt.id === 'play-all')         onPlayAll?.();
      else if (opt.id === 'shuffle')     onShuffle?.();
      else if (opt.id === 'share')       onShare?.();
      else if (opt.id === 'add-content') onAddContent?.();
      else if (opt.id === 'edit')        onEdit?.();
      else if (opt.id === 'remove')      onRemove?.();
    }, 220);
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:140,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight:'85%', overflowY:'auto', paddingBottom:24,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'10px 22px 16px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:48, height:48, borderRadius:13, flexShrink:0,
            backgroundImage: playlist.thumbnail ? `url(${playlist.thumbnail})` : 'none',
            backgroundSize:'cover', backgroundPosition:'center',
            background: !playlist.thumbnail ? playlist.bg : undefined,
            border:`0.5px solid ${accent}40`,
            boxShadow:`0 6px 16px -6px ${accent}55`,
          }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', fontWeight:700, marginBottom:3 }}>
              Playlist
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.018em', lineHeight:1.2,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {playlist.title}
            </div>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>
              {playlist.totalVideos} videos · {playlist.totalDuration}
            </div>
          </div>
        </div>

        {/* Options list */}
        <div style={{ padding:'0 18px', display:'flex', flexDirection:'column', gap:6 }}>
          {options.map(opt => (
            <button key={opt.id} onClick={() => handleSelect(opt)} className="mtx-tap" style={{
              appearance:'none', cursor:'pointer', textAlign:'left',
              padding:'12px 14px', borderRadius:14,
              border: opt.destructive ? '0.5px solid rgba(255,140,140,0.18)' : '0.5px solid rgba(255,255,255,0.06)',
              background: opt.destructive ? 'rgba(255,140,140,0.04)' : 'rgba(255,255,255,0.025)',
              display:'flex', alignItems:'center', gap:12,
              fontFamily:'var(--ff-sans)',
              transition:'background .15s, border-color .15s',
            }}>
              <div style={{
                width:38, height:38, borderRadius:11, flexShrink:0,
                background: `linear-gradient(135deg, ${opt.accent}26, ${opt.accent}06)`,
                border: `0.5px solid ${opt.accent}40`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: opt.accent,
              }}>
                <opt.Ic size={15} stroke="currentColor" strokeWidth={1.7}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13.5, fontWeight:600,
                              color: opt.destructive ? '#ffb0b0' : 'var(--ink-1)',
                              letterSpacing:'-0.005em' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1, letterSpacing:'-0.005em' }}>
                  {opt.desc}
                </div>
              </div>
              <IcChevR size={14} stroke="var(--ink-3)" strokeWidth={1.6}/>
            </button>
          ))}
        </div>

        {/* Cancel */}
        <div style={{ padding:'14px 18px 0' }}>
          <button onClick={onClose} className="mtx-tap" style={{
            width:'100%', height:48, borderRadius:14, cursor:'pointer',
            border:'0.5px solid var(--glass-stroke)',
            background:'var(--glass-2)', color:'var(--ink-2)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── VideoOptionsSheet — menú "···" sobre un item del reproductor ─────────────
function VideoOptionsSheet({ item, playlist, currentTime, skipSeconds, onClose, onSchedule, onSaveToPlaylist, onShare, onShareMoment, onRemoveFromPlaylist, onConfigureSkip, onOpenBookmarks }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  if (!item) return null;
  const accent = item.accent || '#3dffd1';
  const isInPlaylist = !!playlist;
  const hasMoment = currentTime != null && currentTime > 0;
  const bookmarkCount = (item && window.__mtxBookmarks && window.__mtxBookmarks[item.id]) ? window.__mtxBookmarks[item.id].length : 0;

  const baseOptions = [
    { id: 'schedule', label: 'Agendar para hoy',     desc: 'Súmalo a tu ritual del día',           Ic: IcCalendar, accent: '#3dffd1' },
    { id: 'save',     label: 'Guardar en playlist',  desc: 'Añade a una de tus colecciones',       Ic: IcBookmark, accent: '#9b8aff' },
    { id: 'share',    label: 'Compartir',            desc: 'Envía un enlace a quien quieras',      Ic: IcShare,    accent: '#5dd3ff' },
  ];
  const momentOption = hasMoment ? [{
    id: 'share-moment',
    label: `Compartir desde ${_formatTime(currentTime)}`,
    desc: 'Comparte este momento exacto',
    Ic: IcClock, accent: '#FFD66B',
  }] : [];
  const playerOptions = onConfigureSkip ? [{
    id: 'configure-skip',
    label: `Saltos de ${skipSeconds || 15} seg`,
    desc: 'Cambia la duración de ◀ y ▶',
    Ic: IcGauge, accent: '#3dffd1',
  }] : [];
  const bookmarksOption = (onOpenBookmarks && bookmarkCount > 0) ? [{
    id: 'bookmarks',
    label: `Ver ${bookmarkCount} ${bookmarkCount === 1 ? 'marcador' : 'marcadores'}`,
    desc: 'Salta a un momento guardado',
    Ic: IcBookmarkFill, accent: '#9bd45e',
  }] : [];
  const playlistOptions = isInPlaylist ? [
    { id: 'remove', label: `Quitar de "${playlist.title.length > 22 ? playlist.title.slice(0, 22) + '…' : playlist.title}"`,
      desc: 'Lo removerá solo de esta playlist', Ic: IcClose, accent: '#ff8b8b', destructive: true },
  ] : [];

  const options = [...baseOptions, ...momentOption, ...bookmarksOption, ...playerOptions, ...playlistOptions];

  const handleSelect = (opt) => {
    if (opt.id === 'schedule') { onSchedule?.(item); }
    else if (opt.id === 'save') { onSaveToPlaylist?.(item); }
    else if (opt.id === 'share') { onShare?.(item); }
    else if (opt.id === 'share-moment') {
      onShareMoment?.(item, currentTime);
    }
    else if (opt.id === 'configure-skip') {
      onConfigureSkip?.();
    }
    else if (opt.id === 'bookmarks') {
      onOpenBookmarks?.();
    }
    else if (opt.id === 'remove') {
      onRemoveFromPlaylist?.(item, playlist);
      toast.show({ message: `Removido de "${playlist.title}"`, duration: 1800 });
    }
    setTimeout(onClose, 200);
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:160,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight:'85%', overflowY:'auto', paddingBottom:24,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'10px 22px 16px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:48, height:48, borderRadius:13, flexShrink:0,
            backgroundImage: item.cover ? `url(${item.cover})` : 'none',
            backgroundSize:'cover', backgroundPosition:'center',
            background: !item.cover ? item.bg : undefined,
            border:`0.5px solid ${accent}40`,
            boxShadow:`0 6px 16px -6px ${accent}55`,
          }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', fontWeight:700, marginBottom:3 }}>
              {CONTENT_TYPES.find(t => t.id === item.type)?.label || item.type}
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.018em', lineHeight:1.2,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {item.title}
            </div>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>
              {item.author} · {item.dur}
            </div>
          </div>
        </div>

        {/* Options list */}
        <div style={{ padding:'0 18px', display:'flex', flexDirection:'column', gap:6 }}>
          {options.map(opt => (
            <button key={opt.id} onClick={() => handleSelect(opt)} className="mtx-tap" style={{
              appearance:'none', cursor:'pointer', textAlign:'left',
              padding:'12px 14px', borderRadius:14,
              border: opt.destructive ? '0.5px solid rgba(255,140,140,0.18)' : '0.5px solid rgba(255,255,255,0.06)',
              background: opt.destructive ? 'rgba(255,140,140,0.04)' : 'rgba(255,255,255,0.025)',
              display:'flex', alignItems:'center', gap:12,
              fontFamily:'var(--ff-sans)',
              transition:'background .15s, border-color .15s',
            }}>
              <div style={{
                width:38, height:38, borderRadius:11, flexShrink:0,
                background:`linear-gradient(135deg, ${opt.accent}26, ${opt.accent}06)`,
                border:`0.5px solid ${opt.accent}40`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: opt.accent,
              }}>
                <opt.Ic size={15} stroke="currentColor" strokeWidth={1.7}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13.5, fontWeight:600,
                              color: opt.destructive ? '#ffb0b0' : 'var(--ink-1)',
                              letterSpacing:'-0.005em',
                              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1, letterSpacing:'-0.005em' }}>
                  {opt.desc}
                </div>
              </div>
              <IcChevR size={14} stroke="var(--ink-3)" strokeWidth={1.6}/>
            </button>
          ))}
        </div>

        {/* Cancel */}
        <div style={{ padding:'14px 18px 0' }}>
          <button onClick={onClose} className="mtx-tap" style={{
            width:'100%', height:48, borderRadius:14, cursor:'pointer',
            border:'0.5px solid var(--glass-stroke)',
            background:'var(--glass-2)', color:'var(--ink-2)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SelectableContentCard — card de contenido con checkbox flotante ─────────
function SelectableContentCard({ item, checked, onToggle, accentTone = '#3dffd1' }) {
  const accent = item.accent || '#3dffd1';
  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.(); } }}
      className="mtx-glass mtx-tap"
      style={{
        width:'100%', minWidth:0, boxSizing:'border-box',
        borderRadius:18, overflow:'hidden', cursor:'pointer',
        border: checked ? `0.5px solid ${accentTone}55` : '0.5px solid var(--glass-stroke)',
        background:'var(--glass-1)',
        boxShadow: checked
          ? `0 0 0 2px ${accentTone}66, 0 12px 28px -12px ${accentTone}55`
          : 'var(--shadow-card)',
        position:'relative',
        transition:'box-shadow .2s, border-color .2s',
      }}
    >
      {/* Cover */}
      <div style={{
        height:150, position:'relative', overflow:'hidden',
        display:'flex', alignItems:'flex-end', padding:12,
        background:item.bg,
      }}>
        {item.cover && (
          <img src={item.cover} alt="" loading="lazy" style={{
            position:'absolute', inset:0,
            width:'100%', height:'100%', objectFit:'cover',
            opacity: 0.78, filter:'saturate(0.9) contrast(1.05)',
          }}/>
        )}
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.6) 100%)' }}/>
        <div style={{ position:'absolute', inset:0,
          background:`linear-gradient(135deg, ${item.accent}22, transparent 60%)`,
          mixBlendMode:'soft-light' }}/>

        {/* Top-left: kind tag */}
        <div style={{
          position:'absolute', top:10, left:10, zIndex:2,
          fontSize:9, fontWeight:700, letterSpacing:'0.12em',
          textTransform:'uppercase', color:item.accent,
          padding:'3px 8px', borderRadius:999,
          background:'rgba(0,0,0,0.5)',
          backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
          border:`0.5px solid ${item.accent}40`,
        }}>
          {CONTENT_TYPES.find(t => t.id === item.type)?.label || item.type}
        </div>

        {/* Top-right: checkbox flotante */}
        <div style={{
          position:'absolute', top:10, right:10, zIndex:5,
          width:28, height:28, borderRadius:'50%',
          background: checked ? accentTone : 'rgba(0,0,0,0.55)',
          border: checked ? `1.5px solid ${accentTone}` : '1.5px solid rgba(255,255,255,0.5)',
          backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#0a1410',
          boxShadow: checked ? `0 0 14px ${accentTone}88` : '0 2px 6px rgba(0,0,0,0.3)',
          transition:'background .15s, border-color .15s, box-shadow .2s',
        }}>
          {checked && <IcCheck size={15} stroke="currentColor" strokeWidth={3}/>}
        </div>

        {/* Bottom-left: duration */}
        <div style={{
          position:'relative', zIndex:2,
          display:'inline-flex', alignItems:'center', gap:5,
          padding:'3px 8px', borderRadius:6,
          background:'rgba(0,0,0,0.5)', backdropFilter:'blur(6px)',
          fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.9)',
          fontVariantNumeric:'tabular-nums', letterSpacing:'0.02em',
        }}>
          <IcClock size={9} stroke="currentColor"/>
          {item.dur}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:'12px 14px' }}>
        <div style={{
          fontSize:13, fontWeight:700, color:'var(--ink-1)',
          letterSpacing:'-0.01em', lineHeight:1.25,
          overflow:'hidden', textOverflow:'ellipsis',
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
          marginBottom:4, minHeight:32,
        }}>
          {item.title}
        </div>
        <div style={{
          fontSize:11, color:'var(--ink-3)',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>
          {item.author}
        </div>
      </div>
    </div>
  );
}

// ── AddContentScreen — pantalla full para agregar items a una playlist ───────
function AddContentScreen({ playlist, onBack, footerBottomOffset = 96 }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const [filterType, setFilterType] = React.useState('all');
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState(() => new Set());

  const currentItems = React.useMemo(() => _resolvePlaylistItems(playlist), [playlist?.id]);
  const currentIds = React.useMemo(() => new Set(currentItems.map(i => i.id)), [currentItems]);

  const allAvailable = React.useMemo(
    () => EXPLORE_CONTENT.filter(c => c.status === 'available' && !currentIds.has(c.id)),
    [currentIds]
  );

  const filteredItems = React.useMemo(() => {
    let items = allAvailable;
    if (filterType !== 'all') items = items.filter(c => c.type === filterType);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        (c.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return items;
  }, [allAvailable, filterType, query]);

  if (!playlist) return null;
  const accent = playlist.accent || '#3dffd1';

  const toggleItem = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const handleAdd = () => {
    const count = selected.size;
    if (count === 0) return;
    // Hook para hosts que NO usan el modelo de mutar _extraItemIds — p.ej.
    // el ritual del día (HomeActive) que tiene su propio store en
    // window.__mtxRitual y necesita que cada id seleccionado se persista
    // ahí. Si la playlist define _customAdd, lo invoca con la lista de ids
    // y omite la mutación default.
    if (typeof playlist._customAdd === 'function') {
      playlist._customAdd(Array.from(selected));
    } else {
      if (!Array.isArray(playlist._extraItemIds)) playlist._extraItemIds = [];
      selected.forEach(id => { if (!playlist._extraItemIds.includes(id)) playlist._extraItemIds.push(id); });
      playlist.totalVideos = (playlist.totalVideos || 0) + count;
    }
    toast.show({ message: `${count} ${count === 1 ? 'item agregado' : 'items agregados'} a "${playlist.title}"`, duration: 2000 });
    setTimeout(onBack, 300);
  };

  // Filtro por tipo limitado a tipos que tienen disponibles
  const availableTypes = React.useMemo(() => {
    const set = new Set(allAvailable.map(c => c.type));
    return CONTENT_TYPES.filter(t => t.id === 'all' || set.has(t.id));
  }, [allAvailable]);

  return (
    <div style={{
      paddingBottom: selected.size > 0 ? 80 : 28,
      animation:'mtxNotifInFull .35s cubic-bezier(.25,.8,.25,1) both',
    }}>
      {/* Nav bar */}
      <div style={{
        paddingTop:48, paddingLeft:16, paddingRight:16, paddingBottom:10,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexShrink:0, position:'relative',
      }}>
        <button onClick={onBack} aria-label="Volver" className="mtx-tap" style={{
          width:40, height:40, borderRadius:999, border:0,
          background:'rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--ink-1)', cursor:'pointer', position:'relative', zIndex:2,
        }}>
          <IcChevL size={20} stroke="currentColor" strokeWidth={2}/>
        </button>
        <div style={{
          position:'absolute', left:'50%', top:'50%',
          transform:'translate(-50%, calc(-50% + 19px))',
          fontSize:16, fontWeight:700, color:'var(--ink-1)',
          letterSpacing:'-0.015em', fontFamily:'var(--ff-sans)',
          pointerEvents:'none',
          maxWidth:'58%',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          textAlign:'center',
        }}>
          Agregar a {playlist.title}
        </div>
        <button onClick={() => setSearchOpen(s => !s)} aria-label="Buscar" className="mtx-tap" style={{
          width:40, height:40, borderRadius:999, cursor:'pointer',
          border:0,
          background: searchOpen ? `${accent}18` : 'rgba(255,255,255,0.06)',
          color: searchOpen ? accent : 'var(--ink-1)',
          display:'flex', alignItems:'center', justifyContent:'center',
          position:'relative', zIndex:2,
          transition:'background .2s, color .2s',
        }}>
          <IcSearch size={17} stroke="currentColor" strokeWidth={1.8}/>
        </button>
      </div>

      {/* Subtitle */}
      <div style={{ padding:'4px 22px 14px', textAlign:'center' }}>
        <div style={{ fontSize:12.5, color:'var(--ink-3)' }}>
          <span style={{ color:'var(--neon)', fontWeight:600 }}>{filteredItems.length}</span> {filteredItems.length === 1 ? 'disponible' : 'disponibles'}
          {selected.size > 0 && (
            <> · <span style={{ color: accent, fontWeight:600 }}>{selected.size} seleccionado{selected.size === 1 ? '' : 's'}</span></>
          )}
        </div>
      </div>

      {/* Search input (collapsible) */}
      {searchOpen && (
        <div style={{ padding:'0 20px 12px', animation:'mtx-fade-up .2s ease' }}>
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'11px 14px', borderRadius:14,
            background:'rgba(0,0,0,0.32)',
            border:`0.5px solid ${query ? accent + '40' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: query ? `inset 0 0 0 1px ${accent}22, 0 0 0 3px ${accent}10` : 'none',
            transition:'border-color .2s, box-shadow .25s',
          }}>
            <IcSearch size={15} stroke={query ? accent : 'var(--ink-3)'} strokeWidth={1.8}/>
            <input
              autoFocus
              type="text"
              placeholder="Buscar por título, autor o tema…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setQuery(''); setSearchOpen(false); } }}
              style={{
                appearance:'none', flex:1, minWidth:0,
                border:0, outline:'none',
                background:'transparent',
                color:'var(--ink-1)', fontSize:14, fontWeight:500,
                fontFamily:'var(--ff-sans)', letterSpacing:'-0.005em',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} className="mtx-tap" style={{
                width:22, height:22, borderRadius:'50%', border:0,
                background:'rgba(255,255,255,0.08)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--ink-3)', cursor:'pointer',
              }}>
                <IcClose size={11} stroke="currentColor" strokeWidth={2.2}/>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Type filters (sticky-ish, just normal scroll-x) */}
      <ContentTypeFilters value={filterType} onChange={setFilterType}/>

      {/* Grid */}
      <div style={{ padding:'14px 18px 0' }}>
        {filteredItems.length === 0 ? (
          <div style={{ padding:'56px 28px', textAlign:'center' }}>
            <div style={{
              width:64, height:64, borderRadius:20, margin:'0 auto 14px',
              background:'rgba(255,255,255,0.04)',
              border:'0.5px solid rgba(255,255,255,0.08)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--ink-3)',
            }}>
              <IcSearch size={22} stroke="currentColor" strokeWidth={1.5}/>
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--ink-1)', marginBottom:6 }}>
              {query.trim() ? 'Sin resultados' : 'Nada disponible'}
            </div>
            <div style={{ fontSize:12, color:'var(--ink-3)', maxWidth:240, margin:'0 auto', lineHeight:1.5 }}>
              {query.trim()
                ? 'No encontramos contenido que coincida con tu búsqueda.'
                : 'Esta playlist ya incluye todos los items de este tipo.'}
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {filteredItems.map(it => (
              <SelectableContentCard
                key={it.id}
                item={it}
                checked={selected.has(it.id)}
                onToggle={() => toggleItem(it.id)}
                accentTone={accent}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky footer — flota sobre el contenido, encima de la tab bar.
          zIndex 245 para aparecer también encima del ActivityRunnerOverlay
          (z=200), queue sheet (z=230), AddContentScreen wrapper (z=235) y
          PlaylistSwitcherSheet (z=240) cuando AddContentScreen está montado
          dentro del runner. Solo se renderiza con selected.size>0, así que
          no tapa nada en flujos sin selección.
          footerBottomOffset (default 96) controla la separación inferior:
          en explore normal queda encima del tab bar (78+18=96); cuando el
          AddContent se monta desde el runner sin mini player, baja a ~24;
          con mini player se mantiene en 96 para no solaparlo. */}
      {selected.size > 0 && (() => {
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const footer = (
          <div style={{
            position:'absolute', left:12, right:12, bottom: footerBottomOffset, zIndex:245,
            padding:'10px',
            borderRadius:18,
            background:'rgba(12,15,14,0.88)',
            backdropFilter:'blur(28px) saturate(140%)',
            WebkitBackdropFilter:'blur(28px) saturate(140%)',
            border:'0.5px solid rgba(255,255,255,0.1)',
            boxShadow:'0 -8px 24px -10px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
            display:'flex', gap:8,
            animation:'mtx-fade-up .25s ease',
            pointerEvents:'auto',
          }}>
            <button onClick={() => setSelected(new Set())} className="mtx-tap" style={{
              flex:0.7, height:46, borderRadius:12, cursor:'pointer',
              border:'0.5px solid rgba(255,255,255,0.08)',
              background:'rgba(255,255,255,0.04)',
              color:'var(--ink-2)',
              fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
              letterSpacing:'-0.005em',
            }}>
              Limpiar
            </button>
            <button onClick={handleAdd} className="mtx-tap" style={{
              flex:1.7, height:46, borderRadius:12, cursor:'pointer',
              border:0,
              background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
              color:'#0a1410', fontSize:13.5, fontWeight:700,
              fontFamily:'var(--ff-sans)', letterSpacing:'-0.005em',
              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
              boxShadow:'0 0 0 1px rgba(61,255,209,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}>
              <IcPlus size={13} stroke="currentColor" strokeWidth={2.4}/>
              Agregar {selected.size} {selected.size === 1 ? 'item' : 'items'}
            </button>
          </div>
        );
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(footer, overlayRoot)
          : footer;
      })()}
    </div>
  );
}

// ── AddContentToPlaylistSheet (legacy, sin uso) — agregar items a una playlist
function AddContentToPlaylistSheet({ playlist, onClose }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const [selected, setSelected] = React.useState(() => new Set());

  const currentItems = React.useMemo(() => _resolvePlaylistItems(playlist), [playlist?.id]);
  const currentIds = React.useMemo(() => new Set(currentItems.map(i => i.id)), [currentItems]);
  const availableItems = React.useMemo(
    () => EXPLORE_CONTENT.filter(c => c.status === 'available' && !currentIds.has(c.id)),
    [currentIds]
  );

  if (!playlist) return null;
  const accent = playlist.accent || '#3dffd1';

  const toggleItem = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const count = selected.size;
    if (count === 0) return;
    // Mock: persist en memoria (mutación directa porque EXPLORE_PLAYLISTS es módulo)
    if (!Array.isArray(playlist._extraItemIds)) playlist._extraItemIds = [];
    selected.forEach(id => { if (!playlist._extraItemIds.includes(id)) playlist._extraItemIds.push(id); });
    playlist.totalVideos = (playlist.totalVideos || 0) + count;
    toast.show({ message: `${count} ${count === 1 ? 'item agregado' : 'items agregados'} a "${playlist.title}"`, duration: 2000 });
    setTimeout(onClose, 250);
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:160,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight:'88%',
        display:'flex', flexDirection:'column',
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6, flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'10px 22px 14px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <div style={{
            width:44, height:44, borderRadius:13, flexShrink:0,
            backgroundImage: playlist.thumbnail ? `url(${playlist.thumbnail})` : 'none',
            backgroundSize:'cover', backgroundPosition:'center',
            background: !playlist.thumbnail ? playlist.bg : undefined,
            border:`0.5px solid ${accent}40`,
            boxShadow:`0 6px 16px -6px ${accent}55`,
          }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', fontWeight:700, marginBottom:3 }}>
              Agregar a
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.018em', lineHeight:1.2,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {playlist.title}
            </div>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>
              {availableItems.length} disponibles · {selected.size} seleccionado{selected.size === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Items list — scrollable */}
        <div className="mtx-no-scrollbar" style={{ flex:1, overflowY:'auto', padding:'0 18px 14px' }}>
          {availableItems.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center' }}>
              <div style={{ fontSize:14, color:'var(--ink-2)', fontWeight:600, marginBottom:6 }}>
                Todo el contenido ya está añadido
              </div>
              <div style={{ fontSize:12, color:'var(--ink-3)' }}>
                Esta playlist ya incluye todos los items disponibles.
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {availableItems.map(it => {
                const checked = selected.has(it.id);
                const itemAccent = it.accent || '#3dffd1';
                return (
                  <button key={it.id} onClick={() => toggleItem(it.id)} className="mtx-tap" style={{
                    appearance:'none', cursor:'pointer', textAlign:'left',
                    padding:'10px 12px', borderRadius:14,
                    border: checked ? `0.5px solid ${accent}55` : '0.5px solid rgba(255,255,255,0.06)',
                    background: checked ? `linear-gradient(180deg, ${accent}10, ${accent}03)` : 'rgba(255,255,255,0.025)',
                    display:'flex', alignItems:'center', gap:11,
                    fontFamily:'var(--ff-sans)',
                    transition:'background .18s, border-color .18s',
                  }}>
                    <div style={{
                      width:46, height:46, borderRadius:11, flexShrink:0,
                      backgroundImage: it.cover ? `url(${it.cover})` : 'none',
                      backgroundSize:'cover', backgroundPosition:'center',
                      background: !it.cover ? it.bg : undefined,
                      border:`0.5px solid ${itemAccent}33`,
                    }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--ink-1)', letterSpacing:'-0.005em',
                                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {it.title}
                      </div>
                      <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2,
                                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {it.author} · {it.dur}
                      </div>
                    </div>
                    <div style={{
                      width:22, height:22, borderRadius:'50%',
                      border: checked ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.22)',
                      background: checked ? accent : 'transparent',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#0a1410', flexShrink:0,
                      boxShadow: checked ? `0 0 10px ${accent}66` : 'none',
                      transition:'background .15s, border-color .15s, box-shadow .2s',
                    }}>
                      {checked && <IcCheck size={12} stroke="currentColor" strokeWidth={3}/>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer CTAs */}
        <div style={{ padding:'10px 18px 24px', display:'flex', gap:10, flexShrink:0,
                      borderTop:'0.5px solid rgba(255,255,255,0.05)',
                      background:'linear-gradient(180deg, rgba(15,19,18,0) 0%, rgba(15,19,18,0.6) 50%)' }}>
          <button onClick={onClose} className="mtx-tap" style={{
            flex:1, height:50, borderRadius:14, cursor:'pointer',
            border:'0.5px solid var(--glass-stroke)',
            background:'var(--glass-2)', color:'var(--ink-2)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}>
            Cancelar
          </button>
          <button onClick={handleAdd} disabled={selected.size === 0} className="mtx-tap" style={{
            flex:1.6, height:50, borderRadius:14,
            cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
            border:0,
            background: selected.size === 0
              ? 'rgba(255,255,255,0.06)'
              : 'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
            color: selected.size === 0 ? 'var(--ink-3)' : '#0a1410',
            fontSize:14, fontWeight:700, fontFamily:'var(--ff-sans)',
            letterSpacing:'-0.005em',
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
            boxShadow: selected.size === 0
              ? 'none'
              : '0 0 0 1px rgba(61,255,209,0.4), 0 12px 28px -8px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
            transition:'background .25s, box-shadow .3s',
          }}>
            <IcPlus size={14} stroke="currentColor" strokeWidth={2.4}/>
            {selected.size === 0 ? 'Agregar' : `Agregar ${selected.size} ${selected.size === 1 ? 'item' : 'items'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EditPlaylistSheet — editar título y descripción de una playlist ──────────
function EditPlaylistSheet({ playlist, onClose }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const [title, setTitle] = React.useState(playlist?.title || '');
  const [desc, setDesc] = React.useState(playlist?.desc || '');
  const titleRef = React.useRef(null);

  React.useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 320);
    return () => clearTimeout(t);
  }, []);

  if (!playlist) return null;
  const accent = playlist.accent || '#3dffd1';
  const dirty = title.trim() !== (playlist.title || '') || desc.trim() !== (playlist.desc || '');
  const valid = title.trim().length > 0;

  const handleSave = () => {
    if (!valid || !dirty) return;
    playlist.title = title.trim();
    playlist.desc = desc.trim();
    toast.show({ message: 'Cambios guardados', duration: 1800 });
    setTimeout(onClose, 200);
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:160,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight:'88%', overflowY:'auto', paddingBottom:24,
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header iconográfico */}
        <div style={{ padding:'14px 22px 18px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:44, height:44, borderRadius:14,
            background:`linear-gradient(135deg, ${accent}33, ${accent}0c)`,
            border:`0.5px solid ${accent}55`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: accent, flexShrink:0,
            boxShadow:`inset 0 1px 0 rgba(255,255,255,0.1), 0 0 14px ${accent}26`,
          }}>
            <IcEdit size={18} stroke="currentColor"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', fontWeight:700, marginBottom:3 }}>
              Editar playlist
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', lineHeight:1.15 }}>
              Detalles
            </div>
            <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:2, letterSpacing:'-0.005em' }}>
              Cambia título y descripción
            </div>
          </div>
        </div>

        {/* Title field */}
        <div style={{ padding:'0 22px', marginBottom:14 }}>
          <label style={{ display:'block', fontSize:10.5, fontWeight:700, color:'var(--ink-3)',
                          letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>
            Título
          </label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            maxLength={80}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
            style={{
              appearance:'none', width:'100%', minWidth:0, boxSizing:'border-box',
              padding:'13px 14px', borderRadius:12,
              background:'rgba(0,0,0,0.32)',
              border: title.trim() ? `0.5px solid ${accent}40` : '0.5px solid rgba(255,255,255,0.08)',
              color:'var(--ink-1)', fontSize:14, fontWeight:500,
              fontFamily:'var(--ff-sans)', outline:'none',
              letterSpacing:'-0.005em',
              boxShadow: title.trim()
                ? `inset 0 0 0 1px ${accent}28, 0 0 0 3px ${accent}10`
                : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              transition:'border-color .2s, box-shadow .25s',
            }}
          />
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:5,
                        fontSize:10, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
            {title.length}/80
          </div>
        </div>

        {/* Description field */}
        <div style={{ padding:'0 22px', marginBottom:18 }}>
          <label style={{ display:'block', fontSize:10.5, fontWeight:700, color:'var(--ink-3)',
                          letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>
            Descripción
          </label>
          <textarea
            value={desc}
            maxLength={240}
            onChange={e => setDesc(e.target.value)}
            placeholder="Describe esta colección…"
            rows={4}
            style={{
              appearance:'none', width:'100%', minWidth:0, boxSizing:'border-box',
              padding:'12px 14px', borderRadius:12,
              background:'rgba(0,0,0,0.32)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              color:'var(--ink-1)', fontSize:13, fontWeight:500,
              fontFamily:'var(--ff-sans)', outline:'none',
              letterSpacing:'-0.005em', lineHeight:1.45, resize:'none',
              boxShadow:'inset 0 1px 0 rgba(255,255,255,0.03)',
              transition:'border-color .2s',
            }}
          />
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:5,
                        fontSize:10, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
            {desc.length}/240
          </div>
        </div>

        {/* CTAs */}
        <div style={{ padding:'0 22px', display:'flex', gap:10 }}>
          <button onClick={onClose} className="mtx-tap" style={{
            flex:1, height:50, borderRadius:14, cursor:'pointer',
            border:'0.5px solid var(--glass-stroke)',
            background:'var(--glass-2)', color:'var(--ink-2)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!valid || !dirty} className="mtx-tap" style={{
            flex:1.5, height:50, borderRadius:14,
            cursor: (valid && dirty) ? 'pointer' : 'not-allowed',
            border:0,
            background: (valid && dirty)
              ? 'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))'
              : 'rgba(255,255,255,0.06)',
            color: (valid && dirty) ? '#0a1410' : 'var(--ink-3)',
            fontSize:14, fontWeight:700, fontFamily:'var(--ff-sans)',
            letterSpacing:'-0.005em',
            boxShadow: (valid && dirty)
              ? '0 0 0 1px rgba(61,255,209,0.4), 0 12px 28px -8px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)'
              : 'none',
            transition:'background .25s, box-shadow .3s',
          }}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PlaylistQueueSheet — bottom sheet con la cola del player ─────────────────
// ── SwipeableQueueRow — row con gestos pointer + acciones reveladas ──────────
function SwipeableQueueRow({ item, index, isPlaying, accent, isOpen, onOpenChange, onSelect, onShare, onRemove }) {
  const ACTIONS_WIDTH = 140; // 2 botones × ~64px + gap
  const [swipeX, setSwipeX] = React.useState(isOpen ? -ACTIONS_WIDTH : 0);
  const [dragging, setDragging] = React.useState(false);
  const startX = React.useRef(0);
  const startSwipeX = React.useRef(0);
  const moved = React.useRef(false);
  const activeRef = React.useRef(false);

  React.useEffect(() => {
    if (!dragging) setSwipeX(isOpen ? -ACTIONS_WIDTH : 0);
  }, [isOpen, dragging]);

  const onPointerDown = (e) => {
    startX.current = e.clientX;
    startSwipeX.current = swipeX;
    activeRef.current = true;
    moved.current = false;
    setDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onPointerMove = (e) => {
    if (!activeRef.current) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 5) moved.current = true;
    const next = Math.max(-ACTIONS_WIDTH, Math.min(0, startSwipeX.current + dx));
    setSwipeX(next);
  };
  const onPointerUp = () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setDragging(false);
    const shouldOpen = swipeX < -ACTIONS_WIDTH * 0.4;
    setSwipeX(shouldOpen ? -ACTIONS_WIDTH : 0);
    onOpenChange?.(shouldOpen);
  };

  const handleRowClick = () => {
    if (moved.current) return; // no fue tap, fue swipe
    if (isOpen) { onOpenChange?.(false); return; }
    onSelect?.(item, index);
  };

  const itemAccent = item.accent || accent || '#3dffd1';

  return (
    <div style={{ position:'relative', borderRadius:14, overflow:'hidden', isolation:'isolate' }}>
      {/* Acciones reveladas (debajo del row) */}
      <div style={{
        position:'absolute', top:0, right:0, bottom:0,
        width:140,
        display:'flex', alignItems:'stretch', gap:6, padding:'4px',
        zIndex:1,
      }}>
        <button onClick={(e) => { e.stopPropagation(); onShare?.(item); onOpenChange?.(false); }} className="mtx-tap" aria-label="Compartir" style={{
          flex:1, borderRadius:11, border:0, cursor:'pointer',
          background:'linear-gradient(180deg, rgba(155,138,255,0.22), rgba(155,138,255,0.08))',
          color:'#b9a8ff',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3,
          fontSize:9.5, fontWeight:700, fontFamily:'var(--ff-sans)', letterSpacing:'0.04em',
          boxShadow:'inset 0 0 0 0.5px rgba(155,138,255,0.35)',
        }}>
          <IcShare size={15} stroke="currentColor" strokeWidth={1.7}/>
          Compartir
        </button>
        <button onClick={(e) => { e.stopPropagation(); onRemove?.(item, index); onOpenChange?.(false); }} className="mtx-tap" aria-label="Eliminar" style={{
          flex:1, borderRadius:11, border:0, cursor:'pointer',
          background:'linear-gradient(180deg, rgba(255,140,140,0.24), rgba(255,140,140,0.08))',
          color:'#ffb0b0',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3,
          fontSize:9.5, fontWeight:700, fontFamily:'var(--ff-sans)', letterSpacing:'0.04em',
          boxShadow:'inset 0 0 0 0.5px rgba(255,140,140,0.35)',
        }}>
          <IcClose size={15} stroke="currentColor" strokeWidth={2.2}/>
          Quitar
        </button>
      </div>

      {/* Row foreground (la card real) — se desliza para revelar acciones */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={handleRowClick}
        style={{
          position:'relative', zIndex:2,
          transform:`translateX(${swipeX}px)`,
          transition: dragging ? 'none' : 'transform .28s cubic-bezier(.25,.8,.25,1)',
          touchAction:'pan-y',
          cursor:'grab',
        }}
      >
        <div style={{
          display:'flex', alignItems:'center', gap:11,
          padding:'10px 12px',
          borderRadius:14,
          // Base sólida + overlay glass para que los botones detrás NO se transparenten
          backgroundColor:'#171a19',
          backgroundImage: isPlaying
            ? `linear-gradient(180deg, ${itemAccent}1a, ${itemAccent}06)`
            : 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))',
          border: isPlaying ? `0.5px solid ${itemAccent}55` : '0.5px solid rgba(255,255,255,0.06)',
          boxShadow: isPlaying ? `inset 0 0 14px ${itemAccent}10` : 'none',
          fontFamily:'var(--ff-sans)',
        }}>
          {/* Index / playing indicator */}
          <div style={{
            width:28, height:28, borderRadius:8, flexShrink:0,
            background: isPlaying ? itemAccent : 'rgba(255,255,255,0.05)',
            color: isPlaying ? '#0a1410' : 'var(--ink-3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:700, fontVariantNumeric:'tabular-nums',
            boxShadow: isPlaying ? `0 0 10px ${itemAccent}66` : 'none',
          }}>
            {isPlaying
              ? <IcPlay size={11} stroke="currentColor"/>
              : String(index + 1).padStart(2, '0')}
          </div>

          {/* Cover — img con fallback de color sólido (resistente a 404 de Unsplash) */}
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
                opacity: 0.92,
              }}/>
            )}
            <div style={{
              position:'absolute', inset:0,
              background:`linear-gradient(135deg, ${itemAccent}1c, transparent 60%)`,
              mixBlendMode:'soft-light', pointerEvents:'none',
            }}/>
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{
              fontSize:13, fontWeight:600,
              color: isPlaying ? itemAccent : 'var(--ink-1)',
              letterSpacing:'-0.005em',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {item.title}
            </div>
            <div style={{
              fontSize:11, color:'var(--ink-3)', marginTop:1,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {item.author} · {item.dur}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MtxAddMoreCard — neon dashed CTA reutilizable ────────────────────────────
// Antes: vivía inline dentro de PlaylistQueueSheet. Extraído para que el
// HomeActive lo pueda montar abajo del ritual del día con el mismo diseño
// y sin duplicar JSX. El click handler queda libre (cada host decide si
// abre el AddContentScreen, dispatcha un evento, etc.).
function MtxAddMoreCard({
  onClick,
  title = 'Agregar más contenido',
  subtitle = 'Explora y suma items a tu cola',
}) {
  return (
    <button onClick={onClick} className="mtx-tap" style={{
      appearance:'none', cursor:'pointer', textAlign:'left',
      width:'100%', minWidth:0, boxSizing:'border-box',
      marginTop:4, padding:'13px 14px',
      borderRadius:14,
      border:'1px dashed rgba(61,255,209,0.34)',
      background:'linear-gradient(165deg, rgba(61,255,209,0.05) 0%, rgba(61,255,209,0.012) 70%)',
      boxShadow:'inset 0 0 22px rgba(61,255,209,0.05)',
      display:'flex', alignItems:'center', gap:11,
      fontFamily:'var(--ff-sans)',
      position:'relative', overflow:'hidden',
      transition:'background .25s, border-color .25s, transform .15s',
    }}>
      {/* Decorative halo */}
      <div style={{
        position:'absolute', top:-22, right:-22,
        width:78, height:78, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(61,255,209,0.22) 0%, transparent 65%)',
        pointerEvents:'none',
      }}/>

      {/* Plus tile */}
      <div style={{
        width:40, height:40, borderRadius:11, flexShrink:0,
        background:'linear-gradient(135deg, rgba(61,255,209,0.26), rgba(61,255,209,0.06))',
        border:'0.5px solid rgba(61,255,209,0.45)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'var(--neon)',
        boxShadow:'0 0 16px rgba(61,255,209,0.22), inset 0 1px 0 rgba(255,255,255,0.12)',
        position:'relative', zIndex:1,
      }}>
        <IcPlus size={16} stroke="currentColor" strokeWidth={2.4}/>
      </div>

      <div style={{ flex:1, minWidth:0, position:'relative', zIndex:1 }}>
        <div style={{
          fontSize:13, fontWeight:700, color:'var(--neon)',
          letterSpacing:'-0.01em', lineHeight:1.2, marginBottom:2,
        }}>
          {title}
        </div>
        <div style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'-0.005em' }}>
          {subtitle}
        </div>
      </div>

      <IcChevR size={14} stroke="var(--ink-3)" strokeWidth={1.8} style={{ position:'relative', zIndex:1 }}/>
    </button>
  );
}

function PlaylistQueueSheet({ playlist, items, currentIndex, onSelect, onClose, onShareItem, onRemoveItem, onAddMore, onSwitch }) {
  const [openRowId, setOpenRowId] = React.useState(null);
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  if (!playlist) return null;
  const accent = playlist.accent || '#3dffd1';
  const isEmpty = !items || items.length === 0;

  // Si onSwitch no se pasó como prop, usamos el store global directamente.
  // Eso simplifica el cableo: ningún consumer del PlaylistQueueSheet tiene
  // que pasar el handler — el botón "Cambiar playlist" siempre funciona.
  const handleSwitch = onSwitch || (() => {
    if (typeof window !== 'undefined' && window.__mtxActiveQueue) {
      window.__mtxActiveQueue.openSwitcher();
      onClose?.();
    }
  });

  const handleShare = (item) => {
    if (onShareItem) onShareItem(item);
    else toast.show({ message: 'Enlace copiado al portapapeles', duration: 1700 });
  };
  const handleRemove = (item, index) => {
    if (onRemoveItem) onRemoveItem(item, index);
    else toast.show({ message: `"${item.title}" removido de la cola`, duration: 1700 });
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:160,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.55)',
      backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight:'85%', overflowY:'auto',
        paddingBottom:24,
        boxShadow:'0 -20px 60px -12px rgba(0,0,0,0.6)',
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:14, paddingBottom:10 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'4px 22px 8px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, marginBottom:4, letterSpacing:'0.14em' }}>
              {playlist._eyebrowOverride
                || (playlist.isWatchLater ? 'Tu cola personal' : 'Cola de reproducción')}
            </div>
            <h2 style={{
              margin:0, fontSize:18, fontWeight:700, color:'var(--ink-1)',
              letterSpacing:'-0.02em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {playlist.title}
            </h2>
            <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>
              {currentIndex >= 0 && (
                <>
                  <span style={{ color:accent, fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{currentIndex + 1}</span>
                  {' '}de {items.length}
                  {playlist.totalDuration ? ` · ${playlist.totalDuration}` : ''}
                </>
              )}
              {currentIndex < 0 && `${items.length} ${items.length === 1 ? 'item' : 'items'}${playlist.totalDuration ? ` · ${playlist.totalDuration}` : ''}`}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="mtx-tap" style={{
            width:36, height:36, borderRadius:999, border:0, cursor:'pointer',
            background:'rgba(255,255,255,0.06)',
            color:'var(--ink-1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0,
          }}>
            <IcClose size={16} stroke="currentColor"/>
          </button>
        </div>

        {/* Hint de swipe — solo cuando hay items */}
        {!isEmpty && (
          <div style={{ padding:'0 22px 12px' }}>
            <div style={{
              fontSize:10.5, color:'var(--ink-3)', letterSpacing:'-0.005em',
              display:'flex', alignItems:'center', gap:5,
            }}>
              <IcChevL size={10} stroke="currentColor" strokeWidth={2}/>
              Desliza un item para más opciones
            </div>
          </div>
        )}

        {/* Empty state — cuando la cola no tiene items */}
        {isEmpty && (
          <div style={{ padding:'8px 22px 18px' }}>
            <div style={{
              padding:'24px 18px', borderRadius:18,
              background:'rgba(255,255,255,0.03)',
              border:'0.5px dashed rgba(255,255,255,0.12)',
              textAlign:'center',
            }}>
              <div style={{
                width:44, height:44, margin:'0 auto 10px',
                borderRadius:14,
                background:`${accent}1a`,
                border:`0.5px solid ${accent}40`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color:accent,
              }}>
                <IcBookmark size={18} stroke="currentColor" strokeWidth={1.8}/>
              </div>
              <div style={{
                fontSize:14, fontWeight:700, color:'var(--ink-1)',
                letterSpacing:'-0.01em', marginBottom:4,
              }}>
                Aún no hay nada aquí
              </div>
              <div style={{ fontSize:12, color:'var(--ink-3)', lineHeight:1.5, maxWidth:260, margin:'0 auto' }}>
                Suma contenido para crear tu cola, o cambia a otra playlist.
              </div>
            </div>
          </div>
        )}

        {/* Items con swipe */}
        <div style={{ padding:'0 18px', display:'flex', flexDirection:'column', gap:6 }}>
          {items && items.map((it, i) => (
            <SwipeableQueueRow
              key={it.id}
              item={it}
              index={i}
              accent={accent}
              isPlaying={i === currentIndex}
              isOpen={openRowId === it.id}
              onOpenChange={(open) => setOpenRowId(open ? it.id : null)}
              onSelect={() => { onSelect?.(i); onClose(); }}
              onShare={handleShare}
              onRemove={handleRemove}
            />
          ))}

          {/* Add more content CTA — reusa MtxAddMoreCard. */}
          {onAddMore && <MtxAddMoreCard onClick={onAddMore}/>}

          {/* Sub-fase 0.2 · CTA "Cambiar playlist" — siempre visible cuando el
              store está disponible. Permite saltar a otra playlist o al ritual. */}
          <button onClick={handleSwitch} className="mtx-tap" style={{
            appearance:'none', cursor:'pointer', textAlign:'left',
            width:'100%', minWidth:0, boxSizing:'border-box',
            padding:'12px 14px', borderRadius:14,
            border:'0.5px solid rgba(255,255,255,0.08)',
            background:'rgba(255,255,255,0.03)',
            display:'flex', alignItems:'center', gap:11,
            fontFamily:'var(--ff-sans)',
            transition:'background .2s, border-color .2s',
          }}>
            <div style={{
              width:36, height:36, borderRadius:10, flexShrink:0,
              background:'rgba(255,255,255,0.04)',
              border:'0.5px solid rgba(255,255,255,0.08)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--ink-2)',
            }}>
              <IcList size={15} stroke="currentColor" strokeWidth={1.8}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{
                fontSize:13, fontWeight:600, color:'var(--ink-1)',
                letterSpacing:'-0.01em', marginBottom:2,
              }}>
                Elegir una playlist
              </div>
              <div style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'-0.005em' }}>
                Otra cola desde tus playlists disponibles
              </div>
            </div>
            <IcChevR size={14} stroke="var(--ink-3)" strokeWidth={1.8}/>
          </button>
        </div>
      </div>
    </div>
  );
}


// ── PlaylistSwitcherSheet — sub-fase 0.2 ─────────────────────────────────────
// Bottom sheet que aparece desde el PlaylistQueueSheet con el CTA "Cambiar
// playlist". Lista todas las playlists disponibles + el ritual del día (si
// está activo) + un item especial "Vacía / Ninguna" para limpiar el override.
//
// Tap en una playlist → llama __mtxActiveQueue.setOverride(playlist) y cierra
// los sheets. La nueva cola toma precedencia sobre ritual y default.
//
// Se monta a nivel del MentexApp via ActiveQueueSwitcherOverlay (vive en
// active-queue.jsx con state switcherOpen). Consume EXPLORE_PLAYLISTS y la
// ritualPlaylist sintética del store.
function PlaylistSwitcherSheet({ onClose }) {
  const aq = (typeof window !== 'undefined' && window.useActiveQueue)
    ? window.useActiveQueue()
    : { activePlaylist: null };
  const currentId = aq.activePlaylist?.id || null;

  // Listas: oficiales primero, después playlists de usuario, después watch-later
  // y al final "Limpiar selección" (clearOverride). El ritual del día (si está
  // activo) aparece marcado al inicio con badge especial.
  const ritualInputs = (typeof window !== 'undefined' && window.__mtxActiveQueue)
    ? window.__mtxActiveQueue._debugInputs()
    : { ritualPlaylist: null };
  const ritualPlaylist = ritualInputs.ritualPlaylist || null;

  const otherPlaylists = (window.EXPLORE_PLAYLISTS || []).filter(p => p && !p.isWatchLater);
  const watchLater = (window.EXPLORE_PLAYLISTS || []).find(p => p && p.isWatchLater) || null;

  const handlePick = (playlist) => {
    if (!window.__mtxActiveQueue) return;
    if (!playlist) {
      // "Limpiar selección" → vuelve a la jerarquía natural (ritual o watch-later)
      window.__mtxActiveQueue.clearOverride();
    } else if (ritualPlaylist && playlist.id === ritualPlaylist.id) {
      // Tap en el ritual → limpia override (el ritual ya gana naturalmente)
      window.__mtxActiveQueue.clearOverride();
    } else {
      window.__mtxActiveQueue.setOverride(playlist);
    }
    if (typeof window.__mtxActiveQueue.closeSwitcher === 'function') {
      window.__mtxActiveQueue.closeSwitcher();
    }
    onClose && onClose();
  };

  return (
    <div style={{
      // zIndex 240 para asegurar que el switcher se monta encima del queue
      // del runner (zIndex 230) y del queue normal (zIndex 160).
      position:'absolute', inset:0, zIndex:240,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.55)',
      backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="mtx-no-scrollbar" style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)', borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', maxHeight:'85%', overflowY:'auto', paddingBottom:24,
        boxShadow:'0 -20px 60px -12px rgba(0,0,0,0.6)',
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:14, paddingBottom:10 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'4px 22px 18px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--neon)', marginBottom:4, letterSpacing:'0.14em' }}>
              Cambiar cola
            </div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em' }}>
              Elige una playlist
            </h2>
            <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>
              La que elijas se vuelve tu cola personal mientras la mantengas activa.
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="mtx-tap" style={{
            width:36, height:36, borderRadius:999, border:0, cursor:'pointer',
            background:'rgba(255,255,255,0.06)', color:'var(--ink-1)',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>
            <IcClose size={16} stroke="currentColor"/>
          </button>
        </div>

        <div style={{ padding:'0 18px', display:'flex', flexDirection:'column', gap:6 }}>
          {/* Ritual del día — sólo aparece si hay sesión activa */}
          {ritualPlaylist && (
            <PlaylistSwitcherRow
              playlist={ritualPlaylist}
              isActive={currentId === ritualPlaylist.id}
              ribbon="Ritual del día"
              onClick={() => handlePick(ritualPlaylist)}
            />
          )}
          {/* Watch-later (cola personal default) */}
          {watchLater && (
            <PlaylistSwitcherRow
              playlist={watchLater}
              isActive={currentId === watchLater.id && !ritualPlaylist}
              ribbon="Por ver"
              onClick={() => handlePick(watchLater)}
            />
          )}
          {/* Resto de playlists */}
          {otherPlaylists.map(p => (
            <PlaylistSwitcherRow
              key={p.id}
              playlist={p}
              isActive={currentId === p.id}
              onClick={() => handlePick(p)}
            />
          ))}

          {/* Clear override — solo aparece si hay override activo */}
          {ritualInputs.override && (
            <button onClick={() => handlePick(null)} className="mtx-tap" style={{
              appearance:'none', cursor:'pointer', textAlign:'left',
              width:'100%', boxSizing:'border-box',
              marginTop:6, padding:'12px 14px',
              borderRadius:14,
              border:'0.5px dashed rgba(255,255,255,0.18)',
              background:'transparent',
              color:'var(--ink-3)',
              fontSize:12, fontWeight:600,
              fontFamily:'var(--ff-sans)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}>
              <IcClose size={11} stroke="currentColor" strokeWidth={2}/>
              Quitar selección manual
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaylistSwitcherRow({ playlist, isActive, ribbon, onClick }) {
  const accent = playlist.accent || '#3dffd1';
  const itemCount = (() => {
    if (Array.isArray(playlist.items)) return playlist.items.length + (playlist._extraItemIds?.length || 0);
    if (typeof playlist.totalVideos === 'number') return playlist.totalVideos;
    return 0;
  })();
  // Playlist sintética del ritual del día no tiene thumbnail — usamos un
  // icono identitario (shield + halo radial neon) en lugar de cuadro vacío.
  const isRitualSynthetic = playlist.id === 'ritual-today';
  return (
    <button onClick={onClick} className="mtx-tap" style={{
      appearance:'none', cursor:'pointer', textAlign:'left',
      width:'100%', boxSizing:'border-box',
      padding:'10px 12px', borderRadius:14,
      border: isActive ? `0.5px solid ${accent}66` : '0.5px solid rgba(255,255,255,0.06)',
      background: isActive
        ? `linear-gradient(180deg, ${accent}14, ${accent}04)`
        : 'rgba(255,255,255,0.03)',
      boxShadow: isActive ? `0 0 0 1px ${accent}28, 0 8px 22px -10px ${accent}55` : 'none',
      display:'flex', alignItems:'center', gap:11,
      fontFamily:'var(--ff-sans)',
      transition:'background .25s, border-color .25s, box-shadow .25s',
    }}>
      {/* Thumb */}
      <div style={{
        width:42, height:42, borderRadius:10, flexShrink:0,
        position:'relative', overflow:'hidden',
        background: playlist.bg || `linear-gradient(135deg, ${accent}33, ${accent}10)`,
        border:`0.5px solid ${accent}40`,
      }}>
        {playlist.thumbnail && (
          <img src={playlist.thumbnail} alt="" loading="lazy" style={{
            position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
          }}/>
        )}
        {!playlist.thumbnail && isRitualSynthetic && (
          <>
            {/* Halo radial sutil de fondo */}
            <div style={{
              position:'absolute', inset:0,
              background:`radial-gradient(70% 70% at 50% 40%, ${accent}40 0%, transparent 70%)`,
              pointerEvents:'none',
            }}/>
            {/* Shield centrado con glow */}
            <div style={{
              position:'absolute', inset:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              color: accent,
              filter:`drop-shadow(0 0 6px ${accent}80)`,
            }}>
              <IcShield size={20} stroke="currentColor" strokeWidth={1.6}/>
            </div>
            {/* Pulse dot top-right como en el eyebrow del Home */}
            <span style={{
              position:'absolute', top:5, right:5,
              width:5, height:5, borderRadius:999, background: accent,
              boxShadow:`0 0 6px ${accent}`,
              animation:'mtxPulseDotHome 2s ease-in-out infinite',
            }}/>
          </>
        )}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          display:'flex', alignItems:'center', gap:6, marginBottom:2,
        }}>
          <div style={{
            fontSize:13.5, fontWeight:700, color:'var(--ink-1)',
            letterSpacing:'-0.01em',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            maxWidth:'100%',
          }}>{playlist.title}</div>
          {ribbon && (
            <span style={{
              flexShrink:0,
              fontSize:8.5, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
              color: accent,
              padding:'2px 6px', borderRadius:4,
              background:`${accent}1f`,
              border:`0.5px solid ${accent}40`,
            }}>{ribbon}</span>
          )}
        </div>
        <div style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'-0.005em' }}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
          {playlist.totalDuration ? ` · ${playlist.totalDuration}` : ''}
        </div>
      </div>
      {isActive && (
        <div style={{
          width:24, height:24, borderRadius:'50%',
          background:`${accent}22`,
          border:`0.5px solid ${accent}55`,
          display:'flex', alignItems:'center', justifyContent:'center',
          color: accent,
          flexShrink:0,
        }}>
          <IcCheck size={12} stroke="currentColor" strokeWidth={2.5}/>
        </div>
      )}
    </button>
  );
}

// ── ActiveQueueSwitcherOverlay ───────────────────────────────────────────────
// Componente delgado que se monta a nivel del MentexApp. Consume el store
// __mtxActiveQueue y renderiza PlaylistSwitcherSheet via portal cuando
// switcherOpen=true. Único punto de montaje en la app — evita duplicación si
// se intentara desde múltiples players.
function ActiveQueueSwitcherOverlay() {
  const aq = (typeof window !== 'undefined' && window.useActiveQueue)
    ? window.useActiveQueue()
    : { switcherOpen: false };
  const overlayRoot = typeof document !== 'undefined'
    ? document.getElementById('mtx-overlay-root')
    : null;
  const reactDom = typeof window !== 'undefined' ? window.ReactDOM : null;

  if (!aq.switcherOpen) return null;

  const content = (
    <PlaylistSwitcherSheet
      onClose={() => window.__mtxActiveQueue?.closeSwitcher()}
    />
  );

  return (overlayRoot && reactDom && reactDom.createPortal)
    ? reactDom.createPortal(content, overlayRoot)
    : content;
}


// ── LibraryStatsBar — 3 stats compactos arriba de la biblioteca ──────────────
function LibraryStatsBar({ savedCount, historyCount, playlistCount }) {
  const stats = [
    { label: 'Guardados',  value: savedCount,    accent: '#3dffd1' },
    { label: 'Historial',  value: historyCount,  accent: '#9b8aff' },
    { label: 'Playlists',  value: playlistCount, accent: '#FFD66B' },
  ];
  return (
    <div className="mtx-glass" style={{
      margin:'0 20px 18px',
      padding:'14px 12px',
      borderRadius:18,
      background:'radial-gradient(120% 80% at 0% 0%, rgba(61,255,209,0.06), transparent 55%), var(--glass-2)',
      border:'0.5px solid rgba(255,255,255,0.06)',
      display:'flex', alignItems:'center',
      boxShadow:'0 0 0 0.5px rgba(61,255,209,0.06), 0 12px 28px -16px rgba(61,255,209,0.2)',
    }}>
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          <div style={{ flex:1, textAlign:'center' }}>
            <div style={{
              fontSize:24, fontWeight:700, color:'var(--ink-1)',
              fontVariantNumeric:'tabular-nums', letterSpacing:'-0.03em', lineHeight:1,
              fontFamily:'var(--ff-display)',
              marginBottom:5,
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize:9, fontWeight:700, letterSpacing:'0.14em',
              color:s.accent, textTransform:'uppercase',
            }}>
              {s.label}
            </div>
          </div>
          {i < stats.length - 1 && (
            <div style={{ width:'0.5px', height:32, background:'rgba(255,255,255,0.08)' }}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}


// ── LibraryTabs — segmented control elegante ─────────────────────────────────
const LIBRARY_TABS = [
  { id: 'playlists', label: 'Playlists', Ic: IcTarget    },
  { id: 'saved',     label: 'Guardados', Ic: IcBookmarkFill },
  { id: 'history',   label: 'Historial', Ic: IcClock     },
];

function LibraryTabs({ value, onChange, counts }) {
  return (
    <div style={{ padding:'0 20px', marginBottom:18 }}>
      <div style={{
        display:'flex', gap:4,
        padding:4, borderRadius:14,
        background:'rgba(255,255,255,0.04)',
        border:'0.5px solid rgba(255,255,255,0.06)',
      }}>
        {LIBRARY_TABS.map(t => {
          const active = value === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className="mtx-tap"
              style={{
                flex:1, height:38, borderRadius:11, cursor:'pointer',
                border:0,
                background: active ? 'linear-gradient(180deg, rgba(61,255,209,0.18), rgba(61,255,209,0.06))' : 'transparent',
                color: active ? 'var(--neon)' : 'var(--ink-3)',
                fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:600,
                letterSpacing:'-0.005em',
                display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
                boxShadow: active ? '0 0 0 0.5px rgba(61,255,209,0.3), 0 4px 14px -6px rgba(61,255,209,0.45), inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
                transition:'background .25s, color .2s, box-shadow .25s',
              }}>
              <t.Ic size={12} stroke="currentColor" strokeWidth={active ? 2 : 1.6}/>
              {t.label}
              {counts && counts[t.id] != null && (
                <span style={{
                  fontSize:10, fontWeight:700,
                  color: active ? 'var(--neon)' : 'var(--ink-3)',
                  opacity:0.75,
                  fontVariantNumeric:'tabular-nums',
                }}>{counts[t.id]}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ── NewPlaylistCard — CTA dashed-border para crear playlist ──────────────────
function NewPlaylistCard({ onClick }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      className="mtx-tap"
      style={{
        width:'100%', minWidth:0, boxSizing:'border-box',
        borderRadius:18, overflow:'hidden', cursor:'pointer', position:'relative',
        border:'1px dashed rgba(61,255,209,0.32)',
        background:'linear-gradient(165deg, rgba(61,255,209,0.04) 0%, rgba(61,255,209,0.015) 60%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        gap:14, padding:'28px 16px 24px',
        boxShadow:'inset 0 0 28px rgba(61,255,209,0.05)',
        transition:'background .25s, border-color .25s, box-shadow .3s',
      }}
    >
      {/* Decorative halo */}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(circle at 50% 35%, rgba(61,255,209,0.1), transparent 55%)',
        pointerEvents:'none',
      }}/>

      {/* Plus tile */}
      <div style={{
        width:54, height:54, borderRadius:16,
        background:'linear-gradient(135deg, rgba(61,255,209,0.26), rgba(61,255,209,0.06))',
        border:'0.5px solid rgba(61,255,209,0.45)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'var(--neon)', position:'relative', zIndex:1,
        boxShadow:'0 0 22px rgba(61,255,209,0.22), inset 0 1px 0 rgba(255,255,255,0.14)',
      }}>
        <IcPlus size={22} stroke="currentColor" strokeWidth={2.4}/>
      </div>

      {/* Text block */}
      <div style={{ textAlign:'center', position:'relative', zIndex:1, display:'flex', flexDirection:'column', gap:5 }}>
        <div style={{
          fontSize:14, fontWeight:700, color:'var(--neon)',
          letterSpacing:'-0.015em', lineHeight:1.15,
        }}>
          Nueva playlist
        </div>
        <div style={{ fontSize:11, color:'var(--ink-3)', lineHeight:1.4, padding:'0 4px' }}>
          Crea tu colección
        </div>
      </div>
    </div>
  );
}


// ── HistoryRow — fila compacta para el tab de historial ──────────────────────
function HistoryRow({ item, when, onClick }) {
  if (!item) return null;
  const accent = item.accent || '#3dffd1';
  return (
    <div
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(item); } }}
      className="mtx-glass mtx-tap"
      style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'10px 12px', borderRadius:14, cursor:'pointer',
        background:'rgba(255,255,255,0.025)',
        border:'0.5px solid rgba(255,255,255,0.05)',
      }}
    >
      <div style={{
        width:54, height:54, borderRadius:12, flexShrink:0,
        position:'relative', overflow:'hidden',
        background: item.bg,
        border:`0.5px solid ${accent}26`,
      }}>
        {item.cover && (
          <img src={item.cover} alt="" loading="lazy" style={{
            position:'absolute', inset:0,
            width:'100%', height:'100%', objectFit:'cover',
            opacity:0.78,
          }}/>
        )}
        <div style={{
          position:'absolute', inset:0,
          background:`linear-gradient(135deg, ${accent}22, transparent 60%)`,
        }}/>
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontSize:9, fontWeight:700, letterSpacing:'0.1em',
          color:accent, textTransform:'uppercase',
          marginBottom:2,
        }}>
          {CONTENT_TYPES.find(t => t.id === item.type)?.label || item.type}
        </div>
        <div style={{
          fontSize:13, fontWeight:600, color:'var(--ink-1)',
          letterSpacing:'-0.01em',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>
          {item.title}
        </div>
        <div style={{
          fontSize:11, color:'var(--ink-3)', marginTop:2,
          display:'inline-flex', alignItems:'center', gap:5,
        }}>
          <IcClock size={10} stroke="currentColor"/>
          <span style={{ fontVariantNumeric:'tabular-nums' }}>{item.dur}</span>
        </div>
      </div>

      <div style={{ flexShrink:0, textAlign:'right' }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
          {when}
        </div>
      </div>
    </div>
  );
}


// ── LibraryScreen — pantalla completa de biblioteca ──────────────────────────
function LibraryScreen({ onBack, onItemClick, onPlaylistClick }) {
  const [tab, setTab] = React.useState('playlists');
  const [createOpen, setCreateOpen] = React.useState(false);

  const userPlaylists      = EXPLORE_PLAYLISTS.filter(p => p.createdBy === 'user' || p.isWatchLater);
  const officialSaved      = EXPLORE_PLAYLISTS.filter(p => _MOCK_SAVED_PLAYLISTS.includes(p.id) && p.createdBy !== 'user');
  const allLibraryPlaylists = [...userPlaylists, ...officialSaved];
  const watchLater         = EXPLORE_PLAYLISTS.find(p => p.isWatchLater);
  const otherUserPlaylists = userPlaylists.filter(p => !p.isWatchLater);
  const savedItems         = _MOCK_SAVED_ITEMS.map(id => EXPLORE_CONTENT.find(c => c.id === id)).filter(Boolean);
  const historyItems       = _MOCK_HISTORY.map(h => ({ ...h, item: EXPLORE_CONTENT.find(c => c.id === h.contentId) })).filter(h => h.item);

  const counts = {
    playlists: allLibraryPlaylists.length,
    saved:     savedItems.length + _MOCK_SAVED_PLAYLISTS.length,
    history:   historyItems.length,
  };

  const handleNewPlaylist = () => setCreateOpen(true);

  // Group history by 'group' field
  const historyByGroup = React.useMemo(() => {
    const map = {};
    historyItems.forEach(h => { (map[h.group] = map[h.group] || []).push(h); });
    const order = ['Hoy', 'Ayer', 'Esta semana', 'Antes'];
    return order.filter(k => map[k]?.length).map(k => ({ group: k, items: map[k] }));
  }, []);

  return (
    <div style={{
      paddingBottom:120,
      animation:'mtxNotifInFull .35s cubic-bezier(.25,.8,.25,1) both',
    }}>
      {/* Nav bar */}
      <div style={{
        paddingTop:48, paddingLeft:16, paddingRight:16, paddingBottom:10,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexShrink:0, position:'relative',
      }}>
        <button onClick={onBack} aria-label="Volver" className="mtx-tap" style={{
          width:40, height:40, borderRadius:999, border:0,
          background:'rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--ink-1)', cursor:'pointer', position:'relative', zIndex:2,
        }}>
          <IcChevL size={20} stroke="currentColor" strokeWidth={2}/>
        </button>
        <div style={{
          position:'absolute', left:'50%', top:'50%',
          transform:'translate(-50%, calc(-50% + 19px))',
          fontSize:16, fontWeight:700, color:'var(--ink-1)',
          letterSpacing:'-0.015em', fontFamily:'var(--ff-sans)',
          pointerEvents:'none',
        }}>
          Biblioteca
        </div>
        <button onClick={handleNewPlaylist} aria-label="Nueva playlist" className="mtx-tap" style={{
          width:40, height:40, borderRadius:999, cursor:'pointer',
          border:0,
          background:'rgba(255,255,255,0.06)',
          color:'var(--neon)',
          display:'flex', alignItems:'center', justifyContent:'center',
          position:'relative', zIndex:2,
        }}>
          <IcPlus size={18} stroke="currentColor" strokeWidth={2.2}/>
        </button>
      </div>

      {/* Subtitle */}
      <div style={{ padding:'4px 22px 18px', textAlign:'center', flexShrink:0 }}>
        <div style={{ fontSize:12.5, color:'var(--ink-3)' }}>
          Tu universo guardado, tu progreso, tu ritmo.
        </div>
      </div>

      {/* Tabs */}
      <LibraryTabs value={tab} onChange={setTab} counts={counts}/>

      {/* Tab content */}
      {tab === 'playlists' && (
        <div style={{ animation:'mtx-fade-up .25s ease both' }}>
          {/* Watch Later hero */}
          {watchLater && (
            <div style={{ padding:'0 20px', marginBottom:14 }}>
              <div
                onClick={() => onPlaylistClick(watchLater)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlaylistClick(watchLater); } }}
                className="mtx-glass mtx-tap"
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'10px 12px', borderRadius:16, cursor:'pointer',
                  background:'linear-gradient(135deg, rgba(61,255,209,0.08), rgba(61,255,209,0.02))',
                  border:'0.5px solid rgba(61,255,209,0.22)',
                  boxShadow:'0 0 0 0.5px rgba(61,255,209,0.08), 0 10px 24px -14px rgba(61,255,209,0.4)',
                }}
              >
                <div style={{
                  width:50, height:50, borderRadius:12, flexShrink:0,
                  position:'relative', overflow:'hidden',
                  background:watchLater.bg,
                  border:'0.5px solid rgba(61,255,209,0.3)',
                  boxShadow:'0 5px 14px -8px rgba(61,255,209,0.4)',
                }}>
                  {watchLater.thumbnail && (
                    <img src={watchLater.thumbnail} alt="" loading="lazy" style={{
                      position:'absolute', inset:0,
                      width:'100%', height:'100%', objectFit:'cover',
                      opacity:0.7,
                    }}/>
                  )}
                  <div style={{
                    position:'absolute', inset:0,
                    background:'radial-gradient(circle at 30% 30%, rgba(61,255,209,0.4), transparent 60%)',
                  }}/>
                  <div style={{
                    position:'absolute', inset:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'var(--neon)',
                  }}>
                    <IcBookmarkFill size={18} stroke="currentColor"/>
                  </div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontSize:9, fontWeight:700, letterSpacing:'0.14em',
                    color:'var(--neon)', textTransform:'uppercase', marginBottom:2,
                  }}>
                    Tu cola personal
                  </div>
                  <div style={{
                    fontSize:14, fontWeight:700, color:'var(--ink-1)',
                    letterSpacing:'-0.02em', marginBottom:1,
                  }}>
                    Ver más tarde
                  </div>
                  <div style={{ fontSize:10.5, color:'var(--ink-3)' }}>
                    {watchLater.totalVideos} guardados · {watchLater.totalDuration}
                  </div>
                </div>
                <IcChevR size={15} stroke="var(--ink-3)" strokeWidth={1.8}/>
              </div>
            </div>
          )}

          {/* Section header */}
          <div style={{ padding:'4px 20px 10px', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em' }}>
              Tus playlists
            </div>
            <span style={{ fontSize:10, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
              {otherUserPlaylists.length + officialSaved.length}
            </span>
          </div>

          {/* Grid 2-col of playlists + new playlist CTA */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr',
            gap:10, padding:'0 20px',
          }}>
            {[...otherUserPlaylists, ...officialSaved].map(p => (
              <PlaylistCard key={p.id} playlist={p} onClick={onPlaylistClick} variant="grid"/>
            ))}
            <NewPlaylistCard onClick={handleNewPlaylist}/>
          </div>
        </div>
      )}

      {tab === 'saved' && (
        <div style={{ animation:'mtx-fade-up .25s ease both' }}>
          {/* Items section */}
          <div style={{ padding:'4px 20px 10px', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em' }}>
              Contenido guardado
            </div>
            <span style={{ fontSize:10, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
              {savedItems.length}
            </span>
          </div>
          {savedItems.length > 0 ? (
            <div style={{
              display:'grid', gridTemplateColumns:'1fr 1fr',
              gap:10, padding:'0 20px', marginBottom:22,
            }}>
              {savedItems.map(it => (
                <ExploreContentCard key={it.id} item={it} onClick={onItemClick} variant="grid"/>
              ))}
            </div>
          ) : (
            <div style={{ padding:'24px', textAlign:'center', fontSize:13, color:'var(--ink-3)' }}>
              No has guardado contenido todavía.
            </div>
          )}

          {/* Saved playlists */}
          {officialSaved.length > 0 && (
            <>
              <div style={{ padding:'4px 20px 10px', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
                <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em' }}>
                  Playlists guardadas
                </div>
                <span style={{ fontSize:10, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
                  {officialSaved.length}
                </span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, padding:'0 20px' }}>
                {officialSaved.map(p => (
                  <PlaylistCard key={p.id} playlist={p} onClick={onPlaylistClick} variant="grid"/>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div style={{ animation:'mtx-fade-up .25s ease both' }}>
          {historyByGroup.length === 0 ? (
            <div style={{ padding:'48px 28px', textAlign:'center' }}>
              <div style={{
                width:64, height:64, borderRadius:20, margin:'0 auto 14px',
                background:'rgba(255,255,255,0.04)',
                border:'0.5px solid rgba(255,255,255,0.08)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--ink-3)',
              }}>
                <IcClock size={24} stroke="currentColor" strokeWidth={1.6}/>
              </div>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--ink-1)', marginBottom:4 }}>
                Sin historial todavía
              </div>
              <div style={{ fontSize:12, color:'var(--ink-3)' }}>
                Empieza a explorar y aquí verás lo que has escuchado.
              </div>
            </div>
          ) : (
            historyByGroup.map(({ group, items }) => (
              <div key={group} style={{ marginBottom:18 }}>
                <div style={{
                  padding:'4px 20px 10px',
                  display:'flex', alignItems:'baseline', gap:10,
                }}>
                  <div className="mtx-eyebrow" style={{
                    fontSize:9, fontWeight:700,
                    color:'var(--ink-3)', letterSpacing:'0.16em',
                  }}>
                    {group}
                  </div>
                  <div style={{ flex:1, height:'0.5px', background:'rgba(255,255,255,0.05)' }}/>
                  <span style={{ fontSize:10, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
                    {items.length}
                  </span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'0 20px' }}>
                  {items.map(h => (
                    <HistoryRow key={h.contentId} item={h.item} when={h.when} onClick={onItemClick}/>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create playlist sheet — portal-mounted al viewport del IOSDevice */}
      {createOpen && (() => {
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const sheet = <CreatePlaylistSheet onClose={() => setCreateOpen(false)}/>;
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(sheet, overlayRoot)
          : sheet;
      })()}
    </div>
  );
}


// ── DividerBanner — banner separador "Explorar por categoría" ────────────────
function DividerBanner({ subtitle = 'Profundiza en los temas que más te mueven.' }) {
  return (
    <div style={{ padding:'4px 20px 20px', position:'relative' }}>
      <div className="mtx-glass" style={{
        position:'relative',
        borderRadius:22,
        padding:'22px 24px',
        overflow:'hidden',
        background:`
          radial-gradient(120% 90% at 0% 0%, rgba(155,138,255,0.14), transparent 55%),
          radial-gradient(80% 70% at 100% 100%, rgba(61,255,209,0.10), transparent 60%),
          var(--glass-2)
        `,
        border:'0.5px solid rgba(155,138,255,0.2)',
        boxShadow:'0 0 0 0.5px rgba(155,138,255,0.06), 0 14px 36px -16px rgba(155,138,255,0.4)',
        display:'flex', flexDirection:'column',
      }}>
        <style>{`
          @keyframes mtxBannerSpark { 0%,100% { opacity:0.55; transform:scale(1); } 50% { opacity:1; transform:scale(1.15); } }
          @keyframes mtxBannerDot   { 0%,100% { opacity:0.4; } 50% { opacity:0.95; } }
        `}</style>

        {/* Decorative sparkle */}
        <div style={{
          position:'absolute', top:18, right:22,
          color:'rgba(255,214,107,0.85)',
          animation:'mtxBannerSpark 2.4s ease-in-out infinite',
          filter:'drop-shadow(0 0 6px rgba(255,214,107,0.5))',
        }}>
          <IcSpark size={22} stroke="currentColor" strokeWidth={1.6}/>
        </div>

        {/* Decorative dots */}
        <div style={{
          position:'absolute', top:34, right:60,
          width:5, height:5, borderRadius:999,
          background:'rgba(61,255,209,0.7)',
          boxShadow:'0 0 8px rgba(61,255,209,0.5)',
          animation:'mtxBannerDot 2.8s ease-in-out 0.4s infinite',
        }}/>
        <div style={{
          position:'absolute', bottom:24, right:48,
          width:4, height:4, borderRadius:999,
          background:'rgba(155,138,255,0.7)',
          boxShadow:'0 0 6px rgba(155,138,255,0.5)',
          animation:'mtxBannerDot 3.2s ease-in-out 1s infinite',
        }}/>
        <div style={{
          position:'absolute', top:62, right:96,
          width:3, height:3, borderRadius:999,
          background:'rgba(255,214,107,0.6)',
          boxShadow:'0 0 5px rgba(255,214,107,0.5)',
          animation:'mtxBannerDot 2.4s ease-in-out 1.6s infinite',
        }}/>

        <div className="mtx-eyebrow" style={{
          fontSize:9, color:'var(--neon)',
          letterSpacing:'0.18em', marginBottom:8, fontWeight:700,
        }}>
          Explorar por categoría
        </div>
        <h2 style={{
          margin:0, fontSize:22, fontWeight:800,
          color:'var(--ink-1)', letterSpacing:'-0.025em', lineHeight:1.18,
          fontFamily:'var(--ff-display)',
          maxWidth:'85%',
        }}>
          Profundiza en lo que te mueve
        </h2>
        <p style={{
          margin:'8px 0 0', fontSize:12, color:'var(--ink-3)',
          lineHeight:1.45, maxWidth:'90%',
        }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}


// ── CategorySection — fila scroll-x para una categoría con accent propio ─────
function CategorySection({ category, items, onItemClick, onViewAll }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ padding:'0 20px', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
            <span style={{
              width:8, height:8, borderRadius:999,
              background: category.accent,
              boxShadow: `0 0 10px ${category.accent}`,
              flexShrink:0,
            }}/>
            <h2 style={{
              margin:0, fontSize:18, fontWeight:700, color:'var(--ink-1)',
              letterSpacing:'-0.02em',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {category.label}
            </h2>
          </div>
          <button onClick={() => onViewAll(category)} className="mtx-tap" style={{
            background:'transparent', border:0, cursor:'pointer',
            color: category.accent, fontSize:12, fontWeight:600,
            fontFamily:'var(--ff-sans)',
            display:'inline-flex', alignItems:'center', gap:3,
            flexShrink:0, padding:'4px 0',
          }}>
            Ver todo
            <IcChevR size={13} stroke="currentColor" strokeWidth={2}/>
          </button>
        </div>
        {category.desc && (
          <div style={{
            fontSize:12, color:'var(--ink-3)', marginTop:4, lineHeight:1.4, paddingLeft:18,
          }}>{category.desc}</div>
        )}
      </div>
      <div className="mtx-scroll-x" style={{ paddingLeft:20, paddingRight:20 }}>
        {items.map(it => (
          <ExploreContentCard key={it.id} item={it} onClick={onItemClick}/>
        ))}
      </div>
    </div>
  );
}


// ── SearchResultRow — fila compacta para resultados de búsqueda ──────────────
function SearchResultRow({ item, onClick }) {
  const accent = item.accent || '#3dffd1';
  return (
    <div
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(item); } }}
      className="mtx-tap"
      style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'10px 16px', cursor:'pointer',
        background:'transparent',
        border:0, borderRadius:0,
        transition:'background .2s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width:48, height:48, borderRadius:11, flexShrink:0,
        position:'relative', overflow:'hidden',
        background: item.bg || 'var(--glass-2)',
        border:`0.5px solid ${accent}28`,
      }}>
        {(item.cover || item.thumbnail) && (
          <img src={item.cover || item.thumbnail} alt="" loading="lazy" style={{
            position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.78,
          }}/>
        )}
        <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg, ${accent}22, transparent 60%)` }}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:accent, textTransform:'uppercase', marginBottom:2 }}>
          {item._kind || (CONTENT_TYPES.find(t => t.id === item.type)?.label || 'Item')}
        </div>
        <div style={{ fontSize:14, fontWeight:600, color:'var(--ink-1)', letterSpacing:'-0.01em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {item.title}
        </div>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {item.author?.name || item.author || ''}{item.dur ? ` · ${item.dur}` : (item.totalDuration ? ` · ${item.totalDuration}` : '')}
        </div>
      </div>
      <IcChevR size={16} stroke="var(--ink-3)" strokeWidth={1.6}/>
    </div>
  );
}


// ── SearchScreen — pantalla completa de búsqueda ─────────────────────────────
function SearchScreen({ onClose, onItemClick, onPlaylistClick }) {
  const [query, setQuery] = React.useState('');
  const [recents, setRecents] = React.useState(_MOCK_RECENT_SEARCHES);
  const inputRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onCloseRef.current = onClose; });

  // Auto-focus on mount with small delay (avoid jumping animation)
  React.useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 220);
    return () => clearTimeout(t);
  }, []);

  // ESC handling: clear query first, then close
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      // From input or anywhere — same logic
      e.preventDefault();
      // Read latest query from the input itself to avoid stale closure
      const v = inputRef.current?.value || '';
      if (v) {
        if (inputRef.current) inputRef.current.value = '';
        setQuery('');
      } else {
        onCloseRef.current?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Live search results (memoed)
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const norm = (s) => (s || '').toLowerCase();
    const items = EXPLORE_CONTENT
      .filter(i =>
        norm(i.title).includes(q) ||
        norm(i.author).includes(q) ||
        (i.tags || []).some(t => norm(t).includes(q)) ||
        norm(ALL_CATEGORIES[i.category]?.label).includes(q)
      )
      .slice(0, 8);
    const playlists = EXPLORE_PLAYLISTS
      .filter(p =>
        norm(p.title).includes(q) ||
        norm(p.author?.name).includes(q) ||
        norm(p.desc).includes(q)
      )
      .map(p => ({ ...p, _kind: 'Playlist' }))
      .slice(0, 5);
    const categories = Object.values(ALL_CATEGORIES)
      .filter(c => norm(c.label).includes(q) || norm(c.desc).includes(q))
      .slice(0, 5);
    return { items, playlists, categories };
  }, [query]);

  const totalResults = results
    ? results.items.length + results.playlists.length + results.categories.length
    : 0;

  const commitRecent = (text) => {
    setRecents(prev => [text, ...prev.filter(r => r !== text)].slice(0, 6));
  };

  const handleRecentTap = (text) => {
    setQuery(text);
    if (inputRef.current) inputRef.current.value = text;
    inputRef.current?.focus();
  };
  const handleClearQuery = () => {
    setQuery('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };
  const handleClearRecents = () => setRecents([]);

  const handleItemTap = (item) => {
    if (query.trim()) commitRecent(query.trim());
    onClose();
    setTimeout(() => onItemClick(item), 220);
  };
  const handlePlaylistTap = (pl) => {
    if (query.trim()) commitRecent(query.trim());
    onClose();
    setTimeout(() => onPlaylistClick(pl), 220);
  };
  const handleCategoryTap = (catId) => {
    const cat = ALL_CATEGORIES[catId];
    if (cat) {
      commitRecent(cat.label);
      setQuery(cat.label);
      if (inputRef.current) inputRef.current.value = cat.label;
    }
  };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:200,
      background:'radial-gradient(80% 60% at 50% 0%, rgba(61,255,209,0.05), transparent 60%), #060a08',
      animation:'mtxSearchIn .3s cubic-bezier(.25,.8,.25,1) both',
      display:'flex', flexDirection:'column', overflow:'hidden',
    }}>
      <style>{`
        @keyframes mtxSearchIn {
          from { opacity:0; transform:translateY(-12px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      {/* Search bar */}
      <div style={{
        paddingTop:48, paddingLeft:16, paddingRight:16, paddingBottom:14,
        display:'flex', alignItems:'center', gap:10, flexShrink:0,
      }}>
        <button onClick={onClose} aria-label="Cerrar búsqueda" className="mtx-tap" style={{
          width:40, height:40, borderRadius:999, border:0, flexShrink:0,
          background:'rgba(255,255,255,0.06)',
          color:'var(--ink-1)', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <IcChevL size={20} stroke="currentColor" strokeWidth={2}/>
        </button>

        <div style={{ flex:1, position:'relative' }}>
          <div style={{
            position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
            color:'var(--ink-3)', pointerEvents:'none',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <IcSearch size={16} stroke="currentColor"/>
          </div>
          <input
            ref={inputRef}
            type="text"
            defaultValue=""
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar contenido, playlists, autores..."
            aria-label="Buscar"
            style={{
              width:'100%', height:44,
              paddingLeft:42, paddingRight: query ? 42 : 14,
              borderRadius:14,
              border:'0.5px solid rgba(61,255,209,0.25)',
              background:'rgba(61,255,209,0.04)',
              color:'var(--ink-1)',
              fontSize:14, fontWeight:500,
              fontFamily:'var(--ff-sans)',
              letterSpacing:'-0.005em',
              outline:'none',
              boxShadow:'0 0 0 1px rgba(61,255,209,0.08), 0 0 16px rgba(61,255,209,0.08)',
              transition:'border-color .25s, box-shadow .25s, background .25s',
              boxSizing:'border-box',
            }}
          />
          {query && (
            <button onClick={handleClearQuery} aria-label="Limpiar búsqueda" className="mtx-tap" style={{
              position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
              width:28, height:28, borderRadius:999, border:0, cursor:'pointer',
              background:'rgba(255,255,255,0.08)',
              color:'var(--ink-2)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <IcClose size={12} stroke="currentColor" strokeWidth={2.4}/>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', paddingBottom:24 }}>
        {!query.trim() ? (
          /* Empty state with recents + trending */
          <>
            {recents.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <div style={{
                  padding:'4px 22px 8px',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                }}>
                  <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.16em', fontWeight:700 }}>
                    Búsquedas recientes
                  </div>
                  <button onClick={handleClearRecents} className="mtx-tap" style={{
                    background:'transparent', border:0, cursor:'pointer',
                    color:'var(--ink-3)', fontSize:11, fontWeight:600,
                    fontFamily:'var(--ff-sans)',
                  }}>
                    Limpiar
                  </button>
                </div>
                <div>
                  {recents.map((text, i) => (
                    <div
                      key={i}
                      onClick={() => handleRecentTap(text)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRecentTap(text); } }}
                      className="mtx-tap"
                      style={{
                        display:'flex', alignItems:'center', gap:12,
                        padding:'10px 22px', cursor:'pointer',
                      }}
                    >
                      <div style={{
                        width:32, height:32, borderRadius:10,
                        background:'rgba(255,255,255,0.04)',
                        border:'0.5px solid rgba(255,255,255,0.06)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color:'var(--ink-3)', flexShrink:0,
                      }}>
                        <IcClock size={14} stroke="currentColor"/>
                      </div>
                      <div style={{ flex:1, minWidth:0, fontSize:14, color:'var(--ink-1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {text}
                      </div>
                      <IcChevR size={16} stroke="var(--ink-3)" strokeWidth={1.6}/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending tags — premium 2-col grid */}
            <div style={{ marginBottom:28 }}>
              <div style={{ padding:'4px 22px 14px', display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
                <div>
                  <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--neon)', letterSpacing:'0.16em', fontWeight:700, marginBottom:4 }}>
                    Tendencias
                  </div>
                  <div style={{ fontSize:19, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.022em' }}>
                    Explora por tema
                  </div>
                </div>
                <div style={{ fontSize:10, color:'var(--ink-3)', fontWeight:500, letterSpacing:'-0.005em', paddingBottom:3 }}>
                  {_TRENDING_TAGS.length} temas
                </div>
              </div>
              <div style={{ padding:'0 22px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {_TRENDING_TAGS.map((catId, idx) => {
                  const cat = ALL_CATEGORIES[catId];
                  if (!cat) return null;
                  const rank = String(idx + 1).padStart(2, '0');
                  return (
                    <button
                      key={catId}
                      onClick={() => handleCategoryTap(catId)}
                      className="mtx-tap"
                      style={{
                        appearance:'none', cursor:'pointer', textAlign:'left',
                        padding:'13px 13px 12px', borderRadius:18,
                        border:`0.5px solid ${cat.accent}2e`,
                        background:`linear-gradient(155deg, ${cat.accent}16 0%, rgba(255,255,255,0.025) 55%, rgba(255,255,255,0.012) 100%)`,
                        position:'relative', overflow:'hidden',
                        display:'flex', flexDirection:'column', gap:7, minHeight:96,
                        fontFamily:'var(--ff-sans)',
                        boxShadow:`inset 0 0 22px ${cat.accent}0a, inset 0 1px 0 rgba(255,255,255,0.04)`,
                        transition:'background .25s, border-color .25s, transform .15s',
                      }}
                    >
                      {/* Decorative halo blob */}
                      <div style={{
                        position:'absolute', top:-26, right:-22,
                        width:78, height:78, borderRadius:'50%',
                        background:`radial-gradient(circle, ${cat.accent}38 0%, transparent 62%)`,
                        pointerEvents:'none',
                      }}/>

                      {/* Top row: accent square + rank */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex:1 }}>
                        <span style={{
                          width:12, height:12, borderRadius:4,
                          background:`linear-gradient(135deg, ${cat.accent} 0%, ${cat.accent}99 100%)`,
                          boxShadow:`0 0 10px ${cat.accent}66, inset 0 1px 0 rgba(255,255,255,0.25)`,
                          flexShrink:0,
                        }}/>
                        <span style={{
                          fontSize:9.5, fontWeight:700,
                          color:`${cat.accent}cc`,
                          letterSpacing:'0.08em',
                          fontVariantNumeric:'tabular-nums',
                        }}>
                          {rank}
                        </span>
                      </div>

                      {/* Title + desc */}
                      <div style={{ display:'flex', flexDirection:'column', gap:3, position:'relative', zIndex:1, marginTop:'auto' }}>
                        <div style={{
                          fontSize:14.5, fontWeight:700,
                          color:'var(--ink-1)', letterSpacing:'-0.018em', lineHeight:1.15,
                        }}>
                          {cat.label}
                        </div>
                        <div style={{
                          fontSize:10.5, fontWeight:500,
                          color:'var(--ink-3)', lineHeight:1.35,
                          overflow:'hidden',
                          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
                        }}>
                          {cat.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : totalResults === 0 ? (
          /* Empty state — no matches */
          <div style={{ padding:'56px 28px', textAlign:'center' }}>
            <div style={{
              width:72, height:72, borderRadius:22, margin:'0 auto 16px',
              background:'rgba(255,255,255,0.04)',
              border:'0.5px solid rgba(255,255,255,0.08)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--ink-3)',
            }}>
              <IcSearch size={26} stroke="currentColor" strokeWidth={1.5}/>
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', marginBottom:6 }}>
              Nada por aquí
            </div>
            <div style={{ fontSize:13, color:'var(--ink-3)', maxWidth:280, margin:'0 auto', lineHeight:1.5 }}>
              No encontré resultados para <span style={{ color:'var(--ink-1)', fontWeight:600 }}>"{query}"</span>. Prueba con otras palabras.
            </div>
          </div>
        ) : (
          /* Results */
          <div style={{ animation:'mtx-fade-up .2s ease both' }}>
            {results.items.length > 0 && (
              <div style={{ marginBottom:18 }}>
                <div style={{
                  padding:'4px 22px 8px',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                }}>
                  <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.16em', fontWeight:700 }}>
                    Contenido
                  </div>
                  <span style={{ fontSize:10, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
                    {results.items.length}
                  </span>
                </div>
                <div>
                  {results.items.map(it => (
                    <SearchResultRow key={it.id} item={it} onClick={handleItemTap}/>
                  ))}
                </div>
              </div>
            )}

            {results.playlists.length > 0 && (
              <div style={{ marginBottom:18 }}>
                <div style={{
                  padding:'4px 22px 8px',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                }}>
                  <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.16em', fontWeight:700 }}>
                    Playlists
                  </div>
                  <span style={{ fontSize:10, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
                    {results.playlists.length}
                  </span>
                </div>
                <div>
                  {results.playlists.map(pl => (
                    <SearchResultRow key={pl.id} item={pl} onClick={handlePlaylistTap}/>
                  ))}
                </div>
              </div>
            )}

            {results.categories.length > 0 && (
              <div style={{ marginBottom:18 }}>
                <div style={{
                  padding:'4px 22px 10px',
                }}>
                  <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.16em', fontWeight:700 }}>
                    Categorías
                  </div>
                </div>
                <div style={{ padding:'0 22px', display:'flex', flexWrap:'wrap', gap:8 }}>
                  {results.categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryTap(cat.id)}
                      className="mtx-tap"
                      style={{
                        appearance:'none', cursor:'pointer',
                        padding:'8px 13px', borderRadius:999,
                        border:`0.5px solid ${cat.accent}33`,
                        background:`linear-gradient(180deg, ${cat.accent}1c, ${cat.accent}06)`,
                        color: cat.accent,
                        fontSize:12, fontWeight:600,
                        fontFamily:'var(--ff-sans)',
                        display:'inline-flex', alignItems:'center', gap:6,
                      }}
                    >
                      <span style={{
                        width:6, height:6, borderRadius:999,
                        background: cat.accent,
                        boxShadow:`0 0 6px ${cat.accent}`,
                      }}/>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// ── ExploreScreen — hub principal con view routing (Fase 2) ───────────────────
function ExploreScreen({ onNotif = () => {}, notifCount = 0 }) {
  const nav = useExploreNav();

  // ── Signaling: tab bar visibility + scroll reset ────────────────────────────
  // Cada vez que cambie la vista interna (home → library → playlist-overview →
  // category-full → add-content), emitir señal al shell:
  //   • Si nav.state.view !== 'home' → vista interna → ocultar tab bar
  //   • Resetear scroll del frame al top: el user entra desde un screen que
  //     pudo haber dejado el scroll a media página; sin reset, el nuevo
  //     screen aparece "cortado" sin que se vea su header.
  // Cleanup al unmount (cambio de tab): resetear internal=false para que el
  // tab bar vuelva a aparecer en el siguiente tab.
  React.useEffect(() => {
    const isInternal = nav.state.view !== 'home';
    window.__mtxNav?.setInternal('explore', isInternal);
    if (typeof window.scrollMtxBgToTop === 'function') {
      window.scrollMtxBgToTop();
    }
  }, [nav.state.view, nav.state.playlistId, nav.state.categoryId]);

  React.useEffect(() => () => {
    window.__mtxNav?.setInternal('explore', false);
  }, []);

  const [filterType, setFilterType] = React.useState('all');
  const [comingSoonItem, setComingSoonItem] = React.useState(null);
  // Sub-fase 0.3 · El estado del player vive en window.__mtxGlobalPlayer
  // (consultable vía useGlobalPlayer). ExploreScreen ya no monta el VideoSheet
  // ni el VideoPlayerFullscreen — los renderiza GlobalPlayerOverlay a nivel
  // del MentexApp. Estos shims se mantienen para no romper handlers locales
  // que aún consumen el setter (handlePlayerComplete, etc.).
  const _gp = (typeof window !== 'undefined' && window.useGlobalPlayer)
    ? window.useGlobalPlayer()
    : { activeItem: null, mode: null };
  const videoSheetItem    = _gp.mode === 'sheet'  ? _gp.activeItem : null;
  const videoPlayingItem  = _gp.mode === 'player' ? _gp.activeItem : null;
  const setVideoSheetItem   = (it) => it ? window.__mtxGlobalPlayer?.openSheet(it)   : window.__mtxGlobalPlayer?.close();
  const setVideoPlayingItem = (it) => it ? window.__mtxGlobalPlayer?.openPlayer(it)  : window.__mtxGlobalPlayer?.close();
  const [videoPlayingFromPlaylist, setVideoPlayingFromPlaylist] = React.useState(null);
  const [videoCompletedItem, setVideoCompletedItem] = React.useState(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [shareItem, setShareItem] = React.useState(null);
  const [saveToPlaylistItem, setSaveToPlaylistItem] = React.useState(null);
  const [scheduleItem, setScheduleItem] = React.useState(null);
  // videoOptionsCtx state movido a VideoOptionsOverlay (global). Ver comentario
  // en el useEffect de listeners abajo.
  const [queueSheetOpen, setQueueSheetOpen] = React.useState(false);
  const [addContentOverlay, setAddContentOverlay] = React.useState(null); // playlist target o null
  const [reviewItem, setReviewItem] = React.useState(null); // item a reseñar
  const [reviewSuccess, setReviewSuccess] = React.useState(null); // { review, item } recién publicado
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  // Filter content by selected type
  const visibleItems = React.useMemo(() => {
    if (filterType === 'all') return EXPLORE_CONTENT;
    return EXPLORE_CONTENT.filter(i => i.type === filterType);
  }, [filterType]);

  // Hero items
  const heroItems = React.useMemo(() => {
    return [...visibleItems]
      .filter(i => i.status === 'available')
      .sort((a, b) => _playValue(b.plays) - _playValue(a.plays))
      .slice(0, 5);
  }, [visibleItems]);

  // Categories filtered & with items (top10 special-case: sort by plays, top 10)
  const visibleCategories = React.useMemo(() => {
    return EXPLORE_CATEGORIES
      .map(c => {
        let _items = visibleItems.filter(c.filter);
        if (c.tag === 'top10') {
          _items = [..._items]
            .filter(i => i.status === 'available')
            .sort((a, b) => _playValue(b.plays) - _playValue(a.plays))
            .slice(0, 10);
        }
        return { ...c, _items };
      })
      .filter(c => c._items.length > 0);
  }, [visibleItems]);

  const handleItemClick = (item) => {
    if (item.status === 'coming-soon') {
      setComingSoonItem(item);
    } else {
      setVideoSheetItem(item);
    }
  };

  // Sub-fase 0.3 · Los listeners 'mtx:explore-open-item' y 'mtx:expand-player'
  // ahora viven en GlobalPlayerOverlay (a nivel del MentexApp). ExploreScreen
  // ya no necesita escucharlos.

  // Listeners de eventos request-* — son los que el GlobalPlayer dispara
  // cuando el usuario tap acciones del player (share, save, etc.). El
  // `options` listener fue movido a VideoOptionsOverlay (global-player.jsx)
  // para que el menú de 3 puntos del fullscreen funcione desde cualquier
  // tab, no solo cuando ExploreScreen está montado. Los demás sheets siguen
  // viviendo aquí — si user está en otro tab, no aparecen (degradación
  // graceful por ahora).
  React.useEffect(() => {
    const handlers = {
      share:    (e) => e.detail?.item && setShareItem(e.detail.item),
      save:     (e) => e.detail?.item && setSaveToPlaylistItem(e.detail.item),
      schedule: (e) => e.detail?.item && setScheduleItem(e.detail.item),
      completed: (e) => e.detail?.item && setVideoCompletedItem(e.detail.item),
      'add-to-playlist': (e) => e.detail?.playlist && setAddContentOverlay(e.detail.playlist),
    };
    const subs = Object.entries(handlers).map(([kind, fn]) => {
      const ev = `mtx:request-${kind}`;
      window.addEventListener(ev, fn);
      return () => window.removeEventListener(ev, fn);
    });
    return () => subs.forEach(unsub => unsub());
  }, []);
  const handleViewAll = (category) => {
    nav.push({ view: 'category-full', categoryId: category.id });
  };
  const handleViewAllContentCategory = (category) => {
    nav.push({ view: 'category-full', categoryId: category.id, fromType: filterType, isContentCategory: true });
  };

  // Build list of content categories for the current filter type
  const contentCategorySections = React.useMemo(() => {
    const ids = CATEGORIES_BY_TYPE[filterType] || [];
    return ids.map(catId => {
      const cat = ALL_CATEGORIES[catId];
      if (!cat) return null;
      const items = visibleItems.filter(i =>
        i.category === catId && i.status === 'available'
      );
      return { category: cat, items };
    }).filter(s => s && s.items.length > 0);
  }, [filterType, visibleItems]);
  const handlePlayFromSheet = (item) => {
    setVideoPlayingItem(item);
  };
  const handlePlayerComplete = (item) => {
    setVideoPlayingItem(null);
    setVideoSheetItem(null);
    setVideoCompletedItem(item);
  };
  const handlePlaylistClick = (playlist) => {
    nav.push({ view: 'playlist-overview', playlistId: playlist.id });
  };
  const handlePlaylistPlayAll = (playlist, startIndex = 0) => {
    const items = _resolvePlaylistItems(playlist);
    if (!items.length) return;
    const it = items[startIndex] || items[0];
    setVideoPlayingItem(it);
    setVideoPlayingFromPlaylist(playlist);
  };
  const handlePlaylistShuffle = (playlist) => {
    const items = _resolvePlaylistItems(playlist);
    if (!items.length) return;
    const idx = Math.floor(Math.random() * items.length);
    handlePlaylistPlayAll(playlist, idx);
  };
  const handlePlaylistItemPlay = (playlist, item) => {
    setVideoPlayingItem(item);
    setVideoPlayingFromPlaylist(playlist);
  };
  const handlePlaylistsViewAll = () => {
    nav.push({ view: 'library' });
  };
  const handleOpenLibrary = () => {
    nav.push({ view: 'library' });
  };
  const handleAddContent = (playlist) => {
    nav.push({ view: 'add-content', playlistId: playlist.id });
  };

  // Empujar el contexto de Explorar al store global (sub-fase 0.1). Si el
  // user está reproduciendo desde una playlist concreta, esa entra a la
  // jerarquía con prioridad menor que el ritual del día (sesión activa).
  // Cuando no hay playlist específica, el store cae a watch-later default.
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.__mtxActiveQueue) {
      window.__mtxActiveQueue.setExploreContext(videoPlayingFromPlaylist || null);
    }
  }, [videoPlayingFromPlaylist]);

  // Lee la cola activa del store global. Garantiza consistencia con
  // RitualPlayerOverlay: si hay sesión activa con ritual, ambos players
  // muestran la misma cola.
  const _activeQueue = (typeof window !== 'undefined' && window.useActiveQueue)
    ? window.useActiveQueue()
    : { activePlaylist: null, activePlaylistItems: [] };
  const activePlaylist = _activeQueue.activePlaylist;
  const activePlaylistItems = _activeQueue.activePlaylistItems;

  const activePlaylistIndex = React.useMemo(() => {
    if (!videoPlayingItem) return -1;
    return activePlaylistItems.findIndex(i => i.id === videoPlayingItem.id);
  }, [activePlaylistItems, videoPlayingItem?.id]);

  const handlePlayNextItem = (item) => {
    setVideoPlayingItem(item);
  };
  const handleSelectFromQueue = (idx) => {
    const it = activePlaylistItems[idx];
    if (it) setVideoPlayingItem(it);
  };
  const handlePlayerPrev = () => {
    if (activePlaylistIndex > 0) setVideoPlayingItem(activePlaylistItems[activePlaylistIndex - 1]);
  };
  const handlePlayerNext = () => {
    if (activePlaylistIndex >= 0 && activePlaylistIndex < activePlaylistItems.length - 1) {
      setVideoPlayingItem(activePlaylistItems[activePlaylistIndex + 1]);
    }
  };
  const handleRemoveFromQueue = (item) => {
    if (!activePlaylist) return;
    if (Array.isArray(activePlaylist._extraItemIds)) {
      activePlaylist._extraItemIds = activePlaylist._extraItemIds.filter(id => id !== item.id);
    }
    activePlaylist._removedItemIds = activePlaylist._removedItemIds || [];
    if (!activePlaylist._removedItemIds.includes(item.id)) {
      activePlaylist._removedItemIds.push(item.id);
    }
    activePlaylist.totalVideos = Math.max(0, (activePlaylist.totalVideos || 0) - 1);
    toast.show({ message: `"${item.title}" removido de la cola`, duration: 1700 });
  };

  const handleNextFromCompletion = () => {
    if (!videoCompletedItem) return;
    const idx = EXPLORE_CONTENT.findIndex(i => i.id === videoCompletedItem.id);
    const next = EXPLORE_CONTENT
      .slice(idx + 1)
      .concat(EXPLORE_CONTENT.slice(0, idx))
      .find(i => i.status === 'available');
    setVideoCompletedItem(null);
    if (next) {
      // small delay so the close animation reads cleanly before opening the next sheet
      setTimeout(() => setVideoSheetItem(next), 200);
    }
  };

  // Compute next available item (used as preview in completion)
  const nextAvailable = React.useMemo(() => {
    if (!videoCompletedItem) return null;
    const idx = EXPLORE_CONTENT.findIndex(i => i.id === videoCompletedItem.id);
    return EXPLORE_CONTENT
      .slice(idx + 1)
      .concat(EXPLORE_CONTENT.slice(0, idx))
      .find(i => i.status === 'available') || null;
  }, [videoCompletedItem]);

  // Dynamic header
  const activeType = CONTENT_TYPES.find(t => t.id === filterType);
  const headerTitle = filterType === 'all' ? 'Tu universo de contenido' : activeType?.label;
  const headerSub = filterType === 'all'
    ? 'Aprende, medita y crece sin distracciones.'
    : `${visibleItems.length} ${visibleItems.length === 1 ? 'pieza' : 'piezas'} curadas para ti.`;

  // ── Sub-views ──────────────────────────────────────────────────────────────
  const renderHome = () => (
    <div style={{ paddingTop:60, paddingBottom:120, animation:'mtx-fade-up .4s ease both' }}>
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
            Explorar
          </div>
          <h1 className="mtx-h-1" style={{ margin:0, color:'var(--ink-1)', fontSize:26, fontWeight:800, letterSpacing:'-0.03em' }}>
            {headerTitle}
          </h1>
          <p style={{ margin:'6px 0 0', fontSize:13, color:'var(--ink-3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {headerSub}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <button onClick={() => setSearchOpen(true)} aria-label="Buscar" className="mtx-tap" style={{
            width:44, height:44, borderRadius:999,
            background:'var(--glass-2)', border:'0.5px solid var(--glass-stroke)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', cursor:'pointer',
          }}>
            <IcSearch size={19} stroke="var(--ink-1)"/>
          </button>
          <button onClick={handleOpenLibrary} aria-label="Mi biblioteca" className="mtx-tap" style={{
            width:44, height:44, borderRadius:999,
            background:'var(--glass-2)', border:'0.5px solid var(--glass-stroke)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', cursor:'pointer',
          }}>
            <IcBookmark size={19} stroke="var(--ink-1)"/>
          </button>
        </div>
      </div>

      <ContentTypeFilters value={filterType} onChange={setFilterType}/>

      {heroItems.length > 0 && (
        <ExploreHero items={heroItems} onItemClick={handleItemClick}/>
      )}

      {visibleCategories.length === 0 ? (
        <div style={{ padding:'40px 28px', textAlign:'center' }}>
          <div style={{ fontSize:14, color:'var(--ink-3)' }}>
            No hay contenido en esta categoría todavía.
          </div>
        </div>
      ) : (
        visibleCategories.map(c => (
          c.tag === 'top10' ? (
            <TopTenRow
              key={c.id}
              category={c}
              items={c._items}
              onItemClick={handleItemClick}
              onViewAll={handleViewAll}
            />
          ) : (
            <ContentRow
              key={c.id}
              category={c}
              items={c._items}
              onItemClick={handleItemClick}
              onViewAll={handleViewAll}
            />
          )
        ))
      )}

      {/* Playlists row — only on default ('all') filter to keep type-filtered views focused */}
      {filterType === 'all' && (
        <PlaylistsRow
          playlists={EXPLORE_PLAYLISTS.filter(p => !p.isWatchLater)}
          onPlaylistClick={handlePlaylistClick}
          onViewAll={handlePlaylistsViewAll}
        />
      )}

      {/* ── Sistema de categorías de contenido ──────────────────────────── */}
      {contentCategorySections.length > 0 && (
        <>
          <DividerBanner
            subtitle={
              filterType === 'all'
                ? 'Profundiza en los temas que más te mueven, sin importar el formato.'
                : `Explora todo lo relacionado con ${activeType?.label.toLowerCase()} por temas.`
            }
          />
          {contentCategorySections.map(({ category, items }) => (
            <CategorySection
              key={category.id}
              category={category}
              items={items}
              onItemClick={handleItemClick}
              onViewAll={handleViewAllContentCategory}
            />
          ))}
        </>
      )}
    </div>
  );

  const renderCategoryFull = () => {
    // Branch 1: content category (from "Explorar por categoría" sections, has fromType)
    if (nav.state.isContentCategory) {
      const contentCat = ALL_CATEGORIES[nav.state.categoryId];
      if (!contentCat) return renderHome();
      const fromType = nav.state.fromType || 'all';
      const typeLabel = CONTENT_TYPES.find(t => t.id === fromType)?.label;
      const sourceItems = EXPLORE_CONTENT.filter(i =>
        (fromType === 'all' || i.type === fromType) && i.category === contentCat.id
      );
      // Adapt CategoryFullView's expected shape
      const cat = {
        id: contentCat.id,
        title: fromType === 'all' ? contentCat.label : `${contentCat.label} · ${typeLabel}`,
        sub: contentCat.desc,
      };
      return (
        <CategoryFullView
          category={cat}
          sourceItems={sourceItems}
          onBack={nav.back}
          onItemClick={handleItemClick}
        />
      );
    }
    // Branch 2: row category (from existing fixed rows)
    const cat = EXPLORE_CATEGORIES.find(c => c.id === nav.state.categoryId);
    if (!cat) return renderHome();
    const sourceItems = EXPLORE_CONTENT.filter(cat.filter);
    return (
      <CategoryFullView
        category={cat}
        sourceItems={sourceItems}
        onBack={nav.back}
        onItemClick={handleItemClick}
      />
    );
  };

  const renderPlaylistOverview = () => {
    const playlist = EXPLORE_PLAYLISTS.find(p => p.id === nav.state.playlistId);
    if (!playlist) return renderHome();
    return (
      <PlaylistOverviewScreen
        playlist={playlist}
        onBack={nav.back}
        onPlayAll={() => handlePlaylistPlayAll(playlist, 0)}
        onShuffle={() => handlePlaylistShuffle(playlist)}
        onItemPlay={(item) => handlePlaylistItemPlay(playlist, item)}
        onAddContent={handleAddContent}
      />
    );
  };

  // Sheets rendered to a portal anchored at IOSDevice level (not inside scrollable mtx-bg).
  // Falls back to inline rendering if the portal root isn't found.
  const overlays = (
    <>
      {comingSoonItem && (
        <ComingSoonSheet item={comingSoonItem} onClose={() => setComingSoonItem(null)}/>
      )}
      {/* Sub-fase 0.3 · VideoSheet, VideoPlayerFullscreen y PlaylistQueueSheet
          se mueven a GlobalPlayerOverlay (un solo punto de montaje en toda
          la app). Los handlers internos (Share/Save/Schedule/Options/
          Completion) viven aquí y reaccionan a eventos `mtx:request-*` que
          dispara el player global. */}
      {shareItem && (
        <ShareSheet item={shareItem} onClose={() => setShareItem(null)}/>
      )}
      {saveToPlaylistItem && (
        <SaveToPlaylistSheet item={saveToPlaylistItem} onClose={() => setSaveToPlaylistItem(null)}/>
      )}
      {scheduleItem && (
        <ScheduleTodaySheet item={scheduleItem} onClose={() => setScheduleItem(null)}/>
      )}
      {addContentOverlay && (
        <div style={{
          position:'absolute', inset:0, zIndex:200,
          background:'#050706',
          overflowY:'auto',
          animation:'mtxNotifInFull .35s cubic-bezier(.25,.8,.25,1) both',
        }}>
          <AddContentScreen
            playlist={addContentOverlay}
            onBack={() => setAddContentOverlay(null)}
          />
        </div>
      )}
      {/* VideoOptionsSheet movido a VideoOptionsOverlay global. */}
      {videoCompletedItem && (
        <VideoCompletionSheet
          item={videoCompletedItem}
          nextItem={nextAvailable}
          onNext={handleNextFromCompletion}
          onClose={() => {
            setVideoCompletedItem(null);
            // Volver al tab origen si vino de community/profile (mismo evento)
            window.dispatchEvent(new CustomEvent('mtx:videosheet-closed'));
          }}
          onWriteReview={() => {
            const it = videoCompletedItem;
            setVideoCompletedItem(null);
            setTimeout(() => setReviewItem(it), 250);
          }}
        />
      )}
      {reviewItem && (
        <ReviewSheet
          item={reviewItem}
          earnedPoints={_calculateEarnedPoints(reviewItem)}
          onClose={() => setReviewItem(null)}
          onPublish={(payload) => {
            const review = window.__mtxReviews.add({
              itemId: reviewItem.id,
              itemTitle: reviewItem.title,
              itemAuthor: reviewItem.author,
              itemCover: reviewItem.cover,
              itemAccent: reviewItem.accent,
              rating: payload.rating,
              text: payload.text,
              template: payload.template,
              isPublic: payload.isPublic,
            });
            const it = reviewItem;
            setReviewItem(null);
            setTimeout(() => setReviewSuccess({ review, item: it }), 220);
          }}
        />
      )}
      {reviewSuccess && (
        <ReviewSuccessSheet
          review={reviewSuccess.review}
          item={reviewSuccess.item}
          onClose={() => setReviewSuccess(null)}
          onShare={(rev) => {
            try {
              if (navigator.clipboard) navigator.clipboard.writeText(`Mentex · "${rev.itemTitle}" — ${rev.text}`).catch(() => {});
            } catch {}
          }}
          onViewProfile={() => { /* mock — perfil llegará en Tier B */ }}
        />
      )}
      {searchOpen && (
        <SearchScreen
          onClose={() => setSearchOpen(false)}
          onItemClick={handleItemClick}
          onPlaylistClick={handlePlaylistClick}
        />
      )}
    </>
  );

  const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
  const portalledOverlays = overlayRoot && window.ReactDOM
    ? window.ReactDOM.createPortal(overlays, overlayRoot)
    : overlays;

  const renderLibrary = () => (
    <LibraryScreen
      onBack={nav.back}
      onItemClick={handleItemClick}
      onPlaylistClick={handlePlaylistClick}
    />
  );

  const renderAddContent = () => {
    const playlist = EXPLORE_PLAYLISTS.find(p => p.id === nav.state.playlistId);
    if (!playlist) return renderHome();
    return <AddContentScreen playlist={playlist} onBack={nav.back}/>;
  };

  const renderCurrentView = () => {
    switch (nav.state.view) {
      case 'category-full':     return renderCategoryFull();
      case 'playlist-overview': return renderPlaylistOverview();
      case 'library':           return renderLibrary();
      case 'add-content':       return renderAddContent();
      default:                  return renderHome();
    }
  };

  return (
    <>
      {renderCurrentView()}
      {portalledOverlays}
    </>
  );
}

Object.assign(window, {
  ExploreScreen,
  EXPLORE_CONTENT, EXPLORE_PLAYLISTS, EXPLORE_CATEGORIES, CONTENT_TYPES,
  useExploreNav,
  ContentTypeFilters, ExploreHero, ExploreHeroCard, ExploreContentCard, ContentRow,
  SortFilters, CategoryFullView, ComingSoonSheet,
  VideoSheet, VideoPlayerFullscreen, VideoCompletionSheet,
  PlaylistCard, PlaylistsRow, PlaylistItemRow,
  PlaylistOverviewScreen, PlaylistQueueSheet,
  LibraryScreen, LibraryStatsBar, LibraryTabs, NewPlaylistCard, HistoryRow,
  ALL_CATEGORIES, CATEGORIES_BY_TYPE, DividerBanner, CategorySection,
  TopTenCard, TopTenRow, FilterPanel, SearchScreen, SearchResultRow,
  ShareSheet, SaveToPlaylistSheet, ScheduleTodaySheet,
  CreatePlaylistSheet, PlaylistOptionsSheet, VideoOptionsSheet,
  AddContentToPlaylistSheet, EditPlaylistSheet,
  AddContentScreen, SelectableContentCard, MtxAddMoreCard,
  SleepTimerSheet, PlayerWaveform, PlaylistAccessCard,
  SwipeableQueueRow, SkipDurationSheet, BookmarksSheet, BookmarkNameSheet,
  ReviewSheet, ReviewSuccessSheet,
  useRitualItems, useIsScheduled,
  // Sub-fase 0.2 · switcher de playlist
  PlaylistSwitcherSheet, PlaylistSwitcherRow, ActiveQueueSwitcherOverlay,
  // Helpers expuestos para que active-queue.jsx pueda resolver items de
  // cualquier playlist (incluyendo la sintética del ritual con _extraItemIds).
  _resolvePlaylistItems,
});
