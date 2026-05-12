// screens/ia-skills.jsx — Fase 2.1: Tab Skills del coach IA
// ─────────────────────────────────────────────────────────────────────────────
// Skills = workflows que el coach activa por trigger conversacional.
// Diferencia con Workflows (Fase 2.2): Skills se disparan cuando el user lo
// pide en chat ("planifica mi semana"); Workflows se ejecutan por trigger
// temporal/contextual ("cada lunes 8am, genera mi review").
//
// 2 fuentes de skills:
//   • Oficiales — curadas por Mentex. NO se pueden borrar, solo toggle.
//   • Mías — el user las crea via "Mentex estructurará" pattern: pega un
//     texto/URL/repo y Mentex genera nombre+triggers+steps automáticamente.
//
// Shape pensado para backend (cuando entre Mastra en backend final):
//   - Officials viven en tabla read-only multi-tenant
//   - "Mine" viven en tabla user_skills con RLS por user_id
//   - Activations counter en tabla skill_activations con correlation_id
//   - qualityScore se actualiza por LLM-as-judge tras N runs (Fase backend)
//
// Diseño visual: consistente Obsidian/Neon. Cada categoría tiene su accent.
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxIASkills) return;

  // ── Categorías + accent colors ──────────────────────────────────────────
  // Mapeo central — cualquier skill usa estos. Si Fase 5 agrega más, se
  // expande aquí. Categorías son user-facing tags, no IDs internos.
  var _CATEGORIES = {
    productividad: { label: 'Productividad', accent: '#3dffd1' },
    bienestar:     { label: 'Bienestar',     accent: '#9b8aff' },
    aprendizaje:   { label: 'Aprendizaje',   accent: '#5dd3ff' },
    creatividad:   { label: 'Creatividad',   accent: '#ffc850' },
    social:        { label: 'Social',        accent: '#ff8b8b' },
  };

  // ── Catálogo OFICIAL — curado por Mentex ────────────────────────────────
  // Estos NO se editan ni se borran desde la UI. Toggle on/off vive en
  // _state.officialEnabled por skill_id. Cuando entre backend, este array se
  // sirve via API read-only — el usuario lo recibe pero no escribe ahí.
  //
  // Naming convention: id = 'mtx-<kebab-case-action>'. Triggers en lenguaje
  // natural; el agente Mastra los matcheará con embedding similarity, no
  // exact-match (eso lo cubrimos en backend).
  var _OFFICIAL_SKILLS = [
    {
      id: 'mtx-plan-week',
      icon: '📅',
      title: 'Planificar mi semana',
      description: 'Genera un plan de bloques de enfoque y descansos basado en tu calendar, energía y rituales habituales.',
      category: 'productividad',
      triggers: ['planifica mi semana', 'organiza mi semana', 'arma mi semana de enfoque'],
      steps: [
        'Lee tu Google/Apple Calendar',
        'Detecta bloques libres > 60 min',
        'Sugiere bloques de enfoque + descansos',
        'Confirma agendándolos con tu OK',
      ],
      qualityScore: 0.92,
      defaultEnabled: true,
    },
    {
      id: 'mtx-night-review',
      icon: '🌙',
      title: 'Cierre reflexivo nocturno',
      description: 'Un resumen de 4 minutos para cerrar tu día: qué cumpliste, qué soltar, qué agradecer.',
      category: 'bienestar',
      triggers: ['cierra mi día', 'reflexión nocturna', 'review del día'],
      steps: [
        'Lista tus tareas completadas hoy',
        'Pregunta qué quedó pendiente',
        'Sugiere una gratitud concreta',
        'Genera audio de 4 min para cerrar',
      ],
      qualityScore: 0.88,
      defaultEnabled: true,
    },
    {
      id: 'mtx-vision-board',
      icon: '🎯',
      title: 'Vision board del mes',
      description: 'Crea una imagen visual de tu intención del mes basada en tus metas activas y journal reciente.',
      category: 'bienestar',
      triggers: ['vision board', 'visualiza mis metas', 'imagina mi mes'],
      steps: [
        'Lee tus metas activas',
        'Resume últimas entradas del journal',
        'Genera imagen evocativa',
        'Guarda en tu Memoria como ancla',
      ],
      qualityScore: 0.85,
      defaultEnabled: false,
    },
    {
      id: 'mtx-meditation-mood',
      icon: '🧘',
      title: 'Meditación según mi mood',
      description: 'Detecta tu estado emocional y te recomienda la meditación exacta del catálogo Mentex.',
      category: 'bienestar',
      triggers: ['necesito meditar', 'meditación según mi mood', 'qué meditación me recomiendas'],
      steps: [
        'Pregunta cómo te sientes ahora',
        'Mapea mood → tipo de meditación',
        'Sugiere contenido específico de Explorar',
        'Ofrece reproducir inmediato',
      ],
      qualityScore: 0.91,
      defaultEnabled: true,
    },
    {
      id: 'mtx-journal-digest',
      icon: '📚',
      title: 'Resumen de mi journal',
      description: 'Sintetiza patrones, victorias y temas recurrentes de tus últimas N entradas de journal.',
      category: 'aprendizaje',
      triggers: ['resume mi journal', 'qué he escrito', 'patrones en mi journal'],
      steps: [
        'Busca últimas 30 entradas en Conocimiento',
        'Extrae temas recurrentes con RAG',
        'Resume victorias + desafíos',
        'Devuelve texto + 3 insights accionables',
      ],
      qualityScore: 0.87,
      defaultEnabled: false,
    },
    {
      id: 'mtx-instagram-post',
      icon: '🎨',
      title: 'Post para Instagram',
      description: 'Convierte una reflexión de tu journal en un post publicable: copy + sugerencia visual + hashtags.',
      category: 'creatividad',
      triggers: ['post para instagram', 'genera un post', 'publica esto'],
      steps: [
        'Pide la entrada o idea base',
        'Reescribe en formato post-listo',
        'Sugiere visual generativo',
        'Propone 5-7 hashtags relevantes',
      ],
      qualityScore: 0.79,
      defaultEnabled: false,
    },
    {
      id: 'mtx-weekly-review',
      icon: '📊',
      title: 'Weekly review',
      description: 'Framework GTD-style para revisar tu semana: cumplido, abierto, pendiente, próximo paso.',
      category: 'productividad',
      triggers: ['weekly review', 'review semanal', 'cierre de semana'],
      steps: [
        'Lista sesiones de enfoque completadas',
        'Pregunta qué quedó abierto',
        'Detecta patrones de procrastinación',
        'Sugiere ajustes para la próxima semana',
      ],
      qualityScore: 0.94,
      defaultEnabled: true,
    },
    {
      id: 'mtx-stress-defense',
      icon: '🔥',
      title: 'Defensa anti-estrés',
      description: 'Al detectar palabras de estrés en tu chat, te ofrece bloquear apps + sugerir meditación corta.',
      category: 'bienestar',
      triggers: ['detección automática · estrés', 'auto-trigger'],
      steps: [
        'Escucha tono del mensaje',
        'Si detecta estrés alto, propone pausa',
        'Ofrece bloquear apps distractoras 30 min',
        'Sugiere meditación de 5 min',
      ],
      qualityScore: 0.83,
      defaultEnabled: false,
    },
  ];

  // ── State inicial ─────────────────────────────────────────────────────────
  // officialEnabled: { skillId → boolean }. Por defecto enabled = defaultEnabled.
  // mineSkills: array de skills creadas por el user (mismo shape que official
  // pero con source ∈ {'text', 'url', 'repo'} en vez de 'official').
  // activations: { skillId → count } para métricas.
  var _initialOfficialEnabled = {};
  _OFFICIAL_SKILLS.forEach(function(s) {
    _initialOfficialEnabled[s.id] = !!s.defaultEnabled;
  });

  var _state = {
    officialEnabled: _initialOfficialEnabled,
    mineSkills: [],
    activations: {},  // { skillId: count }
    totalActivations: 0,
  };

  function _emit() {
    window.dispatchEvent(new CustomEvent('mtx:ia-skills-changed', {
      detail: { snapshot: JSON.parse(JSON.stringify(_state)) },
    }));
  }

  function _genId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  // ── Categoría auto-detection para "Mis skills" ──────────────────────────
  // Heurística simple: matchea keywords del texto del user con las categorías.
  // Cuando entre Mastra real, este detector se reemplaza por LLM classifier.
  function _detectCategory(text) {
    var lc = String(text || '').toLowerCase();
    if (/(producti|planif|enfoque|tarea|sesi(o|ó)n|trabajo|deadline)/i.test(lc)) return 'productividad';
    if (/(medita|respira|mood|bienestar|estr(é|e)s|cansad|gratitud)/i.test(lc)) return 'bienestar';
    if (/(aprend|estudi|leer|journal|nota|libro|investig)/i.test(lc)) return 'aprendizaje';
    if (/(crea|post|instagram|video|imagen|dise(ñ|n)o|art)/i.test(lc)) return 'creatividad';
    if (/(social|comunidad|amigos|familia|llama|mensaj)/i.test(lc)) return 'social';
    return 'productividad';
  }

  // ── Mock "estructurar con Mentex" ──────────────────────────────────────
  // Recibe el texto crudo del user y devuelve un skill estructurado. Mock
  // en Fase 2.1; en Fase backend lo hace un LLM con structured output.
  // Genera title del primer fragment + 3 triggers + 3-4 steps placeholders.
  function _mockStructureSkill(rawText, sourceKind) {
    var clean = String(rawText || '').replace(/\s+/g, ' ').trim();
    if (!clean) return null;

    // Title: primeras 4-6 palabras significativas, capitalizadas
    var words = clean.split(' ').slice(0, 6);
    var titleRaw = words.join(' ');
    var title = titleRaw.charAt(0).toUpperCase() + titleRaw.slice(1);
    if (title.length > 60) title = title.slice(0, 57) + '…';

    // Triggers: variaciones simples
    var firstFew = words.slice(0, 4).join(' ').toLowerCase();
    var triggers = [
      firstFew,
      'cuando te pida ' + firstFew,
      'ayúdame con ' + firstFew,
    ];

    // Steps placeholder — el LLM real devolverá pasos del workflow
    var steps = [
      'Identificar contexto del pedido',
      'Buscar info relevante en Memoria/Conocimiento',
      'Ejecutar acción según texto recibido',
      'Confirmar resultado con el user',
    ];

    return {
      id: _genId('skill'),
      icon: '✦',
      title: title,
      description: clean.length > 200 ? clean.slice(0, 197) + '…' : clean,
      category: _detectCategory(clean),
      triggers: triggers,
      steps: steps,
      qualityScore: 0.6,  // baseline; sube con activations exitosas en backend
      source: sourceKind || 'text',  // 'text' | 'url' | 'repo'
      enabled: true,  // user creó esta skill → activa por default
      createdAt: Date.now(),
    };
  }

  window.__mtxIASkills = {
    snapshot: function() { return JSON.parse(JSON.stringify(_state)); },

    // Catálogos read-only
    getOfficialSkills: function() {
      return _OFFICIAL_SKILLS.map(function(s) {
        return Object.assign({}, s, {
          source: 'official',
          enabled: !!_state.officialEnabled[s.id],
          activations: _state.activations[s.id] || 0,
        });
      });
    },
    getMineSkills: function() {
      return _state.mineSkills.map(function(s) {
        return Object.assign({}, s, {
          activations: _state.activations[s.id] || 0,
        });
      });
    },
    getCategories: function() {
      return Object.assign({}, _CATEGORIES);
    },

    // Lookup helper — devuelve skill (official o mine) por id, hidratada
    getSkill: function(id) {
      var off = _OFFICIAL_SKILLS.find(function(s) { return s.id === id; });
      if (off) {
        return Object.assign({}, off, {
          source: 'official',
          enabled: !!_state.officialEnabled[off.id],
          activations: _state.activations[off.id] || 0,
        });
      }
      var mine = _state.mineSkills.find(function(s) { return s.id === id; });
      if (mine) {
        return Object.assign({}, mine, {
          activations: _state.activations[mine.id] || 0,
        });
      }
      return null;
    },

    // Toggle on/off — funciona para oficiales y mías. Inmutable: reasigna
    // _state.officialEnabled como objeto nuevo para que cualquier consumidor
    // que compare por identidad de objeto detecte el cambio (post-audit Fase 2).
    toggleSkill: function(id) {
      // Official?
      var off = _OFFICIAL_SKILLS.find(function(s) { return s.id === id; });
      if (off) {
        var nextOfficial = Object.assign({}, _state.officialEnabled);
        nextOfficial[id] = !nextOfficial[id];
        _state.officialEnabled = nextOfficial;
        _emit();
        return;
      }
      // Mine?
      _state.mineSkills = _state.mineSkills.map(function(s) {
        if (s.id !== id) return s;
        return Object.assign({}, s, { enabled: !s.enabled });
      });
      _emit();
    },

    // Crear skill propia (Mentex estructura el workflow desde texto crudo)
    createMineSkill: function(rawText, sourceKind) {
      var skill = _mockStructureSkill(rawText, sourceKind);
      if (!skill) return null;
      _state.mineSkills = _state.mineSkills.concat([skill]);
      _emit();
      return skill;
    },

    // Borrar skill mía (oficiales NO se borran, solo toggle). Inmutable.
    deleteMineSkill: function(id) {
      _state.mineSkills = _state.mineSkills.filter(function(s) { return s.id !== id; });
      var nextActivations = Object.assign({}, _state.activations);
      delete nextActivations[id];
      _state.activations = nextActivations;
      _emit();
    },

    // Track activation — llamado cuando el agente activa una skill
    // (mock por ahora; en backend será emitido por Mastra al ejecutar tool).
    // Inmutable: reasigna activations para no compartir referencia.
    trackActivation: function(id) {
      var nextActivations = Object.assign({}, _state.activations);
      nextActivations[id] = (nextActivations[id] || 0) + 1;
      _state.activations = nextActivations;
      _state.totalActivations++;
      // Bridge a __mtxIAUsage para que cuente en cupo semanal (Fase 1.3)
      if (window.__mtxIAUsage && window.__mtxIAUsage.track) {
        window.__mtxIAUsage.track('skills');
      }
      _emit();
    },

    // Stats KPIs para header de la tab
    getStats: function() {
      var officialActive = _OFFICIAL_SKILLS.filter(function(s) {
        return _state.officialEnabled[s.id];
      }).length;
      var mineActive = _state.mineSkills.filter(function(s) { return s.enabled; }).length;
      var available = _OFFICIAL_SKILLS.length + _state.mineSkills.length;
      // Quality avg de activas (solo)
      var activeSkills = [];
      _OFFICIAL_SKILLS.forEach(function(s) {
        if (_state.officialEnabled[s.id]) activeSkills.push(s.qualityScore || 0);
      });
      _state.mineSkills.forEach(function(s) {
        if (s.enabled) activeSkills.push(s.qualityScore || 0);
      });
      var avgQuality = activeSkills.length > 0
        ? Math.round((activeSkills.reduce(function(a, b) { return a + b; }, 0) / activeSkills.length) * 100)
        : 0;
      return {
        available:        available,
        active:           officialActive + mineActive,
        officialActive:   officialActive,
        mineCount:        _state.mineSkills.length,
        mineActive:       mineActive,
        avgQuality:       avgQuality,
        totalActivations: _state.totalActivations,
      };
    },
  };
})();


