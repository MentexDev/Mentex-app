// screens/ia-workflows.jsx — Fase 2.2: Tab Workflows del coach IA
// ─────────────────────────────────────────────────────────────────────────────
// Workflows = automatizaciones que el agente ejecuta SIN intervención
// conversacional. Diferencia clave con Skills (Fase 2.1):
//   • Skills:    trigger conversacional ("planifica mi semana")
//   • Workflows: trigger TEMPORAL (cron) o de EVENTO ("al completar sesión")
//
// Trigger kinds:
//   • cron   — schedule fijo (cada lunes 8am, cada noche 21:30, etc.)
//   • event  — reacción a evento del sistema (session-completed, mood-stress…)
//   • manual — ejecución on-demand (botón "Ejecutar ahora")
//
// Cuando entre Mastra en backend final:
//   • cron workflows → pg_cron + BullMQ scheduled jobs
//   • event workflows → event bus pub/sub (mismos events que el frontend emite)
//   • manual → HTTP endpoint /api/workflows/:id/execute
//   • Cada execution genera fila en workflow_runs con correlation_id, status,
//     duration_ms, error_payload → todo enterprise-grade desde día uno.
//
// Auto-detection (Fase 2.2 backend): cuando el user repite un patrón
// (ej. siempre activa la skill X después de la skill Y), Mentex propone
// convertirlo en workflow auto-ejecutado. Por ahora field `autoDetected: false`
// en todos los seeds.
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxIAWorkflows) return;

  // ── Categorías compartidas con Skills ───────────────────────────────────
  // Reusamos los accents de ia-skills si está cargado. Caemos a defaults
  // si todavía no se montó.
  var _CATEGORIES = (typeof window !== 'undefined' && window.__mtxIASkills && window.__mtxIASkills.getCategories)
    ? window.__mtxIASkills.getCategories()
    : {
        productividad: { label: 'Productividad', accent: '#3dffd1' },
        bienestar:     { label: 'Bienestar',     accent: '#9b8aff' },
        aprendizaje:   { label: 'Aprendizaje',   accent: '#5dd3ff' },
        creatividad:   { label: 'Creatividad',   accent: '#ffc850' },
        social:        { label: 'Social',        accent: '#ff8b8b' },
      };

  // ── Catálogo de eventos disponibles para workflows event-based ──────────
  // Cuando Mastra esté en backend, estos eventos los emiten los workers y los
  // workflows event-based se suscriben via subscription topic. Por ahora son
  // labels human-readable para que el builder los muestre.
  var _EVENT_CATALOG = [
    { id: 'session-completed', label: 'Al completar sesión de enfoque',  icon: '✅' },
    { id: 'session-started',   label: 'Al iniciar sesión de enfoque',     icon: '▶️' },
    { id: 'morning',           label: 'Al despertar (primer login)',      icon: '🌅' },
    { id: 'evening',           label: 'Al finalizar el día',              icon: '🌙' },
    { id: 'mood-stress',       label: 'Al detectar estrés en chat',       icon: '🔥' },
    { id: 'mood-happy',        label: 'Al detectar momento positivo',     icon: '✨' },
    { id: 'app-blocked',       label: 'Al bloquear apps distractoras',    icon: '🛑' },
    { id: 'streak-broken',     label: 'Al romper una racha',              icon: '💔' },
    { id: 'goal-stagnant',     label: 'Goal sin progreso 3+ días',        icon: '⏰' },
    { id: 'memory-saved',      label: 'Al guardar nueva memoria',          icon: '🧠' },
  ];

  // ── Catálogo OFICIAL — 8 workflows curados ──────────────────────────────
  // Mix de cron-based y event-based para mostrar todo el potencial.
  // qualityScore mock; en backend se actualiza por success rate real.
  var _OFFICIAL_WORKFLOWS = [
    {
      id: 'mtx-wf-daily-briefing',
      icon: '🌅',
      title: 'Daily briefing',
      description: 'Cada mañana al despertar, genera un resumen del día: prioridades, eventos del calendar, sugerencias del coach.',
      category: 'productividad',
      trigger: {
        kind: 'cron',
        cron: '0 7 * * *',
        cronHumanLabel: 'Todos los días a las 07:00',
      },
      steps: [
        'Lee tu calendar del día',
        'Identifica top 3 prioridades',
        'Sugiere primera sesión de enfoque',
        'Envía resumen al chat',
      ],
      defaultEnabled: true,
      qualityScore: 0.91,
      lastRunAt: Date.now() - 1000 * 60 * 60 * 9,  // hace 9h (esta mañana)
      lastRunStatus: 'success',
      totalRuns: 23,
    },
    {
      id: 'mtx-wf-weekly-review',
      icon: '📊',
      title: 'Weekly review automático',
      description: 'Cada domingo 18:00, genera un review semanal completo y lo envía como artifact al chat.',
      category: 'productividad',
      trigger: {
        kind: 'cron',
        cron: '0 18 * * 0',
        cronHumanLabel: 'Cada domingo a las 18:00',
      },
      steps: [
        'Resume sesiones de enfoque de la semana',
        'Detecta patrones de procrastinación',
        'Sugiere ajustes para la próxima semana',
        'Genera artifact con stats + insights',
      ],
      defaultEnabled: true,
      qualityScore: 0.88,
      lastRunAt: Date.now() - 1000 * 60 * 60 * 24 * 6,  // hace 6 días
      lastRunStatus: 'success',
      totalRuns: 8,
    },
    {
      id: 'mtx-wf-session-journal',
      icon: '📝',
      title: 'Journal post-sesión',
      description: 'Al completar una sesión de enfoque, pregunta una reflexión rápida de 2 minutos y la guarda en Conocimiento.',
      category: 'aprendizaje',
      trigger: {
        kind: 'event',
        eventId: 'session-completed',
        eventLabel: 'Al completar sesión de enfoque',
      },
      steps: [
        'Detecta evento session-completed',
        'Espera 30 segundos (no interrumpir)',
        'Pregunta "¿Qué aprendiste en esta sesión?"',
        'Guarda respuesta en Conocimiento',
      ],
      defaultEnabled: false,
      qualityScore: 0.85,
      lastRunAt: Date.now() - 1000 * 60 * 60 * 24 * 2,  // hace 2 días
      lastRunStatus: 'success',
      totalRuns: 12,
    },
    {
      id: 'mtx-wf-hydration',
      icon: '💧',
      title: 'Hidratación inteligente',
      description: 'Cada 90 min en horario de trabajo, te recuerda tomar agua. Pausa silenciosa si estás en sesión activa.',
      category: 'bienestar',
      trigger: {
        kind: 'cron',
        cron: '0 */90 9-18 * * *',
        cronHumanLabel: 'Cada 90 min · 9:00 a 18:00',
      },
      steps: [
        'Verifica horario laboral activo',
        'Chequea si user está en sesión de enfoque',
        'Si NO está en sesión → push notification',
        'Si SÍ → diferir 30 min',
      ],
      defaultEnabled: false,
      qualityScore: 0.79,
      lastRunAt: Date.now() - 1000 * 60 * 60 * 12,  // hace 12h
      lastRunStatus: 'success',
      totalRuns: 47,
    },
    {
      id: 'mtx-wf-goal-nudge',
      icon: '🎯',
      title: 'Nudge de meta estancada',
      description: 'Cuando una meta no tiene actividad por 3+ días, el coach te pregunta qué bloquea el progreso.',
      category: 'productividad',
      trigger: {
        kind: 'event',
        eventId: 'goal-stagnant',
        eventLabel: 'Goal sin progreso 3+ días',
      },
      steps: [
        'Detecta meta sin actividad 3+ días',
        'Espera momento de baja carga',
        'Pregunta "¿Qué bloquea tu meta X?"',
        'Sugiere micro-step accionable',
      ],
      defaultEnabled: true,
      qualityScore: 0.83,
      lastRunAt: null,  // nunca ejecutado
      lastRunStatus: null,
      totalRuns: 0,
    },
    {
      id: 'mtx-wf-evening-ritual',
      icon: '🌙',
      title: 'Wind down nocturno',
      description: 'Cada noche a las 21:30, sugiere el cierre reflexivo + meditación de sueño + bloqueo de redes.',
      category: 'bienestar',
      trigger: {
        kind: 'cron',
        cron: '30 21 * * *',
        cronHumanLabel: 'Todos los días a las 21:30',
      },
      steps: [
        'Sugiere cierre reflexivo de 4 min',
        'Activa meditación de sueño',
        'Propone bloquear redes hasta mañana',
        'Notificación silenciosa con CTAs',
      ],
      defaultEnabled: true,
      qualityScore: 0.90,
      lastRunAt: Date.now() - 1000 * 60 * 60 * 14,  // anoche
      lastRunStatus: 'success',
      totalRuns: 19,
    },
    {
      id: 'mtx-wf-stress-defense',
      icon: '🛡️',
      title: 'Defensa anti-estrés',
      description: 'Al detectar palabras de estrés en chat, ofrece pausa: bloquear apps + meditación corta + agua.',
      category: 'bienestar',
      trigger: {
        kind: 'event',
        eventId: 'mood-stress',
        eventLabel: 'Al detectar estrés en chat',
      },
      steps: [
        'Detecta señales de estrés (LLM classifier)',
        'Propone pausa de 5 min',
        'Ofrece bloquear apps distractoras 30 min',
        'Sugiere meditación de respiración 4-7-8',
      ],
      defaultEnabled: false,
      qualityScore: 0.82,
      lastRunAt: null,
      lastRunStatus: null,
      totalRuns: 0,
    },
    {
      id: 'mtx-wf-streak-rescue',
      icon: '🔥',
      title: 'Rescate de racha',
      description: 'Si vas a romper tu racha hoy, envía aviso por la tarde con propuesta de sesión mínima de 15 min.',
      category: 'productividad',
      trigger: {
        kind: 'event',
        eventId: 'streak-broken',
        eventLabel: 'Al romper una racha',
      },
      steps: [
        'Monitorea racha activa',
        'A las 18:00 si no hay actividad → aviso',
        'Sugiere sesión mínima de 15 min',
        'Felicita o consuela según resultado',
      ],
      defaultEnabled: true,
      qualityScore: 0.87,
      lastRunAt: Date.now() - 1000 * 60 * 60 * 24 * 11,  // hace 11 días
      lastRunStatus: 'success',
      totalRuns: 4,
    },
  ];

  // ── State inicial ───────────────────────────────────────────────────────
  var _initialOfficialEnabled = {};
  _OFFICIAL_WORKFLOWS.forEach(function(w) {
    _initialOfficialEnabled[w.id] = !!w.defaultEnabled;
  });

  var _state = {
    officialEnabled: _initialOfficialEnabled,
    mineWorkflows: [],
    runCounts: {},  // { workflowId: count } — incrementa sobre el seed totalRuns
    totalRuns: 0,
  };

  function _emit() {
    window.dispatchEvent(new CustomEvent('mtx:ia-workflows-changed', {
      detail: { snapshot: JSON.parse(JSON.stringify(_state)) },
    }));
  }

  function _genId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  // ── Helper: detect category from text (reusa heurística de skills) ──────
  function _detectCategory(text) {
    var lc = String(text || '').toLowerCase();
    if (/(producti|planif|enfoque|tarea|sesi(o|ó)n|trabajo|deadline)/i.test(lc)) return 'productividad';
    if (/(medita|respira|mood|bienestar|estr(é|e)s|cansad|gratitud|sue(ñ|n)o)/i.test(lc)) return 'bienestar';
    if (/(aprend|estudi|leer|journal|nota|libro|investig)/i.test(lc)) return 'aprendizaje';
    if (/(crea|post|instagram|video|imagen|dise(ñ|n)o|art)/i.test(lc)) return 'creatividad';
    if (/(social|comunidad|amigos|familia|llama|mensaj)/i.test(lc)) return 'social';
    return 'productividad';
  }

  // ── Mock builder: estructura workflow desde wizard inputs ───────────────
  function _buildMineWorkflow(opts) {
    var triggerKind = opts.triggerKind || 'manual';
    var actionText = String(opts.actionText || '').trim();
    if (!actionText) return null;

    // Title del primer fragment
    var words = actionText.split(/\s+/).slice(0, 6);
    var title = words.join(' ');
    title = title.charAt(0).toUpperCase() + title.slice(1);
    if (title.length > 60) title = title.slice(0, 57) + '…';

    // Construir trigger object según kind
    var trigger;
    if (triggerKind === 'cron') {
      trigger = {
        kind: 'cron',
        cron: opts.cron || '0 9 * * *',
        cronHumanLabel: opts.cronHumanLabel || 'Todos los días a las 09:00',
      };
    } else if (triggerKind === 'event') {
      var evt = _EVENT_CATALOG.find(function(e) { return e.id === opts.eventId; }) || _EVENT_CATALOG[0];
      trigger = {
        kind: 'event',
        eventId: evt.id,
        eventLabel: evt.label,
      };
    } else {
      trigger = { kind: 'manual' };
    }

    // Steps placeholder — LLM real generará pasos reales en backend
    var steps = [
      'Detectar trigger (' + (triggerKind === 'cron' ? 'horario' : triggerKind === 'event' ? 'evento' : 'manual') + ')',
      'Verificar contexto del user',
      'Ejecutar acción descrita',
      'Confirmar resultado al user',
    ];

    return {
      id: _genId('wf'),
      icon: '⚙️',
      title: title,
      description: actionText.length > 200 ? actionText.slice(0, 197) + '…' : actionText,
      category: _detectCategory(actionText),
      trigger: trigger,
      steps: steps,
      qualityScore: 0.6,
      enabled: true,
      autoDetected: false,
      lastRunAt: null,
      lastRunStatus: null,
      totalRuns: 0,
      createdAt: Date.now(),
    };
  }

  // ── Format helpers ──────────────────────────────────────────────────────
  function _formatRelative(ts) {
    if (!ts) return 'Nunca';
    var diff = Date.now() - ts;
    if (diff < 60 * 1000) return 'Hace un momento';
    if (diff < 60 * 60 * 1000) return 'Hace ' + Math.floor(diff / (60 * 1000)) + ' min';
    if (diff < 24 * 60 * 60 * 1000) return 'Hace ' + Math.floor(diff / (60 * 60 * 1000)) + 'h';
    var days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 1) return 'Ayer';
    if (days < 7) return 'Hace ' + days + ' días';
    if (days < 30) return 'Hace ' + Math.floor(days / 7) + ' sem';
    return 'Hace ' + Math.floor(days / 30) + ' mes';
  }

  window.__mtxIAWorkflows = {
    snapshot: function() { return JSON.parse(JSON.stringify(_state)); },

    getOfficialWorkflows: function() {
      return _OFFICIAL_WORKFLOWS.map(function(w) {
        var extraRuns = _state.runCounts[w.id] || 0;
        return Object.assign({}, w, {
          source: 'official',
          enabled: !!_state.officialEnabled[w.id],
          totalRuns: (w.totalRuns || 0) + extraRuns,
        });
      });
    },

    getMineWorkflows: function() {
      return _state.mineWorkflows.map(function(w) {
        var extraRuns = _state.runCounts[w.id] || 0;
        return Object.assign({}, w, { totalRuns: (w.totalRuns || 0) + extraRuns });
      });
    },

    getWorkflow: function(id) {
      var off = _OFFICIAL_WORKFLOWS.find(function(w) { return w.id === id; });
      if (off) {
        var extraRuns = _state.runCounts[off.id] || 0;
        return Object.assign({}, off, {
          source: 'official',
          enabled: !!_state.officialEnabled[off.id],
          totalRuns: (off.totalRuns || 0) + extraRuns,
        });
      }
      var mine = _state.mineWorkflows.find(function(w) { return w.id === id; });
      if (mine) {
        var er = _state.runCounts[mine.id] || 0;
        return Object.assign({}, mine, { totalRuns: (mine.totalRuns || 0) + er });
      }
      return null;
    },

    getCategories: function() { return Object.assign({}, _CATEGORIES); },
    getEventCatalog: function() { return _EVENT_CATALOG.slice(); },

    toggleWorkflow: function(id) {
      var off = _OFFICIAL_WORKFLOWS.find(function(w) { return w.id === id; });
      if (off) {
        _state.officialEnabled[id] = !_state.officialEnabled[id];
        _emit();
        return;
      }
      _state.mineWorkflows = _state.mineWorkflows.map(function(w) {
        if (w.id !== id) return w;
        return Object.assign({}, w, { enabled: !w.enabled, updatedAt: Date.now() });
      });
      _emit();
    },

    createMineWorkflow: function(opts) {
      var wf = _buildMineWorkflow(opts);
      if (!wf) return null;
      _state.mineWorkflows = _state.mineWorkflows.concat([wf]);
      _emit();
      return wf;
    },

    deleteMineWorkflow: function(id) {
      _state.mineWorkflows = _state.mineWorkflows.filter(function(w) { return w.id !== id; });
      delete _state.runCounts[id];
      _emit();
    },

    // Ejecutar workflow manualmente (botón "Ejecutar ahora")
    runNow: function(id) {
      var wf = this.getWorkflow(id);
      if (!wf) return null;
      _state.runCounts[id] = (_state.runCounts[id] || 0) + 1;
      _state.totalRuns++;
      // Bridge a __mtxIAUsage (cuenta en cupo semanal)
      if (window.__mtxIAUsage && window.__mtxIAUsage.track) {
        window.__mtxIAUsage.track('workflows');
      }
      // Update lastRun fields en el state si es mine workflow
      _state.mineWorkflows = _state.mineWorkflows.map(function(w) {
        if (w.id !== id) return w;
        return Object.assign({}, w, {
          lastRunAt: Date.now(),
          lastRunStatus: 'success',
        });
      });
      _emit();
      return { ok: true, runAt: Date.now() };
    },

    getStats: function() {
      var officialEnabled = _OFFICIAL_WORKFLOWS.filter(function(w) {
        return _state.officialEnabled[w.id];
      });
      var mineEnabled = _state.mineWorkflows.filter(function(w) { return w.enabled; });
      var allActive = officialEnabled.concat(mineEnabled);
      var available = _OFFICIAL_WORKFLOWS.length + _state.mineWorkflows.length;

      // Total ejecuciones (seed + runtime incrementos)
      var totalExecutions = 0;
      _OFFICIAL_WORKFLOWS.forEach(function(w) {
        totalExecutions += (w.totalRuns || 0) + (_state.runCounts[w.id] || 0);
      });
      _state.mineWorkflows.forEach(function(w) {
        totalExecutions += (w.totalRuns || 0) + (_state.runCounts[w.id] || 0);
      });

      // Avg quality de activos
      var qualities = allActive.map(function(w) { return w.qualityScore || 0; });
      var avgQuality = qualities.length > 0
        ? Math.round((qualities.reduce(function(a, b) { return a + b; }, 0) / qualities.length) * 100)
        : 0;

      return {
        available:        available,
        active:           allActive.length,
        mineCount:        _state.mineWorkflows.length,
        totalExecutions:  totalExecutions,
        avgQuality:       avgQuality,
      };
    },

    // Utility expuesta: formato de fecha relativa
    formatRelative: _formatRelative,
  };
})();


