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


  // ── Bloques Mentex por defecto: el ritual del día + el aprendizaje del día.
  // En backend real: la IA los inserta cuando detecta que el user planeó su
  // ritual desde Home. Aquí los hardcodeamos como mock para que aparezcan en
  // la Agenda con el mismo diseño que los demás eventos.
  var MOCK_MENTEX_BLOCKS = [
    {
      id: 'm-ritual',
      title: 'Sesión ritual · enfoque profundo',
      time: '11:00', durationMin: 45,
      type: 'mentex', source: 'mentex',
      playable: { kind: 'session', label: 'Iniciar sesión ritual' },
      description: 'Tu coach reservó esta ventana cognitiva para tu sesión planeada: bloqueo de apps + rutinas activas.',
    },
    {
      id: 'm-learning',
      title: 'Charla del día · Steve Jobs · Stanford 2005',
      time: '16:30', durationMin: 15,
      type: 'mentex', source: 'mentex',
      playable: { kind: 'audio', label: 'Escuchar ahora', contentId: 'steve-jobs-stanford' },
      description: 'Tu coach agendó esta charla legendaria para tu momento de transición de la tarde.',
    },
  ];

  // ── Store: __mtxIAAgenda ───────────────────────────────────────────────────
  if (typeof window !== 'undefined' && !window.__mtxIAAgenda) {
    var _agendaState = {
      events: MOCK_MENTEX_BLOCKS.slice(),   // arranca con ritual + aprendizaje del coach
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
    var onOpen            = props.onOpen;
    var ts                = eventTypeStyle(ev.type);

    return (
      <div
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        onClick={onOpen}
        onKeyDown={onOpen ? function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : undefined}
        aria-label={onOpen ? 'Ver detalle: ' + ev.title + ' a las ' + ev.time : undefined}
        className={onOpen ? 'mtx-tap' : undefined}
        style={{
        display: 'flex', alignItems: 'stretch', gap: 0,
        marginBottom: 6,
        opacity: isPast ? 0.38 : 1,
        transition: 'opacity .3s',
        cursor: onOpen ? 'pointer' : 'default',
        borderRadius: 12,
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
                lineHeight: 1.28,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden', textOverflow: 'ellipsis',
                wordBreak: 'break-word',
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

            {/* Acción inline al final de la card:
                  - reminder 'check' (legacy o explícito) → checkbox toggle
                  - calendar                              → ícono G (info-only)
                  - reminder 'timer' / mentex / playable  → botón ▶ Play que
                    abre el detail sheet (el sheet decide qué destino: timer
                    runner, ContentDetailScreen, sesión ritual).
                Stop propagation para que el tap del botón no abra el sheet
                doble — la card body ya lo abre. */}
            {(ev.source === 'reminder' && ev.measureKind !== 'timer') ? (
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
              <button
                onClick={function (e) {
                  e.stopPropagation();
                  if (onOpen) onOpen();
                }}
                aria-label={'Iniciar · ' + ev.title}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer', flexShrink: 0,
                  width: 26, height: 26, borderRadius: 999, padding: 0,
                  border: '0.5px solid rgba(61,255,209,0.36)',
                  background: 'rgba(61,255,209,0.10)',
                  color: 'var(--neon)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 0 10px rgba(61,255,209,0.10)',
                  transition: 'background .15s, border-color .15s',
                }}>
                <IcPlay size={11} stroke="currentColor" strokeWidth={2}/>
              </button>
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


  // ── DayPillsRow ────────────────────────────────────────────────────────────
  // Scroll horizontal de 7 días (-2..+4 desde hoy). El coach orquesta el plan
  // de múltiples días — esto deja al user navegar entre ellos antes/después
  // de dormir para revisar lo que viene.
  function DayPillsRow(props) {
    var selectedOffset = props.selectedOffset;
    var onSelect = props.onSelect;
    var dayCounts = props.dayCounts || {};

    var today = new Date();
    var pills = [];
    for (var i = -2; i <= 4; i++) pills.push(i);
    var DOW = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

    return (
      <div className="mtx-scroll-x" style={{
        display: 'flex', gap: 6,
        padding: '6px 16px 12px',
        flexShrink: 0,
        borderBottom: '0.5px solid rgba(255,255,255,0.05)',
      }}>
        {pills.map(function(offset) {
          var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
          var isToday = offset === 0;
          var isSelected = selectedOffset === offset;
          var dayLabel = isToday ? 'Hoy' : (offset === -1 ? 'Ayer' : offset === 1 ? 'Mañ' : DOW[d.getDay()]);
          var count = dayCounts[offset] || 0;
          return (
            <button key={offset}
              onClick={function() { onSelect(offset); }}
              aria-pressed={isSelected}
              aria-label={dayLabel + ' ' + d.getDate() + (count > 0 ? ', ' + count + ' ítems' : ', sin actividad')}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                flexShrink: 0,
                minWidth: 50,
                padding: '8px 10px 7px',
                borderRadius: 14,
                background: isSelected
                  ? 'linear-gradient(180deg, rgba(61,255,209,0.18), rgba(61,255,209,0.04))'
                  : isToday ? 'rgba(61,255,209,0.04)' : 'rgba(255,255,255,0.025)',
                border: '0.5px solid ' + (isSelected ? 'rgba(61,255,209,0.40)'
                                        : isToday ? 'rgba(61,255,209,0.16)'
                                        : 'rgba(255,255,255,0.06)'),
                color: isSelected ? 'var(--neon)' : isToday ? 'var(--ink-2)' : 'var(--ink-3)',
                fontFamily: 'var(--ff-sans)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                transition: 'all .2s',
              }}>
              <span style={{
                fontSize: 9.5, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                opacity: 0.8,
              }}>{dayLabel}</span>
              <span style={{
                fontSize: 16, fontWeight: 700,
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                letterSpacing: '-0.012em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}>{d.getDate()}</span>
              {count > 0 && (
                <span aria-hidden="true" style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: isSelected ? 'var(--neon)' : 'var(--ink-3)',
                  marginTop: 2,
                }}/>
              )}
            </button>
          );
        })}
      </div>
    );
  }


  // ── Mock multi-día — eventos contextuales para cada día.
  // Hoy (offset=0) usa los events reales del store. Otros días tienen mocks
  // hardcodeados pero realistas. Backend real reemplaza esto con queries por
  // rango de fecha al API de Calendar + scheduler.
  function _getMockEventsForOffset(offset) {
    if (offset === 0) return null;  // caller usa events del store
    if (offset === -2) return [
      { id: 'h-2a', title: 'Sesión profunda · Backend',  time: '10:00', durationMin: 75, type: 'mentex',   source: 'mentex' },
      { id: 'h-2b', title: 'Standup',                     time: '09:00', durationMin: 15, type: 'meeting',  source: 'calendar' },
      { id: 'h-2c', title: 'Almuerzo',                    time: '13:00', durationMin: 60, type: 'break',    source: 'calendar' },
    ];
    if (offset === -1) return [
      { id: 'y1', title: 'Standup',                     time: '09:00', durationMin: 15, type: 'meeting', source: 'calendar' },
      { id: 'y2', title: 'Sesión enfoque · Diseño',     time: '11:00', durationMin: 60, type: 'mentex',  source: 'mentex' },
      { id: 'y3', title: '1:1 con Carlos',              time: '15:00', durationMin: 30, type: 'meeting', source: 'calendar' },
      { id: 'y4', title: 'Wind down',                   time: '21:30', durationMin: 15, type: 'mentex',  source: 'mentex' },
    ];
    if (offset === 1) return [
      { id: 't1', title: 'Daily standup',                time: '09:00', durationMin: 15, type: 'meeting',  source: 'calendar' },
      { id: 't2', title: 'Sesión profunda · Producto',   time: '09:30', durationMin: 90, type: 'mentex',   source: 'mentex' },
      { id: 't3', title: 'Demo con cliente',             time: '14:00', durationMin: 60, type: 'meeting',  source: 'calendar' },
      { id: 't4', title: 'Lectura · 30 min',             time: '20:30', durationMin: 30, type: 'mentex',   source: 'mentex' },
    ];
    if (offset === 2) return [
      { id: 'w1', title: 'Sprint planning',              time: '10:00', durationMin: 120, type: 'meeting', source: 'calendar' },
      { id: 'w2', title: 'Cita médica',                  time: '16:00', durationMin: 60,  type: 'personal', source: 'calendar' },
    ];
    if (offset === 3) return [
      { id: 'th1', title: 'All-hands semanal',           time: '11:00', durationMin: 45, type: 'meeting', source: 'calendar' },
    ];
    return [];  // offset === 4 → sin actividad
  }

  function _getMockProposalsForOffset(offset) {
    if (offset === 0) return null;  // usa store proposals
    if (offset === 1) return [
      {
        id: 'p-t-1', kind: 'focus_slot', icon: '🎯',
        title: 'Slot ideal · 09:30 mañana',
        description: '90 min libres después del standup. Tu mejor ventana cognitiva del día. ¿Bloqueo para deep work?',
        ctas: [
          { id: 'accept', label: 'Reservar bloque', primary: true },
          { id: 'dismiss', label: 'Ver otro día', primary: false },
        ],
      },
    ];
    if (offset === 2) return [
      {
        id: 'p-w-1', kind: 'conflict', icon: '⚠️',
        title: 'Sprint planning de 2h consecutivas',
        description: 'No vas a tener slot de enfoque profundo este día. ¿Quieres que mueva tu sesión profunda a otro día?',
        ctas: [
          { id: 'accept', label: 'Reagendar enfoque', primary: true },
          { id: 'dismiss', label: 'Está bien así', primary: false },
        ],
      },
    ];
    if (offset === 3) return [
      {
        id: 'p-th-1', kind: 'day_close', icon: '🌙',
        title: 'Cierre semanal anticipado',
        description: 'Jueves es buen día para hacer tu weekly review temprano y dejar el viernes libre. ¿Lo agendo?',
        ctas: [
          { id: 'accept', label: 'Agendar review', primary: true },
          { id: 'dismiss', label: 'No por ahora', primary: false },
        ],
      },
    ];
    return [];
  }


  // ── AgendaSheet ────────────────────────────────────────────────────────────
  function AgendaSheet(props) {
    var open    = props.open;
    var onClose = props.onClose;
    var nav     = useIAAgenda();

    // HOOKS FIRST — todos antes de cualquier early return (post-audit Fase 3+4)
    var onCloseRef = React.useRef(onClose);
    React.useEffect(function () { onCloseRef.current = onClose; });

    var titleId  = React.useId ? React.useId() : 'agenda-title';
    var sheetRef = React.useRef(null);

    // Día seleccionado: offset desde hoy (-7..+7 razonable, scroll horizontal)
    var dayOffsetState = React.useState(0);
    var dayOffset = dayOffsetState[0]; var setDayOffset = dayOffsetState[1];

    // Drawer de detalle al click en un item del timeline
    var detailItemState = React.useState(null);
    var detailItem = detailItemState[0]; var setDetailItem = detailItemState[1];

    // AddSheet (botón + arriba): reusa el AddReminderSheet existente
    var addOpenState = React.useState(false);
    var addOpen = addOpenState[0]; var setAddOpen = addOpenState[1];

    // Suscripción a __mtxRitual: cuando el user agrega/quita contenido
    // desde "Aprende hoy" (HomeInactive) o desagenda desde ContentDetailScreen,
    // la Agenda debe re-renderizar para reflejar el plan real del día.
    var ritualTickState = React.useState(0);
    var setRitualTick = ritualTickState[1];
    React.useEffect(function () {
      var onChange = function () { setRitualTick(function (t) { return t + 1; }); };
      window.addEventListener('mtx:ritual-changed', onChange);
      return function () { window.removeEventListener('mtx:ritual-changed', onChange); };
    }, []);

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

    // Datos del día seleccionado:
    //   offset=0 → store real + items dinámicos de __mtxRitual
    //   otros   → mocks contextuales (backend reemplazará con queries por rango)
    var mockEvents = _getMockEventsForOffset(dayOffset);
    var mockProps  = _getMockProposalsForOffset(dayOffset);
    var events     = mockEvents !== null ? mockEvents : nav.events;
    var proposals  = mockProps  !== null ? mockProps  : nav.proposals;
    var reminders  = dayOffset === 0 ? nav.reminders : [];  // solo hoy
    var calendarConnected = nav.calendarConnected;

    // ── Plan del día dinámico ──────────────────────────────────────────────
    // Para hoy, los items que el user agendó desde "Aprende hoy" (HomeInactive)
    // viven en window.__mtxRitual. Los convertimos a eventos Mentex con un
    // slot horario suggested (escalonado en bloques de 90 min después de las
    // 14:00). El coach IA real seleccionará slots inteligentemente; aquí lo
    // suggested keeps it deterministic per index.
    //
    // Filtrado de duplicados: si nav.events ya tiene un evento con el mismo
    // contentId (caso m-learning hardcoded de Steve Jobs vs c-jobs), se
    // prefiere el dinámico — el del store es viejo mock.
    function _ritualItemsToEvents() {
      if (dayOffset !== 0) return [];
      if (typeof window === 'undefined' || !window.__mtxRitual) return [];
      var items = window.__mtxRitual.list();
      var slots = ['14:00', '15:30', '17:00', '18:30', '20:00', '21:00'];
      return items.map(function (it, i) {
        var contentId = it.exploreId || it.id;
        return {
          id: 'rit-' + it.id,
          title: it.title,
          time: slots[i] || '20:30',
          durationMin: 30,
          type: 'mentex',
          source: 'mentex',
          exploreId: contentId,
          cover: it.cover,
          accent: it.accent,
          author: it.author,
          kind: it.kind,
          playable: { kind: 'audio', contentId: contentId, label: 'Escuchar ahora' },
          description: 'Agendado desde Aprende hoy · planeado para este momento del día.',
        };
      });
    }
    var ritualEvents = _ritualItemsToEvents();
    if (ritualEvents.length > 0) {
      var ritualIds = {};
      ritualEvents.forEach(function (r) { ritualIds[r.exploreId] = true; });
      events = events.filter(function (e) {
        var cid = e.playable && e.playable.contentId;
        // Match directo (e.playable.contentId === ritual exploreId)
        if (cid && ritualIds[cid]) return false;
        // Match legacy: m-learning hardcoded con contentId 'steve-jobs-stanford'
        // vs ritual con exploreId 'c-jobs' (mismo contenido)
        if (cid === 'steve-jobs-stanford' && ritualIds['c-jobs']) return false;
        return true;
      }).concat(ritualEvents);
    }

    var today    = new Date();
    var selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset);
    var dayLabel = dayOffset === 0 ? 'Hoy, ' + formatDayLabel(today)
                 : dayOffset === -1 ? 'Ayer, ' + formatDayLabel(selectedDate)
                 : dayOffset === 1  ? 'Mañana, ' + formatDayLabel(selectedDate)
                 : formatDayLabel(selectedDate);
    var nowMin   = getNowMinutes();
    var isToday  = dayOffset === 0;

    // Counts para los pills (dot indicator)
    var dayCounts = {};
    for (var off = -2; off <= 4; off++) {
      var em = _getMockEventsForOffset(off);
      var ev = em !== null ? em : nav.events;
      dayCounts[off] = ev.length;
    }

    // Recordatorios con hora válida → van al timeline; sin hora → sección flotante
    function hasValidTime(t) { return typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t); }

    var timelineReminders = reminders
      .filter(function (r) { return hasValidTime(r.time); })
      .map(function (r) {
        // durationMin: si el reminder es de tipo timer, preservar el valor
        // que el user eligió (15/25/45/60/custom). Reminders 'check' o legacy
        // usan 20 min por default solo para ocupar espacio visual.
        var dur = (r.measureKind === 'timer' && r.durationMin) ? r.durationMin : 20;
        return Object.assign({}, r, { source: 'reminder', type: 'reminder', durationMin: dur });
      });

    // Dedupe: __mtxScheduler bridge crea events con id 'sched_<reminderId>'
    // y source 'mentex' como mirror de cada reminder programado en el chat
    // IA. Estos events compiten con el reminder original (source 'reminder')
    // en el timeline — al clickear gana el primero por time, y se pierde la
    // metadata measureKind/durationMin del reminder. Solución: si un event
    // 'sched_<X>' coincide con un reminder cuyo id es X (timelineReminders),
    // filtramos el event y dejamos solo el reminder canónico.
    var reminderIds = {};
    timelineReminders.forEach(function (r) { reminderIds[r.id] = true; });
    events = events.filter(function (e) {
      if (typeof e.id !== 'string' || e.id.indexOf('sched_') !== 0) return true;
      var rid = e.id.substring('sched_'.length);
      return !reminderIds[rid];
    });

    var floatingReminders = reminders.filter(function (r) { return !hasValidTime(r.time); });
    var pendingFloating   = floatingReminders.filter(function (r) { return !r.completed; }).length;

    // Timeline unificado: eventos + recordatorios con hora, ordenados cronológicamente
    var sorted = events.concat(timelineReminders).sort(function (a, b) {
      return parseTimeToMin(a.time) - parseTimeToMin(b.time);
    });

    function evState(ev) {
      // Solo hoy tiene noción de "now/past/future" basado en hora actual.
      // Días futuros: todo es "future". Días pasados: todo es "past" (dimmed).
      if (dayOffset > 0) return 'future';
      if (dayOffset < 0) return 'past';
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

    // Construir filas del timeline. NowLine solo aplica al día de hoy.
    var nowInserted = false;
    var timelineRows = [];
    sorted.forEach(function (ev, i) {
      var state  = evState(ev);
      var isPast = state === 'past';
      var isNow  = state === 'now';

      // NowLine: antes del primer evento futuro (solo hoy)
      if (isToday && !nowInserted && state === 'future') {
        nowInserted = true;
        timelineRows.push(<NowLine key="now-line"/>);
      }
      timelineRows.push(
        <EventRow key={ev.id} event={ev} isPast={isPast} isNow={isNow}
          onReminderToggle={handleToggle}
          onOpen={function() { setDetailItem(ev); }}/>
      );
    });
    // Si todos los eventos ya pasaron y es hoy, NowLine al final
    if (isToday && !nowInserted && sorted.length > 0) {
      timelineRows.push(<NowLine key="now-line-end"/>);
    }

    return (
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'radial-gradient(80% 60% at 50% 0%, rgba(61,255,209,0.05), transparent 60%), #050706',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'mtxAgendaInFull .35s cubic-bezier(.25,.8,.25,1) both',
          outline: 'none',
        }}>
        <style>{`
          @keyframes mtxAgendaInFull  { from { transform:translateX(100%); opacity:0.2; } to { transform:translateX(0); opacity:1; } }
          @keyframes mtxAgendaOutFull { from { transform:translateX(0); opacity:1; } to { transform:translateX(100%); opacity:0.2; } }
        `}</style>

        {/* A.12.3: Header notifs-style (consistencia con NotificationsSheet
            y TasksSheet). Nav bar: ← circ izq · título centrado abs · ➕ circ der.
            Subtítulo abajo: "N eventos · descripción" centrado. */}
        <div style={{
          paddingTop: 48, paddingLeft: 16, paddingRight: 16, paddingBottom: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, position: 'relative',
        }}>
          <button
            onClick={onClose}
            onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (onClose) onClose(); } }}
            aria-label="Volver"
            className="mtx-tap"
            style={{
              width: 40, height: 40, borderRadius: 999, border: 0,
              background: 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-1)', cursor: 'pointer',
              position: 'relative', zIndex: 2,
            }}>
            <IcChevL size={20} stroke="currentColor" strokeWidth={2}/>
          </button>

          <h2 id={titleId} style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%, calc(-50% + 19px))',
            margin: 0,
            fontSize: 16, fontWeight: 700, color: 'var(--ink-1)',
            letterSpacing: '-0.015em',
            fontFamily: 'var(--ff-sans)',
            pointerEvents: 'none',
          }}>Agenda</h2>

          <button
            onClick={function () { setAddOpen(true); }}
            onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAddOpen(true); } }}
            aria-label="Agregar a la agenda"
            className="mtx-tap"
            style={{
              width: 40, height: 40, borderRadius: 999, border: 0,
              background: 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-1)', cursor: 'pointer',
              position: 'relative', zIndex: 2,
            }}>
            <IcPlus size={20} stroke="currentColor" strokeWidth={2}/>
          </button>
        </div>

        {/* Subtítulo: contador en color + descripción */}
        <div style={{
          padding: '4px 22px 14px',
          flexShrink: 0,
          fontSize: 12.5,
          color: 'var(--ink-3)',
          textAlign: 'center',
        }}>
          {events.length > 0 ? (
            <React.Fragment>
              <span style={{ color: 'var(--neon)', fontWeight: 700 }}>
                {events.length} {events.length === 1 ? 'evento' : 'eventos'}
              </span>
              <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
            </React.Fragment>
          ) : null}
          {dayLabel} · {isToday ? 'el plan que tu coach orquesta' : (dayOffset > 0 ? 'próximamente' : 'historial')}
        </div>

        {/* ── Scroll horizontal de días ──────────────────────────────────── */}
        <DayPillsRow selectedOffset={dayOffset} onSelect={setDayOffset} dayCounts={dayCounts}/>

        {/* ── Scrollable content ─────────────────────────────────────────── */}
        <div className="mtx-no-scrollbar" style={{
          flex: 1, overflowY: 'auto', paddingTop: 6, paddingBottom: 36,
        }}>

          {/* Sección "COACH MENTEX" (proposals) REMOVIDA 2026-05-14.
              Razón: las burbujas "Ventana de enfoque" / "Cierre reflexivo"
              robaban demasiado espacio vertical y empujaban el timeline
              abajo del fold. Conceptualmente son notificaciones del coach,
              no entradas del plan del día. El store (__mtxIAAgenda.proposals)
              + ProposalCard se mantienen — pronto se renderizan en
              NotificationsSheet con el mismo design. Hoy: hidden aquí. */}

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

            {/* Nota informativa Calendar: aparece SOLO si no conectaste Calendar,
                NO bloquea el resto. La conexión real vive en Integraciones (Fase 4). */}
            {!calendarConnected && isToday && (
              <div style={{
                padding: '10px 12px', borderRadius: 12, marginBottom: 14,
                background: 'rgba(155,138,255,0.04)',
                border: '0.5px solid rgba(155,138,255,0.16)',
                fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5,
                fontFamily: 'var(--ff-sans)',
              }}>
                💡 Conecta Google o Apple Calendar desde <span style={{ color: '#9b8aff', fontWeight: 600 }}>Integraciones</span> para ver tus eventos reales aquí.
              </div>
            )}

            {/* Eventos */}
            {sorted.length === 0 ? (
              <div style={{
                padding: '28px 0', textAlign: 'center',
                fontSize: 13, color: 'var(--ink-4)',
                fontFamily: 'var(--ff-sans)', lineHeight: 1.6,
              }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>✨</div>
                {isToday
                  ? <>Tu día está libre.<br/>Pídele al coach que te ayude a planificarlo.</>
                  : (dayOffset > 0
                    ? <>El coach todavía no ha planificado este día.<br/>Llegará más cerca de la fecha.</>
                    : <>Sin actividad registrada este día.</>
                  )}
              </div>
            ) : timelineRows}
          </div>

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

        {/* Sheets superpuestos */}
        {detailItem && (
          <AgendaItemDetailSheet
            item={detailItem}
            isToday={isToday}
            onClose={function() { setDetailItem(null); }}
            onCloseAgenda={function() { setDetailItem(null); if (onClose) onClose(); }}
            onReminderToggle={handleToggle}
            onDeleteReminder={handleDelRem}
          />
        )}
        {addOpen && (
          <AddReminderSheet
            open={addOpen}
            onClose={function() { setAddOpen(false); }}
          />
        )}
      </div>
    );
  }


  // ── AgendaItemDetailSheet ────────────────────────────────────────────────
  // Drawer brutal y estético al click en cualquier item del timeline.
  // Muestra: header con icon + tipo + tiempo, descripción/notas, source,
  // y actions contextuales (toggle reminder, ver en Calendar, cancelar Mentex).
  function AgendaItemDetailSheet(props) {
    var item = props.item;
    var isToday = props.isToday;
    var onClose = props.onClose;
    // onCloseAgenda: cierra TODO el AgendaSheet (no solo este detail).
    // Lo usa "Iniciar ahora" para dar paso al ContentDetailScreen / player
    // fullscreen que viven a nivel shell.
    var onCloseAgenda = props.onCloseAgenda || onClose;
    var onReminderToggle = props.onReminderToggle;
    var onDeleteReminder = props.onDeleteReminder;

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

    var toast = (window.useToast) ? window.useToast() : { show: function() {} };

    var sourceMeta = (function() {
      if (item.source === 'mentex')   return { label: 'Agendado por Mentex', accent: 'var(--neon)',  emoji: '✦' };
      if (item.source === 'calendar') return { label: 'Desde tu Calendar',    accent: '#4285F4',     emoji: 'G' };
      if (item.source === 'reminder') return { label: 'Recordatorio diario',  accent: '#a78bfa',     emoji: '🔔' };
      return { label: 'Item de agenda', accent: 'var(--ink-2)', emoji: '·' };
    })();
    var typeStyleObj = eventTypeStyle(item.type);

    var portalRoot = (typeof document !== 'undefined')
      ? document.getElementById('mtx-overlay-root')
      : null;
    if (!portalRoot) return null;

    var endTimeMin = parseTimeToMin(item.time) + (item.durationMin || 30);
    var endHour = Math.floor(endTimeMin / 60);
    var endMinStr = String(endTimeMin % 60).padStart(2, '0');
    var endTimeStr = endHour + ':' + endMinStr;

    var content = (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 220,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        animation: 'mtx-fade-up .25s ease',
      }} onMouseDown={handleBackdropDown} onClick={handleBackdropClick}>
        <div onClick={function(e) { e.stopPropagation(); }}
          role="dialog" aria-modal="true" aria-label={'Detalle: ' + item.title}
          className="mtx-no-scrollbar"
          style={{
            background: 'rgba(15,19,19,0.96)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            borderTop: '0.5px solid rgba(255,255,255,0.10)',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: '14px 20px 28px',
            boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
            maxHeight: '88%', overflow: 'auto',
            animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
          }}>
          {/* Grabber */}
          <div aria-hidden="true" style={{
            width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
            background: 'rgba(255,255,255,0.16)',
          }}/>

          {/* Header con large time + source pill */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div aria-hidden="true" style={{
              width: 60, height: 60, borderRadius: 16, flexShrink: 0,
              background: 'linear-gradient(135deg, ' + typeStyleObj.dot + '20, ' + typeStyleObj.dot + '04)',
              border: '0.5px solid ' + typeStyleObj.dot + '40',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: typeStyleObj.dot,
              boxShadow: '0 0 16px ' + typeStyleObj.dot + '20',
            }}>
              <span style={{
                fontSize: 18, fontWeight: 800,
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                letterSpacing: '-0.025em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}>{item.time}</span>
              <span style={{
                fontSize: 9, marginTop: 2,
                opacity: 0.7, fontWeight: 600,
              }}>{formatDuration(item.durationMin || 30)}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 9.5, fontWeight: 700,
                color: sourceMeta.accent,
                letterSpacing: '0.10em', textTransform: 'uppercase',
                marginBottom: 6,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                <span aria-hidden="true">{sourceMeta.emoji}</span>
                <span>{sourceMeta.label}</span>
              </div>
              <div style={{
                fontSize: 17, fontWeight: 700, color: 'var(--ink-1)',
                letterSpacing: '-0.018em',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                lineHeight: 1.2,
                marginBottom: 6,
              }}>{item.title}</div>
              <div style={{
                fontSize: 11.5, color: 'var(--ink-3)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>{item.time} – {endTimeStr}</div>
            </div>
            <button onClick={onClose} aria-label="Cerrar"
              className="mtx-tap"
              style={{
                width: 32, height: 32, borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                color: 'var(--ink-2)', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 13,
              }}>✕</button>
          </div>

          {/* Type pill + recurrence */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, flexWrap: 'wrap',
          }}>
            {typeStyleObj.label && (
              <span style={{
                padding: '4px 10px', borderRadius: 999,
                background: typeStyleObj.bg,
                border: '0.5px solid ' + typeStyleObj.border,
                fontSize: 10, fontWeight: 700,
                color: typeStyleObj.dot, letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontFamily: 'var(--ff-sans)',
              }}>{typeStyleObj.label}</span>
            )}
            {item.recurrence === 'daily' && (
              <span style={{
                padding: '4px 10px', borderRadius: 999,
                background: 'rgba(155,138,255,0.08)',
                border: '0.5px solid rgba(155,138,255,0.20)',
                fontSize: 10, fontWeight: 600,
                color: '#9b8aff', letterSpacing: '0.04em',
                fontFamily: 'var(--ff-sans)',
              }}>Diario</span>
            )}
            {item.source === 'reminder' && item.completed && (
              <span style={{
                padding: '4px 10px', borderRadius: 999,
                background: 'rgba(61,255,209,0.10)',
                border: '0.5px solid rgba(61,255,209,0.30)',
                fontSize: 10, fontWeight: 700,
                color: 'var(--neon)', letterSpacing: '0.05em',
                fontFamily: 'var(--ff-sans)',
              }}>✓ Completado</span>
            )}
          </div>

          {/* Description / context block */}
          {(item.description || item.notes) && (
            <div style={{
              padding: '12px 14px', borderRadius: 14,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.05)',
              marginBottom: 18,
            }}>
              <div style={{
                fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>{item.description || item.notes}</div>
            </div>
          )}

          {/* Why it's on your day (for Mentex events) */}
          {item.source === 'mentex' && (
            <div style={{
              padding: '12px 14px', borderRadius: 14,
              background: 'rgba(61,255,209,0.04)',
              border: '0.5px solid rgba(61,255,209,0.16)',
              marginBottom: 18,
            }}>
              <div className="mtx-eyebrow" style={{ fontSize: 9, color: 'var(--neon)', marginBottom: 6 }}>
                POR QUÉ ESTÁ EN TU DÍA
              </div>
              <div style={{
                fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>
                {item.type === 'mentex'
                  ? 'Tu coach detectó esta ventana cognitiva ideal y la reservó para enfoque profundo.'
                  : 'Tu coach agendó este momento basándose en tu ritmo y prioridades del día.'}
              </div>
            </div>
          )}

          {/* Actions footer contextuales */}
          {item.source === 'reminder' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={function() {
                  if (onDeleteReminder) onDeleteReminder(item.id);
                  toast.show({ message: 'Recordatorio eliminado', duration: 1400 });
                  onClose();
                }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer', flex: 1,
                  padding: '12px 14px', borderRadius: 14,
                  background: 'rgba(255,107,107,0.06)',
                  border: '0.5px solid rgba(255,107,107,0.24)',
                  color: '#ff8b8b',
                  fontSize: 12.5, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                }}>Eliminar</button>
              {/* CTA reactivo según measureKind:
                  - 'timer' (con duración)   → Iniciar timer (ActivityRunner)
                  - 'check' o legacy (sin)   → Completar / Desmarcar (toggle) */}
              {item.measureKind === 'timer' && item.durationMin ? (
                <button
                  onClick={function() {
                    if (!window.__mtxActivityRunner) {
                      toast.show({ message: 'Timer no disponible', duration: 1400 });
                      return;
                    }
                    onCloseAgenda();
                    window.__mtxActivityRunner.open({
                      id: 'reminder-' + item.id,
                      label: item.title,
                      title: item.title,
                      kind: 'Tarea',
                      accent: '#3dffd1',
                      runnerType: 'timer',
                      metricType: 'duration',
                      metricValue: item.durationMin,
                      metricUnit: 'min',
                      dur: item.durationMin + ' min',
                      fromAgenda: true,
                    });
                  }}
                  aria-label={'Iniciar timer de ' + item.durationMin + ' minutos'}
                  className="mtx-tap"
                  style={{
                    appearance: 'none', cursor: 'pointer', flex: 2,
                    padding: '12px 14px', borderRadius: 14, border: 0,
                    background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
                    color: '#0a1410',
                    fontSize: 13, fontWeight: 700,
                    fontFamily: 'var(--ff-sans)',
                    boxShadow: '0 4px 14px -2px rgba(61,255,209,0.42)',
                  }}>▶ Iniciar · {item.durationMin} min</button>
              ) : (
                <button
                  onClick={function() {
                    if (onReminderToggle) onReminderToggle(item.id);
                    toast.show({
                      message: item.completed ? 'Marcado como pendiente' : '✓ Completado',
                      duration: 1400,
                    });
                    onClose();
                  }}
                  className="mtx-tap"
                  style={{
                    appearance: 'none', cursor: 'pointer', flex: 2,
                    padding: '12px 14px', borderRadius: 14, border: 0,
                    background: item.completed
                      ? 'rgba(255,255,255,0.04)'
                      : 'linear-gradient(135deg, var(--neon), #1ad9ad)',
                    color: item.completed ? 'var(--ink-2)' : '#0a1410',
                    fontSize: 13, fontWeight: 700,
                    fontFamily: 'var(--ff-sans)',
                    boxShadow: !item.completed ? '0 4px 14px -2px rgba(61,255,209,0.42)' : 'none',
                    border: item.completed ? '0.5px solid rgba(255,255,255,0.08)' : 0,
                  }}>{item.completed ? '↶ Desmarcar' : '✓ Completar'}</button>
              )}
            </div>
          )}

          {item.source === 'calendar' && (
            <button
              onClick={function() {
                toast.show({ message: 'Abriendo en Calendar…', duration: 1400 });
                onClose();
              }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer', width: '100%',
                padding: '12px 14px', borderRadius: 14,
                background: 'rgba(66,133,244,0.10)',
                border: '0.5px solid rgba(66,133,244,0.30)',
                color: '#5b9cf7',
                fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--ff-sans)',
              }}>Ver en Calendar →</button>
          )}

          {item.source === 'mentex' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={function() {
                  toast.show({ message: 'Bloque cancelado', duration: 1400 });
                  onClose();
                }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer', flex: 1,
                  padding: '12px 14px', borderRadius: 14,
                  background: 'rgba(255,107,107,0.06)',
                  border: '0.5px solid rgba(255,107,107,0.24)',
                  color: '#ff8b8b',
                  fontSize: 12.5, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                }}>Cancelar bloque</button>
              {isToday && (
                <button
                  onClick={function() {
                    // Conectar con el flujo real de contenido / sesión / timer:
                    //   1. exploreId | playable.contentId → abre ContentDetailScreen
                    //      en Explorar (modal de contenido fullscreen — mismo
                    //      patrón que HomeActive → "Mi aprendizaje del día").
                    //   2. playable.kind === 'session' → arranca la sesión
                    //      ritual (apps + rutinas + tiempo).
                    //   3. measureKind === 'timer' (reminder con duración) →
                    //      abre ActivityRunner fullscreen pomodoro-style.
                    //   4. default → toast informativo.
                    // En 1-3 cerramos toda la Agenda para que el destino sea visible.
                    var p = item.playable;
                    var itemId = item.exploreId
                      || (p && p.contentId)
                      || null;
                    if (itemId) {
                      onCloseAgenda();
                      window.dispatchEvent(new CustomEvent('mtx:open-item-from-community', {
                        detail: { itemId: itemId },
                      }));
                      return;
                    }
                    if (p && p.kind === 'session') {
                      onCloseAgenda();
                      window.dispatchEvent(new CustomEvent('mtx:start-ritual-session', {
                        detail: { source: 'agenda', itemId: item.id },
                      }));
                      toast.show({ message: '✦ Iniciando sesión ritual…', duration: 1600 });
                      return;
                    }
                    if (item.measureKind === 'timer' && item.durationMin && window.__mtxActivityRunner) {
                      onCloseAgenda();
                      window.__mtxActivityRunner.open({
                        id: 'reminder-' + item.id,
                        label: item.title,
                        title: item.title,
                        kind: 'Tarea',
                        accent: '#3dffd1',
                        runnerType: 'timer',
                        metricType: 'duration',
                        metricValue: item.durationMin,
                        metricUnit: 'min',
                        dur: item.durationMin + ' min',
                        fromAgenda: true,
                      });
                      return;
                    }
                    toast.show({ message: '✦ Iniciando…', duration: 1400 });
                    onClose();
                  }}
                  className="mtx-tap"
                  style={{
                    appearance: 'none', cursor: 'pointer', flex: 2,
                    padding: '12px 14px', borderRadius: 14, border: 0,
                    background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
                    color: '#0a1410',
                    fontSize: 13, fontWeight: 700,
                    fontFamily: 'var(--ff-sans)',
                    boxShadow: '0 4px 14px -2px rgba(61,255,209,0.42)',
                  }}>▶ {item.playable && item.playable.label ? item.playable.label : 'Iniciar ahora'}</button>
              )}
            </div>
          )}
        </div>
      </div>
    );
    return window.ReactDOM ? window.ReactDOM.createPortal(content, portalRoot) : content;
  }


  // ── AddReminderSheet ──────────────────────────────────────────────────────
  // Duración presets para el modo Timer (pomodoro y derivados). Custom abre
  // un picker sheet bonito para elegir un valor en minutos (1–240).
  var DURATION_PRESETS = [15, 25, 45, 60];

  // ── PickerSheetShell ──────────────────────────────────────────────────────
  // Shell compartido para TimePickerSheet y DurationPickerSheet. Bottom-up
  // con backdrop blur, grabber arriba, body + footer con Cancelar/Listo.
  // Portal a 'mtx-overlay-root' con zIndex 240 (por encima de AddReminderSheet
  // que vive en zIndex 110 dentro del Agenda zIndex 100).
  function PickerSheetShell(props) {
    var open       = props.open;
    var titleLabel = props.title;
    var subtitle   = props.subtitle;
    var children   = props.children;
    var onClose    = props.onClose;
    var onConfirm  = props.onConfirm;
    var confirmDisabled = props.confirmDisabled;

    var onCloseRef = React.useRef(onClose);
    React.useEffect(function() { onCloseRef.current = onClose; });

    // Patrón mousedown-then-click: el backdrop solo cierra si el gesto
    // empezó EN el backdrop. Sin esto el click event del trigger button
    // burbujea via portal virtual tree y cierra el sheet recién montado.
    var backdropDownRef = React.useRef(false);
    var handleBackdropDown = function(e) { backdropDownRef.current = e.target === e.currentTarget; };
    var handleBackdropClick = function(e) {
      if (e.target === e.currentTarget && backdropDownRef.current && onCloseRef.current) {
        onCloseRef.current();
      }
      backdropDownRef.current = false;
    };

    React.useEffect(function() {
      if (!open) return;
      var onKey = function(e) {
        if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
        var t = e.target; var tag = (t && t.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
        if (onCloseRef.current) onCloseRef.current();
      };
      window.addEventListener('keydown', onKey);
      return function() { window.removeEventListener('keydown', onKey); };
    }, [open]);

    var portalRoot = (typeof document !== 'undefined')
      ? document.getElementById('mtx-overlay-root') : null;
    if (!open || !portalRoot) return null;

    var content = (
      <div role="presentation" style={{
        position: 'absolute', inset: 0, zIndex: 240,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.62)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        animation: 'mtx-fade-in .22s ease',
      }} onMouseDown={handleBackdropDown} onClick={handleBackdropClick}>
        <div onClick={function(e) { e.stopPropagation(); }}
          role="dialog" aria-modal="true" aria-label={titleLabel}
          style={{
            background: 'rgba(15,19,19,0.97)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            borderTop: '0.5px solid rgba(255,255,255,0.10)',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: '12px 20px 24px',
            boxShadow: '0 -24px 60px rgba(0,0,0,0.65)',
            display: 'flex', flexDirection: 'column', gap: 16,
            animation: 'mtx-fade-up .34s cubic-bezier(.4,1.4,.5,1)',
          }}>
          <div aria-hidden="true" style={{
            width: 36, height: 4, borderRadius: 999, margin: '0 auto 0',
            background: 'rgba(255,255,255,0.16)',
          }}/>
          <div>
            <div style={{
              fontSize: 9.5, color: 'var(--ink-4)',
              letterSpacing: '0.16em', textTransform: 'uppercase',
              fontWeight: 600, marginBottom: 4, fontFamily: 'var(--ff-sans)',
            }}>{titleLabel}</div>
            <h3 style={{
              margin: 0, fontSize: 17, fontWeight: 600,
              color: 'var(--ink-1)', letterSpacing: '-0.015em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
            }}>{subtitle}</h3>
          </div>
          {children}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
            <button
              onClick={onClose}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '10px 18px', borderRadius: 999,
                border: '0.5px solid rgba(255,255,255,0.08)',
                background: 'transparent', color: 'var(--ink-3)',
                fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--ff-sans)',
              }}>Cancelar</button>
            <button
              onClick={onConfirm}
              disabled={confirmDisabled}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: confirmDisabled ? 'not-allowed' : 'pointer',
                padding: '10px 22px', borderRadius: 999,
                border: '0.5px solid ' + (confirmDisabled ? 'rgba(255,255,255,0.06)' : 'rgba(61,255,209,0.40)'),
                background: confirmDisabled
                  ? 'rgba(255,255,255,0.02)'
                  : 'linear-gradient(180deg,rgba(61,255,209,0.20),rgba(61,255,209,0.08))',
                color: confirmDisabled ? 'var(--ink-4)' : 'var(--neon)',
                fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--ff-sans)',
                boxShadow: confirmDisabled ? 'none' : '0 0 0 1px rgba(61,255,209,0.20),inset 0 0 14px rgba(61,255,209,0.08)',
                opacity: confirmDisabled ? 0.6 : 1,
              }}>Listo</button>
          </div>
        </div>
      </div>
    );
    return window.ReactDOM ? window.ReactDOM.createPortal(content, portalRoot) : content;
  }

  // ── TimePickerSheet ────────────────────────────────────────────────────────
  // Picker custom para HH:MM. Dos columnas scroll-y (Hora / Minuto). Cada
  // columna highlights el valor seleccionado con accent neon sutil. Minuto
  // en steps de 5 (00, 05, ..., 55) — suficiente granularidad para tareas.
  function TimePickerSheet(props) {
    var open    = props.open;
    var value   = props.value || '09:00';
    var onClose = props.onClose;
    var onSelect = props.onSelect;

    var initParts = (value || '09:00').split(':');
    var initH = parseInt(initParts[0], 10) || 9;
    var initM = parseInt(initParts[1], 10) || 0;
    // Redondear el minuto al multiplo de 5 más cercano
    initM = Math.round(initM / 5) * 5;
    if (initM === 60) initM = 0;

    var hState = React.useState(initH);
    var hour = hState[0]; var setHour = hState[1];
    var mState = React.useState(initM);
    var minute = mState[0]; var setMinute = mState[1];

    React.useEffect(function() {
      if (!open) return;
      setHour(initH); setMinute(initM);
    }, [open, value]);

    var hours = [];
    for (var i = 0; i < 24; i++) hours.push(i);
    var minutes = [];
    for (var j = 0; j < 60; j += 5) minutes.push(j);

    function _pad(n) { return n < 10 ? '0' + n : String(n); }
    var period = hour >= 12 ? 'PM' : 'AM';
    var hour12 = hour % 12 || 12;
    var previewStr = _pad(hour12) + ':' + _pad(minute) + ' ' + period;

    function _handleConfirm() {
      if (onSelect) onSelect(_pad(hour) + ':' + _pad(minute));
      if (onClose) onClose();
    }

    return (
      <PickerSheetShell
        open={open}
        title="HORA"
        subtitle="¿A qué hora?"
        onClose={onClose}
        onConfirm={_handleConfirm}>
        {/* Preview grande del tiempo seleccionado */}
        <div style={{
          textAlign: 'center', padding: '6px 0 2px',
          fontSize: 30, fontWeight: 700,
          color: 'var(--neon)',
          fontFamily: 'var(--ff-display, var(--ff-sans))',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          textShadow: '0 0 24px rgba(61,255,209,0.35)',
        }}>{previewStr}</div>

        {/* Dos columnas: Hora · Minuto */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <ColumnPicker
            label="Hora"
            options={hours}
            value={hour}
            onChange={setHour}
            format={function(v) { var h12 = v % 12 || 12; return _pad(h12) + ' ' + (v >= 12 ? 'pm' : 'am'); }}
          />
          <ColumnPicker
            label="Minuto"
            options={minutes}
            value={minute}
            onChange={setMinute}
            format={function(v) { return _pad(v); }}
          />
        </div>
      </PickerSheetShell>
    );
  }

  // ── ColumnPicker ──────────────────────────────────────────────────────────
  // Columna scroll-y de chips. Auto-scroll al item seleccionado al abrir.
  function ColumnPicker(props) {
    var label    = props.label;
    var options  = props.options;
    var value    = props.value;
    var onChange = props.onChange;
    var format   = props.format || function(v) { return String(v); };

    var listRef = React.useRef(null);
    React.useEffect(function() {
      if (!listRef.current) return;
      var idx = options.indexOf(value);
      if (idx < 0) return;
      var el = listRef.current.children[idx];
      if (el && el.scrollIntoView) {
        try { el.scrollIntoView({ block: 'center', behavior: 'instant' }); }
        catch (_) { el.scrollIntoView({ block: 'center' }); }
      }
    }, [value]);

    return (
      <div>
        <div style={{
          fontSize: 9.5, color: 'var(--ink-4)',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          fontWeight: 600, marginBottom: 6, fontFamily: 'var(--ff-sans)',
          textAlign: 'center',
        }}>{label}</div>
        <div ref={listRef} className="mtx-no-scrollbar" style={{
          height: 170, overflowY: 'auto',
          padding: '8px 0',
          borderRadius: 14,
          border: '0.5px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)',
          maskImage: 'linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {options.map(function(opt) {
            var active = opt === value;
            return (
              <button
                key={opt}
                onClick={function() { onChange(opt); }}
                aria-pressed={active}
                aria-label={label + ' ' + format(opt)}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  border: 0, background: 'transparent',
                  padding: '7px 12px', borderRadius: 8,
                  color: active ? 'var(--neon)' : 'var(--ink-3)',
                  fontSize: active ? 17 : 14,
                  fontWeight: active ? 700 : 500,
                  fontFamily: 'var(--ff-sans)',
                  fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
                  textAlign: 'center',
                  transition: 'color .15s, font-size .15s, font-weight .15s',
                  textShadow: active ? '0 0 14px rgba(61,255,209,0.5)' : 'none',
                }}>{format(opt)}</button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── DurationPickerSheet ────────────────────────────────────────────────────
  // Picker custom para minutos de duración. Presets pomodoro + slider custom.
  function DurationPickerSheet(props) {
    var open    = props.open;
    var value   = props.value || 25;
    var onClose = props.onClose;
    var onSelect = props.onSelect;

    var valState = React.useState(value);
    var v = valState[0]; var setV = valState[1];
    React.useEffect(function() {
      if (open) setV(value);
    }, [open, value]);

    var presets = [10, 15, 25, 45, 60, 90, 120];

    function _handleConfirm() {
      if (v < 1 || v > 240) return;
      if (onSelect) onSelect(v);
      if (onClose) onClose();
    }

    return (
      <PickerSheetShell
        open={open}
        title="DURACIÓN"
        subtitle="¿Cuánto te concentras?"
        onClose={onClose}
        onConfirm={_handleConfirm}
        confirmDisabled={v < 1 || v > 240}>
        {/* Preview grande de los minutos */}
        <div style={{
          textAlign: 'center', padding: '4px 0 2px',
          color: 'var(--neon)',
          fontFamily: 'var(--ff-display, var(--ff-sans))',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
          textShadow: '0 0 24px rgba(61,255,209,0.35)',
        }}>
          <span style={{ fontSize: 36, fontWeight: 700 }}>{v}</span>
          <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 6, opacity: 0.7 }}>min</span>
        </div>

        {/* Slider 1–240 */}
        <div>
          <input
            type="range"
            min={1} max={240} step={1}
            value={v}
            onChange={function(e) { setV(parseInt(e.target.value, 10) || 1); }}
            aria-label="Duración en minutos"
            style={{
              width: '100%', accentColor: 'var(--neon)', cursor: 'pointer',
            }}/>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 9.5, color: 'var(--ink-4)', marginTop: 2,
            fontFamily: 'var(--ff-sans)', fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em',
          }}>
            <span>1 min</span><span>240 min</span>
          </div>
        </div>

        {/* Presets pomodoro */}
        <div>
          <div style={{
            fontSize: 9.5, color: 'var(--ink-4)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            fontWeight: 600, marginBottom: 8, fontFamily: 'var(--ff-sans)',
          }}>PRESETS POMODORO</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {presets.map(function(p) {
              var active = v === p;
              return (
                <button
                  key={p}
                  onClick={function() { setV(p); }}
                  aria-pressed={active}
                  className="mtx-tap"
                  style={{
                    appearance: 'none', cursor: 'pointer', flex: '1 1 0', minWidth: 56,
                    padding: '9px 10px', borderRadius: 10,
                    border: '0.5px solid ' + (active ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.08)'),
                    background: active ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.025)',
                    color: active ? 'var(--neon)' : 'var(--ink-3)',
                    fontSize: 12, fontWeight: 600, fontFamily: 'var(--ff-sans)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{p} min</button>
              );
            })}
          </div>
        </div>
      </PickerSheetShell>
    );
  }


  // Día de la semana: 0=Domingo según JS Date.getDay(), pero la fila visual
  // empieza en Lunes para coherencia LATAM. Mapping local 0..6 ↔ JS day:
  //   index 0='L'→JS 1, 1='M'→2, 2='X'→3, 3='J'→4, 4='V'→5, 5='S'→6, 6='D'→0
  var WEEKDAYS = [
    { i: 0, label: 'L', full: 'Lunes',     jsDay: 1 },
    { i: 1, label: 'M', full: 'Martes',    jsDay: 2 },
    { i: 2, label: 'X', full: 'Miércoles', jsDay: 3 },
    { i: 3, label: 'J', full: 'Jueves',    jsDay: 4 },
    { i: 4, label: 'V', full: 'Viernes',   jsDay: 5 },
    { i: 5, label: 'S', full: 'Sábado',    jsDay: 6 },
    { i: 6, label: 'D', full: 'Domingo',   jsDay: 0 },
  ];

  function AddReminderSheet(props) {
    var open    = props.open;
    var onClose = props.onClose;
    var toast   = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: function () {} };

    var titleState = React.useState('');
    var title = titleState[0]; var setTitle = titleState[1];
    var timeState  = React.useState('09:00');
    var time  = timeState[0];  var setTime  = timeState[1];

    // Tipo de medición:
    //   'check' → tarea simple, se completa con un tap en el checkbox del
    //             timeline. Para cosas como "Llamar a mamá", "Hidratarse".
    //   'timer' → tarea con duración: al "Iniciar ahora" arranca el
    //             ActivityRunner fullscreen (pomodoro-style). Para cosas
    //             como "Trabajar concentrado 30 min", "Estudio profundo".
    var measureState = React.useState('check');
    var measure = measureState[0]; var setMeasure = measureState[1];

    // Duración (solo aplica si measure === 'timer'). Presets pomodoro.
    var durationState = React.useState(25);
    var durationMin = durationState[0]; var setDurationMin = durationState[1];

    // Frecuencia:
    //   'once'     → una sola vez (default)
    //   'daily'    → todos los días
    //   'weekdays' → días específicos elegidos (Set de indices 0–6)
    var freqState = React.useState('once');
    var freq = freqState[0]; var setFreq = freqState[1];
    var weekdaysState = React.useState(function () { return new Set(); });
    var weekdaysSel = weekdaysState[0]; var setWeekdaysSel = weekdaysState[1];

    // Pickers custom: TimePickerSheet y DurationPickerSheet montados desde
    // aquí en lugar del input time nativo y window.prompt.
    var timePickerOpenState = React.useState(false);
    var timePickerOpen = timePickerOpenState[0]; var setTimePickerOpen = timePickerOpenState[1];
    var durPickerOpenState = React.useState(false);
    var durPickerOpen = durPickerOpenState[0]; var setDurPickerOpen = durPickerOpenState[1];

    var titleId  = React.useId ? React.useId() : 'add-reminder-title';
    var inputRef = React.useRef(null);
    var sheetRef = React.useRef(null);

    var onCloseRef = React.useRef(onClose);
    React.useEffect(function () { onCloseRef.current = onClose; });

    // Reset del form SOLO cuando el sheet se abre/cierra — NO en cambios
    // de los pickers (eso bloquearía la selección porque cada apertura del
    // TimePickerSheet rebote el form a defaults).
    React.useEffect(function () {
      if (!open) return;
      setTitle(''); setTime('09:00');
      setMeasure('check'); setDurationMin(25);
      setFreq('once'); setWeekdaysSel(new Set());
      setTimePickerOpen(false); setDurPickerOpen(false);
      var t = setTimeout(function () {
        if (inputRef.current) { try { inputRef.current.focus(); } catch (_) {} }
      }, 280);
      if (sheetRef.current) { try { sheetRef.current.focus({ preventScroll: true }); } catch (_) {} }
      return function () { clearTimeout(t); };
    }, [open]);

    // ESC listener separado — reactivo a los pickers para staged-close.
    React.useEffect(function () {
      if (!open) return;
      var onKey = function (e) {
        if (e.key !== 'Escape') return;
        if (timePickerOpen) { setTimePickerOpen(false); return; }
        if (durPickerOpen)  { setDurPickerOpen(false);  return; }
        if (onCloseRef.current) onCloseRef.current();
      };
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, [open, timePickerOpen, durPickerOpen]);

    if (!open) return null;

    // Validación: título obligatorio + si freq='weekdays' al menos un día.
    var canCreate = title.trim().length > 0
      && (freq !== 'weekdays' || weekdaysSel.size > 0);

    function _toggleWeekday(i) {
      setWeekdaysSel(function (prev) {
        var next = new Set(prev);
        if (next.has(i)) next.delete(i); else next.add(i);
        return next;
      });
    }

    // Formatea "HH:MM" 24h → "9:00 am / 3:30 pm" para preview en el botón.
    function _fmtTime12(t) {
      if (!t || typeof t !== 'string') return t;
      var p = t.split(':');
      var h = parseInt(p[0], 10) || 0;
      var m = parseInt(p[1], 10) || 0;
      var period = h >= 12 ? 'pm' : 'am';
      var h12 = h % 12 || 12;
      return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + period;
    }

    var handleCreate = function () {
      if (!canCreate) return;
      // Shape compatible con el store legacy ({recurrence: 'daily'|null}) +
      // nuevos campos (measureKind, durationMin, recurrence: 'weekdays',
      // weekdays: number[]). Esto preserva los reminders existentes intactos.
      var recurrenceVal = freq === 'daily'    ? 'daily'
                       :  freq === 'weekdays' ? 'weekdays'
                                              : null;
      var reminder = {
        title: title.trim(),
        time: time,
        measureKind: measure,
        recurrence: recurrenceVal,
      };
      if (measure === 'timer') reminder.durationMin = durationMin;
      if (freq === 'weekdays') reminder.weekdays = Array.from(weekdaysSel).sort();
      if (window.__mtxIAAgenda) window.__mtxIAAgenda.addReminder(reminder);
      var icon = measure === 'timer' ? '▶' : '✓';
      toast.show({ message: icon + ' ' + reminder.title + ' creado', duration: 1800 });
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
            }}>NUEVA TAREA</div>
            <h3 id={titleId} style={{
              margin: 0, fontSize: 18, fontWeight: 600,
              color: 'var(--ink-1)', letterSpacing: '-0.015em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
            }}>¿Qué vas a agendar?</h3>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={function (e) { setTitle(e.target.value); }}
            onKeyDown={function (e) {
              if (e.key === 'Enter' && !e.shiftKey && canCreate) {
                e.preventDefault(); handleCreate();
              }
            }}
            placeholder={measure === 'timer' ? 'Ej: Trabajar concentrado, estudiar…' : 'Ej: Beber agua, llamar a…'}
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

          {/* ── Tipo de medición ─────────────────────────────────────────
              "Marca" → tarea simple, se completa con un tap del checkbox
              en el timeline (existing behavior). "Tiempo" → tarea con
              duración, al iniciar abre el ActivityRunner fullscreen
              (pomodoro-style). Selector con accent suave (ink en activo,
              no neon dominante) — el accent neon se reserva para CTAs. */}
          <div>
            <div style={{
              fontSize: 10, color: 'var(--ink-4)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              fontWeight: 600, marginBottom: 8, fontFamily: 'var(--ff-sans)',
            }}>TIPO</div>
            <div role="radiogroup" aria-label="Tipo de medición"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { id: 'check', label: 'Marca',  icon: '✓', help: 'Marcar al completar' },
                { id: 'timer', label: 'Tiempo', icon: '▶', help: 'Inicia un timer fullscreen' },
              ].map(function (opt) {
                var active = measure === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={function () { setMeasure(opt.id); }}
                    role="radio"
                    aria-checked={active}
                    aria-label={opt.label + ' · ' + opt.help}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer',
                      padding: '10px 12px', borderRadius: 12,
                      border: '0.5px solid ' + (active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'),
                      background: active ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                      color: active ? 'var(--ink-1)' : 'var(--ink-3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10,
                      textAlign: 'left', fontFamily: 'var(--ff-sans)',
                      boxShadow: 'none',
                      transition: 'background .18s, border-color .18s, color .18s',
                    }}>
                    <span aria-hidden="true" style={{
                      width: 26, height: 26, borderRadius: 8,
                      background: active ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.035)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                      color: active ? 'var(--ink-1)' : 'var(--ink-4)',
                      flexShrink: 0,
                    }}>{opt.icon}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>{opt.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--ink-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {opt.help}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Hora + Duración (Duración solo si measure === 'timer')
              Ambos abren un PickerSheet custom — no input nativo, no prompt. */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10, color: 'var(--ink-4)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                fontWeight: 600, marginBottom: 6, fontFamily: 'var(--ff-sans)',
              }}>HORA</div>
              <button
                onClick={function(e) {
                  // stopPropagation crítico: sin esto, React Portal propaga
                  // el click event al backdrop del TimePickerSheet recién
                  // montado vía el virtual DOM tree, y el backdrop dispara
                  // su onClose en el mismo tick → picker abre y cierra.
                  e.stopPropagation();
                  setTimePickerOpen(true);
                }}
                aria-label={'Elegir hora (actual ' + _fmtTime12(time) + ')'}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  width: '100%', height: 44, boxSizing: 'border-box',
                  padding: '0 14px', borderRadius: 12,
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--ink-1)', fontSize: 14, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)', fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.01em',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                <span>{_fmtTime12(time)}</span>
                <span aria-hidden="true" style={{ fontSize: 11, color: 'var(--ink-4)' }}>⌃</span>
              </button>
            </div>
            {measure === 'timer' && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10, color: 'var(--ink-4)',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  fontWeight: 600, marginBottom: 6, fontFamily: 'var(--ff-sans)',
                }}>DURACIÓN</div>
                <button
                  onClick={function(e) {
                    e.stopPropagation();
                    setDurPickerOpen(true);
                  }}
                  aria-label={'Elegir duración (actual ' + durationMin + ' minutos)'}
                  className="mtx-tap"
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    width: '100%', height: 44, boxSizing: 'border-box',
                    padding: '0 14px', borderRadius: 12,
                    border: '0.5px solid rgba(255,255,255,0.10)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'var(--ink-1)', fontSize: 14, fontWeight: 600,
                    fontFamily: 'var(--ff-sans)', fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.01em',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                  <span>{durationMin} min</span>
                  <span aria-hidden="true" style={{ fontSize: 11, color: 'var(--ink-4)' }}>⌃</span>
                </button>
              </div>
            )}
          </div>

          {/* ── Frecuencia: Una vez · Diario · Días específicos ───────── */}
          <div>
            <div style={{
              fontSize: 10, color: 'var(--ink-4)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              fontWeight: 600, marginBottom: 8, fontFamily: 'var(--ff-sans)',
            }}>FRECUENCIA</div>
            <div role="radiogroup" aria-label="Frecuencia"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { id: 'once',     label: 'Una vez' },
                { id: 'daily',    label: 'Diario' },
                { id: 'weekdays', label: 'Días' },
              ].map(function (opt) {
                var active = freq === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={function () { setFreq(opt.id); }}
                    role="radio"
                    aria-checked={active}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer',
                      padding: '10px 8px', borderRadius: 10,
                      border: '0.5px solid ' + (active ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.10)'),
                      background: active ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.03)',
                      color: active ? 'var(--neon)' : 'var(--ink-2)',
                      fontSize: 13, fontWeight: 600, fontFamily: 'var(--ff-sans)',
                    }}>{opt.label}</button>
                );
              })}
            </div>
            {freq === 'weekdays' && (
              <div style={{
                marginTop: 10, display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)', gap: 6,
              }}>
                {WEEKDAYS.map(function (d) {
                  var on = weekdaysSel.has(d.i);
                  return (
                    <button
                      key={d.i}
                      onClick={function () { _toggleWeekday(d.i); }}
                      aria-pressed={on}
                      aria-label={d.full}
                      className="mtx-tap"
                      style={{
                        appearance: 'none', cursor: 'pointer',
                        height: 38, padding: 0, borderRadius: 10,
                        border: '0.5px solid ' + (on ? 'rgba(61,255,209,0.45)' : 'rgba(255,255,255,0.10)'),
                        background: on
                          ? 'linear-gradient(180deg,rgba(61,255,209,0.18),rgba(61,255,209,0.04))'
                          : 'rgba(255,255,255,0.03)',
                        color: on ? 'var(--neon)' : 'var(--ink-3)',
                        fontSize: 13, fontWeight: 700, fontFamily: 'var(--ff-sans)',
                        letterSpacing: '0.04em',
                        boxShadow: on ? '0 0 0 1px rgba(61,255,209,0.20),inset 0 0 10px rgba(61,255,209,0.08)' : 'none',
                      }}>{d.label}</button>
                  );
                })}
              </div>
            )}
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

        {/* Pickers superpuestos al sheet — zIndex 240 > 110 del sheet */}
        <TimePickerSheet
          open={timePickerOpen}
          value={time}
          onSelect={setTime}
          onClose={function() { setTimePickerOpen(false); }}
        />
        <DurationPickerSheet
          open={durPickerOpen}
          value={durationMin}
          onSelect={setDurationMin}
          onClose={function() { setDurPickerOpen(false); }}
        />
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
            window.MtxAddMoreCard
              ? <window.MtxAddMoreCard
                  onClick={function () { setAddOpen(true); }}
                  title="Agregar recordatorio"
                  subtitle="El coach Mentex hará seguimiento de los que agregues"
                  neutral
                />
              : null
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
