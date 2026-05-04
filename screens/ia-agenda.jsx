// screens/ia-agenda.jsx — v8
// Agenda gestionada por IA + Google Calendar (simulado con mock backend-ready)
//
// ARQUITECTURA (vision con backend real):
//   events[]         — timeline del día, ordenado por hora. Fuentes:
//     source:'mentex'   → ítems del ritual/aprendizaje schedulados por el coach
//     source:'calendar' → sincronizados desde Google/Apple Calendar vía OAuth
//   proposals[]      — sugerencias proactivas: slots libres, conflictos, cierre
//   reminders[]      — hábitos diarios (meditar, hidratarse, etc.)
//   calendarConnected — true cuando OAuth completó (simulado con connectCalendar())
//
// BRIDGE __mtxScheduler → __mtxIAAgenda:
//   schedule(id, time, label)  → upsertMentexEvent() + checkConflict()
//   cancel(id)                 → removeMentexEvent()
//
// DETECCIÓN DE CONFLICTOS:
//   checkConflict() escanea eventos ±30min. Si hay overlap, crea propuesta
//   'conflict' que el usuario puede resolver desde la agenda.
//
// CON BACKEND REAL:
//   connectCalendar()   → OAuth Google/Apple → sync events al worker
//   schedule() → POST /api/calendar/events → aparece en Google Calendar del usuario
//   reminders → POST /api/reminders → push notification via FCM/APNs

