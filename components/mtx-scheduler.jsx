// ── mtx-scheduler.jsx — v2 ─────────────────────────────────────────────────
// Programador de horas para ítems del ritual, aprendizaje del día y reminders.
// v2: bridge bidireccional con __mtxIAAgenda — cada ítem schedulado aparece
//     en el timeline de la agenda; detecta conflictos de horario.
//
// FLUJOS:
//   Agente IA → __mtxScheduler.schedule(id, "HH:MM", label)
//               → sessionStorage + setTimeout + notifica UI
//               → upsertMentexEvent en __mtxIAAgenda (source:'mentex')
//               → checkConflict contra eventos existentes
//
//   Cancel    → __mtxScheduler.cancel(id)
//               → retira el evento de __mtxIAAgenda
//
//   Reminders → __mtxScheduler._processReminders()
//               → llamado al montar + en cada 'mtx:ia-agenda-changed'
//
// NOTIFICACIONES:
//   • Notification API (browser) — pide permiso al montar SchedulerInit
//   • Fallback: in-app toast vía window.__mtxToast
//
// PERSISTENCIA: sessionStorage "__mtx_schedule_v1" — efímero por pestaña

(function () {
  if (typeof window !== 'undefined' && window.__mtxScheduler) return;

  var SK = '__mtx_schedule_v1';
  var _items = {}; // { [id]: { time, label, tid } }

  try {
    var raw = sessionStorage.getItem(SK);
    if (raw) _items = JSON.parse(raw);
  } catch (_) {}

  function _save() {
    try {
      var toSave = {};
      Object.keys(_items).forEach(function (id) {
        toSave[id] = { time: _items[id].time, label: _items[id].label };
      });
      sessionStorage.setItem(SK, JSON.stringify(toSave));
    } catch (_) {}
  }

  function _isValidHHMM(time) {
    return typeof time === 'string' && /^\d{1,2}:\d{2}$/.test(time);
  }

  function _fireNotification(label, time) {
    var body = time + ' · ' + label;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('Mentex', { body: body, icon: '/favicon.ico' }); } catch (_) {}
    }
    if (window.__mtxToast) window.__mtxToast.show('⏰ ' + body, { duration: 7000 });
  }

  function _scheduleNotifAt(id, time, label) {
    if (!_isValidHHMM(time)) return null;
    var parts = time.split(':');
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var now = new Date();
    var target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return setTimeout(function () { _fireNotification(label, time); }, target - now);
  }

  function _clearTid(id) {
    if (_items[id] && _items[id].tid != null) {
      clearTimeout(_items[id].tid);
      _items[id].tid = null;
    }
  }

  function _notifyUI(id) {
    document.dispatchEvent(new CustomEvent('mtx:scheduled', { detail: { id: id } }));
  }

  // ── Bridge → __mtxIAAgenda ─────────────────────────────────────────────────
  // Inyectar el ítem schedulado como evento Mentex en el timeline de la agenda.
  // durationMin=30 como estimación; en Fase 5 vendrá de la metadata del ítem.
  function _bridgeUpsert(id, time, label) {
    if (!window.__mtxIAAgenda) return;
    window.__mtxIAAgenda.upsertMentexEvent({
      id: 'sched_' + id,
      title: label,
      time: time,
      type: 'focus',
      source: 'mentex',
      durationMin: 30,
    });
  }

  function _bridgeRemove(id) {
    if (!window.__mtxIAAgenda) return;
    window.__mtxIAAgenda.removeMentexEvent('sched_' + id);
  }

  // Restaurar bridge cuando la agenda no está lista aún (race condition al recargar)
  function _bridgeUpsertLazy(id, time, label) {
    if (window.__mtxIAAgenda) {
      _bridgeUpsert(id, time, label);
    } else {
      var attempts = 0;
      var poll = setInterval(function () {
        if (window.__mtxIAAgenda || ++attempts > 20) {
          clearInterval(poll);
          if (window.__mtxIAAgenda) _bridgeUpsert(id, time, label);
        }
      }, 150);
    }
  }

  window.__mtxScheduler = {
    schedule: function (id, time, label) {
      _clearTid(id);
      var tid = _scheduleNotifAt(id, time, label);
      _items[id] = { time: time, label: label, tid: tid };
      _save();
      _notifyUI(id);
      // Bridge: upsert en agenda, luego verificar conflictos
      _bridgeUpsert(id, time, label);
      if (window.__mtxIAAgenda) window.__mtxIAAgenda.checkConflict('sched_' + id, time, label);
    },

    cancel: function (id) {
      _clearTid(id);
      delete _items[id];
      _save();
      _notifyUI(id);
      _bridgeRemove(id);
    },

    getTime: function (id) {
      return (_items[id] && _items[id].time) || null;
    },

    list: function () {
      return Object.keys(_items).map(function (id) {
        return { id: id, time: _items[id].time, label: _items[id].label };
      });
    },

    clearAll: function () {
      Object.keys(_items).forEach(function (id) {
        _clearTid(id);
        _bridgeRemove(id);
      });
      _items = {};
      _save();
      document.dispatchEvent(new CustomEvent('mtx:scheduled', { detail: { id: null } }));
    },

    requestPermission: function () {
      if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
      Notification.requestPermission();
    },

    _restoreTimeouts: function () {
      Object.keys(_items).forEach(function (id) {
        var v = _items[id];
        if (v && _isValidHHMM(v.time)) {
          _items[id].tid = _scheduleNotifAt(id, v.time, v.label);
          _bridgeUpsertLazy(id, v.time, v.label);
        }
      });
    },

    _processReminders: function () {
      if (!window.__mtxIAAgenda) return;
      var reminders = window.__mtxIAAgenda.get().reminders || [];
      reminders.forEach(function (r) {
        if (r.completed || !_isValidHHMM(r.time)) return;
        if (_items[r.id]) return;
        var tid = _scheduleNotifAt(r.id, r.time, r.title);
        _items[r.id] = { time: r.time, label: r.title, tid: tid };
      });
      _save();
    },
  };

  window.__mtxScheduler._restoreTimeouts();
})();

// ── useScheduledTime(id) ──────────────────────────────────────────────────────
function useScheduledTime(id) {
  var state = React.useState(function () {
    return window.__mtxScheduler ? window.__mtxScheduler.getTime(id) : null;
  });
  var time = state[0]; var setTime = state[1];

  React.useEffect(function () {
    function handler(e) {
      if (e.detail && (e.detail.id === id || e.detail.id === null)) {
        setTime(window.__mtxScheduler ? window.__mtxScheduler.getTime(id) : null);
      }
    }
    document.addEventListener('mtx:scheduled', handler);
    return function () { document.removeEventListener('mtx:scheduled', handler); };
  }, [id]);

  return time;
}

// ── SchedulerInit ─────────────────────────────────────────────────────────────
function SchedulerInit() {
  React.useEffect(function () {
    if (!window.__mtxScheduler) return;
    window.__mtxScheduler.requestPermission();
    window.__mtxScheduler._processReminders();

    function onAgendaChange() {
      window.__mtxScheduler._processReminders();
    }
    window.addEventListener('mtx:ia-agenda-changed', onAgendaChange);
    return function () { window.removeEventListener('mtx:ia-agenda-changed', onAgendaChange); };
  }, []);
  return null;
}

Object.assign(window, { useScheduledTime: useScheduledTime, SchedulerInit: SchedulerInit });
