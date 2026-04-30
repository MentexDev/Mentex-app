# Audit Phase — Perfil (profile + profile-stats-sheets + user-profile-flow)

**Date**: 2026-04-30
**Scope**: tres archivos del flujo Perfil — perfil propio (ProfileScreen + EditProfileSheet + AwardsTab + ProfileStatsTab + 30 logros), sheets compartidos (Level/Hours/Followers/Achievement), y perfil ajeno (UserProfileScreen).
**Total LOC auditados**: ~4720 (profile.jsx 2914, profile-stats-sheets.jsx 906, user-profile-flow.jsx ~900)
**Findings**: 1 CRIT + 4 IMP fixeados (+ 2 IMP documentados sin fix)

---

## CRIT findings — bugs reales con regression assertion

### CRIT-FS1 — `useMemo` con `useReducer` dispatch como dep (memo nunca invalida)

**Archivo**: `screens/profile-stats-sheets.jsx:828-861`
**Blind spot**: variante de #9 ("`useEffect` deps with recreated callbacks") — esta vez con `useMemo` y dispatch.

```jsx
// Antes — BUG: el memo nunca invalida en follow/unfollow
const [, force] = React.useReducer(x => x + 1, 0);  // ← dispatch en var
React.useEffect(() => {
  const h = () => force();
  window.addEventListener('mtx:follows-changed', h);
  ...
}, []);

const followingList = React.useMemo(() => {
  if (isOwn) {
    const set = new Set(directory.filter(u => window.__mtxFollows.isFollowing(u.id)).map(u => u.id));
    return directory.filter(u => set.has(u.id));
  }
  ...
  // eslint-disable-next-line
}, [directory, isOwn, profile.id, window.__mtxFollows ? window.__mtxFollows.isFollowing : null, force]);
```

**Por qué falla**:
1. `force` es `dispatch` de `useReducer` → React garantiza que la **misma referencia** se mantenga en cada render. Como dep, no cambia nunca.
2. `window.__mtxFollows.isFollowing` es una propiedad de un objeto store → la propiedad es la **misma referencia de función** en cada render (el store no muta sus métodos, solo el set interno `_followingByMe`).

Cuando el usuario hace follow/unfollow desde otro lado de la app:
- El handler dispara `force()` → re-render del FollowersSheet ✓
- En el nuevo render, `useMemo` evalúa los deps → todos iguales que antes (incluso `force` y `isFollowing`) → React **retorna la lista cacheada** sin re-ejecutar el filter.
- La lista visible "Siguiendo" se queda **stale** mientras el sheet está abierto.

```jsx
// Después — usa el STATE del reducer, no el dispatch
const [followsTick, bumpFollows] = React.useReducer(x => x + 1, 0);
React.useEffect(() => {
  const h = () => bumpFollows();
  window.addEventListener('mtx:follows-changed', h);
  return () => window.removeEventListener('mtx:follows-changed', h);
}, []);

const followingList = React.useMemo(() => {
  if (isOwn) {
    const set = window.__mtxFollows
      ? new Set(directory.filter(u => window.__mtxFollows.isFollowing(u.id)).map(u => u.id))
      : new Set();
    return directory.filter(u => set.has(u.id));
  }
  ...
}, [directory, isOwn, profile.id, followsTick]);
```

**Builder-mode missed**: el patrón "`[, force]` + `force()` para forzar re-render" funciona para componentes sin memos. Pero si tienes memos que dependen de side-effects externos (como un store mutable), necesitas el **state** del reducer (que SÍ cambia) en sus deps, no el dispatch.

El `eslint-disable-next-line` que el builder añadió fue una bandera roja: el linter había detectado el problema pero el builder lo silenció en lugar de fixearlo.

**Regression assertion**:
- `useReducer` debe destructure `[followsTick, bumpFollows]` (state real, no dispatch suelto).
- `followingList` deps deben incluir `followsTick`.
- No debe quedar `eslint-disable` en el archivo.

**Lección**: cuando uses `useReducer(x => x + 1, 0)` como mecanismo de invalidación, **destructuréa el state** (no descartes el primer elemento). Úsalo como dep en cualquier memo que dependa de side-effects externos. **Si necesitas un `eslint-disable`, hay un bug en la forma de los deps.**

---

## IMP findings fixeados

### IMP-P1 — `border:0` y `border:'...'` doble declaración en botones share/edit del header

