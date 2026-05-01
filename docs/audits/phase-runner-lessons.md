# Phase Runner — Lessons (audit C-A-R)

Construction commits: `558fefd`, `001039a`, `6e01947`
Audit commit: este commit.

## CRIT-1 — `pointer-events: none` en portal mount root rompe TODOS los hijos via portal

### Lo que pasó

Para arreglar que el companion bar del ActivityRunner se cortara debajo del
frame del iPhone (cuando el contenido del Home crecía a >1500px y el
overlay-root sin position se anclaba al scrollable container en vez del
IOSDevice), añadí en `Mentex Home.html`:

```jsx
<div id="mtx-overlay-root" style={{
  position: 'absolute', inset: 0,
  pointerEvents: 'none',
}}/>
```

La intención era que `inset:0` fijara el overlay al frame del iPhone, y
`pointerEvents:none` dejara pasar clicks por las zonas vacías al Home detrás.

**Efecto real**: TODOS los overlays montados via `createPortal(content, overlayRoot)`
quedaron sin clicks:

- VideoSheet (`global-player.jsx`)
- VideoPlayerFullscreen (`global-player.jsx`)
- PlaylistQueueSheet (`global-player.jsx`)
- ActivityRunner / AddContentScreen (`activity-runner.jsx`)
- 5+ sheets en `profile.jsx`, `user-profile-flow.jsx`, `ranking-flow.jsx`, `explore-flow.jsx`

Síntoma reportado por el usuario: cerrar / minimizar fullscreen no funcionaba.

### Root cause

**`pointer-events` ES una propiedad CSS heredable** (MDN: "Inherited: yes"). Mi
suposición de "los hijos con default `auto` siguen recibiendo eventos" era
incorrecta — los hijos sin `pointer-events` explícito heredan `none` del padre,
y su computed value pasa a `none`. Verificado empíricamente:

```js
const cs = getComputedStyle(closeBtn);  // pointer-events: 'none'
const elAtPoint = document.elementFromPoint(cx, cy);  // → DIV (no el btn)
```

`elementFromPoint` falla porque hit-testing salta el subtree completo cuando
el ancestor tiene `pointer-events:none` y los hijos no lo overrideán.

### Fix

Revertir `mtx-overlay-root` al state previo (sin `style`). Los hijos absolute
con `inset:0` se anclan al IOSDevice container (`position:relative, height:874`)
igual que antes — funcionaba bien para todos los overlays excepto el specific
caso del runner que se cortaba en viewports headless < 874.

El "muy pegado al borde" que el usuario reportó del companion del runner se
mitiga subiendo el safe space inferior de 18 → 28 px (cambio cosmético, no
estructural).

### Test que pinea el fix

Si en futuro alguien pone `pointer-events:none` en un portal mount root, este
test debería fallar:

```js
const orRoot = document.getElementById('mtx-overlay-root');
const cs = getComputedStyle(orRoot);
assert.equal(cs.pointerEvents, 'auto');  // o 'inherit', pero NUNCA 'none'

// Y verificar que un overlay montado via portal recibe clicks:
window.__mtxGlobalPlayer.openPlayer({ id:'x', title:'X', author:'X', type:'audiobook' });
const closeBtn = document.querySelector('[aria-label="Cerrar reproductor"]');
const r = closeBtn.getBoundingClientRect();
const elAt = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
assert.ok(elAt === closeBtn || closeBtn.contains(elAt));
```

## Builder-mode blind spot

Añadir al checklist global del C-A-R protocol:

### #11 — `pointer-events: none` en padre rompe a TODOS los hijos via portal

```js
<div id="portal-root" style={{ pointerEvents: 'none' }}/>  // ❌
// Hijos via createPortal heredan 'none' → clicks rotos en cascada
```

**Cuándo aplica**: cualquier portal mount root, overlay container, o capa de
"transparent click-through". `pointer-events` es CSS heredable; los hijos
sin valor explícito heredan y se vuelven no-interactivos.

**Fix correcto** (si necesitas click-through):
- Aplicar `pointer-events:auto` EXPLÍCITO a cada hijo directo del root, O
- NO usar `pointer-events:none` en el root y diseñar para que el root no
  capture clicks por sí mismo (sin background, sin position cubriendo área
  vacía cuando no hay overlays activos).

**Test mínimo**: para cada portal mount root, verificar que un overlay típico
recibe clicks via `elementFromPoint`.

## Meta-lesson — verificar suposiciones CSS empíricamente, no de memoria

Mi suposición sobre la herencia de `pointer-events` venía de memoria
incorrecta. La regla CSS está documentada en MDN; debí verificar antes de
hacer un cambio que afecta a 15+ portal consumers.

**Regla**: cuando un cambio toca CSS de bajo nivel (display, position,
pointer-events, z-index stacking), verificar el computed style de los hijos
afectados con `getComputedStyle` ANTES de declarar el fix completo.

## Updated checklist for runner phase

- [x] Hooks order ANTES de cualquier early return (P-#9)
- [x] No mutar el `mtx-overlay-root` con propiedades CSS que afecten cascada
- [ ] Si necesitas un overlay anclado al frame del iPhone con click-through,
      considerar wrapper aparte con `pointer-events:none` y opt-in en hijos,
      NO modificar el portal mount root global.
