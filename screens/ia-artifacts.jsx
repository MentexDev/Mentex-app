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
  // IAArtifact — router por kind
  // ═══════════════════════════════════════════════════════════════════════════
  function IAArtifact(props) {
    var art = props.artifact;
    if (!art || !art.kind) return null;
    switch (art.kind) {
      case 'image':                return <IAArtifactImage artifact={art}/>;
      case 'voice':                return <IAArtifactVoice artifact={art}/>;
      case 'content':              return <IAArtifactContent artifact={art}/>;
      case 'calendar':             return <IAArtifactCalendar artifact={art}/>;
      case 'reminder':             return <IAArtifactReminder artifact={art}/>;
      // RFC-001 Semana 1 — 3 artefactos críticos
      case 'plan_card':            return <IAArtifactPlanCard artifact={art}/>;
      case 'confirmation_card':    return <IAArtifactConfirmationCard artifact={art}/>;
      case 'recommendation_card':  return <IAArtifactRecommendationCard artifact={art}/>;
      default:                     return null;
    }
  }


  // ── Export ─────────────────────────────────────────────────────────────────
  Object.assign(window, {
    IAArtifact: IAArtifact,
    IAArtifactImage: IAArtifactImage,
    IAArtifactVoice: IAArtifactVoice,
    IAArtifactContent: IAArtifactContent,
    IAArtifactCalendar: IAArtifactCalendar,
    IAArtifactReminder: IAArtifactReminder,
    // RFC-001 Semana 1
    IAArtifactPlanCard: IAArtifactPlanCard,
    IAArtifactConfirmationCard: IAArtifactConfirmationCard,
    IAArtifactRecommendationCard: IAArtifactRecommendationCard,
  });
})();
