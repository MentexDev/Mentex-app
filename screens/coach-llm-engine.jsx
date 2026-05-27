// screens/coach-llm-engine.jsx — Sprint A.6 · B11 · LLM mock más rico
// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DEL COACH (frontend-only) — diseñado para ser drop-in replacement
// 1:1 con Vercel AI SDK streamText({messages, tools, abortSignal}) cuando
// llegue Brandon con backend. NO inventes una API: replicamos la del AI SDK.
//
// Lo que B11 entrega encima del simulador A2:
//   • Multi-turn awareness — el motor lee últimos N turnos + memoria
//     persistida (B10) + custom instructions del user para construir el
//     contexto. El reply varía según historial.
//   • Streaming token-by-token cancelable — AbortController pattern.
//     Cancelar a la mitad deja el mensaje truncado con marcador [detenido].
//   • Regenerate seeded — variation real (no idéntica). Usa seed
//     incremental por msgId + variant pool.
//   • Continue — reanuda desde donde se cortó (suffix generation).
//   • Tool chains visibles — si el simulador A2 detectó scenario, sus steps
//     se emiten progresivamente al timeline ANTES del stream del texto.
//
// API pública:
//   __mtxCoachEngine.generate({
//     convId, msgId, prompt,
//     mode: 'fresh'|'regenerate'|'continue',
//     seed?: number,
//   }) → returns { cancel: fn }
//
//   __mtxCoachEngine.cancel(msgId)   → aborta el stream de ese mensaje
//   __mtxCoachEngine.isActive(msgId) → bool
//   __mtxCoachEngine.getContext(convId) → { messages, memory, customInstructions, tokenEstimate }
//
// Cuando llegue backend:
//   generate() internamente cambia mock streamer por
//     `streamText({ model, system, messages, tools, abortSignal })`.
//   El resto del archivo (action handlers, regenerate flow, edit flow,
//   continue flow) NO cambia — son patrones de UI agnósticos al motor.
// ─────────────────────────────────────────────────────────────────────────────


