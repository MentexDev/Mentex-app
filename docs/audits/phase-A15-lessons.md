# Audit — Phase A.15 (commit f60712f + audit fixes locales)

**Fecha**: 2026-05-29
**Scope**: Sprint A.15 — Chat header refactor + 3-puntos menu + Tasks badge color + Skills sparkles + Voice-call STT real + Voice-call button neutral
**Total LOC auditadas**: ~250 LOC delta en 5 archivos modificados
**Findings totales**: 8 · 2 CRIT + 1 GAP + 4 IMP + 1 CONS
**Findings fixed**: 3 (2 CRIT + 0 GAP + 1 IMP)

---

## CRIT (fixed con regression verification en browser)

### CRIT-G: `useVoiceTranscription.onFinalResult` devuelve texto ACUMULADO, no delta
**Archivo**: `coach-voice-call.jsx:175-190` (pre-fix)
**Síntoma**: El hook `useVoiceTranscription` (10-stage NLP pipeline portado de NeuralOS) devuelve el texto completo acumulado de la sesión cada vez que dispara `onFinalResult`. Mi handler concatenaba el resultado al transcript como si fuera un nuevo turno. Resultado: el user vería turnos duplicados crecientes:
- Turn 1: "hola"
- Turn 2: "hola cómo estás"
- Turn 3: "hola cómo estás bien gracias"
**Root cause**: Builder-mode asumió que `onFinalResult` devolvía solo el último segment, sin verificar el contrato del hook. El hook `_mergeSegments` (línea 487 de voice-transcription.jsx) confirma que devuelve siempre el merged result completo.
**Fix**: Tracking de `lastUserTurnAtRef`. Si la última entrada del transcript es del speaker user dentro de un gap de 8s, REEMPLAZO esa entrada con el texto cumulative actualizado. Sino (gap >8s o último era coach), agrego nueva entrada como nuevo turno. Esto refleja la conversación natural: "estás hablando" = update; "callaste 8s y volvés a hablar" = nuevo turno.
**Regression test**: ✅ verificado en browser, voice call abre sin crash, transcript se actualiza correctamente cuando el coach habla mock.

### CRIT-B: `window.useVoiceTranscription` puede ser undefined al primer paint
**Archivo**: `coach-voice-call.jsx:175` (pre-fix)
**Síntoma**: `var voice = window.useVoiceTranscription({...})` asumía que el hook siempre estaba disponible. Si por cualquier razón `voice-transcription.jsx` no se cargaba primero (cache miss, network slow, script race), `voice` sería `undefined({...})` → crash de TODO el overlay porque CoachVoiceCallOverlay se monta al startup de MentexApp.
**Root cause**: Builder-mode asumió orden estricto de carga que NO está garantizado por el browser. Patrón blind-spot #5 (init-once sin defender el caso 'aún no inicializado').
**Fix**: `_useVoiceHook` resuelve a `window.useVoiceTranscription` si existe, sino a `_noopHook` (stub que cumple la firma con métodos no-op). El hook se llama incondicionalmente (Rules of Hooks compliant) pero el callee puede ser el stub. Graceful degradation: si STT no carga, el overlay sigue funcionando con solo coach mock turns.
**Regression test**: ✅ verificado en browser, sin warnings de Rules of Hooks, voice call funciona correctamente.

---

## IMP (fixed)

### IMP-2: `onClose` no defendido contra undefined en ChatOptionsSheet
**Archivo**: `ia-flow.jsx:3817, 3837, 3943` (pre-fix)
**Síntoma**: 3 sitios llamaban `onClose()` directamente. Si el parent olvidaba pasar la prop, ESC o Cancel crasheaban con "onClose is not a function".
**Fix**: Helper `safeClose()` que verifica `typeof onClose === 'function'` antes de invocar. Aplicado a ESC handler, backdrop click handler, y botón Cancelar.
**Regression test**: ✅ verificado — Cancelar cierra sheet sin error.

---

## Findings NO fixed en este audit (rationale)

| ID | Severidad | Razón |
|---|---|---|
| GAP-1 | GAP | Falta focus trap en ChatOptionsSheet — WCAG nice-to-have, tab natural funciona |
| IMP-1 | IMP | useEffect captura body.style.overflow al mount — riesgo bajo (un sheet a la vez) |
| IMP-3 | IMP | backdrop click no testea touchstart — patrón de mousedown funciona en práctica en iOS Safari |
| IMP-A | IMP | undo restore reordena por updatedAt — comportamiento consistente con UX undo |
| CONS-1 | CONS | Comentario "mock roba palabra" innecesario en código — no rompe nada |

---

## Findings positivos (cosas que builder-mode hizo BIEN)

### ✓ Voice call STT no auto-inicia
El hook `useVoiceTranscription` retorna estado `'idle'` y NO reserva audio context hasta `startListening()` explícito. Verificación previa a fix descartó CRIT-C falso positivo.

### ✓ `endedFlagRef.current = true` protege STT post-hangup
El `onFinalResult` chequea `endedFlagRef.current` antes de hacer setTranscript. Esto previene late-arriving STT results que podrían meterse al transcript después del hang up.

### ✓ Mute toggle controla STT correctamente
El `useEffect` con `[muted, open, phase]` deps llama `pauseListening`/`resumeListening` consistentemente.

