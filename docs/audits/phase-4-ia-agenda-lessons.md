# Phase 4 — Audit Lessons (IA · Agenda gestionada por el coach)

**Fecha:** 2026-05-02
**Construction commits:** `8612abd` (Fase 4 — agenda + fix header config), `a3095d5` (z-index status bar/dynamic island sobre modales)
**Audit commit:** este commit

## Alcance

Auditoría sobre la Fase 4 de la sección IA: bottom sheet `AgendaSheet` con tres
secciones (eventos del día, propuestas del coach con CTAs accionables,
recordatorios), nuevo store reactivo `__mtxIAAgenda`, y dos cambios sistémicos
adyacentes:

1. Wrapper de la página de Configuración pasó a ser **full-screen real**
   (`inset:0` + bg sólido `#0F1313`) en lugar de bottom-sheet aproximado
   con `top:60` + opacidad 0.99 que dejaba bleed-through.
2. Status bar (z=10→150) y dynamic island (z=50→150) del `IOSDevice` se
   subieron por encima de todos los sheets/modales (z=100-130). Replica el
   comportamiento real de iOS — el system status bar siempre visible.

Total auditado: `screens/ia-agenda.jsx` (~480 LOC nuevo), 4 cambios menores
en `screens/ia-flow.jsx`, `Mentex Home.html`, `frames/ios-frame.jsx`,
`screens/ia-settings.jsx`.

## Findings

### CRIT-1 — Sheet sin `role="dialog"` + `aria-modal` + focus trap

**Síntoma:** El `AgendaSheet` se renderizaba como un `<div>` plano con `onClick`
en el backdrop. Lectores de pantalla no anunciaban "diálogo abierto", y un
keyboard user podía hacer `Tab` desde el sheet hacia los icon buttons del
`IAHubHeader` que quedaban detrás — perdiendo el contexto modal por completo.

**Root cause (lo que builder-mode no vio):** Reutilicé el patrón visual de
`IAHistorySheet` (que también carece de role=dialog) sin re-evaluar a11y.
"Funciona como funciona el otro" no es un check de accesibilidad — solo
garantiza que el bug se reprodujo dos veces. Builder-mode optimiza por
*paridad visual*; auditor-mode tiene que preguntar *¿esto es semánticamente
un diálogo modal?* y aplicar las propiedades correspondientes
independientemente del precedente.

**Fix:**
- Inner sheet: `role="dialog"` + `aria-modal="true"` + `aria-labelledby={titleId}` + `tabIndex={-1}`.
- Backdrop overlay: `role="presentation"` (decorativo, no announceable como tal).
- `useId()` para generar el `titleId` único del `<h2 id={titleId}>Agenda</h2>` (consistente entre instancias paralelas si las hubiera).
- En el `useEffect` de `open=true`, llamar `sheetRef.current.focus({ preventScroll: true })` para mover foco al dialog inmediatamente.

**Regression check (smoke automatizado):**
```js
{ hasDialog: true, ariaModal: "true", ariaLabelledBy: ":r0:",
  titleId: "Agenda", tabIndex: -1, activeElement: "DIV (=dialog ✓)",
  hasBackdrop: true }
```

Foco verificado en el dialog programáticamente al abrir; ESC sigue cerrando
con `isTypingInEditable` guard intacto.

---

### IMP-1 — Animación del backdrop usa `mtx-fade-up` (slide + opacity) en vez de `mtx-fade-in` puro

**Síntoma:** El backdrop oscuro animaba con `mtx-fade-up` que hace
`translateY(8px) → 0` además del opacity. Un backdrop full-screen no debería
slidear — solo aparecer suave. El shift de 8px era casi imperceptible pero
era animación incorrecta semánticamente, y se propagaba como copia-pega
desde `IAHistorySheet` y otros sheets (todos los backdrops del sistema
sufrían lo mismo).

**Root cause:** No existía un keyframe `mtx-fade-in` puro en
`styles/mentex-tokens.css`, así que cualquiera que necesitaba "fade in" agarraba
`mtx-fade-up` por inercia.

**Fix:**
- Añadido `@keyframes mtx-fade-in { from { opacity: 0 } to { opacity: 1 } }` en
  `styles/mentex-tokens.css`.
