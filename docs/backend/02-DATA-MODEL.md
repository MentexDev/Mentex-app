# 02 · Modelo de datos Mentex

**Prerequisitos:** [`MENTEX_BACKEND_CONTRACT.md`](./MENTEX_BACKEND_CONTRACT.md), [`00-EMPIRE-OVERVIEW.md`](./00-EMPIRE-OVERVIEW.md).

Este doc define **todas las tablas Mentex-específicas** con SQL real, RLS policies, indices.

> **Importante:** Mentex tiene su **propio Supabase project** (`mentex-prod` / `mentex-staging`). No comparte DB con el Imperio. Por eso las tablas **no tienen `tenant_id`** — el "tenant" Mentex es el proyecto Supabase entero. El aislamiento entre usuarios se hace por `user_id = auth.uid()` en RLS.

---

## 2.1 Convenciones

Toda tabla Mentex cumple estas reglas SIN excepción:

1. Vive en el schema **`mentex`** (no `public`). El schema lo creas con la migración 0001.
2. Tiene columna `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
3. Tiene columna `user_id UUID NOT NULL REFERENCES auth.users(id)` (excepto tablas globales como `mentex.content` que son cross-user).
4. Tiene `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` y `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
5. Tiene `deleted_at TIMESTAMPTZ` (soft delete). Las queries normales filtran `WHERE deleted_at IS NULL`.
6. Tiene `correlation_id TEXT` opcional para trazabilidad cross-service.
7. RLS habilitado desde el `CREATE TABLE`. Sin excepciones.
8. Foreign keys con `ON DELETE` policy explícita (`CASCADE` o `SET NULL`).
9. Indices en cada columna foreign key + cada columna usada en `WHERE`.

**Patrón de migración** (template):
```sql
-- migrations/00XX_<name>.sql

BEGIN;

CREATE TABLE IF NOT EXISTS mentex.<table_name> (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- columnas de negocio aquí
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  correlation_id TEXT
);

-- Indices obligatorios
CREATE INDEX idx_<table>_user ON mentex.<table>(user_id, deleted_at);
-- + indices específicos por columnas de WHERE

-- updated_at trigger
CREATE TRIGGER trg_<table>_updated_at
  BEFORE UPDATE ON mentex.<table>
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS — aislamiento puro por user_id
ALTER TABLE mentex.<table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own" ON mentex.<table>
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
```

**Helper `set_updated_at()`** (lo creas una vez en la migración 0001):
```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

---

## 2.2 Schema y tablas

### 200 · Crear el schema

```sql
-- migrations/0001_create_mentex_schema.sql
BEGIN;

CREATE SCHEMA IF NOT EXISTS mentex AUTHORIZATION postgres;
COMMENT ON SCHEMA mentex IS 'Mentex-specific tables. Aislamiento RLS por user_id = auth.uid().';

-- Permisos básicos
GRANT USAGE ON SCHEMA mentex TO authenticated, service_role;
GRANT ALL ON SCHEMA mentex TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA mentex
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA mentex
  GRANT EXECUTE ON FUNCTIONS TO authenticated;

COMMIT;
```

### 201 · User tables (settings, streaks, premium status)

```sql
-- migrations/0002_users_tables.sql
BEGIN;