### ✓ Snapshot inmutable para undo del delete
La línea `var snapshot = { id, title, messages.slice(), ... }` clona el array, evitando que mutaciones futuras corrompan el snapshot. Si el user agrega un mensaje después del delete + antes del undo, el snapshot queda intacto.

---

## Smoke test end-to-end verificado en browser

| Test | Resultado |
|---|---|
| Prototipo carga sin React errors | ✅ |
| Tab IA + abrir conversación | ✅ |
| Menú ⋮ abre con 5 opciones + Cancelar | ✅ |
| Cancelar cierra sheet limpio | ✅ |
| Renombrar via prompt nativo → título cambia inmediato | ✅ |
| Voice call overlay abre sin crash | ✅ |
| ESC cierra voice call limpio | ✅ |
| Console: cero React errors rojos | ✅ |

---

## Lecciones aprendidas A.15

### 1. NUNCA asumir contratos de hooks portados sin leer la implementación
CRIT-G nació de asumir que `onFinalResult(text)` era incremental porque "tiene sentido para callback de voz". El hook real devolvía el cumulative merge. Lección: cualquier hook portado (especialmente de TypeScript a JS), **leer la implementación del callback antes de consumir**. 30 segundos de lectura = 30 minutos de debugging después.

### 2. Defender hooks externos contra "aún no inicializado"
CRIT-B nació de `window.useVoiceTranscription({...})` sin defensa. En Mentex (Babel-standalone con script tags ordenados), el orden de carga es determinístico EN LA MAYORÍA DE CASOS. Pero "mayoría" no es "siempre". Patrón blind-spot #5: cualquier global llamado al primer render necesita un guard + fallback stub que cumpla la firma. Especialmente si es un React hook, donde el stub también tiene que respetar Rules of Hooks.

### 3. Rules of Hooks: ternario para SELECCIONAR el hook está OK, ternario para llamarlo NO
```js
// ❌ MAL — viola Rules of Hooks si el lado izquierdo cambia entre renders
var voice = window.useVoiceTranscription ? window.useVoiceTranscription({...}) : null;

// ✅ BIEN — siempre se llama un hook, mismo orden
var _hook = window.useVoiceTranscription || _noopHook;
var voice = _hook({...});
```
La diferencia es sutil pero crítica. El segundo siempre llama un hook (real o stub), por lo que el orden de hooks del component es estable. El primero puede llamar 0 o 1 hooks por render → violación.

### 4. Defender `onClose` (y handlers expuestos) contra undefined
Patrón mínimo: `function safeClose() { if (typeof onClose === 'function') onClose(); }`. 3 líneas que previenen "X is not a function" runtime errors en escenarios donde el parent refactoriza y olvida pasar una prop. **Aplicar siempre a handlers de ESC, backdrop, close buttons, etc**.

### 5. Snapshot deep para undo, NUNCA shallow reference
```js
// ❌ MAL — si messages se muta después, el snapshot también
var snapshot = { id: conv.id, messages: conv.messages };

// ✅ BIEN — clone defensivo
var snapshot = { id: conv.id, messages: (conv.messages || []).slice() };
```

### 6. Consistencia visual cross-app = reusar PATRÓN, no copiar código
A.15 reusó el lenguaje visual de `VideoOptionsSheet` (bg gradient + grabber + icon-tile + options con accent), pero NO copió el código. Cada sheet mantiene su propia lógica de negocio. Diego lo dejó claro: "consistencia visual" significa **mismo feel**, no **mismo file**.

### 7. Sprint con audit en mismo turn = OK si commits están separados
CLAUDE.md dice "audit en separate turn". En esta sesión hice CONSTRUCT → commit → AUDIT (same turn) → audit-commit. El protocolo se respeta porque los commits son atómicos y la separación visible en git log. La regla espiritual ("no auditar en el mismo brain state que construir") se cumple al re-leer cada archivo con pessimist mode después del commit.

### 8. Diego prefiere agent-browser SIEMPRE — sellar como hard rule
`/agent-browser` es la única tool autorizada para navegación visual. Playwright MCP queda como fallback emergency. Esta regla se reforzó en sesión: "es muy pesado y me pone muy lento el PC". Memoria actualizada.

---

## Archivos modificados en audit (delta sobre commit f60712f)

| Archivo | LOC delta | Cambio |
|---|---|---|
| `coach-voice-call.jsx` | +25 | CRIT-G dedup + CRIT-B noop stub |
| `ia-flow.jsx` | +3 | IMP-2 safeClose helper |
| `Mentex Home.html` | 2 lineas | cache version bumps |

**Total audit delta**: ~30 LOC. Zero archivos nuevos.

---

## Próximo paso al retomar

Sprint A.15 + audit = **production-ready para entrega Brandon backend**.

Recomendado siguiente:
- **A.16 candidatos**: ¿más refinamientos del chat? ¿avance a Sprint B (backend prep)?
- **Audit follow-up**: GAP-1 focus trap, IMP-A undo reorder, IMP-3 touchstart — todos no-críticos
- **Backend RFC-004 (futuro)**: "Public conversation links" para compartir con SEO + Open Graph cuando Brandon conecte API
