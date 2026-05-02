// voice-transcription.jsx — Voz para Mentex IA, portado desde NeuralOS
// ─────────────────────────────────────────────────────────────────────────────
// PORTING NOTES
// • Origen: NeuralOS_/src/app/hooks/useVoiceTranscription.ts (738 LOC TS) +
//   NeuralOS_/src/app/components/voice/VoiceTranscriptionOverlay.tsx (444 LOC).
// • Adaptado a Mentex stack: Babel standalone, sin imports/exports, todo
//   global vía window.*. Iconos lucide-react → Ic* del set Mentex o SVG
//   inline. Framer Motion → CSS animations. Tailwind → inline styles.
// • La lógica NLP (10-stage pipeline) se preserva 1:1 — es el "brain" del
//   feature. Solo se adapta el shell de UI al design system Obsidian/Neon.
// • Apunta al __mtxIAVoice store global para integrarse con el chat IA.
// ─────────────────────────────────────────────────────────────────────────────


// ── Browser shim ────────────────────────────────────────────────────────────
// SpeechRecognition requires top-level frame (or iframe with allow="microphone").
// En sandboxed iframes (preview de Figma Make, etc) siempre fallaría con
// "not-allowed", así que detectamos el iframe y marcamos como unsupported.
var _IS_SANDBOXED = (function() {
  try { return window.self !== window.top; } catch (e) { return true; }
})();
var _SpeechRecognitionImpl = _IS_SANDBOXED
  ? null
  : (window.SpeechRecognition || window.webkitSpeechRecognition || null);


// ═══════════════════════════════════════════════════════════════════════════
// NLP PIPELINE — 10 etapas, idéntico a NeuralOS
// ═══════════════════════════════════════════════════════════════════════════

// ① Filler words ES + EN
var _FILLER_RX = /\b(e+h+|u+m+|a+h+|m+h+m*|e+m+|e+r+|o+h+|hmm+|uh+|um+|bueno(?:\s+pues)?|o\s+sea|(?:o\s+)?sea|a\s+ver|pues\s+(?:nada|sí|no)|este+)\b[\s,]*/gi;
function _removeFiller(t) {
  return t.replace(_FILLER_RX, ' ').replace(/\s{2,}/g, ' ').trim();
}

// ② Stutter elimination — "la la la empresa" → "la empresa"
function _removeStutter(t) {
  return t.replace(/\b(\w+)(?:\s+\1){2,}\b/gi, '$1')
          .replace(/\b(\w{3,})(?:\s+\1)\b/gi, '$1')
          .trim();
}

// ③ Voice commands — 30+ comandos ES + EN (puntuación, markdown, control)
var _VOICE_COMMANDS = [
  // Puntuación ES
  { rx: /^coma$/i,                              out: ',',  label: 'Coma' },
  { rx: /^punto$/i,                             out: '.',  label: 'Punto' },
  { rx: /^punto y coma$/i,                      out: ';',  label: 'Punto y coma' },
  { rx: /^dos puntos$/i,                        out: ':',  label: 'Dos puntos' },
  { rx: /^signo de interrogaci[oó]n$/i,         out: '?',  label: '¿Interrogación' },
  { rx: /^signo de (admira|exclama)ci[oó]n$/i,  out: '!',  label: '¡Admiración' },
  { rx: /^abrir interrogaci[oó]n$/i,            out: '¿',  label: 'Abrir ¿' },
  { rx: /^abrir admiraci[oó]n$/i,               out: '¡',  label: 'Abrir ¡' },
  { rx: /^(nueva l[ií]nea|salto de l[ií]nea|nueva linea)$/i, out: '\n',   label: 'Nueva línea' },
  { rx: /^(punto y aparte|nuevo p[aá]rrafo)$/i,              out: '\n\n', label: 'Párrafo' },
  { rx: /^abrir par[eé]ntesis$/i,               out: '(',  label: 'Abrir (' },
  { rx: /^cerrar par[eé]ntesis$/i,              out: ')',  label: 'Cerrar )' },
  { rx: /^abrir corchete$/i,                    out: '[',  label: 'Abrir [' },
  { rx: /^cerrar corchete$/i,                   out: ']',  label: 'Cerrar ]' },
  { rx: /^gui[oó]n$/i,                          out: '-',  label: 'Guión' },
  { rx: /^raya$/i,                              out: '—',  label: 'Raya —' },
  { rx: /^barra$/i,                             out: '/',  label: 'Barra /' },
  { rx: /^arroba$/i,                            out: '@',  label: 'Arroba @' },
  { rx: /^almohadilla|hashtag$/i,               out: '#',  label: 'Hash #' },
  { rx: /^asterisco$/i,                         out: '*',  label: 'Asterisco *' },
  { rx: /^comillas$/i,                          out: '"',  label: 'Comillas "' },
  { rx: /^punto com$/i,                         out: '.com', label: '.com' },
  { rx: /^punto (es|io|ai|net|org)$/i,          out: '.$1',  label: '.TLD', cap: true },
  // Puntuación EN
  { rx: /^comma$/i,                             out: ',',  label: 'Comma' },
  { rx: /^(period|full stop)$/i,                out: '.',  label: 'Period' },
  { rx: /^semicolon$/i,                         out: ';',  label: 'Semicolon' },
  { rx: /^colon$/i,                             out: ':',  label: 'Colon' },
  { rx: /^question mark$/i,                     out: '?',  label: 'Question mark' },
  { rx: /^(exclamation mark|exclamation point)$/i, out: '!', label: 'Exclamation' },
  { rx: /^(new line|next line|line break)$/i,   out: '\n',   label: 'New line' },
  { rx: /^(new paragraph|paragraph break)$/i,   out: '\n\n', label: 'Paragraph' },
  { rx: /^open paren(thesis)?$/i,               out: '(',  label: 'Open (' },
  { rx: /^close paren(thesis)?$/i,              out: ')',  label: 'Close )' },
  { rx: /^(hyphen|dash)$/i,                     out: '-',  label: 'Hyphen' },
  { rx: /^em dash$/i,                           out: '—',  label: 'Em dash' },
  { rx: /^slash$/i,                             out: '/',  label: 'Slash' },
  { rx: /^at sign$/i,                           out: '@',  label: 'At @' },
  { rx: /^hashtag$/i,                           out: '#',  label: 'Hash #' },
  { rx: /^dot com$/i,                           out: '.com', label: '.com' },
  // Markdown via voz — ES
  { rx: /^en negrita (.+)$/i,                   out: '**$1**', label: 'Negrita', cap: true },
  { rx: /^en cursiva (.+)$/i,                   out: '_$1_',   label: 'Cursiva', cap: true },
  { rx: /^(en )?c[oó]digo (.+)$/i,              out: '`$2`',   label: 'Código',  cap: true },
  { rx: /^tachado (.+)$/i,                      out: '~~$1~~', label: 'Tachado', cap: true },
  // Markdown via voz — EN
  { rx: /^bold (.+)$/i,                         out: '**$1**', label: 'Bold',   cap: true },
  { rx: /^italic (.+)$/i,                       out: '_$1_',   label: 'Italic', cap: true },
  { rx: /^code (.+)$/i,                         out: '`$1`',   label: 'Code',   cap: true },
  { rx: /^strikethrough (.+)$/i,                out: '~~$1~~', label: 'Strike', cap: true },
  // Comandos de control
  { rx: /^(borra eso|borra el [uú]ltimo|elimina eso)$/i,                 out: 'UNDO',   label: '↩ Borrar último' },
  { rx: /^(undo that|delete that|scratch that|cancel that|erase that)$/i, out: 'UNDO',   label: 'Undo' },
  { rx: /^(pausa|pause recording)$/i,                                    out: 'PAUSE',  label: '⏸ Pausar' },
  { rx: /^(cont[ií]n[uú]a|continuar|resume|resume recording)$/i,         out: 'RESUME', label: '▶ Continuar' },
  { rx: /^(borra todo|clear all|limpiar todo)$/i,                        out: 'CLEAR',  label: '🗑 Borrar todo' },
];

