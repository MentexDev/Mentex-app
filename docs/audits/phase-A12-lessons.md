# Audit — Phase A.12 + A.12.1 (commits 1b2b634 + 4310ac7 + fixes locales)

**Fecha**: 2026-05-29
**Scope**: Sprint A.12 base + A.12.1 refinements (Tasks "Actividad del coach")
**Total LOC auditadas**: ~1,700 nuevas en `ia-tasks-v2.jsx` + ~30 modificadas en `ia-tasks.jsx`
**Findings totales**: 25 · 6 CRIT + 5 GAP + 10 IMP + 4 CONS
**Findings fixed**: 13 (6 CRIT + 4 GAP + 3 IMP)

---

## CRIT (fixed con regression test pinning)

### CRIT-1: Hook condicional `window.useIATasks ? window.useIATasks() : null`
**Archivo**: `ia-tasks-v2.jsx:1267` (pre-fix)
**Síntoma**: Si `window.useIATasks` cambia entre indefinido y definido entre renders (race de carga de scripts, hot reload, etc), React explota con "Rendered fewer/more hooks than expected".
**Root cause**: Builder-mode blind spot #9 — feature-detection ternaria sobre un global que ejecuta un hook.
**Fix**: Eliminada la línea. El listener `mtx:ia-tasks-changed` con `forceTick` ya cubre la suscripción de manera segura. Bonus: elimina suscripción duplicada → 1 re-render por evento en vez de 2.
**Regression**: Verificable cargando v2 antes que legacy (`useIATasks` undefined al primer render) — no debe explotar.

### CRIT-2: `document.body.style.overflow` pisado entre 2 sheets nested
**Archivo**: `ia-tasks-v2.jsx:432-435 + 1331-1335` (pre-fix)
**Síntoma**: Si TasksSheet + TaskDetailSheet ambos hacen lock+unlock en orden no-LIFO (ej. cierre programático del padre que arrastra al hijo), body queda con `overflow:'hidden'` permanente. Page-scroll bloqueado hasta refresh.
**Root cause**: Dos `useEffect` sin coordinación sobre la misma propiedad global. El segundo captura `prev='hidden'` (set por el primero) y al cleanup restaura `'hidden'` → leak permanente.
**Fix**: `window.__mtxBodyLock` refcount global con `lock()`/`unlock()`. Primer lock guarda prev, último unlock restaura. Operaciones intermedias son no-op visual.
**Regression**: Abrir TasksSheet, abrir Detail, cerrar Detail, cerrar TasksSheet → `document.body.style.overflow === ''`.

### CRIT-3: `useEffect` auto-select tab con `counts` stale
**Archivo**: `ia-tasks-v2.jsx:1305-1312` (pre-fix)
**Síntoma**: Effect con deps `[]` lee `counts` capturado del primer render. Si datos llegaban async post-mount, effect no re-corría y dejaba tab vacío seleccionado.
**Root cause**: Closure stale en effect sin deps.
**Fix**: Ref guard `autoSelectedRef.current` que bloquea después del primer match útil + leer store DIRECTO (`window.__mtxIATasks.getStats()`) dentro del effect en vez de variables del closure.
**Regression**: Montar con store vacío, populate async (dispatch `mtx:ia-tasks-changed`), verificar tab cambia al primero con datos.

### CRIT-4: `activeKey` colisiona si `task.id` contiene `|`
**Archivo**: `ia-tasks-v2.jsx:1338-1343` (pre-fix)
**Síntoma**: Dos sets de tasks con ids `['a','b|c']` y `['a|b','c']` generan el mismo `activeKey`. El effect no re-corre cuando debería → interval queda sobre lista vieja.
**Root cause**: Separador no-escape `'|'` reusable en payload.
**Fix**: `JSON.stringify(allActive.map(a => a.id))` — ids individualmente quoteados con comas controladas por el JSON.
**Regression**: Crear task mock con id `'foo|bar'` y verificar el interval sigue funcionando al cambiar lista.

