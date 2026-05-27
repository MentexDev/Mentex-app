// screens/coach-wearable-store.jsx — Sprint A.6 · B9 · wearable_read store
// ─────────────────────────────────────────────────────────────────────────────
// Store global de datos de wearable (Apple Health mock). Cuando llegue Brandon
// con backend real, este archivo se reemplaza por un cliente HTTP a
// gateway.empire-os.co/v1/wearable/apple-health/fetch — el shape del store
// NO cambia, solo el implementador.
//
// Lo que B9 entrega:
//   • 30 días de data realista (sleep, hrv, steps, mindful_minutes,
//     active_calories) con curva natural (ruido + tendencia + outliers)
//   • Persistencia cross-session a localStorage `__mtxWearable:v1`
//   • API pública __mtxWearableStore:
//       .isConnected()         — bool (cruzado con __mtxIAConfig.integrations.appleHealth)
//       .getLastNight()        — última noche completa
//       .getWeek()             — array de 7 noches
//       .getMonth()            — array de 30 noches
//       .getSummary()          — agregados (avg, best, worst, trend)
//       .resync()              — simula nuevo fetch del wearable (regen suave)
//       .seed(n)               — regen completo con seed (devTools/QA)
//
// El simulador del coach lee del store para construir el insight_card real.
// Si user NO está connected → el coach muestra connect_card invitándolo a
// vincular antes de poder hacer wearable-based coaching.
// ─────────────────────────────────────────────────────────────────────────────