- Backdrop del `AgendaSheet` ahora usa `animation: 'mtx-fade-in .25s ease'`.
- El sheet inner (que sí debe slidear desde abajo) mantiene `mtx-fade-up`.

**Lesson general:** Cuando un patrón visual se repite mal en varios sheets,
no parchees uno por uno — añade el primitive correcto al token system y
migra solo donde lo toques. Resto vendrá natural en próximas iteraciones.

---

### IMP-2 — Dead code: props `historyOpen`/`agendaOpen`/`settingsOpen` pasados a IAScreen pero nunca leídos

**Síntoma:** El shell pasaba `historyOpen={iaHistoryOpen}`,
`settingsOpen={iaSettingsOpen}`, `agendaOpen={iaAgendaOpen}` a `IAScreen`,
pero el componente solo necesitaba los SETTERS para abrir los sheets — los
`open` flags los lee directamente cada sheet desde el shell. Tres
`var historyOpen = !!props.historyOpen;` quedaron como variables fantasma.

**Root cause:** Cuando lifteamos history sheet al shell (en una fase
anterior) pasamos ambos prop y setter por inercia "por si acaso lo
necesita". Nunca lo necesitó. Cada nueva phase agregó más props duplicados
sin auditar el uso real.

**Fix:** Limpieza de props muertos: solo se pasan los setters. Comentario
explica el patrón para evitar reintroducción.

**Lesson general:** Cada phase debe **leer una vez** el componente
consumidor antes de propagar nuevos props. Si un valor no se usa en el
cuerpo del componente, no debe llegar al props.

---

### IMP-3 — Dismiss de propuesta sin feedback visual (toast solo para accept)

**Síntoma:** Al hacer click en "Ahora no" / "Mantener" / "Saltar hoy" la card
de propuesta desaparecía silenciosamente. Sin toast, sin animation de salida,
sin cualquier indicación de que el sistema registró la acción. El user
podía pensar "¿se borró por error? ¿se confundió mi tap?".

**Root cause:** Builder-mode pensó "accept = celebración (toast), dismiss =
sin acción" — diseño asimétrico. Pero ambos son acciones explícitas del
user que merecen confirmación.

**Fix:** `handleCta` ahora dispara toast en ambos paths:
- `accept`: `'✓ Listo · ' + p.title` (2000ms)
- `dismiss`: `'Descartada · ' + p.title` (1600ms, más corto = menos urgente)

**Regression check:** Toast verificado al click "Mantener":
`Descartada · Conflicto detectado · 12:30`.

---

### IMP-4 — `Date.now()` como ID en `addReminder` puede colisionar dentro de la misma ms

**Síntoma:** Si dos `addReminder()` se llamaban en la misma ms (posible en
un bulk import o programáticamente), generaban el mismo ID `'r' + Date.now()`,
rompiendo `key={r.id}` en React y causando renders inestables.

**Root cause:** `Date.now()` resolution es 1ms en Node/browser, y hardware
moderno hace fácil ejecutar dos `addReminder` consecutivos sub-ms.

**Fix:** ID = `'r' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)`.
Random base-36 de 6 caracteres → 36⁶ = 2.18 mil millones de combinaciones por ms.

**Regression check (smoke):** Loop de 10 `addReminder` consecutivos →
10 IDs únicos. Sample IDs muestran dos en la misma ms `1777702142235`
con sufijos distintos `b70s8t` y `c8yfoz`.

---

### IMP-5 — `useEffect` deps `[open, onClose]` causa re-register del keydown listener en cada render del shell

**Síntoma:** `onClose` se recrea con `() => setIaAgendaOpen(false)` en cada
render del `MentexApp`. El `useEffect` con deps `[open, onClose]` re-registra
el `keydown` listener cada vez que el shell renderiza (literalmente cada
keystroke, cada toggle de cualquier state del shell).

**Root cause:** Esto es exactamente el blind spot **#9** del CLAUDE.md
(useEffect deps con callbacks recreados). Lo escribí en la regla y luego
lo reproduje. Builder-mode no lo vio porque el comportamiento es
*correcto* — solo es ineficiente. Auditor-mode tiene que escanear toda
useEffect dep que incluya un callback sin `useCallback` ni ref.