function _detectVoiceCommand(t) {
  var tr = t.trim();
  for (var i = 0; i < _VOICE_COMMANDS.length; i++) {
    var cmd = _VOICE_COMMANDS[i];
    var m = tr.match(cmd.rx);
    if (!m) continue;
    if (cmd.out === 'UNDO' || cmd.out === 'PAUSE' || cmd.out === 'RESUME' || cmd.out === 'CLEAR') {
      return { isCmd: true, out: '', label: cmd.label, isSpecial: cmd.out };
    }
    var out = cmd.cap
      ? cmd.out.replace(/\$(\d+)/g, function(_, g) { return m[parseInt(g, 10)] || ''; })
      : cmd.out;
    return { isCmd: true, out: out, label: cmd.label };
  }
  return { isCmd: false, out: t, label: '' };
}

// ④ Number normalization — números hablados → dígitos formateados
var _ES_NUM = {
  'cero':0,'un':1,'uno':1,'una':1,'dos':2,'tres':3,'cuatro':4,'cinco':5,
  'seis':6,'siete':7,'ocho':8,'nueve':9,'diez':10,'once':11,'doce':12,
  'trece':13,'catorce':14,'quince':15,'dieciséis':16,'dieciseis':16,
  'diecisiete':17,'dieciocho':18,'diecinueve':19,'veinte':20,'veintiuno':21,
  'veintidós':22,'veintidos':22,'veintitrés':23,'veintitres':23,
  'veinticuatro':24,'veinticinco':25,'veintiséis':26,'veintiseis':26,
  'veintisiete':27,'veintiocho':28,'veintinueve':29,
  'treinta':30,'cuarenta':40,'cincuenta':50,'sesenta':60,'setenta':70,
  'ochenta':80,'noventa':90,'cien':100,'ciento':100,
  'doscientos':200,'doscientas':200,'trescientos':300,'trescientas':300,
  'cuatrocientos':400,'cuatrocientas':400,'quinientos':500,'quinientas':500,
  'seiscientos':600,'seiscientas':600,'setecientos':700,'setecientas':700,
  'ochocientos':800,'ochocientas':800,'novecientos':900,'novecientas':900,
};
var _EN_NUM = {
  'zero':0,'one':1,'two':2,'three':3,'four':4,'five':5,'six':6,'seven':7,
  'eight':8,'nine':9,'ten':10,'eleven':11,'twelve':12,'thirteen':13,
  'fourteen':14,'fifteen':15,'sixteen':16,'seventeen':17,'eighteen':18,
  'nineteen':19,'twenty':20,'thirty':30,'forty':40,'fifty':50,
  'sixty':60,'seventy':70,'eighty':80,'ninety':90,'hundred':100,
};

