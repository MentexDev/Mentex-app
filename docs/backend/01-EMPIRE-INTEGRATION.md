# 01 · Gateway Integration — el cliente HTTP central

**Prerequisitos:** leíste [`MENTEX_BACKEND_CONTRACT.md`](./MENTEX_BACKEND_CONTRACT.md) y [`00-EMPIRE-OVERVIEW.md`](./00-EMPIRE-OVERVIEW.md).

Este doc cubre **cómo el BFF de Mentex llama al Gateway** en código: el cliente HTTP central, los Zod schemas, el manejo de async/streaming/errores, y el drift watch. Toda llamada al Gateway pasa por este cliente — sin excepciones.

---

## 1.1 Identidad de Mentex frente al Gateway

Una sola identidad: **`mentex`**, header `X-Imperial-Tenant`.

- No hay sub-tenants per-usuario. Todos los usuarios Mentex van bajo el mismo `tenant`.
- La separación entre usuarios vive en el `user_id` del body (cuando aplica al endpoint) y en el Supabase de Mentex (RLS por `auth.uid()`).
- `tenant` NO va como columna en tablas Mentex. Las tablas Mentex solo necesitan `user_id`.

```
┌──────────────────────────────────────────────────────────────────┐
│  GATEWAY IMPERIAL (visión del Gateway)                            │
│                                                                   │
│  Tenant: mentex                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  body.user_id = <uuid-A>   ← request del User A            │
│  │  body.user_id = <uuid-B>   ← request del User B            │
│  │  body.user_id = <uuid-C>   ← request del User C            │
│  │                                                            │   │
│  │  Cada uno aislado por user_id en /v1/memory (y similares). │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 1.2 Cliente HTTP central — diseño

Toda llamada al Gateway pasa por `src/lib/gateway/client.ts`. Single source of truth para:

- Headers obligatorios (§4.2 del contrato).
- Generación + propagación de `correlation_id`.
- Patrón sync/async (`202` + poll).
- Streaming SSE.
- Rate-limit awareness por-namespace.
- Parser tipado del envelope (incluido el error envelope §4.8).
- Retry/backoff respetando `Retry-After`.
- Timeouts (§7.7 del contrato).

### 1.2.1 Esqueleto del cliente

```typescript
// src/lib/gateway/client.ts
import { z } from 'zod';
import type { ErrorEnvelope, InvokeResult } from './generated';
import { logger } from '../logger';

const GATEWAY_URL = process.env.IMPERIAL_GATEWAY_URL!;
const API_KEY     = process.env.IMPERIAL_API_KEY!;
const TENANT      = 'mentex';

export type InvokeOptions = {
  correlationId: string;
  idempotencyKey?: string;
  timeoutMs?: number;            // default 30_000, max 60_000
  signal?: AbortSignal;
};

export class GatewayError extends Error {
  constructor(public envelope: ErrorEnvelope['error']) {
    super(`[${envelope.code}] ${envelope.message}`);
    this.name = 'GatewayError';
  }
}

export class GatewayClient {
  async invoke<T = unknown>(
    job_type: string,
    payload: unknown,
    opts: InvokeOptions,
  ): Promise<InvokeResult<T>> {
    const res = await this.post('/v1/skill/invoke', {
      job_type,
      payload,
      context: {
        correlation_id: opts.correlationId,
        idempotency_key: opts.idempotencyKey,
        timeout_ms: Math.min(opts.timeoutMs ?? 30_000, 60_000),
      },
    }, opts);

    if (res.status === 202) {
      const { job_id } = await res.json();
      return await this.pollJob<T>(job_id, opts);
    }

    return this.parseEnvelope<T>(res);
  }

  async stream(
    job_type: string,
    payload: unknown,
    opts: InvokeOptions,
  ): AsyncGenerator<{ event: string; data: unknown }> {
    const res = await this.post('/v1/skill/stream', {
      job_type,
      payload,
      context: { correlation_id: opts.correlationId },
    }, opts);

    if (!res.ok || !res.body) {
      throw new GatewayError(await this.errorFrom(res));
    }
    yield* this.parseSse(res.body);
  }

