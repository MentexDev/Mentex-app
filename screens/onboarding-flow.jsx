// screens/onboarding-flow.jsx — Phase 3 · Onboarding 10 steps
//
// El onboarding es el primer ritual de Mentex: donde el user pasa de "instalé
// otra app" a "esta app me entiende". Cada step desbloquea un feature concreto
// del app, así no se siente cuestionario sino configuración con propósito.
//
// 10 steps, 4 capas:
//   Capa 1 · Identidad     →  1. Tu perfil (nombre + username + tagline + bio)
//                              2. Tu intención (goal primario)
//   Capa 2 · Diagnóstico   →  3. Tu punto de partida (screen time baseline)
//                              4. Tus distractores (apps a bloquear)
//   Capa 3 · Configuración →  5. Tu energía (content prefs)
//                              6. Tu hora dorada (focus time)
//                              7. Tu sesión inicial (duración)
//   Capa 4 · Activación    →  8. Voz de tu coach
//                              9. Construyendo tu universo (fake-load)
//                             10. Listos · soft-ask notifs
//
// Al final, complete() llena __mtxProfile (Step 1 data) y __mtxAuth.user.
// Las preferencias completas viven en __mtxOnboarding.answers — futuras phases
// las leen para personalizar Home, Explorar, IA y Comunidad.

