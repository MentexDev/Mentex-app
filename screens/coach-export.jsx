// ═══════════════════════════════════════════════════════════════════════════
// coach-export.jsx — C10 Export PDF / Markdown / Imagen larga
// ═══════════════════════════════════════════════════════════════════════════
//
// Bottom-sheet con 3 opciones de exportación fiel de una conversación:
//
//   1. PDF              — texto vectorial searchable (jsPDF text-mode)
//   2. Markdown         — .md con frontmatter + serialización de artifacts
//   3. Imagen larga PNG — html2canvas sobre el scroller completo
//
// Naming canónico:
//   Mentex-conv-{title-slug}-{YYYY-MM-DD}.{pdf|md|png}
//
// Entry point: nuevo botón "Exportar como…" agregado a CoachShareSheet.
// Se abre como hermano (no anidado) — primero cierra el share sheet,
// luego se abre el export sheet, para evitar overlays apilados.
//
// Carga de libs (jsPDF + html2canvas):
//   • Lazy-load on-demand via dynamic <script> injection desde CDN
//   • Singletons con promise para evitar doble carga
//   • Si falla el CDN, fallback graceful con toast de error
//
// Persistencia / state:
//   • Sin localStorage — export es one-shot
//   • Last export type recordado en memoria solo durante la sesión
//
// Stores expuestos:
//   • window.CoachExportSheet     — componente
//   • window.__mtxCoachExport     — { open(conv), close(), exportPDF(conv),
//                                     exportMarkdown(conv), exportImage(conv),
//                                     conversationToMarkdown(conv) }
//
// ═══════════════════════════════════════════════════════════════════════════

