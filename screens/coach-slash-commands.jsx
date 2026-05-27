// screens/coach-slash-commands.jsx — Sprint A.7 · C12 · Slash Commands
// ─────────────────────────────────────────────────────────────────────────────
// Power-user autocomplete. User escribe `/` al inicio del input (o después
// de space/newline) → popup aparece arriba del input bar con los 7 comandos.
//
// Comandos sellados (todos atajos a features REALES — cero cosmético):
//
//   Pattern A — Acción directa:
//   • /llamar         → window.__mtxVoiceCall.open()
//   • /adjuntar       → window.__mtxAttachMenu.open()
//   • /skills         → window.__mtxSkillsMenu.open()
//   • /memoria        → mtx:open-ia-settings { tab: 'memory' }
//   • /sueño          → inyecta "¿Cómo va mi sueño esta semana?" al draft
//
//   Pattern B — Con argumento:
//   • /buscar <tema>  → inyecta "Busca evidencia sobre <tema>"
//   • /leer <url>     → inyecta "Léeme esto: <url>"
//
// API pública:
//   window.__mtxSlashCommands.match(text)
//     → null si no hay `/` activo, o { commandFragment, argFragment, anchor }
//   window.__mtxSlashCommands.execute(commandId, arg, context)
//     → ejecuta el comando, devuelve { kind: 'replace-draft' | 'no-op', value? }
//   window.__mtxSlashCommands.list() → catálogo de comandos
//
// Cuando llegue backend (Sprint B):
//   Catálogo se vuelve dinámico (puede incluir skills personalizadas como
//   /<skill-id>). Por ahora 7 fijos hardcoded — rigor explícito sobre lo
//   que tiene caso real de uso.
// ─────────────────────────────────────────────────────────────────────────────


