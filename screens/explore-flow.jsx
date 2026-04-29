// explore-flow.jsx — Sección Explorar (Fase 0: cimientos)

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
function ExploreHeroCard({ item, onClick }) {
  const isComingSoon = item.status === 'coming-soon';
  return (
    <div
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(item); } }}
      className="mtx-glass mtx-tap"
      style={{
        width:300, height:210, flexShrink:0,
        scrollSnapAlign:'start',
        borderRadius:22, overflow:'hidden',
        border: `0.5px solid ${item.accent}33`,
        boxShadow: `0 0 0 0.5px ${item.accent}1a, 0 16px 40px -16px ${item.accent}55`,
        position:'relative', cursor:'pointer',
        background: item.bg,
      }}
    >
      {/* Cover image */}
      {item.cover && (
        <img src={item.cover} alt="" loading="lazy" style={{
          position:'absolute', inset:0,
          width:'100%', height:'100%', objectFit:'cover',
          opacity: isComingSoon ? 0.35 : 0.55,
          filter:'saturate(0.95) contrast(1.05)',
        }}/>
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
function ExploreHero({ items, onItemClick }) {
  if (!items.length) return null;
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
        {items.map(it => (
          <ExploreHeroCard key={it.id} item={it} onClick={onItemClick}/>
        ))}
      </div>
    </div>
  );
}


// ── ExploreContentCard — card consistente con MtxLearningCard + extensiones ──
function ExploreContentCard({ item, onClick, variant = 'default' }) {
  const isComingSoon = item.status === 'coming-soon';
  const hasProgress  = item.playPct != null && !isComingSoon;
  const isSeries     = item.type === 'series';
  const isGrid       = variant === 'grid';

  return (
    <div
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(item); } }}
      className="mtx-glass mtx-tap"
      style={{
        width: isGrid ? '100%' : 200, flexShrink:0,
        borderRadius:18, overflow:'hidden', cursor:'pointer',
        border: isComingSoon
          ? '0.5px solid rgba(255,214,107,0.35)'
          : `0.5px solid var(--glass-stroke)`,
        background:'var(--glass-1)',
        boxShadow: isComingSoon
          ? '0 0 0 1px rgba(255,214,107,0.15), 0 12px 32px -14px rgba(255,214,107,0.4)'
          : 'var(--shadow-card)',
        position:'relative',
        opacity: isComingSoon ? 0.92 : 1,
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
            opacity: isComingSoon ? 0.35 : 0.78,
            filter:'saturate(0.9) contrast(1.05)',
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

        {/* Top-right: status pin */}
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


// ── ContentRow — fila scroll-x con header + cards ────────────────────────────
function ContentRow({ category, items, onItemClick, onViewAll }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom:24 }}>
      <MtxSectionHead
        title={category.title}
        subtitle={category.sub}
        action="Ver todo"
        onAction={() => onViewAll(category)}
      />
      <div className="mtx-scroll-x" style={{ paddingLeft:20, paddingRight:20 }}>
        {items.map(it => (
          <ExploreContentCard key={it.id} item={it} onClick={onItemClick}/>
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
  return playlist.items
    .map(id => EXPLORE_CONTENT.find(c => c.id === id))
    .filter(Boolean);
};


// ── PlaylistCard — card de playlist en scroll horizontal del hub ─────────────
function PlaylistCard({ playlist, onClick }) {
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
        width:200, flexShrink:0,
        borderRadius:18, overflow:'hidden', cursor:'pointer',
        border:`0.5px solid ${accent}28`,
        background:'var(--glass-1)',
        boxShadow:`0 0 0 0.5px ${accent}1a, 0 12px 32px -16px ${accent}50`,
        position:'relative',
      }}
    >
      {/* Cover */}
      <div style={{
        height:130, position:'relative', overflow:'hidden',
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


// ── CategoryFullView — vista expandida con back, sort, filter, grid 2-col ────
function CategoryFullView({ category, sourceItems, onBack, onItemClick }) {
  const [sort, setSort]     = React.useState('popular');
  const [filter, setFilter] = React.useState('all');

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
        <div style={{ width:40, height:40 }}/>
      </div>

      {/* Subtítulo */}
      <div style={{ padding:'0 22px 14px', textAlign:'center', flexShrink:0 }}>
        <div style={{ fontSize:12.5, color:'var(--ink-3)' }}>
          <span style={{ color:'var(--neon)', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>
            {finalItems.length}
          </span>
          {' '}{finalItems.length === 1 ? 'pieza' : 'piezas'} · {category.sub.toLowerCase()}
        </div>
      </div>

      {/* Sort + Type filters */}
      <SortFilters value={sort} onChange={setSort}/>
      <ContentTypeFilters value={filter} onChange={setFilter} items={sourceItems}/>

      {/* Divider */}
      <div style={{ height:'0.5px', background:'rgba(255,255,255,0.05)', margin:'4px 20px 14px' }}/>

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
          {finalItems.map(item => (
            <ExploreContentCard key={item.id} item={item} onClick={onItemClick} variant="grid"/>
          ))}
        </div>
      )}
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
function VideoSheet({ item, onClose, onPlay }) {
  const [tab, setTab] = React.useState('about');
  const [saved, setSaved] = React.useState(false);
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  if (!item) return null;
  const accent = item.accent || '#3dffd1';
  const chapters = React.useMemo(() => _generateChapters(item), [item.id]);

  const TABS = [
    { id: 'about',    label: 'Acerca de'   },
    { id: 'chapters', label: 'Capítulos'   },
    { id: 'comments', label: 'Comentarios' },
  ];

  const handleSave = () => {
    const next = !saved;
    setSaved(next);
    toast.show({ message: next ? 'Guardado en tu biblioteca' : 'Removido de tu biblioteca', duration: 2000 });
  };
  const handleShare = () => toast.show({ message: 'Compartir llega en una próxima fase', duration: 2000 });

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

          {/* Close */}
          <button onClick={onClose} aria-label="Cerrar" className="mtx-tap" style={{
            position:'absolute', top:12, right:12,
            width:36, height:36, borderRadius:999,
            background:'rgba(0,0,0,0.55)',
            backdropFilter:'blur(10px)',
            border:'0.5px solid rgba(255,255,255,0.12)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', cursor:'pointer',
          }}><IcClose size={16} stroke="currentColor"/></button>

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

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <button onClick={handleSave} className="mtx-tap" style={{
              height:50, borderRadius:14, cursor:'pointer',
              border: saved ? '0.5px solid rgba(61,255,209,0.45)' : '0.5px solid var(--glass-stroke)',
              background: saved ? 'linear-gradient(180deg, rgba(61,255,209,0.12), rgba(61,255,209,0.04))' : 'var(--glass-2)',
              color: saved ? 'var(--neon)' : 'var(--ink-1)',
              fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
              boxShadow: saved ? '0 0 12px rgba(61,255,209,0.18)' : 'none',
              transition:'background .2s, color .2s, box-shadow .25s, border-color .2s',
            }}>
              {saved ? <IcBookmarkFill size={14} stroke="currentColor"/> : <IcBookmark size={14} stroke="currentColor"/>}
              {saved ? 'Guardado' : 'Guardar'}
            </button>
            <button onClick={handleShare} className="mtx-tap" style={{
              height:50, borderRadius:14, cursor:'pointer',
              border:'0.5px solid var(--glass-stroke)',
              background:'var(--glass-2)', color:'var(--ink-1)',
              fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
            }}>
              <IcSpark size={14} stroke="currentColor"/>
              Compartir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── VideoPlayerFullscreen — pantalla completa de reproductor ─────────────────
function VideoPlayerFullscreen({ item, onClose, onComplete }) {
  const totalSec = React.useMemo(() => _parseDuration(item?.dur), [item?.id]);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [progress,  setProgress]  = React.useState(0);
  const [dragY,     setDragY]     = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const progressBarRef = React.useRef(null);
  const dragStartY     = React.useRef(0);
  const dragActiveRef  = React.useRef(false);
  const onCompleteRef  = React.useRef(onComplete);
  const onCloseRef     = React.useRef(onClose);
  React.useEffect(() => { onCompleteRef.current = onComplete; });
  React.useEffect(() => { onCloseRef.current = onClose; });

  React.useEffect(() => {
    if (!isPlaying || !item) return;
    let completeTimer = null;
    // Simulated playback: complete in ~10s regardless of real duration (prototype demo)
    const tickInc = 1 / 40;
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
  }, [isPlaying, item, totalSec]);

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
    }}>
      <style>{`@keyframes mtxNowSlide { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

      {/* Drag handle */}
      <div
        style={{ paddingTop:14, display:'flex', flexDirection:'column', alignItems:'center', cursor:'grab', touchAction:'none' }}
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
      >
        <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.2)', marginBottom:14 }}/>
        <div style={{ width:'100%', display:'flex', alignItems:'center', padding:'0 16px 10px', justifyContent:'space-between' }}>
          <button onClick={onClose} className="mtx-tap" aria-label="Cerrar reproductor" style={{
            width:36, height:36, borderRadius:999, border:0,
            background:'rgba(255,255,255,0.06)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', cursor:'pointer',
          }}>
            <IcChevD size={20} stroke="currentColor"/>
          </button>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'var(--ink-3)', textTransform:'uppercase' }}>
            {CONTENT_TYPES.find(t => t.id === item.type)?.label || item.type}
          </div>
          <div style={{ width:36 }}/>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 32px' }}>
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

        {/* Title */}
        <div style={{ textAlign:'center', marginBottom:28, width:'100%' }}>
          <div style={{ fontSize:22, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', lineHeight:1.2, marginBottom:6 }}>
            {item.title}
          </div>
          <div style={{ fontSize:13, color:'var(--ink-3)' }}>{item.author} · {item.dur}</div>
        </div>

        {/* Progress */}
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
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:11, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
            <span>{_formatTime(curSec)}</span>
            <span>{_formatTime(totalSec)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', gap:28, marginTop:12 }}>
          <button onClick={() => skip(-15)} className="mtx-tap" aria-label="Atrás 15 segundos" style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            background:'none', border:0, cursor:'pointer', color:'var(--ink-2)',
          }}>
            <IcChevL size={30} stroke="currentColor" strokeWidth={1.8}/>
            <span style={{ fontSize:9, fontWeight:700, color:'var(--ink-3)' }}>15s</span>
          </button>

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

          <button onClick={() => skip(15)} className="mtx-tap" aria-label="Adelante 15 segundos" style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            background:'none', border:0, cursor:'pointer', color:'var(--ink-2)',
          }}>
            <IcChevR size={30} stroke="currentColor" strokeWidth={1.8}/>
            <span style={{ fontSize:9, fontWeight:700, color:'var(--ink-3)' }}>15s</span>
          </button>
        </div>
      </div>

      <div style={{ height:40 }}/>
    </div>
  );
}


// ── VideoCompletionSheet — bottom sheet al terminar ──────────────────────────
function VideoCompletionSheet({ item, nextItem, onNext, onClose }) {
  if (!item) return null;
  const accent = item.accent || '#3dffd1';
  const minutes = Math.floor(_parseDuration(item.dur) / 60);

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:150,
      display:'flex', alignItems:'flex-end',
      background:'rgba(0,0,0,0.62)',
      backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
      animation:'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'linear-gradient(180deg, rgba(20,24,22,0.98), rgba(15,19,18,0.99))',
        backdropFilter:'blur(28px)',
        border:'0.5px solid rgba(255,255,255,0.08)',
        borderBottom:0,
        borderTopLeftRadius:28, borderTopRightRadius:28,
        width:'100%', paddingBottom:32,
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
        <div style={{ padding:'18px 28px 8px', textAlign:'center', position:'relative', zIndex:2 }}>
          <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, letterSpacing:'0.16em', marginBottom:8 }}>
            Completado
          </div>
          <h1 style={{
            margin:0, fontSize:24, fontWeight:800, color:'var(--ink-1)',
            letterSpacing:'-0.025em', lineHeight:1.15,
            fontFamily:'var(--ff-display)',
          }}>
            Una pieza más para ti.
          </h1>
          <p style={{ margin:'8px 0 0', fontSize:13, color:'var(--ink-3)', lineHeight:1.5 }}>
            "{item.title}" · <strong style={{ color:'var(--ink-2)' }}>{minutes} min</strong> invertidos en aprender
          </p>
        </div>

        {/* Stats grid */}
        <div style={{ padding:'18px 20px 20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, position:'relative', zIndex:2 }}>
          <div className="mtx-glass" style={{ padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.06)' }}>
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
          <div className="mtx-glass" style={{ padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--ink-3)' }}>
              <IcCheck size={11} stroke="currentColor"/>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase' }}>Estado</span>
            </div>
            <div style={{
              fontSize:14, fontWeight:700, color:'var(--neon)',
              letterSpacing:'-0.01em', lineHeight:1, marginTop:8,
            }}>Completado</div>
          </div>
        </div>

        {/* CTAs */}
        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:10, position:'relative', zIndex:2 }}>
          {nextItem && (
            <button onClick={onNext} className="mtx-tap" style={{
              width:'100%', height:54, borderRadius:18, border:0, cursor:'pointer',
              background:'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))',
              color:'#0a1410', fontSize:15, fontWeight:700,
              fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow:'0 0 0 1px rgba(61,255,209,0.4), 0 14px 36px -10px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}>
              <IcPlay size={15} stroke="currentColor" strokeWidth={2.4}/>
              Siguiente · {nextItem.title.length > 22 ? nextItem.title.slice(0, 22) + '…' : nextItem.title}
            </button>
          )}
          <button onClick={onClose} className="mtx-tap" style={{
            width:'100%', height:50, borderRadius:16, cursor:'pointer',
            background:'rgba(255,255,255,0.04)',
            border:'0.5px solid rgba(255,255,255,0.08)',
            color:'var(--ink-1)', fontSize:14, fontWeight:600,
            fontFamily:'var(--ff-sans)',
          }}>
            Volver a explorar
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
function PlaylistOverviewScreen({ playlist, onBack, onPlayAll, onShuffle, onItemPlay }) {
  const [saved, setSaved] = React.useState(false);
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const items = React.useMemo(() => _resolvePlaylistItems(playlist), [playlist?.id]);

  if (!playlist) return null;
  const accent = playlist.accent || '#3dffd1';

  const handleSave = () => {
    const next = !saved;
    setSaved(next);
    toast.show({ message: next ? 'Playlist guardada en tu biblioteca' : 'Removida de tu biblioteca', duration: 2200 });
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
        <button onClick={handleSave} aria-label={saved ? 'Quitar de biblioteca' : 'Guardar a biblioteca'} className="mtx-tap" style={{
          width:40, height:40, borderRadius:999, cursor:'pointer',
          border: saved ? `0.5px solid ${accent}50` : '0.5px solid rgba(255,255,255,0.08)',
          background: saved ? `${accent}14` : 'rgba(255,255,255,0.06)',
          color: saved ? accent : 'var(--ink-1)',
          display:'flex', alignItems:'center', justifyContent:'center',
          position:'relative', zIndex:2,
          boxShadow: saved ? `0 0 12px ${accent}33, inset 0 0 8px ${accent}10` : 'none',
          transition:'background .25s, color .25s, box-shadow .25s, border-color .25s',
        }}>
          {saved
            ? <IcBookmarkFill size={16} stroke="currentColor" strokeWidth={2}/>
            : <IcBookmark size={16} stroke="currentColor" strokeWidth={2}/>}
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
    </div>
  );
}


// ── PlaylistQueueSheet — bottom sheet con la cola del player ─────────────────
function PlaylistQueueSheet({ playlist, items, currentIndex, onSelect, onClose }) {
  if (!playlist) return null;
  const accent = playlist.accent || '#3dffd1';

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
        <div style={{ padding:'4px 22px 16px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mtx-eyebrow" style={{ fontSize:9, color:accent, marginBottom:4, letterSpacing:'0.14em' }}>
              Cola
            </div>
            <h2 style={{
              margin:0, fontSize:18, fontWeight:700, color:'var(--ink-1)',
              letterSpacing:'-0.02em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {playlist.title}
            </h2>
            <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>
              <span style={{ color:accent, fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{currentIndex + 1}</span>
              {' '}de {items.length} · {playlist.totalDuration}
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

        {/* Items */}
        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:6 }}>
          {items.map((it, i) => (
            <PlaylistItemRow
              key={it.id}
              item={it}
              index={i}
              isPlaying={i === currentIndex}
              onClick={(_, idx) => { onSelect(idx); onClose(); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}


// ── PlaylistPlayerScreen — pantalla completa de reproductor de playlist ──────
function PlaylistPlayerScreen({ playlist, items, currentIndex, onIndexChange, onClose, onOpenQueue }) {
  const item = items[currentIndex];
  const totalSec = React.useMemo(() => _parseDuration(item?.dur), [item?.id]);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [progress,  setProgress]  = React.useState(0);
  const [dragY,     setDragY]     = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const progressBarRef = React.useRef(null);
  const dragStartY     = React.useRef(0);
  const dragActiveRef  = React.useRef(false);
  const indexRef       = React.useRef(currentIndex);
  const onIndexChangeRef = React.useRef(onIndexChange);
  React.useEffect(() => { indexRef.current = currentIndex; });
  React.useEffect(() => { onIndexChangeRef.current = onIndexChange; });

  // Reset progress when item changes
  React.useEffect(() => { setProgress(0); }, [currentIndex]);

  React.useEffect(() => {
    if (!isPlaying || !item) return;
    let advanceTimer = null;
    const tickInc = 1 / 40;
    const id = setInterval(() => {
      setProgress(p => {
        const next = Math.min(1, p + tickInc);
        if (next >= 1 && p < 1) {
          clearInterval(id);
          // Auto-advance to next, or stop if last
          advanceTimer = setTimeout(() => {
            const nextIdx = indexRef.current + 1;
            if (nextIdx < items.length) {
              onIndexChangeRef.current?.(nextIdx);
            }
          }, 600);
        }
        return next;
      });
    }, 250);
    return () => {
      clearInterval(id);
      if (advanceTimer) clearTimeout(advanceTimer);
    };
  }, [isPlaying, currentIndex, items.length, item]);

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
    if (dragY > 110) { onClose?.(); return; }
    setDragY(0);
  };

  const onSeek = (e) => {
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (!rect) return;
    setProgress(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };
  const skip = (sec) => setProgress(p => Math.max(0, Math.min(1, p + sec / totalSec)));
  const goPrev = () => { if (currentIndex > 0) onIndexChange(currentIndex - 1); };
  const goNext = () => { if (currentIndex < items.length - 1) onIndexChange(currentIndex + 1); };

  if (!item) return null;
  const accent = item.accent || playlist?.accent || '#3dffd1';
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
    }}>
      <style>{`@keyframes mtxNowSlide { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

      {/* Drag handle + header */}
      <div
        style={{ paddingTop:14, display:'flex', flexDirection:'column', alignItems:'center', cursor:'grab', touchAction:'none' }}
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
      >
        <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.2)', marginBottom:14 }}/>
        <div style={{ width:'100%', display:'flex', alignItems:'center', padding:'0 16px 8px', justifyContent:'space-between' }}>
          <button onClick={onClose} className="mtx-tap" aria-label="Cerrar reproductor" style={{
            width:36, height:36, borderRadius:999, border:0,
            background:'rgba(255,255,255,0.06)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', cursor:'pointer',
          }}>
            <IcChevD size={20} stroke="currentColor"/>
          </button>
          <div style={{ textAlign:'center', flex:1, padding:'0 12px' }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.14em', color:'var(--ink-3)', textTransform:'uppercase', marginBottom:2 }}>
              Reproduciendo · <span style={{ color:accent, fontVariantNumeric:'tabular-nums' }}>{currentIndex + 1}/{items.length}</span>
            </div>
            <div style={{ fontSize:12, color:'var(--ink-2)', fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {playlist?.title}
            </div>
          </div>
          <button onClick={onOpenQueue} aria-label="Ver cola" className="mtx-tap" style={{
            width:36, height:36, borderRadius:999, border:0, cursor:'pointer',
            background:`${accent}14`,
            border:`0.5px solid ${accent}40`,
            color:accent,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <IcTarget size={16} stroke="currentColor" strokeWidth={2}/>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 32px' }}>
        {/* Cover */}
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
        </div>

        {/* Title */}
        <div style={{ textAlign:'center', marginBottom:28, width:'100%' }}>
          <div style={{ fontSize:22, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', lineHeight:1.2, marginBottom:6 }}>
            {item.title}
          </div>
          <div style={{ fontSize:13, color:'var(--ink-3)' }}>{item.author} · {item.dur}</div>
        </div>

        {/* Progress */}
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
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:11, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
            <span>{_formatTime(curSec)}</span>
            <span>{_formatTime(totalSec)}</span>
          </div>
        </div>

        {/* Controls — Prev · Skip-15 · Play/Pause · Skip+15 · Next */}
        <div style={{ display:'flex', alignItems:'center', gap:18, marginTop:12 }}>
          <button onClick={goPrev} className="mtx-tap" aria-label="Anterior" disabled={currentIndex === 0} style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            background:'none', border:0, cursor:'pointer',
            color: currentIndex === 0 ? 'rgba(255,255,255,0.18)' : 'var(--ink-2)',
            padding:6,
          }}>
            <IcChevL size={22} stroke="currentColor" strokeWidth={2.4}/>
          </button>

          <button onClick={() => skip(-15)} className="mtx-tap" aria-label="Atrás 15 segundos" style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            background:'none', border:0, cursor:'pointer', color:'var(--ink-2)',
          }}>
            <IcChevL size={26} stroke="currentColor" strokeWidth={1.8}/>
            <span style={{ fontSize:8, fontWeight:700, color:'var(--ink-3)' }}>15s</span>
          </button>

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

          <button onClick={() => skip(15)} className="mtx-tap" aria-label="Adelante 15 segundos" style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            background:'none', border:0, cursor:'pointer', color:'var(--ink-2)',
          }}>
            <IcChevR size={26} stroke="currentColor" strokeWidth={1.8}/>
            <span style={{ fontSize:8, fontWeight:700, color:'var(--ink-3)' }}>15s</span>
          </button>

          <button onClick={goNext} className="mtx-tap" aria-label="Siguiente" disabled={currentIndex >= items.length - 1} style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            background:'none', border:0, cursor:'pointer',
            color: currentIndex >= items.length - 1 ? 'rgba(255,255,255,0.18)' : 'var(--ink-2)',
            padding:6,
          }}>
            <IcChevR size={22} stroke="currentColor" strokeWidth={2.4}/>
          </button>
        </div>
      </div>

      <div style={{ height:30 }}/>
    </div>
  );
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
        width:'100%', minHeight:200,
        borderRadius:18, cursor:'pointer',
        border:'1px dashed rgba(61,255,209,0.3)',
        background:'rgba(61,255,209,0.02)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10,
        padding:'24px 16px',
        boxShadow:'inset 0 0 24px rgba(61,255,209,0.04)',
        transition:'background .25s, border-color .25s, box-shadow .3s',
      }}
    >
      <div style={{
        width:48, height:48, borderRadius:14,
        background:'rgba(61,255,209,0.1)',
        border:'0.5px solid rgba(61,255,209,0.25)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'var(--neon)',
        boxShadow:'0 0 18px rgba(61,255,209,0.15), inset 0 0 10px rgba(61,255,209,0.06)',
      }}>
        <IcPlus size={22} stroke="currentColor" strokeWidth={2.2}/>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--neon)', letterSpacing:'-0.01em', marginBottom:3 }}>
          Nueva playlist
        </div>
        <div style={{ fontSize:11, color:'var(--ink-3)', maxWidth:140, lineHeight:1.4 }}>
          Crea una colección a tu medida
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
  const toast = window.useToast ? window.useToast() : { show: () => {} };

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

  const handleNewPlaylist = () => {
    toast.show({ message: 'Crear playlist llega en una próxima fase', duration: 2200 });
  };

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
          border:'0.5px solid rgba(61,255,209,0.3)',
          background:'rgba(61,255,209,0.1)',
          color:'var(--neon)',
          display:'flex', alignItems:'center', justifyContent:'center',
          position:'relative', zIndex:2,
          boxShadow:'inset 0 0 10px rgba(61,255,209,0.08)',
        }}>
          <IcPlus size={18} stroke="currentColor" strokeWidth={2.2}/>
        </button>
      </div>

      {/* Subtitle */}
      <div style={{ padding:'4px 22px 16px', textAlign:'center', flexShrink:0 }}>
        <div style={{ fontSize:12.5, color:'var(--ink-3)' }}>
          Tu universo guardado, tu progreso, tu ritmo.
        </div>
      </div>

      {/* Stats bar */}
      <LibraryStatsBar
        savedCount={savedItems.length + _MOCK_SAVED_PLAYLISTS.length}
        historyCount={historyItems.length}
        playlistCount={allLibraryPlaylists.length}
      />

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
                  display:'flex', alignItems:'center', gap:14,
                  padding:14, borderRadius:18, cursor:'pointer',
                  background:'linear-gradient(135deg, rgba(61,255,209,0.08), rgba(61,255,209,0.02))',
                  border:'0.5px solid rgba(61,255,209,0.22)',
                  boxShadow:'0 0 0 0.5px rgba(61,255,209,0.08), 0 12px 28px -14px rgba(61,255,209,0.4)',
                }}
              >
                <div style={{
                  width:64, height:64, borderRadius:14, flexShrink:0,
                  position:'relative', overflow:'hidden',
                  background:watchLater.bg,
                  border:'0.5px solid rgba(61,255,209,0.3)',
                  boxShadow:'0 6px 18px -8px rgba(61,255,209,0.4)',
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
                    <IcBookmarkFill size={22} stroke="currentColor"/>
                  </div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontSize:9, fontWeight:700, letterSpacing:'0.14em',
                    color:'var(--neon)', textTransform:'uppercase', marginBottom:3,
                  }}>
                    Tu cola personal
                  </div>
                  <div style={{
                    fontSize:15, fontWeight:700, color:'var(--ink-1)',
                    letterSpacing:'-0.02em', marginBottom:2,
                  }}>
                    Ver más tarde
                  </div>
                  <div style={{ fontSize:11, color:'var(--ink-3)' }}>
                    {watchLater.totalVideos} guardados · {watchLater.totalDuration}
                  </div>
                </div>
                <IcChevR size={16} stroke="var(--ink-3)" strokeWidth={1.8}/>
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
              <PlaylistCard key={p.id} playlist={p} onClick={onPlaylistClick}/>
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
                  <PlaylistCard key={p.id} playlist={p} onClick={onPlaylistClick}/>
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


