// settings-flow.jsx — Configuraciones Mentex
// ─────────────────────────────────────────────────────────────────────────────
// Arquitectura: SettingsScreen (main) → sub-pantallas por categoría
// Categorías: Cuenta · Seguridad · Notificaciones · Privacidad · Apariencia ·
//             Preferencias · Rutinas · Soporte · Términos · Cerrar sesión
// ─────────────────────────────────────────────────────────────────────────────

// ── useSettingsData ───────────────────────────────────────────────────────────
function useSettingsData() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const h = () => force();
    window.addEventListener('mtx:profile-changed', h);
    return () => window.removeEventListener('mtx:profile-changed', h);
  }, []);

  const profile   = window.__mtxProfile    ? window.__mtxProfile.get()    : null;
  const isPremium = window.__mtxIsPremium  ? window.__mtxIsPremium()      : true;
  const ob        = window.__mtxOnboarding ? window.__mtxOnboarding.get() : null;
  const ans       = (ob && ob.answers) || {};
  const auth      = window.__mtxAuth       ? window.__mtxAuth.get()       : null;
  const email     = (auth && auth.user && auth.user.email) || '—';

  const daysLeft = (() => {
    if (!ans.trialStartedAt) return null;
    const elapsed = (Date.now() - ans.trialStartedAt) / 86400000;
    return Math.max(0, Math.ceil(7 - elapsed));
  })();

  const planLabel = ans.selectedPlan === 'annual'  ? 'Anual · Mejor valor'
                  : ans.selectedPlan === 'monthly' ? 'Mensual'
                  : 'Gratuito';

  return { profile, isPremium, email, daysLeft, planLabel, plan: ans.selectedPlan };
}

// ── ProfileHeroCard ───────────────────────────────────────────────────────────
function ProfileHeroCard({ profile, isPremium, onEdit }) {
  if (!profile) return null;
  const accent = profile.accent || 'var(--neon)';
  const xpPct  = Math.min(1, profile.xp / (profile.xpToNext || 500));

  return (
    <div style={{
      margin: '0 16px',
      padding: '20px 18px 16px',
      borderRadius: 16,
      background: 'linear-gradient(180deg, rgba(61,255,209,0.04) 0%, rgba(3,6,5,0.32) 100%)',
      border: '0.5px solid rgba(61,255,209,0.10)',
      boxShadow: 'inset 0 1px 0 rgba(61,255,209,0.05)',
    }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            background: profile.avatar
              ? `url(${profile.avatar}) center/cover`
              : `radial-gradient(60% 60% at 50% 30%, ${accent}55, ${accent}1a 70%, transparent)`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            border: '2.5px solid #050706',
            boxShadow: `0 0 0 1.5px ${accent}50, 0 0 20px ${accent}28`,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accent, fontSize: 28, fontWeight: 700, fontFamily: 'var(--ff-display)',
          }}>
            {!profile.avatar && profile.initial}
          </div>
          <div style={{
            position: 'absolute', bottom: -3, right: -6,
            minWidth: 28, height: 22, padding: '0 7px', borderRadius: 999,
            background: 'linear-gradient(135deg, #FFD66B, #ff8b6a)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#0a1410', fontSize: 11, fontWeight: 800, fontFamily: 'var(--ff-display)',
            boxShadow: '0 0 16px rgba(255,214,107,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
            border: '2px solid #050706',
          }}>
            {profile.level}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
          <div style={{
            fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em',
            color: 'var(--ink-1)', lineHeight: 1.2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            fontFamily: 'var(--ff-display)',
          }}>{profile.name}</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', marginTop: 2, letterSpacing: '-0.01em' }}>
            {profile.handle}
          </div>
          <div style={{ fontSize: 11, color: accent, marginTop: 4, letterSpacing: '-0.005em', fontWeight: 500 }}>
            {profile.levelLabel}
          </div>
          <div style={{
            marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 999,
            background: isPremium ? 'rgba(255,214,107,0.12)' : 'rgba(255,255,255,0.06)',
            border: `0.5px solid ${isPremium ? 'rgba(255,214,107,0.28)' : 'rgba(255,255,255,0.09)'}`,
          }}>
            {isPremium
              ? <><span style={{ color: '#FFD66B', display: 'inline-flex', alignItems: 'center' }}><IcCrown size={11} strokeWidth={1.8}/></span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#FFD66B', letterSpacing: '-0.01em' }}>Premium</span></>
              : <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.42)', letterSpacing: '-0.01em' }}>Plan gratuito</span>
            }
          </div>
        </div>
      </div>

      {/* XP bar */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Experiencia</span>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>{profile.xp} / {profile.xpToNext} XP</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2, width: `${(xpPct * 100).toFixed(1)}%`,
            background: `linear-gradient(90deg, ${accent}bb, ${accent})`,
            boxShadow: `0 0 8px ${accent}70`,
            transition: 'width .6s cubic-bezier(0.22,1,0.36,1)',
          }}/>
        </div>
      </div>

      {/* Editar perfil */}
      <button onClick={onEdit} className="mtx-tap" aria-label="Editar perfil" style={{
        marginTop: 14, width: '100%', height: 38, borderRadius: 10,
        background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.09)',
        color: 'var(--ink-2)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.01em', fontFamily: 'var(--ff-sans)',
      }}>
        <IcEdit size={14} stroke="currentColor" strokeWidth={1.8}/>
        Editar perfil
      </button>
    </div>
  );
}

// ── PlanCard ──────────────────────────────────────────────────────────────────
function PlanCard({ isPremium, planLabel, daysLeft, onUpgrade, onGestionar }) {
  if (isPremium) {
    const renewalText = daysLeft !== null
      ? `${planLabel} · Renueva en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`
      : planLabel;
    return (
      <div style={{
        margin: '0 16px', padding: '17px 18px', borderRadius: 16,
        background: 'linear-gradient(145deg, rgba(61,255,209,0.07) 0%, rgba(3,10,8,0.55) 100%)',
        border: '0.5px solid rgba(61,255,209,0.18)',
        boxShadow: '0 0 40px rgba(61,255,209,0.06), inset 0 1px 0 rgba(61,255,209,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--neon)', display: 'inline-flex', alignItems: 'center' }}><IcCrown size={15} strokeWidth={1.5}/></span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--neon)', fontFamily: 'var(--ff-display)', letterSpacing: '-0.025em' }}>Mentex Premium</span>
          </div>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color: '#0D1210',
            background: 'var(--neon)', border: 'none',
            padding: '3px 9px', borderRadius: 999,
            boxShadow: '0 0 10px rgba(61,255,209,0.4)',
          }}>ACTIVO</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', marginBottom: 14, lineHeight: 1.55, letterSpacing: '-0.01em' }}>{renewalText}</div>
        <div style={{ height: '0.5px', background: 'rgba(61,255,209,0.12)', marginBottom: 12 }}/>
        <button onClick={onGestionar} className="mtx-tap" tabIndex={0} style={{
          width: '100%', height: 34, borderRadius: 9, cursor: 'pointer',
          background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.09)',
          color: 'rgba(255,255,255,0.52)', fontSize: 12, fontWeight: 600,
          letterSpacing: '-0.01em', fontFamily: 'var(--ff-sans)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
          Gestionar suscripción
          <IcChevR size={11} stroke="rgba(255,255,255,0.30)" strokeWidth={2.2}/>
        </button>
      </div>
    );
  }

  return (
    <div style={{
      margin: '0 16px', padding: '18px', borderRadius: 16,
      background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink-2)', fontFamily: 'var(--ff-display)', letterSpacing: '-0.02em', marginBottom: 5 }}>Plan gratuito</div>
      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.36)', marginBottom: 15, lineHeight: 1.55, letterSpacing: '-0.01em' }}>
        Desbloquea 13 contenidos exclusivos y todas las funciones premium de Mentex
      </div>
      <button onClick={onUpgrade} className="mtx-tap" style={{
        width: '100%', height: 40, borderRadius: 10,
        background: 'linear-gradient(135deg, var(--neon) 0%, rgba(61,255,209,0.88) 100%)',
        border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, color: '#050706',
        fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
        boxShadow: '0 0 24px rgba(61,255,209,0.28)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <IcCrown size={14} stroke="#050706" strokeWidth={2.2}/>
        Activar Mentex Premium
      </button>
    </div>
  );
}

// ── Primitivos de layout ──────────────────────────────────────────────────────
function SectionLabel({ label, topSpacing = 28 }) {
  return (
    <div style={{
      paddingTop: topSpacing, paddingLeft: 20, paddingRight: 20, paddingBottom: 9,
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.13em',
      color: 'rgba(255,255,255,0.24)', textTransform: 'uppercase', fontFamily: 'var(--ff-sans)',
    }}>{label}</div>
  );
}

// Contenedor de lista de cards individuales (gap entre ellas)
function CardList({ children, style }) {
  return (
    <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {children}
    </div>
  );
}

// Tarjeta de categoría — patrón onboarding. icon = emoji string o componente SVG.
function CategoryRow({ icon, label, subtitle, badge, onTap, danger = false }) {
  const isEmoji = typeof icon === 'string';
  return (
    <button onClick={onTap} className="mtx-tap" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap?.(); } }}
      style={{
        width: '100%', appearance: 'none', cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px',
        borderRadius: 13,
        background: danger
          ? 'linear-gradient(180deg, rgba(255,80,80,0.09), rgba(255,80,80,0.03))'
          : 'linear-gradient(180deg, rgba(61,255,209,0.04) 0%, rgba(3,6,5,0.32) 100%)',
        border: danger ? '0.5px solid rgba(255,90,90,0.20)' : '0.5px solid rgba(61,255,209,0.10)',
        boxShadow: danger ? 'none' : 'inset 0 1px 0 rgba(61,255,209,0.05)',
        fontFamily: 'var(--ff-sans)',
        transition: 'all .18s ease',
      }}
    >
      {/* Caja de icono — siempre neutral oscura, el emoji/icono aporta el color */}
      {icon && (
        <div style={{
          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
          background: 'rgba(255,255,255,0.05)',
          border: '0.5px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isEmoji
            ? <span style={{ fontSize: 20, lineHeight: 1, userSelect: 'none' }}>{icon}</span>
            : React.createElement(icon, { size: 18, stroke: danger ? '#ff6b6b' : 'var(--ink-2)', strokeWidth: 1.7 })
          }
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: danger ? '#ff6b6b' : 'var(--ink-2)', letterSpacing: '-0.005em', marginBottom: 1 }}>{label}</div>
        {subtitle && (
          <div style={{ fontSize: 11.5, lineHeight: 1.35, color: 'var(--ink-3)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
        )}
      </div>
      {badge && (
        <span style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.1)', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', flexShrink: 0 }}>{badge}</span>
      )}
      {!danger && <IcChevR size={13} stroke="rgba(255,255,255,0.22)" strokeWidth={2.2}/>}
    </button>
  );
}

// Card de detalle — mismo patrón onboarding, con valor/acción en la derecha
function DetailRow({ icon: Ic, iconBg, label, subtitle, value, actionLabel, onTap }) {
  return (
    <button onClick={onTap} className="mtx-tap" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap?.(); } }}
      style={{
        width: '100%', appearance: 'none', cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px',
        borderRadius: 13,
        background: 'linear-gradient(180deg, rgba(61,255,209,0.04) 0%, rgba(3,6,5,0.32) 100%)',
        border: '0.5px solid rgba(61,255,209,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(61,255,209,0.05)',
        fontFamily: 'var(--ff-sans)',
        transition: 'all .18s ease',
      }}
    >
      {Ic && (
        <div style={{
          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
          background: iconBg || 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ic size={18} stroke="var(--ink-2)" strokeWidth={1.7}/>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)', letterSpacing: '-0.005em', marginBottom: 1 }}>{label}</div>
        {subtitle && (
          <div style={{ fontSize: 11.5, lineHeight: 1.35, color: 'var(--ink-3)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {value && <span style={{ fontSize: 12.5, color: 'var(--ink-3)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>}
        {actionLabel
          ? <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(61,255,209,0.07)', border: '0.5px solid rgba(61,255,209,0.22)', fontSize: 11.5, fontWeight: 600, color: 'var(--neon)' }}>{actionLabel}</span>
          : <IcChevR size={13} stroke="rgba(255,255,255,0.22)" strokeWidth={2.2}/>
        }
      </div>
    </button>
  );
}

// ── Sub-pantalla wrapper (header + animación slide) ───────────────────────────
function SubScreen({ title, onBack, children }) {
  return (
    <>
      <style>{`
        @keyframes mtx-sub-in {
          from { transform: translateX(32px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 110,
        background: '#080B0A',
        display: 'flex', flexDirection: 'column',
        animation: 'mtx-sub-in .3s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0, paddingTop: 60,
          background: 'linear-gradient(180deg, rgba(5,7,7,0.98) 0%, rgba(8,11,10,0.95) 100%)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onBack} aria-label="Volver" className="mtx-tap" style={{
              width: 36, height: 36, borderRadius: 999, flexShrink: 0,
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'var(--ink-1)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IcChevL size={15} stroke="currentColor" strokeWidth={1.9}/>
            </button>
            <h1 style={{
              flex: 1, textAlign: 'center', margin: 0, fontSize: 16, fontWeight: 600,
              color: 'var(--ink-1)', letterSpacing: '-0.02em', fontFamily: 'var(--ff-sans)',
            }}>{title}</h1>
            <div style={{ width: 36, flexShrink: 0 }}/>
          </div>
        </div>
        {/* Cuerpo */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 60 }}>
          {children}
        </div>
      </div>
    </>
  );
}

// Sub-pantalla "próximamente" genérica
function ComingSoonSubScreen({ title, icon: Ic, iconBg, onBack }) {
  return (
    <SubScreen title={title} onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 22,
          background: iconBg || 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {Ic && <Ic size={32} stroke="rgba(255,255,255,0.3)" strokeWidth={1.4}/>}
        </div>
        <div style={{ textAlign: 'center', padding: '0 32px' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.02em', fontFamily: 'var(--ff-display)', marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.36)', lineHeight: 1.6, letterSpacing: '-0.01em' }}>
            Esta sección estará disponible próximamente. Estamos construyendo algo que vale la pena esperar.
          </div>
        </div>
        <div style={{
          marginTop: 8, padding: '5px 14px', borderRadius: 999,
          background: 'rgba(61,255,209,0.07)', border: '0.5px solid rgba(61,255,209,0.18)',
          fontSize: 11.5, fontWeight: 600, color: 'var(--neon)', letterSpacing: '0.05em',
        }}>PRÓXIMAMENTE</div>
      </div>
    </SubScreen>
  );
}

// ── CeLoadingDots (inline spinner para botones de email/pw flow) ───────────────
function CeLoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      <style>{`@keyframes ceDot{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`}</style>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'currentColor', display: 'inline-block',
          animation: `ceDot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }}/>
      ))}
    </span>
  );
}

// ── ChangeEmailSheet ───────────────────────────────────────────────────────────
function ChangeEmailSheet({ currentEmail, onClose, onSuccess }) {
  const root = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;

  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [pw, setPw] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [focusPw, setFocusPw] = React.useState(false);

  const [newEmail, setNewEmail] = React.useState('');
  const [focusEmail, setFocusEmail] = React.useState(false);

  const [otp, setOtp] = React.useState(['', '', '', '', '', '']);
  const otpRef0 = React.useRef(null);
  const otpRef1 = React.useRef(null);
  const otpRef2 = React.useRef(null);
  const otpRef3 = React.useRef(null);
  const otpRef4 = React.useRef(null);
  const otpRef5 = React.useRef(null);
  const otpRefs = [otpRef0, otpRef1, otpRef2, otpRef3, otpRef4, otpRef5];

  const [resendCooldown, setResendCooldown] = React.useState(0);
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  if (!root) return null;

  const inputWrap = (focused, hasErr) => ({
    position: 'relative', display: 'flex', alignItems: 'center',
    padding: '0 14px', height: 50, borderRadius: 13,
    background: 'rgba(255,255,255,0.03)',
    border: `0.5px solid ${hasErr ? 'rgba(255,74,110,0.55)' : focused ? 'rgba(61,255,209,0.35)' : 'rgba(255,255,255,0.09)'}`,
    boxShadow: focused ? '0 0 0 3px rgba(61,255,209,0.07)' : 'none',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  });
  const inputStyle = {
    flex: 1, background: 'none', border: 'none', outline: 'none', padding: 0,
    fontSize: 14.5, fontWeight: 500, color: 'var(--ink-1)',
    fontFamily: 'var(--ff-sans)', letterSpacing: '-0.01em',
  };

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim());
  const otpFull = otp.join('');

  const handleStep1 = () => {
    if (!pw || loading) return;
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (pw.length < 3) { setError('Contraseña incorrecta. Inténtalo de nuevo.'); return; }
      setStep(2);
    }, 1200);
  };

  const handleStep2 = () => {
    if (!isValidEmail(newEmail) || loading) return;
    if (newEmail.trim().toLowerCase() === (currentEmail || '').toLowerCase()) {
      setError('El nuevo email debe ser diferente al actual.'); return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResendCooldown(30);
      setStep(3);
    }, 1200);
  };

  const handleStep3 = () => {
    if (otpFull.length < 6 || loading) return;
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (otpFull === '000000') { setError('Código incorrecto. Verifica tu correo.'); return; }
      setStep(4);
      if (window.__mtxAuth && typeof window.__mtxAuth.updateEmail === 'function') {
        window.__mtxAuth.updateEmail(newEmail.trim());
      }
      onSuccess(newEmail.trim());
    }, 1200);
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setResendCooldown(30);
    setOtp(['', '', '', '', '', '']);
    otpRef0.current && otpRef0.current.focus();
  };

  const handleOtpChange = (idx, val) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) {
      const next = [...otp]; next[idx] = ''; setOtp(next); return;
    }
    if (digits.length >= 6 && idx === 0) {
      const arr = digits.slice(0, 6).split('');
      setOtp(arr);
      otpRefs[5].current && otpRefs[5].current.focus();
      return;
    }
    const next = [...otp]; next[idx] = digits[0]; setOtp(next);
    if (digits[0] && idx < 5) otpRefs[idx + 1].current && otpRefs[idx + 1].current.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs[idx - 1].current && otpRefs[idx - 1].current.focus();
    }
  };

  const stepTitles = ['', 'Confirma tu contraseña', 'Nuevo correo electrónico', 'Verifica tu correo', '¡Email actualizado!'];
  const stepDescs  = [
    '',
    'Por seguridad, confirma tu contraseña actual antes de cambiar tu email.',
    `Tu email actual es ${currentEmail || '—'}. Ingresa la nueva dirección.`,
    `Enviamos un código de 6 dígitos a ${newEmail || '...'}. Revisa tu bandeja de entrada.`,
    '',
  ];

  const canStep1  = !!pw && !loading;
  const canStep2  = isValidEmail(newEmail) && !loading;
  const canStep3  = otpFull.length === 6 && !loading;

  return ReactDOM.createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 165, display: 'flex', alignItems: 'flex-end' }}>
      <style>{`@keyframes ceMailUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>
      <div role="button" tabIndex={-1} aria-label="Cerrar"
        onClick={step < 4 ? onClose : undefined}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      />
      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative', zIndex: 1, width: '100%',
        background: 'linear-gradient(180deg, rgba(5,7,7,0.99) 0%, rgba(8,11,10,1) 100%)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: '0.5px solid rgba(255,255,255,0.09)', borderBottom: 'none',
        padding: '12px 20px 44px',
        animation: 'ceMailUp .32s cubic-bezier(.22,1,.36,1) both',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}/>
        </div>

        {/* Step dots */}
        {step < 4 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 3, borderRadius: 999,
                width: i === step ? 20 : 8,
                background: i <= step ? 'var(--neon)' : 'rgba(255,255,255,0.12)',
                boxShadow: i === step ? '0 0 8px rgba(61,255,209,0.6)' : 'none',
                transition: 'all 0.3s ease',
              }}/>
            ))}
          </div>
        )}

        {/* Icon */}
        {step < 4 ? (
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 18px',
            background: 'rgba(61,255,209,0.10)', border: '0.5px solid rgba(61,255,209,0.25)',
            boxShadow: '0 0 32px rgba(61,255,209,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {step === 1
              ? <IcLock size={28} stroke="var(--neon)" strokeWidth={1.6}/>
              : <IcMail size={28} stroke="var(--neon)" strokeWidth={1.6}/>}
          </div>
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: 24, margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(61,255,209,0.25) 0%, rgba(61,255,209,0.08) 100%)',
            border: '0.5px solid rgba(61,255,209,0.4)',
            boxShadow: '0 0 40px rgba(61,255,209,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcCheck size={34} stroke="var(--neon)" strokeWidth={2.2}/>
          </div>
        )}

        {/* Title + description */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 8 }}>
            {stepTitles[step]}
          </div>
          {step < 4 && stepDescs[step] && (
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>{stepDescs[step]}</div>
          )}
          {step === 4 && (
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
              Tu email fue actualizado a<br/>
              <span style={{ color: 'var(--neon)', fontWeight: 600 }}>{newEmail}</span>
            </div>
          )}
        </div>

        {/* ─ Step 1: confirm current password ─ */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={inputWrap(focusPw, !!error)}>
              <IcLock size={16} stroke="rgba(255,255,255,0.25)" strokeWidth={1.7} style={{ flexShrink: 0, marginRight: 10 }}/>
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={e => { setPw(e.target.value); setError(''); }}
                onFocus={() => setFocusPw(true)}
                onBlur={() => setFocusPw(false)}
                onKeyDown={e => e.key === 'Enter' && handleStep1()}
                placeholder="Tu contraseña actual"
                autoComplete="current-password"
                style={inputStyle}
              />
              <button onClick={() => setShowPw(p => !p)} tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowPw(p => !p); } }}
                aria-label={showPw ? 'Ocultar' : 'Mostrar'}
                style={{ flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none', padding: '4px 0 4px 8px', display: 'flex', alignItems: 'center' }}>
                <IcEye size={17} stroke={showPw ? 'var(--neon)' : 'rgba(255,255,255,0.25)'} strokeWidth={1.7}/>
              </button>
            </div>
            {error && <div style={{ fontSize: 11.5, color: '#FF4A6E', paddingLeft: 2 }}>{error}</div>}
            <button onClick={handleStep1} disabled={!canStep1} className="mtx-tap" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStep1(); } }}
              style={{
                width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: canStep1 ? 'pointer' : 'default',
                background: canStep1 ? 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)' : 'rgba(255,255,255,0.05)',
                color: canStep1 ? '#0D1210' : 'rgba(255,255,255,0.22)',
                fontSize: 15, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
                boxShadow: canStep1 ? '0 4px 24px rgba(61,255,209,0.28)' : 'none',
                transition: 'all 0.22s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {loading ? <CeLoadingDots/> : 'Continuar'}
            </button>
          </div>
        )}

        {/* ─ Step 2: new email ─ */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={inputWrap(focusEmail, !!error)}>
              <IcMail size={16} stroke="rgba(255,255,255,0.25)" strokeWidth={1.7} style={{ flexShrink: 0, marginRight: 10 }}/>
              <input
                type="email"
                value={newEmail}
                onChange={e => { setNewEmail(e.target.value); setError(''); }}
                onFocus={() => setFocusEmail(true)}
                onBlur={() => setFocusEmail(false)}
                onKeyDown={e => e.key === 'Enter' && isValidEmail(newEmail) && handleStep2()}
                placeholder="nuevo@email.com"
                autoComplete="email"
                autoCapitalize="none"
                style={inputStyle}
              />
              {isValidEmail(newEmail) && (
                <IcCheck size={16} stroke="var(--neon)" strokeWidth={2.2} style={{ flexShrink: 0, marginLeft: 4 }}/>
              )}
            </div>
            {error && <div style={{ fontSize: 11.5, color: '#FF4A6E', paddingLeft: 2 }}>{error}</div>}
            <button onClick={handleStep2} disabled={!canStep2} className="mtx-tap" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStep2(); } }}
              style={{
                width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: canStep2 ? 'pointer' : 'default',
                background: canStep2 ? 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)' : 'rgba(255,255,255,0.05)',
                color: canStep2 ? '#0D1210' : 'rgba(255,255,255,0.22)',
                fontSize: 15, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
                boxShadow: canStep2 ? '0 4px 24px rgba(61,255,209,0.28)' : 'none',
                transition: 'all 0.22s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {loading ? <CeLoadingDots/> : 'Enviar código de verificación'}
            </button>
          </div>
        )}

        {/* ─ Step 3: OTP ─ */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={i === 0 ? 6 : 1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  style={{
                    width: 44, height: 52, borderRadius: 12, textAlign: 'center',
                    fontSize: 20, fontWeight: 700, fontFamily: 'var(--ff-display)',
                    color: 'var(--ink-1)',
                    background: 'rgba(255,255,255,0.04)',
                    border: `0.5px solid ${digit ? 'rgba(61,255,209,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: digit ? '0 0 10px rgba(61,255,209,0.12)' : 'none',
                    outline: 'none', caretColor: 'transparent',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                />
              ))}
            </div>
            {error && <div style={{ fontSize: 11.5, color: '#FF4A6E', textAlign: 'center' }}>{error}</div>}
            <button onClick={handleStep3} disabled={!canStep3} className="mtx-tap" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStep3(); } }}
              style={{
                width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: canStep3 ? 'pointer' : 'default',
                background: canStep3 ? 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)' : 'rgba(255,255,255,0.05)',
                color: canStep3 ? '#0D1210' : 'rgba(255,255,255,0.22)',
                fontSize: 15, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
                boxShadow: canStep3 ? '0 4px 24px rgba(61,255,209,0.28)' : 'none',
                transition: 'all 0.22s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {loading ? <CeLoadingDots/> : 'Verificar código'}
            </button>
            <button onClick={handleResend} disabled={resendCooldown > 0} tabIndex={0}
              onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && resendCooldown === 0) { e.preventDefault(); handleResend(); } }}
              style={{
                background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer',
                textAlign: 'center', fontSize: 13.5, fontWeight: 600,
                color: resendCooldown > 0 ? 'rgba(255,255,255,0.22)' : 'var(--neon)',
                fontFamily: 'var(--ff-sans)', letterSpacing: '-0.01em',
              }}>
              {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
            </button>
          </div>
        )}

        {/* ─ Step 4: success ─ */}
        {step === 4 && (
          <button onClick={onClose} className="mtx-tap" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
            style={{
              width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)',
              color: '#0D1210', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
              boxShadow: '0 4px 24px rgba(61,255,209,0.28)',
            }}>
            Listo
          </button>
        )}
      </div>
    </div>,
    root
  );
}

