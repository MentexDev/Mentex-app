# 03 · Auth y Tenancy

**Audiencia**: programador backend. Prerequisitos: `MENTEX_BACKEND_CONTRACT.md`, docs 00-02.

---

## 3.1 Stack de auth

- **Provider**: Supabase Auth (proyecto Supabase propio de Mentex — `mentex-prod` / `mentex-staging`).
- **Mecanismos en Mentex**:
  - **Sign in with Apple** (obligatorio en iOS por App Store guidelines si hay otro social).
  - **Sign in with Google** (opcional, vía Supabase native OAuth).
  - **Email/Password** (fallback web/test).
  - **NO usar Email Magic Link**: friction alta en mobile.
- **Session**: JWT firmado por Supabase (HS256). Refresh tokens guardados por el SDK Expo en `expo-secure-store`.
- **Custom claims**: inyectamos `plan` y opcionalmente `user_role` en `raw_app_meta_data`. Las RLS leen `user_id = auth.uid()`; el `plan` lo lee el premium-gate del BFF.
- **Aislamiento entre usuarios**: por `user_id = auth.uid()` en RLS. **NO hay `tenant_id` en las tablas** (Mentex tiene su propio Supabase project — ver doc 02).

## 3.2 Setup Supabase Auth (one-time, admin Mentex)

```bash
# En Supabase Studio → Authentication → Providers
1. Apple: enable, configurar Service ID + private key (Apple Developer)
2. Google: enable, OAuth Client ID + Secret (Google Cloud Console)
3. Email: enable, disable email confirmations para mobile (los users no quieren clickear link)
```

**Redirect URLs en el provider config**:
- `mentex://auth/callback` (deep link en Expo)
- `https://api.mentex.app/auth/callback` (web fallback)
- `https://*.expo.dev/auth/callback` (dev tunnel)

## 3.3 Frontend Expo — flujo Apple Sign In

```typescript
// frontend: hooks/useAppleSignIn.ts (Expo)
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';

export async function signInWithApple() {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('No identityToken from Apple');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      // Marca el signup como Mentex (crítico para el trigger)
      options: { data: { app_source: 'mentex' } },
    });

    if (error) throw error;
    return data.session;
  } catch (err: any) {
    if (err.code === 'ERR_REQUEST_CANCELED') return null;
    throw err;
  }
}
```

**Sign out**:
```typescript
export async function signOut() {
  await supabase.auth.signOut();
  // Limpiar AsyncStorage local
  await AsyncStorage.multiRemove([
    'mentex:ritual-items',
    'mentex:onboarding-state',
    // etc.
  ]);
}
```

## 3.4 Middleware backend — autenticar request

Ya cubierto en doc 01. Versión completa:

```typescript
// lib/mentex/auth/middleware.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export interface MentexUserContext {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  plan: 'free' | 'premium' | 'pro_plus';
  jwt: string;
  correlationId: string;
}

export async function authenticateMentexRequest(
  req: NextRequest
): Promise<{ user: MentexUserContext; supabase: ReturnType<typeof createClient> } | NextResponse> {
  const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();
  const authHeader = req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing Authorization', correlation_id: correlationId },
      { status: 401, headers: { 'x-correlation-id': correlationId } }
    );
  }

  const jwt = authHeader.slice(7);

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    logger.warn({ correlationId, error: error?.message }, 'auth.invalid_jwt');
    return NextResponse.json({ error: 'Invalid JWT', correlation_id: correlationId }, { status: 401 });
  }

  const claims = user.app_metadata as {
    user_role?: string;
    plan?: string;
  };

  return {
    user: {
      userId: user.id,
      email: user.email!,
      role: (claims.user_role as any) ?? 'user',
      plan: (claims.plan as any) ?? 'free',
      jwt,
      correlationId,
    },
    supabase,
  };
}
```

## 3.5 Setting custom claims (cuando user upgrade premium)

Cuando RevenueCat webhook confirma una compra, además de actualizar `mentex.user_premium`, hay que actualizar el JWT claim `plan` para que las RLS y premium gates funcionen al instante (sin esperar al next login).

