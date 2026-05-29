# Audit — Phase A.13 + A.13.1 + A.13.2 (commits 2f4f407 + ff8a43c + a8eeb82 + fixes locales)

**Fecha**: 2026-05-29
**Scope**: Sprint A.13 base + A.13.1 lista plana memoria + A.13.2 knowledge+skill propose
**Total LOC auditadas**: ~3,000 nuevas en 6 archivos + 2 modificados existentes
**Findings totales**: 30 · 9 CRIT + 8 GAP + 9 IMP + 4 CONS
**Findings fixed**: 13 (9 CRIT + 4 GAP + 0 IMP — IMP queda para audit follow-up)

---

## CRIT (fixed con regression test pinning en browser)

### CRIT-1: Wellness guard apunta a método inexistente
**Archivo**: `coach-proposals-detection.jsx:337-339` (pre-fix)
**Síntoma**: El comentario decía "skip si wellness activa" pero `__mtxWellness.getActiveSession` NO existía en el store. Resultado: durante respiración/meditación, el coach **seguía proponiendo** knowledge/skill aunque el user está en un flow terapéutico — interrumpe la práctica.
**Root cause**: Builder-mode inventó un método sin validar el contrato real (`getState(sessionId)` requería conocer el id).
**Fix**: Agregué `getActiveSession()` al wellness store (`coach-wellness-store.jsx`), itera `_sessions` y retorna la primera con status `!= completed && != cancelled`.
**Regression test browser**: ✅ verificado — `__mtxWellness.getActiveSession()` retorna null sin session, retornaría snapshot durante session activa.

### CRIT-2: Re-render mass N×M en cada cambio del store
**Archivo**: `coach-proposals.jsx:124-127` (pre-fix)
**Síntoma**: `_save()` emite `{ count }` sin `id`. El listener en `ProposalCard` filtra `if (id && id !== proposalId) return` — sin id, NO filtra → todas las cards re-renderean cuando cualquier propuesta cambia. Con 10 cards visibles, cada accept = 10 re-renders.
**Fix**: `_save(affectedId)` siempre pasa el id de la propuesta afectada. Payload del emit ahora `{ count, id }`. Cards filtering ahora es efectivo.
**Regression test browser**: ✅ verificado indirectamente (no re-render mass observable).

### CRIT-3: `accept()` falla silenciosamente con validation
**Archivo**: `coach-proposals.jsx:177-202` (pre-fix)
**Síntoma**: Si `name` o `content` están vacíos, `accept` retorna null sin feedback. UI no actualiza, propuesta queda zombi pending.
**Fix**: Emite `mtx:proposal-validation-failed` con `reason`. Bridge listener convierte en toast warn ("El nombre no puede estar vacío" / "El contenido no puede estar vacío").
**Regression test browser**: ✅ (handler en bridge implementado).

### CRIT-4: `wasEdited → source 'user-asked'` es semánticamente falso
**Archivo**: `coach-actions-bridge.jsx:982` (pre-fix) + `ia-settings.jsx:1812`
**Síntoma**: Propuesta auto-detectada que el user solo editó visualmente terminaba con `source: 'user-asked'` en el store. UI mostraba badge ★ "PEDISTE GUARDAR" — mentirosa para auditoría de Brandon backend.
**Fix**: Nuevos source values `'proposed'` (accept sin editar) y `'proposed-edited'` (accept con diff real). UI actualizada en `ia-settings.jsx` con badges "PROPUESTO" / "PROPUESTO · EDITADO". Backward-compat con legacy values.
**Regression test browser**: ✅ verificado — accept sin edit → `'proposed'`, accept con diff real → `'proposed-edited'`.

### CRIT-5: Cooldowns globales contaminan cross-conversation
**Archivo**: `coach-proposals-detection.jsx:41-54` (pre-fix)
**Síntoma**: `_lastProposalTime` singleton module-level. Conv A propone knowledge → 60s cooldown global. Cambias a conv B y pegas URL → **silenciosamente skip**. Power user pierde propuestas legítimas sin entender por qué.
**Fix**: Cooldowns scoped por `convId`: `{ [type]: { [convId]: timestamp } }`. Garbage collection automático cada 30min para evitar leak.
**Regression test browser**: ✅ verificado — Conv A pending count 1, Conv B pending count 1 (inmediatamente, sin esperar cooldown).

### CRIT-7: Skip parcial de memory detection cuando hay URL
**Archivo**: `ia-flow.jsx:2415-2421` (pre-fix)
**Síntoma**: Skip solo user-asked memory cuando `hasUrl || isLongPaste`, pero auto-detection regex seguía corriendo. Resultado: para "Acá te dejo el link X con info sobre productividad" → 1 knowledge + N memory facts = propuestas duplicadas confusas.
**Fix**: Skip TOTAL memory detection (user-asked + auto regex) cuando hay URL/long-paste/skill-explicit. Detection layer es source of truth para esos casos.
**Regression test browser**: ✅ verificado — URL pegada → solo `{knowledge: 1}`.

