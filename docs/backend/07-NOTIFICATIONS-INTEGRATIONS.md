# 07 · Notificaciones + Integraciones

## Parte 1 — Notifications

### 7.1 Stack push

- **Expo Push Service** (FCM + APNs managed). Gratis, abstrae plataformas.
- **Scheduling**: NO usamos `expo-notifications` scheduled local (no escalable). Hacemos cron server-side via n8n.
- **Compliance**: pedir permission contextualmente, NO al primer launch.

### 7.2 Registro de device token

```typescript
// Frontend al primer launch (después de auth)
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerForPushNotifications() {
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  // POST al backend para guardar
  await api.post('/notifications/register', {
    expo_push_token: tokenData.data,
    platform: Platform.OS,
    device_name: Device.deviceName,
    app_version: Application.nativeApplicationVersion,
  });
}
```

**Endpoint `register`**:

```typescript
// app/api/mentex/notifications/register/route.ts
export async function POST(req: NextRequest) {
  const authResult = await authenticateMentexRequest(req);
  if ('status' in authResult) return authResult;
  const { user, supabase } = authResult;

  const { expo_push_token, platform, device_name, app_version } =
    await req.json();

  // Upsert por token (un device → un token)
  await supabase.from('device_tokens').upsert({
    tenant_id: user.tenantId,
    user_id: user.userId,
    expo_push_token,
    platform,
    device_name,
    app_version,
    is_active: true,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'expo_push_token' });

  return NextResponse.json({ success: true });
}
```

### 7.3 Enviar push (server-side helper)

```typescript
// lib/mentex/push/expo.ts
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { supabaseAdmin } from '../db/admin';
import { logger } from '@/lib/logger';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

export interface MentexPushOptions {
  userId: string;
  kind: 'reminder' | 'coach_proactive' | 'weekly_recap' | 'system';
  title: string;
  body: string;
  data?: Record<string, any>;
  sourceId?: string;
}

export async function sendPush(opts: MentexPushOptions): Promise<void> {
  // 1. Cargar device tokens activos del user
  const { data: tokens } = await supabaseAdmin
    .from('device_tokens')
    .select('expo_push_token, platform')
    .eq('user_id', opts.userId)
    .eq('is_active', true);

  if (!tokens || tokens.length === 0) {
    logger.info({ userId: opts.userId, kind: opts.kind }, 'push.no_tokens');
    return;
  }

  // 2. Construir mensajes
  const messages: ExpoPushMessage[] = tokens
    .filter(t => Expo.isExpoPushToken(t.expo_push_token))
    .map(t => ({
      to: t.expo_push_token,
      sound: 'default',
      title: opts.title,
      body: opts.body,
      data: {
        kind: opts.kind,
        source_id: opts.sourceId,
        ...opts.data,
      },
      categoryId: opts.kind,    // iOS action category
      _displayInForeground: false,
    }));

  // 3. Chunk + send
  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const result = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...result);
    } catch (err: any) {
      logger.error({ err, userId: opts.userId }, 'push.send.error');
    }
  }

  // 4. Log para audit + handle errors (tokens inválidos)
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const message = messages[i];

    await supabaseAdmin.from('notifications_log').insert({
      user_id: opts.userId,
      kind: opts.kind,
      source_id: opts.sourceId,
      title: opts.title,
      body: opts.body,
      data: opts.data ?? {},
      expo_receipt_id: ticket.status === 'ok' ? ticket.id : null,
      status: ticket.status === 'ok' ? 'sent' : 'failed',
      error_message: ticket.status === 'error' ? ticket.message : null,
      sent_at: new Date().toISOString(),
    });

    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      // Token inválido — marcarlo inactivo
      await supabaseAdmin
        .from('device_tokens')
        .update({ is_active: false })
        .eq('expo_push_token', message.to);
    }
  }
}
```

### 7.4 Scheduling via n8n workflow

**Workflow `mentex.reminder.notification`** (corre cada 1 minuto):

```
[Cron 1min]
   ↓
[Supabase Query]
   SELECT r.*, ds.timezone FROM mentex.reminders r
   JOIN mentex.user_settings ds ON ds.user_id = r.user_id
   WHERE r.deleted_at IS NULL
     AND r.push_enabled = true
     AND r.completed = false
     AND r.next_fire_at BETWEEN now() - INTERVAL '30 seconds' AND now() + INTERVAL '30 seconds'
   ↓
[For each reminder]
   ↓
[HTTP POST /api/internal/push/send]
   {userId, kind: 'reminder', title: reminder.title, body: '...', sourceId: reminder.id}
   ↓
[Update reminder]
   SET last_fired_at = now(),
       next_fire_at = compute_next_fire(recurrence, weekdays, time_of_day)
```

