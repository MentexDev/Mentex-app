// screens/coach-timeline.jsx — Fase A · RFC-001 §6.1
// ─────────────────────────────────────────────────────────────────────────────
// <CoachTimeline /> — visualización vertical de "steps" del coach mientras
// ejecuta tools. Bolitas suaves, frases en gerundio cálido, NUNCA nombres
// de skill internos. Manus-style pero con la voz Mentex.
//
// CONCEPTO (RFC-001 §5.1):
//   El timeline aparece SOLO cuando agrega valor. Si el coach hace 1 tool
//   trivial <800ms, este componente no se monta. Si hace 2+ tools o cualquier
//   query >2s, aparece junto al bubble del assistant, ANTES del content.
//
// ESTADOS DE STEP (RFC-001 §5.1):
//   • pending  ○ outline circle, 60% opacity, sin animación
//   • active   ● filled circle pulsando opacity 0.6→1.0 en 1.2s
//   • done     ✓ checkmark, 80% opacity, fade-in 200ms
//   • failed   ⊘ ring con × discreto, shake 300ms once
//   • cancelled ⊙ ring vacío, fade-out then hidden
//
// SHAPE DE STEP (RFC-001 §6.1):
//   {
//     id: string,
//     toolName: 'rag_search' | 'memory_recall' | ...,   // §4 RFC catalog
//     copyKey?: number,                                 // index en variantes §5.6
//     status: 'pending' | 'active' | 'done' | 'failed' | 'cancelled',
//     startedAt?: number,                               // ms timestamp
//     completedAt?: number,
//     error?: { message, retryable },
//     rawInput?: unknown,                               // para "Ver detalles"
//     rawOutput?: unknown
//   }
//
// REGLAS UX INVIOLABLES (RFC-001 §5.4):
//   1. Frases en español natural — gerundio cálido del catálogo, NUNCA logs
//   2. No mostrar timeline si <2 tools y <800ms total
//   3. Máximo 6 steps visibles — colapsar completados si excede
//   4. "Ver detalles" default colapsado
//   5. NO mostrar nombres de skill (rag_search, brain.query, etc.)
//   6. Tipografía 13px, opacidad 0.85, color neon alpha 0.7
//   7. Cancel button aparece después de 5000ms en step active
//   8. Animación entrada: slide-down 200ms + fade-in 150ms
// ─────────────────────────────────────────────────────────────────────────────


// ── CATÁLOGO DE FRASES GERUNDIO CÁLIDO (RFC-001 §5.6) ────────────────────────
// Una entrada por tool del catálogo de 20 tools (Core + Extended + Visionario).
// Variantes seleccionadas random pero stickán por sesión (ver _COACH_PHRASE_CACHE).
//
// IMPORTANTE: cuando aparezca una tool nueva en el RFC, agregar entrada aquí.
// Si no hay entrada para una tool, el timeline cae al genérico "Trabajando…".
var _COACH_PHRASES = {
  // Capa Core (8 tools — lanzamiento)
  rag_search: [
    'Buscando en tu biblioteca',
    'Mirando qué tenemos sobre esto',
    'Revisando el catálogo',
  ],
  memory_recall: [
    'Recordando lo que sé de ti',
    'Trayendo a la mente lo que me contaste',
    'Mirando tu Memoria',
  ],
  memory_store: [
    'Guardando esto en tu Memoria',
    'Anotando para no olvidarlo',
  ],
  ritual_add: [
    'Sumando a tu Ritual',
    'Agregándolo a tu día',
  ],
  agenda_schedule_reminder: [
    'Programando en tu Agenda',
    'Apuntándolo para la hora correcta',
  ],
  content_recommend: [
    'Eligiendo algo para ti',
    'Buscando lo que más te puede servir hoy',
  ],
  crisis_handle: [
    'Aquí estoy contigo',
  ],
  voice_speak: [
    'Te lo cuento en voz',
    'Te lo digo en audio',
  ],

  // Capa Extended (6 tools — 3 meses post-launch)
  web_search: [
    'Buscando en la web',
    'Mirando qué se está diciendo afuera',
  ],
  web_fetch: [
    'Leyendo el artículo que me compartiste',
    'Estudiando ese link',
  ],
  extended_think: [
    'Pensando profundamente',
    'Dejándolo decantar un momento',
  ],
  image_generate: [
    'Pintando algo para ti',
    'Visualizándolo',
  ],
  document_render: [
    'Armando tu plan',
    'Dándole forma',
  ],
  integrate_action: [
    'Conectando con tus integraciones',
    'Hablando con tus apps',
  ],

  // Capa Visionaria (5+ tools — año 1+)
  browse_act: [
    'Haciéndolo por ti en internet',
    'Yendo a hacerlo en tu lugar',
  ],
  video_generate: [
    'Animando algo especial',
    'Componiéndolo',
  ],
  voice_call: [
    'Llamando contigo',
  ],
  screen_share_understand: [
    'Mirando tu pantalla contigo',
    'Viendo lo mismo que tú',
  ],
  wearable_read: [
    'Mirando cómo dormiste anoche',
    'Leyendo tu cuerpo de hoy',
  ],
};

