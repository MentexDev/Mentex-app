// mentex-icons.jsx — Iconografía SVG line-art (linear style, stroke 1.5)

const Icon = ({ children, size = 20, stroke = 'currentColor', fill = 'none', strokeWidth = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    {children}
  </svg>
);

const IcHome = (p) => <Icon {...p}><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9"/></Icon>;
const IcCompass = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-1.7 5.3-5.3 1.7 1.7-5.3z"/></Icon>;
const IcSpark = (p) => <Icon {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/></Icon>;
const IcUsers = (p) => <Icon {...p}><circle cx="9" cy="9" r="3.5"/><path d="M3 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5"/><circle cx="17" cy="8" r="2.8"/><path d="M15 14c2.7 0 6 1.8 6 5"/></Icon>;
const IcUser = (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/></Icon>;
const IcBell = (p) => <Icon {...p}><path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 004 0"/></Icon>;
const IcPlay = (p) => <Icon {...p} fill="currentColor" stroke="none"><path d="M8 5l11 7-11 7z"/></Icon>;
const IcPause = (p) => <Icon {...p}><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></Icon>;
const IcCheck = (p) => <Icon {...p}><path d="M4 12.5l5 5 11-11"/></Icon>;
const IcPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
const IcChevR = (p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>;
const IcChevL = (p) => <Icon {...p}><path d="M15 6l-6 6 6 6"/></Icon>;
const IcChevD = (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>;
const IcClose = (p) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18"/></Icon>;
const IcLock = (p) => <Icon {...p}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></Icon>;
const IcUnlock = (p) => <Icon {...p}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 017.5-1.5"/></Icon>;
const IcMoreV = (p) => <Icon {...p} fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></Icon>;
const IcMoreH = (p) => <Icon {...p} fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></Icon>;
const IcRefresh = (p) => <Icon {...p}><path d="M3 12a9 9 0 0115.5-6.3L21 8"/><path d="M21 4v4h-4"/><path d="M21 12a9 9 0 01-15.5 6.3L3 16"/><path d="M3 20v-4h4"/></Icon>;
const IcShield = (p) => <Icon {...p}><path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6l8-3z"/></Icon>;
const IcClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></Icon>;
const IcFlame = (p) => <Icon {...p}><path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 11-8 0c0-2 1-3 1.5-4-1 0-1.5-1-1.5-2C8 4 10 3 12 3z"/></Icon>;
const IcTarget = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></Icon>;
const IcBook = (p) => <Icon {...p}><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z"/><path d="M4 19a2 2 0 012-2h13"/></Icon>;
const IcBrain = (p) => <Icon {...p}><path d="M9 4a3 3 0 00-3 3v1a3 3 0 00-2 3 3 3 0 002 3 3 3 0 003 3 3 3 0 003-3V4zM15 4a3 3 0 013 3v1a3 3 0 012 3 3 3 0 01-2 3 3 3 0 01-3 3 3 3 0 01-3-3V4z"/></Icon>;
const IcLeaf = (p) => <Icon {...p}><path d="M5 19c0-9 6-14 15-14 0 9-6 14-15 14z"/><path d="M5 19c4-4 7-7 12-12"/></Icon>;
const IcDumbbell = (p) => <Icon {...p}><path d="M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12"/></Icon>;
const IcEdit = (p) => <Icon {...p}><path d="M4 20h4l11-11-4-4L4 16v4z"/></Icon>;
const IcEye = (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></Icon>;
const IcWind = (p) => <Icon {...p}><path d="M3 8h13a3 3 0 100-6M3 12h17a3 3 0 110 6M3 16h9"/></Icon>;
const IcHeart = (p) => <Icon {...p}><path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z"/></Icon>;
const IcZap = (p) => <Icon {...p}><path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/></Icon>;
const IcMic = (p) => <Icon {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></Icon>;
const IcSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></Icon>;
const IcTrend = (p) => <Icon {...p}><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></Icon>;
const IcBookmark = (p) => <Icon {...p}><path d="M6 4a1 1 0 011-1h10a1 1 0 011 1v17l-6-4-6 4V4z"/></Icon>;
const IcBookmarkFill = (p) => <Icon {...p} fill="currentColor" stroke="currentColor"><path d="M6 4a1 1 0 011-1h10a1 1 0 011 1v17l-6-4-6 4V4z"/></Icon>;
const IcCalendar = (p) => <Icon {...p}><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></Icon>;
const IcShare = (p) => <Icon {...p}><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-3.8M8.2 13l7.6 3.8"/></Icon>;
const IcLink = (p) => <Icon {...p}><path d="M10 14a4 4 0 005.5 0l3-3a4 4 0 10-5.5-5.5L11.5 7"/><path d="M14 10a4 4 0 00-5.5 0l-3 3a4 4 0 105.5 5.5L12.5 17"/></Icon>;
const IcMessage = (p) => <Icon {...p}><path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4V6z"/></Icon>;
const IcMail = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></Icon>;
const IcList = (p) => <Icon {...p}><path d="M4 6h16M4 12h16M4 18h10"/></Icon>;
const IcSparkles = (p) => <Icon {...p}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 16l.7 1.8L21.5 18l-1.8.7L19 20.5l-.7-1.8L16.5 18l1.8-.7z"/></Icon>;
const IcMoon = (p) => <Icon {...p}><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/></Icon>;
const IcGauge = (p) => <Icon {...p}><path d="M4 18a8 8 0 1116 0"/><path d="M12 18l4-5"/><circle cx="12" cy="18" r="1.2" fill="currentColor"/></Icon>;

// Skip controls — track prev/next + arc-style skip back/forward con segundos custom
const IcSkipPrev = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="5" x2="6" y2="19"/>
    <polygon points="20 5 8 12 20 19" fill={stroke} stroke="none"/>
  </svg>
);
const IcSkipNext = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="5" x2="18" y2="19"/>
    <polygon points="4 5 16 12 4 19" fill={stroke} stroke="none"/>
  </svg>
);
const IcSkipBack = ({ size = 28, stroke = 'currentColor', strokeWidth = 1.4, seconds = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {/* Arc casi completo: gap angular en top — desde top-right a top-left, going CW (down → left → up) */}
    <path d="M16.2 5.6a8 8 0 1 1-8.4 0"/>
    {/* Arrow notch suave en el inicio del arc (top-left) — chevron pointing left */}
    <path d="M11 3.6L7.8 5.6L11 7.6"/>
    {/* Number — refinado: tabular nums, letter-spacing apretado, peso 700 */}
    <text x="12" y="15.4" textAnchor="middle" fontSize="7.4" fontWeight="700" fill={stroke} stroke="none" style={{ fontFamily:'-apple-system,system-ui,sans-serif', letterSpacing:'-0.05em', fontVariantNumeric:'tabular-nums' }}>{seconds}</text>
  </svg>
);
const IcSkipForward = ({ size = 28, stroke = 'currentColor', strokeWidth = 1.4, seconds = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {/* Arc casi completo: mirror — desde top-left going CCW */}
    <path d="M7.8 5.6a8 8 0 1 0 8.4 0"/>
    {/* Arrow notch suave en el inicio del arc (top-right) — chevron pointing right */}
    <path d="M13 3.6L16.2 5.6L13 7.6"/>
    <text x="12" y="15.4" textAnchor="middle" fontSize="7.4" fontWeight="700" fill={stroke} stroke="none" style={{ fontFamily:'-apple-system,system-ui,sans-serif', letterSpacing:'-0.05em', fontVariantNumeric:'tabular-nums' }}>{seconds}</text>
  </svg>
);

// Social + utility icons (Phase 1 community/profile)
const IcInstagram = (p) => <Icon {...p}>
  <rect x="3" y="3" width="18" height="18" rx="5"/>
  <circle cx="12" cy="12" r="4"/>
  <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/>
</Icon>;
const IcTwitterX = (p) => <Icon {...p}>
  <path d="M4 4l16 16M20 4L4 20"/>
</Icon>;
const IcSpotify = (p) => <Icon {...p}>
  <circle cx="12" cy="12" r="9.5"/>
  <path d="M7 10c2.5-1 7.5-1 10 1M7.5 13.5c2-0.7 6-0.7 8.5 0.6M8 16.5c1.7-0.5 4.7-0.5 6.5 0.5"/>
</Icon>;
const IcGlobe = (p) => <Icon {...p}>
  <circle cx="12" cy="12" r="9.5"/>
  <path d="M2.5 12h19M12 2.5c2.5 3 4 6 4 9.5s-1.5 6.5-4 9.5M12 2.5c-2.5 3-4 6-4 9.5s1.5 6.5 4 9.5"/>
</Icon>;
const IcTrophy = (p) => <Icon {...p}>
  <path d="M8 3h8v6a4 4 0 11-8 0V3z"/>
  <path d="M8 5H5a2 2 0 002 4M16 5h3a2 2 0 01-2 4"/>
  <path d="M10 13v3a2 2 0 002 2 2 2 0 002-2v-3M9 21h6"/>
</Icon>;
const IcCrown = (p) => <Icon {...p} fill="currentColor" stroke="currentColor" strokeWidth={1.2}>
  <path d="M3 18l1.5-9 4.5 5L12 6l3 8 4.5-5L21 18z" strokeLinejoin="round"/>
  <rect x="3" y="18" width="18" height="2.4" rx="0.6"/>
</Icon>;
const IcSettings = (p) => <Icon {...p}>
  <circle cx="12" cy="12" r="3"/>
  <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
</Icon>;
const IcSliders = (p) => <Icon {...p}>
  <line x1="4" y1="6" x2="20" y2="6"/>
  <line x1="4" y1="12" x2="20" y2="12"/>
  <line x1="4" y1="18" x2="20" y2="18"/>
  <circle cx="9" cy="6" r="2" fill="currentColor" stroke="currentColor"/>
  <circle cx="15" cy="12" r="2" fill="currentColor" stroke="currentColor"/>
  <circle cx="7" cy="18" r="2" fill="currentColor" stroke="currentColor"/>
</Icon>;
const IcUserPlus = (p) => <Icon {...p}>
  <circle cx="9" cy="8" r="4"/>
  <path d="M2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/>
  <path d="M19 8v6M22 11h-6"/>
</Icon>;
const IcUserCheck = (p) => <Icon {...p}>
  <circle cx="9" cy="8" r="4"/>
  <path d="M2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/>
  <path d="M16 12.5l2 2 4-4"/>
</Icon>;

// Brand social icons — logos auténticos en SVG simplificado
const IcTikTok = ({ size = 20, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={stroke} stroke="none">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.66a8.16 8.16 0 0 0 4.77 1.52V6.73a4.85 4.85 0 0 1-1-.04z"/>
  </svg>
);
const IcYoutube = ({ size = 20, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={stroke} stroke="none">
    <path d="M23 7.2a2.7 2.7 0 0 0-1.9-1.9C19.4 4.8 12 4.8 12 4.8s-7.4 0-9.1.5A2.7 2.7 0 0 0 1 7.2 28 28 0 0 0 .5 12 28 28 0 0 0 1 16.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 9.1.5 9.1.5s7.4 0 9.1-.5a2.7 2.7 0 0 0 1.9-1.9 28 28 0 0 0 .5-4.8 28 28 0 0 0-.5-4.8zM9.6 15.3V8.7l6.2 3.3-6.2 3.3z"/>
  </svg>
);
const IcLinkedIn = ({ size = 20, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={stroke} stroke="none">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/>
  </svg>
);
const IcGithub = ({ size = 20, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={stroke} stroke="none">
    <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58V21.06c-3.34.73-4.05-1.61-4.05-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.46-2.38 1.24-3.22-.13-.31-.54-1.53.11-3.18 0 0 1.01-.32 3.31 1.23a11.5 11.5 0 0 1 6.02 0c2.3-1.55 3.31-1.23 3.31-1.23.65 1.65.24 2.87.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.61-.01 2.91-.01 3.31 0 .32.22.69.83.58A12 12 0 0 0 12 .3z"/>
  </svg>
);
const IcInstagramBrand = ({ size = 20, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="0.6" fill={stroke} stroke="none"/>
  </svg>
);
const IcSpotifyBrand = ({ size = 20, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={stroke} stroke="none">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.32a.75.75 0 0 1-1.03.25c-2.83-1.73-6.4-2.12-10.6-1.16a.75.75 0 1 1-.34-1.46c4.6-1.05 8.55-.6 11.72 1.34.36.22.47.7.25 1.03zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.24-2-8.18-2.57-12-1.42a.94.94 0 1 1-.55-1.8c4.36-1.32 9.81-.69 13.53 1.6a.94.94 0 0 1 .31 1.31zm.13-3.4c-3.88-2.3-10.28-2.51-13.99-1.39a1.13 1.13 0 1 1-.65-2.16c4.25-1.29 11.32-1.04 15.79 1.61a1.13 1.13 0 0 1-1.15 1.94z"/>
  </svg>
);
const IcXBrand = ({ size = 20, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={stroke} stroke="none">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
  </svg>
);

Object.assign(window, {
  Icon, IcHome, IcCompass, IcSpark, IcUsers, IcUser, IcBell, IcPlay, IcPause,
  IcCheck, IcPlus, IcChevR, IcChevL, IcChevD, IcClose, IcLock, IcUnlock, IcShield, IcClock,
  IcMoreV, IcMoreH, IcRefresh,
  IcFlame, IcTarget, IcBook, IcBrain, IcLeaf, IcDumbbell, IcEdit, IcEye, IcWind,
  IcHeart, IcZap, IcMic, IcSearch, IcTrend,
  IcBookmark, IcBookmarkFill, IcCalendar,
  IcShare, IcLink, IcMessage, IcMail, IcList, IcSparkles,
  IcMoon, IcGauge,
  IcSkipPrev, IcSkipNext, IcSkipBack, IcSkipForward,
  IcInstagram, IcTwitterX, IcSpotify, IcGlobe, IcTrophy, IcCrown, IcSettings,
  IcSliders, IcUserPlus, IcUserCheck,
  IcTikTok, IcYoutube, IcLinkedIn, IcGithub,
  IcInstagramBrand, IcSpotifyBrand, IcXBrand,
});
