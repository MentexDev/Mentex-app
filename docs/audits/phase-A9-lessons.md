# Audit — Phase A.9 + A.9.5 (commits 29e31f0..5cf754d)

**Fecha**: 2026-05-28
**Scope**: Sprint A.9 Wellness exercises + A.9.5 (history + reminder + HRV + audio)
**Total LOC auditadas**: ~3,400
**Findings totales**: 23 · CRIT: 6 · IMP: 10 · GAP: 6 · INCONSISTENCIA: 1

---

## CRIT (en orden de severidad)

### CRIT-1: RAF tick nunca limpiado si artifact unmounts durante running
**Archivo**: `screens/ia-artifacts.jsx:6504-6520`
**Síntoma**: Si user cambia de conv mientras `snap.status === 'running'`, el RAF sigue ejecutándose. Memory leak + state updates en unmounted component.
**Root cause**: useEffect cleanup solo se ejecuta si las deps cambian. Si cambio de conv destruye el artifact sin propagar la dep change, RAF queda dangling.
**Fix**: useEffect adicional con cleanup independiente del status que cancele el RAF al unmount completo.
**Test**: Iniciar ejercicio, cambiar conv → contar `requestAnimationFrame` activos en DevTools, debe ser 0.

### CRIT-2: handleRemindTomorrow puede ejecutarse 2x en double-tap rápido
**Archivo**: `screens/ia-artifacts.jsx:6620-6647`
**Síntoma**: `reminderSet` state es async, dos taps antes del setState propagarse crean 2 reminders.
**Root cause**: Anti-double-tap es state, no ref. setState es async.
**Fix**: Usar `useRef` para el guard + check ref antes de proceder.
**Test**: Stub addReminder con delay 500ms, doble-tap rápido → contar invocations = 1.

### CRIT-3: handleMessageSent race con bridge startup
**Archivo**: `screens/coach-actions-bridge.jsx:` (listener) + `screens/ia-flow.jsx:3213` (dispatch)
**Síntoma**: Si bridge no se inicializó cuando el dispatch sale, sugerencia wellness se pierde silenciosamente.
**Root cause**: Race entre carga de scripts. Dispatch async, listener async.
**Fix**: En el handler del bridge, verificar dispatch desde startup tardío. O usar `Promise.resolve().then()` para deferred dispatch.
**Test**: Refrescar app + inmediatamente enviar "estoy estresado" → confirmar sugerencia aparece.

### CRIT-4: HRV baseline null si wearable se desconecta mid-session
**Archivo**: `screens/ia-artifacts.jsx:6593-6614`
**Síntoma**: baseline se toma on-mount; si user desconecta antes de complete, `hrvAfter` calcula desde null = NaN.
**Root cause**: No hay re-check del wearable state durante la sesión.
**Fix**: Guard explícito `if (hrvBaseline == null) return;` antes de calcular hrvAfter.
**Test**: Mount con wearable connected, desconectar mid-session, complete → no debe haber NaN.

### CRIT-5: Audio context leak — oscillators no se detienen en cancel
**Archivo**: `screens/coach-wellness-audio.jsx:82-120`
**Síntoma**: Si user cancela sesión durante phase con tono activo, oscillator + gain nodes quedan corriendo hasta `setTimeout` cleanup natural.
**Root cause**: `_activeNodes` solo se limpia post-timeout, no en cancel del session.
**Fix**: Listener `mtx:wellness-state` con `status === 'cancelled'` llama `stop()` que detiene todos los nodes activos.
**Test**: Iniciar ejercicio con audio ON, cancelar durante fase con sonido → AudioContext debe estar silencio inmediato.

### CRIT-6: Stress detection "me siento mal" matchea HIGH y MEDIUM
**Archivo**: `screens/coach-wellness-store.jsx:464-475`
**Síntoma**: regex HIGH (línea 464) y MEDIUM (línea 468) ambas capturan "me siento mal" → first match wins (HIGH).
**Root cause**: Dup en patterns. Funciona "por suerte" porque HIGH se evalúa primero.
**Fix**: Eliminar "me siento mal" del regex MEDIUM (línea 468).
**Test**: `detectStressLevel("me siento mal")` → siempre `'high'`.

---

## IMP (10 findings · robustez + UX)

