// screens/ia-knowledge.jsx — Fase 2.3: Conocimiento (contexto del user)
// ─────────────────────────────────────────────────────────────────────────────
// Sección NUEVA dentro de la tab Conocimiento. Se renderiza ARRIBA de la
// sección existente "Áreas de expertise" (que controla qué tan profundo sabe
// el coach por dominio). Ambas son COMPLEMENTARIAS:
//
//   Expertise (ya existía) → cómo PIENSA el coach (knowledge base genérica)
//   Fuentes (NUEVA aquí)   → qué SABE de TI (contexto personal ingestado)
//
// Cada fuente se "ingesta": el contenido se procesa, se trocea en chunks, se
// embeddings vectoriales (en backend real con pgvector). Luego el coach puede
// citarla en respuestas vía RAG: "Encontré esto en tu journal del 8 de marzo".
//
// Source kinds soportados:
//   • pdf   — sube archivo PDF (max 10 MB)
//   • url   — pega URL, sistema fetcha + parsea
//   • audio — graba o sube audio, sistema transcribe (Whisper en backend)
//   • text  — pega texto crudo
//
// Cuando entre Mastra/backend final, este store se mapea a tabla
// `user_knowledge_sources` con RLS por user_id. Chunks viven en
// `knowledge_chunks` con FK a source + vector embeddings (pgvector).
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxIAKnowledge) return;

  // ── Catálogo de dominios (reusa los de Skills si están cargados) ────────
  var _DOMAINS = (typeof window !== 'undefined' && window.__mtxIASkills && window.__mtxIASkills.getCategories)
    ? window.__mtxIASkills.getCategories()
    : {
        productividad: { label: 'Productividad', accent: '#3dffd1' },
        bienestar:     { label: 'Bienestar',     accent: '#9b8aff' },
        aprendizaje:   { label: 'Aprendizaje',   accent: '#5dd3ff' },
        creatividad:   { label: 'Creatividad',   accent: '#ffc850' },
        relaciones:    { label: 'Relaciones',    accent: '#ff8b8b' },
      };

  // ── Source kinds metadata ───────────────────────────────────────────────
  var _SOURCE_KINDS = {
    pdf:   { icon: '📕', label: 'PDF',    accent: '#ff8b8b', placeholderTitle: 'Documento PDF' },
    url:   { icon: '🌐', label: 'URL',    accent: '#5dd3ff', placeholderTitle: 'Artículo web' },
    audio: { icon: '🎙️', label: 'Audio',  accent: '#9b8aff', placeholderTitle: 'Nota de voz' },
    text:  { icon: '📝', label: 'Texto',  accent: '#3dffd1', placeholderTitle: 'Nota de texto' },
  };

  // ── Mock data inicial — 5 fuentes para que la UI se vea poblada ─────────
  // Mix realista: 2 PDFs (libros), 2 URLs (artículos), 1 audio (voice memo)
  // + 1 texto. chunkCount aproximado al tamaño esperado del contenido.
  var _initialSources = [
    {
      id: 'src-habits-pdf',
      kind: 'pdf',
      title: 'Hábitos Atómicos · Notas y highlights',
      preview: 'Resumen de las ideas centrales: identidad antes que metas, 1% mejora diaria, hábito atómico, sistema de hábitos, las 4 leyes…',
      url: null,
      fileSize: 412,  // KB
      chunkCount: 47,
      dominio: 'productividad',
      status: 'ready',
      readyForSkill: true,
      addedAt: Date.now() - 1000 * 60 * 60 * 24 * 12,  // hace 12 días
    },
    {
      id: 'src-pg-greatwork',
      kind: 'url',
      title: 'How to Do Great Work — Paul Graham',
      preview: 'Choose work you genuinely find interesting. Develop fierce curiosity. Build the right kind of friction.',
      url: 'https://paulgraham.com/greatwork.html',
      chunkCount: 38,
      dominio: 'aprendizaje',
      status: 'ready',
      readyForSkill: true,
      addedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,  // hace 7 días
    },
    {
      id: 'src-voice-12may',
      kind: 'audio',
      title: 'Reflexión semanal · 12 de mayo',
      preview: 'Esta semana noté que mis bloques de enfoque más productivos son entre 7 y 9am. Necesito proteger ese tiempo…',
      audioMs: 188000,  // 3:08
      chunkCount: 12,
      dominio: 'bienestar',
      status: 'ready',
      readyForSkill: true,
      addedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,  // hace 2 días
    },
    {
      id: 'src-valores',
      kind: 'text',
      title: 'Mis valores fundamentales',
      preview: 'Honestidad radical. Trabajo profundo. Salud antes que productividad. Familia. Curiosidad. Build in public.',
      chunkCount: 4,
      dominio: 'bienestar',
      status: 'ready',
      readyForSkill: true,
      addedAt: Date.now() - 1000 * 60 * 60 * 24 * 21,  // hace 3 semanas
    },
    {
      id: 'src-karpathy',
      kind: 'url',
      title: 'Lex Fridman · Andrej Karpathy · Transcript',
      preview: 'Karpathy on transformer architecture, GPT mental models, how to learn AI from scratch in 2025, education first principles…',
      url: 'https://lexfridman.com/andrej-karpathy-transcript/',
      chunkCount: 89,
      dominio: 'aprendizaje',
      status: 'ready',
      readyForSkill: true,
      addedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,  // hace 4 días
    },
  ];

  var _state = {
    sources: _initialSources,
  };

  function _emit() {
    window.dispatchEvent(new CustomEvent('mtx:ia-knowledge-changed', {
      detail: { snapshot: JSON.parse(JSON.stringify(_state)) },
    }));
  }

  function _genId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _detectDomain(text) {
    // Post-audit Fase 2: añadidos word boundaries para evitar matches
    // espurios (ej. "producción" antes matcheaba "producti"). Quitado /i
    // redundante (string ya está lowercased).
    var lc = String(text || '').toLowerCase();
    if (/\b(productiv|enfoqu|h(á|a)bito|gesti(ó|o)n|deadline|trabajo)/.test(lc)) return 'productividad';
    if (/\b(medita|respira|bienestar|estr(é|e)s|salud|sue(ñ|n)o|gratitud)/.test(lc)) return 'bienestar';
    if (/\b(aprend|estudi|leer|libro|investig|curso|tutorial)/.test(lc)) return 'aprendizaje';
    if (/\b(crea(r|tiv)|arte?\b|dise(ñ|n)o|m(ú|u)sica|escrib|fotograf)/.test(lc)) return 'creatividad';
    if (/\b(familia|amigos|pareja|relaci(ó|o)n|amor)/.test(lc)) return 'relaciones';
    return 'aprendizaje';
  }

  // Mock chunkCount based on content size — backend real lo calcula con tokenizer
  function _estimateChunks(opts) {
    if (opts.kind === 'pdf') {
      var kb = opts.fileSize || 200;
      return Math.max(5, Math.round(kb * 0.12));  // ~0.12 chunks/KB approx
    }
    if (opts.kind === 'audio') {
      var ms = opts.audioMs || 60000;
      return Math.max(3, Math.round(ms / 15000));  // 1 chunk per 15 sec
    }
    if (opts.kind === 'url') {
      // Mock: 25-60 chunks for typical article
      return 25 + Math.floor(Math.random() * 36);
    }
    // text
    var len = (opts.rawText || '').length;
    return Math.max(1, Math.ceil(len / 400));
  }

  function _formatRelative(ts) {
    if (!ts) return 'Nunca';
    var diff = Date.now() - ts;
    // Clock skew guard — ts en el futuro produce diff negativo (post-audit Fase 2)
    if (diff < 0) return 'Recién';
    if (diff < 60 * 1000) return 'Hace un momento';
    if (diff < 60 * 60 * 1000) return 'Hace ' + Math.floor(diff / (60 * 1000)) + ' min';
    if (diff < 24 * 60 * 60 * 1000) return 'Hace ' + Math.floor(diff / (60 * 60 * 1000)) + 'h';
    var days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 1) return 'Ayer';
    if (days < 7) return 'Hace ' + days + ' días';
    if (days < 30) {
      var w = Math.floor(days / 7);
      return 'Hace ' + w + ' semana' + (w === 1 ? '' : 's');
    }
    var mo = Math.floor(days / 30);
    return 'Hace ' + mo + ' mes' + (mo === 1 ? '' : 'es');
  }

  function _formatFileSize(kb) {
    if (!kb) return '';
    if (kb < 1024) return kb + ' KB';
    return (kb / 1024).toFixed(1) + ' MB';
  }

  function _formatAudioDuration(ms) {
    if (!ms) return '';
    var sec = Math.round(ms / 1000);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  window.__mtxIAKnowledge = {
    snapshot: function() { return JSON.parse(JSON.stringify(_state)); },

    getSources: function() {
      return _state.sources.slice().sort(function(a, b) {
        return (b.addedAt || 0) - (a.addedAt || 0);  // recientes primero
      });
    },

    getSource: function(id) {
      var s = _state.sources.find(function(x) { return x.id === id; });
      return s ? Object.assign({}, s) : null;
    },

    getDomains: function() {
      return Object.assign({}, _DOMAINS);
    },

    getSourceKinds: function() {
      return Object.assign({}, _SOURCE_KINDS);
    },

    // Ingest nueva fuente. opts: { kind, title, url?, rawText?, fileSize?, audioMs?, dominio? }
    ingestSource: function(opts) {
      var kind = opts.kind || 'text';
      if (!_SOURCE_KINDS[kind]) return null;

      var title = String(opts.title || '').trim() || _SOURCE_KINDS[kind].placeholderTitle;
      var preview = String(opts.preview || opts.rawText || '').trim().slice(0, 200);
      // Auto-detect dominio si no se especifica
      var dominio = opts.dominio && _DOMAINS[opts.dominio]
        ? opts.dominio
        : _detectDomain(title + ' ' + preview);

      var chunkCount = _estimateChunks(opts);

      var source = {
        id:            _genId('src'),
        kind:          kind,
        title:         title,
        preview:       preview,
        url:           opts.url || null,
        rawText:       opts.rawText || null,
        fileSize:      opts.fileSize || null,
        audioMs:       opts.audioMs || null,
        chunkCount:    chunkCount,
        dominio:       dominio,
        status:        'ready',  // mock — en backend será 'processing' inicialmente
        readyForSkill: chunkCount >= 3,
        addedAt:       Date.now(),
      };
      _state.sources = [source].concat(_state.sources);
      _emit();
      return source;
    },

    deleteSource: function(id) {
      _state.sources = _state.sources.filter(function(s) { return s.id !== id; });
      _emit();
    },

    getStats: function() {
      var sources = _state.sources;
      var totalChunks = sources.reduce(function(sum, s) { return sum + (s.chunkCount || 0); }, 0);
      var activeSources = sources.filter(function(s) { return s.status === 'ready'; }).length;
      var domainsCovered = {};
      sources.forEach(function(s) { if (s.dominio) domainsCovered[s.dominio] = true; });
      var readyForSkillCount = sources.filter(function(s) { return s.readyForSkill; }).length;
      return {
        totalSources:       sources.length,
        activeSources:      activeSources,
        totalChunks:        totalChunks,
        domainsCovered:     Object.keys(domainsCovered).length,
        readyForSkillCount: readyForSkillCount,
      };
    },

    // Utils
    formatRelative:      _formatRelative,
    formatFileSize:      _formatFileSize,
    formatAudioDuration: _formatAudioDuration,
  };

  // Emit inicial async para destrabar consumidores que se montaron antes
  // de que la store estuviera lista (race condition con orden de scripts).
  // Post-audit Fase 2.
  setTimeout(_emit, 0);
})();