function _parseSpokenInt(words) {
  var total = 0, cur = 0, matched = false;
  for (var i = 0; i < words.length; i++) {
    var lw = words[i].toLowerCase();
    if (lw === 'mil' || lw === 'thousand') {
      cur = cur || 1; total += cur * 1000; cur = 0; matched = true;
    } else if (lw === 'millón' || lw === 'millon' || lw === 'millones' || lw === 'million' || lw === 'millions') {
      cur = cur || 1; total += cur * 1000000; cur = 0; matched = true;
    } else if (_ES_NUM[lw] !== undefined) {
      cur += _ES_NUM[lw]; matched = true;
    } else if (_EN_NUM[lw] !== undefined) {
      if (_EN_NUM[lw] === 100) { cur = (cur || 1) * 100; } else { cur += _EN_NUM[lw]; }
      matched = true;
    } else if (lw === 'y' || lw === 'and') {
      // connector — ignore
    } else {
      return matched ? total + cur : null;
    }
  }
  return matched ? total + cur : null;
}

function _normalizeNumbers(text) {
  var t = text;
  // "X por ciento" / "X percent" → X%
  t = t.replace(/(\b[\w\s]+?)\s+por\s+ciento\b/gi, function(_, p) {
    var n = _parseSpokenInt(p.trim().split(/\s+/));
    return n !== null ? n + '%' : _;
  });
  t = t.replace(/(\b[\w\s]+?)\s+percent\b/gi, function(_, p) {
    var n = _parseSpokenInt(p.trim().split(/\s+/));
    return n !== null ? n + '%' : _;
  });
  // Currencies
  var CURR = [
    [/(\b[\w\s]+?)\s+d[oó]lares?\b/gi, '$'],
    [/(\b[\w\s]+?)\s+euros?\b/gi,      '€'],
    [/(\b[\w\s]+?)\s+pesos?\b/gi,      '$'],
    [/(\b[\w\s]+?)\s+libras?\b/gi,     '£'],
    [/(\b[\w\s]+?)\s+dollars?\b/gi,    '$'],
    [/(\b[\w\s]+?)\s+pounds?\b/gi,     '£'],
  ];
  for (var i = 0; i < CURR.length; i++) {
    (function(rx, sym) {
      t = t.replace(rx, function(full, p) {
        var n = _parseSpokenInt(p.trim().split(/\s+/));
        return n !== null ? sym + n.toLocaleString('es-ES') : full;
      });
    })(CURR[i][0], CURR[i][1]);
  }
  // Standalone number phrases
  var tokens = t.split(/(\s+)/);
  var out = [];
  var idx = 0;
  while (idx < tokens.length) {
    if (/\s/.test(tokens[idx])) { out.push(tokens[idx]); idx++; continue; }
    var best = null;
    for (var len = Math.min(8, Math.ceil((tokens.length - idx) / 2)); len >= 1; len--) {
      var phrase = tokens.slice(idx, idx + len * 2 - 1).filter(function(tk) { return !/^\s+$/.test(tk); });
      var val = _parseSpokenInt(phrase);
      if (val !== null && val > 0) { best = { val: val, len: len * 2 - 1 }; break; }
    }
    if (best && best.len > 1) {
      out.push(best.val.toLocaleString('es-ES'));
      idx += best.len;
    } else {
      out.push(tokens[idx]); idx++;
    }
  }
  return out.join('');
}

// ⑤ Acrónimo / brand preservation
var _KNOWN_BRANDS = {
  AI:1,API:1,CEO:1,CTO:1,CFO:1,CMO:1,COO:1,CRM:1,ERP:1,ROI:1,
  KPI:1,SQL:1,HTML:1,CSS:1,JSON:1,REST:1,SDK:1,UI:1,UX:1,
  MVP:1,SaaS:1,B2B:1,B2C:1,Q1:1,Q2:1,Q3:1,Q4:1,
  Mentex:1,GPT:1,LLM:1,RAG:1,AWS:1,GCP:1,URL:1,SSL:1,
  HTTP:1,HTTPS:1,PDF:1,CSV:1,Excel:1,Slack:1,GitHub:1,OpenAI:1,
};
function _preserveAcronyms(t) {
  return t.replace(/\b([A-Za-z][A-Za-z0-9]{1,7})\b/g, function(word) {
    var up = word.toUpperCase();
    return _KNOWN_BRANDS[up] ? up : (_KNOWN_BRANDS[word] ? word : word);
  });
}

// ⑥ Smart punctuation
var _QUESTION_STARTERS = /^(qué|que|cuál|cuáles|cómo|cuándo|dónde|quién|quiénes|por qué|para qué|cuántos|cuántas|cuánto|which|what|who|whom|when|where|why|how|is|are|was|were|will|would|could|should|can|did|do|does|have|has|had|may|might)\b/i;
var _EXCLAIM_WORDS = /\b(genial|perfecto|excelente|increíble|increible|fantástico|fantastico|espectacular|brutal|wow|bravo|amazing|excellent|great|perfect|awesome|fantastic|outstanding)\b/i;
var _SOFT_ENDINGS = /\b(además|también|sin embargo|por lo tanto|aunque|mientras|porque|ya que|dado que|asimismo|furthermore|however|therefore|although|meanwhile|because|since)\s*$/i;

function _applySmartPunctuation(text, pauseMs, prevEnded) {
  if (!text.trim()) return '';
  var t = text.trim();
  if (/[.!?,;:\n]$/.test(t)) return t;
  if (_QUESTION_STARTERS.test(t))      return t + '?';
  if (_EXCLAIM_WORDS.test(t))          return t + '!';
  if (_SOFT_ENDINGS.test(t))           return t + ',';
  if (pauseMs > 2500)                  return t + '.';
  if (pauseMs > 1100 && !prevEnded)    return t + ',';
  return t;
}

