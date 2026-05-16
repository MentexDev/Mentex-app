# 06 · Content catalog — R2 + signed URLs + ingesta

## 6.1 Stack

- **Storage**: Cloudflare R2 bucket `mentex-content` (creado durante provisioning, doc 01).
- **CDN**: R2 sirve con $0 egress + cache automático.
- **Signed URLs**: SDK Cloudflare con expiración 1h. Generadas server-side cada vez que user inicia play.
- **DRM básico**: no usamos DRM real (compromiso pragmático), pero rotamos signed URL y validamos premium gate.
- **Audio format**: AAC 128kbps mono (suficiente para voz, archivos pequeños), M4A container. Bitrate adaptativo futuro con HLS si justifica.
- **Imagery (covers, thumbnails)**: WebP 800×800 + 400×400, en Supabase Storage (acceso público read).

## 6.2 Estructura del bucket R2

```
mentex-content/                          (bucket)
├── audiobooks/
│   ├── c-habitos/
│   │   ├── full.m4a                     (audiobook completo, 4h 32m)
│   │   └── ch01.m4a, ch02.m4a, ...      (capítulos individuales)
│   └── c-deepwork/
│       └── full.m4a
├── meditations/
│   ├── c-respira/
│   │   └── audio.m4a                    (12 min)
│   └── c-dormir/
│       └── audio.m4a                    (20 min)
├── talks/
│   ├── c-jobs/
│   │   └── audio.m4a                    (15 min)
│   └── c-rams/
│       └── audio.m4a                    (24 min)
├── series/
│   └── c-disciplina/
│       ├── ep01.m4a, ep02.m4a, ...
└── sounds/
    ├── forest.m4a                       (loops 5min ambient)
    ├── ocean.m4a
    └── rain.m4a

mentex-thumbnails/                       (Supabase Storage, public read)
├── audiobooks/c-habitos.webp
├── meditations/c-respira.webp
└── ...
```

## 6.3 Generación de signed URLs

```typescript
// lib/mentex/content/r2.ts
import { AwsClient } from 'aws4fetch';

const r2 = new AwsClient({
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  service: 's3',
  region: 'auto',
});

const R2_ENDPOINT = `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_BUCKET = process.env.R2_BUCKET_MENTEX!;

export async function getSignedAudioUrl(
  audioPath: string,
  options: { expiresInSeconds?: number; userId: string; correlationId: string } = { userId: '', correlationId: '' }
): Promise<string> {
  const url = new URL(`${R2_ENDPOINT}/${R2_BUCKET}/${audioPath}`);
  url.searchParams.set('X-Amz-Expires', String(options.expiresInSeconds ?? 3600));

  const signed = await r2.sign(url, {
    method: 'GET',
    aws: { signQuery: true },
  });

  return signed.url;
}
```

## 6.4 Endpoint para servir audio con signed URL + premium check

```typescript
// app/api/mentex/content/[id]/audio/route.ts
import { authenticateMentexRequest } from '@/lib/mentex/auth/middleware';
import { getSignedAudioUrl } from '@/lib/mentex/content/r2';
import { supabaseAdmin } from '@/lib/mentex/db/admin';
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await authenticateMentexRequest(req);
  if ('status' in authResult) return authResult;
  const { user } = authResult;

  const contentId = params.id;

  // 1. Cargar content metadata (audio_url is internal R2 path)
  const { data: content, error } = await supabaseAdmin
    .from('content')
    .select('id, slug, kind, audio_url, is_premium, status, duration_seconds')
    .eq('id', contentId)
    .single();

  if (error || !content) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  if (content.status !== 'available') {
    return NextResponse.json({ error: 'Content unavailable' }, { status: 410 });
  }

  // 2. Premium gate
  if (content.is_premium && user.plan === 'free') {
    return NextResponse.json({
      error: 'premium_required',
      upgrade_url: `mentex://paywall?context=premium_content&content_id=${contentId}`,
    }, { status: 402 });
  }

  // 3. Daily quota check (audio_minutes para users free)
  if (user.plan === 'free') {
    const today = new Date().toISOString().slice(0, 10);
    const { data: quota } = await supabaseAdmin
      .from('usage_quotas')
      .select('used, quota_limit')
      .eq('user_id', user.userId)
      .eq('period', today)
      .eq('metric', 'audio_minutes')
      .maybeSingle();

    const limit = quota?.quota_limit ?? 60;  // 60 min/day free
    const used = quota?.used ?? 0;
    if (used >= limit) {
      return NextResponse.json({
        error: 'quota_exceeded',
        used_minutes: used,
        limit_minutes: limit,
      }, { status: 429 });
    }
  }

  // 4. Generar signed URL
  const signedUrl = await getSignedAudioUrl(content.audio_url, {
    expiresInSeconds: 3600,    // 1h
    userId: user.userId,
    correlationId: user.correlationId,
  });

  // 5. Record play (async, no esperar)
  supabaseAdmin
    .rpc('record_content_play', {
      p_user_id: user.userId,
      p_content_id: contentId,
      p_source: req.headers.get('x-source') ?? 'unknown',
      p_device: req.headers.get('x-device-kind') ?? 'unknown',
    })
    .then();

  return NextResponse.json({
    audio_url: signedUrl,
    expires_in_seconds: 3600,
    duration_seconds: content.duration_seconds,
  });
}
```

## 6.5 Browse catalog endpoint

```typescript
// app/api/mentex/content/catalog/route.ts
import { authenticateMentexRequest } from '@/lib/mentex/auth/middleware';
import { z } from 'zod';