(function() {
  if (typeof window === 'undefined' || window.CoachExportSheet) return;

  // ──────────────────────────────────────────────────────────────────────────
  // CDN URLs (pinned)
  // ──────────────────────────────────────────────────────────────────────────
  var CDN_JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  var CDN_H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

  // ──────────────────────────────────────────────────────────────────────────
  // Promise singletons para cargar libs on-demand (evita double-load)
  // ──────────────────────────────────────────────────────────────────────────
  var _jspdfPromise = null;
  var _h2cPromise = null;

  function _loadScript(url) {
    return new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = function() { resolve(); };
      s.onerror = function() {
        s.remove();
        reject(new Error('Failed to load ' + url));
      };
      document.head.appendChild(s);
    });
  }

  function loadJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (!_jspdfPromise) {
      _jspdfPromise = _loadScript(CDN_JSPDF).then(function() {
        if (!window.jspdf || !window.jspdf.jsPDF) {
          _jspdfPromise = null;  // permitir retry
          throw new Error('jsPDF no expuesto en window.jspdf');
        }
        return window.jspdf.jsPDF;
      }).catch(function(err) {
        _jspdfPromise = null;
        throw err;
      });
    }
    return _jspdfPromise;
  }

  function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (!_h2cPromise) {
      _h2cPromise = _loadScript(CDN_H2C).then(function() {
        if (!window.html2canvas) {
          _h2cPromise = null;
          throw new Error('html2canvas no expuesto en window');
        }
        return window.html2canvas;
      }).catch(function(err) {
        _h2cPromise = null;
        throw err;
      });
    }
    return _h2cPromise;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers — slug + fecha + toast wrapper
  // ──────────────────────────────────────────────────────────────────────────
  function slugify(s) {
    if (!s) return 'conversacion';
    return String(s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip accents
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'conversacion';
  }

  function today() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function filename(conv, ext) {
    return 'Mentex-conv-' + slugify(conv.title || 'conversacion') + '-' + today() + '.' + ext;
  }

  function toast(msg, kind) {
    if (window.__mtxToast && window.__mtxToast.show) {
      window.__mtxToast.show(msg, { kind: kind || 'info', durationMs: 2400 });
    } else {
      console.log('[export]', msg);
    }
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  function downloadDataUrl(dataUrl, name) {
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Artifact serialization — convierte un artifact a markdown legible
  // ──────────────────────────────────────────────────────────────────────────
  // Cada artifact tiene un `kind` distinto. Serializamos los que llevan datos
  // textuales relevantes y omitimos los puramente visuales sin texto.
  //
  // Convención: cada artifact serializado va en una mini-sección con título
  // "**[icon] [tipo]**" y un bloque indentado debajo. Si no podemos serializar
  // algo, devolvemos null y se omite del output.
  function artifactToMarkdown(art) {
    if (!art || !art.kind) return null;
    var lines = [];

    switch (art.kind) {
      case 'image':
      case 'image_inline':
        lines.push('> 🖼️ **Imagen generada**');
        if (art.caption) lines.push('> ' + art.caption);
        if (art.src) lines.push('> ![](' + art.src + ')');
        break;

      case 'video_inline':
        lines.push('> 🎬 **Video**');
        if (art.title) lines.push('> _' + art.title + '_');
        if (art.durationSec) lines.push('> Duración: ' + art.durationSec + 's');
        break;

      case 'voice':
      case 'voice_note':
        lines.push('> 🎙️ **Nota de voz** · ' + (art.durationSec || '?') + 's');
        if (art.transcript) lines.push('> Transcripción: _' + art.transcript + '_');
        break;

      case 'content':
      case 'recommendation_card':
        lines.push('> 📚 **Recomendación**');
        if (art.title) lines.push('> **' + art.title + '**');
        if (art.author) lines.push('> _' + art.author + '_');
        if (art.summary) lines.push('> ' + art.summary);
        break;

      case 'calendar':
      case 'calendar_mini':
        lines.push('> 📅 **Calendario**');
        if (Array.isArray(art.events)) {
          art.events.forEach(function(ev) {
            lines.push('> - ' + (ev.time || '') + ' · ' + (ev.title || ''));
          });
        }
        break;

      case 'reminder':
        lines.push('> ⏰ **Recordatorio**');
        if (art.title) lines.push('> **' + art.title + '**');
        if (art.when) lines.push('> Cuándo: ' + art.when);
        break;

      case 'plan_card':
        lines.push('> 📋 **Plan**');
        if (art.title) lines.push('> **' + art.title + '**');
        if (Array.isArray(art.items)) {
          art.items.forEach(function(it) {
            lines.push('> - ' + (typeof it === 'string' ? it : (it.label || it.text || '')));
          });
        }
        break;

      case 'confirmation_card':
        lines.push('> ✅ **Confirmación**');
        if (art.title) lines.push('> **' + art.title + '**');
        if (art.description) lines.push('> ' + art.description);
        break;

      case 'insight_card':
        lines.push('> 💡 **Insight**');
        if (art.title) lines.push('> **' + art.title + '**');
        if (art.body) lines.push('> ' + art.body);
        break;

      case 'stats_compact':
        lines.push('> 📊 **Stats**');
        if (Array.isArray(art.stats)) {
          art.stats.forEach(function(st) {
            lines.push('> - ' + (st.label || '') + ': **' + (st.value || '') + '**');
          });
        }
        break;

      case 'step_by_step':
        lines.push('> 🪜 **Pasos**');
        if (Array.isArray(art.steps)) {
          art.steps.forEach(function(st, i) {
            var label = typeof st === 'string' ? st : (st.label || st.text || '');
            lines.push('> ' + (i + 1) + '. ' + label);
          });
        }
        break;

      case 'crisis_support_card':
        lines.push('> 🆘 **Soporte de crisis**');
        if (art.title) lines.push('> **' + art.title + '**');
        if (art.body) lines.push('> ' + art.body);
        break;

      case 'quote_card':
        lines.push('> 💬 **Cita**');
        if (art.text) lines.push('> > _' + art.text + '_');
        if (art.author) lines.push('> > — ' + art.author);
        break;

      case 'progress_viz':
        lines.push('> 📈 **Progreso**');
        if (art.title) lines.push('> **' + art.title + '**');
        if (art.value != null) lines.push('> Valor: ' + art.value);
        break;

      case 'comparison_table':
        lines.push('> ⚖️ **Comparación**');
        if (Array.isArray(art.rows)) {
          art.rows.forEach(function(r) {
            lines.push('> - ' + (r.label || '') + ': ' + (r.a || '') + ' vs ' + (r.b || ''));
          });
        }
        break;

      case 'recommendation_list':
        lines.push('> 📝 **Lista de recomendaciones**');
        if (Array.isArray(art.items)) {
          art.items.forEach(function(it) {
            lines.push('> - ' + (typeof it === 'string' ? it : (it.title || it.label || '')));
          });
        }
        break;

      case 'memory_recall_card':
        lines.push('> 🧠 **Memoria recordada**');
        if (art.summary) lines.push('> ' + art.summary);
        if (Array.isArray(art.items)) {
          art.items.forEach(function(it) {
            lines.push('> - ' + (typeof it === 'string' ? it : (it.text || it.label || '')));
          });
        }
        break;

      case 'timeline_mini':
        lines.push('> 🕐 **Timeline**');
        if (Array.isArray(art.events)) {
          art.events.forEach(function(ev) {
            lines.push('> - ' + (ev.when || '') + ' · ' + (ev.what || ev.title || ''));
          });
        }
        break;

      case 'error_gentle':
        lines.push('> ⚠️ **Aviso**');
        if (art.message) lines.push('> ' + art.message);
        break;

      case 'loading_skeleton':
        return null;  // visual-only

      case 'map_mini':
        lines.push('> 🗺️ **Ubicación**');
        if (art.place) lines.push('> ' + art.place);
        if (art.address) lines.push('> ' + art.address);
        break;

      case 'mermaid_diagram':
        lines.push('> 🧩 **Diagrama**');
        if (art.code) {
          lines.push('> ```mermaid');
          art.code.split('\n').forEach(function(l) { lines.push('> ' + l); });
          lines.push('> ```');
        }
        break;

      case 'thinking_panel':
        lines.push('> 🧠 **Razonamiento extendido**');
        if (Array.isArray(art.thoughts)) {
          art.thoughts.forEach(function(t) {
            var txt = typeof t === 'string' ? t : (t.text || '');
            if (txt) lines.push('> - ' + txt);
          });
        }
        break;

      case 'browse_progress_card':
        lines.push('> 🌐 **Navegación web**');
        if (art.goal) lines.push('> Objetivo: ' + art.goal);
        if (Array.isArray(art.steps)) {
          art.steps.forEach(function(st) {
            var label = typeof st === 'string' ? st : (st.label || st.text || '');
            if (label) lines.push('> - ' + label);
          });
        }
        if (art.bookingRef) lines.push('> Ref: `' + art.bookingRef + '`');
        break;

      case 'article_summary':
        lines.push('> 📄 **Resumen de artículo**');
        if (art.title) lines.push('> **' + art.title + '**');
        if (art.author) lines.push('> _' + art.author + '_');
        if (art.url) lines.push('> ' + art.url);
        if (Array.isArray(art.bullets)) {
          art.bullets.forEach(function(b) {
            lines.push('> - ' + (typeof b === 'string' ? b : (b.text || '')));
          });
        }
        if (art.memoryConnection) {
          lines.push('> ');
          lines.push('> ⭐ _Conexión con memoria: ' + art.memoryConnection + '_');
        }
        break;

      case 'source_list':
        lines.push('> 🔍 **Fuentes**');
        if (art.query) lines.push('> Búsqueda: _' + art.query + '_');
        if (Array.isArray(art.sources)) {
          art.sources.forEach(function(s) {
            if (typeof s === 'string') { lines.push('> - ' + s); return; }
            var line = '> - **' + (s.title || s.name || '') + '**';
            if (s.url) line += ' — ' + s.url;
            lines.push(line);
            if (s.snippet) lines.push('>   ' + s.snippet);
          });
        }
        break;

      case 'integration_action_card':
        lines.push('> 🔌 **Integración**');
        if (art.integration) lines.push('> ' + art.integration);
        if (art.action) lines.push('> Acción: ' + art.action);
        break;

      default:
        // Genérico: si tiene title o text, lo serializamos
        if (art.title || art.text || art.summary) {
          lines.push('> 📎 **' + (art.kind || 'artifact') + '**');
          if (art.title) lines.push('> **' + art.title + '**');
          if (art.text) lines.push('> ' + art.text);
          if (art.summary) lines.push('> ' + art.summary);
        } else {
          return null;
        }
    }

    return lines.join('\n');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Markdown serializer — conversación completa con frontmatter
  // ──────────────────────────────────────────────────────────────────────────
  function conversationToMarkdown(conv) {
    if (!conv) return '';
    var msgs = Array.isArray(conv.messages) ? conv.messages : [];
    var title = conv.title || 'Conversación con Mentex';
    var dateStr = today();

    // Frontmatter (YAML — útil para Notion, Obsidian)
    var fm = [
      '---',
      'title: "' + title.replace(/"/g, '\\"') + '"',
      'source: Mentex',
      'exported: ' + dateStr,
      'messages: ' + msgs.length,
      '---',
      '',
    ];

    var lines = fm.slice();
    lines.push('# ' + title);
    lines.push('');
    lines.push('_Conversación con tu coach Mentex · exportada el ' + dateStr + '_');
    lines.push('');
    lines.push('---');
    lines.push('');

    msgs.forEach(function(m) {
      if (!m) return;
      var isUser = m.role === 'user';
      var label = isUser ? '## 🧑 Yo' : '## 🌿 Mentex';
      lines.push(label);
      lines.push('');

      var content = (m.content || '').trim();
      if (content) {
        // Cada línea del contenido la dejamos tal cual (preserva markdown
        // que el coach ya pueda haber generado).
        lines.push(content);
        lines.push('');
      } else if (m.state === 'error') {
        lines.push('_(error · ' + (m.errorMessage || 'falló la respuesta') + ')_');
        lines.push('');
      }

      // Artifacts adjuntos
      var arts = Array.isArray(m.artifacts) ? m.artifacts : [];
      arts.forEach(function(art) {
        var rendered = artifactToMarkdown(art);
        if (rendered) {
          lines.push(rendered);
          lines.push('');
        }
      });

      // Steps del coach (timeline) solo si hay y son relevantes
      var steps = Array.isArray(m.steps) ? m.steps : [];
      if (steps.length > 0 && !isUser) {
        var meaningfulSteps = steps.filter(function(s) {
          return s && (s.label || s.title) && s.status !== 'cancelled';
        });
        if (meaningfulSteps.length > 0) {
          lines.push('<details>');
          lines.push('<summary>🧰 Pasos del coach (' + meaningfulSteps.length + ')</summary>');
          lines.push('');
          meaningfulSteps.forEach(function(s) {
            var icon = s.status === 'done' ? '✓' : s.status === 'error' ? '✗' : '·';
            lines.push('- ' + icon + ' ' + (s.label || s.title));
          });
          lines.push('');
          lines.push('</details>');
          lines.push('');
        }
      }
    });

    lines.push('---');
    lines.push('');
    lines.push('_Generado por Mentex · [mentex.app](https://mentex.app)_');

    return lines.join('\n');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PDF generator — text-vector mode con jsPDF (searchable, ligero)
  // ──────────────────────────────────────────────────────────────────────────
  // Diseño:
  //   • Página A4 portrait (210×297 mm)
  //   • Margins 18mm laterales / 22mm top-bottom
  //   • Header con título + fecha (solo en la primera página)
  //   • Footer con paginación "Página N · Mentex"
  //   • Cada mensaje:
  //       - Etiqueta "🧑 Yo" o "🌿 Mentex" en bold neon-tint
  //       - Body en text wrap con splitTextToSize
  //       - Artifacts en frame con leftBorder accent
  //   • Saltos de página automáticos cuando se acerca al borde inferior
  //
  function generatePDF(conv) {
    return loadJsPDF().then(function(JsPDF) {
      var doc = new JsPDF({ unit: 'mm', format: 'a4' });
      var pageW = 210, pageH = 297;
      var marginX = 18, marginTopFirst = 26, marginTop = 18, marginBottom = 22;
      var contentW = pageW - marginX * 2;
      var y = marginTopFirst;
      var pageNum = 1;

      // Colors (R,G,B)
      var COLOR_INK_1 = [22, 28, 30];
      var COLOR_INK_2 = [80, 90, 92];
      var COLOR_INK_3 = [135, 145, 145];
      var COLOR_NEON = [10, 130, 110];
      var COLOR_PURPLE = [110, 90, 200];
      var COLOR_RULE = [218, 222, 220];

      function setColor(rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
      function setDrawColor(rgb) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }
      function setFillColor(rgb) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }

      function footer() {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        setColor(COLOR_INK_3);
        doc.text('Página ' + pageNum + ' · Mentex', pageW / 2, pageH - 10, { align: 'center' });
      }

      function header() {
        // Solo aparece en la primera página
        if (pageNum !== 1) return;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        setColor(COLOR_INK_1);
        var title = conv.title || 'Conversación con Mentex';
        var titleLines = doc.splitTextToSize(title, contentW);
        doc.text(titleLines, marginX, 16);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        setColor(COLOR_INK_3);
        doc.text('Exportada el ' + today() + ' · mentex.app', marginX, 22);
        setDrawColor(COLOR_RULE);
        doc.setLineWidth(0.2);
        doc.line(marginX, 24, pageW - marginX, 24);
      }

      function newPage() {
        footer();
        doc.addPage();
        pageNum += 1;
        y = marginTop;
      }

      function ensureSpace(needed) {
        if (y + needed > pageH - marginBottom) {
          newPage();
        }
      }

      function writeBlock(text, opts) {
        opts = opts || {};
        var size = opts.size || 10;
        var style = opts.style || 'normal';
        var color = opts.color || COLOR_INK_1;
        var leftPad = opts.leftPad || 0;
        var indentPx = marginX + leftPad;

        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        setColor(color);

        var w = contentW - leftPad;
        // splitTextToSize respeta \n y wrappea por ancho
        var lines = doc.splitTextToSize(String(text == null ? '' : text), w);
        var lineH = size * 0.42;  // mm aprox por línea (heurística)
        for (var i = 0; i < lines.length; i++) {
          ensureSpace(lineH + 1);
          doc.text(lines[i], indentPx, y);
          y += lineH;
        }
      }

      function writeArtifact(art) {
        var md = artifactToMarkdown(art);
        if (!md) return;
        ensureSpace(8);
        // Frame visual: barra izquierda + fondo sutil
        var startY = y - 3;
        var artLines = md.split('\n').map(function(l) { return l.replace(/^> ?/, ''); });

        // Dibujamos rect placeholder, calculamos altura después
        var measuredY = y;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        var lineH = 9 * 0.42;
        var totalH = 0;
        artLines.forEach(function(l) {
          var wrapped = doc.splitTextToSize(l, contentW - 6);
          totalH += wrapped.length * lineH;
        });

        // Si el bloque entero no cabe, lo movemos a página nueva
        if (y + totalH + 4 > pageH - marginBottom) {
          newPage();
          startY = y - 3;
        }

        // Barra accent
        setFillColor([225, 245, 240]);
        doc.rect(marginX, y - 2, contentW, totalH + 4, 'F');
        setFillColor(COLOR_NEON);
        doc.rect(marginX, y - 2, 1.2, totalH + 4, 'F');

        // Texto
        artLines.forEach(function(l, idx) {
          doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
          doc.setFontSize(9);
          setColor(idx === 0 ? COLOR_NEON : COLOR_INK_2);
          var wrapped = doc.splitTextToSize(l, contentW - 6);
          wrapped.forEach(function(wl) {
            doc.text(wl, marginX + 4, y);
            y += lineH;
          });
        });
        y += 3;
      }

      // RENDER ─────────────────────────────────────────────────────────────
      header();

      var msgs = Array.isArray(conv.messages) ? conv.messages : [];
      msgs.forEach(function(m, idx) {
        if (!m) return;
        var isUser = m.role === 'user';

        ensureSpace(12);

        // Label "Yo" / "Mentex"
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        setColor(isUser ? COLOR_PURPLE : COLOR_NEON);
        doc.text(isUser ? 'Yo' : 'Mentex', marginX, y);
        y += 5;

        // Content body
        var content = (m.content || '').trim();
        if (content) {
          writeBlock(content, { size: 10.5, color: COLOR_INK_1 });
        } else if (m.state === 'error') {
          writeBlock('(error · ' + (m.errorMessage || 'falló la respuesta') + ')', {
            size: 9, style: 'italic', color: COLOR_INK_3,
          });
        }

        // Artifacts
        var arts = Array.isArray(m.artifacts) ? m.artifacts : [];
        arts.forEach(writeArtifact);

        // Separator entre mensajes
        if (idx < msgs.length - 1) {
          y += 4;
          setDrawColor(COLOR_RULE);
          doc.setLineWidth(0.15);
          ensureSpace(2);
          doc.line(marginX, y, pageW - marginX, y);
          y += 5;
        }
      });

      // Footer final
      footer();

      var blob = doc.output('blob');
      downloadBlob(blob, filename(conv, 'pdf'));
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Markdown export — directo, sin libs
  // ──────────────────────────────────────────────────────────────────────────
  function generateMarkdown(conv) {
    var md = conversationToMarkdown(conv);
    var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, filename(conv, 'md'));
    return Promise.resolve();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PNG image export — html2canvas sobre el scroll container del chat
  // ──────────────────────────────────────────────────────────────────────────
  // Estrategia:
  //   1. Encontrar el container del chat scrollable (data-mtx-chat-scroller)
  //   2. Si no existe, fallback a #mtx-ia-messages o .mtx-chat-messages
  //   3. Clonar el nodo en un container off-screen con scrollHeight como height
  //      explícito para capturar TODO el contenido (no solo viewport)
  //   4. html2canvas con scale 2 para retina
  //   5. canvas.toBlob → download
  //
  function findChatNode() {
    // Selector específico añadido por nosotros en ia-flow
    var byAttr = document.querySelector('[data-mtx-chat-scroller]');
    if (byAttr) return byAttr;
    // Fallbacks
    var byId = document.getElementById('mtx-ia-messages');
    if (byId) return byId;
    var byClass = document.querySelector('.mtx-chat-messages');
    if (byClass) return byClass;
    return null;
  }

  function generateImage(conv) {
    return loadHtml2Canvas().then(function(h2c) {
      var node = findChatNode();
      if (!node) {
        throw new Error('No se encontró el área del chat para capturar');
      }

      // Calculamos la dimensión real (incluye scroll). Usamos scrollHeight
      // para capturar todo, no solo viewport.
      var fullW = node.scrollWidth || node.offsetWidth;
      var fullH = node.scrollHeight || node.offsetHeight;

      // Background acorde con el design system (negro Obsidian)
      return h2c(node, {
        backgroundColor: '#0a1410',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        width: fullW,
        height: fullH,
        windowWidth: fullW,
        windowHeight: fullH,
        scrollX: 0,
        scrollY: -node.scrollTop,  // captura desde el top real, no la posición de scroll actual
        logging: false,
      }).then(function(canvas) {
        return new Promise(function(resolve, reject) {
          if (!canvas.toBlob) {
            try {
              var dataUrl = canvas.toDataURL('image/png');
              downloadDataUrl(dataUrl, filename(conv, 'png'));
              resolve();
            } catch (err) { reject(err); }
            return;
          }
          canvas.toBlob(function(blob) {
            if (!blob) { reject(new Error('No se pudo generar el PNG')); return; }
            downloadBlob(blob, filename(conv, 'png'));
            resolve();
          }, 'image/png', 1.0);
        });
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CoachExportSheet — bottom-sheet UI con 3 opciones
  // ──────────────────────────────────────────────────────────────────────────
  function CoachExportSheet(props) {
    var open = props.open;
    var conversation = props.conversation;
    var onClose = props.onClose;

    var busyState = React.useState(null);  // null | 'pdf' | 'md' | 'png'
    var busy = busyState[0]; var setBusy = busyState[1];
    var errorState = React.useState(null);
    var error = errorState[0]; var setError = errorState[1];
    var doneState = React.useState(null);
    var done = doneState[0]; var setDone = doneState[1];

    // Ref para evitar doble-click (la promesa puede tardar 1-3s en iniciar)
    var busyRef = React.useRef(null);
    busyRef.current = busy;

    var backdropDownRef = React.useRef(false);

    // ESC para cerrar + lock scroll body
    React.useEffect(function() {
      if (!open) {
        setBusy(null); setError(null); setDone(null);
        return;
      }
      function onKey(e) {
        if (e.isComposing || e.keyCode === 229) return;
        if (e.key === 'Escape' && !busyRef.current && onClose) onClose();
      }
      window.addEventListener('keydown', onKey);
      var prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return function() {
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = prevOverflow;
      };
    }, [open]);  // intencionalmente sin onClose en deps para no re-correr al cambiar ref

    if (!open || !conversation) return null;

    function run(kind, fn, successMsg) {
      if (busyRef.current) return;
      setBusy(kind); setError(null); setDone(null);
      Promise.resolve()
        .then(function() { return fn(conversation); })
        .then(function() {
          setBusy(null); setDone(kind);
          toast(successMsg || 'Listo · exportado', 'success');
          // Auto-cerrar tras éxito (con un beat para que el user vea el ✓)
          setTimeout(function() {
            if (onClose) onClose();
          }, 900);
        })
        .catch(function(err) {
          console.error('[export ' + kind + ']', err);
          setBusy(null);
          setError((err && err.message) || 'No se pudo exportar');
          toast('No se pudo exportar · ' + ((err && err.message) || 'reintentá'), 'warn');
        });
    }

    function exportPDF() { run('pdf', generatePDF, 'PDF guardado'); }
    function exportMD() { run('md', generateMarkdown, 'Markdown guardado'); }
    function exportPNG() { run('png', generateImage, 'Imagen guardada'); }

    var portalRoot = document.getElementById('mtx-overlay-root') || document.body;
    return ReactDOM.createPortal(
      <div
        onMouseDown={function(e) { backdropDownRef.current = e.target === e.currentTarget; }}
        onClick={function(e) {
          if (busy) { backdropDownRef.current = false; return; }
          if (e.target === e.currentTarget && backdropDownRef.current && onClose) onClose();
          backdropDownRef.current = false;
        }}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(10,20,16,0.40)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1090,
          animation: 'mtx-fade-up .28s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Exportar conversación"
          style={{
            width: '100%', maxWidth: 440,
            background: 'linear-gradient(180deg, rgba(18,22,20,0.985), rgba(12,15,14,0.985))',
            borderTop: '0.5px solid rgba(255,255,255,0.10)',
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            padding: '8px 0 34px',  // 34 = home indicator safe area
            animation: 'mtx-slide-up .3s ease both',
            boxShadow: '0 -12px 32px -4px rgba(0,0,0,0.55)',
          }}>
          {/* Drag handle */}
          <div style={{
            width: 36, height: 4, borderRadius: 999,
            background: 'rgba(255,255,255,0.18)',
            margin: '6px auto 14px',
          }} aria-hidden="true"/>

          {/* Header */}
          <div style={{ padding: '0 20px 8px' }}>
            <div style={{
              fontSize: 15.5, fontWeight: 700,
              color: 'var(--ink-1)',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '-0.01em',
            }}>Exportar conversación</div>
            <div style={{
              fontSize: 11.5, color: 'var(--ink-3)',
              fontFamily: 'var(--ff-sans)',
              marginTop: 2,
              letterSpacing: '-0.005em',
            }}>
              Guardá esta conversación en el formato que prefieras
            </div>
          </div>

          {/* Options */}
          <div style={{
            padding: '8px 14px 0',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <ExportOption
              icon="📄"
              label="PDF"
              sub="Documento searchable · ideal para imprimir o archivar"
              onClick={exportPDF}
              busy={busy === 'pdf'}
              done={done === 'pdf'}
              disabled={!!busy && busy !== 'pdf'}
              accent="#3dffcf"
            />
            <ExportOption
              icon="📝"
              label="Markdown (.md)"
              sub="Texto plano con formato · pegá en Notion, Obsidian, GitHub"
              onClick={exportMD}
              busy={busy === 'md'}
              done={done === 'md'}
              disabled={!!busy && busy !== 'md'}
              accent="#9b8aff"
            />
            <ExportOption
              icon="🖼️"
              label="Imagen larga (PNG)"
              sub="Captura del chat completo · ideal para compartir"
              onClick={exportPNG}
              busy={busy === 'png'}
              done={done === 'png'}
              disabled={!!busy && busy !== 'png'}
              accent="#ffd16a"
            />
          </div>

          {error && (
            <div style={{
              margin: '12px 20px 0', padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(255,139,139,0.06)',
              border: '0.5px solid rgba(255,139,139,0.20)',
              fontSize: 11.5, fontWeight: 500,
              color: '#ff8b8b',
              fontFamily: 'var(--ff-sans)',
              textAlign: 'center',
            }} role="alert">{error}</div>
          )}

          <div style={{
            marginTop: 16,
            padding: '0 20px',
            fontSize: 10.5, color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            textAlign: 'center',
            opacity: 0.7,
            lineHeight: 1.45,
          }}>
            Mentex no comparte el archivo · queda solo en tu dispositivo
          </div>
        </div>
      </div>,
      portalRoot
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ExportOption — botón de cada opción con estado busy/done/disabled
  // ──────────────────────────────────────────────────────────────────────────
  function ExportOption(props) {
    var icon = props.icon, label = props.label, sub = props.sub;
    var busy = !!props.busy, done = !!props.done, disabled = !!props.disabled;
    var accent = props.accent || '#3dffcf';

    function handleKey(e) {
      if (disabled || busy) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (props.onClick) props.onClick();
      }
    }

    return (
      <button
        type="button"
        onClick={busy || disabled ? null : props.onClick}
        onKeyDown={handleKey}
        className="mtx-tap"
        aria-label={label + ' · ' + (sub || '')}
        aria-busy={busy || undefined}
        disabled={disabled || busy}
        style={{
          appearance: 'none',
          cursor: (disabled || busy) ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px',
          borderRadius: 12,
          background: done
            ? 'rgba(61,255,209,0.07)'
            : busy
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.025)',
          border: '0.5px solid ' + (
            done ? 'rgba(61,255,209,0.30)' :
            busy ? 'rgba(255,255,255,0.12)' :
            'rgba(255,255,255,0.06)'
          ),
          color: 'inherit',
          textAlign: 'left',
          opacity: disabled ? 0.4 : 1,
          transition: 'background .15s ease, border-color .15s ease, opacity .15s ease',
        }}>
        <span style={{
          fontSize: 19, flexShrink: 0,
          width: 32, height: 32,
          borderRadius: 9,
          background: 'rgba(255,255,255,0.04)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }} aria-hidden="true">{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: 'var(--ink-1)',
            fontFamily: 'var(--ff-sans)',
            letterSpacing: '-0.005em',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{label}</span>
            {done && (
              <span style={{
                fontSize: 9.5, fontWeight: 700,
                color: accent,
                letterSpacing: '0.06em',
              }}>✓ LISTO</span>
            )}
          </div>
          <div style={{
            fontSize: 11, color: 'var(--ink-3)',
            fontFamily: 'var(--ff-sans)',
            marginTop: 2,
            lineHeight: 1.35,
          }}>{sub}</div>
        </div>
        {busy ? (
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.12)',
            borderTopColor: accent,
            animation: 'mtx-export-spin .7s linear infinite',
            flexShrink: 0,
          }} aria-hidden="true"/>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke={done ? accent : 'rgba(255,255,255,0.32)'} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0 }} aria-hidden="true">
            {done ? <polyline points="20 6 9 17 4 12"/> : <polyline points="9 18 15 12 9 6"/>}
          </svg>
        )}
      </button>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CSS keyframes (idempotente)
  // ──────────────────────────────────────────────────────────────────────────
  if (document && !document.getElementById('mtx-coach-export-styles')) {
    var style = document.createElement('style');
    style.id = 'mtx-coach-export-styles';
    style.textContent = [
      '@keyframes mtx-export-spin {',
      '  from { transform: rotate(0deg); }',
      '  to   { transform: rotate(360deg); }',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────
  window.CoachExportSheet = CoachExportSheet;
  window.__mtxCoachExport = {
    open: function(conv) {
      // Dispara evento para que ia-flow abra el sheet con conv
      window.dispatchEvent(new CustomEvent('mtx:coach-export-open', { detail: { conversation: conv } }));
    },
    exportPDF: generatePDF,
    exportMarkdown: generateMarkdown,
    exportImage: generateImage,
    conversationToMarkdown: conversationToMarkdown,
    artifactToMarkdown: artifactToMarkdown,
    // Útil para testing manual desde devtools
    loadJsPDF: loadJsPDF,
    loadHtml2Canvas: loadHtml2Canvas,
  };
})();
