# RFC-001 Addendum A — Frontend-Ready Cableado Completo (Fase A++)

> **Estado:** ✅ SEALED v1.0 · **Fecha sello:** 2026-05-26 · **Owner:** Diego (founder Mentex)
> **Documento padre:** [`RFC-001-COACH-AGENT-CAPABILITIES.md`](./RFC-001-COACH-AGENT-CAPABILITIES.md) (Fase A — Frontend mock, sellado)

---

## §0 — Por qué este addendum existe

El RFC-001 §8 sellado definió Fase A como *"frontend mock de las 8 tools Core + 20 artefactos + 10 mocks históricos"*. Eso se entregó en **Semanas 1 y 2** (commits `582b9ab` → `343475e`).

Pero el RFC originalmente decía que las **Fases C (Extended) y D (Visionario)** se construyen *"3 meses post-launch"* y *"año 1+"* — asumiendo que esos sprints incluían tanto frontend como backend simultáneos.

**Decisión post-Semana 2 del founder (2026-05-26):**

> Aprovechar Sprint frontend-mock para **dejar TODO el UI cableado y esperando backend**, incluso de Fases C/D. Cuando Brandon termine BFF, conectar Fases C/D toma días, no meses. Billion-dollar prep.

Este addendum formaliza eso como **Fase A++** — extensión del Sprint frontend-mock a un superset completo.

---

## §1 — Principio rector

> **Toda capacidad del RFC-001 que pueda construirse sin backend, se construye AHORA frontend-only.** Cuando llegue backend, conectar es trivial. Cuando llegue Brandon, le entregamos un repo que ya tiene las UIs de Fase C/D listas — solo cambia el origen del data (mock → BFF real).

**Reglas:**

1. Cada item de Fase A++ debe ser **funcional visualmente** con mock data realista. No placeholders vacíos.
2. Cada artifact debe dispatchear `mtx:coach-artifact-action` con el shape que el backend real va a recibir. **Contrato-first.**
3. Cada flow visible al user debe ser **demoteable** — un periodista o inversor probando el prototipo debe sentir el producto completo, no un esqueleto.
4. Auditoría C-A-R **única** al final cubre TODO de una vez. No auditar a medias.

---

## §2 — Sprint A.5 (semana 2.5) — UX completeness

**Estimación:** ~2,000 LOC · 1-2 días
**Pre-requisito:** Semanas 1 y 2 mergeadas (✅ commits `582b9ab` → `343475e`)

### A1 — 7 artifacts nuevos especializados para tools de Fase C/D

| Artifact | Tool destino | Shape principal |
|---|---|---|
| `source_list` | `web_search` | `{ sources: [{ favicon, title, snippet, url, domain }] }` |
| `article_summary` | `web_fetch` | `{ title, author, readingTime, highlights: [string], originalUrl }` |
| `thinking_panel` | `extended_think` | `{ summary, expandedReasoning?: string, durationMs }` |
| `integration_action_card` | `integrate_action` | `{ provider: 'notion'\|'spotify'\|'google_cal', action, status, preview? }` |
| `browse_progress_card` | `browse_act` | `{ url, steps: [{ screenshot?, label, status }], result? }` |
| `voice_call_overlay` | `voice_call` | `{ state: 'connecting'\|'active'\|'ended', durationSec, muted? }` (fullscreen) |
| `screen_share_preview` | `screen_share_understand` | `{ previewImage?, region, coachNote }` |

**Patrón:** mismo que Semana 2 — cada componente standalone en `ia-artifacts.jsx` + case en router + export window.

### A2 — Simulación runtime del coach (keyword → steps progresivos)

Cuando el user escribe un prompt nuevo, el LLM mock detecta keywords y emite steps progresivos antes de responder, mostrando el timeline en VIVO.

**Implementación:**
- Mapa de keywords → set de tools (`reservar` → `web_search` + `browse_act` + `agenda`)
- `setTimeout` progresivo entre steps (800-2000ms cada uno)
- Al terminar, emite el artifact correspondiente
- Vive en `screens/coach-runtime-simulator.jsx` para no contaminar `ia-flow.jsx`

### A3 — Crisis auto-trigger (regex frontend)

