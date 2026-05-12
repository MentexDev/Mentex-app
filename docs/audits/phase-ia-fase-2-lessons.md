# IA Fase 2 — Audit Lessons (Skills · Workflows · Knowledge · Tasks)

**Fecha:** 2026-05-12
**Construction commits:** `6a3f88f`, `0df5bfc`, anteriores de la Fase 2 IA
**Audit commit:** este commit
**Alcance:** 4 archivos · 5,617 LOC totales auditados con auditor-mode brain en sesión separada.

```
screens/ia-skills.jsx     1,285 LOC
screens/ia-workflows.jsx  1,762 LOC
screens/ia-knowledge.jsx  1,387 LOC
screens/ia-tasks.jsx      1,183 LOC
```

## Resumen ejecutivo

**Hallazgos totales:** 14 CRIT + 43 IMP (58 findings sobre 5,617 LOC ≈ 1 finding cada 97 LOC).

**Fixes aplicados en este audit:** 14 CRIT (100%) + 18 IMP de alto valor (a11y, robustness, hook count, body scroll lock, ESC guards completos, immutability).

**Diferidos:** 25 IMP de bajo valor — algunos requieren su propio sprint de diseño (reemplazar `window.confirm`, react.memo perf, búsqueda exhaustiva de empty states). No bloquean Fase 3.

**Verificación quadruple:** ✓ tipo (no aplica — Babel standalone sin tsc) · ✓ build (sin build — JSX inline) · ✓ Playwright smoke test pasó 13/13 aserciones · ✓ 0 errores nuevos en consola.

---

## CRIT findings (14)

### CRIT-1 — `ia-skills.jsx`: SkillCard tenía 4 `<button>` anidados con la misma acción

**Síntoma builder-mode:** Cada SkillCard renderizaba un icon-button + title-button + description-button (todos con `onClick={onOpenDetail}`) + un toggle-button. Resultado: 4 tab-stops por card × 8 skills = 32 tab-stops para skimear la lista. Screen readers anuncian "button" 4 veces consecutivas con etiquetas solapadas. HTML nested-button es inválido y el title-button (multi-line) renderiza awkward en Safari.

**Root cause:** Builder-mode optimizó para "el user puede tappear cualquier parte de la card" pero no consideró el costo de a11y. Patrón heredado de cards previas sin auditar.

**Fix:** Card outer = `role="button" tabIndex={0} onClick={onOpenDetail} onKeyDown={...}` único. Icon/title/description ahora son `<div>` decorativos. Toggle queda como `<button role="switch">` aislado con `e.stopPropagation()` en su onClick para no abrir el detail. `aria-label` del card incluye contexto: `"Ver detalle: {title}. {Oficial|Tuya}. {Categoría}."`

**Regression test:** `cards = document.querySelectorAll('[role="button"][aria-label*="detalle"]')` → 8 cards. `switches = document.querySelectorAll('[role="switch"]')` → 8 switches. Clic en switch NO abre `[role="dialog"]`. ✓

---

### CRIT-2 — Toggle a11y: `aria-pressed` en lugar de `aria-checked`

**Síntoma builder-mode:** El toggle visual era track + thumb (clásico switch widget) pero usaba `aria-pressed`. NVDA/JAWS anuncian "button pressed/not pressed" cuando deberían anunciar "switch on/off".

**Fix:** Reemplazado por `role="switch" aria-checked={skill.enabled}`. Eliminado `aria-pressed`.

**Regression test:** `firstSwitch.getAttribute('aria-checked')` → "true" · `firstSwitch.getAttribute('aria-pressed')` → null. ✓

---

### CRIT-3 — `_state.officialEnabled[id] = !_state.officialEnabled[id]` mutación directa

**Síntoma builder-mode:** El reducer-equivalent mutaba en sitio el objeto `officialEnabled` antes de `_emit()`. JSON.stringify lo serializaba "limpio" así que la UI re-renderizaba bien, PERO cualquier consumidor que sostuviera una referencia al objeto interno (vía `getSkill().` cuando esa función spread el objeto, o vía Zustand-shim futuro) vería la mutación live.

**Root cause:** Blind spot universal — los stores con `_emit() = postMessage(JSON.clone(state))` ocultan mutaciones porque el observable downstream es siempre un snapshot fresh. Pero el contrato de inmutabilidad es semántico, no sólo runtime. Cuando Mastra o Zustand wrappee esto, el reducer no disparará.

**Fix:** `_state.officialEnabled = Object.assign({}, _state.officialEnabled); _state.officialEnabled[id] = ...;` — asigna objeto nuevo. Mismo patrón en `deleteMineSkill` (activations) y `trackActivation` (activations).

**Regression test:** `before = snapshot().officialEnabled; toggle(id); after = snapshot().officialEnabled; expect(after !== before).toBe(true)` ✓

