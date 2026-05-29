# RFC-003 · Proposal Protocol — Memoria · Conocimiento · Skills

**Status**: 📝 DRAFT — pendiente de sello
**Author**: Claude Opus 4.7 (sintetizando research interno + Manus + Anthropic Skills + ChatGPT/Cursor/Windsurf)
**Fecha**: 2026-05-29
**Origen**: Diego Sprint A.13 — sección Memoria de Settings se ve mal, debe alinearse con Conocimiento + integrarse con chat (Manus-style)

---

## 1. Resumen ejecutivo

Hoy Mentex tiene **3 stores separados** (`__mtxIAConfig` memoria, `__mtxIAKnowledge` conocimiento, `__mtxIASkills` skills) con **flujos asimétricos** de creación:

| | Auto-detection chat | Modal de propuesta | Modal de creación manual | UI de items |
|---|---|---|---|---|
| **Memoria** | ✅ regex en `_processMemoryDetection` | ❌ silent save | `MemoryAddModal` (2 campos) | Píldoras inline en Settings |
| **Conocimiento** | ❌ no existe | ❌ no existe | `IngestSourceModal` (PDF/URL/audio/texto) | Cards con accent per-kind |
| **Skills** | ❌ no existe | ❌ no existe | `NewSkillModal` (3 sources: texto/URL/repo) | KPIs grid + cards |

**Manus** unifica los 3 con un **único patrón**: propuesta-card en el chat → modal Nombre/Cuándo usar/Contenido → guardado con animación.

**Propuesta**: introducir un **protocolo unificado** "el coach propone, user aprueba" con:
- Un solo componente `<ProposalCard>` reutilizable
- Un solo modal `<ProposalEditSheet>` (form Nombre · Cuándo usar · Contenido)
- 3 stores existentes mantienen su data shape (zero breaking change)
- Bridge: `mtx:coach-proposal { kind, data }` → router dispatches al store correcto
- Visual de la sección Memoria rediseñado para alinearse con Conocimiento

---

## 2. Análisis del estado actual

### 2.1 Componente más cercano al patrón "el coach propone, user aprueba"

Existe `IAArtifactConfirmationCard` (`ia-artifacts.jsx:936`) con shape:
```js
{
  kind: 'confirmation_card',
  preface, bullets[],
  primaryAction: { label, value },
  secondaryAction: { label, value },
  resolved?: 'confirmed' | 'cancelled',
}
```

Emite `mtx:coach-artifact-action { kind, value }` → bridge consume.

**Esta es la base sobre la que construir.** Extensión necesaria:
- `kind: 'proposal_card'` con sub-`type: 'memory' | 'knowledge' | 'skill'`
- Icon + accent reactivo al type
- Botón ✏️ "Editar" que abre `<ProposalEditSheet>` antes de aceptar
- Estado post-aceptación: card colapsa a chip "✓ Guardado en {tipo}" + link "Ver"

### 2.2 Stores existentes que NO requieren cambios estructurales

- `__mtxIAConfig.addMemory(type, label, value)` — funciona, agregar `source: 'proposal'`
- `__mtxIAKnowledge.ingestSource({ kind, title, rawText, ... })` — funciona, agregar `source: 'proposal'`
- `__mtxIASkills.createMineSkill(rawText, sourceKind)` — funciona, pero requiere extensión opcional para recibir `{ title, whenToUse, content }` ya estructurados (sin pasar por `_mockStructureSkill`)

### 2.3 Bridge runtime existente

`coach-actions-bridge.jsx` ya escucha `mtx:coach-artifact-action`. Solo necesita un caso nuevo:
```js
case 'proposal-accept':  // payload incluye { type, data, mode: 'quick'|'edited' }
case 'proposal-edit':    // payload incluye { type, draft } → abre EditSheet
case 'proposal-dismiss': // log + animate out
```

---

## 3. Análisis competencia (highlights del research)

### 3.1 Manus (el modelo a seguir)

- **3-tier separation** con UI unificada: Knowledge (facts cortos, 20/50/100 entries) · Memory (project-level) · Skills (workflows packaged)
- Modal de edit con campos: **Name · Use When · Content** + status `Pending`
- Botón ÚNICO "Guardar y Aceptar" (no draft state — binary fast path)
- Animación al aceptar: card colapsa a chip + side panel "Conocimiento sugerido" muestra el nuevo item
- Approval-gated por default — nada se persiste silenciosamente
- Patrón "Package this as a Skill" — comando in-chat que dispara la propuesta automática post-conversación exitosa

