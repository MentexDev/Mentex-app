// screens/premium-gate.jsx — Phase 5.3 · Premium gate components
//
// Define dos primitivos para gateo Premium en toda la app:
//
//   • PremiumLockSheet — bottom sheet global montado en MentexApp. Aparece
//     cuando un consumer dispara setPremiumLockOpen(feature). Muestra el
//     icon premium, el feature contextualizado, 3 benefits, CTAs "Empezar
//     7 días gratis" y "Después". Activate trial → __mtxActivateTrial()
//     mock (en backend real esto sería Apple/Google IAP).
//
//   • Helpers para que los consumers chequeen __mtxIsPremium() y disparen
//     el sheet sin duplicar lógica.
//
// Filosofía de gates en Mentex:
//   • Comunidad y Perfil → libres (no gates)
//   • Recordatorios + iniciar sesión → libres
//   • Bloqueo de apps → premium gate (función core)
//   • IA chat → entrar libre, send/chip/new conv → premium gate
//   • Explorar → 90% gateado, 10% piezas hero libres
//
// Por qué este diseño:
//   • Hard paywall después de onboarding → conversion alta pero churn alto
//   • Soft paywall (free + gates) → conversion menor pero retención ALTA
//   • Mentex apuesta por retención: el user gratis prueba el sabor del
//     producto, descubre el valor, y eventualmente convierte por presión
//     de fricción (no por presión emocional).

