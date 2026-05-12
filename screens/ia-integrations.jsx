/* eslint-disable */
// ═══════════════════════════════════════════════════════════════════════════
// IA Integrations — Fase 4
// ═══════════════════════════════════════════════════════════════════════════
//
// Servicios externos que el coach puede leer/escribir vía sus APIs.
// Diferencia con Channels (Fase 3):
//   • Channels = donde te HABLA el coach (WhatsApp/Telegram/iMessage/etc).
//   • Integrations = lo que el coach puede HACER por ti (crear evento en Google
//     Cal, agregar página a Notion, marcar issue en Linear, etc).
//
// Por qué dedicar un archivo aparte (no extender ia-settings.jsx):
//   1. Catalog rico (8 integraciones × metadata: scopes, OAuth provider info,
//      sync activity log, accent color, premium flag). En ia-settings se
//      vuelve ilegible.
//   2. OAuth mock flows realistas (Google consent screen · Notion workspace
//      picker · Linear team selector · Slack workspace · Spotify scopes).
//      Cada uno ~150 LOC.
//   3. Sync activity log: timeline mock de "lo que Mentex hizo via esta
//      integración" — feature de transparencia única.
//   4. Mismo patrón de aislamiento que ia-skills/ia-workflows/ia-channels →
//      cuando llegue el backend, este archivo aplica los hooks reales sin
//      tocar ia-settings.
//
// Decisión sobre Extensions (Chrome/iOS Shortcuts): DESCARTADAS.
//   • Mentex es agent mobile-first, no research tool. Chrome extension fuerza
//     desktop engagement contradictorio al producto.
//   • "Save URL → Mentex" ya cubierto por Knowledge ingestion (Fase 2.3).
//   • iOS Shortcuts son nativos del OS — viven en la app Shortcuts del iPhone.
//   • Skills marketplace ya está en Skills tab.
//
// Decisiones arquitectónicas:
//   • Reutilizar __mtxIAConfig.integrations para persistencia (igual que
//     Channels reutiliza .channels). El método setIntegration ya existe.
//   • Catalog vive aquí; metadata extra (scopes, oauth provider) per servicio.
//   • Aplicar checklist post-audit Fase IA-2: role=dialog, ESC canonical guard,
//     body scroll lock, backdrop drag-release, cards single role=button,
//     useToast estable, immutable updates, sin window.confirm.

