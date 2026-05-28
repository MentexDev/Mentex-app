// screens/coach-wellness-audio.jsx — Sprint A.9.5 #2 · audio guía wellness
// ─────────────────────────────────────────────────────────────────────────────
//
// Audio guide para ejercicios wellness. Web Audio API generando tonos puros
// sintéticos — cero archivos externos, drop-in ready Brandon.
//
// Filosofía:
//   • NO voz hablada (eso requiere TTS server-side, lo dejamos para fase B)
//   • Tonos suaves contextuales por fase del ejercicio
//   • Sutil, no agresivo — respeta entorno del user (mute por default)
//   • Persistencia preferencia en localStorage
//
// Sonidos por fase:
//   • inhale       → tono ascendente (220Hz → 330Hz) suave
//   • hold / hold_in / hold_out → tono sostenido bajo (165Hz pad)
//   • exhale       → tono descendente (330Hz → 220Hz) suave
//   • Phase change (cualquier otro) → campana suave (mi nota)
//   • Complete cycle → ding alegre breve (do mayor)
//   • Complete session → resolución armónica (do-mi-sol)
//
// Drop-in ready: cuando Brandon wire backend con TTS, reemplazar
// _playTone() / _playChord() por <audio src=server-voice-url>.
//
// API pública:
//   window.__mtxWellnessAudio
//     .isEnabled()        — bool
//     .setEnabled(bool)   — toggle persistente
//     .toggle()           — switch ON/OFF
//     .onPhaseStart(phaseId)
//     .onCycleComplete()
//     .onSessionComplete()
//     .stop()             — cancela cualquier sonido en curso
//
// Auto-listeners: escucha mtx:wellness-phase-change y mtx:wellness-completed.
// Si está enabled, reproduce el sonido apropiado automáticamente.
//
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxWellnessAudio) return;

  var STORAGE_KEY = 'mtx-wellness-audio:enabled';
  var _enabled = false;
  var _audioCtx = null;
  var _activeNodes = [];  // tracking para stop()

  // ──────────────────────────────────────────────────────────────────────────
  // Persistencia preferencia
  // ──────────────────────────────────────────────────────────────────────────
  function _loadPref() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      _enabled = raw === '1' || raw === 'true';
    } catch (e) { _enabled = false; }
  }
  function _savePref(val) {
    try { window.localStorage.setItem(STORAGE_KEY, val ? '1' : '0'); }
    catch (e) { /* no-op */ }
  }
  _loadPref();

  // ──────────────────────────────────────────────────────────────────────────
  // AudioContext lazy init — algunos browsers requieren user gesture
  // ──────────────────────────────────────────────────────────────────────────
  function _ctx() {
    if (_audioCtx) return _audioCtx;
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      _audioCtx = new Ctor();
      return _audioCtx;
    } catch (e) {
      return null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Primitives: tone (oscillator + envelope) + chord (multiple tones)
  // ──────────────────────────────────────────────────────────────────────────
  // ADSR envelope simple: attack rápido, sostén, release suave
  // Volumen máx peakGain (default 0.08 = bastante suave)
  function _playTone(opts) {
    if (!_enabled) return;
    var ctx = _ctx();
    if (!ctx) return;
    var now = ctx.currentTime;
    var frequency = opts.frequency || 440;
    var endFrequency = opts.endFrequency || frequency;  // glide opcional
    var durationSec = opts.durationSec || 0.5;
    var peakGain = opts.peakGain || 0.08;
    var attackSec = opts.attackSec || 0.04;
    var releaseSec = opts.releaseSec || Math.min(0.35, durationSec * 0.5);

    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    if (endFrequency !== frequency) {
      osc.frequency.linearRampToValueAtTime(endFrequency, now + durationSec);
    }

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + attackSec);
    gain.gain.setValueAtTime(peakGain, now + durationSec - releaseSec);
    gain.gain.linearRampToValueAtTime(0, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.05);

    _activeNodes.push(osc, gain);
    // Cleanup tracking después del stop
    setTimeout(function() {
      var i = _activeNodes.indexOf(osc);
      if (i >= 0) _activeNodes.splice(i, 1);
      var j = _activeNodes.indexOf(gain);
      if (j >= 0) _activeNodes.splice(j, 1);
    }, (durationSec + 0.1) * 1000);
  }

  function _playChord(freqs, durationSec, peakGain) {
    freqs.forEach(function(f, i) {
      _playTone({
        frequency: f,
        durationSec: durationSec,
        peakGain: (peakGain || 0.06) * (1 - i * 0.15),  // attenuación leve por nota
        attackSec: 0.05 + i * 0.04,  // stagger entrada
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Phase mapping → sonido apropiado
  // ──────────────────────────────────────────────────────────────────────────
  function _onPhaseStart(phaseId) {
    if (!_enabled) return;
    switch (phaseId) {
      // Respiración inhale → ascendente
      case 'inhale':
        _playTone({ frequency: 220, endFrequency: 330, durationSec: 0.9, peakGain: 0.07 });
        break;
      // Respiración exhale → descendente
      case 'exhale':
        _playTone({ frequency: 330, endFrequency: 220, durationSec: 1.1, peakGain: 0.07 });
        break;
      // Hold (sostén) → pad bajo sostenido
      case 'hold':
      case 'hold_in':
      case 'hold_out':
        _playTone({ frequency: 165, durationSec: 0.6, peakGain: 0.05, attackSec: 0.15 });
        break;
      // Phase changes de body scan / grounding / stretching → campana mi
      default:
        _playTone({ frequency: 659.25, durationSec: 0.5, peakGain: 0.06, type: 'triangle', attackSec: 0.02 });
        break;
    }
  }

  function _onCycleComplete() {
    if (!_enabled) return;
    // Ding alegre breve (do mayor armonía corta)
    _playChord([523.25, 659.25], 0.4, 0.07);
  }

  function _onSessionComplete() {
    if (!_enabled) return;
    // Resolución armónica do-mi-sol mayor (alegre, conclusiva)
    _playChord([523.25, 659.25, 783.99], 1.2, 0.08);
  }

  function stop() {
    _activeNodes.forEach(function(node) {
      try { if (node.stop) node.stop(); } catch (e) { /* no-op */ }
      try { if (node.disconnect) node.disconnect(); } catch (e) { /* no-op */ }
    });
    _activeNodes = [];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────
  function isEnabled() { return _enabled; }

  function setEnabled(val) {
    var next = !!val;
    if (next === _enabled) return;
    _enabled = next;
    _savePref(next);
    // Si lo apagamos, cortar cualquier sonido en curso
    if (!next) stop();
    // Si lo prendemos, intentar inicializar el AudioContext (user gesture)
    if (next) {
      var ctx = _ctx();
      // Algunos browsers necesitan resume() después de creación
      if (ctx && ctx.state === 'suspended') {
        try { ctx.resume(); } catch (e) { /* no-op */ }
      }
      // Tone de confirmación al activar (feedback inmediato)
      _playTone({ frequency: 523.25, durationSec: 0.35, peakGain: 0.07, type: 'triangle' });
    }
    try {
      window.dispatchEvent(new CustomEvent('mtx:wellness-audio-changed', {
        detail: { enabled: next },
      }));
    } catch (e) { /* no-op */ }
  }

  function toggle() { setEnabled(!_enabled); }

  // ──────────────────────────────────────────────────────────────────────────
  // Auto-listeners para el wellness exercise lifecycle
  // ──────────────────────────────────────────────────────────────────────────
  window.addEventListener('mtx:wellness-phase-change', function(e) {
    if (!e || !e.detail || !e.detail.phase) return;
    _onPhaseStart(e.detail.phase.id);
  });

  window.addEventListener('mtx:wellness-completed', function() {
    _onSessionComplete();
  });

  // Audit CRIT-5: detener audio al cancel/pause de la sesión.
  // Sin esto, oscillator + gain nodes quedan dangling hasta el cleanup
  // setTimeout natural. En sesiones largas o múltiples cancelaciones,
  // causa degradación del AudioContext.
  window.addEventListener('mtx:wellness-state', function(e) {
    if (!e || !e.detail) return;
    var status = e.detail.status;
    if (status === 'cancelled' || status === 'paused') {
      stop();
    }
  });

  // Public API export
  window.__mtxWellnessAudio = {
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    toggle: toggle,
    onPhaseStart: _onPhaseStart,
    onCycleComplete: _onCycleComplete,
    onSessionComplete: _onSessionComplete,
    stop: stop,
  };
})();
