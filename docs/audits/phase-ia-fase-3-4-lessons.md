# IA Fase 3+4 — Audit Lessons (Channels · Integrations · Monetization)

**Fecha:** 2026-05-12
**Audit commit:** este commit (consolidado)
**Alcance:** 3 archivos · ~2,820 LOC totales auditados con 3 subagentes paralelos auditor-mode en sesión separada.

```
screens/ia-channels.jsx       ~1,500 LOC  (Fase 3 — 10 canales)
screens/ia-integrations.jsx   ~1,030 LOC  (Fase 4.1 — 15 servicios)
screens/ia-monetization.jsx     ~290 LOC  (Fase 4.2 — confetti, history, upgrade CTA)
```

## Resumen ejecutivo

**Hallazgos totales:** 10 CRIT + 31 IMP (41 findings sobre 2,820 LOC ≈ 1 finding cada 69 LOC).

**Fixes aplicados en este audit:** 10 CRIT (100%) + 20 IMP de alto valor.

**Diferidos:** 11 IMP de bajo valor (focus trap completo, `_formatRelative` dedup, sample timestamps relative-from-mount, etc.). No bloquean nada.

**Verificación:** ✓ Playwright regression pasó 4/4 aserciones críticas · ✓ 0 errores nuevos en consola.

---

## CRIT findings (10)

### CRIT-1 — `EnhancedChannelsTab`: hook order violation latente

**Síntoma builder-mode:**
```js
function EnhancedChannelsTab() {
  useIAChannels();
  if (!window.__mtxIAChannels) return null;  // ← early return ANTES de useState
  var detailState = React.useState(null);
  ...
}
```

**Root cause:** En primer render `__mtxIAChannels` puede ser `undefined` (race con dos setTimeouts de init). Componente retorna null con N hooks. Cuando llega el `mtx:ia-config-changed` y rerender ocurre, ahora se ejecuta `useState` → React detecta hook count distinto → "Rendered more hooks than during the previous render" crash.

**Fix:** Hooks SIEMPRE primero — `useState` y `useCallback` antes del early return. Mismo patrón aplicado a `EnhancedIntegrationsTab`.

---

### CRIT-2 — 6-digit OTP inputs: paste pierde 5/6 dígitos + ordering corrupto

**Síntoma builder-mode (replicado en 4 flows: WhatsApp, iMessage, Telegram, SMS):**
```js
{[0,1,2,3,4,5].map(function(i) {
  return <input key={i}
    value={code[i] || ''}
    onChange={function(e) {
      var v = e.target.value.replace(/\D/g, '').slice(0, 1);  // ← paste perdido
      var next = code.slice(0, i) + v + code.slice(i + 1);    // ← ordering frágil
      ...
      var nextInput = e.target.parentNode.children[i + 1];   // ← DOM-walking frágil
    }}/>
})}
```

**3 bugs compuestos:**
1. **Paste**: Usuario pega "123456" → `.slice(0,1)` solo guarda "1", pierde 5 dígitos
2. **Out-of-order entry**: Si user click cell 3 primero, `code = '' + '4' + ''` = "4" → cell 3 muestra vacío pero `code[0] = '4'`. Mismatch visual/state
3. **Backspace** no navega a cell previo + no soporta ArrowLeft/Right

**Fix:** Componente compartido `CodeInput6` con:
- Refs array para focus management (no `parentNode.children`)
- `handleChange` distribuye paste a cells subsiguientes
- `handleKeyDown` para Backspace (focus previous + clear) y Arrows
- `autoComplete="one-time-code"` en primera cell → iOS SMS auto-fill habilitado
- `aria-label="Dígito N de 6"` por cell

**Regression test:** Paste `'123456'` en cell 0 → finalCode === '123456' (todas las cells llenas). ✓

---

### CRIT-3 — `setState`-after-unmount en TODOS los ConnectFlows

**Síntoma builder-mode (8 ocurrencias en ChannelConnectFlows + 2 en IntegrationDetailSheet):**
```js
var commit = function() {
  setPhase('connecting');
  setTimeout(function() {
    window.__mtxIAConfig.setChannel('whatsapp', { connected: true, ... });
    onDone();  // ← si user cerró sheet en <900ms, esto corre sobre componente desmontado
  }, 900);
};
```