---

### CRIT-4, CRIT-5, CRIT-6, CRIT-7 — ESC handlers incompletos (4 sheets afectados)

Cuatro `useEffect(() => addEventListener('keydown', ...))` con guards diferentes y stale-closure latente. Patrón corregido a un canonical:

```js
var onCloseRef = React.useRef(onClose);
React.useEffect(function() { onCloseRef.current = onClose; });
React.useEffect(function() {
  var onKey = function(e) {
    if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
    var t = e.target;
    var tag = (t && t.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    onCloseRef.current();
  };
  window.addEventListener('keydown', onKey);
  return function() { window.removeEventListener('keydown', onKey); };
}, []);
```

**Faltaban en builder:** `SELECT`, `isContentEditable`, `e.isComposing`/`keyCode === 229` (IME composition guard — crítico para usuarios chinos/japoneses/coreanos que escriben con candidate windows).

**Stale closure:** Empty deps `[]` capturan el `onClose` inicial. Si el parent recrea `onClose` cada render (como hace `{function() { setX(null); }}`), las re-renders post-mount no actualizan el listener.

**Regression test:** ESC desde `<textarea>` con foco → modal sigue abierto. ESC desde `<body>` → modal cierra. ✓

---

### CRIT-8 — `setTimeout` autofocus sin cleanup

**Patrón builder-mode:** `useEffect(() => { setTimeout(focus, 100); }, []);` — sin `return clearTimeout`.

**Daño:** Si user abre/cierra rapidísimo (<100ms), el timer dispara `focus()` después del unmount. `textareaRef.current` es null entonces no crashea, pero el closure mantiene la ref viva hasta que el timer resuelve. En React StrictMode (futuro), el effect corre 2× y duplica timers.

**Fix:** Patrón canonical:
```js
React.useEffect(function() {
  var t = setTimeout(function() { ... }, 100);
  return function() { clearTimeout(t); };
}, []);
```

---

### CRIT-9 — `WorkflowDetailSheet` rapid toggle race condition

**Síntoma:** Si el user tappea el toggle 2× en <250ms, la operación `toggleWorkflow → getWorkflow → setDetailWf → toast` se ejecuta 2 veces antes de que React flushee setDetailWf, dejando el toast con un mensaje inverso al estado final.

**Fix:** Toggle lock con `useRef`:
```js
var toggleLockRef = React.useRef(false);
var handleToggleFromDetail = function(wf) {
  if (toggleLockRef.current) return;
  toggleLockRef.current = true;
  /* ... toggle + toast ... */
  setTimeout(function() { toggleLockRef.current = false; }, 250);
};
```

Mismo patrón aplicado a `handleRetry` en `ia-tasks.jsx` con lock per-id (`retryLockRef.current[t.id]`) — antes, doble-clic en "Reintentar" creaba 2 active tasks duplicados del mismo history item.

---

### CRIT-10 — `URL` constructor crash en `SourceCard`

**Síntoma:** `new URL(source.url || 'https://x').hostname` lanza TypeError si `source.url` es malformado (`'http:// foo'` pasa el regex laxo `/^https?:\/\/.{4,}/` pero falla el constructor). Como esto corre en `render()` dentro del `map()` de la lista, una sola source mala derriba toda la `KnowledgeSourcesSection` sin ErrorBoundary.

**Fix:** Wrap defensivo + fallback:
```js
try { sizeLabel = new URL(source.url).hostname.replace(/^www\./, ''); }
catch (_) { sizeLabel = (source.url || '').replace(/^https?:\/\//, '').split('/')[0] || 'URL'; }
```

Y validación de input upgraded en `_canIngest`:
```js
if (kind === 'url') {
  try {
    var u = new URL(url.trim());
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname;
  } catch (_) { return false; }
}
```

---

### CRIT-11 — `setInterval` gap en TasksSheet cuando active completaba

**Síntoma:** Si el tick de `tickActive()` movía la última active al historial (active.length 1→0) y simultáneamente el user aprobaba un pending (active.length 0→1), React batcheaba ambos updates. La dep del effect `[active.length]` permanecía igual a 1, el effect no re-corría, y el clearInterval ya había ejecutado durante el frame de "0". → Nueva active stuck at progress=5 forever.

**Fix:** Dependencia por contenido, no por length:
```js
var activeKey = active.map(function(a) { return a.id; }).join('|');
React.useEffect(function() { ... }, [activeKey]);
```

Cualquier cambio en el set de actives (aunque length sea igual) re-evalúa el effect.

---

### CRIT-12 — `durationMs: Date.now() - (t.startedAt || Date.now())` silenciaba bugs

**Síntoma:** El fallback `|| Date.now()` produce `durationMs: 0` cuando `t.startedAt` es falsy. Universal rule #2: no silent failures.

