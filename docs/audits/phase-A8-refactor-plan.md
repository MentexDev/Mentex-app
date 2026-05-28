# Refactor Plan — Sprint A.8 Consolidation (Pre-Sprint A.9 Wellness)

**Fecha**: 2026-05-28
**Baseline**: commit `8b7403f` (audit C10 + A.8 completado)
**Objetivo**: Consolidar primitives reusables para que Sprint A.9 (Wellness Exercises) herede arquitectura limpia.

---

## Risk analysis (resumen)

| # | Severidad | Fase | Concern |
|---|---|---|---|
| H1 | HIGH | 2A | Colisión de keyframes con ID duplicado en 6+ archivos |
| H2 | HIGH | 2C | `_GenActionPill` invocado como JSX en 2 sitios — refs deben moverse atomic |
| H3 | HIGH | 2D | `ia-artifacts.jsx` 6,581 líneas (umbral Babel) |
| H4 | HIGH | 2D | Race condition `if (window.IAArtifact) return;` al splitear |
| H5 | HIGH | 2B | 450 hex hardcoded para buscar/reemplazar |
| M1 | MED | All | Mock race condition al cambiar order HTML |
| M2 | MED | 2A | `mtxBreathe` + `useBreathPhase` en session-flow (preservar para A.9) |
| M3 | MED | 2B | Hex en comments podrían sufrir reemplazo accidental |
| M4 | MED | 2E | Naming collision `window.__mtxArtifactRegistry` |
| M5 | MED | 2D | Event listeners cross-file scope |
| L1 | LOW | 2D | Style tag `id` colisión post-split |
| L2 | LOW | 2D | Babel perf con 25+ archivos |

---

## Orden óptimo (sello militar)

```
PASO 0  ──→ Branch safety: refactor/2a-2e-phases
PASO 1  ──→ Baseline screenshots (10 escenarios)
FASE 2B ──→ Color tokens centralizados        (riesgo bajo)
FASE 2A ──→ Keyframes consolidados             (riesgo bajo+, depende de 2B)
FASE 2C ──→ UI primitives compartidos          (riesgo medio, depende 2A+2B)
FASE 2E ──→ Artifact kind registry             (riesgo bajo, prepara 2D)
FASE 2D ──→ Split A.8 artifacts file           (riesgo alto, depende 2A-2E)
PASO N  ──→ Smoke test + merge a main
```

**Por qué este orden minimiza blast radius:**

- 2B primero porque es independiente y los tokens van en keyframes (2A) y UI (2C)
- 2A después de 2B porque algunos keyframes referencian colores (shimmer overlay)
- 2C después de 2A+2B porque ActionPill usa neon (2B) + transition timing (2A)
- 2E después de 2C porque el registry incluye los UI primitives
- 2D al final porque necesita TODO lo anterior + estricto HTML loading order

---

## Mitigaciones por fase

### FASE 2B — Color tokens (~1h)
- **H5**: Script de replace con grep + sed + revisión manual línea por línea
- **M3**: `sed -i "/^[^/]/s/..."` (excluye lines que empiezan con `//`)
- **Verify**: `grep -r "#3dffd1\|#9b8aff\|#ffc850" screens/*.jsx` post-refactor → solo en comentarios

### FASE 2A — Keyframes consolidados (~2h)
- **H1**: Inventario exhaustivo con grep antes de centralizar. Verificar duplicados timing-distintos
- **M2**: Copia exacta de `mtxBreathe` (timing 4s ease-in-out infinite preservado)
- **Verify**: `document.querySelectorAll('style[id^="mtx"]')` debe tener exactamente N+1 styles post-fix

### FASE 2C — UI primitives (~2h)
- **H2**: Wrapper pattern (`__mtxUI.ActionPill = function(props) { return <_GenActionPill {...props}/> }`) y reemplazo atomic en mismo commit
- **Verify**: `grep "<_GenActionPill\|<_SceneMetaTile" screens/` → 0 resultados post-fix

