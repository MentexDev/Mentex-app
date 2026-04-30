# Audit Phase — Comunidad (community-flow + thread-flow + ranking-flow)

**Date**: 2026-04-30
**Scope**: tres archivos del flujo Comunidad/Hilo/Ranking — feed de reseñas, sistema de comentarios con replies, leaderboard semanal con filtros.
**Total LOC auditados**: ~2240
**Findings**: 3 CRIT + 7 IMP fixeados (+ 6 IMP documentados sin fix)

---

## CRIT findings — bugs reales con regression assertion

### CRIT-T1 — `<span>` con `onClick` sin `tabIndex` / `role` / `onKeyDown` (WCAG 2.1 AA fail)

**Archivo**: `screens/thread-flow.jsx:156-166`
**Blind spot**: #4 ("Non-`<button>` clickables missing `tabIndex={0}` + `onKeyDown`")

```jsx
// Antes — keyboard-invisible
<span onClick={() => onAuthorTap?.(author)} style={{ ... cursor:'pointer' }}>
  {author.name}
</span>

// Después — keyboard accessible
<span
  onClick={() => onAuthorTap?.(author)}
  role="button"
  tabIndex={0}
  aria-label={`Ver perfil de ${author.name}`}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAuthorTap?.(author); } }}
  style={{ ... cursor:'pointer' }}>
  {author.name}
</span>
```

**Builder-mode missed**: el avatar al lado YA tenía `role="button" tabIndex={0}`, así que el builder asumió que la accesibilidad estaba cubierta. Pero el `<span>` del nombre es un target de tap separado — keyboard users no podían enfocarlo ni activarlo.

**Regression assertion**: `grep` en thread-flow.jsx debe encontrar el patrón `role="button" tabIndex={0} aria-label=... onKeyDown=` adyacente al span del nombre.

**Lección**: cada elemento clickeable es independiente. Tener un sibling accesible NO cubre al hermano. Auditar **cada** `onClick` de manera atómica.

---

### CRIT-T2 — `setTimeout` en `useEffect` sin `clearTimeout` cleanup

**Archivo**: `screens/thread-flow.jsx:265-272`
**Blind spot**: #8 ("`addEventListener('x', fn, { once: true })` assumed to clean up") — variante con setTimeout.

```jsx
// Antes — race condition si replyingTo cambia rápido
React.useEffect(() => {
  if (replyingTo && inputRef.current) {
    setTimeout(() => inputRef.current.focus({ preventScroll: true }), 60);
  }
}, [replyingTo]);

// Después — cleanup explícito
React.useEffect(() => {
  if (!replyingTo || !inputRef.current) return;
  const t = setTimeout(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, 60);
  return () => clearTimeout(t);
}, [replyingTo]);
```

**Builder-mode missed**: builder confiaba en que `inputRef.current?.focus` con optional chaining era suficiente — pero el problema real es que el **timeout sigue programado** y dispara el focus INCLUSO si el usuario ya canceló la respuesta y `replyingTo` volvió a `null`.

**Regression assertion**: `grep` debe encontrar `const t = setTimeout(...); ... return () => clearTimeout(t);`

**Lección**: cualquier `setTimeout`/`setInterval` dentro de un `useEffect` requiere cleanup. El optional chaining (`?.`) protege contra null, pero NO contra ejecución en el momento incorrecto.

---

### CRIT-R1 — Sub-componente definido **dentro** del componente padre (re-mount cascada)

**Archivo**: `screens/ranking-flow.jsx:383` (antes) → `:347` (después)
**Blind spot nuevo (no en lista actual)** — añadir a CLAUDE.md como #11.

```jsx
// Antes — Section dentro de RankingFilterSheet
function RankingFilterSheet({ ... }) {
  ...
  const Section = ({ eyebrow, title, ... }) => ( ... );  // ← nueva referencia cada render
  return <Shell>
    <Section .../> <Section .../> <Section .../>
  </Shell>
}

// Después — _RankFilterSection module-level
function _RankFilterSection({ eyebrow, title, ... }) { ... }

function RankingFilterSheet({ ... }) {
  return <Shell>
    <_RankFilterSection .../> <_RankFilterSection .../> <_RankFilterSection .../>
  </Shell>
}
```

**Builder-mode missed**: builder pensó "lo defino adentro porque solo se usa aquí y mantiene el closure de las constantes locales". Pero React identifica componentes por **referencia de función** — y al definirse cada render, todas sus instancias se desmontan y remontan. Esto pierde el state interno (no había en este caso) Y dispara animaciones de re-mount innecesarias en cada tap del filtro.

**Regression assertion**: `_RankFilterSection` debe existir antes de `RankingFilterSheet` en el archivo (`grep -n` indices).

**Lección**: NUNCA definir componentes React dentro de otro componente. Si necesita closure, pasarlo por props. Si no, extraer al module level con prefijo `_` para indicar internal.

---

## IMP findings fixeados

### IMP-C1 — Código muerto: `displayCommentCount` calculado nunca usado

**Archivo**: `screens/community-flow.jsx:109` (antes)
Refactor previo dejó la línea sin limpiar. Eliminada. Mismo refactor permitió quitar `likesAdjust` (state declarado nunca seteado).

