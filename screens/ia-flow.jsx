// ia-flow.jsx — Sección IA: Coach Mentex (Fase 0+1)
// ─────────────────────────────────────────────────────────────────────────────
// CONCEPTO:
//   El Coach Mentex no es un chat. Es un asistente con AGENCIA: memoria del
//   user, agenda con propuestas accionables, personalidad configurable y (en
//   fases siguientes) integraciones externas. Mastra como agent runtime.
//
// FASE 0 (cimientos):
//   • __mtxIAChat — store de conversaciones (CRUD + currentId)
//   • Routing tab === 'ia' en MentexApp
//
// FASE 1 (empty state legendario + chat básico):
//   • Header sticky con 4 icon buttons (history, agenda, new, settings)
//   • Empty state con hero + quick-start chips por categoría
//   • Input bar con auto-resize textarea + 4 botones (upload/voice stubs +
//     send funcional)
//   • Render bubbles user + assistant mock con estado de reasoning
//   • History sheet funcional (list, switch, pin, delete)
//
// FASES SIGUIENTES (no en este commit):
//   • Fase 2: voice (transcripción del repo del user) + upload real
//   • Fase 3: settings sheet (personalidad, memoria, conocimiento, integ)
//   • Fase 4: agenda gestionada por IA con propuestas
//   • Fase 5: rendering rico (mermaid, tablas, imágenes, reasoning steps)
//   • Fase 6: límites de uso + estados de error avanzados
// ─────────────────────────────────────────────────────────────────────────────


// ── __mtxIAChat — store global de conversaciones (IIFE pattern) ──────────────
// Lista de conversaciones (newest first) + currentId activo. Cada conversación
// tiene mensajes; cada mensaje tiene rol (user/assistant/tool/system) + estado
// de UI (composing/reasoning/streaming/error/tool-call) + opcionalmente
// reasoning steps y tool calls (para Mastra agent runtime).
//
// Por qué IIFE con var+function en vez de const+arrow: Babel-standalone
// rompe block-scoped const cuando se accede desde closures (lección aprendida
// en __mtxNav). Patrón consistente con __mtxAutoRoutines, __mtxNav.
(function() {
  if (typeof window === 'undefined' || window.__mtxIAChat) return;

  var _conversations = [];   // [{ id, title, createdAt, updatedAt, messages, pinned }]
  var _currentId = null;

  // ── Persistencia cross-session (B10 Sprint A.6) ────────────────────────────
  // Persiste SOLO conversaciones reales del user (no las mock con prefix
  // 'conv-mock-*'). Al hydrate, los mocks se vuelven a inyectar idempotente
  // por id desde coach-mock-conversations.jsx (no se duplican).
  //
  // Schema v1: { v:1, conversations:[non-mock], currentId, persistedAt }
  // Cuando llegue backend, esto se reemplaza por GET /v1/conversations.
  var _PERSIST_KEY = '__mtxIAChat:v1';
  var _PERSIST_DEBOUNCE_MS = 400;
  var _persistTimer = null;
  var _hydrated = false;

  function _isMockId(id) {
    return typeof id === 'string' && id.indexOf('conv-mock-') === 0;
  }

  function _persistNow() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      var nonMock = _conversations.filter(function(c) { return !_isMockId(c.id); });
      var payload = {
        v: 1,
        conversations: nonMock,
        currentId: _isMockId(_currentId) ? null : _currentId,
        persistedAt: Date.now(),
      };
      window.localStorage.setItem(_PERSIST_KEY, JSON.stringify(payload));
    } catch (err) {
      // Quota → archivamos mensajes de las conversaciones más viejas
      // manteniendo el último mensaje user+assistant como preview
      if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
        try {
          var sorted = _conversations.filter(function(c) { return !_isMockId(c.id); })
                                      .sort(function(a, b) { return (a.updatedAt || 0) - (b.updatedAt || 0); });
          var trimmed = sorted.map(function(c, idx) {
            if (idx > sorted.length - 5 || c.pinned) return c; // mantén las últimas 5 y pinned full
            var msgs = c.messages || [];
            var lastTwo = msgs.slice(-2);
            return Object.assign({}, c, { messages: lastTwo, _truncated: true });
          });
          window.localStorage.setItem(_PERSIST_KEY, JSON.stringify({
            v: 1,
            conversations: trimmed,
            currentId: _isMockId(_currentId) ? null : _currentId,
            persistedAt: Date.now(),
          }));
        } catch (_) { /* localStorage roto — degradación silenciosa */ }
      }
    }
  }

  function _persistDebounced() {
    if (_persistTimer) clearTimeout(_persistTimer);
    _persistTimer = setTimeout(_persistNow, _PERSIST_DEBOUNCE_MS);
  }

  function _hydrate() {
    if (_hydrated) return;
    _hydrated = true;
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      var raw = window.localStorage.getItem(_PERSIST_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1) return;
      if (Array.isArray(parsed.conversations)) {
        // Filtra cualquier mock que se haya colado en el payload (defensivo)
        _conversations = parsed.conversations.filter(function(c) {
          return c && c.id && !_isMockId(c.id);
        });
      }
      if (parsed.currentId && !_isMockId(parsed.currentId)) {
        _currentId = parsed.currentId;
      }
    } catch (_) { /* parse fail — empezar fresh */ }
  }

  // Hydrate inmediato al cargar el IIFE
  _hydrate();

  function _emit() {
    _persistDebounced();
    window.dispatchEvent(new CustomEvent('mtx:ia-chat-changed', {
      detail: { count: _conversations.length, currentId: _currentId },
    }));
  }

  function _genId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  // Auto-título desde el primer mensaje del user. Trunca a ~52 chars en límite
  // de palabra para que la lista de history se lea limpia.
  function _genTitle(content) {
    if (!content) return 'Nueva conversación';
    var clean = String(content).replace(/\s+/g, ' ').trim();
    if (!clean) return 'Nueva conversación';
    if (clean.length <= 52) return clean;
    var cut = clean.slice(0, 52);
    var lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut) + '…';
  }

  window.__mtxIAChat = {
    list: function() { return _conversations.slice(); },
    get: function(id) { return _conversations.find(function(c) { return c.id === id; }) || null; },
    getCurrent: function() {
      return _conversations.find(function(c) { return c.id === _currentId; }) || null;
    },
    getCurrentId: function() { return _currentId; },
    setCurrent: function(id) { _currentId = id; _emit(); },

    create: function(seed) {
      var s = seed || {};
      var id = s.id || _genId('conv');
      var conv = {
        id: id,
        title: s.title || 'Nueva conversación',
        createdAt: s.createdAt || Date.now(),
        updatedAt: Date.now(),
        messages: s.messages ? s.messages.slice() : [],
        pinned: !!s.pinned,
      };
      _conversations = [conv].concat(_conversations);
      // Si seed.silent es true (mock loader post-hydrate), NO sobrescribe el
      // _currentId que viene del localStorage. Sin esto, los 15 mocks que se
      // cargan al startup secuestrarían el currentId del user persistido.
      if (!s.silent) {
        _currentId = id;
      } else if (_currentId === null) {
        // Si no había nada persistido, el primer mock sí se vuelve current
        _currentId = id;
      }
      _emit();
      return conv;
    },

    addMessage: function(convId, msg) {
      var msgId = (msg && msg.id) || _genId('msg');
      var fullMsg = Object.assign({
        id: msgId,
        role: 'user',
        content: '',
        createdAt: Date.now(),
      }, msg || {}, { id: msgId });

      _conversations = _conversations.map(function(c) {
        if (c.id !== convId) return c;
        var newMessages = c.messages.concat([fullMsg]);
        // Auto-set title del primer user message si la conv aún tiene el title
        // default. Primer user message = primer mensaje role=user (los assistants
        // mock pueden agregarse antes en algún flow futuro).
        var newTitle = c.title;
        var hasUserMsgAlready = c.messages.some(function(m) { return m.role === 'user'; });
        if (!hasUserMsgAlready && fullMsg.role === 'user' && c.title === 'Nueva conversación') {
          newTitle = _genTitle(fullMsg.content);
        }
        return Object.assign({}, c, {
          messages: newMessages,
          title: newTitle,
          updatedAt: Date.now(),
        });
      });
      _emit();
      return fullMsg;
    },

    updateMessage: function(convId, msgId, patch) {
      _conversations = _conversations.map(function(c) {
        if (c.id !== convId) return c;
        return Object.assign({}, c, {
          messages: c.messages.map(function(m) {
            return m.id === msgId ? Object.assign({}, m, patch) : m;
          }),
          updatedAt: Date.now(),
        });
      });
      _emit();
    },

    deleteConversation: function(id) {
      _conversations = _conversations.filter(function(c) { return c.id !== id; });
      if (_currentId === id) _currentId = (_conversations[0] && _conversations[0].id) || null;
      _emit();
    },

    rename: function(id, title) {
      var trimmed = String(title || '').trim();
      if (!trimmed) return;
      _conversations = _conversations.map(function(c) {
        return c.id === id ? Object.assign({}, c, { title: trimmed }) : c;
      });
      _emit();
    },

    // Patch genérico de propiedades de conversation. Para campos custom
    // como `scope` (chat efímero de sesión activa) que necesitan
    // diferenciarse de conversaciones normales sin agregar campos al
    // model base. NO sobreescribe id ni messages.
    update: function(id, patch) {
      var safePatch = Object.assign({}, patch);
      delete safePatch.id;
      delete safePatch.messages;
      _conversations = _conversations.map(function(c) {
        return c.id === id ? Object.assign({}, c, safePatch) : c;
      });
      _emit();
    },

    pin: function(id, pinned) {
      _conversations = _conversations.map(function(c) {
        return c.id === id ? Object.assign({}, c, { pinned: !!pinned }) : c;
      });
      _emit();
    },

    // Helper para tests/dev: clear all
    _reset: function() {
      _conversations = [];
      _currentId = null;
      _emit();
    },

    // ── B11 — replace messages atomic ─────────────────────────────────────
    // Permite truncar + reemplazar la lista de mensajes (usado por
    // engine.editUserMessage → fork del chat al editar un prompt user).
    // Atómico: un solo _emit, evita estados intermedios visibles.
    _replaceMessages: function(convId, newMessages) {
      if (!Array.isArray(newMessages)) return;
      _conversations = _conversations.map(function(c) {
        if (c.id !== convId) return c;
        return Object.assign({}, c, {
          messages: newMessages.slice(),
          updatedAt: Date.now(),
        });
      });
      _emit();
    },
  };
})();


// ── useIAChat — hook reactivo ────────────────────────────────────────────────
function useIAChat() {
  var force = React.useReducer(function(x) { return x + 1; }, 0)[1];
  React.useEffect(function() {
    var h = function() { force(); };
    window.addEventListener('mtx:ia-chat-changed', h);
    return function() { window.removeEventListener('mtx:ia-chat-changed', h); };
  }, []);
  var store = (typeof window !== 'undefined') ? window.__mtxIAChat : null;
  return {
    conversations: store ? store.list() : [],
    currentId: store ? store.getCurrentId() : null,
    current: store ? store.getCurrent() : null,
  };
}


// ── Quick-start chips data ──────────────────────────────────────────────────
// Categorizado en 4 grupos. Cada chip = prompt completo que arranca una
// conversación. El icon es un Ic* del set + accent color del grupo.
var _IA_QUICK_START = [
  {
    id: 'foco',
    label: 'Foco',
    accent: '#3dffd1',
    Ic: typeof IcTarget !== 'undefined' ? IcTarget : null,
    chips: [
      { id: 'foco-1', label: 'Ayúdame a enfocarme', prompt: 'Ayúdame a enfocarme. Tengo dificultad para concentrarme ahora mismo.' },
      { id: 'foco-2', label: 'Estoy distraído', prompt: 'Estoy distraído. ¿Qué hago?' },
      { id: 'foco-3', label: 'Diseña mi plan de enfoque', prompt: 'Diseña un plan de enfoque para hoy. Tengo varias horas disponibles.' },
    ],
  },
  {
    id: 'reflexion',
    label: 'Reflexión',
    accent: '#9b8aff',
    Ic: typeof IcLeaf !== 'undefined' ? IcLeaf : null,
    chips: [
      { id: 'ref-1', label: '¿Qué aprendí hoy?', prompt: '¿Qué aprendí hoy? Ayúdame a reflexionar sobre el día.' },
      { id: 'ref-2', label: 'Quiero reflexionar', prompt: 'Quiero reflexionar. Hazme las preguntas correctas.' },
      { id: 'ref-3', label: 'Gratitud rápida', prompt: 'Gratitud rápida: dime cómo hacer una práctica corta de gratitud.' },
    ],
  },
  {
    id: 'energia',
    label: 'Energía',
    accent: '#ffc850',
    Ic: typeof IcSpark !== 'undefined' ? IcSpark : null,
    chips: [
      { id: 'en-1', label: 'Organiza mi sesión de hoy', prompt: 'Organiza mi sesión de enfoque para hoy.' },
      { id: 'en-2', label: 'Ayúdame a cerrar el día', prompt: 'Ayúdame a cerrar el día. ¿Qué debo revisar?' },
      { id: 'en-3', label: 'Dame una rutina corta', prompt: 'Dame una rutina corta de 5 minutos para reactivar mi energía.' },
    ],
  },
  {
    id: 'descubrir',
    label: 'Descubrir',
    accent: '#5dd3ff',
    Ic: typeof IcCompass !== 'undefined' ? IcCompass : null,
    chips: [
      { id: 'desc-1', label: 'Recomiéndame contenido', prompt: 'Recomiéndame contenido para mi sesión de hoy.' },
      { id: 'desc-2', label: 'Sugiéreme un libro', prompt: 'Sugiéreme un libro para esta semana basado en mis intereses.' },
    ],
  },
];


// ── Mock LLM adapter ────────────────────────────────────────────────────────
// En Fase 0+1 todas las respuestas son mock determinista. Cuando se conecte
// Mastra real, este es el ÚNICO archivo que cambia: swap del adapter, mismo
// shape de mensajes (role/content/state/reasoning/toolCalls).
//
// La respuesta mock simula el flujo real:
//   1. Estado 'reasoning' (~600ms) — bubble con typing dots
//   2. Estado 'streaming' (texto apareciendo char-by-char)
//   3. Estado final con content completo
//
// Esto entrena las animaciones, transiciones y manejo de cancelación desde
// el día 1, así cuando llegue el real no hay sorpresas.
// ── Artifact detection + intro reply (Fase 1.2) ──────────────────────────────
// Detecta qué tipo de artifact debe adjuntar el coach según keywords del user.
// Cuando Mastra entre en Fase 1.5, esta heurística se reemplaza por tool calls
// del agente — el shape del artifact (kind + props) queda igual, sólo cambia
// quién decide. Componentes de render viven en screens/ia-artifacts.jsx.
function _detectArtifactFromUser(userContent) {
  if (!userContent) return null;
  var lc = String(userContent).toLowerCase();

  // Image — visualizaciones, vision boards
  if (/(imagen|visual(iza|ízame)?|foto|mu(é|e)strame|vision\s*board|imagina|inspir)/i.test(lc)) {
    return {
      kind: 'image',
      gradient: 'linear-gradient(135deg, #3dffd1 0%, #9b8aff 45%, #ffc850 100%)',
      caption: 'Visualización para anclar tu intención de hoy',
    };
  }

  // Voice note — audio, voz (word boundaries para evitar match en "audiolibro")
  if (/(\baudio\b|\bvoz\b|voice\s*note|nota\s*de\s*voz|m(á|a)ndame\s*(?:una)?\s*nota|env(í|i)ame.*audio)/i.test(lc)) {
    return {
      kind: 'voice',
      durationSec: 24,
      transcript: 'Cada respiración es un regreso a ti. Tómate este momento — el día puede esperar dos minutos.',
    };
  }

  // Content recommendation — libros, meditaciones, audiolibros
  if (/(recom(i|í)end|sug(i|í)er|sug(i|í)éreme|libro|audiolibro|medita(ci|c)|qu(é|e)\s+leer|qu(é|e)\s+escuchar)/i.test(lc)) {
    var ec = (typeof window !== 'undefined' && window.EXPLORE_CONTENT) || [];
    var candidates = ec.filter(function(c) {
      return c && c.status === 'available';
    });
    if (candidates.length > 0) {
      var pick = candidates[Math.floor(Math.random() * candidates.length)];
      return { kind: 'content', itemId: pick.id };
    }
  }

  // Calendar / planning — semana, día, agenda
  if (/(planif(i|í)ca|plan(é|e)a|organiza|agenda|tu\s+semana|mi\s+semana|mi\s+d(í|i)a|tu\s+d(í|i)a|horario|estructur)/i.test(lc)) {
    return {
      kind: 'calendar',
      date: 'Hoy',
      blocks: [
        { time: '07:30', title: 'Meditación', durationMin: 10, type: 'focus' },
        { time: '08:00', title: 'Deep work · proyecto principal', durationMin: 90, type: 'focus' },
        { time: '12:30', title: 'Almuerzo + caminata', durationMin: 45, type: 'health' },
        { time: '14:30', title: 'Lectura · 30 min', durationMin: 30, type: 'learning' },
        { time: '18:00', title: 'Ejercicio', durationMin: 45, type: 'health' },
        { time: '21:00', title: 'Cierre reflexivo', durationMin: 10, type: 'personal' },
      ],
    };
  }

  // Reminder — recordatorios, alertas
  if (/(recordatorio|recu(é|e)rd(a|ame)|av(í|i)sa|al[ae]rta|recordarme)/i.test(lc)) {
    return {
      kind: 'reminder',
      title: 'Hidratarte cada 90 min',
      time: '07:00',
      repeat: 'Diario',
    };
  }

  return null;
}

