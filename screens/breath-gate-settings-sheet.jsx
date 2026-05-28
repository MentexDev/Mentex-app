// screens/breath-gate-settings-sheet.jsx — Sprint A.11 · settings drawer
// ─────────────────────────────────────────────────────────────────────────────
//
// Bottom sheet (driver-style) que aparece al tap del botón ⚙ en el BreathGate.
// Sale desde abajo hasta ~78% del viewport, con backdrop dimming.
//
// Contenido:
//   1. Header con drag handle + título + close
//   2. Sección "Modalidad activa" — radio buttons:
//        Mezclado · sorpresa (recomendado)
//        Respiración siempre
//        Imagen motivacional siempre
//        Gratitud siempre
//        Decretos siempre
//   3. Sección "Mezclado incluye" — toggles por modalidad
//        (solo visible cuando activeMode === 'mix')
//   4. Sección "Duración respiración" — chips 5s / 8s / 12s
//        REACTIVA: solo visible si activeMode ∈ { mix, breath, image }
//        (en gratitud/decretos el flow es manual y self-paced)
//   5. Sección "Pausa consciente"
//        Toggle "Activar pausa consciente" (master ON/OFF)
//        Toggle "Permitir saltar" (allowSkip, disabled si master off)
//   6. Footer: "Restablecer valores por defecto"
//
// El sheet se monta DENTRO del BreathGate (no en raíz), por encima de las
// fases, con su propio backdrop. El BreathGate sigue activo detrás.
//
// Reusa primitives:
//   • __mtxColorTokens.core
//   • __mtxUI (si disponible: backdropHandlers, microBtnStyle)
//   • @keyframes mtx-slide-up
//
// Estado: controlado por prop `open` del padre; persiste settings al toggle
// via __mtxBreathGateModes.updateSettings() y __mtxAppsBreak.updateGateSettings()
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.BreathGateSettingsSheet) return;

  function _tokens() {
    return (window.__mtxColorTokens && window.__mtxColorTokens.core) || {
      neon: '#3dffd1', purple: '#9b8aff', sky: '#5a8fff',
    };
  }
  function _vibrate(pattern) {
    try {
      if (navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch (e) { /* no-op */ }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _Toggle — switch reusable inline
  // ──────────────────────────────────────────────────────────────────────────
  function _Toggle(props) {
    var t = _tokens();
    var on = !!props.checked;
    var disabled = !!props.disabled;
    return (
      <button type="button"
        role="switch"
        aria-checked={on}
        aria-label={props.ariaLabel || 'Toggle'}
        disabled={disabled}
        onClick={function() { if (!disabled) props.onChange(!on); }}
        style={{
          appearance: 'none',
          width: 42, height: 24, borderRadius: 999,
          background: on ? t.neon + 'D0' : 'rgba(255,255,255,0.12)',
          border: 0,
          position: 'relative',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background .2s',
          flexShrink: 0,
          opacity: disabled ? 0.5 : 1,
          padding: 0,
        }}>
        <span style={{
          position: 'absolute',
          top: 2,
          left: on ? 20 : 2,
          width: 20, height: 20, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          transition: 'left .2s ease',
        }} aria-hidden="true"/>
      </button>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _Radio — single row selectable
  // ──────────────────────────────────────────────────────────────────────────
  function _Radio(props) {
    var t = _tokens();
    var selected = props.selected;
    return (
      <button type="button"
        role="radio"
        aria-checked={selected}
        onClick={props.onSelect}
        className="mtx-tap"
        style={{
          appearance: 'none', cursor: 'pointer',
          width: '100%',
          padding: '11px 13px',
          borderRadius: 12,
          background: selected ? 'rgba(61,255,209,0.07)' : 'rgba(255,255,255,0.03)',
          border: '0.5px solid ' + (selected ? t.neon + '80' : 'rgba(255,255,255,0.08)'),
          display: 'flex', alignItems: 'center', gap: 11,
          textAlign: 'left',
          transition: 'background .2s, border-color .2s',
          color: 'white',
          fontFamily: 'var(--ff-sans)',
        }}>
        <div style={{
          flexShrink: 0,
          width: 18, height: 18, borderRadius: '50%',
          border: '1.5px solid ' + (selected ? t.neon : 'rgba(255,255,255,0.25)'),
          background: selected ? t.neon : 'transparent',
          position: 'relative',
        }} aria-hidden="true">
          {selected ? (
            <span style={{
              position: 'absolute',
              inset: 4,
              borderRadius: '50%',
              background: '#0a1410',
            }}/>
          ) : null}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 700,
            letterSpacing: '-0.005em',
            lineHeight: 1.25,
          }}>
            <span aria-hidden="true" style={{ marginRight: 6 }}>{props.icon}</span>
            {props.label}
            {props.recommended ? (
              <span style={{
                marginLeft: 6,
                fontSize: 9, fontWeight: 800,
                color: t.neon,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                verticalAlign: 'middle',
              }}>RECOM.</span>
            ) : null}
          </div>
          {props.description ? (
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.55)',
              marginTop: 2,
              lineHeight: 1.4,
              letterSpacing: '0.005em',
            }}>{props.description}</div>
          ) : null}
        </div>
      </button>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _ToggleRow — toggle con label + description (para sección "Mezclado incluye")
  // ──────────────────────────────────────────────────────────────────────────
  function _ToggleRow(props) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 13px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        opacity: props.disabled ? 0.55 : 1,
      }}>
        <div style={{
          fontSize: 18, lineHeight: 1, flexShrink: 0,
        }} aria-hidden="true">{props.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 700,
            color: 'white',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            lineHeight: 1.25,
          }}>{props.label}</div>
          {props.description ? (
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.55)',
              fontFamily: 'var(--ff-sans)',
              marginTop: 2,
              lineHeight: 1.4,
            }}>{props.description}</div>
          ) : null}
        </div>
        <_Toggle
          checked={props.checked}
          onChange={props.onChange}
          ariaLabel={props.label}
          disabled={props.disabled}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _DurationPicker — chips 5 / 8 / 12 segundos
  // ──────────────────────────────────────────────────────────────────────────
  function _DurationPicker(props) {
    var t = _tokens();
    var opts = [
      { v: 5,  label: '5s',  hint: 'rápido' },
      { v: 8,  label: '8s',  hint: 'recomendado' },
      { v: 12, label: '12s', hint: 'profundo' },
    ];
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
      }}>
        {opts.map(function(o) {
          var active = props.value === o.v;
          return (
            <button key={o.v} type="button"
              onClick={function() { props.onChange(o.v); }}
              className="mtx-tap"
              aria-pressed={active}
              aria-label={'Duración respiración ' + o.label + ' · ' + o.hint}
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '11px 10px', borderRadius: 11,
                background: active ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.04)',
                border: '0.5px solid ' + (active ? t.neon + 'BB' : 'rgba(255,255,255,0.10)'),
                color: 'white',
                fontFamily: 'var(--ff-sans)',
                transition: 'background .2s, border-color .2s',
              }}>
              <div style={{
                fontSize: 17, fontWeight: 800,
                color: active ? t.neon : 'white',
                letterSpacing: '-0.01em',
                fontFamily: 'var(--ff-mono, monospace)',
              }}>{o.label}</div>
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.02em',
                marginTop: 2,
              }}>{o.hint}</div>
            </button>
          );
        })}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // _Section — wrapper visual para grupo de opciones
  // ──────────────────────────────────────────────────────────────────────────
  function _Section(props) {
    return (
      <div style={{ marginBottom: 22 }}>
        <div style={{
          fontSize: 10, fontWeight: 800,
          color: 'rgba(255,255,255,0.5)',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 10,
          padding: '0 2px',
        }}>{props.title}</div>
        {props.children}
        {props.footnote ? (
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.4)',
            fontFamily: 'var(--ff-sans)',
            marginTop: 8,
            padding: '0 2px',
            lineHeight: 1.45,
            letterSpacing: '0.005em',
          }}>{props.footnote}</div>
        ) : null}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BreathGateSettingsSheet — driver-style bottom sheet
  // ──────────────────────────────────────────────────────────────────────────
  function BreathGateSettingsSheet(props) {
    // Props: { open, onClose }
    var open = !!props.open;
    var t = _tokens();

    var modesSettingsState = React.useState(function() {
      return (window.__mtxBreathGateModes && window.__mtxBreathGateModes.getSettings()) ||
        { activeMode: 'mix', enabledModes: {}, durationSec: 8 };
    });
    var modesSettings = modesSettingsState[0]; var setModesSettings = modesSettingsState[1];

    var gateSettingsState = React.useState(function() {
      return (window.__mtxAppsBreak && window.__mtxAppsBreak.getGateSettings()) ||
        { enabled: true, durationSec: 8, allowSkip: false };
    });
    var gateSettings = gateSettingsState[0]; var setGateSettings = gateSettingsState[1];

    // Sincronizar con el store cuando se abra
    React.useEffect(function() {
      if (!open) return;
      if (window.__mtxBreathGateModes) {
        setModesSettings(window.__mtxBreathGateModes.getSettings());
      }
      if (window.__mtxAppsBreak) {
        setGateSettings(window.__mtxAppsBreak.getGateSettings());
      }
      // Audit CRIT-7: listener para que el sheet se actualice si otro
      // componente cambia los settings mientras está abierto.
      function onModesChanged() {
        if (window.__mtxBreathGateModes) {
          setModesSettings(window.__mtxBreathGateModes.getSettings());
        }
      }
      function onGateChanged() {
        if (window.__mtxAppsBreak) {
          setGateSettings(window.__mtxAppsBreak.getGateSettings());
        }
      }
      window.addEventListener('mtx:gate-modes-settings-changed', onModesChanged);
      window.addEventListener('mtx:apps-break-changed', onGateChanged);
      return function() {
        window.removeEventListener('mtx:gate-modes-settings-changed', onModesChanged);
        window.removeEventListener('mtx:apps-break-changed', onGateChanged);
      };
    }, [open]);

    // ESC = close. Audit CRIT-4 fix: flag global window.__mtxBreathGateSheetOpen
    // que el gate consulta antes de procesar ESC. stopPropagation no funciona
    // cuando ambos listeners están registrados directamente en window (no hay
    // DOM tree para propagar). El flag es la fuente de verdad.
    React.useEffect(function() {
      if (!open) {
        // Limpiar flag al cerrar
        try { window.__mtxBreathGateSheetOpen = false; } catch (e) {}
        return;
      }
      window.__mtxBreathGateSheetOpen = true;
      function onKey(e) {
        if (e.isComposing || e.keyCode === 229) return;
        if (e.key === 'Escape') {
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
          handleClose();
        }
      }
      window.addEventListener('keydown', onKey, true);  // capture phase para llegar antes
      return function() {
        window.removeEventListener('keydown', onKey, true);
        try { window.__mtxBreathGateSheetOpen = false; } catch (e) {}
      };
    }, [open]);

    function handleClose() {
      _vibrate(20);
      if (props.onClose) props.onClose();
    }

    function selectMode(mode) {
      _vibrate(30);
      var next = (window.__mtxBreathGateModes &&
        window.__mtxBreathGateModes.updateSettings({ activeMode: mode })) ||
        Object.assign({}, modesSettings, { activeMode: mode });
      setModesSettings(next);
    }

    function toggleEnabledMode(mode, on) {
      // No permitir deshabilitar todas (lockstep) — al menos 1 activa.
      // Audit IMP-4: pre-check antes de vibrar, para usar pattern de error
      // si la acción será rechazada. Feedback haptic consistente con UX.
      var enabledModes = Object.assign({}, modesSettings.enabledModes);
      enabledModes[mode] = on;
      var activeCount = Object.keys(enabledModes).filter(function(k) { return enabledModes[k]; }).length;
      if (activeCount < 1) {
        // Reactivar la que está intentando apagar + haptic de error
        enabledModes[mode] = true;
        _vibrate([50, 100, 50]);
        if (window.__mtxToast && typeof window.__mtxToast.show === 'function') {
          window.__mtxToast.show('Al menos una modalidad debe estar activa', { kind: 'warn' });
        }
      } else {
        _vibrate(25);
      }
      var next = (window.__mtxBreathGateModes &&
        window.__mtxBreathGateModes.updateSettings({ enabledModes: enabledModes })) ||
        Object.assign({}, modesSettings, { enabledModes: enabledModes });
      setModesSettings(next);
    }

    function setBreathDuration(sec) {
      _vibrate(25);
      // Sync ambos stores: el de modes (para el rotador) y el de __mtxAppsBreak
      // (para el _BreathPhase del breath-gate.jsx legacy).
      var nextModes = (window.__mtxBreathGateModes &&
        window.__mtxBreathGateModes.updateSettings({ durationSec: sec })) ||
        Object.assign({}, modesSettings, { durationSec: sec });
      setModesSettings(nextModes);
      if (window.__mtxAppsBreak) {
        window.__mtxAppsBreak.updateGateSettings({ durationSec: sec });
        setGateSettings(window.__mtxAppsBreak.getGateSettings());
      }
    }

    function toggleGateEnabled(on) {
      _vibrate(30);
      if (window.__mtxAppsBreak) {
        window.__mtxAppsBreak.updateGateSettings({ enabled: on });
        setGateSettings(window.__mtxAppsBreak.getGateSettings());
      }
    }

    function toggleAllowSkip(on) {
      _vibrate(25);
      if (window.__mtxAppsBreak) {
        window.__mtxAppsBreak.updateGateSettings({ allowSkip: on });
        setGateSettings(window.__mtxAppsBreak.getGateSettings());
      }
    }

    function handleReset() {
      _vibrate([30, 50, 30]);
      var def = (window.__mtxBreathGateModes && window.__mtxBreathGateModes.resetSettings()) ||
        { activeMode: 'mix', enabledModes: { breath: true, image: true, gratitude: true, affirmations: true }, durationSec: 8 };
      setModesSettings(def);
      if (window.__mtxAppsBreak) {
        window.__mtxAppsBreak.updateGateSettings({ enabled: true, durationSec: 8, allowSkip: false });
        setGateSettings(window.__mtxAppsBreak.getGateSettings());
      }
      if (window.__mtxToast && typeof window.__mtxToast.show === 'function') {
        window.__mtxToast.show('Configuración restablecida', { kind: 'success' });
      }
    }

    var modeOptions = [
      { v: 'mix',          icon: '🎲', label: 'Mezclado · sorpresa',  description: 'Rotación inteligente entre las activas, sin repetir la última', recommended: true },
      { v: 'breath',       icon: '🫁', label: 'Respiración siempre',   description: 'Círculo respirando con countdown · clásica Opal' },
      { v: 'image',        icon: '🖼', label: 'Frase motivacional',    description: 'Pensador icónico + frase curada · rotan 24 cards' },
      { v: 'gratitude',    icon: '🙏', label: 'Gratitud · 5 cosas',    description: 'Escribís 5 cosas por las que agradecés · queda en tu historial' },
      { v: 'affirmations', icon: '✨', label: 'Decretos · 5 frases',   description: 'Yo soy___ · Gracias por___ · queda en tu historial' },
    ];

    return (
      <div aria-hidden={!open} style={{
        position: 'absolute', inset: 0, zIndex: 240,
        pointerEvents: open ? 'auto' : 'none',
      }}>
        {/* Backdrop */}
        <div onClick={handleClose} style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          opacity: open ? 1 : 0,
          transition: 'opacity .25s ease',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}/>

        {/* Sheet */}
        <div role="dialog" aria-modal="true" aria-label="Configurar pausa consciente"
          style={{
            position: 'absolute',
            left: 0, right: 0, bottom: 0,
            maxHeight: '82vh',
            background: 'linear-gradient(180deg, #1a1530, #0d0a1c)',
            borderTopLeftRadius: 22, borderTopRightRadius: 22,
            border: '0.5px solid rgba(255,255,255,0.12)',
            borderBottom: 0,
            boxShadow: '0 -20px 60px -20px rgba(0,0,0,0.6)',
            transform: open ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform .35s cubic-bezier(.2,.8,.2,1)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
          {/* Drag handle + header */}
          <div style={{
            padding: '12px 18px 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            flexShrink: 0,
          }}>
            <div aria-hidden="true" style={{
              width: 40, height: 4, borderRadius: 999,
              background: 'rgba(255,255,255,0.20)',
              marginBottom: 12,
            }}/>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%',
            }}>
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 800,
                  color: t.neon,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}>Modo del descanso</div>
                <div style={{
                  fontSize: 17, fontWeight: 700,
                  color: 'white',
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.01em',
                  marginTop: 2,
                }}>¿Qué querés ver?</div>
              </div>
              <button type="button"
                onClick={handleClose}
                className="mtx-tap"
                aria-label="Cerrar configuración"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 14, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--ff-sans)',
                }}>×</button>
            </div>
          </div>

          {/* Scrollable content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '6px 18px 20px',
            WebkitOverflowScrolling: 'touch',
          }}>
            <_Section title="Modalidad activa">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {modeOptions.map(function(o) {
                  return (
                    <_Radio key={o.v}
                      icon={o.icon}
                      label={o.label}
                      description={o.description}
                      recommended={o.recommended}
                      selected={modesSettings.activeMode === o.v}
                      onSelect={function() { selectMode(o.v); }}
                    />
                  );
                })}
              </div>
            </_Section>

            {modesSettings.activeMode === 'mix' ? (
              <_Section title="Mezclado incluye"
                footnote="Tienen que quedar al menos una activa">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <_ToggleRow icon="🫁"
                    label="Respiración"
                    description="Círculo respirando con countdown"
                    checked={!!modesSettings.enabledModes.breath}
                    onChange={function(v) { toggleEnabledMode('breath', v); }}/>
                  <_ToggleRow icon="🖼"
                    label="Frase motivacional"
                    description="Pensador icónico + frase curada"
                    checked={!!modesSettings.enabledModes.image}
                    onChange={function(v) { toggleEnabledMode('image', v); }}/>
                  <_ToggleRow icon="🙏"
                    label="Gratitud · 5 cosas"
                    description="Escribís 5 cosas que agradecés"
                    checked={!!modesSettings.enabledModes.gratitude}
                    onChange={function(v) { toggleEnabledMode('gratitude', v); }}/>
                  <_ToggleRow icon="✨"
                    label="Decretos · 5 frases"
                    description="Completás Yo soy___ · Gracias por___"
                    checked={!!modesSettings.enabledModes.affirmations}
                    onChange={function(v) { toggleEnabledMode('affirmations', v); }}/>
                </div>
              </_Section>
            ) : null}

            {/* Sprint A.11 fix: duración solo relevante cuando la modalidad
                ACTIVA usa respiración. En gratitud/decretos el flow es manual
                y el slider no hace nada. Ocultamos para evitar confusión. */}
            {(modesSettings.activeMode === 'mix' ||
              modesSettings.activeMode === 'breath' ||
              modesSettings.activeMode === 'image') ? (
              <_Section title="Duración respiración"
                footnote={modesSettings.activeMode === 'mix'
                  ? 'Solo aplica cuando toca respiración. Gratitud y decretos van a tu ritmo.'
                  : modesSettings.activeMode === 'image'
                    ? 'Tiempo de lectura sugerido para absorber la frase.'
                    : 'Cuánto durará cada respiración.'}>
                <_DurationPicker
                  value={modesSettings.durationSec || 8}
                  onChange={setBreathDuration}
                />
              </_Section>
            ) : null}

            <_Section title="Pausa consciente"
              footnote="La pausa intercepta el impulso antes del descanso. Sin ella, el picker abre directo.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <_ToggleRow icon="🛡"
                  label="Activar pausa consciente"
                  description={gateSettings.enabled
                    ? 'Aparece antes de cada descanso'
                    : 'Apagada · el picker abre directo'}
                  checked={!!gateSettings.enabled}
                  onChange={toggleGateEnabled}/>
                <_ToggleRow icon="⏭"
                  label="Permitir saltar"
                  description={gateSettings.allowSkip
                    ? 'Botón "Saltar" visible en la pausa'
                    : 'Sin atajo · la pausa completa se respeta'}
                  checked={!!gateSettings.allowSkip}
                  onChange={toggleAllowSkip}
                  disabled={!gateSettings.enabled}/>
              </div>
            </_Section>

            {/* Reset */}
            <button type="button"
              onClick={handleReset}
              className="mtx-tap"
              aria-label="Restablecer valores por defecto"
              style={{
                appearance: 'none', cursor: 'pointer',
                width: '100%',
                padding: '12px 16px', borderRadius: 12,
                background: 'transparent',
                border: '0.5px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.55)',
                fontSize: 12.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '0.005em',
                marginTop: 6,
              }}>↻ Restablecer valores por defecto</button>
          </div>
        </div>
      </div>
    );
  }

  window.BreathGateSettingsSheet = BreathGateSettingsSheet;
})();
