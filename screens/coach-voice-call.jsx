// screens/coach-voice-call.jsx — Sprint A.6 · B7 · voice_call overlay fullscreen
// ─────────────────────────────────────────────────────────────────────────────
// Overlay fullscreen para llamada de voz con el coach Mentex. Replica el feel
// de FaceTime/WhatsApp voice call + waveform live + transcript scrolleable.
//
// Estado del overlay:
//   • Trigger: window.dispatchEvent('mtx:open-voice-call', { detail: { convId, prompt } })
//   • Close: window.dispatchEvent('mtx:close-voice-call') o tap hang up
//
// State machine interno:
//   connecting (700ms) → active (turnos alternados) → ended (animación fade-out)
//
// Simulación de turnos (mock — Brandon conectará Vercel AI SDK + ElevenLabs):
//   • coach: speaks 3-5s · waveform NEON · transcript crece
//   • user:  listens 2-4s · waveform PURPLE · transcript crece
//   • Pattern: 4 turnos (coach → user → coach → user) que duran ~16-22s totales
//   • Después del último turno, sigue en "idle listening" hasta que user hang up
//
// API pública:
//   window.__mtxVoiceCall = {
//     open(convId, prompt)  — programmatic trigger
//     close()                — programmatic close
//     isOpen()               — bool
//   }
//
// Cuando llegue backend (Sprint B):
//   • _simulateTurns() → reemplazar por stream del Vercel AI SDK voice
//   • _generateWaveform() → reemplazar por audio level analyzer real
//   • El resto del UI no cambia.
// ─────────────────────────────────────────────────────────────────────────────


(function() {
  if (typeof window === 'undefined' || window.__mtxVoiceCall) return;

  // ─ State global ────────────────────────────────────────────────────────────
  var _isOpen = false;
  var _currentConvId = null;
  var _initialPrompt = null;

  function _open(convId, prompt) {
    _currentConvId = convId || null;
    _initialPrompt = prompt || null;
    _isOpen = true;
    window.dispatchEvent(new CustomEvent('mtx:voice-call-state', {
      detail: { open: true, convId: _currentConvId, prompt: _initialPrompt },
    }));
  }

  function _close() {
    if (!_isOpen) return;
    _isOpen = false;
    window.dispatchEvent(new CustomEvent('mtx:voice-call-state', {
      detail: { open: false },
    }));
  }

  function _isOpenFn() { return _isOpen; }

  window.__mtxVoiceCall = {
    open: _open,
    close: _close,
    isOpen: _isOpenFn,
  };

  // Listener global para que cualquiera dispare via event
  window.addEventListener('mtx:open-voice-call', function(e) {
    var d = (e && e.detail) || {};
    _open(d.convId, d.prompt);
  });
  window.addEventListener('mtx:close-voice-call', _close);
})();