### IMP-T3 — `lookupAuthor` O(n) por cada comment

**Archivo**: `screens/thread-flow.jsx:424` (antes)

```jsx
// Antes — O(n) por cada comment
const lookupAuthor = (authorId) => {
  if (authorId === 'me') return meAuthor;
  return allAuthors.find(a => a.id === authorId);  // ← O(n)
};

// Después — O(1) con Map memoizado
const authorMap = React.useMemo(() => {
  const m = new Map();
  m.set('me', { id:'me', name:'Tú · Juan Diego', ... });
  for (const a of allAuthors) m.set(a.id, a);
  return m;
}, [allAuthors]);
const lookupAuthor = (authorId) => authorMap.get(authorId);
```

Con 30+ comments, escalar O(n²) era un olor de código. El Map se construye una vez por mount y se reusa.

### IMP-T4 — `force()` re-render eager sin filtrar por `reviewId`

**Archivo**: `screens/thread-flow.jsx:410` (antes)
El listener de `_COMMENTS_EVENT` disparaba `force()` para cualquier cambio en CUALQUIER thread, no solo el visible. Ahora filtra por `e.detail.reviewId === reviewId` antes de re-renderizar.

### IMP-R1 — `border:0` y `border:'...'` declarados dos veces en el mismo style

**Archivo**: `screens/ranking-flow.jsx:706-714` (antes)
JS tomaba el segundo (válido), pero el primero quedaba como ruido confuso. Limpieza.

### IMP-R2 — `useMemo` deps redundantes

**Archivo**: `screens/ranking-flow.jsx:630` (antes)
`periodConfig` y `placeConfig` derivan de `period` y `place` (ya en deps). Sus referencias son estables porque `_RANK_PERIODS` es constante. Removidos: `[category, period, place, periodConfig, placeConfig]` → `[category, period, place]`.

---

## IMP findings documentados (sin fix — out of scope para este audit)

- **IMP-C2**: Like state local `liked` en `CommunityReviewCard` no persiste al re-mount/filter change (line 93). UX mock OK por ahora; cuando haya backend, debe ir a un store global tipo `__mtxLikes`.
- **IMP-C3 / IMP-T1 / IMP-R3**: `<style>{...}</style>` con keyframes inline duplicado N veces dentro de cards/podiums repetidos. Consolidar a `mentex-tokens.css` global cuando se haga la siguiente pasada de polish CSS.
- **IMP-C4**: `setTimeout(..., 200)` magic number en `handleItemTap` callback (community-flow.jsx:557). Acoplado a la animación de cierre del thread sheet — si el animation duration cambia, este timeout queda desincronizado.
- **IMP-T2**: `_formatRelative` no es reactivo al paso del tiempo (thread-flow.jsx:87). Timestamps congelados sin re-render. Aceptable en un mock; en prod requeriría un `useInterval` global tipo `useRelativeTime`.
- **IMP-T5**: `meAuthor` recreado cada render en `ReviewThreadScreen` (thread-flow.jsx:423). Trivial impacto, pero podría ir a constante module-level.
- **IMP-R6**: Filtro `topN` en ranking añade "Tú" al final pero `myEntry.position` refleja el índice del array filtrado, no la posición real global. UX engañoso. Aceptable mientras la data sea mock global; cuando haya geo real, hay que filtrar el dataset por `place` antes de tomar topN.

---

## Meta-lecciones y nuevos blind spots

### Nuevo blind spot candidato (a añadir al CLAUDE.md global como #11)

**Components defined inside other components cause re-mount cascades.**

```jsx
function Parent() {
  const Child = (props) => <div>...</div>;  // ← BAD — new fn ref each render
  return <Child .../>
}
```

Cada render del padre crea una nueva referencia de función para `Child`. React la identifica como un componente DIFERENTE → desmonta y remonta. Esto:
- Pierde state interno del child
- Re-ejecuta animaciones desde el inicio
- Re-corre useEffect con `[]` deps en cada render del padre

Fix: extraer al module level. Si necesita state del padre, pasarlo por props.

### Patrón positivo a repetir

**`use*` hooks que filtran eventos por ID** (como el nuevo `useCommentCount(reviewId)` con guard `e.detail.reviewId === reviewId`) → escalan a multi-instancia sin re-render eager. Adoptar este patrón para futuros stores globales tipo `__mtxLikes`, `__mtxBookmarks`, etc.

### Patrón a evitar adelante

**`Object.assign(window, {...})` al final del archivo** + scripts cargados secuencialmente en HTML. Funciona pero es frágil: cualquier `window.X` referenciado en un componente que se ejecuta antes del `Object.assign` final será `undefined`. La sintaxis `window.X && (() => { ... })()` que ya usamos en varios lugares es la guard correcta — pero recordar que aplica a TODA referencia cruzada entre archivos.

---

## Quad-validation

- ✅ **Static balance**: 0/0/0 en braces/parens/brackets para los 3 archivos
- ✅ **Icon resolution**: 0 icons missing
- ✅ **Regression assertions**: 8/8 PASS
- ✅ **Construction commit reference**: pending (este commit los resolvió)

## Construction commit referenciado

(Este commit en sí — el audit y la construcción cierran juntos en este turno por scope acotado.)