const QuerySchema = z.object({
  kind: z.enum(['audiobook', 'meditation', 'talk', 'series', 'sound', 'all']).optional().default('all'),
  category: z.string().optional(),
  query: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort: z.enum(['popular', 'recent', 'a-z']).optional().default('popular'),
});

export async function GET(req: NextRequest) {
  const authResult = await authenticateMentexRequest(req);
  if ('status' in authResult) return authResult;
  const { user, supabase } = authResult;

  const url = new URL(req.url);
  const params = QuerySchema.parse(Object.fromEntries(url.searchParams));

  let query = supabase
    .from('content')
    .select(`
      id, slug, title, author, kind, category, tags,
      cover_url, bg_gradient, accent_color,
      duration_seconds, plays, rating,
      is_premium, status, is_new, is_top_pick
    `)
    .is('deleted_at', null);

  if (params.kind !== 'all') query = query.eq('kind', params.kind);
  if (params.category) query = query.eq('category', params.category);
  if (params.query) query = query.textSearch('title', params.query, { type: 'websearch', config: 'spanish' });

  switch (params.sort) {
    case 'popular': query = query.order('plays', { ascending: false }); break;
    case 'recent': query = query.order('created_at', { ascending: false }); break;
    case 'a-z': query = query.order('title', { ascending: true }); break;
  }

  query = query.range(params.offset, params.offset + params.limit - 1);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: data,
    total: count,
    user_plan: user.plan,    // frontend lo usa para mostrar lock en premium content
  });
}
```

## 6.6 Top picks personalizados

Mentex empieza con filtrado/ranking local (OWN). Para personalización profunda, delega a `memory.semantic.search` + opcionalmente `brain.query` del Gateway.

```typescript
// src/lib/content/recommendations.ts
import { db } from '../db/client';
import { gateway } from '../gateway/client';

export async function getRecommendations(opts: {
  userId: string;
  correlationId: string;
  limit?: number;
}) {
  const limit = opts.limit ?? 5;

  // 1. Recuperar hechos semánticos del usuario desde el Gateway
  const recall = await gateway.invoke('memory.semantic.search', {
    user_id: opts.userId,
    query: 'content preferences, interests, current goals',
    limit: 10,
  }, { correlationId: opts.correlationId });

  const facts = (recall.result as any)?.facts ?? [];

  // 2. Filtrado local OWN — sin embeddings Mentex-side
  let q = db
    .from('content')
    .select('id, slug, title, author, kind, cover_url, accent_color, duration_seconds, tags')
    .is('deleted_at', null)
    .eq('status', 'available');

  if (facts.length === 0) {
    // Fallback: top_picks manual
    return await q.eq('is_top_pick', true).order('plays', { ascending: false }).limit(limit);
  }

  // 3. Extraer tags inferidos de los facts y filtrar
  const inferredTags = inferTagsFromFacts(facts);
  if (inferredTags.length > 0) {
    q = q.overlaps('tags', inferredTags);
  }

  // 4. Excluir contenido ya consumido (>30% played)
  const { data: played } = await db
    .from('content_progress')
    .select('content_id')
    .eq('user_id', opts.userId)
    .gt('play_pct', 0.3);
  const playedIds = (played ?? []).map((r: any) => r.content_id);
  if (playedIds.length > 0) q = q.not('id', 'in', `(${playedIds.join(',')})`);

  const { data } = await q.order('plays', { ascending: false }).limit(limit);
  return data;
}

