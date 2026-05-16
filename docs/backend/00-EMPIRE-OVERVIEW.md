# 00 · Architecture Overview — Mentex como inquilino del Gateway

**Prerequisito:** leíste [`MENTEX_BACKEND_CONTRACT.md`](./MENTEX_BACKEND_CONTRACT.md). Si no, lee primero el contrato — este doc lo amplía.

Este documento describe la arquitectura de 3 capas del backend de Mentex y por qué cada pieza vive donde vive.

---

## 0.1 Las 3 capas en una pantalla

```
┌──────────────────────────────────────────────────────────────────┐
│ Capa 1 · APP RN (cliente puro)                                   │
│ Expo (managed) · React Native · Reanimated · AsyncStorage        │
│ State: Zustand · Nav: React Navigation                           │
│ Pagos: react-native-purchases (RevenueCat)                       │
│ Push: expo-notifications                                         │
│ Auth client: @supabase/supabase-js                               │
│ ╳ CERO secretos: bundle público                                  │
└──────────────────────────────────────────────────────────────────┘
                              │ HTTPS (Bearer JWT Supabase)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ Capa 2 · MENTEX BFF (servidor)                                   │
│ Node 20+ · Hono o Next.js 14 App Router                          │
│ Hosting: Vercel / Fly.io / Render / Railway                      │
│ ✅ Dueño de IMPERIAL_API_KEY (vault)                             │
│ ✅ Dueño de Supabase service role key                            │
│ Cliente Gateway central (retry/backoff/namespace-aware)          │
│ Coach loop con Vercel AI SDK (OWN)                               │
│ Cron interno: reminders scheduler, streak recompute, etc.        │
│ Logger estructurado con redaction PII                            │
└──────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────────┐
        │                     │                         │
        ▼                     ▼                         ▼
┌─────────────────┐ ┌────────────────────┐ ┌─────────────────────┐
│ Supabase Mentex │ │ Gateway Imperial   │ │ Terceros (cuentas   │
│ (cuenta propia) │ │ /v1/* + X-Imperial │ │ Mentex propias)     │
│ Auth + Postgres │ │ Key + Tenant       │ │ RevenueCat / Expo / │
│ + pgvector*     │ │ ─ skill.invoke     │ │ Cloudflare R2 /     │
│ + RLS por       │ │ ─ skill.stream     │ │ Sentry / OAuth      │
│   user_id       │ │ ─ memory           │ │ providers           │
│                 │ │ ─ orchestration    │ │                     │
│                 │ │ ─ openapi.json     │ │                     │
└─────────────────┘ └────────────────────┘ └─────────────────────┘
```

`pgvector*`: extensión opcional. Si Mentex necesita semantic search local (e.g. catálogo de contenido), se habilita; si todo el RAG se delega al Gateway, no se necesita.

---

## 0.2 Por qué esta arquitectura

### Por qué un BFF (y no llamar al Gateway desde la app)

1. **Secretos del Gateway.** `IMPERIAL_API_KEY` no puede vivir en un bundle RN (basta descargar el APK y extraerla).
2. **Composición.** El BFF orquesta: lee Supabase + delega al Gateway + escribe Supabase + emite push. La app no hace esa coreografía.
3. **Premium-gate y metering** (GAP G1). El gating de qué skill puede ejecutar qué usuario vive Mentex-side, no en la app.
4. **Coach loop** (Vercel AI SDK) necesita estado de sesión y memoria; vive donde están los secretos y la DB.
5. **Auditoría.** Todo log con `correlation_id` y PII redactada está en el BFF; la app no debería loguear ni siquiera errores con datos sensibles.

### Por qué Supabase propio (y no compartir el del Imperio)

1. **Modelo inquilino.** Mentex no comparte DB con el Imperio. Tiene su Supabase project (`mentex-prod` + `mentex-staging`).
2. **Aislamiento de datos del usuario.** Los datos de los usuarios Mentex son del producto Mentex. El Imperio no los toca.
3. **Migraciones controladas Mentex-side.** Sin coordinar con cambios internos del Imperio.
4. **RLS simple.** Aislamiento por `user_id = auth.uid()`. Sin `tenant_id` en cada tabla — el "tenant" Mentex es **el proyecto Supabase entero**.

### Por qué el Gateway (y no llamar Claude/OpenAI/Gemini directo)

