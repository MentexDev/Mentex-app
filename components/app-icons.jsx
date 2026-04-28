// app-icons.jsx — Logos de apps (Instagram, TikTok, etc.) reales pero simplificados

const AppIconBox = ({ children, bg, size = 36, radius = 9 }) => (
  <div style={{
    width: size, height: size, borderRadius: radius,
    background: bg, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  }}>{children}</div>
);

const AppInstagram = ({ size = 36 }) => (
  <AppIconBox size={size} bg="linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)">
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="1" fill="#fff"/>
    </svg>
  </AppIconBox>
);

const AppTikTok = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#000">
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24">
      <path d="M19.6 6.3a4.8 4.8 0 01-3.8-2H13v11.5a2.7 2.7 0 11-2.7-2.7c.3 0 .5 0 .8.1V10A5.5 5.5 0 1015.8 16V9.6a7 7 0 003.9 1.2V8a4.7 4.7 0 01-.1-1.7z" fill="#25F4EE" transform="translate(-1 0)"/>
      <path d="M19.6 6.3a4.8 4.8 0 01-3.8-2H13v11.5a2.7 2.7 0 11-2.7-2.7c.3 0 .5 0 .8.1V10A5.5 5.5 0 1015.8 16V9.6a7 7 0 003.9 1.2V8a4.7 4.7 0 01-.1-1.7z" fill="#FE2C55" transform="translate(1 1)"/>
      <path d="M19.6 6.3a4.8 4.8 0 01-3.8-2H13v11.5a2.7 2.7 0 11-2.7-2.7c.3 0 .5 0 .8.1V10A5.5 5.5 0 1015.8 16V9.6a7 7 0 003.9 1.2V8a4.7 4.7 0 01-.1-1.7z" fill="#fff"/>
    </svg>
  </AppIconBox>
);

const AppYouTube = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#FF0000">
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24">
      <path d="M10 8.5l6 3.5-6 3.5z" fill="#fff"/>
    </svg>
  </AppIconBox>
);

const AppX = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#000">
    <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="#fff">
      <path d="M17.5 3h3l-7 8 8.5 10h-6.5l-5-6.5L4 21H1l7.5-8.5L0 3h6.5l4.5 6L17.5 3z"/>
    </svg>
  </AppIconBox>
);

const AppFacebook = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#1877F2">
    <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="#fff">
      <path d="M14 7h2V4h-2.5C11 4 10 5.5 10 8v2H8v3h2v8h3v-8h2.5l.5-3H13V8c0-.5.3-1 1-1z"/>
    </svg>
  </AppIconBox>
);

const AppWhatsApp = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#25D366">
    <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="#fff">
      <path d="M12 3a9 9 0 00-7.7 13.7L3 21l4.5-1.2A9 9 0 1012 3zm4.5 12.5c-.2.5-1.1 1-1.6 1.1-.4 0-1 .1-1.5-.1-.4-.1-.9-.3-1.5-.5-2.6-1.1-4.3-3.7-4.4-3.9-.1-.2-1-1.4-1-2.6s.6-1.8.8-2c.2-.2.5-.3.7-.3h.5c.2 0 .4-.1.6.5l.8 1.9c.1.2.1.4 0 .6l-.3.4c-.1.1-.3.3-.1.6.1.3.7 1.1 1.4 1.7.9.8 1.7 1.1 2 1.2.2.1.4.1.6-.1l.7-.8c.2-.3.4-.2.6-.1l1.7.8c.2.1.4.2.4.3.1.1.1.7-.1 1.3z"/>
    </svg>
  </AppIconBox>
);

const AppSafari = ({ size = 36 }) => (
  <AppIconBox size={size} bg="linear-gradient(180deg, #1f9bf2, #006edb)">
    <svg width={size * 0.85} height={size * 0.85} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#fff" opacity="0.15"/>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#fff" strokeWidth="0.6"/>
      <path d="M12 4l1.5 7L12 20l-1.5-9z" fill="#ff3b30"/>
      <path d="M12 4l-1.5 7L12 20l1.5-9z" fill="#fff"/>
      <circle cx="12" cy="12" r="1" fill="#fff"/>
    </svg>
  </AppIconBox>
);