-- ========================================
-- mentex.user_settings — preferencias del user
-- ========================================
CREATE TABLE mentex.user_settings (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locale        TEXT NOT NULL DEFAULT 'es',          -- 'es' | 'en'
  timezone      TEXT NOT NULL DEFAULT 'America/Bogota',
  theme         TEXT NOT NULL DEFAULT 'system',      -- 'system' | 'dark' | 'light'
  voice_id      TEXT,                                 -- voz preferida del coach (TTS futuro)
  display_name  TEXT,
  avatar_url    TEXT,                                 -- en Supabase Storage
  notifications JSONB NOT NULL DEFAULT jsonb_build_object(
    'reminders_enabled', true,
    'coach_proactive_enabled', true,
    'weekly_recap_enabled', true,
    'quiet_hours_start', '22:00',
    'quiet_hours_end', '07:00'
  ),
  privacy       JSONB NOT NULL DEFAULT jsonb_build_object(
    'analytics_enabled', true,
    'crash_reports_enabled', true,
    'memory_enabled', true                            -- el coach puede recordar
  ),
  onboarding    JSONB NOT NULL DEFAULT jsonb_build_object(
    'completed', false,
    'step', 'welcome',
    'goals', '[]'::jsonb,
    'experience_level', 'beginner'
  ),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON mentex.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE mentex.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.user_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- mentex.user_streaks — racha de días consecutivos
-- ========================================
CREATE TABLE mentex.user_streaks (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak       INT NOT NULL DEFAULT 0,
  longest_streak       INT NOT NULL DEFAULT 0,
  last_activity_date   DATE,                          -- último día con activity completada
  total_days_active    INT NOT NULL DEFAULT 0,
  total_minutes        INT NOT NULL DEFAULT 0,        -- minutos totales en sesiones
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_streaks_updated_at
  BEFORE UPDATE ON mentex.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE mentex.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.user_streaks
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- mentex.user_premium — estado de suscripción
-- ========================================
CREATE TABLE mentex.user_premium (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                   TEXT NOT NULL DEFAULT 'free',     -- 'free' | 'premium' | 'pro_plus'
  status                 TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'cancelled' | 'expired' | 'paused' | 'in_grace'
  revenuecat_app_user_id TEXT UNIQUE,                      -- el id de RevenueCat
  product_id             TEXT,                              -- ej. 'mentex_premium_monthly'
  platform               TEXT,                              -- 'ios' | 'android' | 'stripe'
  period_start           TIMESTAMPTZ,
  period_end             TIMESTAMPTZ,                       -- next renewal
  cancelled_at           TIMESTAMPTZ,
  is_in_trial            BOOLEAN NOT NULL DEFAULT false,
  trial_end_at           TIMESTAMPTZ,
  metadata               JSONB DEFAULT '{}',                -- evento original RC, etc.
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_premium_plan ON mentex.user_premium(plan, status);
CREATE INDEX idx_user_premium_rc ON mentex.user_premium(revenuecat_app_user_id);

CREATE TRIGGER trg_user_premium_updated_at
  BEFORE UPDATE ON mentex.user_premium
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE mentex.user_premium ENABLE ROW LEVEL SECURITY;
-- User puede LEER pero NO modificar (solo el webhook RC vía service_role)
CREATE POLICY "user_read_own" ON mentex.user_premium FOR SELECT USING (user_id = auth.uid());

COMMIT;
```

### 202 · Ritual tables

```sql
-- migrations/0003_ritual_tables.sql
BEGIN;

-- ========================================
-- mentex.ritual_items — lo que el user agendó para su día
-- (Equivalente al __mtxRitual del prototipo frontend)
-- ========================================
CREATE TABLE mentex.ritual_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id   UUID REFERENCES mentex.content(id) ON DELETE SET NULL,  -- opcional, link a content
  -- Snapshot del content al momento de agendar (sobrevive si content cambia/elimina)
  title        TEXT NOT NULL,
  author       TEXT,
  kind         TEXT NOT NULL,                       -- 'audiobook' | 'meditation' | 'talk' | 'series' | 'sound' | 'session'
  dur_seconds  INT NOT NULL DEFAULT 0,
  cover_url    TEXT,
  accent_color TEXT,
  bg_gradient  TEXT,
  -- Scheduling
  scheduled_for_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_time     TIME,                          -- opcional, hora del día
  scheduled_order    INT NOT NULL DEFAULT 0,        -- orden dentro del día
  -- Tracking
  status       TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'in_progress' | 'completed' | 'skipped'
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  play_pct     NUMERIC(3,2) DEFAULT 0,              -- 0.00 - 1.00
  metadata     JSONB DEFAULT '{}',
  -- Standard
  added_from   TEXT,                                 -- 'home_aprende_hoy' | 'explore_search' | 'coach_recommend' | 'agenda_picker'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,
  correlation_id TEXT
);
CREATE INDEX idx_ritual_items_user_date ON mentex.ritual_items(user_id, scheduled_for_date, deleted_at);
CREATE INDEX idx_ritual_items_status ON mentex.ritual_items(user_id, status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_ritual_items_updated_at
  BEFORE UPDATE ON mentex.ritual_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE mentex.ritual_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.ritual_items
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- mentex.ritual_routines — rutinas custom del user
-- (Meditar 10min, Leer 20pp, Caminar 3km, etc.)
-- ========================================
CREATE TABLE mentex.ritual_routines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,                    -- 'Meditar'
  icon_id         TEXT,                              -- 'leaf'
  color_id        TEXT,                              -- 'neon'
  accent          TEXT,                              -- '#3DFFD1'
  kind            TEXT,                              -- 'Mente' | 'Cuerpo' | 'Aprendizaje'
  metric_type     TEXT NOT NULL,                    -- 'duration' | 'count' | 'pages' | 'distance' | 'binary'
  metric_value    INT NOT NULL DEFAULT 0,
  metric_unit     TEXT,                              -- 'min' | 'veces' | 'pp' | 'km' | ''
  is_default      BOOLEAN NOT NULL DEFAULT false,   -- las 10 defaults vs creadas por user
  enabled         BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_ritual_routines_user ON mentex.ritual_routines(user_id, deleted_at);

CREATE TRIGGER trg_ritual_routines_updated_at
  BEFORE UPDATE ON mentex.ritual_routines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE mentex.ritual_routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.ritual_routines
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- mentex.ritual_sessions — sesiones activas (focus + apps blocked + routines)
-- ========================================
CREATE TABLE mentex.ritual_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Configuración
  duration_minutes   INT NOT NULL,                  -- 15, 30, 45, 60, 90, custom
  apps_blocked       TEXT[] NOT NULL DEFAULT '{}', -- ['instagram', 'tiktok', 'youtube']
  routines_selected  UUID[] NOT NULL DEFAULT '{}', -- ids de ritual_routines
  ritual_items_ids   UUID[] NOT NULL DEFAULT '{}', -- ids de ritual_items en esta sesión
  -- Lifecycle
  status             TEXT NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'completed' | 'abandoned'
  started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  paused_at          TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  abandoned_at       TIMESTAMPTZ,
  -- Outcomes
  elapsed_seconds    INT NOT NULL DEFAULT 0,        -- tiempo real transcurrido
  break_seconds      INT NOT NULL DEFAULT 0,        -- tiempo en breaks
  routines_completed UUID[] NOT NULL DEFAULT '{}',
  items_completed    UUID[] NOT NULL DEFAULT '{}',
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ritual_sessions_user_status ON mentex.ritual_sessions(user_id, status);
CREATE INDEX idx_ritual_sessions_started ON mentex.ritual_sessions(user_id, started_at DESC);

CREATE TRIGGER trg_ritual_sessions_updated_at
  BEFORE UPDATE ON mentex.ritual_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE mentex.ritual_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.ritual_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- mentex.routine_completions — histórico de cumplimiento (para streaks)
-- ========================================
CREATE TABLE mentex.routine_completions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id         UUID NOT NULL REFERENCES mentex.ritual_routines(id) ON DELETE CASCADE,
  session_id         UUID REFERENCES mentex.ritual_sessions(id) ON DELETE SET NULL,
  completed_for_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_actual      INT NOT NULL,                  -- cuánto cumplió (mins, count, etc.)
  metric_target      INT NOT NULL,                  -- cuánto era el objetivo
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_routine_completions_user_date ON mentex.routine_completions(user_id, completed_for_date DESC);
CREATE INDEX idx_routine_completions_routine ON mentex.routine_completions(routine_id);

ALTER TABLE mentex.routine_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.routine_completions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
```

### 203 · Agenda tables

```sql
-- migrations/0004_agenda_tables.sql
BEGIN;

-- ========================================
-- mentex.agenda_events — eventos del timeline (mentex auto-blocks + ritual injected)
-- ========================================
CREATE TABLE mentex.agenda_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Identidad
  source        TEXT NOT NULL,                      -- 'mentex' | 'calendar' | 'ritual' | 'reminder'
  source_id     TEXT,                                -- ID externo (Google Cal event_id, etc.)
  title         TEXT NOT NULL,
  description   TEXT,
  -- When
  event_date    DATE NOT NULL,
  start_time    TIME,
  duration_min  INT NOT NULL DEFAULT 30,
  all_day       BOOLEAN NOT NULL DEFAULT false,
  -- What
  event_kind    TEXT,                                -- 'focus' | 'meeting' | 'break' | 'mentex' | 'reminder' | 'personal'
  ritual_item_id UUID REFERENCES mentex.ritual_items(id) ON DELETE CASCADE,
  reminder_id   UUID REFERENCES mentex.reminders(id) ON DELETE CASCADE,
  -- Calendar sync
  calendar_provider TEXT,                            -- 'google' | 'apple' | null
  last_synced_at TIMESTAMPTZ,
  -- Standard
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX idx_agenda_events_user_date ON mentex.agenda_events(user_id, event_date, deleted_at);
CREATE INDEX idx_agenda_events_source ON mentex.agenda_events(user_id, source);
CREATE INDEX idx_agenda_events_calendar_sync ON mentex.agenda_events(user_id, calendar_provider, last_synced_at);
CREATE UNIQUE INDEX uniq_agenda_calendar_event
  ON mentex.agenda_events(user_id, calendar_provider, source_id)
  WHERE calendar_provider IS NOT NULL AND source_id IS NOT NULL;

CREATE TRIGGER trg_agenda_events_updated_at
  BEFORE UPDATE ON mentex.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE mentex.agenda_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.agenda_events
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- mentex.reminders — recordatorios + tareas timer (pomodoro)
-- ========================================
CREATE TABLE mentex.reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Contenido
  title           TEXT NOT NULL,
  notes           TEXT,
  -- Cuándo
  time_of_day     TIME,                              -- '07:30' o NULL si "cada N horas"
  every_n_hours   INT,                                -- si time_of_day NULL, cada cuántas horas
  -- Tipo (del refactor reciente)
  measure_kind    TEXT NOT NULL DEFAULT 'check',     -- 'check' | 'timer'
  duration_min    INT,                                -- si measure_kind='timer'
  -- Frecuencia
  recurrence      TEXT NOT NULL DEFAULT 'once',     -- 'once' | 'daily' | 'weekdays'
  weekdays        SMALLINT[] NOT NULL DEFAULT '{}', -- [0..6] L=0,M=1,...,D=6
  -- Estado
  completed       BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMPTZ,
  last_fired_at   TIMESTAMPTZ,                       -- última vez que se mandó push
  next_fire_at    TIMESTAMPTZ,                       -- siguiente cron fire (calculado)
  -- Push
  push_enabled    BOOLEAN NOT NULL DEFAULT true,
  -- Standard
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_reminders_user ON mentex.reminders(user_id, deleted_at);
CREATE INDEX idx_reminders_next_fire ON mentex.reminders(next_fire_at)
  WHERE deleted_at IS NULL AND push_enabled = true AND completed = false;

CREATE TRIGGER trg_reminders_updated_at
  BEFORE UPDATE ON mentex.reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE mentex.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.reminders
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- mentex.coach_proposals — sugerencias proactivas del coach (Ventana enfoque, Cierre, etc.)
-- ========================================
CREATE TABLE mentex.coach_proposals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,                      -- 'focus_slot' | 'day_close' | 'conflict' | 'recommendation'
  icon          TEXT,                                -- '🎯' | '🌙' | etc.
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  ctas          JSONB NOT NULL,                     -- [{ id, label, primary }]
  status        TEXT NOT NULL DEFAULT 'pending',    -- 'pending' | 'accepted' | 'dismissed' | 'expired'
  fire_at       TIMESTAMPTZ NOT NULL,                -- cuándo mostrársela
  expires_at    TIMESTAMPTZ,
  -- Si fue accepted, qué resultado
  accepted_at   TIMESTAMPTZ,
  dismissed_at  TIMESTAMPTZ,
  outcome       JSONB,                               -- resultado de la acción (ej: ritual session id)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coach_proposals_user_status ON mentex.coach_proposals(user_id, status, fire_at);

CREATE TRIGGER trg_coach_proposals_updated_at
  BEFORE UPDATE ON mentex.coach_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE mentex.coach_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.coach_proposals
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
```

### 204 · Content catalog tables

```sql
-- migrations/0005_content_tables.sql
BEGIN;

-- ========================================
-- mentex.content — catálogo de audiolibros, meditaciones, charlas, series, sonidos
-- (CROSS-USER — todos ven el mismo catálogo. user_id intencionalmente NULL.)
-- ========================================
CREATE TABLE mentex.content (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identidad
  slug            TEXT NOT NULL UNIQUE,              -- 'habitos-atomicos'
  title           TEXT NOT NULL,
  author          TEXT,
  author_id       UUID,                              -- futuro: tabla mentex.authors
  -- Tipo
  kind            TEXT NOT NULL,                     -- 'audiobook' | 'meditation' | 'talk' | 'series' | 'sound'
  category        TEXT,                              -- 'productividad' | 'mindfulness' | 'sueno' | ...
  tags            TEXT[] NOT NULL DEFAULT '{}',
  -- Visual
  cover_url       TEXT,                              -- en R2
  bg_gradient     TEXT,                              -- ej. 'linear-gradient(...)'
  accent_color    TEXT,                              -- ej. '#3dffd1'
  -- Audio/Video
  audio_url       TEXT,                              -- R2 signed URL base
  duration_seconds INT NOT NULL DEFAULT 0,
  -- Series
  episode_count   INT,                              -- si kind='series'
  parent_series_id UUID REFERENCES mentex.content(id), -- si es episodio
  episode_number  INT,
  -- Metadata
  description     TEXT,
  narrator        TEXT,                              -- 'Voz · Mentex AI' | 'Voz · Lucía'
  language        TEXT NOT NULL DEFAULT 'es',
  rating          NUMERIC(2,1) DEFAULT 0,
  plays           BIGINT NOT NULL DEFAULT 0,
  is_premium      BOOLEAN NOT NULL DEFAULT false,    -- requiere plan premium
  status          TEXT NOT NULL DEFAULT 'available', -- 'available' | 'coming-soon' | 'archived'
  release_date    DATE,                              -- si coming-soon
  is_new          BOOLEAN NOT NULL DEFAULT false,
  is_top_pick     BOOLEAN NOT NULL DEFAULT false,    -- "Imperdibles para ti"
  -- Standard
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_content_kind ON mentex.content(kind, status, deleted_at);
CREATE INDEX idx_content_category ON mentex.content(category);
CREATE INDEX idx_content_tags ON mentex.content USING GIN(tags);
CREATE INDEX idx_content_top_picks ON mentex.content(is_top_pick) WHERE is_top_pick = true;

CREATE TRIGGER trg_content_updated_at
  BEFORE UPDATE ON mentex.content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Content is publicly readable (catalog) — RLS deja leer a todos los authenticated del tenant
ALTER TABLE mentex.content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON mentex.content
  FOR SELECT
  USING (deleted_at IS NULL);
-- Solo sovereign/admin pueden INSERT/UPDATE/DELETE (ingesta de catálogo)

-- ========================================
-- mentex.content_progress — progreso del user por content
-- ========================================
CREATE TABLE mentex.content_progress (
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id           UUID NOT NULL REFERENCES mentex.content(id) ON DELETE CASCADE,
  play_pct             NUMERIC(3,2) NOT NULL DEFAULT 0,   -- 0.00 - 1.00
  last_position_sec    INT NOT NULL DEFAULT 0,
  total_plays          INT NOT NULL DEFAULT 0,
  completed_at         TIMESTAMPTZ,
  first_played_at      TIMESTAMPTZ,
  last_played_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, content_id)
);
CREATE INDEX idx_content_progress_user ON mentex.content_progress(user_id, last_played_at DESC);

ALTER TABLE mentex.content_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.content_progress
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- mentex.playlists — playlists del user (incluyendo "Ver más tarde")
-- ========================================
CREATE TABLE mentex.playlists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  is_official     BOOLEAN NOT NULL DEFAULT false,    -- playlists curadas por Mentex
  is_pinned       BOOLEAN NOT NULL DEFAULT false,    -- "Ver más tarde" pinned
  is_watch_later  BOOLEAN NOT NULL DEFAULT false,
  cover_url       TEXT,
  accent_color    TEXT,
  total_videos    INT NOT NULL DEFAULT 0,            -- denormalized
  total_seconds   INT NOT NULL DEFAULT 0,
  total_views     BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_playlists_user ON mentex.playlists(user_id, deleted_at);

CREATE TRIGGER trg_playlists_updated_at
  BEFORE UPDATE ON mentex.playlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE mentex.playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.playlists
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- mentex.playlist_items — items de cada playlist
-- ========================================
CREATE TABLE mentex.playlist_items (
  playlist_id  UUID NOT NULL REFERENCES mentex.playlists(id) ON DELETE CASCADE,
  content_id   UUID NOT NULL REFERENCES mentex.content(id) ON DELETE CASCADE,
  sort_order   INT NOT NULL DEFAULT 0,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, content_id)
);
CREATE INDEX idx_playlist_items_order ON mentex.playlist_items(playlist_id, sort_order);

-- ========================================
-- mentex.content_history — histórico cronológico de qué escuchó el user
-- ========================================
CREATE TABLE mentex.content_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id   UUID NOT NULL REFERENCES mentex.content(id) ON DELETE CASCADE,
  played_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_sec INT NOT NULL DEFAULT 0,                -- cuánto escuchó esta vez
  source       TEXT,                                   -- 'explore' | 'ritual' | 'agenda' | 'search'
  device_kind  TEXT                                    -- 'ios' | 'android'
);
CREATE INDEX idx_content_history_user ON mentex.content_history(user_id, played_at DESC);
CREATE INDEX idx_content_history_content ON mentex.content_history(content_id, played_at DESC);

ALTER TABLE mentex.content_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.content_history
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
```

### 205 · Subscription tables

```sql
-- migrations/0006_subscription_tables.sql
BEGIN;

-- ========================================
-- mentex.subscriptions — eventos de suscripción (audit log)
-- ========================================
CREATE TABLE mentex.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revenuecat_event_id    TEXT NOT NULL UNIQUE,        -- idempotency key
  event_type             TEXT NOT NULL,                -- 'INITIAL_PURCHASE' | 'RENEWAL' | 'CANCELLATION' | 'EXPIRATION' | 'BILLING_ISSUE' | 'PRODUCT_CHANGE' | 'TRANSFER' | ...
  product_id             TEXT NOT NULL,
  platform               TEXT,                          -- 'ios' | 'android'
  price_usd              NUMERIC(10,2),
  currency               TEXT,
  period_start           TIMESTAMPTZ,
  period_end             TIMESTAMPTZ,
  is_trial               BOOLEAN NOT NULL DEFAULT false,
  store_transaction_id   TEXT,
  raw_event              JSONB NOT NULL,               -- RevenueCat webhook payload entero
  processed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_user ON mentex.subscriptions(user_id, created_at DESC);
CREATE INDEX idx_subscriptions_event ON mentex.subscriptions(event_type, created_at DESC);

-- Append-only — no UPDATE policy
ALTER TABLE mentex.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_read_own" ON mentex.subscriptions FOR SELECT USING (user_id = auth.uid());

-- ========================================
-- mentex.usage_quotas — quotas por user (free vs premium)
-- ========================================
CREATE TABLE mentex.usage_quotas (
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period                 TEXT NOT NULL,                -- '2026-05' (mensual) o '2026-05-15' (diario)
  metric                 TEXT NOT NULL,                -- 'coach_messages' | 'audio_minutes' | 'premium_content_plays'
  used                   BIGINT NOT NULL DEFAULT 0,
  quota_limit            BIGINT NOT NULL,
  reset_at               TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, period, metric)
);
CREATE INDEX idx_usage_quotas_user ON mentex.usage_quotas(user_id, period);

