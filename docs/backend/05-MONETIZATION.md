# 05 · Monetización — RevenueCat ↔ premium-gate Mentex

## 5.1 Modelo de precios Mentex

| Plan | Mensual | Anual | Beneficios |
|------|---------|-------|-----------|
| **Free** | $0 | $0 | Coach 10 msg/día · contenido limitado · audiolibros gratuitos · ritual básico |
| **Premium** | $9.99 | $79.99 (33% off) | Coach 100 msg/día · catálogo completo · todos los audiolibros · integraciones · agenda IA · sin ads |
| **Pro Plus** *(futuro)* | $19.99 | $159.99 | Premium + cortex avanzado + skills custom + priority support |

**Trial**: 7 días free trial en Premium (configurado en App Store/Play Store via RevenueCat).

**Productos en stores**:
- iOS: `mentex_premium_monthly`, `mentex_premium_annual`
- Android: `mentex_premium_monthly`, `mentex_premium_annual`

RevenueCat unifica ambos bajo "entitlements":
- `entitlement: premium` → desbloquea todo de premium

## 5.2 Stack RevenueCat (RC)

```
┌─────────────────────────────────────────────────────────────────┐
│ APP MENTEX                                                       │
│ react-native-purchases SDK                                       │
│ - Purchases.configure({ apiKey: RC_PUBLIC_KEY, appUserID })      │
│ - Purchases.getOfferings()                                       │
│ - Purchases.purchasePackage(pkg)                                 │
│ - Purchases.restorePurchases()                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ store transaction
┌─────────────────────────────────────────────────────────────────┐
│ APP STORE / PLAY STORE                                          │
│ - StoreKit (iOS) / Play Billing (Android)                       │
│ - Cobra al user                                                  │
│ - Notifica a RevenueCat                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓ webhook (server-to-server)
┌─────────────────────────────────────────────────────────────────┐
│ /api/mentex/subscription/webhook                                 │
│ - Valida firma HMAC                                              │
│ - Idempotency check (revenuecat_event_id)                        │
│ - Persiste evento en mentex.subscriptions                        │
│ - Actualiza mentex.user_premium                                  │
│ - Actualiza JWT claim plan (Supabase admin)                      │
│ - Logs en mentex.audit_log                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PREMIUM-GATE MENTEX (compensación GAP G1)                        │
│ Lookup mentex.user_premium.plan antes de delegar al Gateway.    │
│ Tabla mentex.usage_quotas cuenta llamadas/día por user.         │
│ Cuotas por plan (ver doc 00 §0.5). 402 si excede.               │
└─────────────────────────────────────────────────────────────────┘
```

## 5.3 Setup RevenueCat (one-time, founder)

1. Crear app en RC dashboard `app.revenuecat.com`
2. Conectar App Store Connect (iOS) + Google Play (Android)
3. Crear productos (`mentex_premium_monthly`, `mentex_premium_annual`)
4. Crear entitlement `premium` ligado a esos productos
5. Crear offering `default` con los 2 packages
6. **Configurar webhook**: URL `https://api.mentex.app/api/mentex/subscription/webhook`, secret guardado en `REVENUECAT_WEBHOOK_SECRET`
7. Habilitar todos los event types (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE, TRANSFER, NON_RENEWING_PURCHASE, SUBSCRIPTION_PAUSED)

## 5.4 Frontend Expo — integración

```typescript
// frontend: lib/revenuecat/init.ts
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '../supabase';

const RC_KEYS = {
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY!,
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY!,
};

export async function initRevenueCat(userId: string) {
  const apiKey = Platform.OS === 'ios' ? RC_KEYS.ios : RC_KEYS.android;
  Purchases.configure({ apiKey, appUserID: userId });

  // Sync customer info on app start
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo;
}

export async function purchasePremium(packageType: 'monthly' | 'annual') {
  const offerings = await Purchases.getOfferings();
  const offering = offerings.current;
  if (!offering) throw new Error('No offering configured');

  const pkg = packageType === 'monthly' ? offering.monthly : offering.annual;
  if (!pkg) throw new Error(`Package ${packageType} not found`);

  try {
    const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pkg);
    return {
      success: true,
      isPremium: customerInfo.entitlements.active['premium']?.isActive ?? false,
      productId: productIdentifier,
    };
  } catch (err: any) {
    if (err.userCancelled) return { success: false, cancelled: true };
    throw err;
  }
}

export async function restorePurchases() {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo.entitlements.active['premium']?.isActive ?? false;
}

export async function isUserPremium(): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  return info.entitlements.active['premium']?.isActive ?? false;
}
```