const AppNetflix = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#000">
    <svg width={size * 0.5} height={size * 0.65} viewBox="0 0 24 24">
      <path d="M5 2v20l4.5-1V8l5 14 4.5-1V2l-4.5 1v14L9.5 3z" fill="#E50914"/>
    </svg>
  </AppIconBox>
);

const AppReddit = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#FF4500">
    <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="#fff">
      <circle cx="12" cy="13" r="7" fill="#fff" opacity="0.95"/>
      <circle cx="9" cy="13" r="1.2" fill="#FF4500"/>
      <circle cx="15" cy="13" r="1.2" fill="#FF4500"/>
      <path d="M9 16c1 1 2 1.5 3 1.5s2-.5 3-1.5" stroke="#FF4500" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
      <circle cx="17.5" cy="6" r="1.5" fill="#fff"/>
      <path d="M17.5 6L12 6" stroke="#fff" strokeWidth="0.6"/>
    </svg>
  </AppIconBox>
);

// ── Apps adicionales para el editor expandido ──────────────────────

const AppTelegram = ({ size = 36 }) => (
  <AppIconBox size={size} bg="linear-gradient(180deg, #2AABEE, #229ED9)">
    <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="#fff">
      <path d="M21 5L3 12l5 2 2 6 3-3 5 4 3-16zm-5 4L9.5 14l-1 4 2-3 5-4z"/>
    </svg>
  </AppIconBox>
);

const AppMessenger = ({ size = 36 }) => (
  <AppIconBox size={size} bg="linear-gradient(135deg, #00B2FF, #006AFF)">
    <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="#fff">
      <path d="M12 3C7 3 3 6.7 3 11.3c0 2.6 1.3 4.9 3.4 6.4V22l3.1-1.7c.8.2 1.6.3 2.5.3 5 0 9-3.7 9-8.3S17 3 12 3zm.9 11.2L10.5 12l-4.4 2.4 4.9-5.2 2.4 2.4 4.4-2.4-4.9 5z"/>
    </svg>
  </AppIconBox>
);

const AppDiscord = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#5865F2">
    <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="#fff">
      <path d="M19 5.5C17.5 4.8 16 4.4 14.4 4.2c-.2.4-.4.9-.6 1.3-1.7-.3-3.4-.3-5.1 0-.2-.4-.4-.9-.6-1.3C6.5 4.4 5 4.8 3.5 5.5 1 9.2.4 12.8.7 16.4c1.8 1.3 3.5 2.1 5.2 2.6.4-.6.8-1.2 1.1-1.8-.6-.2-1.2-.5-1.7-.9.1-.1.3-.2.4-.3 3.4 1.6 7.1 1.6 10.6 0 .1.1.3.2.4.3-.5.4-1.1.7-1.7.9.3.6.7 1.2 1.1 1.8 1.7-.5 3.4-1.3 5.2-2.6.4-4.2-.6-7.7-2.3-10.9zM8.7 14.2c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.9 2.2-1.9 2.2zm6.6 0c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2z"/>
    </svg>
  </AppIconBox>
);

const AppSnapchat = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#FFFC00">
    <svg width={size * 0.75} height={size * 0.75} viewBox="0 0 24 24" fill="#000">
      <path d="M12 3c2.5 0 4.6 1.5 5.5 3.7.4 1 .4 2.2.3 3.4l-.1 1.1c0 .4.2.5.6.5.5 0 1.2-.3 1.7-.3.4 0 .8.2.9.5.1.4-.2.7-.6.9-.6.3-1.6.5-2 .8-.2.2-.1.5 0 .8.5 1.2 1.5 2.3 2.7 2.6.4.1.6.4.5.7-.2.6-1.4.9-2.2 1-.2 0-.3.2-.4.5-.1.4-.1.7-.4.8-.5.2-1.5-.3-2.6-.1-1.1.2-2 1.4-3.9 1.4s-2.7-1.2-3.9-1.4c-1.1-.2-2.1.3-2.6.1-.3-.1-.3-.5-.4-.8-.1-.2-.2-.4-.4-.5-.8-.1-2-.4-2.2-1-.1-.3.1-.6.5-.7 1.2-.3 2.2-1.4 2.7-2.6.1-.3.2-.6 0-.8-.4-.3-1.4-.5-2-.8-.4-.2-.7-.5-.6-.9.1-.3.5-.5.9-.5.5 0 1.2.3 1.7.3.4 0 .6-.1.6-.5l-.1-1.1c-.1-1.2-.1-2.4.3-3.4C7.4 4.5 9.5 3 12 3z"/>
    </svg>
  </AppIconBox>
);

