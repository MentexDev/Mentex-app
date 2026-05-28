// screens/ia-artifacts.jsx — Fase 1.2: Chat artifact rendering
// ─────────────────────────────────────────────────────────────────────────────
// 5 componentes de artifact que el coach puede adjuntar a sus mensajes.
// Cada uno se renderiza DEBAJO del bubble de texto del assistant (mismo nivel
// de indentación que el bubble — full ancho de la columna a la derecha del
// avatar). Esto les da espacio sin competir con el flujo de texto.
//
// Shape:
//   msg.artifacts = [{ kind: 'image'|'voice'|'content'|'calendar'|'reminder', ...props }]
//
// El router IAArtifact recibe el objeto y delega al componente específico.
// Cuando Mastra entre en Fase 1.5, el agente devolverá tool calls que el
// gateway traducirá a artifacts del mismo shape — la UI no cambia.
//
// Diseño visual: consistente con Obsidian/Neon. Borders 0.5px white/8, radii
// 16px (artifact card) / 12px (sub-cards), accent neon o per-type accent.
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.IAArtifact) return;

  // ── Mini helpers ──────────────────────────────────────────────────────────
  function _fmtDuration(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. IAArtifactImage — imagen generada por el coach
  // ═══════════════════════════════════════════════════════════════════════════
  // Acepta:
  //   • src: URL de imagen real
  //   • gradient: CSS linear-gradient para placeholder generative-style
  //   • alt, caption opcionales
  function IAArtifactImage(props) {
    var art = props.artifact || {};
    var src = art.src;
    var gradient = art.gradient || 'linear-gradient(135deg, rgba(61,255,209,0.30), rgba(155,138,255,0.20), rgba(255,200,80,0.18))';
    var caption = art.caption;
    var alt = art.alt || caption || 'Imagen generada';

    return (
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {/* Image / gradient placeholder */}
        <div style={{
          width: '100%',
          aspectRatio: '4 / 3',
          background: src ? '#000' : gradient,
          position: 'relative',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
          backgroundImage: src ? 'url(' + src + ')' : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} role="img" aria-label={alt}>
          {/* Sparkle decorativo en placeholders generativos */}
          {!src && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              padding: '4px 9px', borderRadius: 999,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(8px)',
              fontSize: 9, color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.08em', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ color: 'var(--neon)' }}>✦</span>
              GENERADA
            </div>
          )}
        </div>
        {/* Caption opcional */}
        {caption && (
          <div style={{
            padding: '10px 14px',
            fontSize: 12, color: 'var(--ink-2)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            lineHeight: 1.4,
            borderTop: '0.5px solid rgba(255,255,255,0.06)',
          }}>{caption}</div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 2. IAArtifactVoice — voice note del coach (audio inline)
  // ═══════════════════════════════════════════════════════════════════════════
  // Mock player: tap play → simula playback con progress bar animada. Si más
  // adelante hay src real (audio file), el componente lo reproduce con <audio>.
  // Waveform es decorativo (no atado a datos reales del audio).
  function IAArtifactVoice(props) {
    var art = props.artifact || {};
    var durationSec = art.durationSec || 24;
    var transcript = art.transcript;

    var playingState = React.useState(false);
    var playing = playingState[0]; var setPlaying = playingState[1];
    var progressState = React.useState(0);
    var progress = progressState[0]; var setProgress = progressState[1];
    var showTranscriptState = React.useState(false);
    var showTranscript = showTranscriptState[0]; var setShowTranscript = showTranscriptState[1];

    // Mock playback: cuando playing=true, avanza progress de 0 a 100 en durationSec
    React.useEffect(function() {
      if (!playing) return;
      var startedAt = Date.now() - (progress / 100) * durationSec * 1000;
      var raf;
      var tick = function() {
        var elapsed = (Date.now() - startedAt) / 1000;
        var pct = Math.min(100, (elapsed / durationSec) * 100);
        setProgress(pct);
        if (pct < 100) {
          raf = requestAnimationFrame(tick);
        } else {
          setPlaying(false);
          // Hold en 100% un momento, luego reset
          setTimeout(function() { setProgress(0); }, 500);
        }
      };
      raf = requestAnimationFrame(tick);
      return function() { if (raf) cancelAnimationFrame(raf); };
    }, [playing]);

    // Waveform mock — 28 barras con alturas pseudo-random determinísticas
    var BARS = 28;
    var bars = React.useMemo(function() {
      var arr = [];
      for (var i = 0; i < BARS; i++) {
        // Función seno + ruido determinístico para sentirse natural
        var h = 0.35 + 0.55 * Math.abs(Math.sin(i * 0.8) + Math.cos(i * 0.3) * 0.4);
        arr.push(Math.max(0.18, Math.min(1, h)));
      }
      return arr;
    }, []);
    var progressedBars = Math.floor((progress / 100) * BARS);

    var togglePlay = function() {
      if (progress >= 100) setProgress(0);
      setPlaying(function(p) { return !p; });
    };

    return (
      <div style={{
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(61,255,209,0.05), rgba(155,138,255,0.03))',
        border: '0.5px solid rgba(61,255,209,0.16)',
        animation: 'mtx-fade-up .35s ease both',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: 14,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {/* Play button */}
          <button
            onClick={togglePlay}
            onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePlay(); } }}
            aria-label={playing ? 'Pausar audio' : 'Reproducir audio'}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              width: 38, height: 38, borderRadius: 999,
              border: 0, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
              color: '#0a1410',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px -4px rgba(61,255,209,0.45)',
            }}>
            {playing
              ? (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <rect x="2" y="1.5" width="3" height="9" rx="1" fill="currentColor"/>
                  <rect x="7" y="1.5" width="3" height="9" rx="1" fill="currentColor"/>
                </svg>
              )
              : (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 1.5 L10 6 L3 10.5 Z" fill="currentColor"/>
                </svg>
              )}
          </button>

          {/* Waveform */}
          <div style={{
            flex: 1, height: 28,
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            {bars.map(function(h, i) {
              var active = i < progressedBars;
              return (
                <div key={i} style={{
                  flex: 1,
                  height: (h * 100) + '%',
                  minHeight: 3,
                  borderRadius: 2,
                  background: active ? 'var(--neon)' : 'rgba(255,255,255,0.18)',
                  transition: 'background .15s',
                  boxShadow: active ? '0 0 4px rgba(61,255,209,0.5)' : 'none',
                }}/>
              );
            })}
          </div>

          {/* Duration */}
          <div style={{
            fontSize: 11.5, fontWeight: 600,
            color: 'var(--ink-2)',
            fontFamily: 'var(--ff-sans)',
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
            minWidth: 32, textAlign: 'right',
          }}>{_fmtDuration(durationSec)}</div>
        </div>

        {/* Transcript expandible */}
        {transcript && (
          <div>
            <button
              onClick={function() { setShowTranscript(function(v) { return !v; }); }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                width: '100%', padding: '8px 14px',
                background: 'rgba(255,255,255,0.02)',
                border: 0,
                borderTop: '0.5px solid rgba(255,255,255,0.06)',
                color: 'var(--ink-3)',
                fontSize: 11, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
              {showTranscript ? 'Ocultar transcripción' : 'Ver transcripción'}
            </button>
            {showTranscript && (
              <div style={{
                padding: '10px 14px 14px',
                fontSize: 12.5, color: 'var(--ink-2)',
                lineHeight: 1.55,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                fontStyle: 'italic',
                background: 'rgba(0,0,0,0.15)',
              }}>"{transcript}"</div>
            )}
          </div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 3. IAArtifactContent — card de contenido de Explorar
  // ═══════════════════════════════════════════════════════════════════════════
  // Hidrata el item desde window.EXPLORE_CONTENT por id. Tap → dispara
  // mtx:open-item-from-community (mismo flujo que comunidad/perfil) que
  // termina en ContentDetailScreen full-screen (Fase explore-flow).
  function IAArtifactContent(props) {
    var art = props.artifact || {};
    var itemId = art.itemId;
    var ec = (typeof window !== 'undefined' && window.EXPLORE_CONTENT) || [];
    var item = ec.find(function(c) { return c.id === itemId; });

    if (!item) return null;

    var accent = item.accent || 'var(--neon)';
    var typeLabel = (item.type || '').toUpperCase();

    var handleOpen = function() {
      window.dispatchEvent(new CustomEvent('mtx:open-item-from-community', {
        detail: { itemId: item.id },
      }));
    };

    return (
      <button
        onClick={handleOpen}
        onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen(); } }}
        aria-label={'Abrir ' + item.title}
        className="mtx-tap"
        style={{
          appearance: 'none', cursor: 'pointer', textAlign: 'left',
          width: '100%',
          padding: 0,
          borderRadius: 16, overflow: 'hidden',
          border: '0.5px solid ' + (item.accent || 'rgba(255,255,255,0.08)') + '44',
          background: 'rgba(255,255,255,0.02)',
          display: 'flex', alignItems: 'stretch',
          animation: 'mtx-fade-up .35s ease both',
          transition: 'transform .15s, border-color .2s',
        }}>
        {/* Cover */}
        <div style={{
          width: 88, flexShrink: 0,
          position: 'relative',
          background: item.bg || 'linear-gradient(135deg, rgba(61,255,209,0.18), rgba(155,138,255,0.10))',
          backgroundImage: item.cover ? 'url(' + item.cover + ')' : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>
          {/* Type badge */}
          <div style={{
            position: 'absolute', top: 6, left: 6,
            padding: '2px 6px', borderRadius: 999,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            fontSize: 8, fontWeight: 700,
            color: accent,
            letterSpacing: '0.10em',
            fontFamily: 'var(--ff-sans)',
          }}>{typeLabel}</div>
        </div>

        {/* Info */}
        <div style={{
          flex: 1, minWidth: 0,
          padding: '12px 14px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          gap: 6,
        }}>
          <div>
            <div style={{
              fontSize: 13.5, fontWeight: 700,
              color: 'var(--ink-1)',
              letterSpacing: '-0.012em',
              lineHeight: 1.25,
              fontFamily: 'var(--ff-display, var(--ff-sans))',
              marginBottom: 3,
              display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>{item.title}</div>
            <div style={{
              fontSize: 11, color: 'var(--ink-3)',
              letterSpacing: '-0.005em',
              fontFamily: 'var(--ff-sans)',
            }}>{item.author}</div>
          </div>
          {/* Stats row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 10, color: 'var(--ink-4)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.005em',
          }}>
            <span>{item.dur}</span>
            {item.rating && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>★ {item.rating}</span>
              </>
            )}
            {item.plays && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{item.plays}</span>
              </>
            )}
          </div>
        </div>

        {/* Play button */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 14px',
          flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 999,
            background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
            color: '#0a1410',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px -4px rgba(61,255,209,0.45)',
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 1.5 L10 6 L3 10.5 Z" fill="currentColor"/>
            </svg>
          </div>
        </div>
      </button>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 4. IAArtifactCalendar — bloque de calendario propuesto por el coach
  // ═══════════════════════════════════════════════════════════════════════════
  // Lista compacta de bloques con time+title+icon. CTA "Aceptar" agrega todos
  // los bloques a __mtxIAAgenda. Single-shot: una vez aceptado, el botón
  // cambia a "Agendado ✓" y deshabilita.
  var _BLOCK_TYPE_COLOR = {
    focus:    '#3dffd1',
    learning: '#9b8aff',
    health:   '#ff8b8b',
    break:    '#ffc850',
    personal: '#5dd3ff',
    default:  '#3dffd1',
  };

  function IAArtifactCalendar(props) {
    var art = props.artifact || {};
    var date = art.date || 'Hoy';
    var blocks = Array.isArray(art.blocks) ? art.blocks : [];

    var acceptedState = React.useState(false);
    var accepted = acceptedState[0]; var setAccepted = acceptedState[1];

    var handleAccept = function() {
      if (accepted) return;
      // Agregar bloques al store de agenda (si existe)
      if (window.__mtxIAAgenda && window.__mtxIAAgenda.addReminder) {
        blocks.forEach(function(b) {
          window.__mtxIAAgenda.addReminder({
            label: b.title,
            time: b.time,
            recurrence: 'once',
          });
        });
      }
      // Toast confirmación
      if (window.__mtxToast && window.__mtxToast.show) {
        window.__mtxToast.show({
          message: '✦ Agendé ' + blocks.length + ' bloque' + (blocks.length === 1 ? '' : 's'),
          duration: 2000,
        });
      }
      setAccepted(true);
    };

    return (
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        background: 'rgba(255,255,255,0.02)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {/* Header */}
        <div style={{
          padding: '11px 14px 10px',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div className="mtx-eyebrow" style={{
              fontSize: 9, color: 'var(--neon)',
              letterSpacing: '0.12em',
              marginBottom: 2,
            }}>PROPUESTA · {date.toUpperCase()}</div>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: 'var(--ink-1)',
              letterSpacing: '-0.012em',
              fontFamily: 'var(--ff-display, var(--ff-sans))',
            }}>{blocks.length} bloque{blocks.length === 1 ? '' : 's'} programado{blocks.length === 1 ? '' : 's'}</div>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: 12,
            background: 'rgba(61,255,209,0.08)',
            border: '0.5px solid rgba(61,255,209,0.18)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--neon)', fontSize: 14,
          }}>📅</div>
        </div>

        {/* Blocks list */}
        <div style={{ padding: '4px 8px' }}>
          {blocks.map(function(b, i) {
            var color = _BLOCK_TYPE_COLOR[b.type] || _BLOCK_TYPE_COLOR.default;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 8px',
                borderBottom: i < blocks.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                {/* Time */}
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--ff-sans)',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 42, flexShrink: 0,
                }}>{b.time}</div>
                {/* Color bar */}
                <div style={{
                  width: 3, alignSelf: 'stretch',
                  borderRadius: 2,
                  background: color,
                  flexShrink: 0,
                }}/>
                {/* Title + dur */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, fontWeight: 500,
                    color: 'var(--ink-1)',
                    letterSpacing: '-0.005em',
                    fontFamily: 'var(--ff-sans)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{b.title}</div>
                  {b.durationMin && (
                    <div style={{
                      fontSize: 10, color: 'var(--ink-4)',
                      marginTop: 1,
                      fontFamily: 'var(--ff-sans)',
                    }}>{b.durationMin} min</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: accept */}
        <div style={{
          padding: '10px 12px 12px',
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={handleAccept}
            onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAccept(); } }}
            disabled={accepted}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: accepted ? 'default' : 'pointer',
              width: '100%', padding: '9px 14px',
              borderRadius: 999, border: 0,
              background: accepted
                ? 'rgba(61,255,209,0.10)'
                : 'linear-gradient(135deg, var(--neon), #1ad9ad)',
              color: accepted ? 'var(--neon)' : '#0a1410',
              fontSize: 12.5, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              boxShadow: accepted ? 'none' : '0 4px 12px -2px rgba(61,255,209,0.32)',
              transition: 'all .2s',
            }}>
            {accepted ? '✓ Agendado' : 'Aceptar todos'}
          </button>
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 5. IAArtifactReminder — recordatorio sugerido por el coach
  // ═══════════════════════════════════════════════════════════════════════════
  // Card compacta con title + time + repeat. CTA "Activar" agrega al
  // __mtxIAAgenda.reminders. Saltar → dismiss (no se persiste).
  function IAArtifactReminder(props) {
    var art = props.artifact || {};
    var title = art.title || 'Recordatorio';
    var time = art.time || 'Sin hora';
    var repeat = art.repeat || 'Una vez';

    var statusState = React.useState('pending');  // pending|active|dismissed
    var status = statusState[0]; var setStatus = statusState[1];

    var handleActivate = function() {
      if (status !== 'pending') return;
      if (window.__mtxIAAgenda && window.__mtxIAAgenda.addReminder) {
        window.__mtxIAAgenda.addReminder({
          label: title,
          time: time,
          recurrence: repeat.toLowerCase().indexOf('diari') >= 0 ? 'daily' : 'once',
        });
      }
      if (window.__mtxToast && window.__mtxToast.show) {
        window.__mtxToast.show({
          message: '✦ Recordatorio activado',
          duration: 1800,
        });
      }
      setStatus('active');
    };

    var handleDismiss = function() {
      if (status !== 'pending') return;
      setStatus('dismissed');
    };

    if (status === 'dismissed') {
      return (
        <div style={{
          padding: '8px 14px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.02)',
          border: '0.5px dashed rgba(255,255,255,0.08)',
          fontSize: 11.5, color: 'var(--ink-4)',
          fontStyle: 'italic',
          fontFamily: 'var(--ff-sans)',
          textAlign: 'center',
          animation: 'mtx-fade-up .25s ease both',
        }}>Sugerencia descartada</div>
      );
    }

    var isActive = status === 'active';

    return (
      <div style={{
        padding: 12,
        borderRadius: 14,
        background: isActive
          ? 'linear-gradient(135deg, rgba(61,255,209,0.08), rgba(61,255,209,0.02))'
          : 'rgba(255,255,255,0.025)',
        border: '0.5px solid ' + (isActive ? 'rgba(61,255,209,0.28)' : 'rgba(255,255,255,0.08)'),
        animation: 'mtx-fade-up .35s ease both',
        transition: 'all .25s',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 11,
          marginBottom: status === 'pending' ? 10 : 0,
        }}>
          {/* Bell icon */}
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            background: isActive
              ? 'linear-gradient(135deg, rgba(61,255,209,0.22), rgba(61,255,209,0.06))'
              : 'rgba(255,255,255,0.04)',
            border: '0.5px solid ' + (isActive ? 'rgba(61,255,209,0.30)' : 'rgba(255,255,255,0.08)'),
            color: isActive ? 'var(--neon)' : 'var(--ink-2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            fontSize: 15,
          }}>🔔</div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: 'var(--ink-1)',
              letterSpacing: '-0.005em',
              fontFamily: 'var(--ff-sans)',
              marginBottom: 2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{title}</div>
            <div style={{
              fontSize: 11, color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span>{time}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{repeat}</span>
            </div>
          </div>

          {/* Active checkmark */}
          {isActive && (
            <div style={{
              fontSize: 13, color: 'var(--neon)',
              flexShrink: 0,
              fontWeight: 700,
            }}>✓</div>
          )}
        </div>

        {/* Actions — solo en pending */}
        {status === 'pending' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDismiss}
              onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDismiss(); } }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                flex: 1, padding: '7px 12px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                color: 'var(--ink-3)',
                fontSize: 11.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>Saltar</button>
            <button
              onClick={handleActivate}
              onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(); } }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                flex: 2, padding: '7px 14px',
                borderRadius: 999, border: 0,
                background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
                color: '#0a1410',
                fontSize: 11.5, fontWeight: 700,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                boxShadow: '0 4px 12px -2px rgba(61,255,209,0.32)',
              }}>Activar</button>
          </div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 6. IAArtifactPlanCard — plan semanal/mensual (RFC-001 §5.2 #1)
  // ═══════════════════════════════════════════════════════════════════════════
  // El artefacto más rico del coach: un plan tocable con timeline mini de días,
  // items por día con icon, notas explicativas y CTAs primario+secundario.
  // Diseñado para sentirse como una página de diario, no como una tabla.
  //
  // Shape:
  //   {
  //     kind: 'plan_card',
  //     title: 'Tu semana — del 21 al 27',
  //     icon: '📓' | other emoji,
  //     days: [
  //       { label: 'Lun', items: [{ icon: '◐'|'⚡'|'◯'|'✈️', text: '...' }] },
  //     ],
  //     notes?: ['...', '...'],
  //     primaryAction?: { label: 'Agendarlo todo', value: 'commit_all' },
  //     secondaryAction?: { label: 'Ajustar', value: 'edit' }
  //   }
  function IAArtifactPlanCard(props) {
    var art = props.artifact || {};
    var title = art.title || 'Tu plan';
    var icon = art.icon || '📓';
    var days = Array.isArray(art.days) ? art.days : [];
    var notes = Array.isArray(art.notes) ? art.notes : [];
    var primaryAction = art.primaryAction;
    var secondaryAction = art.secondaryAction;

    var expandedState = React.useState(true);
    var expanded = expandedState[0];
    var setExpanded = expandedState[1];

    function handleAction(action) {
      if (!action) return;
      window.dispatchEvent(new CustomEvent('mtx:coach-artifact-action', {
        detail: { kind: 'plan_card', value: action.value, artifact: art },
      }));
    }

    return (
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {/* Header — tap para colapsar */}
        <button
          type="button"
          onClick={function() { setExpanded(function(v) { return !v; }); }}
          onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(function(v) { return !v; }); } }}
          aria-expanded={expanded}
          aria-label={expanded ? 'Colapsar plan' : 'Expandir plan'}
          className="mtx-tap"
          style={{
            appearance: 'none', cursor: 'pointer',
            width: '100%', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'transparent', border: 0,
            color: 'inherit', textAlign: 'left',
          }}>
          <span style={{ fontSize: 17, flexShrink: 0 }} aria-hidden="true">{icon}</span>
          <div style={{
            flex: 1, minWidth: 0,
            fontSize: 13.5, fontWeight: 600,
            color: 'var(--ink-1)',
            letterSpacing: '-0.005em',
            fontFamily: 'var(--ff-sans)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{title}</div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform .2s',
              flexShrink: 0,
            }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {expanded && (
          <div style={{
            padding: '0 16px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
            animation: 'mtx-fade-up .3s ease both',
          }}>
            {/* Days timeline */}
            {days.map(function(day, idx) {
              var isCriticalDay = (day.items || []).some(function(it) { return it.icon === '⚡'; });
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  paddingTop: 8,
                  borderTop: idx > 0 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  {/* Day label */}
                  <div style={{
                    flexShrink: 0,
                    width: 32,
                    fontSize: 11, fontWeight: 700,
                    color: isCriticalDay ? 'var(--neon)' : 'var(--ink-3)',
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    paddingTop: 1,
                  }}>{day.label}</div>
                  {/* Items */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {(day.items || []).map(function(item, i) {
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 7,
                          fontSize: 12.5,
                          color: 'var(--ink-2)',
                          fontFamily: 'var(--ff-sans)',
                          letterSpacing: '-0.005em',
                          lineHeight: 1.4,
                        }}>
                          <span style={{
                            flexShrink: 0, marginTop: 1,
                            opacity: item.icon === '◯' ? 0.4 : 0.85,
                            color: item.icon === '⚡' ? 'var(--neon)' : 'inherit',
                          }} aria-hidden="true">{item.icon || '◐'}</span>
                          <span style={{ flex: 1, minWidth: 0 }}>{item.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Notes */}
            {notes.length > 0 && (
              <div style={{
                marginTop: 6,
                padding: '10px 12px',
                background: 'rgba(155,138,255,0.05)',
                borderRadius: 10,
                borderLeft: '2px solid rgba(155,138,255,0.40)',
                display: 'flex', flexDirection: 'column', gap: 5,
              }}>
                {notes.map(function(note, i) {
                  return (
                    <div key={i} style={{
                      fontSize: 11.5,
                      color: 'var(--ink-2)',
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                      lineHeight: 1.5,
                      display: 'flex', gap: 6,
                    }}>
                      <span style={{ color: 'rgba(155,138,255,0.6)', flexShrink: 0 }}>•</span>
                      <span>{note}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            {(primaryAction || secondaryAction) && (
              <div style={{
                display: 'flex', gap: 8,
                marginTop: 4,
              }}>
                {secondaryAction && (
                  <button
                    type="button"
                    onClick={function() { handleAction(secondaryAction); }}
                    onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAction(secondaryAction); } }}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer',
                      flex: 1, padding: '8px 14px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.04)',
                      border: '0.5px solid rgba(255,255,255,0.10)',
                      color: 'var(--ink-2)',
                      fontSize: 12, fontWeight: 600,
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                    }}>{secondaryAction.label}</button>
                )}
                {primaryAction && (
                  <button
                    type="button"
                    onClick={function() { handleAction(primaryAction); }}
                    onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAction(primaryAction); } }}
                    className="mtx-tap"
                    style={{
                      appearance: 'none', cursor: 'pointer',
                      flex: 2, padding: '8px 16px',
                      borderRadius: 999, border: 0,
                      background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
                      color: '#0a1410',
                      fontSize: 12, fontWeight: 700,
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                      boxShadow: '0 4px 12px -2px rgba(61,255,209,0.32)',
                    }}>{primaryAction.label}</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 7. IAArtifactConfirmationCard — confirmación antes de acción externa
  // ═══════════════════════════════════════════════════════════════════════════
  // Aparece cuando el coach va a hacer algo "fuera de Mentex" (reservar, comprar,
  // mandar mensaje, conectar integración). NUNCA pide confirmación para acciones
  // locales reversibles (agregar a Ritual, programar reminder, etc.). Ver
  // RFC-001 §5.3.
  //
  // Shape:
  //   {
  //     kind: 'confirmation_card',
  //     preface?: 'Antes de hacerlo:',
  //     bullets: ['Reservar Yoga Flow', 'Casa del Yoga · Sáb 9am', ...],
  //     primaryAction: { label: 'Adelante, hazlo', value: 'confirm' },
  //     secondaryAction: { label: 'Cancelar', value: 'cancel' },
  //     resolved?: 'confirmed' | 'cancelled'   // si ya fue resuelto
  //   }
  function IAArtifactConfirmationCard(props) {
    var art = props.artifact || {};
    var preface = art.preface || 'Antes de hacerlo:';
    var bullets = Array.isArray(art.bullets) ? art.bullets : [];
    var primaryAction = art.primaryAction || { label: 'Adelante', value: 'confirm' };
    var secondaryAction = art.secondaryAction || { label: 'Cancelar', value: 'cancel' };
    var resolved = art.resolved;

    function handleAction(action) {
      if (resolved) return;
      window.dispatchEvent(new CustomEvent('mtx:coach-artifact-action', {
        detail: { kind: 'confirmation_card', value: action.value, artifact: art },
      }));
    }

    var isResolved = !!resolved;
    var resolvedLabel = resolved === 'confirmed'
      ? '✓ Confirmaste — el coach está procediendo'
      : resolved === 'cancelled'
        ? 'Cancelaste — no se hizo nada'
        : '';

    return (
      <div style={{
        borderRadius: 16,
        background: 'rgba(255,200,80,0.04)',
        border: '0.5px solid rgba(255,200,80,0.22)',
        padding: '14px 16px',
        animation: 'mtx-fade-up .35s ease both',
        opacity: isResolved ? 0.65 : 1,
        transition: 'opacity .3s',
      }}>
        {/* Preface */}
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: '#ffc850',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>{preface}</div>

        {/* Bullets */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 7,
          marginBottom: 14,
        }}>
          {bullets.map(function(bullet, i) {
            return (
              <div key={i} style={{
                display: 'flex', gap: 9, alignItems: 'flex-start',
                fontSize: 13, lineHeight: 1.45,
                color: 'var(--ink-1)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>
                <span style={{
                  color: 'rgba(255,200,80,0.7)',
                  flexShrink: 0,
                  paddingTop: 1,
                  fontSize: 11,
                }} aria-hidden="true">☞</span>
                <span style={{ flex: 1, minWidth: 0 }}>{bullet}</span>
              </div>
            );
          })}
        </div>

        {/* Resolved status (if resolved) */}
        {isResolved && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: resolved === 'confirmed' ? 'rgba(61,255,209,0.06)' : 'rgba(255,255,255,0.03)',
            border: '0.5px solid ' + (resolved === 'confirmed' ? 'rgba(61,255,209,0.20)' : 'rgba(255,255,255,0.08)'),
            fontSize: 12,
            color: resolved === 'confirmed' ? 'var(--neon)' : 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            fontWeight: 600,
            textAlign: 'center',
          }}>{resolvedLabel}</div>
        )}

        {/* Actions — solo si no está resuelto */}
        {!isResolved && (
          <div style={{
            display: 'flex', gap: 8,
          }}>
            <button
              type="button"
              onClick={function() { handleAction(secondaryAction); }}
              onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAction(secondaryAction); } }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                flex: 1, padding: '9px 14px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                color: 'var(--ink-2)',
                fontSize: 12.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>{secondaryAction.label}</button>
            <button
              type="button"
              onClick={function() { handleAction(primaryAction); }}
              onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAction(primaryAction); } }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                flex: 2, padding: '9px 16px',
                borderRadius: 999, border: 0,
                background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
                color: '#0a1410',
                fontSize: 12.5, fontWeight: 700,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                boxShadow: '0 4px 14px -2px rgba(61,255,209,0.38)',
              }}>{primaryAction.label}</button>
          </div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 8. IAArtifactRecommendationCard — recomendación enriquecida (RFC §5.2 #2)
  // ═══════════════════════════════════════════════════════════════════════════
  // Versión RFC-aligned del recommendation. Diferente al 'content' existente
  // (legacy) — incluye razón explícita ("por qué te lo recomiendo") y CTAs
  // primario + secundario. Funciona standalone o dentro de un recommendation_list.
  //
  // Shape:
  //   {
  //     kind: 'recommendation_card',
  //     itemId?: string,                 // resuelve cover/título desde EXPLORE_CONTENT
  //     item?: {                         // o item inline
  //       title, author, kind, durationMin, cover, accent, isPremium
  //     },
  //     reason?: string,                 // 'Porque ayer mencionaste...'
  //     primaryAction?: { label: 'Reproducir', value: 'play' },
  //     secondaryAction?: { label: 'Guardar', value: 'save' }
  //   }
  function IAArtifactRecommendationCard(props) {
    var art = props.artifact || {};
    var item = art.item;

    // Resolver desde EXPLORE_CONTENT si itemId está presente
    if (!item && art.itemId && typeof window !== 'undefined' && window.EXPLORE_CONTENT) {
      item = window.EXPLORE_CONTENT.find(function(c) { return c && c.id === art.itemId; });
    }

    if (!item) {
      return (
        <div style={{
          padding: 14, borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px dashed rgba(255,255,255,0.10)',
          fontSize: 12, color: 'var(--ink-3)',
          fontFamily: 'var(--ff-sans)',
        }}>Contenido recomendado no disponible.</div>
      );
    }

    var reason = art.reason;
    var primaryAction = art.primaryAction || { label: 'Reproducir', value: 'play' };
    var secondaryAction = art.secondaryAction;

    var accent = item.accent || 'var(--neon)';
    var kindLabel = item.kind === 'audiobook' ? 'Audiolibro'
                  : item.kind === 'meditation' ? 'Meditación'
                  : item.kind === 'talk' ? 'Charla'
                  : item.kind === 'sound' ? 'Sonido'
                  : item.kind === 'series' ? 'Serie'
                  : item.kind === 'podcast' ? 'Podcast'
                  : '';
    var duration = item.durationMin ? item.durationMin + ' min' : '';

    function handleAction(action) {
      if (!action) return;
      window.dispatchEvent(new CustomEvent('mtx:coach-artifact-action', {
        detail: { kind: 'recommendation_card', value: action.value, artifact: art, item: item },
      }));
    }

    return (
      <div style={{
        borderRadius: 14, overflow: 'hidden',
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {/* Top section: cover + info */}
        <div style={{ display: 'flex', gap: 12, padding: 12 }}>
          {/* Cover */}
          <div style={{
            width: 72, height: 72,
            borderRadius: 10, flexShrink: 0,
            background: item.bg_gradient || ('linear-gradient(135deg, ' + accent + '40, ' + accent + '15)'),
            backgroundImage: item.cover_url ? 'url(' + item.cover_url + ')' : (item.bg_gradient || undefined),
            backgroundSize: 'cover', backgroundPosition: 'center',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
            padding: 6,
            border: '0.5px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 12px -4px rgba(0,0,0,0.4)',
          }}>
            {item.isPremium && (
              <span style={{
                padding: '2px 6px',
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                borderRadius: 4,
                fontSize: 8, fontWeight: 700,
                color: 'rgba(255,200,80,0.9)',
                letterSpacing: '0.05em',
              }}>PRO</span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700,
              color: accent,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'var(--ff-sans)',
            }}>{kindLabel}</div>
            <div style={{
              fontSize: 13.5, fontWeight: 600,
              color: 'var(--ink-1)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              lineHeight: 1.3,
              maxHeight: '2.6em',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
            }}>{item.title}</div>
            <div style={{
              fontSize: 11.5,
              color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
            }}>
              {item.author && <span>{item.author}</span>}
              {item.author && duration && <span style={{ opacity: 0.5 }}>·</span>}
              {duration && <span>{duration}</span>}
            </div>
          </div>
        </div>

        {/* Reason callout */}
        {reason && (
          <div style={{
            margin: '0 12px',
            padding: '8px 10px',
            background: 'rgba(155,138,255,0.05)',
            borderRadius: 8,
            borderLeft: '2px solid rgba(155,138,255,0.40)',
            fontSize: 11.5,
            color: 'var(--ink-2)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}>{reason}</div>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex', gap: 8,
          padding: '10px 12px 12px',
        }}>
          {secondaryAction && (
            <button
              type="button"
              onClick={function() { handleAction(secondaryAction); }}
              onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAction(secondaryAction); } }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                flex: 1, padding: '7px 12px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                color: 'var(--ink-2)',
                fontSize: 11.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>{secondaryAction.label}</button>
          )}
          <button
            type="button"
            onClick={function() { handleAction(primaryAction); }}
            onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAction(primaryAction); } }}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              flex: secondaryAction ? 2 : 1, padding: '7px 14px',
              borderRadius: 999, border: 0,
              background: 'linear-gradient(135deg, ' + accent + ', ' + accent + 'cc)',
              color: '#0a1410',
              fontSize: 11.5, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              boxShadow: '0 4px 12px -2px ' + accent + '50',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
            <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 1.5 L10 6 L3 10.5 Z" fill="currentColor"/>
            </svg>
            {primaryAction.label}
          </button>
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // ╔═════════════════════════════════════════════════════════════════════════╗
  // ║  RFC-001 §5.2 · SEMANA 2 — 18 ARTEFACTOS RESTANTES                       ║
  // ║  insight_card · stats_compact · step_by_step · crisis_support_card       ║
  // ║  quote_card · progress_viz · comparison_table · recommendation_list      ║
  // ║  memory_recall_card · timeline_mini · calendar_mini · error_gentle       ║
  // ║  loading_skeleton · audio_waveform · map_mini · image_inline             ║
  // ║  video_inline · mermaid_diagram                                          ║
  // ╚═════════════════════════════════════════════════════════════════════════╝
  // Convenciones inviolables (todas las cards):
  //   • Border-radius 14px (cards grandes) / 10px (chips, buttons)
  //   • Border 0.5px rgba(255,255,255,0.08)
  //   • Background sutil (0.02-0.04 alpha)
  //   • Animación entrada: mtx-fade-up .35s ease both
  //   • Aria-label en todo botón/tappable
  //   • Acciones → mtx:coach-artifact-action event (consumido por bridge)
  // ═══════════════════════════════════════════════════════════════════════════

  // Helper para dispatchear acciones desde cualquier card
  function _emitArtifactAction(kind, value, artifact, extra) {
    window.dispatchEvent(new CustomEvent('mtx:coach-artifact-action', {
      detail: Object.assign({ kind: kind, value: value, artifact: artifact }, extra || {}),
    }));
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 9. IAArtifactInsightCard — métrica grande + contexto + trend (RFC §5.2 #4)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   {
  //     kind: 'insight_card',
  //     title?: 'Esta semana',         // contexto temporal
  //     metric: '6h 42min',            // valor grande
  //     metricLabel?: 'promedio sueño',
  //     trend?: { direction: 'up'|'down'|'flat', value: '+12%', accent?: '#3dffd1' },
  //     sparkline?: [0.4, 0.5, 0.6, 0.8, 0.7, 0.5, 0.9],  // 0-1 normalized
  //     extras?: [{ label: 'Mejor noche', value: 'Dom · 8h 15' }],
  //     accent?: '#9b8aff',
  //   }
  function IAArtifactInsightCard(props) {
    var art = props.artifact || {};
    var title = art.title;
    var metric = art.metric || '—';
    var metricLabel = art.metricLabel;
    var trend = art.trend;
    var spark = Array.isArray(art.sparkline) ? art.sparkline : null;
    var extras = Array.isArray(art.extras) ? art.extras : [];
    var accent = art.accent || '#9b8aff';

    return (
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        padding: '16px 18px',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {title && (
          <div style={{
            fontSize: 10.5, fontWeight: 700,
            color: accent,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontFamily: 'var(--ff-sans)',
            marginBottom: 8,
          }}>{title}</div>
        )}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 10,
          marginBottom: metricLabel || trend ? 4 : 0,
        }}>
          <div style={{
            fontSize: 30, fontWeight: 700,
            color: 'var(--ink-1)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>{metric}</div>
          {trend && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '3px 8px', borderRadius: 999,
              background: trend.direction === 'up' ? 'rgba(61,255,209,0.10)'
                       : trend.direction === 'down' ? 'rgba(255,139,139,0.10)'
                       : 'rgba(255,255,255,0.06)',
              border: '0.5px solid ' + (trend.direction === 'up' ? 'rgba(61,255,209,0.25)' : trend.direction === 'down' ? 'rgba(255,139,139,0.25)' : 'rgba(255,255,255,0.10)'),
              fontSize: 11, fontWeight: 700,
              color: trend.direction === 'up' ? '#3dffd1' : trend.direction === 'down' ? '#ff8b8b' : 'var(--ink-2)',
              fontFamily: 'var(--ff-sans)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              <span style={{ fontSize: 9 }}>{trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '—'}</span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        {metricLabel && (
          <div style={{
            fontSize: 12.5,
            color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            marginBottom: spark || extras.length > 0 ? 14 : 0,
          }}>{metricLabel}</div>
        )}
        {spark && spark.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 4,
            height: 32, marginBottom: extras.length > 0 ? 14 : 0,
            paddingTop: 4,
          }} aria-label="Tendencia">
            {spark.map(function(h, i) {
              var hh = Math.max(0.12, Math.min(1, h));
              return (
                <div key={i} style={{
                  flex: 1,
                  height: (hh * 100) + '%',
                  minHeight: 4,
                  borderRadius: 2,
                  background: 'linear-gradient(180deg, ' + accent + 'ee 0%, ' + accent + '55 100%)',
                  boxShadow: '0 0 6px ' + accent + '30',
                }}/>
              );
            })}
          </div>
        )}
        {extras.length > 0 && (
          <div style={{
            paddingTop: 12,
            borderTop: '0.5px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column', gap: 7,
          }}>
            {extras.map(function(ex, i) {
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 12,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                }}>
                  <span style={{ color: 'var(--ink-3)' }}>{ex.label}</span>
                  <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>{ex.value}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 10. IAArtifactStatsCompact — métricas en row horizontal (RFC §5.2 #18)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   { kind: 'stats_compact', stats: [{ value: '7', label: 'días', accent?: '#3dffd1' }] }
  function IAArtifactStatsCompact(props) {
    var art = props.artifact || {};
    var stats = Array.isArray(art.stats) ? art.stats : [];
    if (stats.length === 0) return null;
    return (
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        padding: '14px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {stats.map(function(s, i) {
          var accent = s.accent || 'var(--neon)';
          return (
            <React.Fragment key={i}>
              <div style={{
                flex: 1, minWidth: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              }}>
                <div style={{
                  fontSize: 22, fontWeight: 700,
                  color: accent,
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: '0 0 12px ' + accent + '30',
                }}>{s.value}</div>
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--ff-sans)',
                  textAlign: 'center',
                }}>{s.label}</div>
              </div>
              {i < stats.length - 1 && (
                <div style={{
                  width: '0.5px', height: 32,
                  background: 'rgba(255,255,255,0.08)',
                  flexShrink: 0,
                }}/>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 11. IAArtifactStepByStep — guía multi-paso expandible (RFC §5.2 #10)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   {
  //     kind: 'step_by_step',
  //     title?: 'Aplicar protocolo de sueño',
  //     steps: [{ title: 'Luz solar matutina', body?: 'Por qué a ti: ...', tag?: '5-10 min' }],
  //     primaryAction?: { label: 'Aplicar todos', value: 'apply_all' },
  //     secondaryAction?: { label: 'Solo el primero', value: 'apply_first' }
  //   }
  function IAArtifactStepByStep(props) {
    var art = props.artifact || {};
    var title = art.title;
    var steps = Array.isArray(art.steps) ? art.steps : [];
    var primaryAction = art.primaryAction;
    var secondaryAction = art.secondaryAction;

    var expandedState = React.useState({});  // { 0: true, 1: false, ... }
    var expanded = expandedState[0];
    var setExpanded = expandedState[1];

    function toggle(i) {
      setExpanded(function(prev) {
        var next = Object.assign({}, prev);
        next[i] = !next[i];
        return next;
      });
    }

    return (
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        padding: '14px 16px',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {title && (
          <div style={{
            fontSize: 13.5, fontWeight: 600,
            color: 'var(--ink-1)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            marginBottom: 10,
          }}>{title}</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {steps.map(function(step, i) {
            var isOpen = !!expanded[i];
            var hasBody = !!step.body;
            return (
              <div key={i} style={{
                paddingTop: i > 0 ? 10 : 0,
                borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <button
                  type="button"
                  onClick={hasBody ? function() { toggle(i); } : undefined}
                  className={hasBody ? 'mtx-tap' : ''}
                  aria-expanded={hasBody ? isOpen : undefined}
                  aria-label={'Paso ' + (i + 1) + ': ' + step.title}
                  style={{
                    appearance: 'none', cursor: hasBody ? 'pointer' : 'default',
                    width: '100%', padding: '4px 0',
                    background: 'transparent', border: 0,
                    color: 'inherit', textAlign: 'left',
                    display: 'flex', alignItems: 'flex-start', gap: 11,
                  }}>
                  {/* Step number badge */}
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    flexShrink: 0,
                    background: 'rgba(61,255,209,0.10)',
                    border: '0.5px solid rgba(61,255,209,0.30)',
                    color: 'var(--neon)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    fontFamily: 'var(--ff-sans)',
                    fontVariantNumeric: 'tabular-nums',
                    marginTop: 1,
                  }}>{i + 1}</div>
                  {/* Title + tag */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 13, fontWeight: 600,
                      color: 'var(--ink-1)',
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                      lineHeight: 1.4,
                    }}>
                      <span style={{ flex: 1, minWidth: 0 }}>{step.title}</span>
                      {step.tag && (
                        <span style={{
                          padding: '1px 7px', borderRadius: 999,
                          background: 'rgba(255,255,255,0.04)',
                          border: '0.5px solid rgba(255,255,255,0.08)',
                          fontSize: 9.5, fontWeight: 600,
                          color: 'var(--ink-3)',
                          letterSpacing: '0.02em',
                          fontFamily: 'var(--ff-sans)',
                          flexShrink: 0,
                        }}>{step.tag}</span>
                      )}
                    </div>
                    {/* Expanded body */}
                    {isOpen && hasBody && (
                      <div style={{
                        marginTop: 6,
                        fontSize: 12, lineHeight: 1.55,
                        color: 'var(--ink-2)',
                        fontFamily: 'var(--ff-sans)',
                        letterSpacing: '-0.005em',
                        animation: 'mtx-fade-up .2s ease both',
                      }}>{step.body}</div>
                    )}
                  </div>
                  {/* Chevron */}
                  {hasBody && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="rgba(255,255,255,0.35)" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform .2s',
                        flexShrink: 0, marginTop: 5,
                      }} aria-hidden="true">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        {(primaryAction || secondaryAction) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {secondaryAction && (
              <button
                type="button"
                onClick={function() { _emitArtifactAction('step_by_step', secondaryAction.value, art); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  flex: 1, padding: '8px 14px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  color: 'var(--ink-2)',
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                }}>{secondaryAction.label}</button>
            )}
            {primaryAction && (
              <button
                type="button"
                onClick={function() { _emitArtifactAction('step_by_step', primaryAction.value, art); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  flex: 2, padding: '8px 16px',
                  borderRadius: 999, border: 0,
                  background: 'linear-gradient(135deg, var(--neon), #1ad9ad)',
                  color: '#0a1410',
                  fontSize: 12, fontWeight: 700,
                  fontFamily: 'var(--ff-sans)',
                  boxShadow: '0 4px 12px -2px rgba(61,255,209,0.32)',
                }}>{primaryAction.label}</button>
            )}
          </div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 12. IAArtifactCrisisSupportCard — RFC §11.5 + RFC-002 placeholder
  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANTE ESPECIAL del step_by_step para crisis. Sigue RFC-001 §11.5:
  //   • Tipografía un punto más grande (15-17px)
  //   • Tap-targets ≥ 56pt (más fácil de tocar en momento difícil)
  //   • Sin animaciones cute
  //   • Recursos pro (dial-out) en primera posición
  //   • Sin neon brillante — tono grounded
  //
  // Shape:
  //   {
  //     kind: 'crisis_support_card',
  //     intro?: 'Lo que dijiste me importa...',
  //     resources: [{ flag: '🇨🇴', label: 'Línea 106 (24/7, gratis)', phone: '106', kind: 'call' }],
  //     disclaimer?: 'No estoy aquí para reemplazar ayuda profesional...'
  //   }
  function IAArtifactCrisisSupportCard(props) {
    var art = props.artifact || {};
    var intro = art.intro;
    var resources = Array.isArray(art.resources) ? art.resources : [];
    var disclaimer = art.disclaimer;

    return (
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.12)',
        padding: '18px 18px',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {intro && (
          <div style={{
            fontSize: 15, lineHeight: 1.55,
            color: 'var(--ink-1)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            marginBottom: 18,
            whiteSpace: 'pre-wrap',
          }}>{intro}</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {resources.map(function(r, i) {
            var href = r.kind === 'call' ? 'tel:' + r.phone
                    : r.kind === 'sms' ? 'sms:' + r.phone
                    : r.url || '#';
            return (
              <a key={i}
                href={href}
                aria-label={r.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  minHeight: 56,
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  color: 'var(--ink-1)',
                  textDecoration: 'none',
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  transition: 'background .15s, border-color .15s',
                }}
                onMouseEnter={function(e) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
                }}
                onMouseLeave={function(e) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                }}>
                <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }} aria-hidden="true">{r.flag || '☎️'}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500 }}>{r.label}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.45)" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </a>
            );
          })}
        </div>
        {disclaimer && (
          <div style={{
            marginTop: 16, paddingTop: 14,
            borderTop: '0.5px solid rgba(255,255,255,0.08)',
            fontSize: 13, lineHeight: 1.55,
            color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            whiteSpace: 'pre-wrap',
          }}>{disclaimer}</div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 13. IAArtifactQuoteCard — cita con autor y fondo bonito (RFC §5.2 #8)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   { kind: 'quote_card', quote: '...', author: 'Naval Ravikant', source?: 'Almanack' }
  function IAArtifactQuoteCard(props) {
    var art = props.artifact || {};
    var quote = art.quote || '';
    var author = art.author;
    var source = art.source;
    var accent = art.accent || '#9b8aff';

    return (
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(155,138,255,0.12) 0%, rgba(61,255,209,0.06) 60%, rgba(255,200,80,0.04) 100%)',
        border: '0.5px solid rgba(155,138,255,0.20)',
        padding: '22px 22px 18px',
        position: 'relative',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        <div style={{
          position: 'absolute', top: 8, left: 12,
          fontSize: 60, lineHeight: 1,
          color: 'rgba(255,255,255,0.06)',
          fontFamily: 'Georgia, "Times New Roman", serif',
          pointerEvents: 'none',
        }} aria-hidden="true">"</div>
        <div style={{
          position: 'relative', zIndex: 1,
          fontSize: 16, lineHeight: 1.55,
          color: 'var(--ink-1)',
          fontFamily: 'Georgia, "New York", serif',
          letterSpacing: '-0.005em',
          fontStyle: 'italic',
          marginBottom: 14,
          whiteSpace: 'pre-wrap',
        }}>{quote}</div>
        {(author || source) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12,
            color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '0.005em',
          }}>
            {author && (
              <span style={{ color: accent, fontWeight: 600 }}>— {author}</span>
            )}
            {source && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ fontStyle: 'italic' }}>{source}</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 14. IAArtifactProgressViz — barra de progreso estética (RFC §5.2 #11)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   {
  //     kind: 'progress_viz',
  //     title?: 'Reto · Enfoque Profundo 21 días',
  //     progress: 0.67,            // 0-1
  //     label?: '14 de 21 días',
  //     subtext?: '7 días para terminar',
  //     accent?: '#3dffd1',
  //   }
  function IAArtifactProgressViz(props) {
    var art = props.artifact || {};
    var title = art.title;
    var progress = Math.max(0, Math.min(1, art.progress || 0));
    var label = art.label;
    var subtext = art.subtext;
    var accent = art.accent || '#3dffd1';

    return (
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        padding: '14px 16px',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {title && (
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: 'var(--ink-2)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            marginBottom: 10,
          }}>{title}</div>
        )}
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 10, marginBottom: 8,
        }}>
          {label && (
            <div style={{
              fontSize: 18, fontWeight: 700,
              color: 'var(--ink-1)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.01em',
              fontVariantNumeric: 'tabular-nums',
            }}>{label}</div>
          )}
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: accent,
            fontFamily: 'var(--ff-sans)',
            fontVariantNumeric: 'tabular-nums',
          }}>{Math.round(progress * 100)}%</div>
        </div>
        <div style={{
          width: '100%', height: 8,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            width: (progress * 100) + '%',
            background: 'linear-gradient(90deg, ' + accent + '88, ' + accent + ')',
            borderRadius: 999,
            boxShadow: '0 0 8px ' + accent + '60',
            animation: 'mtx-progress-fill 1.2s cubic-bezier(0.2, 0.9, 0.3, 1) both',
          }}/>
        </div>
        {subtext && (
          <div style={{
            marginTop: 8,
            fontSize: 11.5,
            color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
          }}>{subtext}</div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 15. IAArtifactComparisonTable — comparar opciones (RFC §5.2 #9)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   {
  //     kind: 'comparison_table',
  //     title?: 'Tres opciones de meditación',
  //     columns: [
  //       { id: 'a', label: 'Calma 5min', accent: '#3dffd1', highlighted: true },
  //       { id: 'b', label: 'Sueño 12min', accent: '#9b8aff' },
  //       { id: 'c', label: 'Ansiedad 8min' }
  //     ],
  //     rows: [
  //       { label: 'Duración', values: ['5 min', '12 min', '8 min'] },
  //       { label: 'Para cuándo', values: ['Pausa diurna', 'Antes de dormir', 'En momento difícil'] }
  //     ]
  //   }
  function IAArtifactComparisonTable(props) {
    var art = props.artifact || {};
    var title = art.title;
    var columns = Array.isArray(art.columns) ? art.columns : [];
    var rows = Array.isArray(art.rows) ? art.rows : [];

    return (
      <div style={{
        borderRadius: 14, overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {title && (
          <div style={{
            padding: '12px 14px 10px',
            fontSize: 12, fontWeight: 600,
            color: 'var(--ink-2)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          }}>{title}</div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--ff-sans)',
            fontSize: 12,
          }}>
            <thead>
              <tr>
                <th style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontSize: 10, fontWeight: 700,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  background: 'rgba(255,255,255,0.015)',
                  borderRight: '0.5px solid rgba(255,255,255,0.05)',
                }}></th>
                {columns.map(function(col, i) {
                  var accent = col.accent || 'var(--ink-2)';
                  return (
                    <th key={col.id || i} style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      fontSize: 11, fontWeight: 700,
                      color: col.highlighted ? accent : 'var(--ink-2)',
                      letterSpacing: '-0.005em',
                      background: col.highlighted ? accent + '12' : 'rgba(255,255,255,0.015)',
                      borderRight: i < columns.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                      borderBottom: col.highlighted ? '1.5px solid ' + accent : '0.5px solid rgba(255,255,255,0.05)',
                    }}>{col.label}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map(function(row, ri) {
                return (
                  <tr key={ri}>
                    <td style={{
                      padding: '10px 12px',
                      fontSize: 11, fontWeight: 600,
                      color: 'var(--ink-3)',
                      borderRight: '0.5px solid rgba(255,255,255,0.05)',
                      borderTop: ri > 0 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
                      background: 'rgba(255,255,255,0.01)',
                    }}>{row.label}</td>
                    {(row.values || []).map(function(v, ci) {
                      var col = columns[ci] || {};
                      return (
                        <td key={ci} style={{
                          padding: '10px 12px',
                          fontSize: 12,
                          color: col.highlighted ? 'var(--ink-1)' : 'var(--ink-2)',
                          fontWeight: col.highlighted ? 600 : 400,
                          background: col.highlighted ? (col.accent || 'var(--neon)') + '08' : 'transparent',
                          borderRight: ci < columns.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                          borderTop: ri > 0 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
                        }}>{v}</td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 16. IAArtifactRecommendationList — stack de RecommendationCards (RFC #3)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape: { kind: 'recommendation_list', items: [<recommendation_card props>] }
  function IAArtifactRecommendationList(props) {
    var art = props.artifact || {};
    var items = Array.isArray(art.items) ? art.items : [];
    if (items.length === 0) return null;
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {items.map(function(rec, i) {
          // Inyecta kind para que el sub-componente sepa qué es
          return <IAArtifactRecommendationCard key={i} artifact={Object.assign({ kind: 'recommendation_card' }, rec)}/>;
        })}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 17. IAArtifactMemoryRecallCard — lo que el coach recuerda de ti (RFC #20)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   {
  //     kind: 'memory_recall_card',
  //     title?: 'Lo que tengo de ti sobre esto',
  //     facts: [{ text: 'Duermes mal cuando llueve', source?: 'Hace 3 semanas', editable?: true }],
  //     primaryAction?: { label: 'Ver toda mi Memoria', value: 'open_memory' }
  //   }
  function IAArtifactMemoryRecallCard(props) {
    var art = props.artifact || {};
    var title = art.title || 'Lo que sé de ti';
    var facts = Array.isArray(art.facts) ? art.facts : [];
    var primaryAction = art.primaryAction;

    function handleForget(fact, idx) {
      _emitArtifactAction('memory_recall_card', 'forget', art, { factIndex: idx, fact: fact });
    }

    return (
      <div style={{
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(155,138,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        border: '0.5px solid rgba(155,138,255,0.18)',
        padding: '14px 16px',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 12,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="rgba(155,138,255,0.75)" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2a3 3 0 0 0-3 3v2a3 3 0 0 0-3 3v0a3 3 0 0 0 0 6v2a3 3 0 0 0 3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0 3-3v-2a3 3 0 0 0 0-6v0a3 3 0 0 0-3-3V5a3 3 0 0 0-3-3z"/>
          </svg>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: 'rgba(155,138,255,0.85)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>{title}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {facts.map(function(fact, i) {
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 9,
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.02)',
                border: '0.5px solid rgba(255,255,255,0.05)',
                borderRadius: 10,
              }}>
                <span style={{
                  color: 'rgba(155,138,255,0.5)',
                  flexShrink: 0, marginTop: 1,
                  fontSize: 11,
                }} aria-hidden="true">•</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, lineHeight: 1.5,
                    color: 'var(--ink-1)',
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                  }}>{fact.text}</div>
                  {fact.source && (
                    <div style={{
                      marginTop: 3,
                      fontSize: 10.5,
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                      fontStyle: 'italic',
                    }}>{fact.source}</div>
                  )}
                </div>
                {fact.editable !== false && (
                  <button
                    type="button"
                    onClick={function() { handleForget(fact, i); }}
                    className="mtx-tap"
                    aria-label="Olvidar este hecho"
                    style={{
                      appearance: 'none', cursor: 'pointer',
                      padding: 4, borderRadius: 6,
                      background: 'transparent', border: 0,
                      color: 'rgba(255,255,255,0.30)',
                      display: 'inline-flex', alignItems: 'center',
                      flexShrink: 0, marginTop: -2,
                      transition: 'color .15s',
                    }}
                    onMouseEnter={function(e) { e.currentTarget.style.color = 'rgba(255,139,139,0.75)'; }}
                    onMouseLeave={function(e) { e.currentTarget.style.color = 'rgba(255,255,255,0.30)'; }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {primaryAction && (
          <button
            type="button"
            onClick={function() { _emitArtifactAction('memory_recall_card', primaryAction.value, art); }}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              marginTop: 12, width: '100%',
              padding: '8px 14px', borderRadius: 999,
              background: 'rgba(155,138,255,0.08)',
              border: '0.5px solid rgba(155,138,255,0.25)',
              color: 'rgba(155,138,255,0.95)',
              fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
            }}>{primaryAction.label}</button>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 18. IAArtifactTimelineMini — eventos en tiempo lineal (RFC §5.2 #19)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   {
  //     kind: 'timeline_mini',
  //     title?: 'Tu mes en una línea',
  //     events: [{ label: '1 mar', text: 'Empezaste reto', accent?: '#3dffd1' }]
  //   }
  function IAArtifactTimelineMini(props) {
    var art = props.artifact || {};
    var title = art.title;
    var events = Array.isArray(art.events) ? art.events : [];
    if (events.length === 0) return null;
    return (
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        padding: '14px 16px',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {title && (
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: 'var(--ink-2)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            marginBottom: 16,
          }}>{title}</div>
        )}
        <div style={{ position: 'relative', paddingLeft: 18 }}>
          <div style={{
            position: 'absolute', left: 5, top: 6, bottom: 6,
            width: '0.5px',
            background: 'rgba(255,255,255,0.10)',
          }} aria-hidden="true"/>
          {events.map(function(ev, i) {
            var accent = ev.accent || 'var(--neon)';
            return (
              <div key={i} style={{
                position: 'relative',
                paddingBottom: i < events.length - 1 ? 14 : 0,
              }}>
                <div style={{
                  position: 'absolute', left: -18, top: 3,
                  width: 11, height: 11, borderRadius: '50%',
                  background: accent,
                  border: '2px solid rgba(10,13,12,1)',
                  boxShadow: '0 0 6px ' + accent + '60',
                }} aria-hidden="true"/>
                <div style={{
                  fontSize: 10.5, fontWeight: 700,
                  color: accent,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--ff-sans)',
                  marginBottom: 2,
                }}>{ev.label}</div>
                <div style={{
                  fontSize: 12.5, lineHeight: 1.45,
                  color: 'var(--ink-1)',
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                }}>{ev.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 19. IAArtifactCalendarMini — vista semana con dots (RFC §5.2 #12)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   {
  //     kind: 'calendar_mini',
  //     title?: 'Tu semana en eventos',
  //     weekStart?: Date or ISO,    // default: lunes de esta semana
  //     days: [{ label: 'Lun', dotsCount: 3, accent?: '#3dffd1', highlighted?: true }],
  //     onOpen?: 'open_agenda'      // value para dispatchear si el user tap el calendario
  //   }
  function IAArtifactCalendarMini(props) {
    var art = props.artifact || {};
    var title = art.title;
    var days = Array.isArray(art.days) ? art.days : [];
    var onOpenValue = art.onOpen || 'open_agenda';

    function handleOpen() {
      _emitArtifactAction('calendar_mini', onOpenValue, art);
    }

    return (
      <button
        type="button"
        onClick={handleOpen}
        className="mtx-tap"
        aria-label="Abrir Agenda"
        style={{
          appearance: 'none', cursor: 'pointer',
          width: '100%',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.025)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          padding: '14px 16px',
          textAlign: 'left',
          color: 'inherit',
          animation: 'mtx-fade-up .35s ease both',
          transition: 'background .15s',
        }}
        onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,0.045)'; }}
        onMouseLeave={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}>
        {title && (
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: 'var(--ink-2)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            marginBottom: 14,
          }}>{title}</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
          {days.map(function(day, i) {
            var accent = day.accent || 'var(--neon)';
            var dotCount = Math.min(5, Math.max(0, day.dotsCount || 0));
            var dotArr = [];
            for (var di = 0; di < dotCount; di++) dotArr.push(di);
            return (
              <div key={i} style={{
                flex: 1, minWidth: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '8px 4px',
                borderRadius: 8,
                background: day.highlighted ? accent + '10' : 'transparent',
                border: day.highlighted ? '0.5px solid ' + accent + '30' : '0.5px solid transparent',
              }}>
                <div style={{
                  fontSize: 9.5, fontWeight: 700,
                  color: day.highlighted ? accent : 'var(--ink-3)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--ff-sans)',
                }}>{day.label}</div>
                <div style={{
                  display: 'flex', gap: 2, justifyContent: 'center',
                  minHeight: 6,
                }}>
                  {dotCount > 0 ? dotArr.map(function(di) {
                    return (
                      <div key={di} style={{
                        width: 3, height: 3, borderRadius: '50%',
                        background: accent,
                      }}/>
                    );
                  }) : (
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }}/>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </button>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 20. IAArtifactErrorGentle — error suave con retry (RFC §5.2 #15)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   {
  //     kind: 'error_gentle',
  //     message: 'No pude conectarme en este momento.',
  //     hint?: 'A veces la red falla. Intentamos de nuevo.',
  //     primaryAction?: { label: 'Intentar de nuevo', value: 'retry' },
  //     secondaryAction?: { label: 'Déjalo así', value: 'dismiss' }
  //   }
  function IAArtifactErrorGentle(props) {
    var art = props.artifact || {};
    var message = art.message || 'Algo no salió bien.';
    var hint = art.hint;
    var primaryAction = art.primaryAction;
    var secondaryAction = art.secondaryAction;

    return (
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,139,139,0.04)',
        border: '0.5px solid rgba(255,139,139,0.22)',
        padding: '14px 16px',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 11,
          marginBottom: (primaryAction || secondaryAction) ? 12 : 0,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'rgba(255,139,139,0.10)',
            border: '0.5px solid rgba(255,139,139,0.30)',
            color: '#ff8b8b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 1,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: 'var(--ink-1)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              lineHeight: 1.4,
            }}>{message}</div>
            {hint && (
              <div style={{
                marginTop: 4,
                fontSize: 11.5, lineHeight: 1.5,
                color: 'var(--ink-3)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>{hint}</div>
            )}
          </div>
        </div>
        {(primaryAction || secondaryAction) && (
          <div style={{ display: 'flex', gap: 8 }}>
            {secondaryAction && (
              <button type="button"
                onClick={function() { _emitArtifactAction('error_gentle', secondaryAction.value, art); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  flex: 1, padding: '7px 14px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  color: 'var(--ink-2)',
                  fontSize: 11.5, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                }}>{secondaryAction.label}</button>
            )}
            {primaryAction && (
              <button type="button"
                onClick={function() { _emitArtifactAction('error_gentle', primaryAction.value, art); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  flex: 2, padding: '7px 14px', borderRadius: 999,
                  background: 'rgba(255,139,139,0.10)',
                  border: '0.5px solid rgba(255,139,139,0.35)',
                  color: '#ff8b8b',
                  fontSize: 11.5, fontWeight: 700,
                  fontFamily: 'var(--ff-sans)',
                }}>{primaryAction.label}</button>
            )}
          </div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 21. IAArtifactLoadingSkeleton — placeholder mientras carga (RFC §5.2 #16)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape: { kind: 'loading_skeleton', height?: 80, lines?: 3 }
  function IAArtifactLoadingSkeleton(props) {
    var art = props.artifact || {};
    var lines = art.lines || 3;
    var arr = [];
    for (var i = 0; i < lines; i++) arr.push(i);
    return (
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '0.5px solid rgba(255,255,255,0.04)',
        padding: 16,
        display: 'flex', flexDirection: 'column', gap: 8,
        animation: 'mtx-fade-up .25s ease both',
      }} aria-busy="true" aria-label="Cargando">
        {arr.map(function(i) {
          var w = i === arr.length - 1 ? '60%' : (75 + Math.random() * 25) + '%';
          return (
            <div key={i} style={{
              width: w, height: 12,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              animation: 'mtx-skeleton-pulse 1.4s ease-in-out infinite',
              animationDelay: (i * 0.12) + 's',
            }}/>
          );
        })}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 22. IAArtifactMapMini — placeholder de mapa con markers (RFC §5.2 #13)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   {
  //     kind: 'map_mini',
  //     title?: '3 lugares cerca',
  //     places: [{ name: 'Casa del Yoga', distance: '20 min en bici' }],
  //     primaryAction?: { label: 'Abrir en Maps', value: 'open_maps' }
  //   }
  function IAArtifactMapMini(props) {
    var art = props.artifact || {};
    var title = art.title;
    var places = Array.isArray(art.places) ? art.places : [];
    var primaryAction = art.primaryAction;

    return (
      <div style={{
        borderRadius: 14, overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {/* Map placeholder con gradiente + markers */}
        <div style={{
          height: 110, position: 'relative',
          background: 'linear-gradient(180deg, rgba(61,255,209,0.06) 0%, rgba(155,138,255,0.04) 70%, rgba(0,0,0,0.20) 100%), radial-gradient(circle at 30% 40%, rgba(61,255,209,0.10), transparent 50%), radial-gradient(circle at 70% 60%, rgba(155,138,255,0.10), transparent 50%)',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }} role="img" aria-label="Mapa con ubicaciones">
          {/* Grid lines decorativas */}
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.08 }} aria-hidden="true">
            <defs>
              <pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#map-grid)"/>
          </svg>
          {/* Markers */}
          {places.slice(0, 3).map(function(p, i) {
            var positions = [{ left: '30%', top: '40%' }, { left: '60%', top: '55%' }, { left: '45%', top: '70%' }];
            var pos = positions[i];
            return (
              <div key={i} style={{
                position: 'absolute', left: pos.left, top: pos.top,
                transform: 'translate(-50%, -100%)',
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50% 50% 50% 0',
                  transform: 'rotate(-45deg)',
                  background: i === 0 ? 'var(--neon)' : '#9b8aff',
                  boxShadow: '0 0 8px ' + (i === 0 ? 'rgba(61,255,209,0.6)' : 'rgba(155,138,255,0.5)'),
                  border: '0.5px solid rgba(0,0,0,0.4)',
                }}/>
              </div>
            );
          })}
        </div>
        {/* Places list */}
        <div style={{ padding: '10px 14px' }}>
          {title && (
            <div style={{
              fontSize: 11, fontWeight: 700,
              color: 'var(--ink-3)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'var(--ff-sans)',
              marginBottom: 8,
            }}>{title}</div>
          )}
          {places.map(function(p, i) {
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 0',
                borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: i === 0 ? 'var(--neon)' : '#9b8aff',
                  flexShrink: 0,
                }}/>
                <div style={{
                  flex: 1, minWidth: 0,
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
                }}>
                  <span style={{
                    fontSize: 12.5, fontWeight: 500,
                    color: 'var(--ink-1)',
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{p.name}</span>
                  {p.distance && (
                    <span style={{
                      fontSize: 11,
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                      flexShrink: 0,
                    }}>{p.distance}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {primaryAction && (
          <button type="button"
            onClick={function() { _emitArtifactAction('map_mini', primaryAction.value, art); }}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              width: '100%', padding: '10px 14px',
              borderTop: '0.5px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
              border: 0,
              color: 'var(--neon)',
              fontSize: 11.5, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.005em',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
            {primaryAction.label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="7" y1="17" x2="17" y2="7"/>
              <polyline points="7 7 17 7 17 17"/>
            </svg>
          </button>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 23. IAArtifactImageInline — imagen generada (RFC §5.2 #6 · refinada)
  // ═══════════════════════════════════════════════════════════════════════════
  // Versión mejorada del legacy 'image'. Aspect 1:1 o 4:5 con loading state,
  // tap to fullscreen, caption opcional, prompt visible si available.
  //
  // Shape:
  //   {
  //     kind: 'image_inline',
  //     src?: 'https://...',           // URL real
  //     gradient?: 'linear-gradient(...)',  // placeholder generative-style
  //     aspect?: 1 | 0.8 | 1.33,       // 1=square, 0.8=4:5, 1.33=4:3
  //     prompt?: 'Visualización para...',
  //     caption?: '...'
  //   }
  function IAArtifactImageInline(props) {
    var art = props.artifact || {};
    var src = art.src;
    var gradient = art.gradient || 'linear-gradient(135deg, rgba(61,255,209,0.30), rgba(155,138,255,0.20), rgba(255,200,80,0.18))';
    var aspect = art.aspect || 1;
    var prompt = art.prompt;
    var caption = art.caption;
    var alt = art.alt || prompt || caption || 'Imagen generada';

    var loadedState = React.useState(false);
    var loaded = loadedState[0];
    var setLoaded = loadedState[1];

    function fullscreen() {
      _emitArtifactAction('image_inline', 'fullscreen', art, { src: src });
    }

    return (
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        <button
          type="button"
          onClick={src ? fullscreen : undefined}
          className={src ? 'mtx-tap' : ''}
          aria-label={src ? 'Ampliar imagen' : 'Imagen generada'}
          style={{
            appearance: 'none', cursor: src ? 'pointer' : 'default',
            display: 'block', width: '100%',
            padding: 0, border: 0,
            background: src && !loaded ? '#000' : gradient,
            aspectRatio: String(aspect),
            position: 'relative',
            overflow: 'hidden',
          }}>
          {src && (
            <img src={src} alt={alt}
              onLoad={function() { setLoaded(true); }}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                display: 'block',
                opacity: loaded ? 1 : 0,
                transition: 'opacity .4s ease',
              }}/>
          )}
          {/* Sparkle badge */}
          <div style={{
            position: 'absolute', top: 10, right: 10,
            padding: '3px 8px', borderRadius: 999,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            fontSize: 9, color: 'rgba(255,255,255,0.9)',
            letterSpacing: '0.08em', fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ color: 'var(--neon)' }}>✦</span>
            GENERADA
          </div>
        </button>
        {(prompt || caption) && (
          <div style={{
            padding: '10px 14px',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            borderTop: '0.5px solid rgba(255,255,255,0.06)',
          }}>
            {caption && (
              <div style={{
                fontSize: 12, color: 'var(--ink-2)',
                lineHeight: 1.4,
              }}>{caption}</div>
            )}
            {prompt && (
              <div style={{
                marginTop: caption ? 4 : 0,
                fontSize: 10.5, color: 'var(--ink-3)',
                lineHeight: 1.4,
                fontStyle: 'italic',
                opacity: 0.7,
              }}>{prompt}</div>
            )}
          </div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 24. IAArtifactVideoInline — preview de video (RFC §5.2 #7 · placeholder)
  // ═══════════════════════════════════════════════════════════════════════════
  // Hoy es preview rico (no player real). Sprint año-1+ con video_generate
  // construirá el player completo.
  //
  // Shape:
  //   {
  //     kind: 'video_inline',
  //     thumbnail?: 'https://...',
  //     gradient?: '...',
  //     duration?: '0:45',
  //     title?: 'Tu Year in Mentex'
  //   }
  function IAArtifactVideoInline(props) {
    var art = props.artifact || {};
    var thumbnail = art.thumbnail;
    var gradient = art.gradient || 'linear-gradient(135deg, rgba(155,138,255,0.30), rgba(61,255,209,0.15), rgba(255,200,80,0.10))';
    var duration = art.duration || '—:—';
    var title = art.title;

    function play() {
      _emitArtifactAction('video_inline', 'play', art);
    }

    return (
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.08)',
        background: '#000',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        <button type="button"
          onClick={play}
          className="mtx-tap"
          aria-label={'Reproducir video: ' + (title || '')}
          style={{
            appearance: 'none', cursor: 'pointer',
            display: 'block', width: '100%',
            padding: 0, border: 0,
            background: thumbnail ? '#000' : gradient,
            backgroundImage: thumbnail ? 'url(' + thumbnail + ')' : undefined,
            backgroundSize: 'cover', backgroundPosition: 'center',
            aspectRatio: '16 / 9',
            position: 'relative',
          }}>
          {/* Play button overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.45) 100%)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,255,255,0.95)',
              boxShadow: '0 6px 20px -4px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform .15s',
            }}>
              <svg width="18" height="18" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3.5 2 L9.5 6 L3.5 10 Z" fill="#0a1410"/>
              </svg>
            </div>
          </div>
          {/* Duration badge */}
          <div style={{
            position: 'absolute', bottom: 10, right: 10,
            padding: '3px 7px', borderRadius: 4,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            fontSize: 10, fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}>{duration}</div>
          {/* Title overlay */}
          {title && (
            <div style={{
              position: 'absolute', left: 12, bottom: 10, right: 60,
              fontSize: 13, fontWeight: 600,
              color: 'white',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              textShadow: '0 1px 4px rgba(0,0,0,0.6)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{title}</div>
          )}
        </button>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 25. IAArtifactMermaidDiagram — mermaid.js diagram (RFC §5.2 #5)
  // ═══════════════════════════════════════════════════════════════════════════
  // Requiere mermaid.js cargado vía CDN en Mentex Home.html. Render on-mount
  // con mermaid.run() sobre el code text. Dark theme para encajar con Obsidian.
  //
  // Shape:
  //   {
  //     kind: 'mermaid_diagram',
  //     title?: 'Tus patrones de la semana',
  //     code: 'graph TD\n  A[Lun] --> B[Mar]...',
  //     caption?: '...'
  //   }
  function IAArtifactMermaidDiagram(props) {
    var art = props.artifact || {};
    var title = art.title;
    var code = art.code || '';
    var caption = art.caption;

    var containerRef = React.useRef(null);
    var idRef = React.useRef('mermaid-' + Math.random().toString(36).slice(2, 9));
    var renderedState = React.useState(false);
    var rendered = renderedState[0];
    var setRendered = renderedState[1];
    var errorState = React.useState(null);
    var error = errorState[0];
    var setError = errorState[1];

    React.useEffect(function() {
      if (!containerRef.current || rendered) return;
      if (typeof window.mermaid === 'undefined') {
        setError('Mermaid no está cargado.');
        return;
      }
      // Cleanup flag: si el component unmount o code cambia, no escribimos.
      var alive = true;
      try {
        if (!window.__mtxMermaidInited) {
          window.mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
              primaryColor: '#3dffd1',
              primaryTextColor: '#ffffff',
              primaryBorderColor: '#3dffd1',
              lineColor: 'rgba(255,255,255,0.4)',
              secondaryColor: '#9b8aff',
              tertiaryColor: '#ffc850',
              background: 'transparent',
              fontFamily: 'var(--ff-sans, system-ui, sans-serif)',
              fontSize: '12px',
            },
            securityLevel: 'loose',
            fontFamily: 'var(--ff-sans, system-ui, sans-serif)',
          });
          window.__mtxMermaidInited = true;
        }
        // Mermaid v10 puede dejar nodos temporales en <body> por su detector
        // de ancho. Si el id ya existe, eliminarlo para evitar colisión silenciosa.
        var existingNode = document.getElementById(idRef.current + '-svg');
        if (existingNode && existingNode.parentNode) {
          existingNode.parentNode.removeChild(existingNode);
        }
        window.mermaid.render(idRef.current + '-svg', code).then(function(result) {
          if (!alive || !containerRef.current) return;
          // Defensive: container debe estar limpio antes del innerHTML
          containerRef.current.innerHTML = result.svg;
          setRendered(true);
        }).catch(function(err) {
          if (!alive) return;
          console.warn('[mermaid] render error', err);
          setError('No pude dibujar el diagrama.');
        });
      } catch (e) {
        console.warn('[mermaid] init error', e);
        if (alive) setError('Error al cargar el diagrama.');
      }
      // Cleanup en unmount
      return function() {
        alive = false;
        // Remove any stray mermaid nodes that may have leaked to <body>
        var stray = document.getElementById(idRef.current + '-svg');
        if (stray && stray.parentNode) {
          try { stray.parentNode.removeChild(stray); } catch (_) {}
        }
      };
    }, [code]);

    return (
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        padding: '14px 16px',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {title && (
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: 'var(--ink-2)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            marginBottom: 10,
          }}>{title}</div>
        )}
        {/* Wrapper React-managed con placeholder/error como SIBLINGS del container
            SVG. El container SVG es leaf-only (sin children React) — esto evita
            el crash clásico: si dejábamos {Dibujando} como child y luego hacíamos
            container.innerHTML = svg, React quedaba con virtual DOM inconsistente
            y al re-render lanzaba NotFoundError → pantalla negra.
            FIX B5-bonus (post-feedback Diego): SVG container es leaf-only. */}
        <div
          style={{
            position: 'relative',
            minHeight: rendered ? 'auto' : 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'auto', maxWidth: '100%',
          }}>
          {!rendered && !error && (
            <div style={{
              fontSize: 11, color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              opacity: 0.6,
            }}>Dibujando…</div>
          )}
          {error && (
            <div style={{
              fontSize: 11.5, color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              fontStyle: 'italic',
            }}>{error}</div>
          )}
          {/* SVG-only container — siempre presente, leaf-only para mermaid */}
          <div ref={containerRef}
            style={{
              width: '100%',
              display: rendered ? 'flex' : 'none',
              alignItems: 'center', justifyContent: 'center',
            }}
            aria-label={title || 'Diagrama'}
            // suppressHydrationWarning previene avisos cuando innerHTML mutate
            suppressHydrationWarning={true}
          />
        </div>
        {caption && (
          <div style={{
            marginTop: 10, paddingTop: 10,
            borderTop: '0.5px solid rgba(255,255,255,0.06)',
            fontSize: 11.5, lineHeight: 1.5,
            color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
          }}>{caption}</div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // ╔═════════════════════════════════════════════════════════════════════════╗
  // ║  RFC-001 ADDENDUM A · SPRINT A.5 — 7 ARTIFACTS ESPECIALIZADOS           ║
  // ║  source_list · article_summary · thinking_panel                          ║
  // ║  integration_action_card · browse_progress_card                          ║
  // ║  voice_call_overlay · screen_share_preview                               ║
  // ║                                                                          ║
  // ║  Estos artifacts cubren los flows de Fase C/D del RFC. UI completa      ║
  // ║  mockeada — cuando llegue backend, solo cambia el origen del data.       ║
  // ╚═════════════════════════════════════════════════════════════════════════╝


  // ═══════════════════════════════════════════════════════════════════════════
  // A.5.1 / B1 (Sprint A.6) — IAArtifactSourceList
  // ═══════════════════════════════════════════════════════════════════════════
  // Diferenciador legendario vs ChatGPT/Claude:
  //   • SCOPE WELLNESS — banner sutil que indica filtrado curado
  //   • Source dorada cuando matchea con memoria del user
  //   • memoryConnection section debajo del listado
  //   • Empty state amigable si query no matchea catálogo
  //
  // Shape:
  //   {
  //     kind: 'source_list',
  //     query?: 'cómo dormir mejor',
  //     topicLabel?: 'Sueño',
  //     scopeNote?: 'mensaje cuando no hay sources curadas',
  //     sources: [{
  //       title, snippet, url, domain?, favicon?, accent?, author?
  //     }],
  //     memoryConnection?: {
  //       memoryLabel, memoryAge, relevantSourceIdx, summary
  //     }
  //   }
  function IAArtifactSourceList(props) {
    var art = props.artifact || {};
    var query = art.query;
    var topicLabel = art.topicLabel;
    var scopeNote = art.scopeNote;
    var sources = Array.isArray(art.sources) ? art.sources : [];
    var memoryConnection = art.memoryConnection;
    var connectedIdx = memoryConnection ? memoryConnection.relevantSourceIdx : -1;

    function handleOpen(source) {
      _emitArtifactAction('source_list', 'open_source', art, { source: source });
    }
    function handleSummarizeTop() {
      // Toma la source destacada (memory match) o la primera; dispara web_fetch
      // sobre ella para resumirla con memoryConnection del artículo.
      var topSource = sources[connectedIdx >= 0 ? connectedIdx : 0];
      if (!topSource) return;
      _emitArtifactAction('source_list', 'summarize_top', art, { source: topSource });
    }

    // Empty state amigable cuando scope wellness no matchea
    if (sources.length === 0) {
      return (
        <div style={{
          borderRadius: 14,
          background: 'rgba(255,255,255,0.025)',
          border: '0.5px dashed rgba(255,255,255,0.12)',
          padding: '14px 16px',
          animation: 'mtx-fade-up .35s ease both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 8,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.4)" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: 'var(--ink-3)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'var(--ff-sans)',
            }}>Sin fuentes curadas</span>
          </div>
          {query && (
            <div style={{
              fontSize: 12.5,
              color: 'var(--ink-2)',
              fontFamily: 'var(--ff-sans)',
              fontStyle: 'italic',
              marginBottom: 8,
            }}>"{query}"</div>
          )}
          {scopeNote && (
            <div style={{
              fontSize: 12, lineHeight: 1.5,
              color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>{scopeNote}</div>
          )}
        </div>
      );
    }

    return (
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        animation: 'mtx-fade-up .35s ease both',
        overflow: 'hidden',
      }}>
        {/* Header: query + count + scope chip */}
        {query && (
          <div style={{
            padding: '11px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(135deg, rgba(61,255,209,0.04) 0%, transparent 100%)',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="var(--neon)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span style={{
              fontSize: 11.5, fontWeight: 600,
              color: 'var(--ink-2)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              flex: 1, minWidth: 0,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              fontStyle: 'italic',
            }}>"{query}"</span>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.05em',
              fontVariantNumeric: 'tabular-nums',
            }}>{sources.length}</span>
          </div>
        )}

        {/* Scope wellness chip — diferenciador */}
        <div style={{
          padding: '8px 14px',
          background: 'rgba(61,255,209,0.04)',
          borderBottom: '0.5px solid rgba(61,255,209,0.12)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="var(--neon)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span style={{
            fontSize: 10.5, fontWeight: 700,
            color: 'rgba(61,255,209,0.85)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontFamily: 'var(--ff-sans)',
          }}>Filtrado para tu bienestar</span>
          {topicLabel && (
            <span style={{
              marginLeft: 'auto',
              fontSize: 10, fontWeight: 600,
              color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.02em',
            }}>· {topicLabel}</span>
          )}
        </div>

        {/* Sources list */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sources.map(function(s, i) {
            var accent = s.accent || 'var(--neon)';
            var isConnected = i === connectedIdx;
            return (
              <button key={i}
                type="button"
                onClick={function() { handleOpen(s); }}
                onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen(s); } }}
                className="mtx-tap"
                aria-label={'Abrir: ' + s.title}
                style={{
                  appearance: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: isConnected ? '12px 14px' : '11px 14px',
                  background: isConnected ? accent + '0a' : 'transparent',
                  border: 0,
                  borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
                  borderLeft: isConnected ? '2px solid ' + accent : '2px solid transparent',
                  color: 'inherit', textAlign: 'left',
                  transition: 'background .15s, border-color .15s',
                  position: 'relative',
                }}
                onMouseEnter={function(e) { if (!isConnected) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                onMouseLeave={function(e) { if (!isConnected) e.currentTarget.style.background = 'transparent'; }}>
                {/* Star prefix for connected source — vs bullet/favicon */}
                {isConnected && (
                  <div style={{
                    position: 'absolute',
                    top: 12, right: 10,
                    fontSize: 11, fontWeight: 700,
                    color: accent,
                    letterSpacing: '0.05em',
                  }}>★</div>
                )}
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  flexShrink: 0,
                  background: accent + '18',
                  border: '0.5px solid ' + accent + (isConnected ? '50' : '30'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                  marginTop: 1,
                  boxShadow: isConnected ? '0 0 10px ' + accent + '25' : 'none',
                  transition: 'box-shadow .25s',
                }} aria-hidden="true">{s.favicon || '🌐'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: isConnected ? 700 : 600,
                    color: 'var(--ink-1)',
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                    lineHeight: 1.35,
                    paddingRight: isConnected ? 18 : 0,
                  }}>{s.title}</div>
                  {s.snippet && (
                    <div style={{
                      marginTop: 3,
                      fontSize: 11.5, lineHeight: 1.45,
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2,
                      overflow: 'hidden',
                    }}>{s.snippet}</div>
                  )}
                  <div style={{
                    marginTop: 5,
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 10.5,
                    fontFamily: 'var(--ff-sans)',
                  }}>
                    {s.domain && (
                      <span style={{
                        color: accent,
                        letterSpacing: '0.005em',
                        fontWeight: 600,
                      }}>{s.domain}</span>
                    )}
                    {s.author && (
                      <>
                        <span style={{ color: 'var(--ink-3)', opacity: 0.45 }}>·</span>
                        <span style={{
                          color: 'var(--ink-3)',
                          fontStyle: 'italic',
                        }}>{s.author}</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Memory connection — debajo del listado, el diferenciador real */}
        {memoryConnection && (
          <div style={{
            padding: '11px 14px',
            background: 'linear-gradient(135deg, rgba(155,138,255,0.08) 0%, transparent 100%)',
            borderTop: '0.5px solid rgba(155,138,255,0.25)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              flexShrink: 0,
              background: 'rgba(155,138,255,0.20)',
              border: '0.5px solid rgba(155,138,255,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="rgba(155,138,255,0.95)" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v15A2.5 2.5 0 0 0 9.5 22h5a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 14.5 2z"/>
                <line x1="7" y1="9" x2="17" y2="9"/>
                <line x1="7" y1="14" x2="17" y2="14"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: 'rgba(155,138,255,0.85)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: 'var(--ff-sans)',
                marginBottom: 3,
              }}>Desde tu memoria</div>
              <div style={{
                fontSize: 12, lineHeight: 1.5,
                color: 'var(--ink-1)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>{memoryConnection.summary}</div>
            </div>
          </div>
        )}

        {/* Action row: Resumir la mejor source */}
        <div style={{
          padding: '9px 14px',
          borderTop: '0.5px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.12)',
        }}>
          <button type="button"
            onClick={handleSummarizeTop}
            className="mtx-tap"
            aria-label="Resumir la mejor fuente"
            style={{
              appearance: 'none', cursor: 'pointer',
              width: '100%',
              padding: '7px 14px', borderRadius: 999,
              background: 'rgba(155,138,255,0.15)',
              border: '0.5px solid rgba(155,138,255,0.38)',
              color: 'rgba(220,210,255,0.95)',
              fontSize: 11.5, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            {connectedIdx >= 0 ? 'Resumir la que te aplica' : 'Resumir la mejor'}
          </button>
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // A.5.2 / B2 (Sprint A.6) — IAArtifactArticleSummary
  // ═══════════════════════════════════════════════════════════════════════════
  // Resumen de artículo web_fetch. Diferenciador clave vs ChatGPT/Claude:
  // sección "memoryConnection" que cita una memoria persistida del user y la
  // enlaza al highlight más relevante del artículo. Eso convierte el resumen
  // en acción personalizada (no info genérica).
  //
  // Shape:
  //   {
  //     kind: 'article_summary',
  //     title: '...',
  //     author?: 'Andrew Huberman',
  //     readingTime?: '12 min',
  //     publishedAt?: 'Mar 2026',
  //     highlights: ['...', '...'],
  //     originalUrl: 'https://...',
  //     domain?: 'hubermanlab.com',
  //     favicon?: '🧠',
  //     accent?: '#3dffd1',
  //     memoryConnection?: {            // B2: la conexión que diferencia
  //       memoryLabel: 'Mi meta dormir 7h consistente',
  //       memoryAge: 'hace 2 semanas',
  //       memoryType: 'goal',
  //       relevantHighlightIdx: 2,
  //       summary: 'Te recuerdo que mencionaste...'
  //     }
  //   }
  function IAArtifactArticleSummary(props) {
    var art = props.artifact || {};
    var title = art.title || 'Artículo';
    var author = art.author;
    var readingTime = art.readingTime;
    var publishedAt = art.publishedAt;
    var highlights = Array.isArray(art.highlights) ? art.highlights : [];
    var url = art.originalUrl;
    var domain = art.domain;
    var favicon = art.favicon;
    var accent = art.accent || '#9b8aff';
    var memoryConnection = art.memoryConnection;

    function handleOpen() {
      _emitArtifactAction('article_summary', 'open_original', art, { url: url });
    }
    function handleSave() {
      _emitArtifactAction('article_summary', 'save_library', art);
    }
    function handleApply() {
      _emitArtifactAction('article_summary', 'apply_to_plan', art);
    }

    var connectedIdx = memoryConnection ? memoryConnection.relevantHighlightIdx : -1;

    return (
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        padding: '0',
        animation: 'mtx-fade-up .35s ease both',
        overflow: 'hidden',
      }}>
        {/* Header: favicon + domain badge + reading time */}
        <div style={{
          padding: '12px 16px 0',
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 10,
        }}>
          {favicon && (
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              flexShrink: 0,
              background: accent + '18',
              border: '0.5px solid ' + accent + '30',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }} aria-hidden="true">{favicon}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {domain && (
              <div style={{
                fontSize: 10.5, fontWeight: 700,
                color: accent,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontFamily: 'var(--ff-sans)',
              }}>{domain}</div>
            )}
            <div style={{
              marginTop: 1,
              display: 'flex', gap: 6, alignItems: 'center',
              fontSize: 10.5,
              color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.01em',
            }}>
              {readingTime && <span>📖 {readingTime} lectura</span>}
              {publishedAt && <><span style={{ opacity: 0.5 }}>·</span><span>{publishedAt}</span></>}
            </div>
          </div>
        </div>

        {/* Title + author */}
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{
            fontSize: 15, fontWeight: 700,
            color: 'var(--ink-1)',
            fontFamily: 'Georgia, "New York", serif',
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
            marginBottom: author ? 4 : 0,
          }}>{title}</div>
          {author && (
            <div style={{
              fontSize: 12,
              color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              fontStyle: 'italic',
            }}>por {author}</div>
          )}
        </div>

        {/* Highlights — el highlight conectado a memoria queda destacado */}
        {highlights.length > 0 && (
          <div style={{
            padding: '12px 16px 14px',
            borderTop: '0.5px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: accent,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: 'var(--ff-sans)',
              marginBottom: 10,
            }}>Lo más relevante</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {highlights.map(function(h, i) {
                var isConnected = i === connectedIdx;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: isConnected ? '8px 10px' : '0',
                    borderRadius: isConnected ? 10 : 0,
                    background: isConnected ? accent + '0d' : 'transparent',
                    border: isConnected ? '0.5px solid ' + accent + '35' : 'none',
                    boxShadow: isConnected ? '0 0 12px ' + accent + '14' : 'none',
                    transition: 'background .25s, border-color .25s',
                  }}>
                    <span style={{
                      color: accent,
                      flexShrink: 0, paddingTop: isConnected ? 3 : 1,
                      fontSize: isConnected ? 13 : 11,
                      fontWeight: 700,
                    }} aria-hidden="true">{isConnected ? '★' : '▸'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12.5, lineHeight: 1.55,
                        color: isConnected ? 'var(--ink-1)' : 'var(--ink-2)',
                        fontFamily: 'var(--ff-sans)',
                        letterSpacing: '-0.005em',
                        fontWeight: isConnected ? 500 : 400,
                      }}>{h}</div>
                      {isConnected && (
                        <div style={{
                          marginTop: 4,
                          fontSize: 10, fontWeight: 700,
                          color: accent,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}>Conecta contigo</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Memory connection — el diferenciador real */}
        {memoryConnection && (
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, ' + accent + '0a 0%, transparent 100%)',
            borderTop: '0.5px solid ' + accent + '25',
          }}>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              {/* Brain icon */}
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                flexShrink: 0,
                background: accent + '20',
                border: '0.5px solid ' + accent + '45',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke={accent} strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v15A2.5 2.5 0 0 0 9.5 22h5a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 14.5 2z"/>
                  <line x1="7" y1="9" x2="17" y2="9"/>
                  <line x1="7" y1="14" x2="17" y2="14"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  color: accent,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--ff-sans)',
                  marginBottom: 4,
                }}>Desde tu memoria</div>
                <div style={{
                  fontSize: 12.5, lineHeight: 1.5,
                  color: 'var(--ink-1)',
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                }}>{memoryConnection.summary}</div>
              </div>
            </div>
          </div>
        )}

        {/* Action row: Leer · Guardar · Aplicar */}
        <div style={{
          padding: '10px 14px',
          borderTop: '0.5px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.12)',
          display: 'flex', gap: 8,
        }}>
          {url && (
            <button type="button"
              onClick={handleOpen}
              className="mtx-tap"
              aria-label="Leer el artículo completo"
              style={{
                appearance: 'none', cursor: 'pointer',
                flex: 1,
                padding: '7px 10px', borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                color: 'var(--ink-2)',
                fontSize: 11.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
              Leer
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </button>
          )}
          <button type="button"
            onClick={handleSave}
            className="mtx-tap"
            aria-label="Guardar a biblioteca"
            style={{
              appearance: 'none', cursor: 'pointer',
              flex: 1,
              padding: '7px 10px', borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.10)',
              color: 'var(--ink-2)',
              fontSize: 11.5, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>Guardar</button>
          <button type="button"
            onClick={handleApply}
            className="mtx-tap"
            aria-label="Pídeme aplicarlo a tu plan"
            style={{
              appearance: 'none', cursor: 'pointer',
              flex: 1.2,
              padding: '7px 10px', borderRadius: 999,
              background: accent + '18',
              border: '0.5px solid ' + accent + '40',
              color: accent === '#ffffff' ? 'var(--ink-1)' : accent,
              fontSize: 11.5, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>Aplicarlo</button>
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // A.5.3 / B4 — IAArtifactThinkingPanel — razonamiento expandido
  // ═══════════════════════════════════════════════════════════════════════════
  // Refinado en Sprint A.6 (B4) con:
  //   • Estado 'thinking' (LIVE) — muestra "decantando" con thoughts apareciendo
  //     progresivamente. Se transiciona a 'done' cuando el coach termina.
  //   • Niveles de profundidad: 'shallow'(4s) | 'medium'(10s) | 'deep'(20s)
  //   • Animación de bullets aparecen uno por uno con stagger natural
  //   • Cuando termina (state==='done'), colapsa pero queda expandible
  //   • Mientras live: panel NO es colapsable (no perderse el think)
  //
  // Shape:
  //   {
  //     kind: 'thinking_panel',
  //     state?: 'thinking' | 'done',  // default 'done' por backward compat
  //     summary?: 'Tomé en cuenta tu sueño...',
  //     reasoning?: 'Punto 1: ...\n\nPunto 2: ...',   // texto completo final
  //     thoughts?: ['Conectando A con B', 'Buscando patrón en C', ...],  // live steps
  //     thoughtIndex?: number,  // cuántos thoughts mostrar ya (live, controlled)
  //     durationMs?: 8500,
  //     depth?: 'shallow' | 'medium' | 'deep'
  //   }
  function IAArtifactThinkingPanel(props) {
    var art = props.artifact || {};
    var state = art.state || 'done';
    var summary = art.summary;
    var reasoning = art.reasoning || '';
    var thoughts = Array.isArray(art.thoughts) ? art.thoughts : [];
    var thoughtIndex = typeof art.thoughtIndex === 'number'
      ? art.thoughtIndex
      : thoughts.length;
    var durationMs = art.durationMs;
    var depth = art.depth || 'medium';
    var isLive = state === 'thinking';

    var expandedState = React.useState(isLive); // live: auto-expandido. done: colapsado.
    var expanded = expandedState[0];
    var setExpanded = expandedState[1];

    // Cuando transicione de live a done, colapsar automáticamente
    var prevStateRef = React.useRef(state);
    React.useEffect(function() {
      if (prevStateRef.current === 'thinking' && state === 'done') {
        setExpanded(false);
      }
      prevStateRef.current = state;
    }, [state]);

    var depthColor = depth === 'deep' ? '#ffc850' : depth === 'shallow' ? '#9b8aff' : '#3dffd1';
    var depthLabel = depth === 'deep' ? 'Profundo' : depth === 'shallow' ? 'Rápido' : 'Reflexivo';

    // Live: panel se siente animado (background sutil pulse + border más visible)
    var liveBg = isLive
      ? 'linear-gradient(135deg, ' + depthColor + '08 0%, transparent 100%)'
      : 'rgba(255,255,255,0.02)';
    var liveBorder = isLive
      ? '0.5px solid ' + depthColor + '40'
      : '0.5px dashed rgba(255,255,255,0.12)';

    // Visible thoughts (live: controlled progressively, done: full or empty)
    var visibleThoughts = isLive ? thoughts.slice(0, thoughtIndex) : (expanded ? thoughts : []);

    return (
      <div style={{
        borderRadius: 12,
        background: liveBg,
        border: liveBorder,
        animation: isLive ? 'mtx-fade-up .35s ease both, mtx-think-breathe 3.5s ease-in-out infinite' : 'mtx-fade-up .35s ease both',
        overflow: 'hidden',
        transition: 'background .4s ease, border-color .4s ease',
      }}>
        <button type="button"
          onClick={function() { if (!isLive) setExpanded(function(v) { return !v; }); }}
          onKeyDown={function(e) { if (!isLive && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setExpanded(function(v) { return !v; }); } }}
          className="mtx-tap"
          aria-expanded={expanded}
          aria-label={isLive ? 'Pensando…' : (expanded ? 'Ocultar mi razonamiento' : 'Ver mi razonamiento')}
          disabled={isLive}
          style={{
            appearance: 'none', cursor: isLive ? 'default' : 'pointer',
            width: '100%',
            padding: '11px 14px',
            background: 'transparent', border: 0,
            color: 'inherit', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 9,
          }}>
          {/* Brain icon — pulsa cuando live */}
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: depthColor + '18',
            border: '0.5px solid ' + depthColor + (isLive ? '55' : '30'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            animation: isLive ? 'mtx-think-brain-pulse 1.8s ease-in-out infinite' : 'none',
            boxShadow: isLive ? '0 0 12px ' + depthColor + '40' : 'none',
            transition: 'box-shadow .4s ease',
          }} aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke={depthColor} strokeWidth="1.7"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v15A2.5 2.5 0 0 0 9.5 22h5a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 14.5 2z"/>
              <line x1="7" y1="9" x2="17" y2="9"/>
              <line x1="7" y1="14" x2="17" y2="14"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11.5, fontWeight: 600,
              color: 'var(--ink-2)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>{isLive ? 'Decantando…' : (summary || 'Cómo lo pensé')}</div>
            <div style={{
              marginTop: 2,
              display: 'flex', gap: 8, alignItems: 'center',
              fontSize: 10,
              color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
            }}>
              <span style={{
                color: depthColor, fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontSize: 9.5,
              }}>{depthLabel}</span>
              {durationMs && (
                <>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{(durationMs / 1000).toFixed(1)}s</span>
                </>
              )}
              {isLive && thoughts.length > 0 && (
                <>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{thoughtIndex} / {thoughts.length}</span>
                </>
              )}
            </div>
          </div>
          {!isLive && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.40)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform .2s',
                flexShrink: 0,
              }} aria-hidden="true">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          )}
          {isLive && (
            <div style={{
              display: 'inline-flex', gap: 3,
              alignItems: 'center',
              flexShrink: 0,
            }} aria-hidden="true">
              {[0, 1, 2].map(function(i) {
                return (
                  <div key={i} style={{
                    width: 4, height: 4, borderRadius: 999,
                    background: depthColor,
                    opacity: 0.7,
                    animation: 'mtx-think-dot ' + (1.4 + i * 0.15) + 's ease-in-out infinite',
                    animationDelay: (i * 0.15) + 's',
                  }}/>
                );
              })}
            </div>
          )}
        </button>

        {/* Live thoughts — aparecen progresivamente con stagger */}
        {isLive && visibleThoughts.length > 0 && (
          <div style={{
            padding: '0 14px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {visibleThoughts.map(function(thought, i) {
              var isLatest = i === visibleThoughts.length - 1;
              return (
                <div key={thought + '-' + i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.025)',
                  border: '0.5px solid rgba(255,255,255,0.05)',
                  borderRadius: 8,
                  animation: 'mtx-think-thought-in .35s cubic-bezier(0.16, 1, 0.3, 1) both',
                }}>
                  <div style={{
                    flexShrink: 0, marginTop: 5,
                    width: 5, height: 5, borderRadius: '50%',
                    background: isLatest ? depthColor : 'rgba(255,255,255,0.3)',
                    boxShadow: isLatest ? '0 0 6px ' + depthColor : 'none',
                    animation: isLatest ? 'mtx-vc-dot-pulse 1.2s ease-in-out infinite' : 'none',
                  }}/>
                  <div style={{
                    flex: 1, minWidth: 0,
                    fontSize: 12, lineHeight: 1.45,
                    color: isLatest ? 'var(--ink-1)' : 'var(--ink-2)',
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                    fontStyle: 'italic',
                    transition: 'color .3s',
                  }}>{thought}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Done: reasoning expanded */}
        {!isLive && expanded && reasoning && (
          <div style={{
            padding: '12px 14px 14px',
            borderTop: '0.5px solid rgba(255,255,255,0.05)',
            fontSize: 12.5, lineHeight: 1.6,
            color: 'var(--ink-2)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            whiteSpace: 'pre-wrap',
            animation: 'mtx-fade-up .2s ease both',
          }}>{reasoning}</div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // A.5.4 IAArtifactIntegrationActionCard — acción sobre integración (RFC §A1)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   {
  //     kind: 'integration_action_card',
  //     provider: 'notion' | 'spotify' | 'google_cal' | 'apple_cal' | 'slack' | 'linear',
  //     action: 'Creé nota en tu workspace' | 'Agregué a tu playlist Focus',
  //     status: 'pending' | 'success' | 'failed',
  //     preview?: {
  //       title?: 'Hábitos atómicos — apuntes',
  //       subtext?: 'En Mentex / Mis libros'
  //     },
  //     primaryAction?: { label: 'Abrir en Notion', value: 'open_external' }
  //   }
  var _PROVIDER_META = {
    notion: { name: 'Notion', emoji: '📝', accent: '#ffffff' },
    spotify: { name: 'Spotify', emoji: '🎵', accent: '#1db954' },
    google_cal: { name: 'Google Calendar', emoji: '📅', accent: '#4285f4' },
    apple_cal: { name: 'Apple Calendar', emoji: '📅', accent: '#ff3b30' },
    slack: { name: 'Slack', emoji: '💬', accent: '#4a154b' },
    linear: { name: 'Linear', emoji: '📋', accent: '#5e6ad2' },
    todoist: { name: 'Todoist', emoji: '✓', accent: '#e44332' },
    apple_health: { name: 'Apple Health', emoji: '❤️', accent: '#fc3158' },
  };

  function IAArtifactIntegrationActionCard(props) {
    var art = props.artifact || {};
    var provider = art.provider || 'notion';
    var meta = _PROVIDER_META[provider] || { name: provider, emoji: '🔌', accent: 'var(--neon)' };
    var action = art.action || 'Conectando con ' + meta.name;
    var status = art.status || 'success';
    var preview = art.preview;
    var primaryAction = art.primaryAction;

    function handleOpen() {
      if (primaryAction) {
        _emitArtifactAction('integration_action_card', primaryAction.value, art);
      }
    }

    var statusColor = status === 'success' ? '#3dffd1'
                    : status === 'failed' ? '#ff8b8b'
                    : '#ffc850';
    var statusLabel = status === 'success' ? '✓ Hecho'
                    : status === 'failed' ? '✗ No pude'
                    : '⋯ En curso';

    return (
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        animation: 'mtx-fade-up .35s ease both',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 11,
          borderBottom: preview || primaryAction ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            flexShrink: 0,
            background: meta.accent + '15',
            border: '0.5px solid ' + meta.accent + '35',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }} aria-hidden="true">{meta.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 700,
              color: 'var(--ink-3)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'var(--ff-sans)',
              marginBottom: 2,
            }}>{meta.name}</div>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: 'var(--ink-1)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              lineHeight: 1.35,
            }}>{action}</div>
          </div>
          <div style={{
            padding: '3px 8px', borderRadius: 999,
            background: statusColor + '15',
            border: '0.5px solid ' + statusColor + '30',
            fontSize: 10, fontWeight: 700,
            color: statusColor,
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '0.02em',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>{statusLabel}</div>
        </div>
        {/* Preview */}
        {preview && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.015)',
          }}>
            {preview.title && (
              <div style={{
                fontSize: 12.5, fontWeight: 600,
                color: 'var(--ink-1)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>{preview.title}</div>
            )}
            {preview.subtext && (
              <div style={{
                marginTop: 2,
                fontSize: 11,
                color: 'var(--ink-3)',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
              }}>{preview.subtext}</div>
            )}
          </div>
        )}
        {/* Action */}
        {primaryAction && status === 'success' && (
          <button type="button"
            onClick={handleOpen}
            className="mtx-tap"
            style={{
              appearance: 'none', cursor: 'pointer',
              width: '100%', padding: '9px 14px',
              borderTop: '0.5px solid rgba(255,255,255,0.05)',
              background: 'rgba(255,255,255,0.02)',
              border: 0,
              color: meta.accent === '#ffffff' ? 'var(--ink-1)' : meta.accent,
              fontSize: 11.5, fontWeight: 700,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.005em',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
            {primaryAction.label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="7" y1="17" x2="17" y2="7"/>
              <polyline points="7 7 17 7 17 17"/>
            </svg>
          </button>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // A.5.5 / B5 (REFACTOR) — IAArtifactBrowseProgressCard
  // ═══════════════════════════════════════════════════════════════════════════
  // EL ARTIFACT MÁS RICO. Muestra al coach navegando un sitio web inline en el
  // chat — sin overlay fullscreen. Cada step puede mostrar un thumbnail inline
  // (mock SVG ahora, screenshots reales del Playwright cuando llegue backend).
  //
  // Diseño post-feedback Diego: clean, sin ceremonia, estilo extensión Claude
  // Code. Thumbnails pequeños 80x60 al lado del label de cada step done/active.
  //
  // Shape:
  //   {
  //     kind: 'browse_progress_card',
  //     state?: 'live' | 'done' | 'cancelled',  // default 'done' por backward compat
  //     site?: 'bodytech.com.co',
  //     brand?: 'bodytech' | 'cal' | 'amazon' | ... (para emoji + color del header)
  //     intent: 'Reservar clase de yoga',
  //     steps: [
  //       {
  //         label: 'Abriendo bodytech.com.co',
  //         status: 'done' | 'active' | 'pending' | 'failed' | 'cancelled',
  //         screenshot?: '<svg>...</svg>',  // SVG raw del thumbnail (mock o real)
  //         detail?: 'sub-label opcional bajo el label',
  //       },
  //     ],
  //     bookingRef?: 'BT-2845',  // mostrado en footer si state==='done'
  //     currentStepIdx?: 2,      // para destacar visualmente el step activo
  //   }
  function IAArtifactBrowseProgressCard(props) {
    var art = props.artifact || {};
    var state = art.state || 'done';
    var site = art.site || 'navegando…';
    var intent = art.intent;
    var steps = Array.isArray(art.steps) ? art.steps : [];
    var bookingRef = art.bookingRef;
    var isLive = state === 'live';
    var isCancelled = state === 'cancelled';
    var isDone = state === 'done';

    // Auto-colapso: cuando done, thumbnails se ocultan por default (modo
    // compacto) y user puede expandir manual. Cuando live, siempre visibles.
    // Cuando cancelled, ocultas por default también.
    var expandedState = React.useState(isLive); // live → true desde el inicio
    var expanded = expandedState[0]; var setExpanded = expandedState[1];

    // Cuando transiciona de live → done, colapsa automáticamente.
    var prevStateRef = React.useRef(state);
    React.useEffect(function() {
      if (prevStateRef.current === 'live' && state === 'done') {
        setExpanded(false);
      }
      if (prevStateRef.current !== 'live' && state === 'live') {
        setExpanded(true);
      }
      prevStateRef.current = state;
    }, [state]);

    // Gate: ¿mostramos thumbnails inline? Live siempre. Done solo si expanded.
    var showThumbnails = isLive || (isDone && expanded);

    // Emoji favicon por brand
    var brandEmoji = (function() {
      switch (art.brand) {
        case 'bodytech': return '💪';
        case 'cal': return '📅';
        case 'amazon': return '📦';
        case 'booking': return '🏨';
        default: return '🌐';
      }
    })();

    function handleCancel() {
      // Dispatch cancel — el runner escucha y aborta + actualiza state a 'cancelled'
      if (window.__mtxBrowseActRunner && props.msgId) {
        window.__mtxBrowseActRunner.cancel(props.msgId);
      }
      // Emit event para que listeners externos sepan (analytics, etc.)
      _emitArtifactAction('browse_progress_card', 'cancel', art);
    }

    return (
      <div style={{
        borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid ' + (isLive ? 'rgba(61,255,209,0.25)' : 'rgba(255,255,255,0.08)'),
        animation: 'mtx-fade-up .35s ease both',
        overflow: 'hidden',
        boxShadow: isLive ? '0 0 24px rgba(61,255,209,0.06)' : 'none',
        transition: 'border-color .3s, box-shadow .3s',
      }}>
        {/* Header: favicon emoji + URL + chip status */}
        <div style={{
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '0.5px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.20)',
        }}>
          {/* Traffic lights mock — sutil */}
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,95,86,0.55)' }}/>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,189,46,0.55)' }}/>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(39,201,63,0.55)' }}/>
          </div>
          {/* URL bar */}
          <div style={{
            flex: 1, minWidth: 0,
            padding: '4px 10px', borderRadius: 6,
            background: 'rgba(255,255,255,0.06)',
            fontSize: 10.5,
            color: 'var(--ink-2)',
            fontFamily: 'var(--ff-mono, ui-monospace, monospace)',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span aria-hidden="true">🔒</span>
            <span>{site}</span>
          </div>
          {/* Status chip — varía por state */}
          <span style={{
            fontSize: 9, fontWeight: 700,
            color: isLive ? 'var(--neon)' : isCancelled ? 'rgba(255,160,160,0.85)' : 'rgba(255,255,255,0.45)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'var(--ff-sans)',
            flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            {isLive && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--neon)',
                boxShadow: '0 0 6px var(--neon)',
                animation: 'mtx-coach-step-pulse 1.2s ease-in-out infinite',
                display: 'inline-block',
              }}/>
            )}
            {isLive ? 'EN VIVO' : isCancelled ? 'CANCELADO' : 'COMPLETADO'}
          </span>
        </div>

        {/* Intent (subtitle) */}
        {intent && (
          <div style={{
            padding: '11px 14px 4px',
            fontSize: 12.5, fontWeight: 600,
            color: 'var(--ink-1)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            fontStyle: 'italic',
          }}>"{intent}"</div>
        )}

        {/* Steps timeline con thumbnails inline */}
        <div style={{
          padding: '8px 14px 14px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {steps.map(function(step, i) {
            var status = step.status || 'pending';
            var isLastStep = i === steps.length - 1;
            var isCurrentLive = isLive && status === 'active';

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                position: 'relative',
                animation: status === 'done' || status === 'active'
                  ? 'mtx-fade-up .3s cubic-bezier(0.16, 1, 0.3, 1) both'
                  : 'none',
                opacity: status === 'pending' ? 0.45 : 1,
                transition: 'opacity .3s',
              }}>
                {/* Status dot + vertical line connector.
                    El conector vive como position:absolute desde el dot
                    extendiéndose por todo el alto del row — así toca el
                    siguiente dot sin importar si el row tiene thumbnail grande
                    o solo label. Antes era flex-1 que se quedaba corto. */}
                <div style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  flexShrink: 0, paddingTop: 2,
                  alignSelf: 'stretch',
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    position: 'relative', zIndex: 1,
                    background: status === 'done' ? 'rgba(61,255,209,0.18)'
                             : status === 'active' ? 'var(--neon)'
                             : status === 'cancelled' ? 'transparent'
                             : status === 'failed' ? 'rgba(255,139,139,0.15)'
                             : 'transparent',
                    border: '0.5px solid ' + (
                      status === 'done' ? 'rgba(61,255,209,0.5)'
                    : status === 'active' ? 'rgba(61,255,209,0.85)'
                    : status === 'cancelled' ? 'rgba(255,160,160,0.35)'
                    : status === 'failed' ? 'rgba(255,139,139,0.55)'
                    : 'rgba(255,255,255,0.20)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: status === 'active' ? 'mtx-coach-step-pulse 1.2s ease-in-out infinite' : 'none',
                    boxShadow: status === 'active' ? '0 0 8px rgba(61,255,209,0.5)' : 'none',
                    transition: 'background .25s, border-color .25s, box-shadow .25s',
                  }}>
                    {status === 'done' && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
                        stroke="rgba(61,255,209,0.95)" strokeWidth="3.5"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                    {/* Cancelled step: dash horizontal (no X — la X confunde
                        con "fallido". Dash indica claramente "no se ejecutó"). */}
                    {status === 'cancelled' && (
                      <div style={{
                        width: 6, height: 1.5,
                        borderRadius: 1,
                        background: 'rgba(255,160,160,0.55)',
                      }}/>
                    )}
                    {status === 'failed' && (
                      <svg width="6" height="6" viewBox="0 0 24 24" fill="none"
                        stroke="rgba(255,139,139,0.85)" strokeWidth="3"
                        strokeLinecap="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    )}
                  </div>
                  {/* Connector line — vertical TOCANDO el siguiente dot.
                      Position absolute desde el bottom del dot (y=16) hasta
                      el bottom del row (extiende todo el alto sobrante). El
                      siguiente row arranca con su dot pegado a esta línea. */}
                  {!isLastStep && (
                    <div style={{
                      position: 'absolute',
                      top: 18,        // justo bajo el dot (paddingTop 2 + dot 14 + 2 gap)
                      bottom: -8,     // empuja hasta tocar el siguiente row (gap 8 entre rows)
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 1,
                      background: status === 'done'
                        ? 'rgba(61,255,209,0.25)'
                        : 'rgba(255,255,255,0.10)',
                      transition: 'background .25s',
                    }}/>
                  )}
                </div>

                {/* Content: label arriba, thumbnail screenshot DEBAJO ancho.
                    Diego (post-feedback v2): thumbnail va abajo del label y
                    grande abarcando casi todo el ancho — NO al lado. */}
                <div style={{ flex: 1, minWidth: 0, paddingBottom: isLastStep ? 0 : 8 }}>
                  {/* Texto del step */}
                  <div style={{
                    fontSize: 13, lineHeight: 1.4,
                    color: status === 'done' ? 'var(--ink-1)'
                        : status === 'active' ? 'var(--ink-1)'
                        : status === 'cancelled' ? 'rgba(255,160,160,0.75)'
                        : 'var(--ink-3)',
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.005em',
                    fontWeight: status === 'active' ? 600 : 500,
                  }}>{step.label}{isCurrentLive && '…'}</div>
                  {step.detail && (
                    <div style={{
                      marginTop: 2,
                      fontSize: 11, lineHeight: 1.4,
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--ff-mono, ui-monospace, monospace)',
                      letterSpacing: '0.01em',
                      opacity: 0.85,
                    }}>{step.detail}</div>
                  )}
                  {/* Thumbnail screenshot DEBAJO, full-width.
                      Visible solo cuando:
                      - step done o active (no en pending/cancelled)
                      - HAY screenshot disponible
                      - showThumbnails: true (live siempre, done solo si user expandió)
                      Esto es el auto-colapso: cuando termina el flow, vuelve al
                      modo compacto y user tiene botón "Ver capturas" para
                      re-expandir si quiere ver las pruebas visuales. */}
                  {step.screenshot && (status === 'done' || status === 'active') && showThumbnails && (
                    <div
                      style={{
                        marginTop: 8,
                        width: '100%',
                        aspectRatio: '320 / 200',
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: '#fff',
                        border: '0.5px solid ' + (status === 'active'
                          ? 'rgba(61,255,209,0.45)'
                          : 'rgba(255,255,255,0.10)'),
                        boxShadow: status === 'active'
                          ? '0 0 16px rgba(61,255,209,0.18), 0 4px 12px -4px rgba(0,0,0,0.45)'
                          : '0 4px 12px -4px rgba(0,0,0,0.35)',
                        animation: 'mtx-fade-up .35s cubic-bezier(0.16, 1, 0.3, 1) both',
                        transition: 'border-color .25s, box-shadow .25s',
                      }}
                      dangerouslySetInnerHTML={{ __html: step.screenshot }}
                      aria-label={'Captura del paso: ' + step.label}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Toggle expandir/colapsar capturas — solo done con screenshots disponibles.
            Mientras live no aparece (no se puede colapsar mid-flight). */}
        {isDone && steps.some(function(s) { return s.screenshot && (s.status === 'done' || s.status === 'active'); }) && (
          <button
            type="button"
            onClick={function() { setExpanded(function(v) { return !v; }); }}
            className="mtx-tap"
            aria-label={expanded ? 'Ocultar capturas' : 'Ver capturas'}
            aria-expanded={expanded}
            style={{
              appearance: 'none', cursor: 'pointer',
              width: '100%',
              padding: '9px 14px',
              borderTop: '0.5px solid rgba(255,255,255,0.05)',
              background: 'rgba(255,255,255,0.015)',
              border: 0,
              color: 'rgba(255,255,255,0.55)',
              fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.02em',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background .15s, color .15s',
            }}
            onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--ink-2)'; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }}
              aria-hidden="true">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            <span>{expanded ? 'Ocultar capturas' : 'Ver capturas del navegador'}</span>
          </button>
        )}

        {/* Footer: bookingRef + acción (solo state==='done') */}
        {state === 'done' && bookingRef && (
          <div style={{
            padding: '11px 14px',
            background: 'rgba(61,255,209,0.05)',
            borderTop: '0.5px solid rgba(61,255,209,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 10,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: 'rgba(61,255,209,0.85)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: 'var(--ff-sans)',
            }}>Código de reserva</div>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: 'var(--neon)',
              fontFamily: 'var(--ff-mono, ui-monospace, monospace)',
              letterSpacing: '0.02em',
            }}>{bookingRef}</div>
          </div>
        )}

        {/* Botón Detener inline — visible solo cuando live */}
        {isLive && (
          <div style={{
            padding: '10px 14px',
            borderTop: '0.5px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 10,
          }}>
            <div style={{
              fontSize: 10.5,
              color: 'rgba(255,255,255,0.45)',
              fontFamily: 'var(--ff-mono, ui-monospace, monospace)',
              letterSpacing: '0.02em',
            }}>El coach está trabajando…</div>
            <button
              type="button"
              onClick={handleCancel}
              className="mtx-tap"
              aria-label="Detener la acción"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '5px 12px', borderRadius: 999,
                background: 'rgba(255,160,160,0.10)',
                border: '0.5px solid rgba(255,160,160,0.32)',
                color: 'rgba(255,180,180,0.95)',
                fontSize: 11, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                transition: 'background .18s, border-color .18s',
              }}>Detener</button>
          </div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // A.5.6 IAArtifactVoiceCallOverlay — preview de call (RFC §A1)
  // ═══════════════════════════════════════════════════════════════════════════
  // Versión INLINE (no fullscreen) — preview compacto que indica que hay un
  // call activo. El overlay fullscreen real se construye en Sprint A.6 / B7.
  //
  // Shape:
  //   {
  //     kind: 'voice_call_overlay',
  //     state: 'connecting' | 'active' | 'ended',
  //     durationSec?: 0,
  //     transcript?: 'Última frase del coach',
  //     muted?: false
  //   }
  function IAArtifactVoiceCallOverlay(props) {
    var art = props.artifact || {};
    var state = art.state || 'active';
    var durationSec = art.durationSec || 0;
    var transcript = art.transcript;
    var muted = !!art.muted;

    // Mock waveform - 24 barras animadas
    var BARS = 24;
    var barsArr = [];
    for (var i = 0; i < BARS; i++) {
      barsArr.push({ id: i, h: 0.3 + 0.7 * Math.abs(Math.sin(i * 0.7) + Math.cos(i * 0.4) * 0.5) });
    }

    function fmtSec(s) {
      var m = Math.floor(s / 60);
      var ss = s % 60;
      return m + ':' + (ss < 10 ? '0' + ss : ss);
    }

    // B7 Sprint A.6: si el voice overlay fullscreen existe y el action es
    // "reopen" o "mute", lo despacha allá. Mantiene retrocompat para tests.
    function handleAction(value) {
      if (value === 'reopen' && window.__mtxVoiceCall) {
        window.__mtxVoiceCall.open(null, art.openPrompt || '');
        return;
      }
      _emitArtifactAction('voice_call_overlay', value, art);
    }

    var stateLabel = state === 'connecting' ? 'Conectando…'
                  : state === 'active' ? 'En llamada'
                  : 'Llamada terminada';

    return (
      <div style={{
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(61,255,209,0.12) 0%, rgba(155,138,255,0.08) 100%)',
        border: '0.5px solid rgba(61,255,209,0.25)',
        padding: '14px 16px',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 10,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: state === 'active' ? 'var(--neon)' : state === 'connecting' ? '#ffc850' : 'var(--ink-3)',
            boxShadow: state === 'active' ? '0 0 10px var(--neon)' : 'none',
            animation: state === 'connecting' ? 'mtx-coach-step-pulse 1.2s infinite' : 'none',
          }}/>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: state === 'ended' ? 'var(--ink-3)' : 'var(--neon)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontFamily: 'var(--ff-sans)',
          }}>{stateLabel}</span>
          {state === 'active' && (
            <span style={{
              marginLeft: 'auto',
              fontSize: 13, fontWeight: 700,
              color: 'var(--ink-1)',
              fontFamily: 'var(--ff-mono, ui-monospace, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}>{fmtSec(durationSec)}</span>
          )}
        </div>
        {/* Waveform */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          height: 38, marginBottom: 12,
        }} aria-label="Forma de onda de voz">
          {barsArr.map(function(bar) {
            return (
              <div key={bar.id} style={{
                flex: 1,
                height: (bar.h * 100) + '%',
                minHeight: 4,
                borderRadius: 2,
                background: state === 'active' ? 'var(--neon)' : 'rgba(255,255,255,0.20)',
                boxShadow: state === 'active' ? '0 0 4px rgba(61,255,209,0.5)' : 'none',
                animation: state === 'active' ? 'mtx-coach-step-pulse 0.8s ease-in-out infinite' : 'none',
                animationDelay: (bar.id * 0.04) + 's',
              }}/>
            );
          })}
        </div>
        {transcript && state === 'active' && (
          <div style={{
            padding: '8px 10px',
            background: 'rgba(0,0,0,0.20)',
            borderRadius: 8,
            fontSize: 11.5, lineHeight: 1.45,
            color: 'var(--ink-2)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            fontStyle: 'italic',
            marginBottom: 12,
          }}>"…{transcript}"</div>
        )}
        {state === 'active' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button"
              onClick={function() { handleAction(muted ? 'unmute' : 'mute'); }}
              className="mtx-tap"
              aria-label={muted ? 'Quitar silencio' : 'Silenciar micrófono'}
              style={{
                appearance: 'none', cursor: 'pointer',
                flex: 1, padding: '8px 10px', borderRadius: 999,
                background: muted ? 'rgba(255,139,139,0.10)' : 'rgba(255,255,255,0.04)',
                border: '0.5px solid ' + (muted ? 'rgba(255,139,139,0.30)' : 'rgba(255,255,255,0.10)'),
                color: muted ? '#ff8b8b' : 'var(--ink-2)',
                fontSize: 11.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
              }}>{muted ? 'Silenciado' : '🎤 Mute'}</button>
            <button type="button"
              onClick={function() { handleAction('transfer_to_text'); }}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                flex: 1, padding: '8px 10px', borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                color: 'var(--ink-2)',
                fontSize: 11.5, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
              }}>Pasar a texto</button>
            <button type="button"
              onClick={function() { handleAction('hangup'); }}
              className="mtx-tap"
              aria-label="Colgar"
              style={{
                appearance: 'none', cursor: 'pointer',
                flex: 1, padding: '8px 10px', borderRadius: 999,
                background: 'rgba(255,95,86,0.85)',
                border: 0,
                color: '#fff',
                fontSize: 11.5, fontWeight: 700,
                fontFamily: 'var(--ff-sans)',
              }}>Colgar</button>
          </div>
        )}
        {state === 'ended' && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.20)',
              borderRadius: 8,
              fontSize: 11.5,
              color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              textAlign: 'center',
            }}>Duración: {fmtSec(durationSec)} · Hablamos cuando quieras de nuevo.</div>
            {/* B7: reabrir la llamada — útil si el user colgó pero quiere retomar */}
            {window.__mtxVoiceCall && (
              <button type="button"
                onClick={function() { handleAction('reopen'); }}
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '8px 14px', borderRadius: 999,
                  background: 'rgba(61,255,209,0.10)',
                  border: '0.5px solid rgba(61,255,209,0.30)',
                  color: 'rgba(220,255,245,0.95)',
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                }}>Iniciar nueva llamada</button>
            )}
          </div>
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // A.5.7 IAArtifactScreenSharePreview — el coach mirando tu pantalla (RFC §A1)
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   {
  //     kind: 'screen_share_preview',
  //     state: 'sharing' | 'ended',
  //     previewGradient?: 'linear-gradient(...)',
  //     region?: 'Pantalla completa' | 'Solo Chrome',
  //     coachNote?: 'Estoy viendo el documento de mi parte.'
  //   }
  function IAArtifactScreenSharePreview(props) {
    var art = props.artifact || {};
    var state = art.state || 'sharing';
    var previewGradient = art.previewGradient
      || 'linear-gradient(135deg, rgba(155,138,255,0.20), rgba(61,255,209,0.10), rgba(255,200,80,0.10))';
    var region = art.region || 'Pantalla completa';
    var coachNote = art.coachNote;

    function handleEnd() {
      _emitArtifactAction('screen_share_preview', 'end_share', art);
    }

    return (
      <div style={{
        borderRadius: 14, overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {/* Preview area */}
        <div style={{
          aspectRatio: '16 / 9',
          background: previewGradient,
          position: 'relative',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }} role="img" aria-label="Pantalla compartida">
          {/* Mock window chrome inside the preview */}
          <div style={{
            position: 'absolute', top: 10, left: 10, right: 10,
            height: 18, borderRadius: 5,
            background: 'rgba(0,0,0,0.30)',
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '0 8px',
            backdropFilter: 'blur(4px)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,95,86,0.6)' }}/>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,189,46,0.6)' }}/>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(39,201,63,0.6)' }}/>
          </div>
          {/* Subtle grid */}
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.06 }} aria-hidden="true">
            <defs>
              <pattern id="ss-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ss-grid)"/>
          </svg>
          {/* Live indicator */}
          <div style={{
            position: 'absolute', top: 36, left: 10,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 8px', borderRadius: 999,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
          }}>
            {state === 'sharing' && (
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#ff5f56',
                boxShadow: '0 0 6px rgba(255,95,86,0.7)',
                animation: 'mtx-coach-step-pulse 1.2s infinite',
              }}/>
            )}
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.08em',
              fontFamily: 'var(--ff-sans)',
              textTransform: 'uppercase',
            }}>{state === 'sharing' ? 'En vivo · ' + region : 'Finalizado'}</span>
          </div>
          {/* Coach eye icon */}
          <div style={{
            position: 'absolute', bottom: 10, right: 10,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="var(--neon)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span style={{
              fontSize: 9.5, fontWeight: 700,
              color: 'var(--neon)',
              letterSpacing: '0.04em',
              fontFamily: 'var(--ff-sans)',
            }}>Coach mirando</span>
          </div>
        </div>
        {/* Coach note + end action */}
        <div style={{ padding: '10px 14px' }}>
          {coachNote && (
            <div style={{
              fontSize: 12.5, lineHeight: 1.45,
              color: 'var(--ink-2)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              fontStyle: 'italic',
            }}>"{coachNote}"</div>
          )}
          {state === 'sharing' && (
            <button type="button"
              onClick={handleEnd}
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: 'pointer',
                marginTop: coachNote ? 10 : 0,
                width: '100%', padding: '8px 14px',
                borderRadius: 999,
                background: 'rgba(255,139,139,0.06)',
                border: '0.5px solid rgba(255,139,139,0.25)',
                color: '#ff8b8b',
                fontSize: 11.5, fontWeight: 700,
                fontFamily: 'var(--ff-sans)',
              }}>Dejar de compartir</button>
          )}
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 26. IAArtifactAudioWaveform — variante simple del legacy 'voice'
  // ═══════════════════════════════════════════════════════════════════════════
  // Reusa el mismo render que IAArtifactVoice pero acepta el kind alternativo
  // 'audio_waveform' (RFC §5.2 #17) que es semánticamente más amplio
  // (puede ser sonido binaural, voice note, audio del coach, etc.).
  function IAArtifactAudioWaveform(props) {
    return <IAArtifactVoice artifact={props.artifact}/>;
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // Sprint A.8 — IAArtifactImageGenJob · imagen mientras genera
  // ═══════════════════════════════════════════════════════════════════════════
  // Renderiza el progress live de un image generation job del Imperial Gateway.
  // Listener de eventos `mtx:image-gen-progress` / `mtx:image-gen-done` /
  // `mtx:image-gen-error`. Cuando done, se transmuta automáticamente en
  // IAArtifactImageResult inline (no full-screen overlay).
  //
  // Shape:
  //   { kind: 'image_gen_job', jobId, state: 'live'|'done', prompt, aspectRatio,
  //     model, progress, eta, resultUrl }
  function IAArtifactImageGenJob(props) {
    var art = props.artifact || {};
    var jobId = art.jobId;
    var stateInit = art.state || 'live';

    var progressState = React.useState(art.progress || 0);
    var progress = progressState[0]; var setProgress = progressState[1];
    var statusState = React.useState(stateInit);
    var status = statusState[0]; var setStatus = statusState[1];
    var resultUrlState = React.useState(art.resultUrl || null);
    var resultUrl = resultUrlState[0]; var setResultUrl = resultUrlState[1];
    var errState = React.useState(null);
    var err = errState[0]; var setErr = errState[1];

    var startedAtRef = React.useRef(Date.now());

    // Listener de eventos del store
    React.useEffect(function() {
      if (!jobId) return;
      function onProgress(e) {
        if (!e.detail || e.detail.jobId !== jobId) return;
        setProgress(e.detail.progress);
      }
      function onDone(e) {
        if (!e.detail || e.detail.jobId !== jobId) return;
        setStatus('done');
        setProgress(100);
        setResultUrl(e.detail.resultUrl);
        // Mutar el artifact en el store de chat (para que persista al re-render)
        try {
          if (window.__mtxIAChat && window.__mtxIAChat.updateMessage && art._msgId) {
            // soft: encontramos msg y actualizamos artifact in-place
          }
        } catch (_e) { /* no-op */ }
      }
      function onError(e) {
        if (!e.detail || e.detail.jobId !== jobId) return;
        setStatus('error');
        setErr(e.detail.error || 'Falló la generación');
      }
      // Si el job ya está en estado done en el store al montar, traerlo
      if (window.__mtxImageGen) {
        var snap = window.__mtxImageGen.pollJob(jobId);
        if (snap) {
          setProgress(snap.progress);
          if (snap.status === 'done') {
            setStatus('done');
            setResultUrl(snap.resultUrl);
          } else if (snap.status === 'error' || snap.status === 'cancelled') {
            setStatus('error');
            setErr(snap.error || 'cancelled');
          }
        }
      }
      window.addEventListener('mtx:image-gen-progress', onProgress);
      window.addEventListener('mtx:image-gen-done', onDone);
      window.addEventListener('mtx:image-gen-error', onError);
      return function() {
        window.removeEventListener('mtx:image-gen-progress', onProgress);
        window.removeEventListener('mtx:image-gen-done', onDone);
        window.removeEventListener('mtx:image-gen-error', onError);
      };
    }, [jobId]);

    var model = (window.__mtxImageGen && window.__mtxImageGen.getModel) ? window.__mtxImageGen.getModel(art.model) : { label: art.model || '', icon: '✦', etaSec: 15 };
    var aspectRatio = art.aspectRatio || '1:1';
    var ratioObj = (window.__mtxImageGen && window.__mtxImageGen.listAspectRatios) ? window.__mtxImageGen.listAspectRatios().find(function(r) { return r.id === aspectRatio; }) : { w: 1024, h: 1024 };
    var aspectStyle = ratioObj ? (ratioObj.w + ' / ' + ratioObj.h) : '1 / 1';

    function handleCancel() {
      if (window.__mtxImageGen) window.__mtxImageGen.cancel(jobId);
      setStatus('error'); setErr('cancelled');
    }

    function handleRegenerate() {
      if (!window.__mtxImageGen || !art.prompt) return;
      window.__mtxImageGen.submit({ prompt: art.prompt, model: art.model, aspectRatio: aspectRatio })
        .then(function(res) {
          // Reset state
          setStatus('live'); setProgress(0); setResultUrl(null); setErr(null);
          // Actualizar jobId del artifact (sobrescribir via event)
          art.jobId = res.jobId;
        });
    }

    if (status === 'done' && resultUrl) {
      return <IAArtifactImageResult artifact={Object.assign({}, art, {
        resultUrl: resultUrl, state: 'done',
      })}/>;
    }

    var etaSec = Math.max(0, model.etaSec - Math.floor((Date.now() - startedAtRef.current) / 1000));

    return (
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        border: '0.5px solid rgba(61,255,209,0.18)',
        background: 'linear-gradient(180deg, rgba(20,40,32,0.55), rgba(8,16,12,0.85))',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {/* Skeleton hero con shimmer */}
        <div style={{
          width: '100%',
          aspectRatio: aspectStyle,
          background: 'linear-gradient(135deg, rgba(61,255,209,0.10), rgba(155,138,255,0.08), rgba(255,200,80,0.06))',
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {/* Shimmer bar */}
          <div style={{
            position: 'absolute', top: 0, left: '-30%', height: '100%', width: '30%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
            animation: 'mtx-shimmer 1.8s ease-in-out infinite',
          }}/>
          {/* Icon center */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            opacity: 0.95,
          }}>
            <div style={{ fontSize: 38, animation: 'mtx-pulse-soft 1.4s ease-in-out infinite' }} aria-hidden="true">{model.icon}</div>
            <div style={{
              fontSize: 11, letterSpacing: '0.08em', fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              padding: '3px 9px', borderRadius: 999,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
            }}>
              {status === 'error' ? 'ERROR' : 'GENERANDO'}
            </div>
          </div>
          {/* Top-right model chip */}
          <div style={{
            position: 'absolute', top: 12, right: 12,
            padding: '4px 9px', borderRadius: 999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
            color: 'rgba(255,255,255,0.9)',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ color: 'var(--neon)' }}>✦</span>
            {(model.label || '').toUpperCase()}
          </div>
        </div>

        {/* Footer: prompt + progress + cancel */}
        <div style={{ padding: '12px 14px 14px' }}>
          {art.prompt && (
            <div style={{
              fontSize: 12, fontWeight: 500,
              color: 'var(--ink-2)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
              lineHeight: 1.4,
              marginBottom: 10,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>"{art.prompt}"</div>
          )}
          {status === 'error' ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 10,
              background: 'rgba(255,139,139,0.08)',
              border: '0.5px solid rgba(255,139,139,0.20)',
              fontSize: 11.5, color: '#ff8b8b',
              fontFamily: 'var(--ff-sans)',
            }}>
              <span>{err === 'cancelled' ? 'Cancelado por ti' : (err || 'Falló la generación')}</span>
              <button type="button" onClick={handleRegenerate}
                aria-label="Reintentar generación"
                style={{
                  marginLeft: 'auto',
                  appearance: 'none', cursor: 'pointer',
                  padding: '4px 10px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  color: 'var(--ink-1)', fontSize: 11, fontWeight: 600,
                  fontFamily: 'var(--ff-sans)',
                }}>Reintentar</button>
            </div>
          ) : (
            <div>
              {/* Progress bar */}
              <div style={{
                position: 'relative',
                width: '100%', height: 4, borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
                marginBottom: 8,
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: progress + '%',
                  background: 'linear-gradient(90deg, var(--neon), #9b8aff)',
                  transition: 'width .4s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 0 8px rgba(61,255,209,0.45)',
                }}/>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 10.5, color: 'var(--ink-3)',
                fontFamily: 'var(--ff-sans)',
              }}>
                <span>{progress}% · ~{etaSec}s restantes</span>
                <button type="button" onClick={handleCancel}
                  aria-label="Cancelar generación"
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: '2px 8px', borderRadius: 6,
                    background: 'transparent',
                    border: '0.5px solid rgba(255,255,255,0.10)',
                    color: 'var(--ink-3)', fontSize: 10, fontWeight: 600,
                    fontFamily: 'var(--ff-sans)',
                  }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // Sprint A.8 — IAArtifactImageResult · imagen lista con acciones
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   { kind: 'image_result', resultUrl, prompt, model, aspectRatio }
  function IAArtifactImageResult(props) {
    var art = props.artifact || {};
    var src = art.resultUrl || art.src;
    var aspectRatio = art.aspectRatio || '1:1';
    var ratioObj = (window.__mtxImageGen && window.__mtxImageGen.listAspectRatios) ? window.__mtxImageGen.listAspectRatios().find(function(r) { return r.id === aspectRatio; }) : null;
    var aspectStyle = ratioObj ? (ratioObj.w + ' / ' + ratioObj.h) : '1 / 1';
    var model = (window.__mtxImageGen && window.__mtxImageGen.getModel) ? window.__mtxImageGen.getModel(art.model) : { label: '', icon: '✦' };

    var savedState = React.useState(false);
    var saved = savedState[0]; var setSaved = savedState[1];

    function handleSave() {
      setSaved(true);
      if (window.__mtxToast && window.__mtxToast.show) {
        window.__mtxToast.show('Guardado en tu biblioteca', { kind: 'success', durationMs: 1800 });
      }
    }

    function handleDownload() {
      try {
        var a = document.createElement('a');
        a.href = src;
        a.download = 'mentex-image-' + Date.now() + '.svg';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        if (window.__mtxToast && window.__mtxToast.show) {
          window.__mtxToast.show('Imagen descargada', { kind: 'success', durationMs: 1500 });
        }
      } catch (e) { /* no-op */ }
    }

    function handleRegenerate() {
      if (!window.__mtxImageGen || !art.prompt) return;
      window.__mtxImageGen.submit({
        prompt: art.prompt, model: art.model, aspectRatio: aspectRatio,
      }).then(function(res) {
        // Emite evento para que el bridge agregue un nuevo artifact image_gen_job
        window.dispatchEvent(new CustomEvent('mtx:image-gen-restart', { detail: {
          jobId: res.jobId, prompt: art.prompt, model: art.model, aspectRatio: aspectRatio,
        }}));
      });
    }

    function handleUseAsVideoRef() {
      // Inyecta el prompt al draft de la conv para iniciar video flow con esta imagen
      window.dispatchEvent(new CustomEvent('mtx:ia-inject-draft', { detail: {
        text: 'Crea un video basado en esta imagen: ' + (art.prompt || ''),
      }}));
      if (window.__mtxToast && window.__mtxToast.show) {
        window.__mtxToast.show('Inyectado al chat — pulsá enviar', { kind: 'info', durationMs: 2000 });
      }
    }

    return (
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.02)',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {/* Image */}
        <div style={{
          width: '100%', aspectRatio: aspectStyle,
          backgroundImage: 'url(' + src + ')',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          background: src ? undefined : 'linear-gradient(135deg, rgba(61,255,209,0.15), rgba(155,138,255,0.10))',
          position: 'relative',
        }} role="img" aria-label={art.prompt || 'Imagen generada por Mentex'}>
          {src && <img src={src} alt={art.prompt || 'Imagen generada'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>}
          {/* Badge top-right */}
          <div style={{
            position: 'absolute', top: 12, right: 12,
            padding: '4px 9px', borderRadius: 999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
            color: 'rgba(255,255,255,0.9)',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ color: 'var(--neon)' }}>✦</span>
            GENERADA · {(model.label || '').toUpperCase()}
          </div>
        </div>

        {/* Footer: prompt + 4 actions */}
        <div style={{ padding: '12px 14px 14px' }}>
          {art.prompt && (
            <div style={{
              fontSize: 12, fontWeight: 500,
              color: 'var(--ink-2)', fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em', lineHeight: 1.4,
              marginBottom: 10,
              fontStyle: 'italic',
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>"{art.prompt}"</div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <_GenActionPill icon="🔄" label="Regenerar" onClick={handleRegenerate}/>
            <_GenActionPill icon={saved ? '★' : '☆'} label={saved ? 'Guardada' : 'Guardar'} onClick={handleSave} active={saved}/>
            <_GenActionPill icon="⬇" label="Descargar" onClick={handleDownload}/>
            <_GenActionPill icon="🎬" label="Hacer video" onClick={handleUseAsVideoRef}/>
          </div>
        </div>
      </div>
    );
  }


  // Helper compartido — pill button para acciones de artifacts generativos
  function _GenActionPill(props) {
    var active = !!props.active;
    return (
      <button type="button"
        onClick={props.onClick}
        className="mtx-tap"
        aria-label={props.label}
        style={{
          appearance: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '6px 10px', borderRadius: 999,
          background: active ? 'rgba(61,255,209,0.10)' : 'rgba(255,255,255,0.04)',
          border: '0.5px solid ' + (active ? 'rgba(61,255,209,0.30)' : 'rgba(255,255,255,0.08)'),
          color: active ? 'var(--neon)' : 'var(--ink-2)',
          fontSize: 11, fontWeight: 600,
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
          transition: 'background .15s, color .15s, border-color .15s',
        }}>
        <span aria-hidden="true">{props.icon}</span>
        <span>{props.label}</span>
      </button>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // Sprint A.8 — IAArtifactStoryboardDraft · storyboard editable pre-video
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape:
  //   { kind: 'storyboard_draft', storyboardId, state: 'draft'|'approved' }
  //
  // Acciones inline:
  //   • Edit scene description
  //   • Change scene duration ±
  //   • Remove scene
  //   • Add scene after
  //   • Approve → dispatches mtx:storyboard-approve { storyboardId }
  function IAArtifactStoryboardDraft(props) {
    var art = props.artifact || {};
    var storyboardId = art.storyboardId;

    // Re-render trigger cuando el store cambia
    var versionState = React.useState(0);
    var bumpVersion = function() { versionState[1](function(v) { return v + 1; }); };

    // Sheet de detalle de escena — abre al tap en card
    var openSceneState = React.useState(null);  // null | idx
    var openSceneIdx = openSceneState[0]; var setOpenSceneIdx = openSceneState[1];

    var sb = (window.__mtxVideoGen && window.__mtxVideoGen.getStoryboard) ? window.__mtxVideoGen.getStoryboard(storyboardId) : null;
    if (!sb) {
      return (
        <div style={{
          padding: 14, borderRadius: 14,
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          fontSize: 12, color: 'var(--ink-3)',
          fontFamily: 'var(--ff-sans)',
        }}>Storyboard no disponible.</div>
      );
    }

    var voice = window.__mtxVideoGen.getVoice(sb.voiceId);

    function handleEditScene(idx, field, value) {
      window.__mtxVideoGen.updateScene(storyboardId, idx, { [field]: value });
      bumpVersion();
    }
    function handleRemove(idx) {
      window.__mtxVideoGen.removeScene(storyboardId, idx);
      bumpVersion();
    }
    function handleAddAfter(idx) {
      window.__mtxVideoGen.addScene(storyboardId, idx);
      bumpVersion();
    }
    function handleAdjustDuration(idx, delta) {
      var sc = sb.scenes[idx];
      var next = Math.max(1, Math.min(10, sc.durationSec + delta));
      window.__mtxVideoGen.updateScene(storyboardId, idx, { durationSec: next });
      bumpVersion();
    }
    function handleApprove() {
      window.dispatchEvent(new CustomEvent('mtx:storyboard-approve', { detail: { storyboardId: storyboardId }}));
    }
    function handleChangeVoice() {
      window.dispatchEvent(new CustomEvent('mtx:open-voice-picker', { detail: { storyboardId: storyboardId }}));
    }

    var cost = window.__mtxVideoGen.estimateCost(storyboardId);
    var model = window.__mtxVideoGen.getModel(sb.model);
    var approved = art.state === 'approved';

    return (
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        border: '0.5px solid rgba(155,138,255,0.20)',
        background: 'linear-gradient(180deg, rgba(28,22,42,0.55), rgba(12,10,18,0.85))',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px 12px',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(155,138,255,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17,
          }} aria-hidden="true">🎬</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: 'var(--ink-1)', fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>Storyboard del video</div>
            <div style={{
              fontSize: 11, color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)', marginTop: 1,
            }}>{sb.scenes.length} escenas · {Math.round(sb.totalDuration)}s total · {model.label}</div>
          </div>
          {approved && (
            <span style={{
              padding: '3px 8px', borderRadius: 999,
              fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em',
              background: 'rgba(61,255,209,0.10)',
              border: '0.5px solid rgba(61,255,209,0.30)',
              color: 'var(--neon)',
            }}>✓ APROBADO</span>
          )}
        </div>

        {/* Voice row */}
        <button type="button"
          onClick={handleChangeVoice}
          disabled={approved}
          className="mtx-tap"
          aria-label={'Cambiar voz · actual ' + voice.name}
          style={{
            appearance: 'none', cursor: approved ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%',
            padding: '10px 16px',
            borderTop: '0.5px solid rgba(255,255,255,0.04)',
            borderBottom: '0.5px solid rgba(255,255,255,0.04)',
            borderLeft: 0, borderRight: 0,
            background: 'rgba(255,255,255,0.02)',
            color: 'inherit', textAlign: 'left',
            opacity: approved ? 0.6 : 1,
          }}>
          <span style={{ fontSize: 18 }} aria-hidden="true">{voice.previewIcon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11.5, fontWeight: 700,
              color: 'var(--ink-1)', fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.005em',
            }}>Voz · {voice.name}</div>
            <div style={{
              fontSize: 10.5, color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)', marginTop: 1,
            }}>{voice.tagline}</div>
          </div>
          {!approved && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.40)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          )}
        </button>

        {/* Scenes list */}
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sb.scenes.map(function(sc, idx) {
            // Card es clickable — tap abre SceneDetailSheet. Mantiene los micro-controls
            // internos como botones independientes (stopPropagation para no abrir el sheet).
            function openDetail() { setOpenSceneIdx(idx); }
            function handleCardKey(e) {
              if (e.key === 'Enter' || e.key === ' ') {
                // Sólo si el target es la card (no un sub-button)
                if (e.target === e.currentTarget) {
                  e.preventDefault();
                  openDetail();
                }
              }
            }
            return (
              <div key={'sc-' + idx}
                role="button"
                tabIndex={0}
                onClick={openDetail}
                onKeyDown={handleCardKey}
                aria-label={'Ver detalle escena ' + (idx + 1) + ' · ' + sc.title}
                className="mtx-tap"
                style={{
                  display: 'flex', gap: 10,
                  padding: '10px 10px',
                  borderRadius: 11,
                  background: 'rgba(255,255,255,0.025)',
                  border: '0.5px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'background .15s, border-color .15s',
                }}>
                {/* Thumb */}
                <div style={{
                  width: 56, height: 56, borderRadius: 9,
                  background: 'linear-gradient(135deg, ' + sc.thumbnailColor + ', rgba(0,0,0,0.40))',
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, position: 'relative',
                  border: '0.5px solid rgba(255,255,255,0.10)',
                }} aria-hidden="true">
                  <span>{sc.thumbnailIcon}</span>
                  {/* Scene number badge */}
                  <div style={{
                    position: 'absolute', top: -6, left: -6,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--neon)', color: '#0a1410',
                    fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid #0a1410',
                  }}>{idx + 1}</div>
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: 700,
                      color: 'var(--ink-1)', fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                      flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{sc.title}</div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                      padding: '1.5px 6px', borderRadius: 999,
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--ink-3)',
                    }}>{(sc.moodTag || '').toUpperCase()}</span>
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--ink-2)',
                    fontFamily: 'var(--ff-sans)',
                    lineHeight: 1.4,
                    marginBottom: 5,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>{sc.description}</div>
                  {sc.voiceover && (
                    <div style={{
                      fontSize: 10.5, color: 'var(--neon)',
                      fontFamily: 'var(--ff-sans)',
                      lineHeight: 1.35,
                      marginBottom: 6,
                      fontStyle: 'italic',
                      paddingLeft: 8,
                      borderLeft: '2px solid rgba(61,255,209,0.30)',
                    }}>"{sc.voiceover}"</div>
                  )}
                  {/* Controls */}
                  {!approved && (
                    <div onClick={function(e) { e.stopPropagation(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 10.5,
                      }}>
                      {/* Duration adjust — stopPropagation evita abrir el sheet */}
                      <button type="button" onClick={function(e) { e.stopPropagation(); handleAdjustDuration(idx, -1); }}
                        aria-label="Reducir duración"
                        style={_microBtnStyle()}>−</button>
                      <span style={{
                        padding: '2px 7px', borderRadius: 6,
                        background: 'rgba(255,255,255,0.04)',
                        color: 'var(--ink-2)', fontWeight: 600,
                        fontFamily: 'var(--ff-mono, monospace)', minWidth: 26, textAlign: 'center',
                      }}>{sc.durationSec}s</span>
                      <button type="button" onClick={function(e) { e.stopPropagation(); handleAdjustDuration(idx, 1); }}
                        aria-label="Aumentar duración"
                        style={_microBtnStyle()}>+</button>
                      <div style={{ flex: 1 }}/>
                      <button type="button" onClick={function(e) { e.stopPropagation(); handleRemove(idx); }}
                        aria-label="Quitar escena"
                        style={Object.assign(_microBtnStyle(), { color: '#ff8b8b' })}>🗑</button>
                      <button type="button" onClick={function(e) { e.stopPropagation(); handleAddAfter(idx); }}
                        aria-label="Agregar escena después"
                        style={Object.assign(_microBtnStyle(), { color: 'var(--neon)' })}>+ esc</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA approve */}
        {!approved && (
          <div style={{ padding: '4px 14px 14px' }}>
            <button type="button" onClick={handleApprove}
              className="mtx-tap"
              aria-label={'Aprobar y generar video · ~' + cost + ' créditos'}
              style={{
                appearance: 'none', cursor: 'pointer',
                width: '100%', padding: '12px 14px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--neon), #9b8aff)',
                color: '#0a1410',
                border: 0,
                fontSize: 13, fontWeight: 800,
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '-0.005em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 14px -4px rgba(61,255,209,0.45)',
              }}>
              <span>Aprobar y generar video</span>
              <span style={{
                padding: '2px 7px', borderRadius: 999,
                background: 'rgba(10,20,16,0.20)',
                fontSize: 10, fontWeight: 700,
              }}>~{cost} créditos · ~{Math.round(sb.scenes.length * model.etaSecPerScene / 60)}min</span>
            </button>
          </div>
        )}

        {/* Scene detail sheet — abre al tap en una scene card */}
        {openSceneIdx != null && sb.scenes[openSceneIdx] && (
          <IAArtifactSceneDetailSheet
            scene={sb.scenes[openSceneIdx]}
            sceneIdx={openSceneIdx}
            totalScenes={sb.scenes.length}
            storyboardId={storyboardId}
            voiceName={voice.name}
            voiceIcon={voice.previewIcon}
            voiceAccent={voice.accent}
            aspectRatio={sb.aspectRatio}
            approved={approved}
            onClose={function() { setOpenSceneIdx(null); }}
            onChange={bumpVersion}
            onNext={function() { setOpenSceneIdx(Math.min(sb.scenes.length - 1, openSceneIdx + 1)); }}
            onPrev={function() { setOpenSceneIdx(Math.max(0, openSceneIdx - 1)); }}
          />
        )}
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // Sprint A.8 — IAArtifactSceneDetailSheet · popup detalle escena
  // ═══════════════════════════════════════════════════════════════════════════
  // Bottom-sheet inmersivo con:
  //   - Hero visual grande (gradient + icon de la escena)
  //   - Título, número de escena (X de N), mood tag
  //   - Descripción completa (sin truncate)
  //   - Voiceover en blockquote neon
  //   - Metadata: cámara, duración, voz asignada, ratio
  //   - Acciones (si !approved): editar texto, editar voiceover, ajustar duración,
  //     cambiar mood, quitar, agregar después
  //   - Navegación: ← Anterior · Siguiente → (entre escenas del mismo storyboard)
  //
  // Patrón consistente con CoachExportSheet / CoachAttachMenu: portal absolute,
  // backdrop blur, slide-up. Drag handle, ESC para cerrar.
  function IAArtifactSceneDetailSheet(props) {
    var scene = props.scene;
    var sceneIdx = props.sceneIdx;
    var totalScenes = props.totalScenes;
    var storyboardId = props.storyboardId;
    var approved = !!props.approved;

    var editingTitleState = React.useState(false);
    var editingTitle = editingTitleState[0]; var setEditingTitle = editingTitleState[1];
    var titleValueState = React.useState(scene.title);
    var titleValue = titleValueState[0]; var setTitleValue = titleValueState[1];

    var editingVoiceoverState = React.useState(false);
    var editingVoiceover = editingVoiceoverState[0]; var setEditingVoiceover = editingVoiceoverState[1];
    var voiceoverValueState = React.useState(scene.voiceover || '');
    var voiceoverValue = voiceoverValueState[0]; var setVoiceoverValue = voiceoverValueState[1];

    var editingDescState = React.useState(false);
    var editingDesc = editingDescState[0]; var setEditingDesc = editingDescState[1];
    var descValueState = React.useState(scene.description);
    var descValue = descValueState[0]; var setDescValue = descValueState[1];

    var backdropDownRef = React.useRef(false);

    // Sincroniza valores cuando cambia de escena via navegación ← →
    React.useEffect(function() {
      setTitleValue(scene.title);
      setVoiceoverValue(scene.voiceover || '');
      setDescValue(scene.description);
      setEditingTitle(false);
      setEditingVoiceover(false);
      setEditingDesc(false);
    }, [scene.title, scene.description, scene.voiceover]);

    // ESC para cerrar + lock body scroll
    React.useEffect(function() {
      function onKey(e) {
        if (e.isComposing || e.keyCode === 229) return;
        if (e.key === 'Escape') {
          if (editingTitle || editingDesc || editingVoiceover) {
            setEditingTitle(false); setEditingDesc(false); setEditingVoiceover(false);
          } else if (props.onClose) {
            props.onClose();
          }
        } else if (e.key === 'ArrowLeft' && !editingTitle && !editingDesc && !editingVoiceover && props.onPrev) {
          props.onPrev();
        } else if (e.key === 'ArrowRight' && !editingTitle && !editingDesc && !editingVoiceover && props.onNext) {
          props.onNext();
        }
      }
      window.addEventListener('keydown', onKey);
      var prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return function() {
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = prevOverflow;
      };
    }, [editingTitle, editingDesc, editingVoiceover]);

    function commitTitle() {
      if (!window.__mtxVideoGen) return;
      var v = (titleValue || '').trim() || scene.title;
      window.__mtxVideoGen.updateScene(storyboardId, sceneIdx, { title: v });
      setEditingTitle(false);
      if (props.onChange) props.onChange();
    }
    function commitDesc() {
      if (!window.__mtxVideoGen) return;
      var v = (descValue || '').trim() || scene.description;
      window.__mtxVideoGen.updateScene(storyboardId, sceneIdx, { description: v });
      setEditingDesc(false);
      if (props.onChange) props.onChange();
    }
    function commitVoiceover() {
      if (!window.__mtxVideoGen) return;
      window.__mtxVideoGen.updateScene(storyboardId, sceneIdx, { voiceover: voiceoverValue });
      setEditingVoiceover(false);
      if (props.onChange) props.onChange();
    }
    function handleAdjustDuration(delta) {
      if (!window.__mtxVideoGen) return;
      var next = Math.max(1, Math.min(10, scene.durationSec + delta));
      window.__mtxVideoGen.updateScene(storyboardId, sceneIdx, { durationSec: next });
      if (props.onChange) props.onChange();
    }
    function handleRemove() {
      if (!window.__mtxVideoGen) return;
      window.__mtxVideoGen.removeScene(storyboardId, sceneIdx);
      if (props.onChange) props.onChange();
      if (props.onClose) props.onClose();
    }

    var portalRoot = (typeof document !== 'undefined') ? (document.getElementById('mtx-overlay-root') || document.body) : null;
    if (!portalRoot) return null;

    return ReactDOM.createPortal(
      <div
        onMouseDown={function(e) { backdropDownRef.current = e.target === e.currentTarget; }}
        onClick={function(e) {
          if (e.target === e.currentTarget && backdropDownRef.current && props.onClose) props.onClose();
          backdropDownRef.current = false;
        }}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(10,20,16,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1095,
          animation: 'mtx-fade-up .28s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
        role="presentation"
      >
        <div role="dialog" aria-modal="true" aria-label={'Escena ' + (sceneIdx + 1) + ': ' + scene.title}
          style={{
            width: '100%', maxWidth: 440,
            maxHeight: '90%',
            display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(180deg, rgba(18,22,20,0.99), rgba(12,15,14,0.99))',
            borderTop: '0.5px solid rgba(255,255,255,0.10)',
            borderTopLeftRadius: 22, borderTopRightRadius: 22,
            paddingBottom: 34,
            animation: 'mtx-slide-up .3s ease both',
            boxShadow: '0 -16px 40px -8px rgba(0,0,0,0.65)',
            overflow: 'hidden',
          }}>
          {/* Drag handle */}
          <div style={{
            width: 36, height: 4, borderRadius: 999,
            background: 'rgba(255,255,255,0.18)',
            margin: '8px auto 8px', flexShrink: 0,
          }} aria-hidden="true"/>

          {/* Hero visual */}
          <div style={{
            margin: '4px 16px 0',
            borderRadius: 14, overflow: 'hidden',
            aspectRatio: props.aspectRatio === '9:16' ? '16/9' : (props.aspectRatio === '16:9' ? '16/8' : '4/3'),
            position: 'relative',
            background: 'linear-gradient(135deg, ' + scene.thumbnailColor + ', rgba(0,0,0,0.55))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '0.5px solid rgba(255,255,255,0.10)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 64, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.45))' }} aria-hidden="true">{scene.thumbnailIcon}</span>
            {/* Scene number badge top-left */}
            <div style={{
              position: 'absolute', top: 10, left: 10,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em',
              color: 'white',
            }}>
              ESCENA {sceneIdx + 1} <span style={{ opacity: 0.55 }}>DE {totalScenes}</span>
            </div>
            {/* Mood tag top-right */}
            <div style={{
              position: 'absolute', top: 10, right: 10,
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
              fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em',
              color: 'white',
            }}>{(scene.moodTag || '').toUpperCase()}</div>
            {/* Duration bottom-right */}
            <div style={{
              position: 'absolute', bottom: 10, right: 10,
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
              fontSize: 11, fontWeight: 700,
              color: 'white', fontFamily: 'var(--ff-mono, monospace)',
            }}>{scene.durationSec}s</div>
          </div>

          {/* Scroll area */}
          <div style={{
            flex: 1, minHeight: 0, overflowY: 'auto',
            padding: '14px 18px 8px',
          }} className="mtx-no-scrollbar">
            {/* Title */}
            {editingTitle ? (
              <div>
                <input
                  type="text"
                  value={titleValue}
                  onChange={function(e) { setTitleValue(e.target.value); }}
                  onBlur={commitTitle}
                  onKeyDown={function(e) { if (e.key === 'Enter') commitTitle(); }}
                  autoFocus
                  aria-label="Editar título de escena"
                  style={{
                    width: '100%', padding: '8px 10px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(61,255,209,0.30)',
                    color: 'var(--ink-1)',
                    fontSize: 17, fontWeight: 800,
                    fontFamily: 'var(--ff-sans)',
                    letterSpacing: '-0.01em',
                    outline: 'none',
                  }}/>
              </div>
            ) : (
              <div
                role={approved ? undefined : 'button'}
                tabIndex={approved ? undefined : 0}
                onClick={function() { if (!approved) setEditingTitle(true); }}
                onKeyDown={function(e) { if (!approved && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setEditingTitle(true); } }}
                style={{
                  fontSize: 17, fontWeight: 800,
                  color: 'var(--ink-1)', fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.01em',
                  cursor: approved ? 'default' : 'text',
                  padding: '4px 6px', borderRadius: 8,
                  marginLeft: -6, marginRight: -6,
                  transition: 'background .15s',
                }}>{scene.title}{!approved && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>✎</span>}</div>
            )}

            {/* Description */}
            <div style={{
              marginTop: 14,
              fontSize: 10, color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.08em', fontWeight: 700,
              marginBottom: 6,
            }}>DESCRIPCIÓN</div>
            {editingDesc ? (
              <textarea
                value={descValue}
                onChange={function(e) { setDescValue(e.target.value); }}
                onBlur={commitDesc}
                rows={3}
                autoFocus
                aria-label="Editar descripción"
                style={{
                  width: '100%', padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(61,255,209,0.30)',
                  color: 'var(--ink-1)',
                  fontSize: 13,
                  fontFamily: 'var(--ff-sans)',
                  lineHeight: 1.5,
                  outline: 'none', resize: 'vertical',
                  boxSizing: 'border-box',
                }}/>
            ) : (
              <div
                role={approved ? undefined : 'button'}
                tabIndex={approved ? undefined : 0}
                onClick={function() { if (!approved) setEditingDesc(true); }}
                onKeyDown={function(e) { if (!approved && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setEditingDesc(true); } }}
                style={{
                  fontSize: 13, color: 'var(--ink-2)',
                  fontFamily: 'var(--ff-sans)',
                  lineHeight: 1.5,
                  cursor: approved ? 'default' : 'text',
                  padding: '6px 6px', borderRadius: 8,
                  marginLeft: -6, marginRight: -6,
                }}>{scene.description}{!approved && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--ink-3)' }}>✎</span>}</div>
            )}

            {/* Voiceover */}
            <div style={{
              marginTop: 16,
              fontSize: 10, color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.08em', fontWeight: 700,
              marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>VOICEOVER</span>
              <span style={{ color: props.voiceAccent || 'var(--neon)' }}>·</span>
              <span style={{ letterSpacing: '0.02em', textTransform: 'none', fontWeight: 600 }}>voz {props.voiceName} {props.voiceIcon}</span>
            </div>
            {editingVoiceover ? (
              <textarea
                value={voiceoverValue}
                onChange={function(e) { setVoiceoverValue(e.target.value); }}
                onBlur={commitVoiceover}
                rows={2}
                autoFocus
                aria-label="Editar voiceover"
                placeholder="Lo que dirá la voz en esta escena…"
                style={{
                  width: '100%', padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(61,255,209,0.04)',
                  border: '0.5px solid rgba(61,255,209,0.30)',
                  color: 'var(--ink-1)',
                  fontSize: 13, fontStyle: 'italic',
                  fontFamily: 'var(--ff-sans)',
                  lineHeight: 1.5,
                  outline: 'none', resize: 'vertical',
                  boxSizing: 'border-box',
                }}/>
            ) : (
              <div
                role={approved ? undefined : 'button'}
                tabIndex={approved ? undefined : 0}
                onClick={function() { if (!approved) setEditingVoiceover(true); }}
                onKeyDown={function(e) { if (!approved && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setEditingVoiceover(true); } }}
                style={{
                  fontSize: 13, color: scene.voiceover ? 'var(--neon)' : 'var(--ink-3)',
                  fontFamily: 'var(--ff-sans)',
                  lineHeight: 1.45, fontStyle: 'italic',
                  paddingLeft: 10,
                  borderLeft: '2.5px solid rgba(61,255,209,0.30)',
                  cursor: approved ? 'default' : 'text',
                  borderRadius: '0 6px 6px 0',
                }}>{scene.voiceover ? '"' + scene.voiceover + '"' : '(Sin voiceover · tap para agregar)'}{!approved && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--ink-3)', fontStyle: 'normal' }}>✎</span>}</div>
            )}

            {/* Metadata grid */}
            <div style={{
              marginTop: 18,
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            }}>
              <_SceneMetaTile label="Cámara" value={scene.cameraAngle || 'medio'} icon="🎥"/>
              <_SceneMetaTile label="Duración" value={scene.durationSec + 's'} icon="⏱"/>
              <_SceneMetaTile label="Mood" value={scene.moodTag || 'neutral'} icon="🎭"/>
              <_SceneMetaTile label="Aspect" value={props.aspectRatio || '9:16'} icon="📐"/>
            </div>

            {/* Duration adjust (sólo si !approved) */}
            {!approved && (
              <div style={{
                marginTop: 14,
                padding: '10px 12px',
                borderRadius: 11,
                background: 'rgba(255,255,255,0.025)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                  color: 'var(--ink-3)', fontFamily: 'var(--ff-sans)',
                }}>AJUSTAR DURACIÓN</span>
                <div style={{ flex: 1 }}/>
                <button type="button" onClick={function() { handleAdjustDuration(-1); }}
                  aria-label="Reducir duración"
                  className="mtx-tap"
                  style={Object.assign(_microBtnStyle(), { padding: '6px 10px', fontSize: 14 })}>−</button>
                <span style={{
                  padding: '4px 12px', borderRadius: 7,
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--ink-1)', fontWeight: 700,
                  fontFamily: 'var(--ff-mono, monospace)',
                  minWidth: 40, textAlign: 'center', fontSize: 13,
                }}>{scene.durationSec}s</span>
                <button type="button" onClick={function() { handleAdjustDuration(1); }}
                  aria-label="Aumentar duración"
                  className="mtx-tap"
                  style={Object.assign(_microBtnStyle(), { padding: '6px 10px', fontSize: 14 })}>+</button>
              </div>
            )}
          </div>

          {/* Bottom action row — nav + remove */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px 4px',
            borderTop: '0.5px solid rgba(255,255,255,0.05)',
            flexShrink: 0,
          }}>
            <button type="button"
              onClick={props.onPrev}
              disabled={sceneIdx === 0}
              aria-label="Escena anterior"
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: sceneIdx === 0 ? 'default' : 'pointer',
                padding: '8px 10px', borderRadius: 9,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                color: sceneIdx === 0 ? 'var(--ink-3)' : 'var(--ink-1)',
                opacity: sceneIdx === 0 ? 0.4 : 1,
                fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>← Anterior</button>
            <button type="button"
              onClick={props.onNext}
              disabled={sceneIdx === totalScenes - 1}
              aria-label="Escena siguiente"
              className="mtx-tap"
              style={{
                appearance: 'none', cursor: sceneIdx === totalScenes - 1 ? 'default' : 'pointer',
                padding: '8px 10px', borderRadius: 9,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                color: sceneIdx === totalScenes - 1 ? 'var(--ink-3)' : 'var(--ink-1)',
                opacity: sceneIdx === totalScenes - 1 ? 0.4 : 1,
                fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--ff-sans)',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>Siguiente →</button>
            <div style={{ flex: 1 }}/>
            {!approved && (
              <button type="button"
                onClick={handleRemove}
                aria-label="Quitar esta escena"
                className="mtx-tap"
                style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '8px 12px', borderRadius: 9,
                  background: 'rgba(255,139,139,0.08)',
                  border: '0.5px solid rgba(255,139,139,0.22)',
                  color: '#ff8b8b',
                  fontSize: 12, fontWeight: 700,
                  fontFamily: 'var(--ff-sans)',
                }}>🗑 Quitar</button>
            )}
          </div>
        </div>
      </div>,
      portalRoot
    );
  }

  function _SceneMetaTile(props) {
    return (
      <div style={{
        padding: '10px 11px', borderRadius: 10,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <div style={{
          fontSize: 10, color: 'var(--ink-3)',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '0.06em', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span aria-hidden="true">{props.icon}</span>
          {props.label.toUpperCase()}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: 'var(--ink-1)', fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
        }}>{props.value}</div>
      </div>
    );
  }

  function _microBtnStyle() {
    return {
      appearance: 'none', cursor: 'pointer',
      padding: '3px 7px', borderRadius: 6,
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(255,255,255,0.06)',
      color: 'var(--ink-2)', fontSize: 11, fontWeight: 600,
      fontFamily: 'var(--ff-sans)',
      lineHeight: 1,
    };
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // Sprint A.8 — IAArtifactVoicePicker · voice picker para storyboard
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape: { kind: 'voice_picker', storyboardId }
  //
  // Muestra grid 2-col de 8 voces con preview (mock: pulse animation). Tap
  // selecciona, dispatch mtx:storyboard-voice-picked.
  function IAArtifactVoicePicker(props) {
    var art = props.artifact || {};
    var storyboardId = art.storyboardId;
    var sb = window.__mtxVideoGen && window.__mtxVideoGen.getStoryboard(storyboardId);

    var selectedState = React.useState(sb ? sb.voiceId : 'sage_warm');
    var selected = selectedState[0]; var setSelected = selectedState[1];
    var playingState = React.useState(null);  // voiceId currently "playing" preview
    var playing = playingState[0]; var setPlaying = playingState[1];

    React.useEffect(function() {
      if (!playing) return;
      var t = setTimeout(function() { setPlaying(null); }, 1800);
      return function() { clearTimeout(t); };
    }, [playing]);

    if (!sb || !window.__mtxVideoGen) return null;

    var voices = window.__mtxVideoGen.listVoices();

    function handlePick(voiceId) {
      setSelected(voiceId);
      window.__mtxVideoGen.setVoice(storyboardId, voiceId);
      window.dispatchEvent(new CustomEvent('mtx:storyboard-voice-picked', { detail: {
        storyboardId: storyboardId, voiceId: voiceId,
      }}));
    }
    function handlePreview(voiceId, e) {
      e.stopPropagation();
      setPlaying(voiceId);
    }

    return (
      <div style={{
        borderRadius: 16,
        border: '0.5px solid rgba(155,138,255,0.20)',
        background: 'linear-gradient(180deg, rgba(28,22,42,0.55), rgba(12,10,18,0.85))',
        padding: '14px 14px 12px',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(155,138,255,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15,
          }} aria-hidden="true">🎙️</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: 'var(--ink-1)', fontFamily: 'var(--ff-sans)',
            }}>Elegí la voz del narrador</div>
            <div style={{
              fontSize: 10.5, color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)', marginTop: 1,
            }}>Tap para preview · doble tap para elegir</div>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7,
        }}>
          {voices.map(function(v) {
            var active = v.id === selected;
            var isPlaying = playing === v.id;
            return (
              <button key={v.id} type="button"
                onClick={function() { handlePick(v.id); }}
                onDoubleClick={function() { handlePick(v.id); }}
                className="mtx-tap"
                aria-label={'Voz ' + v.name + ' · ' + v.tagline}
                aria-pressed={active}
                style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '10px 10px',
                  borderRadius: 11,
                  background: active ? 'rgba(61,255,209,0.08)' : 'rgba(255,255,255,0.03)',
                  border: '0.5px solid ' + (active ? 'rgba(61,255,209,0.30)' : 'rgba(255,255,255,0.06)'),
                  color: 'inherit', textAlign: 'left',
                  transition: 'background .15s, border-color .15s',
                  position: 'relative',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: isPlaying ? v.accent : 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                    animation: isPlaying ? 'mtx-pulse-soft 0.6s ease-in-out infinite' : 'none',
                  }} aria-hidden="true">{v.previewIcon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      color: 'var(--ink-1)', fontFamily: 'var(--ff-sans)',
                      letterSpacing: '-0.005em',
                    }}>{v.name}</div>
                    <div style={{
                      fontSize: 9.5, color: 'var(--ink-3)',
                      fontFamily: 'var(--ff-sans)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{v.tagline}</div>
                  </div>
                  {active && (
                    <span style={{
                      fontSize: 11, color: 'var(--neon)', fontWeight: 800,
                    }} aria-hidden="true">✓</span>
                  )}
                </div>
                {/* Mini wave preview button */}
                <div onClick={function(e) { handlePreview(v.id, e); }}
                  role="button"
                  tabIndex={0}
                  aria-label={'Preview voz ' + v.name}
                  onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePreview(v.id, e); } }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    height: 16, paddingLeft: 34, cursor: 'pointer',
                  }}>
                  {Array.from({ length: 14 }).map(function(_, i) {
                    var h = 4 + Math.sin((i + v.id.length) * 1.4) * 5 + 5;
                    return (
                      <span key={i} style={{
                        display: 'inline-block',
                        width: 2, height: isPlaying ? h + Math.abs(Math.sin(Date.now() / 100 + i) * 3) : h,
                        background: isPlaying ? v.accent : 'rgba(255,255,255,0.18)',
                        borderRadius: 2,
                        transition: 'height .15s, background .15s',
                      }}/>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // Sprint A.8 — IAArtifactVideoGenJob · progreso video gen multi-stage
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape: { kind: 'video_gen_job', jobId, storyboardId, state: 'live'|'done' }
  function IAArtifactVideoGenJob(props) {
    var art = props.artifact || {};
    var jobId = art.jobId;
    var storyboardId = art.storyboardId;

    var snapshotState = React.useState(function() {
      return (window.__mtxVideoGen && jobId) ? window.__mtxVideoGen.pollJob(jobId) : null;
    });
    var snap = snapshotState[0]; var setSnap = snapshotState[1];

    React.useEffect(function() {
      if (!jobId) return;
      function onProgress(e) {
        if (!e.detail || e.detail.jobId !== jobId) return;
        if (window.__mtxVideoGen) setSnap(window.__mtxVideoGen.pollJob(jobId));
      }
      function onDone(e) {
        if (!e.detail || e.detail.jobId !== jobId) return;
        if (window.__mtxVideoGen) setSnap(window.__mtxVideoGen.pollJob(jobId));
      }
      function onError(e) {
        if (!e.detail || e.detail.jobId !== jobId) return;
        if (window.__mtxVideoGen) setSnap(window.__mtxVideoGen.pollJob(jobId));
      }
      window.addEventListener('mtx:video-gen-progress', onProgress);
      window.addEventListener('mtx:video-gen-done', onDone);
      window.addEventListener('mtx:video-gen-error', onError);
      return function() {
        window.removeEventListener('mtx:video-gen-progress', onProgress);
        window.removeEventListener('mtx:video-gen-done', onDone);
        window.removeEventListener('mtx:video-gen-error', onError);
      };
    }, [jobId]);

    if (!snap) {
      return (
        <div style={{
          padding: 14, borderRadius: 14,
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          fontSize: 12, color: 'var(--ink-3)',
          fontFamily: 'var(--ff-sans)',
        }}>Cargando job…</div>
      );
    }

    if (snap.status === 'done' && snap.resultUrl) {
      return <IAArtifactVideoResult artifact={Object.assign({}, art, {
        resultUrl: snap.resultUrl, state: 'done',
      })}/>;
    }

    var pct = snap.progress;
    var stageLabel = snap.stageLabel || 'Procesando';
    var totalScenes = snap.totalScenes;
    var currentSceneIdx = snap.currentSceneIdx;

    function handleCancel() {
      if (window.__mtxVideoGen) window.__mtxVideoGen.cancelJob(jobId);
    }

    var isError = snap.status === 'error' || snap.status === 'cancelled';

    return (
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        border: '0.5px solid rgba(155,138,255,0.20)',
        background: 'linear-gradient(180deg, rgba(28,22,42,0.55), rgba(12,10,18,0.85))',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {/* Skeleton hero — 16:9 mockup */}
        <div style={{
          width: '100%', aspectRatio: '9/16',
          maxHeight: 280,
          background: 'linear-gradient(135deg, rgba(155,138,255,0.12), rgba(61,255,209,0.06), rgba(10,20,16,0.85))',
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {/* Shimmer */}
          <div style={{
            position: 'absolute', top: 0, left: '-30%', height: '100%', width: '30%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
            animation: 'mtx-shimmer 1.8s ease-in-out infinite',
          }}/>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 38, animation: 'mtx-pulse-soft 1.6s ease-in-out infinite' }} aria-hidden="true">🎬</div>
            {!isError && totalScenes > 0 && currentSceneIdx != null && (
              <div style={{
                display: 'flex', gap: 4,
              }}>
                {Array.from({ length: totalScenes }).map(function(_, i) {
                  var done = i < currentSceneIdx;
                  var current = i === currentSceneIdx;
                  return (
                    <span key={i} style={{
                      width: 16, height: 4, borderRadius: 2,
                      background: done ? 'var(--neon)' : (current ? '#9b8aff' : 'rgba(255,255,255,0.12)'),
                      boxShadow: current ? '0 0 6px #9b8aff' : 'none',
                      transition: 'background .25s',
                    }}/>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Stage label + progress */}
        <div style={{ padding: '14px 16px 14px' }}>
          <div style={{
            fontSize: 12, fontWeight: 700,
            color: isError ? '#ff8b8b' : 'var(--ink-1)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            marginBottom: 4,
          }}>{isError ? 'Generación cancelada' : stageLabel}</div>
          <div style={{
            fontSize: 10.5, color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            marginBottom: 10,
          }}>{isError ? 'Podés volver a intentarlo desde el storyboard' : 'Esto toma 1-3 minutos · estimado por el modelo'}</div>
          {!isError && (
            <div>
              <div style={{
                position: 'relative',
                width: '100%', height: 4, borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
                marginBottom: 8,
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: pct + '%',
                  background: 'linear-gradient(90deg, var(--neon), #9b8aff)',
                  transition: 'width .4s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 0 8px rgba(155,138,255,0.45)',
                }}/>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 10.5, color: 'var(--ink-3)',
                fontFamily: 'var(--ff-sans)',
              }}>
                <span>{pct}%</span>
                <button type="button" onClick={handleCancel}
                  aria-label="Cancelar generación de video"
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: '2px 8px', borderRadius: 6,
                    background: 'transparent',
                    border: '0.5px solid rgba(255,255,255,0.10)',
                    color: 'var(--ink-3)', fontSize: 10, fontWeight: 600,
                    fontFamily: 'var(--ff-sans)',
                  }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // Sprint A.8 — IAArtifactVideoResult · video listo con player
  // ═══════════════════════════════════════════════════════════════════════════
  // Shape: { kind: 'video_result', resultUrl, storyboardId? }
  //
  // resultUrl es un objeto compuesto (mock) con coverDataUrl + scenes + voiceId.
  // Cuando llegue backend, será un .mp4 URL real — el componente sólo cambia
  // el modo de render del media (de SVG cover a <video> tag).
  function IAArtifactVideoResult(props) {
    var art = props.artifact || {};
    var data = art.resultUrl || {};
    var coverUrl = data.coverDataUrl;
    var duration = data.durationSec || 0;
    var scenes = data.scenes || [];

    var playingState = React.useState(false);
    var playing = playingState[0]; var setPlaying = playingState[1];
    var progressState = React.useState(0);
    var progress = progressState[0]; var setProgress = progressState[1];
    var savedState = React.useState(false);
    var saved = savedState[0]; var setSaved = savedState[1];

    // Mock playback: cuando playing=true, avanza progress de 0 a 100 en duration
    React.useEffect(function() {
      if (!playing) return;
      var startedAt = Date.now() - (progress / 100) * duration * 1000;
      var raf;
      var tick = function() {
        var elapsed = (Date.now() - startedAt) / 1000;
        var pct = Math.min(100, (elapsed / duration) * 100);
        setProgress(pct);
        if (pct < 100) raf = requestAnimationFrame(tick);
        else { setPlaying(false); setTimeout(function() { setProgress(0); }, 500); }
      };
      raf = requestAnimationFrame(tick);
      return function() { if (raf) cancelAnimationFrame(raf); };
    }, [playing]);

    function handlePlay() { setPlaying(function(p) { return !p; }); }
    function handleSave() {
      setSaved(true);
      if (window.__mtxToast && window.__mtxToast.show) {
        window.__mtxToast.show('Guardado en tu biblioteca', { kind: 'success', durationMs: 1800 });
      }
    }
    function handleDownload() {
      if (window.__mtxToast && window.__mtxToast.show) {
        window.__mtxToast.show('Descarga iniciada · ' + Math.round(duration) + 's de video', { kind: 'info', durationMs: 2000 });
      }
    }
    function handleShare() {
      if (window.__mtxToast && window.__mtxToast.show) {
        window.__mtxToast.show('Link copiado al portapapeles', { kind: 'success', durationMs: 1800 });
      }
    }
    function handleRegenerate() {
      if (!data.scenes || !art.storyboardId || !window.__mtxVideoGen) return;
      window.__mtxVideoGen.submitVideo(art.storyboardId).then(function(res) {
        window.dispatchEvent(new CustomEvent('mtx:video-gen-restart', { detail: {
          jobId: res.jobId, storyboardId: art.storyboardId,
        }}));
      });
    }

    return (
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.02)',
        animation: 'mtx-fade-up .35s ease both',
      }}>
        {/* Video frame */}
        <div style={{
          position: 'relative', width: '100%',
          aspectRatio: '9/16', maxHeight: 360,
          background: '#000',
          backgroundImage: coverUrl ? 'url(' + coverUrl + ')' : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          {/* Center play button overlay */}
          <button type="button" onClick={handlePlay}
            className="mtx-tap"
            aria-label={playing ? 'Pausar video' : 'Reproducir video'}
            style={{
              position: 'absolute', inset: 0,
              appearance: 'none', cursor: 'pointer',
              background: 'rgba(0,0,0,0.18)',
              border: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            }}>
              {playing ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ width: 5, height: 22, background: 'white', borderRadius: 2 }}/>
                  <span style={{ width: 5, height: 22, background: 'white', borderRadius: 2 }}/>
                </div>
              ) : (
                <div style={{
                  width: 0, height: 0,
                  borderTop: '14px solid transparent',
                  borderBottom: '14px solid transparent',
                  borderLeft: '22px solid white',
                  marginLeft: 5,
                }}/>
              )}
            </div>
          </button>
          {/* Bottom: progress + duration */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '12px 14px 12px',
            background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.65))',
          }}>
            <div style={{
              width: '100%', height: 3, borderRadius: 999,
              background: 'rgba(255,255,255,0.18)',
              overflow: 'hidden', marginBottom: 6,
            }}>
              <div style={{
                width: progress + '%', height: '100%',
                background: 'var(--neon)',
                boxShadow: '0 0 6px var(--neon)',
                transition: 'width .1s linear',
              }}/>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10.5, color: 'white', fontWeight: 600,
              fontFamily: 'var(--ff-mono, monospace)',
            }}>
              <span>{_fmtDuration(Math.round((progress / 100) * duration))}</span>
              <span style={{ opacity: 0.65 }}>{_fmtDuration(Math.round(duration))}</span>
            </div>
          </div>
          {/* Top-right badge */}
          <div style={{
            position: 'absolute', top: 12, right: 12,
            padding: '4px 9px', borderRadius: 999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
            color: 'rgba(255,255,255,0.9)',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ color: 'var(--neon)' }}>✦</span>
            GENERADO · {scenes.length} ESCENAS
          </div>
        </div>
        {/* Actions */}
        <div style={{ padding: '12px 14px 14px' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <_GenActionPill icon="🔄" label="Regenerar" onClick={handleRegenerate}/>
            <_GenActionPill icon={saved ? '★' : '☆'} label={saved ? 'Guardado' : 'Guardar'} onClick={handleSave} active={saved}/>
            <_GenActionPill icon="⬇" label="Descargar" onClick={handleDownload}/>
            <_GenActionPill icon="📤" label="Compartir" onClick={handleShare}/>
          </div>
        </div>
      </div>
    );
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // IAArtifact — router por kind
  // ═══════════════════════════════════════════════════════════════════════════
  function IAArtifact(props) {
    var art = props.artifact;
    if (!art || !art.kind) return null;
    switch (art.kind) {
      // Legacy (5)
      case 'image':                return <IAArtifactImage artifact={art}/>;
      case 'voice':                return <IAArtifactVoice artifact={art}/>;
      case 'content':              return <IAArtifactContent artifact={art}/>;
      case 'calendar':             return <IAArtifactCalendar artifact={art}/>;
      case 'reminder':             return <IAArtifactReminder artifact={art}/>;
      // RFC-001 Semana 1 (3)
      case 'plan_card':            return <IAArtifactPlanCard artifact={art}/>;
      case 'confirmation_card':    return <IAArtifactConfirmationCard artifact={art}/>;
      case 'recommendation_card':  return <IAArtifactRecommendationCard artifact={art}/>;
      // RFC-001 Semana 2 (18)
      case 'insight_card':         return <IAArtifactInsightCard artifact={art}/>;
      case 'stats_compact':        return <IAArtifactStatsCompact artifact={art}/>;
      case 'step_by_step':         return <IAArtifactStepByStep artifact={art}/>;
      case 'crisis_support_card':  return <IAArtifactCrisisSupportCard artifact={art}/>;
      case 'quote_card':           return <IAArtifactQuoteCard artifact={art}/>;
      case 'progress_viz':         return <IAArtifactProgressViz artifact={art}/>;
      case 'comparison_table':     return <IAArtifactComparisonTable artifact={art}/>;
      case 'recommendation_list':  return <IAArtifactRecommendationList artifact={art}/>;
      case 'memory_recall_card':   return <IAArtifactMemoryRecallCard artifact={art}/>;
      case 'timeline_mini':        return <IAArtifactTimelineMini artifact={art}/>;
      case 'calendar_mini':        return <IAArtifactCalendarMini artifact={art}/>;
      case 'error_gentle':         return <IAArtifactErrorGentle artifact={art}/>;
      case 'loading_skeleton':     return <IAArtifactLoadingSkeleton artifact={art}/>;
      case 'audio_waveform':       return <IAArtifactAudioWaveform artifact={art}/>;
      case 'map_mini':             return <IAArtifactMapMini artifact={art}/>;
      case 'image_inline':         return <IAArtifactImageInline artifact={art}/>;
      case 'video_inline':         return <IAArtifactVideoInline artifact={art}/>;
      case 'mermaid_diagram':      return <IAArtifactMermaidDiagram artifact={art}/>;
      // RFC-001 Addendum A · Sprint A.5 (7 artifacts especializados)
      case 'source_list':              return <IAArtifactSourceList artifact={art}/>;
      case 'article_summary':          return <IAArtifactArticleSummary artifact={art}/>;
      case 'thinking_panel':           return <IAArtifactThinkingPanel artifact={art}/>;
      case 'integration_action_card':  return <IAArtifactIntegrationActionCard artifact={art}/>;
      case 'browse_progress_card':     return <IAArtifactBrowseProgressCard artifact={art} msgId={props.msgId}/>;
      case 'voice_call_overlay':       return <IAArtifactVoiceCallOverlay artifact={art}/>;
      case 'screen_share_preview':     return <IAArtifactScreenSharePreview artifact={art}/>;
      // RFC-001 Addendum A · Sprint A.8 — generative media (6 artifacts)
      case 'image_gen_job':            return <IAArtifactImageGenJob artifact={art}/>;
      case 'image_result':             return <IAArtifactImageResult artifact={art}/>;
      case 'storyboard_draft':         return <IAArtifactStoryboardDraft artifact={art}/>;
      case 'voice_picker':             return <IAArtifactVoicePicker artifact={art}/>;
      case 'video_gen_job':            return <IAArtifactVideoGenJob artifact={art}/>;
      case 'video_result':             return <IAArtifactVideoResult artifact={art}/>;
      default:                     return null;
    }
  }


  // ── Inject CSS keyframes para skeleton + progress (idempotente) ──────────
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('mtx-coach-artifacts-styles')) return;
    var style = document.createElement('style');
    style.id = 'mtx-coach-artifacts-styles';
    style.textContent = [
      '@keyframes mtx-skeleton-pulse {',
      '  0%, 100% { opacity: 0.5; }',
      '  50% { opacity: 1; }',
      '}',
      '@keyframes mtx-progress-fill {',
      '  from { width: 0%; }',
      '  /* to defined inline via style.width */',
      '}',
      // Sprint A.8 — keyframes para image_gen_job / video_gen_job
      // Shimmer bar que cruza el hero del skeleton durante generación
      '@keyframes mtx-shimmer {',
      '  0% { transform: translateX(0); }',
      '  100% { transform: translateX(450%); }',
      '}',
      // Soft pulse para iconos centrales del skeleton
      '@keyframes mtx-pulse-soft {',
      '  0%, 100% { opacity: 0.7; transform: scale(0.96); }',
      '  50% { opacity: 1; transform: scale(1.04); }',
      '}',
      // B4 — keyframes para thinking_panel live
      // Decantando: panel breathing sutil
      '@keyframes mtx-think-breathe {',
      '  0%, 100% { background-position: 0% 50%; }',
      '  50% { background-position: 100% 50%; }',
      '}',
      // Brain icon pulse — escala + glow expandido
      '@keyframes mtx-think-brain-pulse {',
      '  0%, 100% { transform: scale(1); box-shadow: 0 0 12px rgba(255,255,255,0.05); }',
      '  50% { transform: scale(1.06); box-shadow: 0 0 18px currentColor; }',
      '}',
      // Dots del header — pulso individual con stagger
      '@keyframes mtx-think-dot {',
      '  0%, 100% { opacity: 0.3; transform: scale(0.85); }',
      '  50% { opacity: 1; transform: scale(1.15); }',
      '}',
      // Thought entry — slide-up suave con bounce mínimo
      '@keyframes mtx-think-thought-in {',
      '  from { opacity: 0; transform: translateY(8px) scale(0.97); }',
      '  to { opacity: 1; transform: translateY(0) scale(1); }',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  })();


  // ── Export ─────────────────────────────────────────────────────────────────
  Object.assign(window, {
    IAArtifact: IAArtifact,
    // Legacy
    IAArtifactImage: IAArtifactImage,
    IAArtifactVoice: IAArtifactVoice,
    IAArtifactContent: IAArtifactContent,
    IAArtifactCalendar: IAArtifactCalendar,
    IAArtifactReminder: IAArtifactReminder,
    // Semana 1
    IAArtifactPlanCard: IAArtifactPlanCard,
    IAArtifactConfirmationCard: IAArtifactConfirmationCard,
    IAArtifactRecommendationCard: IAArtifactRecommendationCard,
    // Semana 2
    IAArtifactInsightCard: IAArtifactInsightCard,
    IAArtifactStatsCompact: IAArtifactStatsCompact,
    IAArtifactStepByStep: IAArtifactStepByStep,
    IAArtifactCrisisSupportCard: IAArtifactCrisisSupportCard,
    IAArtifactQuoteCard: IAArtifactQuoteCard,
    IAArtifactProgressViz: IAArtifactProgressViz,
    IAArtifactComparisonTable: IAArtifactComparisonTable,
    IAArtifactRecommendationList: IAArtifactRecommendationList,
    IAArtifactMemoryRecallCard: IAArtifactMemoryRecallCard,
    IAArtifactTimelineMini: IAArtifactTimelineMini,
    IAArtifactCalendarMini: IAArtifactCalendarMini,
    IAArtifactErrorGentle: IAArtifactErrorGentle,
    IAArtifactLoadingSkeleton: IAArtifactLoadingSkeleton,
    IAArtifactAudioWaveform: IAArtifactAudioWaveform,
    IAArtifactMapMini: IAArtifactMapMini,
    IAArtifactImageInline: IAArtifactImageInline,
    IAArtifactVideoInline: IAArtifactVideoInline,
    IAArtifactMermaidDiagram: IAArtifactMermaidDiagram,
    // Sprint A.5
    IAArtifactSourceList: IAArtifactSourceList,
    IAArtifactArticleSummary: IAArtifactArticleSummary,
    IAArtifactThinkingPanel: IAArtifactThinkingPanel,
    IAArtifactIntegrationActionCard: IAArtifactIntegrationActionCard,
    IAArtifactBrowseProgressCard: IAArtifactBrowseProgressCard,
    IAArtifactVoiceCallOverlay: IAArtifactVoiceCallOverlay,
    IAArtifactScreenSharePreview: IAArtifactScreenSharePreview,
  });
})();