// ── ChangePasswordSheet ────────────────────────────────────────────────────────
function ChangePasswordSheet({ onClose, onSuccess }) {
  const root = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;

  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [pwActual,   setPwActual]   = React.useState('');
  const [showActual, setShowActual] = React.useState(false);
  const [focusActual, setFocusActual] = React.useState(false);

  const [pwNueva,     setPwNueva]     = React.useState('');
  const [pwConfirm,   setPwConfirm]   = React.useState('');
  const [showNueva,   setShowNueva]   = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [focusNueva,  setFocusNueva]  = React.useState(false);
  const [focusConfirm, setFocusConfirm] = React.useState(false);

  if (!root) return null;

  const strength   = _stgPwStrength(pwNueva);
  const strLabel   = _STG_STR_LABEL[strength] || '';
  const strColor   = _STG_STR_COLOR[strength] || 'transparent';
  const pwMatch    = pwNueva.length > 0 && pwConfirm.length > 0 && pwNueva === pwConfirm;
  const pwMismatch = pwConfirm.length > 0 && pwNueva !== pwConfirm;

  const inputWrap = (focused, hasErr) => ({
    position: 'relative', display: 'flex', alignItems: 'center',
    padding: '0 14px', height: 50, borderRadius: 13,
    background: 'rgba(255,255,255,0.03)',
    border: `0.5px solid ${hasErr ? 'rgba(255,74,110,0.55)' : focused ? 'rgba(61,255,209,0.35)' : 'rgba(255,255,255,0.09)'}`,
    boxShadow: focused ? '0 0 0 3px rgba(61,255,209,0.07)' : 'none',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  });
  const inputStyle = {
    flex: 1, background: 'none', border: 'none', outline: 'none', padding: 0,
    fontSize: 14.5, fontWeight: 500, color: 'var(--ink-1)',
    fontFamily: 'var(--ff-sans)', letterSpacing: '-0.01em',
  };
  const eyeBtn = (show, toggle) => (
    <button onClick={toggle} tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
      aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      style={{ flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none', padding: '4px 0 4px 8px', display: 'flex', alignItems: 'center' }}>
      <IcEye size={17} stroke={show ? 'var(--neon)' : 'rgba(255,255,255,0.25)'} strokeWidth={1.7}/>
    </button>
  );

  const handleStep1 = () => {
    if (!pwActual || loading) return;
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (pwActual.length < 3) { setError('Contraseña incorrecta. Inténtalo de nuevo.'); return; }
      setStep(2);
    }, 1200);
  };

  const handleStep2 = () => {
    if (!pwMatch || pwNueva.length < 8 || loading) return;
    setError('');
    setStep(3);
  };

  const handleConfirm = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (window.__mtxAuth && typeof window.__mtxAuth.changePassword === 'function') {
        window.__mtxAuth.changePassword(pwNueva);
      }
      setStep(4);
      onSuccess();
    }, 1200);
  };

  const canStep1 = !!pwActual && !loading;
  const canStep2 = pwMatch && pwNueva.length >= 8;

  const stepMeta = [null,
    { title: 'Contraseña actual',   desc: 'Por seguridad, confirma tu contraseña actual para continuar.' },
    { title: 'Nueva contraseña',    desc: 'Elige una contraseña segura de al menos 8 caracteres.' },
    { title: '¿Confirmar cambio?',  desc: 'Tu nueva contraseña quedará activa de inmediato. Cerraremos sesión en tus otros dispositivos.' },
    { title: '¡Contraseña actualizada!', desc: null },
  ];
  const meta = stepMeta[step] || stepMeta[1];

  return ReactDOM.createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 165, display: 'flex', alignItems: 'flex-end' }}>
      <style>{`@keyframes cePwUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>
      <div role="button" tabIndex={-1} aria-label="Cerrar"
        onClick={step < 4 ? onClose : undefined}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      />
      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative', zIndex: 1, width: '100%',
        background: 'linear-gradient(180deg, rgba(5,7,7,0.99) 0%, rgba(8,11,10,1) 100%)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: '0.5px solid rgba(255,255,255,0.09)', borderBottom: 'none',
        padding: '12px 20px 44px',
        animation: 'cePwUp .32s cubic-bezier(.22,1,.36,1) both',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}/>
        </div>

        {/* Step dots */}
        {step < 4 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 3, borderRadius: 999,
                width: i === step ? 20 : 8,
                background: i <= step ? 'var(--neon)' : 'rgba(255,255,255,0.12)',
                boxShadow: i === step ? '0 0 8px rgba(61,255,209,0.6)' : 'none',
                transition: 'all 0.3s ease',
              }}/>
            ))}
          </div>
        )}

        {/* Icon */}
        {step < 4 ? (
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 18px',
            background: step === 3 ? 'rgba(255,214,107,0.10)' : 'rgba(61,255,209,0.10)',
            border: step === 3 ? '0.5px solid rgba(255,214,107,0.25)' : '0.5px solid rgba(61,255,209,0.25)',
            boxShadow: step === 3 ? '0 0 32px rgba(255,214,107,0.18)' : '0 0 32px rgba(61,255,209,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {step === 1 && <IcLock   size={28} stroke="var(--neon)"   strokeWidth={1.6}/>}
            {step === 2 && <IcUnlock size={28} stroke="var(--neon)"   strokeWidth={1.6}/>}
            {step === 3 && <IcLock   size={28} stroke="#FFD66B" strokeWidth={1.6}/>}
          </div>
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: 24, margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(61,255,209,0.25) 0%, rgba(61,255,209,0.08) 100%)',
            border: '0.5px solid rgba(61,255,209,0.4)',
            boxShadow: '0 0 40px rgba(61,255,209,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcCheck size={34} stroke="var(--neon)" strokeWidth={2.2}/>
          </div>
        )}

        {/* Title + description */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 8 }}>
            {meta.title}
          </div>
          {step < 4 && meta.desc && (
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>{meta.desc}</div>
          )}
          {step === 4 && (
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
              Tu contraseña está activa. Tus otros dispositivos<br/>han cerrado sesión por seguridad.
            </div>
          )}
        </div>

        {/* ─ Step 1: current password ─ */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={inputWrap(focusActual, !!error)}>
              <IcLock size={16} stroke="rgba(255,255,255,0.25)" strokeWidth={1.7} style={{ flexShrink: 0, marginRight: 10 }}/>
              <input
                type={showActual ? 'text' : 'password'}
                value={pwActual}
                onChange={e => { setPwActual(e.target.value); setError(''); }}
                onFocus={() => setFocusActual(true)}
                onBlur={() => setFocusActual(false)}
                onKeyDown={e => e.key === 'Enter' && handleStep1()}
                placeholder="Tu contraseña actual"
                autoComplete="current-password"
                style={inputStyle}
              />
              {eyeBtn(showActual, () => setShowActual(p => !p))}
            </div>
            {error && <div style={{ fontSize: 11.5, color: '#FF4A6E', paddingLeft: 2 }}>{error}</div>}
            <button onClick={handleStep1} disabled={!canStep1} className="mtx-tap" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStep1(); } }}
              style={{
                width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: canStep1 ? 'pointer' : 'default',
                background: canStep1 ? 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)' : 'rgba(255,255,255,0.05)',
                color: canStep1 ? '#0D1210' : 'rgba(255,255,255,0.22)',
                fontSize: 15, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
                boxShadow: canStep1 ? '0 4px 24px rgba(61,255,209,0.28)' : 'none',
                transition: 'all 0.22s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {loading ? <CeLoadingDots/> : 'Continuar'}
            </button>
          </div>
        )}

        {/* ─ Step 2: new password ─ */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7, paddingLeft: 2 }}>
                Nueva contraseña
              </div>
              <div style={inputWrap(focusNueva, false)}>
                <IcUnlock size={16} stroke="rgba(255,255,255,0.25)" strokeWidth={1.7} style={{ flexShrink: 0, marginRight: 10 }}/>
                <input
                  type={showNueva ? 'text' : 'password'}
                  value={pwNueva}
                  onChange={e => setPwNueva(e.target.value)}
                  onFocus={() => setFocusNueva(true)}
                  onBlur={() => setFocusNueva(false)}
                  placeholder="Mín. 8 caracteres"
                  autoComplete="new-password"
                  style={inputStyle}
                />
                {eyeBtn(showNueva, () => setShowNueva(p => !p))}
              </div>
              {pwNueva.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= strength ? strColor : 'rgba(255,255,255,0.08)',
                        transition: 'background 0.22s ease',
                        boxShadow: i <= strength && strength >= 4 ? `0 0 6px ${strColor}88` : 'none',
                      }}/>
                    ))}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: strColor, minWidth: 60, textAlign: 'right', letterSpacing: '-0.01em', transition: 'color 0.22s ease' }}>
                    {strLabel}
                  </span>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7, paddingLeft: 2 }}>
                Confirmar contraseña
              </div>
              <div style={{ ...inputWrap(focusConfirm, false), border: `0.5px solid ${pwMismatch ? 'rgba(255,74,110,0.55)' : pwMatch ? 'rgba(61,255,209,0.35)' : focusConfirm ? 'rgba(61,255,209,0.35)' : 'rgba(255,255,255,0.09)'}` }}>
                <IcUnlock size={16} stroke="rgba(255,255,255,0.25)" strokeWidth={1.7} style={{ flexShrink: 0, marginRight: 10 }}/>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={pwConfirm}
                  onChange={e => setPwConfirm(e.target.value)}
                  onFocus={() => setFocusConfirm(true)}
                  onBlur={() => setFocusConfirm(false)}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  style={inputStyle}
                />
                {pwMatch    && <IcCheck size={16} stroke="var(--neon)" strokeWidth={2.2} style={{ flexShrink: 0, marginLeft: 4 }}/>}
                {pwMismatch && <IcClose size={16} stroke="#FF4A6E"    strokeWidth={2.2} style={{ flexShrink: 0, marginLeft: 4 }}/>}
                {!pwMatch && !pwMismatch && eyeBtn(showConfirm, () => setShowConfirm(p => !p))}
              </div>
              {pwMismatch && (
                <div style={{ marginTop: 6, fontSize: 11.5, color: '#FF4A6E', paddingLeft: 2 }}>Las contraseñas no coinciden</div>
              )}
            </div>
            <button onClick={handleStep2} disabled={!canStep2} className="mtx-tap" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStep2(); } }}
              style={{
                width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: canStep2 ? 'pointer' : 'default',
                background: canStep2 ? 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)' : 'rgba(255,255,255,0.05)',
                color: canStep2 ? '#0D1210' : 'rgba(255,255,255,0.22)',
                fontSize: 15, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
                boxShadow: canStep2 ? '0 4px 24px rgba(61,255,209,0.28)' : 'none',
                transition: 'all 0.22s ease',
              }}>
              Continuar
            </button>
          </div>
        )}

        {/* ─ Step 3: confirmation ─ */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Fortaleza de la contraseña
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: i <= strength ? strColor : 'rgba(255,255,255,0.08)',
                      boxShadow: i <= strength && strength >= 4 ? `0 0 6px ${strColor}88` : 'none',
                    }}/>
                  ))}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: strColor, minWidth: 60, textAlign: 'right' }}>{strLabel}</span>
              </div>
            </div>
            <button onClick={handleConfirm} disabled={loading} className="mtx-tap" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleConfirm(); } }}
              style={{
                width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)',
                color: '#0D1210', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
                boxShadow: '0 4px 24px rgba(61,255,209,0.28)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {loading ? <CeLoadingDots/> : 'Sí, cambiar contraseña'}
            </button>
            <button onClick={() => setStep(2)} disabled={loading} className="mtx-tap" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!loading) setStep(2); } }}
              style={{
                width: '100%', height: 46, borderRadius: 14, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.52)', fontSize: 14.5, fontWeight: 600, fontFamily: 'var(--ff-sans)',
              }}>
              Volver a editar
            </button>
          </div>
        )}

        {/* ─ Step 4: success ─ */}
        {step === 4 && (
          <button onClick={onClose} className="mtx-tap" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
            style={{
              width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)',
              color: '#0D1210', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
              boxShadow: '0 4px 24px rgba(61,255,209,0.28)',
            }}>
            Listo
          </button>
        )}
      </div>
    </div>,
    root
  );
}

// ── Sub-pantalla Cuenta ───────────────────────────────────────────────────────
function CuentaSubScreen({ profile, email, onBack }) {
  const [editOpen,        setEditOpen]        = React.useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = React.useState(false);
  const [changePwOpen,    setChangePwOpen]    = React.useState(false);
  const [displayEmail,    setDisplayEmail]    = React.useState(email);
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const accent = (profile && profile.accent) || 'var(--neon)';

  return (
    <SubScreen title="Cuenta" onBack={onBack}>
      {/* Avatar compacto al tope */}
      {profile && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, paddingBottom: 28 }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: profile.avatar
                ? `url(${profile.avatar}) center/cover`
                : `radial-gradient(60% 60% at 50% 30%, ${accent}55, ${accent}1a 70%, transparent)`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              border: '2.5px solid #050706',
              boxShadow: `0 0 0 1.5px ${accent}50, 0 0 24px ${accent}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: accent, fontSize: 32, fontWeight: 700, fontFamily: 'var(--ff-display)',
            }}>
              {!profile.avatar && profile.initial}
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)' }}>{profile.name}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 3, letterSpacing: '-0.01em' }}>{profile.handle}</div>

          <button onClick={() => setEditOpen(true)} className="mtx-tap" style={{
            marginTop: 14, height: 36, padding: '0 18px', borderRadius: 10,
            background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.09)',
            color: 'var(--ink-2)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em', fontFamily: 'var(--ff-sans)',
          }}>
            <IcEdit size={13} stroke="currentColor" strokeWidth={1.8}/>
            Editar perfil completo
          </button>
        </div>
      )}

      {/* Info pública — tarjeta estática, un solo CTA de edición */}
      <SectionLabel label="Perfil público" topSpacing={0}/>
      <div style={{ margin: '0 16px', borderRadius: 13,
        background: 'linear-gradient(180deg, rgba(61,255,209,0.04) 0%, rgba(3,6,5,0.32) 100%)',
        border: '0.5px solid rgba(61,255,209,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(61,255,209,0.05)',
        overflow: 'hidden',
      }}>
        {[
          { icon: '👤', label: 'Nombre',    value: profile ? profile.name : '—' },
          { icon: '✏️', label: 'Tagline',   value: profile ? (profile.tagline || '—') : '—' },
          { icon: '🔗', label: 'Sitio web', value: profile ? (profile.link || '—') : '—' },
        ].map(({ icon, label, value }, i) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
            borderBottom: i < 2 ? '0.5px solid rgba(61,255,209,0.06)' : 'none',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, width: 28, textAlign: 'center' }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
            </div>
          </div>
        ))}
        <div style={{ padding: '10px 14px', borderTop: '0.5px solid rgba(61,255,209,0.06)' }}>
          <button onClick={() => setEditOpen(true)} className="mtx-tap" style={{
            width: '100%', height: 36, borderRadius: 9,
            background: 'rgba(61,255,209,0.07)', border: '0.5px solid rgba(61,255,209,0.18)',
            color: 'var(--neon)', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', fontFamily: 'var(--ff-sans)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <IcEdit size={13} stroke="currentColor" strokeWidth={1.9}/>
            Editar perfil público
          </button>
        </div>
      </div>

      {/* Contacto */}
      <SectionLabel label="Contacto y acceso" topSpacing={28}/>
      <CardList>
        <DetailRow
          icon={IcMail}
          label="Email"
          subtitle={displayEmail || email}
          actionLabel="Cambiar"
          onTap={() => setChangeEmailOpen(true)}
        />
        <DetailRow
          icon={IcLock}
          label="Contraseña"
          subtitle="Protege tu cuenta"
          value="••••••••"
          actionLabel="Cambiar"
          onTap={() => setChangePwOpen(true)}
        />
      </CardList>

      {/* EditProfileSheet */}
      {editOpen && typeof EditProfileSheet !== 'undefined' && profile && (
        <EditProfileSheet
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={(patch) => {
            window.__mtxProfile.update(patch);
            toast.show({ message: 'Perfil actualizado', duration: 1600 });
            setEditOpen(false);
          }}
        />
      )}

      {/* ChangeEmailSheet */}
      {changeEmailOpen && (
        <ChangeEmailSheet
          currentEmail={displayEmail || email}
          onClose={() => setChangeEmailOpen(false)}
          onSuccess={(newEmail) => {
            setDisplayEmail(newEmail);
            toast.show({ message: 'Email actualizado correctamente', duration: 2200 });
          }}
        />
      )}

      {/* ChangePasswordSheet */}
      {changePwOpen && (
        <ChangePasswordSheet
          onClose={() => setChangePwOpen(false)}
          onSuccess={() => {
            toast.show({ message: 'Contraseña actualizada ✓', duration: 2200 });
          }}
        />
      )}
    </SubScreen>
  );
}

// ── ToggleRow ─────────────────────────────────────────────────────────────────
function ToggleRow({ icon, label, subtitle, on, onToggle }) {
  const isEmoji = typeof icon === 'string';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 14px', borderRadius: 13,
      background: 'linear-gradient(180deg, rgba(61,255,209,0.04) 0%, rgba(3,6,5,0.32) 100%)',
      border: '0.5px solid rgba(61,255,209,0.10)',
      boxShadow: 'inset 0 1px 0 rgba(61,255,209,0.05)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11, flexShrink: 0,
        background: 'rgba(255,255,255,0.05)',
        border: '0.5px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isEmoji
          ? <span style={{ fontSize: 20, lineHeight: 1, userSelect: 'none' }}>{icon}</span>
          : React.createElement(icon, { size: 18, stroke: 'var(--ink-2)', strokeWidth: 1.7 })
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)', letterSpacing: '-0.005em', marginBottom: 1 }}>{label}</div>
        {subtitle && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontStyle: 'italic', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>}
      </div>
      <button onClick={onToggle} className="mtx-tap"
        aria-label={`${on ? 'Desactivar' : 'Activar'} ${label}`}
        tabIndex={0}
        style={{
          flexShrink: 0, cursor: 'pointer', appearance: 'none', padding: 0,
          width: 46, height: 26, borderRadius: 13,
          background: on ? 'var(--neon)' : 'rgba(255,255,255,0.08)',
          border: 'none', position: 'relative',
          transition: 'background 0.22s ease',
          boxShadow: on ? '0 0 12px rgba(61,255,209,0.35)' : 'none',
        }}
      >
        <div style={{
          position: 'absolute', top: 3,
          left: on ? 23 : 3,
          width: 20, height: 20, borderRadius: '50%',
          background: on ? '#0D1210' : 'rgba(255,255,255,0.35)',
          transition: 'left 0.22s cubic-bezier(0.22,1,0.36,1)',
        }}/>
      </button>
    </div>
  );
}

// ── Sub-pantalla Seguridad ────────────────────────────────────────────────────
var _STG_MOCK_SESSIONS = [
  { id: 's1', device: '📱', name: 'iPhone 15 Pro',   location: 'Bogotá, Colombia',   time: 'Activa ahora',  current: true  },
  { id: 's2', device: '💻', name: 'MacBook Air M2',  location: 'Bogotá, Colombia',   time: 'Hace 2 días',   current: false },
  { id: 's3', device: '📟', name: 'iPad Pro 12.9',   location: 'Medellín, Colombia', time: 'Hace 1 semana', current: false },
];

function _stgPwStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8)            s++;
  if (pw.length >= 12)           s++;
  if (/[A-Z]/.test(pw))          s++;
  if (/[0-9]/.test(pw))          s++;
  if (/[^a-zA-Z0-9]/.test(pw))   s++;
  return s;
}

var _STG_STR_LABEL = ['', 'Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
var _STG_STR_COLOR = ['', '#FF4A6E', '#FF8B6A', '#FFD66B', '#3dffd1', '#3dffd1'];

var _2FA_BACKUP_CODES = [
  'MNXT-4K2R', 'MNXT-8P7J', 'MNXT-1W9Q', 'MNXT-5T3X',
  'MNXT-6B0N', 'MNXT-2H8F', 'MNXT-9D4M', 'MNXT-7C1V',
];

function _FakeQR({ size = 160 }) {
  const N = 21;
  const isFinderCell = (r, c) => {
    const inPat = (r0, c0) => {
      const dr = r - r0, dc = c - c0;
      if (dr < 0 || dr > 6 || dc < 0 || dc > 6) return null;
      if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return 1;
      if (dr === 1 || dr === 5 || dc === 1 || dc === 5) return 0;
      return 1;
    };
    return inPat(0, 0) ?? inPat(0, 14) ?? inPat(14, 0);
  };
  const isTiming = (r, c) => {
    if (r === 6 && c >= 8 && c <= 12) return c % 2 === 0 ? 1 : 0;
    if (c === 6 && r >= 8 && r <= 12) return r % 2 === 0 ? 1 : 0;
    return null;
  };
  const pseudo = (r, c) => ((r * 7 + c * 13 + r * c * 3) % 5 < 3) ? 1 : 0;
  const cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const f = isFinderCell(r, c), t = isTiming(r, c);
      if ((f !== null ? f : t !== null ? t : pseudo(r, c))) cells.push({ r, c });
    }
  }
  return (
    <svg viewBox={`0 0 ${N} ${N}`} width={size} height={size} style={{ display: 'block', borderRadius: 3 }}>
      <rect width={N} height={N} fill="white"/>
      {cells.map(({ r, c }) => <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0D1210"/>)}
    </svg>
  );
}

// ── PwConfirmSheet ─────────────────────────────────────────────────────────────
function PwConfirmSheet({ onCancel, onConfirm }) {
  const root = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
  if (!root) return null;
  return ReactDOM.createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 163, display: 'flex', alignItems: 'flex-end' }}>
      <style>{`@keyframes stgPwUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>
      <div onClick={onCancel} role="button" tabIndex={-1} aria-label="Cerrar" onKeyDown={e => e.key === 'Escape' && onCancel()} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}/>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative', zIndex: 1, width: '100%',
        background: 'linear-gradient(180deg, rgba(5,7,7,0.99) 0%, rgba(8,11,10,1) 100%)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: '0.5px solid rgba(255,255,255,0.09)', borderBottom: 'none',
        padding: '12px 20px 40px',
        animation: 'stgPwUp .30s cubic-bezier(.22,1,.36,1) both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 20 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}/>
        </div>
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: '0 auto 18px',
          background: 'rgba(61,255,209,0.10)', border: '0.5px solid rgba(61,255,209,0.25)',
          boxShadow: '0 0 32px rgba(61,255,209,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IcLock size={28} stroke="var(--neon)" strokeWidth={1.6}/>
        </div>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 8 }}>¿Confirmar cambio?</div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
            Tu nueva contraseña quedará activa de inmediato. Cerraremos sesión en tus otros dispositivos por seguridad.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onConfirm} className="mtx-tap" tabIndex={0}
            style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)',
              color: '#0D1210', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
              boxShadow: '0 4px 24px rgba(61,255,209,0.28)' }}>
            Sí, cambiar contraseña
          </button>
          <button onClick={onCancel} className="mtx-tap" tabIndex={0}
            style={{ width: '100%', height: 46, borderRadius: 14, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.52)', fontSize: 14.5, fontWeight: 600, fontFamily: 'var(--ff-sans)' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    root
  );
}

// ── SessionRevokeSheet ─────────────────────────────────────────────────────────
function SessionRevokeSheet({ session, onCancel, onConfirm }) {
  const root = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
  if (!root || !session) return null;
  return ReactDOM.createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 163, display: 'flex', alignItems: 'flex-end' }}>
      <style>{`@keyframes stgRevUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>
      <div onClick={onCancel} role="button" tabIndex={-1} aria-label="Cerrar" onKeyDown={e => e.key === 'Escape' && onCancel()} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}/>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative', zIndex: 1, width: '100%',
        background: 'linear-gradient(180deg, rgba(5,7,7,0.99) 0%, rgba(8,11,10,1) 100%)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: '0.5px solid rgba(255,255,255,0.09)', borderBottom: 'none',
        padding: '12px 20px 40px',
        animation: 'stgRevUp .30s cubic-bezier(.22,1,.36,1) both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 20 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, padding: '12px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{session.device}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.015em', fontFamily: 'var(--ff-display)' }}>{session.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)' }}>{session.location} · {session.time}</div>
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 8 }}>¿Cerrar esta sesión?</div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
            El dispositivo perderá acceso y tendrá que iniciar sesión de nuevo. No puedes deshacer esta acción.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onConfirm} className="mtx-tap" tabIndex={0}
            style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #FF4A6E 0%, #E03060 100%)',
              color: '#fff', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
              boxShadow: '0 4px 24px rgba(255,74,110,0.38)' }}>
            Cerrar sesión
          </button>
          <button onClick={onCancel} className="mtx-tap" tabIndex={0}
            style={{ width: '100%', height: 46, borderRadius: 14, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.52)', fontSize: 14.5, fontWeight: 600, fontFamily: 'var(--ff-sans)' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    root
  );
}

