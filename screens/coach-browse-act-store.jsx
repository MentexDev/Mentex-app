// screens/coach-browse-act-store.jsx — Sprint A.6 · B5 (REFACTOR)
// ─────────────────────────────────────────────────────────────────────────────
// Versión depurada del browse_act: sin overlay fullscreen, sin cursor animado,
// sin sub-status rotativo. Diego (post-feedback) rechazó esa ceremonia como
// "mucho show" y pidió pasar a un patrón estilo Claude Code extension:
// capturas pequeñas inline al lado de cada step del timeline, dentro del
// chat — todo en un único browse_progress_card LIVE.
//
// Este archivo expone SOLO la lógica (no UI):
//   • window.__mtxBrowseActPlanFlow(prompt) — mapea prompt → flow config
//   • window.__mtxBrowseActScreenshot(opts) — genera SVG mock thumbnail
//   • window.__mtxBrowseActRunner.start(opts) — ejecuta el flow live actualizando
//     el browse_progress_card del msg progresivamente
//   • window.__mtxBrowseActRunner.cancel(msgId) — aborta el flow
//
// CUANDO LLEGUE BACKEND (Sprint B):
//   • __mtxBrowseActScreenshot → reemplazar por <img src={signedUrl}/> del
//     Playwright headless del Imperial Gateway. Devuelve PNG real de cada step.
//   • __mtxBrowseActPlanFlow → reemplazar por API POST /v1/tools/browse-act/plan
//   • Runner mantiene mismo shape — el card no cambia.
//
// PROMESA AL USER (Diego, sellado 2026-05-27):
//   Cuando se conecte backend, las capturas serán screenshots reales del sitio
//   navegado por Playwright. NO mocks. El card es el contenedor canónico de
//   esa información.
// ─────────────────────────────────────────────────────────────────────────────


