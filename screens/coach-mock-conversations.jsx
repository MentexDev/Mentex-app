// screens/coach-mock-conversations.jsx — Fase A · RFC-001 Apéndice F
// ─────────────────────────────────────────────────────────────────────────────
// Biblioteca de conversaciones mock históricas para validar visualmente cómo
// se sienten las distintas tools y artefactos del coach. Se cargan al historial
// del usuario en dev para que pueda abrir History → ver cada escenario.
//
// CADA conversación cubre un scenario distinto del RFC-001 Apéndice F.
// Las conversaciones son DETERMINÍSTICAS — mismos timestamps relativos a
// "ahora" para que el History las muestre en orden estable.
//
// USO:
//   window.__mtxCoachMocks.load()         → carga todas al __mtxIAChat store
//   window.__mtxCoachMocks.list()         → array de definiciones
//   window.__mtxCoachMocks.reset()        → limpia el store y recarga
//   window.__mtxCoachMocks.scenario(id)   → carga una sola conversación específica
//
// CONVENCIÓN DE IDs:
//   conv-mock-{scenario-slug}   ej. conv-mock-plan-semana
//   msg-mock-{conv-slug}-{n}    ej. msg-mock-plan-semana-1
//   step-{n}                    ej. step-1, step-2
//
// EVENT FIRING:
//   Después de cargar, dispara mtx:ia-chat-changed para que useIAChat
//   actualice los componentes que están viendo el historial.
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxCoachMocks) return;

  // ─ Time helpers ──────────────────────────────────────────────────────────
  // "Now" es el momento de carga. Los conversations vienen con offsets
  // relativos (en horas o días atrás) para sentirse históricos pero estables.
  function _now() { return Date.now(); }
  function _hoursAgo(h) { return _now() - h * 3600 * 1000; }
  function _daysAgo(d) { return _now() - d * 86400 * 1000; }

  // ─ Helper para mensajes ──────────────────────────────────────────────────
  function _userMsg(id, content, createdAt) {
    return {
      id: id, role: 'user', content: content, state: 'done',
      createdAt: createdAt,
    };
  }

  function _assistantMsg(id, content, createdAt, opts) {
    opts = opts || {};
    return Object.assign({
      id: id, role: 'assistant',
      content: content, state: 'done',
      createdAt: createdAt,
      // RFC-001 §6.1 — steps[] del timeline
      steps: opts.steps || null,
      // Artefactos visuales que renderizan después del bubble
      artifacts: opts.artifacts || null,
      // Quick action chips dentro del bubble
      chips: opts.chips || null,
    }, opts.extra || {});
  }

  // ─ Helper para steps del timeline (todos en done por default) ────────────
  function _step(id, toolName, opts) {
    opts = opts || {};
    var startedAt = opts.startedAt || (_now() - 4000);
    var completedAt = opts.completedAt || (startedAt + (opts.durationMs || 1200));
    return {
      id: id,
      toolName: toolName,
      status: opts.status || 'done',
      startedAt: startedAt,
      completedAt: completedAt,
      rawInput: opts.rawInput || null,
      rawOutput: opts.rawOutput || null,
      error: opts.error || null,
    };
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // BIBLIOTECA DE 10 CONVERSACIONES MOCK
  // ═══════════════════════════════════════════════════════════════════════════
  // Cada una cubre un scenario distinto del RFC-001 Apéndice F. Las 10 elegidas
  // son las MÁS valiosas para visualizar Semana 1:
  //
  //   1. simple_query — 1 tool, sin timeline visible
  //   2. media_query — 3 tools, timeline con artefacto
  //   3. complex_plan — 5 tools + plan_card (storyboard §11.1)
  //   4. recommendation — content_recommend + recommendation_card
  //   5. external_action — web_search + browse_act + confirmation_card (storyboard §11.2)
  //   6. wearable_insight — wearable_read + insight (storyboard §11.3) [PRÓX SEMANA, mock placeholder]
  //   7. read_article — web_fetch + extended_think (storyboard §11.4) [PRÓX SEMANA, mock placeholder]
  //   8. crisis — crisis_handle (storyboard §11.5)
  //   9. error_gentle — failed step + retry
  //   10. extended_thinking — extended_think expandido visible
  //
  // Las que requieren artefactos no implementados aún en Semana 1 (insight_card,
  // step_by_step, mermaid) muestran solo el timeline + texto, pendientes de
  // ampliar en Semana 2 cuando se construyan los 17 artefactos restantes.
  // ═══════════════════════════════════════════════════════════════════════════

  function _buildConversations() {
    var conversations = [];

    // ─── 1. SIMPLE QUERY ──────────────────────────────────────────────────────
    // 1 tool, <800ms, NO debe mostrarse timeline (caída a TypingDots clásico).
    // Aquí incluimos steps en done para validar visualmente, pero en producción
    // el bubble decide no mostrarlo cuando state pasó por reasoning→streaming
    // sin haber tenido tools relevantes.
    (function() {
      var base = _hoursAgo(0.5);
      conversations.push({
        id: 'conv-mock-simple-query',
        title: 'Tengo algo agendado mañana?',
        createdAt: base, updatedAt: base + 6000, pinned: false,
        messages: [
          _userMsg('msg-mock-1-1', '¿Tengo algo programado mañana en la tarde?', base),
          _assistantMsg('msg-mock-1-2',
            'Tienes Foco Profundo a las 16:00 (45 min) y meditación a las 19:30. La tarde está bastante cargada.\n\n¿Quieres que te abra un hueco para descansar?',
            base + 3000,
            {
              // Sin steps — query directa, va por TypingDots clásico
              chips: ['Sí, abre un hueco', 'Déjalo así', 'Muéstrame la agenda'],
            }
          ),
        ],
      });
    })();


    // ─── 2. MEDIA QUERY — 3 tools + recommendation_card ──────────────────────
    (function() {
      var base = _hoursAgo(3);
      conversations.push({
        id: 'conv-mock-media-query',
        title: 'Qué leo esta semana sobre disciplina?',
        createdAt: base, updatedAt: base + 12000, pinned: false,
        messages: [
          _userMsg('msg-mock-2-1', '¿Qué leo esta semana sobre disciplina?', base),
          _assistantMsg('msg-mock-2-2',
            'Te recomiendo empezar por Hábitos Atómicos si aún no lo escuchaste. Es el más práctico para empezar.\n\n¿Lo agendo para tu ritual de la noche?',
            base + 9000,
            {
              steps: [
                _step('step-1', 'memory_recall', {
                  startedAt: base + 800, durationMs: 1100,
                  rawInput: { query: 'libros sobre disciplina ya escuchados' },
                  rawOutput: { facts: ['Le gusta James Clear', 'Aún no escuchó Atomic Habits'] },
                }),
                _step('step-2', 'rag_search', {
                  startedAt: base + 1900, durationMs: 1500,
                  rawInput: { query: 'libros sobre disciplina y hábitos' },
                  rawOutput: { results: 3 },
                }),
                _step('step-3', 'content_recommend', {
                  startedAt: base + 3400, durationMs: 1800,
                  rawInput: { need: 'disciplina', kind: 'audiobook' },
                  rawOutput: { itemId: 'c-habitos' },
                }),
              ],
              artifacts: [
                {
                  kind: 'recommendation_card',
                  itemId: 'c-habitos',
                  item: {
                    title: 'Hábitos Atómicos',
                    author: 'James Clear',
                    kind: 'audiobook',
                    durationMin: 272,
                    accent: '#3dffd1',
                    isPremium: false,
                  },
                  reason: 'Mencionaste hace unos días que querías ordenar tu rutina — éste es el más práctico para empezar.',
                  primaryAction: { label: 'Reproducir', value: 'play' },
                  secondaryAction: { label: 'Guardar', value: 'save' },
                },
              ],
              chips: ['Agéndalo a las 22:00', 'Otro libro', 'Solo el resumen'],
            }
          ),
        ],
      });
    })();


    // ─── 3. COMPLEX PLAN — plan_card semanal (storyboard §11.1) ──────────────
    (function() {
      var base = _hoursAgo(8);
      conversations.push({
        id: 'conv-mock-plan-semana',
        title: 'Plánnea mi semana — presentación + viaje',
        createdAt: base, updatedAt: base + 25000, pinned: true,
        messages: [
          _userMsg('msg-mock-3-1',
            'Tengo presentación importante el jueves y vuelo a Bogotá el viernes. Plánnea mi semana — ritual, foco, descanso.',
            base),
          _assistantMsg('msg-mock-3-2',
            'Te dejé un plan en forma de diario. Lo armé pensando en que el jueves estés liviano y el viernes el ritual sea minimalista para no estresar el viaje.\n\n¿Te gusta así o ajustamos algo?',
            base + 20000,
            {
              steps: [
                _step('step-1', 'agenda_schedule_reminder', {
                  startedAt: base + 1000, durationMs: 1400,
                  rawInput: { action: 'read', range: 'week-current' },
                }),
                _step('step-2', 'memory_recall', {
                  startedAt: base + 2400, durationMs: 1600,
                  rawInput: { query: 'preferencias ritual semana intensa' },
                }),
                _step('step-3', 'rag_search', {
                  startedAt: base + 4000, durationMs: 1700,
                  rawInput: { query: 'manejo del estrés antes de presentación' },
                }),
                _step('step-4', 'extended_think', {
                  startedAt: base + 5700, durationMs: 8200,
                  rawInput: { task: 'Planificar 7 días con 2 eventos críticos' },
                }),
                _step('step-5', 'document_render', {
                  startedAt: base + 13900, durationMs: 1100,
                  rawInput: { type: 'plan_card', days: 7 },
                }),
              ],
              artifacts: [
                {
                  kind: 'plan_card',
                  title: 'Tu semana — del 27 al 2 de junio',
                  icon: '📓',
                  days: [
                    { label: 'Lun', items: [
                      { icon: '◐', text: 'Foco profundo 7am' },
                      { icon: '◐', text: 'Hábitos Atómicos cap 4 (30 min)' },
                    ]},
                    { label: 'Mar', items: [
                      { icon: '◐', text: 'Meditación mañana (10 min)' },
                      { icon: '◐', text: 'Sesión foco 14:00 (90 min)' },
                    ]},
                    { label: 'Mié', items: [
                      { icon: '◐', text: 'Repaso ligero presentación 7am' },
                      { icon: '◐', text: 'Descanso largo en la tarde' },
                    ]},
                    { label: 'Jue', items: [
                      { icon: '⚡', text: 'Solo presentación' },
                      { icon: '◯', text: 'Sin ritual pesado, día completo para ti' },
                    ]},
                    { label: 'Vie', items: [
                      { icon: '✈️', text: 'Viaje a Bogotá' },
                      { icon: '◐', text: 'Meditación de viaje (8 min)' },
                    ]},
                    { label: 'Sáb', items: [
                      { icon: '◯', text: 'Día libre' },
                    ]},
                    { label: 'Dom', items: [
                      { icon: '◐', text: 'Cierre reflexivo 21:00' },
                    ]},
                  ],
                  notes: [
                    'El jueves lo dejé libre adrede — concéntrate solo en la presentación.',
                    'El viernes el ritual es minimalista para no estresar el viaje.',
                    'El sábado lo dejé abierto — descansa.',
                  ],
                  primaryAction: { label: 'Agendarlo todo', value: 'commit_all' },
                  secondaryAction: { label: 'Ajustar', value: 'edit' },
                },
              ],
            }
          ),
        ],
      });
    })();


    // ─── 4. RECOMMENDATION — simple, 1 tool + artifact ───────────────────────
    (function() {
      var base = _hoursAgo(20);
      conversations.push({
        id: 'conv-mock-recommend-sleep',
        title: 'Recomiéndame algo para dormir',
        createdAt: base, updatedAt: base + 8000, pinned: false,
        messages: [
          _userMsg('msg-mock-4-1', 'Recomiéndame una meditación para dormir bien hoy.', base),
          _assistantMsg('msg-mock-4-2',
            'Tengo justo lo que necesitas. Esta funciona muy bien cuando el día fue intenso.',
            base + 5000,
            {
              steps: [
                _step('step-1', 'content_recommend', {
                  startedAt: base + 800, durationMs: 1400,
                  rawInput: { need: 'dormir mejor', kind: 'meditation' },
                  rawOutput: { itemId: 'c-dormir' },
                }),
              ],
              artifacts: [
                {
                  kind: 'recommendation_card',
                  itemId: 'c-dormir',
                  item: {
                    title: 'Meditación profunda para dormir',
                    author: 'Voz Mentex AI',
                    kind: 'meditation',
                    durationMin: 22,
                    accent: '#9b8aff',
                    isPremium: false,
                  },
                  reason: 'Suaviza la respiración y te lleva al sueño profundo sin sobreestimular la mente.',
                  primaryAction: { label: 'Reproducir', value: 'play' },
                  secondaryAction: { label: 'Más tarde', value: 'later' },
                },
              ],
              chips: ['Programar para esta noche', 'Otra meditación', 'Un sonido binaural'],
            }
          ),
        ],
      });
    })();


    // ─── 5. EXTERNAL ACTION — confirmation_card (storyboard §11.2) ───────────
    (function() {
      var base = _hoursAgo(28);
      conversations.push({
        id: 'conv-mock-reservar-yoga',
        title: 'Reservame yoga sábado',
        createdAt: base, updatedAt: base + 18000, pinned: false,
        messages: [
          _userMsg('msg-mock-5-1', 'Reservame yoga sábado por la mañana cerca de mi casa.', base),
          _assistantMsg('msg-mock-5-2',
            'Encontré 3 opciones cerca. Te recomiendo la primera porque ya fuiste con esa instructora y te gustó.',
            base + 7000,
            {
              steps: [
                _step('step-1', 'web_search', {
                  startedAt: base + 800, durationMs: 2400,
                  rawInput: { query: 'yoga sábado mañana cerca de Bogotá norte' },
                }),
                _step('step-2', 'memory_recall', {
                  startedAt: base + 3200, durationMs: 1300,
                  rawInput: { query: 'estudios de yoga visitados antes' },
                  rawOutput: { facts: ['Casa del Yoga · instructora María 4.8'] },
                }),
              ],
              artifacts: [
                {
                  kind: 'confirmation_card',
                  preface: 'Antes de reservar:',
                  bullets: [
                    'Yoga Flow · Sábado 9:00 am',
                    'Casa del Yoga · 20 min en bici desde tu casa',
                    'Instructora María (4.8 ⭐ — ya fuiste antes)',
                    'Pago $15 con tu tarjeta terminada en 4242',
                  ],
                  primaryAction: { label: 'Adelante, hazlo', value: 'confirm' },
                  secondaryAction: { label: 'Otras opciones', value: 'show_alternatives' },
                },
              ],
            }
          ),
          // Después de confirmar (resolved=confirmed)
          _userMsg('msg-mock-5-3', 'Adelante, hazlo', base + 12000),
          _assistantMsg('msg-mock-5-4',
            'Reservada. Ya está en tu Agenda y te dejé un reminder para salir a las 8:35.',
            base + 18000,
            {
              steps: [
                _step('step-1', 'browse_act', {
                  startedAt: base + 12500, durationMs: 3200,
                  rawInput: { url: 'https://casadelyoga.co/booking', action: 'reserve' },
                  rawOutput: { confirmation: '#YF-20260530' },
                }),
                _step('step-2', 'agenda_schedule_reminder', {
                  startedAt: base + 15700, durationMs: 900,
                  rawInput: { title: 'Salir a yoga', at: 'sat 08:35' },
                }),
              ],
              artifacts: [
                {
                  kind: 'confirmation_card',
                  preface: '✓ Reservada',
                  bullets: [
                    'Yoga Flow · Sábado 9:00 am',
                    'Confirmación: #YF-20260530',
                    'Te recordaré salir de tu casa a las 8:35',
                  ],
                  resolved: 'confirmed',
                },
              ],
            }
          ),
        ],
      });
    })();


    // ─── 6. WEARABLE INSIGHT — placeholder (artifact insight_card en Semana 2) ─
    (function() {
      var base = _hoursAgo(46);
      conversations.push({
        id: 'conv-mock-wearable-sleep',
        title: 'Cómo dormí esta semana',
        createdAt: base, updatedAt: base + 7000, pinned: false,
        messages: [
          _userMsg('msg-mock-6-1', '¿Cómo dormí esta semana?', base),
          _assistantMsg('msg-mock-6-2',
            'Tu promedio fue 6h 42min. Calidad 87% (HRV + sueño profundo).\n\nTu peor noche fue el jueves (4h 30) — recuerdo que tuviste la presentación al día siguiente.\n\nTu mejor noche: domingo (8h 15).\n\n¿Quieres que veamos qué patrón está bajando tus noches a 6h?',
            base + 4500,
            {
              steps: [
                _step('step-1', 'wearable_read', {
                  startedAt: base + 700, durationMs: 1100,
                  rawInput: { range: 'last-7-days', metrics: ['sleep', 'hrv'] },
                }),
                _step('step-2', 'memory_recall', {
                  startedAt: base + 1800, durationMs: 1300,
                  rawInput: { query: 'eventos importantes esta semana' },
                  rawOutput: { facts: ['Tuvo presentación jueves'] },
                }),
                _step('step-3', 'extended_think', {
                  startedAt: base + 3100, durationMs: 1400,
                  rawInput: { task: 'Identificar patrón de sueño' },
                }),
              ],
              // En Semana 2 esto va a renderizar un insight_card real.
              // Por ahora el texto del bubble cubre el caso.
              chips: ['Sí, busca el patrón', 'Cómo mejorar?', 'Está bien así'],
            }
          ),
        ],
      });
    })();


    // ─── 7. READ ARTICLE — web_fetch + extended_think (placeholder) ──────────
    (function() {
      var base = _hoursAgo(72);
      conversations.push({
        id: 'conv-mock-leer-articulo',
        title: 'Léeme este artículo de Huberman',
        createdAt: base, updatedAt: base + 11000, pinned: false,
        messages: [
          _userMsg('msg-mock-7-1',
            'https://hubermanlab.com/sleep-protocol — léeme este artículo y dime las 3 cosas que aplican a mí.',
            base),
          _assistantMsg('msg-mock-7-2',
            'El artículo cubre 9 protocolos de sueño. De esos, 3 te calzan exactamente porque ya conozco tu rutina:\n\n1. Luz solar 5-10 min al despertar.\n   Por qué a ti: te despiertas con cortinas cerradas. Probemos abrirlas apenas suene el despertador.\n\n2. No comer 2h antes de dormir.\n   Por qué a ti: cenas a las 21:00 y duermes a las 22:30. ¿Movemos la cena a las 20:00?\n\n3. Temperatura del cuarto 18-19°C.\n   Por qué a ti: tu casa inteligente la tiene en 22°C. ¿Bajamos a 19?',
            base + 8000,
            {
              steps: [
                _step('step-1', 'web_fetch', {
                  startedAt: base + 700, durationMs: 2200,
                  rawInput: { url: 'https://hubermanlab.com/sleep-protocol' },
                }),
                _step('step-2', 'memory_recall', {
                  startedAt: base + 2900, durationMs: 1500,
                  rawInput: { query: 'rutina de sueño actual + casa inteligente' },
                }),
                _step('step-3', 'wearable_read', {
                  startedAt: base + 4400, durationMs: 1100,
                  rawInput: { metric: 'sleep_pattern' },
                }),
                _step('step-4', 'extended_think', {
                  startedAt: base + 5500, durationMs: 2400,
                  rawInput: { task: 'Cruzar artículo con datos del user' },
                }),
              ],
              // En Semana 2 esto va a renderizar un step_by_step_card.
              chips: ['Aplicar los 3', 'Solo el primero', 'Ver artículo completo'],
            }
          ),
        ],
      });
    })();


    // ─── 8. CRISIS — protocolo dedicado (storyboard §11.5) ───────────────────
    // CRISIS FLOW NO USA TIMELINE NORMAL. El RFC-001 §11.5 lo enfatiza: cero
    // animaciones cute, tipografía un punto más grande (lo manejamos en
    // crisis_support_card cuando se construya), recursos pro accesibles instant.
    (function() {
      var base = _daysAgo(5);
      conversations.push({
        id: 'conv-mock-crisis',
        title: 'Apoyo en momento difícil',
        createdAt: base, updatedAt: base + 4000, pinned: false,
        messages: [
          _userMsg('msg-mock-8-1', 'No puedo más. Pensé en hacerme daño.', base),
          _assistantMsg('msg-mock-8-2',
            'Aquí estoy contigo.\n\nLo que dijiste me importa. Estás pasando por algo difícil.\n\nAntes de cualquier otra cosa:\n\n🇨🇴 Línea 106 (24/7, gratis) — toca para llamar\n🌎 Mensaje al 741741 — toca para abrir\n\nSi estás en peligro inmediato, por favor llama al 123.\n\nNo estoy aquí para reemplazar ayuda profesional. Estoy para acompañarte mientras buscas a alguien que sí pueda hacerlo.\n\n¿Quieres que te ayude a contactar a un profesional ahora mismo?',
            base + 2000,
            {
              // Solo 1 step, sin variantes
              steps: [
                _step('step-1', 'crisis_handle', {
                  startedAt: base + 200, durationMs: 1500,
                }),
              ],
              // En Semana 2 esto va a renderizar un crisis_support_card especial
              // (variante del step_by_step con dial-out CTAs y tipografía grande).
              chips: ['Sí, ayúdame a contactar profesional', 'Solo estaba pensando en voz alta'],
            }
          ),
        ],
      });
    })();


    // ─── 9. ERROR GENTLE — un step falla con retry ────────────────────────────
    (function() {
      var base = _daysAgo(7);
      conversations.push({
        id: 'conv-mock-error-gentle',
        title: 'Buscar info en la web',
        createdAt: base, updatedAt: base + 8000, pinned: false,
        messages: [
          _userMsg('msg-mock-9-1', '¿Qué se ha dicho últimamente sobre los efectos de la cafeína después de las 2pm?', base),
          _assistantMsg('msg-mock-9-2',
            'No pude conectarme a la búsqueda en este momento. Te puedo dar lo que sé de mi biblioteca, o lo intentamos de nuevo en un minuto.',
            base + 5000,
            {
              steps: [
                _step('step-1', 'web_search', {
                  startedAt: base + 800, durationMs: 4000,
                  status: 'failed',
                  rawInput: { query: 'cafeína después 2pm efectos sueño' },
                  error: { message: 'Network timeout', retryable: true },
                }),
                _step('step-2', 'rag_search', {
                  startedAt: base + 4800, durationMs: 1100,
                  rawInput: { query: 'cafeína y sueño' },
                  rawOutput: { results: 2 },
                }),
              ],
              chips: ['Reintentar la búsqueda', 'Cuéntame lo que sabes', 'Déjalo así'],
            }
          ),
        ],
      });
    })();


    // ─── 10. EXTENDED THINKING — pensamiento profundo visible ────────────────
    (function() {
      var base = _daysAgo(10);
      conversations.push({
        id: 'conv-mock-extended-think',
        title: 'Por qué llevo 3 meses sintiéndome igual',
        createdAt: base, updatedAt: base + 20000, pinned: false,
        messages: [
          _userMsg('msg-mock-10-1',
            'Siento que llevo 3 meses haciendo las mismas cosas y no estoy avanzando. Ayúdame a entender qué está pasando.',
            base),
          _assistantMsg('msg-mock-10-2',
            'Te voy a decir algo que tu Memoria me dice y que tal vez no estés conectando:\n\nLlevas 3 meses haciendo las mismas cosas con la misma intensidad pero sin la misma intención. Tu ritual no ha cambiado, pero tu vida sí — empezaste el nuevo proyecto en febrero y ya no estás eligiendo qué tiene prioridad cada semana.\n\nNo estás estancado. Estás en piloto automático.\n\nUna sugerencia: en lugar de hacer las mismas cosas mejor, prueba esta semana hacer 2 cosas distintas. Te puedo proponer qué.',
            base + 17000,
            {
              steps: [
                _step('step-1', 'memory_recall', {
                  startedAt: base + 800, durationMs: 2200,
                  rawInput: { query: 'patrones de los últimos 3 meses' },
                  rawOutput: { facts: ['Empezó proyecto en febrero', 'Ritual sin cambios', 'Disminuyó journal'] },
                }),
                _step('step-2', 'extended_think', {
                  startedAt: base + 3000, durationMs: 11500,
                  rawInput: { task: 'Análisis profundo de patrón de estancamiento' },
                }),
                _step('step-3', 'rag_search', {
                  startedAt: base + 14500, durationMs: 1800,
                  rawInput: { query: 'piloto automático en hábitos' },
                }),
              ],
              chips: ['Sí, propón las 2 cosas', '¿En qué entré en piloto automático?', 'Lo pienso luego'],
            }
          ),
        ],
      });
    })();


    // ─── 11. SLEEP INSIGHT — insight_card + stats_compact (RFC §11.3 mejorado) ─
    (function() {
      var base = _hoursAgo(46);
      conversations.push({
        id: 'conv-mock-sleep-insight',
        title: 'Cómo dormí esta semana (insight)',
        createdAt: base, updatedAt: base + 8000, pinned: false,
        messages: [
          _userMsg('msg-mock-11-1', '¿Cómo dormí esta semana? Quiero ver el detalle.', base),
          _assistantMsg('msg-mock-11-2',
            'Aquí tienes la foto completa. Tu jueves fue el peor — recuerdo que tuviste la presentación. El domingo recuperaste con 8h+.',
            base + 6500,
            {
              steps: [
                _step('step-1', 'wearable_read', {
                  startedAt: base + 700, durationMs: 1200,
                  rawInput: { range: 'last-7-days', metrics: ['sleep', 'hrv', 'quality'] },
                }),
                _step('step-2', 'extended_think', {
                  startedAt: base + 1900, durationMs: 4200,
                  rawInput: { task: 'Análisis de patrón semanal' },
                }),
              ],
              artifacts: [
                {
                  kind: 'insight_card',
                  title: 'Esta semana',
                  metric: '6h 42min',
                  metricLabel: 'promedio de sueño',
                  trend: { direction: 'down', value: '-18 min' },
                  sparkline: [0.65, 0.52, 0.68, 0.85, 0.42, 0.58, 0.95],
                  extras: [
                    { label: 'Mejor noche', value: 'Dom · 8h 15' },
                    { label: 'Peor noche', value: 'Jue · 4h 30' },
                    { label: 'Calidad promedio', value: '87%' },
                  ],
                  accent: '#9b8aff',
                },
                {
                  kind: 'stats_compact',
                  stats: [
                    { value: '7', label: 'noches', accent: '#9b8aff' },
                    { value: '47h', label: 'total', accent: '#3dffd1' },
                    { value: '87%', label: 'calidad', accent: '#ffc850' },
                  ],
                },
              ],
              chips: ['¿Qué pasó el jueves?', 'Cómo mejorar', 'Está bien así'],
            }
          ),
        ],
      });
    })();


    // ─── 12. PROTOCOLO HUBERMAN — step_by_step + comparison_table ───────────
    (function() {
      var base = _hoursAgo(60);
      conversations.push({
        id: 'conv-mock-huberman-protocol',
        title: 'Protocolo de sueño Huberman aplicado',
        createdAt: base, updatedAt: base + 14000, pinned: false,
        messages: [
          _userMsg('msg-mock-12-1',
            'Léeme este artículo de Huberman sobre sueño y dime las 3 cosas que más me sirven, comparándolas.',
            base),
          _assistantMsg('msg-mock-12-2',
            'El artículo cubre 9 protocolos. De esos, 3 te calzan exactamente. Te los doy en orden de impacto + dificultad para ti específicamente.',
            base + 10000,
            {
              steps: [
                _step('step-1', 'web_fetch', { startedAt: base + 600, durationMs: 2400 }),
                _step('step-2', 'memory_recall', { startedAt: base + 3000, durationMs: 1400 }),
                _step('step-3', 'wearable_read', { startedAt: base + 4400, durationMs: 1100 }),
                _step('step-4', 'extended_think', { startedAt: base + 5500, durationMs: 3800 }),
              ],
              artifacts: [
                {
                  kind: 'step_by_step',
                  title: '3 protocolos que te calzan',
                  steps: [
                    {
                      title: 'Luz solar 5-10 min al despertar',
                      body: 'Por qué a ti: te despiertas con cortinas cerradas. Abrirlas apenas suene el despertador acelera tu ritmo circadiano. Tu HRV en mañanas con luz fue 12% mejor según tu Oura.',
                      tag: '5-10 min',
                    },
                    {
                      title: 'No comer 2h antes de dormir',
                      body: 'Por qué a ti: cenas a las 21:00 y duermes a las 22:30. Mover la cena a las 20:00 te puede dar el espacio que tu cuerpo necesita para digerir antes de dormir.',
                      tag: 'Sin coste',
                    },
                    {
                      title: 'Temperatura del cuarto 18-19°C',
                      body: 'Por qué a ti: tu casa inteligente la tiene en 22°C según el log. Bajar a 19°C las primeras 3 horas de sueño facilita la fase profunda.',
                      tag: 'Casa inteligente',
                    },
                  ],
                  primaryAction: { label: 'Aplicar los 3', value: 'apply_all' },
                  secondaryAction: { label: 'Solo el primero', value: 'apply_first' },
                },
                {
                  kind: 'comparison_table',
                  title: 'Cuál te conviene empezar primero',
                  columns: [
                    { id: 'a', label: 'Luz solar', accent: '#ffc850', highlighted: true },
                    { id: 'b', label: 'Cena temprano', accent: '#3dffd1' },
                    { id: 'c', label: 'Cuarto frío', accent: '#9b8aff' },
                  ],
                  rows: [
                    { label: 'Impacto', values: ['Alto', 'Medio', 'Medio-Alto'] },
                    { label: 'Fricción', values: ['Baja', 'Alta (social)', 'Baja'] },
                    { label: 'Resultado en días', values: ['3-5 días', '7-10 días', '2-3 días'] },
                    { label: 'Costo', values: ['$0', '$0', '$0'] },
                  ],
                },
              ],
              chips: ['Empiezo por luz solar mañana', 'Bajamos el cuarto a 19°C ahora', 'Programar todo en mi ritual'],
            }
          ),
        ],
      });
    })();


    // ─── 13. RETO 21 DÍAS — progress_viz + quote_card + timeline_mini ────────
    (function() {
      var base = _hoursAgo(96);
      conversations.push({
        id: 'conv-mock-challenge-progress',
        title: 'Voy 14 de 21 — reto Enfoque Profundo',
        createdAt: base, updatedAt: base + 12000, pinned: true,
        messages: [
          _userMsg('msg-mock-13-1', '¿Cómo voy en el reto de 21 días?', base),
          _assistantMsg('msg-mock-13-2',
            'Vas brillante. Llevas 14 días seguidos sin saltarte. Lo más fuerte: ya no necesitas voluntad — se volvió ritmo.',
            base + 8000,
            {
              steps: [
                _step('step-1', 'memory_recall', { startedAt: base + 600, durationMs: 1100 }),
                _step('step-2', 'rag_search', { startedAt: base + 1700, durationMs: 1300 }),
              ],
              artifacts: [
                {
                  kind: 'progress_viz',
                  title: 'Reto · Enfoque Profundo 21 días',
                  progress: 0.667,
                  label: '14 de 21 días',
                  subtext: '7 días para terminar · racha sin romper',
                  accent: '#3dffd1',
                },
                {
                  kind: 'timeline_mini',
                  title: 'Lo más significativo en estos 14 días',
                  events: [
                    { label: 'Día 1', text: 'Empezaste con 25 min — sentías que era mucho', accent: '#9b8aff' },
                    { label: 'Día 5', text: 'Primera sesión de 45 min sin parar', accent: '#3dffd1' },
                    { label: 'Día 9', text: 'Llegaste a 90 min en flow estado', accent: '#ffc850' },
                    { label: 'Día 14', text: 'Hoy. Ya no es esfuerzo — es ritmo', accent: '#3dffd1' },
                  ],
                },
                {
                  kind: 'quote_card',
                  quote: 'La disciplina es el puente entre las metas y los logros. Pero el ritmo es lo que las hace inevitables.',
                  author: 'Jim Rohn',
                  source: 'Reflexión sobre hábitos',
                  accent: '#9b8aff',
                },
              ],
              chips: ['Ver los 7 días siguientes', 'Reto siguiente al terminar', 'Compartir mi progreso'],
            }
          ),
        ],
      });
    })();


    // ─── 14. PATRONES SEMANA — mermaid_diagram + memory_recall_card ──────────
    (function() {
      var base = _hoursAgo(120);
      conversations.push({
        id: 'conv-mock-weekly-patterns',
        title: 'Patrones de mi semana — dibújalos',
        createdAt: base, updatedAt: base + 18000, pinned: false,
        messages: [
          _userMsg('msg-mock-14-1',
            '¿Cómo se conectan mis hábitos esta semana? Quiero verlo visualmente.',
            base),
          _assistantMsg('msg-mock-14-2',
            'Mira lo que encontré. Tu enfoque profundo alimenta el sueño, el sueño alimenta el ritual matutino y eso vuelve a alimentar el enfoque. Es un loop positivo. Pero hay una fuga: el scroll nocturno corta el sueño y baja la calidad del día siguiente.',
            base + 13000,
            {
              steps: [
                _step('step-1', 'memory_recall', { startedAt: base + 700, durationMs: 1400 }),
                _step('step-2', 'wearable_read', { startedAt: base + 2100, durationMs: 1300 }),
                _step('step-3', 'extended_think', { startedAt: base + 3400, durationMs: 6800 }),
                _step('step-4', 'document_render', { startedAt: base + 10200, durationMs: 1100 }),
              ],
              artifacts: [
                {
                  kind: 'mermaid_diagram',
                  title: 'Tu loop semanal',
                  code: [
                    'graph TD',
                    '    A[Ritual matutino] -->|energía| B[Enfoque profundo]',
                    '    B -->|cierre| C[Sueño profundo]',
                    '    C -->|reset| A',
                    '    D[Scroll nocturno] -.fuga.-> C',
                    '    style A fill:#3dffd1,stroke:#3dffd1,color:#0a1410',
                    '    style B fill:#9b8aff,stroke:#9b8aff,color:#0a1410',
                    '    style C fill:#ffc850,stroke:#ffc850,color:#0a1410',
                    '    style D fill:#3a1a1a,stroke:#ff8b8b,color:#ff8b8b',
                  ].join('\n'),
                  caption: 'El loop positivo (verde→morado→ámbar) se rompe cuando entra el scroll (rojo).',
                },
                {
                  kind: 'memory_recall_card',
                  title: 'Lo que recuerdo de tu scroll nocturno',
                  facts: [
                    { text: 'Sueles abrir Instagram entre 22:30 y 23:15', source: 'Patrón confirmado 5 noches' },
                    { text: 'Promedias 47 min de scroll cuando empiezas', source: 'Datos del bloqueador' },
                    { text: 'Tu HRV baja 14% las noches que scrolleas', source: 'Cruce con Oura' },
                  ],
                  primaryAction: { label: 'Ver toda mi Memoria', value: 'open_memory' },
                },
              ],
              chips: ['¿Cómo corto la fuga del scroll?', 'Activar bloqueo desde 22:00', 'Es solo a veces'],
            }
          ),
        ],
      });
    })();


    // ─── 15. RUTINA YOGA CERCA — map_mini + recommendation_list ─────────────
    (function() {
      var base = _hoursAgo(140);
      conversations.push({
        id: 'conv-mock-yoga-options',
        title: 'Yoga cerca de mí — alternativas',
        createdAt: base, updatedAt: base + 10000, pinned: false,
        messages: [
          _userMsg('msg-mock-15-1', 'Dime 3 opciones de yoga cerca de mi casa para esta semana.', base),
          _assistantMsg('msg-mock-15-2',
            'Encontré 3 opciones razonables. La primera ya la conoces (instructora María). Las otras dos son nuevas pero buenas reseñas. Tap el mapa para verlas en detalle.',
            base + 7500,
            {
              steps: [
                _step('step-1', 'web_search', { startedAt: base + 600, durationMs: 2200 }),
                _step('step-2', 'memory_recall', { startedAt: base + 2800, durationMs: 900 }),
              ],
              artifacts: [
                {
                  kind: 'map_mini',
                  title: '3 lugares en 20 min',
                  places: [
                    { name: 'Casa del Yoga', distance: '20 min en bici · 4.8 ⭐' },
                    { name: 'Yoga Flow Studio', distance: '15 min en bici · 4.6 ⭐' },
                    { name: 'Vinyasa Centro', distance: '25 min en bici · 4.7 ⭐' },
                  ],
                  primaryAction: { label: 'Abrir en Maps', value: 'open_maps' },
                },
              ],
              chips: ['Reserva Casa del Yoga sábado', 'Comparar precios', 'Algo más cerca'],
            }
          ),
        ],
      });
    })();



    // ─── 16. RESERVA YOGA BODYTECH — browse_act completado (Sprint A.6 · B5) ─
    // Conv que muestra cómo se ve el resultado FINAL de un browse_act exitoso:
    // confirmation_card + overlay + bookingRef + browse_progress_card histórico.
    // Permite a Diego ver el output sin tener que disparar el flow en vivo.
    (function() {
      var base = _hoursAgo(48);
      var plan = window.__mtxBrowseActPlanFlow
        ? window.__mtxBrowseActPlanFlow('Reservame yoga lunes 7am en Bodytech')
        : null;
      var bookingRef = (plan && plan.bookingRef) || 'BT-2845';
      conversations.push({
        id: 'conv-mock-browse-yoga-bodytech',
        title: 'Yoga reservada en Bodytech',
        createdAt: base, updatedAt: base + 22000, pinned: false,
        messages: [
          _userMsg('msg-mock-16-1',
            'Resérvame yoga en Bodytech para el lunes a las 7am, por favor.',
            base),
          _assistantMsg('msg-mock-16-2',
            'Encontré opciones que te calzan. Antes de ejecutar, revisa los detalles abajo. Si confirmas, te muestro paso a paso lo que hago — puedes cancelar en cualquier momento.',
            base + 8200,
            {
              steps: [
                _step('step-1', 'web_search', { startedAt: base + 800, durationMs: 1700, rawInput: { query: 'opciones cercanas' } }),
                _step('step-2', 'memory_recall', { startedAt: base + 2500, durationMs: 1000, rawInput: { query: 'preferencias previas' } }),
                _step('step-3', 'extended_think', { startedAt: base + 3500, durationMs: 1400 }),
              ],
              artifacts: [
                {
                  kind: 'confirmation_card',
                  title: 'Confirmar antes de ejecutar',
                  subtitle: 'Reservar clase de yoga en bodytech.com.co',
                  fields: [
                    { label: 'Acción', value: 'Reservar clase de yoga' },
                    { label: 'Sitio', value: 'bodytech.com.co' },
                    { label: 'Horario', value: 'Lunes · 7:00 AM' },
                  ],
                  confirmLabel: 'Sí, procede',
                  cancelLabel: 'Cancelar',
                  // Tap "Sí, procede" en esta card del histórico abre el overlay
                  // browse_act real (mismo flow que en una conv nueva). El
                  // browseActPlan ride-along es lo que dispara el overlay.
                  browseActPlan: plan || {
                    site: 'bodytech.com.co',
                    brand: 'bodytech',
                    intent: 'Reservar clase de yoga',
                    bookingRef: bookingRef,
                    prompt: 'yoga bodytech lunes 7am',
                    steps: [
                      { label: 'Abriendo bodytech.com.co…', screenshot: 'homepage', durationMs: 1500 },
                      { label: 'Buscando clases de yoga…', screenshot: 'search', screenshotOpts: { query: 'yoga lunes' }, durationMs: 2100 },
                      { label: 'Encontré horario disponible · 7:00 AM', screenshot: 'detail', durationMs: 1800 },
                      { label: 'Confirmando con tus datos…', screenshot: 'form', durationMs: 1700 },
                      { label: '✓ Reserva confirmada', screenshot: 'confirm', screenshotOpts: { bookingRef: bookingRef }, durationMs: 1400, final: true },
                    ],
                  },
                },
              ],
              chips: ['Sí, procede', '¿Hay opción más temprano?', 'Cancelar'],
            }
          ),
          // Mensaje post-flow: cómo se ve después de que el user confirmó
          // y el overlay completó. Esto es el output canónico de
          // onComplete del bridge.
          _assistantMsg('msg-mock-16-3',
            '✓ Listo. Reservar clase de yoga en bodytech.com.co.\n\nCuando quieras te lo agrego a tu Agenda.',
            base + 22000,
            {
              artifacts: [
                {
                  kind: 'browse_progress_card',
                  state: 'done',
                  site: 'bodytech.com.co',
                  brand: 'bodytech',
                  intent: 'Reservar clase de yoga',
                  bookingRef: bookingRef,
                  steps: [
                    { label: 'Abriendo bodytech.com.co', status: 'done',
                      screenshot: window.__mtxBrowseActScreenshot && window.__mtxBrowseActScreenshot({ type: 'homepage', brand: 'bodytech' }) },
                    { label: 'Buscando clases de yoga', status: 'done',
                      screenshot: window.__mtxBrowseActScreenshot && window.__mtxBrowseActScreenshot({ type: 'search', brand: 'bodytech', query: 'yoga lunes' }) },
                    { label: 'Encontré horario · 7:00 AM', status: 'done',
                      screenshot: window.__mtxBrowseActScreenshot && window.__mtxBrowseActScreenshot({ type: 'detail', brand: 'bodytech' }) },
                    { label: 'Confirmando con tus datos', status: 'done',
                      screenshot: window.__mtxBrowseActScreenshot && window.__mtxBrowseActScreenshot({ type: 'form', brand: 'bodytech' }) },
                    { label: 'Reserva confirmada', status: 'done',
                      screenshot: window.__mtxBrowseActScreenshot && window.__mtxBrowseActScreenshot({ type: 'confirm', brand: 'bodytech', bookingRef: bookingRef }) },
                  ],
                },
              ],
              chips: ['Agregar a Agenda', '¿Qué llevar?', 'Reservar otra clase'],
            }
          ),
        ],
      });
    })();


    // ─── 16-S. WEB SEARCH HRV — source_list + scope wellness (Sprint A.6 · B1) ──
    // Conv histórica que muestra cómo se ve el source_list con scope wellness,
    // 5 fuentes curadas, source dorada (★) por memoryConnection.
    (function() {
      var base = _hoursAgo(60);
      conversations.push({
        id: 'conv-mock-web-search-hrv',
        title: '¿Qué dice la ciencia sobre HRV?',
        createdAt: base, updatedAt: base + 9000, pinned: false,
        messages: [
          _userMsg('msg-mock-ws-1',
            'Busca qué dice la ciencia sobre HRV y recuperación.',
            base),
          _assistantMsg('msg-mock-ws-2',
            'Filtré las 5 fuentes más sólidas sobre HRV / Recuperación. Marqué con ★ la que conecta con algo que ya tengo de ti.',
            base + 9000,
            {
              steps: [
                _step('step-1', 'web_search', { startedAt: base + 500, durationMs: 1700, rawInput: { query: 'HRV scope:wellness' } }),
                _step('step-2', 'memory_recall', { startedAt: base + 2200, durationMs: 1100, rawInput: { query: 'memorias sobre recuperación HRV' } }),
              ],
              artifacts: [
                {
                  kind: 'source_list',
                  query: 'qué dice la ciencia sobre HRV y recuperación',
                  topicLabel: 'HRV / Recuperación',
                  sources: [
                    { title: 'HRV: what your variability really means', snippet: 'Whoop research — por qué HRV es el mejor indicador de readiness disponible hoy.', domain: 'whoop.com', favicon: '⌚', accent: '#10b981', author: 'Whoop Science' },
                    { title: 'Track HRV, not just heart rate', snippet: 'Andrew Huberman — explicación clínica de qué causa subidas y bajadas día a día.', domain: 'hubermanlab.com', favicon: '🔬', accent: '#9b8aff', author: 'Andrew Huberman' },
                    { title: 'Cold exposure raises HRV 12-18%', snippet: 'Meta-análisis 2024: protocolos de frío de 2-3 min sostenidos elevan HRV measurable.', domain: 'pubmed.ncbi.nlm.nih.gov', favicon: '📚', accent: '#0066ff', author: 'PubMed' },
                    { title: 'Why your HRV crashes on Mondays', snippet: 'Atlantic — la jet-lag emocional de empezar semana y cómo blindarse contra ella.', domain: 'theatlantic.com', favicon: '🎩', accent: '#003580', author: 'Arthur C. Brooks' },
                    { title: 'Breath protocols that move HRV', snippet: 'Box breathing 4-4-4-4 sostenido 5 min eleva HRV en menos de una sesión.', domain: 'breathwrk.com', favicon: '💨', accent: '#3dffd1', author: 'Breathwrk Research' },
                  ],
                  memoryConnection: {
                    memoryLabel: 'Mi HRV cae los lunes después del finde',
                    memoryAge: 'hace 3 semanas',
                    relevantSourceIdx: 3,
                    summary: 'Te recuerdo: "Mi HRV cae los lunes después del finde" — hace 3 semanas. La fuente marcada con ★ es la que mejor te aplica.',
                  },
                },
              ],
              chips: ['Resumir la del Atlantic', '¿Y la del frío?', 'Aplicar todo a mi semana'],
            }
          ),
        ],
      });
    })();


    // ─── 16-A. LEER ARTÍCULO HUBERMAN — article_summary + memoria (Sprint A.6 · B2) ──
    // Muestra cómo se ve el artifact con la "memoryConnection" — el diferenciador
    // brutal vs ChatGPT/Claude. El highlight #3 queda destacado con border accent
    // porque conecta con la memoria del user.
    (function() {
      var base = _hoursAgo(36);
      conversations.push({
        id: 'conv-mock-web-fetch-huberman',
        title: 'Sueño según Huberman',
        createdAt: base, updatedAt: base + 11000, pinned: false,
        messages: [
          _userMsg('msg-mock-wf-1',
            'Léeme esto y dime qué me sirve a mí: https://hubermanlab.com/optimizing-sleep',
            base),
          _assistantMsg('msg-mock-wf-2',
            'Lo leí. Te marqué el punto que más te aplica — conecta con algo que ya tenía guardado de ti.',
            base + 11000,
            {
              steps: [
                _step('step-1', 'web_fetch', { startedAt: base + 500, durationMs: 2200, rawInput: { url: 'hubermanlab.com/optimizing-sleep' } }),
                _step('step-2', 'memory_recall', { startedAt: base + 2700, durationMs: 1300, rawInput: { query: 'metas o patrones de sueño previos' } }),
                _step('step-3', 'extended_think', { startedAt: base + 4000, durationMs: 2400 }),
              ],
              artifacts: [
                {
                  kind: 'article_summary',
                  title: 'Optimizing your sleep: science-backed protocols',
                  author: 'Andrew Huberman',
                  readingTime: '14 min',
                  domain: 'hubermanlab.com',
                  favicon: '🧠',
                  accent: '#9b8aff',
                  originalUrl: 'https://hubermanlab.com/optimizing-sleep',
                  highlights: [
                    'Exposición a luz solar 10 minutos antes de las 9am ancla tu ritmo circadiano por 24h.',
                    'La cafeína después de las 12pm reduce sueño profundo en ~30%, aunque sientas que "duermes igual".',
                    'Un ritual de 60 min antes de dormir (luz cálida + lectura + sin pantallas) reduce latencia un 40%.',
                  ],
                  memoryConnection: {
                    memoryLabel: 'Quiero dormir 7h consistente esta semana',
                    memoryAge: 'hace 2 semanas',
                    memoryType: 'goal',
                    relevantHighlightIdx: 2,
                    summary: 'Te recuerdo que mencionaste: "Quiero dormir 7h consistente esta semana" hace 2 semanas. El punto 3 del autor encaja directamente con eso.',
                  },
                },
              ],
              chips: ['Aplica el ritual de 60 min a mi noche', '¿Qué hago con la cafeína?', 'Guarda para releer'],
            }
          ),
        ],
      });
    })();


    // ─── 16-B. EXTENDED THINK PROFUNDO — thinking_panel done (Sprint A.6 · B4) ──
    // Conv histórica que muestra cómo se ve el thinking_panel en estado 'done'
    // (post-think). Permite ver el panel colapsado con depth=deep y expandirlo
    // para leer el reasoning completo. Para ver el modo LIVE hay que disparar
    // un prompt fresh del simulator (ej. "por qué siento ansiedad los domingos").
    (function() {
      var base = _hoursAgo(72);
      conversations.push({
        id: 'conv-mock-extended-think-domingos',
        title: '¿Por qué siento ansiedad los domingos?',
        createdAt: base, updatedAt: base + 25000, pinned: false,
        messages: [
          _userMsg('msg-mock-think-1',
            '¿Por qué siento ansiedad los domingos? Piensa profundo, no quiero la respuesta obvia.',
            base),
          _assistantMsg('msg-mock-think-2',
            'Te voy a decir algo que tu Memoria me dice y que tal vez no estés conectando. Mira mi razonamiento si quieres entender cómo llegué a esto.\n\nLo que veo: tu ansiedad de domingo NO es por la semana que viene. Es por la semana que termina. Estás cargando lo que NO cerraste el viernes. El domingo es el día donde tu cuerpo finalmente baja la guardia y el cuerpo te entrega la factura.',
            base + 25000,
            {
              steps: [
                _step('step-1', 'memory_recall', { startedAt: base + 600, durationMs: 1600, rawInput: { query: 'patrones domingos últimos 60 días' } }),
                _step('step-2', 'extended_think', { startedAt: base + 2200, durationMs: 20000 }),
              ],
              artifacts: [
                {
                  kind: 'thinking_panel',
                  state: 'done',
                  summary: 'Cómo pensé esto',
                  depth: 'deep',
                  durationMs: 20000,
                  thoughts: [
                    'Empezando por leer tu historial completo de los últimos 30 días…',
                    'Identificando ciclos no obvios en tu energía y descanso…',
                    'Cruzando con tu personalidad y lo que ya sabes de ti…',
                    'Descartando soluciones que ya probaste y no funcionaron…',
                    'Buscando la pieza que conecta todo esto…',
                    'Verificando si mi lectura tiene sentido contigo…',
                    'Tengo algo que decirte que vale la pena pensar.',
                  ],
                  reasoning: 'Empecé por leer tu historial completo — los últimos 30 días, no solo esta semana.\n\nIdentifiqué patrones que no son obvios: tu ansiedad de domingo correlaciona con un viernes incompleto, no con el lunes que viene. Tu sueño se rompe la noche del sábado, no la del domingo como creías.\n\nDespués crucé esto con lo que sé de tu personalidad: te recuperas mejor con cierre que con anticipación. Eso descarta la solución obvia de "preparar el lunes el domingo".\n\nDescarté lo que ya probaste: dormir más temprano (no ayudó), meditar el domingo (alivio temporal), planear la semana (postergación).\n\nFinalmente miré la pieza que conecta: el viernes a las 5pm dejas conversaciones abiertas, decisiones colgadas, mensajes sin responder. El domingo es cuando tu cuerpo finalmente baja la guardia y eso aparece.\n\nLa conclusión: el cambio que necesitas no está en el domingo. Está en cómo cierras el viernes.',
                },
              ],
              chips: ['Cómo cierro mejor el viernes', '¿Y si trabajo el sábado?', 'Recuérdamelo el viernes'],
            }
          ),
        ],
      });
    })();


    // ─── 17. AGENDAR CITA DENTISTA — browse_act con Cal.com (Sprint A.6 · B5) ─
    (function() {
      var base = _hoursAgo(90);
      var plan = window.__mtxBrowseActPlanFlow
        ? window.__mtxBrowseActPlanFlow('Agéndame cita con el dentista esta semana')
        : null;
      var bookingRef = (plan && plan.bookingRef) || 'CAL-4521';
      conversations.push({
        id: 'conv-mock-browse-cita-dentista',
        title: 'Cita dental agendada',
        createdAt: base, updatedAt: base + 20000, pinned: false,
        messages: [
          _userMsg('msg-mock-17-1',
            'Agéndame cita con el dentista esta semana, en la tarde si se puede.',
            base),
          _assistantMsg('msg-mock-17-2',
            'Tengo dos opciones que se ajustan a tu agenda. Antes de agendar, confirma los detalles. Tu última visita fue hace 7 meses.',
            base + 7500,
            {
              steps: [
                _step('step-1', 'web_search', { startedAt: base + 600, durationMs: 1700 }),
                _step('step-2', 'memory_recall', { startedAt: base + 2300, durationMs: 1100, rawInput: { query: 'última cita dental' } }),
                _step('step-3', 'extended_think', { startedAt: base + 3400, durationMs: 1400 }),
              ],
              artifacts: [
                {
                  kind: 'confirmation_card',
                  title: 'Confirmar antes de agendar',
                  subtitle: 'Agendar cita médica en cal.com',
                  fields: [
                    { label: 'Acción', value: 'Agendar cita médica' },
                    { label: 'Sitio', value: 'cal.com' },
                    { label: 'Profesional', value: 'Dra. María Salinas' },
                    { label: 'Propuesta', value: 'Jueves · 3:30 PM' },
                  ],
                  confirmLabel: 'Sí, procede',
                  cancelLabel: 'Cancelar',
                  browseActPlan: plan || {
                    site: 'cal.com',
                    brand: 'cal',
                    intent: 'Agendar cita médica',
                    bookingRef: bookingRef,
                    prompt: 'cita dentista esta semana tarde',
                    steps: [
                      { label: 'Abriendo cal.com…', screenshot: 'homepage', durationMs: 1300 },
                      { label: 'Buscando profesionales disponibles…', screenshot: 'search', screenshotOpts: { query: 'esta semana' }, durationMs: 2000 },
                      { label: 'Encontré horario que te calza', screenshot: 'detail', durationMs: 1700 },
                      { label: 'Completando tus datos…', screenshot: 'form', durationMs: 1600 },
                      { label: '✓ Cita agendada', screenshot: 'confirm', screenshotOpts: { bookingRef: bookingRef }, durationMs: 1300, final: true },
                    ],
                  },
                },
              ],
              chips: ['Sí, procede', '¿Otro día?', 'Cancelar'],
            }
          ),
          _assistantMsg('msg-mock-17-3',
            '✓ Listo. Agendar cita médica en cal.com.\n\nCuando quieras te lo agrego a tu Agenda.',
            base + 20000,
            {
              artifacts: [
                {
                  kind: 'browse_progress_card',
                  state: 'done',
                  site: 'cal.com',
                  brand: 'cal',
                  intent: 'Agendar cita médica',
                  bookingRef: bookingRef,
                  steps: [
                    { label: 'Abriendo cal.com', status: 'done',
                      screenshot: window.__mtxBrowseActScreenshot && window.__mtxBrowseActScreenshot({ type: 'homepage', brand: 'cal' }) },
                    { label: 'Buscando profesionales disponibles', status: 'done',
                      screenshot: window.__mtxBrowseActScreenshot && window.__mtxBrowseActScreenshot({ type: 'search', brand: 'cal', query: 'esta semana' }) },
                    { label: 'Encontré horario que te calza', status: 'done',
                      screenshot: window.__mtxBrowseActScreenshot && window.__mtxBrowseActScreenshot({ type: 'detail', brand: 'cal' }) },
                    { label: 'Completando tus datos', status: 'done',
                      screenshot: window.__mtxBrowseActScreenshot && window.__mtxBrowseActScreenshot({ type: 'form', brand: 'cal' }) },
                    { label: 'Cita agendada', status: 'done',
                      screenshot: window.__mtxBrowseActScreenshot && window.__mtxBrowseActScreenshot({ type: 'confirm', brand: 'cal', bookingRef: bookingRef }) },
                  ],
                },
              ],
              chips: ['Agregar a Agenda', 'Cómo prepararme', 'Recordarme un día antes'],
            }
          ),
        ],
      });
    })();


    // ─── 18. SPRINT A.8 · IMAGE GEN — image_result done state ──────────────
    (function() {
      var base = _hoursAgo(2);
      // Mock resultUrl (data SVG ya generado por el store en una corrida previa)
      var mockSrc = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">' +
        '<defs><radialGradient id="g1" cx="50%" cy="35%" r="70%">' +
        '<stop offset="0%" stop-color="#9b8aff"/>' +
        '<stop offset="50%" stop-color="#2d2549"/>' +
        '<stop offset="100%" stop-color="#0a0815"/>' +
        '</radialGradient></defs>' +
        '<rect width="100%" height="100%" fill="url(#g1)"/>' +
        '<circle cx="716" cy="307" r="184" fill="white" opacity="0.18"/>' +
        '<text x="512" y="564" font-size="225" text-anchor="middle">🧘</text>' +
        '<rect x="0" y="666" width="100%" height="358" fill="black" opacity="0.22"/>' +
        '</svg>'
      );
      conversations.push({
        id: 'conv-mock-image-gen-meditation',
        title: 'Visualízame mi meditación ideal',
        createdAt: base, updatedAt: base + 18000, pinned: false,
        messages: [
          _userMsg('msg-mock-18-1',
            'Visualízame una imagen de cómo se vería mi espacio ideal para meditar en la mañana — minimalista, luz natural, paz.',
            base),
          _assistantMsg('msg-mock-18-2',
            'Te dejé esta visión. Usé Soul V2 porque pediste algo íntimo y editorial. ¿Te ancla en algo de cómo te imaginás esa práctica?',
            base + 16000,
            {
              steps: [
                _step('step-1', 'memory_recall', {
                  startedAt: base + 500, durationMs: 1100,
                  rawInput: { query: 'meditación mañana espacio' },
                }),
                _step('step-2', 'image_generate', {
                  startedAt: base + 1600, durationMs: 14000,
                  rawInput: { prompt: 'minimalista, luz natural, paz', model: 'soul_2' },
                }),
              ],
              artifacts: [
                {
                  kind: 'image_result',
                  resultUrl: mockSrc,
                  prompt: 'minimalista, luz natural, paz · espacio meditación matinal',
                  model: 'soul_2',
                  aspectRatio: '1:1',
                  state: 'done',
                },
              ],
              chips: ['Regenerar variante', 'Guardar en Memoria', 'Hacer un video con esto'],
            }
          ),
        ],
      });
    })();


    // ─── 19. SPRINT A.8 · VIDEO GEN — storyboard_draft approved + video_result ─
    (function() {
      var base = _hoursAgo(8);
      // Mock video data (matching shape of __mtxVideoGen._generateMockVideoUrl)
      var mockCoverSrc = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640">' +
        '<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '<stop offset="0%" stop-color="#ffd28c"/>' +
        '<stop offset="100%" stop-color="#0a1410"/>' +
        '</linearGradient></defs>' +
        '<rect width="100%" height="100%" fill="url(#g)"/>' +
        '<text x="180" y="320" font-size="115" text-anchor="middle">🌅</text>' +
        '<rect x="0" y="580" width="100%" height="60" fill="black" opacity="0.65"/>' +
        '<text x="20" y="608" font-size="14" fill="white" font-family="Inter, sans-serif" font-weight="600">Apertura · el momento previo</text>' +
        '<text x="20" y="626" font-size="11" fill="white" font-family="Inter, sans-serif" opacity="0.7">6 escenas · 24s</text>' +
        '</svg>'
      );
      var mockScenes = [
        { idx: 0, title: 'Apertura · el momento previo', description: 'Cierre lento sobre la persona despertando con luz suave entrando por la ventana.', durationSec: 4, thumbnailColor: '#ffd28c', thumbnailIcon: '🌅', moodTag: 'íntimo', voiceover: 'Antes de que empiece el ruido del día, hay un instante.' },
        { idx: 1, title: 'Primer ritual', description: 'Persona toma un vaso de agua, mirada calma, pasos descalzos.', durationSec: 4, thumbnailColor: '#9bccaa', thumbnailIcon: '💧', moodTag: 'sereno', voiceover: 'Empieza con lo más simple. Agua. Aire. Tu cuerpo presente.' },
        { idx: 2, title: 'Respiración', description: 'Plano cerrado del pecho subiendo y bajando.', durationSec: 3, thumbnailColor: '#a288d4', thumbnailIcon: '🌬️', moodTag: 'meditativo', voiceover: 'Tres respiraciones. Sin pensar. Sólo sentir.' },
        { idx: 3, title: 'Movimiento', description: 'Cuerpo estirándose hacia la luz, sombras alargadas.', durationSec: 4, thumbnailColor: '#ffc850', thumbnailIcon: '🧘', moodTag: 'energía', voiceover: 'Despierta el cuerpo despacio. No corras.' },
        { idx: 4, title: 'Intención', description: 'Persona sentada con cuaderno, escribiendo una palabra.', durationSec: 4, thumbnailColor: '#5a8fff', thumbnailIcon: '✍️', moodTag: 'reflexivo', voiceover: 'Una palabra. Esa es tu brújula para hoy.' },
        { idx: 5, title: 'Salida', description: 'Persona caminando hacia la puerta con confianza tranquila.', durationSec: 5, thumbnailColor: '#3dffd1', thumbnailIcon: '🌿', moodTag: 'esperanzador', voiceover: 'Ya estás listo. Tu mañana ya es tuya.' },
      ];
      conversations.push({
        id: 'conv-mock-video-gen-morning',
        title: 'Reel de mi rutina matinal',
        createdAt: base, updatedAt: base + 180000, pinned: false,
        messages: [
          _userMsg('msg-mock-19-1',
            'Quiero crear un video de mi rutina matinal — quiero que motive a otros sin sonar performativo. 6 escenas máximo.',
            base),
          _assistantMsg('msg-mock-19-2',
            'Te armo el storyboard primero · 6 escenas con voz cálida (Lumen). Podés editarlo antes de generar.',
            base + 4500,
            {
              steps: [
                _step('step-1', 'memory_recall', { startedAt: base + 300, durationMs: 900 }),
                _step('step-2', 'storyboard_generate', { startedAt: base + 1200, durationMs: 3200 }),
              ],
              artifacts: [
                {
                  kind: 'storyboard_draft',
                  storyboardId: 'storyboard-mock-morning',
                  state: 'approved',
                  _mockScenes: mockScenes,
                  _mockVoiceId: 'lumen_calm',
                  _mockAspectRatio: '9:16',
                  _mockModel: 'seedance_2_0',
                },
              ],
            }
          ),
          _assistantMsg('msg-mock-19-3',
            'Listo · render finalizado en 2 min 14s. Lumen como narradora, vertical 9:16. Te lo dejo abajo · podés regenerar o guardarlo.',
            base + 175000,
            {
              steps: [
                _step('step-1', 'video_generate', {
                  startedAt: base + 8000, durationMs: 134000,
                  rawInput: { storyboard: 'storyboard-mock-morning', model: 'seedance_2_0', voice: 'lumen_calm' },
                }),
              ],
              artifacts: [
                {
                  kind: 'video_result',
                  storyboardId: 'storyboard-mock-morning',
                  resultUrl: {
                    coverDataUrl: mockCoverSrc,
                    durationSec: 24,
                    sceneCount: 6,
                    scenes: mockScenes,
                    voiceId: 'lumen_calm',
                    aspectRatio: '9:16',
                    model: 'seedance_2_0',
                  },
                  state: 'done',
                },
              ],
              chips: ['Regenerar con otra voz', 'Guardar en biblioteca', 'Compartir en redes'],
            }
          ),
        ],
      });

      // Hidratar storyboard mock al store — espera a que __mtxVideoGen esté
      // listo (carga async via Babel-standalone, robust con poll-backoff).
      var hydrate = function() {
        if (window.__mtxVideoGen && window.__mtxVideoGen.seedMockStoryboard) {
          window.__mtxVideoGen.seedMockStoryboard({
            storyboardId: 'storyboard-mock-morning',
            scenes: mockScenes,
            voiceId: 'lumen_calm',
            aspectRatio: '9:16',
            model: 'seedance_2_0',
            prompt: 'rutina matinal motivacional sin performativo',
          });
        } else {
          setTimeout(hydrate, 200);
        }
      };
      hydrate();
    })();


    // ─── 20. SPRINT A.9 · WELLNESS — stress detected + box breathing inline ─
    (function() {
      var base = _hoursAgo(1);
      conversations.push({
        id: 'conv-mock-wellness-stress',
        title: 'Estoy estresado por la presentación',
        createdAt: base, updatedAt: base + 180000, pinned: false,
        messages: [
          _userMsg('msg-mock-20-1',
            'Estoy muy estresado por la presentación de mañana. No puedo concentrarme y siento que se me viene todo encima.',
            base),
          _assistantMsg('msg-mock-20-2',
            'Te escucho. Antes de cualquier otra cosa, hagamos esto juntos · 2 minutos.\n\nVas a respirar siguiendo un cuadrado. Cuatro segundos por cada lado: inhalas, sostienes, exhalas, sostienes. Es una técnica de los Navy SEALs antes de operaciones — activa tu sistema parasimpático y baja el cortisol rápido.\n\nNo tenés que hacer nada perfecto. Solo seguir el punto con tu respiración.',
            base + 4000,
            {
              steps: [
                _step('step-1', 'memory_recall', {
                  startedAt: base + 200, durationMs: 800,
                  rawInput: { query: 'patrones de estrés del user' },
                }),
                _step('step-2', 'stress_detection', {
                  startedAt: base + 1000, durationMs: 600,
                  rawInput: { msg: 'estresado, no puedo concentrarme, se me viene todo encima' },
                  rawOutput: { level: 'medium', recommended: 'box_breathing' },
                }),
              ],
              artifacts: [
                {
                  kind: 'wellness_exercise',
                  // sessionId queda null — el artifact lo crea on-mount
                  type: 'box_breathing',
                  totalCycles: 5,
                },
              ],
            }
          ),
          _userMsg('msg-mock-20-3',
            'Gracias. Eso ayudó. Me siento más centrado.',
            base + 165000),
          _assistantMsg('msg-mock-20-4',
            'Esa sensación que tenés ahora — más centrado, más en el cuerpo — es exactamente el estado desde donde se prepara bien una presentación.\n\nQuiero que recuerdes esto para mañana: si sentís el agobio subiendo justo antes de empezar, hacé 2 ciclos box en el baño. 30 segundos. Es invisible para los demás y vuelves al cuerpo.\n\n¿Querés que te programe un recordatorio 15 min antes de la presentación con un ejercicio rápido?',
            base + 178000,
            {
              chips: ['Sí, programá el recordatorio', 'No, ya tengo el ritual', '¿Cuál ejercicio rápido?'],
            }
          ),
        ],
      });
    })();


    // ─── 21. WELLNESS · 4-7-8 — insomnio nocturno ───────────────────────────
    (function() {
      var base = _hoursAgo(20);
      conversations.push({
        id: 'conv-mock-wellness-insomnio',
        title: 'No puedo dormir',
        createdAt: base, updatedAt: base + 240000, pinned: false,
        messages: [
          _userMsg('msg-mock-21-1',
            'Son las 2am y no puedo dormir. Mi cabeza no se calla, sigo pensando en mañana.',
            base),
          _assistantMsg('msg-mock-21-2',
            'Esto te va a ayudar. Es el 4-7-8 del Dr. Andrew Weil — desarrollado específicamente para dormir cuando la mente no para.\n\nInhalas en 4, sostienes en 7, exhalas largo en 8. La exhalación larga le dice al sistema nervioso que es seguro descansar. La primera vez sentirás que es mucho aire; está bien, ajustá.\n\n4 ciclos suelen ser suficientes para reducir el cortisol y bajar el pulso.',
            base + 4500,
            {
              steps: [
                _step('step-1', 'stress_detection', {
                  startedAt: base + 200, durationMs: 700,
                  rawInput: { msg: 'no puedo dormir, mi cabeza no se calla' },
                  rawOutput: { level: 'medium', context: 'insomnio nocturno', recommended: 'four_seven_eight' },
                }),
                _step('step-2', 'memory_recall', {
                  startedAt: base + 900, durationMs: 800,
                  rawInput: { query: 'patrones de sueño · mañanas con presentación' },
                }),
              ],
              artifacts: [
                {
                  kind: 'wellness_exercise',
                  type: 'four_seven_eight',
                  totalCycles: 4,
                },
              ],
            }
          ),
          _userMsg('msg-mock-21-3',
            'Funcionó. Me bajó la activación. Voy a intentar dormir.',
            base + 220000),
          _assistantMsg('msg-mock-21-4',
            'Eso es exactamente lo que tenía que pasar. El 4-7-8 trabaja por debajo de la mente — no la calmás pensando, la calmás respirando.\n\nSi te despertás de nuevo, no luches con el reloj. Hacelo otra vez. Es mejor que mirar el techo.\n\nMañana, antes de la presentación, hacé 2 ciclos en el baño 5 min antes. Mismo principio: bajar la activación.',
            base + 234000,
            {
              chips: ['Programar recordatorio mañana', '¿Por qué exhalación larga?', 'Buenas noches'],
            }
          ),
        ],
      });
    })();


    // ─── 22. WELLNESS · COHERENT BREATHING — pre-meditación ─────────────────
    (function() {
      var base = _hoursAgo(40);
      conversations.push({
        id: 'conv-mock-wellness-meditar',
        title: 'Quiero empezar a meditar',
        createdAt: base, updatedAt: base + 360000, pinned: false,
        messages: [
          _userMsg('msg-mock-22-1',
            'Llevo tiempo queriendo meditar pero no logro empezar. Apps me aburren. ¿Cómo arranco?',
            base),
          _assistantMsg('msg-mock-22-2',
            'No empieces con meditación. Empezá con respiración coherente — es el puente.\n\nMeditar tiene mala fama porque la gente intenta "no pensar". Eso es imposible. La respiración coherente te da algo concreto: una onda 6-6 que tu cuerpo sigue. No hay nada que lograr, solo respirar parejo.\n\nProbá 10 ciclos. Son 2 minutos. Después me decís qué notaste.',
            base + 4800,
            {
              steps: [
                _step('step-1', 'memory_recall', {
                  startedAt: base + 200, durationMs: 900,
                  rawInput: { query: 'intentos previos de meditar · journal' },
                  rawOutput: { facts: ['No siguió con Calm app', 'Quiere ritual matinal'] },
                }),
                _step('step-2', 'extended_think', {
                  startedAt: base + 1100, durationMs: 2900,
                  rawInput: { task: 'recomendar puente de entrada a meditación' },
                }),
              ],
              artifacts: [
                {
                  kind: 'wellness_exercise',
                  type: 'coherent_breathing',
                  totalCycles: 10,
                },
              ],
            }
          ),
          _userMsg('msg-mock-22-3',
            'Curiosamente, sí me sentí más centrado. Y no me aburrí.',
            base + 340000),
          _assistantMsg('msg-mock-22-4',
            'Eso pasa porque el cuerpo tiene algo que hacer. La mente sigue parloteando, pero ya no domina la atención.\n\nSi querés convertirlo en práctica: 10 ciclos cada mañana antes del café. Tres semanas y vas a sentirlo distinto.\n\nDespués si te dan ganas, puedo recomendarte meditaciones guiadas cortas (5-7 min) de Mentex. Pero sin presión.',
            base + 354000,
            {
              chips: ['Programar 10 ciclos · cada mañana', 'Ver meditaciones cortas', 'Lo intento solo primero'],
            }
          ),
        ],
      });
    })();


    // ─── 23. WELLNESS · BODY SCAN — después de mente intensa ────────────────
    (function() {
      var base = _hoursAgo(56);
      conversations.push({
        id: 'conv-mock-wellness-bodyscan',
        title: 'Mi cabeza no para de pensar',
        createdAt: base, updatedAt: base + 420000, pinned: false,
        messages: [
          _userMsg('msg-mock-23-1',
            'Llevo 5 horas escribiendo y mi cabeza explota. Pero no puedo parar — todavía hay trabajo.',
            base),
          _assistantMsg('msg-mock-23-2',
            'Si seguís así, vas a producir basura. Tu cabeza no te está pidiendo descanso por capricho.\n\nBody Scan. 5 minutos. No es opcional si querés seguir con calidad.\n\nVas a recorrer tu cuerpo de pies a cabeza. No tenés que relajar nada — solo notar. La paradoja es que al notar, el cuerpo se relaja solo. Tu mente saldrá automáticamente de loops cuando le des otra cosa que hacer.',
            base + 5200,
            {
              steps: [
                _step('step-1', 'wearable_read', {
                  startedAt: base + 300, durationMs: 1100,
                  rawInput: { metric: 'HRV current vs baseline' },
                  rawOutput: { hrv_drop: 28, context: 'sustained cognitive load' },
                }),
                _step('step-2', 'stress_detection', {
                  startedAt: base + 1400, durationMs: 600,
                  rawOutput: { level: 'medium', recommended: 'body_scan' },
                }),
              ],
              artifacts: [
                {
                  kind: 'wellness_exercise',
                  type: 'body_scan',
                  totalCycles: 1,
                },
              ],
            }
          ),
          _userMsg('msg-mock-23-3',
            'Bien. Sentí tensión que ni sabía que tenía en los hombros. Y me dieron ganas de seguir.',
            base + 400000),
          _assistantMsg('msg-mock-23-4',
            'Esa es la clave. La tensión silenciosa drena energía sin que la notes. Es como tener una pestaña abierta de Chrome consumiendo RAM en segundo plano.\n\nAhora tu siguiente hora de trabajo va a ser mejor que las anteriores 5. Lo notarás en la calidad de lo que escribas.\n\nCuando termines, otro scan. El cuerpo es tu ancla.',
            base + 415000,
            {
              chips: ['Programar scan cada 90 min', 'Ver patrón HRV de esta semana', 'Volver al trabajo'],
            }
          ),
        ],
      });
    })();


    // ─── 24. WELLNESS · STRETCHING — oficina dolor cuello ───────────────────
    (function() {
      var base = _hoursAgo(8);
      conversations.push({
        id: 'conv-mock-wellness-stretch',
        title: 'Me duele todo el cuello',
        createdAt: base, updatedAt: base + 220000, pinned: false,
        messages: [
          _userMsg('msg-mock-24-1',
            'Llevo 4 horas en calls y me duele el cuello y los hombros. Es horrible.',
            base),
          _assistantMsg('msg-mock-24-2',
            'No es "horrible", es predecible. Tu cuerpo lleva 4 horas en una postura no diseñada para mamíferos.\n\nEsto es una pausa activa: 5 posturas, 3 minutos. No necesitas yoga mat ni ropa especial. Es desde tu silla.\n\nLo importante: respirá durante cada una. Los músculos se sueltan con la exhalación, no con el estiramiento.',
            base + 4500,
            {
              steps: [
                _step('step-1', 'memory_recall', {
                  startedAt: base + 200, durationMs: 700,
                  rawInput: { query: 'patrones de calls · postura' },
                  rawOutput: { context: '4-6 horas diarias en calls según wearable' },
                }),
                _step('step-2', 'extended_think', {
                  startedAt: base + 900, durationMs: 2800,
                  rawInput: { task: 'recomendar secuencia de pausa activa' },
                }),
              ],
              artifacts: [
                {
                  kind: 'wellness_exercise',
                  type: 'stretching',
                  totalCycles: 1,
                },
              ],
            }
          ),
          _userMsg('msg-mock-24-3',
            'Mejor. Sigo trabajando ahora.',
            base + 200000),
          _assistantMsg('msg-mock-24-4',
            'Si tenés calls largas mañana también, hace esto cada 90 min. No es perder tiempo — es prevenir que mañana sea peor que hoy.\n\nUn truco: poné un timer cada 90 min. Es lo único que funciona con calls back-to-back, porque la voluntad se acaba pero el timer no.',
            base + 215000,
            {
              chips: ['Programar timer 90 min', 'Ver mi historial de pausas', 'Gracias'],
            }
          ),
        ],
      });
    })();


    // ─── 25. WELLNESS · GROUNDING 5-4-3-2-1 — ataque de pánico ──────────────
    (function() {
      var base = _hoursAgo(3);
      conversations.push({
        id: 'conv-mock-wellness-panico',
        title: 'Acabo de tener un ataque',
        createdAt: base, updatedAt: base + 380000, pinned: false,
        messages: [
          _userMsg('msg-mock-25-1',
            'Hace 10 min tuve algo, no sé si fue pánico. El corazón se aceleró, sentí que no podía respirar, me bloqueé. Ya pasó pero tengo miedo de que vuelva.',
            base),
          _assistantMsg('msg-mock-25-2',
            'Te escucho. Eso suena a episodio ansioso · pánico naciente. Que ya pasó es bueno, significa que tu sistema sabe regularse.\n\nLo que necesitás ahora no es pensar en lo que pasó. Necesitás anclarte al presente físico. Esto es 5-4-3-2-1, una técnica clínica para PTSD. Vamos a recorrer los 5 sentidos.\n\nNo hay forma de fallar. Solo nombrar. El nombrar saca a la mente del bucle y la trae a tu cuerpo. Lleva 3 minutos.',
            base + 5500,
            {
              steps: [
                _step('step-1', 'stress_detection', {
                  startedAt: base + 200, durationMs: 800,
                  rawInput: { msg: 'ataque, corazón acelerado, no podía respirar, me bloqueé' },
                  rawOutput: { level: 'high', context: 'pánico post-episodio', recommended: 'grounding_54321' },
                }),
                _step('step-2', 'extended_think', {
                  startedAt: base + 1000, durationMs: 3800,
                  rawInput: { task: 'respuesta empática + intervención clínica anti-pánico' },
                }),
                _step('step-3', 'memory_recall', {
                  startedAt: base + 4800, durationMs: 600,
                  rawInput: { query: 'episodios ansiosos previos · trigger' },
                  rawOutput: { found: false, note: 'primera vez registrada' },
                }),
              ],
              artifacts: [
                {
                  kind: 'wellness_exercise',
                  type: 'grounding_54321',
                  totalCycles: 1,
                },
              ],
            }
          ),
          _userMsg('msg-mock-25-3',
            'Lo hice. Estoy más calmado. ¿Es normal que me pase esto?',
            base + 350000),
          _assistantMsg('msg-mock-25-4',
            'Es muy común. Le pasa a más gente de la que imaginás, especialmente cuando se acumula estrés sostenido sin pausas.\n\nNo es señal de que algo grave esté mal. Pero sí es señal de que tu sistema te pide cambios en el ritmo.\n\nQuiero que sepas dos cosas:\n\n1. Si vuelve a pasar, ya tenés esta herramienta. Anclate a los sentidos. Funciona aunque no quieras que funcione.\n\n2. Si pasa más de 2 veces en un mes, conviene hablar con un profesional. No es alarmismo, es prevención sensata. Te puedo recomendar algunos.\n\n¿Cómo te sentís ahora?',
            base + 372000,
            {
              chips: ['Mejor, gracias', 'Recomendá profesionales', '¿Qué hago la próxima vez?'],
            }
          ),
        ],
      });
    })();


    // ─── 26. WELLNESS · EYE REST 20-20-20 — fatiga visual ───────────────────
    (function() {
      var base = _hoursAgo(0.5);
      conversations.push({
        id: 'conv-mock-wellness-ojos',
        title: 'Me arden los ojos',
        createdAt: base, updatedAt: base + 60000, pinned: false,
        messages: [
          _userMsg('msg-mock-26-1',
            'Tengo los ojos que arden. Llevo todo el día frente a la pantalla.',
            base),
          _assistantMsg('msg-mock-26-2',
            'Regla 20-20-20: cada 20 min de pantalla, mirá algo a 6 metros por 20 segundos. Recomendación oftalmológica clásica.\n\nEsto es ahora. 20 segundos:',
            base + 2800,
            {
              steps: [
                _step('step-1', 'stress_detection', {
                  startedAt: base + 100, durationMs: 500,
                  rawOutput: { level: 'low', context: 'fatiga visual digital', recommended: 'eye_rest_202020' },
                }),
              ],
              artifacts: [
                {
                  kind: 'wellness_exercise',
                  type: 'eye_rest_202020',
                  totalCycles: 1,
                },
              ],
            }
          ),
          _userMsg('msg-mock-26-3',
            'Mejor. Vuelvo al trabajo.',
            base + 50000),
          _assistantMsg('msg-mock-26-4',
            'Programame un timer cada 20 min si querés. Es la única forma que funciona porque la voluntad se olvida.\n\nOtro truco: parpadea conscientemente más seguido. Frente a pantalla parpadeamos la mitad de lo normal y por eso se resecan.',
            base + 56000,
            {
              chips: ['Programar timer 20 min', 'Ver ejercicios oculares más largos', 'Gracias'],
            }
          ),
        ],
      });
    })();


    return conversations;
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // API público al window
  // ═══════════════════════════════════════════════════════════════════════════
  function list() {
    return _buildConversations();
  }

  function load() {
    if (!window.__mtxIAChat) {
      console.warn('[mtxCoachMocks] __mtxIAChat store no disponible. Carga el script después de ia-flow.jsx.');
      return 0;
    }
    var convs = _buildConversations();
    var loaded = 0;
    convs.forEach(function(conv) {
      // Evitar duplicados — si ya existe una conversación con este id, skip
      var existing = window.__mtxIAChat.get(conv.id);
      if (existing) return;
      window.__mtxIAChat.create({
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messages: conv.messages,
        pinned: !!conv.pinned,
        // silent: true → NO secuestra _currentId si el user tenía
        // una conversación real activa restaurada desde localStorage (B10).
        silent: true,
      });
      loaded += 1;
    });
    // El store ya dispatchea mtx:ia-chat-changed via create() — no doble dispatch
    return loaded;
  }

  function scenario(id) {
    var convs = _buildConversations();
    var match = convs.find(function(c) { return c.id === id || c.id === 'conv-mock-' + id; });
    if (!match) {
      console.warn('[mtxCoachMocks] scenario no encontrado:', id);
      return null;
    }
    if (window.__mtxIAChat) {
      var existing = window.__mtxIAChat.get(match.id);
      if (!existing) {
        window.__mtxIAChat.create({
          id: match.id,
          title: match.title,
          createdAt: match.createdAt,
          updatedAt: match.updatedAt,
          messages: match.messages,
          pinned: !!match.pinned,
        });
      }
      window.__mtxIAChat.setCurrent(match.id);
    }
    return match;
  }

  function reset() {
    if (!window.__mtxIAChat) return 0;
    // Limpiar todas las mock convs
    var convs = _buildConversations();
    convs.forEach(function(c) { window.__mtxIAChat.deleteConversation(c.id); });
    return load();
  }

  window.__mtxCoachMocks = {
    list: list,
    load: load,
    reset: reset,
    scenario: scenario,
  };

  // ── Auto-load ROBUSTO (fix race condition Babel-standalone) ──────────────
  // Problema previo: requestAnimationFrame solo se ejecutaba 1 vez. Si
  // __mtxIAChat aún no estaba listo (Babel-standalone es async al transformar
  // archivos grandes), se perdía la carga silenciosamente.
  //
  // Solución: poll con backoff hasta ~5 segundos. Si __mtxIAChat aparece,
  // cargar; si no, log warning. También engancha a window.load como trigger
  // redundante.
  //
  // Para desactivar: setea window.__mtxCoachMocksAutoLoad = false ANTES de
  // cargar este script.
  function _attemptAutoLoad(attempt) {
    if (typeof window === 'undefined') return;
    if (window.__mtxCoachMocksAutoLoad === false) return;
    if (window.__mtxCoachMocksLoaded) return; // idempotencia

    if (window.__mtxIAChat) {
      var n = load();
      window.__mtxCoachMocksLoaded = true;
      if (n > 0) {
        console.info('[mtxCoachMocks] OK Cargadas', n, 'conversaciones mock al historial. Abre el History (icono lista, header IA) para verlas.');
      } else {
        console.info('[mtxCoachMocks] Ya estaban cargadas (idempotencia)');
      }
      return;
    }

    // Poll con backoff: 50ms, 100ms, 200ms, 400ms, 800ms, 1600ms (max ~5s)
    var delay = Math.min(50 * Math.pow(2, attempt), 1600);
    if (attempt < 10) {
      setTimeout(function() { _attemptAutoLoad(attempt + 1); }, delay);
    } else {
      console.warn('[mtxCoachMocks] WARN __mtxIAChat nunca apareció. Ejecuta manualmente: window.__mtxCoachMocks.load()');
    }
  }

  if (typeof window !== 'undefined' && window.__mtxCoachMocksAutoLoad !== false) {
    _attemptAutoLoad(0);

    // Trigger redundante en window.load — si poll falla por algún motivo, esto
    // cacha el race entre Babel y el DOM.
    if (typeof document !== 'undefined') {
      if (document.readyState === 'complete') {
        setTimeout(function() { _attemptAutoLoad(0); }, 200);
      } else {
        window.addEventListener('load', function() {
          setTimeout(function() { _attemptAutoLoad(0); }, 100);
        }, { once: true });
      }
    }
  }

})();
