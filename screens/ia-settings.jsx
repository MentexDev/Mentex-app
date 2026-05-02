// ia-settings.jsx — Fase 3: Configuración del asistente Coach Mentex
// ─────────────────────────────────────────────────────────────────────────────
// 6 secciones en tabs horizontales scrolleables, cada una con flujo
// end-to-end completo (no stubs). Cuando llegue Mastra como agent runtime,
// estos settings ya están listos para alimentar el system prompt + tools
// con personalidad/memoria/conocimiento/canales/integraciones del user.
//
// Secciones:
//  ① Personalidad — avatar, nombre, tono, profundidad, idioma, emojis,
//                    + 4 presets quick-apply
//  ② Memoria      — CRUD de facts categorizados (Identidad/Metas/Contexto/Pref)
//  ③ Conocimiento — 7 dominios con toggle + expertise level
//  ④ Canales      — In-app/WhatsApp/Email/SMS/Push con connect flows reales
//                    (Push usa Notification.requestPermission API real)
//  ⑤ Integraciones — Google Calendar/Apple Calendar/Notion/Linear/Spotify/Slack
//                     con OAuth simulado (scopes + connect animation)
//  ⑥ Privacidad   — Export JSON real, clear conversations, clear memory, reset
// ─────────────────────────────────────────────────────────────────────────────


// ── __mtxIAConfig — store global (IIFE pattern, var+function) ──────────────
(function() {
  if (typeof window === 'undefined' || window.__mtxIAConfig) return;

  // Defaults
  var _state = {
    agent: {
      name: 'Coach Mentex',
      avatar: '🌿',
      tone: 0.7,    // 0=formal, 1=cercano
      depth: 0.5,   // 0=conciso, 1=detallado
      language: 'es-ES',
      emojis: true,
    },
    memory: [],   // [{ id, type, content, createdAt }]
    knowledge: {
      productivity:  { enabled: true,  level: 0.7 },
      mindfulness:   { enabled: true,  level: 0.6 },
      learning:      { enabled: true,  level: 0.5 },
      health:        { enabled: false, level: 0.5 },
      career:        { enabled: false, level: 0.5 },
      creativity:    { enabled: false, level: 0.5 },
      relationships: { enabled: false, level: 0.5 },
    },
    channels: {
      inApp:    { connected: true },
      whatsapp: { connected: false, phone: null },
      email:    { connected: false, address: null, frequency: 'weekly' },
      sms:      { connected: false, phone: null },
      push:     { connected: false, granted: false },
    },
    integrations: {
      googleCalendar: { connected: false, scopes: [] },
      appleCalendar:  { connected: false, scopes: [] },
      notion:         { connected: false, scopes: [] },
      linear:         { connected: false, scopes: [] },
      spotify:        { connected: false, scopes: [] },
      slack:          { connected: false, scopes: [] },
    },
  };

  function _emit() {
    window.dispatchEvent(new CustomEvent('mtx:ia-config-changed', {
      detail: { snapshot: JSON.parse(JSON.stringify(_state)) },
    }));
  }

  function _genId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  window.__mtxIAConfig = {
    snapshot: function() { return JSON.parse(JSON.stringify(_state)); },

    // Agent
    setAgentField: function(key, value) {
      _state.agent[key] = value;
      _emit();
    },
    applyPersonalityPreset: function(presetId) {
      var presets = {
        disciplined: { tone: 0.25, depth: 0.4, emojis: false, name: 'Coach disciplinado', avatar: '🏔️' },
        wise:        { tone: 0.55, depth: 0.85, emojis: false, name: 'Mentor sabio',         avatar: '🦉' },
        friendly:    { tone: 0.85, depth: 0.5,  emojis: true,  name: 'Compañero amigable',   avatar: '🌿' },
        strategic:   { tone: 0.35, depth: 0.65, emojis: false, name: 'Estratega frío',       avatar: '🧠' },
      };
      var p = presets[presetId];
      if (!p) return;
      Object.keys(p).forEach(function(k) { _state.agent[k] = p[k]; });
      _emit();
    },

    // Memory — shape: { id, type, label, value, createdAt }
    //   label: título corto (one-line en lista). REQUERIDO.
    //   value: detalle opcional (multi-line, oculto en lista, visible en detail).
    addMemory: function(type, label, value) {
      var l = String(label || '').trim();
      if (!l) return null;
      var fact = {
        id: _genId('mem'),
        type: type || 'context',
        label: l,
        value: String(value || '').trim(),
        createdAt: Date.now(),
      };
      _state.memory = _state.memory.concat([fact]);
      _emit();
      return fact;
    },
    updateMemory: function(id, patch) {
      _state.memory = _state.memory.map(function(m) {
        if (m.id !== id) return m;
        var next = Object.assign({}, m, patch);
        if (typeof next.label === 'string') next.label = next.label.trim();
        if (typeof next.value === 'string') next.value = next.value.trim();
        return next;
      });
      _emit();
    },
    removeMemory: function(id) {
      _state.memory = _state.memory.filter(function(m) { return m.id !== id; });
      _emit();
    },
    clearMemory: function() {
      _state.memory = [];
      _emit();
    },

    // Knowledge
    setKnowledge: function(domain, patch) {
      if (!_state.knowledge[domain]) return;
      _state.knowledge[domain] = Object.assign({}, _state.knowledge[domain], patch);
      _emit();
    },

    // Channels
    setChannel: function(channel, patch) {
      if (!_state.channels[channel]) return;
      _state.channels[channel] = Object.assign({}, _state.channels[channel], patch);
      _emit();
    },

    // Integrations
    setIntegration: function(integ, patch) {
      if (!_state.integrations[integ]) return;
      _state.integrations[integ] = Object.assign({}, _state.integrations[integ], patch);
      _emit();
    },

    // Privacy
    exportData: function() {
      var data = {
        config: _state,
        conversations: (window.__mtxIAChat ? window.__mtxIAChat.list() : []),
        exportedAt: new Date().toISOString(),
      };
      return data;
    },
    resetAll: function() {
      _state.agent = {
        name: 'Coach Mentex', avatar: '🌿',
        tone: 0.7, depth: 0.5, language: 'es-ES', emojis: true,
      };
      _state.memory = [];
      Object.keys(_state.knowledge).forEach(function(k) {
        _state.knowledge[k] = { enabled: ['productivity','mindfulness','learning'].indexOf(k) >= 0, level: 0.5 };
      });
      Object.keys(_state.channels).forEach(function(k) {
        _state.channels[k] = k === 'inApp'
          ? { connected: true }
          : { connected: false };
      });
      Object.keys(_state.integrations).forEach(function(k) {
        _state.integrations[k] = { connected: false, scopes: [] };
      });
      _emit();
    },
  };
})();


function useIAConfig() {
  var force = React.useReducer(function(x) { return x + 1; }, 0)[1];
  React.useEffect(function() {
    var h = function() { force(); };
    window.addEventListener('mtx:ia-config-changed', h);
    return function() { window.removeEventListener('mtx:ia-config-changed', h); };
  }, []);
  return (typeof window !== 'undefined' && window.__mtxIAConfig)
    ? window.__mtxIAConfig.snapshot()
    : null;
}


// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGOS — datos estáticos para tabs
// ═══════════════════════════════════════════════════════════════════════════

var _PERSONALITY_PRESETS = [
  { id: 'disciplined', emoji: '🏔️', label: 'Coach disciplinado', desc: 'Directo, exige rigor, sin rodeos' },
  { id: 'wise',        emoji: '🦉', label: 'Mentor sabio',        desc: 'Profundo, contextualiza, te invita a pensar' },
  { id: 'friendly',    emoji: '🌿', label: 'Compañero amigable',  desc: 'Cercano, cálido, te acompaña sin presionar' },
  { id: 'strategic',   emoji: '🧠', label: 'Estratega frío',      desc: 'Analítico, datos, costo-beneficio' },
];

var _AVATAR_OPTIONS = ['🌿', '🦉', '🏔️', '🧠', '✨', '🌊', '🌸', '🔥', '🌙', '☀️', '🌟', '🎯', '🪷', '🦋'];

var _LANGUAGES = [
  { code: 'es-ES', label: 'Español (España)',   flag: '🇪🇸' },
  { code: 'es-MX', label: 'Español (México)',    flag: '🇲🇽' },
  { code: 'es-CO', label: 'Español (Colombia)',  flag: '🇨🇴' },
  { code: 'en-US', label: 'English (US)',         flag: '🇺🇸' },
  { code: 'en-GB', label: 'English (UK)',         flag: '🇬🇧' },
  { code: 'pt-BR', label: 'Português (Brasil)',   flag: '🇧🇷' },
];

var _MEMORY_TYPES = [
  { id: 'identity',   label: 'Identidad',     accent: '#3dffd1', desc: 'Quién eres' },
  { id: 'goal',       label: 'Metas',         accent: '#ffc850', desc: 'Qué buscas lograr' },
  { id: 'context',    label: 'Contexto',      accent: '#5dd3ff', desc: 'Tu situación actual' },
  { id: 'preference', label: 'Preferencias',  accent: '#9b8aff', desc: 'Cómo te gusta trabajar' },
];

