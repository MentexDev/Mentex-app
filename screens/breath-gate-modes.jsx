// screens/breath-gate-modes.jsx — Sprint A.11 · BreathGate modalidades expandidas
// ─────────────────────────────────────────────────────────────────────────────
//
// Extiende el BreathGate (que originalmente solo tenía respiración) a 4
// modalidades intercambiables. Visión: una pausa consciente no es solo
// respirar — es romper el patrón impulsivo con CUALQUIER acto deliberado.
//
//   1. 🫁 'breath'        — círculo respirando con countdown (la original)
//   2. 🖼 'image'          — foto persona icónica + frase curada
//   3. 🙏 'gratitude'      — escribir 5 cosas por las que agradezco AHORA
//   4. ✨ 'affirmations'   — completar 5 decretos con prefijos canónicos
//                              (Yo soy___, Gracias por___, Yo tengo___,
//                               Yo merezco___, Yo elijo___)
//
// Por default: modo 'mix' que rota pseudo-aleatorio sin repetir el último.
// El user puede:
//   • Toggle on/off cada modalidad en BreathGateSettingsSheet
//   • Slider duración 5/8/12s (afecta breath; gratitude/affirmations son self-paced)
//   • Activar 'siempre X' fijando UNA modalidad
//   • Default 'mix' rota entre las habilitadas
//
// Gratitudes + afirmaciones se persisten en wellness-history (audit GAP-1
// del A.9.5 dejó la infra lista). Ver pattern recordatorio en
// [[coach-wellness-history]].
//
// Drop-in ready: backend puede curar frases por mood, hora del día, o user
// preferences. Las funciones públicas no cambian.
//
// localStorage key: 'mtx-breath-gate:modes' (settings)
// localStorage key: 'mtx-wellness-history:v1' (entries de gratitud/decretos)
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxBreathGateModes) return;

  var MODES_STORAGE = 'mtx-breath-gate:modes';

  // ──────────────────────────────────────────────────────────────────────────
  // Catálogo curado de frases motivacionales (24 cards)
  // ──────────────────────────────────────────────────────────────────────────
  // Mezcla pensadores, científicos, artistas, líderes. Diversidad genuina:
  // hombres y mujeres, culturas, épocas. NO motivacionalismo barato.
  //
  // Cada card: { id, author, quote, era, tag, color }
  // color: paleta inline para el background del card (acorde al mood)
  var QUOTES = [
    { id: 'q-einstein', author: 'Albert Einstein', quote: 'La imaginación es más importante que el conocimiento.', era: '1879–1955', tag: 'ciencia', color: '#5a8fff' },
    { id: 'q-mandela', author: 'Nelson Mandela', quote: 'La grandeza no está en no caer nunca, sino en levantarse cada vez que caes.', era: '1918–2013', tag: 'liderazgo', color: '#f5b85a' },
    { id: 'q-frida', author: 'Frida Kahlo', quote: 'Pies, para qué los quiero, si tengo alas para volar.', era: '1907–1954', tag: 'arte', color: '#ff5cc8' },
    { id: 'q-rumi', author: 'Rumi', quote: 'Lo que buscas te está buscando.', era: '1207–1273', tag: 'espiritualidad', color: '#9b8aff' },
    { id: 'q-maya', author: 'Maya Angelou', quote: 'La gente olvidará lo que dijiste, pero nunca cómo los hiciste sentir.', era: '1928–2014', tag: 'humanidad', color: '#ff8e3c' },
    { id: 'q-jobs', author: 'Steve Jobs', quote: 'Tu tiempo es limitado. No lo gastes viviendo la vida de otro.', era: '1955–2011', tag: 'innovación', color: '#3dffd1' },
    { id: 'q-gandhi', author: 'Mahatma Gandhi', quote: 'Sé el cambio que quieres ver en el mundo.', era: '1869–1948', tag: 'cambio', color: '#a8e063' },
    { id: 'q-curie', author: 'Marie Curie', quote: 'Nada en la vida debe ser temido, solo entendido.', era: '1867–1934', tag: 'ciencia', color: '#7fdbff' },
    { id: 'q-aurelio', author: 'Marco Aurelio', quote: 'Tienes poder sobre tu mente, no sobre los eventos externos. Date cuenta y encontrarás fuerza.', era: '121–180', tag: 'estoico', color: '#d4a373' },
    { id: 'q-lao', author: 'Lao Tse', quote: 'Un viaje de mil millas comienza con un solo paso.', era: 's. VI a.C.', tag: 'taoísmo', color: '#88c9a1' },
    { id: 'q-malala', author: 'Malala Yousafzai', quote: 'Un niño, un maestro, un libro y una pluma pueden cambiar el mundo.', era: 'n. 1997', tag: 'educación', color: '#f4a8b8' },
    { id: 'q-da-vinci', author: 'Leonardo da Vinci', quote: 'La simplicidad es la máxima sofisticación.', era: '1452–1519', tag: 'arte', color: '#c8a87a' },
    { id: 'q-confucio', author: 'Confucio', quote: 'No importa qué tan lento vayas mientras no te detengas.', era: '551–479 a.C.', tag: 'sabiduría', color: '#d49a6a' },
    { id: 'q-keller', author: 'Helen Keller', quote: 'Solos podemos hacer tan poco; juntos podemos hacer tanto.', era: '1880–1968', tag: 'comunidad', color: '#ffc857' },
    { id: 'q-tesla', author: 'Nikola Tesla', quote: 'El presente es suyo; el futuro, por el que realmente he trabajado, es mío.', era: '1856–1943', tag: 'visión', color: '#5fa8d3' },
    { id: 'q-woolf', author: 'Virginia Woolf', quote: 'No hay barrera, cerradura ni cerrojo que puedas imponer a la libertad de mi mente.', era: '1882–1941', tag: 'libertad', color: '#b39ddb' },
    { id: 'q-buda', author: 'Buda', quote: 'No te detengas a buscar la felicidad. Está dentro de ti.', era: 's. V a.C.', tag: 'budismo', color: '#ffb74d' },
    { id: 'q-roosevelt', author: 'Eleanor Roosevelt', quote: 'Nadie puede hacerte sentir inferior sin tu consentimiento.', era: '1884–1962', tag: 'autoestima', color: '#ce93d8' },
    { id: 'q-borges', author: 'Jorge Luis Borges', quote: 'Que otros se jacten de las páginas que han escrito; a mí me enorgullecen las que he leído.', era: '1899–1986', tag: 'literatura', color: '#90caf9' },
    { id: 'q-seneca', author: 'Séneca', quote: 'No es porque las cosas son difíciles que no nos atrevemos; es porque no nos atrevemos que son difíciles.', era: '4 a.C.–65 d.C.', tag: 'estoico', color: '#c4a484' },
    { id: 'q-sagan', author: 'Carl Sagan', quote: 'En algún lugar, algo increíble está esperando ser descubierto.', era: '1934–1996', tag: 'cosmos', color: '#7986cb' },
    { id: 'q-teresa', author: 'Teresa de Calcuta', quote: 'No siempre podemos hacer grandes cosas, pero podemos hacer cosas pequeñas con gran amor.', era: '1910–1997', tag: 'amor', color: '#f48fb1' },
    { id: 'q-king', author: 'Martin Luther King Jr.', quote: 'La oscuridad no puede expulsar a la oscuridad. Solo la luz puede hacerlo.', era: '1929–1968', tag: 'esperanza', color: '#ffd54f' },
    { id: 'q-anne-frank', author: 'Anne Frank', quote: 'Qué maravilloso es que nadie tenga que esperar un solo momento antes de comenzar a mejorar el mundo.', era: '1929–1945', tag: 'esperanza', color: '#aed581' },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // Prefijos canónicos de afirmaciones (5 slots)
  // ──────────────────────────────────────────────────────────────────────────
  // Inspirados en programación neurolingüística + tradición espiritual.
  // Diego mencionó: "Yo soy", "Gracias por". Completo a 5 slots balanceando
  // estados del ser: identidad, agradecimiento, abundancia, valor, voluntad.
  var AFFIRMATION_PREFIXES = [
    { id: 'a-soy',     prefix: 'Yo soy',       placeholder: 'capaz / valiente / luz',       icon: '✨' },
    { id: 'a-gracias', prefix: 'Gracias por',  placeholder: 'mi cuerpo / este día / poder respirar', icon: '🙏' },
    { id: 'a-tengo',   prefix: 'Yo tengo',     placeholder: 'todo lo que necesito ahora',    icon: '🌟' },
    { id: 'a-merezco', prefix: 'Yo merezco',   placeholder: 'paz / abundancia / amor',       icon: '💎' },
    { id: 'a-elijo',   prefix: 'Yo elijo',     placeholder: 'estar presente / soltar / crear', icon: '🔥' },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // Settings persistencia
  // ──────────────────────────────────────────────────────────────────────────
  // Shape: {
  //   activeMode: 'mix' | 'breath' | 'image' | 'gratitude' | 'affirmations',
  //   enabledModes: { breath: bool, image: bool, gratitude: bool, affirmations: bool },
  //   durationSec: 5 | 8 | 12,  (afecta breath; el resto es self-paced)
  // }
  function _defaultSettings() {
    return {
      activeMode: 'mix',
      enabledModes: {
        breath: true,
        image: true,
        gratitude: true,
        affirmations: true,
      },
      durationSec: 8,
    };
  }
  function _loadSettings() {
    try {
      var raw = window.localStorage.getItem(MODES_STORAGE);
      if (!raw) return _defaultSettings();
      var parsed = JSON.parse(raw);
      var def = _defaultSettings();
      return {
        activeMode: parsed.activeMode || def.activeMode,
        enabledModes: Object.assign({}, def.enabledModes, parsed.enabledModes || {}),
        durationSec: [5, 8, 12].indexOf(parsed.durationSec) >= 0 ? parsed.durationSec : def.durationSec,
      };
    } catch (e) { return _defaultSettings(); }
  }
  function _saveSettings(s) {
    try { window.localStorage.setItem(MODES_STORAGE, JSON.stringify(s)); }
    catch (e) { /* no-op private mode */ }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Rotación pseudo-aleatoria sin repetir el último
  // ──────────────────────────────────────────────────────────────────────────
  var _lastPickedMode = null;
  var _lastPickedQuoteId = null;

  function pickModeForSession() {
    var settings = _loadSettings();
    if (settings.activeMode !== 'mix') {
      // Fijo a una modalidad
      var fixed = settings.activeMode;
      // Sanity: si la modalidad fija fue deshabilitada en algún momento,
      // fallback a breath (siempre disponible conceptualmente).
      if (!settings.enabledModes[fixed]) return 'breath';
      return fixed;
    }
    // Mix: rotar entre habilitadas, sin repetir la última
    var enabled = Object.keys(settings.enabledModes).filter(function(k) {
      return settings.enabledModes[k];
    });
    if (enabled.length === 0) return 'breath';  // safety fallback
    if (enabled.length === 1) return enabled[0];
    var pool = enabled.filter(function(m) { return m !== _lastPickedMode; });
    if (pool.length === 0) pool = enabled;
    var picked = pool[Math.floor(Math.random() * pool.length)];
    _lastPickedMode = picked;
    return picked;
  }

  function pickQuote() {
    var pool = QUOTES.filter(function(q) { return q.id !== _lastPickedQuoteId; });
    if (pool.length === 0) pool = QUOTES;
    var picked = pool[Math.floor(Math.random() * pool.length)];
    _lastPickedQuoteId = picked.id;
    return picked;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Persistencia de gratitudes / afirmaciones en wellness-history
  // ──────────────────────────────────────────────────────────────────────────
  // Lee la entrada como una "sesión wellness" de tipo 'gratitude' o
  // 'affirmations'. Reusa el shape de history pero almacena el texto en
  // `entries[]` extra. wellness-history.record() guarda el meta; nosotros
  // hacemos un append directo al localStorage para incluir el texto.
  function recordTexts(mode, items) {
    // items: array de strings (lo que el user escribió)
    if (!Array.isArray(items)) return null;
    var cleaned = items.map(function(s) { return (s || '').trim(); }).filter(Boolean);
    if (cleaned.length === 0) return null;
    var label = mode === 'gratitude' ? 'Gratitud' :
                mode === 'affirmations' ? 'Decretos' : mode;
    // Primero llamar el record() oficial para los stats agregados
    if (window.__mtxWellnessHistory && typeof window.__mtxWellnessHistory.record === 'function') {
      var entry = window.__mtxWellnessHistory.record({
        type: mode,
        label: label,
        completedAt: Date.now(),
        totalMs: cleaned.length * 6000,  // estimate 6s por item
        cyclesDone: cleaned.length,
      });
      // Augmentar la entry con los textos (post-write read+merge).
      // Audit CRIT-6: NO asumir arr[0] — otro tab/listener pudo escribir
      // entremedias. Buscar por entry.id para garantizar que pegamos los
      // textos al entry correcto, no al que quedó arriba por luck.
      try {
        var STORAGE_KEY = 'mtx-wellness-history:v1';
        var raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            var idx = -1;
            for (var i = 0; i < arr.length; i++) {
              if (arr[i] && arr[i].id === entry.id) { idx = i; break; }
            }
            if (idx >= 0) {
              arr[idx].texts = cleaned;
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
            }
          }
        }
      } catch (e) { /* no-op */ }
      // Dispatch para que UIs se actualicen
      try {
        window.dispatchEvent(new CustomEvent('mtx:gate-mode-recorded', {
          detail: { mode: mode, count: cleaned.length },
        }));
      } catch (e) { /* no-op */ }
      return entry;
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers públicos
  // ──────────────────────────────────────────────────────────────────────────
  function modeLabel(mode) {
    return ({
      breath:       'Respiración',
      image:        'Imagen motivacional',
      gratitude:    'Gratitud · 5 cosas',
      affirmations: 'Decretos · 5 frases',
      mix:          'Mezclado · sorpresa',
    })[mode] || mode;
  }
  function modeIcon(mode) {
    return ({
      breath: '🫁', image: '🖼', gratitude: '🙏', affirmations: '✨', mix: '🎲',
    })[mode] || '·';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────
  window.__mtxBreathGateModes = {
    // Catálogos
    QUOTES: QUOTES,
    AFFIRMATION_PREFIXES: AFFIRMATION_PREFIXES,

    // Settings
    getSettings: _loadSettings,
    updateSettings: function(patch) {
      var cur = _loadSettings();
      var next = Object.assign({}, cur, patch || {});
      if (patch && patch.enabledModes) {
        next.enabledModes = Object.assign({}, cur.enabledModes, patch.enabledModes);
      }
      _saveSettings(next);
      try {
        window.dispatchEvent(new CustomEvent('mtx:gate-modes-settings-changed', { detail: next }));
      } catch (e) { /* no-op */ }
      return next;
    },
    resetSettings: function() {
      var def = _defaultSettings();
      _saveSettings(def);
      // Audit GAP-1: también reset la rotación module-state para que la
      // próxima sesión arranque "fresca" sin sesgo por la última pick.
      _lastPickedMode = null;
      _lastPickedQuoteId = null;
      try {
        window.dispatchEvent(new CustomEvent('mtx:gate-modes-settings-changed', { detail: def }));
      } catch (e) { /* no-op */ }
      return def;
    },
    // Audit GAP-1: API explícita para resetear la rotación sin tocar settings
    resetRotation: function() {
      _lastPickedMode = null;
      _lastPickedQuoteId = null;
    },

    // Rotación
    pickModeForSession: pickModeForSession,
    pickQuote: pickQuote,

    // Persistencia
    recordTexts: recordTexts,

    // Helpers
    modeLabel: modeLabel,
    modeIcon: modeIcon,
  };
})();
