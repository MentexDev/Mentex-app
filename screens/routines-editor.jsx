// routines-editor.jsx — Editor de rutinas: lista con swipe-delete, reorder, + crear

// 12 íconos curados disponibles para rutinas custom
const ROUTINE_ICONS = [
  { id: 'leaf',     Ic: IcLeaf,     label: 'Hoja' },
  { id: 'brain',    Ic: IcBrain,    label: 'Mente' },
  { id: 'book',     Ic: IcBook,     label: 'Libro' },
  { id: 'heart',    Ic: IcHeart,    label: 'Corazón' },
  { id: 'flame',    Ic: IcFlame,    label: 'Fuego' },
  { id: 'wind',     Ic: IcWind,     label: 'Aire' },
  { id: 'dumbbell', Ic: IcDumbbell, label: 'Cuerpo' },
  { id: 'target',   Ic: IcTarget,   label: 'Foco' },
  { id: 'spark',    Ic: IcSpark,    label: 'Energía' },
  { id: 'eye',      Ic: IcEye,      label: 'Atención' },
  { id: 'mic',      Ic: IcMic,      label: 'Voz' },
  { id: 'zap',      Ic: IcZap,      label: 'Acción' },
];

const getIconById = (id) => {
  const found = ROUTINE_ICONS.find(i => i.id === id);
  return found ? found.Ic : IcLeaf;
};

// 3 colores accent
const ROUTINE_COLORS = [
  { id: 'neon',   value: '#3DFFD1', label: 'Verde' },
  { id: 'purple', value: '#9B8AFF', label: 'Púrpura' },
  { id: 'blue',   value: '#5EC3FF', label: 'Azul' },
];

const getColorById = (id) => {
  const found = ROUTINE_COLORS.find(c => c.id === id);
  return found ? found.value : '#3DFFD1';
};