**Función SQL `compute_next_fire`**:

```sql
CREATE OR REPLACE FUNCTION mentex.compute_next_fire(
  p_recurrence TEXT,
  p_weekdays SMALLINT[],
  p_time_of_day TIME,
  p_timezone TEXT DEFAULT 'America/Bogota',
  p_now TIMESTAMPTZ DEFAULT now()
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_now_local TIMESTAMPTZ := p_now AT TIME ZONE p_timezone;
  v_target DATE := v_now_local::DATE;
  v_target_time TIMESTAMPTZ;
  v_dow INT;
  v_attempts INT := 0;
BEGIN
  IF p_recurrence = 'once' THEN
    -- Sin recurrencia: si ya pasó, NULL
    v_target_time := (v_target::TEXT || ' ' || p_time_of_day::TEXT)::TIMESTAMPTZ AT TIME ZONE p_timezone;
    IF v_target_time <= p_now THEN RETURN NULL; END IF;
    RETURN v_target_time;
  END IF;

  IF p_recurrence = 'daily' THEN
    -- Siguiente día con esa hora
    v_target_time := (v_target::TEXT || ' ' || p_time_of_day::TEXT)::TIMESTAMPTZ AT TIME ZONE p_timezone;
    IF v_target_time <= p_now THEN
      v_target := v_target + 1;
      v_target_time := (v_target::TEXT || ' ' || p_time_of_day::TEXT)::TIMESTAMPTZ AT TIME ZONE p_timezone;
    END IF;
    RETURN v_target_time;
  END IF;

  IF p_recurrence = 'weekdays' THEN
    -- Buscar siguiente día que esté en weekdays array
    -- weekdays: 0=Lunes, 1=Martes, ..., 6=Domingo (convención Mentex)
    LOOP
      v_attempts := v_attempts + 1;
      IF v_attempts > 7 THEN RETURN NULL; END IF;

      v_dow := (EXTRACT(DOW FROM v_target)::INT + 6) % 7;  -- convert Sun=0 to Mon=0

      IF v_dow = ANY(p_weekdays) THEN
        v_target_time := (v_target::TEXT || ' ' || p_time_of_day::TEXT)::TIMESTAMPTZ AT TIME ZONE p_timezone;
        IF v_target_time > p_now THEN RETURN v_target_time; END IF;
      END IF;

      v_target := v_target + 1;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;
```

**Trigger que recalcula `next_fire_at` automáticamente al crear/editar**:

```sql
CREATE OR REPLACE FUNCTION mentex.set_reminder_next_fire()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_timezone TEXT;
BEGIN
  IF NEW.time_of_day IS NULL THEN
    NEW.next_fire_at := NULL;
    RETURN NEW;
  END IF;

  SELECT timezone INTO v_timezone FROM mentex.user_settings WHERE user_id = NEW.user_id;
  v_timezone := COALESCE(v_timezone, 'America/Bogota');

  NEW.next_fire_at := mentex.compute_next_fire(
    NEW.recurrence, NEW.weekdays, NEW.time_of_day, v_timezone, now()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reminder_next_fire
  BEFORE INSERT OR UPDATE OF time_of_day, recurrence, weekdays, completed
  ON mentex.reminders
  FOR EACH ROW EXECUTE FUNCTION mentex.set_reminder_next_fire();
```

### 7.5 Quiet hours (no molestar)

```typescript
// lib/mentex/push/quiet-hours.ts
export async function isInQuietHours(userId: string): Promise<boolean> {
  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('timezone, notifications')
    .eq('user_id', userId)
    .single();

  if (!settings?.notifications?.quiet_hours_start) return false;

  const tz = settings.timezone || 'America/Bogota';
  const now = new Date();
  const localHHMM = now.toLocaleString('en-US', {
    timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit',
  }).replace(':', '');

  const start = settings.notifications.quiet_hours_start.replace(':', '');
  const end = settings.notifications.quiet_hours_end.replace(':', '');

  // Caso: 22:00 - 07:00 (cruza medianoche)
  if (start > end) {
    return localHHMM >= start || localHHMM < end;
  }
  return localHHMM >= start && localHHMM < end;
}

// Use en sendPush:
export async function sendPush(opts: MentexPushOptions) {
  if (opts.kind !== 'system' && await isInQuietHours(opts.userId)) {
    // Reschedule for next quiet_hours_end
    logger.info({ userId: opts.userId, kind: opts.kind }, 'push.deferred.quiet_hours');
    return;
  }
  // ... resto del código
}
```