function inferTagsFromFacts(facts: Array<{ fact: string }>): string[] {
  // Implementación simple inicial: keyword extraction básica.
  // Si quieres algo más sofisticado, invoca `brain.query` con el join de facts
  // y deja que el LLM proponga tags relevantes del catálogo.
  return [];
}
```

> Si la recomendación necesita ser más rica (semánticamente conectada al contenido del Atlas Brain del Gateway), reemplaza la inferencia local por una llamada a `brain.query` con el texto del usuario. Decisión Mentex-side: empieza simple, mueve a Gateway cuando el simple no sea suficiente (regla §3.3 del contrato).

## 6.7 Ingesta de catálogo (admin tool)

Para agregar nuevo contenido al catálogo, el admin Mentex (content team) tiene un workflow n8n:

```typescript
// scripts/admin/ingest-content.ts
// Run con tsx scripts/admin/ingest-content.ts <path-to-manifest.json>

import { supabaseAdmin } from '@/lib/mentex/db/admin';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { uploadToR2 } from '@/lib/mentex/content/r2';
import fs from 'fs/promises';

interface ContentManifest {
  slug: string;
  title: string;
  author: string;
  kind: 'audiobook' | 'meditation' | 'talk' | 'series' | 'sound';
  category: string;
  tags: string[];
  description: string;
  narrator?: string;
  language: 'es' | 'en';
  duration_seconds: number;
  is_premium: boolean;
  audio_file_local_path: string;    // path local al m4a
  cover_image_local_path: string;   // path local al webp
  metadata?: Record<string, unknown>;
}

async function ingestContent(manifestPath: string) {
  const manifest: ContentManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

  // 1. Upload audio a R2
  const audioR2Path = `${manifest.kind}s/${manifest.slug}/full.m4a`;
  await uploadToR2(audioR2Path, manifest.audio_file_local_path);

  // 2. Upload cover a Supabase Storage
  const coverFile = await fs.readFile(manifest.cover_image_local_path);
  const { data: upload } = await supabaseAdmin.storage
    .from('mentex-thumbnails')
    .upload(`${manifest.kind}s/${manifest.slug}.webp`, coverFile, { upsert: true });
  const cover_url = supabaseAdmin.storage.from('mentex-thumbnails').getPublicUrl(upload!.path).data.publicUrl;

  // 3. Generar embedding del contenido (title + description + tags)
  const embeddingText = `${manifest.title}\n${manifest.author}\n${manifest.description}\nTags: ${manifest.tags.join(', ')}`;
  const embedding = await generateEmbedding(embeddingText);

  // 4. Insertar en DB
  await supabaseAdmin.from('content').upsert({
    slug: manifest.slug,
    title: manifest.title,
    author: manifest.author,
    kind: manifest.kind,
    category: manifest.category,
    tags: manifest.tags,
    description: manifest.description,
    narrator: manifest.narrator,
    language: manifest.language,
    duration_seconds: manifest.duration_seconds,
    audio_url: audioR2Path,
    cover_url,
    bg_gradient: `linear-gradient(135deg, ${manifest.metadata?.bg_color_1 ?? '#1a3a35'}, ${manifest.metadata?.bg_color_2 ?? '#0f2520'})`,
    accent_color: manifest.metadata?.accent_color ?? '#3dffd1',
    is_premium: manifest.is_premium,
    status: 'available',
    embedding,
    metadata: manifest.metadata ?? {},
  }, { onConflict: 'slug' });

  // 5. Catálogo OWN — el contenido es referenciable Mentex-side por title/author/tags.
  //    Si quieres que el Coach lo recomiende contextualmente vía RAG, expone
  //    el catálogo a través del tool `content_recommend` (doc 04 §4.6) que hace
  //    filtrado SQL local. Para personalización profunda usa `brain.query` del
  //    Gateway con el texto del usuario, no ingestes el catálogo al Imperio.

  console.log(`✓ Ingested: ${manifest.title}`);
}