### 3.2 Claude Code / Anthropic Skills

- Skills = **lazy-loaded instruction packages** (no workflows). YAML frontmatter `name` + `description` + opcionales (`disable-model-invocation`, `allowed-tools`, `effort`, `context: fork`, `model`)
- Discovery por embedding semántico de la `description`, no keyword match
- Tamaño típico 500-2000 líneas (no son datos — son procedimientos)
- Auto-memory escribe a `~/.claude/.../memory/` con MEMORY.md como índice + archivos detallados (max 25KB índice cargado siempre)
- **Patrón clave**: progressive disclosure 3 niveles (description carga siempre, content on-demand, references lazy)

### 3.3 Anti-patterns confirmados

1. **ChatGPT Memory**: silent saves sin transparency → pierde trust del user
2. **Cursor .cursorrules**: token tax en cada request si excede 200 palabras + silenciosamente ignorado en Agent Mode 2026
3. **Notion AI**: vector DB sin layer de memory persistente → no "aprende del user"

---

## 4. Decisiones de diseño (selladas en este RFC)

### 4.1 Taxonomía: 3 tipos distinguidos visualmente

| Tipo | Para qué | Trigger común desde chat | Storage hoy |
|---|---|---|---|
| 🧠 **Memoria** | Hechos del user (identidad, metas, contexto, preferencias) auto-aprendidos | "soy founder", "vivo en Bogotá", "prefiero ejercicio AM" | `__mtxIAConfig.addMemory` |
| 📚 **Conocimiento** | Material que el user pide explícitamente guardar (artículo, paper, nota, transcripción) | "guarda este artículo", "recuerda este PDF" | `__mtxIAKnowledge.ingestSource` |
| ⚡ **Skill** | Workflow reutilizable identificado tras una conversación exitosa | "guarda esto como skill", "crear skill desde este flujo" | `__mtxIASkills.createMineSkill` |

### 4.2 Reglas de auto-proposal del coach

| Tipo | Auto-detection | User-asked | Confidence threshold |
|---|---|---|---|
| Memoria | ✅ regex (ya existe) + LLM-discretion (futuro) | "recuerda que X" | ≥ 0.6 |
| Conocimiento | ❌ NO auto (siempre user-pedido) | "guarda este artículo" | N/A |
| Skill | ⚠️ propuesta post-conversación exitosa (3+ msgs con success signal) | "guarda como skill" | ≥ 0.7 |

**Decisión sellada**: NUNCA escribir silently. Toda propuesta atraviesa `ProposalCard` aprobada por el user. Las regex actuales de memoria pasan de `addMemory` directo a `dispatch mtx:coach-proposal { type:'memory' }`.

### 4.3 Form unificado (modal Manus-style)

`<ProposalEditSheet>` con campos **idénticos para los 3 tipos**, mostrando/ocultando opcionales:

```
┌────────────────────────────────────────┐
│ {Icon} Conocimiento sugerido           │
│        Pendiente · 87% confianza       │
├────────────────────────────────────────┤
│ Nombre                                 │
│ [Preferencias de diseño de logo]       │
│                                        │
│ Usar cuando                            │
│ [Al diseñar logos o elementos visuales]│
│                                        │
│ Contenido                              │
│ [El usuario prefiere logos             │
│  minimalistas, en un solo tono…]       │
│                                        │
│  ─── Avanzado ▼ (collapsed) ───        │
│  Categoría (memory)                    │
│  Dominio (knowledge)                   │
│  Triggers (skill)                      │
│  Tags                                  │
├────────────────────────────────────────┤
│ [✕]  [↶]              [✓ Guardar]     │
└────────────────────────────────────────┘
```

- Nombre · Usar cuando · Contenido = **siempre visibles**
- Sub-sección "Avanzado" colapsable por defecto
- Botón principal único: "Guardar" (binario, no draft)
- Botón ↶ deshace a la propuesta original del coach

### 4.4 Estados de la propuesta

```
pending → accepted (con animación)
       ↘ edited → accepted (con animación)
       ↘ dismissed (fade out)
```