// ─ Simulación de turnos (mock — reemplazar por backend Vercel AI SDK voice) ─
// Por qué export como función al window: el overlay React la consume y la
// llama dentro de useEffect. Aislada para que sea fácil reemplazar.
window.__mtxVoiceCallSimulateTurns = function(prompt) {
  // Genera 4 turnos alternados coach/user con duración + transcript text
  // basado en el prompt inicial. Si no hay prompt, usa flow de check-in.
  var p = String(prompt || '').toLowerCase();
  var isCheckIn = !p || /\b(c[oó]mo estoy|c[oó]mo me siento|check.?in|hablemos|llamada)\b/.test(p);
  // Stress: incluye verbos conjugados (estresad@, ansios@, abrumad@, quemad@,
  // sobrepasad@, agobiad@). Antes el regex con \b al final no cazaba "estresado"
  // porque parece un word-break en \b mid-word. Patrón más flexible:
  var isStress  = /(ansied|ansios|estr[eé]s|abrumad|quemad|sobrepasad|agobiad)/i.test(p);
  var isPlan    = /\b(plan|organiza|semana|d[ií]a)\b/.test(p);

  if (isStress) {
    return [
      { speaker: 'coach', durationMs: 4200, text: 'Hola. Te escucho. Antes de cualquier cosa: respira tres veces, lento. Yo espero.' },
      { speaker: 'user',  durationMs: 3500, text: 'Ok... ya... sí, mejor.' },
      { speaker: 'coach', durationMs: 5400, text: 'Bien. Ahora cuéntame qué es lo que más te tiene la cabeza ahora mismo. Sin filtro, lo primero que venga.' },
      { speaker: 'user',  durationMs: 4800, text: 'Hay demasiado en el aire y no sé por dónde empezar. Todo se siente urgente.' },
      { speaker: 'coach', durationMs: 6200, text: 'Entiendo. Cuando todo es urgente, nada lo es. Vamos a hacer algo concreto: nombra una sola cosa que si la sacas hoy, mañana respiras mejor.' },
    ];
  }
  if (isPlan) {
    return [
      { speaker: 'coach', durationMs: 4500, text: 'Listo. Vamos a planear. Cuéntame cómo viene la semana: qué tienes ya cerrado y qué está abierto.' },
      { speaker: 'user',  durationMs: 4200, text: 'Tengo dos reuniones el miércoles, una entrega el viernes, y necesito sacar tiempo para entrenar.' },
      { speaker: 'coach', durationMs: 5800, text: 'Bien. Vamos a anclar tres bloques: la entrega del viernes la protegemos desde el lunes, el miércoles después de reuniones queda libre, y entrenar lo metemos martes y jueves temprano. ¿Te suena?' },
      { speaker: 'user',  durationMs: 3000, text: 'Sí, perfecto.' },
      { speaker: 'coach', durationMs: 4200, text: 'Lo dejo en tu agenda. Cuando colguemos lo verás en el chat.' },
    ];
  }
  // Default: check-in cálido
  return [
    { speaker: 'coach', durationMs: 4000, text: 'Hola, qué bueno escucharte. ¿Cómo viene tu día?' },
    { speaker: 'user',  durationMs: 3800, text: 'Bastante movido pero estoy bien. Quería pausar un rato.' },
    { speaker: 'coach', durationMs: 5000, text: 'Buena idea. A veces pausar es lo que más mueve. ¿Algo específico que quieras trabajar ahora o solo hablar un poco?' },
    { speaker: 'user',  durationMs: 3500, text: 'Solo hablar. Pero después quizás organizar algo.' },
    { speaker: 'coach', durationMs: 5400, text: 'Perfecto. Sin presión. Cuéntame qué te tiene la cabeza hoy y de ahí lo que aparezca, lo abordamos.' },
  ];
};