(function() {
  if (typeof window === 'undefined' || window.__mtxSlashCommands) return;

  // ─ Catálogo sellado ────────────────────────────────────────────────────
  // Cada comando tiene:
  //   id           → identifier interno (también el slug del slash)
  //   label        → nombre visible
  //   description  → micro-explicación bajo el label
  //   icon         → emoji o SVG (string)
  //   accent       → color del icon background
  //   takesArg     → boolean — si true, espera <arg> después
  //   argHint      → placeholder visible cuando user está escribiendo el arg
  //   action       → función(arg, context) que ejecuta. Devuelve {kind, value?}
  //                  kind = 'replace-draft' → reemplaza el contenido del input
  //                  kind = 'no-op'         → solo ejecuta side-effect, limpia input
  var _COMMANDS = [
    {
      id: 'llamar',
      label: 'Llamar al coach',
      description: 'Conversación de voz inmersiva',
      icon: '🎙️',
      accent: '#3dffd1',
      takesArg: false,
      action: function() {
        if (window.__mtxVoiceCall) {
          var convId = window.__mtxIAChat && window.__mtxIAChat.getCurrentId();
          window.__mtxVoiceCall.open(convId, '');
        }
        return { kind: 'no-op' };
      },
    },
    {
      id: 'buscar',
      label: 'Buscar evidencia',
      description: 'Fuentes wellness curadas',
      icon: '🔍',
      accent: '#9b8aff',
      takesArg: true,
      argHint: 'tema · ej. HRV, sueño profundo',
      action: function(arg) {
        var query = String(arg || '').trim();
        if (!query) {
          return { kind: 'replace-draft', value: '/buscar ' };
        }
        return { kind: 'replace-draft', value: 'Busca evidencia sobre ' + query };
      },
    },
    {
      id: 'leer',
      label: 'Leer un enlace',
      description: 'Resume con tu memoria conectada',
      icon: '🔗',
      accent: '#ffc850',
      takesArg: true,
      argHint: 'pega la URL aquí',
      action: function(arg) {
        var url = String(arg || '').trim();
        if (!url) {
          return { kind: 'replace-draft', value: '/leer ' };
        }
        var withProtocol = /^https?:\/\//i.test(url) ? url : 'https://' + url;
        return { kind: 'replace-draft', value: 'Léeme esto: ' + withProtocol };
      },
    },
    {
      id: 'adjuntar',
      label: 'Adjuntar al chat',
      description: 'Archivo, foto, URL o snapshot',
      icon: '📎',
      accent: '#3dffd1',
      takesArg: false,
      action: function() {
        if (window.__mtxAttachMenu) window.__mtxAttachMenu.open();
        return { kind: 'no-op' };
      },
    },
    {
      id: 'skills',
      label: 'Activar una habilidad',
      description: 'Skills del coach (oficiales + tuyas)',
      icon: '⚡',
      accent: '#ffc850',
      takesArg: false,
      action: function() {
        if (window.__mtxSkillsMenu) window.__mtxSkillsMenu.open();
        return { kind: 'no-op' };
      },
    },
    {
      id: 'memoria',
      label: 'Mi memoria',
      description: 'Lo que el coach sabe sobre ti',
      icon: '🧠',
      accent: '#9b8aff',
      takesArg: false,
      action: function() {
        window.dispatchEvent(new CustomEvent('mtx:open-ia-settings', {
          detail: { tab: 'memory' },
        }));
        return { kind: 'no-op' };
      },
    },
    {
      id: 'sueño',
      label: 'Cómo va mi sueño',
      description: 'Lectura wearable de la semana',
      icon: '💤',
      accent: '#9b8aff',
      takesArg: false,
      action: function() {
        return { kind: 'replace-draft', value: '¿Cómo va mi sueño esta semana?' };
      },
    },
  ];

  // Alias para typos comunes — match() los resuelve a su comando real.
  // No se muestran en el popup; solo aceptan tipeo alternativo.
  var _ALIASES = {
    'llama': 'llamar',
    'call': 'llamar',
    'search': 'buscar',
    'read': 'leer',
    'attach': 'adjuntar',
    'skill': 'skills',
    'memory': 'memoria',
    'sleep': 'sueño',
    'sueno': 'sueño',
  };

  // ─ Helper: match slash en el texto ──────────────────────────────────────
  // Devuelve null si no hay un slash command activo (cursor no detrás de un
  // `/` válido). Si hay, devuelve:
  //   { commandFragment, argFragment, anchor }
  //
  // commandFragment = lo que va después de `/` hasta el primer espacio
  // argFragment     = lo que va después del espacio (si takesArg)
  // anchor          = índice del `/` en el texto (para replace al execute)
  //
  // Regla: el `/` debe estar al INICIO del texto o precedido por space/newline.
  // Eso evita activar slash en medio de URLs o palabras.
  function _matchSlash(text, cursorPos) {
    if (!text) return null;
    var pos = (typeof cursorPos === 'number') ? cursorPos : text.length;

    // Busca el `/` más cercano al cursor que sea inicio-de-token
    var slashIdx = -1;
    for (var i = pos - 1; i >= 0; i--) {
      var ch = text[i];
      if (ch === '\n') break;       // newline rompe
      if (ch === '/') {
        // Verifica que esté al inicio o precedido por whitespace
        if (i === 0 || /\s/.test(text[i - 1])) {
          slashIdx = i;
        }
        break;
      }
    }
    if (slashIdx === -1) return null;

    var afterSlash = text.slice(slashIdx + 1, pos);
    // Si hay newline en el fragmento, abortamos
    if (/\n/.test(afterSlash)) return null;

    // Split en comando + arg por primer espacio
    var spaceIdx = afterSlash.indexOf(' ');
    var commandFragment, argFragment;
    if (spaceIdx === -1) {
      commandFragment = afterSlash;
      argFragment = null;
    } else {
      commandFragment = afterSlash.slice(0, spaceIdx);
      argFragment = afterSlash.slice(spaceIdx + 1);
    }

    return {
      commandFragment: commandFragment,
      argFragment: argFragment,
      anchor: slashIdx,
    };
  }

  // ─ Filter commands por fragment ────────────────────────────────────────
  // Fuzzy match: si fragment es vacío, todos. Si tiene texto, match por
  // (1) starts-with del id, (2) starts-with del label normalizado,
  // (3) contains del label, (4) alias resolución.
  function _filterCommands(fragment) {
    var frag = String(fragment || '').toLowerCase().trim();
    if (!frag) return _COMMANDS.slice();

    // Check alias primero (resolve exacto)
    if (_ALIASES[frag]) {
      var resolved = _COMMANDS.find(function(c) { return c.id === _ALIASES[frag]; });
      if (resolved) return [resolved];
    }

    var startsWith = [];
    var contains = [];
    _COMMANDS.forEach(function(c) {
      var idMatch = c.id.toLowerCase().indexOf(frag) === 0;
      var labelLow = c.label.toLowerCase();
      var labelMatch = labelLow.indexOf(frag) === 0;
      if (idMatch || labelMatch) {
        startsWith.push(c);
      } else if (labelLow.indexOf(frag) !== -1 || c.description.toLowerCase().indexOf(frag) !== -1) {
        contains.push(c);
      }
    });
    return startsWith.concat(contains);
  }

  // ─ Execute command ─────────────────────────────────────────────────────
  function _execute(commandId, arg, context) {
    var cmd = _COMMANDS.find(function(c) { return c.id === commandId; });
    if (!cmd) return { kind: 'no-op' };
    try {
      return cmd.action(arg, context) || { kind: 'no-op' };
    } catch (e) {
      console.warn('[slash-commands] action error', commandId, e);
      return { kind: 'no-op' };
    }
  }

  window.__mtxSlashCommands = {
    match: _matchSlash,
    execute: _execute,
    filter: _filterCommands,
    list: function() { return _COMMANDS.slice(); },
    _commands: _COMMANDS,
    _aliases: _ALIASES,
  };
})();


