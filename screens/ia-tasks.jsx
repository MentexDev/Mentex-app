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
  var accent = window.__mtxIATasks.getAccent(t.category);
  var elapsed = window.__mtxIATasks.formatDuration(Date.now() - (t.startedAt || Date.now()));

  return (
    <div style={{
      padding: '14px 14px 12px',
      borderRadius: 16,
      background: 'linear-gradient(135deg, ' + accent + '0d, ' + accent + '02)',
      border: '0.5px solid ' + accent + '32',
      animation: 'mtx-fade-up .25s ease both',
      position: 'relative',
      overflow: 'hidden',
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
          boxShadow: '0 0 14px ' + accent + '24',
        }}>
          {/* Halo pulse decorativo */}
          <div style={{
            position: 'absolute', inset: -3, borderRadius: 14,
            border: '1px solid ' + accent,
            opacity: 0.5,
            animation: 'mtxTaskPulseHalo 1.6s ease-out infinite',
            pointerEvents: 'none',
          }}/>
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
  var accent = window.__mtxIATasks.getAccent(t.category);
  var countdown = window.__mtxIATasks.formatRelative(t.scheduledAt);
  var timeOfDay = window.__mtxIATasks.formatTime(t.scheduledAt);

  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.025)',
      border: '0.5px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'mtx-fade-up .25s ease both',
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
  var accent = window.__mtxIATasks.getAccent(t.category);

  return (
    <div style={{
      padding: '14px 14px 12px',
      borderRadius: 16,
      background: 'linear-gradient(135deg, rgba(255,200,80,0.06), rgba(255,200,80,0.01))',
      border: '0.5px solid rgba(255,200,80,0.28)',
      animation: 'mtx-fade-up .25s ease both',
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
          onClick={onDismiss}
          onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDismiss(); } }}
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
          onClick={onApprove}
          onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onApprove(); } }}
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
    <div style={{
      padding: '10px 12px',
      borderRadius: 12,
      background: 'rgba(255,255,255,0.02)',
      border: '0.5px solid rgba(255,255,255,0.05)',
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'mtx-fade-up .2s ease both',
      opacity: isDismissed ? 0.55 : 1,
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
          onClick={onRetry}
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

  useIATasks();  // suscribirse a cambios (return value no se usa — la
                 // suscripción dispara force-render y leemos vía live getters)
  if (!window.__mtxIATasks) return null;

  var stats   = window.__mtxIATasks.getStats();
  var active   = window.__mtxIATasks.getActive();
  var scheduled = window.__mtxIATasks.getScheduled();
  var pending = window.__mtxIATasks.getPending();
  var history = window.__mtxIATasks.getHistory();

  var subState = React.useState(active.length > 0 ? 'active' : pending.length > 0 ? 'pending' : 'scheduled');
  var sub = subState[0]; var setSub = subState[1];

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

  var SUB_TABS = [
    { id: 'active',    label: 'Activas',     count: stats.active,    accent: 'var(--neon)' },
    { id: 'pending',   label: 'Pendientes',  count: stats.pending,   accent: '#ffc850' },
    { id: 'scheduled', label: 'Programadas', count: stats.scheduled, accent: '#9b8aff' },
    { id: 'history',   label: 'Historial',   count: stats.history,   accent: '#5dd3ff' },
  ];

  var content;
  if (sub === 'active') {
    content = active.length === 0
      ? (<TasksEmptyState icon="⚡" title="Nada corriendo ahora" desc="Cuando un workflow se ejecute, lo verás aquí en vivo con su progreso."/>)
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {active.map(function(t) { return <ActiveTaskCard key={t.id} task={t}/>; })}
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
          {scheduled.map(function(t) { return <ScheduledTaskCard key={t.id} task={t}/>; })}
        </div>
      );
  } else {
    content = history.length === 0
      ? (<TasksEmptyState icon="📜" title="Sin historial todavía" desc="Las ejecuciones recientes aparecerán aquí."/>)
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {history.map(function(t) {
            return (
              <HistoryTaskItem
                key={t.id}
                task={t}
                onRetry={t.status === 'error' ? function() { handleRetry(t); } : null}
              />
            );
          })}
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

      {/* Header con back + title + (spacer) */}
      <div style={{
        flexShrink: 0,
        paddingTop: 48, paddingLeft: 16, paddingRight: 16, paddingBottom: 6,
        display: 'flex', alignItems: 'center', gap: 12,
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
        <div style={{ width: 40 }}/>
      </div>

      {/* Title + total counter */}
      <div style={{
        padding: '4px 20px 16px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexShrink: 0,
        borderBottom: '0.5px solid rgba(255,255,255,0.05)',
        marginBottom: 12,
      }}>
        <div>
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
          }}>Actividad</h2>
        </div>
        <div style={{
          padding: '6px 12px', borderRadius: 999,
          background: stats.pending > 0 ? 'rgba(255,200,80,0.10)' : 'rgba(61,255,209,0.06)',
          border: '0.5px solid ' + (stats.pending > 0 ? 'rgba(255,200,80,0.32)' : 'rgba(61,255,209,0.20)'),
          fontSize: 10.5, fontWeight: 700,
          color: stats.pending > 0 ? '#ffc850' : 'var(--neon)',
          fontFamily: 'var(--ff-sans)',
          fontVariantNumeric: 'tabular-nums',
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
    </div>
  );

  return window.ReactDOM ? window.ReactDOM.createPortal(sheet, portalRoot) : sheet;
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
Object.assign(window, {
  TasksSheet:      TasksSheet,
  IATasksIcon:     IATasksIcon,
  ActiveTaskCard:  ActiveTaskCard,
  PendingTaskCard: PendingTaskCard,
  ScheduledTaskCard: ScheduledTaskCard,
  HistoryTaskItem: HistoryTaskItem,
  useIATasks:      useIATasks,
});