// ═════════════════════════════════════════════════════════════════════════════
// CoachVoiceCallOverlay — el componente fullscreen React
// ═════════════════════════════════════════════════════════════════════════════
function CoachVoiceCallOverlay() {
  // HOOKS FIRST — todos los hooks antes de cualquier early return
  var openState = React.useState(function() {
    return (typeof window !== 'undefined' && window.__mtxVoiceCall) ? window.__mtxVoiceCall.isOpen() : false;
  });
  var open = openState[0]; var setOpen = openState[1];

  var phaseState = React.useState('connecting');
  var phase = phaseState[0]; var setPhase = phaseState[1];

  var durationState = React.useState(0);
  var duration = durationState[0]; var setDuration = durationState[1];

  var currentTurnState = React.useState(null);
  var currentTurn = currentTurnState[0]; var setCurrentTurn = currentTurnState[1];

  var transcriptState = React.useState([]);
  var transcript = transcriptState[0]; var setTranscript = transcriptState[1];

  var mutedState = React.useState(false);
  var muted = mutedState[0]; var setMuted = mutedState[1];

  var convIdState = React.useState(null);
  var convId = convIdState[0]; var setConvId = convIdState[1];

  var promptState = React.useState(null);
  var prompt = promptState[0]; var setPrompt = promptState[1];

  // Waveform amplitude — se actualiza por requestAnimationFrame para suavidad
  var ampState = React.useState(0.3);
  var amp = ampState[0]; var setAmp = ampState[1];

  // Transcript scroll ref — autoscroll al fondo cuando aparece nueva línea
  var transcriptRef = React.useRef(null);

  // Timers / refs cleanables
  var durationTimerRef = React.useRef(null);
  var turnTimerRef = React.useRef(null);
  var rafRef = React.useRef(null);
  var endedFlagRef = React.useRef(false);

  // A.15.3: Real STT pipeline integration.
  // useVoiceTranscription es el hook de voice-transcription.jsx (10-stage NLP
  // pipeline: filler removal, stutter, voice commands, auto-capitalize, etc).
  // Lo inyectamos aquí para que el turno del user sea voz REAL — no mock.
  // Mientras el coach habla, pauseListening (evita feedback loop). Cuando
  // termina el coach, resumeListening y cada onFinalResult se vuelve un turno
  // del user en el transcript.
  //
  // Reglas de hooks: el hook debe llamarse incondicionalmente y siempre en el
  // mismo orden. Como voice-transcription.jsx carga antes que este archivo en
  // Mentex Home.html, `useVoiceTranscription` siempre está disponible.
  // Si el SpeechRecognition no es soportado (iframe sandbox, browser viejo),
  // el hook retorna status='unsupported' y los handlers son no-op — graceful.
  // A.15 audit CRIT-G fix: useVoiceTranscription.onFinalResult devuelve el
  // texto ACUMULADO completo cada vez (no el delta). Si concateno cada
  // resultado al transcript array, el user ve duplicados crecientes:
  //   Turn 1: "hola"
  //   Turn 2: "hola cómo estás"
  //   Turn 3: "hola cómo estás bien"
  // Fix: si la última entrada del transcript es del user dentro de GAP_MS,
  // la REEMPLAZO con el texto cumulative. Sino, agrego nueva entrada (nuevo
  // turno cuando el user retomó la palabra tras gap natural >8s).
  //
  // CRIT-B fix: si useVoiceTranscription no está disponible al primer paint
  // (cache miss, script tardío), uso un noop-hook que respeta la firma y NO
  // viola Rules of Hooks (siempre se llama un hook en el mismo orden, sin
  // condicionales). Si el global aparece después, el segundo render lo usará.
  var lastUserTurnAtRef = React.useRef(0);
  function _noopHook() {
    // Hook stub válido: usa los mismos hooks internos React (ninguno) y
    // retorna API compatible. Cumple Rules of Hooks por mantener el orden.
    return { startListening:function(){}, stopListening:function(){}, pauseListening:function(){}, resumeListening:function(){}, reset:function(){}, status:'unsupported', isSupported:false };
  }
  var _useVoiceHook = (typeof window !== 'undefined' && typeof window.useVoiceTranscription === 'function')
    ? window.useVoiceTranscription
    : _noopHook;
  var voice = _useVoiceHook({
    lang: 'es-ES',
    onFinalResult: function(finalText) {
      if (!finalText || !finalText.trim()) return;
      if (endedFlagRef.current) return;
      var now = Date.now();
      var GAP_MS = 8000;
      setTranscript(function(prev) {
        var last = prev[prev.length - 1];
        var withinGap = (now - lastUserTurnAtRef.current) < GAP_MS;
        if (last && last.speaker === 'user' && withinGap) {
          // Reemplaza el último turno del user con texto acumulado actualizado
          var copy = prev.slice(0, prev.length - 1);
          copy.push({ speaker: 'user', text: finalText.trim(), ts: now });
          lastUserTurnAtRef.current = now;
          return copy;
        }
        // Nuevo turno del user (gap >8s o último era del coach)
        lastUserTurnAtRef.current = now;
        return prev.concat([{ speaker: 'user', text: finalText.trim(), ts: now }]);
      });
    },
    onError: function(msg) {
      console.warn('[voice-call STT]', msg);
    },
  });

  // ── Listener para open/close events ────────────────────────────────────
  React.useEffect(function() {
    function onState(e) {
      var d = (e && e.detail) || {};
      if (d.open) {
        setConvId(d.convId || null);
        setPrompt(d.prompt || null);
        setOpen(true);
        // Reset state machine al abrir
        setPhase('connecting');
        setDuration(0);
        setCurrentTurn(null);
        setTranscript([]);
        setMuted(false);
        endedFlagRef.current = false;
      } else {
        setOpen(false);
      }
    }
    window.addEventListener('mtx:voice-call-state', onState);
    return function() { window.removeEventListener('mtx:voice-call-state', onState); };
  }, []);

  // ── Body scroll lock + ESC handler cuando overlay abierto ───────────────
  React.useEffect(function() {
    if (!open) return;
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      handleHangUp();
    }
    window.addEventListener('keydown', onKey);
    return function() {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // ── State machine: connecting → active → ended ──────────────────────────
  React.useEffect(function() {
    if (!open) return;
    if (phase === 'connecting') {
      var t = setTimeout(function() { setPhase('active'); }, 700);
      return function() { clearTimeout(t); };
    }
  }, [open, phase]);

  // ── Duration counter (solo activo) ───────────────────────────────────────
  React.useEffect(function() {
    if (!open || phase !== 'active') return;
    durationTimerRef.current = setInterval(function() {
      setDuration(function(d) { return d + 1; });
    }, 1000);
    return function() {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [open, phase]);

  // ── Run turns secuencialmente cuando phase=active ────────────────────────
  // A.15.3: con STT real cableado, solo simulamos los turnos del COACH como
  // mock (hasta que Brandon conecte LLM streaming en Sprint B). Los turnos
  // del user vienen de voz REAL via useVoiceTranscription.onFinalResult.
  // Esto evita que el mock "robe" la palabra al user en plena conversación.
  React.useEffect(function() {
    if (!open || phase !== 'active') return;
    if (endedFlagRef.current) return;
    var allTurns = window.__mtxVoiceCallSimulateTurns(prompt);
    var coachTurns = allTurns.filter(function(t) { return t.speaker === 'coach'; });
    var idx = 0;
    function runNext() {
      if (endedFlagRef.current || idx >= coachTurns.length) {
        // Idle — el overlay queda abierto esperando que el user hable.
        setCurrentTurn(null);
        return;
      }
      var t = coachTurns[idx];
      setCurrentTurn({ speaker: t.speaker, text: t.text, idx: idx });
      setTranscript(function(prev) {
        return prev.concat([{ speaker: t.speaker, text: t.text, ts: Date.now() }]);
      });
      idx += 1;
      // Entre turnos del coach: gap de ~5s para que el user pueda hablar.
      // Brandon reemplazará esta lógica con LLM real escuchando STT del user.
      turnTimerRef.current = setTimeout(runNext, t.durationMs + 5000);
    }
    runNext();
    return function() {
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
    };
  }, [open, phase, prompt]);

  // A.15.3: START/STOP del STT real según phase del overlay.
  // - phase='active' → startListening (capturar voz del user)
  // - phase!='active' || !open → stopListening (libera mic + recursos)
  // - muted → pauseListening (resume cuando unmute)
  React.useEffect(function() {
    if (!open || phase !== 'active') {
      try { voice.stopListening && voice.stopListening(); } catch (_) {}
      return;
    }
    // Small delay para que el overlay termine animación de entrada antes
    // de pedir permiso de mic (UX más calmada).
    var t = setTimeout(function() {
      try { voice.startListening && voice.startListening(); } catch (_) {}
    }, 800);
    return function() {
      clearTimeout(t);
      try { voice.stopListening && voice.stopListening(); } catch (_) {}
    };
  }, [open, phase]);

  // Mute toggle → pausar/resumir el STT real
  React.useEffect(function() {
    if (!open || phase !== 'active') return;
    if (muted) {
      try { voice.pauseListening && voice.pauseListening(); } catch (_) {}
    } else {
      try { voice.resumeListening && voice.resumeListening(); } catch (_) {}
    }
  }, [muted, open, phase]);

  // ── Waveform animation — RAF loop suave ──────────────────────────────────
  React.useEffect(function() {
    if (!open) return;
    var start = Date.now();
    function tick() {
      var now = Date.now();
      var t = (now - start) / 1000;
      // Patrón compuesto de senoidales para que la amplitud no se sienta robótica.
      // Speakers activos → amplitud alta y errática (0.5-1).
      // Idle → suave (0.2-0.4).
      var speakerActive = currentTurn && phase === 'active';
      var base = speakerActive ? 0.55 : 0.25;
      var range = speakerActive ? 0.45 : 0.15;
      var noise = Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.7) * 0.3 + Math.sin(t * 3.1) * 0.2;
      setAmp(base + range * Math.abs(noise));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return function() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, currentTurn, phase]);

  // ── Autoscroll del transcript ────────────────────────────────────────────
  React.useEffect(function() {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript.length]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function fmtDuration(s) {
    var m = Math.floor(s / 60);
    var ss = s % 60;
    return m + ':' + (ss < 10 ? '0' + ss : ss);
  }

  function handleMuteToggle() {
    setMuted(function(m) { return !m; });
  }

  function handleTranscribe() {
    // Cierra el overlay y agrega el transcript completo al chat actual.
    if (convId && window.__mtxIAChat) {
      var lines = transcript.map(function(t) {
        var prefix = t.speaker === 'coach' ? 'Coach' : 'Tú';
        return prefix + ': ' + t.text;
      }).join('\n');
      if (lines) {
        window.__mtxIAChat.addMessage(convId, {
          role: 'assistant',
          content: '📞 **Transcripción de llamada** (' + fmtDuration(duration) + ')\n\n' + lines,
          state: 'done',
        });
      }
    }
    handleHangUp();
  }

  function handleHangUp() {
    if (endedFlagRef.current) return;
    endedFlagRef.current = true;
    if (turnTimerRef.current) { clearTimeout(turnTimerRef.current); turnTimerRef.current = null; }
    setPhase('ended');
    // Animación de salida ~ 350ms y luego close
    setTimeout(function() {
      if (window.__mtxVoiceCall) window.__mtxVoiceCall.close();
    }, 350);
  }

  // ── Render — early return después de TODOS los hooks ────────────────────
  if (!open) return null;
  if (typeof document === 'undefined') return null;
  var portalRoot = document.getElementById('mtx-overlay-root');
  if (!portalRoot) return null;

  // Waveform: 32 barras con altura derivada de amp + posición
  var BARS = 32;
  var bars = [];
  for (var i = 0; i < BARS; i++) {
    // Centro tiene más amplitud que extremos (forma natural de waveform)
    var centerDist = Math.abs(i - BARS / 2) / (BARS / 2);
    var positionMul = 1 - centerDist * 0.5;
    // Variación individual por bar
    var indMul = 0.5 + Math.abs(Math.sin(i * 0.7 + Date.now() / 320)) * 0.5;
    var h = amp * positionMul * indMul;
    bars.push(Math.max(0.08, Math.min(1, h)));
  }

  var coachActive = currentTurn && currentTurn.speaker === 'coach' && phase === 'active';
  var userActive  = currentTurn && currentTurn.speaker === 'user'  && phase === 'active';
  var waveformColor = coachActive ? '#3dffd1' : userActive ? '#9b8aff' : 'rgba(255,255,255,0.35)';
  var waveformGlow  = coachActive ? '0 0 16px rgba(61,255,209,0.6)' : userActive ? '0 0 16px rgba(155,138,255,0.5)' : 'none';

  var statusLabel = phase === 'connecting' ? 'Conectando…'
                  : phase === 'ended' ? 'Llamada terminada'
                  : coachActive ? 'Coach hablando'
                  : userActive ? 'Escuchando…'
                  : 'En llamada';

  var content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Llamada de voz con el coach"
      style={{
        // position:absolute respeta el device frame iPhone (no viewport browser)
        position: 'absolute', inset: 0, zIndex: 1100,
        // Background con gradient múltiple que driftea lentamente — da
        // sensación de "vivo" sin ser distractor.
        background: 'radial-gradient(at 30% 20%, rgba(61,255,209,0.10), rgba(0,0,0,0) 50%), radial-gradient(at 70% 80%, rgba(155,138,255,0.08), rgba(0,0,0,0) 50%), #0a1410',
        backgroundSize: '100% 100%, 100% 100%, 100% 100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '64px 24px 36px',
        opacity: phase === 'ended' ? 0 : 1,
        transition: 'opacity .3s ease',
        animation: phase !== 'ended'
          ? 'mtx-fade-up .35s ease both, mtx-vc-bg-drift 60s ease-in-out infinite'
          : 'none',
      }}>
      {/* Top: avatar circular + nombre + status */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 14,
      }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, rgba(61,255,209,0.45), rgba(155,138,255,0.25) 70%)',
          border: '1px solid rgba(61,255,209,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48, lineHeight: 1,
          // Pulse premium FaceTime-style cuando coach habla: scale + glow ring
          // que se expande. Cuando idle, glow base sutil sin animar.
          boxShadow: coachActive ? '' : '0 0 24px rgba(61,255,209,0.18)',
          animation: coachActive ? 'mtx-vc-avatar-pulse 1.6s ease-in-out infinite' : 'none',
          transition: 'box-shadow .3s',
        }}>
          <span role="img" aria-hidden="true">🌿</span>
        </div>
        <div style={{
          fontSize: 19, fontWeight: 700,
          color: 'var(--ink-1)',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '-0.005em',
        }}>Coach Mentex</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12.5,
          color: 'rgba(255,255,255,0.55)',
          fontFamily: 'var(--ff-sans)',
          letterSpacing: '0.02em',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: phase === 'connecting' ? '#ffc850' : phase === 'ended' ? 'rgba(255,255,255,0.25)' : 'var(--neon)',
            boxShadow: phase === 'active' ? '0 0 6px var(--neon)' : 'none',
            // Dot pulsante cuando active (feedback de "llamada viva") o connecting
            animation: phase === 'connecting'
              ? 'mtx-vc-dot-pulse 1.2s ease-in-out infinite'
              : (phase === 'active' ? 'mtx-vc-dot-pulse 1.6s ease-in-out infinite' : 'none'),
            display: 'inline-block',
          }}/>
          <span>{statusLabel}</span>
          {phase === 'active' && (
            <span style={{
              marginLeft: 6,
              fontFamily: 'var(--ff-mono, ui-monospace, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}>· {fmtDuration(duration)}</span>
          )}
        </div>
      </div>

      {/* Center: waveform live + current speaker chip */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 22, width: '100%',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 3,
          height: 80, width: '100%', maxWidth: 320,
        }}>
          {bars.map(function(h, i) {
            return (
              <div key={i} style={{
                width: 5,
                height: Math.round(h * 70) + 6,
                borderRadius: 4,
                background: waveformColor,
                boxShadow: waveformGlow,
                transition: 'height .08s ease, background .25s ease, box-shadow .25s ease',
              }}/>
            );
          })}
        </div>

        {/* Live transcript — scrolleable, max 32vh, con fade-mask cinematográfico
            en top/bottom para que el scroll se sienta premium (no corte abrupto). */}
        <div
          ref={transcriptRef}
          style={{
            width: '100%', maxWidth: 360,
            maxHeight: '32vh', overflowY: 'auto',
            padding: '10px 14px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.02)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column', gap: 10,
            scrollBehavior: 'smooth',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)',
          }}>
          {transcript.length === 0 && phase === 'connecting' && (
            <div style={{
              fontSize: 12.5, color: 'rgba(255,255,255,0.45)',
              textAlign: 'center', padding: '12px 0',
              fontFamily: 'var(--ff-sans)',
              fontStyle: 'italic',
            }}>Iniciando llamada…</div>
          )}
          {transcript.map(function(t, i) {
            var isCoach = t.speaker === 'coach';
            return (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isCoach ? 'flex-start' : 'flex-end',
                animation: 'mtx-vc-bubble-in .28s cubic-bezier(0.16, 1, 0.3, 1) both',
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: isCoach ? 'rgba(61,255,209,0.7)' : 'rgba(155,138,255,0.7)',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  marginBottom: 3,
                  fontFamily: 'var(--ff-sans)',
                }}>{isCoach ? 'Coach' : 'Tú'}</div>
                <div style={{
                  fontSize: 13, lineHeight: 1.4,
                  color: 'var(--ink-1)',
                  fontFamily: 'var(--ff-sans)',
                  letterSpacing: '-0.005em',
                  padding: '6px 10px',
                  background: isCoach ? 'rgba(61,255,209,0.06)' : 'rgba(155,138,255,0.06)',
                  borderRadius: 10,
                  borderTopLeftRadius: isCoach ? 4 : 10,
                  borderTopRightRadius: isCoach ? 10 : 4,
                  maxWidth: '90%',
                }}>{t.text}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: 3 controles */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 32,
      }}>
        {/* Mute */}
        <button
          type="button"
          onClick={handleMuteToggle}
          className="mtx-tap"
          aria-label={muted ? 'Activar mic' : 'Silenciar mic'}
          aria-pressed={muted}
          style={{
            appearance: 'none', cursor: 'pointer',
            width: 60, height: 60, borderRadius: '50%',
            background: muted ? 'rgba(255,160,160,0.18)' : 'rgba(255,255,255,0.06)',
            border: '0.5px solid ' + (muted ? 'rgba(255,160,160,0.5)' : 'rgba(255,255,255,0.14)'),
            color: muted ? '#ff9b9b' : 'var(--ink-1)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background .2s, color .2s, border-color .2s',
          }}>
          {muted ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>

        {/* Transcribir → cierra y vuelca al chat */}
        <button
          type="button"
          onClick={handleTranscribe}
          className="mtx-tap"
          aria-label="Transcribir llamada al chat"
          disabled={transcript.length === 0}
          style={{
            appearance: 'none',
            cursor: transcript.length === 0 ? 'not-allowed' : 'pointer',
            width: 60, height: 60, borderRadius: '50%',
            background: 'rgba(155,138,255,0.10)',
            border: '0.5px solid rgba(155,138,255,0.35)',
            color: 'rgba(220,210,255,0.95)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            opacity: transcript.length === 0 ? 0.4 : 1,
            transition: 'opacity .2s',
          }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <line x1="9" y1="10" x2="15" y2="10"/>
            <line x1="9" y1="13" x2="13" y2="13"/>
          </svg>
        </button>

        {/* Hang up — botón maestro, 15% más grande que los otros 2 (jerarquía
            FaceTime/WhatsApp). El color rojo + tamaño le da peso visual. */}
        <button
          type="button"
          onClick={handleHangUp}
          className="mtx-tap"
          aria-label="Colgar"
          style={{
            appearance: 'none', cursor: 'pointer',
            width: 70, height: 70, borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff5b5b 0%, #d63838 100%)',
            border: 'none',
            color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px -6px rgba(255,91,91,0.6), 0 0 0 1px rgba(255,91,91,0.3) inset',
            transition: 'transform .12s',
          }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: 'rotate(135deg)' }}
            aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </button>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, portalRoot);
}


