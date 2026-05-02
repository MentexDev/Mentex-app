// screens/auth-flow.jsx — Phase 0 · Cimientos del sistema de auth
//
// Esta fase NO renderiza UI todavía — solo establece los cimientos:
//   • Store __mtxAuth: representa al user actual + flags isAuthenticated /
//     isOnboarding / lastActiveAt. Persiste a localStorage.
//   • Hook useAuth(): consumible reactivo desde cualquier screen.
//   • Mock provider methods: signInWithEmail, verifyOTP, signInWithApple,
//     signInWithGoogle, signOut, deleteAccount.
//   • Auth view state machine constants: 'splash' | 'welcome' | 'auth-email'
//     | 'auth-otp' | 'auth-apple-mock' | 'auth-google-mock' | 'onboarding'
//     | 'app' (manejado en MentexApp).
//
// AUTH MOCK behavior (Phase 0 — sin backend real):
//   • Email contains 'existing@' → returning user, salta onboarding directo a app
//   • Email contains 'demo@' → demo user con onboarding ya completado y data hardcoded
//   • Cualquier otro email → nuevo signup, va a onboarding
//   • OTP '123456' valida; otros muestran error
//   • Apple/Google mock: 1.2s delay, siempre ok, crea user con email faked
//   • Network error mock: 5% random fail con retry
//
// localStorage shape:
//   { __mtx_auth: { user: { id, email, name, provider, createdAt, onboardingCompleted, lastActiveAt }, isAuthenticated: bool } }
//
// El componente AuthScreen (UI real) llega en Phase 1+. Por ahora exponemos
// solo el store + hook para que el smart routing del MentexApp funcione.

