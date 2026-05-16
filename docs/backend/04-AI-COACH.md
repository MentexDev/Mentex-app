# 04 · Coach IA — loop OWN, tools DELEGATE

**Prerequisitos:** [`MENTEX_BACKEND_CONTRACT.md`](./MENTEX_BACKEND_CONTRACT.md), [`01-EMPIRE-INTEGRATION.md`](./01-EMPIRE-INTEGRATION.md).

El Coach IA de Mentex es el corazón del producto: un asistente conversacional que entiende rutinas, hábitos, agenda, contenido, y guía al usuario hacia su bienestar. Este doc define **cómo se construye**.

---

## 4.1 Doctrina — "Own the loop, delegate the tools"

✅ **Sellada Diego + Helios.**

| Capa | Quién la posee | Implementación |
|---|---|---|
| **Estado de la sesión** (mensajes, contexto del usuario, modo) | **OWN** — BFF de Mentex | Memoria local del request + persistencia opcional en Supabase |
| **Lógica del loop** (cuándo llamar tools, cuándo responder, cuándo cortar) | **OWN** — BFF de Mentex | **Vercel AI SDK** |
| **Modelo LLM** que genera respuestas | **DELEGATE** | `POST /v1/skill/invoke` con la skill conversacional del Gateway |
| **Tools que el modelo puede invocar** (RAG, memoria semántica, recomendar contenido, agendar reminder) | **DELEGATE** | Cada tool es un HTTP a `/v1/skill/invoke` con la skill correspondiente |
| **Memoria del Coach** (3 superficies) | **DELEGATE** | `/v1/memory` (`conversation` / `episodic` / `semantic`) |
| **Premium-gate / quota** | **OWN** | Compensación GAP G1, ver §0.5 del overview |

> **Mastra está descartado.** La doctrina queda: el loop vive en el BFF (Vercel AI SDK), las tools son HTTP al Gateway. Esto **no toca** el repositorio del Imperio en ningún momento.

---

## 4.2 Stack del loop