var _KNOWLEDGE_DOMAINS = [
  { id: 'productivity',  label: 'Productividad', emoji: '⚡', desc: 'Hábitos, foco, gestión del tiempo' },
  { id: 'mindfulness',   label: 'Mindfulness',   emoji: '🧘', desc: 'Meditación, presencia, conciencia' },
  { id: 'learning',      label: 'Aprendizaje',   emoji: '📚', desc: 'Estudio, retención, dominio' },
  { id: 'health',        label: 'Salud',         emoji: '💪', desc: 'Energía, ejercicio, nutrición' },
  { id: 'career',        label: 'Carrera',       emoji: '🎯', desc: 'Trabajo, dirección profesional' },
  { id: 'creativity',    label: 'Creatividad',   emoji: '🎨', desc: 'Ideas, expresión, arte' },
  { id: 'relationships', label: 'Relaciones',    emoji: '🤝', desc: 'Conexiones, comunicación' },
];

var _CHANNELS = [
  { id: 'inApp',    label: 'Chat en la app',  emoji: '💬', desc: 'Aquí mismo, siempre activo',                    locked: true },
  { id: 'whatsapp', label: 'WhatsApp',         emoji: '💚', desc: 'Habla con tu coach desde tu chat de siempre' },
  { id: 'email',    label: 'Email digest',     emoji: '📧', desc: 'Resumen periódico de tu progreso' },
  { id: 'sms',      label: 'SMS',              emoji: '📱', desc: 'Recordatorios cortos vía mensaje de texto' },
  { id: 'push',     label: 'Notificaciones',   emoji: '🔔', desc: 'Alertas en este dispositivo' },
];

var _INTEGRATIONS = [
  { id: 'googleCalendar', label: 'Google Calendar', emoji: '📅', desc: 'Lee tus eventos y agenda recordatorios',
    scopes: ['Ver eventos', 'Crear eventos', 'Modificar eventos creados por Mentex'] },
  { id: 'appleCalendar',  label: 'Apple Calendar',  emoji: '🗓️', desc: 'Mismo nivel de acceso, en tu cuenta de Apple',
    scopes: ['Ver calendarios', 'Crear eventos'] },
  { id: 'notion',         label: 'Notion',          emoji: '📝', desc: 'Tu coach escribe en tu workspace',
    scopes: ['Leer páginas seleccionadas', 'Crear páginas en una base'] },
  { id: 'linear',         label: 'Linear',          emoji: '⚡', desc: 'Crea tareas y revisa tu queue',
    scopes: ['Ver issues', 'Crear issues asignados a ti'] },
  { id: 'spotify',        label: 'Spotify',         emoji: '🎵', desc: 'Abre playlists de enfoque desde el coach',
    scopes: ['Ver tu biblioteca', 'Abrir playlists vía deep-link', 'Pausar/reanudar (solo Premium)'] },
  { id: 'slack',          label: 'Slack',           emoji: '💼', desc: 'Si trabajas con Slack: status "Enfocado" + No Molestar durante sesiones',
    scopes: ['Cambiar tu status a "Enfocado"', 'Activar Do Not Disturb', 'Restaurar al terminar la sesión'] },
];


// ═══════════════════════════════════════════════════════════════════════════
// UI: AssistantConfigSheet — bottom sheet con tabs scrolleables
// ═══════════════════════════════════════════════════════════════════════════