(function() {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────
  var AUTH_STORAGE_KEY = '__mtx_auth_v1';
  // View states del shell — exportados para que MentexApp los use al routear.
  var AUTH_VIEWS = {
    SPLASH: 'splash',
    WELCOME: 'welcome',
    AUTH_EMAIL: 'auth-email',
    AUTH_OTP: 'auth-otp',
    AUTH_APPLE_MOCK: 'auth-apple-mock',
    AUTH_GOOGLE_MOCK: 'auth-google-mock',
    ONBOARDING: 'onboarding',
    APP: 'app',
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _genId(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function _loadFromStorage() {
    try {
      var raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (_) { return null; }
  }

  function _saveToStorage(state) {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
    } catch (_) { /* localStorage full o disabled — no crítico */ }
  }

  // Detecta tipo de email para mock (Phase 0 only — Phase 2+ irá a backend real)
  function _detectMockUserType(email) {
    var lower = (email || '').toLowerCase();
    if (lower.indexOf('existing@') === 0 || lower.indexOf('returning@') === 0) {
      return 'returning'; // user que ya completó onboarding antes
    }
    if (lower.indexOf('demo@') === 0) {
      return 'demo'; // demo user con state pre-poblado
    }
    return 'new'; // signup nuevo, irá a onboarding
  }

  function _mockNetworkDelay(min, max) {
    return new Promise(function(resolve) {
      setTimeout(resolve, min + Math.random() * (max - min));
    });
  }


  // ── Store: __mtxAuth ───────────────────────────────────────────────────────
  if (typeof window !== 'undefined' && !window.__mtxAuth) {
    var stored = _loadFromStorage();
    var _state = stored || {
      user: null,
      isAuthenticated: false,
    };

    var _emit = function() {
      window.dispatchEvent(new CustomEvent('mtx:auth-changed'));
    };

    var _setState = function(patch) {
      _state = Object.assign({}, _state, patch);
      _saveToStorage(_state);
      _emit();
    };

    window.__mtxAuth = {
      get: function() { return _state; },

      // ── Email magic OTP flow ────────────────────────────────────────────
      // Paso 1: user ingresa email → mock manda OTP. En Phase 2+ reemplazar
      // con backend real (Supabase auth.signInWithOtp / Clerk / etc).
      // Retorna promise con { ok, userType, pendingEmail } o { error }.
      sendOTP: function(email) {
        return _mockNetworkDelay(800, 1400).then(function() {
          // Mock 5% network failure
          if (Math.random() < 0.05) {
            return { error: 'network' };
          }
          var trimmed = (email || '').trim().toLowerCase();
          // Validación email simple
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            return { error: 'invalid_email' };
          }
          var userType = _detectMockUserType(trimmed);
          // Persistimos pending email para el OTP screen
          _setState({ pendingEmail: trimmed, pendingUserType: userType });
          return { ok: true, userType: userType, pendingEmail: trimmed };
        });
      },

      // Paso 2: user ingresa OTP → mock valida (123456 = ok).
      // Retorna { ok, user, isReturning } o { error }.
      verifyOTP: function(otp) {
        return _mockNetworkDelay(600, 1000).then(function() {
          if (otp !== '123456') {
            return { error: 'wrong_otp' };
          }
          var email = _state.pendingEmail;
          var userType = _state.pendingUserType;
          if (!email) return { error: 'no_pending_email' };

          var user;
          var isReturning = false;
          if (userType === 'returning') {
            user = {
              id: _genId('user'),
              email: email,
              name: email.split('@')[0],
              provider: 'email',
              createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // hace 30d
              onboardingCompleted: true,
              lastActiveAt: Date.now(),
            };
            isReturning = true;
          } else if (userType === 'demo') {
            user = {
              id: 'demo-user',
              email: email,
              name: 'Demo',
              provider: 'email',
              createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
              onboardingCompleted: true,
              lastActiveAt: Date.now(),
            };
            isReturning = true;
          } else {
            user = {
              id: _genId('user'),
              email: email,
              name: null, // se setea en onboarding step "name"
              provider: 'email',
              createdAt: Date.now(),
              onboardingCompleted: false,
              lastActiveAt: Date.now(),
            };
          }
          _setState({
            user: user,
            isAuthenticated: true,
            pendingEmail: null,
            pendingUserType: null,
          });
          return { ok: true, user: user, isReturning: isReturning };
        });
      },

      // Resend OTP (con cooldown manejado en UI)
      resendOTP: function() {
        return _mockNetworkDelay(400, 800).then(function() {
          return { ok: true };
        });
      },

      // ── Apple Sign In mock ──────────────────────────────────────────────
      // Phase 2+: bridge a AuthenticationServices via Capacitor o native.
      // Mock: emula el system prompt con delay realista.
      signInWithApple: function() {
        return _mockNetworkDelay(1000, 1600).then(function() {
          var fakeEmail = 'user_' + Math.random().toString(36).slice(2, 8) + '@privaterelay.appleid.com';
          var user = {
            id: _genId('user'),
            email: fakeEmail,
            name: null,
            provider: 'apple',
            createdAt: Date.now(),
            onboardingCompleted: false,
            lastActiveAt: Date.now(),
          };
          _setState({ user: user, isAuthenticated: true });
          return { ok: true, user: user, isReturning: false };
        });
      },

      // ── Google Sign In mock ─────────────────────────────────────────────
      signInWithGoogle: function() {
        return _mockNetworkDelay(900, 1400).then(function() {
          var fakeName = ['Juan', 'María', 'Carlos', 'Ana', 'Luis'][Math.floor(Math.random() * 5)];
          var fakeEmail = fakeName.toLowerCase() + '.' + Math.random().toString(36).slice(2, 6) + '@gmail.com';
          var user = {
            id: _genId('user'),
            email: fakeEmail,
            name: fakeName,
            provider: 'google',
            createdAt: Date.now(),
            onboardingCompleted: false,
            lastActiveAt: Date.now(),
          };
          _setState({ user: user, isAuthenticated: true });
          return { ok: true, user: user, isReturning: false };
        });
      },

      // ── Lifecycle ───────────────────────────────────────────────────────
      // Llamado desde Onboarding al completar el último step.
      completeOnboarding: function(answers) {
        if (!_state.user) return;
        var updated = Object.assign({}, _state.user, {
          name: answers.name || _state.user.name || 'Tú',
          onboardingCompleted: true,
          lastActiveAt: Date.now(),
        });
        _setState({ user: updated });
      },

      // Update lastActiveAt (para detectar 30+ días inactivo en Phase 6)
      touchActivity: function() {
        if (!_state.user) return;
        var updated = Object.assign({}, _state.user, { lastActiveAt: Date.now() });
        _setState({ user: updated });
      },

      // Update arbitrario al user (cambio de nombre, edit preferences, etc).
      // No sobreescribe id, email, provider, createdAt.
      updateUser: function(patch) {
        if (!_state.user) return;
        var safe = Object.assign({}, patch);
        delete safe.id; delete safe.email; delete safe.provider; delete safe.createdAt;
        var updated = Object.assign({}, _state.user, safe);
        _setState({ user: updated });
      },

      signOut: function() {
        // Limpia toda la auth pero PRESERVA stores como __mtxIAChat history,
        // __mtxIAAgenda reminders. Decisión Phase 5 puede cambiar a "wipe all"
        // si compliance lo requiere.
        _setState({
          user: null,
          isAuthenticated: false,
          pendingEmail: null,
          pendingUserType: null,
        });
      },

      deleteAccount: function() {
        // Mock: en Phase 5 esto tendrá el flow completo (grace period 30d,
        // email confirmation, etc). Por ahora signOut + clear localStorage.
        try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch (_) {}
        _setState({
          user: null,
          isAuthenticated: false,
          pendingEmail: null,
          pendingUserType: null,
        });
      },

      // Helper para tests / dev
      _reset: function() {
        try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch (_) {}
        _state = { user: null, isAuthenticated: false };
        _emit();
      },
    };
  }


  // ── Store: __mtxOnboarding ─────────────────────────────────────────────────
  // Persiste el progreso del onboarding por separado del auth — un user que
  // mata la app a mitad del onboarding NO pierde sus respuestas. Resume desde
  // el step donde estaba.
  var ONBOARDING_STORAGE_KEY = '__mtx_onboarding_v1';

  function _loadOnboardingFromStorage() {
    try {
      var raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) { return null; }
  }

  function _saveOnboardingToStorage(state) {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  if (typeof window !== 'undefined' && !window.__mtxOnboarding) {
    var storedOb = _loadOnboardingFromStorage();
    var _obState = storedOb || {
      step: 0,
      answers: {
        goals: [],            // array de strings: 'focus' | 'sleep' | 'stress' | 'learning' | 'productivity' | 'wellbeing'
        experience: null,     // 'new' | 'some' | 'experienced'
        timeMin: 15,           // 5 | 10 | 15 | 20
        timeOfDay: null,      // 'morning' | 'afternoon' | 'evening'
        blockApps: null,      // bool
        name: '',
        commit7d: true,
      },
      completed: false,
      startedAt: null,
    };

    var _emitOb = function() {
      window.dispatchEvent(new CustomEvent('mtx:onboarding-changed'));
    };

    var _setObState = function(patch) {
      _obState = Object.assign({}, _obState, patch);
      _saveOnboardingToStorage(_obState);
      _emitOb();
    };

    window.__mtxOnboarding = {
      get: function() { return _obState; },

      start: function() {
        if (_obState.startedAt) return; // resume — no resetear
        _setObState({ startedAt: Date.now() });
      },

      // Avanzar al siguiente step
      next: function() {
        _setObState({ step: _obState.step + 1 });
      },

      // Retroceder
      back: function() {
        if (_obState.step > 0) _setObState({ step: _obState.step - 1 });
      },

      // Saltar a un step específico (útil para edit-preferences en settings)
      goTo: function(step) {
        _setObState({ step: Math.max(0, step) });
      },

      // Update parcial de answers
      updateAnswers: function(patch) {
        var next = Object.assign({}, _obState.answers, patch);
        _setObState({ answers: next });
      },

      // Marca completado y dispara completion en __mtxAuth
      complete: function() {
        _setObState({ completed: true });
        if (window.__mtxAuth) {
          window.__mtxAuth.completeOnboarding(_obState.answers);
        }
      },

      // Reset para re-onboarding (Phase 6)
      reset: function() {
        _obState = {
          step: 0,
          answers: {
            goals: [], experience: null, timeMin: 15, timeOfDay: null,
            blockApps: null, name: '', commit7d: true,
          },
          completed: false,
          startedAt: null,
        };
        _saveOnboardingToStorage(_obState);
        _emitOb();
      },

      _reset: function() {
        try { localStorage.removeItem(ONBOARDING_STORAGE_KEY); } catch (_) {}
        _obState = {
          step: 0,
          answers: {
            goals: [], experience: null, timeMin: 15, timeOfDay: null,
            blockApps: null, name: '', commit7d: true,
          },
          completed: false,
          startedAt: null,
        };
        _emitOb();
      },
    };
  }


  // ── Hooks ──────────────────────────────────────────────────────────────────
  // useAuth: reactive snapshot del store __mtxAuth. Same pattern que useIAChat,
  // useIAAgenda, useIAConfig — subscribe a evento custom + setState forzado.
  function useAuth() {
    var s = (typeof window !== 'undefined' && window.__mtxAuth)
      ? window.__mtxAuth.get()
      : { user: null, isAuthenticated: false };
    var stateHook = React.useState(s);
    var state = stateHook[0]; var setState = stateHook[1];
    React.useEffect(function() {
      var handler = function() {
        if (window.__mtxAuth) setState(window.__mtxAuth.get());
      };
      window.addEventListener('mtx:auth-changed', handler);
      return function() { window.removeEventListener('mtx:auth-changed', handler); };
    }, []);
    return state;
  }

  function useOnboarding() {
    var s = (typeof window !== 'undefined' && window.__mtxOnboarding)
      ? window.__mtxOnboarding.get()
      : { step: 0, answers: {}, completed: false };
    var stateHook = React.useState(s);
    var state = stateHook[0]; var setState = stateHook[1];
    React.useEffect(function() {
      var handler = function() {
        if (window.__mtxOnboarding) setState(window.__mtxOnboarding.get());
      };
      window.addEventListener('mtx:onboarding-changed', handler);
      return function() { window.removeEventListener('mtx:onboarding-changed', handler); };
    }, []);
    return state;
  }


  // ── Smart router helper ────────────────────────────────────────────────────
  // Determina qué view debe renderizarse al mount/render del MentexApp.
  // Centraliza la lógica para que MentexApp solo llame esta función.
  function getInitialAuthView() {
    var auth = window.__mtxAuth ? window.__mtxAuth.get() : null;
    if (!auth || !auth.isAuthenticated) return AUTH_VIEWS.SPLASH;
    if (!auth.user) return AUTH_VIEWS.SPLASH;
    if (!auth.user.onboardingCompleted) return AUTH_VIEWS.ONBOARDING;
    return AUTH_VIEWS.APP;
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1 · Welcome screens reales
  // ═══════════════════════════════════════════════════════════════════════════

  // ── MentexZenIcon — logo placeholder hasta que el user envíe el real ──────
  // Diseño: enso (círculo zen abierto, símbolo de plenitud incompleta) con
  // ondas concéntricas internas que respiran. Stroke neon, fill transparent.
  // Animación: scale breath 4s + pulse glow. Reutilizable en distintos sizes.
  function MentexZenIcon(props) {
    var size = props.size || 96;
    var animate = props.animate !== false;
    var s = size;
    var c = s / 2;
    return (
      <div style={{
        width: s, height: s,
        position: 'relative',
        animation: animate ? 'mtx-zen-breath 4.2s ease-in-out infinite' : 'none',
        willChange: animate ? 'transform' : 'auto',
      }}>
        <svg width={s} height={s} viewBox={'0 0 ' + s + ' ' + s}
             style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id={'zen-glow-' + s} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3DFFD1" stopOpacity="0.55"/>
              <stop offset="100%" stopColor="#3DFFD1" stopOpacity="0"/>
            </radialGradient>
            <linearGradient id={'zen-stroke-' + s} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6affd9"/>
              <stop offset="100%" stopColor="#1ad9ad"/>
            </linearGradient>
          </defs>
          {/* Halo glow detrás */}
          <circle cx={c} cy={c} r={c * 0.95} fill={'url(#zen-glow-' + s + ')'}/>
          {/* Ondas concéntricas (3 anillos suaves) */}
          <circle cx={c} cy={c} r={c * 0.30} fill="none"
                  stroke="rgba(61,255,209,0.18)" strokeWidth={s * 0.012}/>
          <circle cx={c} cy={c} r={c * 0.50} fill="none"
                  stroke="rgba(61,255,209,0.10)" strokeWidth={s * 0.010}/>
          <circle cx={c} cy={c} r={c * 0.70} fill="none"
                  stroke="rgba(61,255,209,0.06)" strokeWidth={s * 0.008}/>
          {/* Enso — círculo zen abierto. Path con arc que deja gap arriba-derecha
              (270° aprox) para evocar imperfección beauty del zen. */}
          <path
            d={
              'M ' + (c + c * 0.78 * Math.cos(-Math.PI / 8)) + ' ' + (c + c * 0.78 * Math.sin(-Math.PI / 8)) +
              ' A ' + (c * 0.78) + ' ' + (c * 0.78) + ' 0 1 0 ' +
              (c + c * 0.78 * Math.cos(Math.PI / 6)) + ' ' + (c + c * 0.78 * Math.sin(Math.PI / 6))
            }
            fill="none"
            stroke={'url(#zen-stroke-' + s + ')'}
            strokeWidth={s * 0.04}
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 ' + (s * 0.08) + 'px rgba(61,255,209,0.45))' }}
          />
          {/* Punto central — la "respiración", el ahora */}
          <circle cx={c} cy={c} r={s * 0.038} fill="#3DFFD1"
                  style={{
                    filter: 'drop-shadow(0 0 ' + (s * 0.06) + 'px rgba(61,255,209,0.8))',
                  }}/>
        </svg>
      </div>
    );
  }


  // ── MeshGradientBackground — fondo aurora dark + neon ──────────────────────
  // Dos radial-gradients con posiciones animadas via CSS animation. Sin
  // filter:blur (lección Phase 5 — overflow:hidden corta el blur creando seam).
  // Performance: solo 2 gradients animados, transform+opacity-only animations.
  function MeshGradientBackground() {
    return (
      <React.Fragment>
        {/* Layer base sólido */}
        <div style={{
          position: 'absolute', inset: 0,
          background: '#070a0a',
          zIndex: 0,
        }}/>
        {/* Aurora 1 — neon principal, drift slow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(50% 60% at 30% 25%, rgba(61,255,209,0.18), transparent 65%)',
          animation: 'mtx-aurora-1 22s ease-in-out infinite',
          willChange: 'transform, opacity',
          zIndex: 0,
        }}/>
        {/* Aurora 2 — purple secundario para profundidad */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(45% 55% at 75% 70%, rgba(155,138,255,0.10), transparent 60%)',
          animation: 'mtx-aurora-2 28s ease-in-out infinite reverse',
          willChange: 'transform, opacity',
          zIndex: 0,
        }}/>
        {/* Vignette top + bottom para legibilidad */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}/>
      </React.Fragment>
    );
  }


  // ── ParticleField — partículas sutiles drift ───────────────────────────────
  // 36 partículas con animation-delay y duration variados para drift orgánico.
  // Solo transform/opacity. Posiciones aleatorias generadas una vez (useMemo).
  function ParticleField(props) {
    var count = props.count || 36;
    var particles = React.useMemo(function() {
      var arr = [];
      for (var i = 0; i < count; i++) {
        arr.push({
          left: Math.random() * 100,
          top: Math.random() * 100,
          size: 1.5 + Math.random() * 2.5,
          duration: 14 + Math.random() * 14,
          delay: Math.random() * -28,
          opacity: 0.2 + Math.random() * 0.4,
        });
      }
      return arr;
    }, [count]);
    return (
      <div style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}>
        {particles.map(function(p, i) {
          return (
            <div key={i} style={{
              position: 'absolute',
              left: p.left + '%',
              top: p.top + '%',
              width: p.size, height: p.size,
              borderRadius: 999,
              background: '#3DFFD1',
              opacity: p.opacity,
              boxShadow: '0 0 ' + (p.size * 2) + 'px rgba(61,255,209,0.6)',
              animation: 'mtx-particle-drift ' + p.duration + 's ease-in-out infinite',
              animationDelay: p.delay + 's',
              willChange: 'transform, opacity',
            }}/>
          );
        })}
      </div>
    );
  }


  // ── TaglineRotator — switch automático entre frases ────────────────────────
  // Crossfade entre 3 taglines cada 4.5s. Cada cambio: fade out (250ms) →
  // swap text → fade in (350ms). Total cycle: 13.5s.
  function TaglineRotator() {
    var TAGLINES = [
      'Tu mente, tu progreso, tu camino.',
      'Tu mente, sin ruido.',
      'Foco, claridad, presencia.',
    ];
    var idxState = React.useState(0);
    var idx = idxState[0]; var setIdx = idxState[1];
    var visState = React.useState(true);
    var visible = visState[0]; var setVisible = visState[1];

    React.useEffect(function() {
      var timer = setInterval(function() {
        // Fade out
        setVisible(false);
        setTimeout(function() {
          setIdx(function(i) { return (i + 1) % TAGLINES.length; });
          setVisible(true);
        }, 280);
      }, 4500);
      return function() { clearInterval(timer); };
    }, []);

    return (
      <div style={{
        position: 'relative',
        height: 24,
        textAlign: 'center',
        overflow: 'visible',
      }}>
        <div style={{
          fontSize: 14.5,
          fontWeight: 500,
          color: 'var(--ink-2)',
          letterSpacing: '-0.005em',
          fontFamily: 'var(--ff-sans)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity .32s ease, transform .32s ease',
          willChange: 'opacity, transform',
        }}>{TAGLINES[idx]}</div>
      </div>
    );
  }


  // ── WelcomeSlide — un slide individual del welcome multi-slide ────────────
  // Cada slide tiene: icon hero (slide 1: Mentex zen icon, slide 2-3: feature
  // illustrations), title, subtitle. Layout consistente entre slides.
  function WelcomeSlide(props) {
    var slide = props.slide;
    var visible = props.visible;
    return (
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 32px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : (props.direction === 'next' ? 'translateX(-30px)' : 'translateX(30px)'),
        transition: 'opacity .55s ease, transform .55s cubic-bezier(.4,0,.2,1)',
        willChange: 'opacity, transform',
        pointerEvents: visible ? 'auto' : 'none',
      }}>
        <div style={{ marginBottom: 32 }}>
          {slide.hero}
        </div>
        <h1 style={{
          margin: 0, marginBottom: 12,
          fontSize: 30,
          fontWeight: 700,
          color: 'var(--ink-1)',
          letterSpacing: '-0.025em',
          fontFamily: 'var(--ff-display, var(--ff-sans))',
          textAlign: 'center',
          lineHeight: 1.15,
          maxWidth: 320,
        }}>{slide.title}</h1>
        {slide.subtitle && (
          <div style={{ minHeight: 24 }}>
            {slide.subtitle}
          </div>
        )}
      </div>
    );
  }


  // ── FeatureGlyph — icono ilustrado para slides 2 y 3 ──────────────────────
  // Slide 2: shield + apps fading (bloqueo de distracciones)
  // Slide 3: chat bubble + sparkles (coach IA)
  function FeatureGlyphShield() {
    return (
      <div style={{ width: 96, height: 96, position: 'relative' }}>
        <svg width="96" height="96" viewBox="0 0 96 96">
          <defs>
            <linearGradient id="fg-shield" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6affd9"/>
              <stop offset="100%" stopColor="#1ad9ad"/>
            </linearGradient>
            <radialGradient id="fg-shield-glow" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#3DFFD1" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#3DFFD1" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="48" cy="48" r="44" fill="url(#fg-shield-glow)"/>
          <path d="M48 14 L74 24 V46 C74 62 62 76 48 82 C34 76 22 62 22 46 V24 Z"
                fill="none" stroke="url(#fg-shield)" strokeWidth="2.5"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 0 8px rgba(61,255,209,0.45))' }}/>
          <path d="M37 48 L45 56 L60 40" fill="none" stroke="#3DFFD1" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 0 6px rgba(61,255,209,0.6))' }}/>
        </svg>
      </div>
    );
  }
  function FeatureGlyphCoach() {
    return (
      <div style={{ width: 96, height: 96, position: 'relative' }}>
        <svg width="96" height="96" viewBox="0 0 96 96">
          <defs>
            <linearGradient id="fg-coach" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6affd9"/>
              <stop offset="100%" stopColor="#9b8aff"/>
            </linearGradient>
            <radialGradient id="fg-coach-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3DFFD1" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="#3DFFD1" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="48" cy="48" r="44" fill="url(#fg-coach-glow)"/>
          {/* Chat bubble */}
          <path d="M22 32 C22 26 26 22 32 22 H64 C70 22 74 26 74 32 V52 C74 58 70 62 64 62 H42 L30 72 V62 H32 C26 62 22 58 22 52 Z"
                fill="rgba(61,255,209,0.06)"
                stroke="url(#fg-coach)" strokeWidth="2.2"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 0 8px rgba(61,255,209,0.35))' }}/>
          {/* Sparkles */}
          <path d="M48 32 L50 38 L56 40 L50 42 L48 48 L46 42 L40 40 L46 38 Z"
                fill="#3DFFD1"/>
          <circle cx="62" cy="34" r="1.6" fill="#9b8aff"/>
          <circle cx="36" cy="50" r="1.4" fill="#9b8aff"/>
        </svg>
      </div>
    );
  }


  // ── WelcomeScreen — orquestador de los 3 slides + dots + CTA ──────────────
  function WelcomeScreen(props) {
    var slidesData = React.useMemo(function() { return [
      {
        hero: <MentexZenIcon size={120}/>,
        title: 'Mentex',
        subtitle: <TaglineRotator/>,
      },
      {
        hero: <FeatureGlyphShield/>,
        title: 'Silencia el ruido digital',
        subtitle: (
          <div style={{
            fontSize: 14.5, fontWeight: 400,
            color: 'var(--ink-3)', letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
            textAlign: 'center', lineHeight: 1.5,
            maxWidth: 320,
          }}>
            Bloquea las apps que te roban el foco mientras estás presente.
          </div>
        ),
      },
      {
        hero: <FeatureGlyphCoach/>,
        title: 'Tu coach personal',
        subtitle: (
          <div style={{
            fontSize: 14.5, fontWeight: 400,
            color: 'var(--ink-3)', letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
            textAlign: 'center', lineHeight: 1.5,
            maxWidth: 320,
          }}>
            Mentex aprende contigo y te guía día a día. Pregúntale lo que sea.
          </div>
        ),
      },
    ]; }, []);

    var idxState = React.useState(0);
    var idx = idxState[0]; var setIdx = idxState[1];
    var dirState = React.useState('next');
    var dir = dirState[0]; var setDir = dirState[1];

    // Auto-advance cada 5s. Pausable cuando el user hace tap en dots (resetea
    // el timer al tap manual). El último slide NO loopea automáticamente —
    // empuja al user a continuar. Si quiere quedarse en él, bien.
    //
    // Guard contra React StrictMode double-fire: useRef para track el último
    // timer y prevenir multiple timers paralelos. En dev mode, StrictMode
    // dispara el effect 2x y sin guard ambos timers se ejecutan duplicando
    // el avance — el user veía el slide saltar de 0 a 2 inmediatamente.
    var advanceTimerRef = React.useRef(null);
    React.useEffect(function() {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
      if (idx >= slidesData.length - 1) return;
      advanceTimerRef.current = setTimeout(function() {
        advanceTimerRef.current = null;
        setDir('next');
        setIdx(function(i) { return Math.min(i + 1, slidesData.length - 1); });
      }, 5000);
      return function() {
        if (advanceTimerRef.current) {
          clearTimeout(advanceTimerRef.current);
          advanceTimerRef.current = null;
        }
      };
    }, [idx, slidesData.length]);

    // Swipe support — touch handlers básicos sobre el slides container.
    var touchStartX = React.useRef(null);
    var onTouchStart = function(e) { touchStartX.current = e.touches[0].clientX; };
    var onTouchEnd = function(e) {
      if (touchStartX.current == null) return;
      var dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) < 40) { touchStartX.current = null; return; }
      if (dx < 0 && idx < slidesData.length - 1) {
        setDir('next');
        setIdx(idx + 1);
      } else if (dx > 0 && idx > 0) {
        setDir('prev');
        setIdx(idx - 1);
      }
      touchStartX.current = null;
    };

    var goToSlide = function(i) {
      setDir(i > idx ? 'next' : 'prev');
      setIdx(i);
    };

    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        overflow: 'hidden',
        animation: 'mtx-fade-in .4s ease',
      }}>
        <MeshGradientBackground/>
        <ParticleField count={36}/>

        {/* Slides container — centrado vertical, ocupa la zona top→middle */}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            position: 'absolute',
            top: 60, left: 0, right: 0, bottom: 200,
            zIndex: 2,
          }}>
          {slidesData.map(function(s, i) {
            return <WelcomeSlide key={i} slide={s} visible={i === idx} direction={dir}/>;
          })}
        </div>

        {/* Dots indicator */}
        <div style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 168,
          display: 'flex', justifyContent: 'center', gap: 8,
          zIndex: 3,
        }}>
          {slidesData.map(function(_, i) {
            var active = i === idx;
            return (
              <button
                key={i}
                onClick={function() { goToSlide(i); }}
                aria-label={'Ir a slide ' + (i + 1)}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  width: active ? 24 : 6, height: 6,
                  borderRadius: 999, border: 0,
                  background: active ? 'var(--neon)' : 'rgba(255,255,255,0.20)',
                  boxShadow: active ? '0 0 10px rgba(61,255,209,0.6)' : 'none',
                  transition: 'width .35s ease, background .35s, box-shadow .35s',
                  padding: 0,
                }}/>
            );
          })}
        </div>

        {/* CTA único + sign-in link */}
        <div style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 60,
          padding: '0 32px',
          zIndex: 3,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          <button
            onClick={props.onContinue}
            aria-label="Empezar"
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              width: '100%',
              padding: '15px 22px', borderRadius: 999,
              border: '0.5px solid rgba(61,255,209,0.50)',
              background: 'linear-gradient(180deg, rgba(61,255,209,0.20), rgba(61,255,209,0.08))',
              color: 'var(--neon)',
              fontSize: 15, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              boxShadow: '0 0 0 1px rgba(61,255,209,0.20), 0 12px 32px -10px rgba(61,255,209,0.45), inset 0 0 16px rgba(61,255,209,0.08)',
              animation: 'mtx-cta-breath 3.6s ease-in-out infinite',
              willChange: 'transform, box-shadow',
            }}>Empezar</button>
          <button
            onClick={props.onSignIn}
            aria-label="Iniciar sesión con cuenta existente"
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              padding: '6px 14px',
              border: 0, background: 'transparent',
              color: 'var(--ink-3)',
              fontSize: 13, fontWeight: 500,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>¿Ya tienes cuenta? <span style={{ color: 'var(--neon)' }}>Inicia sesión</span></button>
        </div>
      </div>
    );
  }


  // ── SplashScreen — first paint, 800ms, auto-progresa ───────────────────────
  function SplashScreen(props) {
    React.useEffect(function() {
      var t = setTimeout(function() {
        if (props.onNext) props.onNext();
      }, 1100);
      return function() { clearTimeout(t); };
    }, []);
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#070a0a',
        overflow: 'hidden',
      }}>
        <MeshGradientBackground/>
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
          animation: 'mtx-fade-in .6s ease both',
        }}>
          <MentexZenIcon size={88}/>
          <div style={{
            fontSize: 22, fontWeight: 700,
            color: 'var(--ink-1)',
            letterSpacing: '-0.02em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
            opacity: 0.92,
          }}>Mentex</div>
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1c · Auth screens (Email + OTP + Apple/Google mocks)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── AuthScreen — pantalla central con providers + email field ─────────────
  function AuthScreen(props) {
    var emailState = React.useState('');
    var email = emailState[0]; var setEmail = emailState[1];
    var loadingState = React.useState(null);
    var loading = loadingState[0]; var setLoading = loadingState[1];
    var errorState = React.useState(null);
    var error = errorState[0]; var setError = errorState[1];
    var inputRef = React.useRef(null);

    var handleEmailContinue = function() {
      var trimmed = email.trim();
      if (!trimmed) {
        setError('Ingresa tu email');
        if (inputRef.current) inputRef.current.focus();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setError('Ese email no se ve bien');
        return;
      }
      setError(null);
      setLoading('email');
      window.__mtxAuth.sendOTP(trimmed).then(function(res) {
        setLoading(null);
        if (res.error === 'invalid_email') {
          setError('Ese email no se ve bien');
          return;
        }
        if (res.error === 'network') {
          setError('Error de conexión. Reintenta.');
          return;
        }
        if (res.ok && props.onEmailSent) props.onEmailSent(trimmed);
      });
    };

    var handleApple = function() {
      setLoading('apple');
      window.__mtxAuth.signInWithApple().then(function() {
        setLoading(null);
        // El effect de auth en MentexApp navega solo a onboarding/app
      });
    };
    var handleGoogle = function() {
      setLoading('google');
      window.__mtxAuth.signInWithGoogle().then(function() {
        setLoading(null);
      });
    };

    var onKey = function(e) {
      if (e.key === 'Enter' && !loading) {
        e.preventDefault();
        handleEmailContinue();
      }
    };

    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        overflow: 'hidden',
        animation: 'mtx-fade-in .35s ease',
      }}>
        <MeshGradientBackground/>
        <ParticleField count={20}/>

        {/* Header con back button */}
        <div style={{
          position: 'absolute', top: 60, left: 0, right: 0,
          padding: '0 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          zIndex: 3,
        }}>
          <button
            onClick={props.onBack}
            aria-label="Volver"
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              width: 36, height: 36, borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'var(--ink-1)', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <IcChevL size={15} stroke="currentColor" strokeWidth={1.9}/>
          </button>
          <div style={{ flex: 1 }}/>
          <MentexZenIcon size={36} animate={false}/>
        </div>

        {/* Body — title + form */}
        <div style={{
          position: 'absolute',
          top: 130, left: 0, right: 0, bottom: 32,
          padding: '0 28px',
          zIndex: 3,
          display: 'flex', flexDirection: 'column',
          overflow: 'auto',
        }} className="mtx-no-scrollbar">
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 9.5, color: 'var(--neon)',
              letterSpacing: '0.16em', textTransform: 'uppercase',
              fontWeight: 600, marginBottom: 6,
              fontFamily: 'var(--ff-sans)',
            }}>BIENVENIDO</div>
            <h1 style={{
              margin: 0,
              fontSize: 26, fontWeight: 700,
              color: 'var(--ink-1)',
              letterSpacing: '-0.025em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              lineHeight: 1.15,
            }}>Empecemos.</h1>
            <p style={{
              margin: '8px 0 0',
              fontSize: 13.5, color: 'var(--ink-3)',
              letterSpacing: '-0.005em',
              fontFamily: 'var(--ff-sans)',
              lineHeight: 1.5,
            }}>Ingresa con tu cuenta o crea una nueva. Es la misma puerta.</p>
          </div>

          {/* Apple Sign In — primary, top */}
          <button
            onClick={handleApple}
            disabled={!!loading}
            aria-label="Continuar con Apple"
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: loading ? 'wait' : 'pointer',
              width: '100%', height: 50,
              padding: '0 18px',
              borderRadius: 14,
              border: '0.5px solid rgba(255,255,255,0.10)',
              background: '#000',
              color: '#fff',
              fontSize: 14.5, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 10,
              opacity: loading && loading !== 'apple' ? 0.5 : 1,
              transition: 'opacity .2s',
            }}>
            <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor">
              <path d="M11.4 10.6c0-2.4 2-3.6 2.1-3.6-1.1-1.6-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8C1.6 5.3 0 6.3 0 8.7c0 1.6.5 3.4 1.4 4.8.7 1.3 1.6 2.6 2.6 2.6 1 0 1.4-.7 2.6-.7 1.3 0 1.6.7 2.7.6 1.1 0 1.8-1.3 2.5-2.5.4-.7.7-1.6 1-2.5-.1 0-2.4-.9-2.4-3.4M9.4 3.5c.5-.7.9-1.7.8-2.6-.8 0-1.7.5-2.3 1.2C7.4 2.7 6.9 3.7 7 4.6c.9.1 1.9-.4 2.4-1.1Z"/>
            </svg>
            {loading === 'apple' ? 'Conectando…' : 'Continuar con Apple'}
          </button>

          {/* Google Sign In */}
          <button
            onClick={handleGoogle}
            disabled={!!loading}
            aria-label="Continuar con Google"
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: loading ? 'wait' : 'pointer',
              width: '100%', height: 50,
              padding: '0 18px',
              borderRadius: 14,
              border: '0.5px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--ink-1)',
              fontSize: 14.5, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              marginBottom: 22,
              opacity: loading && loading !== 'google' ? 0.5 : 1,
              transition: 'opacity .2s',
            }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8c-.2 1.1-.8 2-1.8 2.6v2.2h2.9c1.7-1.5 2.7-3.8 2.7-6.4Z" fill="#4285f4"/>
              <path d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 16 5.4 18 9 18Z" fill="#34a853"/>
              <path d="M3.9 10.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V5H.9C.3 6.2 0 7.6 0 9s.3 2.8.9 4l3-2.3Z" fill="#fbbc05"/>
              <path d="M9 3.6c1.3 0 2.5.4 3.5 1.3l2.6-2.6C13.5.9 11.4 0 9 0 5.4 0 2.4 2 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6Z" fill="#ea4335"/>
            </svg>
            {loading === 'google' ? 'Conectando…' : 'Continuar con Google'}
          </button>

          {/* Separator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 18,
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }}/>
            <div style={{
              fontSize: 11, color: 'var(--ink-4)',
              letterSpacing: '0.06em',
              fontFamily: 'var(--ff-sans)',
              fontWeight: 600,
            }}>O CON EMAIL</div>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }}/>
          </div>

          {/* Email input + CTA continue */}
          <input
            ref={inputRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={function(e) { setEmail(e.target.value); setError(null); }}
            onKeyDown={onKey}
            placeholder="tu@email.com"
            disabled={!!loading}
            style={{
              appearance: 'none', WebkitAppearance: 'none',
              width: '100%', height: 50,
              boxSizing: 'border-box',
              padding: '0 16px',
              borderRadius: 14,
              border: '0.5px solid ' + (error ? 'rgba(255,107,107,0.40)' : 'rgba(255,255,255,0.10)'),
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--ink-1)',
              fontSize: 14.5, fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              outline: 'none',
              colorScheme: 'dark',
              transition: 'border-color .2s, background .2s',
              marginBottom: 10,
            }}
          />
          {error && (
            <div style={{
              fontSize: 12, color: 'rgba(255,140,140,0.95)',
              fontFamily: 'var(--ff-sans)',
              marginBottom: 10,
              padding: '0 4px',
            }}>{error}</div>
          )}
          <button
            onClick={handleEmailContinue}
            disabled={!!loading}
            aria-label="Enviar código al email"
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: loading ? 'wait' : 'pointer',
              width: '100%', height: 50,
              padding: '0 18px',
              borderRadius: 14,
              border: '0.5px solid rgba(61,255,209,0.40)',
              background: 'linear-gradient(180deg, rgba(61,255,209,0.20), rgba(61,255,209,0.08))',
              color: 'var(--neon)',
              fontSize: 14.5, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              boxShadow: '0 0 0 1px rgba(61,255,209,0.16), inset 0 0 14px rgba(61,255,209,0.08)',
              opacity: loading && loading !== 'email' ? 0.5 : 1,
              transition: 'opacity .2s',
            }}>{loading === 'email' ? 'Enviando código…' : 'Enviar código'}</button>

          {/* Footer legal links */}
          <div style={{ flex: 1 }}/>
          <div style={{
            padding: '20px 0 8px',
            textAlign: 'center',
            fontSize: 11, color: 'var(--ink-4)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
          }}>
            Al continuar aceptas nuestros{' '}
            <a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>Términos</a>
            {' '}y la{' '}
            <a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>Política de privacidad</a>.
          </div>
        </div>
      </div>
    );
  }


  // ── AuthOTPScreen — 6-digit OTP con autofocus + paste-friendly ────────────
  function AuthOTPScreen(props) {
    var email = props.email || '';
    var digitsState = React.useState(['', '', '', '', '', '']);
    var digits = digitsState[0]; var setDigits = digitsState[1];
    var loadingState = React.useState(false);
    var loading = loadingState[0]; var setLoading = loadingState[1];
    var errorState = React.useState(null);
    var error = errorState[0]; var setError = errorState[1];
    var attemptsState = React.useState(0);
    var attempts = attemptsState[0]; var setAttempts = attemptsState[1];
    var resendCooldownState = React.useState(30);
    var resendCooldown = resendCooldownState[0]; var setResendCooldown = resendCooldownState[1];
    var inputs = React.useRef([null, null, null, null, null, null]);

    // Autofocus primer input
    React.useEffect(function() {
      var t = setTimeout(function() {
        if (inputs.current[0]) inputs.current[0].focus();
      }, 220);
      return function() { clearTimeout(t); };
    }, []);

    // Resend cooldown countdown
    React.useEffect(function() {
      if (resendCooldown <= 0) return;
      var t = setTimeout(function() { setResendCooldown(resendCooldown - 1); }, 1000);
      return function() { clearTimeout(t); };
    }, [resendCooldown]);

    var verify = function(fullOtp) {
      setLoading(true);
      setError(null);
      window.__mtxAuth.verifyOTP(fullOtp).then(function(res) {
        setLoading(false);
        if (res.error === 'wrong_otp') {
          setAttempts(function(n) { return n + 1; });
          setError('Código incorrecto. Intenta de nuevo.');
          // Shake animation: limpiar inputs después de 600ms para que el user
          // pueda tipear de nuevo sin tener que borrar manualmente.
          setTimeout(function() {
            setDigits(['', '', '', '', '', '']);
            if (inputs.current[0]) inputs.current[0].focus();
          }, 600);
          return;
        }
        if (res.ok) {
          // El effect de auth en MentexApp navega automáticamente
        }
      });
    };

    var handleChange = function(i, val) {
      // Permitir paste de 6 dígitos en cualquier input (auto-distribuye)
      if (val.length > 1) {
        var pasted = val.replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 0) return;
        var next = ['', '', '', '', '', ''];
        for (var k = 0; k < pasted.length; k++) next[k] = pasted[k];
        setDigits(next);
        var nextFocus = Math.min(pasted.length, 5);
        if (inputs.current[nextFocus]) inputs.current[nextFocus].focus();
        if (pasted.length === 6) verify(pasted);
        return;
      }
      // Single char
      if (!/^\d?$/.test(val)) return;
      var copy = digits.slice();
      copy[i] = val;
      setDigits(copy);
      setError(null);
      // Auto-advance al siguiente
      if (val && i < 5 && inputs.current[i + 1]) {
        inputs.current[i + 1].focus();
      }
      // Auto-verify al completar el 6to
      if (val && i === 5) {
        var fullOtp = copy.join('');
        if (fullOtp.length === 6) verify(fullOtp);
      }
    };

    var handleKeyDown = function(i, e) {
      if (e.key === 'Backspace' && !digits[i] && i > 0) {
        var copy = digits.slice();
        copy[i - 1] = '';
        setDigits(copy);
        if (inputs.current[i - 1]) inputs.current[i - 1].focus();
      }
    };

    var handleResend = function() {
      if (resendCooldown > 0) return;
      window.__mtxAuth.resendOTP().then(function() {
        setResendCooldown(30);
        setError(null);
      });
    };

    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        overflow: 'hidden',
        animation: 'mtx-fade-in .35s ease',
      }}>
        <MeshGradientBackground/>

        {/* Header back */}
        <div style={{
          position: 'absolute', top: 60, left: 0, right: 0,
          padding: '0 16px',
          display: 'flex', alignItems: 'center',
          zIndex: 3,
        }}>
          <button
            onClick={props.onBack}
            aria-label="Volver"
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              width: 36, height: 36, borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'var(--ink-1)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <IcChevL size={15} stroke="currentColor" strokeWidth={1.9}/>
          </button>
        </div>

        {/* Body */}
        <div style={{
          position: 'absolute',
          top: 130, left: 0, right: 0, bottom: 32,
          padding: '0 28px',
          zIndex: 3,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 9.5, color: 'var(--neon)',
              letterSpacing: '0.16em', textTransform: 'uppercase',
              fontWeight: 600, marginBottom: 6,
              fontFamily: 'var(--ff-sans)',
            }}>VERIFICACIÓN</div>
            <h1 style={{
              margin: 0,
              fontSize: 24, fontWeight: 700,
              color: 'var(--ink-1)',
              letterSpacing: '-0.025em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              lineHeight: 1.2,
            }}>Te enviamos un código</h1>
            <p style={{
              margin: '8px 0 0',
              fontSize: 13.5, color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              lineHeight: 1.5,
            }}>
              Revisa <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>{email}</span>{' '}
              y escribe los 6 dígitos.
            </p>
            <div style={{
              marginTop: 6,
              fontSize: 11, color: 'var(--ink-4)',
              fontFamily: 'var(--ff-sans)',
            }}>(Demo: usa <span style={{ color: 'var(--neon)', fontWeight: 600 }}>123456</span>)</div>
          </div>

          {/* OTP boxes */}
          <div style={{
            display: 'flex', gap: 8,
            marginBottom: 16,
            justifyContent: 'space-between',
            animation: error ? 'mtx-shake .42s ease' : 'none',
          }}>
            {digits.map(function(d, i) {
              return (
                <input
                  key={i}
                  ref={function(el) { inputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={i === 0 ? 6 : 1}
                  value={d}
                  onChange={function(e) { handleChange(i, e.target.value); }}
                  onKeyDown={function(e) { handleKeyDown(i, e); }}
                  disabled={loading}
                  style={{
                    appearance: 'none', WebkitAppearance: 'none',
                    width: 'calc((100% - 40px) / 6)', height: 56,
                    boxSizing: 'border-box',
                    padding: 0,
                    borderRadius: 12,
                    border: '0.5px solid ' + (error ? 'rgba(255,107,107,0.40)' : (d ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.10)')),
                    background: d ? 'rgba(61,255,209,0.06)' : 'rgba(255,255,255,0.03)',
                    color: 'var(--ink-1)',
                    fontSize: 22, fontWeight: 700,
                    fontFamily: 'var(--ff-display, var(--ff-sans))',
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'center',
                    outline: 'none',
                    transition: 'border-color .2s, background .2s',
                  }}
                />
              );
            })}
          </div>

          {error && (
            <div style={{
              fontSize: 12, color: 'rgba(255,140,140,0.95)',
              fontFamily: 'var(--ff-sans)',
              marginBottom: 16, textAlign: 'center',
            }}>{error}</div>
          )}

          {loading && (
            <div style={{
              fontSize: 12, color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              marginBottom: 16, textAlign: 'center',
            }}>Verificando…</div>
          )}

          {/* Resend */}
          <div style={{
            textAlign: 'center',
            fontSize: 12.5, color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
          }}>
            ¿No te llega?{' '}
            {resendCooldown > 0 ? (
              <span style={{ color: 'var(--ink-4)' }}>Reenviar en {resendCooldown}s</span>
            ) : (
              <button
                onClick={handleResend}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  border: 0, background: 'transparent',
                  color: 'var(--neon)',
                  fontSize: 12.5, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                  padding: 0,
                }}>Reenviar código</button>
            )}
          </div>

          <div style={{ flex: 1 }}/>
        </div>
      </div>
    );
  }


  // ── Export al window ──────────────────────────────────────────────────────
  Object.assign(window, {
    AUTH_VIEWS: AUTH_VIEWS,
    useAuth: useAuth,
    useOnboarding: useOnboarding,
    getInitialAuthView: getInitialAuthView,
    SplashScreen: SplashScreen,
    WelcomeScreen: WelcomeScreen,
    AuthScreen: AuthScreen,
    AuthOTPScreen: AuthOTPScreen,
    MentexZenIcon: MentexZenIcon,
  });

})();