function useIASkills() {
  var force = React.useReducer(function(x) { return x + 1; }, 0)[1];
  React.useEffect(function() {
    var h = function() { force(); };
    window.addEventListener('mtx:ia-skills-changed', h);
    return function() { window.removeEventListener('mtx:ia-skills-changed', h); };
  }, []);
  return (typeof window !== 'undefined' && window.__mtxIASkills)
    ? window.__mtxIASkills.snapshot()
    : null;
}


// ═══════════════════════════════════════════════════════════════════════════
// SkillCard — render de una skill en la lista
// ═══════════════════════════════════════════════════════════════════════════

function SkillCard(props) {
  var skill = props.skill;
  var onToggle = props.onToggle;
  var onOpenDetail = props.onOpenDetail;
  var categories = window.__mtxIASkills.getCategories();
  var cat = categories[skill.category] || { label: skill.category, accent: 'var(--neon)' };
  var isOfficial = skill.source === 'official';

  // Tarjeta consolidada como UN solo botón accesible (post-audit Fase 2:
  // anteriormente eran 4 <button> anidados con la misma acción → 4 tab-stops
  // por card + nested-button HTML inválido). Ahora outer div es role=button,
  // toggle queda aislado con stopPropagation para no disparar onOpenDetail.
  var openOnKey = function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(); }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={openOnKey}
      aria-label={'Ver detalle: ' + skill.title + '. ' + (isOfficial ? 'Oficial' : 'Tuya') + '. ' + cat.label + '.'}
      className="mtx-tap"
      style={{
        padding: '14px 14px 12px',
        borderRadius: 16,
        background: skill.enabled
          ? 'linear-gradient(135deg, ' + cat.accent + '0d, ' + cat.accent + '02)'
          : 'rgba(255,255,255,0.025)',
        border: '0.5px solid ' + (skill.enabled
          ? cat.accent + '30'
          : 'rgba(255,255,255,0.06)'),
        transition: 'all .25s',
        animation: 'mtx-fade-up .25s ease both',
        cursor: 'pointer',
      }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        marginBottom: 8,
      }}>
        {/* Icon tile — decorativo, no clickable independiente */}
        <div aria-hidden="true" style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: skill.enabled
            ? 'linear-gradient(135deg, ' + cat.accent + '28, ' + cat.accent + '08)'
            : 'rgba(255,255,255,0.04)',
          border: '0.5px solid ' + (skill.enabled ? cat.accent + '40' : 'rgba(255,255,255,0.06)'),
          color: skill.enabled ? cat.accent : 'var(--ink-3)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19, lineHeight: 1,
          boxShadow: skill.enabled ? '0 0 14px ' + cat.accent + '20' : 'none',
          transition: 'all .25s',
        }}>
          <span>{skill.icon}</span>
        </div>

        {/* Title + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 700,
            color: 'var(--ink-1)',
            letterSpacing: '-0.012em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
            marginBottom: 4,
            lineHeight: 1.2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{skill.title}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="mtx-eyebrow" style={{
              fontSize: 8.5, color: cat.accent,
              fontWeight: 700,
              letterSpacing: '0.12em',
            }}>
              {isOfficial ? 'OFICIAL' : (skill.source === 'url' ? 'URL' : skill.source === 'repo' ? 'REPO' : 'MÍA')}
            </span>
            <span style={{ fontSize: 8.5, color: 'var(--ink-4)' }}>·</span>
            <span className="mtx-eyebrow" style={{
              fontSize: 8.5, color: 'var(--ink-3)',
              fontWeight: 600,
              letterSpacing: '0.10em',
            }}>{cat.label.toUpperCase()}</span>
            {skill.activations > 0 && (
              <>
                <span style={{ fontSize: 8.5, color: 'var(--ink-4)' }}>·</span>
                <span style={{
                  fontSize: 9, color: 'var(--ink-4)',
                  fontFamily: 'var(--ff-sans)',
                  fontVariantNumeric: 'tabular-nums',
                }}>{skill.activations} usos</span>
              </>
            )}
          </div>
        </div>

        {/* Toggle switch — stopPropagation para no abrir detail al toggle.
            role='switch' + aria-checked (post-audit: NVDA/JAWS leen "switch
            on/off" en lugar de "button pressed"). */}
        <button
          onClick={function(e) { e.stopPropagation(); onToggle(); }}
          onKeyDown={function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault(); e.stopPropagation(); onToggle();
            }
          }}
          aria-label={(skill.enabled ? 'Desactivar' : 'Activar') + ' ' + skill.title}
          role="switch"
          aria-checked={skill.enabled}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            width: 36, height: 22, borderRadius: 999,
            border: 0,
            background: skill.enabled
              ? 'linear-gradient(135deg, ' + cat.accent + ', ' + cat.accent + 'b8)'
              : 'rgba(255,255,255,0.08)',
            position: 'relative',
            transition: 'all .25s',
            flexShrink: 0,
            marginTop: 4,
            boxShadow: skill.enabled ? '0 0 10px ' + cat.accent + '50, inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
          }}>
          <span style={{
            position: 'absolute',
            top: 2, left: skill.enabled ? 16 : 2,
            width: 18, height: 18, borderRadius: '50%',
            background: '#fff',
            transition: 'left .2s cubic-bezier(.4,1.4,.5,1)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.30)',
          }}/>
        </button>
      </div>

      {/* Description — parte del card-button, no clickable independiente */}
      <div style={{
        fontSize: 12, color: 'var(--ink-3)',
        lineHeight: 1.5,
        letterSpacing: '-0.005em',
        fontFamily: 'var(--ff-sans)',
        display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>{skill.description}</div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// NewSkillModal — "Mentex estructurará el workflow automáticamente"
// ═══════════════════════════════════════════════════════════════════════════

function NewSkillModal(props) {
  var onClose = props.onClose;
  var onCreated = props.onCreated;

  var sourceState = React.useState('text');
  var source = sourceState[0]; var setSource = sourceState[1];

  var textState = React.useState('');
  var text = textState[0]; var setText = textState[1];

  var textareaRef = React.useRef(null);
  React.useEffect(function() {
    var t = setTimeout(function() { if (textareaRef.current) textareaRef.current.focus(); }, 100);
    return function() { clearTimeout(t); };
  }, []);

  // ESC para cerrar — ref pattern para evitar stale closure si parent
  // recrea onClose entre renders. Guard incluye contentEditable + IME
  // composition (post-audit Fase 2 blind spot #2 + #9).
  var onCloseRef = React.useRef(onClose);
  React.useEffect(function() { onCloseRef.current = onClose; });
  React.useEffect(function() {
    var onKey = function(e) {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);

  // Lock body scroll mientras el sheet está abierto (post-audit Fase 2)
  React.useEffect(function() {
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function() { document.body.style.overflow = prev; };
  }, []);

  var SOURCES = [
    { id: 'text', label: 'Desde texto', icon: '📝' },
    { id: 'url',  label: 'Desde URL',   icon: '🔗' },
    { id: 'repo', label: 'Desde repo',  icon: '⌘'  },
  ];

  var placeholders = {
    text: 'Describe el proceso paso a paso, o pega una conversación donde explicaste cómo hacer algo. Mentex lo convertirá en un workflow estructurado.\n\nEj: "Cuando alguien me pide analizar un competidor, primero busco su web y propuesta de valor, luego comparo features con la nuestra…"',
    url:  'https://example.com/articulo-o-doc-con-el-proceso',
    repo: 'https://github.com/usuario/repositorio',
  };

  var canSubmit = text.trim().length >= 10;

  var handleSubmit = function() {
    if (!canSubmit) return;
    var skill = window.__mtxIASkills.createMineSkill(text.trim(), source);
    if (skill && onCreated) onCreated(skill);
    onClose();
  };

  // Track mousedown target para evitar cierre accidental cuando el user
  // arrastra fuera del sheet (selección de texto que termina en backdrop).
  // Post-audit Fase 2.
  var backdropDownRef = React.useRef(false);
  var handleBackdropDown = function(e) { backdropDownRef.current = e.target === e.currentTarget; };
  var handleBackdropClick = function(e) {
    if (e.target === e.currentTarget && backdropDownRef.current) onClose();
    backdropDownRef.current = false;
  };

  // Portal a mtx-overlay-root para que el sheet quede ANCLADO al device
  // viewport, NO al body scrolleable del AssistantConfigSheet (que tiene
  // overflow:auto y constrainería el sheet). Mismo patrón que PremiumLockSheet.
  var portalRoot = (typeof document !== 'undefined')
    ? document.getElementById('mtx-overlay-root')
    : null;
  if (!portalRoot) return null;

  var content = (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'mtx-fade-up .25s ease',
    }} onMouseDown={handleBackdropDown} onClick={handleBackdropClick}>
      <div onClick={function(e) { e.stopPropagation(); }}
        role="dialog" aria-modal="true" aria-label="Nueva skill"
        className="mtx-no-scrollbar"
        style={{
          background: 'rgba(15,19,19,0.96)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderTop: '0.5px solid rgba(255,255,255,0.10)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '14px 20px 28px',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
          maxHeight: '90%', overflow: 'auto',
          animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
        }}>
        {/* Grabber */}
        <div style={{
          width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
          background: 'rgba(255,255,255,0.16)',
        }}/>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, marginBottom: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 13, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(61,255,209,0.20), rgba(155,138,255,0.10))',
              border: '0.5px solid rgba(61,255,209,0.32)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: 'var(--neon)',
              boxShadow: '0 0 14px rgba(61,255,209,0.20)',
            }}>✦</div>
            <div>
              <div style={{
                fontSize: 15, fontWeight: 700,
                color: 'var(--ink-1)', letterSpacing: '-0.015em',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                lineHeight: 1.2, marginBottom: 2,
              }}>Nueva skill</div>
              <div style={{
                fontSize: 11.5, color: 'var(--ink-3)',
                lineHeight: 1.35,
                letterSpacing: '-0.005em',
                fontFamily: 'var(--ff-sans)',
              }}>Mentex estructurará el workflow automáticamente</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            className="mtx-tap"
            style={{
              width: 32, height: 32, borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              color: 'var(--ink-2)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 13,
            }}>✕</button>
        </div>

        {/* Source tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {SOURCES.map(function(s) {
            var isActive = source === s.id;
            return (
              <button key={s.id}
                onClick={function() { setSource(s.id); setText(''); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  flex: 1, padding: '8px 10px', borderRadius: 11,
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(61,255,209,0.16), rgba(61,255,209,0.04))'
                    : 'rgba(255,255,255,0.025)',
                  border: '0.5px solid ' + (isActive ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.06)'),
                  color: isActive ? 'var(--neon)' : 'var(--ink-2)',
                  fontSize: 11.5, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  transition: 'all .2s',
                }}>
                <span aria-hidden="true">{s.icon}</span>
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Input */}
        {source === 'text' ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={function(e) { setText(e.target.value); }}
            placeholder={placeholders.text}
            maxLength={2000}
            rows={7}
            style={{
              width: '100%', boxSizing: 'border-box',
              appearance: 'none', outline: 'none',
              background: 'rgba(0,0,0,0.20)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              padding: '12px 14px',
              color: 'var(--ink-1)',
              fontSize: 13, lineHeight: 1.55,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              resize: 'none',
              marginBottom: 6,
            }}
          />
        ) : (
          <input
            ref={textareaRef}
            type="url"
            value={text}
            onChange={function(e) { setText(e.target.value); }}
            placeholder={placeholders[source]}
            style={{
              width: '100%', boxSizing: 'border-box',
              appearance: 'none', outline: 'none',
              background: 'rgba(0,0,0,0.20)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              padding: '14px 16px',
              color: 'var(--ink-1)',
              fontSize: 13.5,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              marginBottom: 6,
            }}
          />
        )}

        <div style={{
          fontSize: 10.5, color: 'var(--ink-4)',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
          lineHeight: 1.4,
          marginBottom: 16,
        }}>
          Mentex analizará tu descripción y generará automáticamente nombre, triggers, dominio y los pasos del workflow.
        </div>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSubmit(); } }}
          disabled={!canSubmit}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
            width: '100%', padding: '13px 14px', borderRadius: 14, border: 0,
            background: canSubmit
              ? 'linear-gradient(135deg, var(--neon), #1ad9ad)'
              : 'rgba(255,255,255,0.04)',
            color: canSubmit ? '#0a1410' : 'var(--ink-4)',
            fontSize: 14, fontWeight: 700,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.01em',
            opacity: canSubmit ? 1 : 0.5,
            boxShadow: canSubmit ? '0 4px 14px -2px rgba(61,255,209,0.42)' : 'none',
            transition: 'all .2s',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          <span>✦</span> Estructurar con Mentex
        </button>
      </div>
    </div>
  );
  return window.ReactDOM ? window.ReactDOM.createPortal(content, portalRoot) : content;
}


