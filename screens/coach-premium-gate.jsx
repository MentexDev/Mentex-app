// screens/coach-premium-gate.jsx — Sprint A.6 · B12 · Premium-gate UI
// ─────────────────────────────────────────────────────────────────────────────
// Sistema de tiers granular del coach Mentex.
//
// 3 tiers: free / premium / pro
//   • free     — Capabilities core (memoria, web_search, web_fetch, agenda)
//   • premium  — + voice_call, extended_think deep, integrations enriched
//   • pro      — + browse_act, image_generate, video_generate (cuando lleguen),
//                multiagentes, sin límites de uso semanales
//
// Cuando llegue backend (Sprint B):
//   Plan vendrá del Imperial Gateway (subscription state via Stripe). El
//   __mtxUserTier es solo el cliente del valor. Mismo shape.
//
// API pública:
//   window.__mtxUserTier.current() → 'free' | 'premium' | 'pro'
//   window.__mtxUserTier.canUse(toolName) → bool
//   window.__mtxUserTier.requiredFor(toolName) → 'free' | 'premium' | 'pro' | null
//   window.__mtxUserTier.set(tier)  — devTools / testing
//
//   window.__mtxPremiumGate.open(opts) — abre modal upgrade
//   window.__mtxPremiumGate.close()
//   window.__mtxPremiumGate.isOpen()
// ─────────────────────────────────────────────────────────────────────────────


(function() {
  if (typeof window === 'undefined' || window.__mtxUserTier) return;

  // ─ Catálogo de tools y su tier requerido ──────────────────────────────────
  // Cuando agregues una tool nueva al coach, define aquí su tier mínimo.
  // El default (no listado) es 'free'.
  var _TOOL_TIERS = {
    // FREE (core)
    'memory_recall':         'free',
    'web_search':            'free',
    'web_fetch':             'free',
    'wearable_read':         'free',
    'extended_think':        'free',     // shallow + medium
    // PREMIUM
    'voice_call':            'premium',
    'extended_think_deep':   'premium',  // depth='deep' es premium
    'memory_persistent':     'premium',  // memorias > 10 facts
    // PRO
    'browse_act':            'pro',
    'image_generate':        'pro',
    'video_generate':        'pro',
    'screen_share':          'pro',
  };

  // Tier hierarchy: pro > premium > free
  var _TIER_RANK = { 'free': 0, 'premium': 1, 'pro': 2 };

  function _getStoredTier() {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      var raw = window.localStorage.getItem('__mtxUserTier:v1');
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.tier ? parsed.tier : null;
    } catch (_) { return null; }
  }
  function _setStoredTier(tier) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem('__mtxUserTier:v1', JSON.stringify({
        tier: tier,
        updatedAt: Date.now(),
      }));
    } catch (_) {}
  }

  // Default current tier: si user tiene isPremium activo (trial), arranca en
  // 'premium'. Si no, 'free'. Persiste via localStorage.
  var _currentTier = _getStoredTier()
    || ((window.__mtxIsPremium && window.__mtxIsPremium()) ? 'premium' : 'free');

  function _emit() {
    window.dispatchEvent(new CustomEvent('mtx:user-tier-changed', {
      detail: { tier: _currentTier },
    }));
  }

  window.__mtxUserTier = {
    current: function() { return _currentTier; },

    set: function(tier) {
      if (!_TIER_RANK.hasOwnProperty(tier)) return false;
      _currentTier = tier;
      _setStoredTier(tier);
      _emit();
      return true;
    },

    // ¿Puede el user actual usar esta tool?
    canUse: function(toolName) {
      var required = _TOOL_TIERS[toolName] || 'free';
      return _TIER_RANK[_currentTier] >= _TIER_RANK[required];
    },

    // ¿Qué tier requiere esta tool?
    requiredFor: function(toolName) {
      return _TOOL_TIERS[toolName] || 'free';
    },

    // Lista de tools disponibles para el tier actual
    availableTools: function() {
      var rank = _TIER_RANK[_currentTier];
      return Object.keys(_TOOL_TIERS).filter(function(t) {
        return _TIER_RANK[_TOOL_TIERS[t]] <= rank;
      });
    },

    // Lista de tools bloqueadas para el tier actual
    lockedTools: function() {
      var rank = _TIER_RANK[_currentTier];
      return Object.keys(_TOOL_TIERS).filter(function(t) {
        return _TIER_RANK[_TOOL_TIERS[t]] > rank;
      });
    },

    // ¿Cuál tier sigue?  free → premium → pro → pro (cap)
    nextTier: function() {
      if (_currentTier === 'free') return 'premium';
      if (_currentTier === 'premium') return 'pro';
      return 'pro';
    },

    // Diagnostics
    diagnostics: function() {
      return {
        current: _currentTier,
        rank: _TIER_RANK[_currentTier],
        toolCount: Object.keys(_TOOL_TIERS).length,
        available: this.availableTools().length,
        locked: this.lockedTools().length,
      };
    },

    // Catálogo expuesto para UI (premium modal lo usa)
    _catalog: _TOOL_TIERS,
  };

  // Listen para que cuando user active trial via flow existente, su tier
  // suba automáticamente a premium (compatible con código pre-B12).
  window.addEventListener('mtx:onboarding-changed', function() {
    if (window.__mtxIsPremium && window.__mtxIsPremium() && _currentTier === 'free') {
      window.__mtxUserTier.set('premium');
    }
  });
})();