Detección frontend de keywords-señal de crisis → automáticamente trigger del `crisis_support_card` sin pasar por LLM mock.

**Keywords iniciales (a refinar en RFC-002):**
- *"hacerme daño"*, *"suicidarme"*, *"acabar con todo"*, *"no quiero seguir"*, *"autolesión"*, *"abuso"*

**Comportamiento:**
- Match → suprime el flow normal del LLM
- Renderiza directamente `crisis_support_card` con recursos del país detectado por geo-IP (mock: 🇨🇴 por default)

### A4 — Onboarding del Coach (tutorial primera vez)

Primera vez que el user abre el chat IA → tutorial cinematográfico de los 4 killer features:

1. *"Te conozco y te recuerdo"* → demo de `memory_recall_card`
2. *"Planifico tu día por ti"* → demo de `plan_card`
3. *"Hago cosas por ti en internet"* → demo de `browse_progress_card`
4. *"Tu Universo de contenido a un mensaje"* → demo de `recommendation_card`

Persistido en `__mtxOnboarding.coachTutorialSeen`. Skippeable.

### A5 — Cost meter UI

Chip discreto en el header del IA tab: *"42 / 50 hoy"*. Cambia color sutil cuando se acerca al límite. Hover muestra breakdown por categoría.

Frontend-only — mock con localStorage que decrementa en cada conversación nueva. Backend lo conecta al `usage_quotas` real en Sprint B.

### A6 — Share conversation

Botón "Compartir" en el header de cada conversación que genera:
- **PNG** via canvas (snapshot de la conversación)
- **Link mock** (`mentex.app/c/{shortId}` — placeholder hasta backend)
- **Markdown** export

Toast confirmación al compartir.

### A7 — Search en historial

Buscador en el History sheet que filtra conversations por contenido. Frontend simple sobre el array de mensajes.

- Input debounced 200ms
- Highlight de matches en el preview de cada conv
- Cero results state con CTA "crear conversación nueva"

### A8 — Feedback inline por mensaje

Botones sutiles `👍` / `👎` debajo de cada respuesta del coach. Click → highlight + toast *"Gracias por el feedback"*. Mock por ahora — backend en Fase B lo usa para fine-tuning.

Persistido en `__mtxIAChat` como `msg.feedback: 'positive' | 'negative' | null`.

---

## §3 — Sprint A.6 (semana 2.6) — Tools "que requerían backend" con UI completa mockeada

**Estimación:** ~2,500 LOC · 2-3 días
**Pre-requisito:** Sprint A.5 validado por Diego

### B1 — `web_search` mock completo

Mock provider con resultados realistas (5 sources por query) que renderiza `source_list`. Acepta query → simulación de 1.5s → resultados con favicon + title + snippet.

### B2 — `web_fetch` mock completo

User pega URL en chat → coach detecta → `web_fetch` mock → `article_summary` con highlights generados de templates.

### B3 — `image_generate` flow completo

Sheet de generación con prompt input + estilo selector (estilos: ilustración / foto / abstracto / acuarela). Loading skeleton durante "generation" → `image_inline` con gradient placeholder + badge GENERADA.

### B4 — `extended_think` refinado

`thinking_panel` con animación de "decantando" + expansion del razonamiento mock. Múltiples niveles de profundidad: superficial / medio / profundo.

### B5 — `browse_act` flow completo

**El más rico de A.6.** User dice *"reservame X"* → coach pide `confirmation_card` → al confirmar → `browse_progress_card` con screenshots progresivos (mock images con UI realistas) → result final con confirmación de la acción.

Ya tenemos el storyboard del yoga en mock conv #5 — aquí lo construimos LIVE.

### B6 — `video_generate` flow completo

Sheet de prompt + estilo → loading → `video_inline` con thumbnail gradient + play overlay.

### B7 — `voice_call` overlay fullscreen

Tap *"hablemos por voz"* en header del chat → `voice_call_overlay` fullscreen con:
- Waveform animado representando voz del coach
- Duración running
- Controls: mute, hangup, transfer-to-text
- Estado: connecting → active → ended

Mock simula 3-4 turnos de conversación con TTS visualizado.

### B8 — `screen_share_understand` flow