**En el componente del paywall**:
```typescript
// frontend: screens/paywall.tsx
const handlePurchase = async (type: 'monthly' | 'annual') => {
  try {
    setLoading(true);
    const result = await purchasePremium(type);
    if (result.success && result.isPremium) {
      // Esperar un poco para que el webhook procese
      await new Promise(r => setTimeout(r, 2000));
      // Refresh JWT — el claim 'plan' debería haber cambiado a 'premium'
      await supabase.auth.refreshSession();
      showToast('¡Bienvenido a Premium!');
      navigation.goBack();
    }
  } catch (err) {
    Sentry.captureException(err);
    showToast('Error procesando compra. Intenta más tarde.');
  } finally {
    setLoading(false);
  }
};
```

## 5.5 Webhook receiver

```typescript
// app/api/mentex/subscription/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/mentex/db/admin';
import { updateUserPlanClaim } from '@/lib/mentex/auth/claims';
import { logger } from '@/lib/logger';

const RC_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET!;

interface RCWebhookEvent {
  event: {
    id: string;
    type: 'INITIAL_PURCHASE' | 'RENEWAL' | 'CANCELLATION' | 'EXPIRATION'
      | 'BILLING_ISSUE' | 'PRODUCT_CHANGE' | 'TRANSFER' | 'NON_RENEWING_PURCHASE'
      | 'SUBSCRIPTION_PAUSED' | 'TEST';
    app_user_id: string;          // = nuestro user_id de auth.users
    product_id: string;
    store: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE';
    period_type: 'TRIAL' | 'NORMAL' | 'INTRO';
    purchased_at_ms: number;
    expiration_at_ms?: number;
    price: number;
    currency: string;
    is_trial_conversion?: boolean;
    transaction_id?: string;
    original_transaction_id?: string;
    entitlement_ids: string[];
  };
  api_version: '1.0';
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('authorization');

  // 1. Verificar firma (HMAC)
  const expectedSignature = crypto
    .createHmac('sha256', RC_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (!signature || !crypto.timingSafeEqual(
    Buffer.from(signature.replace('Bearer ', '')),
    Buffer.from(expectedSignature)
  )) {
    logger.warn({ event: 'revenuecat.webhook.invalid_signature' }, 'webhook rejected');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as RCWebhookEvent;
  const { event } = body;

  // 2. Idempotency check — si ya procesamos este event_id, return 200 (idempotent)
  const { data: existing } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('revenuecat_event_id', event.id)
    .maybeSingle();

  if (existing) {
    logger.info({ event_id: event.id }, 'webhook.duplicate_ignored');
    return NextResponse.json({ status: 'duplicate_ignored' });
  }

  // 3. Resolver user
  const { data: userPremium } = await supabaseAdmin
    .from('user_premium')
    .select('user_id')
    .eq('revenuecat_app_user_id', event.app_user_id)
    .maybeSingle();

  const userId = userPremium?.user_id ?? event.app_user_id;  // RC app_user_id = nuestro user_id

  // 4. Persistir evento (audit log)
  await supabaseAdmin.from('subscriptions').insert({
    user_id: userId,
    revenuecat_event_id: event.id,
    event_type: event.type,
    product_id: event.product_id,
    platform: event.store === 'APP_STORE' ? 'ios' : event.store === 'PLAY_STORE' ? 'android' : 'stripe',
    price_usd: event.price,
    currency: event.currency,
    period_start: new Date(event.purchased_at_ms).toISOString(),
    period_end: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
    is_trial: event.period_type === 'TRIAL',
    store_transaction_id: event.transaction_id,
    raw_event: body,
  });

  // 5. Aplicar lógica según tipo de evento
  await applySubscriptionEvent(userId, event);

  return NextResponse.json({ status: 'processed' });
}

async function applySubscriptionEvent(userId: string, event: RCWebhookEvent['event']) {
  const isPremiumActive = event.entitlement_ids.includes('premium');

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
      await supabaseAdmin
        .from('user_premium')
        .upsert({
          user_id: userId,
          plan: 'premium',
          status: 'active',
          revenuecat_app_user_id: event.app_user_id,
          product_id: event.product_id,
          platform: event.store === 'APP_STORE' ? 'ios' : 'android',
          period_start: new Date(event.purchased_at_ms).toISOString(),
          period_end: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
          is_in_trial: event.period_type === 'TRIAL',
          trial_end_at: event.period_type === 'TRIAL' && event.expiration_at_ms
            ? new Date(event.expiration_at_ms).toISOString() : null,
        }, { onConflict: 'user_id' });

      await updateUserPlanClaim(userId, 'premium');

      // Reset de cuotas diarias del usuario al renovar (premium-gate Mentex)
      if (event.type === 'INITIAL_PURCHASE' || event.type === 'RENEWAL') {
        await supabaseAdmin.rpc('reset_usage_quotas', { p_user_id: userId });
      }
      break;

    case 'CANCELLATION':
      // User canceló pero sigue siendo premium hasta period_end
      await supabaseAdmin
        .from('user_premium')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      // NO downgrade plan claim aún — eso pasa en EXPIRATION
      break;

    case 'EXPIRATION':
      // Subscription expiró — downgrade real
      await supabaseAdmin
        .from('user_premium')
        .update({ plan: 'free', status: 'expired' })
        .eq('user_id', userId);

      await updateUserPlanClaim(userId, 'free');
      break;

    case 'BILLING_ISSUE':
      // Tarjeta declinada, etc. — modo gracia
      await supabaseAdmin
        .from('user_premium')
        .update({ status: 'in_grace' })
        .eq('user_id', userId);
      // No downgrade aún — App Store da 16 días de grace period
      break;

    case 'SUBSCRIPTION_PAUSED':
      await supabaseAdmin
        .from('user_premium')
        .update({ status: 'paused' })
        .eq('user_id', userId);
      await updateUserPlanClaim(userId, 'free');
      break;

    case 'TRANSFER':
      // User migrated from one App Store ID to another — el original pierde el premium
      // RC sends event for the LOSER. Apply logic accordingly.
      logger.info({ userId, eventType: 'TRANSFER' }, 'subscription.transferred');
      break;
  }
}
```

