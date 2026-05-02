// screens/ia-agenda.jsx — Fase 4 · Agenda gestionada por IA
//
// Bottom sheet anclado al iPhone que se abre tocando el icono 📅 del IAHubHeader.
// Tres secciones: Eventos del día (timeline), Propuestas del coach (CTAs accionables)
// y Recordatorios activos. Sigue patrón visual y de animación de IAHistorySheet
// (sheet desde abajo, grabber, blur, max-height 88%).
//
// Decisiones:
//  • Patrón IIFE con `var` + `function` (Babel-standalone safe — `const` + arrow
//    function como expressions causaron TDZ-like bugs en stores anteriores).
//  • Store `__mtxIAAgenda` con subscribe pattern reactivo (mismo shape que
//    __mtxIAChat / __mtxIAConfig). useSyncExternalStore via custom hook.
//  • Mock data en MOCK_EVENTS / MOCK_PROPOSALS / MOCK_REMINDERS — todas con
//    horas fijas (no Date.now()) para que la UI sea estable entre renders.
//  • Acciones de propuestas (aceptar/descartar) modifican el store local, no
//    se persisten — Fase 5 conectará calendar real.
//  • A11y: cada CTA tiene aria-label, dropdown reminder usa role=menu, ESC
//    cierra sheet (con isTypingInEditable guard).

