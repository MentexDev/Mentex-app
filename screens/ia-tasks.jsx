// screens/ia-tasks.jsx — Fase 2.4: Tasks del agente IA
// ─────────────────────────────────────────────────────────────────────────────
// Ícono Tasks en el header IA. Tap abre TasksSheet full-screen con 4 sub-tabs:
//   • Activas        — workflows/skills ejecutándose ahora (con progress)
//   • Programadas    — próximas N runs de cron workflows (con countdown)
//   • Pendientes     — agente espera tu aprobación (CTAs Aprobar/Rechazar)
//   • Historial      — últimas N ejecuciones (success/error + tiempo)
//
// El store __mtxIATasks sintetiza data desde:
//   • __mtxIAWorkflows  → para programadas e histórico
//   • __mtxIASkills     → para activas en curso (si las hay)
//   • Estado propio     → para pending approvals (futuro feature backend)
//
// Cuando entre Mastra en backend final, todo esto sale de tablas reales:
//   workflow_runs (status: queued/running/success/error)
//   pending_approvals (workflow_id, payload, requested_at)
//   scheduled_runs (cron-computed next-run timestamps)
//
// Por ahora mock realista para que la UI luzca completa.
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxIATasks) return;

  // ── Categorías reusan accents del sistema (Skills/Workflows) ────────────
  var _ACCENTS = {
    productividad: '#3dffd1',
    bienestar:     '#9b8aff',
    aprendizaje:   '#5dd3ff',
    creatividad:   '#ffc850',
    social:        '#ff8b8b',
  };

  // ── Helpers temporales ──────────────────────────────────────────────────
  function _formatRelative(ts) {
    if (!ts) return '—';
    var diff = ts - Date.now();
    var absMs = Math.abs(diff);
    var future = diff > 0;

    if (absMs < 60 * 1000) return future ? 'En menos de 1 min' : 'Hace un momento';
    if (absMs < 60 * 60 * 1000) {
      var m = Math.floor(absMs / (60 * 1000));
      return (future ? 'En ' : 'Hace ') + m + ' min';
    }
    if (absMs < 24 * 60 * 60 * 1000) {
      var h = Math.floor(absMs / (60 * 60 * 1000));
      var mins = Math.floor((absMs % (60 * 60 * 1000)) / (60 * 1000));
      if (h < 6 && mins > 0) {
        return (future ? 'En ' : 'Hace ') + h + 'h ' + mins + 'm';
      }
      return (future ? 'En ' : 'Hace ') + h + 'h';
    }
    var days = Math.floor(absMs / (24 * 60 * 60 * 1000));
    if (days === 1) return future ? 'Mañana' : 'Ayer';
    if (days < 7) return (future ? 'En ' : 'Hace ') + days + ' días';
    return (future ? 'En ' : 'Hace ') + Math.floor(days / 7) + ' sem';
  }

  function _formatTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var h = d.getHours();
    var m = d.getMinutes();
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
  }

  function _formatDuration(ms) {
    if (!ms) return '';
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
    var m = Math.floor(ms / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    return m + 'm ' + s + 's';
  }

  function _genId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  // ── State inicial mock — ricos en variedad para mostrar todos los estados
  var _now = Date.now();

  var _state = {
    // Activa con progress simulado (avanza en vivo via tick)
    active: [
      {
        id: 'tk-act-1',
        workflowId: 'mtx-wf-daily-briefing',
        title: 'Daily briefing',
        icon: '🌅',
        category: 'productividad',
        startedAt: _now - 18 * 1000,  // hace 18s
        progress: 62,                  // % cuando se monta la tab (animará)
        currentStep: 'Generando resumen del día…',
        totalSteps: 4,
        currentStepIndex: 3,
      },
    ],

    // Programadas — próximas runs de workflows cron activos
    scheduled: [
      {
        id: 'tk-sch-1',
        workflowId: 'mtx-wf-hydration',
        title: 'Hidratación inteligente',
        icon: '💧',
        category: 'bienestar',
        scheduledAt: _now + 38 * 60 * 1000,  // en 38 min
        triggerLabel: 'Cada 90 min · 9-18h',
      },
      {
        id: 'tk-sch-2',
        workflowId: 'mtx-wf-evening-ritual',
        title: 'Wind down nocturno',
        icon: '🌙',
        category: 'bienestar',
        scheduledAt: _now + 5 * 60 * 60 * 1000 + 22 * 60 * 1000,  // en 5h 22m
        triggerLabel: 'Todos los días 21:30',
      },
      {
        id: 'tk-sch-3',
        workflowId: 'mtx-wf-weekly-review',
        title: 'Weekly review automático',
        icon: '📊',
        category: 'productividad',
        scheduledAt: _now + 4 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000,  // en 4 días 3h
        triggerLabel: 'Cada domingo 18:00',
      },
    ],

    // Pendientes — esperan aprobación del user antes de ejecutar
    pending: [
      {
        id: 'tk-pen-1',
        type: 'post-social',
        title: 'Postear thread en X',
        description: 'Mentex preparó un thread basado en tu reflexión semanal de ayer. Revísalo antes de publicar.',
        category: 'creatividad',
        icon: '🐦',
        requestedAt: _now - 47 * 60 * 1000,
        action: { kind: 'post-x', preview: 'Si solo pudiera dejarte una idea esta semana: tu agenda matutina es tu carta de identidad…' },
      },
      {
        id: 'tk-pen-2',
        type: 'calendar-block',
        title: 'Bloquear 2h de deep work',
        description: 'Detecté un hueco libre mañana 9-11am. ¿Lo bloqueo para enfoque profundo?',
        category: 'productividad',
        icon: '📅',
        requestedAt: _now - 12 * 60 * 1000,
        action: { kind: 'calendar-add', when: 'Mañana 9:00-11:00' },
      },
    ],

    // Historial — últimas N runs (success + error mix)
    history: [
      {
        id: 'tk-hist-1',
        workflowId: 'mtx-wf-daily-briefing',
        title: 'Daily briefing',
        icon: '🌅',
        category: 'productividad',
        ranAt: _now - 22 * 60 * 60 * 1000,  // ayer 7am
        status: 'success',
        durationMs: 4200,
        message: '3 prioridades sugeridas',
      },
      {
        id: 'tk-hist-2',
        workflowId: 'mtx-wf-hydration',
        title: 'Hidratación inteligente',
        icon: '💧',
        category: 'bienestar',
        ranAt: _now - 90 * 60 * 1000,  // hace 1h30
        status: 'success',
        durationMs: 380,
        message: null,
      },
      {
        id: 'tk-hist-3',
        workflowId: 'mtx-wf-evening-ritual',
        title: 'Wind down nocturno',
        icon: '🌙',
        category: 'bienestar',
        ranAt: _now - 11 * 60 * 60 * 1000,  // anoche
        status: 'success',
        durationMs: 2100,
        message: 'Meditación de sueño sugerida',
      },
      {
        id: 'tk-hist-4',
        workflowId: 'mtx-wf-instagram-post',
        title: 'Post para Instagram',
        icon: '🎨',
        category: 'creatividad',
        ranAt: _now - 5 * 60 * 60 * 1000,
        status: 'error',
        durationMs: 1200,
        message: 'Error: API rate limit (429). Reintentar en 15 min.',
      },
      {
        id: 'tk-hist-5',
        workflowId: 'mtx-wf-hydration',
        title: 'Hidratación inteligente',
        icon: '💧',
        category: 'bienestar',
        ranAt: _now - 3 * 60 * 60 * 1000,
        status: 'success',
        durationMs: 410,
        message: null,
      },
      {
        id: 'tk-hist-6',
        workflowId: 'mtx-wf-session-journal',
        title: 'Journal post-sesión',
        icon: '📝',
        category: 'aprendizaje',
        ranAt: _now - 2 * 24 * 60 * 60 * 1000,
        status: 'success',
        durationMs: 8200,
        message: 'Reflexión guardada en Conocimiento',
      },
    ],
  };

  function _emit() {
    window.dispatchEvent(new CustomEvent('mtx:ia-tasks-changed'));
  }

  window.__mtxIATasks = {
    snapshot: function() { return JSON.parse(JSON.stringify(_state)); },

    getActive:    function() { return _state.active.slice(); },
    getScheduled: function() {
      return _state.scheduled.slice().sort(function(a, b) {
        return (a.scheduledAt || 0) - (b.scheduledAt || 0);
      });
    },
    getPending:   function() {
      return _state.pending.slice().sort(function(a, b) {
        return (b.requestedAt || 0) - (a.requestedAt || 0);
      });
    },
    getHistory:   function() {
      return _state.history.slice().sort(function(a, b) {
        return (b.ranAt || 0) - (a.ranAt || 0);
      });
    },

    // Stats agregadas para badge en header IA y tab labels
    getStats: function() {
      return {
        active:    _state.active.length,
        scheduled: _state.scheduled.length,
        pending:   _state.pending.length,
        history:   _state.history.length,
      };
    },

    // Aprobar pending → mueve a active (mock — simula ejecución)
    approvePending: function(id) {
      var p = _state.pending.find(function(t) { return t.id === id; });
      if (!p) return;
      _state.pending = _state.pending.filter(function(t) { return t.id !== id; });
      // Crear active task
      _state.active = _state.active.concat([{
        id:               _genId('tk-act'),
        workflowId:       null,
        title:            p.title,
        icon:             p.icon,
        category:         p.category,
        startedAt:        Date.now(),
        progress:         5,
        currentStep:      'Ejecutando…',
        totalSteps:       3,
        currentStepIndex: 1,
        approvedFromPendingId: p.id,
      }]);
      _emit();
      // Bridge a usage tracking
      if (window.__mtxIAUsage && window.__mtxIAUsage.track) {
        window.__mtxIAUsage.track('workflows');
      }
    },

    // Rechazar pending → mueve a historial con status='dismissed'
    dismissPending: function(id) {
      var p = _state.pending.find(function(t) { return t.id === id; });
      if (!p) return;
      _state.pending = _state.pending.filter(function(t) { return t.id !== id; });
      _state.history = [{
        id:         _genId('tk-hist'),
        workflowId: null,
        title:      p.title,
        icon:       p.icon,
        category:   p.category,
        ranAt:      Date.now(),
        status:     'dismissed',
        durationMs: 0,
        message:    'Descartado por el usuario',
      }].concat(_state.history);
      _emit();
    },

    // Reintentar item del historial (solo errores)
    retryHistory: function(id) {
      var h = _state.history.find(function(t) { return t.id === id; });
      if (!h || h.status !== 'error') return;
      _state.active = _state.active.concat([{
        id:               _genId('tk-act'),
        workflowId:       h.workflowId,
        title:            h.title,
        icon:             h.icon,
        category:         h.category,
        startedAt:        Date.now(),
        progress:         15,
        currentStep:      'Reintentando…',
        totalSteps:       3,
        currentStepIndex: 1,
      }]);
      _emit();
    },

    // Volver a ejecutar una task completada (success o dismissed) — re-runs it
    replayHistory: function(id) {
      var h = _state.history.find(function(t) { return t.id === id; });
      if (!h) return;
      _state.active = _state.active.concat([{
        id:               _genId('tk-act'),
        workflowId:       h.workflowId,
        title:            h.title,
        icon:             h.icon,
        category:         h.category,
        startedAt:        Date.now(),
        progress:         10,
        currentStep:      'Re-ejecutando…',
        totalSteps:       3,
        currentStepIndex: 1,
      }]);
      _emit();
    },

    // Cancelar task activa — mueve al historial con status 'dismissed'
    cancelActive: function(id) {
      var t = _state.active.find(function(a) { return a.id === id; });
      if (!t) return;
      _state.active = _state.active.filter(function(a) { return a.id !== id; });
      _state.history = [{
        id:         _genId('tk-hist'),
        workflowId: t.workflowId,
        title:      t.title,
        icon:       t.icon,
        category:   t.category,
        ranAt:      Date.now(),
        status:     'dismissed',
        durationMs: t.startedAt ? Date.now() - t.startedAt : null,
        message:    'Cancelada por el usuario',
      }].concat(_state.history);
      _emit();
    },

    // Cancelar task programada — la remueve sin agregar al historial
    // (todavía no se ejecutó, no es ejecución cancelada sino programación cancelada).
    cancelScheduled: function(id) {
      var t = _state.scheduled.find(function(s) { return s.id === id; });
      if (!t) return;
      _state.scheduled = _state.scheduled.filter(function(s) { return s.id !== id; });
      _emit();
    },

    // Reprogramar task — actualiza scheduledAt (recibe ts en ms)
    rescheduleScheduled: function(id, newScheduledAt) {
      _state.scheduled = _state.scheduled.map(function(s) {
        if (s.id !== id) return s;
        return Object.assign({}, s, { scheduledAt: newScheduledAt });
      });
      _emit();
    },

    // Ejecutar una task programada inmediatamente (skip al active)
    runScheduledNow: function(id) {
      var t = _state.scheduled.find(function(s) { return s.id === id; });
      if (!t) return;
      _state.scheduled = _state.scheduled.filter(function(s) { return s.id !== id; });
      _state.active = _state.active.concat([{
        id:               _genId('tk-act'),
        workflowId:       t.workflowId,
        title:            t.title,
        icon:             t.icon,
        category:         t.category,
        startedAt:        Date.now(),
        progress:         8,
        currentStep:      'Iniciando ahora…',
        totalSteps:       3,
        currentStepIndex: 1,
      }]);
      _emit();
    },

    // Tick interno (llamado desde TasksSheet useEffect cada 1s) — avanza
    // progress de active tasks y mueve a historial cuando llegan a 100.
    tickActive: function() {
      var changed = false;
      var toMove = [];
      _state.active = _state.active.map(function(t) {
        var newProgress = Math.min(100, (t.progress || 0) + 5 + Math.random() * 5);
        if (newProgress >= 100) {
          toMove.push(Object.assign({}, t, { progress: 100 }));
          return null;
        }
        changed = true;
        return Object.assign({}, t, { progress: newProgress });
      }).filter(Boolean);
      toMove.forEach(function(t) {
        _state.history = [{
          id:         _genId('tk-hist'),
          workflowId: t.workflowId,
          title:      t.title,
          icon:       t.icon,
          category:   t.category,
          ranAt:      Date.now(),
          status:     'success',
          // null si no había startedAt (en lugar de silenciar con 0).
          // Render guard en consumidor: chequea durationMs > 0. Post-audit Fase 2.
          durationMs: t.startedAt ? Date.now() - t.startedAt : null,
          message:    'Completado',
        }].concat(_state.history);
        changed = true;
      });
      if (changed) _emit();
    },

    // Accent helper
    getAccent: function(category) {
      return _ACCENTS[category] || '#3dffd1';
    },

    // Format helpers expuestos
    formatRelative: _formatRelative,
    formatTime:     _formatTime,
    formatDuration: _formatDuration,
  };
})();


