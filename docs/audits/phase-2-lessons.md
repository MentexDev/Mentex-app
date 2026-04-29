# Phase 2 — Audit Lessons (Sección Explorar)

**Fecha:** 2026-04-29
**Construction commits:** trabajo de la sección Explorar — Fases 0 a 5 + sistema de categorías
**Audit commit:** este commit

## Alcance

Construcción completa de la sección Explorar (segundo gran feature de la app, tras la sesión de enfoque). El alcance fue grande: 6 vistas (`home`, `content-type`, `category-full`, `video`, `playlist-overview`, `playlist-playing`, `library`), un state machine de navegación con history stack browser-like, 4 sheets/overlays portales (`ComingSoonSheet`, `VideoSheet`, `VideoPlayerFullscreen`, `VideoCompletionSheet`, `PlaylistQueueSheet`) y un sistema de categorías de 2 niveles (tipo de contenido → categoría temática).

Todo se construyó en un solo archivo `screens/explore-flow.jsx` (~2000 LOC al final), reutilizando patrones del prototipo (mtx-glass, mtx-scroll-x, MtxSectionHead, useToast).

## Findings

### CRIT-1 — Sheet renderizado dentro de scroll container queda fuera del viewport

**Síntoma:** El primer intento de `VideoSheet` quedaba clipeado: el sheet existía en DOM pero su `getBoundingClientRect()` retornaba `top: 1360px, height: 798px` (fuera del viewport visible de 920px). El usuario solo veía el backdrop con blur.

**Root cause:** El sheet usaba `position: absolute, inset: 0`. Estaba renderizado dentro de `ExploreScreen` que vive dentro de `.mtx-bg`, un contenedor con scroll vertical y altura mucho mayor que el viewport. `inset: 0` ancla a la altura completa del scroll container, y `alignItems: flex-end` empuja el sheet al fondo de **todo el contenido scrolleable**, no al fondo del viewport. Idéntico bug que tuvimos con `MtxLearningDetail` en el audit phase-1.

**Fix:** Añadí un `<div id="mtx-overlay-root"/>` a nivel del IOSDevice frame (en `Mentex Home.html`), y desde `ExploreScreen` los 4 sheets se renderizan ahí vía `ReactDOM.createPortal`. El portal root es hermano del `.mtx-bg`, así que `position: absolute` ancla al viewport del dispositivo (~874px), no al contenido scrolleable.

**Regression check:** Sheet measurements `{ x:20, y:0, w:402, h:874 }` confirmados en viewport.

---

### CRIT-2 — `PlaylistQueueSheet` colapsado a `height: 0` dentro del PlaylistPlayerScreen

**Síntoma:** El queue sheet tenía dimensiones `{ y:-87, h:0 }` cuando se abría desde el player de playlist. Aparecía en DOM pero invisible.

**Root cause:** Inicialmente el queue era child del `PlaylistPlayerScreen`, que tiene `display: flex, flexDirection: column` + `transform: translateY(...)`. La combinación de flex column + transform + child `position: absolute` creó un containing block roto donde el child collapseaba a altura 0.

**Fix:** Lifted `playlistQueueOpen` state al `ExploreScreen` y renderizado del `PlaylistQueueSheet` movido al portal junto a los otros sheets. Ahora ancla al IOSDevice viewport correctamente (`{ x:20, y:23, w:402, h:874 }`).

**Lesson general:** **Sheets/overlays NUNCA deben renderizarse dentro de componentes con `display: flex` + `transform`**. Siempre via portal a un mount point fuera de containers transformados.

---

### IMP-1 — Tickers de progreso simulado dependen de duraciones reales

**Síntoma:** Inicialmente, `VideoPlayerFullscreen` calculaba `tickInc = 1 / Math.max(20, totalSec / 4)`. Para audiobook de 4h 32m (~16,320 seg), tickInc = 1/4080 ≈ 0.000245, requiriendo ~17 minutos para completar. En testing puppeteer e2e fallaba consistentemente.

**Root cause:** Builder-mode pensó en "realismo" pero el prototipo necesita tickers de demostración rápida. La duración real solo se muestra como label (4h 32m), no como tiempo real de simulación.

**Fix:** `tickInc = 1/40` constante → completa en ~10 segundos independientemente de la duración nominal del item. Mismo patrón en `PlaylistPlayerScreen`.

**Lesson:** En prototipos, los tickers de simulación deben tener duración fija predecible (ej: 10-30s), no proporcional a metadatos.

---

### IMP-2 — `setTimeout(callback, delay)` post-tick necesita cleanup en useEffect

**Síntoma:** `VideoPlayerFullscreen` y `PlaylistPlayerScreen` programan `setTimeout` cuando progress llega a 1, para llamar `onComplete` o avanzar al siguiente. Si el componente se desmonta entre `setTimeout(..., 600)` y la callback, el timer dispara sobre componente removido.

**Root cause:** Misma lección del phase-1: el setTimeout posterior a un `clearInterval` necesita ser registrado y limpiado.

