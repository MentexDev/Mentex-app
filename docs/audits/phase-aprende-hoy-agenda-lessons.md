# Phase Lessons · Aprende hoy + Agenda dinámica + AddReminderSheet enterprise

**Sprint date**: 2026-05-14 → 2026-05-15
**Scope**: Refactor del Home (sección "Aprende hoy" reemplaza Recordatorios), Agenda conectada al plan real del día, AddReminderSheet con tipo de medición (Marca/Tiempo) + pickers custom + frecuencia estructurada.
**Files touched**:
- `screens/home-inactive.jsx` v45→v48
- `screens/home-active.jsx` v52→v54
- `screens/ritual-player.jsx` v6→v7
- `screens/explore-flow.jsx` v81→v83
- `screens/ia-agenda.jsx` v14→v25
- `Mentex Home.html` (cache bumps)

---

## C-A-R Findings

### CRIT (resueltos durante construcción)

**CRIT-A · JSX components con underscore inicial son tratados como HTML tags**
- Síntoma: `<_PickerSheetShell>` y `<_ColumnPicker>` no renderizaban.
- Root cause: Babel JSX trata identifiers que empiezan con `_` o minúscula como HTML elements literales, no como componentes React.
- Fix: rename a PascalCase (`PickerSheetShell`, `ColumnPicker`).
- **Lección**: NUNCA usar underscore-prefix para componentes React en JSX.

**CRIT-B · useEffect con deps recreadas resetea form en cada toggle interno**
- Síntoma: Al abrir TimePickerSheet, el form del AddReminderSheet padre se reseteaba (perdía "Tiempo" seleccionado).
- Root cause: `useEffect [open, timePickerOpen, durPickerOpen]` ejecutaba `setMeasure('check')` en cada cambio de los sub-pickers.
- Fix: splittear en dos useEffects — uno solo `[open]` para reset, otro `[open, timePickerOpen, durPickerOpen]` solo para ESC handler.
- **Lección**: Reset state effects deben tener deps mínimas (`[open]` solo para mount/unmount). Listeners reactivos van en effect separado.

**CRIT-C · React Portal propaga eventos por virtual DOM tree, no por real DOM**
- Síntoma: Click en el botón "Elegir hora" abría el TimePickerSheet por 1 render y lo cerraba en el mismo tick.
- Root cause: El click event burbujea via React virtual tree al backdrop del portal recién montado → backdrop onClick → onClose.
- Fix: Patrón `backdropDownRef` (mousedown-then-click) — el backdrop solo cierra si el gesto empezó en él, ignora bubbles. Aplicado en `PickerSheetShell`.
- **Lección crítica**: Cualquier sheet con backdrop onClick que se abra a partir de un click event DEBE usar el patrón mousedown-then-click. Solo `stopPropagation()` no es suficiente porque el portal sigue burbujando por virtual tree.

### IMP (resueltos durante audit)

**IMP-A · AuthorStrip orphan**
- Componente definido y exportado a `window` pero nunca invocado tras refactor de ContentDetailScreen. Comentario decía "AuthorStrip eliminada" pero el código quedó.
- Fix: eliminar definición + export + comentarios obsoletos en `_unscheduleFromRitual`.
- **Lección**: Después de refactorizar un componente fuera de uso, eliminar inmediatamente — no dejar "muerto" con comentario.

### Falsos positivos del audit (verificados, descartados)

- **Calendar event dedupe risk**: el filtro `events.filter(e.id.startsWith('sched_'))` solo afecta los mirrors creados por `__mtxScheduler` bridge, NUNCA eventos `source:'calendar'` reales.
- **LearnTodaySection no suscribe a ritual-changed**: verificado en línea 963-964 — sí suscribe.
- **ESC guard missing en home-***: los `onKeyDown` ahí son button-level Enter/Space para activación, no document-level ESC. No requieren guard IME.
- **handleScheduleToggle puede ser undefined**: `onClick={undefined}` en React es válido cuando el botón está `disabled`. No es bug.

---

## Patrones validados en este sprint

### 1 · Portal + Backdrop mousedown-then-click (canonical para sheets anidados)

```js
var backdropDownRef = React.useRef(false);
var handleBackdropDown = function(e) { backdropDownRef.current = e.target === e.currentTarget; };
var handleBackdropClick = function(e) {
  if (e.target === e.currentTarget && backdropDownRef.current && onCloseRef.current) {
    onCloseRef.current();
  }
  backdropDownRef.current = false;
};
// JSX:
<div onMouseDown={handleBackdropDown} onClick={handleBackdropClick}>...</div>
```