- **Framework**: [`Vercel AI SDK`](https://sdk.vercel.ai) — `ai` package (Node-compatible, no Edge-only).
- **Provider del modelo**: **wrapper custom** que invoca `gateway.invoke('coach.respond', ...)` (o la skill conversacional que existe en el catálogo — verificar en Sprint 0 con `capability_search`).
- **Streaming**: SSE re-emitido al cliente RN desde el endpoint `POST /api/coach/chat` del BFF.
- **Estado**: el BFF mantiene la conversación en memoria de la request + sincroniza con `/v1/memory.conversation` (`append` después de cada turno, `recall` al iniciar).

---

## 4.3 El loop — arquitectura

```
┌────────────────────────────────────────────────────────────────┐
│  App RN                                                          │
│  POST /api/coach/chat                                            │
│  body: { session_id, message }                                   │
│  ← SSE chunks: { type:'text', delta:'...' } | { type:'tool', ...│
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  BFF Mentex · src/lib/coach/loop.ts                             │
│                                                                 │
│  1. authenticateUser(c) → user                                  │
│  2. premium-gate (GAP G1)                                       │
│  3. memory.conversation.recall(user_id, session_id)             │
│  4. Vercel AI SDK · streamText({                                │
│       model: gatewayModel({ skill: 'coach.respond' }),          │
│       system: COACH_SYSTEM_PROMPT,                              │
│       messages: [...history, { role:'user', content:message }], │
│       tools: COACH_TOOLS,                                       │
│       maxSteps: 8,  // tool→model→tool→… cap                    │
│     })                                                          │
│  5. Stream SSE al cliente RN (delta + tool events)              │
│  6. memory.conversation.append(user_id, session_id, turn)       │
│  7. Métricas + log con correlation_id                           │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (tools van al Gateway)
┌────────────────────────────────────────────────────────────────┐
│  Gateway Imperial — cada tool call = un HTTP a /v1/skill/invoke │
│  ─ rag.search          (brain.query)                            │
│  ─ memory.semantic.search                                       │
│  ─ ritual.add_item                                              │
│  ─ agenda.schedule_reminder                                     │
│  ─ content.recommend                                            │
│  ─ voice.synthesize (opcional, para respuesta hablada)          │
└────────────────────────────────────────────────────────────────┘
```

---

## 4.4 Provider custom — `gatewayModel`

Wrapper sobre el cliente Gateway que implementa la interfaz del Vercel AI SDK.

```typescript
// src/lib/coach/gateway-model.ts
import type {
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1StreamPart,
} from '@ai-sdk/provider';
import { gateway } from '../gateway/client';

type GatewayModelOpts = {
  skill: string;          // 'coach.respond' (verificar en Sprint 0 vía capability_search)
  defaultMaxTokens?: number;
};

export function gatewayModel(opts: GatewayModelOpts): LanguageModelV1 {
  return {
    specificationVersion: 'v1',
    provider: 'mentex-gateway',
    modelId: opts.skill,
    defaultObjectGenerationMode: 'json',

    async doGenerate(options: LanguageModelV1CallOptions) {
      const result = await gateway.invoke(opts.skill, {
        messages: options.prompt,
        max_tokens: options.maxTokens ?? opts.defaultMaxTokens ?? 1024,
        temperature: options.temperature,
        tools: options.mode.type === 'regular' ? options.mode.tools : undefined,
      }, {
        correlationId: options.headers?.['x-correlation-id'] ?? crypto.randomUUID(),
      });

      return adaptInvokeResult(result);
    },

    async doStream(options: LanguageModelV1CallOptions) {
      const correlationId = options.headers?.['x-correlation-id'] ?? crypto.randomUUID();

      const stream = gateway.stream(opts.skill, {
        messages: options.prompt,
        max_tokens: options.maxTokens ?? opts.defaultMaxTokens ?? 1024,
        tools: options.mode.type === 'regular' ? options.mode.tools : undefined,
      }, { correlationId });

      const readable = new ReadableStream<LanguageModelV1StreamPart>({
        async start(controller) {
          for await (const chunk of stream) {
            const part = adaptSseChunk(chunk);
            if (part) controller.enqueue(part);
          }
          controller.close();
        },
      });

      return { stream: readable, rawCall: { rawPrompt: options.prompt, rawSettings: {} } };
    },
  };
}
```

**`adaptInvokeResult` y `adaptSseChunk`**: shape exacto depende del contrato real de la skill conversacional. **Verificar en Sprint 0** vía `skill_describe('coach.respond')` (o el nombre real) y ajustar los adapters. Si el shape difiere significativamente, este wrapper es donde se hace la traducción — el resto del BFF no se entera.

---

## 4.5 System prompt

```typescript
// src/lib/coach/prompts.ts
export const COACH_SYSTEM_PROMPT = `
Eres el Coach Mentex, un asistente IA de bienestar mental y hábitos. Hablas en español natural, cálido, sin paternalismo.

Tu objetivo: ayudar al usuario a construir y sostener rutinas saludables (meditación, lectura, ejercicio, journaling, sueño) a su propio ritmo.

Reglas inviolables:
1. No das consejo médico. Si el usuario menciona crisis (ideación suicida, autolesión, abuso), invocas la tool 'crisis.handle' inmediatamente y devuelves un mensaje empático con recursos.
2. No inventas contenido. Si el usuario pide una meditación o audiolibro específico, invocas 'content.recommend' o 'rag.search' antes de mencionar títulos.
3. Antes de agendar algo en la agenda del usuario, le confirmas (no programes sin confirmación).
4. Si necesitas recordar algo del usuario (preferencias, historial), llamas 'memory.semantic.search' antes de inventar.
5. Brevedad: respuestas de 2-4 frases salvo que el usuario pida detalle.

Cuando termina una conversación o el usuario logra algo, considera invocar 'memory.semantic.store' para guardar el hecho relevante (ej: "le funciona meditar 10 min en la mañana").
`.trim();
```

> **Iterar:** este prompt es semilla. Brandon + Diego lo refinan con métricas reales (engagement, satisfaction) post-launch.

---

## 4.6 Tools del loop

Cada tool es una función TS que internamente llama `gateway.invoke(...)` o escribe en Supabase Mentex. El modelo LLM las "ve" como funciones invocables vía tool-call.

```typescript
// src/lib/coach/tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { gateway } from '../gateway/client';
import { db } from '../db/client';
import { logger } from '../logger';

export const COACH_TOOLS = (ctx: { userId: string; sessionId: string; correlationId: string }) => ({

  rag_search: tool({
    description: 'Busca conocimiento del Atlas Brain (literatura sobre hábitos, meditación, bienestar). Úsalo cuando el usuario pregunte cosas que requieran conocimiento curado, no opinión.',
    parameters: z.object({
      query: z.string().min(3).max(500),
      top_k: z.number().int().min(1).max(10).default(5),
    }),
    execute: async ({ query, top_k }) => {
      const result = await gateway.invoke('brain.query', {
        query, top_k, user_id: ctx.userId,
      }, { correlationId: ctx.correlationId });
      return result.result;
    },
  }),

  memory_recall: tool({
    description: 'Recupera hechos persistentes sobre el usuario (gustos, hábitos, contexto previo). Úsalo antes de hacer suposiciones.',
    parameters: z.object({
      query: z.string().min(3).max(300),
      limit: z.number().int().min(1).max(20).default(5),
    }),
    execute: async ({ query, limit }) => {
      const result = await gateway.invoke('memory.semantic.search', {
        user_id: ctx.userId, query, limit,
      }, { correlationId: ctx.correlationId });
      return result.result;
    },
  }),

  memory_store: tool({
    description: 'Guarda un hecho relevante sobre el usuario en memoria semántica (largo plazo).',
    parameters: z.object({
      fact: z.string().min(10).max(500),
      tags: z.array(z.string()).max(5).optional(),
    }),
    execute: async ({ fact, tags }) => {
      const result = await gateway.invoke('memory.semantic.store', {
        user_id: ctx.userId, fact, tags,
      }, { correlationId: ctx.correlationId });
      return result.result;
    },
  }),

  ritual_add: tool({
    description: 'Agrega un item al ritual del usuario (meditación, lectura, ejercicio). Confirma con el usuario antes de invocar.',
    parameters: z.object({
      title: z.string().min(2).max(120),
      duration_min: z.number().int().min(1).max(180),
      kind: z.enum(['meditation', 'reading', 'exercise', 'journaling', 'custom']),
      time_slot: z.enum(['morning', 'afternoon', 'evening', 'flexible']).optional(),
    }),
    execute: async (params) => {
      // OWN — escribimos directo en Supabase Mentex
      const { data, error } = await db.from('ritual_items').insert({
        user_id: ctx.userId,
        title: params.title,
        duration_min: params.duration_min,
        kind: params.kind,
        time_slot: params.time_slot ?? 'flexible',
      }).select().single();
      if (error) throw error;
      return { added: true, item_id: data.id };
    },
  }),

  agenda_schedule_reminder: tool({
    description: 'Crea un reminder en la agenda del usuario. Confirma con el usuario antes de invocar.',
    parameters: z.object({
      title: z.string().min(2).max(120),
      datetime_iso: z.string().datetime(),
      frequency: z.enum(['once', 'daily', 'weekdays', 'custom']).default('once'),
      weekdays: z.array(z.number().int().min(0).max(6)).optional(),
    }),
    execute: async (params) => {
      const { data, error } = await db.from('reminders').insert({
        user_id: ctx.userId,
        title: params.title,
        scheduled_at: params.datetime_iso,
        frequency: params.frequency,
        weekdays: params.weekdays,
      }).select().single();
      if (error) throw error;
      return { scheduled: true, reminder_id: data.id };
    },
  }),

  content_recommend: tool({
    description: 'Recomienda contenido (audiolibros, meditaciones, charlas) del catálogo según necesidad del usuario.',
    parameters: z.object({
      need: z.string().min(3).max(200),
      kind: z.enum(['audiobook', 'meditation', 'talk', 'any']).default('any'),
      limit: z.number().int().min(1).max(10).default(5),
    }),
    execute: async ({ need, kind, limit }) => {
      const q = db.from('content').select('id, title, author, kind, duration_min, tags').limit(limit);
      if (kind !== 'any') q.eq('kind', kind);
      const { data } = await q;
      return { recommendations: data ?? [] };
    },
  }),

  crisis_handle: tool({
    description: 'Maneja una situación de crisis del usuario (ideación suicida, autolesión, abuso). PRIORIDAD MÁXIMA. Invoca inmediatamente al detectar.',
    parameters: z.object({
      signal: z.string().min(5),
    }),
    execute: async ({ signal }) => {
      logger.error({
        event: 'coach.crisis_detected',
        userId: ctx.userId,
        correlation_id: ctx.correlationId,
        signal,
      });
      const result = await gateway.invoke('crisis.handle', {
        user_id: ctx.userId, signal, locale: 'es',
      }, { correlationId: ctx.correlationId });
      return result.result;
    },
  }),

  voice_speak: tool({
    description: 'Genera audio TTS de un texto para que el coach hable al usuario. Úsalo solo si el usuario está en modo audio.',
    parameters: z.object({
      text: z.string().min(1).max(2000),
      voice: z.string().default('es-MX-female'),
    }),
    execute: async ({ text, voice }) => {
      const result = await gateway.invoke('voice.synthesize', {
        text, voice, user_id: ctx.userId,
      }, { correlationId: ctx.correlationId });
      return result.result; // { audio_url } o { job_id } si async
    },
  }),
});
```

> **Verificación Sprint 0:** los nombres exactos de skill (`brain.query`, `memory.semantic.search`, `crisis.handle`, `voice.synthesize`, `coach.respond`) deben confirmarse vía `capability_search` y `skill_describe`. Ajustar este archivo si el catálogo real difiere.

---

## 4.7 El endpoint del Coach

```typescript
// src/routes/coach/chat.ts
import { Hono } from 'hono';
import { streamText } from 'ai';
import { stream as honoStream } from 'hono/streaming';
import { gatewayModel } from '@/lib/coach/gateway-model';
import { COACH_SYSTEM_PROMPT } from '@/lib/coach/prompts';
import { COACH_TOOLS } from '@/lib/coach/tools';
import { authenticateUser } from '@/lib/auth/middleware';
import { ensureQuota } from '@/lib/monetization/premium-gate';
import { gateway } from '@/lib/gateway/client';

export const coach = new Hono();

coach.post('/chat', async (c) => {
  const user = await authenticateUser(c);
  const correlationId = c.get('correlationId');
  const { session_id, message } = await c.req.json();

  // 1. Premium-gate (compensación GAP G1)
  await ensureQuota(user.id, 'skill.invoke', 'coach.respond');

  // 2. Recall del historial conversation
  const recall = await gateway.invoke('memory.conversation.recall', {
    user_id: user.id, session_id,
  }, { correlationId });
  const history = (recall.result as any).messages ?? [];

  // 3. Streaming SSE
  c.header('Content-Type', 'text/event-stream');
  return honoStream(c, async (s) => {
    const result = await streamText({
      model: gatewayModel({ skill: 'coach.respond' }),
      system: COACH_SYSTEM_PROMPT,
      messages: [...history, { role: 'user', content: message }],
      tools: COACH_TOOLS({ userId: user.id, sessionId: session_id, correlationId }),
      maxSteps: 8,
      headers: { 'x-correlation-id': correlationId },
    });

    for await (const part of result.fullStream) {
      await s.writeSSE({ event: part.type, data: JSON.stringify(part) });
    }

    // 4. Append del turno completo a memoria conversation
    const finalText = await result.text;
    await gateway.invoke('memory.conversation.append', {
      user_id: user.id,
      session_id,
      messages: [
        { role: 'user', content: message },
        { role: 'assistant', content: finalText },
      ],
    }, { correlationId });
  });
});
```

> **Streaming desde el cliente RN:** la app consume el SSE con `react-native-sse` o `EventSource` polyfill. Cada `event:text-delta` actualiza la UI; cada `event:tool-call` puede mostrar un indicador "el coach está consultando…".

---

## 4.8 Memoria del Coach — 3 superficies

Resumen (ver §4.9 del contrato para los detalles del endpoint):

| Superficie | Cuándo se usa | Skill / Acción |
|---|---|---|
| **conversation** | Buffer turno-a-turno por `session_id`. `recall` al iniciar, `append` después de cada turno completo, `clear` al cerrar sesión o crear una nueva. | `memory.conversation.{recall, append, clear}` |
| **episodic** | Episodios resumidos del usuario (medio plazo). Consolidación gestionada server-side por el Gateway. El BFF lee a través de skills derivadas (consultar `describe` por `memory.episodic.*` en Sprint 0). | `memory.episodic.*` |
| **semantic** | Hechos persistentes del usuario (largo plazo). `search` cuando el modelo necesita contexto, `store` cuando aprende algo nuevo, `forget` para GDPR right-to-erasure. | `memory.semantic.{search, store, forget}` |

---

## 4.9 Premium-gate (compensación GAP G1)

⚠️ El Gateway no expone cost-attribution per-tenant hoy. El BFF aplica gating antes de delegar:

```typescript
// src/lib/monetization/premium-gate.ts
import { db } from '../db/client';
import { MentexError } from '../errors';

const QUOTAS = {
  free:      { 'skill.invoke': 50,   'brain.query': 20,  'voice.synthesize': 5    },
  premium:   { 'skill.invoke': 1000, 'brain.query': 500, 'voice.synthesize': 100  },
  pro_plus:  { 'skill.invoke': 10000,'brain.query': 5000,'voice.synthesize': 1000 },
} as const;

export async function ensureQuota(
  userId: string,
  namespace: keyof (typeof QUOTAS)['free'],
  skill: string,
) {
  const premium = await db
    .from('user_premium')
    .select('plan')
    .eq('user_id', userId)
    .single();

  const plan = (premium.data?.plan ?? 'free') as keyof typeof QUOTAS;
  const limit = QUOTAS[plan][namespace];

  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await db
    .from('usage_quotas')
    .select('count')
    .eq('user_id', userId)
    .eq('namespace', namespace)
    .eq('date', today)
    .single();

  if ((usage?.count ?? 0) >= limit) {
    throw new MentexError({
      code: 'quota_exceeded',
      httpStatus: 402,
      message: `Daily quota reached for ${namespace} (${plan} plan)`,
    });
  }

  await db.rpc('increment_usage_quota', {
    p_user_id: userId, p_namespace: namespace, p_date: today,
  });
}
```

Los límites concretos viven en `config.ts` (sobreescribibles vía env).

---

## 4.10 Mapeo de errores del Gateway al cliente RN

Cuando una tool del loop falla (skill responde `ok:false`), el BFF NO debe exponer el `error.code` raw al usuario. Mapea:

| `error.code` del Gateway | Mensaje al usuario (es) | Acción |
|---|---|---|
| `rate_limited` | "Estamos saturados un momento, intenta de nuevo en unos segundos." | Reintento automático respetando `Retry-After`; si falla 2 veces, mensaje. |
| `budget_exhausted` | "Has alcanzado el límite diario. Mañana podrás seguir." | Mensaje + sugerir premium si plan=free. |
| `invalid_input` | "Algo no me cuadró en la solicitud. ¿Puedes reformularla?" | Log con `request_id`; bug del BFF probable. |
| `worker_timeout` | "Eso me tomó demasiado, intenta de nuevo." | Reintento o sugerir versión más corta. |
| `circuit_open` | "Estoy temporalmente fuera de línea, intenta en un momento." | Backoff exponencial. |
| `quota_exceeded` (BFF-side) | "Has alcanzado tu cuota diaria del plan free." | Sugerir upgrade. |
| Otro | "Algo no salió bien, vuelve a intentarlo." | Log completo con `correlation_id` + `request_id`. |

---

## 4.11 Checklist Coach Sprint A

- [ ] `gatewayModel` provider implementado y testeado con `coach.respond` (o skill equivalente confirmada en Sprint 0).
- [ ] System prompt iterado con Diego (semilla aprobada).
- [ ] 8+ tools registradas (`rag_search`, `memory_recall`, `memory_store`, `ritual_add`, `agenda_schedule_reminder`, `content_recommend`, `crisis_handle`, `voice_speak`).
- [ ] Endpoint `POST /api/coach/chat` con SSE re-emitido.
- [ ] Memoria `conversation` con `recall` + `append` por turno.
- [ ] Premium-gate enforced antes de cada `streamText`.
- [ ] Mapeo de errores → mensajes user-friendly.
- [ ] Logs con `correlation_id` + `userId` redacted.
- [ ] Métricas: turnos por sesión, tool calls por turno, latencia p50/p95, costo estimado per-skill (G1).
- [ ] Test de crisis: input simulado → tool `crisis_handle` invocada → respuesta segura.

---

## 4.12 Lo que NO está en este doc

- Detalles internos del Gateway (cómo decide proveedor, cómo cachea, cómo audita). Opacos por diseño.
- Construcción de skills custom en el Gateway. Si Mentex requiere una skill que no existe, se solicita a Helios — no se construye Mentex-side.
- Mastra (descartado).

---

**Next:** [`05-MONETIZATION.md`](./05-MONETIZATION.md) — RevenueCat ↔ credit ledger Mentex.