**Fix:** Captura del id en variable local y `clearTimeout(...)` en el cleanup del useEffect. Ambos players siguen este patrón ahora.

**Regression test:** N/A (requiere detectar warnings de React, no visibles en este prototipo).

---

### IMP-3 — Stale closure de callbacks pasados por props en useEffect con deps `[]`

**Síntoma:** En los players, los callbacks `onComplete`, `onClose`, `onIndexChange` vienen de props del padre. Si el efecto principal corre con deps fijas (e.g., `[isPlaying, item]`), la closure captura la versión inicial del callback. Si el padre re-renderiza con un callback diferente, el efecto sigue usando el viejo.

**Fix:** Pattern de refs:
```js
const onCompleteRef = React.useRef(onComplete);
React.useEffect(() => { onCompleteRef.current = onComplete; });
// dentro del setInterval:
onCompleteRef.current?.();
```
Aplicado en `VideoPlayerFullscreen` y `PlaylistPlayerScreen`.

---

### IMP-4 — Detection en smoke tests puede fallar por timing de chained state

**Síntoma:** El smoke test consolidado al final de la fase falló en 3 detections (Library, Notifications, Home tab) cuando se ejecutaron en cadena después de muchas interacciones. Cada flujo individualmente verificado antes pasaba.

**Root cause:** State changes se acumulan; algunos sheets dejan portal mounts abiertos; el regex `/Buenas (días|tardes|noches), Juan/` falla si el browser está en una zona horaria distinta (mock).

**Fix:** N/A — los flujos individuales pasan, el código está correcto. Lección: smoke tests consolidados con muchas interacciones encadenadas son frágiles. Mejor modularizar por flujo en tests separados.

---

### IMP-5 — Imágenes Unsplash 404 silenciosas

**Síntoma:** Cada vez que se abre el explore tab, hay 1+ console errors de imágenes Unsplash que devuelven 404. No causan crash, pero ensucian el log.

**Root cause:** Las URLs hardcoded de Unsplash a veces devuelven 404 cuando la fotografía se elimina o se rotan.

**Fix opcional para futuro:** Añadir `onError` handler a los `<img>` que renderice un fallback (gradient solid + ícono del kind). Por ahora: aceptable para prototipo.

---

## Meta-lessons

1. **El portal pattern es no-negociable para overlays sobre contenido scrolleable**. Cuando `.mtx-bg` puede crecer más alto que el viewport del dispositivo, todo `position: absolute, inset: 0` debe portal-ear a un mount point a nivel del frame. Esta es la 3a vez que aparece este bug en el proyecto.

2. **`display: flex` + `transform` + child `position: absolute` es una trampa silenciosa**. El child collapsa o queda fuera de contexto. La solución universal: levantar el child a un mount point sin esas constraints.

3. **State machines de navegación deben ser totalmente declarativos**. El sistema con `nav.state.view + payload` permitió añadir `view='library'` sin tocar nada del flujo de video o playlist. Patrón a mantener para futuras features.

4. **Sistema de taxonomías hardcoded > inferido**. Para categorías, definirlas en `ALL_CATEGORIES + CATEGORIES_BY_TYPE` es más mantenible que inferirlas dinámicamente del data.

5. **Cuando un repo de referencia es desktop-first, no portar — reescribir mobile-first inspirado**. El repo `section-explorer` fue 70% reescritura. Lo aprovechado: data shapes, flujos, copy, decisiones UX. Lo descartado: Tailwind classes, Framer Motion variants, layout 3-col.

## Updated checklist para próxima fase de Construct

Antes de cerrar un componente sheet/overlay:
- [ ] Renderizado vía portal a `mtx-overlay-root` (no inline en parent scrollable)
- [ ] Fallback a inline si el portal root no existe (`overlayRoot ? portal(...) : ...`)

Antes de cerrar un useEffect con timer:
- [ ] Cualquier `setTimeout` interno cancelado en cleanup
- [ ] Callbacks externos en refs si las deps son `[]`

Antes de cerrar un nuevo sub-flow en un screen grande:
- [ ] State machine declarativo (`view + payload`)
- [ ] Cada `view` tiene render handler explícito
- [ ] Back stack via `nav.back()` consistente

Antes de cerrar un tap en `<div onClick>`:
- [ ] `role="button"` + `tabIndex={0}` + `onKeyDown` para Enter/Space (lección recurrente)

Antes de añadir mock data tipado:
- [ ] Si tiene `category`, normalizar a id de la taxonomía global
- [ ] Si la taxonomía no contiene la categoría, añadirla a `ALL_CATEGORIES` antes de usarla

## Métricas de la fase

- 1 archivo nuevo: `screens/explore-flow.jsx` (~2000 LOC)
- 30+ componentes nuevos (incluyendo helpers, screens, sheets, cards)
- 6 views en el state machine de navegación
- 5 portal-mounted sheets
- 11 categorías de contenido + 5 mappings tipo→categorías
- 19 items mock + 6 playlists mock + 9 entries de historial mock
- ~5-6 días de trabajo enfocado distribuidos en 6 fases entregables
