'use strict';

// Domains that block iframe embedding (X-Frame-Options / CSP frame-ancestors).
// All major social networks fall here — we show a preview card instead.
var _IAB_BLOCKED = new Set([
  'instagram.com', 'www.instagram.com',
  'x.com', 'www.x.com', 'twitter.com', 'www.twitter.com',
  'tiktok.com', 'www.tiktok.com',
  'linkedin.com', 'www.linkedin.com',
  'youtube.com', 'www.youtube.com', 'youtu.be',
  'open.spotify.com', 'spotify.com',
  'github.com', 'www.github.com',
]);

function _iabDomain(url) {
  try { return new URL(url).hostname; } catch (_) { return url; }
}

function _iabSocialLabel(id) {
  return ({
    instagram: 'Instagram', twitter: 'X', tiktok: 'TikTok',
    youtube: 'YouTube', spotify: 'Spotify', linkedin: 'LinkedIn', github: 'GitHub',
  })[id] || id;
}

function _iabIcon(id) {
  const map = {
    instagram: typeof IcInstagramBrand !== 'undefined' ? IcInstagramBrand : IcGlobe,
    twitter:   typeof IcXBrand        !== 'undefined' ? IcXBrand        : IcGlobe,
    spotify:   typeof IcSpotifyBrand  !== 'undefined' ? IcSpotifyBrand  : IcGlobe,
    tiktok:    typeof IcTikTok        !== 'undefined' ? IcTikTok        : IcGlobe,
    youtube:   typeof IcYoutube       !== 'undefined' ? IcYoutube       : IcGlobe,
    linkedin:  typeof IcLinkedIn      !== 'undefined' ? IcLinkedIn      : IcGlobe,
    github:    typeof IcGithub        !== 'undefined' ? IcGithub        : IcGlobe,
  };
  return (id && map[id]) || IcGlobe;
}

function InAppBrowserSheet({ url, socialId, socialLabel, handle, onClose }) {
  const domain = _iabDomain(url);
  const isBlocked = _IAB_BLOCKED.has(domain);
  const isHttps = url.startsWith('https://');
  const cleanHandle = handle ? String(handle).replace(/^@/, '') : null;
  const netName = socialLabel || (socialId ? _iabSocialLabel(socialId) : domain);
  const brand = (typeof _getSocialBrand === 'function' && socialId)
    ? _getSocialBrand(socialId)
    : { bg: 'rgba(61,255,209,0.14)', glow: 'rgba(61,255,209,0.4)', border: '0.5px solid rgba(61,255,209,0.20)' };
  const Ic = _iabIcon(socialId);
  // Spotify is the only social brand that uses dark text on its green bg
  const ctaTextColor = socialId === 'spotify' ? '#0D1210' : '#ffffff';

  const sheetRef = React.useRef(null);
  const touchStartY = React.useRef(null);

  const openExternal = () => {
    if (typeof window !== 'undefined' && window.open) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (touchStartY.current === null || !sheetRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - touchStartY.current);
    sheetRef.current.style.transform = `translateY(${Math.min(dy, 280)}px)`;
  };
  const onTouchEnd = (e) => {
    const dy = touchStartY.current !== null
      ? e.changedTouches[0].clientY - touchStartY.current : 0;
    touchStartY.current = null;
    if (sheetRef.current) sheetRef.current.style.transform = '';
    if (dy > 110) onClose();
  };

  const overlayRoot = typeof document !== 'undefined'
    ? document.getElementById('mtx-overlay-root') : null;
  if (!overlayRoot) return null;

  return ReactDOM.createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 162, display: 'flex', alignItems: 'flex-end' }}>
      <style>{`@keyframes iabUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      }}/>

      {/* Sheet */}
      <div ref={sheetRef}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', height: '94%',
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(180deg, rgba(14,19,17,0.99) 0%, rgba(9,13,12,1) 100%)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          border: '0.5px solid rgba(255,255,255,0.08)', borderBottom: 'none',
          animation: 'iabUp .30s cubic-bezier(.22,1,.36,1) both',
          overflow: 'hidden',
          transition: 'transform 0.08s linear',
        }}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 6, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header bar */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px 12px',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          {/* Domain pill */}
          <div style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 99,
            background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: isHttps ? '#3dffd1' : '#ff8b6a',
              boxShadow: isHttps ? '0 0 5px rgba(61,255,209,0.65)' : '0 0 5px rgba(255,139,106,0.65)',
            }}/>
            <span style={{
              fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{domain}</span>
          </div>

          {/* Open external */}
          <button onClick={openExternal} className="mtx-tap"
            aria-label="Abrir en navegador" tabIndex={0}
            style={{
              flexShrink: 0, cursor: 'pointer', appearance: 'none', padding: 0,
              width: 36, height: 36, borderRadius: 11,
              background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <IcShare size={15} stroke="var(--ink-3)" strokeWidth={1.7}/>
          </button>

          {/* Close */}
          <button onClick={onClose} className="mtx-tap"
            aria-label="Cerrar navegador" tabIndex={0}
            style={{
              flexShrink: 0, cursor: 'pointer', appearance: 'none', padding: 0,
              width: 36, height: 36, borderRadius: 11,
              background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <IcClose size={16} stroke="var(--ink-3)" strokeWidth={2}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflow: isBlocked ? 'hidden' : 'auto' }}>
          {isBlocked ? (
            /* Preview card — social networks block iframes */
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', padding: '0 28px',
            }}>
              {/* Brand icon */}
              <div style={{
                width: 96, height: 96, borderRadius: 26, marginBottom: 20, flexShrink: 0,
                background: brand.bg,
                border: brand.border !== '0' ? brand.border : 'none',
                boxShadow: `0 0 56px ${brand.glow}, 0 8px 24px rgba(0,0,0,0.5)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ic size={46} stroke="#ffffff" strokeWidth={1.5}/>
              </div>

              {cleanHandle && (
                <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--ink-1)', marginBottom: 4, letterSpacing: '-0.02em', textAlign: 'center' }}>
                  @{cleanHandle}
                </div>
              )}

              <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 32, textAlign: 'center' }}>
                {netName}
              </div>

              {/* Primary CTA */}
              <button onClick={openExternal} className="mtx-tap" tabIndex={0}
                style={{
                  width: '100%', padding: '14.5px 0', borderRadius: 16, border: 'none',
                  background: brand.bg, cursor: 'pointer', appearance: 'none',
                  fontSize: 15.5, fontWeight: 800, color: ctaTextColor, letterSpacing: '-0.01em',
                  boxShadow: `0 4px 28px ${brand.glow}`,
                  marginBottom: 10,
                }}>
                Abrir en {netName}
              </button>

              {/* Secondary */}
              <button onClick={openExternal} className="mtx-tap" tabIndex={0}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', appearance: 'none',
                  fontSize: 13.5, fontWeight: 600, color: 'var(--ink-3)', padding: '6px 0',
                }}>
                Abrir en el navegador
              </button>

              {/* Info note */}
              <div style={{
                marginTop: 24, padding: '11px 14px', borderRadius: 11, textAlign: 'center',
                background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  {netName} no permite previsualización<br/>integrada. Se abrirá en tu app nativa.
                </div>
              </div>
            </div>
          ) : (
            /* Generic iframe for non-blocked URLs */
            <iframe
              src={url} title={domain}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#fff' }}
            />
          )}
        </div>
      </div>
    </div>,
    overlayRoot
  );
}

Object.assign(window, { InAppBrowserSheet });