ALTER TABLE mentex.usage_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_read_own" ON mentex.usage_quotas FOR SELECT USING (user_id = auth.uid());

COMMIT;
```

### 206 · Notifications tables

```sql
-- migrations/0007_notifications_tables.sql
BEGIN;

-- ========================================
-- mentex.device_tokens — push tokens por device del user
-- ========================================
CREATE TABLE mentex.device_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL UNIQUE,
  platform      TEXT NOT NULL,                       -- 'ios' | 'android'
  device_name   TEXT,                                 -- "iPhone de Juan"
  app_version   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_device_tokens_user ON mentex.device_tokens(user_id, is_active);

ALTER TABLE mentex.device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.device_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- mentex.notifications_log — audit log de pushes enviados
-- ========================================
CREATE TABLE mentex.notifications_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL,                    -- 'reminder' | 'coach_proactive' | 'weekly_recap' | 'system'
  source_id        UUID,                              -- reminder_id, proposal_id, etc.
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  data             JSONB DEFAULT '{}',                -- payload custom
  expo_receipt_id  TEXT,
  status           TEXT NOT NULL DEFAULT 'queued',   -- 'queued' | 'sent' | 'delivered' | 'failed'
  error_message    TEXT,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_log_user ON mentex.notifications_log(user_id, created_at DESC);
