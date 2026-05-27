// screens/coach-web-fetch-store.jsx — Sprint A.6 · B2 · web_fetch
// ─────────────────────────────────────────────────────────────────────────────
// Store + planner para el tool web_fetch del coach Mentex.
//
// El diferenciador brutal vs ChatGPT/Claude:
//   ChatGPT te resume el artículo.
//   Mentex te dice "este artículo conecta con tu meta X que tienes en memoria
//   desde hace N semanas, y el punto 3 es exactamente la técnica que necesitas".
//
// Cross-reference con __mtxMemoryStore (B10) para encontrar la memoria del
// user más relevante al artículo. Cuando llegue backend, esto se reemplaza
// por:
//   POST /v1/tools/web-fetch { url } → { title, author, highlights, content }
//   + GET /v1/memory/semantic-search { query: article_topic } → { facts }
//   El planner del coach las combina y genera la memoryConnection.
//
// API pública:
//   window.__mtxWebFetchPlan(url, prompt) → { article, memoryConnection, accent }
//
// Catálogo curado: 8 dominios típicos de wellness/productividad que el user
// suele pegar. Si la URL no matchea ningún dominio conocido, genera un mock
// genérico decente.
// ─────────────────────────────────────────────────────────────────────────────


(function() {
  if (typeof window === 'undefined' || window.__mtxWebFetchPlan) return;

  // Catálogo de artículos pre-curados por dominio. Cada uno tiene topics
  // (keywords) que se usan para cross-reference con __mtxMemoryStore.
  //
  // Cuando llegue backend, el catálogo desaparece — se reemplaza por el
  // output real del web_fetch tool.
  var _CATALOG = {
    'hubermanlab.com': {
      author: 'Andrew Huberman',
      titles: [
        'Optimizing your sleep: science-backed protocols',
        'Dopamine, motivation y el costo de la sobre-estimulación',
        'Cómo construir un wind-down ritual que sí funciona',
      ],
      readingTime: '14 min',
      highlights: [
        'Exposición a luz solar 10 minutos antes de las 9am ancla tu ritmo circadiano por 24h.',
        'La cafeína después de las 12pm reduce sueño profundo en ~30%, aunque sientas que "duermes igual".',
        'Un ritual de 60 min antes de dormir (luz cálida + lectura + sin pantallas) reduce latencia un 40%.',
      ],
      topics: ['sueño', 'dormir', 'circadiano', 'wind-down', 'descanso', 'noche', 'mañana'],
      accent: '#9b8aff',
      favicon: '🧠',
    },
    'jamesclear.com': {
      author: 'James Clear',
      titles: [
        'The 2-minute rule for building habits',
        'Identity-based habits: who you wish to become',
        'Why systems beat goals',
      ],
      readingTime: '7 min',
      highlights: [
        'Empieza con 2 minutos. La consistencia importa más que la intensidad — siempre.',
        'No te enfoques en metas, enfócate en sistemas. Las metas son dirección, los sistemas son progreso.',
        'Cambia primero la identidad ("soy alguien que medita") antes que el outcome ("quiero meditar").',
      ],
      topics: ['hábitos', 'rutina', 'meta', 'goal', 'sistema', 'identidad', 'productividad', 'consistencia'],
      accent: '#3dffd1',
      favicon: '✦',
    },
    'medium.com': {
      author: 'Anil Dash',
      titles: [
        'Por qué tu enfoque se rompe los miércoles',
        'La economía de la atención está colapsando',
        'Trabajar menos no es flojera, es estrategia',
      ],
      readingTime: '9 min',
      highlights: [
        'El miércoles concentra el 50% de las reuniones de la semana — no es coincidencia que sea el día más quebrado.',
        'Bloquear 2h sin notificaciones equivale a 6h de trabajo distraído. La aritmética no miente.',
        'Decir "no" es la habilidad más infra-valorada en knowledge work. Empieza con 1 "no" por semana.',
      ],
      topics: ['enfoque', 'concentración', 'productividad', 'atención', 'reuniones', 'trabajo', 'foco'],
      accent: '#ffc850',
      favicon: '📰',
    },
    'substack.com': {
      author: 'Tim Ferriss',
      titles: [
        'Mi rutina de los domingos: 4 cosas que cambiaron todo',
        'Cómo recuperar tu energía sin más café',
        'El experimento de los 90 días sin dopamine cheap',
      ],
      readingTime: '11 min',
      highlights: [
        'Los domingos son para revisar la semana pasada, no preparar la que viene. La preparación viene viernes.',
        'Recuperación = sueño + movimiento + naturaleza. En ese orden. Café es muleta, no solución.',
        'Eliminar UNA fuente de dopamina barata (scroll, junk, snacking nocturno) abre espacio mental enorme.',
      ],
      topics: ['energía', 'recuperación', 'domingo', 'rutina', 'dopamina', 'scroll', 'descanso'],
      accent: '#fc5200',
      favicon: '📝',
    },
    'nytimes.com': {
      author: 'Maria Konnikova',
      titles: [
        'The science of small wins',
        'Why mindfulness actually changes your brain',
        'The hidden cost of being "always available"',
      ],
      readingTime: '8 min',
      highlights: [
        'Una victoria pequeña diaria es más predictivo de bienestar que una grande mensual.',
        'Mindfulness no es vaciar la mente — es notar sin reaccionar. La diferencia importa.',
        'Estar disponible 24/7 cuesta entre 2-3 horas de trabajo profundo perdidas por día.',
      ],
      topics: ['mindfulness', 'meditación', 'pequeñas victorias', 'progress', 'disponibilidad'],
      accent: '#0066ff',
      favicon: '🗞️',
    },
    'theatlantic.com': {
      author: 'Arthur C. Brooks',
      titles: [
        'How to build a life of meaning, not just success',
        'The connection paradox: why we feel alone connected',
        'Por qué te sientes peor cuando tienes más opciones',
      ],
      readingTime: '13 min',
      highlights: [
        'Meaning > happiness en estudios longitudinales. La felicidad es estado, el significado es dirección.',
        'Más opciones reducen satisfacción. Eliminar opciones (mismo desayuno, mismo bloque) libera energía mental.',
        'Conexión real requiere repetición, no novedad. Las amistades viejas predicen longevidad mejor que las nuevas.',
      ],
      topics: ['significado', 'felicidad', 'conexión', 'amistad', 'opciones', 'sentido', 'propósito'],
      accent: '#003580',
      favicon: '🎩',
    },
    'farnamstreetblog.com': {
      author: 'Shane Parrish',
      titles: [
        'Mental models for decision-making',
        'The first principle thinking framework',
        'Why slow decisions beat fast ones',
      ],
      readingTime: '10 min',
      highlights: [
        'Pensar "qué es lo que NO cambia" en 10 años es más útil que predecir qué cambiará.',
        'First principles: descomponer hasta lo no-divisible, luego reconstruir. Costoso al inicio, multiplicador después.',
        'Decisiones reversibles: rápido y barato. Irreversibles: lento, deliberado, dormido encima.',
      ],
      topics: ['decisión', 'pensar', 'mental models', 'first principles', 'reflexión'],
      accent: '#10b981',
      favicon: '📚',
    },
    'lifehacker.com': {
      author: 'Lifehacker Staff',
      titles: [
        '10 micro-routines que cambian tu energía',
        'Cómo organizar tu agenda para la realidad (no la fantasía)',
        'Por qué tu lista de tareas siempre crece',
      ],
      readingTime: '6 min',
      highlights: [
        'Una micro-rutina (2-5 min) repetida 3x al día supera una macro-rutina (60 min) una vez por semana.',
        'Bloquea 25% de tu agenda como "buffer" — la realidad siempre toma más tiempo del que crees.',
        'Tu lista crece porque agregas más rápido de lo que terminas. Limita a 5 ítems activos máximo.',
      ],
      topics: ['rutina', 'agenda', 'tareas', 'organización', 'tiempo', 'productividad'],
      accent: '#666',
      favicon: '⚡',
    },
  };

  // Default fallback cuando el dominio no está catalogado
  var _DEFAULT_ARTICLE = {
    author: 'Autor del artículo',
    titles: ['Lo más relevante del contenido'],
    readingTime: '8 min',
    highlights: [
      'Idea central que conecta con tu rutina actual.',
      'Detalle específico que aplica a tu contexto.',
      'Acción concreta sugerida para tu próxima semana.',
    ],
    topics: ['general'],
    accent: '#9b8aff',
    favicon: '🌐',
  };


  // ─ Helper: extract domain from URL ──────────────────────────────────────
  function _extractDomain(url) {
    if (!url) return null;
    try {
      // Add protocol if missing
      var u = /^https?:\/\//i.test(url) ? url : 'https://' + url;
      var match = u.match(/^https?:\/\/([^\/]+)/i);
      if (!match) return null;
      var host = match[1].replace(/^www\./i, '').toLowerCase();
      return host;
    } catch (e) { return null; }
  }

  // ─ Helper: extract URL from prompt ──────────────────────────────────────
  function _extractUrl(prompt) {
    if (!prompt) return null;
    var m = String(prompt).match(/https?:\/\/\S+/i);
    return m ? m[0].replace(/[.,;:!?)\]]+$/, '') : null;
  }


  // ─ Memory connection finder ─────────────────────────────────────────────
  // Cruza topics del artículo con memorias persistidas (__mtxMemoryStore).
  // Devuelve la memoria más relevante + el highlight que mejor conecta.
  //
  // Algoritmo:
  //   1. Para cada memoria activa del user, calcular un score = nro de topics
  //      del artículo cuyo keyword aparece en label/value de la memoria.
  //   2. La memoria con mayor score gana. Si nadie matchea (score=0) → null.
  //   3. Determinar qué highlight del artículo conecta más con esa memoria.
  function _findMemoryConnection(article) {
    if (!window.__mtxMemoryStore) return null;
    var memories = window.__mtxMemoryStore.list({ archived: false });
    if (!memories || memories.length === 0) return null;

    var topics = article.topics || [];
    if (topics.length === 0) return null;

    var best = null;
    var bestScore = 0;
    memories.forEach(function(m) {
      var haystack = ((m.label || '') + ' ' + (m.value || '')).toLowerCase();
      var score = 0;
      topics.forEach(function(topic) {
        if (haystack.indexOf(topic.toLowerCase()) !== -1) score += 1;
      });
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    });

    if (!best) return null;

    // Encuentra el highlight más relevante: el primero que comparta keyword
    // con la memoria, o el primero por default.
    var memoryHaystack = ((best.label || '') + ' ' + (best.value || '')).toLowerCase();
    var relevantHighlightIdx = 0;
    var highlights = article.highlights || [];
    for (var i = 0; i < highlights.length; i++) {
      var h = (highlights[i] || '').toLowerCase();
      var sharedKeyword = topics.find(function(t) {
        return h.indexOf(t.toLowerCase()) !== -1 && memoryHaystack.indexOf(t.toLowerCase()) !== -1;
      });
      if (sharedKeyword) {
        relevantHighlightIdx = i;
        break;
      }
    }

    // Formato amigable para el usuario:
    //   "Te recuerdo que mencionaste 'X' — esto encaja directamente con el punto N."
    var memoryAge = _relativeAge(best.createdAt);
    return {
      memoryId: best.id,
      memoryLabel: best.label,
      memoryAge: memoryAge,
      memoryType: best.type,
      relevantHighlightIdx: relevantHighlightIdx,
      summary: 'Te recuerdo que mencionaste: "' + best.label + '" ' + memoryAge + '. El punto ' + (relevantHighlightIdx + 1) + ' del autor encaja directamente con eso.',
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
  // Public API. Recibe un prompt (puede contener URL embebida) y devuelve:
  //   { url, domain, article, memoryConnection, accent }
  //
  // Si NO hay URL en el prompt → returns null (caller decide qué hacer).
  window.__mtxWebFetchPlan = function(prompt) {
    var url = _extractUrl(prompt);
    if (!url) return null;
    var domain = _extractDomain(url);
    var article = _CATALOG[domain] || _DEFAULT_ARTICLE;
    // Pick deterministic title based on URL hash (so same URL → same title)
    var titleIdx = 0;
    if (article.titles && article.titles.length > 1) {
      var hash = 0;
      for (var i = 0; i < url.length; i++) {
        hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
      }
      titleIdx = hash % article.titles.length;
    }
    var resolvedArticle = {
      title: (article.titles && article.titles[titleIdx]) || 'Lo más relevante del contenido',
      author: article.author,
      readingTime: article.readingTime,
      highlights: article.highlights.slice(),
      topics: article.topics,
      accent: article.accent,
      favicon: article.favicon,
      domain: domain || 'sitio.com',
      originalUrl: url,
    };
    var memoryConnection = _findMemoryConnection(resolvedArticle);
    return {
      url: url,
      domain: domain,
      article: resolvedArticle,
      memoryConnection: memoryConnection,
      accent: article.accent,
    };
  };

  // Exponemos también el catálogo para debugging y para que dev tests vean
  // qué dominios están soportados.
  window.__mtxWebFetchPlan._catalog = _CATALOG;
  window.__mtxWebFetchPlan._extractUrl = _extractUrl;
  window.__mtxWebFetchPlan._extractDomain = _extractDomain;
})();