(function() {
  if (typeof window === 'undefined' || window.__mtxCoachEngine) return;

  // ─ Active streams registry — msgId → { abort: fn, startedAt } ──────────────
  // Permite cancelar desde múltiples puntos: button stop, unmount del bubble,
  // navegación a otra conv, etc. Idempotente: cancel() en msgId no activo
  // es no-op.
  var _activeStreams = {};

  function _isActive(msgId) {
    return !!(_activeStreams[msgId] && _activeStreams[msgId].abort);
  }

  function _registerStream(msgId, abortFn) {
    _activeStreams[msgId] = { abort: abortFn, startedAt: Date.now() };
    window.dispatchEvent(new CustomEvent('mtx:coach-engine-stream-started', {
      detail: { msgId: msgId },
    }));
  }

  function _unregisterStream(msgId) {
    if (_activeStreams[msgId]) {
      delete _activeStreams[msgId];
      window.dispatchEvent(new CustomEvent('mtx:coach-engine-stream-ended', {
        detail: { msgId: msgId },
      }));
    }
  }

  function _cancel(msgId) {
    var entry = _activeStreams[msgId];
    if (entry && typeof entry.abort === 'function') {
      try { entry.abort('user-cancel'); } catch (_) {}
    }
    _unregisterStream(msgId);
  }

  // ─ Context builder ─────────────────────────────────────────────────────────
  // Construye el contexto que el "LLM" usa para generar. Estructura idéntica
  // a la que necesitará Vercel AI SDK: { system, messages, memoryFacts }.
  // En production, esto se mappea 1:1 a:
  //   streamText({ system, messages: ctx.messages, tools, abortSignal })
  function _buildContext(convId) {
    var conv = window.__mtxIAChat ? window.__mtxIAChat.get(convId) : null;
    var msgs = conv ? (conv.messages || []) : [];

    // Últimos 10 turnos (5 user + 5 assistant) para multi-turn awareness.
    // Token budget aprox: 10 msgs × ~150 tokens = 1500 tokens. Compatible
    // con context window de 4k-8k incluso de modelos económicos.
    var recent = msgs.slice(-10).map(function(m) {
      return {
        role: m.role,
        content: typeof m.content === 'string' ? m.content : '',
      };
    });

    // Memorias del user (B10) — top 10 más usadas + pinned, activas.
    var memoryFacts = [];
    if (window.__mtxMemoryStore) {
      var allMems = window.__mtxMemoryStore.list({ archived: false });
      // Sort: pinned primero, luego más usadas, luego más recientes
      allMems.sort(function(a, b) {
        if ((!!a.pinned) !== (!!b.pinned)) return a.pinned ? -1 : 1;
        var au = a.usageCount || 0; var bu = b.usageCount || 0;
        if (au !== bu) return bu - au;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      memoryFacts = allMems.slice(0, 10).map(function(m) {
        return {
          id: m.id,
          type: m.type,
          label: m.label,
          value: m.value || '',
        };
      });
    }

    // Custom instructions (lo que el user escribió en Settings)
    var ci = { aboutYou: '', responseStyle: '' };
    if (window.__mtxIAConfig && window.__mtxIAConfig.getCustomInstructions) {
      ci = window.__mtxIAConfig.getCustomInstructions();
    }

    // Estimación de tokens: ~4 chars/token (heurística estándar GPT/Claude)
    var totalChars = recent.reduce(function(acc, m) { return acc + (m.content || '').length; }, 0);
    totalChars += memoryFacts.reduce(function(acc, m) { return acc + m.label.length + (m.value || '').length; }, 0);
    totalChars += (ci.aboutYou || '').length + (ci.responseStyle || '').length;
    var tokenEstimate = Math.ceil(totalChars / 4);

    return {
      system: _buildSystemPrompt(memoryFacts, ci),
      messages: recent,
      memoryFacts: memoryFacts,
      customInstructions: ci,
      tokenEstimate: tokenEstimate,
    };
  }

  // System prompt — replica formato canónico AI SDK. Mock por ahora;
  // backend lo va a generar dinámico con plantilla en MENTEX_BACKEND_CONTRACT.
  function _buildSystemPrompt(memoryFacts, ci) {
    var parts = [];
    parts.push('Eres Coach Mentex — un coach de bienestar cálido y sabio, sin paternalismo.');
    parts.push('Hablas en español, tono cercano pero respetuoso. Conciso por defecto, profundo cuando importa.');
    if (memoryFacts.length > 0) {
      parts.push('');
      parts.push('Lo que sabes del usuario:');
      memoryFacts.forEach(function(m) {
        parts.push('- [' + m.type + '] ' + m.label + (m.value ? ': ' + m.value : ''));
      });
    }
    if (ci.aboutYou) {
      parts.push('');
      parts.push('El usuario te ha dicho sobre sí mismo: ' + ci.aboutYou);
    }
    if (ci.responseStyle) {
      parts.push('');
      parts.push('Estilo de respuesta preferido: ' + ci.responseStyle);
    }
    return parts.join('\n');
  }

  // ─ Reply generator — context-aware mock ────────────────────────────────────
  // Genera el texto del reply usando context completo (no solo el último
  // prompt). Cuando llegue backend, esta función desaparece — el modelo
  // genera directamente.
  //
  // Lógica del mock:
  //   1. Si el simulador A2 detectó un scenario → usa su buildReply (con
  //      context awareness ya incorporado en algunos scenarios).
  //   2. Si hay memorias relevantes al prompt → las cita orgánicamente.
  //   3. Si el último turno mencionó algo específico → referencia continuity.
  //   4. Default → reply contextual genérico (no genérico-genérico).
  function _generateReply(opts) {
    var prompt = opts.prompt || '';
    var ctx = opts.context;
    var mode = opts.mode || 'fresh';
    var seed = opts.seed || 0;
    var simulatorScenario = opts.simulatorScenario;

    // ─ Mode: regenerate ─ usa variant pool del prompt + seed
    if (mode === 'regenerate') {
      return _regenerateVariant(prompt, ctx, seed, simulatorScenario);
    }

    // ─ Mode: continue ─ extiende el reply previo
    if (mode === 'continue') {
      return _continueFromPrevious(opts.previousContent, ctx);
    }

    // ─ Mode: fresh ─ flow normal
    if (simulatorScenario && window.__mtxCoachSimulator) {
      return window.__mtxCoachSimulator.buildReplyForScenario(simulatorScenario, prompt, ctx);
    }

    return _contextualGenericReply(prompt, ctx);
  }

  // Reply contextual genérico — cuando no hay scenario, igual usa contexto
  // (memorias, último turno) para no sonar a script genérico.
  function _contextualGenericReply(prompt, ctx) {
    var msgs = ctx.messages || [];
    var memoryFacts = ctx.memoryFacts || [];

    // ¿Es saludo? Si el último mensaje user es < 30 chars y match con
    // hola/buenas/hi → reply cálido + referencia a algo conocido del user.
    var isGreeting = /^(hola|buenas|hey|hi|qué tal|que tal|hello|saludos)\b/i.test(prompt.trim());
    if (isGreeting && prompt.length < 30) {
      var pinnedGoal = memoryFacts.find(function(m) { return m.type === 'goal'; });
      if (pinnedGoal) {
        return [
          'Hola. Qué bueno saber de ti.',
          '',
          'La última vez hablamos de "' + pinnedGoal.label + '". ¿Cómo va eso, o necesitas trabajar algo distinto hoy?',
        ].join('\n');
      }
      return [
        'Hola. Cuéntame cómo estás hoy — qué necesitas trabajar, qué te tiene la cabeza.',
        '',
        'Sin presión: a veces solo es bueno aterrizar antes de empezar.',
      ].join('\n');
    }

    // ¿El user pregunta sobre algo que ya hablamos? Detección por palabras
    // clave repetidas en los últimos turnos (poor-man's RAG).
    var continuityHint = _detectContinuity(prompt, msgs);
    if (continuityHint) {
      return [
        continuityHint,
        '',
        'Cuéntame qué cambió desde la última vez — el contexto importa para que mi respuesta no sea genérica.',
      ].join('\n');
    }

    // ¿Hay memoria relevante al prompt? Match por substrings simples.
    var relevantMem = _findRelevantMemory(prompt, memoryFacts);
    if (relevantMem) {
      return [
        'Recuerdo que mencionaste: "' + relevantMem.label + '".',
        '',
        'Conectando eso con lo que me dices ahora — ¿quieres que lo abordemos por ahí, o estás explorando un ángulo distinto?',
      ].join('\n');
    }

    // Default contextual: ack del prompt + invitar a profundizar
    return [
      'Te escucho. Cuéntame un poco más sobre lo que necesitas — entre más concreto, mejor te puedo ayudar.',
      '',
      'Si quieres, podemos empezar por un paso pequeño y construir desde ahí.',
    ].join('\n');
  }

  function _detectContinuity(prompt, msgs) {
    if (!msgs || msgs.length < 2) return null;
    var promptNorm = prompt.toLowerCase();
    // Si menciona "ayer", "lo de antes", "lo que dije" → continuidad explícita
    if (/\b(ayer|antes|anterior|lo que dije|hablamos|comentamos)\b/i.test(prompt)) {
      var lastUserMsg = null;
      for (var i = msgs.length - 2; i >= 0; i--) {
        if (msgs[i].role === 'user') { lastUserMsg = msgs[i]; break; }
      }
      if (lastUserMsg) {
        var snippet = (lastUserMsg.content || '').slice(0, 60).trim();
        return 'Sí, recuerdo lo de "' + snippet + '...".';
      }
    }
    return null;
  }

  function _findRelevantMemory(prompt, memoryFacts) {
    if (!memoryFacts || memoryFacts.length === 0) return null;
    var promptNorm = prompt.toLowerCase();
    // Match crude: si alguna palabra del label de la memoria aparece en el prompt
    for (var i = 0; i < memoryFacts.length; i++) {
      var m = memoryFacts[i];
      var labelWords = m.label.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 4; });
      for (var j = 0; j < labelWords.length; j++) {
        if (promptNorm.indexOf(labelWords[j]) !== -1) return m;
      }
    }
    return null;
  }

  // ─ Regenerate ─ variant pool por seed ──────────────────────────────────────
  // No es aleatorio — es deterministic con seed para que el user vea
  // variation predecible si regenera 2 veces.
  function _regenerateVariant(prompt, ctx, seed, simulatorScenario) {
    if (simulatorScenario && window.__mtxCoachSimulator && window.__mtxCoachSimulator.buildReplyForScenarioVariant) {
      return window.__mtxCoachSimulator.buildReplyForScenarioVariant(simulatorScenario, prompt, ctx, seed);
    }
    // Pool de aperturas alternativas
    var openings = [
      'Déjame plantearlo distinto.',
      'Vamos por otro ángulo.',
      'Probemos verlo así.',
      'Cambio de enfoque.',
      'Una variación de lo mismo:',
      'Otra forma de pensarlo:',
    ];
    var bodies = [
      'Lo que estás describiendo tiene un patrón claro. Antes de actuar, vale la pena pausar y nombrar exactamente qué quieres que cambie.',
      'Hay una capa debajo de la pregunta. Si vamos a la raíz, lo que pides no es solo una respuesta — es claridad sobre qué hacer después.',
      'Vamos a separar dos cosas que se mezclan: lo que sientes ahora y lo que quieres lograr a mediano plazo. No es lo mismo, y la respuesta cambia.',
      'Lo importante no es la herramienta, es el momento. Lo que me dices indica que primero necesitas espacio, después acción.',
    ];
    var closes = [
      'Cuéntame cuál de las dos te resuena más y seguimos por ahí.',
      'Si te parece, empezamos por la pieza más pequeña y vemos cómo se siente.',
      'Dime si esto encaja con lo que tenías en mente o si vamos por otro camino.',
      'Avanzamos por donde tú prefieras — sin prisa.',
    ];
    var i = seed % openings.length;
    var j = (seed * 3 + 1) % bodies.length;
    var k = (seed * 7 + 2) % closes.length;
    return [openings[i], '', bodies[j], '', closes[k]].join('\n');
  }

  // ─ Continue ─ reanuda donde quedó ──────────────────────────────────────────
  function _continueFromPrevious(previousContent, ctx) {
    var endsWithSentence = /[.!?]\s*$/.test(previousContent || '');
    var connector = endsWithSentence
      ? '\n\nY siguiendo con eso:\n\n'
      : ' ';
    var continuations = [
      'Lo que importa además es el ritmo. Si vas demasiado rápido, te quemas; demasiado lento, pierdes momentum. El punto justo depende de cómo te sientas día a día — no de una fórmula.',
      'Otro aspecto que vale considerar: cómo proteges esto del resto del día. Sin un bloque dedicado, lo urgente se come lo importante todas las veces.',
      'Para que no quede en abstracto, te dejo una idea concreta: empieza con la versión más pequeña que aún tenga sentido. Si funciona, escalas; si no, ajustas sin haber perdido tiempo.',
    ];
    return continuations[Math.floor(Math.random() * continuations.length)];
  }

  // ─ Streamer ─ char-by-char con AbortController ─────────────────────────────
  // Replica visual del streaming real de Claude/ChatGPT. Velocidad variable
  // (más lento en punctuation para que la lectura sea natural).
  function _streamText(opts) {
    var store = opts.store;
    var convId = opts.convId;
    var msgId = opts.msgId;
    var fullText = opts.fullText;
    var initialContent = opts.initialContent || '';
    var onComplete = opts.onComplete;
    var aborted = false;
    var streamId = null;

    function abort(reason) {
      if (aborted) return;
      aborted = true;
      if (streamId) clearInterval(streamId);
      var current = store.get(convId);
      var msg = current && current.messages.find(function(m) { return m.id === msgId; });
      var lastContent = (msg && msg.content) || initialContent;
      var truncatedMark = reason === 'user-cancel'
        ? lastContent + ' [detenido]'
        : lastContent;
      store.updateMessage(convId, msgId, {
        state: reason === 'user-cancel' ? 'done' : 'done',
        content: truncatedMark,
        wasStopped: reason === 'user-cancel',
      });
      _unregisterStream(msgId);
    }

    _registerStream(msgId, abort);

    // Marca el mensaje como streaming + arranca con initial content
    store.updateMessage(convId, msgId, { state: 'streaming', content: initialContent });

    var i = initialContent.length;
    var totalLen = (initialContent + fullText).length;
    var compositeText = initialContent + fullText;

    streamId = setInterval(function() {
      if (aborted) { clearInterval(streamId); return; }
      // Velocidad variable: más lento en puntuación final, rápido en text plano
      var step = /[.!?\n]/.test(compositeText[i]) ? 4 : 3;
      i = Math.min(totalLen, i + step);
      store.updateMessage(convId, msgId, { content: compositeText.slice(0, i) });
      if (i >= totalLen) {
        clearInterval(streamId);
        aborted = true; // marca para no doble-clear
        store.updateMessage(convId, msgId, { state: 'done' });
        _unregisterStream(msgId);
        if (typeof onComplete === 'function') onComplete();
      }
    }, 22);

    return { cancel: function() { abort('user-cancel'); } };
  }

  // ─ Generate ─ entrypoint principal ─────────────────────────────────────────
  function _generate(opts) {
    var convId = opts.convId;
    var msgId = opts.msgId;
    var prompt = opts.prompt || '';
    var mode = opts.mode || 'fresh';
    var seed = opts.seed || 0;
    var previousContent = opts.previousContent || '';
    var store = window.__mtxIAChat;
    if (!store) {
      return { cancel: function() {} };
    }

    // Si ya hay un stream activo para este msgId, cancélalo antes
    if (_isActive(msgId)) _cancel(msgId);

    // Construye contexto
    var ctx = _buildContext(convId);

    // Detect scenario vía simulator A2 (si aplica)
    var simulatorScenario = null;
    if (window.__mtxCoachSimulator && window.__mtxCoachSimulator.detect) {
      simulatorScenario = window.__mtxCoachSimulator.detect(prompt);
    }

    // Si hay scenario, ejecuta steps + artifact + después stream del texto
    if (simulatorScenario && window.__mtxCoachSimulator && mode === 'fresh') {
      var aliveFlag = true;
      var streamHandle = null;
      var aliveFn = function() { return aliveFlag; };

      // Registra abort temprano para que stop del user funcione incluso
      // antes de que llegue al stream phase
      _registerStream(msgId, function() {
        aliveFlag = false;
        if (streamHandle && streamHandle.cancel) streamHandle.cancel();
      });

      window.__mtxCoachSimulator.run({
        store: store,
        convId: convId,
        msgId: msgId,
        scenario: simulatorScenario,
        userContent: prompt,
        _alive: aliveFn,
        onComplete: function(replyText, artifact, steps) {
          if (!aliveFlag) return;
          streamHandle = _streamText({
            store: store,
            convId: convId,
            msgId: msgId,
            fullText: replyText,
            onComplete: function() {
              if (artifact) {
                store.updateMessage(convId, msgId, { artifacts: [artifact] });
              }
            },
          });
        },
      });

      return {
        cancel: function() {
          aliveFlag = false;
          if (streamHandle && streamHandle.cancel) streamHandle.cancel();
          _unregisterStream(msgId);
        },
      };
    }

    // Sin scenario: reasoning → stream
    store.updateMessage(convId, msgId, {
      state: mode === 'continue' ? 'streaming' : 'reasoning',
      content: previousContent,
    });

    var fullReply = _generateReply({
      prompt: prompt,
      context: ctx,
      mode: mode,
      seed: seed,
      simulatorScenario: simulatorScenario,
      previousContent: previousContent,
    });

    var delay = mode === 'continue' ? 50 : 600;
    var timeoutHandle = setTimeout(function() {
      _streamText({
        store: store,
        convId: convId,
        msgId: msgId,
        fullText: fullReply,
        initialContent: mode === 'continue' ? previousContent : '',
      });
    }, delay);

    // Wrap cancel para abortar también el timeout de reasoning
    _registerStream(msgId, function() {
      clearTimeout(timeoutHandle);
      _unregisterStream(msgId);
      store.updateMessage(convId, msgId, { state: 'done', content: previousContent, wasStopped: true });
    });

    return {
      cancel: function() {
        clearTimeout(timeoutHandle);
        _cancel(msgId);
      },
    };
  }

  // ─ Regenerate helper ─ wrapper de generate con mode=regenerate ─────────────
  // Encuentra el último prompt user antes del msgId del coach y regenera.
  function _regenerate(convId, assistantMsgId) {
    var store = window.__mtxIAChat;
    if (!store) return null;
    var conv = store.get(convId);
    if (!conv) return null;
    var msgs = conv.messages || [];
    var idx = msgs.findIndex(function(m) { return m.id === assistantMsgId; });
    if (idx <= 0) return null;
    // El prompt del user es el último mensaje user antes del coach
    var userPrompt = null;
    for (var i = idx - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { userPrompt = msgs[i].content; break; }
    }
    if (!userPrompt) return null;

    // Incrementa regenerate counter para variar el seed
    var prev = msgs[idx] || {};
    var newSeed = ((prev.regenerateCount || 0) + 1);

    // Reset content + steps + artifacts; el motor los re-llena
    store.updateMessage(convId, assistantMsgId, {
      content: '',
      state: 'reasoning',
      steps: null,
      artifacts: null,
      wasStopped: false,
      regenerateCount: newSeed,
    });

    return _generate({
      convId: convId,
      msgId: assistantMsgId,
      prompt: userPrompt,
      mode: 'regenerate',
      seed: newSeed,
    });
  }

  // ─ Continue helper ─────────────────────────────────────────────────────────
  function _continueMsg(convId, assistantMsgId) {
    var store = window.__mtxIAChat;
    if (!store) return null;
    var conv = store.get(convId);
    if (!conv) return null;
    var msg = conv.messages.find(function(m) { return m.id === assistantMsgId; });
    if (!msg) return null;
    var previous = msg.content || '';
    // Quita el marcador [detenido] si existía
    previous = previous.replace(/\s*\[detenido\]\s*$/, '');
    var msgs = conv.messages;
    var idx = msgs.findIndex(function(m) { return m.id === assistantMsgId; });
    var userPrompt = '';
    for (var i = idx - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { userPrompt = msgs[i].content; break; }
    }
    store.updateMessage(convId, assistantMsgId, { wasStopped: false });
    return _generate({
      convId: convId,
      msgId: assistantMsgId,
      prompt: userPrompt,
      mode: 'continue',
      previousContent: previous,
    });
  }

  // ─ Edit user message → fork generation ─────────────────────────────────────
  // Replica patrón Claude/ChatGPT: editar mensaje del user → trunca todos los
  // mensajes posteriores y dispara nueva generación. NO crea branch separado
  // (eso es Sprint A.7 C5+); por ahora reemplaza in-place.
  function _editUserMessage(convId, userMsgId, newContent) {
    var store = window.__mtxIAChat;
    if (!store) return null;
    var conv = store.get(convId);
    if (!conv) return null;
    var msgs = conv.messages || [];
    var idx = msgs.findIndex(function(m) { return m.id === userMsgId; });
    if (idx < 0) return null;
    var userMsg = msgs[idx];
    if (userMsg.role !== 'user') return null;

    // Trunca todos los mensajes después del editado (incluyendo el assistant
    // reply al prompt original)
    var kept = msgs.slice(0, idx);
    // Reemplaza el user msg con el nuevo content
    var editedUser = Object.assign({}, userMsg, {
      content: newContent,
      editedAt: Date.now(),
    });
    kept.push(editedUser);

    // Crea nuevo placeholder assistant
    var newAssistantId = 'msg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    kept.push({
      id: newAssistantId,
      role: 'assistant',
      content: '',
      state: 'reasoning',
      createdAt: Date.now(),
    });

    // Reemplaza messages completos via update() — no hay setter directo, así
    // que hacemos delete + create con mismo id + push items
    // Más simple: usar store internals si están disponibles. El store actual
    // solo expone addMessage/updateMessage/deleteConversation. Hack: rebuild
    // la conversación con create() (nuevo id) NO sirve. Mejor: mutar messages
    // del current via updateMessage en cada uno... pero eso no permite truncar.
    //
    // Solución: agregamos un método pequeño al store. Si no existe, usamos
    // fallback "replace via patch genérico" inyectando un nuevo arreglo.
    if (store._replaceMessages) {
      store._replaceMessages(convId, kept);
    } else {
      // Hack: mutación directa (todos los stores Mentex son patrones IIFE
      // accesibles via window — no ideal pero pragmático para mock).
      // En vez de mutar, disparamos un evento que ia-flow consuma.
      window.dispatchEvent(new CustomEvent('mtx:coach-engine-replace-messages', {
        detail: { convId: convId, messages: kept },
      }));
    }

    // Dispara nueva generación con el prompt editado
    return _generate({
      convId: convId,
      msgId: newAssistantId,
      prompt: newContent,
      mode: 'fresh',
    });
  }

  // ─ Public API ──────────────────────────────────────────────────────────────
  window.__mtxCoachEngine = {
    generate: _generate,
    cancel: _cancel,
    isActive: _isActive,
    regenerate: _regenerate,
    continueMsg: _continueMsg,
    editUserMessage: _editUserMessage,
    getContext: _buildContext,
    // Diagnostics — devTools / debug overlay
    diagnostics: function() {
      return {
        activeStreams: Object.keys(_activeStreams),
        activeCount: Object.keys(_activeStreams).length,
      };
    },
  };
})();
