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

    return React.createElement('div', {
      // Backdrop full-screen, tap fuera del sheet → cierra
      onClick: onClose,
      style: {
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'mtx-fade-in .25s ease',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      },
    },
      // Sheet
      React.createElement('div', {
        onClick: function(e) { e.stopPropagation(); },
        style: {
          width: '100%', maxWidth: 440,
          background: 'linear-gradient(180deg, rgba(20,24,22,0.92) 0%, rgba(10,14,12,0.95) 100%)',
          border: '0.5px solid rgba(255,255,255,0.10)',
          borderRadius: '24px 24px 0 0',
          padding: '28px 24px 32px',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          animation: 'mtx-fade-up .35s cubic-bezier(.22,.9,.32,1) both',
          fontFamily: 'var(--ff-sans)',
          position: 'relative',
        },
      },
        // Drag handle visual
        React.createElement('div', {
          style: {
            width: 36, height: 4, borderRadius: 999,
            background: 'rgba(255,255,255,0.18)',
            margin: '0 auto 22px',
          },
        }),

        // Premium icon — sparkle grande con glow neon
        React.createElement('div', {
          style: { textAlign: 'center', marginBottom: 16 },
        },
          React.createElement('div', {
            style: {
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: 18,
              background: 'linear-gradient(180deg, rgba(61,255,209,0.18), rgba(61,255,209,0.04))',
              border: '0.5px solid rgba(61,255,209,0.35)',
              boxShadow: '0 0 32px rgba(61,255,209,0.20), inset 0 1px 0 rgba(61,255,209,0.30)',
              fontSize: 30,
            },
          }, '✦')
        ),

        // Eyebrow + title
        React.createElement('div', {
          style: { textAlign: 'center', marginBottom: 18 },
        },
          React.createElement('div', {
            style: {
              fontSize: 9.5, color: 'var(--neon)', letterSpacing: '0.18em',
              fontWeight: 700, textTransform: 'uppercase', marginBottom: 8,
            },
          }, 'Mentex Premium'),
          React.createElement('h2', {
            style: {
              margin: 0, fontSize: 22, lineHeight: 1.18, fontWeight: 700,
              color: 'var(--ink-1)', letterSpacing: '-0.015em',
            },
          }, msg.title),
          React.createElement('p', {
            style: {
              margin: '10px auto 0', maxWidth: 320,
              fontSize: 13, lineHeight: 1.5, color: 'var(--ink-3)',
            },
          }, msg.sub)
        ),

        // Benefits list (4 items compactos)
        React.createElement('div', {
          style: {
            display: 'flex', flexDirection: 'column', gap: 8,
            marginBottom: 22,
          },
        },
          PREMIUM_BENEFITS_COMPACT.map(function(b, i) {
            return React.createElement('div', {
              key: i,
              style: {
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              },
            },
              React.createElement('div', {
                style: { fontSize: 18, lineHeight: 1, flexShrink: 0 },
              }, b.icon),
              React.createElement('div', {
                style: {
                  fontSize: 12.5, fontWeight: 500,
                  color: 'var(--ink-2)', lineHeight: 1.35,
                  letterSpacing: '-0.005em',
                },
              }, b.label)
            );
          })
        ),

        // Trial pill — "💚 7 DÍAS GRATIS · Sin compromiso"
        React.createElement('div', {
          style: { textAlign: 'center', marginBottom: 16 },
        },
          React.createElement('span', {
            style: {
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              background: 'rgba(61,255,209,0.12)',
              border: '0.5px solid rgba(61,255,209,0.30)',
              fontSize: 11, fontWeight: 700, color: 'var(--neon)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            },
          },
            React.createElement('span', { style: { fontSize: 12 } }, '💚'),
            React.createElement('span', null, '7 días gratis · Sin compromiso')
          )
        ),

        // CTAs
        React.createElement('button', {
          onClick: handleActivate,
          className: 'mtx-tap',
          style: {
            width: '100%', height: 52, borderRadius: 14,
            appearance: 'none', cursor: 'pointer', border: 'none',
            background: 'var(--neon)', color: '#02110b',
            fontSize: 14.5, fontWeight: 700,
            letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
            boxShadow: '0 8px 28px rgba(61,255,209,0.30)',
          },
        }, 'Empezar 7 días gratis'),

        React.createElement('button', {
          onClick: onClose,
          className: 'mtx-tap',
          style: {
            width: '100%', marginTop: 8,
            appearance: 'none', cursor: 'pointer',
            background: 'transparent', border: 'none',
            color: 'var(--ink-3)',
            fontSize: 13, fontWeight: 500,
            fontFamily: 'var(--ff-sans)',
            padding: '12px 0',
          },
        }, 'Después'),

        React.createElement('div', {
          style: {
            textAlign: 'center', fontSize: 10.5,
            color: 'var(--ink-4, rgba(255,255,255,0.40))',
            lineHeight: 1.5,
            marginTop: 4,
          },
        }, 'Cancela cuando quieras desde Ajustes.')
      )
    );
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


  // ── Export ─────────────────────────────────────────────────────────────────
  Object.assign(window, {
    PremiumLockSheet: PremiumLockSheet,
    PremiumLockChip: PremiumLockChip,
    PREMIUM_FEATURE_MESSAGES: FEATURE_MESSAGES,
  });

})();
