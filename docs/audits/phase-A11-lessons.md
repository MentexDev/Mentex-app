# Audit — Phase A.11 (commit 9fbaada + fixes)

**Fecha**: 2026-05-28
**Scope**: Sprint A.11 BreathGate modalidades expandidas (4 modes + driver sheet)
**Total LOC auditadas**: ~1,714 nuevas + ~50 modificadas
**Findings totales**: 11 fix aplicados (7 CRIT + 2 GAP + 1 IMP + 1 CONS) · 7 IMP/GAP/CONS aceptados sin fix

---

## Microajustes UX previo al audit (feedback Diego)

### FIX-UX-1: Sección "Duración respiración" reactiva al activeMode
**Archivo**: `breath-gate-settings-sheet.jsx`
**Síntoma**: Slider se mostraba siempre, incluso en modos `gratitude` / `affirmations` donde NO aplica (self-paced).
**Fix**: Conditional render solo en `mix`, `breath`, `image`. Footnote contextual según modo activo.

### FIX-UX-2: Renombrar "Activar BreathGate" → "Pausa consciente"
**Archivo**: `breath-gate-settings-sheet.jsx`
**Síntoma**: El nombre técnico "BreathGate" implica respiración, pero el feature ahora incluye 4 modalidades (incluso gratitud y decretos que no son respirar).
**Fix**: User-facing strings cambian a "Pausa consciente". Comments / nombres internos de stores/components quedan (técnicos, no visibles).

---

## CRIT (fixed)

### CRIT-1: Stale closure en `onComplete` de `_useBreathTimer`
**Archivo**: `breath-gate.jsx:55-115`
**Síntoma**: `handleBreathDone` se recrea cada render del padre. El effect del timer tiene deps `[durationSec]`, por lo que la closure captura la primera versión. Si el padre re-renderiza por otras razones antes del complete, el RAF tick llama a una versión vieja.
**Root cause**: Callback en useEffect sin ref.
**Fix**: `var onCompleteRef = React.useRef(onComplete); React.useEffect(() => { onCompleteRef.current = onComplete; });` + invocar `onCompleteRef.current()` en el tick.
**Test**: Forzar re-render del padre mid-breath y verificar que el complete sigue funcionando.

### CRIT-2: `document.body.style.overflow` pisado entre mounts consecutivos
**Archivo**: `breath-gate.jsx:142-170`
**Síntoma**: Si el gate se cierra y reabre rápido, el effect del segundo mount captura `prev = 'hidden'` y al cleanup lo restaura a `'hidden'`. Body queda con overflow oculto sobreescribiendo el reset.
**Fix**: En cleanup, restaurar a `''` si lo capturado fue `'hidden'`. Defensivo contra pisado entre mounts.
**Test**: Open/dismiss/open/dismiss rápido x5 → `document.body.style.overflow === ''`.

### CRIT-3: ESC pierde texto del user en Gratitude/Affirmations
**Archivo**: `breath-gate.jsx:155-165`
**Síntoma**: Si user está tipeando en input de gratitud/decretos y presiona ESC, el gate dismiss → pierde TODO lo escrito sin warning.
**Root cause**: Blind-spot #2 del CLAUDE.md — listener global sin `isTypingInEditable` guard.
**Fix**: Check `e.target.tagName === 'INPUT' || 'TEXTAREA' || isContentEditable` → blur el input en vez de dismiss el gate.
**Test**: Llenar input, presionar ESC → gate sigue activo, texto preservado.

### CRIT-4: ESC del settings sheet cierra TAMBIÉN el gate
**Archivo**: `breath-gate-settings-sheet.jsx:320-340` + `breath-gate.jsx:155`
**Síntoma**: Cuando settings sheet abierto, ESC cierra sheet Y gate. Causa: ambos listeners están en `window` directamente. `stopPropagation` / `stopImmediatePropagation` no funcionan porque NO HAY DOM tree para propagar — son hermanos en el mismo target.
**Root cause**: Falsa expectativa de que capture phase + stopImmediatePropagation bloquearía al sibling en bubble. No funciona cuando ambos son window-level.
**Fix**: Flag global `window.__mtxBreathGateSheetOpen` poblado por el sheet en su effect. El gate consulta el flag al inicio de su handler ESC y bail out si está activo.
**Test**: Open gate → open sheet → ESC → sheet cierra, gate sigue activo.