// ── TwoFADisableSheet ─────────────────────────────────────────────────────────
function TwoFADisableSheet({ onCancel, onConfirm }) {
  const root = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
  if (!root) return null;
  return ReactDOM.createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 163, display: 'flex', alignItems: 'flex-end' }}>
      <style>{`@keyframes stgDisUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>
      <div onClick={onCancel} role="button" tabIndex={-1} aria-label="Cerrar" onKeyDown={e => e.key === 'Escape' && onCancel()} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}/>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative', zIndex: 1, width: '100%',
        background: 'linear-gradient(180deg, rgba(5,7,7,0.99) 0%, rgba(8,11,10,1) 100%)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: '0.5px solid rgba(255,74,110,0.15)', borderBottom: 'none',
        padding: '12px 20px 40px',
        animation: 'stgDisUp .30s cubic-bezier(.22,1,.36,1) both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 20 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}/>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 18px', background: 'rgba(255,74,110,0.10)', border: '0.5px solid rgba(255,74,110,0.25)', boxShadow: '0 0 32px rgba(255,74,110,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IcShield size={28} stroke="#FF4A6E" strokeWidth={1.6}/>
        </div>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 8 }}>¿Desactivar 2FA?</div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
            Tu cuenta quedará menos protegida. Podrás volver a activarlo cuando quieras.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onConfirm} className="mtx-tap" tabIndex={0}
            style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #FF4A6E 0%, #E03060 100%)',
              color: '#fff', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
              boxShadow: '0 4px 24px rgba(255,74,110,0.38)' }}>
            Desactivar 2FA
          </button>
          <button onClick={onCancel} className="mtx-tap" tabIndex={0}
            style={{ width: '100%', height: 46, borderRadius: 14, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.52)', fontSize: 14.5, fontWeight: 600, fontFamily: 'var(--ff-sans)' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    root
  );
}

// ── TwoFASetupSubScreen ───────────────────────────────────────────────────────
function TwoFASetupSubScreen({ onBack, onEnabled }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const [step, setStep]               = React.useState('intro');
  const [method, setMethod]           = React.useState(null);
  const [phone, setPhone]             = React.useState('');
  const [digits, setDigits]           = React.useState(['', '', '', '', '', '']);
  const [verifyLoading, setVerifyLoading] = React.useState(false);
  const [verifyError, setVerifyError] = React.useState(false);
  const [resendTimer, setResendTimer] = React.useState(59);
  const [codesCopied, setCodesCopied] = React.useState(false);
  const digitRefs = React.useRef([]);

  React.useEffect(() => {
    if (step === 'verify') setResendTimer(59);
  }, [step]);

  React.useEffect(() => {
    if (step !== 'verify' || resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendTimer]);

  const handleDigitInput = (i, val) => {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...digits]; next[i] = d; setDigits(next);
    setVerifyError(false);
    if (d && i < 5) setTimeout(() => digitRefs.current[i + 1]?.focus(), 0);
  };
  const handleDigitKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (digits[i]) { const n = [...digits]; n[i] = ''; setDigits(n); }
      else if (i > 0) digitRefs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft'  && i > 0) digitRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) digitRefs.current[i + 1]?.focus();
  };
  const handleDigitPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length) {
      setDigits([...text.split('').concat(Array(6).fill(''))].slice(0, 6));
      setTimeout(() => digitRefs.current[Math.min(text.length, 5)]?.focus(), 50);
      e.preventDefault();
    }
  };
  const handleVerify = () => {
    if (digits.some(d => !d) || verifyLoading) return;
    setVerifyLoading(true);
    setTimeout(() => {
      setVerifyLoading(false);
      if (digits.join('') === '000000') { setVerifyError(true); }
      else { setStep('backup'); }
    }, 1100);
  };
  const handleCopyCodes = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(_2FA_BACKUP_CODES.join('\n'))
        .then(() => { setCodesCopied(true); toast.show({ message: 'Códigos copiados', duration: 1800 }); setTimeout(() => setCodesCopied(false), 2400); })
        .catch(() => toast.show({ message: 'No se pudo copiar, hazlo manualmente', duration: 2000 }));
    }
  };
  const handleBack = () => {
    const prev = { intro: null, method: 'intro', 'app-qr': 'method', 'sms-phone': 'method', verify: method === 'app' ? 'app-qr' : 'sms-phone', backup: 'verify' };
    const p = prev[step];
    if (p) setStep(p); else onBack();
  };

  const stepNum = { intro: 0, method: 1, 'app-qr': 2, 'sms-phone': 2, verify: 3, backup: 4, success: 5 };
  const canSubmitVerify = !digits.some(d => !d) && !verifyLoading;

  return (
    <>
      <style>{`
        @keyframes stg2faIn { from { transform:translateX(32px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes stg2faPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.06); } }
      `}</style>
      <div style={{ position: 'absolute', inset: 0, zIndex: 115, background: '#0D1210', display: 'flex', flexDirection: 'column', animation: 'stg2faIn .3s cubic-bezier(0.22,1,0.36,1) both' }}>
        {/* Header */}
        <div style={{ flexShrink: 0, paddingTop: 60, background: 'linear-gradient(180deg, rgba(5,7,7,0.98) 0%, rgba(8,11,10,0.95) 100%)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
          <div style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={handleBack} aria-label="Volver" className="mtx-tap"
              style={{ width: 36, height: 36, borderRadius: 999, flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', color: 'var(--ink-1)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcChevL size={15} stroke="currentColor" strokeWidth={1.9}/>
            </button>
            <h1 style={{ flex: 1, textAlign: 'center', margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.02em', fontFamily: 'var(--ff-sans)' }}>Verificación en dos pasos</h1>
            <div style={{ width: 36, flexShrink: 0 }}/>
          </div>
          {step !== 'intro' && step !== 'success' && (
            <div style={{ margin: '0 16px 14px', height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 1, width: `${(stepNum[step] / 5) * 100}%`, background: 'var(--neon)', boxShadow: '0 0 8px rgba(61,255,209,0.5)', transition: 'width 0.4s ease' }}/>
            </div>
          )}
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 60 }}>

          {/* INTRO */}
          {step === 'intro' && (
            <div style={{ padding: '40px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 96, height: 96, borderRadius: 28, marginBottom: 28, background: 'rgba(61,255,209,0.08)', border: '0.5px solid rgba(61,255,209,0.22)', boxShadow: '0 0 48px rgba(61,255,209,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'stg2faPulse 3s ease-in-out infinite' }}>
                <IcShield size={46} stroke="var(--neon)" strokeWidth={1.3}/>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.03em', fontFamily: 'var(--ff-display)', textAlign: 'center', marginBottom: 10 }}>Doble cerradura para tu cuenta</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.44)', lineHeight: 1.6, textAlign: 'center', marginBottom: 32, letterSpacing: '-0.01em' }}>
                Incluso si alguien obtiene tu contraseña, no podrá entrar sin el segundo código que solo tú recibes.
              </div>
              {[
                { icon: '🔐', title: 'Acceso solo para ti',  desc: 'Un código único en cada inicio de sesión' },
                { icon: '📱', title: 'App o SMS',            desc: 'Elige cómo prefieres recibir el código' },
                { icon: '🛡️', title: 'Códigos de respaldo', desc: '8 códigos de emergencia si pierdes el dispositivo' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 10, padding: '12px 14px', borderRadius: 13, background: 'linear-gradient(180deg, rgba(61,255,209,0.04) 0%, rgba(3,6,5,0.32) 100%)', border: '0.5px solid rgba(61,255,209,0.10)' }}>
                  <span style={{ fontSize: 21, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.01em', marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>{desc}</div>
                  </div>
                </div>
              ))}
              <button onClick={() => setStep('method')} className="mtx-tap" tabIndex={0}
                style={{ marginTop: 16, width: '100%', height: 52, borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)', color: '#0D1210', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em', boxShadow: '0 4px 24px rgba(61,255,209,0.28)' }}>
                Activar 2FA
              </button>
              <button onClick={onBack} className="mtx-tap" tabIndex={0}
                style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.36)', padding: '8px 0' }}>
                Ahora no
              </button>
            </div>
          )}

          {/* METHOD */}
          {step === 'method' && (
            <div style={{ padding: '32px 20px 24px' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 8 }}>¿Cómo quieres verificar?</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55, marginBottom: 28 }}>Elige cómo recibirás el código de verificación en cada inicio de sesión.</div>
              {/* App */}
              <button onClick={() => { setMethod('app'); setStep('app-qr'); }} className="mtx-tap" tabIndex={0}
                style={{ width: '100%', cursor: 'pointer', appearance: 'none', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12, padding: '16px', borderRadius: 16, background: 'linear-gradient(180deg, rgba(61,255,209,0.06) 0%, rgba(61,255,209,0.02) 100%)', border: '0.5px solid rgba(61,255,209,0.20)', fontFamily: 'var(--ff-sans)' }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: 'rgba(61,255,209,0.12)', border: '0.5px solid rgba(61,255,209,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IcShield size={22} stroke="var(--neon)" strokeWidth={1.6}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>App de autenticación</span>
                    <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(61,255,209,0.12)', border: '0.5px solid rgba(61,255,209,0.28)', fontSize: 9.5, fontWeight: 700, color: 'var(--neon)', letterSpacing: '0.06em' }}>RECOMENDADO</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.40)', lineHeight: 1.5 }}>Google Authenticator, Authy, 1Password. Más seguro que SMS.</div>
                </div>
                <IcChevR size={13} stroke="rgba(61,255,209,0.45)" strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 16 }}/>
              </button>
              {/* SMS */}
              <button onClick={() => { setMethod('sms'); setStep('sms-phone'); }} className="mtx-tap" tabIndex={0}
                style={{ width: '100%', cursor: 'pointer', appearance: 'none', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px', borderRadius: 16, background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', border: '0.5px solid rgba(255,255,255,0.09)', fontFamily: 'var(--ff-sans)' }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💬</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.01em', marginBottom: 4 }}>Mensaje de texto (SMS)</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.40)', lineHeight: 1.5 }}>Recibe un código de 6 dígitos en tu número de teléfono.</div>
                </div>
                <IcChevR size={13} stroke="rgba(255,255,255,0.22)" strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 16 }}/>
              </button>
            </div>
          )}

          {/* APP QR */}
          {step === 'app-qr' && (
            <div style={{ padding: '32px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ alignSelf: 'flex-start', marginBottom: 24 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 8 }}>Escanea el código QR</div>
                <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.40)', lineHeight: 1.55 }}>Abre tu app de autenticación, toca "+" y apunta la cámara al código.</div>
              </div>
              <div style={{ padding: 16, borderRadius: 18, marginBottom: 20, background: 'white', boxShadow: '0 0 48px rgba(61,255,209,0.12), 0 8px 32px rgba(0,0,0,0.4)' }}>
                <_FakeQR size={160}/>
              </div>
              <div style={{ width: '100%', marginBottom: 28, padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>¿No puedes escanear? Código manual</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--neon)', letterSpacing: '0.12em', fontFamily: 'monospace' }}>MNXT 4K2R 8P7J 1W9Q</div>
              </div>
              <button onClick={() => setStep('verify')} className="mtx-tap" tabIndex={0}
                style={{ width: '100%', height: 52, borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)', color: '#0D1210', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em', boxShadow: '0 4px 24px rgba(61,255,209,0.28)' }}>
                Ya escaneé el código →
              </button>
            </div>
          )}

          {/* SMS PHONE */}
          {step === 'sms-phone' && (
            <div style={{ padding: '32px 20px 24px' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 8 }}>Ingresa tu número</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.40)', lineHeight: 1.55, marginBottom: 28 }}>Te enviaremos un código de verificación por SMS cada vez que inicies sesión.</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Número de teléfono</div>
              <div style={{ display: 'flex', alignItems: 'center', height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(61,255,209,0.20)', overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ flexShrink: 0, height: '100%', padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6, borderRight: '0.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                  <span style={{ fontSize: 18 }}>🇨🇴</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>+57</span>
                </div>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="300 123 4567"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', padding: '0 16px', fontSize: 15, fontWeight: 500, color: 'var(--ink-1)', fontFamily: 'var(--ff-sans)', letterSpacing: '0.02em' }}/>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 11, marginBottom: 24, background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', lineHeight: 1.65 }}>Usamos tu número solo para verificación. No lo compartimos ni enviamos spam.</div>
              </div>
              <button onClick={() => { if (phone.length >= 7) setStep('verify'); }} className="mtx-tap" tabIndex={0}
                style={{ width: '100%', height: 52, borderRadius: 16, border: 'none', cursor: phone.length >= 7 ? 'pointer' : 'default', background: phone.length >= 7 ? 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)' : 'rgba(255,255,255,0.06)', color: phone.length >= 7 ? '#0D1210' : 'rgba(255,255,255,0.25)', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em', boxShadow: phone.length >= 7 ? '0 4px 24px rgba(61,255,209,0.28)' : 'none', transition: 'all 0.2s ease' }}>
                Enviar código SMS →
              </button>
            </div>
          )}

          {/* VERIFY */}
          {step === 'verify' && (
            <div style={{ padding: '32px 20px 24px' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 8 }}>Ingresa el código</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.40)', lineHeight: 1.55, marginBottom: 32 }}>
                {method === 'app' ? 'Ingresa el código de 6 dígitos que aparece en tu app de autenticación.' : `Enviamos un SMS al +57 ${phone}. Puede demorar hasta 1 minuto.`}
              </div>
              {/* 6-digit OTP */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {digits.map((d, i) => (
                  <input key={i} ref={el => digitRefs.current[i] = el}
                    type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleDigitInput(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    onPaste={i === 0 ? handleDigitPaste : undefined}
                    style={{ width: 46, height: 58, borderRadius: 13, border: 'none', outline: 'none', textAlign: 'center', fontSize: 22, fontWeight: 700, color: verifyError ? '#FF4A6E' : 'var(--ink-1)', fontFamily: 'var(--ff-display)', background: verifyError ? 'rgba(255,74,110,0.08)' : d ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.04)', boxShadow: verifyError ? '0 0 0 1.5px rgba(255,74,110,0.45)' : d ? '0 0 0 1.5px rgba(61,255,209,0.35)' : '0 0 0 0.5px rgba(255,255,255,0.09)', transition: 'all 0.15s ease' }}
                  />
                ))}
              </div>
              {verifyError && <div style={{ textAlign: 'center', fontSize: 12.5, color: '#FF4A6E', marginBottom: 16 }}>Código incorrecto. Inténtalo de nuevo.</div>}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                {resendTimer > 0
                  ? <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>Reenviar código en {resendTimer}s</span>
                  : <button onClick={() => setResendTimer(59)} className="mtx-tap" tabIndex={0} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--neon)', padding: '4px 0' }}>Reenviar código</button>
                }
              </div>
              <button onClick={handleVerify} className="mtx-tap" tabIndex={0} disabled={!canSubmitVerify}
                style={{ width: '100%', height: 52, borderRadius: 16, border: 'none', cursor: canSubmitVerify ? 'pointer' : 'default', background: canSubmitVerify ? 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)' : 'rgba(255,255,255,0.06)', color: canSubmitVerify ? '#0D1210' : 'rgba(255,255,255,0.25)', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em', boxShadow: canSubmitVerify ? '0 4px 24px rgba(61,255,209,0.28)' : 'none', transition: 'all 0.2s ease' }}>
                {verifyLoading ? 'Verificando…' : 'Verificar código'}
              </button>
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.28)', lineHeight: 1.55 }}>Usa cualquier código de 6 dígitos (excepto 000000) para probar este flujo.</div>
              </div>
            </div>
          )}

          {/* BACKUP CODES */}
          {step === 'backup' && (
            <div style={{ padding: '32px 20px 24px' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 8 }}>Guarda estos códigos</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.40)', lineHeight: 1.55, marginBottom: 24 }}>
                Si pierdes acceso a tu {method === 'app' ? 'app de autenticación' : 'teléfono'}, usa uno de estos para entrar. Cada código funciona una sola vez.
              </div>
              <div style={{ padding: '16px', borderRadius: 16, marginBottom: 12, background: 'rgba(61,255,209,0.04)', border: '0.5px solid rgba(61,255,209,0.16)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                  {_2FA_BACKUP_CODES.map((code, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontWeight: 600, minWidth: 14, textAlign: 'right' }}>{i + 1}.</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--neon)', fontFamily: 'monospace', letterSpacing: '0.08em' }}>{code}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleCopyCodes} className="mtx-tap" tabIndex={0}
                style={{ width: '100%', height: 44, borderRadius: 12, cursor: 'pointer', background: codesCopied ? 'rgba(61,255,209,0.12)' : 'rgba(255,255,255,0.05)', border: `0.5px solid ${codesCopied ? 'rgba(61,255,209,0.30)' : 'rgba(255,255,255,0.08)'}`, color: codesCopied ? 'var(--neon)' : 'rgba(255,255,255,0.52)', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--ff-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16, transition: 'all 0.2s ease' }}>
                {codesCopied ? <><IcCheck size={14} stroke="var(--neon)" strokeWidth={2.2}/> Copiados</> : '📋 Copiar todos los códigos'}
              </button>
              <div style={{ padding: '12px 14px', borderRadius: 12, marginBottom: 24, background: 'rgba(255,214,107,0.06)', border: '0.5px solid rgba(255,214,107,0.20)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>Guárdalos fuera de esta app. No podrás verlos de nuevo después de cerrar esta pantalla.</div>
              </div>
              <button onClick={() => setStep('success')} className="mtx-tap" tabIndex={0}
                style={{ width: '100%', height: 52, borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)', color: '#0D1210', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em', boxShadow: '0 4px 24px rgba(61,255,209,0.28)' }}>
                He guardado mis códigos →
              </button>
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <div style={{ padding: '40px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 96, height: 96, borderRadius: 28, marginBottom: 24, background: 'rgba(61,255,209,0.12)', border: '0.5px solid rgba(61,255,209,0.30)', boxShadow: '0 0 60px rgba(61,255,209,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IcShield size={48} stroke="var(--neon)" strokeWidth={1.2}/>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.03em', fontFamily: 'var(--ff-display)', textAlign: 'center', marginBottom: 10 }}>¡2FA activado!</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.44)', lineHeight: 1.6, textAlign: 'center', marginBottom: 32, letterSpacing: '-0.01em', maxWidth: 280 }}>
                Tu cuenta ahora tiene una capa extra de protección. La necesitarás en cada inicio de sesión.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '12px 18px', borderRadius: 14, background: 'rgba(61,255,209,0.07)', border: '0.5px solid rgba(61,255,209,0.22)' }}>
                <IcCheck size={16} stroke="var(--neon)" strokeWidth={2.2}/>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--neon)' }}>{method === 'app' ? 'Usando app de autenticación' : `SMS al +57 ${phone}`}</span>
              </div>
              <button onClick={() => onEnabled(method)} className="mtx-tap" tabIndex={0}
                style={{ width: '100%', height: 52, borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)', color: '#0D1210', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em', boxShadow: '0 4px 24px rgba(61,255,209,0.28)' }}>
                Entendido, continuar
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

function SeguridadSubScreen({ onBack, twoFaEnabled, twoFaMethod, onOpen2FASetup, onDisable2FA }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  // ── Contraseña ──────────────────────────────────────────────────────────────
  const [pwActual,      setPwActual]      = React.useState('');
  const [pwNueva,       setPwNueva]       = React.useState('');
  const [pwConfirm,     setPwConfirm]     = React.useState('');
  const [showA,         setShowA]         = React.useState(false);
  const [showN,         setShowN]         = React.useState(false);
  const [showC,         setShowC]         = React.useState(false);
  const [pwConfirmOpen, setPwConfirmOpen] = React.useState(false);

  const strength   = _stgPwStrength(pwNueva);
  const strLabel   = _STG_STR_LABEL[strength] || '';
  const strColor   = _STG_STR_COLOR[strength] || 'transparent';
  const pwMatch    = pwNueva.length > 0 && pwConfirm.length > 0 && pwNueva === pwConfirm;
  const pwMismatch = pwConfirm.length > 0 && pwNueva !== pwConfirm;
  const pwCanSubmit = pwActual.length >= 1 && pwNueva.length >= 8 && pwMatch;

  // ── 2FA disable confirm ───────────────────────────────────────────────────
  const [twoFaDisableOpen, setTwoFaDisableOpen] = React.useState(false);

  // ── Sesiones ────────────────────────────────────────────────────────────────
  const [sessions,       setSessions]       = React.useState(_STG_MOCK_SESSIONS);
  const [sessionToRevoke, setSessionToRevoke] = React.useState(null);

  // ── Helpers de estilo ────────────────────────────────────────────────────────
  const inputWrap = (focused) => ({
    position: 'relative', display: 'flex', alignItems: 'center',
    padding: '0 14px', height: 50, borderRadius: 13,
    background: 'rgba(255,255,255,0.03)',
    border: `0.5px solid ${focused ? 'rgba(61,255,209,0.35)' : 'rgba(255,255,255,0.09)'}`,
    boxShadow: focused ? '0 0 0 3px rgba(61,255,209,0.07)' : 'none',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  });
  const inputStyle = {
    flex: 1, background: 'none', border: 'none', outline: 'none', padding: 0,
    fontSize: 14.5, fontWeight: 500, color: 'var(--ink-1)',
    fontFamily: 'var(--ff-sans)', letterSpacing: '-0.01em',
  };
  const eyeBtn = (show, toggle) => (
    <button onClick={toggle} tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
      aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      style={{
        flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none', padding: '4px 0 4px 8px',
        display: 'flex', alignItems: 'center',
      }}>
      <IcEye size={17} stroke={show ? 'var(--neon)' : 'rgba(255,255,255,0.25)'} strokeWidth={1.7}/>
    </button>
  );

  // ── Foco para bordes de input ────────────────────────────────────────────────
  const [focusA, setFocusA] = React.useState(false);
  const [focusN, setFocusN] = React.useState(false);
  const [focusC, setFocusC] = React.useState(false);

  return (
    <SubScreen title="Seguridad" onBack={onBack}>
      {/* ── CONTRASEÑA ─────────────────────────────────────────────────────── */}
      <SectionLabel label="Contraseña" topSpacing={20}/>
      <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Contraseña actual */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7, paddingLeft: 2 }}>
            Contraseña actual
          </div>
          <div style={inputWrap(focusA)}>
            <IcLock size={16} stroke="rgba(255,255,255,0.25)" strokeWidth={1.7} style={{ flexShrink: 0, marginRight: 10 }}/>
            <input
              type={showA ? 'text' : 'password'}
              value={pwActual}
              onChange={e => setPwActual(e.target.value)}
              onFocus={() => setFocusA(true)}
              onBlur={() => setFocusA(false)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{ ...inputStyle, '::placeholder': { color: 'rgba(255,255,255,0.2)' } }}
            />
            {eyeBtn(showA, () => setShowA(p => !p))}
          </div>
        </div>

        {/* Nueva contraseña */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7, paddingLeft: 2 }}>
            Nueva contraseña
          </div>
          <div style={inputWrap(focusN)}>
            <IcUnlock size={16} stroke="rgba(255,255,255,0.25)" strokeWidth={1.7} style={{ flexShrink: 0, marginRight: 10 }}/>
            <input
              type={showN ? 'text' : 'password'}
              value={pwNueva}
              onChange={e => setPwNueva(e.target.value)}
              onFocus={() => setFocusN(true)}
              onBlur={() => setFocusN(false)}
              placeholder="Mín. 8 caracteres"
              autoComplete="new-password"
              style={inputStyle}
            />
            {eyeBtn(showN, () => setShowN(p => !p))}
          </div>
          {/* Strength bar */}
          {pwNueva.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= strength ? strColor : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.22s ease',
                    boxShadow: i <= strength && strength >= 4 ? `0 0 6px ${strColor}88` : 'none',
                  }}/>
                ))}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: strColor, minWidth: 60, textAlign: 'right', letterSpacing: '-0.01em', transition: 'color 0.22s ease' }}>
                {strLabel}
              </span>
            </div>
          )}
        </div>

        {/* Confirmar contraseña */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7, paddingLeft: 2 }}>
            Confirmar contraseña
          </div>
          <div style={{ ...inputWrap(focusC), border: `0.5px solid ${pwMismatch ? 'rgba(255,74,110,0.55)' : pwMatch ? 'rgba(61,255,209,0.35)' : focusC ? 'rgba(61,255,209,0.35)' : 'rgba(255,255,255,0.09)'}` }}>
            <IcUnlock size={16} stroke="rgba(255,255,255,0.25)" strokeWidth={1.7} style={{ flexShrink: 0, marginRight: 10 }}/>
            <input
              type={showC ? 'text' : 'password'}
              value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
              onFocus={() => setFocusC(true)}
              onBlur={() => setFocusC(false)}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              style={inputStyle}
            />
            {pwMatch && <IcCheck size={16} stroke="var(--neon)" strokeWidth={2.2} style={{ flexShrink: 0, marginLeft: 4 }}/>}
            {pwMismatch && <IcClose size={16} stroke="#FF4A6E" strokeWidth={2.2} style={{ flexShrink: 0, marginLeft: 4 }}/>}
            {!pwMatch && !pwMismatch && eyeBtn(showC, () => setShowC(p => !p))}
          </div>
          {pwMismatch && (
            <div style={{ marginTop: 6, fontSize: 11.5, color: '#FF4A6E', paddingLeft: 2 }}>
              Las contraseñas no coinciden
            </div>
          )}
        </div>

        {/* Guardar — abre sheet de confirmación */}
        <button onClick={() => { if (pwCanSubmit) setPwConfirmOpen(true); }}
          className="mtx-tap" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (pwCanSubmit) setPwConfirmOpen(true); } }}
          disabled={!pwCanSubmit}
          style={{
            width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: pwCanSubmit ? 'pointer' : 'default',
            background: pwCanSubmit
              ? 'linear-gradient(135deg, rgba(61,255,209,0.9) 0%, rgba(61,255,209,0.7) 100%)'
              : 'rgba(255,255,255,0.05)',
            color: pwCanSubmit ? '#0D1210' : 'rgba(255,255,255,0.22)',
            fontSize: 14.5, fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
            boxShadow: pwCanSubmit ? '0 4px 20px rgba(61,255,209,0.25)' : 'none',
            transition: 'all 0.22s ease',
          }}>
          Guardar contraseña
        </button>

        {/* Hint: requisitos */}
        <div style={{ padding: '10px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', lineHeight: 1.65, letterSpacing: '-0.005em' }}>
            Usa 8+ caracteres con mayúsculas, números y símbolos para una contraseña fuerte.
          </div>
        </div>
      </div>

      {/* ── AUTENTICACIÓN ──────────────────────────────────────────────────────── */}
      <SectionLabel label="Autenticación" topSpacing={28}/>
      <CardList>
        <button
          onClick={() => twoFaEnabled ? setTwoFaDisableOpen(true) : onOpen2FASetup()}
          className="mtx-tap" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); twoFaEnabled ? setTwoFaDisableOpen(true) : onOpen2FASetup(); } }}
          style={{
            width: '100%', appearance: 'none', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 14px', borderRadius: 13,
            background: twoFaEnabled
              ? 'linear-gradient(180deg, rgba(61,255,209,0.07) 0%, rgba(61,255,209,0.02) 100%)'
              : 'linear-gradient(180deg, rgba(61,255,209,0.04) 0%, rgba(3,6,5,0.32) 100%)',
            border: twoFaEnabled ? '0.5px solid rgba(61,255,209,0.25)' : '0.5px solid rgba(61,255,209,0.10)',
            boxShadow: twoFaEnabled ? 'inset 0 1px 0 rgba(61,255,209,0.10)' : 'inset 0 1px 0 rgba(61,255,209,0.05)',
            fontFamily: 'var(--ff-sans)',
          }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: twoFaEnabled ? 'rgba(61,255,209,0.12)' : 'rgba(255,255,255,0.05)',
            border: twoFaEnabled ? '0.5px solid rgba(61,255,209,0.25)' : '0.5px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcShield size={18} stroke={twoFaEnabled ? 'var(--neon)' : 'var(--ink-2)'} strokeWidth={1.7}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: twoFaEnabled ? 'var(--neon)' : 'var(--ink-2)', letterSpacing: '-0.005em', marginBottom: 1 }}>
              Verificación en dos pasos
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontStyle: 'italic', lineHeight: 1.35 }}>
              {twoFaEnabled ? `Activado · ${twoFaMethod === 'app' ? 'App de autenticación' : 'SMS'}` : 'Añade una capa extra de protección'}
            </div>
          </div>
          {twoFaEnabled
            ? <IcCheck size={16} stroke="var(--neon)" strokeWidth={2.2} style={{ flexShrink: 0 }}/>
            : <IcChevR size={13} stroke="rgba(255,255,255,0.22)" strokeWidth={2.2} style={{ flexShrink: 0 }}/>
          }
        </button>
      </CardList>

      {/* ── SESIONES ACTIVAS ──────────────────────────────────────────────────── */}
      <SectionLabel label="Sesiones activas" topSpacing={28}/>
      <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.map(sess => (
          <div key={sess.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 13,
            background: sess.current
              ? 'linear-gradient(180deg, rgba(61,255,209,0.06) 0%, rgba(61,255,209,0.02) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
            border: sess.current ? '0.5px solid rgba(61,255,209,0.18)' : '0.5px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1 }}>
              {sess.device}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.01em', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 7 }}>
                {sess.name}
                {sess.current && (
                  <span style={{ padding: '1px 7px', borderRadius: 999, background: 'rgba(61,255,209,0.1)', border: '0.5px solid rgba(61,255,209,0.28)', fontSize: 9.5, fontWeight: 700, color: 'var(--neon)', letterSpacing: '0.04em' }}>ESTE DISPOSITIVO</span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.32)', letterSpacing: '-0.005em' }}>{sess.location} · {sess.time}</div>
            </div>
            {!sess.current && (
              <button onClick={() => setSessionToRevoke(sess)} className="mtx-tap" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSessionToRevoke(sess); } }}
                aria-label={`Cerrar sesión en ${sess.name}`}
                style={{ flexShrink: 0, cursor: 'pointer', appearance: 'none', padding: '5px 11px', borderRadius: 8, background: 'rgba(255,74,110,0.08)', border: '0.5px solid rgba(255,74,110,0.22)', fontSize: 12, fontWeight: 700, color: '#FF4A6E', letterSpacing: '-0.005em', fontFamily: 'var(--ff-sans)' }}>
                Cerrar
              </button>
            )}
          </div>
        ))}
        {sessions.length === 1 && (
          <div style={{ padding: '10px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.26)' }}>Solo tienes una sesión activa</div>
          </div>
        )}
      </div>
      <div style={{ height: 20 }}/>

      {/* ── OVERLAYS ──────────────────────────────────────────────────────────── */}
      {pwConfirmOpen && (
        <PwConfirmSheet
          onCancel={() => setPwConfirmOpen(false)}
          onConfirm={() => {
            setPwConfirmOpen(false);
            setPwActual(''); setPwNueva(''); setPwConfirm('');
            toast.show({ message: 'Contraseña actualizada correctamente', duration: 2200 });
          }}
        />
      )}
      {sessionToRevoke && (
        <SessionRevokeSheet
          session={sessionToRevoke}
          onCancel={() => setSessionToRevoke(null)}
          onConfirm={() => {
            const name = sessionToRevoke.name;
            setSessions(prev => prev.filter(s => s.id !== sessionToRevoke.id));
            setSessionToRevoke(null);
            toast.show({ message: `Sesión cerrada en ${name}`, duration: 1800 });
          }}
        />
      )}
      {twoFaDisableOpen && (
        <TwoFADisableSheet
          onCancel={() => setTwoFaDisableOpen(false)}
          onConfirm={() => {
            setTwoFaDisableOpen(false);
            onDisable2FA();
            toast.show({ message: 'Verificación en dos pasos desactivada', duration: 2000 });
          }}
        />
      )}
    </SubScreen>
  );
}

// ── Sub-pantalla Notificaciones ────────────────────────────────────────────────
function NotificacionesSubScreen({ onBack }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const [notifs, setNotifs] = React.useState({
    recordatorio: true, coach: true, hitos: true, descanso: false, contenido: true,
  });

  const items = [
    { key: 'recordatorio', icon: '⏰', label: 'Recordatorio de sesión', subtitle: 'Avísame cuándo es hora de aprender' },
    { key: 'coach',        icon: '🤖', label: 'Tu coach IA',            subtitle: 'Motivación y resúmenes de progreso' },
    { key: 'hitos',        icon: '🏆', label: 'Hitos y logros',         subtitle: 'Racha, nuevos niveles y medallas' },
    { key: 'descanso',     icon: '😴', label: 'Descanso digital',        subtitle: 'Pausas programadas durante el día' },
    { key: 'contenido',    icon: '✨', label: 'Nuevo contenido',         subtitle: 'Audiolibros, series y meditaciones' },
  ];

  return (
    <SubScreen title="Notificaciones" onBack={onBack}>
      <SectionLabel label="Alertas y avisos" topSpacing={20}/>
      <CardList>
        {items.map(({ key, icon, label, subtitle }) => (
          <ToggleRow
            key={key} icon={icon} label={label} subtitle={subtitle}
            on={notifs[key]}
            onToggle={() => {
              const next = !notifs[key];
              setNotifs(prev => ({ ...prev, [key]: next }));
              toast.show({ message: next ? `${label} activado` : `${label} desactivado`, duration: 1200 });
            }}
          />
        ))}
      </CardList>
      <SectionLabel label="Sistema" topSpacing={28}/>
      <CardList>
        <DetailRow
          icon={IcBell}
          label="Permisos del dispositivo"
          subtitle="Gestiona notificaciones desde ajustes del sistema"
          actionLabel="Abrir"
          onTap={() => toast.show({ message: 'Abre la configuración de tu dispositivo', duration: 1800 })}
        />
      </CardList>
    </SubScreen>
  );
}

// ── Sub-pantalla Privacidad ────────────────────────────────────────────────────
function PrivacidadSubScreen({ onBack }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const [priv, setPriv] = React.useState({
    perfilPublico: true, mostrarActividad: true, estadisticasPublicas: false,
    mostrarLogros: true, mostrarResenas: true,
  });
  const tog = (key, onMsg, offMsg) => {
    const next = !priv[key];
    setPriv(prev => ({ ...prev, [key]: next }));
    toast.show({ message: next ? onMsg : offMsg, duration: 1400 });
  };

  return (
    <SubScreen title="Privacidad" onBack={onBack}>
      <SectionLabel label="Tu perfil" topSpacing={20}/>
      <CardList>
        <ToggleRow icon="👁️" label="Perfil público"
          subtitle="Tu perfil es visible para otros usuarios de Mentex"
          on={priv.perfilPublico}
          onToggle={() => tog('perfilPublico', 'Perfil ahora público', 'Perfil ahora privado')}
        />
        <ToggleRow icon="📊" label="Mostrar actividad"
          subtitle="Otros pueden ver cuándo estudiaste y tus horas"
          on={priv.mostrarActividad}
          onToggle={() => tog('mostrarActividad', 'Actividad visible', 'Actividad oculta')}
        />
        <ToggleRow icon="📈" label="Estadísticas públicas"
          subtitle="XP, nivel y racha visible en tu perfil"
          on={priv.estadisticasPublicas}
          onToggle={() => tog('estadisticasPublicas', 'Estadísticas visibles', 'Estadísticas ocultas')}
        />
        <ToggleRow icon="🏆" label="Mostrar logros"
          subtitle="Tus medallas y logros son públicos en tu perfil"
          on={priv.mostrarLogros}
          onToggle={() => tog('mostrarLogros', 'Logros visibles', 'Logros ocultos')}
        />
        <ToggleRow icon="⭐" label="Mostrar reseñas"
          subtitle="Tus reseñas de contenido son visibles para otros"
          on={priv.mostrarResenas}
          onToggle={() => tog('mostrarResenas', 'Reseñas visibles', 'Reseñas ocultas')}
        />
      </CardList>
      <SectionLabel label="Datos y seguridad" topSpacing={28}/>
      <CardList>
        <DetailRow
          icon={IcShield}
          label="Mis datos"
          subtitle="Descarga o elimina tu información personal"
          actionLabel="Solicitar"
          onTap={() => toast.show({ message: 'Solicitud de datos — próximamente', duration: 1600 })}
        />
      </CardList>
    </SubScreen>
  );
}

// ── Sub-pantalla Apariencia ────────────────────────────────────────────────────
var ACCENT_COLORS = [
  { id: 'neon',   hex: '#3DFFD1', label: 'Neon'    },
  { id: 'purple', hex: '#A78BFA', label: 'Violeta' },
  { id: 'gold',   hex: '#FFD66B', label: 'Oro'     },
  { id: 'coral',  hex: '#FF8B6A', label: 'Coral'   },
  { id: 'sky',    hex: '#60C8FF', label: 'Cielo'   },
  { id: 'rose',   hex: '#FF6B9D', label: 'Rosa'    },
];

var FONT_OPTIONS = [
  { id: 'geist',   label: 'Geist',   ff: '"Geist", sans-serif' },
  { id: 'inter',   label: 'Inter',   ff: '"Inter", sans-serif' },
  { id: 'manrope', label: 'Manrope', ff: '"Manrope", sans-serif' },
];

var THEME_OPTIONS = [
  { id: 'dark',   icon: '🌑', label: 'Oscuro',  subtitle: 'Modo actual de Mentex' },
  { id: 'amoled', icon: '⚫', label: 'AMOLED',  subtitle: 'Negro puro, ahorra batería' },
  { id: 'system', icon: '🌗', label: 'Sistema', subtitle: 'Sigue la preferencia del dispositivo' },
];

function AparienciaSubScreen({ onBack }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const [accent, setAccent] = React.useState('neon');
  const [font,   setFont]   = React.useState('inter');
  const [theme,  setTheme]  = React.useState('dark');

  return (
    <SubScreen title="Apariencia" onBack={onBack}>
      {/* Color de acento */}
      <SectionLabel label="Color de acento" topSpacing={20}/>
      <div style={{
        margin: '0 16px', padding: '16px 14px', borderRadius: 13,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.012))',
        border: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
          {ACCENT_COLORS.map(({ id, hex, label }) => (
            <button key={id} onClick={() => { setAccent(id); toast.show({ message: `Color: ${label}`, duration: 900 }); }}
              className="mtx-tap" aria-label={label}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px' }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: '50%', background: hex,
                boxShadow: accent === id
                  ? `0 0 0 3px rgba(255,255,255,0.16), 0 0 18px ${hex}60`
                  : `0 0 0 1.5px rgba(255,255,255,0.04)`,
                transition: 'box-shadow 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {accent === id && (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 4.5" stroke="#0D1210" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', letterSpacing: '-0.01em', fontFamily: 'var(--ff-sans)' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tipografía */}
      <SectionLabel label="Tipografía" topSpacing={28}/>
      <CardList>
        {FONT_OPTIONS.map(({ id, label, ff }) => {
          const active = font === id;
          return (
            <button key={id} onClick={() => { setFont(id); toast.show({ message: `Fuente: ${label}`, duration: 900 }); }}
              className="mtx-tap"
              style={{
                width: '100%', appearance: 'none', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 13,
                background: active
                  ? 'linear-gradient(180deg, rgba(61,255,209,0.06), rgba(61,255,209,0.02))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.012))',
                border: active ? '0.5px solid rgba(61,255,209,0.22)' : '0.5px solid rgba(255,255,255,0.10)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)', fontFamily: 'var(--ff-sans)',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: active ? 'var(--neon)' : 'var(--ink-2)', fontFamily: ff,
              }}>Aa</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: active ? 'var(--neon)' : 'var(--ink-2)', letterSpacing: '-0.005em' }}>{label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontStyle: 'italic' }}>El texto de la app usará esta fuente</div>
              </div>
              {active && (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5L13 4.5" stroke="var(--neon)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          );
        })}
      </CardList>

      {/* Tema */}
      <SectionLabel label="Tema" topSpacing={28}/>
      <CardList>
        {THEME_OPTIONS.map(({ id, icon, label, subtitle }) => {
          const active = theme === id;
          return (
            <button key={id}
              onClick={() => { setTheme(id); if (id !== 'dark') toast.show({ message: `Tema "${label}" — próximamente`, duration: 1200 }); }}
              className="mtx-tap"
              style={{
                width: '100%', appearance: 'none', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 13,
                background: active
                  ? 'linear-gradient(180deg, rgba(61,255,209,0.06), rgba(61,255,209,0.02))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.012))',
                border: active ? '0.5px solid rgba(61,255,209,0.22)' : '0.5px solid rgba(255,255,255,0.10)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)', fontFamily: 'var(--ff-sans)',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>{icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: active ? 'var(--neon)' : 'var(--ink-2)', letterSpacing: '-0.005em' }}>{label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontStyle: 'italic' }}>{subtitle}</div>
              </div>
              {active && (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5L13 4.5" stroke="var(--neon)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          );
        })}
      </CardList>
    </SubScreen>
  );
}

// ── Sub-pantalla Preferencias ──────────────────────────────────────────────────
var ALL_INTERESTS = [
  { id: 'habitos',       icon: '⚡', label: 'Hábitos' },
  { id: 'productividad', icon: '🎯', label: 'Productividad' },
  { id: 'meditacion',   icon: '🧘', label: 'Meditación' },
  { id: 'liderazgo',    icon: '👑', label: 'Liderazgo' },
  { id: 'finanzas',     icon: '💰', label: 'Finanzas' },
  { id: 'bienestar',    icon: '🌿', label: 'Bienestar' },
  { id: 'ciencia',      icon: '🔬', label: 'Ciencia' },
  { id: 'creatividad',  icon: '🎨', label: 'Creatividad' },
  { id: 'psicologia',   icon: '🧠', label: 'Psicología' },
  { id: 'negocios',     icon: '📈', label: 'Negocios' },
  { id: 'filosofia',    icon: '🦉', label: 'Filosofía' },
  { id: 'tecnologia',   icon: '💻', label: 'Tecnología' },
];

function PreferenciasSubScreen({ onBack }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const ob = window.__mtxOnboarding ? window.__mtxOnboarding.get() : null;
  const savedInterests = (ob && ob.answers && ob.answers.interests) || [];
  const [selected, setSelected] = React.useState(() => new Set(savedInterests));

  const toggleInterest = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // _bgForState — mismo patrón visual que CompactOptionCard del onboarding
  const cardBg = (active) => active
    ? { background: 'linear-gradient(180deg, rgba(61,255,209,0.16), rgba(61,255,209,0.05))',
        border: '0.5px solid rgba(61,255,209,0.50)',
        boxShadow: '0 0 24px rgba(61,255,209,0.12), inset 0 1px 0 rgba(61,255,209,0.22)' }
    : { background: 'linear-gradient(180deg, rgba(61,255,209,0.04) 0%, rgba(3,6,5,0.32) 100%)',
        border: '0.5px solid rgba(61,255,209,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(61,255,209,0.05)' };

  return (
    <SubScreen title="Preferencias" onBack={onBack}>
      <SectionLabel label="Tus intereses" topSpacing={20}/>
      <div style={{ margin: '0 16px' }}>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.32)', marginBottom: 14, letterSpacing: '-0.01em', lineHeight: 1.5 }}>
          Selecciona los temas que más te interesan. Personalizamos tu contenido y sugerencias con esto.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
          {ALL_INTERESTS.map(({ id, icon, label }) => {
            const active = selected.has(id);
            const bg = cardBg(active);
            return (
              <button key={id} onClick={() => toggleInterest(id)} className="mtx-tap"
                style={{
                  position: 'relative', appearance: 'none', cursor: 'pointer',
                  padding: '14px 8px', borderRadius: 14,
                  ...bg,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, transition: 'all .18s ease', fontFamily: 'var(--ff-sans)', minHeight: 86,
                }}
              >
                <div style={{ fontSize: 26, lineHeight: 1 }}>{icon}</div>
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: active ? 'var(--ink-1)' : 'var(--ink-2)',
                  textAlign: 'center', letterSpacing: '-0.005em', lineHeight: 1.2,
                }}>{label}</div>
                {active && (
                  <div style={{
                    position: 'absolute', top: 7, right: 7,
                    width: 18, height: 18, borderRadius: 9,
                    background: 'var(--neon)', color: '#02110b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800,
                  }}>✓</div>
                )}
              </button>
            );
          })}
        </div>
        <button onClick={() => toast.show({ message: 'Preferencias guardadas', duration: 1400 })} className="mtx-tap"
          style={{
            marginTop: 14, width: '100%', height: 42, borderRadius: 11,
            background: 'linear-gradient(135deg, var(--neon) 0%, rgba(61,255,209,0.88) 100%)',
            border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#050706',
            fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
            boxShadow: '0 0 22px rgba(61,255,209,0.25)',
          }}
        >
          Guardar preferencias
        </button>
      </div>

      <SectionLabel label="Idioma" topSpacing={28}/>
      <CardList>
        <CategoryRow icon="🌎" label="Español (Latinoamérica)" subtitle="Idioma actual de la app"
          onTap={() => toast.show({ message: 'Cambio de idioma — próximamente', duration: 1600 })}
        />
      </CardList>
    </SubScreen>
  );
}

// ── Sub-pantalla Soporte — Fase E ─────────────────────────────────────────────

var _FAQ_ITEMS = [
  { q: '¿Qué es Mentex?', a: 'Mentex es una plataforma de productividad que combina bloqueo de aplicaciones, rutinas automatizadas y contenido de crecimiento personal para ayudarte a enfocarte y aprender cada día.' },
  { q: '¿Cómo funciona el bloqueo de apps?', a: 'Configura rutinas en Ajustes → Rutinas y bloqueos. Mentex bloqueará las apps seleccionadas durante los períodos que definas, ayudándote a eliminar distracciones de forma automática.' },
  { q: '¿Puedo usar Mentex sin conexión?', a: 'Sí. Las sesiones de enfoque, rutinas y el contenido descargado funcionan sin internet. La sincronización en la nube y el chat con soporte requieren conexión.' },
  { q: '¿Cómo cancelo mi suscripción?', a: 'Puedes cancelar desde App Store → Tu perfil → Suscripciones. Los beneficios se mantienen activos hasta el final del período pagado.' },
  { q: '¿Mis datos están seguros?', a: 'Sí. Todos los datos se almacenan con cifrado AES-256. No vendemos ni compartimos tu información con terceros. Consulta nuestra Política de privacidad para más detalles.' },
  { q: '¿Cómo recupero el acceso a mi cuenta?', a: 'Toca "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión. Recibirás un correo con instrucciones para restablecer tu acceso en minutos.' },
  { q: '¿Mentex está disponible en otros idiomas?', a: 'Actualmente la app está disponible en Español. Estamos trabajando en soporte para inglés y portugués en próximas versiones.' },
  { q: '¿Puedo usar Mentex en varios dispositivos?', a: 'Sí. Tu cuenta sincroniza progreso, rutinas e historial entre todos tus dispositivos iOS y Android con la misma sesión iniciada.' },
  { q: '¿Cómo reporto un error?', a: 'Usa la opción "Reportar un error" en esta sección de Soporte. Incluye una descripción detallada y la categoría del problema para que podamos resolverlo más rápido.' },
  { q: '¿Cómo contacto a soporte humano?', a: 'Puedes escribirnos en el chat de soporte o enviarnos un correo a hola@mentex.app. Respondemos en menos de 24 horas en días hábiles.' },
];

var _ERROR_CATS = ['Pantalla congelada', 'Error de inicio de sesión', 'Contenido no carga', 'Bloqueo no funciona', 'Rutinas automáticas', 'Rendimiento lento', 'Otro'];

var _SOPORTE_REPLIES = [
  'Entiendo tu consulta. Déjame buscar la información más relevante para ti.',
  'Claro, con mucho gusto te ayudo. ¿Puedes darme más detalles sobre lo que necesitas?',
  'Ese es un punto muy válido. Nuestro equipo lo está revisando y lo atenderemos a la brevedad.',
  'Para ese caso te recomiendo escribirnos a hola@mentex.app y un agente humano te contactará en menos de 24 horas.',
  'Gracias por tu paciencia. Estamos trabajando en mejorar esa funcionalidad para la próxima versión.',
  '¡Buena pregunta! La respuesta más detallada la encuentras en nuestro Centro de ayuda, sección Preguntas frecuentes.',
];

// ── CalificarSheet — bottom sheet portal con 5 estrellas ─────────────────────
function CalificarSheet({ onClose }) {
  const [stars, setStars] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [review, setReview] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
  if (!overlayRoot) return null;

  const handleSend = () => {
    if (!stars) return;
    setSent(true);
    setTimeout(() => {
      onClose();
      toast.show({ message: '¡Gracias por tu calificación! ⭐', duration: 2200 });
    }, 1100);
  };

  return ReactDOM.createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 165, display: 'flex', alignItems: 'flex-end' }}>
      <style>{`@keyframes stgCalUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>
      <div onClick={onClose} role="button" tabIndex={-1} aria-label="Cerrar" onKeyDown={e => e.key === 'Escape' && onClose()} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.62)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      }}/>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative', zIndex: 1, width: '100%',
        background: 'linear-gradient(180deg, rgba(10,13,12,0.99) 0%, rgba(8,11,10,1) 100%)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: '0.5px solid rgba(255,255,255,0.09)', borderBottom: 'none',
        padding: '12px 24px 44px',
        animation: 'stgCalUp .30s cubic-bezier(.22,1,.36,1) both',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 28 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}/>
        </div>
        {/* Icon */}
        <div style={{ textAlign: 'center', fontSize: 48, marginBottom: 14, lineHeight: 1 }}>
          {sent ? '🎉' : '⭐'}
        </div>
        <h2 style={{
          textAlign: 'center', margin: '0 0 8px', fontSize: 22, fontWeight: 800,
          color: 'var(--ink-1)', letterSpacing: '-0.03em', fontFamily: 'var(--ff-sans)',
        }}>
          {sent ? '¡Gracias por tu apoyo!' : '¿Qué tal te parece Mentex?'}
        </h2>
        <p style={{ textAlign: 'center', margin: '0 0 22px', fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55, fontFamily: 'var(--ff-sans)' }}>
          {sent ? 'Tu opinión nos ayuda a construir una mejor app.' : 'Tu calificación nos ayuda a llegar a más personas.'}
        </p>
        {/* Stars */}
        {!sent && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setStars(n)}
                onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                className="mtx-tap" tabIndex={0}
                style={{ background: 'none', border: 'none', cursor: 'pointer', appearance: 'none', padding: '2px 3px' }}>
                <span style={{ fontSize: 30, opacity: n <= (hover || stars) ? 1 : 0.2, transition: 'opacity 0.12s, transform 0.12s', display: 'block', transform: n <= (hover || stars) ? 'scale(1.1)' : 'scale(1)' }}>⭐</span>
              </button>
            ))}
          </div>
        )}
        {/* Campo de reseña — aparece al seleccionar estrellas */}
        {!sent && stars > 0 && (
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="Cuéntanos tu experiencia (opcional)…"
            style={{
              width: '100%', minHeight: 90, padding: '12px 14px', marginBottom: 16,
              borderRadius: 14, border: '0.5px solid rgba(255,255,255,0.09)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--ink-1)', fontSize: 14, lineHeight: 1.6,
              fontFamily: 'var(--ff-sans)', resize: 'none',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
        )}
        {!sent && stars === 0 && <div style={{ marginBottom: 16 }}/>}
        {/* Primary CTA */}
        {!sent ? (
          <button onClick={handleSend} disabled={!stars} className="mtx-tap" tabIndex={0}
            style={{
              width: '100%', height: 56, borderRadius: 'var(--r-pill)',
              border: 'none', cursor: stars ? 'pointer' : 'default', appearance: 'none',
              background: stars ? 'var(--neon)' : 'rgba(255,255,255,0.06)',
              color: stars ? '#0D1210' : 'rgba(255,255,255,0.22)',
              fontSize: 16, fontWeight: 700, fontFamily: 'var(--ff-sans)', letterSpacing: '-0.01em',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.18s, color 0.18s',
              marginBottom: 10,
            }}>
            Enviar calificación
          </button>
        ) : (
          <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 28 }}>✨</span>
          </div>
        )}
        <button onClick={onClose} className="mtx-tap" tabIndex={0}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer', appearance: 'none',
            fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', padding: '8px 0',
            fontFamily: 'var(--ff-sans)',
          }}>
          Ahora no
        </button>
      </div>
    </div>,
    overlayRoot
  );
}

