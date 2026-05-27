// screens/coach-extras.jsx — Fase A.5 · RFC-001 Addendum A §A4-A8
// ─────────────────────────────────────────────────────────────────────────────
// Bundle de extras del Coach que viven afuera del bubble y del timeline:
//   A4. CoachOnboardingTutorial — primera vez que el user abre IA tab
//   A5. CoachCostMeter           — chip "42/50 hoy" en header IA
//   A6. CoachShareSheet          — compartir conversación (PNG/markdown/link)
//   A7. coach-extras helpers para search en historial
//   A8. CoachMessageFeedback     — botones 👍/👎 inline en mensajes
//
// Cada componente se exporta a window con prefix Coach* para que ia-flow lo
// consuma sin acoplarse a este archivo (carga independiente, fallback null).
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined') return;
  if (window.__mtxCoachExtrasLoaded) return;
  window.__mtxCoachExtrasLoaded = true;

  // ═══════════════════════════════════════════════════════════════════════════
  // A4. CoachOnboardingTutorial — tutorial primera vez
  // ═══════════════════════════════════════════════════════════════════════════
  // Storage key: localStorage 'mtx:coach:tutorial-seen' = '1' después de skip/done.
  // Se monta como overlay sobre el IA tab si !seen y user llega a IA tab.
  // Estructura: 4 slides cada uno con killer feature + demo visual.

  var TUTORIAL_SLIDES = [
    {
      id: 'memory',
      title: 'Te conozco y te recuerdo',
      body: 'No tienes que explicarme tu rutina cada vez. Recuerdo lo que es importante para ti. Y siempre podés ver, editar o borrar lo que sé.',
      accent: '#9b8aff',
      icon: '🧠',
      demoLabel: 'Cuando charlas conmigo, esto aparece a veces',
      demoArtifact: {
        kind: 'memory_recall_card',
        title: 'Ejemplo: lo que sé de ti',
        facts: [
          { text: 'Duermes mal cuando llueve', source: 'Mencionado hace 3 semanas' },
          { text: 'Te gusta meditar en las mañanas', source: 'Patrón confirmado 14 días' },
        ],
      },
    },
    {
      id: 'plan',
      title: 'Planifico tu día por ti',
      body: 'Decime qué tenés en la semana y te armo un plan que respete tu ritmo, no que te exija más.',
      accent: '#3dffd1',
      icon: '📓',
      demoLabel: 'Esto es lo que recibes cuando pides un plan',
      demoArtifact: {
        kind: 'plan_card',
        title: 'Tu próxima semana',
        icon: '📓',
        days: [
          { label: 'Lun', items: [{ icon: '◐', text: 'Foco profundo 7am' }] },
          { label: 'Mar', items: [{ icon: '◐', text: 'Meditación 10 min' }] },
          { label: 'Mié', items: [{ icon: '◐', text: 'Descanso largo' }] },
        ],
        notes: ['Respeto tu ritmo histórico'],
      },
    },
    {
      id: 'browse',
      title: 'Hago cosas por ti en internet',
      body: 'Reservar tu yoga, buscar un libro, llenar un formulario. No te quedás esperando — yo lo hago. Siempre confirmo antes.',
      accent: '#ffc850',
      icon: '🌐',
      demoLabel: 'Así se ve cuando navego por ti',
      demoArtifact: {
        kind: 'browse_progress_card',
        site: 'ejemplo-yoga.co',
        intent: 'Reservar Yoga Flow del sábado',
        steps: [
          { label: 'Abrí el sitio', status: 'done', detail: 'TLS verificado' },
          { label: 'Encontré la clase', status: 'done', detail: 'Yoga Flow 9am · María' },
          { label: 'Pago confirmado', status: 'done', detail: 'Tarjeta ***4242' },
        ],
        result: { title: '✓ Reservada', confirmation: '#YF-DEMO', extras: ['Te recordaré salir a las 8:35'] },
      },
    },
    {
      id: 'universe',
      title: 'Tu universo de contenido, a un mensaje',
      body: 'Audiolibros, meditaciones, charlas, podcasts, sonidos binaurales — todo curado para tu momento. Pedime y te lo traigo.',
      accent: '#5dd3ff',
      icon: '🌌',
      demoLabel: 'Así te paso recomendaciones',
      demoArtifact: {
        kind: 'recommendation_card',
        item: {
          title: 'Hábitos Atómicos',
          author: 'James Clear',
          kind: 'audiobook',
          durationMin: 272,
          accent: '#5dd3ff',
        },
        reason: 'Lo elegí porque mencionaste que querés ordenar tu rutina.',
        primaryAction: { label: 'Reproducir', value: 'play' },
      },
    },
  ];

  function CoachOnboardingTutorial(props) {
    var onClose = props.onClose;

    var slideState = React.useState(0);
    var slideIdx = slideState[0];
    var setSlideIdx = slideState[1];

    var slide = TUTORIAL_SLIDES[slideIdx];
    var isLast = slideIdx === TUTORIAL_SLIDES.length - 1;
    var isFirst = slideIdx === 0;

    React.useEffect(function() {
      function onKey(e) {
        if (e.isComposing || e.keyCode === 229) return;
        var tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
        if (e.key === 'Escape') {
          handleSkip();
        } else if (e.key === 'ArrowRight') {
          if (isLast) handleDone();
          else setSlideIdx(slideIdx + 1);
        } else if (e.key === 'ArrowLeft' && !isFirst) {
          setSlideIdx(slideIdx - 1);
        }
      }
      window.addEventListener('keydown', onKey);
      return function() { window.removeEventListener('keydown', onKey); };
    }, [slideIdx]);

    function persist() {
      try {
        if (window.localStorage) window.localStorage.setItem('mtx:coach:tutorial-seen', '1');
      } catch (e) {}
    }

    function handleSkip() { persist(); if (onClose) onClose(); }
    function handleDone() { persist(); if (onClose) onClose(); }
    function handleNext() {
      if (isLast) handleDone();
      else setSlideIdx(slideIdx + 1);
    }

    return (
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(10,13,12,0.97)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        display: 'flex', flexDirection: 'column',
        zIndex: 200,
        animation: 'mtx-fade-up .3s ease both',
      }}>
        {/* Top: skip + progress dots */}
        <div style={{
          paddingTop: 60,
          padding: '60px 18px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 5, flex: 1 }}>
            {TUTORIAL_SLIDES.map(function(_, i) {
              return (
                <div key={i} style={{
                  flex: 1, height: 3, borderRadius: 999,
                  background: i <= slideIdx ? slide.accent : 'rgba(255,255,255,0.10)',
                  transition: 'background .3s',
                }}/>
              );
            })}
          </div>
          <button type="button"
            onClick={handleSkip}
            className="mtx-tap"
            aria-label="Saltar tutorial"
            style={{
              appearance: 'none', cursor: 'pointer',
              padding: '6px 12px', borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.10)',
              color: 'var(--ink-3)',
              fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
              flexShrink: 0,
            }}>Saltar</button>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, minHeight: 0,
          padding: '0 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          overflowY: 'auto',
        }}>
          <div style={{
            fontSize: 44, lineHeight: 1, marginBottom: 16,
            animation: 'mtx-fade-up .4s ease both',
          }} role="img" aria-hidden="true">{slide.icon}</div>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: slide.accent,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontFamily: 'var(--ff-sans)',
            marginBottom: 8,
          }}>{slideIdx + 1} de {TUTORIAL_SLIDES.length} · Coach Mentex</div>
          <div style={{
            fontSize: 26, fontWeight: 700,
            color: 'var(--ink-1)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            fontFamily: 'var(--ff-sans)',
            marginBottom: 12,
            animation: 'mtx-fade-up .5s ease both',
          }}>{slide.title}</div>
          <div style={{
            fontSize: 14.5, lineHeight: 1.55,
            color: 'var(--ink-2)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            marginBottom: 24,
            animation: 'mtx-fade-up .6s ease both',
          }}>{slide.body}</div>

          {/* Demo artifact */}
          {slide.demoArtifact && window.IAArtifact && (
            <div style={{
              marginTop: 8,
              animation: 'mtx-fade-up .7s ease both',
            }}>
              <div style={{
                fontSize: 10.5, fontWeight: 700,
                color: 'var(--ink-3)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontFamily: 'var(--ff-sans)',
                marginBottom: 8,
                paddingLeft: 2,
              }}>{slide.demoLabel}</div>
              <window.IAArtifact artifact={slide.demoArtifact}/>
            </div>
          )}
        </div>

        {/* Bottom: nav buttons */}
        <div style={{
          padding: '18px 24px 32px',
          display: 'flex', gap: 10,
        }}>
          {!isFirst && (
            <button type="button"
              onClick={function() { setSlideIdx(slideIdx - 1); }}
              className="mtx-tap"
              aria-label="Anterior"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '12px 18px', borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                color: 'var(--ink-2)',
                fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                flexShrink: 0,
              }}>← Atrás</button>
          )}
          <button type="button"
            onClick={handleNext}
            className="mtx-tap"
            aria-label={isLast ? 'Empezar' : 'Siguiente'}
            style={{
              appearance: 'none', cursor: 'pointer',
              flex: 1, padding: '12px 18px', borderRadius: 999,
              background: 'linear-gradient(135deg, ' + slide.accent + ', ' + slide.accent + 'cc)',
              border: 0,
              color: '#0a1410',
              fontSize: 13, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              boxShadow: '0 4px 14px -2px ' + slide.accent + '50',
            }}>{isLast ? 'Empezar' : 'Siguiente →'}</button>
        </div>
      </div>
    );
  }

  function shouldShowTutorial() {
    try {
      return window.localStorage && window.localStorage.getItem('mtx:coach:tutorial-seen') !== '1';
    } catch (e) {
      return true;
    }
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // A5. CoachCostMeter — chip "X / Y hoy" en header
  // ═══════════════════════════════════════════════════════════════════════════
  // Lectura: localStorage 'mtx:coach:usage' = { date: 'YYYY-MM-DD', count: N, plan }.
  // Reset diario automático al detectar fecha cambiada.
  // Cuando count >= 80% del límite del plan, accent cambia a amber.

  var COACH_DAILY_LIMITS = { free: 50, premium: 1000, pro_plus: 10000 };

  function _todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function _readUsage() {
    try {
      var raw = window.localStorage.getItem('mtx:coach:usage');
      if (!raw) return null;
      var u = JSON.parse(raw);
      if (u.date !== _todayStr()) return null;  // reset diario
      return u;
    } catch (e) { return null; }
  }

  function _writeUsage(u) {
    try { window.localStorage.setItem('mtx:coach:usage', JSON.stringify(u)); } catch (e) {}
  }

  function CoachCostMeter() {
    var usageState = React.useState(function() {
      return _readUsage() || { date: _todayStr(), count: 0, plan: 'free' };
    });
    var usage = usageState[0];
    var setUsage = usageState[1];

    React.useEffect(function() {
      function onChat() {
        setUsage(function(prev) {
          var next = { date: _todayStr(), count: (prev.date === _todayStr() ? prev.count : 0) + 1, plan: prev.plan };
          _writeUsage(next);
          return next;
        });
      }
      window.addEventListener('mtx:ia-chat-changed', onChat);
      return function() { window.removeEventListener('mtx:ia-chat-changed', onChat); };
    }, []);

    var plan = (typeof window !== 'undefined' && window.__mtxIsPremium && window.__mtxIsPremium()) ? 'premium' : 'free';
    var limit = COACH_DAILY_LIMITS[plan] || 50;
    var ratio = Math.min(1, usage.count / limit);
    var nearLimit = ratio >= 0.8;
    var color = nearLimit ? '#ffc850' : 'var(--ink-3)';

    return (
      <div
        role="status"
        aria-label={'Has usado ' + usage.count + ' de ' + limit + ' mensajes hoy'}
        title={'Plan ' + plan + ' · resetea a medianoche'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 9px', borderRadius: 999,
          background: nearLimit ? 'rgba(255,200,80,0.08)' : 'rgba(255,255,255,0.03)',
          border: '0.5px solid ' + (nearLimit ? 'rgba(255,200,80,0.25)' : 'rgba(255,255,255,0.06)'),
          fontSize: 10.5, fontWeight: 600,
          color: color,
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '0.01em',
          fontVariantNumeric: 'tabular-nums',
          transition: 'background .2s, border-color .2s, color .2s',
        }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>{usage.count}/{limit}</span>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // A6. CoachShareSheet — sheet para compartir conversación
  // ═══════════════════════════════════════════════════════════════════════════
  function CoachShareSheet(props) {
    var open = props.open;
    var conversation = props.conversation;
    var onClose = props.onClose;

    var statusState = React.useState(null);  // null | 'copying' | 'copied'
    var status = statusState[0];
    var setStatus = statusState[1];

    var backdropDownRef = React.useRef(false);

    React.useEffect(function() {
      if (!open) { setStatus(null); return; }
      function onKey(e) {
        if (e.isComposing || e.keyCode === 229) return;
        if (e.key === 'Escape' && onClose) onClose();
      }
      window.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
      return function() {
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = '';
      };
    }, [open]);

    if (!open || !conversation) return null;

    function toMarkdown() {
      var lines = ['# ' + (conversation.title || 'Conversación con Mentex'), ''];
      (conversation.messages || []).forEach(function(m) {
        var who = m.role === 'user' ? '**Yo**' : '**Coach**';
        lines.push(who + ':');
        lines.push((m.content || '').trim() || '_(sin contenido)_');
        lines.push('');
      });
      lines.push('---');
      lines.push('*Compartido desde Mentex · mentex.app*');
      return lines.join('\n');
    }

    function copyMarkdown() {
      var md = toMarkdown();
      setStatus('copying');
      var fallback = function() {
        // Fallback con textarea hidden + execCommand
        try {
          var ta = document.createElement('textarea');
          ta.value = md;
          ta.style.position = 'fixed'; ta.style.left = '-10000px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          setStatus('copied');
          setTimeout(function() { setStatus(null); }, 1800);
        } catch (e) {
          setStatus(null);
        }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(md).then(function() {
          setStatus('copied');
          setTimeout(function() { setStatus(null); }, 1800);
        }).catch(fallback);
      } else {
        fallback();
      }
    }

    function copyLink() {
      var shortId = (conversation.id || 'demo').slice(-8);
      var url = 'https://mentex.app/c/' + shortId;
      setStatus('copying');
      var fallback = function() {
        try {
          var ta = document.createElement('textarea');
          ta.value = url;
          ta.style.position = 'fixed'; ta.style.left = '-10000px';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          setStatus('copied');
          setTimeout(function() { setStatus(null); }, 1800);
        } catch (e) { setStatus(null); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() {
          setStatus('copied');
          setTimeout(function() { setStatus(null); }, 1800);
        }).catch(fallback);
      } else {
        fallback();
      }
    }

    function downloadMarkdown() {
      var md = toMarkdown();
      var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = ('mentex-' + (conversation.title || 'conversacion').replace(/\W+/g, '-').toLowerCase().slice(0, 40) + '.md');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    }

    var portalRoot = document.getElementById('mtx-overlay-root') || document.body;
    return ReactDOM.createPortal(
      <div
        onMouseDown={function(e) { backdropDownRef.current = e.target === e.currentTarget; }}
        onClick={function(e) {
          if (e.target === e.currentTarget && backdropDownRef.current && onClose) onClose();
          backdropDownRef.current = false;
        }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 220,
          animation: 'mtx-fade-up .25s ease both',
        }}>
        <div role="dialog" aria-modal="true" aria-label="Compartir conversación"
          style={{
            width: '100%', maxWidth: 440,
            background: 'linear-gradient(180deg, rgba(20,24,22,0.98), rgba(14,17,16,0.98))',
            borderTop: '0.5px solid rgba(255,255,255,0.10)',
            borderTopLeftRadius: 22, borderTopRightRadius: 22,
            padding: '8px 0 28px',
            animation: 'mtx-slide-up .3s ease both',
          }}>
          {/* Drag handle */}
          <div style={{
            width: 40, height: 4, borderRadius: 999,
            background: 'rgba(255,255,255,0.15)',
            margin: '6px auto 14px',
          }}/>
          <div style={{
            padding: '0 22px 18px',
            fontSize: 17, fontWeight: 700,
            color: 'var(--ink-1)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.01em',
          }}>Compartir esta conversación</div>
          <div style={{
            padding: '0 16px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <ShareOption icon="🔗" label="Copiar link" sub="mentex.app/c/{id}" onClick={copyLink} active={status === 'copied'}/>
            <ShareOption icon="📋" label="Copiar como Markdown" sub="Pegá en Notion, GitHub, etc." onClick={copyMarkdown} active={status === 'copied'}/>
            <ShareOption icon="⬇️" label="Descargar archivo .md" sub="Guardar en tu dispositivo" onClick={downloadMarkdown}/>
          </div>
          {status === 'copied' && (
            <div style={{
              margin: '10px 22px 0', padding: '8px 12px',
              borderRadius: 10,
              background: 'rgba(61,255,209,0.08)',
              border: '0.5px solid rgba(61,255,209,0.25)',
              fontSize: 11.5, fontWeight: 600,
              color: 'var(--neon)',
              textAlign: 'center',
              fontFamily: 'var(--ff-sans)',
            }}>✓ Copiado al portapapeles</div>
          )}
        </div>
      </div>,
      portalRoot
    );
  }

  function ShareOption(props) {
    return (
      <button type="button"
        onClick={props.onClick}
        className="mtx-tap"
        aria-label={props.label}
        style={{
          appearance: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px',
          borderRadius: 12,
          background: props.active ? 'rgba(61,255,209,0.06)' : 'rgba(255,255,255,0.025)',
          border: '0.5px solid ' + (props.active ? 'rgba(61,255,209,0.20)' : 'rgba(255,255,255,0.06)'),
          color: 'inherit',
          textAlign: 'left',
          transition: 'background .15s, border-color .15s',
        }}>
        <span style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true">{props.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: 'var(--ink-1)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
          }}>{props.label}</div>
          <div style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            marginTop: 1,
          }}>{props.sub}</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.35)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }} aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // A7. Search helper — filter conversations by query
  // ═══════════════════════════════════════════════════════════════════════════
  function searchConversations(conversations, query) {
    if (!query || typeof query !== 'string') return conversations;
    var q = query.toLowerCase().trim();
    if (!q) return conversations;
    return (conversations || []).filter(function(c) {
      if (!c) return false;
      if ((c.title || '').toLowerCase().indexOf(q) >= 0) return true;
      var msgs = c.messages || [];
      for (var i = 0; i < msgs.length; i++) {
        if ((msgs[i].content || '').toLowerCase().indexOf(q) >= 0) return true;
      }
      return false;
    });
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // A8. CoachMessageFeedback — 👍/👎 inline en cada mensaje del coach
  // ═══════════════════════════════════════════════════════════════════════════
  function CoachMessageFeedback(props) {
    var msg = props.msg;
    var convId = props.convId;
    if (!msg || msg.role !== 'assistant') return null;

    var current = msg.feedback || null;  // 'positive' | 'negative' | null

    function setFeedback(value) {
      var next = current === value ? null : value;  // toggle
      if (window.__mtxIAChat) {
        window.__mtxIAChat.updateMessage(convId, msg.id, { feedback: next });
      }
      // Toast solo cuando agrega feedback (no al quitar)
      if (next && window.__mtxToast && window.__mtxToast.show) {
        window.__mtxToast.show(next === 'positive' ? 'Gracias por el feedback' : 'Anotado — voy a mejorar', { kind: 'info', durationMs: 1500 });
      }
    }

    var iconSize = 11;

    return (
      <div style={{
        display: 'flex', gap: 4,
        marginTop: 6,
        opacity: 0.55,
        transition: 'opacity .15s',
      }}
        onMouseEnter={function(e) { e.currentTarget.style.opacity = 1; }}
        onMouseLeave={function(e) { e.currentTarget.style.opacity = current ? 1 : 0.55; }}
      >
        <button type="button"
          onClick={function() { setFeedback('positive'); }}
          className="mtx-tap"
          aria-label="Me ayudó"
          aria-pressed={current === 'positive'}
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '4px 6px', borderRadius: 6,
            background: current === 'positive' ? 'rgba(61,255,209,0.10)' : 'transparent',
            border: 0,
            color: current === 'positive' ? 'var(--neon)' : 'rgba(255,255,255,0.45)',
            display: 'inline-flex', alignItems: 'center',
            transition: 'background .15s, color .15s',
          }}>
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={current === 'positive' ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
          </svg>
        </button>
        <button type="button"
          onClick={function() { setFeedback('negative'); }}
          className="mtx-tap"
          aria-label="No me ayudó"
          aria-pressed={current === 'negative'}
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '4px 6px', borderRadius: 6,
            background: current === 'negative' ? 'rgba(255,139,139,0.10)' : 'transparent',
            border: 0,
            color: current === 'negative' ? '#ff8b8b' : 'rgba(255,255,255,0.45)',
            display: 'inline-flex', alignItems: 'center',
            transition: 'background .15s, color .15s',
          }}>
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={current === 'negative' ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
          </svg>
        </button>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // Inject CSS keyframes (idempotente)
  // ═══════════════════════════════════════════════════════════════════════════
  if (document && !document.getElementById('mtx-coach-extras-styles')) {
    var style = document.createElement('style');
    style.id = 'mtx-coach-extras-styles';
    style.textContent = [
      '@keyframes mtx-slide-up {',
      '  from { transform: translateY(100%); }',
      '  to { transform: translateY(0); }',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORTS
  // ═══════════════════════════════════════════════════════════════════════════
  window.CoachOnboardingTutorial = CoachOnboardingTutorial;
  window.CoachOnboardingTutorial.shouldShow = shouldShowTutorial;
  window.CoachCostMeter = CoachCostMeter;
  window.CoachShareSheet = CoachShareSheet;
  window.CoachMessageFeedback = CoachMessageFeedback;
  window.__mtxCoachExtras = {
    shouldShowTutorial: shouldShowTutorial,
    searchConversations: searchConversations,
    _readUsage: _readUsage,
    _COACH_DAILY_LIMITS: COACH_DAILY_LIMITS,
  };

})();