function useIATasks() {
  var force = React.useReducer(function(x) { return x + 1; }, 0)[1];
  React.useEffect(function() {
    var h = function() { force(); };
    window.addEventListener('mtx:ia-tasks-changed', h);
    return function() { window.removeEventListener('mtx:ia-tasks-changed', h); };
  }, []);
  return (typeof window !== 'undefined' && window.__mtxIATasks)
    ? window.__mtxIATasks.snapshot()
    : null;
}


// ═══════════════════════════════════════════════════════════════════════════
// ActiveTaskCard — render de una task corriendo en vivo
// ═══════════════════════════════════════════════════════════════════════════

function ActiveTaskCard(props) {
  var t = props.task;
  var onOpen = props.onOpen;
  var accent = window.__mtxIATasks.getAccent(t.category);
  var elapsed = window.__mtxIATasks.formatDuration(Date.now() - (t.startedAt || Date.now()));

  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={onOpen ? function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : undefined}
      aria-label={onOpen ? 'Ver detalle de tarea: ' + t.title : undefined}
      className={onOpen ? 'mtx-tap' : undefined}
      style={{
      padding: '14px 14px 12px',
      borderRadius: 16,
      background: 'linear-gradient(135deg, ' + accent + '0d, ' + accent + '02)',
      border: '0.5px solid ' + accent + '32',
      animation: 'mtx-fade-up .25s ease both',
      position: 'relative',
      overflow: 'hidden',
      cursor: onOpen ? 'pointer' : 'default',
    }}>
      {/* Shimmer animation bar arriba — indica "vivo" */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, ' + accent + ', transparent)',
        backgroundSize: '200% 100%',
        animation: 'mtxTaskShimmer 1.4s linear infinite',
      }}/>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        {/* Icon tile con pulse halo */}
        <div style={{
          position: 'relative',
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, ' + accent + '28, ' + accent + '08)',
          border: '0.5px solid ' + accent + '40',
          color: accent,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19, lineHeight: 1,
          // Halo glow estático (cheap GPU box-shadow) — antes había un pulse
          // animation infinito que en 60fps mobile era pesado y se acumulaba
          // con múltiples active tasks. Ahora solo un resplandor sutil.
          boxShadow: '0 0 14px ' + accent + '40, 0 0 0 1px ' + accent + '24',
        }}>
          <span role="img" aria-hidden="true" style={{ position: 'relative' }}>{t.icon}</span>
        </div>

        {/* Title + step */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: 'var(--ink-1)',
            letterSpacing: '-0.012em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
            lineHeight: 1.25,
            marginBottom: 3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{t.title}</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 10.5, color: accent,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
          }}>
            <span>{t.currentStep}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{elapsed}</span>
          </div>
        </div>

        {/* Progress percent */}
        <div style={{
          fontSize: 14, fontWeight: 800,
          color: accent,
          fontFamily: 'var(--ff-display, var(--ff-sans))',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.018em',
          flexShrink: 0,
          marginTop: 2,
        }}>{Math.round(t.progress || 0)}%</div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4, borderRadius: 999,
        background: 'rgba(0,0,0,0.30)',
        overflow: 'hidden',
        marginBottom: 8,
      }}>
        <div style={{
          width: (t.progress || 0) + '%',
          height: '100%',
          background: accent,
          borderRadius: 999,
          transition: 'width .5s ease',
          boxShadow: '0 0 8px ' + accent + '60',
        }}/>
      </div>

      {/* Step indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 10, color: 'var(--ink-4)',
        fontFamily: 'var(--ff-sans)',
        letterSpacing: '-0.005em',
      }}>
        <span>Paso {t.currentStepIndex} / {t.totalSteps}</span>
        <span>Iniciado {window.__mtxIATasks.formatRelative(t.startedAt)}</span>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ScheduledTaskCard — próxima ejecución con countdown
// ═══════════════════════════════════════════════════════════════════════════

function ScheduledTaskCard(props) {
  var t = props.task;
  var onOpen = props.onOpen;
  var accent = window.__mtxIATasks.getAccent(t.category);
  var countdown = window.__mtxIATasks.formatRelative(t.scheduledAt);
  var timeOfDay = window.__mtxIATasks.formatTime(t.scheduledAt);

  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={onOpen ? function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : undefined}
      aria-label={onOpen ? 'Ver detalle de tarea programada: ' + t.title : undefined}
      className={onOpen ? 'mtx-tap' : undefined}
      style={{
      padding: '12px 14px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.025)',
      border: '0.5px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'mtx-fade-up .25s ease both',
      cursor: onOpen ? 'pointer' : 'default',
    }}>
      {/* Icon tile (más sutil que active) */}
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid ' + accent + '20',
        color: accent,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17,
      }}>
        <span role="img" aria-hidden="true">{t.icon}</span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600,
          color: 'var(--ink-1)',
          letterSpacing: '-0.008em',
          fontFamily: 'var(--ff-sans)',
          lineHeight: 1.25,
          marginBottom: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{t.title}</div>
        <div style={{
          fontSize: 10.5, color: 'var(--ink-4)',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <span aria-hidden="true">🕐</span>
          <span>{t.triggerLabel}</span>
        </div>
      </div>

      {/* Countdown pill */}
      <div style={{
        padding: '4px 10px', borderRadius: 999,
        background: accent + '10',
        border: '0.5px solid ' + accent + '32',
        color: accent,
        fontSize: 10.5, fontWeight: 700,
        fontFamily: 'var(--ff-sans)',
        letterSpacing: '-0.005em',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>{countdown}</div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// PendingTaskCard — agente espera aprobación, CTAs Aprobar / Rechazar
// ═══════════════════════════════════════════════════════════════════════════

function PendingTaskCard(props) {
  var t = props.task;
  var onApprove = props.onApprove;
  var onDismiss = props.onDismiss;
  var onOpen = props.onOpen;
  var accent = window.__mtxIATasks.getAccent(t.category);

  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={onOpen ? function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : undefined}
      aria-label={onOpen ? 'Ver detalle: ' + t.title + ' (espera tu OK)' : undefined}
      className={onOpen ? 'mtx-tap' : undefined}
      style={{
      padding: '14px 14px 12px',
      borderRadius: 16,
      background: 'linear-gradient(135deg, rgba(255,200,80,0.06), rgba(255,200,80,0.01))',
      border: '0.5px solid rgba(255,200,80,0.28)',
      animation: 'mtx-fade-up .25s ease both',
      cursor: onOpen ? 'pointer' : 'default',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        {/* Icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(255,200,80,0.20), rgba(255,200,80,0.05))',
          border: '0.5px solid rgba(255,200,80,0.35)',
          color: '#ffc850',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19, lineHeight: 1,
          boxShadow: '0 0 12px rgba(255,200,80,0.20)',
        }}>
          <span role="img" aria-hidden="true">{t.icon}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mtx-eyebrow" style={{
            fontSize: 9, color: '#ffc850',
            letterSpacing: '0.14em',
            marginBottom: 4,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#ffc850',
              boxShadow: '0 0 6px rgba(255,200,80,0.8)',
              animation: 'mtxTaskDotPulse 1.4s ease-in-out infinite',
            }}/>
            ESPERA TU OK
          </div>
          <div style={{
            fontSize: 13.5, fontWeight: 700,
            color: 'var(--ink-1)',
            letterSpacing: '-0.012em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
            lineHeight: 1.25,
            marginBottom: 4,
          }}>{t.title}</div>
          <div style={{
            fontSize: 11.5, color: 'var(--ink-3)',
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
          }}>{t.description}</div>
        </div>
      </div>

      {/* Preview de la acción (si aplica) */}
      {t.action && t.action.preview && (
        <div style={{
          padding: '8px 10px',
          borderRadius: 10,
          background: 'rgba(0,0,0,0.25)',
          border: '0.5px solid rgba(255,255,255,0.04)',
          fontSize: 11.5, color: 'var(--ink-2)',
          fontStyle: 'italic',
          lineHeight: 1.5,
          letterSpacing: '-0.005em',
          fontFamily: 'var(--ff-sans)',
          marginBottom: 10,
        }}>"{t.action.preview}"</div>
      )}

      {t.action && t.action.when && (
        <div style={{
          padding: '6px 10px',
          borderRadius: 10,
          background: 'rgba(0,0,0,0.25)',
          border: '0.5px solid rgba(255,255,255,0.04)',
          fontSize: 11.5, color: 'var(--ink-2)',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
          marginBottom: 10,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <span>📅</span>
          <span>{t.action.when}</span>
        </div>
      )}

      {/* Footer: timestamp + actions */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingTop: 10,
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          fontSize: 10, color: 'var(--ink-4)',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
        }}>
          {/* Post-audit Fase 2: formatRelative ya incluye "Hace …" — no
              re-prepender (antes producía "Hace Hace un momento"). */}
          {window.__mtxIATasks.formatRelative(t.requestedAt)}
        </div>
        <div style={{ flex: 1 }}/>
        <button
          onClick={function(e) { e.stopPropagation(); onDismiss(); }}
          onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onDismiss(); } }}
          aria-label="Rechazar"
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            color: 'var(--ink-3)',
            fontSize: 11, fontWeight: 600,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
          }}>Rechazar</button>
        <button
          onClick={function(e) { e.stopPropagation(); onApprove(); }}
          onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onApprove(); } }}
          aria-label="Aprobar"
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '6px 14px', borderRadius: 999, border: 0,
            background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
            color: '#0a1410',
            fontSize: 11, fontWeight: 700,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            boxShadow: '0 4px 10px -2px rgba(61,255,209,0.40)',
          }}>Aprobar</button>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// HistoryTaskItem — item del log de ejecuciones
