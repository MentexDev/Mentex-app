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

Object.assign(window, {
  Icon, IcHome, IcCompass, IcSpark, IcUsers, IcUser, IcBell, IcPlay, IcPause,
  IcCheck, IcPlus, IcChevR, IcChevL, IcChevD, IcClose, IcLock, IcShield, IcClock,
  IcFlame, IcTarget, IcBook, IcBrain, IcLeaf, IcDumbbell, IcEdit, IcEye, IcWind,
  IcHeart, IcZap, IcMic, IcSearch, IcTrend,
  IcBookmark, IcBookmarkFill, IcCalendar,
});