### CRIT-6: Race read-modify-write en `recordTexts`
**Archivo**: `breath-gate-modes.jsx:186-203`
**Síntoma**: `record()` escribe entry. Luego leemos localStorage, asumimos `arr[0]` es nuestra entry, mutamos `texts`, escribimos. Si otro tab/listener escribió entremedias, `arr[0]` puede ser otra entry → pegamos `texts` ajenos.
**Root cause**: Asumir ordering sin verificación por id.
**Fix**: Loop por `arr.find(e => e.id === entry.id)` en vez de `arr[0]`.
**Test**: Simular escritura concurrente desde otro tab → `texts` se escribe al entry correcto.

### CRIT-7: Sheet no se actualiza si settings cambian mientras está abierto
**Archivo**: `breath-gate-settings-sheet.jsx:309-339`
**Síntoma**: Otro componente (futura settings page por ejemplo) cambia `__mtxBreathGateModes.updateSettings()`. El sheet abierto muestra valores stale.
**Root cause**: State local sin listener al evento del store.
**Fix**: Listener para `mtx:gate-modes-settings-changed` + `mtx:apps-break-changed` mientras `open` es true. Cleanup en unmount.
**Test**: Sheet abierto → cambiar settings vía consola → sheet refleja inmediatamente.

---

## GAP (fixed)

### GAP-1: `resetSettings()` no reseteaba la rotación module-state
**Archivo**: `breath-gate-modes.jsx:228-242`
**Síntoma**: User pulsa "Restablecer valores por defecto" pero `_lastPickedMode` / `_lastPickedQuoteId` quedaban con la última pick. Próxima sesión arrancaba con sesgo.
**Fix**: `resetSettings()` también limpia los module-state. Adicional: nueva API `resetRotation()` para limpiar solo la rotación sin tocar settings.
**Test**: Reset → próxima `pickModeForSession()` puede devolver cualquier modo, no excluye el último.

### GAP-5: Cambio de quote en `_ImagePhase` sin animación
**Archivo**: `breath-gate-phases.jsx:140-148`
**Síntoma**: User pulsa "↻ Otra frase" pero el cambio visual es instantáneo, puede pasar desapercibido si las quotes son similares.
**Fix**: `key={quote.id}` en el wrapper de contenido + `animation: mtx-fade-up .35s` → React remontea y la animación corre.
**Test**: Pulsar "Otra frase" → contenido fade-up cada vez.

---

## IMP (fixed)

### IMP-4: Vibration positiva en acción rechazada
**Archivo**: `breath-gate-settings-sheet.jsx:345-365`
**Síntoma**: User intenta apagar la última modalidad activa → toast warn lo rechaza, pero el `_vibrate(25)` ya disparó haptic positivo. Inconsistente.
**Fix**: Pre-check antes de vibrar. Si rechazado, vibrar `[50, 100, 50]` (pattern de error). Si aceptado, `[25]` normal.
**Test**: Apagar last → haptic distinto al normal.

---

## CONS (fixed)

### CONS-3: aria-label repetido sin contexto
**Archivos**: 3 botones ⚙ en `breath-gate.jsx`, `breath-gate-phases.jsx`, `breath-gate-settings-sheet.jsx`
**Síntoma**: Todos tenían "Configurar modalidades del descanso". Screen reader pierde sentido cuando hay varios.
**Fix**: Unificado a "Configurar pausa consciente" (más corto + alineado con el nuevo naming UX).

---

## IMP/GAP/CONS aceptados sin fix (rationale)

