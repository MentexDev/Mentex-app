# 08 · Deployment + Observabilidad + Privacy

## Parte 1 — Deployment

### 8.1 Backend BFF (hosting + Supabase)

**Repo backend**: `mentex-bff` (greenfield Mentex propio). NO vive en el repo del Imperio.

**Hosting** (decisión Mentex-side — opciones equivalentes):
- **Vercel** (Next.js App Router): Production `main` branch → `https://api.mentex.app`. Region `iad1` o `gru1` según geografía de usuarios.
- **Fly.io** (Hono / Node estándar): regiones globales, deploy con `flyctl deploy`.
- **Render / Railway**: alternativas válidas, sin diferencia material.

**Env vars** (production — vault del hosting):

```
# Gateway Imperial (Conexión B)
IMPERIAL_API_KEY                     # NEVER expose; vault root-only
IMPERIAL_GATEWAY_URL=https://gateway.empire-os.co

# Supabase Mentex (cuenta propia)
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY            # NEVER expose

# RevenueCat (cuenta Mentex propia)
REVENUECAT_SECRET_KEY
REVENUECAT_WEBHOOK_SECRET

# Expo Push (cuenta Mentex propia)
EXPO_ACCESS_TOKEN

# Cloudflare R2 (cuenta Mentex / bucket dedicado)
R2_ACCOUNT_ID
R2_BUCKET_MENTEX
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY

# OAuth providers (cuentas Mentex)
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
# ... más OAuth según las integraciones soportadas

# Sentry
SENTRY_DSN

# Token encryption (pgcrypto en Supabase)
OAUTH_ENCRYPTION_KEY
```

**Deploy** (CI/CD Mentex-side):
```bash
# GitHub Actions o equivalente
git push origin main → trigger CI →
  1. Run lint + type check + tests
  2. npm run gateway:types:ci   # falla si /v1/openapi.json drifted
  3. Run contract test rig (§8 del contrato)  ← bloqueante
  4. Deploy: vercel deploy --prod / fly deploy
  5. Run Supabase migrations: supabase db push
  6. Smoke test post-deploy contra /health + /health/gateway
```

### 8.2 Supabase migrations

**Estructura** (Supabase project Mentex):
```
mentex-bff/
├── supabase/
│   ├── migrations/
│   │   ├── 0001_create_mentex_schema.sql
│   │   ├── 0002_users_tables.sql
│   │   ├── 0003_ritual_tables.sql
│   │   ├── 0004_agenda_tables.sql
│   │   ├── 0005_content_tables.sql
│   │   ├── 0006_subscription_tables.sql
│   │   ├── 0007_notifications_tables.sql
│   │   ├── 0008_coach_conversations.sql
│   │   ├── 0009_token_encryption.sql
│   │   ├── 0010_helper_functions.sql
│   │   └── 0011_seeds.sql
│   └── seed.sql
```

**Workflow**:
```bash
# Crear nueva migration
supabase migration new add_<feature>

# Probar local
supabase db reset

# Push a production (CON BACKUP previo)
supabase db dump --db-url $PROD_DB_URL > backup-$(date +%Y%m%d).sql
supabase migration up --db-url $PROD_DB_URL --linked
```

**Rollback strategy**:
- Migrations son forward-only (NUNCA edites una mergeada).
- Para rollback: crear migration nueva que revierta.
- Si es crítico: restore from backup (operación con aprobación de Diego).

### 8.3 Frontend Expo (EAS Build + Submit)

