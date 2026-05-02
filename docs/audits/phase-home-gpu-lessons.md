# Phase Home — GPU + UX audit

**Construct commits**: `2076661` (auto-routines), `77dd86b` (z-index + row inline + height fix), `d0538a1` (created sheet + compact rows), `2a2c92c` (Listo button height).

**Audit commit**: this audit (TBD — same turn as the doc).

**Date**: 2026-05-02

**Scope**: All home-tab files touched in this sprint:
- `screens/home-inactive.jsx`
- `screens/home-active.jsx`
- `screens/custom-time-modal.jsx`
- `screens/auto-routines.jsx` (new file: AutoRoutineCreateSheet + AutoRoutineCreatedSheet + store)
- `screens/apps-editor.jsx`
- `screens/routines-editor.jsx`
- `Mentex Home.html` (router/wiring changes)

**User-requested focus**: GPU/perf bugs (rendering jank from blurs/animations stacking).

---

## Findings: 0 CRIT + 6 IMP

No critical bugs (no data corruption, no race conditions, no security holes, no
WCAG fails on critical paths). The audit caught 4 GPU/perf issues and 2
UX/a11y consistency issues, all classified IMP.

### IMP-1 — `filter: blur()` halos sin compositing hint

**Files**: `home-active.jsx` (líneas 183, 934, 1167) + `home-inactive.jsx` (línea 325).

**Root cause**: el builder mode escribió decorative halos con
`filter: blur(18-24px)` pero sin `willChange: 'transform'` ni
`transform: translateZ(0)`. Sin estos hints el browser puede no
promover el halo a su propio compositing layer — cada frame de
animación de hermanos (cards aledañas, wave bars, fade-ins) fuerza
re-rasterización del blur, que es la operación más cara del pipeline.

**Síntoma esperado en hardware débil**: drops de FPS al hacer scroll o
mientras corre el cronómetro de la sesión activa.

**Fix**: añadir `transform: 'translateZ(0)'` (o composer al transform
existente) + `willChange: 'transform'` a cada halo decorativo.

**Pin (regression test)**: smoke test verifica `getComputedStyle(halo).willChange === 'transform'` o transform matrix presente para cada `<div>` con `filter: blur` + `pointerEvents: none`.

### IMP-2 — Infinite animations sin GPU compositing

**Files**: `home-active.jsx` Waveform (línea 66, mtxWave bars × N) + dot pulse de "Sesión activa" (línea 1122).

**Root cause**: animaciones `infinite alternate` que solo cambian
`transform: scaleY()` u `opacity`, idealmente GPU-friendly, pero sin
`willChange` el browser puede dudar en promover. Resultado: el
viewport entero se repinta en cada keyframe.

**Fix**: `willChange: 'transform'` en wave bars; `willChange: 'transform, opacity'` en el pulse dot.

**Por qué no `transform: translateZ(0)`**: `mtxWave` ya usa
`transform: scaleY()` como animation target — no podemos sobreescribirlo.
`willChange` solo es suficiente para el promote.

### IMP-3 — `transition: 'all'` repinta cualquier prop change

**Files**: `apps-editor.jsx` líneas 253 (CategoryChip) y 393 (Checkmark).

**Root cause**: `transition: 'all .25s'` hace que CUALQUIER cambio de
prop (incluso `border-color` por hover de hermano) dispare la
transición. Repaints innecesarios.

**Fix**: especificar las props que realmente cambian. Ejemplo en
Checkmark: `transition: 'background .25s, transform .25s, box-shadow .25s, color .25s'`.

**Lección**: cuando se quiera transicionar varias props, listarlas
explícitamente. Nunca `'all'` en producción.

### IMP-4 (declined) — backdrop-filter stacking

**Observación**: cuando `AutoRoutineCreateSheet` (z=90) abre y el user
tap "Apps a bloquear", `apps-editor` (z=100) renderiza encima. En ese
momento hay 4 layers de backdrop-filter superpuestos (2 backdrops + 2
sheets, cada uno con blur 8-40px).

**Decisión**: NO arreglar. El backdrop del sub-editor cubre completamente
al sheet padre, y los browsers modernos optimizan layers totalmente
ocluidos. La complejidad de coordinar `pause-blur-when-occluded` no
justifica el ROI en hardware moderno.

**Re-evaluar si**: el user reporta jank específico al abrir sub-editor
desde auto-rutina en hardware mid-tier.