1. **Selección de provider transparente.** El Gateway elige el LLM óptimo por skill + intent + complejidad.
2. **RAG sobre Atlas Brain.** El conocimiento curado del Imperio (15k+ chunks) está detrás de skills `brain.*` — Mentex no lo replica.
3. **Memoria (3 superficies).** `/v1/memory` provee conversation / episodic / semantic listos.
4. **Voz (TTS/STT).** `voice.*` skills cubren generación y transcripción.
5. **Orchestration.** `workflow.compose` + `n8n.trigger` para pipelines y crons sin levantar infra propia.
6. **Cost-attribution + observability.** El Gateway loguea costos por tenant (aunque hoy con GAP G1 no los expone — ver §9 del contrato).

---

## 0.3 Lo que el BFF de Mentex hace internamente

Por sub-sistema. Los detalles SQL/código viven en los docs 02–08.

| Sub-sistema | Doc | Qué hace |
|---|---|---|
| **Auth** | [03](./03-AUTH-AND-TENANCY.md) | Supabase Auth (email + Apple + Google), trigger on signup, claims custom para RLS. |
| **Ritual & Agenda** | [02](./02-DATA-MODEL.md) | CRUD de `ritual_items`, `ritual_routines`, `ritual_sessions`, `agenda_events`, `reminders`. |
| **Coach IA** | [04](./04-AI-COACH.md) | Loop conversacional con Vercel AI SDK. Tools = HTTP a `/v1/skill/invoke` (Gateway). Streaming SSE a la app. |
| **Memoria del Coach** | [04](./04-AI-COACH.md) | Recall/append/clear de `/v1/memory.conversation`; search/store/forget de `/v1/memory.semantic`. |
| **Monetización** | [05](./05-MONETIZATION.md) | RevenueCat webhook receiver (firma HMAC + idempotency), credit ledger Mentex, premium-gate. |
| **Catálogo de contenido** | [06](./06-CONTENT-CATALOG.md) | Tablas `content`, `playlists`, signed URLs R2 (cuenta Mentex), recomendaciones (filtros + opcional `brain.query`). |
| **Notificaciones** | [07](./07-NOTIFICATIONS-INTEGRATIONS.md) | Expo Push (cuenta Mentex), scheduler interno (cron), preferencias por user. |
| **Integraciones OAuth** | [07](./07-NOTIFICATIONS-INTEGRATIONS.md) | Google Cal, Apple Cal, Spotify, Notion, Linear. Refresh tokens encriptados con `pgcrypto`. |
| **Cliente Gateway** | [01](./01-EMPIRE-INTEGRATION.md) | HTTP central con retry/backoff, namespace-aware queues, propagación `correlation_id`, drift watch. |
| **Cron / scheduler** | [07](./07-NOTIFICATIONS-INTEGRATIONS.md) | Reminders cada minuto, streak recompute diario 3am, content recommendations semanal. |
| **GDPR right-to-erasure** | [03](./03-AUTH-AND-TENANCY.md) | Endpoint `DELETE /api/me` que purga Supabase + invoca `memory.semantic.forget` + `memory.conversation.clear`. |

---

## 0.4 Lo que el BFF delega al Gateway

Solo la inteligencia. Resumen de §3 del contrato:

```
LLM / Coach respuestas          → skill.invoke (skills coach.*)
RAG sobre Atlas Brain           → skill.invoke (skills brain.*)
Voz (TTS / STT)                 → skill.invoke (skills voice.*)
Memoria de usuario              → /v1/memory (conversation/episodic/semantic)
Workflows (pipelines + n8n)     → /v1/orchestration (workflow.compose / n8n.trigger)
Discovery de skills             → /v1/openapi.json + /v1/mesh + /v1/skill/describe
```

**Nada de lo siguiente se delega:**

- Auth de usuarios Mentex (vive en Supabase Mentex).
- Datos del usuario (rituales, agenda, contenido consumido, suscripción).
- Lógica de premium-gate, cuotas, metering.
- Push notifications (Expo Push, cuenta Mentex).
- OAuth integrations refresh tokens.

---

## 0.5 Cost guardrails (Mentex-side, por el GAP G1)

El Gateway no expone cost-attribution per-tenant hoy (GAP G1 del contrato §9). Por eso el BFF implementa **metering propio**:

| Bucket | Plan free | Plan premium | Plan pro_plus |
|---|---|---|---|
| Llamadas a `skill.invoke` por día | 50 | 1,000 | 10,000 |
| Llamadas a `brain.query` por día | 20 | 500 | 5,000 |
| Llamadas a `voice.*` por día | 5 | 100 | 1,000 |
| Llamadas a `memory.*` por día | ilimitado | ilimitado | ilimitado |
| Storage R2 (audio premium) | N/A (free no accede) | 1 GB | 10 GB |