// CLI usage
if (require.main === module) {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    console.error('Usage: tsx ingest-content.ts <manifest.json>');
    process.exit(1);
  }
  ingestContent(manifestPath).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
```

**Manifest example**:

```json
{
  "slug": "c-habitos",
  "title": "Hábitos Atómicos",
  "author": "James Clear",
  "kind": "audiobook",
  "category": "productividad",
  "tags": ["Productividad", "Hábitos", "Disciplina"],
  "description": "Cómo cambios pequeños y consistentes producen resultados extraordinarios.",
  "narrator": "Voz · Mentex AI",
  "language": "es",
  "duration_seconds": 16320,
  "is_premium": false,
  "audio_file_local_path": "./content-raw/habitos-atomicos.m4a",
  "cover_image_local_path": "./covers/habitos-atomicos.webp",
  "metadata": {
    "accent_color": "#3dffd1",
    "bg_color_1": "#1a3a35",
    "bg_color_2": "#0f2520",
    "release_year": 2018,
    "isbn": "978-1847941831"
  }
}
```

## 6.8 Streaming, no descarga (App Store rule)

App Store guideline 4.2.6 prohíbe apps que sean meros wrappers de contenido sin valor adicional. Mentex no es eso (es coach + contenido), pero el contenido se debe STREAM, no descargar a disco para distribución offline (los usuarios pueden descargar para escuchar sin conexión, pero no se debe exportable).

**Implementación frontend**:
```typescript
// frontend: lib/audio/player.ts
import { Audio } from 'expo-av';

let currentSound: Audio.Sound | null = null;

export async function playContent(contentId: string) {
  // 1. Pedir signed URL al backend
  const { audio_url, duration_seconds } = await api.get(`/content/${contentId}/audio`);

  // 2. Cargar y reproducir directo (no descargar)
  if (currentSound) {
    await currentSound.unloadAsync();
  }

  const { sound } = await Audio.Sound.createAsync(
    { uri: audio_url },
    { shouldPlay: true, progressUpdateIntervalMillis: 5000 },
    onPlaybackStatusUpdate
  );

  currentSound = sound;
  return sound;
}

function onPlaybackStatusUpdate(status: any) {
  if (status.isLoaded && status.didJustFinish) {
    api.post('/content/progress', { content_id: ..., completed: true });
  } else if (status.isLoaded) {
    // Throttled progress update cada 30s
    throttledUpdateProgress({
      content_id: ...,
      last_position_sec: Math.round(status.positionMillis / 1000),
      play_pct: status.positionMillis / status.durationMillis,
    });
  }
}
```

## 6.9 Offline cache (futuro Sprint G)

Para users premium, permitir descarga offline:

- Frontend: `expo-file-system` descarga el audio + metadata + cover a disco local cifrado
- Backend: endpoint `/api/mentex/content/[id]/download` solo premium, devuelve signed URL con `Content-Disposition: attachment`
- Encryption: AES-256 con key derivada del user_id + device hash → si pierde access (cancela premium) los archivos se vuelven ilegibles

Esto NO va en Sprint A-F. Lo dejas documentado como future.

## 6.10 Métricas de uso del catálogo

```sql
-- Top 10 contents más escuchados últimos 30 días
SELECT c.title, c.author, COUNT(*) AS plays_30d
FROM mentex.content_history ch
JOIN mentex.content c ON c.id = ch.content_id
WHERE ch.played_at >= NOW() - INTERVAL '30 days'
GROUP BY c.id, c.title, c.author
ORDER BY plays_30d DESC
LIMIT 10;

-- Completion rate por content
SELECT c.title,
       AVG(cp.play_pct) AS avg_play_pct,
       COUNT(CASE WHEN cp.play_pct >= 0.9 THEN 1 END)::FLOAT / COUNT(*)::FLOAT AS completion_rate
FROM mentex.content c
JOIN mentex.content_progress cp ON cp.content_id = c.id
GROUP BY c.id, c.title
ORDER BY avg_play_pct DESC;
```

---

**Siguiente**: [`07-NOTIFICATIONS-INTEGRATIONS.md`](./07-NOTIFICATIONS-INTEGRATIONS.md).