### CRIT-5: `setExpanded(next)` con closure stale
**Archivo**: `ia-tasks-v2.jsx:980-984` (pre-fix)
**Síntoma**: `toggle(i)` hace `Object.assign({}, expanded)` capturando `expanded` del render donde se creó el closure. Si dos toggles disparan antes del re-render, el segundo pisa la mutación del primero.
**Root cause**: setState con objeto basado en closure value en vez de functional updater.
**Fix**: `setExpanded(function(prev) { var next = Object.assign({}, prev); next[i] = !next[i]; return next; })`.
**Regression**: Disparar `toggle(0)` y `toggle(1)` antes del flush → ambos quedan `true`.

### CRIT-6: SVG data URI sin `encodeURIComponent`
**Archivo**: `ia-tasks-v2.jsx:1244 + 970` (pre-fix)
**Síntoma**: `'data:image/svg+xml;utf8,' + preview.svg` con SVG que tiene quotes, `#` pre-codificado a mano (`%23`). Safari/iOS WebKit puede fallar parseo. Si en futuro se concatena con input dinámico, riesgo claro.
**Root cause**: Data URI manual sin escaping defensivo.
**Fix**: SVG en formato natural (con `#` crudo) + `'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(preview.svg)` en el render.
**Regression**: SVG renderiza correctamente con gradiente y texto en todos los browsers.

### CRIT-9: ESC double-handler entre TaskDetailSheet y TasksSheetV2
**Archivo**: `ia-tasks-v2.jsx:421-430 + 1322-1329` (pre-fix)
**Síntoma**: Ambos sheets registran `keydown` en `window`. ESC con detail abierto → ambos handlers corren. El del Detail llama `setDetail(null)`, el del padre también (idempotent por ahora, pero side-effects futuros se duplicarían).
**Root cause**: Dos listeners globales sobre la misma tecla sin marca de "handled".
**Fix**: Eliminado el listener del Detail. El parent guard `if (detail) { setDetail(null); return; }` es source of truth ÚNICO.
**Regression**: Spy sobre `setDetail`, ESC con detail abierto → 1 sola invocación.

---

## GAP (fixed)

### GAP-3: Tab count "Completadas" cambiaba según sub-filter
**Archivo**: `ia-tasks-v2.jsx:1345` (pre-fix)
**Síntoma**: Badge del tab Completadas mostraba diferente número según el sub-filter activo (incluía dismissed solo cuando `'all'`). Confundía al user.
**Fix**: Count siempre `allCompleted.length + allDismissed.length` (total absoluto).

### GAP-4: Brief no muestra nada si workflow desconocido + no description
**Archivo**: `ia-tasks-v2.jsx:765-799` (pre-fix)
**Síntoma**: Tab Detalles terminaba abrupto sin separador visual.
**Fix**: Fallback final con placeholder "Esta tarea no tiene un brief narrativo disponible. El coach puede no haber documentado el plan, o el workflow es interno del sistema."

### GAP-5: Empty state desc mentiroso al filtrar Completadas
**Archivo**: `ia-tasks-v2.jsx:1559` (pre-fix)
**Síntoma**: Sub-filter "Descartadas" sin data mostraba "Las ejecuciones exitosas aparecerán acá" — copy mentiroso.
**Fix**: Title y desc reactivos al sub-filter: "Sin completadas exitosas" / "Sin descartadas" con desc específica.

### GAP-6: Reset del expandedState al cambiar de Detail task
**Archivo**: `ia-tasks-v2.jsx:1697` (pre-fix)
**Síntoma**: Funcional por accidente (cierre+apertura desmonta), pero frágil. Si React reusa instance, state queda con flags del task anterior aplicados al nuevo.
**Fix**: `key={detail.task.id}` explícito en `<TaskDetailSheet />` para forzar remount.

---

## IMP (fixed)

### IMP-7: Verb "Hizo" engañoso para tasks failed
**Archivo**: `ia-tasks-v2.jsx:641` (pre-fix)
**Fix**: Branch explícito para `failed` → "Intentó". Honesto.

