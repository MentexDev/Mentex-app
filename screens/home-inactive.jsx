// home-inactive.jsx — Home inactivo REDISEÑADO (2026-04-30)
// ─────────────────────────────────────────────────────────────────────────────
// Foco único: planificar e iniciar el ritual de enfoque del día.
// El descubrir contenido vive en Explorar; aquí solo se elige tiempo, apps a
// bloquear y rutinas. Las secciones "Elige tu aprendizaje", "Continúa
// escuchando", "Estadísticas" y "Desafíos" se preservan en home-inactive-legacy.jsx
// por si necesitamos revertir partes.
//
// Layout vertical (de arriba a abajo):
//   1. Eyebrow "● RITUAL DIARIO" + bell — header compacto
//   2. Título 2-líneas: "Buenas tardes, Juan," / "Diseña tu próximo enfoque."
//   3. Descripción
//   4. Banner publicitario rotatorio (5 slides auto-swipe)
//   5. Tiempo de enfoque (pills + botón personalizar) — sin valor por defecto
//   6. Apps a bloquear — 5 apps default siempre visibles, switches off por defecto
//   7. Rutinas para hoy — sin selección por defecto
//   8. CTA reactivo "Comenzar jornada · X min" — basta con tener tiempo elegido
// ─────────────────────────────────────────────────────────────────────────────

const RoutineIc = ({ r, ...rest }) => {
  const Ic = r.Ic || (window.getIconById ? window.getIconById(r.iconId) : IcLeaf);
  return <Ic {...rest}/>;
};

// 10 rutinas default cubriendo las 5 métricas del runner:
//   • duration → meditate, study, breathe, train, journal, visualize
//   • count    → gratitude
//   • pages    → read
//   • distance → walk        (cardio)
//   • binary   → supplements (hábito sí/no)
// Cada rutina lleva metricType + metricValue + metricUnit explícitos para
// que el runner enrute al body correcto sin depender de _inferMetricFromLegacy.
// El campo `dur` se mantiene como display string (preview en RoutineRow,
// SectionHead del HomeInactive, etc.).
const DEFAULT_ROUTINES = [
{ id:'meditate',    label:'Meditar',     Ic:IcLeaf,     iconId:'leaf',     colorId:'neon',   accent:'#3DFFD1', dur:'10 min',  metricType:'duration', metricValue:10, metricUnit:'min',   kind:'Mente',       isDefault:true },
{ id:'read',        label:'Leer',        Ic:IcBook,     iconId:'book',     colorId:'neon',   accent:'#3DFFD1', dur:'20 pp',   metricType:'pages',    metricValue:20, metricUnit:'pp',    kind:'Aprendizaje', isDefault:true },
{ id:'study',       label:'Estudiar',    Ic:IcBrain,    iconId:'brain',    colorId:'purple', accent:'#9B8AFF', dur:'45 min',  metricType:'duration', metricValue:45, metricUnit:'min',   kind:'Aprendizaje', isDefault:true },
{ id:'breathe',     label:'Respirar',    Ic:IcWind,     iconId:'wind',     colorId:'blue',   accent:'#5EC3FF', dur:'5 min',   metricType:'duration', metricValue:5,  metricUnit:'min',   kind:'Mente',       isDefault:true },
{ id:'gratitude',   label:'Gratitud',    Ic:IcHeart,    iconId:'heart',    colorId:'neon',   accent:'#3DFFD1', dur:'3 veces', metricType:'count',    metricValue:3,  metricUnit:'veces', kind:'Mente',       isDefault:true },
{ id:'train',       label:'Entrenar',    Ic:IcDumbbell, iconId:'dumbbell', colorId:'purple', accent:'#9B8AFF', dur:'30 min',  metricType:'duration', metricValue:30, metricUnit:'min',   kind:'Cuerpo',      isDefault:true },
{ id:'journal',     label:'Journaling',  Ic:IcEdit,     iconId:'leaf',     colorId:'blue',   accent:'#5EC3FF', dur:'15 min',  metricType:'duration', metricValue:15, metricUnit:'min',   kind:'Mente',       isDefault:true },
{ id:'visualize',   label:'Visualizar',  Ic:IcEye,      iconId:'eye',      colorId:'purple', accent:'#9B8AFF', dur:'8 min',   metricType:'duration', metricValue:8,  metricUnit:'min',   kind:'Mente',       isDefault:true },
{ id:'walk',        label:'Caminar',     Ic:IcTarget,   iconId:'target',   colorId:'blue',   accent:'#5EC3FF', dur:'3 km',    metricType:'distance', metricValue:3,  metricUnit:'km',    kind:'Cuerpo',      isDefault:true },
{ id:'supplements', label:'Suplementos', Ic:IcSpark,    iconId:'spark',    colorId:'purple', accent:'#9B8AFF', dur:'Hecho',   metricType:'binary',   metricValue:0,  metricUnit:'',      kind:'Cuerpo',      isDefault:true }];

const ROUTINES = DEFAULT_ROUTINES;

// CHALLENGES + LEARNING se preservan a nivel module porque otros archivos los
// consumen vía window.CHALLENGES / window.LEARNING (p.ej. ChallengesAllScreen,
// LearningAllScreen). El Home rediseñado NO los renderiza, pero no podemos
// quitarlos del export sin tocar 4-5 archivos más.
const CHALLENGES = [
{ id:'med7',    title:'Meditación · 7 días',       tagline:'Encuentra tu silencio interior',    day:3,  total:7,  accent:'#3dffd1', Ic:IcLeaf,    status:'joined',
  difficulty:1, participants:12480, dailyMin:10, category:'Mindfulness',
  desc:'Siete días para aprender a habitar el silencio. Cada sesión te entrena a regresar al ahora cuando la mente se dispersa.',
  daily:['Meditación guiada · 10 min','Reflexión escrita · 3 min','Respiración 4-7-8 · 2 min'] },
{ id:'focus21', title:'Enfoque profundo · 21 días', tagline:'Recupera tu capacidad de atención', day:8,  total:21, accent:'#7dffe0', Ic:IcTarget,  status:'joined',
  difficulty:2, participants:8240,  dailyMin:45, category:'Productividad',
  desc:'21 días entrenando la mente para sostener atención sin distracciones. Construye la capacidad de hacer trabajo profundo.',
  daily:['Sesión de enfoque · 45 min','Apps bloqueadas · automático','Bitácora del día · 5 min'] },
{ id:'grat14',  title:'Gratitud · 14 días',         tagline:'Reentrena tu lente al mundo',       day:0,  total:14, accent:'#a8ffec', Ic:IcHeart,   status:'available',
  difficulty:1, participants:6120,  dailyMin:8,  category:'Bienestar',
  desc:'Dos semanas escribiendo lo que agradeces. Un cambio de perspectiva diario que rewires tu cerebro para notar lo bueno.',
  daily:['Journaling de gratitud · 5 min','Reflexión nocturna · 3 min'] },
{ id:'read30',  title:'Lectura · 30 días',           tagline:'Un libro en un mes, sin excusas',   day:0,  total:30, accent:'#3dffd1', Ic:IcBook,    status:'available',
  difficulty:2, participants:4890,  dailyMin:25, category:'Aprendizaje',
  desc:'Treinta días con 25 minutos de lectura intencional. Termina ese libro que sigue postergando el ruido.',
  daily:['Lectura sin distracciones · 25 min','Resaltar 1 idea clave','Notas de cierre · opcional'] },
{ id:'cold30',  title:'Ducha fría · 30 días',        tagline:'Disciplina antes que motivación',   day:30, total:30, accent:'#6ab8ff', Ic:IcWind,    status:'completed',
  difficulty:3, participants:3210,  dailyMin:3,  category:'Disciplina',
  desc:'Treinta días de duchas frías. Entrenar la mente para hacer lo difícil cuando es difícil.',
  daily:['Ducha fría · 60-90 seg','Respiración previa · 1 min'] },
{ id:'walk21',  title:'Caminata diaria · 21 días',   tagline:'Vuelve al cuerpo, vuelve a ti',     day:0,  total:21, accent:'#9b8aff', Ic:IcCompass, status:'available',
  difficulty:1, participants:5670,  dailyMin:30, category:'Bienestar',
  desc:'21 días caminando 30 minutos sin teléfono. Movimiento simple, mente despejada, ideas que llegan solas.',
  daily:['Caminata sin pantalla · 30 min','Una observación del día · 1 frase'] }];

