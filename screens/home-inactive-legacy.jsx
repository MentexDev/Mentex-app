// home-inactive-legacy.jsx — SNAPSHOT del Home inactivo PRE-rediseño (2026-04-30)
// ─────────────────────────────────────────────────────────────────────────────
// Este archivo NO se carga en Mentex Home.html. Es un respaldo del Home anterior
// en caso de que se necesite revertir partes del rediseño que arrancó el 2026-04-30.
// Específicamente preservamos para futuro reuso:
//   - Sección "Estadísticas" (puntuación, tiempo enfocado, racha, horas, récord)
//   - Sección "Elige tu aprendizaje" (carrusel de cards de contenido)
//   - Sección "Continúa escuchando" (carrusel de items en progreso)
//   - Sección "Desafíos" (carrusel de challenges con MtxChallengeCard)
// El Home rediseñado vive en home-inactive.jsx y se enfoca solo en el ritual.
// Para revertir: swap los nombres de archivo o cherry-pick secciones específicas.
// ─────────────────────────────────────────────────────────────────────────────

// home-inactive.jsx — Home inactive screen (full)

const RoutineIc = ({ r, ...rest }) => {
  const Ic = r.Ic || (window.getIconById ? window.getIconById(r.iconId) : IcLeaf);
  return <Ic {...rest}/>;
};

const DEFAULT_ROUTINES = [
{ id:'meditate',  label:'Meditar',    Ic:IcLeaf,     iconId:'leaf',     colorId:'neon',   accent:'#3DFFD1', dur:'10 min', kind:'Mente',       isDefault:true },
{ id:'read',      label:'Leer',       Ic:IcBook,     iconId:'book',     colorId:'neon',   accent:'#3DFFD1', dur:'20 min', kind:'Aprendizaje', isDefault:true },
{ id:'study',     label:'Estudiar',   Ic:IcBrain,    iconId:'brain',    colorId:'purple', accent:'#9B8AFF', dur:'45 min', kind:'Aprendizaje', isDefault:true },
{ id:'breathe',   label:'Respirar',   Ic:IcWind,     iconId:'wind',     colorId:'blue',   accent:'#5EC3FF', dur:'5 min',  kind:'Mente',       isDefault:true },
{ id:'gratitude', label:'Gratitud',   Ic:IcHeart,    iconId:'heart',    colorId:'neon',   accent:'#3DFFD1', dur:'5 min',  kind:'Mente',       isDefault:true },
{ id:'train',     label:'Entrenar',   Ic:IcDumbbell, iconId:'dumbbell', colorId:'purple', accent:'#9B8AFF', dur:'30 min', kind:'Cuerpo',      isDefault:true },
{ id:'journal',   label:'Journaling', Ic:IcEdit,     iconId:'leaf',     colorId:'blue',   accent:'#5EC3FF', dur:'15 min', kind:'Mente',       isDefault:true },
{ id:'visualize', label:'Visualizar', Ic:IcEye,      iconId:'eye',      colorId:'purple', accent:'#9B8AFF', dur:'8 min',  kind:'Mente',       isDefault:true }];

const ROUTINES = DEFAULT_ROUTINES;

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

const TIME_OPTIONS = [
{ v:15,  label:'15 min' },
{ v:30,  label:'30 min' },
{ v:45,  label:'45 min' },
{ v:60,  label:'1 h'    },
{ v:120, label:'2 h'    },
{ v:180, label:'3 h'    },
{ v:-1,  label:'Personalizar' }];