// ═══════════════════════════════════════════════════════════════════════════
// SkillDetailSheet — vista detallada de una skill (bottom sheet)
// ═══════════════════════════════════════════════════════════════════════════

function SkillDetailSheet(props) {
  var skill = props.skill;
  var onClose = props.onClose;
  var onToggle = props.onToggle;
  var onDelete = props.onDelete;

  var categories = window.__mtxIASkills.getCategories();
  var cat = categories[skill.category] || { label: skill.category, accent: 'var(--neon)' };
  var isOfficial = skill.source === 'official';

  // ESC para cerrar — ref pattern + typing/IME guard (post-audit Fase 2).
  var onCloseRef = React.useRef(onClose);
  React.useEffect(function() { onCloseRef.current = onClose; });
  React.useEffect(function() {
    var onKey = function(e) {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);

  // Lock body scroll mientras el sheet está abierto (post-audit Fase 2)
  React.useEffect(function() {
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function() { document.body.style.overflow = prev; };
  }, []);

  // Track mousedown para evitar cierre accidental por drag-release (post-audit).
  var backdropDownRef = React.useRef(false);
  var handleBackdropDown = function(e) { backdropDownRef.current = e.target === e.currentTarget; };
  var handleBackdropClick = function(e) {
    if (e.target === e.currentTarget && backdropDownRef.current) onClose();
    backdropDownRef.current = false;
  };

  // Portal a mtx-overlay-root (anclar al device viewport, no al body scrolleable
  // del AssistantConfigSheet). Mismo patrón que PremiumLockSheet / AgendaSheet.
  var portalRoot = (typeof document !== 'undefined')
    ? document.getElementById('mtx-overlay-root')
    : null;
  if (!portalRoot) return null;

  var content = (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'mtx-fade-up .25s ease',
    }} onMouseDown={handleBackdropDown} onClick={handleBackdropClick}>
      <div onClick={function(e) { e.stopPropagation(); }}
        role="dialog" aria-modal="true" aria-label={'Detalle: ' + skill.title}
        className="mtx-no-scrollbar"
        style={{
          background: 'rgba(15,19,19,0.96)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderTop: '0.5px solid rgba(255,255,255,0.10)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '14px 20px 28px',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
          maxHeight: '90%', overflow: 'auto',
          animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
        }}>
        {/* Grabber */}
        <div style={{
          width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
          background: 'rgba(255,255,255,0.16)',
        }}/>

        {/* Header con icon grande + título + categoría */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, ' + cat.accent + '28, ' + cat.accent + '08)',
            border: '0.5px solid ' + cat.accent + '40',
            color: cat.accent,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, lineHeight: 1,
            boxShadow: '0 0 18px ' + cat.accent + '22',
          }}>
            <span role="img" aria-hidden="true">{skill.icon}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, marginBottom: 4,
              color: cat.accent,
              letterSpacing: '0.14em',
            }}>{isOfficial ? 'OFICIAL' : 'TUYA'} · {cat.label.toUpperCase()}</div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              color: 'var(--ink-1)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              marginBottom: 6,
            }}>{skill.title}</div>
            <div style={{
              fontSize: 12.5, color: 'var(--ink-3)',
              lineHeight: 1.5,
              letterSpacing: '-0.005em',
              fontFamily: 'var(--ff-sans)',
            }}>{skill.description}</div>
          </div>
        </div>

        {/* Triggers */}
        <div style={{ marginBottom: 18 }}>
          <div className="mtx-eyebrow" style={{
            fontSize: 9, color: 'var(--ink-3)', marginBottom: 8,
          }}>Triggers</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {skill.triggers.map(function(t, i) {
              return (
                <div key={i} style={{
                  padding: '8px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.025)',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                  fontSize: 12, color: 'var(--ink-2)',
                  fontFamily: 'var(--ff-sans)',
                  fontStyle: 'italic',
                  letterSpacing: '-0.005em',
                }}>"{t}"</div>
              );
            })}
          </div>
        </div>

        {/* Workflow steps */}
        <div style={{ marginBottom: 18 }}>
          <div className="mtx-eyebrow" style={{
            fontSize: 9, color: 'var(--ink-3)', marginBottom: 10,
          }}>Workflow</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {skill.steps.map(function(s, i) {
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                    background: cat.accent + '18',
                    border: '0.5px solid ' + cat.accent + '40',
                    color: cat.accent,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10.5, fontWeight: 800,
                    fontFamily: 'var(--ff-sans)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{i + 1}</div>
                  <div style={{
                    flex: 1, paddingTop: 2,
                    fontSize: 12.5, color: 'var(--ink-1)',
                    letterSpacing: '-0.005em',
                    lineHeight: 1.45,
                    fontFamily: 'var(--ff-sans)',
                  }}>{s}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginBottom: 18 }}>
          <div className="mtx-eyebrow" style={{
            fontSize: 9, color: 'var(--ink-3)', marginBottom: 8,
          }}>Estadísticas</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                fontSize: 18, fontWeight: 800,
                color: 'var(--ink-1)',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.018em',
                lineHeight: 1,
              }}>{skill.activations || 0}</div>
              <div style={{
                fontSize: 10, color: 'var(--ink-4)',
                marginTop: 4,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>Activaciones</div>
            </div>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                fontSize: 18, fontWeight: 800,
                color: skill.qualityScore >= 0.85 ? cat.accent : 'var(--ink-1)',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.018em',
                lineHeight: 1,
              }}>{Math.round((skill.qualityScore || 0) * 100)}%</div>
              <div style={{
                fontSize: 10, color: 'var(--ink-4)',
                marginTop: 4,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>Calidad</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onToggle}
            onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              flex: 1, padding: '12px 14px', borderRadius: 14, border: 0,
              background: skill.enabled
                ? 'rgba(255,255,255,0.04)'
                : 'linear-gradient(135deg, var(--neon), #1ad9ad)',
              color: skill.enabled ? 'var(--ink-1)' : '#0a1410',
              fontSize: 13.5, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              border: skill.enabled ? '0.5px solid rgba(255,255,255,0.08)' : 0,
              boxShadow: skill.enabled ? 'none' : '0 4px 14px -2px rgba(61,255,209,0.42)',
              transition: 'all .2s',
            }}>{skill.enabled ? 'Desactivar' : 'Activar'}</button>
          {!isOfficial && (
            <button
              onClick={onDelete}
              onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDelete(); } }}
              aria-label="Eliminar skill"
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '12px 16px', borderRadius: 14,
                background: 'rgba(255,107,107,0.08)',
                border: '0.5px solid rgba(255,107,107,0.24)',
                color: '#ff8b8b',
                fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>Eliminar</button>
          )}
        </div>
      </div>
    </div>
  );
  return window.ReactDOM ? window.ReactDOM.createPortal(content, portalRoot) : content;
}