Implementación: tabla `mentex.usage_quotas` con período mensual + check antes de delegar.

Cuando el Gateway exponga cost-attribution real, este sistema se reemplaza por la lectura directa de costos y la compensación G1 queda obsoleta.

---

## 0.6 Convenciones de código del BFF

Cuando escribas el BFF de Mentex, sigues estas convenciones:

- **Lenguaje:** TypeScript estricto. `strict: true` en `tsconfig.json`. Cero `any`.
- **Runtime:** Node 20+ (Vercel Edge para algunas routes públicas, Node runtime para Gateway calls + DB).
- **Framework:** Hono (recomendado, ergonómico para BFF) o Next.js 14 App Router. Decisión Mentex-side.
- **Linter:** ESLint con `simple-import-sort` + `@typescript-eslint`.
- **Formatter:** Prettier.
- **Tests:** Vitest + supertest. Coverage ≥80% en módulos core (gateway client, auth, monetization).
- **Logger:** `pino` con redaction config (email, full_name, phone, refresh_tokens).
- **Validation:** Zod schemas en **toda** boundary (request body, env vars, Gateway responses).
- **Errores:** clase base `MentexError extends Error` con `code`, `httpStatus`, `correlation_id`.
- **Logs:** JSON estructurado con `requestId`, `userId`, `correlationId`, `level`, `context`.
- **Naming:** snake_case para SQL, camelCase para TS, PascalCase para clases.
- **Imports:** `@/lib/*` paths en tsconfig.
- **Comments:** solo cuando el WHY no es obvio.

---

## 0.7 Repo del BFF (greenfield)

El BFF de Mentex es **un repo nuevo, separado** del repo del frontend (`MentexDev/Mentex-app`).

Estructura sugerida (Brandon adapta según framework elegido):

```
mentex-bff/
├── src/
│   ├── routes/                      (Hono o Next API routes)
│   │   ├── auth/                    (signup, signin, refresh, signout)
│   │   ├── coach/
│   │   │   ├── chat.ts              (POST — streaming SSE al Coach)
│   │   │   └── memory.ts            (GET/DELETE memoria del coach por user)
│   │   ├── ritual/
│   │   │   ├── items.ts             (CRUD ritual items)
│   │   │   ├── sessions.ts          (start/complete ritual session)
│   │   │   └── routines.ts          (CRUD routines)
│   │   ├── agenda/
│   │   │   ├── events.ts            (CRUD agenda)
│   │   │   ├── reminders.ts         (CRUD reminders)
│   │   │   └── sync.ts              (trigger calendar sync)
│   │   ├── content/
│   │   │   ├── catalog.ts           (browse, search)
│   │   │   ├── [id].ts              (detail + signed URL audio)
│   │   │   ├── playlists.ts         (user playlists)
│   │   │   └── progress.ts          (track play %)
│   │   ├── subscription/
│   │   │   ├── status.ts            (current plan + entitlements)
│   │   │   └── webhook.ts           (RevenueCat webhook receiver)
│   │   ├── notifications/
│   │   │   ├── register.ts          (save expo_push_token)
│   │   │   └── preferences.ts
│   │   ├── integrations/
│   │   │   └── [provider]/          (connect / callback / disconnect)
│   │   ├── me/
│   │   │   ├── profile.ts           (read/update)
│   │   │   ├── stats.ts             (streak, total mins)
│   │   │   └── erase.ts             (GDPR DELETE)
│   │   └── health/
│   │       ├── live.ts
│   │       └── gateway.ts           (drift watch)
│   ├── lib/
│   │   ├── gateway/
│   │   │   ├── client.ts            (HTTP client central)
│   │   │   ├── schemas.ts           (Zod schemas por skill)
│   │   │   └── generated.ts         (tipos generados desde /v1/openapi.json)
│   │   ├── coach/
│   │   │   ├── loop.ts              (Vercel AI SDK loop)
│   │   │   ├── tools.ts             (tools del loop → HTTP a skill.invoke)
│   │   │   └── prompts.ts           (system prompts)
│   │   ├── db/
│   │   │   ├── client.ts            (Supabase client wrappers)
│   │   │   └── queries/             (SQL helpers)
│   │   ├── auth/
│   │   │   ├── middleware.ts        (verify JWT)
│   │   │   └── claims.ts
│   │   ├── monetization/
│   │   │   ├── revenuecat.ts        (RC API wrapper)
│   │   │   ├── webhook.ts           (signature + idempotency)
│   │   │   └── premium-gate.ts
│   │   ├── content/
│   │   │   ├── catalog.ts
│   │   │   └── r2.ts                (Cloudflare R2 SDK wrapper)
│   │   ├── push/
│   │   │   ├── expo.ts
│   │   │   └── scheduler.ts
│   │   ├── integrations/
│   │   │   ├── google-calendar.ts
│   │   │   ├── apple-calendar.ts
│   │   │   └── ...
│   │   ├── logger.ts                (pino + redaction)
│   │   ├── errors.ts                (MentexError + mapping)
│   │   └── config.ts                (env vars + validation con Zod)
│   └── jobs/                        (cron / queue handlers)
│       ├── reminders.ts
│       ├── streak-recompute.ts
│       └── content-recommend.ts
├── migrations/                      (Supabase migrations, numeradas)
│   ├── 0001_init_schema.sql
│   ├── 0002_users.sql
│   ├── 0003_rituals.sql
│   └── ...
├── tests/
│   ├── contract/                    (Sprint 0 — contract test rig)
│   ├── unit/
│   └── integration/
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 0.8 Variables de entorno del BFF

```bash
# Gateway Imperial (entregada por Helios, vía Diego, canal privado)
IMPERIAL_API_KEY=<opaque-token>
IMPERIAL_GATEWAY_URL=https://gateway.empire-os.co