(function() {
  'use strict';

  // ── Mock data ──────────────────────────────────────────────────────────────

  // Eventos de Google Calendar — solo visibles cuando calendarConnected=true.
  // Simulan lo que devolvería GET /api/calendar/events?date=today
  var MOCK_CALENDAR_EVENTS = [
    { id: 'c1', title: 'Daily standup',        time: '09:00', durationMin: 15, type: 'meeting',  source: 'calendar' },
    { id: 'c2', title: 'Sesión de diseño',      time: '10:30', durationMin: 90, type: 'meeting',  source: 'calendar' },
    { id: 'c3', title: 'Café con María',         time: '12:30', durationMin: 30, type: 'personal', source: 'calendar' },
    { id: 'c4', title: 'Almuerzo + caminata',    time: '13:30', durationMin: 45, type: 'break',    source: 'calendar' },
    { id: 'c5', title: 'Review · Backend API',   time: '15:00', durationMin: 45, type: 'meeting',  source: 'calendar' },
    { id: 'c6', title: 'Gym',                    time: '18:30', durationMin: 60, type: 'break',    source: 'calendar' },
    { id: 'c7', title: 'Llamar a mamá',          time: '20:00', durationMin: 20, type: 'personal', source: 'calendar' },
  ];

  // Propuestas del coach — detectadas por el sistema.
  // Con backend: generadas por el AI worker analizando el schedule del día.
  var MOCK_PROPOSALS = [
    {
      id: 'p1',
      kind: 'focus_slot',
      icon: '🎯',
      title: 'Ventana de enfoque · 16:00',
      description: '90 min libres entre el review y el gym. Tu mejor ventana para trabajo profundo. ¿Arranco una sesión y bloqueo apps?',
      ctas: [
        { id: 'accept', label: 'Reservar bloque', primary: true },
        { id: 'dismiss', label: 'Ahora no',        primary: false },
      ],
    },
    {
      id: 'p2',
      kind: 'day_close',
      icon: '🌙',
      title: 'Cierre reflexivo · 21:30',
      description: '5 minutos para reflexionar sobre tu jornada antes de desconectarte. ¿Lo agendo?',
      ctas: [
        { id: 'accept', label: 'Activar',    primary: true },
        { id: 'dismiss', label: 'Saltar hoy', primary: false },
      ],
    },
  ];

  var MOCK_REMINDERS = [
    { id: 'r1', title: 'Meditar 5 min',  time: '07:30',      completed: true,  recurrence: 'daily' },
    { id: 'r2', title: 'Hidratarse',     time: 'cada 90min', completed: false, recurrence: 'daily' },
    { id: 'r3', title: 'Cierre del día', time: '21:00',      completed: false, recurrence: 'daily' },
    { id: 'r4', title: 'Llamar a mamá',  time: '19:00',      completed: false, recurrence: null    },
  ];


  // ── Store: __mtxIAAgenda ───────────────────────────────────────────────────
  if (typeof window !== 'undefined' && !window.__mtxIAAgenda) {
    var _agendaState = {
      events: [],                        // empieza vacío — scheduler + calendar lo llenan
      proposals: MOCK_PROPOSALS.slice(),
      reminders: MOCK_REMINDERS.slice(),
      calendarConnected: false,
      lastAction: null,
    };

    var _emit = function () {
      window.dispatchEvent(new CustomEvent('mtx:ia-agenda-changed'));
    };

    function _parseMin(time) {
      if (!time || typeof time !== 'string' || !time.includes(':')) return -1;
      var p = time.split(':');
      return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
    }

    window.__mtxIAAgenda = {
      get: function () { return _agendaState; },

      // ── Google Calendar integration ────────────────────────────────────
      // Con backend: POST /api/auth/google-calendar → OAuth → store token →
      // GET /api/calendar/events → merge en events[]. Aquí lo simulamos.
      connectCalendar: function () {
        var existing = _agendaState.events.filter(function (e) { return e.source !== 'calendar'; });
        _agendaState = Object.assign({}, _agendaState, {
          calendarConnected: true,
          events: existing.concat(MOCK_CALENDAR_EVENTS),
          lastAction: { kind: 'calendar_connected' },
        });
        _emit();
      },

      disconnectCalendar: function () {
        _agendaState = Object.assign({}, _agendaState, {
          calendarConnected: false,
          events: _agendaState.events.filter(function (e) { return e.source !== 'calendar'; }),
          lastAction: { kind: 'calendar_disconnected' },
        });
        _emit();
      },

      // ── Mentex events (bridge desde __mtxScheduler) ───────────────────
      upsertMentexEvent: function (ev) {
        var exists = _agendaState.events.find(function (e) { return e.id === ev.id; });
        var newEvents = exists
          ? _agendaState.events.map(function (e) { return e.id === ev.id ? Object.assign({}, e, ev) : e; })
          : _agendaState.events.concat([ev]);
        _agendaState = Object.assign({}, _agendaState, { events: newEvents });
        _emit();
      },

      removeMentexEvent: function (id) {
        _agendaState = Object.assign({}, _agendaState, {
          events: _agendaState.events.filter(function (e) { return e.id !== id; }),
          proposals: _agendaState.proposals.filter(function (p) { return p.id !== 'conflict_' + id; }),
        });
        _emit();
      },

      // Detecta overlap ±30min entre el nuevo evento y los existentes.
      // Si hay conflicto, inyecta una propuesta 'conflict' accionable.
      checkConflict: function (newId, time, label) {
        var newStart = _parseMin(time);
        if (newStart < 0) return;
        var newEnd = newStart + 30;

        var conflict = _agendaState.events.find(function (ev) {
          if (ev.id === newId) return false;
          var s = _parseMin(ev.time);
          if (s < 0) return false;
          var e = s + (ev.durationMin || 30);
          return !(newEnd <= s || newStart >= e);
        });

        if (!conflict) return;

        var propId = 'conflict_' + newId;
        if (_agendaState.proposals.find(function (p) { return p.id === propId; })) return;

        _agendaState = Object.assign({}, _agendaState, {
          proposals: [{
            id: propId,
            kind: 'conflict',
            icon: '⚠️',
            title: 'Conflicto · ' + time,
            description: '"' + label + '" coincide con "' + conflict.title + '" (' + conflict.time + '). ¿Movemos uno de los dos?',
            ctas: [
              { id: 'accept', label: 'Resolver',   primary: true  },
              { id: 'dismiss', label: 'Mantener',  primary: false },
            ],
          }].concat(_agendaState.proposals),
        });
        _emit();
      },

      // ── Proposals ────────────────────────────────────────────────────────
      acceptProposal: function (id) {
        var p = _agendaState.proposals.find(function (x) { return x.id === id; });
        if (!p) return;
        _agendaState = Object.assign({}, _agendaState, {
          proposals: _agendaState.proposals.filter(function (x) { return x.id !== id; }),
          lastAction: { kind: 'accepted', proposalKind: p.kind, title: p.title },
        });
        _emit();
      },

      dismissProposal: function (id) {
        var p = _agendaState.proposals.find(function (x) { return x.id === id; });
        if (!p) return;
        _agendaState = Object.assign({}, _agendaState, {
          proposals: _agendaState.proposals.filter(function (x) { return x.id !== id; }),
          lastAction: { kind: 'dismissed', proposalKind: p.kind, title: p.title },
        });
        _emit();
      },

      clearLastAction: function () {
        _agendaState = Object.assign({}, _agendaState, { lastAction: null });
        _emit();
      },

      // ── Reminders ─────────────────────────────────────────────────────────
      toggleReminder: function (id) {
        _agendaState = Object.assign({}, _agendaState, {
          reminders: _agendaState.reminders.map(function (r) {
            return r.id === id ? Object.assign({}, r, { completed: !r.completed }) : r;
          }),
          lastAction: null,
        });
        _emit();
      },

      addReminder: function (reminder) {
        var newId = 'r' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        _agendaState = Object.assign({}, _agendaState, {
          reminders: _agendaState.reminders.concat([
            Object.assign({ id: newId, completed: false, recurrence: null }, reminder),
          ]),
        });
        _emit();
      },

      deleteReminder: function (id) {
        _agendaState = Object.assign({}, _agendaState, {
          reminders: _agendaState.reminders.filter(function (r) { return r.id !== id; }),
        });
        _emit();
      },

      restoreReminder: function (reminder) {
        if (!reminder || !reminder.id) return;
        if (_agendaState.reminders.find(function (r) { return r.id === reminder.id; })) return;
        _agendaState = Object.assign({}, _agendaState, {
          reminders: _agendaState.reminders.concat([Object.assign({}, reminder)]),
        });
        _emit();
      },
    };
  }


  // ── useIAAgenda hook ───────────────────────────────────────────────────────
  function useIAAgenda() {
    var init = (typeof window !== 'undefined' && window.__mtxIAAgenda)
      ? window.__mtxIAAgenda.get()
      : { events: [], proposals: [], reminders: [], calendarConnected: false, lastAction: null };
    var sh = React.useState(init);
    var state = sh[0]; var setState = sh[1];
    React.useEffect(function () {
      var handler = function () {
        if (window.__mtxIAAgenda) setState(window.__mtxIAAgenda.get());
      };
      window.addEventListener('mtx:ia-agenda-changed', handler);
      return function () { window.removeEventListener('mtx:ia-agenda-changed', handler); };
    }, []);
    return state;
  }


  // ── Helpers ────────────────────────────────────────────────────────────────
  function parseTimeToMin(time) {
    if (!time || typeof time !== 'string' || !time.includes(':')) return -1;
    var p = time.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function getNowMinutes() {
    var n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  }

  function fmt12h(time) {
    if (!time || !time.includes(':')) return time || '';
    var p = time.split(':');
    var h = parseInt(p[0], 10);
    var m = parseInt(p[1], 10);
    var period = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12 || 12;
    return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + period;
  }

  function formatDayLabel(date) {
    var dows   = ['dom','lun','mar','mié','jue','vie','sáb'];
    var months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return dows[date.getDay()] + ' ' + date.getDate() + ' ' + months[date.getMonth()];
  }

  function eventTypeStyle(type) {
    // ── Tipos Mentex (color semántico por categoría) ──────────────────────
    if (type === 'ritual')   return { dot: '#3dffd1',  label: 'Ritual',       bg: 'rgba(61,255,209,0.08)',   border: 'rgba(61,255,209,0.24)'   };
    if (type === 'content')  return { dot: '#60a5fa',  label: 'Contenido',    bg: 'rgba(96,165,250,0.08)',   border: 'rgba(96,165,250,0.24)'   };
    if (type === 'reminder') return { dot: '#a78bfa',  label: 'Recordatorio', bg: 'rgba(167,139,250,0.08)',  border: 'rgba(167,139,250,0.24)'  };
    if (type === 'focus')    return { dot: '#3dffd1',  label: 'Enfoque',      bg: 'rgba(61,255,209,0.08)',   border: 'rgba(61,255,209,0.24)'   };
    // ── Tipos Google Calendar ─────────────────────────────────────────────
    if (type === 'meeting')  return { dot: '#7B9FFF',  label: 'Reunión',      bg: 'rgba(123,159,255,0.08)', border: 'rgba(123,159,255,0.24)'  };
    if (type === 'break')    return { dot: '#FFD27D',  label: 'Pausa',        bg: 'rgba(255,210,125,0.08)', border: 'rgba(255,210,125,0.24)'  };
    if (type === 'personal') return { dot: '#F5A6E5',  label: 'Personal',     bg: 'rgba(245,166,229,0.08)', border: 'rgba(245,166,229,0.24)'  };
    return { dot: 'rgba(255,255,255,0.22)', label: '', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' };
  }

  function formatDuration(min) {
    if (!min) return '';
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), rest = min % 60;
    return rest === 0 ? h + ' h' : h + ' h ' + rest + ' min';
  }


  // ── EventRow ──────────────────────────────────────────────────────────────
  // Diseño tipo timeline: columna de hora fija a la izquierda, card con stripe
  // de color a la derecha. Estados: past (opaco), now (glowing), future (normal).
  // onReminderToggle: callback para marcar/desmarcar recordatorios en el timeline.
  function EventRow(props) {
    var ev                = props.event;
    var isPast            = props.isPast;
    var isNow             = props.isNow;
    var onReminderToggle  = props.onReminderToggle;
    var ts                = eventTypeStyle(ev.type);

    return (
      <div style={{
        display: 'flex', alignItems: 'stretch', gap: 0,
        marginBottom: 6,
        opacity: isPast ? 0.38 : 1,
        transition: 'opacity .3s',
      }}>
        {/* Columna de hora */}
        <div style={{
          flexShrink: 0, width: 52, paddingTop: 11, paddingRight: 12,
          fontSize: 11, fontWeight: 600,
          color: isNow ? 'var(--neon)' : 'var(--ink-3)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em', textAlign: 'right', lineHeight: 1.3,
          fontFamily: 'var(--ff-sans)',
          transition: 'color .3s',
        }}>
          {fmt12h(ev.time)}
        </div>

        {/* Card con stripe izquierda */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'stretch',
          borderRadius: 12, overflow: 'hidden',
          background: isNow
            ? 'linear-gradient(135deg,' + ts.bg + ',' + ts.bg.replace(/[\d.]+\)$/, '0.03)') + ')'
            : 'rgba(255,255,255,0.025)',
          border: '0.5px solid ' + (isNow ? ts.border : 'rgba(255,255,255,0.055)'),
          boxShadow: isNow ? '0 0 0 1px ' + ts.dot + '1A,0 4px 20px ' + ts.dot + '14' : 'none',
          transition: 'background .3s, border-color .3s, box-shadow .3s',
        }}>
          {/* Stripe de color — 3px */}
          <div style={{
            width: 3, flexShrink: 0,
            background: ts.dot,
            opacity: isPast ? 0.35 : 1,
            boxShadow: isNow ? '0 0 8px ' + ts.dot + '99' : 'none',
          }}/>

          {/* Contenido */}
          <div style={{
            flex: 1, padding: '10px 10px 10px 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: isNow ? 600 : 500,
                color: (ev.source === 'reminder' && ev.completed)
                  ? 'var(--ink-4)'
                  : (isNow ? 'var(--ink-1)' : 'var(--ink-2)'),
                letterSpacing: '-0.01em', fontFamily: 'var(--ff-sans)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                textDecoration: (ev.source === 'reminder' && ev.completed) ? 'line-through' : 'none',
              }}>{ev.title}</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5, marginTop: 3,
                fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--ff-sans)',
              }}>
                {ev.durationMin > 0 && <span>{formatDuration(ev.durationMin)}</span>}
                {ts.label && (
                  <span style={{
                    padding: '1px 6px', borderRadius: 999,
                    background: ts.bg, border: '0.5px solid ' + ts.border,
                    fontSize: 9, fontWeight: 700, color: ts.dot, letterSpacing: '0.04em',
                  }}>{ts.label}</span>
                )}
                {isNow && (
                  <span style={{
                    padding: '1px 6px', borderRadius: 999,
                    background: 'rgba(61,255,209,0.14)', border: '0.5px solid rgba(61,255,209,0.45)',
                    fontSize: 9, fontWeight: 800, color: 'var(--neon)', letterSpacing: '0.06em',
                    animation: 'mtx-pulse 2s ease-in-out infinite',
                  }}>AHORA</span>
                )}
              </div>
            </div>

            {/* Ícono de fuente: checkbox (reminder) · G (calendar) · sparkle (mentex) */}
            {ev.source === 'reminder' ? (
              <button
                onClick={function (e) {
                  e.stopPropagation();
                  if (onReminderToggle) onReminderToggle(ev.id);
                }}
                aria-label={(ev.completed ? 'Desmarcar' : 'Completar') + ' · ' + ev.title}
                aria-pressed={ev.completed}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer', flexShrink: 0,
                  width: 22, height: 22, borderRadius: 999,
                  border: ev.completed
                    ? '0.5px solid rgba(167,139,250,0.55)'
                    : '0.5px solid rgba(255,255,255,0.20)',
                  background: ev.completed ? 'rgba(167,139,250,0.18)' : 'transparent',
                  color: ev.completed ? '#a78bfa' : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .2s, border-color .2s, color .2s',
                }}>
                {ev.completed && <IcCheck size={12} stroke="currentColor" strokeWidth={2.4}/>}
              </button>
            ) : ev.source === 'calendar' ? (
              <div style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                background: 'linear-gradient(135deg,#4285F4,#34A853)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 900, color: '#fff', fontFamily: 'sans-serif',
                letterSpacing: 0,
              }}>G</div>
            ) : (
              <div style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                background: 'rgba(61,255,209,0.07)',
                border: '0.5px solid rgba(61,255,209,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IcSparkles size={10} stroke="var(--neon)" strokeWidth={1.6}/>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }


  // ── NowLine ───────────────────────────────────────────────────────────────
  // Indica la hora actual en el timeline. Se inyecta entre el último evento
  // pasado y el siguiente evento futuro.
  function NowLine() {
    var n = new Date();
    var h = n.getHours(), m = n.getMinutes();
    var period = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12 || 12;
    var label = h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + period;

    return (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, marginTop: 2 }}>
        <div style={{ width: 52, flexShrink: 0 }}/>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            height: 1.5, flex: 1,
            background: 'linear-gradient(90deg, var(--neon) 0%, transparent 100%)',
            boxShadow: '0 0 6px rgba(61,255,209,0.50)',
          }}/>
          <div style={{
            padding: '3px 9px', borderRadius: 999,
            background: 'rgba(61,255,209,0.11)',
            border: '0.5px solid rgba(61,255,209,0.50)',
            fontSize: 9, fontWeight: 800, color: 'var(--neon)',
            letterSpacing: '0.06em', fontFamily: 'var(--ff-sans)',
            boxShadow: '0 0 14px rgba(61,255,209,0.22)',
            whiteSpace: 'nowrap',
          }}>{label}</div>
          <div style={{
            height: 1.5, flex: 1,
            background: 'linear-gradient(270deg, transparent 0%, rgba(61,255,209,0.12) 100%)',
          }}/>
        </div>
      </div>
    );
  }


  // ── CalendarConnectBanner ─────────────────────────────────────────────────
  // CTA de integración. En producción: redirige a /api/auth/google-calendar.
  function CalendarConnectBanner(props) {
    var onConnect = props.onConnect;
    var toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: function () {} };

    var handleConnect = function () {
      onConnect();
      toast.show({ message: '✓ Google Calendar conectado', duration: 2800 });
    };

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 14, marginBottom: 10,
        background: 'linear-gradient(135deg,rgba(66,133,244,0.07),rgba(52,168,83,0.05))',
        border: '0.5px solid rgba(66,133,244,0.20)',
      }}>
        {/* Logo G multicolor */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg,#4285F4 0%,#34A853 50%,#FBBC04 75%,#EA4335 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(66,133,244,0.28)',
          fontSize: 15, fontWeight: 900, color: '#fff', fontFamily: 'sans-serif',
        }}>G</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)',
            letterSpacing: '-0.01em', fontFamily: 'var(--ff-sans)',
          }}>Conectar Google Calendar</div>
          <div style={{
            fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2, fontFamily: 'var(--ff-sans)',
          }}>Reuniones y sesiones Mentex en una sola vista</div>
        </div>

        <button
          onClick={handleConnect}
          className="mtx-tap"
          aria-label="Conectar Google Calendar"
          style={{
            appearance: 'none', cursor: 'pointer', flexShrink: 0,
            padding: '7px 14px', borderRadius: 999,
            border: '0.5px solid rgba(66,133,244,0.40)',
            background: 'linear-gradient(180deg,rgba(66,133,244,0.20),rgba(66,133,244,0.08))',
            color: '#7B9FFF',
            fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--ff-sans)',
            transition: 'background .2s, border-color .2s',
          }}>Conectar</button>
      </div>
    );
  }


  // ── CalendarSyncedBadge ───────────────────────────────────────────────────
  function CalendarSyncedBadge(props) {
    var onDisconnect = props.onDisconnect;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderRadius: 10, marginBottom: 10,
        background: 'rgba(52,168,83,0.06)',
        border: '0.5px solid rgba(52,168,83,0.22)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: 999,
            background: '#34A853', boxShadow: '0 0 8px rgba(52,168,83,0.70)',
          }}/>
          <span style={{
            fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', fontFamily: 'var(--ff-sans)',
          }}>Google Calendar · sincronizado</span>
        </div>
        <button
          onClick={onDisconnect}
          className="mtx-tap"
          aria-label="Desconectar Google Calendar"
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '3px 10px', borderRadius: 999,
            border: '0.5px solid rgba(255,255,255,0.08)',
            background: 'transparent', color: 'var(--ink-4)',
            fontSize: 10, fontWeight: 600, fontFamily: 'var(--ff-sans)',
          }}>Desconectar</button>
      </div>
    );
  }


  // ── ProposalCard ──────────────────────────────────────────────────────────
  function ProposalCard(props) {
    var p         = props.proposal;
    var onAccept  = props.onAccept;
    var onDismiss = props.onDismiss;
    var toast     = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: function () {} };

    var isConflict = p.kind === 'conflict';

    var handleCta = function (cta) {
      if (cta.id === 'accept') {
        onAccept(p.id);
        toast.show({ message: '✓ ' + p.title, duration: 2000 });
      } else {
        onDismiss(p.id);
        toast.show({ message: 'Descartada · ' + p.title, duration: 1600 });
      }
    };

    return (
      <div className="mtx-glass" style={{
        padding: '14px 14px 12px', borderRadius: 16, marginBottom: 10,
        border: '0.5px solid ' + (isConflict ? 'rgba(255,193,62,0.20)' : 'rgba(255,255,255,0.06)'),
        background: isConflict
          ? 'linear-gradient(180deg,rgba(255,193,62,0.05),rgba(255,193,62,0.02))'
          : 'linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))',
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: 12, fontSize: 18,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: isConflict ? 'rgba(255,193,62,0.10)' : 'rgba(61,255,209,0.08)',
            border: '0.5px solid ' + (isConflict ? 'rgba(255,193,62,0.30)' : 'rgba(61,255,209,0.20)'),
          }}>{p.icon}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)',
              letterSpacing: '-0.01em', lineHeight: 1.3, fontFamily: 'var(--ff-sans)',
            }}>{p.title}</div>
            <div style={{
              marginTop: 4, fontSize: 12.5, color: 'var(--ink-3)',
              lineHeight: 1.45, letterSpacing: '-0.005em', fontFamily: 'var(--ff-sans)',
            }}>{p.description}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingLeft: 48 }}>
          {p.ctas.map(function (cta) {
            return (
              <button key={cta.id}
                onClick={function () { handleCta(cta); }}
                aria-label={cta.label + ' · ' + p.title}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '7px 14px', borderRadius: 999,
                  border: cta.primary ? '0.5px solid rgba(61,255,209,0.40)' : '0.5px solid rgba(255,255,255,0.10)',
                  background: cta.primary
                    ? 'linear-gradient(180deg,rgba(61,255,209,0.18),rgba(61,255,209,0.06))'
                    : 'rgba(255,255,255,0.03)',
                  color: cta.primary ? 'var(--neon)' : 'var(--ink-2)',
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  boxShadow: cta.primary ? '0 0 0 1px rgba(61,255,209,0.16),inset 0 0 12px rgba(61,255,209,0.06)' : 'none',
                  transition: 'background .2s, border-color .2s',
                }}>{cta.label}</button>
            );
          })}
        </div>
      </div>
    );
  }


  // ── ReminderRow ───────────────────────────────────────────────────────────
  function ReminderRow(props) {
    var r        = props.reminder;
    var onToggle = props.onToggle;
    var onDelete = props.onDelete;
    var toast    = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: function () {} };

    var handleDelete = function () {
      var snapshot = Object.assign({}, r);
      onDelete(r.id);
      toast.show({
        message: 'Eliminado · ' + r.title,
        action: 'Deshacer',
        duration: 4000,
        onAction: function () {
          if (window.__mtxIAAgenda) window.__mtxIAAgenda.restoreReminder(snapshot);
        },
      });
    };

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 4px',
        borderBottom: '0.5px solid rgba(255,255,255,0.04)',
      }}>
        <button
          onClick={function () { onToggle(r.id); }}
          aria-label={(r.completed ? 'Desmarcar' : 'Completar') + ' · ' + r.title}
          aria-pressed={r.completed}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            width: 22, height: 22, borderRadius: 999,
            border: r.completed ? '0.5px solid rgba(61,255,209,0.50)' : '0.5px solid rgba(255,255,255,0.18)',
            background: r.completed ? 'rgba(61,255,209,0.18)' : 'transparent',
            color: r.completed ? 'var(--neon)' : 'transparent',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'background .2s, border-color .2s, color .2s',
          }}>
          {r.completed && <IcCheck size={12} stroke="currentColor" strokeWidth={2.4}/>}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 500,
            color: r.completed ? 'var(--ink-4)' : 'var(--ink-1)',
            textDecoration: r.completed ? 'line-through' : 'none',
            letterSpacing: '-0.005em', fontFamily: 'var(--ff-sans)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{r.title}</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
            fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--ff-sans)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            <span>{r.time}</span>
            {r.recurrence === 'daily' && (
              <span style={{
                padding: '1px 6px', borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.02em',
              }}>Diario</span>
            )}
          </div>
        </div>

        <button
          onClick={handleDelete}
          aria-label={'Eliminar ' + r.title}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            width: 28, height: 28, borderRadius: 999,
            border: 0, background: 'transparent',
            color: 'var(--ink-4)', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <IcClose size={13} stroke="currentColor" strokeWidth={1.7}/>
        </button>
      </div>
    );
  }


  // ── AgendaSheet ────────────────────────────────────────────────────────────
  function AgendaSheet(props) {
    var open    = props.open;
    var onClose = props.onClose;
    var nav     = useIAAgenda();

    var onCloseRef = React.useRef(onClose);
    React.useEffect(function () { onCloseRef.current = onClose; });

    var titleId  = React.useId ? React.useId() : 'agenda-title';
    var sheetRef = React.useRef(null);

    React.useEffect(function () {
      if (!open) return;
      var onKey = function (e) {
        if (e.key !== 'Escape') return;
        var t = e.target; var tag = (t && t.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
        if (onCloseRef.current) onCloseRef.current();
      };
      window.addEventListener('keydown', onKey);
      if (sheetRef.current) {
        try { sheetRef.current.focus({ preventScroll: true }); } catch (_) {}
      }
      return function () { window.removeEventListener('keydown', onKey); };
    }, [open]);

    if (!open) return null;

    var events            = nav.events;
    var proposals         = nav.proposals;
    var reminders         = nav.reminders;
    var calendarConnected = nav.calendarConnected;

    var today    = new Date();
    var dayLabel = 'Hoy, ' + formatDayLabel(today);
    var nowMin   = getNowMinutes();

    // Recordatorios con hora válida → van al timeline; sin hora → sección flotante
    function hasValidTime(t) { return typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t); }

    var timelineReminders = reminders
      .filter(function (r) { return hasValidTime(r.time); })
      .map(function (r) {
        return Object.assign({}, r, { source: 'reminder', type: 'reminder', durationMin: 20 });
      });

    var floatingReminders = reminders.filter(function (r) { return !hasValidTime(r.time); });
    var pendingFloating   = floatingReminders.filter(function (r) { return !r.completed; }).length;

    // Timeline unificado: eventos + recordatorios con hora, ordenados cronológicamente
    var sorted = events.concat(timelineReminders).sort(function (a, b) {
      return parseTimeToMin(a.time) - parseTimeToMin(b.time);
    });

    function evState(ev) {
      // Recordatorio completado → siempre aparece como pasado (dimmed)
      if (ev.source === 'reminder' && ev.completed) return 'past';
      var s = parseTimeToMin(ev.time);
      if (s < 0) return 'future';
      var e = s + (ev.durationMin || 30);
      if (e <= nowMin) return 'past';
      if (s <= nowMin) return 'now';
      return 'future';
    }

    var mentexCount   = events.filter(function (e) { return e.source === 'mentex'; }).length;
    var calCount      = events.filter(function (e) { return e.source === 'calendar'; }).length;
    var remCount      = timelineReminders.length;
    var totalTimeline = sorted.length;
    var statLabel     = totalTimeline > 0
      ? totalTimeline + ' ' + (totalTimeline === 1 ? 'ítem' : 'ítems')
      : 'Día libre';

    var handleAccept   = function (id) { if (window.__mtxIAAgenda) window.__mtxIAAgenda.acceptProposal(id); };
    var handleDismiss  = function (id) { if (window.__mtxIAAgenda) window.__mtxIAAgenda.dismissProposal(id); };
    var handleToggle   = function (id) { if (window.__mtxIAAgenda) window.__mtxIAAgenda.toggleReminder(id); };
    var handleDelRem   = function (id) { if (window.__mtxIAAgenda) window.__mtxIAAgenda.deleteReminder(id); };
    var handleConnect  = function ()   { if (window.__mtxIAAgenda) window.__mtxIAAgenda.connectCalendar(); };
    var handleDisconn  = function ()   { if (window.__mtxIAAgenda) window.__mtxIAAgenda.disconnectCalendar(); };

    // Construir filas del timeline con NowLine inyectada en la posición correcta
    var nowInserted = false;
    var timelineRows = [];
    sorted.forEach(function (ev, i) {
      var state  = evState(ev);
      var isPast = state === 'past';
      var isNow  = state === 'now';

      // NowLine: antes del primer evento futuro
      if (!nowInserted && state === 'future') {
        nowInserted = true;
        timelineRows.push(<NowLine key="now-line"/>);
      }
      timelineRows.push(
        <EventRow key={ev.id} event={ev} isPast={isPast} isNow={isNow} onReminderToggle={handleToggle}/>
      );
    });
    // Si todos los eventos ya pasaron, NowLine al final
    if (!nowInserted && sorted.length > 0) {
      timelineRows.push(<NowLine key="now-line-end"/>);
    }

    return (
      <div role="presentation" style={{
        position: 'absolute', inset: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        animation: 'mtx-fade-in .25s ease',
      }} onClick={onClose}>
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onClick={function (e) { e.stopPropagation(); }}
          style={{
            background: 'rgba(11,15,15,0.97)',
            backdropFilter: 'blur(36px) saturate(200%)',
            WebkitBackdropFilter: 'blur(36px) saturate(200%)',
            borderTop: '0.5px solid rgba(255,255,255,0.10)',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: '14px 0 36px',
            boxShadow: '0 -40px 100px rgba(0,0,0,0.75)',
            maxHeight: '90%', overflow: 'auto',
            display: 'flex', flexDirection: 'column',
            animation: 'mtx-fade-up .32s cubic-bezier(.4,1.4,.5,1)',
            outline: 'none',
          }}
          className="mtx-no-scrollbar">

          {/* Grabber */}
          <div style={{
            width: 36, height: 4, borderRadius: 999, margin: '0 auto 16px',
            background: 'rgba(255,255,255,0.16)', flexShrink: 0,
          }}/>

          {/* Header ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── */}
          <div style={{
            padding: '0 20px 16px',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12,
            borderBottom: '0.5px solid rgba(255,255,255,0.05)',
            marginBottom: 6, flexShrink: 0,
          }}>
            <div>
              <div style={{
                fontSize: 9.5, color: 'var(--ink-4)',
                letterSpacing: '0.16em', textTransform: 'uppercase',
                fontWeight: 600, marginBottom: 4, fontFamily: 'var(--ff-sans)',
              }}>{dayLabel}</div>
              <h2 id={titleId} style={{
                margin: 0, fontSize: 24, fontWeight: 700,
                color: 'var(--ink-1)', letterSpacing: '-0.025em',
                fontFamily: 'var(--ff-display, var(--ff-sans))', lineHeight: 1.1,
              }}>Agenda</h2>
            </div>
            <div style={{
              padding: '6px 12px', borderRadius: 999,
              background: events.length > 0 ? 'rgba(61,255,209,0.06)' : 'rgba(255,255,255,0.04)',
              border: '0.5px solid ' + (events.length > 0 ? 'rgba(61,255,209,0.20)' : 'rgba(255,255,255,0.08)'),
              fontSize: 10.5, fontWeight: 600,
              color: events.length > 0 ? 'var(--neon)' : 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)', fontVariantNumeric: 'tabular-nums',
            }}>{statLabel}{pendingFloating > 0 ? ' · ' + pendingFloating + ' sin hora' : ''}</div>
          </div>

          {/* Propuestas del coach ── ── ── ── ── ── ── ── ── ── ── ── ── */}
          {proposals.length > 0 && (
            <div style={{ padding: '10px 16px 6px', flexShrink: 0 }}>
              <div style={{
                fontSize: 9.5, color: 'var(--ink-4)',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                fontWeight: 700, marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ff-sans)',
              }}>
                <IcSparkles size={11} stroke="var(--neon)" strokeWidth={1.8}/>
                <span>COACH MENTEX</span>
              </div>
              {proposals.map(function (p) {
                return <ProposalCard key={p.id} proposal={p} onAccept={handleAccept} onDismiss={handleDismiss}/>;
              })}
            </div>
          )}

          {/* Timeline de eventos ── ── ── ── ── ── ── ── ── ── ── ── ── */}
          <div style={{ padding: '6px 20px 14px', flexShrink: 0 }}>
            <div style={{
              fontSize: 9.5, color: 'var(--ink-4)',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              fontWeight: 700, marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: 'var(--ff-sans)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IcCalendar size={11} stroke="var(--ink-3)" strokeWidth={1.8}/>
                <span>TIMELINE DEL DÍA</span>
              </div>
              {(mentexCount > 0 || calCount > 0 || remCount > 0) && (
                <span style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: 0, color: 'var(--ink-4)' }}>
                  {[
                    mentexCount > 0 ? mentexCount + ' Mentex' : null,
                    calCount > 0    ? calCount    + ' Calendar' : null,
                    remCount > 0    ? remCount    + ' ' + (remCount === 1 ? 'recordatorio' : 'recordatorios') : null,
                  ].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>

            {/* Integración Google Calendar */}
            {!calendarConnected
              ? <CalendarConnectBanner onConnect={handleConnect}/>
              : <CalendarSyncedBadge onDisconnect={handleDisconn}/>
            }

            {/* Eventos */}
            {sorted.length === 0 ? (
              <div style={{
                padding: '28px 0', textAlign: 'center',
                fontSize: 13, color: 'var(--ink-4)',
                fontFamily: 'var(--ff-sans)', lineHeight: 1.6,
              }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>✨</div>
                Tu día está libre.{'\n'}Pídele al coach que te ayude a planificarlo.
              </div>
            ) : timelineRows}
          </div>

          {/* Recordatorios sin hora — solo los que no tienen HH:MM válido */}
          {floatingReminders.length > 0 && (
            <div style={{ padding: '2px 20px 8px', flexShrink: 0 }}>
              <div style={{
                fontSize: 9.5, color: 'var(--ink-4)',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                fontWeight: 700, marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ff-sans)',
              }}>
                <IcBell size={11} stroke="var(--ink-3)" strokeWidth={1.8}/>
                <span>SIN HORA · {pendingFloating} PENDIENTE{pendingFloating === 1 ? '' : 'S'}</span>
              </div>
              {floatingReminders.map(function (r) {
                return (
                  <ReminderRow key={r.id} reminder={r} onToggle={handleToggle} onDelete={handleDelRem}/>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div style={{
            padding: '16px 20px 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 11, color: 'var(--ink-4)',
            fontFamily: 'var(--ff-sans)', letterSpacing: '-0.005em', flexShrink: 0,
          }}>
            <IcSparkles size={10} stroke="var(--ink-4)" strokeWidth={1.6}/>
            <span>Coach Mentex está observando tu día</span>
          </div>
        </div>
      </div>
    );
  }


  // ── AddReminderSheet ──────────────────────────────────────────────────────
  function AddReminderSheet(props) {
    var open    = props.open;
    var onClose = props.onClose;
    var toast   = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: function () {} };

    var titleState = React.useState('');
    var title = titleState[0]; var setTitle = titleState[1];
    var timeState  = React.useState('09:00');
    var time  = timeState[0];  var setTime  = timeState[1];
    var dailyState = React.useState(false);
    var daily = dailyState[0]; var setDaily = dailyState[1];

    var titleId  = React.useId ? React.useId() : 'add-reminder-title';
    var inputRef = React.useRef(null);
    var sheetRef = React.useRef(null);

    var onCloseRef = React.useRef(onClose);
    React.useEffect(function () { onCloseRef.current = onClose; });

    React.useEffect(function () {
      if (!open) return;
      setTitle(''); setTime('09:00'); setDaily(false);
      var t = setTimeout(function () {
        if (inputRef.current) { try { inputRef.current.focus(); } catch (_) {} }
      }, 280);
      var onKey = function (e) {
        if (e.key !== 'Escape') return;
        if (onCloseRef.current) onCloseRef.current();
      };
      window.addEventListener('keydown', onKey);
      if (sheetRef.current) { try { sheetRef.current.focus({ preventScroll: true }); } catch (_) {} }
      return function () { clearTimeout(t); window.removeEventListener('keydown', onKey); };
    }, [open]);

    if (!open) return null;

    var canCreate = title.trim().length > 0;

    var handleCreate = function () {
      if (!canCreate) return;
      var reminder = { title: title.trim(), time: time, recurrence: daily ? 'daily' : null };
      if (window.__mtxIAAgenda) window.__mtxIAAgenda.addReminder(reminder);
      toast.show({ message: '✓ Recordatorio creado · ' + reminder.title, duration: 2000 });
      onClose && onClose();
    };

    return (
      <div role="presentation" style={{
        position: 'absolute', inset: 0, zIndex: 110,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        animation: 'mtx-fade-in .25s ease',
      }} onClick={onClose}>
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onClick={function (e) { e.stopPropagation(); }}
          style={{
            background: 'rgba(15,19,19,0.96)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            borderTop: '0.5px solid rgba(255,255,255,0.10)',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: '14px 20px 24px',
            boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', gap: 14,
            animation: 'mtx-fade-up .32s cubic-bezier(.4,1.4,.5,1)',
            outline: 'none',
          }}>
          <div style={{
            width: 36, height: 4, borderRadius: 999, margin: '0 auto 4px',
            background: 'rgba(255,255,255,0.16)', flexShrink: 0,
          }}/>

          <div>
            <div style={{
              fontSize: 9.5, color: 'var(--ink-4)',
              letterSpacing: '0.16em', textTransform: 'uppercase',
              fontWeight: 600, marginBottom: 4, fontFamily: 'var(--ff-sans)',
            }}>NUEVO RECORDATORIO</div>
            <h3 id={titleId} style={{
              margin: 0, fontSize: 18, fontWeight: 600,
              color: 'var(--ink-1)', letterSpacing: '-0.015em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
            }}>¿Qué te recuerdo?</h3>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={function (e) { setTitle(e.target.value); }}
            onKeyDown={function (e) {
              if (e.key === 'Enter' && !e.shiftKey && title.trim()) {
                e.preventDefault(); handleCreate();
              }
            }}
            placeholder="Ej: Beber agua, llamar a..."
            maxLength={80}
            style={{
              appearance: 'none', padding: '12px 14px', borderRadius: 12,
              border: '0.5px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--ink-1)', fontSize: 14, fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em', outline: 'none',
              transition: 'border-color .2s, background .2s',
            }}
            onFocus={function (e) {
              e.target.style.borderColor = 'rgba(61,255,209,0.40)';
              e.target.style.background = 'rgba(61,255,209,0.04)';
            }}
            onBlur={function (e) {
              e.target.style.borderColor = 'rgba(255,255,255,0.10)';
              e.target.style.background = 'rgba(255,255,255,0.03)';
            }}
          />

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10, color: 'var(--ink-4)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                fontWeight: 600, marginBottom: 6, fontFamily: 'var(--ff-sans)',
              }}>HORA</div>
              <input
                type="time"
                value={time}
                onChange={function (e) { setTime(e.target.value); }}
                style={{
                  appearance: 'none', WebkitAppearance: 'none',
                  width: '100%', height: 44, boxSizing: 'border-box',
                  padding: '0 14px', borderRadius: 12,
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--ink-1)', fontSize: 14, fontFamily: 'var(--ff-sans)',
                  fontVariantNumeric: 'tabular-nums', outline: 'none', colorScheme: 'dark',
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10, color: 'var(--ink-4)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                fontWeight: 600, marginBottom: 6, fontFamily: 'var(--ff-sans)',
              }}>FRECUENCIA</div>
              <button
                onClick={function () { setDaily(function (d) { return !d; }); }}
                aria-pressed={daily}
                aria-label={daily ? 'Desactivar diario' : 'Repetir cada día'}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  width: '100%', height: 44, boxSizing: 'border-box',
                  padding: '0 14px', borderRadius: 12,
                  border: '0.5px solid ' + (daily ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.10)'),
                  background: daily
                    ? 'linear-gradient(180deg,rgba(61,255,209,0.16),rgba(61,255,209,0.04))'
                    : 'rgba(255,255,255,0.03)',
                  color: daily ? 'var(--neon)' : 'var(--ink-2)',
                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--ff-sans)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: daily ? '0 0 0 1px rgba(61,255,209,0.18),inset 0 0 12px rgba(61,255,209,0.06)' : 'none',
                  transition: 'background .2s, border-color .2s, color .2s',
                }}>{daily ? '✓ Diario' : 'Una vez'}</button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <button
              onClick={onClose}
              aria-label="Cancelar nuevo recordatorio"
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '10px 18px', borderRadius: 999,
                border: '0.5px solid rgba(255,255,255,0.08)',
                background: 'transparent', color: 'var(--ink-3)',
                fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--ff-sans)',
              }}>Cancelar</button>
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              aria-label="Crear recordatorio"
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: canCreate ? 'pointer' : 'not-allowed',
                padding: '10px 22px', borderRadius: 999,
                border: '0.5px solid ' + (canCreate ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.06)'),
                background: canCreate
                  ? 'linear-gradient(180deg,rgba(61,255,209,0.20),rgba(61,255,209,0.08))'
                  : 'rgba(255,255,255,0.02)',
                color: canCreate ? 'var(--neon)' : 'var(--ink-4)',
                fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--ff-sans)',
                boxShadow: canCreate ? '0 0 0 1px rgba(61,255,209,0.20),inset 0 0 14px rgba(61,255,209,0.08)' : 'none',
                opacity: canCreate ? 1 : 0.6,
                transition: 'background .2s, border-color .2s, color .2s, opacity .2s',
              }}>Crear</button>
          </div>
        </div>
      </div>
    );
  }


  // ── HomeRemindersCard ─────────────────────────────────────────────────────
  function HomeRemindersCard() {
    var nav        = useIAAgenda();
    var reminders  = nav.reminders || [];
    var addOS      = React.useState(false);
    var addOpen    = addOS[0]; var setAddOpen = addOS[1];
    var pendingCount = reminders.filter(function (r) { return !r.completed; }).length;

    var portalRoot = React.useMemo(function () {
      return (typeof document !== 'undefined') ? document.getElementById('mtx-overlay-root') : null;
    }, []);
    var handleAddClose = React.useCallback(function () { setAddOpen(false); }, []);
    var sheetEl       = addOpen ? <AddReminderSheet open={true} onClose={handleAddClose}/> : null;
    var portalledSheet = sheetEl
      ? (portalRoot && window.ReactDOM ? window.ReactDOM.createPortal(sheetEl, portalRoot) : sheetEl)
      : null;

    var handleToggle = function (id) { if (window.__mtxIAAgenda) window.__mtxIAAgenda.toggleReminder(id); };
    var handleDelete = function (id) { if (window.__mtxIAAgenda) window.__mtxIAAgenda.deleteReminder(id); };

    return (
      <div style={{ marginBottom: 24 }}>
        {window.MtxSectionHead ? (
          <window.MtxSectionHead
            title="Recordatorios"
            eyebrow={pendingCount + ' activo' + (pendingCount === 1 ? '' : 's')}
          />
        ) : (
          <div style={{ padding: '0 20px 12px' }}>
            <div style={{
              fontSize: 9.5, color: 'var(--ink-4)',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              fontWeight: 600, marginBottom: 4, fontFamily: 'var(--ff-sans)',
            }}>{pendingCount} ACTIVO{pendingCount === 1 ? '' : 'S'}</div>
            <h2 style={{
              margin: 0, fontSize: 22, fontWeight: 600,
              color: 'var(--ink-1)', letterSpacing: '-0.02em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
            }}>Recordatorios</h2>
          </div>
        )}

        <div style={{ padding: '0 20px' }}>
          {reminders.length === 0 ? (
            <div style={{
              padding: '14px 18px', borderRadius: 14,
              border: '1px dashed rgba(61,255,209,0.30)',
              background: 'rgba(61,255,209,0.03)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 999,
                background: 'rgba(61,255,209,0.12)',
                border: '0.5px solid rgba(61,255,209,0.30)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--neon)', flexShrink: 0,
              }}>
                <IcBell size={14} stroke="currentColor" strokeWidth={1.8}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)',
                  fontFamily: 'var(--ff-sans)', letterSpacing: '-0.005em',
                }}>Aún sin recordatorios</div>
                <div style={{
                  fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--ff-sans)', marginTop: 2,
                }}>El coach Mentex hará seguimiento de los que agregues.</div>
              </div>
              <button
                onClick={function () { setAddOpen(true); }}
                aria-label="Agregar primer recordatorio"
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '8px 14px', borderRadius: 999,
                  border: '0.5px solid rgba(61,255,209,0.40)',
                  background: 'linear-gradient(180deg,rgba(61,255,209,0.18),rgba(61,255,209,0.06))',
                  color: 'var(--neon)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--ff-sans)',
                  boxShadow: '0 0 0 1px rgba(61,255,209,0.16),inset 0 0 12px rgba(61,255,209,0.06)',
                  flexShrink: 0,
                }}>Agregar</button>
            </div>
          ) : (
            <div style={{
              padding: '4px 12px', borderRadius: 16,
              background: 'rgba(255,255,255,0.02)',
              border: '0.5px solid rgba(255,255,255,0.04)',
            }}>
              {reminders.map(function (r) {
                return (
                  <ReminderRow key={r.id} reminder={r} onToggle={handleToggle} onDelete={handleDelete}/>
                );
              })}
              <button
                onClick={function () { setAddOpen(true); }}
                aria-label="Agregar nuevo recordatorio"
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  width: '100%', marginTop: 4,
                  padding: '11px 8px', borderRadius: 10,
                  border: 0, background: 'transparent',
                  color: 'var(--ink-3)', fontSize: 12.5, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)', letterSpacing: '-0.005em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'color .2s, background .2s',
                }}
                onMouseEnter={function (e) { e.currentTarget.style.color = 'var(--neon)'; }}
                onMouseLeave={function (e) { e.currentTarget.style.color = 'var(--ink-3)'; }}
              >
                <IcPlus size={12} stroke="currentColor" strokeWidth={2}/>
                <span>Agregar recordatorio</span>
              </button>
            </div>
          )}
        </div>

        {portalledSheet}
      </div>
    );
  }


  // ── Export ────────────────────────────────────────────────────────────────
  Object.assign(window, {
    AgendaSheet:       AgendaSheet,
    useIAAgenda:       useIAAgenda,
    AddReminderSheet:  AddReminderSheet,
    HomeRemindersCard: HomeRemindersCard,
    ReminderRow:       ReminderRow,
  });

})();