(function() {
  'use strict';

  // ── Data constants ─────────────────────────────────────────────────────────

  // 10 goals — multi-select. Layout grid 2-col compacto (icon arriba + label).
  var GOAL_OPTIONS = [
    { id: 'productivity', label: 'Productividad',    icon: '🎯' },
    { id: 'rest',         label: 'Descanso mental',  icon: '🌙' },
    { id: 'learn',        label: 'Aprender más',     icon: '📚' },
    { id: 'sleep',        label: 'Dormir mejor',     icon: '😴' },
    { id: 'anxiety',      label: 'Menos ansiedad',   icon: '🌿' },
    { id: 'focus',        label: 'Concentrarme',     icon: '🧠' },
    { id: 'habits',       label: 'Crear hábitos',    icon: '🌱' },
    { id: 'self',         label: 'Conmigo mismo',    icon: '✨' },
    { id: 'detox',        label: 'Menos redes',      icon: '🚫' },
    { id: 'create',       label: 'Crear más',        icon: '🛠️' },
  ];

  // 9 apps más comunes en distracción. Ids matchean APPS en components/app-icons.jsx
  // (IDs son cortos: 'ig'=Instagram, 'tt'=TikTok, 'yt'=YouTube, etc).
  var APP_DISTRACTOR_IDS = [
    'ig', 'tt', 'yt', 'x',
    'rd', 'sn', 'wa', 'fb', 'nf',
  ];

  // Content prefs — grid 2-col compacto (igual visual que goals).
  var CONTENT_OPTIONS = [
    { id: 'books',        label: 'Libros',         icon: '📚' },
    { id: 'meditations',  label: 'Meditaciones',   icon: '🧘' },
    { id: 'biographies',  label: 'Biografías',     icon: '🌟' },
    { id: 'talks',        label: 'Charlas',        icon: '🎙️' },
    { id: 'sounds',       label: 'Sonidos',        icon: '🎵' },
    { id: 'mind',         label: 'Filosofía',      icon: '🧠' },
    { id: 'science',      label: 'Ciencia',        icon: '🔬' },
    { id: 'sleep',        label: 'Para dormir',    icon: '🌙' },
  ];

  var FOCUS_TIME_OPTIONS = [
    { id: 'morning',   label: 'Mañana',   icon: '🌅', desc: '5 — 10 AM' },
    { id: 'afternoon', label: 'Tarde',    icon: '☀️', desc: '12 — 5 PM' },
    { id: 'evening',   label: 'Noche',    icon: '🌙', desc: '8 PM en adelante' },
    { id: 'variable',  label: 'Variable', icon: '🔄', desc: 'Depende del día' },
  ];

  // Duración de la rutina diaria en HORAS — Mentex no es Pomodoro,
  // es rutina sostenida en el día compuesta por contenido + sesiones.
  var ROUTINE_DURATIONS = [
    { value: 1,  label: '1 hora',   tagline: 'Para empezar simple' },
    { value: 2,  label: '2 horas',  tagline: 'El equilibrio diario' },
    { value: 3,  label: '3 horas',  tagline: 'Inversión seria' },
    { value: 6,  label: '6 horas',  tagline: 'Modo hardcore' },
    { value: 12, label: '12 horas', tagline: 'Los más enfocados' },
  ];

  var COACH_VOICES = [
    { id: 'warm',          label: 'Cercano',       icon: '💚', preview: '"Hola, qué bueno tenerte. ¿Cómo viene el día?"' },
    { id: 'contemplative', label: 'Contemplativo', icon: '🌌', preview: '"Bienvenido a este momento. Respira y empecemos."' },
    { id: 'energetic',     label: 'Energético',    icon: '⚡', preview: '"¡Vamos! Hoy es un gran día para enfocarte."' },
    { id: 'wise',          label: 'Sabio',         icon: '🦉', preview: '"Cada elección moldea la mente. Esta también."' },
  ];

  var TAGLINE_SUGGESTIONS = [
    'Mente despierta · Aprendiendo en silencio',
    'Construyendo, sin volumen',
    'Foco antes que ruido',
    'El silencio como práctica',
    'Curioso por oficio',
    'Cada día, una mente más afilada',
  ];


  // ── UI primitives ──────────────────────────────────────────────────────────

  // ProgressDots: 10 segmentos sutiles arriba. El activo + completados son
  // neon, los pendientes son glass.
  function ProgressDots(props) {
    var current = props.current; // 0-indexed
    var total = props.total;
    var dots = [];
    for (var i = 0; i < total; i++) {
      var done = i < current;
      var active = i === current;
      dots.push(
        React.createElement('div', {
          key: i,
          style: {
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: done
              ? 'rgba(61,255,209,0.65)'
              : (active ? 'var(--neon)' : 'rgba(255,255,255,0.10)'),
            boxShadow: active ? '0 0 8px rgba(61,255,209,0.50)' : 'none',
            transition: 'background .25s ease, box-shadow .25s ease',
          },
        })
      );
    }
    return React.createElement('div', {
      style: {
        display: 'flex', gap: 4, padding: '0 24px',
        marginTop: 18, marginBottom: 6,
      },
    }, dots);
  }


  // Eyebrow + Title + Subtitle bloque header de cada step.
  function StepHeader(props) {
    return React.createElement('div', {
      style: { padding: '0 28px', marginBottom: 26, textAlign: 'center' },
    },
      React.createElement('div', {
        style: {
          fontSize: 9.5, color: 'var(--neon)', letterSpacing: '0.18em',
          fontWeight: 700, textTransform: 'uppercase', marginBottom: 12,
        },
      }, props.eyebrow || 'Paso ' + ((props.stepIndex || 0) + 1)),
      React.createElement('h1', {
        style: {
          margin: 0, fontSize: 26, lineHeight: 1.18, fontWeight: 700,
          color: 'var(--ink-1)', letterSpacing: '-0.01em',
        },
      }, props.title),
      props.subtitle && React.createElement('p', {
        style: {
          margin: '10px auto 0', maxWidth: 300,
          fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-3)',
        },
      }, props.subtitle)
    );
  }


  // MentexTipBox — caja contextual reutilizable con efecto verdoso brillante.
  // Mismo lenguaje visual que la wow box del Step 3 (gradient neon + glow +
  // inset rim). Aparece en steps 4-7 explicando cómo Mentex usa cada decisión.
  // Es el "puente" entre la pregunta del step y el valor concreto que entrega.
  function MentexTipBox(props) {
    return React.createElement('div', {
      style: Object.assign({
        padding: '12px 14px',
        background: 'linear-gradient(180deg, rgba(61,255,209,0.10), rgba(61,255,209,0.02))',
        border: '0.5px solid rgba(61,255,209,0.28)',
        borderRadius: 14,
        boxShadow: '0 0 24px rgba(61,255,209,0.06), inset 0 1px 0 rgba(61,255,209,0.18)',
      }, props.style || {}),
    },
      props.eyebrow && React.createElement('div', {
        style: {
          fontSize: 9.5, fontWeight: 700, color: 'var(--neon)',
          letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6,
        },
      }, props.eyebrow),
      React.createElement('div', {
        style: { fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 },
      }, props.children)
    );
  }


  // Style helper: gradient + edge highlight para botones unselected. Da "vida"
  // sin filter:blur (que genera GPU bugs). Background con gradient sutil top→
  // bottom + box-shadow inset para edge highlight.
  function _bgForState(selected, accent) {
    if (selected) {
      return {
        background: 'linear-gradient(180deg, rgba(61,255,209,0.16), rgba(61,255,209,0.05))',
        borderColor: 'rgba(61,255,209,0.50)',
        boxShadow: '0 0 28px rgba(61,255,209,0.14), inset 0 1px 0 rgba(61,255,209,0.22)',
      };
    }
    return {
      background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.012))',
      borderColor: 'rgba(255,255,255,0.10)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    };
  }


  // CompactOptionCard — grid 2-col. Icon arriba grande + label abajo. Check
  // overlay top-right cuando seleccionado. Reutilizable para goals + content
  // prefs + cualquier multi-select de muchas opciones donde queremos densidad.
  function CompactOptionCard(props) {
    var selected = !!props.selected;
    var bg = _bgForState(selected);
    return React.createElement('button', {
      onClick: props.onClick,
      className: 'mtx-tap',
      style: {
        position: 'relative',
        appearance: 'none', cursor: 'pointer',
        padding: '14px 8px',
        borderRadius: 14,
        background: bg.background,
        border: '0.5px solid ' + bg.borderColor,
        boxShadow: bg.boxShadow,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8,
        transition: 'all .18s ease',
        fontFamily: 'var(--ff-sans)',
        minHeight: 86,
      },
    },
      React.createElement('div', {
        style: { fontSize: 26, lineHeight: 1 },
      }, props.icon),
      React.createElement('div', {
        style: {
          fontSize: 12.5, fontWeight: 600,
          color: selected ? 'var(--ink-1)' : 'var(--ink-2)',
          textAlign: 'center',
          letterSpacing: '-0.005em',
          lineHeight: 1.2,
        },
      }, props.label),
      selected && React.createElement('div', {
        style: {
          position: 'absolute', top: 8, right: 8,
          width: 18, height: 18, borderRadius: 9,
          background: 'var(--neon)',
          color: '#02110b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
      }, React.createElement(window.IcCheck || 'span', { size: 11, stroke: 'currentColor', strokeWidth: 2.6 }))
    );
  }


  // OptionCard: card grande horizontal (icon + label + desc + check).
  // Para steps donde la desc añade valor y el set es chico (focus times,
  // coach voices, notification toggles).
  function OptionCard(props) {
    var selected = !!props.selected;
    var compact = !!props.compact;
    var bg = _bgForState(selected);
    return React.createElement('button', {
      onClick: props.onClick,
      className: 'mtx-tap',
      style: {
        width: '100%',
        appearance: 'none', cursor: 'pointer',
        textAlign: 'left',
        padding: compact ? '11px 14px' : '16px 18px',
        borderRadius: compact ? 13 : 16,
        background: bg.background,
        border: '0.5px solid ' + bg.borderColor,
        boxShadow: bg.boxShadow,
        display: 'flex', alignItems: 'center', gap: compact ? 11 : 14,
        transition: 'all .18s ease',
        fontFamily: 'var(--ff-sans)',
      },
    },
      React.createElement('div', {
        style: {
          width: compact ? 36 : 44, height: compact ? 36 : 44,
          borderRadius: compact ? 10 : 12,
          background: selected ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.04)',
          border: '0.5px solid ' + (selected ? 'rgba(61,255,209,0.30)' : 'rgba(255,255,255,0.06)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: compact ? 18 : 22, lineHeight: 1, flexShrink: 0,
        },
      }, props.icon),
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', {
          style: {
            fontSize: compact ? 13.5 : 14.5, fontWeight: 600,
            color: selected ? 'var(--ink-1)' : 'var(--ink-2)',
            marginBottom: props.desc ? 2 : 0,
            letterSpacing: '-0.005em',
          },
        }, props.label),
        props.desc && React.createElement('div', {
          style: { fontSize: compact ? 11.5 : 12, color: 'var(--ink-3)', lineHeight: 1.35 },
        }, props.desc)
      ),
      selected && React.createElement('div', {
        style: {
          width: compact ? 20 : 22, height: compact ? 20 : 22,
          borderRadius: compact ? 10 : 11,
          background: 'var(--neon)',
          color: '#02110b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        },
      }, React.createElement(window.IcCheck || 'span', { size: compact ? 12 : 14, stroke: 'currentColor', strokeWidth: 2.5 }))
    );
  }


  // PrimaryCTA: botón grande neon solid. Disabled state diferenciado.
  function PrimaryCTA(props) {
    var disabled = !!props.disabled;
    return React.createElement('button', {
      onClick: disabled ? undefined : props.onClick,
      disabled: disabled,
      className: 'mtx-tap',
      style: {
        width: '100%',
        height: 52,
        borderRadius: 14,
        appearance: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        background: disabled
          ? 'rgba(255,255,255,0.06)'
          : 'var(--neon)',
        color: disabled ? 'var(--ink-3)' : '#02110b',
        fontSize: 14.5, fontWeight: 700,
        letterSpacing: '-0.005em',
        fontFamily: 'var(--ff-sans)',
        boxShadow: disabled ? 'none' : '0 8px 28px rgba(61,255,209,0.28)',
        transition: 'background .2s ease, box-shadow .2s ease, opacity .2s ease',
        opacity: disabled ? 0.55 : 1,
      },
    }, props.label || 'Continuar');
  }


  // LinkButton: botón de texto (back/skip).
  function LinkButton(props) {
    return React.createElement('button', {
      onClick: props.onClick,
      className: 'mtx-tap',
      style: {
        appearance: 'none', cursor: 'pointer',
        background: 'transparent', border: 'none',
        color: 'var(--ink-3)',
        fontSize: 13, fontWeight: 500,
        fontFamily: 'var(--ff-sans)',
        padding: '8px 12px',
      },
    }, props.label);
  }


  // ── Onboarding shell ───────────────────────────────────────────────────────
  // Capa visual común a todos los steps: progress dots arriba, body central,
  // footer con back/skip + primary CTA.
  function OnboardingShell(props) {
    var stepIndex = props.stepIndex;
    var totalSteps = props.totalSteps || 10;
    var canBack = stepIndex > 0 && !props.lockNav;
    var canSkip = !!props.canSkip && !props.lockNav;
    var hideFooter = !!props.hideFooter;

    return React.createElement('div', {
      style: {
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'radial-gradient(120% 80% at 50% -10%, rgba(61,255,209,0.06), transparent 55%), #050706',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      },
    },
      // Top: status-bar safe area + progress
      React.createElement('div', {
        style: { paddingTop: 44 /* status bar */, flexShrink: 0 },
      },
        React.createElement(ProgressDots, { current: stepIndex, total: totalSteps })
      ),

      // Body: scrollable content
      React.createElement('div', {
        key: 'step-body-' + stepIndex,
        style: {
          flex: 1,
          overflowY: 'auto',
          paddingTop: 22,
          paddingBottom: 32,
          animation: 'mtx-fade-in .35s ease',
          WebkitOverflowScrolling: 'touch',
        },
      }, props.children),

      // Footer: back/skip row + primary CTA
      !hideFooter && React.createElement('div', {
        style: {
          flexShrink: 0,
          padding: '12px 24px 28px',
          background: 'linear-gradient(180deg, rgba(5,7,6,0) 0%, rgba(5,7,6,0.85) 35%, #050706 70%)',
          borderTop: '0.5px solid rgba(255,255,255,0.04)',
        },
      },
        React.createElement('div', {
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 8, minHeight: 28,
          },
        },
          canBack
            ? React.createElement(LinkButton, { onClick: props.onBack, label: '← Atrás' })
            : React.createElement('span', null),
          canSkip
            ? React.createElement(LinkButton, { onClick: props.onSkip, label: 'Saltar' })
            : React.createElement('span', null)
        ),
        React.createElement(PrimaryCTA, {
          onClick: props.onNext,
          disabled: !!props.ctaDisabled,
          label: props.ctaLabel || 'Continuar',
        })
      )
    );
  }


  // ── Reusable input ─────────────────────────────────────────────────────────

  // Estilo unified para inputs — mismo gradient + edge highlight que los
  // OptionCard unselected del step 6, así los inputs del step 1 no se sienten
  // muertos comparados con las cards de los demás steps.
  var INPUT_STYLE_BASE = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.012))',
    border: '0.5px solid rgba(255,255,255,0.10)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    borderRadius: 12,
    outline: 'none',
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
    color: 'var(--ink-1)',
    fontFamily: 'var(--ff-sans)',
    transition: 'border-color .15s ease, box-shadow .15s ease',
  };

  function MtxLabeledInput(props) {
    var IconComp = props.icon;
    var hasIcon = !!IconComp;
    return React.createElement('div', { style: { marginBottom: 14 } },
      props.label && React.createElement('div', {
        style: {
          fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em',
          fontWeight: 600, textTransform: 'uppercase', marginBottom: 6,
        },
      }, props.label),
      React.createElement('div', { style: { position: 'relative' } },
        hasIcon && React.createElement('div', {
          style: {
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--ink-3)', display: 'flex', alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 1,
          },
        }, React.createElement(IconComp, { size: 16, stroke: 'currentColor', strokeWidth: 1.6 })),
        props.multiline
          ? React.createElement('textarea', {
              value: props.value || '',
              onChange: function(e) { props.onChange(e.target.value); },
              placeholder: props.placeholder || '',
              rows: props.rows || 3,
              maxLength: props.maxLength,
              style: Object.assign({}, INPUT_STYLE_BASE, {
                width: '100%',
                padding: hasIcon ? '12px 14px 12px 40px' : '12px 14px',
                fontSize: 14, lineHeight: 1.5,
                resize: 'none',
              }),
            })
          : React.createElement('input', {
              type: props.type || 'text',
              value: props.value || '',
              onChange: function(e) { props.onChange(e.target.value); },
              placeholder: props.placeholder || '',
              maxLength: props.maxLength,
              autoCapitalize: props.autoCapitalize || 'off',
              autoCorrect: props.autoCorrect || 'off',
              spellCheck: props.spellCheck === false ? 'false' : undefined,
              style: Object.assign({}, INPUT_STYLE_BASE, {
                width: '100%',
                height: 46,
                padding: hasIcon ? '0 14px 0 40px' : '0 14px',
                fontSize: 14,
              }),
            }),
        props.suffix && React.createElement('div', {
          style: {
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 11, color: 'var(--ink-3)',
          },
        }, props.suffix)
      ),
      props.hint && React.createElement('div', {
        style: { fontSize: 11.5, color: 'var(--ink-4, rgba(255,255,255,0.40))', marginTop: 6 },
      }, props.hint)
    );
  }


  // ── Step 1: Identidad / perfil ─────────────────────────────────────────────
  function StepProfile(props) {
    var ans = props.answers;
    var onChange = props.onChange;
    var IcUserComp = window.IcUser;

    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 1 · Identidad',
        title: 'Empecemos por ti.',
        subtitle: 'Una identidad simple para empezar. Puedes ajustar todo después en tu perfil.',
      }),
      React.createElement('div', { style: { padding: '0 28px' } },
        React.createElement(MtxLabeledInput, {
          label: 'Nombre',
          icon: IcUserComp,
          value: ans.name,
          onChange: function(v) { onChange({ name: v }); },
          placeholder: 'Cómo te llamamos',
          maxLength: 32,
          autoCapitalize: 'words',
        }),

        React.createElement(MtxLabeledInput, {
          label: 'Nombre de usuario',
          value: ans.username,
          onChange: function(v) {
            // Sanea: lowercase, sin espacios, solo a-z 0-9 _ . —
            // se permite que el user escriba con @ pero lo quitamos al guardar.
            var sane = String(v || '').toLowerCase()
              .replace(/^@+/, '')
              .replace(/[^a-z0-9_.]/g, '');
            onChange({ username: sane });
          },
          placeholder: 'tu_usuario',
          maxLength: 24,
          suffix: ans.username ? null : '@',
          hint: ans.username ? '@' + ans.username : 'Solo letras, números, "_" y "."',
        }),

        React.createElement('div', { style: { marginBottom: 14 } },
          React.createElement('div', {
            style: {
              fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em',
              fontWeight: 600, textTransform: 'uppercase', marginBottom: 6,
            },
          }, 'Tagline'),
          React.createElement('input', {
            type: 'text',
            value: ans.tagline || '',
            onChange: function(e) { onChange({ tagline: e.target.value }); },
            placeholder: 'Una frase que te describa',
            maxLength: 60,
            style: Object.assign({}, INPUT_STYLE_BASE, {
              width: '100%', height: 46, padding: '0 14px',
              fontSize: 14,
            }),
          }),
          // Chips de sugerencia
          React.createElement('div', {
            style: {
              marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6,
            },
          },
            TAGLINE_SUGGESTIONS.map(function(s) {
              var active = ans.tagline === s;
              return React.createElement('button', {
                key: s,
                onClick: function() { onChange({ tagline: s }); },
                className: 'mtx-tap',
                style: {
                  appearance: 'none', cursor: 'pointer',
                  padding: '6px 11px',
                  fontFamily: 'var(--ff-sans)',
                  fontSize: 11.5, fontWeight: 500,
                  borderRadius: 999,
                  background: active ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.04)',
                  border: '0.5px solid ' + (active ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.08)'),
                  color: active ? 'var(--neon)' : 'var(--ink-2)',
                  transition: 'all .18s ease',
                },
              }, s);
            })
          )
        ),

        React.createElement(MtxLabeledInput, {
          label: 'Bio · opcional',
          value: ans.bio,
          onChange: function(v) { onChange({ bio: v }); },
          placeholder: 'Algo más sobre ti (opcional)',
          maxLength: 160,
          multiline: true,
          rows: 3,
          hint: (ans.bio ? ans.bio.length : 0) + '/160',
        })
      )
    );
  }


  // ── Step 2: Goals (multi-select) ───────────────────────────────────────────
  function StepGoal(props) {
    var ans = props.answers;
    var onChange = props.onChange;
    var picked = ans.goals || [];

    function toggle(id) {
      var next = picked.indexOf(id) >= 0
        ? picked.filter(function(p) { return p !== id; })
        : picked.concat([id]);
      onChange({ goals: next });
    }

    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 2 · Intención',
        title: '¿Qué quieres lograr?',
        subtitle: 'Elige todos los que te resuenen. Personalizan el contenido y el tono de tu coach.',
      }),
      React.createElement('div', {
        style: {
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        },
      },
        GOAL_OPTIONS.map(function(g) {
          return React.createElement(CompactOptionCard, {
            key: g.id,
            icon: g.icon,
            label: g.label,
            selected: picked.indexOf(g.id) >= 0,
            onClick: function() { toggle(g.id); },
          });
        })
      ),
      React.createElement('div', { style: { padding: '14px 24px 0' } },
        React.createElement(MentexTipBox, {
          eyebrow: '✦ Mentex, tu mejor compañero',
        }, 'Miles de personas como tú están reordenando su mente con Mentex — sea para crear, descansar, aprender o simplemente volver a sentirse dueños de su tiempo. No estás solo en esto.')
      )
    );
  }


  // ── Step 3: Baseline screen time (slider + impacto proyectado) ─────────────
  // El "wow" de este step es mostrar el costo oculto del scroll (días/año
  // perdidos) Y la oportunidad real (horas que Mentex te puede devolver).
  // El user pasa de "esto es estadística" a "esto es mi vida en juego".
  function StepBaseline(props) {
    var ans = props.answers;
    var onChange = props.onChange;
    var hours = typeof ans.baselineHours === 'number' ? ans.baselineHours : 6;
    var weeklyHrs = hours * 7;
    var yearlyHrs = hours * 365;
    var yearlyDays = Math.round(yearlyHrs / 24);
    // Si Mentex captura 30% de ese tiempo y lo convierte en foco, eso son:
    var recoveredHrsWeek = Math.round(weeklyHrs * 0.30);
    var recoveredHrsYear = Math.round(yearlyHrs * 0.30);

    var feedbackLines = hours <= 3 ? {
      tag: '🌱 Ya cuidas tu atención',
      msg: 'Mentex te lleva un paso más allá: profundidad sostenida.',
    } : hours <= 6 ? {
      tag: '⚖️ Estás cerca del promedio',
      msg: 'Pequeños redirects acumulan cambios visibles en semanas.',
    } : hours <= 9 ? {
      tag: '🌊 Mucho ruido digital',
      msg: 'Mentex puede devolverte horas reales sin que lo sientas drástico.',
    } : {
      tag: '🌋 Vives en el feed',
      msg: 'Acá empieza el cambio real — un paso a la vez, no de golpe.',
    };

    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 3 · Punto de partida',
        title: 'Hablemos de tus pantallas.',
        subtitle: 'Para medir tu progreso real, necesitamos un baseline honesto. Sin juicios — solo claridad.',
      }),
      React.createElement('div', { style: { padding: '0 28px' } },
        // Visualización: número grande
        React.createElement('div', {
          style: { textAlign: 'center', marginBottom: 18, marginTop: 6 },
        },
          React.createElement('div', {
            style: {
              fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.16em',
              fontWeight: 600, textTransform: 'uppercase', marginBottom: 8,
            },
          }, 'Horas al día en redes y entretenimiento'),
          React.createElement('div', {
            style: {
              fontSize: 60, fontWeight: 700, lineHeight: 1,
              color: 'var(--ink-1)', letterSpacing: '-0.03em',
              fontFeatureSettings: '"tnum" on',
            },
          },
            hours,
            React.createElement('span', {
              style: { fontSize: 20, fontWeight: 500, color: 'var(--ink-3)', marginLeft: 6 },
            }, 'h')
          ),
          React.createElement('div', {
            style: {
              marginTop: 6, fontSize: 12, color: 'var(--ink-3)',
            },
          }, '≈ ' + weeklyHrs + ' h/semana · ' + yearlyDays + ' días al año')
        ),

        // Slider
        React.createElement('div', { style: { padding: '4px 0 8px' } },
          React.createElement('input', {
            type: 'range',
            min: 1, max: 12, step: 1,
            value: hours,
            onChange: function(e) { onChange({ baselineHours: parseInt(e.target.value, 10) }); },
            style: {
              width: '100%',
              accentColor: 'var(--neon)',
              cursor: 'pointer',
              background: 'transparent',
            },
          }),
          React.createElement('div', {
            style: {
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10.5, color: 'var(--ink-4, rgba(255,255,255,0.40))',
              marginTop: 2,
            },
          },
            React.createElement('span', null, '1h'),
            React.createElement('span', null, '12h')
          )
        ),

        // Feedback contextual breve
        React.createElement('div', {
          style: {
            marginTop: 18, padding: '12px 14px',
            background: 'rgba(255,255,255,0.025)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
          },
        },
          React.createElement('div', {
            style: {
              fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)',
              marginBottom: 3,
            },
          }, feedbackLines.tag),
          React.createElement('div', {
            style: { fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.45 },
          }, feedbackLines.msg)
        ),

        // ── La promesa: lo que Mentex puede devolver ─────────────────────────
        // Este es el wow factor. El user ve el costo en términos humanos
        // (días al año) y la oportunidad concreta (horas recuperadas).
        React.createElement('div', {
          style: {
            marginTop: 14,
            padding: '14px 16px',
            background: 'linear-gradient(180deg, rgba(61,255,209,0.10), rgba(61,255,209,0.02))',
            border: '0.5px solid rgba(61,255,209,0.28)',
            borderRadius: 14,
            boxShadow: '0 0 24px rgba(61,255,209,0.06), inset 0 1px 0 rgba(61,255,209,0.18)',
          },
        },
          React.createElement('div', {
            style: {
              fontSize: 9.5, color: 'var(--neon)', letterSpacing: '0.16em',
              fontWeight: 700, textTransform: 'uppercase', marginBottom: 8,
            },
          }, 'Tu oportunidad con Mentex'),
          React.createElement('div', {
            style: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 },
          },
            React.createElement('span', {
              style: {
                fontSize: 24, fontWeight: 700, color: 'var(--neon)',
                letterSpacing: '-0.02em', fontFeatureSettings: '"tnum" on',
              },
            }, '+' + recoveredHrsWeek + 'h'),
            React.createElement('span', {
              style: { fontSize: 12, color: 'var(--ink-2)' },
            }, 'a la semana de foco real')
          ),
          React.createElement('div', {
            style: { fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.45 },
          }, 'Si redirigimos solo 30% de ese tiempo a sesiones con Mentex, son ' + recoveredHrsYear + ' horas recuperadas al año — ' + Math.round(recoveredHrsYear / 24) + ' días enteros para ti.')
        )
      )
    );
  }


  // ── Step 4: Distractor apps ────────────────────────────────────────────────
  function StepBlockedApps(props) {
    var ans = props.answers;
    var onChange = props.onChange;
    // window.APPS es un array de { id, name, subtitle, category, Icon }.
    // Index por id para lookup O(1).
    var APPS_LIST = window.APPS || [];
    var APPS_BY_ID = {};
    for (var i = 0; i < APPS_LIST.length; i++) {
      APPS_BY_ID[APPS_LIST[i].id] = APPS_LIST[i];
    }
    var picked = ans.blockedApps || [];

    function toggle(id) {
      var next = picked.indexOf(id) >= 0
        ? picked.filter(function(p) { return p !== id; })
        : picked.concat([id]);
      onChange({ blockedApps: next });
    }

    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 4 · Distractores',
        title: '¿Qué apps te roban tiempo?',
        subtitle: 'Las bloquearemos automáticamente durante tus sesiones de foco.',
      }),
      React.createElement('div', { style: { padding: '0 28px' } },
        React.createElement('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          },
        },
          APP_DISTRACTOR_IDS.map(function(id) {
            var app = APPS_BY_ID[id];
            if (!app) return null;
            var Ic = app.Icon;
            var on = picked.indexOf(id) >= 0;
            var bg = _bgForState(on);
            return React.createElement('button', {
              key: id,
              onClick: function() { toggle(id); },
              className: 'mtx-tap',
              style: {
                appearance: 'none', cursor: 'pointer',
                padding: '14px 6px',
                borderRadius: 16,
                background: bg.background,
                border: '0.5px solid ' + bg.borderColor,
                boxShadow: bg.boxShadow,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 8,
                transition: 'all .18s ease',
                position: 'relative',
              },
            },
              Ic ? React.createElement(Ic, { size: 40 }) : null,
              React.createElement('div', {
                style: {
                  fontSize: 11.5, fontWeight: 500,
                  color: on ? 'var(--ink-1)' : 'var(--ink-3)',
                  fontFamily: 'var(--ff-sans)',
                  textAlign: 'center',
                  letterSpacing: '-0.005em',
                },
              }, app.name),
              on && React.createElement('div', {
                style: {
                  position: 'absolute', top: 6, right: 6,
                  width: 18, height: 18, borderRadius: 9,
                  background: 'var(--neon)',
                  color: '#02110b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                },
              }, React.createElement(window.IcCheck || 'span', { size: 11, stroke: 'currentColor', strokeWidth: 2.6 }))
            );
          })
        ),

        React.createElement('div', {
          style: {
            marginTop: 18, textAlign: 'center',
            fontSize: 12, color: picked.length ? 'var(--neon)' : 'var(--ink-3)',
            fontWeight: picked.length ? 600 : 500,
            transition: 'color .2s',
            marginBottom: 14,
          },
        }, picked.length === 0 ? 'Selecciona al menos una' :
            picked.length === 1 ? '1 app seleccionada' :
            picked.length + ' apps seleccionadas'),

        React.createElement(MentexTipBox, {
          eyebrow: '✦ Ladrones de tu energía',
        }, 'Estas apps, sin que lo notes, te van quitando minutos que se vuelven horas, días, años. Tiempo que podrías invertir en tu familia, tus proyectos, tu crecimiento. Mentex no las prohíbe — te ayuda a decidir cuándo merecen tu atención.')
      )
    );
  }


  // ── Step 5: Content prefs (multi-select, mismo grid compacto que goals) ────
  function StepContent(props) {
    var ans = props.answers;
    var onChange = props.onChange;
    var picked = ans.contentPrefs || [];

    function toggle(id) {
      var next = picked.indexOf(id) >= 0
        ? picked.filter(function(p) { return p !== id; })
        : picked.concat([id]);
      onChange({ contentPrefs: next });
    }

    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 5 · Energía',
        title: '¿Qué tipo de contenido te activa?',
        subtitle: 'Curaremos tu Explorar con esto. Elige todos los que te llamen.',
      }),
      React.createElement('div', {
        style: {
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        },
      },
        CONTENT_OPTIONS.map(function(c) {
          return React.createElement(CompactOptionCard, {
            key: c.id,
            icon: c.icon,
            label: c.label,
            selected: picked.indexOf(c.id) >= 0,
            onClick: function() { toggle(c.id); },
          });
        })
      ),
      React.createElement('div', {
        style: {
          padding: '14px 28px 0',
          textAlign: 'center', fontSize: 12,
          color: picked.length ? 'var(--neon)' : 'var(--ink-3)',
          fontWeight: picked.length ? 600 : 500,
          marginBottom: 14,
        },
      }, picked.length === 0 ? 'Selecciona al menos uno' :
          picked.length + (picked.length === 1 ? ' tipo seleccionado' : ' tipos seleccionados')),

      React.createElement('div', { style: { padding: '0 28px' } },
        React.createElement(MentexTipBox, {
          eyebrow: '✦ Tiempo que sí te transforma',
        }, 'Mentex tiene miles de piezas pensadas para devolverte algo cada vez que las consumes — claridad, calma, una idea que te mueva. Es tiempo invertido, no perdido.')
      )
    );
  }


  // ── Step 7: Focus time (cuándo arranca la rutina) ─────────────────────────
  // Después de definir cuántas horas (step 6), el user elige a partir de
  // cuándo. Así Mentex sabe si debe sugerirte arrancar 5 AM, 12 PM o 8 PM.
  function StepFocusTime(props) {
    var ans = props.answers;
    var onChange = props.onChange;
    var hrs = typeof ans.routineHours === 'number' ? ans.routineHours : 2;
    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 7 · Hora dorada',
        title: '¿Cuándo arranca tu rutina?',
        subtitle: 'Elige el momento del día para esas ' + hrs + (hrs === 1 ? ' hora' : ' horas') + ' que te dedicas a ti.',
      }),
      React.createElement('div', {
        style: { padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 8 },
      },
        FOCUS_TIME_OPTIONS.map(function(f) {
          return React.createElement(OptionCard, {
            key: f.id,
            icon: f.icon,
            label: f.label,
            desc: f.desc,
            compact: true,
            selected: ans.focusTime === f.id,
            onClick: function() { onChange({ focusTime: f.id }); },
          });
        })
      ),
      React.createElement('div', { style: { padding: '14px 24px 0' } },
        React.createElement(MentexTipBox, {
          eyebrow: '✦ Aprovecha tu hora dorada',
        }, 'Cada persona tiene una franja del día donde su mente está más limpia. Mentex la respeta y construye tu rutina alrededor de ella — no contra ella.')
      )
    );
  }


  // ── Step 6: Routine duration (en HORAS) ───────────────────────────────────
  // Mentex no es Pomodoro — es una rutina diaria compuesta de contenido
  // (audiolibros, meditaciones) y sesiones de foco. La unidad es la HORA,
  // no minutos. El user define cuántas horas al día va a invertir en sí
  // mismo con Mentex.
  function StepRoutineDuration(props) {
    var ans = props.answers;
    var onChange = props.onChange;
    var current = typeof ans.routineHours === 'number' ? ans.routineHours : 2;

    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 6 · Tu rutina',
        title: '¿Cuántas horas al día?',
        subtitle: 'El tiempo que vas a invertir en ti — escuchando, meditando, enfocándote. La concentración es el recurso más valioso que tienes.',
      }),
      React.createElement('div', {
        style: { padding: '0 28px', display: 'flex', flexDirection: 'column', gap: 8 },
      },
        ROUTINE_DURATIONS.map(function(d) {
          var on = current === d.value;
          var bg = _bgForState(on);
          return React.createElement('button', {
            key: d.value,
            onClick: function() { onChange({ routineHours: d.value }); },
            className: 'mtx-tap',
            style: {
              width: '100%',
              appearance: 'none', cursor: 'pointer',
              padding: '12px 16px',
              borderRadius: 13,
              background: bg.background,
              border: '0.5px solid ' + bg.borderColor,
              boxShadow: bg.boxShadow,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'all .18s ease',
              fontFamily: 'var(--ff-sans)',
              textAlign: 'left',
            },
          },
            React.createElement('div', null,
              React.createElement('div', {
                style: {
                  fontSize: 16, fontWeight: 700,
                  color: on ? 'var(--ink-1)' : 'var(--ink-2)',
                  letterSpacing: '-0.01em',
                  fontFeatureSettings: '"tnum" on',
                },
              }, d.label),
              React.createElement('div', {
                style: { fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 },
              }, d.tagline)
            ),
            on && React.createElement('div', {
              style: {
                width: 22, height: 22, borderRadius: 11,
                background: 'var(--neon)',
                color: '#02110b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              },
            }, React.createElement(window.IcCheck || 'span', { size: 13, stroke: 'currentColor', strokeWidth: 2.6 }))
          );
        })
      ),

      React.createElement('div', { style: { margin: '16px 28px 0' } },
        React.createElement(MentexTipBox, {
          eyebrow: '✦ Tu recurso más valioso',
        }, 'Cada hora que entregas a Mentex es una hora que el feed no se lleva. El compuesto es real — quien sostiene esto seis meses ya no es la misma persona.')
      )
    );
  }


  // ── Step 8: Coach voice ────────────────────────────────────────────────────
  // Layout horizontal compacto: icon a la izq, label + preview en mismo bloque
  // sin gap. La preview es la prueba viva del tono — debe leerse junto al
  // nombre, no separado.
  function StepCoachVoice(props) {
    var ans = props.answers;
    var onChange = props.onChange;

    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 8 · Tu coach',
        title: 'Conoce tu voz interior.',
        subtitle: 'Cuatro tonos. Elige el que te resuene hoy. Puedes cambiarlo después.',
      }),
      React.createElement('div', {
        style: { padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 8 },
      },
        COACH_VOICES.map(function(v) {
          var on = ans.coachVoice === v.id;
          var bg = _bgForState(on);
          return React.createElement('button', {
            key: v.id,
            onClick: function() { onChange({ coachVoice: v.id }); },
            className: 'mtx-tap',
            style: {
              width: '100%',
              appearance: 'none', cursor: 'pointer',
              textAlign: 'left',
              padding: '11px 14px',
              borderRadius: 13,
              background: bg.background,
              border: '0.5px solid ' + bg.borderColor,
              boxShadow: bg.boxShadow,
              display: 'flex', alignItems: 'center', gap: 12,
              fontFamily: 'var(--ff-sans)',
              transition: 'all .18s ease',
            },
          },
            React.createElement('div', {
              style: {
                width: 40, height: 40, borderRadius: 11,
                background: on ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.04)',
                border: '0.5px solid ' + (on ? 'rgba(61,255,209,0.30)' : 'rgba(255,255,255,0.06)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              },
            }, v.icon),
            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
              React.createElement('div', {
                style: {
                  fontSize: 14, fontWeight: 700,
                  color: on ? 'var(--ink-1)' : 'var(--ink-2)',
                  letterSpacing: '-0.005em',
                  marginBottom: 1,
                },
              }, v.label),
              React.createElement('div', {
                style: {
                  fontSize: 11.5, lineHeight: 1.35,
                  color: 'var(--ink-3)', fontStyle: 'italic',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                },
              }, v.preview)
            ),
            on && React.createElement('div', {
              style: {
                width: 22, height: 22, borderRadius: 11,
                background: 'var(--neon)',
                color: '#02110b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              },
            }, React.createElement(window.IcCheck || 'span', { size: 13, stroke: 'currentColor', strokeWidth: 2.6 }))
          );
        })
      ),
      React.createElement('div', { style: { padding: '14px 24px 0' } },
        React.createElement(MentexTipBox, {
          eyebrow: '✦ Tu compañero en este camino',
        }, 'En Mentex tienes un coach que está contigo en todo el proceso. Puedes hablarle cuando quieras — descargar lo que pesa, pedir un consejo, o simplemente reflexionar en voz alta. No juzga, no apura: acompaña.')
      )
    );
  }


  // ── Step 9: Fake-load ──────────────────────────────────────────────────────
  // No CTA. Auto-avanza al step 10 cuando termina la animación.
  function StepFakeLoad(props) {
    var ans = props.answers;
    var onAutoAdvance = props.onAutoAdvance;

    var lines = React.useMemo(function() {
      var goalLabel = (function() {
        var pickedGoals = ans.goals || [];
        if (pickedGoals.length === 0) return 'tu intención';
        if (pickedGoals.length === 1) {
          var g = GOAL_OPTIONS.find(function(o) { return o.id === pickedGoals[0]; });
          return g ? g.label.toLowerCase() : 'tu intención';
        }
        return 'tus ' + pickedGoals.length + ' intenciones';
      })();
      var voiceLabel = (function() {
        var v = COACH_VOICES.find(function(o) { return o.id === ans.coachVoice; });
        return v ? v.label.toLowerCase() : 'tu coach';
      })();
      var apps = (ans.blockedApps || []).length;
      var hrs = ans.routineHours || 2;
      return [
        'Curando contenido para ' + goalLabel + '…',
        'Configurando tu coach con voz ' + voiceLabel + '…',
        'Diseñando tu rutina de ' + hrs + (hrs === 1 ? ' hora' : ' horas') + ' al día…',
        'Activando bloqueo' + (apps ? ' para ' + apps + (apps === 1 ? ' app' : ' apps') : '') + '…',
        'Sincronizando tu universo Mentex…',
      ];
    }, [ans.goals, ans.coachVoice, ans.routineHours, ans.blockedApps]);

    var doneCountState = React.useState(0);
    var doneCount = doneCountState[0];
    var setDoneCount = doneCountState[1];
    var advancedRef = React.useRef(false);

    React.useEffect(function() {
      // Cada línea aparece secuencialmente cada 600ms.
      var t1 = setTimeout(function() { setDoneCount(1); }, 500);
      var t2 = setTimeout(function() { setDoneCount(2); }, 1100);
      var t3 = setTimeout(function() { setDoneCount(3); }, 1700);
      var t4 = setTimeout(function() { setDoneCount(4); }, 2300);
      var t5 = setTimeout(function() { setDoneCount(5); }, 2900);
      var tFinal = setTimeout(function() {
        if (!advancedRef.current && typeof onAutoAdvance === 'function') {
          advancedRef.current = true;
          onAutoAdvance();
        }
      }, 3700);
      return function() {
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
        clearTimeout(t4); clearTimeout(t5); clearTimeout(tFinal);
      };
    }, []);

    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 9 · Activación',
        title: 'Construyendo tu universo…',
        subtitle: 'Estamos personalizando todo para ti.',
      }),
      React.createElement('div', {
        style: {
          padding: '20px 28px 0',
          display: 'flex', flexDirection: 'column', gap: 12,
        },
      },
        lines.map(function(l, i) {
          var done = i < doneCount;
          var active = i === doneCount;
          return React.createElement('div', {
            key: i,
            style: {
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              borderRadius: 12,
              background: done ? 'rgba(61,255,209,0.05)' : 'rgba(255,255,255,0.02)',
              border: '0.5px solid ' + (done ? 'rgba(61,255,209,0.18)' : 'rgba(255,255,255,0.05)'),
              opacity: i > doneCount ? 0.35 : 1,
              transition: 'all .35s ease',
            },
          },
            React.createElement('div', {
              style: {
                width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                background: done ? 'var(--neon)' : 'transparent',
                border: done ? 'none' : '1.5px solid rgba(255,255,255,0.20)',
                color: '#02110b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: active ? 'mtx-pulse 1.2s ease-in-out infinite' : 'none',
              },
            }, done && React.createElement(window.IcCheck || 'span', {
              size: 13, stroke: 'currentColor', strokeWidth: 2.6,
            })),
            React.createElement('div', {
              style: {
                fontSize: 13.5, color: done ? 'var(--ink-1)' : 'var(--ink-3)',
                fontFamily: 'var(--ff-sans)',
              },
            }, l)
          );
        })
      )
    );
  }


  // ── Step 10: Notifications (multi-select brutal) ───────────────────────────
  // En lugar de un binario "activar/no activar", mostrar 5 tipos de notif y
  // que el user toggle individualmente. Por defecto todos ON — el user solo
  // des-habilita lo que no quiera. Cada row tiene su propio switch + icon
  // semántico + sublabel contextualizado con sus respuestas previas.
  var NOTIFICATION_TYPES = [
    {
      id: 'session', icon: '🎯', label: 'Recordatorio de sesión',
      desc: 'Cada día a tu hora preferida',
    },
    {
      id: 'coach', icon: '✨', label: 'Tu coach IA',
      desc: 'Cuando quiera compartirte algo importante',
    },
    {
      id: 'milestones', icon: '🏆', label: 'Hitos & progreso',
      desc: 'Celebra cada logro y semana cerrada',
    },
    {
      id: 'breaks', icon: '🌙', label: 'Descanso digital',
      desc: 'Cuando hayas pasado mucho tiempo en pantalla',
    },
    {
      id: 'content', icon: '📚', label: 'Nuevo contenido',
      desc: 'Solo lo relevante para tus intereses',
    },
  ];

  // Toggle row pill: switch a la derecha, icon + label + desc a la izquierda.
  // El fondo se mantiene neutral (no verde fuerte) cuando ON. El switch neon
  // y un pequeño hint en el border son suficientes — más minimalista.
  function NotifToggleRow(props) {
    var on = !!props.on;
    return React.createElement('button', {
      onClick: props.onClick,
      className: 'mtx-tap',
      style: {
        width: '100%',
        appearance: 'none', cursor: 'pointer',
        textAlign: 'left',
        padding: '12px 14px',
        borderRadius: 14,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.012))',
        // Solo un hint sutil neon en el border cuando ON, sin glow agresivo
        border: '0.5px solid ' + (on ? 'rgba(61,255,209,0.18)' : 'rgba(255,255,255,0.10)'),
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', gap: 12,
        fontFamily: 'var(--ff-sans)',
        transition: 'border-color .18s ease',
      },
    },
      React.createElement('div', {
        style: {
          width: 38, height: 38, borderRadius: 11,
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, lineHeight: 1, flexShrink: 0,
        },
      }, props.icon),
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', {
          style: {
            fontSize: 13.5, fontWeight: 600,
            color: on ? 'var(--ink-1)' : 'var(--ink-2)',
            letterSpacing: '-0.005em',
            marginBottom: 1,
          },
        }, props.label),
        React.createElement('div', {
          style: { fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.35 },
        }, props.desc)
      ),
      // Switch visual (el button maneja toggle, no toca un input real)
      React.createElement('div', {
        style: {
          width: 40, height: 22, borderRadius: 11,
          background: on ? 'var(--neon)' : 'rgba(255,255,255,0.10)',
          position: 'relative',
          transition: 'background .18s ease',
          flexShrink: 0,
          boxShadow: on ? '0 0 12px rgba(61,255,209,0.35)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        },
      },
        React.createElement('div', {
          style: {
            position: 'absolute',
            top: 2,
            left: on ? 20 : 2,
            width: 18, height: 18,
            borderRadius: 9,
            background: on ? '#02110b' : '#e8e8e8',
            transition: 'left .18s ease',
          },
        })
      )
    );
  }

  function StepNotifications(props) {
    var ans = props.answers;
    var onChange = props.onChange;
    var firstName = (ans.name || '').trim().split(' ')[0] || 'amig@';
    var notif = ans.notifications || {};
    // Derivar estado "todas activas"
    var allOn = NOTIFICATION_TYPES.every(function(t) { return notif[t.id] === true; });
    var allOff = NOTIFICATION_TYPES.every(function(t) { return notif[t.id] === false; });

    function toggle(id) {
      var next = Object.assign({}, notif);
      next[id] = !next[id];
      onChange({ notifications: next });
    }

    function setAll(value) {
      var next = {};
      NOTIFICATION_TYPES.forEach(function(t) { next[t.id] = value; });
      onChange({ notifications: next });
    }

    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 10 · Listos',
        title: 'Estás dentro, ' + firstName + '.',
        subtitle: 'Última afinada: ¿qué te gustaría que te recordemos?',
      }),
      React.createElement('div', { style: { padding: '0 24px' } },
        // Lista de toggles
        React.createElement('div', {
          style: { display: 'flex', flexDirection: 'column', gap: 8 },
        },
          NOTIFICATION_TYPES.map(function(t) {
            return React.createElement(NotifToggleRow, {
              key: t.id,
              icon: t.icon,
              label: t.label,
              desc: t.desc,
              on: notif[t.id] === true,
              onClick: function() { toggle(t.id); },
            });
          })
        ),

        // Action row: activar todas / desactivar todas
        React.createElement('div', {
          style: {
            marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          },
        },
          React.createElement('button', {
            onClick: function() { setAll(true); },
            disabled: allOn,
            className: 'mtx-tap',
            style: {
              appearance: 'none', cursor: allOn ? 'default' : 'pointer',
              background: 'transparent', border: 'none',
              color: allOn ? 'var(--ink-4, rgba(255,255,255,0.30))' : 'var(--neon)',
              fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
              padding: '6px 10px',
              opacity: allOn ? 0.5 : 1,
            },
          }, 'Activar todas'),
          React.createElement('span', {
            style: { color: 'var(--ink-4, rgba(255,255,255,0.30))', fontSize: 11 },
          }, '·'),
          React.createElement('button', {
            onClick: function() { setAll(false); },
            disabled: allOff,
            className: 'mtx-tap',
            style: {
              appearance: 'none', cursor: allOff ? 'default' : 'pointer',
              background: 'transparent', border: 'none',
              color: allOff ? 'var(--ink-4, rgba(255,255,255,0.30))' : 'var(--ink-3)',
              fontSize: 12, fontWeight: 500,
              fontFamily: 'var(--ff-sans)',
              padding: '6px 10px',
              opacity: allOff ? 0.5 : 1,
            },
          }, 'Desactivar todas')
        ),

        // Microtexto debajo
        React.createElement('div', {
          style: {
            marginTop: 4, textAlign: 'center',
            fontSize: 11, color: 'var(--ink-4, rgba(255,255,255,0.40))',
          },
        }, 'Puedes ajustarlas en cualquier momento desde Ajustes.')
      )
    );
  }


  // ── Main: OnboardingScreen ─────────────────────────────────────────────────
  // Lee el store via useOnboarding(), decide qué step renderizar, y orquesta
  // navegación + completion.
  function OnboardingScreen() {
    // Hook reactivo del store
    var ob = window.useOnboarding ? window.useOnboarding() : null;
    var step = ob ? (ob.step || 0) : 0;
    var answers = ob ? (ob.answers || {}) : {};

    // Inicia start() en mount (no resetea si ya había progreso)
    React.useEffect(function() {
      if (window.__mtxOnboarding && typeof window.__mtxOnboarding.start === 'function') {
        window.__mtxOnboarding.start();
      }
    }, []);

    // ── Validación por step ──────────────────────────────────────────────────
    var validators = [
      // 0: Profile — name + username obligatorios
      function(a) { return !!(a.name && a.name.trim().length >= 2 && a.username && a.username.trim().length >= 3); },
      // 1: Goals (multi-select) — al menos 1
      function(a) { return Array.isArray(a.goals) && a.goals.length > 0; },
      // 2: Baseline (siempre válido — slider con default)
      function(a) { return typeof a.baselineHours === 'number'; },
      // 3: Blocked apps — al menos 1
      function(a) { return Array.isArray(a.blockedApps) && a.blockedApps.length > 0; },
      // 4: Content prefs — al menos 1
      function(a) { return Array.isArray(a.contentPrefs) && a.contentPrefs.length > 0; },
      // 5: Routine duration en horas (siempre válido — default 2)
      function(a) { return typeof a.routineHours === 'number'; },
      // 6: Focus time
      function(a) { return !!a.focusTime; },
      // 7: Coach voice
      function(a) { return !!a.coachVoice; },
      // 8: Fake-load (auto-advance, siempre válido)
      function(a) { return true; },
      // 9: Notifications (multi-select, defaults ON) — siempre válido.
      //    El user puede continuar incluso con todas en off (es su decisión).
      function(a) { return true; },
    ];
    var canNext = validators[step] ? validators[step](answers) : true;

    // ── Step actions ────────────────────────────────────────────────────────
    function handleChange(patch) {
      if (window.__mtxOnboarding) window.__mtxOnboarding.updateAnswers(patch);
    }
    function handleBack() {
      if (window.__mtxOnboarding) window.__mtxOnboarding.back();
    }
    function handleNext() {
      if (step >= 9) {
        // Último step → complete
        if (window.__mtxOnboarding) window.__mtxOnboarding.complete();
        return;
      }
      if (window.__mtxOnboarding) window.__mtxOnboarding.next();
    }
    function handleSkip() {
      // Skip avanza sin requerir validación; aplicable solo a steps opcionales.
      if (window.__mtxOnboarding) window.__mtxOnboarding.next();
    }

    // ── Step components map ─────────────────────────────────────────────────
    var stepEl = null;
    var hideFooter = false;
    var canSkip = false;
    var ctaLabel = 'Continuar';

    if (step === 0) {
      stepEl = React.createElement(StepProfile, { answers: answers, onChange: handleChange });
    } else if (step === 1) {
      stepEl = React.createElement(StepGoal, { answers: answers, onChange: handleChange });
    } else if (step === 2) {
      stepEl = React.createElement(StepBaseline, { answers: answers, onChange: handleChange });
    } else if (step === 3) {
      stepEl = React.createElement(StepBlockedApps, { answers: answers, onChange: handleChange });
    } else if (step === 4) {
      stepEl = React.createElement(StepContent, { answers: answers, onChange: handleChange });
    } else if (step === 5) {
      stepEl = React.createElement(StepRoutineDuration, { answers: answers, onChange: handleChange });
    } else if (step === 6) {
      stepEl = React.createElement(StepFocusTime, { answers: answers, onChange: handleChange });
    } else if (step === 7) {
      stepEl = React.createElement(StepCoachVoice, { answers: answers, onChange: handleChange });
    } else if (step === 8) {
      hideFooter = true;
      stepEl = React.createElement(StepFakeLoad, {
        answers: answers,
        onAutoAdvance: function() {
          if (window.__mtxOnboarding) window.__mtxOnboarding.next();
        },
      });
    } else if (step === 9) {
      ctaLabel = 'Empezar a usar Mentex';
      stepEl = React.createElement(StepNotifications, { answers: answers, onChange: handleChange });
    } else {
      // Safety: step fuera de rango → completar
      if (window.__mtxOnboarding) window.__mtxOnboarding.complete();
      return null;
    }

    return React.createElement(OnboardingShell, {
      stepIndex: step,
      totalSteps: 10,
      onBack: handleBack,
      onNext: handleNext,
      onSkip: handleSkip,
      canSkip: canSkip,
      ctaDisabled: !canNext,
      ctaLabel: ctaLabel,
      hideFooter: hideFooter,
      lockNav: step === 8, // durante fake-load, no permitir back
    }, stepEl);
  }


  // ── Export ─────────────────────────────────────────────────────────────────
  Object.assign(window, {
    OnboardingScreen: OnboardingScreen,
    // Exponemos data para reutilización en otras phases (ej. Ajustes → editar prefs)
    ONBOARDING_GOAL_OPTIONS: GOAL_OPTIONS,
    ONBOARDING_CONTENT_OPTIONS: CONTENT_OPTIONS,
    ONBOARDING_FOCUS_TIME_OPTIONS: FOCUS_TIME_OPTIONS,
    ONBOARDING_ROUTINE_DURATIONS: ROUTINE_DURATIONS,
    ONBOARDING_COACH_VOICES: COACH_VOICES,
  });

})();