| ID | Razón |
|---|---|
| IMP-1 | Module-state `_lastPickedMode` cross-user — prototipo single-user, aceptable |
| IMP-2 | `setTimeout(50)` en `moveTo` sin cleanup — no-op silencioso si unmount, aceptable |
| IMP-3 | `useState(() => pickQuote())` con side effect en StrictMode — solo dev, aceptable |
| IMP-6 | Transition 1.9s vs cycle 2s — margen 100ms, no causa bug observable |
| IMP-7 | aria-label sin contexto de fase — minor, no afecta uso |
| IMP-8 | `totalMs: cleaned.length * 6000` estimación arbitraria — mock, comentado |
| GAP-2 | _ReconsiderPhase sin Volver — las 2 CTAs son la forma de salir, diseño intencional |
| GAP-3 | Slider oculto sin estado disabled — decisión de UX firme |
| GAP-4 | Effect cierra sheet en `!gateActive` redundante — micro, no rompe |
| GAP-6 | `prefixes.length === 0` futuro hypothetical — bug solo si rompemos el catálogo |
| CONS-1 | Naming "descanso" vs "pausa" en strings legacy — aceptable, contexto claro |
| CONS-2 | Vibration patterns — convención documentada, no crítico |

---

## Smoke test end-to-end verificado

| Test | Resultado |
|---|---|
| Modo gratitud render + 3 inputs + Listo | ✅ persiste `{type:'gratitude', texts:[...], cyclesDone:3}` |
| Modo imagen render NT (Nikola Tesla) | ✅ portrait + halo + tag + serif italic |
| Modo decretos render 5 prefijos con paleta purple | ✅ |
| Modo breath con menu ⚙ + slider visible | ✅ |
| Cambio mix → gratitud: slider desaparece | ✅ reactivo |
| Cambio gratitud → mix: slider reaparece | ✅ reactivo |
| ESC con sheet abierto → solo cierra sheet | ✅ gate sigue activo (CRIT-4) |
| ESC con texto en gratitud → no dismiss | ✅ texto preservado (CRIT-3) |
| ESC normal en gate → dismiss + body overflow restaurado | ✅ CRIT-2 |
| Persistencia gratitud entry con texts[] | ✅ CRIT-6 read-by-id |

---

## Lecciones aprendidas A.11

1. **stopPropagation NO funciona entre listeners del mismo target.** Si ambos están en `window`, son hermanos, no padre/hijo. Para coordinar, usar flag global compartido.
2. **document.body style mutations: capturar prev pero defenderse de pisado entre mounts.** Restore condicional a `''` si lo capturado fue el valor mutado por uno mismo.
3. **useState initializer con side effect → 2x en StrictMode dev.** Mover a useEffect [] o aceptar el dev-only weirdness.
4. **Module-state es global, persiste entre mounts. Buenísimo para rotación, mortal para multi-user.**
5. **Audit identifica refinamientos clásicos, no falla estructural.** El sprint estaba bien arquitecturado; los CRITs eran edges, no foundations.
6. **Reactividad de sub-secciones del settings sheet** es crítica para UX. Slider oculto cuando no aplica → less cognitive load.

---

## Archivos modificados en audit (delta sobre commit 9fbaada)

- `screens/breath-gate.jsx` — CRIT-1, CRIT-2, CRIT-3, CRIT-4 guard, CONS-3
- `screens/breath-gate-modes.jsx` — CRIT-6, GAP-1
- `screens/breath-gate-phases.jsx` — GAP-5, CONS-3
- `screens/breath-gate-settings-sheet.jsx` — FIX-UX-1, FIX-UX-2, CRIT-4 flag, CRIT-7, IMP-4, CONS-3
- `Mentex Home.html` — cache bumps (modes v2, phases v2, settings-sheet v4, breath-gate v6)

**Total delta**: ~80 LOC añadidas, ~30 modificadas. Cero archivos nuevos.