**EAS Build profiles** (`eas.json`):

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production",
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "founder@mentex.app",
        "ascAppId": "...",
        "appleTeamId": "..."
      },
      "android": {
        "serviceAccountKeyPath": "./play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

**Build production**:
```bash
eas build --platform all --profile production
# Esperar build (~20-30 min)
eas submit --platform all --profile production
```

**OTA updates** (sin App Store review para fixes JS):
```bash
eas update --branch production --message "Fix toast bug"
# Users reciben el update al siguiente app launch
```

⚠️ OTA NO funciona para cambios nativos (nuevo módulo). Esos requieren rebuild.

### 8.4 Custom domain + Cloudflare DNS

**DNS records** (via MCP `cf_dns`):

```
mentex.app          A     76.76.21.21       (Vercel)
mentex.app          AAAA  2606:...           (Vercel)
api.mentex.app      CNAME aether.vercel.app
www.mentex.app      CNAME mentex.app
```

**Vercel domains config**:
- Add domain `api.mentex.app` en Vercel project settings
- Vercel auto-genera cert (Let's Encrypt)
- Cloudflare: SSL/TLS mode = "Full (strict)"

### 8.5 Backup strategy

| Datos | Backup | Retención | Recovery target |
|-------|--------|-----------|-----------------|
| Supabase Postgres | Daily snapshot + WAL streaming | 30 días | RTO < 4h |
| R2 storage | Versioning enabled + Cross-region replicate (R2 future) | indefinido | RTO < 1h |
| User-uploaded (avatars, journal voice) | Supabase Storage + lifecycle policy | hasta delete request | RTO < 24h |
| Logs | Sentry retención 90 días | 90d (sentry) | n/a |

**Quarterly restore drill**:
1. Crear DB staging desde snapshot del día anterior
2. Verificar integridad: row counts vs production
3. Test query críticos (auth flow, ritual add, push send)
4. Documentar RTO real medido
5. Si RTO > 4h: tarea P0 mejorar backup tooling

---

## Parte 2 — Observabilidad

### 8.6 Logging

**Logger del BFF** (`pino` con redaction):

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'email', 'user.email', '*.email',
      'full_name', '*.full_name', '*.fullName',
      'phone', '*.phone',
      'token', 'jwt', 'password', 'access_token', 'refresh_token',
      'apple_identity_token', 'google_id_token',
      'authorization', '*.authorization',
      'raw_event.subscriber.original_purchase_date',  // PII parcial
      'card.*', '*.card',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    level(label) { return { level: label }; },
  },
  base: {
    service: 'mentex',
    version: process.env.APP_VERSION || 'dev',
    env: process.env.NODE_ENV,
  },
});
```

**Cada log incluye**:
- `requestId` (generado en middleware)
- `userId` (si auth)
- `correlation_id` (propagado al/desde el Gateway)
- `event` (snake_case del evento de negocio)
- `level`

**Eventos canónicos a loggear** (Mentex):

```typescript
// Negocio
logger.info({ event: 'user.signup', userId, source: 'apple' });
logger.info({ event: 'ritual.item.added', userId, itemId, contentId });
logger.info({ event: 'ritual.session.started', userId, sessionId, duration_min });
logger.info({ event: 'ritual.session.completed', userId, sessionId, elapsed_seconds });
logger.info({ event: 'subscription.purchased', userId, plan, price, period });
logger.info({ event: 'coach.message.sent', userId, conversationId, tokens, cost_usd_micro });

// Warns
logger.warn({ event: 'quota.exceeded', userId, metric, used, limit });
logger.warn({ event: 'push.token.invalid', userId, token: '[redacted]' });
logger.warn({ event: 'auth.invalid_jwt', correlation_id });

// Errors
logger.error({ event: 'webhook.revenuecat.error', err, event_id });
logger.error({ event: 'integration.sync.failed', userId, provider, err });
```

### 8.7 Sentry (errors + performance)

**Setup backend**:

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  tracesSampleRate: 0.1,                   // 10% traces in prod
  profilesSampleRate: 0.1,
  beforeSend(event) {
    // PII redaction extra
    if (event.user?.email) event.user.email = '[REDACTED]';
    if (event.extra?.body?.email) event.extra.body.email = '[REDACTED]';
    return event;
  },
  ignoreErrors: [
    'UserCancelled',                       // Apple Sign In cancel
    'PurchasesCancelled',                  // RC cancel
  ],
});
```

**Setup frontend (Expo)**:

```typescript
// frontend: lib/sentry.ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableInExpoDevelopment: false,
  debug: __DEV__,
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation: Sentry.reactNavigationInstrumentation,
    }),
  ],
  beforeSend(event) {
    // En crash, agregar tab actual + user_plan
    event.contexts = {
      ...event.contexts,
      app: { current_tab: getCurrentTab(), plan: getUserPlan() },
    };
    return event;
  },
});

export function captureException(err: unknown, context?: Record<string, any>) {
  Sentry.captureException(err, { extra: context });
}
```

