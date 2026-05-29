// screens/coach-proposals-detection.jsx — Sprint A.13.2
// ─────────────────────────────────────────────────────────────────────────────
//
// Detection layer para los 3 tipos de propuestas del coach.
// Memory ya tiene su detection en ia-flow.jsx (_processMemoryDetection).
// Este módulo añade Knowledge + Skill detection, escuchando los mismos eventos
// chat (mtx:ia-message-sent) y emitiendo mtx:coach-proposal cuando aplica.
//
// ARQUITECTURA:
//   - Listener único de mtx:ia-message-sent
//   - 3 detectors independientes (memory delegado a ia-flow, knowledge + skill acá)
//   - Heurística mock (regex + análisis de conversación). Drop-in ready Brandon:
//     reemplaza por LLM tool-use con funciones propose_knowledge / propose_skill
//
// KNOWLEDGE DETECTION:
//   • URL pegada en chat (http:// o https://)
//   • Texto largo pegado (>400 chars sin "¿") → señal de paste de contenido
//   • Frase "guarda este artículo" / "recuerda este link" / "esto es importante"
//   → confidence alta (0.85+) porque es siempre user-pedido
//
// SKILL DETECTION:
//   • Frase explícita "guarda como skill" / "esto es un workflow"
//   • Steps numerados (1. 2. 3.) en mensaje del user
//   • Patrón conversación recurrente (3+ msgs sobre el mismo tema)
//   → confidence media (0.65-0.85) porque requiere validación humana
//
// ANTI-SPAM:
//   - Cooldown: máx 1 propuesta de cada tipo cada 60s
//   - Dedup: no proponer si ya hay pending del mismo tipo con name similar
//   - Skip si user está en medio de un Wellness session (focus)
//
// localStorage: cooldowns vía Date.now() en memoria (no persistente, OK)
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxCoachProposalsDetection) return;

  // ──────────────────────────────────────────────────────────────────────────
  // Cooldowns en memoria
  // ──────────────────────────────────────────────────────────────────────────
  var _lastProposalTime = {
    memory: 0,
    knowledge: 0,
    skill: 0,
  };
  var COOLDOWN_MS = 60 * 1000;  // 1 min entre propuestas del mismo tipo

  function _canPropose(type) {
    var now = Date.now();
    return (now - _lastProposalTime[type]) >= COOLDOWN_MS;
  }
  function _markProposed(type) {
    _lastProposalTime[type] = Date.now();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────
  function _capitalize(str) {
    var s = String(str || '').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function _truncate(s, max) {
    if (!s) return '';
    if (s.length <= max) return s;
    return s.substring(0, max).trim() + '…';
  }
  function _emit(detail) {
    try {
      window.dispatchEvent(new CustomEvent('mtx:coach-proposal', { detail: detail }));
    } catch (e) { /* no-op */ }
  }
  function _hasPendingSimilar(type, name) {
    if (!window.__mtxIAProposals) return false;
    var pending = window.__mtxIAProposals.getPending();
    var normalize = function(s) { return String(s || '').toLowerCase().trim(); };
    var target = normalize(name);
    return pending.some(function(p) {
      return p.type === type && normalize(p.draft.name) === target;
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // KNOWLEDGE DETECTION
  // ──────────────────────────────────────────────────────────────────────────
  // 3 triggers de mayor a menor prioridad:
  //   1. Frase explícita "guarda este artículo / link / esto / etc"
  //      → highest confidence 0.95
  //   2. URL pegada (http(s)://...)
  //      → 0.85 (frecuente en chat de coach)
  //   3. Bloque grande pegado de texto (>400 chars, sin ?)
  //      → 0.75 (puede ser excerpt de artículo o nota)
  var _KNOWLEDGE_EXPLICIT_PATTERN = /\b(?:guarda|guardar|recuerda|memoriza|toma\s+nota\s+de|anota|ingiere|añade\s+a\s+(?:mi\s+)?conocimiento)\s+(?:este|esto|esta)\s*(?:art[íi]culo|link|enlace|url|texto|nota|p[áa]gina|recurso|video|podcast|paper)?\b/i;
  var _URL_PATTERN = /(https?:\/\/[^\s]+)/i;
  var _MIN_PASTE_LENGTH = 400;

  function _detectKnowledge(content) {
    if (!content || typeof content !== 'string') return null;
    var trimmed = content.trim();
    if (trimmed.length < 10) return null;

    // 1. URL detection (prioridad alta — siempre intentamos proponer)
    var urlMatch = trimmed.match(_URL_PATTERN);
    if (urlMatch) {
      var url = urlMatch[1];
      // Extraer hostname para nombre default
      var hostname = '';
      try {
        hostname = new URL(url).hostname.replace(/^www\./, '');
      } catch (e) {
        hostname = url.replace(/^https?:\/\//, '').split('/')[0] || 'URL';
      }
      // Inferir dominio por hostname conocido
      var dominio = _inferDominio(hostname + ' ' + trimmed);
      var explicit = _KNOWLEDGE_EXPLICIT_PATTERN.test(trimmed);
      return {
        confidence: explicit ? 0.95 : 0.85,
        draft: {
          name: 'Artículo de ' + hostname,
          whenToUse: 'Al hablar de ' + dominio,
          content: trimmed,
          domain: dominio,
          kind: 'url',
          url: url,
        },
      };
    }

    // 2. Texto largo pegado (paste detection)
    if (trimmed.length >= _MIN_PASTE_LENGTH && trimmed.indexOf('?') === -1) {
      var explicitPaste = _KNOWLEDGE_EXPLICIT_PATTERN.test(trimmed);
      // Si NO es explícito, solo proponer si parece "contenido informativo"
      // (mucha proporción de párrafo vs lista corta)
      if (!explicitPaste && trimmed.split('\n').length > 8 && trimmed.length < 600) {
        // Probable lista de bullets, no contenido → skip
        return null;
      }
      var firstLine = trimmed.split('\n')[0].trim();
      var nameGuess = firstLine.length > 4 && firstLine.length < 80
        ? firstLine
        : 'Nota del ' + new Date().toLocaleDateString('es', { month: 'short', day: 'numeric' });

      return {
        confidence: explicitPaste ? 0.9 : 0.75,
        draft: {
          name: nameGuess,
          whenToUse: '',
          content: trimmed,
          domain: _inferDominio(trimmed),
          kind: 'text',
        },
      };
    }

    // 3. Frase explícita SIN URL/texto largo (raro pero válido)
    // Ej: "guarda esto: la productividad nace de la atención profunda"
    if (_KNOWLEDGE_EXPLICIT_PATTERN.test(trimmed) && trimmed.length > 30) {
      var afterColon = trimmed.split(':').slice(1).join(':').trim();
      var body = afterColon || trimmed;
      return {
        confidence: 0.85,
        draft: {
          name: _truncate(body, 60),
          whenToUse: '',
          content: body,
          domain: _inferDominio(body),
          kind: 'text',
        },
      };
    }

    return null;
  }

  // Inferir dominio simple por keywords. Brandon LLM real lo hace mejor.
  function _inferDominio(text) {
    var t = String(text || '').toLowerCase();
    if (/\b(productividad|enfoque|deep\s*work|focus|gestion[a-z]+\s+de\s+tiempo|atomico)/i.test(t)) return 'productividad';
    if (/\b(meditaci[óo]n|mindfulness|respira|estrés|ansiedad|bienestar|salud|sue[ñn]o|cortisol)/i.test(t)) return 'bienestar';
    if (/\b(aprend|estudi|curso|leer|libro|paper|investigac|tecnolog[íi]a|ciencia)/i.test(t)) return 'aprendizaje';
    if (/\b(escrib|dise[ñn]o|creat|arte|m[úu]sica|video|narrat|storytell)/i.test(t)) return 'creatividad';
    if (/\b(relacion|pareja|amigos|comunidad|empat[íi]a|conversaci[óo]n)/i.test(t)) return 'relaciones';
    return 'productividad';  // default neutral
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SKILL DETECTION
  // ──────────────────────────────────────────────────────────────────────────
  // Más sutil — requiere análisis de contexto, no solo de un mensaje.
  // 3 paths:
  //   1. Frase explícita "guarda como skill" / "esto es un workflow"
  //      → confidence 0.95
  //   2. Steps numerados en el mensaje (3+ items "1. 2. 3.")
  //      → confidence 0.75 (es un "how-to" potencial)
  //   3. Conversación recurrente — 3+ mensajes del user sobre el mismo
  //      tema, donde el coach dio respuestas estructuradas
  //      → confidence 0.65 (sutil, alto risk de spam)
  //
  // Path 3 es el más interesante pero más arriesgado; lo mantengo conservador.
  var _SKILL_EXPLICIT_PATTERN = /\b(?:guarda(?:r)?|crear?|hac(?:er|elo))\s+(?:esto|esta|esa|esa\s+conversaci[óo]n)\s+(?:como\s+|en\s+)?(?:skill|habilidad|workflow|flujo|rutina|procedimiento)\b/i;
  var _SKILL_SECONDARY_PATTERN = /\b(?:esto|esta\s+conversaci[óo]n)\s+(?:la\s+)?(?:repito|hago\s+(?:siempre|cada|todos\s+los)|es\s+(?:mi|un)\s+(?:proceso|workflow|patr[óo]n|rutina))\b/i;
  var _STEPS_PATTERN = /^\s*1[\.\)]\s+.+\n+\s*2[\.\)]\s+.+\n+\s*3[\.\)]/m;

  function _detectSkill(content, convContext) {
    if (!content || typeof content !== 'string') return null;
    var trimmed = content.trim();
    if (trimmed.length < 12) return null;

    // 1. Frase explícita "como skill" — máxima prioridad
    if (_SKILL_EXPLICIT_PATTERN.test(trimmed) || _SKILL_SECONDARY_PATTERN.test(trimmed)) {
      var skillName = _extractSkillNameFromExplicit(trimmed, convContext);
      var skillContent = _extractSkillContentFromContext(convContext) || trimmed;
      var triggers = _inferTriggers(skillContent);
      return {
        confidence: 0.92,
        draft: {
          name: skillName,
          whenToUse: triggers.join(', '),
          content: skillContent,
          triggers: triggers,
        },
      };
    }

    // 2. Steps numerados — detecta "how-to" del user
    if (_STEPS_PATTERN.test(trimmed)) {
      var firstLine = trimmed.split('\n')[0].trim();
      var nameGuess = firstLine.length > 4 && firstLine.length < 80
        ? firstLine.replace(/^#+\s*/, '').replace(/[:.]$/, '')
        : 'Procedimiento del ' + new Date().toLocaleDateString('es', { month: 'short', day: 'numeric' });
      return {
        confidence: 0.75,
        draft: {
          name: nameGuess,
          whenToUse: '',
          content: trimmed,
          triggers: _inferTriggers(trimmed),
        },
      };
    }

    // 3. Conversación recurrente (path conservador — solo si user da señal fuerte)
    // No lo activamos por default. Requiere convContext con análisis de >5 msgs
    // del user sobre mismo tema → fuera de scope del mock simple.

    return null;
  }

  // Extraer nombre de skill desde frase explícita o última pregunta del coach
  function _extractSkillNameFromExplicit(trimmed, convContext) {
    // Si user dijo "guarda como skill X" → captura X
    var m = trimmed.match(/\b(?:como\s+|llamala\s+|llamalo\s+|skill\s+)['"]?([\wáéíóúñü\s-]{3,40}?)['"]?$/i);
    if (m && m[1].length >= 3) {
      return _capitalize(m[1].trim());
    }
    // Fallback: usar el tema principal de la conversación
    if (convContext && convContext.lastUserMessages) {
      var topics = convContext.lastUserMessages
        .map(function(msg) { return msg.content.split(/[.\?!]/)[0]; })
        .filter(function(s) { return s.length > 10 && s.length < 60; });
      if (topics.length > 0) return _truncate(topics[0], 50);
    }
    return 'Skill del ' + new Date().toLocaleDateString('es', { month: 'short', day: 'numeric' });
  }

  // Extraer contenido de skill desde mensajes coach previos de la conv
  function _extractSkillContentFromContext(convContext) {
    if (!convContext || !convContext.lastCoachMessages || convContext.lastCoachMessages.length === 0) {
      return null;
    }
    // Tomar el último mensaje sustancioso del coach (>100 chars)
    var sustancial = convContext.lastCoachMessages
      .filter(function(m) { return m.content && m.content.length > 100; })
      .slice(-3);
    if (sustancial.length === 0) return null;
    return sustancial.map(function(m) { return m.content; }).join('\n\n');
  }

  // Inferir triggers (frases corta que activarían la skill después)
  function _inferTriggers(content) {
    var t = String(content || '').toLowerCase();
    var triggers = [];

    if (/\b(plane[ao]r?\s+(?:el\s+|la\s+|mi\s+)?(?:d[íi]a|semana|mes)|agendar|organizar\s+tiempo)\b/i.test(t)) triggers.push('planear el día');
    if (/\b(meditac|respir|mindful)/i.test(t)) triggers.push('meditar');
    if (/\b(escrib|redactar|estructurar\s+texto|brief|copy)/i.test(t)) triggers.push('escribir');
    if (/\b(estudiar|aprender|leer\s+(?:un|el)\s+(?:paper|libro|art[íi]culo))/i.test(t)) triggers.push('estudiar');
    if (/\b(decidir|elegir|comparar\s+opciones)/i.test(t)) triggers.push('decidir');
    if (/\b(reflexion|journal|introspec)/i.test(t)) triggers.push('reflexionar');
    if (/\b(planear\s+(?:la\s+)?semana|review\s+(?:semanal|del?\s+domingo))/i.test(t)) triggers.push('review semanal');

    if (triggers.length === 0) {
      // Fallback genérico extrayendo primer verbo en infinitivo
      var verbMatch = t.match(/\b(planear|escribir|estudiar|decidir|crear|hacer|preparar|revisar|analizar)\b/);
      if (verbMatch) triggers.push(verbMatch[1]);
    }

    return triggers.slice(0, 3);  // máx 3 triggers
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Conversación context helper
  // ──────────────────────────────────────────────────────────────────────────
  function _gatherConvContext(convId) {
    if (!window.__mtxIAChat || !convId) return null;
    var conv = window.__mtxIAChat.getCurrent && window.__mtxIAChat.getCurrent();
    if (!conv) return null;
    var msgs = conv.messages || [];
    // Últimos 6 mensajes para context (3 user + 3 coach aprox)
    var recent = msgs.slice(-6);
    return {
      lastUserMessages: recent.filter(function(m) { return m.role === 'user'; }),
      lastCoachMessages: recent.filter(function(m) { return m.role === 'assistant'; }),
      totalMessages: msgs.length,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Main listener — mtx:ia-message-sent
  // ──────────────────────────────────────────────────────────────────────────
  // El listener corre DESPUÉS de _processMemoryDetection (que vive en ia-flow.jsx
  // y se invoca dentro de handleSendFromInput). Eventos en window son orden de
  // registro; este módulo carga después de ia-flow, así que su listener es 2do.
  //
  // Skip si:
  //   - User está en sesión wellness activa (no interrumpir)
  //   - Cooldown del tipo no cumplido
  //   - Ya hay pending similar
  function _onMessageSent(e) {
    var detail = e && e.detail;
    if (!detail || !detail.content) return;
    var content = detail.content;
    var convId = detail.convId;
    var msgId = detail.msgId;

    // Skip si wellness activo (UX defensiva — no interrumpir flow terapéutico)
    if (window.__mtxWellness && window.__mtxWellness.getActiveSession) {
      var wActive = window.__mtxWellness.getActiveSession();
      if (wActive && wActive.status !== 'completed' && wActive.status !== 'cancelled') return;
    }

    var convContext = _gatherConvContext(convId);

    // 1. KNOWLEDGE
    if (_canPropose('knowledge')) {
      var k = _detectKnowledge(content);
      if (k && !_hasPendingSimilar('knowledge', k.draft.name)) {
        _markProposed('knowledge');
        _emit({
          type: 'knowledge',
          draft: k.draft,
          confidence: k.confidence,
          sourceMessageId: msgId,
          sourceConvId: convId,
        });
      }
    }

    // 2. SKILL
    if (_canPropose('skill')) {
      var s = _detectSkill(content, convContext);
      if (s && !_hasPendingSimilar('skill', s.draft.name)) {
        _markProposed('skill');
        _emit({
          type: 'skill',
          draft: s.draft,
          confidence: s.confidence,
          sourceMessageId: msgId,
          sourceConvId: convId,
        });
      }
    }
  }

  window.addEventListener('mtx:ia-message-sent', _onMessageSent);

  // ──────────────────────────────────────────────────────────────────────────
  // Exposed API (para testing + slash commands futuros)
  // ──────────────────────────────────────────────────────────────────────────
  window.__mtxCoachProposalsDetection = {
    detectKnowledge: _detectKnowledge,
    detectSkill: function(content, convId) {
      return _detectSkill(content, _gatherConvContext(convId));
    },
    inferDominio: _inferDominio,
    inferTriggers: _inferTriggers,
    // Permite resetear cooldowns en testing
    _resetCooldowns: function() {
      _lastProposalTime.memory = 0;
      _lastProposalTime.knowledge = 0;
      _lastProposalTime.skill = 0;
    },
  };
})();