// ═══════════════════════════════════════════════════════════════════════════
// SkillsTab — render principal de la tab Skills
// ═══════════════════════════════════════════════════════════════════════════

function SkillsTab() {
  useIASkills();  // suscribirse a cambios del store
  if (!window.__mtxIASkills) return null;

  var stats = window.__mtxIASkills.getStats();
  var officialSkills = window.__mtxIASkills.getOfficialSkills();
  var mineSkills = window.__mtxIASkills.getMineSkills();

  var sectionState = React.useState('official');  // 'official' | 'mine'
  var section = sectionState[0]; var setSection = sectionState[1];

  var newOpenState = React.useState(false);
  var newOpen = newOpenState[0]; var setNewOpen = newOpenState[1];

  var detailState = React.useState(null);
  var detailSkill = detailState[0]; var setDetailSkill = detailState[1];

  // useToast siempre llamado (estable hook count). Si el módulo no cargó,
  // fallback noop. Post-audit Fase 2 (Rules of Hooks).
  var _useToast = window.useToast || function() { return { show: function() {} }; };
  var toast = _useToast();

  var handleToggle = function(skill) {
    window.__mtxIASkills.toggleSkill(skill.id);
    // No mostrar toast en toggle desde card — feedback es el switch animado
  };

  var handleToggleFromDetail = function(skill) {
    window.__mtxIASkills.toggleSkill(skill.id);
    // Re-read del store para tener el state fresco
    var fresh = window.__mtxIASkills.getSkill(skill.id);
    if (fresh) {
      setDetailSkill(fresh);
      toast.show({
        message: fresh.enabled ? '✦ ' + fresh.title + ' activada' : fresh.title + ' desactivada',
        duration: 1800,
      });
    }
  };

  var handleDelete = function(skill) {
    if (window.confirm('¿Eliminar la skill "' + skill.title + '"?')) {
      window.__mtxIASkills.deleteMineSkill(skill.id);
      setDetailSkill(null);
      toast.show({ message: 'Skill eliminada', duration: 1500 });
    }
  };

  var handleCreated = function(skill) {
    toast.show({
      message: '✦ Skill "' + skill.title + '" creada',
      duration: 2200,
    });
    setSection('mine');
  };

  var visibleSkills = section === 'official' ? officialSkills : mineSkills;

  // KPI cards data
  var KPIS = [
    { label: 'Disponibles', value: stats.available,        accent: '#3dffd1' },
    { label: 'Activas',     value: stats.active,           accent: 'var(--neon)' },
    { label: 'Mis skills',  value: stats.mineCount,        accent: '#9b8aff' },
    { label: 'Activaciones',value: stats.totalActivations, accent: '#ffc850' },
  ];

  return (
    <div style={{ animation: 'mtx-fade-up .25s ease both' }}>
      {/* ── Header KPIs (4 cards 2x2 en mobile) ──────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 6,
        marginBottom: 18,
      }}>
        {KPIS.map(function(kpi, i) {
          return (
            <div key={i} style={{
              padding: '10px 8px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 17, fontWeight: 800,
                color: kpi.accent,
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.018em',
                lineHeight: 1,
                marginBottom: 4,
              }}>{kpi.value}</div>
              <div style={{
                fontSize: 8.5, color: 'var(--ink-4)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '0.04em',
                lineHeight: 1.2,
              }}>{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Section tabs (Oficiales / Mis Skills) + botón Nueva ──────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 14,
      }}>
        <button
          onClick={function() { setSection('official'); }}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '7px 13px', borderRadius: 999,
            background: section === 'official'
              ? 'linear-gradient(135deg, rgba(61,255,209,0.16), rgba(61,255,209,0.04))'
              : 'rgba(255,255,255,0.025)',
            border: '0.5px solid ' + (section === 'official' ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.06)'),
            color: section === 'official' ? 'var(--neon)' : 'var(--ink-2)',
            fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          ✦ Oficiales
          <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{officialSkills.length}</span>
        </button>
        <button
          onClick={function() { setSection('mine'); }}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '7px 13px', borderRadius: 999,
            background: section === 'mine'
              ? 'linear-gradient(135deg, rgba(155,138,255,0.18), rgba(155,138,255,0.04))'
              : 'rgba(255,255,255,0.025)',
            border: '0.5px solid ' + (section === 'mine' ? 'rgba(155,138,255,0.40)' : 'rgba(255,255,255,0.06)'),
            color: section === 'mine' ? '#9b8aff' : 'var(--ink-2)',
            fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          Mis Skills
          <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{mineSkills.length}</span>
        </button>
        <div style={{ flex: 1 }}/>
        <button
          onClick={function() { setNewOpen(true); }}
          aria-label="Crear nueva skill"
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '7px 13px', borderRadius: 999, border: 0,
            background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
            color: '#0a1410',
            fontSize: 12, fontWeight: 700,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            boxShadow: '0 4px 12px -2px rgba(61,255,209,0.38)',
          }}>+ Nueva</button>
      </div>

      {/* ── Skills list ─────────────────────────────────────────────────── */}
      {visibleSkills.length === 0 && section === 'mine' ? (
        <div style={{
          padding: '32px 20px',
          textAlign: 'center',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.02)',
          border: '0.5px dashed rgba(255,255,255,0.10)',
          animation: 'mtx-fade-up .3s ease both',
        }}>
          <div style={{
            fontSize: 28, marginBottom: 10, opacity: 0.7,
          }}>✦</div>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--ink-1)',
            letterSpacing: '-0.012em',
            marginBottom: 6,
            fontFamily: 'var(--ff-display, var(--ff-sans))',
          }}>Aún no tienes skills propias</div>
          <div style={{
            fontSize: 11.5, color: 'var(--ink-3)',
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
            maxWidth: 260, margin: '0 auto 14px',
          }}>
            Describe un proceso que repites a menudo. Mentex lo convertirá en una skill que tu coach puede ejecutar por trigger.
          </div>
          <button
            onClick={function() { setNewOpen(true); }}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              padding: '8px 16px', borderRadius: 999, border: 0,
              background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
              color: '#0a1410',
              fontSize: 12, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              boxShadow: '0 4px 12px -2px rgba(61,255,209,0.38)',
            }}>+ Crear skill</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleSkills.map(function(skill) {
            return (
              <SkillCard
                key={skill.id}
                skill={skill}
                onToggle={function() { handleToggle(skill); }}
                onOpenDetail={function() { setDetailSkill(skill); }}
              />
            );
          })}
        </div>
      )}

      {/* Modals */}
      {newOpen && (
        <NewSkillModal
          onClose={function() { setNewOpen(false); }}
          onCreated={handleCreated}
        />
      )}
      {detailSkill && (
        <SkillDetailSheet
          skill={window.__mtxIASkills.getSkill(detailSkill.id) || detailSkill}
          onClose={function() { setDetailSkill(null); }}
          onToggle={function() { handleToggleFromDetail(detailSkill); }}
          onDelete={function() { handleDelete(detailSkill); }}
        />
      )}
    </div>
  );
}


// ── Export ──────────────────────────────────────────────────────────────────
Object.assign(window, {
  SkillsTab:       SkillsTab,
  SkillCard:       SkillCard,
  NewSkillModal:   NewSkillModal,
  SkillDetailSheet: SkillDetailSheet,
  useIASkills:     useIASkills,
});
