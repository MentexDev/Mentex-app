// mtx-toast.jsx — Sistema de toasts neon con acción "Deshacer"
// Uso: const toast = useToast(); toast.show({ message, action, onAction, duration });

const ToastContext = React.createContext(null);

function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    // Fallback no-op si no hay provider
    return { show: () => {}, hide: () => {} };
  }
  return ctx;
}

function ToastProvider({ children }) {
  const [toast, setToast] = React.useState(null);
  const timerRef = React.useRef(null);

  const hide = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast((t) => t ? { ...t, exiting: true } : null);
    setTimeout(() => setToast(null), 280);
  }, []);

  const show = React.useCallback((opts) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = Math.random().toString(36).slice(2);
    setToast({ id, exiting: false, ...opts });
    const dur = opts.duration ?? 4000;
    if (dur > 0) {
      timerRef.current = setTimeout(() => {
        setToast((t) => t && t.id === id ? { ...t, exiting: true } : t);
        setTimeout(() => setToast((t) => t && t.id === id ? null : t), 280);
      }, dur);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      {toast && (
        <div style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 96,
          display: 'flex', justifyContent: 'center',
          padding: '0 20px',
          pointerEvents: 'none',
          zIndex: 200,
        }}>
          <div className="mtx-glass" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '10px 8px 10px 16px',
            borderRadius: 14,
            background: 'rgba(20,22,26,0.92)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            border: '0.5px solid rgba(61,255,209,0.22)',
            boxShadow: '0 0 0 1px rgba(61,255,209,0.10), 0 24px 60px -20px rgba(61,255,209,0.45), 0 8px 24px rgba(0,0,0,0.6)',
            color: 'var(--ink-1)',
            fontFamily: 'var(--ff-sans)',
            fontSize: 13, fontWeight: 500,
            pointerEvents: 'auto',
            animation: toast.exiting
              ? 'mtxToastOut .26s cubic-bezier(.4,0,1,1) forwards'
              : 'mtxToastIn .42s cubic-bezier(.34,1.56,.64,1) forwards',
            maxWidth: 340,
          }}>
            {/* Pulse dot */}
            <span style={{
              width: 6, height: 6, borderRadius: 999,
              background: 'var(--neon)',
              boxShadow: '0 0 8px var(--neon), 0 0 16px rgba(61,255,209,0.6)',
              flexShrink: 0,
              animation: 'mtxPulse 1.4s ease-in-out infinite',
            }}/>

            <span style={{ flex: 1, minWidth: 0, letterSpacing: '-0.01em' }}>
              {toast.message}
            </span>

            {toast.action && (
              <button
                className="mtx-tap"
                onClick={() => {
                  if (toast.onAction) toast.onAction();
                  hide();
                }}
                style={{
                  appearance: 'none', border: 0, background: 'transparent',
                  color: 'var(--neon)',
                  fontFamily: 'var(--ff-sans)', fontSize: 12.5, fontWeight: 600,
                  letterSpacing: '0.02em',
                  padding: '6px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textShadow: '0 0 12px rgba(61,255,209,0.55)',
                  flexShrink: 0,
                }}
              >
                {toast.action}
              </button>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes mtxToastIn {
          0%   { opacity: 0; transform: translateY(20px) scale(0.92); }
          60%  { opacity: 1; transform: translateY(-3px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes mtxToastOut {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(8px) scale(0.96); }
        }
        @keyframes mtxPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.4); opacity: 0.7; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

Object.assign(window, { ToastProvider, useToast, ToastContext });