// ── FAQSubScreen — acordeón 10 preguntas ──────────────────────────────────────
function FAQSubScreen({ onBack }) {
  const [openIdx, setOpenIdx] = React.useState(null);

  return (
    <SubScreen title="Centro de ayuda" onBack={onBack}>
      <SectionLabel label="Preguntas frecuentes" topSpacing={20}/>
      <div style={{ margin: '0 16px', borderRadius: 16, overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.07)' }}>
        {_FAQ_ITEMS.map((item, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={i} style={{ borderBottom: i < _FAQ_ITEMS.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}>
              <button onClick={() => setOpenIdx(isOpen ? null : i)} className="mtx-tap" tabIndex={0}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '15px 16px', cursor: 'pointer', appearance: 'none', border: 'none',
                  background: isOpen ? 'rgba(61,255,209,0.04)' : 'rgba(255,255,255,0.02)',
                  textAlign: 'left', gap: 12,
                }}>
                <span style={{
                  fontSize: 14, fontWeight: 600, fontFamily: 'var(--ff-sans)',
                  color: isOpen ? 'var(--neon)' : 'var(--ink-1)', lineHeight: 1.45, flex: 1,
                }}>
                  {item.q}
                </span>
                <span style={{
                  fontSize: 18, fontWeight: 300, flexShrink: 0,
                  color: isOpen ? 'var(--neon)' : 'rgba(255,255,255,0.25)',
                  transition: 'transform 0.18s, color 0.18s',
                  transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  display: 'block',
                }}>+</span>
              </button>
              {isOpen && (
                <div style={{ padding: '2px 16px 16px', background: 'rgba(61,255,209,0.02)' }}>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.7, fontFamily: 'var(--ff-sans)' }}>
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <SectionLabel label="¿No encontraste tu respuesta?" topSpacing={28}/>
      <div style={{ margin: '0 16px 8px', padding: '14px 16px', borderRadius: 13,
        background: 'rgba(61,255,209,0.04)', border: '0.5px solid rgba(61,255,209,0.14)',
      }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, fontFamily: 'var(--ff-sans)' }}>
          Escríbenos al chat de soporte o a <span style={{ color: 'var(--neon)', fontWeight: 600 }}>hola@mentex.app</span> y te respondemos en menos de 24h.
        </div>
      </div>
    </SubScreen>
  );
}

// ── ReportarErrorSubScreen ────────────────────────────────────────────────────
function ReportarErrorSubScreen({ onBack }) {
  const [cat, setCat] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  const canSend = cat && desc.trim().length > 10 && !sending;

  const handleSend = () => {
    if (!canSend) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setCat('');
      setDesc('');
      toast.show({ message: '¡Reporte enviado! Gracias por ayudarnos a mejorar.', duration: 2400 });
      onBack();
    }, 1300);
  };

  return (
    <SubScreen title="Reportar un error" onBack={onBack}>
      <SectionLabel label="Cuéntanos qué pasó" topSpacing={20}/>
      <div style={{ margin: '0 16px' }}>
        {/* Category chips */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'var(--ff-sans)' }}>
            Categoría
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {_ERROR_CATS.map(c => {
              const active = cat === c;
              return (
                <button key={c} onClick={() => setCat(c)} className="mtx-tap" tabIndex={0}
                  style={{
                    padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
                    appearance: 'none',
                    border: active ? '0.5px solid rgba(61,255,209,0.45)' : '0.5px solid rgba(255,255,255,0.1)',
                    background: active ? 'rgba(61,255,209,0.1)' : 'rgba(255,255,255,0.04)',
                    color: active ? 'var(--neon)' : 'var(--ink-2)',
                    fontSize: 13, fontWeight: 600, fontFamily: 'var(--ff-sans)',
                    transition: 'all 0.15s',
                  }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        {/* Description */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'var(--ff-sans)' }}>
            Descripción
          </div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Describe el problema con el mayor detalle posible…"
            style={{
              width: '100%', minHeight: 130, padding: '13px 14px',
              borderRadius: 14, border: '0.5px solid rgba(255,255,255,0.09)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--ink-1)', fontSize: 14, lineHeight: 1.65,
              fontFamily: 'var(--ff-sans)', resize: 'none',
              outline: 'none', boxSizing: 'border-box',
            }}/>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.2)', marginTop: 6, fontFamily: 'var(--ff-sans)' }}>
            {desc.trim().length < 10 ? `Mínimo 10 caracteres (${desc.trim().length}/10)` : `${desc.trim().length} caracteres`}
          </div>
        </div>
        {/* Submit */}
        <button onClick={handleSend} disabled={!canSend} className="mtx-tap" tabIndex={0}
          style={{
            width: '100%', height: 56, borderRadius: 'var(--r-pill)',
            border: 'none', cursor: canSend ? 'pointer' : 'default', appearance: 'none',
            background: canSend ? 'var(--neon)' : 'rgba(255,255,255,0.06)',
            color: canSend ? '#0D1210' : 'rgba(255,255,255,0.22)',
            fontSize: 16, fontWeight: 700, fontFamily: 'var(--ff-sans)', letterSpacing: '-0.01em',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.18s',
          }}>
          {sending ? 'Enviando…' : 'Enviar reporte'}
        </button>
      </div>
    </SubScreen>
  );
}

// ── SoporteChatSubScreen — chat idéntico al de IA ─────────────────────────────
function SoporteChatSubScreen({ onBack }) {
  const toast = window.useToast ? window.useToast() : { show: () => {} };
  const [messages, setMessages] = React.useState([
    {
      id: 'greet-1', role: 'assistant', state: 'done',
      content: '¡Hola! Soy el asistente de Mentex 👋\n\n¿En qué puedo ayudarte hoy? Puedo responder preguntas sobre la app, ayudarte con problemas técnicos o conectarte con nuestro equipo.',
    },
  ]);
  const [inputValue, setInputValue] = React.useState('');
  const [isThinking, setIsThinking] = React.useState(false);
  const textareaRef = React.useRef(null);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isThinking) return;
    const userMsgId = `u-${Date.now()}`;
    const botMsgId = `a-${Date.now() + 1}`;
    setInputValue('');
    setIsThinking(true);
    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', state: 'done', content: text },
      { id: botMsgId, role: 'assistant', state: 'reasoning', content: '' },
    ]);
    setTimeout(() => {
      const reply = _SOPORTE_REPLIES[Math.floor(Math.random() * _SOPORTE_REPLIES.length)];
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, state: 'streaming', content: '' } : m));
      let i = 0;
      const timer = setInterval(() => {
        i++;
        setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: reply.slice(0, i) } : m));
        if (i >= reply.length) {
          clearInterval(timer);
          setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, state: 'done' } : m));
          setIsThinking(false);
        }
      }, 18);
    }, 950);
  };

  const handleUpload = () => toast.show({ message: 'Adjuntar archivos — próximamente', duration: 1400 });
  const handleVoice  = () => toast.show({ message: 'Mensajes de voz — próximamente', duration: 1400 });

  return (
    <>
      <style>{`@keyframes mtx-sub-in { from { transform:translateX(32px); opacity:0; } to { transform:translateX(0); opacity:1; } }`}</style>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 110,
        background: '#080B0A',
        display: 'flex', flexDirection: 'column',
        animation: 'mtx-sub-in .3s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0, paddingTop: 60,
          background: 'linear-gradient(180deg, rgba(5,7,7,0.98) 0%, rgba(8,11,10,0.95) 100%)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onBack} aria-label="Volver" className="mtx-tap" tabIndex={0} style={{
              width: 36, height: 36, borderRadius: 999, flexShrink: 0,
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'var(--ink-1)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IcChevL size={15} stroke="currentColor" strokeWidth={1.9}/>
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <h1 style={{
                margin: 0, fontSize: 16, fontWeight: 600,
                color: 'var(--ink-1)', letterSpacing: '-0.02em', fontFamily: 'var(--ff-sans)',
              }}>Chat con soporte</h1>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(61,255,209,0.55)', letterSpacing: '0.01em' }}>
                En línea · respuesta en &lt;24h
              </span>
            </div>
            <div style={{ width: 36, flexShrink: 0 }}/>
          </div>
        </div>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {typeof IAMessages !== 'undefined'
            ? <IAMessages messages={messages}/>
            : <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 14 }}>Cargando chat…</div>
          }
        </div>
        {/* Input */}
        {typeof IAInputBar !== 'undefined' ? (
          <IAInputBar
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            onUpload={handleUpload}
            onVoice={handleVoice}
            disabled={isThinking}
            textareaRef={textareaRef}
          />
        ) : null}
      </div>
    </>
  );
}

