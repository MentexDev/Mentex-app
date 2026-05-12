/* eslint-disable */
// ═══════════════════════════════════════════════════════════════════════════
// IA Monetization — Fase 4.2 polish
// ═══════════════════════════════════════════════════════════════════════════
//
// Extras visuales que se montan al final de UsageTab sin reescribirla:
//   1. PurchaseConfettiOverlay — burst de confeti neon cuando se compra un
//      pack (escucha mtx:ia-credit-purchased dispatcheado por purchasePack).
//   2. PurchasesHistorySection — list de últimas 5 compras desde
//      __mtxIAUsage.getPurchasesHistory(). Vacío hasta que el user compre.
//   3. UpgradePlanCTA — solo visible si plan === 'free'. Promociona Premium.
//
// Patrón:
//   • Aislado en archivo propio. UsageTab solo necesita renderizar
//     <window.MonetizationExtras/> al final — no reescribir la tab existente.
//   • Aplica checklist post-audit Fase IA-2: ref pattern para listeners,
//     cleanup explícito de setTimeout, role attributes en cards interactivas.

// ═══════════════════════════════════════════════════════════════════════════
// PurchaseConfettiOverlay — burst de confeti al comprar
// ═══════════════════════════════════════════════════════════════════════════
function PurchaseConfettiOverlay() {
  // Post-audit Fase 3+4: dos fixes contra los IMPs originales —
  //   (1) Confetti era idéntico en cada burst (useMemo con []). Ahora un
  //       burstId se incrementa por cada evento, regenera partículas con
  //       random + sirve de key al overlay para que React re-monte y CSS
  //       animation reinicie. Resultado: cada burst se ve único Y se reinicia
  //       limpiamente si el user compra 3 packs en 100ms.
  //   (2) clearTimeout en cleanup + en cada nuevo burst (ya estaba) — pero
  //       ahora el remount también garantiza CSS restart.
  var burstIdState = React.useState(0);
  var burstId = burstIdState[0]; var setBurstId = burstIdState[1];
  var burstTimerRef = React.useRef(null);

  React.useEffect(function() {
    var handler = function() {
      setBurstId(function(prev) { return prev + 1; });
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
      burstTimerRef.current = setTimeout(function() { setBurstId(function(p) { return p; /* trigger re-eval; bursting derived from timer */ }); }, 1800);
    };
    window.addEventListener('mtx:ia-credit-purchased', handler);
    return function() {
      window.removeEventListener('mtx:ia-credit-purchased', handler);
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    };
  }, []);

  // Particles se regeneran cuando burstId cambia (cada burst = nuevo set).
  // Random ahora (no determinístico) — cada burst se ve diferente.
  var particles = React.useMemo(function() {
    if (burstId === 0) return [];  // never bursted yet
    var arr = [];
    for (var i = 0; i < 24; i++) {
      var angle = (i / 24) * 360 + (Math.random() * 22 - 11);
      var dist = 90 + Math.random() * 60;
      var dx = Math.cos(angle * Math.PI / 180) * dist;
      var dy = Math.sin(angle * Math.PI / 180) * dist;
      var colors = ['var(--neon)', '#5dd3ff', '#9b8aff', '#ffc850'];
      arr.push({
        id: i,
        dx: dx, dy: dy,
        color: colors[i % colors.length],
        delay: Math.random() * 0.15,
        size: 4 + Math.random() * 4,
        shape: i % 3 === 0 ? 'circle' : 'square',
      });
    }
    return arr;
  }, [burstId]);

  // Auto-hide después de 1.8s — derivado de burstId + timer
  var visibleState = React.useState(false);
  var visible = visibleState[0]; var setVisible = visibleState[1];
  React.useEffect(function() {
    if (burstId === 0) return;
    setVisible(true);
    var t = setTimeout(function() { setVisible(false); }, 1800);
    return function() { clearTimeout(t); };
  }, [burstId]);

  if (!visible || particles.length === 0) return null;

  var portalRoot = (typeof document !== 'undefined')
    ? document.getElementById('mtx-overlay-root')
    : null;
  if (!portalRoot) return null;

  var overlay = (
    <div key={burstId} aria-hidden="true" style={{
      position: 'absolute', inset: 0, zIndex: 250,
      pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {particles.map(function(p) {
        return <div key={p.id} style={{
          position: 'absolute',
          width: p.size, height: p.size,
          borderRadius: p.shape === 'circle' ? '50%' : '2px',
          background: p.color,
          boxShadow: '0 0 8px ' + p.color,
          ['--dx']: p.dx + 'px',
          ['--dy']: p.dy + 'px',
          animation: 'mtxConfettiBurst 1.5s cubic-bezier(.22,.61,.36,1) both',
          animationDelay: p.delay + 's',
        }}/>;
      })}
    </div>
  );
  return window.ReactDOM ? window.ReactDOM.createPortal(overlay, portalRoot) : overlay;
}


// ═══════════════════════════════════════════════════════════════════════════
// PurchasesHistorySection — list de últimas 5 compras
// ═══════════════════════════════════════════════════════════════════════════
function PurchasesHistorySection() {
  // Reactivo a usage changes + tick cada 60s para que los labels relativos
  // (Hace 5 min, Hace 2h) se actualicen aunque el user no toque nada.
  // Post-audit Fase 3+4 IMP: antes "Hace un momento" quedaba estático para
  // siempre si no había nuevas compras.
  var force = React.useReducer(function(x) { return x + 1; }, 0)[1];
  React.useEffect(function() {
    var h = function() { force(); };
    window.addEventListener('mtx:ia-usage-changed', h);
    var tick = setInterval(function() { force(); }, 60_000);
    return function() {
      window.removeEventListener('mtx:ia-usage-changed', h);
      clearInterval(tick);
    };
  }, []);

  if (!window.__mtxIAUsage || !window.__mtxIAUsage.getPurchasesHistory) return null;
  // Post-audit: defensive — array guard + explicit sort por timestamp
  // (no confiar en que el getter siempre devuelva newest-first).
  var raw = window.__mtxIAUsage.getPurchasesHistory();
  if (!Array.isArray(raw)) return null;
  var history = raw.slice().sort(function(a, b) {
    return (b.purchasedAt || 0) - (a.purchasedAt || 0);
  }).slice(0, 5);
  if (history.length === 0) return null;

  function _formatRelative(ts) {
    if (!ts) return '';
    var diff = Date.now() - ts;
    if (diff < 0) return 'Recién';
    if (diff < 60_000) return 'Hace un momento';
    if (diff < 3_600_000) return 'Hace ' + Math.floor(diff / 60_000) + ' min';
    if (diff < 86_400_000) return 'Hace ' + Math.floor(diff / 3_600_000) + 'h';
    var d = Math.floor(diff / 86_400_000);
    if (d === 1) return 'Ayer';
    return 'Hace ' + d + ' días';
  }

  return (
    <div style={{ marginTop: 22, animation: 'mtx-fade-up .3s ease both' }}>
      <div className="mtx-eyebrow" style={{
        fontSize: 9.5, color: 'var(--ink-3)', padding: '0 4px 8px',
      }}>Historial de compras</div>
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '0.5px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
      }}>
        {history.map(function(r, i) {
          // Stable key: purchasedAt + packId (no index, evita re-mount al prepend)
          return (
            <div key={(r.purchasedAt || 0) + ':' + (r.packId || 'unknown')} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 13px',
              borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <div aria-hidden="true" style={{
                width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(61,255,209,0.18), rgba(61,255,209,0.04))',
                border: '0.5px solid rgba(61,255,209,0.28)',
                color: 'var(--neon)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12,
              }}>✦</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 700, color: 'var(--ink-1)',
                  fontFamily: 'var(--ff-display, var(--ff-sans))',
                  letterSpacing: '-0.012em',
                  fontVariantNumeric: 'tabular-nums',
                }}>+{Number(r.amount || 0).toLocaleString('es')} créditos</div>
                <div style={{
                  fontSize: 10.5, color: 'var(--ink-4)',
                  fontFamily: 'var(--ff-sans)',
                  marginTop: 1,
                }}>{_formatRelative(r.purchasedAt)}</div>
              </div>
              <div style={{
                fontSize: 12, fontWeight: 700, color: 'var(--ink-2)',
                fontFamily: 'var(--ff-sans)',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}>${Number(r.price || 0).toFixed(2)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// UpgradePlanCTA — visible solo si plan === 'free'
// Dispara el premium gate sheet existente vía window event
// ═══════════════════════════════════════════════════════════════════════════
function UpgradePlanCTA() {
  // Reactivo
  var force = React.useReducer(function(x) { return x + 1; }, 0)[1];
  React.useEffect(function() {
    var h = function() { force(); };
    window.addEventListener('mtx:ia-config-changed', h);
    window.addEventListener('mtx:ia-usage-changed', h);
    return function() {
      window.removeEventListener('mtx:ia-config-changed', h);
      window.removeEventListener('mtx:ia-usage-changed', h);
    };
  }, []);

  if (!window.__mtxIAUsage) return null;
  var stats = window.__mtxIAUsage.getStats();
  if (stats.plan !== 'free') return null;  // solo free

  var handleUpgrade = function() {
    // Dispatch para que premium-gate.jsx abra el sheet (si está conectado)
    window.dispatchEvent(new CustomEvent('mtx:open-premium-sheet', { detail: { source: 'usage-tab-upgrade-cta' } }));
  };

  return (
    <div style={{
      marginTop: 22,
      padding: '16px 16px',
      borderRadius: 16,
      background: 'linear-gradient(135deg, rgba(61,255,209,0.10), rgba(155,138,255,0.04))',
      border: '0.5px solid rgba(61,255,209,0.28)',
      animation: 'mtx-fade-up .3s ease both',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12,
      }}>
        <div aria-hidden="true" style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
          color: '#0a1410',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 700,
          boxShadow: '0 6px 18px -4px rgba(61,255,209,0.45)',
        }}>✦</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: 'var(--ink-1)',
            letterSpacing: '-0.015em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
            marginBottom: 3,
          }}>Desbloquea el coach completo</div>
          <div style={{
            fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.45,
            letterSpacing: '-0.005em',
          }}>200 mensajes/semana, skills oficiales, workflows automáticos y todos los canales.</div>
        </div>
      </div>

      <button onClick={handleUpgrade}
        onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleUpgrade(); } }}
        aria-label="Ver planes Premium"
        className="mtx-tap"
        style={{
          appearance: 'none', cursor: 'pointer',
          width: '100%', padding: '12px 14px', borderRadius: 13, border: 0,
          background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
          color: '#0a1410',
          fontSize: 13.5, fontWeight: 700,
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.01em',
          boxShadow: '0 4px 14px -2px rgba(61,255,209,0.42)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
        Ver planes Premium <span style={{ fontSize: 11 }}>→</span>
      </button>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// MonetizationExtras — composite que UsageTab monta al final
// ═══════════════════════════════════════════════════════════════════════════
function MonetizationExtras() {
  return (
    <>
      <UpgradePlanCTA/>
      <PurchasesHistorySection/>
      <PurchaseConfettiOverlay/>
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// CSS keyframes para confetti
// ═══════════════════════════════════════════════════════════════════════════
if (typeof document !== 'undefined' && !document.getElementById('mtx-ia-monetization-css')) {
  var style = document.createElement('style');
  style.id = 'mtx-ia-monetization-css';
  style.textContent = [
    '@keyframes mtxConfettiBurst {',
    '  0% { transform: translate(0, 0) scale(0.6); opacity: 0; }',
    '  20% { opacity: 1; }',
    '  100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);
}


// ═══════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════
Object.assign(window, {
  PurchaseConfettiOverlay: PurchaseConfettiOverlay,
  PurchasesHistorySection: PurchasesHistorySection,
  UpgradePlanCTA: UpgradePlanCTA,
  MonetizationExtras: MonetizationExtras,
});
