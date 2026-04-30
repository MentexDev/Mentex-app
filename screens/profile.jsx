// profile.jsx — Perfil del usuario (red social style — refactor billion-dollar)

const ACHIEVEMENTS = [
  { id:'mente-acero',    name:'Mente de Acero',  tagline:'30 días seguidos con enfoque',         current:12, total:30,  unit:'días',        Ic:IcShield, accent:'#FFD66B', rarity:'Épico',      glow:'rgba(255,214,107,0.45)' },
  { id:'maraton-mental', name:'Maratón Mental',  tagline:'100 horas totales en foco profundo',    current:47, total:100, unit:'horas',       Ic:IcTarget, accent:'#3dffd1', rarity:'Raro',       glow:'rgba(61,255,209,0.45)'  },
  { id:'sabio-naciente', name:'Sabio Naciente',  tagline:'50 contenidos completados',             current:23, total:50,  unit:'contenidos',  Ic:IcBook,   accent:'#9b8aff', rarity:'Raro',       glow:'rgba(155,138,255,0.45)' },
  { id:'guerrero-zen',   name:'Guerrero Zen',    tagline:'7 días consecutivos sin distracciones', current:4,  total:7,   unit:'días',        Ic:IcLeaf,   accent:'#ff8b6a', rarity:'Legendario', glow:'rgba(255,139,106,0.45)' },
];

// ── Sistema de logros V2 — tiers de rareza ──────────────────────────────────
const _ACHIEVEMENT_TIERS = {
  common:    { id:'common',    label:'Común',      color:'#a8a8a8', glow:'rgba(168,168,168,0.4)'  },
  rare:      { id:'rare',      label:'Raro',       color:'#3dffd1', glow:'rgba(61,255,209,0.55)'  },
  epic:      { id:'epic',      label:'Épico',      color:'#FFD66B', glow:'rgba(255,214,107,0.55)' },
  legendary: { id:'legendary', label:'Legendario', color:'#9b8aff', glow:'rgba(155,138,255,0.6)'  },
  mythic:    { id:'mythic',    label:'Mítico',     color:'#ff8b6a', glow:'rgba(255,139,106,0.65)' },
};

// ── Brand colors auténticos para redes sociales ─────────────────────────────
// Cada red devuelve { bg, glow, border? } para construir su botón con su color
// oficial. Se usa en ProfileScreen y UserProfileScreen.
function _getSocialBrand(id) {
  switch (id) {
    case 'instagram':
      return {
        bg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
        glow: 'rgba(220,39,67,0.5)',
        border: '0',
      };
    case 'twitter':
      return { bg: '#000000', glow: 'rgba(255,255,255,0.18)', border: '0.5px solid rgba(255,255,255,0.22)' };
    case 'tiktok':
      return { bg: '#010101', glow: 'rgba(255,32,99,0.35)', border: '0.5px solid rgba(255,255,255,0.18)' };
    case 'youtube':
      return { bg: '#FF0000', glow: 'rgba(255,0,0,0.5)', border: '0' };
    case 'spotify':
      return { bg: '#1DB954', glow: 'rgba(29,185,84,0.5)', border: '0' };
    case 'linkedin':
      return { bg: '#0A66C2', glow: 'rgba(10,102,194,0.55)', border: '0' };
    case 'github':
      return { bg: '#181717', glow: 'rgba(255,255,255,0.18)', border: '0.5px solid rgba(255,255,255,0.16)' };
    default:
      return { bg: '#3dffd1', glow: 'rgba(61,255,209,0.5)', border: '0' };
  }
}

// ── Categorías de logros (6 ejes) ────────────────────────────────────────────
const _ACHIEVEMENT_CATEGORIES = {
  focus:       { id:'focus',       label:'Foco',         Ic:IcShield,  color:'#3dffd1' },
  learning:    { id:'learning',    label:'Aprendizaje',  Ic:IcBrain,   color:'#FFD66B' },
  consistency: { id:'consistency', label:'Constancia',   Ic:IcFlame,   color:'#ff8b6a' },
  depth:       { id:'depth',       label:'Profundidad',  Ic:IcTarget,  color:'#9b8aff' },
  variety:     { id:'variety',     label:'Variedad',     Ic:IcCompass, color:'#5dd3ff' },
  community:   { id:'community',   label:'Comunidad',    Ic:IcUsers,   color:'#9bd45e' },
};

// ── 30 logros: 6 categorías × 5 tiers cada una ──────────────────────────────
// Cada uno define `current` directo según la métrica del usuario (mock estable)
const _ALL_ACHIEVEMENTS = [
  // ═════ FOCO ═════ (días sin redes — racha actual: 12)
  { id:'mente-limpia',    name:'Mente Limpia',    category:'focus', tier:'common',    Ic:IcLeaf,   target:1,   unit:'día',  current:12,  tagline:'Diste el primer paso. Cerraste las redes y abriste algo más profundo.',           percentile:100, narrative:'Todo gran cambio empieza con un solo día. Hoy elegiste el silencio sobre el ruido y ese solo gesto reordena el resto.' },
  { id:'detox-semanal',   name:'Detox Semanal',   category:'focus', tier:'rare',      Ic:IcWind,   target:7,   unit:'días', current:12,  tagline:'Una semana entera sin scroll vacío. Tu cerebro empezó a recordar el silencio.',     percentile:42,  narrative:'Después de siete días sin redes, la dopamina se reorganiza. El aburrimiento vuelve a ser fértil y la atención se siente otra vez como un órgano propio.' },
  { id:'mente-despierta', name:'Mente Despierta', category:'focus', tier:'epic',      Ic:IcBrain,  target:30,  unit:'días', current:12,  tagline:'Treinta días limpios. Has cruzado el umbral del foco sostenido.',                  percentile:8,   narrative:'Treinta días no es disciplina, es identidad. A esta altura ya no estás resistiendo el scroll — simplemente dejó de ser parte de quién eres.' },
  { id:'asceta-digital',  name:'Asceta Digital',  category:'focus', tier:'legendary', Ic:IcShield, target:100, unit:'días', current:12,  tagline:'Cien días sin redes. Pocos llegan. Tu atención es ahora un activo escaso.',         percentile:1.2, narrative:'En un mundo entrenado para distraerse, tu mente sostenida cien días en silencio es un acto político. La concentración es tu nuevo lenguaje.' },
  { id:'mente-pura',      name:'Mente Pura',      category:'focus', tier:'mythic',    Ic:IcCrown,  target:365, unit:'días', current:12,  tagline:'Un año completo sin redes. Has entrado al panteón de Mentex.',                     percentile:0.1, narrative:'Trescientos sesenta y cinco días. Una vuelta entera al sol con la mente limpia. Lo que empezó como una decisión se convirtió en un tipo de persona.' },

  // ═════ APRENDIZAJE ═════ (horas acumuladas — usuario: 47 hr)
  { id:'primera-hora',   name:'Primera Hora',   category:'learning', tier:'common',    Ic:IcZap,    target:1,    unit:'hora',  current:47, tagline:'Tu primera hora limpia. La fundación de todo lo que viene.',                          percentile:100, narrative:'Una hora puede parecer poco, pero es donde empieza la diferencia entre aspirar y construir. La masa crítica se acumula así: una hora a la vez.' },
  { id:'primera-etapa',  name:'Primera Etapa',  category:'learning', tier:'rare',      Ic:IcTarget, target:10,   unit:'horas', current:47, tagline:'Diez horas. Lo suficiente para sentir el cambio, no lo suficiente para detenerse.',  percentile:55,  narrative:'Diez horas son una conversación honesta con un campo. Lo conoces lo justo para saber que apenas empezaste a entenderlo.' },
  { id:'maraton-mental', name:'Maratón Mental', category:'learning', tier:'epic',      Ic:IcBrain,  target:100,  unit:'horas', current:47, tagline:'Cien horas profundas. Más que un hobby, ya es una práctica.',                       percentile:14,  narrative:'Cien horas no son un hito de tiempo, son un cambio de tipo de persona. Dejaste de consumir contenido y empezaste a pensar.' },
  { id:'mil-horas',      name:'Mil Horas',      category:'learning', tier:'legendary', Ic:IcBook,   target:500,  unit:'horas', current:47, tagline:'Quinientas horas. La masa crítica del autodidacta serio.',                          percentile:1.8, narrative:'A las quinientas horas tu cabeza es una biblioteca habitada. Las ideas se hablan entre sí sin que tengas que invocarlas.' },
  { id:'bibliofilo',     name:'Bibliófilo',     category:'learning', tier:'mythic',    Ic:IcCrown,  target:1000, unit:'horas', current:47, tagline:'Mil horas. Una vida entera de mente despierta condensada.',                        percentile:0.2, narrative:'Mil horas profundas. Acabas de pagar el precio que ningún algoritmo te cobrará: el de pensar por ti mismo.' },

  // ═════ CONSTANCIA ═════ (días consecutivos activos — usuario: 12)
  { id:'inicio',       name:'Inicio',        category:'consistency', tier:'common',    Ic:IcSparkles, target:3,   unit:'días', current:12,  tagline:'Tres días seguidos. Tu cerebro empezó a notarlo.',                            percentile:88,  narrative:'Tres días son la diferencia entre "hoy probé algo" y "estoy haciendo algo". El cerebro empieza a tomarte en serio aquí.' },
  { id:'costumbre',    name:'Costumbre',     category:'consistency', tier:'rare',      Ic:IcFlame,    target:7,   unit:'días', current:12,  tagline:'Una semana sin parar. La identidad empieza a moverse.',                       percentile:38,  narrative:'Siete días en fila son la primera carta del nuevo cerebro. Te está empezando a creer que en serio.' },
  { id:'habito',       name:'Hábito',        category:'consistency', tier:'epic',      Ic:IcShield,   target:30,  unit:'días', current:12,  tagline:'Treinta días sin romper la cadena. Ya no decides — sucede.',                  percentile:9,   narrative:'Treinta días no se hacen con voluntad, se hacen con ritmo. La voluntad es agotable; el ritmo se acumula y compone.' },
  { id:'identidad',    name:'Identidad',     category:'consistency', tier:'legendary', Ic:IcTrophy,   target:100, unit:'días', current:12,  tagline:'Cien días sin saltarte uno. Esto ya es quien eres.',                          percentile:1.5, narrative:'Cien días seguidos no son un hábito, son tu firma. La gente que te conoce sabe que esto va en serio.' },
  { id:'rito-sagrado', name:'Rito Sagrado',  category:'consistency', tier:'mythic',    Ic:IcCrown,    target:365, unit:'días', current:12,  tagline:'Un año sin parar. Has pasado a ser leyenda local.',                           percentile:0.1, narrative:'Un año entero sin saltar un día. Tu mente es ahora una catedral construida una piedra por día.' },

  // ═════ PROFUNDIDAD ═════ (sesión continua más larga en min — usuario: 108)
  { id:'primera-inmersion', name:'Primera Inmersión', category:'depth', tier:'common',    Ic:IcEye,      target:30,  unit:'min', current:108, tagline:'Media hora sin distraerte. Tu mente recuerda lo que es estar a solas.',          percentile:75,   narrative:'Treinta minutos en foco continuo. En la era del scroll, ya es una proeza pequeña.' },
  { id:'foco-real',         name:'Foco Real',         category:'depth', tier:'rare',      Ic:IcTarget,   target:60,  unit:'min', current:108, tagline:'Una hora corrida. La concentración recordó cómo respirar.',                      percentile:32,   narrative:'Una hora corrida sin tocar el teléfono. Bienvenido al estado natural de la mente humana antes de internet.' },
  { id:'deep-work',         name:'Deep Work',         category:'depth', tier:'epic',      Ic:IcBrain,    target:120, unit:'min', current:108, tagline:'Dos horas en flow. Estás operando en otro régimen.',                              percentile:7,    narrative:'Dos horas en deep work. La gente paga consultorías para encontrar este estado y tú estás aprendiendo a habitarlo.' },
  { id:'estado-flow',       name:'Estado de Flow',    category:'depth', tier:'legendary', Ic:IcZap,      target:180, unit:'min', current:108, tagline:'Tres horas sin que el tiempo exista. Esto es lo que buscaban los místicos.',     percentile:1.2,  narrative:'Tres horas en flow. El tiempo deja de ser lineal — pasa de un solo color. Pocos tocan esto en su vida adulta.' },
  { id:'trance-mental',     name:'Trance Mental',     category:'depth', tier:'mythic',    Ic:IcSparkles, target:240, unit:'min', current:108, tagline:'Cuatro horas en estado profundo. Has ido más allá del foco.',                    percentile:0.15, narrative:'Cuatro horas en trance mental. No es disciplina, no es técnica — es entrega total. La frontera donde el aprendizaje se vuelve experiencia mística.' },

  // ═════ VARIEDAD ═════ (mezclando 4 métricas distintas)
  { id:'curioso',          name:'Curioso',             category:'variety', tier:'common',    Ic:IcCompass,  target:3,  unit:'tipos',     current:5,  tagline:'Tres categorías exploradas. Tu curiosidad no acepta fronteras.',                       percentile:80,   narrative:'La curiosidad genuina es polígama. Tres campos diferentes ya muestran que tu mente no se conforma con una sola pista.' },
  { id:'polimata',         name:'Polímata',            category:'variety', tier:'rare',      Ic:IcSparkles, target:5,  unit:'tipos',     current:5,  tagline:'Has probado todos los tipos de contenido. Eres un explorador.',                        percentile:24,   narrative:'Audiolibros, meditaciones, charlas, series, sonidos. Has tocado las cinco caras del aprendizaje en Mentex. Pocos se atreven con todas.' },
  { id:'top-diez',         name:'Top 10',              category:'variety', tier:'epic',      Ic:IcBook,     target:10, unit:'libros',    current:6,  tagline:'Diez audiolibros enteros. Tu biblioteca interna ya tiene peso real.',                  percentile:6,    narrative:'Diez libros completos. La diferencia entre quien lee fragmentos y quien construye una biblioteca mental empieza acá.' },
  { id:'maestro-maestros', name:'Maestro de Maestros', category:'variety', tier:'legendary', Ic:IcUsers,    target:50, unit:'autores',   current:18, tagline:'Cincuenta autores únicos. Una conversación entre siglos en tu cabeza.',                percentile:0.9,  narrative:'Cincuenta autores distintos no son cincuenta libros — son cincuenta perspectivas sentadas en tu cabeza, conversando entre sí.' },
  { id:'sabio-universal',  name:'Sabio Universal',     category:'variety', tier:'mythic',    Ic:IcCrown,    target:8,  unit:'playlists', current:1,  tagline:'Has completado todas las playlists oficiales. Tocaste todo el universo Mentex.',       percentile:0.05, narrative:'Las ocho playlists oficiales completas. Has caminado por todos los pasillos de Mentex. El mapa ya no tiene zonas oscuras para ti.' },

  // ═════ COMUNIDAD ═════ (4 métricas distintas)
  { id:'primera-resena',      name:'Primera Reseña',      category:'community', tier:'common',    Ic:IcEdit,     target:1,   unit:'reseña',     current:3,   tagline:'Tu primera reflexión publicada. La mente colectiva te escuchó.',                  percentile:65,   narrative:'Una reseña sincera vale más que mil likes anónimos. Acabas de aportar algo a la conversación.' },
  { id:'voz-activa',          name:'Voz Activa',          category:'community', tier:'rare',      Ic:IcMic,      target:10,  unit:'reseñas',    current:3,   tagline:'Diez reseñas publicadas. Tu voz tiene volumen propio en Mentex.',                 percentile:18,   narrative:'Diez reseñas son diez veces que elegiste pensar a fondo en algo que aprendiste, en lugar de pasar al siguiente.' },
  { id:'pensador-influyente', name:'Pensador Influyente', category:'community', tier:'epic',      Ic:IcHeart,    target:100, unit:'likes',      current:12,  tagline:'Cien likes en tus reseñas. Tu mente está moviendo otras mentes.',                 percentile:4.5,  narrative:'Cien personas distintas reaccionaron a algo que escribiste. Estás dejando huella en la red de mentes despiertas de Mentex.' },
  { id:'mentor',              name:'Mentor',              category:'community', tier:'legendary', Ic:IcUsers,    target:50,  unit:'seguidores', current:247, tagline:'Cincuenta personas eligen seguir tus reflexiones. Eres referencia.',             percentile:1.1,  narrative:'Cincuenta personas levantaron la mano y dijeron "quiero ver lo que esta mente piensa". No es algoritmo — es elección.' },
  { id:'icono',               name:'Ícono',               category:'community', tier:'mythic',    Ic:IcSparkles, target:1,   unit:'semana',     current:0,   tagline:'Has sido top creator de la semana. Tu mente lideró Mentex 7 días.',               percentile:0.07, narrative:'Top creator de la semana. Una entre miles de mentes. La comunidad eligió la tuya como faro durante siete días seguidos.' },
];