function useIAKnowledge() {
  var force = React.useReducer(function(x) { return x + 1; }, 0)[1];
  React.useEffect(function() {
    var h = function() { force(); };
    window.addEventListener('mtx:ia-knowledge-changed', h);
    return function() { window.removeEventListener('mtx:ia-knowledge-changed', h); };
  }, []);
  return (typeof window !== 'undefined' && window.__mtxIAKnowledge)
    ? window.__mtxIAKnowledge.snapshot()
    : null;
}


// ═══════════════════════════════════════════════════════════════════════════
// SourceCard — render de una fuente en la lista
// ═══════════════════════════════════════════════════════════════════════════

function SourceCard(props) {
  var source = props.source;
  var onOpenDetail = props.onOpenDetail;
  var domains = window.__mtxIAKnowledge.getDomains();
  var kinds = window.__mtxIAKnowledge.getSourceKinds();
  var dom = domains[source.dominio] || { label: source.dominio, accent: 'var(--neon)' };
  var kindInfo = kinds[source.kind] || kinds.text;

  // URL constructor puede lanzar para strings malformados — wrap defensivo.
  // Post-audit Fase 2: antes podía crashear el render del list completo.
  var sizeLabel = null;
  if (source.kind === 'pdf') sizeLabel = window.__mtxIAKnowledge.formatFileSize(source.fileSize);
  else if (source.kind === 'audio') sizeLabel = window.__mtxIAKnowledge.formatAudioDuration(source.audioMs);
  else if (source.kind === 'url') {
    try {
      sizeLabel = new URL(source.url).hostname.replace(/^www\./, '');
    } catch (_) {
      sizeLabel = (source.url || '').replace(/^https?:\/\//, '').split('/')[0] || 'URL';
    }
  }

  return (
    <button
      onClick={onOpenDetail}
      aria-label={'Ver detalle: ' + source.title}
      className="mtx-tap"
      style={{
        appearance: 'none', cursor: 'pointer', textAlign: 'left',
        width: '100%',
        padding: '12px 14px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        animation: 'mtx-fade-up .25s ease both',
        transition: 'all .2s',
      }}>
      {/* Icon tile por kind */}
      <div style={{
        width: 40, height: 40, borderRadius: 11, flexShrink: 0,
        background: 'linear-gradient(135deg, ' + kindInfo.accent + '22, ' + kindInfo.accent + '06)',
        border: '0.5px solid ' + kindInfo.accent + '30',
        color: kindInfo.accent,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 19, lineHeight: 1,
      }}>
        <span role="img" aria-hidden="true">{kindInfo.icon}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title */}
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: 'var(--ink-1)',
          letterSpacing: '-0.012em',
          fontFamily: 'var(--ff-display, var(--ff-sans))',
          lineHeight: 1.25,
          marginBottom: 4,
          display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{source.title}</div>

        {/* Meta row */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          fontSize: 9.5, color: 'var(--ink-4)',
          letterSpacing: '0.06em',
          fontFamily: 'var(--ff-sans)',
          marginBottom: source.preview ? 6 : 0,
        }}>
          <span style={{ color: kindInfo.accent, fontWeight: 700 }}>{kindInfo.label.toUpperCase()}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ color: dom.accent, fontWeight: 600 }}>{dom.label.toUpperCase()}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{source.chunkCount} chunks</span>
          {sizeLabel && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{sizeLabel}</span>
            </>
          )}
        </div>

        {/* Preview */}
        {source.preview && (
          <div style={{
            fontSize: 11.5, color: 'var(--ink-3)',
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
            display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: 6,
          }}>{source.preview}</div>
        )}

        {/* Footer: age + ready badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8,
        }}>
          <div style={{
            fontSize: 9.5, color: 'var(--ink-4)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
          }}>{window.__mtxIAKnowledge.formatRelative(source.addedAt)}</div>
          {source.readyForSkill && (
            <div style={{
              fontSize: 8.5, fontWeight: 700,
              color: 'var(--neon)',
              letterSpacing: '0.10em',
              padding: '3px 7px', borderRadius: 999,
              background: 'rgba(61,255,209,0.08)',
              border: '0.5px solid rgba(61,255,209,0.24)',
            }}>✦ LISTO PARA SKILL</div>
          )}
        </div>
      </div>
    </button>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// IngestSourceModal — 4 tabs (PDF / URL / Audio / Texto)
// ═══════════════════════════════════════════════════════════════════════════

function IngestSourceModal(props) {
  var onClose = props.onClose;
  var onIngested = props.onIngested;

  var kindState = React.useState('text');
  var kind = kindState[0]; var setKind = kindState[1];

  var titleState = React.useState('');
  var title = titleState[0]; var setTitle = titleState[1];

  var urlState = React.useState('');
  var url = urlState[0]; var setUrl = urlState[1];

  var rawTextState = React.useState('');
  var rawText = rawTextState[0]; var setRawText = rawTextState[1];

  var fileSizeState = React.useState(null);
  var fileSize = fileSizeState[0]; var setFileSize = fileSizeState[1];

  var fileNameState = React.useState('');
  var fileName = fileNameState[0]; var setFileName = fileNameState[1];

  var audioMsState = React.useState(null);
  var audioMs = audioMsState[0]; var setAudioMs = audioMsState[1];

  // Toast siempre llamado (hook count estable) — post-audit Fase 2
  var _useToast = window.useToast || function() { return { show: function() {} }; };
  var toast = _useToast();

  // ESC — ref pattern + guards completos: SELECT, contentEditable, IME composition.
  // Post-audit Fase 2 blind spot #2 + #9.
  var onCloseRef = React.useRef(onClose);
  React.useEffect(function() { onCloseRef.current = onClose; });
  React.useEffect(function() {
    var onKey = function(e) {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);

  // Body scroll lock (post-audit Fase 2)
  React.useEffect(function() {
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function() { document.body.style.overflow = prev; };
  }, []);

  function _handleFilePick(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    // Enforce 10MB cap — la UI promete "max 10 MB" (post-audit Fase 2)
    var MAX_BYTES = 10 * 1024 * 1024;
    if (f.size > MAX_BYTES) {
      toast.show({ message: 'PDF excede 10 MB', duration: 1800 });
      e.target.value = '';
      return;
    }
    setFileName(f.name);
    setFileSize(Math.round(f.size / 1024));  // KB
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ''));
    // Reset input para permitir re-picking del mismo file (post-audit)
    e.target.value = '';
  }

  function _handleAudioMockRecord() {
    // Mock: simulamos haber grabado un audio de duración random 30-180s
    var ms = (30 + Math.floor(Math.random() * 150)) * 1000;
    setAudioMs(ms);
    if (!title) {
      var d = new Date();
      setTitle('Nota de voz · ' + d.getDate() + ' ' + ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()]);
    }
  }

  function _canIngest() {
    var hasTitle = title.trim().length >= 2;
    if (!hasTitle && kind !== 'pdf' && kind !== 'audio') return false;  // pdf y audio auto-generan title
    if (kind === 'pdf')   return !!fileSize;
    if (kind === 'url') {
      // Validación robusta via URL constructor (post-audit Fase 2: el regex
      // anterior aceptaba strings con espacios que después crasheaban URL()).
      try {
        var u = new URL(url.trim());
        return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname;
      } catch (_) { return false; }
    }
    if (kind === 'audio') return !!audioMs;
    if (kind === 'text')  return rawText.trim().length >= 30;
    return false;
  }

  function _handleIngest() {
    if (!_canIngest()) return;
    var opts = { kind: kind, title: title.trim() };
    if (kind === 'pdf') {
      opts.fileSize = fileSize;
      opts.preview = 'Documento PDF ingestado: ' + fileName + '. Mentex procesará el contenido y generará embeddings vectoriales.';
    } else if (kind === 'url') {
      opts.url = url.trim();
      opts.preview = 'Artículo web ingestado desde ' + url.trim() + '. Mentex parseará el contenido principal.';
    } else if (kind === 'audio') {
      opts.audioMs = audioMs;
      opts.preview = 'Nota de voz ingestada. Mentex transcribirá el audio y generará chunks.';
    } else if (kind === 'text') {
      opts.rawText = rawText.trim();
      opts.preview = rawText.trim().slice(0, 200);
    }
    var source = window.__mtxIAKnowledge.ingestSource(opts);
    if (source && onIngested) onIngested(source);
    onClose();
  }

  var KIND_TABS = [
    { id: 'pdf',   label: 'PDF',    icon: '📕' },
    { id: 'url',   label: 'URL',    icon: '🌐' },
    { id: 'audio', label: 'Audio',  icon: '🎙️' },
    { id: 'text',  label: 'Texto',  icon: '📝' },
  ];

  var kinds = window.__mtxIAKnowledge.getSourceKinds();
  var currentKind = kinds[kind];

  // Portal
  var portalRoot = (typeof document !== 'undefined')
    ? document.getElementById('mtx-overlay-root')
    : null;
  if (!portalRoot) return null;

  var content = (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={function(e) { e.stopPropagation(); }}
        className="mtx-no-scrollbar"
        style={{
          background: 'rgba(15,19,19,0.96)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderTop: '0.5px solid rgba(255,255,255,0.10)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '14px 20px 24px',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
          maxHeight: '90%', overflow: 'auto',
          animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
        }}>
        {/* Grabber */}
        <div style={{
          width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
          background: 'rgba(255,255,255,0.16)',
        }}/>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 13, flexShrink: 0,
              background: 'linear-gradient(135deg, ' + currentKind.accent + '22, ' + currentKind.accent + '06)',
              border: '0.5px solid ' + currentKind.accent + '30',
              color: currentKind.accent,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>{currentKind.icon}</div>
            <div>
              <div style={{
                fontSize: 15, fontWeight: 700,
                color: 'var(--ink-1)',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
                letterSpacing: '-0.015em',
                lineHeight: 1.2, marginBottom: 2,
              }}>Ingestar contenido</div>
              <div style={{
                fontSize: 11.5, color: 'var(--ink-3)',
                lineHeight: 1.35,
                letterSpacing: '-0.005em',
              }}>Mentex procesará y generará chunks para RAG</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            className="mtx-tap"
            style={{
              width: 32, height: 32, borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              color: 'var(--ink-2)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 13,
            }}>✕</button>
        </div>

        {/* Kind tabs */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
          {KIND_TABS.map(function(t) {
            var isActive = kind === t.id;
            var accent = kinds[t.id].accent;
            return (
              <button key={t.id}
                onClick={function() { setKind(t.id); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  flex: 1, padding: '8px 6px', borderRadius: 11,
                  background: isActive
                    ? 'linear-gradient(135deg, ' + accent + '20, ' + accent + '05)'
                    : 'rgba(255,255,255,0.025)',
                  border: '0.5px solid ' + (isActive ? accent + '40' : 'rgba(255,255,255,0.06)'),
                  color: isActive ? accent : 'var(--ink-2)',
                  fontSize: 11, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  transition: 'all .2s',
                }}>
                <span aria-hidden="true">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content per kind */}
        {kind === 'pdf' && (
          <div>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--ink-3)', marginBottom: 8,
            }}>Archivo PDF</div>
            <label
              htmlFor="mtx-knowledge-pdf-input"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 14px', borderRadius: 14,
                background: 'rgba(255,255,255,0.025)',
                border: '0.5px dashed rgba(255,139,139,0.30)',
                cursor: 'pointer',
                marginBottom: 14,
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: 'rgba(255,139,139,0.10)',
                border: '0.5px solid rgba(255,139,139,0.24)',
                color: '#ff8b8b',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17,
              }}>📕</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: fileName ? 'var(--ink-1)' : 'var(--ink-3)',
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  marginBottom: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{fileName || 'Toca para seleccionar archivo'}</div>
                <div style={{
                  fontSize: 10.5, color: 'var(--ink-4)',
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                }}>{fileSize ? window.__mtxIAKnowledge.formatFileSize(fileSize) : 'PDF max 10 MB'}</div>
              </div>
            </label>
            <input
              id="mtx-knowledge-pdf-input"
              type="file"
              accept=".pdf"
              onChange={_handleFilePick}
              style={{ display: 'none' }}
            />
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--ink-3)', marginBottom: 6,
            }}>Título (opcional)</div>
            <input
              type="text"
              value={title}
              onChange={function(e) { setTitle(e.target.value); }}
              placeholder="Auto desde el nombre del archivo"
              maxLength={120}
              style={{
                width: '100%', boxSizing: 'border-box',
                appearance: 'none', outline: 'none',
                background: 'rgba(0,0,0,0.20)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '11px 14px',
                color: 'var(--ink-1)',
                fontSize: 13, fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}
            />
          </div>
        )}

        {kind === 'url' && (
          <div>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--ink-3)', marginBottom: 6,
            }}>URL del artículo</div>
            <input
              type="url"
              value={url}
              onChange={function(e) {
                setUrl(e.target.value);
                // Auto-title desde URL
                if (!title) {
                  try {
                    var u = new URL(e.target.value);
                    var path = u.pathname.split('/').filter(Boolean).pop() || u.hostname;
                    var clean = path.replace(/[-_]/g, ' ').replace(/\.[a-z]+$/, '');
                    setTitle(clean.charAt(0).toUpperCase() + clean.slice(1));
                  } catch (_) {}
                }
              }}
              placeholder="https://paulgraham.com/greatwork.html"
              style={{
                width: '100%', boxSizing: 'border-box',
                appearance: 'none', outline: 'none',
                background: 'rgba(0,0,0,0.20)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '12px 14px',
                color: 'var(--ink-1)',
                fontSize: 13.5, fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                marginBottom: 14,
              }}
            />
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--ink-3)', marginBottom: 6,
            }}>Título (opcional)</div>
            <input
              type="text"
              value={title}
              onChange={function(e) { setTitle(e.target.value); }}
              placeholder="Auto desde la URL"
              maxLength={120}
              style={{
                width: '100%', boxSizing: 'border-box',
                appearance: 'none', outline: 'none',
                background: 'rgba(0,0,0,0.20)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '11px 14px',
                color: 'var(--ink-1)',
                fontSize: 13, fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}
            />
          </div>
        )}

        {kind === 'audio' && (
          <div>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--ink-3)', marginBottom: 8,
            }}>Grabar o subir audio</div>
            <button
              onClick={_handleAudioMockRecord}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                width: '100%',
                padding: '20px 14px', borderRadius: 14,
                background: audioMs
                  ? 'linear-gradient(135deg, rgba(155,138,255,0.12), rgba(155,138,255,0.02))'
                  : 'rgba(255,255,255,0.025)',
                border: '0.5px dashed ' + (audioMs ? 'rgba(155,138,255,0.40)' : 'rgba(155,138,255,0.24)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                marginBottom: 14,
                transition: 'all .2s',
              }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: audioMs
                  ? 'linear-gradient(135deg, #9b8aff, #6f5fdf)'
                  : 'rgba(155,138,255,0.18)',
                border: '0.5px solid ' + (audioMs ? 'rgba(155,138,255,0.40)' : 'rgba(155,138,255,0.30)'),
                color: audioMs ? '#fff' : '#9b8aff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
                boxShadow: audioMs ? '0 0 16px rgba(155,138,255,0.40)' : 'none',
              }}>{audioMs ? '✓' : '🎙️'}</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: 'var(--ink-1)',
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                }}>{audioMs ? 'Audio grabado' : 'Toca para grabar'}</div>
                <div style={{
                  fontSize: 10.5, color: 'var(--ink-4)',
                  marginTop: 2,
                  fontFamily: 'var(--ff-sans)',
                }}>{audioMs ? window.__mtxIAKnowledge.formatAudioDuration(audioMs) + ' · Listo' : 'Mentex transcribe el audio automáticamente'}</div>
              </div>
            </button>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--ink-3)', marginBottom: 6,
            }}>Título (opcional)</div>
            <input
              type="text"
              value={title}
              onChange={function(e) { setTitle(e.target.value); }}
              placeholder="Auto desde la fecha"
              maxLength={120}
              style={{
                width: '100%', boxSizing: 'border-box',
                appearance: 'none', outline: 'none',
                background: 'rgba(0,0,0,0.20)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '11px 14px',
                color: 'var(--ink-1)',
                fontSize: 13, fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}
            />
          </div>
        )}

        {kind === 'text' && (
          <div>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--ink-3)', marginBottom: 6,
            }}>Título</div>
            <input
              type="text"
              value={title}
              onChange={function(e) { setTitle(e.target.value); }}
              placeholder="Ej: Mis valores fundamentales"
              maxLength={120}
              style={{
                width: '100%', boxSizing: 'border-box',
                appearance: 'none', outline: 'none',
                background: 'rgba(0,0,0,0.20)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '12px 14px',
                color: 'var(--ink-1)',
                fontSize: 13, fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                marginBottom: 12,
              }}
            />
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--ink-3)', marginBottom: 6,
            }}>Contenido</div>
            <textarea
              value={rawText}
              onChange={function(e) { setRawText(e.target.value); }}
              placeholder="Pega o escribe el texto que quieras que el coach conozca. Mínimo 30 caracteres. Mentex generará chunks y embeddings."
              maxLength={20000}
              rows={6}
              style={{
                width: '100%', boxSizing: 'border-box',
                appearance: 'none', outline: 'none',
                background: 'rgba(0,0,0,0.20)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '12px 14px',
                color: 'var(--ink-1)',
                fontSize: 13, lineHeight: 1.55,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                resize: 'none',
              }}
            />
            <div style={{
              fontSize: 10, color: 'var(--ink-4)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              marginTop: 4,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}>{rawText.length} / 20000</div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={_handleIngest}
          onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _handleIngest(); } }}
          disabled={!_canIngest()}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: _canIngest() ? 'pointer' : 'not-allowed',
            width: '100%', padding: '13px 14px', borderRadius: 14, border: 0,
            marginTop: 18,
            background: _canIngest()
              ? 'linear-gradient(135deg, var(--neon), #1ad9ad)'
              : 'rgba(255,255,255,0.04)',
            color: _canIngest() ? '#0a1410' : 'var(--ink-4)',
            fontSize: 14, fontWeight: 700,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.01em',
            opacity: _canIngest() ? 1 : 0.5,
            boxShadow: _canIngest() ? '0 4px 14px -2px rgba(61,255,209,0.42)' : 'none',
            transition: 'all .2s',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          <span>✦</span> Ingestar contenido
        </button>
      </div>
    </div>
  );

  return window.ReactDOM ? window.ReactDOM.createPortal(content, portalRoot) : content;
}


