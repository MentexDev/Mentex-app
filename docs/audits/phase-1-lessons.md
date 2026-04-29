# Phase 1 — Audit Lessons

**Fecha:** 2026-04-28
**Construction commit (base):** `db8cb24` — `feat: Mentex App — estado inicial completo`
**Audit commit:** este commit

## Alcance

Audit del trabajo de iteraciones recientes del prototipo Mentex App: el flujo completo de sesión activa (Fase 2 — break picker, break active, reflection delay, completion), la Puntuación Mentex (Fase 3 — score chip → score hero card en perfil + stat card en home), reescritura de Notifications a pantalla completa, fix del bell badge a círculo perfecto, y pulido del footer.

## Findings

### CRIT-1 — `setTab('community')` deja al usuario en pantalla muerta

**Síntoma:** Al tocar "Compartir en comunidad" en el `CompletionScreen`, el tab Comunidad queda activo en la tabbar pero el contenido es `HomeInactive` (porque la condición de render del `MentexApp` cae al fallback `!isActive ? HomeInactive : HomeActive` sin un caso para `tab === 'community'`).

**Root cause:** Builder-mode imaginó el happy path como "share me lleva a comunidad" sin verificar que `CommunityScreen` existe en el render router. El "compartir" no es solo un setState — requiere que la pantalla destino exista.

**Fix:** [Mentex Home.html](../../Mentex Home.html) — `setTab('community')` → `setTab('home')`. Se mantiene la intención de cerrar la sesión y volver al inicio. La integración real con comunidad queda como TODO cuando se implemente la pantalla.

**Regression test:** después de Compartir, verificar que `Iniciar enfoque` CTA está visible (estamos en home).

---

### IMP-1 — `setTimeout` post-countdown sin cleanup en `BreakActiveScreen` y `ReflectionDelayScreen`