  async pollJob<T>(jobId: string, opts: InvokeOptions): Promise<InvokeResult<T>> {
    let backoff = 1000;
    const ceiling = Date.now() + 90_000;  // BFF-side cap 90s
    while (Date.now() < ceiling) {
      await sleep(backoff);
      const res = await this.get(`/v1/skill/job/${jobId}/status`, opts);
      const body = await this.parseEnvelope<T & { status: string }>(res);
      if (body.result.status === 'completed') return body;
      if (body.result.status === 'failed') {
        throw new GatewayError(body.result as any);
      }
      backoff = Math.min(backoff + 1000, 10_000); // 1s,2s,3s,...,10s
    }
    throw new GatewayError({
      code: 'bff_poll_timeout',
      message: `Poll exceeded 90s for job ${jobId}`,
      retryable: false,
      request_id: '',
      correlation_id: opts.correlationId,
    });
  }

  // ... headers builder, post, get, parseEnvelope, parseSse, namespace queue,
  //     Retry-After honor, drift-watch hooks, metrics emit.
}

export const gateway = new GatewayClient();
```

> Este es el **esqueleto canónico**. La implementación completa va en Sprint A. El esqueleto define la interfaz pública que el resto del BFF consume — cualquier feature que llame al Gateway llama a `gateway.invoke(...)` o `gateway.stream(...)`, nada más.

### 1.2.2 Headers builder

```typescript
private buildHeaders(opts: InvokeOptions): Headers {
  const h = new Headers({
    'X-Imperial-Key': API_KEY,
    'X-Imperial-Tenant': TENANT,
    'X-Correlation-Id': opts.correlationId,
    'Content-Type': 'application/json',
  });
  if (opts.idempotencyKey) h.set('Idempotency-Key', opts.idempotencyKey);
  return h;
}
```

### 1.2.3 Parser del envelope

```typescript
// Schemas con Zod (generados o autorados manualmente)
const ErrorBody = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    hint: z.string().optional(),
    retryable: z.boolean(),
    retry_after_ms: z.number().int().nonnegative().optional(),
    request_id: z.string(),
    correlation_id: z.string(),
  }),
});

const SuccessBody = z.object({
  ok: z.literal(true),
  result: z.unknown(),
  request_id: z.string(),
  correlation_id: z.string(),
});

async parseEnvelope<T>(res: Response): Promise<InvokeResult<T>> {
  const json = await res.json();

  if (!res.ok) {
    const parsed = ErrorBody.safeParse(json);
    if (!parsed.success) {
      throw new GatewayError({
        code: 'bff_envelope_parse_failed',
        message: 'Gateway returned non-conforming error envelope',
        retryable: false,
        request_id: '',
        correlation_id: '',
      });
    }
    throw new GatewayError(parsed.data.error);
  }

  const parsed = SuccessBody.safeParse(json);
  if (!parsed.success) {
    throw new GatewayError({
      code: 'bff_envelope_parse_failed',
      message: 'Gateway returned non-conforming success envelope',
      retryable: false,
      request_id: '',
      correlation_id: '',
    });
  }
  return parsed.data as InvokeResult<T>;
}
```

### 1.2.4 Manejo de `429` + `Retry-After`

```typescript
private async post(path: string, body: unknown, opts: InvokeOptions): Promise<Response> {
  const namespace = path.split('/')[2] ?? 'unknown'; // skill / brain / memory / orchestration
  return this.queueByNamespace(namespace, async () => {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30_000);
    try {
      const res = await fetch(`${GATEWAY_URL}${path}`, {
        method: 'POST',
        headers: this.buildHeaders(opts),
        body: JSON.stringify(body),
        signal: opts.signal ?? ctrl.signal,
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') ?? '5', 10);
        logger.warn({
          event: 'gateway.rate_limited',
          namespace,
          retry_after_s: retryAfter,
          correlation_id: opts.correlationId,
        });
        await sleep(retryAfter * 1000);
        return this.post(path, body, opts); // retry once after wait
      }

      return res;
    } finally {
      clearTimeout(timeout);
    }
  });
}
```

### 1.2.5 Streaming SSE

```typescript
private async *parseSse(stream: ReadableStream<Uint8Array>): AsyncGenerator<{ event: string; data: unknown }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      if (!frame.trim()) continue;
      const lines = frame.split('\n');
      let event = 'message';
      let data: unknown = null;
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) {
          try { data = JSON.parse(line.slice(5).trim()); }
          catch { data = line.slice(5).trim(); }
        }
      }
      yield { event, data };
    }
  }
}
```

---

## 1.3 Zod schemas por skill (frontera Mentex-side)

⚠️ GAP G4: `input_schema` de `/v1/skill/describe` es **advisory**, no JSON Schema estricto garantizado. Por eso el BFF mantiene **sus propios Zod schemas por skill** que se usan antes de invocar.

```typescript
// src/lib/gateway/schemas/coach.ts
import { z } from 'zod';