// ═════════════════════════════════════════════════════════════════════════════
// CoachSlashAutocomplete — popup React
// ═════════════════════════════════════════════════════════════════════════════
// Renderiza el popup arriba del input bar cuando hay un slash activo.
// Props:
//   text        — texto actual del textarea
//   cursorPos   — posición del caret
//   textareaRef — ref del textarea para focus después de seleccionar
//   onReplace   — callback(newText, newCursorPos) — el padre actualiza draft
//   onClose     — callback() — cierra el popup
//
// Behavior:
//   • Match se calcula en cada render (cheap, regex sobre los últimos N chars)
//   • Si match es null → render null (no DOM)
//   • Arrow keys ↓/↑ Wrap around. Enter → execute. Escape → close.
//   • Listeners de keydown se attach al window cuando hay match activo y se
//     limpian cuando se desmonta o el match cambia a null.
function CoachSlashAutocomplete(props) {
  var text = props.text || '';
  var cursorPos = typeof props.cursorPos === 'number' ? props.cursorPos : text.length;
  var onReplace = props.onReplace;
  var onClose = props.onClose;
  var textareaRef = props.textareaRef;

  var selectedIdxState = React.useState(0);
  var selectedIdx = selectedIdxState[0]; var setSelectedIdx = selectedIdxState[1];

  // Match contra el texto actual
  var match = null;
  if (typeof window !== 'undefined' && window.__mtxSlashCommands) {
    match = window.__mtxSlashCommands.match(text, cursorPos);
  }

  // Filtra comandos por el fragment del comando
  var filtered = [];
  var currentCommand = null;  // si commandFragment exacto matches un comando, el user está en arg mode
  if (match) {
    var allCommands = window.__mtxSlashCommands.list();
    currentCommand = allCommands.find(function(c) { return c.id === match.commandFragment; });
    // Si el comando es exacto Y toma arg Y hay espacio después, modo arg
    if (currentCommand && currentCommand.takesArg && match.argFragment !== null) {
      filtered = [currentCommand];
    } else {
      filtered = window.__mtxSlashCommands.filter(match.commandFragment);
    }
  }

  // Reset selectedIdx cuando cambia filter
  React.useEffect(function() {
    setSelectedIdx(0);
  }, [match && match.commandFragment, filtered.length]);

  // Keyboard handler — solo activo cuando hay match
  React.useEffect(function() {
    if (!match || filtered.length === 0) return;

    function handler(e) {
      var t = e.target;
      // Solo respondemos cuando el textarea del chat está focuseado
      if (t !== textareaRef.current) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(function(i) { return (i + 1) % filtered.length; });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(function(i) { return (i - 1 + filtered.length) % filtered.length; });
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        executeAt(selectedIdx);
        return;
      }
      // Tab también selecciona (like Linear/Cursor)
      if (e.key === 'Tab') {
        e.preventDefault();
        executeAt(selectedIdx);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onClose) onClose();
        return;
      }
    }
    window.addEventListener('keydown', handler, true);
    return function() { window.removeEventListener('keydown', handler, true); };
  }, [match && match.commandFragment, filtered.length, selectedIdx]);

  function executeAt(idx) {
    var cmd = filtered[idx];
    if (!cmd) return;
    var arg = (cmd.takesArg && match && match.argFragment) || '';
    var result = window.__mtxSlashCommands.execute(cmd.id, arg);

    // Reemplaza el fragmento del slash en el texto:
    var before = text.slice(0, match.anchor);
    if (result.kind === 'replace-draft' && typeof result.value === 'string') {
      // Para comandos con arg sin valor (ej. /buscar sin texto), result.value
      // ya es "/buscar " — lo dejamos en el input para que user complete.
      // Para comandos con valor completo, reemplazamos.
      var newText = before + result.value;
      if (onReplace) onReplace(newText, newText.length);
    } else {
      // no-op: solo ejecuta side-effect y limpia el slash
      var cleared = before.replace(/\s+$/, '');
      if (onReplace) onReplace(cleared, cleared.length);
    }
    if (onClose) onClose();
  }

  // No render si no hay match o no hay comandos visibles
  if (!match || filtered.length === 0) return null;

  // Estamos en arg mode si el comando exacto toma arg y el user puso espacio
  var argMode = currentCommand && currentCommand.takesArg && match.argFragment !== null;

  return (
    <div
      role="listbox"
      aria-label="Comandos disponibles"
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: 12, right: 12,
        background: 'rgba(15,25,20,0.95)',
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        borderRadius: 14,
        boxShadow: '0 -8px 32px -8px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(61,255,209,0.10)',
        maxHeight: 280,
        overflowY: 'auto',
        zIndex: 50,
        animation: 'mtx-fade-up .15s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>
      {/* Header: si arg mode, mostrar hint del arg */}
      {argMode && (
        <div style={{
          padding: '10px 14px 8px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: currentCommand.accent + '18',
            border: '0.5px solid ' + currentCommand.accent + '32',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, flexShrink: 0,
          }}>{currentCommand.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600,
              color: 'var(--ink-1)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>{currentCommand.label}</div>
            {/* Si el arg ya tiene contenido (>2 chars), ocultar el ejemplo
                redundante y mostrar prompt para ejecutar. Si está vacío,
                mostrar el hint con el ejemplo. */}
            <div style={{
              fontSize: 10, fontStyle: 'italic',
              color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              marginTop: 1,
            }}>{(match.argFragment && match.argFragment.trim().length > 2)
              ? 'Presiona Enter para ejecutar'
              : currentCommand.argHint}</div>
          </div>
          <div style={{
            fontSize: 9.5, fontWeight: 700,
            color: (match.argFragment && match.argFragment.trim().length > 2)
              ? 'rgba(61,255,209,0.85)'
              : 'rgba(255,255,255,0.45)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '3px 7px', borderRadius: 5,
            background: (match.argFragment && match.argFragment.trim().length > 2)
              ? 'rgba(61,255,209,0.12)'
              : 'rgba(255,255,255,0.06)',
            fontFamily: 'var(--ff-sans)',
            transition: 'background .2s, color .2s',
          }}>Enter ↵</div>
        </div>
      )}

      {/* Lista de comandos (solo cuando NO en arg mode) */}
      {!argMode && (
        <div style={{ padding: 4 }}>
          {filtered.map(function(cmd, i) {
            var isSelected = i === selectedIdx;
            return (
              <button
                key={cmd.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={function() { setSelectedIdx(i); }}
                onClick={function() { executeAt(i); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  width: '100%',
                  padding: '8px 10px', borderRadius: 10,
                  background: isSelected ? 'rgba(61,255,209,0.08)' : 'transparent',
                  border: 0,
                  color: 'inherit', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background .12s',
                }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  flexShrink: 0,
                  background: cmd.accent + '18',
                  border: '0.5px solid ' + cmd.accent + '30',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13,
                }} aria-hidden="true">{cmd.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'baseline', gap: 6,
                    fontSize: 12.5,
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                  }}>
                    <span style={{
                      fontWeight: 600,
                      color: 'var(--ink-1)',
                    }}>{cmd.label}</span>
                    <span style={{
                      fontSize: 10.5, fontWeight: 500,
                      color: 'var(--ink-4)',
                      fontFamily: 'var(--ff-mono, ui-monospace, monospace)',
                      letterSpacing: '0.01em',
                    }}>/{cmd.id}{cmd.takesArg ? ' <…>' : ''}</span>
                  </div>
                  <div style={{
                    fontSize: 10.5,
                    color: 'var(--ink-3)',
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                    marginTop: 1,
                  }}>{cmd.description}</div>
                </div>
                {isSelected && (
                  <div style={{
                    fontSize: 9.5, fontWeight: 700,
                    color: 'rgba(61,255,209,0.65)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '3px 7px', borderRadius: 5,
                    background: 'rgba(61,255,209,0.10)',
                    fontFamily: 'var(--ff-sans)',
                    flexShrink: 0,
                  }} aria-hidden="true">↵</div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Footer hint sutil con shortcuts */}
      {!argMode && filtered.length > 1 && (
        <div style={{
          padding: '6px 14px 8px',
          borderTop: '0.5px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 9, fontWeight: 600,
          color: 'rgba(255,255,255,0.30)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontFamily: 'var(--ff-sans)',
        }}>
          <span>↑ ↓ navegar</span>
          <span>↵ ejecutar</span>
          <span>esc cerrar</span>
        </div>
      )}
    </div>
  );
}


window.CoachSlashAutocomplete = CoachSlashAutocomplete;
