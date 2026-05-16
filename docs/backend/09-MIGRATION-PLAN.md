# 09 · Migration Plan — sprints ejecutables

Plan completo desde el estado actual (frontend prototipo HTML) hasta producción en App Store + Play Store con BFF Mentex consumiendo el Gateway Imperial como inquilino.

**Prerequisito absoluto**: leer [`MENTEX_BACKEND_CONTRACT.md`](./MENTEX_BACKEND_CONTRACT.md). Doc sellado Diego + Helios. Sin sello, no se arranca código.

**Duración total estimada**: 12-16 semanas con 1 programador full-time. Acelerable a 8-10 con 2 programadores en paralelo (backend BFF + frontend Expo).

---

## Sprint 0 · Setup + Contract Test Rig (1 semana)

**Objetivo**: programador entra con todo el contexto y entorno funcionando + **los 8 contract tests verdes contra Gateway real** (§8 del contrato).

| Tarea | Owner | Output |
|-------|-------|--------|
| Leer `MENTEX_BACKEND_CONTRACT.md` + docs 00-08 | Brandon | Checklist de comprensión firmado |
| Recibir `IMPERIAL_API_KEY` (Conexión B) | Diego → Brandon (canal privado) | Key en vault de Brandon, NUNCA en repo |
| Recibir `BRANDON_DEV_TOKEN` (Conexión A) | Diego → Brandon (canal privado) | Token en Claude Code config |
| Alta del Imperial Dev MCP en Claude Code | Brandon | `claude mcp add --transport http imperial-dev ...` funciona |
| Provisionar Supabase project (`mentex-prod` + `mentex-staging`) | Brandon | URLs + anon key + service role |
| Configurar cuenta RevenueCat para Mentex | Diego + Brandon | RC dashboard accesible |
| Crear bucket Cloudflare R2 `mentex-content` | Brandon | bucket creado, credenciales |
| Crear Sentry project `mentex` | Brandon | DSN configurado |
| Crear repo `mentex-bff` (greenfield) | Brandon | repo inicializado, CI base |
| **Implementar los 8 contract tests (§8 del contrato)** | Brandon | 8/8 verdes contra Gateway real |

**Criterio de aceptación**:
- ✓ `claude mcp list` muestra `imperial-dev` funcional.
- ✓ Endpoint dummy `/api/health/live` deployado en BFF, devuelve `{ ok: true }`.
- ✓ Endpoint `/api/health/gateway` lee `/v1/openapi.json` y captura baseline.
- ✓ **8/8 contract tests verdes en CI** — sin esto NO se arranca Sprint A.

---

## Sprint A · Migración a Expo (3-4 semanas) — Backend dev en paralelo: Sprint B

**Objetivo**: port del prototipo HTML actual a React Native + Expo, mantener mock data.

**Frontend dev work** (3-4 semanas):

### Semana 1
- [ ] Crear Expo app nueva (managed workflow) con TypeScript strict
- [ ] Setup React Navigation (stack + bottom tabs)
- [ ] Setup Zustand stores reemplazando `window.__mtx*`
- [ ] Setup AsyncStorage para persistencia client-side
- [ ] Port de design tokens (colors, typography, spacings) a un `theme.ts`
- [ ] Port de componentes base: Button, Card, Sheet, Modal, Pickers
- [ ] Setup Reanimated 3 para animaciones críticas (sheets, transiciones)
- [ ] Setup Expo SecureStore para JWT

### Semana 2
- [ ] Port Home Inactive (sin auth real, mock state)
- [ ] Port Home Active (timer, ActivityRow, AppsProtectionCard)
- [ ] Port Explorar (Hero, ContentRow, ContentDetailScreen, VideoSheet → fullscreen player)
- [ ] Port LearnTodaySection (Aprende hoy con dual-tap cards)
- [ ] Implementar deep-link handler (`mentex://...`)