(function() {
  'use strict';

  // ── Mock data ──────────────────────────────────────────────────────────────
  // Horas fijas para que el día se vea coherente sin importar la hora real
  // del usuario. Iconos ya disponibles en mentex-icons.jsx (sin imports nuevos).
  var MOCK_EVENTS = [
    { id: 'e1', title: 'Daily standup',           time: '09:00', durationMin: 15, type: 'meeting', source: 'calendar' },
    { id: 'e2', title: 'Sesión profunda · Diseño', time: '10:30', durationMin: 90, type: 'focus',   source: 'mentex' },
    { id: 'e3', title: 'Café con María',          time: '12:30', durationMin: 30, type: 'personal', source: 'calendar' },
    { id: 'e4', title: 'Almuerzo + caminata',     time: '13:00', durationMin: 60, type: 'break',    source: 'mentex' },
    { id: 'e5', title: 'Review PRs',              time: '15:00', durationMin: 45, type: 'meeting', source: 'calendar' },
    { id: 'e6', title: 'Sesión de aprendizaje',   time: '17:00', durationMin: 60, type: 'focus',   source: 'mentex' },
  ];

  // kind: focus_slot | day_close | conflict | health
  var MOCK_PROPOSALS = [
    {
      id: 'p1',
      kind: 'focus_slot',
      icon: '🎯',
      title: 'Tienes 90 min libres a las 14:00',
      description: 'Es tu mejor ventana de enfoque profundo. ¿Te bloqueo apps y arranco una sesión?',
      ctas: [
        { id: 'accept', label: 'Reservar', primary: true },
        { id: 'dismiss', label: 'Ahora no', primary: false },
      ],
    },
    {
      id: 'p2',
      kind: 'conflict',
      icon: '⚠',
      title: 'Conflicto detectado · 12:30',
      description: '"Café con María" se solapa con tu sesión profunda. ¿Movemos la sesión a las 15:30?',
      ctas: [
        { id: 'accept', label: 'Mover sesión', primary: true },
        { id: 'dismiss', label: 'Mantener', primary: false },
      ],
    },
    {
      id: 'p3',
      kind: 'day_close',
      icon: '🌙',
      title: 'Cierre del día a las 21:00',
      description: 'Te recuerdo desconectar y reflexionar 5 minutos sobre tu jornada.',
      ctas: [
        { id: 'accept', label: 'Activar', primary: true },
        { id: 'dismiss', label: 'Saltar hoy', primary: false },
      ],
    },
  ];

  var MOCK_REMINDERS = [
    { id: 'r1', title: 'Meditar 5 min',     time: '07:30', completed: true,  recurrence: 'daily' },
    { id: 'r2', title: 'Hidratarse',        time: 'cada 90min', completed: false, recurrence: 'daily' },
    { id: 'r3', title: 'Cierre del día',    time: '21:00', completed: false, recurrence: 'daily' },
    { id: 'r4', title: 'Llamar a mamá',     time: '19:00', completed: false, recurrence: null },
  ];


  // ── Store: __mtxIAAgenda ───────────────────────────────────────────────────
  // Reactivo: subscribe pattern + getSnapshot. Cualquier componente puede leer
  // con useIAAgenda(). Las mutaciones (acceptProposal, toggleReminder…) emiten
  // un evento custom 'mtx:ia-agenda-changed' que el hook escucha para forzar
  // re-render. No persistencia — Fase 4 es UI mock.
  if (typeof window !== 'undefined' && !window.__mtxIAAgenda) {
    var _agendaState = {
      events: MOCK_EVENTS.slice(),
      proposals: MOCK_PROPOSALS.slice(),
      reminders: MOCK_REMINDERS.slice(),
      // toast del último action: el sheet lo lee y lo muestra como feedback
      // tras aceptar/descartar una propuesta.
      lastAction: null,
    };

    var _emit = function() {
      window.dispatchEvent(new CustomEvent('mtx:ia-agenda-changed'));
    };

    window.__mtxIAAgenda = {
      get: function() { return _agendaState; },
      // Aceptar propuesta: la quita del listado. En Fase 5 además crearía el
      // bloqueo / reminder real. Aquí solo dejamos lastAction para feedback.
      acceptProposal: function(id) {
        var p = _agendaState.proposals.find(function(x) { return x.id === id; });
        if (!p) return;
        _agendaState = Object.assign({}, _agendaState, {
          proposals: _agendaState.proposals.filter(function(x) { return x.id !== id; }),
          lastAction: { kind: 'accepted', proposalKind: p.kind, title: p.title },
        });
        _emit();
      },
      // Descartar propuesta: igual que aceptar pero con flag distinto en lastAction
      dismissProposal: function(id) {
        var p = _agendaState.proposals.find(function(x) { return x.id === id; });
        if (!p) return;
        _agendaState = Object.assign({}, _agendaState, {
          proposals: _agendaState.proposals.filter(function(x) { return x.id !== id; }),
          lastAction: { kind: 'dismissed', proposalKind: p.kind, title: p.title },
        });
        _emit();
      },
      toggleReminder: function(id) {
        _agendaState = Object.assign({}, _agendaState, {
          reminders: _agendaState.reminders.map(function(r) {
            return r.id === id ? Object.assign({}, r, { completed: !r.completed }) : r;
          }),
          lastAction: null,
        });
        _emit();
      },
      addReminder: function(reminder) {
        // ID con random suffix — evita colisiones si dos addReminder se llaman
        // en la misma ms (audit IMP-4). Math.random().toString(36) da [a-z0-9].
        var newId = 'r' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        var newR = Object.assign({ id: newId, completed: false, recurrence: null }, reminder);
        _agendaState = Object.assign({}, _agendaState, {
          reminders: _agendaState.reminders.concat([newR]),
        });
        _emit();
      },
      deleteReminder: function(id) {
        _agendaState = Object.assign({}, _agendaState, {
          reminders: _agendaState.reminders.filter(function(r) { return r.id !== id; }),
        });
        _emit();
      },
      // Restaura un reminder con TODO su estado original (id, completed,
      // recurrence). Distinto de addReminder que genera nuevo id y resetea
      // completed=false. Lo usa el toast "Deshacer" tras un delete.
      restoreReminder: function(reminder) {
        if (!reminder || !reminder.id) return;
        // Idempotente: no duplicar si por alguna razón ya está
        if (_agendaState.reminders.find(function(r) { return r.id === reminder.id; })) return;
        _agendaState = Object.assign({}, _agendaState, {
          reminders: _agendaState.reminders.concat([Object.assign({}, reminder)]),
        });
        _emit();
      },
      clearLastAction: function() {
        _agendaState = Object.assign({}, _agendaState, { lastAction: null });
        _emit();
      },
    };
  }

  // ── useIAAgenda hook ───────────────────────────────────────────────────────
  function useIAAgenda() {
    var s = (typeof window !== 'undefined' && window.__mtxIAAgenda)
      ? window.__mtxIAAgenda.get()
      : { events: [], proposals: [], reminders: [], lastAction: null };
    var stateHook = React.useState(s);
    var state = stateHook[0]; var setState = stateHook[1];
    React.useEffect(function() {
      var handler = function() {
        if (window.__mtxIAAgenda) setState(window.__mtxIAAgenda.get());
      };
      window.addEventListener('mtx:ia-agenda-changed', handler);
      return function() { window.removeEventListener('mtx:ia-agenda-changed', handler); };
    }, []);
    return state;
  }


  // ── Helpers ────────────────────────────────────────────────────────────────
  // Día con formato corto en español: "lun 1 may". Memoizado por timestamp del
  // día para que no recompute en cada render del sheet.
  function formatDayLabel(date) {
    var dows = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    var months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return dows[date.getDay()] + ' ' + date.getDate() + ' ' + months[date.getMonth()];
  }

  // Color/badge por tipo de evento. Cada tipo tiene su acento sutil para que
  // la timeline sea escaneable sin sobrecargar visualmente.
  function eventTypeStyle(type) {
    if (type === 'focus')   return { dot: 'var(--neon)',           label: 'Enfoque',  bg: 'rgba(61,255,209,0.10)', border: 'rgba(61,255,209,0.28)' };
    if (type === 'meeting') return { dot: '#9DB7FF',               label: 'Reunión',  bg: 'rgba(157,183,255,0.08)', border: 'rgba(157,183,255,0.22)' };
    if (type === 'break')   return { dot: '#FFD27D',               label: 'Pausa',    bg: 'rgba(255,210,125,0.08)', border: 'rgba(255,210,125,0.22)' };
    if (type === 'personal')return { dot: '#F5A6E5',               label: 'Personal', bg: 'rgba(245,166,229,0.08)', border: 'rgba(245,166,229,0.22)' };
    return { dot: 'var(--ink-3)', label: '', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' };
  }

  // Duración legible: 90 → "1h 30min", 60 → "1h", 30 → "30min"
  function formatDuration(min) {
    if (min < 60) return min + 'min';
    var h = Math.floor(min / 60);
    var rest = min % 60;
    return rest === 0 ? h + 'h' : h + 'h ' + rest + 'min';
  }


  // ── EventRow ──────────────────────────────────────────────────────────────
  // Una línea por evento: dot de color · hora · título · duración. Compacto,
  // escaneable; tap abriría detalles en Fase 5 (no clickable aún).
  function EventRow(props) {
    var ev = props.event;
    var style = eventTypeStyle(ev.type);

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 4px',
        borderBottom: '0.5px solid rgba(255,255,255,0.04)',
      }}>
        {/* Time pill */}
        <div style={{
          flexShrink: 0, width: 56,
          fontSize: 12, fontWeight: 600,
          color: 'var(--ink-2)',
          fontFamily: 'var(--ff-sans)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}>{ev.time}</div>

        {/* Color dot */}
        <div style={{
          width: 8, height: 8, borderRadius: 999,
          background: style.dot,
          flexShrink: 0,
          boxShadow: '0 0 8px ' + style.dot + '66',
        }}/>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 500, color: 'var(--ink-1)',
            letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{ev.title}</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 2,
            fontSize: 11, color: 'var(--ink-4)',
            fontFamily: 'var(--ff-sans)',
          }}>
            <span>{formatDuration(ev.durationMin)}</span>
            {style.label && (
              <span style={{
                padding: '1px 7px', borderRadius: 999,
                background: style.bg,
                border: '0.5px solid ' + style.border,
                fontSize: 10, fontWeight: 600,
                color: style.dot,
                letterSpacing: '0.01em',
              }}>{style.label}</span>
            )}
            {ev.source === 'calendar' && (
              <span style={{ color: 'var(--ink-4)', fontSize: 10 }}>· Calendar</span>
            )}
          </div>
        </div>
      </div>
    );
  }


  // ── ProposalCard ──────────────────────────────────────────────────────────
  // Card glass con icon emoji a la izquierda, título + desc, y CTAs abajo.
  // El primary CTA es neon-filled, el secundario ghost. Tap dispara accept o
  // dismiss según el id.
  function ProposalCard(props) {
    var p = props.proposal;
    var onAccept = props.onAccept;
    var onDismiss = props.onDismiss;
    var toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: function() {} };

    // Audit IMP-3: el dismiss antes era silencioso (la card desaparecía sin
    // feedback). Ahora ambos paths muestran toast — accept con confirmación
    // explícita, dismiss con un mensaje sutil de "descartada" para que el
    // user no piense que la app perdió la propuesta sin pedir confirmación.
    var handleCta = function(cta) {
      if (cta.id === 'accept') {
        onAccept(p.id);
        toast.show({ message: '✓ Listo · ' + p.title, duration: 2000 });
      } else {
        onDismiss(p.id);
        toast.show({ message: 'Descartada · ' + p.title, duration: 1600 });
      }
    };

    return (
      <div className="mtx-glass" style={{
        padding: '14px 14px 12px',
        borderRadius: 16,
        marginBottom: 10,
        border: '0.5px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {/* Icon emoji con halo */}
          <div style={{
            flexShrink: 0,
            width: 36, height: 36, borderRadius: 12,
            background: 'rgba(61,255,209,0.08)',
            border: '0.5px solid rgba(61,255,209,0.20)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 0 16px rgba(61,255,209,0.10) inset',
          }}>{p.icon}</div>

          {/* Texto */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13.5, fontWeight: 600,
              color: 'var(--ink-1)',
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
              fontFamily: 'var(--ff-sans)',
            }}>{p.title}</div>
            <div style={{
              marginTop: 4,
              fontSize: 12.5, color: 'var(--ink-3)',
              lineHeight: 1.45,
              letterSpacing: '-0.005em',
              fontFamily: 'var(--ff-sans)',
            }}>{p.description}</div>
          </div>
        </div>

        {/* CTAs */}
        <div style={{
          display: 'flex', gap: 8, marginTop: 12,
          paddingLeft: 48, /* alinea con texto, debajo del icon halo */
        }}>
          {p.ctas.map(function(cta) {
            return (
              <button key={cta.id}
                onClick={function() { handleCta(cta); }}
                aria-label={cta.label + ' · ' + p.title}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '7px 14px', borderRadius: 999,
                  border: cta.primary ? '0.5px solid rgba(61,255,209,0.40)' : '0.5px solid rgba(255,255,255,0.10)',
                  background: cta.primary
                    ? 'linear-gradient(180deg, rgba(61,255,209,0.18), rgba(61,255,209,0.06))'
                    : 'rgba(255,255,255,0.03)',
                  color: cta.primary ? 'var(--neon)' : 'var(--ink-2)',
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  boxShadow: cta.primary ? '0 0 0 1px rgba(61,255,209,0.16), inset 0 0 12px rgba(61,255,209,0.06)' : 'none',
                  transition: 'background .2s, border-color .2s',
                }}>{cta.label}</button>
            );
          })}
        </div>
      </div>
    );
  }


  // ── ReminderRow ───────────────────────────────────────────────────────────
  // Checkbox circular a la izquierda · texto · time · botón delete (X).
  // Tap en checkbox toggle completed; tap en X elimina directo + toast con
  // "Deshacer" (4s) — patrón iOS nativo, sin window.confirm bloqueante.
  function ReminderRow(props) {
    var r = props.reminder;
    var onToggle = props.onToggle;
    var onDelete = props.onDelete;
    var toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: function() {} };

    var handleDelete = function() {
      // Snapshot ANTES del delete para restaurar EXACTO en undo (id,
      // completed, recurrence, time — todo intacto). Patrón iOS estándar:
      // delete directo + toast no-bloqueante con Deshacer 4s, en vez del
      // window.confirm nativo del browser que rompe la inmersión.
      var snapshot = Object.assign({}, r);
      onDelete(r.id);
      toast.show({
        message: 'Eliminado · ' + r.title,
        action: 'Deshacer',
        duration: 4000,
        onAction: function() {
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
        {/* Checkbox circular tappable */}
        <button
          onClick={function() { onToggle(r.id); }}
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

        {/* Texto + tiempo */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 500,
            color: r.completed ? 'var(--ink-4)' : 'var(--ink-1)',
            textDecoration: r.completed ? 'line-through' : 'none',
            letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{r.title}</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginTop: 2,
            fontSize: 11, color: 'var(--ink-4)',
            fontFamily: 'var(--ff-sans)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            <span>{r.time}</span>
            {r.recurrence === 'daily' && (
              <span style={{
                padding: '1px 6px', borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                fontSize: 10, fontWeight: 600,
                color: 'var(--ink-3)',
                letterSpacing: '0.02em',
              }}>Diario</span>
            )}
          </div>
        </div>

        {/* Delete — directo (sin confirm nativo) + toast con Deshacer */}
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
            transition: 'color .15s, background .15s',
          }}>
          <IcClose size={13} stroke="currentColor" strokeWidth={1.7}/>
        </button>
      </div>
    );
  }


  // ── AgendaSheet ────────────────────────────────────────────────────────────
  // Bottom sheet anclado al iPhone (sibling de mtx-bg, position:absolute inset:0).
  // Se abre desde el icon button de calendario en el IAHubHeader. Usa el mismo
  // patrón visual que IAHistorySheet (grabber, blur, slide-up con bezier suave).
  function AgendaSheet(props) {
    var open = props.open;
    var onClose = props.onClose;
    var nav = useIAAgenda();
    var events = nav.events;
    var proposals = nav.proposals;
    var reminders = nav.reminders;

    // Audit IMP-5: onClose recreates each MentexApp render. Guardarlo en ref
    // y usar deps:[open] en lugar de [open, onClose] evita re-registro del
    // keydown listener en cada keystroke del shell.
    var onCloseRef = React.useRef(onClose);
    React.useEffect(function() { onCloseRef.current = onClose; });

    // useId para vincular aria-labelledby del dialog con el h2 del título.
    // Si dos AgendaSheets coexistieran, los IDs serían únicos.
    var titleId = React.useId ? React.useId() : 'agenda-title';

    // Ref al sheet inner para focus trap inicial — al abrir, foco al sheet.
    var sheetRef = React.useRef(null);

    // ESC para cerrar (consistente con history/settings sheets). Bail out si
    // user está tipeando en input (a futuro tendremos add-reminder input).
    React.useEffect(function() {
      if (!open) return;
      var onKey = function(e) {
        if (e.key !== 'Escape') return;
        var t = e.target;
        var tag = (t && t.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
        if (onCloseRef.current) onCloseRef.current();
      };
      window.addEventListener('keydown', onKey);
      // Mover foco al sheet container al abrir — reduce confusión para
      // keyboard/screen-reader users (audit CRIT-1). El container es
      // tabIndex=-1 para poder recibir foco programático sin estar en el
      // tab order natural.
      if (sheetRef.current) {
        try { sheetRef.current.focus({ preventScroll: true }); } catch (_) {}
      }
      return function() { window.removeEventListener('keydown', onKey); };
    }, [open]);

    if (!open) return null;

    var today = new Date();
    var dayLabel = 'Hoy, ' + formatDayLabel(today);
    var pendingReminders = reminders.filter(function(r) { return !r.completed; }).length;

    var handleAccept = function(id) {
      if (window.__mtxIAAgenda) window.__mtxIAAgenda.acceptProposal(id);
    };
    var handleDismiss = function(id) {
      if (window.__mtxIAAgenda) window.__mtxIAAgenda.dismissProposal(id);
    };
    var handleToggle = function(id) {
      if (window.__mtxIAAgenda) window.__mtxIAAgenda.toggleReminder(id);
    };
    var handleDeleteReminder = function(id) {
      if (window.__mtxIAAgenda) window.__mtxIAAgenda.deleteReminder(id);
    };

    return (
      // Backdrop overlay — role="presentation" porque visualmente decora pero
      // semánticamente es solo un click target para cerrar (audit CRIT-1).
      // Animation mtx-fade-in (opacity puro) en lugar de mtx-fade-up — el
      // backdrop no debería slidear, solo aparecer (audit IMP-1).
      <div role="presentation" style={{
        position: 'absolute', inset: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        animation: 'mtx-fade-in .25s ease',
      }} onClick={onClose}>
        {/* Sheet inner — role="dialog" + aria-modal lo identifica como modal
            para screen readers; aria-labelledby vincula con el h2 "Agenda".
            tabIndex=-1 permite que reciba foco programático sin entrar al
            tab order natural. (audit CRIT-1) */}
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onClick={function(e) { e.stopPropagation(); }}
          style={{
          background: 'rgba(15,19,19,0.94)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderTop: '0.5px solid rgba(255,255,255,0.10)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '14px 0 24px',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
          maxHeight: '88%', overflow: 'auto',
          display: 'flex', flexDirection: 'column',
          animation: 'mtx-fade-up .32s cubic-bezier(.4,1.4,.5,1)',
          outline: 'none', /* sin halo en focus programático */
        }} className="mtx-no-scrollbar">
          {/* Grabber */}
          <div style={{
            width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
            background: 'rgba(255,255,255,0.16)',
            flexShrink: 0,
          }}/>

          {/* Header: título + day pill */}
          <div style={{
            padding: '0 20px 14px',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12,
            flexShrink: 0,
          }}>
            <div>
              <div style={{
                fontSize: 9.5, color: 'var(--ink-4)',
                letterSpacing: '0.16em', textTransform: 'uppercase',
                fontWeight: 600,
                marginBottom: 4,
                fontFamily: 'var(--ff-sans)',
              }}>{dayLabel}</div>
              <h2 id={titleId} style={{
                margin: 0, fontSize: 22, fontWeight: 600,
                color: 'var(--ink-1)', letterSpacing: '-0.02em',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                lineHeight: 1.1,
              }}>Agenda</h2>
            </div>
            {/* Mini stat chip: cuántos pendientes hoy */}
            <div style={{
              padding: '6px 12px', borderRadius: 999,
              background: 'rgba(61,255,209,0.06)',
              border: '0.5px solid rgba(61,255,209,0.20)',
              fontSize: 11, fontWeight: 600,
              color: 'var(--neon)',
              letterSpacing: '-0.005em',
              fontFamily: 'var(--ff-sans)',
              fontVariantNumeric: 'tabular-nums',
            }}>{events.length} eventos · {pendingReminders} pendientes</div>
          </div>

          {/* ── Sección: Propuestas del coach ──────────────────────────── */}
          {proposals.length > 0 && (
            <div style={{ padding: '4px 16px 16px', flexShrink: 0 }}>
              <div className="mtx-eyebrow" style={{
                fontSize: 9.5, padding: '0 4px 10px',
                color: 'var(--ink-4)',
                letterSpacing: '0.14em',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <IcSparkles size={11} stroke="var(--neon)" strokeWidth={1.8}/>
                <span>PROPUESTAS DEL COACH</span>
              </div>
              {proposals.map(function(p) {
                return (
                  <ProposalCard key={p.id}
                    proposal={p}
                    onAccept={handleAccept}
                    onDismiss={handleDismiss}
                  />
                );
              })}
            </div>
          )}

          {/* ── Sección: Eventos del día ────────────────────────────────── */}
          <div style={{ padding: '0 20px 16px', flexShrink: 0 }}>
            <div className="mtx-eyebrow" style={{
              fontSize: 9.5, padding: '0 0 6px',
              color: 'var(--ink-4)',
              letterSpacing: '0.14em',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <IcCalendar size={11} stroke="var(--ink-3)" strokeWidth={1.8}/>
              <span>HOY · {events.length} EVENTOS</span>
            </div>
            {events.length === 0 ? (
              <div style={{
                padding: '24px 0', textAlign: 'center',
                fontSize: 12.5, color: 'var(--ink-4)',
                fontFamily: 'var(--ff-sans)',
              }}>Tu día está libre. ¿Qué quieres lograr?</div>
            ) : (
              events.map(function(ev) {
                return <EventRow key={ev.id} event={ev}/>;
              })
            )}
          </div>

          {/* ── Sección: Recordatorios ──────────────────────────────────── */}
          <div style={{ padding: '4px 20px 8px', flexShrink: 0 }}>
            <div className="mtx-eyebrow" style={{
              fontSize: 9.5, padding: '0 0 6px',
              color: 'var(--ink-4)',
              letterSpacing: '0.14em',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <IcBell size={11} stroke="var(--ink-3)" strokeWidth={1.8}/>
              <span>RECORDATORIOS · {pendingReminders} ACTIVOS</span>
            </div>
            {reminders.length === 0 ? (
              <div style={{
                padding: '24px 0', textAlign: 'center',
                fontSize: 12.5, color: 'var(--ink-4)',
                fontFamily: 'var(--ff-sans)',
              }}>Sin recordatorios. Pídele al coach que te recuerde algo.</div>
            ) : (
              reminders.map(function(r) {
                return (
                  <ReminderRow key={r.id}
                    reminder={r}
                    onToggle={handleToggle}
                    onDelete={handleDeleteReminder}
                  />
                );
              })
            )}
          </div>

          {/* Footer hint: el coach está pendiente */}
          <div style={{
            padding: '14px 20px 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 11, color: 'var(--ink-4)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            flexShrink: 0,
          }}>
            <IcSparkles size={10} stroke="var(--ink-4)" strokeWidth={1.6}/>
            <span>Coach Mentex está observando tu día</span>
          </div>
        </div>
      </div>
    );
  }


  // ── AddReminderSheet — mini-sheet simple para crear recordatorio ──────────
  // Diseño deliberadamente minimalista: input título (autofocus) + input time
  // nativo (HTML5, abre picker del SO en mobile) + toggle "Diario" + dos
  // botones Cancelar/Crear. Reutilizable desde HomeActive y futuros entry
  // points (ej. botón flotante en la agenda).
  function AddReminderSheet(props) {
    var open = props.open;
    var onClose = props.onClose;
    var toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : { show: function() {} };

    var titleState = React.useState('');
    var title = titleState[0]; var setTitle = titleState[1];
    var timeState = React.useState('09:00');
    var time = timeState[0]; var setTime = timeState[1];
    var dailyState = React.useState(false);
    var daily = dailyState[0]; var setDaily = dailyState[1];

    var titleId = React.useId ? React.useId() : 'add-reminder-title';
    var inputRef = React.useRef(null);
    var sheetRef = React.useRef(null);

    // onClose ref + ESC handler — mismo patrón que AgendaSheet (audit IMP-5)
    var onCloseRef = React.useRef(onClose);
    React.useEffect(function() { onCloseRef.current = onClose; });

    React.useEffect(function() {
      if (!open) return;
      // Reset form al abrir
      setTitle('');
      setTime('09:00');
      setDaily(false);
      // Focus input título tras la animación
      var t = setTimeout(function() {
        if (inputRef.current) {
          try { inputRef.current.focus(); } catch (_) {}
        }
      }, 280);
      var onKey = function(e) {
        if (e.key !== 'Escape') return;
        var tgt = e.target;
        var tag = (tgt && tgt.tagName) || '';
        // Aquí SÍ permitimos ESC desde input (cerrar el modal completo es lo
        // esperado). Es excepción al patrón de AgendaSheet — el user puede
        // estar tipeando y querer cancelar, no es un editor de larga vida.
        if (onCloseRef.current) onCloseRef.current();
      };
      window.addEventListener('keydown', onKey);
      if (sheetRef.current) {
        try { sheetRef.current.focus({ preventScroll: true }); } catch (_) {}
      }
      return function() {
        clearTimeout(t);
        window.removeEventListener('keydown', onKey);
      };
    }, [open]);

    if (!open) return null;

    var canCreate = title.trim().length > 0;

    var handleCreate = function() {
      if (!canCreate) return;
      var reminder = {
        title: title.trim(),
        time: time,
        recurrence: daily ? 'daily' : null,
      };
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
          onClick={function(e) { e.stopPropagation(); }}
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
          {/* Grabber */}
          <div style={{
            width: 36, height: 4, borderRadius: 999, margin: '0 auto 4px',
            background: 'rgba(255,255,255,0.16)',
            flexShrink: 0,
          }}/>

          {/* Título del modal */}
          <div>
            <div style={{
              fontSize: 9.5, color: 'var(--ink-4)',
              letterSpacing: '0.16em', textTransform: 'uppercase',
              fontWeight: 600, marginBottom: 4,
              fontFamily: 'var(--ff-sans)',
            }}>NUEVO RECORDATORIO</div>
            <h3 id={titleId} style={{
              margin: 0, fontSize: 18, fontWeight: 600,
              color: 'var(--ink-1)', letterSpacing: '-0.015em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
            }}>¿Qué te recuerdo?</h3>
          </div>

          {/* Input título — Enter submit si título válido (audit IMP-2).
              Patrón mobile estándar: "return" del keyboard creates el reminder
              sin requerir tap del botón Crear. */}
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={function(e) { setTitle(e.target.value); }}
            onKeyDown={function(e) {
              if (e.key === 'Enter' && !e.shiftKey && title.trim()) {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="Ej: Beber agua, llamar a..."
            maxLength={80}
            style={{
              appearance: 'none',
              padding: '12px 14px',
              borderRadius: 12,
              border: '0.5px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--ink-1)',
              fontSize: 14, fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              outline: 'none',
              transition: 'border-color .2s, background .2s',
            }}
            onFocus={function(e) {
              e.target.style.borderColor = 'rgba(61,255,209,0.40)';
              e.target.style.background = 'rgba(61,255,209,0.04)';
            }}
            onBlur={function(e) {
              e.target.style.borderColor = 'rgba(255,255,255,0.10)';
              e.target.style.background = 'rgba(255,255,255,0.03)';
            }}
          />

          {/* Time picker + Daily toggle row.
              Ambas columnas con flex:1 (50/50) y altura fija 44px en los
              controles para que input nativo de time y el button tengan la
              misma altura visual (antes el input se veía más alto por el
              padding interno + clock icon nativo). box-sizing:border-box
              garantiza que el padding no agregue al height. */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10, color: 'var(--ink-4)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                fontWeight: 600, marginBottom: 6,
                fontFamily: 'var(--ff-sans)',
              }}>HORA</div>
              <input
                type="time"
                value={time}
                onChange={function(e) { setTime(e.target.value); }}
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  width: '100%',
                  height: 44,
                  boxSizing: 'border-box',
                  padding: '0 14px',
                  borderRadius: 12,
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--ink-1)',
                  fontSize: 14, fontFamily: 'var(--ff-sans)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.005em',
                  outline: 'none',
                  colorScheme: 'dark',
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10, color: 'var(--ink-4)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                fontWeight: 600, marginBottom: 6,
                fontFamily: 'var(--ff-sans)',
              }}>FRECUENCIA</div>
              <button
                onClick={function() { setDaily(function(d) { return !d; }); }}
                aria-pressed={daily}
                aria-label={daily ? 'Desactivar diario' : 'Repetir cada día'}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  width: '100%',
                  height: 44,
                  boxSizing: 'border-box',
                  padding: '0 14px',
                  borderRadius: 12,
                  border: '0.5px solid ' + (daily ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.10)'),
                  background: daily
                    ? 'linear-gradient(180deg, rgba(61,255,209,0.16), rgba(61,255,209,0.04))'
                    : 'rgba(255,255,255,0.03)',
                  color: daily ? 'var(--neon)' : 'var(--ink-2)',
                  fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: daily ? '0 0 0 1px rgba(61,255,209,0.18), inset 0 0 12px rgba(61,255,209,0.06)' : 'none',
                  transition: 'background .2s, border-color .2s, color .2s',
                }}>
                {daily ? '✓ Diario' : 'Una vez'}
              </button>
            </div>
          </div>

          {/* Botones Cancelar / Crear — auto-width alineados a la derecha
              (patrón iOS estándar). Antes con flex:1 ambos llenaban todo el
              ancho del modal y se sentían macizos. */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 8,
            marginTop: 4,
          }}>
            <button
              onClick={onClose}
              aria-label="Cancelar nuevo recordatorio"
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '10px 18px', borderRadius: 999,
                border: '0.5px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                color: 'var(--ink-3)',
                fontSize: 13.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
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
                  ? 'linear-gradient(180deg, rgba(61,255,209,0.20), rgba(61,255,209,0.08))'
                  : 'rgba(255,255,255,0.02)',
                color: canCreate ? 'var(--neon)' : 'var(--ink-4)',
                fontSize: 13.5, fontWeight: 700,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                boxShadow: canCreate ? '0 0 0 1px rgba(61,255,209,0.20), inset 0 0 14px rgba(61,255,209,0.08)' : 'none',
                opacity: canCreate ? 1 : 0.6,
                transition: 'background .2s, border-color .2s, color .2s, opacity .2s',
              }}>Crear</button>
          </div>
        </div>
      </div>
    );
  }


  // ── HomeRemindersCard — sección embebible para el HomeActive ──────────────
  // Reutiliza ReminderRow + addReminderSheet. Lee directo del store global
  // (single source — los mismos reminders que ve la agenda y el coach IA).
  // Empty state amable cuando no hay ninguno; CTA "Agregar" que abre el sheet.
  function HomeRemindersCard() {
    var nav = useIAAgenda();
    var reminders = nav.reminders || [];
    var addOpenState = React.useState(false);
    var addOpen = addOpenState[0]; var setAddOpen = addOpenState[1];
    var pendingCount = reminders.filter(function(r) { return !r.completed; }).length;

    // Portal del AddReminderSheet a #mtx-overlay-root — HomeRemindersCard
    // vive dentro de HomeActive → .mtx-bg (scrollable). Si renderizamos el
    // sheet inline aquí, position:absolute+inset:0 ancla al fondo del
    // contenido scrolleable, no al viewport del iPhone — el sheet flota
    // al medio de la pantalla en vez de dockear al menú inferior. Mismo
    // bug que reportó Phase 2 CRIT-1 (sheets en explore-flow.jsx). El
    // portal root es hermano de .mtx-bg, así que ancla al iPhone viewport.
    //
    // useMemo: portalRoot lookup solo se hace una vez (audit IMP-3). El
    // mtx-overlay-root es estático en Mentex Home.html así que no cambia.
    // useCallback: handleAddClose se memoiza para que AddReminderSheet
    // no re-registre keydown listener en cada render del card (audit IMP-4).
    var portalRoot = React.useMemo(function() {
      return (typeof document !== 'undefined')
        ? document.getElementById('mtx-overlay-root')
        : null;
    }, []);
    var handleAddClose = React.useCallback(function() { setAddOpen(false); }, []);
    var sheetEl = addOpen
      ? <AddReminderSheet open={true} onClose={handleAddClose}/>
      : null;
    var portalledSheet = sheetEl
      ? (portalRoot && window.ReactDOM ? window.ReactDOM.createPortal(sheetEl, portalRoot) : sheetEl)
      : null;

    var handleToggle = function(id) {
      if (window.__mtxIAAgenda) window.__mtxIAAgenda.toggleReminder(id);
    };
    var handleDelete = function(id) {
      if (window.__mtxIAAgenda) window.__mtxIAAgenda.deleteReminder(id);
    };

    return (
      <div style={{ marginBottom: 24 }}>
        {/* Header — usa MtxSectionHead si está disponible, fallback inline.
            Mismo patrón visual que "Tu ritual de hoy" arriba. */}
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
              fontWeight: 600, marginBottom: 4,
              fontFamily: 'var(--ff-sans)',
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
            // Empty state amable — CTA principal en lugar de "+ Agregar" pequeño.
            <div style={{
              padding: '14px 18px',
              borderRadius: 14,
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
                  fontSize: 12, color: 'var(--ink-3)',
                  fontFamily: 'var(--ff-sans)', marginTop: 2,
                }}>El coach Mentex hará seguimiento de los que agregues.</div>
              </div>
              <button
                onClick={function() { setAddOpen(true); }}
                aria-label="Agregar primer recordatorio"
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '8px 14px', borderRadius: 999,
                  border: '0.5px solid rgba(61,255,209,0.40)',
                  background: 'linear-gradient(180deg, rgba(61,255,209,0.18), rgba(61,255,209,0.06))',
                  color: 'var(--neon)',
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  boxShadow: '0 0 0 1px rgba(61,255,209,0.16), inset 0 0 12px rgba(61,255,209,0.06)',
                  flexShrink: 0,
                }}>Agregar</button>
            </div>
          ) : (
            <div style={{
              padding: '4px 12px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.02)',
              border: '0.5px solid rgba(255,255,255,0.04)',
            }}>
              {reminders.map(function(r) {
                return (
                  <ReminderRow key={r.id}
                    reminder={r}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                );
              })}
              {/* Botón inline "+ Agregar" debajo de la lista, full-width */}
              <button
                onClick={function() { setAddOpen(true); }}
                aria-label="Agregar nuevo recordatorio"
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  width: '100%', marginTop: 4,
                  padding: '11px 8px', borderRadius: 10,
                  border: 0, background: 'transparent',
                  color: 'var(--ink-3)',
                  fontSize: 12.5, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'color .2s, background .2s',
                }}
                onMouseEnter={function(e) { e.currentTarget.style.color = 'var(--neon)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.color = 'var(--ink-3)'; }}
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


  // ── Export al window ──────────────────────────────────────────────────────
  Object.assign(window, {
    AgendaSheet: AgendaSheet,
    useIAAgenda: useIAAgenda,
    AddReminderSheet: AddReminderSheet,
    HomeRemindersCard: HomeRemindersCard,
    // ReminderRow expuesto para reuso externo si se necesita en el futuro.
    ReminderRow: ReminderRow,
  });

})();
