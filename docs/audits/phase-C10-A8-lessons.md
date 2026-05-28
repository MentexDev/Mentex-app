# Audit — Phase C10 + A.8 (commit d4dfd88)

**Fecha**: 2026-05-27
**Scope**: C10 Export PDF/MD/PNG + A.8 Generative Media (image + video) + Scene Popup
**Total LOC auditadas**: ~4,279 (delta vs `7c01274`)
**Findings totales**: 24 · CRIT: 8 · IMP: 9 · REUSO: 4 · INCONSISTENCIA: 2 · GAP: 1

---

## CRIT (en orden de severidad)

### CRIT-1: Memory leak en listeners de image_gen_job sin cleanup defensivo
**Archivo**: `screens/ia-artifacts.jsx:4799-4850` (IAArtifactImageGenJob)
**Síntoma**: Si el user cambia de conversación mientras un job corre, los 3 event listeners (`mtx:image-gen-progress`, `mtx:image-gen-done`, `mtx:image-gen-error`) quedan en `window` permanentemente. Repetir → leak multiplicativo.
**Root cause**: Blind spot #8 — `useEffect` cleanup solo dispara al desmontar el componente, pero el artifact puede quedar en "store zombie" si la conv pierde focus sin destruir el DOM.
**Fix**: Verificar que el `return` cleanup del useEffect está correcto + agregar guard del status. Si el job ya terminó (poll devuelve `status: 'done'` al mount), no registrar listeners.
**Test**: Cambiar 5 veces de conv con 5 jobs activos → contar `getEventListeners(window)['mtx:image-gen-progress']` ≤ 5.

### CRIT-2: ArrowKeys del SceneDetailSheet hijackean el textarea editable
**Archivo**: `screens/ia-artifacts.jsx:6213-6230`
**Síntoma**: ArrowLeft/Right cambia de escena, pero si user está editando description (textarea), las flechas también navegan dentro del cursor. El check `!editingTitle && !editingDesc && !editingVoiceover` previene el cambio de escena, PERO el listener corre igual y no agrega `preventDefault`. Browser still receives the event normalmente.
**Root cause**: Blind spot #2 — `keydown` global sin `isTypingInEditable` check rigorous.
**Fix**: En el `onKey` del useEffect, agregar al inicio: `if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;`
**Test**: Abrir SceneDetailSheet, click en description, presionar ArrowLeft → cursor mueve DENTRO del textarea, escena no cambia.

### CRIT-3: Unhandled Promise rejection en handleImageGenTrigger
**Archivo**: `screens/coach-actions-bridge.jsx:678-695`
**Síntoma**: `__mtxImageGen.submit({...}).then(...)` sin `.catch()`. Si rechaza → `Uncaught (in promise) Error` en consola sin feedback al user.
**Root cause**: Blind spot #3 — async handler sin `.catch()` defensivo.
**Fix**: Agregar `.catch(function(err) { console.warn(...); if (window.__mtxToast) window.__mtxToast.show('No se pudo generar: '+err.message, {kind:'warn'}); })`.
**Test**: Stub `submit()` para rechazar → trigger → debe aparecer toast warn, no Uncaught.

### CRIT-4: SVG escape inconsistente en image-gen vs video-gen
**Archivo**: `screens/coach-image-gen-store.jsx:229-266`
**Síntoma**: `_generateMockImageUrl` inserta `icon` (emoji) en `<text>` sin escape. Hardcoded emojis son safe AHORA, pero si futuro `_iconFromPrompt` devuelve user-controlled string → XSS via SVG data URI.
**Root cause**: `escapeXml()` solo existe en video-gen (línea 552). Inconsistencia defensiva.
**Fix**: Crear `_escapeXml` helper compartido o duplicar en image-gen, aplicarlo a `icon` y a cualquier futuro texto user-controlled.
**Test**: Si `_iconFromPrompt` devolviera `"</text><script>alert(1)</script>"`, el SVG no debe ejecutar JS.