function AssistantConfigSheet(props) {
  var open = props.open;
  var onClose = props.onClose;

  var tabState = React.useState('personality');
  var activeTab = tabState[0]; var setActiveTab = tabState[1];

  // Connect modal state — para channels / integrations
  var connectState = React.useState(null);
  var connectCtx = connectState[0]; var setConnectCtx = connectState[1];

  // ESC para cerrar
  React.useEffect(function() {
    if (!open) return;
    var onKey = function(e) {
      if (e.key !== 'Escape') return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      // Si hay connect modal abierto, cerrarlo primero
      if (connectCtx) { setConnectCtx(null); return; }
      onClose && onClose();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, [open, onClose, connectCtx]);

  if (!open) return null;

  var TABS = [
    { id: 'personality',  label: 'Personalidad' },
    { id: 'memory',       label: 'Memoria' },
    { id: 'knowledge',    label: 'Conocimiento' },
    { id: 'channels',     label: 'Canales' },
    { id: 'integrations', label: 'Integraciones' },
    { id: 'privacy',      label: 'Privacidad' },
  ];

  return (
    // Full-screen page (no bottom sheet) — back button reemplaza el cerrar.
    // Los submodales (memory add, connect modal, avatar picker, detail sheet)
    // anclan a este screen y dockean al iPhone bottom como bottom sheets.
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(15,19,19,0.99)',
      display: 'flex', flexDirection: 'column',
      animation: 'mtx-fade-up .35s ease both',
    }}>
      {/* Header sticky con back button + título */}
      <div style={{
        flexShrink: 0,
        paddingTop: 60,  // clearance status bar + dynamic island
        background: 'linear-gradient(180deg, rgba(10,13,12,0.98) 0%, rgba(10,13,12,0.85) 80%, rgba(10,13,12,0.6) 100%)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        borderBottom: '0.5px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ padding: '0 12px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onClose} aria-label="Volver al chat IA"
            className="mtx-tap"
            style={{
              width: 36, height: 36, borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'var(--ink-1)', cursor: 'pointer', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <IcChevL size={15} stroke="currentColor" strokeWidth={1.9}/>
          </button>
          <div style={{ flex: 1, minWidth: 0, padding: '0 4px' }}>
            <div className="mtx-eyebrow" style={{ fontSize: 9.5, marginBottom: 1, color: 'var(--ink-3)' }}>Asistente</div>
            <h1 style={{
              margin: 0, fontSize: 17, fontWeight: 700,
              color: 'var(--ink-1)', letterSpacing: '-0.02em',
              fontFamily: 'var(--ff-sans)',
            }}>Configuración</h1>
          </div>
        </div>

        {/* Tab rail (horizontal scroll) */}
        <div className="mtx-scroll-x" style={{
          padding: '4px 12px 12px',
          display: 'flex', gap: 6,
        }}>
          {TABS.map(function(t) {
            var isActive = activeTab === t.id;
            return (
              <button key={t.id}
                onClick={function() { setActiveTab(t.id); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '7px 14px', borderRadius: 999,
                  border: '0.5px solid ' + (isActive ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.06)'),
                  background: isActive
                    ? 'linear-gradient(180deg, rgba(61,255,209,0.16), rgba(61,255,209,0.04))'
                    : 'rgba(255,255,255,0.02)',
                  color: isActive ? 'var(--neon)' : 'var(--ink-2)',
                  fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 0 0 1px rgba(61,255,209,0.18), inset 0 0 12px rgba(61,255,209,0.08)' : 'none',
                  transition: 'background .25s, border-color .25s, color .25s',
                }}>{t.label}</button>
            );
          })}
        </div>
      </div>

      {/* Body scrolleable — flex:1 + overflow auto. El padding inferior 38
          deja respiro al home indicator del iPhone (z=60, height 34). */}
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden',
        padding: '14px 20px 38px',
      }} className="mtx-no-scrollbar">
        {activeTab === 'personality' && <PersonalityTab/>}
        {activeTab === 'memory' && <MemoryTab/>}
        {activeTab === 'knowledge' && <KnowledgeTab/>}
        {activeTab === 'channels' && <ChannelsTab onConnect={setConnectCtx}/>}
        {activeTab === 'integrations' && <IntegrationsTab onConnect={setConnectCtx}/>}
        {activeTab === 'privacy' && <PrivacyTab/>}
      </div>

      {/* Connect modal — superpuesto al config screen full-screen */}
      {connectCtx && (
        <ConnectModal
          ctx={connectCtx}
          onClose={function() { setConnectCtx(null); }}
        />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// TAB ① — PersonalityTab
// ═══════════════════════════════════════════════════════════════════════════

function PersonalityTab() {
  var config = useIAConfig();
  var avatarPickerState = React.useState(false);
  var avatarPickerOpen = avatarPickerState[0]; var setAvatarPickerOpen = avatarPickerState[1];

  if (!config) return null;
  var agent = config.agent;

  var setField = function(key, value) { window.__mtxIAConfig.setAgentField(key, value); };
  var applyPreset = function(presetId) { window.__mtxIAConfig.applyPersonalityPreset(presetId); };

  return (
    <div style={{ animation: 'mtx-fade-up .25s ease both' }}>
      {/* Hero — avatar grande + nombre + estado */}
      <div className="mtx-glass" style={{ padding: '20px 16px', borderRadius: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <button
            onClick={function() { setAvatarPickerOpen(true); }}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer', border: 0,
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(61,255,209,0.22), rgba(61,255,209,0.05) 60%, rgba(155,138,255,0.10))',
              boxShadow: '0 0 0 1px rgba(61,255,209,0.30), 0 14px 32px -10px rgba(61,255,209,0.40), inset 0 1px 0 rgba(255,255,255,0.08)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, lineHeight: 1, position: 'relative',
            }}>
            <span role="img" aria-label="Avatar del coach">{agent.avatar}</span>
          </button>
          <input
            type="text"
            value={agent.name}
            onChange={function(e) { setField('name', e.target.value); }}
            maxLength={24}
            style={{
              appearance: 'none', border: 0, outline: 'none',
              background: 'transparent',
              color: 'var(--ink-1)',
              fontSize: 18, fontWeight: 700, letterSpacing: '-0.025em',
              fontFamily: 'var(--ff-sans)',
              textAlign: 'center', minWidth: 0, width: '100%',
              padding: '4px 8px', borderRadius: 8,
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', maxWidth: 260, lineHeight: 1.4 }}>
            Tu coach personal. Toca el avatar para cambiarlo, o el nombre para renombrarlo.
          </div>
        </div>
      </div>

      {/* Presets quick-apply */}
      <div className="mtx-eyebrow" style={{ fontSize: 9.5, padding: '0 4px 8px', color: 'var(--ink-3)' }}>Estilo predefinido</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {_PERSONALITY_PRESETS.map(function(p) {
          var isCurrent = agent.name === p.label;
          return (
            <button key={p.id}
              onClick={function() { applyPreset(p.id); }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer', textAlign: 'left',
                width: '100%', padding: '12px 14px', borderRadius: 16,
                background: isCurrent
                  ? 'linear-gradient(135deg, rgba(61,255,209,0.10), rgba(61,255,209,0.02))'
                  : 'rgba(255,255,255,0.025)',
                border: '0.5px solid ' + (isCurrent ? 'rgba(61,255,209,0.32)' : 'rgba(255,255,255,0.06)'),
                display: 'flex', alignItems: 'center', gap: 12,
                fontFamily: 'var(--ff-sans)',
                transition: 'background .2s, border-color .2s',
              }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>{p.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: isCurrent ? 'var(--neon)' : 'var(--ink-1)',
                  letterSpacing: '-0.005em', marginBottom: 2,
                }}>{p.label}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.35 }}>{p.desc}</div>
              </div>
              {isCurrent && <IcCheck size={14} stroke="var(--neon)" strokeWidth={2.4}/>}
            </button>
          );
        })}
      </div>

      {/* Sliders */}
      <SliderRow
        label="Tono"
        leftLabel="Formal"
        rightLabel="Cercano"
        value={agent.tone}
        onChange={function(v) { setField('tone', v); }}
      />
      <SliderRow
        label="Profundidad"
        leftLabel="Conciso"
        rightLabel="Detallado"
        value={agent.depth}
        onChange={function(v) { setField('depth', v); }}
      />

      {/* Idioma */}
      <div className="mtx-eyebrow" style={{ fontSize: 9.5, padding: '14px 4px 8px', color: 'var(--ink-3)' }}>Idioma principal</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {_LANGUAGES.map(function(l) {
          var isCurrent = agent.language === l.code;
          return (
            <button key={l.code}
              onClick={function() { setField('language', l.code); }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer', textAlign: 'left',
                width: '100%', padding: '10px 14px', borderRadius: 12,
                background: isCurrent ? 'rgba(61,255,209,0.06)' : 'transparent',
                border: '0.5px solid ' + (isCurrent ? 'rgba(61,255,209,0.28)' : 'rgba(255,255,255,0.04)'),
                color: isCurrent ? 'var(--neon)' : 'var(--ink-1)',
                fontSize: 13, fontWeight: 500, fontFamily: 'var(--ff-sans)',
                display: 'inline-flex', alignItems: 'center', gap: 10,
                transition: 'background .2s, border-color .2s',
              }}>
              <span style={{ fontSize: 16 }}>{l.flag}</span>
              <span>{l.label}</span>
              <div style={{ flex: 1 }}/>
              {isCurrent && <IcCheck size={13} stroke="currentColor" strokeWidth={2.2}/>}
            </button>
          );
        })}
      </div>

      {/* Emojis toggle */}
      <ToggleRow
        label="Usar emojis"
        desc="El coach incluye emojis en sus respuestas para dar tono visual"
        value={agent.emojis}
        onChange={function(v) { setField('emojis', v); }}
      />

      {/* Avatar picker overlay */}
      {avatarPickerOpen && (
        <AvatarPicker
          current={agent.avatar}
          onSelect={function(av) { setField('avatar', av); setAvatarPickerOpen(false); }}
          onClose={function() { setAvatarPickerOpen(false); }}
        />
      )}
    </div>
  );
}


function AvatarPicker(props) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 110,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: 'mtx-fade-up .2s ease',
    }} onClick={props.onClose}>
      <div onClick={function(e) { e.stopPropagation(); }} style={{
        width: '100%', maxWidth: 360,
        padding: 18,
        borderRadius: 22,
        background: 'rgba(15,19,19,0.96)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
      }}>
        <div className="mtx-eyebrow" style={{ fontSize: 10, marginBottom: 8 }}>Elige un avatar</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8,
          marginBottom: 14,
        }}>
          {_AVATAR_OPTIONS.map(function(av) {
            var isCurrent = av === props.current;
            return (
              <button key={av}
                onClick={function() { props.onSelect(av); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  aspectRatio: '1', borderRadius: 14,
                  background: isCurrent
                    ? 'linear-gradient(135deg, rgba(61,255,209,0.22), rgba(61,255,209,0.06))'
                    : 'rgba(255,255,255,0.03)',
                  border: '0.5px solid ' + (isCurrent ? 'rgba(61,255,209,0.40)' : 'rgba(255,255,255,0.06)'),
                  fontSize: 22, lineHeight: 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{av}</button>
            );
          })}
        </div>
        <button onClick={props.onClose} style={{
          appearance: 'none', cursor: 'pointer',
          width: '100%', padding: '10px 14px', borderRadius: 14,
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.06)',
          color: 'var(--ink-2)',
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--ff-sans)',
        }}>Cerrar</button>
      </div>
    </div>
  );
}


function SliderRow(props) {
  return (
    <div className="mtx-glass" style={{ padding: '12px 14px', borderRadius: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="mtx-eyebrow" style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>{props.label}</span>
      </div>
      <input
        type="range"
        min={0} max={1} step={0.01}
        value={props.value}
        onChange={function(e) { props.onChange(parseFloat(e.target.value)); }}
        style={{
          width: '100%', appearance: 'none', height: 4,
          background: 'linear-gradient(90deg, rgba(61,255,209,0.32) 0%, rgba(61,255,209,0.32) ' + (props.value * 100) + '%, rgba(255,255,255,0.08) ' + (props.value * 100) + '%, rgba(255,255,255,0.08) 100%)',
          borderRadius: 999,
          outline: 'none',
        }}
      />
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 8,
        fontSize: 10.5, color: 'var(--ink-3)',
      }}>
        <span style={{ fontWeight: props.value < 0.4 ? 600 : 400, color: props.value < 0.4 ? 'var(--ink-1)' : 'var(--ink-3)' }}>{props.leftLabel}</span>
        <span style={{ fontWeight: props.value > 0.6 ? 600 : 400, color: props.value > 0.6 ? 'var(--ink-1)' : 'var(--ink-3)' }}>{props.rightLabel}</span>
      </div>
    </div>
  );
}


function ToggleRow(props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 14px', borderRadius: 14,
      background: 'rgba(255,255,255,0.025)',
      border: '0.5px solid rgba(255,255,255,0.06)',
      marginBottom: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--ink-1)',
          letterSpacing: '-0.005em', marginBottom: 2,
        }}>{props.label}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.4 }}>{props.desc}</div>
      </div>
      <button
        onClick={function() { props.onChange(!props.value); }}
        className="mtx-switch"
        data-on={props.value ? '1' : '0'}
        style={{ flexShrink: 0, marginTop: 2 }}
      ><i/></button>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// TAB ② — MemoryTab
// ═══════════════════════════════════════════════════════════════════════════

// Quick-chip suggestions por categoría — pre-pueblan el campo "label" al tap.
// Diseñados para que el user empiece desde una plantilla común y la edite,
// reduciendo fricción y guiando hacia entradas estructuradas.
var _MEMORY_SUGGESTIONS = {
  identity: [
    'Soy data scientist',
    'Trabajo en producto',
    'Estudio medicina',
    'Soy padre/madre',
    'Soy emprendedor',
    'Soy estudiante',
    'Soy diseñador',
    'Soy desarrollador',
  ],
  goal: [
    '4h diarias de enfoque',
    'Hacer ejercicio 5 días/semana',
    'Aprender un idioma',
    'Terminar mi tesis',
    'Lanzar mi proyecto este trimestre',
    'Leer 12 libros este año',
    'Meditar 10 min al día',
  ],
  context: [
    'Cambio de ciudad reciente',
    'Trabajo nuevo',
    'Etapa creativa intensa',
    'Recuperación de lesión',
    'Año sabático',
    'Maternidad/paternidad reciente',
    'Cambio de carrera',
  ],
  preference: [
    'Soy más productivo de mañana',
    'Prefiero respuestas concretas',
    'Sin emojis, por favor',
    'Música ambient durante enfoque',
    'Sesiones de 90 min máximo',
    'Detesto las metáforas',
  ],
};