CREATE INDEX idx_notifications_log_status ON mentex.notifications_log(status, created_at);

ALTER TABLE mentex.notifications_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_read_own" ON mentex.notifications_log FOR SELECT USING (user_id = auth.uid());

COMMIT;
```

### 207 · Integrations tables

```sql
-- migrations/0008_integrations_tables.sql
BEGIN;

-- ========================================
-- mentex.integrations — OAuth tokens por provider/user
-- (TOKENS ENCRYPTED at rest — usar Supabase Vault o pgcrypto)
-- ========================================
CREATE TABLE mentex.integrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,                   -- 'google_calendar' | 'apple_calendar' | 'spotify' | 'notion' | 'linear' | 'todoist' | 'gmail' | 'slack' | 'instagram' | 'x' | 'linkedin' | 'youtube' | 'apple_health' | 'strava'
  status            TEXT NOT NULL DEFAULT 'connected', -- 'connected' | 'expired' | 'disconnected' | 'error'
  -- Tokens (cifrados, ver función encrypt_token() abajo)
  access_token_enc  BYTEA,                            -- encrypted
  refresh_token_enc BYTEA,                            -- encrypted
  token_expires_at  TIMESTAMPTZ,
  scopes            TEXT[] NOT NULL DEFAULT '{}',
  -- Metadata del provider
  external_user_id  TEXT,                             -- el id del user en el provider
  external_email    TEXT,
  metadata          JSONB DEFAULT '{}',
  -- Sync info
  last_sync_at      TIMESTAMPTZ,
  last_sync_status  TEXT,                             -- 'success' | 'partial' | 'failed'
  last_sync_error   TEXT,
  -- Standard
  connected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);
