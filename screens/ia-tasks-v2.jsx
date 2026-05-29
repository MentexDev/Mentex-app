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
  // Body lock refcount global — Audit CRIT-2 fix
  // ──────────────────────────────────────────────────────────────────────────
  // Múltiples sheets nested (TasksSheetV2 + TaskDetailSheet) ambos hacen
  // document.body.style.overflow='hidden'. Si ambos capturan prev='' al mount
  // y se desmontan en orden no-LIFO (ej. cierre programático del padre que
  // arrastra al hijo), el cleanup pisa el orden y body queda con 'hidden'
  // permanente — page-scroll bloqueado hasta refresh.
  //
  // Solución: refcount global. El primer lock guarda el prev, el último unlock
  // restaura. Operaciones en medio son idempotentes (no-op visual).
  if (!window.__mtxBodyLock) {
    window.__mtxBodyLock = {
      _count: 0,
      _prev: null,
      lock: function() {
        if (this._count === 0) {
          try { this._prev = document.body.style.overflow; }
          catch (e) { this._prev = ''; }
          try { document.body.style.overflow = 'hidden'; } catch (e) { /* no-op */ }
        }
        this._count++;
      },
      unlock: function() {
        if (this._count <= 0) return;
        this._count--;
        if (this._count === 0) {
          try { document.body.style.overflow = this._prev || ''; }
          catch (e) { /* no-op */ }
          this._prev = null;
        }
      },
    };
  }

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

    // Audit CRIT-9 fix: NO registrar listener ESC propio. El padre TasksSheetV2
    // ya intercepta ESC con guard `if (detail) { setDetail(null); return; }`
    // que cierra solo el detail cuando está abierto. Dos listeners corriendo
    // en window sobre la misma tecla = side effects duplicados si onClose hace
    // algo más que setState (futura analytics, etc.). El parent handler es el
    // SUFICIENTE y ÚNICO source of truth para ESC en este sheet.
    //
    // onCloseRef se conserva porque otros handlers (backdrop click) lo usan.
    var onCloseRef = React.useRef(onClose);
    React.useEffect(function() { onCloseRef.current = onClose; });
    // Audit CRIT-2: usar refcount global en vez de capturar+restaurar prev.
    // Garantiza que body queda unlocked solo cuando todos los sheets cierran.
    React.useEffect(function() {
      window.__mtxBodyLock.lock();
      return function() { window.__mtxBodyLock.unlock(); };
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

    // Tabs definition — Sprint A.12.1: 3 tabs (Acciones removida porque las
    // CTAs ya viven en la card por fuera + las cápsulas son redundantes).
    // Distribución a ancho equitativo (1fr cada una).
    var TABS = [
      { id: 'detalles',    icon: '📋', label: 'Detalles' },
      { id: 'proceso',     icon: '🧠', label: 'Proceso' },
      { id: 'entregables', icon: '📎', label: 'Entregables', count: deliverables.length },
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
            // A.15.2: bg gradient alineado al patrón VideoOptionsSheet/
            // ChatOptionsSheet (consistencia visual cross-app). Era color
            // plano rgba(15,19,19,0.96) que se sentía "ajeno" al app.
            background: 'linear-gradient(180deg, rgba(20,24,22,0.97), rgba(15,19,18,0.99))',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            borderTop: '0.5px solid rgba(255,255,255,0.10)',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
            // A.12.1: altura FIJA en 85vh — no cambia entre tabs.
            // Antes era maxHeight 92% (shrink-to-fit content), causaba que
            // el modal saltara de alto al cambiar de tab. UX incómoda.
            height: '85vh',
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

          {/* Tabs internas grandes con icono — A.12.1: grid 1fr equitativo.
              3 tabs ocupan ancho completo, sin scroll horizontal. */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(' + TABS.length + ', 1fr)',
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
                    padding: '11px 8px',
                    background: 'transparent',
                    border: 0,
                    borderBottom: '2px solid ' + (isActive ? accent : 'transparent'),
                    color: isActive ? 'var(--ink-1)' : 'var(--ink-3)',
                    fontSize: 12, fontWeight: isActive ? 700 : 600,
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
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
            {/* A.12.1 fix: rendear como COMPONENTES, no como llamadas inline a
                funciones. Esto hace que React monte/desmonte el subtree por
                completo al cambiar tab — sus hooks internos quedan aislados
                y no rompen Rules of Hooks del padre (blind-spot #9). */}
            {tab === 'detalles'    && <_DetailTabDetails    task={task} status={status} info={info}/>}
            {tab === 'proceso'     && <_DetailTabProceso    timeline={timeline} accent={accent}/>}
            {tab === 'entregables' && <_DetailTabEntregables deliverables={deliverables} accent={accent} onDownload={handleDownload} onView={handleViewLink}/>}
          </div>
        </div>
      </div>
    );

    return ReactDOM.createPortal(content, portalRoot);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _briefForTask — genera narrativa del plan según workflow + estado
  // ──────────────────────────────────────────────────────────────────────────
  // Sprint A.12.1: el tab Detalles termina con un "Brief" que explica QUÉ va
  // a hacer (o hizo) el coach, en lenguaje humano. Tipo PR description corto.
  // Cuando llegue backend, esto vendrá del agente real (task.plan / task.brief).
  function _briefForTask(task, status) {
    var wf = task.workflowId || '';
    // Audit IMP-7 fix: "Hizo" para failed es engañoso (intentó, no hizo).
    // Diferencia explícita entre completed (cumplido) y failed (intentó).
    var verb = (status === 'scheduled')          ? 'Va a'
             : (status === 'pending_approval')   ? 'Propone'
             : (status === 'in_progress')        ? 'Está'
             : (status === 'failed')             ? 'Intentó'
             : 'Hizo';  // completed/dismissed

    // Heurística por workflow — cubre los workflows mock del legacy.
    // Si no matchea, fallback genérico desde task.description si existe.
    if (wf.indexOf('daily-briefing') >= 0) {
      return {
        title: 'Plan del briefing',
        body: verb + ' un resumen matinal cruzando 3 fuentes: tu calendario del día (eventos confirmados + huecos), tus 3 prioridades de la semana desde memoria, y tu energía base. Genera un texto motivacional corto + 3 acciones concretas + sugerencia de bloques para concentración profunda.',
      };
    }
    if (wf.indexOf('hydration') >= 0) {
      return {
        title: 'Plan del recordatorio',
        body: verb + ' una notificación push contextual cada 90 min entre las 9 y las 18h. El mensaje varía según hora del día y se silencia si detecta que estás en una sesión activa de focus.',
      };
    }
    if (wf.indexOf('evening-ritual') >= 0 || wf.indexOf('wind-down') >= 0) {
      return {
        title: 'Plan de cierre',
        body: verb + ' lectura del nivel de stress del día desde tu wearable, comparación con tu baseline de la semana, y selección de una meditación de sueño adaptada al nivel (4 min si stress bajo, 8 min si alto).',
      };
    }
    if (wf.indexOf('instagram') >= 0) {
      return {
        title: 'Plan del post',
        body: verb + ' la reflexión más resonante de tu semana desde el journal, adapta el tono a Instagram (visual + caption corta + 3 hashtags personales), genera la imagen con tu paleta de marca y agenda el post.',
      };
    }
    if (wf.indexOf('session-journal') >= 0) {
      return {
        title: 'Plan del journal',
        body: verb + ' lectura de tu última sesión completada y genera 3 preguntas reflexivas específicas a lo que trabajaste. La nota queda guardada en tu carpeta Journal con tag de la categoría que estuviste trabajando.',
      };
    }
    if (wf.indexOf('weekly-review') >= 0) {
      return {
        title: 'Plan del review',
        body: verb + ' analítica completa de tu semana: sesiones, foco real vs planeado, sentimiento del journal, progreso vs tus goals trimestrales. Crea una página en Notion con el resumen + recomendaciones para la próxima semana.',
      };
    }
    // Pending de tipo post-social o calendar-block
    if (task.type === 'post-social') {
      return {
        title: 'Plan del thread',
        body: verb + ' un thread de X (Twitter) en 4 tweets basado en tu reflexión semanal más resonante. Ningún caption usa lenguaje genérico — todo viene de tu voz capturada en memoria.',
      };
    }
    if (task.type === 'calendar-block') {
      return {
        title: 'Plan del bloque',
        body: verb + ' crear un bloque de tiempo protegido en tu calendario en ' + (task.action && task.action.when ? task.action.when : 'un hueco que detectó libre') + '. Marca el bloque como busy + adjunta tu top-3 de prioridades.',
      };
    }
    // Fallback: usar la description si existe
    if (task.description) {
      return {
        title: 'Plan',
        body: task.description,
      };
    }
    // Audit GAP-4 fix: fallback final cuando no hay workflow conocido ni
    // description. Antes retornaba null y el tab Detalles terminaba abrupto
    // sin separador visual. Ahora muestra placeholder mínimo coherente.
    return {
      title: 'Plan',
      body: 'Esta tarea no tiene un brief narrativo disponible. El coach puede no haber documentado el plan, o el workflow es interno del sistema.',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _DetailTabDetails — metadata estructurada + Brief al final
  // A.12.1: componente React (no llamada inline) para aislar Rules of Hooks.
  // ──────────────────────────────────────────────────────────────────────────
  function _DetailTabDetails(props) {
    var task = props.task; var status = props.status; var info = props.info;
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

    var brief = _briefForTask(task, status);

    return (
      <div>
        {rows.map(function(r, i) {
          return <Row key={i} label={r.label} value={r.value} last={i === rows.length - 1 && !brief}/>;
        })}

        {/* Brief — A.12.1: narrativa del plan al final */}
        {brief && (
          <div style={{
            marginTop: 18,
            padding: '14px 14px 14px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(155,138,255,0.06), rgba(155,138,255,0.01))',
            border: '0.5px solid rgba(155,138,255,0.16)',
          }}>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, fontWeight: 800,
              color: '#9b8aff',
              letterSpacing: '0.18em',
              marginBottom: 8,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span aria-hidden="true">📝</span>
              <span>BRIEF · {brief.title.toUpperCase()}</span>
            </div>
            <div style={{
              fontSize: 12.5, color: 'var(--ink-1)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              lineHeight: 1.6,
            }}>{brief.body}</div>
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _DetailTabProceso — log del agente con bubbles tipo Manus
  // A.12.1: componente React (no llamada inline) para aislar Rules of Hooks.
  // ──────────────────────────────────────────────────────────────────────────
  function _DetailTabProceso(props) {
    var timeline = props.timeline; var accent = props.accent;
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
  // _previewForDeliverable — genera mock content para preview inline
  // ──────────────────────────────────────────────────────────────────────────
  // Sprint A.12.1: cuando user expande un entregable tipo doc/image, se
  // muestra preview adentro de la card. Backend reemplaza esto con el
  // contenido real (markdown del file / imagen URL / metadata link).
  function _previewForDeliverable(d) {
    var label = (d.label || '').toLowerCase();
    if (label.indexOf('resumen del día') >= 0) {
      return {
        type: 'markdown',
        body: '# Resumen del día — viernes 28 mayo\n\nBuen día. Hoy tenés **14 eventos** en tu calendario y **2 huecos** para deep work (9-11 y 14-16).\n\n## Tus 3 prioridades\n1. Cerrar el deck de inversión (en riesgo)\n2. Llamada con Brandon · 11:30\n3. Review del Sprint A.11 con Claude\n\n## Sugerencia\nEl hueco 9-11 es ideal para el deck. Lo agendé como bloque protegido. Ningún tipo de notificación te molestará en ese rango.',
      };
    }
    if (label.indexOf('reflexión') >= 0 || label.indexOf('reflexion') >= 0) {
      return {
        type: 'markdown',
        body: '# Reflexión · 11 mayo\n\nTrabajaste **enfoque profundo** por 2h 15min. Bien.\n\n## Preguntas\n1. ¿Qué descubriste de ti hoy mientras trabajabas concentrado?\n2. ¿Qué tipo de pensamientos aparecieron cuando perdiste el foco?\n3. Si tuvieras que repetir esta sesión, ¿qué cambiarías?\n\n*— Tu coach*',
      };
    }
    if (label.indexOf('weekly review') >= 0 || label.indexOf('semana') >= 0) {
      return {
        type: 'markdown',
        body: '# Sem 19 · Weekly Review\n\n## Datos\n- Sesiones completadas: **12 / 14 planeadas**\n- Tiempo en foco: **9h 40min**\n- Sentimiento promedio: **7.2/10**\n\n## Insight\nTu energía cayó martes-jueves. Coincide con eventos sociales nocturnos. Recomiendo mover el deep work al AM esos días.',
      };
    }
    if (label.indexOf('caption') >= 0) {
      return {
        type: 'text',
        body: 'La paz no se encuentra cuando todo está calmo afuera.\n\nLa paz aparece cuando vos elegís dejar de pelearle a lo que está pasando.\n\n#enfoque #presencia #mentex',
      };
    }
    if (label.indexOf('thread') >= 0) {
      return {
        type: 'text',
        body: '1/ Si solo pudiera dejarte una idea esta semana: tu agenda matutina es tu carta de identidad.\n\n2/ No es lo que decís que querés ser. Es lo que hacés en la primera hora del día.\n\n3/ Cambiá esa hora y cambiás 30 años de vida en 30 días.\n\n4/ La constancia siempre le gana al talento. Siempre.',
      };
    }
    if (label.indexOf('post-imagen') >= 0 || label.indexOf('imagen') >= 0) {
      // Mock SVG inline para imágenes.
      // Audit CRIT-6: SVG en formato NATURAL (con # crudo, no %23 pre-encoded).
      // El render hace encodeURIComponent que se encarga de # → %23, quotes,
      // y cualquier carácter problemático en Safari/WebKit.
      return {
        type: 'image-svg',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9b8aff"/><stop offset="1" stop-color="#3dffd1"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><circle cx="200" cy="200" r="120" fill="rgba(255,255,255,0.15)"/><text x="200" y="210" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="white">enfoque</text></svg>',
      };
    }
    if (label.indexOf('3 bloques') >= 0 || label.indexOf('bloques agendados') >= 0) {
      return {
        type: 'calendar-events',
        events: [
          { time: '09:00-11:00', title: 'Deep work · deck inversión', color: '#9b8aff' },
          { time: '14:00-16:00', title: 'Deep work · sprint A.13',    color: '#9b8aff' },
          { time: '18:30-19:00', title: 'Wind down · meditación',     color: '#3dffd1' },
        ],
      };
    }
    if (label.indexOf('evento calendar') >= 0) {
      return {
        type: 'calendar-events',
        events: [
          { time: d.meta || 'Mañana 9-11', title: 'Bloque protegido · Deep work', color: '#9b8aff' },
        ],
      };
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _DetailTabEntregables — preview inline + acción primaria por tipo
  // A.12.1: componente React (no llamada inline) para aislar Rules of Hooks.
  //
  // Cada deliverable tiene una "acción primaria" inteligente:
  //   - doc (.md/.txt)   → "Ver" (expande preview inline) + footer Descargar
  //   - image (.png/.jpg)→ "Ver" (expande preview inline) + footer Descargar
  //   - calendar (events)→ "Ver" (expande calendar list) + footer Abrir Calendar
  //   - link (URL)       → "Abrir" (toast simula nueva pestaña). Sin descarga.
  // ──────────────────────────────────────────────────────────────────────────
  function _DetailTabEntregables(props) {
    var deliverables = props.deliverables;
    var accent = props.accent;
    var onDownload = props.onDownload;
    var onView = props.onView;
    var expandedState = React.useState({});
    var expanded = expandedState[0]; var setExpanded = expandedState[1];

    if (!deliverables || deliverables.length === 0) {
      return <_EmptyState icon="📎" title="Sin entregables" desc="Cuando esta tarea termine, los archivos y links que el coach produjo aparecerán acá."/>;
    }

    function toggle(i) {
      // Audit CRIT-5 fix: functional updater para evitar perder updates si
      // dos toggles disparan antes del re-render (closure stale). El form
      // anterior `Object.assign({}, expanded)` capturaba el valor del render
      // en el que se creó el closure del card.
      setExpanded(function(prev) {
        var next = Object.assign({}, prev);
        next[i] = !next[i];
        return next;
      });
    }

    // Mapeo de kind → acción primaria + label
    function _primaryAction(d) {
      if (d.kind === 'link')     return { label: 'Abrir',  expandable: false, secondary: null };
      if (d.kind === 'calendar') return { label: 'Ver',    expandable: true,  secondary: 'Abrir en Calendar' };
      if (d.kind === 'image')    return { label: 'Ver',    expandable: true,  secondary: 'Descargar' };
      // doc por default
      return { label: 'Ver', expandable: true, secondary: 'Descargar' };
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {deliverables.map(function(d, i) {
          var action = _primaryAction(d);
          var isExpanded = !!expanded[i];
          var preview = action.expandable ? _previewForDeliverable(d) : null;

          return (
            <div key={i} style={{
              borderRadius: 14,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
              animation: 'mtx-fade-up .25s ease both',
              animationDelay: (i * 0.05) + 's',
            }}>
              {/* Header siempre visible */}
              <div style={{
                padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: action.expandable ? 'pointer' : 'default',
              }}
              role={action.expandable ? 'button' : undefined}
              tabIndex={action.expandable ? 0 : undefined}
              aria-expanded={action.expandable ? isExpanded : undefined}
              aria-label={action.expandable ? (isExpanded ? 'Colapsar ' : 'Ver ') + d.label : d.label}
              onClick={action.expandable ? function() { toggle(i); } : undefined}
              onKeyDown={action.expandable ? function(e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(i); }
              } : undefined}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, ' + accent + '20, ' + accent + '06)',
                  border: '0.5px solid ' + accent + '30',
                  color: accent,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, lineHeight: 1,
                }} aria-hidden="true">{d.icon || (d.kind === 'link' ? '🔗' : '📄')}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: 'var(--ink-1)',
                    fontFamily: 'var(--ff-display, var(--ff-sans))',
                    letterSpacing: '-0.005em',
                    lineHeight: 1.25,
                    marginBottom: 2,
                  }}>{d.label}</div>
                  {(d.size || d.meta) && (
                    <div style={{
                      fontSize: 11, color: 'var(--ink-3)',
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                    }}>{d.size || d.meta}</div>
                  )}
                </div>

                {/* Acción primaria: para 'link' es onView directo, para expandables es toggle visual */}
                {action.expandable ? (
                  <div aria-hidden="true" style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    color: accent,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12,
                    transition: 'transform .25s',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0,
                  }}>▾</div>
                ) : (
                  <button onClick={function(e) { e.stopPropagation(); onView(d); }}
                    aria-label={'Abrir ' + d.label}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer',
                      padding: '6px 14px', borderRadius: 999,
                      background: 'linear-gradient(135deg, ' + accent + ', ' + accent + 'BB)',
                      color: '#0a1410',
                      border: 0,
                      fontSize: 11, fontWeight: 700,
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                      boxShadow: '0 4px 10px -2px ' + accent + '50',
                      flexShrink: 0,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                    <span>{action.label}</span>
                    <span aria-hidden="true">↗</span>
                  </button>
                )}
              </div>

              {/* Preview expandido inline + acción secundaria al final */}
              {action.expandable && isExpanded && (
                <div style={{
                  borderTop: '0.5px solid rgba(255,255,255,0.06)',
                  background: 'rgba(0,0,0,0.20)',
                  animation: 'mtx-fade-up .25s ease both',
                }}>
                  {/* Preview body */}
                  <div style={{ padding: '14px 16px 12px' }}>
                    {_renderPreview(preview, accent)}
                  </div>
                  {/* Footer con acción secundaria */}
                  {action.secondary && (
                    <div style={{
                      borderTop: '0.5px solid rgba(255,255,255,0.04)',
                      padding: '8px 14px',
                      display: 'flex', justifyContent: 'flex-end',
                    }}>
                      <button onClick={function(e) {
                          e.stopPropagation();
                          if (d.kind === 'calendar') { onView(d); }
                          else { onDownload(d); }
                        }}
                        aria-label={action.secondary + ' ' + d.label}
                        className="mtx-tap"
                        style={{
                          appearance: 'none', cursor: 'pointer',
                          padding: '6px 12px', borderRadius: 999,
                          background: 'transparent',
                          border: '0.5px solid ' + accent + '50',
                          color: accent,
                          fontSize: 11, fontWeight: 700,
                          fontFamily: 'var(--ff-sans)',
                          letterSpacing: '-0.005em',
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                        }}>
                        <span aria-hidden="true">{d.kind === 'calendar' ? '↗' : '⬇'}</span>
                        <span>{action.secondary}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _renderPreview — render del preview inline según tipo
  // ──────────────────────────────────────────────────────────────────────────
  function _renderPreview(preview, accent) {
    if (!preview) {
      return (
        <div style={{
          fontSize: 11.5, color: 'var(--ink-4)',
          fontFamily: 'var(--ff-sans)',
          fontStyle: 'italic',
          textAlign: 'center',
          padding: '12px 0',
        }}>Sin preview disponible</div>
      );
    }

    if (preview.type === 'markdown') {
      // Render simple sin parser real — preserva \n y bold ** **
      var lines = preview.body.split('\n');
      return (
        <div style={{
          fontSize: 12.5, color: 'var(--ink-1)',
          fontFamily: 'var(--ff-mono, monospace)',
          letterSpacing: '-0.005em',
          lineHeight: 1.6,
          maxHeight: 280, overflowY: 'auto',
          whiteSpace: 'pre-wrap',
        }} className="mtx-no-scrollbar">{
          lines.map(function(l, i) {
            // Headings
            if (l.startsWith('# ')) return <div key={i} style={{ fontSize: 15, fontWeight: 800, color: accent, marginTop: i === 0 ? 0 : 12, marginBottom: 6, fontFamily: 'var(--ff-display, var(--ff-sans))' }}>{l.replace(/^# /, '')}</div>;
            if (l.startsWith('## ')) return <div key={i} style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-1)', marginTop: 10, marginBottom: 4, fontFamily: 'var(--ff-display, var(--ff-sans))' }}>{l.replace(/^## /, '')}</div>;
            if (l.trim() === '') return <div key={i} style={{ height: 6 }}/>;
            // Inline bold básico
            var parts = l.split(/(\*\*[^*]+\*\*)/g);
            return (
              <div key={i} style={{ fontFamily: 'var(--ff-sans)' }}>
                {parts.map(function(p, j) {
                  if (p.startsWith('**') && p.endsWith('**')) {
                    return <strong key={j} style={{ color: 'var(--ink-1)' }}>{p.slice(2, -2)}</strong>;
                  }
                  return <span key={j}>{p}</span>;
                })}
              </div>
            );
          })
        }</div>
      );
    }

    if (preview.type === 'text') {
      return (
        <div style={{
          fontSize: 12.5, color: 'var(--ink-1)',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
          lineHeight: 1.6,
          maxHeight: 280, overflowY: 'auto',
          whiteSpace: 'pre-wrap',
        }} className="mtx-no-scrollbar">{preview.body}</div>
      );
    }

    if (preview.type === 'image-svg') {
      // Audit CRIT-6 fix: encodeURIComponent maneja #, quotes, espacios, etc.
      var dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(preview.svg);
      return (
        <div style={{
          display: 'flex', justifyContent: 'center',
          padding: '4px 0',
        }}>
          <img src={dataUri} alt="Preview" style={{
            maxWidth: '100%', maxHeight: 260, borderRadius: 10,
            border: '0.5px solid rgba(255,255,255,0.10)',
            boxShadow: '0 8px 24px -8px rgba(0,0,0,0.5)',
          }}/>
        </div>
      );
    }

    if (preview.type === 'calendar-events') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {preview.events.map(function(ev, i) {
            return (
              <div key={i} style={{
                padding: '8px 10px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderLeft: '3px solid ' + ev.color,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: ev.color,
                  fontFamily: 'var(--ff-mono, monospace)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.02em',
                  flexShrink: 0,
                  minWidth: 92,
                }}>{ev.time}</div>
                <div style={{
                  fontSize: 12.5, color: 'var(--ink-1)',
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  lineHeight: 1.3,
                }}>{ev.title}</div>
              </div>
            );
          })}
        </div>
      );
    }

    // Audit IMP-10 fix: tipo desconocido → placeholder explícito (no null silente
    // que dejaría el contenedor vacío con altura desconcertante).
    return (
      <div style={{
        fontSize: 11.5, color: 'var(--ink-4)',
        fontFamily: 'var(--ff-sans)',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: '12px 0',
      }}>Tipo de preview desconocido</div>
    );
  }

  // Sprint A.12.1: _DetailTabAcciones removida. Las CTAs de cada estado ya
  // viven en TaskCard (las cápsulas Re-ejecutar / Aprobar / Cancelar /
  // Reintentar). Tab separada era redundante. El detail ahora queda solo
  // con info (Detalles · Proceso · Entregables) — ningún botón mutante.

  // ──────────────────────────────────────────────────────────────────────────
  // TasksSheet (V2) — sheet principal con 5 tabs
  // ──────────────────────────────────────────────────────────────────────────
  function TasksSheetV2(props) {
    var onClose = props.onClose;

    // Suscribirse a __mtxIATasks vía listener directo del evento.
    // Audit CRIT-1: REMOVIDA la línea `window.useIATasks ? window.useIATasks() : null`
    // — llamar un hook condicionalmente sobre un global runtime viola Rules of Hooks
    // (#9 blind-spot). El listener de abajo cubre la misma suscripción de manera
    // segura. Bonus: elimina suscripción duplicada (CRIT IMP-8) → 1 re-render por evento.
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
      // Audit GAP-3: tab count siempre representa el TOTAL (success + dismissed),
      // independiente del sub-filter visible. Cambiar el badge del tab al filtrar
      // confundía al user (parecía que el total bajaba).
      completed:        allCompleted.length + allDismissed.length,
      failed:           allFailed.length,
    };

    // Auto-select tab al primer mount con datos.
    // Audit CRIT-3 fix: el effect leía `counts` capturado del primer render
    // (closure stale). Si los datos llegaban async post-mount, el effect ya
    // no corría y dejaba un tab vacío seleccionado.
    // Fix: ref guard "ya se hizo el switch" + leer store DIRECTO dentro del
    // effect cuando se ejecuta. Deps incluyen un trigger del listener
    // (forceTick) — el effect re-corre cuando los datos llegan, pero el ref
    // garantiza que solo SE EJECUTA UNA VEZ (no cambia tab si el user ya
    // seleccionó manualmente).
    var autoSelectedRef = React.useRef(false);
    React.useEffect(function() {
      if (autoSelectedRef.current) return;
      if (!window.__mtxIATasks) return;
      var liveStats = window.__mtxIATasks.getStats();
      var liveCounts = {
        scheduled:        liveStats.scheduled,
        pending_approval: liveStats.pending,
        in_progress:      liveStats.active,
        completed:        liveStats.history,  // approx — todo el history cuenta
        failed:           liveStats.history,
      };
      if (liveCounts[activeTab] > 0) {
        // El tab actual ya tiene data — marcar como auto-selected y no tocar.
        autoSelectedRef.current = true;
        return;
      }
      var nonEmpty = STATUSES.find(function(s) {
        return liveCounts[s.id] > 0 && s.id !== 'dismissed';
      });
      if (nonEmpty) {
        autoSelectedRef.current = true;
        setActiveTab(nonEmpty.id);
      }
    });  // sin deps — corre en cada render, pero ref bloquea después del primero útil

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
    // Audit CRIT-2: refcount global para coordinar body lock con detail sheet nested
    React.useEffect(function() {
      window.__mtxBodyLock.lock();
      return function() { window.__mtxBodyLock.unlock(); };
    }, []);

    // Tick para active tasks.
    // Audit CRIT-4 fix: usar JSON.stringify para evitar colisión si task.id
    // contiene '|' (ej. ids derivados de workflow paths con pipes). Antes
    // dos sets de tasks con ids tipo ['a','b|c'] y ['a|b','c'] generaban el
    // mismo key — el interval no se re-creaba cuando debería.
    var activeKey = JSON.stringify(allActive.map(function(a) { return a.id; }));
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
        <div role="dialog" aria-modal="true" aria-label="Tareas del agente"
          className="mtx-no-scrollbar"
          style={{
            position: 'absolute', inset: 0, zIndex: 200,
            // A.15.2: bg natural de Mentex (verde-oscuro --obs-1 #0a0d0e).
            // Era rgba(8,8,21,0.96) azul-morado — no coincidía con el resto
            // de la app que usa la paleta obsidian verde-oscuro.
            background: 'rgba(10,13,12,0.96)',
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            display: 'flex', flexDirection: 'column',
            animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
          }}>

          {/* A.12.3: header notifs-style (consistencia con resto de la app).
              Nav bar: ← circular izq · título centrado absoluto · spacer/acción der.
              Subtítulo abajo: "N pendientes · descripción" centrado. */}
          <div style={{
            paddingTop: 48, paddingLeft: 16, paddingRight: 16, paddingBottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0, position: 'relative',
          }}>
            <button onClick={onClose} aria-label="Volver" className="mtx-tap" style={{
              width: 40, height: 40, borderRadius: 999, border: 0,
              background: 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-1)', cursor: 'pointer',
              position: 'relative', zIndex: 2,
              appearance: 'none',
              fontSize: 16, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
            }}>
              <span aria-hidden="true">‹</span>
            </button>

            <div style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%, calc(-50% + 19px))',
              fontSize: 16, fontWeight: 700, color: 'var(--ink-1)',
              letterSpacing: '-0.015em',
              fontFamily: 'var(--ff-sans)',
              pointerEvents: 'none',
            }}>
              Tareas del agente
            </div>

            {/* Spacer derecho para equilibrar el ← (sin acción por ahora) */}
            <div style={{ width: 40, height: 40 }}/>
          </div>

          {/* Subtítulo: contador en color + descripción */}
          <div style={{
            padding: '4px 22px 16px',
            flexShrink: 0,
            fontSize: 12.5,
            color: 'var(--ink-3)',
            textAlign: 'center',
          }}>
            {stats.pending > 0 && (
              <React.Fragment>
                <span style={{ color: '#ffc850', fontWeight: 700 }}>
                  {stats.pending} {stats.pending === 1 ? 'pendiente' : 'pendientes'}
                </span>
                <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
              </React.Fragment>
            )}
            Programadas, en curso e historial
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
              // Audit GAP-5 fix: empty desc reactiva al sub-filter en Completadas
              // (ej. "Sin descartadas" debe explicar Descartadas, no Exitosas).
              ? (<_EmptyState
                  icon={activeInfo.icon}
                  title={
                    activeTab === 'completed' && completedFilter === 'success'   ? 'Sin completadas exitosas' :
                    activeTab === 'completed' && completedFilter === 'dismissed' ? 'Sin descartadas' :
                    'Sin ' + activeInfo.label.toLowerCase()
                  }
                  desc={
                    activeTab === 'completed' && completedFilter === 'success'   ? 'Las ejecuciones exitosas aparecerán acá.' :
                    activeTab === 'completed' && completedFilter === 'dismissed' ? 'Las tareas que rechazaste o el coach descartó aparecerán acá.' :
                    activeInfo.emptyDesc
                  }/>)
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

        {/* Detail sheet sobre el principal.
            Audit GAP-6 fix: key={task.id} fuerza remount cuando se abre OTRO
            detail. Garantiza que el state interno (tab activo, expanded
            entregables) se resetea limpio para la nueva task. Defensa contra
            React reuso de instance si los detalles se abren rápido. */}
        {detail && (
          <TaskDetailSheet
            key={detail.task.id}
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