// ═══════════════════════════════════════════════════════════════════════════
// SourceDetailSheet — vista detallada de una fuente
// ═══════════════════════════════════════════════════════════════════════════

function SourceDetailSheet(props) {
  var source = props.source;
  var onClose = props.onClose;
  var onDelete = props.onDelete;

  var domains = window.__mtxIAKnowledge.getDomains();
  var kinds = window.__mtxIAKnowledge.getSourceKinds();
  var dom = domains[source.dominio] || { label: source.dominio, accent: 'var(--neon)' };
  var kindInfo = kinds[source.kind] || kinds.text;

  // ESC — ref pattern + guards completos (post-audit Fase 2)
  var onCloseRef = React.useRef(onClose);
  React.useEffect(function() { onCloseRef.current = onClose; });
  React.useEffect(function() {
    var onKey = function(e) {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);

  // Body scroll lock (post-audit Fase 2)
  React.useEffect(function() {
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function() { document.body.style.overflow = prev; };
  }, []);

  // Mock chunks preview — 3 chunks de ejemplo. Backend devolverá los reales
  // ordenados por relevance score o por orden secuencial del documento.
  var MOCK_CHUNK_PREVIEWS = {
    'src-habits-pdf': [
      'No te enfoques en metas, enfócate en sistemas. Las metas son sobre el resultado que quieres lograr; los sistemas son sobre los procesos que llevan a esos resultados.',
      'Cada acción que tomas es un voto por la persona que quieres ser. El verdadero cambio de hábito es cambio de identidad.',
      'Las 4 leyes del cambio de comportamiento: hacerlo obvio, hacerlo atractivo, hacerlo fácil, hacerlo satisfactorio.',
    ],
    'src-pg-greatwork': [
      'The first step is to decide what to work on. Try things and see what you can\'t stop thinking about.',
      'Develop a habit of working on your own projects. Don\'t let "work" mean only what others tell you to do.',
      'Trying to be original is one of the most reliable ways to be derivative. Just try to be honest.',
    ],
    'src-voice-12may': [
      'Esta semana noté que mis bloques de enfoque más productivos son entre 7 y 9 de la mañana. Necesito proteger ese tiempo.',
      'El error que estoy cometiendo: empiezo el día revisando email en vez de hacer deep work primero.',
      'Decisión: empezar mañana lunes haciendo focus block de 8-9:30am ANTES de abrir cualquier comunicación.',
    ],
    'src-valores': [
      'Honestidad radical. Mejor decir lo incómodo a tiempo que callar y construir resentimiento.',
      'Trabajo profundo. 4 horas reales > 12 horas dispersas.',
      'Salud antes que productividad. Sin cuerpo no hay obra.',
      'Familia. Construir con presencia, no con horarios.',
    ],
    'src-karpathy': [
      'GPT mental model: it\'s a function that maps from sequences of tokens to next-token distributions. Everything else is engineering on top.',
      'Build your own things. There\'s no substitute for the learning that comes from struggle with real problems.',
      'The best teachers in the world right now are open source codebases. Read andrej-karpathy/llm.c.',
    ],
  };
  var chunkSamples = MOCK_CHUNK_PREVIEWS[source.id] || [
    source.preview,
    'Más chunks de este contenido están indexados en pgvector y disponibles para que el coach los consulte vía RAG.',
    'Cuando el agente de Mastra esté conectado en backend, citará chunks específicos en sus respuestas: "Encontré esto en tu fuente X".',
  ];

  var sizeLabel = source.kind === 'pdf'
    ? window.__mtxIAKnowledge.formatFileSize(source.fileSize)
    : source.kind === 'audio'
      ? window.__mtxIAKnowledge.formatAudioDuration(source.audioMs)
      : null;

  var portalRoot = (typeof document !== 'undefined')
    ? document.getElementById('mtx-overlay-root')
    : null;
  if (!portalRoot) return null;

  var content = (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'mtx-fade-up .25s ease',
    }} onClick={onClose}>
      <div onClick={function(e) { e.stopPropagation(); }}
        className="mtx-no-scrollbar"
        style={{
          background: 'rgba(15,19,19,0.96)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderTop: '0.5px solid rgba(255,255,255,0.10)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '14px 20px 28px',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
          maxHeight: '90%', overflow: 'auto',
          animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
        }}>
        {/* Grabber */}
        <div style={{
          width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
          background: 'rgba(255,255,255,0.16)',
        }}/>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, ' + kindInfo.accent + '28, ' + kindInfo.accent + '08)',
            border: '0.5px solid ' + kindInfo.accent + '40',
            color: kindInfo.accent,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, lineHeight: 1,
            boxShadow: '0 0 18px ' + kindInfo.accent + '22',
          }}>
            <span role="img" aria-hidden="true">{kindInfo.icon}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, marginBottom: 4,
              color: kindInfo.accent, letterSpacing: '0.14em',
            }}>{kindInfo.label.toUpperCase()} · {dom.label.toUpperCase()}</div>
            <div style={{
              fontSize: 17, fontWeight: 700,
              color: 'var(--ink-1)',
              letterSpacing: '-0.018em',
              lineHeight: 1.25,
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              marginBottom: 6,
            }}>{source.title}</div>
            {source.url && (
              <div style={{
                fontSize: 11, color: 'var(--ink-3)',
                letterSpacing: '-0.005em',
                fontFamily: 'var(--ff-sans)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{source.url}</div>
            )}
          </div>
        </div>

        {/* Metadata grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
          marginBottom: 18,
        }}>
          <div style={{
            padding: '10px 10px', borderRadius: 12,
            background: 'rgba(255,255,255,0.025)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 16, fontWeight: 800,
              color: 'var(--ink-1)',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.018em',
              lineHeight: 1, marginBottom: 4,
            }}>{source.chunkCount}</div>
            <div style={{
              fontSize: 8.5, color: 'var(--ink-4)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.04em',
            }}>CHUNKS</div>
          </div>
          <div style={{
            padding: '10px 10px', borderRadius: 12,
            background: 'rgba(255,255,255,0.025)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 12, fontWeight: 700,
              color: 'var(--ink-1)',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              letterSpacing: '-0.012em',
              lineHeight: 1.1, marginBottom: 4,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{window.__mtxIAKnowledge.formatRelative(source.addedAt)}</div>
            <div style={{
              fontSize: 8.5, color: 'var(--ink-4)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.04em',
            }}>INGESTADO</div>
          </div>
          <div style={{
            padding: '10px 10px', borderRadius: 12,
            background: 'rgba(255,255,255,0.025)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: source.readyForSkill ? 'var(--neon)' : 'var(--ink-3)',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              letterSpacing: '-0.012em',
              lineHeight: 1.1, marginBottom: 4,
            }}>{sizeLabel || (source.readyForSkill ? '✓' : '—')}</div>
            <div style={{
              fontSize: 8.5, color: 'var(--ink-4)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.04em',
            }}>{source.kind === 'pdf' ? 'TAMAÑO' : source.kind === 'audio' ? 'DURACIÓN' : 'PARA SKILL'}</div>
          </div>
        </div>

        {/* Chunks preview */}
        <div style={{ marginBottom: 18 }}>
          <div className="mtx-eyebrow" style={{
            fontSize: 9, color: 'var(--ink-3)', marginBottom: 10,
          }}>Preview de chunks indexados</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chunkSamples.map(function(c, i) {
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.02)',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                    background: dom.accent + '14',
                    border: '0.5px solid ' + dom.accent + '32',
                    color: dom.accent,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800,
                    fontFamily: 'var(--ff-sans)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{i + 1}</div>
                  <div style={{
                    flex: 1, paddingTop: 2,
                    fontSize: 12, color: 'var(--ink-2)',
                    lineHeight: 1.55,
                    letterSpacing: '-0.005em',
                    fontFamily: 'var(--ff-sans)',
                    fontStyle: 'italic',
                  }}>"{c}"</div>
                </div>
              );
            })}
            {source.chunkCount > chunkSamples.length && (
              <div style={{
                fontSize: 10.5, color: 'var(--ink-4)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                textAlign: 'center',
                padding: '6px 0',
                fontStyle: 'italic',
              }}>+{source.chunkCount - chunkSamples.length} chunks más indexados</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onDelete}
            aria-label="Eliminar fuente"
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              flex: 1, padding: '12px 14px', borderRadius: 14,
              background: 'rgba(255,107,107,0.08)',
              border: '0.5px solid rgba(255,107,107,0.24)',
              color: '#ff8b8b',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>Eliminar fuente</button>
          <button
            onClick={onClose}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              flex: 1, padding: '12px 14px', borderRadius: 14, border: 0,
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--ink-1)',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>Cerrar</button>
        </div>
      </div>
    </div>
  );

  return window.ReactDOM ? window.ReactDOM.createPortal(content, portalRoot) : content;
}


