# Audit — Settings Section
**Commit:** `39f4107`  
**Fecha:** 2026-05-03  
**Alcance:** `screens/settings-flow.jsx` (4 517 LOC) + bridge Settings → Explorar en `screens/explore-flow.jsx` y `Mentex Home.html`

---

## Hallazgos

### CRIT-1 — Stale closure en `EliminarCuentaSubScreen`
**Qué falló:** `onDeleted` se llamaba dentro de un `setTimeout` dentro de un `useEffect`, pero no estaba en el array de deps. Como `onDeleted` es una prop que viene de arriba (inline `() => onClose()`), podía volverse stale si el padre re-renderizaba antes de que el timeout disparara.  
**Fix:** Añadir `onDeleted` a `[step, onDeleted]`.  
**Root cause de builder-mode:** El foco estaba en el flujo de pasos (step machine). `onDeleted` parecía estable porque rara vez cambia — pero es una prop, no un valor primitivo.  
**Lección:** Blind spot #9 del C-A-R checklist. Toda prop que sea función y se llame dentro de `useEffect` debe estar en deps.

### CRIT-2 — `isPlanCancelled` no se reseteaba al cerrar Settings
**Qué falló:** `SettingsScreen` nunca se desmonta (recibe `open` como prop). Estado local `isPlanCancelled = true` persistía entre sesiones: cerrar y reabrir Settings mostraba la pantalla de "Plan cancelado" en lugar del estado activo.  
**Fix:** Resetear en `useEffect(() => { if (!open) { setIsPlanCancelled(false); ... } }, [open])`.  
**Root cause:** Builder-mode asumió que el componente se destruía al cerrar. El patrón de "siempre montado + prop `open`" es el estándar de este prototipo, pero el audit lo pasó por alto.  
**Lección:** Para componentes permanentemente montados, enumerar todo el estado local y verificar explícitamente qué necesita reset en el efecto de cierre.

### IMP-1 — Fecha hardcodeada en banner de Progresos
"3 may 2026" escrita como string literal. Envejece en segundos.  
**Fix:** IIFE que calcula `d.getDate() + m[d.getMonth()] + d.getFullYear()`.

### IMP-2 — `aria-label` faltante en items de contenido completado
`<div role="button">` sin `aria-label`. Screen readers anuncian el contenido textual interno (que incluye duración, plays, etc.) sin distinguir el propósito del click.  
**Fix:** `aria-label={item.title}` para darle contexto semántico limpio.

### IMP-3 — `gridAutoRows:'1fr'` para reason cards uniformes
Sin esta propiedad, las cards de 2 líneas eran más altas que las de 1 línea, creando un grid visualmente desbalanceado.  
**Fix:** `gridAutoRows:'1fr'` en el container del grid 2-col.  
**Lección:** Siempre verificar visualmente grids de texto variable. `gridAutoRows:'1fr'` debería ser el default en grids de cards.

### IMP-4 — Char counter condicional vs siempre visible
`{description.length > 0 && <div>...{length}/280</div>}` → el counter aparecía/desaparecía causando layout jump.  
**Fix:** Siempre renderizar, con `opacity: description.length > 0 ? 1 : 0.35` para el estado vacío.  
**Lección:** Contadores y badges de límite siempre deben ser visibles desde el inicio para orientar al usuario.

### IMP-5, 6 — Escape key en backdrops de sheets en portales
Backdrops de `ContentDetailSheet`, `PlanCycleSheet` y otros sheets en `ReactDOM.createPortal` no cerraban con Escape. Inconsistente con sheets de otras secciones.  
**Fix:** `onKeyDown={e => e.key === 'Escape' && onClose()}` en todos los backdrops. `tabIndex={-1}` para que puedan recibir focus programáticamente si se necesita en el futuro.

### IMP-7 (cross-file) — Bridge `__mtxPlayContent` (Settings → Explorar)
`ProgresosSubScreen` listaba contenido completado sin acción al tap. Se implementó el flujo completo:
1. `window.__mtxCloseSettings` expuesto desde `MentexApp` (Mentex Home.html)
2. `window.__mtxPlayContent` registrado en `explore-flow.jsx`: normaliza el título, busca en `EXPLORE_CONTENT`, cierra Settings, y dispara `mtx:open-item-from-community`
3. Fallback a `'__explore_home__'` para los 2/10 títulos que no matchean exactamente

---

## Patrones meta

### "Siempre montado + prop open" requiere reset explícito
Es el patrón dominante de este prototipo (Settings, Explore sheets, Now Playing). Cada vez que se construya un componente así, enumerar el estado local y añadir un `useEffect([open])` que resetee todo al cerrar.

### Props función en useEffect → siempre en deps
No importa si "casi nunca cambia". La regla es mecánica: si es una prop, va en deps. El linter (si hubiera) lo detectaría — en Babel standalone sin linter, el audit es la única red.

### Grids de texto variable → `gridAutoRows:'1fr'` por default
Añadir al checklist de construcción de grids.

### Backdrops en portales → Escape siempre
Cada sheet que usa `ReactDOM.createPortal` necesita `onKeyDown Escape` en su backdrop. Añadir como checklist item al construir sheets.

---

## Checklist actualizado para próxima construcción de Settings-like features

- [ ] Componente siempre montado → mapear estado local → añadir reset en `useEffect([open])`
- [ ] Props función en `useEffect` → en deps array
- [ ] Fechas → nunca hardcode, siempre `new Date()`
- [ ] `role="button"` → `aria-label` explícito (no confiar en textContent)
- [ ] Grids de cards con texto variable → `gridAutoRows:'1fr'`
- [ ] Contadores de límite → siempre visibles, variación por opacity
- [ ] Backdrops en portales → `onKeyDown Escape`
- [ ] Bridges cross-sección → normalizar títulos antes de buscar (lowercase + strip punctuation)
