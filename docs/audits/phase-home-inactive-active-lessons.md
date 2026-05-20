# Audit: home-inactive.jsx + home-active.jsx — Lessons

**Commit auditado:** `51723ad` — `audit(home): 3 CRIT + 3 IMP — a11y, código muerto, side effects`
**Fecha:** 2026-05-03
**Ámbito:** `screens/home-inactive.jsx` (v43→v44) + `screens/home-active.jsx` (v49→v50)

---

## Hallazgos y root causes

### CRIT-1 — Nombre hardcodeado "Juan" en home-inactive (v43)

**Qué falló:** La pantalla home-inactive mostraba `{greeting}, Juan,` con el nombre fijo en el JSX. El onboarding ya guardaba `window.__mtxOnboarding.get().answers.name`, y la misma pantalla ya tenía `onboardingAnswers` en un `useMemo` 250 líneas más arriba. Builder-mode no hizo la conexión.

**Root cause:** Variables de estado computadas lejos del punto de uso son invisibles para builder-mode cuando está en "terminar la feature". El mismo archivo tenía la solución — no se requería trabajo nuevo.

**Fix:** Extraer el primer nombre con `.trim().split(' ')[0]` y fallback `'tú'` para cuando no hay onboarding.

**Lección:** Antes de hardcodear cualquier dato de usuario, grep el archivo por `onboarding`, `answers`, `profile`. El componente que necesita el nombre casi siempre ya tiene acceso a él.

---

### CRIT-2 — Apps toggle sin a11y (home-inactive)

**Qué falló:** El `<div onClick={() => toggleApp(app.id)}>` para habilitar/deshabilitar apps tenía cursor pointer y click handler pero cero semántica keyboard: sin `role="button"`, sin `tabIndex`, sin `onKeyDown`. Completamente invisible para usuarios que navegan con teclado o lectores de pantalla.

**Root cause:** Builder-mode agrega `onClick` y da por terminado el componente interactivo. El test visual en mouse no detecta ausencia de keyboard.

**Fix:** `role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleApp(app.id); } }}`.

**Lección:** Todo `<div onClick>` sin `<button>` real dispara automáticamente el blind spot #4 del checklist. Aplicar sin excepción.

---

### CRIT-3 — BannerCarousel wrapper sin onKeyDown

**Qué falló:** El wrapper principal del carousel tenía `role="button"` y `tabIndex={0}` (agregados en una iteración anterior) pero faltaba el `onKeyDown`. Un elemento con `role="button"` sin keyboard handler es peor que ningún role — anuncia capacidad que no existe.

**Root cause:** El role y tabIndex se agregaron en una sesión, el onKeyDown se olvidó. Correcciones parciales de a11y son peligrosas.

**Fix:** Agregar `onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap?.(slide); } }}` en el mismo elemento.

**Lección:** role="button" + tabIndex sin onKeyDown es PEOR que no tener nada — engaña a AT. Siempre los tres juntos o ninguno.

---

### IMP-1 — `const isClickable = true` (código muerto en home-active)

**Qué falló:** `ActivityRow` tenía `const isClickable = true` con 6 ternarios derivados: `cursor: isClickable ? 'pointer' : 'default'`, `onClick: isClickable ? handler : undefined`, etc. La variable nunca fue false, haciendo las ramas dead code puro.

**Root cause:** La variable fue una abstracción anticipada para "cuando los items no sean clickeables". Nunca llegó ese caso. El código muerto sobrevivió varias auditorías porque era "inocuo".

**Fix:** Eliminar la constante y simplificar los 6 ternarios a sus valores always-true. Se eliminaron ~15 líneas de complejidad cognitiva cero-valor.

**Lección:** Abstracciones condicionales "para el futuro" son deuda técnica inmediata. YAGNI se aplica a todos los niveles, incluyendo variables de control.

---

### IMP-2 — Comentario duplicado "CARD 4" (cosmético)

**Qué falló:** El comentario `── CARD 4` aparecía dos veces en `home-active.jsx` — una para la card de Ritual y otra para la de Recordatorios. La segunda debía ser CARD 5.

**Root cause:** Copy-paste sin actualizar el número.

---

### IMP-3 — Side effect dentro de `setSeconds` functional updater

**Qué falló:** El `DisableProtectionConfirmModal` usaba `setInterval` con un updater funcional de `setSeconds` que contenía `clearInterval` y `setTimeout` como side effects: `setSeconds(s => { if (s <= 1) { clearInterval(id); setTimeout(...); } return s - 1; })`. React puede ejecutar updaters funcionales múltiples veces en Concurrent Mode, duplicando los side effects.

**Root cause:** Confundir el updater funcional `(prevState) => newState` con un callback de efectos. El updater SOLO debe computar el nuevo estado — sin acceso a closures externas, sin llamadas imperativas.

**Fix:** Mantener `remaining` en el closure del `setInterval` directamente, llamar `setSeconds(remaining)` de forma simple, y mover `clearInterval` / `setTimeout` fuera del updater a un condicional normal.

**Lección:** Blind spot #3 del checklist: si el cuerpo del updater funcional hace algo más que `return nuevoValor`, es un bug latente. Extraer a contador local en el closure.

---

## Meta-lecciones

1. **Grep antes de hardcodear datos de usuario.** El componente casi siempre ya tiene acceso a las respuestas de onboarding.

2. **role="button" sin los 3 atributos juntos es peor que nada.** El conjunto mínimo es `role="button" + tabIndex={0} + onKeyDown(Enter/Space)`. Parcial = falso positivo de accesibilidad.

3. **Abstracciones condicionales "para el futuro" = dead code inmediato.** Si la condición siempre es true/false en código actual, eliminarla ahora.

4. **Updaters funcionales de setState son funciones puras.** No `clearInterval`, no `setTimeout`, no acceso a refs externas dentro del updater.

5. **El código muerto sobrevive auditorías porque parece inocuo.** Usar `grep -n 'const is[A-Z]'` al inicio de cada audit para encontrar variables booleanas de control hardcodeadas.

---

## Checklist actualizado para construcción en home screens

- [ ] Buscar `const is[A-Z][a-zA-Z]* = true|false` → eliminar variables de control always-true/false
- [ ] Buscar `onClick` en `<div>` → verificar `role + tabIndex + onKeyDown` presentes
- [ ] Buscar `role="button"` → verificar `tabIndex + onKeyDown` también presentes
- [ ] Buscar strings de usuario hardcodeados → grep por `onboarding`, `answers`, `profile`
- [ ] Buscar `setX(prev => { ... side_effect ... })` → extraer side effects al closure externo
- [ ] Buscar comentarios `CARD N` secuenciales → verificar que N sea correcto
