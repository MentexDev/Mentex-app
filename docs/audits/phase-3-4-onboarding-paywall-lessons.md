# Phase 3+4 — Audit Lessons (Onboarding 10→12 steps + Welcome wow + Paywall)

**Fecha:** 2026-05-02
**Construction commits combinados:**
- `dcf54da` (onboarding 10 steps construct)
- `a383e37` (polish round 1: 8 ajustes)
- `582b9fe` (dev shortcut)
- `98ef72e` (polish round 2: tip boxes verdosos + step 7 rutina)
- `5f1af69` (polish round 3: copies emocionales + swap step 6↔7 + horas)
- `df1af14` (Phase 4: Welcome wow + Paywall steps 11 y 12)
- `6b230dc` (paywall editorial — benefits prominentes)
- `f299b90` (paywall plan-arriba)

**Audit commit:** este commit.

## Alcance

Auditoría sobre el sistema completo de onboarding (Phase 3) + first-time
experience + paywall (Phase 4). Total auditado:

- `screens/onboarding-flow.jsx` — 2138 LOC (12 steps + UI primitives + shell + plan card + welcome wow + paywall)
- `screens/auth-flow.jsx` — partes relevantes: store `__mtxOnboarding` (defaults, _mergeAnswers, complete), helper `_devCreateOnboardingUser`, hook `useOnboarding`
- `Mentex Home.html` — routing del `authView === 'onboarding'`, dev controls del Tweaks Panel

Auditor-mode pesimista, contra los 10 blind spots del CLAUDE.md + a11y +
race conditions + memory leaks + GPU bugs + dead code + UX edge cases.

## Findings

### CRIT-1 — Step 9 (Notifications) → back a step 8 (FakeLoad) genera loop UX

**Síntoma:** El user en step 9 (notificaciones) presiona "← Atrás". Vuelve
al step 8 (fake-load). El useEffect del fake-load monta nuevos timers, y
`tFinal` (3.7s) llama `onAutoAdvance` → `next()` → step 9 nuevamente. Si
el user vuelve a presionar atrás, el loop se repite.

Aunque no hay corrupción de datos ni crash, es un bug UX visible que rompe
el ritual emocional del onboarding (el user se queda atrapado en la
animación que ya vio).

**Root cause (lo que builder-mode no vio):** Builder-mode pensó "lockNav
en steps one-way" y aplicó la regla a step 8, 10, 11. Auditor-mode tiene
que preguntar *¿es válido volver atrás de un step one-way?* — la respuesta
es que step 9 (notifications) NO debe permitir back porque step 8 es
one-way y reproducirlo no agrega valor. Step 9 cierra la fase de
configuración del onboarding.

**Fix:**
```js
lockNav: step === 8 || step === 9 || step === 10 || step === 11,
```

**Regression test:** Ir a step 9, verificar que NO existe botón "← Atrás"
en el DOM. ✓ Verificado: `T1_step9_no_back: true`.

**Lesson general:** Cuando un step es one-way (auto-advance, animación
inmersiva, transición one-shot), TODOS los steps inmediatamente posteriores
también deben locknav back, porque el back no debería re-disparar el
one-way. La regla es: *la frontera del lockNav debe extenderse a la
primera oportunidad estable de salida*, no solo al step one-way mismo.

---

### IMP-1 — `setTimeout(complete, 0)` en CTAs del paywall innecesario

**Síntoma:** En el paywall, ambos CTAs (`startTrial` y `continueFree`) hacen:
```js
onChange({ selectedPlan: ..., trialStartedAt: ... });
setTimeout(function() { if (onComplete) onComplete(); }, 0);
```

El comentario decía "defer complete a próximo tick para que el answer
patch persista primero". Pero el flujo ES síncrono:
1. `onChange` → `__mtxOnboarding.updateAnswers(patch)` → `_setObState({ answers: ... })` → `_obState = Object.assign({}, ...)` → `_emitOb()` (event dispatch)
2. `complete()` → lee `_obState.answers` que YA tiene los nuevos valores

