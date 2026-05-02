# Phase 5 — Audit Lessons (IA quick access + recordatorios single-source)

**Fecha:** 2026-05-02
**Construction commits:** `a2a6f59` (recordatorios single-source HomeActive), `56f18b7` (delete + heights), `eb6d91e` (spacing ritual + AppsCard empty), `df44b23` (acceso rápido IA + 3 fixes visuales), `85eae6f` (chat header scope-aware), `<este>` (routing fix + audit)
**Audit commit:** este commit

## Alcance

Auditoría sobre la fase 5: integración cruzada IA ↔ HomeActive + recordatorios
single-source + ajustes visuales acumulados. Total auditado:

- `screens/ia-agenda.jsx` — `AddReminderSheet`, `HomeRemindersCard`,
  `restoreReminder` store method, portal a `mtx-overlay-root`.
- `screens/home-active.jsx` — `AppsProtectionCard` empty state, botón ✦ IA
  en header, `onOpenSessionChat` callback, eliminación de div con `filter:blur`
  en card del timer.
- `screens/ia-flow.jsx` — listener `mtx:ia-open-session-chat`, helper
  `_buildSessionGreeting`, chips render en `IAMessageBubble`, listener
  `mtx:ia-chip-tap`, `IAChatHeader` scope-aware, fix routing back
  session-chat → tab home, store method `update`.
- `Mentex Home.html` — `setTab('ai')` + dispatch sequence, listener
  `mtx:ia-leave-session-chat`, effect cleanup conv session-active al
  finalizar sesión.
- `components/mentex-shared.jsx` — `MtxSectionHead` margin negativo en
  actionIcon button.
- `styles/mentex-tokens.css` — keyframe `mtx-fade-in`.

## Findings

### CRIT-1 — Conversación con `scope='session-active'` no se limpia al finalizar sesión

**Síntoma:** El user inicia sesión, abre coach via ✦, agrega contexto al chat,
finaliza la sesión. Próxima sesión: vuelve a tap ✦, **reusa la conv vieja**
con saludo stale ("17 min restantes" cuando esa sesión ya terminó hace horas,
"4 apps bloqueadas" cuando bloqueó otras esta vez). El user puede pensar que
el coach está roto o que mezcla sesiones distintas.

**Root cause (lo que builder-mode no vio):** Builder-mode pensó "reusar la
conv si existe" como una optimización (no recrear). Auditor-mode tiene que
preguntar *¿cuándo deja de ser válida la conv?*. Una conv `scope='session-active'`
es **efímera por definición** — su contenido depende del state de UNA sesión
específica. Cuando esa sesión termina, la conv pierde sentido.

**Fix:**
- En `Mentex Home.html`: nuevo `useEffect` con `wasActiveRef` que detecta
  el cambio `tweaks.homeState: 'active' → 'inactive'` y purga todas las
  conversaciones con `scope === 'session-active'` via
  `window.__mtxIAChat.deleteConversation(c.id)`.
- Las conv normales (sin scope) se preservan en history — solo las efímeras
  se limpian.