**Helper SQL `reset_usage_quotas`** (resetea cuotas diarias del usuario al renovar):

```sql
-- migrations/0011_reset_usage_quotas.sql
CREATE OR REPLACE FUNCTION mentex.reset_usage_quotas(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = mentex, public AS $$
BEGIN
  UPDATE mentex.usage_quotas
     SET count = 0,
         updated_at = NOW()
   WHERE user_id = p_user_id
     AND date = CURRENT_DATE;
END;
$$;
GRANT EXECUTE ON FUNCTION mentex.reset_usage_quotas(UUID) TO service_role;
```

## 5.6 Premium gates en el código

Reusable hook + endpoint check:

```typescript
// lib/mentex/premium/check.ts
export type PremiumFeature =
  | 'unlimited_coach'      // >10 msg/día
  | 'premium_content'       // audiolibros premium
  | 'integrations'          // OAuth a Google/Spotify/etc.
  | 'agenda_ai'             // planificación automática
  | 'voice_journal'         // futuro
  | 'priority_support';

const FREE_TIER_LIMITS: Record<PremiumFeature, boolean> = {
  unlimited_coach: false,
  premium_content: false,
  integrations: false,
  agenda_ai: false,
  voice_journal: false,
  priority_support: false,
};

export function hasFeature(plan: 'free' | 'premium' | 'pro_plus', feature: PremiumFeature): boolean {
  if (plan === 'free') return FREE_TIER_LIMITS[feature];
  return true; // premium y pro_plus tienen todo
}
```