---

## Parte 2 — Integraciones (OAuth + n8n)

### 7.6 Providers soportados (alineado con frontend)

| Provider | Scope | Uso |
|----------|-------|-----|
| Google Calendar | `https://www.googleapis.com/auth/calendar.readonly` | Lee eventos → inyecta en `agenda_events` |
| Apple Calendar | (vía `expo-calendar`, no OAuth) | Sync nativo iOS |
| Spotify | `playlist-read-private` | Recomienda playlists ambient como ritual extra |
| Notion | `read_content` | Lee notas → opcional persistir como hechos en `memory.semantic.store` del Gateway |
| Linear | `issues:read` | Sync tareas → reminders Mentex |
| Todoist | `data:read` | Idem |
| Gmail | `gmail.readonly` | Categorización futuro (sprint H) |
| Slack | `users:read`, `chat:write` | DM coach del canal Slack del user |
| Instagram | `instagram_basic` | Bonus: tracking hábito de scroll (Pomodoro reverso) |
| X (Twitter) | OAuth 2.0 | Stats de uso |
| LinkedIn | `r_basicprofile` | Stats de uso |
| YouTube | `youtube.readonly` | Stats history → identificar consumo |
| Apple Health | (vía `expo-health-kit`, no OAuth) | Steps + sleep → ritual personalizado |
| Strava | `read,activity:read` | Mismo que health |

### 7.7 Patrón OAuth genérico

```typescript
// app/api/mentex/integrations/[provider]/connect/route.ts
import { authenticateMentexRequest } from '@/lib/mentex/auth/middleware';
import { generateOAuthUrl } from '@/lib/mentex/integrations/oauth-providers';
import { hasFeature } from '@/lib/mentex/premium/check';

export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const authResult = await authenticateMentexRequest(req);
  if ('status' in authResult) return authResult;
  const { user } = authResult;

  if (!hasFeature(user.plan, 'integrations')) {
    return NextResponse.json({ error: 'premium_required' }, { status: 402 });
  }

  const state = crypto.randomUUID();
  // Guardar state en cache (Redis) con userId para validar callback
  await redis.set(`oauth:state:${state}`, user.userId, { EX: 600 });    // 10 min

  const url = generateOAuthUrl(params.provider, {
    state,
    redirectUri: `https://api.mentex.app/api/mentex/integrations/${params.provider}/callback`,
  });

  return NextResponse.json({ url });
}
```

```typescript
// lib/mentex/integrations/oauth-providers.ts
export function generateOAuthUrl(provider: string, opts: { state: string; redirectUri: string }): string {
  const config = OAUTH_CONFIGS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const url = new URL(config.authUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', opts.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes.join(' '));
  url.searchParams.set('state', opts.state);
  url.searchParams.set('access_type', 'offline');     // Google
  url.searchParams.set('prompt', 'consent');          // refresh token

  return url.toString();
}

const OAUTH_CONFIGS = {
  google_calendar: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/userinfo.email'],
  },
  spotify: {
    authUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    clientId: process.env.SPOTIFY_CLIENT_ID!,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    scopes: ['playlist-read-private', 'user-read-recently-played'],
  },
  // ... otros providers
};
```

```typescript
// app/api/mentex/integrations/[provider]/callback/route.ts
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect('mentex://integrations/error?reason=missing_params');
  }

  const userId = await redis.get(`oauth:state:${state}`);
  if (!userId) {
    return NextResponse.redirect('mentex://integrations/error?reason=invalid_state');
  }
  await redis.del(`oauth:state:${state}`);

  // Exchange code → tokens
  const config = OAUTH_CONFIGS[params.provider];
  const tokenRes = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: `https://api.mentex.app/api/mentex/integrations/${params.provider}/callback`,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    return NextResponse.redirect(`mentex://integrations/error?reason=token_exchange_failed`);
  }

  // Get external user info (email + id)
  const userInfoRes = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userInfoRes.json();

  // Persistir tokens cifrados (pgcrypto helpers, doc 02 §209)
  await supabaseAdmin.rpc('integration_save_tokens', {
    p_user_id: userId,
    p_provider: params.provider,
    p_access_token: tokens.access_token,
    p_refresh_token: tokens.refresh_token ?? null,
    p_expires_at: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
    p_scopes: tokens.scope?.split(' ') ?? [],
    p_external_user_id: userInfo.id ?? userInfo.sub,
    p_external_email: userInfo.email,
  });

  // Trigger initial sync vía workflow del Gateway (delegate orchestration)
  await gateway.invoke('n8n.trigger', {
    workflow_key: `mentex.integration.${params.provider}.initial_sync`,
    input: { user_id: userId },
  }, { correlationId, idempotencyKey: `init-sync-${userId}-${params.provider}` });

  return NextResponse.redirect(`mentex://integrations/success?provider=${params.provider}`);
}
```

### 7.8 Sync workflows en n8n

**`mentex.calendar.sync`** (cron cada 15 min):

```
[Cron 15min]
  ↓