`pending`: estado inicial cuando la card aparece en chat
`accepted`: card colapsa a chip neón "✓ Guardado · Ver"
`edited`: pasa por EditSheet, luego → accepted con badge "✏ Editado"
`dismissed`: fade out + chip discreto "Descartado" (recuperable con undo 5s)

### 4.5 Rediseño visual de la sección Memoria en Settings

Hoy: píldoras inline + "Instrucciones del coach" mezclados.

**Propuesta**:
```
┌────────────────────────────────────────┐
│ INSTRUCCIONES DEL COACH                │
│ ┌─ ¿Qué debe saber el coach de ti? ──┐│
│ │ [textarea]                         ││
│ └──────────────────────────────────────┘│
│ ┌─ ¿Cómo debe responder? ────────────┐│
│ │ [textarea]                         ││
│ └──────────────────────────────────────┘│
│                                        │
│ AUTO-APRENDIZAJE                       │
│ Bar progreso 28/50 · Auto-aprender ON  │
│ "El coach aprende detalles y patrones  │
│  automáticamente cuando hablás con él" │
│                                        │
│ LO QUE SABE DE TI · 28 memorias        │
│                                        │
│ 🟢 IDENTIDAD (8)                       │
│ ┌────────────────────────────────────┐│
│ │ ✦ Founder de startup en Bogotá     ││
│ │   Hace 3 días · usada 12×          ││
│ └────────────────────────────────────┘│
│ ┌────────────────────────────────────┐│
│ │ ★ Casado, sin hijos                ││
│ │   Hace 1 semana · usada 4×         ││
│ └────────────────────────────────────┘│
│                                        │
│ 🟡 METAS (5)                           │
│ [cards similares]                      │
│                                        │
│ 🔵 CONTEXTO (10)                       │
│ 🟣 PREFERENCIAS (5)                    │
└────────────────────────────────────────┘
```

Cada card con el **mismo lenguaje visual que Conocimiento**: icon-tile con accent del tipo, título bold, meta row (badge ✦/★ + relative date + usage count), tap → `MemoryDetailSheet` (read-only porque es auto-aprendida).

### 4.6 Skills: workflow vs prompt-template — decisión

**Decisión sellada**: Skills en Mentex son **prompt-templates con triggers** (modelo Anthropic Skills), NO workflows con state machine programado.

Razón: el modelo del agente al activar `/skill-name` debe poder ejecutar libremente la skill como un mini-system-prompt, con discreción sobre tool calls. Workflows como state machine quedan para una capa separada (no en este RFC).

Esto significa que el `NewSkillModal` actual con `_mockStructureSkill` (parser de raw text → triggers/steps) DEJA de ser el flow principal. El flow principal pasa a ser:

1. **Auto-proposal**: el coach detecta conversación exitosa → propone "¿Guardar esto como skill?" → ProposalCard
2. **Manual**: user dice "guarda esto como skill" en chat → coach genera draft → ProposalCard
3. **Settings**: botón "+ Nueva skill" abre **EditSheet directo** con campos vacíos (no más 3 tabs texto/URL/repo en raíz — eso queda como sub-tab "Avanzado · importar desde")

---

## 5. Arquitectura técnica

### 5.1 Event protocol

```js
// Cuando el coach decide proponer:
window.dispatchEvent(new CustomEvent('mtx:coach-proposal', {
  detail: {
    id: 'prop-xxxx',
    type: 'memory' | 'knowledge' | 'skill',
    draft: {
      name: 'Preferencias de diseño de logo',
      whenToUse: 'Al diseñar logos o elementos visuales',
      content: 'El usuario prefiere logos minimalistas...',
      // Type-specific opcionales:
      category: 'preference',       // memory
      domain: 'creatividad',        // knowledge
      triggers: ['diseñar', 'logo'], // skill
    },
    confidence: 0.87,
    sourceMessageId: 'msg-yyyy',
  },
}));

// Bridge añade el message-artifact al chat:
__mtxIAChat.addMessage(convId, {
  role: 'assistant',
  artifacts: [{
    kind: 'proposal_card',
    proposalId: 'prop-xxxx',
    ...detail,
  }],
});
```

### 5.2 Componentes nuevos

