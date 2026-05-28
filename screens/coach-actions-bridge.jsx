// screens/coach-actions-bridge.jsx — Fase A · Bridge runtime
// ─────────────────────────────────────────────────────────────────────────────
// Listener global de mtx:coach-artifact-action que conecta las acciones del
// Coach (tap "Agendarlo todo" en un plan_card, "Adelante hazlo" en una
// confirmation_card, "Reproducir" en una recommendation_card) con los stores
// reales del producto (__mtxIAAgenda, __mtxRitual, __mtxGlobalPlayer, etc.).
//
// CONTRATO:
//   El listener escucha mtx:coach-artifact-action que se dispara desde las
//   cards en ia-artifacts.jsx con shape:
//     detail: { kind: 'plan_card'|'confirmation_card'|'recommendation_card',
//               value: string,           // e.g. 'commit_all', 'confirm', 'play'
//               artifact: {...},          // el artifact original con su data
//               item?: {...}              // para recommendation_card, el item resuelto
//             }
//
// HOY (Fase A — mock):
//   • plan_card commit_all → escribe events en __mtxIAAgenda con upsertMentexEvent()
//   • confirmation_card confirm → toast "Confirmado" (acción real vendrá Sprint B BFF)
//   • recommendation_card play → abre content sheet vía mtx:open-item-from-community
//
// PRÓXIMA FASE (Sprint B BFF):
//   • Cada acción tendrá contraparte real del Gateway (skill.invoke con la tool
//     correspondiente). Este bridge se mantiene como router central pero las
//     ejecuciones se vuelven HTTP reales en lugar de mocks locales.
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  if (typeof window === 'undefined' || window.__mtxCoachActionsBridge) return;

  // ─ Helpers de tiempo (best-effort parse de "Foco profundo 7am" → "07:00") ─
  function _parseTimeFromText(text) {
    if (!text || typeof text !== 'string') return null;
    var t = text.toLowerCase();

    // Patrón "7am", "11pm", "7 am", "11 pm"
    var match12h = t.match(/(\d{1,2})\s*(am|pm)/);
    if (match12h) {
      var h = parseInt(match12h[1], 10);
      var meridiem = match12h[2];
      if (meridiem === 'pm' && h !== 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      return _pad(h) + ':00';
    }

    // Patrón "HH:MM" o "HH.MM"
    var match24h = t.match(/(\d{1,2})[:\.](\d{2})/);
    if (match24h) {
      var hh = parseInt(match24h[1], 10);
      var mm = parseInt(match24h[2], 10);
      if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) return _pad(hh) + ':' + _pad(mm);
    }

    // Heurísticas por palabras clave (fallback)
    if (/(mañana|am|temprano|despertar)/.test(t)) return '07:00';
    if (/(mediodía|medio.dia|noon|almuerzo)/.test(t)) return '12:00';
    if (/(tarde|14:00|3pm|15:00)/.test(t)) return '15:00';
    if (/(noche|cena|dormir|cierre|reflex)/.test(t)) return '21:00';

    return null;
  }

  function _pad(n) { return n < 10 ? '0' + n : '' + n; }

  // Mapeo de días humanos → offset desde hoy
  // Asumimos el plan empieza desde lunes de la semana siguiente si no se especifica
  function _dayOffsetFromLabel(label) {
    var dayMap = {
      'lun': 1, 'lunes': 1,
      'mar': 2, 'martes': 2,
      'mié': 3, 'mie': 3, 'miércoles': 3, 'miercoles': 3,
      'jue': 4, 'jueves': 4,
      'vie': 5, 'viernes': 5,
      'sáb': 6, 'sab': 6, 'sábado': 6, 'sabado': 6,
      'dom': 0, 'domingo': 0,
    };
    var key = String(label || '').toLowerCase().trim();
    return dayMap[key] != null ? dayMap[key] : -1;
  }

  // Mostrar toast (usa el sistema de toast del proyecto)
  function _toast(message, opts) {
    opts = opts || {};
    if (typeof window === 'undefined') return;

    // Intenta usar el sistema de toast oficial primero
    if (window.__mtxToast && typeof window.__mtxToast.show === 'function') {
      window.__mtxToast.show(message, opts);
      return;
    }

    // Fallback: dispatch genérico
    window.dispatchEvent(new CustomEvent('mtx:toast', {
      detail: { message: message, kind: opts.kind || 'info', durationMs: opts.durationMs || 2400 },
    }));
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS POR TIPO DE ARTIFACT
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── plan_card ────────────────────────────────────────────────────────────
  // value: 'commit_all' → escribe TODOS los items del plan a __mtxIAAgenda
  // value: 'edit' → no-op (futuro: abre editor del plan)
  function handlePlanCard(detail) {
    var artifact = detail.artifact || {};
    var value = detail.value;

    if (value === 'commit_all') {
      if (!window.__mtxIAAgenda) {
        _toast('Agenda no disponible — vuelve a intentar.', { kind: 'error' });
        return;
      }

      var days = Array.isArray(artifact.days) ? artifact.days : [];
      var committed = 0;
      var skipped = 0;

      days.forEach(function(day) {
        var offset = _dayOffsetFromLabel(day.label);
        if (offset < 0) { skipped += (day.items || []).length; return; }

        (day.items || []).forEach(function(item, idx) {
          // Skip items meramente informativos (icon '⚡' = solo recordatorio, '◯' = día libre)
          if (item.icon === '⚡' || item.icon === '◯' || item.icon === '✈️') {
            skipped += 1;
            return;
          }

          var time = _parseTimeFromText(item.text);
          if (!time) { skipped += 1; return; }

          // Generar id estable para evitar duplicados si el user re-tapea
          var planId = (artifact.id || 'plan') + '-' + day.label.toLowerCase() + '-' + idx;
          var eventId = 'coach-plan-' + planId;

          // Duración por defecto: 30 min si el item no dice nada
          var durationMin = 30;
          var durMatch = item.text.match(/(\d+)\s*min/);
          if (durMatch) durationMin = parseInt(durMatch[1], 10);
          var hMatch = item.text.match(/(\d+)\s*h(?:oras?)?/);
          if (hMatch) durationMin = parseInt(hMatch[1], 10) * 60;

          // Limpiar título: quitar duración del texto
          var title = item.text.replace(/\([^\)]*min[^\)]*\)/, '').replace(/\d+\s*min/, '').replace(/\d+\s*h(?:oras?)?/, '').replace(/\s+/g, ' ').trim();
          // Quitar tiempo del título también (7am, 21:30)
          title = title.replace(/\d{1,2}\s*(am|pm)/i, '').replace(/\d{1,2}[:\.]\d{2}/, '').replace(/\s+/g, ' ').trim();

          window.__mtxIAAgenda.upsertMentexEvent({
            id: eventId,
            title: title || item.text,
            time: time,
            durationMin: durationMin,
            type: 'mentex',
            source: 'mentex',
            // Metadata útil: vincula el evento al plan que lo creó
            metadata: { fromCoachPlan: artifact.id || artifact.title, day: day.label, originalText: item.text },
          });
          committed += 1;
        });
      });

      if (committed > 0) {
        _toast(
          committed === 1
            ? '1 evento agendado en tu semana'
            : committed + ' eventos agendados en tu semana',
          { kind: 'success', durationMs: 3200 }
        );

        // Mark artifact as committed para que próximo render no muestre el button
        // (estrategia simple: persist en window — Sprint B vendría desde backend)
        window.dispatchEvent(new CustomEvent('mtx:plan-committed', {
          detail: { artifactId: artifact.id || artifact.title, count: committed },
        }));
      } else {
        _toast('No pude interpretar los horarios del plan. Ajusta los detalles.', { kind: 'warn' });
      }

      if (skipped > 0) {
        console.info('[coach-actions] Plan commit: ' + committed + ' agendados, ' + skipped + ' saltados (sin hora o solo informativos)');
      }
      return;
    }

    if (value === 'edit') {
      // Futuro: abrir editor del plan
      _toast('Editor de plan próximamente.', { kind: 'info' });
      return;
    }
  }


  // ─── confirmation_card ────────────────────────────────────────────────────
  // value: 'confirm' → hoy es mock (toast). Sprint B → ejecuta browse_act real.
  // value: 'cancel' → emite cancel event para que la conv quede marcada
  // value: 'show_alternatives' → abre flow de alternativas (placeholder)
  function handleConfirmationCard(detail) {
    var value = detail.value;
    var artifact = detail.artifact || {};

    if (value === 'confirm') {
      // B5 REFACTOR (Sprint A.6): si el artifact trae un browseActPlan,
      // inyectamos un nuevo mensaje del coach con un browse_progress_card LIVE
      // y arrancamos el runner para actualizarlo paso a paso. Sin overlay
      // fullscreen — todo inline en el chat estilo Claude Code extension.
      if (artifact.browseActPlan && window.__mtxBrowseActRunner) {
        var plan = artifact.browseActPlan;
        var convId = window.__mtxIAChat && window.__mtxIAChat.getCurrentId();
        if (!convId) {
          _toast('No hay conversación activa.', { kind: 'warn' });
          return;
        }
        // Crea un nuevo mensaje del coach que contendrá el card live
        var asstMsg = window.__mtxIAChat.addMessage(convId, {
          role: 'assistant',
          content: 'Ejecutando ' + plan.intent.toLowerCase() + '… te muestro paso a paso.',
          state: 'done',
          artifacts: [], // Se llena por el runner
        });
        // Arranca el runner — actualiza el msg con browse_progress_card live
        window.__mtxBrowseActRunner.start({
          convId: convId,
          msgId: asstMsg.id,
          plan: plan,
          onComplete: function(finishedPlan) {
            // Al completar exitosamente, inyectar OTRO mensaje breve del coach
            // con la confirmación + CTA (el card live ya quedó visible arriba
            // con state='done' y el bookingRef en su footer).
            window.__mtxIAChat.addMessage(convId, {
              role: 'assistant',
              content: '✓ Listo. ' + finishedPlan.intent + ' completada.\n\nCuando quieras te lo agrego a tu Agenda.',
              state: 'done',
              chips: ['Agregar a Agenda', '¿Qué llevar?', 'Reservar otra'],
            });
          },
          onCancel: function() {
            window.__mtxIAChat.addMessage(convId, {
              role: 'assistant',
              content: 'Detenido. No se completó la acción. Si quieres retomar o cambiar de opción, dime.',
              state: 'done',
            });
          },
        });
        return;
      }
      _toast('Confirmado. El coach está procediendo.', { kind: 'success' });
      // Marcar el artifact como resolved=confirmed
      window.dispatchEvent(new CustomEvent('mtx:confirmation-resolved', {
        detail: { artifactId: artifact.id || artifact.preface, resolved: 'confirmed' },
      }));
      return;
    }

    if (value === 'cancel') {
      _toast('Cancelado — no se hizo nada.', { kind: 'info' });
      window.dispatchEvent(new CustomEvent('mtx:confirmation-resolved', {
        detail: { artifactId: artifact.id || artifact.preface, resolved: 'cancelled' },
      }));
      return;
    }

    if (value === 'show_alternatives') {
      _toast('Mostrando alternativas (próximamente).', { kind: 'info' });
      return;
    }
  }


  // ─── recommendation_card ──────────────────────────────────────────────────
  // value: 'play' → abre el content sheet (ContentDetailScreen) o reproductor
  // value: 'save' → agrega a bookmarks
  // value: 'later' → no-op (sólo cierra suaviza)
  function handleRecommendationCard(detail) {
    var value = detail.value;
    var item = detail.item || {};

    if (value === 'play') {
      // Reutiliza el routing existente: dispatch mtx:open-item-from-community
      // con itemId del content. ContentDetailScreen en explore-flow lo recibe
      // y abre la experiencia adecuada (audiolibro, meditación, charla).
      if (item.id) {
        window.dispatchEvent(new CustomEvent('mtx:open-item-from-community', {
          detail: { itemId: item.id },
        }));
      } else {
        _toast('No pude encontrar el contenido. Intenta otra recomendación.', { kind: 'warn' });
      }
      return;
    }

    if (value === 'save') {
      // Hook simple — el sistema de bookmarks existente acepta itemId
      if (window.__mtxBookmarks && typeof window.__mtxBookmarks.add === 'function') {
        window.__mtxBookmarks.add({ itemId: item.id, title: item.title });
        _toast('Guardado en tus marcadores.', { kind: 'success' });
      } else {
        _toast('Lo guardé para ti.', { kind: 'success' });
      }
      return;
    }

    if (value === 'later') {
      _toast('Te lo recordaré más tarde.', { kind: 'info' });
      return;
    }
  }


  // ─── step_by_step — protocolo multi-paso ─────────────────────────────────
  // value 'apply_all' / 'apply_first' → toast por ahora; Sprint B BFF
  // conectará a un workflow real que ejecuta los pasos
  function handleStepByStep(detail) {
    var value = detail.value;
    var art = detail.artifact || {};
    var stepsCount = Array.isArray(art.steps) ? art.steps.length : 0;
    if (value === 'apply_all') {
      _toast(
        stepsCount > 0
          ? 'Aplicando ' + stepsCount + ' pasos en tu rutina'
          : 'Pasos aplicados',
        { kind: 'success' }
      );
      return;
    }
    if (value === 'apply_first') {
      _toast('Aplicando el primer paso', { kind: 'success' });
      return;
    }
  }


  // ─── error_gentle — retry o dismiss ──────────────────────────────────────
  function handleErrorGentle(detail) {
    var value = detail.value;
    if (value === 'retry') {
      _toast('Reintentando', { kind: 'info' });
      window.dispatchEvent(new CustomEvent('mtx:coach-retry-last', {
        detail: { artifact: detail.artifact },
      }));
      return;
    }
    if (value === 'dismiss') return;
  }


  // ─── memory_recall_card — abrir Memoria o olvidar un hecho ───────────────
  function handleMemoryRecallCard(detail) {
    var value = detail.value;
    if (value === 'open_memory') {
      // Navegar a la pestaña Memoria del IA — listener global responde
      window.dispatchEvent(new CustomEvent('mtx:open-memory-tab', { detail: {} }));
      _toast('Abriendo tu Memoria', { kind: 'info' });
      return;
    }
    if (value === 'forget') {
      // Hoy es mock — Sprint B BFF llamará a memory.semantic.forget del Gateway
      _toast('Olvidando este hecho', { kind: 'info' });
      window.dispatchEvent(new CustomEvent('mtx:memory-forget', {
        detail: { fact: detail.fact, factIndex: detail.factIndex },
      }));
      return;
    }
  }


  // ─── calendar_mini — tap abre AgendaSheet del Home ───────────────────────
  function handleCalendarMini(detail) {
    if (detail.value === 'open_agenda') {
      // Reusa el evento existente del Home header para abrir AgendaSheet
      window.dispatchEvent(new CustomEvent('mtx:open-agenda-sheet', { detail: {} }));
      return;
    }
  }


  // ─── map_mini — abrir maps externa ───────────────────────────────────────
  function handleMapMini(detail) {
    if (detail.value === 'open_maps') {
      _toast('Abriendo Maps', { kind: 'info' });
      // En producción esto haría window.location = 'maps://...' o https://maps.google.com/?q=...
      return;
    }
  }


  // ─── image_inline — fullscreen viewer ────────────────────────────────────
  function handleImageInline(detail) {
    if (detail.value === 'fullscreen') {
      // En producción esto abriría un lightbox. Por ahora dispatch para que
      // otros listeners (futuro componente) lo consuman.
      window.dispatchEvent(new CustomEvent('mtx:open-image-fullscreen', {
        detail: { src: detail.src, artifact: detail.artifact },
      }));
      return;
    }
  }


  // ─── video_inline — abrir player ─────────────────────────────────────────
  function handleVideoInline(detail) {
    if (detail.value === 'play') {
      _toast('Reproduciendo video', { kind: 'info' });
      window.dispatchEvent(new CustomEvent('mtx:open-video-fullscreen', {
        detail: { artifact: detail.artifact },
      }));
      return;
    }
  }


  // ─── source_list (B1 Sprint A.6) ────────────────────────────────────────
  // Acciones:
  //   • open_source → window.open en nueva pestaña (vs deep-link iOS)
  //   • summarize_top → dispara nuevo prompt al engine con la source elegida
  //     usando el flow web_fetch (B2) → article_summary con memoryConnection
  function handleSourceList(detail) {
    var value = detail.value;
    var source = detail.source;

    if (value === 'open_source' && source && source.domain) {
      // Source no trae URL completo en mock (solo domain) — abre el dominio raíz
      var url = source.url || ('https://' + source.domain);
      try { window.open(url, '_blank', 'noopener,noreferrer'); }
      catch (_) { _toast('No pude abrir el enlace', { kind: 'warn' }); }
      return;
    }
    if (value === 'summarize_top' && source) {
      // Dispara un nuevo flow web_fetch sobre la URL elegida → el coach
      // generará un article_summary con memoryConnection (B2 + B1 chain)
      var convId = window.__mtxIAChat && window.__mtxIAChat.getCurrentId();
      if (!convId) return;
      var srcUrl = source.url || ('https://' + (source.domain || 'sitio.com'));
      var prompt = 'Léeme y resúmeme esto: ' + srcUrl;
      window.__mtxIAChat.addMessage(convId, {
        role: 'user', content: prompt, state: 'done',
      });
      var asstMsg = window.__mtxIAChat.addMessage(convId, {
        role: 'assistant', content: '', state: 'reasoning',
      });
      if (window.__mtxCoachEngine) {
        window.__mtxCoachEngine.generate({
          convId: convId,
          msgId: asstMsg.id,
          prompt: prompt,
          mode: 'fresh',
        });
      }
      return;
    }
  }


  // ─── article_summary (B2 Sprint A.6) ────────────────────────────────────
  // Acciones del resumen de artículo:
  //   • open_original → window.open en nueva pestaña (vs deep-link iOS)
  //   • save_library → mock por ahora (placeholder para post-MVP biblioteca)
  //   • apply_to_plan → injecta nuevo user msg al chat pidiendo aplicar
  function handleArticleSummary(detail) {
    var value = detail.value;
    var artifact = detail.artifact || {};
    var url = (detail.url) || artifact.originalUrl;

    if (value === 'open_original' && url) {
      try { window.open(url, '_blank', 'noopener,noreferrer'); }
      catch (_) { _toast('No pude abrir el enlace', { kind: 'warn' }); }
      return;
    }
    if (value === 'save_library') {
      // Placeholder: por ahora mock + toast. Post-MVP: store de biblioteca real.
      _toast('Guardado en tu biblioteca', { kind: 'success' });
      // Si el user tiene memoria activa, autoSave el título como referencia
      if (window.__mtxMemoryStore && artifact.title) {
        try {
          window.__mtxMemoryStore.save({
            type: 'context',
            label: 'Leí: "' + artifact.title + '"',
            value: artifact.author ? 'por ' + artifact.author : '',
            source: 'auto',
          });
        } catch (_) {}
      }
      return;
    }
    if (value === 'apply_to_plan') {
      // Inyecta un user msg para que el coach proponga cómo aplicar este
      // artículo al plan del user. El flow natural sigue desde ahí.
      var convId = window.__mtxIAChat && window.__mtxIAChat.getCurrentId();
      if (!convId || !window.__mtxIAChat) return;
      var prompt = 'Aplica los puntos de este artículo a mi plan: "' + (artifact.title || 'el artículo') + '"';
      window.__mtxIAChat.addMessage(convId, {
        role: 'user',
        content: prompt,
        state: 'done',
      });
      // Disparar el engine para que responda
      var asstMsg = window.__mtxIAChat.addMessage(convId, {
        role: 'assistant',
        content: '',
        state: 'reasoning',
      });
      if (window.__mtxCoachEngine) {
        window.__mtxCoachEngine.generate({
          convId: convId,
          msgId: asstMsg.id,
          prompt: prompt,
          mode: 'fresh',
        });
      }
      return;
    }
  }


  // ─── integration_action_card — connect / sync / open ────────────────────
  // Sprint A.6 · B9: el coach puede pedirle al user que conecte una integración
  // (Apple Health, Google Cal, etc.) desde el chat. El value sigue patrón
  // 'connect:<id>' | 'sync:<id>' | 'open:<id>' | 'dismiss'.
  function handleIntegrationActionCard(detail) {
    var value = detail.value || '';
    if (value === 'dismiss') return;
    var parts = value.split(':');
    var op = parts[0]; var integId = parts[1];
    if (!op || !integId) return;

    if (op === 'connect') {
      // Dispatch para abrir el detail sheet de la integración en Settings.
      // Si Settings no está abierto, el listener navega allá primero.
      window.dispatchEvent(new CustomEvent('mtx:open-integration-detail', {
        detail: { integrationId: integId },
      }));
      _toast('Abriendo Apple Health', { kind: 'info' });
      return;
    }
    if (op === 'sync') {
      // Resync inmediato del wearable store sin abrir sheet
      if (integId === 'appleHealth' && window.__mtxWearableStore) {
        var ok = window.__mtxWearableStore.resync();
        _toast(ok ? 'Sincronizando Apple Health' : 'Apple Health no está conectada', { kind: ok ? 'info' : 'warn' });
      }
      return;
    }
    if (op === 'open') {
      window.dispatchEvent(new CustomEvent('mtx:open-integration-detail', {
        detail: { integrationId: integId },
      }));
      return;
    }
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT LISTENER GLOBAL
  // ═══════════════════════════════════════════════════════════════════════════
  function onArtifactAction(e) {
    var detail = (e && e.detail) || {};
    if (!detail.kind) return;

    switch (detail.kind) {
      // Semana 1
      case 'plan_card':
        handlePlanCard(detail);
        break;
      case 'confirmation_card':
        handleConfirmationCard(detail);
        break;
      case 'recommendation_card':
        handleRecommendationCard(detail);
        break;
      // Semana 2 — nuevos handlers
      case 'step_by_step':
        handleStepByStep(detail);
        break;
      case 'error_gentle':
        handleErrorGentle(detail);
        break;
      case 'memory_recall_card':
        handleMemoryRecallCard(detail);
        break;
      case 'calendar_mini':
        handleCalendarMini(detail);
        break;
      case 'map_mini':
        handleMapMini(detail);
        break;
      case 'image_inline':
        handleImageInline(detail);
        break;
      case 'video_inline':
        handleVideoInline(detail);
        break;
      // Sprint A.6 · B9 — integration_action_card
      case 'integration_action_card':
        handleIntegrationActionCard(detail);
        break;
      // B2 (Sprint A.6) — article_summary actions
      case 'article_summary':
        handleArticleSummary(detail);
        break;
      // B1 (Sprint A.6) — source_list actions
      case 'source_list':
        handleSourceList(detail);
        break;
      // B5 REFACTOR — cancel inline del browse_progress_card live.
      // El handler primary del cancel es la llamada directa al runner desde
      // el artifact (sync immediate). Este case es defensive: si alguien dispara
      // el event desde otra surface sin tener acceso al runner, igual aborta.
      case 'browse_progress_card':
        if (detail.value === 'cancel' && window.__mtxBrowseActRunner) {
          // Si detail.msgId vino, cancelar ese específico; si no, mejor effort.
          if (detail.msgId) {
            window.__mtxBrowseActRunner.cancel(detail.msgId);
          }
        }
        break;
      // Artifacts informativos sin acciones (insight, stats, quote, progress,
      // comparison, timeline, mermaid, loading, audio): no-op por diseño
      default:
        console.info('[coach-actions] Acción sin handler:', detail.kind, detail.value);
    }
  }

  window.addEventListener('mtx:coach-artifact-action', onArtifactAction);

  // ═══════════════════════════════════════════════════════════════════════════
  // Sprint A.8 — Generative media listeners (image + video flow)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Trigger surfaces:
  //   1. `mtx:coach-trigger-image-gen` { prompt, model?, aspectRatio? }
  //      Dispatcheado desde: slash command /imagen, skills menu, mensaje del
  //      user con keyword "visualízame / genera imagen". El bridge crea
  //      automáticamente el msg del coach con artifact image_gen_job + live state.
  //
  //   2. `mtx:coach-trigger-video-gen` { prompt, aspectRatio? }
  //      Dispatcheado desde: slash command /video, skills menu, keyword
  //      "crea video / genera video". El bridge corre el flow multi-step:
  //      storyboard → voz → approve → render.
  //
  // Cuando llegue backend (Brandon), estas surfaces siguen iguales — sólo
  // cambia el dispatcher interior de submit a llamadas reales al Gateway.

  function _appendCoachMsg(content, artifacts) {
    if (!window.__mtxIAChat) return null;
    var current = window.__mtxIAChat.getCurrent && window.__mtxIAChat.getCurrent();
    if (!current) return null;
    var msgId = 'msg-coach-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e4);
    window.__mtxIAChat.addMessage(current.id, {
      id: msgId,
      role: 'assistant',
      content: content || '',
      state: 'done',
      artifacts: artifacts || [],
      createdAt: Date.now(),
    });
    return msgId;
  }

  function _updateLastArtifact(msgId, patch) {
    if (!window.__mtxIAChat || !window.__mtxIAChat.updateMessage) return;
    // Como no tenemos un updateArtifact dedicado, lo hacemos vía updateMessage
    // que reemplaza props arbitrarias del msg. El componente lee el artifact
    // del store de cada generador, pero el patch sirve para forzar re-render.
    var current = window.__mtxIAChat.getCurrent && window.__mtxIAChat.getCurrent();
    if (!current) return;
    var msg = (current.messages || []).find(function(m) { return m.id === msgId; });
    if (!msg) return;
    if (Array.isArray(msg.artifacts) && msg.artifacts.length > 0) {
      Object.assign(msg.artifacts[msg.artifacts.length - 1], patch);
    }
    window.__mtxIAChat.updateMessage(current.id, msgId, { artifacts: msg.artifacts });
  }

  function handleImageGenTrigger(detail) {
    if (!window.__mtxImageGen) {
      console.warn('[coach-actions] __mtxImageGen no listo');
      return;
    }
    var prompt = (detail && detail.prompt || '').trim();
    if (!prompt) return;
    var aspectRatio = (detail && detail.aspectRatio) || '1:1';
    var modelId = (detail && detail.model) || window.__mtxImageGen.recommendModel(prompt).id;

    window.__mtxImageGen.submit({
      prompt: prompt, model: modelId, aspectRatio: aspectRatio,
    }).then(function(res) {
      _appendCoachMsg(
        'Generando una imagen para vos · esto toma ~15s',
        [{
          kind: 'image_gen_job',
          jobId: res.jobId,
          prompt: prompt,
          model: modelId,
          aspectRatio: aspectRatio,
          state: 'live',
          progress: 0,
        }]
      );
    });
  }

  function handleVideoGenTrigger(detail) {
    if (!window.__mtxVideoGen) {
      console.warn('[coach-actions] __mtxVideoGen no listo');
      return;
    }
    var prompt = (detail && detail.prompt || '').trim();
    if (!prompt) return;
    var aspectRatio = (detail && detail.aspectRatio) || '9:16';

    // Step 1: emite primer mensaje del coach armando el storyboard
    _appendCoachMsg(
      'Te armo el storyboard primero · 4-6 escenas, podés editarlo antes de generar el video.',
      [{
        kind: 'loading_skeleton',
        label: 'Componiendo escenas',
      }]
    );

    // Step 2: cuando storyboard listo, reemplazar con storyboard_draft
    window.__mtxVideoGen.submitStoryboard({
      prompt: prompt, aspectRatio: aspectRatio,
    }).then(function(sb) {
      _appendCoachMsg(
        '',
        [{
          kind: 'storyboard_draft',
          storyboardId: sb.storyboardId,
          state: 'draft',
        }]
      );
    });
  }

  function handleStoryboardApprove(detail) {
    if (!window.__mtxVideoGen) return;
    var storyboardId = detail && detail.storyboardId;
    if (!storyboardId) return;

    // Marca el storyboard_draft como approved (visualmente cambia)
    // El último msg con kind storyboard_draft del storyboardId — lo encontramos
    var current = window.__mtxIAChat && window.__mtxIAChat.getCurrent();
    if (current) {
      for (var i = current.messages.length - 1; i >= 0; i--) {
        var m = current.messages[i];
        if (!m.artifacts) continue;
        var found = m.artifacts.find(function(a) { return a.kind === 'storyboard_draft' && a.storyboardId === storyboardId; });
        if (found) {
          _updateLastArtifact(m.id, { state: 'approved' });
          break;
        }
      }
    }

    // Submit video y aparece job artifact
    window.__mtxVideoGen.submitVideo(storyboardId).then(function(res) {
      _appendCoachMsg(
        'Generando tu video · esto toma 1-3 minutos.',
        [{
          kind: 'video_gen_job',
          jobId: res.jobId,
          storyboardId: storyboardId,
          state: 'live',
        }]
      );
    });
  }

  function handleOpenVoicePicker(detail) {
    var storyboardId = detail && detail.storyboardId;
    if (!storyboardId) return;
    _appendCoachMsg(
      '',
      [{
        kind: 'voice_picker',
        storyboardId: storyboardId,
      }]
    );
  }

  function handleImageGenRestart(detail) {
    if (!detail || !detail.jobId) return;
    _appendCoachMsg(
      'Regenerando con el mismo prompt · vamos otra vez',
      [{
        kind: 'image_gen_job',
        jobId: detail.jobId,
        prompt: detail.prompt,
        model: detail.model,
        aspectRatio: detail.aspectRatio,
        state: 'live',
        progress: 0,
      }]
    );
  }

  function handleVideoGenRestart(detail) {
    if (!detail || !detail.jobId) return;
    _appendCoachMsg(
      'Regenerando video · paciencia',
      [{
        kind: 'video_gen_job',
        jobId: detail.jobId,
        storyboardId: detail.storyboardId,
        state: 'live',
      }]
    );
  }

  window.addEventListener('mtx:coach-trigger-image-gen', function(e) { handleImageGenTrigger(e.detail); });
  window.addEventListener('mtx:coach-trigger-video-gen', function(e) { handleVideoGenTrigger(e.detail); });
  window.addEventListener('mtx:storyboard-approve', function(e) { handleStoryboardApprove(e.detail); });
  window.addEventListener('mtx:open-voice-picker', function(e) { handleOpenVoicePicker(e.detail); });
  window.addEventListener('mtx:image-gen-restart', function(e) { handleImageGenRestart(e.detail); });
  window.addEventListener('mtx:video-gen-restart', function(e) { handleVideoGenRestart(e.detail); });

  // ─ Export del bridge para inspect / future hot-reload ─
  window.__mtxCoachActionsBridge = {
    // Semana 1
    handlePlanCard: handlePlanCard,
    handleConfirmationCard: handleConfirmationCard,
    handleRecommendationCard: handleRecommendationCard,
    // Semana 2
    handleStepByStep: handleStepByStep,
    handleErrorGentle: handleErrorGentle,
    handleMemoryRecallCard: handleMemoryRecallCard,
    handleCalendarMini: handleCalendarMini,
    handleMapMini: handleMapMini,
    handleImageInline: handleImageInline,
    handleVideoInline: handleVideoInline,
    // Sprint A.6 · B9
    handleIntegrationActionCard: handleIntegrationActionCard,
    // Sprint A.6 · B2
    handleArticleSummary: handleArticleSummary,
    // Sprint A.6 · B1
    handleSourceList: handleSourceList,
    // Sprint A.8 · Generative media
    handleImageGenTrigger: handleImageGenTrigger,
    handleVideoGenTrigger: handleVideoGenTrigger,
    handleStoryboardApprove: handleStoryboardApprove,
    handleOpenVoicePicker: handleOpenVoicePicker,
    handleImageGenRestart: handleImageGenRestart,
    handleVideoGenRestart: handleVideoGenRestart,
    // Helpers expuestos para tests
    _parseTimeFromText: _parseTimeFromText,
    _dayOffsetFromLabel: _dayOffsetFromLabel,
  };

  console.info('[coach-actions] Bridge mtx:coach-artifact-action listo. Las acciones de los artefactos del coach ahora ejecutan en stores reales del producto.');
})();