CREATE INDEX idx_integrations_user ON mentex.integrations(user_id, status);
CREATE INDEX idx_integrations_sync ON mentex.integrations(provider, last_sync_at)
  WHERE status = 'connected';

CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON mentex.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE mentex.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_read_metadata" ON mentex.integrations
  FOR SELECT
  USING (user_id = auth.uid())
  -- Nota: las RLS de SELECT NO cifran columnas individuales.
  -- Para que el user NUNCA vea sus tokens, NO seleccionarlos en el query desde frontend.
  -- El frontend solo lee status, provider, scopes, connected_at, external_email.
  -- Los tokens (access_token_enc, refresh_token_enc) SOLO los lee el service_role en backend.
;
CREATE POLICY "user_insert_own" ON mentex.integrations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_delete_own" ON mentex.integrations
  FOR DELETE USING (user_id = auth.uid());
-- UPDATE solo desde service_role (refresh tokens, sync status, etc.)

COMMIT;
```

### 208 · Coach conversations (historial UI-side)

> **La memoria persistente del Coach NO vive en Mentex DB.** Las 3 superficies (conversation, episodic, semantic) viven en `/v1/memory` del Gateway, scoped por `tenant=mentex` + `user_id`. Ver [`04-AI-COACH.md`](./04-AI-COACH.md) §4.8.
>
> Lo que **sí vive** Mentex-side son las tablas para mostrar al usuario su historial de chat en la app (lista de conversaciones + mensajes renderizados). Son tablas de presentación, no de memoria semántica.

```sql
-- migrations/0008_coach_conversations.sql
BEGIN;

