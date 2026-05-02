// custom-time-modal.jsx — Modal premium para personalizar tiempo

// Atajos rápidos de duración — mismo set que el grid principal del
// HomeInactive (TIME_OPTIONS). Reutilizar el mismo array mantiene la
// coherencia: si en el futuro se agrega "10 h", aparece en ambos lugares.
const _CUSTOM_TIME_PILLS = [
  { v: 15,  label: '15 min' },
  { v: 30,  label: '30 min' },
  { v: 45,  label: '45 min' },
  { v: 60,  label: '1 h'    },
  { v: 120, label: '2 h'    },
  { v: 180, label: '3 h'    },
];

function CustomTimeModal({
  open, onClose, onApply,
  // Valor inicial — si llega, hidrata hours/mins; si no, default 1h 30min.
  // Usado por HomeActive para arrancar el modal con el totalMin actual
  // cuando el user tap el lápiz de la card del cronómetro.
  initialMinutes = null,
  // Mínimo aceptable (en minutos enteros). Pills/values < min se
  // deshabilitan visualmente para no permitir saltar a "completed"
  // instantáneo. Default 1.
  minMinutes = 1,
  // Tiempo ya transcurrido en la sesión activa (para mostrar el subtítulo
  // "Llevas X min de enfoque" cuando aplica). 0 si no hay sesión activa.
  elapsedMinutes = 0,
  // Callback opcional. Si llega, se renderiza una row "Convertir en rutina
  // automática" entre Atajos rápidos y Aplicar (mismo lenguaje visual que
  // las rows del setup, terminada en una flecha circular). Cierra este
  // modal y delega al host para abrir el AutoRoutineCreateSheet.
  onConvertToAuto = null,
  // Título del modal — el host lo override desde el flow de auto-rutina
  // para indicar que el tiempo elegido se aplica a TODOS los días de la
  // rutina, no solo a una sesión puntual.
  title = 'Tiempo de enfoque',
}) {
  const _initH = initialMinutes != null ? Math.floor(initialMinutes / 60) : 1;
  const _initM = initialMinutes != null ? (initialMinutes % 60) : 30;
  const [hours, setHours] = React.useState(_initH);
  const [mins, setMins] = React.useState(_initM);

  // Re-hidratar al abrir (si el user lo abre con un nuevo initialMinutes
  // distinto al previo). Evita que el state quede pegado al primer mount.
  React.useEffect(() => {
    if (!open || initialMinutes == null) return;
    setHours(Math.floor(initialMinutes / 60));
    setMins(initialMinutes % 60);
  }, [open, initialMinutes]);

  if (!open) return null;

  const totalMinutes = hours * 60 + mins;
  const tooShort = totalMinutes < minMinutes;
  const elapsedStr = elapsedMinutes > 0 ? `Llevas ${elapsedMinutes} min de enfoque · ` : '';

  // Tap en una pill → setea hours+mins según el valor del atajo. Pills
  // < minMinutes se deshabilitan para no permitir saltar a completed.
  const applyPill = (v) => {
    if (v < minMinutes) return;
    setHours(Math.floor(v / 60));
    setMins(v % 60);
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
        // padding-bottom 44 (vs 28 previo) deja aire entre el botón Aplicar
        // y el borde inferior del frame del iPhone (espacio para el home
        // indicator de iOS y respiro visual). Top 18 (vs 12) sube un poco
        // el grabber para que no quede pegado al borde redondeado.
        padding: '18px 20px 44px',
        boxShadow: '0 -24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        // maxHeight para que el modal se adapte al contenido natural sin
        // generar espacio vacío abajo. Si el contenido excede 88vh, hace
        // scroll interno; si no, se ajusta justo al contenido.
        maxHeight: '88%', overflow: 'auto',
        animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
      }} className="mtx-no-scrollbar">
        {/* Grabber */}
        <div style={{
          width: 38, height: 4, borderRadius: 999, margin: '0 auto 18px',
          background: 'rgba(255,255,255,0.18)',
        }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mtx-eyebrow" style={{ marginBottom: 4, fontSize: 10 }}>Personalizar</div>
            <h2 className="mtx-h-1" style={{ margin: 0, fontSize: 22, color: 'var(--ink-1)' }}>{title}</h2>
            {elapsedStr && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.4 }}>
                {elapsedStr}elige el nuevo total.
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{
            width: 36, height: 36, borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-1)', cursor: 'pointer', flexShrink: 0,
          }}><IcClose size={16} stroke="currentColor"/></button>
        </div>

        {/* Duration scrolls */}
        <div className="mtx-glass" style={{
          padding: '14px 16px', marginBottom: 14, borderRadius: 20,
          display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center',
        }}>
          <DurationDial label="Horas" value={hours} max={12} onChange={setHours}/>
          <span style={{ fontSize: 32, color: 'var(--ink-4)', fontWeight: 300 }}>:</span>
          <DurationDial label="Minutos" value={mins} max={59} step={5} onChange={setMins}/>
        </div>

        {/* Atajos rápidos — pills con duraciones predefinidas. Tap setea
            hours+mins al valor del atajo. Diseño coherente con el grid
            principal del HomeInactive (mismo TIME_OPTIONS). Pills <
            minMinutes se deshabilitan para no permitir saltar a completed. */}
        <div className="mtx-glass" style={{ padding: '12px 14px 14px', marginBottom: 16, borderRadius: 20 }}>
          <div className="mtx-eyebrow" style={{ marginBottom: 9, fontSize: 10 }}>Atajos rápidos</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {_CUSTOM_TIME_PILLS.map(p => {
              const active = totalMinutes === p.v;
              const disabled = p.v < minMinutes;
              return (
                <button key={p.v}
                  onClick={() => applyPill(p.v)}
                  disabled={disabled}
                  className="mtx-tap"
                  style={{
                    appearance: 'none',
                    height: 42, borderRadius: 12,
                    border: active ? '0.5px solid rgba(61,255,209,0.55)' : '0.5px solid rgba(255,255,255,0.08)',
                    background: active
                      ? 'linear-gradient(180deg, rgba(61,255,209,0.16), rgba(61,255,209,0.06))'
                      : 'rgba(255,255,255,0.04)',
                    color: active ? 'var(--neon)' : 'var(--ink-1)',
                    fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--ff-sans)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.35 : 1,
                    boxShadow: active ? '0 0 0 1px rgba(61,255,209,0.18), inset 0 0 16px rgba(61,255,209,0.10)' : 'none',
                    transition: 'background .25s, border-color .25s, box-shadow .25s',
                  }}>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Convertir en rutina automática — row inline (mismo lenguaje
            visual que las rows del setup en AutoRoutineCreateSheet),
            terminada en una flecha circular. Solo aparece si el host
            provee onConvertToAuto (HomeInactive sí, HomeActive y el
            propio AutoRoutineCreateSheet NO — fromAutoRoutine evita
            loop, elapsed>0 evita confusión mid-sesión). */}
        {onConvertToAuto && (
          <button onClick={() => onConvertToAuto(totalMinutes)} className="mtx-tap" style={{
            appearance: 'none', cursor: 'pointer', textAlign: 'left',
            width: '100%', marginBottom: 14,
            padding: '12px 14px', borderRadius: 16,
            border: '0.5px solid rgba(61,255,209,0.22)',
            background: 'linear-gradient(180deg, rgba(61,255,209,0.06), rgba(61,255,209,0.015))',
            display: 'flex', alignItems: 'center', gap: 12,
            fontFamily: 'var(--ff-sans)',
            transition: 'background .25s, border-color .25s',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(61,255,209,0.22), rgba(61,255,209,0.06))',
              border: '0.5px solid rgba(61,255,209,0.32)',
              color: 'var(--neon)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IcZap size={16} stroke="currentColor" strokeWidth={1.7}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)',
                letterSpacing: '-0.005em',
              }}>
                Convertir en rutina automática
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.35 }}>
                Inicia sola en el horario que elijas
              </div>
            </div>
            <div style={{
              width: 30, height: 30, borderRadius: 999, flexShrink: 0,
              background: 'rgba(61,255,209,0.14)',
              border: '0.5px solid rgba(61,255,209,0.32)',
              color: 'var(--neon)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 0 10px rgba(61,255,209,0.10)',
            }}>
              <IcChevR size={13} stroke="currentColor" strokeWidth={2.2}/>
            </div>
          </button>
        )}

        {/* Apply — deshabilitado si totalMinutes < minMinutes (evita
            saltar a completed inmediato cuando se edita una sesión activa). */}
        <button className="mtx-btn-neon" style={{
          width: '100%',
          opacity: tooShort ? 0.5 : 1,
          cursor: tooShort ? 'not-allowed' : 'pointer',
        }}
        disabled={tooShort}
        onClick={() => {
          if (tooShort) return;
          onApply(totalMinutes);
          onClose();
        }}>
          Aplicar · {hours > 0 ? `${hours}h ` : ''}{mins} min
        </button>
      </div>
    </div>
  );
}