// ⑦ Capitalize
function _capitalize(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

// ⑨ Smart list detection (ordinal-based)
var _ORDINAL_START = /^(primero?|segundo?|tercero?|cuarto?|quinto?|sexto?|séptimo?|octavo?|noveno?|décimo?|luego|después|finalmente|por\s+[uú]ltimo|adem[aá]s|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|then|next|finally|lastly|also)\b/i;

function _detectAndFormatList(segments) {
  if (segments.length < 2) return segments;
  var ordinalCount = segments.filter(function(s) { return _ORDINAL_START.test(s.trim()); }).length;
  if (ordinalCount >= 2 && ordinalCount / segments.length >= 0.5) {
    return segments.map(function(s, i) { return i === 0 ? s : '\n• ' + s; });
  }
  return segments;
}

// ⑩ Merge segments con joining inteligente
function _mergeSegments(segs, addParagraph) {
  var formatted = _detectAndFormatList(segs);
  var acc = '';
  for (var i = 0; i < formatted.length; i++) {
    var seg = formatted[i];
    if (i === 0) { acc = seg; continue; }
    if (addParagraph[i]) { acc = acc.replace(/\s+$/, '') + '\n\n' + _capitalize(seg); continue; }
    var prev = acc.replace(/\s+$/, '');
    var endsWithHard = /[.!?]$/.test(prev);
    var endsWithSoft = /[,;:]$/.test(prev);
    if (seg.charAt(0) === '\n')   { acc = prev + seg; continue; }
    if (endsWithHard) { acc = prev + ' ' + _capitalize(seg); continue; }
    if (endsWithSoft) { acc = prev + ' ' + seg.charAt(0).toLowerCase() + seg.slice(1); continue; }
    acc = prev + ' ' + seg;
  }
  return acc;
}


// ═══════════════════════════════════════════════════════════════════════════
// HOOK — useVoiceTranscription
// ═══════════════════════════════════════════════════════════════════════════
// Returns { status, interimText, confidence, segmentCount, canUndo,
//   isSupported, isDemoMode, lastCommand, language,
//   startListening, stopListening, pauseListening, resumeListening,
//   toggle, reset, undoLastSegment, setLanguage, getAudioLevels }

function useVoiceTranscription(opts) {
  opts = opts || {};
  var onFinalResult     = opts.onFinalResult;
  var onInterimResult   = opts.onInterimResult;
  var onError           = opts.onError;
  var onCommandDetected = opts.onCommandDetected;

  var statusState = React.useState(_SpeechRecognitionImpl ? 'idle' : 'unsupported');
  var status = statusState[0]; var setStatus = statusState[1];

  var interimState = React.useState('');
  var interimText = interimState[0]; var setInterimText = interimState[1];

  var confidenceState = React.useState(0);
  var confidence = confidenceState[0]; var setConfidence = confidenceState[1];

  var segmentCountState = React.useState(0);
  var segmentCount = segmentCountState[0]; var setSegmentCount = segmentCountState[1];

  var canUndoState = React.useState(false);
  var canUndo = canUndoState[0]; var setCanUndo = canUndoState[1];

  var lastCommandState = React.useState(null);
  var lastCommand = lastCommandState[0]; var setLastCommand = lastCommandState[1];

  var languageState = React.useState(opts.lang || 'es-ES');
  var language = languageState[0]; var setLanguageState = languageState[1];

  // Refs (zero re-renders for audio/segments)
  var recognitionRef      = React.useRef(null);
  var segmentsRef         = React.useRef([]);
  var paragraphRef        = React.useRef([]);
  var lastFinalRef        = React.useRef(Date.now());
  var prevEndedRef        = React.useRef(true);
  var isMountedRef        = React.useRef(true);
  var langRef             = React.useRef(language);
  var permissionDeniedRef = React.useRef(false);
  var demoTimerRef        = React.useRef(null);

  // Web Audio
  var audioCtxRef = React.useRef(null);
  var analyserRef = React.useRef(null);
  var streamRef   = React.useRef(null);
  var rafSimRef   = React.useRef(0);

  function cleanupAudio() {
    try {
      var s = streamRef.current;
      if (s && typeof s.getTracks === 'function') {
        s.getTracks().forEach(function(t) { t.stop(); });
      }
    } catch (e) { /* ignore */ }
    try { if (audioCtxRef.current) audioCtxRef.current.close(); } catch (e) { /* ignore */ }
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    try { cancelAnimationFrame(rafSimRef.current); } catch (e) { /* ignore */ }
  }

  React.useEffect(function() {
    isMountedRef.current = true;
    return function() { isMountedRef.current = false; cleanupAudio(); };
  }, []);

  // Init Web Audio (después de SpeechRecognition.onstart)
  function initAudioAfterRecognition(existingStream) {
    if (analyserRef.current) return;
    var setupCtx = function(stream) {
      if (!stream) return;
      streamRef.current = stream;
      try {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        var ctx = new Ctx();
        audioCtxRef.current = ctx;
        var analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.82;
        ctx.createMediaStreamSource(stream).connect(analyser);
        analyserRef.current = analyser;
      } catch (e) { /* fallback to simulated waveform */ }
    };
    if (existingStream) { setupCtx(existingStream); return; }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true }, video: false })
        .then(setupCtx)
        .catch(function() { /* fallback to simulated waveform */ });
    }
  }

  // Public: get audio levels (real or simulated)
  var getAudioLevels = React.useCallback(function() {
    if (analyserRef.current) {
      var data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      var bars = 32;
      var step = Math.max(1, Math.floor(data.length / bars));
      var arr = [];
      for (var i = 0; i < bars; i++) {
        var slice = data.slice(i * step, (i + 1) * step);
        var sum = 0;
        for (var j = 0; j < slice.length; j++) sum += slice[j];
        arr.push((sum / slice.length) / 255);
      }
      return arr;
    }
    if (status === 'listening') {
      var t = Date.now() / 180;
      var arr2 = [];
      for (var k = 0; k < 32; k++) {
        arr2.push(Math.max(0.04, Math.abs(Math.sin(t + k * 0.42) * 0.55 + Math.sin(t * 1.3 + k * 0.9) * 0.35)));
      }
      return arr2;
    }
    var rest = [];
    for (var m = 0; m < 32; m++) rest.push(0.03);
    return rest;
  }, [status]);

  // Build recognition instance
  var buildRecognition = React.useCallback(function() {
    if (!_SpeechRecognitionImpl) return null;
    var rec = new _SpeechRecognitionImpl();
    rec.lang = langRef.current;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;

    rec.onstart = function() {
      if (!isMountedRef.current) return;
      setStatus('listening');
      setTimeout(function() { initAudioAfterRecognition(); }, 300);
    };

    rec.onresult = function(ev) {
      if (!isMountedRef.current) return;
      var interim = '';
      for (var idx = ev.resultIndex; idx < ev.results.length; idx++) {
        var result = ev.results[idx];
        // Pick best alternative
        var transcript = result[0].transcript;
        for (var a = 1; a < result.length; a++) { transcript = transcript || result[a].transcript; }

        if (result.isFinal) {
          var now = Date.now();
          var pauseMs = now - lastFinalRef.current;
          lastFinalRef.current = now;

          // NLP pipeline
          var t = transcript;
          t = _removeFiller(t);
          t = _removeStutter(t);
          if (!t.trim()) continue;

          // Voice command detection
          var cmd = _detectVoiceCommand(t);
          if (cmd.isCmd) {
            if (cmd.isSpecial === 'UNDO') {
              if (segmentsRef.current.length > 0) {
                segmentsRef.current.pop();
                paragraphRef.current.pop();
                var cnt = segmentsRef.current.length;
                setSegmentCount(cnt);
                setCanUndo(cnt > 0);
                if (onFinalResult) onFinalResult(_mergeSegments(segmentsRef.current, paragraphRef.current));
              }
              var evU = { raw: transcript, output: '', label: '↩ Borrado', ts: now };
              setLastCommand(evU);
              if (onCommandDetected) onCommandDetected(evU);
              continue;
            }
            if (cmd.isSpecial === 'PAUSE') { pauseListeningInternal(); return; }
            if (cmd.isSpecial === 'RESUME') { resumeListeningInternal(); return; }
            if (cmd.isSpecial === 'CLEAR') {
              segmentsRef.current = [];
              paragraphRef.current = [];
              setSegmentCount(0);
              setCanUndo(false);
              if (onFinalResult) onFinalResult('');
              var evC = { raw: transcript, output: '', label: '🗑 Todo borrado', ts: now };
              setLastCommand(evC);
              if (onCommandDetected) onCommandDetected(evC);
              continue;
            }
            // Punctuation / markdown command
            segmentsRef.current.push(cmd.out);
            paragraphRef.current.push(false);
            var cnt2 = segmentsRef.current.length;
            setSegmentCount(cnt2);
            setCanUndo(cnt2 > 0);
            setConfidence(1);
            var evP = { raw: transcript, output: cmd.out, label: cmd.label, ts: now };
            setLastCommand(evP);
            if (onCommandDetected) onCommandDetected(evP);
            if (onFinalResult) onFinalResult(_mergeSegments(segmentsRef.current, paragraphRef.current));
            setInterimText('');
            continue;
          }

          // Rest of NLP pipeline
          t = _normalizeNumbers(t);
          t = _preserveAcronyms(t);
          t = _applySmartPunctuation(t, pauseMs, prevEndedRef.current);
          if (prevEndedRef.current || segmentsRef.current.length === 0) t = _capitalize(t);
          prevEndedRef.current = /[.!?]$/.test(t);

          var newParagraph = pauseMs > 3500 && segmentsRef.current.length > 0;
          segmentsRef.current.push(t);
          paragraphRef.current.push(newParagraph);
          var cnt3 = segmentsRef.current.length;
          setSegmentCount(cnt3);
          setCanUndo(cnt3 > 0);
          setConfidence(result[0].confidence != null ? result[0].confidence : 0.85);
          if (onFinalResult) onFinalResult(_mergeSegments(segmentsRef.current, paragraphRef.current));
          setInterimText('');
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        var preview = _removeFiller(interim);
        setInterimText(preview);
        if (onInterimResult) onInterimResult(preview);
      }
    };

    rec.onerror = function(ev) {
      if (!isMountedRef.current) return;
      if (ev.error === 'no-speech') return; // benign
      var msg = ev.error === 'not-allowed'
        ? 'Micrófono bloqueado — permite el acceso al micrófono.'
        : ev.error === 'audio-capture'
          ? 'No se pudo capturar audio. Verifica el micrófono.'
          : ev.error === 'network'
            ? 'Error de red durante la transcripción.'
            : ev.error === 'service-not-allowed'
              ? 'Servicio de voz no disponible (sandbox).'
              : 'Error de reconocimiento: ' + ev.error;
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        permissionDeniedRef.current = true;
      }
      setStatus('idle');
      setInterimText('');
      cleanupAudio();
      if (onError) onError(msg);
    };

    rec.onend = function() {
      if (!isMountedRef.current) return;
      setStatus(function(prev) { return prev === 'listening' ? 'processing' : prev; });
      setTimeout(function() {
        if (isMountedRef.current) { setStatus('idle'); setInterimText(''); }
      }, 220);
    };

    return rec;
  }, [onFinalResult, onInterimResult, onError, onCommandDetected]);

  function pauseListeningInternal() {
    try { if (recognitionRef.current) recognitionRef.current.stop(); } catch (e) {}
    setStatus('paused');
    setLastCommand({ raw: '', output: '', label: '⏸ Pausado', ts: Date.now() });
  }
  function resumeListeningInternal() {
    var rec = buildRecognition();
    if (!rec) return;
    recognitionRef.current = rec;
    try { rec.start(); } catch (e) {}
    setLastCommand({ raw: '', output: '', label: '▶ Reanudado', ts: Date.now() });
  }

  // Public API
  var startListening = React.useCallback(function() {
    if (!_SpeechRecognitionImpl) {
      // Demo mode (sandboxed iframes)
      if (status === 'listening') return;
      setStatus('listening');
      setInterimText('Hola, esto es una simulación de voz...');
      setConfidence(0.92);
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
      demoTimerRef.current = setTimeout(function() {
        if (!isMountedRef.current) return;
        setStatus('processing');
        setInterimText('');
        setTimeout(function() {
          if (!isMountedRef.current) return;
          setStatus('idle');
          setInterimText('');
        }, 600);
      }, 8000);
      return;
    }
    if (status === 'listening') return;
    if (permissionDeniedRef.current) {
      if (onError) onError('Micrófono bloqueado — permite el acceso al micrófono.');
      return;
    }
    // Reset session
    segmentsRef.current = [];
    paragraphRef.current = [];
    prevEndedRef.current = true;
    lastFinalRef.current = Date.now();
    setInterimText('');
    setConfidence(0);
    setSegmentCount(0);
    setCanUndo(false);
    setLastCommand(null);

    var rec = buildRecognition();
    if (!rec) return;
    recognitionRef.current = rec;
    try { rec.start(); } catch (e) {}
  }, [status, buildRecognition, onError]);

  var stopListening = React.useCallback(function() {
    if (!_SpeechRecognitionImpl) {
      if (demoTimerRef.current) { clearTimeout(demoTimerRef.current); demoTimerRef.current = null; }
      setStatus('processing');
      setTimeout(function() {
        if (isMountedRef.current) { setStatus('idle'); setInterimText(''); }
      }, 500);
      return;
    }
    try { if (recognitionRef.current) recognitionRef.current.stop(); } catch (e) {}
    cleanupAudio();
    setStatus('processing');
  }, []);

  var pauseListening = React.useCallback(function() {
    try { if (recognitionRef.current) recognitionRef.current.stop(); } catch (e) {}
    setStatus('paused');
  }, []);

  var resumeListening = React.useCallback(function() {
    if (status !== 'paused') return;
    if (!_SpeechRecognitionImpl) {
      setStatus('listening');
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
      demoTimerRef.current = setTimeout(function() {
        if (!isMountedRef.current) return;
        setStatus('processing');
        setTimeout(function() {
          if (isMountedRef.current) { setStatus('idle'); setInterimText(''); }
        }, 600);
      }, 8000);
      return;
    }
    var rec = buildRecognition();
    if (!rec) return;
    recognitionRef.current = rec;
    try { rec.start(); } catch (e) {}
  }, [status, buildRecognition]);

  var toggle = React.useCallback(function() {
    if (status === 'listening') stopListening();
    else if (status === 'paused') resumeListening();
    else startListening();
  }, [status, startListening, stopListening, resumeListening]);

  var reset = React.useCallback(function() {
    try { if (recognitionRef.current) recognitionRef.current.stop(); } catch (e) {}
    cleanupAudio();
    segmentsRef.current = [];
    paragraphRef.current = [];
    permissionDeniedRef.current = false;
    setInterimText('');
    setStatus('idle');
    setConfidence(0);
    setSegmentCount(0);
    setCanUndo(false);
    setLastCommand(null);
  }, []);

  var undoLastSegment = React.useCallback(function() {
    if (!segmentsRef.current.length) return;
    segmentsRef.current.pop();
    paragraphRef.current.pop();
    var cnt = segmentsRef.current.length;
    setSegmentCount(cnt);
    setCanUndo(cnt > 0);
    if (onFinalResult) onFinalResult(_mergeSegments(segmentsRef.current, paragraphRef.current));
  }, [onFinalResult]);

  var setLanguage = React.useCallback(function(lang) {
    langRef.current = lang;
    setLanguageState(lang);
    if (status === 'listening') {
      try { if (recognitionRef.current) recognitionRef.current.stop(); } catch (e) {}
      var rec = buildRecognition();
      if (!rec) return;
      recognitionRef.current = rec;
      try { rec.start(); } catch (e) {}
    }
  }, [status, buildRecognition]);

  return {
    status: status, interimText: interimText, confidence: confidence,
    segmentCount: segmentCount, canUndo: canUndo,
    isSupported: !!_SpeechRecognitionImpl,
    isDemoMode: !_SpeechRecognitionImpl,
    lastCommand: lastCommand, language: language,
    startListening: startListening, stopListening: stopListening,
    pauseListening: pauseListening, resumeListening: resumeListening,
    toggle: toggle, reset: reset,
    undoLastSegment: undoLastSegment, setLanguage: setLanguage,
    getAudioLevels: getAudioLevels,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// UI COMPONENTS — adaptados al design Mentex (Obsidian/Neon)
// ═══════════════════════════════════════════════════════════════════════════

// ── LiveWaveform — DOM-ref driven, zero React renders durante animación ─────
function LiveWaveform(props) {
  var getAudioLevels = props.getAudioLevels;
  var active = props.active;
  var accent = props.accent || 'var(--neon)';
  var height = props.height || 80;
  var barCount = props.barCount || 28;

  var barsRef = React.useRef([]);
  var rafRef = React.useRef(0);

  React.useEffect(function() {
    if (!active) {
      barsRef.current.forEach(function(b) { if (b) b.style.height = '4px'; });
      return;
    }
    var loop = function() {
      var levels = getAudioLevels();
      barsRef.current.forEach(function(bar, i) {
        if (!bar) return;
        var lv = levels[Math.floor(i * levels.length / barCount)] || 0.04;
        var h = Math.max(4, Math.round(lv * height));
        bar.style.height = h + 'px';
        bar.style.opacity = String(Math.max(0.35, Math.min(1, 0.35 + lv * 1.4)));
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return function() { cancelAnimationFrame(rafRef.current); };
  }, [active, getAudioLevels, height, barCount]);

  var bars = [];
  for (var i = 0; i < barCount; i++) {
    var scaleY = i < barCount / 2
      ? (0.7 + (i / (barCount / 2)) * 0.3)
      : (0.7 + ((barCount - i) / (barCount / 2)) * 0.3);
    bars.push(
      <div
        key={i}
        ref={(function(idx) { return function(el) { if (el) barsRef.current[idx] = el; }; })(i)}
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: accent,
          transition: 'height 60ms ease, opacity 60ms ease',
          transform: 'scaleY(' + scaleY + ')',
          transformOrigin: 'center',
          boxShadow: '0 0 6px ' + accent + '88',
        }}
      />
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 3,
      height: height,
    }}>{bars}</div>
  );
}


// ── IAVoiceOverlay — full-screen modal de transcripción de voz ──────────────
// Slide-up desde el bottom. UX: avatar + status + waveform GRANDE centrado +
// interim text live + 3 acciones (cancel, pause/resume, send neon).
//
// Props:
//   open       — boolean
//   onClose    — () => void (cancel)
//   onCommit   — (finalText) => void (send → aplica al input del chat)
function IAVoiceOverlay(props) {
  var open = props.open;
  var onClose = props.onClose;
  var onCommit = props.onCommit;

  var finalTextRef = React.useRef('');

  var voice = useVoiceTranscription({
    lang: 'es-ES',
    onFinalResult: function(t) { finalTextRef.current = t; },
    onError: function(msg) {
      // Toast el error (si hay toast disponible)
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('mtx:toast', { detail: { message: msg, duration: 2400 } }));
      }
    },
  });

  // Auto-start cuando se abre
  React.useEffect(function() {
    if (open) {
      finalTextRef.current = '';
      // Slight delay para que la animación de slide-up termine antes
      var t = setTimeout(function() { voice.startListening(); }, 240);
      return function() { clearTimeout(t); };
    } else {
      // Cuando se cierra el overlay, reset todo
      voice.reset();
    }
  }, [open]);

  // ESC para cerrar
  React.useEffect(function() {
    if (!open) return;
    var onKey = function(e) {
      if (e.key !== 'Escape') return;
      onClose && onClose();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;

  var status = voice.status;
  var isActive = status === 'listening';
  var isPaused = status === 'paused';
  var isProcessing = status === 'processing';

  var stateLabel = isActive ? 'Escuchando…'
    : isProcessing ? 'Procesando…'
    : isPaused ? 'Pausado'
    : voice.isDemoMode ? 'Modo demo'
    : 'Listo';

  var handleSend = function() {
    voice.stopListening();
    setTimeout(function() {
      if (finalTextRef.current && onCommit) onCommit(finalTextRef.current);
      onClose && onClose();
    }, 280);
  };

  var handleCancel = function() {
    voice.reset();
    onClose && onClose();
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 110,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(12px) saturate(140%)',
      WebkitBackdropFilter: 'blur(12px) saturate(140%)',
      animation: 'mtx-fade-up .3s ease',
    }}>
      {/* Top — close button */}
      <div style={{
        flexShrink: 0,
        paddingTop: 60,
        padding: '60px 20px 0',
        display: 'flex', justifyContent: 'flex-end',
      }}>
        <button
          onClick={handleCancel}
          aria-label="Cancelar transcripción"
          className="mtx-tap"
          style={{
            width: 36, height: 36, borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.10)',
            color: 'var(--ink-1)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <IcClose size={16} stroke="currentColor"/>
        </button>
      </div>

      {/* Center — avatar + waveform + status + interim text */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
        gap: 24,
      }}>
        {/* Avatar circle con halo pulsante */}
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(61,255,209,0.28), rgba(61,255,209,0.05) 65%, rgba(155,138,255,0.12))',
          border: '0.5px solid rgba(61,255,209,0.40)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 56,
          boxShadow: isActive
            ? '0 0 0 2px rgba(61,255,209,0.20), 0 0 60px rgba(61,255,209,0.45), inset 0 1px 0 rgba(255,255,255,0.10)'
            : '0 0 0 1px rgba(61,255,209,0.12), 0 0 30px rgba(61,255,209,0.20), inset 0 1px 0 rgba(255,255,255,0.08)',
          transition: 'box-shadow .3s',
        }}>
          {/* Halo radial decorativo */}
          <div style={{
            position: 'absolute', inset: -24, borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, rgba(61,255,209,0.32), transparent 65%)',
            filter: 'blur(20px)', pointerEvents: 'none',
            transform: 'translateZ(0)', willChange: 'transform',
            zIndex: -1,
            opacity: isActive ? 1 : 0.4,
            transition: 'opacity .3s',
          }}/>
          <span role="img" aria-label="Coach Mentex">🌿</span>
        </div>

        {/* Status pulse + label */}
        <div className="mtx-eyebrow" style={{
          fontSize: 10.5, color: 'var(--neon)',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 999,
            background: isActive ? 'var(--neon)' : isPaused ? '#9b8aff' : '#ffc850',
            boxShadow: '0 0 8px ' + (isActive ? 'rgba(61,255,209,0.7)' : 'rgba(155,138,255,0.6)'),
            animation: isActive ? 'mtx-pulse 1.2s ease-in-out infinite' : 'none',
            willChange: 'transform, opacity',
          }}/>
          {stateLabel}
        </div>

        {/* Big waveform */}
        <LiveWaveform
          getAudioLevels={voice.getAudioLevels}
          active={isActive}
          accent="var(--neon)"
          height={56}
          barCount={28}
        />

        {/* Interim text live */}
        <div style={{
          minHeight: 60, maxWidth: 320,
          fontSize: 15, lineHeight: 1.45,
          color: 'var(--ink-1)',
          textAlign: 'center',
          letterSpacing: '-0.005em',
          fontFamily: 'var(--ff-sans)',
        }}>
          {voice.interimText
            ? (
              <span>
                {voice.interimText}
                <span style={{
                  display: 'inline-block', width: 7, height: 16, marginLeft: 2,
                  background: 'var(--neon)', borderRadius: 1,
                  verticalAlign: 'text-bottom',
                  animation: 'mtx-pulse 0.8s ease-in-out infinite',
                  willChange: 'opacity',
                }}/>
              </span>
            )
            : (
              <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>
                {isActive ? 'Habla con pausas naturales para mejor puntuación' : isPaused ? 'En pausa…' : 'Toca el botón para hablar'}
              </span>
            )
          }
        </div>

        {/* Voice command flash feedback */}
        {voice.lastCommand && (Date.now() - voice.lastCommand.ts < 1600) && (
          <div style={{
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(155,138,255,0.14)',
            border: '0.5px solid rgba(155,138,255,0.30)',
            color: '#9b8aff',
            fontSize: 11, fontWeight: 600,
            fontFamily: 'var(--ff-sans)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            animation: 'mtx-fade-up .2s ease both',
          }}>
            <IcSpark size={11} stroke="currentColor" strokeWidth={1.8}/>
            {voice.lastCommand.label}
          </div>
        )}
      </div>

      {/* Bottom — controls */}
      <div style={{
        flexShrink: 0,
        padding: '0 24px 38px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12,
      }}>
        {/* Cancel (left) */}
        <button
          onClick={handleCancel}
          aria-label="Cancelar"
          className="mtx-tap"
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.10)',
            color: 'var(--ink-2)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <IcClose size={18} stroke="currentColor" strokeWidth={1.8}/>
        </button>

        {/* Pause / Resume (center) */}
        {isActive && (
          <button
            onClick={voice.pauseListening}
            aria-label="Pausar"
            className="mtx-tap"
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(155,138,255,0.14)',
              border: '0.5px solid rgba(155,138,255,0.32)',
              color: '#9b8aff', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 0 12px rgba(155,138,255,0.10)',
            }}>
            <IcPause size={20} stroke="currentColor" strokeWidth={1.8}/>
          </button>
        )}
        {isPaused && (
          <button
            onClick={voice.resumeListening}
            aria-label="Reanudar"
            className="mtx-tap"
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(155,138,255,0.20)',
              border: '0.5px solid rgba(155,138,255,0.40)',
              color: '#9b8aff', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <IcPlay size={20} stroke="currentColor" strokeWidth={1.8}/>
          </button>
        )}
        {!isActive && !isPaused && (
          <button
            onClick={voice.startListening}
            aria-label="Hablar"
            className="mtx-tap"
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(61,255,209,0.14)',
              border: '0.5px solid rgba(61,255,209,0.32)',
              color: 'var(--neon)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <IcMic size={20} stroke="currentColor" strokeWidth={1.8}/>
          </button>
        )}

        {/* Send (right) — neon, only when there's content */}
        <button
          onClick={handleSend}
          disabled={!voice.segmentCount}
          aria-label="Enviar transcripción"
          className="mtx-tap"
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: voice.segmentCount
              ? 'linear-gradient(135deg, var(--neon), #1ad9ad)'
              : 'rgba(255,255,255,0.04)',
            border: voice.segmentCount ? 0 : '0.5px solid rgba(255,255,255,0.06)',
            color: voice.segmentCount ? '#0a1410' : 'var(--ink-4)',
            cursor: voice.segmentCount ? 'pointer' : 'not-allowed',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: voice.segmentCount
              ? '0 0 0 1px rgba(61,255,209,0.25), 0 8px 20px -4px rgba(61,255,209,0.45)'
              : 'none',
            transition: 'background .2s, box-shadow .2s, color .2s, transform .15s',
            transform: voice.segmentCount ? 'scale(1)' : 'scale(0.92)',
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5"/>
            <path d="M5 12l7-7 7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}


// Exports
Object.assign(window, {
  useVoiceTranscription: useVoiceTranscription,
  IAVoiceOverlay: IAVoiceOverlay,
  LiveWaveform: LiveWaveform,
});