function _buildAchievements() {
  return _ALL_ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: a.current >= a.target,
    unlockedAgoDays: a.current >= a.target ? null : null, // mock — se podría calcular
  }));
}

// ── Profile store editable ──────────────────────────────────────────────────
const _PROFILE_EVENT = 'mtx:profile-changed';
if (typeof window !== 'undefined' && !window.__mtxProfile) {
  let _profile = {
    id: 'me',
    name: 'Juan Diego',
    handle: '@juandiego',
    initial: 'J',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    accent: '#3dffd1',
    tagline: 'Mente despierta · Aprendiendo en silencio',
    bio: 'Curioso obsesivo. Cada día, una mente más afilada. Construyendo Mentex con la creencia de que el aprendizaje es el último deporte de alto rendimiento.',
    link: 'mentex.app',
    level: 7,
    levelLabel: 'Mente Despierta',
    xp: 234,
    xpToNext: 500,
    socials: [
      { id:'instagram', label:'Instagram', accent:'#e879c5', placeholder:'@usuario',         handle:'@juan.mentex'   },
      { id:'twitter',   label:'X',         accent:'#e8e8e8', placeholder:'@usuario',         handle:'@juanmentex'    },
      { id:'tiktok',    label:'TikTok',    accent:'#69c9d0', placeholder:'@usuario',         handle:''               },
      { id:'youtube',   label:'YouTube',   accent:'#FF0000', placeholder:'@canal',           handle:''               },
      { id:'spotify',   label:'Spotify',   accent:'#1DB954', placeholder:'Tu nombre',        handle:''               },
      { id:'linkedin',  label:'LinkedIn',  accent:'#0a66c2', placeholder:'usuario',          handle:''               },
      { id:'github',    label:'GitHub',    accent:'#a8a8a8', placeholder:'usuario',          handle:''               },
    ],
  };
  window.__mtxProfile = {
    get: () => ({ ..._profile }),
    update: (patch) => {
      _profile = { ..._profile, ...patch };
      window.dispatchEvent(new CustomEvent(_PROFILE_EVENT));
    },
  };
}

function useProfile() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const handler = () => force();
    window.addEventListener(_PROFILE_EVENT, handler);
    return () => window.removeEventListener(_PROFILE_EVENT, handler);
  }, []);
  return window.__mtxProfile ? window.__mtxProfile.get() : null;
}

