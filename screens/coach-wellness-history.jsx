// screens/coach-wellness-history.jsx — Sprint A.9.5 · historial wellness persistente
// ─────────────────────────────────────────────────────────────────────────────
//
// Store que persiste cada sesión completada de wellness en localStorage.
// Foundation del "moat real" — convierte la pausa en hábito medible.
//
// Datos persistidos por sesión:
//   { id, type, completedAt, totalMs, cyclesDone, label }
//
// Capacidades públicas:
//   • record(session)                 — guarda una sesión completada
//   • getAll()                        — lista cruda (DESC por fecha)
//   • getStats()                      — stats agregados (total, streak, este mes, etc.)
//   • getStatsByType(type)            — stats filtrados por tipo de ejercicio
//   • getStreakDays()                 — días consecutivos haciendo wellness
//   • getCountThisWeek()              — pausas en últimos 7 días
//   • getFavorite()                   — tipo más usado
//   • getMessage(type)                — mensaje contextual personalizado al user
//
// Drop-in ready Brandon: cuando llegue backend, el server sync mantiene
// histórico cross-device. localStorage es el fallback offline.
//
// localStorage key: 'mtx-wellness-history:v1'
// Max retención: 365 días (auto-cleanup al cargar)
//
// Auto-listener: escucha mtx:wellness-completed y persiste automáticamente.
// El artifact no necesita llamar record() manualmente.
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxWellnessHistory) return;

  var STORAGE_KEY = 'mtx-wellness-history:v1';
  var MAX_RETENTION_DAYS = 365;
  var MAX_ENTRIES = 500;  // safety cap (evita explosión)

  // ──────────────────────────────────────────────────────────────────────────
  // Storage helpers — defensivos contra quota / JSON parse fail
  // ──────────────────────────────────────────────────────────────────────────
  function _read() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[wellness-history] read failed:', e.message);
      return [];
    }
  }

  function _write(entries) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch (e) {
      // QuotaExceededError — intentar limpiar y reintentar
      if (e && e.name === 'QuotaExceededError') {
        var trimmed = entries.slice(0, Math.floor(MAX_ENTRIES / 2));
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
          return true;
        } catch (e2) {
          console.warn('[wellness-history] quota exceeded · giving up');
          return false;
        }
      }
      console.warn('[wellness-history] write failed:', e.message);
      return false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Auto-cleanup — quitar entries muy viejas + cap max
  // ──────────────────────────────────────────────────────────────────────────
  function _cleanup(entries) {
    var maxAge = MAX_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    var now = Date.now();
    var fresh = entries.filter(function(e) {
      return e && e.completedAt && (now - e.completedAt) < maxAge;
    });
    if (fresh.length > MAX_ENTRIES) {
      // Keep las más recientes
      fresh.sort(function(a, b) { return b.completedAt - a.completedAt; });
      fresh = fresh.slice(0, MAX_ENTRIES);
    }
    return fresh;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API — record
  // ──────────────────────────────────────────────────────────────────────────
  function record(session) {
    if (!session || !session.type) return null;
    var entry = {
      id: 'wh-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e4),
      type: session.type,
      label: session.label || session.type,
      completedAt: session.completedAt || Date.now(),
      totalMs: session.totalMs || 0,
      cyclesDone: session.cyclesDone || 0,
    };
    var entries = _read();
    entries.unshift(entry);  // newest first
    entries = _cleanup(entries);
    _write(entries);
    // Dispatch para que UI suscritas (si las hay) se actualicen
    try {
      window.dispatchEvent(new CustomEvent('mtx:wellness-history-changed', {
        detail: { entry: entry, total: entries.length },
      }));
    } catch (e) { /* no-op */ }
    return entry;
  }

  function getAll() {
    return _read();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Stats agregados
  // ──────────────────────────────────────────────────────────────────────────
  // Audit IMP-2: usar toLocaleDateString para safety contra DST.
  // Compara la fecha local del user, no UTC ni getMonth() que pueden diferir
  // por 1h en cambios de horario.
  function _isSameDay(ts1, ts2) {
    var d1 = new Date(ts1), d2 = new Date(ts2);
    return d1.toDateString() === d2.toDateString();
  }
  function _dayKey(ts) {
    return new Date(ts).toDateString();  // formato consistente cross-DST
  }

  function _msToHuman(ms) {
    var sec = Math.round(ms / 1000);
    var min = Math.floor(sec / 60);
    var s = sec % 60;
    if (min === 0) return s + 's';
    if (s === 0) return min + ' min';
    return min + ' min ' + s + 's';
  }

  // Streak days — días consecutivos CON al menos 1 sesión.
  // Si NO se hizo nada hoy pero ayer sí, el streak está "vivo hasta ayer".
  // Si han pasado 2+ días sin sesión, streak = 0.
  function getStreakDays() {
    var entries = _read();
    if (entries.length === 0) return 0;
    // Set de días con sesiones (key: toDateString para DST safety)
    var daysWithSession = {};
    entries.forEach(function(e) {
      daysWithSession[_dayKey(e.completedAt)] = true;
    });
    // Audit IMP-3: streak desde HOY hacia atrás con boundary correcto.
    // Regla: si hoy SÍ hay sesión, contar; si NO hay, empezar desde ayer.
    // Si ayer tampoco hay y anteayer sí → streak = 0 (no continúa).
    var streak = 0;
    var cursor = new Date();
    if (!daysWithSession[_dayKey(cursor.getTime())]) {
      cursor.setDate(cursor.getDate() - 1);
    }
    for (var i = 0; i < MAX_RETENTION_DAYS; i++) {
      if (daysWithSession[_dayKey(cursor.getTime())]) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;  // primer día sin sesión rompe streak
      }
    }
    return streak;
  }

  function getCountThisWeek() {
    var entries = _read();
    var cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return entries.filter(function(e) { return e.completedAt >= cutoff; }).length;
  }

  function getCountThisMonth() {
    var entries = _read();
    var now = new Date();
    return entries.filter(function(e) {
      var d = new Date(e.completedAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }

  function getCountToday() {
    var entries = _read();
    var now = Date.now();
    return entries.filter(function(e) { return _isSameDay(e.completedAt, now); }).length;
  }

  function getTotalMinutes() {
    var entries = _read();
    var totalMs = entries.reduce(function(sum, e) { return sum + (e.totalMs || 0); }, 0);
    return Math.round(totalMs / 60000);
  }

  function getFavorite() {
    var entries = _read();
    if (entries.length === 0) return null;
    var counts = {};
    entries.forEach(function(e) {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });
    var best = null;
    var bestCount = 0;
    Object.keys(counts).forEach(function(type) {
      if (counts[type] > bestCount) { best = type; bestCount = counts[type]; }
    });
    return best ? { type: best, count: bestCount } : null;
  }

  function getStatsByType(type) {
    var entries = _read().filter(function(e) { return e.type === type; });
    return {
      type: type,
      count: entries.length,
      totalMs: entries.reduce(function(s, e) { return s + (e.totalMs || 0); }, 0),
      lastDoneAt: entries[0] ? entries[0].completedAt : null,
    };
  }

  function getStats() {
    var entries = _read();
    return {
      total: entries.length,
      today: getCountToday(),
      week: getCountThisWeek(),
      month: getCountThisMonth(),
      streakDays: getStreakDays(),
      totalMinutes: getTotalMinutes(),
      favorite: getFavorite(),
      lastSession: entries[0] || null,
      hasHistory: entries.length > 0,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Message contextual — frase humana para mostrar al user en el artifact
  // ──────────────────────────────────────────────────────────────────────────
  // Devuelve { primary, secondary } con frases personalizadas según el patrón
  // de uso. Si es la 1ra vez con ese tipo, mensaje de bienvenida. Si ya viene
  // haciéndolo, mensaje de continuidad ("Tu Xva vez").
  function getMessage(type) {
    var stats = getStats();
    var typeStats = getStatsByType(type);
    // First-ever wellness ever
    if (stats.total === 0) {
      return {
        primary: 'Tu primera pausa',
        secondary: 'Bienvenido a tu ritual',
      };
    }
    // First time con este TYPE específico
    if (typeStats.count === 0) {
      return {
        primary: 'Probando algo nuevo',
        secondary: 'Llevas ' + stats.total + ' pausa' + (stats.total === 1 ? '' : 's') + ' en total',
      };
    }
    // Repeated user
    var ordinalEs = function(n) {
      var map = { 1: '1ra', 2: '2da', 3: '3ra' };
      return map[n] || (n + 'ta');
    };
    var primary = 'Tu ' + ordinalEs(typeStats.count + 1) + ' vez con esto';
    // Secondary preferencia:
    //   1. streak activo (priority) → "🔥 X días seguidos"
    //   2. semana activa → "X pausas esta semana"
    //   3. total → "X pausas totales"
    var secondary;
    if (stats.streakDays >= 2) {
      secondary = '🔥 ' + stats.streakDays + ' días seguidos';
    } else if (stats.week >= 3) {
      secondary = stats.week + ' pausas esta semana';
    } else if (stats.today >= 2) {
      secondary = stats.today + ' veces hoy · vas bien';
    } else {
      secondary = stats.total + ' pausas totales · ' + stats.totalMinutes + ' min';
    }
    return { primary: primary, secondary: secondary };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Mensaje al COMPLETAR — frase de celebración contextual
  // ──────────────────────────────────────────────────────────────────────────
  function getCompletionMessage(type) {
    var stats = getStats();
    // Stats DESPUÉS de recordar (asumimos llamada post-record)
    var typeStats = getStatsByType(type);
    // 1ra vez ever
    if (stats.total === 1) {
      return {
        title: 'Bien hecho',
        line: 'Acabás de instalar el primer ladrillo · cada pausa cuenta',
      };
    }
    // Streak hito
    if (stats.streakDays === 3) return { title: '3 días seguidos · enseguida es hábito', line: 'Tu cerebro empieza a esperarlo' };
    if (stats.streakDays === 7) return { title: 'Una semana entera', line: '🔥 Sostenido. Estás construyendo algo real.' };
    if (stats.streakDays === 14) return { title: 'Dos semanas de pausa diaria', line: 'Pocos llegan acá. Vos sí.' };
    if (stats.streakDays === 30) return { title: 'Treinta días', line: '🏆 Estás en otra liga' };
    // Hito de total
    if (stats.total === 10) return { title: 'Tu 10ma pausa', line: 'Ya no es casualidad' };
    if (stats.total === 50) return { title: '50 pausas', line: 'Has invertido ' + stats.totalMinutes + ' min en vos' };
    if (stats.total === 100) return { title: '100 pausas', line: 'Eres parte del 5% que sostiene rituales así' };
    // Daily message
    if (stats.today >= 3) return { title: 'Bien hecho', line: stats.today + ' pausas hoy · le estás dando ritmo' };
    if (stats.streakDays >= 2) return { title: 'Bien hecho', line: '🔥 ' + stats.streakDays + ' días seguidos' };
    // Generic
    return {
      title: 'Bien hecho',
      line: typeStats.count === 1
        ? '1ra vez con esto · te quedaste'
        : 'Tu ' + typeStats.count + 'va vez con esto',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Auto-record listener — escucha mtx:wellness-completed
  // ──────────────────────────────────────────────────────────────────────────
  window.addEventListener('mtx:wellness-completed', function(e) {
    if (!e || !e.detail) return;
    // Audit GAP-6: capturar fallo de record (localStorage quota, etc.)
    // y emitir evento observable para que la UI lo maneje si lo necesita.
    var result = record({
      type: e.detail.type,
      label: e.detail.label,
      cyclesDone: e.detail.cyclesDone,
      totalMs: e.detail.totalMs,
      completedAt: Date.now(),
    });
    if (!result) {
      console.warn('[wellness-history] record failed for type=' + e.detail.type);
      try {
        window.dispatchEvent(new CustomEvent('mtx:wellness-history-failed', {
          detail: { type: e.detail.type, reason: 'record-returned-null' },
        }));
      } catch (err) { /* no-op */ }
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Reset helpers (dev/testing)
  // ──────────────────────────────────────────────────────────────────────────
  function _reset() {
    try { window.localStorage.removeItem(STORAGE_KEY); }
    catch (e) { /* no-op */ }
    try {
      window.dispatchEvent(new CustomEvent('mtx:wellness-history-changed', {
        detail: { reset: true, total: 0 },
      }));
    } catch (e) { /* no-op */ }
  }

  // Para testing: forzar entries específicas (no expuesto en API normal)
  function _seedForTesting(entries) {
    _write(entries);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────
  window.__mtxWellnessHistory = {
    record: record,
    getAll: getAll,
    getStats: getStats,
    getStatsByType: getStatsByType,
    getStreakDays: getStreakDays,
    getCountToday: getCountToday,
    getCountThisWeek: getCountThisWeek,
    getCountThisMonth: getCountThisMonth,
    getTotalMinutes: getTotalMinutes,
    getFavorite: getFavorite,
    getMessage: getMessage,
    getCompletionMessage: getCompletionMessage,
    _reset: _reset,
    _seedForTesting: _seedForTesting,
  };
})();