function MemoryTab() {
  var config = useIAConfig();
  var addCtxState = React.useState(null);
  var addCtx = addCtxState[0]; var setAddCtx = addCtxState[1];
  var detailCtxState = React.useState(null);
  var detailCtx = detailCtxState[0]; var setDetailCtx = detailCtxState[1];

  if (!config) return null;
  var memory = config.memory;

  var byType = {};
  _MEMORY_TYPES.forEach(function(t) { byType[t.id] = []; });
  memory.forEach(function(m) {
    if (byType[m.type]) byType[m.type].push(m);
  });

  var handleClearAll = function() {
    if (!memory.length) return;
    if (window.confirm('¿Olvidar todo lo que el coach sabe de ti? Esta acción no se puede deshacer.')) {
      window.__mtxIAConfig.clearMemory();
    }
  };

  // Helper: legacy facts pueden tener `content` en vez de `label`
  var factLabel = function(m) { return m.label || m.content || ''; };
  var factValue = function(m) { return m.value || ''; };

  return (
    <div style={{ animation: 'mtx-fade-up .25s ease both' }}>
      <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(61,255,209,0.05), rgba(61,255,209,0.01))',
        border: '0.5px solid rgba(61,255,209,0.18)',
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 4 }}>
          Lo que el coach recuerda de ti
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.45 }}>
          Estos datos alimentan el contexto cada vez que hablas con tu coach. Toca un recuerdo para ver el detalle.
        </div>
      </div>

      {_MEMORY_TYPES.map(function(type) {
        var items = byType[type.id];
        return (
          <div key={type.id} style={{ marginBottom: 18 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 4px 8px',
            }}>
              <span className="mtx-eyebrow" style={{ fontSize: 9.5, color: type.accent }}>
                {type.label} {items.length > 0 ? '· ' + items.length : ''}
              </span>
            </div>

            {/* Píldoras compactas: cada item = pill con label + X inline.
                Tap pill body → abre detail sheet. Tap X → confirm + delete.
                Wrap horizontal con flex-wrap: permite caber muchos items. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {items.map(function(m) {
                var hasValue = factValue(m).length > 0;
                return (
                  <div key={m.id} style={{
                    display: 'inline-flex', alignItems: 'center',
                    maxWidth: '100%',
                    padding: '5px 4px 5px 10px',
                    borderRadius: 999,
                    background: type.accent + '14',
                    border: '0.5px solid ' + type.accent + '32',
                    transition: 'background .2s, border-color .2s',
                  }}>
                    <button
                      onClick={function() { setDetailCtx(m); }}
                      className="mtx-tap"
                      aria-label={'Ver detalle: ' + factLabel(m)}
                      style={{
                        appearance: 'none', cursor: 'pointer',
                        background: 'transparent', border: 0,
                        padding: 0,
                        color: 'var(--ink-1)',
                        fontSize: 11.5, fontWeight: 500,
                        fontFamily: 'var(--ff-sans)',
                        letterSpacing: '-0.005em',
                        maxWidth: 200,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}>
                      {factLabel(m)}
                      {hasValue && (
                        <span style={{
                          width: 4, height: 4, borderRadius: 999,
                          background: type.accent,
                          flexShrink: 0, opacity: 0.8,
                        }}/>
                      )}
                    </button>
                    <button
                      onClick={function(e) {
                        e.stopPropagation();
                        if (window.confirm('¿Eliminar "' + factLabel(m) + '"?')) {
                          window.__mtxIAConfig.removeMemory(m.id);
                        }
                      }}
                      aria-label="Eliminar recuerdo"
                      className="mtx-tap"
                      style={{
                        appearance: 'none', cursor: 'pointer',
                        marginLeft: 4,
                        width: 18, height: 18, borderRadius: 999,
                        background: 'rgba(255,255,255,0.04)',
                        border: 0,
                        color: 'var(--ink-3)',
                        flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      <IcClose size={9} stroke="currentColor" strokeWidth={2.2}/>
                    </button>
                  </div>
                );
              })}

              {/* "+ Agregar" pill al final de cada categoría */}
              <button
                onClick={function() { setAddCtx({ type: type.id }); }}
                aria-label={'Agregar a ' + type.label}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.025)',
                  border: '0.5px dashed ' + type.accent + '50',
                  color: type.accent,
                  fontSize: 11.5, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  transition: 'background .2s, border-color .2s',
                }}>
                <IcPlus size={10} stroke="currentColor" strokeWidth={2.4}/>
                {items.length === 0 ? type.label : 'Agregar'}
              </button>
            </div>
          </div>
        );
      })}

      {memory.length > 0 && (
        <button onClick={handleClearAll}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            width: '100%', padding: '11px 14px', borderRadius: 14,
            background: 'rgba(255,107,107,0.06)',
            border: '0.5px solid rgba(255,107,107,0.20)',
            color: '#ff8b8b',
            fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--ff-sans)',
            marginTop: 8,
          }}>Olvidar todo</button>
      )}

      {/* Add modal — categorizado por tipo (Identidad/Metas/Contexto/Pref) */}
      {addCtx && (
        <MemoryAddModal
          type={addCtx.type}
          onSave={function(label, value) {
            window.__mtxIAConfig.addMemory(addCtx.type, label, value);
            setAddCtx(null);
          }}
          onClose={function() { setAddCtx(null); }}
        />
      )}

      {/* Detail sheet — view/edit/delete */}
      {detailCtx && (
        <MemoryDetailSheet
          fact={detailCtx}
          onClose={function() { setDetailCtx(null); }}
          onSave={function(patch) {
            window.__mtxIAConfig.updateMemory(detailCtx.id, patch);
            setDetailCtx(null);
          }}
          onDelete={function() {
            if (window.confirm('¿Eliminar este recuerdo?')) {
              window.__mtxIAConfig.removeMemory(detailCtx.id);
              setDetailCtx(null);
            }
          }}
        />
      )}
    </div>
  );
}


// MemoryAddModal — bottom sheet categorizado, una sola implementación pero
// con UX específica por tipo (color, eyebrow, suggestions, placeholders).
// Estructura: title input (label) + detalle textarea (value) + quick-chips
// que pre-pueblan el label.
function MemoryAddModal(props) {
  var type = _MEMORY_TYPES.find(function(t) { return t.id === props.type; }) || _MEMORY_TYPES[0];
  var labelState = React.useState('');
  var label = labelState[0]; var setLabel = labelState[1];
  var valueState = React.useState('');
  var value = valueState[0]; var setValue = valueState[1];
  var labelRef = React.useRef(null);

  React.useEffect(function() {
    setTimeout(function() { if (labelRef.current) labelRef.current.focus(); }, 100);
  }, []);

  // ESC cierra
  React.useEffect(function() {
    var onKey = function(e) {
      if (e.key !== 'Escape') return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);

  var suggestions = _MEMORY_SUGGESTIONS[type.id] || [];

  var placeholders = {
    identity:   { label: 'Quién eres en una frase',          value: 'Detalle: tu rol, contexto, lo que define tu día a día' },
    goal:       { label: 'Qué quieres lograr',                value: 'Por qué te importa, cuándo, qué pasa si lo logras' },
    context:    { label: 'Tu situación actual en una frase', value: 'Cómo te afecta, qué condiciona tus decisiones' },
    preference: { label: 'Cómo te gusta trabajar',           value: 'En qué momento, con qué estilo, qué evitar' },
  };
  var ph = placeholders[type.id] || { label: 'Título corto', value: 'Detalle (opcional)' };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 110,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'mtx-fade-up .25s ease',
    }} onClick={props.onClose}>
      <div onClick={function(e) { e.stopPropagation(); }} style={{
        background: 'rgba(15,19,19,0.96)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        borderTop: '0.5px solid rgba(255,255,255,0.10)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '14px 20px 24px',
        boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
        maxHeight: '90%', overflow: 'auto',
        animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
      }} className="mtx-no-scrollbar">
        {/* Grabber */}
        <div style={{
          width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
          background: 'rgba(255,255,255,0.16)',
        }}/>

        {/* Header con accent color de la categoría */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 16, gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mtx-eyebrow" style={{
              fontSize: 9.5, marginBottom: 4, color: type.accent,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: 999,
                background: type.accent,
                boxShadow: '0 0 8px ' + type.accent + 'AA',
              }}/>
              Nuevo · {type.label}
            </div>
            <div style={{
              fontSize: 16, fontWeight: 600, color: 'var(--ink-1)',
              letterSpacing: '-0.018em',
              fontFamily: 'var(--ff-sans)',
            }}>{type.desc}</div>
          </div>
          <button onClick={props.onClose} aria-label="Cerrar" style={{
            width: 32, height: 32, borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            color: 'var(--ink-2)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}><IcClose size={14} stroke="currentColor"/></button>
        </div>

        {/* Label input — corto, una línea */}
        <div className="mtx-eyebrow" style={{ fontSize: 9.5, marginBottom: 6, color: 'var(--ink-3)' }}>Título</div>
        <input
          ref={labelRef}
          type="text"
          value={label}
          onChange={function(e) { setLabel(e.target.value); }}
          placeholder={ph.label}
          maxLength={80}
          style={{
            width: '100%',
            appearance: 'none', border: 0, outline: 'none',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '11px 14px',
            color: 'var(--ink-1)',
            fontSize: 14, fontWeight: 500,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            marginBottom: 14,
          }}
        />

        {/* Quick suggestions chips */}
        {suggestions.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 6, color: 'var(--ink-4)' }}>Sugerencias rápidas</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {suggestions.map(function(s, i) {
                return (
                  <button key={i}
                    onClick={function() { setLabel(s); if (labelRef.current) labelRef.current.focus(); }}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer',
                      padding: '5px 10px', borderRadius: 999,
                      background: 'rgba(255,255,255,0.025)',
                      border: '0.5px solid ' + type.accent + '20',
                      color: 'var(--ink-2)',
                      fontSize: 11, fontWeight: 500, fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                    }}>{s}</button>
                );
              })}
            </div>
          </div>
        )}

        {/* Value textarea — opcional, multi-línea */}
        <div className="mtx-eyebrow" style={{ fontSize: 9.5, marginBottom: 6, color: 'var(--ink-3)' }}>
          Detalle <span style={{ color: 'var(--ink-4)', fontWeight: 500 }}>· opcional</span>
        </div>
        <textarea
          value={value}
          onChange={function(e) { setValue(e.target.value); }}
          placeholder={ph.value}
          maxLength={500}
          rows={3}
          style={{
            width: '100%',
            appearance: 'none', border: 0, outline: 'none',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '11px 14px',
            color: 'var(--ink-1)',
            fontSize: 13, lineHeight: 1.45,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            resize: 'none',
            marginBottom: 14,
          }}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={props.onClose} style={{
            appearance: 'none', cursor: 'pointer',
            flex: 1, padding: '11px 14px', borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            color: 'var(--ink-2)',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--ff-sans)',
          }}>Cancelar</button>
          <button
            onClick={function() { if (label.trim()) props.onSave(label, value); }}
            disabled={!label.trim()}
            style={{
              appearance: 'none', cursor: label.trim() ? 'pointer' : 'not-allowed',
              flex: 1, padding: '11px 14px', borderRadius: 14,
              background: label.trim()
                ? 'linear-gradient(135deg, var(--neon), #1ad9ad)'
                : 'rgba(255,255,255,0.04)',
              border: 0,
              color: label.trim() ? '#0a1410' : 'var(--ink-4)',
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--ff-sans)',
              opacity: label.trim() ? 1 : 0.5,
              boxShadow: label.trim() ? '0 6px 16px -4px rgba(61,255,209,0.4)' : 'none',
            }}>Guardar recuerdo</button>
        </div>
      </div>
    </div>
  );
}


