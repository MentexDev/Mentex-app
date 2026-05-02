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
    AUTH: 'auth',                      // unified screen con tabs sign-in/sign-up + Apple/Google
    AUTH_OTP: 'auth-otp',              // OTP para email magic link (futuro/legacy)
    FORGOT_EMAIL: 'forgot-email',      // forgot password step 1
    FORGOT_OTP: 'forgot-otp',          // forgot password step 2
    FORGOT_NEW_PASSWORD: 'forgot-new', // forgot password step 3
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

      // ── Email/password flow (sign in tradicional) ──────────────────────
      // Mock validation:
      //   • Cualquier email contiene 'existing@' / 'returning@' / 'demo@'
      //     → returning user. Password "password123" o "demo1234" valida.
      //   • Otros emails → "credentials_invalid" (no registered)
      //   • Password incorrecto en 5 intentos → "account_locked" mock
      //   • Phase 2+ reemplaza con backend real (Supabase password auth /
      //     Clerk / Auth.js).
      signInWithPassword: function(email, password) {
        return _mockNetworkDelay(700, 1300).then(function() {
          var trimmed = (email || '').trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            return { error: 'invalid_email' };
          }
          if (!password || password.length < 6) {
            return { error: 'password_too_short' };
          }
          var userType = _detectMockUserType(trimmed);
          if (userType === 'new') {
            // Email no registered en sistema mock
            return { error: 'no_account' };
          }
          // Validar password mock — para returning/demo users:
          var validPasswords = userType === 'demo' ? ['demo1234'] : ['password123', 'mentex123'];
          if (validPasswords.indexOf(password) === -1) {
            return { error: 'wrong_password' };
          }
          var user;
          if (userType === 'demo') {
            user = {
              id: 'demo-user',
              email: trimmed,
              name: 'Demo',
              provider: 'password',
              createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
              onboardingCompleted: true,
              lastActiveAt: Date.now(),
            };
          } else {
            user = {
              id: _genId('user'),
              email: trimmed,
              name: trimmed.split('@')[0],
              provider: 'password',
              createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
              onboardingCompleted: true,
              lastActiveAt: Date.now(),
            };
          }
          _setState({
            user: user,
            isAuthenticated: true,
            pendingEmail: null,
            pendingUserType: null,
          });
          return { ok: true, user: user, isReturning: true };
        });
      },

      // Sign up con email + password
      signUpWithPassword: function(email, password) {
        return _mockNetworkDelay(800, 1400).then(function() {
          var trimmed = (email || '').trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            return { error: 'invalid_email' };
          }
          if (!password || password.length < 6) {
            return { error: 'password_too_short' };
          }
          var userType = _detectMockUserType(trimmed);
          if (userType === 'returning' || userType === 'demo') {
            // Email ya registrado en sistema mock
            return { error: 'email_taken' };
          }
          var user = {
            id: _genId('user'),
            email: trimmed,
            name: null, // se setea en onboarding
            provider: 'password',
            createdAt: Date.now(),
            onboardingCompleted: false,
            lastActiveAt: Date.now(),
          };
          _setState({
            user: user,
            isAuthenticated: true,
            pendingEmail: null,
            pendingUserType: null,
          });
          return { ok: true, user: user, isReturning: false };
        });
      },

      // ── Forgot password flow ───────────────────────────────────────────
      // 3 pasos:
      //   1. requestPasswordReset(email) → manda OTP al email
      //   2. verifyResetOTP(otp) → valida 123456
      //   3. resetPassword(newPassword) → setea nueva password + auto-login
      requestPasswordReset: function(email) {
        return _mockNetworkDelay(700, 1200).then(function() {
          var trimmed = (email || '').trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            return { error: 'invalid_email' };
          }
          // Por seguridad, NO revelar si el email existe o no — siempre
          // retornar OK aunque no esté registrado. Estándar wellness apps.
          _setState({ resetEmail: trimmed });
          return { ok: true };
        });
      },

      verifyResetOTP: function(otp) {
        return _mockNetworkDelay(600, 1000).then(function() {
          if (otp !== '123456') {
            return { error: 'wrong_otp' };
          }
          _setState({ resetVerified: true });
          return { ok: true };
        });
      },

      resetPassword: function(newPassword) {
        return _mockNetworkDelay(700, 1200).then(function() {
          if (!newPassword || newPassword.length < 6) {
            return { error: 'password_too_short' };
          }
          if (!_state.resetEmail || !_state.resetVerified) {
            return { error: 'flow_not_started' };
          }
          // Auto-login después del reset (UX standard)
          var user = {
            id: _genId('user'),
            email: _state.resetEmail,
            name: _state.resetEmail.split('@')[0],
            provider: 'password',
            createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
            onboardingCompleted: true,
            lastActiveAt: Date.now(),
          };
          _setState({
            user: user,
            isAuthenticated: true,
            resetEmail: null,
            resetVerified: false,
          });
          return { ok: true, user: user };
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

      // Dev-only: inyecta sincrónicamente un user "nuevo" (sin onboarding)
      // sin pasar por signUpWithPassword. Útil para acceder al onboarding
      // desde el Tweaks Panel sin esperar el mock network delay.
      _devCreateOnboardingUser: function() {
        var fake = {
          id: 'dev-onboarding-' + Date.now(),
          email: 'dev-onboarding@mentex.app',
          name: null,
          provider: 'dev',
          createdAt: Date.now(),
          onboardingCompleted: false,
          lastActiveAt: Date.now(),
        };
        _setState({
          user: fake,
          isAuthenticated: true,
          pendingEmail: null,
          pendingUserType: null,
        });
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

  // Defaults centralizados — usados por load merge + reset.
  var _OB_DEFAULTS = {
    // Step 1 — Identidad (preconfigura __mtxProfile)
    name: '',
    username: '',
    tagline: '',
    bio: '',
    // Step 2 — Intención (multi-select)
    goals: [],                  // ['productivity','rest','learn',...]
    // Step 3 — Baseline screen time
    baselineHours: 6,           // 1..12 (slider)
    // Step 4 — Distractores
    blockedApps: [],            // ['ig','tt','yt',...]
    // Step 5 — Energía / contenido preferido
    contentPrefs: [],           // ['books','meditations','biographies','talks','sounds']
    // Step 6 — Duración de rutina diaria (en horas, no minutos — Mentex no
    //          es Pomodoro, es rutina sostenida en el día)
    routineHours: 2,            // 1|2|3|6|12
    // Step 7 — Hora dorada (cuándo arranca la rutina)
    focusTime: null,            // 'morning'|'afternoon'|'evening'|'variable'
    // Step 8 — Voz del coach
    coachVoice: null,           // 'warm'|'contemplative'|'energetic'|'wise'
    // Step 10 — Notificaciones (multi-select de 5 tipos, default todas ON)
    notifications: {
      session: true,
      coach: true,
      milestones: true,
      breaks: true,
      content: true,
    },
    // Compat con onboarding legacy (no usados en Phase 3 nueva, pero preservados
    // por si algún consumer los lee — se quitan en cleanup futuro)
    goal: null, experience: null, timeMin: 15, timeOfDay: null,
    blockApps: null, commit7d: true, notificationsEnabled: null,
    sessionMin: 25,             // legacy: antes era el "bloque" tipo Pomodoro
  };

  // Helper: merge answers garantizando shape de objetos anidados (ej: notifications)
  function _mergeAnswers(base, patch) {
    var merged = Object.assign({}, base, patch || {});
    // Deep-merge para notifications (5 keys obligatorias)
    merged.notifications = Object.assign({}, base.notifications, (patch && patch.notifications) || {});
    return merged;
  }

  if (typeof window !== 'undefined' && !window.__mtxOnboarding) {
    var storedOb = _loadOnboardingFromStorage();
    var _obState = storedOb
      ? {
          step: typeof storedOb.step === 'number' ? storedOb.step : 0,
          // Merge: defaults < stored. Garantiza que un user con state vieja
          // del placeholder no rompa cuando arranque el onboarding nuevo,
          // y que notifications siempre tenga las 5 keys.
          answers: _mergeAnswers(_OB_DEFAULTS, storedOb.answers || {}),
          completed: !!storedOb.completed,
          startedAt: storedOb.startedAt || null,
        }
      : {
          step: 0,
          answers: _mergeAnswers(_OB_DEFAULTS, null),
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

      // Update parcial de answers (deep-merge para objetos anidados como notifications)
      updateAnswers: function(patch) {
        var next = _mergeAnswers(_obState.answers, patch);
        _setObState({ answers: next });
      },

      // Marca completado y dispara completion en __mtxAuth.
      // También pre-configura __mtxProfile con los datos identitarios del Step 1
      // (nombre, username, tagline, bio) para que el user llegue al app con
      // su perfil ya armado — no en blanco.
      complete: function() {
        _setObState({ completed: true });
        var ans = _obState.answers || {};
        if (window.__mtxProfile && typeof window.__mtxProfile.update === 'function') {
          var profilePatch = {};
          if (ans.name && ans.name.trim())       profilePatch.name = ans.name.trim();
          if (ans.username && ans.username.trim()) {
            var uname = ans.username.trim();
            profilePatch.handle = uname.charAt(0) === '@' ? uname : ('@' + uname);
          }
          if (ans.tagline && ans.tagline.trim()) profilePatch.tagline = ans.tagline.trim();
          if (ans.bio && ans.bio.trim())         profilePatch.bio = ans.bio.trim();
          if (ans.name && ans.name.trim())       profilePatch.initial = ans.name.trim().charAt(0).toUpperCase();
          if (Object.keys(profilePatch).length) {
            try { window.__mtxProfile.update(profilePatch); } catch (_) {}
          }
        }
        if (window.__mtxAuth) {
          window.__mtxAuth.completeOnboarding(_obState.answers);
        }
      },

      // Reset para re-onboarding (Phase 6)
      reset: function() {
        _obState = {
          step: 0,
          answers: _mergeAnswers(_OB_DEFAULTS, null),
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
          answers: _mergeAnswers(_OB_DEFAULTS, null),
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
  // Particles con animation-delay y duration variados para drift orgánico.
  // Solo transform/opacity. Posiciones aleatorias generadas una vez (useMemo).
  // Speed: 6-12s duration (antes era 14-28s, se sentía estático).
  function ParticleField(props) {
    var count = props.count || 36;
    var particles = React.useMemo(function() {
      var arr = [];
      for (var i = 0; i < count; i++) {
        arr.push({
          left: Math.random() * 100,
          top: Math.random() * 100,
          size: 1.5 + Math.random() * 2.5,
          duration: 6 + Math.random() * 6,
          delay: Math.random() * -12,
          opacity: 0.25 + Math.random() * 0.45,
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


  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1 round 3 · Mini-mockups visuales de partes reales de la app
  // ═══════════════════════════════════════════════════════════════════════════
  // En lugar de glyphs abstractos, cada slide muestra un PREVIEW estilizado
  // de una feature real de Mentex. El user ve EXACTAMENTE lo que va a usar.
  // Cada mockup tiene un wrapper consistente: card glass de ~280×340px con
  // contenido temático que evoca el feature real sin re-implementarlo entero.
  //
  // Animation pattern: cada mockup tiene un detalle "vivo" (timer pulsando,
  // mensaje typing, chip rotating) para que se sienta dinámico, no estático.

  // Hero card: contenedor glass común que TODOS los mockups usan.
  // Tamaño 340×460 — más grande/llamativo según feedback iterado.
  function HeroCard(props) {
    return (
      <div style={{
        position: 'relative',
        width: 340, height: 460,
        borderRadius: 32,
        background: 'linear-gradient(180deg, rgba(20,24,22,0.85), rgba(8,12,10,0.92))',
        border: '0.5px solid rgba(255,255,255,0.08)',
        boxShadow: '0 28px 70px -24px rgba(0,0,0,0.7), inset 0 0 0 0.5px rgba(255,255,255,0.04)',
        overflow: 'hidden',
        padding: 24,
        display: 'flex', flexDirection: 'column',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }}>
        {/* Halo radial sutil interior */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '60%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(61,255,209,0.12), transparent 70%)',
          pointerEvents: 'none',
        }}/>
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {props.children}
        </div>
      </div>
    );
  }

  // ── HeroMockup1: HomeActive — Timer + Apps protegidas ─────────────────────
  function HeroMockupHome() {
    return (
      <HeroCard>
        {/* Header del card mockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <div style={{
            width: 6, height: 6, borderRadius: 999,
            background: 'var(--neon)',
            boxShadow: '0 0 8px rgba(61,255,209,0.8)',
            animation: 'mtx-pulse 2s ease-in-out infinite',
          }}/>
          <div style={{
            fontSize: 9, color: 'var(--neon)',
            letterSpacing: '0.16em', fontWeight: 700,
            fontFamily: 'var(--ff-sans)',
          }}>SESIÓN ACTIVA</div>
        </div>
        {/* Timer circular */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          marginBottom: 14,
        }}>
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="hm-t" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#6affd9"/>
                  <stop offset="1" stopColor="#1ad9ad"/>
                </linearGradient>
              </defs>
              <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
              <circle cx="70" cy="70" r="60" fill="none"
                stroke="url(#hm-t)" strokeWidth="3.5" strokeLinecap="round"
                strokeDasharray={377} strokeDashoffset={377 * 0.35}
                style={{ filter: 'drop-shadow(0 0 6px rgba(61,255,209,0.5))' }}/>
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                fontSize: 8, fontWeight: 700, color: 'var(--neon)',
                letterSpacing: '0.16em', marginBottom: 2,
                fontFamily: 'var(--ff-sans)',
              }}>RECUPERASTE</div>
              <div style={{
                fontSize: 32, fontWeight: 700, color: 'var(--ink-1)',
                letterSpacing: '-0.02em',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                fontVariantNumeric: 'tabular-nums',
              }}>17:23</div>
              <div style={{
                fontSize: 9, color: 'var(--ink-4)',
                fontFamily: 'var(--ff-sans)',
                marginTop: 2,
              }}>quedan 12:37</div>
            </div>
          </div>
        </div>
        {/* Apps bloqueadas chips */}
        <div style={{
          fontSize: 8.5, color: 'var(--ink-4)',
          letterSpacing: '0.14em', fontWeight: 700,
          fontFamily: 'var(--ff-sans)',
          marginBottom: 6,
        }}>APPS BLOQUEADAS</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {[
            { name: 'Instagram', color: '#E1306C' },
            { name: 'TikTok', color: '#000' },
            { name: 'X', color: '#000' },
          ].map((app, i) => (
            <div key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              fontSize: 9.5, color: 'var(--ink-2)',
              fontFamily: 'var(--ff-sans)', fontWeight: 500,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: app.color }}/>
              {app.name}
              <IcLock size={8} stroke="var(--neon)" strokeWidth={1.8}/>
            </div>
          ))}
        </div>
      </HeroCard>
    );
  }

  // ── HeroMockup2: Chat IA con coach + chips ────────────────────────────────
  function HeroMockupChat() {
    return (
      <HeroCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 999,
            background: 'linear-gradient(135deg, rgba(61,255,209,0.22), rgba(155,138,255,0.10))',
            border: '0.5px solid rgba(61,255,209,0.30)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>🌿</div>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--ink-1)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>Coach Mentex</div>
            <div style={{
              fontSize: 9, color: 'var(--neon)',
              fontFamily: 'var(--ff-sans)',
            }}>· en línea</div>
          </div>
        </div>
        {/* Mensaje user */}
        <div style={{
          alignSelf: 'flex-end',
          maxWidth: '85%',
          padding: '8px 12px', borderRadius: 14,
          borderBottomRightRadius: 4,
          background: 'linear-gradient(135deg, rgba(61,255,209,0.08), rgba(61,255,209,0.03))',
          border: '0.5px solid rgba(61,255,209,0.16)',
          color: 'var(--ink-1)',
          fontSize: 11, lineHeight: 1.4,
          fontFamily: 'var(--ff-sans)',
          marginBottom: 8,
        }}>Tengo dificultad para concentrarme</div>
        {/* Mensaje assistant */}
        <div style={{
          alignSelf: 'flex-start',
          maxWidth: '90%',
          padding: '8px 12px', borderRadius: 14,
          borderBottomLeftRadius: 4,
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          color: 'var(--ink-1)',
          fontSize: 11, lineHeight: 1.45,
          fontFamily: 'var(--ff-sans)',
          marginBottom: 10,
        }}>Empecemos con un paso pequeño. Cierra los ojos 30 segundos y escucha tu respiración.</div>
        {/* Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 'auto' }}>
          {['Sugerir ritual', 'Extender tiempo'].map((c, i) => (
            <div key={i} style={{
              padding: '4px 10px', borderRadius: 999,
              border: '0.5px solid rgba(61,255,209,0.22)',
              background: 'rgba(61,255,209,0.04)',
              color: 'var(--neon)',
              fontSize: 9.5, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
            }}>{c}</div>
          ))}
        </div>
      </HeroCard>
    );
  }

  // ── HeroMockup3: Ritual del día ───────────────────────────────────────────
  function HeroMockupRitual() {
    var items = [
      { eyebrow: 'MEDITACIÓN', title: 'Respira y vuelve a ti', dur: '10 min', icon: '🌿' },
      { eyebrow: 'GRATITUD', title: 'Escribe tu gratitud', dur: '3 veces', icon: '💚' },
      { eyebrow: 'CARDIO', title: 'Caminata del día', dur: '3 km', icon: '🎯' },
      { eyebrow: 'HÁBITO', title: 'Tomé mis suplementos', dur: 'Hecho', icon: '☀' },
    ];
    return (
      <HeroCard>
        <div style={{ marginBottom: 10 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: 'var(--ink-1)',
            letterSpacing: '-0.015em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
          }}>Tu ritual de hoy</div>
          <div style={{
            fontSize: 10, color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)', marginTop: 2,
          }}>1 de 4 completadas</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          {items.map((it, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 9px',
              borderRadius: 10,
              background: i === 0 ? 'rgba(61,255,209,0.06)' : 'rgba(255,255,255,0.03)',
              border: '0.5px solid ' + (i === 0 ? 'rgba(61,255,209,0.20)' : 'rgba(255,255,255,0.05)'),
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13,
                flexShrink: 0,
              }}>{it.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 7.5, color: 'var(--ink-4)',
                  letterSpacing: '0.14em', fontWeight: 700,
                  fontFamily: 'var(--ff-sans)',
                }}>{it.eyebrow}</div>
                <div style={{
                  fontSize: 10.5, color: 'var(--ink-1)', fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{it.title}</div>
                <div style={{
                  fontSize: 9, color: 'var(--ink-4)',
                  fontFamily: 'var(--ff-sans)',
                }}>{it.dur}</div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: 999,
                background: i === 0 ? 'var(--neon)' : 'rgba(255,255,255,0.05)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: i === 0 ? '#0a1410' : 'var(--ink-3)',
                flexShrink: 0,
              }}>
                {i === 0 ? <IcCheck size={11} stroke="currentColor" strokeWidth={3}/> : <IcPlay size={9} stroke="currentColor" strokeWidth={2}/>}
              </div>
            </div>
          ))}
        </div>
      </HeroCard>
    );
  }

  // ── HeroMockup4: Biblioteca de contenidos — miles disponibles ─────────────
  // Grid 2-col de cards con cover + categoría + duración. Muestra la
  // diversidad y volumen del catálogo para vender el valor "miles de
  // contenidos a tu disposición".
  function HeroMockupContent() {
    var items = [
      { eyebrow: 'CHARLA',     title: 'Steve Jobs · Stanford', meta: '15 min', accent: '#FFB347', emoji: '🎙' },
      { eyebrow: 'MEDITACIÓN', title: 'Respira y vuelve a ti', meta: '10 min', accent: '#3DFFD1', emoji: '🌿' },
      { eyebrow: 'LECTURA',    title: 'Atomic Habits · cap 1', meta: '20 pp',  accent: '#9DB7FF', emoji: '📖' },
      { eyebrow: 'AUDIO',      title: 'Foco profundo · α',    meta: '45 min', accent: '#9b8aff', emoji: '🎵' },
    ];
    return (
      <HeroCard>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{
              fontSize: 9, color: 'var(--ink-4)',
              letterSpacing: '0.14em', fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              marginBottom: 2,
            }}>EXPLORAR</div>
            <div style={{
              fontSize: 17, fontWeight: 700, color: 'var(--ink-1)',
              letterSpacing: '-0.02em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
            }}>Tu biblioteca</div>
          </div>
          <div style={{
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(61,255,209,0.06)',
            border: '0.5px solid rgba(61,255,209,0.20)',
            color: 'var(--neon)',
            fontSize: 9.5, fontWeight: 700,
            fontFamily: 'var(--ff-sans)',
            fontVariantNumeric: 'tabular-nums',
          }}>2,400+</div>
        </div>

        {/* Grid 2-col de content cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          flex: 1,
        }}>
          {items.map(function(it, i) {
            return (
              <div key={i} style={{
                position: 'relative',
                borderRadius: 12,
                background: 'linear-gradient(135deg, ' + it.accent + '22, ' + it.accent + '08)',
                border: '0.5px solid ' + it.accent + '30',
                padding: 10,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                overflow: 'hidden',
                minHeight: 90,
              }}>
                {/* Halo decorativo */}
                <div style={{
                  position: 'absolute', top: -20, right: -20,
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'radial-gradient(circle, ' + it.accent + '40, transparent 70%)',
                  pointerEvents: 'none',
                }}/>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 18, lineHeight: 1 }}>{it.emoji}</div>
                  <div style={{
                    fontSize: 7, fontWeight: 700,
                    color: it.accent,
                    letterSpacing: '0.14em',
                    fontFamily: 'var(--ff-sans)',
                  }}>{it.eyebrow}</div>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--ink-1)',
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                    lineHeight: 1.2,
                    marginBottom: 3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>{it.title}</div>
                  <div style={{
                    fontSize: 8.5, color: 'var(--ink-4)',
                    fontFamily: 'var(--ff-sans)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{it.meta}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer chips de categorías */}
        <div style={{
          marginTop: 10,
          display: 'flex', flexWrap: 'wrap', gap: 4,
        }}>
          {['+ Series', '+ Sonidos', '+ Audiolibros', '+ Cursos'].map(function(c, i) {
            return (
              <div key={i} style={{
                padding: '3px 8px', borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                color: 'var(--ink-3)',
                fontSize: 8.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
              }}>{c}</div>
            );
          })}
        </div>
      </HeroCard>
    );
  }

  // ── HeroMockup5: Progreso + Comunidad ─────────────────────────────────────
  function HeroMockupProgress() {
    return (
      <HeroCard>
        <div style={{ marginBottom: 10 }}>
          <div style={{
            fontSize: 8.5, color: 'var(--ink-4)',
            letterSpacing: '0.14em', fontWeight: 700,
            fontFamily: 'var(--ff-sans)', marginBottom: 2,
          }}>ESTA SEMANA</div>
          <div style={{
            fontSize: 14, fontWeight: 700, color: 'var(--ink-1)',
            letterSpacing: '-0.015em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
          }}>Tu progreso</div>
        </div>
        {/* Big stat: minutos enfocados */}
        <div style={{
          padding: '12px 14px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(61,255,209,0.10), rgba(61,255,209,0.02))',
          border: '0.5px solid rgba(61,255,209,0.18)',
          marginBottom: 10,
        }}>
          <div style={{
            fontSize: 9, color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '0.06em',
            marginBottom: 2,
          }}>Minutos enfocados</div>
          <div style={{
            fontSize: 30, fontWeight: 700,
            color: 'var(--neon)',
            letterSpacing: '-0.025em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
            fontVariantNumeric: 'tabular-nums',
            textShadow: '0 0 18px rgba(61,255,209,0.4)',
            lineHeight: 1.05,
          }}>847</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginTop: 4,
            fontSize: 10, color: '#3DFFD1',
            fontFamily: 'var(--ff-sans)', fontWeight: 600,
          }}>
            <span>↑ 23%</span>
            <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>vs semana pasada</span>
          </div>
        </div>
        {/* Mini sparkline */}
        <div style={{
          height: 50,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 10,
          padding: 8,
          display: 'flex', alignItems: 'flex-end', gap: 4,
        }}>
          {[40, 65, 50, 80, 70, 90, 95].map((h, i) => (
            <div key={i} style={{
              flex: 1,
              height: h + '%',
              borderRadius: 3,
              background: i === 6
                ? 'linear-gradient(180deg, var(--neon), rgba(61,255,209,0.3))'
                : 'rgba(255,255,255,0.10)',
              boxShadow: i === 6 ? '0 0 8px rgba(61,255,209,0.6)' : 'none',
            }}/>
          ))}
        </div>
        {/* Streak */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          marginTop: 'auto',
          padding: '5px 10px',
          borderRadius: 999,
          background: 'rgba(255,107,107,0.08)',
          border: '0.5px solid rgba(255,107,107,0.20)',
          alignSelf: 'flex-start',
        }}>
          <span style={{ fontSize: 11 }}>🔥</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#ff8b8b',
            fontFamily: 'var(--ff-sans)',
          }}>12 días seguidos</span>
        </div>
      </HeroCard>
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


  // ── FeatureGlyph: ritual del día (slide 4) ────────────────────────────────
  function FeatureGlyphRitual() {
    return (
      <div style={{ width: 96, height: 96, position: 'relative' }}>
        <svg width="96" height="96" viewBox="0 0 96 96">
          <defs>
            <linearGradient id="fg-ritual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6affd9"/>
              <stop offset="100%" stopColor="#1ad9ad"/>
            </linearGradient>
            <radialGradient id="fg-ritual-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3DFFD1" stopOpacity="0.32"/>
              <stop offset="100%" stopColor="#3DFFD1" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="48" cy="48" r="44" fill="url(#fg-ritual-glow)"/>
          {/* Sun rays */}
          <g stroke="url(#fg-ritual)" strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
            <line x1="48" y1="14" x2="48" y2="22"/>
            <line x1="48" y1="74" x2="48" y2="82"/>
            <line x1="14" y1="48" x2="22" y2="48"/>
            <line x1="74" y1="48" x2="82" y2="48"/>
            <line x1="24" y1="24" x2="29" y2="29"/>
            <line x1="67" y1="67" x2="72" y2="72"/>
            <line x1="24" y1="72" x2="29" y2="67"/>
            <line x1="67" y1="29" x2="72" y2="24"/>
          </g>
          {/* Sun core */}
          <circle cx="48" cy="48" r="14" fill="rgba(61,255,209,0.10)"
                  stroke="url(#fg-ritual)" strokeWidth="2.4"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(61,255,209,0.5))' }}/>
          <circle cx="48" cy="48" r="3" fill="#3DFFD1"/>
        </svg>
      </div>
    );
  }

  // ── FeatureGlyph: progreso (slide 5) ──────────────────────────────────────
  function FeatureGlyphProgress() {
    return (
      <div style={{ width: 96, height: 96, position: 'relative' }}>
        <svg width="96" height="96" viewBox="0 0 96 96">
          <defs>
            <linearGradient id="fg-prog" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#1ad9ad"/>
              <stop offset="100%" stopColor="#9b8aff"/>
            </linearGradient>
            <radialGradient id="fg-prog-glow" cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="#3DFFD1" stopOpacity="0.28"/>
              <stop offset="100%" stopColor="#3DFFD1" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="48" cy="48" r="44" fill="url(#fg-prog-glow)"/>
          {/* Trend line ascending */}
          <polyline points="20,68 32,56 44,60 56,42 68,46 80,28"
                    fill="none" stroke="url(#fg-prog)" strokeWidth="2.6"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(61,255,209,0.5))' }}/>
          {/* Dots en cada vertex */}
          <circle cx="20" cy="68" r="2.5" fill="#1ad9ad"/>
          <circle cx="32" cy="56" r="2.5" fill="#3DFFD1"/>
          <circle cx="44" cy="60" r="2.5" fill="#3DFFD1"/>
          <circle cx="56" cy="42" r="2.5" fill="#3DFFD1"/>
          <circle cx="68" cy="46" r="2.5" fill="#3DFFD1"/>
          <circle cx="80" cy="28" r="3.5" fill="#9b8aff"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(155,138,255,0.7))' }}/>
        </svg>
      </div>
    );
  }


  // ── WelcomeScreen — 5 slides con mockups visuales reales de la app ───────
  // Layout (top→bottom):
  //   1. Header con logo MENTEX + "Saltar" link top-right
  //   2. Hero mockup card (60% pantalla) — preview real de cada feature
  //   3. Title grande
  //   4. Subtitle descriptivo
  //   5. Dots indicator (pequeño, sutil) + botón circular flecha → bottom-right
  // Pattern inspirado en best practices de apps premium 2026 (Food Scanning,
  // Friends, Happyo references). Sustituye glyphs abstractos con previews
  // que vendecen el valor real desde el primer scroll.
  function WelcomeScreen(props) {
    var slidesData = React.useMemo(function() { return [
      {
        hero: <HeroMockupHome/>,
        title: 'Silencia el ruido',
        accent: 'que te roba el foco.',
        subtitle: 'Mentex bloquea las apps que más te distraen mientras estás presente.',
      },
      {
        hero: <HeroMockupChat/>,
        title: 'Tu coach personal,',
        accent: 'siempre contigo.',
        subtitle: 'Pregúntale lo que sea. Mentex aprende y te guía día a día.',
      },
      {
        hero: <HeroMockupRitual/>,
        title: 'Construye tu ritual',
        accent: 'diario.',
        subtitle: 'Pequeños hábitos que se vuelven irrompibles con el tiempo.',
      },
      {
        hero: <HeroMockupContent/>,
        title: 'Miles de contenidos',
        accent: 'a tu disposición.',
        subtitle: 'Charlas, meditaciones, lecturas y audios para crecer cada día.',
      },
      {
        hero: <HeroMockupProgress/>,
        title: 'Mide tu progreso,',
        accent: 'celebra cada paso.',
        subtitle: 'Visualiza cuánto has crecido y mantén tu racha viva.',
      },
    ]; }, []);

    var idxState = React.useState(0);
    var idx = idxState[0]; var setIdx = idxState[1];
    var dirState = React.useState('next');
    var dir = dirState[0]; var setDir = dirState[1];

    // Auto-advance cada 5s. Pausable cuando el user hace tap en dots (resetea
    // el timer al tap manual). LOOP INFINITO: del último vuelve al primero
    // (el user feedback fue claro — quedarse fijo en el último slide se
    // sentía como "se rompió"). Guard contra React StrictMode double-fire
    // via useRef.
    var advanceTimerRef = React.useRef(null);
    React.useEffect(function() {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
      advanceTimerRef.current = setTimeout(function() {
        advanceTimerRef.current = null;
        setDir('next');
        setIdx(function(i) { return (i + 1) % slidesData.length; });
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

    var current = slidesData[idx];
    var isLast = idx === slidesData.length - 1;

    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        overflow: 'hidden',
        animation: 'mtx-fade-in .4s ease',
      }}>
        <MeshGradientBackground/>
        <ParticleField count={28}/>

        {/* Header: solo wordmark "Mentex" centrado arriba (sin zen icon,
            sin Saltar). Pattern Heartly reference — minimalista. */}
        <div style={{
          position: 'absolute',
          top: 60, left: 0, right: 0,
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 4,
        }}>
          <span style={{
            fontSize: 14, fontWeight: 700,
            color: 'var(--ink-1)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
            opacity: 0.95,
          }}>MENTEX</span>
        </div>

        {/* Hero mockup container — centrado GARANTIZADO con position absolute
            + left:50% + transform translateX(-50%). El antiguo flex-center
            dentro de un container con left:0 right:0 podía desviarse en
            algunos viewports (iframe del Studio). Ahora el centrado es
            perfecto sin importar el ancestor. Tamaño 340×460 (antes 320×440). */}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            position: 'absolute',
            top: 100, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
          }}>
          <div style={{ position: 'relative', width: 340, height: 460 }}>
            {slidesData.map(function(s, i) {
              var visible = i === idx;
              var offsetX = visible ? 0 : (i < idx ? -24 : 24);
              return (
                <div key={i} style={{
                  position: 'absolute', inset: 0,
                  opacity: visible ? 1 : 0,
                  transform: 'translateX(' + offsetX + 'px)',
                  transition: 'opacity .55s ease, transform .55s cubic-bezier(.4,0,.2,1)',
                  pointerEvents: visible ? 'auto' : 'none',
                  willChange: 'opacity, transform',
                }}>{s.hero}</div>
              );
            })}
          </div>
        </div>

        {/* Text zone — sandwich entre hero y bottom controls */}
        <div style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 130,
          padding: '0 32px',
          zIndex: 3,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {/* Title with accent — pattern inspirado en Friends app reference */}
          <h1 style={{
            margin: 0, marginBottom: 8,
            fontSize: 26, fontWeight: 700,
            color: 'var(--ink-1)',
            letterSpacing: '-0.025em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
            textAlign: 'center', lineHeight: 1.15,
            transition: 'opacity .35s ease',
          }}>
            {current.title}{' '}
            <span style={{
              color: 'var(--neon)',
              fontStyle: 'italic',
              fontWeight: 600,
            }}>{current.accent}</span>
          </h1>
          <div style={{
            fontSize: 13.5, fontWeight: 400,
            color: 'var(--ink-3)', letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
            textAlign: 'center', lineHeight: 1.55,
            maxWidth: 320,
          }}>{current.subtitle}</div>
        </div>

        {/* Bottom controls: dots a la izquierda alineados verticalmente
            con el botón circular a la derecha. Sin texto signin (el user
            entrará al login eventualmente al tap continuar). */}
        <div style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 38,
          padding: '0 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 3,
        }}>
          {/* Dots a la izquierda, alineados al center del botón circular */}
          <div style={{
            display: 'flex', gap: 6,
            paddingLeft: 8,
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
                    width: active ? 22 : 6, height: 6,
                    borderRadius: 999, border: 0,
                    background: active ? 'var(--neon)' : 'rgba(255,255,255,0.18)',
                    boxShadow: active ? '0 0 8px rgba(61,255,209,0.45)' : 'none',
                    transition: 'width .35s ease, background .35s, box-shadow .35s',
                    padding: 0,
                  }}/>
              );
            })}
          </div>

          {/* Botón circular flecha → derecha, pattern Food Scanning */}
          <button
            onClick={props.onContinue}
            aria-label={isLast ? 'Empezar' : 'Siguiente'}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              width: 60, height: 60, borderRadius: 999,
              border: '0.5px solid rgba(61,255,209,0.40)',
              background: 'linear-gradient(135deg, rgba(61,255,209,0.20), rgba(61,255,209,0.06))',
              color: 'var(--neon)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 0 0.5px rgba(61,255,209,0.18), 0 8px 24px -10px rgba(61,255,209,0.45), inset 0 0 14px rgba(61,255,209,0.08)',
              animation: 'mtx-cta-breath-soft 4s ease-in-out infinite',
              willChange: 'box-shadow',
            }}>
            <IcChevR size={20} stroke="currentColor" strokeWidth={2.2}/>
          </button>
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

  // ── MentexLogoMark — mini logo (zen icon + wordmark) para headers ─────────
  // Reutilizable en headers de auth/forgot. Compact y consistent.
  function MentexLogoMark(props) {
    var size = props.size || 14;
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        opacity: 0.95,
      }}>
        <MentexZenIcon size={28} animate={false}/>
        <span style={{
          fontSize: size, fontWeight: 700,
          color: 'var(--ink-1)',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          fontFamily: 'var(--ff-display, var(--ff-sans))',
        }}>MENTEX</span>
      </div>
    );
  }


  // ── AuthScreen — pantalla legendaria con tabs Sign In / Sign Up ─────────
  // Layout vertical limpio (pattern Heartly elevado):
  //   1. Header: back button + "MENTEX" wordmark centrado + spacer
  //   2. Title hero grande dinámico ("Crea tu cuenta" / "Bienvenido de vuelta")
  //   3. Subtitle inspiracional 1 línea
  //   4. Tabs Sign In | Sign Up (pill toggle, neon en active)
  //   5. Inputs con icons leading (mail, lock) — pegados visualmente
  //   6. Row: "Recordarme" checkbox (signin) + "¿Olvidaste contraseña?"
  //   7. CTA primario neon SÓLIDO gigante (no gradient transparente)
  //   8. Separator "o continúa con"
  //   9. Apple + Google side-by-side 50/50 (icons-only)
  //   10. Footer: "¿No tienes cuenta? Crear una" / "¿Ya tienes cuenta? Iniciar"
  function AuthScreen(props) {
    // Modo inicial: si props.initialMode='signup', empezar en signup; si no, signin
    var modeState = React.useState(props.initialMode === 'signup' ? 'signup' : 'signin');
    var mode = modeState[0]; var setMode = modeState[1];

    // Campos compartidos
    var emailState = React.useState('');
    var email = emailState[0]; var setEmail = emailState[1];
    var passwordState = React.useState('');
    var password = passwordState[0]; var setPassword = passwordState[1];
    var showPasswordState = React.useState(false);
    var showPassword = showPasswordState[0]; var setShowPassword = showPasswordState[1];

    // Campos extra para signup (no se muestran en signin)
    var nameState = React.useState('');
    var name = nameState[0]; var setName = nameState[1];
    var pwConfirmState = React.useState('');
    var pwConfirm = pwConfirmState[0]; var setPwConfirm = pwConfirmState[1];
    var acceptTermsState = React.useState(false);
    var acceptTerms = acceptTermsState[0]; var setAcceptTerms = acceptTermsState[1];

    var loadingState = React.useState(null);
    var loading = loadingState[0]; var setLoading = loadingState[1];
    var errorState = React.useState(null);
    var error = errorState[0]; var setError = errorState[1];

    var emailRef = React.useRef(null);

    var clearError = function() { if (error) setError(null); };

    var handleSubmit = function() {
      // En signup, validar campos extra primero
      if (mode === 'signup') {
        if (!name.trim()) { setError('Ingresa tu nombre'); return; }
        if (name.trim().length < 2) { setError('El nombre es muy corto'); return; }
      }

      var trimmedEmail = email.trim();
      if (!trimmedEmail) { setError('Ingresa tu email'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setError('Ese email no se ve bien');
        return;
      }
      if (!password) { setError('Ingresa tu contraseña'); return; }
      if (password.length < 6) { setError('La contraseña necesita 6+ caracteres'); return; }

      // Validaciones específicas de signup
      if (mode === 'signup') {
        if (!pwConfirm) { setError('Confirma tu contraseña'); return; }
        if (password !== pwConfirm) { setError('Las contraseñas no coinciden'); return; }
        if (!acceptTerms) { setError('Acepta los términos para continuar'); return; }
      }

      setError(null);
      setLoading('email');
      var fn = mode === 'signin'
        ? window.__mtxAuth.signInWithPassword(trimmedEmail, password)
        : window.__mtxAuth.signUpWithPassword(trimmedEmail, password);
      fn.then(function(res) {
        setLoading(null);
        if (res.error === 'invalid_email') return setError('Ese email no se ve bien');
        if (res.error === 'password_too_short') return setError('La contraseña necesita 6+ caracteres');
        if (res.error === 'no_account') return setError('No encontramos esa cuenta. ¿Quieres crear una?');
        if (res.error === 'wrong_password') return setError('Contraseña incorrecta');
        if (res.error === 'email_taken') return setError('Ese email ya está registrado. Inicia sesión.');
        if (res.error === 'network') return setError('Error de conexión. Reintenta.');
        // Success en signup: persistir el nombre tipeado (Mentex pre-onboarding)
        if (res.ok && mode === 'signup' && name.trim()) {
          window.__mtxAuth.updateUser({ name: name.trim().split(' ')[0] });
        }
      });
    };

    var handleApple = function() {
      setLoading('apple');
      window.__mtxAuth.signInWithApple().then(function() { setLoading(null); });
    };
    var handleGoogle = function() {
      setLoading('google');
      window.__mtxAuth.signInWithGoogle().then(function() { setLoading(null); });
    };

    var onKeyDown = function(e) {
      if (e.key === 'Enter' && !loading) {
        e.preventDefault();
        handleSubmit();
      }
    };

    var isSignIn = mode === 'signin';

    var rememberState = React.useState(true);
    var remember = rememberState[0]; var setRemember = rememberState[1];

    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        overflow: 'hidden',
        animation: 'mtx-fade-in .35s ease',
      }}>
        <MeshGradientBackground/>
        <ParticleField count={20}/>

        {/* Header: back izq + "MENTEX" wordmark centrado (sin zen icon) */}
        <div style={{
          position: 'absolute', top: 60, left: 0, right: 0,
          padding: '0 16px',
          display: 'flex', alignItems: 'center',
          zIndex: 3,
          height: 36,
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
          <div style={{
            position: 'absolute', left: 0, right: 0,
            display: 'flex', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: 'var(--ink-1)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              opacity: 0.95,
            }}>MENTEX</span>
          </div>
        </div>

        {/* Body — scrollable form. Top dinámico:
            • signin (form corto) → top 156 para balance vertical
            • signup (form largo) → top 110 para que quepa bien
            Patrón: el form siempre se ve "centrado verticalmente" ante
            el ojo, sin importar la cantidad de campos. */}
        <div style={{
          position: 'absolute',
          top: isSignIn ? 156 : 110,
          left: 0, right: 0, bottom: 24,
          padding: '0 28px',
          zIndex: 3,
          display: 'flex', flexDirection: 'column',
          overflow: 'auto',
          transition: 'top .3s ease',
        }} className="mtx-no-scrollbar">

          {/* Hero title + subtitle — centrados horizontalmente */}
          <div style={{ marginBottom: 22, textAlign: 'center' }}>
            <h1 style={{
              margin: 0,
              fontSize: 28, fontWeight: 700,
              color: 'var(--ink-1)',
              letterSpacing: '-0.03em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              lineHeight: 1.15,
            }}>{isSignIn ? (
              <span>Bienvenido <span style={{ color: 'var(--neon)', fontStyle: 'italic', fontWeight: 600 }}>de vuelta</span>.</span>
            ) : (
              <span>Crea tu <span style={{ color: 'var(--neon)', fontStyle: 'italic', fontWeight: 600 }}>cuenta</span>.</span>
            )}</h1>
            <p style={{
              margin: '8px auto 0',
              fontSize: 13.5, color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              lineHeight: 1.55,
              maxWidth: 280,
            }}>{isSignIn
              ? 'Ingresa para continuar tu camino.'
              : 'Únete y empieza tu mejor versión hoy.'}</p>
          </div>

          {/* Tab toggle Sign In / Sign Up — pill compact, neon active */}
          <div style={{
            display: 'flex', gap: 4,
            padding: 4,
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            borderRadius: 999,
            marginBottom: 22,
          }}>
            <button
              onClick={function() { setMode('signin'); clearError(); }}
              aria-pressed={isSignIn}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                flex: 1, padding: '10px 14px', borderRadius: 999,
                border: 0,
                background: isSignIn
                  ? 'linear-gradient(180deg, rgba(61,255,209,0.20), rgba(61,255,209,0.06))'
                  : 'transparent',
                color: isSignIn ? 'var(--neon)' : 'var(--ink-3)',
                fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                boxShadow: isSignIn ? 'inset 0 0 0 0.5px rgba(61,255,209,0.34), 0 0 0 1px rgba(61,255,209,0.08)' : 'none',
                transition: 'background .25s, color .25s, box-shadow .25s',
              }}>Iniciar sesión</button>
            <button
              onClick={function() { setMode('signup'); clearError(); }}
              aria-pressed={!isSignIn}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                flex: 1, padding: '10px 14px', borderRadius: 999,
                border: 0,
                background: !isSignIn
                  ? 'linear-gradient(180deg, rgba(61,255,209,0.20), rgba(61,255,209,0.06))'
                  : 'transparent',
                color: !isSignIn ? 'var(--neon)' : 'var(--ink-3)',
                fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                boxShadow: !isSignIn ? 'inset 0 0 0 0.5px rgba(61,255,209,0.34), 0 0 0 1px rgba(61,255,209,0.08)' : 'none',
                transition: 'background .25s, color .25s, box-shadow .25s',
              }}>Crear cuenta</button>
          </div>

          {/* Nombre — solo en signup. Icono user leading. */}
          {!isSignIn && (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <div style={{
                position: 'absolute', left: 16, top: 0, bottom: 0,
                display: 'flex', alignItems: 'center',
                color: 'var(--ink-4)',
                pointerEvents: 'none',
              }}>
                <IcUser size={16} stroke="currentColor" strokeWidth={1.6}/>
              </div>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={function(e) { setName(e.target.value); clearError(); }}
                placeholder="Tu nombre"
                disabled={!!loading}
                maxLength={60}
                style={{
                  appearance: 'none', WebkitAppearance: 'none',
                  width: '100%', height: 54,
                  boxSizing: 'border-box',
                  padding: '0 16px 0 44px',
                  borderRadius: 14,
                  border: '0.5px solid ' + (error ? 'rgba(255,107,107,0.40)' : 'rgba(255,255,255,0.10)'),
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--ink-1)',
                  fontSize: 14.5, fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  outline: 'none', colorScheme: 'dark',
                }}
              />
            </div>
          )}

          {/* Email input — icono leading mail integrado al input */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{
              position: 'absolute', left: 16, top: 0, bottom: 0,
              display: 'flex', alignItems: 'center',
              color: 'var(--ink-4)',
              pointerEvents: 'none',
            }}>
              <IcMail size={16} stroke="currentColor" strokeWidth={1.6}/>
            </div>
            <input
              ref={emailRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={function(e) { setEmail(e.target.value); clearError(); }}
              placeholder="Tu email"
              disabled={!!loading}
              style={{
                appearance: 'none', WebkitAppearance: 'none',
                width: '100%', height: 54,
                boxSizing: 'border-box',
                padding: '0 16px 0 44px',
                borderRadius: 14,
                border: '0.5px solid ' + (error ? 'rgba(255,107,107,0.40)' : 'rgba(255,255,255,0.10)'),
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--ink-1)',
                fontSize: 14.5, fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                outline: 'none', colorScheme: 'dark',
              }}
            />
          </div>

          {/* Password input — icono leading lock + eye toggle trailing */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{
              position: 'absolute', left: 16, top: 0, bottom: 0,
              display: 'flex', alignItems: 'center',
              color: 'var(--ink-4)',
              pointerEvents: 'none',
            }}>
              <IcLock size={16} stroke="currentColor" strokeWidth={1.6}/>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              value={password}
              onChange={function(e) { setPassword(e.target.value); clearError(); }}
              onKeyDown={onKeyDown}
              placeholder={isSignIn ? 'Tu contraseña' : 'Mínimo 6 caracteres'}
              disabled={!!loading}
              style={{
                appearance: 'none', WebkitAppearance: 'none',
                width: '100%', height: 54,
                boxSizing: 'border-box',
                padding: '0 48px 0 44px',
                borderRadius: 14,
                border: '0.5px solid ' + (error ? 'rgba(255,107,107,0.40)' : 'rgba(255,255,255,0.10)'),
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--ink-1)',
                fontSize: 14.5, fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                outline: 'none', colorScheme: 'dark',
              }}
            />
            <button
              onClick={function() { setShowPassword(!showPassword); }}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              type="button"
              className="mtx-tap"
              style={{
                position: 'absolute', right: 8, top: 8,
                appearance: 'none', cursor: 'pointer',
                width: 38, height: 38, borderRadius: 10,
                border: 0, background: 'transparent',
                color: 'var(--ink-3)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <IcEye size={16} stroke="currentColor" strokeWidth={1.7}/>
            </button>
          </div>

          {/* Confirmar contraseña — solo en signup. Mismo patrón visual. */}
          {!isSignIn && (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <div style={{
                position: 'absolute', left: 16, top: 0, bottom: 0,
                display: 'flex', alignItems: 'center',
                color: 'var(--ink-4)',
                pointerEvents: 'none',
              }}>
                <IcLock size={16} stroke="currentColor" strokeWidth={1.6}/>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={pwConfirm}
                onChange={function(e) { setPwConfirm(e.target.value); clearError(); }}
                onKeyDown={onKeyDown}
                placeholder="Confirma tu contraseña"
                disabled={!!loading}
                style={{
                  appearance: 'none', WebkitAppearance: 'none',
                  width: '100%', height: 54,
                  boxSizing: 'border-box',
                  padding: '0 16px 0 44px',
                  borderRadius: 14,
                  border: '0.5px solid ' + (
                    pwConfirm && pwConfirm !== password
                      ? 'rgba(255,107,107,0.40)'
                      : (pwConfirm && pwConfirm === password
                          ? 'rgba(61,255,209,0.30)'
                          : 'rgba(255,255,255,0.10)')
                  ),
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--ink-1)',
                  fontSize: 14.5, fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  outline: 'none', colorScheme: 'dark',
                  transition: 'border-color .2s',
                }}
              />
              {/* Checkmark sutil cuando coincide */}
              {pwConfirm && pwConfirm === password && (
                <div style={{
                  position: 'absolute', right: 16, top: 0, bottom: 0,
                  display: 'flex', alignItems: 'center',
                  color: 'var(--neon)',
                  pointerEvents: 'none',
                }}>
                  <IcCheck size={16} stroke="currentColor" strokeWidth={2.2}/>
                </div>
              )}
            </div>
          )}

          {/* Row: Recordarme (signin) + Olvidaste contraseña */}
          {isSignIn && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 18,
            }}>
              <button
                onClick={function() { setRemember(!remember); }}
                aria-pressed={remember}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  border: 0, background: 'transparent',
                  color: 'var(--ink-2)',
                  fontSize: 12.5, fontWeight: 500,
                  fontFamily: 'var(--ff-sans)',
                  padding: 0,
                }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 5,
                  border: '0.5px solid ' + (remember ? 'rgba(61,255,209,0.50)' : 'rgba(255,255,255,0.18)'),
                  background: remember ? 'rgba(61,255,209,0.18)' : 'transparent',
                  color: remember ? 'var(--neon)' : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .2s, border-color .2s, color .2s',
                }}>{remember && <IcCheck size={11} stroke="currentColor" strokeWidth={2.4}/>}</span>
                Recordarme
              </button>
              <button
                onClick={props.onForgot}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  border: 0, background: 'transparent',
                  color: 'var(--neon)',
                  fontSize: 12.5, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                  padding: 0,
                }}>¿Olvidaste tu contraseña?</button>
            </div>
          )}

          {/* Checkbox términos — solo signup. Obligatorio antes del CTA. */}
          {!isSignIn && (
            <button
              onClick={function() { setAcceptTerms(!acceptTerms); clearError(); }}
              aria-pressed={acceptTerms}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                border: 0, background: 'transparent',
                color: 'var(--ink-2)',
                fontSize: 12, fontWeight: 400,
                fontFamily: 'var(--ff-sans)',
                padding: '4px 0',
                marginBottom: 18,
                textAlign: 'left', lineHeight: 1.5,
              }}>
              <span style={{
                width: 18, height: 18, borderRadius: 5,
                border: '0.5px solid ' + (acceptTerms ? 'rgba(61,255,209,0.50)' : 'rgba(255,255,255,0.18)'),
                background: acceptTerms ? 'rgba(61,255,209,0.18)' : 'transparent',
                color: acceptTerms ? 'var(--neon)' : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
                transition: 'background .2s, border-color .2s, color .2s',
              }}>{acceptTerms && <IcCheck size={11} stroke="currentColor" strokeWidth={2.4}/>}</span>
              <span>
                Acepto los{' '}
                <span style={{ color: 'var(--neon)', fontWeight: 600 }}>Términos</span>
                {' '}y la{' '}
                <span style={{ color: 'var(--neon)', fontWeight: 600 }}>Política de privacidad</span>
                {' '}de Mentex.
              </span>
            </button>
          )}

          {/* Error inline */}
          {error && (
            <div style={{
              fontSize: 12, color: 'rgba(255,140,140,0.95)',
              fontFamily: 'var(--ff-sans)',
              marginBottom: 14,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(255,107,107,0.06)',
              border: '0.5px solid rgba(255,107,107,0.20)',
            }}>{error}</div>
          )}

          {/* CTA primario — neon SÓLIDO grande, no gradient transparente */}
          <button
            onClick={handleSubmit}
            disabled={!!loading}
            aria-label={isSignIn ? 'Iniciar sesión' : 'Crear cuenta'}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: loading ? 'wait' : 'pointer',
              width: '100%', height: 56,
              padding: '0 18px',
              borderRadius: 999,
              border: 0,
              background: 'linear-gradient(180deg, #5cffd6 0%, #1ad9ad 100%)',
              color: '#0a1410',
              fontSize: 15, fontWeight: 800,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              boxShadow: '0 0 0 0.5px rgba(61,255,209,0.30), 0 12px 32px -10px rgba(61,255,209,0.55), inset 0 -2px 0 rgba(0,0,0,0.10)',
              opacity: loading && loading !== 'email' ? 0.5 : 1,
              animation: loading ? 'none' : 'mtx-cta-breath-soft 4s ease-in-out infinite',
              willChange: 'box-shadow',
            }}>{loading === 'email'
              ? (isSignIn ? 'Ingresando…' : 'Creando cuenta…')
              : (isSignIn ? 'Iniciar sesión' : 'Crear cuenta')}</button>

          {/* Demo hint */}
          <div style={{
            marginTop: 12,
            fontSize: 11, color: 'var(--ink-4)',
            fontFamily: 'var(--ff-sans)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            Demo: <span style={{ color: 'var(--neon)', fontWeight: 600 }}>existing@mentex.app</span> + <span style={{ color: 'var(--neon)', fontWeight: 600 }}>password123</span>
          </div>

          {/* Separator "o continúa con" */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 14px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }}/>
            <div style={{
              fontSize: 10.5, color: 'var(--ink-4)',
              letterSpacing: '0.06em',
              fontFamily: 'var(--ff-sans)',
              fontWeight: 500,
            }}>o continúa con</div>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }}/>
          </div>

          {/* Apple + Google side-by-side 50/50 (icon-only style más limpio) */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleApple}
              disabled={!!loading}
              aria-label="Continuar con Apple"
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: loading ? 'wait' : 'pointer',
                flex: 1, height: 52,
                borderRadius: 14,
                border: '0.5px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--ink-1)',
                fontSize: 13.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading && loading !== 'apple' ? 0.5 : 1,
              }}>
              <svg width="14" height="18" viewBox="0 0 16 20" fill="currentColor">
                <path d="M11.4 10.6c0-2.4 2-3.6 2.1-3.6-1.1-1.6-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8C1.6 5.3 0 6.3 0 8.7c0 1.6.5 3.4 1.4 4.8.7 1.3 1.6 2.6 2.6 2.6 1 0 1.4-.7 2.6-.7 1.3 0 1.6.7 2.7.6 1.1 0 1.8-1.3 2.5-2.5.4-.7.7-1.6 1-2.5-.1 0-2.4-.9-2.4-3.4M9.4 3.5c.5-.7.9-1.7.8-2.6-.8 0-1.7.5-2.3 1.2C7.4 2.7 6.9 3.7 7 4.6c.9.1 1.9-.4 2.4-1.1Z"/>
              </svg>
              {loading === 'apple' ? '…' : 'Apple'}
            </button>
            <button
              onClick={handleGoogle}
              disabled={!!loading}
              aria-label="Continuar con Google"
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: loading ? 'wait' : 'pointer',
                flex: 1, height: 52,
                borderRadius: 14,
                border: '0.5px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--ink-1)',
                fontSize: 13.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading && loading !== 'google' ? 0.5 : 1,
              }}>
              <svg width="16" height="16" viewBox="0 0 18 18">
                <path d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8c-.2 1.1-.8 2-1.8 2.6v2.2h2.9c1.7-1.5 2.7-3.8 2.7-6.4Z" fill="#4285f4"/>
                <path d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 16 5.4 18 9 18Z" fill="#34a853"/>
                <path d="M3.9 10.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V5H.9C.3 6.2 0 7.6 0 9s.3 2.8.9 4l3-2.3Z" fill="#fbbc05"/>
                <path d="M9 3.6c1.3 0 2.5.4 3.5 1.3l2.6-2.6C13.5.9 11.4 0 9 0 5.4 0 2.4 2 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6Z" fill="#ea4335"/>
              </svg>
              {loading === 'google' ? '…' : 'Google'}
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 18 }}/>

          {/* Footer dinámico — switch al otro mode */}
          <div style={{
            textAlign: 'center',
            fontSize: 13, color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            paddingBottom: 8,
          }}>
            {isSignIn ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button
              onClick={function() { setMode(isSignIn ? 'signup' : 'signin'); clearError(); }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                border: 0, background: 'transparent',
                color: 'var(--neon)',
                fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--ff-sans)',
                padding: 0,
              }}>{isSignIn ? 'Crear cuenta' : 'Iniciar sesión'}</button>
          </div>
        </div>
      </div>
    );
  }


  // ── ForgotPasswordEmailScreen — Step 1: input email ───────────────────────
  function ForgotPasswordEmailScreen(props) {
    var emailState = React.useState('');
    var email = emailState[0]; var setEmail = emailState[1];
    var loadingState = React.useState(false);
    var loading = loadingState[0]; var setLoading = loadingState[1];
    var errorState = React.useState(null);
    var error = errorState[0]; var setError = errorState[1];
    var inputRef = React.useRef(null);

    React.useEffect(function() {
      var t = setTimeout(function() { if (inputRef.current) inputRef.current.focus(); }, 200);
      return function() { clearTimeout(t); };
    }, []);

    var handleSend = function() {
      var trimmed = email.trim();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setError('Ingresa un email válido');
        return;
      }
      setError(null);
      setLoading(true);
      window.__mtxAuth.requestPasswordReset(trimmed).then(function(res) {
        setLoading(false);
        if (res.error) {
          setError('No pudimos enviar el código. Reintenta.');
          return;
        }
        if (props.onSent) props.onSent(trimmed);
      });
    };

    var onKeyDown = function(e) {
      if (e.key === 'Enter' && !loading) { e.preventDefault(); handleSend(); }
    };

    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        overflow: 'hidden',
        animation: 'mtx-fade-in .35s ease',
      }}>
        <MeshGradientBackground/>

        <div style={{
          position: 'absolute', top: 60, left: 0, right: 0,
          padding: '0 16px',
          display: 'flex', alignItems: 'center',
          zIndex: 3, height: 36,
        }}>
          <button
            onClick={props.onBack}
            aria-label="Volver al login"
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
        </div>

        <div style={{
          position: 'absolute',
          top: 130, left: 0, right: 0, bottom: 32,
          padding: '0 28px',
          zIndex: 3,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            fontSize: 9.5, color: 'var(--neon)',
            letterSpacing: '0.16em', textTransform: 'uppercase',
            fontWeight: 600, marginBottom: 6,
            fontFamily: 'var(--ff-sans)',
          }}>RECUPERAR ACCESO</div>
          <h1 style={{
            margin: 0, marginBottom: 8,
            fontSize: 24, fontWeight: 700,
            color: 'var(--ink-1)',
            letterSpacing: '-0.025em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
            lineHeight: 1.2,
          }}>¿Olvidaste tu contraseña?</h1>
          <p style={{
            margin: '0 0 22px',
            fontSize: 13.5, color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            lineHeight: 1.5,
          }}>Sin problema. Te enviamos un código de 6 dígitos para restablecerla.</p>

          <input
            ref={inputRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={function(e) { setEmail(e.target.value); if (error) setError(null); }}
            onKeyDown={onKeyDown}
            placeholder="tu@email.com"
            disabled={loading}
            style={{
              appearance: 'none', WebkitAppearance: 'none',
              width: '100%', height: 48,
              boxSizing: 'border-box',
              padding: '0 16px',
              borderRadius: 12,
              border: '0.5px solid ' + (error ? 'rgba(255,107,107,0.40)' : 'rgba(255,255,255,0.10)'),
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--ink-1)',
              fontSize: 14, fontFamily: 'var(--ff-sans)',
              outline: 'none', colorScheme: 'dark',
              marginBottom: 12,
            }}
          />

          {error && (
            <div style={{
              fontSize: 12, color: 'rgba(255,140,140,0.95)',
              fontFamily: 'var(--ff-sans)',
              marginBottom: 12,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(255,107,107,0.06)',
              border: '0.5px solid rgba(255,107,107,0.20)',
            }}>{error}</div>
          )}

          <button
            onClick={handleSend}
            disabled={loading}
            aria-label="Enviar código de recuperación"
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: loading ? 'wait' : 'pointer',
              width: '100%', height: 50,
              borderRadius: 12,
              border: '0.5px solid rgba(61,255,209,0.40)',
              background: 'linear-gradient(180deg, rgba(61,255,209,0.20), rgba(61,255,209,0.08))',
              color: 'var(--neon)',
              fontSize: 14.5, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              boxShadow: '0 0 0 1px rgba(61,255,209,0.16), inset 0 0 14px rgba(61,255,209,0.08)',
              opacity: loading ? 0.6 : 1,
            }}>{loading ? 'Enviando…' : 'Enviar código'}</button>
        </div>
      </div>
    );
  }


  // ── ForgotPasswordNewScreen — Step 3: nueva contraseña + confirm ──────────
  function ForgotPasswordNewScreen(props) {
    var pwState = React.useState('');
    var pw = pwState[0]; var setPw = pwState[1];
    var pw2State = React.useState('');
    var pw2 = pw2State[0]; var setPw2 = pw2State[1];
    var showState = React.useState(false);
    var show = showState[0]; var setShow = showState[1];
    var loadingState = React.useState(false);
    var loading = loadingState[0]; var setLoading = loadingState[1];
    var errorState = React.useState(null);
    var error = errorState[0]; var setError = errorState[1];
    var inputRef = React.useRef(null);

    React.useEffect(function() {
      var t = setTimeout(function() { if (inputRef.current) inputRef.current.focus(); }, 200);
      return function() { clearTimeout(t); };
    }, []);

    var strength = React.useMemo(function() {
      if (!pw) return 0;
      var score = 0;
      if (pw.length >= 6) score++;
      if (pw.length >= 10) score++;
      if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
      if (/\d/.test(pw)) score++;
      if (/[^a-zA-Z0-9]/.test(pw)) score++;
      return Math.min(score, 4);
    }, [pw]);

    var handleSubmit = function() {
      if (pw.length < 6) return setError('La contraseña necesita 6+ caracteres');
      if (pw !== pw2) return setError('Las contraseñas no coinciden');
      setError(null);
      setLoading(true);
      window.__mtxAuth.resetPassword(pw).then(function(res) {
        setLoading(false);
        if (res.error) { setError('No pudimos restablecer la contraseña.'); return; }
        // Auto-login + drop al app via MentexApp routing
      });
    };

    var strengthLabels = ['', 'Débil', 'Aceptable', 'Buena', 'Excelente'];
    var strengthColors = ['', '#FF6B6B', '#FFB347', '#9DB7FF', '#3DFFD1'];

    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        overflow: 'hidden',
        animation: 'mtx-fade-in .35s ease',
      }}>
        <MeshGradientBackground/>

        <div style={{
          position: 'absolute', top: 60, left: 0, right: 0,
          padding: '0 16px',
          display: 'flex', alignItems: 'center',
          zIndex: 3, height: 36,
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

        <div style={{
          position: 'absolute',
          top: 130, left: 0, right: 0, bottom: 32,
          padding: '0 28px',
          zIndex: 3,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            fontSize: 9.5, color: 'var(--neon)',
            letterSpacing: '0.16em', textTransform: 'uppercase',
            fontWeight: 600, marginBottom: 6,
            fontFamily: 'var(--ff-sans)',
          }}>NUEVA CONTRASEÑA</div>
          <h1 style={{
            margin: 0, marginBottom: 8,
            fontSize: 24, fontWeight: 700,
            color: 'var(--ink-1)',
            letterSpacing: '-0.025em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
          }}>Crea una nueva</h1>
          <p style={{
            margin: '0 0 22px',
            fontSize: 13, color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            lineHeight: 1.5,
          }}>Algo que recuerdes pero solo tú sepas. Mínimo 6 caracteres.</p>

          {/* Password 1 */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input
              ref={inputRef}
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={pw}
              onChange={function(e) { setPw(e.target.value); if (error) setError(null); }}
              placeholder="Nueva contraseña"
              disabled={loading}
              style={{
                appearance: 'none', WebkitAppearance: 'none',
                width: '100%', height: 48,
                boxSizing: 'border-box',
                padding: '0 44px 0 16px',
                borderRadius: 12,
                border: '0.5px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--ink-1)',
                fontSize: 14, fontFamily: 'var(--ff-sans)',
                outline: 'none', colorScheme: 'dark',
              }}
            />
            <button
              onClick={function() { setShow(!show); }}
              aria-label={show ? 'Ocultar' : 'Mostrar'}
              type="button"
              className="mtx-tap"
              style={{
                position: 'absolute', right: 6, top: 6,
                appearance: 'none', cursor: 'pointer',
                width: 36, height: 36, borderRadius: 8,
                border: 0, background: 'transparent',
                color: 'var(--ink-3)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <IcEye size={16} stroke="currentColor" strokeWidth={1.7}/>
            </button>
          </div>

          {/* Strength bar */}
          {pw && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                {[0, 1, 2, 3].map(function(i) {
                  return (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 999,
                      background: i < strength ? strengthColors[strength] : 'rgba(255,255,255,0.06)',
                      transition: 'background .2s',
                    }}/>
                  );
                })}
              </div>
              <div style={{
                fontSize: 11, color: strengthColors[strength] || 'var(--ink-4)',
                fontFamily: 'var(--ff-sans)',
                fontWeight: 500,
              }}>{strengthLabels[strength]}</div>
            </div>
          )}

          {/* Password confirm */}
          <input
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={pw2}
            onChange={function(e) { setPw2(e.target.value); if (error) setError(null); }}
            placeholder="Confirma tu contraseña"
            disabled={loading}
            style={{
              appearance: 'none', WebkitAppearance: 'none',
              width: '100%', height: 48,
              boxSizing: 'border-box',
              padding: '0 16px',
              borderRadius: 12,
              border: '0.5px solid ' + (pw2 && pw2 !== pw ? 'rgba(255,107,107,0.40)' : 'rgba(255,255,255,0.10)'),
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--ink-1)',
              fontSize: 14, fontFamily: 'var(--ff-sans)',
              outline: 'none', colorScheme: 'dark',
              marginBottom: 12,
            }}
          />

          {error && (
            <div style={{
              fontSize: 12, color: 'rgba(255,140,140,0.95)',
              fontFamily: 'var(--ff-sans)',
              marginBottom: 12,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(255,107,107,0.06)',
              border: '0.5px solid rgba(255,107,107,0.20)',
            }}>{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            aria-label="Restablecer contraseña"
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: loading ? 'wait' : 'pointer',
              width: '100%', height: 50,
              borderRadius: 12,
              border: '0.5px solid rgba(61,255,209,0.40)',
              background: 'linear-gradient(180deg, rgba(61,255,209,0.20), rgba(61,255,209,0.08))',
              color: 'var(--neon)',
              fontSize: 14.5, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              boxShadow: '0 0 0 1px rgba(61,255,209,0.16), inset 0 0 14px rgba(61,255,209,0.08)',
              opacity: loading ? 0.6 : 1,
            }}>{loading ? 'Restableciendo…' : 'Restablecer y entrar'}</button>
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
      // verifyFn es customizable: forgot-password flow pasa verifyResetOTP,
      // signup pasa verifyOTP por default. props.onVerified callback corre
      // después del ok (e.g. forgot navega a nueva contraseña screen).
      var verifyFn = props.verifyFn || function(otp) { return window.__mtxAuth.verifyOTP(otp); };
      verifyFn(fullOtp).then(function(res) {
        setLoading(false);
        if (res.error === 'wrong_otp') {
          setAttempts(function(n) { return n + 1; });
          setError('Código incorrecto. Intenta de nuevo.');
          setTimeout(function() {
            setDigits(['', '', '', '', '', '']);
            if (inputs.current[0]) inputs.current[0].focus();
          }, 600);
          return;
        }
        if (res.ok) {
          if (props.onVerified) props.onVerified(res);
          // Si no hay onVerified custom, el effect de auth en MentexApp navega
          // automáticamente para el caso signup.
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
    ForgotPasswordEmailScreen: ForgotPasswordEmailScreen,
    ForgotPasswordNewScreen: ForgotPasswordNewScreen,
    MentexZenIcon: MentexZenIcon,
    MentexLogoMark: MentexLogoMark,
  });

})();
