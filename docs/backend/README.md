# Mentex Backend — Documentación Maestra

**Versión:** 2.0 (post-sellado Diego+Helios, modelo inquilino)
**Fecha:** 2026-05-16
**Audiencia:** Brandon — programador backend externo de Mentex.
**Objetivo:** entregar contexto autosuficiente para construir el BFF + RN shell **enterprise-grade** del producto Mentex, consumiendo el Gateway Imperial Nyemen como inquilino.

---

## Filosofía del proyecto

Mentex es un coach IA mobile (App Store + Play Store) que se construye en **Expo (React Native managed)** con un **BFF propio** (Node 20+, Hono o Next API routes) que persiste en su propio Supabase y delega la inteligencia al **Gateway Imperial Nyemen**.

> **Mentex es un inquilino del Imperio.** Llama a `https://gateway.empire-os.co/v1/*` con una API key (`X-Imperial-Key`) y un tenant (`X-Imperial-Tenant: mentex`). **No vive dentro del Imperio.** No conoce sus internals. La frontera es la API pública. **Modelo Stripe.**

Esto significa: Brandon construye un backend **greenfield** que delega IA/RAG/memoria/orquestación/voz al Gateway, y mantiene OWN todo lo que es dominio Mentex (auth, datos del usuario, agenda, contenido, monetización, push, comunidad).

---

## El documento canónico

> **🔴 LEE PRIMERO:** [`MENTEX_BACKEND_CONTRACT.md`](./MENTEX_BACKEND_CONTRACT.md)

Es el **contrato sellado Diego + Helios**. Define:

- Modelo de DOS CONEXIONES (asistencia DX vs ejecución).
- Tabla **Delegate vs Own** canónica.
- Contrato técnico del Gateway (headers, async, streaming, idempotency, rate-limit por-namespace, envelope de error).
- API key del BFF (provisioning, rotación, seguridad).
- Setup del **Imperial Dev MCP** (LIVE en `https://mcp.empire-os.co/mcp`).
- Reglas de robustez del BFF (Zod en fronteras, retry/backoff, drift watch).
- **Sprint 0 — Contract Test Rig** (8 tests obligatorios antes de Sprint A).
- **GAPs honestos** que el BFF compensa (G1–G6).

**Regla cardinal del contrato:** NO se escribe código de backend hasta que el contrato esté sellado.

---

## Estructura de la documentación

### Parte A — Contrato (lee primero)

| Archivo | Qué cubre |
|---|---|
| [`MENTEX_BACKEND_CONTRACT.md`](./MENTEX_BACKEND_CONTRACT.md) | **🔴 Doc canónico sellado.** Modelo inquilino, contrato técnico, GAPs, Sprint 0. |

### Parte B — Backend Mentex (lo que construyes)

| # | Archivo | Qué cubre |
|---|---|---|
| 00 | [`00-EMPIRE-OVERVIEW.md`](./00-EMPIRE-OVERVIEW.md) | Arquitectura de 3 capas (RN → BFF → Gateway). El BFF de Mentex en una pantalla. |
| 01 | [`01-EMPIRE-INTEGRATION.md`](./01-EMPIRE-INTEGRATION.md) | Cómo el BFF consume el Gateway: cliente HTTP, headers, namespaces, propagación de `correlation_id`. |
| 02 | [`02-DATA-MODEL.md`](./02-DATA-MODEL.md) | Tablas Mentex (Supabase propio): rituals, agenda, reminders, content, subscriptions, integrations, idempotency. |
| 03 | [`03-AUTH-AND-TENANCY.md`](./03-AUTH-AND-TENANCY.md) | Supabase Auth + Apple/Google Sign In + RLS por `user_id` + GDPR right-to-erasure. |
| 04 | [`04-AI-COACH.md`](./04-AI-COACH.md) | Coach IA con **Vercel AI SDK** (loop OWN); tools = HTTP `/v1/skill/invoke`; streaming SSE; memoria vía `/v1/memory`. |
| 05 | [`05-MONETIZATION.md`](./05-MONETIZATION.md) | RevenueCat IAP (iOS/Android) → webhook receiver Mentex → credit ledger OWN + premium-gate. |
| 06 | [`06-CONTENT-CATALOG.md`](./06-CONTENT-CATALOG.md) | Cloudflare R2 (cuenta Mentex) + signed URLs + tablas content/playlists + ingesta. |
| 07 | [`07-NOTIFICATIONS-INTEGRATIONS.md`](./07-NOTIFICATIONS-INTEGRATIONS.md) | Expo Push + scheduling Mentex + OAuth integraciones (Google Cal, Apple Cal, Spotify, etc.). |
| 08 | [`08-DEPLOYMENT-OBSERVABILITY.md`](./08-DEPLOYMENT-OBSERVABILITY.md) | Deploy (Vercel/Fly/Render) + migrations Supabase + Sentry + privacy compliance. |

### Parte C — Ejecución

| # | Archivo | Qué cubre |
|---|---|---|
| 09 | [`09-MIGRATION-PLAN.md`](./09-MIGRATION-PLAN.md) | Sprints 0 → H. Sprint 0 = Contract Test Rig (gating absoluto). |