Tap *"compartir pantalla"* → permission mock iOS-style → `screen_share_preview` con preview pixelado + texto *"el coach está mirando"* + sugerencias contextuales mock.

### B9 — `wearable_read` con OAuth mock

Settings → Conectar Apple Health → permission flow mock iOS → al volver al chat, el coach tiene "acceso" a data mock de wearable (sleep, HRV, steps, workouts).

### B10 — Memoria persistente cross-session

localStorage con `__mtxMemoryStore` que persiste:
- Hechos del usuario (`memory.semantic.store` mock)
- Conversaciones (`memory.conversation.append` mock)
- TTL por hecho (decay simulation)

El `memory_recall_card` lee de aquí, no de inline.

### B11 — Coach LLM mock más rico

Mejorar el adapter mock actual para soportar:
- Multi-turn con context awareness
- Tool-chains visibles (3+ tools en serie)
- Regenerate del último mensaje
- Stop generation durante streaming
- Continue if cut

### B12 — Premium-gate UI completo

Lock visual en tools premium (ej. `browse_act`, `voice_call`, `video_generate`) con:
- Icon candado discreto en el botón/acción
- Tap → modal de plan con CTA upgrade
- Tooltip *"Disponible en Premium"*

Lee plan del `__mtxIsPremium()` existente — ya cableado, solo agregar gating visual.

---

## §4 — Sprint A.7 (semana 2.7) — Cabos sueltos + power features chat

**Estimación:** ~1,500 LOC · 1-2 días
**Pre-requisito:** Sprint A.6 validado por Diego

### C1 — Multi-canal preview (RFC §7.10)

En Settings → IA → Canales: preview *"así suena Mentex aquí"* mostrando cómo el coach se ve/habla en WhatsApp / Watch / Telegram / iMessage / Slack. Mock screenshots.

### C2 — Voice input completo

Botón micro en el input del chat → recording con waveform animado → transcripción en vivo → enviar como mensaje.

Reutiliza `voice-transcription.jsx` existente, lo conecta al flow del chat.

### C3 — Coach voice playback

Cuando el coach manda audio (artifact `voice` o `audio_waveform`), `audio_waveform` reproduciendo en tiempo real con barras moviéndose con la "voz".

### C4 — Multi-modal input

Pegar imagen / link / archivo en el chat → preview en el input → al enviar, el coach detecta y actúa (`web_fetch` para link, vision para imagen).

### C5 — Edit del prompt ya enviado

Click derecho/long-press en mensaje del usuario → "Editar" → modifica el prompt → coach regenera respuesta.

### C6 — Regenerate respuesta del coach

Botón sutil debajo de cada mensaje del coach → "Regenerar" → suprime respuesta anterior, regenera.

### C7 — Stop generation

Durante streaming del coach, botón "Stop" visible → corta el stream, deja el texto generado hasta el momento.

### C8 — Continue generation

Si el coach se cortó (timeout, stop manual), botón "Continuar" → completa.

### C9 — Pin / Tag conversaciones

En el historial, long-press → menú con Pin / Tag / Archive / Delete. Tags como chips de color filtrables.

### C10 — Export conversation

Botón en el menu de cada conv → exportar como:
- PDF (formato libro)
- Markdown
- Imagen larga (toda la conv en una imagen)

---

## §5 — Inventario "no se nos escapa nada"

| Área del RFC-001 | Cubierto por | Status |
|---|---|---|
| §4 — 20 tools del catálogo (Core + Extended + Visionario) | Semana 1+2 (Core) + A.5 (artifacts ext) + A.6 (flows ext/vis) | ✅ Todo cableado |
| §5.2 — 20 tipos de artifacts | Semana 1+2 + A.5 (7 nuevos) = 27 artifacts totales | ✅ Completo |
| §5.6 — Catálogo gerundio (20 tools) | Semana 1 | ✅ Completo |
| §5.5 — State machine 9 estados | Semana 1+2 + A.6 (refinamiento) | ✅ |
| §6 — `<CoachTimeline />` + `<CoachArtifact />` | Semana 1+2 | ✅ |
| §7 — 12 features del Universo (RFC §7.1-§7.12) | Existentes + A.7 polish multi-canal | ✅ |
| §8 — 20 momentos emocionales | Mocks Semana 1+2 + A.6 (más mocks) | ✅ |
| §11 — 5 storyboards end-to-end | 4/5 (Semana 1+2) + A.6 cierra el #2 (yoga browse_act) | ✅ |
| RFC-002 — Crisis | A.3 (auto-trigger) + crisis_support_card (Semana 2) | ✅ Frontend listo |
| Power features chat (regenerate/stop/edit/etc) | A.7 | ✅ |
| GAPs G1-G6 del contrato backend | G1 cubierto con A5 cost meter; resto requiere backend | ✅ Frontend listo |