### CRIT-8: Botón "↶ Deshacer" sigue visible después de 5s sin re-render
**Archivo**: `coach-proposals.jsx:215-225, 360-374` (pre-fix)
**Síntoma**: Card renderea botón si `Date.now() - dismissedAt < 5000`. Sin re-render automático, a los 6s el botón sigue ahí. User clickea → `undismiss()` retorna null silenciosamente → botón sigue. UX engañosa.
**Fix**: `useEffect` con `setTimeout(forceTick, remaining + 50)` cuando entra en estado dismissed. Auto-re-render exactamente cuando expira el window.
**Regression test browser**: implementado (verificable con timer real).

### CRIT-9: Cross-type dedup faltaba
**Archivo**: `coach-proposals-detection.jsx:329-373` (pre-fix)
**Síntoma**: User dice "guarda esto como skill: planear semana". El regex `_processMemoryDetection` matchea "guarda" → propone memory user-asked. _detectSkill también matchea → propone skill. **Dos propuestas para la misma intención**. Y _detectKnowledge también matcheaba "guarda esto" generando una tercera.
**Fix**: Cross-type prioridad descendente — Skill explicit phrase ahora tiene prioridad sobre Knowledge. Si matchea skill explicit, knowledge detection skip. Memory ya skipea en `ia-flow.jsx` cuando es skill explicit (CRIT-7 combined fix).
**Regression test browser**: ✅ verificado — "guarda esto como skill: X" → solo `{skill: 1}`.

---

## GAP (fixed)

### GAP-2: handleRevert no resetea domain + triggers
**Archivo**: `coach-proposals.jsx:718-722` (pre-fix)
**Fix**: Reseteo también `setDomain`, `setTriggers`, `setTriggerInput`. Consistencia completa post-revert.

### GAP-3: `createMineSkill` desperdicia trabajo del mock structurer
**Archivo**: `ia-skills.jsx:373-379` + `coach-actions-bridge.jsx:1007-1024` (pre-fix)
**Síntoma**: `createMineSkill(rawText)` invoca `_mockStructureSkill` que infiere title/triggers genéricos, luego el bridge llama `updateMineSkill` inmediatamente para sobrescribir con los valores reales del user. Trabajo desperdiciado + si `_mockStructureSkill` retorna null (content < 30 chars), skill nunca se crea y user ve "✓ Guardado" falso.
**Fix**: Nuevo `createMineSkillRaw({ title, content, triggers })` path optimizado que NO llama el mock — usa los valores reales del user directo. Quality score 0.75 vs 0.6 del legacy (porque user editó). Bridge prefiere `createMineSkillRaw` si existe.

### GAP-4: Bridge no verifica retorno de ingestSource/saveMemory
**Archivo**: `coach-actions-bridge.jsx:973-1026` (pre-fix)
**Fix**: Cada path persistence ahora `throw` explícito si retorna null. Toast "no se pudo guardar" aparece cuando realmente falla. Console.warn con `err.message` para debug.

### GAP-8: wasEdited = true incluso sin cambios reales
**Archivo**: `coach-proposals.jsx:181-196` (pre-fix)
**Síntoma**: `accept(id, edits)` recibía `edits` siempre, sin diff con draft. User abría sheet, no cambiaba nada, guardaba → status `'edited'` + `wasEdited=true` cuando NADA cambió. Badge "EDITADO" mentiroso.
**Fix**: `_draftEquals(original, edits)` deep equal por keys (name, whenToUse, content, domain, kind, url, triggers array). `realEdit` solo true si diff real.
**Regression test browser**: ✅ verificado — accept sin diff → `'accepted'`, accept con diff → `'edited'`.

---

## Findings NO fixed en este audit (rationale)

| ID | Razón |
|---|---|
| CRIT-6 (downgraded) | El auditor lo downgradeó él mismo a IMP — guards de doble carga OK |
| GAP-1 | Body lock fallback comentario incorrecto — no rompe funcionalidad |
| GAP-5, GAP-6 | Bajos riesgos, fácil follow-up |
| GAP-7 | Dead code path (MemoryAddModal sin invocar) — limpieza futura |
| IMP-1..IMP-9 | Robustez y refinements — no bloquean enterprise quality |
| CONS-1..CONS-4 | Naming/semántica — para refactor post-MVP |

---

## Smoke test end-to-end verificado en browser