// Intro texto adaptado al artifact (override del _mockAssistantReply default).
// Si hay artifact, usamos este texto corto que enmarca el artifact en lugar de
// la respuesta genérica por keyword. Mantiene el flow del coach natural.
function _replyForArtifact(art) {
  if (!art) return null;
  switch (art.kind) {
    case 'image':
      return 'Aquí va una visualización para anclar tu intención. Quédate con ella unos segundos antes de seguir.';
    case 'voice':
      return 'Te dejo un voice note breve. Escúchalo cuando puedas — son veinticuatro segundos.';
    case 'content':
      var ec = (typeof window !== 'undefined' && window.EXPLORE_CONTENT) || [];
      var item = ec.find(function(c) { return c.id === art.itemId; });
      if (item) {
        return 'Mira esto: "' + item.title + '" de ' + item.author + '. Encaja bien con lo que me cuentas — tap para abrirlo.';
      }
      return 'Te recomiendo esto. Tap para abrirlo.';
    case 'calendar':
      return 'Te propongo una estructura para hoy. Revísala y dime si algo no encaja — la puedes ajustar.';
    case 'reminder':
      return 'Esto te puede ayudar. Activarlo toma un segundo.';
    default:
      return null;
  }
}


function _mockAssistantReply(userContent) {
  // Respuestas curadas según keyword detection
  var c = String(userContent || '').toLowerCase();
  if (/enfoc|distra|concentr/.test(c)) {
    return [
      'Empecemos con un paso pequeño. Cierra los ojos 30 segundos y escucha tu respiración.',
      'Cuando vuelvas, dime qué tarea es la más importante de tu día — solo una. Esa será nuestra ancla.',
    ].join('\n\n');
  }
  if (/aprend|reflex/.test(c)) {
    return [
      'Tres preguntas para hoy:',
      '• ¿Qué momento te dejó más energía?',
      '• ¿Qué decisión te hizo dudar?',
      '• ¿Qué harías diferente mañana?',
      '',
      'Tómate dos minutos. No tienen que ser respuestas largas.',
    ].join('\n');
  }
  if (/gratitud/.test(c)) {
    return [
      'Una práctica de 60 segundos:',
      '',
      '1. Una persona que te alegró el día',
      '2. Algo de tu cuerpo que funciona bien hoy',
      '3. Algo simple que disfrutaste (café, luz, una canción)',
      '',
      'Escribirlo cuenta el doble. ¿Listo?',
    ].join('\n');
  }
  if (/organiz|plan|sesi[oó]n/.test(c)) {
    return [
      'Para diseñar tu sesión necesito tres cosas:',
      '• ¿Cuánto tiempo tienes?',
      '• ¿Qué quieres lograr al final?',
      '• ¿Hay algo que te suele distraer ahora mismo?',
      '',
      'Con eso te armo un bloque concreto, con descansos.',
    ].join('\n');
  }
  if (/cerr.*d[ií]a|cierre/.test(c)) {
    return [
      'Cerrar bien el día tiene tres partes:',
      '',
      '**Revisar.** ¿Qué cumpliste? Tachar es ritual.',
      '**Soltar.** ¿Qué quedó pendiente? Anótalo para mañana, libera la mente.',
      '**Agradecer.** Una cosa, aunque sea pequeña.',
      '',
      'Te tomará 4 minutos. Vale cada uno.',
    ].join('\n');
  }
  if (/rutina/.test(c)) {
    return [
      'Rutina de 5 minutos para reactivar:',
      '',
      '• 1 min — caminar o estirar el cuello',
      '• 1 min — respirar 4-7-8 (3 ciclos)',
      '• 2 min — agua + lavarte la cara',
      '• 1 min — escribir la siguiente acción concreta',
      '',
      'Listo. Vuelve aquí cuando termines.',
    ].join('\n');
  }
  if (/contenido|libro|recomiend/.test(c)) {
    return [
      'Para recomendarte bien necesito saber: ¿quieres algo para enfocarte mientras trabajas, o para cerrar el día?',
      '',
      'Tip: en la sección Explorar tienes audiolibros y meditaciones marcadas como "Mentex sugiere".',
    ].join('\n');
  }
  // Default
  return [
    'Te escucho. Cuéntame un poco más sobre lo que necesitas — entre más concreto, mejor te puedo ayudar.',
    '',
    'Si quieres, podemos empezar por un paso pequeño y construir desde ahí.',
  ].join('\n');
}

// Reproduce el ciclo reasoning → streaming → done sobre un mensaje existente.
//
// B11 (Sprint A.6): delega al __mtxCoachEngine si está disponible (motor
// multi-turn con regenerate/stop/continue/context-awareness). Si el engine
// no está cargado (carga async de Babel-standalone), cae al flow legacy
// inline para no romper el chat.
//
// El flag _alive sigue siendo el contract caller→callee: el componente que
// ejecuta este flow puede unmount y la cancelación se respeta. El engine
// también expone cancel(msgId) que puede ser invocado desde botón Stop UI.
function _runMockResponse(convId, msgId, userContent, _alive) {
  var store = window.__mtxIAChat;
  if (!store) return;

  // ── B11 — motor multi-turn con context awareness ──────────────────────
  if (window.__mtxCoachEngine && typeof window.__mtxCoachEngine.generate === 'function') {
    var handle = window.__mtxCoachEngine.generate({
      convId: convId,
      msgId: msgId,
      prompt: userContent,
      mode: 'fresh',
    });
    // Polling de _alive: si el caller marca unmount, cancelamos el stream
    // del engine. Sin esto, el engine seguiría streamando texto a un
    // mensaje que el caller dejó de monitorear.
    var aliveCheckId = setInterval(function() {
      if (!_alive()) {
        clearInterval(aliveCheckId);
        if (handle && handle.cancel) handle.cancel();
      } else if (!window.__mtxCoachEngine.isActive(msgId)) {
        // Stream completó solo → liberamos el check
        clearInterval(aliveCheckId);
      }
    }, 200);
    return;
  }

  // ── Fallback legacy (engine no cargado): flow original conservado ──────
  // Si por alguna razón el engine no está disponible, mantenemos el flow
  // original con simulator + setInterval inline. Garantiza que el chat
  // nunca queda mudo.
  var simulator = window.__mtxCoachSimulator;
  var simulatorScenario = simulator ? simulator.detect(userContent) : null;

  if (simulatorScenario && simulator) {
    simulator.run({
      store: store,
      convId: convId,
      msgId: msgId,
      scenario: simulatorScenario,
      userContent: userContent,
      _alive: _alive,
      onComplete: function(replyText, artifact, steps) {
        if (!_alive()) return;
        store.updateMessage(convId, msgId, { state: 'streaming', content: '' });
        var i = 0;
        var streamId = setInterval(function() {
          if (!_alive()) { clearInterval(streamId); return; }
          var step = /[.!?\n]/.test(replyText[i]) ? 5 : 3;
          i = Math.min(replyText.length, i + step);
          store.updateMessage(convId, msgId, { content: replyText.slice(0, i) });
          if (i >= replyText.length) {
            clearInterval(streamId);
            var patch = { state: 'done' };
            if (artifact) patch.artifacts = [artifact];
            store.updateMessage(convId, msgId, patch);
          }
        }, 22);
      },
    });
    return;
  }

  store.updateMessage(convId, msgId, { state: 'reasoning' });
  var artifact = _detectArtifactFromUser(userContent);
  var artifactReply = artifact ? _replyForArtifact(artifact) : null;

  setTimeout(function() {
    if (!_alive()) return;
    var fullText = artifactReply || _mockAssistantReply(userContent);
    var i = 0;
    store.updateMessage(convId, msgId, { state: 'streaming', content: '' });
    var streamId = setInterval(function() {
      if (!_alive()) { clearInterval(streamId); return; }
      var step = /[.!?\n]/.test(fullText[i]) ? 5 : 3;
      i = Math.min(fullText.length, i + step);
      store.updateMessage(convId, msgId, { content: fullText.slice(0, i) });
      if (i >= fullText.length) {
        clearInterval(streamId);
        var patch = { state: 'done' };
        if (artifact) patch.artifacts = [artifact];
        store.updateMessage(convId, msgId, patch);
      }
    }, 22);
  }, 600);
}


// ── IconButton — botón circular del header con icon + badge opcional ────────
function IAIconButton(props) {
  var children = props.children;
  var ariaLabel = props['aria-label'];
  var onClick = props.onClick;
  var badge = props.badge;
  var size = props.size || 36;
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className="mtx-tap"
      style={{
        position: 'relative',
        width: size, height: size, borderRadius: 999,
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        color: 'var(--ink-1)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
        transition: 'background .2s, border-color .2s, transform .2s',
      }}
    >
      {children}
      {badge != null && badge > 0 && (
        <span style={{
          position: 'absolute', top: -3, right: -3,
          minWidth: 16, height: 16, padding: '0 4px',
          borderRadius: 999,
          background: 'var(--neon)',
          color: '#0a1410',
          fontSize: 9, fontWeight: 700,
          fontFamily: 'var(--ff-sans)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          letterSpacing: '-0.005em',
          boxShadow: '0 0 0 1.5px rgba(10,13,12,0.95)',
        }}>{badge > 99 ? '99+' : badge}</span>
      )}
    </button>
  );
}


// ── IAHeader — header sticky con icon row + título conversación / hero ──────
// Empty state: solo el icon row visible (el hero vive abajo en el body).
// Active conversation: icon row + título compacto centrado tappable (rename).
function IAHeader(props) {
  var onTasks = props.onTasks;
  var current = props.current;
  var conversationCount = props.conversationCount;
  var onHistory = props.onHistory;
  var onAgenda = props.onAgenda;
  var onNewChat = props.onNewChat;
  var onSettings = props.onSettings;
  var onRename = props.onRename;
  var hasCurrent = !!current;

  return (
    <div style={{
      flexShrink: 0,
      // paddingTop 60 para clearear la status bar + dynamic island del iPhone
      // frame (mismo valor que usan explore-flow/community-flow al tope).
      paddingTop: 60,
      // Gradient mask sutil — el body scrollea bajo este header así que los
      // mensajes que pasan por debajo se difuminan en el borde inferior.
      background: 'linear-gradient(180deg, rgba(10,13,12,0.96) 0%, rgba(10,13,12,0.85) 80%, rgba(10,13,12,0.6) 100%)',
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      borderBottom: '0.5px solid rgba(255,255,255,0.04)',
    }}>
      {/* Icon row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: hasCurrent ? '0 16px 8px' : '0 16px 12px',
      }}>
        <IAIconButton aria-label="Historial de conversaciones" onClick={onHistory}
          badge={conversationCount > 0 ? conversationCount : null}>
          <IcList size={16} stroke="currentColor" strokeWidth={1.7}/>
        </IAIconButton>
        {/* RFC-001 Addendum A · A5 — Cost meter chip (sutil, junto a History) */}
        {window.CoachCostMeter && <window.CoachCostMeter/>}
        <div style={{ flex: 1 }}/>
        {/* Fase 2.4: Tasks icon — actividad del coach (active/pending/scheduled/history).
            Componente window.IATasksIcon vive en screens/ia-tasks.jsx con su propio
            badge dinámico (pending count amber o active running dot neon). */}
        {/* Agenda extraída del IA (ahora vive en Home header) — el coach no
            necesita botón propio porque la agenda es global, no de la sesión. */}
        {window.IATasksIcon && <window.IATasksIcon onClick={onTasks}/>}
        <IAIconButton aria-label="Nueva conversación" onClick={onNewChat}>
          <IcPlus size={16} stroke="currentColor" strokeWidth={2}/>
        </IAIconButton>
        <IAIconButton aria-label="Configuración del asistente" onClick={onSettings}>
          <IcSettings size={15} stroke="currentColor" strokeWidth={1.6}/>
        </IAIconButton>
      </div>

      {/* Título de la conversación actual (solo cuando hay una activa).
          Tap → rename via prompt nativo. Ellipsis si excede ancho. */}
      {hasCurrent && (
        <div style={{ padding: '0 16px 10px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onRename}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              maxWidth: '100%',
              padding: '6px 14px', borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'var(--ink-1)',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.01em',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'background .2s, border-color .2s',
            }}>
            <span style={{
              maxWidth: 240,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{current.title}</span>
            <IcChevD size={11} stroke="var(--ink-3)" strokeWidth={1.8}/>
          </button>
        </div>
      )}
    </div>
  );
}


// ── IAEmptyHero — bloque hero del empty state (avatar + nombre + tagline) ───
function IAEmptyHero(props) {
  var agentEmoji = props.agentEmoji || '🌿';
  var agentName = props.agentName || 'Coach Mentex';
  return (
    <div style={{
      padding: '20px 20px 28px',
      textAlign: 'center',
      animation: 'mtx-fade-up .45s ease both',
    }}>
      {/* Avatar grande con halo radial neon */}
      <div style={{
        width: 92, height: 92, borderRadius: '50%',
        margin: '0 auto 16px',
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(61,255,209,0.22), rgba(61,255,209,0.05) 60%, rgba(155,138,255,0.12))',
        border: '0.5px solid rgba(61,255,209,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 44, lineHeight: 1,
        boxShadow: '0 0 0 1px rgba(61,255,209,0.10), 0 18px 40px -12px rgba(61,255,209,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        <div style={{
          position: 'absolute', inset: -16, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, rgba(61,255,209,0.25), transparent 65%)',
          filter: 'blur(18px)', pointerEvents: 'none',
          transform: 'translateZ(0)', willChange: 'transform',
          zIndex: -1,
        }}/>
        <span role="img" aria-label="Avatar del coach">{agentEmoji}</span>
      </div>

      <div className="mtx-eyebrow" style={{
        fontSize: 9.5, marginBottom: 6,
        color: 'var(--neon)',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: 999,
          background: 'var(--neon)',
          boxShadow: '0 0 6px rgba(61,255,209,0.7)',
          animation: 'mtx-pulse 2s ease-in-out infinite',
          willChange: 'transform, opacity',
        }}/>
        En línea
      </div>

      <h1 style={{
        margin: 0, fontSize: 24, fontWeight: 700,
        color: 'var(--ink-1)', letterSpacing: '-0.025em', lineHeight: 1.15,
        fontFamily: 'var(--ff-sans)',
      }}>{agentName}</h1>

      <p style={{
        margin: '6px auto 0', maxWidth: 280,
        fontSize: 13, color: 'var(--ink-3)',
        lineHeight: 1.45, letterSpacing: '-0.005em',
      }}>
        Tu asistente para enfocarte, reflexionar y crecer. Escríbeme o elige algo para empezar.
      </p>
    </div>
  );
}


