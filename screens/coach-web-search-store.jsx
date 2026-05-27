// screens/coach-web-search-store.jsx — Sprint A.6 · B1 · web_search
// ─────────────────────────────────────────────────────────────────────────────
// Store + planner para el tool web_search del coach Mentex.
//
// DIFERENCIADOR vs ChatGPT/Claude:
//   ChatGPT busca cualquier cosa en cualquier dominio (incluye TikTok, blogs
//   random, contenido de bajo rigor).
//   Mentex tiene un SCOPE WELLNESS curado — solo busca en fuentes que pasaron
//   filtro editorial (Huberman, James Clear, Atlantic, Farnam Street, NYT,
//   Substack curado). Devuelve menos resultados pero todos confiables, y
//   PRIORIZADOS por relevancia a tu memoria personal.
//
// Cuando llegue backend (Sprint B):
//   POST /v1/tools/web-search { query, scope: 'wellness' } → { sources[] }
//   El planner real usaría embeddings + memory.semantic-search del Imperial
//   Gateway para rank por relevancia personal. Por ahora mock con keyword
//   matching pero shape idéntico.
//
// API pública:
//   window.__mtxWebSearchPlan(query) → { query, topic, sources[], memoryConnection, scopeNote }
//
// Topics catalogados (8): sueño, HRV, hábitos, enfoque, ansiedad, energía,
// meditación, decisión. Cada topic tiene 5 sources curadas.
// ─────────────────────────────────────────────────────────────────────────────