const AppLinkedIn = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#0A66C2">
    <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="#fff">
      <rect x="3" y="9" width="3.5" height="11" rx="0.5"/>
      <circle cx="4.75" cy="5.25" r="1.75"/>
      <path d="M9 9h3.5v1.5c.5-1 1.7-1.8 3.2-1.8 2.6 0 4.3 1.6 4.3 4.5V20h-3.5v-5.6c0-1.4-.5-2.4-1.8-2.4-1.4 0-2.2 1-2.2 2.4V20H9V9z"/>
    </svg>
  </AppIconBox>
);

const AppPinterest = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#E60023">
    <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="#fff">
      <path d="M12 3C7 3 3.5 6.5 3.5 10.8c0 2.5 1.3 4.4 3.3 5.2.3.1.5 0 .6-.3l.2-1c.1-.3.1-.4-.2-.7-.5-.6-.8-1.4-.8-2.5 0-3.2 2.4-6 6.2-6 3.4 0 5.3 2 5.3 4.7 0 3.6-1.6 6.5-4 6.5-1.3 0-2.3-1.1-2-2.5.4-1.6 1.1-3.3 1.1-4.5 0-1-.6-1.9-1.7-1.9-1.4 0-2.5 1.4-2.5 3.3 0 1.2.4 2 .4 2L8 18.5c-.7 2.8-.1 6.2-.1 6.5 0 .2.2.2.4 0 .2-.2 2.4-2.9 3.1-5.6.2-.7 1.3-5.2 1.3-5.2.6 1.2 2.4 2.2 4.3 2.2 5.6 0 9.4-5.1 9.4-12C21.5 6.5 17.6 3 12 3z" transform="translate(0 -2) scale(0.85)"/>
    </svg>
  </AppIconBox>
);

const AppSpotify = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#1DB954">
    <svg width={size * 0.75} height={size * 0.75} viewBox="0 0 24 24" fill="#000">
      <circle cx="12" cy="12" r="10" fill="#1DB954"/>
      <path d="M7 9c3-1 7.5-1 11 1M7.5 12c2.5-1 6.5-1 9.5 1M8 15c2-.7 5-.7 7 .8" stroke="#000" strokeWidth="1.7" strokeLinecap="round" fill="none"/>
    </svg>
  </AppIconBox>
);

const AppTwitch = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#9146FF">
    <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="#fff">
      <path d="M4 3l-1 4v12h4v3h3l3-3h3l5-5V3H4zm15 9l-3 3h-3l-3 3v-3H7V5h12v7zm-3-5h-2v5h2V7zm-5 0H9v5h2V7z"/>
    </svg>
  </AppIconBox>
);

const AppDisney = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#0E1B3D">
    <svg width={size * 0.85} height={size * 0.55} viewBox="0 0 80 30" fill="#fff">
      <text x="2" y="22" fontFamily="serif" fontStyle="italic" fontSize="22" fontWeight="700">Disney+</text>
    </svg>
  </AppIconBox>
);

const AppPrime = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#00A8E1">
    <svg width={size * 0.8} height={size * 0.6} viewBox="0 0 80 30" fill="#fff">
      <text x="2" y="20" fontFamily="sans-serif" fontSize="14" fontWeight="700">prime</text>
      <path d="M5 24c10 4 25 4 35 0" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  </AppIconBox>
);

const AppAmazon = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#000">
    <svg width={size * 0.85} height={size * 0.7} viewBox="0 0 80 60" fill="#fff">
      <text x="6" y="32" fontFamily="sans-serif" fontSize="22" fontWeight="700">a</text>
      <path d="M22 32 Q 30 40 50 32" stroke="#FF9900" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M48 30l4 2-4 2z" fill="#FF9900"/>
    </svg>
  </AppIconBox>
);

const AppShein = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#000">
    <svg width={size * 0.8} height={size * 0.5} viewBox="0 0 80 30" fill="#fff">
      <text x="2" y="22" fontFamily="sans-serif" fontSize="18" fontWeight="700">SHEIN</text>
    </svg>
  </AppIconBox>
);