### CRIT-5: revokeObjectURL timing fijo (1500ms) en PDF download
**Archivo**: `screens/coach-export.jsx:140`
**Síntoma**: `setTimeout(() => URL.revokeObjectURL(url), 1500)` — heurística. Si conexión es lenta y el browser está procesando el download cuando llega revoke → download falla silenciosamente.
**Root cause**: Blind spot #6 — timestamp approximations / heurísticas timing-based.
**Fix**: Extender timeout a 5000ms (más conservador) o eliminar revokeObjectURL (GC eventually claims). Para safety, mejor 60_000ms.
**Test**: DevTools throttling "Slow 3G" → exportar PDF 5MB → verificar que download completa sin error.

### CRIT-6: _runVideoStages timer leak si user navega sin cancel
**Archivo**: `screens/coach-video-gen-store.jsx:434-482`
**Síntoma**: Función recursiva `_runVideoStages` agenda `setTimeout(tick, 220)` que se re-llama. Si user cambia conv sin cancelar, los timers siguen ejecutándose hasta completar (~180s/job). 10 jobs simultáneos = 10 timer chains activos.
**Root cause**: Blind spot #8 — adapter append-only / cleanup asumido.
**Fix**: Agregar listener `mtx:ia-chat-changed` en coach-actions-bridge que cancele jobs activos. O auto-cancel después de N min.
**Test**: Iniciar video job, cambiar conv → verificar después de 10s que job está cancelado (no más events).

### CRIT-7: ExportOption double-keydown handler
**Archivo**: `screens/coach-export.jsx:956-962`
**Síntoma**: `<button onKeyDown={handleKey}>` con button nativo que ya maneja Enter/Space → double dispatch. Si user tab+Enter → onClick dispara 2 veces.
**Root cause**: Blind spot #2 — keydown handler en elemento que ya tiene native handling.
**Fix**: Remover `onKeyDown` completamente — `<button>` ya hace lo correcto nativamente.
**Test**: Tab a ExportOption, press Enter → contar invocations de onClick = 1 (no 2).

### CRIT-8: Backdrop pointer-events en SceneDetailSheet permite cierre accidental al scrollear
**Archivo**: `screens/ia-artifacts.jsx:6356-6363`
**Síntoma**: En mobile/touch, scroll-drag sobre el contenido del sheet puede registrar mouseDown+mouseUp en el backdrop si los eventos burbujean → cierra el sheet inesperadamente.
**Root cause**: Backdrop click handler atrapa eventos de scroll que vienen del inner content.
**Fix**: El check actual `e.target === e.currentTarget` ya gestiona esto, PERO en touch devices a veces falla. Agregar `onTouchMove` que setea `backdropDownRef.current = false`.
**Test**: Mobile, scroll dentro del sheet → no cierra.

---

## IMP (robustez · 9 findings)

### IMP-1: No hay timeout defensivo en loadJsPDF/loadHtml2Canvas
**Archivo**: `screens/coach-export.jsx:50-96`
**Fix**: `Promise.race([_loadScript(url), new Promise((_, rej) => setTimeout(() => rej(new Error('CDN timeout')), 15000))])`.

### IMP-2: Toast wrapper sin guard estricto
**Archivo**: `screens/coach-export.jsx:123-129`
**Fix**: `if (window.__mtxToast && typeof window.__mtxToast.show === 'function')` antes de llamar.

### IMP-3: Storyboard edits sin debounce
**Archivo**: `screens/ia-artifacts.jsx:6420-6425`
**Fix**: Debounce 200ms en updateScene del SceneDetailSheet (post-MVP).

### IMP-4: escapeXml no escapa apostrophes
**Archivo**: `screens/coach-video-gen-store.jsx:552-554`
**Fix**: Agregar `.replace(/'/g, '&apos;')`.

### IMP-5: Video progress puede saltar > expected si timings difieren
**Archivo**: `screens/coach-video-gen-store.jsx:464-466`
**Fix**: Curva ease-out aplicada al video stages (consistente con image gen).