### FASE 2E — Artifact kind registry (~1h)
- **M4**: Verificar no-collision con `Object.keys(window).filter(k => k.includes('Artifact'))`
- **Nombre seguro**: `window.__mtxArtifactKinds` (no `__mtxArtifactRegistry`)
- **Verify**: Registry tiene 6 kinds A.8 + N kinds legacy

### FASE 2D — Split artifacts file (~3h)
- **H3**: Medir tamaños antes/después. Target: ia-artifacts < 250KB, coach-genmedia-artifacts < 150KB
- **H4**: HTML load order ESTRICTO:
  1. `mtx-animations.jsx` (creado en 2A)
  2. `coach-image-gen-store.jsx`
  3. `coach-video-gen-store.jsx`
  4. `ia-artifacts.jsx` (router + legacy artifacts)
  5. `coach-genmedia-artifacts.jsx` (A.8 components, DESPUÉS del router)
  6. `coach-mock-conversations.jsx` (last)
- **M1**: Mock guard defensivo: `if (!window.__mtxVideoGen || !window.__mtxImageGen) { defer; }`
- **L1**: Style tag ID único por archivo
- **Verify**: 10 smoke tests cubriendo todos los artifact kinds

---

## Baseline screenshots requeridos (PASO 1)

| # | Escenario | Mock conv | Cubre |
|---|---|---|---|
| 1 | Skeleton shimmer | image-gen-meditation | mtx-shimmer keyframe |
| 2 | Voice picker pulse | video-gen-morning + open VoicePicker | mtx-pulse-soft |
| 3 | Image palette purple | image-gen-meditation | _paletteFromPrompt('meditar') |
| 4 | Video cover gradient | video-gen-morning | _generateMockVideoUrl |
| 5 | Image result 4 actions | image-gen-meditation done | _GenActionPill x4 |
| 6 | Storyboard editing | video-gen-morning approved | _microBtnStyle x6 |
| 7 | Scene detail nav | video-gen-morning → tap card | mtx-slide-up + ArrowKeys |
| 8 | Export sheet 3 options | cualquier conv → tap "Exportar como" | mtx-export-spin |
| 9 | BreathPhase aurora | session-flow + ConfirmAuroraBackground | mtxBreathe (preservar A.9) |
| 10 | Artifact router exhaustive | plan-semana + video-gen + image-gen | TODOS los kinds |

---

## Rollback plan

```
git checkout -b refactor/2a-2e-phases  (branch safety)
# Commits intermedios:
git commit -m "refactor(2B): window.__mtxColorTokens"
git commit -m "refactor(2A): screens/mtx-animations.jsx consolidado"
git commit -m "refactor(2C): window.__mtxUI primitives"
git commit -m "refactor(2E): window.__mtxArtifactKinds registry"
git commit -m "refactor(2D): split ia-artifacts → coach-genmedia-artifacts"
# Si falla:
git reset --hard <last-good-commit>  # mantén progreso anterior
# Si all fails:
git checkout main && git branch -D refactor/2a-2e-phases
```

**Worst case**: rollback total = 30 segundos. Mejor que progresar con bugs latentes.

---

## Output esperado post-refactor

- `screens/mtx-animations.jsx` (~300 LOC, NUEVO) — IIFE inyecta TODOS los keyframes globales
- `screens/coach-genmedia-artifacts.jsx` (~1,800 LOC, NUEVO) — los 7 artifacts A.8
- `screens/ia-artifacts.jsx` (~5,000 LOC, REDUCIDO) — router + legacy + helpers
- `screens/coach-image-gen-store.jsx` — usa tokens
- `screens/coach-video-gen-store.jsx` — usa tokens
- `screens/coach-export.jsx` — usa tokens + UI
- `Mentex Home.html` — orden estricto + 1 nuevo script
- `window.__mtxColorTokens` global
- `window.__mtxUI` global
- `window.__mtxArtifactKinds` global

**LOC neto**: ~+200 (consolidación reduce duplicados pero suma archivos nuevos)
**Beneficio**: A.9 wellness reusará 100% de los primitives sin duplicar.