```
screens/coach-proposals.jsx          (~600 LOC, NEW)
  ├─ __mtxIAProposals (store)
  │  - propose(type, draft)
  │  - accept(id, edits?)
  │  - dismiss(id)
  │  - list()
  ├─ <ProposalCard /> (artifact extendido)
  └─ <ProposalEditSheet /> (modal Nombre/Cuándo/Contenido)

screens/ia-settings-memory-v2.jsx     (~400 LOC, NEW)
  - Rediseño tab Memoria estilo Conocimiento
  - Reusa <MemoryDetailSheet> existente
  - Auto-aprendizaje bar bajo "Instrucciones del coach"
```

### 5.3 Componentes existentes que cambian

```
screens/ia-flow.jsx (mínimo cambio)
  - _processMemoryDetection: regex match → en vez de addMemory directo,
    dispatch mtx:coach-proposal { type:'memory', draft, confidence }

screens/coach-actions-bridge.jsx
  - Listener mtx:coach-proposal → __mtxIAProposals.propose(...)
  - Listener mtx:coach-artifact-action con value='proposal-{accept|edit|dismiss}'

screens/ia-artifacts.jsx
  - Caso nuevo en router: kind === 'proposal_card' → <ProposalCard />

screens/ia-skills.jsx
  - NewSkillModal: 3 tabs (texto/URL/repo) pasan a "Avanzado · Importar"
  - Default tab cambia a "Manual" con form Nombre/Cuándo/Contenido (reusa ProposalEditSheet)

screens/ia-knowledge.jsx
  - IngestSourceModal: añade flow "Pegar texto" como primary path
  - PDF/URL/Audio quedan como sub-tabs "Importar desde"
```

### 5.4 Data flow visual

```
[Chat IA]
   │
   │ user message + coach response
   ▼
[_processMemoryDetection / _processSkillDetection]
   │
   │ regex/LLM detecta candidato
   ▼
[mtx:coach-proposal { type, draft, confidence }]
   │
   ▼
[__mtxIAProposals.propose] ─────┐
   │                            │
   │ persiste en store          │
   │ emite mtx:proposals-changed│
   ▼                            │
[mtx:ia-chat-changed]           │
   │                            │
   │ message con artifact       │
   │ kind: 'proposal_card'      │
   ▼                            │
[render <ProposalCard />] ──────┘
   │
   ├─ user tap ✓ "Aceptar" rápido
   │       │
   │       ▼
   │   [mtx:coach-artifact-action 'proposal-accept']
   │       │
   │       ▼
   │   [bridge: __mtxIAProposals.accept(id)]
   │       │   └─ persiste en store correcto según type
   │       │      (memory → __mtxIAConfig.addMemory)
   │       │      (knowledge → __mtxIAKnowledge.ingestSource)
   │       │      (skill → __mtxIASkills.createMineSkill)
   │       ▼
   │   [card colapsa a chip "✓ Guardado · Ver"]
   │
   ├─ user tap ✏ "Editar"
   │       │
   │       ▼
   │   [<ProposalEditSheet> abre con draft]
   │       │
   │       ▼ user edita → "Guardar"
   │       │
   │       ▼
   │   [bridge: __mtxIAProposals.accept(id, edits)]
   │
   └─ user tap ✕ "Descartar"
           │
           ▼
       [card fade out + chip discreto "Descartado · Deshacer" (5s)]
```

---

## 6. Plan de implementación por fases

### Fase 1 — Componente reutilizable + store (1-1.5 días)
- `screens/coach-proposals.jsx`: store + ProposalCard + ProposalEditSheet
- Test unitario manual con mock de propuestas

### Fase 2 — Bridge + integración Memoria (1 día)
- `coach-actions-bridge.jsx`: routing de `mtx:coach-proposal` + `proposal-{accept|edit|dismiss}`
- Migrar `_processMemoryDetection` para emitir proposals en vez de save directo
- Settings flag: `autoAcceptMemory` toggle (default OFF → siempre propone)
- 3 mock conversaciones con propuestas reales

### Fase 3 — Rediseño visual sección Memoria (0.5-1 día)
- `ia-settings-memory-v2.jsx`: layout estilo Conocimiento
- Reorganización: Instrucciones del coach → Auto-aprendizaje bar → Lo que sabe de ti (cards estilo Knowledge)
- Reusa MemoryDetailSheet existente

### Fase 4 — Integración Conocimiento + Skills (1-1.5 días)
- Knowledge: auto-proposal cuando user dice "guarda este artículo" + IngestSourceModal refactor (Texto como primary)
- Skills: auto-proposal post-conversación exitosa + NewSkillModal refactor (Manual como primary, importar como avanzado)
- Mock conversations: 2 para knowledge, 2 para skills