// ── SoporteSubScreen — enrutador interno ──────────────────────────────────────
function SoporteSubScreen({ onBack }) {
  const [view, setView] = React.useState('main');
  const [showCalificar, setShowCalificar] = React.useState(false);

  if (view === 'chat')     return <SoporteChatSubScreen     onBack={() => setView('main')}/>;
  if (view === 'faq')      return <FAQSubScreen             onBack={() => setView('main')}/>;
  if (view === 'reportar') return <ReportarErrorSubScreen   onBack={() => setView('main')}/>;

  return (
    <>
      <SubScreen title="Soporte" onBack={onBack}>
        <SectionLabel label="Contáctanos" topSpacing={20}/>
        <CardList>
          <CategoryRow icon="💬" label="Chat con soporte"  subtitle="Respuesta en menos de 24h"
            onTap={() => setView('chat')}/>
          <CategoryRow icon="📧" label="Enviar correo"     subtitle="hola@mentex.app"
            onTap={() => { window.location.href = 'mailto:hola@mentex.app'; }}/>
          <CategoryRow icon="❓" label="Centro de ayuda"   subtitle="Preguntas frecuentes y guías"
            onTap={() => setView('faq')}/>
          <CategoryRow icon="🐛" label="Reportar un error" subtitle="Ayúdanos a mejorar Mentex"
            onTap={() => setView('reportar')}/>
          <CategoryRow icon="⭐" label="Calificar la app"  subtitle="Si te gusta, danos 5 estrellas"
            onTap={() => setShowCalificar(true)}/>
        </CardList>
        <SectionLabel label="Versión" topSpacing={28}/>
        <div style={{ margin: '0 16px', padding: '16px 18px', borderRadius: 16,
          background: 'linear-gradient(145deg, rgba(61,255,209,0.04) 0%, rgba(5,8,7,0.85) 100%)',
          border: '0.5px solid rgba(61,255,209,0.12)',
          boxShadow: 'inset 0 1px 0 rgba(61,255,209,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.03em', fontFamily: 'var(--ff-display)' }}>Mentex</span>
            <span style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--neon)',
              background: 'rgba(61,255,209,0.08)', border: '0.5px solid rgba(61,255,209,0.22)',
              padding: '3px 10px', borderRadius: 999,
            }}>v1.0.0</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5, letterSpacing: '-0.01em', fontFamily: 'var(--ff-sans)' }}>
            Build 2026.1
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(61,255,209,0.32)', letterSpacing: '-0.005em', fontFamily: 'var(--ff-sans)' }}>Made with ♥ in Latin America</div>
        </div>
      </SubScreen>
      {showCalificar && <CalificarSheet onClose={() => setShowCalificar(false)}/>}
    </>
  );
}

// ── Fase F — Contenido legal real ─────────────────────────────────────────────

var _LEGAL_DOCS = {
  terminos: {
    title: 'Términos de servicio', icon: '📄', version: 'v2.1.0', date: '1 de enero de 2026',
    sections: [
      { h: '1. Aceptación de los términos',
        body: 'Al descargar, instalar o usar Mentex, aceptas quedar vinculado por estos Términos de servicio. Si no estás de acuerdo con alguna disposición, debes abstenerte de usar la aplicación. El uso de Mentex está disponible para personas mayores de 13 años; los menores de 18 requieren la supervisión de un adulto responsable.' },
      { h: '2. Descripción del servicio',
        body: 'Mentex es una plataforma de productividad personal que combina herramientas de bloqueo de aplicaciones, rutinas automatizadas, sesiones de enfoque y contenido de crecimiento personal (audiolibros, meditaciones, charlas y más). El servicio se ofrece en modalidades gratuita y Premium.' },
      { h: '3. Registro y seguridad de la cuenta',
        body: 'Debes proporcionar información veraz al crear tu cuenta. Eres responsable de mantener la confidencialidad de tus credenciales y de todas las actividades realizadas bajo tu sesión. Notifica de inmediato a hola@mentex.app si detectas acceso no autorizado.' },
      { h: '4. Suscripciones y facturación',
        body: 'Mentex Premium se factura a través de la tienda de aplicaciones correspondiente (App Store o Google Play). Las suscripciones se renuevan automáticamente salvo que se cancelen al menos 24 horas antes del vencimiento del período vigente. Los reembolsos se gestionan según las políticas de cada tienda.' },
      { h: '5. Conducta del usuario', items: [
        'No utilizar la app para actividades ilegales o que perjudiquen a terceros.',
        'No intentar eludir, hackear ni alterar los sistemas de Mentex.',
        'No vender, transferir ni ceder tu cuenta a otra persona.',
        'No publicar contenido ofensivo, difamatorio o que viole derechos de terceros.',
        'No usar scraping, bots u otros medios automatizados para acceder al servicio.',
      ]},
      { h: '6. Propiedad intelectual',
        body: 'Todo el contenido disponible en Mentex —textos, audios, diseños, código y marca— es propiedad de Mentex S.A.S. o de sus respectivos licenciantes. Se te otorga una licencia limitada, no exclusiva e intransferible para uso personal. Su reproducción o distribución sin autorización está prohibida.' },
      { h: '7. Limitación de responsabilidad',
        body: 'Mentex se provee "tal como está". En la máxima medida permitida por la ley, no somos responsables por daños indirectos, incidentales o consecuentes derivados del uso o la imposibilidad de uso del servicio. Nuestra responsabilidad total máxima no excederá el monto pagado por el usuario en los últimos 12 meses.' },
      { h: '8. Modificaciones',
        body: 'Nos reservamos el derecho de modificar estos términos en cualquier momento. Te notificaremos sobre cambios materiales a través de la app o por correo electrónico. El uso continuado del servicio tras la notificación implica aceptación de los nuevos términos.' },
      { h: '9. Ley aplicable',
        body: 'Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa se someterá a los tribunales competentes de Bogotá, Colombia.' },
      { h: '10. Contacto legal',
        body: 'Para consultas sobre estos términos escríbenos a legal@mentex.app.' },
    ],
  },
  privacidad: {
    title: 'Política de privacidad', icon: '🔒', version: 'v1.8.0', date: '1 de enero de 2026',
    sections: [
      { h: '1. Responsable del tratamiento',
        body: 'Mentex S.A.S., con domicilio en Bogotá, Colombia, es responsable del tratamiento de tus datos personales. Contacto: privacidad@mentex.app.' },
      { h: '2. Datos que recopilamos', items: [
        'Datos de cuenta: nombre, correo electrónico y contraseña cifrada.',
        'Datos de uso: sesiones iniciadas, contenido consumido, rutinas configuradas, tiempo de enfoque.',
        'Datos de dispositivo: modelo, sistema operativo e identificadores para notificaciones push.',
        'Datos de pago: gestionados por App Store / Google Play; Mentex no almacena datos de tarjeta.',
        'Datos opcionales: foto de perfil, biografía y redes sociales añadidos voluntariamente.',
      ]},
      { h: '3. Finalidades del tratamiento', items: [
        'Prestar y mejorar el servicio de Mentex.',
        'Personalizar el contenido y las recomendaciones.',
        'Enviar notificaciones de recordatorio y progreso (con tu permiso).',
        'Detectar y prevenir fraudes o usos indebidos.',
        'Cumplir obligaciones legales y fiscales.',
      ]},
      { h: '4. Base legal',
        body: 'El tratamiento se sustenta en la ejecución del contrato de servicio aceptado, tu consentimiento para comunicaciones opcionales y el interés legítimo de Mentex en mejorar la plataforma.' },
      { h: '5. Almacenamiento y seguridad',
        body: 'Tus datos se almacenan en servidores de Google Firebase (Estados Unidos) con cifrado AES-256 en reposo y TLS 1.3 en tránsito. Aplicamos controles de acceso estrictos y revisamos nuestras medidas de seguridad periódicamente.' },
      { h: '6. Compartir con terceros',
        body: 'No vendemos ni compartimos tus datos con terceros con fines publicitarios. Solo los compartimos con proveedores esenciales (Firebase, Apple, Google) bajo acuerdos de confidencialidad y únicamente en la medida necesaria para prestar el servicio.' },
      { h: '7. Tus derechos', items: [
        'Acceso: solicitar una copia de tus datos personales.',
        'Rectificación: corregir datos inexactos desde tu perfil.',
        'Supresión: solicitar la eliminación de tu cuenta y datos.',
        'Portabilidad: recibir tus datos en formato estructurado.',
        'Oposición: oponerte al tratamiento basado en interés legítimo.',
      ]},
      { h: '8. Retención de datos',
        body: 'Conservamos tus datos mientras tu cuenta esté activa. Tras eliminar la cuenta, los datos se suprimen o anonimizan en máximo 30 días, salvo obligación legal de conservarlos por más tiempo.' },
      { h: '9. Menores de edad',
        body: 'Mentex no está dirigida a menores de 13 años. Si detectamos datos de un menor sin consentimiento parental verificable, los eliminaremos de inmediato.' },
      { h: '10. Cambios a esta política',
        body: 'Notificaremos cambios significativos en esta política con al menos 15 días de antelación, a través de la app o por correo electrónico.' },
    ],
  },
  cookies: {
    title: 'Política de cookies', icon: '🍪', version: 'v1.3.0', date: '1 de enero de 2026',
    sections: [
      { h: '¿Qué son las cookies y tecnologías similares?',
        body: 'Las cookies son pequeños archivos de texto almacenados en tu dispositivo. En la app de Mentex utilizamos tecnologías equivalentes como almacenamiento local (AsyncStorage / localStorage) y SDKs de terceros que pueden recopilar identificadores de dispositivo.' },
      { h: 'Almacenamiento esencial',
        body: 'Necesario para el funcionamiento del servicio. No puede desactivarse.',
        items: [
          'Token de sesión: mantiene tu sesión iniciada de forma segura.',
          'Preferencias de usuario: tema, idioma y configuración de la app.',
          'Estado de onboarding: registra si completaste la introducción.',
          'Cache de contenido: almacena temporalmente contenido para uso sin conexión.',
        ]},
      { h: 'Cookies analíticas',
        body: 'Nos ayudan a entender cómo se usa la app. Solo se activan con tu consentimiento.',
        items: [
          'Firebase Analytics: estadísticas de uso anonimizadas (pantallas visitadas, tiempo en sesión).',
          'Crashlytics: informes de errores técnicos sin información personal identificable.',
        ]},
      { h: 'SDKs de terceros', items: [
        'Firebase (Google): autenticación, base de datos y analytics. Política en firebase.google.com/support/privacy',
        'RevenueCat: gestión de suscripciones. Política en revenuecat.com/privacy',
        'Apple / Google: procesamiento de pagos y notificaciones push.',
      ]},
      { h: 'Control de cookies',
        body: 'Puedes gestionar las cookies analíticas en Ajustes → Privacidad → Análisis de uso. Las cookies esenciales no pueden desactivarse sin afectar el funcionamiento de la app. Para retirar tu consentimiento escríbenos a privacidad@mentex.app.' },
      { h: 'Actualizaciones',
        body: 'Esta política puede actualizarse cuando incorporemos nuevas tecnologías. La versión vigente siempre estará disponible en esta sección de la app.' },
    ],
  },
  licencias: {
    title: 'Licencias de código', icon: '⚖️', version: 'v1.0.0', date: '1 de enero de 2026',
    intro: 'Mentex utiliza el siguiente software de código abierto. Agradecemos a sus autores y comunidades por su invaluable contribución.',
    sections: [
      { h: 'React', meta: 'v18.3.1 · MIT License',
        body: 'Copyright (c) Meta Platforms, Inc. y colaboradores. Se concede permiso sin costo para usar, copiar, modificar, fusionar, publicar y distribuir este software bajo los términos de la Licencia MIT.' },
      { h: 'React DOM', meta: 'v18.3.1 · MIT License',
        body: 'Copyright (c) Meta Platforms, Inc. y colaboradores. Distribuido bajo Licencia MIT. Parte del ecosistema React.' },
      { h: 'Babel Standalone', meta: 'v7.x · MIT License',
        body: 'Copyright (c) 2014-presente Sebastian McKenzie y colaboradores de Babel. Transpilador de JavaScript moderno, distribuido bajo Licencia MIT.' },
      { h: 'Lucide Icons', meta: 'v0.x · ISC License',
        body: 'Copyright (c) 2020 Lucide Contributors. Librería de íconos open source distribuida bajo Licencia ISC, que permite su uso libre con o sin modificaciones.' },
      { h: 'Inter Typeface', meta: 'v4.0 · SIL Open Font License 1.1',
        body: 'Copyright (c) 2016 The Inter Project Authors (github.com/rsms/inter). Distribuida bajo SIL OFL 1.1, que permite su uso libre en aplicaciones de escritorio, web y móviles.' },
      { h: 'Geist Font', meta: 'v1.x · SIL Open Font License 1.1',
        body: 'Copyright (c) 2023 Vercel Inc. Tipografía optimizada para interfaces digitales, distribuida bajo SIL OFL 1.1.' },
      { h: 'Firebase JS SDK', meta: 'v10.x · Apache License 2.0',
        body: 'Copyright (c) Google LLC. Licenciado bajo Apache License 2.0. Permite uso, copia y distribución con o sin modificaciones, siempre incluyendo el aviso de copyright y la licencia correspondiente.' },
    ],
  },
};

// ── LegalDocScreen — visor scrolleable de documento legal ─────────────────────
function LegalDocScreen({ doc, onBack }) {
  return (
    <>
      <style>{`@keyframes mtx-sub-in { from { transform: translateX(32px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 110,
        background: '#080B0A',
        display: 'flex', flexDirection: 'column',
        animation: 'mtx-sub-in .3s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0, paddingTop: 60,
          background: 'linear-gradient(180deg, rgba(5,7,7,0.98) 0%, rgba(8,11,10,0.95) 100%)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onBack} aria-label="Volver" className="mtx-tap" tabIndex={0} style={{
              width: 36, height: 36, borderRadius: 999, flexShrink: 0,
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'var(--ink-1)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IcChevL size={15} stroke="currentColor" strokeWidth={1.9}/>
            </button>
            <h1 style={{
              flex: 1, textAlign: 'center', margin: 0, fontSize: 16, fontWeight: 600,
              color: 'var(--ink-1)', letterSpacing: '-0.02em', fontFamily: 'var(--ff-sans)',
            }}>{doc.title}</h1>
            <div style={{ width: 36, flexShrink: 0 }}/>
          </div>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Meta */}
          <div style={{ padding: '20px 20px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{doc.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-1)', fontFamily: 'var(--ff-sans)', letterSpacing: '-0.01em' }}>{doc.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--ff-sans)', marginTop: 1 }}>Última actualización: {doc.date}</div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--neon)', letterSpacing: '0.05em',
              background: 'rgba(61,255,209,0.08)', border: '0.5px solid rgba(61,255,209,0.2)',
              padding: '3px 9px', borderRadius: 999, flexShrink: 0,
            }}>{doc.version}</span>
          </div>
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)', margin: '16px 20px' }}/>
          {/* Intro */}
          {doc.intro && (
            <div style={{ margin: '0 20px 24px', padding: '13px 15px', borderRadius: 13,
              background: 'rgba(61,255,209,0.04)', border: '0.5px solid rgba(61,255,209,0.11)',
            }}>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.72, fontFamily: 'var(--ff-sans)' }}>
                {doc.intro}
              </p>
            </div>
          )}
          {/* Sections */}
          <div style={{ padding: '0 20px 72px' }}>
            {doc.sections.map((section, i) => (
              <div key={i} style={{ marginBottom: 26 }}>
                {/* Section heading */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
                  <div style={{
                    width: 2.5, flexShrink: 0, alignSelf: 'stretch', minHeight: 16,
                    borderRadius: 2, background: 'linear-gradient(180deg, var(--neon) 0%, rgba(61,255,209,0.2) 100%)',
                  }}/>
                  <h2 style={{
                    margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)',
                    letterSpacing: '-0.02em', lineHeight: 1.4, fontFamily: 'var(--ff-sans)',
                  }}>{section.h}</h2>
                </div>
                {/* OSS meta badge */}
                {section.meta && (
                  <div style={{ marginLeft: 12.5, marginBottom: 8 }}>
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, color: 'rgba(61,255,209,0.5)',
                      fontFamily: 'var(--ff-sans)', letterSpacing: '0.02em',
                    }}>{section.meta}</span>
                  </div>
                )}
                {/* Body paragraph */}
                {section.body && (
                  <p style={{ margin: '0 0 8px 12.5px', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.75, fontFamily: 'var(--ff-sans)', letterSpacing: '-0.003em' }}>
                    {section.body}
                  </p>
                )}
                {/* List */}
                {section.items && (
                  <div style={{ marginLeft: 12.5 }}>
                    {section.items.map((item, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 7 }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(61,255,209,0.38)', marginTop: 8, flexShrink: 0 }}/>
                        <span style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.68, fontFamily: 'var(--ff-sans)', letterSpacing: '-0.003em' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {/* Footer */}
            <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6, fontFamily: 'var(--ff-sans)', textAlign: 'center' }}>
                Mentex S.A.S. · Bogotá, Colombia<br/>legal@mentex.app
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Sub-pantalla Términos — enrutador interno ─────────────────────────────────
function TerminosSubScreen({ onBack }) {
  const [view, setView] = React.useState('main');

  if (view === 'terminos')   return <LegalDocScreen doc={_LEGAL_DOCS.terminos}   onBack={() => setView('main')}/>;
  if (view === 'privacidad') return <LegalDocScreen doc={_LEGAL_DOCS.privacidad} onBack={() => setView('main')}/>;
  if (view === 'cookies')    return <LegalDocScreen doc={_LEGAL_DOCS.cookies}    onBack={() => setView('main')}/>;
  if (view === 'licencias')  return <LegalDocScreen doc={_LEGAL_DOCS.licencias}  onBack={() => setView('main')}/>;

  return (
    <SubScreen title="Términos" onBack={onBack}>
      <SectionLabel label="Documentos legales" topSpacing={20}/>
      <CardList>
        <CategoryRow icon="📄" label="Términos de servicio"    subtitle="Condiciones de uso de la plataforma"    onTap={() => setView('terminos')}/>
        <CategoryRow icon="🔒" label="Política de privacidad"  subtitle="Cómo tratamos tus datos personales"     onTap={() => setView('privacidad')}/>
        <CategoryRow icon="🍪" label="Política de cookies"     subtitle="Uso de cookies y almacenamiento local"  onTap={() => setView('cookies')}/>
        <CategoryRow icon="⚖️" label="Licencias de código"     subtitle="Software de código abierto utilizado"  onTap={() => setView('licencias')}/>
      </CardList>
      <div style={{ padding: '24px 20px 8px', textAlign: 'center', fontFamily: 'var(--ff-sans)' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', lineHeight: 1.7 }}>
          Mentex S.A.S. · Bogotá, Colombia<br/>legal@mentex.app
        </div>
      </div>
    </SubScreen>
  );
}

// ── LogoutConfirmSheet ────────────────────────────────────────────────────────
function LogoutConfirmSheet({ profile, onCancel, onConfirm }) {
  const accent    = (profile && profile.accent) || 'var(--neon)';
  const name      = (profile && profile.name)   || 'Usuario';
  const rawHandle = (profile && profile.handle) || 'usuario';
  const handle    = String(rawHandle).replace(/^@/, '');
  const initial   = name[0] ? name[0].toUpperCase() : 'U';

  return (
    <>
      <style>{`@keyframes stgLogoutUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>
      {/* Backdrop */}
      <div onClick={onCancel} role="button" tabIndex={-1} aria-label="Cerrar" onKeyDown={e => e.key === 'Escape' && onCancel()} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      }}/>
      {/* Sheet */}
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(180deg, rgba(5,7,7,0.99) 0%, rgba(8,11,10,1) 100%)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: '0.5px solid rgba(255,255,255,0.09)', borderBottom: 'none',
        padding: '12px 20px 40px',
        animation: 'stgLogoutUp .30s cubic-bezier(.22,1,.36,1) both',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 20 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}/>
        </div>
        {/* Profile chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22,
          padding: '12px 14px', borderRadius: 16,
          background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: (profile && profile.avatar)
              ? `url(${profile.avatar}) center/cover` : `radial-gradient(60% 60% at 50% 30%, ${accent}55, ${accent}1a 70%, transparent)`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accent, fontSize: 18, fontWeight: 700, fontFamily: 'var(--ff-display)',
            border: `1.5px solid ${accent}40`,
          }}>
            {!(profile && profile.avatar) && initial}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.015em', fontFamily: 'var(--ff-display)' }}>{name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', letterSpacing: '-0.01em' }}>@{handle}</div>
          </div>
        </div>
        {/* Title + description */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 8 }}>
            ¿Cerrar sesión?
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
            Tendrás que iniciar sesión de nuevo para acceder a tu cuenta y contenido.
          </div>
        </div>
        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onConfirm} className="mtx-tap" tabIndex={0}
            style={{
              width: '100%', height: 50, borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #FF4A6E 0%, #E03060 100%)',
              color: '#fff', fontSize: 15.5, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
              boxShadow: '0 4px 24px rgba(255,74,110,0.38)',
            }}>
            Cerrar sesión
          </button>
          <button onClick={onCancel} className="mtx-tap" tabIndex={0}
            style={{
              width: '100%', height: 46, borderRadius: 14,
              background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.52)', fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--ff-sans)', letterSpacing: '-0.01em',
            }}>
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}

// ── Sub-pantalla Eliminar cuenta ──────────────────────────────────────────────
var DELETE_REASONS = [
  { id: 'no-uso',          icon: '😴', label: 'Ya no uso la app' },
  { id: 'otra-plataforma', icon: '🔄', label: 'Cambié a otra plataforma' },
  { id: 'notificaciones',  icon: '🔔', label: 'Demasiadas notificaciones' },
  { id: 'tecnico',         icon: '🐛', label: 'Problemas técnicos' },
  { id: 'privacidad',      icon: '🔒', label: 'Preocupaciones de privacidad' },
  { id: 'otro',            icon: '💬', label: 'Otro motivo' },
];

