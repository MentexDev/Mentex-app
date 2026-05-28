// screens/ia-tasks-v2.jsx — Sprint A.12 · Refactor Tasks "Actividad del coach"
// ─────────────────────────────────────────────────────────────────────────────
//
// Reemplaza el TasksSheet legacy + 4 cards diferenciadas (Active, Pending,
// Scheduled, History) por:
//
//   • 1 TaskCard unificada con accent reactivo por estado.
//   • 5 tabs separados: Programadas · Pendientes · En progreso · Completadas · Fallidas
//     (Descartadas vive como sub-filter en Completadas).
//   • TaskDetailSheet Manus-style con 4 tabs internas:
//     📋 Detalles · 🧠 Proceso · 📎 Entregables · ⚙ Acciones
//
// Reusa el store __mtxIATasks original (sin tocar). Solo cambia la presentación.
//
// Mapeo old → new:
//   - kind 'active'             → status 'in_progress'
//   - kind 'pending'            → status 'pending_approval'
//   - kind 'scheduled'          → status 'scheduled'
//   - kind 'history' success    → status 'completed'
//   - kind 'history' error      → status 'failed'
//   - kind 'history' dismissed  → status 'dismissed' (sub-filter en completed)
//
// Sustituye:
//   - window.TasksSheet
//   - window.TaskDetailSheet
//
// Mantiene:
//   - window.IATasksIcon (lightning bolt botón del header)
//   - window.__mtxIATasks (store)
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.TasksSheetV2) return;

  // ──────────────────────────────────────────────────────────────────────────
  // Status registry — single source of truth para 5 estados + descartadas
  // ──────────────────────────────────────────────────────────────────────────
  // Cada estado tiene: id · label · color · icon · description (empty state)
  // El orden importa: define el orden visual de las tabs.
  var STATUSES = [
    { id: 'scheduled',        label: 'Programadas',  color: '#9b8aff', icon: '🕐', eyebrow: 'PROGRAMADA',     emptyDesc: 'Activá workflows con trigger cron para verlos acá.' },
    { id: 'pending_approval', label: 'Pendientes',   color: '#ffc850', icon: '⚠',  eyebrow: 'ESPERA TU OK',    emptyDesc: 'Cuando el coach quiera hacer algo que requiera tu OK, aparecerá acá.' },
    { id: 'in_progress',      label: 'En progreso',  color: '#3dffd1', icon: '⚡', eyebrow: 'EN PROGRESO',     emptyDesc: 'Cuando un workflow corra, lo verás acá en vivo con su progreso.' },
    { id: 'completed',        label: 'Completadas',  color: '#5dd3ff', icon: '✓',  eyebrow: 'COMPLETADA',      emptyDesc: 'Las ejecuciones exitosas aparecerán acá.' },
    { id: 'failed',           label: 'Fallidas',     color: '#ff8b8b', icon: '✗',  eyebrow: 'FALLÓ',           emptyDesc: 'Cuando algo se rompa, el coach lo dejará marcado acá con el error.' },
  ];
  function _statusFor(id) {
    for (var i = 0; i < STATUSES.length; i++) {
      if (STATUSES[i].id === id) return STATUSES[i];
    }
    return STATUSES[2];  // fallback in_progress
  }

  // Mapping kind/status del store legacy → status registry
  function _statusFromTask(task, kind) {
    if (kind === 'scheduled') return 'scheduled';
    if (kind === 'pending')   return 'pending_approval';
    if (kind === 'active')    return 'in_progress';
    if (kind === 'history') {
      if (task.status === 'success')   return 'completed';
      if (task.status === 'error')     return 'failed';
      if (task.status === 'dismissed') return 'dismissed';
    }
    return 'in_progress';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TaskCard — UNA tarjeta para los 5 estados
  // ──────────────────────────────────────────────────────────────────────────
  // Pattern visual heredado del Pending del legacy (el que Diego validó):
  //   eyebrow color + icon tile + título + descripción narrativa + meta-pill +
  //   acciones contextuales por estado.
  //
  // Acciones por estado:
  //   scheduled        → [Cancelar] [Ejecutar ahora]
  //   pending_approval → [Rechazar] [Aprobar]
  //   in_progress      → [Cancelar]  + progress bar
  //   completed        → [Volver a ejecutar]
  //   failed           → [Reintentar]
  //
  // Click en cualquier parte (excepto botones) → abre detail sheet.
  function TaskCard(props) {
    var task = props.task;
    var status = props.status;  // 'scheduled' | 'pending_approval' | etc.
    var onOpen = props.onOpen;
    var onApprove = props.onApprove;
    var onDismiss = props.onDismiss;
    var onCancel = props.onCancel;
    var onRunNow = props.onRunNow;
    var onRetry = props.onRetry;
    var onReplay = props.onReplay;

    var info = _statusFor(status);
    var accent = info.color;

    // Meta info por estado — el "qué muestra debajo del título"
    function _meta() {
      if (status === 'scheduled') {
        // formatRelative ya devuelve "En X" o "Mañana"/"Hoy" — no prepender
        var when = window.__mtxIATasks.formatRelative(task.scheduledAt);
        var trigger = task.triggerLabel || 'cron';
        return { primary: when, secondary: trigger };
      }
      if (status === 'pending_approval') {
        return {
          primary: task.action && task.action.when ? task.action.when : null,
          secondary: window.__mtxIATasks.formatRelative(task.requestedAt),
          preview: task.action && task.action.preview ? task.action.preview : null,
        };
      }
      if (status === 'in_progress') {
        var elapsed = window.__mtxIATasks.formatDuration(Date.now() - (task.startedAt || Date.now()));
        return {
          primary: task.currentStep || 'Ejecutando…',
          secondary: 'Hace ' + elapsed + ' · paso ' + (task.currentStepIndex || 1) + '/' + (task.totalSteps || 3),
          progress: task.progress || 0,
        };
      }
      if (status === 'completed') {
        return {
          primary: task.message || 'Completado',
          secondary: window.__mtxIATasks.formatRelative(task.ranAt) +
                     (task.durationMs && task.durationMs > 0
                       ? ' · ' + window.__mtxIATasks.formatDuration(task.durationMs)
                       : ''),
        };
      }
      if (status === 'failed') {
        return {
          primary: task.message || 'Error desconocido',
          secondary: window.__mtxIATasks.formatRelative(task.ranAt),
        };
      }
      if (status === 'dismissed') {
        return {
          primary: task.message || 'Descartada',
          secondary: window.__mtxIATasks.formatRelative(task.ranAt),
        };
      }
      return {};
    }
    var meta = _meta();

    // Acciones por estado
    function _renderActions() {
      var sharedBtnStyle = {
        appearance: 'none', cursor: 'pointer',
        padding: '6px 12px', borderRadius: 999,
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        color: 'var(--ink-3)',
        fontSize: 11, fontWeight: 600,
        fontFamily: 'var(--ff-sans)',
        letterSpacing: '-0.005em',
      };
      var primaryBtnStyle = function(c) {
        return {
          appearance: 'none', cursor: 'pointer',
          padding: '6px 14px', borderRadius: 999, border: 0,
          background: 'linear-gradient(135deg, ' + c + ', ' + c + 'BB)',
          color: '#0a1410',
          fontSize: 11, fontWeight: 700,
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
          boxShadow: '0 4px 10px -2px ' + c + '50',
        };
      };

      if (status === 'pending_approval' && onApprove && onDismiss) {
        return (
          <React.Fragment>
            <button onClick={function(e) { e.stopPropagation(); onDismiss(); }}
              aria-label="Rechazar" className="mtx-tap" style={sharedBtnStyle}>Rechazar</button>
            <button onClick={function(e) { e.stopPropagation(); onApprove(); }}
              aria-label="Aprobar" className="mtx-tap" style={primaryBtnStyle(accent)}>Aprobar</button>
          </React.Fragment>
        );
      }
      if (status === 'scheduled' && (onCancel || onRunNow)) {
        return (
          <React.Fragment>
            {onCancel && (<button onClick={function(e) { e.stopPropagation(); onCancel(); }}
              aria-label="Cancelar programación" className="mtx-tap" style={sharedBtnStyle}>Cancelar</button>)}
            {onRunNow && (<button onClick={function(e) { e.stopPropagation(); onRunNow(); }}
              aria-label="Ejecutar ahora" className="mtx-tap" style={primaryBtnStyle(accent)}>Ejecutar ya</button>)}
          </React.Fragment>
        );
      }
      if (status === 'in_progress' && onCancel) {
        return (
          <button onClick={function(e) { e.stopPropagation(); onCancel(); }}
            aria-label="Cancelar tarea en curso" className="mtx-tap" style={sharedBtnStyle}>Cancelar</button>
        );
      }
      if (status === 'completed' && onReplay) {
        return (
          <button onClick={function(e) { e.stopPropagation(); onReplay(); }}
            aria-label="Volver a ejecutar" className="mtx-tap" style={sharedBtnStyle}>↻ Re-ejecutar</button>
        );
      }
      if (status === 'failed' && onRetry) {
        return (
          <button onClick={function(e) { e.stopPropagation(); onRetry(); }}
            aria-label="Reintentar" className="mtx-tap" style={primaryBtnStyle(accent)}>↻ Reintentar</button>
        );
      }
      return null;
    }
    var actions = _renderActions();

    return (
      <div
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        onClick={onOpen}
        onKeyDown={onOpen ? function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : undefined}
        aria-label={onOpen ? info.eyebrow + ': ' + task.title : undefined}
        className={onOpen ? 'mtx-tap' : undefined}
        style={{
          padding: '14px 14px 12px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, ' + accent + '10, ' + accent + '03)',
          border: '0.5px solid ' + accent + '32',
          animation: 'mtx-fade-up .25s ease both',
          position: 'relative',
          overflow: 'hidden',
          cursor: onOpen ? 'pointer' : 'default',
        }}>

        {/* Shimmer bar arriba SOLO si in_progress — connota "vivo" */}
        {status === 'in_progress' && (
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, ' + accent + ', transparent)',
            backgroundSize: '200% 100%',
            animation: 'mtxTaskShimmer 1.4s linear infinite',
          }}/>
        )}

        {/* Header row: icon + title + (timestamp meta) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          {/* Icon tile */}
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, ' + accent + '28, ' + accent + '08)',
            border: '0.5px solid ' + accent + '40',
            color: accent,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19, lineHeight: 1,
            boxShadow: '0 0 14px ' + accent + '40, 0 0 0 1px ' + accent + '24',
          }}>
            <span role="img" aria-hidden="true">{task.icon || info.icon}</span>
          </div>

          {/* Title block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Eyebrow con dot pulsando para urgentes */}
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: accent,
              letterSpacing: '0.14em',
              marginBottom: 4,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              {(status === 'pending_approval' || status === 'in_progress') && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: accent,
                  boxShadow: '0 0 6px ' + accent + 'CC',
                  animation: 'mtxTaskDotPulse 1.4s ease-in-out infinite',
                }}/>
              )}
              {info.eyebrow}
            </div>
            <div style={{
              fontSize: 13.5, fontWeight: 700,
              color: 'var(--ink-1)',
              letterSpacing: '-0.012em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              lineHeight: 1.25,
              marginBottom: 4,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{task.title}</div>
            {/* Descripción narrativa (pending) o currentStep (active) o success/error msg */}
            {meta.primary && (
              <div style={{
                fontSize: 11.5, color: 'var(--ink-2)',
                lineHeight: 1.4,
                letterSpacing: '-0.005em',
                fontFamily: 'var(--ff-sans)',
              }}>{meta.primary}</div>
            )}
          </div>

          {/* Progress badge solo si in_progress */}
          {status === 'in_progress' && (
            <div style={{
              fontSize: 14, fontWeight: 800,
              color: accent,
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.018em',
              flexShrink: 0,
              marginTop: 2,
            }}>{Math.round(meta.progress || 0)}%</div>
          )}
        </div>

        {/* Preview pill (solo pending con preview) */}
        {meta.preview && (
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
          }}>"{meta.preview}"</div>
        )}

        {/* Progress bar solo si in_progress */}
        {status === 'in_progress' && (
          <div style={{
            height: 4, borderRadius: 999,
            background: 'rgba(0,0,0,0.30)',
            overflow: 'hidden',
            marginBottom: 8,
          }}>
            <div style={{
              width: (meta.progress || 0) + '%',
              height: '100%',
              background: accent,
              borderRadius: 999,
              transition: 'width .5s ease',
              boxShadow: '0 0 8px ' + accent + '60',
            }}/>
          </div>
        )}

        {/* Footer: secondary meta + acciones inline */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          paddingTop: actions ? 10 : 0,
          borderTop: actions ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
        }}>
          <div style={{
            fontSize: 10, color: 'var(--ink-4)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
          }}>{meta.secondary || ''}</div>
          <div style={{ flex: 1 }}/>
          {actions}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EmptyState reusable
  // ──────────────────────────────────────────────────────────────────────────
  function _EmptyState(props) {
    return (
      <div style={{
        padding: '40px 24px',
        textAlign: 'center',
        color: 'var(--ink-3)',
        animation: 'mtx-fade-up .25s ease both',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }} aria-hidden="true">{props.icon}</div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: 'var(--ink-2)',
          fontFamily: 'var(--ff-display, var(--ff-sans))',
          letterSpacing: '-0.01em',
          marginBottom: 6,
        }}>{props.title}</div>
        <div style={{
          fontSize: 11.5, color: 'var(--ink-3)',
          lineHeight: 1.5,
          letterSpacing: '-0.005em',
          fontFamily: 'var(--ff-sans)',
          maxWidth: 280, margin: '0 auto',
        }}>{props.desc}</div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TaskDetailSheet — Manus replay-style con 4 tabs internas
  // ──────────────────────────────────────────────────────────────────────────
  // Tabs: 📋 Detalles · 🧠 Proceso · 📎 Entregables · ⚙ Acciones
  //
  // Reusa generadores legacy:
  //   - window.__mtxTasksDetailHelpers.generateTimeline(task, kind)
  //   - window.__mtxTasksDetailHelpers.generateDeliverables(task)
  //
  // Si los helpers no existen (file viejo cargado primero), fallback simple.
  function TaskDetailSheet(props) {
    var task = props.task;
    var status = props.status;  // status registry id
    var onClose = props.onClose;
    var onApprove = props.onApprove;
    var onDismiss = props.onDismiss;
    var onCancel = props.onCancel;
    var onRunNow = props.onRunNow;
    var onRetry = props.onRetry;
    var onReplay = props.onReplay;

    var info = _statusFor(status);
    var accent = info.color;

    var tabState = React.useState('detalles');
    var tab = tabState[0]; var setTab = tabState[1];

    // ESC + body scroll lock (mismo pattern Fase 2)
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

    // Convertir status v2 → kind legacy para helpers
    var legacyKind = (status === 'scheduled')        ? 'scheduled'
                   : (status === 'pending_approval') ? 'pending'
                   : (status === 'in_progress')      ? 'active'
                   : 'history';

    // Timeline + deliverables: reusar helpers del archivo legacy
    var helpers = window.__mtxTasksDetailHelpers || {};
    var timeline = helpers.generateTimeline
      ? helpers.generateTimeline(task, legacyKind)
      : [{ ts: Date.now(), kind: 'system', text: 'Sin timeline disponible' }];
    var deliverables = helpers.generateDeliverables
      ? helpers.generateDeliverables(task)
      : [];

    var handleDownload = function(d) {
      toast.show({ message: '✦ ' + d.label + ' descargando…', duration: 1600 });
    };
    var handleViewLink = function(d) {
      toast.show({ message: 'Abriendo ' + (d.meta || d.label) + '…', duration: 1400 });
    };

    // Tabs definition
    var TABS = [
      { id: 'detalles',    icon: '📋', label: 'Detalles' },
      { id: 'proceso',     icon: '🧠', label: 'Proceso' },
      { id: 'entregables', icon: '📎', label: 'Entregables', count: deliverables.length },
      { id: 'acciones',    icon: '⚙',  label: 'Acciones' },
    ];

    var portalRoot = (typeof document !== 'undefined')
      ? document.getElementById('mtx-overlay-root')
      : null;
    if (!portalRoot) return null;

    var content = (
      <div onMouseDown={handleBackdropDown} onClick={handleBackdropClick} style={{
        position: 'absolute', inset: 0, zIndex: 220,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        animation: 'mtx-fade-up .25s ease',
      }}>
        <div onClick={function(e) { e.stopPropagation(); }}
          role="dialog" aria-modal="true" aria-label={'Detalle de tarea: ' + task.title}
          className="mtx-no-scrollbar"
          style={{
            background: 'rgba(15,19,19,0.96)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            borderTop: '0.5px solid rgba(255,255,255,0.10)',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
            maxHeight: '92%',
            display: 'flex', flexDirection: 'column',
            animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
          }}>
          {/* Grabber */}
          <div aria-hidden="true" style={{
            width: 36, height: 4, borderRadius: 999, margin: '12px auto 6px',
            background: 'rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}/>

          {/* Header sticky con icon + título + status + close */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 18px 12px',
            flexShrink: 0,
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 13, flexShrink: 0,
              background: 'linear-gradient(135deg, ' + accent + '30, ' + accent + '0A)',
              border: '0.5px solid ' + accent + '50',
              color: accent,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, lineHeight: 1,
              boxShadow: '0 0 18px ' + accent + '40',
            }} aria-hidden="true">{task.icon || info.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 15.5, fontWeight: 800,
                color: 'var(--ink-1)',
                letterSpacing: '-0.015em',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                lineHeight: 1.2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{task.title}</div>
              <div style={{
                fontSize: 10, color: accent,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '0.14em',
                fontWeight: 800,
                marginTop: 2,
              }}>{info.eyebrow}</div>
            </div>
            <button onClick={onClose} aria-label="Cerrar"
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                color: 'var(--ink-2)',
                fontSize: 14, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--ff-sans)',
                flexShrink: 0,
              }}>×</button>
          </div>

          {/* Tabs internas grandes con icono */}
          <div className="mtx-scroll-x" style={{
            display: 'flex', gap: 4,
            padding: '0 14px',
            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            {TABS.map(function(tb) {
              var isActive = tab === tb.id;
              return (
                <button key={tb.id}
                  onClick={function() { setTab(tb.id); }}
                  aria-pressed={isActive}
                  className="mtx-tap"
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 0,
                    borderBottom: '2px solid ' + (isActive ? accent : 'transparent'),
                    color: isActive ? 'var(--ink-1)' : 'var(--ink-3)',
                    fontSize: 12, fontWeight: isActive ? 700 : 600,
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    flexShrink: 0,
                    transition: 'color .2s, border-color .2s',
                  }}>
                  <span aria-hidden="true">{tb.icon}</span>
                  <span>{tb.label}</span>
                  {tb.count != null && tb.count > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: isActive ? accent : 'var(--ink-4)',
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: isActive ? accent + '20' : 'rgba(255,255,255,0.05)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>{tb.count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content (scrollable) */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 18px 24px',
            WebkitOverflowScrolling: 'touch',
          }}>
            {tab === 'detalles' && _DetailTabDetails(task, status, info)}
            {tab === 'proceso' && _DetailTabProceso(timeline, accent)}
            {tab === 'entregables' && _DetailTabEntregables(deliverables, accent, handleDownload, handleViewLink)}
            {tab === 'acciones' && _DetailTabAcciones(task, status, accent, {
              onApprove: onApprove, onDismiss: onDismiss,
              onCancel: onCancel, onRunNow: onRunNow,
              onRetry: onRetry, onReplay: onReplay,
            })}
          </div>
        </div>
      </div>
    );

    return ReactDOM.createPortal(content, portalRoot);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _DetailTabDetails — metadata estructurada
  // ──────────────────────────────────────────────────────────────────────────
  function _DetailTabDetails(task, status, info) {
    function Row(props) {
      return (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 0',
          borderBottom: props.last ? 'none' : '0.5px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            fontSize: 10, color: 'var(--ink-4)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 700,
            flexShrink: 0,
            minWidth: 86,
            paddingTop: 1,
          }}>{props.label}</div>
          <div style={{
            flex: 1, minWidth: 0,
            fontSize: 12.5, color: 'var(--ink-1)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            lineHeight: 1.45,
            wordBreak: 'break-word',
          }}>{props.value}</div>
        </div>
      );
    }

    var rows = [];
    rows.push({ label: 'Estado',   value: info.label });
    if (task.category) rows.push({ label: 'Categoría', value: task.category });
    if (task.workflowId) rows.push({ label: 'Workflow', value: task.workflowId });
    if (task.triggerLabel) rows.push({ label: 'Trigger', value: task.triggerLabel });

    if (status === 'scheduled' && task.scheduledAt) {
      rows.push({ label: 'Próxima', value: window.__mtxIATasks.formatTime(task.scheduledAt) + ' · ' + window.__mtxIATasks.formatRelative(task.scheduledAt) });
    }
    if (status === 'pending_approval' && task.requestedAt) {
      rows.push({ label: 'Pedida', value: window.__mtxIATasks.formatRelative(task.requestedAt) });
      if (task.description) rows.push({ label: 'Razón', value: task.description });
      if (task.action && task.action.preview) rows.push({ label: 'Preview', value: '"' + task.action.preview + '"' });
      if (task.action && task.action.when)    rows.push({ label: 'Cuándo', value: task.action.when });
    }
    if (status === 'in_progress') {
      if (task.startedAt) rows.push({ label: 'Iniciada', value: window.__mtxIATasks.formatRelative(task.startedAt) });
      if (task.currentStep) rows.push({ label: 'Paso actual', value: task.currentStep });
      if (task.totalSteps) rows.push({ label: 'Progreso', value: (task.currentStepIndex || 1) + ' / ' + task.totalSteps });
    }
    if (status === 'completed' || status === 'failed' || status === 'dismissed') {
      if (task.ranAt) rows.push({ label: 'Ejecutada', value: window.__mtxIATasks.formatRelative(task.ranAt) });
      if (task.durationMs && task.durationMs > 0) rows.push({ label: 'Duración', value: window.__mtxIATasks.formatDuration(task.durationMs) });
      if (task.message) rows.push({ label: 'Resultado', value: task.message });
    }

    return (
      <div>
        {rows.map(function(r, i) {
          return <Row key={i} label={r.label} value={r.value} last={i === rows.length - 1}/>;
        })}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _DetailTabProceso — log del agente con bubbles tipo Manus
  // ──────────────────────────────────────────────────────────────────────────
  function _DetailTabProceso(timeline, accent) {
    if (!timeline || timeline.length === 0) {
      return <_EmptyState icon="🧠" title="Sin proceso disponible" desc="El log del agente aparecerá acá cuando empiece la ejecución."/>;
    }
    // Style por kind del evento
    function _bubbleStyle(ev) {
      if (ev.kind === 'thinking') {
        return { bg: 'rgba(155,138,255,0.10)', border: 'rgba(155,138,255,0.28)', color: 'var(--ink-1)', label: '🤖 Agente', labelColor: '#9b8aff', italic: true };
      }
      if (ev.kind === 'tool') {
        return { bg: 'rgba(90,143,255,0.06)', border: 'rgba(90,143,255,0.20)', color: 'var(--ink-1)', label: '🔧 Tool call', labelColor: '#5a8fff', mono: true };
      }
      if (ev.kind === 'result') {
        return { bg: 'rgba(61,255,209,0.06)', border: 'rgba(61,255,209,0.20)', color: 'var(--ink-1)', label: '↳ Resultado', labelColor: '#3dffd1' };
      }
      if (ev.kind === 'output') {
        return { bg: 'rgba(255,200,80,0.06)', border: 'rgba(255,200,80,0.20)', color: 'var(--ink-1)', label: '📤 Output', labelColor: '#ffc850' };
      }
      if (ev.kind === 'error') {
        return { bg: 'rgba(255,139,139,0.08)', border: 'rgba(255,139,139,0.30)', color: 'var(--ink-1)', label: '⚠ Error', labelColor: '#ff8b8b' };
      }
      if (ev.kind === 'success') {
        return { bg: 'rgba(61,255,209,0.10)', border: 'rgba(61,255,209,0.32)', color: 'var(--ink-1)', label: '✓ Completado', labelColor: '#3dffd1' };
      }
      // 'system'
      return { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', color: 'var(--ink-3)', label: '·', labelColor: 'var(--ink-4)' };
    }

    function _formatTs(ts) {
      var d = new Date(ts);
      var hh = String(d.getHours()).padStart(2, '0');
      var mm = String(d.getMinutes()).padStart(2, '0');
      var ss = String(d.getSeconds()).padStart(2, '0');
      return hh + ':' + mm + ':' + ss;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {timeline.map(function(ev, i) {
          var s = _bubbleStyle(ev);
          return (
            <div key={i} style={{
              padding: '10px 12px',
              borderRadius: 12,
              background: s.bg,
              border: '0.5px solid ' + s.border,
              animation: 'mtx-fade-up .25s ease both',
              animationDelay: (i * 0.04) + 's',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 5,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  color: s.labelColor,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '0.04em',
                }}>{s.label}</span>
                <span style={{ flex: 1 }}/>
                <span style={{
                  fontSize: 10, color: 'var(--ink-4)',
                  fontFamily: 'var(--ff-mono, monospace)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.02em',
                }}>{_formatTs(ev.ts)}</span>
              </div>
              <div style={{
                fontSize: 12.5, color: s.color,
                fontFamily: s.mono ? 'var(--ff-mono, monospace)' : 'var(--ff-sans)',
                fontStyle: s.italic ? 'italic' : 'normal',
                letterSpacing: '-0.005em',
                lineHeight: 1.5,
                wordBreak: 'break-word',
              }}>{ev.text}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _DetailTabEntregables — cards con preview + descargar/ver
  // ──────────────────────────────────────────────────────────────────────────
  function _DetailTabEntregables(deliverables, accent, onDownload, onView) {
    if (!deliverables || deliverables.length === 0) {
      return <_EmptyState icon="📎" title="Sin entregables" desc="Cuando esta tarea termine, los archivos y links que el coach produjo aparecerán acá."/>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {deliverables.map(function(d, i) {
          var isLink = d.kind === 'link';
          return (
            <div key={i} style={{
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', gap: 12,
              animation: 'mtx-fade-up .25s ease both',
              animationDelay: (i * 0.05) + 's',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, ' + accent + '20, ' + accent + '06)',
                border: '0.5px solid ' + accent + '30',
                color: accent,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, lineHeight: 1,
              }} aria-hidden="true">{d.icon || (isLink ? '🔗' : '📄')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: 'var(--ink-1)',
                  fontFamily: 'var(--ff-display, var(--ff-sans))',
                  letterSpacing: '-0.005em',
                  lineHeight: 1.25,
                  marginBottom: 2,
                }}>{d.label}</div>
                {d.meta && (
                  <div style={{
                    fontSize: 11, color: 'var(--ink-3)',
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                  }}>{d.meta}</div>
                )}
              </div>
              <button onClick={isLink ? function() { onView(d); } : function() { onDownload(d); }}
                aria-label={isLink ? 'Ver ' + d.label : 'Descargar ' + d.label}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '6px 12px', borderRadius: 999,
                  background: 'linear-gradient(135deg, ' + accent + ', ' + accent + 'BB)',
                  color: '#0a1410',
                  border: 0,
                  fontSize: 11, fontWeight: 700,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  boxShadow: '0 4px 10px -2px ' + accent + '50',
                  flexShrink: 0,
                }}>{isLink ? 'Ver' : 'Descargar'}</button>
            </div>
          );
        })}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _DetailTabAcciones — CTAs contextuales por estado
  // ──────────────────────────────────────────────────────────────────────────
  function _DetailTabAcciones(task, status, accent, handlers) {
    function _Btn(props) {
      var bg = props.primary
        ? 'linear-gradient(135deg, ' + (props.color || accent) + ', ' + (props.color || accent) + 'BB)'
        : 'rgba(255,255,255,0.04)';
      var color = props.primary ? '#0a1410' : 'var(--ink-1)';
      var border = props.primary ? 0 : '0.5px solid rgba(255,255,255,0.10)';
      var danger = props.danger;
      if (danger) { bg = 'rgba(255,139,139,0.08)'; color = '#ff8b8b'; border = '0.5px solid rgba(255,139,139,0.30)'; }
      return (
        <button onClick={props.onClick}
          aria-label={props.label}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            width: '100%',
            padding: '12px 16px', borderRadius: 14,
            background: bg, color: color, border: border,
            fontSize: 13, fontWeight: 700,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            boxShadow: props.primary ? '0 6px 16px -4px ' + (props.color || accent) + '50' : 'none',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {props.icon && <span aria-hidden="true">{props.icon}</span>}
          <span>{props.label}</span>
        </button>
      );
    }

    var buttons = [];
    if (status === 'pending_approval') {
      if (handlers.onApprove) buttons.push({ label: 'Aprobar y ejecutar', icon: '✓', primary: true, onClick: handlers.onApprove });
      if (handlers.onDismiss) buttons.push({ label: 'Rechazar', icon: '✕', danger: true, onClick: handlers.onDismiss });
    }
    if (status === 'scheduled') {
      if (handlers.onRunNow) buttons.push({ label: 'Ejecutar ahora', icon: '▶', primary: true, onClick: handlers.onRunNow });
      if (handlers.onCancel) buttons.push({ label: 'Cancelar programación', icon: '✕', danger: true, onClick: handlers.onCancel });
    }
    if (status === 'in_progress') {
      if (handlers.onCancel) buttons.push({ label: 'Cancelar ejecución', icon: '■', danger: true, onClick: handlers.onCancel });
    }
    if (status === 'completed') {
      if (handlers.onReplay) buttons.push({ label: 'Volver a ejecutar', icon: '↻', primary: true, onClick: handlers.onReplay });
    }
    if (status === 'failed') {
      if (handlers.onRetry) buttons.push({ label: 'Reintentar', icon: '↻', primary: true, color: '#ff8b8b', onClick: handlers.onRetry });
      if (handlers.onReplay) buttons.push({ label: 'Volver a ejecutar', icon: '▶', onClick: handlers.onReplay });
    }

    if (buttons.length === 0) {
      return <_EmptyState icon="✓" title="Sin acciones disponibles" desc="Esta tarea ya completó su ciclo."/>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {buttons.map(function(b, i) {
          return <_Btn key={i} {...b}/>;
        })}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TasksSheet (V2) — sheet principal con 5 tabs
  // ──────────────────────────────────────────────────────────────────────────
  function TasksSheetV2(props) {
    var onClose = props.onClose;

    // Suscribirse a __mtxIATasks
    window.useIATasks ? window.useIATasks() : null;  // sync hook si existe
    var forceTick = React.useReducer(function(x) { return x + 1; }, 0)[1];
    React.useEffect(function() {
      var handler = function() { forceTick(); };
      window.addEventListener('mtx:ia-tasks-changed', handler);
      return function() { window.removeEventListener('mtx:ia-tasks-changed', handler); };
    }, []);

    var activeTabState = React.useState('pending_approval');  // default a lo más urgente
    var activeTab = activeTabState[0]; var setActiveTab = activeTabState[1];

    var detailState = React.useState(null);  // { task, status }
    var detail = detailState[0]; var setDetail = detailState[1];

    var completedFilterState = React.useState('all');  // 'all' | 'success' | 'dismissed'
    var completedFilter = completedFilterState[0]; var setCompletedFilter = completedFilterState[1];

    if (!window.__mtxIATasks) return null;

    var stats = window.__mtxIATasks.getStats();
    var allActive = window.__mtxIATasks.getActive();
    var allScheduled = window.__mtxIATasks.getScheduled();
    var allPending = window.__mtxIATasks.getPending();
    var allHistory = window.__mtxIATasks.getHistory();
    var allCompleted = allHistory.filter(function(t) { return t.status === 'success'; });
    var allFailed = allHistory.filter(function(t) { return t.status === 'error'; });
    var allDismissed = allHistory.filter(function(t) { return t.status === 'dismissed'; });

    // Counts por tab
    var counts = {
      scheduled:        allScheduled.length,
      pending_approval: allPending.length,
      in_progress:      allActive.length,
      completed:        allCompleted.length + (completedFilter === 'all' ? allDismissed.length : 0),
      failed:           allFailed.length,
    };

    // Auto-select tab al mount: si default está vacío, ir al primero con datos
    React.useEffect(function() {
      if (counts[activeTab] === 0) {
        var nonEmpty = STATUSES.find(function(s) {
          return counts[s.id] > 0 && s.id !== 'dismissed';
        });
        if (nonEmpty) setActiveTab(nonEmpty.id);
      }
    }, []);  // solo mount

    var _useToast = window.useToast || function() { return { show: function() {} }; };
    var toast = _useToast();

    // ESC + body lock
    var onCloseRef = React.useRef(onClose);
    React.useEffect(function() { onCloseRef.current = onClose; });
    React.useEffect(function() {
      var onKey = function(e) {
        if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
        var t = e.target; var tag = (t && t.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
        if (detail) { setDetail(null); return; }
        onCloseRef.current();
      };
      window.addEventListener('keydown', onKey);
      return function() { window.removeEventListener('keydown', onKey); };
    }, [detail]);
    React.useEffect(function() {
      var prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return function() { document.body.style.overflow = prev; };
    }, []);

    // Tick para active tasks
    var activeKey = allActive.map(function(a) { return a.id; }).join('|');
    React.useEffect(function() {
      if (allActive.length === 0) return;
      var iv = setInterval(function() { window.__mtxIATasks.tickActive(); }, 900);
      return function() { clearInterval(iv); };
    }, [activeKey]);

    // Handlers
    var handleApprove = function(t) {
      window.__mtxIATasks.approvePending(t.id);
      toast.show({ message: '✦ "' + t.title + '" en ejecución', duration: 1800 });
      setActiveTab('in_progress');
      setDetail(null);
    };
    var handleDismiss = function(t) {
      window.__mtxIATasks.dismissPending(t.id);
      toast.show({ message: 'Descartado', duration: 1400 });
      setDetail(null);
    };
    var handleRetry = function(t) {
      window.__mtxIATasks.retryHistory(t.id);
      toast.show({ message: '✦ Reintentando "' + t.title + '"', duration: 1800 });
      setActiveTab('in_progress');
      setDetail(null);
    };
    var handleReplay = function(t) {
      window.__mtxIATasks.replayHistory(t.id);
      toast.show({ message: '✦ Re-ejecutando "' + t.title + '"', duration: 1800 });
      setActiveTab('in_progress');
      setDetail(null);
    };
    var handleCancelActive = function(t) {
      window.__mtxIATasks.cancelActive(t.id);
      toast.show({ message: '"' + t.title + '" cancelada', duration: 1600 });
      setDetail(null);
    };
    var handleCancelScheduled = function(t) {
      window.__mtxIATasks.cancelScheduled(t.id);
      toast.show({ message: 'Programación cancelada', duration: 1800 });
      setDetail(null);
    };
    var handleRunNow = function(t) {
      window.__mtxIATasks.runScheduledNow(t.id);
      toast.show({ message: '✦ "' + t.title + '" iniciada', duration: 1800 });
      setActiveTab('in_progress');
      setDetail(null);
    };

    var openDetail = function(task, status) {
      setDetail({ task: task, status: status });
    };

    // Listas por tab
    var visibleTasks = (function() {
      if (activeTab === 'scheduled') return allScheduled.map(function(t) { return { task: t, status: 'scheduled' }; });
      if (activeTab === 'pending_approval') return allPending.map(function(t) { return { task: t, status: 'pending_approval' }; });
      if (activeTab === 'in_progress') return allActive.map(function(t) { return { task: t, status: 'in_progress' }; });
      if (activeTab === 'completed') {
        var pool = completedFilter === 'all' ? allCompleted.concat(allDismissed)
                 : completedFilter === 'success' ? allCompleted
                 : allDismissed;
        // Sort por ranAt DESC
        pool = pool.slice().sort(function(a, b) { return (b.ranAt || 0) - (a.ranAt || 0); });
        return pool.map(function(t) { return { task: t, status: t.status === 'dismissed' ? 'dismissed' : 'completed' }; });
      }
      if (activeTab === 'failed') return allFailed.map(function(t) { return { task: t, status: 'failed' }; });
      return [];
    })();

    var activeInfo = _statusFor(activeTab);

    var portalRoot = (typeof document !== 'undefined')
      ? document.getElementById('mtx-overlay-root')
      : null;
    if (!portalRoot) return null;

    var content = (
      <React.Fragment>
        {/* Sheet principal full-screen */}
        <div role="dialog" aria-modal="true" aria-label="Actividad del coach"
          className="mtx-no-scrollbar"
          style={{
            position: 'absolute', inset: 0, zIndex: 200,
            background: 'rgba(8,8,21,0.96)',
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            display: 'flex', flexDirection: 'column',
            animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
          }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '54px 20px 16px',
            flexShrink: 0,
          }}>
            <button onClick={onClose} aria-label="Volver" className="mtx-tap" style={{
              appearance: 'none', cursor: 'pointer',
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.10)',
              color: 'var(--ink-1)',
              fontSize: 14, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--ff-sans)',
              flexShrink: 0,
              marginTop: 2,
            }}>
              <span aria-hidden="true">←</span>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mtx-eyebrow" style={{
                fontSize: 10, color: 'var(--ink-3)',
                letterSpacing: '0.16em', marginBottom: 4,
              }}>COACH MENTEX</div>
              <div style={{
                fontSize: 26, fontWeight: 800,
                color: 'var(--ink-1)',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                letterSpacing: '-0.022em',
                lineHeight: 1.1,
                marginBottom: 6,
              }}>Actividad</div>
              <div style={{
                fontSize: 12, color: 'var(--ink-3)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                lineHeight: 1.45,
              }}>Lo que tu coach está haciendo, programó, o espera tu OK.</div>
            </div>
          </div>

          {/* Tabs scroll-x */}
          <div className="mtx-scroll-x" style={{
            display: 'flex', gap: 6,
            padding: '4px 18px 14px',
            flexShrink: 0,
          }}>
            {STATUSES.filter(function(s) { return s.id !== 'dismissed'; }).map(function(s) {
              var isActive = activeTab === s.id;
              var c = counts[s.id] || 0;
              return (
                <button key={s.id}
                  onClick={function() { setActiveTab(s.id); }}
                  aria-pressed={isActive}
                  className="mtx-tap"
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: '7px 13px', borderRadius: 999,
                    background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: '0.5px solid ' + (isActive ? s.color + '50' : 'rgba(255,255,255,0.08)'),
                    color: isActive ? s.color : 'var(--ink-3)',
                    fontSize: 11.5, fontWeight: 700,
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                    flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    transition: 'background .2s, border-color .2s, color .2s',
                  }}>
                  <span>{s.label}</span>
                  {c > 0 && (
                    <span style={{
                      fontSize: 9.5, fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: isActive ? s.color + '20' : 'rgba(255,255,255,0.06)',
                      color: isActive ? s.color : 'var(--ink-3)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>{c}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-filter pills (solo en Completadas) */}
          {activeTab === 'completed' && (allCompleted.length > 0 || allDismissed.length > 0) && (
            <div className="mtx-scroll-x" style={{
              display: 'flex', gap: 6,
              padding: '0 20px 12px',
              flexShrink: 0,
            }}>
              {[
                { id: 'all', label: 'Todas', count: allCompleted.length + allDismissed.length },
                { id: 'success', label: 'Exitosas', count: allCompleted.length },
                { id: 'dismissed', label: 'Descartadas', count: allDismissed.length },
              ].map(function(f) {
                var isOn = completedFilter === f.id;
                return (
                  <button key={f.id}
                    onClick={function() { setCompletedFilter(f.id); }}
                    aria-pressed={isOn}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer',
                      padding: '4px 10px', borderRadius: 999,
                      background: isOn ? 'rgba(93,211,255,0.10)' : 'transparent',
                      border: '0.5px solid ' + (isOn ? 'rgba(93,211,255,0.30)' : 'rgba(255,255,255,0.06)'),
                      color: isOn ? '#5dd3ff' : 'var(--ink-4)',
                      fontSize: 10.5, fontWeight: 600,
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                      flexShrink: 0,
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                    <span>{f.label}</span>
                    <span style={{ opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>{f.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Lista scrollable */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 18px 28px',
            WebkitOverflowScrolling: 'touch',
          }}>
            {visibleTasks.length === 0
              ? (<_EmptyState icon={activeInfo.icon} title={'Sin ' + activeInfo.label.toLowerCase()} desc={activeInfo.emptyDesc}/>)
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {visibleTasks.map(function(item) {
                    return (
                      <TaskCard key={item.task.id}
                        task={item.task}
                        status={item.status}
                        onOpen={function() { openDetail(item.task, item.status); }}
                        onApprove={item.status === 'pending_approval' ? function() { handleApprove(item.task); } : null}
                        onDismiss={item.status === 'pending_approval' ? function() { handleDismiss(item.task); } : null}
                        onCancel={item.status === 'scheduled' ? function() { handleCancelScheduled(item.task); }
                                : item.status === 'in_progress' ? function() { handleCancelActive(item.task); }
                                : null}
                        onRunNow={item.status === 'scheduled' ? function() { handleRunNow(item.task); } : null}
                        onRetry={item.status === 'failed' ? function() { handleRetry(item.task); } : null}
                        onReplay={(item.status === 'completed' || item.status === 'failed') ? function() { handleReplay(item.task); } : null}
                      />
                    );
                  })}
                </div>
              )}
          </div>
        </div>

        {/* Detail sheet sobre el principal */}
        {detail && (
          <TaskDetailSheet
            task={detail.task}
            status={detail.status}
            onClose={function() { setDetail(null); }}
            onApprove={detail.status === 'pending_approval' ? function() { handleApprove(detail.task); } : null}
            onDismiss={detail.status === 'pending_approval' ? function() { handleDismiss(detail.task); } : null}
            onCancel={detail.status === 'scheduled' ? function() { handleCancelScheduled(detail.task); }
                    : detail.status === 'in_progress' ? function() { handleCancelActive(detail.task); }
                    : null}
            onRunNow={detail.status === 'scheduled' ? function() { handleRunNow(detail.task); } : null}
            onRetry={detail.status === 'failed' ? function() { handleRetry(detail.task); } : null}
            onReplay={(detail.status === 'completed' || detail.status === 'failed') ? function() { handleReplay(detail.task); } : null}
          />
        )}
      </React.Fragment>
    );

    return ReactDOM.createPortal(content, portalRoot);
  }

  // Export
  window.TasksSheetV2 = TasksSheetV2;
  window.TaskCardV2 = TaskCard;
  window.TaskDetailSheetV2 = TaskDetailSheet;

  // Re-route TasksSheet (lo que consume ia-flow.jsx) a V2.
  // El legacy queda como TasksSheetLegacy para fallback.
  // Assignment directo — más simple que getter dinámico que fallaba por
  // configurable:false en window properties.
  try {
    window.TasksSheet = TasksSheetV2;
  } catch (e) { /* no-op */ }
})();