function HomeInactive({ tweaks, state, setState, onStart, onCustom, challenges = CHALLENGES, learning = LEARNING, routinesCatalog = ROUTINES, onChallengeClick = () => {}, onViewAllChallenges = () => {}, onNotif = () => {}, notifCount = 0, _placeholder = () => {}, onLearningClick = () => {}, onViewAllLearning = () => {}, onEditApps = () => {}, onEditRoutines = () => {} }) {
  const { blockedApps, routines, time } = state;

  const toggleApp = (id) => setState(s => ({
    ...s, blockedApps: s.blockedApps.includes(id)
      ? s.blockedApps.filter(x => x !== id)
      : [...s.blockedApps, id]
  }));
  const toggleRoutine = (id) => setState(s => ({
    ...s, routines: s.routines.includes(id) ? s.routines.filter(x => x !== id) : [...s.routines, id]
  }));
  const setTime = (v) => v === -1 ? onCustom() : setState(s => ({ ...s, time: v }));

  const cardStyle = tweaks.cardStyle;
  const glassFor = (extra = {}) => {
    if (cardStyle === 'flat') return { background:'rgba(255,255,255,0.025)', border:'0.5px solid rgba(255,255,255,0.04)', backdropFilter:'none', ...extra };
    if (cardStyle === 'thin') return { background:'transparent', border:'0.5px solid var(--glass-stroke-strong)', backdropFilter:'none', ...extra };
    return extra;
  };

  const inProgress = learning.filter(l => l.status === 'scheduled' && l.playPct != null);

  return (
    <div style={{ paddingTop:60, paddingBottom:24, animation:'mtx-fade-up .4s ease both' }}>
      <MtxHeader name="Juan" notifCount={notifCount} onNotif={onNotif}/>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom:28, marginTop:4 }}>
        <div className="mtx-scroll-x" style={{ paddingLeft:20, paddingRight:20 }}>
          <MtxStatCard label="Puntuación"        value="78" unit=" pts"  sub="↑12 vs semana anterior"            accent sparkData={[58,64,70,68,75,72,78]}/>
          <MtxStatCard label="Tiempo enfocado"  value="14" unit="h 32m" sub="+18% vs semana anterior"                  sparkData={[2,3,4,3,5,6,7]}/>
          <MtxStatCard label="Racha"             value="6"  unit=" días" sub="🔥 sigue así, no la pierdas"             sparkData={[1,1,1,1,0,1,1]}/>
          <MtxStatCard label="Horas aprendidas"  value="27" unit=" h"    sub="+5h esta semana"                         sparkData={[3,4,5,4,6,5,7]}/>
          <MtxStatCard label="Récord de foco"    value="92" unit=" min"  sub="tu mejor sesión esta semana"             sparkData={[40,55,68,72,80,92,75]}/>
        </div>
      </div>

      {/* ── Elige tu aprendizaje ─────────────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <MtxSectionHead
          title="Elige tu aprendizaje"
          subtitle="Seleccionado para tu próxima sesión."
          action="Ver más"
          onAction={onViewAllLearning}
        />
        <div className="mtx-scroll-x" style={{ paddingLeft:20, paddingRight:20 }}>
          {learning.map(l => (
            <MtxLearningCard key={l.id} item={l} onClick={() => onLearningClick(l)}/>
          ))}
        </div>
      </div>

      {/* ── Continúa escuchando ──────────────────────────────────────────── */}
      {inProgress.length > 0 && (
        <div style={{ marginBottom:28 }}>
          <MtxSectionHead
            title="Continúa escuchando"
            subtitle="Retoma donde lo dejaste."
          />
          <div className="mtx-scroll-x" style={{ paddingLeft:20, paddingRight:20 }}>
            {inProgress.map(l => (
              <MtxLearningCard key={l.id} item={l} onClick={() => onLearningClick(l)}/>
            ))}
          </div>
        </div>
      )}

      {/* ── Rutinas para hoy ─────────────────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <MtxSectionHead title="Rutinas para hoy" subtitle="Hábitos que te devuelven a ti." action="Editar" onAction={onEditRoutines}/>
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
                transition:'transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .3s ease,background .25s ease,border-color .25s ease',
                ...glassFor()
              }}>
                <div style={{
                  width:32, height:32, borderRadius:10,
                  background: on ? 'rgba(61,255,209,0.18)' : 'rgba(255,255,255,0.04)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: on ? 'var(--neon)' : 'var(--ink-2)',
                  transition:'background .25s ease,color .25s ease'
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
                  transition:'transform .3s cubic-bezier(.34,1.56,.64,1),background .25s ease',
                  boxShadow: on ? '0 0 12px rgba(61,255,209,0.55)' : 'none'
                }}>
                  {on && <IcCheck size={12} stroke="currentColor" strokeWidth={2.5}/>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Desafíos ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <MtxSectionHead title="Desafíos" subtitle="Compromisos que transforman semanas." action="Ver todo" onAction={onViewAllChallenges}/>
        <div className="mtx-scroll-x" style={{ paddingLeft:20, paddingRight:20 }}>
          {challenges.map(c => (
            <MtxChallengeCard key={c.id} challenge={c} onClick={() => onChallengeClick(c)}/>
          ))}
        </div>
      </div>

      {/* ── Mejora tu concentración ──────────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <MtxSectionHead
          title="Mejora tu concentración"
          subtitle="Bloquea el ruido. Libera tu atención."
          action="Editar"
          onAction={onEditApps}
        />
        <div className="mtx-glass" style={{ margin:'0 20px', padding:6, borderRadius:22, ...glassFor() }}>
          {APPS.filter(a => state.blockedApps.includes(a.id)).slice(0, 6).map((app, i) => {
            const on = blockedApps.includes(app.id);
            return (
              <div key={app.id} onClick={() => toggleApp(app.id)} className="mtx-tap" style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 12px', cursor:'pointer',
                borderTop: i === 0 ? 0 : '0.5px solid rgba(255,255,255,0.05)'
              }}>
                <app.Icon size={36}/>
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
          })}
          {APPS.filter(a => state.blockedApps.includes(a.id)).length === 0 && (
            <div style={{ padding:'20px 12px', textAlign:'center', color:'var(--ink-3)', fontSize:12 }}>
              Ninguna app silenciada aún
            </div>
          )}
          <div onClick={onEditApps} className="mtx-tap" style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            padding:'12px', borderTop:'0.5px solid rgba(255,255,255,0.05)',
            color:'var(--neon)', fontSize:13, fontWeight:500, cursor:'pointer'
          }}>
            <IcPlus size={16} stroke="currentColor"/> Agregar apps
          </div>
        </div>
      </div>

      {/* ── Tiempo de enfoque ────────────────────────────────────────────── */}
      <div style={{ marginBottom:24 }}>
        <MtxSectionHead title="Tiempo de enfoque" subtitle="Elige tu profundidad."/>
        <div className="mtx-scroll-x" style={{
          paddingLeft:20, paddingRight:20, paddingTop:8, paddingBottom:8,
          fontSize:'15px', gap:'9px', justifyContent:'flex-start', alignItems:'center', width:'360px'
        }}>
          {TIME_OPTIONS.map(t => {
            const isActive = time === t.v;
            return (
              <button key={t.v} onClick={() => setTime(t.v)} className={(isActive ? 'mtx-pill-active ' : '') + 'mtx-tap'} style={{
                height:52, padding:'0 22px', borderRadius:16,
                border: isActive ? '0.5px solid rgba(61,255,209,0.55)' : '0.5px solid var(--glass-stroke)',
                background: isActive ? 'linear-gradient(180deg,rgba(61,255,209,0.16),rgba(61,255,209,0.06))' : 'var(--glass-2)',
                backdropFilter:'blur(20px)',
                color: isActive ? 'var(--neon)' : 'var(--ink-1)',
                fontSize:15, fontWeight:600, cursor:'pointer',
                whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:8,
                boxShadow: isActive ? '0 0 0 1px rgba(61,255,209,0.18),0 8px 28px -8px rgba(61,255,209,0.55),inset 0 0 24px rgba(61,255,209,0.14)' : 'none',
                transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
                transition:'transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .3s ease,background .25s ease,border-color .25s ease',
                fontFamily:'var(--ff-sans)', minWidth:90, justifyContent:'center',
              }}>
                {t.v === -1 && <IcEdit size={14} stroke="currentColor"/>}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeInactive, DEFAULT_ROUTINES, ROUTINES, RoutineIc });