// ── IAQuickStartChip — chip individual de la lista por categoría ────────────
function IAQuickStartChip(props) {
  var label = props.label;
  var accent = props.accent;
  var onClick = props.onClick;
  return (
    <button
      onClick={onClick}
      className="mtx-tap"
      style={{
        appearance: 'none', cursor: 'pointer', textAlign: 'left',
        width: '100%',
        padding: '11px 14px', borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        color: 'var(--ink-1)',
        fontSize: 13, fontWeight: 500,
        fontFamily: 'var(--ff-sans)',
        letterSpacing: '-0.005em',
        display: 'flex', alignItems: 'center', gap: 10,
        transition: 'background .25s, border-color .25s, transform .2s',
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: 999,
        background: accent,
        boxShadow: '0 0 6px ' + accent + '99',
        flexShrink: 0,
      }}/>
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
      <IcChevR size={12} stroke="var(--ink-4)" strokeWidth={1.8}/>
    </button>
  );
}


// ── IAQuickStartCategory — card de una categoría con sus chips ──────────────
function IAQuickStartCategory(props) {
  var category = props.category;
  var onChipTap = props.onChipTap;
  var Ic = category.Ic;
  return (
    <div className="mtx-glass" style={{
      padding: 12, borderRadius: 18,
      animation: 'mtx-fade-up .4s ease both',
      animationDelay: (props.delay || 0) + 'ms',
    }}>
      {/* Header de categoría */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '2px 4px 10px',
      }}>
        {Ic && (
          <div style={{
            width: 26, height: 26, borderRadius: 8,
            background: 'linear-gradient(135deg, ' + category.accent + '26, ' + category.accent + '06)',
            border: '0.5px solid ' + category.accent + '40',
            color: category.accent,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Ic size={13} stroke="currentColor" strokeWidth={1.7}/>
          </div>
        )}
        <div className="mtx-eyebrow" style={{
          fontSize: 9.5, color: category.accent, letterSpacing: '0.16em',
        }}>{category.label}</div>
      </div>

      {/* Chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {category.chips.map(function(chip) {
          return (
            <IAQuickStartChip
              key={chip.id}
              label={chip.label}
              accent={category.accent}
              onClick={function() { onChipTap(chip); }}
            />
          );
        })}
      </div>
    </div>
  );
}


// ── IAEmptyState — wrapper del empty state (hero + chips) ───────────────────
function IAEmptyState(props) {
  var onChipTap = props.onChipTap;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <IAEmptyHero/>

      {/* Subtle divider con texto */}
      <div style={{
        padding: '0 20px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1, height: 0.5, background: 'rgba(255,255,255,0.08)' }}/>
        <span className="mtx-eyebrow" style={{ fontSize: 9, color: 'var(--ink-4)' }}>
          O empieza con
        </span>
        <div style={{ flex: 1, height: 0.5, background: 'rgba(255,255,255,0.08)' }}/>
      </div>

      <div style={{
        padding: '0 16px 12px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {_IA_QUICK_START.map(function(cat, i) {
          return (
            <IAQuickStartCategory
              key={cat.id}
              category={cat}
              onChipTap={onChipTap}
              delay={60 + i * 50}
            />
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// B11 — IAUserMessageBubble: bubble del user EDITABLE
// ═══════════════════════════════════════════════════════════════════════════
// Replica patrón Claude/ChatGPT: tap en el bubble propio abre modo edición
// inline. Save → engine.editUserMessage() → fork del chat (trunca y regenera).
// Cancel → vuelve al state original sin cambios.
//
// Affordance del icono pencil aparece al hover (desktop) o siempre sutil
// (mobile). El edit no es destructivo: si cancelas, el contenido original
// queda intacto. Replicamos el feedback visual de los grandes:
//   • Hover: ligera elevation + pencil icon
//   • Editing: textarea con autoFocus + Save/Cancel buttons
//   • Saved: animación mt-fade-up del nuevo bubble + assistant regenerado
function IAUserMessageBubble(props) {
  var msg = props.msg;
  var convId = props.convId;
  var editingState = React.useState(false);
  var editing = editingState[0]; var setEditing = editingState[1];
  var draftState = React.useState(msg.content || '');
  var draft = draftState[0]; var setDraft = draftState[1];
  var textareaRef = React.useRef(null);
  var hoverState = React.useState(false);
  var hover = hoverState[0]; var setHover = hoverState[1];

  // Cuando cambia el msg externamente (regenerate, edit que viene de otro
  // bubble en la misma conv) — re-sincroniza el draft.
  React.useEffect(function() {
    if (!editing) setDraft(msg.content || '');
  }, [msg.content, editing]);

  // Autofocus al entrar a edit
  React.useEffect(function() {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      // Posiciona el cursor al final
      var len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  function startEdit() {
    if (!window.__mtxCoachEngine) return; // no engine → no edit (degrada)
    setDraft(msg.content || '');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(msg.content || '');
  }

  function saveEdit() {
    var newContent = String(draft || '').trim();
    if (!newContent) { cancelEdit(); return; }
    if (newContent === msg.content) { cancelEdit(); return; }
    if (window.__mtxCoachEngine && window.__mtxCoachEngine.editUserMessage) {
      window.__mtxCoachEngine.editUserMessage(convId, msg.id, newContent);
    }
    setEditing(false);
  }

  function handleKeyDown(e) {
    // Cmd/Ctrl+Enter → save (rápido)
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
      return;
    }
    // Escape → cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
      return;
    }
    // Enter solo → newline (NO save — patrón Claude/ChatGPT)
  }

  if (editing) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'flex-end',
        padding: '0 16px 10px',
        animation: 'mtx-fade-up .2s ease both',
      }}>
        <div style={{
          maxWidth: '92%', width: '92%',
          padding: '10px 14px', borderRadius: 18,
          borderBottomRightRadius: 6,
          background: 'linear-gradient(135deg, rgba(61,255,209,0.13), rgba(61,255,209,0.04))',
          border: '0.5px solid rgba(61,255,209,0.32)',
          boxShadow: '0 8px 20px -12px rgba(61,255,209,0.32)',
        }}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={function(e) { setDraft(e.target.value); }}
            onKeyDown={handleKeyDown}
            rows={Math.min(8, Math.max(2, draft.split('\n').length))}
            aria-label="Editar tu mensaje"
            style={{
              width: '100%', minHeight: 60,
              background: 'transparent', border: 0, outline: 'none',
              color: 'var(--ink-1)',
              fontSize: 13.5, lineHeight: 1.45,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              resize: 'none',
            }}/>
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            marginTop: 8, paddingTop: 8,
            borderTop: '0.5px solid rgba(61,255,209,0.16)',
          }}>
            <button
              type="button"
              onClick={cancelEdit}
              className="mtx-tap"
              aria-label="Cancelar edición"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '5px 12px', borderRadius: 999,
                background: 'transparent',
                border: '0.5px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.65)',
                fontSize: 11.5, fontWeight: 500,
                fontFamily: 'var(--ff-sans)',
              }}>Cancelar</button>
            <button
              type="button"
              onClick={saveEdit}
              className="mtx-tap"
              aria-label="Guardar edición y regenerar respuesta"
              disabled={!draft.trim() || draft.trim() === (msg.content || '').trim()}
              style={{
                appearance: 'none',
                cursor: (!draft.trim() || draft.trim() === (msg.content || '').trim()) ? 'not-allowed' : 'pointer',
                padding: '5px 14px', borderRadius: 999,
                background: 'rgba(61,255,209,0.18)',
                border: '0.5px solid rgba(61,255,209,0.38)',
                color: 'rgba(220,255,245,0.95)',
                fontSize: 11.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                opacity: (!draft.trim() || draft.trim() === (msg.content || '').trim()) ? 0.4 : 1,
                transition: 'opacity .15s',
              }}>Guardar y regenerar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end',
      padding: '0 16px 10px',
      animation: 'mtx-fade-up .25s ease both',
      position: 'relative',
    }}
    onMouseEnter={function() { setHover(true); }}
    onMouseLeave={function() { setHover(false); }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 6,
        maxWidth: '88%',
      }}>
        {/* Edit pencil — solo si engine activo. Visible siempre sutil en mobile,
            hover-only en desktop. Tap → entra a modo edit. */}
        {window.__mtxCoachEngine && (
          <button
            type="button"
            onClick={startEdit}
            className="mtx-tap"
            aria-label="Editar mensaje"
            style={{
              appearance: 'none', cursor: 'pointer',
              alignSelf: 'center',
              width: 24, height: 24, borderRadius: 999,
              background: hover ? 'rgba(61,255,209,0.10)' : 'transparent',
              border: '0.5px solid ' + (hover ? 'rgba(61,255,209,0.28)' : 'transparent'),
              color: hover ? 'rgba(61,255,209,0.85)' : 'rgba(255,255,255,0.30)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              opacity: hover ? 1 : 0.6,
              transition: 'opacity .18s, background .18s, border-color .18s, color .18s',
            }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"/>
            </svg>
          </button>
        )}
        <div style={{
          padding: '10px 14px', borderRadius: 18,
          borderBottomRightRadius: 6,
          background: 'linear-gradient(135deg, rgba(61,255,209,0.09), rgba(61,255,209,0.03))',
          border: '0.5px solid rgba(61,255,209,0.16)',
          color: 'var(--ink-1)',
          fontSize: 13.5, lineHeight: 1.45,
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          boxShadow: '0 6px 14px -10px rgba(61,255,209,0.18)',
        }}>
          {msg.content}
          {msg.editedAt && (
            <span style={{
              display: 'block', marginTop: 4,
              fontSize: 10, color: 'rgba(255,255,255,0.32)',
              fontStyle: 'italic',
              fontFamily: 'var(--ff-sans)',
            }}>editado</span>
          )}
        </div>
      </div>
    </div>
  );
}


// ── IAMessageBubble — render de un mensaje (user o assistant) ──────────────
// Estados visuales:
//   • role=user: bubble derecha, fondo neon-tint (delegado a IAUserMessageBubble)
//   • role=assistant + state=reasoning: bubble izquierda con typing dots
//   • role=assistant + state=streaming: bubble izquierda con texto + cursor
//   • role=assistant + state=done: bubble izquierda con texto plano
//   • role=assistant + state=error: bubble izquierda en tono rojo + retry CTA
function IAMessageBubble(props) {
  var msg = props.msg;
  var isUser = msg.role === 'user';
  var state = msg.state || 'done';

  if (isUser) {
    return <IAUserMessageBubble msg={msg} convId={props.convId}/>;
  }

  // Assistant — columna flex con bubble (texto+chips) + artifacts como siblings.
  // Bubble se mantiene compacto (max ~88% del column), pero artifacts ocupan
  // todo el ancho disponible para tener espacio sin competir con el texto.
  //
  // B4 (Sprint A.6) — algunos artifacts son LIVE durante 'reasoning' (no esperan
  // a done). Ej: thinking_panel con state='thinking' debe verse mientras el
  // coach está pensando. Cada artifact "live-capable" se marca aquí:
  var artifacts = Array.isArray(msg.artifacts) ? msg.artifacts : [];
  function _isLiveCapable(a) {
    if (!a || !a.kind) return false;
    // Lista de artifacts que pueden renderizar durante reasoning/streaming
    if (a.kind === 'thinking_panel' && a.state === 'thinking') return true;
    // B5 REFACTOR: browse_progress_card en estado live también renderiza
    // mientras el msg está en reasoning (el card es el contenedor del flow).
    if (a.kind === 'browse_progress_card' && (a.state === 'live' || a.state === 'cancelled')) return true;
    return false;
  }
  var hasArtifacts = artifacts.length > 0 && (
    state === 'done' || artifacts.some(_isLiveCapable)
  );

  // RFC-001 §5.1 — steps del timeline si los hay
  // Reglas:
  //   • Si state === 'reasoning', el timeline tiene prioridad (suplanta TypingDots).
  //   • Si state === 'done' y todos los steps están done/cancelled, mostramos
  //     el timeline ANTES del content del bubble (como contexto del trabajo).
  //   • Si state === 'done' y no hay steps, ocultamos timeline (fallback al texto solo).
  var steps = Array.isArray(msg.steps) ? msg.steps : [];
  var hasSteps = steps.length > 0;
  // Sólo NO mostramos timeline si hay exactamente 1 step en done con duración <800ms
  // (caída a respuesta directa sin trabajo visible).
  var shouldShowTimeline = hasSteps && !(
    steps.length === 1 &&
    steps[0].status === 'done' &&
    steps[0].startedAt && steps[0].completedAt &&
    (steps[0].completedAt - steps[0].startedAt) < 800
  );

  return (
    <div style={{
      // Manus-style layout: avatar+nombre arriba como header row, content debajo
      // alineado bajo el nombre (no a la derecha del avatar). Se siente más como
      // un mensaje firmado que un chat de IM.
      display: 'flex', flexDirection: 'column',
      padding: '0 16px 18px',
      gap: 10,
      animation: 'mtx-fade-up .3s ease both',
    }}>
      {/* Coach header row: avatar circular pequeño + nombre lowercase + chip "Coach" */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: -2,  // visual tightening al primer elemento del content
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(61,255,209,0.28), rgba(155,138,255,0.12))',
          border: '0.5px solid rgba(61,255,209,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, lineHeight: 1,
          boxShadow: '0 2px 6px -2px rgba(61,255,209,0.30)',
        }}>
          <span role="img" aria-hidden="true">🌿</span>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: 'var(--ink-1)',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
        }}>mentex</span>
        <span style={{
          padding: '1.5px 7px',
          borderRadius: 999,
          border: '0.5px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.025)',
          fontSize: 9.5, fontWeight: 600,
          color: 'rgba(255,255,255,0.55)',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '0.02em',
        }}>Coach</span>
      </div>

      {/* Content column: timeline + bubble + artifacts + sugerencias.
          paddingLeft = avatar_size (22) + gap (8) = 30 — alinea con el texto
          del nombre del coach (visual hang). */}
      <div style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column', gap: 10,
        paddingLeft: 30,
      }}>
        {/* Wrapper para mantener compat con el código existente que asume
            este nivel de anidamiento (timeline + bubble + artifacts). */}
        {(function() { return null; })()}
        {/* RFC-001 §5.1 — CoachTimeline FUERA del bubble, alineado al inicio
            del column (después del avatar). Se muestra cuando hay steps que
            agreguen valor visible (>1 step, o step >800ms, o state==='reasoning'
            con steps active). Caída elegante a TypingDots si no hay steps. */}
        {shouldShowTimeline && typeof window !== 'undefined' && window.CoachTimeline && (
          <div style={{
            alignSelf: 'stretch',
            padding: '4px 2px 2px',
            marginBottom: state === 'done' ? 2 : 6,
          }}>
            <window.CoachTimeline
              steps={steps}
              sessionId={msg.id}
            />
          </div>
        )}

        {/* Text bubble — compacto. Solo se muestra si hay content que mostrar
            (cuando state==='reasoning' sin steps, los TypingDots viven aquí;
            cuando hay steps con state==='reasoning', el timeline los reemplaza). */}
        {(state !== 'reasoning' || !shouldShowTimeline) && (
        <div style={{
          alignSelf: 'flex-start',
          maxWidth: '92%',
          padding: '10px 14px', borderRadius: 18,
          borderBottomLeftRadius: 6,
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          color: 'var(--ink-1)',
          fontSize: 13.5, lineHeight: 1.5,
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {state === 'reasoning' && <IATypingDots/>}
          {state === 'streaming' && (
            <span>
              {msg.content}
              <span style={{
                display: 'inline-block',
                width: 7, height: 14, marginLeft: 2,
                background: 'var(--neon)',
                borderRadius: 1,
                verticalAlign: 'text-bottom',
                animation: 'mtx-pulse 1s ease-in-out infinite',
                willChange: 'opacity',
              }}/>
            </span>
          )}
          {state === 'done' && msg.content}
          {state === 'error' && (
            <div style={{ color: '#ff8b8b' }}>
              Algo se interrumpió. Vuelve a intentar.
            </div>
          )}

          {/* RFC-001 Addendum A · A8 — Feedback inline (👍/👎) en mensajes done */}
          {state === 'done' && window.CoachMessageFeedback && msg.role === 'assistant' && props.convId && (
            <window.CoachMessageFeedback msg={msg} convId={props.convId}/>
          )}
        </div>
        )}

        {/* B11 — Action row: Regenerate · Continue · Stop. Solo en assistant.
            Vive fuera del bubble (sibling) para no apretar el texto.
            Visible siempre que el engine esté cargado (gates internos del
            componente filtran por state). */}
        {msg.role === 'assistant' && props.convId && (
          <CoachMessageActions msg={msg} convId={props.convId}/>
        )}

        {/* Artifacts — FUERA del bubble, full width del column.
            Image, Voice, Content card, Calendar, Reminder, Plan, Confirmation, Recommendation.
            Componentes en screens/ia-artifacts.jsx (window.IAArtifact). */}
        {hasArtifacts && window.IAArtifact && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            alignSelf: 'stretch',
          }}>
            {artifacts.map(function(art, i) {
              return <window.IAArtifact key={i} artifact={art} msgId={msg.id}/>;
            })}
          </div>
        )}

        {/* "Para seguir" — sección de follow-ups estilo Manus AI.
            FUERA del bubble (no atado al texto), lista vertical de CTAs con
            icon 💬 + texto + chevron →. Más prominente que los chips inline
            anteriores; le da peso a la próxima acción posible sin saturar.
            Tap dispara mtx:ia-chip-tap (consumido por IAScreen para llenar el
            draft del input). */}
        {Array.isArray(msg.chips) && msg.chips.length > 0 && state === 'done' && (
          <div style={{
            marginTop: 4,
            paddingTop: 4,
          }}>
            <div style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.32)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.02em',
              marginBottom: 8,
              paddingLeft: 2,
              fontWeight: 500,
            }}>Para seguir</div>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {msg.chips.map(function(chip, i) {
                return (
                  <button
                    key={chip + '-' + i}
                    onClick={function() {
                      window.dispatchEvent(new CustomEvent('mtx:ia-chip-tap', {
                        detail: { label: chip },
                      }));
                    }}
                    onKeyDown={function(e) {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        window.dispatchEvent(new CustomEvent('mtx:ia-chip-tap', {
                          detail: { label: chip },
                        }));
                      }
                    }}
                    className="mtx-tap"
                    aria-label={'Sugerencia · ' + chip}
                    style={{
                      appearance: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%',
                      padding: '10px 12px', borderRadius: 11,
                      border: '0.5px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.018)',
                      color: 'var(--ink-1)',
                      fontSize: 12.5, fontWeight: 500,
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                      textAlign: 'left',
                      transition: 'background .18s ease, border-color .18s ease, transform .12s ease',
                    }}
                    onMouseEnter={function(e) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                    }}
                    onMouseLeave={function(e) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.018)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    }}>
                    {/* Icon: chat bubble outline minimalista */}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="rgba(255,255,255,0.45)" strokeWidth="1.6"
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                      aria-hidden="true">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                    <span style={{
                      flex: 1, minWidth: 0,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{chip}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="rgba(255,255,255,0.35)" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                      aria-hidden="true">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// B11 — Action row del bubble del coach (Regenerate / Continue / Stop)
// ═══════════════════════════════════════════════════════════════════════════
// Aparece BAJO el bubble del coach cuando msg.state === 'done' (regenerate +
// continue) o cuando state === 'streaming'/'reasoning' (stop). Ultraminimalista
// — iconos 11px en row horizontal con label visible solo en hover/focus.
//
// Acciones:
//   • Stop ⏹     — visible durante reasoning/streaming. Cancela el stream del
//                  motor y marca el mensaje como [detenido].
//   • Regenerate ↻ — visible cuando state==='done'. Re-genera con seed+1
//                    para producir una variación distinta del reply.
//   • Continue ⤺  — visible cuando state==='done' Y msg.wasStopped Y el reply
//                    quedó truncado. Reanuda desde donde se cortó.
function CoachMessageActions(props) {
  var msg = props.msg;
  var convId = props.convId;
  var state = msg.state || 'done';
  var engine = (typeof window !== 'undefined') ? window.__mtxCoachEngine : null;
  if (!engine) return null;

  var isStreaming = state === 'reasoning' || state === 'streaming';
  var isDone = state === 'done';
  var canContinue = isDone && msg.wasStopped;

  function handleStop(e) {
    e.stopPropagation();
    engine.cancel(msg.id);
  }
  function handleRegenerate(e) {
    e.stopPropagation();
    engine.regenerate(convId, msg.id);
  }
  function handleContinue(e) {
    e.stopPropagation();
    engine.continueMsg(convId, msg.id);
  }

  // Botón base — circular ghost minimalista
  function ActionBtn(opts) {
    var hoverState = React.useState(false);
    var isHover = hoverState[0]; var setHover = hoverState[1];
    return (
      <button
        type="button"
        onClick={opts.onClick}
        onMouseEnter={function() { setHover(true); }}
        onMouseLeave={function() { setHover(false); }}
        onFocus={function() { setHover(true); }}
        onBlur={function() { setHover(false); }}
        aria-label={opts.label}
        className="mtx-tap"
        style={{
          appearance: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 9px', borderRadius: 999,
          background: isHover ? 'rgba(255,255,255,0.06)' : 'transparent',
          border: '0.5px solid ' + (isHover ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)'),
          color: opts.tint || 'rgba(255,255,255,0.55)',
          cursor: 'pointer',
          fontSize: 10.5, fontWeight: 500,
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
          transition: 'background .18s ease, color .18s ease, border-color .18s ease',
        }}>
        {opts.icon}
        <span>{opts.label}</span>
      </button>
    );
  }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6,
      marginTop: 6,
      animation: 'mtx-fade-up .25s ease both',
    }}>
      {isStreaming && (
        <ActionBtn
          onClick={handleStop}
          label="Detener"
          tint="rgba(255,160,160,0.75)"
          icon={
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="1.5"/>
            </svg>
          }
        />
      )}
      {isDone && (
        <ActionBtn
          onClick={handleRegenerate}
          label="Regenerar"
          icon={
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          }
        />
      )}
      {canContinue && (
        <ActionBtn
          onClick={handleContinue}
          label="Continuar"
          tint="rgba(61,255,209,0.75)"
          icon={
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          }
        />
      )}
    </div>
  );
}