const AppMercadoLibre = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#FFE600">
    <svg width={size * 0.85} height={size * 0.5} viewBox="0 0 80 30">
      <ellipse cx="40" cy="18" rx="32" ry="9" fill="#2D3277"/>
      <path d="M14 18 Q 25 8 40 18 Q 55 28 66 18" stroke="#fff" strokeWidth="2" fill="none"/>
    </svg>
  </AppIconBox>
);

const AppGmail = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#fff">
    <svg width={size * 0.7} height={size * 0.55} viewBox="0 0 24 18">
      <path d="M2 2l10 7 10-7v14H2z" fill="#fff" stroke="#EA4335" strokeWidth="0.5"/>
      <path d="M2 2v14h4V8L2 2z" fill="#4285F4"/>
      <path d="M22 2v14h-4V8l4-6z" fill="#34A853"/>
      <path d="M2 2l10 7 10-7H2z" fill="#EA4335"/>
      <path d="M2 2l4 4v2L2 2z" fill="#C5221F"/>
    </svg>
  </AppIconBox>
);

const AppSlack = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#fff">
    <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24">
      <rect x="4" y="10" width="6" height="2" fill="#36C5F0" rx="1"/>
      <rect x="4" y="12" width="2" height="6" fill="#36C5F0" rx="1"/>
      <rect x="10" y="14" width="2" height="6" fill="#2EB67D" rx="1"/>
      <rect x="12" y="18" width="6" height="2" fill="#2EB67D" rx="1"/>
      <rect x="14" y="12" width="6" height="2" fill="#ECB22E" rx="1"/>
      <rect x="18" y="6" width="2" height="6" fill="#ECB22E" rx="1"/>
      <rect x="12" y="4" width="2" height="6" fill="#E01E5A" rx="1"/>
      <rect x="6" y="4" width="6" height="2" fill="#E01E5A" rx="1"/>
    </svg>
  </AppIconBox>
);

const AppGames = ({ size = 36 }) => (
  <AppIconBox size={size} bg="linear-gradient(135deg, #6366f1, #8b5cf6)">
    <svg width={size * 0.7} height={size * 0.55} viewBox="0 0 24 18" fill="#fff">
      <rect x="2" y="3" width="20" height="12" rx="5"/>
      <circle cx="7" cy="9" r="0.8" fill="#6366f1"/>
      <circle cx="9" cy="9" r="0.8" fill="#6366f1"/>
      <circle cx="8" cy="7.5" r="0.8" fill="#6366f1"/>
      <circle cx="8" cy="10.5" r="0.8" fill="#6366f1"/>
      <circle cx="16" cy="8" r="1.2" fill="#6366f1"/>
      <circle cx="18.5" cy="10" r="1.2" fill="#6366f1"/>
    </svg>
  </AppIconBox>
);

const AppChrome = ({ size = 36 }) => (
  <AppIconBox size={size} bg="#fff">
    <svg width={size * 0.85} height={size * 0.85} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#fff"/>
      <circle cx="12" cy="12" r="4" fill="#1A73E8"/>
      <circle cx="12" cy="12" r="3" fill="#fff"/>
      <path d="M12 2 A 10 10 0 0 1 20.5 7 L 13.5 9 A 4 4 0 0 0 9 11 L 4 5 A 10 10 0 0 1 12 2z" fill="#EA4335"/>
      <path d="M20.5 7 A 10 10 0 0 1 18 19 L 14 13 A 4 4 0 0 0 13.5 9z" fill="#FBBC04"/>
      <path d="M18 19 A 10 10 0 0 1 4 5 L 9 11 A 4 4 0 0 0 14 13z" fill="#34A853"/>
    </svg>
  </AppIconBox>
);