---

## Cómo usar esta documentación

### Si eres Brandon entrando frío

1. **Lee `MENTEX_BACKEND_CONTRACT.md` PRIMERO.** Sin él, el resto pierde sentido. Tómate 90 minutos.
2. Luego **`00-EMPIRE-OVERVIEW.md`** — arquitectura de 3 capas en una pantalla.
3. Luego **`01-EMPIRE-INTEGRATION.md`** — el cliente HTTP del Gateway en código.
4. Configura tu **Imperial Dev MCP** siguiendo §6 del contrato (URL + token de dev).
5. Luego **`09-MIGRATION-PLAN.md`** — Sprint 0 (contract tests) y Sprint A en adelante.
6. **El resto son referencias profundas** — lees el doc específico cuando vayas a tocar esa área. No los leas linealmente.

### Si vas a entregárselo a Claude Code para implementar

- Cada doc está escrito para ser **copy-paste-able** a Claude. SQL real, TypeScript real.
- Cuando uses Claude, **incluye `MENTEX_BACKEND_CONTRACT.md` siempre en su contexto** + el doc específico de la tarea.
- Tu Claude tiene acceso al **Imperial Dev MCP** (§6 del contrato) → puede consultar `gateway_contract`, `skill_describe`, etc. en vivo mientras programa.

---

## Stack final (resumen 1-pantalla)

```
┌─────────────────────────────────────────────────────────────────┐
│ APP RN (Sprint A — port del prototipo)                          │
│ Expo (managed) + React Native + Reanimated + AsyncStorage       │
│ Estado: Zustand · Navigation: React Navigation                  │
│ Pagos: react-native-purchases (RevenueCat)                      │
│ Push: expo-notifications                                        │
│ CERO secretos — bundle público                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│ MENTEX BFF (servidor — repo greenfield, NO en aether/)         │
│ Runtime: Node 20+ · Framework: Hono o Next.js 14 App Router    │
│ Hosting: Vercel / Fly.io / Render / Railway (decisión Mentex)  │
│ Persistencia: Supabase (cuenta Mentex propia)                  │
│ Auth: Supabase Auth + Apple Sign In + Google OAuth             │
│ Cliente Gateway: lib/gateway/client.ts (retry+backoff)         │
│ Coach loop: Vercel AI SDK · tools = HTTP /v1/skill/invoke      │
│ Push: Expo Access Token (cuenta Expo Mentex)                   │
│ Vault: IMPERIAL_API_KEY + Supabase service role + secretos     │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS
                              ↕ X-Imperial-Key + X-Imperial-Tenant: mentex
┌─────────────────────────────────────────────────────────────────┐
│ IMPERIAL GATEWAY (público, único cable real con el Imperio)    │
│ https://gateway.empire-os.co/v1/*                               │
│ ─ /v1/openapi.json     ← contrato tipado firme                 │
│ ─ /v1/skill/invoke     ← LLM, RAG, voz, todo                   │
│ ─ /v1/skill/stream     ← SSE                                   │
│ ─ /v1/skill/job/:id/status  ← async polling                    │
│ ─ /v1/memory           ← conversation/episodic/semantic        │
│ ─ /v1/orchestration    ← workflow.compose / n8n.trigger        │
│ ─ /v1/mesh             ← discovery                             │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────┐
  │  TERCEROS (cuentas Mentex propias)                       │
  │  ─ Supabase (project mentex-prod / mentex-staging)       │
  │  ─ RevenueCat (IAP iOS/Android)                          │
  │  ─ Expo Push Service (managed FCM + APNs)                │
  │  ─ Cloudflare R2 (bucket mentex-content)                 │
  │  ─ Sentry (proyecto mentex)                              │
  │  ─ OAuth: Google/Apple Cal, Spotify, Notion, ...         │
  └──────────────────────────────────────────────────────────┘
```

---

## Principios inviolables (enterprise standards)

Estos son los standards que toda línea de código backend de Mentex debe cumplir. Si algo no cumple, no se mergea.

### Contrato con el Gateway

1. **Toda llamada al Gateway pasa por el cliente HTTP central** (`lib/gateway/client.ts`). Nunca `fetch` ad-hoc dispersos.
2. **Headers obligatorios:** `X-Imperial-Key`, `X-Imperial-Tenant: mentex`. Sin estos, la request no sale.
3. **`correlation_id` propagado** en cada request del BFF al Gateway y loguead en cada paso.
4. **Tipos firmes** solo desde `/v1/openapi.json`. **Zod schemas** autorados Mentex-side por skill en la frontera.
5. **Patrón async manejado**: si recibe `202` → poll `/v1/skill/job/:id/status` con backoff progresivo.
6. **Rate-limit por-namespace**: respeta `Retry-After`, colas separadas (skill / brain / memory / orchestration).
7. **Drift watch** en CI: `info.version` y mesh fingerprints contra baseline.

### Seguridad