// ── EditProfileSheet — bottom sheet para editar identidad + redes ───────────
function EditProfileSheet({ profile, onClose, onSave }) {
  const [name, setName]       = React.useState(profile?.name || '');
  const [handle, setHandle]   = React.useState(profile?.handle || '');
  const [tagline, setTagline] = React.useState(profile?.tagline || '');
  const [bio, setBio]         = React.useState(profile?.bio || '');
  const [link, setLink]       = React.useState(profile?.link || '');
  const [socials, setSocials] = React.useState(() =>
    (profile?.socials || []).map(s => ({ ...s }))
  );
  const nameRef = React.useRef(null);

  React.useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 320);
    return () => clearTimeout(t);
  }, []);

  if (!profile) return null;
  const accent = profile.accent || '#3dffd1';

  const socialsChanged = JSON.stringify(socials.map(s => ({ id:s.id, h:s.handle.trim() }))) !==
                         JSON.stringify((profile.socials || []).map(s => ({ id:s.id, h:(s.handle || '').trim() })));
  const dirty = name.trim() !== profile.name || handle.trim() !== profile.handle ||
                tagline.trim() !== profile.tagline || bio.trim() !== profile.bio ||
                link.trim() !== (profile.link || '') || socialsChanged;
  const valid = name.trim().length > 0;

  const normalizeHandle = (h) => {
    const trimmed = h.trim();
    if (!trimmed) return '';
    return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  };

  const updateSocial = (id, value) => {
    setSocials(prev => prev.map(s => s.id === id ? { ...s, handle: value } : s));
  };

  const getSocialIconLocal = (id) => {
    if (id === 'instagram') return IcInstagramBrand;
    if (id === 'twitter')   return IcXBrand;
    if (id === 'spotify')   return IcSpotifyBrand;
    if (id === 'tiktok')    return IcTikTok;
    if (id === 'youtube')   return IcYoutube;
    if (id === 'linkedin')  return IcLinkedIn;
    if (id === 'github')    return IcGithub;
    return IcGlobe;
  };

  // Cuál id necesita prefijo @ y cuál no
  const needsAtPrefix = (id) => ['instagram', 'twitter', 'tiktok', 'youtube'].includes(id);

  const normalizeLink = (l) => {
    const trimmed = l.trim();
    if (!trimmed) return '';
    // Limpia http(s):// y www. para almacenar solo el dominio
    return trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  };

  const handleSave = () => {
    if (!valid || !dirty) return;
    onSave?.({
      name: name.trim(),
      handle: normalizeHandle(handle),
      tagline: tagline.trim(),
      bio: bio.trim(),
      link: normalizeLink(link),
      socials: socials.map(s => {
        const trimmed = s.handle.trim();
        if (!trimmed) return { ...s, handle: '' };
        if (needsAtPrefix(s.id)) {
          return { ...s, handle: trimmed.startsWith('@') ? trimmed : `@${trimmed.replace(/^@/, '')}` };
        }
        return { ...s, handle: trimmed };
      }),
    });
    setTimeout(onClose, 200);
  };

  // Form fields config
  const FIELDS = [
    { label: 'Nombre',     value: name,    setValue: setName,    max: 40,  ref: nameRef, type:'input',    placeholder:'Tu nombre' },
    { label: 'Handle',     value: handle,  setValue: setHandle,  max: 24,  type:'input',    placeholder:'@usuario' },
    { label: 'Tagline',    value: tagline, setValue: setTagline, max: 60,  type:'input',    placeholder:'Frase corta de quién eres' },
    { label: 'Bio',        value: bio,     setValue: setBio,     max: 240, type:'textarea', placeholder:'Cuenta más sobre ti…' },
    { label: 'Sitio web',  value: link,    setValue: setLink,    max: 60,  type:'input',    placeholder:'tudominio.com' },
  ];

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
        width:'100%', height:'92%',
        display:'flex', flexDirection:'column',
        animation:'mtxSheetUp .35s cubic-bezier(.2,.9,.3,1.2) both',
      }}>
        <style>{`@keyframes mtxSheetUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

        {/* Sticky header */}
        <div style={{ flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:6 }}>
            <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.18)' }}/>
          </div>
          <div style={{ padding:'14px 22px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width:44, height:44, borderRadius:14,
              background:`linear-gradient(135deg, ${accent}33, ${accent}0c)`,
              border:`0.5px solid ${accent}55`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color: accent, flexShrink:0,
              boxShadow:`inset 0 1px 0 rgba(255,255,255,0.1), 0 0 16px ${accent}26`,
            }}>
              <IcEdit size={18} stroke="currentColor"/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="mtx-eyebrow" style={{ fontSize:9, color: accent, letterSpacing:'0.16em', fontWeight:700, marginBottom:3 }}>
                Editar perfil
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em', lineHeight:1.15 }}>
                Refina tu identidad
              </div>
              <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:2, letterSpacing:'-0.005em' }}>
                Cómo te ves en la comunidad
              </div>
            </div>
          </div>
          <div style={{ height:'0.5px', background:'rgba(255,255,255,0.06)' }}/>
        </div>

        {/* Scrollable body */}
        <div className="mtx-no-scrollbar" style={{
          flex:1, overflowY:'auto',
          paddingTop:14, paddingBottom:14,
        }}>
          {FIELDS.map((f, i) => {
            const valid = f.value.trim().length > 0;
            const Tag = f.type === 'textarea' ? 'textarea' : 'input';
            return (
              <div key={i} style={{ padding:'0 22px', marginBottom:14 }}>
                <label style={{ display:'block', fontSize:10.5, fontWeight:700, color:'var(--ink-3)',
                                letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>
                  {f.label}
                </label>
                <Tag
                  ref={f.ref}
                  type={f.type === 'input' ? 'text' : undefined}
                  rows={f.type === 'textarea' ? 4 : undefined}
                  value={f.value}
                  maxLength={f.max}
                  placeholder={f.placeholder}
                  onChange={e => f.setValue(e.target.value)}
                  onKeyDown={e => {
                    if (f.type === 'input' && e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') onClose();
                  }}
                  style={{
                    appearance:'none', width:'100%', minWidth:0, boxSizing:'border-box',
                    padding: f.type === 'textarea' ? '12px 14px' : '13px 14px',
                    borderRadius:12,
                    background:'rgba(0,0,0,0.32)',
                    border: valid ? `0.5px solid ${accent}40` : '0.5px solid rgba(255,255,255,0.08)',
                    color:'var(--ink-1)', fontSize: f.type === 'textarea' ? 13 : 14, fontWeight:500,
                    fontFamily:'var(--ff-sans)', outline:'none',
                    letterSpacing:'-0.005em',
                    lineHeight: f.type === 'textarea' ? 1.45 : 1.3,
                    resize: f.type === 'textarea' ? 'none' : undefined,
                    boxShadow: valid
                      ? `inset 0 0 0 1px ${accent}24, 0 0 0 3px ${accent}10`
                      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                    transition:'border-color .2s, box-shadow .25s',
                  }}
                />
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:5,
                              fontSize:10, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
                  {f.value.length}/{f.max}
                </div>
              </div>
            );
          })}

          {/* Redes sociales con logos brand-auténticos */}
          <div style={{ padding:'4px 22px 8px' }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:10 }}>
              <label style={{ fontSize:10.5, fontWeight:700, color:'var(--ink-3)',
                              letterSpacing:'0.12em', textTransform:'uppercase' }}>
                Redes sociales
              </label>
              <span style={{ fontSize:10, color:'var(--ink-3)', letterSpacing:'-0.005em' }}>
                Vacío = no se muestra
              </span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {socials.map(s => {
                const Ic = getSocialIconLocal(s.id);
                const hasValue = s.handle && s.handle.trim().length > 0;
                const brand = _getSocialBrand(s.id);
                // Para el ambient (border + bg sutil de la fila completa) usamos
                // s.accent que es un solo color sólido (los gradient no funcionan
                // bien con `${color}10` / `${color}33`). El círculo del icono sí
                // usa el bg/glow/border auténtico del brand.
                return (
                  <div key={s.id} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'9px 11px', borderRadius:14,
                    background: hasValue
                      ? `linear-gradient(180deg, ${s.accent}10, rgba(255,255,255,0.012))`
                      : 'rgba(255,255,255,0.025)',
                    border: hasValue ? `0.5px solid ${s.accent}33` : '0.5px solid rgba(255,255,255,0.05)',
                    boxShadow: hasValue ? `0 0 0 0.5px ${s.accent}1a, 0 4px 14px -8px ${s.accent}55` : 'none',
                    transition:'background .2s, border-color .2s, box-shadow .25s',
                  }}>
                    {/* Brand-color circle con logo auténtico (mismo lenguaje que el ProfileScreen) */}
                    <div style={{
                      width:38, height:38, borderRadius:'50%', flexShrink:0,
                      background: brand.bg,
                      border: brand.border || 0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color: '#fff',
                      boxShadow: hasValue
                        ? `0 0 16px ${brand.glow}, inset 0 1px 0 rgba(255,255,255,0.16)`
                        : 'inset 0 1px 0 rgba(255,255,255,0.1)',
                      opacity: hasValue ? 1 : 0.55,
                      transition:'opacity .2s, box-shadow .25s',
                    }}>
                      <Ic size={18} stroke="#fff"/>
                    </div>

                    {/* Label + Input */}
                    <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:1 }}>
                      <div style={{
                        fontSize:11, fontWeight:700, letterSpacing:'-0.005em',
                        color: hasValue ? 'var(--ink-1)' : 'var(--ink-2)',
                      }}>
                        {s.label}
                      </div>
                      <input
                        type="text"
                        value={s.handle}
                        maxLength={32}
                        placeholder={s.placeholder}
                        onChange={e => updateSocial(s.id, e.target.value)}
                        style={{
                          appearance:'none', width:'100%', minWidth:0, boxSizing:'border-box',
                          padding:0, border:0, outline:'none',
                          background:'transparent',
                          color: hasValue ? 'var(--ink-1)' : 'var(--ink-3)',
                          fontSize:13, fontWeight:500,
                          fontFamily:'var(--ff-sans)', letterSpacing:'-0.005em',
                        }}
                      />
                    </div>

                    {/* Clear button */}
                    {hasValue && (
                      <button onClick={() => updateSocial(s.id, '')} className="mtx-tap" aria-label={`Quitar ${s.label}`} style={{
                        width:24, height:24, borderRadius:'50%', border:0, cursor:'pointer',
                        background:'rgba(255,255,255,0.06)',
                        color:'var(--ink-3)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        flexShrink:0,
                      }}>
                        <IcClose size={11} stroke="currentColor" strokeWidth={2}/>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky footer con CTAs */}
        <div style={{
          flexShrink:0,
          padding:'12px 22px calc(env(safe-area-inset-bottom, 0px) + 16px)',
          background:'linear-gradient(180deg, rgba(15,19,18,0) 0%, rgba(15,19,18,0.96) 30%)',
          backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
          borderTop:'0.5px solid rgba(255,255,255,0.06)',
          display:'flex', gap:10,
        }}>
          <button onClick={onClose} className="mtx-tap" style={{
            flex:1, height:50, borderRadius:14, cursor:'pointer',
            border:'0.5px solid var(--glass-stroke)',
            background:'var(--glass-2)', color:'var(--ink-2)',
            fontSize:13, fontWeight:600, fontFamily:'var(--ff-sans)',
          }}>Cancelar</button>
          <button onClick={handleSave} disabled={!valid || !dirty} className="mtx-tap" style={{
            flex:1.5, height:50, borderRadius:14,
            cursor: (valid && dirty) ? 'pointer' : 'not-allowed',
            border:0,
            background: (valid && dirty)
              ? 'linear-gradient(180deg, var(--neon-soft, rgba(61,255,209,0.85)), var(--neon-deep, #1ad9ad))'
              : 'rgba(255,255,255,0.06)',
            color: (valid && dirty) ? '#0a1410' : 'var(--ink-3)',
            fontSize:14, fontWeight:700, fontFamily:'var(--ff-sans)', letterSpacing:'-0.005em',
            boxShadow: (valid && dirty)
              ? '0 0 0 1px rgba(61,255,209,0.4), 0 12px 28px -8px rgba(61,255,209,0.55), inset 0 1px 0 rgba(255,255,255,0.4)'
              : 'none',
          }}>Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}


// ── AchievementBadge ──────────────────────────────────────────────────────────
function AchievementBadge({ Ic, accent, size = 64 }) {
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <style>{`
        @keyframes mtxBadgeRotate { to { transform:rotate(360deg); } }
        @keyframes mtxBadgePulse  { 0%,100% { opacity:0.55; } 50% { opacity:0.95; } }
      `}</style>
      <div style={{
        position:'absolute', inset:-3, borderRadius:'50%',
        background:`conic-gradient(from 0deg, transparent 0%, ${accent}cc 25%, transparent 50%, ${accent}88 75%, transparent 100%)`,
        animation:'mtxBadgeRotate 5s linear infinite',
        filter:'blur(6px)', opacity:0.6,
      }}/>
      <div style={{
        position:'absolute', inset:0, borderRadius:'50%',
        background:`radial-gradient(60% 60% at 50% 30%, ${accent}55, ${accent}1a 70%, transparent 100%)`,
        border:`1.5px solid ${accent}88`,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:`0 0 24px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -8px 16px ${accent}22`,
      }}>
        <Ic size={size * 0.42} stroke={accent} strokeWidth={1.6}/>
      </div>
      <div style={{
        position:'absolute', top:-2, right:6, width:4, height:4, borderRadius:'50%',
        background:accent, boxShadow:`0 0 8px ${accent}`,
        animation:'mtxBadgePulse 1.8s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', bottom:4, left:-2, width:3, height:3, borderRadius:'50%',
        background:accent, boxShadow:`0 0 6px ${accent}`,
        animation:'mtxBadgePulse 2.4s ease-in-out 0.6s infinite',
      }}/>
    </div>
  );
}


// ── AchievementCard ───────────────────────────────────────────────────────────
function AchievementCard({ a, variant = 'scroll' }) {
  const pct = Math.min(1, a.current / a.total);
  const left = a.total - a.current;
  const isGrid = variant === 'grid';

  return (
    <div className="mtx-glass" style={{
      ...(isGrid ? { width:'100%', minWidth:0 } : { width:240, flexShrink:0, scrollSnapAlign:'start' }),
      padding:'14px 14px 12px', borderRadius:18,
      background: `linear-gradient(180deg, ${a.accent}10, rgba(255,255,255,0.012))`,
      border: `0.5px solid ${a.accent}33`,
      boxShadow: `0 0 0 0.5px ${a.accent}1a, 0 12px 28px -16px ${a.glow}`,
      position:'relative', overflow:'hidden',
    }}>
      <div style={{
        position:'absolute', top:-30, right:-20, width:90, height:90,
        background:`radial-gradient(circle, ${a.accent}28 0%, transparent 65%)`,
        pointerEvents:'none', filter:'blur(6px)',
      }}/>

      <div style={{ display:'flex', gap:11, alignItems:'flex-start', position:'relative', zIndex:1 }}>
        <AchievementBadge Ic={a.Ic} accent={a.accent} size={48}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontSize:13, fontWeight:700, color:'var(--ink-1)',
            letterSpacing:'-0.01em', lineHeight:1.18, marginBottom:2,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>{a.name}</div>
          <div style={{
            fontSize:10, color:'var(--ink-3)', lineHeight:1.4,
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
            overflow:'hidden',
          }}>{a.tagline}</div>
        </div>
      </div>

      <div style={{ marginTop:10, position:'relative', zIndex:1 }}>
        <div style={{ height:4, borderRadius:999, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
          <div style={{
            width:`${pct * 100}%`, height:'100%',
            background:`linear-gradient(90deg, ${a.accent}aa, ${a.accent})`,
            boxShadow:`0 0 12px ${a.accent}88`,
          }}/>
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:8, position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
          <span style={{
            fontSize:18, fontWeight:700, color:'var(--ink-1)',
            fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em',
            fontFamily:'var(--ff-display)',
          }}>{a.current}</span>
          <span style={{ fontSize:11, color:'var(--ink-3)' }}>de {a.total} {a.unit}</span>
        </div>
        <span style={{ fontSize:12, fontWeight:700, color:a.accent, fontVariantNumeric:'tabular-nums' }}>
          {Math.round(pct * 100)}%
        </span>
      </div>

      <div style={{ marginTop:5, fontSize:10, color:'var(--ink-3)', position:'relative', zIndex:1 }}>
        Faltan {left} {a.unit} para desbloquear
      </div>
    </div>
  );
}


// ── AchievementBadgeV2 — soporta unlocked vs locked ─────────────────────────
function AchievementBadgeV2({ tier, Ic, unlocked, size = 64 }) {
  if (!unlocked) {
    return (
      <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%',
          background:'rgba(255,255,255,0.025)',
          border:'0.5px dashed rgba(255,255,255,0.14)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--ink-3)',
        }}>
          <IcLock size={Math.round(size * 0.34)} stroke="currentColor" strokeWidth={1.6}/>
        </div>
      </div>
    );
  }
  return <AchievementBadge Ic={Ic} accent={tier.color} size={size}/>;
}


// ── AchievementCardFull — 1-por-fila, clickable, con estado lock/unlock ─────
function AchievementCardFull({ a, onTap }) {
  const tier = _ACHIEVEMENT_TIERS[a.tier];
  const pct = Math.min(1, a.current / a.target);
  const isUnlocked = a.unlocked;
  const left = a.target - a.current;

  return (
    <button
      onClick={() => onTap?.(a)}
      aria-label={`${a.name} — ${tier.label} — ${isUnlocked ? 'Desbloqueado' : `${a.current} de ${a.target} ${a.unit}`}`}
      className="mtx-tap"
      style={{
        appearance:'none', cursor:'pointer', border:0, padding:0,
        width:'100%', textAlign:'left',
        borderRadius:18, background:'transparent',
        fontFamily:'var(--ff-sans)',
      }}
    >
      <div className="mtx-glass" style={{
        padding:'14px 16px 13px', borderRadius:18,
        background: isUnlocked
          ? `linear-gradient(180deg, ${tier.color}14, rgba(255,255,255,0.012))`
          : 'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.008))',
        border: isUnlocked
          ? `0.5px solid ${tier.color}40`
          : '0.5px solid rgba(255,255,255,0.06)',
        boxShadow: isUnlocked
          ? `0 0 0 0.5px ${tier.color}1a, 0 14px 30px -16px ${tier.glow}`
          : 'var(--shadow-card)',
        position:'relative', overflow:'hidden',
        transition:'background .2s, border-color .2s, box-shadow .25s',
      }}>
        {/* Halo accent — solo unlocked */}
        {isUnlocked && (
          <div style={{
            position:'absolute', top:-30, right:-20, width:130, height:130,
            background:`radial-gradient(circle, ${tier.color}26 0%, transparent 65%)`,
            pointerEvents:'none', filter:'blur(8px)',
          }}/>
        )}

        <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative', zIndex:1 }}>
          {/* Badge */}
          <AchievementBadgeV2 tier={tier} Ic={a.Ic} unlocked={isUnlocked} size={64}/>

          {/* Info */}
          <div style={{ flex:1, minWidth:0 }}>
            {/* Name + tier pill */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
              <span style={{
                fontSize:14.5, fontWeight:800,
                color: isUnlocked ? 'var(--ink-1)' : 'var(--ink-2)',
                letterSpacing:'-0.012em', lineHeight:1.2,
                fontFamily:'var(--ff-display)',
              }}>
                {a.name}
              </span>
              <span style={{
                fontSize:8.5, fontWeight:800,
                padding:'2.5px 7px', borderRadius:999,
                background: isUnlocked ? `${tier.color}22` : 'rgba(255,255,255,0.04)',
                border: isUnlocked ? `0.5px solid ${tier.color}55` : '0.5px solid rgba(255,255,255,0.08)',
                color: isUnlocked ? tier.color : 'var(--ink-3)',
                letterSpacing:'0.12em', textTransform:'uppercase',
                whiteSpace:'nowrap',
                boxShadow: isUnlocked ? `0 0 8px ${tier.color}33` : 'none',
              }}>
                {tier.label}
              </span>
            </div>

            {/* Tagline — clamp 2 lines */}
            <div style={{
              fontSize:11.5, color:'var(--ink-3)', lineHeight:1.4, marginBottom:9,
              letterSpacing:'-0.005em',
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
            }}>
              {a.tagline}
            </div>

            {/* Progress bar */}
            <div style={{ height:5, borderRadius:999, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
              <div style={{
                width:`${pct * 100}%`, height:'100%',
                background: isUnlocked
                  ? `linear-gradient(90deg, ${tier.color}aa, ${tier.color})`
                  : `linear-gradient(90deg, ${tier.color}55, ${tier.color}aa)`,
                boxShadow: isUnlocked ? `0 0 10px ${tier.color}88` : 'none',
                borderRadius:999,
                transition:'width .55s cubic-bezier(.25,.8,.25,1)',
              }}/>
            </div>

            {/* Status row */}
            <div style={{ marginTop:7, display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8 }}>
              {isUnlocked ? (
                <span style={{
                  fontSize:11, fontWeight:700,
                  color: tier.color, letterSpacing:'-0.005em',
                  display:'inline-flex', alignItems:'center', gap:5,
                }}>
                  <IcCheck size={11} stroke="currentColor" strokeWidth={2.2}/>
                  Desbloqueado
                </span>
              ) : (
                <span style={{ fontSize:11, color:'var(--ink-2)', letterSpacing:'-0.005em', minWidth:0 }}>
                  <span style={{
                    color:'var(--ink-1)', fontWeight:800,
                    fontFamily:'var(--ff-display)', fontVariantNumeric:'tabular-nums',
                    fontSize:13, letterSpacing:'-0.018em',
                  }}>{a.current}</span>
                  <span style={{ color:'var(--ink-3)' }}> / {a.target} {a.unit}</span>
                </span>
              )}
              <span style={{
                fontSize:11, fontWeight:700,
                color: isUnlocked ? tier.color : 'var(--ink-3)',
                fontVariantNumeric:'tabular-nums', flexShrink:0,
              }}>
                {Math.round(pct * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}


// ── ProfileReviewCard — diseño community-like (rating + texto + item embed + actions)
function ProfileReviewCard({ review, onItemTap, onShareTap, onThreadTap }) {
  const [liked, setLiked] = React.useState(false);
  const [likeBurst, setLikeBurst] = React.useState(0);

  // Live comment count from store
  const liveCommentCount = window.useCommentCount ? window.useCommentCount(review?.id) : 0;

  if (!review) return null;
  const accent = review.itemAccent || '#3dffd1';
  const itemAccent = accent;
  const totalLikes = (liked ? 1 : 0); // mock — el usuario puede likear su propia review

  const formatRelative = (createdAt) => {
    const diffMs = Date.now() - (createdAt || Date.now());
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const d = Math.floor(hr / 24);
    return `${d}d`;
  };

  const handleLike = (e) => {
    e.stopPropagation();
    const willLike = !liked;
    setLiked(willLike);
    if (willLike) setLikeBurst(b => b + 1);
  };
  const handleShare = (e) => {
    e.stopPropagation();
    onShareTap?.({
      id: review.id,
      title: review.itemTitle,
      author: review.itemAuthor,
      cover: review.itemCover,
      accent: itemAccent,
    });
  };
  const handleComment = (e) => {
    e.stopPropagation();
    onThreadTap?.(review);
  };
  const handleTextTap = () => onThreadTap?.(review);

  return (
    <div className="mtx-glass" style={{
      width:'100%', minWidth:0, boxSizing:'border-box',
      padding:'14px 16px 12px', borderRadius:18,
      background: `linear-gradient(180deg, ${accent}0c, rgba(255,255,255,0.012))`,
      border: `0.5px solid ${accent}28`,
      boxShadow: `0 0 0 0.5px ${accent}1a, 0 12px 28px -16px ${accent}40`,
      position:'relative', overflow:'hidden',
      fontFamily:'var(--ff-sans)',
    }}>
      {/* Halo decorativo */}
      <div style={{
        position:'absolute', top:-26, right:-20, width:88, height:88,
        background:`radial-gradient(circle, ${accent}22 0%, transparent 65%)`,
        pointerEvents:'none', filter:'blur(4px)',
      }}/>

      {/* Header: meta de visibilidad + tiempo + rating */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:11, position:'relative', zIndex:1 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:5, flex:1, minWidth:0 }}>
          {/* Visibility chip */}
          <span style={{
            display:'inline-flex', alignItems:'center', gap:4,
            padding:'3px 8px', borderRadius:999,
            background: review.isPublic ? `${accent}14` : 'rgba(255,255,255,0.04)',
            border: review.isPublic ? `0.5px solid ${accent}30` : '0.5px solid rgba(255,255,255,0.06)',
            color: review.isPublic ? accent : 'var(--ink-3)',
            fontSize:10, fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase',
          }}>
            <span style={{ fontSize:10 }}>{review.isPublic ? '🌎' : '🔒'}</span>
            {review.isPublic ? 'Pública' : 'Privada'}
          </span>
          <span style={{ width:3, height:3, borderRadius:'50%', background:'var(--ink-3)', opacity:0.5, margin:'0 2px' }}/>
          <span style={{ fontSize:10.5, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
            {formatRelative(review.createdAt)}
          </span>
        </div>
        {/* Rating */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:1.5, flexShrink:0 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} width="12" height="12" viewBox="0 0 24 24"
                 fill={i < review.rating ? '#FFD66B' : 'none'}
                 stroke={i < review.rating ? '#FFD66B' : 'rgba(255,255,255,0.18)'}
                 strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          ))}
        </div>
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
          position:'relative', zIndex:1,
        }}
      >
        {review.text}
      </div>

      {/* Item card embed — tap abre el item (cross-tab) */}
      <div
        onClick={() => onItemTap?.(review)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onItemTap?.(review); } }}
        className="mtx-tap"
        style={{
          display:'flex', alignItems:'center', gap:11,
          padding:'9px 11px 9px 9px', borderRadius:13, cursor:'pointer',
          background:`linear-gradient(165deg, ${itemAccent}10 0%, rgba(255,255,255,0.018) 70%)`,
          border:`0.5px solid ${itemAccent}28`,
          marginBottom:11, position:'relative', zIndex:1,
        }}
      >
        <div style={{
          width:42, height:42, borderRadius:10, flexShrink:0,
          position:'relative', overflow:'hidden',
          background: `linear-gradient(135deg, ${itemAccent}33, ${itemAccent}10)`,
          border:`0.5px solid ${itemAccent}40`,
        }}>
          {review.itemCover && (
            <img src={review.itemCover} alt="" loading="lazy" style={{
              position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
            }}/>
          )}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="mtx-eyebrow" style={{ fontSize:8.5, color: itemAccent, letterSpacing:'0.14em', fontWeight:700, marginBottom:2 }}>
            Reseñado
          </div>
          <div style={{
            fontSize:13, fontWeight:700, color:'var(--ink-1)',
            letterSpacing:'-0.005em', lineHeight:1.18,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
            {review.itemTitle}
          </div>
          <div style={{
            fontSize:10.5, color:'var(--ink-3)', marginTop:1,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
            {review.itemAuthor}
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

      {/* Actions footer — like + comment + share */}
      <div style={{
        display:'flex', alignItems:'center', gap:18,
        paddingTop:8, position:'relative', zIndex:1,
        borderTop:'0.5px solid rgba(255,255,255,0.05)',
      }}>
        {/* Like con animación */}
        <button onClick={handleLike} className="mtx-tap" aria-label={liked ? 'Quitar like' : 'Like'} style={{
          appearance:'none', cursor:'pointer', border:0, background:'transparent',
          display:'inline-flex', alignItems:'center', gap:5,
          color: liked ? '#ff8b8b' : 'var(--ink-3)',
          fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:600,
          fontVariantNumeric:'tabular-nums', padding:'4px 0', position:'relative',
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
            {likeBurst > 0 && (
              <span key={likeBurst} aria-hidden="true" style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
                {[0, 1, 2, 3].map(i => (
                  <span key={i} style={{
                    position:'absolute', top:'50%', left:'50%',
                    width:3, height:3, borderRadius:'50%',
                    background:'#ff8b8b',
                    boxShadow:'0 0 4px rgba(255,139,139,0.9)',
                    animation:`mtxProfileLikeBurst${i} .65s ease-out forwards`,
                    opacity:0,
                  }}/>
                ))}
                <style>{`
                  @keyframes mtxProfileLikeBurst0 { 0% { transform:translate(-50%,-50%) scale(0.5); opacity:1; } 100% { transform:translate(-50%, -240%) scale(0.4); opacity:0; } }
                  @keyframes mtxProfileLikeBurst1 { 0% { transform:translate(-50%,-50%) scale(0.5); opacity:1; } 100% { transform:translate(120%, -200%) scale(0.3); opacity:0; } }
                  @keyframes mtxProfileLikeBurst2 { 0% { transform:translate(-50%,-50%) scale(0.5); opacity:1; } 100% { transform:translate(-220%, -200%) scale(0.3); opacity:0; } }
                  @keyframes mtxProfileLikeBurst3 { 0% { transform:translate(-50%,-50%) scale(0.4); opacity:1; } 100% { transform:translate(-50%, -180%) scale(0.2); opacity:0; } }
                `}</style>
              </span>
            )}
          </span>
          {totalLikes}
        </button>

        <button onClick={handleComment} className="mtx-tap" aria-label="Ver hilo" style={{
          appearance:'none', cursor:'pointer', border:0, background:'transparent',
          display:'inline-flex', alignItems:'center', gap:5,
          color: liveCommentCount > 0 ? 'var(--ink-2)' : 'var(--ink-3)',
          fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:600,
          fontVariantNumeric:'tabular-nums', padding:'4px 0',
        }}>
          <IcMessage size={13} stroke="currentColor" strokeWidth={1.6}/>
          {liveCommentCount}
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


// ── useUserReviews hook ─────────────────────────────────────────────────────
function useUserReviews() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const handler = () => force();
    window.addEventListener('mtx:reviews-changed', handler);
    return () => window.removeEventListener('mtx:reviews-changed', handler);
  }, []);
  return (window.__mtxReviews ? window.__mtxReviews.list() : []);
}


// ── DonutChart — minutos por categoría ─────────────────────────────────────
function StatsDonut({ segments, totalLabel, totalValue, totalUnit }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const R = 52, C = 2 * Math.PI * R, SW = 11;
  let acc = 0;
  return (
    <div style={{ position:'relative', width:140, height:140, margin:'0 auto' }}>
      <svg width={140} height={140} viewBox="0 0 140 140" style={{ transform:'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={SW}/>
        {segments.map((seg, i) => {
          const fraction = seg.value / total;
          const dash = fraction * C;
          const offset = -((acc / total) * C);
          acc += seg.value;
          return (
            <circle key={i}
              cx="70" cy="70" r={R} fill="none"
              stroke={seg.color}
              strokeWidth={SW}
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={offset}
              style={{ filter: `drop-shadow(0 0 4px ${seg.color}66)` }}
            />
          );
        })}
      </svg>
      <div style={{
        position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        textAlign:'center',
      }}>
        <div style={{ fontSize:9, fontWeight:700, color:'var(--ink-3)', letterSpacing:'0.14em', textTransform:'uppercase' }}>
          {totalLabel}
        </div>
        <div style={{
          fontSize:30, fontWeight:800, color:'var(--ink-1)',
          fontVariantNumeric:'tabular-nums', letterSpacing:'-0.03em', lineHeight:1, marginTop:2,
          fontFamily:'var(--ff-display)',
        }}>
          {totalValue}
        </div>
        {totalUnit && (
          <div style={{ fontSize:10, color:'var(--ink-3)', marginTop:2, fontWeight:500 }}>
            {totalUnit}
          </div>
        )}
      </div>
    </div>
  );
}


// ── Helpers para Stats: smooth area path ────────────────────────────────────
function _buildAreaPaths(data, w, h, padX, padY) {
  if (!data || data.length === 0) return { line: '', area: '', points: [] };
  const min = Math.min(...data), max = Math.max(...data);
  const range = Math.max(0.01, max - min);
  const points = data.map((v, i) => {
    const x = padX + (data.length === 1 ? (w - padX * 2) / 2 : (i / (data.length - 1)) * (w - padX * 2));
    const norm = (v - min) / range;
    const y = padY + (1 - (norm * 0.85 + 0.10)) * (h - padY * 2);
    return { x, y, v };
  });
  const line = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cx1 = prev.x + (p.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (p.x - prev.x) / 2;
    const cy2 = p.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
  }, '');
  const area = `${line} L ${w - padX} ${h} L ${padX} ${h} Z`;
  return { line, area, points };
}


// ── StatsTab content — Dashboard pro de 10 cards ─────────────────────────────
function ProfileStatsTab() {
  const profile = useProfile();
  const accent = profile?.accent || '#3dffd1';

  // ============================================================================
  // 1. HERO STATS (racha, mejor sesión, completados)
  // ============================================================================
  const heroStats = [
    { key:'streak',    label:'Racha',         value:'12',  unit:'días',   sub:'consecutivos', Ic:IcFlame, color:'#FFD66B', glow:'rgba(255,214,107,0.5)'  },
    { key:'best',      label:'Mejor sesión',  value:'2.4', unit:'hr',     sub:'enfocado',     Ic:IcZap,   color:'#3dffd1', glow:'rgba(61,255,209,0.5)'   },
    { key:'completed', label:'Completados',   value:'47',  unit:'piezas', sub:'aprendidas',   Ic:IcCheck, color:'#9b8aff', glow:'rgba(155,138,255,0.5)' },
  ];

  // ============================================================================
  // 2. TIEMPO RECUPERADO DE REDES SOCIALES
  // ============================================================================
  const recoveredBreakdown = [
    { id:'instagram', label:'Instagram', accent:'#e879c5', hours:9.2 },
    { id:'tiktok',    label:'TikTok',    accent:'#5dd3ff', hours:7.4 },
    { id:'twitter',   label:'X',         accent:'#e8e8e8', hours:4.1 },
    { id:'youtube',   label:'YouTube',   accent:'#FF0000', hours:2.8 },
  ];
  const recoveredTotal = recoveredBreakdown.reduce((s, r) => s + r.hours, 0);
  const recoveredMaxHours = Math.max(...recoveredBreakdown.map(r => r.hours));
  const recoveredScrolls = Math.round(recoveredTotal * 60 / 1.4); // ~1.4 min por scroll session

  // ============================================================================
  // 3. DISTRIBUCIÓN (donut)
  // ============================================================================
  const distSegments = [
    { label:'Audiolibros',  value:184, color:'#3dffd1' },
    { label:'Meditaciones', value:96,  color:'#9b8aff' },
    { label:'Charlas',      value:78,  color:'#5dd3ff' },
    { label:'Series',       value:42,  color:'#FFD66B' },
    { label:'Sonidos',      value:28,  color:'#9bd45e' },
  ];
  const distTotal = distSegments.reduce((s, x) => s + x.value, 0);

  // ============================================================================
  // 4. ESTA SEMANA — area chart 7 días
  // ============================================================================
  const weekDays = ['L','M','M','J','V','S','D'];
  const weekData = [1.2, 2.1, 0.8, 1.6, 2.4, 1.9, 1.3]; // hr per day
  const weekTotal = weekData.reduce((s, v) => s + v, 0);
  const weekAvg = weekTotal / weekData.length;
  const weekPeakIdx = weekData.indexOf(Math.max(...weekData));
  const wcW = 320, wcH = 110, wcPad = 8;
  const wcPaths = _buildAreaPaths(weekData, wcW, wcH, wcPad, wcPad);

  // ============================================================================
  // 5. MAPA DEL MES — heatmap 30 días
  // ============================================================================
  const heatmapData = Array.from({ length: 30 }, (_, i) => {
    // Distribución pseudo-real con mayoría de días con actividad
    const r = ((i * 13 + 7) % 19) / 4;
    return Math.min(4, Math.floor(r));
  });
  const activeDays = heatmapData.filter(v => v > 0).length;

  // ============================================================================
  // 6. HORA PICO
  // ============================================================================
  const hourData = Array.from({ length: 24 }, (_, h) => {
    if (h >= 6 && h <= 9)   return 30 + ((h * 7) % 22);  // mañana
    if (h >= 14 && h <= 16) return 18 + ((h * 5) % 20);  // tarde
    if (h >= 20 && h <= 22) return 38 + ((h * 11) % 24); // noche (peak)
    return 4 + ((h * 3) % 9);
  });
  const hourPeakIdx = hourData.indexOf(Math.max(...hourData));
  const hourMax = Math.max(...hourData);
  const fmtHour = (h) => `${String(h).padStart(2,'0')}:00`;

  // ============================================================================
  // 7. TOP DEL MES
  // ============================================================================
  const topContent = [
    { rank:1, title:'Hábitos Atómicos',    author:'James Clear',     cover:'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=200&q=80', plays:14, color:'#3dffd1' },
    { rank:2, title:'Deep Work',           author:'Cal Newport',     cover:'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=200&q=80', plays:9,  color:'#9b8aff' },
    { rank:3, title:'El poder del ahora',  author:'Eckhart Tolle',   cover:'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=200&q=80', plays:7,  color:'#FFD66B' },
  ];

  // ============================================================================
  // 8. COMUNIDAD — percentil
  // ============================================================================
  const userPercentile = 12; // top 12%

  // ============================================================================
  // 9. TRAVESÍA (4 stats editorial)
  // ============================================================================
  const journey = [
    { label:'Días activos',     value:'87',  unit:'días',     color:accent },
    { label:'Sesiones',         value:'142', unit:'piezas',   color:'#FFD66B' },
    { label:'Promedio diario',  value:'32',  unit:'min/día',  color:'#5dd3ff' },
    { label:'Sesión más larga', value:'108', unit:'min',      color:'#ff8b6a' },
  ];

  // ============================================================================
  // 10. EVOLUCIÓN HISTÓRICA — area chart 6 meses
  // ============================================================================
  const histMonths = ['Nov','Dic','Ene','Feb','Mar','Abr'];
  const histData = [4.5, 6.2, 8.8, 10.1, 12.3, 14.7];
  const histTotal = histData.reduce((s, v) => s + v, 0);
  const histPeakIdx = histData.indexOf(Math.max(...histData));
  const histPaths = _buildAreaPaths(histData, wcW, wcH, wcPad, wcPad);

  return (
    <div style={{ animation:'mtx-fade-up .25s ease both', paddingBottom:14 }}>

      {/* ============================================================== */}
      {/* 1. HERO STATS */}
      {/* ============================================================== */}
      <div style={{ padding:'10px 20px 14px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color: accent, letterSpacing:'0.14em', marginBottom:10, paddingLeft:2,
          textShadow:`0 0 10px ${accent}55`,
        }}>
          Tu mente en movimiento
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {heroStats.map(s => (
            <div key={s.key} className="mtx-glass" style={{
              padding:'12px 13px 11px', borderRadius:18,
              background:`linear-gradient(180deg, ${s.color}12, rgba(255,255,255,0.012))`,
              border:`0.5px solid ${s.color}38`,
              boxShadow:`0 0 0 0.5px ${s.color}1a, 0 14px 30px -16px ${s.glow}`,
              position:'relative', overflow:'hidden',
            }}>
              {/* Halo decorativo */}
              <div style={{
                position:'absolute', top:-32, right:-22, width:88, height:88,
                background:`radial-gradient(circle, ${s.color}28 0%, transparent 65%)`,
                pointerEvents:'none', filter:'blur(6px)',
              }}/>
              {/* Glint diagonal */}
              <div style={{
                position:'absolute', top:0, right:0, width:60, height:60,
                background:`linear-gradient(135deg, transparent 30%, ${s.color}14 50%, transparent 70%)`,
                pointerEvents:'none',
              }}/>

              {/* Icon ring */}
              <div style={{
                width:32, height:32, borderRadius:'50%',
                background:`linear-gradient(135deg, ${s.color}3a, ${s.color}10)`,
                border:`0.5px solid ${s.color}55`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: s.color,
                boxShadow:`0 0 14px ${s.color}33, inset 0 1px 0 rgba(255,255,255,0.18)`,
                marginBottom:9, position:'relative', zIndex:1,
              }}>
                <s.Ic size={14} stroke="currentColor" strokeWidth={1.7}/>
              </div>

              {/* Number XL gradient */}
              <div style={{
                display:'flex', alignItems:'baseline', gap:3,
                fontFamily:'var(--ff-display)',
                position:'relative', zIndex:1,
                whiteSpace:'nowrap',
              }}>
                <span style={{
                  fontSize:28, fontWeight:800,
                  fontVariantNumeric:'tabular-nums', letterSpacing:'-0.035em', lineHeight:1,
                  background:`linear-gradient(180deg, var(--ink-1) 0%, ${s.color} 130%)`,
                  WebkitBackgroundClip:'text', backgroundClip:'text',
                  WebkitTextFillColor:'transparent', color:'transparent',
                }}>
                  {s.value}
                </span>
                <span style={{ fontSize:11, fontWeight:600, color:'var(--ink-3)', letterSpacing:'-0.005em' }}>
                  {s.unit}
                </span>
              </div>

              <div style={{
                fontSize:8.5, fontWeight:700, color: s.color,
                letterSpacing:'0.12em', textTransform:'uppercase',
                marginTop:5, position:'relative', zIndex:1,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>
                {s.label}
              </div>
              <div style={{ fontSize:9.5, color:'var(--ink-3)', marginTop:1, position:'relative', zIndex:1,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. TIEMPO RECUPERADO DE REDES SOCIALES */}
      {/* ============================================================== */}
      <div style={{ padding:'4px 20px 14px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--neon)', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2,
          textShadow:'0 0 10px rgba(61,255,209,0.4)',
        }}>
          Tiempo recuperado
        </div>
        <div className="mtx-glass" style={{
          padding:'18px 18px 14px', borderRadius:20,
          background:'linear-gradient(180deg, rgba(61,255,209,0.10) 0%, rgba(255,255,255,0.012) 100%)',
          border:'0.5px solid rgba(61,255,209,0.28)',
          boxShadow:'0 0 0 0.5px rgba(61,255,209,0.14), 0 16px 40px -20px rgba(61,255,209,0.45)',
          position:'relative', overflow:'hidden',
        }}>
          {/* Halo izquierdo */}
          <div style={{
            position:'absolute', top:-40, left:-20, width:140, height:140,
            background:'radial-gradient(circle, rgba(61,255,209,0.16) 0%, transparent 60%)',
            pointerEvents:'none', filter:'blur(8px)',
          }}/>

          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:12, position:'relative', zIndex:1 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.018em', lineHeight:1.2 }}>
                De redes sociales
              </h3>
              <p style={{ margin:'4px 0 0', fontSize:11.5, color:'var(--ink-3)', lineHeight:1.4, letterSpacing:'-0.005em' }}>
                Lo que no se gastó en scroll vacío
              </p>
            </div>
            <div style={{
              display:'inline-flex', alignItems:'baseline', gap:3,
              fontFamily:'var(--ff-display)',
            }}>
              <span style={{
                fontSize:38, fontWeight:800,
                fontVariantNumeric:'tabular-nums', letterSpacing:'-0.04em', lineHeight:1,
                background:'linear-gradient(180deg, var(--ink-1) 0%, var(--neon) 120%)',
                WebkitBackgroundClip:'text', backgroundClip:'text',
                WebkitTextFillColor:'transparent', color:'transparent',
              }}>
                {recoveredTotal.toFixed(1)}
              </span>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--ink-3)' }}>hr</span>
            </div>
          </div>

          {/* Breakdown por red */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, position:'relative', zIndex:1 }}>
            {recoveredBreakdown.map(r => {
              const pct = (r.hours / recoveredMaxHours) * 100;
              return (
                <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{
                    width:8, height:8, borderRadius:'50%', flexShrink:0,
                    background: r.accent, boxShadow:`0 0 6px ${r.accent}aa`,
                  }}/>
                  <span style={{
                    width:62, fontSize:11.5, fontWeight:600, color:'var(--ink-1)', letterSpacing:'-0.005em',
                    flexShrink:0,
                  }}>
                    {r.label}
                  </span>
                  <div style={{
                    flex:1, height:5, borderRadius:999,
                    background:'rgba(255,255,255,0.05)', overflow:'hidden',
                  }}>
                    <div style={{
                      width:`${pct}%`, height:'100%',
                      background:`linear-gradient(90deg, ${r.accent}aa, ${r.accent})`,
                      boxShadow:`0 0 8px ${r.accent}66`,
                      borderRadius:999,
                      transition:'width .6s cubic-bezier(.25,.8,.25,1)',
                    }}/>
                  </div>
                  <span style={{
                    fontSize:11, fontWeight:700, color: r.accent,
                    fontVariantNumeric:'tabular-nums', letterSpacing:'-0.005em',
                    minWidth:32, textAlign:'right', flexShrink:0,
                  }}>
                    {r.hours.toFixed(1)}h
                  </span>
                </div>
              );
            })}
          </div>

          {/* Insight final */}
          <div style={{
            marginTop:14, padding:'10px 12px', borderRadius:12,
            background:'rgba(61,255,209,0.06)',
            border:'0.5px solid rgba(61,255,209,0.18)',
            display:'flex', alignItems:'center', gap:9,
            position:'relative', zIndex:1,
          }}>
            <IcShield size={14} stroke="var(--neon)" strokeWidth={1.7}/>
            <span style={{ fontSize:11.5, color:'var(--ink-2)', lineHeight:1.4, letterSpacing:'-0.005em' }}>
              Equivale a <span style={{ color:'var(--ink-1)', fontWeight:700 }}>{recoveredScrolls.toLocaleString()}</span> scrolls vacíos evitados.
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. CÓMO DISTRIBUYES TU MENTE (donut) */}
      {/* ============================================================== */}
      <div style={{ padding:'4px 20px 14px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2 }}>
          Esta semana
        </div>
        <div className="mtx-glass" style={{
          padding:'18px 18px 16px', borderRadius:20,
          background:'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))',
          border:'0.5px solid rgba(255,255,255,0.06)',
        }}>
          <h3 style={{ margin:'0 0 14px', fontSize:16, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.018em' }}>
            Cómo distribuyes tu mente
          </h3>

          <StatsDonut segments={distSegments} totalLabel="Minutos" totalValue={distTotal} totalUnit="esta semana"/>

          <div style={{ marginTop:18, display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            {distSegments.map(seg => {
              const pct = Math.round((seg.value / distTotal) * 100);
              return (
                <div key={seg.label} style={{
                  display:'flex', alignItems:'center', gap:9,
                  padding:'8px 11px', borderRadius:10,
                  background:'rgba(255,255,255,0.025)',
                  minWidth:0,
                }}>
                  <span style={{
                    width:8, height:8, borderRadius:'50%', flexShrink:0,
                    background: seg.color, boxShadow:`0 0 6px ${seg.color}88`,
                  }}/>
                  <span style={{
                    flex:1, minWidth:0,
                    fontSize:11.5, fontWeight:600, color:'var(--ink-1)', letterSpacing:'-0.005em',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                    {seg.label}
                  </span>
                  <span style={{
                    fontSize:11, fontWeight:700, color: seg.color, fontVariantNumeric:'tabular-nums', flexShrink:0,
                  }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. ESTA SEMANA — area chart 7 días */}
      {/* ============================================================== */}
      <div style={{ padding:'4px 20px 14px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2 }}>
          Tu mente esta semana
        </div>
        <div className="mtx-glass" style={{
          padding:'16px 16px 14px', borderRadius:20,
          background:'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))',
          border:'0.5px solid rgba(255,255,255,0.06)',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:10, gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.014em', lineHeight:1.2 }}>
                Últimos 7 días
              </div>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2, letterSpacing:'-0.005em' }}>
                Total: <span style={{ color:'var(--ink-1)', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{weekTotal.toFixed(1)} hr</span>
                <span style={{ margin:'0 6px', opacity:0.4 }}>·</span>
                Promedio: <span style={{ color:'var(--ink-1)', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{weekAvg.toFixed(1)} hr/día</span>
              </div>
            </div>
            <div style={{
              padding:'5px 11px', borderRadius:999,
              background:`linear-gradient(180deg, ${accent}22, ${accent}06)`,
              border:`0.5px solid ${accent}40`,
              color: accent,
              fontSize:11, fontWeight:700,
              fontVariantNumeric:'tabular-nums',
              letterSpacing:'-0.005em',
              display:'inline-flex', alignItems:'center', gap:5,
              boxShadow:`0 0 10px ${accent}28`,
              flexShrink:0,
              whiteSpace:'nowrap',
            }}>
              <IcTrend size={11} stroke="currentColor" strokeWidth={1.9}/>
              {weekDays[weekPeakIdx]} · {weekData[weekPeakIdx].toFixed(1)} hr
            </div>
          </div>

          {/* Area chart */}
          <div style={{ position:'relative', width:'100%', height: wcH + 22 }}>
            <svg viewBox={`0 0 ${wcW} ${wcH}`} preserveAspectRatio="none"
                 style={{ position:'absolute', inset:0, width:'100%', height: wcH, display:'block' }}>
              <defs>
                <linearGradient id="mtxStatsWeekArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={accent} stopOpacity="0.55"/>
                  <stop offset="60%"  stopColor={accent} stopOpacity="0.16"/>
                  <stop offset="100%" stopColor={accent} stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="mtxStatsWeekLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor={accent} stopOpacity="0.6"/>
                  <stop offset="50%"  stopColor={accent} stopOpacity="1"/>
                  <stop offset="100%" stopColor="#FFD66B" stopOpacity="1"/>
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map(p => (
                <line key={p}
                  x1={wcPad} y1={wcPad + (wcH - wcPad * 2) * p}
                  x2={wcW - wcPad} y2={wcPad + (wcH - wcPad * 2) * p}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="2 4"/>
              ))}
              <path d={wcPaths.area} fill="url(#mtxStatsWeekArea)"/>
              <path d={wcPaths.line} fill="none" stroke="url(#mtxStatsWeekLine)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ filter: `drop-shadow(0 2px 6px ${accent}66)` }}/>
              <circle cx={wcPaths.points[weekPeakIdx]?.x} cy={wcPaths.points[weekPeakIdx]?.y} r="6" fill="rgba(255,214,107,0.18)" stroke="#FFD66B" strokeWidth="1.2"/>
              <circle cx={wcPaths.points[weekPeakIdx]?.x} cy={wcPaths.points[weekPeakIdx]?.y} r="3" fill="#FFD66B"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(255,214,107,0.8))' }}/>
              {wcPaths.points.map((p, i) => i !== weekPeakIdx && (
                <circle key={i} cx={p.x} cy={p.y} r="2.2" fill={accent} opacity="0.85"
                        style={{ filter: `drop-shadow(0 0 4px ${accent}aa)` }}/>
              ))}
            </svg>
            <div style={{ position:'absolute', left:0, right:0, bottom:0, display:'flex', justifyContent:'space-between', padding:`0 ${wcPad}px` }}>
              {weekDays.map((d, i) => (
                <span key={i} style={{
                  fontSize:9.5,
                  fontWeight: i === weekPeakIdx ? 700 : 500,
                  color: i === weekPeakIdx ? '#FFD66B' : 'var(--ink-3)',
                  letterSpacing:'0.06em', textTransform:'uppercase',
                  width: `${100 / weekDays.length}%`,
                  textAlign:'center',
                }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. MAPA DEL MES (heatmap) */}
      {/* ============================================================== */}
      <div style={{ padding:'4px 20px 14px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2 }}>
          Mapa del mes
        </div>
        <div className="mtx-glass" style={{
          padding:'16px 18px', borderRadius:20,
          background:'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))',
          border:'0.5px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:14, gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.014em', lineHeight:1.2 }}>
                Tu constancia
              </div>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>
                <span style={{ color:'var(--ink-1)', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{activeDays}</span> de 30 días con aprendizaje · {Math.round(activeDays / 30 * 100)}%
              </div>
            </div>
          </div>

          {/* Heatmap grid 6 cols × 5 rows */}
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(6, 1fr)',
            gap:6,
            marginBottom:14,
          }}>
            {heatmapData.map((v, i) => {
              const intensities = [
                'rgba(255,255,255,0.04)',
                `${accent}22`,
                `${accent}55`,
                `${accent}99`,
                accent,
              ];
              const glow = v >= 3 ? `0 0 8px ${accent}66` : 'none';
              return (
                <div key={i} title={`Día ${i + 1} · ${v === 0 ? 'sin actividad' : v + ' nivel'}`} style={{
                  aspectRatio:'1',
                  borderRadius:6,
                  background: intensities[v],
                  border: v === 0 ? '0.5px solid rgba(255,255,255,0.04)' : `0.5px solid ${accent}33`,
                  boxShadow: glow,
                  transition:'background .3s, box-shadow .3s',
                }}/>
              );
            })}
          </div>

          {/* Leyenda */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:9.5, color:'var(--ink-3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
              Menos
            </span>
            <div style={{ display:'flex', gap:4 }}>
              {[0, 1, 2, 3, 4].map(level => (
                <div key={level} style={{
                  width:14, height:14, borderRadius:4,
                  background: [
                    'rgba(255,255,255,0.04)',
                    `${accent}22`,
                    `${accent}55`,
                    `${accent}99`,
                    accent,
                  ][level],
                  border: level === 0 ? '0.5px solid rgba(255,255,255,0.04)' : `0.5px solid ${accent}33`,
                }}/>
              ))}
            </div>
            <span style={{ fontSize:9.5, color:'var(--ink-3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
              Más
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. HORA PICO */}
      {/* ============================================================== */}
      <div style={{ padding:'4px 20px 14px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2 }}>
          Hora pico
        </div>
        <div className="mtx-glass" style={{
          padding:'16px 18px 14px', borderRadius:20,
          background:'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))',
          border:'0.5px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:14, gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.014em', lineHeight:1.2 }}>
                Cuándo aprende tu mente
              </div>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>
                Tu hora pico: <span style={{ color: accent, fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{fmtHour(hourPeakIdx)}</span> · {hourData[hourPeakIdx]} min promedio
              </div>
            </div>
          </div>

          {/* 24-hour bars */}
          <div style={{
            display:'flex', alignItems:'flex-end', gap:2, height:60, marginBottom:8,
          }}>
            {hourData.map((v, h) => {
              const heightPct = (v / hourMax) * 100;
              const isPeak = h === hourPeakIdx;
              return (
                <div key={h} style={{
                  flex:1, height:'100%',
                  display:'flex', alignItems:'flex-end',
                  position:'relative',
                }}>
                  <div style={{
                    width:'100%',
                    height:`${heightPct}%`,
                    minHeight:2,
                    borderRadius:'2px 2px 1px 1px',
                    background: isPeak
                      ? `linear-gradient(180deg, ${accent}, ${accent}88)`
                      : `linear-gradient(180deg, ${accent}55, ${accent}1a)`,
                    boxShadow: isPeak ? `0 0 10px ${accent}aa` : 'none',
                    transition:'height .4s cubic-bezier(.25,.8,.25,1)',
                  }}/>
                </div>
              );
            })}
          </div>

          {/* Hour ticks 00 06 12 18 */}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'0 1px' }}>
            {[0, 6, 12, 18, 23].map((h, i) => (
              <span key={h} style={{
                fontSize:9, color:'var(--ink-3)', letterSpacing:'0.04em',
                fontVariantNumeric:'tabular-nums', fontWeight:500,
              }}>
                {fmtHour(h)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 7. TOP DEL MES */}
      {/* ============================================================== */}
      <div style={{ padding:'4px 20px 14px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2 }}>
          Top del mes
        </div>
        <div className="mtx-glass" style={{
          padding:'14px 14px 12px', borderRadius:20,
          background:'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))',
          border:'0.5px solid rgba(255,255,255,0.06)',
        }}>
          <h3 style={{ margin:'0 0 12px', padding:'0 4px', fontSize:14.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.014em' }}>
            Lo que más alimentó tu mente
          </h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {topContent.map(c => (
              <div key={c.rank} style={{
                display:'flex', alignItems:'center', gap:11,
                padding:'8px 10px', borderRadius:13,
                background:`linear-gradient(165deg, ${c.color}10 0%, rgba(255,255,255,0.018) 70%)`,
                border:`0.5px solid ${c.color}28`,
              }}>
                {/* Rank */}
                <div style={{
                  width:24, height:24, borderRadius:'50%', flexShrink:0,
                  background: c.rank === 1 ? 'linear-gradient(135deg, #FFD66B, #ff8b6a)' : `linear-gradient(135deg, ${c.color}55, ${c.color}1a)`,
                  border: c.rank === 1 ? '0.5px solid rgba(255,214,107,0.6)' : `0.5px solid ${c.color}55`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: c.rank === 1 ? '#0a1410' : c.color,
                  fontSize:11, fontWeight:800,
                  fontFamily:'var(--ff-display)',
                  fontVariantNumeric:'tabular-nums',
                  boxShadow: c.rank === 1 ? '0 0 12px rgba(255,214,107,0.45)' : `0 0 8px ${c.color}33`,
                }}>
                  {c.rank}
                </div>

                {/* Cover */}
                <div style={{
                  width:42, height:42, borderRadius:9, flexShrink:0,
                  position:'relative', overflow:'hidden',
                  background:`linear-gradient(135deg, ${c.color}33, ${c.color}10)`,
                  border:`0.5px solid ${c.color}40`,
                }}>
                  <img src={c.cover} alt="" loading="lazy" style={{
                    position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
                  }}/>
                </div>

                {/* Title + author */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontSize:13, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.005em',
                    lineHeight:1.2,
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                    {c.title}
                  </div>
                  <div style={{
                    fontSize:10.5, color:'var(--ink-3)', marginTop:2,
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                    {c.author}
                  </div>
                </div>

                {/* Plays */}
                <div style={{
                  display:'flex', alignItems:'center', gap:4, flexShrink:0,
                  padding:'4px 9px', borderRadius:999,
                  background:`${c.color}14`,
                  border:`0.5px solid ${c.color}30`,
                  color: c.color,
                  fontSize:10.5, fontWeight:700,
                  fontVariantNumeric:'tabular-nums',
                }}>
                  <IcPlay size={9} stroke="currentColor"/>
                  {c.plays}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 8. COMPARATIVA CON LA COMUNIDAD */}
      {/* ============================================================== */}
      <div style={{ padding:'4px 20px 14px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'#FFD66B', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2,
          textShadow:'0 0 10px rgba(255,214,107,0.3)',
        }}>
          Tu posición
        </div>
        <div className="mtx-glass" style={{
          padding:'18px 18px 16px', borderRadius:20,
          background:'linear-gradient(180deg, rgba(255,214,107,0.10), rgba(255,255,255,0.012))',
          border:'0.5px solid rgba(255,214,107,0.28)',
          boxShadow:'0 0 0 0.5px rgba(255,214,107,0.14), 0 16px 40px -20px rgba(255,214,107,0.45)',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{
            position:'absolute', top:-30, right:-20, width:120, height:120,
            background:'radial-gradient(circle, rgba(255,214,107,0.20) 0%, transparent 60%)',
            pointerEvents:'none', filter:'blur(8px)',
          }}/>

          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14, position:'relative', zIndex:1 }}>
            <div style={{
              width:54, height:54, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg, #FFD66B, #ff8b6a)',
              border:'0.5px solid rgba(255,214,107,0.5)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#0a1410',
              boxShadow:'0 0 22px rgba(255,214,107,0.55), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}>
              <IcTrophy size={22} stroke="currentColor" strokeWidth={1.7}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{
                display:'flex', alignItems:'baseline', gap:5, marginBottom:2,
                fontFamily:'var(--ff-display)',
              }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--ink-3)', letterSpacing:'-0.005em' }}>Top</span>
                <span style={{
                  fontSize:30, fontWeight:800,
                  fontVariantNumeric:'tabular-nums', letterSpacing:'-0.035em', lineHeight:1,
                  background:'linear-gradient(180deg, var(--ink-1) 0%, #FFD66B 130%)',
                  WebkitBackgroundClip:'text', backgroundClip:'text',
                  WebkitTextFillColor:'transparent', color:'transparent',
                }}>
                  {userPercentile}%
                </span>
              </div>
              <div style={{ fontSize:12, color:'var(--ink-2)', letterSpacing:'-0.005em', lineHeight:1.4 }}>
                De Mentex en tiempo de aprendizaje
              </div>
            </div>
          </div>

          {/* Bar position */}
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{
              position:'relative', height:8, borderRadius:999,
              background:'rgba(255,255,255,0.05)',
              border:'0.5px solid rgba(255,255,255,0.06)',
              overflow:'visible',
            }}>
              <div style={{
                position:'absolute', inset:0,
                background:'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,214,107,0.4) 88%, #FFD66B 100%)',
                borderRadius:999,
              }}/>
              {/* Marker en la posición del usuario (88%) */}
              <div style={{
                position:'absolute', left:`${100 - userPercentile}%`, top:'50%',
                transform:'translate(-50%, -50%)',
                width:14, height:14, borderRadius:'50%',
                background:'#FFD66B',
                border:'2.5px solid #050706',
                boxShadow:'0 0 14px rgba(255,214,107,0.9)',
              }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
              <span style={{ fontSize:9.5, color:'var(--ink-3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                Comunidad
              </span>
              <span style={{ fontSize:9.5, color:'#FFD66B', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                Tú
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 9. TU TRAVESÍA EN NÚMEROS (4 stats editorial) */}
      {/* ============================================================== */}
      <div style={{ padding:'4px 20px 14px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2 }}>
          Tu travesía en números
        </div>
        <div className="mtx-glass" style={{
          padding:'4px 2px',
          borderRadius:16,
          background:'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))',
          border:'0.5px solid rgba(255,255,255,0.06)',
          display:'grid', gridTemplateColumns:'1fr 1fr',
        }}>
          {journey.map((s, i) => (
            <div key={s.label} style={{
              padding:'14px 16px 13px',
              borderRight: i % 2 === 0 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
              borderBottom: i < 2 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
              minWidth:0,
            }}>
              <div style={{
                fontSize:8.5, fontWeight:700, color:'var(--ink-3)', letterSpacing:'0.12em', textTransform:'uppercase',
                marginBottom:7,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>
                {s.label}
              </div>
              <div style={{
                display:'flex', alignItems:'baseline', gap:5,
                fontFamily:'var(--ff-display)',
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>
                <span style={{
                  fontSize:26, fontWeight:800,
                  fontVariantNumeric:'tabular-nums', letterSpacing:'-0.03em', lineHeight:1,
                  background:`linear-gradient(180deg, var(--ink-1) 0%, ${s.color} 130%)`,
                  WebkitBackgroundClip:'text', backgroundClip:'text',
                  WebkitTextFillColor:'transparent', color:'transparent',
                }}>
                  {s.value}
                </span>
                <span style={{ fontSize:11, fontWeight:600, color:'var(--ink-3)', letterSpacing:'-0.005em' }}>
                  {s.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 10. EVOLUCIÓN HISTÓRICA — area chart 6 meses */}
      {/* ============================================================== */}
      <div style={{ padding:'4px 20px 6px' }}>
        <div className="mtx-eyebrow" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'0.14em', marginBottom:10, paddingLeft:2 }}>
          Evolución
        </div>
        <div className="mtx-glass" style={{
          padding:'16px 16px 14px', borderRadius:20,
          background:'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))',
          border:'0.5px solid rgba(255,255,255,0.06)',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:10, gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.014em', lineHeight:1.2 }}>
                Tu mente, mes a mes
              </div>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2, letterSpacing:'-0.005em' }}>
                Total acumulado: <span style={{ color:'var(--ink-1)', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{histTotal.toFixed(0)} hr</span>
              </div>
            </div>
            <div style={{
              padding:'5px 11px', borderRadius:999,
              background:'linear-gradient(180deg, rgba(255,214,107,0.16), rgba(255,214,107,0.04))',
              border:'0.5px solid rgba(255,214,107,0.34)',
              color:'#FFD66B',
              fontSize:11, fontWeight:700,
              fontVariantNumeric:'tabular-nums',
              letterSpacing:'-0.005em',
              display:'inline-flex', alignItems:'center', gap:5,
              boxShadow:'0 0 10px rgba(255,214,107,0.18)',
              flexShrink:0,
              whiteSpace:'nowrap',
            }}>
              <IcTrend size={11} stroke="currentColor" strokeWidth={1.9}/>
              {histMonths[histPeakIdx]} · {histData[histPeakIdx]} hr
            </div>
          </div>

          {/* Area chart */}
          <div style={{ position:'relative', width:'100%', height: wcH + 22 }}>
            <svg viewBox={`0 0 ${wcW} ${wcH}`} preserveAspectRatio="none"
                 style={{ position:'absolute', inset:0, width:'100%', height: wcH, display:'block' }}>
              <defs>
                <linearGradient id="mtxStatsHistArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={accent} stopOpacity="0.55"/>
                  <stop offset="60%"  stopColor={accent} stopOpacity="0.16"/>
                  <stop offset="100%" stopColor={accent} stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="mtxStatsHistLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor={accent} stopOpacity="0.6"/>
                  <stop offset="50%"  stopColor={accent} stopOpacity="1"/>
                  <stop offset="100%" stopColor="#FFD66B" stopOpacity="1"/>
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map(p => (
                <line key={p}
                  x1={wcPad} y1={wcPad + (wcH - wcPad * 2) * p}
                  x2={wcW - wcPad} y2={wcPad + (wcH - wcPad * 2) * p}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="2 4"/>
              ))}
              <path d={histPaths.area} fill="url(#mtxStatsHistArea)"/>
              <path d={histPaths.line} fill="none" stroke="url(#mtxStatsHistLine)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ filter: `drop-shadow(0 2px 6px ${accent}66)` }}/>
              <circle cx={histPaths.points[histPeakIdx]?.x} cy={histPaths.points[histPeakIdx]?.y} r="6" fill="rgba(255,214,107,0.18)" stroke="#FFD66B" strokeWidth="1.2"/>
              <circle cx={histPaths.points[histPeakIdx]?.x} cy={histPaths.points[histPeakIdx]?.y} r="3" fill="#FFD66B"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(255,214,107,0.8))' }}/>
              {histPaths.points.map((p, i) => i !== histPeakIdx && (
                <circle key={i} cx={p.x} cy={p.y} r="2.2" fill={accent} opacity="0.85"
                        style={{ filter: `drop-shadow(0 0 4px ${accent}aa)` }}/>
              ))}
            </svg>
            <div style={{ position:'absolute', left:0, right:0, bottom:0, display:'flex', justifyContent:'space-between', padding:`0 ${wcPad}px` }}>
              {histMonths.map((m, i) => (
                <span key={m} style={{
                  fontSize:9.5,
                  fontWeight: i === histPeakIdx ? 700 : 500,
                  color: i === histPeakIdx ? '#FFD66B' : 'var(--ink-3)',
                  letterSpacing:'0.06em', textTransform:'uppercase',
                  width: `${100 / histMonths.length}%`,
                  textAlign:'center',
                }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── HeroNextAchievement — card grande del logro más cercano a desbloquear ──
// `accentOverride` permite forzar el color principal (ej. color de la categoría
// cuando se filtra por una). Si no se pasa, usa el color del tier del logro.
// El tier pill SIEMPRE mantiene su propio color (para indicar rareza).
function HeroNextAchievement({ achievement, accentOverride, onTap }) {
  if (!achievement) return null;
  const tier = _ACHIEVEMENT_TIERS[achievement.tier];
  const accent = accentOverride || tier.color;
  const pct = Math.min(1, achievement.current / achievement.target);
  const left = Math.max(0, achievement.target - achievement.current);

  return (
    <button
      onClick={() => onTap?.(achievement)}
      aria-label={`Detalle de ${achievement.name}`}
      className="mtx-tap"
      style={{
        appearance:'none', cursor:'pointer', border:0, padding:0,
        width:'100%', textAlign:'left', borderRadius:22, background:'transparent',
      }}
    >
      <div className="mtx-glass" style={{
        padding:'18px 18px 16px', borderRadius:22,
        background:`linear-gradient(180deg, ${accent}18 0%, rgba(255,255,255,0.012) 100%)`,
        border:`0.5px solid ${accent}45`,
        boxShadow:`0 0 0 0.5px ${accent}22, 0 18px 44px -22px ${accent}80`,
        position:'relative', overflow:'hidden',
      }}>
        <div style={{
          position:'absolute', top:-50, right:-30, width:200, height:200,
          background:`radial-gradient(circle, ${accent}28 0%, transparent 60%)`,
          pointerEvents:'none', filter:'blur(10px)',
        }}/>
        <div style={{ display:'flex', alignItems:'center', gap:16, position:'relative', zIndex:1 }}>
          <AchievementBadge Ic={achievement.Ic} accent={accent} size={84}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
              <span style={{
                fontSize:18, fontWeight:800, color:'var(--ink-1)',
                letterSpacing:'-0.022em', lineHeight:1.15,
                fontFamily:'var(--ff-display)',
              }}>
                {achievement.name}
              </span>
              <span style={{
                fontSize:9, fontWeight:800,
                padding:'3px 8px', borderRadius:999,
                background:`${tier.color}22`, border:`0.5px solid ${tier.color}55`,
                color: tier.color,
                letterSpacing:'0.12em', textTransform:'uppercase',
                whiteSpace:'nowrap', boxShadow:`0 0 8px ${tier.color}33`,
              }}>
                {tier.label}
              </span>
            </div>
            <div style={{
              fontSize:12, color:'var(--ink-2)', lineHeight:1.45, letterSpacing:'-0.005em',
              marginBottom:11,
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
            }}>
              {achievement.tagline}
            </div>
            <div style={{ height:7, borderRadius:999, background:'rgba(255,255,255,0.06)', overflow:'hidden', marginBottom:7 }}>
              <div style={{
                width:`${pct * 100}%`, height:'100%',
                background:`linear-gradient(90deg, ${accent}aa, ${accent})`,
                boxShadow:`0 0 12px ${accent}88`,
                borderRadius:999,
                transition:'width .6s cubic-bezier(.25,.8,.25,1)',
              }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:11.5, color:'var(--ink-2)' }}>
                Faltan{' '}
                <span style={{
                  color: accent, fontWeight:800,
                  fontFamily:'var(--ff-display)', fontVariantNumeric:'tabular-nums',
                  fontSize:13, letterSpacing:'-0.015em',
                }}>
                  {left}
                </span>
                {' '}{achievement.unit}
              </span>
              <span style={{ fontSize:11.5, fontWeight:700, color: accent, fontVariantNumeric:'tabular-nums' }}>
                {Math.round(pct * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}


// ── AwardsTab — sistema de 30 logros con filtros por categoría ──────────────
function AwardsTab({ onAchievementTap }) {
  const [category, setCategory] = React.useState('all'); // 'all' | focus | learning | ...

  const all = React.useMemo(() => _buildAchievements(), []);

  // Counts por categoría (para los pills de filtro)
  const categoriesData = Object.values(_ACHIEVEMENT_CATEGORIES).map(c => {
    const inCat = all.filter(a => a.category === c.id);
    const unlocked = inCat.filter(a => a.unlocked).length;
    return { ...c, unlocked, total: inCat.length, list: inCat };
  });

  // Hero "A un paso" — coherente con el filtro activo
  // Para 'all' → busca en todos. Para una categoría → solo en esa categoría.
  // SOLO muestra logros con progreso real (current > 0). Si no hay ninguno
  // en proceso real en la categoría, no aparece el hero.
  const scopeForHero = category === 'all' ? all : all.filter(a => a.category === category);
  const inProgress = scopeForHero.filter(a => !a.unlocked && a.current > 0);
  const nextAchievement = inProgress.length > 0
    ? inProgress.reduce((best, a) => {
        const pa = a.current / a.target;
        const pb = best.current / best.target;
        return pa > pb ? a : best;
      }, inProgress[0])
    : null;
  // Hay logros desbloqueados en esta categoría?
  const anyUnlockedInScope = scopeForHero.some(a => a.unlocked);
  const allUnlockedInScope = scopeForHero.every(a => a.unlocked);

  // Pills filtros: Todas + 6 categorías (count = total de logros, no desbloqueados)
  const filterPills = [
    { id: 'all', label: 'Todas', count: all.length, color: '#3dffd1' },
    ...Object.values(_ACHIEVEMENT_CATEGORIES).map(c => ({
      id: c.id, label: c.label, count: 5, color: c.color,
    })),
  ];

  // Lista filtrada por categoría seleccionada
  const filteredList = category === 'all' ? null : all.filter(a => a.category === category);
  const currentCatData = category === 'all' ? null : categoriesData.find(c => c.id === category);

  return (
    <div style={{ animation:'mtx-fade-up .25s ease both', paddingBottom:14 }}>

      {/* ── Filter pills — Todas + 6 categorías (scroll horizontal) ── */}
      <div className="mtx-no-scrollbar" style={{
        padding:'14px 20px 16px',
        display:'flex', gap:8, overflowX:'auto', WebkitOverflowScrolling:'touch',
      }}>
        {filterPills.map(f => {
          const isActive = category === f.id;
          return (
            <button key={f.id} onClick={() => setCategory(f.id)} className="mtx-tap" style={{
              appearance:'none', cursor:'pointer', flexShrink:0,
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'8px 14px', borderRadius:999,
              border: isActive ? `0.5px solid ${f.color}55` : '0.5px solid rgba(255,255,255,0.08)',
              background: isActive ? `linear-gradient(180deg, ${f.color}1f, ${f.color}06)` : 'rgba(255,255,255,0.04)',
              color: isActive ? f.color : 'var(--ink-2)',
              fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:600,
              letterSpacing:'-0.005em',
              boxShadow: isActive ? `0 0 0 0.5px ${f.color}1c, 0 6px 16px -8px ${f.color}66` : 'none',
              transition:'background .2s, border-color .2s, color .2s, box-shadow .25s',
              whiteSpace:'nowrap',
            }}>
              {f.label}
              <span style={{
                fontSize:9.5, fontWeight:800,
                padding:'1px 6px', borderRadius:999,
                background: isActive ? `${f.color}26` : 'rgba(255,255,255,0.06)',
                color: isActive ? f.color : 'var(--ink-3)',
                fontVariantNumeric:'tabular-nums',
              }}>
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Hero "A un paso" — solo si hay logro en progreso real ── */}
      {nextAchievement && (() => {
        // Color principal: si filter es 'all' → color del tier (variado).
        // Si filter es de categoría → color de la categoría (cohesión visual).
        const heroAccent = category === 'all' ? null : currentCatData?.color;
        const eyebrowColor = heroAccent || _ACHIEVEMENT_TIERS[nextAchievement.tier].color;
        return (
          <div style={{ padding:'0 20px 16px' }}>
            <div className="mtx-eyebrow" style={{
              fontSize:9, color: eyebrowColor, letterSpacing:'0.14em',
              marginBottom:10, paddingLeft:2,
              textShadow:`0 0 10px ${eyebrowColor}55`,
            }}>
              {category === 'all' ? 'A un paso' : `A un paso en ${currentCatData?.label || ''}`}
            </div>
            <HeroNextAchievement
              achievement={nextAchievement}
              accentOverride={heroAccent}
              onTap={onAchievementTap}
            />
          </div>
        );
      })()}

      {/* ── Estado: toda la categoría desbloqueada ── */}
      {!nextAchievement && allUnlockedInScope && category !== 'all' && currentCatData && (
        <div style={{ padding:'0 20px 16px' }}>
          <div className="mtx-glass" style={{
            padding:'18px 18px', borderRadius:20,
            background:`linear-gradient(180deg, ${currentCatData.color}14, rgba(255,255,255,0.012))`,
            border:`0.5px solid ${currentCatData.color}38`,
            boxShadow:`0 0 0 0.5px ${currentCatData.color}1a, 0 14px 30px -16px ${currentCatData.color}66`,
            display:'flex', alignItems:'center', gap:14,
            position:'relative', overflow:'hidden',
          }}>
            <div style={{
              position:'absolute', top:-30, right:-20, width:120, height:120,
              background:`radial-gradient(circle, ${currentCatData.color}26 0%, transparent 65%)`,
              pointerEvents:'none', filter:'blur(8px)',
            }}/>
            <div style={{
              width:48, height:48, borderRadius:14, flexShrink:0,
              background:`linear-gradient(135deg, ${currentCatData.color}55, ${currentCatData.color}1a)`,
              border:`0.5px solid ${currentCatData.color}66`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color: currentCatData.color,
              boxShadow:`0 0 16px ${currentCatData.color}55, inset 0 1px 0 rgba(255,255,255,0.2)`,
              position:'relative', zIndex:1,
            }}>
              <IcCheck size={22} stroke="currentColor" strokeWidth={2.4}/>
            </div>
            <div style={{ flex:1, minWidth:0, position:'relative', zIndex:1 }}>
              <div style={{ fontSize:14.5, fontWeight:800, color:'var(--ink-1)', letterSpacing:'-0.014em', lineHeight:1.2, fontFamily:'var(--ff-display)' }}>
                Categoría completa
              </div>
              <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:3, lineHeight:1.4 }}>
                Has desbloqueado los 5 logros de {currentCatData.label}.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Estado: categoría sin progreso aún (current=0 en todos) ── */}
      {!nextAchievement && !allUnlockedInScope && category !== 'all' && currentCatData && (
        <div style={{ padding:'0 20px 16px' }}>
          <div style={{
            padding:'14px 16px', borderRadius:16,
            background:'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.008))',
            border:'1px dashed rgba(255,255,255,0.10)',
            display:'flex', alignItems:'center', gap:12,
          }}>
            <div style={{
              width:36, height:36, borderRadius:11, flexShrink:0,
              background:`linear-gradient(135deg, ${currentCatData.color}1c, ${currentCatData.color}06)`,
              border:`0.5px solid ${currentCatData.color}28`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color: currentCatData.color,
            }}>
              <currentCatData.Ic size={16} stroke="currentColor" strokeWidth={1.7}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.008em', lineHeight:1.25 }}>
                Aún no has empezado en {currentCatData.label}
              </div>
              <div style={{ fontSize:10.5, color:'var(--ink-3)', marginTop:2, lineHeight:1.4 }}>
                Da el primer paso para que aparezca tu próximo objetivo aquí.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Body: vista "Todas" o vista por categoría ── */}
      {category === 'all' ? (
        // Vista "Todas" — mini-rows por categoría con 2 cards relevantes
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          {categoriesData.map(cat => {
            // En "Todas": último desbloqueado + siguiente. Si todos locked: 2 más cercanos.
            // Si todos unlocked: los 2 últimos.
            const sortedByProgress = [...cat.list].sort((a, b) => (b.current / b.target) - (a.current / a.target));
            const next = cat.list.find(a => !a.unlocked);
            const lastUnlocked = [...cat.list].reverse().find(a => a.unlocked);
            let preview = [];
            if (lastUnlocked && next) {
              preview = [lastUnlocked, next];
            } else if (next) {
              preview = sortedByProgress.slice(0, 2);
            } else {
              preview = cat.list.slice(-2);
            }

            return (
              <div key={cat.id} style={{ padding:'0 20px' }}>
                {/* Header de categoría */}
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  marginBottom:10, paddingLeft:2, gap:8,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                    <div style={{
                      width:24, height:24, borderRadius:7, flexShrink:0,
                      background:`linear-gradient(135deg, ${cat.color}33, ${cat.color}10)`,
                      border:`0.5px solid ${cat.color}45`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color: cat.color,
                      boxShadow:`0 0 8px ${cat.color}33`,
                    }}>
                      <cat.Ic size={12} stroke="currentColor" strokeWidth={1.8}/>
                    </div>
                    <span className="mtx-eyebrow" style={{
                      fontSize:10, color:'var(--ink-1)', letterSpacing:'0.12em', fontWeight:800,
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                    }}>
                      {cat.label}
                    </span>
                  </div>
                  <button
                    onClick={() => setCategory(cat.id)}
                    className="mtx-tap"
                    style={{
                      appearance:'none', cursor:'pointer', border:0,
                      background:'transparent',
                      display:'inline-flex', alignItems:'center', gap:5,
                      fontFamily:'var(--ff-sans)', fontSize:10.5, fontWeight:700,
                      color: cat.color,
                      fontVariantNumeric:'tabular-nums', letterSpacing:'-0.005em',
                      padding:'2px 0',
                    }}
                    aria-label={`Ver los 5 logros de ${cat.label}`}
                  >
                    {cat.unlocked}/{cat.total}
                    <IcChevR size={11} stroke="currentColor" strokeWidth={2}/>
                  </button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {preview.map(a => (
                    <AchievementCardFull key={a.id} a={a} onTap={onAchievementTap}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Vista por categoría — todos los 5 logros
        <div style={{ padding:'0 20px' }}>
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:10, paddingLeft:2, gap:8,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
              <div style={{
                width:24, height:24, borderRadius:7, flexShrink:0,
                background:`linear-gradient(135deg, ${currentCatData.color}33, ${currentCatData.color}10)`,
                border:`0.5px solid ${currentCatData.color}45`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: currentCatData.color,
                boxShadow:`0 0 8px ${currentCatData.color}33`,
              }}>
                <currentCatData.Ic size={12} stroke="currentColor" strokeWidth={1.8}/>
              </div>
              <span className="mtx-eyebrow" style={{
                fontSize:10, color:'var(--ink-1)', letterSpacing:'0.12em', fontWeight:800,
              }}>
                {currentCatData.label}
              </span>
            </div>
            <span style={{
              fontSize:10.5, fontWeight:700, color: currentCatData.color,
              fontVariantNumeric:'tabular-nums', letterSpacing:'-0.005em',
            }}>
              {currentCatData.unlocked} / {currentCatData.total} desbloqueados
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filteredList.map(a => (
              <AchievementCardFull key={a.id} a={a} onTap={onAchievementTap}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ── ProfileScreen — refactor billion-dollar tier ────────────────────────────
function ProfileScreen() {
  const profile = useProfile();
  const [tab, setTab] = React.useState('reviews');
  const [shareEntity, setShareEntity] = React.useState(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [threadReview, setThreadReview] = React.useState(null);
  const [statSheet, setStatSheet] = React.useState(null); // 'level' | 'hours' | 'followers' | null
  const [achievementSheet, setAchievementSheet] = React.useState(null); // achievement object | null
  const userReviews = useUserReviews();
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  const [, forceFollows] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const h = () => forceFollows();
    window.addEventListener('mtx:follows-changed', h);
    return () => window.removeEventListener('mtx:follows-changed', h);
  }, []);

  if (!profile) return null;

  const accent = profile.accent;
  const xpPct = Math.min(1, profile.xp / profile.xpToNext);
  const followersCount = window.__mtxFollows ? window.__mtxFollows.countMyFollowers() : 247;
  const hoursLearned = 47;

  // Tap en el item embed → abre item en Explore + return-to-profile al cerrar
  const handleItemTap = (review) => {
    window.dispatchEvent(new CustomEvent('mtx:open-item-from-community', { detail: { itemId: review.itemId } }));
  };
  // Tap en el texto o comment → abre el thread localmente
  const handleThreadTap = (review) => {
    // Necesitamos enriquecer el review con item + author "Tú" para el thread
    const item = (window.EXPLORE_CONTENT || []).find(c => c.id === review.itemId);
    if (!item) return;
    const enriched = {
      ...review,
      author: { id:'me', name: profile.name, initial: profile.initial, accent: profile.accent, tagline:'Tu reflexión', avatar: profile.avatar },
      item,
      timeAgo: 'Ahora',
      isOwn: true,
      likes: 0,
    };
    setThreadReview(enriched);
  };
  const handleShareTap = (entity) => setShareEntity(entity);
  const handleSocialTap = (s) => toast.show({ message: `Abriendo ${s.label}…`, duration: 1400 });
  const handleSettings = () => toast.show({ message: 'Configuraciones — próxima fase', duration: 1600 });
  const handleShareProfile = () => {
    setShareEntity({
      id: profile.id,
      title: profile.name,
      author: profile.handle,
      cover: null,
      accent: profile.accent,
    });
  };
  const handleSaveProfile = (patch) => {
    window.__mtxProfile.update(patch);
    toast.show({ message: 'Perfil actualizado', duration: 1600 });
  };

  const TABS = [
    { id: 'reviews', label: 'Reseñas',     count: userReviews.length },
    { id: 'stats',   label: 'Estadísticas' },
    { id: 'awards',  label: 'Logros',       count: ACHIEVEMENTS.length },
  ];

  // Social icon resolver — usa logos brand auténticos cuando existen
  const getSocialIcon = (id) => {
    if (id === 'instagram') return IcInstagramBrand;
    if (id === 'twitter')   return IcXBrand;
    if (id === 'spotify')   return IcSpotifyBrand;
    if (id === 'tiktok')    return IcTikTok;
    if (id === 'youtube')   return IcYoutube;
    if (id === 'linkedin')  return IcLinkedIn;
    if (id === 'github')    return IcGithub;
    return IcGlobe;
  };

  return (
    <div style={{ paddingBottom:120, animation:'mtx-fade-up .4s ease both' }}>

      {/* Cover banner — gradient atmosphère + halo accent (reducido para acercar avatar) */}
      <div style={{
        position:'relative',
        height:128,
        background:`
          radial-gradient(70% 60% at 50% 100%, ${accent}1c 0%, transparent 60%),
          radial-gradient(50% 80% at 85% 0%, ${accent}28 0%, transparent 70%),
          radial-gradient(60% 60% at 15% 30%, rgba(155,138,255,0.12) 0%, transparent 60%),
          linear-gradient(180deg, #0a1410 0%, #060809 100%)
        `,
        overflow:'hidden',
      }}>
        <div style={{
          position:'absolute', inset:0,
          background:`
            radial-gradient(circle at 30% 40%, ${accent}14 0%, transparent 35%),
            radial-gradient(circle at 75% 70%, rgba(255,214,107,0.08) 0%, transparent 40%)
          `,
          opacity: 0.85,
          pointerEvents:'none',
        }}/>

        <div style={{
          position:'absolute', bottom:0, left:0, right:0, height:50,
          background:`linear-gradient(180deg, transparent 0%, rgba(5,7,6,0.85) 100%)`,
          pointerEvents:'none',
        }}/>

        {/* Eyebrow PERFIL · top-left */}
        <div style={{
          position:'absolute', top:54, left:20, zIndex:2,
          display:'inline-flex', alignItems:'center', gap:6,
        }}>
          <span style={{
            width:6, height:6, borderRadius:999, background:'var(--neon)',
            boxShadow:'0 0 8px var(--neon)',
            animation:'mtxPulseDot 2s ease-in-out infinite',
          }}/>
          <style>{`@keyframes mtxPulseDot { 0%,100% { opacity:0.6; } 50% { opacity:1; } }`}</style>
          <span className="mtx-eyebrow" style={{ color:'var(--neon)', fontSize:10, letterSpacing:'0.16em', fontWeight:700 }}>
            Perfil
          </span>
        </div>

        {/* Settings button absolute top-right */}
        <button onClick={handleSettings} aria-label="Configuraciones" className="mtx-tap" style={{
          position:'absolute', top:48, right:16, zIndex:2,
          width:40, height:40, borderRadius:999, border:0,
          background:'rgba(20,24,22,0.7)',
          backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
          boxShadow:'inset 0 0 0 0.5px rgba(255,255,255,0.1)',
          color:'var(--ink-1)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer',
        }}>
          <IcSettings size={18} stroke="currentColor" strokeWidth={1.6}/>
        </button>
      </div>

      {/* Avatar overlapping del cover */}
      <div style={{ position:'relative', padding:'0 20px', marginTop:-40 }}>
        <div style={{ position:'relative', display:'inline-block' }}>
          <div style={{
            width:88, height:88, borderRadius:'50%',
            background: profile.avatar
              ? `url(${profile.avatar}) center/cover, radial-gradient(60% 60% at 50% 30%, ${accent}55, ${accent}1a 70%, transparent 100%)`
              : `radial-gradient(60% 60% at 50% 30%, ${accent}55, ${accent}1a 70%, transparent 100%)`,
            backgroundSize: profile.avatar ? 'cover' : undefined,
            backgroundPosition: profile.avatar ? 'center' : undefined,
            border:`3px solid #050706`,
            boxShadow:`0 0 0 2px ${accent}66, 0 0 28px ${accent}40, inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -10px 18px ${accent}1a`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color: accent, fontSize:36, fontWeight:700,
            fontFamily:'var(--ff-display)', letterSpacing:'-0.02em',
            overflow:'hidden',
          }}>
            {!profile.avatar && profile.initial}
          </div>
          {/* Level badge — compacto, contenido legible */}
          <div style={{
            position:'absolute', bottom:-2, right:-4,
            minWidth:32, height:28, padding:'0 9px',
            borderRadius:999,
            background:'linear-gradient(135deg, #FFD66B, #ff8b6a)',
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:3,
            color:'#0a1410',
            fontSize:12.5, fontWeight:800,
            fontFamily:'var(--ff-display)', letterSpacing:'-0.01em',
            boxShadow:'0 0 18px rgba(255,214,107,0.55), inset 0 1px 0 rgba(255,255,255,0.45)',
            border:'2px solid #050706',
            fontVariantNumeric:'tabular-nums',
          }}>
            <IcCrown size={10} stroke="currentColor"/>
            {profile.level}
          </div>
        </div>
      </div>

      {/* Identity block — name + handle + tagline + actions inline */}
      <div style={{ padding:'12px 20px 0', position:'relative' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{
              fontSize:22, fontWeight:800, color:'var(--ink-1)',
              letterSpacing:'-0.025em', lineHeight:1.1,
              fontFamily:'var(--ff-display)',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {profile.name}
            </div>
            <div style={{
              fontSize:13, color:'var(--ink-3)', marginTop:3,
              letterSpacing:'-0.005em',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {profile.handle}
            </div>
          </div>

          {/* Actions inline: Share + Edit */}
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button onClick={handleShareProfile} aria-label="Compartir perfil" className="mtx-tap" style={{
              width:36, height:36, borderRadius:999, border:0,
              background:'rgba(255,255,255,0.06)',
              border:'0.5px solid rgba(255,255,255,0.06)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--ink-1)', cursor:'pointer',
            }}>
              <IcShare size={15} stroke="currentColor" strokeWidth={1.7}/>
            </button>
            <button onClick={() => setEditOpen(true)} aria-label="Editar perfil" className="mtx-tap" style={{
              width:36, height:36, borderRadius:999, border:0,
              background:'rgba(255,255,255,0.06)',
              border:'0.5px solid rgba(255,255,255,0.06)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--ink-1)', cursor:'pointer',
            }}>
              <IcEdit size={15} stroke="currentColor" strokeWidth={1.7}/>
            </button>
          </div>
        </div>

        {/* Tagline más blanco */}
        {profile.tagline && (
          <div style={{
            marginTop:10,
            fontSize:12.5, color:'var(--ink-1)', fontWeight:500,
            letterSpacing:'-0.005em', lineHeight:1.4,
          }}>
            {profile.tagline}
          </div>
        )}

        {/* Bio multi-línea */}
        {profile.bio && (
          <p style={{
            margin:'10px 0 0',
            fontSize:13, color:'var(--ink-2)', lineHeight:1.55,
            letterSpacing:'-0.005em', textWrap:'pretty',
          }}>
            {profile.bio}
          </p>
        )}

        {/* Web link — debajo de la bio */}
        {profile.link && (
          <a href={`https://${profile.link}`} target="_blank" rel="noreferrer" style={{
            display:'inline-flex', alignItems:'center', gap:6,
            marginTop:8,
            fontSize:12.5, color: accent, fontWeight:600,
            textDecoration:'none', letterSpacing:'-0.005em',
          }}>
            <IcLink size={12} stroke="currentColor" strokeWidth={1.8}/>
            {profile.link}
          </a>
        )}

        {/* Métricas — 3 stats tappables, abren sheets de detalle */}
        <div className="mtx-glass" style={{
          marginTop:18,
          display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
          padding:'8px 4px', borderRadius:16,
          background:'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012))',
          border:'0.5px solid rgba(255,255,255,0.06)',
          fontFamily:'var(--ff-sans)',
        }}>
          {[
            { id:'level',     value:`Lv ${profile.level}`,                                                                                            sub: profile.levelLabel, color:'#FFD66B',     Ic: IcCrown, label: `Ver detalle de nivel ${profile.level}` },
            { id:'hours',     value:`${hoursLearned} hr`,                                                                                              sub:'de aprendizaje',    color:'var(--ink-1)',                Ic: null,    label: `Ver detalle de horas de aprendizaje` },
            { id:'followers', value: followersCount >= 1000 ? `${(followersCount / 1000).toFixed(1)}k` : followersCount.toLocaleString(),              sub:'seguidores',        color:'var(--ink-1)',                Ic: null,    label: 'Ver seguidores' },
          ].map((m, i) => (
            <button
              key={m.id}
              onClick={() => setStatSheet(m.id)}
              aria-label={m.label}
              className="mtx-tap"
              style={{
                appearance:'none', cursor:'pointer', border:0, background:'transparent',
                display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                padding:'8px 6px',
                borderLeft: i > 0 ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
                borderRadius: 0,
                position:'relative',
                transition:'background .18s',
              }}
            >
              <div style={{
                display:'inline-flex', alignItems:'center', gap:5,
                fontSize:22, fontWeight:800,
                color: m.color,
                fontVariantNumeric:'tabular-nums', letterSpacing:'-0.025em', lineHeight:1,
                fontFamily:'var(--ff-display)',
              }}>
                {m.Ic && <m.Ic size={13} stroke={m.color}/>}
                <span>{m.value}</span>
              </div>
              <div style={{
                fontSize:10.5, color:'var(--ink-3)',
                letterSpacing:'-0.005em', fontWeight:500,
                lineHeight:1.2, textAlign:'center',
              }}>
                {m.sub}
              </div>
            </button>
          ))}
        </div>

        {/* XP progress bar — separada con label, no encimada */}
        <div style={{ marginTop:12, padding:'0 2px' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:10.5, fontWeight:700, color:'#FFD66B', letterSpacing:'0.1em', textTransform:'uppercase' }}>
              Hacia Lv {profile.level + 1}
            </span>
            <span style={{ fontSize:10.5, color:'var(--ink-3)', fontVariantNumeric:'tabular-nums', letterSpacing:'-0.005em' }}>
              <span style={{ color:'var(--ink-1)', fontWeight:700 }}>{profile.xp}</span> / {profile.xpToNext} XP
            </span>
          </div>
          <div style={{
            height:5, borderRadius:999,
            background:'rgba(255,255,255,0.06)',
            overflow:'hidden', position:'relative',
          }}>
            <div style={{
              height:'100%', width:`${xpPct * 100}%`,
              background:'linear-gradient(90deg, #FFD66B 0%, #ff8b6a 100%)',
              boxShadow:'0 0 12px rgba(255,214,107,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
              borderRadius:999,
              transition:'width .5s cubic-bezier(.25,.8,.25,1)',
            }}/>
          </div>
        </div>
      </div>

      {/* Section unificada — bg natural del mtx-bg, sin wrappers extra */}
      <div style={{ marginTop:22 }}>
        {/* Social icons row — encapsulado con linecitas sutiles arriba y abajo */}
        {profile.socials && profile.socials.filter(s => s.handle && s.handle.trim()).length > 0 && (
          <div style={{
            padding:'18px 20px',
            display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap',
            borderTop:'0.5px solid rgba(255,255,255,0.11)',
            borderBottom:'0.5px solid rgba(255,255,255,0.05)',
          }}>
            {profile.socials.filter(s => s.handle && s.handle.trim()).map(s => {
              const Ic = getSocialIcon(s.id);
              const brand = _getSocialBrand(s.id);
              return (
                <button key={s.id} onClick={() => handleSocialTap(s)} aria-label={`${s.label} · ${s.handle}`} className="mtx-tap" style={{
                  appearance:'none', cursor:'pointer',
                  width:42, height:42, borderRadius:'50%',
                  border: brand.border || 0,
                  background: brand.bg,
                  color: '#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:`0 0 16px ${brand.glow}, inset 0 1px 0 rgba(255,255,255,0.16)`,
                  transition:'transform .15s, box-shadow .25s',
                }}>
                  <Ic size={18} stroke="#fff"/>
                </button>
              );
            })}
          </div>
        )}

        {/* Tabs sticky — backdrop blur transparente para mezclarse con el mtx-bg */}
        <div style={{
          position:'sticky', top:0, zIndex:5,
          padding:'18px 20px',
          background:'rgba(5,7,6,0.72)',
          backdropFilter:'blur(18px) saturate(140%)',
          WebkitBackdropFilter:'blur(18px) saturate(140%)',
        }}>
          <div style={{
            display:'flex', gap:4,
            padding:4, borderRadius:14,
            background:'rgba(255,255,255,0.05)',
            border:'0.5px solid rgba(255,255,255,0.08)',
            boxShadow:'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            {TABS.map(t => {
              const isActive = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className="mtx-tap" style={{
                  flex:1, height:38, borderRadius:10, border:0, cursor:'pointer',
                  background: isActive
                    ? 'linear-gradient(180deg, rgba(61,255,209,0.16), rgba(61,255,209,0.04))'
                    : 'transparent',
                  color: isActive ? 'var(--neon)' : 'var(--ink-2)',
                  fontFamily:'var(--ff-sans)', fontSize:12.5, fontWeight: isActive ? 700 : 600,
                  letterSpacing:'-0.005em',
                  boxShadow: isActive
                    ? '0 0 0 0.5px rgba(61,255,209,0.3), 0 6px 14px -8px rgba(61,255,209,0.45), inset 0 1px 0 rgba(255,255,255,0.08)'
                    : 'none',
                  display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5,
                  transition:'background .22s, color .22s, box-shadow .28s',
                }}>
                  {t.label}
                  {t.count != null && (
                    <span style={{
                      fontSize:10, fontWeight:700, fontVariantNumeric:'tabular-nums',
                      padding:'1.5px 5px', borderRadius:999,
                      background: isActive ? 'rgba(61,255,209,0.22)' : 'rgba(255,255,255,0.06)',
                      color: isActive ? 'var(--neon)' : 'var(--ink-3)',
                    }}>{t.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      {/* Tab content — sin padding-top (pegado al sticky); el bg del sticky absorbe el espacio */}
      <div style={{ paddingTop:0, paddingBottom:14 }}>
        {tab === 'reviews' && (
          <div style={{ animation:'mtx-fade-up .25s ease both' }}>
            {userReviews.length === 0 ? (
              <div style={{ padding:'20px 20px 0' }}>
                <div className="mtx-glass" style={{
                  padding:'20px 18px', borderRadius:18,
                  background:'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.008))',
                  border:'1px dashed rgba(61,255,209,0.28)',
                  boxShadow:'inset 0 0 22px rgba(61,255,209,0.04)',
                  display:'flex', alignItems:'center', gap:14,
                  fontFamily:'var(--ff-sans)',
                }}>
                  <div style={{
                    width:46, height:46, borderRadius:13, flexShrink:0,
                    background:'linear-gradient(135deg, rgba(61,255,209,0.26), rgba(61,255,209,0.06))',
                    border:'0.5px solid rgba(61,255,209,0.4)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'var(--neon)',
                    boxShadow:'0 0 16px rgba(61,255,209,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}>
                    <IcEdit size={18} stroke="currentColor" strokeWidth={1.6}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13.5, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.01em', marginBottom:3 }}>
                      Tu primera reseña espera
                    </div>
                    <div style={{ fontSize:11.5, color:'var(--ink-3)', lineHeight:1.45, letterSpacing:'-0.005em' }}>
                      Termina un contenido en Explorar y comparte lo que aprendiste.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding:'10px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                {userReviews.map(r => (
                  <ProfileReviewCard
                    key={r.id} review={r}
                    onItemTap={handleItemTap}
                    onShareTap={handleShareTap}
                    onThreadTap={handleThreadTap}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'stats' && <ProfileStatsTab/>}

        {tab === 'awards' && <AwardsTab onAchievementTap={(a) => setAchievementSheet(a)}/>}
        </div>
      </div>

      {/* Edit profile sheet — portal-mounted al viewport */}
      {editOpen && (() => {
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const sheet = (
          <EditProfileSheet
            profile={profile}
            onClose={() => setEditOpen(false)}
            onSave={handleSaveProfile}
          />
        );
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(sheet, overlayRoot)
          : sheet;
      })()}

      {/* Share sheet — portal-mounted */}
      {shareEntity && window.ShareSheet && (() => {
        const ShareSheetCmp = window.ShareSheet;
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const sheet = <ShareSheetCmp item={shareEntity} onClose={() => setShareEntity(null)}/>;
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(sheet, overlayRoot)
          : sheet;
      })()}

      {/* Achievement sheet — portal-mounted al viewport */}
      {achievementSheet && window.AchievementSheet && (() => {
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const sheet = (
          <window.AchievementSheet
            achievement={achievementSheet}
            onClose={() => setAchievementSheet(null)}
          />
        );
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(sheet, overlayRoot)
          : sheet;
      })()}

      {/* Stat sheets — portal-mounted al viewport */}
      {statSheet && (() => {
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        // Profile enriquecido con hours para que los sheets puedan derivar datos
        const enrichedProfile = {
          ...profile,
          hours: hoursLearned,
          followers: followersCount,
        };
        let sheet = null;
        if (statSheet === 'level' && window.LevelSheet) {
          sheet = <window.LevelSheet profile={enrichedProfile} onClose={() => setStatSheet(null)}/>;
        } else if (statSheet === 'hours' && window.HoursSheet) {
          sheet = <window.HoursSheet profile={enrichedProfile} onClose={() => setStatSheet(null)}/>;
        } else if (statSheet === 'followers' && window.FollowersSheet) {
          sheet = <window.FollowersSheet profile={enrichedProfile} onClose={() => setStatSheet(null)} isOwn={true}/>;
        }
        if (!sheet) return null;
        return overlayRoot && window.ReactDOM
          ? window.ReactDOM.createPortal(sheet, overlayRoot)
          : sheet;
      })()}

      {/* Review thread — overlay portal-mounted */}
      {threadReview && window.ReviewThreadScreen && (() => {
        const ThreadCmp = window.ReviewThreadScreen;
        const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
        const screen = (
          <ThreadCmp
            review={threadReview}
            onClose={() => setThreadReview(null)}
            onItemTap={(item) => {
              setThreadReview(null);
              setTimeout(() => handleItemTap({ itemId: item.id }), 200);
            }}
            onShareTap={(entity) => setShareEntity(entity)}
            onAuthorTap={() => { /* es el propio user — no navega */ }}
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
  ProfileScreen, ProfileReviewCard, ProfileStatsTab, useUserReviews,
  AchievementCard, AchievementCardFull, AchievementBadge, EditProfileSheet, useProfile,
  _ACHIEVEMENT_TIERS, _ACHIEVEMENT_CATEGORIES, _ALL_ACHIEVEMENTS, _buildAchievements,
  _getSocialBrand,
});