export const CoachRespondInput = z.object({
  user_id: z.string().uuid(),
  session_id: z.string().uuid(),
  message: z.string().min(1).max(4000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(50),
  context: z.object({
    ritual_summary: z.string().optional(),
    streak: z.number().int().nonnegative().optional(),
  }).optional(),
});

export type CoachRespondInput = z.infer<typeof CoachRespondInput>;

export const CoachRespondOutput = z.object({
  reply: z.string(),
  suggested_actions: z.array(z.object({
    label: z.string(),
    action: z.enum(['add_to_ritual', 'schedule_reminder', 'play_content']),
    payload: z.unknown(),
  })).optional(),
});
```

Uso en una route:

```typescript
// src/routes/coach/chat.ts
import { Hono } from 'hono';
import { gateway } from '@/lib/gateway/client';
import { CoachRespondInput, CoachRespondOutput } from '@/lib/gateway/schemas/coach';

export const coach = new Hono();

coach.post('/chat', async (c) => {
  const user = await authenticateUser(c);
  const correlationId = c.req.header('x-correlation-id') ?? crypto.randomUUID();

  const body = CoachRespondInput.parse(await c.req.json());

  // Pre-flight: premium gate (compensación GAP G1)
  await ensureQuota(user.id, 'skill.invoke', 'coach.respond');

  const result = await gateway.invoke(
    'coach.respond',
    body,
    { correlationId },
  );

  const parsed = CoachRespondOutput.parse(result.result);
  return c.json(parsed);
});
```

---

## 1.4 Generación de tipos desde `/v1/openapi.json`

```bash
# package.json script
"scripts": {
  "gateway:types": "openapi-typescript $IMPERIAL_GATEWAY_URL/v1/openapi.json -o src/lib/gateway/generated.ts",
  "gateway:types:ci": "npm run gateway:types && git diff --exit-code src/lib/gateway/generated.ts || (echo 'Gateway types drifted; regen and commit' && exit 1)"
}
```

- Local: `npm run gateway:types` cuando cambia el contrato.
- CI: `npm run gateway:types:ci` falla si el archivo cambia y no fue committeado (señal de drift).

> Solo se generan tipos del envelope + endpoints declarados en OpenAPI. Para schemas advisory (`describe`), se usan los Zod manuales (§1.3).

---

## 1.5 Propagación de `correlation_id` end-to-end

Regla: el `correlation_id` viaja desde el cliente RN hasta el Gateway y vuelve.

```
[App RN] X-Correlation-Id: c0r4u1d-... (genera UUID al iniciar sesión + por request crítica)
                              │
                              ▼
[BFF middleware] honra header o genera UUID si falta
                              │
                              ▼
[gateway.invoke({correlationId})] → header X-Correlation-Id + body.context.correlation_id
                              │
                              ▼
[Gateway] echo en envelope.correlation_id + logs internos
                              │
                              ▼
[BFF logs] pino .info({ correlation_id, event, ... })
[BFF response] X-Correlation-Id devuelto en headers para debug
```

```typescript
// src/middleware/correlation.ts
import { MiddlewareHandler } from 'hono';

export const correlation: MiddlewareHandler = async (c, next) => {
  const id = c.req.header('x-correlation-id') ?? crypto.randomUUID();
  c.set('correlationId', id);
  c.res.headers.set('x-correlation-id', id);
  await next();
};
```

---

## 1.6 Drift watch — health check del Gateway

⚠️ GAP G5: no hay endpoint de changelog watchable. El BFF lo simula:

```typescript
// src/routes/health/gateway.ts
import { Hono } from 'hono';
import { gateway } from '@/lib/gateway/client';
import baseline from '../../../tests/contract/baseline.json' assert { type: 'json' };

export const gatewayHealth = new Hono();

gatewayHealth.get('/health/gateway', async (c) => {
  const correlationId = c.get('correlationId');

  const [openapi, mesh] = await Promise.all([
    fetch(`${process.env.IMPERIAL_GATEWAY_URL}/v1/openapi.json`).then(r => r.json()),
    fetch(`${process.env.IMPERIAL_GATEWAY_URL}/v1/mesh`).then(r => r.json()),
  ]);

  const versionNow = openapi.info?.version ?? 'unknown';
  const meshFingerprints = mesh.fingerprints ?? {};

  const result = {
    gateway_url: process.env.IMPERIAL_GATEWAY_URL,
    info_version: versionNow,
    info_version_baseline: baseline.info_version,
    drift_version: versionNow !== baseline.info_version,
    mesh_fingerprints: meshFingerprints,
    mesh_baseline: baseline.mesh_fingerprints,
    drift_mesh: Object.keys(baseline.mesh_fingerprints).some(
      (k) => meshFingerprints[k] !== baseline.mesh_fingerprints[k],
    ),
  };

  if (result.drift_version || result.drift_mesh) {
    // semver-aware: minor/patch → WARN; major → ALERT a Diego + Helios
    logger.warn({ event: 'gateway.drift_detected', ...result, correlation_id: correlationId });
  }

  return c.json(result, result.drift_version || result.drift_mesh ? 207 : 200);
});
```

`baseline.json` se actualiza manualmente con cada PR que adopta una nueva versión.

---

## 1.7 Variables de entorno para el cliente Gateway

```typescript
// src/lib/config.ts
import { z } from 'zod';

const Env = z.object({
  IMPERIAL_API_KEY: z.string().min(1, 'IMPERIAL_API_KEY required'),
  IMPERIAL_GATEWAY_URL: z.string().url().default('https://gateway.empire-os.co'),
  NODE_ENV: z.enum(['development', 'staging', 'production']),
});

export const env = Env.parse(process.env);

if (env.NODE_ENV === 'production' && env.IMPERIAL_GATEWAY_URL.includes('localhost')) {
  throw new Error('Refusing to start in prod with localhost Gateway URL');
}
```

---

## 1.8 Metrics + observability del cliente Gateway

Emite a Prometheus / Sentry / similar:

| Métrica | Tipo | Tags |
|---|---|---|
| `gateway_requests_total` | counter | `namespace`, `job_type`, `status_code` |
| `gateway_request_duration_seconds` | histogram | `namespace`, `job_type` |
| `gateway_rate_limit_hits_total` | counter | `namespace` |
| `gateway_async_polls_total` | counter | `job_type` |
| `gateway_envelope_parse_errors_total` | counter | `endpoint` |
| `gateway_drift_detected` | gauge | `version_now`, `version_baseline` |

Alertas críticas:
- `gateway_envelope_parse_errors_total` > 0 en 5 min → page (drift posible o bug en parser).
- `gateway_rate_limit_hits_total{namespace='skill'}` ascendente sostenido → revisar quotas.
- `gateway_drift_detected` major-version change → page Diego + Helios.

---

## 1.9 Patrones que el cliente impone

| Tema | Regla |
|---|---|
| Llamadas ad-hoc al Gateway | **Prohibidas**. Toda llamada pasa por `gateway.invoke` / `gateway.stream`. |
| Reusar `fetch` directo | **Prohibido**. El cliente central tiene los headers, retry, timeout. |
| Variar el header `X-Imperial-Tenant` | **Prohibido**. Siempre `mentex`. |
| Loguear `IMPERIAL_API_KEY` parcial o total | **Prohibido**. Redacción obligatoria en pino config. |
| Catch silencioso de `GatewayError` | **Prohibido**. Siempre log + propagación (o mapping explícito al cliente RN). |
| Asumir shape de `result` sin Zod | **Prohibido**. Zod parse en cada salida del Gateway. |
| Llamar `gateway.invoke` desde el cliente RN | **Imposible** — no tiene la key. La app SIEMPRE habla con el BFF. |

---

## 1.10 Checklist Sprint 0 / Sprint A — al final de la integración con el Gateway deberías tener

- [ ] `src/lib/gateway/client.ts` con `invoke`, `stream`, `pollJob`, headers, parser tipado.
- [ ] `src/lib/gateway/generated.ts` regenerado desde `/v1/openapi.json`.
- [ ] `src/lib/gateway/schemas/*.ts` con Zod por cada skill que el BFF invoca.
- [ ] Middleware `correlation` activo en todas las routes.
- [ ] Health-check `/health/gateway` con drift watch.
- [ ] `baseline.json` committeado en `tests/contract/`.
- [ ] Métricas emitidas por namespace.
- [ ] Pino con redaction config (`IMPERIAL_API_KEY` nunca en log).
- [ ] **Los 8 contract tests del §8 del contrato pasan en CI contra Gateway real.**

---

**Next:** [`02-DATA-MODEL.md`](./02-DATA-MODEL.md) — todas las tablas Mentex en Supabase propio.