8. **DEFAULT-DENY en RLS**: toda tabla Mentex nace con RLS habilitado, policies por `user_id = auth.uid()`.
9. **`service_role` key NUNCA al frontend**. Solo cron/worker del BFF.
10. **`IMPERIAL_API_KEY` NUNCA en bundle RN ni en repo**. Solo vault del servidor.
11. **`pgcrypto` para refresh tokens OAuth at rest**.
12. **PII redactada en logs** — emails, nombres, payment data nunca en console.log/Sentry.

### Datos

13. **Soft delete por default** (`deleted_at TIMESTAMPTZ`). Hard delete solo para GDPR right-to-erasure (incluye `memory.semantic.forget` + `memory.conversation.clear` contra Gateway).
14. **Audit log append-only** para tablas críticas (subscriptions, payments, integrations).
15. **Migraciones versionadas** numeradas en orden — nunca editar una migración merged.

### AI (Coach Mentex)

16. **Loop del Coach vive en el BFF** (Vercel AI SDK). Tools = HTTP a `/v1/skill/invoke`.
17. **Toda LLM call pasa por el Gateway**. Nunca llamar Claude/Gemini/OpenAI directo desde el BFF.
18. **Premium-gate antes de delegar skills costosas** (G1: metering propio en BFF).
19. **Streaming siempre habilitado** cuando aplica — mejor UX + abort cancela cost.

### Operaciones

20. **Timeouts en TODA llamada externa** (default 5s, 30s LLM síncrono, 60s LLM máx).
21. **Idempotency keys defensivas Mentex-side** para writes críticos (G3).
22. **Logger estructurado** con `requestId`, `userId`, `correlation_id`, `context`.
23. **Backups testeados trimestralmente** — backup sin restore drill = no backup.

### Cumplimiento (App Store / Play Store)

24. **Apple Sign In obligatorio** si hay Google/Facebook social login (regla App Store).
25. **Privacy Manifest** en iOS (xcprivacy) declarando todas las APIs usadas.
26. **Permisos contextuales** — pedir notifications/calendar permission solo cuando el user va a usar la feature, no al primer launch.
27. **Cancelación de suscripción in-app** linkeable (App Store requirement).

---

## Glosario (modelo inquilino)

| Término | Significado |
|---|---|
| **Imperio Nyemen** | Ecosistema de Diego del que Mentex consume infra IA vía el Gateway público. Sus internals son **opacos** para Mentex. |
| **Gateway Imperial** | API pública `https://gateway.empire-os.co/v1/*`. Único cable real entre Mentex y el Imperio. |
| **Tenant** | Identidad de Mentex frente al Gateway: `mentex`. Va en header `X-Imperial-Tenant`. **No es columna en tablas Mentex** — los usuarios Mentex se aíslan por `user_id` dentro del propio Supabase de Mentex. |
| **Mentex BFF** | El backend que Brandon construye. Repo **greenfield**, Node 20+. Dueño de `IMPERIAL_API_KEY`. |
| **`IMPERIAL_API_KEY`** | La key del BFF contra el Gateway (Conexión B). Provisionada por Helios. Vive en vault del servidor. |
| **`BRANDON_DEV_TOKEN`** | Token de dev para el **Imperial Dev MCP** (Conexión A — asistencia). Read-only, ~120 req/min. NO autoriza ejecución. |
| **Imperial Dev MCP** | MCP remoto HTTP en `https://mcp.empire-os.co/mcp`. 5 tools read-only para discovery del contrato. Acelerador de DX del asistente Claude de Brandon. |
| **Conexión A** | Claude de Brandon ↔ Imperial Dev MCP. Asistencia. |
| **Conexión B** | Mentex BFF ↔ Gateway. Ejecución. Único cable runtime. |
| **OWN vs DELEGATE** | Tabla §3 del contrato: lo que vive en Mentex DB vs lo que se delega al Gateway. |
| **Sprint 0** | Contract Test Rig (§8 del contrato). 8 tests verdes contra Gateway real antes de arrancar Sprint A. |
| **GAP honesto** | Limitación actual del Gateway que el BFF compensa Mentex-side (G1–G6 en §9 del contrato). No es "coming soon". |
| **Vercel AI SDK** | Framework elegido para el loop conversacional del Coach (OWN, vive en BFF). Tools del loop = HTTP a `/v1/skill/invoke`. |

---

## Contacto y siguiente paso

- **Founder Mentex:** Diego (administracion@mentex.app).
- **CTO Imperio (autoridad técnica sobre el contrato):** Helios.
- **Dev externo backend:** Brandon (a designar).
- **Repo del frontend (prototipo actual):** `MentexDev/Mentex-app` (este repo).
- **Repo del backend (greenfield, a crear en Sprint A):** `MentexDev/mentex-bff` (sugerido).

### Credenciales (entregadas por Diego en canal privado, NO en repo)

- `IMPERIAL_API_KEY` para el BFF (Conexión B).
- `BRANDON_DEV_TOKEN` para el Imperial Dev MCP (Conexión A).
- Supabase credentials (al provisionar el proyecto Mentex).
- RevenueCat / Expo / Sentry / OAuth credentials (al avanzar los sprints).

**Next:** lee [`MENTEX_BACKEND_CONTRACT.md`](./MENTEX_BACKEND_CONTRACT.md) — 90 minutos bien invertidos.
