# Audit — Sección Explorar (ContentDetail v2, Share, Downloads, VideoPlayer)

**Sprint:** explore-flow v72→v79  
**Construcción:** ContentDetailScreen hero full-bleed + fila scrolleable, ShareSheet v2 + ShareMoreSheet, sección Descargas en LibraryScreen, ChaptersSheet en VideoPlayerFullscreen  
**Commit de construcción:** rama main, pre-audit

---

## Hallazgos y fixes

### CRIT × 5 — División por cero: `totalSec <= 0` en VideoPlayerFullscreen

**Root cause (builder-mode blind spot #2):** El builder asumió que `_parseDuration(item.dur)` siempre retorna un valor positivo. Si `item.dur` está ausente o en formato inválido, `totalSec = 0`, y las operaciones `sec / totalSec` producen `Infinity` o `NaN` que corrompen el estado de `progress`.

**Afectados:**
- `skip(sec)` → `p + sec / totalSec`
- `handleJumpToBookmark(sec)` → `sec / totalSec`
- `chapterMarkers` useMemo → `(cum / totalSec) * 100`
- `bookmarkMarkers` useMemo → `(b.sec / totalSec) * 100`
- `onSeek` prop de `ChaptersSheet` → `sec / totalSec`

**Fix aplicado:** Guard `if (totalSec <= 0) return;` en funciones imperativas; `if (!item || totalSec <= 0) return []` en memos.

**Lesson:** Siempre guardar divisiones donde el denominador viene de datos externos (duración parseada). Patrón: derivar `totalSec` con `Math.max(1, _parseDuration(...))` para eliminar el riesgo desde la raíz.

---

### CRIT × 1 — `onKeyDown` faltante en botones nav de ContentDetailScreen

**Root cause (blind spot #4):** Botones `<button>` reales con `tabIndex={0}` pero sin `onKeyDown`. Aunque `<button>` nativo sí responde a Enter/Space en la mayoría de browsers, la inconsistencia con el resto del codebase (donde siempre se añade el handler explícito) podía confundir y fallar en webviews embebidos.

**Fix:** `onKeyDown={(e) => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); fn(); } }}` en ambos botones del nav (Compartir + Más opciones).

---

### IMP × 1 — `setTimeout` en `ShareSheet.handleCopyLink` sin cleanup (memory leak)

**Root cause (blind spot #8):** `setTimeout(() => setCopied(false), 2400)` directo en el handler. Si el sheet se desmonta antes de 2400ms, React intenta `setState` en un componente desmontado. Adicionalmente, toques rápidos en "Copiar" acumulaban timers.

**Fix:** Moved a `useEffect([copied])` con `return () => clearTimeout(t)` — el timer se cancela al desmontar o si `copied` cambia de nuevo.

---

### IMP × 1 — `window.__mtxRitual.add` sin optional chain

**Root cause:** `if (item && window.__mtxRitual) window.__mtxRitual.add(...)` — verifica que el objeto existe pero no que el método `.add` sea una función. Si el objeto se inicializa parcialmente, lanza `TypeError`.

**Fix:** `window.__mtxRitual?.add(...)` con optional chain completa.

---

### IMP × 1 — `author.bio.split('.')` lógica frágil

**Root cause:** Si `author.bio` no contiene puntos, `split('.')` retorna un array de 1 elemento, `slice(0,2)` lo pasa sin cambios, y el `+ '.'` añade un punto redundante. Si el bio tiene abreviaturas con punto (e.g. "Ph.D"), el split fragmenta mal.

**Fix:** `split('.').map(s => s.trim()).filter(Boolean)` para obtener oraciones limpias, luego reconstruir `sentences[0] + '. ' + sentences[1] + '.'`.

---

### IMP × 1 — `ChaptersSheet.chapterStarts`: `String(ch.d)` sin fallback

**Root cause:** `String(ch.d).match(...)` — si `ch.d` es undefined, `String(undefined)` = `"undefined"`, el regex no matchea, `parseInt` recibe null → retorna NaN, y `cum += NaN * 60 = NaN`.

**Fix:** `String(ch.d || '0')` — fallback a '0' antes del match.

---

### IMP × 1 — `PremiumSuccessScreen`: confeti con `animation-iteration-count: infinite`

**Root cause:** 34 piezas de confeti animadas indefinidamente con `infinite`. La pantalla puede estar montada varios minutos sin interacción (usuario lee el contenido), quemando recursos de GPU innecesariamente.

**Fix:** `infinite` → `2` iteraciones. Con delays entre 0 y 4.77s y duración 3–4.9s, 2 loops cubren ~20 segundos de animación festiva — más que suficiente para la celebración post-plan.

---

## Meta-lessons para próximos sprints

1. **Denominadores siempre guardados.** Cualquier `x / y` donde `y` venga de datos externos (duración parseada, length de array, conteo de usuarios) necesita guard antes de la división. Considerar `_parseDuration` que retorne `Math.max(1, parsed)`.

2. **`useEffect` con cleanup para timeouts reactivos.** El patrón `setTimeout → setState` directo en handlers es siempre un leak potencial. El patrón correcto: `useEffect([flag]) { const t = setTimeout; return () => clearTimeout(t); }`.

3. **Optional chain completa en global APIs.** `window.__mtxX` puede estar presente pero con métodos ausentes. Siempre `window.__mtxX?.method?.()` o verificar `typeof window.__mtxX?.method === 'function'`.

4. **Animaciones `infinite` son un presupuesto de GPU.** Evaluar si el efecto necesita loop real vs. N iteraciones. Para celebraciones/onboarding: 2-3 iteraciones son festivas y no queman recursos.

5. **Bio/text split frágil.** Parsear texto de usuario con `split('.')` asume formato que no siempre se cumple (abreviaturas, puntos decimales, texto sin puntuación). Usar `.filter(Boolean)` y fallback al texto completo.

---

## Checklist adicional para sección Explorar (próximos sprints)

- [ ] `_parseDuration` retornar `Math.max(1, val)` para eliminar riesgo de raíz
- [ ] Prueba de smoke con `item.dur = undefined` y `item.dur = '0m'`
- [ ] Prueba de smoke con `totalSec = 0` en VideoPlayerFullscreen
- [ ] Revisar que todos los `window.__mtxX` globales tengan `.add`, `.remove` etc. documentados
- [ ] Revisar que `PremiumSuccessScreen` tenga test de desmontaje rápido (< 1s)

---

*Audit realizado 2026-05-05 — explore-flow.jsx v79, premium-gate.jsx v4*