### 8.8 Métricas custom (Mentex-side)

Mentex emite métricas a su stack de observabilidad (Sentry + Prometheus / OpenTelemetry exporter). El Gateway no expone cost-attribution per-tenant hoy (GAP G1) — el BFF cuenta y estima localmente.

```typescript
// lib/metrics.ts (esquema)
import { Counter, Histogram } from 'prom-client'; // o equivalente

export const gatewayRequests = new Counter({
  name: 'gateway_requests_total',
  help: 'Total requests to the Imperial Gateway',
  labelNames: ['namespace', 'job_type', 'status_code'],
});

export const gatewayLatency = new Histogram({
  name: 'gateway_request_duration_seconds',
  help: 'Gateway request latency by namespace',
  labelNames: ['namespace', 'job_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});

export const skillInvocations = new Counter({
  name: 'mentex_skill_invocations_total',
  help: 'Skill invocations by user plan + skill',
  labelNames: ['plan', 'skill', 'outcome'],
});

export const quotaExceeded = new Counter({
  name: 'mentex_quota_exceeded_total',
  help: 'Times users hit their daily quota',
  labelNames: ['plan', 'namespace'],
});
```

**Tracking de uso estimado de costo (G1 compensación):**

```typescript
// lib/observability/cost-estimator.ts
// Estimación local: tokens_estimados × precio_modelo (de tabla mantenida Mentex-side)
export async function recordEstimatedCost(opts: {
  userId: string;
  skill: string;
  tokens_input?: number;
  tokens_output?: number;
  correlation_id: string;
}) {
  const estimated_usd_micro = estimate(opts.tokens_input, opts.tokens_output, opts.skill);
  await db.from('cost_events').insert({
    user_id: opts.userId,
    skill: opts.skill,
    tokens_input: opts.tokens_input,
    tokens_output: opts.tokens_output,
    estimated_usd_micro,
    correlation_id: opts.correlation_id,
  });
}
```

**Queries útiles (Supabase Mentex):**
```sql
-- Cost breakdown estimado último mes
SELECT skill, SUM(estimated_usd_micro)/1e6 AS usd, COUNT(*) AS events
FROM mentex.cost_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY skill
ORDER BY usd DESC;

-- Top heavy users
SELECT user_id, SUM(estimated_usd_micro)/1e6 AS spent_usd
FROM mentex.cost_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY spent_usd DESC
LIMIT 20;
```

### 8.9 Alertas (on-call)

Configuración via Sentry Alerts + Prometheus AlertManager + UptimeRobot/Better Uptime (uno de los tres, no todos):

```
[Health monitor — externo]
  ↓
[Health endpoints del BFF]
  - GET /api/health/live       → DB + memory + uptime
  - GET /api/health/gateway    → /v1/openapi.json reachable + drift watch
  ↓
[Check anomalies]
  - revenue drop > 30% día/día (alerta a Diego)
  - cost spike > 2x avg daily
  - error rate > 5% requests sustained 5min
  - p95 latency > 3s sustained 5min
  - gateway_drift_detected en major version (alerta a Helios)
  ↓
[Si anomaly → notificación on-call (Telegram / PagerDuty / email)]
```

---

## Parte 3 — Privacy & Compliance

### 8.11 PII catalog (declaración formal)

**Tabla a mantener actualizada**:

| Campo | Tabla | PII level | Retención | Notes |
|-------|-------|-----------|-----------|-------|
| email | `auth.users` | High | Hasta delete request | NUNCA log directo |
| full_name | `user_profiles` | High | Hasta delete request | Redactado en logs |
| device tokens | `mentex.device_tokens` | Medium | hasta invalidación | No exponer entre users |
| OAuth tokens | `mentex.integrations` | High | encrypted at rest | pgcrypto |
| coach messages | `mentex.coach_messages` | Very High | hasta delete (con disclaimer) | privacy.memory_enabled toggle |
| audio recordings (voice journal future) | Supabase Storage | Very High | hasta delete | Encryption at rest |
| location | NO recolectamos | n/a | n/a | nunca |
| health data (Apple Health) | NO almacenamos | n/a | n/a | leemos in-memory, no persist |