### Semana 3
- [ ] Port IA Hub (chat empty state, header, settings, agenda btn)
- [ ] Port AgendaSheet (DayPills, timeline, EventRow, AgendaItemDetailSheet)
- [ ] Port AddReminderSheet (TIPO selector, TimePickerSheet, DurationPickerSheet)
- [ ] Port Comunidad + Perfil (read-only, sin backend aún)
- [ ] Port Onboarding flow

### Semana 4
- [ ] Setup Apple Sign In + Google Sign In con Supabase Auth
- [ ] Hook Supabase Auth a Zustand store
- [ ] Connect a `/api/health` y verificar JWT funciona
- [ ] EAS Build dev profile + internal distribution (TestFlight + Play Internal)
- [ ] QA pass: golden path + edge cases en device real iOS + Android

**Backend dev work** (paralelo): ver Sprint B.

**Criterio de aceptación Sprint A**:
- ✓ App Mentex corriendo en iPhone físico + Android físico
- ✓ Apple Sign In funcional, JWT valido, llama `/api/health`
- ✓ Todas las pantallas portadas con mock data
- ✓ Performance: app launch <2s, navegación <100ms, animaciones 60fps
- ✓ TestFlight build distribuible

---

## Sprint B · Backend foundation (2-3 semanas, paralelo a Sprint A)

**Objetivo**: BFF con cliente Gateway central + schemas Mentex en Supabase propio + auth wired + endpoints CRUD básicos.

### Semana 1
- [ ] Estructura del repo `mentex-bff` (Hono o Next API, ver doc 00 §0.7)
- [ ] Implementar `src/lib/gateway/client.ts` (doc 01 §1.2)
- [ ] Generar tipos TS desde `/v1/openapi.json` (`npm run gateway:types`)
- [ ] Middleware de `correlation_id` (doc 01 §1.5)
- [ ] Health endpoints: `/api/health/live` y `/api/health/gateway` (con drift watch)
- [ ] Logger pino con redaction config
- [ ] Sentry inicializado
- [ ] Migrations `0001-0010` en Supabase (todas las tablas Mentex, doc 02)
- [ ] Trigger `handle_new_user` (auto-crea user_settings/streaks/premium al signup)

### Semana 2
- [ ] Endpoint `/api/coach/chat` con Vercel AI SDK + provider `gatewayModel` (doc 04)
- [ ] Tools básicos del Coach: `ritual_add`, `agenda_schedule_reminder`, `content_recommend`, `crisis_handle`
- [ ] Endpoints CRUD: `/api/ritual/items`, `/api/agenda/events`, `/api/agenda/reminders`
- [ ] Zod schemas Mentex-side por skill que el BFF invoca (doc 01 §1.3)
- [ ] Premium-gate basic + tabla `mentex.usage_quotas`

### Semana 3
- [ ] Ingestar 50 items de contenido demo a `mentex.content` (script doc 06)
- [ ] Endpoint `/api/content/catalog`
- [ ] Endpoint `/api/content/[id]/audio` (signed URLs R2 propio)
- [ ] Tests unitarios + integración (Vitest, coverage ≥70% módulos core: gateway client, auth, premium-gate)

**Criterio de aceptación Sprint B**:
- ✓ Coach responde en streaming desde un curl con JWT válido del Supabase Mentex.
- ✓ Tools del Coach ejecutan inserts reales en `mentex.*` tables.
- ✓ Catálogo de contenido browseable.
- ✓ Audio signed URL funcional (descarga 1 audiolibro de R2 Mentex).
- ✓ Migrations corren limpias en DB fresh.
- ✓ `correlation_id` aparece en cada log y se propaga al Gateway.

---

## Sprint C · Coach IA refinado + memoria (2 semanas)

**Objetivo**: Coach productivo con las 3 superficies de memoria (`/v1/memory`) + más tools + UI conectada.