El setTimeout(0) es defensa que dispara unrelated react-render concerns
pero no aporta safety real. Y peor: si el componente se desmonta entre el
click y el next tick (improbable pero posible), el callback fire-and-forget
podría disparar después de unmount.

**Root cause:** Builder-mode aplicó "defer state-changing actions" como
heurística sin verificar el flujo real de los stores síncronos. El
`__mtxOnboarding` store es 100% síncrono — no requiere defer.

**Fix:**
```js
function startTrial() {
  if (completedRef.current) return;
  completedRef.current = true;
  onChange({ selectedPlan: cycle, trialStartedAt: Date.now() });
  if (onComplete) onComplete();  // sync, sin setTimeout
}
```

**Lesson general:** `setTimeout(0)` es a menudo una "defensa cargo-cult".
Antes de usarlo, verificar si el flujo real es realmente async. Para stores
síncronos basados en `Object.assign + dispatchEvent`, el state queda
consistente en el mismo tick. El defer es ruido.

---

### IMP-2 — Doble-click en CTAs del paywall puede disparar complete dos veces

**Síntoma:** Si el user hace doble-click rápido en "Empezar 7 días gratis"
o "Continuar con plan gratuito", ambos handlers ejecutan. Es idempotente
(complete fire dos veces produce el mismo state final), pero conceptualmente
es double-fire feo: dos `updateAnswers`, dos `complete()`, dos `__mtxAuth.completeOnboarding`,
dos `__mtxProfile.update`.

En testing programático: `trialPlanCalls === 2` en lugar de `1`.

**Root cause:** Builder-mode no consideró el patrón "guard contra
double-tap" típico en mobile. Es blind spot a agregar.

**Fix:** Ref guard:
```js
var completedRef = React.useRef(false);

function startTrial() {
  if (completedRef.current) return;
  completedRef.current = true;
  // ... resto
}
```

**Regression test:** Doble-click rápido en CTA. Hook `updateAnswers` para
contar invocaciones con `selectedPlan + trialStartedAt`. Esperar exactamente
1 call. ✓ Verificado: `T2_doubleclick_guard: true`.