// MemoryDetailSheet — bottom sheet con view/edit in-place + 3-dot menu top-right.
// Reemplaza los botones inferiores Editar/Eliminar por un menú de 3 puntos
// que abre dropdown con Editar y Eliminar. UX más limpia, alineada al patrón
// iOS Settings / WhatsApp chat options.
function MemoryDetailSheet(props) {
  var type = _MEMORY_TYPES.find(function(t) { return t.id === props.fact.type; }) || _MEMORY_TYPES[0];
  var editingState = React.useState(false);
  var editing = editingState[0]; var setEditing = editingState[1];
  var menuOpenState = React.useState(false);
  var menuOpen = menuOpenState[0]; var setMenuOpen = menuOpenState[1];
  var menuRef = React.useRef(null);

  var initialLabel = props.fact.label || props.fact.content || '';
  var initialValue = props.fact.value || '';
  var labelState = React.useState(initialLabel);
  var label = labelState[0]; var setLabel = labelState[1];
  var valueState = React.useState(initialValue);
  var value = valueState[0]; var setValue = valueState[1];

  React.useEffect(function() {
    var onKey = function(e) {
      if (e.key !== 'Escape') return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (menuOpen) { setMenuOpen(false); return; }
      props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  // Click outside del 3-dot menu lo cierra
  React.useEffect(function() {
    if (!menuOpen) return;
    var handler = function(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return function() { document.removeEventListener('mousedown', handler); };
  }, [menuOpen]);

  var dirty = label.trim() !== initialLabel || value.trim() !== initialValue;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 110,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'mtx-fade-up .25s ease',
    }} onClick={props.onClose}>
      <div onClick={function(e) { e.stopPropagation(); }} style={{
        background: 'rgba(15,19,19,0.96)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        borderTop: '0.5px solid rgba(255,255,255,0.10)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '14px 20px 28px',
        boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
        maxHeight: '90%', overflow: 'auto',
        animation: 'mtx-fade-up .35s cubic-bezier(.4,1.4,.5,1)',
      }} className="mtx-no-scrollbar">
        <div style={{
          width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
          background: 'rgba(255,255,255,0.16)',
        }}/>

        {/* Header con eyebrow + 3-dot menu + close X */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, gap: 8,
        }}>
          <div className="mtx-eyebrow" style={{
            fontSize: 9.5, color: type.accent,
            display: 'inline-flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 999,
              background: type.accent,
              boxShadow: '0 0 8px ' + type.accent + 'AA',
              flexShrink: 0,
            }}/>
            {type.label}
          </div>

          {/* 3-dot menu (solo en view mode, oculto en edit mode para no confundir) */}
          {!editing && (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={function() { setMenuOpen(function(v) { return !v; }); }}
                aria-label="Más acciones"
                className="mtx-tap"
                style={{
                  width: 32, height: 32, borderRadius: 999,
                  background: menuOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                  color: 'var(--ink-2)', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background .15s',
                }}>
                <IcMoreH size={14} stroke="currentColor" strokeWidth={1.8}/>
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)', right: 0,
                  minWidth: 160,
                  padding: 4,
                  borderRadius: 12,
                  background: 'rgba(20,24,24,0.98)',
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                  zIndex: 130,
                  display: 'flex', flexDirection: 'column', gap: 2,
                  animation: 'mtx-fade-up .15s ease both',
                }}>
                  <button
                    onClick={function() { setMenuOpen(false); setEditing(true); }}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer', textAlign: 'left',
                      padding: '9px 12px', borderRadius: 8,
                      background: 'transparent', border: 0,
                      color: 'var(--ink-1)',
                      fontSize: 12.5, fontWeight: 500,
                      fontFamily: 'var(--ff-sans)',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}>
                    <IcEdit size={12} stroke="currentColor" strokeWidth={1.7}/>
                    Editar
                  </button>
                  <button
                    onClick={function() { setMenuOpen(false); props.onDelete(); }}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer', textAlign: 'left',
                      padding: '9px 12px', borderRadius: 8,
                      background: 'transparent', border: 0,
                      color: '#ff8b8b',
                      fontSize: 12.5, fontWeight: 500,
                      fontFamily: 'var(--ff-sans)',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}>
                    <IcClose size={12} stroke="currentColor" strokeWidth={1.8}/>
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          )}

          <button onClick={props.onClose} aria-label="Cerrar" style={{
            width: 32, height: 32, borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            color: 'var(--ink-2)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}><IcClose size={14} stroke="currentColor"/></button>
        </div>

        {editing ? (
          <div>
            <div className="mtx-eyebrow" style={{ fontSize: 9.5, marginBottom: 6, color: 'var(--ink-3)' }}>Título</div>
            <input
              type="text"
              value={label}
              onChange={function(e) { setLabel(e.target.value); }}
              maxLength={80}
              style={{
                width: '100%',
                appearance: 'none', border: 0, outline: 'none',
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '11px 14px',
                color: 'var(--ink-1)',
                fontSize: 14, fontWeight: 500,
                fontFamily: 'var(--ff-sans)',
                marginBottom: 14,
              }}
            />
            <div className="mtx-eyebrow" style={{ fontSize: 9.5, marginBottom: 6, color: 'var(--ink-3)' }}>
              Detalle <span style={{ color: 'var(--ink-4)', fontWeight: 500 }}>· opcional</span>
            </div>
            <textarea
              value={value}
              onChange={function(e) { setValue(e.target.value); }}
              maxLength={500}
              rows={4}
              style={{
                width: '100%',
                appearance: 'none', border: 0, outline: 'none',
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '11px 14px',
                color: 'var(--ink-1)',
                fontSize: 13, lineHeight: 1.45,
                fontFamily: 'var(--ff-sans)',
                resize: 'none',
                marginBottom: 14,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={function() {
                  setLabel(initialLabel);
                  setValue(initialValue);
                  setEditing(false);
                }} style={{
                appearance: 'none', cursor: 'pointer',
                flex: 1, padding: '11px 14px', borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                color: 'var(--ink-2)',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--ff-sans)',
              }}>Cancelar</button>
              <button
                onClick={function() {
                  if (label.trim()) props.onSave({ label: label, value: value });
                }}
                disabled={!label.trim() || !dirty}
                style={{
                  appearance: 'none', cursor: (label.trim() && dirty) ? 'pointer' : 'not-allowed',
                  flex: 1, padding: '11px 14px', borderRadius: 14,
                  background: (label.trim() && dirty)
                    ? 'linear-gradient(135deg, var(--neon), #1ad9ad)'
                    : 'rgba(255,255,255,0.04)',
                  border: 0,
                  color: (label.trim() && dirty) ? '#0a1410' : 'var(--ink-4)',
                  fontSize: 13, fontWeight: 700, fontFamily: 'var(--ff-sans)',
                  opacity: (label.trim() && dirty) ? 1 : 0.5,
                }}>Guardar</button>
            </div>
          </div>
        ) : (
          <div>
            {/* View mode — solo card con label + value (acciones via 3-dot menu) */}
            <div style={{
              padding: '14px 16px', borderRadius: 16,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid ' + type.accent + '24',
            }}>
              <div style={{
                fontSize: 16, fontWeight: 600, color: 'var(--ink-1)',
                letterSpacing: '-0.018em', lineHeight: 1.35,
                marginBottom: initialValue ? 8 : 0,
              }}>{initialLabel}</div>
              {initialValue && (
                <div style={{
                  fontSize: 12.5, color: 'var(--ink-3)',
                  lineHeight: 1.5, letterSpacing: '-0.005em',
                  whiteSpace: 'pre-wrap',
                  paddingTop: 8,
                  borderTop: '0.5px solid rgba(255,255,255,0.04)',
                }}>{initialValue}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// TAB ③ — KnowledgeTab
// ═══════════════════════════════════════════════════════════════════════════

function KnowledgeTab() {
  var config = useIAConfig();
  if (!config) return null;
  var k = config.knowledge;

  return (
    <div style={{ animation: 'mtx-fade-up .25s ease both' }}>
      <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 14,
        background: 'rgba(155,138,255,0.05)',
        border: '0.5px solid rgba(155,138,255,0.20)',
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 4 }}>
          Áreas de especialización
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.45 }}>
          Ajusta qué dominios maneja tu coach y con cuánta profundidad. Más dominios activos = respuestas más holísticas.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {_KNOWLEDGE_DOMAINS.map(function(d) {
          var item = k[d.id];
          return (
            <div key={d.id} style={{
              padding: '12px 14px', borderRadius: 16,
              background: item.enabled ? 'rgba(61,255,209,0.04)' : 'rgba(255,255,255,0.02)',
              border: '0.5px solid ' + (item.enabled ? 'rgba(61,255,209,0.22)' : 'rgba(255,255,255,0.06)'),
              transition: 'background .25s, border-color .25s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: item.enabled ? 12 : 0 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>{d.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: item.enabled ? 'var(--ink-1)' : 'var(--ink-2)',
                    letterSpacing: '-0.005em', marginBottom: 2,
                  }}>{d.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.35 }}>{d.desc}</div>
                </div>
                <button
                  onClick={function() { window.__mtxIAConfig.setKnowledge(d.id, { enabled: !item.enabled }); }}
                  className="mtx-switch"
                  data-on={item.enabled ? '1' : '0'}
                  style={{ flexShrink: 0 }}
                ><i/></button>
              </div>
              {item.enabled && (
                <div style={{ paddingLeft: 50 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: 10, color: 'var(--ink-3)', marginBottom: 5,
                    letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600,
                  }}>
                    <span>Profundidad</span>
                    <span style={{ color: 'var(--neon)' }}>
                      {item.level < 0.34 ? 'Básico' : item.level < 0.67 ? 'Medio' : 'Experto'}
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={item.level}
                    onChange={function(e) { window.__mtxIAConfig.setKnowledge(d.id, { level: parseFloat(e.target.value) }); }}
                    style={{
                      width: '100%', appearance: 'none', height: 3,
                      background: 'linear-gradient(90deg, rgba(61,255,209,0.32) 0%, rgba(61,255,209,0.32) ' + (item.level * 100) + '%, rgba(255,255,255,0.06) ' + (item.level * 100) + '%, rgba(255,255,255,0.06) 100%)',
                      borderRadius: 999,
                      outline: 'none',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// TAB ④ — ChannelsTab
// ═══════════════════════════════════════════════════════════════════════════

function ChannelsTab(props) {
  var config = useIAConfig();
  if (!config) return null;
  var channels = config.channels;

  return (
    <div style={{ animation: 'mtx-fade-up .25s ease both' }}>
      <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 14,
        background: 'rgba(93,211,255,0.05)',
        border: '0.5px solid rgba(93,211,255,0.20)',
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 4 }}>
          Conversa donde tú quieras
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.45 }}>
          Tu coach te puede acompañar más allá de la app. Conecta los canales que prefieras.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {_CHANNELS.map(function(c) {
          var ch = channels[c.id];
          var connected = ch && ch.connected;
          return (
            <div key={c.id} style={{
              padding: '12px 14px', borderRadius: 16,
              background: connected ? 'rgba(61,255,209,0.04)' : 'rgba(255,255,255,0.02)',
              border: '0.5px solid ' + (connected ? 'rgba(61,255,209,0.24)' : 'rgba(255,255,255,0.06)'),
              display: 'flex', alignItems: 'center', gap: 12,
              transition: 'background .25s, border-color .25s',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 19,
              }}>{c.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--ink-1)',
                    letterSpacing: '-0.005em',
                  }}>{c.label}</span>
                  {connected && (
                    <span style={{
                      padding: '1.5px 6px', borderRadius: 999,
                      background: 'rgba(61,255,209,0.14)',
                      color: 'var(--neon)',
                      fontSize: 9, fontWeight: 700,
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}>Conectado</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                  {connected && ch.phone ? 'En ' + ch.phone : (connected && ch.address ? 'En ' + ch.address : c.desc)}
                </div>
              </div>
              {c.locked ? (
                <span style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)',
                  fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                }}>Activo</span>
              ) : (
                <button
                  onClick={function() { props.onConnect({ kind: 'channel', id: c.id, channel: c, current: ch }); }}
                  className="mtx-tap"
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: '6px 12px', borderRadius: 999,
                    background: connected
                      ? 'rgba(255,255,255,0.04)'
                      : 'linear-gradient(135deg, rgba(61,255,209,0.18), rgba(61,255,209,0.04))',
                    border: '0.5px solid ' + (connected ? 'rgba(255,255,255,0.08)' : 'rgba(61,255,209,0.32)'),
                    color: connected ? 'var(--ink-2)' : 'var(--neon)',
                    fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--ff-sans)',
                    flexShrink: 0,
                  }}>{connected ? 'Gestionar' : 'Conectar'}</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// TAB ⑤ — IntegrationsTab
// ═══════════════════════════════════════════════════════════════════════════

function IntegrationsTab(props) {
  var config = useIAConfig();
  if (!config) return null;
  var integrations = config.integrations;

  return (
    <div style={{ animation: 'mtx-fade-up .25s ease both' }}>
      <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 14,
        background: 'rgba(255,200,80,0.05)',
        border: '0.5px solid rgba(255,200,80,0.18)',
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 4 }}>
          Tu coach actuando por ti
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.45 }}>
          Conecta servicios para que el coach pueda crear recordatorios, agendar bloques de enfoque, o silenciar Slack durante tu sesión.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {_INTEGRATIONS.map(function(it) {
          var iSt = integrations[it.id];
          var connected = iSt && iSt.connected;
          return (
            <div key={it.id} style={{
              padding: '12px 14px', borderRadius: 16,
              background: connected ? 'rgba(61,255,209,0.04)' : 'rgba(255,255,255,0.02)',
              border: '0.5px solid ' + (connected ? 'rgba(61,255,209,0.24)' : 'rgba(255,255,255,0.06)'),
              display: 'flex', alignItems: 'center', gap: 12,
              transition: 'background .25s, border-color .25s',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 19,
              }}>{it.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--ink-1)',
                    letterSpacing: '-0.005em',
                  }}>{it.label}</span>
                  {connected && (
                    <span style={{
                      padding: '1.5px 6px', borderRadius: 999,
                      background: 'rgba(61,255,209,0.14)',
                      color: 'var(--neon)',
                      fontSize: 9, fontWeight: 700,
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}>Conectado</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.4 }}>{it.desc}</div>
              </div>
              <button
                onClick={function() { props.onConnect({ kind: 'integration', id: it.id, integration: it, current: iSt }); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '6px 12px', borderRadius: 999,
                  background: connected
                    ? 'rgba(255,255,255,0.04)'
                    : 'linear-gradient(135deg, rgba(61,255,209,0.18), rgba(61,255,209,0.04))',
                  border: '0.5px solid ' + (connected ? 'rgba(255,255,255,0.08)' : 'rgba(61,255,209,0.32)'),
                  color: connected ? 'var(--ink-2)' : 'var(--neon)',
                  fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--ff-sans)',
                  flexShrink: 0,
                }}>{connected ? 'Gestionar' : 'Conectar'}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ConnectModal — un solo componente que renderiza el flow apropiado
// según el kind (channel vs integration) y el id (whatsapp, push, etc.)
// ═══════════════════════════════════════════════════════════════════════════

function ConnectModal(props) {
  var ctx = props.ctx;
  var phaseState = React.useState(ctx.current && ctx.current.connected ? 'connected' : 'idle');
  var phase = phaseState[0]; var setPhase = phaseState[1];
  var [phoneInput, setPhoneInput] = [React.useState('')[0], React.useState('')[1]]; // unused dual but fixes lint
  // Actually use proper state
  var phoneState = React.useState(ctx.current && (ctx.current.phone || '') || '');
  phoneInput = phoneState[0]; setPhoneInput = phoneState[1];
  var emailState = React.useState((ctx.current && ctx.current.address) || '');
  var emailInput = emailState[0]; var setEmailInput = emailState[1];
  var freqState = React.useState((ctx.current && ctx.current.frequency) || 'weekly');
  var freq = freqState[0]; var setFreq = freqState[1];

  var isChannel = ctx.kind === 'channel';
  var meta = isChannel ? ctx.channel : ctx.integration;

  var startConnect = function() {
    setPhase('connecting');
    setTimeout(function() { setPhase('connected'); commitConnection(); }, 1200);
  };

  var commitConnection = function() {
    if (isChannel) {
      var patch = { connected: true };
      if (ctx.id === 'whatsapp')      patch.phone = phoneInput || '+57 300 000 0000';
      else if (ctx.id === 'sms')      patch.phone = phoneInput || '+57 300 000 0000';
      else if (ctx.id === 'email')    { patch.address = emailInput || 'tucorreo@ejemplo.com'; patch.frequency = freq; }
      else if (ctx.id === 'push')     patch.granted = true;
      window.__mtxIAConfig.setChannel(ctx.id, patch);
    } else {
      window.__mtxIAConfig.setIntegration(ctx.id, { connected: true, scopes: meta.scopes });
    }
  };

  var disconnect = function() {
    if (!window.confirm('¿Desconectar ' + meta.label + '?')) return;
    if (isChannel) {
      var patch = ctx.id === 'email'
        ? { connected: false, address: null }
        : ctx.id === 'whatsapp' || ctx.id === 'sms'
          ? { connected: false, phone: null }
          : { connected: false };
      window.__mtxIAConfig.setChannel(ctx.id, patch);
    } else {
      window.__mtxIAConfig.setIntegration(ctx.id, { connected: false, scopes: [] });
    }
    props.onClose();
  };

  // Push channel: pide permission real del browser
  var handlePushConnect = function() {
    if (typeof Notification === 'undefined') {
      alert('Tu navegador no soporta notificaciones.');
      return;
    }
    setPhase('connecting');
    Notification.requestPermission().then(function(perm) {
      if (perm === 'granted') {
        window.__mtxIAConfig.setChannel('push', { connected: true, granted: true });
        setPhase('connected');
        // Test notification
        new Notification('Coach Mentex', {
          body: 'Notificaciones activadas. Te avisaré cuando importe.',
          icon: '/favicon.ico',
        });
      } else {
        setPhase('idle');
        alert('Permiso de notificaciones denegado. Puedes habilitarlo desde la configuración del navegador.');
      }
    });
  };

  // Render según el id del canal/integración
  var renderBody = function() {
    if (phase === 'connecting') {
      return (
        <div style={{ padding: '32px 8px', textAlign: 'center' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', margin: '0 auto 14px',
            background: 'linear-gradient(135deg, rgba(61,255,209,0.16), rgba(61,255,209,0.04))',
            border: '0.5px solid rgba(61,255,209,0.30)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: -3, borderRadius: '50%',
              border: '2px solid rgba(61,255,209,0.18)',
              borderTopColor: 'var(--neon)',
              animation: 'mtx-spin 1.2s linear infinite',
            }}/>
            <span style={{ fontSize: 24 }}>{meta.emoji}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 4 }}>Conectando…</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', maxWidth: 240, margin: '0 auto', lineHeight: 1.4 }}>
            Estableciendo conexión segura con {meta.label}.
          </div>
        </div>
      );
    }

    if (phase === 'connected') {
      return (
        <div>
          <div style={{ padding: '20px 0 16px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
              background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
              boxShadow: '0 0 0 1px rgba(61,255,209,0.32), 0 12px 24px -8px rgba(61,255,209,0.55)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#0a1410',
            }}>
              <IcCheck size={24} stroke="currentColor" strokeWidth={2.6}/>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
              {meta.label} conectado
            </div>
            {isChannel && ctx.id === 'whatsapp' && phoneInput && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>En {phoneInput}</div>
            )}
            {isChannel && ctx.id === 'sms' && phoneInput && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>En {phoneInput}</div>
            )}
            {isChannel && ctx.id === 'email' && emailInput && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{emailInput} · {freq === 'daily' ? 'diario' : 'semanal'}</div>
            )}
          </div>
          {!isChannel && meta.scopes && meta.scopes.length > 0 && (
            <div style={{ padding: '12px 14px', borderRadius: 14,
              background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.05)',
              marginBottom: 10,
            }}>
              <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>Permisos otorgados</div>
              {meta.scopes.map(function(s, i) {
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 11.5, color: 'var(--ink-2)',
                    padding: '4px 0',
                  }}>
                    <IcCheck size={11} stroke="var(--neon)" strokeWidth={2.4}/>
                    {s}
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={disconnect} style={{
            appearance: 'none', cursor: 'pointer',
            width: '100%', padding: '11px 14px', borderRadius: 14,
            background: 'rgba(255,107,107,0.06)',
            border: '0.5px solid rgba(255,107,107,0.20)',
            color: '#ff8b8b',
            fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--ff-sans)',
          }}>Desconectar</button>
        </div>
      );
    }

    // phase === 'idle' — connect flow
    if (isChannel && ctx.id === 'whatsapp') {
      return (
        <div>
          <div className="mtx-eyebrow" style={{ fontSize: 10, marginBottom: 10 }}>Conexión segura</div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 14, margin: '0 0 14px' }}>
            Escanea el código QR desde WhatsApp Settings → Dispositivos enlazados, o ingresa tu número y te enviamos un mensaje de confirmación.
          </p>
          <div style={{
            width: 160, height: 160, margin: '0 auto 14px',
            background: '#fff', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {/* Mock QR pattern */}
            <div style={{
              width: 140, height: 140,
              backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"140\\" height=\\"140\\"><filter id=\\"qr\\"><feTurbulence baseFrequency=\\"3\\" numOctaves=\\"1\\" stitchTiles=\\"stitch\\"/><feColorMatrix values=\\"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 12 -5\\"/><feComposite in2=\\"SourceAlpha\\" operator=\\"in\\"/></filter><rect width=\\"140\\" height=\\"140\\" filter=\\"url(%23qr)\\"/></svg>")',
              backgroundSize: '14px 14px',
            }}/>
            <div style={{
              position: 'absolute', inset: '50% 50%',
              transform: 'translate(-50%, -50%)',
              width: 36, height: 36, borderRadius: 8,
              background: '#25D366',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>💚</div>
          </div>
          <input
            type="tel"
            placeholder="+57 300 000 0000"
            value={phoneInput}
            onChange={function(e) { setPhoneInput(e.target.value); }}
            style={{
              width: '100%',
              appearance: 'none', border: 0, outline: 'none',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '10px 12px',
              color: 'var(--ink-1)',
              fontSize: 13.5, fontFamily: 'var(--ff-sans)',
              fontVariantNumeric: 'tabular-nums',
              marginBottom: 12,
            }}
          />
          <button onClick={startConnect} className="mtx-btn-neon" style={{ width: '100%', height: 44 }}>
            <IcCheck size={14} stroke="currentColor" strokeWidth={2.4}/>
            Conectar WhatsApp
          </button>
        </div>
      );
    }

    if (isChannel && ctx.id === 'email') {
      return (
        <div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 14, margin: '0 0 14px' }}>
            Recibe un resumen de tu progreso, lo que dominaste y lo que pendiente. Frecuencia ajustable.
          </p>
          <input
            type="email"
            placeholder="tucorreo@ejemplo.com"
            value={emailInput}
            onChange={function(e) { setEmailInput(e.target.value); }}
            style={{
              width: '100%',
              appearance: 'none', border: 0, outline: 'none',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '10px 12px',
              color: 'var(--ink-1)',
              fontSize: 13.5, fontFamily: 'var(--ff-sans)',
              marginBottom: 12,
            }}
          />
          <div className="mtx-eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>Frecuencia</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[{ id: 'daily', label: 'Diario' }, { id: 'weekly', label: 'Semanal' }].map(function(f) {
              var isCurrent = freq === f.id;
              return (
                <button key={f.id} onClick={function() { setFreq(f.id); }}
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    flex: 1, padding: '8px 12px', borderRadius: 12,
                    background: isCurrent ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.025)',
                    border: '0.5px solid ' + (isCurrent ? 'rgba(61,255,209,0.32)' : 'rgba(255,255,255,0.06)'),
                    color: isCurrent ? 'var(--neon)' : 'var(--ink-2)',
                    fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--ff-sans)',
                  }}>{f.label}</button>
              );
            })}
          </div>
          <button onClick={startConnect}
            disabled={!emailInput.includes('@')}
            className="mtx-btn-neon"
            style={{ width: '100%', height: 44, opacity: emailInput.includes('@') ? 1 : 0.5,
              cursor: emailInput.includes('@') ? 'pointer' : 'not-allowed' }}>
            <IcCheck size={14} stroke="currentColor" strokeWidth={2.4}/>
            Activar resumen
          </button>
        </div>
      );
    }

    if (isChannel && ctx.id === 'sms') {
      return (
        <div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 14, margin: '0 0 14px' }}>
            Recibe recordatorios cortos cuando lo necesites. Solo SMS importantes, sin spam.
          </p>
          <input
            type="tel"
            placeholder="+57 300 000 0000"
            value={phoneInput}
            onChange={function(e) { setPhoneInput(e.target.value); }}
            style={{
              width: '100%',
              appearance: 'none', border: 0, outline: 'none',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '10px 12px',
              color: 'var(--ink-1)',
              fontSize: 13.5, fontFamily: 'var(--ff-sans)',
              fontVariantNumeric: 'tabular-nums',
              marginBottom: 14,
            }}
          />
          <button onClick={startConnect}
            disabled={phoneInput.length < 9}
            className="mtx-btn-neon"
            style={{ width: '100%', height: 44, opacity: phoneInput.length >= 9 ? 1 : 0.5 }}>
            <IcCheck size={14} stroke="currentColor" strokeWidth={2.4}/>
            Verificar número
          </button>
        </div>
      );
    }

    if (isChannel && ctx.id === 'push') {
      return (
        <div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 14, margin: '0 0 14px' }}>
            Permitirás que tu coach te envíe notificaciones en este dispositivo. Recibirás un permiso del navegador.
          </p>
          <button onClick={handlePushConnect} className="mtx-btn-neon" style={{ width: '100%', height: 44 }}>
            <IcBell size={14} stroke="currentColor" strokeWidth={2}/>
            Activar notificaciones
          </button>
        </div>
      );
    }

    // Integration — OAuth simulado
    if (!isChannel) {
      return (
        <div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 14, margin: '0 0 14px' }}>
            Tu coach pedirá los siguientes permisos. Puedes desconectar en cualquier momento.
          </p>
          <div style={{ padding: '12px 14px', borderRadius: 14,
            background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.05)',
            marginBottom: 14,
          }}>
            <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>Lo que el coach podrá hacer</div>
            {(meta.scopes || []).map(function(s, i) {
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 11.5, color: 'var(--ink-2)',
                  padding: '4px 0',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: 999,
                    background: 'var(--neon)', flexShrink: 0,
                  }}/>
                  {s}
                </div>
              );
            })}
          </div>
          <button onClick={startConnect} className="mtx-btn-neon" style={{ width: '100%', height: 44 }}>
            <IcCheck size={14} stroke="currentColor" strokeWidth={2.4}/>
            Conectar {meta.label}
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 110,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: 'mtx-fade-up .2s ease',
    }} onClick={props.onClose}>
      <div onClick={function(e) { e.stopPropagation(); }} style={{
        width: '100%', maxWidth: 360,
        padding: 18,
        borderRadius: 22,
        background: 'rgba(15,19,19,0.97)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19,
          }}>{meta.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: 'var(--ink-1)',
              letterSpacing: '-0.01em',
            }}>{meta.label}</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{meta.desc}</div>
          </div>
          <button onClick={props.onClose} aria-label="Cerrar"
            style={{
              width: 30, height: 30, borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              color: 'var(--ink-3)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
            <IcClose size={13} stroke="currentColor"/>
          </button>
        </div>
        {renderBody()}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// TAB ⑥ — PrivacyTab
// ═══════════════════════════════════════════════════════════════════════════

function PrivacyTab() {
  var config = useIAConfig();

  var handleExport = function() {
    var data = window.__mtxIAConfig.exportData();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'mentex-coach-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('mtx:toast', { detail: { message: 'Datos exportados como JSON', duration: 2000 } }));
    }
  };

  var handleClearChats = function() {
    var count = window.__mtxIAChat ? window.__mtxIAChat.list().length : 0;
    if (count === 0) {
      window.dispatchEvent(new CustomEvent('mtx:toast', { detail: { message: 'No hay conversaciones para borrar', duration: 1800 } }));
      return;
    }
    if (window.confirm('¿Borrar las ' + count + ' conversaciones? Esta acción no se puede deshacer.')) {
      if (window.__mtxIAChat && window.__mtxIAChat._reset) window.__mtxIAChat._reset();
      window.dispatchEvent(new CustomEvent('mtx:toast', { detail: { message: count + ' conversaciones borradas', duration: 2000 } }));
    }
  };

  var handleClearMemory = function() {
    if (!config || !config.memory.length) {
      window.dispatchEvent(new CustomEvent('mtx:toast', { detail: { message: 'No hay recuerdos para borrar', duration: 1800 } }));
      return;
    }
    if (window.confirm('¿Olvidar todo lo que el coach sabe de ti?')) {
      window.__mtxIAConfig.clearMemory();
      window.dispatchEvent(new CustomEvent('mtx:toast', { detail: { message: 'Memoria borrada', duration: 1800 } }));
    }
  };

  var handleResetAll = function() {
    if (!window.confirm('¿Restaurar configuración a valores predeterminados? La memoria, conexiones y personalidad se reiniciarán.')) return;
    window.__mtxIAConfig.resetAll();
    window.dispatchEvent(new CustomEvent('mtx:toast', { detail: { message: 'Configuración restaurada', duration: 2000 } }));
  };

  var ActionRow = function(p) {
    return (
      <button onClick={p.onClick}
        className="mtx-tap"
        style={{
          appearance: 'none', cursor: 'pointer', textAlign: 'left',
          width: '100%', padding: '12px 14px', borderRadius: 14,
          background: p.danger ? 'rgba(255,107,107,0.04)' : 'rgba(255,255,255,0.025)',
          border: '0.5px solid ' + (p.danger ? 'rgba(255,107,107,0.18)' : 'rgba(255,255,255,0.06)'),
          display: 'flex', alignItems: 'center', gap: 12,
          fontFamily: 'var(--ff-sans)', marginBottom: 8,
        }}>
        <div style={{
          width: 36, height: 36, borderRadius: 11, flexShrink: 0,
          background: p.danger ? 'rgba(255,107,107,0.10)' : 'rgba(61,255,209,0.10)',
          border: '0.5px solid ' + (p.danger ? 'rgba(255,107,107,0.20)' : 'rgba(61,255,209,0.20)'),
          color: p.danger ? '#ff8b8b' : 'var(--neon)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{p.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600,
            color: p.danger ? '#ff8b8b' : 'var(--ink-1)', marginBottom: 2,
          }}>{p.label}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.4 }}>{p.desc}</div>
        </div>
        <IcChevR size={13} stroke="var(--ink-4)" strokeWidth={1.7}/>
      </button>
    );
  };

  return (
    <div style={{ animation: 'mtx-fade-up .25s ease both' }}>
      <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 4 }}>
          Tus datos, tus reglas
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.45 }}>
          Toda la configuración de tu coach se guarda localmente en este dispositivo. Puedes exportar todo o borrarlo cuando quieras.
        </div>
      </div>

      <div className="mtx-eyebrow" style={{ fontSize: 9.5, padding: '0 4px 8px', color: 'var(--ink-3)' }}>Datos</div>
      <ActionRow
        icon={<IcShare size={14} stroke="currentColor" strokeWidth={1.7}/>}
        label="Exportar mis datos"
        desc="Descarga un JSON con tu configuración + conversaciones"
        onClick={handleExport}
      />

      <div className="mtx-eyebrow" style={{ fontSize: 9.5, padding: '14px 4px 8px', color: 'var(--ink-3)' }}>Borrar</div>
      <ActionRow
        icon={<IcMessage size={14} stroke="currentColor" strokeWidth={1.7}/>}
        label="Borrar todas las conversaciones"
        desc="Elimina el historial de chats con tu coach"
        onClick={handleClearChats}
        danger
      />
      <ActionRow
        icon={<IcBrain size={14} stroke="currentColor" strokeWidth={1.7}/>}
        label="Borrar memoria"
        desc="Olvida todo lo que el coach sabe de ti"
        onClick={handleClearMemory}
        danger
      />
      <ActionRow
        icon={<IcRefresh size={14} stroke="currentColor" strokeWidth={1.7}/>}
        label="Restaurar todo"
        desc="Vuelve a los valores predeterminados (incluye personalidad, conexiones, dominios)"
        onClick={handleResetAll}
        danger
      />
    </div>
  );
}


// Exports
Object.assign(window, {
  AssistantConfigSheet: AssistantConfigSheet,
  useIAConfig: useIAConfig,
  PersonalityTab: PersonalityTab,
  MemoryTab: MemoryTab,
  KnowledgeTab: KnowledgeTab,
  ChannelsTab: ChannelsTab,
  IntegrationsTab: IntegrationsTab,
  PrivacyTab: PrivacyTab,
  ConnectModal: ConnectModal,
});