// ─ Screenshot mock generator (SVG embedded) ────────────────────────────────
// Genera mini-thumbnails simulados del browser. Cada uno representa un step
// distinto del flow. Pure SVG → portátil, rápido, sin assets externos.
//
// Cuando llegue backend, esta función desaparece; los thumbs son <img src=...>
// del Playwright real. El consumer (browse_progress_card artifact) NO cambia.
window.__mtxBrowseActScreenshot = function(opts) {
  opts = opts || {};
  var type = opts.type || 'homepage';
  var site = opts.site || 'sitio.com';
  var query = opts.query || '';

  // Paleta por sitio
  var palette = {
    bodytech:   { primary: '#e60019', accent: '#ffd1d6', logo: 'Bodytech' },
    bodyworks:  { primary: '#1e40af', accent: '#dbeafe', logo: 'BodyWorks' },
    cal:        { primary: '#0066ff', accent: '#dde9ff', logo: 'Cal' },
    amazon:     { primary: '#ff9900', accent: '#fff3df', logo: 'amazon' },
    booking:    { primary: '#003580', accent: '#e6efff', logo: 'Booking' },
    default:    { primary: '#666', accent: '#eee', logo: site },
  };
  var p = palette[opts.brand || 'default'] || palette.default;

  // SVG por tipo de "pantalla". Diseñado para verse bien a tamaño thumbnail
  // (~80x60px) además de full size. Texto reducido al mínimo.
  if (type === 'homepage') {
    return [
      '<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">',
        '<rect width="320" height="200" fill="#fff"/>',
        '<rect width="320" height="32" fill="' + p.primary + '"/>',
        '<text x="14" y="22" fill="#fff" font-family="system-ui,sans-serif" font-size="13" font-weight="700">' + p.logo + '</text>',
        '<circle cx="298" cy="16" r="8" fill="#fff" opacity="0.3"/>',
        // Hero
        '<rect x="14" y="46" width="292" height="56" fill="' + p.accent + '" rx="6"/>',
        '<rect x="22" y="58" width="160" height="9" fill="' + p.primary + '" opacity="0.6" rx="2"/>',
        '<rect x="22" y="72" width="120" height="6" fill="' + p.primary + '" opacity="0.35" rx="2"/>',
        '<rect x="22" y="84" width="60" height="14" fill="' + p.primary + '" rx="3"/>',
        // 3 cards
        '<rect x="14" y="114" width="88" height="68" fill="#f5f5f5" rx="6"/>',
        '<rect x="114" y="114" width="88" height="68" fill="#f5f5f5" rx="6"/>',
        '<rect x="214" y="114" width="92" height="68" fill="#f5f5f5" rx="6"/>',
        '<rect x="22" y="156" width="40" height="6" fill="#999" rx="2"/>',
        '<rect x="122" y="156" width="40" height="6" fill="#999" rx="2"/>',
        '<rect x="222" y="156" width="44" height="6" fill="#999" rx="2"/>',
      '</svg>',
    ].join('');
  }
  if (type === 'search') {
    return [
      '<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">',
        '<rect width="320" height="200" fill="#fff"/>',
        '<rect width="320" height="32" fill="' + p.primary + '"/>',
        '<text x="14" y="22" fill="#fff" font-family="system-ui,sans-serif" font-size="13" font-weight="700">' + p.logo + '</text>',
        '<rect x="14" y="48" width="292" height="32" fill="#fff" stroke="' + p.primary + '" stroke-width="1.5" rx="6"/>',
        '<text x="24" y="69" fill="#222" font-family="system-ui,sans-serif" font-size="12">' + (query || 'búsqueda').slice(0, 28) + '</text>',
        // Result rows
        '<rect x="14" y="92" width="292" height="32" fill="#f7f7f7" rx="4"/>',
        '<rect x="22" y="100" width="180" height="7" fill="#999" rx="2"/>',
        '<rect x="22" y="111" width="120" height="5" fill="#bbb" rx="2"/>',
        // Highlighted item
        '<rect x="14" y="128" width="292" height="32" fill="' + p.accent + '" rx="4" stroke="' + p.primary + '" stroke-width="1"/>',
        '<rect x="22" y="136" width="200" height="7" fill="' + p.primary + '" rx="2"/>',
        '<rect x="22" y="147" width="140" height="5" fill="' + p.primary + '" opacity="0.5" rx="2"/>',
        '<rect x="14" y="164" width="292" height="32" fill="#f7f7f7" rx="4"/>',
        '<rect x="22" y="172" width="160" height="7" fill="#999" rx="2"/>',
        '<rect x="22" y="183" width="100" height="5" fill="#bbb" rx="2"/>',
      '</svg>',
    ].join('');
  }
  if (type === 'detail') {
    return [
      '<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">',
        '<rect width="320" height="200" fill="#fff"/>',
        '<rect width="320" height="32" fill="' + p.primary + '"/>',
        '<text x="14" y="22" fill="#fff" font-family="system-ui,sans-serif" font-size="13" font-weight="700">' + p.logo + '</text>',
        '<defs><linearGradient id="bgcv-' + (opts.brand || 'd') + '" x1="0" y1="0" x2="1" y2="1">',
          '<stop offset="0%" stop-color="' + p.primary + '"/><stop offset="100%" stop-color="' + p.accent + '"/>',
        '</linearGradient></defs>',
        '<rect x="14" y="46" width="100" height="100" fill="url(#bgcv-' + (opts.brand || 'd') + ')" rx="6"/>',
        '<rect x="122" y="50" width="180" height="11" fill="#222" rx="2"/>',
        '<rect x="122" y="66" width="130" height="7" fill="#888" rx="2"/>',
        '<rect x="122" y="80" width="160" height="6" fill="#aaa" rx="2"/>',
        '<rect x="122" y="94" width="60" height="22" fill="#fff" stroke="' + p.primary + '" stroke-width="1.2" rx="4"/>',
        '<text x="128" y="109" fill="' + p.primary + '" font-family="system-ui,sans-serif" font-size="11" font-weight="700">7:00 AM</text>',
        '<rect x="14" y="160" width="292" height="30" fill="' + p.primary + '" rx="6"/>',
        '<text x="118" y="180" fill="#fff" font-family="system-ui,sans-serif" font-size="12" font-weight="700">CONFIRMAR</text>',
      '</svg>',
    ].join('');
  }
  if (type === 'form') {
    return [
      '<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">',
        '<rect width="320" height="200" fill="#fff"/>',
        '<rect width="320" height="32" fill="' + p.primary + '"/>',
        '<text x="14" y="22" fill="#fff" font-family="system-ui,sans-serif" font-size="13" font-weight="700">' + p.logo + '</text>',
        '<text x="14" y="56" fill="#222" font-family="system-ui,sans-serif" font-size="12" font-weight="700">Datos de reserva</text>',
        '<rect x="14" y="68" width="292" height="26" fill="#fff" stroke="#ddd" stroke-width="1" rx="4"/>',
        '<text x="22" y="84" fill="#222" font-family="system-ui,sans-serif" font-size="11">Diego</text>',
        '<rect x="14" y="102" width="292" height="26" fill="#fff" stroke="' + p.primary + '" stroke-width="1.5" rx="4"/>',
        '<text x="22" y="118" fill="#222" font-family="system-ui,sans-serif" font-size="11">diego@mentex.app</text>',
        '<rect x="14" y="136" width="292" height="26" fill="#fff" stroke="#ddd" stroke-width="1" rx="4"/>',
        '<text x="22" y="152" fill="#888" font-family="system-ui,sans-serif" font-size="11">Notas (opcional)</text>',
        '<rect x="14" y="170" width="292" height="22" fill="' + p.primary + '" rx="4"/>',
        '<text x="148" y="185" fill="#fff" font-family="system-ui,sans-serif" font-size="10" font-weight="700">CONTINUAR</text>',
      '</svg>',
    ].join('');
  }
  if (type === 'confirm') {
    var bookingRef = (opts.bookingRef || 'XX-0000');
    return [
      '<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">',
        '<rect width="320" height="200" fill="#fff"/>',
        '<rect width="320" height="32" fill="' + p.primary + '"/>',
        '<text x="14" y="22" fill="#fff" font-family="system-ui,sans-serif" font-size="13" font-weight="700">' + p.logo + '</text>',
        // Checkmark
        '<circle cx="160" cy="80" r="28" fill="#10b981"/>',
        '<polyline points="148,80 158,90 174,72" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
        '<text x="160" y="126" text-anchor="middle" fill="#222" font-family="system-ui,sans-serif" font-size="14" font-weight="700">¡Confirmada!</text>',
        '<rect x="34" y="138" width="252" height="44" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="6"/>',
        '<text x="44" y="155" fill="#888" font-family="system-ui,sans-serif" font-size="9" font-weight="700">CÓDIGO</text>',
        '<text x="44" y="172" fill="' + p.primary + '" font-family="system-ui,sans-serif" font-size="14" font-weight="700">' + bookingRef + '</text>',
        '<rect x="200" y="148" width="76" height="26" fill="#fff" stroke="' + p.primary + '" stroke-width="1" rx="4"/>',
        '<text x="210" y="165" fill="' + p.primary + '" font-family="system-ui,sans-serif" font-size="10" font-weight="700">Lun · 7:00 AM</text>',
      '</svg>',
    ].join('');
  }
  return '<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="200" fill="#222"/></svg>';
};