**Lesson general (NUEVO BLIND SPOT #11):** Cualquier CTA que dispare un
side-effect terminal (complete, submit, navigate-away) debe tener guard
contra double-tap. Los buttons mobile son fáciles de tocar dos veces sin
querer. Ref pattern es la forma idiomática en React.

---

### IMP-3 — StepFakeLoad blind spot #9: `onAutoAdvance` no en deps del useEffect

**Síntoma:** El useEffect de StepFakeLoad tiene deps `[]`. La prop
`onAutoAdvance` se recrea en cada render del padre (`OnboardingScreen`),
por lo que el closure capturó la versión inicial.

Hoy NO es bug porque `onAutoAdvance` solo invoca
`window.__mtxOnboarding.next()` (no captura state local). Pero si el día
de mañana se cambia para capturar algo (ej. cooldown, conditional logic),
romperá silenciosamente.

**Root cause:** Builder-mode aplicó deps `[]` para no re-disparar timers
en cada render — correcto. Pero olvidó el ref pattern para callbacks
externos. Es exactamente el blind spot #9 del CLAUDE.md.

**Fix:** Ref pattern:
```js
var onAutoAdvanceRef = React.useRef(onAutoAdvance);
onAutoAdvanceRef.current = onAutoAdvance;

React.useEffect(function() {
  // ...
  var tFinal = setTimeout(function() {
    if (!advancedRef.current && typeof onAutoAdvanceRef.current === 'function') {
      advancedRef.current = true;
      onAutoAdvanceRef.current();
    }
  }, 3700);
  // ...
}, []);
```

**Lesson general:** El blind spot #9 sigue conmigo. Tercera vez que lo
cazo en el sistema (audits anteriores phase-4-ia-agenda y
phase-5-ia-quick-access). Patrón a internalizar: *cada callback prop
usado dentro de un useEffect con deps `[]` necesita ref*.

---

### IMP-4 — `goTo()` sin upper bound

**Síntoma:** El método `__mtxOnboarding.goTo(step)` tiene `Math.max(0, step)`
pero NO `Math.min(11, step)`. Si alguien llama `goTo(99)`, el state se
queda en step=99. La safety en `OnboardingScreen` (`step >= 12 → complete()`)
lo cubre, pero defensa débil.

**Fix:** Bound a [0, 11]:
```js
goTo: function(step) {
  _setObState({ step: Math.max(0, Math.min(11, step)) });
},
```

**Regression test:** `goTo(99)` debe resultar en `step === 11`. ✓
Verificado: `T3_goto_upper_bound: true`.

---

### IMP-5 — Welcome wow `key={i}` en map de highlights

**Síntoma:** Los highlights del welcome wow se renderizan con
`key={i}` (índice del array). Como el array tiene un filter
condicional (`apps > 0 ? {...} : null`), los índices podrían moverse
entre renders. React podría confundir items.

En la práctica el array es estable porque los answers no cambian durante
el welcome wow (lockNav). Pero key estable es preferible.

**Fix:** Agregar `id` estable a cada highlight:
```js
var highlights = [
  { id: 'content', icon: '📚', ... },
  { id: 'coach', ... },
  apps > 0 ? { id: 'apps', ... } : null,
  { id: 'routine', ... },
].filter(Boolean);

highlights.map(function(h, i) {
  return React.createElement('div', { key: h.id, ... });
});
```

**Lesson general:** Cuando un array map tenga filter condicional o
splicing, NO usar `key={i}`. Usar id estable derivado del item.

---

### IMP-6 — `'calc(50% + 0px)'` syntax raro en plan toggle

**Síntoma:** El sliding thumb del plan toggle tenía:
```js
left: cycle === 'monthly' ? 3 : 'calc(50% + 0px)',
```

`'calc(50% + 0px)'` funciona pero es código copiado de un experimento.
La forma limpia es solo `'50%'`.

**Fix:**
```js
left: cycle === 'monthly' ? 3 : '50%',
```

---

### IMP-7 — ID `'sleep'` collision entre GOAL_OPTIONS y CONTENT_OPTIONS

**Síntoma:**
```js
GOAL_OPTIONS: { id: 'sleep', label: 'Dormir mejor', icon: '😴' }
CONTENT_OPTIONS: { id: 'sleep', label: 'Para dormir', icon: '🌙' }
```

Hoy NO es bug porque cada step usa su array local con `OPTIONS.find()`.
Pero si Phase 5 (connection onboarding → app) hace lookup global por id
sin saber qué array es, podría confundir 'sleep' goal con 'sleep' content.
Deuda técnica.

**Fix:** Renombrar el content prefs a `'sleep_content'`:
```js
{ id: 'sleep_content', label: 'Para dormir', icon: '🌙' }
```

**Regression test:** Ambos arrays tienen el id, pero distintos:
`contentSleepLabel.id !== goalSleepLabel.id`. ✓ Verificado:
`T4_no_id_collision: true`.

**Lesson general:** Cuando dos arrays están en distintos namespaces lógicos
pero pueden colisionar por id, mejor namespace explícito en el id desde
el inicio. Phase 5 (connection) probablemente va a hacer lookups globales —
prevenir es más barato que detectar bugs después.

---

## Smoke tests agresivos ejecutados

**Suite de 11 tests, todos verdes:**

### Regression (para los fixes de este audit)
1. **T1 — Step 9 lockNav**: NO existe botón "← Atrás" en step 9 ✓
2. **T2 — Doble-click guard**: 1 call to updateAnswers, no 2 ✓
3. **T2b — Completed**: state final completed=true ✓
4. **T3 — goTo upper bound**: goTo(99) → step=11 ✓
5. **T4 — No id collision**: 'sleep' vs 'sleep_content' separados ✓

### Smoke end-to-end
6. **S1 — Walk completo**: Los 12 steps renderizan contenido ✓
7. **S2 — Free path**: continueFree → selectedPlan='free', completed=true,
   trialStartedAt=null ✓
8. **S3 — Profile patch**: name, handle, initial llegan a __mtxProfile ✓
9. **S3b — Auth completed**: auth.user.onboardingCompleted=true ✓
10. **S4 — Plan toggle dynamic**: default='annual' con $9.99 visible,
    click "Mensual" → cycle='monthly' con $12.99 visible ✓
11. **S6 — Notifications shape**: las 5 keys (session, coach, milestones,
    breaks, content) son booleans ✓

### Side checks
- 0 console errors throughout
- No `<div onClick>` o `<span onClick>` sin tabIndex (todo es `<button>`)
- No `addEventListener` global para keys (no necesidad de `isTypingInEditable` guard)
- No `filter:blur` (no GPU bugs)
- No `once: true` listeners
- setTimeouts del fake-load tienen cleanup ✓

## Meta-lecciones

1. **Lock-nav tiene frontera, no punto.** Cuando defines un step one-way
   (animación inmersiva, auto-advance), el lockNav debe extenderse a TODOS
   los steps siguientes hasta el próximo "punto estable de salida". Si
   solo locknavas el step one-way, el back desde el siguiente step lo
   re-dispara → loop UX.

2. **Nuevo blind spot #11 a agregar al CLAUDE.md: CTAs terminales sin
   guard contra double-tap.** Cualquier CTA que dispare side-effect terminal
   (complete, submit, navigate-away) debe tener `completedRef`. Los buttons
   mobile son fáciles de tocar dos veces. Ref pattern es la forma idiomática.

3. **`setTimeout(0)` es a menudo cargo-cult.** Antes de usarlo, verificar
   si el flujo es realmente async. Stores síncronos basados en
   `Object.assign + dispatchEvent` no necesitan defer. El defer es ruido.

4. **Blind spot #9 (useEffect deps + callback recreation) sigue conmigo.**
   Cuarta vez que lo cazo. Patrón a internalizar de memoria: *cada callback
   prop usado dentro de un useEffect con deps `[]` necesita ref*.

5. **`key={i}` en arrays con filter es bomba de tiempo.** Si el filter
   condicional cambia el set de items, los índices se mueven y React
   confunde. Siempre id estable derivado del item.

6. **Namespace explícito en IDs cross-array.** Si dos arrays compartirán
   namespace lógico distinto pero ids podrían colisionar, prefijar el id
   desde el inicio. Prevenir es más barato que detectar después.

## Updated checklist for next phase

Antes de escribir el primer JSX de cualquier flow multi-step / animation
inmersiva / paywall:

- [ ] ¿Hay steps one-way (auto-advance, fake-load)? Si sí, lockNav debe
      extenderse a todos los steps siguientes hasta la próxima salida estable.
- [ ] ¿Hay CTA terminal (complete, submit, navigate-away)? Si sí, agregar
      `ref guard` contra double-tap.
- [ ] ¿Estoy a punto de poner `setTimeout(0)`? ¿El flujo es realmente async?
      Si los stores son síncronos, eliminar.
- [ ] ¿Tengo callback prop dentro de `useEffect` con deps `[]`? Aplicar
      ref pattern.
- [ ] ¿Tengo `array.map(function(_, i) { ... key: i })` con un filter
      condicional? Cambiar a id estable.
- [ ] ¿Dos arrays con ids que podrían colisionar? Prefijar namespace.
- [ ] ¿`goTo()` (o equivalente jump arbitrario) tiene upper bound?
- [ ] ¿Toda la nueva surface se prueba con regression tests del audit
      ANTES del commit, no después?

## Link a las construction commits

- `dcf54da` — onboarding 10 steps construct
- `a383e37` — polish round 1: 8 ajustes
- `582b9fe` — dev shortcut acceso directo onboarding
- `98ef72e` — polish round 2: tip boxes verdosos
- `5f1af69` — polish round 3: copies emocionales + swap step 6↔7 horas
- `df1af14` — Phase 4: Welcome wow + Paywall steps 11 y 12
- `6b230dc` — paywall editorial benefits prominentes
- `f299b90` — paywall plan-arriba reorder