**Vacíos identificados como sprints separados (NO Fase A++):**

- **RFC-002 completo** — crisis_handle protocolo clínico (requiere profesional de salud mental + legal review).
- **Backend integration real** — Sprint B (Brandon, paralelo).
- **C-A-R audit completo** — Semana 3.
- **Wiring real al Gateway Imperial** — Sprint B.

---

## §6 — Plan de ejecución (uno por uno con validación)

| Día | Sprint | Output | Gate |
|---|---|---|---|
| **D1** | A.5 (A1-A8) | Commit + push | Diego valida visualmente |
| D2 | A.6 (B1-B12) | Commit + push | Diego valida visualmente |
| D3-D4 | A.7 (C1-C10) | Commit + push | Diego valida visualmente |
| D5 | **Semana 3 — C-A-R completo** | Auditoría + smoke test + lessons doc | TODO verde |
| → | **Green-light Fase B** | Brandon arranca BFF cuando termine Sprint 0 contract tests | — |

**Reglas del plan:**
- Cada sprint termina con commit + push **antes** de pasar al siguiente.
- Diego valida visualmente entre sprints. Si algo no calza, se corrige antes de avanzar.
- El C-A-R al final cubre TODO de una sola sesión (auditor-mode fresco).
- Cero builder-mode-bias entrando al C-A-R.

---

## §7 — Después de Fase A++

Cuando Fase A++ esté sellada (todos los sprints A.5/A.6/A.7 + C-A-R verdes), el roadmap continúa:

| Fase | Responsable | Disparador | Output |
|---|---|---|---|
| **Fase B** — wiring real | Brandon (BFF) + Diego (validate) | Sprint 0 contract tests del backend verdes | 8 tools Core conectadas al Gateway real |
| **Fase C** — Extended live | Brandon | Sprint B mergeado + APIs externas en lugar (Brave/Perplexity/Higgsfield) | 6 tools Extended con backend real |
| **Fase D** — Visionario | Brandon + RFCs propios | Cada tool tiene RFC sellado (browse_act el primero) | 5+ tools Visionarias en producción |

**El frontend NO se toca más significativamente** después de Fase A++. Solo bugs, polish, o features nuevas que aparezcan post-launch.

---

## §8 — Changelog

| Versión | Fecha | Cambio | Sellado por |
|---|---|---|---|
| 1.0 | 2026-05-26 | Addendum inicial — formaliza Fase A++ (Sprints A.5/A.6/A.7) como continuación natural del RFC-001 Fase A. | ✅ Diego · 2026-05-26 |

---

## §9 — Para futuras sesiones de IA (handoff)

> **Si retomas el proyecto después de una compactación de contexto, lee EN ORDEN:**
>
> 1. [`RFC-001-COACH-AGENT-CAPABILITIES.md`](./RFC-001-COACH-AGENT-CAPABILITIES.md) — visión sellada de 20 tools + 20 artifacts + UX
> 2. **Este documento** — extensión Fase A++ con los 3 sub-sprints
> 3. [`MENTEX_BACKEND_CONTRACT.md`](../backend/MENTEX_BACKEND_CONTRACT.md) — qué cablear cuando llegue Sprint B
> 4. [`MENTEX_BRAND_BRIEF.md`](../marketing/MENTEX_BRAND_BRIEF.md) — voz/tono que el chat tiene que mantener
> 5. **`git log --oneline -20`** para ver estado real del repo
>
> Con esos 4 docs + git log tienes 100% del contexto necesario para continuar sin error.

---

**Fin del addendum.**

> Este documento es la fuente de verdad de Fase A++. Cualquier desviación del plan se documenta aquí vía PR + nuevo changelog entry.