-- ========================================
-- mentex.coach_conversations — sesiones de chat (UI list)
-- ========================================
CREATE TABLE mentex.coach_conversations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT,                              -- auto-generado del 1er mensaje
  message_count  INT NOT NULL DEFAULT 0,
  tokens_used    BIGINT NOT NULL DEFAULT 0,
  cost_usd_micro BIGINT NOT NULL DEFAULT 0,
  archived       BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coach_conv_user ON mentex.coach_conversations(user_id, updated_at DESC);

CREATE TRIGGER trg_coach_conversations_updated_at
  BEFORE UPDATE ON mentex.coach_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE mentex.coach_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.coach_conversations
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- mentex.coach_messages — mensajes individuales
-- ========================================
CREATE TABLE mentex.coach_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES mentex.coach_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,                    -- 'user' | 'assistant' | 'system' | 'tool'
  content         TEXT NOT NULL,
  tool_calls      JSONB,                             -- si el assistant llamó tools
  tool_call_id    TEXT,                              -- si role='tool'
  tokens_input    INT,
  tokens_output   INT,
  cost_usd_micro  BIGINT,
  provider        TEXT,                              -- 'claude-sonnet-4-6' | 'gemini-flash' | etc.
  rag_chunks      INT,
  cached          BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coach_messages_conv ON mentex.coach_messages(conversation_id, created_at);