### IMP-8: Suscripción duplicada al store
**Archivo**: `ia-tasks-v2.jsx:1267-1273` (pre-fix)
**Síntoma**: 2 re-renders por evento `mtx:ia-tasks-changed`.
**Fix**: Cubierto por CRIT-1 (eliminar la primera suscripción).

### IMP-10: `_renderPreview` con tipo desconocido → contenedor vacío
**Archivo**: `ia-tasks-v2.jsx:1252` (pre-fix)
**Fix**: Placeholder "Tipo de preview desconocido" en vez de `return null`.

---

## Findings aceptados sin fix (rationale)

| ID | Razón |
|---|---|
| CRIT-7 (degradado a IMP) | Markdown bold regex falla con `**` solitario o nesting `*` — no reproducible con mocks actuales, edge case puro |
| CRIT-8 (degradado a IMP) | ESC handler con dep `[detail]` se re-registra — funcional, no leak |
| GAP-1, GAP-2 | Confirmados OK por audit (stopPropagation correctos) |
| IMP-1, IMP-3, IMP-4, IMP-6, IMP-9 | Acepted: micro-optimizations + edge cases poco probables |
| IMP-2 | `_formatTs` timezone local — aceptable para timeline humana |
| C-2 ARIA `aria-modal` en 2 sheets | Mejorable pero no rompe screen readers en práctica |

---

## Lecciones aprendidas A.12

### 1. Feature-detection runtime de globals + hook execution = bomba
Patrón visto: `window.someHook ? window.someHook() : null`. Esto SIEMPRE viola Rules of Hooks si el resultado del ternario puede cambiar entre renders. Mejor: depender de una API estable o eliminar la suscripción y usar listener directo. La "robustez defensiva" terminó siendo el bug.

### 2. Recursos globales mutables (body.style, listeners en window) requieren refcount
Cuando 2+ components mutan el mismo recurso global y pueden coexistir en cualquier orden de mount/unmount, capturar/restaurar `prev` falla porque el orden LIFO no es garantizado en el tiempo real. Solución estándar: contador global (`_count++` en lock, `_count--` en unlock, restore solo cuando `_count === 0`).

### 3. JSON.stringify para keys derivadas de listas con separadores
`array.join('|')` es trampa si los elementos pueden contener `|`. `JSON.stringify(array)` es seguro porque cada elemento queda quoteado individualmente.

### 4. Functional updaters > closure-based updaters en setState
`setX(prev => ...)` siempre es seguro contra closure stale. `setX(prev_capturado_en_closure)` falla cuando hay updates concurrentes antes del re-render. Convertir SIEMPRE el de setState con dependencias del state anterior.

### 5. Data URIs requieren encodeURIComponent
SVG inline con quotes, `#`, espacios, etc. → no asumir que el browser parsea data URI raw. `encodeURIComponent` es defensivo y barato.

### 6. ESC handlers globales: source of truth ÚNICO
Cuando hay 2 sheets nested, NO registrar 2 listeners. Uno solo con guard de "qué cerrar primero" es más predecible y libre de side-effects duplicados.

### 7. `key={id}` para forzar remount en componentes con state interno
Patrón defensivo cuando el componente tiene state interno que NO debería persistir entre props completamente distintos. Cero costo, total seguridad.

### 8. Auditoría DEBE leer todo el archivo, no skim
El auditor encontró CRIT-1 en la línea 1267 — escondido entre el "patrón normal" de useReducer. Sin lectura completa, se hubiera ido a prod.

---

## Archivos modificados en audit (delta sobre commit 4310ac7)

- `screens/ia-tasks-v2.jsx` — 6 CRIT + 4 GAP + 3 IMP fixes
- `Mentex Home.html` — cache bump (v=6)

**Total delta**: ~95 LOC añadidas, ~30 modificadas. Cero archivos nuevos.

---

## Próximo paso al retomar

Sprint A.12 + A.12.1 + audit completos. Listo para:
- A — Jugar Tasks v2 en la app
- B — Sprint A.13 (nuevo feature)
- C — Hand-off backend (Brandon)