| # | Archivo | Síntoma | Fix |
|---|---|---|---|
| IMP-1 | ia-artifacts.jsx:6509 | RAF tick usa snap stale | Leer phaseStartedAt del store directo en tick |
| IMP-2 | wellness-history.jsx:123 | `_isSameDay` no maneja DST | Usar `toLocaleDateString()` |
| IMP-3 | wellness-history.jsx:142 | `getStreakDays` continúa si ayer no hay sesión | Romper loop al primer día vacío después de hoy |
| IMP-4 | ia-artifacts.jsx:6593 | HRV doc edge case `getLastNight()` null | Documentar fallback null en comentario |
| IMP-5 | wellness-audio.jsx:122-131 | Chord stagger duration inconsistente | Mismo durationSec todos los tonos |
| IMP-6 | wellness-audio.jsx:56-59 | localStorage fail silencioso en private mode | Toast warn si pref no se guarda |
| IMP-7 | actions-bridge.jsx:6851 | Multiple sesiones simultáneas | `_cancelAllActive()` antes de `start()` |
| IMP-8 | attach-menu.jsx:446-480 | Stagger animation flicker en abre/cierra rápido | Reducir delay 0.025s → 0.01s |
| IMP-9 | mock-conversations.jsx (todas) | No valida type contra catálogo | Store valida `getExercise(type)` en `start()` |
| IMP-10 | wellness-history.jsx:288 | `getStats()` re-parse localStorage cada call | Cache stats post-record |

---

## GAP (6 botones/listeners desconectados)

### GAP-1: Chips "Para seguir" en mocks son COSMÉTICOS — no tienen handlers
**Archivos**: `coach-mock-conversations.jsx` (6 mocks wellness)
**Síntoma**: Chips como "Programar recordatorio mañana", "Ver mi historial de pausas", "Programar timer 90 min", "Recomendá profesionales", "Ver patrón HRV de esta semana", "Ver meditaciones cortas" no hacen NADA al tap.
**Root cause**: Los chips se definen en `chips: [...]` pero no hay `chip-clicked` event handler.
**Fix**:
1. Crear event `mtx:coach-chip-clicked` dispatcheado por `ia-artifacts.jsx` cuando user tapea un chip
2. Handler en `coach-actions-bridge.jsx` que matchea el label del chip y dispatches la acción apropiada (recordatorio → addReminder, historial → mostrar, etc.)
**Test**: Tap en cualquier chip → debe pasar algo observable (toast, dispatch, navegación).

### GAP-2: Botón 🔔 falla silenciosamente si `__mtxIAAgenda` no existe
**Archivo**: `ia-artifacts.jsx:6628-6637`
**Fix**: Guard explícito + toast warn "Agenda no disponible · reintentá".

### GAP-3: Botón "Volver" en _WellnessPicker no resetea estado completo
**Archivo**: `coach-attach-menu.jsx:453-459`
**Fix**: Verificar todos los sub-states (`urlInputOpen`, etc.) están false al volver.

### GAP-4: `/respirar` sin arg siempre box_breathing default
**Archivo**: `coach-slash-commands.jsx:188-195`
**Fix**: Sin arg, usar heurística de hora del día (mañana → energy, noche → sleep). Implementar `recommendByContext()` en store.

### GAP-5: Auto-detect anti-spam basado en índice no timestamp
**Archivo**: `actions-bridge.jsx:6895-6913`
**Fix**: Cambiar de `slice(-3)` a filter por timestamp `< 2 min`.

### GAP-6: `record()` failure silencioso
**Archivo**: `wellness-history.jsx:323-332`
**Fix**: Si `record()` returns null, log warn + emit `mtx:wellness-history-failed` event.

---

## INCONSISTENCIA

### INCONSISTENCIA-1: Naming `play()` vs `handleStart()`
**Archivos**: `wellness-store.jsx:374` vs `ia-artifacts.jsx:6557`
**Fix**: Mantener `play()` en store (drop-in con media-player convention) y documentar.

---

## Notas finales

### Lo que SÍ funciona bien
1. State machine en wellness-store
2. RAF cleanup en el happy path
3. HRV simulation realista (bumps por tipo research-based)
4. Audio Web Audio API ADSR envelope sólido
5. History streaks "hoy no obligatorio" inteligente

### Smoke test prioritario post-fix
1. Cambio de conv durante wellness running (CRIT-1, IMP-7)
2. Auto-detect timing rápido (CRIT-3, GAP-5)
3. Cancel durante audio (CRIT-5)
4. Stress detection "me siento mal" (CRIT-6)
5. Double-tap reminder (CRIT-2)
6. Tap chips "Para seguir" (GAP-1)

### Lecciones aprendidas A.9
1. **RAF necesita cleanup explícito en useEffect separado del data dep**
2. **Anti-double-tap = useRef, no useState** (state es async)
3. **Stress detection regex dup → ordering decide ganador, frágil**
4. **Audio context tracking = listen a state cambios, no asumir cleanup natural**
5. **Mocks deben validar tipos contra catálogo en store**
6. **Chips visuales sin handlers = GAP por defecto**