**Uso en endpoint**:
```typescript
// app/api/mentex/integrations/google-calendar/connect/route.ts
import { authenticateMentexRequest } from '@/lib/mentex/auth/middleware';
import { hasFeature } from '@/lib/mentex/premium/check';

export async function POST(req: NextRequest) {
  const authResult = await authenticateMentexRequest(req);
  if ('status' in authResult) return authResult;
  const { user } = authResult;

  if (!hasFeature(user.plan, 'integrations')) {
    return NextResponse.json({
      error: 'premium_required',
      feature: 'integrations',
      upgrade_url: 'mentex://paywall?context=google_calendar',
    }, { status: 402 });  // Payment Required
  }

  // ... continue OAuth flow
}
```

**Uso en frontend**:
```typescript
// frontend: hooks/useFeatureGate.ts
export function useFeatureGate(feature: PremiumFeature) {
  const { plan } = useUserPlan();
  return {
    hasAccess: hasFeature(plan, feature),
    showPaywall: () => navigation.navigate('Paywall', { context: feature }),
  };
}

// Usage:
const { hasAccess, showPaywall } = useFeatureGate('integrations');
if (!hasAccess) {
  return <PremiumLockCard onPress={showPaywall} feature="Google Calendar sync" />;
}
```

## 5.7 Restore Purchases (App Store requirement)

App Store guideline 3.1.1: TODA app con IAP debe tener "Restore Purchases" visible.

```typescript
// frontend: components/SettingsScreen.tsx
<TouchableOpacity onPress={async () => {
  const isPremium = await restorePurchases();
  if (isPremium) {
    await supabase.auth.refreshSession();
    showToast('¡Premium restaurado!');
  } else {
    showToast('No se encontraron compras previas');
  }
}}>
  <Text>Restaurar compras</Text>
</TouchableOpacity>
```

## 5.8 Test mode

Para QA antes de producción:

- **iOS Sandbox**: crear sandbox tester en App Store Connect, comprar con cuenta sandbox
- **Android Test Track**: agregar email a license testers, comprar con tarjeta de test
- **RevenueCat sandbox**: las compras sandbox aparecen en RC dashboard con `is_sandbox: true`

Tu webhook debe filtrar sandbox en producción:
```typescript
const isSandbox = event.environment === 'SANDBOX';
if (isSandbox && process.env.NODE_ENV === 'production') {
  // En prod ignoramos sandbox events
  logger.info({ event_id: event.id }, 'sandbox.event.ignored.in.prod');
  return NextResponse.json({ status: 'sandbox_ignored' });
}
```

## 5.9 Edge cases comunes

| Caso | Cómo se maneja |
|------|----------------|
| User compra, webhook tarda → frontend cree que no es premium | Frontend hace `Purchases.getCustomerInfo()` y refresca JWT manualmente |
| Webhook fail (RC retry) | RC reintenta cada hora por 72h. Idempotency key previene duplicados. |
| User cancela y reactiva en mismo período | RC genera CANCELLATION → user cambia opinión → no más eventos. Solo si llega EXPIRATION downgrade. |
| Cambio de plan (monthly → annual) | RC genera PRODUCT_CHANGE. Webhook actualiza producto_id + period_end. |
| Family Sharing (iOS) | Si el plan tiene family enabled, otro user de la familia obtiene acceso. `event.app_user_id` será diferente — manejar como nuevo user. |
| Promo codes | RC los maneja transparente. INITIAL_PURCHASE con `price=0`. |
| Refunds (App Store) | Llega como CANCELLATION + REFUND event. Inmediato downgrade. |

## 5.10 Métricas + reporting

Mentex mantiene sus propias vistas de revenue en su Supabase:

```sql
-- Vista que mide MRR Mentex
CREATE OR REPLACE VIEW mentex.mrr_summary AS
SELECT
  date_trunc('month', period_start) AS month,
  COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'INITIAL_PURCHASE') AS new_subs,
  COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'RENEWAL') AS renewals,
  COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'EXPIRATION') AS churned,
  SUM(price_usd) FILTER (WHERE event_type IN ('INITIAL_PURCHASE','RENEWAL')) AS gross_revenue
FROM mentex.subscriptions
GROUP BY 1
ORDER BY 1 DESC;
```

Consumida por dashboard interno Mentex (admin-only, no expuesto al cliente RN).

---

**Siguiente**: [`06-CONTENT-CATALOG.md`](./06-CONTENT-CATALOG.md).