// ─ Plan generator — mapea prompt → flow config ───────────────────────────
window.__mtxBrowseActPlanFlow = function(prompt) {
  var p = String(prompt || '').toLowerCase();

  var brand = 'default';
  var site = 'sitio.com';
  var intent = 'Realizar la acción que pediste';
  var steps;
  var bookingRef = 'MTX-' + (1000 + Math.floor(Math.random() * 9000));

  if (/yoga|gym|bodytech|clase|spinning|crossfit|entren/i.test(p)) {
    brand = 'bodytech';
    site = 'bodytech.com.co';
    intent = /yoga/i.test(p) ? 'Reservar clase de yoga' : 'Reservar clase de gym';
    bookingRef = 'BT-' + (1000 + Math.floor(Math.random() * 9000));
    var classLabel = /yoga/i.test(p) ? 'yoga' : /spinning/i.test(p) ? 'spinning' : /crossfit/i.test(p) ? 'crossfit' : 'entrenamiento';
    steps = [
      { label: 'Abriendo bodytech.com.co', screenshot: 'homepage', durationMs: 1500 },
      { label: 'Buscando clases de ' + classLabel, screenshot: 'search', screenshotOpts: { query: classLabel + ' lunes' }, durationMs: 2100 },
      { label: 'Encontré horario · 7:00 AM', screenshot: 'detail', durationMs: 1800 },
      { label: 'Confirmando con tus datos', screenshot: 'form', durationMs: 1700 },
      { label: 'Reserva confirmada', screenshot: 'confirm', screenshotOpts: { bookingRef: bookingRef }, durationMs: 1400, final: true },
    ];
  } else if (/cita|m[eé]dic|doctor|dentista|psic[oó]log/i.test(p)) {
    brand = 'cal';
    site = 'cal.com';
    intent = 'Agendar cita médica';
    bookingRef = 'CAL-' + (1000 + Math.floor(Math.random() * 9000));
    steps = [
      { label: 'Abriendo cal.com', screenshot: 'homepage', durationMs: 1300 },
      { label: 'Buscando profesionales disponibles', screenshot: 'search', screenshotOpts: { query: 'esta semana' }, durationMs: 2000 },
      { label: 'Encontré horario que te calza', screenshot: 'detail', durationMs: 1700 },
      { label: 'Completando tus datos', screenshot: 'form', durationMs: 1600 },
      { label: 'Cita agendada', screenshot: 'confirm', screenshotOpts: { bookingRef: bookingRef }, durationMs: 1300, final: true },
    ];
  } else if (/libro|amazon|comprar|book/i.test(p)) {
    brand = 'amazon';
    site = 'amazon.com';
    intent = 'Comprar libro';
    bookingRef = 'AMZ-' + Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
    steps = [
      { label: 'Abriendo amazon.com', screenshot: 'homepage', durationMs: 1400 },
      { label: 'Buscando el libro', screenshot: 'search', screenshotOpts: { query: 'título buscado' }, durationMs: 2000 },
      { label: 'Encontré la edición que quieres', screenshot: 'detail', durationMs: 1700 },
      { label: 'Confirmando envío', screenshot: 'form', durationMs: 1500 },
      { label: 'Pedido en camino', screenshot: 'confirm', screenshotOpts: { bookingRef: bookingRef }, durationMs: 1400, final: true },
    ];
  } else if (/hotel|airbnb|booking|hospedaj/i.test(p)) {
    brand = 'booking';
    site = 'booking.com';
    intent = 'Reservar hospedaje';
    bookingRef = 'BK-' + (10000 + Math.floor(Math.random() * 89999));
    steps = [
      { label: 'Abriendo booking.com', screenshot: 'homepage', durationMs: 1400 },
      { label: 'Filtrando por preferencias', screenshot: 'search', screenshotOpts: { query: 'opciones cercanas' }, durationMs: 2200 },
      { label: 'Encontré opción que te calza', screenshot: 'detail', durationMs: 1700 },
      { label: 'Llenando datos del viajero', screenshot: 'form', durationMs: 1700 },
      { label: 'Reserva confirmada', screenshot: 'confirm', screenshotOpts: { bookingRef: bookingRef }, durationMs: 1400, final: true },
    ];
  } else {
    steps = [
      { label: 'Abriendo el sitio', screenshot: 'homepage', durationMs: 1500 },
      { label: 'Buscando opciones', screenshot: 'search', durationMs: 2000 },
      { label: 'Encontré la opción correcta', screenshot: 'detail', durationMs: 1700 },
      { label: 'Llenando datos', screenshot: 'form', durationMs: 1500 },
      { label: 'Listo', screenshot: 'confirm', screenshotOpts: { bookingRef: bookingRef }, durationMs: 1400, final: true },
    ];
  }

  return {
    site: site,
    brand: brand,
    intent: intent,
    steps: steps,
    bookingRef: bookingRef,
    prompt: prompt,
  };
};