const LEARNING = [
{ id:'l1',  title:'Hábitos Atómicos',             author:'James Clear',         kind:'Resumen',   dur:'18 min',
  bg:'linear-gradient(135deg,#1a3a35,#0f2520)', accent:'#3dffd1', category:'Productividad',
  cover:'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=600&q=80',
  narrator:'Voz · Mentex AI', rating:4.9, plays:'124k', status:'scheduled', playPct:0.38,
  desc:'Cómo cambios pequeños y consistentes producen resultados extraordinarios. La ciencia de los hábitos, destilada.',
  chapters:[{t:'La sorpresa del 1%',d:'3:12'},{t:'Sistemas vs metas',d:'4:48'},{t:'Las 4 leyes del cambio',d:'6:24'},{t:'Identidad antes que resultado',d:'3:36'}] },
{ id:'l2',  title:'Respira y vuelve a ti',         author:'Mentex',              kind:'Meditación', dur:'12 min',
  bg:'linear-gradient(135deg,#2a2540,#15102a)', accent:'#9b8aff', category:'Mindfulness',
  cover:'https://images.unsplash.com/photo-1545389336-cf090694435e?w=600&q=80',
  narrator:'Voz · Lucía', rating:4.8, plays:'89k', status:'new',
  desc:'Doce minutos para reconectar con tu cuerpo, soltar tensión y devolverle silencio a tu mente.',
  chapters:[{t:'Anclaje en el cuerpo',d:'3:00'},{t:'Respiración 4-7-8',d:'4:30'},{t:'Escaneo corporal',d:'3:30'},{t:'Cierre y agradecimiento',d:'1:00'}] },
{ id:'l3',  title:'La historia de Apple',           author:'Steve Jobs',          kind:'Biografía',  dur:'22 min',
  bg:'linear-gradient(135deg,#3a1a1a,#200f0f)', accent:'#ff8b6a', category:'Biografías',
  cover:'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80',
  narrator:'Voz · Daniel', rating:4.9, plays:'210k', status:'saved',
  desc:'Del garaje de Los Altos al producto más valioso del mundo. Lecciones del founder más obsesivo de la historia.',
  chapters:[{t:'El garaje y los inicios',d:'5:00'},{t:'La salida y la travesía',d:'6:00'},{t:'El regreso y el iPod',d:'5:30'},{t:'iPhone y legado',d:'5:30'}] },
{ id:'l4',  title:'Sapiens',                        author:'Yuval Harari',        kind:'Resumen',   dur:'25 min',
  bg:'linear-gradient(135deg,#1f2a3a,#0f1520)', accent:'#6ab8ff', category:'Aprendizaje',
  cover:'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80',
  narrator:'Voz · Mentex AI', rating:4.7, plays:'156k', status:'scheduled', playPct:0.62,
  desc:'La historia de cómo una especie irrelevante de monos terminó dominando el planeta. Una mirada en perspectiva.',
  chapters:[{t:'La revolución cognitiva',d:'6:00'},{t:'La revolución agrícola',d:'6:30'},{t:'La unificación de la humanidad',d:'6:30'},{t:'La revolución científica',d:'6:00'}] },
{ id:'l5',  title:'El poder del ahora',             author:'Eckhart Tolle',       kind:'Resumen',   dur:'20 min',
  bg:'linear-gradient(135deg,#1a2540,#0f1a2a)', accent:'#7dffe0', category:'Mindfulness',
  cover:'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=80',
  narrator:'Voz · Lucía', rating:4.8, plays:'98k', status:'played',
  desc:'La mente vive en pasado o futuro. Tu vida solo ocurre ahora. Aprender a habitar este instante lo cambia todo.',
  chapters:[{t:'No eres tu mente',d:'5:00'},{t:'El cuerpo del dolor',d:'5:30'},{t:'Entrar en el ahora',d:'5:00'},{t:'El portal hacia el ser',d:'4:30'}] },
{ id:'l6',  title:'Deep Work',                      author:'Cal Newport',         kind:'Resumen',   dur:'19 min',
  bg:'linear-gradient(135deg,#2a1a3a,#1a0f25)', accent:'#c8a8ff', category:'Productividad',
  cover:'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&q=80',
  narrator:'Voz · Daniel', rating:4.9, plays:'178k', status:'scheduled', playPct:0.15,
  desc:'En un mundo de distracciones infinitas, la capacidad de hacer trabajo profundo es la habilidad más rara y valiosa.',
  chapters:[{t:'El valor del enfoque',d:'4:30'},{t:'Reglas para la profundidad',d:'5:30'},{t:'Eliminar lo superficial',d:'4:30'},{t:'Drenar lo poco profundo',d:'4:30'}] },
{ id:'l7',  title:'Lluvia profunda',                author:'Mentex Sound',        kind:'Sonido',    dur:'60 min',
  bg:'linear-gradient(135deg,#15252a,#0a1518)', accent:'#5dd3ff', category:'Sonido',
  cover:'https://images.unsplash.com/photo-1438449805896-28a666819a20?w=600&q=80',
  narrator:'Naturaleza · 60 fps', rating:4.9, plays:'342k', status:'new',
  desc:'Una hora de lluvia constante grabada en el bosque amazónico. Sin loops, sin truenos. Solo agua cayendo.',
  chapters:[{t:'Apertura suave',d:'12:00'},{t:'Lluvia constante',d:'24:00'},{t:'Picos de intensidad',d:'14:00'},{t:'Cierre y silencio',d:'10:00'}] },
{ id:'l8',  title:'Cómo construir un MVP',          author:'Y Combinator',        kind:'Curso',     dur:'38 min',
  bg:'linear-gradient(135deg,#2a1f15,#1a120a)', accent:'#ffb47a', category:'Aprendizaje',
  cover:'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&q=80',
  narrator:'Voz · Michael Seibel', rating:4.8, plays:'156k', status:'scheduled', playPct:0.74,
  desc:'El framework definitivo para validar una idea sin morir intentándolo. Lecciones de cientos de fundadores.',
  chapters:[{t:'Qué es y qué no es un MVP',d:'8:00'},{t:'Construir con velocidad',d:'10:00'},{t:'Hablar con usuarios',d:'12:00'},{t:'Decidir qué cortar',d:'8:00'}] },
{ id:'l9',  title:'Dieter Rams · Menos pero mejor', author:'Diseño industrial',   kind:'Biografía', dur:'24 min',
  bg:'linear-gradient(135deg,#1a1a1a,#0f0f0f)', accent:'#e8e8e8', category:'Biografías',
  cover:'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=600&q=80',
  narrator:'Voz · Mentex AI', rating:4.9, plays:'67k', status:'new',
  desc:'El hombre que diseñó los productos de Braun y cuyos 10 principios redefinieron la disciplina del diseño.',
  chapters:[{t:'Los 10 principios',d:'8:00'},{t:'La era Braun',d:'6:30'},{t:'Su influencia en Apple',d:'5:30'},{t:'Legado',d:'4:00'}] },
{ id:'l10', title:'Steve Jobs · Stanford 2005',     author:'Charla legendaria',   kind:'Charla',    dur:'15 min',
  bg:'linear-gradient(135deg,#2a2a2a,#151515)', accent:'#ffd47a', category:'Charlas',
  cover:'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
  narrator:'Voz original', rating:5.0, plays:'892k', status:'new',
  desc:'Tres historias sobre conectar puntos, amor y pérdida, y la muerte. La charla más vista de la historia.',
  chapters:[{t:'Conectando los puntos',d:'5:00'},{t:'Amor y pérdida',d:'5:00'},{t:'Sobre la muerte',d:'5:00'}] },
{ id:'l11', title:'Bosque al amanecer',             author:'Mentex Sound',        kind:'Sonido',    dur:'45 min',
  bg:'linear-gradient(135deg,#1f2a1a,#101810)', accent:'#9bd45e', category:'Sonido',
  cover:'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80',
  narrator:'Naturaleza · binaural', rating:4.8, plays:'218k', status:'new',
  desc:'Pájaros y viento entre los árboles antes de que el sol toque el suelo. Grabado en estéreo binaural.',
  chapters:[{t:'Antes del alba',d:'12:00'},{t:'Primer canto',d:'15:00'},{t:'Coro completo',d:'18:00'}] }];

