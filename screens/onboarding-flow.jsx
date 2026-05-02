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

  var GOAL_OPTIONS = [
    { id: 'productivity', label: 'Productividad',     icon: '🎯', desc: 'Termina lo que importa' },
    { id: 'rest',         label: 'Descanso mental',   icon: '🌙', desc: 'Calma para volver a ti' },
    { id: 'learn',        label: 'Aprender más',      icon: '📚', desc: 'Profundiza tu mente' },
    { id: 'sleep',        label: 'Dormir mejor',      icon: '😴', desc: 'Descanso con intención' },
    { id: 'anxiety',      label: 'Reducir ansiedad',  icon: '🌿', desc: 'Vuelve a tu centro' },
  ];

  // 9 apps más comunes en distracción. Ids matchean APPS en components/app-icons.jsx
  // (IDs son cortos: 'ig'=Instagram, 'tt'=TikTok, 'yt'=YouTube, etc).
  var APP_DISTRACTOR_IDS = [
    'ig', 'tt', 'yt', 'x',
    'rd', 'sn', 'wa', 'fb', 'nf',
  ];

  var CONTENT_OPTIONS = [
    { id: 'books',        label: 'Resúmenes de libros',  icon: '📚', desc: 'Sapiens, Atomic Habits, El Poder del Ahora…' },
    { id: 'meditations',  label: 'Meditaciones',         icon: '🧘', desc: 'Guiadas para foco, calma y sueño' },
    { id: 'biographies',  label: 'Biografías',           icon: '🌟', desc: 'Mentes que cambiaron el mundo' },
    { id: 'talks',        label: 'Charlas profundas',    icon: '🎙️', desc: 'Filósofos, científicos, monjes' },
    { id: 'sounds',       label: 'Sonidos & ambientes',  icon: '🎵', desc: 'Lluvia, café, frecuencias' },
  ];

  var FOCUS_TIME_OPTIONS = [
    { id: 'morning',   label: 'Mañana',   icon: '🌅', desc: '5 — 10 AM' },
    { id: 'afternoon', label: 'Tarde',    icon: '☀️', desc: '12 — 5 PM' },
    { id: 'evening',   label: 'Noche',    icon: '🌙', desc: '8 PM en adelante' },
    { id: 'variable',  label: 'Variable', icon: '🔄', desc: 'Depende del día' },
  ];

  var SESSION_DURATIONS = [
    { value: 15, label: '15 min', tagline: 'Ritmo ágil' },
    { value: 25, label: '25 min', tagline: 'Pomodoro clásico' },
    { value: 45, label: '45 min', tagline: 'Foco sostenido' },
    { value: 60, label: '60 min', tagline: 'Inmersión profunda' },
    { value: 90, label: '90 min', tagline: 'Deep work' },
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


  // OptionCard: card grande seleccionable (icon + title + desc + check). Para
  // goals, content prefs, focus times, coach voices.
  function OptionCard(props) {
    var selected = !!props.selected;
    return React.createElement('button', {
      onClick: props.onClick,
      className: 'mtx-tap',
      style: {
        width: '100%',
        appearance: 'none', cursor: 'pointer',
        textAlign: 'left',
        padding: '16px 18px',
        borderRadius: 16,
        background: selected
          ? 'linear-gradient(180deg, rgba(61,255,209,0.14), rgba(61,255,209,0.05))'
          : 'rgba(255,255,255,0.03)',
        border: '0.5px solid ' + (selected ? 'rgba(61,255,209,0.45)' : 'rgba(255,255,255,0.08)'),
        boxShadow: selected ? '0 0 24px rgba(61,255,209,0.10)' : 'none',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'background .2s ease, border-color .2s ease, box-shadow .2s ease',
        fontFamily: 'var(--ff-sans)',
      },
    },
      React.createElement('div', {
        style: {
          width: 44, height: 44, borderRadius: 12,
          background: selected ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.04)',
          border: '0.5px solid ' + (selected ? 'rgba(61,255,209,0.30)' : 'rgba(255,255,255,0.06)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, lineHeight: 1, flexShrink: 0,
        },
      }, props.icon),
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', {
          style: {
            fontSize: 14.5, fontWeight: 600,
            color: selected ? 'var(--ink-1)' : 'var(--ink-2)',
            marginBottom: props.desc ? 2 : 0,
          },
        }, props.label),
        props.desc && React.createElement('div', {
          style: { fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.35 },
        }, props.desc)
      ),
      selected && React.createElement('div', {
        style: {
          width: 22, height: 22, borderRadius: 11,
          background: 'var(--neon)',
          color: '#02110b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        },
      }, React.createElement(window.IcCheck || 'span', { size: 14, stroke: 'currentColor', strokeWidth: 2.5 }))
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
          },
        }, React.createElement(IconComp, { size: 16, stroke: 'currentColor', strokeWidth: 1.6 })),
        props.multiline
          ? React.createElement('textarea', {
              value: props.value || '',
              onChange: function(e) { props.onChange(e.target.value); },
              placeholder: props.placeholder || '',
              rows: props.rows || 3,
              maxLength: props.maxLength,
              style: {
                width: '100%',
                padding: hasIcon ? '12px 14px 12px 40px' : '12px 14px',
                fontFamily: 'var(--ff-sans)',
                fontSize: 14, lineHeight: 1.5,
                color: 'var(--ink-1)',
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                borderRadius: 12,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                WebkitAppearance: 'none',
              },
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
              style: {
                width: '100%',
                height: 46,
                padding: hasIcon ? '0 14px 0 40px' : '0 14px',
                fontFamily: 'var(--ff-sans)',
                fontSize: 14,
                color: 'var(--ink-1)',
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                borderRadius: 12,
                outline: 'none',
                boxSizing: 'border-box',
                WebkitAppearance: 'none',
              },
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
            style: {
              width: '100%', height: 46, padding: '0 14px',
              fontFamily: 'var(--ff-sans)', fontSize: 14, color: 'var(--ink-1)',
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.10)',
              borderRadius: 12, outline: 'none',
              boxSizing: 'border-box', WebkitAppearance: 'none',
            },
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


  // ── Step 2: Goal ───────────────────────────────────────────────────────────
  function StepGoal(props) {
    var ans = props.answers;
    var onChange = props.onChange;
    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 2 · Intención',
        title: '¿Qué quieres lograr?',
        subtitle: 'Esto personaliza el contenido recomendado y el tono de tu coach.',
      }),
      React.createElement('div', {
        style: { padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 10 },
      },
        GOAL_OPTIONS.map(function(g) {
          return React.createElement(OptionCard, {
            key: g.id,
            icon: g.icon,
            label: g.label,
            desc: g.desc,
            selected: ans.goal === g.id,
            onClick: function() { onChange({ goal: g.id }); },
          });
        })
      )
    );
  }


  // ── Step 3: Baseline screen time (slider) ──────────────────────────────────
  function StepBaseline(props) {
    var ans = props.answers;
    var onChange = props.onChange;
    var hours = typeof ans.baselineHours === 'number' ? ans.baselineHours : 6;
    var weeklyHrs = hours * 7;
    // Color refleja la intensidad sin juzgar — sutil
    var pct = Math.min(1, hours / 12);

    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 3 · Punto de partida',
        title: '¿Cuánto tiempo en pantalla al día?',
        subtitle: 'Sin juicio. Es tu baseline para que veas el progreso real con Mentex.',
      }),
      React.createElement('div', { style: { padding: '0 28px' } },
        // Visualización: número grande
        React.createElement('div', {
          style: {
            textAlign: 'center', marginBottom: 22, marginTop: 10,
          },
        },
          React.createElement('div', {
            style: {
              fontSize: 64, fontWeight: 700, lineHeight: 1,
              color: 'var(--ink-1)', letterSpacing: '-0.03em',
              fontFeatureSettings: '"tnum" on',
            },
          },
            hours,
            React.createElement('span', {
              style: { fontSize: 22, fontWeight: 500, color: 'var(--ink-3)', marginLeft: 6 },
            }, 'h')
          ),
          React.createElement('div', {
            style: {
              marginTop: 8, fontSize: 12.5, color: 'var(--ink-3)',
            },
          }, '≈ ' + weeklyHrs + ' horas a la semana')
        ),

        // Slider
        React.createElement('div', { style: { padding: '4px 0 16px' } },
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
              fontSize: 11, color: 'var(--ink-4, rgba(255,255,255,0.40))',
              marginTop: 4,
            },
          },
            React.createElement('span', null, '1h'),
            React.createElement('span', null, '12h')
          )
        ),

        // Reflexión sutil
        React.createElement('div', {
          style: {
            marginTop: 24, padding: '14px 16px',
            background: 'rgba(61,255,209,0.04)',
            border: '0.5px solid rgba(61,255,209,0.15)',
            borderRadius: 12,
            fontSize: 12.5, color: 'var(--ink-2)',
            lineHeight: 1.5,
          },
        },
          hours <= 3 ? '🌱 Ya cuidas tu atención. Mentex te ayuda a profundizar.'
          : hours <= 6 ? '⚖️ Estás en el promedio. Hay espacio claro para crecer.'
          : hours <= 9 ? '🌊 Mucho ruido digital. Mentex va a moverte el panorama.'
          : '🌋 Vives en el feed. Acá empieza el cambio real — paso a paso.'
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
            return React.createElement('button', {
              key: id,
              onClick: function() { toggle(id); },
              className: 'mtx-tap',
              style: {
                appearance: 'none', cursor: 'pointer',
                padding: '14px 6px',
                borderRadius: 16,
                background: on ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.03)',
                border: '0.5px solid ' + (on ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.08)'),
                boxShadow: on ? '0 0 18px rgba(61,255,209,0.10)' : 'none',
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
          },
        }, picked.length === 0 ? 'Selecciona al menos una' :
            picked.length === 1 ? '1 app seleccionada' :
            picked.length + ' apps seleccionadas')
      )
    );
  }


  // ── Step 5: Content prefs ──────────────────────────────────────────────────
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
        subtitle: 'Curaremos tu Explorar con esto. Puedes elegir más de uno.',
      }),
      React.createElement('div', {
        style: { padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 10 },
      },
        CONTENT_OPTIONS.map(function(c) {
          return React.createElement(OptionCard, {
            key: c.id,
            icon: c.icon,
            label: c.label,
            desc: c.desc,
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
        },
      }, picked.length === 0 ? 'Selecciona al menos uno' :
          picked.length + (picked.length === 1 ? ' tipo seleccionado' : ' tipos seleccionados'))
    );
  }


  // ── Step 6: Focus time ─────────────────────────────────────────────────────
  function StepFocusTime(props) {
    var ans = props.answers;
    var onChange = props.onChange;
    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 6 · Hora dorada',
        title: '¿Cuándo te enfocas mejor?',
        subtitle: 'Tu coach programará rituales y recordatorios contigo.',
      }),
      React.createElement('div', {
        style: { padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 10 },
      },
        FOCUS_TIME_OPTIONS.map(function(f) {
          return React.createElement(OptionCard, {
            key: f.id,
            icon: f.icon,
            label: f.label,
            desc: f.desc,
            selected: ans.focusTime === f.id,
            onClick: function() { onChange({ focusTime: f.id }); },
          });
        })
      )
    );
  }


  // ── Step 7: Session duration ───────────────────────────────────────────────
  function StepSessionDuration(props) {
    var ans = props.answers;
    var onChange = props.onChange;
    var current = typeof ans.sessionMin === 'number' ? ans.sessionMin : 25;

    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 7 · Sesión inicial',
        title: '¿Cuánto dura tu primer foco?',
        subtitle: 'Empezar pequeño funciona. Puedes subir cuando lo sientas natural.',
      }),
      React.createElement('div', {
        style: { padding: '0 28px', display: 'flex', flexDirection: 'column', gap: 10 },
      },
        SESSION_DURATIONS.map(function(d) {
          var on = current === d.value;
          return React.createElement('button', {
            key: d.value,
            onClick: function() { onChange({ sessionMin: d.value }); },
            className: 'mtx-tap',
            style: {
              width: '100%',
              appearance: 'none', cursor: 'pointer',
              padding: '14px 18px',
              borderRadius: 14,
              background: on
                ? 'linear-gradient(180deg, rgba(61,255,209,0.14), rgba(61,255,209,0.05))'
                : 'rgba(255,255,255,0.03)',
              border: '0.5px solid ' + (on ? 'rgba(61,255,209,0.45)' : 'rgba(255,255,255,0.08)'),
              boxShadow: on ? '0 0 24px rgba(61,255,209,0.10)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'all .2s ease',
              fontFamily: 'var(--ff-sans)',
              textAlign: 'left',
            },
          },
            React.createElement('div', null,
              React.createElement('div', {
                style: {
                  fontSize: 17, fontWeight: 700,
                  color: on ? 'var(--ink-1)' : 'var(--ink-2)',
                  letterSpacing: '-0.01em',
                  fontFeatureSettings: '"tnum" on',
                },
              }, d.label),
              React.createElement('div', {
                style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 2 },
              }, d.tagline)
            ),
            on && React.createElement('div', {
              style: {
                width: 26, height: 26, borderRadius: 13,
                background: 'var(--neon)',
                color: '#02110b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              },
            }, React.createElement(window.IcCheck || 'span', { size: 15, stroke: 'currentColor', strokeWidth: 2.5 }))
          );
        })
      )
    );
  }


  // ── Step 8: Coach voice ────────────────────────────────────────────────────
  function StepCoachVoice(props) {
    var ans = props.answers;
    var onChange = props.onChange;

    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 8 · Tu coach',
        title: 'Conoce tu voz interior.',
        subtitle: 'Cuatro tonos. Elige el que te resuene hoy. Lo cambias cuando quieras.',
      }),
      React.createElement('div', {
        style: { padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 10 },
      },
        COACH_VOICES.map(function(v) {
          var on = ans.coachVoice === v.id;
          return React.createElement('button', {
            key: v.id,
            onClick: function() { onChange({ coachVoice: v.id }); },
            className: 'mtx-tap',
            style: {
              width: '100%',
              appearance: 'none', cursor: 'pointer',
              textAlign: 'left',
              padding: '16px 18px',
              borderRadius: 16,
              background: on
                ? 'linear-gradient(180deg, rgba(61,255,209,0.14), rgba(61,255,209,0.05))'
                : 'rgba(255,255,255,0.03)',
              border: '0.5px solid ' + (on ? 'rgba(61,255,209,0.45)' : 'rgba(255,255,255,0.08)'),
              boxShadow: on ? '0 0 24px rgba(61,255,209,0.10)' : 'none',
              fontFamily: 'var(--ff-sans)',
              transition: 'all .2s ease',
            },
          },
            React.createElement('div', {
              style: {
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
              },
            },
              React.createElement('div', {
                style: {
                  width: 38, height: 38, borderRadius: 11,
                  background: on ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.04)',
                  border: '0.5px solid ' + (on ? 'rgba(61,255,209,0.30)' : 'rgba(255,255,255,0.06)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                },
              }, v.icon),
              React.createElement('div', {
                style: {
                  fontSize: 14.5, fontWeight: 600,
                  color: on ? 'var(--ink-1)' : 'var(--ink-2)',
                },
              }, v.label),
              React.createElement('div', { style: { flex: 1 } }),
              on && React.createElement('div', {
                style: {
                  width: 22, height: 22, borderRadius: 11,
                  background: 'var(--neon)',
                  color: '#02110b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                },
              }, React.createElement(window.IcCheck || 'span', { size: 14, stroke: 'currentColor', strokeWidth: 2.5 }))
            ),
            React.createElement('div', {
              style: {
                paddingLeft: 50,
                fontSize: 12.5, lineHeight: 1.5,
                color: 'var(--ink-3)', fontStyle: 'italic',
              },
            }, v.preview)
          );
        })
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
        var g = GOAL_OPTIONS.find(function(o) { return o.id === ans.goal; });
        return g ? g.label.toLowerCase() : 'tu intención';
      })();
      var voiceLabel = (function() {
        var v = COACH_VOICES.find(function(o) { return o.id === ans.coachVoice; });
        return v ? v.label.toLowerCase() : 'tu coach';
      })();
      var apps = (ans.blockedApps || []).length;
      return [
        'Curando contenido para ' + goalLabel + '…',
        'Configurando tu coach con voz ' + voiceLabel + '…',
        'Preparando tu primera sesión de ' + (ans.sessionMin || 25) + ' minutos…',
        'Activando bloqueo' + (apps ? ' para ' + apps + (apps === 1 ? ' app' : ' apps') : '') + '…',
        'Sincronizando tu universo Mentex…',
      ];
    }, [ans.goal, ans.coachVoice, ans.sessionMin, ans.blockedApps]);

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


  // ── Step 10: Notifications + welcome ───────────────────────────────────────
  function StepNotifications(props) {
    var ans = props.answers;
    var onChange = props.onChange;
    var firstName = (ans.name || '').trim().split(' ')[0] || 'amig@';

    return React.createElement('div', null,
      React.createElement(StepHeader, {
        eyebrow: 'Paso 10 · Listos',
        title: 'Estás dentro, ' + firstName + '.',
        subtitle: 'Una última cosa para terminar de afinar tu app.',
      }),
      React.createElement('div', { style: { padding: '0 24px' } },
        React.createElement('div', {
          style: {
            padding: '20px 18px',
            borderRadius: 16,
            background: 'linear-gradient(180deg, rgba(61,255,209,0.06), rgba(61,255,209,0.02))',
            border: '0.5px solid rgba(61,255,209,0.20)',
          },
        },
          React.createElement('div', {
            style: {
              fontSize: 32, marginBottom: 10, textAlign: 'center',
            },
          }, '🔔'),
          React.createElement('div', {
            style: {
              fontSize: 16, fontWeight: 700, color: 'var(--ink-1)',
              textAlign: 'center', marginBottom: 6,
            },
          }, '¿Activar notificaciones?'),
          React.createElement('div', {
            style: {
              fontSize: 13, color: 'var(--ink-3)', textAlign: 'center',
              lineHeight: 1.5, marginBottom: 16,
            },
          }, 'Para recordarte tu sesión, celebrar cada hito, y avisarte cuando tu coach IA quiera compartirte algo.'),
          React.createElement('div', {
            style: { display: 'flex', flexDirection: 'column', gap: 10 },
          },
            React.createElement(OptionCard, {
              icon: '✓',
              label: 'Activar notificaciones',
              desc: 'Recomendado',
              selected: ans.notificationsEnabled === true,
              onClick: function() { onChange({ notificationsEnabled: true }); },
            }),
            React.createElement(OptionCard, {
              icon: '○',
              label: 'No por ahora',
              desc: 'Puedes activarlas después en Ajustes',
              selected: ans.notificationsEnabled === false,
              onClick: function() { onChange({ notificationsEnabled: false }); },
            })
          )
        )
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
      // 1: Goal
      function(a) { return !!a.goal; },
      // 2: Baseline (siempre válido — slider con default)
      function(a) { return typeof a.baselineHours === 'number'; },
      // 3: Blocked apps — al menos 1
      function(a) { return Array.isArray(a.blockedApps) && a.blockedApps.length > 0; },
      // 4: Content prefs — al menos 1
      function(a) { return Array.isArray(a.contentPrefs) && a.contentPrefs.length > 0; },
      // 5: Focus time
      function(a) { return !!a.focusTime; },
      // 6: Session duration (siempre válido — default 25)
      function(a) { return typeof a.sessionMin === 'number'; },
      // 7: Coach voice
      function(a) { return !!a.coachVoice; },
      // 8: Fake-load (auto-advance, siempre válido)
      function(a) { return true; },
      // 9: Notifications — válido si decidió true o false
      function(a) { return a.notificationsEnabled === true || a.notificationsEnabled === false; },
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
      stepEl = React.createElement(StepFocusTime, { answers: answers, onChange: handleChange });
    } else if (step === 6) {
      stepEl = React.createElement(StepSessionDuration, { answers: answers, onChange: handleChange });
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
    ONBOARDING_SESSION_DURATIONS: SESSION_DURATIONS,
    ONBOARDING_COACH_VOICES: COACH_VOICES,
  });

})();