function useIAWorkflows() {
  var force = React.useReducer(function(x) { return x + 1; }, 0)[1];
  React.useEffect(function() {
    var h = function() { force(); };
    window.addEventListener('mtx:ia-workflows-changed', h);
    return function() { window.removeEventListener('mtx:ia-workflows-changed', h); };
  }, []);
  return (typeof window !== 'undefined' && window.__mtxIAWorkflows)
    ? window.__mtxIAWorkflows.snapshot()
    : null;
}


// ═══════════════════════════════════════════════════════════════════════════
// WorkflowCard — render de un workflow en la lista
// ═══════════════════════════════════════════════════════════════════════════
// Diferencia visual con SkillCard:
//   • Trigger badge prominente (🕐 cron / ⚡ event / 👆 manual)
//   • Última ejecución visible
//   • Status dot (verde activo / gris paused)

function WorkflowCard(props) {
  var wf = props.workflow;
  var onToggle = props.onToggle;
  var onOpenDetail = props.onOpenDetail;
  var onRunNow = props.onRunNow;
  var categories = window.__mtxIAWorkflows.getCategories();
  var cat = categories[wf.category] || { label: wf.category, accent: 'var(--neon)' };

  // Trigger badge per kind
  var triggerInfo = {
    cron:   { icon: '🕐', label: wf.trigger.cronHumanLabel || 'Schedule' },
    event:  { icon: '⚡', label: wf.trigger.eventLabel || 'Evento' },
    manual: { icon: '👆', label: 'Manual' },
  }[wf.trigger.kind] || { icon: '⚙️', label: 'Trigger' };

  var lastRunLabel = wf.lastRunAt
    ? window.__mtxIAWorkflows.formatRelative(wf.lastRunAt)
    : 'Sin ejecuciones';

  return (
    <div style={{
      padding: '14px 14px 12px',
      borderRadius: 16,
      background: wf.enabled
        ? 'linear-gradient(135deg, ' + cat.accent + '0d, ' + cat.accent + '02)'
        : 'rgba(255,255,255,0.025)',
      border: '0.5px solid ' + (wf.enabled
        ? cat.accent + '30'
        : 'rgba(255,255,255,0.06)'),
      transition: 'all .25s',
      animation: 'mtx-fade-up .25s ease both',
    }}>
      {/* Row 1: icon + title + toggle */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        marginBottom: 10,
      }}>
        {/* Icon tile con status dot */}
        <button
          onClick={onOpenDetail}
          onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(); } }}
          aria-label={'Ver detalle: ' + wf.title}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            position: 'relative',
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: wf.enabled
              ? 'linear-gradient(135deg, ' + cat.accent + '28, ' + cat.accent + '08)'
              : 'rgba(255,255,255,0.04)',
            border: '0.5px solid ' + (wf.enabled ? cat.accent + '40' : 'rgba(255,255,255,0.06)'),
            color: wf.enabled ? cat.accent : 'var(--ink-3)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19, lineHeight: 1,
            boxShadow: wf.enabled ? '0 0 14px ' + cat.accent + '20' : 'none',
            transition: 'all .25s',
          }}>
          <span role="img" aria-hidden="true">{wf.icon}</span>
          {/* Status dot */}
          <span style={{
            position: 'absolute', bottom: -1, right: -1,
            width: 10, height: 10, borderRadius: '50%',
            background: wf.enabled ? '#3dffd1' : '#666',
            border: '1.5px solid rgba(15,19,19,1)',
            boxShadow: wf.enabled ? '0 0 6px rgba(61,255,209,0.7)' : 'none',
            transition: 'all .2s',
          }}/>
        </button>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            onClick={onOpenDetail}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer', textAlign: 'left',
              background: 'transparent', border: 0, padding: 0, width: '100%',
            }}>
            <div style={{
              fontSize: 13.5, fontWeight: 700,
              color: 'var(--ink-1)',
              letterSpacing: '-0.012em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              marginBottom: 4,
              lineHeight: 1.2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{wf.title}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="mtx-eyebrow" style={{
                fontSize: 8.5, color: cat.accent,
                fontWeight: 700,
                letterSpacing: '0.12em',
              }}>{wf.source === 'official' ? 'OFICIAL' : 'TUYO'}</span>
              <span style={{ fontSize: 8.5, color: 'var(--ink-4)' }}>·</span>
              <span className="mtx-eyebrow" style={{
                fontSize: 8.5, color: 'var(--ink-3)',
                fontWeight: 600,
                letterSpacing: '0.10em',
              }}>{cat.label.toUpperCase()}</span>
            </div>
          </button>
        </div>

        {/* Toggle switch */}
        <button
          onClick={onToggle}
          onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
          aria-label={(wf.enabled ? 'Pausar' : 'Activar') + ' ' + wf.title}
          aria-pressed={wf.enabled}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            width: 36, height: 22, borderRadius: 999,
            border: 0,
            background: wf.enabled
              ? 'linear-gradient(135deg, ' + cat.accent + ', ' + cat.accent + 'b8)'
              : 'rgba(255,255,255,0.08)',
            position: 'relative',
            transition: 'all .25s',
            flexShrink: 0,
            marginTop: 2,
            boxShadow: wf.enabled ? '0 0 10px ' + cat.accent + '50, inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
          }}>
          <span style={{
            position: 'absolute',
            top: 2, left: wf.enabled ? 16 : 2,
            width: 18, height: 18, borderRadius: '50%',
            background: '#fff',
            transition: 'left .2s cubic-bezier(.4,1.4,.5,1)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.30)',
          }}/>
        </button>
      </div>

      {/* Row 2: trigger badge + última ejecución */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 10,
        flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 9px', borderRadius: 999,
          background: 'rgba(0,0,0,0.25)',
          border: '0.5px solid rgba(255,255,255,0.06)',
          fontSize: 10.5, color: 'var(--ink-2)',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.003em',
          fontWeight: 600,
        }}>
          <span aria-hidden="true">{triggerInfo.icon}</span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
            {triggerInfo.label}
          </span>
        </div>
        {wf.lastRunAt && (
          <div style={{
            fontSize: 10, color: 'var(--ink-4)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.003em',
          }}>
            · Última: {lastRunLabel}
          </div>
        )}
      </div>

      {/* Row 3: description */}
      <button
        onClick={onOpenDetail}
        className="mtx-tap"
        style={{
          appearance: 'none', cursor: 'pointer', textAlign: 'left',
          background: 'transparent', border: 0, padding: 0, width: '100%',
        }}>
        <div style={{
          fontSize: 12, color: 'var(--ink-3)',
          lineHeight: 1.5,
          letterSpacing: '-0.005em',
          fontFamily: 'var(--ff-sans)',
          display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{wf.description}</div>
      </button>

      {/* Row 4: action buttons (Run now + stats) */}
      {wf.enabled && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 10,
          paddingTop: 10,
          borderTop: '0.5px solid rgba(255,255,255,0.04)',
        }}>
          <button
            onClick={onRunNow}
            onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRunNow(); } }}
            aria-label={'Ejecutar ahora ' + wf.title}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              padding: '5px 11px', borderRadius: 999,
              background: 'rgba(61,255,209,0.06)',
              border: '0.5px solid rgba(61,255,209,0.24)',
              color: 'var(--neon)',
              fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
            <span aria-hidden="true">▶</span> Ejecutar
          </button>
          <div style={{
            flex: 1, textAlign: 'right',
            fontSize: 10, color: 'var(--ink-4)',
            fontFamily: 'var(--ff-sans)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.003em',
          }}>
            {(wf.totalRuns || 0).toLocaleString('es')} ejecuciones
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// NewWorkflowModal — wizard 3-step para crear workflow propio
// ═══════════════════════════════════════════════════════════════════════════
// Step 1: ¿Qué tipo de trigger? (cron / event / manual)
// Step 2: Configurar trigger (cron→time picker, event→dropdown, manual→skip)
// Step 3: Describir acción (textarea + CTA crear)