### IMP-6: handleOpenVoicePicker sin guard de undefined
**Archivo**: `screens/coach-actions-bridge.jsx:759-767`
**Fix**: `if (!window.__mtxVideoGen) { console.warn(...); return; }`.

### IMP-7: ExportOption onClick null redundante con disabled
**Archivo**: `screens/coach-export.jsx:967`
**Fix**: Solo mantener `disabled={busy || disabled}`, eliminar onClick condicional.

### IMP-8: Progress bar transition inconsistente
**Archivo**: image_gen tiene cubic-bezier, video_gen no
**Fix**: Agregar mismo transition al video progress bar.

### IMP-9: Aria-label faltante en voiceover textarea
**Archivo**: `screens/ia-artifacts.jsx:6405+`
**Fix**: Agregar `aria-label="Editar voiceover de escena"`.

---

## REUSO (candidatos para Sprint A.9 refactor)

### REUSO-1: `_GenActionPill` button pattern
**Veces**: 2 (ImageResult, VoicePicker) — más SceneDetailSheet adjust duration
**Propuesta**: Extraer a `window.__mtxActionPill` global.

### REUSO-2: Keyframes duplicadas en 3 archivos
**Archivos**: coach-export.jsx (spin), ia-artifacts.jsx (shimmer, pulse-soft, breathe, fade-up)
**Propuesta**: Centralizar en `components/mtx-animations.css` o un único IIFE.

### REUSO-3: Color palettes y tokens inconsistentes
**Archivos**: image-gen y video-gen con hex hardcoded
**Propuesta**: `window.__mtxColorTokens = { neon, purple, gold, sky, ... }`.

### REUSO-4: Artifact kind registry centralizado
**Archivos**: ia-artifacts.jsx (múltiples switches)
**Propuesta**: `var ARTIFACT_KINDS = { image_gen_job: { isLive: true, component: ... } }`.

---

## INCONSISTENCIA

### INCONSISTENCIA-1: ESC `isComposing` check order
**Archivos**: `coach-export.jsx:784` vs `ia-artifacts.jsx:6391`
**Fix**: Standardizar orden — `isComposing` check ANTES de cualquier key logic.

### INCONSISTENCIA-2: Backdrop close semantics
**Archivos**: coach-export tiene `if (busy) return` confuso
**Fix**: Documentar inline cuándo cierra y cuándo no.

---

## GAP

### GAP-1: Listener `mtx:storyboard-voice-picked` no existe
**Archivo**: coach-actions-bridge.jsx (falta)
**Síntoma**: VoicePicker dispatchea evento al elegir voz, pero nadie escucha → no hay confirmación al user de que la voz cambió.
**Fix**: Agregar listener en bridge que muestra toast "Voz cambiada a {name}" o un msg coach con CTA "Generar video".

---

## Notas finales

### Lo que SÍ funciona bien (preservar en refactor)
1. **Promise singleton CDN load** — robust retry
2. **Store separation** (ImageGen / VideoGen / CoachExport) sin cross-pollution
3. **Mock/backend parity** — shapes drop-in ready para Brandon
4. **Artifact kind expansion** — sistema extensible
5. **A11y baseline** — buttons mayormente tienen aria-labels
6. **escapeXml defensivo** — presente (inconsistente, pero presente)

### Smoke test prioritario post-fix
1. PDF export en red lenta (timeout CDN)
2. Video job lifecycle al cambiar conv
3. SceneDetailSheet en mobile (touch, ArrowKeys)
4. Image + video gen simultáneos
5. Export sheet mientras hay artifact live en mismo msg

### Lessons aprendidas (para próximos sprints)
1. **Builder-mode siempre olvida cleanup** — usar `useRef` para snapshot status en effects
2. **Keydown listeners necesitan `isTypingInEditable` guard universal** — recurrente en cada sprint
3. **Mock SVGs son surface XSS sutil** — `escapeXml` debe ser hábito, no excepción
4. **Async handlers SIN `.catch()` son default error** — esperar que falle
5. **Timer chains recursivas requieren cleanup activo** — no asumir que el unmount lo hace