Usar SIEMPRE cuando el sheet:
- Se renderiza via `createPortal` a `mtx-overlay-root`.
- Tiene backdrop con `onClick={onClose}`.
- Puede abrirse desde un click event (no solo desde tecla).

### 2 · Stores reactivos con subscribe único

`LearnTodaySection` suscribe UNA vez a `mtx:ritual-changed` y pasa el `Set<id>` a las cards (evita N listeners para N cards):

```js
function LearnTodaySection() {
  const [_tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener('mtx:ritual-changed', onChange);
    return () => window.removeEventListener('mtx:ritual-changed', onChange);
  }, []);
  const ritualIds = React.useMemo(
    () => new Set(window.__mtxRitual.list().map(x => x.id)),
    [_tick]
  );
  // Pasar ritualIds.has(card.id) como prop isAdded a cada card
}
```

### 3 · Routing centralizado por tipo de activity (openRitualActivity)

`ritual-player.jsx` decide qué experiencia montar:
1. `runnerType === 'timer'` → ActivityRunner fullscreen
2. `fromExplore && exploreId` → dispatch `mtx:open-item-from-community` → ContentDetailScreen
3. Activity base con match en EXPLORE_CONTENT → openSheet legacy
4. Default → toast "próximamente"

Todos los consumers (HomeActive, AgendaItemDetailSheet, etc.) llaman al mismo entry point.

### 4 · Dual-tap card pattern (cuerpo + action)

`LearnTodayHeroCard` / `LearnTodayStandardCard`:
- Tap en cuerpo → abre detalle (dispatch evento global).
- Tap en bolita "+" → quick-add al store con `e.stopPropagation()`.
- Ambos componentes son `role="button"` con `tabIndex={0}` + `onKeyDown` Enter/Space.

### 5 · Tipo de medición en reminders (Marca vs Timer)

Shape del store:
```js
{
  id, title, time, completed: false,
  measureKind: 'check' | 'timer',    // NEW
  durationMin: 25,                    // si timer
  recurrence: null | 'daily' | 'weekdays',
  weekdays: [0, 2, 4],                // si weekdays (L=0..D=6)
}
```

Backwards compatible: reminders viejos sin `measureKind` se tratan como `'check'` por default.

---

## Updated checklist (anti-blind-spots)

Para próximas construcciones de sheets/modals:

1. ✅ Hooks ANTES de early return (`if (!open) return null`).
2. ✅ ESC handler con guard `e.isComposing || e.keyCode === 229` + tag INPUT/TEXTAREA/contentEditable.
3. ✅ Backdrop SIEMPRE con `onMouseDown` + `onClick` pattern (no solo onClick).
4. ✅ Body scroll lock en useEffect (`document.body.style.overflow = 'hidden'` + restore en cleanup).
5. ✅ Para portales superpuestos: zIndex strictamente ordenado (110 → 220 → 240) + `stopPropagation` en triggers.
6. ✅ PascalCase OBLIGATORIO para componentes JSX. NUNCA usar underscore-prefix.
7. ✅ useToast con fallback estable: `var _useToast = window.useToast || function() { return { show: function() {} }; }; var toast = _useToast();`.
8. ✅ Reset effects: deps mínimas. Listeners reactivos: deps separadas.
9. ✅ Stores `__mtxX`: subscribe ONCE en componente padre, propagate Set/Map a children.
10. ✅ Dual-tap cards: outer = body action, inner button = secondary action con `e.stopPropagation()`.

---

## Smoke test results (este sprint)

**10/10 PASSED** (verificado en Puppeteer mobile viewport 430×932):

1. ✓ Stores y exports clave existen (AuthorStrip removed correctly)
2. ✓ Aprende hoy → quick-add a __mtxRitual
3. ✓ openRitualActivity routing: fromExplore → dispatch
4. ✓ openRitualActivity routing: activity legacy → openSheet
5. ✓ Reminder timer guarda measureKind/durationMin/weekdays
6. ✓ __mtxRitual.remove dispara mtx:ritual-changed (subscribers re-render)
7. ✓ Agenda header buttons aligned (vTop=aTop=88, mismo size)
8. ✓ Timer reminder en timeline renderiza Play button
9. ✓ Check reminder legacy renderiza checkbox toggle
10. ✓ sched_* events de reminders deduplicados (cierre count = 1, no 2)

Cero errores nuevos en consola (solo el babel size warning + favicon 404, inocuos).

---

## Construction commit ref

Pending — este lessons doc se commitea junto con el feature commit.