### Semana 1
- [ ] Completar el set de tools del Coach (doc 04 §4.6): `rag_search`, `memory_recall`, `memory_store`, `voice_speak`.
- [ ] System prompt completo (doc 04 §4.5) iterado con Diego.
- [ ] Verificar nombres reales de skills vía `capability_search` + `skill_describe` y ajustar.
- [ ] `memory.conversation.recall` + `append` en cada turno del Coach.
- [ ] `memory.semantic.{search,store,forget}` operativos.
- [ ] Endpoint `DELETE /api/me` (GDPR right-to-erasure: `forget` + `clear` + purga Supabase).

### Semana 2
- [ ] Frontend: chat IA en Expo con streaming SSE (`react-native-sse`).
- [ ] Frontend: indicador visual "Coach está consultando..." cuando `tool-call` fires.
- [ ] Frontend: pantalla "Lo que recuerdo de ti" en Settings (lee `memory.semantic.search` con query genérica).
- [ ] Frontend: toggle "Borrar memoria del coach" (invoca el flujo de erasure).
- [ ] Test de crisis: input simulado → tool `crisis_handle` invocada → respuesta segura.

**Criterio de aceptación Sprint C**:
- ✓ Conversación de 10 mensajes con el Coach, llama tools reales, ejecuta acciones.
- ✓ Memoria persiste: día siguiente el Coach "recuerda" preferencias (vía `memory.semantic.search`).
- ✓ Crisis handler activado en test: respuesta segura + redirección profesional.
- ✓ Premium-gate funciona: user free a los 50 `skill.invoke`/día recibe `quota_exceeded`.
- ✓ Endpoint `DELETE /api/me` purga end-to-end (Supabase + Gateway memory).

---

## Sprint D · Monetización + Premium gates (2 semanas)

**Objetivo**: RevenueCat integrado end-to-end + premium gates activos.

### Semana 1
- [ ] Configurar productos en App Store Connect + Google Play Console
- [ ] Configurar RevenueCat: offerings, entitlements, webhook URL
- [ ] Frontend: `react-native-purchases` SDK + pantalla Paywall
- [ ] Endpoint `/api/subscription/webhook` (signature verify + idempotency)
- [ ] Función `updateUserPlanClaim` (cambia JWT claim al instante)

### Semana 2
- [ ] Premium gates en todos los endpoints (coach msgs, audio premium, integrations)
- [ ] Endpoint `/api/subscription/status`
- [ ] Frontend: useFeatureGate hook + lock cards en UI
- [ ] Restore purchases button
- [ ] Testing exhaustivo: sandbox iOS + Android + edge cases (cancel, restore, expire)
- [ ] Bonus credits al credit_ledger automático tras compra

**Criterio de aceptación Sprint D**:
- ✓ Flujo completo: user free → tap paywall → compra → webhook procesa → JWT claim actualizado → coach desbloqueado
- ✓ Cancel en App Store Sandbox → user mantiene premium hasta period_end → EXPIRATION event → downgrade
- ✓ Restore purchases recupera estado
- ✓ Sandbox events filtrados en producción

---

## Sprint E · Push notifications + Reminders engine (1-2 semanas)

**Objetivo**: notificaciones push funcionando con scheduling robusto.

### Semana 1
- [ ] Endpoint `/api/notifications/register` para device tokens
- [ ] Frontend: registrar Expo push token al primer launch
- [ ] Helper `sendPush()` con Expo Server SDK
- [ ] Función SQL `compute_next_fire` + trigger `set_reminder_next_fire`
- [ ] n8n workflow `mentex.reminder.notification` (cron 1min)
- [ ] Quiet hours check (`isInQuietHours`)

### Semana 2 (puede ser corto)
- [ ] Coach proactive proposals (workflow generar al final del día)
- [ ] Weekly recap workflow (lunes 9am)
- [ ] Frontend: deep link handler para tap en push notification
- [ ] Testing en device real iOS + Android: reminder timer pomodoro completa el flow

**Criterio de aceptación Sprint E**:
- ✓ Reminder "Meditar 7:30am daily" se dispara correctamente todos los días
- ✓ Reminder "Trabajar concentrado 25min" timer abre ActivityRunner al tap
- ✓ Quiet hours 22:00-07:00 silencia pushes excepto crisis/system
- ✓ Token invalidado (uninstall) se marca `is_active=false`