// ═══════════════════════════════════════════════════════════════════════════
// KnowledgeSourcesSection — sección NUEVA en la tab Conocimiento
// ═══════════════════════════════════════════════════════════════════════════
// Se renderiza ARRIBA de la sección existente "Áreas de expertise" (que vive
// en ia-settings.jsx). KnowledgeTab en ia-settings hace el orchestration.

function KnowledgeSourcesSection() {
  useIAKnowledge();
  if (!window.__mtxIAKnowledge) return null;

  var stats = window.__mtxIAKnowledge.getStats();
  var sources = window.__mtxIAKnowledge.getSources();

  var ingestOpenState = React.useState(false);
  var ingestOpen = ingestOpenState[0]; var setIngestOpen = ingestOpenState[1];

  var detailState = React.useState(null);
  var detailSource = detailState[0]; var setDetailSource = detailState[1];

  // useToast siempre (post-audit Fase 2: Rules of Hooks)
  var _useToast = window.useToast || function() { return { show: function() {} }; };
  var toast = _useToast();

  var handleIngested = function(source) {
    var k = window.__mtxIAKnowledge.getSourceKinds()[source.kind] || { label: source.kind };
    toast.show({
      message: '✦ ' + k.label + ' ingestado · ' + source.chunkCount + ' chunks',
      duration: 2200,
    });
  };

  var handleDelete = function(source) {
    if (window.confirm('¿Eliminar la fuente "' + source.title + '"? Sus chunks se removerán del índice.')) {
      window.__mtxIAKnowledge.deleteSource(source.id);
      setDetailSource(null);
      toast.show({ message: 'Fuente eliminada', duration: 1500 });
    }
  };

  var KPIS = [
    { label: 'Fuentes',       value: stats.totalSources,       accent: 'var(--neon)' },
    { label: 'Chunks',        value: stats.totalChunks,        accent: '#9b8aff' },
    { label: 'Dominios',      value: stats.domainsCovered,     accent: '#5dd3ff' },
    { label: 'Listos · skill', value: stats.readyForSkillCount, accent: '#ffc850' },
  ];

  return (
    <div style={{ marginBottom: 28 }}>
      {/* ── Stat header card ─────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 16px', borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(61,255,209,0.05), rgba(61,255,209,0.01))',
        border: '0.5px solid rgba(61,255,209,0.18)',
        marginBottom: 16,
      }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <div>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: 'var(--ink-1)',
              letterSpacing: '-0.012em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              marginBottom: 2,
            }}>Tu contexto ingestado</div>
            <div style={{
              fontSize: 10.5, color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              lineHeight: 1.4,
            }}>Documentos, notas y audios indexados para que el coach los cite vía RAG</div>
          </div>
        </div>

        {/* 4 KPI mini-cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 5,
        }}>
          {KPIS.map(function(kpi, i) {
            return (
              <div key={i} style={{
                padding: '8px 6px', borderRadius: 10,
                background: 'rgba(0,0,0,0.25)',
                border: '0.5px solid rgba(255,255,255,0.04)',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: 15, fontWeight: 800,
                  color: kpi.accent,
                  fontFamily: 'var(--ff-display, var(--ff-sans))',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.018em',
                  lineHeight: 1, marginBottom: 3,
                }}>{kpi.value}</div>
                <div style={{
                  fontSize: 8, color: 'var(--ink-4)',
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '0.04em', lineHeight: 1.2,
                }}>{kpi.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section title + Ingest CTA ───────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 4px 10px',
      }}>
        <span className="mtx-eyebrow" style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>
          Fuentes ({sources.length})
        </span>
        <button
          onClick={function() { setIngestOpen(true); }}
          aria-label="Ingestar nueva fuente"
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '6px 12px', borderRadius: 999, border: 0,
            background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
            color: '#0a1410',
            fontSize: 11.5, fontWeight: 700,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            boxShadow: '0 4px 12px -2px rgba(61,255,209,0.38)',
          }}>+ Ingestar</button>
      </div>

      {/* ── Sources list ─────────────────────────────────────────────────── */}
      {sources.length === 0 ? (
        <div style={{
          padding: '28px 20px', textAlign: 'center',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.02)',
          border: '0.5px dashed rgba(255,255,255,0.10)',
        }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.7 }}>📚</div>
          <div style={{
            fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)',
            letterSpacing: '-0.01em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
            marginBottom: 6,
          }}>Aún no has ingestado nada</div>
          <div style={{
            fontSize: 11, color: 'var(--ink-3)',
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
            maxWidth: 250, margin: '0 auto',
          }}>Sube un PDF, pega una URL, graba una nota de voz o escribe texto. El coach los usará en sus respuestas.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sources.map(function(s) {
            return (
              <SourceCard
                key={s.id}
                source={s}
                onOpenDetail={function() { setDetailSource(s); }}
              />
            );
          })}
        </div>
      )}

      {/* Modals */}
      {ingestOpen && (
        <IngestSourceModal
          onClose={function() { setIngestOpen(false); }}
          onIngested={handleIngested}
        />
      )}
      {detailSource && (
        <SourceDetailSheet
          source={window.__mtxIAKnowledge.getSource(detailSource.id) || detailSource}
          onClose={function() { setDetailSource(null); }}
          onDelete={function() { handleDelete(detailSource); }}
        />
      )}
    </div>
  );
}


// ── Export ──────────────────────────────────────────────────────────────────
Object.assign(window, {
  KnowledgeSourcesSection: KnowledgeSourcesSection,
  SourceCard:              SourceCard,
  IngestSourceModal:       IngestSourceModal,
  SourceDetailSheet:       SourceDetailSheet,
  useIAKnowledge:          useIAKnowledge,
});
