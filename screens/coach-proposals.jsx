// screens/coach-proposals.jsx — Sprint A.13 · Proposal Protocol
// ─────────────────────────────────────────────────────────────────────────────
//
// Patrón unificado "el coach propone, user aprueba" — implementa RFC-003.
//
// 3 tipos de propuesta con UI idéntica:
//   • 'memory'    — hechos sobre el user (auto-aprendidos por el coach)
//   • 'knowledge' — material que el user pide guardar explícitamente
//   • 'skill'     — workflow reutilizable identificado tras conversación
//
// ARQUITECTURA:
//   1. Store __mtxIAProposals (este archivo) gestiona el ciclo de vida
//      pending → accepted | edited → accepted | dismissed
//   2. ProposalCard se renderiza inline como artifact en el chat
//      kind: 'proposal_card' (registrado en ia-artifacts.jsx router)
//   3. ProposalEditSheet abre cuando user pulsa ✏ — form Manus-style
//      con Nombre · Usar cuando · Contenido + avanzado colapsable
//   4. Al accept: la card colapsa a chip "✓ Guardado · Ver"
//      Bridge (coach-actions-bridge.jsx) escucha y persiste en el store
//      correcto (memory/knowledge/skill) según type
//
// EVENTOS:
//   Entrada:
//     mtx:coach-proposal { type, draft, confidence, sourceMessageId }
//        → store crea la propuesta + emite artifact al chat
//
//   Acción del user (desde card o sheet):
//     mtx:coach-artifact-action { value: 'proposal-accept' | 'proposal-edit' |
//                                        'proposal-dismiss', proposalId, edits? }
//
//   Salida (bridge consume):
//     mtx:proposal-accepted { id, type, finalData }
//     mtx:proposal-dismissed { id, type }
//
// localStorage: 'mtx-ia-proposals:v1' (audit trail de las últimas 100)
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxIAProposals) return;

  var STORAGE_KEY = 'mtx-ia-proposals:v1';
  var MAX_PROPOSALS = 100;

  // ──────────────────────────────────────────────────────────────────────────
  // Catálogo de tipos — single source of truth
  // ──────────────────────────────────────────────────────────────────────────
  var PROPOSAL_TYPES = {
    memory: {
      label: 'Memoria',
      icon: '🧠',
      accent: '#3dffd1',
      eyebrow: 'MEMORIA SUGERIDA',
      acceptedLabel: '✓ Guardado en Memoria',
      acceptedTo: 'memory',
      // Etiquetas de los campos
      nameLabel: 'Qué recordar',
      whenToUseLabel: 'Cuándo aplica',
      contentLabel: 'Detalle',
      whenToUsePlaceholder: 'Conversaciones sobre tu día a día',
    },
    knowledge: {
      label: 'Conocimiento',
      icon: '📚',
      accent: '#5dd3ff',
      eyebrow: 'CONOCIMIENTO SUGERIDO',
      acceptedLabel: '✓ Guardado en Conocimiento',
      acceptedTo: 'knowledge',
      nameLabel: 'Nombre',
      whenToUseLabel: 'Cuándo usar',
      contentLabel: 'Contenido',
      whenToUsePlaceholder: 'Al hablar de productividad',
    },
    skill: {
      label: 'Skill',
      icon: '⚡',
      accent: '#ffc850',
      eyebrow: 'SKILL SUGERIDA',
      acceptedLabel: '✓ Guardado en Mis Skills',
      acceptedTo: 'skill',
      nameLabel: 'Nombre del skill',
      whenToUseLabel: 'Triggers',
      contentLabel: 'Pasos / Instrucciones',
      whenToUsePlaceholder: '"planear semana", "review domingo"',
    },
  };

  function _typeInfo(type) {
    return PROPOSAL_TYPES[type] || PROPOSAL_TYPES.memory;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Storage helpers — defensivos
  // ──────────────────────────────────────────────────────────────────────────
  function _read() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch (e) { return []; }
  }
  function _write(arr) {
    try {
      var trimmed = arr.slice(0, MAX_PROPOSALS);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) { /* no-op */ }
  }
  function _genId() {
    return 'prop-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e4).toString(36);
  }
  function _emit(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: detail }));
    } catch (e) { /* no-op */ }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Store API
  // ──────────────────────────────────────────────────────────────────────────
  var _state = {
    items: _read(),  // [{ id, type, draft, status, confidence, sourceMessageId, createdAt, acceptedAt?, edits? }]
  };

  function _save() {
    _write(_state.items);
    _emit('mtx:proposals-changed', { count: _state.items.length });
  }

  function propose(opts) {
    if (!opts || !opts.type || !opts.draft) return null;
    var info = _typeInfo(opts.type);
    if (!info) return null;

    var prop = {
      id: opts.id || _genId(),
      type: opts.type,
      draft: {
        name: opts.draft.name || '',
        whenToUse: opts.draft.whenToUse || '',
        content: opts.draft.content || '',
        // type-specific opcionales (preservar lo que llegue)
        category: opts.draft.category,        // memory
        domain: opts.draft.domain,            // knowledge
        triggers: opts.draft.triggers,        // skill
        tags: opts.draft.tags,
      },
      status: 'pending',
      confidence: typeof opts.confidence === 'number' ? opts.confidence : null,
      sourceMessageId: opts.sourceMessageId || null,
      sourceConvId: opts.sourceConvId || null,
      createdAt: Date.now(),
    };

    _state.items = [prop].concat(_state.items);
    _save();

    // Inyectar al chat como artifact si hay conversación activa
    _injectArtifactToChat(prop);

    return prop;
  }

  function get(id) {
    return _state.items.find(function(p) { return p.id === id; }) || null;
  }

  function getAll() {
    return _state.items.slice();
  }

  function getPending() {
    return _state.items.filter(function(p) { return p.status === 'pending'; });
  }

  function accept(id, edits) {
    var prop = get(id);
    if (!prop || prop.status !== 'pending') return null;

    var finalDraft = edits ? Object.assign({}, prop.draft, edits) : prop.draft;
    // Validación mínima: nombre + contenido no vacíos
    if (!finalDraft.name.trim() || !finalDraft.content.trim()) return null;

    prop.draft = finalDraft;
    prop.status = edits ? 'edited' : 'accepted';
    prop.acceptedAt = Date.now();
    if (edits) prop.edits = edits;

    _save();
    _emit('mtx:proposal-accepted', {
      id: id,
      type: prop.type,
      finalData: finalDraft,
      wasEdited: !!edits,
    });

    // Update artifact en chat (resolved state)
    _updateArtifactState(prop, 'accepted');

    return prop;
  }

  function dismiss(id) {
    var prop = get(id);
    if (!prop || prop.status !== 'pending') return null;
    prop.status = 'dismissed';
    prop.dismissedAt = Date.now();
    _save();
    _emit('mtx:proposal-dismissed', { id: id, type: prop.type });
    _updateArtifactState(prop, 'dismissed');
    return prop;
  }

  function undismiss(id) {
    // Permite undo dentro de los primeros 5s (UX defensivo)
    var prop = get(id);
    if (!prop || prop.status !== 'dismissed') return null;
    if (prop.dismissedAt && Date.now() - prop.dismissedAt > 5000) return null;
    prop.status = 'pending';
    delete prop.dismissedAt;
    _save();
    _updateArtifactState(prop, 'pending');
    return prop;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Chat artifact injection
  // ──────────────────────────────────────────────────────────────────────────
  // Cuando una propuesta se crea desde el chat (vía mtx:coach-proposal),
  // inyectamos un message con artifact kind='proposal_card'. El render lo
  // hace ia-artifacts.jsx que detecta el kind y delega a window.ProposalCard.
  function _injectArtifactToChat(prop) {
    if (!window.__mtxIAChat) return;
    var convId = prop.sourceConvId || window.__mtxIAChat.getCurrentId();
    if (!convId) return;
    try {
      window.__mtxIAChat.addMessage(convId, {
        role: 'assistant',
        artifacts: [{
          kind: 'proposal_card',
          proposalId: prop.id,
        }],
      });
    } catch (e) { /* no-op */ }
  }

  function _updateArtifactState(prop, newStatus) {
    // El artifact ya está en el chat. No editamos el message — el componente
    // re-render lee el state del store por proposalId. Solo emitimos un
    // refresh para que React re-render el chat.
    _emit('mtx:proposals-changed', { id: prop.id, status: newStatus });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────
  window.__mtxIAProposals = {
    propose: propose,
    get: get,
    getAll: getAll,
    getPending: getPending,
    accept: accept,
    dismiss: dismiss,
    undismiss: undismiss,
    TYPES: PROPOSAL_TYPES,
    _typeInfo: _typeInfo,
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Listener para mtx:coach-proposal — entry point externo
  // ──────────────────────────────────────────────────────────────────────────
  // Cualquier módulo (ia-flow auto-detection, slash commands, bridge) puede
  // disparar este evento. El store lo procesa y inyecta al chat.
  window.addEventListener('mtx:coach-proposal', function(e) {
    if (!e || !e.detail) return;
    propose(e.detail);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // <ProposalCard /> — render inline en el chat
  // ──────────────────────────────────────────────────────────────────────────
  // Recibe { proposalId } como prop, lee el estado del store, re-render
  // cuando cambia (escucha mtx:proposals-changed).
  function ProposalCard(props) {
    var proposalId = props.proposalId;

    // Force re-render cuando cambia el store
    var forceTick = React.useReducer(function(x) { return x + 1; }, 0)[1];
    React.useEffect(function() {
      function onChange(e) {
        if (e && e.detail && e.detail.id && e.detail.id !== proposalId) return;
        forceTick();
      }
      window.addEventListener('mtx:proposals-changed', onChange);
      return function() { window.removeEventListener('mtx:proposals-changed', onChange); };
    }, [proposalId]);

    // Edit sheet open state
    var editOpenState = React.useState(false);
    var editOpen = editOpenState[0]; var setEditOpen = editOpenState[1];

    var prop = get(proposalId);
    if (!prop) return null;

    var info = _typeInfo(prop.type);
    var accent = info.accent;

    // Estado: pending | accepted | edited | dismissed
    // Render diferente para cada estado.

    // ── DISMISSED → chip discreto con undo (si < 5s)
    if (prop.status === 'dismissed') {
      var canUndo = prop.dismissedAt && (Date.now() - prop.dismissedAt < 5000);
      return (
        <div style={{
          padding: '8px 12px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.06)',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 11.5, color: 'var(--ink-4)',
          fontFamily: 'var(--ff-sans)',
          animation: 'mtx-fade-up .3s ease both',
        }}>
          <span style={{ opacity: 0.7 }}>{info.icon} Descartado</span>
          {canUndo && (
            <button onClick={function() { undismiss(proposalId); }}
              className="mtx-tap"
              aria-label="Deshacer descarte"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '3px 9px', borderRadius: 999,
                background: 'transparent',
                border: '0.5px solid rgba(255,255,255,0.10)',
                color: 'var(--ink-2)',
                fontSize: 10.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>↶ Deshacer</button>
          )}
        </div>
      );
    }

    // ── ACCEPTED / EDITED → chip neón con título + Ver
    if (prop.status === 'accepted' || prop.status === 'edited') {
      return (
        <div style={{
          padding: '11px 14px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, ' + accent + '12, ' + accent + '04)',
          border: '0.5px solid ' + accent + '40',
          display: 'flex', alignItems: 'center', gap: 11,
          animation: 'mtx-fade-up .4s ease both',
          boxShadow: '0 0 0 1px ' + accent + '10, 0 8px 24px -10px ' + accent + '30',
        }}>
          <div aria-hidden="true" style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, ' + accent + '30, ' + accent + '08)',
            border: '0.5px solid ' + accent + '50',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, color: accent,
            boxShadow: '0 0 12px ' + accent + '40',
          }}>{info.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 800,
              color: accent,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.14em',
              marginBottom: 2,
            }}>{info.acceptedLabel.toUpperCase()}{prop.status === 'edited' ? ' · EDITADO' : ''}</div>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: 'var(--ink-1)',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              letterSpacing: '-0.005em',
              lineHeight: 1.3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{prop.draft.name}</div>
          </div>
          <button
            onClick={function() {
              // Open settings tab del store correspondiente
              var tabMap = { memory: 'memory', knowledge: 'knowledge', skill: 'skills' };
              try {
                window.dispatchEvent(new CustomEvent('mtx:open-ia-settings', {
                  detail: { tab: tabMap[prop.type] || 'memory' },
                }));
              } catch (e) { /* no-op */ }
            }}
            className="mtx-tap"
            aria-label={'Ver en ' + info.label}
            style={{
              appearance: 'none', cursor: 'pointer',
              padding: '6px 12px', borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid ' + accent + '40',
              color: accent,
              fontSize: 11, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              flexShrink: 0,
            }}>Ver <span aria-hidden="true">↗</span></button>
        </div>
      );
    }

    // ── PENDING → card completa con preview + acciones
    function handleAccept() {
      accept(proposalId);
    }
    function handleDismiss() {
      dismiss(proposalId);
    }
    function handleEdit() {
      setEditOpen(true);
    }

    // Truncate content para preview (3 líneas aprox)
    var preview = prop.draft.content || '';
    var truncated = preview.length > 180 ? preview.substring(0, 180).trim() + '…' : preview;

    return (
      <React.Fragment>
        <div style={{
          padding: '14px 14px 12px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, ' + accent + '10, ' + accent + '03)',
          border: '0.5px solid ' + accent + '32',
          animation: 'mtx-fade-up .35s cubic-bezier(.2,.8,.2,1) both',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Top eyebrow row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 8,
          }}>
            <div aria-hidden="true" style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, ' + accent + '30, ' + accent + '08)',
              border: '0.5px solid ' + accent + '50',
              color: accent,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
              boxShadow: '0 0 10px ' + accent + '30',
            }}>{info.icon}</div>
            <div style={{
              fontSize: 9.5, fontWeight: 800,
              color: accent,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.16em',
            }}>{info.eyebrow}</div>
            <div style={{ flex: 1 }}/>
            {/* Edit button minimal lápiz */}
            <button onClick={handleEdit}
              className="mtx-tap"
              aria-label="Editar propuesta"
              style={{
                appearance: 'none', cursor: 'pointer',
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                color: 'var(--ink-3)',
                fontSize: 12,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
              <span aria-hidden="true">✎</span>
            </button>
          </div>

          {/* Title */}
          <div style={{
            fontSize: 14.5, fontWeight: 700,
            color: 'var(--ink-1)',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
            letterSpacing: '-0.012em',
            lineHeight: 1.3,
            marginBottom: 8,
          }}>{prop.draft.name || '(Sin nombre)'}</div>

          {/* Content preview */}
          {truncated && (
            <div style={{
              fontSize: 12.5, color: 'var(--ink-2)',
              lineHeight: 1.55,
              letterSpacing: '-0.005em',
              fontFamily: 'var(--ff-sans)',
              marginBottom: 12,
              whiteSpace: 'pre-wrap',
            }}>{truncated}</div>
          )}

          {/* Footer: actions */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            paddingTop: 10,
            borderTop: '0.5px solid rgba(255,255,255,0.06)',
          }}>
            <button onClick={handleDismiss}
              className="mtx-tap"
              aria-label="Descartar propuesta"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '7px 14px', borderRadius: 999,
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                color: 'var(--ink-3)',
                fontSize: 11.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
              <span aria-hidden="true">✕</span>
              <span>Descartar</span>
            </button>
            <div style={{ flex: 1 }}/>
            <button onClick={handleAccept}
              className="mtx-tap"
              aria-label="Aceptar y guardar"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '7px 16px', borderRadius: 999, border: 0,
                background: 'linear-gradient(135deg, ' + accent + ', ' + accent + 'CC)',
                color: '#0a1410',
                fontSize: 11.5, fontWeight: 800,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                boxShadow: '0 6px 16px -4px ' + accent + '60',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
              <span aria-hidden="true">✓</span>
              <span>Aceptar</span>
            </button>
          </div>
        </div>

        {/* Edit sheet portal */}
        {editOpen && (
          <ProposalEditSheet
            proposalId={proposalId}
            onClose={function() { setEditOpen(false); }}
            onSaved={function() { setEditOpen(false); }}
          />
        )}
      </React.Fragment>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // <ProposalEditSheet /> — modal Manus-style con form Nombre/Cuándo/Contenido
  // ──────────────────────────────────────────────────────────────────────────
  function ProposalEditSheet(props) {
    var proposalId = props.proposalId;
    var onClose = props.onClose;
    var onSaved = props.onSaved;

    var prop = get(proposalId);

    // HOOKS FIRST — declarar todos antes de cualquier early return.
    var nameState = React.useState(prop ? (prop.draft.name || '') : '');
    var name = nameState[0]; var setName = nameState[1];
    var whenState = React.useState(prop ? (prop.draft.whenToUse || '') : '');
    var whenToUse = whenState[0]; var setWhenToUse = whenState[1];
    var contentState = React.useState(prop ? (prop.draft.content || '') : '');
    var content = contentState[0]; var setContent = contentState[1];
    var advancedState = React.useState(false);
    var advancedOpen = advancedState[0]; var setAdvancedOpen = advancedState[1];

    // ESC para cerrar (con guard isTypingInEditable)
    var onCloseRef = React.useRef(onClose);
    React.useEffect(function() { onCloseRef.current = onClose; });
    React.useEffect(function() {
      function onKey(e) {
        if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
        var t = e.target; var tag = (t && t.tagName) || '';
        // En este sheet específicamente, ESC desde input/textarea solo blurea,
        // no cierra (evita pérdida accidental de edits).
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) {
          if (typeof t.blur === 'function') t.blur();
          return;
        }
        onCloseRef.current();
      }
      window.addEventListener('keydown', onKey);
      return function() { window.removeEventListener('keydown', onKey); };
    }, []);

    // Body lock refcount global (compatible con A.12 audit pattern)
    React.useEffect(function() {
      if (window.__mtxBodyLock) {
        window.__mtxBodyLock.lock();
        return function() { window.__mtxBodyLock.unlock(); };
      }
      // Fallback simple si __mtxBodyLock no está disponible aún
      var prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return function() { document.body.style.overflow = prev; };
    }, []);

    if (!prop) return null;

    var info = _typeInfo(prop.type);
    var accent = info.accent;

    function handleSave() {
      var edits = {
        name: name.trim(),
        whenToUse: whenToUse.trim(),
        content: content.trim(),
      };
      if (!edits.name || !edits.content) return;  // validación mínima
      accept(proposalId, edits);
      if (onSaved) onSaved();
    }

    function handleRevert() {
      setName(prop.draft.name || '');
      setWhenToUse(prop.draft.whenToUse || '');
      setContent(prop.draft.content || '');
    }

    var canSave = name.trim().length > 0 && content.trim().length > 0;

    var portalRoot = (typeof document !== 'undefined')
      ? document.getElementById('mtx-overlay-root')
      : null;
    if (!portalRoot) return null;

    var content_jsx = (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 240,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        animation: 'mtx-fade-up .25s ease',
      }} onClick={function(e) {
        if (e.target === e.currentTarget) onClose();
      }}>
        <div onClick={function(e) { e.stopPropagation(); }}
          role="dialog" aria-modal="true" aria-label={'Editar ' + info.label.toLowerCase()}
          style={{
            background: 'rgba(15,19,19,0.96)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            borderTop: '0.5px solid rgba(255,255,255,0.10)',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
            maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
          }}>
          {/* Grabber */}
          <div aria-hidden="true" style={{
            width: 36, height: 4, borderRadius: 999, margin: '12px auto 6px',
            background: 'rgba(255,255,255,0.18)',
            flexShrink: 0,
          }}/>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 18px 14px',
            flexShrink: 0,
            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          }}>
            <div aria-hidden="true" style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: 'linear-gradient(135deg, ' + accent + '30, ' + accent + '08)',
              border: '0.5px solid ' + accent + '50',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: accent,
              boxShadow: '0 0 14px ' + accent + '40',
            }}>{info.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 9.5, color: accent,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '0.16em',
                fontWeight: 800,
                marginBottom: 1,
              }}>{info.eyebrow}</div>
              <div style={{
                fontSize: 14.5, fontWeight: 700,
                color: 'var(--ink-1)',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                letterSpacing: '-0.012em',
                lineHeight: 1.2,
              }}>Pendiente</div>
            </div>
            <button onClick={onClose}
              aria-label="Cerrar sin guardar"
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                color: 'var(--ink-2)',
                fontSize: 14, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--ff-sans)',
                flexShrink: 0,
              }}>×</button>
          </div>

          {/* Form scrollable */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '18px 20px 8px',
            WebkitOverflowScrolling: 'touch',
          }} className="mtx-no-scrollbar">

            {/* Nombre */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block',
                fontSize: 11, fontWeight: 700,
                color: 'var(--ink-3)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                marginBottom: 6,
              }}>{info.nameLabel}</label>
              <input type="text"
                value={name}
                onChange={function(e) { setName(e.target.value); }}
                maxLength={120}
                aria-label={info.nameLabel}
                style={{
                  width: '100%',
                  appearance: 'none', boxSizing: 'border-box',
                  padding: '11px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  color: 'var(--ink-1)',
                  fontSize: 14, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  outline: 'none',
                }}/>
            </div>

            {/* Cuándo usar */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block',
                fontSize: 11, fontWeight: 700,
                color: 'var(--ink-3)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                marginBottom: 6,
              }}>{info.whenToUseLabel}</label>
              <input type="text"
                value={whenToUse}
                onChange={function(e) { setWhenToUse(e.target.value); }}
                maxLength={140}
                placeholder={info.whenToUsePlaceholder}
                aria-label={info.whenToUseLabel}
                style={{
                  width: '100%',
                  appearance: 'none', boxSizing: 'border-box',
                  padding: '11px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  color: 'var(--ink-1)',
                  fontSize: 13.5,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  outline: 'none',
                }}/>
            </div>

            {/* Contenido */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block',
                fontSize: 11, fontWeight: 700,
                color: 'var(--ink-3)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                marginBottom: 6,
              }}>{info.contentLabel}</label>
              <textarea
                value={content}
                onChange={function(e) { setContent(e.target.value); }}
                rows={6}
                maxLength={2000}
                aria-label={info.contentLabel}
                style={{
                  width: '100%',
                  appearance: 'none', boxSizing: 'border-box',
                  padding: '11px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  color: 'var(--ink-1)',
                  fontSize: 13, lineHeight: 1.55,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: 100,
                }}/>
            </div>

            {/* Avanzado colapsable (preserva los campos type-specific) */}
            <button onClick={function() { setAdvancedOpen(!advancedOpen); }}
              className="mtx-tap"
              aria-expanded={advancedOpen}
              style={{
                appearance: 'none', cursor: 'pointer',
                width: '100%',
                padding: '10px 0',
                background: 'transparent',
                border: 0,
                color: 'var(--ink-3)',
                fontSize: 11.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '0.02em',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <span aria-hidden="true" style={{
                display: 'inline-block',
                transition: 'transform .2s',
                transform: advancedOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              }}>›</span>
              <span>Opciones avanzadas</span>
            </button>

            {advancedOpen && (
              <div style={{
                padding: '8px 0 14px',
                animation: 'mtx-fade-up .25s ease both',
              }}>
                {/* Confidence + source meta */}
                {typeof prop.confidence === 'number' && (
                  <div style={{
                    fontSize: 11, color: 'var(--ink-4)',
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.02)',
                    border: '0.5px solid rgba(255,255,255,0.05)',
                    marginBottom: 8,
                  }}>
                    Confianza del coach: {Math.round(prop.confidence * 100)}%
                  </div>
                )}
                {/* Type-specific hint */}
                {prop.type === 'memory' && prop.draft.category && (
                  <div style={{
                    fontSize: 11, color: 'var(--ink-4)',
                    fontFamily: 'var(--ff-sans)',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.02)',
                    border: '0.5px solid rgba(255,255,255,0.05)',
                  }}>
                    Categoría detectada: <span style={{ color: accent, fontWeight: 700 }}>{prop.draft.category}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer: acciones */}
          <div style={{
            display: 'flex', gap: 8,
            padding: '12px 18px 22px',
            borderTop: '0.5px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <button onClick={handleRevert}
              aria-label="Restaurar al borrador original del coach"
              className="mtx-tap"
              title="Restaurar al borrador del coach"
              style={{
                appearance: 'none', cursor: 'pointer',
                width: 40, height: 40, borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                color: 'var(--ink-3)',
                fontSize: 14,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--ff-sans)',
                flexShrink: 0,
              }}>↶</button>
            <div style={{ flex: 1 }}/>
            <button onClick={onClose}
              aria-label="Cancelar"
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '11px 16px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                color: 'var(--ink-2)',
                fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>Cancelar</button>
            <button onClick={handleSave}
              disabled={!canSave}
              aria-label="Guardar y aceptar"
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: canSave ? 'pointer' : 'not-allowed',
                padding: '11px 18px', borderRadius: 12, border: 0,
                background: canSave
                  ? 'linear-gradient(135deg, ' + accent + ', ' + accent + 'CC)'
                  : 'rgba(255,255,255,0.06)',
                color: canSave ? '#0a1410' : 'var(--ink-4)',
                fontSize: 13, fontWeight: 800,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                boxShadow: canSave ? '0 6px 16px -4px ' + accent + '60' : 'none',
                opacity: canSave ? 1 : 0.6,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              <span aria-hidden="true">✓</span>
              <span>Guardar</span>
            </button>
          </div>
        </div>
      </div>
    );

    return ReactDOM.createPortal(content_jsx, portalRoot);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Export
  // ──────────────────────────────────────────────────────────────────────────
  window.ProposalCard = ProposalCard;
  window.ProposalEditSheet = ProposalEditSheet;
})();
