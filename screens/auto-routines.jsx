// auto-routines.jsx — Rutinas automáticas: store global + sheet de creación
// ─────────────────────────────────────────────────────────────────────────────
// HISTORIA:
//   El CustomTimeModal originalmente tenía un toggle "Convertir en rutina
//   automática" + sección de programación (horario, días). El user pidió
//   separar eso en un flow propio, porque crear una rutina automática es
//   una decisión más involucrada que solo elegir un tiempo: implica
//   confirmar QUÉ apps, QUÉ rutinas y EN QUÉ horario se va a iniciar la
//   sesión sola.
//
// COMPONENTES:
//   • __mtxAutoRoutines — store in-memory con add/list/remove + evento
//     mtx:auto-routines-changed para que las Configuraciones (futuro)
//     listen y rendericen la lista de rutinas creadas.
//   • useAutoRoutines() — hook reactivo.
//   • AutoRoutineCreateSheet — bottom sheet para configurar la rutina.
//     Lee el setup actual del HomeInactive (apps, rutinas, tiempo) y
//     permite editarlo in-place via los editores existentes (apps,
//     routines) sin salir del flow. Banner de advertencia si todo vacío.
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxAutoRoutines) return;
  let _data = [];
  const _emit = () => window.dispatchEvent(new CustomEvent('mtx:auto-routines-changed', { detail: { items: [..._data] } }));
  window.__mtxAutoRoutines = {
    list: () => _data.slice(),
    get:  (id) => _data.find(r => r.id === id) || null,
    add: (entry) => {
      const id = entry.id || `auto-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      const next = { ...entry, id, createdAt: entry.createdAt || Date.now() };
      _data = [..._data, next];
      _emit();
      return next;
    },
    update: (id, patch) => {
      _data = _data.map(r => r.id === id ? { ...r, ...patch } : r);
      _emit();
    },
    remove: (id) => {
      const next = _data.filter(r => r.id !== id);
      if (next.length === _data.length) return false;
      _data = next;
      _emit();
      return true;
    },
  };
})();

function useAutoRoutines() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const h = () => force();
    window.addEventListener('mtx:auto-routines-changed', h);
    return () => window.removeEventListener('mtx:auto-routines-changed', h);
  }, []);
  return (typeof window !== 'undefined' && window.__mtxAutoRoutines)
    ? window.__mtxAutoRoutines.list()
    : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoRoutineCreateSheet
// ─────────────────────────────────────────────────────────────────────────────
// Props:
//   open                — boolean
//   onClose             — () => void
//   onCreated           — (autoRoutine) => void  (al tap "Crear")
//   initialMinutes      — number (semilla del tiempo)
//   blockedAppsIds      — string[] (IDs de apps bloqueadas en HomeInactive)
//   selectedRoutineIds  — string[] (IDs de rutinas activas en HomeInactive)
//   appsCatalog         — array global de apps (para resolver labels)
//   routinesCatalog     — array global de rutinas (para resolver labels)
//   onEditTime          — () => void (abre CustomTimeModal con currentMinutes)
//   onEditApps          — () => void (abre AppsEditorSheet)
//   onEditRoutines      — () => void (abre RoutinesEditorSheet)
//
// El sheet lee siempre desde props (controlled). El host (MentexApp)
// mantiene el state global y al regresar del sub-editor se refleja
// automáticamente en el setup tile via re-render.
function AutoRoutineCreateSheet({
  open, onClose, onCreated,
  initialMinutes = 90,
  blockedAppsIds = [],
  selectedRoutineIds = [],
  appsCatalog = [],
  routinesCatalog = [],
  onEditTime = () => {},
  onEditApps = () => {},
  onEditRoutines = () => {},
  // Edit mode props
  editMode = false,
  routineId = null,
  initialDays = null,
  initialStartTime = null,
  initialEndTime = null,
  onSaved = () => {},
  onDelete = () => {},
  baseZIndex = 90,
}) {
  const [days, setDays] = React.useState(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('17:00');
  const [confirmEmpty, setConfirmEmpty] = React.useState(false);

  // Re-set al abrir — usa valores iniciales si los hay (edit mode)
  React.useEffect(() => {
    if (!open) return;
    setDays(initialDays || ['mon', 'tue', 'wed', 'thu', 'fri']);
    setStartTime(initialStartTime || '09:00');
    setEndTime(initialEndTime || '17:00');
    setConfirmEmpty(false);
  }, [open]);

  // ESC handler — consistente con resto de modales. Guard
  // isTypingInEditable por si el user está editando un TimeField en el
  // futuro o cualquier input nuevo, no robarle el Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const t = e.target;
      const tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      onClose && onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const DAYS = [
    { id: 'mon', label: 'L' }, { id: 'tue', label: 'M' }, { id: 'wed', label: 'X' },
    { id: 'thu', label: 'J' }, { id: 'fri', label: 'V' }, { id: 'sat', label: 'S' }, { id: 'sun', label: 'D' },
  ];
  const toggleDay = (d) => setDays(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d]);

  // Resolver labels concretos para los counts y la preview
  const blockedAppsCount = blockedAppsIds.length;
  const blockedAppsPreview = blockedAppsIds
    .map(id => (appsCatalog.find(a => a.id === id) || {}).name)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
  const routinesCount = selectedRoutineIds.length;
  const routinesPreview = selectedRoutineIds
    .map(id => (routinesCatalog.find(r => r.id === id) || {}).label)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');

  const totalH = Math.floor(initialMinutes / 60);
  const totalM = initialMinutes % 60;
  const timeStr = `${totalH > 0 ? `${totalH}h ` : ''}${totalM} min`;

  const isEmptySetup = blockedAppsCount === 0 && routinesCount === 0;
  const canCreate = days.length > 0 && (editMode || !isEmptySetup || confirmEmpty);

  const handleCreate = () => {
    if (!canCreate) return;
    if (editMode) {
      window.__mtxAutoRoutines?.update(routineId, {
        minutes: initialMinutes,
        blockedAppsIds: [...blockedAppsIds],
        routineIds: [...selectedRoutineIds],
        schedule: { startTime, endTime, days: [...days] },
      });
      onSaved?.();
      onClose?.();
    } else {
      const created = window.__mtxAutoRoutines?.add({
        minutes: initialMinutes,
        blockedAppsIds: [...blockedAppsIds],
        routineIds: [...selectedRoutineIds],
        schedule: { startTime, endTime, days: [...days] },
      });
      onCreated?.(created);
      onClose?.();
    }
  };

  return (
    // zIndex 90 (no 110) deliberado: este sheet es el "padre" del flow.
    // Cuando el user tap "Apps a bloquear" o "Rutinas del ritual" desde
    // los SetupTiles, los editores correspondientes (apps-editor /
    // routines-editor / custom-time-modal — todos a zIndex 100) deben
    // renderizar POR ENCIMA de este sheet, no por detrás. Mantener este
    // por debajo evita que el user pierda visibilidad del sub-editor.
    <div style={{
      position: 'absolute', inset: 0, zIndex: baseZIndex,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      animation: 'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'rgba(15,19,19,0.92)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        borderTop: '0.5px solid rgba(255,255,255,0.12)',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        padding: '18px 20px 44px',
        boxShadow: '0 -24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        maxHeight: '88%', overflow: 'auto',
        animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
      }} className="mtx-no-scrollbar">
        <div style={{
          width: 38, height: 4, borderRadius: 999, margin: '0 auto 16px',
          background: 'rgba(255,255,255,0.18)',
        }}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mtx-eyebrow" style={{ marginBottom: 4, fontSize: 10 }}>{editMode ? 'Editar' : 'Personalizar'}</div>
            <h2 className="mtx-h-1" style={{ margin: 0, fontSize: 22, color: 'var(--ink-1)', letterSpacing: '-0.025em' }}>
              {editMode ? 'Editar rutina' : 'Rutina automática'}
            </h2>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.4 }}>
              {editMode ? 'Modifica horario, días, apps o tareas del ritual.' : 'Inicia sola los días que elijas con tu setup actual.'}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{
            width: 36, height: 36, borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-1)', cursor: 'pointer', flexShrink: 0,
          }}><IcClose size={16} stroke="currentColor"/></button>
        </div>

        {/* Horario start/end */}
        <div className="mtx-glass" style={{ padding: '14px 16px', marginBottom: 14, borderRadius: 20 }}>
          <div className="mtx-eyebrow" style={{ marginBottom: 10, fontSize: 10 }}>Horario</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <TimeField label="Inicio" value={startTime} onChange={setStartTime}/>
            <TimeField label="Final" value={endTime} onChange={setEndTime}/>
          </div>
        </div>

        {/* Días */}
        <div className="mtx-glass" style={{ padding: '14px 16px', marginBottom: 14, borderRadius: 20 }}>
          <div className="mtx-eyebrow" style={{ marginBottom: 10, fontSize: 10 }}>Repetir</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
            {DAYS.map(d => {
              const on = days.includes(d.id);
              return (
                <button key={d.id} onClick={() => toggleDay(d.id)} style={{
                  flex: 1, height: 40, borderRadius: 12,
                  border: on ? '0.5px solid rgba(61,255,209,0.4)' : '0.5px solid rgba(255,255,255,0.06)',
                  background: on ? 'rgba(61,255,209,0.12)' : 'rgba(255,255,255,0.04)',
                  color: on ? 'var(--neon)' : 'var(--ink-2)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--ff-sans)',
                  transition: 'background .2s, border-color .2s, color .2s',
                }}>{d.label}</button>
              );
            })}
          </div>
          {days.length === 0 && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#ff8b8b' }}>
              Elige al menos un día.
            </div>
          )}
        </div>

        {/* Setup tiles — Tiempo, Apps, Rutinas */}
        <div className="mtx-eyebrow" style={{ marginBottom: 10, fontSize: 10, padding: '0 4px' }}>Tu setup</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <SetupTile
            Ic={IcClock} accent="#3dffd1"
            label="Tiempo de enfoque"
            value={timeStr}
            onTap={onEditTime}
          />
          <SetupTile
            Ic={IcShield} accent="#5dd3ff"
            label="Apps a bloquear"
            value={blockedAppsCount === 0
              ? 'Sin apps · Toca para añadir'
              : `${blockedAppsCount} ${blockedAppsCount === 1 ? 'app' : 'apps'}${blockedAppsPreview ? ' · ' + blockedAppsPreview : ''}`}
            warning={blockedAppsCount === 0}
            onTap={onEditApps}
          />
          <SetupTile
            Ic={IcSpark} accent="#9b8aff"
            label="Rutinas del ritual"
            value={routinesCount === 0
              ? 'Sin rutinas · Toca para añadir'
              : `${routinesCount} ${routinesCount === 1 ? 'rutina' : 'rutinas'}${routinesPreview ? ' · ' + routinesPreview : ''}`}
            warning={routinesCount === 0}
            onTap={onEditRoutines}
          />
        </div>

        {/* Banner si setup vacío */}
        {isEmptySetup && (
          <div style={{
            padding: '14px 16px', marginBottom: 14, borderRadius: 16,
            background: 'rgba(255,200,80,0.06)',
            border: '0.5px solid rgba(255,200,80,0.22)',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,200,80,0.12)',
              border: '0.5px solid rgba(255,200,80,0.30)',
              color: '#ffc850',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
            }}>!</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)' }}>
                Esta rutina automática no tiene nada activo
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.4 }}>
                Sin apps a bloquear ni rutinas elegidas, solo arrancará un cronómetro de {timeStr}.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={onEditApps} className="mtx-tap" style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '6px 12px', borderRadius: 999,
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--ink-1)',
                  fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--ff-sans)',
                }}>Editar setup</button>
                <button onClick={() => setConfirmEmpty(true)} className="mtx-tap" style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '6px 12px', borderRadius: 999,
                  border: '0.5px solid rgba(255,200,80,0.30)',
                  background: confirmEmpty ? 'rgba(255,200,80,0.16)' : 'rgba(255,200,80,0.06)',
                  color: '#ffc850',
                  fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--ff-sans)',
                }}>{confirmEmpty ? '✓ Crear igual' : 'Crear igual'}</button>
              </div>
            </div>
          </div>
        )}

        {editMode ? (
          <>
            <button className="mtx-btn-neon" style={{
              width: '100%',
              opacity: canCreate ? 1 : 0.5,
              cursor: canCreate ? 'pointer' : 'not-allowed',
            }}
            disabled={!canCreate}
            onClick={handleCreate}>
              <IcCheck size={14} stroke="currentColor" strokeWidth={2.4}/>
              Guardar cambios
            </button>
            <button onClick={() => onDelete?.()} className="mtx-tap" tabIndex={0}
              style={{
                width: '100%', marginTop: 10, height: 56, borderRadius: 'var(--r-pill)',
                cursor: 'pointer', appearance: 'none',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'rgba(255,74,110,0.08)', border: '0.5px solid rgba(255,74,110,0.22)',
                color: '#FF4A6E', fontSize: 16, fontWeight: 600,
                fontFamily: 'var(--ff-sans)', letterSpacing: '-0.01em',
              }}>
              <IcTrash size={15} stroke="#FF4A6E" strokeWidth={1.9}/>
              Eliminar rutina
            </button>
          </>
        ) : (
          <button className="mtx-btn-neon" style={{
            width: '100%',
            opacity: canCreate ? 1 : 0.5,
            cursor: canCreate ? 'pointer' : 'not-allowed',
          }}
          disabled={!canCreate}
          onClick={handleCreate}>
            <IcZap size={14} stroke="currentColor" strokeWidth={2.2}/>
            Crear rutina automática
          </button>
        )}
      </div>
    </div>
  );
}

// SetupTile — card horizontal con icon + label + value + chev. Tap delega
// al editor correspondiente. warning=true → border amarillo + dot.
function SetupTile({ Ic, accent, label, value, warning, onTap }) {
  return (
    <button onClick={onTap} className="mtx-tap" style={{
      appearance: 'none', cursor: 'pointer', textAlign: 'left',
      width: '100%', padding: '12px 14px', borderRadius: 16,
      border: warning
        ? '0.5px solid rgba(255,200,80,0.30)'
        : '0.5px solid rgba(255,255,255,0.06)',
      background: warning
        ? 'rgba(255,200,80,0.04)'
        : 'rgba(255,255,255,0.03)',
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: 'var(--ff-sans)',
      transition: 'background .2s, border-color .2s',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        background: `linear-gradient(135deg, ${accent}26, ${accent}06)`,
        border: `0.5px solid ${accent}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent,
      }}>
        <Ic size={16} stroke="currentColor" strokeWidth={1.7}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ink-3)',
                      letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600,
                      color: warning ? '#ffc850' : 'var(--ink-1)',
                      letterSpacing: '-0.005em',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </div>
      </div>
      <IcChevR size={14} stroke="var(--ink-3)" strokeWidth={1.6}/>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoRoutineCreatedSheet — resumen post-creación
// ─────────────────────────────────────────────────────────────────────────────
// El user pidió reemplazar el toast simple post-creación por un mini-sheet
// que muestre el resumen de lo recién creado: días, horario, tiempo total,
// apps y rutinas. Refuerza el feedback de que la rutina existe ya, y le
// recuerda que vive en Configuraciones para edición/eliminación futura.
//
// Mismo lenguaje visual que AutoRoutineCreateSheet (glass cards, eyebrows,
// day pills) para consistencia. Solo CTA primario "Entendido" — la edición
// se delega al futuro tab de Configuraciones, no se duplica aquí.
//
// Props:
//   open            — boolean
//   routine         — el objeto creado por __mtxAutoRoutines.add()
//   onClose         — () => void
//   appsCatalog     — array global de apps para resolver labels
//   routinesCatalog — array global de rutinas para resolver labels
function AutoRoutineCreatedSheet({
  open, routine, onClose,
  appsCatalog = [],
  routinesCatalog = [],
}) {
  // ESC handler — antes del early return para no violar Hooks Rules.
  // Si el user presiona Escape, dismiss el sheet sin afectar la routine
  // ya persistida en __mtxAutoRoutines (la creación es irreversible
  // desde aquí, solo se puede deshacer en Configuraciones).
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const t = e.target;
      const tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      onClose && onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !routine) return null;

  const totalH = Math.floor(routine.minutes / 60);
  const totalM = routine.minutes % 60;
  const timeStr = `${totalH > 0 ? `${totalH}h ` : ''}${totalM} min`;

  const ALL_DAYS = [
    { id: 'mon', label: 'L', name: 'Lunes' },
    { id: 'tue', label: 'M', name: 'Martes' },
    { id: 'wed', label: 'X', name: 'Miércoles' },
    { id: 'thu', label: 'J', name: 'Jueves' },
    { id: 'fri', label: 'V', name: 'Viernes' },
    { id: 'sat', label: 'S', name: 'Sábado' },
    { id: 'sun', label: 'D', name: 'Domingo' },
  ];
  const selectedDays = routine.schedule?.days || [];
  const startTime = routine.schedule?.startTime || '—';
  const endTime = routine.schedule?.endTime || '—';

  // Resumen humano: "lunes a viernes" / "todos los días" / "L M X" según
  // la cantidad. Sin sobrecomplicar: si son 5 weekdays comunes, decirlo
  // explícitamente; si no, listar las iniciales separadas.
  const WEEKDAYS = ['mon','tue','wed','thu','fri'];
  const WEEKEND  = ['sat','sun'];
  const daysHuman = selectedDays.length === 7
    ? 'todos los días'
    : (selectedDays.length === 5 && WEEKDAYS.every(d => selectedDays.includes(d)))
      ? 'de lunes a viernes'
      : (selectedDays.length === 2 && WEEKEND.every(d => selectedDays.includes(d)))
        ? 'fines de semana'
        : selectedDays.length === 1
          ? `los ${ALL_DAYS.find(d => d.id === selectedDays[0])?.label || ''}`
          : `${selectedDays.length} días/semana`;

  const blockedAppNames = (routine.blockedAppsIds || [])
    .map(id => (appsCatalog.find(a => a.id === id) || {}).name)
    .filter(Boolean);
  const routineLabels = (routine.routineIds || [])
    .map(id => (routinesCatalog.find(r => r.id === id) || {}).label)
    .filter(Boolean);

  // Helper: top-3 + "+N más" si hay más
  const topN = (arr, n = 3) => {
    if (arr.length <= n) return arr.join(' · ');
    return `${arr.slice(0, n).join(' · ')} · +${arr.length - n} más`;
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      animation: 'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'rgba(15,19,19,0.92)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        borderTop: '0.5px solid rgba(255,255,255,0.12)',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        padding: '18px 20px 32px',
        boxShadow: '0 -24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        maxHeight: '88%', overflow: 'auto',
        animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
      }} className="mtx-no-scrollbar">
        <div style={{
          width: 38, height: 4, borderRadius: 999, margin: '0 auto 18px',
          background: 'rgba(255,255,255,0.18)',
        }}/>

        {/* Hero — check icon con halo neon + título centrado */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 22 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 999, marginBottom: 14,
            background: 'radial-gradient(circle at 30% 30%, rgba(94,240,194,0.85), rgba(61,255,209,0.55))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0a1410',
            boxShadow: '0 0 0 1px rgba(61,255,209,0.32), 0 0 28px rgba(61,255,209,0.42), 0 0 60px rgba(61,255,209,0.22)',
          }}>
            <IcCheck size={28} stroke="currentColor" strokeWidth={2.6}/>
          </div>
          <div className="mtx-eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>Creada</div>
          <h2 className="mtx-h-1" style={{ margin: 0, fontSize: 22, color: 'var(--ink-1)', letterSpacing: '-0.025em' }}>
            Tu rutina automática está lista
          </h2>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.45, maxWidth: 320 }}>
            Iniciará sola {daysHuman} entre <strong style={{ color: 'var(--ink-1)', fontWeight: 600 }}>{startTime}</strong> y <strong style={{ color: 'var(--ink-1)', fontWeight: 600 }}>{endTime}</strong>.
          </div>
        </div>

        {/* Card 1 — Days pills (read-only highlight). role=list + role=listitem
            permite que screen readers anuncien la estructura. aria-label
            del wrapper resume los días seleccionados; cada pill tiene
            aria-label con nombre completo del día + estado (activo/inactivo). */}
        <div className="mtx-glass" style={{ padding: '14px 16px', marginBottom: 10, borderRadius: 20 }}>
          <div className="mtx-eyebrow" style={{ marginBottom: 10, fontSize: 10 }}>Repetir</div>
          <div role="list"
               aria-label={`Días activos: ${selectedDays.length === 0
                 ? 'ninguno'
                 : ALL_DAYS.filter(d => selectedDays.includes(d.id)).map(d => d.name).join(', ')}`}
               style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
            {ALL_DAYS.map(d => {
              const on = selectedDays.includes(d.id);
              return (
                <div key={d.id}
                  role="listitem"
                  aria-label={`${d.name}: ${on ? 'activo' : 'inactivo'}`}
                  style={{
                  flex: 1, height: 36, borderRadius: 10,
                  border: on ? '0.5px solid rgba(61,255,209,0.4)' : '0.5px solid rgba(255,255,255,0.04)',
                  background: on ? 'rgba(61,255,209,0.12)' : 'rgba(255,255,255,0.02)',
                  color: on ? 'var(--neon)' : 'var(--ink-4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12.5, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                }}>{d.label}</div>
              );
            })}
          </div>
        </div>

        {/* Card 2 — Setup summary rows */}
        <div className="mtx-glass" style={{ padding: '4px 4px', marginBottom: 14, borderRadius: 20 }}>
          <SummaryRow Ic={IcClock} accent="#3dffd1"
            label="Tiempo de enfoque diario"
            value={timeStr}
            isFirst/>
          <SummaryRow Ic={IcShield} accent="#5dd3ff"
            label="Apps a bloquear"
            value={blockedAppNames.length === 0
              ? 'Ninguna'
              : `${blockedAppNames.length} · ${topN(blockedAppNames)}`}
            muted={blockedAppNames.length === 0}/>
          <SummaryRow Ic={IcSpark} accent="#9b8aff"
            label="Rutinas del ritual"
            value={routineLabels.length === 0
              ? 'Ninguna'
              : `${routineLabels.length} · ${topN(routineLabels)}`}
            muted={routineLabels.length === 0}/>
        </div>

        {/* Nota Configuraciones */}
        <div style={{
          padding: '10px 14px', marginBottom: 14, borderRadius: 14,
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 999, flexShrink: 0,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            color: 'var(--ink-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
            marginTop: 1,
          }}>i</div>
          <div style={{ flex: 1, fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.45 }}>
            Disponible en <strong style={{ color: 'var(--ink-2)', fontWeight: 600 }}>Configuraciones</strong> para editar o eliminar.
          </div>
        </div>

        {/* CTA — Entendido */}
        <button className="mtx-btn-neon" style={{ width: '100%' }} onClick={onClose}>
          <IcCheck size={14} stroke="currentColor" strokeWidth={2.4}/>
          Entendido
        </button>
      </div>
    </div>
  );
}

// SummaryRow — variante read-only del SetupTile (sin chev, sin tap).
// Solo muestra icon · label · value. Reutiliza el lenguaje visual del
// SetupTile pero como elemento informativo dentro de la card de resumen.
function SummaryRow({ Ic, accent, label, value, isFirst, muted }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 14,
      borderTop: isFirst ? 0 : '0.5px solid rgba(255,255,255,0.04)',
      fontFamily: 'var(--ff-sans)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(135deg, ${accent}26, ${accent}06)`,
        border: `0.5px solid ${accent}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent,
        opacity: muted ? 0.55 : 1,
      }}>
        <Ic size={14} stroke="currentColor" strokeWidth={1.7}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 9.5, fontWeight: 700, color: 'var(--ink-3)',
          letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 2,
        }}>{label}</div>
        <div style={{
          fontSize: 12.5, fontWeight: 600,
          color: muted ? 'var(--ink-4)' : 'var(--ink-1)',
          letterSpacing: '-0.005em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{value}</div>
      </div>
    </div>
  );
}

Object.assign(window, { AutoRoutineCreateSheet, AutoRoutineCreatedSheet, useAutoRoutines });
