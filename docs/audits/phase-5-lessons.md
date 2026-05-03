# Phase 5 Audit — Lecciones

**Scope**: Phase 5.1–5.3 (HomeInactive, Coach Whisper, IA gates, PremiumLockSheet, Explorar premium gates)
**Construction commit**: `8476f97` → `b06xxxx` (ver git log)
**Audit commit**: este documento

---

## Findings

### 0 CRIT · 2 IMP (ambas corregidas)

---

### IMP-1 — `CategorySection` sin prop `locked` (visual gap)

**Superficie**: La sección "Explorar por categoría" (visible al seleccionar un filtro de tipo como "Audiolibros") renderea `ExploreContentCard` sin pasar el prop `locked`. El gate funcional existía via `handleItemClick`, pero el user veía cards sin candado y luego recibía el lock sheet al tapear.

**Root cause**: En builder-mode se aplicó `locked` a las 4 superficies principales (ExploreHero, ContentRow, TopTenRow, CategoryFullView) pero se olvidó `CategorySection` — un 5.º surface que apareció en una fase anterior y no estaba en el checklist de cambios del gating.

**Fix**: Añadir `isPremium` + `locked={it.premium !== false && !isPremium}` a `CategorySection`.

**Meta-lección**: Cuando un cambio afecta "todas las superficies de un tipo", hacer grep explícito de cada lugar donde el componente afectado (`ExploreContentCard`) se instancia. No confiar en la memoria de cuántas superficies existen.

---

### IMP-2 — `SearchResultRow` sin indicador visual de lock

**Superficie**: Los resultados de búsqueda usan `SearchResultRow` (componente compacto, no `ExploreContentCard`). Mostraba un chevron `→` para todos los resultados, incluyendo premium. Al tapear uno premium → lock sheet (gate funcional correcto), pero sin forewarning visual.

**Root cause**: `SearchResultRow` es un componente propio (no reutiliza `ExploreContentCard`) y no tenía acceso al estado `isPremium`. Se creó en una fase previa al gating y no se actualizó.

**Fix**: Añadir `isPremium` check dentro de `SearchResultRow`. Si `isLocked`: imagen del thumbnail con opacidad 0.35 + saturación 0.5 + candado superpuesto centrado, eyebrow cambia de tipo-de-contenido a "Premium", chevron cambia a `IcLock` neon.

**Meta-lección**: Todo componente que renderiza contenido premium necesita su propio check de `isPremium` o recibir `locked` como prop. Cuando se añade un nuevo sistema (premium gates), hacer un grep de todos los componentes que renderizan `item.title` o `item.cover` para verificar que ninguno queda sin tratar.

---

## Arquitectura data-driven — decisión correcta

La refactorización de índice-based → `item.premium !== false` es fundamentalmente superior:

| Aspecto | Índice-based (anterior) | Data-driven (nuevo) |
|---|---|---|
| Consistencia | Un mismo ítem puede ser libre en hero y locked en un row | Un ítem es libre/locked en TODAS las superficies |
| Mantenibilidad | Cambiar qué es gratis = modificar `i >= N` en 4+ lugares | Cambiar qué es gratis = `premium: false` en el dato |
| Lógica de negocio | Hardcoded en el render | En los datos donde pertenece |
| Defensa en profundidad | Solo en el card | `handleItemClick` + el card |

Los 3 ítems libres elegidos estratégicamente:
- **`c-habitos`** — Hábitos Atómicos: gancho para usuarios de productividad. Tiene `playPct` → aparece en "Continúa donde lo dejaste".
- **`c-dormir`** — Meditación para dormir: el ítem más reproducido (324k). Gancho para bienestar/sueño.
- **`c-jobs`** — Steve Jobs Stanford: el más icónico (892k). Gancho universal para charlas.

**Stats finales**: 16 disponibles · 3 free (19%) · 13 locked (81%). Soft paywall efectivo.

---

## Checklist para próximas features que toquen contenido premium

- [ ] ¿Todos los componentes que renderizan `item` tienen acceso a `isPremium` o reciben `locked`?
- [ ] ¿El `handleItemClick` raíz tiene el gate de defense-in-depth?
- [ ] ¿Hay algún componente que renderizan `item.title/cover` sin el lock visual?
- [ ] Grep de `ExploreContentCard` instanciaciones + cada componente custom que muestre contenido

---

## Smoke test results (2026-05-03)

| Test | Resultado |
|---|---|
| `isPremium: false` para usuario con `selectedPlan: 'free'` | ✅ |
| Ítem locked (Sapiens) → PremiumLockSheet | ✅ |
| Ítem free (Hábitos Atómicos) → VideoSheet con "Reproducir" | ✅ |
| Errores de consola | 0 ✅ |
| `c-habitos`, `c-dormir`, `c-jobs` marcados `premium: false` | ✅ |
| 13/16 ítems disponibles lockeados (81%) | ✅ |