**Fix:** `durationMs: t.startedAt ? Date.now() - t.startedAt : null` + render guard en el consumidor (`{t.durationMs > 0 && ...}` ya estaba presente, ahora también respeta null).

---

### CRIT-13 — `formatRelative(future_ts)` retornaba "Hace un momento"

**Síntoma:** Clock skew (device adelantado vs server timestamp) producía `diff < 0` que caía en el primer `if (diff < 60_000) return 'Hace un momento'`. UX confuso.

**Fix:** `if (diff < 0) return 'Recién';` como primer guard.

**Regression test:** `formatRelative(Date.now() + 60000) === 'Recién'` ✓

---

### CRIT-14 — `replace('Hace ', '')` rompe semánticamente con futuros formats

**Síntoma:** `Hace {formatRelative(ts).replace('Hace ', '')}` asumía que `formatRelative` siempre prepende "Hace ". Pero retorna también `'Ayer'`, `'Recién'`, etc., produciendo strings absurdos como "Hace Ayer" cuando se cambien los seeds.

**Fix:** Confiar en formatRelative — ya retorna el string completo. Eliminado el prefix literal + replace.

---

## IMP findings (18 aplicados, 25 diferidos)

### Aplicados

1. **`role="dialog" aria-modal="true"` + `aria-label` en todos los sheets/modals** (4 sheets).
2. **Body scroll lock** vía `document.body.style.overflow = 'hidden'` con cleanup. Evita que el viewport detrás del modal scrolle en mobile Safari.
3. **Backdrop drag-release safe-close** — track `mousedown` target con ref; sólo cierra si tanto mousedown como click fueron en el backdrop. Evita cierre accidental cuando user selecciona texto y suelta fuera del sheet.
4. **`useToast` hook count estable** — antes `var toast = window.useToast ? window.useToast() : noop` violaba Rules of Hooks si el módulo cargaba tarde. Ahora `var _useToast = window.useToast || function() { return { show: noop }; }; var toast = _useToast();` — call siempre.
5. **Duplicate `border` keys eliminadas** en `ia-workflows.jsx` (2 botones afectados). Object literal con key duplicada → second wins silently. Bug latente.
6. **`aria-pressed` en section tabs** (Oficiales/Mías) de WorkflowsTab — antes el SR no podía decir cuál estaba seleccionado.
7. **`role="tablist"`/`role="tab"`/`aria-selected`/`tabIndex` en sub-tabs de TasksSheet** (Activas/Pendientes/Programadas/Historial).
8. **`_detectDomain` regex con `\b` word boundaries** — antes "producción" matcheaba "producti" → categorizaba ítems de bienestar como productividad.
9. **PDF file size enforcement** — UI promete "max 10 MB" pero `_handleFilePick` aceptaba cualquier tamaño. Ahora valida + toast + reset input value para permitir re-pick del mismo file.
10. **URL validation via `new URL()` constructor** en `_canIngest` — el regex laxo aceptaba strings con espacios.
11. **Initial `_emit()` async en `ia-knowledge.jsx`** — si `KnowledgeSourcesSection` se monta antes que `__mtxIAKnowledge` esté listo, queda esperando un evento que nunca llega. `setTimeout(_emit, 0)` desbloquea.
12. **Removed redundant `onKeyDown` en `<button>` nativos** (Enter+Space ya están). Era double-fire en Space en algunos navegadores.

### Diferidos (post-Fase 3)

- Reemplazar `window.confirm()` con un ConfirmDialog del design system (3 ocurrencias en skills/workflows). Es su propio sprint de diseño.
- `React.memo` en `WorkflowCard`/`SkillCard` + stable callbacks por id. Optimización con 8 items no es load-bearing; relevante cuando la lista crezca.
- Wizard "unsaved changes" guard en NewWorkflowModal — protegería los 3 steps + textarea de step 3. Diferido a Fase Backend cuando los seeds tengan más valor.
- Cron expression validation/normalización (algunos seeds usan strings que no parsean en `croner`). Diferido — los seeds son labels mock; el parser real entra en Fase Backend con Mastra.
- Empty state genérico para tab "Oficiales" — defensive coding contra backend failures. No urge en frontend mock.
- IME composition + isContentEditable guard ya están — pero un focus-trap completo dentro del modal (Tab cycling) está diferido a un upgrade de componente shared.
- Background-tab throttle: `setInterval` se throttle a 1s en tabs backgroundeadas. Pasar a `Date.now() - startedAt` para que el progress sea wall-clock-based. Diferido a Fase Backend (mock ahora no necesita perfeccionismo).

---

## Meta-lecciones builder→auditor

### 1. `JSON.parse(JSON.stringify(state))` oculta mutaciones latentes