// ─ Premium Gate state (open/close del modal) ──────────────────────────────
(function() {
  if (typeof window === 'undefined' || window.__mtxPremiumGate) return;

  var _isOpen = false;
  var _config = null;

  window.__mtxPremiumGate = {
    open: function(opts) {
      _config = opts || {};
      _isOpen = true;
      window.dispatchEvent(new CustomEvent('mtx:premium-gate-state', {
        detail: { open: true, config: _config },
      }));
    },
    close: function() {
      if (!_isOpen) return;
      _isOpen = false;
      _config = null;
      window.dispatchEvent(new CustomEvent('mtx:premium-gate-state', {
        detail: { open: false },
      }));
    },
    isOpen: function() { return _isOpen; },
  };
})();


// ═════════════════════════════════════════════════════════════════════════════
// CoachPremiumGateModal — modal upgrade fullscreen
// ═════════════════════════════════════════════════════════════════════════════
function CoachPremiumGateModal() {
  var openState = React.useState(false);
  var open = openState[0]; var setOpen = openState[1];

  var configState = React.useState(null);
  var config = configState[0]; var setConfig = configState[1];

  // Selected plan en el modal: arranca con el nextTier sugerido
  var selectedTierState = React.useState('premium');
  var selectedTier = selectedTierState[0]; var setSelectedTier = selectedTierState[1];

  // Listener open/close events
  React.useEffect(function() {
    function onState(e) {
      var d = (e && e.detail) || {};
      if (d.open) {
        setConfig(d.config || null);
        setOpen(true);
        // Sugerir el tier que desbloquea la tool intentada
        var requiredTier = (d.config && d.config.requiredTier) || 'premium';
        setSelectedTier(requiredTier === 'pro' ? 'pro' : 'premium');
      } else {
        setOpen(false);
      }
    }
    window.addEventListener('mtx:premium-gate-state', onState);
    return function() { window.removeEventListener('mtx:premium-gate-state', onState); };
  }, []);

  // Body scroll lock + ESC
  React.useEffect(function() {
    if (!open) return;
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      handleClose();
    }
    window.addEventListener('keydown', onKey);
    return function() {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function handleClose() {
    if (window.__mtxPremiumGate) window.__mtxPremiumGate.close();
  }
  function handleActivate() {
    if (window.__mtxUserTier) {
      window.__mtxUserTier.set(selectedTier);
      var toast = (typeof window !== 'undefined' && window.useToast) ? window.useToast() : null;
      if (toast && toast.show) toast.show({ message: '✦ ' + selectedTier.toUpperCase() + ' activado', duration: 2000 });
    }
    handleClose();
  }

  if (!open) return null;
  if (typeof document === 'undefined') return null;
  var portalRoot = document.getElementById('mtx-overlay-root');
  if (!portalRoot) return null;

  // Tool que disparó el gate (si vino en config)
  var blockedTool = config && config.toolName;
  var toolHumanName = (function() {
    switch (blockedTool) {
      case 'voice_call': return 'Llamadas de voz';
      case 'browse_act': return 'Acciones en internet';
      case 'extended_think_deep': return 'Razonamiento profundo';
      case 'image_generate': return 'Imágenes generadas';
      case 'video_generate': return 'Videos generados';
      case 'screen_share': return 'Compartir pantalla';
      default: return blockedTool;
    }
  })();

  var PLANS = [
    {
      id: 'premium',
      label: 'Premium',
      price: '$9.99',
      cycle: 'mes',
      accent: '#3dffd1',
      features: [
        { icon: '🎙️', label: 'Llamadas de voz con el coach' },
        { icon: '🧠', label: 'Razonamiento profundo (extended think)' },
        { icon: '💾', label: 'Memoria ilimitada cross-session' },
        { icon: '🔌', label: 'Integraciones enriched (Apple Health, Spotify, etc.)' },
        { icon: '💬', label: 'Conversaciones ilimitadas' },
      ],
    },
    {
      id: 'pro',
      label: 'Pro',
      price: '$19.99',
      cycle: 'mes',
      accent: '#9b8aff',
      tagline: 'Para creadores y power-users',
      features: [
        { icon: '✦', label: 'Todo lo de Premium' },
        { icon: '🌐', label: 'Acciones en internet (reservar, agendar, comprar)' },
        { icon: '🎨', label: 'Generación de imágenes Midjourney-level' },
        { icon: '🎬', label: 'Videos generados Sora-level' },
        { icon: '📺', label: 'Compartir pantalla con el coach' },
        { icon: '⚡', label: 'Sin límites de uso semanales' },
      ],
    },
  ];

  var content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mejora a Premium o Pro"
      onClick={function(e) { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(10,20,16,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'mtx-fade-up .25s ease both',
      }}>
      <div style={{
        width: '100%',
        maxHeight: '88vh',
        background: '#0a1410',
        borderRadius: '20px 20px 0 0',
        borderTop: '0.5px solid rgba(61,255,209,0.25)',
        boxShadow: '0 -20px 60px -20px rgba(61,255,209,0.20)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'mtx-fade-up .35s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>
        {/* Drag handle */}
        <div style={{
          padding: '10px 0 4px',
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.20)',
          }}/>
        </div>

        {/* Header */}
        <div style={{
          padding: '12px 20px 18px',
          textAlign: 'center',
        }}>
          {blockedTool && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(255,200,80,0.10)',
              border: '0.5px solid rgba(255,200,80,0.30)',
              fontSize: 10.5, fontWeight: 700,
              color: '#ffc850',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'var(--ff-sans)',
              marginBottom: 14,
            }}>
              <span aria-hidden="true">🔒</span>
              <span>{toolHumanName} requiere upgrade</span>
            </div>
          )}
          <div style={{
            fontSize: 22, fontWeight: 700,
            color: 'var(--ink-1)',
            fontFamily: 'Georgia, "New York", serif',
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
            marginBottom: 6,
          }}>
            {blockedTool
              ? 'Desbloquea ' + toolHumanName.toLowerCase()
              : 'El coach completo de Mentex'}
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            lineHeight: 1.5,
            maxWidth: 360, margin: '0 auto',
          }}>Tu coach con todas sus capacidades — memoria, voz, acciones en el mundo real.</div>
        </div>

        {/* Plan tabs */}
        <div style={{
          padding: '0 20px',
          display: 'flex', gap: 8,
          marginBottom: 14,
        }}>
          {PLANS.map(function(plan) {
            var isSelected = selectedTier === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={function() { setSelectedTier(plan.id); }}
                className="mtx-tap"
                aria-pressed={isSelected}
                style={{
                  appearance: 'none', cursor: 'pointer',
                  flex: 1,
                  padding: '12px 14px', borderRadius: 14,
                  background: isSelected ? plan.accent + '12' : 'rgba(255,255,255,0.03)',
                  border: '0.5px solid ' + (isSelected ? plan.accent + '55' : 'rgba(255,255,255,0.08)'),
                  color: isSelected ? plan.accent : 'var(--ink-2)',
                  textAlign: 'left',
                  transition: 'background .2s, border-color .2s, color .2s',
                  boxShadow: isSelected ? '0 0 16px ' + plan.accent + '15' : 'none',
                }}>
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--ff-sans)',
                  marginBottom: 4,
                  opacity: isSelected ? 1 : 0.6,
                }}>{plan.label}</div>
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 3,
                  fontFamily: 'var(--ff-sans)',
                }}>
                  <span style={{
                    fontSize: 20, fontWeight: 700,
                    color: isSelected ? plan.accent : 'var(--ink-1)',
                    letterSpacing: '-0.01em',
                  }}>{plan.price}</span>
                  <span style={{
                    fontSize: 11,
                    color: 'var(--ink-3)',
                    opacity: 0.7,
                  }}>/{plan.cycle}</span>
                </div>
                {plan.tagline && (
                  <div style={{
                    marginTop: 6,
                    fontSize: 10,
                    color: 'var(--ink-3)',
                    opacity: 0.75,
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                  }}>{plan.tagline}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Features list of selected plan */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 20px 16px',
        }}>
          {(() => {
            var plan = PLANS.find(function(p) { return p.id === selectedTier; });
            if (!plan) return null;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.features.map(function(f, i) {
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.025)',
                      border: '0.5px solid rgba(255,255,255,0.06)',
                      animation: 'mtx-fade-up .25s cubic-bezier(0.16, 1, 0.3, 1) both',
                      animationDelay: (i * 0.04) + 's',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        flexShrink: 0,
                        background: plan.accent + '15',
                        border: '0.5px solid ' + plan.accent + '30',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14,
                      }} aria-hidden="true">{f.icon}</div>
                      <div style={{
                        flex: 1, minWidth: 0,
                        fontSize: 13, lineHeight: 1.4,
                        color: 'var(--ink-1)',
                        fontFamily: 'var(--ff-sans)',
                        letterSpacing: '-0.005em',
                        fontWeight: 500,
                      }}>{f.label}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* CTA Footer */}
        <div style={{
          padding: '14px 20px 24px',
          borderTop: '0.5px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.20)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <button
            type="button"
            onClick={handleActivate}
            className="mtx-tap"
            aria-label={'Activar ' + selectedTier}
            style={{
              appearance: 'none', cursor: 'pointer',
              width: '100%',
              padding: '14px 20px', borderRadius: 999,
              background: selectedTier === 'pro'
                ? 'linear-gradient(135deg, #9b8aff 0%, #6b56ff 100%)'
                : 'linear-gradient(135deg, #3dffd1 0%, #00d4a1 100%)',
              border: 0,
              color: '#0a1410',
              fontSize: 14, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              boxShadow: selectedTier === 'pro'
                ? '0 6px 20px -6px rgba(155,138,255,0.5)'
                : '0 6px 20px -6px rgba(61,255,209,0.5)',
              transition: 'transform .12s',
            }}>
            Activar {selectedTier === 'premium' ? 'Premium' : 'Pro'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="mtx-tap"
            aria-label="Cerrar sin upgrade"
            style={{
              appearance: 'none', cursor: 'pointer',
              width: '100%',
              padding: '11px 20px', borderRadius: 999,
              background: 'transparent',
              border: 0,
              color: 'rgba(255,255,255,0.45)',
              fontSize: 12,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>Ahora no</button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, portalRoot);
}


// ─ Mount ──────────────────────────────────────────────────────────────────
window.CoachPremiumGateModal = CoachPremiumGateModal;