// ── IATypingDots — 3 dots animados para el reasoning state ──────────────────
function IATypingDots() {
  var dot = function(delay) {
    return {
      width: 6, height: 6, borderRadius: 999,
      background: 'var(--ink-3)',
      animation: 'mtx-pulse 1.2s ease-in-out infinite',
      animationDelay: delay,
      willChange: 'transform, opacity',
    };
  };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 0' }}>
      <div style={dot('0s')}/>
      <div style={dot('0.18s')}/>
      <div style={dot('0.36s')}/>
    </div>
  );
}


// ── IAMessages — lista de mensajes de la conversación actual ────────────────
function IAMessages(props) {
  var messages = props.messages || [];
  var convId = props.convId;
  var rootRef = React.useRef(null);

  // Auto-scroll al fondo. CRÍTICO: scrollear MANUALMENTE el contenedor con
  // overflowY:auto que envuelve el listado (el body de IAScreen). NO usar
  // scrollIntoView — propaga el scroll a TODOS los ancestors scrolleables,
  // incluyendo el iPhone frame outer scroll, lo que mueve la pantalla
  // entera hacia arriba dejando header y status bar fuera de vista.
  var len = messages.length;
  var lastContentLen = (messages[len - 1] && messages[len - 1].content && messages[len - 1].content.length) || 0;
  React.useEffect(function() {
    var node = rootRef.current;
    if (!node) return;
    // Encuentra el ancestro con overflowY auto (el body de IAScreen) y
    // setea su scrollTop al máximo. No toca el outer scroll del iPhone.
    var p = node.parentElement;
    while (p) {
      var cs = getComputedStyle(p);
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
        p.scrollTop = p.scrollHeight;
        break;
      }
      p = p.parentElement;
    }
  }, [len, lastContentLen]);

  return (
    // paddingTop:18 para que el primer mensaje no quede pegado al header
    // del chat (antes con paddingTop:4 se sentía apretado al título).
    <div ref={rootRef} style={{ paddingTop: 18, paddingBottom: 8 }}>
      {messages.map(function(msg) {
        return <IAMessageBubble key={msg.id} msg={msg} convId={convId}/>;
      })}
    </div>
  );
}