// ═══════════════════════════════════════════════════════════════════════════

function HistoryTaskItem(props) {
  var t = props.task;
  var onRetry = props.onRetry;
  var onOpen = props.onOpen;
  var accent = window.__mtxIATasks.getAccent(t.category);
  var isError = t.status === 'error';
  var isDismissed = t.status === 'dismissed';

  var statusColor = isError ? '#ff8b8b'
                  : isDismissed ? 'var(--ink-4)'
                  : '#3dffd1';
  var statusIcon = isError ? '✕'
                  : isDismissed ? '○'
                  : '✓';

  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={onOpen ? function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : undefined}
      aria-label={onOpen ? 'Ver detalle: ' + t.title + ' (' + t.status + ')' : undefined}
      className={onOpen ? 'mtx-tap' : undefined}
      style={{
      padding: '10px 12px',
      borderRadius: 12,
      background: 'rgba(255,255,255,0.02)',
      border: '0.5px solid rgba(255,255,255,0.05)',
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'mtx-fade-up .2s ease both',
      opacity: isDismissed ? 0.55 : 1,
      cursor: onOpen ? 'pointer' : 'default',
    }}>
      {/* Status indicator (left bar) */}
      <div style={{
        width: 28, height: 28, borderRadius: 9, flexShrink: 0,
        background: statusColor + '14',
        border: '0.5px solid ' + statusColor + '32',
        color: statusColor,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800,
        fontFamily: 'var(--ff-sans)',
      }}>{statusIcon}</div>

      {/* Icon emoji */}
      <div style={{
        fontSize: 14, lineHeight: 1, opacity: isDismissed ? 0.6 : 1,
        flexShrink: 0,
      }}>
        <span role="img" aria-hidden="true">{t.icon}</span>
      </div>

      {/* Title + message */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600,
          color: 'var(--ink-1)',
          letterSpacing: '-0.008em',
          fontFamily: 'var(--ff-sans)',
          lineHeight: 1.25,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: t.message ? 2 : 0,
        }}>{t.title}</div>
        {t.message && (
          <div style={{
            fontSize: 10.5, color: isError ? '#ff8b8b' : 'var(--ink-4)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{t.message}</div>
        )}
      </div>

      {/* Right: time + duration / retry CTA */}
      {isError && onRetry ? (
        <button
          onClick={function(e) { e.stopPropagation(); onRetry(); }}
          aria-label="Reintentar"
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '5px 10px', borderRadius: 999,
            background: 'rgba(255,139,139,0.08)',
            border: '0.5px solid rgba(255,139,139,0.28)',
            color: '#ff8b8b',
            fontSize: 10, fontWeight: 700,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            flexShrink: 0,
          }}>Reintentar</button>
      ) : (
        <div style={{
          fontSize: 10, color: 'var(--ink-4)',
          textAlign: 'right',
          fontFamily: 'var(--ff-sans)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.005em',
          flexShrink: 0,
        }}>
          <div>{window.__mtxIATasks.formatRelative(t.ranAt)}</div>
          {t.durationMs > 0 && (
            <div style={{ opacity: 0.7, marginTop: 1 }}>{window.__mtxIATasks.formatDuration(t.durationMs)}</div>
          )}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// TasksSheet — full-screen con 4 sub-tabs
// ═══════════════════════════════════════════════════════════════════════════

function TasksSheet(props) {
  var onClose = props.onClose;

  useIATasks();  // suscribirse a cambios

  // HOOKS FIRST (post-audit Fase 3+4 pattern) — declarar todos los hooks
  // ANTES del early return, para evitar hook count mismatch.
  var subState = React.useState('active');
  var sub = subState[0]; var setSub = subState[1];

  // Detail sheet: click en una card → ve timeline + entregables + actions
  var detailTaskState = React.useState(null);
  var detailTask = detailTaskState[0]; var setDetailTask = detailTaskState[1];

  // New task sheet: "+" en header → launcher de skills/workflows
  var newTaskOpenState = React.useState(false);
  var newTaskOpen = newTaskOpenState[0]; var setNewTaskOpen = newTaskOpenState[1];

  // Filter dentro de Historial: Todas | Completadas | Errores | Descartadas
  var historyFilterState = React.useState('all');
  var historyFilter = historyFilterState[0]; var setHistoryFilter = historyFilterState[1];

  if (!window.__mtxIATasks) return null;

  var stats   = window.__mtxIATasks.getStats();
  var active   = window.__mtxIATasks.getActive();
  var scheduled = window.__mtxIATasks.getScheduled();
  var pending = window.__mtxIATasks.getPending();
  var history = window.__mtxIATasks.getHistory();

  // Cuando los datos cambian, re-sincronizar el sub-tab inicial sólo en mount.
  // (Antes el initialState dependía de live data, lo que causaba que el primer
  // render con todo vacío te dejaba en 'scheduled' aunque luego llegaran active.)
  React.useEffect(function() {
    if (sub === 'active' && active.length === 0) {
      if (pending.length > 0) setSub('pending');
      else if (scheduled.length > 0) setSub('scheduled');
    }
  }, []);  // solo on mount

  // useToast siempre llamado (hook count estable) — post-audit Fase 2
  var _useToast = window.useToast || function() { return { show: function() {} }; };
  var toast = _useToast();

  // ESC para cerrar — ref pattern + guard completo (post-audit Fase 2)
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

  // Tick para active tasks: avanza progress cada 900ms.
  // Post-audit Fase 2: dependencia por IDs concatenados, no por length —
  // antes, si active completaba y rápidamente se aprobaba un pending, length
  // saltaba 1→0→1 y React batcheaba el efecto, dejando el nuevo task sin tick.
  var activeKey = active.map(function(a) { return a.id; }).join('|');
  React.useEffect(function() {
    if (active.length === 0) return;
    var iv = setInterval(function() {
      window.__mtxIATasks.tickActive();
    }, 900);
    return function() { clearInterval(iv); };
  }, [activeKey]);

  // Retry lock para evitar double-fire (post-audit Fase 2)
  var retryLockRef = React.useRef({});
  var handleApprove = function(t) {
    window.__mtxIATasks.approvePending(t.id);
    toast.show({ message: '✦ "' + t.title + '" en ejecución', duration: 1800 });
    setSub('active');
  };
  var handleDismiss = function(t) {
    window.__mtxIATasks.dismissPending(t.id);
    toast.show({ message: 'Descartado', duration: 1400 });
  };
  var handleRetry = function(t) {
    if (retryLockRef.current[t.id]) return;
    retryLockRef.current[t.id] = true;
    window.__mtxIATasks.retryHistory(t.id);
    toast.show({ message: '✦ Reintentando "' + t.title + '"', duration: 1800 });
    setSub('active');
    setTimeout(function() { delete retryLockRef.current[t.id]; }, 800);
  };
  var handleReplay = function(t) {
    window.__mtxIATasks.replayHistory(t.id);
    toast.show({ message: '✦ Re-ejecutando "' + t.title + '"', duration: 1800 });
    setSub('active');
  };
  var handleCancelActive = function(t) {
    window.__mtxIATasks.cancelActive(t.id);
    toast.show({ message: '"' + t.title + '" cancelada', duration: 1600 });
  };
  var handleCancelScheduled = function(t) {
    window.__mtxIATasks.cancelScheduled(t.id);
    toast.show({ message: 'Programación de "' + t.title + '" cancelada', duration: 1800 });
  };
  var handleRunScheduledNow = function(t) {
    window.__mtxIATasks.runScheduledNow(t.id);
    toast.show({ message: '✦ "' + t.title + '" iniciada', duration: 1800 });
    setSub('active');
  };
  var handleReschedule = function(t, newTs) {
    window.__mtxIATasks.rescheduleScheduled(t.id, newTs);
    toast.show({
      message: 'Reprogramada · ' + window.__mtxIATasks.formatRelative(newTs),
      duration: 2000,
    });
  };

  var SUB_TABS = [
    { id: 'active',    label: 'Activas',     count: stats.active,    accent: 'var(--neon)' },
    { id: 'pending',   label: 'Pendientes',  count: stats.pending,   accent: '#ffc850' },
    { id: 'scheduled', label: 'Programadas', count: stats.scheduled, accent: '#9b8aff' },
    { id: 'history',   label: 'Historial',   count: stats.history,   accent: '#5dd3ff' },
  ];

  var openDetail = function(task, kind) {
    setDetailTask({ task: task, kind: kind });
  };

  var content;
  if (sub === 'active') {
    content = active.length === 0
      ? (<TasksEmptyState icon="⚡" title="Nada corriendo ahora" desc="Cuando un workflow se ejecute, lo verás aquí en vivo con su progreso."/>)
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {active.map(function(t) {
            return <ActiveTaskCard key={t.id} task={t} onOpen={function() { openDetail(t, 'active'); }}/>;
          })}
        </div>
      );
  } else if (sub === 'pending') {
    content = pending.length === 0
      ? (<TasksEmptyState icon="✓" title="Sin aprobaciones pendientes" desc="Cuando el agente quiera hacer algo que requiera tu OK, aparecerá aquí."/>)
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pending.map(function(t) {
            return (
              <PendingTaskCard
                key={t.id}
                task={t}
                onApprove={function() { handleApprove(t); }}
                onDismiss={function() { handleDismiss(t); }}
                onOpen={function() { openDetail(t, 'pending'); }}
              />
            );
          })}
        </div>
      );
  } else if (sub === 'scheduled') {
    content = scheduled.length === 0
      ? (<TasksEmptyState icon="🕐" title="Sin tasks programadas" desc="Activa workflows con trigger cron para verlos aquí."/>)
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {scheduled.map(function(t) {
            return <ScheduledTaskCard key={t.id} task={t} onOpen={function() { openDetail(t, 'scheduled'); }}/>;
          })}
        </div>
      );
  } else {
    // Historial — agrega filter pills internas (Todas · Completadas · Errores)
    var filteredHistory = historyFilter === 'all' ? history
                        : historyFilter === 'success' ? history.filter(function(t) { return t.status === 'success'; })
                        : historyFilter === 'error'   ? history.filter(function(t) { return t.status === 'error'; })
                        : history.filter(function(t) { return t.status === 'dismissed'; });
    var counts = {
      all:       history.length,
      success:   history.filter(function(t) { return t.status === 'success'; }).length,
      error:     history.filter(function(t) { return t.status === 'error'; }).length,
      dismissed: history.filter(function(t) { return t.status === 'dismissed'; }).length,
    };
    var FILTERS = [
      { id: 'all',       label: 'Todas',       accent: 'var(--ink-2)' },
      { id: 'success',   label: 'Completadas', accent: 'var(--neon)' },
      { id: 'error',     label: 'Errores',     accent: '#ff8b8b' },
      { id: 'dismissed', label: 'Descartadas', accent: 'var(--ink-3)' },
    ];
    content = (
      <div>
        <div className="mtx-scroll-x" style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {FILTERS.map(function(f) {
            var isActive = historyFilter === f.id;
            return (
              <button key={f.id}
                onClick={function() { setHistoryFilter(f.id); }}
                aria-pressed={isActive}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '5px 11px', borderRadius: 999,
                  border: '0.5px solid ' + (isActive ? f.accent + '40' : 'rgba(255,255,255,0.06)'),
                  background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                  color: isActive ? f.accent : 'var(--ink-3)',
                  fontSize: 10.5, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                  flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                {f.label}
                <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{counts[f.id]}</span>
              </button>
            );
          })}
        </div>
        {filteredHistory.length === 0
          ? (<TasksEmptyState icon="📜" title={'Sin ' + (historyFilter === 'all' ? 'historial todavía' : FILTERS.find(function(f) { return f.id === historyFilter; }).label.toLowerCase())} desc="Las ejecuciones recientes aparecerán aquí."/>)
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredHistory.map(function(t) {
                return (
                  <HistoryTaskItem
                    key={t.id}
                    task={t}
                    onRetry={t.status === 'error' ? function() { handleRetry(t); } : null}
                    onOpen={function() { openDetail(t, 'history'); }}
                  />
                );
              })}
            </div>
          )}
      </div>
    );
  }

  // Portal a mtx-overlay-root
  var portalRoot = (typeof document !== 'undefined')
    ? document.getElementById('mtx-overlay-root')
    : null;
  if (!portalRoot) return null;

  var sheet = (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'radial-gradient(80% 60% at 50% 0%, rgba(61,255,209,0.05), transparent 60%), #050706',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      animation: 'mtxTasksIn .35s cubic-bezier(.25,.8,.25,1) both',
    }}>
      <style>{`
        @keyframes mtxTasksIn  { from { transform:translateX(100%); opacity:0.2; } to { transform:translateX(0); opacity:1; } }
        @keyframes mtxTaskShimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
        @keyframes mtxTaskPulseHalo { 0% { transform:scale(1); opacity:0.6; } 100% { transform:scale(1.5); opacity:0; } }
        @keyframes mtxTaskDotPulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.4); opacity:0.6; } }
      `}</style>

      {/* Header con back + título + "Nueva tarea" (esquina opuesta).
          Nota conceptual: estas son tareas DEL COACH, no del usuario —
          workflows automáticos, peticiones que el coach hizo o quiere hacer,
          y ejecuciones programadas. "Nueva tarea" permite pedirle al coach
          que ejecute algo manualmente. */}
      <div style={{
        flexShrink: 0,
        paddingTop: 48, paddingLeft: 16, paddingRight: 16, paddingBottom: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <button
          onClick={onClose}
          onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
          aria-label="Volver"
          className="mtx-tap"
          style={{
            width: 40, height: 40, borderRadius: 999, border: 0,
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--ink-1)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6"/>
          </svg>
        </button>
        <button
          onClick={function() { setNewTaskOpen(true); }}
          aria-label="Nueva tarea para el coach"
          className="mtx-tap"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 13px', borderRadius: 999, border: 0,
            background: 'linear-gradient(135deg, rgba(61,255,209,0.16), rgba(61,255,209,0.04))',
            color: 'var(--neon)', cursor: 'pointer',
            fontSize: 12, fontWeight: 700,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            border: '0.5px solid rgba(61,255,209,0.32)',
          }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nueva tarea
        </button>
      </div>

      {/* Title + total counter — copy clarifica que son acciones DEL COACH */}
      <div style={{
        padding: '4px 20px 16px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexShrink: 0,
        borderBottom: '0.5px solid rgba(255,255,255,0.05)',
        marginBottom: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mtx-eyebrow" style={{
            fontSize: 9.5, color: 'var(--ink-4)',
            letterSpacing: '0.16em',
            marginBottom: 4,
            fontWeight: 600,
          }}>COACH MENTEX</div>
          <h2 style={{
            margin: 0, fontSize: 28, fontWeight: 700,
            color: 'var(--ink-1)', letterSpacing: '-0.025em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
            lineHeight: 1.1,
            marginBottom: 6,
          }}>Actividad</h2>
          <div style={{
            fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4,
            letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
            maxWidth: 280,
          }}>
            Lo que tu coach está ejecutando, programó, o espera tu aprobación.
          </div>
        </div>
        <div style={{
          padding: '6px 12px', borderRadius: 999,
          background: stats.pending > 0 ? 'rgba(255,200,80,0.10)' : 'rgba(61,255,209,0.06)',
          border: '0.5px solid ' + (stats.pending > 0 ? 'rgba(255,200,80,0.32)' : 'rgba(61,255,209,0.20)'),
          fontSize: 10.5, fontWeight: 700,
          color: stats.pending > 0 ? '#ffc850' : 'var(--neon)',
          fontFamily: 'var(--ff-sans)',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
          marginLeft: 12,
        }}>
          {stats.pending > 0
            ? stats.pending + ' pendiente' + (stats.pending === 1 ? '' : 's')
            : 'Todo al día'}
        </div>
      </div>

      {/* Sub-tabs — role=tablist + aria-selected para SR (post-audit Fase 2) */}
      <div role="tablist" aria-label="Categorías de actividad" className="mtx-scroll-x" style={{
        flexShrink: 0,
        padding: '0 16px 14px',
        display: 'flex', gap: 6,
      }}>
        {SUB_TABS.map(function(t) {
          var isActive = sub === t.id;
          var isAccentTab = t.id === 'pending' && t.count > 0;
          return (
            <button key={t.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={function() { setSub(t.id); }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '7px 13px', borderRadius: 999,
                border: '0.5px solid ' + (isActive ? t.accent + '40' : isAccentTab ? 'rgba(255,200,80,0.30)' : 'rgba(255,255,255,0.06)'),
                background: isActive
                  ? 'linear-gradient(180deg, ' + t.accent + '16, ' + t.accent + '04)'
                  : isAccentTab
                    ? 'rgba(255,200,80,0.06)'
                    : 'rgba(255,255,255,0.025)',
                color: isActive ? t.accent : isAccentTab ? '#ffc850' : 'var(--ink-2)',
                fontSize: 11.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                flexShrink: 0, whiteSpace: 'nowrap',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                boxShadow: isActive ? '0 0 0 1px ' + t.accent + '18, inset 0 0 10px ' + t.accent + '08' : 'none',
                transition: 'all .2s',
              }}>
              {t.label}
              {t.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  opacity: isActive ? 0.85 : 0.6,
                }}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Body scrolleable */}
      <div className="mtx-no-scrollbar" style={{
        flex: 1, overflowY: 'auto',
        padding: '4px 16px 36px',
      }}>
        {content}
      </div>

      {/* TaskDetailSheet (click en cualquier card) */}
      {detailTask && (
        <TaskDetailSheet
          task={detailTask.task}
          kind={detailTask.kind}
          onClose={function() { setDetailTask(null); }}
          onApprove={handleApprove}
          onDismiss={handleDismiss}
          onRetry={handleRetry}
          onReplay={handleReplay}
          onCancelActive={handleCancelActive}
          onCancelScheduled={handleCancelScheduled}
          onRunNow={handleRunScheduledNow}
          onReschedule={handleReschedule}
        />
      )}

      {/* NewTaskSheet (botón "+" en header) */}
      {newTaskOpen && (
        <NewTaskSheet onClose={function() { setNewTaskOpen(false); }}/>
      )}
    </div>
  );

  return window.ReactDOM ? window.ReactDOM.createPortal(sheet, portalRoot) : sheet;
}


// ═══════════════════════════════════════════════════════════════════════════
// _generateTaskTimeline — genera mock timeline de logs/thinking realista
// basado en task.icon + task.workflowId. En backend real esto se reemplaza
// por las trazas reales del agente (thinking blocks + tool calls + results).
// ═══════════════════════════════════════════════════════════════════════════
function _generateTaskTimeline(task, kind) {
  var now = Date.now();
  var startedAt = task.startedAt || task.ranAt || task.requestedAt || task.scheduledAt || now;
  var events = [];

  // Eventos comunes
  if (kind === 'scheduled') {
    events.push({ ts: startedAt - 60_000, kind: 'system', text: 'Trigger ' + (task.triggerLabel || 'cron') + ' programado' });
    events.push({ ts: startedAt - 1_000,   kind: 'system', text: 'Esperando hora de ejecución' });
    return events;
  }

  if (kind === 'pending') {
    events.push({ ts: startedAt,           kind: 'thinking', text: 'Detecté contexto: ' + (task.description || 'oportunidad para automatizar') });
    events.push({ ts: startedAt + 4_000,   kind: 'thinking', text: 'Preparé la acción y necesito tu OK antes de ejecutar' });
    if (task.action && task.action.preview) {
      events.push({ ts: startedAt + 5_000, kind: 'output',   text: 'Preview: ' + task.action.preview });
    }
    events.push({ ts: startedAt + 6_000,   kind: 'system',   text: 'Esperando aprobación del usuario…' });
    return events;
  }

  // Active or history — generar timeline basado en el workflow
  events.push({ ts: startedAt, kind: 'system', text: 'Iniciada por trigger ' + (task.triggerLabel || 'cron') });

  // Steps específicos por tipo de workflow
  var wf = task.workflowId || '';
  if (wf.indexOf('daily-briefing') >= 0) {
    events.push({ ts: startedAt + 1_000,  kind: 'tool',     text: 'calendar.list({range: "today"})' });
    events.push({ ts: startedAt + 2_500,  kind: 'result',   text: '14 eventos encontrados' });
    events.push({ ts: startedAt + 3_200,  kind: 'thinking', text: 'Cruzando eventos con tus 3 prioridades semanales…' });
    events.push({ ts: startedAt + 4_000,  kind: 'tool',     text: 'memory.recall({query: "prioridades de la semana"})' });
    events.push({ ts: startedAt + 5_000,  kind: 'result',   text: '3 metas activas, 1 en riesgo' });
    events.push({ ts: startedAt + 6_500,  kind: 'thinking', text: 'Generando resumen con tono motivacional + 3 prioridades del día' });
  } else if (wf.indexOf('hydration') >= 0) {
    events.push({ ts: startedAt + 200,    kind: 'tool',     text: 'notifications.send({channel: "push", body: "..."})' });
    events.push({ ts: startedAt + 380,    kind: 'result',   text: '✓ Notificación entregada' });
  } else if (wf.indexOf('evening-ritual') >= 0 || wf.indexOf('wind-down') >= 0) {
    events.push({ ts: startedAt + 500,    kind: 'tool',     text: 'health.read({metric: "stress", window: "today"})' });
    events.push({ ts: startedAt + 1_200,  kind: 'result',   text: 'Stress alto detectado vs ayer' });
    events.push({ ts: startedAt + 1_500,  kind: 'thinking', text: 'Sugeriré meditación de sueño de 8 min en lugar de la de 4' });
  } else if (wf.indexOf('instagram') >= 0) {
    events.push({ ts: startedAt + 400,    kind: 'tool',     text: 'memory.recall({query: "reflexión más resonante de la semana"})' });
    events.push({ ts: startedAt + 800,    kind: 'thinking', text: 'Adaptando insight a formato Instagram visual + caption corta' });
    events.push({ ts: startedAt + 1_100,  kind: 'tool',     text: 'instagram.create_post({image: ..., caption: ...})' });
    if (task.status === 'error') {
      events.push({ ts: startedAt + 1_200, kind: 'error',   text: 'API rate limit (429). Backoff sugerido: 15 min.' });
    } else {
      events.push({ ts: startedAt + 2_000, kind: 'result',  text: '✓ Post creado y agendado' });
    }
  } else if (wf.indexOf('session-journal') >= 0) {
    events.push({ ts: startedAt + 600,    kind: 'tool',     text: 'session.get_last_completed()' });
    events.push({ ts: startedAt + 1_500,  kind: 'thinking', text: 'Generando 3 preguntas reflexivas basadas en lo que trabajaste' });
    events.push({ ts: startedAt + 3_200,  kind: 'tool',     text: 'knowledge.create_note({folder: "Journal"})' });
    events.push({ ts: startedAt + 7_800,  kind: 'result',   text: '✓ Reflexión guardada en Conocimiento' });
  } else if (wf.indexOf('weekly-review') >= 0) {
    events.push({ ts: startedAt + 400,    kind: 'tool',     text: 'analytics.get_week_summary()' });
    events.push({ ts: startedAt + 1_500,  kind: 'thinking', text: 'Comparando con tus goals trimestrales' });
    events.push({ ts: startedAt + 2_800,  kind: 'tool',     text: 'notion.create_page({db: "Weekly Reviews"})' });
  }

  // Final event
  if (kind === 'active') {
    var lastTs = events.length ? events[events.length - 1].ts : startedAt;
    events.push({ ts: lastTs + 800, kind: 'thinking', text: task.currentStep || 'Ejecutando…' });
  } else if (kind === 'history') {
    var endTs = startedAt + (task.durationMs || 1000);
    if (task.status === 'error') {
      // El error ya está en events si fue instagram; si no, agregar uno genérico
      var hasError = events.some(function(e) { return e.kind === 'error'; });
      if (!hasError) {
        events.push({ ts: endTs - 200, kind: 'error',  text: task.message || 'Error desconocido' });
      }
    } else {
      events.push({ ts: endTs, kind: 'success', text: task.message || '✓ Completada' });
    }
  }

  return events;
}


// ═══════════════════════════════════════════════════════════════════════════
// _generateTaskDeliverables — entregables mock basado en el tipo de task
// ═══════════════════════════════════════════════════════════════════════════
function _generateTaskDeliverables(task) {
  var wf = task.workflowId || '';
  var del = [];
  if (wf.indexOf('daily-briefing') >= 0) {
    del.push({ icon: '📄', label: 'Resumen del día.md',     kind: 'doc',      size: '2.4 KB' });
    del.push({ icon: '📅', label: '3 bloques agendados',    kind: 'calendar', meta: 'Ver en Google Calendar' });
  } else if (wf.indexOf('instagram') >= 0 && task.status !== 'error') {
    del.push({ icon: '🖼️', label: 'Post-imagen.png',        kind: 'image',    size: '486 KB' });
    del.push({ icon: '📝', label: 'Caption.txt',            kind: 'doc',      size: '0.3 KB' });
  } else if (wf.indexOf('session-journal') >= 0) {
    del.push({ icon: '📔', label: 'Reflexión 2026-05-11.md', kind: 'doc',     size: '3.1 KB' });
  } else if (wf.indexOf('weekly-review') >= 0) {
    del.push({ icon: '📊', label: 'Weekly Review · Sem 19.md', kind: 'doc',  size: '5.7 KB' });
    del.push({ icon: '🔗', label: 'Página en Notion',       kind: 'link',     meta: 'notion.so/...' });
  } else if (task.type === 'post-social') {
    del.push({ icon: '🧵', label: 'Thread completo (4 tweets)', kind: 'doc', size: '1.2 KB' });
  } else if (task.type === 'calendar-block') {
    del.push({ icon: '📅', label: 'Evento Calendar (preview)', kind: 'calendar', meta: task.action && task.action.when });
  }
  return del;
}


// ═══════════════════════════════════════════════════════════════════════════
// TaskDetailSheet — click en cualquier card abre este sheet con timeline,
// entregables descargables y actions contextuales.
// ═══════════════════════════════════════════════════════════════════════════
function TaskDetailSheet(props) {
  var task = props.task;
  var kind = props.kind;  // 'active' | 'pending' | 'scheduled' | 'history'
  var onClose = props.onClose;
  var onApprove = props.onApprove;
  var onDismiss = props.onDismiss;
  var onRetry = props.onRetry;
  var onReplay = props.onReplay;
  var onCancelActive = props.onCancelActive;
  var onCancelScheduled = props.onCancelScheduled;
  var onRunNow = props.onRunNow;
  var onReschedule = props.onReschedule;

  // Reprogram picker state (inline expand)
  var reprogramOpenState = React.useState(false);
  var reprogramOpen = reprogramOpenState[0]; var setReprogramOpen = reprogramOpenState[1];
  // Inline cancel confirm
  var confirmCancelState = React.useState(false);
  var confirmCancel = confirmCancelState[0]; var setConfirmCancel = confirmCancelState[1];

  // ESC + body scroll + backdrop drag-release (post-audit Fase 3+4 pattern)
  var onCloseRef = React.useRef(onClose);
  React.useEffect(function() { onCloseRef.current = onClose; });
  React.useEffect(function() {
    var onKey = function(e) {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
      var t = e.target; var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);
  React.useEffect(function() {
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function() { document.body.style.overflow = prev; };
  }, []);
  var backdropDownRef = React.useRef(false);
  var handleBackdropDown = function(e) { backdropDownRef.current = e.target === e.currentTarget; };
  var handleBackdropClick = function(e) {
    if (e.target === e.currentTarget && backdropDownRef.current) onCloseRef.current();
    backdropDownRef.current = false;
  };

  var _useToast = window.useToast || function() { return { show: function() {} }; };
  var toast = _useToast();

  var accent = window.__mtxIATasks.getAccent(task.category);
  var timeline = _generateTaskTimeline(task, kind);
  var deliverables = _generateTaskDeliverables(task);

  var handleDownload = function(d) {
    toast.show({ message: '✦ ' + d.label + ' descargando…', duration: 1600 });
  };
  var handleViewLink = function(d) {
    toast.show({ message: 'Abriendo ' + (d.meta || d.label) + '…', duration: 1400 });
  };

  // Status badge color/text por kind
  var statusInfo = (function() {
    if (kind === 'active')    return { color: 'var(--neon)', label: 'EJECUTANDO' };
    if (kind === 'pending')   return { color: '#ffc850',     label: 'ESPERA TU OK' };
    if (kind === 'scheduled') return { color: '#9b8aff',     label: 'PROGRAMADA' };
    if (kind === 'history' && task.status === 'success') return { color: 'var(--neon)', label: 'COMPLETADA' };
    if (kind === 'history' && task.status === 'error')   return { color: '#ff8b8b',     label: 'ERROR' };
    if (kind === 'history' && task.status === 'dismissed') return { color: 'var(--ink-3)', label: 'DESCARTADA' };
    return { color: 'var(--ink-3)', label: 'TASK' };
  })();

  var portalRoot = (typeof document !== 'undefined')
    ? document.getElementById('mtx-overlay-root')
    : null;
  if (!portalRoot) return null;

  var content = (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 220,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'mtx-fade-up .25s ease',
    }} onMouseDown={handleBackdropDown} onClick={handleBackdropClick}>
      <div onClick={function(e) { e.stopPropagation(); }}
        role="dialog" aria-modal="true" aria-label={'Detalle de tarea: ' + task.title}
        className="mtx-no-scrollbar"
        style={{
          background: 'rgba(15,19,19,0.96)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderTop: '0.5px solid rgba(255,255,255,0.10)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '14px 20px 28px',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
          maxHeight: '92%', overflow: 'auto',
          animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
        }}>
        {/* Grabber */}
        <div aria-hidden="true" style={{
          width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
          background: 'rgba(255,255,255,0.16)',
        }}/>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <div aria-hidden="true" style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, ' + accent + '28, ' + accent + '08)',
            border: '0.5px solid ' + accent + '40',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 0 14px ' + accent + '24',
          }}>{task.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: 'var(--ink-1)',
              letterSpacing: '-0.018em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              marginBottom: 3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{task.title}</div>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: statusInfo.color,
              letterSpacing: '0.10em',
              marginBottom: 4,
            }}>{statusInfo.label}</div>
            {task.description && (
              <div style={{
                fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.45,
                letterSpacing: '-0.005em',
              }}>{task.description}</div>
            )}
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

        {/* Active: progress bar grande */}
        {kind === 'active' && (
          <div style={{ marginBottom: 18 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginBottom: 8,
            }}>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                Paso {(task.currentStepIndex || 1)}/{(task.totalSteps || 1)} · {task.currentStep || 'Procesando…'}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: accent,
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                fontVariantNumeric: 'tabular-nums',
              }}>{Math.round(task.progress || 0)}%</div>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                width: (task.progress || 0) + '%', height: '100%',
                background: 'linear-gradient(90deg, ' + accent + ', ' + accent + 'cc)',
                borderRadius: 999,
                transition: 'width .6s cubic-bezier(.4,1.4,.5,1)',
                boxShadow: '0 0 8px ' + accent + '60',
              }}/>
            </div>
          </div>
        )}

        {/* Pending: action preview + Aprobar/Rechazar */}
        {kind === 'pending' && task.action && task.action.preview && (
          <div style={{
            padding: '12px 14px', borderRadius: 14,
            background: 'rgba(255,200,80,0.06)',
            border: '0.5px solid rgba(255,200,80,0.20)',
            marginBottom: 18,
          }}>
            <div className="mtx-eyebrow" style={{ fontSize: 9, color: '#ffc850', marginBottom: 6 }}>
              VISTA PREVIA DE LA ACCIÓN
            </div>
            <div style={{
              fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              fontStyle: 'italic',
            }}>{task.action.preview}</div>
          </div>
        )}

        {/* Scheduled: trigger info */}
        {kind === 'scheduled' && (
          <div style={{
            padding: '12px 14px', borderRadius: 14,
            background: 'rgba(155,138,255,0.06)',
            border: '0.5px solid rgba(155,138,255,0.20)',
            marginBottom: 18,
          }}>
            <div className="mtx-eyebrow" style={{ fontSize: 9, color: '#9b8aff', marginBottom: 6 }}>
              TRIGGER
            </div>
            <div style={{
              fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5,
              fontFamily: 'var(--ff-sans)',
            }}>{task.triggerLabel || 'Programada'}</div>
            <div style={{
              fontSize: 11, color: 'var(--ink-4)', marginTop: 4,
              fontFamily: 'var(--ff-sans)',
            }}>{window.__mtxIATasks.formatRelative(task.scheduledAt)}</div>
          </div>
        )}

        {/* Timeline de logs / thinking */}
        <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>
          {kind === 'scheduled' ? 'PLAN DE EJECUCIÓN' : 'LOG DEL AGENTE'}
        </div>
        <div style={{
          borderRadius: 14,
          background: 'rgba(255,255,255,0.02)',
          border: '0.5px solid rgba(255,255,255,0.05)',
          marginBottom: 18,
          overflow: 'hidden',
        }}>
          {timeline.map(function(e, i) {
            var evColor = e.kind === 'thinking' ? 'var(--ink-3)'
                        : e.kind === 'tool'     ? '#5dd3ff'
                        : e.kind === 'result'   ? 'var(--ink-2)'
                        : e.kind === 'output'   ? 'var(--ink-2)'
                        : e.kind === 'success'  ? 'var(--neon)'
                        : e.kind === 'error'    ? '#ff8b8b'
                        : 'var(--ink-4)';
            var evIcon = e.kind === 'thinking' ? '◌'
                       : e.kind === 'tool'     ? '⚒'
                       : e.kind === 'result'   ? '↳'
                       : e.kind === 'output'   ? '↳'
                       : e.kind === 'success'  ? '✓'
                       : e.kind === 'error'    ? '✕'
                       : '·';
            var isMono = e.kind === 'tool';
            return (
              <div key={e.ts + ':' + i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '9px 12px',
                borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div aria-hidden="true" style={{
                  width: 18, fontSize: 11, color: evColor, flexShrink: 0,
                  textAlign: 'center', marginTop: 1, fontWeight: 700,
                }}>{evIcon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: isMono ? 10.5 : 11.5,
                    color: evColor, lineHeight: 1.45,
                    fontFamily: isMono ? 'ui-monospace, SF Mono, Menlo, monospace' : 'var(--ff-sans)',
                    letterSpacing: isMono ? 0 : '-0.005em',
                    fontStyle: e.kind === 'thinking' ? 'italic' : 'normal',
                    wordBreak: 'break-word',
                  }}>{e.text}</div>
                  <div style={{
                    fontSize: 9.5, color: 'var(--ink-4)', marginTop: 2,
                    fontFamily: 'var(--ff-sans)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{window.__mtxIATasks.formatTime(e.ts)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Entregables (si los hay) */}
        {deliverables.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>
              ENTREGABLES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {deliverables.map(function(d, i) {
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.025)',
                    border: '0.5px solid rgba(255,255,255,0.06)',
                  }}>
                    <div aria-hidden="true" style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: 'rgba(255,255,255,0.04)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15,
                    }}>{d.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{d.label}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 1 }}>
                        {d.size || d.meta || ''}
                      </div>
                    </div>
                    <button
                      onClick={function() {
                        if (d.kind === 'link' || d.kind === 'calendar') handleViewLink(d);
                        else handleDownload(d);
                      }}
                      className="mtx-tap"
                      aria-label={(d.kind === 'link' || d.kind === 'calendar' ? 'Ver' : 'Descargar') + ' ' + d.label}
                      style={{
                        appearance: 'none', cursor: 'pointer',
                        padding: '6px 12px', borderRadius: 999, border: 0,
                        background: 'rgba(61,255,209,0.10)',
                        border: '0.5px solid rgba(61,255,209,0.30)',
                        color: 'var(--neon)',
                        fontSize: 11, fontWeight: 700,
                        fontFamily: 'var(--ff-sans)',
                        flexShrink: 0,
                      }}>
                      {d.kind === 'link' || d.kind === 'calendar' ? 'Ver' : 'Descargar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions footer contextuales por kind */}
        {kind === 'active' && !confirmCancel && (
          <button onClick={function() { setConfirmCancel(true); }}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer', width: '100%',
              padding: '12px 14px', borderRadius: 14,
              background: 'rgba(255,107,107,0.06)',
              border: '0.5px solid rgba(255,107,107,0.24)',
              color: '#ff8b8b',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
            }}>✕  Cancelar tarea</button>
        )}
        {kind === 'active' && confirmCancel && (
          <div style={{
            padding: '12px 14px', borderRadius: 14,
            background: 'rgba(255,107,107,0.06)',
            border: '0.5px solid rgba(255,107,107,0.30)',
          }}>
            <div style={{
              fontSize: 12, color: '#ff8b8b', marginBottom: 10,
              fontWeight: 600, textAlign: 'center',
            }}>¿Cancelar "{task.title}"? El coach detendrá la ejecución.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={function() { setConfirmCancel(false); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer', flex: 1,
                  padding: '9px 12px', borderRadius: 11,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  color: 'var(--ink-2)',
                  fontSize: 12, fontWeight: 600,
                }}>Mantener</button>
              <button onClick={function() { if (onCancelActive) onCancelActive(task); setConfirmCancel(false); onClose(); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer', flex: 1,
                  padding: '9px 12px', borderRadius: 11,
                  background: 'rgba(255,107,107,0.16)',
                  border: '0.5px solid rgba(255,107,107,0.40)',
                  color: '#ff8b8b',
                  fontSize: 12, fontWeight: 700,
                }}>Sí, cancelar</button>
            </div>
          </div>
        )}

        {kind === 'pending' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button onClick={function() { if (onDismiss) onDismiss(task); onClose(); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer', flex: 1,
                  padding: '12px 14px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  color: 'var(--ink-2)',
                  fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                }}>Rechazar</button>
              <button onClick={function() { if (onApprove) onApprove(task); onClose(); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer', flex: 2,
                  padding: '12px 14px', borderRadius: 14, border: 0,
                  background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
                  color: '#0a1410',
                  fontSize: 13, fontWeight: 700,
                  fontFamily: 'var(--ff-sans)',
                  boxShadow: '0 4px 14px -2px rgba(61,255,209,0.42)',
                }}>✦ Aprobar y ejecutar</button>
            </div>
          </div>
        )}

        {kind === 'scheduled' && !reprogramOpen && !confirmCancel && (
          <div>
            <button onClick={function() { if (onRunNow) onRunNow(task); onClose(); }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer', width: '100%',
                padding: '12px 14px', borderRadius: 14, border: 0,
                background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
                color: '#0a1410',
                fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--ff-sans)',
                marginBottom: 8,
                boxShadow: '0 4px 14px -2px rgba(61,255,209,0.42)',
              }}>▶  Ejecutar ahora</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={function() { setReprogramOpen(true); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer', flex: 1,
                  padding: '11px 12px', borderRadius: 13,
                  background: 'rgba(155,138,255,0.06)',
                  border: '0.5px solid rgba(155,138,255,0.28)',
                  color: '#9b8aff',
                  fontSize: 12, fontWeight: 700,
                  fontFamily: 'var(--ff-sans)',
                }}>🕐  Reprogramar</button>
              <button onClick={function() { setConfirmCancel(true); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer', flex: 1,
                  padding: '11px 12px', borderRadius: 13,
                  background: 'rgba(255,107,107,0.06)',
                  border: '0.5px solid rgba(255,107,107,0.24)',
                  color: '#ff8b8b',
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                }}>Cancelar</button>
            </div>
          </div>
        )}

        {kind === 'scheduled' && reprogramOpen && (
          <div style={{
            padding: '14px 14px', borderRadius: 14,
            background: 'rgba(155,138,255,0.06)',
            border: '0.5px solid rgba(155,138,255,0.28)',
          }}>
            <div className="mtx-eyebrow" style={{ fontSize: 9, color: '#9b8aff', marginBottom: 10 }}>
              REPROGRAMAR
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'En 15 minutos',    ms: 15 * 60 * 1000 },
                { label: 'En 1 hora',         ms: 60 * 60 * 1000 },
                { label: 'En 3 horas',        ms: 3 * 60 * 60 * 1000 },
                { label: 'Mañana a esta hora', ms: 24 * 60 * 60 * 1000 },
                { label: 'En 1 semana',       ms: 7 * 24 * 60 * 60 * 1000 },
              ].map(function(o) {
                return (
                  <button key={o.label}
                    onClick={function() {
                      if (onReschedule) onReschedule(task, Date.now() + o.ms);
                      setReprogramOpen(false);
                      onClose();
                    }}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer', textAlign: 'left',
                      padding: '10px 12px', borderRadius: 11,
                      background: 'rgba(255,255,255,0.025)',
                      border: '0.5px solid rgba(255,255,255,0.06)',
                      color: 'var(--ink-1)',
                      fontSize: 12.5, fontWeight: 600,
                      fontFamily: 'var(--ff-sans)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                    <span>{o.label}</span>
                    <span style={{ color: 'var(--ink-4)', fontSize: 11 }}>›</span>
                  </button>
                );
              })}
            </div>
            <button onClick={function() { setReprogramOpen(false); }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer', width: '100%',
                padding: '9px 12px', borderRadius: 11,
                background: 'transparent',
                color: 'var(--ink-3)',
                fontSize: 11.5, fontWeight: 600,
                marginTop: 8,
                border: 0,
              }}>Volver</button>
          </div>
        )}

        {kind === 'scheduled' && confirmCancel && (
          <div style={{
            padding: '12px 14px', borderRadius: 14,
            background: 'rgba(255,107,107,0.06)',
            border: '0.5px solid rgba(255,107,107,0.30)',
          }}>
            <div style={{
              fontSize: 12, color: '#ff8b8b', marginBottom: 10,
              fontWeight: 600, textAlign: 'center',
            }}>¿Cancelar la programación de "{task.title}"?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={function() { setConfirmCancel(false); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer', flex: 1,
                  padding: '9px 12px', borderRadius: 11,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  color: 'var(--ink-2)',
                  fontSize: 12, fontWeight: 600,
                }}>Mantener</button>
              <button onClick={function() { if (onCancelScheduled) onCancelScheduled(task); setConfirmCancel(false); onClose(); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer', flex: 1,
                  padding: '9px 12px', borderRadius: 11,
                  background: 'rgba(255,107,107,0.16)',
                  border: '0.5px solid rgba(255,107,107,0.40)',
                  color: '#ff8b8b',
                  fontSize: 12, fontWeight: 700,
                }}>Sí, cancelar</button>
            </div>
          </div>
        )}

        {kind === 'history' && task.status === 'error' && (
          <button onClick={function() { if (onRetry) onRetry(task); onClose(); }}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer', width: '100%',
              padding: '12px 14px', borderRadius: 14, border: 0,
              background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
              color: '#0a1410',
              fontSize: 13, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              boxShadow: '0 4px 14px -2px rgba(61,255,209,0.42)',
            }}>↻  Reintentar</button>
        )}

        {kind === 'history' && task.status === 'success' && (
          <button onClick={function() { if (onReplay) onReplay(task); onClose(); }}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer', width: '100%',
              padding: '12px 14px', borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'var(--ink-2)',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
            }}>↻  Volver a ejecutar</button>
        )}

        {kind === 'history' && task.status === 'dismissed' && (
          <button onClick={function() { if (onReplay) onReplay(task); onClose(); }}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer', width: '100%',
              padding: '12px 14px', borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'var(--ink-2)',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
            }}>▶  Ejecutar de nuevo</button>
        )}
      </div>
    </div>
  );
  return window.ReactDOM ? window.ReactDOM.createPortal(content, portalRoot) : content;
}