**Regression check (smoke):** Crear conv session-active → click "Sí, finalizar
la sesión" → "Volver al inicio" → `__mtxIAChat.list().filter(c => c.scope ===
'session-active').length === 0`. ✓ Verificado: `purged: true, allConvs: []`.

**Lesson general:** Conversaciones efímeras necesitan un **lifecycle hook**
explícito asociado al evento que las invalida. Sin ese hook, "efímero" se
convierte en "permanente con datos rotos" — peor que no haberla creado.

---

### IMP-1 — Saludo del coach quedaba stale al reusar conv tras cambios en state

**Síntoma:** El listener `mtx:ia-open-session-chat` reusaba la conv existente
al volver a tap ✦, pero el primer mensaje del assistant (saludo
contextualizado) quedaba congelado al state del primer tap. Si el user
agregaba 2 reminders, volvía a tap ✦ — seguía leyendo "3 recordatorios
activos" en vez de "5".

**Root cause:** Builder-mode trató el saludo como un mensaje cualquiera del
chat ("ya escribí algo, no lo toco"). Pero el saludo del coach NO es un
mensaje del user ni una respuesta a uno — es un **status snapshot** del
state actual. Debe regenerarse cada vez que se entra al chat.

**Fix:** En el listener, si reusa conv:
```js
var firstAsst = existing.messages.find(m => m.role === 'assistant');
var freshGreeting = _buildSessionGreeting(ctx);
if (firstAsst && firstAsst.content !== freshGreeting) {
  window.__mtxIAChat.updateMessage(existing.id, firstAsst.id, { content: freshGreeting });
}
```

**Regression check:** Abrir chat con 4 reminders → volver al home → agregar 2
reminders → reabrir chat → mismo `conv.id` (`sameId: true`), saludo cambió
de "4 recordatorio" → "6 recordatorio" (`updated: true`). ✓

**Lesson general:** Un mensaje del assistant que es **status snapshot**
(no respuesta a input del user) debe regenerarse al re-entrar al contexto,
no preservarse como historia.

---

### IMP-2 — `AddReminderSheet` input no submetea con Enter

**Síntoma:** UX standard mobile — el botón "return" del keyboard sobre un
input single-line debería submitear el form. Forzar tap del botón Crear
para cada reminder rompe el flow rápido de captura de ideas.

**Root cause:** Builder-mode olvidó esto. Patrón básico no aplicado.

**Fix:** `onKeyDown` en el input:
```js
onKeyDown={function(e) {
  if (e.key === 'Enter' && !e.shiftKey && title.trim()) {
    e.preventDefault();
    handleCreate();
  }
}}
```
Guard `!e.shiftKey` previene submit accidental con Shift+Enter (aunque el
input es type=text single-line, mejor seguro). Guard `title.trim()` evita
submit con título vacío (consistente con disabled del botón Crear).

**Regression check:** Tipear "Caminar 10 min" + dispatch keydown Enter →
`newReminderViaEnter: true, modalClosed: true`. ✓

---

### IMP-3 + IMP-4 — Re-renders innecesarios en `HomeRemindersCard`

**Síntoma:** Dos issues acoplados:
- `portalRoot = document.getElementById('mtx-overlay-root')` se computaba
  en cada render del card (DOM lookup repetido para algo estático).
- `onClose={function() { setAddOpen(false); }}` se recreaba en cada render,
  causando que `AddReminderSheet` re-registre el keydown listener via su
  `useEffect([open])` (mitigation parcial — el ref pattern lo cubre, pero
  el inline lambda sigue creándose).

**Root cause:** Builder-mode no aplicó `useMemo`/`useCallback` para values
que se sabe son estables. Es exactamente el mismo blind spot #9 que sigue
cazándome.

**Fix:**
```js
var portalRoot = React.useMemo(function() {
  return (typeof document !== 'undefined')
    ? document.getElementById('mtx-overlay-root') : null;
}, []);
var handleAddClose = React.useCallback(function() { setAddOpen(false); }, []);
```

**Lesson general (sigue siendo el mismo):** El blind spot #9 del CLAUDE.md
(useEffect deps con callbacks recreados) es real y persistente. Ya lo
he reproducido en 3 fases consecutivas. La regla del checklist **no es
suficiente** — necesito test-first o un linter rule. Para próxima fase:
escribir el assert ANTES del código.

---

### IMP-5 (encontrado pero no fixeado) — `mtx:ia-open-session-chat` con setTimeout 60ms es race-prone

**Síntoma:** `MentexApp` hace `setTab('ai')` y luego
`setTimeout(() => dispatch(...), 60)`. El timeout existe porque IAScreen
necesita estar montado para que el listener esté registrado. Pero 60ms es
arbitrario — si el render tarda más (CPU loaded, gran árbol React), el
evento se dispara antes de que el listener esté.

**Por qué no se fixeó:** En la práctica funciona. Para arreglarlo
correctamente habría que cambiar el approach a algo como un `pending
intent` que IAScreen lea al mount, o un retry mechanism. Diff de >50 LOC
para resolver un riesgo teórico. **Trade-off explícito**: documentado
aquí para futuro audit.

**When to fix:** Si veo flakiness en smoke tests, o si el user reporta
que a veces el botón ✦ no abre el chat correctamente.

---

### IMP-6 (encontrado pero no fixeado) — `MtxSectionHead` margin negativo no validado contra todos los consumers

**Síntoma:** El fix del header del ritual (`marginTop: -4, marginBottom: -4`
en el actionIcon button) asume que todos los actionIcon buttons miden
30×30. Si algún consumer pasa un actionIcon que renderiza un button más
grande, los negative margins podrían no ser suficientes y el row se
extendería de nuevo.

**Por qué no se fixeó:** Verificación pasiva. Reviso los 13 consumers de
`MtxSectionHead` en una future passage. Si rompe, ajusto.

---

## Smoke tests agresivos ejecutados

1. **Routing back de session-chat** → vuelve a HomeActive, no al hub IA.
   Visual confirmado en screenshot.
2. **Cleanup conv session-active al finalizar sesión** → `purged: true`,
   `allConvs: []` después del flow completo (Finalizar → Sí, finalizar →
   Volver al inicio).
3. **Enter submit en input de AddReminderSheet** → reminder creado +
   modal cerrado en single keystroke.
4. **Saludo regenerado al reusar conv** → mismo conv id, contenido
   actualizado de "4 recordatorios" a "6 recordatorios" tras agregar 2.
5. **Single source HomeRemindersCard ↔ AgendaSheet** (verificado en fase
   anterior, mantengo).
6. **Bug GPU del timer eliminado** (verificado al construct, mantengo).
7. **0 console errors** en todos los flows.

## Meta-lecciones

1. **Conversaciones/datos efímeros necesitan lifecycle hooks explícitos.**
   Si algo es "efímero por definición", debe haber un evento concreto
   que lo invalide y un effect que lo limpie. Sin eso, "efímero" miente.

2. **Mensajes de "status snapshot" del assistant deben regenerarse, no
   preservarse.** Distinto de mensajes en respuesta a input del user.
   Distinguir entre los dos al diseñar la conversación.

3. **El blind spot #9 (useEffect/callbacks recreados) sigue conmigo en
   cada fase.** Solo test-first lo va a parar de verdad.

4. **Patrones UX standard mobile (Enter submit, swipe-down dismiss, long-
   press menu) NO son features extra — son baseline.** Aplicarlos por
   default, no esperar a que el user los pida.

5. **Routing entre tabs con state efímero requiere "tab origin" tracking
   o eventos custom de retorno.** El back default no respeta el contexto;
   hay que cablear explícitamente.

## Updated checklist for next phase

Antes de escribir el primer JSX de cualquier feature cross-tab/cross-component:

- [ ] ¿La data tiene scope efímero? Si sí, ¿cuál es el evento que la invalida?
      Implementar lifecycle hook que limpia automáticamente.
- [ ] ¿Hay algún mensaje del assistant que sea "status snapshot"? Implementar
      regeneration al re-entrar al contexto.
- [ ] ¿Los inputs forms tienen Enter submit?
- [ ] ¿`useMemo`/`useCallback` aplicados a portal lookups, callbacks pasados
      a hijos con effect deps?
- [ ] ¿Routing back respeta el "origin tab" del user, o lo manda al default?
- [ ] ¿Toda la nueva surface se prueba con smoke + verificación de store
      state, no solo visual?

## Link a las construction commits

- `a2a6f59` — recordatorios single-source HomeActive
- `56f18b7` — delete sin confirm + alineación modal heights
- `eb6d91e` — spacing ritual + AppsCard empty state
- `df44b23` — acceso rápido IA + 3 fixes visuales (GPU bug, bubble, spacing)
- `85eae6f` — chat header scope-aware