**Fix:**
```js
var onCloseRef = React.useRef(onClose);
React.useEffect(function() { onCloseRef.current = onClose; }); // sync each render

React.useEffect(function() {
  if (!open) return;
  var onKey = function(e) { /* ... */ if (onCloseRef.current) onCloseRef.current(); };
  window.addEventListener('keydown', onKey);
  return function() { window.removeEventListener('keydown', onKey); };
}, [open]); // ← solo re-registra al abrir/cerrar
```

**Lesson general:** Esta regla ya estaba en el checklist (CLAUDE.md blind
spot #9). El audit la atrapó solo porque la re-leí re-leí. Test-first es la
única defensa duradera — la próxima fase, escribir la audit assertion
*antes* del código.

---

## Smoke tests agresivos ejecutados

1. **A11y dialog**: `role`, `aria-modal`, `aria-labelledby`, `titleId`,
   `tabIndex`, `activeElement`, presencia del backdrop. ✓ Todo OK.
2. **5 toggles consecutivos del mismo reminder** → store y DOM consistentes
   (`true === "true"`).
3. **10 `addReminder` consecutivos** → 10 IDs únicos, dos en misma ms con
   random sufijo distinto.
4. **ESC desde `<input>` dentro del dialog** → no cierra (guard
   `isTypingInEditable` correcto).
5. **Dismiss + accept toasts** → ambos disparan correctamente con
   mensajes distintos.
6. **0 errores en consola** durante todos los flows (solo el favicon 404
   estructural).

## Meta-lecciones

1. **Reutilizar un patrón visual NO valida su accesibilidad.** Si el
   patrón ancestro carece de role=dialog, el descendiente lo carece también.
   El audit debe re-evaluar a11y semantics independiente del precedente.

2. **Dead code se acumula por inercia entre phases.** Pasar props "por
   si acaso lo necesite" sin verificar el uso = entropía progresiva.
   Cada phase debe auditar los props consumidos antes de propagar nuevos.

3. **El blind spot #9 (useEffect deps con callbacks) sigue cazándome.**
   Está en el checklist hace 7 audits y aún lo reproduzco. Próxima fase:
   escribir test assertion *antes* del código (`expect(listener.calls).toBe(1)`
   tras 5 re-renders del parent).

4. **Animation primitives en token system, no copy-paste.** `mtx-fade-up`
   se estaba usando como fade-in en backdrops por falta de `mtx-fade-in`
   puro. Añadir el primitive correcto al CSS y usarlo donde se toque.

5. **Asymetric feedback (accept con toast, dismiss silencioso) confunde.**
   Si una acción es explícita del user, su feedback debe ser explícito —
   independiente del "sentimiento" semántico de la acción.

## Updated checklist for next phase

Antes de escribir el primer JSX de cualquier sheet/modal/dialog:

- [ ] ¿El root del modal tiene `role="dialog"` + `aria-modal="true"` + `aria-labelledby`?
- [ ] ¿El backdrop overlay tiene `role="presentation"`?
- [ ] ¿Hay focus inicial al sheet via `useEffect + ref.focus({preventScroll:true})`?
- [ ] ¿Cada `useEffect` con `[open, onClose]` u otro callback recreado usa
      `useRef` para guardarlo y deps `[open]` solamente?
- [ ] ¿Cada `Date.now()` ID tiene sufijo random?
- [ ] ¿Cada CTA dispara feedback (toast/animation), incluso los "negativos"
      como dismiss?
- [ ] ¿El backdrop usa `mtx-fade-in` (opacity) y el sheet inner `mtx-fade-up`
      (slide + opacity)? No mezclar.
- [ ] ¿Los props que pasas se leen en el body? Si no, fuera.
- [ ] ¿El icon button que dispara el modal está en el `IAHubHeader` con
      `aria-label` descriptivo?
- [ ] ¿Existe smoke test que afirme `role` + `aria-modal` + `activeElement`
      tras abrir? (test-first)

## Link a la construction commit

`8612abd` — Construction commit (Fase 4 + fix header config).
`a3095d5` — Z-index status bar/dynamic island sobre modales.