ALTER TABLE mentex.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON mentex.coach_messages
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
```

### 209 · Token encryption helpers

```sql
-- migrations/0009_token_encryption.sql
-- Para los tokens OAuth de mentex.integrations
BEGIN;

-- Habilitar pgcrypto si no está
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Variable: la clave maestra vive en GUC custom (config separada)
-- Setup una vez al provisionar el proyecto Supabase:
-- ALTER DATABASE postgres SET app.token_encryption_key = '<32-byte-base64>';

-- Helper para cifrar tokens
CREATE OR REPLACE FUNCTION mentex.encrypt_token(p_plaintext TEXT)
RETURNS BYTEA
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_key TEXT;
BEGIN
  v_key := current_setting('app.token_encryption_key', true);
  IF v_key IS NULL OR length(v_key) < 32 THEN
    RAISE EXCEPTION 'Token encryption key not configured';
  END IF;
  RETURN pgp_sym_encrypt(p_plaintext, v_key)::BYTEA;
END;
$$;

-- Helper para descifrar
CREATE OR REPLACE FUNCTION mentex.decrypt_token(p_ciphertext BYTEA)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_key TEXT;
BEGIN
  v_key := current_setting('app.token_encryption_key', true);
  IF v_key IS NULL OR length(v_key) < 32 THEN
    RAISE EXCEPTION 'Token encryption key not configured';
  END IF;
  RETURN pgp_sym_decrypt(p_ciphertext, v_key);
END;
$$;