### IMP-5 — ESC handler missing

**Files**: `custom-time-modal.jsx`, `auto-routines.jsx` (CreateSheet + CreatedSheet).

**Root cause**: `apps-editor` y `routines-editor` SÍ tienen ESC handler.
Los 3 modales nuevos/existentes no — inconsistencia que rompe la
expectativa de teclado en desktop (Escape == dismiss).

**Fix**: hook inline `useEffect(() => { ... }, [open, onClose])` con
guard `isTypingInEditable` (CLAUDE.md blind spot #2). Aunque ninguno
de estos modales tiene `<input>` editables hoy, el guard es defensivo:
si alguien añade un input search en el futuro, ESC ya no roba la
tecla mid-typing.

**Pin**: 6 smoke tests dispatch `KeyboardEvent('keydown', {key:'Escape'})`
y verifican que cada modal cierra correctamente.

### IMP-6 — Day pills sin aria-label en CreatedSheet

**Files**: `auto-routines.jsx` AutoRoutineCreatedSheet day pills.

**Root cause**: las pills son `<div>` con texto `L M X J V S D` —
single letters sin contexto. Screen readers leen "L" sin saber qué
significa.

**Fix**:
- `role="list"` en el wrapper con `aria-label` resumen ("Días activos: Lunes, Martes, ...").
- `role="listitem"` en cada pill con `aria-label="Lunes: activo"` (o "inactivo").
- Mantener el texto visual `L` para diseño.

**Pin**: smoke verifica que las 7 pills tengan exactamente el patrón regex `/^(Lunes|Martes|...): (activo|inactivo)$/`.

---

## Stress tests aplicados

**Builder-mode-trap** | **Status**
--|--
Spam ESC 50× sin nada abierto | 0 errors
Rapid open/close 10 ciclos modal de tiempo | 0 leftovers, 0 errors
Cambio de tab con modal abierto | 0 errors
Verificar 7/7 day pills con aria-label correcto | pass
Verificar GPU compositing aplicado a halos | pass

12 tests · 0 errors · 0 unhandled rejections · 0 page errors.

---

## Meta-lecciones para futuras phases del home

1. **GPU hints son baratos pero invisibles**: `willChange` y `translateZ(0)` no cambian visual pero pueden duplicar el FPS en low-end. Aplicarlos a CUALQUIER `filter: blur()`, `radial-gradient()` decorativo, o animación infinita por defecto.

2. **`transition: 'all'` es deuda técnica desde el día 1**: si veo este pattern en cualquier audit futuro, es regression. Listar props específicas.

3. **ESC handlers son obligatorios para modales en desktop**: extender el patrón ya existente en apps-editor a TODO modal nuevo. Considerar factorizar en un `useEscClose(open, onClose)` hook si ya hay 5+ usos.

4. **`role="list"` + `role="listitem"` para grids semánticos read-only**: siempre que se renderen N elementos visualmente uniformes que comuniquen un set, marcarlos como list. Aplica a day pills, filter chips activos, badges.

5. **Single-letter labels = aria-label obligatorio**: nunca dejar `L`, `X`, `J` solos como contenido textual. SR users no tienen contexto.

---

## Updated checklist (para construct mode)

Antes de hacer commit en cualquier phase del home:

- [ ] Cualquier `filter: blur()` decorativo tiene `willChange: 'transform'` + `translateZ(0)` (o composed transform).
- [ ] Cualquier `animation` infinita tiene `willChange` con las props animadas.
- [ ] No `transition: 'all'` — listar props.
- [ ] Cada modal con `open` prop tiene ESC handler con guard `isTypingInEditable`.
- [ ] Cada elemento single-letter (day pill, status badge) tiene `aria-label`.
- [ ] Stacked overlays: el padre tiene zIndex menor que sus children (el child cubre con su propio backdrop).

---

## Backlog detected during audit (NOT fixed in this audit)

- `home-active.jsx` `onHandleMove` ejecuta `setDragY()` en pointermove → re-render por cada pixel de drag. Bounded (drag dura <1s), pero podría usar `requestAnimationFrame` throttle si se observa jank.
- `home-active.jsx` línea 1078: `setInterval(setElapsedSec)` cada 1s — re-renderiza tab entera del home active. Considerar usar ref + selector pattern si el tab crece.

Estos NO son CRIT ni IMP urgentes — son observaciones para reconsiderar si el home active escala más componentes en el futuro.