function NewWorkflowModal(props) {
  var onClose = props.onClose;
  var onCreated = props.onCreated;

  var stepState = React.useState(1);
  var step = stepState[0]; var setStep = stepState[1];

  var triggerKindState = React.useState(null);
  var triggerKind = triggerKindState[0]; var setTriggerKind = triggerKindState[1];

  var cronTimeState = React.useState('09:00');
  var cronTime = cronTimeState[0]; var setCronTime = cronTimeState[1];
  var cronDaysState = React.useState('daily');  // 'daily' | 'weekly-mon' | 'weekends'
  var cronDays = cronDaysState[0]; var setCronDays = cronDaysState[1];

  var eventIdState = React.useState(null);
  var eventId = eventIdState[0]; var setEventId = eventIdState[1];

  var actionTextState = React.useState('');
  var actionText = actionTextState[0]; var setActionText = actionTextState[1];

  var textareaRef = React.useRef(null);

  // ESC para cerrar — ref pattern + guard contentEditable + IME (post-audit Fase 2)
  var onCloseRef = React.useRef(onClose);
  React.useEffect(function() { onCloseRef.current = onClose; });
  React.useEffect(function() {
    var onKey = function(e) {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);

  // Lock body scroll mientras el wizard está abierto (post-audit Fase 2)
  React.useEffect(function() {
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function() { document.body.style.overflow = prev; };
  }, []);

  // Auto-focus textarea cuando llegamos a step 3 — con cleanup (post-audit)
  React.useEffect(function() {
    if (step !== 3) return;
    var t = setTimeout(function() { if (textareaRef.current) textareaRef.current.focus(); }, 100);
    return function() { clearTimeout(t); };
  }, [step]);

  var TRIGGER_KINDS = [
    {
      id: 'cron',
      icon: '🕐',
      title: 'En un horario fijo',
      desc: 'Cada día a una hora, cada semana, etc.',
      accent: '#3dffd1',
    },
    {
      id: 'event',
      icon: '⚡',
      title: 'Cuando pase algo',
      desc: 'Al completar sesión, detectar estrés, etc.',
      accent: '#9b8aff',
    },
    {
      id: 'manual',
      icon: '👆',
      title: 'Solo cuando yo lo active',
      desc: 'Ejecutar a demanda con un botón',
      accent: '#5dd3ff',
    },
  ];

  var DAYS_OPTIONS = [
    { id: 'daily',       label: 'Todos los días' },
    { id: 'weekdays',    label: 'Lunes a viernes' },
    { id: 'weekends',    label: 'Sábado y domingo' },
    { id: 'weekly-mon',  label: 'Solo lunes' },
    { id: 'weekly-sun',  label: 'Solo domingo' },
  ];

  function _buildCronFromInputs() {
    // Generar cron string + label humano
    var parts = cronTime.split(':');
    var hh = parts[0]; var mm = parts[1];
    var dayMap = {
      daily:       { dow: '*', label: 'Todos los días' },
      weekdays:    { dow: '1-5', label: 'Lunes a viernes' },
      weekends:    { dow: '0,6', label: 'Sábado y domingo' },
      'weekly-mon': { dow: '1', label: 'Cada lunes' },
      'weekly-sun': { dow: '0', label: 'Cada domingo' },
    };
    var dm = dayMap[cronDays] || dayMap.daily;
    var cron = parseInt(mm, 10) + ' ' + parseInt(hh, 10) + ' * * ' + dm.dow;
    var label = dm.label + ' a las ' + cronTime;
    return { cron: cron, cronHumanLabel: label };
  }

  function _canProceed() {
    if (step === 1) return !!triggerKind;
    if (step === 2) {
      if (triggerKind === 'cron') return !!cronTime;
      if (triggerKind === 'event') return !!eventId;
      return true;  // manual → no config needed
    }
    if (step === 3) return actionText.trim().length >= 10;
    return false;
  }

  function _goNext() {
    if (!_canProceed()) return;
    if (step < 3) setStep(step + 1);
  }
  function _goBack() {
    if (step > 1) setStep(step - 1);
  }

  function _handleSubmit() {
    if (!_canProceed()) return;
    var opts = {
      triggerKind: triggerKind,
      actionText: actionText.trim(),
    };
    if (triggerKind === 'cron') {
      var c = _buildCronFromInputs();
      opts.cron = c.cron;
      opts.cronHumanLabel = c.cronHumanLabel;
    } else if (triggerKind === 'event') {
      opts.eventId = eventId;
    }
    var wf = window.__mtxIAWorkflows.createMineWorkflow(opts);
    if (wf && onCreated) onCreated(wf);
    onClose();
  }

  // Portal a mtx-overlay-root (mismo patrón que Skills modals)
  var portalRoot = (typeof document !== 'undefined')
    ? document.getElementById('mtx-overlay-root')
    : null;
  if (!portalRoot) return null;

  var EVENT_CATALOG = window.__mtxIAWorkflows.getEventCatalog();

  // Backdrop drag-release safe-close (post-audit Fase 2)
  var backdropDownRef = React.useRef(false);
  var handleBackdropDown = function(e) { backdropDownRef.current = e.target === e.currentTarget; };
  var handleBackdropClick = function(e) {
    if (e.target === e.currentTarget && backdropDownRef.current) onCloseRef.current();
    backdropDownRef.current = false;
  };

  var content = (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'mtx-fade-up .25s ease',
    }} onMouseDown={handleBackdropDown} onClick={handleBackdropClick}>
      <div onClick={function(e) { e.stopPropagation(); }}
        role="dialog" aria-modal="true" aria-label="Nuevo workflow"
        className="mtx-no-scrollbar"
        style={{
          background: 'rgba(15,19,19,0.96)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderTop: '0.5px solid rgba(255,255,255,0.10)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '14px 20px 24px',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
          maxHeight: '90%', overflow: 'auto',
          animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
        }}>
        {/* Grabber */}
        <div style={{
          width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
          background: 'rgba(255,255,255,0.16)',
        }}/>

        {/* Header: step indicator + close */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 18,
        }}>
          <div>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--neon)', letterSpacing: '0.14em',
              marginBottom: 4,
            }}>NUEVO WORKFLOW · PASO {step}/3</div>
            <div style={{
              fontSize: 15, fontWeight: 700,
              color: 'var(--ink-1)',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              letterSpacing: '-0.015em',
            }}>{
              step === 1 ? '¿Qué tipo de trigger?'
                : step === 2 ? 'Configurar trigger'
                : 'Describe la acción'
            }</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            className="mtx-tap"
            style={{
              width: 32, height: 32, borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              color: 'var(--ink-2)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 13,
            }}>✕</button>
        </div>

        {/* Step progress bar */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 18,
        }}>
          {[1, 2, 3].map(function(s) {
            return (
              <div key={s} style={{
                flex: 1, height: 3, borderRadius: 999,
                background: s <= step ? 'var(--neon)' : 'rgba(255,255,255,0.08)',
                transition: 'background .3s',
                boxShadow: s <= step ? '0 0 6px rgba(61,255,209,0.45)' : 'none',
              }}/>
            );
          })}
        </div>

        {/* Step 1: Trigger kind picker */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TRIGGER_KINDS.map(function(t) {
              var isActive = triggerKind === t.id;
              return (
                <button key={t.id}
                  onClick={function() { setTriggerKind(t.id); }}
                  className="mtx-tap"
                  style={{
                    appearance: 'none', cursor: 'pointer', textAlign: 'left',
                    width: '100%',
                    padding: '12px 14px', borderRadius: 14,
                    background: isActive
                      ? 'linear-gradient(135deg, ' + t.accent + '14, ' + t.accent + '03)'
                      : 'rgba(255,255,255,0.025)',
                    border: '0.5px solid ' + (isActive ? t.accent + '40' : 'rgba(255,255,255,0.06)'),
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'all .2s',
                  }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg, ' + t.accent + '24, ' + t.accent + '08)',
                    border: '0.5px solid ' + t.accent + '32',
                    color: t.accent,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 19,
                  }}>{t.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: 'var(--ink-1)',
                      letterSpacing: '-0.01em',
                      fontFamily: 'var(--ff-display, var(--ff-sans))',
                      marginBottom: 2,
                    }}>{t.title}</div>
                    <div style={{
                      fontSize: 11.5, color: 'var(--ink-3)',
                      letterSpacing: '-0.005em',
                      lineHeight: 1.4,
                    }}>{t.desc}</div>
                  </div>
                  {isActive && (
                    <div style={{
                      color: t.accent, fontSize: 14, fontWeight: 800,
                      flexShrink: 0,
                    }}>✓</div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Trigger config */}
        {step === 2 && triggerKind === 'cron' && (
          <div>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--ink-3)', marginBottom: 8,
            }}>Hora</div>
            <input
              type="time"
              value={cronTime}
              onChange={function(e) { setCronTime(e.target.value); }}
              style={{
                width: '100%', boxSizing: 'border-box',
                appearance: 'none', outline: 'none',
                background: 'rgba(0,0,0,0.20)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '14px 16px',
                color: 'var(--ink-1)',
                fontSize: 16, fontFamily: 'var(--ff-sans)',
                fontVariantNumeric: 'tabular-nums',
                marginBottom: 16,
              }}
            />
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--ink-3)', marginBottom: 8,
            }}>Días</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DAYS_OPTIONS.map(function(d) {
                var isActive = cronDays === d.id;
                return (
                  <button key={d.id}
                    onClick={function() { setCronDays(d.id); }}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer', textAlign: 'left',
                      padding: '10px 14px', borderRadius: 12,
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(61,255,209,0.10), rgba(61,255,209,0.02))'
                        : 'rgba(255,255,255,0.025)',
                      border: '0.5px solid ' + (isActive ? 'rgba(61,255,209,0.32)' : 'rgba(255,255,255,0.06)'),
                      color: isActive ? 'var(--neon)' : 'var(--ink-2)',
                      fontSize: 12.5, fontWeight: 600,
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                    <span>{d.label}</span>
                    {isActive && <span style={{ fontSize: 12, fontWeight: 800 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && triggerKind === 'event' && (
          <div>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--ink-3)', marginBottom: 10,
            }}>Selecciona el evento</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {EVENT_CATALOG.map(function(e) {
                var isActive = eventId === e.id;
                return (
                  <button key={e.id}
                    onClick={function() { setEventId(e.id); }}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer', textAlign: 'left',
                      padding: '10px 14px', borderRadius: 12,
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(155,138,255,0.14), rgba(155,138,255,0.02))'
                        : 'rgba(255,255,255,0.025)',
                      border: '0.5px solid ' + (isActive ? 'rgba(155,138,255,0.40)' : 'rgba(255,255,255,0.06)'),
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                    <span style={{ fontSize: 16 }}>{e.icon}</span>
                    <span style={{
                      flex: 1,
                      fontSize: 12.5, fontWeight: 600,
                      color: isActive ? '#9b8aff' : 'var(--ink-1)',
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                    }}>{e.label}</span>
                    {isActive && <span style={{ color: '#9b8aff', fontSize: 12, fontWeight: 800 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && triggerKind === 'manual' && (
          <div style={{
            padding: '24px 16px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.025)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.7 }}>👆</div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--ink-1)',
              letterSpacing: '-0.01em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              marginBottom: 6,
            }}>Workflow manual</div>
            <div style={{
              fontSize: 11.5, color: 'var(--ink-3)',
              lineHeight: 1.5,
              letterSpacing: '-0.005em',
              maxWidth: 260, margin: '0 auto',
            }}>Este workflow solo se ejecutará cuando toques el botón "Ejecutar". Útil para flujos que quieres invocar a demanda.</div>
          </div>
        )}

        {/* Step 3: Action description */}
        {step === 3 && (
          <div>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--ink-3)', marginBottom: 8,
            }}>Describe qué debe hacer</div>
            <textarea
              ref={textareaRef}
              value={actionText}
              onChange={function(e) { setActionText(e.target.value); }}
              placeholder="Ej: Generar un resumen del día con mis tres prioridades y enviármelo al chat. Mentex estructurará los pasos automáticamente."
              maxLength={2000}
              rows={6}
              style={{
                width: '100%', boxSizing: 'border-box',
                appearance: 'none', outline: 'none',
                background: 'rgba(0,0,0,0.20)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '12px 14px',
                color: 'var(--ink-1)',
                fontSize: 13, lineHeight: 1.55,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                resize: 'none',
                marginBottom: 10,
              }}
            />
            <div style={{
              fontSize: 10.5, color: 'var(--ink-4)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              lineHeight: 1.4,
            }}>
              Mentex analizará tu descripción y generará automáticamente nombre, dominio y los pasos del workflow.
            </div>
          </div>
        )}

        {/* Footer nav buttons */}
        <div style={{
          display: 'flex', gap: 8, marginTop: 20,
        }}>
          {step > 1 && (
            <button
              onClick={_goBack}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '11px 16px', borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                color: 'var(--ink-2)',
                fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>← Atrás</button>
          )}
          <button
            onClick={step === 3 ? _handleSubmit : _goNext}
            disabled={!_canProceed()}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: _canProceed() ? 'pointer' : 'not-allowed',
              flex: 1, padding: '11px 14px', borderRadius: 14, border: 0,
              background: _canProceed()
                ? 'linear-gradient(135deg, var(--neon), #1ad9ad)'
                : 'rgba(255,255,255,0.04)',
              color: _canProceed() ? '#0a1410' : 'var(--ink-4)',
              fontSize: 13, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              opacity: _canProceed() ? 1 : 0.5,
              boxShadow: _canProceed() ? '0 4px 14px -2px rgba(61,255,209,0.42)' : 'none',
              transition: 'all .2s',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            {step === 3
              ? (<><span>✦</span> Crear workflow</>)
              : (<>Continuar <span>→</span></>)}
          </button>
        </div>
      </div>
    </div>
  );

  return window.ReactDOM ? window.ReactDOM.createPortal(content, portalRoot) : content;
}


// ═══════════════════════════════════════════════════════════════════════════
// WorkflowDetailSheet — vista completa de un workflow
// ═══════════════════════════════════════════════════════════════════════════

function WorkflowDetailSheet(props) {
  var wf = props.workflow;
  var onClose = props.onClose;
  var onToggle = props.onToggle;
  var onRunNow = props.onRunNow;
  var onDelete = props.onDelete;

  var categories = window.__mtxIAWorkflows.getCategories();
  var cat = categories[wf.category] || { label: wf.category, accent: 'var(--neon)' };
  var isOfficial = wf.source === 'official';

  var triggerInfo = {
    cron:   { icon: '🕐', label: wf.trigger.cronHumanLabel || 'Schedule', kind: 'Horario' },
    event:  { icon: '⚡', label: wf.trigger.eventLabel || 'Evento', kind: 'Evento' },
    manual: { icon: '👆', label: 'A demanda', kind: 'Manual' },
  }[wf.trigger.kind] || { icon: '⚙️', label: 'Trigger', kind: 'Otro' };

  // ESC — ref pattern + typing/IME guard (post-audit Fase 2)
  var onCloseRef = React.useRef(onClose);
  React.useEffect(function() { onCloseRef.current = onClose; });
  React.useEffect(function() {
    var onKey = function(e) {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);

  // Body scroll lock (post-audit Fase 2)
  React.useEffect(function() {
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function() { document.body.style.overflow = prev; };
  }, []);

  // Backdrop drag-release safe-close
  var backdropDownRef = React.useRef(false);
  var handleBackdropDown = function(e) { backdropDownRef.current = e.target === e.currentTarget; };
  var handleBackdropClick = function(e) {
    if (e.target === e.currentTarget && backdropDownRef.current) onCloseRef.current();
    backdropDownRef.current = false;
  };

  var portalRoot = (typeof document !== 'undefined')
    ? document.getElementById('mtx-overlay-root')
    : null;
  if (!portalRoot) return null;

  var content = (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'mtx-fade-up .25s ease',
    }} onMouseDown={handleBackdropDown} onClick={handleBackdropClick}>
      <div onClick={function(e) { e.stopPropagation(); }}
        role="dialog" aria-modal="true" aria-label={'Detalle: ' + wf.title}
        className="mtx-no-scrollbar"
        style={{
          background: 'rgba(15,19,19,0.96)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderTop: '0.5px solid rgba(255,255,255,0.10)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '14px 20px 28px',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
          maxHeight: '90%', overflow: 'auto',
          animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
        }}>
        {/* Grabber */}
        <div style={{
          width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
          background: 'rgba(255,255,255,0.16)',
        }}/>

        {/* Header con icon + título + categoría */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20,
        }}>
          <div style={{
            position: 'relative',
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, ' + cat.accent + '28, ' + cat.accent + '08)',
            border: '0.5px solid ' + cat.accent + '40',
            color: cat.accent,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, lineHeight: 1,
            boxShadow: '0 0 18px ' + cat.accent + '22',
          }}>
            <span role="img" aria-hidden="true">{wf.icon}</span>
            <span style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 12, height: 12, borderRadius: '50%',
              background: wf.enabled ? '#3dffd1' : '#666',
              border: '2px solid rgba(15,19,19,1)',
              boxShadow: wf.enabled ? '0 0 6px rgba(61,255,209,0.7)' : 'none',
            }}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, marginBottom: 4,
              color: cat.accent, letterSpacing: '0.14em',
            }}>{isOfficial ? 'OFICIAL' : 'TUYO'} · {cat.label.toUpperCase()}</div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              color: 'var(--ink-1)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              marginBottom: 6,
            }}>{wf.title}</div>
            <div style={{
              fontSize: 12.5, color: 'var(--ink-3)',
              lineHeight: 1.5,
              letterSpacing: '-0.005em',
            }}>{wf.description}</div>
          </div>
        </div>

        {/* Trigger card prominente */}
        <div style={{ marginBottom: 18 }}>
          <div className="mtx-eyebrow" style={{
            fontSize: 9, color: 'var(--ink-3)', marginBottom: 8,
          }}>Cuándo se ejecuta</div>
          <div style={{
            padding: '12px 14px', borderRadius: 14,
            background: 'linear-gradient(135deg, ' + cat.accent + '0d, ' + cat.accent + '02)',
            border: '0.5px solid ' + cat.accent + '24',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: 'rgba(0,0,0,0.25)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>{triggerInfo.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 9.5, color: cat.accent,
                fontWeight: 700, letterSpacing: '0.12em',
                marginBottom: 3,
              }}>{triggerInfo.kind.toUpperCase()}</div>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: 'var(--ink-1)',
                letterSpacing: '-0.005em',
                fontFamily: 'var(--ff-sans)',
                lineHeight: 1.35,
              }}>{triggerInfo.label}</div>
            </div>
          </div>
        </div>

        {/* Workflow steps */}
        <div style={{ marginBottom: 18 }}>
          <div className="mtx-eyebrow" style={{
            fontSize: 9, color: 'var(--ink-3)', marginBottom: 10,
          }}>Pasos del workflow</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {wf.steps.map(function(s, i) {
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                    background: cat.accent + '18',
                    border: '0.5px solid ' + cat.accent + '40',
                    color: cat.accent,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10.5, fontWeight: 800,
                    fontFamily: 'var(--ff-sans)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{i + 1}</div>
                  <div style={{
                    flex: 1, paddingTop: 2,
                    fontSize: 12.5, color: 'var(--ink-1)',
                    letterSpacing: '-0.005em',
                    lineHeight: 1.45,
                    fontFamily: 'var(--ff-sans)',
                  }}>{s}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginBottom: 18 }}>
          <div className="mtx-eyebrow" style={{
            fontSize: 9, color: 'var(--ink-3)', marginBottom: 8,
          }}>Estadísticas</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                fontSize: 18, fontWeight: 800,
                color: 'var(--ink-1)',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.018em',
                lineHeight: 1,
              }}>{(wf.totalRuns || 0).toLocaleString('es')}</div>
              <div style={{
                fontSize: 10, color: 'var(--ink-4)',
                marginTop: 4,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>Ejecuciones</div>
            </div>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                fontSize: 18, fontWeight: 800,
                color: wf.qualityScore >= 0.85 ? cat.accent : 'var(--ink-1)',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.018em',
                lineHeight: 1,
              }}>{Math.round((wf.qualityScore || 0) * 100)}%</div>
              <div style={{
                fontSize: 10, color: 'var(--ink-4)',
                marginTop: 4,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>Success rate</div>
            </div>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: 'var(--ink-1)',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                letterSpacing: '-0.012em',
                lineHeight: 1.1,
              }}>{wf.lastRunAt ? window.__mtxIAWorkflows.formatRelative(wf.lastRunAt) : 'Nunca'}</div>
              <div style={{
                fontSize: 10, color: 'var(--ink-4)',
                marginTop: 4,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>Última run</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onRunNow}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              padding: '12px 16px', borderRadius: 14,
              background: 'rgba(61,255,209,0.10)',
              border: '0.5px solid rgba(61,255,209,0.32)',
              color: 'var(--neon)',
              fontSize: 13, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
            <span>▶</span> Ejecutar
          </button>
          <button
            onClick={onToggle}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              flex: 1, padding: '12px 14px', borderRadius: 14,
              background: wf.enabled
                ? 'rgba(255,255,255,0.04)'
                : 'linear-gradient(135deg, var(--neon), #1ad9ad)',
              color: wf.enabled ? 'var(--ink-1)' : '#0a1410',
              fontSize: 13.5, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              border: wf.enabled ? '0.5px solid rgba(255,255,255,0.08)' : 0,
              boxShadow: wf.enabled ? 'none' : '0 4px 14px -2px rgba(61,255,209,0.42)',
            }}>{wf.enabled ? 'Pausar' : 'Activar'}</button>
          {!isOfficial && (
            <button
              onClick={onDelete}
              aria-label="Eliminar workflow"
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '12px 14px', borderRadius: 14,
                background: 'rgba(255,107,107,0.08)',
                border: '0.5px solid rgba(255,107,107,0.24)',
                color: '#ff8b8b',
                fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>Eliminar</button>
          )}
        </div>
      </div>
    </div>
  );

  return window.ReactDOM ? window.ReactDOM.createPortal(content, portalRoot) : content;
}