(function() {
  'use strict';

  // ── Mensajes contextuales por feature ──────────────────────────────────────
  // Cada feature tiene su propio framing — no es genérico "necesitas premium",
  // habla del valor concreto que el user está intentando alcanzar.
  var FEATURE_MESSAGES = {
    'apps': {
      title: 'Bloqueo de apps · Premium',
      sub: 'El bloqueo de apps es el corazón de Mentex — la única forma de devolverte horas reales del feed. Tu trial te da acceso completo.',
    },
    'ia-chat': {
      title: 'Tu coach IA · Premium',
      sub: 'Tu coach personalizado está listo para hablar contigo, planificar tu día y recordarte lo que importa. Activa tu trial para conversar.',
    },
    'ia-quick': {
      title: 'Acciones del coach · Premium',
      sub: 'Las acciones rápidas del coach (programar, recomendar, sugerir) requieren plan activo.',
    },
    'content': {
      title: 'Catálogo completo · Premium',
      sub: 'Miles de libros, meditaciones, biografías y charlas curadas para ti. Tu trial desbloquea todo.',
    },
    'default': {
      title: 'Esta función es Premium',
      sub: 'Activa tu trial de 7 días gratis para acceder al universo completo de Mentex.',
    },
  };

  // 4 benefits universales que aparecen en cualquier lock sheet — son los
  // mismos del paywall del Step 12, pero condensados a 4 (no 5) para que el
  // sheet quepa sin scroll en mobiles pequeños.
  var PREMIUM_BENEFITS_COMPACT = [
    { icon: '♾️', label: 'Catálogo completo sin límites' },
    { icon: '✨', label: 'Coach IA conversaciones ilimitadas' },
    { icon: '🛡️', label: 'Bloqueo de apps en cualquier horario' },
    { icon: '📊', label: 'Tu progreso y métricas profundas' },
  ];

  // ── PremiumLockSheet — bottom sheet global ─────────────────────────────────
  // Montado en MentexApp como overlay cuando window.__mtxPremiumLock state es
  // truthy. El consumer dispara via window.__mtxOpenPremiumLock(feature).
  function PremiumLockSheet(props) {
    var open = !!props.open;
    var feature = props.feature || 'default';
    var onClose = props.onClose || function() {};
    var onActivate = props.onActivate || function() {};

    var msg = FEATURE_MESSAGES[feature] || FEATURE_MESSAGES['default'];

    function handleActivate() {
      if (typeof window.__mtxActivateTrial === 'function') {
        window.__mtxActivateTrial('annual');
      }
      // Toast de confirmación
      if (window.useToast) {
        try {
          var toast = window.useToast();
          toast.show && toast.show({
            message: '✦ Premium activado · 7 días gratis',
            duration: 2400,
          });
        } catch (_) {}
      }
      onActivate();
      onClose();
    }

    if (!open) return null;

    // Portal a mtx-overlay-root para que el sheet quede ANCLADO al device
    // viewport (no al window del browser). Sin esto, position:fixed se
    // calcula contra el browser y el sheet desborda lateralmente cuando el
    // device es más angosto que el browser. Pattern usado por
    // AddReminderSheet, NowPlayingScreen, etc.
    var portalRoot = (typeof document !== 'undefined')
      ? document.getElementById('mtx-overlay-root')
      : null;

    var content = React.createElement('div', {
      // Backdrop. position:absolute (no fixed) → toma el device como ref.
      onClick: onClose,
      style: {
        position: 'absolute', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'mtx-fade-in .25s ease',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      },
    },
      // Sheet — width:100% del device viewport (no maxWidth absoluto)
      React.createElement('div', {
        onClick: function(e) { e.stopPropagation(); },
        style: {
          width: '100%',
          background: 'linear-gradient(180deg, rgba(20,24,22,0.95) 0%, rgba(10,14,12,0.97) 100%)',
          border: '0.5px solid rgba(255,255,255,0.10)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 22px 28px',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          animation: 'mtx-fade-up .35s cubic-bezier(.22,.9,.32,1) both',
          fontFamily: 'var(--ff-sans)',
          position: 'relative',
          boxSizing: 'border-box',
        },
      },
        // Drag handle visual
        React.createElement('div', {
          style: {
            width: 36, height: 4, borderRadius: 999,
            background: 'rgba(255,255,255,0.18)',
            margin: '0 auto 18px',
          },
        }),

        // Premium icon — sparkle grande con glow neon. Color del SVG icon
        // explícito a #02110b NO — debe ser var(--neon) para legibilidad
        // sobre el background neon-tinted del card. Antes usábamos texto
        // emoji '✦' que renderizaba según platform: en macOS Safari como
        // negro. Ahora usamos el SVG IcSparkles con stroke neon explícito.
        React.createElement('div', {
          style: { textAlign: 'center', marginBottom: 14 },
        },
          React.createElement('div', {
            style: {
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(180deg, rgba(61,255,209,0.18), rgba(61,255,209,0.04))',
              border: '0.5px solid rgba(61,255,209,0.35)',
              boxShadow: '0 0 32px rgba(61,255,209,0.20), inset 0 1px 0 rgba(61,255,209,0.30)',
              color: 'var(--neon)',
            },
          },
            window.IcSparkles
              ? React.createElement(window.IcSparkles, { size: 28, stroke: 'currentColor', strokeWidth: 1.8 })
              : React.createElement('span', { style: { fontSize: 28, color: 'var(--neon)' } }, '✦')
          )
        ),

        // Eyebrow + title + descripción
        React.createElement('div', {
          style: { textAlign: 'center', marginBottom: 14 },
        },
          React.createElement('div', {
            style: {
              fontSize: 9.5, color: 'var(--neon)', letterSpacing: '0.18em',
              fontWeight: 700, textTransform: 'uppercase', marginBottom: 6,
            },
          }, 'Mentex Premium'),
          React.createElement('h2', {
            style: {
              margin: 0, fontSize: 20, lineHeight: 1.18, fontWeight: 700,
              color: 'var(--ink-1)', letterSpacing: '-0.015em',
            },
          }, msg.title),
          React.createElement('p', {
            style: {
              margin: '8px auto 0', maxWidth: 320,
              fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)',
            },
          }, msg.sub)
        ),

        // Trial pill MOVIDO ARRIBA — debajo de la descripción, antes de los
        // benefits. Da el "anchor emocional" (gratis, sin compromiso) antes
        // de que el user lea las features. Más persuasivo.
        React.createElement('div', {
          style: { textAlign: 'center', marginBottom: 14 },
        },
          React.createElement('span', {
            style: {
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              background: 'rgba(61,255,209,0.12)',
              border: '0.5px solid rgba(61,255,209,0.30)',
              fontSize: 10.5, fontWeight: 700, color: 'var(--neon)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            },
          },
            React.createElement('span', { style: { fontSize: 11 } }, '💚'),
            React.createElement('span', null, '7 días gratis · Sin compromiso')
          )
        ),

        // Benefits list (4 items compactos)
        React.createElement('div', {
          style: {
            display: 'flex', flexDirection: 'column', gap: 6,
            marginBottom: 18,
          },
        },
          PREMIUM_BENEFITS_COMPACT.map(function(b, i) {
            return React.createElement('div', {
              key: i,
              style: {
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '9px 12px',
                borderRadius: 11,
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              },
            },
              React.createElement('div', {
                style: { fontSize: 16, lineHeight: 1, flexShrink: 0 },
              }, b.icon),
              React.createElement('div', {
                style: {
                  fontSize: 12, fontWeight: 500,
                  color: 'var(--ink-2)', lineHeight: 1.35,
                  letterSpacing: '-0.005em',
                },
              }, b.label)
            );
          })
        ),

        // CTAs
        React.createElement('button', {
          onClick: handleActivate,
          className: 'mtx-tap',
          style: {
            width: '100%', height: 50, borderRadius: 14,
            appearance: 'none', cursor: 'pointer', border: 'none',
            background: 'var(--neon)', color: '#02110b',
            fontSize: 14, fontWeight: 700,
            letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
            boxShadow: '0 8px 28px rgba(61,255,209,0.30)',
          },
        }, 'Empezar 7 días gratis'),

        React.createElement('button', {
          onClick: onClose,
          className: 'mtx-tap',
          style: {
            width: '100%', marginTop: 6,
            appearance: 'none', cursor: 'pointer',
            background: 'transparent', border: 'none',
            color: 'var(--ink-3)',
            fontSize: 12.5, fontWeight: 500,
            fontFamily: 'var(--ff-sans)',
            padding: '10px 0',
          },
        }, 'Después'),

        React.createElement('div', {
          style: {
            textAlign: 'center', fontSize: 10,
            color: 'var(--ink-4, rgba(255,255,255,0.40))',
            lineHeight: 1.5,
            marginTop: 2,
          },
        }, 'Cancela cuando quieras desde Ajustes.')
      )
    );

    // Si hay portalRoot, montar el sheet allí. Si no (caso fallback),
    // renderizar directo (mejor que no mostrar nada).
    return (portalRoot && window.ReactDOM)
      ? window.ReactDOM.createPortal(content, portalRoot)
      : content;
  }


  // ── PremiumLock chip — pill flotante "PREMIUM" para indicar feature locked ─
  // Visual reusable. Aparece como overlay top-right de cualquier card que
  // está locked. No es interactivo — el tap del card padre es el que abre el
  // sheet. Solo es indicador visual de "esto requiere premium".
  function PremiumLockChip(props) {
    var size = props.size || 'md'; // 'sm' | 'md'
    var isSmall = size === 'sm';
    return React.createElement('div', {
      style: {
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: isSmall ? '3px 8px' : '4px 10px',
        borderRadius: 999,
        background: 'linear-gradient(135deg, rgba(61,255,209,0.20), rgba(61,255,209,0.06))',
        border: '0.5px solid rgba(61,255,209,0.40)',
        boxShadow: '0 0 12px rgba(61,255,209,0.18), inset 0 1px 0 rgba(61,255,209,0.20)',
        fontSize: isSmall ? 9 : 9.5,
        fontWeight: 800,
        color: 'var(--neon)',
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        fontFamily: 'var(--ff-sans)',
      },
    },
      React.createElement('span', { style: { fontSize: isSmall ? 9 : 10, lineHeight: 1 } }, '✦'),
      React.createElement('span', null, 'Premium')
    );
  }


  // ── PremiumSuccessScreen ───────────────────────────────────────────────────
  // Pantalla de celebración post-suscripción. Aparece UNA SOLA VEZ después del
  // onboarding cuando el user selecciona un plan de pago (selectedPlan !== 'free').
  // MentexApp detecta la transición onboarding→app con plan pago y monta este
  // overlay (zIndex:55) encima de la app. El user toca "Comenzar" y el overlay
  // se desmonta — la app queda visible debajo sin ningún flash.
  function PremiumSuccessScreen({ onStart }) {
    const [dismissed, setDismissed] = React.useState(false);

    const handleStart = () => {
      setDismissed(true);
      setTimeout(onStart, 380);
    };

    // Confetti — 34 piezas, colores del universo Mentex + fiesta
    const CONFETTI_COLORS = ['#3dffd1','#7dffe0','#FFD66B','#9b8aff','#ff6b9d','#4d96ff','#c77dff','#ffd93d','#6bcb77'];
    const confettiPieces = Array.from({ length: 34 }, (_, i) => {
      const left  = (i * 11 + 3) % 100;
      const delay = (i * 0.21) % 5;
      const dur   = 3.0 + (i % 6) * 0.38;
      const anim  = i % 3;
      const size  = 4 + (i % 4) * 2;
      const round = i % 3 !== 1;
      return { left, delay, dur, anim, size, round, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] };
    });

    // Bokeh blobs — luz difusa de colores de fondo (como en la referencia)
    const BOKEH = [
      { left:'6%',  top:'20%', color:'#ff6b9d', size:110, blur:48 },
      { left:'72%', top:'22%', color:'#ffd93d',  size:80,  blur:36 },
      { left:'10%', top:'58%', color:'#4d96ff',  size:95,  blur:42 },
      { left:'76%', top:'60%', color:'#c77dff',  size:105, blur:44 },
      { left:'42%', top:'4%',  color:'#3dffd1',  size:72,  blur:36 },
      { left:'58%', top:'78%', color:'#ff6b9d',  size:78,  blur:40 },
      { left:'28%', top:'80%', color:'#6bcb77',  size:65,  blur:34 },
    ];

    return (
      <div style={{
        position:'absolute', inset:0, zIndex:55,
        background:'#050706',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'space-between',
        overflow:'hidden',
        animation: dismissed
          ? 'mtxPremiumOut .38s cubic-bezier(.4,0,1,1) both'
          : 'mtxPremiumIn .6s cubic-bezier(.25,.8,.25,1) both',
      }}>
        <style>{`
          @keyframes mtxPremiumIn  { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
          @keyframes mtxPremiumOut { from { opacity:1; transform:scale(1)    } to { opacity:0; transform:scale(1.04) } }
          @keyframes mtxPremiumBadge { 0%{opacity:0;transform:scale(0.25) rotate(-18deg)} 65%{transform:scale(1.14) rotate(4deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
          @keyframes mtxPremiumGlow  { 0%,100%{box-shadow:0 0 32px rgba(61,255,209,.45),0 0 60px rgba(61,255,209,.18)} 50%{box-shadow:0 0 52px rgba(61,255,209,.65),0 0 90px rgba(61,255,209,.30)} }
          @keyframes mtxPremiumC0 { 0%{transform:translateY(-16px) rotate(0);opacity:0} 8%{opacity:1} 100%{transform:translateY(980px) rotate(390deg);opacity:0} }
          @keyframes mtxPremiumC1 { 0%{transform:translateY(-16px) rotate(0);opacity:0} 8%{opacity:1} 100%{transform:translateY(870px) rotate(-390deg);opacity:0} }
          @keyframes mtxPremiumC2 { 0%{transform:translateY(-16px) rotate(0);opacity:0} 8%{opacity:1} 100%{transform:translateY(1060px) rotate(210deg);opacity:0} }
          @keyframes mtxPremiumTextIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
          @keyframes mtxPremiumCTAIn  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        `}</style>

        {/* Bokeh background blobs */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0 }}>
          {BOKEH.map((b, i) => (
            <div key={i} style={{
              position:'absolute', left:b.left, top:b.top,
              width:b.size, height:b.size, borderRadius:'50%',
              background:b.color,
              filter:`blur(${b.blur}px)`,
              opacity:0.52,
              transform:'translateX(-50%) translateY(-50%)',
            }}/>
          ))}
        </div>

        {/* Falling confetti */}
        {confettiPieces.map((p, i) => (
          <div key={i} style={{
            position:'absolute', top:-14, left:`${p.left}%`,
            width:p.size, height:p.round ? p.size : p.size * 1.9,
            borderRadius: p.round ? '50%' : 2,
            background:p.color, opacity:0.88,
            animation:`mtxPremiumC${p.anim} ${p.dur}s cubic-bezier(.25,.46,.45,.94) ${p.delay}s infinite`,
            pointerEvents:'none', zIndex:1,
          }}/>
        ))}

        {/* ── Centro: pill con ring iridiscente ── */}
        <div style={{
          flex:1, display:'flex', alignItems:'center', justifyContent:'center',
          position:'relative', zIndex:2, width:'100%',
        }}>
          {/* Ring wrapper — padding crea el borde de color */}
          <div style={{
            position:'relative',
            width:228, height:308,
            borderRadius:76,
            padding:3.5,
            background:'conic-gradient(from 210deg at 50% 50%, #ff6b9d 0%, #ffd93d 16%, #6bcb77 30%, #3dffd1 46%, #4d96ff 62%, #c77dff 78%, #ff9f6b 90%, #ff6b9d 100%)',
            boxShadow:'0 0 55px rgba(61,255,209,.16), 0 0 110px rgba(155,85,255,.12)',
          }}>
            {/* Glass inner pill */}
            <div style={{
              width:'100%', height:'100%',
              borderRadius:72,
              background:'rgba(5,7,6,0.91)',
              backdropFilter:'blur(24px)',
              WebkitBackdropFilter:'blur(24px)',
              border:'0.5px solid rgba(255,255,255,0.07)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {/* Neon check badge */}
              <div style={{
                width:70, height:70, borderRadius:999,
                background:'linear-gradient(145deg, #3dffd1, #1dc9a0)',
                display:'flex', alignItems:'center', justifyContent:'center',
                animation:'mtxPremiumBadge .82s cubic-bezier(.175,.885,.32,1.275) .35s both, mtxPremiumGlow 2.6s ease-in-out 1.2s infinite',
              }}>
                <svg width={34} height={34} viewBox="0 0 34 34" fill="none">
                  <path d="M8 17.5L14.5 24L26 12" stroke="#050706" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom: texto + CTA ── */}
        <div style={{ width:'100%', padding:'0 28px 46px', zIndex:2, textAlign:'center' }}>
          <h1 style={{
            margin:'0 0 9px',
            fontSize:32, fontWeight:800,
            color:'var(--ink-1)', letterSpacing:'-0.025em', lineHeight:1.1,
            fontFamily:'var(--ff-sans)',
            animation:'mtxPremiumTextIn .5s ease .92s both',
          }}>¡Todo listo!</h1>
          <p style={{
            margin:'0 0 26px',
            fontSize:14.5, lineHeight:1.6, color:'var(--ink-3)',
            fontFamily:'var(--ff-sans)',
            animation:'mtxPremiumTextIn .5s ease 1.06s both',
          }}>
            Tu suscripción está activa.<br/>Bienvenido a Mentex Premium.
          </p>
          <button
            type="button"
            onClick={handleStart}
            className="mtx-tap"
            style={{
              width:'100%', padding:'17px 24px',
              borderRadius:100, border:'none', cursor:'pointer',
              background:'var(--ink-1)', color:'#030a07',
              fontSize:16, fontWeight:800,
              fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
              animation:'mtxPremiumCTAIn .5s ease 1.22s both',
            }}
          >
            Comenzar a escuchar
          </button>
        </div>
      </div>
    );
  }


  // ── Export ─────────────────────────────────────────────────────────────────
  Object.assign(window, {
    PremiumLockSheet: PremiumLockSheet,
    PremiumLockChip: PremiumLockChip,
    PremiumSuccessScreen: PremiumSuccessScreen,
    PREMIUM_FEATURE_MESSAGES: FEATURE_MESSAGES,
  });

})();