// Cache de variante por (sessionId, toolName) — la variante elegida random la
// PRIMERA vez en una sesión se mantiene durante esa sesión para no oscilar.
// En producción, sessionId vendría del store del coach. En mock, usamos el
// conversation id como sessionId.
var _COACH_PHRASE_CACHE = {};

function _pickCoachPhrase(toolName, sessionId) {
  var phrases = _COACH_PHRASES[toolName];
  if (!phrases || phrases.length === 0) return 'Trabajando';
  var key = (sessionId || 'default') + ':' + toolName;
  if (_COACH_PHRASE_CACHE[key] != null) return phrases[_COACH_PHRASE_CACHE[key]];
  var idx = Math.floor(Math.random() * phrases.length);
  _COACH_PHRASE_CACHE[key] = idx;
  return phrases[idx];
}


// ── <CoachStep /> — single step row ──────────────────────────────────────────
// Renderiza una bolita + frase + (opcional) elapsed ms cuando done.
// Animación de entrada: slide-down 200ms + fade-in 150ms.
// El visual del status icon es deliberadamente minimalista — bolitas pequeñas
// que no compitan con el bubble del coach.
function CoachStep(props) {
  var step = props.step;
  var sessionId = props.sessionId;
  var showDetails = props.showDetails;
  var onCancel = props.onCancel;

  var status = step.status || 'pending';
  var phrase = _pickCoachPhrase(step.toolName, sessionId);

  // Cancel button aparece SOLO en step active después de 5s
  var startedAt = step.startedAt;
  var nowState = React.useState(Date.now());
  var setNow = nowState[1];
  React.useEffect(function() {
    if (status !== 'active') return;
    var t = setInterval(function() { setNow(Date.now()); }, 1000);
    return function() { clearInterval(t); };
  }, [status]);

  var elapsedMs = startedAt ? (status === 'done' || status === 'failed' ? (step.completedAt || Date.now()) - startedAt : nowState[0] - startedAt) : 0;
  var showCancelBtn = status === 'active' && elapsedMs > 5000 && onCancel;

  // ── Status icon visual ────────────────────────────────────────────────────
  // Colores del catálogo:
  //   pending: outline circle 60% opacity
  //   active: filled neon con pulse opacity 0.6→1.0
  //   done: checkmark 80% opacity, color white tint
  //   failed: ring + × discreto
  //   cancelled: ring vacío fade-out
  function StatusIcon() {
    var iconSize = 14;
    if (status === 'pending') {
      return (
        <div style={{
          width: iconSize, height: iconSize, borderRadius: '50%',
          border: '1.2px solid rgba(255,255,255,0.30)',
          opacity: 0.6,
          flexShrink: 0,
        }}/>
      );
    }
    if (status === 'active') {
      return (
        <div style={{
          width: iconSize, height: iconSize, borderRadius: '50%',
          background: 'var(--neon)',
          border: '1.2px solid rgba(61,255,209,0.7)',
          flexShrink: 0,
          animation: 'mtx-coach-step-pulse 1.2s ease-in-out infinite',
          willChange: 'opacity, transform',
          boxShadow: '0 0 8px rgba(61,255,209,0.45)',
        }}/>
      );
    }
    if (status === 'done') {
      return (
        <div style={{
          width: iconSize, height: iconSize, borderRadius: '50%',
          background: 'rgba(255,255,255,0.10)',
          border: '0.5px solid rgba(255,255,255,0.20)',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'mtx-coach-step-done .25s ease both',
        }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      );
    }
    if (status === 'failed') {
      return (
        <div style={{
          width: iconSize, height: iconSize, borderRadius: '50%',
          border: '1.2px solid rgba(255,139,139,0.55)',
          background: 'rgba(255,139,139,0.08)',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'mtx-coach-step-fail .3s ease both',
        }}>
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="rgba(255,139,139,0.85)" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
      );
    }
    if (status === 'cancelled') {
      return (
        <div style={{
          width: iconSize, height: iconSize, borderRadius: '50%',
          border: '0.8px dashed rgba(255,255,255,0.20)',
          opacity: 0.4,
          flexShrink: 0,
        }}/>
      );
    }
    return null;
  }

  // Texto del step
  var textColor = status === 'done'
    ? 'rgba(255,255,255,0.55)'
    : status === 'active'
      ? 'rgba(255,255,255,0.85)'
      : status === 'failed'
        ? 'rgba(255,139,139,0.75)'
        : status === 'cancelled'
          ? 'rgba(255,255,255,0.30)'
          : 'rgba(255,255,255,0.50)';

  var textDecoration = status === 'cancelled' ? 'line-through' : 'none';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '3px 0',
      animation: 'mtx-coach-step-enter .35s ease both',
    }}>
      <StatusIcon/>
      <span style={{
        fontSize: 13,
        lineHeight: 1.35,
        color: textColor,
        textDecoration: textDecoration,
        fontFamily: 'var(--ff-sans)',
        letterSpacing: '-0.005em',
        flex: 1, minWidth: 0,
      }}>
        {phrase}
        {status === 'active' && (
          <span style={{
            display: 'inline-block', marginLeft: 5, opacity: 0.5,
          }}>…</span>
        )}
      </span>

      {showCancelBtn && (
        <button
          type="button"
          onClick={function() { onCancel(step.id); }}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '3px 9px', borderRadius: 999,
            border: '0.5px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.65)',
            fontSize: 10.5, fontWeight: 500,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '0.01em',
            transition: 'background .2s, border-color .2s',
          }}
          aria-label="Cancelar este paso">
          Cancelar
        </button>
      )}

      {showDetails && status === 'done' && elapsedMs > 0 && (
        <span style={{
          fontSize: 10.5,
          color: 'rgba(255,255,255,0.35)',
          fontFamily: 'var(--ff-mono, ui-monospace, monospace)',
          letterSpacing: '0.01em',
        }}>
          {(elapsedMs / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}


// ── <CoachTimeline /> — main component ───────────────────────────────────────
// Props:
//   steps: TimelineStep[]          (RFC-001 §6.1 shape)
//   sessionId?: string             (para sticky phrase variants)
//   onCancel?: (stepId) => void    (callback cuando user cancela un step)
//   variant?: 'inline' | 'fullwidth'  (default 'inline')
//
// Local state:
//   showDetails: boolean — persistido en localStorage 'mtx:coach:details'
//
// Reglas:
//   • Si steps.length === 0 → no renderiza nada
//   • Si steps.length === 1 y no es complex (extended_think, browse_act, etc.) y
//     status === 'active' < 2s → no renderiza (caída a TypingDots clásico)
//     Esta lógica vive en el bubble caller; aquí confiamos en lo que recibimos.
//   • Colapsar steps completados si total > 6:
//     muestra primer 1, "+N pasos más", último done y siguiente active
function CoachTimeline(props) {
  var steps = Array.isArray(props.steps) ? props.steps : [];
  var sessionId = props.sessionId;
  var onCancel = props.onCancel;

  // ─ Persisted details preference ─
  var detailsState = React.useState(function() {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      return window.localStorage.getItem('mtx:coach:details') === '1';
    } catch (e) { return false; }
  });
  var showDetails = detailsState[0];
  var setShowDetails = detailsState[1];

  function toggleDetails() {
    var next = !showDetails;
    setShowDetails(next);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('mtx:coach:details', next ? '1' : '0');
      }
    } catch (e) {}
  }

  if (steps.length === 0) return null;

  // ─ Colapso de steps completados si exceden 6 ─
  // Muestra: primer 1-2 + "+N pasos más" + último done + activo + pending
  var visibleSteps = steps;
  var hiddenCount = 0;

  if (steps.length > 6) {
    var firstDone = [];
    var activeIdx = -1;
    var i;
    for (i = 0; i < steps.length; i++) {
      if (steps[i].status === 'active') { activeIdx = i; break; }
    }
    // Si hay active, mostrar contexto alrededor del active
    if (activeIdx >= 0) {
      // 1 step inicial + último done previo al active + active + 2 pending siguientes
      var before = steps.slice(0, 1);
      var doneBefore = steps.slice(1, activeIdx).filter(function(s) { return s.status === 'done'; });
      hiddenCount = doneBefore.length > 1 ? doneBefore.length - 1 : 0;
      var lastDone = doneBefore.length > 0 ? [doneBefore[doneBefore.length - 1]] : [];
      var active = [steps[activeIdx]];
      var pendingAfter = steps.slice(activeIdx + 1, activeIdx + 3);
      visibleSteps = before.concat(lastDone, active, pendingAfter);
    } else {
      // Todos completados — mostrar primer 2 + último 2
      var firstTwo = steps.slice(0, 2);
      var lastTwo = steps.slice(-2);
      hiddenCount = steps.length - 4;
      visibleSteps = firstTwo.concat(lastTwo);
    }
  }

  // Active steps actuales para anuncio aria-live
  var activeStep = steps.find(function(s) { return s.status === 'active'; });
  var ariaAnnouncement = activeStep
    ? _pickCoachPhrase(activeStep.toolName, sessionId)
    : '';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="El Coach está trabajando"
      style={{
        // Bloque visual: contenedor sutil que agrupa los steps. Sin border-box
        // fuerte — debe sentirse parte del bubble, no encajado en una box.
        padding: '6px 0 2px',
        animation: 'mtx-fade-up .25s ease both',
      }}>
      {/* aria-live announcement (visual hidden) */}
      <span style={{
        position: 'absolute', left: -10000, width: 1, height: 1, overflow: 'hidden',
      }}>{ariaAnnouncement}</span>

      {/* Steps list */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {visibleSteps.map(function(step, idx) {
          // Render "+N pasos más" entre el primer step y el resto si aplica
          var prev = visibleSteps[idx - 1];
          var origIdx = steps.indexOf(step);
          var prevOrigIdx = prev ? steps.indexOf(prev) : -1;
          var showHiddenLabel = idx > 0 && origIdx - prevOrigIdx > 1 && hiddenCount > 0;
          return (
            <React.Fragment key={step.id}>
              {showHiddenLabel && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '2px 0', paddingLeft: 2,
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.30)',
                  fontStyle: 'italic',
                }}>
                  <div style={{
                    width: 14, display: 'flex', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 1, height: 8, background: 'rgba(255,255,255,0.15)',
                    }}/>
                  </div>
                  <span>+{hiddenCount} pasos más</span>
                </div>
              )}
              <CoachStep
                step={step}
                sessionId={sessionId}
                showDetails={showDetails}
                onCancel={onCancel}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* "Ver detalles" toggle — visible solo cuando hay al menos 1 step done */}
      {steps.some(function(s) { return s.status === 'done' || s.status === 'failed'; }) && (
        <button
          type="button"
          onClick={toggleDetails}
          className="mtx-tap"
          aria-label={showDetails ? 'Ocultar detalles técnicos' : 'Ver detalles técnicos'}
          aria-expanded={showDetails}
          style={{
            appearance: 'none', cursor: 'pointer',
            marginTop: 6,
            padding: '3px 0',
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.30)',
            fontSize: 10.5,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '0.01em',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            transition: 'color .2s',
          }}
          onMouseEnter={function(e) { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
          onMouseLeave={function(e) { e.currentTarget.style.color = 'rgba(255,255,255,0.30)'; }}>
          {showDetails ? 'Ocultar detalles' : 'Ver detalles'}
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{
              transform: showDetails ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform .2s',
            }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      )}

      {/* Details panel — JSON-like view of inputs/outputs */}
      {showDetails && (
        <div style={{
          marginTop: 6,
          padding: '8px 10px',
          background: 'rgba(255,255,255,0.02)',
          border: '0.5px dashed rgba(255,255,255,0.10)',
          borderRadius: 8,
          fontFamily: 'var(--ff-mono, ui-monospace, monospace)',
          fontSize: 10.5,
          color: 'rgba(255,255,255,0.40)',
          lineHeight: 1.5,
          maxHeight: 200,
          overflowY: 'auto',
        }}>
          {steps.filter(function(s) { return s.rawInput || s.rawOutput; }).map(function(step) {
            return (
              <div key={step.id} style={{ paddingBottom: 6 }}>
                <div style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>{step.toolName}</div>
                {step.rawInput && (
                  <div>→ {_formatRawData(step.rawInput)}</div>
                )}
                {step.rawOutput && (
                  <div>← {_formatRawData(step.rawOutput)}</div>
                )}
              </div>
            );
          })}
          {steps.filter(function(s) { return s.rawInput || s.rawOutput; }).length === 0 && (
            <div style={{ fontStyle: 'italic' }}>
              No hay detalles técnicos para este flujo.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function _formatRawData(data) {
  if (data == null) return 'null';
  if (typeof data === 'string') return data.length > 80 ? data.slice(0, 80) + '…' : data;
  if (typeof data === 'object') {
    try {
      var json = JSON.stringify(data);
      return json.length > 120 ? json.slice(0, 120) + '…' : json;
    } catch (e) { return '[Object]'; }
  }
  return String(data);
}


// ── Inject CSS keyframes (solo una vez) ──────────────────────────────────────
(function() {
  if (typeof window === 'undefined' || !document) return;
  if (document.getElementById('mtx-coach-timeline-styles')) return;
  var style = document.createElement('style');
  style.id = 'mtx-coach-timeline-styles';
  style.textContent = [
    '@keyframes mtx-coach-step-pulse {',
    '  0%, 100% { opacity: 0.6; transform: scale(0.95); }',
    '  50% { opacity: 1.0; transform: scale(1.05); }',
    '}',
    '@keyframes mtx-coach-step-done {',
    '  from { opacity: 0; transform: scale(0.7); }',
    '  to { opacity: 1; transform: scale(1); }',
    '}',
    '@keyframes mtx-coach-step-fail {',
    '  0% { transform: translateX(0); }',
    '  25% { transform: translateX(-3px); }',
    '  50% { transform: translateX(3px); }',
    '  75% { transform: translateX(-2px); }',
    '  100% { transform: translateX(0); }',
    '}',
    '@keyframes mtx-coach-step-enter {',
    '  from { opacity: 0; transform: translateY(-4px); }',
    '  to { opacity: 1; transform: translateY(0); }',
    '}',
  ].join('\n');
  document.head.appendChild(style);
})();


// ── Exports al window — el bubble los consume ────────────────────────────────
if (typeof window !== 'undefined') {
  window.CoachTimeline = CoachTimeline;
  window.CoachStep = CoachStep;
  window._coachPickPhrase = _pickCoachPhrase;  // útil para mocks que quieran preview
  window._COACH_PHRASES = _COACH_PHRASES;       // exporta el catálogo para auditoría
}