```typescript
// lib/mentex/auth/claims.ts
import { supabaseAdmin } from '../db/admin';

export async function updateUserPlanClaim(userId: string, newPlan: 'free' | 'premium' | 'pro_plus') {
  // 1. Update raw_app_meta_data
  const { data: user, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (getErr || !user) throw new Error(`User ${userId} not found`);

  await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...user.user.app_metadata,
      plan: newPlan,
    },
  });

  // 2. Actualizar tabla user_premium
  await supabaseAdmin
    .from('user_premium')
    .update({ plan: newPlan, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  // 3. Invalidate current sessions (force re-login) — solo si el plan baja
  // Por upgrades NO invalidamos — el next refresh picks up the new claim
  // Por downgrades (cancellation) SÍ:
  if (newPlan === 'free') {
    await supabaseAdmin.auth.admin.signOut(userId);
  }
}
```

## 3.6 RLS strategy completa para Mentex

**Recordatorio**: Mentex usa **su propio Supabase project**. No hay `tenant_id` en las tablas. Aislamiento puro por `user_id = auth.uid()`.

**Patrón canónico** (ya aplicado en cada migration de doc 02):

```sql
ALTER TABLE mentex.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.<table>
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Casos especiales**:

- **`mentex.user_premium`**: user puede LEER pero NO escribir (solo webhook RC con `service_role`). Policy `user_read_own`.
- **`mentex.subscriptions`**: append-only, user lee, writes solo `service_role`. NO `user_own` con FOR ALL.
- **`mentex.content`**: catálogo público dentro de Mentex. `public_read` policy con `deleted_at IS NULL`, accesible a `authenticated`.
- **`mentex.integrations`**: user lee metadata + escribe disconnect, pero `access_token_enc` NUNCA se selecciona desde frontend. Convención: backend solo selecciona estas columnas con `service_role` + `mentex.decrypt_token()` RPC.

## 3.7 Bypass patterns (cuándo usar service_role)

```typescript
// lib/mentex/db/admin.ts
import { createClient } from '@supabase/supabase-js';

// SOLO usar en backend. NUNCA importar desde frontend.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
    global: { headers: { 'x-mentex-bypass': 'service-role' } },
  }
);
```

**Cuándo usar `supabaseAdmin`** (bypasa RLS):
- ✓ Webhooks externos (RevenueCat, OAuth callbacks) — no hay user logged
- ✓ Cron jobs / n8n workflows que tocan múltiples users
- ✓ Migrations / seeds
- ✓ Admin endpoints (admin Mentex only, gated por `role='admin'` claim)
- ✓ Token decryption (acceso a `mentex.integrations.access_token_enc`)

**Cuándo NO usar** (sigue RLS):
- ✗ Cualquier endpoint llamado desde la app (user-facing) — usa el client con JWT
- ✗ Si tienes el JWT del user, USA el JWT, no el service_role

**Regla de oro**: si usas `supabaseAdmin`, **DEBES filtrar manualmente por `tenant_id`/`user_id`** porque RLS está bypassed. Olvidarlo = data leak entre tenants.

```typescript
// MAL ❌
const { data } = await supabaseAdmin.from('ritual_items').select('*');
// Devuelve filas de TODOS los users de TODOS los tenants. Vulnerabilidad CRIT.

// BIEN ✓
const { data } = await supabaseAdmin
  .from('ritual_items')
  .select('*')
  .eq('user_id', targetUserId);