(function() {
  if (typeof window === 'undefined') return;

  // ── Catálogo de integraciones ─────────────────────────────────────────
  // category: 'productivity' | 'communications' | 'music' | 'knowledge'
  // oauthProvider: { brandName, logoEmoji, brandColor } — para el consent
  //   screen mock que imita la UI del proveedor real.
  // scopes: array de { id, label, desc, required, premium? }
  // sampleActivity: 4-6 acciones de muestra para el sync log mock
  var CATALOG = [
    {
      id: 'googleCalendar',
      label: 'Google Calendar',
      emoji: '📅',
      accent: '#4285f4',
      category: 'productivity',
      categoryLabel: 'Productividad',
      blurb: 'Lee tus eventos y agenda bloques de enfoque',
      flowDesc: 'El coach lee tus eventos y crea bloques de enfoque automáticamente.',
      oauthProvider: { brandName: 'Google', logoEmoji: 'G', brandColor: '#4285f4' },
      scopes: [
        { id: 'read-events', label: 'Ver eventos', desc: 'Calendarios primarios y secundarios', required: true },
        { id: 'write-events', label: 'Crear eventos', desc: 'Solo eventos con prefijo "✦ Mentex —"', required: true },
        { id: 'modify-events', label: 'Modificar eventos creados por Mentex', desc: 'Reagendar si cambian tus prioridades', required: false },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 18,        kind: 'create', text: 'Agendó ✦ Bloque de enfoque · 14:00–15:30' },
        { ts: Date.now() - 1000 * 60 * 60 * 3,    kind: 'read',   text: 'Leyó 14 eventos para sugerir tu día' },
        { ts: Date.now() - 1000 * 60 * 60 * 28,   kind: 'modify', text: 'Reagendó ✦ Wind down 30 min más tarde' },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 3, kind: 'create', text: 'Creó recordatorio Hidratación a las 11:00' },
      ],
    },
    {
      id: 'appleCalendar',
      label: 'Apple Calendar',
      emoji: '🗓️',
      accent: '#ff453a',
      category: 'productivity',
      categoryLabel: 'Productividad',
      blurb: 'Mismo nivel de acceso, en tu cuenta de iCloud',
      flowDesc: 'Vía Apple Calendar API. Requiere permiso en Ajustes → Calendario.',
      oauthProvider: { brandName: 'Apple', logoEmoji: '', brandColor: '#000' },
      scopes: [
        { id: 'read-calendars', label: 'Ver calendarios', desc: 'Lista de calendarios y eventos', required: true },
        { id: 'write-events', label: 'Crear eventos', desc: 'Bloques de enfoque + recordatorios', required: true },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 60 * 6, kind: 'create', text: 'Creó evento ✦ Sesión de lectura · 19:00' },
        { ts: Date.now() - 1000 * 60 * 60 * 36, kind: 'read', text: 'Detectó conflicto con cumpleaños — sugirió reagendar' },
      ],
    },
    {
      id: 'gmail',
      label: 'Gmail',
      emoji: '✉️',
      accent: '#ea4335',
      category: 'productivity',
      categoryLabel: 'Productividad',
      blurb: 'Tu coach lee tu inbox y prioriza lo que importa',
      flowDesc: 'Triage matinal: el coach revisa y te resume lo urgente.',
      oauthProvider: { brandName: 'Google', logoEmoji: 'G', brandColor: '#4285f4' },
      scopes: [
        { id: 'read-inbox', label: 'Leer inbox', desc: 'Solo metadata + preview, sin texto completo', required: true },
        { id: 'label-emails', label: 'Etiquetar emails', desc: 'Crear etiqueta "✦ Mentex priorizó"', required: true },
        { id: 'compose-drafts', label: 'Crear borradores (no enviar)', desc: 'Para que revises antes de mandar', required: false },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 35, kind: 'read', text: 'Triage matinal · 47 emails revisados · 3 urgentes' },
        { ts: Date.now() - 1000 * 60 * 60 * 5, kind: 'create', text: 'Borrador de respuesta a "Cliente · revisión propuesta"' },
        { ts: Date.now() - 1000 * 60 * 60 * 24, kind: 'modify', text: 'Etiquetó 12 emails como "✦ Mentex priorizó"' },
      ],
    },
    {
      id: 'notion',
      label: 'Notion',
      emoji: '📝',
      accent: '#ffffff',
      category: 'knowledge',
      categoryLabel: 'Conocimiento',
      blurb: 'Tu coach escribe journals y notas en tu workspace',
      flowDesc: 'Selecciona el workspace y las páginas a las que Mentex puede acceder.',
      oauthProvider: { brandName: 'Notion', logoEmoji: 'N', brandColor: '#000' },
      scopes: [
        { id: 'read-selected-pages', label: 'Leer páginas seleccionadas', desc: 'Solo las que tú permitas explícitamente', required: true },
        { id: 'create-in-base', label: 'Crear páginas en una base elegida', desc: 'Tu Daily Journal database o similar', required: true },
        { id: 'update-pages', label: 'Actualizar páginas creadas por Mentex', desc: 'Solo las que él creó', required: false },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 45, kind: 'create', text: 'Escribió Journal · "Reflexión del día" en Daily Notes' },
        { ts: Date.now() - 1000 * 60 * 60 * 18, kind: 'read', text: 'Leyó 3 páginas para contextualizar tu sesión' },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 4, kind: 'create', text: 'Generó "Weekly review · Sem 18" automáticamente' },
      ],
    },
    {
      id: 'linear',
      label: 'Linear',
      emoji: '⚡',
      accent: '#5e6ad2',
      category: 'productivity',
      categoryLabel: 'Productividad',
      blurb: 'Crea issues asignados a ti y revisa tu queue',
      flowDesc: 'Conecta tu workspace de Linear. Solo issues asignados a ti.',
      oauthProvider: { brandName: 'Linear', logoEmoji: 'L', brandColor: '#5e6ad2' },
      scopes: [
        { id: 'read-issues', label: 'Ver issues asignados a ti', desc: 'No otros proyectos ni equipos', required: true },
        { id: 'create-issues', label: 'Crear issues asignados a ti', desc: 'Cuando le pidas trackear algo', required: true },
        { id: 'comment-issues', label: 'Comentar tus issues', desc: 'Para añadir contexto', required: false },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 60 * 4, kind: 'create', text: 'Creó MTX-127 · "Investigar fade-out de notificaciones"' },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 2, kind: 'read', text: 'Revisó 6 issues open para tu briefing matinal' },
      ],
    },
    {
      id: 'todoist',
      label: 'Todoist',
      emoji: '✅',
      accent: '#e44332',
      category: 'productivity',
      categoryLabel: 'Productividad',
      blurb: 'Sincroniza tu inbox y crea tareas desde el chat',
      flowDesc: 'Autoriza Mentex en tu cuenta Todoist.',
      oauthProvider: { brandName: 'Todoist', logoEmoji: 'T', brandColor: '#e44332' },
      scopes: [
        { id: 'read-tasks', label: 'Ver tus proyectos y tareas', desc: 'Para entender tu contexto', required: true },
        { id: 'create-tasks', label: 'Crear tareas en proyectos elegidos', desc: 'Solo los que selecciones', required: true },
        { id: 'complete-tasks', label: 'Marcar tareas como completadas', desc: 'Cuando le confirmes que terminaste', required: false },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 15, kind: 'create', text: 'Añadió "Llamar a contador" al proyecto Vida' },
        { ts: Date.now() - 1000 * 60 * 60 * 8, kind: 'modify', text: 'Marcó 2 tareas como completadas tras tu check-in' },
      ],
    },
    {
      id: 'spotify',
      label: 'Spotify',
      emoji: '🎵',
      accent: '#1db954',
      category: 'music',
      categoryLabel: 'Música',
      blurb: 'Abre playlists de enfoque desde el coach',
      flowDesc: 'Te abrimos playlists de Mentex y controlamos reproducción durante tus sesiones.',
      premiumOnly: true,
      oauthProvider: { brandName: 'Spotify', logoEmoji: 'S', brandColor: '#1db954' },
      scopes: [
        { id: 'read-library', label: 'Ver tu biblioteca', desc: 'Para recomendarte basado en tu gusto', required: true },
        { id: 'deep-links', label: 'Abrir playlists vía deep-link', desc: 'Sin tocar reproducción', required: true },
        { id: 'playback-control', label: 'Pausar/reanudar (solo Premium)', desc: 'Durante sesiones de enfoque', required: false, premium: true },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 60 * 2, kind: 'modify', text: 'Pausó reproducción al terminar tu sesión' },
        { ts: Date.now() - 1000 * 60 * 60 * 25, kind: 'read', text: 'Sugirió playlist "Lo-fi Beats" para tu sesión profunda' },
      ],
    },
    {
      id: 'slack',
      label: 'Slack',
      emoji: '💼',
      accent: '#4a154b',
      category: 'communications',
      categoryLabel: 'Comunicaciones',
      blurb: 'Status "Enfocado" + DND durante tus sesiones',
      flowDesc: 'Mentex ajusta tu status y DND automáticamente cuando empiezas una sesión.',
      oauthProvider: { brandName: 'Slack', logoEmoji: 'S', brandColor: '#611f69' },
      scopes: [
        { id: 'set-status', label: 'Cambiar tu status', desc: 'A "Enfocado · vuelvo a las HH:MM"', required: true },
        { id: 'set-dnd', label: 'Activar Do Not Disturb', desc: 'Mientras dura tu sesión', required: true },
        { id: 'restore-after', label: 'Restaurar status al terminar', desc: 'Vuelve a tu status anterior', required: false },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 60 * 3, kind: 'modify', text: 'Activó DND y status "✦ Enfocado · vuelvo a 16:00"' },
        { ts: Date.now() - 1000 * 60 * 60 * 4, kind: 'modify', text: 'Restauró tu status original al terminar la sesión' },
      ],
    },
    {
      id: 'obsidian',
      label: 'Obsidian',
      emoji: '🔮',
      accent: '#7c3aed',
      category: 'knowledge',
      categoryLabel: 'Conocimiento',
      blurb: 'Escribe en tu vault local vía plugin oficial',
      flowDesc: 'Instala el plugin Mentex en Obsidian y conecta este device.',
      oauthProvider: { brandName: 'Obsidian', logoEmoji: '🔮', brandColor: '#7c3aed' },
      scopes: [
        { id: 'read-vault', label: 'Leer notas seleccionadas', desc: 'Para contexto de tu trabajo', required: true },
        { id: 'create-notes', label: 'Crear notas en folder elegido', desc: 'Solo en /Mentex Journal/ por default', required: true },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 60 * 12, kind: 'create', text: 'Guardó "2026-05-11 Insight" en /Mentex Journal/' },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 2, kind: 'create', text: 'Generó "Weekly Reflection · Sem 18" automáticamente' },
      ],
    },
    {
      id: 'instagram',
      label: 'Instagram',
      emoji: '📸',
      accent: '#e1306c',
      category: 'social',
      categoryLabel: 'Social',
      blurb: 'Publica posts y stories desde tu coach',
      flowDesc: 'Vía Meta Business Suite. Acceso a tu cuenta de creador o empresa.',
      oauthProvider: { brandName: 'Meta', logoEmoji: 'M', brandColor: '#0866ff' },
      scopes: [
        { id: 'read-account', label: 'Ver tu perfil y métricas', desc: 'Followers, alcance, engagement', required: true },
        { id: 'publish-content', label: 'Publicar posts y stories', desc: 'Solo el contenido que tú aprueba', required: true },
        { id: 'manage-ads', label: 'Crear y pausar campañas', desc: 'Para automatizar tu publicidad', required: false },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 60 * 2, kind: 'create', text: 'Programó 3 posts para esta semana' },
        { ts: Date.now() - 1000 * 60 * 60 * 26, kind: 'read', text: 'Resumen semanal · 1.2K reach · +47 followers' },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 3, kind: 'modify', text: 'Pausó campaña "Promo enfoque" por bajo CTR' },
      ],
    },
    {
      id: 'twitter',
      label: 'X',
      emoji: '𝕏',
      accent: '#ffffff',
      category: 'social',
      categoryLabel: 'Social',
      blurb: 'Publica threads y monitoriza menciones',
      flowDesc: 'OAuth con tu cuenta de X. Funciona con cuentas creator o premium.',
      oauthProvider: { brandName: 'X', logoEmoji: '𝕏', brandColor: '#000' },
      scopes: [
        { id: 'read-tweets', label: 'Leer tus tweets y menciones', desc: 'Solo tu cuenta, no DMs', required: true },
        { id: 'publish-tweets', label: 'Publicar tweets y threads', desc: 'Solo lo que tú aprueba', required: true },
        { id: 'engage-analytics', label: 'Ver analytics', desc: 'Impresiones, engagement, CTR', required: false },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 60 * 4, kind: 'create', text: 'Publicó thread "Mi proceso de enfoque" · 5 tweets' },
        { ts: Date.now() - 1000 * 60 * 60 * 24, kind: 'read', text: 'Resumió 14 menciones · 3 requieren tu respuesta' },
      ],
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      emoji: '💼',
      accent: '#0a66c2',
      category: 'social',
      categoryLabel: 'Social',
      blurb: 'Publica contenido profesional y crece tu red',
      flowDesc: 'OAuth con LinkedIn. Funciona con perfiles personales y company pages.',
      oauthProvider: { brandName: 'LinkedIn', logoEmoji: 'in', brandColor: '#0a66c2' },
      scopes: [
        { id: 'read-profile', label: 'Ver tu perfil y conexiones', desc: 'Datos públicos de tu red', required: true },
        { id: 'publish-posts', label: 'Publicar posts y artículos', desc: 'Solo lo que tú aprueba', required: true },
        { id: 'engage-comments', label: 'Responder comentarios', desc: 'Borrador para tu revisión', required: false },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 60 * 8, kind: 'create', text: 'Publicó post sobre "Hábitos de un founder" · 234 likes' },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 2, kind: 'read', text: 'Detectó 12 conexiones nuevas relevantes esta semana' },
      ],
    },
    {
      id: 'youtube',
      label: 'YouTube',
      emoji: '▶️',
      accent: '#ff0000',
      category: 'social',
      categoryLabel: 'Social',
      blurb: 'Tu canal — analytics, comments, schedule',
      flowDesc: 'Vía Google OAuth. Acceso solo a canales que tú gestionas.',
      oauthProvider: { brandName: 'Google', logoEmoji: 'G', brandColor: '#4285f4' },
      scopes: [
        { id: 'read-channel', label: 'Ver tu canal y videos', desc: 'Metadata, views, engagement', required: true },
        { id: 'manage-comments', label: 'Responder comentarios', desc: 'Borrador para tu revisión', required: true },
        { id: 'schedule-uploads', label: 'Programar publicaciones', desc: 'Solo videos que tú subas primero', required: false },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 60 * 3, kind: 'read', text: 'Resumen del día · 14K views nuevas · 23 comments por responder' },
        { ts: Date.now() - 1000 * 60 * 60 * 30, kind: 'create', text: 'Generó borradores de respuesta para 9 comentarios' },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 4, kind: 'modify', text: 'Programó "Episodio 42" para domingo 18:00' },
      ],
    },
    {
      id: 'appleHealth',
      label: 'Apple Health',
      emoji: '❤️',
      accent: '#fb4868',
      category: 'wellbeing',
      categoryLabel: 'Bienestar',
      blurb: 'Sueño, pasos, mindfulness — el coach lo correlaciona',
      flowDesc: 'Permite a Mentex leer datos selectos de tu Salud. Solo lectura.',
      oauthProvider: { brandName: 'Apple', logoEmoji: '', brandColor: '#000' },
      scopes: [
        { id: 'read-sleep', label: 'Ver datos de sueño', desc: 'Horas, calidad, tendencias', required: true },
        { id: 'read-activity', label: 'Ver actividad física', desc: 'Pasos, ejercicio, anillos', required: true },
        { id: 'read-mindfulness', label: 'Ver minutos de mindfulness', desc: 'Para sugerirte más cuando falte', required: false },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 60 * 1, kind: 'read', text: 'Detectó sueño bajo (5.2h) — sugirió wind down más temprano' },
        { ts: Date.now() - 1000 * 60 * 60 * 24, kind: 'read', text: 'Anillo de ejercicio · 8/30 min — propuso 10 min de yoga' },
      ],
    },
    {
      id: 'strava',
      label: 'Strava',
      emoji: '🏃',
      accent: '#fc5200',
      category: 'wellbeing',
      categoryLabel: 'Bienestar',
      blurb: 'Tus entrenamientos informan tu rutina diaria',
      flowDesc: 'OAuth con Strava. El coach correlaciona ejercicio con energía y enfoque.',
      oauthProvider: { brandName: 'Strava', logoEmoji: 'S', brandColor: '#fc5200' },
      scopes: [
        { id: 'read-activities', label: 'Ver actividades recientes', desc: 'Tipo, duración, esfuerzo', required: true },
        { id: 'read-stats', label: 'Ver estadísticas semanales', desc: 'Volumen, ritmo, tendencias', required: false },
      ],
      sampleActivity: [
        { ts: Date.now() - 1000 * 60 * 60 * 18, kind: 'read', text: 'Detectó run de 8K · sugirió hidratación + bloque corto' },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 5, kind: 'read', text: 'Semana sin ejercicio — propuso una caminata gentle' },
      ],
    },
  ];

  // ── Asegurar que cada integración existe en __mtxIAConfig.integrations ──
  // Algunas del catalog pueden no estar en el initial state. Idempotente.
  function _ensureIntegrationsInitialized() {
    if (!window.__mtxIAConfig) return false;
    var cfg = window.__mtxIAConfig.snapshot();
    if (!cfg || !cfg.integrations) return false;
    var missing = {};
    CATALOG.forEach(function(c) {
      if (!cfg.integrations[c.id]) {
        missing[c.id] = { connected: false, scopes: [], lastSync: null };
      }
    });
    if (Object.keys(missing).length === 0) return true;
    Object.keys(missing).forEach(function(k) {
      window.__mtxIAConfig.setIntegration(k, missing[k]);
    });
    return true;
  }
  // Init idempotente — post-audit Fase 3+4: retry solo si la primera falla.
  if (!_ensureIntegrationsInitialized()) {
    setTimeout(function() {
      if (!_ensureIntegrationsInitialized()) setTimeout(_ensureIntegrationsInitialized, 100);
    }, 0);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function _getCatalog() { return CATALOG.slice(); }
  function _getIntegration(id) {
    for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === id) return CATALOG[i];
    return null;
  }
  function _getState(id) {
    if (!window.__mtxIAConfig) return null;
    var cfg = window.__mtxIAConfig.snapshot();
    return cfg && cfg.integrations ? cfg.integrations[id] || null : null;
  }
  function _getConnectedCount() {
    if (!window.__mtxIAConfig) return 0;
    var cfg = window.__mtxIAConfig.snapshot();
    if (!cfg || !cfg.integrations) return 0;
    var n = 0;
    CATALOG.forEach(function(c) {
      var st = cfg.integrations[c.id];
      if (st && st.connected) n++;
    });
    return n;
  }
  function _formatRelative(ts) {
    if (!ts) return 'Nunca';
    var diff = Date.now() - ts;
    if (diff < 0) return 'Recién';
    if (diff < 60_000) return 'Hace un momento';
    if (diff < 3_600_000) return 'Hace ' + Math.floor(diff / 60_000) + ' min';
    if (diff < 86_400_000) return 'Hace ' + Math.floor(diff / 3_600_000) + 'h';
    var d = Math.floor(diff / 86_400_000);
    if (d === 1) return 'Ayer';
    if (d < 7) return 'Hace ' + d + ' días';
    return 'Hace más de una semana';
  }
  // Status: 'healthy' | 'syncing' | 'warning' | 'disconnected'
  function _getStatus(id) {
    var c = _getIntegration(id);
    if (!c) return 'disconnected';
    var st = _getState(id);
    if (!st || !st.connected) return 'disconnected';
    if (st.syncing) return 'syncing';
    if (st.lastSync && (Date.now() - st.lastSync) > 7 * 86_400_000) return 'warning';
    return 'healthy';
  }
  function _statusColor(status) {
    if (status === 'healthy') return 'var(--neon)';
    if (status === 'syncing') return '#5dd3ff';
    if (status === 'warning') return '#ffc850';
    return 'rgba(255,255,255,0.18)';
  }
  function _statusLabel(status) {
    if (status === 'syncing') return 'Sincronizando…';
    if (status === 'healthy') return 'Conectada';
    if (status === 'warning') return 'Sin sync reciente';
    return 'Desconectada';
  }
  function _getCategoryAccent(category) {
    return ({
      productivity:   'var(--neon)',
      communications: '#ff8b8b',
      music:          '#9b8aff',
      knowledge:      '#5dd3ff',
    })[category] || 'var(--neon)';
  }

  window.__mtxIAIntegrations = {
    getCatalog:         _getCatalog,
    getIntegration:     _getIntegration,
    getState:           _getState,
    getConnectedCount:  _getConnectedCount,
    getStatus:          _getStatus,
    statusColor:        _statusColor,
    statusLabel:        _statusLabel,
    formatRelative:     _formatRelative,
    getCategoryAccent:  _getCategoryAccent,
    ensureInitialized:  _ensureIntegrationsInitialized,
  };
})();


