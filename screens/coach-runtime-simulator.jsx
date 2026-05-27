// screens/coach-runtime-simulator.jsx — Fase A.5 · RFC-001 Addendum A §A2
// ─────────────────────────────────────────────────────────────────────────────
// Simulación runtime del coach: cuando el user envía un prompt nuevo, detecta
// keywords y emite steps progresivos en el timeline + un artifact final.
//
// Esto hace que el chat se sienta VIVO incluso sin backend — el user escribe
// y ve al coach pensar/buscar/actuar paso a paso, no solo "te escucho".
//
// CONTRATO con ia-flow.jsx:
//   • Exporta window.__mtxCoachSimulator.detect(content) → { scenario | null }
//   • Exporta window.__mtxCoachSimulator.run(store, convId, msgId, scenario, _alive, onText)
//     que progresivamente:
//       1. Mete steps[] vacíos (pending) en el msg
//       2. Activa step 1 → wait → completa → activa step 2 → etc.
//       3. Emite el artifact final
//       4. Llama onText(replyText) para que el caller arranque el streaming de texto
//
// El _runMockResponse en ia-flow.jsx checkea si hay scenario detectado;
// si sí, delega a este simulador antes de iniciar streaming.
//
// CADA SCENARIO MAPEA UN PROMPT-TIPO A:
//   • tools: [{ toolName, durationMs, rawInput?, rawOutput? }]
//   • artifact: {kind, ...} | null
//   • reply: string (texto del coach después de los steps)
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxCoachSimulator) return;

  // ─ Helpers ──────────────────────────────────────────────────────────────
  function _genStepId() {
    return 'step-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  function _lc(s) { return String(s || '').toLowerCase(); }
  function _re(content, pattern) { return pattern.test(_lc(content)); }


  // ═══════════════════════════════════════════════════════════════════════════
  // CATÁLOGO DE SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════════
  // Orden importa — más específico primero. El primer match gana.
  //
  // SHAPE de cada scenario:
  //   {
  //     match: function(content) → boolean,
  //     name: 'reservar-yoga',          // para debug
  //     buildSteps: () → step[],         // sin id (los inyectamos)
  //     buildArtifact: function(content) → artifact | null,
  //     buildReply: function(content) → string
  //   }
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── PRIORIDAD MÁXIMA: CRISIS DETECTION ─────────────────────────────────
  // RFC-001 §11.5 + RFC-002 placeholder. Frontend regex que matchea palabras
  // señal de crisis (ideación suicida, autolesión, abuso). El match suprime
  // TODO el flow normal del coach y va directo al crisis_support_card SIN
  // pasar por LLM mock — incluso si el backend cae, este safeguard funciona.
  //
  // Lista INICIAL (a refinar por profesional en RFC-002):
  var _CRISIS_PATTERNS = [
    /no\s+(quiero|puedo)\s+(seguir|m[aá]s|vivir)/i,
    /hacerme\s+da[nñ]o/i,
    /quitar(me)?\s+la\s+vida/i,
    /suicid[aá]/i,
    /matarme/i,
    /autoles[ií]on/i,
    /quiero\s+morir/i,
    /me\s+est[aá]\s+(maltratando|abusando|pegando)/i,
    /abus(o|aron)\s+de\s+m[ií]/i,
    /me\s+quiero\s+morir/i,
    /acabar\s+con\s+(todo|esto)/i,
  ];

  function _isCrisis(content) {
    if (!content || typeof content !== 'string') return false;
    var lc = String(content);
    for (var i = 0; i < _CRISIS_PATTERNS.length; i++) {
      if (_CRISIS_PATTERNS[i].test(lc)) return true;
    }
    return false;
  }

  // Recursos por país (RFC-002 §1.3 placeholder — completar con clínico).
  // Hoy: 🇨🇴 por default. Geo-IP mock futuro.
  var _CRISIS_RESOURCES_DEFAULT = [
    { flag: '🇨🇴', label: 'Línea 106 (Bogotá · 24/7, gratis)', phone: '106', kind: 'call' },
    { flag: '🌎', label: 'Befrienders Worldwide — buscar línea local', url: 'https://www.befrienders.org', kind: 'url' },
    { flag: '🇺🇸', label: 'Crisis Text Line — escribe HOME al 741741', phone: '741741', kind: 'sms' },
  ];

  // B4 — Pool de "thoughts" para el thinking_panel live por profundidad.
  // Estas frases aparecen progresivamente mientras el coach "decanta".
  // Son meta-pensamientos del coach (no respuestas) — describen su proceso.
  // Cuando llegue backend, esto se reemplaza por el stream del modelo
  // reasoning (o3, claude extended thinking). El UI no cambia.
  function _thoughtsForDepth(depth) {
    if (depth === 'shallow') {
      return [
        'Cruzando lo que dijiste con tu historial reciente…',
        'Buscando un patrón similar antes…',
        'Tengo una lectura clara.',
      ];
    }
    if (depth === 'deep') {
      return [
        'Empezando por leer tu historial completo de los últimos 30 días…',
        'Identificando ciclos no obvios en tu energía y descanso…',
        'Cruzando con tu personalidad y lo que ya sabes de ti…',
        'Descartando soluciones que ya probaste y no funcionaron…',
        'Buscando la pieza que conecta todo esto…',
        'Verificando si mi lectura tiene sentido contigo…',
        'Tengo algo que decirte que vale la pena pensar.',
      ];
    }
    // medium
    return [
      'Revisando lo que ya sé de ti que conecta con esto…',
      'Identificando el patrón que aparece…',
      'Pensando qué te sirve más ahora mismo…',
      'Considerando cómo lo recibirás mejor…',
      'Listo, tengo una respuesta para ti.',
    ];
  }

  var SCENARIOS = [

    // ─── 0. CRISIS — PRIORIDAD MÁXIMA, SIEMPRE GANA ────────────────────────
    {
      name: 'crisis',
      match: function(c) { return _isCrisis(c); },
      buildSteps: function() {
        return [
          { toolName: 'crisis_handle', durationMs: 600 },
        ];
      },
      buildArtifact: function() {
        return {
          kind: 'crisis_support_card',
          intro: 'Lo que dijiste me importa. Estás pasando por algo difícil.\n\nAntes de cualquier otra cosa, los recursos que te pueden acompañar AHORA:',
          resources: _CRISIS_RESOURCES_DEFAULT,
          disclaimer: 'No estoy aquí para reemplazar ayuda profesional. Estoy para acompañarte mientras buscas a alguien que sí pueda hacerlo.',
        };
      },
      buildReply: function() {
        return 'Aquí estoy contigo.';
      },
    },

    // ─── 1. RESERVAR / AGENDAR / COMPRAR (B5 Sprint A.6 — flow LIVE) ───────
    // El scenario detecta el prompt → ejecuta steps (web_search, memory) →
    // emite un confirmation_card pidiendo permiso. Cuando el user confirma,
    // el bridge dispara el __mtxBrowseAct overlay real con screenshots
    // progresivos del browser bot trabajando. Al completar, el handler del
    // overlay inyecta un mensaje final con bookingRef al chat.
    {
      name: 'browse-act-reserve',
      match: function(c) {
        return _re(c, /\b(reserv|reservame|resérvame|reservar|agendáme|agendar|cómprame|cómprame|comprar libro|pídeme|book|hospedaje|hotel)\b/i) &&
               !_re(c, /^recom/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'web_search', durationMs: 1700, rawInput: { query: 'opciones cercanas' } },
          { toolName: 'memory_recall', durationMs: 1000, rawInput: { query: 'preferencias previas' } },
          { toolName: 'extended_think', durationMs: 1400 },
        ];
      },
      buildArtifact: function(content) {
        // El plan vive en el artifact — el bridge lo pasa al overlay si user confirma
        var plan = null;
        if (window.__mtxBrowseActPlanFlow) {
          plan = window.__mtxBrowseActPlanFlow(content);
        }
        var summary = plan
          ? plan.intent + ' en ' + plan.site
          : 'Hacer lo que pediste en un sitio externo';
        return {
          kind: 'confirmation_card',
          title: 'Confirmar antes de ejecutar',
          subtitle: summary,
          // El user revisa el resumen y tappea Confirmar o Cancelar
          fields: [
            { label: 'Acción', value: plan ? plan.intent : 'Reservar/Agendar' },
            { label: 'Sitio', value: plan ? plan.site : 'detectado' },
            { label: 'Confirmación', value: 'Te muestro paso a paso lo que hago' },
          ],
          confirmLabel: 'Sí, procede',
          cancelLabel: 'Cancelar',
          // browseActPlan ride-along — el bridge lo lee al recibir 'confirm'
          browseActPlan: plan,
        };
      },
      buildReply: function() {
        return 'Encontré opciones que te calzan. Antes de ejecutar, revisa los detalles abajo. Si confirmas, te muestro paso a paso lo que hago — puedes cancelar en cualquier momento.';
      },
    },

    // ─── 2. LECTURA DE ARTÍCULO / URL (B2 Sprint A.6) ──────────────────────
    // Usa __mtxWebFetchPlan que:
    //   • Detecta dominio del URL → catalog real (hubermanlab, jamesclear, etc.)
    //   • Cross-reference con __mtxMemoryStore para encontrar memoria conectada
    //   • Genera highlights + memoryConnection (diferenciador real)
    {
      name: 'web-fetch-article',
      match: function(c) {
        return /https?:\/\//i.test(c) ||
               _re(c, /\b(l[eé]eme|estudia este|qu[eé] dice|res[uú]meme).*(art[ií]culo|paper|link|url)/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'web_fetch', durationMs: 2200, rawInput: { url: 'detectado en el mensaje' } },
          { toolName: 'memory_recall', durationMs: 1300, rawInput: { query: 'qué del artículo conecta contigo' } },
          { toolName: 'extended_think', durationMs: 2400 },
        ];
      },
      buildArtifact: function(content) {
        // Plan dinámico via store — incluye memoryConnection si hay match
        var plan = window.__mtxWebFetchPlan ? window.__mtxWebFetchPlan(content) : null;
        if (!plan) {
          // Fallback genérico si no se detectó URL ni catálogo
          return {
            kind: 'article_summary',
            title: 'Lo más relevante del artículo',
            author: 'Autor detectado',
            readingTime: '8 min',
            highlights: [
              'Idea central que conecta con tu rutina.',
              'Detalle específico que aplica a tu caso.',
              'Acción concreta sugerida para tu próxima semana.',
            ],
            originalUrl: 'https://articulo-detectado',
            domain: 'sitio.com',
            accent: '#9b8aff',
          };
        }
        return {
          kind: 'article_summary',
          title: plan.article.title,
          author: plan.article.author,
          readingTime: plan.article.readingTime,
          highlights: plan.article.highlights,
          originalUrl: plan.article.originalUrl,
          domain: plan.article.domain,
          favicon: plan.article.favicon,
          accent: plan.article.accent,
          memoryConnection: plan.memoryConnection,
        };
      },
      buildReply: function(content) {
        var plan = window.__mtxWebFetchPlan ? window.__mtxWebFetchPlan(content) : null;
        if (plan && plan.memoryConnection) {
          // Reply contextual que enfatiza la conexión con memoria
          return 'Lo leí. Te marqué el punto que más te aplica — conecta con algo que ya tenía guardado de ti.';
        }
        return 'Lo leí y te traigo los puntos esenciales. Si me cuentas más de tu contexto, puedo decirte cuáles aplican más a ti.';
      },
    },

    // ─── 3. PLANNEA SEMANA (plan_card) ─────────────────────────────────────
    {
      name: 'plan-week',
      match: function(c) {
        return _re(c, /\b(pl[aá]nnea|pl[aá]neame|organ[í|i]zame|arma).*(semana|d[ií]a|mes)/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'agenda_schedule_reminder', durationMs: 1100, rawInput: { action: 'read_current' } },
          { toolName: 'memory_recall', durationMs: 1400 },
          { toolName: 'extended_think', durationMs: 4800 },
          { toolName: 'document_render', durationMs: 900 },
        ];
      },
      buildArtifact: function() {
        return {
          kind: 'plan_card',
          title: 'Tu próxima semana',
          icon: '📓',
          days: [
            { label: 'Lun', items: [{ icon: '◐', text: 'Foco profundo 7am' }, { icon: '◐', text: 'Lectura 30 min' }] },
            { label: 'Mar', items: [{ icon: '◐', text: 'Meditación 10 min' }, { icon: '◐', text: 'Sesión foco 14:00' }] },
            { label: 'Mié', items: [{ icon: '◐', text: 'Ritual matutino 7am' }, { icon: '◐', text: 'Descanso largo tarde' }] },
            { label: 'Jue', items: [{ icon: '◐', text: 'Ritual ligero 7am' }] },
            { label: 'Vie', items: [{ icon: '◐', text: 'Meditación 10 min' }, { icon: '◐', text: 'Cierre semana 17:00' }] },
            { label: 'Sáb', items: [{ icon: '◯', text: 'Día libre' }] },
            { label: 'Dom', items: [{ icon: '◐', text: 'Cierre reflexivo 21:00' }] },
          ],
          notes: [
            'Lo armé respetando tu ritmo histórico.',
            'Sábado libre intencional — el descanso también es práctica.',
          ],
          primaryAction: { label: 'Agendarlo todo', value: 'commit_all' },
          secondaryAction: { label: 'Ajustar', value: 'edit' },
        };
      },
      buildReply: function() {
        return 'Te dejé la semana armada en formato diario. Respeta tu ritmo histórico y deja el sábado libre adrede — descansar también es práctica.';
      },
    },

    // ─── 4. RECOMENDAR CONTENIDO (recommendation_card) ─────────────────────
    {
      name: 'recommend-content',
      match: function(c) {
        return _re(c, /\b(recomi[eé]nd|sug[eí]r|qu[eé] leo|qu[eé] escucho|qu[eé] medito)/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'memory_recall', durationMs: 1100 },
          { toolName: 'content_recommend', durationMs: 1500 },
        ];
      },
      buildArtifact: function(content) {
        // Decisión: si menciona "dormir" → meditación; si menciona "libro/leer" → audiolibro
        var ec = (typeof window !== 'undefined' && window.EXPLORE_CONTENT) || [];
        var pick;
        if (_re(content, /dormir|sue[nñ]o/i)) {
          pick = ec.find(function(c) { return c && c.id === 'c-dormir'; });
        } else if (_re(content, /h[aá]bito|disciplin/i)) {
          pick = ec.find(function(c) { return c && c.id === 'c-habitos'; });
        } else if (_re(content, /jobs|charla/i)) {
          pick = ec.find(function(c) { return c && c.id === 'c-jobs'; });
        }
        pick = pick || ec.find(function(c) { return c && c.status === 'available'; });
        if (!pick) {
          return {
            kind: 'recommendation_card',
            item: {
              title: 'Hábitos Atómicos',
              author: 'James Clear',
              kind: 'audiobook',
              durationMin: 272,
              accent: '#3dffd1',
              isPremium: false,
            },
            reason: 'Es el que más se ajusta a tu intención actual.',
            primaryAction: { label: 'Reproducir', value: 'play' },
            secondaryAction: { label: 'Guardar', value: 'save' },
          };
        }
        return {
          kind: 'recommendation_card',
          itemId: pick.id,
          item: pick,
          reason: 'Lo elegí pensando en lo que me has contado en sesiones previas.',
          primaryAction: { label: 'Reproducir', value: 'play' },
          secondaryAction: { label: 'Guardar', value: 'save' },
        };
      },
      buildReply: function() {
        return 'Te tengo justo lo que va con tu momento. Mira si te calza.';
      },
    },

    // ─── 5. CÓMO DORMÍ / WEARABLE INSIGHT (B9 Sprint A.6) ─────────────────
    // Lee del __mtxWearableStore real. Si Apple Health NO está conectada,
    // muestra connect_card invitando a vincular. Si SÍ está conectada,
    // construye insight_card con data 100% del store (cross-sesión consistente).
    {
      name: 'wearable-sleep-insight',
      match: function(c) {
        return _re(c, /\b(c[oó]mo dorm[íi]|mi sue[nñ]o|cu[aá]nto dorm[íi]|datos de sue[nñ]o|wearable|c[oó]mo va mi sue[nñ]o|hrv|frecuencia card[íi]aca)/i);
      },
      buildSteps: function() {
        var connected = window.__mtxWearableStore && window.__mtxWearableStore.isConnected();
        if (!connected) {
          // Si no conectado, solo "memory_recall" como step previo al connect_card
          return [
            { toolName: 'memory_recall', durationMs: 800 },
          ];
        }
        return [
          { toolName: 'wearable_read', durationMs: 1200, rawInput: { metrics: ['sleep', 'hrv'], range: '7d' } },
          { toolName: 'memory_recall', durationMs: 1300 },
          { toolName: 'extended_think', durationMs: 3000 },
        ];
      },
      buildArtifact: function() {
        var store = window.__mtxWearableStore;
        if (!store || !store.isConnected()) {
          // Connect prompt — reusa integration_action_card
          return {
            kind: 'integration_action_card',
            integration: 'Apple Health',
            emoji: '❤️',
            accent: '#fb4868',
            title: 'Conecta Apple Health para ver tu sueño',
            description: 'Sin acceso a tus datos no puedo darte una lectura precisa. Si conectas, leeré solo lo justo: sueño, HRV, actividad.',
            primaryAction: { label: 'Conectar Apple Health', value: 'connect:appleHealth' },
            secondaryAction: { label: 'Ahora no', value: 'dismiss' },
          };
        }
        var summary = store.getSummary(7);
        if (!summary) return null;
        return {
          kind: 'insight_card',
          title: 'Esta semana',
          metric: summary.avgSleepLabel,
          metricLabel: 'promedio de sueño',
          trend: summary.trend,
          sparkline: summary.sparkline,
          extras: [
            { label: 'Mejor noche', value: summary.bestNight.dayLabel + ' · ' + summary.bestNight.value },
            { label: 'Peor noche', value: summary.worstNight.dayLabel + ' · ' + summary.worstNight.value },
            { label: 'HRV promedio', value: summary.avgHrv + ' ms' },
          ],
          accent: '#9b8aff',
        };
      },
      buildReply: function() {
        var store = window.__mtxWearableStore;
        if (!store || !store.isConnected()) {
          return [
            'Para darte una lectura real de tu sueño, necesito acceso a tu Apple Health.',
            '',
            'Si lo conectas, en menos de un minuto te muestro tu última semana con detalle. Solo lectura — nada se modifica.',
          ].join('\n');
        }
        var summary = store.getSummary(7);
        if (!summary) return 'Estoy revisando tus datos...';

        // Rotación de frases según trend direction Y magnitud (delta en horas).
        // Evita que dos consultas seguidas suenen idénticas. La selección
        // varía con el día del año + hora — pseudo-random pero coherente.
        var delta = Math.abs(summary.trend.delta || 0);
        var strong = delta >= 0.5; // ≥30 min de cambio = fuerte
        var rotator = (new Date().getDay() + new Date().getHours()) % 3;
        var trendPhrase;
        if (summary.trend.direction === 'up') {
          var upPhrases = strong ? [
            'Tu semana viene mejorando con fuerza — el cuerpo está respondiendo.',
            'Hay una recuperación clara esta semana. El descanso está acumulándose.',
            'Tu sueño viene en racha. Es buen momento para empujar lo que te importa.',
          ] : [
            'Tendencia suave hacia mejor — vas en buena dirección.',
            'Pequeña mejora esta semana. Suma cuando se sostiene.',
            'Recuperación gradual. Si lo mantienes, en dos semanas se nota fuerte.',
          ];
          trendPhrase = upPhrases[rotator];
        } else if (summary.trend.direction === 'down') {
          var downPhrases = strong ? [
            'Hubo desgaste fuerte esta semana. La peor noche fue ' + summary.worstNight.dayLabel + '.',
            'Tu sueño cayó notablemente. El cuerpo te está pidiendo más espacio.',
            'Semana exigente — los datos lo confirman. Vale priorizar descanso ya.',
          ] : [
            'Pequeño desgaste. Nada alarmante, pero atención al ' + summary.worstNight.dayLabel + '.',
            'Sueño un poco abajo esta semana. Reversible si bajas el ritmo dos noches.',
            'Tendencia ligeramente a la baja. Te conviene proteger las próximas dos noches.',
          ];
          trendPhrase = downPhrases[rotator];
        } else {
          var flatPhrases = [
            'Tu semana viene estable — buen ritmo de fondo.',
            'Sueño consistente esta semana. La estabilidad ya es ganancia.',
            'Sin grandes oscilaciones. Eso es una buena base para construir encima.',
          ];
          trendPhrase = flatPhrases[rotator];
        }

        return [
          'Aquí tienes la foto. Promedio ' + summary.avgSleepLabel + ' por noche, calidad ' + summary.qualityAvgPct + '%.',
          '',
          trendPhrase,
        ].join('\n');
      },
    },

    // ─── 6. BÚSQUEDA WEB con scope wellness (B1 Sprint A.6) ────────────────
    // Usa __mtxWebSearchPlan que:
    //   • Detecta topic wellness del query (8 topics curados)
    //   • Devuelve 5 sources reales del catálogo + memoryConnection
    //   • Si no matchea scope → empty state con scopeNote amigable
    {
      name: 'web-search-wellness',
      match: function(c) {
        return _re(c, /\b(busca|investig|qu[eé] dice la ciencia|qu[eé] se sabe|estudios sobre|fuentes sobre|evidencia|qu[eé] hay sobre)/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'web_search', durationMs: 1700 },
          { toolName: 'memory_recall', durationMs: 1100 },
        ];
      },
      buildArtifact: function(content) {
        var plan = window.__mtxWebSearchPlan ? window.__mtxWebSearchPlan(content) : null;
        if (!plan) {
          // Fallback genérico
          var query = String(content || '').slice(0, 80);
          return {
            kind: 'source_list',
            query: query,
            sources: [],
            scopeNote: 'Cuéntame más concreto qué quieres saber y busco fuentes confiables.',
          };
        }
        return {
          kind: 'source_list',
          query: plan.query,
          topicLabel: plan.topicLabel,
          scopeNote: plan.scopeNote,
          sources: plan.sources,
          memoryConnection: plan.memoryConnection,
        };
      },
      buildReply: function(content) {
        var plan = window.__mtxWebSearchPlan ? window.__mtxWebSearchPlan(content) : null;
        if (!plan || !plan.sources || plan.sources.length === 0) {
          return 'No tengo fuentes wellness curadas sobre eso. Si quieres, te explico desde lo que ya sé.';
        }
        if (plan.memoryConnection) {
          return 'Filtré las 5 fuentes más sólidas sobre ' + (plan.topicLabel || 'el tema') + '. Marqué con ★ la que conecta con algo que ya tengo de ti.';
        }
        return 'Aquí 5 fuentes wellness con peso real sobre ' + (plan.topicLabel || 'el tema') + '. Toca cualquiera para abrirla.';
      },
    },

    // ─── 7. IMAGEN GENERADA (image_inline) ─────────────────────────────────
    {
      name: 'image-generate',
      match: function(c) {
        return _re(c, /\b(gen[eé]rame|crea|pinta|dib[uú]jame|im[aá]gen|visualiza|visualiz[aá]melo)/i) &&
               _re(c, /imagen|foto|visual|cuadro/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'image_generate', durationMs: 3200 },
        ];
      },
      buildArtifact: function() {
        return {
          kind: 'image_inline',
          gradient: 'linear-gradient(135deg, rgba(61,255,209,0.45), rgba(155,138,255,0.30), rgba(255,200,80,0.20))',
          aspect: 1,
          prompt: 'Visualización basada en lo que me pediste',
          caption: 'Imagen pensada para anclar tu intención.',
        };
      },
      buildReply: function() {
        return 'Aquí está. La pinté pensando en lo que vamos a sostener juntos.';
      },
    },

    // ─── 8. INTEGRACIÓN ACCIÓN (Notion/Spotify/Cal/etc) ────────────────────
    {
      name: 'integrate-action',
      match: function(c) {
        return _re(c, /\b(agrega|mete|guarda|crea|envía).*(notion|spotify|calendar|gmail|todoist|linear|slack)/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'integrate_action', durationMs: 1600 },
        ];
      },
      buildArtifact: function(content) {
        var provider = 'notion';
        if (_re(content, /spotify/i)) provider = 'spotify';
        else if (_re(content, /google.*cal|gmail/i)) provider = 'google_cal';
        else if (_re(content, /apple.*cal/i)) provider = 'apple_cal';
        else if (_re(content, /linear/i)) provider = 'linear';
        else if (_re(content, /todoist/i)) provider = 'todoist';
        else if (_re(content, /slack/i)) provider = 'slack';

        var actions = {
          notion: { action: 'Creé la nota en tu workspace', preview: { title: 'Hábitos atómicos — apuntes', subtext: 'En Mentex / Mis libros' } },
          spotify: { action: 'Agregué a tu playlist Focus', preview: { title: 'Brain Food · Episode 142', subtext: 'En tu cola, listo para escuchar' } },
          google_cal: { action: 'Creé el evento en tu Calendar', preview: { title: 'Reunión de equipo', subtext: 'Mañana 10:00 - 11:00' } },
          apple_cal: { action: 'Creé el evento en Apple Calendar', preview: { title: 'Bloque de foco', subtext: 'Hoy 14:00 - 16:00' } },
          linear: { action: 'Creé la issue en Linear', preview: { title: 'Refactor del input del chat', subtext: 'En proyecto Frontend · prioridad media' } },
          todoist: { action: 'Agregué la tarea a Todoist', preview: { title: 'Comprar magnesio', subtext: 'Para hoy · etiqueta wellness' } },
          slack: { action: 'Envié el mensaje en Slack', preview: { title: 'Para #equipo-producto', subtext: '"Mañana a las 10 revisamos el flow"' } },
        };
        var spec = actions[provider];
        return {
          kind: 'integration_action_card',
          provider: provider,
          action: spec.action,
          status: 'success',
          preview: spec.preview,
          primaryAction: { label: 'Abrir', value: 'open_external' },
        };
      },
      buildReply: function() {
        return 'Hecho. Te dejé el detalle abajo por si quieres abrirlo en la app correspondiente.';
      },
    },

    // ─── 9. LLAMADA DE VOZ (B7 Sprint A.6 — abre overlay fullscreen REAL) ──
    // El scenario detecta el prompt, ejecuta el step `voice_call` y al
    // terminar dispara `mtx:open-voice-call`. El artifact en el chat queda
    // como CTA "Iniciar llamada" (tap reabre el overlay si user lo cerró).
    // Cuando el user cuelga o transcribe, la conversación queda con
    // el contexto + transcript inyectado (handleTranscribe del overlay).
    {
      name: 'voice-call',
      match: function(c) {
        return _re(c, /\b(hablemos por voz|ll[aá]mame|hag[aá]moslo en voz|llamada|conversemos|llamada de voz)/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'voice_call', durationMs: 900 },
        ];
      },
      buildArtifact: function(content) {
        return {
          kind: 'voice_call_overlay',
          state: 'active',
          durationSec: 0,
          transcript: 'Cuéntame qué tienes en la cabeza',
          muted: false,
          // B7: prompt original para que el overlay personalice los turnos
          openPrompt: String(content || ''),
        };
      },
      buildReply: function() {
        return 'Abriendo la llamada de voz. Cuando quieras seguir escrito, toca el icono de transcribir.';
      },
      // B7: callback opcional invocado por el simulator runner cuando completa
      // los steps. Permite al scenario disparar side-effects (overlay, etc).
      onComplete: function(opts) {
        if (typeof window === 'undefined' || !window.__mtxVoiceCall) return;
        // Pequeño delay para que el bubble del coach se vea antes de pasar a overlay
        setTimeout(function() {
          window.__mtxVoiceCall.open(opts.convId, opts.userContent);
        }, 600);
      },
    },

    // ─── 10. PANTALLA COMPARTIDA (screen_share_preview) ────────────────────
    {
      name: 'screen-share',
      match: function(c) {
        return _re(c, /\b(comparte mi pantalla|mira mi pantalla|m[ií]rame|ay[uú]dame con esta pantalla)/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'screen_share_understand', durationMs: 1800 },
        ];
      },
      buildArtifact: function() {
        return {
          kind: 'screen_share_preview',
          state: 'sharing',
          region: 'Pantalla completa',
          coachNote: 'Estoy viendo lo mismo que tú. Cuéntame con qué te puedo ayudar específicamente.',
        };
      },
      buildReply: function() {
        return 'Listo. Estoy mirando contigo.';
      },
    },

    // ─── 11. RAZONAMIENTO PROFUNDO (B4 Sprint A.6 — thinking_panel LIVE) ───
    // El thinking_panel ahora muestra el "decantando" EN VIVO durante el
    // step extended_think. Thoughts aparecen progresivamente con stagger
    // natural — el user ve que el coach realmente está reflexionando, no
    // solo esperando.
    //
    // Niveles de profundidad seleccionados por el coach según complejidad:
    //   • shallow (4s, 3 thoughts) — pregunta simple que merece pausa
    //   • medium (10s, 5 thoughts) — correlacionar 2-3 cosas
    //   • deep (20s, 7 thoughts) — patrón complejo / pregunta existencial
    {
      name: 'extended-think',
      match: function(c) {
        return _re(c, /\b(por qu[eé] siento|por qu[eé] llevo|ay[uú]dame a entender|interpreta|analiza|piensa profundo|piensa con detenimiento|reflexiona)/i);
      },
      buildSteps: function(opts) {
        // Profundidad detectada por keywords del prompt.
        // Prefer opts.prompt (caller-provided) sobre this._lastContent (mutable
        // state) — más robusto si runner cambia el orden de llamadas.
        var content = (opts && opts.prompt) || this._lastContent || '';
        var depth = 'medium';
        var durMs = 10000;
        if (/piensa profundo|piensa con detenimiento|profundamente|patr[oó]n|reflexiona|analiza con detalle/i.test(content)) {
          depth = 'deep';
          durMs = 20000;
        } else if (/r[aá]pido|brevemente|en breve/i.test(content)) {
          depth = 'shallow';
          durMs = 4000;
        }
        this._depth = depth;
        this._durMs = durMs;
        return [
          { toolName: 'memory_recall', durationMs: 1600 },
          { toolName: 'extended_think', durationMs: durMs },
        ];
      },
      // Cache del last content para que buildSteps + buildArtifact
      // compartan el depth detectado
      buildArtifact: function() {
        var depth = this._depth || 'medium';
        var durMs = this._durMs || 10000;
        // Reasoning final detallado por depth
        var reasoning;
        if (depth === 'deep') {
          reasoning = 'Empecé por leer tu historial completo — los últimos 30 días.\n\nIdentifiqué patrones que no son obvios: tu energía baja los miércoles, no los viernes como pensabas. Tu sueño se rompe cuando tu jornada pasa de 9 horas.\n\nDespués crucé esto con lo que sé de tu personalidad: te recuperas mejor con descanso que con productividad. Eso descarta soluciones de "más disciplina".\n\nFinalmente miré qué intentaste antes y qué funcionó/no funcionó. La conclusión: el cambio que necesitas no es de cantidad de esfuerzo. Es de timing del esfuerzo.';
        } else if (depth === 'shallow') {
          reasoning = 'Miré rápido tu historial y tu agenda actual.\n\nLo que veo encaja con lo que ya me has contado antes.';
        } else {
          reasoning = 'Empecé por revisar tu memoria reciente.\n\nIdentifiqué un patrón: tus mejores momentos coinciden con descanso real, no con productividad forzada.\n\nEso me llevó a la respuesta que te di.';
        }
        return {
          kind: 'thinking_panel',
          state: 'done',
          summary: 'Cómo pensé esto',
          depth: depth,
          durationMs: durMs,
          reasoning: reasoning,
          // Lista completa de thoughts para el modo live (referencia al final)
          thoughts: _thoughtsForDepth(depth),
        };
      },
      buildReply: function() {
        var depth = this._depth || 'medium';
        if (depth === 'deep') {
          return 'Te voy a decir algo que tu Memoria me dice y que tal vez no estés conectando. Mira mi razonamiento si quieres entender cómo llegué a esto.';
        } else if (depth === 'shallow') {
          return 'Una observación rápida: lo que sientes encaja con un patrón que ya hemos hablado antes.';
        }
        return 'Lo pensé un momento antes de responder. Mira mi razonamiento si quieres ver el camino.';
      },
      // B4 — onStepActive: durante el step extended_think, emite
      // thinking_panel en state='thinking' con thoughts progresivos.
      onStepActive: function(opts) {
        if (opts.toolName !== 'extended_think') return;
        var store = opts.store;
        var convId = opts.convId;
        var msgId = opts.msgId;
        var _alive = opts._alive;
        var depth = this._depth || 'medium';
        var durMs = opts.durationMs;
        var thoughts = _thoughtsForDepth(depth);
        var perThoughtMs = Math.floor(durMs / thoughts.length);

        // Emite el panel inicial con state=thinking, thoughts vacío
        var liveArtifact = {
          kind: 'thinking_panel',
          state: 'thinking',
          depth: depth,
          durationMs: durMs,
          thoughts: thoughts,
          thoughtIndex: 0,
        };
        store.updateMessage(convId, msgId, { artifacts: [liveArtifact] });

        // Progreso: cada perThoughtMs incrementa thoughtIndex
        var i = 0;
        function next() {
          if (!_alive()) return;
          i += 1;
          if (i > thoughts.length) return;
          var updated = Object.assign({}, liveArtifact, { thoughtIndex: i });
          liveArtifact = updated;
          store.updateMessage(convId, msgId, { artifacts: [updated] });
          if (i < thoughts.length) {
            setTimeout(next, perThoughtMs);
          }
        }
        setTimeout(next, perThoughtMs);
      },
    },

  ];


  // ═══════════════════════════════════════════════════════════════════════════
  // DETECT — encuentra el primer scenario que matchea
  // ═══════════════════════════════════════════════════════════════════════════
  function detect(content) {
    if (!content || typeof content !== 'string') return null;
    for (var i = 0; i < SCENARIOS.length; i++) {
      try {
        if (SCENARIOS[i].match(content)) {
          return SCENARIOS[i];
        }
      } catch (e) {
        console.warn('[coach-simulator] match() error en scenario', SCENARIOS[i].name, e);
      }
    }
    return null;
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // RUN — ejecuta los steps progresivamente sobre el msg, después llama onComplete
  // ═══════════════════════════════════════════════════════════════════════════
  function run(opts) {
    var store = opts.store;
    var convId = opts.convId;
    var msgId = opts.msgId;
    var scenario = opts.scenario;
    var _alive = opts._alive;
    var onComplete = opts.onComplete;  // function(replyText, artifact)
    if (!store || !scenario) return;

    var content = opts.userContent || '';
    // B4 — Set lastContent en el scenario para que buildSteps/buildArtifact
    // detecten depth via keywords del prompt. Sin mutar state global.
    scenario._lastContent = content;
    var stepsRaw = scenario.buildSteps({ prompt: content });

    // B12 — Premium gate check: si ALGÚN step requiere una tool premium y el
    // user actual no tiene el tier necesario, interceptar antes de ejecutar.
    // Inyectamos un msg cálido del coach + abrimos el modal upgrade.
    if (window.__mtxUserTier) {
      var blockedTool = null;
      for (var si = 0; si < stepsRaw.length; si++) {
        var s = stepsRaw[si];
        var toolKey = s.toolName;
        // Special-case: extended_think con depth=deep es premium
        if (toolKey === 'extended_think' && scenario._depth === 'deep') {
          toolKey = 'extended_think_deep';
        }
        if (!window.__mtxUserTier.canUse(toolKey)) {
          blockedTool = toolKey;
          break;
        }
      }
      if (blockedTool) {
        var requiredTier = window.__mtxUserTier.requiredFor(blockedTool);
        var humanName = (function(t) {
          switch (t) {
            case 'voice_call': return 'llamadas de voz';
            case 'browse_act': return 'acciones en internet';
            case 'extended_think_deep': return 'razonamiento profundo';
            case 'image_generate': return 'imágenes generadas';
            case 'video_generate': return 'videos generados';
            case 'screen_share': return 'compartir pantalla';
            default: return t;
          }
        })(blockedTool);
        // Mensaje cálido del coach + lock visible
        store.updateMessage(convId, msgId, {
          state: 'done',
          content: 'Para esto necesito ' + humanName + ', que es una capacidad ' + requiredTier + '. Si quieres lo desbloqueamos.',
          steps: null,
          artifacts: null,
        });
        // Abre el modal premium con contexto de la tool intentada
        if (window.__mtxPremiumGate) {
          setTimeout(function() {
            window.__mtxPremiumGate.open({
              toolName: blockedTool,
              requiredTier: requiredTier,
              fromContent: content,
            });
          }, 250);
        }
        return;
      }
    }

    var steps = stepsRaw.map(function(s) {
      return {
        id: _genStepId(),
        toolName: s.toolName,
        status: 'pending',
        startedAt: null,
        completedAt: null,
        rawInput: s.rawInput || null,
        rawOutput: s.rawOutput || null,
        _durationMs: s.durationMs || 1200,
      };
    });

    // Mark msg as reasoning + inject steps array (todos pending)
    store.updateMessage(convId, msgId, { state: 'reasoning', steps: steps.slice() });

    function activateStep(idx) {
      if (!_alive()) return;
      if (idx >= steps.length) {
        // Final: emite el artifact y dispara el reply texto
        var artifact = null;
        try { artifact = scenario.buildArtifact(content); } catch (e) { console.warn('[coach-simulator] buildArtifact error', e); }
        var reply = '';
        try { reply = scenario.buildReply(content); } catch (e) { reply = 'Listo.'; }
        if (onComplete) onComplete(reply, artifact, steps);
        // B7 — scenario.onComplete side-effect hook (ej. voice-call abre overlay)
        if (scenario.onComplete) {
          try {
            scenario.onComplete({ convId: convId, msgId: msgId, userContent: content, artifact: artifact, reply: reply });
          } catch (e) { console.warn('[coach-simulator] scenario.onComplete error', e); }
        }
        return;
      }

      // Active
      steps[idx].status = 'active';
      steps[idx].startedAt = Date.now();
      store.updateMessage(convId, msgId, { steps: steps.slice() });

      // B4 — scenario.onStepActive hook: permite emitir artifacts en VIVO
      // mientras el step corre (ej. thinking_panel con thoughts progresivos).
      // El scenario recibe el toolName + un setter para inyectar artifacts.
      if (scenario.onStepActive) {
        try {
          scenario.onStepActive({
            store: store,
            convId: convId,
            msgId: msgId,
            stepIdx: idx,
            step: steps[idx],
            toolName: steps[idx].toolName,
            durationMs: steps[idx]._durationMs,
            userContent: content,
            _alive: _alive,
          });
        } catch (e) { console.warn('[coach-simulator] onStepActive error', e); }
      }

      setTimeout(function() {
        if (!_alive()) return;
        steps[idx].status = 'done';
        steps[idx].completedAt = Date.now();
        store.updateMessage(convId, msgId, { steps: steps.slice() });
        // Inter-step pause leve para que cada paso "respire"
        setTimeout(function() { activateStep(idx + 1); }, 150);
      }, steps[idx]._durationMs);
    }

    activateStep(0);
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════════════════════
  // ── Helpers para el engine (B11 Sprint A.6) ───────────────────────────────
  // Permiten al __mtxCoachEngine obtener el reply de un scenario SIN
  // re-ejecutar todo el flow de run() (que dispara steps y artifact).
  // Útil para regenerate (mismo scenario, distinta variante de texto).
  function buildReplyForScenario(scenario, content, ctx) {
    if (!scenario || typeof scenario.buildReply !== 'function') return '';
    try { return scenario.buildReply(content, ctx); }
    catch (e) { return ''; }
  }

  // Variant: si el scenario expone buildReplyVariant(seed) usa esa; sino
  // recurre a buildReply (idéntico cada vez).
  function buildReplyForScenarioVariant(scenario, content, ctx, seed) {
    if (!scenario) return '';
    if (typeof scenario.buildReplyVariant === 'function') {
      try { return scenario.buildReplyVariant(content, ctx, seed); }
      catch (e) {}
    }
    return buildReplyForScenario(scenario, content, ctx);
  }

  window.__mtxCoachSimulator = {
    detect: detect,
    run: run,
    buildReplyForScenario: buildReplyForScenario,
    buildReplyForScenarioVariant: buildReplyForScenarioVariant,
    // Debug
    _scenarios: SCENARIOS,
  };

  console.info('[coach-simulator] Listo. ' + SCENARIOS.length + ' scenarios runtime disponibles. Escribe en el chat IA un prompt que matchee uno (ej. "plánnea mi semana", "reservame yoga", "cómo dormí esta semana") y verás el timeline en vivo.');
})();