[Supabase: list users con Google Calendar connected]
  SELECT user_id FROM mentex.integrations
  WHERE provider = 'google_calendar' AND status = 'connected'
  ↓
[For each user]
  ↓
[Refresh token si expired]
  Call refresh-token endpoint si token_expires_at < now()+5min
  ↓
[Google Calendar API list events]
  GET /calendar/v3/calendars/primary/events?timeMin=today&timeMax=+7days
  ↓
[Upsert mentex.agenda_events]
  Por cada event: upsert con calendar_provider='google' + source_id=event.id
  ↓
[Cleanup orphans]
  DELETE FROM mentex.agenda_events
  WHERE user_id = X AND calendar_provider = 'google'
    AND source_id NOT IN (current_synced_ids)
  ↓
[Update integrations.last_sync_at]
```

### 7.9 Refresh tokens automático

```typescript
// lib/mentex/integrations/refresh.ts
export async function refreshProviderToken(userId: string, provider: string): Promise<string> {
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('refresh_token_enc, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (!integration?.refresh_token_enc) throw new Error('No refresh token');

  // Decrypt refresh token
  const { data: decrypted } = await supabaseAdmin.rpc('decrypt_token', {
    p_ciphertext: integration.refresh_token_enc,
  });

  const config = OAUTH_CONFIGS[provider];
  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: decrypted,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await res.json();
  if (!tokens.access_token) {
    // Refresh failed — marcar integration como expired
    await supabaseAdmin
      .from('integrations')
      .update({ status: 'expired', last_sync_error: 'refresh_failed' })
      .eq('user_id', userId)
      .eq('provider', provider);
    throw new Error('Token refresh failed');
  }

  // Save new access_token
  await supabaseAdmin.rpc('integration_update_access_token', {
    p_user_id: userId,
    p_provider: provider,
    p_access_token: tokens.access_token,
    p_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  });

  return tokens.access_token;
}
```

### 7.10 Disconnect (revoke)

```typescript
// app/api/mentex/integrations/[provider]/disconnect/route.ts
export async function POST(req: NextRequest, { params }: { params: { provider: string } }) {
  const authResult = await authenticateMentexRequest(req);
  if ('status' in authResult) return authResult;
  const { user } = authResult;

  // 1. Revoke en el provider
  try {
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('access_token_enc')
      .eq('user_id', user.userId)
      .eq('provider', params.provider)
      .single();

    if (integration) {
      const accessToken = await decryptToken(integration.access_token_enc);
      await revokeProviderToken(params.provider, accessToken);
    }
  } catch (err) {
    logger.warn({ err }, 'integration.revoke.failed');
    // Continúa aunque revoke falle (token podría ya estar inválido)
  }

  // 2. Hard delete del row (no soft — los tokens son sensibles)
  await supabaseAdmin
    .from('integrations')
    .delete()
    .eq('user_id', user.userId)
    .eq('provider', params.provider);

  // 3. Limpiar agenda_events del provider
  await supabaseAdmin
    .from('agenda_events')
    .delete()
    .eq('user_id', user.userId)
    .eq('calendar_provider', params.provider.replace('_calendar', ''));

  return NextResponse.json({ success: true });
}
```

---

**Siguiente**: [`08-DEPLOYMENT-OBSERVABILITY.md`](./08-DEPLOYMENT-OBSERVABILITY.md).
