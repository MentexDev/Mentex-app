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

  // ── Auto-load opcional ──────────────────────────────────────────────────
  // En dev queremos que se carguen automáticamente al primer mount del IA tab
  // para que el History tenga ejemplos visibles. Si no quieres auto-load,
  // setea window.__mtxCoachMocksAutoLoad = false ANTES de cargar este script.
  if (typeof window !== 'undefined' && window.__mtxCoachMocksAutoLoad !== false) {
    // Esperar al next tick para que __mtxIAChat esté seguro disponible
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function() {
        if (window.__mtxIAChat) {
          var n = load();
          if (n > 0) {
            console.info('[mtxCoachMocks] Cargadas', n, 'conversaciones mock al historial. Abre el sheet de History en la IA tab para verlas.');
          }
        }
      });
    }
  }

})();