**Daño:**
- React warning "Can't perform state update on unmounted component"
- **Worse**: el `setChannel({ connected: true })` SÍ se aplica → canal queda marcado como conectado aunque el user abandonó el flow
- En producción con OAuth real: estaríamos diciendo "estás conectado" sin haber verificado nada server-side

**Fix:** Helper compartido `_useCommitGuard()`:
```js
function _useCommitGuard() {
  var mountedRef = React.useRef(true);
  var timersRef = React.useRef([]);
  React.useEffect(function() {
    return function() {
      mountedRef.current = false;
      timersRef.current.forEach(function(t) { clearTimeout(t); });
    };
  }, []);
  function schedule(fn, ms) {
    var t = setTimeout(function() {
      if (!mountedRef.current) return;  // abort if unmounted
      fn();
    }, ms);
    timersRef.current.push(t);
    return t;
  }
  return { schedule: schedule, mountedRef: mountedRef };
}
```

Aplicado a los 8 connect flows + extendido en `IntegrationDetailSheet` con `grantTimerRef` + `syncTimerRef`.

---

### CRIT-4 — `PushConnectFlow`: unhandled promise rejection + swallowed Notification error

**Síntoma builder-mode:**
```js
Notification.requestPermission().then(function(perm) {
  if (perm === 'granted') {
    ...
    try { new Notification('...'); } catch (_) {}  // ← silent catch
  }
});  // ← no .catch
```

**3 issues:**
1. Sin `.catch()` → unhandled rejection si Brave/Safari ITP rechaza → user se queda en spinner infinito
2. iOS Safari ALWAYS throws en `new Notification()` (requiere ServiceWorker) — silent catch viola universal rule #2
3. Safari antiguo retorna `void` de requestPermission → `.then` crashea

**Fix:**
```js
var permPromise;
try {
  var maybe = Notification.requestPermission();
  permPromise = (maybe && typeof maybe.then === 'function')
    ? maybe
    : new Promise(function(resolve) { Notification.requestPermission(resolve); });  // callback fallback
} catch (e) {
  permPromise = Promise.reject(e);
}
permPromise.then(function(perm) {
  if (!guard.mountedRef.current) return;
  if (perm === 'granted') {
    ...
    try { new Notification(...); }
    catch (e) { console.warn('[push] Notification constructor unavailable', e); }  // explicit log
  }
}).catch(function(err) {  // ← .catch ahora presente
  if (!guard.mountedRef.current) return;
  setPhase('idle');
  setError('No pudimos pedir permiso: ' + (err.message || 'error desconocido'));
});
```

---

### CRIT-5 — Telegram deep-link `<a target="_blank">` styled as primary button

**Síntoma builder-mode:**
```jsx
<a href={ch.deepLink} target="_blank" rel="noopener noreferrer"
  style={ctaPrimaryStyle(true, '#2aabee')}>
  ✈️ Abrir Telegram
</a>
```

**Daño:**
- Visualmente es un button gigante pero es `<a>` → keyboard users esperan Space pero solo Enter activa
- `tg://` con target=_blank → desktop Chrome abre tab en blanco que se cierra inmediatamente (tab vacía huérfana)

**Fix:** Real `<button>` con `window.location.href = ch.deepLink` + try/catch + aria-label:
```jsx
<button onClick={function() {
  try { window.location.href = ch.deepLink; }
  catch (e) { console.warn('[telegram] deep-link failed', e); }
}} aria-label="Abrir Telegram" ...>
```

---

### CRIT-6 — `IntegrationDetailSheet`: `manualSync` leaks `syncing: true` forever

**Síntoma builder-mode:**
```js
var manualSync = function() {
  window.__mtxIAConfig.setIntegration(it.id, { syncing: true });
  setTimeout(function() {
    window.__mtxIAConfig.setIntegration(it.id, { syncing: false, lastSync: Date.now() });
  }, 1500);
};
```

**Daño:**
- Si user cierra sheet o desconecta mid-sync, timeout sigue corriendo y escribe `lastSync` sobre una integration ya desconectada → status zombi "Sin sync reciente" sobre integración connected=false
- Si user spammea botón sync, múltiples timers compiten