(function() {
  if (typeof window === 'undefined' || window.__mtxWearableStore) return;

  var _PERSIST_KEY = '__mtxWearable:v1';
  var _DAYS = 30;
  var _persistTimer = null;

  // ── State ─────────────────────────────────────────────────────────────────
  // _state.days es array NEWEST FIRST (idx 0 = anoche, idx 29 = hace 30 días)
  var _state = {
    v: 1,
    days: [],          // [{ date: 'YYYY-MM-DD', sleepHours, sleepScore, hrv, steps, mindfulMin, activeKcal, deepSleepMin, remSleepMin }]
    lastFetchAt: null, // timestamp del último resync
    seed: 1,           // deterministic seed
  };

  // ── Generador determinístico ──────────────────────────────────────────────
  // No usamos Math.random() — usamos un LCG simple por seed para que cada user
  // tenga datos consistentes entre refreshes. Cuando se hace .resync() el seed
  // cambia ligeramente (lastFetchAt mod algo) y se regenera mismo shape.
  function _lcg(seed) {
    // Linear congruential generator — período 2^31
    var s = seed | 0;
    return function next() {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  // Construye un día realista basado en seed + dayIndex (0=anoche, 29=hace 30d)
  // Patrón: noches buenas alrededor de 7-8h, peores en domingo-lunes (jet lag de
  // weekend), HRV correlaciona con sleep, steps muy variables.
  function _buildDay(seed, dayIndex) {
    var rnd = _lcg(seed * 1000 + dayIndex * 17);
    var date = new Date(Date.now() - dayIndex * 86400000);
    var dayOfWeek = date.getDay(); // 0=domingo, 6=sábado

    // Sleep: base 7h, modulado por dayOfWeek + ruido
    var sleepBase = 7.0;
    if (dayOfWeek === 0 || dayOfWeek === 1) sleepBase = 6.2; // domingo-lunes peor
    if (dayOfWeek === 5 || dayOfWeek === 6) sleepBase = 7.8; // viernes-sábado mejor
    var sleepHours = Math.max(3.5, Math.min(10.5, sleepBase + (rnd() - 0.5) * 1.8));

    // Sleep score: derivado de sleepHours con ajuste random (refleja calidad además de cantidad)
    var scoreBase = Math.min(95, 50 + sleepHours * 6);
    var sleepScore = Math.max(40, Math.min(98, Math.round(scoreBase + (rnd() - 0.5) * 15)));

    // HRV: correlaciona con sleep score (40-90ms rango healthy adulto)
    var hrvBase = 40 + (sleepScore - 50) * 0.6;
    var hrv = Math.max(28, Math.min(95, Math.round(hrvBase + (rnd() - 0.5) * 14)));

    // Steps: muy variable 3k-15k, weekend tiende más alto
    var stepsBase = (dayOfWeek === 0 || dayOfWeek === 6) ? 8500 : 6800;
    var steps = Math.max(800, Math.round(stepsBase + (rnd() - 0.5) * 6000));

    // Mindful min: 0-25, suele ser 0 muchos días
    var mindfulMin = rnd() < 0.55 ? 0 : Math.round(rnd() * 25);

    // Active kcal: correlaciona con steps
    var activeKcal = Math.round(steps / 22 + rnd() * 80);

    // Deep + REM (fases del sueño)
    var deepSleepMin = Math.round(sleepHours * 60 * (0.13 + rnd() * 0.08));
    var remSleepMin = Math.round(sleepHours * 60 * (0.18 + rnd() * 0.10));

    return {
      date: date.toISOString().slice(0, 10),
      dayOfWeek: dayOfWeek,
      sleepHours: Math.round(sleepHours * 10) / 10,
      sleepScore: sleepScore,
      hrv: hrv,
      steps: steps,
      mindfulMin: mindfulMin,
      activeKcal: activeKcal,
      deepSleepMin: deepSleepMin,
      remSleepMin: remSleepMin,
    };
  }

  function _regenerate(seed) {
    _state.seed = seed;
    _state.days = [];
    for (var i = 0; i < _DAYS; i++) {
      _state.days.push(_buildDay(seed, i));
    }
    _state.lastFetchAt = Date.now();
  }

  // ── Persistencia ──────────────────────────────────────────────────────────
  function _persistNow() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(_PERSIST_KEY, JSON.stringify(_state));
    } catch (_) { /* quota — degradación silenciosa */ }
  }

  function _persistDebounced() {
    if (_persistTimer) clearTimeout(_persistTimer);
    _persistTimer = setTimeout(_persistNow, 250);
  }

  function _hydrate() {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      var raw = window.localStorage.getItem(_PERSIST_KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1) return false;
      if (Array.isArray(parsed.days) && parsed.days.length === _DAYS) {
        _state = parsed;
        return true;
      }
    } catch (_) {}
    return false;
  }

  // Hydrate o generar inicial
  if (!_hydrate()) {
    _regenerate(Date.now() & 0xffff);
    _persistNow();
  }

  function _emit() {
    _persistDebounced();
    window.dispatchEvent(new CustomEvent('mtx:wearable-changed', {
      detail: { lastFetchAt: _state.lastFetchAt },
    }));
  }

  // ── Connection check ──────────────────────────────────────────────────────
  // Cruzado con __mtxIAConfig — la conexión vive ahí (lo maneja
  // ia-integrations.jsx). Wearable store NO maneja conexión; solo data.
  function _isConnected() {
    if (typeof window === 'undefined' || !window.__mtxIAConfig) return false;
    var snap = window.__mtxIAConfig.snapshot();
    var integ = snap && snap.integrations && snap.integrations.appleHealth;
    return !!(integ && integ.connected);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.__mtxWearableStore = {
    isConnected: _isConnected,

    // Última noche (idx 0). Devuelve null si NO connected — el caller debe
    // disparar connect_card en lugar de insight.
    getLastNight: function() {
      if (!_isConnected()) return null;
      return Object.assign({}, _state.days[0]);
    },

    // Últimos 7 días (idx 0..6). Idx 0 = anoche.
    getWeek: function() {
      if (!_isConnected()) return [];
      return _state.days.slice(0, 7).map(function(d) { return Object.assign({}, d); });
    },

    getMonth: function() {
      if (!_isConnected()) return [];
      return _state.days.slice().map(function(d) { return Object.assign({}, d); });
    },

    // Agregados del último período (default 7d). Devuelve la estructura
    // exacta que el insight_card consume.
    getSummary: function(days) {
      if (!_isConnected()) return null;
      var n = Math.min(days || 7, _state.days.length);
      var slice = _state.days.slice(0, n);
      var sleepArr = slice.map(function(d) { return d.sleepHours; });
      var hrvArr = slice.map(function(d) { return d.hrv; });
      var stepsArr = slice.map(function(d) { return d.steps; });

      function _avg(arr) {
        if (!arr.length) return 0;
        return arr.reduce(function(a, b) { return a + b; }, 0) / arr.length;
      }

      var avgSleep = _avg(sleepArr);
      var bestIdx = sleepArr.indexOf(Math.max.apply(null, sleepArr));
      var worstIdx = sleepArr.indexOf(Math.min.apply(null, sleepArr));

      // Trend: compara primera mitad vs segunda mitad
      var half = Math.floor(n / 2);
      var recentHalf = _avg(sleepArr.slice(0, half));
      var olderHalf = _avg(sleepArr.slice(half));
      var trendDelta = recentHalf - olderHalf;
      var trendDir = Math.abs(trendDelta) < 0.15 ? 'flat' : (trendDelta > 0 ? 'up' : 'down');
      var trendValue = (trendDelta >= 0 ? '+' : '') + Math.round(trendDelta * 60) + ' min';

      // Sparkline normalizada [0..1] sobre la semana
      var minS = Math.min.apply(null, sleepArr);
      var maxS = Math.max.apply(null, sleepArr);
      var range = (maxS - minS) || 1;
      var sparkline = sleepArr.slice().reverse().map(function(v) {
        return Math.round(((v - minS) / range) * 100) / 100;
      });

      var dayLabel = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      // Formato canónico Mentex para horas: "Xh YYmin". Consistente con la UI
      // de session-flow / agenda / breaks. Sin el "min" suena truncado.
      var formatHM = function(h) {
        var hh = Math.floor(h);
        var mm = Math.round((h - hh) * 60);
        // Edge case: si h=7.99 redondea a 60min → bump hour
        if (mm === 60) { hh += 1; mm = 0; }
        return hh + 'h ' + (mm < 10 ? '0' + mm : mm) + 'min';
      };

      return {
        avgSleepHours: Math.round(avgSleep * 10) / 10,
        avgSleepLabel: formatHM(avgSleep),
        avgHrv: Math.round(_avg(hrvArr)),
        avgSteps: Math.round(_avg(stepsArr)),
        bestNight: {
          dayLabel: dayLabel[slice[bestIdx].dayOfWeek],
          value: formatHM(slice[bestIdx].sleepHours),
        },
        worstNight: {
          dayLabel: dayLabel[slice[worstIdx].dayOfWeek],
          value: formatHM(slice[worstIdx].sleepHours),
        },
        qualityAvgPct: Math.round(_avg(slice.map(function(d) { return d.sleepScore; }))),
        trend: { direction: trendDir, value: trendValue, delta: trendDelta },
        sparkline: sparkline,
        days: n,
      };
    },

    // Resync — simula un fetch nuevo del wearable. Cambia el seed levemente
    // para que la data del último día varíe (refleja que llegó info nueva).
    resync: function() {
      if (!_isConnected()) return false;
      // Avanza solo 1 día: shift left + nuevo día al inicio
      var newDay = _buildDay(_state.seed + 1, 0);
      _state.days = [newDay].concat(_state.days.slice(0, _DAYS - 1));
      _state.lastFetchAt = Date.now();
      _emit();
      return true;
    },

    // Regen completo — devTools/QA. Útil para escenarios de demo.
    seed: function(n) {
      _regenerate(n);
      _emit();
      return _state.days.slice();
    },

    // Diagnostics
    diagnostics: function() {
      return {
        connected: _isConnected(),
        days: _state.days.length,
        lastFetchAt: _state.lastFetchAt,
        lastFetchRelative: _state.lastFetchAt
          ? Math.round((Date.now() - _state.lastFetchAt) / 60000) + ' min'
          : null,
        seed: _state.seed,
      };
    },
  };

  // Auto-resync al conectar la integración (event-driven)
  if (typeof window !== 'undefined') {
    window.addEventListener('mtx:ia-config-changed', function() {
      if (_isConnected() && (!_state.lastFetchAt || (Date.now() - _state.lastFetchAt > 60000))) {
        _emit(); // re-emit que la conexión está fresca
      }
    });
  }
})();