function EliminarCuentaSubScreen({ profile, isPremium, onBack, onDeleted }) {
  const [step, setStep]             = React.useState(1);
  const [reason, setReason]         = React.useState(null);
  const [confirmText, setConfirmText] = React.useState('');
  const [deleting, setDeleting]     = React.useState(false);

  const name      = (profile && profile.name)   || 'Usuario';
  const rawHandle = (profile && profile.handle) || 'usuario';
  const handle    = String(rawHandle).replace(/^@/, '');
  const accent    = (profile && profile.accent) || 'var(--neon)';

  const handleDelete = () => {
    setDeleting(true);
    // Muestra el farewell primero, luego elimina la cuenta al expirar el timer
    setTimeout(() => { setStep(4); setDeleting(false); }, 700);
  };

  React.useEffect(() => {
    if (step !== 4) return;
    // Llamar deleteAccount justo antes de cerrar para que el farewell sea visible
    const t = setTimeout(() => {
      if (typeof window !== 'undefined' && window.__mtxAuth && typeof window.__mtxAuth.deleteAccount === 'function') {
        window.__mtxAuth.deleteAccount();
      }
      if (typeof onDeleted === 'function') onDeleted();
    }, 2600);
    return () => clearTimeout(t);
  }, [step, onDeleted]);

  // ── Step 1 — Consecuencias ─────────────────────────────────────────────────
  if (step === 1) return (
    <SubScreen title="Eliminar cuenta" onBack={onBack}>
      <div style={{ padding: '28px 20px 0', display: 'flex', flexDirection: 'column' }}>
        {/* Danger icon + heading */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{
            width: 76, height: 76, borderRadius: 22, marginBottom: 20,
            background: 'linear-gradient(145deg, rgba(255,74,110,0.14) 0%, rgba(255,74,110,0.04) 100%)',
            border: '0.5px solid rgba(255,74,110,0.28)',
            boxShadow: '0 0 44px rgba(255,74,110,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcTrash size={34} stroke="#FF4A6E" strokeWidth={1.5}/>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 8, textAlign: 'center' }}>
            Esta acción es permanente
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.40)', lineHeight: 1.55, letterSpacing: '-0.01em', textAlign: 'center' }}>
            Eliminarás tu cuenta y todos tus datos.<br/>No hay vuelta atrás.
          </div>
        </div>
        {/* Consequences card */}
        <div style={{
          marginBottom: 28, padding: '16px 18px', borderRadius: 16,
          background: 'rgba(255,74,110,0.06)', border: '0.5px solid rgba(255,74,110,0.18)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,74,110,0.75)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>
            Perderás permanentemente
          </div>
          {[
            `Lv ${(profile && profile.level) || 1} · ${(profile && profile.learningHours) || 47}h de aprendizaje · racha de ${(profile && profile.streak) || 12} días`,
            'Todos tus logros, reseñas y comentarios',
            'Tu historial completo de contenido visto',
            isPremium ? 'Tu suscripción activa (sin posibilidad de reembolso)' : null,
          ].filter(Boolean).map((line, i, arr) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < arr.length - 1 ? 10 : 0 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FF4A6E', flexShrink: 0, marginTop: 7 }}/>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.5, letterSpacing: '-0.01em' }}>{line}</div>
            </div>
          ))}
        </div>
        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setStep(2)} className="mtx-tap" tabIndex={0}
            style={{
              width: '100%', height: 50, borderRadius: 14, cursor: 'pointer',
              background: 'rgba(255,74,110,0.10)', border: '0.5px solid rgba(255,74,110,0.30)',
              color: '#FF6B88', fontSize: 15.5, fontWeight: 800,
              fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
            }}>
            Entiendo, continuar →
          </button>
          <button onClick={onBack} className="mtx-tap" tabIndex={0}
            style={{
              width: '100%', height: 46, borderRadius: 14, cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.52)', fontSize: 14.5, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
            }}>
            Cancelar, volver
          </button>
        </div>
      </div>
    </SubScreen>
  );

  // ── Step 2 — Motivo ────────────────────────────────────────────────────────
  if (step === 2) return (
    <SubScreen title="Tu opinión" onBack={() => setStep(1)}>
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 8 }}>
            ¿Por qué eliminas tu cuenta?
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
            Tu feedback nos ayuda a mejorar Mentex.
          </div>
        </div>
        {/* Reason cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
          {DELETE_REASONS.map(({ id, icon, label }) => {
            const sel = reason === id;
            return (
              <button key={id} onClick={() => setReason(id)} className="mtx-tap" tabIndex={0}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 16px', borderRadius: 14, cursor: 'pointer',
                  background: sel
                    ? 'linear-gradient(180deg, rgba(61,255,209,0.10), rgba(61,255,209,0.03))'
                    : 'linear-gradient(180deg, rgba(61,255,209,0.03) 0%, rgba(3,6,5,0.26) 100%)',
                  border: sel ? '0.5px solid rgba(61,255,209,0.38)' : '0.5px solid rgba(61,255,209,0.09)',
                  boxShadow: sel ? 'inset 0 1px 0 rgba(61,255,209,0.12)' : 'none',
                  transition: 'all .17s ease', fontFamily: 'var(--ff-sans)',
                }}>
                <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 14, fontWeight: sel ? 700 : 500, color: sel ? 'var(--ink-1)' : 'var(--ink-2)', letterSpacing: '-0.01em', flex: 1, textAlign: 'left' }}>{label}</span>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: sel ? '2px solid var(--neon)' : '1.5px solid rgba(255,255,255,0.18)',
                  background: sel ? 'var(--neon)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .17s ease',
                }}>
                  {sel && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0D1210' }}/>}
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={() => reason && setStep(3)} className="mtx-tap" tabIndex={0}
          style={{
            width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: reason ? 'pointer' : 'not-allowed',
            background: reason
              ? 'linear-gradient(135deg, rgba(255,74,110,0.88) 0%, rgba(224,48,96,0.92) 100%)'
              : 'rgba(255,255,255,0.06)',
            color: reason ? '#fff' : 'rgba(255,255,255,0.22)',
            fontSize: 15.5, fontWeight: 800,
            fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
            boxShadow: reason ? '0 4px 24px rgba(255,74,110,0.28)' : 'none',
            transition: 'all .20s ease',
          }}>
          Continuar →
        </button>
      </div>
    </SubScreen>
  );

  // ── Step 3 — Confirmación final ────────────────────────────────────────────
  if (step === 3) return (
    <SubScreen title="Confirmación final" onBack={() => setStep(2)}>
      <div style={{ padding: '24px 20px 0' }}>
        {/* Warning card */}
        <div style={{
          marginBottom: 28, padding: '15px 18px', borderRadius: 16,
          background: 'rgba(255,74,110,0.07)', border: '0.5px solid rgba(255,74,110,0.22)',
        }}>
          <div style={{ fontSize: 13.5, color: 'rgba(255,90,120,0.90)', lineHeight: 1.6, letterSpacing: '-0.01em' }}>
            Estás a punto de eliminar permanentemente la cuenta <span style={{ fontWeight: 800 }}>@{handle}</span> y todos sus datos asociados.
          </div>
        </div>
        {/* Confirm input */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.42)', letterSpacing: '-0.005em', marginBottom: 10, lineHeight: 1.5 }}>
            Para confirmar, escribe{' '}
            <span style={{ color: '#FF6B88', fontWeight: 800, fontFamily: 'var(--ff-display)', letterSpacing: '0.04em' }}>ELIMINAR</span>{' '}
            a continuación:
          </div>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="Escribe ELIMINAR"
            autoComplete="off"
            spellCheck="false"
            style={{
              display: 'block', width: '100%', height: 50, borderRadius: 14, boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)',
              border: confirmText === 'ELIMINAR'
                ? '0.5px solid rgba(255,74,110,0.55)'
                : '0.5px solid rgba(255,255,255,0.10)',
              color: confirmText === 'ELIMINAR' ? '#FF6B88' : 'var(--ink-1)',
              fontSize: 15, fontWeight: 700, fontFamily: 'var(--ff-display)', letterSpacing: '0.04em',
              padding: '0 16px', outline: 'none', transition: 'border .2s ease, color .2s ease',
            }}
          />
        </div>
        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => confirmText === 'ELIMINAR' && !deleting && handleDelete()}
            className={confirmText === 'ELIMINAR' && !deleting ? 'mtx-tap' : ''}
            tabIndex={0}
            style={{
              width: '100%', height: 50, borderRadius: 14, border: 'none',
              background: confirmText === 'ELIMINAR'
                ? 'linear-gradient(135deg, #FF4A6E 0%, #E03060 100%)'
                : 'rgba(255,255,255,0.05)',
              color: confirmText === 'ELIMINAR' ? '#fff' : 'rgba(255,255,255,0.20)',
              fontSize: 15.5, fontWeight: 800, cursor: confirmText === 'ELIMINAR' && !deleting ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--ff-display)', letterSpacing: '-0.015em',
              boxShadow: confirmText === 'ELIMINAR' ? '0 4px 30px rgba(255,74,110,0.42)' : 'none',
              transition: 'all .20s ease', opacity: deleting ? 0.7 : 1,
            }}>
            {deleting ? 'Eliminando…' : 'Eliminar mi cuenta'}
          </button>
          <button onClick={() => setStep(2)} className="mtx-tap" tabIndex={0}
            style={{
              width: '100%', height: 46, borderRadius: 14, cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.38)', fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
            }}>
            Cancelar
          </button>
        </div>
      </div>
    </SubScreen>
  );

  // ── Step 4 — Farewell ──────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0D1210',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 36px', animation: 'mtx-fade-up .40s ease both',
    }}>
      <style>{`@keyframes stgFarewellPulse { 0%,100%{ opacity:.35; transform:scale(.92); } 50%{ opacity:1; transform:scale(1); } }`}</style>
      <div style={{
        width: 80, height: 80, borderRadius: 24, marginBottom: 26,
        background: 'linear-gradient(145deg, rgba(61,255,209,0.12) 0%, rgba(61,255,209,0.04) 100%)',
        border: '0.5px solid rgba(61,255,209,0.20)',
        boxShadow: '0 0 52px rgba(61,255,209,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'stgFarewellPulse 1.9s ease-in-out infinite',
      }}>
        <IcLeaf size={36} stroke="var(--neon)" strokeWidth={1.5}/>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.03em', fontFamily: 'var(--ff-display)', marginBottom: 14, textAlign: 'center' }}>
        Cuenta eliminada
      </div>
      <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.36)', lineHeight: 1.65, letterSpacing: '-0.01em', textAlign: 'center' }}>
        Gracias por haber sido parte de Mentex.<br/>Esperamos verte de nuevo.
      </div>
    </div>
  );
}

// ── Mi Plan — mock data ───────────────────────────────────────────────────────
var _PAYMENT_HISTORY = [
  { id:'p1', date:'1 may 2026',  concept:'Mentex Premium · Anual',   amount:'$95.88', status:'paid'     },
  { id:'p2', date:'1 may 2025',  concept:'Mentex Premium · Anual',   amount:'$95.88', status:'paid'     },
  { id:'p3', date:'1 abr 2025',  concept:'Mentex Premium · Mensual', amount:'$9.99',  status:'refunded' },
  { id:'p4', date:'1 mar 2025',  concept:'Mentex Premium · Mensual', amount:'$9.99',  status:'paid'     },
  { id:'p5', date:'1 feb 2025',  concept:'Mentex Premium · Mensual', amount:'$9.99',  status:'paid'     },
];
var _CANCEL_REASONS = [
  { id:'cost',    label:'El precio es muy alto'        },
  { id:'use',     label:'No lo uso suficiente'         },
  { id:'content', label:'Poco contenido de mi interés' },
  { id:'bugs',    label:'Problemas técnicos'           },
  { id:'pause',   label:'Necesito una pausa'           },
  { id:'other',   label:'Otro motivo'                  },
];

var _COMPLETED_CONTENT = [
  { id:'cc1', type:'AUDIOLIBROS',  title:'Hábitos Atómicos',            author:'James Clear',       duration:'5h 18m', date:'2 may 2026' },
  { id:'cc2', type:'CHARLAS',      title:'Steve Jobs · Stanford 2005',  author:'Steve Jobs',        duration:'15 min', date:'1 may 2026' },
  { id:'cc3', type:'MEDITACIONES', title:'Respira y vuelve a ti',       author:'Mentex',            duration:'12 min', date:'30 abr 2026' },
  { id:'cc4', type:'AUDIOLIBROS',  title:'El poder del ahora',          author:'Eckhart Tolle',     duration:'7h 44m', date:'28 abr 2026' },
  { id:'cc5', type:'CHARLAS',      title:'Alan Watts · El silencio',    author:'Alan Watts',        duration:'18 min', date:'26 abr 2026' },
  { id:'cc6', type:'SONIDOS',      title:'Lluvia profunda',             author:'Mentex',            duration:'60 min', date:'25 abr 2026' },
  { id:'cc7', type:'MEDITACIONES', title:'Scan corporal nocturno',      author:'Mentex',            duration:'22 min', date:'23 abr 2026' },
  { id:'cc8', type:'AUDIOLIBROS',  title:'Deep Work',                   author:'Cal Newport',       duration:'6h 04m', date:'20 abr 2026' },
  { id:'cc9', type:'CHARLAS',      title:'Dieter Rams · Menos pero mejor',author:'Dieter Rams',     duration:'24 min', date:'18 abr 2026' },
  { id:'cc10',type:'AUDIOLIBROS',  title:'Sapiens',                     author:'Yuval Noah Harari', duration:'15h 17m',date:'10 abr 2026' },
];

var _COMPLETED_TYPE_COLOR = {
  AUDIOLIBROS:  '#3DFFD1',
  CHARLAS:      '#A78BFA',
  MEDITACIONES: '#6EE7B7',
  SONIDOS:      '#93C5FD',
  SERIES:       '#F9A8D4',
};
var _COMPLETED_TYPE_EMOJI = {
  AUDIOLIBROS:  '📚',
  CHARLAS:      '🎙️',
  MEDITACIONES: '🧘',
  SONIDOS:      '🌊',
  SERIES:       '🎬',
};

// ── ContentDetailSheet ────────────────────────────────────────────────────────
// Hook de integración con Explorar: window.__mtxPlayContent(item) se llama al reproducir.
// Explorar puede registrar su handler con: window.__mtxPlayContent = (item) => { ... }
function ContentDetailSheet({ item, onClose }) {
  const toast  = window.useToast ? window.useToast() : { show: () => {} };
  const color  = _COMPLETED_TYPE_COLOR[item.type] || 'var(--neon)';
  const emoji  = _COMPLETED_TYPE_EMOJI[item.type] || '📖';
  const sheetRef    = React.useRef(null);
  const touchStartY = React.useRef(null);

  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchMove  = (e) => {
    if (touchStartY.current === null || !sheetRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - touchStartY.current);
    sheetRef.current.style.transform = `translateY(${Math.min(dy, 260)}px)`;
  };
  const onTouchEnd = (e) => {
    const dy = touchStartY.current !== null ? e.changedTouches[0].clientY - touchStartY.current : 0;
    touchStartY.current = null;
    if (sheetRef.current) sheetRef.current.style.transform = '';
    if (dy > 100) onClose();
  };

  const handlePlay = () => {
    if (typeof window.__mtxPlayContent === 'function') {
      window.__mtxPlayContent(item);
    } else {
      toast.show({ message: `Reproduciendo: ${item.title}`, duration: 2200 });
    }
    onClose();
  };

  const handleSave = () => {
    toast.show({ message: 'Guardado en tu biblioteca', duration: 1800 });
    onClose();
  };

  const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
  if (!overlayRoot) return null;

  return ReactDOM.createPortal(
    <div style={{ position:'absolute', inset:0, zIndex:168, display:'flex', alignItems:'flex-end' }}>
      <style>{`@keyframes cdsUp { from{transform:translateY(100%);} to{transform:translateY(0);} }`}</style>

      {/* Backdrop */}
      <div onClick={onClose} role="button" tabIndex={-1} aria-label="Cerrar"
        onKeyDown={e => e.key === 'Escape' && onClose()}
        style={{
          position:'absolute', inset:0,
          background:'rgba(0,0,0,0.60)',
          backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
        }}/>

      {/* Sheet */}
      <div ref={sheetRef}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{
          position:'relative', zIndex:1, width:'100%',
          background:'linear-gradient(180deg, rgba(14,20,18,0.99) 0%, rgba(9,13,12,1) 100%)',
          borderTopLeftRadius:28, borderTopRightRadius:28,
          border:'0.5px solid rgba(255,255,255,0.08)', borderBottom:'none',
          animation:'cdsUp .30s cubic-bezier(.22,1,.36,1) both',
          transition:'transform 0.08s linear',
          padding:'0 0 40px',
        }}>

        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:8 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.16)' }}/>
        </div>

        {/* Hero — portada grande con gradiente del tipo */}
        <div style={{
          margin:'6px 20px 20px',
          height:160, borderRadius:22,
          background:`linear-gradient(145deg, ${color}28 0%, rgba(8,11,10,0.95) 100%)`,
          border:`0.5px solid ${color}22`,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10,
          position:'relative', overflow:'hidden',
        }}>
          {/* Glow radial */}
          <div style={{
            position:'absolute', top:'-30%', left:'50%', transform:'translateX(-50%)',
            width:180, height:180, borderRadius:'50%',
            background:`radial-gradient(circle, ${color}18 0%, transparent 70%)`,
            pointerEvents:'none',
          }}/>
          <div style={{ fontSize:52, lineHeight:1 }}>{emoji}</div>
          <div style={{
            fontSize:9, fontWeight:800, letterSpacing:'0.10em', textTransform:'uppercase',
            color, padding:'3px 10px', borderRadius:999,
            background:`${color}18`, border:`0.5px solid ${color}30`,
          }}>{item.type}</div>
        </div>

        {/* Info */}
        <div style={{ padding:'0 22px 24px' }}>
          <div style={{ fontSize:20, fontWeight:800, color:'var(--ink-1)', letterSpacing:'-0.028em', fontFamily:'var(--ff-display)', marginBottom:4, lineHeight:1.2 }}>
            {item.title}
          </div>
          <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.40)', marginBottom:14, letterSpacing:'-0.01em' }}>
            {item.author}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
            <div style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'5px 11px', borderRadius:999,
              background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.09)',
            }}>
              <IcClock size={11} stroke="rgba(255,255,255,0.40)" strokeWidth={2}/>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.45)', fontWeight:600 }}>{item.duration}</span>
            </div>
            <div style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'5px 11px', borderRadius:999,
              background:'rgba(61,255,209,0.06)', border:'0.5px solid rgba(61,255,209,0.14)',
            }}>
              <IcCheck size={11} stroke="var(--neon)" strokeWidth={2.8}/>
              <span style={{ fontSize:12, color:'rgba(61,255,209,0.80)', fontWeight:600 }}>Completado · {item.date}</span>
            </div>
          </div>

          {/* CTAs */}
          <button onClick={handlePlay} className="mtx-tap" tabIndex={0} style={{
            width:'100%', height:52, borderRadius:15, border:'none', cursor:'pointer',
            background:'linear-gradient(135deg, var(--neon) 0%, rgba(61,255,209,0.88) 100%)',
            color:'#050706', fontSize:15.5, fontWeight:800,
            fontFamily:'var(--ff-display)', letterSpacing:'-0.015em',
            boxShadow:'0 4px 28px rgba(61,255,209,0.32)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            marginBottom:10,
          }}>
            <IcPlay size={16} stroke="#050706"/>
            Escuchar de nuevo
          </button>
          <button onClick={handleSave} className="mtx-tap" tabIndex={0} style={{
            width:'100%', height:44, borderRadius:13, cursor:'pointer',
            background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)',
            color:'rgba(255,255,255,0.50)', fontSize:14, fontWeight:600,
            fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
          }}>Guardar en playlist</button>
        </div>
      </div>
    </div>,
    overlayRoot
  );
}

// ── ProgresosSubScreen ────────────────────────────────────────────────────────
function ProgresosSubScreen({ onBack }) {
  const [activeContent, setActiveContent] = React.useState(null);

  return (
    <SubScreen title="Mi aprendizaje" onBack={onBack}>
      <style>{`@keyframes prgFadeUp { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }`}</style>

      {/* ── Banner de métricas ──────────────────────────────────────────────── */}
      <div style={{
        margin:'20px 16px 0', padding:'20px 18px 18px', borderRadius:20,
        background:'linear-gradient(145deg, rgba(61,255,209,0.04) 0%, rgba(3,10,8,0.80) 100%)',
        border:'0.5px solid rgba(61,255,209,0.10)',
        boxShadow:'0 0 40px rgba(61,255,209,0.04), inset 0 1px 0 rgba(61,255,209,0.04)',
      }}>
        {/* Encabezado */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <div style={{
            width:38, height:38, borderRadius:12, flexShrink:0,
            background:'rgba(61,255,209,0.12)', border:'0.5px solid rgba(61,255,209,0.24)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <IcTrophy size={19} stroke="var(--neon)" strokeWidth={1.5}/>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:'var(--ink-1)', letterSpacing:'-0.02em', fontFamily:'var(--ff-display)' }}>Tu progreso</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.28)', letterSpacing:'-0.01em' }}>
              {(() => { const d=new Date(); const m=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return `Actualizado hoy · ${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`; })()}
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:9, marginBottom:18 }}>
          {[
            { icon: <IcCheck size={13} stroke="var(--neon)" strokeWidth={2.8}/>, value:'24', label:'Completados' },
            { icon: <IcClock size={13} stroke="var(--neon)" strokeWidth={2}/>,  value:'312h', label:'Aprendidas' },
            { icon: <IcFlame size={13} stroke="var(--neon)" strokeWidth={2}/>,  value:'47d',  label:'Racha activa' },
          ].map((s, i) => (
            <div key={i} style={{
              padding:'12px 8px 11px', borderRadius:13, textAlign:'center',
              background:'rgba(61,255,209,0.05)', border:'0.5px solid rgba(61,255,209,0.12)',
            }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:5 }}>{s.icon}</div>
              <div style={{ fontSize:19, fontWeight:800, color:'var(--ink-1)', letterSpacing:'-0.035em', fontFamily:'var(--ff-display)', lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.30)', marginTop:3, letterSpacing:'-0.005em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Divisor */}
        <div style={{ height:'0.5px', background:'rgba(61,255,209,0.10)', marginBottom:14 }}/>

        {/* Quote */}
        <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.34)', lineHeight:1.7, letterSpacing:'-0.01em', fontStyle:'italic' }}>
          "Cada contenido que terminas es un argumento más a favor de quien quieres ser."
        </div>
      </div>

      {/* ── Lista de completados ─────────────────────────────────────────────── */}
      <SectionLabel label={`Completados · ${_COMPLETED_CONTENT.length}`} topSpacing={26}/>
      <div style={{ margin:'0 16px', display:'flex', flexDirection:'column', gap:8 }}>
        {_COMPLETED_CONTENT.map((item, i) => {
          const color = _COMPLETED_TYPE_COLOR[item.type] || 'var(--neon)';
          const emoji = _COMPLETED_TYPE_EMOJI[item.type] || '📖';
          return (
            <div key={item.id} onClick={() => setActiveContent(item)}
              role="button" tabIndex={0} aria-label={item.title}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setActiveContent(item)}
              className="mtx-tap"
              style={{
                display:'flex', alignItems:'center', gap:13,
                padding:'13px 14px', borderRadius:15, cursor:'pointer',
                background:'rgba(255,255,255,0.025)',
                border:'0.5px solid rgba(255,255,255,0.07)',
                animation:`prgFadeUp .24s ease ${Math.min(i * 0.04, 0.3)}s both`,
              }}>
              {/* Portada */}
              <div style={{
                width:52, height:52, borderRadius:13, flexShrink:0,
                background:`linear-gradient(145deg, ${color}22 0%, rgba(8,11,10,0.85) 100%)`,
                border:`0.5px solid ${color}22`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:22,
              }}>{emoji}</div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:9.5, fontWeight:700, color, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:3 }}>{item.type}</div>
                <div style={{
                  fontSize:13.5, fontWeight:600, color:'var(--ink-1)', letterSpacing:'-0.015em',
                  marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                }}>{item.title}</div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <IcClock size={10} stroke="rgba(255,255,255,0.26)" strokeWidth={2}/>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.26)', letterSpacing:'-0.01em' }}>
                    {item.duration} · {item.date}
                  </span>
                </div>
              </div>

              {/* Check completado */}
              <div style={{
                width:28, height:28, borderRadius:'50%', flexShrink:0,
                background:'rgba(61,255,209,0.10)', border:'0.5px solid rgba(61,255,209,0.28)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <IcCheck size={13} stroke="var(--neon)" strokeWidth={2.8}/>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ height:40 }}/>

      {activeContent && (
        <ContentDetailSheet item={activeContent} onClose={() => setActiveContent(null)}/>
      )}
    </SubScreen>
  );
}

// ── PlanCycleSheet ─────────────────────────────────────────────────────────────
function PlanCycleSheet({ currentCycle, onCancel, onConfirm }) {
  const isGoingAnnual = currentCycle !== 'annual';
  const overlayRoot = typeof document !== 'undefined' ? document.getElementById('mtx-overlay-root') : null;
  if (!overlayRoot) return null;
  return ReactDOM.createPortal(
    <div style={{ position:'absolute', inset:0, zIndex:163, display:'flex', alignItems:'flex-end' }}>
      <style>{`@keyframes planCycUp { from{transform:translateY(100%);} to{transform:translateY(0);} }`}</style>
      <div onClick={onCancel} role="button" tabIndex={-1} aria-label="Cerrar"
        onKeyDown={e => e.key === 'Escape' && onCancel()}
        style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)' }}/>
      <div onClick={e => e.stopPropagation()} style={{
        position:'relative', zIndex:1, width:'100%',
        background:'linear-gradient(180deg, rgba(18,24,21,0.99) 0%, rgba(11,15,14,1) 100%)',
        borderTopLeftRadius:28, borderTopRightRadius:28,
        border:'0.5px solid rgba(255,255,255,0.09)', borderBottom:'none',
        padding:'12px 20px 44px',
        animation:'planCycUp .30s cubic-bezier(.22,1,.36,1) both',
      }}>
        <div style={{ display:'flex', justifyContent:'center', paddingBottom:20 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.16)' }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
          <div style={{
            width:62, height:62, borderRadius:18,
            background: isGoingAnnual ? 'rgba(61,255,209,0.1)' : 'rgba(255,255,255,0.06)',
            border: isGoingAnnual ? '0.5px solid rgba(61,255,209,0.22)' : '0.5px solid rgba(255,255,255,0.10)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <IcRefresh size={26} stroke={isGoingAnnual ? 'var(--neon)' : 'var(--ink-2)'} strokeWidth={1.6}/>
          </div>
        </div>
        <div style={{ textAlign:'center', marginBottom:26 }}>
          <div style={{ fontSize:21, fontWeight:800, color:'var(--ink-1)', letterSpacing:'-0.025em', fontFamily:'var(--ff-display)', marginBottom:10 }}>
            {isGoingAnnual ? 'Cambiar a plan anual' : 'Cambiar a plan mensual'}
          </div>
          {isGoingAnnual ? (
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.42)', lineHeight:1.65, letterSpacing:'-0.01em' }}>
              Pagarás <strong style={{ color:'var(--neon)' }}>$95.88/año</strong> en vez de $119.88.<br/>
              Ahorras <strong style={{ color:'var(--neon)' }}>$23.99 al año</strong> — equivale a 2 meses gratis.
            </div>
          ) : (
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.42)', lineHeight:1.65, letterSpacing:'-0.01em' }}>
              Pagarás <strong style={{ color:'var(--ink-1)' }}>$9.99/mes</strong>. El cambio aplica en tu
              próximo ciclo de facturación.
            </div>
          )}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={onConfirm} className="mtx-tap" tabIndex={0} style={{
            width:'100%', height:50, borderRadius:14, border:'none', cursor:'pointer',
            background: isGoingAnnual
              ? 'linear-gradient(135deg, var(--neon) 0%, rgba(61,255,209,0.88) 100%)'
              : 'rgba(255,255,255,0.08)',
            color: isGoingAnnual ? '#050706' : 'var(--ink-1)',
            fontSize:15.5, fontWeight:800,
            fontFamily:'var(--ff-display)', letterSpacing:'-0.015em',
            boxShadow: isGoingAnnual ? '0 4px 24px rgba(61,255,209,0.35)' : 'none',
          }}>
            {isGoingAnnual ? 'Cambiar a anual · Ahorrar $23.99' : 'Cambiar a mensual'}
          </button>
          <button onClick={onCancel} className="mtx-tap" tabIndex={0} style={{
            background:'none', border:'none', cursor:'pointer',
            color:'rgba(255,255,255,0.36)', fontSize:14, fontWeight:600, padding:'8px 0',
          }}>Cancelar</button>
        </div>
      </div>
    </div>,
    overlayRoot
  );
}

// ── CancelPlanSubScreen ────────────────────────────────────────────────────────
function CancelPlanSubScreen({ onBack, onCancelled }) {
  const [step, setStep]               = React.useState('intro');
  const [reason, setReason]           = React.useState(null);
  const [description, setDescription] = React.useState('');
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  const S = { position:'absolute', inset:0, display:'flex', flexDirection:'column', background:'#0D1210' };

  const Header = ({ title, onPrev }) => (
    <div style={{ flexShrink:0, padding:'56px 14px 14px', display:'flex', alignItems:'center', gap:8, borderBottom:'0.5px solid rgba(255,255,255,0.04)' }}>
      <button onClick={onPrev} className="mtx-tap" tabIndex={0} aria-label="Volver"
        style={{ width:36, height:36, borderRadius:999, flexShrink:0, background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <IcChevL size={15} stroke="var(--ink-2)" strokeWidth={1.9}/>
      </button>
      <h1 style={{ flex:1, textAlign:'center', margin:0, fontSize:16, fontWeight:600, color:'var(--ink-1)', letterSpacing:'-0.02em', fontFamily:'var(--ff-sans)' }}>{title}</h1>
      <div style={{ width:36, flexShrink:0 }}/>
    </div>
  );

  // ── intro ──────────────────────────────────────────────────────────────────
  if (step === 'intro') {
    const perks = [
      'Acceso a +2,400 contenidos premium',
      'Descargas offline para escuchar sin internet',
      'Coach IA ilimitado · sin restricciones',
      'Rutinas avanzadas y bloqueos inteligentes',
      'Sin anuncios, sin interrupciones',
    ];
    return (
      <div style={S}>
        <style>{`@keyframes cxFadeUp { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }`}</style>
        <Header title="Cancelar plan" onPrev={onBack}/>
        <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'28px 20px 44px' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:22 }}>
            <div style={{
              width:80, height:80, borderRadius:24,
              background:'linear-gradient(145deg, rgba(255,74,110,0.16) 0%, rgba(255,74,110,0.06) 100%)',
              border:'0.5px solid rgba(255,74,110,0.30)',
              boxShadow:'0 0 56px rgba(255,74,110,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <span style={{ color:'#FF4A6E', display:'inline-flex', alignItems:'center' }}>
                <IcCrown size={36} strokeWidth={1.3}/>
              </span>
            </div>
          </div>
          <div style={{ textAlign:'center', marginBottom:26 }}>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--ink-1)', letterSpacing:'-0.03em', fontFamily:'var(--ff-display)', marginBottom:10 }}>Esto es lo que perderías</div>
            <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.4)', lineHeight:1.6, letterSpacing:'-0.01em' }}>
              Si cancelas, tu acceso termina el<br/>
              <strong style={{ color:'var(--ink-2)' }}>31 de mayo, 2026</strong>.
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:30 }}>
            {perks.map((p, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:12, padding:'13px 15px', borderRadius:13,
                background:'rgba(255,74,110,0.07)', border:'0.5px solid rgba(255,74,110,0.22)',
                boxShadow:'inset 0 1px 0 rgba(255,74,110,0.06)',
                animation:`cxFadeUp .32s ease ${0.05 * i + 0.08}s both`,
              }}>
                <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, background:'rgba(255,74,110,0.18)', border:'0.5px solid rgba(255,74,110,0.30)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <IcClose size={10} stroke="#FF4A6E" strokeWidth={2.5}/>
                </div>
                <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.70)', letterSpacing:'-0.01em', lineHeight:1.4 }}>{p}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={onBack} className="mtx-tap" tabIndex={0} style={{
              width:'100%', height:50, borderRadius:14, border:'none', cursor:'pointer',
              background:'linear-gradient(135deg, var(--neon) 0%, rgba(61,255,209,0.88) 100%)',
              color:'#050706', fontSize:15.5, fontWeight:800,
              fontFamily:'var(--ff-display)', letterSpacing:'-0.015em',
              boxShadow:'0 4px 24px rgba(61,255,209,0.30)',
            }}>Seguir con Premium</button>
            <button onClick={() => setStep('reasons')} className="mtx-tap" tabIndex={0} style={{
              background:'none', border:'none', cursor:'pointer',
              color:'rgba(255,255,255,0.35)', fontSize:13.5, fontWeight:600, padding:'8px 0',
            }}>Continuar con la cancelación →</button>
          </div>
        </div>
      </div>
    );
  }

  // ── reasons ────────────────────────────────────────────────────────────────
  if (step === 'reasons') {
    return (
      <div style={S}>
        <style>{`@keyframes cxSlideIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }`}</style>
        <Header title="¿Por qué cancelas?" onPrev={() => setStep('intro')}/>
        <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'22px 20px 44px' }}>
          <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.38)', marginBottom:20, lineHeight:1.55, letterSpacing:'-0.01em' }}>
            Tu feedback nos ayuda a mejorar Mentex para todos.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gridAutoRows:'1fr', gap:9, marginBottom:16 }}>
            {_CANCEL_REASONS.map(r => {
              const sel = reason === r.id;
              return (
                <button key={r.id} onClick={() => setReason(r.id)} className="mtx-tap" tabIndex={0} style={{
                  padding:'14px 12px', borderRadius:13, cursor:'pointer', textAlign:'left',
                  background: sel ? 'rgba(255,74,110,0.10)' : 'rgba(255,255,255,0.04)',
                  border: sel ? '1px solid rgba(255,74,110,0.40)' : '0.5px solid rgba(255,255,255,0.08)',
                  fontSize:13, fontWeight: sel ? 700 : 500,
                  color: sel ? '#FF4A6E' : 'rgba(255,255,255,0.52)',
                  letterSpacing:'-0.01em', lineHeight:1.35,
                  boxShadow: sel ? '0 0 16px rgba(255,74,110,0.10)' : 'none',
                  transition:'all .14s ease',
                  display:'flex', alignItems:'flex-start', gap:7,
                }}>
                  <span style={{ marginTop:1, width:14, height:14, borderRadius:'50%', flexShrink:0, border: sel ? '1.5px solid #FF4A6E' : '1.5px solid rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .14s' }}>
                    {sel && <span style={{ width:6, height:6, borderRadius:'50%', background:'#FF4A6E', display:'block' }}/>}
                  </span>
                  {r.label}
                </button>
              );
            })}
          </div>

          {reason && (
            <div style={{ marginBottom:20, animation:'cxSlideIn .22s ease both' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.30)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8, fontFamily:'var(--ff-sans)' }}>
                Cuéntanos más (opcional)
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={280}
                placeholder="¿Hay algo que podríamos mejorar para que te quedaras?"
                style={{
                  width:'100%', minHeight:88, padding:'12px 14px', borderRadius:13,
                  border:'0.5px solid rgba(255,74,110,0.22)',
                  background:'rgba(255,74,110,0.04)',
                  color:'var(--ink-1)', fontSize:13.5, lineHeight:1.6,
                  fontFamily:'var(--ff-sans)', resize:'none',
                  outline:'none', boxSizing:'border-box',
                  transition:'border .14s',
                }}
              />
              <div style={{ textAlign:'right', fontSize:11, color:'rgba(255,255,255,0.22)', marginTop:4, opacity: description.length > 0 ? 1 : 0.35 }}>
                {description.length}/280
              </div>
            </div>
          )}

          <button onClick={() => reason && setStep('offer')} disabled={!reason}
            className="mtx-tap" tabIndex={0} style={{
              width:'100%', height:50, borderRadius:14, border:'none',
              cursor: reason ? 'pointer' : 'not-allowed',
              background: reason ? 'linear-gradient(135deg, #FF4A6E 0%, #C92855 100%)' : 'rgba(255,255,255,0.06)',
              color: reason ? '#fff' : 'rgba(255,255,255,0.26)',
              fontSize:15.5, fontWeight:800,
              fontFamily:'var(--ff-display)', letterSpacing:'-0.015em',
              boxShadow: reason ? '0 4px 24px rgba(255,74,110,0.35)' : 'none',
              transition:'all .16s ease',
            }}>Continuar</button>
        </div>
      </div>
    );
  }

  // ── offer ──────────────────────────────────────────────────────────────────
  if (step === 'offer') {
    const isCost  = reason === 'cost';
    const offerTitle  = isCost ? '¿Qué tal mitad de precio?' : '¿Qué tal una pausa?';
    const offerSub    = isCost
      ? 'Por motivos de precio, queremos mantenerte con nosotros.'
      : 'Entendemos que necesitas un descanso. Pausa sin perder nada.';
    const offerBadge  = isCost ? '50% DESC · 3 MESES' : '30 DÍAS GRATIS';
    const offerCTA    = isCost ? 'Aceptar oferta — $4.99/mes' : 'Pausar mi suscripción';
    const acceptToast = isCost ? '¡Oferta aplicada! $4.99/mes por 3 meses' : 'Suscripción pausada · Vuelves el 2 jun 2026';

    const offerCards = isCost ? [
      { icon:'💰', label:'Precio especial', value:'$4.99/mes', note:'50% de descuento' },
      { icon:'📅', label:'Duración', value:'3 meses', note:'Sin compromiso adicional' },
      { icon:'🔄', label:'Después', value:'$9.99/mes', note:'Cancelas cuando quieras' },
    ] : [
      { icon:'⏸️', label:'Pausa', value:'30 días', note:'Sin ningún cobro' },
      { icon:'📚', label:'Tu historial', value:'Intacto', note:'Todos tus datos se guardan' },
      { icon:'🔔', label:'Reactivación', value:'Automática', note:'Te avisamos 3 días antes' },
    ];

    return (
      <div style={{ ...S, display:'flex', flexDirection:'column' }}>
        <style>{`@keyframes cxOfferUp { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }`}</style>
        <Header title="Tenemos una oferta" onPrev={() => setStep('reasons')}/>
        <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'24px 20px 16px', boxSizing:'border-box', minWidth:0 }}>

          {/* Hero card */}
          <div style={{
            borderRadius:22, padding:'24px 20px 22px',
            background:'linear-gradient(145deg, rgba(61,255,209,0.09) 0%, rgba(3,10,8,0.70) 100%)',
            border:'0.5px solid rgba(61,255,209,0.22)',
            boxShadow:'0 0 70px rgba(61,255,209,0.08), inset 0 1px 0 rgba(61,255,209,0.06)',
            marginBottom:16, position:'relative', boxSizing:'border-box',
          }}>
            {isCost && (
              <div style={{
                position:'absolute', top:16, right:16,
                background:'var(--neon)', color:'#0D1210',
                fontSize:8.5, fontWeight:800, letterSpacing:'0.10em',
                padding:'4px 10px', borderRadius:999,
                boxShadow:'0 0 14px rgba(61,255,209,0.55)',
                whiteSpace:'nowrap',
              }}>{offerBadge}</div>
            )}
            <div style={{ width:52, height:52, borderRadius:15, marginBottom:16,
              background:'rgba(61,255,209,0.12)', border:'0.5px solid rgba(61,255,209,0.22)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'var(--neon)', display:'inline-flex' }}>
                <IcCrown size={26} strokeWidth={1.4}/>
              </span>
            </div>
            <div style={{ fontSize:20, fontWeight:800, color:'var(--ink-1)', letterSpacing:'-0.028em', fontFamily:'var(--ff-display)', marginBottom:7, paddingRight: isCost ? 80 : 0 }}>{offerTitle}</div>
            <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.46)', lineHeight:1.65, letterSpacing:'-0.01em' }}>{offerSub}</div>
          </div>

          {/* Detail cards */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:9, marginBottom:24 }}>
            {offerCards.map((c, i) => (
              <div key={i} style={{
                padding:'13px 10px', borderRadius:14, textAlign:'center',
                background:'rgba(61,255,209,0.04)', border:'0.5px solid rgba(61,255,209,0.14)',
                animation:`cxOfferUp .28s ease ${0.07 * i + 0.1}s both`,
              }}>
                <div style={{ fontSize:18, marginBottom:6 }}>{c.icon}</div>
                <div style={{ fontSize:10, fontWeight:600, color:'rgba(61,255,209,0.55)', letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:4 }}>{c.label}</div>
                <div style={{ fontSize:14, fontWeight:800, color:'var(--ink-1)', letterSpacing:'-0.02em', fontFamily:'var(--ff-display)', marginBottom:2 }}>{c.value}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.28)', lineHeight:1.4 }}>{c.note}</div>
              </div>
            ))}
          </div>

          {/* CTAs principales */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={() => { toast.show({ message: acceptToast, duration: 2600 }); onBack(); }}
              className="mtx-tap" tabIndex={0} style={{
                width:'100%', height:52, borderRadius:15, border:'none', cursor:'pointer',
                background:'linear-gradient(135deg, var(--neon) 0%, rgba(61,255,209,0.88) 100%)',
                color:'#050706', fontSize:15.5, fontWeight:800,
                fontFamily:'var(--ff-display)', letterSpacing:'-0.015em',
                boxShadow:'0 4px 28px rgba(61,255,209,0.35)',
              }}>{offerCTA}</button>
            <button onClick={onBack} className="mtx-tap" tabIndex={0} style={{
              width:'100%', height:44, borderRadius:13, cursor:'pointer',
              background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)',
              color:'rgba(255,255,255,0.45)', fontSize:14, fontWeight:600,
              fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
            }}>Mantener mi Premium</button>
          </div>
        </div>

        {/* Footer — Cancelar de todos modos (rojo, separado) */}
        <div style={{ flexShrink:0, padding:'12px 20px 36px', borderTop:'0.5px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => setStep('done')} className="mtx-tap" tabIndex={0} style={{
            width:'100%', height:46, borderRadius:13, border:'none', cursor:'pointer',
            background:'linear-gradient(135deg, rgba(255,74,110,0.18) 0%, rgba(180,30,60,0.14) 100%)',
            border:'0.5px solid rgba(255,74,110,0.28)',
            color:'#FF4A6E', fontSize:13.5, fontWeight:700,
            fontFamily:'var(--ff-sans)', letterSpacing:'-0.01em',
            boxShadow:'0 2px 16px rgba(255,74,110,0.12)',
          }}>Cancelar de todos modos</button>
        </div>
      </div>
    );
  }

  // ── done ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ ...S, alignItems:'center', justifyContent:'center', padding:'0 32px' }}>
      <style>{`@keyframes cxDonePulse { 0%,100%{ opacity:.35; transform:scale(.93); } 50%{ opacity:1; transform:scale(1); } }`}</style>
      <div style={{
        width:80, height:80, borderRadius:24, marginBottom:26,
        background:'rgba(255,74,110,0.08)', border:'0.5px solid rgba(255,74,110,0.20)',
        boxShadow:'0 0 50px rgba(255,74,110,0.09)',
        display:'flex', alignItems:'center', justifyContent:'center',
        animation:'cxDonePulse 2s ease-in-out infinite',
      }}>
        <IcLeaf size={36} stroke="#FF4A6E" strokeWidth={1.5}/>
      </div>
      <div style={{ fontSize:24, fontWeight:800, color:'var(--ink-1)', letterSpacing:'-0.03em', fontFamily:'var(--ff-display)', marginBottom:12, textAlign:'center' }}>
        Suscripción cancelada
      </div>
      <div style={{ fontSize:14, color:'rgba(255,255,255,0.36)', lineHeight:1.65, letterSpacing:'-0.01em', textAlign:'center', marginBottom:36 }}>
        Tu acceso Premium continúa hasta el<br/>
        <strong style={{ color:'rgba(255,255,255,0.55)' }}>31 de mayo, 2026</strong>.<br/>
        Luego pasarás al plan gratuito automáticamente.
      </div>
      <button onClick={onCancelled} className="mtx-tap" tabIndex={0} style={{
        width:'100%', height:50, borderRadius:14,
        background:'rgba(255,255,255,0.07)', border:'0.5px solid rgba(255,255,255,0.10)',
        color:'var(--ink-1)', fontSize:15, fontWeight:700, cursor:'pointer',
        fontFamily:'var(--ff-display)', letterSpacing:'-0.015em',
      }}>Entendido</button>
    </div>
  );
}

