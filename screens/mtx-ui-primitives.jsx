// screens/mtx-ui-primitives.jsx — primitives UI compartidos del coach
// ─────────────────────────────────────────────────────────────────────────────
//
// Refactor Sprint A.8 → A.9 (post-audit).
//
// Single source of truth para los building blocks UI repetidos en
// múltiples artifacts del coach + las features futuras (wellness A.9).
//
// Estrategia adopción gradual:
//   • Las funciones privadas existentes (_GenActionPill, _SceneMetaTile,
//     _microBtnStyle) NO se eliminan — siguen viviendo en ia-artifacts.jsx.
//   • Este archivo expone las MISMAS primitives via window.__mtxUI con
//     el patrón de adoption-friendly API.
//   • Sprint A.9 wellness USA EXCLUSIVAMENTE window.__mtxUI.
//   • Migración de call sites legacy queda fuera de scope (zero benefit risk).
//
// Beneficio: A.9 hereda primitives 1:1 sin duplicar 100+ LOC.
//
// Primitives expuestas:
//   • ActionPill        — botón pill compacto con icon + label (4 acciones)
//   • MetaTile          — tile cuadrado con icon + LABEL + value (metadata)
//   • microBtnStyle()   — factory de style object para botones inline
//   • safeToast(msg,kd) — wrapper defensivo de __mtxToast
//   • backdropHandlers  — pattern mouseDown/touchMove/click para bottom sheets
//
// Naming colision check (run en audit pre-refactor): window.__mtxUI NO existe.
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxUI) return;

  // ──────────────────────────────────────────────────────────────────────────
  // Tokens locales (snapshot de __mtxColorTokens · fallback si no cargó)
  // ──────────────────────────────────────────────────────────────────────────
  function _t() {
    return window.__mtxColorTokens || {
      neon: '#3dffd1', purple: '#9b8aff', gold: '#ffc850',
      status: { danger: '#ff8b8b', success: '#3dffd1' },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ActionPill — pill button compacto para "Regenerar / Guardar / Descargar"
  // ──────────────────────────────────────────────────────────────────────────
  // Usado en: IAArtifactImageResult, IAArtifactVideoResult, y futuro A.9
  // wellness "Iniciar / Pausar / Repetir / Saltar".
  //
  // Props:
  //   icon      string (emoji or single char)
  //   label     string visible + aria-label
  //   onClick   function
  //   active    boolean (estado seleccionado/done · accent neon)
  //   accent    optional override del color accent (defaults a neon)
  function ActionPill(props) {
    var active = !!props.active;
    var accent = props.accent || _t().neon;
    return (
      React.createElement('button', {
        type: 'button',
        onClick: props.onClick,
        className: 'mtx-tap',
        'aria-label': props.label,
        'aria-pressed': active,
        style: {
          appearance: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '6px 10px', borderRadius: 999,
          background: active ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.04)',
          border: '0.5px solid ' + (active ? 'rgba(61,255,209,0.30)' : 'rgba(255,255,255,0.08)'),
          color: active ? accent : 'var(--ink-2)',
          fontSize: 11, fontWeight: 600,
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
          transition: 'background .15s, color .15s, border-color .15s',
        },
      },
        React.createElement('span', { 'aria-hidden': 'true' }, props.icon),
        React.createElement('span', null, props.label)
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MetaTile — tile cuadrado con icon + LABEL + value para metadata grids
  // ──────────────────────────────────────────────────────────────────────────
  // Usado en: SceneDetailSheet (Cámara/Duración/Mood/Aspect), y futuro A.9
  // wellness (Ciclos/Duración/Intensidad/Dificultad).
  //
  // Props:
  //   icon   string
  //   label  string (uppercase rendered)
  //   value  string|number
  function MetaTile(props) {
    return (
      React.createElement('div', {
        style: {
          padding: '10px 11px', borderRadius: 10,
          background: 'rgba(255,255,255,0.025)',
          border: '0.5px solid rgba(255,255,255,0.05)',
          display: 'flex', flexDirection: 'column', gap: 2,
        },
      },
        React.createElement('div', {
          style: {
            fontSize: 10, color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '0.06em', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 4,
          },
        },
          React.createElement('span', { 'aria-hidden': 'true' }, props.icon),
          String(props.label || '').toUpperCase()
        ),
        React.createElement('div', {
          style: {
            fontSize: 13, fontWeight: 700,
            color: 'var(--ink-1)', fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
          },
        }, props.value)
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // microBtnStyle — factory para style object de botones inline pequeños
  // ──────────────────────────────────────────────────────────────────────────
  // Usado en: SceneDetailSheet adjust duration (− + 🗑 + esc), y futuro
  // A.9 wellness controles inline.
  //
  // Accept override prop para casos como danger color: `Object.assign(microBtnStyle(), { color: ... })`
  function microBtnStyle() {
    return {
      appearance: 'none', cursor: 'pointer',
      padding: '3px 7px', borderRadius: 6,
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(255,255,255,0.06)',
      color: 'var(--ink-2)', fontSize: 11, fontWeight: 600,
      fontFamily: 'var(--ff-sans)',
      lineHeight: 1,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // safeToast — wrapper defensivo del __mtxToast global
  // ──────────────────────────────────────────────────────────────────────────
  // Defensa contra race startup (toast no cargado) + type-check estricto.
  // Aplicado de la lección Audit IMP-2 + CRIT-3.
  //
  // kind:  'info' | 'success' | 'warn' | 'danger'
  function safeToast(msg, kind) {
    if (window.__mtxToast && typeof window.__mtxToast.show === 'function') {
      window.__mtxToast.show(msg, { kind: kind || 'info', durationMs: 2400 });
    } else {
      console.log('[mtxUI.toast]', msg);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // backdropHandlers — pattern handlers para bottom sheets portal
  // ──────────────────────────────────────────────────────────────────────────
  // Devuelve { onMouseDown, onTouchStart, onTouchMove, onClick } para envolver
  // el backdrop de un portal sheet. Previene cierres accidentales por scroll
  // o pinch-zoom en mobile (lección Audit CRIT-8).
  //
  // Uso:
  //   var ref = React.useRef(false);
  //   var handlers = window.__mtxUI.backdropHandlers(ref, props.onClose);
  //   <div {...handlers}>...</div>
  function backdropHandlers(backdropDownRef, onClose) {
    function setDown(e) { backdropDownRef.current = e.target === e.currentTarget; }
    function clear() { backdropDownRef.current = false; }
    function maybeClose(e) {
      if (e.target === e.currentTarget && backdropDownRef.current && onClose) onClose();
      backdropDownRef.current = false;
    }
    return {
      onMouseDown: setDown,
      onTouchStart: setDown,
      onTouchMove: clear,
      onClick: maybeClose,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────
  window.__mtxUI = {
    ActionPill: ActionPill,
    MetaTile: MetaTile,
    microBtnStyle: microBtnStyle,
    safeToast: safeToast,
    backdropHandlers: backdropHandlers,
  };
})();
