// screens/mtx-animations.jsx — keyframes globales consolidados
// ─────────────────────────────────────────────────────────────────────────────
//
// Refactor Sprint A.8 → A.9 (post-audit).
//
// Inyecta UNA SOLA VEZ los keyframes que son GENÉRICOS y compartidos por
// múltiples componentes del coach + futuras features (wellness A.9).
//
// Estrategia preservación:
//   • Los keyframes ESPECÍFICOS de cada feature (coach-voice-call:
//     mtx-vc-*, coach-timeline: mtx-coach-step-*) se quedan en su archivo.
//     Mover esos sería tocar componentes que no auditamos.
//   • Solo movemos los genéricos: skeleton/shimmer/pulse/slide/fade.
//   • mtxBreathe se DUPLICA aquí (no se quita de session-flow para preservar
//     compatibilidad — session-flow es legacy stable). El A.9 wellness usa
//     mtx-breathe (kebab-case) que es identical timing.
//
// Style tag ID único: 'mtx-global-animations'. Idempotente: si ya existe,
// no re-inyecta (safe contra carga doble).
//
// Cuando los archivos legacy de coach (coach-export, ia-artifacts) eliminen
// sus duplicados (post-A.9), las animaciones siguen funcionando porque
// están en el global stylesheet.
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('mtx-global-animations')) return;

  var style = document.createElement('style');
  style.id = 'mtx-global-animations';
  style.textContent = [
    // ─────────────────────────────────────────────────────────────────────
    // Skeleton & loading (Sprint A.6/A.8 generative media)
    // ─────────────────────────────────────────────────────────────────────
    // Pulse opacity-only (skeleton bones que respiran sutil)
    '@keyframes mtx-skeleton-pulse {',
    '  0%, 100% { opacity: 0.5; }',
    '  50% { opacity: 1; }',
    '}',

    // Width 0 → inline-defined (progress bars)
    '@keyframes mtx-progress-fill {',
    '  from { width: 0%; }',
    '  /* `to` defined inline via style.width target */',
    '}',

    // Shimmer bar barriendo el hero del skeleton (Sprint A.8)
    '@keyframes mtx-shimmer {',
    '  0% { transform: translateX(0); }',
    '  100% { transform: translateX(450%); }',
    '}',

    // Soft pulse para iconos centrales (Sprint A.8 + A.9 wellness)
    '@keyframes mtx-pulse-soft {',
    '  0%, 100% { opacity: 0.7; transform: scale(0.96); }',
    '  50% { opacity: 1; transform: scale(1.04); }',
    '}',

    // ─────────────────────────────────────────────────────────────────────
    // Sheets, modals, cards entrada (Sprint A.5/A.6/A.7/A.8)
    // ─────────────────────────────────────────────────────────────────────
    // Slide-up para bottom sheets (export, attach, skills, scene detail)
    '@keyframes mtx-slide-up {',
    '  from { transform: translateY(100%); }',
    '  to   { transform: translateY(0); }',
    '}',

    // Fade-up para cards inline (artifacts, bubbles, lists)
    '@keyframes mtx-fade-up {',
    '  from { opacity: 0; transform: translateY(6px); }',
    '  to   { opacity: 1; transform: translateY(0); }',
    '}',

    // Spinner genérico (CDN load, async ops)
    '@keyframes mtx-spin {',
    '  from { transform: rotate(0deg); }',
    '  to   { transform: rotate(360deg); }',
    '}',

    // ─────────────────────────────────────────────────────────────────────
    // Wellness somáticos (Sprint A.9 preparación)
    // ─────────────────────────────────────────────────────────────────────
    // Breathing universal — scale + opacity. Timing identical a mtxBreathe
    // del legacy session-flow.jsx para preservar visual consistency.
    // A.9 ejercicios de respiración (box, 4-7-8, coherent) usan este como base.
    '@keyframes mtx-breathe {',
    '  0%, 100% { transform: scale(1); opacity: 0.4; }',
    '  50%      { transform: scale(1.15); opacity: 0.7; }',
    '}',

    // Halo expansion — para meditation ring que se expande con la inhalación
    '@keyframes mtx-breathe-halo {',
    '  0%   { transform: scale(0.85); opacity: 0.0; }',
    '  50%  { transform: scale(1.05); opacity: 0.4; }',
    '  100% { transform: scale(1.25); opacity: 0; }',
    '}',

    // Ring stroke dasharray fill — para box-breathing visual (4 lados)
    '@keyframes mtx-breathe-trace {',
    '  from { stroke-dashoffset: 100%; }',
    '  to   { stroke-dashoffset: 0%; }',
    '}',
  ].join('\n');

  document.head.appendChild(style);
})();
