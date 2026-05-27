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

    // ─── 1. RESERVAR ALGO EN INTERNET (browse_act) ─────────────────────────
    {
      name: 'browse-act-reserve',
      match: function(c) {
        return _re(c, /\b(reserv|reservame|resérvame|agendáme|cómprame|pídeme|book)\b/i) &&
               !_re(c, /^recom/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'web_search', durationMs: 1800, rawInput: { query: 'opciones cercanas' } },
          { toolName: 'memory_recall', durationMs: 1100, rawInput: { query: 'preferencias previas' } },
          { toolName: 'browse_act', durationMs: 2600, rawInput: { url: 'detectado del contexto' } },
        ];
      },
      buildArtifact: function(content) {
        return {
          kind: 'browse_progress_card',
          site: 'sitio-detectado.com',
          intent: 'Hacer la reserva que pediste',
          steps: [
            { label: 'Abrí el sitio', status: 'done', detail: 'TLS verificado, sesión OK' },
            { label: 'Encontré 3 opciones cercanas', status: 'done', detail: 'Una coincide con tus preferencias' },
            { label: 'Confirmo antes de pagar', status: 'active' },
          ],
        };
      },
      buildReply: function() {
        return 'Encontré opciones cercanas. Te confirmo los detalles antes de proceder — no quiero hacer reservas sin que me lo apruebes.';
      },
    },

    // ─── 2. LECTURA DE ARTÍCULO / URL (web_fetch) ──────────────────────────
    {
      name: 'web-fetch-article',
      match: function(c) {
        return /https?:\/\//i.test(c) ||
               _re(c, /\b(léeme|estudia este|qué dice|resúmeme).*(artículo|paper|link|url)/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'web_fetch', durationMs: 2200, rawInput: { url: 'detectado en el mensaje' } },
          { toolName: 'memory_recall', durationMs: 1300, rawInput: { query: 'qué del artículo conecta contigo' } },
          { toolName: 'extended_think', durationMs: 2400 },
        ];
      },
      buildArtifact: function() {
        return {
          kind: 'article_summary',
          title: 'Lo más relevante del artículo',
          author: 'Autor detectado',
          readingTime: '12 min',
          highlights: [
            'Idea central que conecta con tu rutina',
            'Detalle específico que aplica a tu caso',
            'Acción concreta sugerida para tu próxima semana',
          ],
          originalUrl: 'https://articulo-detectado',
          domain: 'fuente',
          accent: '#9b8aff',
        };
      },
      buildReply: function() {
        return 'Lo leí y te traigo lo esencial filtrado por lo que sé de ti. Estos 3 puntos son los que más te aplican.';
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

    // ─── 5. CÓMO DORMÍ / WEARABLE INSIGHT ──────────────────────────────────
    {
      name: 'wearable-sleep-insight',
      match: function(c) {
        return _re(c, /\b(c[oó]mo dorm[íi]|mi sue[nñ]o|cu[aá]nto dorm[íi]|datos de sue[nñ]o|wearable)/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'wearable_read', durationMs: 1200, rawInput: { metrics: ['sleep', 'hrv'], range: '7d' } },
          { toolName: 'memory_recall', durationMs: 1300 },
          { toolName: 'extended_think', durationMs: 3000 },
        ];
      },
      buildArtifact: function() {
        return {
          kind: 'insight_card',
          title: 'Esta semana',
          metric: '6h 42min',
          metricLabel: 'promedio de sueño',
          trend: { direction: 'down', value: '-18 min' },
          sparkline: [0.65, 0.52, 0.68, 0.85, 0.42, 0.58, 0.95],
          extras: [
            { label: 'Mejor noche', value: 'Dom · 8h 15' },
            { label: 'Peor noche', value: 'Jue · 4h 30' },
            { label: 'Calidad', value: '87%' },
          ],
          accent: '#9b8aff',
        };
      },
      buildReply: function() {
        return 'Aquí tienes la foto. Tu jueves fue el peor — recuerdo que tuviste un día cargado. El domingo te recuperaste.';
      },
    },

    // ─── 6. BÚSQUEDA WEB GENÉRICA (web_search → source_list) ───────────────
    {
      name: 'web-search-generic',
      match: function(c) {
        return _re(c, /\b(busca en (la )?web|investiga|qu[eé] se dice|qu[eé] est[aá]n diciendo|noticias sobre)/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'web_search', durationMs: 1800 },
        ];
      },
      buildArtifact: function(content) {
        var query = String(content || '').slice(0, 80);
        return {
          kind: 'source_list',
          query: query,
          sources: [
            { title: 'Estudio reciente sobre el tema', snippet: 'Lo más actualizado encontrado, con consenso amplio.', url: 'https://research.example.com/study', domain: 'research.example.com', favicon: '🔬', accent: '#9b8aff' },
            { title: 'Análisis de un experto reconocido', snippet: 'Perspectiva profunda con detalles prácticos aplicables a tu caso.', url: 'https://expert.com/analysis', domain: 'expert.com', favicon: '🎓', accent: '#3dffd1' },
            { title: 'Caso de estudio relevante', snippet: 'Ejemplo real que conecta con la pregunta que hiciste.', url: 'https://cases.org/example', domain: 'cases.org', favicon: '📋', accent: '#ffc850' },
          ],
        };
      },
      buildReply: function() {
        return 'Aquí lo que encontré en la web sobre lo que preguntaste. Te puse las 3 fuentes que se vieron más sólidas.';
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

    // ─── 9. LLAMADA DE VOZ (voice_call_overlay) ────────────────────────────
    {
      name: 'voice-call',
      match: function(c) {
        return _re(c, /\b(hablemos por voz|ll[aá]mame|hag[aá]moslo en voz|llamada|conversemos)/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'voice_call', durationMs: 1500 },
        ];
      },
      buildArtifact: function() {
        return {
          kind: 'voice_call_overlay',
          state: 'active',
          durationSec: 12,
          transcript: 'Cuéntame qué tienes en la cabeza',
          muted: false,
        };
      },
      buildReply: function() {
        return 'Tomá el tiempo que necesites. Estoy aquí.';
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

    // ─── 11. RAZONAMIENTO PROFUNDO (thinking_panel) ────────────────────────
    {
      name: 'extended-think',
      match: function(c) {
        return _re(c, /\b(por qu[eé] siento|por qu[eé] llevo|ay[uú]dame a entender|interpreta|analiza)/i);
      },
      buildSteps: function() {
        return [
          { toolName: 'memory_recall', durationMs: 1600 },
          { toolName: 'extended_think', durationMs: 7800 },
        ];
      },
      buildArtifact: function() {
        return {
          kind: 'thinking_panel',
          summary: 'Cómo pensé esto',
          depth: 'deep',
          durationMs: 7800,
          reasoning: 'Empecé por leer tu historial — los últimos 30 días.\n\nIdentifiqué patrones que no son obvios: tu energía baja los miércoles, no los viernes como pensabas. Tu sueño se rompe cuando tu jornada pasa de 9 horas.\n\nDespués crucé esto con lo que sé de tu personalidad: te recuperas mejor con descanso que con productividad. Eso descarta soluciones de "más disciplina".\n\nLa conclusión: el cambio que necesitas no es de cantidad de esfuerzo. Es de timing del esfuerzo.',
        };
      },
      buildReply: function() {
        return 'Te voy a decir algo que tu Memoria me dice y que tal vez no estés conectando. Mira mi razonamiento abajo si quieres entender cómo llegué a esto.';
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
    var steps = scenario.buildSteps().map(function(s) {
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
        return;
      }

      // Active
      steps[idx].status = 'active';
      steps[idx].startedAt = Date.now();
      store.updateMessage(convId, msgId, { steps: steps.slice() });

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
  window.__mtxCoachSimulator = {
    detect: detect,
    run: run,
    // Debug
    _scenarios: SCENARIOS,
  };

  console.info('[coach-simulator] Listo. ' + SCENARIOS.length + ' scenarios runtime disponibles. Escribe en el chat IA un prompt que matchee uno (ej. "plánnea mi semana", "reservame yoga", "cómo dormí esta semana") y verás el timeline en vivo.');
})();