// ── IAInputBar — input con auto-resize textarea + 4 botones ─────────────────
// Comportamiento:
//   • Textarea crece dinámicamente con el contenido (max 6 líneas, después
//     scroll interno). NUNCA crece arriba del max-height definido.
//   • Cmd/Ctrl+Enter envía. Enter solo agrega newline.
//   • Send button habilitado solo si hay contenido (trim no vacío).
//   • Upload y voice son stubs en Fase 1 — toast "Próximamente" para indicar
//     intención sin engañar al user.
function IAInputBar(props) {
  var value = props.value;
  var onChange = props.onChange;
  var onSend = props.onSend;
  var onUpload = props.onUpload;
  var onVoice = props.onVoice;
  var disabled = props.disabled;
  var textareaRef = props.textareaRef;
  var canSend = !disabled && value.trim().length > 0;

  // Auto-resize: efecto en cada cambio de value
  React.useEffect(function() {
    var t = textareaRef && textareaRef.current;
    if (!t) return;
    t.style.height = 'auto';
    var newH = Math.min(t.scrollHeight, 132);   // ~6 líneas a fontSize 14
    t.style.height = newH + 'px';
    // Cuando excede el max, habilitamos el scroll interno
    t.style.overflowY = t.scrollHeight > 132 ? 'auto' : 'hidden';
  }, [value, textareaRef]);

  var handleKeyDown = function(e) {
    // Cmd/Ctrl+Enter envía. Enter solo: newline natural.
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  // C12 Sprint A.7 — cursor position tracking para slash autocomplete
  var cursorPosState = React.useState(0);
  var cursorPos = cursorPosState[0]; var setCursorPos = cursorPosState[1];
  var slashClosedAtState = React.useState(-1);
  var slashClosedAt = slashClosedAtState[0]; var setSlashClosedAt = slashClosedAtState[1];

  // Update cursor pos en cualquier interacción del textarea
  function syncCursor() {
    var t = textareaRef && textareaRef.current;
    if (t) setCursorPos(t.selectionStart || 0);
  }

  // Cuando user borra/cambia mucho el texto, reset el "closed" anchor para
  // que vuelva a aparecer el popup en un nuevo slash.
  React.useEffect(function() {
    if (slashClosedAt >= 0 && (slashClosedAt > value.length || value.charAt(slashClosedAt) !== '/')) {
      setSlashClosedAt(-1);
    }
  }, [value, slashClosedAt]);

  // Helper: el popup pregunta esto para saber si debe renderizarse.
  // Si user cerró el popup en un slash específico, no lo abrimos de nuevo
  // hasta que el slash cambie o desaparezca.
  function getSlashMatchOrNull() {
    if (typeof window === 'undefined' || !window.__mtxSlashCommands) return null;
    var m = window.__mtxSlashCommands.match(value, cursorPos);
    if (!m) return null;
    if (m.anchor === slashClosedAt) return null;
    return m;
  }

  function handleSlashReplace(newText, newCursor) {
    onChange(newText);
    setSlashClosedAt(-1);
    // Re-focus + set cursor + bump cursor state
    setTimeout(function() {
      var t = textareaRef && textareaRef.current;
      if (t) {
        t.focus();
        try { t.setSelectionRange(newCursor, newCursor); } catch (_) {}
        setCursorPos(newCursor);
      }
    }, 0);
  }

  function handleSlashClose() {
    // Marca el anchor del slash actual como "cerrado" para no re-abrir
    var m = window.__mtxSlashCommands && window.__mtxSlashCommands.match(value, cursorPos);
    if (m) setSlashClosedAt(m.anchor);
  }

  var slashMatch = getSlashMatchOrNull();

  return (
    <div style={{
      flexShrink: 0,
      // paddingBottom 38 = 34 (home indicator zone) + 4 breathing room.
      // El home indicator del iPhone (z=60, height 34) overlay los últimos
      // 34px del frame; sin este padding el input bar queda visualmente
      // pegado al fondo y parcialmente cubierto por el indicator.
      padding: '8px 12px 38px',
      background: 'linear-gradient(180deg, rgba(10,13,12,0) 0%, rgba(10,13,12,0.85) 40%, rgba(10,13,12,0.97) 100%)',
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      borderTop: '0.5px solid rgba(255,255,255,0.04)',
      position: 'relative',  // anchor para slash popup absolute
    }}>
      {/* C12 — Slash commands autocomplete popup. Vive como sibling del
          container del input, anclado al wrapper outer (position:relative).
          Solo renderiza cuando hay `/` activo en el texto. */}
      {slashMatch && window.CoachSlashAutocomplete && (
        <window.CoachSlashAutocomplete
          text={value}
          cursorPos={cursorPos}
          textareaRef={textareaRef}
          onReplace={handleSlashReplace}
          onClose={handleSlashClose}
        />
      )}
      {/* Container del input — flex column. Textarea ocupa el TOP (full
          width, alineado a la izquierda desde el primer pixel para que el
          texto empiece arriba a la izquierda — patrón ChatGPT/Claude). Los
          4 botones viven en una row INFERIOR (paperclip izquierda, mic+send
          derecha). Esto deja la zona de escritura libre y abierta sin
          sentirse encapsulada entre botones. */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 4,
        padding: '10px 14px 8px',
        borderRadius: 22,
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px -12px rgba(0,0,0,0.6)',
        transition: 'border-color .2s, background .2s',
      }}>
        {/* Textarea — full width, padding mínimo en los lados (alineado al
            container interior). Empieza arriba-izquierda. */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={function(e) { onChange(e.target.value); syncCursor(); }}
          onKeyDown={handleKeyDown}
          onKeyUp={syncCursor}
          onClick={syncCursor}
          onSelect={syncCursor}
          placeholder="Pregúntame algo o describe cómo te sientes…"
          rows={1}
          style={{
            width: '100%',
            resize: 'none', appearance: 'none', border: 0, outline: 'none',
            background: 'transparent',
            color: 'var(--ink-1)',
            fontSize: 14, lineHeight: 1.45,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            padding: '4px 0',
            maxHeight: 132,
            overflowY: 'hidden',  // Activado dinámicamente por el effect
            display: 'block',
          }}
        />

        {/* Botones row — layout C11/C3/C9 Sprint A.7:
            izquierda: [+ attach] [⚡ skills] [🧠 memory chip]
            derecha:   [🎙️ mic transcribe] [🌊 voice mode] [↑ send]
            Cada uno tiene propósito distinto y NO se solapa con otros. */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          marginTop: 2,
        }}>
          {/* C11a — Plus button (reemplaza paperclip viejo). Abre attach menu */}
          <button
            onClick={function() {
              if (window.__mtxAttachMenu) window.__mtxAttachMenu.open();
              else if (onUpload) onUpload();
            }}
            aria-label="Adjuntar archivo, foto, URL o snapshot wearable"
            className="mtx-tap"
            style={{
              width: 34, height: 34, borderRadius: 999, border: 0,
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--ink-2)',
              cursor: 'pointer', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .2s, color .2s, transform .12s',
            }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {/* C11b — Skills button. Abre skills menu con tabs Oficiales/Mías */}
          <button
            onClick={function() {
              if (window.__mtxSkillsMenu) window.__mtxSkillsMenu.open();
            }}
            aria-label="Activar una habilidad del coach"
            className="mtx-tap"
            style={{
              width: 34, height: 34, borderRadius: 999, border: 0,
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--ink-3)',
              cursor: 'pointer', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .2s, color .2s',
            }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </button>

          {/* C9 — Memory chip (count de memorias activas).
              Sutil pero presente — el moat visible vs ChatGPT/Claude.
              Tap → abre tab Memoria del IA settings. */}
          {typeof window !== 'undefined' && window.__mtxMemoryStore && (() => {
            var stats = null;
            try { stats = window.__mtxMemoryStore.stats(); } catch (_) {}
            var count = (stats && stats.active) || 0;
            if (count === 0) return null;
            return (
              <button
                onClick={function() {
                  window.dispatchEvent(new CustomEvent('mtx:open-ia-settings', {
                    detail: { tab: 'memory' },
                  }));
                }}
                aria-label={'Memoria del coach: ' + count + ' hechos sobre ti. Tap para ver.'}
                className="mtx-tap"
                style={{
                  height: 28,
                  padding: '0 9px',
                  borderRadius: 999,
                  border: '0.5px solid rgba(155,138,255,0.30)',
                  background: 'rgba(155,138,255,0.08)',
                  color: 'rgba(195,180,255,0.95)',
                  cursor: 'pointer', flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 700,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  marginLeft: 2,
                  transition: 'background .2s, border-color .2s',
                }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v15A2.5 2.5 0 0 0 9.5 22h5a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 14.5 2z"/>
                  <line x1="7" y1="9" x2="17" y2="9"/>
                  <line x1="7" y1="14" x2="17" y2="14"/>
                </svg>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
              </button>
            );
          })()}

          <div style={{ flex: 1 }}/>

          {/* C3 part A — Mic transcribe (queda igual, dicta texto al input) */}
          <button
            onClick={onVoice}
            aria-label="Dictar mensaje"
            className="mtx-tap"
            style={{
              width: 32, height: 32, borderRadius: 999, border: 0,
              background: 'transparent',
              color: 'var(--ink-3)',
              cursor: 'pointer', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .2s, color .2s',
            }}>
            <IcMic size={16} stroke="currentColor" strokeWidth={1.7}/>
          </button>

          {/* C3 part B — Voice mode (NUEVO). Abre voice_call overlay B7.
              Glow neon sutil constante — killer feature visible. */}
          <button
            onClick={function() {
              if (window.__mtxVoiceCall) {
                var convId = window.__mtxIAChat && window.__mtxIAChat.getCurrentId();
                window.__mtxVoiceCall.open(convId, '');
              }
            }}
            aria-label="Hablar por voz con el coach (modo llamada)"
            className="mtx-tap"
            style={{
              width: 34, height: 34, borderRadius: 999, border: 0,
              background: 'rgba(61,255,209,0.08)',
              color: 'var(--neon)',
              cursor: 'pointer', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 12px rgba(61,255,209,0.15), inset 0 0 0 0.5px rgba(61,255,209,0.30)',
              transition: 'background .2s, box-shadow .2s, transform .12s',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12c0-2 1-4 3-4s3 2 3 4-1 4-3 4-3-2-3-4z" fill="currentColor" fillOpacity="0.15"/>
              <path d="M9 12c0-3 1.5-6 3-6s3 3 3 6-1.5 6-3 6-3-3-3-6z" fill="currentColor" fillOpacity="0.20"/>
              <path d="M15 12c0-2 1-4 3-4s3 2 3 4-1 4-3 4-3-2-3-4z" fill="currentColor" fillOpacity="0.15"/>
            </svg>
          </button>

          {/* Send (neon cuando hay texto, opaco cuando no) */}
          <button
            onClick={canSend ? onSend : undefined}
            aria-label="Enviar mensaje"
            disabled={!canSend}
            className="mtx-tap"
            style={{
              width: 34, height: 34, borderRadius: 999, border: 0,
              background: canSend
                ? 'linear-gradient(135deg, var(--neon), #1ad9ad)'
                : 'rgba(255,255,255,0.06)',
              color: canSend ? '#0a1410' : 'var(--ink-4)',
              cursor: canSend ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: canSend
                ? '0 0 0 1px rgba(61,255,209,0.25), 0 6px 16px -4px rgba(61,255,209,0.45)'
                : 'none',
              transition: 'background .2s, box-shadow .2s, color .2s, transform .15s',
              transform: canSend ? 'scale(1)' : 'scale(0.94)',
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5"/>
              <path d="M5 12l7-7 7 7"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Hint sutil de keyboard shortcut. Solo visible si hay contenido. */}
      {value.trim().length > 0 && (
        <div style={{
          padding: '6px 12px 0',
          fontSize: 10, color: 'var(--ink-4)',
          letterSpacing: '-0.005em', textAlign: 'center',
          fontFamily: 'var(--ff-sans)',
          animation: 'mtx-fade-up .25s ease both',
        }}>
          Cmd + Enter para enviar
        </div>
      )}
    </div>
  );
}


// ── IAHistorySheet — drawer minimalista (ChatGPT-style) ─────────────────
// Diseño revisado: simple, sin previews, sin chrome ornamental. Conversaciones
// agrupadas por fecha relativa (Hoy / Ayer / Días anteriores), cada row es
// solo el título + un botón de 3 puntos a la derecha para eliminar. Tap en
// la row entra a la conversación.
function IAHistorySheet(props) {
  var open = props.open;
  var onClose = props.onClose;
  // Datos reactivos: si props.conversations llega, lo usamos. Si no, leemos
  // del hook useIAChat (caso del mount al nivel del shell, donde MentexApp
  // no subscribe al store de conversaciones para no inflar su render).
  var nav = useIAChat();
  var conversations = props.conversations != null ? props.conversations : nav.conversations;
  var currentId = props.currentId != null ? props.currentId : nav.currentId;
  var onSelect = props.onSelect;

  // RFC-001 Addendum A · A7 — search input local
  var queryState = React.useState('');
  var query = queryState[0];
  var setQuery = queryState[1];

  // ESC para cerrar (consistencia con resto de modales)
  React.useEffect(function() {
    if (!open) return;
    if (open) setQuery('');  // reset search al abrir
    var onKey = function(e) {
      if (e.key !== 'Escape') return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      onClose && onClose();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;

  // Filtrar por query si helpers están disponibles
  var filteredConvs = (typeof window !== 'undefined' && window.__mtxCoachExtras && window.__mtxCoachExtras.searchConversations)
    ? window.__mtxCoachExtras.searchConversations(conversations, query)
    : conversations;

  // Agrupar por fecha relativa al day-start de hoy
  var now = new Date();
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  var yesterdayStart = todayStart - 86400000;
  var sortedConvs = filteredConvs.slice().sort(function(a, b) { return b.updatedAt - a.updatedAt; });
  var groups = { hoy: [], ayer: [], anteriores: [] };
  sortedConvs.forEach(function(c) {
    if (c.updatedAt >= todayStart) groups.hoy.push(c);
    else if (c.updatedAt >= yesterdayStart) groups.ayer.push(c);
    else groups.anteriores.push(c);
  });

  var handleDelete = function(c, e) {
    if (e) e.stopPropagation();
    if (window.confirm('¿Eliminar "' + c.title + '"?')) {
      window.__mtxIAChat.deleteConversation(c.id);
    }
  };

  var renderSection = function(label, convs) {
    if (convs.length === 0) return null;
    return (
      <div key={label} style={{ marginBottom: 10 }}>
        <div className="mtx-eyebrow" style={{
          fontSize: 9.5, padding: '0 20px 6px', color: 'var(--ink-4)',
          letterSpacing: '0.14em',
        }}>{label}</div>
        {convs.map(function(c) {
          return (
            <IAHistoryRow key={c.id} conversation={c}
              isCurrent={c.id === currentId}
              onSelect={function() { onSelect(c.id); onClose(); }}
              onDelete={function(e) { handleDelete(c, e); }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      animation: 'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={function(e) { e.stopPropagation(); }} style={{
        background: 'rgba(15,19,19,0.94)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        borderTop: '0.5px solid rgba(255,255,255,0.10)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '14px 0 24px',
        boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
        maxHeight: '78%', overflow: 'auto',
        animation: 'mtx-fade-up .32s cubic-bezier(.4,1.4,.5,1)',
      }} className="mtx-no-scrollbar">
        {/* Grabber */}
        <div style={{
          width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
          background: 'rgba(255,255,255,0.16)',
        }}/>

        {/* Título minimalista (sin eyebrow ornamental) */}
        <div style={{ padding: '0 20px 12px' }}>
          <h2 style={{
            margin: 0, fontSize: 16, fontWeight: 600,
            color: 'var(--ink-1)', letterSpacing: '-0.015em',
            fontFamily: 'var(--ff-sans)',
          }}>Historial</h2>
        </div>

        {/* RFC-001 Addendum A · A7 — Search input */}
        {conversations.length > 2 && (
          <div style={{ padding: '0 20px 12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.45)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0 }} aria-hidden="true">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={query}
                onChange={function(e) { setQuery(e.target.value); }}
                placeholder="Buscar en tus conversaciones"
                aria-label="Buscar en historial"
                style={{
                  appearance: 'none',
                  flex: 1, minWidth: 0,
                  background: 'transparent', border: 0, outline: 0,
                  color: 'var(--ink-1)',
                  fontSize: 13,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  padding: 0,
                }}/>
              {query && (
                <button type="button"
                  onClick={function() { setQuery(''); }}
                  aria-label="Limpiar búsqueda"
                  className="mtx-tap"
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: 4, borderRadius: 4,
                    background: 'transparent', border: 0,
                    color: 'rgba(255,255,255,0.45)',
                    flexShrink: 0,
                  }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {conversations.length === 0 && (
          <div style={{ padding: '36px 20px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}>
              Aún no tienes conversaciones. Tu primer mensaje aparecerá aquí.
            </div>
          </div>
        )}

        {/* No results de search */}
        {conversations.length > 0 && filteredConvs.length === 0 && query && (
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              Sin resultados para "{query}".
            </div>
          </div>
        )}

        {renderSection('Hoy', groups.hoy)}
        {renderSection('Ayer', groups.ayer)}
        {renderSection('Días anteriores', groups.anteriores)}
      </div>
    </div>
  );
}


// Row minimalista del history. Solo título + botón 3-puntos a la derecha
// (delete via window.confirm). Mismo patrón que ChatGPT mobile.
function IAHistoryRow(props) {
  var c = props.conversation;
  var isCurrent = props.isCurrent;
  var onSelect = props.onSelect;
  var onDelete = props.onDelete;

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '0 8px 0 20px',
      background: isCurrent ? 'rgba(61,255,209,0.05)' : 'transparent',
      transition: 'background .15s',
    }}>
      <button
        onClick={onSelect}
        className="mtx-tap"
        style={{
          appearance: 'none', cursor: 'pointer', textAlign: 'left',
          flex: 1, minWidth: 0, border: 0, background: 'transparent',
          padding: '11px 0',
          fontSize: 13.5, fontWeight: 500,
          color: isCurrent ? 'var(--neon)' : 'var(--ink-1)',
          letterSpacing: '-0.005em',
          fontFamily: 'var(--ff-sans)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
        {c.title}
      </button>
      <button
        onClick={onDelete}
        aria-label={'Eliminar conversación ' + c.title}
        className="mtx-tap"
        style={{
          appearance: 'none', cursor: 'pointer',
          width: 32, height: 32, borderRadius: 999, border: 0, background: 'transparent',
          color: 'var(--ink-4)', flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color .15s, background .15s',
        }}>
        <IcMoreH size={15} stroke="currentColor" strokeWidth={1.7}/>
      </button>
    </div>
  );
}


// ── Memory detection heuristic (Fase 1.1, sin Mastra todavía) ─────────────
// Detecta hechos memorables en mensajes del user vía regex. Cuando Mastra
// entre en Fase 1.5, esta heurística se reemplaza por extracción semántica
// vía agent tool. La API contra __mtxIAConfig (autoSaveMemory /
// userAskedSaveMemory) queda igual — migración invisible.
//
// Filosofía KISS: pocas reglas precisas > muchas vagas (anti-poisoning).
// Una regla por categoría natural — evita memorias triviales o ambiguas.

// Terminator común: parar en puntuación, salto de línea, conjunciones (" y "
// / " pero " / " porque ") o fin de string. Evita capturas greedy del tipo
// "soy vegano y vivo en X" que metían 2 facts en uno.
var _TERM = '(?=[\\.\\,\\?\\!\\n]|\\s+y\\s+|\\s+pero\\s+|\\s+porque\\s+|\\s+y\\s+que\\s+|$)';

var _MEMORY_REGEX_RULES = [
  // ── Identidad ────────────────────────────────────────────────────────────
  {
    regex: new RegExp('\\bsoy\\s+([a-záéíóúñü][\\wáéíóúñü\\s-]{2,55}?)' + _TERM, 'i'),
    type: 'identity',
    formatter: function(m) { return _capitalize(m[1].trim()); },
  },
  {
    regex: new RegExp('\\bvivo\\s+en\\s+([\\wáéíóúñü\\s-]{2,55}?)' + _TERM, 'i'),
    type: 'identity',
    formatter: function(m) { return 'Vive en ' + _capitalize(m[1].trim()); },
  },
  {
    regex: new RegExp('\\btrabajo\\s+(en|de|como)\\s+([\\wáéíóúñü\\s-]{2,80}?)' + _TERM, 'i'),
    type: 'identity',
    formatter: function(m) { return 'Trabaja ' + m[1] + ' ' + m[2].trim(); },
  },
  {
    regex: new RegExp('\\bmi\\s+nombre\\s+es\\s+([\\wáéíóúñü\\s-]{2,50}?)' + _TERM, 'i'),
    type: 'identity',
    formatter: function(m) { return 'Se llama ' + _capitalize(m[1].trim()); },
  },
  {
    regex: /\btengo\s+(\d{1,3})\s+años\b/i,
    type: 'identity',
    formatter: function(m) { return 'Tiene ' + m[1] + ' años'; },
  },

  // ── Metas ────────────────────────────────────────────────────────────────
  {
    regex: new RegExp('\\bquiero\\s+(?!que\\b)([\\wáéíóúñü\\s-]{4,100}?)' + _TERM, 'i'),
    type: 'goal',
    formatter: function(m) { return 'Quiere ' + m[1].trim(); },
  },
  {
    regex: new RegExp('\\bmi\\s+(?:meta|objetivo)\\s+es\\s+([\\wáéíóúñü\\s-]{4,100}?)' + _TERM, 'i'),
    type: 'goal',
    formatter: function(m) { return _capitalize(m[1].trim()); },
  },

  // ── Preferencias negativas (CHECK FIRST — antes que "me gusta") ──────────
  // Crítico: si user dice "no me gusta X", solo guardamos negativo, no positivo.
  {
    regex: new RegExp('\\bno\\s+me\\s+gusta(?:n)?\\s+([\\wáéíóúñü\\s-]{3,80}?)' + _TERM, 'i'),
    type: 'preference',
    formatter: function(m) { return 'No le gusta ' + m[1].trim(); },
  },
  {
    regex: new RegExp('\\b(?:odio|detesto)\\s+([\\wáéíóúñü\\s-]{3,80}?)' + _TERM, 'i'),
    type: 'preference',
    formatter: function(m) { return 'Detesta ' + m[1].trim(); },
  },

  // ── Preferencias positivas (con negative lookbehind a "no ") ─────────────
  // (?<!no\s) evita matchear "no me gusta" como preferencia positiva.
  {
    regex: new RegExp('(?<!no\\s)\\b(?:me\\s+gusta(?:n)?|me\\s+encanta|amo|disfruto)\\s+([\\wáéíóúñü\\s-]{3,80}?)' + _TERM, 'i'),
    type: 'preference',
    formatter: function(m) { return 'Le gusta ' + m[1].trim(); },
  },
  {
    regex: new RegExp('\\bprefiero\\s+([\\wáéíóúñü\\s-]{3,80}?)' + _TERM, 'i'),
    type: 'preference',
    formatter: function(m) { return 'Prefiere ' + m[1].trim(); },
  },

  // ── Contexto ─────────────────────────────────────────────────────────────
  {
    regex: new RegExp('\\bestoy\\s+trabajando\\s+en\\s+([\\wáéíóúñü\\s-]{3,100}?)' + _TERM, 'i'),
    type: 'context',
    formatter: function(m) { return 'Trabajando en ' + m[1].trim(); },
  },
  {
    regex: new RegExp('\\b(?:estoy\\s+aprendiendo|estudio)\\s+([\\wáéíóúñü\\s-]{3,80}?)' + _TERM, 'i'),
    type: 'context',
    formatter: function(m) { return 'Aprendiendo ' + m[1].trim(); },
  },
];

// User-asked save: el user pide explícito al coach que recuerde algo.
// Mayor prioridad que auto-detection — siempre guarda, ignora autoLearnEnabled.
var _USER_ASKED_PATTERN = /^(?:recuerda|guarda|memoriza|anota|toma\s+nota)\s+(?:que\s+|de\s+que\s+)?(.{3,250})$/i;

function _capitalize(str) {
  if (!str) return '';
  var s = String(str).trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Extrae hechos memorables de un mensaje del user. Retorna array de
// { type, label, confidence }. Una regla matching por categoría natural.
function _extractMemorableFacts(content) {
  if (!content || typeof content !== 'string') return [];
  var trimmed = content.trim();
  // Skip mensajes muy cortos o demasiado largos (señal débil)
  if (trimmed.length < 6 || trimmed.length > 800) return [];

  var facts = [];
  var seen = {};
  for (var i = 0; i < _MEMORY_REGEX_RULES.length; i++) {
    var rule = _MEMORY_REGEX_RULES[i];
    var match = trimmed.match(rule.regex);
    if (!match) continue;
    var label = String(rule.formatter(match) || '').trim();
    if (!label || label.length < 3) continue;
    // Anti-duplicación dentro del mismo mensaje (mismo type+label normalizado)
    var key = rule.type + '|' + label.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    facts.push({ type: rule.type, label: label, confidence: 0.75 });
  }
  return facts;
}

// Detecta si el user pidió explícito guardar algo ("recuerda que X").
// Retorna { type, label } o null.
function _detectUserAskedSave(content) {
  if (!content || typeof content !== 'string') return null;
  var m = content.trim().match(_USER_ASKED_PATTERN);
  if (!m) return null;
  var label = _capitalize(m[1].trim());
  if (label.length < 3) return null;
  // Type 'context' por default: el user no especifica categoría → contexto neutral
  return { label: label, type: 'context' };
}

// Entry point — llamado desde handleSendFromInput / enterChat después de
// agregar el mensaje del user al store. Procesa user-asked save primero,
// luego auto-detection. Si toastFn disponible + showAutoNotification ON,
// muestra notificación sutil.
function _processMemoryDetection(content, msgId, conversationId, toastFn) {
  if (typeof window === 'undefined' || !window.__mtxIAConfig) return;

  // 1. User-asked save (mayor prioridad — pedido explícito del user)
  var userAsked = _detectUserAskedSave(content);
  if (userAsked) {
    window.__mtxIAConfig.userAskedSaveMemory({
      type: userAsked.type,
      label: userAsked.label,
      relatedMessageId: msgId || null,
      conversationId: conversationId || null,
    });
    if (toastFn) {
      toastFn({ message: '✦ Guardado en memoria del coach', duration: 2000 });
    }
    return;  // El user-asked es explícito → no doble-procesamos auto-detection
  }

  // 2. Auto-detection (respeta autoLearnEnabled — si OFF, no-op interno)
  var facts = _extractMemorableFacts(content);
  if (facts.length === 0) return;

  var saved = 0;
  facts.forEach(function(fact) {
    var mem = window.__mtxIAConfig.autoSaveMemory({
      type: fact.type,
      label: fact.label,
      confidence: fact.confidence,
      relatedMessageId: msgId || null,
      conversationId: conversationId || null,
    });
    if (mem) saved++;
  });

  // Toast sutil opt-in (default OFF — patrón ChatGPT memory)
  if (saved > 0 && toastFn) {
    var settings = window.__mtxIAConfig.getMemorySettings();
    if (settings.showAutoNotification) {
      toastFn({
        message: '✦ Coach aprendió ' + saved + ' detalle' + (saved === 1 ? '' : 's'),
        duration: 1800,
      });
    }
  }
}


// ── Saludo del coach por voice (Phase 5.2.1) ──────────────────────────────
// Mapea cada voz del onboarding a una línea de apertura tono-consistente.
// Usado por _buildSessionGreeting cuando ctx.mode === 'home-inactive'.
// El coach debe sonar igual en el whisper bubble y en el chat — coherencia.
function _coachOpeningByVoice(coachVoice, firstName) {
  var name = (firstName || '').trim() || 'amig@';
  var map = {
    warm:          'Hola, ' + name + '. Qué bueno verte.',
    contemplative: 'Buen día, ' + name + '. Aquí estoy.',
    energetic:     '¡' + name + '! Listo para hacer hoy un gran día.',
    wise:          'Bienvenido, ' + name + '. Empezamos cuando quieras.',
  };
  return map[coachVoice] || map.warm;
}


// ── _buildSessionGreeting — saludo contextualizado del coach ───────────────
// Dos modos:
//   • mode === 'home-inactive' (Phase 5.2.1): saludo desde HomeInactive.
//     Sin minutos restantes, foco en planificar el día. Voice-aware del
//     onboarding. Si fromWhisper:true, el saludo encadena el del bubble.
//   • mode default (HomeActive ✦ session-active): refleja state de sesión
//     activa con apps, tiempo, ritual, recordatorios.
function _buildSessionGreeting(ctx) {
  // ── HomeInactive coach chat (5.2.1) ────────────────────────────────────
  if (ctx && ctx.mode === 'home-inactive') {
    var firstName = ctx.firstName || '';
    var coachVoice = ctx.coachVoice || 'warm';
    var apps = ctx.blockedAppsCount || 0;
    var reminders = ctx.remindersPending || 0;
    var routinesActive = ctx.routinesActive || 0;
    var hrs = ctx.routineHours || 0;

    var lines = [];
    lines.push(_coachOpeningByVoice(coachVoice, firstName));
    lines.push('');

    // Si fromWhisper, encadenamos con la frase del bubble — se siente
    // continuo (el user ya leyó "¿Te ayudo a programar tu día?").
    if (ctx.fromWhisper) {
      lines.push('¿Empezamos por programar tu día?');
    } else {
      lines.push('¿En qué te ayudo a empezar el día?');
    }

    var bullets = [];
    if (apps > 0) {
      bullets.push('• ' + apps + ' app' + (apps === 1 ? '' : 's') + ' lista' + (apps === 1 ? '' : 's') + ' para bloquear');
    }
    if (reminders > 0) {
      bullets.push('• ' + reminders + ' recordatorio' + (reminders === 1 ? '' : 's') + ' activo' + (reminders === 1 ? '' : 's'));
    }
    if (routinesActive > 0) {
      bullets.push('• ' + routinesActive + ' rutina' + (routinesActive === 1 ? '' : 's') + ' seleccionada' + (routinesActive === 1 ? '' : 's'));
    }
    if (hrs > 0) {
      bullets.push('• ' + hrs + (hrs === 1 ? ' hora' : ' horas') + ' al día configurada' + (hrs === 1 ? '' : 's') + ' en tu rutina');
    }

    if (bullets.length > 0) {
      lines.push('');
      lines.push(bullets.join('\n'));
    }
    return lines.join('\n');
  }

  // ── HomeActive session-active (mode default) ──────────────────────────
  var blocked = ctx.blockedAppsCount || 0;
  var minutesLeft = ctx.minutesLeft || 0;
  var ritualPending = Math.max(0, (ctx.ritualTotal || 0) - (ctx.ritualDone || 0));
  var remindersPending = ctx.remindersPending || 0;

  var defaultLines = [];
  defaultLines.push('Estoy contigo en tu sesión activa.');
  defaultLines.push('');

  var defaultBullets = [];
  if (minutesLeft > 0) {
    defaultBullets.push('• ' + minutesLeft + ' min restantes de tu sesión');
  }
  if (blocked > 0) {
    defaultBullets.push('• ' + blocked + ' app' + (blocked === 1 ? '' : 's') + ' fuera de tu mente');
  }
  if (ritualPending > 0) {
    defaultBullets.push('• ' + ritualPending + ' item' + (ritualPending === 1 ? '' : 's') + ' pendiente' + (ritualPending === 1 ? '' : 's') + ' en tu ritual');
  }
  if (remindersPending > 0) {
    defaultBullets.push('• ' + remindersPending + ' recordatorio' + (remindersPending === 1 ? '' : 's') + ' activo' + (remindersPending === 1 ? '' : 's'));
  }

  if (defaultBullets.length > 0) {
    defaultLines.push(defaultBullets.join('\n'));
    defaultLines.push('');
  }

  defaultLines.push('¿En qué te ayudo ahora? Puedo agregar recordatorios, sumar items a tu ritual, recomendarte apps a bloquear o extender tu tiempo.');
  return defaultLines.join('\n');
}


// ── IAScreen — componente raíz de la sección ───────────────────────────────
// Two-state navigation:
//   • view='hub'  → tab bar VISIBLE (root del tab IA), sin input bar. Hero
//                    + quick-start chips son los entry points al chat. Esto
//                    respeta la regla del shell: en la página raíz de cada
//                    tab, el menú inferior siempre se muestra.
//   • view='chat' → tab bar OCULTA (página interna), con back button + msgs
//                    + input bar full-screen. Marca __mtxNav.setInternal('ai',
//                    true) para que MentexApp esconda la barra inferior y
//                    expanda el wrapper a bottom:0 (cubriendo la zona donde
//                    estaría el tab bar).
// ═══════════════════════════════════════════════════════════════════════════
// Free gate (Fase 1.4) — pantalla locked dedicada para users no premium
// ═══════════════════════════════════════════════════════════════════════════
// Cuando user.selectedPlan === 'free' (o trial expirado), TODA la tab IA
// se reemplaza por esta pantalla. No PremiumLockSheet bottom-sheet sobre
// contenido oculto — eso es engañoso. Esta es una pantalla full-screen con
// value-props claras + CTA prominente para activar trial.
//
// Reactive: useIsPremiumReactive escucha mtx:onboarding-changed (que emite
// __mtxOnboarding.updateAnswers cuando __mtxActivateTrial setea el plan).
// Al activar trial, isPremium → true, IAScreen re-renderiza y muestra el
// hub normal sin reload.
function useIsPremiumReactive() {
  var force = React.useReducer(function(x) { return x + 1; }, 0)[1];
  React.useEffect(function() {
    var h = function() { force(); };
    window.addEventListener('mtx:onboarding-changed', h);
    return function() { window.removeEventListener('mtx:onboarding-changed', h); };
  }, []);
  return (typeof window !== 'undefined' && window.__mtxIsPremium)
    ? window.__mtxIsPremium()
    : true;  // optimist default si store no cargado todavía
}

function IAPremiumLockScreen(props) {
  var onActivate = props.onActivate;
  var toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: function() {} };

  // Catálogo de features visible para el user free — qué se está perdiendo.
  // Cuando avancemos al backend agregamos métricas dinámicas (ej. "X usuarios
  // activos esta semana") pero el shape queda igual.
  var FEATURES = [
    {
      icon: '💬',
      title: 'Chat ilimitado',
      desc: 'Conversaciones 24/7 con un coach que conoce tu contexto',
      accent: '#3dffd1',
    },
    {
      icon: '🧠',
      title: 'Memoria que aprende',
      desc: 'Recuerda tus metas, hábitos y preferencias entre sesiones',
      accent: '#9b8aff',
    },
    {
      icon: '📅',
      title: 'Agenda proactiva',
      desc: 'Sugiere bloques de enfoque y recordatorios alineados a tu día',
      accent: '#5dd3ff',
    },
    {
      icon: '✨',
      title: 'Skills y artifacts',
      desc: 'Imágenes, audios, planes y workflows automatizados',
      accent: '#ffc850',
    },
  ];

  var handleActivate = function() {
    if (typeof onActivate === 'function') {
      onActivate();
    } else if (window.__mtxActivateTrial) {
      window.__mtxActivateTrial('annual');
    }
    if (toast && toast.show) {
      toast.show({
        message: '✦ Premium activado · 7 días gratis',
        duration: 2400,
      });
    }
  };

  return (
    <div className="mtx-no-scrollbar" style={{
      flex: 1, minHeight: 0,
      overflowY: 'auto', overflowX: 'hidden',
      paddingTop: 60, paddingBottom: 100,  // 100 = tab bar 78 + 22 aire
      animation: 'mtx-fade-up .35s ease both',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Hero — avatar grande con halo + eyebrow + título */}
      <div style={{
        padding: '20px 24px 0',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
      }}>
        {/* Avatar circle con glow neón pulsante */}
        <div style={{
          position: 'relative',
          width: 96, height: 96, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(61,255,209,0.30), rgba(155,138,255,0.16))',
          border: '0.5px solid rgba(61,255,209,0.40)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 18,
          boxShadow: '0 0 32px rgba(61,255,209,0.32), inset 0 1px 0 rgba(255,255,255,0.10)',
        }}>
          {/* Halo radial decorativo */}
          <div style={{
            position: 'absolute', inset: -16, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(61,255,209,0.24) 0%, transparent 70%)',
            filter: 'blur(12px)',
            pointerEvents: 'none',
            animation: 'mtx-pulse 3s ease-in-out infinite',
            willChange: 'transform, opacity',
          }}/>
          <span style={{ fontSize: 44, lineHeight: 1, position: 'relative' }} role="img" aria-hidden="true">🌿</span>
        </div>

        {/* Eyebrow */}
        <div className="mtx-eyebrow" style={{
          fontSize: 10, color: 'var(--neon)',
          letterSpacing: '0.16em',
          marginBottom: 8,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ color: 'var(--neon)' }}>✦</span>
          MENTEX PREMIUM
        </div>

        {/* Título */}
        <h1 style={{
          margin: 0,
          fontSize: 26, fontWeight: 800,
          color: 'var(--ink-1)',
          letterSpacing: '-0.025em',
          lineHeight: 1.15,
          fontFamily: 'var(--ff-display, var(--ff-sans))',
          marginBottom: 8,
          maxWidth: 280,
        }}>
          Tu coach IA personal,<br/>siempre contigo
        </h1>

        {/* Subtitle */}
        <p style={{
          margin: '0 0 24px',
          fontSize: 13.5, color: 'var(--ink-3)',
          lineHeight: 1.5,
          letterSpacing: '-0.005em',
          fontFamily: 'var(--ff-sans)',
          maxWidth: 280,
        }}>
          Desbloquea conversaciones ilimitadas, memoria contextual, agenda IA y skills automatizadas.
        </p>
      </div>

      {/* Feature cards — 4 rows con icon tile + título + desc */}
      <div style={{
        padding: '0 20px 24px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {FEATURES.map(function(f, i) {
          return (
            <div key={i} style={{
              padding: '12px 14px', borderRadius: 14,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 12,
              animation: 'mtx-fade-up .4s ease ' + (i * 0.06) + 's both',
            }}>
              {/* Icon tile */}
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, ' + f.accent + '24, ' + f.accent + '08)',
                border: '0.5px solid ' + f.accent + '32',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, lineHeight: 1,
                boxShadow: '0 0 12px ' + f.accent + '18',
              }}>
                <span role="img" aria-hidden="true">{f.icon}</span>
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: 'var(--ink-1)',
                  letterSpacing: '-0.012em',
                  fontFamily: 'var(--ff-display, var(--ff-sans))',
                  marginBottom: 2,
                }}>{f.title}</div>
                <div style={{
                  fontSize: 11.5, color: 'var(--ink-3)',
                  letterSpacing: '-0.005em',
                  lineHeight: 1.4,
                  fontFamily: 'var(--ff-sans)',
                }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA — botón grande activar trial */}
      <div style={{ padding: '0 20px', marginTop: 'auto' }}>
        <button
          onClick={handleActivate}
          onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(); } }}
          className="mtx-tap"
          aria-label="Empezar 7 días gratis de Mentex Premium"
          style={{
            appearance: 'none', cursor: 'pointer',
            width: '100%', padding: '14px 18px',
            borderRadius: 16, border: 0,
            background: 'linear-gradient(135deg, var(--neon) 0%, #1ad9ad 100%)',
            color: '#0a1410',
            fontSize: 15, fontWeight: 800,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.012em',
            boxShadow: '0 8px 24px -6px rgba(61,255,209,0.50), inset 0 1px 0 rgba(255,255,255,0.20)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            animation: 'mtx-fade-up .45s ease .32s both',
          }}>
          <span>Empezar 7 días gratis</span>
          <span style={{ fontSize: 14, opacity: 0.7 }}>→</span>
        </button>

        {/* Footnote */}
        <div style={{
          marginTop: 12,
          textAlign: 'center',
          fontSize: 10.5, color: 'var(--ink-4)',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
          lineHeight: 1.45,
          animation: 'mtx-fade-up .45s ease .42s both',
        }}>
          $9.99/mes después · Cancela cuando quieras
        </div>
      </div>
    </div>
  );
}


function IAScreen(props) {
  var nav = useIAChat();
  var conversations = nav.conversations;
  var current = nav.current;
  var currentId = nav.currentId;

  // view: 'hub' | 'chat'
  var viewState = React.useState('hub');
  var view = viewState[0]; var setView = viewState[1];

  // history/settings/agenda sheets viven al nivel del shell (MentexApp) para
  // renderizarse SOBRE el tab bar — z-index requirement. IAScreen solo
  // necesita los SETTERS para abrirlos; los `open` flags los lee el sheet
  // directamente del state del shell. (audit IMP-2: antes pasábamos también
  // historyOpen/settingsOpen/agendaOpen pero IAScreen no los leía).
  var setHistoryOpen = props.setHistoryOpen || function() {};
  var setSettingsOpen = props.setSettingsOpen || function() {};
  var setAgendaOpen = props.setAgendaOpen || function() {};

  // voiceOpen — overlay de transcripción de voz. Local al IAScreen porque
  // solo aparece dentro del flow del chat (no necesita sobrevivir al cambio
  // de tab). Auto-aplica al draft cuando el user confirma envío.
  var voiceOpenState = React.useState(false);
  var voiceOpen = voiceOpenState[0]; var setVoiceOpen = voiceOpenState[1];

  // tasksOpen — TasksSheet (Fase 2.4). Local al IAScreen porque es overlay del
  // tab IA; el sheet usa portal a mtx-overlay-root para anclarse al viewport.
  var tasksOpenState = React.useState(false);
  var tasksOpen = tasksOpenState[0]; var setTasksOpen = tasksOpenState[1];

  var draftState = React.useState('');
  var draft = draftState[0]; var setDraft = draftState[1];
  var textareaRef = React.useRef(null);

  // Flag para cancelar el mock streaming si el componente se unmounta o si el
  // user cambia de conversación / inicia otra. Patrón ref+function que sigue
  // siendo válido aunque el componente re-renderice.
  var aliveRef = React.useRef(true);
  React.useEffect(function() {
    aliveRef.current = true;
    return function() { aliveRef.current = false; };
  }, []);
  var isAlive = function() { return aliveRef.current; };

  // ── Sync con __mtxNav: chat='internal' (oculta tab bar), hub='root' ─────
  React.useEffect(function() {
    if (typeof window === 'undefined' || !window.__mtxNav) return;
    window.__mtxNav.setInternal('ai', view === 'chat');
  }, [view]);

  // Cleanup al unmount (cambio de tab): siempre resetear a not-internal para
  // que la tab bar reaparezca en el siguiente tab inmediatamente.
  React.useEffect(function() {
    return function() {
      if (typeof window !== 'undefined' && window.__mtxNav) {
        window.__mtxNav.setInternal('ai', false);
      }
    };
  }, []);

  // Listener: cuando el user selecciona una conversación desde el history
  // sheet (que vive al nivel del shell), MentexApp dispara este evento para
  // que cambiemos a chat view. Sin esto, el user selecciona una conv pero
  // se queda en el hub.
  React.useEffect(function() {
    var handler = function() { setView('chat'); };
    window.addEventListener('mtx:ia-enter-chat', handler);
    return function() { window.removeEventListener('mtx:ia-enter-chat', handler); };
  }, []);

  // ── Listener: acceso rápido desde HomeActive (botón IA del header) ─────
  // Crea conv efímera con scope='session-active' o reusa la existente.
  // Saludo contextualizado del assistant referencia state real de la sesión
  // (apps bloqueadas, tiempo restante, ritual pendiente, recordatorios).
  // Quick action chips invitan a las 4 acciones más probables.
  React.useEffect(function() {
    var handler = function(e) {
      // Gate defense-in-depth: aunque HomeActive y HomeInactive ya gatean
      // el button ✦, también gateamos el listener por si futuras phases
      // disparan el evento desde otro path sin checkear premium.
      if (typeof window !== 'undefined' && window.__mtxIsPremium && !window.__mtxIsPremium()) {
        if (window.__mtxOpenPremiumLock) window.__mtxOpenPremiumLock('ia-chat');
        return;
      }
      var ctx = (e && e.detail) || {};
      // __mtxIAChat.list() retorna array de conversations (no .get() — ese
      // toma un id y retorna 1 sola).
      var existing = window.__mtxIAChat.list().find(function(c) {
        return c.scope === 'session-active';
      });
      var conv;
      if (existing) {
        // Reusar conv de session activa, PERO regenerar el saludo con el
        // state actual si hubo cambios (audit IMP-7: antes el saludo
        // quedaba stale — "17 min restantes" cuando ya quedaban 5).
        // El primer mensaje del assistant es siempre el saludo, así que
        // solo lo updateamos in-place sin tocar messages posteriores.
        var firstAsst = existing.messages.find(function(m) { return m.role === 'assistant'; });
        var freshGreeting = _buildSessionGreeting(ctx);
        if (firstAsst && firstAsst.content !== freshGreeting) {
          window.__mtxIAChat.updateMessage(existing.id, firstAsst.id, { content: freshGreeting });
        }
        window.__mtxIAChat.setCurrent(existing.id);
        conv = existing;
      } else {
        conv = window.__mtxIAChat.create();
        // Marcar scope para diferenciarla de chats normales — el effect
        // del MentexApp limpia conv con scope='session-active' al fin
        // de sesión (audit CRIT-1) para evitar reuso con datos stale.
        var isInactive = ctx && ctx.mode === 'home-inactive';
        window.__mtxIAChat.update(conv.id, {
          title: isInactive ? 'Coach Mentex' : 'Tu sesión activa',
          scope: 'session-active',
        });
        var greeting = _buildSessionGreeting(ctx);
        // Chips adaptados al mode: HomeInactive sugiere planificación,
        // HomeActive sugiere acciones in-flight.
        var chips = isInactive
          ? [
              'Programar mi día',
              'Sumar recordatorio',
              'Recomendar contenido',
              'Sugerir rutina',
            ]
          : [
              'Organizar mi horario',
              'Añadir recordatorio',
              'Sugerir ritual',
              'Recomendar apps',
            ];
        window.__mtxIAChat.addMessage(conv.id, {
          role: 'assistant',
          content: greeting,
          state: 'done',
          chips: chips,
        });
      }
      setView('chat');
    };
    window.addEventListener('mtx:ia-open-session-chat', handler);
    return function() { window.removeEventListener('mtx:ia-open-session-chat', handler); };
  }, []);

  // ── Listener: chip tap dentro del mensaje del assistant ─────────────────
  // El chip se traduce en una pregunta natural que llena el draft del input.
  // El user puede editar antes de enviar (no se manda automático). Cada chip
  // mapea a un prompt específico en CHIP_PROMPTS — si el chip no coincide,
  // usamos el label tal cual como prompt fallback.
  React.useEffect(function() {
    var CHIP_PROMPTS = {
      // HomeActive (sesión activa) chips
      'Añadir recordatorio': '¿Puedes ayudarme a crear un recordatorio nuevo?',
      'Sugerir ritual':      '¿Qué item recomendarías agregar a mi ritual de hoy?',
      'Recomendar apps':     '¿Qué apps debería bloquear ahora?',
      'Extender tiempo':     'Quiero extender mi sesión. ¿Cuánto tiempo me sugieres?',
      // HomeInactive (planificación, Phase 5.2.1) chips
      'Programar mi día':     '¿Cómo me sugieres organizar mi día hoy?',
      'Sumar recordatorio':   '¿Me ayudas a crear un nuevo recordatorio para hoy?',
      'Recomendar contenido': '¿Qué contenido del catálogo me recomiendas para hoy?',
      'Sugerir rutina':       '¿Qué rutina me sugieres activar hoy?',
    };
    var handler = function(e) {
      var label = e && e.detail && e.detail.label;
      if (!label) return;
      // Gate: chips dentro de un mensaje del assistant son acciones del coach
      if (typeof window !== 'undefined' && window.__mtxIsPremium && !window.__mtxIsPremium()) {
        if (window.__mtxOpenPremiumLock) window.__mtxOpenPremiumLock('ia-quick');
        return;
      }

      // ── Chip especial: Organizar mi horario ──────────────────────────────
      // Asigna horas distribuidas a todos los ítems de la sesión activa
      // directamente vía __mtxScheduler — sin esperar que el user redacte.
      if (label === 'Organizar mi horario' && window.__mtxScheduler) {
        var session = window.__mtxSessionItems || { rituals: [], content: [] };
        // Preservar tipo (ritual/content) para que el timeline use el color correcto
        var taggedRituals = (session.rituals || []).map(function(item) {
          return Object.assign({}, item, { _kind: 'ritual' });
        });
        var taggedContent = (session.content || []).map(function(item) {
          return Object.assign({}, item, { _kind: 'content' });
        });
        var allItems = taggedRituals.concat(taggedContent);
        // Fallback: si no hay ítems de sesión, usar las primeras 3 de ACTIVITIES
        if (allItems.length === 0 && window.ACTIVITIES && window.ACTIVITIES.length) {
          allItems = window.ACTIVITIES.slice(0, 3).map(function(item) {
            return Object.assign({}, item, { _kind: 'ritual' });
          });
        }
        if (allItems.length === 0) {
          setDraft('Organiza el horario de mi ritual y aprendizaje del día');
          return;
        }
        // Distribuir horas desde ahora + 5 min, separadas por ~30 min
        var now = new Date();
        var startMin = now.getHours() * 60 + now.getMinutes() + 5;
        var lines = [];
        allItems.forEach(function(item, i) {
          var totalMin = startMin + i * 30;
          var h = Math.floor(totalMin / 60) % 24;
          var m = totalMin % 60;
          var time = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
          window.__mtxScheduler.schedule(item.id, time, item.title, item._kind || 'ritual');
          lines.push(time + ' — ' + item.title);
        });
        // Añade también recordatorios pendientes (tipo 'reminder' — franja violeta)
        if (window.__mtxIAAgenda) {
          var reminders = window.__mtxIAAgenda.get().reminders || [];
          reminders.forEach(function(r) {
            if (!r.completed && /^\d{1,2}:\d{2}$/.test(r.time) && !window.__mtxScheduler.getTime(r.id)) {
              window.__mtxScheduler.schedule(r.id, r.time, r.title, 'reminder');
            }
          });
        }
        // Muestra la confirmación en el chat vía evento para que el componente
        // tenga el conv.id correcto
        window.dispatchEvent(new CustomEvent('mtx:ia-schedule-done', {
          detail: { lines: lines }
        }));
        return;
      }

      var prompt = CHIP_PROMPTS[label] || label;
      setDraft(prompt);
      // Focus textarea para que el user pueda editar
      setTimeout(function() {
        if (textareaRef.current) textareaRef.current.focus();
      }, 60);
    };
    window.addEventListener('mtx:ia-chip-tap', handler);
    return function() { window.removeEventListener('mtx:ia-chip-tap', handler); };
  }, []);

  // ── C11a Sprint A.7 — Listener attach menu (file/camera/url/wearable) ──
  // El usuario elige opción → inyectamos prompt o adjuntamos data al input.
  React.useEffect(function() {
    var handler = function(e) {
      var detail = (e && e.detail) || {};
      var kind = detail.kind;
      var value = detail.value;
      var toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : null;

      if (kind === 'url' && value) {
        // Inyecta el prompt con la URL para que el coach dispare web_fetch
        setDraft('Léeme esto: ' + value);
        setTimeout(function() {
          if (textareaRef.current) textareaRef.current.focus();
        }, 60);
        return;
      }

      if (kind === 'wearable') {
        // Snapshot del wearable al chat: si conectado, lectura actual;
        // si no, abre integration sheet vía dispatch existente.
        var connected = window.__mtxWearableStore && window.__mtxWearableStore.isConnected();
        if (!connected) {
          if (toast && toast.show) toast.show({ message: 'Conecta Apple Health primero', duration: 2000 });
          window.dispatchEvent(new CustomEvent('mtx:open-integration-detail', {
            detail: { integrationId: 'appleHealth' },
          }));
          return;
        }
        var lastNight = window.__mtxWearableStore.getLastNight();
        if (lastNight) {
          var snap = 'Snapshot anoche: ' + lastNight.sleepHours + 'h de sueño · HRV ' + lastNight.hrv + 'ms · ' + lastNight.steps + ' pasos hoy. ';
          setDraft(snap);
          setTimeout(function() {
            if (textareaRef.current) textareaRef.current.focus();
          }, 60);
        }
        return;
      }

      if (kind === 'file') {
        // Dispara el file picker nativo invisible (input type=file con ref).
        if (typeof triggerFilePicker === 'function') triggerFilePicker();
        return;
      }
      if (kind === 'camera') {
        // Dispara el camera input (capture="environment" en móvil abre cámara).
        if (typeof triggerCameraPicker === 'function') triggerCameraPicker();
        return;
      }
    };
    window.addEventListener('mtx:coach-attach', handler);
    return function() { window.removeEventListener('mtx:coach-attach', handler); };
  }, []);

  // ── Sprint A.7 — Listener mtx:open-ia-settings ───────────────────────────
  // Lo disparan: memory chip del input bar (tab='memory'), skills menu
  // botón "Gestionar" (tab='skills'). El AssistantConfigSheet ya escucha
  // este mismo evento para preseleccionar la tab; aquí solo abrimos el sheet.
  React.useEffect(function() {
    var handler = function(e) {
      setSettingsOpen(true);
    };
    window.addEventListener('mtx:open-ia-settings', handler);
    return function() { window.removeEventListener('mtx:open-ia-settings', handler); };
  }, []);

  // ── C11b Sprint A.7 — Listener skill activation ──────────────────────────
  // El user tappea una skill del menu → inyecta su primer trigger al input
  // (no auto-envía para permitir edición).
  React.useEffect(function() {
    var handler = function(e) {
      var detail = (e && e.detail) || {};
      var prompt = detail.prompt;
      if (!prompt) return;
      setDraft(prompt);
      setTimeout(function() {
        if (textareaRef.current) textareaRef.current.focus();
        // Posiciona cursor al final
        if (textareaRef.current) {
          var len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 60);
    };
    window.addEventListener('mtx:skill-activate', handler);
    return function() { window.removeEventListener('mtx:skill-activate', handler); };
  }, []);

  // ── Listener: respuesta del agente tras organizar horario ──────────────
  // El chip-tap handler despacha 'mtx:ia-schedule-done' con las líneas del
  // horario. Aquí tenemos acceso al conv.id actual para inyectar el mensaje.
  React.useEffect(function() {
    var handler = function(e) {
      var lines = e && e.detail && e.detail.lines;
      if (!lines || !lines.length) return;
      var store = window.__mtxIAChat;
      if (!store) return;
      var conv = store.getCurrent();
      if (!conv) return;
      var schedule = lines.map(function(l) { return '• ' + l; }).join('\n');
      store.addMessage(conv.id, {
        role: 'assistant',
        content: '¡Listo! Organicé tu sesión de hoy:\n\n' + schedule + '\n\nRecibirás una notificación antes de cada momento. Puedes ajustar cualquier hora cuando quieras. 🎯',
        state: 'done',
      });
    };
    window.addEventListener('mtx:ia-schedule-done', handler);
    return function() { window.removeEventListener('mtx:ia-schedule-done', handler); };
  }, []);

  var toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: function() {} };

  // ── Premium gate helper (Phase 5.3.B) ──────────────────────────────────
  // Cualquier acción que dispare comportamiento del coach IA (send, chip
  // tap, nueva conv, abrir session chat) debe gatear. Hub navigable libre,
  // pero acciones que llaman al coach → lock. Retorna true si está gated
  // (consumer hace early return).
  function _gatePremium(feature) {
    if (typeof window === 'undefined') return false;
    if (window.__mtxIsPremium && !window.__mtxIsPremium()) {
      if (window.__mtxOpenPremiumLock) window.__mtxOpenPremiumLock(feature || 'ia-chat');
      return true;
    }
    return false;
  }

  // ── Handlers ────────────────────────────────────────────────────────────
  var enterChat = function(seedPrompt) {
    // Gate: chips de quick-start del hub IA disparan acción del coach
    if (seedPrompt && _gatePremium('ia-quick')) return;
    setView('chat');
    if (seedPrompt) {
      // Crear conv + enviar mensaje seed (chip clicked)
      var conv = window.__mtxIAChat.create();
      var userMsg = window.__mtxIAChat.addMessage(conv.id, { role: 'user', content: seedPrompt });
      // Memory detection (Fase 1.1) — los chips de quick-start raras veces
      // matchearán patterns de auto-detección (no son auto-disclosure),
      // pero ejecutamos por consistencia + por si el chip incluye "recuerda…"
      _processMemoryDetection(seedPrompt, userMsg && userMsg.id, conv.id, toast.show);
      // Usage tracking (Fase 1.3) — chips también cuentan como conversación
      if (window.__mtxIAUsage) window.__mtxIAUsage.track('conversations');
      var assistantMsg = window.__mtxIAChat.addMessage(conv.id, {
        role: 'assistant', content: '', state: 'reasoning',
      });
      _runMockResponse(conv.id, assistantMsg.id, seedPrompt, isAlive);
    } else if (!currentId) {
      // No hay conv activa → crear vacía y focus textarea
      window.__mtxIAChat.create();
      setTimeout(function() {
        if (textareaRef.current) textareaRef.current.focus();
      }, 280);  // after the slide-up animation
    }
  };

  var goHub = function() {
    // Si el chat actual es de scope='session-active' (abierto desde el
    // botón ✦ del HomeActive), el back debe regresar al HomeActive, no
    // al hub del tab IA — preserva el contexto del user que estaba en
    // sesión y solo quería consultar al coach. Disparamos un evento que
    // MentexApp escucha para hacer setTab('home').
    if (current && current.scope === 'session-active') {
      window.dispatchEvent(new CustomEvent('mtx:ia-leave-session-chat'));
      return;
    }
    setView('hub');
  };

  var handleSendFromInput = function() {
    var content = draft.trim();
    if (!content) return;
    // Gate: send mensaje al coach es feature premium core
    if (_gatePremium('ia-chat')) return;
    var cid = currentId;
    if (!cid) {
      var conv = window.__mtxIAChat.create();
      cid = conv.id;
    }
    var userMsg = window.__mtxIAChat.addMessage(cid, { role: 'user', content: content });
    // Memory detection (Fase 1.1) — extrae hechos memorables del mensaje
    // user-asked tiene prioridad; auto-detection respeta el toggle del store.
    _processMemoryDetection(content, userMsg && userMsg.id, cid, toast.show);
    // Usage tracking (Fase 1.3) — incrementa contador semanal de conversaciones
    if (window.__mtxIAUsage) window.__mtxIAUsage.track('conversations');
    setDraft('');
    var assistantMsg = window.__mtxIAChat.addMessage(cid, {
      role: 'assistant', content: '', state: 'reasoning',
    });
    _runMockResponse(cid, assistantMsg.id, content, isAlive);
  };

  var handleNewConversationFromHub = function() {
    // Gate: nueva conv requiere coach activo
    if (_gatePremium('ia-chat')) return;
    enterChat(null);  // create empty + enter chat
  };

  var handleNewConversationFromChat = function() {
    // Gate: nueva conv requiere coach activo
    if (_gatePremium('ia-chat')) return;
    // Already in chat — just create a new empty conv, stay in chat view
    window.__mtxIAChat.create();
    setDraft('');
    setTimeout(function() {
      if (textareaRef.current) textareaRef.current.focus();
    }, 100);
  };

  var handleRename = function() {
    if (!current) return;
    var next = window.prompt('Renombrar conversación:', current.title);
    if (next != null && next.trim()) {
      window.__mtxIAChat.rename(current.id, next.trim());
    }
  };

  var handleSelectFromHistory = function(id) {
    window.__mtxIAChat.setCurrent(id);
    setView('chat');  // history pick siempre lleva al chat
  };

  var handleAgenda = function() {
    setAgendaOpen(true);
  };
  var handleSettings = function() {
    setSettingsOpen(true);
  };
  // Ref para el input file invisible (file picker nativo)
  var fileInputRef = React.useRef(null);
  var cameraInputRef = React.useRef(null);

  // Legacy handler (queda por backward compat — el nuevo + button abre el
  // attach menu directamente, no llama esto. Si algo externo invoca, sigue
  // funcionando como fallback abriendo el menu.)
  var handleUpload = function() {
    if (window.__mtxAttachMenu) {
      window.__mtxAttachMenu.open();
    } else {
      toast.show({ message: 'Adjuntar · Próximamente', duration: 1800 });
    }
  };

  // Triggers file pickers — invocados desde el attach menu listener
  var triggerFilePicker = function() {
    if (fileInputRef.current) fileInputRef.current.click();
  };
  var triggerCameraPicker = function() {
    if (cameraInputRef.current) cameraInputRef.current.click();
  };

  // Handler común al seleccionar archivo (file o camera). Por ahora solo
  // mostramos preview del nombre/size en el draft. Cuando llegue backend,
  // el archivo se sube y el chat-message recibe el attachment ID.
  var handleFileSelected = function(e) {
    var file = e.target && e.target.files && e.target.files[0];
    if (!file) return;
    var sizeKB = Math.round(file.size / 1024);
    var sizeStr = sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + ' MB' : sizeKB + ' KB';
    var attachLabel = '📎 ' + file.name + ' (' + sizeStr + ')';
    setDraft(function(prev) {
      var trimmed = (prev || '').trim();
      return trimmed ? trimmed + '\n\n' + attachLabel : attachLabel + '\n\n';
    });
    setTimeout(function() {
      if (textareaRef.current) {
        textareaRef.current.focus();
        var len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 60);
    // Limpia el value para que el mismo archivo pueda re-seleccionarse
    e.target.value = '';
  };
  // Voz: abre el overlay de transcripción. Cuando el user confirma enviar,
  // el final transcribed text se aplica al draft. Si quiere enviarlo de
  // inmediato puede tocar send después; o el user puede editar antes.
  var handleVoice = function() {
    setVoiceOpen(true);
  };
  var handleVoiceCommit = function(finalText) {
    if (!finalText) return;
    // Append al draft existente con espacio, o replace si está vacío
    setDraft(function(prev) {
      var trimmed = (prev || '').trim();
      return trimmed ? trimmed + ' ' + finalText : finalText;
    });
    // Focus textarea para que el user pueda editar / enviar
    setTimeout(function() {
      if (textareaRef.current) textareaRef.current.focus();
    }, 100);
  };

  // ── RFC-001 Addendum A — hooks ANTES del early return (HOOKS FIRST) ─────
  // A4 — Tutorial overlay (primera vez)
  var tutorialState = React.useState(function() {
    return !!(typeof window !== 'undefined' && window.CoachOnboardingTutorial
      && window.CoachOnboardingTutorial.shouldShow
      && window.CoachOnboardingTutorial.shouldShow());
  });
  var showTutorial = tutorialState[0];
  var setShowTutorial = tutorialState[1];

  // A6 — Share sheet state
  var shareSheetState = React.useState(false);
  var shareOpen = shareSheetState[0];
  var setShareOpen = shareSheetState[1];

  // ── Render ───────────────────────────────────────────────────────────────
  // FREE GATE (Fase 1.4): si user no es premium, reemplazamos TODA la tab IA
  // por la pantalla locked. Reactivo a mtx:onboarding-changed — cuando user
  // activa trial vía el CTA, isPremium → true y el hub normal aparece sin
  // reload. Llamada después de TODOS los hooks (rules of hooks compliant).
  var isPremium = useIsPremiumReactive();
  if (!isPremium) {
    return <IAPremiumLockScreen/>;
  }

  // Hub view: scroll interno. paddingBottom:90 deja espacio para que las
  // chips no queden bajo la tab bar (que overlay a z=50 sobre los últimos
  // ~78px del wrapper). 90 = 78 (tab bar) + 12 (aire). NO input bar — los
  // puntos de entrada al chat son las chips y el botón "+ nueva conversación"
  // del header. Preserva la regla del shell: en la vista raíz de cada tab,
  // el menú inferior siempre visible.
  if (view === 'hub') {
    return (
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden',
        paddingTop: 60, paddingBottom: 90,
        animation: 'mtx-fade-up .35s ease both',
      }} className="mtx-no-scrollbar">
        <IAHubHeader
          conversationCount={conversations.length}
          onHistory={function() { setHistoryOpen(true); }}
          onAgenda={handleAgenda}
          onNewChat={handleNewConversationFromHub}
          onSettings={handleSettings}
          onTasks={function() { setTasksOpen(true); }}
        />
        <IAEmptyState onChipTap={function(chip) { enterChat(chip.prompt); }}/>
        {/* IAHistorySheet vive al nivel de MentexApp (props.setHistoryOpen) */}
        {/* Fase 2.4: TasksSheet local — portal a mtx-overlay-root */}
        {tasksOpen && window.TasksSheet && (
          <window.TasksSheet onClose={function() { setTasksOpen(false); }}/>
        )}
      </div>
    );
  }

  // Chat view: full-screen layout con header (back + title + new + settings),
  // body scrolleable, input bar siempre abajo. Tab bar oculta vía __mtxNav.
  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: 'flex', flexDirection: 'column',
      animation: 'mtx-fade-up .35s ease both',
    }}>
      <IAChatHeader
        current={current}
        onBack={goHub}
        onNewChat={handleNewConversationFromChat}
        onAgenda={handleAgenda}
        onOpenHistory={function() { setHistoryOpen(true); }}
        onTasks={function() { setTasksOpen(true); }}
        onShare={current ? function() { setShareOpen(true); } : undefined}
      />

      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden',
      }} className="mtx-no-scrollbar">
        {(!current || current.messages.length === 0) ? (
          <IAEmptyChatHint/>
        ) : (
          <IAMessages messages={current.messages} convId={current.id}/>
        )}
      </div>

      <IAInputBar
        value={draft}
        onChange={setDraft}
        onSend={handleSendFromInput}
        onUpload={handleUpload}
        onVoice={handleVoice}
        textareaRef={textareaRef}
      />

      {/* Voice transcription overlay — slide-up cuando el user tap el 🎙. */}
      {typeof IAVoiceOverlay !== 'undefined' && (
        <IAVoiceOverlay
          open={voiceOpen}
          onClose={function() { setVoiceOpen(false); }}
          onCommit={handleVoiceCommit}
        />
      )}

      {/* Fase 2.4: TasksSheet también desde chat view */}
      {tasksOpen && window.TasksSheet && (
        <window.TasksSheet onClose={function() { setTasksOpen(false); }}/>
      )}

      {/* RFC-001 Addendum A · A4 — Onboarding tutorial primera vez */}
      {showTutorial && window.CoachOnboardingTutorial && (
        <window.CoachOnboardingTutorial onClose={function() { setShowTutorial(false); }}/>
      )}

      {/* RFC-001 Addendum A · A6 — Share sheet (montado a portal en window) */}
      {window.CoachShareSheet && current && (
        <window.CoachShareSheet
          open={shareOpen}
          conversation={current}
          onClose={function() { setShareOpen(false); }}
        />
      )}

      {/* Sprint A.6 · B7 — Voice call overlay vive al nivel de MentexApp
          (no aquí). Razón: JSX no resuelve `<window.CoachVoiceCallOverlay/>`
          correctamente — necesita identifier capitalizado. Montado en
          Mentex Home.html junto a GlobalPlayerOverlay y demás globales para
          que pueda abrirse desde Home/Explore/Profile además de IA. */}

      {/* Sprint A.7 · C11a — file pickers invisibles. Los triggers
          (triggerFilePicker / triggerCameraPicker) viven en el closure del
          IAScreen y son llamados por el listener mtx:coach-attach. Cuando
          llegue backend, el archivo se sube a Imperial Gateway storage y
          el message recibe un attachmentId. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*,.doc,.docx,.txt,.md"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* IAHistorySheet vive al nivel de MentexApp (props.setHistoryOpen) */}
    </div>
  );
}


// ── IAHubHeader — header del hub (root): icon row simple ─────────────────
// Orden de iconos (left→right): historial · [spacer] · nueva · calendario · settings.
// Por convención del user: la nueva conversación pegada a las acciones primarias
// del lado derecho, calendario y settings al borde como utilities periféricas.
function IAHubHeader(props) {
  return (
    <div style={{ padding: '0 16px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <IAIconButton aria-label="Historial de conversaciones" onClick={props.onHistory}
        badge={props.conversationCount > 0 ? props.conversationCount : null}>
        <IcList size={16} stroke="currentColor" strokeWidth={1.7}/>
      </IAIconButton>
      <div style={{ flex: 1 }}/>
      {/* Orden de izquierda a derecha post-reorder: Nueva → Agenda → Tasks → Settings.
          Tasks queda contiguo a Settings (ambos invocan paneles "del coach"),
          Agenda en el medio (acceso rápido al día), Nueva en el extremo
          izquierdo del cluster derecho (acción más frecuente, fácil de tappear). */}
      <IAIconButton aria-label="Nueva conversación" onClick={props.onNewChat}>
        <IcPlus size={16} stroke="currentColor" strokeWidth={2}/>
      </IAIconButton>
      {window.IATasksIcon && <window.IATasksIcon onClick={props.onTasks}/>}
      <IAIconButton aria-label="Configuración del asistente" onClick={props.onSettings}>
        <IcSettings size={15} stroke="currentColor" strokeWidth={1.6}/>
      </IAIconButton>
    </div>
  );
}


// ── IAChatHeader — header del chat view ──────────────────────────────────
// Layout izquierda→derecha: [← back] [Título plano + dropdown ⌄] [+ new] [📅?]
// • Back + título a la izquierda; "+" siempre, agenda solo en sesión activa.
// • Settings NO vive en el chat — vive solo en el hub raíz del tab IA. Dentro
//   de un chat el user no necesita configurar el asistente; quitar reduce
//   ruido visual y deja el header minimalista.
// • La agenda solo aparece cuando el chat es scope='session-active' (acceso
//   rápido desde HomeActive). En chats normales del tab IA tampoco aparece —
//   ahí solo "+ nuevo chat" tiene sentido como utility.
// • Título es texto plano (sin pill background) + chev de dropdown. Tap →
//   abre el history sheet.
function IAChatHeader(props) {
  var current = props.current;
  var isSessionScope = current && current.scope === 'session-active';
  return (
    <div style={{
      flexShrink: 0,
      paddingTop: 60,
      background: 'linear-gradient(180deg, rgba(10,13,12,0.96) 0%, rgba(10,13,12,0.85) 80%, rgba(10,13,12,0.6) 100%)',
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      borderBottom: '0.5px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ padding: '0 12px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <IAIconButton aria-label="Volver al menú IA" onClick={props.onBack}>
          <IcChevL size={15} stroke="currentColor" strokeWidth={1.9}/>
        </IAIconButton>

        {/* Título plano + chev dropdown. Tap = abre history sheet (no
            rename). El user puede explorar/cambiar conversaciones desde ahí. */}
        <button
          onClick={props.onOpenHistory}
          className="mtx-tap"
          aria-label="Ver historial de conversaciones"
          style={{
            appearance: 'none', cursor: 'pointer',
            background: 'transparent', border: 0,
            flex: 1, minWidth: 0,
            padding: '6px 4px 6px 6px',
            color: 'var(--ink-1)',
            fontSize: 13.5, fontWeight: 600,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.01em',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            textAlign: 'left',
          }}>
          <span style={{
            minWidth: 0, flex: 'none',
            maxWidth: 'calc(100% - 16px)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{current ? current.title : 'Nueva conversación'}</span>
          <IcChevD size={11} stroke="var(--ink-3)" strokeWidth={1.8}/>
        </button>

        {/* Fase 2.4: Tasks icon también disponible en chat header */}
        {window.IATasksIcon && <window.IATasksIcon onClick={props.onTasks}/>}

        {/* RFC-001 Addendum A · A6 — Share conversation */}
        {props.onShare && (
          <IAIconButton aria-label="Compartir conversación" onClick={props.onShare}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.7"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </IAIconButton>
        )}

        <IAIconButton aria-label="Nueva conversación" onClick={props.onNewChat}>
          <IcPlus size={16} stroke="currentColor" strokeWidth={2}/>
        </IAIconButton>

        {/* Agenda extraída del IA — ahora vive en Home header (global), no
            dentro del chat. Reduces clutter en sesión activa también. */}
      </div>
    </div>
  );
}


// ── IAEmptyChatHint — placeholder cuando entras al chat con conv vacía ───
// Centrado VERTICAL Y HORIZONTAL en el body. Se renderiza dentro de un
// container flex:1 (el body de IAScreen), así que con height:100% +
// flex centering, el hint queda a media pantalla — no pegado arriba.
function IAEmptyChatHint() {
  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      animation: 'mtx-fade-up .35s ease both .2s both',
      opacity: 0.7,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', marginBottom: 14,
        background: 'linear-gradient(135deg, rgba(61,255,209,0.16), rgba(155,138,255,0.06))',
        border: '0.5px solid rgba(61,255,209,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>🌿</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, maxWidth: 240 }}>
        Escribe lo que tengas en mente. Empezamos por ahí.
      </div>
    </div>
  );
}


// Exportar
Object.assign(window, {
  IAScreen,
  useIAChat,
  IAHeader, IAEmptyState, IAEmptyHero, IAQuickStartCategory, IAQuickStartChip,
  IAMessages, IAMessageBubble, IATypingDots,
  IAInputBar, IAHistorySheet, IAHistoryRow,
});