```

## 3.8 Apple App Privacy + ATT (App Tracking Transparency)

iOS 14.5+ requiere consentimiento para tracking cross-app. Mentex NO trackea cross-app, pero debes declarar correctamente:

**`app.config.js` (Expo)**:
```javascript
ios: {
  infoPlist: {
    NSUserTrackingUsageDescription: undefined,  // NO pedimos tracking
    NSAppleEventsUsageDescription: 'Mentex usa esto para sincronizar con tu Calendario',
    NSCalendarsUsageDescription: 'Mentex sincroniza tu agenda con Apple Calendar',
    NSCalendarsFullAccessUsageDescription: 'Mentex sincroniza tu agenda con Apple Calendar',  // iOS 17+
    NSRemindersFullAccessUsageDescription: 'Mentex crea recordatorios en Apple Reminders',
    NSHealthShareUsageDescription: 'Mentex lee tu actividad de Apple Health para personalizar tu ritual',
    NSMicrophoneUsageDescription: 'Mentex usa el micrófono para tu journaling de voz',
  },
  // Privacy manifest (xcprivacy)
  privacyManifests: {
    NSPrivacyAccessedAPITypes: [
      // declarar cada API system usada
      { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
      { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1'] },
    ],
    NSPrivacyTracking: false,
    NSPrivacyCollectedDataTypes: [
      // declara qué data colectas
      { NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress', ... },
    ],
  },
}
```

**Pidiendo permisos contextualmente** (no al primer launch):
```typescript
// Solo cuando user quiere agregar contenido a Apple Calendar
import * as Calendar from 'expo-calendar';

const { status } = await Calendar.requestCalendarPermissionsAsync();
if (status !== 'granted') {
  showToast('Activa Calendarios en Ajustes para sincronizar');
  return;
}
```

## 3.9 Cancelación de cuenta (GDPR right-to-erasure)

App Store requiere cancelación in-app desde 2022. Implementación (incluye purga de memoria del Coach en el Gateway):

```typescript
// app/api/me/erase/route.ts
import { authenticateMentexRequest } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/db/admin';
import { gateway } from '@/lib/gateway/client';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const authResult = await authenticateMentexRequest(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  logger.warn({ userId: user.userId, correlationId: user.correlationId }, 'user.delete.started');

  // 1. Purgar memoria del Coach en el Gateway (3 superficies)
  await gateway.invoke('memory.semantic.forget', {
    user_id: user.userId,
  }, { correlationId: user.correlationId });
  await gateway.invoke('memory.conversation.clear', {
    user_id: user.userId,
  }, { correlationId: user.correlationId });
  // memory.episodic.* — usar la skill que corresponda según describe (Sprint 0).

  // 2. Hard delete data sensible en Mentex DB (PII)
  await supabaseAdmin.from('coach_messages').delete().eq('user_id', user.userId);
  await supabaseAdmin.from('integrations').delete().eq('user_id', user.userId);

  // 3. Soft delete del resto (preservamos 30 días para recuperación)
  const tables = [
    'ritual_items', 'ritual_routines', 'ritual_sessions',
    'routine_completions', 'agenda_events', 'reminders',
    'coach_proposals', 'content_progress', 'playlists',
    'content_history', 'coach_conversations',
    'device_tokens', 'notifications_log',
    'subscriptions', 'usage_quotas', 'user_settings',
    'user_streaks', 'user_premium',
  ];
  for (const t of tables) {
    await supabaseAdmin.from(t).update({ deleted_at: new Date().toISOString() }).eq('user_id', user.userId);
  }

  // 4. Revocar OAuth tokens (Google, Spotify, etc.) — soft errors
  // 5. Apple Sign In: informar al user que debe revocar en ajustes iOS.

  // 6. Marcar user en auth.users como deletable (cron hace hard delete a 30 días)
  await supabaseAdmin.auth.admin.updateUserById(user.userId, {
    app_metadata: { deletion_requested_at: new Date().toISOString() },
    user_metadata: { deletion_requested: true },
  });

  // 7. Sign out de todas las sessions
  await supabaseAdmin.auth.admin.signOut(user.userId);

  logger.warn({ userId: user.userId, correlationId: user.correlationId }, 'user.delete.completed');

  return NextResponse.json({ success: true, message: 'Tu cuenta será eliminada permanentemente en 30 días.' });
}
```

**Cron de hard-delete a 30 días** (n8n workflow):
```sql
-- Identificar users marcados para deletion hace >30 días
SELECT id FROM auth.users
WHERE (raw_app_meta_data->>'deletion_requested_at')::TIMESTAMPTZ < NOW() - INTERVAL '30 days';

-- Para cada uno:
-- 1. Eliminar de auth.users (cascadea a user_profiles, etc.)
-- 2. Loggear en mentex.audit_log
```

---

**Siguiente**: [`04-AI-COACH.md`](./04-AI-COACH.md).