const APPS = [
  // Redes sociales
  { id: 'ig', name: 'Instagram',   subtitle: 'Red social',     category: 'social',     Icon: AppInstagram },
  { id: 'tt', name: 'TikTok',      subtitle: 'Videos cortos',  category: 'social',     Icon: AppTikTok },
  { id: 'x',  name: 'X',           subtitle: 'Red social',     category: 'social',     Icon: AppX },
  { id: 'fb', name: 'Facebook',    subtitle: 'Red social',     category: 'social',     Icon: AppFacebook },
  { id: 'sn', name: 'Snapchat',    subtitle: 'Red social',     category: 'social',     Icon: AppSnapchat },
  { id: 'li', name: 'LinkedIn',    subtitle: 'Profesional',    category: 'social',     Icon: AppLinkedIn },
  { id: 'pi', name: 'Pinterest',   subtitle: 'Inspiración',    category: 'social',     Icon: AppPinterest },
  { id: 'rd', name: 'Reddit',      subtitle: 'Comunidades',    category: 'social',     Icon: AppReddit },
  // Mensajería
  { id: 'wa', name: 'WhatsApp',    subtitle: 'Mensajería',     category: 'messaging',  Icon: AppWhatsApp },
  { id: 'tg', name: 'Telegram',    subtitle: 'Mensajería',     category: 'messaging',  Icon: AppTelegram },
  { id: 'me', name: 'Messenger',   subtitle: 'Mensajería',     category: 'messaging',  Icon: AppMessenger },
  { id: 'ds', name: 'Discord',     subtitle: 'Comunidades',    category: 'messaging',  Icon: AppDiscord },
  { id: 'gm', name: 'Gmail',       subtitle: 'Email',          category: 'messaging',  Icon: AppGmail },
  { id: 'sl', name: 'Slack',       subtitle: 'Trabajo',        category: 'messaging',  Icon: AppSlack },
  // Entretenimiento
  { id: 'yt', name: 'YouTube',     subtitle: 'Videos',         category: 'entertainment', Icon: AppYouTube },
  { id: 'nf', name: 'Netflix',     subtitle: 'Series y pelis', category: 'entertainment', Icon: AppNetflix },
  { id: 'tw', name: 'Twitch',      subtitle: 'Streaming',      category: 'entertainment', Icon: AppTwitch },
  { id: 'sp', name: 'Spotify',     subtitle: 'Música',         category: 'entertainment', Icon: AppSpotify },
  { id: 'dp', name: 'Disney+',     subtitle: 'Streaming',      category: 'entertainment', Icon: AppDisney },
  { id: 'pr', name: 'Prime Video', subtitle: 'Streaming',      category: 'entertainment', Icon: AppPrime },
  { id: 'gg', name: 'Juegos',      subtitle: 'Casual',         category: 'entertainment', Icon: AppGames },
  // Compras
  { id: 'am', name: 'Amazon',      subtitle: 'Compras',        category: 'shopping',   Icon: AppAmazon },
  { id: 'sh', name: 'Shein',       subtitle: 'Moda',           category: 'shopping',   Icon: AppShein },
  { id: 'ml', name: 'MercadoLibre',subtitle: 'Compras',        category: 'shopping',   Icon: AppMercadoLibre },
  // Otras
  { id: 'sf', name: 'Safari',      subtitle: 'Navegador',      category: 'other',      Icon: AppSafari },
  { id: 'ch', name: 'Chrome',      subtitle: 'Navegador',      category: 'other',      Icon: AppChrome },
];

const APP_CATEGORIES = [
  { id: 'social',         label: 'Redes sociales',  hint: 'Donde se va el tiempo sin darte cuenta' },
  { id: 'messaging',      label: 'Mensajería',      hint: 'Conversaciones que pueden esperar' },
  { id: 'entertainment',  label: 'Entretenimiento', hint: 'Streaming, video, audio' },
  { id: 'shopping',       label: 'Compras',         hint: 'Tiendas y catálogos' },
  { id: 'other',          label: 'Otras',           hint: 'Navegadores y utilidades' },
];

// IDs sugeridas por "Mentex AI" — las que más fragmentan atención
const SUGGESTED_BLOCK_IDS = ['ig', 'tt', 'x', 'yt', 'rd'];

Object.assign(window, {
  AppIconBox,
  AppInstagram, AppTikTok, AppYouTube, AppX, AppFacebook,
  AppWhatsApp, AppSafari, AppNetflix, AppReddit,
  AppTelegram, AppMessenger, AppDiscord, AppSnapchat, AppLinkedIn,
  AppPinterest, AppSpotify, AppTwitch, AppDisney, AppPrime,
  AppAmazon, AppShein, AppMercadoLibre, AppGmail, AppSlack, AppGames, AppChrome,
  APPS, APP_CATEGORIES, SUGGESTED_BLOCK_IDS,
});
