// screens/coach-wellness-store.jsx — Sprint A.9 · Wellness Exercises
// ─────────────────────────────────────────────────────────────────────────────
//
// Catálogo + state machine para ejercicios somáticos guiados que el coach
// puede invocar inline en el chat cuando detecta estrés/ansiedad/sobrecarga.
//
// Diferenciador real vs ChatGPT/Claude:
//   ChatGPT: "deberías respirar 3 veces, te ayudará a calmarte"
//   Mentex:  abre un mini-player guiado, animación somática, cuenta los
//            ciclos por vos, te acompaña durante la práctica.
//
// 7 tipos de ejercicios curados:
//   1. box_breathing      — 4-4-4-4 con cuadrado animado
//   2. four_seven_eight   — 4-7-8 (Dr. Andrew Weil) con halo expandiendo
//   3. coherent_breathing — 6-6 onda sinusoidal (HRV optimal)
//   4. body_scan          — silueta iluminándose por zonas
//   5. stretching         — secuencia de posturas con countdown
//   6. grounding_54321    — 5 sentidos secuenciales (anti-pánico)
//   7. eye_rest_202020    — 20s mirada lejana (anti-fatiga digital)
//
// State machine (universal, todos los ejercicios la usan):
//   { id, type, status: 'ready'|'running'|'paused'|'completed'|'cancelled',
//     cycleIdx, phaseIdx, phaseStartedAt, totalCycles, currentPhaseLabel }
//
// Drop-in ready Brandon: cuando llegue backend, el coach LLM elige el tipo
// + parámetros (totalCycles, intensity) y el frontend renderiza identical.
//
// Eventos emitidos:
//   mtx:wellness-state           { sessionId, status, cycleIdx, phaseIdx, ... }
//   mtx:wellness-phase-change    { sessionId, phase: { label, durationMs, ... } }
//   mtx:wellness-completed       { sessionId, type, cyclesDone, totalMs }
//
// API pública (window.__mtxWellness):
//   .start({ type, totalCycles?, intensity? }) → { sessionId }
//   .pause(sessionId)
//   .resume(sessionId)
//   .skip(sessionId)        // saltar al siguiente ciclo
//   .cancel(sessionId)
//   .getState(sessionId)
//   .listExercises()        // catálogo
//   .getExercise(type)
//   .detectStressLevel(text) → 'low' | 'medium' | 'high' | null
//   .recommendExercise(stressLevel, prompt) → exerciseType
//
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxWellness) return;

  // Snapshot de tokens (fallback si no cargó aún)
  function _tokens() {
    return (window.__mtxColorTokens && window.__mtxColorTokens.core) || {
      neon: '#3dffd1', purple: '#9b8aff', gold: '#ffc850', sky: '#5a8fff',
      rose: '#ff6a8a', peach: '#ffd28c', cyan: '#5acfff', sage: '#9bccaa',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Catálogo de ejercicios — 7 tipos con sus fases y duraciones
  // ──────────────────────────────────────────────────────────────────────────
  // Cada exercise tiene:
  //   • type        identifier único
  //   • label       título visible para el user
  //   • tagline     una línea de propósito
  //   • icon        emoji
  //   • accent      color token (de __mtxColorTokens.core)
  //   • durationLabel  "~2-4 min" (descriptive)
  //   • defaultCycles  cantidad de ciclos por defecto
  //   • phases     [{ id, label, durationSec, hint }]
  //   • benefits    ["calma anticipatoria", "reduce HRV", ...]
  //   • bestFor     ["antes de presentación", "al despertar", ...]
  function _buildCatalog() {
    var t = _tokens();
    return [
      {
        type: 'box_breathing',
        label: 'Respiración Box',
        tagline: 'Cuadrado 4-4-4-4 · serenidad militar',
        icon: '🌬',
        accent: t.neon,
        accentName: 'neon',
        durationLabel: '~2 min',
        defaultCycles: 5,
        phases: [
          { id: 'inhale',     label: 'Inhala',         durationSec: 4, hint: 'Nariz, lleno y suave' },
          { id: 'hold_in',    label: 'Sostén',         durationSec: 4, hint: 'Aire arriba del pecho' },
          { id: 'exhale',     label: 'Exhala',         durationSec: 4, hint: 'Boca, vacía completo' },
          { id: 'hold_out',   label: 'Sostén',         durationSec: 4, hint: 'Vacío, pausa total' },
        ],
        benefits: ['Calma anticipatoria · Navy SEALs', 'Activa parasimpático', 'Reduce cortisol rápido'],
        bestFor: ['Antes de presentación', 'Cuando todo es urgente', 'Para volver al cuerpo'],
      },
      {
        type: 'four_seven_eight',
        label: 'Respiración 4-7-8',
        tagline: 'Inhala 4 · sostén 7 · exhala 8',
        icon: '💜',
        accent: t.purple,
        accentName: 'purple',
        durationLabel: '~2-4 min',
        defaultCycles: 4,
        phases: [
          { id: 'inhale',  label: 'Inhala',  durationSec: 4, hint: 'Por la nariz, contando 4' },
          { id: 'hold',    label: 'Sostén',  durationSec: 7, hint: 'Aire en pulmones plenos' },
          { id: 'exhale',  label: 'Exhala',  durationSec: 8, hint: 'Boca, sonido suave de viento' },
        ],
        benefits: ['Dormirte rápido · Dr. Weil', 'Reset del sistema nervioso', 'Anti-ansiedad poderoso'],
        bestFor: ['Insomnio leve', 'Pánico naciente', 'Antes de dormir'],
      },
      {
        type: 'coherent_breathing',
        label: 'Respiración coherente',
        tagline: 'Onda 6-6 · HRV óptimo',
        icon: '🌊',
        accent: t.sky,
        accentName: 'sky',
        durationLabel: '~3-5 min',
        defaultCycles: 10,
        phases: [
          { id: 'inhale',  label: 'Inhala',  durationSec: 6, hint: 'Lento, parejo, profundo' },
          { id: 'exhale',  label: 'Exhala',  durationSec: 6, hint: 'Lento, parejo, vacío' },
        ],
        benefits: ['Sincroniza corazón + respiración', 'Mejora HRV medible', 'Sustento meditativo'],
        bestFor: ['Práctica diaria', 'Pre-meditación', 'Foco prolongado'],
      },
      {
        type: 'body_scan',
        label: 'Body Scan',
        tagline: 'Atención por zonas · de pies a cabeza',
        icon: '🧠',
        accent: t.peach,
        accentName: 'peach',
        durationLabel: '~5 min',
        defaultCycles: 1,
        phases: [
          { id: 'feet',     label: 'Pies',           durationSec: 25, hint: 'Siente plantas, dedos, tobillos' },
          { id: 'legs',     label: 'Piernas',        durationSec: 25, hint: 'Pantorrillas, rodillas, muslos' },
          { id: 'pelvis',   label: 'Pelvis',         durationSec: 20, hint: 'Caderas, base del torso' },
          { id: 'belly',    label: 'Abdomen',        durationSec: 25, hint: 'Vísceras blandas, respiración' },
          { id: 'chest',    label: 'Pecho',          durationSec: 25, hint: 'Pulmones, corazón latiendo' },
          { id: 'arms',     label: 'Brazos',         durationSec: 25, hint: 'Hombros, brazos, manos, dedos' },
          { id: 'neck',     label: 'Cuello',         durationSec: 20, hint: 'Base del cráneo, garganta' },
          { id: 'face',     label: 'Rostro',         durationSec: 25, hint: 'Mandíbula suelta, frente lisa' },
          { id: 'crown',    label: 'Coronilla',      durationSec: 20, hint: 'Cima del cráneo, cuero cabelludo' },
          { id: 'whole',    label: 'Todo el cuerpo', durationSec: 30, hint: 'Contén todo a la vez' },
        ],
        benefits: ['Reconecta cuerpo-mente', 'Detecta tensiones invisibles', 'Mindfulness clásico MBSR'],
        bestFor: ['Después de trabajo intenso', 'Antes de dormir profundamente', 'Días de mucha mente'],
      },
      {
        type: 'stretching',
        label: 'Estiramiento guiado',
        tagline: 'Secuencia de oficina · 5 posturas',
        icon: '🤸',
        accent: t.gold,
        accentName: 'gold',
        durationLabel: '~3 min',
        defaultCycles: 1,
        phases: [
          { id: 'neck_roll',    label: 'Rotación de cuello',     durationSec: 30, hint: 'Lento, 3 vueltas cada lado' },
          { id: 'shoulder_roll',label: 'Hombros hacia atrás',    durationSec: 25, hint: 'Círculos grandes, 8 reps' },
          { id: 'side_bend',    label: 'Inclinación lateral',    durationSec: 35, hint: 'Brazo arriba, mano a la cadera' },
          { id: 'spine_twist',  label: 'Torsión sentada',        durationSec: 30, hint: 'Suave, sin forzar' },
          { id: 'forward_fold', label: 'Inclinación adelante',   durationSec: 40, hint: 'Cabeza cuelga, suelta peso' },
        ],
        benefits: ['Suelta cuello + hombros', 'Reactiva circulación', 'Anti-postura sedentaria'],
        bestFor: ['Cada 90 min de trabajo', 'Después de calls largas', 'Pausa activa'],
      },
      {
        type: 'grounding_54321',
        label: '5-4-3-2-1 Grounding',
        tagline: 'Anti-pánico · los 5 sentidos',
        icon: '🖐',
        accent: t.sage,
        accentName: 'sage',
        durationLabel: '~3 min',
        defaultCycles: 1,
        phases: [
          { id: 'see_5',    label: '5 cosas que VES',       durationSec: 40, hint: 'Mira alrededor. Nómbralas mentalmente.' },
          { id: 'touch_4',  label: '4 cosas que TOCAS',     durationSec: 35, hint: 'Textura de tu ropa, mesa, piel.' },
          { id: 'hear_3',   label: '3 cosas que OYES',      durationSec: 30, hint: 'Sonido lejano, cercano, tu propio cuerpo.' },
          { id: 'smell_2',  label: '2 cosas que HUELES',    durationSec: 25, hint: 'Aire, café, perfume, lo que sea.' },
          { id: 'taste_1',  label: '1 cosa que SABOREAS',   durationSec: 20, hint: 'Tu boca, restos de algo, agua.' },
        ],
        benefits: ['Detiene espiral de pánico', 'Trae al presente físico', 'Técnica clínica PTSD'],
        bestFor: ['Pánico naciente', 'Disociación', 'Cuando la cabeza no para'],
      },
      {
        type: 'eye_rest_202020',
        label: 'Descanso visual',
        tagline: '20-20-20 · mirada lejana',
        icon: '👁',
        accent: t.cyan,
        accentName: 'cyan',
        durationLabel: '20s',
        defaultCycles: 1,
        phases: [
          { id: 'look_far',     label: 'Mirá a 6 metros',     durationSec: 20, hint: 'Algo lejano: ventana, pared al fondo' },
        ],
        benefits: ['Relaja músculo ciliar', 'Anti-fatiga digital', 'Recomendación oftalmológica'],
        bestFor: ['Cada 20 min de pantalla', 'Después de calls', 'Sequedad ocular'],
      },
    ];
  }

  var _CATALOG = null;
  function listExercises() {
    if (!_CATALOG) _CATALOG = _buildCatalog();
    return _CATALOG.slice();
  }
  function getExercise(type) {
    var cat = listExercises();
    for (var i = 0; i < cat.length; i++) if (cat[i].type === type) return cat[i];
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // State machine — gestiona ciclos + fases de una sesión activa
  // ──────────────────────────────────────────────────────────────────────────
  // Cada sesión tiene su propio state. Múltiples sesiones simultáneas son
  // posibles (no recomendado por UX, pero técnicamente safe).
  //
  // Lifecycle:
  //   start()    → status: 'ready' (UI muestra "Iniciar")
  //   onStart()  → status: 'running' (timer corre, emits phase-change cada N seg)
  //   pause()    → status: 'paused'  (timer pausado, preserve phase/cycle)
  //   resume()   → status: 'running'
  //   skip()     → next cycle, reset phase to 0
  //   cancel()   → status: 'cancelled' (clean up timer)
  //   onComplete → status: 'completed' (sin timer, persists hasta unmount)
  //
  var _sessions = {};
  var _sessionTimers = {};
  var _sessionSeq = 0;

  function _genSessionId() {
    _sessionSeq += 1;
    return 'wellness-' + Date.now().toString(36) + '-' + _sessionSeq;
  }

  function _emit(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail })); }
    catch (e) { /* no-op */ }
  }

  function start(opts) {
    opts = opts || {};
    var exercise = getExercise(opts.type);
    if (!exercise) return Promise.reject(new Error('Tipo de ejercicio no encontrado: ' + opts.type));
    var sessionId = _genSessionId();
    _sessions[sessionId] = {
      sessionId: sessionId,
      type: exercise.type,
      status: 'ready',
      cycleIdx: 0,
      phaseIdx: 0,
      phaseStartedAt: 0,
      totalCycles: opts.totalCycles || exercise.defaultCycles,
      intensity: opts.intensity || 'medium',
      startedAt: Date.now(),
      pausedAt: 0,
      pausedAccum: 0,  // ms acumulados pausado (para timing real)
    };
    return Promise.resolve({ sessionId: sessionId, exercise: exercise });
  }

  function _beginRunning(sessionId) {
    var s = _sessions[sessionId];
    if (!s || s.status === 'cancelled' || s.status === 'completed') return;
    s.status = 'running';
    s.phaseStartedAt = Date.now();
    _runPhaseTimer(sessionId);
    _emit('mtx:wellness-state', _stateSnapshot(s));
  }

  function _runPhaseTimer(sessionId) {
    var s = _sessions[sessionId];
    if (!s || s.status !== 'running') return;
    var exercise = getExercise(s.type);
    if (!exercise) return;
    var phase = exercise.phases[s.phaseIdx];
    if (!phase) return;

    var durationMs = phase.durationSec * 1000;
    var elapsed = Date.now() - s.phaseStartedAt;
    var remaining = Math.max(0, durationMs - elapsed);

    _emit('mtx:wellness-phase-change', {
      sessionId: sessionId,
      phase: phase,
      cycleIdx: s.cycleIdx,
      phaseIdx: s.phaseIdx,
      totalPhases: exercise.phases.length,
      totalCycles: s.totalCycles,
    });

    _sessionTimers[sessionId] = setTimeout(function() {
      var current = _sessions[sessionId];
      if (!current || current.status !== 'running') return;
      _advancePhase(sessionId);
    }, remaining);
  }

  function _advancePhase(sessionId) {
    var s = _sessions[sessionId];
    if (!s) return;
    var exercise = getExercise(s.type);
    var nextPhaseIdx = s.phaseIdx + 1;

    if (nextPhaseIdx >= exercise.phases.length) {
      // Fin del ciclo — pasa al siguiente o completa
      var nextCycleIdx = s.cycleIdx + 1;
      if (nextCycleIdx >= s.totalCycles) {
        _completeSession(sessionId);
        return;
      }
      s.cycleIdx = nextCycleIdx;
      s.phaseIdx = 0;
    } else {
      s.phaseIdx = nextPhaseIdx;
    }

    s.phaseStartedAt = Date.now();
    _runPhaseTimer(sessionId);
    _emit('mtx:wellness-state', _stateSnapshot(s));
  }

  function _completeSession(sessionId) {
    var s = _sessions[sessionId];
    if (!s) return;
    s.status = 'completed';
    s.completedAt = Date.now();
    if (_sessionTimers[sessionId]) {
      clearTimeout(_sessionTimers[sessionId]);
      delete _sessionTimers[sessionId];
    }
    var exercise = getExercise(s.type);
    var totalMs = s.completedAt - s.startedAt - s.pausedAccum;
    _emit('mtx:wellness-completed', {
      sessionId: sessionId,
      type: s.type,
      label: exercise && exercise.label,
      cyclesDone: s.totalCycles,
      totalMs: totalMs,
      totalSeconds: Math.round(totalMs / 1000),
    });
    _emit('mtx:wellness-state', _stateSnapshot(s));
  }

  function _stateSnapshot(s) {
    var exercise = getExercise(s.type);
    var phase = exercise && exercise.phases[s.phaseIdx];
    return {
      sessionId: s.sessionId,
      type: s.type,
      status: s.status,
      cycleIdx: s.cycleIdx,
      phaseIdx: s.phaseIdx,
      totalCycles: s.totalCycles,
      totalPhases: exercise ? exercise.phases.length : 0,
      currentPhaseLabel: phase ? phase.label : null,
      currentPhaseId: phase ? phase.id : null,
      currentPhaseDuration: phase ? phase.durationSec : 0,
      phaseStartedAt: s.phaseStartedAt,
    };
  }

  function getState(sessionId) {
    var s = _sessions[sessionId];
    if (!s) return null;
    return _stateSnapshot(s);
  }

  function play(sessionId) {
    var s = _sessions[sessionId];
    if (!s || s.status === 'completed' || s.status === 'cancelled') return false;
    if (s.status === 'ready') { _beginRunning(sessionId); return true; }
    if (s.status === 'paused') {
      // Resume
      s.pausedAccum += Date.now() - s.pausedAt;
      s.phaseStartedAt = Date.now() - (s.pausedAt - s.phaseStartedAt);
      s.status = 'running';
      _runPhaseTimer(sessionId);
      _emit('mtx:wellness-state', _stateSnapshot(s));
      return true;
    }
    return false;
  }

  function pause(sessionId) {
    var s = _sessions[sessionId];
    if (!s || s.status !== 'running') return false;
    s.status = 'paused';
    s.pausedAt = Date.now();
    if (_sessionTimers[sessionId]) {
      clearTimeout(_sessionTimers[sessionId]);
      delete _sessionTimers[sessionId];
    }
    _emit('mtx:wellness-state', _stateSnapshot(s));
    return true;
  }

  function skip(sessionId) {
    // Salta al siguiente ciclo (no a la siguiente fase)
    var s = _sessions[sessionId];
    if (!s || s.status === 'completed' || s.status === 'cancelled') return false;
    var exercise = getExercise(s.type);
    if (!exercise) return false;
    var nextCycleIdx = s.cycleIdx + 1;
    if (nextCycleIdx >= s.totalCycles) {
      _completeSession(sessionId);
      return true;
    }
    s.cycleIdx = nextCycleIdx;
    s.phaseIdx = 0;
    s.phaseStartedAt = Date.now();
    if (_sessionTimers[sessionId]) {
      clearTimeout(_sessionTimers[sessionId]);
      delete _sessionTimers[sessionId];
    }
    if (s.status === 'running') _runPhaseTimer(sessionId);
    _emit('mtx:wellness-state', _stateSnapshot(s));
    return true;
  }

  function cancel(sessionId) {
    var s = _sessions[sessionId];
    if (!s) return false;
    if (s.status === 'completed' || s.status === 'cancelled') return false;
    s.status = 'cancelled';
    s.cancelledAt = Date.now();
    if (_sessionTimers[sessionId]) {
      clearTimeout(_sessionTimers[sessionId]);
      delete _sessionTimers[sessionId];
    }
    _emit('mtx:wellness-state', _stateSnapshot(s));
    return true;
  }

  // Auto-cancel todas las sesiones activas (para cleanup al cambiar conv)
  function _cancelAllActive() {
    var count = 0;
    Object.keys(_sessions).forEach(function(id) {
      var s = _sessions[id];
      if (s && (s.status === 'running' || s.status === 'paused' || s.status === 'ready')) {
        cancel(id);
        count += 1;
      }
    });
    return count;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Stress detection — heurística simple keyword-based
  // ──────────────────────────────────────────────────────────────────────────
  // Cuando llegue backend con LLM real, esto se reemplaza por análisis
  // semántico sofisticado. Por ahora keyword match con scoring.
  //
  // Returns: 'low' | 'medium' | 'high' | null (no stress detected)
  function detectStressLevel(text) {
    if (!text || typeof text !== 'string') return null;
    var t = text.toLowerCase();
    // HIGH — palabras directas de pánico/crisis
    if (/(pánico|panico|no puedo respirar|me ahogo|crisis|colapso|no aguanto|estoy mal|me siento mal|ansiedad fuerte)/i.test(t)) {
      return 'high';
    }
    // MEDIUM — estrés evidente
    if (/(estresad|agobiad|abrumad|saturad|ansios|nervios|inquiet|me siento mal|no doy más|me supera|no me sale|frustrad|hart)/i.test(t)) {
      return 'medium';
    }
    // LOW — fatiga o tensión moderada
    if (/(cansad|exhaust|fundid|sin energ|aburrid|no puedo|atascad|atorad|necesito una pausa|necesito respirar|tensión|tens)/i.test(t)) {
      return 'low';
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Recomendación: stress level + prompt → mejor ejercicio
  // ──────────────────────────────────────────────────────────────────────────
  function recommendExercise(stressLevel, prompt) {
    var p = (prompt || '').toLowerCase();
    // Pánico/crisis aguda → 5-4-3-2-1 grounding (técnica clínica)
    if (stressLevel === 'high') {
      if (/respir|no puedo respirar/i.test(p)) return 'four_seven_eight';
      return 'grounding_54321';
    }
    // Estrés medio → box breathing (universal, accesible)
    if (stressLevel === 'medium') {
      if (/dormir|sueño|insomnio/i.test(p)) return 'four_seven_eight';
      if (/cuello|hombros|espalda|cuerpo/i.test(p)) return 'stretching';
      return 'box_breathing';
    }
    // Fatiga/tensión baja → coherent breathing o stretching
    if (stressLevel === 'low') {
      if (/cansad|fundid|pantalla|ojo/i.test(p)) return 'eye_rest_202020';
      if (/cuerpo|espalda|movimiento/i.test(p)) return 'stretching';
      return 'coherent_breathing';
    }
    // Por defecto si user pidió expresamente
    if (/box|cuadrado|4-4-4/i.test(p)) return 'box_breathing';
    if (/4-7-8|weil|dormir/i.test(p)) return 'four_seven_eight';
    if (/coher|hrv|onda/i.test(p)) return 'coherent_breathing';
    if (/scan|body|cuerpo entero/i.test(p)) return 'body_scan';
    if (/estir|stretch|cuello|hombros/i.test(p)) return 'stretching';
    if (/grounding|sentido|pánico/i.test(p)) return 'grounding_54321';
    if (/ojo|pantalla|visual|20-20/i.test(p)) return 'eye_rest_202020';
    return 'box_breathing';  // default seguro
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Cleanup global al cambiar de conversación
  // ──────────────────────────────────────────────────────────────────────────
  // Listener defensivo (igual que image-gen / video-gen).
  // Aplicado de lección Audit CRIT-6.
  var _lastConvId = window.__mtxIAChat && window.__mtxIAChat.getCurrentId
    ? window.__mtxIAChat.getCurrentId() : null;
  window.addEventListener('mtx:ia-chat-changed', function() {
    var nowId = window.__mtxIAChat && window.__mtxIAChat.getCurrentId
      ? window.__mtxIAChat.getCurrentId() : null;
    if (nowId !== _lastConvId) {
      _lastConvId = nowId;
      _cancelAllActive();
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────
  window.__mtxWellness = {
    // Catálogo
    listExercises: listExercises,
    getExercise: getExercise,
    // Session lifecycle
    start: start,
    play: play,
    pause: pause,
    skip: skip,
    cancel: cancel,
    getState: getState,
    // Detection + recommendation
    detectStressLevel: detectStressLevel,
    recommendExercise: recommendExercise,
    // Cleanup (internal use)
    _cancelAllActive: _cancelAllActive,
  };
})();