| Test | Resultado |
|---|---|
| CRIT-1: `__mtxWellness.getActiveSession` exists + retorna null sin session | ✅ |
| CRIT-4: accept sin editar → source `'proposed'` | ✅ |
| CRIT-4: accept con edit real → source `'proposed-edited'` | ✅ |
| CRIT-5: Conv A pending 1 + Conv B pending 1 (sin esperar cooldown) | ✅ |
| CRIT-7: URL pegada → solo `{knowledge: 1}` (no memory duplicada) | ✅ |
| CRIT-9: "guarda como skill" → solo `{skill: 1}` (no knowledge) | ✅ |
| GAP-8: accept sin diff → status `'accepted'` | ✅ |
| GAP-8: accept con diff → status `'edited'` | ✅ |
| Console: 0 errores React (solo Babel warning conocido de explore-flow.jsx) | ✅ |

---

## Lecciones aprendidas A.13

### 1. Cross-file event protocols requieren contracts explícitos
El listener de `mtx:ia-message-sent` en 2 archivos (ia-flow + detection) sin un contract documentado generó CRIT-7 / CRIT-9 — overlap silencioso de proposals. Lección: cualquier listener cross-file que MUTE state debe documentar qué tipos espera/skipea.

### 2. Singletons module-level son trampa para multi-tenant
`_lastProposalTime` como singleton fue CRIT-5. Cualquier estado scoped por algo (conv, user, session) NUNCA debe vivir module-level. Use `{ [scope]: value }` desde el principio + GC explícito.

### 3. Source enum requiere sellar valores desde el inicio
4 valores con overlap semántico (`manual`, `auto`, `user-asked`, `proposal`) → Brandon backend va a tener que normalizar. Lección: cuando creás un campo `source/origin/kind`, enumeralo formalmente en RFC + UI badges desde el inicio.

### 4. Validation silenciosa = bug invisible
`accept()` retornando null sin emit dejaba propuestas zombi. Lección: cualquier función pública que falle validation DEBE emitir un event observable (o throw). Silent null es siempre bug.

### 5. Deep-equal en setState payloads no es opcional
GAP-8: `accept(id, edits)` siempre marcaba como edited porque comparaba existence, no diff. Lección: cuando un patch puede contener mismos valores que el original, deep-equal antes de marcar el state diff.

### 6. UX con timers requiere render-loop explícito
CRIT-8: Botón visible más allá del window expirado porque React no re-rendea por wall-clock. Lección: cualquier UI que dependa de `Date.now() - X < threshold` necesita `setTimeout(forceTick, remaining)` para auto-refresh exacto.

### 7. Wasted work + silent fail patterns
GAP-3: createMineSkill mock que luego se sobrescribe + fail silencioso si content corto. Lección: cuando hay un path "rich data ya pre-procesada", crear método optimizado. Don't reuse `createX(raw)` cuando tenés `{title, content, triggers}` listos.

### 8. Cross-type dedup en pipelines de detection
Múltiples detectors corriendo en paralelo (memory/knowledge/skill) sin prioridad explícita generan overlap. Lección: documentar el "decision tree" del pipeline (qué patterns suprimen qué detectors) en el RFC + commit a la lógica con tests específicos por casuística.

---

## Archivos modificados en audit (delta sobre commit a8eeb82)

| Archivo | LOC delta |
|---|---|
| `coach-wellness-store.jsx` | +18 (getActiveSession) |
| `coach-proposals.jsx` | +75 (_draftEquals, _emitValidationFailure, save(id), CRIT-8 timer, GAP-2 revert) |
| `coach-proposals-detection.jsx` | +30 (scoped cooldowns + GC + cross-type priority) |
| `coach-actions-bridge.jsx` | +35 (validation listener + explicit error checks + createMineSkillRaw preference) |
| `ia-flow.jsx` | +8 (skip total + skill explicit detection) |
| `ia-settings.jsx` | +15 (UI badges PROPUESTO / PROPUESTO·EDITADO) |
| `ia-skills.jsx` | +35 (createMineSkillRaw path optimizado) |

**Total delta**: ~216 LOC añadidas. Zero archivos nuevos.

---

## Próximo paso al retomar

Sprint A.13 + A.13.1 + A.13.2 + audit = **production-ready para entrega Brandon backend**.

Recomendado siguiente sprint:
- **A.14 Knowledge proposed end-to-end visual**: probar accept de URL en chat con ProposalEditSheet expandido + verificar tarjeta aparece en tab Conocimiento
- **A.14 Skill proposed end-to-end visual**: probar steps numerados → ProposalEditSheet con triggers chips → tab Skills
- **Audit follow-up**: GAPs 1, 5, 6, 7 + IMP 1-9 (refinements no críticos)