**Fix:**
```js
if (syncTimerRef.current) return;  // dedup
window.__mtxIAConfig.setIntegration(it.id, { syncing: true });
syncTimerRef.current = setTimeout(function() {
  syncTimerRef.current = null;
  if (!mountedRef.current) return;
  var fresh = window.__mtxIAIntegrations.getState(it.id);
  if (!fresh || !fresh.connected) {  // abort si desconectado mid-sync
    window.__mtxIAConfig.setIntegration(it.id, { syncing: false });
    return;
  }
  window.__mtxIAConfig.setIntegration(it.id, { syncing: false, lastSync: Date.now() });
  ...
}, 1500);
```

`doDisconnect` ahora también cancela el sync timer si está corriendo. Cleanup en useEffect también limpia el flag syncing si quedó en true.

---

### CRIT-7 — `IntegrationDetailSheet`: phase no resync a status externo

**Síntoma builder-mode:**
```js
var phaseState = React.useState(isConnected ? 'connected' : 'idle');  // ← captured ONCE
```

**Daño:** Si otra surface desconecta la integration mientras sheet está abierto, `isConnected` flips a false en re-render pero `phase` queda 'connected' → muestra scopes/activity de integración ya desconectada.

**Fix:**
```js
React.useEffect(function() {
  if (phase === 'consent' || phase === 'connecting') return;  // no interrumpir transitorios
  setPhase(isConnected ? 'connected' : 'idle');
}, [isConnected]);
```

---

### CRIT-8 — ESC handler cierra sheet incluso durante consent/connecting/confirm

**Síntoma builder-mode:**
```js
var onKey = function(e) {
  if (e.key !== 'Escape' ...) return;
  ...
  onCloseRef.current();  // ← siempre cierra sheet completo
};
```

**Daño:**
- ESC durante OAuth consent screen → cierra sheet (en lugar de volver a idle)
- ESC durante disconnect confirm → cierra sheet (en lugar de dismissar confirm)
- ESC durante "Conectando…" → cierra sheet (transitorio inevitable)

**Fix (staged ESC):**
```js
if (confirmRef.current) { setConfirmDisconnect(false); return; }
if (phaseRef.current === 'consent') { setPhase('idle'); return; }
if (phaseRef.current === 'connecting') return;  // bloqueado
onCloseRef.current();
```

Backdrop click usa la misma lógica staged.

---

### CRIT-9 — `IntegrationDetailSheet`: no Cancel button durante connecting

**Síntoma:** Una vez user click "Autorizar", sheet entra a `connecting` y queda locked 1100ms — el único way out era cerrar el sheet (CRIT-3 escenario) o esperar.

**Fix:** Botón "Cancelar" visible durante `phase === 'connecting'`:
```jsx
{phase === 'connecting' && (
  <div>
    <IntConnectingState .../>
    <button onClick={cancelOAuth}>Cancelar</button>
  </div>
)}
```

`cancelOAuth` ahora también cancela el timer pendiente:
```js
var cancelOAuth = function() {
  if (grantTimerRef.current) { clearTimeout(grantTimerRef.current); grantTimerRef.current = null; }
  setPhase('idle');
};
```

---

### CRIT-10 — `PurchaseConfettiOverlay`: confetti idéntico cada burst

**Síntoma builder-mode:**
```js
var particles = React.useMemo(function() {
  var arr = [];
  for (var i = 0; i < 24; i++) {
    var angle = (i / 24) * 360 + ((i * 137.5) % 22 - 11);  // ← determinístico
    ...
  }
  return arr;
}, []);  // ← deps vacías = mismo set forever
```

**Daño:**
- Cada burst se ve idéntico (mismas posiciones, mismos delays, mismos colores)
- Si user compra 3 packs en 100ms, segundo y tercer purchases NO refrescan la animación (CSS animation no se reinicia con state idempotente)

**Fix:**
```js
var burstId = burstIdState[0];
// Particles regenerados por cada burst con random
var particles = React.useMemo(function() {
  if (burstId === 0) return [];
  var arr = [];
  for (var i = 0; i < 24; i++) {
    var angle = (i / 24) * 360 + (Math.random() * 22 - 11);  // ← random ahora
    ...
  }
  return arr;
}, [burstId]);

return <div key={burstId} ...>  // ← key remount fuerza CSS animation restart
  {particles.map(...)}
</div>;
```

**Regression test:** burst1 ≠ burst2 con diferentes coordenadas. ✓

---

## IMP findings aplicados (20)