// ═══════════════════════════════════════════════════════════════════════════
// WorkflowsTab — render principal
// ═══════════════════════════════════════════════════════════════════════════

function WorkflowsTab() {
  useIAWorkflows();
  if (!window.__mtxIAWorkflows) return null;

  var stats = window.__mtxIAWorkflows.getStats();
  var officialWorkflows = window.__mtxIAWorkflows.getOfficialWorkflows();
  var mineWorkflows = window.__mtxIAWorkflows.getMineWorkflows();

  var sectionState = React.useState('official');
  var section = sectionState[0]; var setSection = sectionState[1];

  var newOpenState = React.useState(false);
  var newOpen = newOpenState[0]; var setNewOpen = newOpenState[1];

  var detailState = React.useState(null);
  var detailWf = detailState[0]; var setDetailWf = detailState[1];

  // useToast llamado siempre (hook count estable) — post-audit Fase 2
  var _useToast = window.useToast || function() { return { show: function() {} }; };
  var toast = _useToast();

  // Toggle lock contra double-tap rápidos — antes podía invertir el estado
  // dos veces antes de que setDetailWf flusheara. Post-audit Fase 2.
  var toggleLockRef = React.useRef(false);
  var detailWfRef = React.useRef(detailWf);
  React.useEffect(function() { detailWfRef.current = detailWf; });

  var handleToggle = function(wf) {
    window.__mtxIAWorkflows.toggleWorkflow(wf.id);
  };
  var handleToggleFromDetail = function(wf) {
    if (toggleLockRef.current) return;
    toggleLockRef.current = true;
    window.__mtxIAWorkflows.toggleWorkflow(wf.id);
    var fresh = window.__mtxIAWorkflows.getWorkflow(wf.id);
    if (fresh) {
      setDetailWf(fresh);
      toast.show({
        message: fresh.enabled ? '✦ ' + fresh.title + ' activado' : fresh.title + ' pausado',
        duration: 1800,
      });
    }
    setTimeout(function() { toggleLockRef.current = false; }, 250);
  };
  var handleRunNow = function(wf) {
    var result = window.__mtxIAWorkflows.runNow(wf.id);
    if (result && result.ok) {
      toast.show({
        message: '✦ "' + wf.title + '" ejecutado',
        duration: 1800,
      });
    }
    // Refresh detail si está abierto — usa ref para evitar stale closure
    var cur = detailWfRef.current;
    if (cur && cur.id === wf.id) {
      var fresh = window.__mtxIAWorkflows.getWorkflow(wf.id);
      if (fresh) setDetailWf(fresh);
    }
  };
  var handleDelete = function(wf) {
    if (window.confirm('¿Eliminar el workflow "' + wf.title + '"?')) {
      window.__mtxIAWorkflows.deleteMineWorkflow(wf.id);
      setDetailWf(null);
      toast.show({ message: 'Workflow eliminado', duration: 1500 });
    }
  };
  var handleCreated = function(wf) {
    toast.show({
      message: '✦ Workflow "' + wf.title + '" creado',
      duration: 2200,
    });
    setSection('mine');
  };

  var visibleWorkflows = section === 'official' ? officialWorkflows : mineWorkflows;

  var KPIS = [
    { label: 'Disponibles', value: stats.available,       accent: '#3dffd1' },
    { label: 'Activos',     value: stats.active,          accent: 'var(--neon)' },
    { label: 'Mis flows',   value: stats.mineCount,       accent: '#9b8aff' },
    { label: 'Ejecuciones', value: stats.totalExecutions, accent: '#ffc850' },
  ];

  return (
    <div style={{ animation: 'mtx-fade-up .25s ease both' }}>
      {/* KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 6, marginBottom: 18,
      }}>
        {KPIS.map(function(kpi, i) {
          return (
            <div key={i} style={{
              padding: '10px 8px', borderRadius: 12,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 17, fontWeight: 800,
                color: kpi.accent,
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.018em',
                lineHeight: 1, marginBottom: 4,
              }}>{kpi.value}</div>
              <div style={{
                fontSize: 8.5, color: 'var(--ink-4)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '0.04em', lineHeight: 1.2,
              }}>{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* Section tabs + Nueva button */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
      }}>
        <button
          onClick={function() { setSection('official'); }}
          aria-pressed={section === 'official'}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '7px 13px', borderRadius: 999,
            background: section === 'official'
              ? 'linear-gradient(135deg, rgba(61,255,209,0.16), rgba(61,255,209,0.04))'
              : 'rgba(255,255,255,0.025)',
            border: '0.5px solid ' + (section === 'official' ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.06)'),
            color: section === 'official' ? 'var(--neon)' : 'var(--ink-2)',
            fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          ✦ Oficiales
          <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{officialWorkflows.length}</span>
        </button>
        <button
          onClick={function() { setSection('mine'); }}
          aria-pressed={section === 'mine'}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '7px 13px', borderRadius: 999,
            background: section === 'mine'
              ? 'linear-gradient(135deg, rgba(155,138,255,0.18), rgba(155,138,255,0.04))'
              : 'rgba(255,255,255,0.025)',
            border: '0.5px solid ' + (section === 'mine' ? 'rgba(155,138,255,0.40)' : 'rgba(255,255,255,0.06)'),
            color: section === 'mine' ? '#9b8aff' : 'var(--ink-2)',
            fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          Mis flows
          <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{mineWorkflows.length}</span>
        </button>
        <div style={{ flex: 1 }}/>
        <button
          onClick={function() { setNewOpen(true); }}
          aria-label="Crear nuevo workflow"
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '7px 13px', borderRadius: 999, border: 0,
            background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
            color: '#0a1410',
            fontSize: 12, fontWeight: 700,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            boxShadow: '0 4px 12px -2px rgba(61,255,209,0.38)',
          }}>+ Nuevo</button>
      </div>

      {/* Lista */}
      {visibleWorkflows.length === 0 && section === 'mine' ? (
        <div style={{
          padding: '32px 20px', textAlign: 'center',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.02)',
          border: '0.5px dashed rgba(255,255,255,0.10)',
          animation: 'mtx-fade-up .3s ease both',
        }}>
          <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.7 }}>⚙️</div>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--ink-1)',
            letterSpacing: '-0.012em',
            marginBottom: 6,
            fontFamily: 'var(--ff-display, var(--ff-sans))',
          }}>Aún no tienes workflows propios</div>
          <div style={{
            fontSize: 11.5, color: 'var(--ink-3)',
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
            maxWidth: 270, margin: '0 auto 14px',
          }}>
            Automatiza un proceso que repites a menudo. Mentex lo ejecutará por ti según el trigger que elijas.
          </div>
          <button
            onClick={function() { setNewOpen(true); }}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              padding: '8px 16px', borderRadius: 999, border: 0,
              background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
              color: '#0a1410',
              fontSize: 12, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              boxShadow: '0 4px 12px -2px rgba(61,255,209,0.38)',
            }}>+ Crear workflow</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleWorkflows.map(function(wf) {
            return (
              <WorkflowCard
                key={wf.id}
                workflow={wf}
                onToggle={function() { handleToggle(wf); }}
                onRunNow={function() { handleRunNow(wf); }}
                onOpenDetail={function() { setDetailWf(wf); }}
              />
            );
          })}
        </div>
      )}

      {/* Modals */}
      {newOpen && (
        <NewWorkflowModal
          onClose={function() { setNewOpen(false); }}
          onCreated={handleCreated}
        />
      )}
      {detailWf && (
        <WorkflowDetailSheet
          workflow={window.__mtxIAWorkflows.getWorkflow(detailWf.id) || detailWf}
          onClose={function() { setDetailWf(null); }}
          onToggle={function() { handleToggleFromDetail(detailWf); }}
          onRunNow={function() { handleRunNow(detailWf); }}
          onDelete={function() { handleDelete(detailWf); }}
        />
      )}
    </div>
  );
}


// ── Export ──────────────────────────────────────────────────────────────────
Object.assign(window, {
  WorkflowsTab:        WorkflowsTab,
  WorkflowCard:        WorkflowCard,
  NewWorkflowModal:    NewWorkflowModal,
  WorkflowDetailSheet: WorkflowDetailSheet,
  useIAWorkflows:      useIAWorkflows,
});