// ═══════════════════════════════════════════════════════════════════════════
// NewTaskSheet — "+ Nueva tarea" launcher. Permite al user pedirle al coach
// que ejecute un workflow oficial, active una skill, o haga una petición libre.
// ═══════════════════════════════════════════════════════════════════════════
function NewTaskSheet(props) {
  var onClose = props.onClose;
  var requestState = React.useState('');
  var request = requestState[0]; var setRequest = requestState[1];

  var onCloseRef = React.useRef(onClose);
  React.useEffect(function() { onCloseRef.current = onClose; });
  React.useEffect(function() {
    var onKey = function(e) {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
      var t = e.target; var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);
  React.useEffect(function() {
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function() { document.body.style.overflow = prev; };
  }, []);

  var _useToast = window.useToast || function() { return { show: function() {} }; };
  var toast = _useToast();

  // Workflows activos (oficiales + propios)
  var workflows = (window.__mtxIAWorkflows && window.__mtxIAWorkflows.getOfficialWorkflows)
    ? window.__mtxIAWorkflows.getOfficialWorkflows().filter(function(w) { return w.enabled; }).slice(0, 5)
    : [];

  var runWorkflow = function(wf) {
    toast.show({ message: '✦ Ejecutando "' + wf.title + '"…', duration: 1800 });
    onClose();
  };
  var sendRequest = function() {
    if (!request.trim()) return;
    toast.show({ message: '✦ Petición enviada al coach', duration: 1800 });
    setRequest('');
    onClose();
  };

  var portalRoot = (typeof document !== 'undefined')
    ? document.getElementById('mtx-overlay-root')
    : null;
  if (!portalRoot) return null;

  var content = (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 230,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'mtx-fade-up .25s ease',
    }} onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div onClick={function(e) { e.stopPropagation(); }}
        role="dialog" aria-modal="true" aria-label="Nueva tarea para el coach"
        className="mtx-no-scrollbar"
        style={{
          background: 'rgba(15,19,19,0.96)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderTop: '0.5px solid rgba(255,255,255,0.10)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '14px 20px 28px',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
          maxHeight: '88%', overflow: 'auto',
          animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
        }}>
        <div aria-hidden="true" style={{
          width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
          background: 'rgba(255,255,255,0.16)',
        }}/>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <div aria-hidden="true" style={{
            width: 42, height: 42, borderRadius: 13, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(61,255,209,0.22), rgba(61,255,209,0.06)) ',
            border: '0.5px solid rgba(61,255,209,0.36)',
            color: 'var(--neon)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19, fontWeight: 700,
            boxShadow: '0 0 14px rgba(61,255,209,0.24)',
          }}>+</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: 'var(--ink-1)',
              letterSpacing: '-0.018em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              marginBottom: 3,
            }}>Nueva tarea</div>
            <div style={{
              fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.45,
              letterSpacing: '-0.005em',
            }}>Pídele al coach que ejecute un workflow o haz una petición personalizada.</div>
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

        {/* Custom request textarea */}
        <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>
          PETICIÓN PERSONALIZADA
        </div>
        <textarea
          value={request}
          onChange={function(e) { setRequest(e.target.value); }}
          placeholder='Ej: "Resúmeme las 3 prioridades para mañana", "Investiga qué dijo Tim Ferriss sobre journaling"…'
          rows={4}
          maxLength={500}
          style={{
            width: '100%', boxSizing: 'border-box',
            appearance: 'none', outline: 'none',
            background: 'rgba(0,0,0,0.20)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            borderRadius: 14,
            padding: '12px 14px',
            color: 'var(--ink-1)',
            fontSize: 13, lineHeight: 1.5,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            resize: 'none',
            marginBottom: 8,
          }}
        />
        <button onClick={sendRequest} disabled={!request.trim()}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: request.trim() ? 'pointer' : 'not-allowed',
            width: '100%', padding: '11px 14px', borderRadius: 13, border: 0,
            background: request.trim()
              ? 'linear-gradient(135deg, var(--neon), #1ad9ad)'
              : 'rgba(255,255,255,0.04)',
            color: request.trim() ? '#0a1410' : 'var(--ink-4)',
            fontSize: 13, fontWeight: 700,
            fontFamily: 'var(--ff-sans)',
            opacity: request.trim() ? 1 : 0.5,
            marginBottom: 20,
            boxShadow: request.trim() ? '0 4px 14px -2px rgba(61,255,209,0.42)' : 'none',
          }}>
          ✦ Enviar al coach
        </button>

        {/* Workflows activos para invocar */}
        {workflows.length > 0 && (
          <>
            <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>
              O EJECUTA UN WORKFLOW AHORA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {workflows.map(function(wf) {
                return (
                  <button key={wf.id}
                    onClick={function() { runWorkflow(wf); }}
                    aria-label={'Ejecutar ' + wf.title}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 12px', borderRadius: 14,
                      background: 'rgba(255,255,255,0.025)',
                      border: '0.5px solid rgba(255,255,255,0.06)',
                      transition: 'all .2s',
                    }}>
                    <div aria-hidden="true" style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(255,255,255,0.04)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16,
                    }}>{wf.icon || '⚙️'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12.5, fontWeight: 700, color: 'var(--ink-1)',
                        letterSpacing: '-0.012em',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{wf.title}</div>
                      <div style={{
                        fontSize: 10.5, color: 'var(--ink-4)', marginTop: 1,
                      }}>Ejecutar ahora</div>
                    </div>
                    <div aria-hidden="true" style={{
                      color: 'var(--ink-4)', fontSize: 13, flexShrink: 0,
                    }}>›</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
  return window.ReactDOM ? window.ReactDOM.createPortal(content, portalRoot) : content;
}


// ═══════════════════════════════════════════════════════════════════════════
// TasksEmptyState — placeholder común para sub-tabs vacíos
// ═══════════════════════════════════════════════════════════════════════════

function TasksEmptyState(props) {
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.02)',
      border: '0.5px dashed rgba(255,255,255,0.08)',
      animation: 'mtx-fade-up .3s ease both',
    }}>
      <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.5 }}>{props.icon}</div>
      <div style={{
        fontSize: 13, fontWeight: 600, color: 'var(--ink-1)',
        letterSpacing: '-0.012em',
        fontFamily: 'var(--ff-display, var(--ff-sans))',
        marginBottom: 6,
      }}>{props.title}</div>
      <div style={{
        fontSize: 11.5, color: 'var(--ink-3)',
        lineHeight: 1.5,
        letterSpacing: '-0.005em',
        fontFamily: 'var(--ff-sans)',
        maxWidth: 270, margin: '0 auto',
      }}>{props.desc}</div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// IATasksIcon — botón con badge dinámico para el header IA