// ═══════════════════════════════════════════════════════════════════════════
// Hook reactivo
// ═══════════════════════════════════════════════════════════════════════════
function useIAIntegrations() {
  var force = React.useReducer(function(x) { return x + 1; }, 0)[1];
  React.useEffect(function() {
    var h = function() { force(); };
    window.addEventListener('mtx:ia-config-changed', h);
    return function() { window.removeEventListener('mtx:ia-config-changed', h); };
  }, []);
  React.useEffect(function() {
    if (window.__mtxIAIntegrations) window.__mtxIAIntegrations.ensureInitialized();
  }, []);
  return window.__mtxIAIntegrations;
}


// ═══════════════════════════════════════════════════════════════════════════
// IntegrationsHero — counter + categorización visual
// ═══════════════════════════════════════════════════════════════════════════
function IntegrationsHero(props) {
  var connected = props.connected;
  var total = props.total;
  var pct = total > 0 ? Math.round((connected / total) * 100) : 0;
  return (
    <div style={{
      marginBottom: 16,
      padding: '14px 16px',
      borderRadius: 16,
      background: 'linear-gradient(135deg, rgba(255,200,80,0.08), rgba(155,138,255,0.04))',
      border: '0.5px solid rgba(255,200,80,0.20)',
      animation: 'mtx-fade-up .25s ease both',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 12, marginBottom: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)',
            letterSpacing: '-0.012em',
            fontFamily: 'var(--ff-display, var(--ff-sans))',
            marginBottom: 3,
          }}>Tu coach actuando por ti</div>
          <div style={{
            fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4,
            letterSpacing: '-0.005em',
          }}>
            Conecta servicios para que el coach pueda crear eventos, escribir notas o ajustar tu DND.
          </div>
        </div>
        <div style={{
          padding: '6px 11px', borderRadius: 999,
          background: 'rgba(255,200,80,0.12)',
          border: '0.5px solid rgba(255,200,80,0.30)',
          color: '#ffc850',
          fontSize: 11, fontWeight: 700,
          fontFamily: 'var(--ff-sans)',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>{connected}/{total}</div>
      </div>
      <div style={{ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          width: pct + '%', height: '100%',
          background: 'linear-gradient(90deg, #ffc850, #9b8aff)',
          borderRadius: 999,
          transition: 'width .4s cubic-bezier(.4,1.4,.5,1)',
          boxShadow: '0 0 8px rgba(255,200,80,0.4)',
        }}/>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// IntegrationCard — single role=button + status dot + last-sync subtitle
// ═══════════════════════════════════════════════════════════════════════════
function IntegrationCard(props) {
  var it = props.integration;
  var state = props.state || {};
  var status = props.status;
  var onOpen = props.onOpen;
  var color = window.__mtxIAIntegrations.statusColor(status);
  var label = window.__mtxIAIntegrations.statusLabel(status);
  var isConnected = status === 'healthy' || status === 'syncing';
  var isWarning = status === 'warning';

  var subtitle = it.blurb;
  if (isConnected && state.lastSync) {
    subtitle = 'Última sync · ' + window.__mtxIAIntegrations.formatRelative(state.lastSync);
  } else if (isConnected) {
    subtitle = 'Conectada';
  }

  var openOnKey = function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={openOnKey}
      aria-label={'Configurar integración ' + it.label + '. Estado: ' + label + '.'}
      className="mtx-tap"
      style={{
        padding: '12px 12px',
        borderRadius: 16,
        background: isConnected
          ? 'linear-gradient(135deg, ' + it.accent + '12, ' + it.accent + '02)'
          : 'rgba(255,255,255,0.025)',
        border: '0.5px solid ' + (isConnected
          ? it.accent + '30'
          : isWarning ? 'rgba(255,200,80,0.30)' : 'rgba(255,255,255,0.06)'),
        transition: 'all .25s',
        animation: 'mtx-fade-up .25s ease both',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        gap: 8,
        minHeight: 102,
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div aria-hidden="true" style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: isConnected
            ? 'linear-gradient(135deg, ' + it.accent + '28, ' + it.accent + '08)'
            : 'rgba(255,255,255,0.04)',
          border: '0.5px solid ' + (isConnected ? it.accent + '40' : 'rgba(255,255,255,0.06)'),
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, lineHeight: 1,
          boxShadow: isConnected ? '0 0 10px ' + it.accent + '24' : 'none',
        }}>
          <span>{it.emoji}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2,
          }}>
            <span style={{
              fontSize: 12.5, fontWeight: 700, color: 'var(--ink-1)',
              letterSpacing: '-0.012em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              minWidth: 0, flexShrink: 1,
            }}>{it.label}</span>
            {it.premiumOnly && !isConnected && (
              <span style={{
                fontSize: 8.5, fontWeight: 700, color: '#ffc850',
                letterSpacing: '0.06em',
              }}>✦</span>
            )}
            <span aria-hidden="true" style={{
              width: 6, height: 6, borderRadius: '50%',
              background: color,
              flexShrink: 0,
              boxShadow: (status === 'healthy') ? '0 0 6px ' + color : 'none',
              animation: status === 'syncing' ? 'mtxIntPulse 1s ease-in-out infinite'
                       : isWarning ? 'mtxIntPulse 1.6s ease-in-out infinite' : 'none',
            }}/>
          </div>
          <div style={{
            fontSize: 10.5, fontWeight: 600,
            color: isConnected ? it.accent : isWarning ? '#ffc850' : 'var(--ink-4)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>{label}</div>
        </div>
      </div>
      <div style={{
        fontSize: 11, color: 'var(--ink-3)',
        lineHeight: 1.4, letterSpacing: '-0.005em',
        fontFamily: 'var(--ff-sans)',
        marginTop: 'auto',
        display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>{subtitle}</div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// IntegrationsGrid — grid plano 2-col, sin separación por categoría.
// (Decisión post-Fase 4 review: las categorías inflaban verticalmente y no
// ayudaban a la decisión del user. Mejor UX en un solo bloque scrolleable.)
// ═══════════════════════════════════════════════════════════════════════════
function IntegrationsGrid(props) {
  var catalog = props.catalog;
  var onOpen = props.onOpen;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
      animation: 'mtx-fade-up .3s ease both',
    }}>
      {catalog.map(function(it) {
        var st = window.__mtxIAIntegrations.getState(it.id) || {};
        var status = window.__mtxIAIntegrations.getStatus(it.id);
        return (
          <IntegrationCard
            key={it.id}
            integration={it}
            state={st}
            status={status}
            onOpen={function() { onOpen(it); }}
          />
        );
      })}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// OAuthConsentScreen — mock del consent screen del provider
// ═══════════════════════════════════════════════════════════════════════════
function OAuthConsentScreen(props) {
  var it = props.integration;
  var onAuthorize = props.onAuthorize;
  var onCancel = props.onCancel;
  var p = it.oauthProvider;

  return (
    <div style={{
      borderRadius: 14,
      // Background tipo consent screen del provider: light blanco si Google/Apple,
      // dark si Notion. Aquí usamos light por default (typical OAuth UI).
      background: '#fafaf7',
      color: '#1a1a1a',
      padding: '20px 18px',
      boxShadow: '0 12px 32px -8px rgba(0,0,0,0.5)',
      animation: 'mtx-fade-up .25s ease both',
    }}>
      {/* Provider header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
        paddingBottom: 14,
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: p.brandColor,
          color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 700,
          fontFamily: '-apple-system, system-ui, sans-serif',
        }}>{p.logoEmoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700,
            fontFamily: '-apple-system, system-ui, sans-serif',
          }}>Iniciar sesión con {p.brandName}</div>
          <div style={{
            fontSize: 10.5, color: '#666',
            fontFamily: '-apple-system, system-ui, sans-serif',
          }}>auth.{p.brandName.toLowerCase()}.com</div>
        </div>
      </div>

      <div style={{
        fontSize: 14, fontWeight: 600, marginBottom: 4,
        fontFamily: '-apple-system, system-ui, sans-serif',
        color: '#1a1a1a',
      }}>Mentex Coach quiere acceder a tu cuenta</div>
      <div style={{
        fontSize: 11.5, color: '#666', lineHeight: 1.5, marginBottom: 16,
        fontFamily: '-apple-system, system-ui, sans-serif',
      }}>
        Te pedirá los siguientes permisos. Puedes revocarlos en cualquier momento.
      </div>

      <div style={{ marginBottom: 16 }}>
        {it.scopes.map(function(s, i) {
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 0',
              borderBottom: i < it.scopes.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                background: s.required ? p.brandColor : '#e5e5e5',
                color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
                marginTop: 1,
              }}>✓</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  fontFamily: '-apple-system, system-ui, sans-serif',
                  color: '#1a1a1a',
                  marginBottom: 1,
                }}>{s.label}{!s.required && ' (opcional)'}</div>
                <div style={{
                  fontSize: 10.5, color: '#666', lineHeight: 1.4,
                  fontFamily: '-apple-system, system-ui, sans-serif',
                }}>{s.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onAuthorize}
        className="mtx-tap"
        style={{
          appearance: 'none', cursor: 'pointer',
          width: '100%', padding: '12px 14px', borderRadius: 10, border: 0,
          background: p.brandColor,
          color: '#fff',
          fontSize: 13.5, fontWeight: 700,
          fontFamily: '-apple-system, system-ui, sans-serif',
          marginBottom: 8,
          boxShadow: '0 2px 8px -2px rgba(0,0,0,0.25)',
        }}>Autorizar</button>
      <button onClick={onCancel}
        className="mtx-tap"
        style={{
          appearance: 'none', cursor: 'pointer',
          width: '100%', padding: '11px 14px', borderRadius: 10,
          background: 'transparent',
          border: '0.5px solid #d0d0d0',
          color: '#555',
          fontSize: 12.5, fontWeight: 600,
          fontFamily: '-apple-system, system-ui, sans-serif',
        }}>Cancelar</button>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// SyncActivityLog — timeline de "qué hizo Mentex via esta integración"
// ═══════════════════════════════════════════════════════════════════════════
function SyncActivityLog(props) {
  var activity = props.activity || [];
  if (activity.length === 0) {
    return (
      <div style={{
        padding: '14px 12px', borderRadius: 12,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.05)',
        textAlign: 'center',
        fontSize: 11.5, color: 'var(--ink-3)',
        lineHeight: 1.4,
      }}>Aún no hay actividad. Cuando el coach use esta integración, aparecerá aquí.</div>
    );
  }
  return (
    <div style={{
      borderRadius: 12,
      background: 'rgba(255,255,255,0.02)',
      border: '0.5px solid rgba(255,255,255,0.05)',
      overflow: 'hidden',
    }}>
      {activity.slice(0, 6).map(function(a, i) {
        var kindColor = a.kind === 'create' ? 'var(--neon)'
                      : a.kind === 'modify' ? '#ffc850'
                      : a.kind === 'read'   ? '#5dd3ff'
                      : 'var(--ink-3)';
        var kindEmoji = a.kind === 'create' ? '+'
                      : a.kind === 'modify' ? '↻'
                      : a.kind === 'read'   ? '👁'
                      : '·';
        return (
          <div key={a.ts + ':' + a.kind} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 12px',
            borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <div aria-hidden="true" style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: kindColor + '18',
              border: '0.5px solid ' + kindColor + '40',
              color: kindColor,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
              marginTop: 1,
            }}>{kindEmoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.4,
                fontFamily: 'var(--ff-sans)', letterSpacing: '-0.005em',
              }}>{a.text}</div>
              <div style={{
                fontSize: 9.5, color: 'var(--ink-4)', marginTop: 2,
                fontFamily: 'var(--ff-sans)',
              }}>{window.__mtxIAIntegrations.formatRelative(a.ts)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ScopesDisplay — lista de permisos otorgados (read-only post-connect)
// ═══════════════════════════════════════════════════════════════════════════
function ScopesDisplay(props) {
  var it = props.integration;
  var grantedScopes = props.grantedScopes || [];
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 14,
      background: 'rgba(255,255,255,0.025)',
      border: '0.5px solid rgba(255,255,255,0.05)',
    }}>
      <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>
        PERMISOS OTORGADOS
      </div>
      <div role="list">
      {it.scopes.map(function(s) {
        var granted = grantedScopes.indexOf(s.id) >= 0 || s.required;
        return (
          <div key={s.id}
            role="listitem"
            aria-label={s.label + (granted ? ', otorgado' : ', no otorgado') + '. ' + s.desc}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '6px 0',
              fontSize: 11.5, color: granted ? 'var(--ink-2)' : 'var(--ink-4)',
              lineHeight: 1.45,
            }}>
            <span aria-hidden="true" style={{
              fontSize: 11, color: granted ? 'var(--neon)' : 'var(--ink-4)',
              flexShrink: 0, marginTop: 1,
            }}>{granted ? '✓' : '○'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 1 }}>{s.desc}</div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ConnectingState — loading spinner mientras se "establece la conexión"
// ═══════════════════════════════════════════════════════════════════════════
function IntConnectingState(props) {
  return (
    <div style={{ padding: '32px 8px', textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px',
        background: 'linear-gradient(135deg, ' + props.accent + '20, ' + props.accent + '08)',
        border: '0.5px solid ' + props.accent + '36',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: -3, borderRadius: '50%',
          border: '2px solid ' + props.accent + '20',
          borderTopColor: props.accent,
          animation: 'mtx-spin 1.1s linear infinite',
        }}/>
        <span style={{ fontSize: 26 }}>{props.emoji}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>Conectando…</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', maxWidth: 240, margin: '0 auto', lineHeight: 1.4 }}>
        Estableciendo conexión segura con {props.label}.
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// IntegrationDetailSheet — sheet completo con OAuth flow O estado conectado
// ═══════════════════════════════════════════════════════════════════════════
function IntegrationDetailSheet(props) {
  var it = props.integration;
  var onClose = props.onClose;
  var state = window.__mtxIAIntegrations.getState(it.id) || {};
  var status = window.__mtxIAIntegrations.getStatus(it.id);
  var isConnected = status === 'healthy' || status === 'syncing';

  // Disconnect inline confirm
  var confirmDisconnectState = React.useState(false);
  var confirmDisconnect = confirmDisconnectState[0]; var setConfirmDisconnect = confirmDisconnectState[1];

  // OAuth flow state machine
  var phaseState = React.useState(isConnected ? 'connected' : 'idle');
  var phase = phaseState[0]; var setPhase = phaseState[1];

  // Post-audit Fase 3+4: mountedRef + clearable timers para evitar setState
  // post-unmount + estados zombi tras cerrar sheet durante connecting/syncing.
  var mountedRef = React.useRef(true);
  var grantTimerRef = React.useRef(null);
  var syncTimerRef = React.useRef(null);
  React.useEffect(function() {
    return function() {
      mountedRef.current = false;
      if (grantTimerRef.current) clearTimeout(grantTimerRef.current);
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        // Clear el flag `syncing` que quedó true en el store
        if (window.__mtxIAConfig) window.__mtxIAConfig.setIntegration(it.id, { syncing: false });
      }
    };
  }, []);

  // Sync phase a status cuando cambia externamente (post-audit CRIT-4):
  // si otra surface disconecta la integration mientras el sheet está abierto,
  // phase quedaba en 'connected' mostrando UI incorrecta.
  React.useEffect(function() {
    if (phase === 'consent' || phase === 'connecting') return;  // no interrumpir transitorios
    setPhase(isConnected ? 'connected' : 'idle');
  }, [isConnected]);

  // ESC canonical guard CON staged behavior (post-audit CRIT-5):
  // 1) confirmDisconnect abierto → cierra el confirm
  // 2) phase === 'consent' → vuelve a idle (no cierra sheet)
  // 3) phase === 'connecting' → ignorar ESC (transitorio inevitable)
  // 4) caso default → cierra sheet
  var onCloseRef = React.useRef(onClose);
  var phaseRef = React.useRef(phase);
  var confirmRef = React.useRef(confirmDisconnect);
  React.useEffect(function() { onCloseRef.current = onClose; });
  React.useEffect(function() { phaseRef.current = phase; });
  React.useEffect(function() { confirmRef.current = confirmDisconnect; });
  React.useEffect(function() {
    var onKey = function(e) {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      if (confirmRef.current) { setConfirmDisconnect(false); return; }
      if (phaseRef.current === 'consent') { setPhase('idle'); return; }
      if (phaseRef.current === 'connecting') return;  // bloqueado durante OAuth
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);

  // Body scroll lock
  React.useEffect(function() {
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function() { document.body.style.overflow = prev; };
  }, []);

  // Backdrop drag-release — respeta también staged ESC behavior
  var backdropDownRef = React.useRef(false);
  var handleBackdropDown = function(e) { backdropDownRef.current = e.target === e.currentTarget; };
  var handleBackdropClick = function(e) {
    if (!(e.target === e.currentTarget && backdropDownRef.current)) { backdropDownRef.current = false; return; }
    backdropDownRef.current = false;
    if (confirmDisconnect) { setConfirmDisconnect(false); return; }
    if (phase === 'consent') { setPhase('idle'); return; }
    if (phase === 'connecting') return;
    onCloseRef.current();
  };

  // useToast estable
  var _useToast = window.useToast || function() { return { show: function() {} }; };
  var toast = _useToast();

  var startOAuth = function() { setPhase('consent'); };
  var grantOAuth = function() {
    setPhase('connecting');
    // Post-audit Fase 3+4: timer cleanable; chequea mountedRef antes de write.
    grantTimerRef.current = setTimeout(function() {
      grantTimerRef.current = null;
      if (!mountedRef.current) return;
      var grantedScopes = it.scopes.filter(function(s) { return s.required || !s.premium; }).map(function(s) { return s.id; });
      window.__mtxIAConfig.setIntegration(it.id, {
        connected: true,
        scopes: grantedScopes,
        lastSync: Date.now(),
      });
      setPhase('connected');
      toast.show({ message: '✦ ' + it.label + ' conectada', duration: 1800 });
    }, 1100);
  };
  var cancelOAuth = function() {
    // Cancela timer si hay uno pendiente (e.g. user spammeó Autorizar→Cancelar)
    if (grantTimerRef.current) { clearTimeout(grantTimerRef.current); grantTimerRef.current = null; }
    setPhase('idle');
  };

  var manualSync = function() {
    // Post-audit Fase 3+4: dedup (no triple-fire) + timer cleanup + chequeo
    // de status antes de write (si disconnected mid-sync, no escribir).
    if (syncTimerRef.current) return;
    window.__mtxIAConfig.setIntegration(it.id, { syncing: true });
    syncTimerRef.current = setTimeout(function() {
      syncTimerRef.current = null;
      if (!mountedRef.current) return;
      var fresh = window.__mtxIAIntegrations.getState(it.id);
      if (!fresh || !fresh.connected) {
        // Aborta — el user desconectó mientras sincronizaba
        window.__mtxIAConfig.setIntegration(it.id, { syncing: false });
        return;
      }
      window.__mtxIAConfig.setIntegration(it.id, { syncing: false, lastSync: Date.now() });
      toast.show({ message: '✦ ' + it.label + ' sincronizada', duration: 1600 });
    }, 1500);
  };

  var doDisconnect = function() {
    // Cancela sync en vuelo si hay uno
    if (syncTimerRef.current) { clearTimeout(syncTimerRef.current); syncTimerRef.current = null; }
    window.__mtxIAConfig.setIntegration(it.id, {
      connected: false,
      scopes: [],
      lastSync: null,
      syncing: false,
    });
    toast.show({ message: it.label + ' desconectada', duration: 1600 });
    setConfirmDisconnect(false);
    onClose();
  };

  var portalRoot = (typeof document !== 'undefined')
    ? document.getElementById('mtx-overlay-root')
    : null;
  if (!portalRoot) return null;

  // Activity log: si conectada → sample del catalog; si no, vacío.
  // Post-audit Fase 3+4: si state.lastSync es más reciente que el último ts
  // del sampleActivity, prepend una entry "sync manual completada" — antes
  // sync no tenía feedback en el timeline, el usuario tappeaba "Sincronizar"
  // y no veía cambio en la lista.
  var activity = it.sampleActivity || [];
  if (isConnected && state.lastSync) {
    var mostRecent = activity[0] && activity[0].ts;
    if (!mostRecent || state.lastSync > mostRecent) {
      activity = [{ ts: state.lastSync, kind: 'read', text: 'Sincronización manual completada' }].concat(activity);
    }
  }
  if (!isConnected) activity = [];

  var content = (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'mtx-fade-up .25s ease',
    }} onMouseDown={handleBackdropDown} onClick={handleBackdropClick}>
      <div onClick={function(e) { e.stopPropagation(); }}
        role="dialog" aria-modal="true" aria-label={'Integración: ' + it.label}
        className="mtx-no-scrollbar"
        style={{
          background: 'rgba(15,19,19,0.96)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderTop: '0.5px solid rgba(255,255,255,0.10)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '14px 20px 28px',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
          maxHeight: '92%', overflow: 'auto',
          animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
        }}>
        <div aria-hidden="true" style={{
          width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
          background: 'rgba(255,255,255,0.16)',
        }}/>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <div aria-hidden="true" style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, ' + it.accent + '28, ' + it.accent + '08)',
            border: '0.5px solid ' + it.accent + '40',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 0 14px ' + it.accent + '20',
          }}>{it.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
            }}>
              <span style={{
                fontSize: 16, fontWeight: 700, color: 'var(--ink-1)',
                letterSpacing: '-0.018em',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
              }}>{it.label}</span>
              <span aria-hidden="true" style={{
                width: 7, height: 7, borderRadius: '50%',
                background: window.__mtxIAIntegrations.statusColor(status),
                boxShadow: status === 'healthy' ? '0 0 6px ' + window.__mtxIAIntegrations.statusColor(status) : 'none',
              }}/>
            </div>
            <div style={{
              fontSize: 10.5, fontWeight: 700,
              color: isConnected ? it.accent : 'var(--ink-4)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: 4,
            }}>{window.__mtxIAIntegrations.statusLabel(status)}</div>
            <div style={{
              fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.45,
              letterSpacing: '-0.005em',
            }}>{it.flowDesc}</div>
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

        {/* CASO A: idle (no conectada) → mostrar scopes + CTA "Continuar a {provider}" */}
        {phase === 'idle' && (
          <div>
            <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>
              QUÉ PUEDE HACER MENTEX
            </div>
            <div style={{ marginBottom: 16 }}>
              <ScopesDisplay integration={it} grantedScopes={[]}/>
            </div>

            <button onClick={startOAuth}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                width: '100%', padding: '13px 14px', borderRadius: 14, border: 0,
                background: 'linear-gradient(135deg, ' + it.accent + ', ' + it.accent + 'cc)',
                color: '#0a1410',
                fontSize: 14, fontWeight: 700,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.01em',
                boxShadow: '0 4px 14px -2px ' + it.accent + '66',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              Continuar con {it.oauthProvider.brandName}
            </button>
          </div>
        )}

        {/* CASO B: consent → OAuth mock provider screen */}
        {phase === 'consent' && (
          <OAuthConsentScreen
            integration={it}
            onAuthorize={grantOAuth}
            onCancel={cancelOAuth}
          />
        )}

        {/* CASO C: connecting → spinner + Cancel button (post-audit Fase 3+4) */}
        {phase === 'connecting' && (
          <div>
            <IntConnectingState emoji={it.emoji} label={it.label} accent={it.accent}/>
            <button onClick={cancelOAuth}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                width: '100%', padding: '11px 14px', borderRadius: 12, border: 0,
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--ink-3)',
                fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                marginTop: 8,
              }}>Cancelar</button>
          </div>
        )}

        {/* CASO D: connected → scopes + activity log + actions */}
        {phase === 'connected' && (
          <div>
            <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>
              PERMISOS OTORGADOS
            </div>
            <div style={{ marginBottom: 16 }}>
              <ScopesDisplay integration={it} grantedScopes={state.scopes || []}/>
            </div>

            <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>
              ACTIVIDAD RECIENTE
            </div>
            <div style={{ marginBottom: 16 }}>
              <SyncActivityLog activity={activity}/>
            </div>

            <button onClick={manualSync} disabled={state.syncing}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: state.syncing ? 'wait' : 'pointer',
                width: '100%', padding: '12px 14px', borderRadius: 14,
                background: state.syncing
                  ? 'rgba(93,211,255,0.08)'
                  : 'linear-gradient(135deg, ' + it.accent + '14, ' + it.accent + '04)',
                color: state.syncing ? '#5dd3ff' : it.accent,
                fontSize: 12.5, fontWeight: 700,
                fontFamily: 'var(--ff-sans)',
                marginBottom: 8,
                border: '0.5px solid ' + (state.syncing ? 'rgba(93,211,255,0.30)' : it.accent + '32'),
              }}>
              {state.syncing ? 'Sincronizando…' : '↻  Sincronizar ahora'}
            </button>

            {!confirmDisconnect ? (
              <button onClick={function() { setConfirmDisconnect(true); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  width: '100%', padding: '11px 14px', borderRadius: 14,
                  background: 'rgba(255,107,107,0.06)',
                  border: '0.5px solid rgba(255,107,107,0.20)',
                  color: '#ff8b8b',
                  fontSize: 12.5, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                }}>Desconectar</button>
            ) : (
              <div style={{
                padding: '12px 14px', borderRadius: 14,
                background: 'rgba(255,107,107,0.06)',
                border: '0.5px solid rgba(255,107,107,0.30)',
              }}>
                <div style={{
                  fontSize: 12, color: '#ff8b8b', marginBottom: 10,
                  fontWeight: 600, textAlign: 'center',
                }}>¿Seguro? Mentex dejará de tener acceso a {it.label}.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={function() { setConfirmDisconnect(false); }}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer',
                      flex: 1, padding: '9px 12px', borderRadius: 11,
                      background: 'rgba(255,255,255,0.04)',
                      border: '0.5px solid rgba(255,255,255,0.08)',
                      color: 'var(--ink-2)',
                      fontSize: 12, fontWeight: 600,
                    }}>Cancelar</button>
                  <button onClick={doDisconnect} className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer',
                      flex: 1, padding: '9px 12px', borderRadius: 11,
                      background: 'rgba(255,107,107,0.16)',
                      border: '0.5px solid rgba(255,107,107,0.40)',
                      color: '#ff8b8b',
                      fontSize: 12, fontWeight: 700,
                    }}>Sí, desconectar</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  return window.ReactDOM ? window.ReactDOM.createPortal(content, portalRoot) : content;
}


// ═══════════════════════════════════════════════════════════════════════════
// EnhancedIntegrationsTab — el componente que reemplaza al legacy
// ═══════════════════════════════════════════════════════════════════════════
function EnhancedIntegrationsTab() {
  useIAIntegrations();
  // HOOKS FIRST (post-audit Fase 3+4: evitar hook count mismatch si __mtxIAIntegrations
  // tarda en aparecer entre renders).
  var detailState = React.useState(null);
  var detailIt = detailState[0]; var setDetailIt = detailState[1];

  var handleClose = React.useCallback(function() { setDetailIt(null); }, []);
  var handleOpen = React.useCallback(function(it) { setDetailIt(it); }, []);

  if (!window.__mtxIAIntegrations) return null;

  var catalog = window.__mtxIAIntegrations.getCatalog();
  var connected = window.__mtxIAIntegrations.getConnectedCount();
  var total = catalog.length;

  return (
    <div style={{ animation: 'mtx-fade-up .25s ease both' }}>
      <IntegrationsHero connected={connected} total={total}/>
      <IntegrationsGrid catalog={catalog} onOpen={handleOpen}/>

      {detailIt && (
        <IntegrationDetailSheet
          integration={detailIt}
          onClose={handleClose}
        />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// CSS keyframes
// ═══════════════════════════════════════════════════════════════════════════
if (typeof document !== 'undefined' && !document.getElementById('mtx-ia-integrations-css')) {
  var style = document.createElement('style');
  style.id = 'mtx-ia-integrations-css';
  style.textContent = [
    '@keyframes mtxIntPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }',
  ].join('\n');
  document.head.appendChild(style);
}


// ═══════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════
Object.assign(window, {
  IntegrationsHero: IntegrationsHero,
  IntegrationCard: IntegrationCard,
  IntegrationsGrid: IntegrationsGrid,
  IntegrationDetailSheet: IntegrationDetailSheet,
  OAuthConsentScreen: OAuthConsentScreen,
  SyncActivityLog: SyncActivityLog,
  ScopesDisplay: ScopesDisplay,
  EnhancedIntegrationsTab: EnhancedIntegrationsTab,
  useIAIntegrations: useIAIntegrations,
});
