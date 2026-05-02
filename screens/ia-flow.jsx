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

  function _emit() {
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
      _currentId = id;
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
// Usa setTimeout en cadena (no setInterval) para que cada paso sea cancelable
// al unmount via el flag _alive de la closure. La cancelación viva en el
// caller — esta función no decide cuándo abortar.
function _runMockResponse(convId, msgId, userContent, _alive) {
  var store = window.__mtxIAChat;
  if (!store) return;
  // Step 1: reasoning (typing dots) — 600ms
  store.updateMessage(convId, msgId, { state: 'reasoning' });

  setTimeout(function() {
    if (!_alive()) return;
    // Step 2: streaming — texto aparece char-by-char
    var fullText = _mockAssistantReply(userContent);
    var i = 0;
    store.updateMessage(convId, msgId, { state: 'streaming', content: '' });
    var streamId = setInterval(function() {
      if (!_alive()) { clearInterval(streamId); return; }
      // Avance variable según puntuación para sentirse natural
      var step = /[.!?\n]/.test(fullText[i]) ? 5 : 3;
      i = Math.min(fullText.length, i + step);
      store.updateMessage(convId, msgId, { content: fullText.slice(0, i) });
      if (i >= fullText.length) {
        clearInterval(streamId);
        store.updateMessage(convId, msgId, { state: 'done' });
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
        <div style={{ flex: 1 }}/>
        <IAIconButton aria-label="Agenda del día" onClick={onAgenda}>
          <IcCalendar size={15} stroke="currentColor" strokeWidth={1.7}/>
        </IAIconButton>
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


// ── IAMessageBubble — render de un mensaje (user o assistant) ──────────────
// Estados visuales:
//   • role=user: bubble derecha, fondo neon-tint
//   • role=assistant + state=reasoning: bubble izquierda con typing dots
//   • role=assistant + state=streaming: bubble izquierda con texto + cursor
//   • role=assistant + state=done: bubble izquierda con texto plano
//   • role=assistant + state=error: bubble izquierda en tono rojo + retry CTA
function IAMessageBubble(props) {
  var msg = props.msg;
  var isUser = msg.role === 'user';
  var state = msg.state || 'done';

  if (isUser) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'flex-end',
        padding: '0 16px 10px',
        animation: 'mtx-fade-up .25s ease both',
      }}>
        <div style={{
          maxWidth: '82%',
          padding: '10px 14px', borderRadius: 18,
          borderBottomRightRadius: 6,
          background: 'linear-gradient(135deg, rgba(61,255,209,0.16), rgba(61,255,209,0.06))',
          border: '0.5px solid rgba(61,255,209,0.28)',
          color: 'var(--ink-1)',
          fontSize: 13.5, lineHeight: 1.45,
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          boxShadow: '0 8px 20px -10px rgba(61,255,209,0.4)',
        }}>{msg.content}</div>
      </div>
    );
  }

  // Assistant
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-start',
      padding: '0 16px 14px',
      gap: 8,
      animation: 'mtx-fade-up .3s ease both',
    }}>
      {/* Avatar pequeño */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(61,255,209,0.22), rgba(155,138,255,0.10))',
        border: '0.5px solid rgba(61,255,209,0.30)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, lineHeight: 1, marginTop: 2,
      }}>
        <span role="img" aria-hidden="true">🌿</span>
      </div>

      <div style={{
        maxWidth: 'calc(82% - 36px)',
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
      </div>
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
    <div ref={rootRef} style={{ paddingTop: 4, paddingBottom: 8 }}>
      {messages.map(function(msg) {
        return <IAMessageBubble key={msg.id} msg={msg}/>;
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
    }}>
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
          onChange={function(e) { onChange(e.target.value); }}
          onKeyDown={handleKeyDown}
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

        {/* Botones row — paperclip a la izquierda, mic+send a la derecha */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          marginTop: 2,
        }}>
          {/* Upload (left) */}
          <button
            onClick={onUpload}
            aria-label="Adjuntar archivo"
            className="mtx-tap"
            style={{
              width: 32, height: 32, borderRadius: 999, border: 0,
              background: 'transparent',
              color: 'var(--ink-3)',
              cursor: 'pointer', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .2s, color .2s',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          <div style={{ flex: 1 }}/>

          {/* Voice (right) */}
          <button
            onClick={onVoice}
            aria-label="Hablar con el asistente"
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

  // ESC para cerrar (consistencia con resto de modales)
  React.useEffect(function() {
    if (!open) return;
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

  // Agrupar por fecha relativa al day-start de hoy
  var now = new Date();
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  var yesterdayStart = todayStart - 86400000;
  var sortedConvs = conversations.slice().sort(function(a, b) { return b.updatedAt - a.updatedAt; });
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

        {/* Empty state */}
        {conversations.length === 0 && (
          <div style={{ padding: '36px 20px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}>
              Aún no tienes conversaciones. Tu primer mensaje aparecerá aquí.
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

  var toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: function() {} };

  // ── Handlers ────────────────────────────────────────────────────────────
  var enterChat = function(seedPrompt) {
    setView('chat');
    if (seedPrompt) {
      // Crear conv + enviar mensaje seed (chip clicked)
      var conv = window.__mtxIAChat.create();
      window.__mtxIAChat.addMessage(conv.id, { role: 'user', content: seedPrompt });
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
    setView('hub');
  };

  var handleSendFromInput = function() {
    var content = draft.trim();
    if (!content) return;
    var cid = currentId;
    if (!cid) {
      var conv = window.__mtxIAChat.create();
      cid = conv.id;
    }
    window.__mtxIAChat.addMessage(cid, { role: 'user', content: content });
    setDraft('');
    var assistantMsg = window.__mtxIAChat.addMessage(cid, {
      role: 'assistant', content: '', state: 'reasoning',
    });
    _runMockResponse(cid, assistantMsg.id, content, isAlive);
  };

  var handleNewConversationFromHub = function() {
    enterChat(null);  // create empty + enter chat
  };

  var handleNewConversationFromChat = function() {
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
  var handleUpload = function() {
    toast.show({ message: 'Adjuntar · Próximamente en Fase 2', duration: 1800 });
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

  // ── Render ───────────────────────────────────────────────────────────────
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
        />
        <IAEmptyState onChipTap={function(chip) { enterChat(chip.prompt); }}/>
        {/* IAHistorySheet vive al nivel de MentexApp (props.setHistoryOpen) */}
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
        onSettings={handleSettings}
        onOpenHistory={function() { setHistoryOpen(true); }}
      />

      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden',
      }} className="mtx-no-scrollbar">
        {(!current || current.messages.length === 0) ? (
          <IAEmptyChatHint/>
        ) : (
          <IAMessages messages={current.messages}/>
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
      <IAIconButton aria-label="Nueva conversación" onClick={props.onNewChat}>
        <IcPlus size={16} stroke="currentColor" strokeWidth={2}/>
      </IAIconButton>
      <IAIconButton aria-label="Agenda del día" onClick={props.onAgenda}>
        <IcCalendar size={15} stroke="currentColor" strokeWidth={1.7}/>
      </IAIconButton>
      <IAIconButton aria-label="Configuración del asistente" onClick={props.onSettings}>
        <IcSettings size={15} stroke="currentColor" strokeWidth={1.6}/>
      </IAIconButton>
    </div>
  );
}


// ── IAChatHeader — header del chat view ──────────────────────────────────
// Layout izquierda→derecha: [← back] [Título plano + dropdown ⌄] [spacer]
//                                                       [+ new] [⚙️ settings]
// • Back y título a la izquierda; new chat y settings a la derecha (utility).
// • Título es texto plano (sin pill background) + chev de dropdown. Tap
//   en el chev/título → abre el history sheet (no rename — eso vivirá en
//   el 3-dots de cada row del history en el futuro).
// • flex:1 minWidth:0 + ellipsis en el span del título evita que títulos
//   largos empujen los íconos derechos fuera del área.
function IAChatHeader(props) {
  var current = props.current;
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

        <IAIconButton aria-label="Nueva conversación" onClick={props.onNewChat}>
          <IcPlus size={16} stroke="currentColor" strokeWidth={2}/>
        </IAIconButton>

        <IAIconButton aria-label="Configuración del asistente" onClick={props.onSettings}>
          <IcSettings size={15} stroke="currentColor" strokeWidth={1.6}/>
        </IAIconButton>
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