// ── MiPlanSubScreen ───────────────────────────────────────────────────────────
function MiPlanSubScreen({ onBack, isPremium, planCycle, daysLeft, onCycleChange, onOpenCancel, onUpgrade }) {
  const [cycleSheetOpen,   setCycleSheetOpen]   = React.useState(false);
  const [historyExpanded,  setHistoryExpanded]  = React.useState(false);
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  if (!isPremium) {
    return (
      <SubScreen title="Mi Plan" onBack={onBack}>
        <div style={{ margin:'28px 16px 0', padding:'22px 18px', borderRadius:16, background:'rgba(255,255,255,0.025)', border:'0.5px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize:14.5, fontWeight:600, color:'var(--ink-2)', fontFamily:'var(--ff-display)', letterSpacing:'-0.02em', marginBottom:6 }}>Plan gratuito</div>
          <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.36)', marginBottom:16, lineHeight:1.55, letterSpacing:'-0.01em' }}>
            Desbloquea +2,400 contenidos y todas las funciones premium de Mentex.
          </div>
          <button onClick={onUpgrade} className="mtx-tap" tabIndex={0} style={{
            width:'100%', height:44, borderRadius:12, border:'none', cursor:'pointer',
            background:'linear-gradient(135deg, var(--neon) 0%, rgba(61,255,209,0.88) 100%)',
            color:'#050706', fontSize:14, fontWeight:700,
            fontFamily:'var(--ff-display)', letterSpacing:'-0.015em',
            boxShadow:'0 0 24px rgba(61,255,209,0.28)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:7,
          }}>
            <IcCrown size={14} stroke="#050706" strokeWidth={2.2}/>
            Activar Mentex Premium
          </button>
        </div>
      </SubScreen>
    );
  }

  const cycleLabel  = planCycle === 'annual' ? 'Anual'      : 'Mensual';
  const cyclePrice  = planCycle === 'annual' ? '$7.99/mes'  : '$9.99/mes';
  const cycleBilled = planCycle === 'annual' ? 'Facturado $95.88/año' : 'Facturado mensualmente';
  const renewText   = daysLeft !== null ? `Renueva en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}` : 'Suscripción activa';

  return (
    <SubScreen title="Mi Plan" onBack={onBack}>

      {/* ── Estado del plan ─────────────────────────────────────────────────── */}
      <SectionLabel label="Estado" topSpacing={20}/>
      <div style={{
        margin:'0 16px', padding:'18px 18px 16px', borderRadius:16,
        background:'linear-gradient(145deg, rgba(61,255,209,0.07) 0%, rgba(3,10,8,0.55) 100%)',
        border:'0.5px solid rgba(61,255,209,0.18)',
        boxShadow:'0 0 40px rgba(61,255,209,0.06), inset 0 1px 0 rgba(61,255,209,0.07)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <IcCrown size={15} stroke="var(--neon)" strokeWidth={1.4}/>
            <span style={{ fontSize:15, fontWeight:700, color:'var(--neon)', fontFamily:'var(--ff-display)', letterSpacing:'-0.025em' }}>Mentex Premium</span>
          </div>
          <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.1em', color:'#0D1210', background:'var(--neon)', padding:'3px 9px', borderRadius:999, boxShadow:'0 0 10px rgba(61,255,209,0.4)' }}>ACTIVO</span>
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.36)', marginBottom:12, letterSpacing:'-0.01em' }}>
          {cycleLabel} · {cyclePrice} · {renewText}
        </div>
        <div style={{ height:'0.5px', background:'rgba(61,255,209,0.12)', marginBottom:11 }}/>
        <div style={{ fontSize:12, color:'rgba(61,255,209,0.5)', letterSpacing:'-0.01em' }}>{cycleBilled}</div>
      </div>

      {/* ── Ciclo de facturación ─────────────────────────────────────────────── */}
      <SectionLabel label="Ciclo de facturación" topSpacing={26}/>
      <div style={{ margin:'0 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {[
          { id:'monthly', title:'Mensual', price:'$9.99', sub:'/mes', note:'Facturado cada mes',  badge:null          },
          { id:'annual',  title:'Anual',   price:'$7.99', sub:'/mes', note:'2 meses gratis',       badge:'MEJOR VALOR' },
        ].map(opt => {
          const active = planCycle === opt.id;
          return (
            <button key={opt.id}
              onClick={() => { if (!active) setCycleSheetOpen(true); }}
              className="mtx-tap" tabIndex={0}
              style={{
                padding:'16px 14px', borderRadius:14,
                cursor: active ? 'default' : 'pointer',
                background: active ? 'rgba(61,255,209,0.08)' : 'rgba(255,255,255,0.04)',
                border: active ? '0.5px solid rgba(61,255,209,0.30)' : '0.5px solid rgba(255,255,255,0.08)',
                textAlign:'left', position:'relative',
                transition:'background .14s, border .14s',
              }}>
              {opt.badge && (
                <div style={{ position:'absolute', top:-8, right:10, fontSize:8.5, fontWeight:800, letterSpacing:'0.07em', color:'#0D1210', background:'var(--neon)', padding:'2.5px 7px', borderRadius:999 }}>
                  {opt.badge}
                </div>
              )}
              {active && (
                <div style={{ position:'absolute', top:10, right:10, width:17, height:17, borderRadius:'50%', background:'var(--neon)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <IcCheck size={9} stroke="#0D1210" strokeWidth={2.8}/>
                </div>
              )}
              <div style={{ fontSize:13, fontWeight:700, color: active ? 'var(--neon)' : 'var(--ink-2)', letterSpacing:'-0.015em', marginBottom:4 }}>{opt.title}</div>
              <div style={{ fontSize:19, fontWeight:800, color: active ? 'var(--ink-1)' : 'rgba(255,255,255,0.50)', letterSpacing:'-0.03em', fontFamily:'var(--ff-display)', lineHeight:1 }}>
                {opt.price}<span style={{ fontSize:11, fontWeight:500 }}>{opt.sub}</span>
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.26)', marginTop:6, letterSpacing:'-0.01em' }}>{opt.note}</div>
            </button>
          );
        })}
      </div>

      {/* ── Historial de pagos ───────────────────────────────────────────────── */}
      <div style={{ margin:'24px 16px 0' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:11 }}>
          <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.13em', color:'rgba(255,255,255,0.24)', textTransform:'uppercase', fontFamily:'var(--ff-sans)' }}>Historial de pagos</span>
          <button onClick={() => toast.show({ message: 'Exportar historial — próximamente', duration: 1600 })}
            className="mtx-tap" tabIndex={0}
            style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(61,255,209,0.55)', fontSize:11.5, fontWeight:600, letterSpacing:'-0.01em', padding:0 }}>
            Exportar
          </button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {_PAYMENT_HISTORY.slice(0, historyExpanded ? _PAYMENT_HISTORY.length : 2).map(p => (
            <div key={p.id} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'12px 14px', borderRadius:12,
              background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.07)',
            }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--ink-2)', letterSpacing:'-0.01em', marginBottom:2 }}>{p.concept}</div>
                <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.26)', letterSpacing:'-0.005em' }}>{p.date}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0, marginLeft:12 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--ink-1)', letterSpacing:'-0.02em' }}>{p.amount}</div>
                <div style={{
                  fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2.5px 7px', borderRadius:999,
                  background: p.status === 'paid' ? 'rgba(61,255,209,0.12)' : 'rgba(255,214,107,0.12)',
                  color:       p.status === 'paid' ? 'rgba(61,255,209,0.80)'  : 'rgba(255,214,107,0.80)',
                }}>{p.status === 'paid' ? 'PAGADO' : 'REEMBOLSO'}</div>
              </div>
            </div>
          ))}
          {!historyExpanded && _PAYMENT_HISTORY.length > 2 && (
            <button onClick={() => setHistoryExpanded(true)} className="mtx-tap" tabIndex={0}
              style={{ marginTop:2, width:'100%', height:40, borderRadius:11, cursor:'pointer',
                background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)',
                color:'rgba(255,255,255,0.42)', fontSize:12.5, fontWeight:600, letterSpacing:'-0.01em',
                display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
              <IcChevD size={12} stroke="rgba(255,255,255,0.35)" strokeWidth={2}/>
              Ver {_PAYMENT_HISTORY.length - 2} pago{_PAYMENT_HISTORY.length - 2 !== 1 ? 's' : ''} anterior{_PAYMENT_HISTORY.length - 2 !== 1 ? 'es' : ''}
            </button>
          )}
        </div>
      </div>

      {/* ── Zona de riesgo ───────────────────────────────────────────────────── */}
      <SectionLabel label="Zona de riesgo" topSpacing={28}/>
      <div style={{ margin:'0 16px 44px' }}>
        <button onClick={onOpenCancel} className="mtx-tap" tabIndex={0}
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:12,
            padding:'14px 16px', borderRadius:13, cursor:'pointer',
            background:'rgba(255,74,110,0.05)', border:'0.5px solid rgba(255,74,110,0.16)',
          }}>
          <div style={{ width:36, height:36, borderRadius:11, flexShrink:0, background:'rgba(255,74,110,0.20)', border:'0.5px solid rgba(255,74,110,0.30)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <IcClose size={16} stroke="rgba(255,255,255,0.85)" strokeWidth={2.2}/>
          </div>
          <div style={{ flex:1, textAlign:'left' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#FF4A6E', letterSpacing:'-0.015em' }}>Cancelar suscripción</div>
            <div style={{ fontSize:12, color:'rgba(255,74,110,0.55)', letterSpacing:'-0.01em', marginTop:2 }}>Tu acceso continúa hasta el 31 may 2026</div>
          </div>
          <IcChevR size={13} stroke="rgba(255,74,110,0.45)" strokeWidth={2.2} style={{ flexShrink:0 }}/>
        </button>
      </div>

      {cycleSheetOpen && (
        <PlanCycleSheet
          currentCycle={planCycle}
          onCancel={() => setCycleSheetOpen(false)}
          onConfirm={() => {
            const next = planCycle === 'annual' ? 'monthly' : 'annual';
            onCycleChange(next);
            setCycleSheetOpen(false);
            toast.show({
              message: next === 'annual' ? 'Cambiado a plan anual · Ahorras $23.99/año' : 'Cambiado a plan mensual',
              duration: 2200,
            });
          }}
        />
      )}
    </SubScreen>
  );
}

// ── Fase D — Rutinas y bloqueos ──────────────────────────────────────────────

var _DAY_LABELS = { mon:'L', tue:'M', wed:'X', thu:'J', fri:'V', sat:'S', sun:'D' };
var _DAY_ORDER  = ['mon','tue','wed','thu','fri','sat','sun'];
var _BG_DARK    = 'rgba(8,11,10,1)';
var _APP_NAMES  = { instagram:'Instagram', tiktok:'TikTok', youtube:'YouTube', x:'X', twitter:'X', facebook:'Facebook', whatsapp:'WhatsApp', snapchat:'Snapchat', reddit:'Reddit', linkedin:'LinkedIn', spotify:'Spotify', twitch:'Twitch', netflix:'Netflix', discord:'Discord', telegram:'Telegram', pinterest:'Pinterest', gmail:'Gmail', threads:'Threads', bereal:'BeReal' };

function _isRoutineActiveNow(routine) {
  if (!routine || !routine.schedule) return false;
  const dayKeys = ['sun','mon','tue','wed','thu','fri','sat'];
  const today   = dayKeys[new Date().getDay()];
  if (!routine.schedule.days || !routine.schedule.days.includes(today)) return false;
  const [sh, sm] = routine.schedule.startTime.split(':').map(Number);
  const [eh, em] = routine.schedule.endTime.split(':').map(Number);
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  return nowM >= sh * 60 + sm && nowM < eh * 60 + em;
}

function _fmtDuration(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m} min`;
}

// ── DeleteRoutineConfirmSheet ─────────────────────────────────────────────────
function DeleteRoutineConfirmSheet({ routine, isActive, onCancel, onConfirm }) {
  const overlayRoot = typeof document !== 'undefined'
    ? document.getElementById('mtx-overlay-root') : null;
  if (!overlayRoot) return null;

  const sheetRef    = React.useRef(null);
  const touchStartY = React.useRef(null);
  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchMove  = (e) => {
    if (touchStartY.current === null || !sheetRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - touchStartY.current);
    sheetRef.current.style.transform = `translateY(${Math.min(dy, 220)}px)`;
  };
  const onTouchEnd = (e) => {
    const dy = touchStartY.current !== null ? e.changedTouches[0].clientY - touchStartY.current : 0;
    touchStartY.current = null;
    if (sheetRef.current) sheetRef.current.style.transform = '';
    if (dy > 90) onCancel();
  };

  return ReactDOM.createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 164, display: 'flex', alignItems: 'flex-end' }}>
      <style>{`@keyframes delRtnUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>
      <div onClick={onCancel} role="button" tabIndex={-1} aria-label="Cerrar" onKeyDown={e => e.key === 'Escape' && onCancel()} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.60)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      }}/>

      <div ref={sheetRef}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{
          position: 'relative', zIndex: 1, width: '100%',
          background: 'linear-gradient(180deg, rgba(16,21,20,0.99) 0%, rgba(10,14,13,1) 100%)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          border: '0.5px solid rgba(255,255,255,0.09)', borderBottom: 'none',
          animation: 'delRtnUp .28s cubic-bezier(.22,1,.36,1) both',
          padding: '0 20px 44px',
          transition: 'transform 0.08s linear',
        }}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 20 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}/>
        </div>

        {/* Active warning pill */}
        {isActive && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '10px 14px', borderRadius: 12, marginBottom: 20,
            background: 'rgba(255,170,50,0.08)', border: '0.5px solid rgba(255,170,50,0.22)',
          }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
            <span style={{ fontSize: 12.5, color: 'rgba(255,185,80,0.9)', lineHeight: 1.5, letterSpacing: '-0.01em' }}>
              Esta rutina está activa ahora mismo. Eliminarla terminará tu sesión de enfoque.
            </span>
          </div>
        )}

        {/* Icon + copy */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 15, flexShrink: 0,
            background: 'rgba(255,74,110,0.10)', border: '0.5px solid rgba(255,74,110,0.20)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcTrash size={22} stroke="#FF4A6E" strokeWidth={1.7}/>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)', marginBottom: 4 }}>
              ¿Eliminar rutina?
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', letterSpacing: '-0.01em', lineHeight: 1.45 }}>
              {routine.schedule?.startTime}–{routine.schedule?.endTime} dejará de activarse.
            </div>
          </div>
        </div>

        {/* Actions */}
        <button onClick={onConfirm} className="mtx-tap" tabIndex={0}
          style={{
            width: '100%', height: 50, borderRadius: 15, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(255,74,110,0.22) 0%, rgba(255,74,110,0.14) 100%)',
            color: '#FF4A6E', fontSize: 15.5, fontWeight: 800, letterSpacing: '-0.015em',
            fontFamily: 'var(--ff-display)', marginBottom: 10,
            boxShadow: '0 4px 24px rgba(255,74,110,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          Eliminar
        </button>
        <button onClick={onCancel} className="mtx-tap" tabIndex={0}
          style={{
            width: '100%', height: 46, borderRadius: 14, cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)',
            color: 'var(--ink-2)', fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em',
            fontFamily: 'var(--ff-sans)',
          }}>
          Cancelar
        </button>
      </div>
    </div>,
    overlayRoot
  );
}