function DurationDial({ label, value, max, step = 1, onChange }) {
  const inc = () => onChange(Math.min(max, value + step));
  const dec = () => onChange(Math.max(0, value - step));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div className="mtx-eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={dec} style={{
          width: 28, height: 28, borderRadius: 999, border: 0,
          background: 'rgba(255,255,255,0.06)', color: 'var(--ink-2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 500,
        }}>−</button>
        <div className="mtx-num" style={{
          fontSize: 38, fontWeight: 600, color: 'var(--ink-1)',
          letterSpacing: '-0.04em', minWidth: 56, textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}>{String(value).padStart(2, '0')}</div>
        <button onClick={inc} style={{
          width: 28, height: 28, borderRadius: 999, border: 0,
          background: 'rgba(61,255,209,0.1)', color: 'var(--neon)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 500,
        }}>+</button>
      </div>
    </div>
  );
}

// TimeField — ahora usado SOLO por AutoRoutineCreateSheet (programación
// horario start/end). Se eliminó del CustomTimeModal cuando se movió la
// programación a la rutina automática.
function TimeField({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>{label}</div>
      <div style={{
        height: 44, borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 600, color: 'var(--ink-1)',
        fontVariantNumeric: 'tabular-nums', cursor: 'pointer',
      }}>{value}</div>
    </div>
  );
}

Object.assign(window, { CustomTimeModal, TimeField });