// IDs de las 5 apps que SIEMPRE aparecen en la sección "Mejora tu concentración"
// del Home, independiente del estado del usuario. Estos son los principales
// "ladrones de atención" según la curaduría de Mentex.
const _DEFAULT_VISIBLE_APP_IDS = ['ig', 'tt', 'yt', 'x', 'fb'];

// ── Coach Whisper messages — saludo personalizado por coachVoice ──────────
// Mapea cada voz del onboarding (warm/contemplative/energetic/wise) a un
// saludo de mañana corto + CTA tono-consistente. firstName se interpola
// runtime. El bubble aparece desde el botón ✦ del header.
function _coachWhisperMessage(coachVoice, firstName) {
  const name = (firstName || 'amig@').trim() || 'amig@';
  const map = {
    warm:          { msg: 'Hola, ' + name + '. ¿Te ayudo a programar tu día?',           cta: 'Hablemos' },
    contemplative: { msg: 'Buen día, ' + name + '. Cuando quieras, podemos empezar.',    cta: 'Comenzar' },
    energetic:     { msg: '¡' + name + '! ¿Listo para hacer hoy un gran día?',           cta: '¡Vamos!' },
    wise:          { msg: 'Bienvenido, ' + name + '. La intención del día se construye temprano.', cta: 'Sentémonos' },
  };
  return map[coachVoice] || map.warm;
}

// ── _shouldShowCoachWhisper — decide si mostrar el bubble en HomeInactive ─
// Reglas (no spam):
//   • El user debe haber completado onboarding (sin completed → no whisper).
//   • Mostrar la PRIMERA vez post-onboarding (lastShown ausente) Y
//     después solo en la PRIMERA apertura de cada día (lastShown < 00:00 hoy).
//   • Si el onboarding NO está completo, no mostrar nada.
// localStorage key: '__mtx_whisper_lastShown' = ms timestamp.
function _shouldShowCoachWhisper() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  const ob = window.__mtxOnboarding ? window.__mtxOnboarding.get() : null;
  if (!ob || !ob.completed) return false;
  try {
    const raw = localStorage.getItem('__mtx_whisper_lastShown');
    if (!raw) return true; // primera vez
    const lastShown = parseInt(raw, 10);
    if (!isFinite(lastShown)) return true;
    const lastDate = new Date(lastShown);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return lastDate.getTime() < today.getTime();
  } catch (_) { return false; }
}

function _markCoachWhisperShown() {
  try { localStorage.setItem('__mtx_whisper_lastShown', String(Date.now())); } catch (_) {}
}

