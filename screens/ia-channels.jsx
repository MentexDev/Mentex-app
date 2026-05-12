/* eslint-disable */
// ═══════════════════════════════════════════════════════════════════════════
// IA Channels — Fase 3 Multi-canal
// ═══════════════════════════════════════════════════════════════════════════
//
// Tu coach acompañándote más allá de la app: WhatsApp · Telegram · Apple Watch
// · Email digest · SMS · Voice (HomePod/Alexa/Google Home) · Push browser.
//
// Decisiones arquitectónicas:
// • NO duplicar __mtxIAConfig.channels — extender ahí los 3 canales nuevos
//   (telegram, watch, voice) vía IIFE idempotente. Toda la persistencia ya está.
// • Catálogo (`_CHANNELS_CATALOG`) vive aquí; metadata extra (kind/group/scopes)
//   por canal.
// • UI nueva: grid 2-col con cards single-button + sheet per-channel con sub-
//   flows propios (QR · deep link · steps · device picker · digest preview).
// • Aplicar checklist del audit Fase IA-2: role=dialog + aria-modal, ESC con
//   guard canonical (SELECT + isContentEditable + IME), body scroll lock,
//   backdrop drag-release safe-close, role=button único por card, immutable
//   updates, useToast con hook count estable, sin window.confirm.
// • Cuando entre Mastra: cada flow connect llamará al endpoint que verifica el
//   canal y devuelve un session token. Por ahora todo es mock with realistic
//   loading states.