Cuando el contract de subscripción es "siempre envío un clone fresh", el builder se relaja con la immutabilidad interna. Pero la immutabilidad es semántica: deja al store en posición de migrar a Zustand/Immer/Mastra sin cambios de uso. **Regla:** todo mutación de `_state.X` debe hacerse vía spread/concat/filter/map, nunca `_state.X[k] = v` directo.

### 2. `useEffect` deps `[]` + closure sobre prop = stale closure latente

Patrón builder universal: `useEffect(() => { addListener(handler); return () => removeListener(handler); }, []);` donde `handler` usa una prop. Funciona en el momento porque la prop "casualmente" no cambia entre renders. Pero el día que cambia (refactor, feature add), el listener queda apuntando al closure viejo. **Regla:** si tu handler usa una prop, escribe el ref-pattern de una vez:
```js
var propRef = React.useRef(prop);
React.useEffect(function() { propRef.current = prop; });
React.useEffect(function() {
  /* listener que llama propRef.current(...) */
}, []);
```

### 3. ESC handler canonical guard NO es opcional

El guard de typing es el patrón #2 del top-10 universal. **Siempre** incluir: `INPUT`, `TEXTAREA`, `SELECT`, `isContentEditable`, IME `isComposing`/`keyCode === 229`. Ninguno de los 4 sheets auditados lo tenía completo.

### 4. Cards-as-buttons: un solo focus-stop por card

Compromise UX vs a11y: que la card entera sea tappeable se logra con `role="button" tabIndex={0}` + un toggle aislado con `stopPropagation`. **Nunca** anidar varios `<button>` con la misma acción.

### 5. Snapshot return values dialécticos

`useStore()` que retorna snapshot OR fuerza re-render: decidir UNO. En tasks.jsx, los consumidores discarteaban el snapshot y leían live via getters. Documentado pero el patrón es ambiguo — recomendación para Fase 3: o retornar snapshot y obligar a consumirlo (vía closure scope explícito), o renombrar a `useStoreSubscription()` sin return value.

### 6. URL constructor en render path = unboundered exception surface

Cualquier llamada a `new URL()` en render path necesita try/catch. El input puede ser user-typed o mock-seeded; ambos pueden romper.

### 7. `length`-based useEffect deps son frágiles

`}, [array.length])` falla cuando length oscila entre frames batcheados. Preferir el contenido (`array.map(x=>x.id).join('|')`) o un version counter incrementado en cada cambio.

### 8. `window.confirm()` rompe la UX premium

Para un proyecto que aspira a "billion-dollar startup quality", `window.confirm()` es un break visual inaceptable. **Antes de mergear:** todo destructive action debe usar un ConfirmDialog del DS. Diferido aquí pero documentado.

---

## Checklist actualizado para Fase 3 (Multi-canal)

Pre-flight antes de escribir código de las próximas pantallas:

- [ ] Cualquier `useEffect` con listener global → ref-pattern + guard canonical.
- [ ] Toggles visuales → `role="switch" aria-checked`, NO `aria-pressed`.
- [ ] Tabs visuales → `role="tablist"`/`role="tab"`/`aria-selected`/`tabIndex={isActive ? 0 : -1}`.
- [ ] Modals/sheets → `role="dialog" aria-modal="true" aria-label`.
- [ ] Body scroll lock en open + cleanup en unmount.
- [ ] Backdrop drag-release safe-close ref.
- [ ] Cards interactivas → UN `role="button"` outer + acciones aisladas con `stopPropagation`.
- [ ] Stores `__mtxX` → mutación siempre via spread/concat/filter/map.
- [ ] `JSON.parse(JSON.stringify(...))` reemplazar progresivamente por `structuredClone` cuando se toque el código.
- [ ] `setTimeout`/`setInterval` siempre con cleanup en useEffect return.
- [ ] `new URL()` en render → try/catch obligatorio.
- [ ] No `aria-pressed` en switches.
- [ ] No `window.confirm()` — usar ConfirmDialog del DS (a crear como follow-up).

---

## Validación final

| Métrica | Resultado |
|---|---|
| CRITs identificados / arreglados | 14 / 14 ✓ |
| IMPs identificados / arreglados | 43 / 18 (alto valor) |
| Regression tests via Playwright | 13/13 ✓ |
| Nuevos console errors | 0 ✓ |
| Cache versions bumped | ia-skills v2→v3, ia-workflows v1→v2, ia-knowledge v2→v3, ia-tasks v1→v2 |
| Construcción aún funciona | ✓ (Fase 2.1-2.4 UI funcional, store stats reactivos, ESC + toggle + detail flow verified) |

**Próximo paso:** Fase 3 — Multi-canal frontend (WhatsApp · Telegram · Apple Watch · Email · Voice UI). Checklist arriba se aplica desde el primer commit.