// ── RoutineEditSheet (legacy — reemplazado por AutoRoutineCreateSheet en edit mode) ──
function RoutineEditSheet({ routine, onClose, onSaved, onDelete }) {
  const [startTime,  setStartTime]  = React.useState(() => routine.schedule?.startTime || '09:00');
  const [endTime,    setEndTime]    = React.useState(() => routine.schedule?.endTime   || '17:00');
  const [days,       setDays]       = React.useState(() => routine.schedule?.days || ['mon','tue','wed','thu','fri']);
  const [deleteStep, setDeleteStep] = React.useState(false);

  const isActive  = _isRoutineActiveNow(routine);
  const canSave   = days.length > 0;
  const toggleDay = (d) => setDays(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d]);

  const sheetRef     = React.useRef(null);
  const touchStartY  = React.useRef(null);
  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchMove  = (e) => {
    if (touchStartY.current === null || !sheetRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - touchStartY.current);
    sheetRef.current.style.transform = `translateY(${Math.min(dy, 260)}px)`;
  };
  const onTouchEnd = (e) => {
    const dy = touchStartY.current !== null ? e.changedTouches[0].clientY - touchStartY.current : 0;
    touchStartY.current = null;
    if (sheetRef.current) sheetRef.current.style.transform = '';
    if (dy > 110) onClose();
  };

  const handleSave = () => {
    window.__mtxAutoRoutines.update(routine.id, {
      schedule: { ...routine.schedule, startTime, endTime, days },
    });
    onSaved && onSaved();
    onClose();
  };

  const handleConfirmDelete = () => {
    window.__mtxAutoRoutines.remove(routine.id);
    onDelete && onDelete();
    onClose();
  };

  const overlayRoot = typeof document !== 'undefined'
    ? document.getElementById('mtx-overlay-root') : null;
  if (!overlayRoot) return null;

  return ReactDOM.createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 163, display: 'flex', alignItems: 'flex-end' }}>
      <style>{`@keyframes rtnEditUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

      {/* Backdrop */}
      <div onClick={onClose} role="button" tabIndex={-1} aria-label="Cerrar" onKeyDown={e => e.key === 'Escape' && onClose()} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      }}/>

      {/* Sheet */}
      <div ref={sheetRef}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{
          position: 'relative', zIndex: 1, width: '100%',
          background: 'linear-gradient(180deg, rgba(14,20,18,0.99) 0%, rgba(9,13,12,1) 100%)',
          borderTopLeftRadius: 26, borderTopRightRadius: 26,
          border: '0.5px solid rgba(255,255,255,0.08)', borderBottom: 'none',
          animation: 'rtnEditUp .3s cubic-bezier(.22,1,.36,1) both',
          overflow: 'hidden',
          transition: 'transform 0.08s linear',
        }}>

        {/* Inline delete confirmation overlay */}
        {deleteStep && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            background: 'rgba(9,13,12,0.92)',
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '0 28px',
          }}>
            <div style={{
              width: 68, height: 68, borderRadius: 22, marginBottom: 20,
              background: 'rgba(255,74,110,0.12)', border: '0.5px solid rgba(255,74,110,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IcTrash size={30} stroke="#FF4A6E" strokeWidth={1.7}/>
            </div>

            {isActive && (
              <div style={{
                width: '100%', marginBottom: 18, padding: '12px 14px', borderRadius: 14,
                background: 'rgba(255,139,106,0.08)', border: '0.5px solid rgba(255,139,106,0.22)',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
                <span style={{ fontSize: 12.5, color: 'rgba(255,139,106,0.9)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                  Esta rutina está activa en este momento. Eliminarla terminará tu sesión de enfoque.
                </span>
              </div>
            )}

            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', marginBottom: 8, textAlign: 'center', fontFamily: 'var(--ff-display)' }}>
              ¿Eliminar rutina?
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.5, marginBottom: 32, letterSpacing: '-0.01em' }}>
              Esta acción no se puede deshacer.
            </div>

            <button onClick={handleConfirmDelete} className="mtx-tap" tabIndex={0}
              style={{
                width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'rgba(255,74,110,0.14)', color: '#FF4A6E',
                fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', fontFamily: 'var(--ff-sans)',
                marginBottom: 10, boxShadow: '0 4px 20px rgba(255,74,110,0.18)',
              }}>
              Eliminar rutina
            </button>
            <button onClick={() => setDeleteStep(false)} className="mtx-tap" tabIndex={0}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', padding: '8px 0',
                fontFamily: 'var(--ff-sans)',
              }}>
              Cancelar
            </button>
          </div>
        )}

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)' }}/>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 16px', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', fontFamily: 'var(--ff-display)' }}>
              Editar rutina
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, letterSpacing: '-0.01em' }}>
              Solo puedes editar el horario y los días
            </div>
          </div>
          <button onClick={onClose} className="mtx-tap" aria-label="Cerrar" tabIndex={0}
            style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <IcClose size={15} stroke="var(--ink-3)" strokeWidth={2}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '0 16px 36px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', maxHeight: '72vh' }}>

          {/* Horario */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'var(--ff-sans)' }}>
              Horario
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: 'Inicio', val: startTime, set: setStartTime },
                { label: 'Final',  val: endTime,   set: setEndTime   },
              ].map(({ label, val, set }) => (
                <div key={label} style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'var(--ff-sans)' }}>
                    {label}
                  </div>
                  <label style={{ display: 'block', position: 'relative' }}>
                    <div style={{
                      height: 48, borderRadius: 14, pointerEvents: 'none',
                      background: 'rgba(255,255,255,0.04)',
                      border: '0.5px solid rgba(61,255,209,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, color: 'var(--ink-1)',
                      fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
                    }}>{val}</div>
                    <input
                      type="time" value={val}
                      onChange={e => set(e.target.value)}
                      style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Días */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'var(--ff-sans)' }}>
              Repetir
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
              {_DAY_ORDER.map(d => {
                const on = days.includes(d);
                return (
                  <button key={d} onClick={() => toggleDay(d)} className="mtx-tap" tabIndex={0}
                    style={{
                      flex: 1, height: 42, borderRadius: 12,
                      border: on ? '0.5px solid rgba(61,255,209,0.40)' : '0.5px solid rgba(255,255,255,0.07)',
                      background: on ? 'rgba(61,255,209,0.11)' : 'rgba(255,255,255,0.04)',
                      color: on ? 'var(--neon)' : 'var(--ink-3)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'var(--ff-sans)',
                      transition: 'background .18s, border-color .18s, color .18s',
                    }}>
                    {_DAY_LABELS[d]}
                  </button>
                );
              })}
            </div>
            {days.length === 0 && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: '#ff8b8b', letterSpacing: '-0.01em' }}>
                Elige al menos un día para guardar.
              </div>
            )}
          </div>

          {/* Setup — solo lectura */}
          <div style={{
            padding: '14px 16px', borderRadius: 16, marginBottom: 26,
            background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'var(--ff-sans)' }}>
              Setup (solo lectura)
            </div>
            {[
              { label: 'Duración',          value: _fmtDuration(routine.minutes) },
              { label: 'Apps bloqueadas',   value: routine.blockedAppsIds?.length ? `${routine.blockedAppsIds.length} app${routine.blockedAppsIds.length !== 1 ? 's' : ''}` : 'Ninguna' },
              { label: 'Tareas del ritual', value: routine.routineIds?.length    ? `${routine.routineIds.length} tarea${routine.routineIds.length !== 1 ? 's' : ''}`         : 'Ninguna' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingBottom: i < arr.length - 1 ? 10 : 0,
                marginBottom: i < arr.length - 1 ? 10 : 12,
                borderBottom: i < arr.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <span style={{ fontSize: 13, color: 'var(--ink-3)', letterSpacing: '-0.01em' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '-0.01em' }}>{row.value}</span>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.22)', letterSpacing: '-0.005em', lineHeight: 1.5 }}>
              Para cambiar apps o tareas, crea una nueva rutina desde el inicio de una sesión.
            </div>
          </div>

          {/* Acciones */}
          <button onClick={handleSave} disabled={!canSave} className="mtx-tap" tabIndex={0}
            style={{
              width: '100%', height: 50, borderRadius: 16, border: 'none',
              cursor: canSave ? 'pointer' : 'not-allowed',
              background: canSave
                ? 'linear-gradient(135deg, var(--neon) 0%, rgba(61,255,209,0.88) 100%)'
                : 'rgba(255,255,255,0.06)',
              color: canSave ? '#050706' : 'rgba(255,255,255,0.25)',
              fontSize: 15.5, fontWeight: 800, letterSpacing: '-0.015em', fontFamily: 'var(--ff-display)',
              boxShadow: canSave ? '0 0 28px rgba(61,255,209,0.28)' : 'none',
              marginBottom: 10,
              transition: 'background .2s, box-shadow .2s, color .2s',
            }}>
            Guardar cambios
          </button>

          <button onClick={() => setDeleteStep(true)} className="mtx-tap" tabIndex={0}
            style={{
              width: '100%', height: 44, borderRadius: 14, cursor: 'pointer',
              background: 'rgba(255,74,110,0.07)', border: '0.5px solid rgba(255,74,110,0.18)',
              color: '#FF4A6E', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
              fontFamily: 'var(--ff-sans)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <IcTrash size={15} stroke="#FF4A6E" strokeWidth={2}/>
            Eliminar rutina
          </button>
        </div>
      </div>
    </div>,
    overlayRoot
  );
}

// ── RutinasSubScreen ──────────────────────────────────────────────────────────
function RutinasSubScreen({ onBack }) {
  const routines = useAutoRoutines();

  // Edit orchestration state
  const [editingRoutine,   setEditingRoutine]   = React.useState(null);
  const [editAppsIds,      setEditAppsIds]      = React.useState([]);
  const [editRoutineIds,   setEditRoutineIds]   = React.useState([]);
  const [editMinutes,      setEditMinutes]      = React.useState(90);
  const [appsEditorOpen,   setAppsEditorOpen]   = React.useState(false);
  const [routinesEdOpen,   setRoutinesEdOpen]   = React.useState(false);
  const [timeEditorOpen,   setTimeEditorOpen]   = React.useState(false);
  const [deleteConfirmFor, setDeleteConfirmFor] = React.useState(null);

  const openEdit = (r) => {
    setEditAppsIds(r.blockedAppsIds || []);
    setEditRoutineIds(r.routineIds || []);
    setEditMinutes(r.minutes || 90);
    setDeleteConfirmFor(null);
    setAppsEditorOpen(false);
    setRoutinesEdOpen(false);
    setTimeEditorOpen(false);
    setEditingRoutine(r);
  };

  const closeEdit = () => {
    setEditingRoutine(null);
    setAppsEditorOpen(false);
    setRoutinesEdOpen(false);
    setTimeEditorOpen(false);
    setDeleteConfirmFor(null);
  };

  const handleDeleteRequest  = () => setDeleteConfirmFor(editingRoutine);
  const handleDeleteCancel   = () => setDeleteConfirmFor(null);
  const handleDeleteConfirm  = () => {
    if (deleteConfirmFor) window.__mtxAutoRoutines.remove(deleteConfirmFor.id);
    closeEdit();
  };

  const overlayRoot = typeof document !== 'undefined'
    ? document.getElementById('mtx-overlay-root') : null;

  const routinesCatalog = (typeof window !== 'undefined' && window.ROUTINES) ? window.ROUTINES : [];

  // Portal: edit sheet + sub-editors + delete confirm
  const editPortal = (editingRoutine && overlayRoot) ? ReactDOM.createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 120 }}>
      {typeof AutoRoutineCreateSheet !== 'undefined' && (
        <AutoRoutineCreateSheet
          open={!!editingRoutine}
          onClose={closeEdit}
          editMode={true}
          routineId={editingRoutine.id}
          initialDays={editingRoutine.schedule?.days}
          initialStartTime={editingRoutine.schedule?.startTime}
          initialEndTime={editingRoutine.schedule?.endTime}
          initialMinutes={editMinutes}
          blockedAppsIds={editAppsIds}
          selectedRoutineIds={editRoutineIds}
          appsCatalog={[]}
          routinesCatalog={routinesCatalog}
          onSaved={closeEdit}
          onDelete={handleDeleteRequest}
          onEditApps={() => setAppsEditorOpen(true)}
          onEditRoutines={() => setRoutinesEdOpen(true)}
          onEditTime={() => setTimeEditorOpen(true)}
        />
      )}
      {appsEditorOpen && typeof AppsEditorSheet !== 'undefined' && (
        <AppsEditorSheet
          blockedApps={editAppsIds}
          onChange={(next) => setEditAppsIds(next)}
          onClose={() => setAppsEditorOpen(false)}
        />
      )}
      {routinesEdOpen && typeof RoutinesEditorSheet !== 'undefined' && (
        <RoutinesEditorSheet
          routines={routinesCatalog}
          activeIds={editRoutineIds}
          onChange={() => {}}
          onActiveChange={(ids) => setEditRoutineIds(ids)}
          onClose={() => setRoutinesEdOpen(false)}
        />
      )}
      {timeEditorOpen && typeof CustomTimeModal !== 'undefined' && (
        <CustomTimeModal
          open={timeEditorOpen}
          initialMinutes={editMinutes}
          onClose={() => setTimeEditorOpen(false)}
          onApply={(mins) => { setEditMinutes(mins); setTimeEditorOpen(false); }}
        />
      )}
      {deleteConfirmFor && (
        <DeleteRoutineConfirmSheet
          routine={deleteConfirmFor}
          isActive={_isRoutineActiveNow(deleteConfirmFor)}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>,
    overlayRoot
  ) : null;

  return (
    <>
      <SubScreen title="Rutinas automáticas" onBack={onBack}>
        {routines.length === 0 ? (

          /* ── Empty state ── */
          <div style={{ padding: '40px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 68, height: 68, borderRadius: 22, marginBottom: 18,
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
              boxShadow: '0 0 32px rgba(61,255,209,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IcClock size={30} stroke="rgba(255,255,255,0.35)" strokeWidth={1.6}/>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: '-0.025em', marginBottom: 8, textAlign: 'center', fontFamily: 'var(--ff-display)' }}>
              Sin rutinas automáticas
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.6, marginBottom: 28, letterSpacing: '-0.01em', maxWidth: 280 }}>
              Las rutinas automáticas inician tu sesión de enfoque solas en el horario que elijas.
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { n: '1', text: 'Ve al inicio y configura tu sesión: apps a bloquear, tareas del ritual y duración.' },
                { n: '2', text: 'Toca "Convertir en rutina automática" en tu setup.' },
                { n: '3', text: 'Elige días y horario. Tu sesión se iniciará sola automáticamente.' },
              ].map(s => (
                <div key={s.n} style={{
                  display: 'flex', gap: 14, padding: '13px 15px', borderRadius: 13,
                  background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.055)',
                  alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 999, flexShrink: 0,
                    background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11.5, fontWeight: 800, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--ff-display)',
                  }}>{s.n}</div>
                  <span style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                    {s.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

        ) : (

          /* ── Routine list ── */
          <div style={{ padding: '16px 16px 40px' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', letterSpacing: '-0.005em', marginBottom: 16 }}>
              {routines.length} rutina{routines.length !== 1 ? 's' : ''} configurada{routines.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {routines.map(r => {
                const isActive   = _isRoutineActiveNow(r);
                const activeDays = r.schedule?.days || [];
                return (
                  <button key={r.id} onClick={() => openEdit(r)}
                    className="mtx-tap" tabIndex={0}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                      padding: 0, borderRadius: 16, overflow: 'hidden',
                      background: isActive ? 'rgba(17,20,20,1)' : 'rgba(13,15,15,1)',
                      border: isActive
                        ? '0.5px solid rgba(61,255,209,0.18)'
                        : '0.5px solid rgba(255,255,255,0.07)',
                      boxShadow: isActive ? '0 2px 16px rgba(61,255,209,0.05)' : 'none',
                    }}>

                    <div style={{ display: 'flex' }}>
                      {/* Accent bar */}
                      <div style={{
                        width: 3, flexShrink: 0,
                        background: isActive
                          ? 'linear-gradient(180deg, var(--neon) 0%, rgba(61,255,209,0.25) 100%)'
                          : 'rgba(255,255,255,0.06)',
                      }}/>

                      <div style={{ flex: 1, padding: '14px 14px 13px 13px' }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 11 }}>
                          {/* Icon */}
                          <div style={{
                            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                            background: isActive ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.05)',
                            border: isActive ? '0.5px solid rgba(61,255,209,0.20)' : '0.5px solid rgba(255,255,255,0.07)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: isActive ? '0 0 10px rgba(61,255,209,0.10)' : 'none',
                          }}>
                            <IcClock size={17} stroke={isActive ? 'var(--neon)' : 'rgba(255,255,255,0.38)'} strokeWidth={1.8}/>
                          </div>

                          {/* Time + stats */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em',
                              fontFamily: 'var(--ff-display)', fontVariantNumeric: 'tabular-nums',
                              color: 'var(--ink-1)', lineHeight: 1.1, marginBottom: 3,
                            }}>
                              {r.schedule?.startTime || '—'} <span style={{ opacity: 0.4, fontWeight: 400 }}>→</span> {r.schedule?.endTime || '—'}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', letterSpacing: '-0.005em' }}>
                              {_fmtDuration(r.minutes)}
                              {(r.blockedAppsIds?.length > 0) ? ` · ${r.blockedAppsIds.length} app${r.blockedAppsIds.length !== 1 ? 's' : ''}` : ''}
                              {(r.routineIds?.length > 0)    ? ` · ${r.routineIds.length} tarea${r.routineIds.length !== 1 ? 's' : ''}` : ''}
                            </div>
                          </div>

                          {/* Badge + chevron */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                            {isActive ? (
                              <div style={{
                                padding: '2.5px 7px', borderRadius: 999,
                                background: 'rgba(61,255,209,0.13)', border: '0.5px solid rgba(61,255,209,0.28)',
                                fontSize: 9, fontWeight: 800, color: 'var(--neon)',
                                letterSpacing: '0.08em', whiteSpace: 'nowrap',
                                boxShadow: '0 0 7px rgba(61,255,209,0.15)',
                              }}>ACTIVA</div>
                            ) : <div style={{ height: 18 }}/>}
                            <IcChevR size={13} stroke="rgba(255,255,255,0.18)" strokeWidth={2.2}/>
                          </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: '0.5px', background: isActive ? 'rgba(61,255,209,0.07)' : 'rgba(255,255,255,0.05)', marginBottom: 10 }}/>

                        {/* Day pills */}
                        <div style={{ display: 'flex', gap: 4 }}>
                          {_DAY_ORDER.map(d => {
                            const on = activeDays.includes(d);
                            return (
                              <div key={d} style={{
                                flex: 1, height: 26, borderRadius: 7,
                                background: on ? 'rgba(61,255,209,0.09)' : 'rgba(255,255,255,0.03)',
                                border: on ? '0.5px solid rgba(61,255,209,0.22)' : '0.5px solid rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10.5, fontWeight: 700,
                                color: on ? 'var(--neon)' : 'rgba(255,255,255,0.16)',
                              }}>
                                {_DAY_LABELS[d]}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        )}
      </SubScreen>

      {editPortal}
    </>
  );
}

// ── SettingsScreen principal ──────────────────────────────────────────────────
function SettingsScreen({ open, onClose }) {
  const { profile, isPremium, email, daysLeft, planLabel, plan } = useSettingsData();
  const [view, setView]                   = React.useState('main');
  const [logoutOpen, setLogoutOpen]       = React.useState(false);
  const [twoFaEnabled, setTwoFaEnabled]   = React.useState(false);
  const [twoFaMethod,  setTwoFaMethod]    = React.useState(null);
  const [planCycle,    setPlanCycle]      = React.useState(plan || 'monthly');
  const [isPlanCancelled, setIsPlanCancelled] = React.useState(false);
  const toast = window.useToast ? window.useToast() : { show: () => {} };

  const computedIsPremium = isPremium && !isPlanCancelled;

  // Resetear estado al cerrar
  React.useEffect(() => {
    if (!open) { setView('main'); setLogoutOpen(false); setIsPlanCancelled(false); }
  }, [open]);

  if (!open) return null;

  const handleUpgrade = () => {
    setIsPlanCancelled(false);
    if (typeof window.__mtxOpenPremiumLock === 'function') {
      window.__mtxOpenPremiumLock('content');
    } else {
      toast.show({ message: '¡Bienvenido de nuevo a Premium!', duration: 2000 });
    }
  };

  // Sub-pantallas
  const W = { position:'absolute', inset:0, zIndex:100, background:'#080B0A' };
  const back = () => setView('main');
  if (view === 'cuenta')         return <div style={W}><CuentaSubScreen         profile={profile} email={email} onBack={back}/></div>;
  if (view === 'progresos')      return <div style={W}><ProgresosSubScreen       onBack={back}/></div>;
  if (view === 'mi-progreso')   return <div style={W}><ProgressReportGallery    onClose={back}/></div>;
  if (view === 'mi-plan')        return <div style={W}><MiPlanSubScreen          onBack={back} isPremium={computedIsPremium} planCycle={planCycle} daysLeft={daysLeft} onCycleChange={setPlanCycle} onOpenCancel={() => setView('cancel-plan')} onUpgrade={handleUpgrade}/></div>;
  if (view === 'cancel-plan')    return <div style={W}><CancelPlanSubScreen      onBack={() => setView('mi-plan')} onCancelled={() => { setIsPlanCancelled(true); setView('main'); }}/></div>;
  if (view === 'seguridad')      return <div style={W}><SeguridadSubScreen      onBack={back} twoFaEnabled={twoFaEnabled} twoFaMethod={twoFaMethod} onOpen2FASetup={() => setView('2fa-setup')} onDisable2FA={() => { setTwoFaEnabled(false); setTwoFaMethod(null); }}/></div>;
  if (view === '2fa-setup')      return <div style={W}><TwoFASetupSubScreen      onBack={back} onEnabled={(m) => { setTwoFaEnabled(true); setTwoFaMethod(m); back(); }}/></div>;
  if (view === 'notificaciones') return <div style={W}><NotificacionesSubScreen onBack={back}/></div>;
  if (view === 'privacidad')     return <div style={W}><PrivacidadSubScreen     onBack={back}/></div>;
  if (view === 'apariencia')     return <div style={W}><AparienciaSubScreen     onBack={back}/></div>;
  if (view === 'preferencias')   return <div style={W}><PreferenciasSubScreen   onBack={back}/></div>;
  if (view === 'rutinas')        return <div style={W}><RutinasSubScreen       onBack={back}/></div>;
  if (view === 'soporte')        return <div style={W}><SoporteSubScreen        onBack={back}/></div>;
  if (view === 'terminos')       return <div style={W}><TerminosSubScreen       onBack={back}/></div>;
  if (view === 'eliminar-cuenta') return <div style={W}><EliminarCuentaSubScreen profile={profile} isPremium={isPremium} onBack={back} onDeleted={onClose}/></div>;

  return (
    <>
      <style>{`
        @keyframes mtx-settings-in {
          from { transform: translateX(32px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: '#080B0A',
        display: 'flex', flexDirection: 'column',
        animation: 'mtx-settings-in .38s cubic-bezier(0.22,1,0.36,1) both',
      }}>

        {/* Header fijo */}
        <div style={{
          flexShrink: 0, paddingTop: 60,
          background: 'linear-gradient(180deg, rgba(5,7,7,0.98) 0%, rgba(8,11,10,0.95) 100%)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onClose} aria-label="Cerrar configuración" className="mtx-tap" style={{
              width: 36, height: 36, borderRadius: 999, flexShrink: 0,
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'var(--ink-1)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IcChevL size={15} stroke="currentColor" strokeWidth={1.9}/>
            </button>
            <h1 style={{
              flex: 1, textAlign: 'center', margin: 0, fontSize: 16, fontWeight: 600,
              color: 'var(--ink-1)', letterSpacing: '-0.02em', fontFamily: 'var(--ff-sans)',
            }}>Configuraciones</h1>
            <div style={{ width: 36, flexShrink: 0 }}/>
          </div>
        </div>

        {/* Cuerpo scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 56 }}>

          {/* Profile hero */}
          <div style={{ paddingTop: 22 }}>
            <ProfileHeroCard profile={profile} isPremium={computedIsPremium} onEdit={() => setView('cuenta')}/>
          </div>

          {/* Mi plan */}
          <SectionLabel label="Mi plan" topSpacing={26}/>
          <PlanCard isPremium={computedIsPremium} planLabel={planLabel} daysLeft={daysLeft} onUpgrade={handleUpgrade} onGestionar={() => setView('mi-plan')}/>

          {/* Tu cuenta */}
          <SectionLabel label="Tu cuenta" topSpacing={30}/>
          <CardList>
            <CategoryRow icon="👤" label="Cuenta"    subtitle="Perfil, nombre, email y más" onTap={() => setView('cuenta')}/>
            <CategoryRow icon="🔐" label="Seguridad" subtitle="Contraseña y acceso"         onTap={() => setView('seguridad')}/>
          </CardList>

          {/* En la app */}
          <SectionLabel label="En la app" topSpacing={28}/>
          <CardList>
            <CategoryRow icon="📊" label="Mi Progreso"        subtitle="Reportes semanales de tu avance"       onTap={() => setView('mi-progreso')}/>
            <CategoryRow icon="🏆" label="Mi aprendizaje"     subtitle="Todo el contenido que has completado"  onTap={() => setView('progresos')}/>
            <CategoryRow icon="⏱️" label="Rutinas y bloqueos" subtitle="Automatismos y enfoque profundo"       onTap={() => setView('rutinas')}/>
          </CardList>

          {/* Personalización */}
          <SectionLabel label="Personalización" topSpacing={28}/>
          <CardList>
            <CategoryRow icon="🔔" label="Notificaciones"  subtitle="Coach, recordatorios y comunidad"     onTap={() => setView('notificaciones')}/>
            <CategoryRow icon="🔒" label="Privacidad"      subtitle="Visibilidad de tu perfil"             onTap={() => setView('privacidad')}/>
            <CategoryRow icon="🌙" label="Apariencia"      subtitle="Tema, acento y tipografía"            onTap={() => setView('apariencia')}/>
            <CategoryRow icon="✨" label="Preferencias"    subtitle="Intereses y contenido"                onTap={() => setView('preferencias')}/>
          </CardList>

          {/* Información */}
          <SectionLabel label="Información" topSpacing={28}/>
          <CardList>
            <CategoryRow icon="💬" label="Soporte"         subtitle="Ayuda y contacto"                     onTap={() => setView('soporte')}/>
            <CategoryRow icon="📋" label="Términos y condiciones"                                          onTap={() => setView('terminos')}/>
          </CardList>

          {/* Eliminar cuenta — tarjeta roja */}
          <SectionLabel label="Zona peligrosa" topSpacing={28}/>
          <CardList>
            <CategoryRow icon="🗑️" label="Eliminar cuenta" danger onTap={() => setView('eliminar-cuenta')}/>
          </CardList>

          {/* Cerrar sesión — botón simple, no tarjeta roja */}
          <button
            onClick={() => setLogoutOpen(true)}
            className="mtx-tap"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              margin: '10px 16px 0', width: 'calc(100% - 32px)', height: 46,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              fontSize: 14.5, fontWeight: 500, letterSpacing: '-0.01em',
              fontFamily: 'var(--ff-sans)',
            }}
          >
            <IcLogOut size={15} stroke="currentColor" strokeWidth={1.7}/>
            Cerrar sesión
          </button>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 36, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.13)', letterSpacing: '0.04em', fontFamily: 'var(--ff-sans)' }}>
              Mentex · v1.0.0
            </div>
          </div>
        </div>
      </div>

      {/* Logout confirmation sheet — overlay dentro de SettingsScreen */}
      {logoutOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 110, display: 'flex', alignItems: 'flex-end' }}>
          <LogoutConfirmSheet
            profile={profile}
            onCancel={() => setLogoutOpen(false)}
            onConfirm={() => {
              setLogoutOpen(false);
              if (typeof window !== 'undefined' && window.__mtxAuth && typeof window.__mtxAuth.signOut === 'function') {
                window.__mtxAuth.signOut();
              }
              onClose();
            }}
          />
        </div>
      )}
    </>
  );
}