REVOKE ALL ON FUNCTION mentex.encrypt_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION mentex.decrypt_token(BYTEA) FROM PUBLIC;
-- Solo service_role puede ejecutarlas
GRANT EXECUTE ON FUNCTION mentex.encrypt_token(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION mentex.decrypt_token(BYTEA) TO service_role;

COMMIT;
```

**Uso desde código** (backend service_role):
```typescript
// Al guardar un OAuth token — vía RPC (encrypta internamente):
await supabaseAdmin.rpc('integration_save_tokens', {
  p_user_id: userId,
  p_provider: 'google_calendar',
  p_access_token: accessTokenPlaintext,
  p_refresh_token: refreshTokenPlaintext,
  p_expires_at: expiresAtIso,
  p_scopes: scopesArray,
});
// (la RPC encrypta internamente con encrypt_token() y hace el INSERT)
```

---

## 2.3 Funciones auxiliares Mentex

```sql
-- migrations/0010_helper_functions.sql
BEGIN;

-- ========================================
-- mentex.recompute_streak — recalcula racha de un user
-- (Invocada por n8n workflow diario)
-- ========================================
CREATE OR REPLACE FUNCTION mentex.recompute_streak(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = mentex, public AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - 1;
  v_last_date DATE;
  v_current INT;
  v_longest INT;
BEGIN
  -- Obtener última actividad
  SELECT MAX(completed_for_date) INTO v_last_date
  FROM routine_completions WHERE user_id = p_user_id;

  -- Obtener current_streak y longest_streak actuales
  SELECT current_streak, longest_streak INTO v_current, v_longest
  FROM user_streaks WHERE user_id = p_user_id;

  -- Si última actividad fue hoy: incremento solo si ayer también tenía
  IF v_last_date = v_today THEN
    IF EXISTS (SELECT 1 FROM routine_completions WHERE user_id = p_user_id AND completed_for_date = v_yesterday) THEN
      v_current := v_current + 1;
    ELSE
      v_current := 1;
    END IF;
  -- Si última fue ayer: continuo el streak
  ELSIF v_last_date = v_yesterday THEN
    -- noop (streak vigente, no incrementa hasta que complete hoy)
    NULL;
  -- Cualquier otra cosa: ruptura
  ELSE
    v_current := 0;
  END IF;

  v_longest := GREATEST(v_longest, v_current);

  UPDATE user_streaks
  SET current_streak = v_current,
      longest_streak = v_longest,
      last_activity_date = v_last_date,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION mentex.recompute_streak(UUID) TO service_role;

-- ========================================
-- mentex.get_content_signed_url — genera signed URL R2 con expiración 1h
-- (Llamada desde route /api/mentex/content/[id])
-- ========================================
-- NOTA: la firma se hace en TypeScript con el SDK Cloudflare, no en SQL.
-- Esta función SQL solo registra el evento de "play started" para tracking.

CREATE OR REPLACE FUNCTION mentex.record_content_play(
  p_user_id UUID,
  p_content_id UUID,
  p_source TEXT DEFAULT NULL,
  p_device TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = mentex, public AS $$
BEGIN
  INSERT INTO content_history (user_id, content_id, source, device_kind)
  VALUES (p_user_id, p_content_id, p_source, p_device);

  -- Increment plays counter
  UPDATE content SET plays = plays + 1 WHERE id = p_content_id;

  -- Upsert progress
  INSERT INTO content_progress (user_id, content_id, total_plays, first_played_at, last_played_at)
  VALUES (p_user_id, p_content_id, 1, now(), now())
  ON CONFLICT (user_id, content_id) DO UPDATE
  SET total_plays = content_progress.total_plays + 1,
      last_played_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION mentex.record_content_play(UUID, UUID, TEXT, TEXT) TO authenticated;

-- ========================================
-- mentex.get_today_timeline — devuelve agenda del día para un user
-- ========================================
CREATE OR REPLACE FUNCTION mentex.get_today_timeline(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  id UUID,
  source TEXT,
  title TEXT,
  description TEXT,
  start_time TIME,
  duration_min INT,
  event_kind TEXT,
  ritual_item_id UUID,
  reminder_id UUID,
  calendar_provider TEXT
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  -- Eventos directos
  SELECT id, source, title, description, start_time, duration_min, event_kind, ritual_item_id, reminder_id, calendar_provider
  FROM mentex.agenda_events
  WHERE user_id = p_user_id AND event_date = p_date AND deleted_at IS NULL
  UNION ALL
  -- Ritual items inyectados que no tienen agenda_event
  SELECT ri.id, 'ritual'::TEXT, ri.title, NULL, ri.scheduled_time, (ri.dur_seconds/60)::INT,
         'mentex'::TEXT, ri.id, NULL::UUID, NULL::TEXT
  FROM mentex.ritual_items ri
  WHERE ri.user_id = p_user_id AND ri.scheduled_for_date = p_date AND ri.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM mentex.agenda_events ae WHERE ae.ritual_item_id = ri.id)
  UNION ALL
  -- Reminders del día
  SELECT r.id, 'reminder'::TEXT, r.title, r.notes, r.time_of_day, COALESCE(r.duration_min, 20),
         'reminder'::TEXT, NULL::UUID, r.id, NULL::TEXT
  FROM mentex.reminders r
  WHERE r.user_id = p_user_id AND r.deleted_at IS NULL
    AND r.time_of_day IS NOT NULL
    AND (
      r.recurrence = 'daily'
      OR (r.recurrence = 'once' AND DATE(r.next_fire_at) = p_date)
      OR (r.recurrence = 'weekdays' AND ((EXTRACT(DOW FROM p_date)::INT + 6) % 7) = ANY(r.weekdays))
    )
  ORDER BY start_time NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION mentex.get_today_timeline(UUID, DATE) TO authenticated;

COMMIT;
```

---

## 2.4 Diagrama de relaciones (visual)

```
        ┌─────────────── auth.users ────────────────────┐
        │                       │                          │
        │ user_id               │ user_id                  │ user_id
        ▼                       ▼                          ▼
mentex.user_settings    mentex.user_streaks        mentex.user_premium
                                                        │
                                                        │ (RC events)
                                                        ▼
                                              mentex.subscriptions

  ┌───────────── auth.users (user_id) ────────────────────────────┐
  ▼                  ▼                ▼                            ▼
mentex.ritual_items  mentex.agenda_events   mentex.reminders  mentex.coach_conversations
  │                  │                                              │
  │ content_id       │ ritual_item_id                              │
  ▼                  └─→ mentex.ritual_items                       ▼
mentex.content                                                mentex.coach_messages
  │
  │ (catalog cross-user)
  ▼
mentex.content_progress  ◄── user
mentex.content_history   ◄── user
mentex.playlists         ◄── user
  │
  ▼
mentex.playlist_items

Memoria del Coach (NO vive en Mentex DB):
  → conversation/episodic/semantic delegada a /v1/memory del Gateway
    (scoped tenant=mentex + user_id en body). Ver doc 04 §4.8.
```

---

## 2.5 Verificación post-migration

Después de correr las migraciones, ejecuta este script para verificar:

```sql
-- migrations/verify.sql

-- 1. Schema existe
SELECT 1 FROM information_schema.schemata WHERE schema_name = 'mentex';

-- 2. Todas las tablas tienen RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'mentex'
ORDER BY tablename;
-- Todas deben tener rowsecurity = true

-- 3. Todas las tablas tienen al menos 1 policy
SELECT schemaname, tablename, count(*) AS policies
FROM pg_policies
WHERE schemaname = 'mentex'
GROUP BY 1, 2
ORDER BY 2;
-- Mínimo 1 por tabla (user_own o user_read_own)

-- 4. Indices presentes
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'mentex'
ORDER BY 1, 2;

-- 5. Triggers de updated_at presentes
SELECT tgname, tgrelid::regclass FROM pg_trigger
WHERE tgname LIKE 'trg_%_updated_at' AND tgrelid::regclass::text LIKE 'mentex.%';
```

**Siguiente doc**: [`03-AUTH-AND-TENANCY.md`](./03-AUTH-AND-TENANCY.md) — Supabase Auth + Apple/Google Sign In + JWT claims + RLS strategy.