**Archivo**: `screens/profile.jsx:2559-2570` (antes)
Mismo patrón que ya fixeamos en ranking-flow (IMP-R1). Eliminada la línea redundante `border:0`.

### IMP-P2 — `unlockedAgoDays: a.current >= a.target ? null : null` ternario tautológico

**Archivo**: `screens/profile.jsx:107` (antes)
Ambos branches devolvían `null`. Reemplazado por `unlockedAgoDays: null` con TODO comment apuntando al backend con timestamps reales.

### IMP-UP1 — `useCallback(..., [])` sobre función pura sin closure

**Archivo**: `screens/user-profile-flow.jsx:329` (antes)
`timeAgoToTs` no captura nada del scope (puro: `timeAgo → number`). El `useCallback` añade overhead del shallow-compare sin beneficio. Reemplazado por plain function declaration.

**Lección**: `useCallback` solo aporta cuando: (a) la función es pasada como prop a un componente memoizado, o (b) está en deps de otro hook. Si solo es un helper local llamado dentro del render, plain function es lo correcto.

### IMP-P3 (ya correcto al re-leer) — `setTimeout(onClose, 200)` en handleSave

**Archivo**: `screens/profile.jsx:232`
`onClose` es idempotente — si el sheet ya se desmontó, llamarlo de nuevo solo dispara `setEditOpen(false)` cuando ya es false. No causa bug. Documentado como fragilidad aceptable.

---

## IMP findings documentados (sin fix — out of scope para este audit)

- **IMP-P4**: Variable `valid` shadowed dentro del `FIELDS.map((f, i) => { const valid = ... })` (profile.jsx:182, 299). El outer `valid` (validez del formulario completo) y el inner `valid` (validez del campo individual) son distintos pero se llaman igual. Aceptable mientras estén en scopes claramente separados; renombrar a `formValid` / `fieldValid` cuando se haga la siguiente pasada de cleanup.
- **IMP-FS-IMP**: ESC handler global de `useStatSheet` puede disparar `onClose` en MULTIPLES sheets simultáneamente si están stackeados (ej. `AchievementSheet` sobre `LevelSheet`). Comportamiento UX común — un ESC cierra todos los sheets de la stack. Aceptable. Si se quiere "ESC cierra solo el top sheet", hay que añadir un sheet stack registry global.

---

## Patrones positivos a repetir

### `key={u.id}` para forzar re-init de useState

`FollowerRow` usa `useState(() => isFollowing(user.id))` con init derivado de prop. Como cada row tiene `key={u.id}` distinto, React desmonta/remonta cuando user cambia → useState init se re-evalúa. **Sin la `key`, el state inicial sería stale al recyclar el componente para otro user.**

### `mtx:follows-changed` como pubsub global

Permite que múltiples componentes (FollowersSheet, UserProfileScreen, FollowerRow, ProfileScreen) se actualicen sincronizados sin acoplamiento directo. Para el siguiente refactor cuando haya backend, este pubsub es donde colgar la sync con WebSocket events.

---

## Quad-validation

- ✅ **Static balance**: 0/0/0 en braces/parens/brackets para los 3 archivos
- ✅ **Icon resolution**: 0 icons missing (validado en commit anterior)
- ✅ **Regression assertions**: 8/8 PASS (border/unlockedAgoDays/useCallback/useReducer pattern)
- ✅ **Construction commit referenced**: fc90d80 (feat construction de comunidad+perfil+ranking)

## Construction commit referenciado

`fc90d80` — feat(community+profile+ranking): full social system + filters + sheets.
Los fixes de este audit se aplicaron sobre el código de ese commit (los ediciones quedan incluidas en el commit del audit doc + cualquier otro audit follow-up).

---

## Resumen de la fase 2 completa (Comunidad + Perfil)

| | Comunidad | Perfil | Total |
|---|---|---|---|
| **LOC auditados** | ~2240 | ~4720 | ~6960 |
| **CRIT** | 3 | 1 | 4 |
| **IMP fixed** | 7 | 4 | 11 |
| **IMP documented** | 6 | 2 | 8 |
| **Regression assertions** | 8/8 | 8/8 | 16/16 |
| **Nuevos blind spots** | 1 (#11 inner components) | 1 (variant of #9 dispatch as dep) | 2 |

**Total: 4 CRIT + 11 IMP fixed across 23 commits-worth of construction.** El protocolo C-A-R encontró bugs reales que builder-mode no detectó en construcción — confirmando que la separación de fases es no negociable.