// ── CoachWhisperBubble — speech bubble que sale del botón ✦ ───────────────
// Aparece anclado debajo del button ✦ del header con tail apuntando hacia
// arriba. Tap en CTA primary → abre el chat (onOpenCoach). Tap en × o
// fuera del bubble → cierra. Auto-dismiss a los 12s para no acumular.
function CoachWhisperBubble({ coachVoice, firstName, onOpen, onDismiss }) {
  const { msg, cta } = _coachWhisperMessage(coachVoice, firstName);

  React.useEffect(() => {
    const t = setTimeout(() => onDismiss(), 12000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div style={{
      position:'absolute', top:128, right:14,
      maxWidth:280,
      animation:'mtx-fade-up .35s ease both',
      zIndex:6,
      fontFamily:'var(--ff-sans)',
    }}>
      {/* Tail — pequeño cuadro rotado 45° apuntando arriba al botón ✦.
          Right:62 alinea con el centro del botón ✦ (top:78 right:70 width:44
          → centro a right:92, pero el bubble está en right:14 con maxWidth
          → tail right relativo al bubble: ~62 desde right). */}
      <div style={{
        position:'absolute', top:-6, right:62,
        width:12, height:12,
        background:'rgba(10,14,12,0.92)',
        borderTop:'0.5px solid rgba(61,255,209,0.30)',
        borderLeft:'0.5px solid rgba(61,255,209,0.30)',
        transform:'rotate(45deg)',
        zIndex:0,
      }}/>
      {/* Bubble */}
      <div style={{
        position:'relative',
        background:'rgba(10,14,12,0.92)',
        border:'0.5px solid rgba(61,255,209,0.30)',
        borderRadius:18,
        padding:'14px 16px 14px',
        boxShadow:'0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter:'blur(20px) saturate(160%)',
        WebkitBackdropFilter:'blur(20px) saturate(160%)',
      }}>
        {/* Close × top-right */}
        <button
          onClick={onDismiss}
          aria-label="Cerrar"
          className="mtx-tap"
          style={{
            position:'absolute', top:8, right:8,
            width:22, height:22, borderRadius:999,
            background:'rgba(255,255,255,0.05)', border:'none',
            color:'var(--ink-3)', cursor:'pointer',
            fontSize:13, lineHeight:1,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
        >×</button>

        {/* Eyebrow */}
        <div style={{
          fontSize:9, fontWeight:700, color:'var(--neon)',
          letterSpacing:'0.16em', textTransform:'uppercase', marginBottom:5,
          display:'inline-flex', alignItems:'center', gap:5,
        }}>
          <IcSparkles size={11} stroke="currentColor" strokeWidth={2}/>
          Tu coach
        </div>

        {/* Mensaje */}
        <div style={{
          fontSize:13, lineHeight:1.4, color:'var(--ink-1)',
          marginBottom:12, paddingRight:14,
          letterSpacing:'-0.005em',
        }}>{msg}</div>

        {/* CTA primary */}
        <button
          onClick={onOpen}
          className="mtx-tap"
          style={{
            appearance:'none', cursor:'pointer',
            width:'100%', height:36,
            borderRadius:11,
            background:'var(--neon)',
            color:'#02110b', border:'none',
            fontSize:12.5, fontWeight:700,
            letterSpacing:'-0.005em',
            fontFamily:'var(--ff-sans)',
            boxShadow:'0 6px 18px rgba(61,255,209,0.30)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}
        >
          {cta}
          <IcChevR size={13} stroke="currentColor" strokeWidth={2.4}/>
        </button>
      </div>
    </div>
  );
}

const TIME_OPTIONS = [
{ v:15,  label:'15 min' },
{ v:30,  label:'30 min' },
{ v:45,  label:'45 min' },
{ v:60,  label:'1 h'    },
{ v:120, label:'2 h'    },
{ v:180, label:'3 h'    }];

// ── BANNERS PUBLICITARIOS — 5 slides para el carousel rotatorio ─────────────
// Cada slide tiene: título, sub, gradient hero, accent, kind (visual style),
// onTap (acción al tocar). Se rotan automáticamente cada ~5s con paginator.
const _HERO_BANNERS = [
  {
    id:'b1-premium',
    kind:'premium',
    eyebrow:'PREMIUM',
    title:'Tu mente sin límites',
    sub:'Acceso ilimitado · descargas offline · sin anuncios',
    cta:'Probar 7 días gratis',
    price:'$10/mes',
    accent:'#FFD66B',
    gradient:`linear-gradient(135deg, #FFD66B 0%, #ff8b6a 50%, #b95d3d 100%)`,
    Ic:IcCrown,
  },
  {
    id:'b2-featured-book',
    kind:'feature',
    eyebrow:'AUDIOLIBRO DEL MES',
    title:'Hábitos Atómicos',
    sub:'James Clear · La ciencia de los hábitos, destilada en 18 minutos',
    cta:'Escuchar ahora',
    accent:'#3dffd1',
    gradient:`linear-gradient(135deg, #1a3a35 0%, #0a4a40 100%)`,
    cover:'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=600&q=80',
    Ic:IcBook,
  },
  {
    id:'b3-tip',
    kind:'tip',
    eyebrow:'PRINCIPIO MENTEX',
    title:'La atención es el recurso más escaso del siglo XXI',
    sub:'Cada minuto sin distraerte es una inversión a interés compuesto',
    accent:'#9b8aff',
    gradient:`linear-gradient(135deg, #2a1f50 0%, #1a1238 100%)`,
    Ic:IcSparkles,
  },
  {
    id:'b4-featured-talk',
    kind:'feature',
    eyebrow:'CHARLA LEGENDARIA',
    title:'Steve Jobs · Stanford 2005',
    sub:'Tres historias sobre conectar puntos, amor y muerte',
    cta:'Ver charla · 15 min',
    accent:'#ffd47a',
    gradient:`linear-gradient(135deg, #2a2a2a 0%, #151515 100%)`,
    cover:'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
    Ic:IcMic,
  },
  {
    id:'b5-tip',
    kind:'tip',
    eyebrow:'NUEVA META',
    title:'30 días sin redes sociales',
    sub:'El reto que está cambiando la mente de 2,400 mentexianos',
    cta:'Unirme al reto',
    accent:'#5dd3ff',
    gradient:`linear-gradient(135deg, #15252a 0%, #0a3540 100%)`,
    Ic:IcShield,
  },
];

// ── BannerCarousel — auto-swipe entre 5 slides + paginator dots ─────────────
// Props:
// - height: alto del banner en px (default 196 = card mode)
// - hideTopIcon: oculta el icon decorativo top-right del slide (cuando hay
//   otro elemento flotando ahí, como el bell del Home)
// - fullBleed: quita padding lateral, borderRadius y boxShadow para que el
//   banner toque los bordes del viewport (modo hero del Home)
// - contentPaddingTop: padding-top extra al CONTENIDO interno (eyebrow +
//   título + CTA) para evitar que choque con el área del status bar cuando
//   el banner se extiende hasta y=0
function BannerCarousel({
  slides, onTap,
  height = 196,
  hideTopIcon = false,
  fullBleed = false,
  contentPaddingTop = 20,
}) {
  const [idx, setIdx] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  // Auto-advance cada 5s. Pausado si user hace tap (para que pueda leer).
  React.useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearTimeout(t);
  }, [idx, paused, slides.length]);

  // Drag-swipe horizontal con pointer
  const dragStartX = React.useRef(0);
  const dragActive = React.useRef(false);
  const [dragX, setDragX] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartX.current = e.clientX;
    dragActive.current = true;
    setIsDragging(true);
    setPaused(true);
  };
  const onPointerMove = (e) => {
    if (!dragActive.current) return;
    setDragX(e.clientX - dragStartX.current);
  };
  const onPointerUp = () => {
    if (!dragActive.current) return;
    dragActive.current = false;
    setIsDragging(false);
    if (dragX > 60) setIdx((i) => (i - 1 + slides.length) % slides.length);
    else if (dragX < -60) setIdx((i) => (i + 1) % slides.length);
    setDragX(0);
    // Reanuda auto-swipe tras 4s de no interactuar
    setTimeout(() => setPaused(false), 4000);
  };

  const slide = slides[idx];
  const isPremium = slide.kind === 'premium';
  const Ic = slide.Ic;

  return (
    <div style={{
      padding: fullBleed ? 0 : '0 20px',
      marginBottom: fullBleed ? 0 : 24,
    }}>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => { if (Math.abs(dragX) < 5) onTap?.(slide); }}
        role="button"
        tabIndex={0}
        aria-label={`Banner: ${slide.title}`}
        style={{
          position:'relative',
          height: height,
          borderRadius: fullBleed ? 0 : 22,
          overflow:'hidden',
          background: slide.gradient,
          cursor:'pointer',
          touchAction:'pan-y',
          transform: `translateX(${dragX * 0.3}px)`,
          transition: isDragging ? 'none' : 'transform .3s cubic-bezier(.25,.8,.25,1)',
          boxShadow: fullBleed ? 'none' : `0 0 0 0.5px ${slide.accent}33, 0 18px 40px -16px ${slide.accent}80`,
          fontFamily:'var(--ff-sans)',
        }}
      >
        {/* Cover image overlay (solo para feature) */}
        {slide.cover && (
          <div style={{
            position:'absolute', inset:0,
            backgroundImage:`url(${slide.cover})`,
            backgroundSize:'cover', backgroundPosition:'center',
            opacity: 0.35,
            pointerEvents:'none',
          }}/>
        )}

        {/* Halo radial decorativo. willChange + translateZ promueven a
            GPU layer aislada → el blur no fuerza repaint del banner
            entero en cada animación de hermanos. */}
        <div style={{
          position:'absolute', top:-40, right:-30, width:180, height:180,
          background: `radial-gradient(circle, ${slide.accent}55 0%, transparent 60%)`,
          filter:'blur(8px)',
          pointerEvents:'none',
          transform:'translateZ(0)', willChange:'transform',
        }}/>

        {/* Glint diagonal sutil */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, bottom:0,
          background:'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.06) 30%, transparent 60%)',
          pointerEvents:'none',
        }}/>

        {/* Contenido */}
        <div style={{
          position:'relative', zIndex:1,
          height:'100%',
          boxSizing:'border-box', // sin esto, el padding cae FUERA del 100% y el CTA bottom se recorta por overflow:hidden del banner
          padding: `${contentPaddingTop}px 22px ${fullBleed ? 40 : 18}px`,
          display:'flex', flexDirection:'column', justifyContent:'space-between',
          color: isPremium ? '#0a1410' : 'var(--ink-1)',
        }}>
          {/* Top: eyebrow + icon */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div className="mtx-eyebrow" style={{
              fontSize:9.5, letterSpacing:'0.18em', fontWeight:800,
              color: isPremium ? 'rgba(10,20,16,0.75)' : slide.accent,
              textShadow: isPremium ? 'none' : `0 0 12px ${slide.accent}66`,
            }}>
              {slide.eyebrow}
            </div>
            {Ic && !hideTopIcon && (
              <div style={{
                width:32, height:32, borderRadius:'50%',
                background: isPremium ? 'rgba(10,20,16,0.18)' : 'rgba(255,255,255,0.08)',
                border: isPremium ? '0.5px solid rgba(10,20,16,0.3)' : `0.5px solid ${slide.accent}55`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: isPremium ? '#0a1410' : slide.accent,
                boxShadow: isPremium ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : `0 0 12px ${slide.accent}55`,
              }}>
                <Ic size={15} stroke="currentColor" strokeWidth={isPremium ? 2 : 1.7}/>
              </div>
            )}
          </div>

          {/* Title + sub */}
          <div>
            <div style={{
              fontSize:18, fontWeight:800,
              letterSpacing:'-0.022em', lineHeight:1.15,
              fontFamily:'var(--ff-display)',
              color: isPremium ? '#0a1410' : 'var(--ink-1)',
              marginBottom:4,
              textWrap:'balance',
            }}>
              {slide.title}
            </div>
            <div style={{
              fontSize:11.5, lineHeight:1.4,
              color: isPremium ? 'rgba(10,20,16,0.7)' : 'rgba(255,255,255,0.65)',
              letterSpacing:'-0.005em',
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
            }}>
              {slide.sub}
            </div>
          </div>

          {/* Bottom: CTA pill + price (si premium) */}
          {(slide.cta || slide.price) && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
              {slide.cta && (
                <span style={{
                  display:'inline-flex', alignItems:'center', gap:6,
                  padding:'6px 12px', borderRadius:999,
                  background: isPremium ? '#0a1410' : `${slide.accent}26`,
                  border: isPremium ? '0.5px solid rgba(10,20,16,0.5)' : `0.5px solid ${slide.accent}55`,
                  color: isPremium ? slide.accent : slide.accent,
                  fontSize:11.5, fontWeight:700, letterSpacing:'-0.005em',
                  boxShadow: isPremium ? '0 4px 12px rgba(0,0,0,0.4)' : 'none',
                }}>
                  {slide.cta}
                  <IcChevR size={11} stroke="currentColor" strokeWidth={2}/>
                </span>
              )}
              {slide.price && (
                <span style={{
                  fontSize:13, fontWeight:800, letterSpacing:'-0.012em',
                  color: isPremium ? '#0a1410' : 'var(--ink-1)',
                  fontFamily:'var(--ff-display)',
                }}>
                  {slide.price}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Paginator dots — DENTRO del banner cuando fullBleed (overlay sobre
            el gradient, parte inferior). En modo card siguen FUERA debajo. */}
        {fullBleed && (
          <div style={{
            position:'absolute', bottom:14, left:0, right:0,
            display:'flex', justifyContent:'center', gap:5,
            zIndex:2,
          }}>
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={(e) => { e.stopPropagation(); setIdx(i); setPaused(true); setTimeout(() => setPaused(false), 4000); }}
                aria-label={`Ir al banner ${i + 1}`}
                style={{
                  appearance:'none', cursor:'pointer', border:0,
                  width: i === idx ? 18 : 5, height:5, borderRadius:999,
                  background: i === idx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
                  boxShadow: i === idx ? '0 0 8px rgba(255,255,255,0.5)' : 'none',
                  transition:'width .3s cubic-bezier(.25,.8,.25,1), background .25s, box-shadow .25s',
                  padding:0,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Paginator dots — FUERA del banner (modo card) */}
      {!fullBleed && (
        <div style={{
          marginTop:10, display:'flex', justifyContent:'center', gap:5,
        }}>
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={(e) => { e.stopPropagation(); setIdx(i); setPaused(true); setTimeout(() => setPaused(false), 4000); }}
              aria-label={`Ir al banner ${i + 1}`}
              style={{
                appearance:'none', cursor:'pointer', border:0,
                width: i === idx ? 18 : 5, height:5, borderRadius:999,
                background: i === idx ? 'var(--neon)' : 'rgba(255,255,255,0.18)',
                boxShadow: i === idx ? '0 0 8px rgba(61,255,209,0.6)' : 'none',
                transition:'width .3s cubic-bezier(.25,.8,.25,1), background .25s, box-shadow .25s',
                padding:0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── HomeInactive — el home rediseñado ───────────────────────────────────────
// Foco único: planificar el ritual del día (tiempo + apps + rutinas) y
// arrancar la jornada con un CTA reactivo.
function HomeInactive({
  tweaks, state, setState,
  onCustom, onNotif = () => {}, notifCount = 0,
  // Phase 5.1 — Acceso rápido al coach IA desde HomeInactive. El user puede
  // pedirle al coach que le planifique la rutina antes de iniciar sesión —
  // promesa core de Mentex (planificación automática). Reusa el patrón del
  // botón ✦ de HomeActive: un button al lado del bell que cambia al tab IA.
  onOpenCoach = () => {},
  onEditApps = () => {}, onEditRoutines = () => {},
  routinesCatalog = ROUTINES,
  // Props no-usadas pero mantenidas por compat con la firma anterior:
  challenges = CHALLENGES, learning = LEARNING, onStart, _placeholder = () => {},
  onChallengeClick = () => {}, onViewAllChallenges = () => {},
  onLearningClick = () => {}, onViewAllLearning = () => {},
}) {
  const { blockedApps, routines, time } = state;

  const toggleApp = (id) => setState(s => ({
    ...s, blockedApps: s.blockedApps.includes(id)
      ? s.blockedApps.filter(x => x !== id)
      : [...s.blockedApps, id]
  }));
  const toggleRoutine = (id) => setState(s => ({
    ...s, routines: s.routines.includes(id) ? s.routines.filter(x => x !== id) : [...s.routines, id]
  }));
  const setTime = (v) => setState(s => ({ ...s, time: v }));

  const cardStyle = tweaks.cardStyle;
  const glassFor = (extra = {}) => {
    if (cardStyle === 'flat') return { background:'rgba(255,255,255,0.025)', border:'0.5px solid rgba(255,255,255,0.04)', backdropFilter:'none', ...extra };
    if (cardStyle === 'thin') return { background:'transparent', border:'0.5px solid var(--glass-stroke-strong)', backdropFilter:'none', ...extra };
    return extra;
  };

  // Greeting dinámico según hora local
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días'
                 : hour < 19 ? 'Buenas tardes'
                 :             'Buenas noches';

  // ── Coach Whisper (Phase 5.2) ──────────────────────────────────────────
  // Bubble que sale del botón ✦ con saludo personalizado al coachVoice del
  // onboarding. Aparece la primera vez post-onboarding O en la primera
  // apertura de cada día (anti-spam). Tap CTA → abre el chat IA. La decisión
  // se computa al mount (useState lazy) y se muestra después de 700ms para
  // que el HomeInactive se siente primero en pantalla — no abrupto.
  const [whisperOpen, setWhisperOpen] = React.useState(false);
  const onboardingAnswers = React.useMemo(
    () => (window.__mtxOnboarding ? window.__mtxOnboarding.get().answers : null),
    []
  );
  React.useEffect(() => {
    if (!_shouldShowCoachWhisper()) return;
    const t = setTimeout(() => setWhisperOpen(true), 700);
    return () => clearTimeout(t);
  }, []);
  const dismissWhisper = React.useCallback(() => {
    setWhisperOpen(false);
    _markCoachWhisperShown();
  }, []);
  const openWhisperChat = React.useCallback(() => {
    setWhisperOpen(false);
    _markCoachWhisperShown();
    onOpenCoach();
  }, [onOpenCoach]);

  // Banner tap handler (mock — abre toast por ahora)
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const handleBannerTap = (slide) => {
    toast.show({ message: `Abriendo ${slide.title}…`, duration: 1600 });
  };

  // CTA reactivo: basta con tener tiempo elegido. Apps y rutinas son opcionales —
  // el usuario puede arrancar solo con un timer si así lo decide.
  const hasTime = time > 0;
  const canStart = hasTime;

  // Texto formateado del tiempo
  const fmtTime = (m) => {
    if (m >= 60 && m % 60 === 0) return `${m / 60} h`;
    if (m >= 60) return `${Math.floor(m/60)}h ${m%60}m`;
    return `${m} min`;
  };

  return (
    // paddingTop:0 → el hero llega hasta el top del device, cubriendo el área
    // del status bar. Las simulaciones (9:41, wifi, batería) se renderizan en
    // un layer con z-index:10 que queda visualmente flotando sobre el banner.
    <div style={{ paddingTop:0, paddingBottom:40, animation:'mtx-fade-up .4s ease both' }}>
      {/* ── HERO full-bleed: banner rotativo (310px alto, sin padding lateral
          ni borderRadius) + bell flotando + dots dentro del banner. */}
      <div style={{ position:'relative' }}>
        <BannerCarousel
          slides={_HERO_BANNERS}
          onTap={handleBannerTap}
          height={290}
          hideTopIcon
          fullBleed
          contentPaddingTop={80}
        />
        {/* Botón ✦ IA — al lado izquierdo del bell. Mismo glass neutral que
            el bell para mantener cohesión visual minimalista — solo el
            icon ✦ en neon es el acento. Más limpio que background tinted.
            Tap → cambia al tab IA donde el user puede planificar con su
            coach (promesa core de Mentex). */}
        <button
          onClick={onOpenCoach}
          aria-label="Abrir coach Mentex"
          className="mtx-tap"
          style={{
            position:'absolute', top:78, right:70,
            width:44, height:44, borderRadius:999,
            background:'rgba(10,14,12,0.45)',
            border:'0.5px solid rgba(255,255,255,0.18)',
            backdropFilter:'blur(20px) saturate(160%)',
            WebkitBackdropFilter:'blur(20px) saturate(160%)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--neon)', cursor:'pointer', flexShrink:0,
            boxShadow:'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 12px rgba(0,0,0,0.3)',
            zIndex:5,
          }}
        >
          <IcSparkles size={18} stroke="currentColor" strokeWidth={1.7}/>
        </button>
        <button onClick={onNotif} aria-label="Notificaciones" className="mtx-tap" style={{
          position:'absolute', top:78, right:18,
          width:44, height:44, borderRadius:999,
          background:'rgba(10,14,12,0.45)',
          border:'0.5px solid rgba(255,255,255,0.18)',
          backdropFilter:'blur(20px) saturate(160%)',
          WebkitBackdropFilter:'blur(20px) saturate(160%)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', cursor:'pointer', flexShrink:0,
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 12px rgba(0,0,0,0.3)',
          zIndex:5,
        }}>
          <IcBell size={20} stroke="currentColor" strokeWidth={1.6}/>
          {notifCount > 0 && (
            <span style={{
              position:'absolute', top:2, right:2,
              width:14, height:14,
              borderRadius:'50%', background:'var(--neon)',
              color:'#0a1410', fontSize:9, fontWeight:800,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--ff-display)', fontVariantNumeric:'tabular-nums',
              border:'1.5px solid #0a0d0a',
              boxShadow:'0 0 8px rgba(61,255,209,0.55)',
              lineHeight:1,
            }}>
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </button>

        {/* Coach Whisper Bubble — sale del botón ✦ con saludo del día.
            Aparece primera vez post-onboarding o primera apertura del día. */}
        {whisperOpen && (
          <CoachWhisperBubble
            coachVoice={onboardingAnswers ? onboardingAnswers.coachVoice : null}
            firstName={onboardingAnswers && onboardingAnswers.name ? onboardingAnswers.name.split(' ')[0] : ''}
            onOpen={openWhisperChat}
            onDismiss={dismissWhisper}
          />
        )}
      </div>

      {/* ── Saludo + título + subtítulo (debajo del hero, sin eyebrow) ──
          Eliminé "● Ritual diario" porque con el hero a pantalla completa
          el eyebrow se sentía redundante con el contexto que el banner ya
          establece. */}
      <div style={{ padding:'22px 20px 14px' }}>
        <h1 className="mtx-h-1" style={{
          margin:0, color:'var(--ink-1)', fontSize:26, fontWeight:800,
          letterSpacing:'-0.03em', lineHeight:1.1,
        }}>
          {greeting}, Juan,<br/>
          ¿Listo para tu ritual de hoy?
        </h1>
        <p style={{ margin:'8px 0 0', fontSize:13, color:'var(--ink-3)', lineHeight:1.5 }}>
          Tu mente merece un momento sin ruido. Empieza eligiendo cuánto, qué apps callar y qué rutinas habitar.
        </p>
      </div>

      {/* ── Pills de tiempo (sin título arriba — el subtítulo de arriba ya
          introduce la elección). Primera pill = botón "Personalizar" con
          icono edit; le siguen las opciones predefinidas. */}
      <div style={{ marginBottom:24 }}>
        <div className="mtx-no-scrollbar" style={{
          // padding vertical para que el translateY(-1px) + box-shadow del pill activo
          // no quede recortado por el clipping del overflow-x del scroll horizontal.
          padding:'4px 20px 12px',
          display:'flex', gap:9, overflowX:'auto', WebkitOverflowScrolling:'touch',
        }}>
          {/* Personalizar — pill cuadrada al inicio, abre el modal existente */}
          <button
            onClick={onCustom}
            aria-label="Personalizar tiempo"
            className="mtx-tap"
            style={{
              flexShrink:0,
              width:48, height:48, borderRadius:14,
              border:'0.5px solid var(--glass-stroke)',
              background:'var(--glass-2)',
              backdropFilter:'blur(20px)',
              color:'var(--ink-2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer',
              transition:'background .2s, color .2s, border-color .2s',
            }}
          >
            <IcEdit size={16} stroke="currentColor" strokeWidth={1.8}/>
          </button>
          {TIME_OPTIONS.map(t => {
            const isActive = time === t.v;
            // Tap en pill activo → toggle a 0 (deselecciona). Permite cambiar
            // de opinión sin tener que ir a "Personalizar" ni elegir otro tiempo.
            return (
              <button key={t.v} onClick={() => setTime(isActive ? 0 : t.v)} className={(isActive ? 'mtx-pill-active ' : '') + 'mtx-tap'} style={{
                flexShrink:0,
                height:48, padding:'0 22px', borderRadius:14,
                border: isActive ? '0.5px solid rgba(61,255,209,0.55)' : '0.5px solid var(--glass-stroke)',
                background: isActive ? 'linear-gradient(180deg,rgba(61,255,209,0.16),rgba(61,255,209,0.06))' : 'var(--glass-2)',
                backdropFilter:'blur(20px)',
                color: isActive ? 'var(--neon)' : 'var(--ink-1)',
                fontSize:14, fontWeight:600, cursor:'pointer',
                whiteSpace:'nowrap', display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: isActive ? '0 0 0 1px rgba(61,255,209,0.18),0 8px 22px -8px rgba(61,255,209,0.55),inset 0 0 22px rgba(61,255,209,0.14)' : 'none',
                transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
                transition:'transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .3s,background .25s,border-color .25s',
                fontFamily:'var(--ff-sans)', minWidth:78,
              }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Apps a bloquear (Mejora tu concentración) ────────────────── */}
      <div style={{ marginBottom:24 }}>
        <div style={{ padding:'0 20px 12px' }}>
          <h3 style={{
            margin:0, fontSize:17, fontWeight:700, color:'var(--ink-1)',
            letterSpacing:'-0.018em', lineHeight:1.2,
          }}>
            Mejora tu concentración
          </h3>
          <p style={{ margin:'4px 0 0', fontSize:11.5, color:'var(--ink-3)', lineHeight:1.4 }}>
            Estas apps no te interrumpirán durante el enfoque
          </p>
        </div>
        <div className="mtx-glass" style={{ margin:'0 20px', padding:6, borderRadius:18, ...glassFor() }}>
          {/* Apps a mostrar = unión de los 5 defaults + cualquier extra que el user
              haya añadido a blockedApps desde el editor. Los defaults SIEMPRE
              aparecen (con switch off cuando no están activos), para que el user
              vea las opciones disponibles sin abrir el editor. */}
          {(() => {
            const visibleIds = Array.from(new Set([..._DEFAULT_VISIBLE_APP_IDS, ...blockedApps]));
            const items = visibleIds
              .map(id => APPS.find(a => a.id === id))
              .filter(Boolean);
            return items.map((app, i) => {
              const on = blockedApps.includes(app.id);
              return (
                <div key={app.id} onClick={() => toggleApp(app.id)} className="mtx-tap" style={{
                  display:'flex', alignItems:'center', gap:11,
                  padding:'7px 12px', cursor:'pointer',
                  borderTop: i === 0 ? 0 : '0.5px solid rgba(255,255,255,0.05)'
                }}>
                  <app.Icon size={30}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:500, color:'var(--ink-1)', letterSpacing:'-0.01em' }}>{app.name}</div>
                    <div style={{ fontSize:11, color:'var(--ink-3)' }}>{app.subtitle}</div>
                  </div>
                  <button className="mtx-switch" data-on={on ? '1' : '0'}
                    onClick={(e) => { e.stopPropagation(); toggleApp(app.id); }}>
                    <i/>
                  </button>
                </div>
              );
            });
          })()}
          <div onClick={onEditApps} className="mtx-tap" style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            padding:'12px', borderTop:'0.5px solid rgba(255,255,255,0.05)',
            color:'var(--neon)', fontSize:13, fontWeight:500, cursor:'pointer'
          }}>
            <IcPlus size={16} stroke="currentColor"/> Agregar apps
          </div>
        </div>
      </div>

      {/* ── 3. Rutinas para hoy (Complementos del ritual) ──────────────── */}
      <div style={{ marginBottom: canStart ? 24 : 0 }}>
        <div style={{ padding:'0 20px 12px', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <h3 style={{
              margin:0, fontSize:17, fontWeight:700, color:'var(--ink-1)',
              letterSpacing:'-0.018em', lineHeight:1.2,
            }}>
              Complementos del ritual
            </h3>
            <p style={{ margin:'4px 0 0', fontSize:11.5, color:'var(--ink-3)', lineHeight:1.4 }}>
              Pequeñas prácticas que se completan durante el enfoque
            </p>
          </div>
          <button
            onClick={onEditRoutines}
            className="mtx-tap"
            style={{
              appearance:'none', cursor:'pointer', border:0,
              background:'transparent',
              color:'var(--neon)', fontSize:12, fontWeight:600,
              fontFamily:'var(--ff-sans)', padding:'2px 0',
              flexShrink:0, marginLeft:10,
            }}
          >
            Editar
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10, padding:'0 20px' }}>
          {routinesCatalog.map(r => {
            const on = routines.includes(r.id);
            return (
              <button key={r.id} onClick={() => toggleRoutine(r.id)} className="mtx-glass mtx-tap" style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'12px 14px', borderRadius:16, cursor:'pointer',
                border: on ? '0.5px solid rgba(61,255,209,0.45)' : '0.5px solid var(--glass-stroke)',
                background: on ? 'linear-gradient(180deg,rgba(61,255,209,0.10),rgba(61,255,209,0.02))' : 'var(--glass-2)',
                boxShadow: on ? '0 0 0 1px rgba(61,255,209,0.15),0 10px 30px -10px rgba(61,255,209,0.45),inset 0 0 24px rgba(61,255,209,0.10)' : 'var(--shadow-card)',
                textAlign:'left',
                transform: on ? 'translateY(-1px)' : 'translateY(0)',
                transition:'transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .3s,background .25s,border-color .25s',
                ...glassFor()
              }}>
                <div style={{
                  width:32, height:32, borderRadius:10,
                  background: on ? 'rgba(61,255,209,0.18)' : 'rgba(255,255,255,0.04)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: on ? 'var(--neon)' : 'var(--ink-2)',
                  transition:'background .25s,color .25s'
                }}>
                  <RoutineIc r={r} size={18} stroke="currentColor"/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--ink-1)' }}>{r.label}</div>
                  <div style={{ fontSize:11, color:'var(--ink-3)' }}>{r.dur}</div>
                </div>
                <div style={{
                  width:18, height:18, borderRadius:6,
                  border: on ? 0 : '0.5px solid rgba(255,255,255,0.2)',
                  background: on ? 'var(--neon)' : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#0a1410',
                  transform: on ? 'scale(1)' : 'scale(0.92)',
                  transition:'transform .3s cubic-bezier(.34,1.56,.64,1),background .25s',
                  boxShadow: on ? '0 0 12px rgba(61,255,209,0.55)' : 'none'
                }}>
                  {on && <IcCheck size={12} stroke="currentColor" strokeWidth={2.5}/>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Recordatorios ──────────────────────────────────────────────────
          Phase 5.1 — Mismos recordatorios que aparecen en HomeActive y
          AgendaSheet, single-source desde __mtxIAAgenda. El user puede
          arrancar el día con sus reminders pendientes ya visibles, y el
          coach IA puede agendarle nuevos desde el chat. NO duplicamos el
          componente — montamos el mismo HomeRemindersCard que vive en
          screens/ia-agenda.jsx y se exporta a window.
          marginTop:32 iguala el spacing entre secciones que tiene "Mejora
          tu concentración" → "Apps a bloquear" arriba en la página. */}
      {window.HomeRemindersCard && (
        <div style={{ padding:'32px 0 0' }}>
          <window.HomeRemindersCard/>
        </div>
      )}

      {/* ── Aviso contextual: falta el tiempo ────────────────────────────────
          Aparece SOLO cuando el user ha seleccionado al menos una app para
          bloquear o una rutina, pero todavía no eligió un tiempo. Movido al
          FINAL de la página (Phase 5.1) para que sea el último call-to-action
          visible — el user lee toda su configuración (apps + rutinas +
          recordatorios) y al final ve "para activar la sesión, falta el
          tiempo". Tono ámbar (no rojo): es guía amistosa, no error.
          Tap scrollea al top donde vive el grid de tiempos. */}
      {!hasTime && (blockedApps.length > 0 || routines.length > 0) && (
        <div style={{ padding: '12px 20px 0' }}>
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && typeof window.scrollMtxBgToTop === 'function') {
                window.scrollMtxBgToTop();
              }
            }}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer', textAlign: 'left',
              width: '100%', padding: '14px 16px', borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(255,200,80,0.08) 0%, rgba(255,200,80,0.02) 100%)',
              border: '0.5px solid rgba(255,200,80,0.28)',
              boxShadow: '0 0 0 0.5px rgba(255,200,80,0.06), 0 12px 28px -16px rgba(255,200,80,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', gap: 14,
              fontFamily: 'var(--ff-sans)',
              animation: 'mtx-fade-up .35s ease both',
              transition: 'background .25s, border-color .25s, transform .25s',
            }}
          >
            {/* Icon hexagon — clock with amber halo */}
            <div style={{
              width: 44, height: 44, borderRadius: 13, flexShrink: 0,
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(255,200,80,0.22), rgba(255,200,80,0.06))',
              border: '0.5px solid rgba(255,200,80,0.32)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffc850',
              boxShadow: 'inset 0 0 14px rgba(255,200,80,0.10)',
            }}>
              {/* Halo decorativo radial detrás del icon */}
              <div style={{
                position: 'absolute', inset: -8, borderRadius: 18,
                background: 'radial-gradient(circle at 30% 30%, rgba(255,200,80,0.22), transparent 60%)',
                filter: 'blur(8px)', pointerEvents: 'none',
                transform: 'translateZ(0)', willChange: 'transform',
              }}/>
              <IcClock size={18} stroke="currentColor" strokeWidth={1.7} style={{ position: 'relative' }}/>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                color: '#ffc850', textTransform: 'uppercase', marginBottom: 3,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: 999,
                  background: '#ffc850',
                  boxShadow: '0 0 6px rgba(255,200,80,0.7)',
                  animation: 'mtx-pulse 2s ease-in-out infinite',
                  willChange: 'transform, opacity',
                }}/>
                Falta un paso
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700, color: 'var(--ink-1)',
                letterSpacing: '-0.018em', lineHeight: 1.25, marginBottom: 3,
              }}>
                Elige un tiempo de enfoque
              </div>
              <div style={{
                fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4,
                letterSpacing: '-0.005em',
              }}>
                Es lo único que falta para activar tu sesión.
              </div>
            </div>

            {/* Chev en círculo con tinte ámbar — invita a la acción sin forzar */}
            <div style={{
              width: 32, height: 32, borderRadius: 999, flexShrink: 0,
              background: 'rgba(255,200,80,0.14)',
              border: '0.5px solid rgba(255,200,80,0.32)',
              color: '#ffc850',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 0 10px rgba(255,200,80,0.10)',
            }}>
              <IcChevR size={13} stroke="currentColor" strokeWidth={2.2}/>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { HomeInactive, DEFAULT_ROUTINES, ROUTINES, RoutineIc, BannerCarousel, _HERO_BANNERS });