### 8.12 GDPR / Privacy Manifest

**Privacy Manifest iOS** (xcprivacy file):

```xml
<key>NSPrivacyTracking</key>
<false/>
<key>NSPrivacyCollectedDataTypes</key>
<array>
  <dict>
    <key>NSPrivacyCollectedDataType</key>
    <string>NSPrivacyCollectedDataTypeEmailAddress</string>
    <key>NSPrivacyCollectedDataTypeLinked</key>
    <true/>
    <key>NSPrivacyCollectedDataTypeTracking</key>
    <false/>
    <key>NSPrivacyCollectedDataTypePurposes</key>
    <array>
      <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
    </array>
  </dict>
  <dict>
    <key>NSPrivacyCollectedDataType</key>
    <string>NSPrivacyCollectedDataTypeName</string>
    <key>NSPrivacyCollectedDataTypeLinked</key>
    <true/>
    <key>NSPrivacyCollectedDataTypeTracking</key>
    <false/>
    <key>NSPrivacyCollectedDataTypePurposes</key>
    <array>
      <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
    </array>
  </dict>
  <!-- ... continue para device id, usage data, etc. -->
</array>
```

### 8.13 Data Processing Agreement (DPA)

Para users europeos (GDPR Art. 28):
- **Supabase**: tiene DPA estándar — sign it en Supabase dashboard
- **RevenueCat**: DPA disponible — sign on contract signing
- **Cloudflare**: DPA en account settings
- **OpenAI/Anthropic/Google AI**: DPAs disponibles, sign en account settings
- **Sentry**: DPA en account settings

Lista en `docs/legal/dpa-checklist.md` (crear tras Sprint A).

### 8.14 Right to Access (GDPR Art. 15)

Endpoint para que user descargue sus datos:

```typescript
// app/api/mentex/user/export/route.ts
export async function GET(req: NextRequest) {
  const authResult = await authenticateMentexRequest(req);
  if ('status' in authResult) return authResult;
  const { user } = authResult;

  // Generar export (puede tomar 10+ segundos para users con mucha data)
  const exportData = {
    profile: await fetchUserProfile(user.userId),
    settings: await fetchUserSettings(user.userId),
    ritual_items: await fetchRitualItems(user.userId),
    agenda_events: await fetchAgendaEvents(user.userId),
    reminders: await fetchReminders(user.userId),
    coach_conversations: await fetchCoachConversations(user.userId),
    coach_messages: await fetchCoachMessages(user.userId),       // omitir si privacy.memory_enabled = false
    integrations: await fetchIntegrations(user.userId, { tokensRedacted: true }),
    subscriptions: await fetchSubscriptions(user.userId),
    content_history: await fetchContentHistory(user.userId),
    created_at: user.createdAt,
    exported_at: new Date().toISOString(),
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="mentex-export-${user.userId}-${Date.now()}.json"`,
    },
  });
}
```

Frontend: botón en Settings → "Exportar mis datos".

### 8.15 Cookies + tracking

Mentex mobile NO usa cookies (no aplica). Pero:
- **No analytics third-party** (no Google Analytics, no Mixpanel) — toda telemetría es Mentex-side (Sentry + Prometheus / equivalente).
- **No advertising SDK** — App Store privacy nutrition label dice "No third-party data".
- **Crash reports** = sí (Sentry), declarado y user puede opt-out en Settings.

### 8.16 Children policy (COPPA / España)

Mentex es 13+ (igual que App Store min age para apps no específicas niños).

- **No** recolectamos data específica de niños.
- **Age gate**: al onboarding preguntamos fecha de nacimiento. Si <13 → bloqueo con mensaje.
- **NUNCA** procesamos imágenes/audio de menores.

```typescript
// frontend: screens/onboarding/AgeGate.tsx
if (computedAge < 13) {
  // Bloquear signup
  await supabase.auth.signOut();
  Alert.alert('Edad mínima', 'Mentex está disponible para usuarios de 13 años en adelante.');
}
```

---

**Siguiente**: [`09-MIGRATION-PLAN.md`](./09-MIGRATION-PLAN.md) — sprint plan ejecutable.
