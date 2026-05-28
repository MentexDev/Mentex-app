// screens/mtx-design-tokens.jsx — design tokens centralizados
// ─────────────────────────────────────────────────────────────────────────────
//
// Refactor Sprint A.8 → A.9 (post-audit C10+A.8).
//
// Single source of truth para colores, accents y spacing tokens del coach
// generative-media + futuras features wellness.
//
// Estrategia adopción gradual:
//   • Las primitives nuevas (window.__mtxUI, mtx-animations) USAN los tokens
//   • Los archivos existentes (coach-image-gen-store, coach-video-gen-store,
//     ia-artifacts) pueden migrar incremental — los hex literales siguen
//     siendo válidos CSS, no se rompen.
//   • Sprint A.9 wellness debe USAR EXCLUSIVAMENTE __mtxColorTokens (sello).
//
// Estructura:
//   window.__mtxColorTokens
//     ├── core      → tokens semánticos primarios (neon, purple, gold...)
//     ├── status    → estados (success, warn, danger, info)
//     ├── palettes  → conjuntos coherentes pre-armados (meditation, nature...)
//     └── ink       → escalas de gris/texto (alineadas con CSS vars)
//
// Cuando llegue Brandon con backend, el server puede devolver paleta name
// (ej: "meditation") y el frontend resolve via __mtxColorTokens.palettes.
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxColorTokens) return;

  // ──────────────────────────────────────────────────────────────────────────
  // Core tokens semánticos — los 8 más usados (87 de 95 ocurrencias A.8/C10)
  // ──────────────────────────────────────────────────────────────────────────
  // Reglas de naming:
  //   • Lowercase, descriptivo del MOOD, no del hex
  //   • Alineado con CSS custom properties cuando existen (--neon)
  //   • Comentario indica usos típicos
  var core = {
    // Primarios — accent del producto
    neon:    '#3dffd1',   // 28 usos · accent principal Mentex (matches --neon)
    purple:  '#9b8aff',   // 21 usos · meditativo, profundo, premium
    gold:    '#ffc850',   // 15 usos · energía, focus, achievement
    sky:     '#5a8fff',   // 6 usos · razonamiento, info, knowledge
    // Secundarios — atmósferas específicas
    rose:    '#ff6a8a',   // amor, conexión, vulnerabilidad
    peach:   '#ffd28c',   // amanecer, calidez, esperanza
    cyan:    '#5acfff',   // épico, cinema, dream
    sage:    '#9bccaa',   // naturaleza, balance, calma
    lavender:'#a288d4',   // espiritual, ASMR, íntimo
    coral:   '#ff5a4a',   // intensidad, esfuerzo, fuego
    crimson: '#ff3a3a',   // urgencia, alarma, fuerza
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Status colors — semánticos para feedback (toasts, badges, validation)
  // ──────────────────────────────────────────────────────────────────────────
  var status = {
    success: core.neon,        // ✓ done · #3dffd1
    info:    core.sky,         // ℹ neutral info · #5a8fff
    warn:    '#ffb84d',        // ⚠ atención (orange-gold)
    danger:  '#ff8b8b',        // ⚠ error · 13 usos (rosa-rojo suave, no agresivo)
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Ink (texto) — alineado con CSS vars del design system Obsidian/Neon
  // ──────────────────────────────────────────────────────────────────────────
  // Estos NO se usan como hex en código (las JSX usan var(--ink-1)) pero
  // existen aquí como referencia para casos donde se necesita el valor RGB.
  var ink = {
    // Light layer (sobre fondo Obsidian)
    1: 'rgba(255,255,255,0.92)',  // primary text (var --ink-1)
    2: 'rgba(255,255,255,0.65)',  // secondary text (var --ink-2)
    3: 'rgba(255,255,255,0.40)',  // tertiary text (var --ink-3)
    4: 'rgba(255,255,255,0.18)',  // borders sutiles
    // Bases
    bg:      '#0a1410',           // Obsidian principal
    bgDeep:  '#0a0815',           // Obsidian deeper (purple atmospheres)
    bgWarm:  '#1a0a06',           // Warm dark (gold/coral atmospheres)
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Palettes pre-armadas — 3-color gradients coherentes
  // ──────────────────────────────────────────────────────────────────────────
  // Cada palette tiene [light, mid, dark] para gradients radiales o lineales.
  // Reemplaza el switch hardcoded en coach-image-gen-store._paletteFromPrompt.
  // Cuando A.9 (wellness) necesite atmósferas, las consume directamente.
  var palettes = {
    // Wellness moods
    meditation:  [core.purple, '#2d2549', '#0a0815'],
    nature:      [core.neon, '#1a4f3a', '#0a1410'],
    energy:      [core.gold, '#a04a1a', '#1a0c08'],
    night:       [core.sky, '#1a2d5a', '#08101a'],
    love:        [core.rose, '#7a1a3a', '#1a0610'],
    food:        ['#ff9050', '#7a3a1a', '#1a0a06'],
    knowledge:   ['#d4b888', '#4a3a22', '#1a1208'],
    music:       ['#ff5acf', '#5a1a4a', '#1a0810'],
    portrait:    ['#d4a888', '#5a3a22', '#1a1208'],
    // Default fallback — Mentex neon
    default:     [core.neon, '#155a4f', '#0a1410'],
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Mood → palette resolver (replaces _paletteFromPrompt heuristic)
  // ──────────────────────────────────────────────────────────────────────────
  // Recibe el prompt o un mood tag, devuelve la palette correspondiente.
  // Drop-in para coach-image-gen-store._paletteFromPrompt cuando se migre.
  function resolvePaletteFromText(text) {
    var t = String(text || '').toLowerCase();
    if (/(naturaleza|árbol|bosque|montaña|cielo|amanecer|atardecer|mar|océano|verde)/i.test(t)) return palettes.nature;
    if (/(meditar|calma|paz|sereno|zen|mindful|reflexion)/i.test(t)) return palettes.meditation;
    if (/(energía|movimiento|deporte|correr|gym|fuerza|fuego)/i.test(t)) return palettes.energy;
    if (/(noche|luna|dormir|sueño|estrella)/i.test(t)) return palettes.night;
    if (/(rojo|amor|corazón|pasión|sangre)/i.test(t)) return palettes.love;
    if (/(comida|gastronomía|chef|sabor|cocina)/i.test(t)) return palettes.food;
    if (/(libro|leer|aprender|estudiar|conocimiento)/i.test(t)) return palettes.knowledge;
    if (/(música|sonido|cantar|baile)/i.test(t)) return palettes.music;
    if (/(retrato|persona|gente|rostro|cara)/i.test(t)) return palettes.portrait;
    return palettes.default;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────
  window.__mtxColorTokens = {
    core: core,
    status: status,
    ink: ink,
    palettes: palettes,
    resolvePaletteFromText: resolvePaletteFromText,
    // Shortcuts para los más usados (DX)
    neon:    core.neon,
    purple:  core.purple,
    gold:    core.gold,
    sky:     core.sky,
    danger:  status.danger,
    success: status.success,
  };
})();
