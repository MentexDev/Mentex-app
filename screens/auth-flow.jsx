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


  // ── Placeholders para screens futuras (Phase 1+) ──────────────────────────
  // Por ahora son componentes minimales que el MentexApp puede mountar mientras
  // implementamos cada fase. Cada uno acepta props consistent: { onNext, onBack }.
  function SplashScreen(props) {
    // Auto-progreso a welcome tras 800ms (placeholder behavior)
    React.useEffect(function() {
      var t = setTimeout(function() {
        if (props.onNext) props.onNext();
      }, 800);
      return function() { clearTimeout(t); };
    }, []);
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(60% 80% at 50% 50%, rgba(61,255,209,0.10), transparent 70%), #0a0d0a',
        animation: 'mtx-fade-in .3s ease',
      }}>
        <div style={{
          fontSize: 28, fontWeight: 700, color: 'var(--ink-1)',
          letterSpacing: '-0.02em',
          fontFamily: 'var(--ff-display, var(--ff-sans))',
        }}>Mentex</div>
      </div>
    );
  }

  function WelcomeScreenPlaceholder(props) {
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#0a0d0a',
        padding: 40,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 9.5, color: 'var(--neon)', letterSpacing: '0.16em', marginBottom: 12 }}>PHASE 1 PLACEHOLDER</div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 16 }}>Mentex</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24, maxWidth: 280 }}>
          Welcome screen real llega en Phase 1. Por ahora, simula auth para testear smart routing.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 220 }}>
          <button
            onClick={function() { if (props.onMockAuth) props.onMockAuth({ email: 'test@mentex.app', isReturning: false }); }}
            className="mtx-tap"
            style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'linear-gradient(180deg, rgba(61,255,209,0.20), rgba(61,255,209,0.08))',
              border: '0.5px solid rgba(61,255,209,0.40)',
              color: 'var(--neon)', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 700,
            }}>Sign up nuevo (test)</button>
          <button
            onClick={function() { if (props.onMockAuth) props.onMockAuth({ email: 'existing@mentex.app', isReturning: true }); }}
            className="mtx-tap"
            style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.10)',
              color: 'var(--ink-1)', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 600,
            }}>Returning user (test)</button>
        </div>
      </div>
    );
  }

  function OnboardingScreenPlaceholder(props) {
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#0a0d0a',
        padding: 40, textAlign: 'center',
      }}>
        <div style={{ fontSize: 9.5, color: 'var(--neon)', letterSpacing: '0.16em', marginBottom: 12 }}>PHASE 3 PLACEHOLDER</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 16 }}>Onboarding</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24, maxWidth: 280 }}>
          8-step onboarding real llega en Phase 3. Por ahora, completa para testear drop al app.
        </p>
        <button
          onClick={function() {
            if (window.__mtxOnboarding) {
              window.__mtxOnboarding.updateAnswers({ name: 'Juan', timeMin: 30 });
              window.__mtxOnboarding.complete();
            }
          }}
          className="mtx-tap"
          style={{
            padding: '12px 20px', borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(61,255,209,0.20), rgba(61,255,209,0.08))',
            border: '0.5px solid rgba(61,255,209,0.40)',
            color: 'var(--neon)', cursor: 'pointer',
            fontSize: 13.5, fontWeight: 700,
          }}>Completar (test)</button>
      </div>
    );
  }


  // ── Export al window ──────────────────────────────────────────────────────
  Object.assign(window, {
    AUTH_VIEWS: AUTH_VIEWS,
    useAuth: useAuth,
    useOnboarding: useOnboarding,
    getInitialAuthView: getInitialAuthView,
    // Placeholders Phase 1/3 — serán reemplazados por componentes reales
    SplashScreen: SplashScreen,
    WelcomeScreenPlaceholder: WelcomeScreenPlaceholder,
    OnboardingScreenPlaceholder: OnboardingScreenPlaceholder,
  });

})();