**Síntoma:** El countdown llega a 0 → `setTimeout(onEnd, 600)` se programa para llamar el callback con un pequeño delay. Si el componente se desmonta entre que el timer expira y el setTimeout fire (caso edge: usuario cierra sesión, navegación), el timer dispara `onEnd` que toca state del padre. En este prototipo el padre `MentexApp` siempre está montado, así que en práctica no rompe — pero es un leak silencioso (blind spot #5/#8 del CLAUDE.md global).

**Root cause:** Builder-mode pensó "el timer es para ese momento puntual" sin considerar que el `setTimeout` es un recurso que sobrevive al componente.

**Fix:** [screens/session-flow.jsx](../../screens/session-flow.jsx) — capturar el id del setTimeout en una variable local, `clearTimeout` en el cleanup del useEffect. Además, mover `onEnd` y `onCancel` a refs (`onEndRef`, `onCancelRef`) para evitar stale closure.

**Regression test:** N/A directo (requiere detectar React warnings, que en este prototipo no son visibles). Cubierto conceptualmente por la disciplina de cleanup.

---

### IMP-2 — `setBreakCount(2)` después del completion en lugar de 0

**Síntoma:** Al iniciar una nueva sesión después de cerrar una, el botón mostraba "Tomar un descanso · #3" cuando debería mostrar "#1" — porque `breakCount` se reseteaba al mock inicial de 2 en lugar de a 0.

**Root cause:** Mock inicial de `useState(2)` para que la primera vista del prototipo se viera "interesante" (matching el screenshot de Opal #3). En post-completion, copié ese mismo 2 sin pensar — es semánticamente incorrecto: una nueva sesión empieza con 0 descansos.

**Fix:** [Mentex Home.html](../../Mentex Home.html) — `useState(0)` y `setBreakCount(0)` en `onShare`/`onClose`.

**Regression test:** confirmar que tras `Iniciar enfoque` fresco, el botón muestra "Tomar un descanso · #1".

---

### IMP-3 — `NotificationsSheet` keydown listener: stale closure + sin guard de input

**Síntoma:** El listener `document.addEventListener('keydown', ...)` capturaba `Escape` para cerrar las notifs. Dos sub-bugs:
1. `handleClose` referenciado por la closure original era estable funcionalmente, pero conceptualmente es stale — si la implementación de `handleClose` cambia (e.g., side effects), el listener usaría la vieja.
2. Sin verificación de `isTypingInEditable` — si el día de mañana se añade un `<input>` en la app, Escape se intercepta para cerrar notifs aunque el usuario quiera escapar del input (blind spot #2).

**Fix:** [screens/notifications-sheet.jsx](../../screens/notifications-sheet.jsx) — `handleCloseRef` actualizado en cada render, listener llama `handleCloseRef.current?.()`. Guard al inicio del listener para `INPUT|TEXTAREA|SELECT|isContentEditable`.

**Regression test:** Esc cierra el sheet (verificado).

---

### IMP-4 — `NotifCard` y `ActivityRow` son `<div onClick>` sin keyboard a11y

**Síntoma:** Las cards interactivas usan `<div onClick={...}>` para el tap, pero no tienen `tabIndex` ni `onKeyDown` para Enter/Space. Usuario con teclado no puede activarlas (blind spot #4 del CLAUDE.md, WCAG 2.1 AA).

**Fix:** Agregado `role="button"`, `tabIndex={0}`, y handler `onKeyDown` que dispara el callback con Enter/Space.
- [screens/notifications-sheet.jsx](../../screens/notifications-sheet.jsx) (`NotifCard`)
- [screens/home-active.jsx](../../screens/home-active.jsx) (`ActivityRow`, sólo cuando `a.playing`)

**Regression test:** verificar que `NotifCard` tiene `tabIndex=0` y `role="button"` en el DOM.

**Nota:** `MtxLearningCard` (en `screens/learning-views.jsx`) tiene el mismo problema pero no lo modifiqué en este audit porque no estaba en el alcance reciente. Pendiente para próxima fase.

---

### IMP-5 — `ACHIEVEMENTS` exportado a `window` sin uso externo

**Síntoma:** `Object.assign(window, { ProfileScreen, ACHIEVEMENTS })` exponía la constante de logros, pero solo se usa dentro del mismo archivo.

**Root cause:** Copié-pegué el patrón de export sin pensar que `ACHIEVEMENTS` es interno.

**Fix:** [screens/profile.jsx](../../screens/profile.jsx) — `Object.assign(window, { ProfileScreen })`.

---

## Meta-lessons

1. **Render routers son contratos vinculantes**: cuando se hace `setTab(X)` o `setView(X)`, el render condicional debe tener un caso explícito para X. Si el caso falla a un fallback, es un flujo muerto disfrazado.

2. **`setTimeout` posterior a un timer principal también necesita cleanup**: no basta con `clearInterval` — cualquier `setTimeout` programado dentro del effect tiene que cancelarse en el return del cleanup.

3. **Mock data inicial != reset value**: lo que es "interesante para una primera demo" no es lo que la app debe hacer al volver al estado base. Los reset values deben ser los semánticos correctos (0, null, []), no los visualmente convenientes.

4. **`document.addEventListener('keydown', ...)` siempre necesita guard de input**: incluso si no hay inputs hoy, alguien los añadirá. La disciplina es defensa preventiva.

5. **Tab/role/keyboard en clickable divs es no negociable**: si llevas un componente al QA "se ve bonito y funciona con mouse", aún no terminaste — falta el camino de teclado.

## Updated checklist para próxima fase de Construct

Antes de cerrar una construcción que añade un `setTab/setView` o cualquier navegación, verificar:
- [ ] El destino tiene caso explícito en el render router
- [ ] El destino renderiza contenido propio, no un fallback

Antes de cerrar un `useEffect` que programa timers:
- [ ] Cualquier `setTimeout`/`setInterval` interno se cancela en el cleanup
- [ ] Cualquier callback externo (props) que dispare el timer está en una ref si las deps son `[]`

Antes de cerrar un componente con `<div onClick>`:
- [ ] `role="button"` + `tabIndex={0}` + `onKeyDown` para Enter/Space
- [ ] O reemplazar por `<button>`

Antes de cerrar un listener global (`document`/`window`):
- [ ] Guard `INPUT|TEXTAREA|SELECT|isContentEditable` salvo que la tecla sea explícitamente útil mientras se escribe

Antes de cerrar un `Object.assign(window, ...)`:
- [ ] Verificar que cada export es usado fuera del archivo
