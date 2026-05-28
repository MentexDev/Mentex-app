// screens/coach-image-gen-store.jsx — Sprint A.8 · B3 (re-abierto) · image_generate
// ─────────────────────────────────────────────────────────────────────────────
// Store + job runner para generación de imagen via Imperial Gateway (Higgsfield).
//
// Frontend mock superrealista — drop-in ready. Cuando Brandon wire el backend,
// reemplaza la sección `_simulateJob()` por POST /v1/tools/image-generate al
// Gateway + polling de /v1/jobs/{id}. El shape del job es idéntico al de
// Higgsfield: { id, status, model, progress, result_url, error }.
//
// API pública (window.__mtxImageGen):
//   .submit({ prompt, aspectRatio, model, references }) → { jobId }
//   .pollJob(jobId) → { status: 'pending'|'rendering'|'done'|'error',
//                        progress: 0-100, result_url?, error?, model, prompt, eta }
//   .cancel(jobId)
//   .listModels() → modelos curados (top 6 del catálogo Imperial)
//   .listAspectRatios() → ratios estándar
//   .estimateCost({ model, count }) → créditos
//
// Eventos emitidos:
//   mtx:image-gen-progress { jobId, progress, stage }
//   mtx:image-gen-done { jobId, resultUrl, prompt }
//   mtx:image-gen-error { jobId, error }
//
// Stores expuestos:
//   window.__mtxImageGen — API completa
//
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxImageGen) return;

  // ──────────────────────────────────────────────────────────────────────────
  // Catálogo de modelos (subset curado del Imperial Gateway)
  // ──────────────────────────────────────────────────────────────────────────
  // Source: models_explore del Higgsfield MCP. Estos son los 6 más útiles para
  // un coach de bienestar — no exponemos todo el catálogo (40+), sólo los
  // relevantes. Backend puede ampliar dinámicamente via Gateway.
  var MODELS = [
    {
      id: 'nano_banana_pro',
      label: 'Nano Banana Pro',
      tagline: 'Top quality · 4K · text + diagramas',
      icon: '🍌',
      tier: 'pro',
      etaSec: 18,
      credits: 8,
      recommended: ['diagramas', 'texto', 'minimalista', 'arquitectura'],
    },
    {
      id: 'soul_2',
      label: 'Soul V2',
      tagline: 'Portraits · UGC · editorial fashion',
      icon: '✨',
      tier: 'pro',
      etaSec: 14,
      credits: 10,
      recommended: ['retrato', 'persona', 'lifestyle'],
    },
    {
      id: 'seedream_v5_lite',
      label: 'Seedream 5 Lite',
      tagline: 'Rápido · todoterreno · gran balance',
      icon: '🌱',
      tier: 'premium',
      etaSec: 9,
      credits: 4,
      recommended: ['general', 'concepto', 'mood'],
    },
    {
      id: 'cinematic_studio_2_5',
      label: 'Cinema Studio 2.5',
      tagline: 'Iluminación cinematográfica · drama',
      icon: '🎬',
      tier: 'pro',
      etaSec: 16,
      credits: 9,
      recommended: ['atmosférica', 'oscura', 'cinema'],
    },
    {
      id: 'soul_cast',
      label: 'Soul Cast',
      tagline: 'Avatar text-only · sin referencia',
      icon: '🎭',
      tier: 'premium',
      etaSec: 11,
      credits: 5,
      recommended: ['avatar', 'personaje', 'ilustración'],
    },
    {
      id: 'marketing_studio_image',
      label: 'Marketing Studio',
      tagline: 'Ads · product shots · DTC',
      icon: '🛍️',
      tier: 'pro',
      etaSec: 13,
      credits: 7,
      recommended: ['publicidad', 'producto', 'marketing'],
    },
  ];

  function listModels() { return MODELS.slice(); }
  function getModel(id) {
    for (var i = 0; i < MODELS.length; i++) if (MODELS[i].id === id) return MODELS[i];
    return MODELS[2]; // fallback seedream
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Aspect ratios estándar — alineados con Higgsfield API
  // ──────────────────────────────────────────────────────────────────────────
  var ASPECT_RATIOS = [
    { id: '1:1', label: 'Cuadrado', w: 1024, h: 1024, icon: '⬜' },
    { id: '9:16', label: 'Vertical', w: 720, h: 1280, icon: '📱' },
    { id: '16:9', label: 'Horizontal', w: 1280, h: 720, icon: '🖥️' },
    { id: '4:5', label: 'Retrato', w: 1024, h: 1280, icon: '🖼️' },
    { id: '3:2', label: 'Foto', w: 1200, h: 800, icon: '📷' },
  ];
  function listAspectRatios() { return ASPECT_RATIOS.slice(); }

  // ──────────────────────────────────────────────────────────────────────────
  // Auto-recommend del modelo según prompt — heurística simple keyword-match
  // ──────────────────────────────────────────────────────────────────────────
  function recommendModel(prompt) {
    var p = (prompt || '').toLowerCase();
    var bestScore = 0;
    var bestModel = MODELS[2]; // seedream default
    for (var i = 0; i < MODELS.length; i++) {
      var m = MODELS[i];
      var score = 0;
      for (var j = 0; j < m.recommended.length; j++) {
        if (p.indexOf(m.recommended[j]) >= 0) score += 2;
      }
      if (score > bestScore) { bestScore = score; bestModel = m; }
    }
    return bestModel;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Cost estimator
  // ──────────────────────────────────────────────────────────────────────────
  function estimateCost(opts) {
    var model = getModel(opts && opts.model);
    var count = (opts && opts.count) || 1;
    return model.credits * count;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Job runner — simula la trayectoria de un job real del Imperial Gateway
  // ──────────────────────────────────────────────────────────────────────────
  //
  // Stages (matching Higgsfield):
  //   queued (200-600ms) → rendering (etaSec * ~0.95) → done
  //
  // Progress no es lineal — usa un ease-in para sentirse más natural
  // (acelera al inicio, plateau al 70-85%, salto final).
  //
  var _jobs = {};      // jobId → state
  var _timers = {};    // jobId → timeout id
  var _jobSeq = 0;

  function _genJobId() {
    _jobSeq += 1;
    // UUID-like determinístico para que se vea como del backend
    var time = Date.now().toString(36);
    var rand = Math.floor(Math.random() * 0xffff).toString(36);
    return 'imgjob-' + time + '-' + _jobSeq + '-' + rand;
  }

  function _emit(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: detail }));
    } catch (e) { /* no-op */ }
  }

  // Curva ease-out cuadrática — 0 → 100 con plateau al final
  function _easeOut(t) {
    t = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - t, 2.4);
  }

  function _simulateJob(jobId) {
    var job = _jobs[jobId];
    if (!job) return;
    var model = getModel(job.model);
    var totalMs = model.etaSec * 1000;
    var startedAt = Date.now();
    job.status = 'rendering';
    job.progress = 0;
    _emit('mtx:image-gen-progress', { jobId: jobId, progress: 0, stage: 'rendering' });

    var tick = function() {
      var current = _jobs[jobId];
      if (!current || current.cancelled) {
        delete _timers[jobId];
        return;
      }
      var elapsed = Date.now() - startedAt;
      var t = elapsed / totalMs;
      if (t >= 1) {
        // Done
        current.status = 'done';
        current.progress = 100;
        current.completedAt = Date.now();
        current.resultUrl = _generateMockImageUrl(current.prompt, current.aspectRatio, model.id);
        delete _timers[jobId];
        _emit('mtx:image-gen-done', {
          jobId: jobId,
          resultUrl: current.resultUrl,
          prompt: current.prompt,
          model: model.id,
        });
        return;
      }
      var pct = Math.round(_easeOut(t) * 95);  // hold al 95% hasta done
      current.progress = pct;
      _emit('mtx:image-gen-progress', { jobId: jobId, progress: pct, stage: 'rendering' });
      _timers[jobId] = setTimeout(tick, 250);
    };

    // Queued delay 200-600ms (sentir como backend real)
    var queuedMs = 200 + Math.floor(Math.random() * 400);
    _timers[jobId] = setTimeout(tick, queuedMs);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Mock URL generator — SVG inline data URI con prompt rendered
  // ──────────────────────────────────────────────────────────────────────────
  // Genera una imagen mock visualmente atractiva basada en el prompt + modelo.
  // Cuando llegue backend, esto se reemplaza por result_url del Gateway.
  //
  // Audit CRIT-4: defensa contra SVG injection. Aunque icon viene de un
  // catálogo hardcoded de emojis, aplicamos escape consistente — alinea
  // con coach-video-gen-store.jsx (línea ~552) y previene XSS si alguien
  // extiende _iconFromPrompt con user-controlled input.
  function _escapeXml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  function _generateMockImageUrl(prompt, aspectRatio, modelId) {
    var ratio = ASPECT_RATIOS.find(function(r) { return r.id === aspectRatio; }) || ASPECT_RATIOS[0];
    var w = ratio.w, h = ratio.h;
    var prompt_lower = (prompt || '').toLowerCase();

    // Paleta inferida del prompt — coherente con el contenido
    var palette = _paletteFromPrompt(prompt_lower, modelId);
    var icon = _iconFromPrompt(prompt_lower);

    // SVG con gradient + composición visual (no texto literal en la imagen
    // porque arruinaría la calidad realista — sólo composición de luz + forma)
    var svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">',
      '<defs>',
      '<radialGradient id="g1" cx="50%" cy="35%" r="70%">',
      '<stop offset="0%" stop-color="' + palette[0] + '"/>',
      '<stop offset="50%" stop-color="' + palette[1] + '"/>',
      '<stop offset="100%" stop-color="' + palette[2] + '"/>',
      '</radialGradient>',
      '<filter id="grain" x="0" y="0">',
      '<feTurbulence type="fractalNoise" baseFrequency="2" numOctaves="3" stitchTiles="stitch"/>',
      '<feColorMatrix values="0 0 0 0 1, 0 0 0 0 1, 0 0 0 0 1, 0 0 0 0.04 0"/>',
      '<feComposite operator="in" in2="SourceGraphic"/>',
      '</filter>',
      '</defs>',
      '<rect width="100%" height="100%" fill="url(#g1)"/>',
      // Soft light orb
      '<circle cx="' + (w * 0.7) + '" cy="' + (h * 0.3) + '" r="' + (Math.min(w, h) * 0.18) + '" fill="white" opacity="0.18" filter="blur(40px)"/>',
      // Bottom dark gradient
      '<rect x="0" y="' + (h * 0.65) + '" width="100%" height="' + (h * 0.35) + '" fill="black" opacity="0.22"/>',
      // Center accent icon (subtle, only as composition hint)
      '<text x="' + (w / 2) + '" y="' + (h * 0.55) + '" font-size="' + Math.min(w, h) * 0.22 + '" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji" opacity="0.85">' + _escapeXml(icon) + '</text>',
      // Subtle grain overlay
      '<rect width="100%" height="100%" filter="url(#grain)"/>',
      '</svg>',
    ].join('');
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Paletas tipo cinematic — coherentes con la identidad Obsidian/Neon de Mentex
  // pero con variación temática según prompt
  function _paletteFromPrompt(p, modelId) {
    // Nature / outdoors / nature words
    if (/(naturaleza|árbol|bosque|montaña|cielo|amanecer|atardecer|mar|océano|verde)/i.test(p)) {
      return ['#3dffd1', '#1a4f3a', '#0a1410'];
    }
    if (/(meditar|calma|paz|sereno|zen|mindful|reflexion)/i.test(p)) {
      return ['#9b8aff', '#2d2549', '#0a0815'];
    }
    if (/(energía|movimiento|deporte|correr|gym|fuerza|fuego)/i.test(p)) {
      return ['#ffc850', '#a04a1a', '#1a0c08'];
    }
    if (/(noche|luna|dormir|sueño|estrella)/i.test(p)) {
      return ['#5a8fff', '#1a2d5a', '#08101a'];
    }
    if (/(rojo|amor|corazón|pasión|sangre)/i.test(p)) {
      return ['#ff6a8a', '#7a1a3a', '#1a0610'];
    }
    if (/(comida|gastronomía|chef|sabor|cocina)/i.test(p)) {
      return ['#ff9050', '#7a3a1a', '#1a0a06'];
    }
    if (/(libro|leer|aprender|estudiar|conocimiento)/i.test(p)) {
      return ['#d4b888', '#4a3a22', '#1a1208'];
    }
    if (/(música|sonido|cantar|baile)/i.test(p)) {
      return ['#ff5acf', '#5a1a4a', '#1a0810'];
    }
    if (/(retrato|persona|gente|rostro|cara)/i.test(p)) {
      return ['#d4a888', '#5a3a22', '#1a1208'];
    }
    // Default — Mentex neon palette
    return ['#3dffd1', '#155a4f', '#0a1410'];
  }

  function _iconFromPrompt(p) {
    if (/(meditar|zen|calma|mindful)/i.test(p)) return '🧘';
    if (/(árbol|bosque|naturaleza)/i.test(p)) return '🌳';
    if (/(montaña|cumbre|altura)/i.test(p)) return '⛰️';
    if (/(amanecer|sol|sunrise)/i.test(p)) return '🌅';
    if (/(noche|luna|dormir)/i.test(p)) return '🌙';
    if (/(mar|océano|playa)/i.test(p)) return '🌊';
    if (/(libro|leer|estudiar)/i.test(p)) return '📖';
    if (/(música|sonido)/i.test(p)) return '🎵';
    if (/(comida|chef)/i.test(p)) return '🍽️';
    if (/(deporte|correr|gym)/i.test(p)) return '🏃';
    if (/(café|coffee)/i.test(p)) return '☕';
    if (/(persona|retrato|rostro)/i.test(p)) return '👤';
    if (/(fuego|llama)/i.test(p)) return '🔥';
    if (/(corazón|amor)/i.test(p)) return '💜';
    if (/(estrella)/i.test(p)) return '✦';
    return '✦';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API — submit / pollJob / cancel
  // ──────────────────────────────────────────────────────────────────────────
  function submit(opts) {
    opts = opts || {};
    var prompt = (opts.prompt || '').trim();
    if (!prompt) {
      return Promise.reject(new Error('Falta el prompt para generar la imagen'));
    }
    var model = opts.model || recommendModel(prompt).id;
    var aspectRatio = opts.aspectRatio || '1:1';
    var references = Array.isArray(opts.references) ? opts.references : [];
    var jobId = _genJobId();
    _jobs[jobId] = {
      jobId: jobId,
      status: 'queued',
      progress: 0,
      prompt: prompt,
      model: model,
      aspectRatio: aspectRatio,
      references: references,
      createdAt: Date.now(),
      cancelled: false,
    };
    _simulateJob(jobId);
    return Promise.resolve({ jobId: jobId, model: model, aspectRatio: aspectRatio });
  }

  function pollJob(jobId) {
    var j = _jobs[jobId];
    if (!j) return null;
    var model = getModel(j.model);
    var elapsedSec = (Date.now() - j.createdAt) / 1000;
    var etaRemaining = Math.max(0, model.etaSec - elapsedSec);
    return {
      jobId: jobId,
      status: j.status,
      progress: j.progress,
      resultUrl: j.resultUrl || null,
      error: j.error || null,
      model: j.model,
      prompt: j.prompt,
      aspectRatio: j.aspectRatio,
      eta: Math.round(etaRemaining),
    };
  }

  function cancel(jobId) {
    var j = _jobs[jobId];
    if (!j) return false;
    j.cancelled = true;
    j.status = 'cancelled';
    if (_timers[jobId]) {
      clearTimeout(_timers[jobId]);
      delete _timers[jobId];
    }
    _emit('mtx:image-gen-error', { jobId: jobId, error: 'cancelled' });
    return true;
  }

  // Audit CRIT-6: bulk cancel para invocar desde el bridge cuando user
  // cambia de conv. Libera timers acumulados sin importar quién los inició.
  function _cancelAllActive() {
    var count = 0;
    Object.keys(_jobs).forEach(function(id) {
      var j = _jobs[id];
      if (j && (j.status === 'queued' || j.status === 'rendering')) {
        cancel(id);
        count += 1;
      }
    });
    return count;
  }

  // Regenerate con mismo prompt — devuelve un nuevo jobId (mismo model salvo override)
  function regenerate(originalJobId, opts) {
    var orig = _jobs[originalJobId];
    if (!orig) return Promise.reject(new Error('Job original no encontrado'));
    return submit({
      prompt: (opts && opts.prompt) || orig.prompt,
      model: (opts && opts.model) || orig.model,
      aspectRatio: (opts && opts.aspectRatio) || orig.aspectRatio,
      references: orig.references,
    });
  }

  window.__mtxImageGen = {
    submit: submit,
    pollJob: pollJob,
    cancel: cancel,
    regenerate: regenerate,
    listModels: listModels,
    getModel: getModel,
    listAspectRatios: listAspectRatios,
    recommendModel: recommendModel,
    estimateCost: estimateCost,
    _cancelAllActive: _cancelAllActive,  // Audit CRIT-6
  };
})();