// ─ Runner — ejecuta un flow LIVE actualizando el browse_progress_card ─────
// Reemplaza al overlay viejo. El card vive en el msg del coach (artifacts[0])
// con state='live' y stepIdx incrementándose. Al terminar, transiciona a
// state='done'.
//
// Cuando llegue backend: la lógica de timing se reemplaza por eventos del
// stream del Imperial Gateway (server-sent events o WebSocket). El card NO
// cambia.
(function() {
  if (typeof window === 'undefined' || window.__mtxBrowseActRunner) return;

  // Registry de runs activos por msgId. Permite cancel desde el botón Detener
  // del card, o desde unmount/navigation.
  var _activeRuns = {};

  function _start(opts) {
    var convId = opts.convId;
    var msgId = opts.msgId;
    var plan = opts.plan;
    var onComplete = opts.onComplete;
    var onCancel = opts.onCancel;
    var store = window.__mtxIAChat;
    if (!store || !plan || !convId || !msgId) return null;

    // Cancela run previo si existe (no double-start)
    if (_activeRuns[msgId]) _cancel(msgId);

    var aborted = false;
    var stepTimer = null;

    function abort(reason) {
      if (aborted) return;
      aborted = true;
      if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
      delete _activeRuns[msgId];
      // Mark card as cancelled
      var current = store.get(convId);
      var m = current && current.messages.find(function(x) { return x.id === msgId; });
      if (m && m.artifacts && m.artifacts[0]) {
        var card = m.artifacts[0];
        var stepsCopy = (card.steps || []).map(function(s, i) {
          if (s.status === 'active') return Object.assign({}, s, { status: 'cancelled' });
          return s;
        });
        var updated = Object.assign({}, card, {
          state: 'cancelled',
          steps: stepsCopy,
        });
        store.updateMessage(convId, msgId, { artifacts: [updated] });
      }
      if (typeof onCancel === 'function') {
        try { onCancel(plan); } catch (e) {}
      }
    }

    _activeRuns[msgId] = { abort: abort, plan: plan, startedAt: Date.now() };

    // Inyecta el card LIVE inicial al msg (steps todos en pending excepto el 0
    // que arranca active).
    var liveSteps = plan.steps.map(function(s, i) {
      return {
        label: s.label,
        status: i === 0 ? 'active' : 'pending',
        screenshot: null,        // se llena cuando ese step termina (active→done)
        screenshotType: s.screenshot,
        screenshotOpts: s.screenshotOpts || null,
      };
    });
    var initialCard = {
      kind: 'browse_progress_card',
      state: 'live',
      site: plan.site,
      brand: plan.brand,
      intent: plan.intent,
      steps: liveSteps,
      currentStepIdx: 0,
      bookingRef: plan.bookingRef,
    };
    store.updateMessage(convId, msgId, { artifacts: [initialCard] });

    // Run steps secuencialmente
    var idx = 0;
    function runStep() {
      if (aborted) return;
      var step = plan.steps[idx];
      if (!step) return;
      stepTimer = setTimeout(function() {
        if (aborted) return;
        // Mark current step as done + attach screenshot
        var m = store.get(convId);
        var msg = m && m.messages.find(function(x) { return x.id === msgId; });
        if (!msg || !msg.artifacts || !msg.artifacts[0]) return;
        var card = msg.artifacts[0];
        var stepsCopy = card.steps.slice();
        // Genera screenshot SVG ahora que el step "terminó"
        var screenshot = window.__mtxBrowseActScreenshot ? window.__mtxBrowseActScreenshot(Object.assign({
          type: step.screenshot,
          site: plan.site,
          brand: plan.brand,
        }, step.screenshotOpts || {})) : null;
        stepsCopy[idx] = Object.assign({}, stepsCopy[idx], {
          status: 'done',
          screenshot: screenshot,
        });
        // Activar siguiente step si existe
        var nextIdx = idx + 1;
        if (nextIdx < stepsCopy.length) {
          stepsCopy[nextIdx] = Object.assign({}, stepsCopy[nextIdx], { status: 'active' });
        }
        var newCard = Object.assign({}, card, {
          steps: stepsCopy,
          currentStepIdx: nextIdx,
        });
        // Si fue el último → state='done'
        if (nextIdx >= plan.steps.length) {
          newCard.state = 'done';
          store.updateMessage(convId, msgId, { artifacts: [newCard] });
          delete _activeRuns[msgId];
          if (typeof onComplete === 'function') {
            try { onComplete(plan); } catch (e) {}
          }
          return;
        }
        store.updateMessage(convId, msgId, { artifacts: [newCard] });
        idx = nextIdx;
        runStep();
      }, step.durationMs);
    }
    runStep();

    return { cancel: function() { abort('user-cancel'); } };
  }

  function _cancel(msgId) {
    var run = _activeRuns[msgId];
    if (run && typeof run.abort === 'function') {
      try { run.abort('user-cancel'); } catch (_) {}
    }
  }

  function _isActive(msgId) {
    return !!_activeRuns[msgId];
  }

  window.__mtxBrowseActRunner = {
    start: _start,
    cancel: _cancel,
    isActive: _isActive,
  };
})();