---

## Sprint F · Integraciones (2-3 semanas)

**Objetivo**: 5-8 integraciones core funcionando.

### Semana 1 — Google Calendar (la más crítica)
- [ ] OAuth flow completo (connect, callback, refresh, disconnect)
- [ ] n8n workflow `mentex.calendar.sync.google` (cron 15min)
- [ ] Encryption tokens via pgcrypto helpers (doc 02 section 209)
- [ ] Frontend: pantalla Integrations con connect/disconnect

### Semana 2 — Apple Calendar + Spotify
- [ ] Apple Calendar via `expo-calendar` (no OAuth — permission iOS)
- [ ] Sync nativo iOS: lee eventos, escribe a `mentex.agenda_events`
- [ ] Spotify OAuth + sync recent tracks → recomienda contenido similar

### Semana 3 — Notion, Linear, Todoist, Apple Health, Strava
- [ ] OAuth flows + sync workflows para cada uno
- [ ] Frontend: UI uniforme para todas las integrations

**Criterio de aceptación Sprint F**:
- ✓ Connect Google Calendar → eventos del próximo día aparecen en AgendaSheet en <1min
- ✓ Token refresh automático cuando expire (test: forzar expiration)
- ✓ Disconnect → tokens borrados + eventos del provider limpiados

---

## Sprint G · Polish + QA + App Store submission (2 semanas)

**Objetivo**: producto pulido y submitted a App Store + Play Store.

### Semana 1 — Polish
- [ ] Privacy Manifest iOS completo (xcprivacy)
- [ ] App Store Privacy Nutrition Label correcto
- [ ] Permisos contextuales (NSCalendarsUsageDescription, etc.)
- [ ] Settings: cancel account, export data (GDPR), restore purchases
- [ ] Age gate en onboarding (13+)
- [ ] Loading states + error states en TODAS las pantallas
- [ ] Empty states con CTAs
- [ ] OTA updates testeados (`eas update`)