(function() {
  if (typeof window === 'undefined') return;

  // ── Catálogo de canales ─────────────────────────────────────────────────
  // kind: 'chat' | 'reminder' | 'voice' | 'wearable' | 'push'
  // group: 'always' | 'chat' | 'reminders' | 'ambient'
  // accent: color de la categoría para gradients/badges
  // alwaysOn: no se puede desconectar (chat in-app)
  // premiumOnly: requiere Premium para conectar
  var CATALOG = [
    {
      id: 'inApp',
      label: 'Chat en la app',
      emoji: '💬',
      kind: 'chat',
      group: 'always',
      accent: 'var(--neon)',
      alwaysOn: true,
      blurb: 'Aquí mismo, siempre activo',
      flowDesc: 'Tu coach vive en la app. No requiere conexión externa.',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      emoji: '💚',
      kind: 'chat',
      group: 'chat',
      accent: '#25d366',
      blurb: 'Habla con tu coach desde tu chat de siempre',
      flowDesc: 'Escanea el QR para vincular tu coach a tu número de WhatsApp.',
      previewSender: 'Mentex Coach',
    },
    {
      id: 'imessage',
      label: 'iMessage',
      emoji: '💙',
      kind: 'chat',
      group: 'chat',
      accent: '#0a84ff',
      blurb: 'Tu coach como un contacto azul en Messages',
      flowDesc: 'Vincula con tu número o Apple ID. Solo Apple devices.',
      previewSender: 'Mentex Coach',
    },
    {
      id: 'telegram',
      label: 'Telegram',
      emoji: '✈️',
      kind: 'chat',
      group: 'chat',
      accent: '#2aabee',
      blurb: 'Conversa con @MentexCoachBot — privado y end-to-end',
      flowDesc: 'Abre Telegram y vincula tu cuenta con un código.',
      botUsername: '@MentexCoachBot',
      deepLink: 'tg://resolve?domain=MentexCoachBot',
      previewSender: '@MentexCoachBot',
    },
    {
      id: 'slack',
      label: 'Slack DM',
      emoji: '🟣',
      kind: 'chat',
      group: 'chat',
      accent: '#611f69',
      blurb: 'Tu coach vive como DM en tu workspace',
      flowDesc: 'Autoriza Mentex en tu workspace — el coach aparece como app.',
      previewSender: 'Mentex',
    },
    {
      id: 'email',
      label: 'Email digest',
      emoji: '📧',
      kind: 'reminder',
      group: 'reminders',
      accent: '#ffc850',
      blurb: 'Resumen periódico de tu progreso',
      flowDesc: 'Te enviamos un resumen curado de tu semana/mes.',
      previewSender: 'coach@mentex.app',
    },
    {
      id: 'sms',
      label: 'SMS',
      emoji: '📱',
      kind: 'reminder',
      group: 'reminders',
      accent: '#9b8aff',
      blurb: 'Recordatorios cortos vía mensaje de texto',
      flowDesc: 'Para momentos sin datos. Límite mensual incluido.',
      previewSender: 'Mentex',
    },
    {
      id: 'watch',
      label: 'Apple Watch',
      emoji: '⌚️',
      kind: 'wearable',
      group: 'ambient',
      accent: '#ff8b8b',
      blurb: 'Complicación + nudges discretos en tu muñeca',
      flowDesc: 'Vincula desde la app Watch en tu iPhone.',
      previewSender: 'Coach',
      premiumOnly: false,
    },
    {
      id: 'voice',
      label: 'Voz',
      emoji: '🎙️',
      kind: 'voice',
      group: 'ambient',
      accent: '#5dd3ff',
      blurb: 'Habla con tu coach en HomePod, Alexa o Google Home',
      flowDesc: 'Elige tu asistente predilecto y define un wake phrase.',
      previewSender: 'Coach',
      premiumOnly: false,
    },
    {
      id: 'push',
      label: 'Notificaciones',
      emoji: '🔔',
      kind: 'push',
      group: 'always',
      accent: '#3dffd1',
      blurb: 'Alertas en este dispositivo',
      flowDesc: 'Permiso del navegador para notificaciones push.',
    },
  ];

  // ── Extender __mtxIAConfig.channels con los 3 canales nuevos ─────────────
  // Idempotente: solo añade keys ausentes, no piso config existente.
  function _ensureChannelsInitialized() {
    if (!window.__mtxIAConfig) return false;
    var cfg = window.__mtxIAConfig.snapshot();
    if (!cfg || !cfg.channels) return false;
    var missing = {};
    if (!cfg.channels.telegram) missing.telegram = { connected: false, username: null, verifiedAt: null };
    if (!cfg.channels.watch)    missing.watch    = { connected: false, pairedDevice: null, complicationEnabled: false };
    if (!cfg.channels.voice)    missing.voice    = { connected: false, device: null, wakePhrase: 'Mentex' };
    if (!cfg.channels.imessage) missing.imessage = { connected: false, identifier: null, verifiedAt: null };
    if (!cfg.channels.slack)    missing.slack    = { connected: false, workspace: null, workspaceUrl: null, verifiedAt: null };
    if (Object.keys(missing).length === 0) return true;
    Object.keys(missing).forEach(function(k) {
      window.__mtxIAConfig.setChannel(k, missing[k]);
    });
    return true;
  }
  // Llamar cuando __mtxIAConfig esté disponible (puede cargarse antes o después)
  // Init idempotente — post-audit Fase 3+4: antes ambos setTimeouts corrían
  // incondicionalmente, dispatching `mtx:ia-config-changed` por cada canal
  // nuevo (5 canales × 2 timeouts = 10 force-rerenders). Ahora retry solo
  // si la primera tentativa falla.
  if (!_ensureChannelsInitialized()) {
    setTimeout(function() {
      if (!_ensureChannelsInitialized()) setTimeout(_ensureChannelsInitialized, 100);
    }, 0);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function _getCatalog() { return CATALOG.slice(); }
  function _getChannel(id) {
    for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === id) return CATALOG[i];
    return null;
  }
  function _getState(id) {
    if (!window.__mtxIAConfig) return null;
    var cfg = window.__mtxIAConfig.snapshot();
    return cfg && cfg.channels ? cfg.channels[id] || null : null;
  }
  function _getConnectedCount() {
    if (!window.__mtxIAConfig) return 0;
    var cfg = window.__mtxIAConfig.snapshot();
    if (!cfg || !cfg.channels) return 0;
    var n = 0;
    CATALOG.forEach(function(c) {
      var st = cfg.channels[c.id];
      if (c.alwaysOn || (st && st.connected)) n++;
    });
    return n;
  }
  function _formatRelative(ts) {
    if (!ts) return '';
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
  // Status: 'healthy' | 'warning' | 'disconnected' | 'always'
  function _getStatus(id) {
    var c = _getChannel(id);
    if (!c) return 'disconnected';
    if (c.alwaysOn) return 'always';
    var st = _getState(id);
    if (!st || !st.connected) return 'disconnected';
    // Mock: last activity > 7d → warning. Sin lastSeen, asumimos healthy.
    if (st.lastSeen && (Date.now() - st.lastSeen) > 7 * 86_400_000) return 'warning';
    return 'healthy';
  }
  function _statusColor(status) {
    if (status === 'healthy' || status === 'always') return 'var(--neon)';
    if (status === 'warning') return '#ffc850';
    return 'rgba(255,255,255,0.18)';
  }
  function _statusLabel(status) {
    if (status === 'always') return 'Activo';
    if (status === 'healthy') return 'Conectado';
    if (status === 'warning') return 'Atención';
    return 'Desconectado';
  }

  window.__mtxIAChannels = {
    getCatalog:         _getCatalog,
    getChannel:         _getChannel,
    getState:           _getState,
    getConnectedCount:  _getConnectedCount,
    getStatus:          _getStatus,
    statusColor:        _statusColor,
    statusLabel:        _statusLabel,
    formatRelative:     _formatRelative,
    ensureInitialized:  _ensureChannelsInitialized,
  };
})();


// ═══════════════════════════════════════════════════════════════════════════
// _useCommitGuard — helper compartido para connect flows (post-audit Fase 3+4).
// Devuelve { schedule, mountedRef } donde schedule(fn, ms) maneja:
//   • Cancel automático si el componente se desmonta antes del timeout
//   • clearTimeout en cleanup
//   • Guard explícito mountedRef.current dentro del callback
// Antes, cada commit() lanzaba setTimeout sin cleanup → si user cerraba la
// sheet durante "Conectando…", el setChannel/setIntegration igual escribía
// post-unmount y onDone() llamaba setState en componente desmontado.
// ═══════════════════════════════════════════════════════════════════════════
function _useCommitGuard() {
  var mountedRef = React.useRef(true);
  var timersRef = React.useRef([]);
  React.useEffect(function() {
    return function() {
      mountedRef.current = false;
      timersRef.current.forEach(function(t) { clearTimeout(t); });
      timersRef.current = [];
    };
  }, []);
  function schedule(fn, ms) {
    var t = setTimeout(function() {
      // Drop from active timers list
      var idx = timersRef.current.indexOf(t);
      if (idx >= 0) timersRef.current.splice(idx, 1);
      if (!mountedRef.current) return;  // abort if unmounted
      fn();
    }, ms);
    timersRef.current.push(t);
    return t;
  }
  return { schedule: schedule, mountedRef: mountedRef };
}


// ═══════════════════════════════════════════════════════════════════════════
// CodeInput6 — componente compartido para verificación OTP de 6 dígitos.
// Post-audit Fase 3+4 fix CRIT: el patrón anterior (4 copias) tenía 3 bugs:
//   1. Paste de "123456" solo guardaba "1" (perdía 5 dígitos)
//   2. Entrada fuera de orden corrompía el string (code[i] desalineado)
//   3. e.target.parentNode.children[i+1] frágil ante cambios DOM
// Este componente usa refs array, soporta paste, backspace navega a previo
// cell, autocomplete=one-time-code para auto-fill iOS SMS, aria-label por cell.
// ═══════════════════════════════════════════════════════════════════════════
function CodeInput6(props) {
  var value = props.value || '';
  var onChange = props.onChange;
  var accent = props.accent || 'rgba(61,255,209,0.40)';
  var inputsRef = React.useRef([]);

  function setDigitAt(i, digit) {
    // Build array of 6 from current value, set position, rejoin
    var arr = [];
    for (var j = 0; j < 6; j++) arr.push(value[j] || '');
    arr[i] = digit;
    var next = arr.join('');
    onChange(next);
    return next;
  }

  function handleChange(i, e) {
    var raw = e.target.value.replace(/\D/g, '');
    if (raw.length === 0) {
      setDigitAt(i, '');
      return;
    }
    if (raw.length === 1) {
      setDigitAt(i, raw);
      if (i < 5) {
        var nextEl = inputsRef.current[i + 1];
        if (nextEl) nextEl.focus();
      }
    } else {
      // Paste o auto-fill — distribuir dígitos sobre cells subsiguientes
      var arr = [];
      for (var j = 0; j < 6; j++) arr.push(value[j] || '');
      for (var k = 0; k < raw.length && (i + k) < 6; k++) {
        arr[i + k] = raw[k];
      }
      onChange(arr.join(''));
      var landed = Math.min(5, i + raw.length - 1);
      var landedEl = inputsRef.current[landed];
      if (landedEl) landedEl.focus();
    }
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace') {
      var arr = [];
      for (var j = 0; j < 6; j++) arr.push(value[j] || '');
      if (arr[i]) {
        // Has content here → clear and stay
        arr[i] = '';
        onChange(arr.join(''));
      } else if (i > 0) {
        // Empty → focus previous and clear it
        arr[i - 1] = '';
        onChange(arr.join(''));
        var prev = inputsRef.current[i - 1];
        if (prev) prev.focus();
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      var prevL = inputsRef.current[i - 1];
      if (prevL) prevL.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && i < 5) {
      var nextR = inputsRef.current[i + 1];
      if (nextR) nextR.focus();
      e.preventDefault();
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
      {[0,1,2,3,4,5].map(function(i) {
        return <input key={i}
          ref={function(el) { inputsRef.current[i] = el; }}
          value={value[i] || ''}
          onChange={function(e) { handleChange(i, e); }}
          onKeyDown={function(e) { handleKeyDown(i, e); }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={'Dígito ' + (i + 1) + ' de 6'}
          maxLength={1}
          style={{
            width: 36, height: 44, textAlign: 'center',
            appearance: 'none', outline: 'none',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid ' + (value[i] ? accent : 'rgba(255,255,255,0.08)'),
            borderRadius: 10,
            color: 'var(--ink-1)',
            fontSize: 16, fontWeight: 700,
            fontFamily: 'var(--ff-sans)',
            transition: 'border-color .2s',
          }}/>;
      })}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// Hook reactivo — se suscribe al pubsub global de __mtxIAConfig
// ═══════════════════════════════════════════════════════════════════════════
function useIAChannels() {
  var force = React.useReducer(function(x) { return x + 1; }, 0)[1];
  React.useEffect(function() {
    var h = function() { force(); };
    window.addEventListener('mtx:ia-config-changed', h);
    return function() { window.removeEventListener('mtx:ia-config-changed', h); };
  }, []);
  // Asegurar que los canales nuevos estén inicializados
  React.useEffect(function() {
    if (window.__mtxIAChannels) window.__mtxIAChannels.ensureInitialized();
  }, []);
  return window.__mtxIAChannels;
}


// ═══════════════════════════════════════════════════════════════════════════
// ChannelsHero — encabezado con counter "X de Y conectados"
// ═══════════════════════════════════════════════════════════════════════════
function ChannelsHero(props) {
  var connected = props.connected;
  var total = props.total;
  var pct = total > 0 ? Math.round((connected / total) * 100) : 0;
  return (
    <div style={{
      marginBottom: 16,
      padding: '14px 16px',
      borderRadius: 16,
      background: 'linear-gradient(135deg, rgba(61,255,209,0.08), rgba(93,211,255,0.04))',
      border: '0.5px solid rgba(93,211,255,0.20)',
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
          }}>Tu coach donde tú quieras</div>
          <div style={{
            fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4,
            letterSpacing: '-0.005em',
          }}>
            Conecta los canales que prefieras. Conversamos donde te sea más natural.
          </div>
        </div>
        <div style={{
          padding: '6px 11px', borderRadius: 999,
          background: 'rgba(61,255,209,0.12)',
          border: '0.5px solid rgba(61,255,209,0.30)',
          color: 'var(--neon)',
          fontSize: 11, fontWeight: 700,
          fontFamily: 'var(--ff-sans)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.005em',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>{connected}/{total}</div>
      </div>
      {/* Progress bar sutil */}
      <div style={{
        height: 3, borderRadius: 999,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: pct + '%', height: '100%',
          background: 'linear-gradient(90deg, var(--neon), #5dd3ff)',
          borderRadius: 999,
          transition: 'width .4s cubic-bezier(.4,1.4,.5,1)',
          boxShadow: '0 0 8px rgba(61,255,209,0.4)',
        }}/>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ChannelCard — UN solo botón role=button, status dot + label + acción
// ═══════════════════════════════════════════════════════════════════════════
function ChannelCard(props) {
  var ch = props.channel;
  var state = props.state || {};
  var status = props.status;
  var onOpen = props.onOpen;
  var color = window.__mtxIAChannels.statusColor(status);
  var label = window.__mtxIAChannels.statusLabel(status);
  var isConnected = status === 'healthy' || status === 'always';
  var isWarning = status === 'warning';

  // Subtítulo: si conectado y hay info concreta, mostrarla; si no, blurb
  var subtitle = ch.blurb;
  if (isConnected) {
    if (ch.id === 'whatsapp' && state.phone) subtitle = 'En ' + state.phone;
    else if (ch.id === 'sms' && state.phone) subtitle = 'En ' + state.phone;
    else if (ch.id === 'telegram' && state.username) subtitle = state.username;
    else if (ch.id === 'email' && state.address) subtitle = state.address;
    else if (ch.id === 'watch' && state.pairedDevice) subtitle = state.pairedDevice;
    else if (ch.id === 'voice' && state.device) subtitle = state.device;
    else if (ch.id === 'imessage' && state.identifier) subtitle = state.identifier;
    else if (ch.id === 'slack' && state.workspace) subtitle = state.workspace;
    else if (ch.alwaysOn) subtitle = ch.blurb;
    else subtitle = 'Conectado';
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
      aria-label={'Configurar canal ' + ch.label + '. Estado: ' + label + '.'}
      className="mtx-tap"
      style={{
        padding: '12px 12px 12px',
        borderRadius: 16,
        background: isConnected
          ? 'linear-gradient(135deg, ' + ch.accent + '0d, ' + ch.accent + '02)'
          : 'rgba(255,255,255,0.025)',
        border: '0.5px solid ' + (isConnected
          ? ch.accent + '28'
          : isWarning ? 'rgba(255,200,80,0.30)' : 'rgba(255,255,255,0.06)'),
        transition: 'all .25s',
        animation: 'mtx-fade-up .25s ease both',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        gap: 8,
        minHeight: 102,
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Icon tile decorativo */}
        <div aria-hidden="true" style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: isConnected
            ? 'linear-gradient(135deg, ' + ch.accent + '24, ' + ch.accent + '08)'
            : 'rgba(255,255,255,0.04)',
          border: '0.5px solid ' + (isConnected ? ch.accent + '38' : 'rgba(255,255,255,0.06)'),
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, lineHeight: 1,
          boxShadow: isConnected ? '0 0 10px ' + ch.accent + '20' : 'none',
        }}>
          <span>{ch.emoji}</span>
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
            }}>{ch.label}</span>
            {/* Status dot */}
            <span aria-hidden="true" style={{
              width: 6, height: 6, borderRadius: '50%',
              background: color,
              flexShrink: 0,
              boxShadow: (status === 'healthy' || status === 'always')
                ? '0 0 6px ' + color
                : 'none',
              animation: isWarning ? 'mtxChDotPulse 1.6s ease-in-out infinite' : 'none',
            }}/>
          </div>
          <div style={{
            fontSize: 10.5, fontWeight: 600,
            color: isConnected ? ch.accent : isWarning ? '#ffc850' : 'var(--ink-4)',
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
// ChannelGrid — 2-col grid de cards
// ═══════════════════════════════════════════════════════════════════════════
function ChannelGrid(props) {
  var catalog = props.catalog;
  var onOpen = props.onOpen;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      animation: 'mtx-fade-up .3s ease both',
    }}>
      {catalog.map(function(c) {
        var st = window.__mtxIAChannels.getState(c.id) || {};
        var status = window.__mtxIAChannels.getStatus(c.id);
        return (
          <ChannelCard
            key={c.id}
            channel={c}
            state={st}
            status={status}
            onOpen={function() { onOpen(c); }}
          />
        );
      })}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// QrPlaceholder — SVG mock de un QR de WhatsApp Web style
// (No es un QR real — solo un placeholder visual hasta que entre el backend
// que genera tokens reales. Pero parece auténtico.)
// ═══════════════════════════════════════════════════════════════════════════
function QrPlaceholder(props) {
  var seed = props.seed || 'mentex-coach';
  var size = props.size || 180;
  var color = props.color || '#0a1410';
  var bg = props.bg || '#ffffff';
  // Generar un grid 21x21 pseudo-random determinístico desde el seed
  var cells = React.useMemo(function() {
    var grid = [];
    var hash = 0;
    for (var i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    for (var y = 0; y < 21; y++) {
      var row = [];
      for (var x = 0; x < 21; x++) {
        hash = (hash * 1103515245 + 12345) | 0;
        row.push(((hash >>> 16) & 1) === 1);
      }
      grid.push(row);
    }
    // Position markers (3 esquinas) — patrón de QR real
    function marker(gx, gy) {
      for (var y = 0; y < 7; y++) {
        for (var x = 0; x < 7; x++) {
          var on = (y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4));
          if (gy + y < 21 && gx + x < 21) grid[gy + y][gx + x] = on;
        }
      }
    }
    marker(0, 0);
    marker(14, 0);
    marker(0, 14);
    // Clear the area between markers slightly
    return grid;
  }, [seed]);
  var cell = size / 21;
  return (
    <div style={{
      width: size + 24, height: size + 24,
      padding: 12, borderRadius: 14,
      background: bg,
      boxShadow: '0 8px 24px -10px rgba(0,0,0,0.55)',
      display: 'inline-block',
    }}>
      <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size}>
        {cells.map(function(row, y) {
          return row.map(function(on, x) {
            if (!on) return null;
            return <rect key={x + ':' + y}
              x={x * cell} y={y * cell}
              width={cell} height={cell}
              fill={color}
              rx={cell * 0.18}/>;
          });
        })}
      </svg>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ChannelPreview — bubble de muestra estilo del canal
// ═══════════════════════════════════════════════════════════════════════════
function ChannelPreview(props) {
  var ch = props.channel;
  var sampleMessage = '✦ Recuerda: bloque de enfoque hoy a las 4pm. ¿Algo que ajustar?';

  if (ch.id === 'whatsapp') {
    return (
      <div style={{
        padding: '14px 12px', borderRadius: 14,
        background: 'rgba(11,20,16,0.55)',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '12px 12px',
        border: '0.5px solid rgba(37,211,102,0.20)',
      }}>
        <div style={{
          maxWidth: '85%',
          padding: '8px 10px 6px',
          borderRadius: '12px 12px 12px 4px',
          background: '#202c33',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: '#25d366',
            marginBottom: 2,
            fontFamily: '-apple-system, system-ui, Helvetica Neue, sans-serif',
          }}>{ch.previewSender}</div>
          <div style={{
            fontSize: 12.5, color: '#e9edef', lineHeight: 1.4,
            fontFamily: '-apple-system, system-ui, Helvetica Neue, sans-serif',
          }}>{sampleMessage}</div>
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            gap: 4, marginTop: 2,
          }}>
            <span style={{ fontSize: 9, color: '#aebac1' }}>09:41</span>
            <span style={{ fontSize: 9, color: '#53bdeb' }}>✓✓</span>
          </div>
        </div>
      </div>
    );
  }

  if (ch.id === 'imessage') {
    // iMessage classic: blue bubble (Apple Blue) + delivered marker
    return (
      <div style={{
        padding: '14px 12px', borderRadius: 14,
        background: 'linear-gradient(180deg, #1c1c1e 0%, #0a0a0c 100%)',
        border: '0.5px solid rgba(10,132,255,0.20)',
      }}>
        <div style={{
          fontSize: 9.5, color: '#8e8e93', textAlign: 'center', marginBottom: 6,
          fontFamily: '-apple-system, system-ui, sans-serif',
        }}>iMessage · ahora</div>
        <div style={{
          maxWidth: '85%',
          padding: '7px 11px',
          borderRadius: 18,
          background: 'linear-gradient(180deg, #0a84ff 0%, #0066d6 100%)',
          color: '#fff',
          fontSize: 13, lineHeight: 1.35,
          fontFamily: '-apple-system, system-ui, sans-serif',
          marginLeft: 'auto',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }}>{sampleMessage}</div>
        <div style={{
          fontSize: 9, color: '#8e8e93', marginTop: 3, textAlign: 'right',
          paddingRight: 4,
          fontFamily: '-apple-system, system-ui, sans-serif',
        }}>Entregado</div>
      </div>
    );
  }

  if (ch.id === 'slack') {
    // Slack DM: workspace header + DM bubble with bot badge
    return (
      <div style={{
        padding: '14px 12px', borderRadius: 14,
        background: '#1a1d21',  // Slack dark sidebar tone
        border: '0.5px solid rgba(97,31,105,0.25)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
          paddingBottom: 8,
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            background: 'linear-gradient(135deg, #611f69, #350d36)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#fff',
          }}>M</div>
          <span style={{
            fontSize: 11.5, color: '#d1d2d3', fontWeight: 600,
            fontFamily: 'Slack-Lato, -apple-system, system-ui, sans-serif',
          }}>Mentex Workspace</span>
          <span style={{ flex: 1 }}/>
          <span style={{
            fontSize: 9, color: '#9b9b9b',
            fontFamily: 'Slack-Lato, -apple-system, system-ui, sans-serif',
          }}># dm</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 5, flexShrink: 0,
            background: 'linear-gradient(135deg, #611f69, #4a154b)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#fff',
          }}>✦</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1,
            }}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#fff',
                fontFamily: 'Slack-Lato, -apple-system, system-ui, sans-serif',
              }}>{ch.previewSender}</span>
              <span style={{
                padding: '0 4px', borderRadius: 3,
                background: 'rgba(155,138,255,0.20)',
                color: '#cfc8f7',
                fontSize: 8.5, fontWeight: 700,
                fontFamily: 'Slack-Lato, -apple-system, system-ui, sans-serif',
                letterSpacing: '0.02em',
              }}>APP</span>
              <span style={{
                fontSize: 9.5, color: '#9b9b9b',
                fontFamily: 'Slack-Lato, -apple-system, system-ui, sans-serif',
              }}>9:41</span>
            </div>
            <div style={{
              fontSize: 12, color: '#d1d2d3', lineHeight: 1.4,
              fontFamily: 'Slack-Lato, -apple-system, system-ui, sans-serif',
            }}>{sampleMessage}</div>
          </div>
        </div>
      </div>
    );
  }

  if (ch.id === 'telegram') {
    return (
      <div style={{
        padding: '14px 12px', borderRadius: 14,
        background: 'linear-gradient(180deg, #0e1721 0%, #131e2b 100%)',
        border: '0.5px solid rgba(42,171,238,0.20)',
      }}>
        <div style={{
          maxWidth: '85%',
          padding: '8px 10px 6px',
          borderRadius: '14px 14px 14px 4px',
          background: '#182533',
          boxShadow: '0 1px 2px rgba(0,0,0,0.30)',
        }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: '#5cb6e8',
            marginBottom: 2,
            fontFamily: '-apple-system, system-ui, sans-serif',
          }}>{ch.previewSender}</div>
          <div style={{
            fontSize: 12.5, color: '#e1e9f3', lineHeight: 1.4,
            fontFamily: '-apple-system, system-ui, sans-serif',
          }}>{sampleMessage}</div>
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            gap: 4, marginTop: 2,
          }}>
            <span style={{ fontSize: 9, color: '#7d92a8' }}>09:41</span>
            <span style={{ fontSize: 9, color: '#5cb6e8' }}>✓✓</span>
          </div>
        </div>
      </div>
    );
  }

  if (ch.id === 'email') {
    return (
      <div style={{
        padding: '14px 12px', borderRadius: 14,
        background: '#fafaf7', color: '#1a1a1a',
        border: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <div style={{
          fontSize: 10, color: '#666', marginBottom: 6,
          fontFamily: '-apple-system, system-ui, sans-serif',
        }}>
          <strong style={{ color: '#1a1a1a' }}>{ch.previewSender}</strong> · Tu resumen de la semana
        </div>
        <div style={{
          fontSize: 14, fontWeight: 700, marginBottom: 6,
          fontFamily: 'Georgia, serif',
          color: '#1a1a1a',
        }}>Esta semana invertiste 7h 24m en hábitos</div>
        <div style={{
          fontSize: 11.5, color: '#555', lineHeight: 1.5,
          fontFamily: 'Georgia, serif',
        }}>
          Completaste 4 sesiones de enfoque, leíste 38min y escribiste 2 entradas en tu journal. Sigue así — el patrón está consolidándose…
        </div>
        <div style={{
          marginTop: 8, paddingTop: 8,
          borderTop: '0.5px solid rgba(0,0,0,0.08)',
          fontSize: 10, color: '#999',
          fontFamily: '-apple-system, system-ui, sans-serif',
        }}>Ver progreso completo →</div>
      </div>
    );
  }

  if (ch.id === 'sms') {
    return (
      <div style={{
        padding: '14px 12px', borderRadius: 14,
        background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
        border: '0.5px solid rgba(155,138,255,0.20)',
      }}>
        <div style={{
          maxWidth: '88%',
          padding: '7px 11px',
          borderRadius: 18,
          background: '#3a3a3c',
          color: '#fff',
          fontSize: 12.5, lineHeight: 1.35,
          fontFamily: '-apple-system, system-ui, sans-serif',
        }}>Bloque de enfoque a las 4pm. Reply OK para confirmar.</div>
        <div style={{
          fontSize: 9.5, color: '#8e8e93', marginTop: 4, textAlign: 'left',
          paddingLeft: 4,
        }}>De: Mentex · ahora</div>
      </div>
    );
  }

  if (ch.id === 'watch') {
    return (
      <div style={{
        padding: '14px 12px', borderRadius: 14,
        background: 'radial-gradient(circle at 50% 30%, #1a1a1a 0%, #000 100%)',
        border: '0.5px solid rgba(255,139,139,0.20)',
        display: 'flex', justifyContent: 'center',
      }}>
        {/* Watch face mock — rectángulo redondeado con complication */}
        <div style={{
          width: 132, padding: '12px 10px',
          borderRadius: 22,
          background: '#0d0d0d',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 0 0 4px #1a1a1a, 0 6px 14px -4px rgba(0,0,0,0.6)',
        }}>
          <div style={{
            fontSize: 24, fontWeight: 200, color: '#fff', textAlign: 'right',
            fontFamily: '-apple-system, system-ui, sans-serif',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            marginBottom: 8,
          }}>9:41</div>
          <div style={{
            padding: '6px 8px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(255,139,139,0.18), rgba(255,139,139,0.04))',
            border: '0.5px solid rgba(255,139,139,0.30)',
          }}>
            <div style={{
              fontSize: 8, color: '#ff8b8b', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: 1,
            }}>Mentex</div>
            <div style={{
              fontSize: 10, color: '#fff', lineHeight: 1.2,
              fontFamily: '-apple-system, system-ui, sans-serif',
            }}>Bloque enfoque en 15 min</div>
          </div>
        </div>
      </div>
    );
  }

  if (ch.id === 'voice') {
    return (
      <div style={{
        padding: '14px 12px', borderRadius: 14,
        background: 'linear-gradient(180deg, #0a1a24 0%, #0a0f14 100%)',
        border: '0.5px solid rgba(93,211,255,0.20)',
        textAlign: 'center',
      }}>
        {/* Wave + speech text */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
          gap: 3, height: 26, marginBottom: 8,
        }}>
          {[0.4, 0.7, 1, 0.7, 0.4, 0.6, 0.9, 0.5].map(function(h, i) {
            return <span key={i} style={{
              width: 3, height: (h * 22) + 'px',
              borderRadius: 2,
              background: 'linear-gradient(180deg, var(--neon), #5dd3ff)',
              animation: 'mtxChWavePulse 1.2s ease-in-out infinite',
              animationDelay: (i * 0.1) + 's',
              opacity: 0.85,
            }}/>;
          })}
        </div>
        <div style={{
          fontSize: 11.5, fontStyle: 'italic',
          color: 'var(--ink-2)', lineHeight: 1.4,
          fontFamily: '-apple-system, system-ui, sans-serif',
          maxWidth: 260, margin: '0 auto',
        }}>"Tu bloque de enfoque empieza en 15 minutos. ¿Empezamos antes o lo mantenemos?"</div>
      </div>
    );
  }

  if (ch.id === 'push') {
    return (
      <div style={{
        padding: '14px 12px', borderRadius: 14,
        background: 'linear-gradient(180deg, rgba(20,20,20,0.7) 0%, rgba(10,10,10,0.7) 100%)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{
          padding: '10px 12px', borderRadius: 14,
          background: 'rgba(255,255,255,0.10)',
          border: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>✦</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 10.5, color: 'var(--ink-3)', marginBottom: 1,
            }}>
              <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>MENTEX</span>
              <span>ahora</span>
            </div>
            <div style={{
              fontSize: 12, fontWeight: 700, color: 'var(--ink-1)',
              marginBottom: 1,
            }}>Bloque de enfoque en 15 min</div>
            <div style={{
              fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.35,
            }}>{sampleMessage}</div>
          </div>
        </div>
      </div>
    );
  }

  // inApp fallback
  return (
    <div style={{
      padding: '14px 12px', borderRadius: 14,
      background: 'rgba(61,255,209,0.04)',
      border: '0.5px solid rgba(61,255,209,0.16)',
      textAlign: 'center',
      fontSize: 12, color: 'var(--ink-2)',
      lineHeight: 1.5,
    }}>El chat in-app es tu canal nativo. Siempre activo, sin configuración.</div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ConnectFlow — sub-renderers per-channel kind
// ═══════════════════════════════════════════════════════════════════════════

// WhatsApp: QR + phone + verify
function WhatsAppConnectFlow(props) {
  var onDone = props.onDone;
  var phaseState = React.useState('qr');  // 'qr' | 'phone' | 'verify' | 'connecting'
  var phase = phaseState[0]; var setPhase = phaseState[1];
  var phoneState = React.useState('');
  var phone = phoneState[0]; var setPhone = phoneState[1];
  var codeState = React.useState('');
  var code = codeState[0]; var setCode = codeState[1];
  var guard = _useCommitGuard();

  var commit = function() {
    setPhase('connecting');
    guard.schedule(function() {
      window.__mtxIAConfig.setChannel('whatsapp', {
        connected: true,
        phone: phone || '+57 300 ••• 0000',
        verifiedAt: Date.now(),
      });
      onDone();
    }, 900);
  };

  if (phase === 'connecting') {
    return <ConnectingState emoji="💚" label="WhatsApp"/>;
  }

  if (phase === 'verify') {
    return (
      <div>
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
            Te enviamos un código
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
            Revisa WhatsApp en {phone || 'tu número'} y escribe los 6 dígitos.
          </div>
        </div>
        <CodeInput6 value={code} onChange={setCode} accent="rgba(37,211,102,0.40)"/>
        <button onClick={commit} disabled={code.length < 6}
          className="mtx-tap"
          style={ctaPrimaryStyle(code.length === 6)}>
          Verificar
        </button>
        <button onClick={function() { setPhase('phone'); setCode(''); }}
          style={ctaGhostStyle()}>
          Cambiar número
        </button>
      </div>
    );
  }

  if (phase === 'phone') {
    return (
      <div>
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
            ¿En qué número?
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
            Te enviamos un código por WhatsApp para verificar.
          </div>
        </div>
        <input
          value={phone}
          onChange={function(e) { setPhone(e.target.value); }}
          placeholder="+57 300 000 0000"
          inputMode="tel"
          autoFocus
          style={inputStyle()}
        />
        <div style={{ height: 12 }}/>
        {/* Post-audit Fase 3+4: validar dígitos del E.164 (7-15), no length raw
            que aceptaba "   " (espacios) y rechazaba "5550100" válido. */}
        {(function() {
          var digits = (phone || '').replace(/\D/g, '');
          var ok = digits.length >= 7 && digits.length <= 15;
          return (
            <>
              <button onClick={function() { setPhase('verify'); }} disabled={!ok}
                className="mtx-tap"
                style={ctaPrimaryStyle(ok)}>
                Enviar código
              </button>
              <button onClick={function() { setPhase('qr'); }} style={ctaGhostStyle()}>
                Volver al QR
              </button>
            </>
          );
        })()}
      </div>
    );
  }

  // phase === 'qr'
  return (
    <div>
      <div style={{ marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
          Escanea con WhatsApp
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
          WhatsApp → Configuración → Dispositivos vinculados → Vincular un dispositivo.
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <QrPlaceholder seed="mentex-wa-2026" size={170} color="#0a1410" bg="#ffffff"/>
      </div>
      <div style={{
        padding: '8px 12px', borderRadius: 12,
        background: 'rgba(37,211,102,0.06)',
        border: '0.5px solid rgba(37,211,102,0.20)',
        marginBottom: 12,
        textAlign: 'center',
        fontSize: 10.5, color: 'rgba(37,211,102,0.85)',
        letterSpacing: '0.04em', textTransform: 'uppercase',
        fontWeight: 700,
      }}>El QR caduca en 60 s</div>
      <button onClick={function() { setPhase('phone'); }}
        className="mtx-tap"
        style={ctaGhostStyle()}>
        Prefiero verificar con código
      </button>
    </div>
  );
}

// iMessage: phone OR Apple ID + verify (iOS-styled)
function IMessageConnectFlow(props) {
  var onDone = props.onDone;
  var phaseState = React.useState('identifier');  // 'identifier' | 'verify' | 'connecting'
  var phase = phaseState[0]; var setPhase = phaseState[1];
  var idTypeState = React.useState('phone');  // 'phone' | 'apple-id'
  var idType = idTypeState[0]; var setIdType = idTypeState[1];
  var idValueState = React.useState('');
  var idValue = idValueState[0]; var setIdValue = idValueState[1];
  var codeState = React.useState('');
  var code = codeState[0]; var setCode = codeState[1];
  var guard = _useCommitGuard();

  var commit = function() {
    setPhase('connecting');
    guard.schedule(function() {
      window.__mtxIAConfig.setChannel('imessage', {
        connected: true,
        identifier: idValue,
        identifierKind: idType,
        verifiedAt: Date.now(),
      });
      onDone();
    }, 900);
  };

  if (phase === 'connecting') return <ConnectingState emoji="💙" label="iMessage"/>;

  var isValidId = idType === 'phone'
    ? (idValue && idValue.replace(/\D/g, '').length >= 8)
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(idValue.trim());

  if (phase === 'verify') {
    return (
      <div>
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
            Verifica con el código
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
            Apple enviará un código a {idValue} para activar iMessage.
          </div>
        </div>
        <CodeInput6 value={code} onChange={setCode} accent="rgba(10,132,255,0.40)"/>
        <button onClick={commit} disabled={code.length < 6}
          className="mtx-tap"
          style={ctaPrimaryStyle(code.length === 6, '#0a84ff')}>
          Verificar
        </button>
        <button onClick={function() { setPhase('identifier'); setCode(''); }} style={ctaGhostStyle()}>
          Cambiar identificador
        </button>
      </div>
    );
  }

  // phase === 'identifier'
  return (
    <div>
      <div style={{ marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
          Vincula tu iMessage
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
          Solo funciona en iPhone, iPad o Mac. Te llegará como contacto azul.
        </div>
      </div>
      {/* Toggle phone vs Apple ID */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[
          { id: 'phone',    label: 'Teléfono' },
          { id: 'apple-id', label: 'Apple ID' },
        ].map(function(o) {
          var isActive = idType === o.id;
          return <button key={o.id}
            onClick={function() { setIdType(o.id); setIdValue(''); }}
            aria-pressed={isActive}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              flex: 1, padding: '8px 10px', borderRadius: 11,
              background: isActive
                ? 'linear-gradient(135deg, rgba(10,132,255,0.16), rgba(10,132,255,0.04))'
                : 'rgba(255,255,255,0.025)',
              border: '0.5px solid ' + (isActive ? 'rgba(10,132,255,0.40)' : 'rgba(255,255,255,0.06)'),
              color: isActive ? '#0a84ff' : 'var(--ink-2)',
              fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>{o.label}</button>;
        })}
      </div>
      <input
        value={idValue}
        onChange={function(e) { setIdValue(e.target.value); }}
        placeholder={idType === 'phone' ? '+57 300 000 0000' : 'tu@icloud.com'}
        inputMode={idType === 'phone' ? 'tel' : 'email'}
        autoFocus
        style={inputStyle()}
      />
      <div style={{
        marginTop: 12, padding: '10px 12px',
        borderRadius: 12,
        background: 'rgba(10,132,255,0.06)',
        border: '0.5px solid rgba(10,132,255,0.20)',
        fontSize: 10.5, color: 'var(--ink-3)',
        lineHeight: 1.45,
      }}>
        <strong style={{ color: 'var(--ink-2)' }}>¿No tienes iMessage?</strong> Apple lo activa automáticamente en tus dispositivos Apple cuando inicias sesión con tu Apple ID.
      </div>
      <div style={{ height: 12 }}/>
      <button onClick={function() { setPhase('verify'); }} disabled={!isValidId}
        className="mtx-tap"
        style={ctaPrimaryStyle(isValidId, '#0a84ff')}>
        Enviar código
      </button>
    </div>
  );
}

// Slack: workspace picker + OAuth mock + scopes
function SlackConnectFlow(props) {
  var onDone = props.onDone;
  var phaseState = React.useState('workspace');  // 'workspace' | 'authorize' | 'connecting'
  var phase = phaseState[0]; var setPhase = phaseState[1];
  var workspaceState = React.useState('');
  var workspace = workspaceState[0]; var setWorkspace = workspaceState[1];
  var guard = _useCommitGuard();

  var commit = function() {
    setPhase('connecting');
    guard.schedule(function() {
      var name = workspace.trim() || 'Mi Workspace';
      window.__mtxIAConfig.setChannel('slack', {
        connected: true,
        workspace: name,
        workspaceUrl: name.toLowerCase().replace(/\s+/g, '-') + '.slack.com',
        verifiedAt: Date.now(),
      });
      onDone();
    }, 1000);
  };

  if (phase === 'connecting') return <ConnectingState emoji="🟣" label="Slack"/>;

  if (phase === 'authorize') {
    return (
      <div>
        <div style={{ marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
            Autoriza Mentex en {workspace}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
            Te redirigiremos a Slack para que apruebes los permisos:
          </div>
        </div>
        <div style={{
          padding: '12px 14px', borderRadius: 14,
          background: 'rgba(97,31,105,0.06)',
          border: '0.5px solid rgba(97,31,105,0.24)',
          marginBottom: 14,
        }}>
          <div className="mtx-eyebrow" style={{ fontSize: 9, color: '#a779b0', marginBottom: 6 }}>
            PERMISOS SOLICITADOS
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            • Enviar mensajes en DMs<br/>
            • Recibir comandos `/mentex`<br/>
            • Acceder a tu nombre y avatar<br/>
          </div>
        </div>
        <button onClick={commit} className="mtx-tap"
          style={Object.assign({}, ctaPrimaryStyle(true, '#611f69'), {
            background: 'linear-gradient(135deg, #611f69, #4a154b)',
            color: '#fff',
          })}>
          🟣 Autorizar en Slack
        </button>
        <button onClick={function() { setPhase('workspace'); }} style={ctaGhostStyle()}>
          Cambiar workspace
        </button>
      </div>
    );
  }

  // workspace
  return (
    <div>
      <div style={{ marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
          ¿Cuál es tu workspace?
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
          Te dirigimos al login de Slack del workspace correcto.
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'rgba(0,0,0,0.22)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        paddingRight: 12,
      }}>
        <input
          value={workspace}
          onChange={function(e) { setWorkspace(e.target.value); }}
          placeholder="acme"
          autoFocus
          style={Object.assign({}, inputStyle(), {
            background: 'transparent', border: 0, borderRadius: 0,
            paddingRight: 4,
          })}
        />
        <span style={{
          fontSize: 12, color: 'var(--ink-4)',
          fontFamily: 'var(--ff-sans)',
          whiteSpace: 'nowrap',
        }}>.slack.com</span>
      </div>
      <div style={{ height: 12 }}/>
      <button onClick={function() { setPhase('authorize'); }} disabled={!workspace || workspace.trim().length < 2}
        className="mtx-tap"
        style={ctaPrimaryStyle(workspace && workspace.trim().length >= 2, '#611f69')}>
        Continuar
      </button>
    </div>
  );
}

// Telegram: bot username + deep link + verify
function TelegramConnectFlow(props) {
  var ch = props.channel;
  var onDone = props.onDone;
  var phaseState = React.useState('intro');
  var phase = phaseState[0]; var setPhase = phaseState[1];
  var codeState = React.useState('');
  var code = codeState[0]; var setCode = codeState[1];
  var guard = _useCommitGuard();

  var commit = function() {
    setPhase('connecting');
    guard.schedule(function() {
      window.__mtxIAConfig.setChannel('telegram', {
        connected: true,
        username: '@usuario_mentex',
        verifiedAt: Date.now(),
      });
      onDone();
    }, 900);
  };

  if (phase === 'connecting') return <ConnectingState emoji="✈️" label="Telegram"/>;

  if (phase === 'verify') {
    return (
      <div>
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
            Pega el código del bot
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
            Sigue las instrucciones del bot {ch.botUsername} en Telegram. Te dará un código de 6 dígitos.
          </div>
        </div>
        <CodeInput6 value={code} onChange={setCode} accent="rgba(42,171,238,0.40)"/>
        <button onClick={commit} disabled={code.length < 6}
          className="mtx-tap"
          style={ctaPrimaryStyle(code.length === 6, '#2aabee')}>
          Conectar
        </button>
        <button onClick={function() { setPhase('intro'); setCode(''); }} style={ctaGhostStyle()}>
          Volver
        </button>
      </div>
    );
  }

  // intro
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4, textAlign: 'center' }}>
          Conecta el bot en Telegram
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.45, textAlign: 'center' }}>
          Sigue 3 pasos sencillos:
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <StepRow num="1" text={'Abre Telegram y busca ' + ch.botUsername}/>
        <StepRow num="2" text="Presiona Start o /start"/>
        <StepRow num="3" text="Copia el código de 6 dígitos que te da el bot"/>
      </div>
      {/* Post-audit Fase 3+4: real button con window.location en lugar de
          <a target=_blank> — para custom protocols como tg://, target=_blank
          deja una tab vacía en desktop Chrome. Y Space ahora activa el botón
          correctamente (los <a> solo aceptan Enter). */}
      <button
        onClick={function() {
          try { window.location.href = ch.deepLink; }
          catch (e) { console.warn('[telegram] deep-link navigation failed', e); }
        }}
        aria-label="Abrir Telegram"
        className="mtx-tap"
        style={Object.assign({}, ctaPrimaryStyle(true, '#2aabee'), {
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, textDecoration: 'none',
        })}>
        <span>✈️</span> Abrir Telegram
      </button>
      <button onClick={function() { setPhase('verify'); }} className="mtx-tap" style={ctaGhostStyle()}>
        Ya tengo el código →
      </button>
    </div>
  );
}

// Apple Watch: steps + companion app preview
function WatchConnectFlow(props) {
  var onDone = props.onDone;
  var phaseState = React.useState('intro');
  var phase = phaseState[0]; var setPhase = phaseState[1];
  var guard = _useCommitGuard();

  var commit = function() {
    setPhase('connecting');
    guard.schedule(function() {
      window.__mtxIAConfig.setChannel('watch', {
        connected: true,
        pairedDevice: 'Apple Watch Series 9',
        complicationEnabled: true,
        verifiedAt: Date.now(),
      });
      onDone();
    }, 1000);
  };

  if (phase === 'connecting') return <ConnectingState emoji="⌚️" label="Apple Watch"/>;

  return (
    <div>
      <div style={{ marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
          Vincula tu Apple Watch
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
          Sigue estos pasos en tu iPhone:
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <StepRow num="1" text="Abre la app Watch en tu iPhone"/>
        <StepRow num="2" text="Mi reloj → Mentex → Activar"/>
        <StepRow num="3" text="Añade la complicación al watch face"/>
      </div>
      <div style={{
        padding: '12px 14px', borderRadius: 14,
        background: 'rgba(255,139,139,0.06)',
        border: '0.5px solid rgba(255,139,139,0.20)',
        marginBottom: 14,
      }}>
        <div className="mtx-eyebrow" style={{
          fontSize: 9, color: '#ff8b8b', marginBottom: 4,
        }}>QUÉ RECIBIRÁS</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          • Complicación con próximo bloque<br/>
          • Tap haptic 5min antes<br/>
          • Quick reply: "OK · 5min · Reagendar"
        </div>
      </div>
      <button onClick={commit} className="mtx-tap"
        style={ctaPrimaryStyle(true, '#ff8b8b')}>
        He vinculado mi reloj
      </button>
    </div>
  );
}

// Email: address + frequency + preview
function EmailConnectFlow(props) {
  var ch = props.channel;
  var onDone = props.onDone;
  var current = props.current || {};
  var phaseState = React.useState('config');
  var phase = phaseState[0]; var setPhase = phaseState[1];
  var addressState = React.useState(current.address || '');
  var address = addressState[0]; var setAddress = addressState[1];
  var freqState = React.useState(current.frequency || 'weekly');
  var freq = freqState[0]; var setFreq = freqState[1];
  var guard = _useCommitGuard();

  var commit = function() {
    setPhase('connecting');
    guard.schedule(function() {
      window.__mtxIAConfig.setChannel('email', {
        connected: true,
        address: address,
        frequency: freq,
        verifiedAt: Date.now(),
      });
      onDone();
    }, 800);
  };

  if (phase === 'connecting') return <ConnectingState emoji="📧" label="Email digest"/>;

  var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim());

  return (
    <div>
      <div style={{ marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
          ¿A qué correo te enviamos tu digest?
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
          Un resumen curado con métricas, micro-wins y lo que merece tu enfoque.
        </div>
      </div>
      <input
        value={address}
        onChange={function(e) { setAddress(e.target.value); }}
        placeholder="tu@correo.com"
        inputMode="email"
        autoFocus
        style={inputStyle()}
      />
      <div style={{ height: 14 }}/>
      <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>FRECUENCIA</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { id: 'daily',   label: 'Diario' },
          { id: 'weekly',  label: 'Semanal' },
          { id: 'monthly', label: 'Mensual' },
        ].map(function(f) {
          var isActive = freq === f.id;
          return <button key={f.id}
            onClick={function() { setFreq(f.id); }}
            aria-pressed={isActive}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              flex: 1, padding: '8px 10px', borderRadius: 11,
              background: isActive
                ? 'linear-gradient(135deg, rgba(255,200,80,0.16), rgba(255,200,80,0.04))'
                : 'rgba(255,255,255,0.025)',
              border: '0.5px solid ' + (isActive ? 'rgba(255,200,80,0.40)' : 'rgba(255,255,255,0.06)'),
              color: isActive ? '#ffc850' : 'var(--ink-2)',
              fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>{f.label}</button>;
        })}
      </div>
      <button onClick={commit} disabled={!valid}
        className="mtx-tap"
        style={ctaPrimaryStyle(valid, '#ffc850')}>
        Suscribirme
      </button>
    </div>
  );
}

// SMS: phone + verify + monthly limit
function SMSConnectFlow(props) {
  var onDone = props.onDone;
  var phaseState = React.useState('phone');
  var phase = phaseState[0]; var setPhase = phaseState[1];
  var phoneState = React.useState('');
  var phone = phoneState[0]; var setPhone = phoneState[1];
  var codeState = React.useState('');
  var code = codeState[0]; var setCode = codeState[1];
  var guard = _useCommitGuard();

  var commit = function() {
    setPhase('connecting');
    guard.schedule(function() {
      window.__mtxIAConfig.setChannel('sms', {
        connected: true,
        phone: phone,
        monthlyLimit: 30,
        verifiedAt: Date.now(),
      });
      onDone();
    }, 800);
  };

  if (phase === 'connecting') return <ConnectingState emoji="📱" label="SMS"/>;

  if (phase === 'verify') {
    return (
      <div>
        <div style={{ marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
            Verifica con el código
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
            Te enviamos un SMS a {phone} con 6 dígitos.
          </div>
        </div>
        <CodeInput6 value={code} onChange={setCode} accent="rgba(155,138,255,0.40)"/>
        <button onClick={commit} disabled={code.length < 6}
          className="mtx-tap"
          style={ctaPrimaryStyle(code.length === 6, '#9b8aff')}>
          Verificar
        </button>
        <button onClick={function() { setPhase('phone'); setCode(''); }} style={ctaGhostStyle()}>
          Cambiar número
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
          ¿En qué número?
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
          Para momentos sin datos. Hasta 30 SMS/mes.
        </div>
      </div>
      <input
        value={phone}
        onChange={function(e) { setPhone(e.target.value); }}
        placeholder="+57 300 000 0000"
        inputMode="tel"
        autoFocus
        style={inputStyle()}
      />
      <div style={{ height: 12 }}/>
      {/* Post-audit Fase 3+4: validar dígitos E.164 (7-15) — ver fix WhatsApp. */}
      {(function() {
        var digits = (phone || '').replace(/\D/g, '');
        var ok = digits.length >= 7 && digits.length <= 15;
        return (
      <button onClick={function() { setPhase('verify'); }} disabled={!ok}
        className="mtx-tap"
        style={ctaPrimaryStyle(ok, '#9b8aff')}>
        Enviar SMS
      </button>
        );
      })()}
    </div>
  );
}

// Voice: device picker + wake phrase + scopes
function VoiceConnectFlow(props) {
  var onDone = props.onDone;
  var phaseState = React.useState('device');
  var phase = phaseState[0]; var setPhase = phaseState[1];
  var deviceState = React.useState('siri');
  var device = deviceState[0]; var setDevice = deviceState[1];
  var phraseState = React.useState('Mentex');
  var phrase = phraseState[0]; var setPhrase = phraseState[1];
  var guard = _useCommitGuard();

  var DEVICES = [
    { id: 'siri',     label: 'Siri',         emoji: '🍎', desc: 'iPhone · HomePod · Mac' },
    { id: 'alexa',    label: 'Alexa',        emoji: '🔵', desc: 'Echo · Echo Dot · Echo Show' },
    { id: 'google',   label: 'Google Home',  emoji: '🌈', desc: 'Nest Hub · Nest Mini' },
  ];

  var commit = function() {
    setPhase('connecting');
    guard.schedule(function() {
      var meta = DEVICES.filter(function(d) { return d.id === device; })[0] || DEVICES[0];
      window.__mtxIAConfig.setChannel('voice', {
        connected: true,
        device: meta.label,
        wakePhrase: phrase || 'Mentex',
        verifiedAt: Date.now(),
      });
      onDone();
    }, 900);
  };

  if (phase === 'connecting') return <ConnectingState emoji="🎙️" label="Asistente de voz"/>;

  if (phase === 'phrase') {
    return (
      <div>
        <div style={{ marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
            Tu palabra mágica
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
            Di "Oye [palabra]" para invocar a tu coach.
          </div>
        </div>
        <input
          value={phrase}
          onChange={function(e) { setPhrase(e.target.value); }}
          placeholder="Mentex"
          autoFocus
          style={inputStyle()}
        />
        <div style={{
          marginTop: 12, padding: '10px 12px',
          borderRadius: 12,
          background: 'rgba(93,211,255,0.06)',
          border: '0.5px solid rgba(93,211,255,0.20)',
          fontSize: 11, color: 'var(--ink-2)',
          lineHeight: 1.5,
        }}>
          <strong>Ejemplo:</strong> "Oye {phrase || 'Mentex'}, agenda enfoque a las 4pm"
        </div>
        <div style={{ height: 12 }}/>
        <button onClick={commit} className="mtx-tap"
          style={ctaPrimaryStyle(phrase && phrase.length >= 2, '#5dd3ff')}>
          Activar
        </button>
        <button onClick={function() { setPhase('device'); }} style={ctaGhostStyle()}>
          Volver
        </button>
      </div>
    );
  }

  // device picker
  return (
    <div>
      <div style={{ marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
          ¿Qué asistente usas?
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
          Vinculamos tu coach al asistente de voz de tu casa.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {DEVICES.map(function(d) {
          var isActive = device === d.id;
          return <button key={d.id}
            onClick={function() { setDevice(d.id); }}
            aria-pressed={isActive}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 12px', borderRadius: 14,
              background: isActive
                ? 'linear-gradient(135deg, rgba(93,211,255,0.14), rgba(93,211,255,0.04))'
                : 'rgba(255,255,255,0.025)',
              border: '0.5px solid ' + (isActive ? 'rgba(93,211,255,0.40)' : 'rgba(255,255,255,0.06)'),
              color: 'var(--ink-1)',
              textAlign: 'left',
              transition: 'all .2s',
            }}>
            <span style={{ fontSize: 20 }}>{d.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-1)' }}>{d.label}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 1 }}>{d.desc}</div>
            </div>
            {isActive && <IcCheck size={14} stroke="#5dd3ff" strokeWidth={2.4}/>}
          </button>;
        })}
      </div>
      <button onClick={function() { setPhase('phrase'); }} className="mtx-tap"
        style={ctaPrimaryStyle(true, '#5dd3ff')}>
        Continuar
      </button>
    </div>
  );
}

// Push: permission real
function PushConnectFlow(props) {
  var onDone = props.onDone;
  var phaseState = React.useState('idle');
  var phase = phaseState[0]; var setPhase = phaseState[1];
  var errorState = React.useState(null);
  var error = errorState[0]; var setError = errorState[1];
  var guard = _useCommitGuard();

  var request = function() {
    if (typeof Notification === 'undefined') {
      setError('Tu navegador no soporta notificaciones.');
      return;
    }
    setPhase('connecting');
    // Post-audit Fase 3+4: wrap en Promise.resolve para soportar Safari antiguo
    // (que retornaba void + aceptaba callback). El .catch evita unhandled
    // promise rejection si el browser rechaza (Brave strict, ITP, etc).
    var permPromise;
    try {
      var maybe = Notification.requestPermission();
      permPromise = (maybe && typeof maybe.then === 'function')
        ? maybe
        : new Promise(function(resolve) { Notification.requestPermission(resolve); });
    } catch (e) {
      permPromise = Promise.reject(e);
    }
    permPromise.then(function(perm) {
      if (!guard.mountedRef.current) return;
      if (perm === 'granted') {
        window.__mtxIAConfig.setChannel('push', { connected: true, granted: true, verifiedAt: Date.now() });
        try {
          new Notification('Coach Mentex', {
            body: 'Notificaciones activadas. Te avisaré cuando importe.',
            icon: '/favicon.ico',
          });
        } catch (e) {
          // iOS Safari ALWAYS throws here (requiere ServiceWorker). Log explícito
          // (universal rule #2: no silent failures).
          console.warn('[push] Notification constructor unavailable — permission saved', e);
        }
        onDone();
      } else {
        setPhase('idle');
        setError('Permiso denegado. Habilítalo desde la configuración del navegador.');
      }
    }).catch(function(err) {
      if (!guard.mountedRef.current) return;
      setPhase('idle');
      setError('No pudimos pedir permiso: ' + (err && err.message ? err.message : 'error desconocido'));
    });
  };

  if (phase === 'connecting') return <ConnectingState emoji="🔔" label="Notificaciones"/>;

  return (
    <div>
      <div style={{ marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>
          Permiso de notificaciones
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
          Solo te avisaremos cuando importe — nunca spam.
        </div>
      </div>
      {error && (
        <div style={{
          padding: '10px 12px', borderRadius: 12, marginBottom: 12,
          background: 'rgba(255,107,107,0.06)',
          border: '0.5px solid rgba(255,107,107,0.20)',
          fontSize: 11.5, color: '#ff8b8b',
          lineHeight: 1.4,
        }}>{error}</div>
      )}
      <button onClick={request} className="mtx-tap"
        style={ctaPrimaryStyle(true)}>
        Activar notificaciones
      </button>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// Shared sub-components for connect flows
// ═══════════════════════════════════════════════════════════════════════════

function StepRow(props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 12px', borderRadius: 12,
      background: 'rgba(255,255,255,0.025)',
      border: '0.5px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(61,255,209,0.12)',
        border: '0.5px solid rgba(61,255,209,0.28)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: 'var(--neon)',
      }}>{props.num}</div>
      <div style={{
        fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5,
        flex: 1, marginTop: 2,
      }}>{props.text}</div>
    </div>
  );
}

function ConnectingState(props) {
  return (
    <div style={{ padding: '32px 8px', textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px',
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
        <span style={{ fontSize: 26 }}>{props.emoji}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 4 }}>Conectando…</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', maxWidth: 240, margin: '0 auto', lineHeight: 1.4 }}>
        Estableciendo conexión segura con {props.label}.
      </div>
    </div>
  );
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box',
    appearance: 'none', outline: 'none',
    background: 'rgba(0,0,0,0.22)',
    border: '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '13px 14px',
    color: 'var(--ink-1)',
    fontSize: 14,
    fontFamily: 'var(--ff-sans)',
    letterSpacing: '-0.005em',
  };
}

function ctaPrimaryStyle(enabled, color) {
  color = color || 'var(--neon)';
  // Convert var(--neon) to hex-compat string for gradients
  var grad = color === 'var(--neon)'
    ? 'linear-gradient(135deg, var(--neon), #1ad9ad)'
    : 'linear-gradient(135deg, ' + color + ', ' + color + 'cc)';
  var fg = color === 'var(--neon)' ? '#0a1410'
    : color === '#ffc850' ? '#3a2a08'
    : color === '#ff8b8b' ? '#3a0e0e'
    : color === '#5dd3ff' ? '#08293a'
    : color === '#2aabee' ? '#082238'
    : color === '#9b8aff' ? '#1a1238'
    : '#fff';
  return {
    appearance: 'none', cursor: enabled ? 'pointer' : 'not-allowed',
    width: '100%', padding: '13px 14px', borderRadius: 14, border: 0,
    background: enabled ? grad : 'rgba(255,255,255,0.04)',
    color: enabled ? fg : 'var(--ink-4)',
    fontSize: 14, fontWeight: 700,
    fontFamily: 'var(--ff-sans)',
    letterSpacing: '-0.01em',
    opacity: enabled ? 1 : 0.5,
    boxShadow: enabled ? '0 4px 14px -2px ' + (color === 'var(--neon)' ? 'rgba(61,255,209,0.42)' : color + '66') : 'none',
    transition: 'all .2s',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };
}

function ctaGhostStyle() {
  return {
    appearance: 'none', cursor: 'pointer',
    width: '100%', padding: '11px 14px', borderRadius: 12, border: 0,
    background: 'transparent',
    color: 'var(--ink-3)',
    fontSize: 12, fontWeight: 600,
    fontFamily: 'var(--ff-sans)',
    marginTop: 8,
    letterSpacing: '-0.005em',
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// ChannelDetailSheet — bottom sheet con status, preview, config, connect/disco
// ═══════════════════════════════════════════════════════════════════════════
function ChannelDetailSheet(props) {
  var ch = props.channel;
  var onClose = props.onClose;
  var state = window.__mtxIAChannels.getState(ch.id) || {};
  var status = window.__mtxIAChannels.getStatus(ch.id);
  var isConnected = status === 'healthy' || status === 'always';
  var isAlwaysOn = ch.alwaysOn;

  // ESC — ref pattern + guard canonical (post-audit Fase IA-2)
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

  // Body scroll lock
  React.useEffect(function() {
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function() { document.body.style.overflow = prev; };
  }, []);

  // Backdrop drag-release
  var backdropDownRef = React.useRef(false);
  var handleBackdropDown = function(e) { backdropDownRef.current = e.target === e.currentTarget; };
  var handleBackdropClick = function(e) {
    if (e.target === e.currentTarget && backdropDownRef.current) onCloseRef.current();
    backdropDownRef.current = false;
  };

  // useToast estable
  var _useToast = window.useToast || function() { return { show: function() {} }; };
  var toast = _useToast();

  // Disconnect confirmation in-place (sin window.confirm — post-audit)
  var confirmDisconnectState = React.useState(false);
  var confirmDisconnect = confirmDisconnectState[0]; var setConfirmDisconnect = confirmDisconnectState[1];

  var doDisconnect = function() {
    // Post-audit Fase 3+4: limpiar también verifiedAt + lastSeen — antes
    // quedaban stale en localStorage, mostraban "Última actividad: hace 2h"
    // al re-conectar con otro identifier. Privacidad y consistencia.
    var patch = { connected: false, verifiedAt: null, lastSeen: null };
    if (ch.id === 'whatsapp' || ch.id === 'sms') patch.phone = null;
    if (ch.id === 'telegram') patch.username = null;
    if (ch.id === 'email')    patch.address = null;
    if (ch.id === 'watch')    { patch.pairedDevice = null; patch.complicationEnabled = false; }
    if (ch.id === 'voice')    { patch.device = null; }
    if (ch.id === 'push')     patch.granted = false;
    if (ch.id === 'imessage') patch.identifier = null;
    if (ch.id === 'slack')    { patch.workspace = null; patch.workspaceUrl = null; }
    window.__mtxIAConfig.setChannel(ch.id, patch);
    toast.show({ message: ch.label + ' desconectado', duration: 1600 });
    setConfirmDisconnect(false);
    onClose();
  };

  var sendTestMessage = function() {
    toast.show({ message: '✦ Mensaje de prueba enviado a ' + ch.label, duration: 2000 });
    // Mock: marcar lastSeen
    if (window.__mtxIAConfig && state.connected) {
      window.__mtxIAConfig.setChannel(ch.id, { lastSeen: Date.now() });
    }
  };

  // Connect flow state (cuando user pidió conectar)
  var showConnectState = React.useState(!isConnected && !isAlwaysOn);
  var showConnect = showConnectState[0]; var setShowConnect = showConnectState[1];

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
    }} onMouseDown={handleBackdropDown} onClick={handleBackdropClick}>
      <div onClick={function(e) { e.stopPropagation(); }}
        role="dialog" aria-modal="true" aria-label={'Canal: ' + ch.label}
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
        {/* Grabber */}
        <div aria-hidden="true" style={{
          width: 36, height: 4, borderRadius: 999, margin: '0 auto 14px',
          background: 'rgba(255,255,255,0.16)',
        }}/>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <div aria-hidden="true" style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, ' + ch.accent + '28, ' + ch.accent + '08)',
            border: '0.5px solid ' + ch.accent + '40',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 0 14px ' + ch.accent + '20',
          }}>{ch.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
            }}>
              <span style={{
                fontSize: 16, fontWeight: 700, color: 'var(--ink-1)',
                letterSpacing: '-0.018em',
                fontFamily: 'var(--ff-display, var(--ff-sans))',
              }}>{ch.label}</span>
              <span aria-hidden="true" style={{
                width: 7, height: 7, borderRadius: '50%',
                background: window.__mtxIAChannels.statusColor(status),
                boxShadow: isConnected ? '0 0 6px ' + window.__mtxIAChannels.statusColor(status) : 'none',
              }}/>
            </div>
            <div style={{
              fontSize: 10.5, fontWeight: 700,
              color: isConnected ? ch.accent : 'var(--ink-4)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: 4,
            }}>{window.__mtxIAChannels.statusLabel(status)}</div>
            <div style={{
              fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.45,
              letterSpacing: '-0.005em',
            }}>{ch.flowDesc}</div>
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

        {/* CASO A: Conectado o always-on → mostrar preview + stats + acciones */}
        {(isConnected || isAlwaysOn) && !showConnect && (
          <div>
            <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>
              ASÍ SE VE EN {ch.label.toUpperCase()}
            </div>
            <div style={{ marginBottom: 16 }}>
              <ChannelPreview channel={ch}/>
            </div>

            {!isAlwaysOn && (
              <>
                {/* Stats row */}
                <div style={{
                  display: 'flex', gap: 8, marginBottom: 16,
                }}>
                  <StatCell label="Mensajes esta semana" value="14"/>
                  <StatCell label="Última actividad" value={
                    state.lastSeen ? window.__mtxIAChannels.formatRelative(state.lastSeen) : 'Hace 2h'
                  }/>
                </div>

                {/* Actions */}
                <button onClick={sendTestMessage} className="mtx-tap"
                  style={ctaPrimaryStyle(true, ch.accent)}>
                  ✦ Enviar mensaje de prueba
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
                      marginTop: 8,
                    }}>Desconectar</button>
                ) : (
                  <div style={{
                    marginTop: 8, padding: '12px 14px', borderRadius: 14,
                    background: 'rgba(255,107,107,0.06)',
                    border: '0.5px solid rgba(255,107,107,0.30)',
                  }}>
                    <div style={{
                      fontSize: 12, color: '#ff8b8b', marginBottom: 10,
                      fontWeight: 600, textAlign: 'center',
                    }}>¿Seguro? El coach dejará de enviarte en {ch.label}.</div>
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
              </>
            )}

            {isAlwaysOn && (
              <div style={{
                padding: '12px 14px', borderRadius: 14,
                background: 'rgba(61,255,209,0.06)',
                border: '0.5px solid rgba(61,255,209,0.20)',
                fontSize: 11.5, color: 'var(--ink-2)',
                textAlign: 'center', lineHeight: 1.5,
              }}>Este canal está siempre activo y no se puede desconectar.</div>
            )}
          </div>
        )}

        {/* CASO B: No conectado → mostrar connect flow + preview de muestra */}
        {!isConnected && !isAlwaysOn && showConnect && (
          <div>
            {/* Preview arriba para que el user vea qué obtendrá */}
            <div className="mtx-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>
              ESTO ES LO QUE RECIBIRÁS
            </div>
            <div style={{ marginBottom: 18 }}>
              <ChannelPreview channel={ch}/>
            </div>

            {/* Connect flow específico */}
            {ch.id === 'whatsapp' && <WhatsAppConnectFlow channel={ch} onDone={function() { setShowConnect(false); }}/>}
            {ch.id === 'imessage' && <IMessageConnectFlow channel={ch} onDone={function() { setShowConnect(false); }}/>}
            {ch.id === 'telegram' && <TelegramConnectFlow channel={ch} onDone={function() { setShowConnect(false); }}/>}
            {ch.id === 'slack'    && <SlackConnectFlow    channel={ch} onDone={function() { setShowConnect(false); }}/>}
            {ch.id === 'watch'    && <WatchConnectFlow    channel={ch} onDone={function() { setShowConnect(false); }}/>}
            {ch.id === 'email'    && <EmailConnectFlow    channel={ch} current={state} onDone={function() { setShowConnect(false); }}/>}
            {ch.id === 'sms'      && <SMSConnectFlow      channel={ch} onDone={function() { setShowConnect(false); }}/>}
            {ch.id === 'voice'    && <VoiceConnectFlow    channel={ch} onDone={function() { setShowConnect(false); }}/>}
            {ch.id === 'push'     && <PushConnectFlow     channel={ch} onDone={function() { setShowConnect(false); }}/>}
          </div>
        )}
      </div>
    </div>
  );
  return window.ReactDOM ? window.ReactDOM.createPortal(content, portalRoot) : content;
}


function StatCell(props) {
  return (
    <div style={{
      flex: 1,
      padding: '10px 12px', borderRadius: 12,
      background: 'rgba(255,255,255,0.025)',
      border: '0.5px solid rgba(255,255,255,0.06)',
    }}>
      <div className="mtx-eyebrow" style={{ fontSize: 8.5, marginBottom: 3 }}>{props.label}</div>
      <div style={{
        fontSize: 13, fontWeight: 700, color: 'var(--ink-1)',
        fontFamily: 'var(--ff-display, var(--ff-sans))',
        letterSpacing: '-0.012em',
        fontVariantNumeric: 'tabular-nums',
      }}>{props.value}</div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// EnhancedChannelsTab — el componente que reemplaza a ChannelsTab antiguo
// ═══════════════════════════════════════════════════════════════════════════
function EnhancedChannelsTab() {
  useIAChannels();  // suscribirse a cambios
  // HOOKS FIRST — post-audit Fase 3+4: si __mtxIAChannels no está listo en
  // primer render, antes el early return ANTES de useState producía hook count
  // mismatch en el segundo render.
  var detailState = React.useState(null);
  var detailCh = detailState[0]; var setDetailCh = detailState[1];

  // Stable onClose callback to avoid re-creating closure each render (audit
  // CRIT: stale ref pattern in ChannelDetailSheet ESC handler).
  var handleClose = React.useCallback(function() { setDetailCh(null); }, []);

  if (!window.__mtxIAChannels) return null;

  var catalog = window.__mtxIAChannels.getCatalog();
  var connected = window.__mtxIAChannels.getConnectedCount();
  var total = catalog.length;

  return (
    <div style={{ animation: 'mtx-fade-up .25s ease both' }}>
      <ChannelsHero connected={connected} total={total}/>
      <ChannelGrid catalog={catalog} onOpen={function(c) { setDetailCh(c); }}/>

      {detailCh && (
        <ChannelDetailSheet
          channel={detailCh}
          onClose={handleClose}
        />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// CSS keyframes inyectados una sola vez
// ═══════════════════════════════════════════════════════════════════════════
if (typeof document !== 'undefined' && !document.getElementById('mtx-ia-channels-css')) {
  var style = document.createElement('style');
  style.id = 'mtx-ia-channels-css';
  style.textContent = [
    '@keyframes mtxChDotPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }',
    '@keyframes mtxChWavePulse { 0%, 100% { transform: scaleY(0.5); opacity: 0.6; } 50% { transform: scaleY(1); opacity: 1; } }',
    '@keyframes mtx-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',
  ].join('\n');
  document.head.appendChild(style);
}


// ═══════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════
Object.assign(window, {
  ChannelsHero: ChannelsHero,
  ChannelCard: ChannelCard,
  ChannelGrid: ChannelGrid,
  ChannelDetailSheet: ChannelDetailSheet,
  ChannelPreview: ChannelPreview,
  EnhancedChannelsTab: EnhancedChannelsTab,
  useIAChannels: useIAChannels,
});