// ── CSS keyframes especializadas para el overlay (premium feel) ───────────
// Inyectadas runtime una sola vez. Idempotente.
if (typeof document !== 'undefined' && !document.getElementById('mtx-voice-call-css')) {
  var style = document.createElement('style');
  style.id = 'mtx-voice-call-css';
  style.textContent = [
    // Avatar pulse cuando coach habla — scale suave + glow expandido
    '@keyframes mtx-vc-avatar-pulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(61,255,209,0.4), 0 0 30px rgba(61,255,209,0.4); } 50% { transform: scale(1.04); box-shadow: 0 0 0 12px rgba(61,255,209,0), 0 0 40px rgba(61,255,209,0.55); } }',
    // Bubble entry — desde abajo+fade
    '@keyframes mtx-vc-bubble-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }',
    // Status dot pulsante (cuando active)
    '@keyframes mtx-vc-dot-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.85); } }',
    // Background radial drift — lento, casi imperceptible pero da vida
    '@keyframes mtx-vc-bg-drift { 0% { background-position: 30% 20%, 70% 80%; } 50% { background-position: 38% 26%, 62% 74%; } 100% { background-position: 30% 20%, 70% 80%; } }',
  ].join('\n');
  document.head.appendChild(style);
}


// ── Mount global ──────────────────────────────────────────────────────────
// Se renderiza siempre — el componente se auto-controla por _isOpen state.
// Cargado en MentexApp root (Mentex Home.html) — single mount point para
// que pueda dispararse desde cualquier surface (Home, Explore, IA, Profile).
window.CoachVoiceCallOverlay = CoachVoiceCallOverlay;
