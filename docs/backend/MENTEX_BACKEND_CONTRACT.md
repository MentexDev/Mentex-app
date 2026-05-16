# Mentex Backend Contract

**Documento canónico · sellado Diego + Helios**
**Versión:** 1.0 · **Fecha:** 2026-05-16
**Status:** SEALED. Es el contrato del backend de Mentex contra el Gateway Imperial Nyemen.

> **Regla cardinal:** NO se escribe código de backend hasta que este documento esté sellado por Diego + Helios. Una vez sellado, este doc es la única fuente de verdad. Las modificaciones se hacen vía PR contra este archivo, review de Helios y re-sello.

---

## Tabla de contenidos

- [§0 — Status & Authority](#0--status--authority)
- [§1 — Arquitectura cliente ↔ BFF ↔ Gateway](#1--arquitectura-cliente--bff--gateway)
- [§2 — Modelo de DOS CONEXIONES](#2--modelo-de-dos-conexiones)
- [§3 — Tabla Delegate vs Own](#3--tabla-delegate-vs-own)
- [§4 — Consumir el Gateway sin MCP (contrato técnico)](#4--consumir-el-gateway-sin-mcp-contrato-técnico)
- [§5 — La API key del BFF](#5--la-api-key-del-bff)
- [§6 — Setup del Imperial Dev MCP (Conexión A)](#6--setup-del-imperial-dev-mcp-conexión-a)
- [§7 — Reglas de robustez del BFF](#7--reglas-de-robustez-del-bff)
- [§8 — Sprint 0 · Contract Test Rig](#8--sprint-0--contract-test-rig)
- [§9 — Tabla canónica de GAPs HONESTOS](#9--tabla-canónica-de-gaps-honestos)

---

## §0 — Status & Authority

### 0.1 Identidad del documento

- **Nombre canónico:** `MENTEX_BACKEND_CONTRACT.md`
- **Reemplaza:** `10-EMPIRE-DEEP-DIVE.md` (borrado).
- **Simplifica:** `00-09` (todos pasan a puro lado-Mentex; cualquier referencia a internals del Imperio — AETHERNA Gateway pipeline, Swarm, Cortex tripartito, Mother Forge, Mac Mini, `lib/ai/agents/`, Mission Control — queda fuera).

### 0.2 Authority chain

| Rol | Responsabilidad |
|---|---|
| **Diego (founder Mentex)** | Decisiones de producto, alcance, prioridades. Aprueba cambios al contrato. |
| **Helios (CTO Imperio Nyemen)** | Decisiones arquitectónicas del Gateway, contrato técnico, gating de PRs sobre este doc. |
| **Brandon (dev externo Mentex)** | Implementa el BFF + RN shell siguiendo este contrato. No modifica este doc directamente — propone cambios vía PR. |

### 0.3 Regla cardinal

> **NO código hasta doc sellado.** Cualquier línea escrita antes del sello arriesga descartarse en review.

Sellado = ambos firmantes (Diego + Helios) marcan aprobación explícita en el changelog (§0.5).

### 0.4 Mecánica de modificación

1. PR contra `docs/backend/MENTEX_BACKEND_CONTRACT.md` con la propuesta + justificación.
2. Review de Helios (técnico) y Diego (producto).
3. Si ambos aprueban → merge + entrada en changelog + re-sello con nueva versión.
4. Cambios urgentes (gap del Gateway, vulnerabilidad): hotfix path acordado out-of-band; el doc se actualiza en ≤24h post-fix.

### 0.5 Changelog

| Versión | Fecha | Cambio | Sellado por |
|---|---|---|---|
| 1.0 | 2026-05-16 | Doc inicial. Reemplaza 10-EMPIRE-DEEP-DIVE.md. Aplica R1–R6. Imperial Dev MCP LIVE v1.1.1. | Diego ⏳ · Helios ⏳ |

---

## §1 — Arquitectura cliente ↔ BFF ↔ Gateway

### 1.1 Principio fundamental: Mentex es **inquilino**, no plugin

Mentex consume el Imperio Nyemen exactamente como una app SaaS consume Stripe:

- **Llama a una API pública** (`https://gateway.empire-os.co/v1/*`) con una **API key** propia.
- **No vive dentro** del repositorio interno del Imperio. No conoce `lib/ai/agents/`, `Mission Control`, `Cortex`, `Mother Forge`, `AETHERNA Gateway internals`, `Swarm`. Esa lore es **opaca y deliberadamente irrelevante**.
- **El imperio puede cambiar su runtime interno mañana** y Mentex no se entera porque la frontera es la API pública `/v1/*`.

Esta opacidad es **la arquitectura correcta**, no un déficit. Brandon trabaja contra el contrato público, nunca contra internals.

### 1.2 Diagrama de 3 capas

```
┌───────────────────────────────────────────────────────────────┐
│  APP RN (Expo managed)                                         │
│  ─ Cliente puro: UI + state + navegación                      │
│  ─ Habla SOLO con el Mentex BFF (HTTPS)                       │
│  ─ CERO secretos: nada de IMPERIAL_API_KEY, nada de tokens    │
│    de dev, nada de service-role de Supabase. Bundle público.  │
└───────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌───────────────────────────────────────────────────────────────┐
│  MENTEX BFF (servidor — Node 20+ / Hono o Next API routes)    │
│  ─ Repo greenfield: NO vive en aether/ del Imperio.           │
│  ─ Dueño de IMPERIAL_API_KEY (env del servidor, vault).       │
│  ─ Persistencia OWN: Supabase (proyecto Mentex propio).       │
│  ─ Auth de usuarios Mentex: Supabase Auth + Apple/Google.     │
│  ─ Loop del Coach (Vercel AI SDK): tools = HTTP al Gateway.   │
│  ─ Cliente HTTP del Gateway con retry/backoff por namespace.  │
└───────────────────────────────────────────────────────────────┘
                              │ HTTPS  +  X-Imperial-Key
                              │         +  X-Imperial-Tenant: mentex
                              ▼
┌───────────────────────────────────────────────────────────────┐
│  IMPERIAL NYEMEN GATEWAY (público)                            │
│  https://gateway.empire-os.co/v1/*                            │
│  ─ Único punto de contacto con el Imperio.                    │
│  ─ Endpoints: skill / brain / memory / orchestration /        │
│    voice / openapi.json / mesh / mesh/manifest.               │
│  ─ Runtime interno OPACO para Mentex.                         │
└───────────────────────────────────────────────────────────────┘
```

### 1.3 Compromiso de versión del Gateway

- ✅ `/v1` es **estable y aditivo**: nuevas rutas y campos opcionales no rompen contratos existentes.
- ⚖️ Breaking changes → `/v2`. No habrá breaking dentro de `/v1`.
- ⚠️ **GAP G5:** no existe política Sunset formal pública ni endpoint de changelog watchable. Compensación BFF: ver §7.8 (drift watch).

### 1.4 Aislamiento multi-tenant del Gateway

El Gateway aísla por **`tenant_id` (en header) + `user_id` (en body donde aplique)**.

- `X-Imperial-Tenant: mentex` — header **obligatorio** en cada llamada al Gateway.
- `user_id` — campo **en el body** cuando el endpoint distingue por usuario (memory, billing, telemetry). Tipo string ≤128 chars.

El Gateway hace cost-attribution por `tenant`. La separación de usuarios Mentex (entre los millones de operators del tenant `mentex`) se hace **dentro del BFF** vía Supabase RLS — el Gateway no la conoce.

---

## §2 — Modelo de DOS CONEXIONES

Hay exactamente **dos** flujos contra el Imperio. Nunca se mezclan, nunca se sustituyen.

### 2.1 Conexión A — Asistencia DX

| Atributo | Valor |
|---|---|
| **Quién** | Claude de Brandon (Claude Code o claude.ai) |
| **Para qué** | Discovery del contrato del Gateway mientras programa el BFF. Que su asistente "sepa qué skills/schemas hay". |
| **Endpoint** | Imperial Dev MCP — `https://mcp.empire-os.co/mcp` (HTTP, no stdio). |
| **Auth** | `Authorization: Bearer <BRANDON_DEV_TOKEN>` |
| **Naturaleza** | Read-only. 5 tools. Ver §6. |
| **Dependencia runtime** | **Cero.** El BFF funciona perfecto aunque Conexión A no exista; A solo acelera el trabajo del asistente. |

### 2.2 Conexión B — Ejecución (único cable real)

| Atributo | Valor |
|---|---|
| **Quién** | Mentex BFF (código servidor) |
| **Para qué** | Ejecutar skills, RAG, memoria, orquestación, voz. **Es lo que produce valor de negocio.** |
| **Endpoint** | Gateway público — `https://gateway.empire-os.co/v1/*` |
| **Auth** | Header `X-Imperial-Key: <MENTEX_KEY>` + `X-Imperial-Tenant: mentex` |
| **Naturaleza** | Read+write. Cualquier endpoint del contrato. |
| **Dependencia runtime** | **Crítica.** Sin esta conexión, el BFF no puede coachear ni hacer RAG. |

### 2.3 Regla de oro

> **Conexión A es acelerador, Conexión B es contrato.**

El **token de dev** (Conexión A) NO es la **`MENTEX_KEY`** (Conexión B):
- Token de dev: lo usa el asistente de Brandon. Read-only. No autoriza ejecución.
- `MENTEX_KEY`: la usa el código del BFF en producción. Autoriza toda la ejecución contra el Gateway.

**Nunca se mezclan**: el token de dev no expone `/v1/skill/invoke`; la `MENTEX_KEY` no se entrega al asistente.

---

## §3 — Tabla Delegate vs Own

La tabla canónica que define el reparto de responsabilidades.

### 3.1 OWN — vive en el BFF + DB de Mentex

| Responsabilidad | Notas |
|---|---|
| **Auth de usuarios** | Supabase Auth + Apple Sign In + Google OAuth. Cuenta Supabase propia de Mentex. |
| **Perfil de usuario** | `user_profiles` con `email`, `full_name`, `locale`, `timezone`, `created_at`. |
| **Premium-gate** | Lectura de `user_premium.plan` (free/premium/pro_plus) antes de delegar. |
| **Progreso, streaks, ranking, retos, niveles** | Lógica de gamificación core OWN. Si requiere personalización profunda → `skill.invoke`. |
| **Agenda, rutinas, rituales** | Datos del usuario (`ritual_items`, `ritual_routines`, `ritual_sessions`, `routine_completions`, `agenda_events`). |
| **Recordatorios** | `reminders` + scheduling + envío vía **Expo Push** (servicio propio de Mentex). |
| **Definiciones de skills/workflows del usuario** | Persistidas en Mentex DB. Ejecución se delega vía `workflow.compose` (inline) o `n8n.trigger` (whitelisteada). |
| **Comunidad, canales, threads, mensajes** | Tablas Mentex puras. |
| **Monetización** | RevenueCat IAP (iOS/Android) → webhook receiver Mentex → credit ledger propio. Modelo Stripe. |
| **Catálogo de contenido** | `content`, `playlists`, `playlist_items`, `content_progress`, `content_history`. Audio en Cloudflare R2 con signed URLs (cuenta R2 propia). |
| **Device tokens** | `device_tokens` para Expo Push. |
| **Integraciones OAuth** | Google Cal, Apple Cal, Spotify, Notion, Linear, etc. Refresh tokens encriptados con `pgcrypto` o KMS. |
| **Coach loop conversacional** | ⚖️ **Vercel AI SDK** (decisión sellada). El loop vive en el BFF. Las tools del loop = HTTP a `/v1/skill/invoke`. |
| **Metering / cuotas de negocio** | ⚠️ GAP G1: Gateway no expone cost-attribution per-tenant hoy. BFF cuenta llamadas + aplica límites Mentex-side. |
| **GDPR right-to-erasure** | Ejecuta `memory.semantic.forget` + `memory.conversation.clear` (scoped `tenant=mentex` + `user_id`) contra el Gateway, además de purgar tablas OWN. |

### 3.2 DELEGATE — se llama al Gateway

| Endpoint | Para qué |
|---|---|
| `POST /v1/skill/invoke` | Toda llamada a LLM (1278 skills). Incluye `voice.*` (TTS/STT) y skills compuestas. |
| `POST /v1/skill/stream` | Streaming SSE de respuestas largas (chat del Coach). |
| `GET /v1/skill/job/:id/status` | Polling para jobs async (202). |
| `GET /v1/skill/describe/:job_type` | Discovery del schema de cada skill (advisory). |
| `GET /v1/skill/catalog?search=&namespace=&limit=` | Búsqueda de skills en el catálogo. |
| `POST /v1/brain.query` (o `skill.invoke` con `brain.*`) | RAG contra Atlas Brain. |
| `POST /v1/memory` | 3 superficies: `conversation` (recall/append/clear) · `episodic` · `semantic` (search/store/forget). |
| `POST /v1/orchestration` | `workflow.compose` (pipelines inline encadenando skills + `workflow.schedule` cron) y `n8n.trigger` (clave lógica whitelisteada por Helios; `n8n.list` para descubrirlas). |
| `GET /v1/openapi.json` | Contrato OpenAPI 3.1 vivo. Source of truth para tipos TS del envelope. |
| `GET /v1/mesh` y `GET /v1/mesh/manifest` | Índice de los 4 meshes y manifest completo. |

### 3.3 Reglas para mover algo entre OWN y DELEGATE

- **Empieza OWN cuando** la lógica es simple, determinista y de dominio Mentex (filtros básicos, ranking lineal, queries SQL).
- **Mueve a DELEGATE cuando** se necesita IA, contexto largo o conocimiento del Atlas Brain.
- **Nunca DELEGUES** auth, billing, persistencia de datos de usuario o lógica de premium-gate. Esos son OWN inviolables.
- **Documenta cada movimiento** en este §3 con PR.

---

## §4 — Consumir el Gateway sin MCP (contrato técnico)

Esta sección describe **cómo el BFF llama al Gateway**. El MCP (Conexión A) es opcional para discovery; aquí se define todo lo que el BFF necesita saber para ejecutar sin él.

### 4.1 Sources of truth tipadas

| Fuente | Naturaleza | Cómo usarla |
|---|---|---|
| `GET /v1/openapi.json` | ✅ **JSON Schema garantizado** del envelope/core (headers, `InvokeResult`, `ErrorResponse`, patrón async). | **Generar tipos TS desde aquí** (`@hey-api/openapi-ts` o equivalente). Es el único contrato tipado firme. |
| `GET /v1/skill/describe/:job_type` | ⚠️ Devuelve `{ ok, job_type, executable, spark_metadata, curated:{ input_schema, output_fields, system_prompt, tier }, examples, invoke_via, related }`. **`input_schema` NO es JSON Schema estricto garantizado** — es objeto autorado por skill en DB. | **Tratar como advisory.** Usar `examples` como referencia. **Definir Zod schemas en el BFF por skill** y validar en la frontera. (Doctrina Helios #18 — esto era el bug B-IAF-1.) |
| `GET /v1/mesh` y `GET /v1/mesh/manifest` | Índice de los 4 meshes curados (1278 skills) y manifest completo del imperio. | Discovery + drift watch (ver §7.8). |
| `GET /v1/skill/catalog?search=&namespace=&limit=` | Búsqueda paginada en el catálogo de skills. | Discovery dinámico desde el BFF si se requiere. |

### 4.2 Headers obligatorios

Cada llamada del BFF al Gateway lleva **siempre**:

```http
X-Imperial-Key: <MENTEX_KEY>
X-Imperial-Tenant: mentex
Content-Type: application/json
```

**Recomendados (best practice):**

```http
X-Correlation-Id: <uuid-de-la-request-del-usuario>
Idempotency-Key: <uuid-determinístico-para-writes>
```

### 4.3 `correlation_id` — propagación end-to-end

Regla: **todo `correlation_id` que el BFF reciba (o genere) se propaga al Gateway y se loguea en cada paso.**

```typescript
// BFF entry-point (Hono / Next API)
const correlationId =
  req.headers.get('x-correlation-id') ?? crypto.randomUUID();

// Toda llamada al Gateway desde esta request
const res = await gatewayClient.invoke({
  job_type: 'coach.respond',
  payload: { ... },
  context: {
    correlation_id: correlationId,
    idempotency_key: ...,
  },
});

// Toda línea de log
logger.info({ correlation_id: correlationId, event: 'coach.responded' });
```

El envelope de respuesta del Gateway incluye `correlation_id` y `request_id` — ambos deben aparecer en los logs del BFF.

### 4.4 Patrón async — sync hasta 30s, luego 202 + poll

El Gateway intenta resolución síncrona hasta `context.timeout_ms` (default 30000ms, máximo 60000ms). Si excede → responde `202` con `job_id`.

**Flujo:**

```typescript
// 1. Invocación
const first = await fetch('https://gateway.empire-os.co/v1/skill/invoke', {
  method: 'POST',
  headers: HEADERS,
  body: JSON.stringify({
    job_type: 'voice.synthesize',
    payload: { text: '...', voice: 'es-MX-female' },
    context: { correlation_id, timeout_ms: 30000 },
  }),
});

// 2. Sync OK → ya tienes el resultado
if (first.status === 200) {
  return await first.json(); // { ok: true, result: {...}, ... }
}

// 3. Async → poll
if (first.status === 202) {
  const { job_id } = await first.json();
  while (true) {
    await sleep(1000); // backoff progresivo: 1s, 2s, 3s, ..., cap 10s
    const poll = await fetch(
      `https://gateway.empire-os.co/v1/skill/job/${job_id}/status`,
      { headers: HEADERS },
    );
    const body = await poll.json();
    if (body.status === 'completed') return body;
    if (body.status === 'failed')    throw new GatewayError(body.error);
    // status === 'pending' o 'running' → seguir
  }
}
```

**Timeout máximo del BFF:** define un techo del BFF mayor que el del Gateway (e.g. 90s) y aborta arriba — no esperes infinito.

### 4.5 Streaming — `POST /v1/skill/stream` (SSE)

Para respuestas chunked del LLM (chat del Coach), el Gateway expone SSE en `/v1/skill/stream`.

- Transporte: **SSE**, no WebSocket.
- El BFF re-emite el stream al cliente RN (passthrough SSE o transformación a NDJSON, según preferencia).
- Headers iguales a §4.2.
- ⚠️ **Nota voice.*:** que un voice skill concreto emita audio chunked es **handler-dependent**. Verificar en Sprint 0 vía `describe` + prueba real (ver §9 GAP G6).

### 4.6 Idempotencia

⚠️ **GAP G3:** el Gateway es **pass-through** sobre `idempotency_key` — reenvía el campo al worker, pero **no deduplica** ni mantiene ventana de retención propia. La semántica de dedupe depende del handler de cada skill.

- ✅ Honran idempotency: `workflow.compose`, `n8n.*`.
- ❓ Resto: handler-dependent. Asume que **no**.

**Compensación BFF:** tabla `idempotency_keys` propia en Mentex DB para writes críticos:

```sql
CREATE TABLE mentex.idempotency_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  operation       TEXT NOT NULL,
  request_hash    TEXT NOT NULL,
  result          JSONB,
  status          TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, operation, request_hash)
);
CREATE INDEX ON mentex.idempotency_keys (expires_at);
```

### 4.7 Rate limit

✅ **Per-tenant POR-NAMESPACE.** El namespace = primer segmento tras `/v1/` (`skill`, `brain`, `memory`, `orchestration`). Cada uno tiene su propio cubo Redis (`gw:rl:{tenant}:{namespace}`).

- Límite: `rate_limit_per_min` de la key (default CONFIG si no se sobreescribe).
- Ventana: **sliding window** (Redis).
- **No** es global-por-key, **no** es por-endpoint individual.

**Respuesta 429:**

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 23
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 0
X-RateLimit-Window-Ms: 60000
```

```json
{
  "ok": false,
  "error": {
    "code": "rate_limited",
    "message": "Rate limit exceeded for namespace 'skill'",
    "hint": "Backoff per-namespace; respect Retry-After header.",
    "retryable": true,
    "retry_after_ms": 23000,
    "request_id": "req_01HXY...",
    "correlation_id": "corr_..."
  }
}
```

**Compensación BFF:** colas de retry separadas por namespace; respeta `Retry-After` antes de reintentar.

### 4.8 Envelope de error canónico

Forma única para todo `/v1/*` cuando `ok === false`:

```typescript
type ErrorEnvelope = {
  ok: false;
  error: {
    code: string;            // taxonomía estable: 'invalid_input' | 'rate_limited' | 'not_found' | 'forbidden' | 'gateway_internal' | 'worker_timeout' | 'circuit_open' | 'budget_exhausted' | ...
    message: string;         // texto descriptivo, no localizado
    hint?: string;           // pista accionable para el caller (opcional)
    retryable: boolean;      // ¿el caller puede reintentar?
    retry_after_ms?: number; // si retryable, cuánto esperar (cuando aplica)
    request_id: string;      // id único de la request en el Gateway
    correlation_id: string;  // el correlation_id propagado por el BFF
  };
};
```

**Reglas del BFF al parsear:**

1. Si `ok === false` → **siempre** loguear `error.code`, `error.request_id`, `error.correlation_id`.
2. Si `retryable === true` → encolar retry respetando `retry_after_ms`.
3. Si `retryable === false` → propagar el error al cliente RN con un mapeo Mentex-side (no exponer `error.code` raw del Gateway al usuario final).
4. `error.hint` se usa **solo en logs / dev** — nunca al usuario final.

### 4.9 Endpoint `/v1/memory` — tres superficies

✅ **Aislamiento**: `tenant` viene en header `X-Imperial-Tenant`. `user_id` en **body** (string ≤128), junto a `session_id` y `action`.

| Superficie | Acciones | Uso típico |
|---|---|---|
| **conversation** | `recall` / `append` / `clear` | Buffer de turno-a-turno del Coach (corto plazo). `recall` antes de invocar la skill, `append` después, `clear` en logout o nuevo session. |
| **episodic** | (acciones derivadas del Gateway — consultar `describe` por skill `memory.episodic.*`) | Episodios resumidos del usuario (medio plazo). Consolidación gestionada server-side por el imperio. |
| **semantic** | `search` / `store` / `forget` | Hechos persistentes del usuario (largo plazo): gustos, hábitos, contexto. `forget` es la palanca GDPR right-to-erasure. |

**Patrón GDPR right-to-erasure (en el BFF, endpoint `DELETE /api/me`):**

```typescript
async function eraseUser(userId: string) {
  // 1. Erasure semantic
  await gateway.invoke({
    job_type: 'memory.semantic.forget',
    payload: { user_id: userId },
    context: { correlation_id },
  });
  // 2. Clear conversation
  await gateway.invoke({
    job_type: 'memory.conversation.clear',
    payload: { user_id: userId },
    context: { correlation_id },
  });
  // 3. Soft delete en tablas OWN (luego hard delete tras retention window)
  await db.softDeleteUser(userId);
}
```

### 4.10 Orchestration — workflows del usuario

Dos modos:

**Modo A — Pipeline inline (`workflow.compose`)**

El BFF construye el pipeline JSON inline y lo envía. No requiere registro previo.

```json
{
  "job_type": "workflow.compose",
  "payload": {
    "steps": [
      { "job_type": "ritual.analyze", "input_ref": "user_input" },
      { "job_type": "coach.respond", "input_ref": "step.0.output" }
    ],
    "context": { "user_id": "...", "session_id": "..." }
  },
  "context": { "correlation_id": "...", "idempotency_key": "..." }
}
```

`workflow.schedule` permite cron sobre el mismo pipeline.

**Modo B — n8n con clave whitelisteada (`n8n.trigger`)**

Para workflows reales en n8n, **Helios whitelistea una clave lógica** (string ≤80 chars) mapeada server-side a un workflow concreto. El BFF nunca envía IDs ni definiciones crudas (ADR-1).

```json
{
  "job_type": "n8n.trigger",
  "payload": { "workflow_key": "mentex.daily_recap", "input": { ... } },
  "context": { "correlation_id": "...", "idempotency_key": "..." }
}
```

`n8n.list` devuelve las claves disponibles. Para registrar una nueva → PR al imperio (Helios la whitelistea).

**Quién persiste la definición del workflow del usuario:** **Mentex** (OWN). El Gateway solo ejecuta.

### 4.11 Voice — async por defecto

✅ Las skills `voice.*` se invocan via la ruta genérica `/v1/skill/invoke`. Comportamiento:

- Intenta sync hasta `timeout_ms` (default 30s, máx 60s).
- Para STT/TTS pesado → asume `202` + poll.
- ⚠️ **Audio chunked streaming**: handler-dependent. **Verificar por skill en Sprint 0 vía `describe` + prueba real.** No prometer streaming audio sin verificar (G6 en §9).

---

## §5 — La API key del BFF

### 5.1 Provisioning

- **Quién la crea:** Helios, vía `console_create_api_key`.
- **Para qué tenant:** `mentex` (también validado por header `X-Imperial-Tenant: mentex`).
- **Entrega:** canal privado Diego ↔ Helios (vault root-only). **Jamás por canal público.**
- **Formato:** opaque token. **No hardcodear ni asumir prefijos ni longitudes** en validaciones del BFF — tratar como string opaco.

### 5.2 Dónde vive

| Lugar | ✅ / ❌ |
|---|---|
| Gestor de secretos del servidor (Doppler / Infisical / AWS Secrets Manager / Vercel env encrypted) | ✅ |
| Variable de entorno del proceso BFF (`process.env.IMPERIAL_API_KEY`) | ✅ |
| `.env.local` para desarrollo (en `.gitignore`) | ✅ |
| Repo git (cualquier branch) | ❌ |
| Bundle de React Native | ❌ |
| Logs (incluso parciales) | ❌ |
| Mensajes de error al cliente | ❌ |
| Issues/PRs/Slack/email | ❌ |

### 5.3 Rotación

Procedimiento zero-downtime:

1. Helios genera `MENTEX_KEY_v2` y la entrega.
2. BFF acepta ambas (`IMPERIAL_API_KEY` y `IMPERIAL_API_KEY_NEXT`) en lectura.
3. BFF empieza a usar `_NEXT` para writes nuevos.
4. Helios revoca `v1` cuando confirma cero uso (~24h).
5. BFF promueve `_NEXT` a `IMPERIAL_API_KEY` y elimina la variable temporal.

### 5.4 Scopes — gap honesto

⚠️ **GAP G2:** scopes per-key **no enforced gateway-side** hoy. Una key "read-only" no es real a nivel Gateway.

**Compensación BFF:** el gating de qué puede ejecutarse vive en el BFF:

- Whitelist explícita de `job_type` permitidos por endpoint del BFF.
- Validación de inputs con Zod antes de delegar.
- Premium-gate antes de invocar skills caras.
- Nunca exponer `/v1/skill/invoke` "abierto" al cliente RN — el cliente siempre golpea endpoints del BFF, no el Gateway directamente.

### 5.5 Pre-flight check

Antes de cada deploy del BFF (CI):

```bash
curl -sf \
  -H "X-Imperial-Key: $IMPERIAL_API_KEY" \
  -H "X-Imperial-Tenant: mentex" \
  https://gateway.empire-os.co/v1/openapi.json > /dev/null \
  || (echo "Gateway key invalid or unreachable" && exit 1)
```

CI bloqueante. Sin verde aquí, no hay deploy.

---

## §6 — Setup del Imperial Dev MCP (Conexión A)

**Estado:** ✅ **LIVE y verificado v1.1.1** (Phase 2.6 P4 sellado por Helios, smoke 42/42).

### 6.1 Endpoint y transporte

| Atributo | Valor |
|---|---|
| **URL** | `https://mcp.empire-os.co/mcp` |
| **Transporte** | HTTP (Streamable HTTP, **stateless**). NO stdio. NO local. |
| **Auth** | Header `Authorization: Bearer <BRANDON_DEV_TOKEN>` |
| **Health (público)** | `GET https://mcp.empire-os.co/health` |
| **TLS** | Let's Encrypt, auto-renew. |

`<BRANDON_DEV_TOKEN>` lo entrega Diego por canal privado, igual que la `MENTEX_KEY` (§5.1).

### 6.2 Alta en Claude Code (CLI)

```bash
claude mcp add \
  --transport http \
  imperial-dev \
  https://mcp.empire-os.co/mcp \
  --header "Authorization: Bearer <BRANDON_DEV_TOKEN>"
```

Una vez agregado, las 5 tools aparecen disponibles en cualquier sesión de Claude Code.

### 6.3 Alta en Claude Desktop / claude.ai (remote MCP)

- Tipo: **remote MCP server**.
- URL: `https://mcp.empire-os.co/mcp`.
- Transporte: **HTTP**.
- Header: `Authorization: Bearer <BRANDON_DEV_TOKEN>`.

(El wording del menú varía por versión del cliente; el invariante es **URL + HTTP + ese header bearer**.)

### 6.4 Las 5 tools — frontera de seguridad

Lista cerrada, **read-only**, proxies a endpoints públicos del Gateway (`GET /v1/*`). Cero invoke, cero write, cero infra.

| Tool | Proxy a | Para qué |
|---|---|---|
| `gateway_contract` | `GET /v1/openapi.json` | Contrato completo OpenAPI 3.1 vivo. Source of truth tipada. |
| `mesh_catalog` | `GET /v1/mesh` y `GET /v1/mesh/:key` | Índice de los 4 meshes curados. |
| `mesh_manifest` | `GET /v1/mesh/manifest` con filtros (`mesh`, `format`, `executable_only`, `search`) | Manifest completo del imperio. |
| `skill_describe` | `GET /v1/skill/describe/:job_type` | Schema advisory + ejemplos de cada skill. |
| `capability_search` | `GET /v1/skill/catalog?search=&namespace=&limit=` | Búsqueda paginada de skills. |

### 6.5 Límites del Dev MCP

- ⚖️ **Rate limit:** ~120 req/min por token de dev → `429` con `Retry-After`. Es un **acelerador de discovery**, no un servicio runtime.
- Si Brandon necesita datos del contrato **a escala / en CI** → usa `GET /v1/openapi.json` directo (público, sin MCP).

### 6.6 Seguridad — token de dev ≠ MENTEX_KEY

- El **token de dev** desbloquea SOLO este MCP (discovery).
- `/v1/skill/invoke` **NO está expuesto** aquí.
- El token de dev **no autoriza ejecución** contra el Gateway.
- El **`MENTEX_KEY`** (§5) vive en el servidor del BFF; **nunca** se entrega al asistente Claude de Brandon ni se mezcla con el token de dev.

### 6.7 Health-check público

```bash
curl https://mcp.empire-os.co/health
# → 200 OK con timestamp + version
```

Lo usa CI / monitoreo del BFF para alertar si el Dev MCP cae (no afecta runtime, solo DX).

---

## §7 — Reglas de robustez del BFF

Reglas inviolables del BFF — si una línea de código no las cumple, no se mergea.

### 7.1 Contrato fiel — capa tipada

- Generación de tipos TS **solo desde `/v1/openapi.json`** (envelope/core estable).
- **Zod schemas autorados Mentex-side por cada skill** que el BFF invoque. Usar `examples` de `skill_describe` como referencia, **nunca como contrato**.
- Cero `as any`. Cero `// @ts-ignore`. Si un tipo no compila, se arregla el tipo (no se silencia).

### 7.2 Coerción en cada frontera

- **UI (RN) → BFF**: Zod schema valida cada body de request.
- **BFF → Gateway**: Zod schema valida payload antes de enviar.
- **Gateway → BFF**: parser tipado del envelope (`InvokeResult | ErrorEnvelope`).
- **BFF → UI**: shape estable definido Mentex-side, no fugar shape del Gateway al cliente RN.

### 7.3 Fetch del catálogo con retry+backoff

Un Gateway frío (cold start, mantenimiento, blip de red) **NO debe tumbar el boot del BFF**.

- Catálogo de skills cacheado localmente (`mentex.gateway_catalog_cache` table o Redis).
- Refresh con `setInterval` + retry exponencial; degradación graceful si el refresh falla.

### 7.4 Idempotencia defensiva Mentex-side

No depender de garantía gateway-level (§4.6 / GAP G3). Tabla `idempotency_keys` propia para writes críticos.

### 7.5 Rate-limit awareness por-namespace

- Cliente HTTP del Gateway con **colas separadas por namespace** (`skill`, `brain`, `memory`, `orchestration`).
- Respeta `Retry-After` antes de cualquier reintento.
- Métricas: `gateway_rate_limit_hits_total{namespace=}` en Prometheus / similar.

### 7.6 Memory facade con defaults sanos

```typescript
// Nunca propagar undefined / as any al consumer
async function recallConversation(userId: string, sessionId: string) {
  try {
    return await gateway.invoke({
      job_type: 'memory.conversation.recall',
      payload: { user_id: userId, session_id: sessionId },
      context: { correlation_id },
    });
  } catch (e) {
    logger.warn({ event: 'memory.recall.failed', userId, error: e });
    return { ok: true, result: { messages: [] } }; // shape estable, vacío
  }
}
```

### 7.7 Timeouts

- Default externo: **5s**.
- LLM síncrono: **30s** (`context.timeout_ms: 30000`).
- LLM máximo: **60s** sync; si excede → ya recibimos `202`, poll.
- Streaming SSE: timeout de read entre chunks **30s** (sin chunk en ese tiempo → abort).

### 7.8 Drift watch

Health-check del BFF (`GET /api/health/gateway`) lee:

- `info.version` de `/v1/openapi.json`.
- Fingerprints de `/v1/mesh` (campo dedicado o hash del payload, según describe).

Compara con baseline persistido en CI. Si cambian:
- **Aditivo (`patch` / `minor`)**: WARN, no bloquea.
- **Drift inesperado** o fingerprint cambiado sin nota: **PR-bloqueante**, alerta a Diego + Helios.

### 7.9 PII redaction + correlation_id en todos los logs

- Logger estructurado (pino / similar) con **redaction config**: `email`, `full_name`, `phone`, `apple_user_id`, refresh tokens.
- **Todo log lleva `correlation_id`** (§4.3). Sin él, el log es ruido.

### 7.10 Cliente Gateway — referencia conceptual

```typescript
// lib/gateway/client.ts (esquema; código real se escribe en Sprint A)
import type { InvokeRequest, InvokeResult, ErrorEnvelope } from './generated';

export class GatewayClient {
  constructor(
    private apiKey: string,
    private tenant: string = 'mentex',
    private baseUrl: string = 'https://gateway.empire-os.co',
  ) {}

  async invoke<T>(
    req: InvokeRequest,
    opts: { correlationId: string },
  ): Promise<InvokeResult<T>> {
    const res = await this.fetch('/v1/skill/invoke', req, opts);
    return this.parseEnvelope<T>(res);
  }

  async stream(
    req: InvokeRequest,
    opts: { correlationId: string },
  ): AsyncIterable<unknown> { /* SSE */ }

  async pollJob<T>(jobId: string, opts: { correlationId: string }): Promise<InvokeResult<T>> {
    // backoff 1s, 2s, 3s, ..., cap 10s
  }

  private async fetch(path: string, body: unknown, opts: { correlationId: string }) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'X-Imperial-Key': this.apiKey,
      'X-Imperial-Tenant': this.tenant,
      'X-Correlation-Id': opts.correlationId,
      'Content-Type': 'application/json',
    };
    // namespace-aware queue, retry, Retry-After honor, timeouts §7.7
    // metrics emitted per attempt
  }

  private parseEnvelope<T>(res: Response): InvokeResult<T> {
    // strict parsing; if !ok → throw GatewayError(error envelope §4.8)
  }
}
```

---

## §8 — Sprint 0 · Contract Test Rig

**Antes de construir cualquier feature, el contract test rig debe estar verde.** Es el gating para arrancar Sprint A.

### 8.1 Pre-requisitos

- `IMPERIAL_API_KEY` provista por Helios y cargada en CI/env.
- `BRANDON_DEV_TOKEN` para el Dev MCP (Conexión A) — opcional pero recomendado.
- Tenant de prueba: `mentex` (mismo que producción; Sprint 0 corre contra Gateway real con un `user_id` de test designado en body, no contra un tenant sandbox separado).

### 8.2 Los 8 tests obligatorios

| # | Test | Verifica |
|---|---|---|
| 1 | `GET /v1/openapi.json` con headers de §4.2 → `200`, capturar `info.version` como baseline. | Auth válida + descubrimiento del contrato. |
| 2 | `POST /v1/skill/invoke` con una skill **no trivial elegida del catálogo** (NO asumir `echo` — descubrirla vía `capability_search` o `skill_describe`), sync. | Path síncrono del envelope `200`. |
| 3 | `POST /v1/skill/invoke` con `context.timeout_ms: 1000` (mínimo razonable) sobre una skill que típicamente excede 1s → debe responder `202 + job_id`. Luego `GET /v1/skill/job/:id/status` hasta `completed`. | Path async + polling. |
| 4 | `POST /v1/skill/stream` SSE de prueba → recibe ≥1 chunk antes del `done`. | Streaming. |
| 5 | Forzar `429`: ráfaga sobre namespace `skill` hasta superar `rate_limit_per_min` → recibe envelope con `error.code='rate_limited'`, `retry_after_ms` numérico, y header `Retry-After`. Esperar y reintentar → `200`. | Rate-limit por-namespace + headers + recovery. |
| 6 | `/v1/memory` ciclo completo: `memory.conversation.append` → `memory.conversation.recall` (verifica que el mensaje está) → `memory.conversation.clear`. Repetir misma secuencia para `memory.semantic.store` → `memory.semantic.search` → `memory.semantic.forget`. Scoped `tenant=mentex` + `user_id=ci-test-user`. | 3 superficies de memoria (la episodic se cubre en Sprint A vía describe). |
| 7 | `workflow.compose` con 2 skills encadenadas + `idempotency_key`. Repetir la misma llamada con misma key → resultado consistente (no duplica side effects en workflows que la honran). | Orchestration + idempotencia donde aplica. |
| 8 | **Error path**: enviar `job_type` inexistente → recibe envelope `{ ok:false, error:{ code, message, retryable, request_id, correlation_id, ... } }` y el parser tipado del BFF no crashea. | Manejo correcto del envelope de error §4.8. |

### 8.3 Definition of done

- ✅ 8/8 verdes en CI contra Gateway real.
- ✅ Logs muestran `correlation_id` propagado en cada test.
- ✅ Baseline de `info.version` y mesh fingerprints persistida en repo (`tests/contract/baseline.json`).
- ✅ Reporte adjunto al PR de Sprint 0 con timestamps y `request_id` de cada test.

Sin estos 8 verdes → **no se arranca Sprint A**. Es el gating absoluto.

---

## §9 — Tabla canónica de GAPs HONESTOS

Estos gaps existen **hoy** en el Gateway. El doc los declara explícitos y el BFF compensa Mentex-side. **No son "coming soon"**; son contrato presente.

| # | GAP | Estado Gateway | Compensación BFF |
|---|---|---|---|
| **G1** | **Cost-attribution per-tenant no expuesta.** No existe `/v1/billing/usage` ni header de costo por respuesta. `cost_usd` viaja en `result.body` pero actualmente está en `0` (observability lo registra server-side, no lo expone al tenant). | No expone hoy. Candidato a deliverable futuro del imperio, **sin promesa**. | BFF implementa **metering propio**: contador de llamadas por user/skill + estimación local de costo + cuotas de negocio (premium-gate) antes de delegar. Tabla `mentex.usage_quotas` con período mensual. |
| **G2** | **Scopes per-key NO enforced gateway-side.** Una key "read-only" no es real a nivel Gateway hoy. | Gap conocido. | BFF aplica **whitelist explícita** de `job_type` permitidos por endpoint, validación Zod, premium-gate. Cliente RN nunca llama al Gateway directo. |
| **G3** | **Idempotency = pass-through.** Gateway no deduplica; reenvía la `idempotency_key` al worker. Honor depende del handler de cada skill. | `workflow.compose`/`n8n.*` sí honran; resto handler-dependent. Sin ventana de retención gateway-level. | Tabla `mentex.idempotency_keys` propia (§4.6). Defensiva por defecto en writes críticos. |
| **G4** | **`input_schema` de skills NO es JSON Schema estricto** uniforme para las 1278 skills. Es objeto autorado por skill en DB; tratar como advisory. | No garantizado uniforme. Fue el bug B-IAF-1 del codegen IAF. | **Zod schemas autorados Mentex-side por skill** en la frontera BFF→Gateway. Tipos firmes solo desde `/v1/openapi.json` (envelope/core). |
| **G5** | **Política Sunset formal + endpoint changelog watchable** no existe pública. | Compromiso: aditivo dentro de `/v1`, breaking → `/v2`. Sin Sunset ni changelog formales. | **Drift watch en BFF (§7.8)**: health-check lee `info.version` + mesh fingerprints; PR-bloqueante en drift inesperado. |
| **G6** | **Streaming TTS audio-chunked** = handler-dependent por cada voice skill. | Existe `/v1/skill/stream` genérico; que un voice.* concreto emita chunks de audio depende del handler. | **Verificar por skill en Sprint 0** vía `describe` + prueba real. Fallback a polling (`202` + `job/:id/status`) si no soporta chunked. No prometer audio-chunked al cliente RN sin verificación. |

**Política transversal:** si el imperio cierra un gap en el futuro, este doc se versiona (entrada en §0.5 changelog), el BFF reduce la compensación, y se actualiza el contract test rig (§8).

---

## Apéndice A — Quick-reference de endpoints del Gateway

```
GET    /v1/openapi.json
GET    /v1/mesh
GET    /v1/mesh/manifest?mesh=&format=&executable_only=&search=
GET    /v1/skill/catalog?search=&namespace=&limit=
GET    /v1/skill/describe/:job_type
POST   /v1/skill/invoke
POST   /v1/skill/stream                       # SSE
GET    /v1/skill/job/:job_id/status

# Sub-superficies invocadas vía /v1/skill/invoke (job_type):
#   brain.query / brain.*                      → RAG
#   memory.conversation.{recall,append,clear}  → 3 superficies de memoria
#   memory.episodic.*                          → consultar describe por skill
#   memory.semantic.{search,store,forget}
#   workflow.compose                           → pipelines inline
#   workflow.schedule                          → cron sobre pipelines
#   n8n.trigger / n8n.list                     → workflow_key whitelisteada
#   voice.*                                    → TTS/STT (handler-dependent streaming)
```

Headers obligatorios en TODA llamada:
```
X-Imperial-Key:    <MENTEX_KEY>
X-Imperial-Tenant: mentex
Content-Type:      application/json
```

Recomendados:
```
X-Correlation-Id:  <uuid>
Idempotency-Key:   <uuid-determinístico-para-writes>
```

---

## Apéndice B — Lista de no-conocimientos (lo que Brandon NO necesita)

Brandon **no necesita** y **no debe asumir conocimiento de**:

- `lib/ai/agents/`, `lib/ai/gateway.ts`, `lib/swarm/`, `lib/trident/`, `lib/forge/`, `aether/` (interno del Imperio).
- AETHERNA Gateway 13-step pipeline (es internal opaco; Brandon ve el endpoint público).
- Swarm 58 agentes / Mission Control / `agents.tool_executions` (telemetría interna).
- Cortex tripartito / Hybrid Brain / Sovereign Brain / Mac Mini M4 (infra interna; lo que existe para Brandon es `/v1/memory`).
- Mother Forge / child registry / aetherna-matriz (linaje histórico, no acoplamiento runtime).
- `imperial-atlas` MCP local con 20 tools (es el MCP **interno** del VPS, **no se entrega** — Brandon usa el **Imperial Dev MCP** público de §6).
- Detalles del runtime de providers LLM, semantic cache, inquisitor audit, episodic consolidation cron, cost guard internals.

Toda esa lore es **deliberadamente opaca** para Mentex. Si en una conversación con Diego o Helios aparece un término de esta lista, **es contexto, no requerimiento**.

---

**Fin del documento.**

Próximo paso tras sellado: green-light Sprint 0 → Brandon ejecuta el contract test rig (§8) → 8/8 verde → Sprint A arranca con BFF setup + RN shell migration siguiendo este contrato.