1. **Phone validation digit-strip** (WhatsApp + SMS) — `phone.length < 8` raw aceptaba "   " (espacios) y rechazaba "5550100" válido. Ahora `digits.length ∈ [7,15]`.

2. **Disconnect limpia `verifiedAt` + `lastSeen`** — antes quedaban stale en localStorage, mostraban "Hace 2h" tras reconectar con otro identifier. Privacy + consistency.

3. **Init bootstrap idempotente** — antes dos setTimeouts incondicionales causaban dispatches duplicados de pubsub.

4. **`useCallback` para `onClose` y `onOpen`** en `EnhancedChannelsTab` + `EnhancedIntegrationsTab` — antes recreaban closure cada render, defeating any future React.memo.

5. **Activity log con sync entry reciente** — antes "Sincronizar ahora" no agregaba feedback visible al timeline. Ahora prepend "Sincronización manual completada" si `state.lastSync` es más reciente que el sample más reciente.

6. **Activity log keys** — antes `key={i}` → re-mount completo al prepend. Ahora `key={a.ts + ':' + a.kind}`.

7. **ScopesDisplay aria-label** — `role="list"` + `role="listitem"` + `aria-label="{label}, otorgado. {desc}"`. Screen readers ahora anuncian estado granted vs not granted.

8. **Duplicate `border` key** en sync button — second declaration silently overrides first.

9. **Confetti DOM remount** — `<div key={burstId}>` fuerza unmount/remount → CSS animation restart en cada purchase.

10. **Defensive `Number()`** en purchase history — `r.amount.toLocaleString` crasheaba si amount era undefined. Ahora `Number(r.amount || 0).toLocaleString`.

11. **Stable purchase key** — antes `purchasedAt + ':' + i` causaba re-mount de todos los items al prepend (shifting indices). Ahora `purchasedAt + ':' + packId`.

12. **Live clock tick en history** — `setInterval(force, 60_000)` mantiene "Hace X min" actualizado aunque user no toque nada.

13. **Defensive sort** — `getPurchasesHistory()` ahora se sortea explícitamente por timestamp en el consumer (no confiar en orden implícito).

14. **`array guard` antes de `.slice`** — `Array.isArray(raw)` previene crash si getter retorna null/undefined.

15. **`formatRelative` future guard** — `if (diff < 0) return 'Recién'` para clock skew.

16-20: Comentarios `// Post-audit Fase 3+4` documentando el reasoning en el código.

---

## IMPs diferidos (11)

- **Focus trap completo dentro de modals** (ARIA APG mandates Tab cycling). Requiere shared `useFocusTrap` hook. Defer a un sprint propio.
- **`_formatRelative` deduplication** — 3 copias inline (channels + integrations + monetization). Mover a `window.__mtxFmt.relative()`. Refactor cross-file, defer.
- **Sample activity timestamps relativos a session start** — actualmente computados at module load, derivan con session larga. Mock-only issue.
- **Phase 'error' explícito** para OAuth flows reales. Mock no falla, backend phase añade.
- **CATALOG `Object.freeze`** — defense in depth contra mutación.
- **`mtx:open-premium-sheet` listener verification** — el dispatch puede ser dead event. Audit cross-file requiere search en premium-gate.jsx.
- **Init bootstrap event-driven** (subscribe a `mtx:ia-config-changed` en lugar de polling timeouts). Mejora pero no urge.
- Inline `(function(){...})()` IIFE en phone validation podría refactorearse a helper.
- Background-tab throttle awareness para `manualSync` setInterval-like patterns.
- React.memo en cards para evitar full-list rerender en single-card change.
- Anti-pattern check: sheets que renderan `null` con hooks ya registrados — body scroll lock queda hidden hasta unmount completo del parent.

---

## Meta-lecciones builder→auditor

### 1. Una vez encontrado un patrón anti, el grep automático ayuda

`setIntegration` tenía el mismo guard `if (!_state.integrations[integ]) return;` que descubrimos en `setChannel` durante Fase 3 audit. Lo encontré en este audit pero ya estaba documentado en lessons doc anterior. **Regla:** post-audit, grep el patrón problemático en TODO el codebase, no solo el archivo actual.

### 2. `setTimeout` + `setState`/`setSomething` = always need cleanup