// ── ExploreScreen — hub principal con view routing (Fase 2) ───────────────────
function ExploreScreen({ onNotif = () => {}, notifCount = 0 }) {
  const nav = useExploreNav();
  const [filterType, setFilterType] = React.useState('all');
  const [comingSoonItem, setComingSoonItem] = React.useState(null);
  const [videoSheetItem, setVideoSheetItem] = React.useState(null);
  const [videoPlayingItem, setVideoPlayingItem] = React.useState(null);
  const [videoCompletedItem, setVideoCompletedItem] = React.useState(null);
  const [playlistVideoIndex, setPlaylistVideoIndex] = React.useState(0);
  const [playlistQueueOpen, setPlaylistQueueOpen] = React.useState(false);
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

  // Categories filtered & with items
  const visibleCategories = React.useMemo(() => {
    return EXPLORE_CATEGORIES
      .map(c => ({ ...c, _items: visibleItems.filter(c.filter) }))
      .filter(c => c._items.length > 0);
  }, [visibleItems]);

  const handleItemClick = (item) => {
    if (item.status === 'coming-soon') {
      setComingSoonItem(item);
    } else {
      setVideoSheetItem(item);
    }
  };
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
    setPlaylistVideoIndex(startIndex);
    nav.push({ view: 'playlist-playing', playlistId: playlist.id });
  };
  const handlePlaylistShuffle = (playlist) => {
    const items = _resolvePlaylistItems(playlist);
    if (!items.length) return;
    const idx = Math.floor(Math.random() * items.length);
    handlePlaylistPlayAll(playlist, idx);
  };
  const handlePlaylistItemPlay = (playlist, _item, index) => {
    handlePlaylistPlayAll(playlist, index);
  };
  const handlePlaylistsViewAll = () => {
    nav.push({ view: 'library' });
  };
  const handleOpenLibrary = () => {
    nav.push({ view: 'library' });
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
          <div className="mtx-eyebrow" style={{ marginBottom:6, color:'var(--neon)' }}>Explorar</div>
          <h1 className="mtx-h-1" style={{ margin:0, color:'var(--ink-1)', fontSize:26, fontWeight:800, letterSpacing:'-0.03em' }}>
            {headerTitle}
          </h1>
          <p style={{ margin:'6px 0 0', fontSize:13, color:'var(--ink-3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {headerSub}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <button onClick={handleOpenLibrary} aria-label="Mi biblioteca" className="mtx-tap" style={{
            width:44, height:44, borderRadius:999,
            background:'var(--glass-2)', border:'0.5px solid var(--glass-stroke)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', cursor:'pointer',
          }}>
            <IcBookmark size={19} stroke="var(--ink-1)"/>
          </button>
          <button onClick={onNotif} aria-label="Notificaciones" className="mtx-tap" style={{
            position:'relative', width:44, height:44, borderRadius:999,
            background:'var(--glass-2)', border:'0.5px solid var(--glass-stroke)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--ink-1)', cursor:'pointer',
          }}>
            <IcBell size={20} stroke="var(--ink-1)"/>
            {notifCount > 0 && (
              <span style={{
                position:'absolute', top:1, right:1, width:18, height:18, padding:0,
                borderRadius:999, background:'var(--neon)',
                color:'#0a1410', fontSize:10, fontWeight:700,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 0 10px var(--neon-glow)', border:'1.5px solid #0a0d0a',
                lineHeight:1, fontVariantNumeric:'tabular-nums',
              }}>{notifCount > 9 ? '9+' : notifCount}</span>
            )}
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
          <ContentRow
            key={c.id}
            category={c}
            items={c._items}
            onItemClick={handleItemClick}
            onViewAll={handleViewAll}
          />
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
        onItemPlay={(item, idx) => handlePlaylistItemPlay(playlist, item, idx)}
      />
    );
  };

  const renderPlaylistPlayer = () => {
    const playlist = EXPLORE_PLAYLISTS.find(p => p.id === nav.state.playlistId);
    if (!playlist) return renderHome();
    const items = _resolvePlaylistItems(playlist);
    if (!items.length) return renderHome();
    return (
      <PlaylistPlayerScreen
        playlist={playlist}
        items={items}
        currentIndex={Math.min(playlistVideoIndex, items.length - 1)}
        onIndexChange={setPlaylistVideoIndex}
        onClose={nav.back}
        onOpenQueue={() => setPlaylistQueueOpen(true)}
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
      {videoSheetItem && (
        <VideoSheet
          item={videoSheetItem}
          onClose={() => setVideoSheetItem(null)}
          onPlay={handlePlayFromSheet}
        />
      )}
      {videoPlayingItem && (
        <VideoPlayerFullscreen
          item={videoPlayingItem}
          onClose={() => setVideoPlayingItem(null)}
          onComplete={handlePlayerComplete}
        />
      )}
      {videoCompletedItem && (
        <VideoCompletionSheet
          item={videoCompletedItem}
          nextItem={nextAvailable}
          onNext={handleNextFromCompletion}
          onClose={() => setVideoCompletedItem(null)}
        />
      )}
      {playlistQueueOpen && nav.state.view === 'playlist-playing' && (() => {
        const pl = EXPLORE_PLAYLISTS.find(p => p.id === nav.state.playlistId);
        if (!pl) return null;
        const its = _resolvePlaylistItems(pl);
        return (
          <PlaylistQueueSheet
            playlist={pl}
            items={its}
            currentIndex={Math.min(playlistVideoIndex, its.length - 1)}
            onSelect={(idx) => { setPlaylistVideoIndex(idx); }}
            onClose={() => setPlaylistQueueOpen(false)}
          />
        );
      })()}
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

  const renderCurrentView = () => {
    switch (nav.state.view) {
      case 'category-full':     return renderCategoryFull();
      case 'playlist-overview': return renderPlaylistOverview();
      case 'playlist-playing':  return renderPlaylistPlayer();
      case 'library':           return renderLibrary();
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
  PlaylistOverviewScreen, PlaylistPlayerScreen, PlaylistQueueSheet,
  LibraryScreen, LibraryStatsBar, LibraryTabs, NewPlaylistCard, HistoryRow,
  ALL_CATEGORIES, CATEGORIES_BY_TYPE, DividerBanner, CategorySection,
});