# Supabase (cuenta Mentex propia)
SUPABASE_URL=https://<mentex-project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role>   # NUNCA al cliente RN

# RevenueCat (cuenta Mentex propia)
REVENUECAT_SECRET_KEY=<secret>
REVENUECAT_WEBHOOK_SECRET=<webhook-secret>

# Expo Push (cuenta Mentex propia)
EXPO_ACCESS_TOKEN=<token>

# Cloudflare R2 (cuenta Mentex propia o bucket dedicado)
R2_ACCOUNT_ID=<account>
R2_ACCESS_KEY_ID=<key-id>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET_MENTEX=mentex-content

# OAuth providers (cuentas Mentex propias)
GOOGLE_OAUTH_CLIENT_ID=<...>
GOOGLE_OAUTH_CLIENT_SECRET=<...>
SPOTIFY_CLIENT_ID=<...>
SPOTIFY_CLIENT_SECRET=<...>
# ... más OAuth según las integraciones soportadas

# Sentry
SENTRY_DSN=<mentex-project-dsn>

# Encryption key para refresh tokens OAuth (pgcrypto)
OAUTH_ENCRYPTION_KEY=<32-byte-key-base64>

# Premium quotas (defaults, sobreescribibles per-user)
MENTEX_FREE_SKILL_INVOKE_PER_DAY=50
MENTEX_PREMIUM_SKILL_INVOKE_PER_DAY=1000
```

Variables del cliente RN (`app.config.js`):

```bash
EXPO_PUBLIC_BFF_URL=https://api.mentex.app
EXPO_PUBLIC_SUPABASE_URL=https://<mentex-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY_IOS=<...>
EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY_ANDROID=<...>
EXPO_PUBLIC_SENTRY_DSN=<mentex-rn-dsn>
```

---

## 0.9 Cómo verificar que entendiste

Si después de leer este doc y el contrato puedes responder estas preguntas SIN volver atrás, vas bien.

1. **¿Por qué Mentex no llama a Claude/OpenAI directo?** → Porque el Gateway hace selección de provider, RAG, cost-attribution, voz, memoria. Llamar directo te salta todo y rompe el contrato.
2. **¿Dónde vive la `IMPERIAL_API_KEY`?** → En el vault del servidor del BFF. Nunca en el bundle RN, nunca en el repo.
3. **¿Quién paga el LLM?** → El usuario, vía RevenueCat. El BFF aplica premium-gate antes de delegar.
4. **¿Cómo se le envía un push notification a un user de Mentex a las 7:30am?** → Scheduler interno del BFF (cron 1 min) lee `mentex.reminders` con hora actual ±30s, llama a Expo Push API con `expo_push_token`.
5. **¿Qué es el Imperial Dev MCP y para qué sirve?** → MCP remoto HTTP en `https://mcp.empire-os.co/mcp`. Acelera el asistente Claude de Brandon con 5 tools read-only de discovery. **No es el cable del backend** — el cable real es `https://gateway.empire-os.co/v1/*` con la API key.
6. **¿Qué es un GAP honesto?** → Una limitación actual del Gateway que el BFF compensa Mentex-side (G1–G6 del contrato). No es "coming soon"; es contrato presente.

---

**Next:** [`01-EMPIRE-INTEGRATION.md`](./01-EMPIRE-INTEGRATION.md) — el cliente HTTP del Gateway en detalle.