Casi todos los 8 connect flows + 2 OAuth integrations cometían el mismo error. La solución no es revisar caso por caso — es un helper compartido (`_useCommitGuard`). **Regla:** cuando ves el mismo bug en >3 lugares, extrae un hook compartido.

### 3. Phase state machines necesitan staged ESC

`role="dialog"` no significa "ESC cierra el dialog completo". Si tienes sub-states (consent screen, connecting spinner, confirm disconnect), ESC debe respetarlos. **Regla:** ESC handler en sheet con state machine debe ser staged, no monolítico.

### 4. `useMemo([])` no es "memoize", es "compute once"

Confetti particles con `useMemo(fn, [])` eran idénticos forever. Si el dato debe regenerarse en eventos, hay que ligar las deps a un counter incremental. **Regla:** `useMemo([])` = "compute once at mount". Si necesitas re-randomize, key it.

### 5. OTP inputs son universalmente sub-óptimos

Cada vez que veas 6-digit verification inputs en código nuevo, asume que está mal hasta que pruebes:
- Paste de los 6 dígitos
- Ordering out-of-sequence
- Backspace en cell vacío
- ArrowLeft/Right navigation
- `autoComplete="one-time-code"` en primera cell
- `aria-label` por cell

Esto es tan recurrente que justifica un componente shared para todo el codebase (futuro).

### 6. Deep-link buttons should be real `<button>` elements

`<a href="tg://..." target="_blank">` no funciona bien con custom protocols. Use `<button onClick={() => window.location.href = url}>` con try/catch.

### 7. `Notification.requestPermission` requiere defensive wrapping

iOS Safari, Brave strict, navegadores antiguos — todos pueden fallar de formas distintas. Use Promise.resolve wrapper + .catch + feature-detect callback signature.

### 8. Hook order: useState antes de early return SIEMPRE

`useReducer` o `useEffect` dentro de un `useStoreHook()` cuentan. Si tu componente puede llegar a `return null` antes de un `useState`, vas a tener hook count mismatch en un re-render eventual.

---

## Checklist actualizado (acumulado: Fase IA-2 + Fase 3+4)

Pre-flight antes de cualquier nuevo screen con sheet/modal:

- [ ] `useState`/`useRef`/`useCallback` ANTES de cualquier early return
- [ ] `useCallback` para handlers que se pasan como props
- [ ] `_useCommitGuard` o equivalente mountedRef en cualquier `setTimeout` que termine en `setState`/`setSomething`
- [ ] ESC handler staged: confirm → sub-phase → cerrar sheet
- [ ] Connecting/loading phases tienen Cancel button visible
- [ ] OAuth flows con timer cleanup en cancelar/desmontar/disconnect
- [ ] OTP inputs con paste + backspace + arrows + autoComplete=one-time-code + aria-label
- [ ] Promise chains tienen `.catch()` explícito; nunca `catch (_) {}`
- [ ] Deep-link CTAs son `<button>` con `window.location.href`, no `<a target="_blank">`
- [ ] Disconnect/reset limpia TODOS los campos transitorios (verifiedAt, lastSeen, etc.)
- [ ] Init bootstrap es idempotente (retry solo si falla)
- [ ] Confetti/animations con state-keyed remount para restart CSS
- [ ] Activity logs con `key={ts + ':' + kind}`, no `key={i}`
- [ ] Scope/permission lists con `role="list"` + aria-label per item
- [ ] Defensive `Number(x || 0)` antes de `toFixed`/`toLocaleString`
- [ ] Defensive `Array.isArray()` antes de iterar resultados de getters

---

## Validación final

| Métrica | Resultado |
|---|---|
| CRITs identificados / arreglados | 10 / 10 ✓ |
| IMPs identificados / arreglados | 31 / 20 (alto valor) |
| Regression tests via Playwright | 4/4 ✓ |
| Nuevos console errors | 0 ✓ |
| Cache versions bumped | ia-channels v2→v3, ia-integrations v2→v3, ia-monetization v2→v3 |
| Construcción aún funciona | ✓ (Fases 3+4 funcionales: 10 canales + 15 integraciones + monetization extras) |

**Próximo paso:** Fase 5 sigue siendo opcional — el frontend del producto está prácticamente completo. El siguiente sprint natural es Backend (Mastra + Supabase + n8n + RevenueCat) o cualquier polish específico que el user requiera.