// ═══════════════════════════════════════════════════════════════════════════
// Tap → setTasksOpen(true) en IAScreen. Badge muestra pending count.

function IATasksIcon(props) {
  var onClick = props.onClick;
  useIATasks();
  var stats = window.__mtxIATasks ? window.__mtxIATasks.getStats() : { pending: 0, active: 0 };
  var hasPending = stats.pending > 0;
  var hasActive = stats.active > 0;

  return (
    <button
      onClick={onClick}
      aria-label={'Actividad del coach' + (hasPending ? ' · ' + stats.pending + ' pendientes' : '')}
      className="mtx-tap"
      style={{
        position: 'relative',
        width: 36, height: 36, borderRadius: 999,
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        color: hasPending ? '#ffc850' : hasActive ? 'var(--neon)' : 'var(--ink-1)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
        transition: 'all .2s',
      }}>
      {/* SVG lightning bolt — connota "actividad" del agente */}
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={hasPending || hasActive ? 'currentColor' : 'none'} fillOpacity={hasPending || hasActive ? 0.18 : 0}/>
      </svg>
      {/* Badge: pending count (amber) o active running indicator (neon) */}
      {hasPending && (
        <span style={{
          position: 'absolute', top: -3, right: -3,
          minWidth: 16, height: 16, padding: '0 4px',
          borderRadius: 999,
          background: '#ffc850',
          color: '#0a1410',
          fontSize: 9, fontWeight: 700,
          fontFamily: 'var(--ff-sans)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          letterSpacing: '-0.005em',
          boxShadow: '0 0 0 1.5px rgba(10,13,12,0.95), 0 0 8px rgba(255,200,80,0.50)',
        }}>{stats.pending > 9 ? '9+' : stats.pending}</span>
      )}
      {!hasPending && hasActive && (
        <span style={{
          position: 'absolute', top: -1, right: -1,
          width: 10, height: 10, borderRadius: '50%',
          background: 'var(--neon)',
          boxShadow: '0 0 0 1.5px rgba(10,13,12,0.95), 0 0 8px rgba(61,255,209,0.65)',
          animation: 'mtxTaskDotPulse 1.4s ease-in-out infinite',
        }}/>
      )}
    </button>
  );
}


// ── Export ──────────────────────────────────────────────────────────────────
// Sprint A.12: TasksSheet legacy queda exportada como TasksSheetLegacy.
// Sirve de fallback si V2 no carga (defensivo) y como referencia histórica.
// El export oficial TasksSheet se redirige a V2 si existe (getter dinámico).
//
// __mtxTasksDetailHelpers expone los generadores de timeline + deliverables
// para que ia-tasks-v2.jsx los reuse sin duplicar las 200 LOC de mocks.
Object.assign(window, {
  TasksSheetLegacy:  TasksSheet,
  IATasksIcon:       IATasksIcon,
  ActiveTaskCard:    ActiveTaskCard,
  PendingTaskCard:   PendingTaskCard,
  ScheduledTaskCard: ScheduledTaskCard,
  HistoryTaskItem:   HistoryTaskItem,
  useIATasks:        useIATasks,
  __mtxTasksDetailHelpers: {
    generateTimeline:     _generateTaskTimeline,
    generateDeliverables: _generateTaskDeliverables,
  },
});

// TasksSheet: por default el legacy. Si V2 se carga después,
// se va a sobreescribir desde ia-tasks-v2.jsx con un assignment directo.
window.TasksSheet = TasksSheet;