// ─────────────────────────────────────────────────────────────
// RoutinesEditorSheet — listado completo con acciones
// ─────────────────────────────────────────────────────────────
function RoutinesEditorSheet({ routines, activeIds, onChange, onActiveChange, onClose }) {
  const [exiting, setExiting] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null); // routine being edited
  const [menuOpenId, setMenuOpenId] = React.useState(null); // id of routine whose menu is open
  const [bouncingId, setBouncingId] = React.useState(null);
  const toast = useToast();

  // ESC para cerrar
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !createOpen && !editing) handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [createOpen, editing]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose && onClose(), 300);
  };

  const handleCreate = (newRoutine) => {
    const withFlag = { ...newRoutine, isDefault: false };
    const updated = [...routines, withFlag];
    newRoutine = withFlag;
    onChange(updated);
    onActiveChange([...activeIds, newRoutine.id]);
    setCreateOpen(false);
    setBouncingId(newRoutine.id);
    setTimeout(() => setBouncingId(null), 700);
    toast.show({ message: `"${newRoutine.label}" añadida`, action: null, duration: 2400 });
  };

  const handleEdit = (updated) => {
    const next = routines.map(r => r.id === updated.id ? updated : r);
    onChange(next);
    setEditing(null);
    toast.show({ message: 'Cambios guardados', duration: 2200 });
  };

  const handleDelete = (routine) => {
    const idx = routines.findIndex(r => r.id === routine.id);
    const wasActive = activeIds.includes(routine.id);
    const nextRoutines = routines.filter(r => r.id !== routine.id);
    const nextActive = activeIds.filter(id => id !== routine.id);
    onChange(nextRoutines);
    if (wasActive) onActiveChange(nextActive);
    toast.show({
      message: `"${routine.label}" eliminada`,
      action: 'Deshacer',
      duration: 4500,
      onAction: () => {
        // Re-insertar en su posición original
        const restored = [...nextRoutines];
        restored.splice(idx, 0, routine);
        onChange(restored);
        if (wasActive) onActiveChange([...nextActive, routine.id]);
        setBouncingId(routine.id);
        setTimeout(() => setBouncingId(null), 700);
      },
    });
  };

  const handleDuplicate = (routine) => {
    const newId = `${routine.id}-copy-${Date.now().toString(36)}`;
    const dup = { ...routine, id: newId, label: `${routine.label} (copia)`, isDefault: false };
    const idx = routines.findIndex(r => r.id === routine.id);
    const next = [...routines];
    next.splice(idx + 1, 0, dup);
    onChange(next);
    setBouncingId(newId);
    setTimeout(() => setBouncingId(null), 700);
    toast.show({ message: 'Rutina duplicada', duration: 2200 });
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column',
      animation: exiting ? 'sheetFadeOut .28s ease forwards' : 'sheetFadeIn .32s ease forwards',
    }}>
      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}/>

      {/* Sheet */}
      <div className="mtx-glass" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: '88%',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        background: 'rgba(14,17,20,0.96)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderBottom: 0,
        boxShadow: '0 -30px 80px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: exiting ? 'sheetSlideOut .28s cubic-bezier(.4,0,1,1) forwards'
                           : 'sheetSlideIn .42s cubic-bezier(.34,1.4,.64,1) forwards',
      }}>
        {/* Grabber */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 18px', display:'flex', alignItems:'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.02em', fontFamily: 'var(--ff-sans)' }}>
              Tus rutinas
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
              Hábitos que dan forma a tu sesión
            </div>
          </div>
          <button onClick={handleClose} className="mtx-tap" style={{
            width: 32, height: 32, borderRadius: 999, border: 0,
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--ink-2)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcClose size={16} stroke="currentColor"/>
          </button>
        </div>

        {/* Lista scrollable */}
        <div
          onClick={(e) => {
            // Cerrar menú al tocar fuera
            if (!e.target.closest('[data-routine-menu]')) setMenuOpenId(null);
          }}
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 4, paddingBottom: 96 }}>
          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {routines.map((r) => (
              <RoutineRow
                key={r.id}
                routine={r}
                bouncing={bouncingId === r.id}
                menuOpen={menuOpenId === r.id}
                onMenuToggle={() => setMenuOpenId(prev => prev === r.id ? null : r.id)}
                onMenuClose={() => setMenuOpenId(null)}
                onEdit={() => { setMenuOpenId(null); setEditing(r); }}
                onDuplicate={() => { setMenuOpenId(null); handleDuplicate(r); }}
                onDelete={() => { setMenuOpenId(null); handleDelete(r); }}
              />
            ))}

            {/* + Crear nueva */}
            <button onClick={() => setCreateOpen(true)} className="mtx-tap" style={{
              marginTop: 6,
              appearance: 'none', cursor: 'pointer',
              padding: '14px 16px',
              borderRadius: 14,
              border: '0.5px dashed rgba(61,255,209,0.30)',
              background: 'rgba(61,255,209,0.04)',
              color: 'var(--neon)',
              fontFamily: 'var(--ff-sans)', fontSize: 13, fontWeight: 600,
              letterSpacing: '-0.005em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: 'inset 0 0 16px rgba(61,255,209,0.04)',
            }}>
              <IcPlus size={15} stroke="currentColor" strokeWidth={2.4}/>
              Crear rutina propia
            </button>
          </div>
        </div>

        {/* Footer fijo */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '14px 20px 22px',
          background: 'linear-gradient(180deg, rgba(14,17,20,0) 0%, rgba(14,17,20,0.95) 30%, rgba(14,17,20,0.98) 100%)',
          display: 'flex', alignItems: 'center', gap: 10,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Activas hoy
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.02em', marginTop: 1 }}>
              {activeIds.length} de {routines.length}
            </div>
          </div>
          <button onClick={handleClose} className="mtx-btn-neon mtx-tap" style={{ minWidth: 110 }}>
            <IcCheck size={14} stroke="currentColor" strokeWidth={2.4}/> Listo
          </button>
        </div>
      </div>

      {/* Sheet anidado: crear/editar */}
      {createOpen && (
        <RoutineCreateSheet
          mode="create"
          onSave={handleCreate}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {editing && (
        <RoutineCreateSheet
          mode="edit"
          initial={editing}
          onSave={handleEdit}
          onClose={() => setEditing(null)}
        />
      )}

      <style>{`
        @keyframes mtxRoutineBounce {
          0%   { transform: scale(0.9) translateY(-6px); opacity: 0.5; }
          40%  { transform: scale(1.04) translateY(2px); opacity: 1; }
          70%  { transform: scale(0.98) translateY(0); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes mtxPopIn {
          from { opacity: 0; transform: scale(0.92) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RoutineRow — fila con tap para editar; menú "···" solo en custom
// ─────────────────────────────────────────────────────────────
function RoutineRow({ routine: r, bouncing, menuOpen, onMenuToggle, onMenuClose, onEdit, onDuplicate, onDelete }) {
  const Ic = r.Ic || getIconById(r.iconId);
  const accent = r.accent || getColorById(r.colorId);
  const isDefault = r.isDefault === true;

  return (
    <div
      data-routine-menu
      style={{
        position: 'relative',
        animation: bouncing ? 'mtxRoutineBounce .7s cubic-bezier(.34,1.56,.64,1)' : 'none',
      }}>
      {/* Fila */}
      <div
        onClick={() => { if (menuOpen) onMenuClose(); else onEdit(); }}
        className="mtx-tap"
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px',
          borderRadius: 14,
          background: 'var(--glass-2)',
          border: '0.5px solid var(--glass-stroke)',
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          userSelect: 'none',
        }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: `linear-gradient(180deg, ${accent}24, ${accent}06)`,
          border: `0.5px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
          flexShrink: 0,
          boxShadow: `inset 0 0 12px ${accent}10`,
        }}>
          <Ic size={18} stroke="currentColor"/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
              {r.label}
            </div>
            {!isDefault && (
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '2px 6px', borderRadius: 4,
                background: 'rgba(61,255,209,0.10)',
                border: '0.5px solid rgba(61,255,209,0.22)',
                color: 'var(--neon)',
              }}>Tuya</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
            {r.dur}{r.kind ? ` · ${r.kind}` : ''}
          </div>
        </div>

        {/* Botón "···" solo si es custom */}
        {!isDefault ? (
          <button
            onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
            className="mtx-tap"
            aria-label="Opciones"
            style={{
              appearance: 'none', cursor: 'pointer',
              width: 32, height: 32, borderRadius: 8, border: 0,
              background: menuOpen ? 'rgba(255,255,255,0.10)' : 'transparent',
              color: 'var(--ink-2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="5" cy="12" r="1.4" fill="currentColor"/>
              <circle cx="12" cy="12" r="1.4" fill="currentColor"/>
              <circle cx="19" cy="12" r="1.4" fill="currentColor"/>
            </svg>
          </button>
        ) : (
          <div style={{ color: 'var(--ink-3)', opacity: 0.4 }}>
            <IcChevR size={16} stroke="currentColor"/>
          </div>
        )}
      </div>

      {/* Popover menú (solo custom) */}
      {menuOpen && !isDefault && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 8,
            zIndex: 5,
            minWidth: 168,
            padding: 6,
            borderRadius: 12,
            background: 'rgba(22,26,30,0.98)',
            border: '0.5px solid rgba(255,255,255,0.10)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex', flexDirection: 'column', gap: 2,
            animation: 'mtxPopIn .14s ease-out',
          }}>
          <button onClick={onEdit} className="mtx-tap" style={menuItemStyle()}>
            <IcEdit size={14} stroke="currentColor"/> Editar
          </button>
          <button onClick={onDuplicate} className="mtx-tap" style={menuItemStyle()}>
            <IcPlus size={14} stroke="currentColor"/> Duplicar
          </button>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 4px' }}/>
          <button onClick={onDelete} className="mtx-tap" style={menuItemStyle('#FF6B70')}>
            <IcClose size={13} stroke="currentColor" strokeWidth={2.4}/> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

const menuItemStyle = (color) => ({
  appearance: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 12px',
  borderRadius: 8, border: 0,
  background: 'transparent',
  color: color || 'var(--ink-1)',
  fontFamily: 'var(--ff-sans)', fontSize: 13, fontWeight: 500,
  letterSpacing: '-0.005em',
  textAlign: 'left',
  width: '100%',
});

// ─────────────────────────────────────────────────────────────
// RoutineCreateSheet — wizard de crear/editar rutina
// ─────────────────────────────────────────────────────────────
function RoutineCreateSheet({ mode = 'create', initial, onSave, onClose }) {
  const [name, setName] = React.useState(initial?.label || '');
  const [duration, setDuration] = React.useState(() => {
    if (!initial?.dur) return 15;
    const m = initial.dur.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 15;
  });
  const [iconId, setIconId] = React.useState(initial?.iconId || 'leaf');
  const [colorId, setColorId] = React.useState(initial?.colorId || 'neon');
  const [exiting, setExiting] = React.useState(false);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose && onClose(), 280);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = initial?.id || `custom-${Date.now().toString(36)}`;
    const Ic = getIconById(iconId);
    const accent = getColorById(colorId);
    onSave({
      id,
      label: trimmed,
      dur: `${duration} min`,
      iconId,
      colorId,
      Ic,
      accent,
      kind: initial?.kind,
    });
  };

  const accent = getColorById(colorId);
  const PreviewIc = getIconById(iconId);
  const canSave = name.trim().length > 0;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 110,
      animation: exiting ? 'sheetFadeOut .26s ease forwards' : 'sheetFadeIn .3s ease forwards',
    }}>
      {/* Backdrop más oscuro */}
      <div onClick={handleClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}/>

      {/* Sheet centrado más alto */}
      <div className="mtx-glass" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: '90%',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        background: 'rgba(10,13,15,0.98)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        borderBottom: 0,
        boxShadow: '0 -40px 100px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: exiting ? 'sheetSlideOut .26s cubic-bezier(.4,0,1,1) forwards'
                           : 'sheetSlideIn .4s cubic-bezier(.34,1.4,.64,1) forwards',
      }}>
        {/* Grabber */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 14px', display:'flex', alignItems:'center', gap: 10 }}>
          <button onClick={handleClose} className="mtx-tap" style={{
            appearance: 'none', border: 0, background: 'transparent',
            color: 'var(--ink-2)', cursor: 'pointer',
            fontFamily: 'var(--ff-sans)', fontSize: 13, fontWeight: 500,
            padding: '6px 0',
          }}>
            Cancelar
          </button>
          <div style={{
            flex: 1, textAlign: 'center',
            fontSize: 15, fontWeight: 600, color: 'var(--ink-1)',
            letterSpacing: '-0.01em', fontFamily: 'var(--ff-sans)',
          }}>
            {mode === 'create' ? 'Nueva rutina' : 'Editar rutina'}
          </div>
          <button onClick={handleSave} disabled={!canSave} className="mtx-tap" style={{
            appearance: 'none', border: 0, background: 'transparent',
            color: canSave ? 'var(--neon)' : 'var(--ink-3)',
            cursor: canSave ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--ff-sans)', fontSize: 13, fontWeight: 600,
            padding: '6px 0',
            textShadow: canSave ? '0 0 12px rgba(61,255,209,0.5)' : 'none',
          }}>
            Guardar
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>

          {/* Preview hero — el ícono+color en grande */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '16px 20px 28px',
          }}>
            <div style={{
              width: 88, height: 88, borderRadius: 24,
              background: `linear-gradient(180deg, ${accent}30, ${accent}08)`,
              border: `0.5px solid ${accent}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: accent,
              boxShadow: `0 0 0 1px ${accent}22, 0 24px 48px -16px ${accent}55, inset 0 0 32px ${accent}10`,
              transition: 'all .35s cubic-bezier(.34,1.56,.64,1)',
            }}>
              <PreviewIc size={42} stroke="currentColor"/>
            </div>
            <div style={{
              marginTop: 14,
              fontSize: 17, fontWeight: 600, color: 'var(--ink-1)',
              letterSpacing: '-0.02em',
              minHeight: 22,
            }}>
              {name || <span style={{ color: 'var(--ink-3)' }}>Tu rutina</span>}
            </div>
            <div style={{ marginTop: 2, fontSize: 12, color: 'var(--ink-3)' }}>
              {duration} min
            </div>
          </div>

          {/* Campo: Nombre */}
          <FieldGroup label="Nombre">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={mode === 'create'}
              maxLength={28}
              placeholder="Ej. Respirar profundo, Caminar, Escribir…"
              style={{
                width: '100%', boxSizing: 'border-box',
                appearance: 'none', border: '0.5px solid rgba(255,255,255,0.10)',
                outline: 'none',
                padding: '13px 14px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--ink-1)',
                fontSize: 14, fontFamily: 'var(--ff-sans)',
                fontWeight: 400,
                letterSpacing: '-0.005em',
              }}
            />
          </FieldGroup>

          {/* Campo: Duración (slider) */}
          <FieldGroup label="Duración" rightSlot={
            <span style={{ fontSize: 13, color: accent, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {duration} min
            </span>
          }>
            <DurationSlider value={duration} onChange={setDuration} accent={accent}/>
          </FieldGroup>

          {/* Campo: Ícono — scroll horizontal */}
          <FieldGroup label="Ícono">
            <div className="mtx-scroll-x" style={{
              display: 'flex', gap: 8,
              padding: '0 0 4px',
            }}>
              {ROUTINE_ICONS.map(({ id, Ic, label }) => {
                const active = iconId === id;
                return (
                  <button key={id} onClick={() => setIconId(id)} className="mtx-tap" style={{
                    flexShrink: 0,
                    appearance: 'none', cursor: 'pointer',
                    width: 52, height: 52, borderRadius: 14,
                    border: active ? `0.5px solid ${accent}66` : '0.5px solid rgba(255,255,255,0.08)',
                    background: active
                      ? `linear-gradient(180deg, ${accent}1f, ${accent}05)`
                      : 'rgba(255,255,255,0.03)',
                    color: active ? accent : 'var(--ink-2)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: active ? `0 0 16px ${accent}40, inset 0 0 16px ${accent}10` : 'none',
                    transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
                    transform: active ? 'scale(1.05)' : 'scale(1)',
                  }} title={label}>
                    <Ic size={22} stroke="currentColor"/>
                  </button>
                );
              })}
            </div>
          </FieldGroup>

          {/* Campo: Color */}
          <FieldGroup label="Color">
            <div style={{ display: 'flex', gap: 10 }}>
              {ROUTINE_COLORS.map(c => {
                const active = colorId === c.id;
                return (
                  <button key={c.id} onClick={() => setColorId(c.id)} className="mtx-tap" style={{
                    flex: 1,
                    appearance: 'none', cursor: 'pointer',
                    height: 48, borderRadius: 12,
                    border: active ? `0.5px solid ${c.value}88` : '0.5px solid rgba(255,255,255,0.08)',
                    background: active
                      ? `linear-gradient(180deg, ${c.value}26, ${c.value}06)`
                      : 'rgba(255,255,255,0.03)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: active ? `0 0 18px ${c.value}50, inset 0 0 14px ${c.value}10` : 'none',
                    transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
                  }}>
                    <span style={{
                      width: 14, height: 14, borderRadius: 999,
                      background: c.value,
                      boxShadow: `0 0 12px ${c.value}88, inset 0 0 4px rgba(255,255,255,0.3)`,
                    }}/>
                    <span style={{
                      fontSize: 12, fontWeight: 500,
                      color: active ? c.value : 'var(--ink-2)',
                      fontFamily: 'var(--ff-sans)',
                    }}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </FieldGroup>

        </div>
      </div>

      <style>{`
        @keyframes mtxRoutineBounce {
          0%   { transform: scale(0.9) translateY(-6px); opacity: 0.5; }
          40%  { transform: scale(1.04) translateY(2px); opacity: 1; }
          70%  { transform: scale(0.98) translateY(0); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes mtxPopIn {
          from { opacity: 0; transform: scale(0.92) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

function FieldGroup({ label, rightSlot, children }) {
  return (
    <div style={{ padding: '10px 20px 18px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8, padding: '0 2px',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>{label}</div>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}

function DurationSlider({ value, onChange, accent }) {
  const min = 5, max = 60, step = 5;
  const pct = ((value - min) / (max - min)) * 100;
  const ticks = [5, 15, 30, 45, 60];

  return (
    <div>
      <div style={{
        position: 'relative',
        height: 44,
        display: 'flex', alignItems: 'center',
      }}>
        {/* Track */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          height: 6, borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.04)',
        }}/>
        {/* Fill */}
        <div style={{
          position: 'absolute', left: 0,
          width: `${pct}%`,
          height: 6, borderRadius: 999,
          background: `linear-gradient(90deg, ${accent}99, ${accent})`,
          boxShadow: `0 0 12px ${accent}66`,
          transition: 'width .15s ease',
        }}/>
        {/* Thumb */}
        <div style={{
          position: 'absolute',
          left: `calc(${pct}% - 12px)`,
          width: 24, height: 24, borderRadius: 999,
          background: '#fff',
          border: `2px solid ${accent}`,
          boxShadow: `0 0 0 1px ${accent}55, 0 4px 14px rgba(0,0,0,0.5), 0 0 18px ${accent}88`,
          transition: 'left .15s ease',
          pointerEvents: 'none',
        }}/>
        {/* Native input invisible para drag */}
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer',
            margin: 0,
            WebkitAppearance: 'none', appearance: 'none',
          }}
        />
      </div>
      {/* Tick marks */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 4, padding: '0 2px',
        fontSize: 10, color: 'var(--ink-3)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {ticks.map(t => (
          <span key={t} style={{
            opacity: value === t ? 1 : 0.55,
            color: value === t ? accent : 'var(--ink-3)',
            fontWeight: value === t ? 600 : 400,
            transition: 'all .2s ease',
          }}>{t}m</span>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  RoutinesEditorSheet, RoutineCreateSheet, RoutineRow,
  ROUTINE_ICONS, ROUTINE_COLORS, getIconById, getColorById,
});