### Fase 5 — Polish + audit (0.5 día)
- Animaciones: fade-in de propuesta, colapso a chip post-aceptación, fade-out post-dismiss
- Confetti micro al primer accept de cada tipo (onboarding moment)
- Audit C-A-R sobre el sprint completo

**Total estimado: 4-5.5 días de trabajo enfocado**

---

## 7. Decisiones de scope

### Incluido en este sprint
- Proposal protocol (event + store + componentes)
- 3 tipos: Memoria · Conocimiento · Skill con UI unificada
- Auto-proposal para Memoria (regex existente migrada) + Skill (heurística post-conversación)
- Manual-proposal para Conocimiento ("guarda este artículo")
- Rediseño visual Memoria estilo Conocimiento
- Refactor NewSkillModal y IngestSourceModal (paths principales unificados)
- Mock conversations demonstrando los 3 flows

### Excluido (scope creep)
- LLM-discretion para auto-proposal (queda en regex/heurística mock)
- Embedding-based discovery de skills (queda match por trigger string)
- Vector DB / RAG para conocimiento (queda como mock)
- Workflow engine para Skills programables (decisión sellada §4.6)
- Skill versioning explícito (queda como TODO post-MVP)
- Confidence score visible al user (queda como debug-only)
- Notificación push cuando hay propuesta pendiente (queda como TODO)

### Drop-in ready para backend
Todo el flow está diseñado para que Brandon reemplace:
- `__mtxIAProposals.propose` → `POST /api/proposals`
- `__mtxIAProposals.accept` → `POST /api/proposals/:id/accept`
- `_processMemoryDetection` regex → LLM tool-use con función `propose_memory`
- Mock structure de Skills → real SKILL.md gen del agente

---

## 8. Anti-patterns que evitamos (sellados)

1. **Silent saves** (ChatGPT Memory fail): toda escritura atraviesa `ProposalCard`
2. **Token tax masivo** (Cursor): índice de memoria con max size, archive autoamticamente
3. **Keyword matching frágil** (Cursor globs): hoy regex, post-MVP LLM-discretion
4. **Form pesado en creación** (current NewSkillModal): form 3-campos siempre, opcionales colapsados
5. **Draft state** (no implementado): Manus enseñó que binario "Guardar" es mejor UX

---

## 9. Open questions para Diego

Antes de empezar a construir, necesito tu sello sobre:

1. **¿Confirmas Skills = prompt-templates (no workflows programables)?** (§4.6)
2. **¿Default auto-accept de memorias OFF?** (siempre propone, user controla)
3. **¿Las 4 categorías de Memoria (Identidad/Metas/Contexto/Preferencias) se mantienen como hoy?** ¿O las simplificás?
4. **¿Qué hacemos con las 5 sources mock de Conocimiento existentes?** (preserve o reseed)
5. **¿Animación al accept: confetti micro solo el primer accept de cada tipo, o nunca?**
6. **¿Empezamos por Fase 1+2+3 (memoria pulida + propuestas)** y dejamos Knowledge/Skills para sprint B? ¿O todo en un Sprint A.13?

---

## 10. Apéndice — Referencias del research

### Manus
- [Manus Projects Self-Updating](https://manus.im/blog/manus-projects-self-updating)
- [Manus Project Skills](https://manus.im/blog/manus-project-skills)
- [Agent Skills feature page](https://manus.im/features/agent-skills)
- [Skills docs](https://manus.im/docs/features/skills)
- [Knowledge Feature efficient-usage](https://kpcquzyw.manus.space/knowledge-feature)

### Anthropic Skills
- [Agent Skills Overview - Claude API](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Extend Claude with skills - Claude Code](https://code.claude.com/docs/en/skills)
- [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Claude Code memory](https://code.claude.com/docs/en/memory)

### Competencia
- [ChatGPT Memory - OpenAI](https://openai.com/index/memory-and-new-controls-for-chatgpt/)
- [Cursor Rules Complete Guide 2026](https://www.vibecodingacademy.ai/blog/cursor-rules-complete-guide)
- [.windsurfrules Guide 2026](https://thepromptshelf.dev/blog/windsurfrules-complete-guide-2026/)

---

**Status final**: 📝 DRAFT — esperando feedback de Diego en §9 para sellar y empezar Fase 1.
