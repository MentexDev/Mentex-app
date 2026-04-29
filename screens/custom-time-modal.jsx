// custom-time-modal.jsx — Modal premium para personalizar tiempo

function CustomTimeModal({ open, onClose, onApply }) {
  const [hours, setHours] = React.useState(1);
  const [mins, setMins] = React.useState(30);
  const [repeat, setRepeat] = React.useState(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [makeRoutine, setMakeRoutine] = React.useState(false);
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('17:00');

  if (!open) return null;
  const days = [
    { id: 'mon', label: 'L' }, { id: 'tue', label: 'M' }, { id: 'wed', label: 'X' },
    { id: 'thu', label: 'J' }, { id: 'fri', label: 'V' }, { id: 'sat', label: 'S' }, { id: 'sun', label: 'D' },
  ];
  const toggleDay = (d) => setRepeat(r => r.includes(d) ? r.filter(x => x !== d) : [...r, d]);

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
        padding: '12px 20px 28px',
        boxShadow: '0 -24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        maxHeight: '88%', overflow: 'auto',
        animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
      }} className="mtx-no-scrollbar">
        {/* Grabber */}
        <div style={{
          width: 38, height: 4, borderRadius: 999, margin: '0 auto 18px',
          background: 'rgba(255,255,255,0.18)',
        }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div className="mtx-eyebrow" style={{ marginBottom: 4, fontSize: 10 }}>Personalizar</div>
            <h2 className="mtx-h-1" style={{ margin: 0, fontSize: 22, color: 'var(--ink-1)' }}>Tiempo de enfoque</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{
            width: 36, height: 36, borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-1)', cursor: 'pointer',
          }}><IcClose size={16} stroke="currentColor"/></button>
        </div>

        {/* Duration scrolls */}
        <div className="mtx-glass" style={{
          padding: '14px 16px', marginBottom: 16, borderRadius: 20,
          display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center',
        }}>
          <DurationDial label="Horas" value={hours} max={12} onChange={setHours}/>
          <span style={{ fontSize: 32, color: 'var(--ink-4)', fontWeight: 300 }}>:</span>
          <DurationDial label="Minutos" value={mins} max={59} step={5} onChange={setMins}/>
        </div>

        {/* Schedule */}
        <div className="mtx-glass" style={{ padding: '14px 16px', marginBottom: 16, borderRadius: 20 }}>
          <div className="mtx-eyebrow" style={{ marginBottom: 10, fontSize: 10 }}>Programación</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <TimeField label="Inicio" value={startTime} onChange={setStartTime}/>
            <TimeField label="Final" value={endTime} onChange={setEndTime}/>
          </div>
          <div className="mtx-eyebrow" style={{ marginBottom: 10, fontSize: 10 }}>Repetir</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
            {days.map(d => {
              const on = repeat.includes(d.id);
              return (
                <button key={d.id} onClick={() => toggleDay(d.id)} style={{
                  flex: 1, height: 40, borderRadius: 12, border: 0,
                  background: on ? 'rgba(61,255,209,0.12)' : 'rgba(255,255,255,0.04)',
                  border: on ? '0.5px solid rgba(61,255,209,0.4)' : '0.5px solid rgba(255,255,255,0.06)',
                  color: on ? 'var(--neon)' : 'var(--ink-2)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--ff-sans)',
                }}>{d.label}</button>
              );
            })}
          </div>
        </div>

        {/* Make routine */}
        <div className="mtx-glass" style={{
          padding: 16, marginBottom: 22, borderRadius: 20,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(61,255,209,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--neon)',
          }}><IcZap size={18} stroke="currentColor"/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)' }}>
              Convertir en rutina automática
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
              Inicia esta sesión sola los días seleccionados
            </div>
          </div>
          <button className="mtx-switch" data-on={makeRoutine ? '1' : '0'}
                  onClick={() => setMakeRoutine(v => !v)}><i/></button>
        </div>

        {/* Apply */}
        <button className="mtx-btn-neon" style={{ width: '100%' }}
                onClick={() => { onApply(hours * 60 + mins); onClose(); }}>
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

Object.assign(window, { CustomTimeModal });
