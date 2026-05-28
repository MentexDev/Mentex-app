// screens/coach-video-gen-store.jsx — Sprint A.8 · B6 (re-abierto) · video_generate
// ─────────────────────────────────────────────────────────────────────────────
// Store + job runner para video generation via Imperial Gateway (Higgsfield).
//
// Flow multi-step:
//   1. submitStoryboard({ prompt }) → Promise<{ storyboardId, scenes[] }>
//      ↓ ~3-5s
//   2. updateScene(storyboardId, sceneIdx, patch) — user edita inline
//   3. setVoice(storyboardId, voiceId)
//   4. submitVideo(storyboardId) → Promise<{ jobId }>
//      ↓ ~60-180s (stages: warming → scene 1/N → scene 2/N → composing → mixing audio → finalizing)
//   5. pollJob(jobId) → { status, progress, stage, resultUrl }
//
// Drop-in ready: cuando Brandon wire backend, reemplaza:
//   _simulateStoryboard()  → POST /v1/tools/storyboard-generate { prompt }
//   _simulateJob()         → POST /v1/tools/video-generate { storyboard, voice }
//                          + polling /v1/jobs/{id}
//
// Stores expuestos:
//   window.__mtxVideoGen — API completa
//
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxVideoGen) return;

  // ──────────────────────────────────────────────────────────────────────────
  // Modelos curados (subset de Higgsfield video catalog)
  // ──────────────────────────────────────────────────────────────────────────
  var MODELS = [
    {
      id: 'seedance_2_0',
      label: 'Seedance 2.0',
      tagline: 'Reference-driven · identidad fuerte · audio sync',
      icon: '🌊',
      tier: 'pro',
      etaSecPerScene: 18,
      credits: 12,
      recommended: ['identidad', 'persona', 'reference'],
    },
    {
      id: 'kling3_0',
      label: 'Kling 3.0',
      tagline: 'Multi-shot · audio nativo · motion transfer',
      icon: '⚡',
      tier: 'pro',
      etaSecPerScene: 22,
      credits: 15,
      recommended: ['multi-shot', 'cinemático', 'transición'],
    },
    {
      id: 'marketing_studio_video',
      label: 'Marketing Studio Video',
      tagline: 'DTC ads · UGC · product showcase',
      icon: '🛍️',
      tier: 'pro',
      etaSecPerScene: 16,
      credits: 14,
      recommended: ['publicidad', 'producto', 'marketing', 'ugc'],
    },
  ];

  function listModels() { return MODELS.slice(); }
  function getModel(id) {
    for (var i = 0; i < MODELS.length; i++) if (MODELS[i].id === id) return MODELS[i];
    return MODELS[0];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Catálogo de voces — 8 voces curadas matching tone-of-voice del coach
  // ──────────────────────────────────────────────────────────────────────────
  // Drop-in: cuando llegue backend, reemplazar por /v1/tools/voices-list del
  // Gateway. Estructura idéntica.
  var VOICES = [
    {
      id: 'sage_warm',
      name: 'Sage',
      tagline: 'Cálido · acogedor · cercano',
      gender: 'neutral',
      lang: 'es-LA',
      pace: 'medio',
      sample: '/audio/voice-sample-sage.mp3',  // mock, no se reproduce nada real
      previewIcon: '🌿',
      accent: '#3dffd1',
    },
    {
      id: 'lumen_calm',
      name: 'Lumen',
      tagline: 'Sereno · meditativo · pausado',
      gender: 'femenino',
      lang: 'es-LA',
      pace: 'lento',
      previewIcon: '🌙',
      accent: '#9b8aff',
    },
    {
      id: 'aria_energetic',
      name: 'Aria',
      tagline: 'Vibrante · motivador · dinámico',
      gender: 'femenino',
      lang: 'es-LA',
      pace: 'rápido',
      previewIcon: '⚡',
      accent: '#ffc850',
    },
    {
      id: 'rio_narrator',
      name: 'Río',
      tagline: 'Narrador documental · profundo',
      gender: 'masculino',
      lang: 'es-LA',
      pace: 'medio',
      previewIcon: '🎙️',
      accent: '#5a8fff',
    },
    {
      id: 'sol_friendly',
      name: 'Sol',
      tagline: 'Amigable · joven · conversacional',
      gender: 'femenino',
      lang: 'es-LA',
      pace: 'medio',
      previewIcon: '☀️',
      accent: '#ff9050',
    },
    {
      id: 'noah_authority',
      name: 'Noah',
      tagline: 'Autoridad · TED · presentación',
      gender: 'masculino',
      lang: 'es-LA',
      pace: 'medio',
      previewIcon: '🎯',
      accent: '#d4a888',
    },
    {
      id: 'iris_gentle',
      name: 'Iris',
      tagline: 'Dulce · ASMR · íntimo',
      gender: 'femenino',
      lang: 'es-LA',
      pace: 'muy lento',
      previewIcon: '🌸',
      accent: '#ff6a8a',
    },
    {
      id: 'cosmo_epic',
      name: 'Cosmo',
      tagline: 'Épico · cinematográfico · trailer',
      gender: 'masculino',
      lang: 'es-LA',
      pace: 'medio',
      previewIcon: '🌌',
      accent: '#5acfff',
    },
  ];

  function listVoices() { return VOICES.slice(); }
  function getVoice(id) {
    for (var i = 0; i < VOICES.length; i++) if (VOICES[i].id === id) return VOICES[i];
    return VOICES[0];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Aspect ratios (video)
  // ──────────────────────────────────────────────────────────────────────────
  var ASPECT_RATIOS = [
    { id: '9:16', label: 'Vertical · Reels', w: 720, h: 1280, icon: '📱' },
    { id: '16:9', label: 'Horizontal · YouTube', w: 1280, h: 720, icon: '🖥️' },
    { id: '1:1', label: 'Cuadrado · feed', w: 1080, h: 1080, icon: '⬜' },
    { id: '4:5', label: 'Retrato · IG', w: 1080, h: 1350, icon: '📷' },
  ];
  function listAspectRatios() { return ASPECT_RATIOS.slice(); }

  // ──────────────────────────────────────────────────────────────────────────
  // STORYBOARD GENERATOR — del prompt al storyboard editable
  // ──────────────────────────────────────────────────────────────────────────
  // Heurística: parsea el prompt, identifica el tema y devuelve 4-6 escenas
  // coherentes. En backend real, esto lo hace un LLM (Claude/GPT) con tool-use
  // específico de storyboard.

  var _storyboards = {};   // storyboardId → state
  var _storyboardSeq = 0;

  function _genStoryboardId() {
    _storyboardSeq += 1;
    return 'storyboard-' + Date.now().toString(36) + '-' + _storyboardSeq;
  }

  function _generateScenes(prompt) {
    var p = (prompt || '').toLowerCase();
    var templates = _pickTemplate(p);
    return templates.map(function(t, idx) {
      return {
        idx: idx,
        title: t.title,
        description: t.description,
        durationSec: t.durationSec || 4,
        cameraAngle: t.cameraAngle || 'medio',
        moodTag: t.moodTag,
        thumbnailColor: t.color || '#3dffd1',
        thumbnailIcon: t.icon || '✦',
        voiceover: t.voiceover || '',
      };
    });
  }

  // Plantillas semánticas — 8 arquetipos de video de bienestar/lifestyle.
  // Cada uno tiene 4-6 escenas con voiceover sugerido. La heurística matchea
  // el prompt → arquetipo más cercano.
  function _pickTemplate(p) {
    if (/(rutina|hábito|mañana|matin|morning|despertar)/i.test(p)) {
      return [
        { title: 'Apertura · el momento previo', description: 'Cierre lento sobre la persona despertando con luz suave entrando por la ventana.', cameraAngle: 'close-up', moodTag: 'íntimo', color: '#ffd28c', icon: '🌅', voiceover: 'Antes de que empiece el ruido del día, hay un instante.', durationSec: 4 },
        { title: 'Primer ritual', description: 'Persona toma un vaso de agua, mirada calma, pasos descalzos por el suelo de madera.', cameraAngle: 'medio', moodTag: 'sereno', color: '#9bccaa', icon: '💧', voiceover: 'Empieza con lo más simple. Agua. Aire. Tu cuerpo presente.', durationSec: 4 },
        { title: 'Respiración', description: 'Plano cerrado del pecho subiendo y bajando, vapor de café en primer plano desenfocado.', cameraAngle: 'macro', moodTag: 'meditativo', color: '#a288d4', icon: '🌬️', voiceover: 'Tres respiraciones. Sin pensar. Sólo sentir.', durationSec: 3 },
        { title: 'Movimiento', description: 'Cuerpo estirándose hacia la luz, sombras alargadas por el sol bajo.', cameraAngle: 'medio', moodTag: 'energía', color: '#ffc850', icon: '🧘', voiceover: 'Despierta el cuerpo despacio. No corras.', durationSec: 4 },
        { title: 'Intención', description: 'Persona sentada con cuaderno, escribiendo una palabra en grande.', cameraAngle: 'top-down', moodTag: 'reflexivo', color: '#5a8fff', icon: '✍️', voiceover: 'Una palabra. Esa es tu brújula para hoy.', durationSec: 4 },
        { title: 'Salida', description: 'Persona caminando hacia la puerta con confianza tranquila, luz dorada de fondo.', cameraAngle: 'wide', moodTag: 'esperanzador', color: '#3dffd1', icon: '🌿', voiceover: 'Ya estás listo. Tu mañana ya es tuya.', durationSec: 5 },
      ];
    }
    if (/(meditar|meditación|mindfulness|presencia|calma|paz)/i.test(p)) {
      return [
        { title: 'Apertura · cielo', description: 'Cielo al amanecer, nubes moviéndose lento, time-lapse muy suave.', cameraAngle: 'wide', moodTag: 'sereno', color: '#9b8aff', icon: '🌌', voiceover: 'Respira. No tienes que estar en ningún otro lado.', durationSec: 5 },
        { title: 'El cuerpo se asienta', description: 'Persona sentada en flor de loto, espalda recta, ojos cerrados.', cameraAngle: 'medio', moodTag: 'íntimo', color: '#a288d4', icon: '🧘', voiceover: 'Siente el peso de tu cuerpo. Suelta lo que sostienes.', durationSec: 4 },
        { title: 'Foco interior', description: 'Plano macro del rostro relajado, gota de luz reflejada en el párpado.', cameraAngle: 'macro', moodTag: 'meditativo', color: '#5a8fff', icon: '✨', voiceover: 'Tu atención es como una pluma. Ligera. Pero presente.', durationSec: 4 },
        { title: 'Pensamiento que pasa', description: 'Hojas cayendo en agua quieta, ondas expandiéndose.', cameraAngle: 'top-down', moodTag: 'reflexivo', color: '#3dffd1', icon: '🍃', voiceover: 'Si llega un pensamiento, déjalo pasar. Como una hoja sobre el río.', durationSec: 4 },
        { title: 'Cierre', description: 'Persona abre los ojos con sonrisa sutil, la luz se intensifica.', cameraAngle: 'medio', moodTag: 'esperanzador', color: '#ffd28c', icon: '☀️', voiceover: 'Vuelve cuando quieras. Esto ya está dentro tuyo.', durationSec: 4 },
      ];
    }
    if (/(deporte|correr|gym|ejercicio|fuerza|entrenar)/i.test(p)) {
      return [
        { title: 'Apertura · zapatillas', description: 'Close-up de zapatillas atándose, manos firmes.', cameraAngle: 'macro', moodTag: 'íntimo', color: '#ff7a4a', icon: '👟', voiceover: 'No necesitas motivación. Necesitas el primer paso.', durationSec: 3 },
        { title: 'Salida', description: 'Persona empieza a correr, calle vacía al amanecer.', cameraAngle: 'wide', moodTag: 'energía', color: '#ffc850', icon: '🏃', voiceover: 'El cuerpo se queja al principio. Es normal.', durationSec: 4 },
        { title: 'Ritmo', description: 'Pies golpeando el pavimento, respiración constante, sudor.', cameraAngle: 'macro', moodTag: 'intenso', color: '#ff5a4a', icon: '💨', voiceover: 'Encuentra tu ritmo. No el de los demás.', durationSec: 4 },
        { title: 'Empuje', description: 'Esfuerzo visible en el rostro, vista hacia adelante.', cameraAngle: 'close-up', moodTag: 'épico', color: '#ff3a3a', icon: '🔥', voiceover: 'El cuerpo quiere parar. La mente decide.', durationSec: 4 },
        { title: 'Cumbre', description: 'Llegada a un mirador, brazos abiertos hacia el horizonte.', cameraAngle: 'wide', moodTag: 'esperanzador', color: '#3dffd1', icon: '⛰️', voiceover: 'Lo lograste. Y ahora ya sabes que puedes.', durationSec: 5 },
      ];
    }
    if (/(producto|ad|publicidad|marca|venta|comercial)/i.test(p)) {
      return [
        { title: 'Hook · 3 segundos', description: 'Movimiento brusco, color saturado, el producto aparece de golpe.', cameraAngle: 'macro', moodTag: 'impactante', color: '#ff3a8a', icon: '⚡', voiceover: '¿Y si todo lo que sabes está incompleto?', durationSec: 3 },
        { title: 'El problema', description: 'Persona frustrada, escena cotidiana mostrando el dolor.', cameraAngle: 'medio', moodTag: 'tenso', color: '#6a5a8a', icon: '😤', voiceover: 'Sabes ese momento donde simplemente no rinde.', durationSec: 4 },
        { title: 'Revelación', description: 'Producto en primer plano con iluminación cinematográfica.', cameraAngle: 'macro', moodTag: 'épico', color: '#ffc850', icon: '✨', voiceover: 'Eso cambia hoy.', durationSec: 3 },
        { title: 'Demo · uso', description: 'Persona usando el producto, transformación visible.', cameraAngle: 'medio', moodTag: 'transformador', color: '#3dffd1', icon: '🎯', voiceover: 'Hecho para los que no aceptan menos.', durationSec: 5 },
        { title: 'CTA', description: 'Logo + URL + CTA en pantalla, fade-in con audio impactante.', cameraAngle: 'static', moodTag: 'directo', color: '#0a1410', icon: '🚀', voiceover: 'Mentex. Empieza hoy.', durationSec: 3 },
      ];
    }
    if (/(naturaleza|outdoor|bosque|mar|montaña|viaje)/i.test(p)) {
      return [
        { title: 'Apertura · horizonte', description: 'Drone shot lento sobre paisaje vasto al amanecer.', cameraAngle: 'aerial', moodTag: 'épico', color: '#5a8fff', icon: '🌄', voiceover: 'El mundo era inmenso antes de que lo redujéramos a una pantalla.', durationSec: 5 },
        { title: 'Detalle natural', description: 'Macro de gota de rocío en una hoja, luz dorada.', cameraAngle: 'macro', moodTag: 'íntimo', color: '#3dffd1', icon: '🍃', voiceover: 'Mira de cerca. Hay vida en cada milímetro.', durationSec: 4 },
        { title: 'Movimiento', description: 'Persona caminando entre árboles, hojas filtran la luz.', cameraAngle: 'medio', moodTag: 'sereno', color: '#9bccaa', icon: '🌳', voiceover: 'No vas a ningún lado. Sólo estás aquí.', durationSec: 4 },
        { title: 'Agua', description: 'Río fluyendo, piedras pulidas, sonido natural.', cameraAngle: 'top-down', moodTag: 'meditativo', color: '#5acfff', icon: '🌊', voiceover: 'El agua nunca apura. Y siempre llega.', durationSec: 4 },
        { title: 'Cierre · cielo', description: 'Time-lapse del atardecer pintando el cielo de naranja.', cameraAngle: 'wide', moodTag: 'esperanzador', color: '#ffc850', icon: '🌅', voiceover: 'Y aún así, hay más mundo del que verás.', durationSec: 5 },
      ];
    }
    // Default — narrative arc genérico
    return [
      { title: 'Apertura', description: 'Plano que establece el ambiente y tono general.', cameraAngle: 'wide', moodTag: 'inicial', color: '#3dffd1', icon: '✨', voiceover: 'Empieza con una pregunta.', durationSec: 4 },
      { title: 'Desarrollo · tensión', description: 'Plano más cerrado mostrando la situación específica.', cameraAngle: 'medio', moodTag: 'tenso', color: '#9b8aff', icon: '🌀', voiceover: 'No todo está dicho.', durationSec: 4 },
      { title: 'Pivote', description: 'Cambio visual fuerte que marca el momento de transformación.', cameraAngle: 'macro', moodTag: 'revelación', color: '#ffc850', icon: '⚡', voiceover: 'Entonces algo cambia.', durationSec: 3 },
      { title: 'Resolución', description: 'Vuelve al plano amplio pero con la luz diferente.', cameraAngle: 'wide', moodTag: 'esperanzador', color: '#5a8fff', icon: '🌅', voiceover: 'Y ya no es lo mismo.', durationSec: 5 },
    ];
  }

  function recommendVoiceForScenes(scenes) {
    // Match heurístico: si las escenas tienen mood "meditativo" o "sereno", usa Lumen.
    // Si son "energía" o "intenso", usa Aria. Si son "épico" o "trailer", Cosmo.
    var moods = scenes.map(function(s) { return s.moodTag || ''; }).join(' ').toLowerCase();
    if (/medita|sereno|íntimo/.test(moods)) return 'lumen_calm';
    if (/intens|épico|energ/.test(moods)) return 'aria_energetic';
    if (/trailer|cinemat/.test(moods)) return 'cosmo_epic';
    if (/document|narrad/.test(moods)) return 'rio_narrator';
    return 'sage_warm';  // default cálido
  }

  function submitStoryboard(opts) {
    opts = opts || {};
    var prompt = (opts.prompt || '').trim();
    if (!prompt) return Promise.reject(new Error('Falta prompt'));

    var storyboardId = _genStoryboardId();
    var scenes = _generateScenes(prompt);
    var voiceId = recommendVoiceForScenes(scenes);
    var totalDuration = scenes.reduce(function(s, sc) { return s + sc.durationSec; }, 0);
    var aspectRatio = opts.aspectRatio || '9:16';
    var model = opts.model || (opts.model || 'seedance_2_0');

    _storyboards[storyboardId] = {
      storyboardId: storyboardId,
      prompt: prompt,
      scenes: scenes,
      voiceId: voiceId,
      aspectRatio: aspectRatio,
      model: model,
      totalDuration: totalDuration,
      createdAt: Date.now(),
    };

    // Simula latencia de generación del storyboard (3-5s)
    return new Promise(function(resolve) {
      setTimeout(function() {
        resolve(_storyboards[storyboardId]);
      }, 2800 + Math.floor(Math.random() * 1800));
    });
  }

  function getStoryboard(storyboardId) { return _storyboards[storyboardId] || null; }

  function updateScene(storyboardId, sceneIdx, patch) {
    var sb = _storyboards[storyboardId];
    if (!sb) return false;
    var sc = sb.scenes[sceneIdx];
    if (!sc) return false;
    Object.keys(patch || {}).forEach(function(k) { sc[k] = patch[k]; });
    sb.totalDuration = sb.scenes.reduce(function(s, scn) { return s + scn.durationSec; }, 0);
    return true;
  }

  function removeScene(storyboardId, sceneIdx) {
    var sb = _storyboards[storyboardId];
    if (!sb || !sb.scenes[sceneIdx]) return false;
    sb.scenes.splice(sceneIdx, 1);
    sb.scenes.forEach(function(s, i) { s.idx = i; });
    sb.totalDuration = sb.scenes.reduce(function(s, scn) { return s + scn.durationSec; }, 0);
    return true;
  }

  function addScene(storyboardId, afterIdx) {
    var sb = _storyboards[storyboardId];
    if (!sb) return false;
    var newScene = {
      idx: 0,
      title: 'Nueva escena',
      description: 'Describe qué pasa en esta escena.',
      durationSec: 4,
      cameraAngle: 'medio',
      moodTag: 'neutral',
      thumbnailColor: '#3dffd1',
      thumbnailIcon: '✦',
      voiceover: '',
    };
    var insertAt = (typeof afterIdx === 'number') ? afterIdx + 1 : sb.scenes.length;
    sb.scenes.splice(insertAt, 0, newScene);
    sb.scenes.forEach(function(s, i) { s.idx = i; });
    sb.totalDuration = sb.scenes.reduce(function(s, scn) { return s + scn.durationSec; }, 0);
    return true;
  }

  function setVoice(storyboardId, voiceId) {
    var sb = _storyboards[storyboardId];
    if (!sb) return false;
    sb.voiceId = voiceId;
    return true;
  }

  function estimateCost(storyboardId) {
    var sb = _storyboards[storyboardId];
    if (!sb) return 0;
    var model = getModel(sb.model);
    return sb.scenes.length * model.credits;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // JOB RUNNER — video generation con stages multi-step
  // ──────────────────────────────────────────────────────────────────────────
  //
  // Stages reales del backend (matching Higgsfield):
  //   1. queued (0.5-1s)
  //   2. warming (5%)
  //   3. rendering_scenes (5% → 75%, divide por escenas)
  //   4. composing (75% → 88%)
  //   5. mixing_audio (88% → 95%)
  //   6. finalizing (95% → 100%)
  //
  var _jobs = {};
  var _jobTimers = {};
  var _jobSeq = 0;

  function _genVideoJobId() {
    _jobSeq += 1;
    return 'vidjob-' + Date.now().toString(36) + '-' + _jobSeq;
  }

  function _emit(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail })); }
    catch (e) { /* no-op */ }
  }

  function submitVideo(storyboardId) {
    var sb = _storyboards[storyboardId];
    if (!sb) return Promise.reject(new Error('Storyboard no encontrado'));
    var model = getModel(sb.model);
    var jobId = _genVideoJobId();

    var stages = [
      { id: 'warming', label: 'Calentando modelos', from: 0, to: 5, durationMs: 1800 },
    ];
    var renderingPortion = 70;
    var perScene = renderingPortion / sb.scenes.length;
    sb.scenes.forEach(function(sc, i) {
      stages.push({
        id: 'scene_' + i,
        label: 'Renderizando escena ' + (i + 1) + '/' + sb.scenes.length + ' · ' + sc.title,
        from: 5 + perScene * i,
        to: 5 + perScene * (i + 1),
        durationMs: model.etaSecPerScene * 1000,
        sceneIdx: i,
      });
    });
    stages.push({ id: 'composing', label: 'Montando secuencias', from: 75, to: 88, durationMs: 3200 });
    stages.push({ id: 'mixing_audio', label: 'Mezclando audio · voz ' + getVoice(sb.voiceId).name, from: 88, to: 95, durationMs: 2800 });
    stages.push({ id: 'finalizing', label: 'Finalizando export', from: 95, to: 100, durationMs: 1500 });

    _jobs[jobId] = {
      jobId: jobId,
      storyboardId: storyboardId,
      status: 'queued',
      progress: 0,
      stages: stages,
      currentStageIdx: 0,
      stageStartedAt: 0,
      createdAt: Date.now(),
      cancelled: false,
    };

    var queuedDelay = 400 + Math.floor(Math.random() * 600);
    _jobTimers[jobId] = setTimeout(function() { _runVideoStages(jobId); }, queuedDelay);

    return Promise.resolve({ jobId: jobId });
  }

  function _runVideoStages(jobId) {
    var job = _jobs[jobId];
    if (!job || job.cancelled) return;
    job.status = 'rendering';

    var stageIdx = job.currentStageIdx;
    var stage = job.stages[stageIdx];
    if (!stage) {
      // Done
      job.status = 'done';
      job.progress = 100;
      job.completedAt = Date.now();
      job.resultUrl = _generateMockVideoUrl(job.storyboardId);
      delete _jobTimers[jobId];
      _emit('mtx:video-gen-done', {
        jobId: jobId,
        storyboardId: job.storyboardId,
        resultUrl: job.resultUrl,
      });
      return;
    }
    job.stageStartedAt = Date.now();

    var tick = function() {
      var current = _jobs[jobId];
      if (!current || current.cancelled) {
        delete _jobTimers[jobId];
        return;
      }
      var elapsed = Date.now() - current.stageStartedAt;
      var t = Math.min(1, elapsed / stage.durationMs);
      var pct = stage.from + (stage.to - stage.from) * t;
      current.progress = Math.round(pct);
      _emit('mtx:video-gen-progress', {
        jobId: jobId,
        progress: current.progress,
        stage: stage.id,
        stageLabel: stage.label,
        sceneIdx: stage.sceneIdx,
      });
      if (t >= 1) {
        current.currentStageIdx = stageIdx + 1;
        _runVideoStages(jobId);
        return;
      }
      _jobTimers[jobId] = setTimeout(tick, 220);
    };
    tick();
  }

  function pollJob(jobId) {
    var j = _jobs[jobId];
    if (!j) return null;
    var stage = j.stages[j.currentStageIdx] || j.stages[j.stages.length - 1];
    return {
      jobId: jobId,
      status: j.status,
      progress: j.progress,
      stage: stage && stage.id,
      stageLabel: stage && stage.label,
      currentSceneIdx: stage && stage.sceneIdx,
      totalScenes: (_storyboards[j.storyboardId] || {}).scenes ? _storyboards[j.storyboardId].scenes.length : 0,
      resultUrl: j.resultUrl || null,
      error: j.error || null,
    };
  }

  function cancelJob(jobId) {
    var j = _jobs[jobId];
    if (!j) return false;
    j.cancelled = true;
    j.status = 'cancelled';
    if (_jobTimers[jobId]) { clearTimeout(_jobTimers[jobId]); delete _jobTimers[jobId]; }
    _emit('mtx:video-gen-error', { jobId: jobId, error: 'cancelled' });
    return true;
  }

  // Audit CRIT-6: bulk cancel para invocar desde el bridge cuando user
  // cambia de conv. _runVideoStages es recursivo via setTimeout — sin
  // este cleanup los timers seguirían ejecutándose hasta los ~3 min full.
  function _cancelAllActive() {
    var count = 0;
    Object.keys(_jobs).forEach(function(id) {
      var j = _jobs[id];
      if (j && (j.status === 'queued' || j.status === 'rendering')) {
        cancelJob(id);
        count += 1;
      }
    });
    return count;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Mock video URL — SVG con cover frame estilizado (sin reproducir video real)
  // ──────────────────────────────────────────────────────────────────────────
  // Genera un data URI SVG que el componente IAArtifactVideoResult renderiza
  // como "video frame" con play button overlay. Cuando llegue backend, esto se
  // reemplaza por result_url (.mp4 real del CDN del Imperio).
  function _generateMockVideoUrl(storyboardId) {
    var sb = _storyboards[storyboardId];
    if (!sb) return null;
    // Devolvemos un objeto con cover_url (SVG) + duración + scenes para que el
    // componente render el "video frame". El cover usa la primera escena.
    var firstScene = sb.scenes[0];
    var ratio = ASPECT_RATIOS.find(function(r) { return r.id === sb.aspectRatio; }) || ASPECT_RATIOS[0];
    var w = ratio.w / 2, h = ratio.h / 2;  // half-size para el thumb
    var svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">',
      '<defs>',
      '<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">',
      '<stop offset="0%" stop-color="' + (firstScene.thumbnailColor || '#3dffd1') + '"/>',
      '<stop offset="100%" stop-color="#0a1410"/>',
      '</linearGradient>',
      '</defs>',
      '<rect width="100%" height="100%" fill="url(#g)"/>',
      '<text x="' + (w / 2) + '" y="' + (h * 0.5) + '" font-size="' + Math.min(w, h) * 0.32 + '" text-anchor="middle">' + firstScene.thumbnailIcon + '</text>',
      // Bottom info
      '<rect x="0" y="' + (h - 60) + '" width="100%" height="60" fill="black" opacity="0.65"/>',
      '<text x="20" y="' + (h - 32) + '" font-size="14" fill="white" font-family="Inter, sans-serif" font-weight="600" opacity="0.95">' + escapeXml(firstScene.title) + '</text>',
      '<text x="20" y="' + (h - 14) + '" font-size="11" fill="white" font-family="Inter, sans-serif" opacity="0.7">' + sb.scenes.length + ' escenas · ' + Math.round(sb.totalDuration) + 's</text>',
      '</svg>',
    ].join('');
    return {
      coverDataUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
      durationSec: sb.totalDuration,
      sceneCount: sb.scenes.length,
      scenes: sb.scenes,
      voiceId: sb.voiceId,
      aspectRatio: sb.aspectRatio,
      model: sb.model,
    };
  }

  // Audit IMP-4: escape completo XML (incluye apostrophes para attribute safety).
  function escapeXml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  // Mock seed — para que las conversaciones mock pre-cargadas en el historial
  // (Sprint A.8) puedan referenciar un storyboardId que ya tenga sus escenas
  // en el store. Solo se llama desde coach-mock-conversations al hidratar.
  // ──────────────────────────────────────────────────────────────────────────
  function seedMockStoryboard(opts) {
    if (!opts || !opts.storyboardId || !Array.isArray(opts.scenes)) return false;
    _storyboards[opts.storyboardId] = {
      storyboardId: opts.storyboardId,
      prompt: opts.prompt || '',
      scenes: opts.scenes.map(function(s, i) { return Object.assign({ idx: i }, s); }),
      voiceId: opts.voiceId || 'sage_warm',
      aspectRatio: opts.aspectRatio || '9:16',
      model: opts.model || 'seedance_2_0',
      totalDuration: opts.scenes.reduce(function(t, s) { return t + (s.durationSec || 4); }, 0),
      createdAt: Date.now(),
    };
    return true;
  }

  window.__mtxVideoGen = {
    // Catálogo
    listModels: listModels,
    getModel: getModel,
    listVoices: listVoices,
    getVoice: getVoice,
    listAspectRatios: listAspectRatios,
    // Storyboard
    submitStoryboard: submitStoryboard,
    getStoryboard: getStoryboard,
    updateScene: updateScene,
    removeScene: removeScene,
    addScene: addScene,
    setVoice: setVoice,
    estimateCost: estimateCost,
    recommendVoiceForScenes: recommendVoiceForScenes,
    // Video generation
    submitVideo: submitVideo,
    pollJob: pollJob,
    cancelJob: cancelJob,
    // Mock seed (solo usado por coach-mock-conversations)
    seedMockStoryboard: seedMockStoryboard,
    // Audit CRIT-6
    _cancelAllActive: _cancelAllActive,
  };
})();