### Semana 2 — Submission
- [ ] App Store screenshots (6.7", 6.5", 5.5" para iOS + tablet)
- [ ] Google Play screenshots (phone + tablet)
- [ ] App Store description (es + en) + keywords
- [ ] Privacy policy + Terms of Service URLs públicas
- [ ] Submit to App Store review
- [ ] Submit to Google Play review (closed testing first, then production)
- [ ] Tu QA acepta los builds finales

**Criterio de aceptación Sprint G**:
- ✓ App Store: status "In Review"
- ✓ Google Play: status "In Review" (closed testing track)
- ✓ No crashes detectados en Sentry > 0.5% sessions

---

## Sprint H · Post-launch + Optimization (continuo)

Una vez en stores:

### Inmediato (semana 1-2)
- [ ] Monitor crash rate, errors Sentry
- [ ] Monitor cost: tokens LLM, R2 bandwidth, Supabase rows
- [ ] Fast bug fixes via `eas update` (OTA)
- [ ] Responder a reviews App Store/Play

### Mes 1-3
- [ ] A/B test paywall (precio mensual vs annual prominence)
- [ ] Optimizar coach prompt basándose en patterns de uso real
- [ ] Tunear premium-gate quotas (G1) según costo real observado
- [ ] Solicitar a Helios skills custom si descubrimos gaps en el catálogo

### Mes 3-6 (future scope)
- [ ] Voice journal (transcripción + sentiment analysis)
- [ ] Wearables integrations (Apple Watch, Garmin)
- [ ] Voice TTS del coach (ElevenLabs / Coqui)
- [ ] Web version (`mentex.app` web app)
- [ ] B2B: `mentex_enterprise` para empresas

---

## Dependencias entre sprints

```
Sprint 0 (Setup)
   │
   ├──→ Sprint A (Expo migration) ──→ Sprint D (Monetization)
   │                                        │
   └──→ Sprint B (Backend foundation) ──→ Sprint C (Coach IA) ──→ Sprint E (Push) ──→ Sprint F (Integrations) ──→ Sprint G (Submission) ──→ Sprint H
```

**Paths críticos**:
1. Sprint 0 es bloqueante absoluto (sin 8 contract tests verdes no arrancan los demás).
2. Sprint A es bloqueante para D (sin frontend funcional, paywall no se prueba).
3. Sprint B es bloqueante para C (sin cliente Gateway + tools, no hay Coach).
4. Sprint D es bloqueante para Sprint F (premium gates en integrations).
5. Sprint E puede ir en paralelo con D si hay 2 devs.

**Paralelizable**:
- Sprint A (frontend) + Sprint B (backend) — recomendado
- Sprint E (push) puede empezar en mitad de Sprint D
- Sprint F (integrations) cada provider es independiente, paralelizable

---

## Riesgos identificados + mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|-----------|
| Apple App Review rechaza por "thin wrapper" | Media | Alta | El Coach IA es feature core, no wrapper. Documentar value-add en review notes. |
| Gateway Imperial issues con load mobile | Baja | Alta | Drift watch + alertas (doc 01 §1.6 / §1.8). Health checks pre-deploy. Escalar a Helios si hay degradación. |
| Cost LLM se dispara más de lo esperado | Media | Media | Premium-gate quotas activas desde día 1 (GAP G1 compensación). Métricas de costo estimado en Sentry/Prometheus. |
| Bug en webhook RC causa users sin premium pagado | Baja | Alta | Idempotency + retry RC 72h. Endpoint manual de sync con admin token. |
| Performance app pobre en Android low-end | Media | Media | Test en device real ($200 Android). Disable animations si <60fps. |
| Privacy review (Google Play) rechaza por OAuth | Baja | Media | Privacy policy explícita + DPA en cada integration. |
| Refresh token expira y user pierde sync | Alta | Baja | Refresh proactivo cada 5min antes de expiration. Notify user si falla 3 veces. |

---

## Métricas de éxito (60 días post-launch)

| Métrica | Target | Cómo medirlo |
|---------|--------|--------------|
| MAU | 1,000+ | Supabase auth.users active last 30d |
| D7 retention | ≥40% | Cohort analysis en Mentex DB |
| Conversion to Premium | ≥3% | `mentex.user_premium.plan='premium'` / total users |
| Avg coach msg/user/day | 4+ | `mentex.coach_messages` count / DAU |
| Avg ritual completed/user/week | 3+ | `mentex.ritual_sessions` completed |
| Crash-free rate | ≥99.5% | Sentry |
| p95 API latency | <500ms | Hosting analytics / Prometheus |
| Cost per active user | <$0.30/month | `mentex.cost_events` estimado / DAU (compensación G1) |

---

## Recursos necesarios

### Headcount mínimo
- 1 backend dev senior (Brandon, 1.0 FTE — sprints B, C, D, E, F).
- 1 frontend dev mid-senior (1.0 FTE — Sprint A, parte de D y G).
- 1 product/design part-time (Diego, supervisión + decisions).
- 1 QA freelance al final (Sprint G).

### Headcount ideal (acelera 30%)
- 2 backend devs
- 1 frontend dev
- 1 design polish part-time

### Costos estimados (mensual cuando esté live)

| Servicio | Costo dev (mes) | Costo prod 1k MAU (mes) | Costo prod 10k MAU |
|----------|-----------------|--------------------------|---------------------|
| Supabase | $0 (free tier) | $25 (Pro) | $599 (Team) |
| Vercel | $0 (Hobby) | $20 (Pro) | $20 |
| Cloudflare R2 | $0 | $1 (50GB) | $10 |
| RevenueCat | $0 | $0 (free <2.5k tracked rev) | $99 (Pro) |
| Anthropic/Gemini LLM | $50 | $200 (1k MAU × 30 msg × 0.7¢) | $1,500 |
| Sentry | $0 | $26 | $80 |
| Expo EAS | $0 (free) | $99 (Production) | $99 |
| Apple Developer | $99/year | $99/year | $99/year |
| Google Play | $25 one-time | $0 | $0 |
| **TOTAL** | **~$50/mes dev** | **~$370/mes** | **~$2,400/mes** |

Con 10k MAU al plan Premium $9.99 con 3% conversion = 300 × $9.99 = **$3,000 MRR**. **Margin >25%** cubre infra + leaves room.

---

## Lista de verificación pre-launch (Sprint G)

### Backend
- [ ] Todas las migrations corren en staging fresh
- [ ] RLS verificado: user no puede leer datos de otro user (test con 2 sessions)
- [ ] Webhook RC validates signature + idempotent
- [ ] Cost guard active en producción
- [ ] Sentry capturing errors en prod
- [ ] Backup automático configurado (daily snapshot Supabase)
- [ ] Health check endpoint sub-100ms p95

### Frontend
- [ ] No console.log en production builds (ESLint rule)
- [ ] All assets optimized (covers WebP, fonts subset)
- [ ] App size <50MB (iOS), <30MB (Android base APK)
- [ ] Privacy policy URL accesible (mentex.app/privacy)
- [ ] Terms URL accesible (mentex.app/terms)
- [ ] Deep links funcionando: `mentex://content/c-jobs`, `mentex://paywall`
- [ ] Restore purchases visible en Settings

### Compliance
- [ ] App Store Privacy Nutrition Label completo y correcto
- [ ] Privacy Manifest (xcprivacy) declarando todas APIs
- [ ] Apple Sign In disponible si hay otro social login
- [ ] Cancel account in-app linkeable
- [ ] Age gate 13+ en onboarding

### Operations
- [ ] On-call rotation establecida (mínimo Diego hasta hire CTO).
- [ ] Alertas configuradas (cost spike, error rate, downtime, gateway drift).
- [ ] Documentación interna (este `docs/backend/`) updated.
- [ ] Baseline de `info.version` + mesh fingerprints en `tests/contract/baseline.json` actualizado.

---

## Próximos pasos para arrancar HOY

1. **Diego entrega credenciales (canal privado)**:
   - `IMPERIAL_API_KEY` (Conexión B — Helios provisiona vía `console_create_api_key`).
   - `BRANDON_DEV_TOKEN` (Conexión A — token del Imperial Dev MCP).
   - Acceso al RevenueCat dashboard + project Sentry.

2. **Brandon (backend dev)**:
   - Lee `MENTEX_BACKEND_CONTRACT.md` (90 min) + docs 00 → 09.
   - Alta del Imperial Dev MCP: `claude mcp add --transport http imperial-dev https://mcp.empire-os.co/mcp --header "Authorization: Bearer <BRANDON_DEV_TOKEN>"`.
   - Provisiona Supabase Mentex project, R2 bucket, Sentry.
   - Crea repo `mentex-bff` greenfield.
   - **Implementa los 8 contract tests** (§8 del contrato). Sin verdes ⇒ Sprint A no arranca.

3. **Frontend dev**:
   - `npx create-expo-app mentex-app --template default` (TypeScript strict).
   - Setup paths, theme, Zustand stores.
   - Empieza portando Home Inactive.

4. **Daily standup** 15 min asíncrono.
5. **Weekly review** 1 h con Diego los viernes.

---

**Fin de la documentación de backend.**

Esta doc va a evolucionar — el programador debe actualizar cada vez que descubra algo no documentado, hay ambigüedad, o se cambien decisiones. Los docs viven en el repo, versionados con git. Cada cambio sustancial → commit con mensaje claro.

**Recordatorio final**: tu primer compromiso al arrancar es leer `MENTEX_BACKEND_CONTRACT.md` + los docs 00–09 completos. Después implementas el contract test rig (Sprint 0). Solo con 8/8 verdes arrancas Sprint A. Es el gating absoluto sellado por Diego + Helios.

Bienvenido. Construyamos algo legendario.