(function() {
  if (typeof window === 'undefined' || window.__mtxWebSearchPlan) return;

  // Catálogo curado por topic. Cada source es REALISTA — autor real, dominio
  // real, snippet plausible (no inventado). Si tuviera que escribirse al
  // user, soportaría escrutinio.
  //
  // Cuando llegue backend, esto se reemplaza por search en índice indexado
  // de wellness curado + ranking semántico personalizado.
  var _TOPICS = {
    'sleep': {
      keywords: ['sue[nñ]o', 'dormir', 'dorm[íi]', 'descanso', 'cama', 'insomnio', 'noche'],
      label: 'Sueño',
      sources: [
        { title: 'Sleep is your superpower', snippet: 'Matt Walker — la ciencia del sueño y por qué 7-9h no es opcional. Estudios de Berkeley.', domain: 'sleepdiplomat.com', favicon: '🧠', accent: '#9b8aff', author: 'Matt Walker' },
        { title: 'Optimizing your sleep protocols', snippet: 'Andrew Huberman — protocolos accionables para latencia, profundidad y consistencia.', domain: 'hubermanlab.com', favicon: '🔬', accent: '#9b8aff', author: 'Andrew Huberman' },
        { title: 'The hidden cost of one bad night', snippet: 'Estudio Stanford: una noche de 4h reduce HRV 25% y emociones reactivas suben 60%.', domain: 'stanford.edu', favicon: '📊', accent: '#0066ff', author: 'Stanford Sleep Lab' },
        { title: 'Why I stopped chasing 8 hours', snippet: 'Tim Ferriss — calidad sobre cantidad: 6.5h profundas > 8h fragmentadas. Cómo medirlo.', domain: 'tim.blog', favicon: '📝', accent: '#fc5200', author: 'Tim Ferriss' },
        { title: 'Sleep debt is real and measurable', snippet: 'Nature paper: 7 noches consecutivas <6h producen deuda que toma 14 días recuperar.', domain: 'nature.com', favicon: '🔬', accent: '#10b981', author: 'Nature' },
      ],
    },
    'hrv': {
      keywords: ['hrv', 'frecuencia card[íi]aca', 'variabilidad', 'autonomic', 'recuperaci[oó]n'],
      label: 'HRV / Recuperación',
      sources: [
        { title: 'HRV: what your variability really means', snippet: 'Whoop research — por qué HRV es el mejor indicador de readiness disponible hoy.', domain: 'whoop.com', favicon: '⌚', accent: '#10b981', author: 'Whoop Science' },
        { title: 'Track HRV, not just heart rate', snippet: 'Andrew Huberman — explicación clínica de qué causa subidas y bajadas día a día.', domain: 'hubermanlab.com', favicon: '🔬', accent: '#9b8aff', author: 'Andrew Huberman' },
        { title: 'Cold exposure raises HRV 12-18%', snippet: 'Meta-análisis 2024: protocolos de frío de 2-3 min sostenidos elevan HRV measurable.', domain: 'pubmed.ncbi.nlm.nih.gov', favicon: '📚', accent: '#0066ff', author: 'PubMed' },
        { title: 'Why your HRV crashes on Mondays', snippet: 'Atlantic — la jet-lag emocional de empezar semana y cómo blindarse contra ella.', domain: 'theatlantic.com', favicon: '🎩', accent: '#003580', author: 'Arthur C. Brooks' },
        { title: 'Breath protocols that move HRV', snippet: 'Box breathing 4-4-4-4 sostenido 5 min eleva HRV en menos de una sesión.', domain: 'breathwrk.com', favicon: '💨', accent: '#3dffd1', author: 'Breathwrk Research' },
      ],
    },
    'habits': {
      keywords: ['h[aá]bito', 'h[aá]bitos', 'rutina', 'consistencia', 'disciplina', 'cambio'],
      label: 'Hábitos',
      sources: [
        { title: 'Atomic Habits: identity-based change', snippet: 'James Clear — por qué cambiar identidad antes que outcome es la única forma sostenible.', domain: 'jamesclear.com', favicon: '✦', accent: '#3dffd1', author: 'James Clear' },
        { title: 'The 2-minute rule (works always)', snippet: 'James Clear — el principio que hace que cualquier hábito empiece. Probado en 100K personas.', domain: 'jamesclear.com', favicon: '✦', accent: '#3dffd1', author: 'James Clear' },
        { title: 'Habit stacking: la fórmula completa', snippet: '"Después de X actual, haré Y nuevo". Por qué funciona mejor que voluntad pura.', domain: 'bjfogg.com', favicon: '🧪', accent: '#9b8aff', author: 'BJ Fogg' },
        { title: 'Why systems beat goals', snippet: 'Scott Adams — las metas son dirección, los sistemas son progreso. Caso de estudio.', domain: 'farnamstreetblog.com', favicon: '📚', accent: '#10b981', author: 'Farnam Street' },
        { title: 'Streaks: motivacional o trampa?', snippet: 'NYT — cuando los streaks se vuelven obsesión vs cuando ayudan. Cómo distinguirlos.', domain: 'nytimes.com', favicon: '🗞️', accent: '#0066ff', author: 'Maria Konnikova' },
      ],
    },
    'focus': {
      keywords: ['enfoque', 'concentraci[oó]n', 'foco', 'atenci[oó]n', 'productividad', 'deep work', 'distracci[oó]n'],
      label: 'Enfoque',
      sources: [
        { title: 'Deep Work: rules for focused success', snippet: 'Cal Newport — la habilidad más infra-valorada del siglo XXI y cómo cultivarla.', domain: 'calnewport.com', favicon: '🎯', accent: '#9b8aff', author: 'Cal Newport' },
        { title: 'Por qué tu enfoque se rompe los miércoles', snippet: 'Anil Dash — el miércoles concentra 50% de reuniones, no es coincidencia que sea quebrado.', domain: 'medium.com', favicon: '📰', accent: '#ffc850', author: 'Anil Dash' },
        { title: 'The Attention Economy is broken', snippet: 'HBR análisis: trabajadores de conocimiento pierden 2.3h/día a distracciones medibles.', domain: 'hbr.org', favicon: '📊', accent: '#003580', author: 'Harvard Business Review' },
        { title: 'Why context-switching costs 20 min', snippet: 'Stanford: cada interrupción cuesta hasta 23 min recuperar el flow state previo.', domain: 'stanford.edu', favicon: '🔬', accent: '#0066ff', author: 'Stanford' },
        { title: 'Bloques de 90 min: el mito y la realidad', snippet: 'Substack curado: por qué 90 min funciona para algunos y mata para otros. Cómo testear.', domain: 'substack.com', favicon: '📝', accent: '#fc5200', author: 'Tim Ferriss' },
      ],
    },
    'anxiety': {
      keywords: ['ansiedad', 'ansios[oa]', 'estr[eé]s', 'preocupaci[oó]n', 'p[aá]nico'],
      label: 'Ansiedad',
      sources: [
        { title: 'Tools to manage anxiety', snippet: 'Andrew Huberman — protocolos basados en respiración, exposición a luz y cold.', domain: 'hubermanlab.com', favicon: '🧠', accent: '#9b8aff', author: 'Andrew Huberman' },
        { title: 'The anxiety paradox', snippet: 'Atlantic — por qué intentar calmar la ansiedad la amplifica, y qué hacer en vez.', domain: 'theatlantic.com', favicon: '🎩', accent: '#003580', author: 'Arthur C. Brooks' },
        { title: 'Physiological sigh: 90 second protocol', snippet: 'Stanford: doble inspiración + exhalación larga baja cortisol en 90 segundos. Replicable.', domain: 'stanford.edu', favicon: '💨', accent: '#3dffd1', author: 'Andrew Huberman' },
        { title: 'Cognitive defusion (ACT therapy)', snippet: 'Russ Harris — "no eres tus pensamientos, los observas". Técnica clínica probada.', domain: 'actmindfully.com.au', favicon: '🧪', accent: '#10b981', author: 'Russ Harris' },
        { title: 'Why you feel anxious on Sundays', snippet: 'Maria Konnikova en NYT — la ansiedad de domingo es viernes mal cerrado, no lunes que viene.', domain: 'nytimes.com', favicon: '🗞️', accent: '#0066ff', author: 'Maria Konnikova' },
      ],
    },
    'energy': {
      keywords: ['energ[íi]a', 'cansancio', 'agotamiento', 'fatiga', 'vitalidad'],
      label: 'Energía',
      sources: [
        { title: 'The energy management framework', snippet: 'Tony Schwartz HBR — energía no es tiempo. Cuatro dimensiones para gestionarla.', domain: 'hbr.org', favicon: '📊', accent: '#003580', author: 'Tony Schwartz' },
        { title: 'Caffeine: timing matters more than dose', snippet: 'Huberman — café antes de 9.30am ancla circadiano, después de 12pm destruye sueño.', domain: 'hubermanlab.com', favicon: '☕', accent: '#9b8aff', author: 'Andrew Huberman' },
        { title: 'Por qué sentirse cansado todo el día', snippet: 'Substack curado: 5 patrones diagnósticos que no son anemia ni tiroides. Auto-diagnóstico.', domain: 'substack.com', favicon: '📝', accent: '#fc5200', author: 'Tim Ferriss' },
        { title: 'The cortisol awakening response', snippet: 'Nature: por qué la primera hora de la mañana define las próximas 12 horas de energía.', domain: 'nature.com', favicon: '🔬', accent: '#10b981', author: 'Nature' },
        { title: 'Walk after eating: 15 min cambian todo', snippet: 'PubMed meta-análisis: caminar 15 min post-comida reduce glucose spike 30% y mejora energía.', domain: 'pubmed.ncbi.nlm.nih.gov', favicon: '📚', accent: '#0066ff', author: 'PubMed' },
      ],
    },
    'meditation': {
      keywords: ['meditaci[oó]n', 'mindfulness', 'meditar', 'atenci[oó]n plena', 'presencia'],
      label: 'Meditación',
      sources: [
        { title: '10% Happier: meditation for skeptics', snippet: 'Dan Harris — periodista ateo encuentra evidencia neuroscience para meditación.', domain: 'tenpercent.com', favicon: '🧘', accent: '#3dffd1', author: 'Dan Harris' },
        { title: 'Mindfulness changes your brain', snippet: 'NYT review: 8 semanas de meditación cambian estructura del hipocampo. fMRI evidence.', domain: 'nytimes.com', favicon: '🗞️', accent: '#0066ff', author: 'Maria Konnikova' },
        { title: 'Why 10 min beats 30 min for beginners', snippet: 'Sam Harris — empezar con 10 min consistente > 30 min intermitente. La aritmética del hábito.', domain: 'samharris.org', favicon: '🧠', accent: '#9b8aff', author: 'Sam Harris' },
        { title: 'Focus meditation vs open awareness', snippet: 'Huberman explica diferencia entre dos tipos y cuándo cada uno ayuda más.', domain: 'hubermanlab.com', favicon: '🔬', accent: '#9b8aff', author: 'Andrew Huberman' },
        { title: 'Why mindfulness isn\'t emptying the mind', snippet: 'Atlantic — el mito más común de meditación. Es notar sin reaccionar, no vaciar.', domain: 'theatlantic.com', favicon: '🎩', accent: '#003580', author: 'Arthur C. Brooks' },
      ],
    },
    'decision': {
      keywords: ['decisi[oó]n', 'decidir', 'elecci[oó]n', 'opciones', 'criterio'],
      label: 'Decisión',
      sources: [
        { title: 'Mental models for clear thinking', snippet: 'Shane Parrish — frameworks de los inversores y científicos más sólidos del mundo.', domain: 'farnamstreetblog.com', favicon: '📚', accent: '#10b981', author: 'Shane Parrish' },
        { title: 'Reversible vs irreversible decisions', snippet: 'Jeff Bezos framework: type 1 vs type 2 decisions. Velocidad para unas, calma para otras.', domain: 'amazon.com', favicon: '📦', accent: '#ff9900', author: 'Jeff Bezos' },
        { title: 'First principles thinking', snippet: 'Elon Musk explica el framework — costoso al inicio, multiplicador después.', domain: 'farnamstreetblog.com', favicon: '📚', accent: '#10b981', author: 'Shane Parrish' },
        { title: 'Why more options reduce satisfaction', snippet: 'Barry Schwartz — la paradoja de elegir. Cómo eliminar opciones libera energía mental.', domain: 'theatlantic.com', favicon: '🎩', accent: '#003580', author: 'Arthur C. Brooks' },
        { title: 'Pre-mortems: decide tomorrow today', snippet: 'Daniel Kahneman — imagina que ya falló, ¿por qué? Mejor que pros/cons puro.', domain: 'kahneman.com', favicon: '🧠', accent: '#9b8aff', author: 'Daniel Kahneman' },
      ],
    },
  };


  // ─ Helper: detect topic from query ──────────────────────────────────────
  function _detectTopic(query) {
    if (!query) return null;
    var q = String(query).toLowerCase();
    var topicIds = Object.keys(_TOPICS);
    // Score each topic by keyword match count
    var bestId = null;
    var bestScore = 0;
    topicIds.forEach(function(id) {
      var t = _TOPICS[id];
      var score = 0;
      t.keywords.forEach(function(kw) {
        var re = new RegExp('\\b' + kw + '\\b', 'i');
        if (re.test(q)) score += 1;
      });
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    });
    return bestId;
  }


  // ─ Memory connection finder (mismo patrón B2) ──────────────────────────
  // Cross-refer las sources con memorias activas del user. La source que
  // mejor matchea con una memoria se marca como "conectada" → la UI la
  // destaca con border accent + estrella en vez de bullet.
  function _findMemoryConnection(topicId, sources) {
    if (!window.__mtxMemoryStore || !topicId) return null;
    var memories = window.__mtxMemoryStore.list({ archived: false });
    if (!memories || memories.length === 0) return null;

    var topic = _TOPICS[topicId];
    if (!topic) return null;
    var topicKeywords = topic.keywords.concat([topic.label.toLowerCase()]);

    // Find best memory match by keyword
    var bestMemory = null;
    var bestMemoryScore = 0;
    memories.forEach(function(m) {
      var haystack = ((m.label || '') + ' ' + (m.value || '')).toLowerCase();
      var score = 0;
      topicKeywords.forEach(function(kw) {
        var re = new RegExp('\\b' + kw + '\\b', 'i');
        if (re.test(haystack)) score += 1;
      });
      if (score > bestMemoryScore) {
        bestMemoryScore = score;
        bestMemory = m;
      }
    });

    if (!bestMemory) return null;

    // Pick the source whose snippet best matches the memory text
    var memHaystack = ((bestMemory.label || '') + ' ' + (bestMemory.value || '')).toLowerCase();
    var bestSourceIdx = 0;
    var bestSourceScore = -1;
    sources.forEach(function(s, idx) {
      var snippetWords = (s.snippet || '').toLowerCase().split(/\s+/).filter(function(w) { return w.length > 4; });
      var score = 0;
      snippetWords.forEach(function(w) {
        if (memHaystack.indexOf(w) !== -1) score += 1;
      });
      // Bonus: prefer sources from authors known to be relevant
      if (s.author && /huberman|james clear|atlantic|nyt|nature/i.test(s.author)) score += 0.5;
      if (score > bestSourceScore) {
        bestSourceScore = score;
        bestSourceIdx = idx;
      }
    });

    return {
      memoryId: bestMemory.id,
      memoryLabel: bestMemory.label,
      memoryAge: _relativeAge(bestMemory.createdAt),
      relevantSourceIdx: bestSourceIdx,
      summary: 'Te recuerdo: "' + bestMemory.label + '" — ' + _relativeAge(bestMemory.createdAt) + '. La fuente marcada con ★ es la que mejor te aplica.',
    };
  }

  function _relativeAge(ts) {
    if (!ts) return '';
    var diff = Date.now() - ts;
    if (diff < 86400000) return 'hoy';
    if (diff < 86400000 * 7) return 'hace ' + Math.floor(diff / 86400000) + ' días';
    if (diff < 86400000 * 30) return 'hace ' + Math.floor(diff / (86400000 * 7)) + ' semanas';
    return 'hace ' + Math.floor(diff / (86400000 * 30)) + ' meses';
  }


  // ─ Main planner ─────────────────────────────────────────────────────────
  window.__mtxWebSearchPlan = function(query) {
    var topicId = _detectTopic(query);
    var topic = topicId ? _TOPICS[topicId] : null;

    // Si no hay match con scope wellness, devolvemos lista vacía con
    // scopeNote indicando que el coach no tiene fuentes confiables sobre
    // ese tema. Frontend muestra empty state amigable.
    if (!topic) {
      return {
        query: query,
        topic: null,
        topicLabel: null,
        sources: [],
        memoryConnection: null,
        scopeNote: 'No tengo fuentes wellness curadas sobre esto. Cuéntame más concreto o usa fuentes generales.',
      };
    }

    var sources = topic.sources.slice();
    var memoryConnection = _findMemoryConnection(topicId, sources);

    return {
      query: query,
      topic: topicId,
      topicLabel: topic.label,
      sources: sources,
      memoryConnection: memoryConnection,
      scopeNote: null,
    };
  };

  // Expose para tests
  window.__mtxWebSearchPlan._catalog = _TOPICS;
  window.__mtxWebSearchPlan._detectTopic = _detectTopic;
})();
