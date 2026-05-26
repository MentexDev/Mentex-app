# RFC-002 — Crisis Handle Protocol

> **Estado:** 🟡 PLACEHOLDER · **Fecha:** 2026-05-26 · **Owner:** Diego (founder Mentex)
> **Status real:** este RFC es un **shell intencionalmente incompleto**. No se implementa `crisis_handle` hasta que esté escrito a fondo y revisado por un profesional de salud mental.

---

## §0 — Por qué este RFC existe

[RFC-001 §15.A](./RFC-001-COACH-AGENT-CAPABILITIES.md#15a--decisiones-del-sello-2026-05-26) determinó que **`crisis_handle` (Tool #7 de Capa Core) no se puede implementar solo con el storyboard del §11.5 del RFC-001**.

Las razones:

1. **Sensibilidad clínica.** Una respuesta mal calibrada en un momento de crisis puede empeorar la situación. Requiere protocolos validados (similar a 988 Lifeline guidelines en US, Línea 106 en Colombia, etc.).
2. **Liability legal.** Mentex NO es servicio médico ni psicológico. Las disclaimers y boundaries deben ser jurídicamente sólidos en cada país de operación.
3. **UX especial.** El flow de crisis **rompe** las reglas normales del coach (sin timeline, tipografía más grande, tap-targets más grandes, sin animaciones cute, recursos pro accesibles en 1 tap). Requiere especificación dedicada.
4. **Variabilidad geográfica.** Recursos de crisis cambian por país: líneas telefónicas, regulaciones, idiomas, edad legal de consentimiento. No es one-size-fits-all.

---

## §1 — Qué debe documentar este RFC (cuando se escriba)

> Esta es la **estructura obligatoria** del RFC-002 v1.0 final.

### §1.1 — Detección de crisis

- Lista de keywords/patrones de riesgo en español + inglés (ideación suicida, autolesión, abuso, etc.)
- LLM classifier vs regex vs ambos
- False positives — qué NO es crisis (drama, humor negro, etc.)
- Sensibilidad ajustable por user (config en Settings — algunos users necesitan más sensibilidad)
- Detección por contexto (mensaje previo + sesión actual)
- **Quién revisa el clasificador:** profesional de salud mental contratado (a definir).

### §1.2 — Respuesta inicial del Coach

- Copy canónico (NO variantes — consistencia crítica)
- Acknowledgment empático (validar emoción sin minimizar ni catastrofizar)
- NO ofrecer soluciones rápidas tipo *"prueba meditar"*
- Reconocer límites del Coach explícitamente
- Transición clara hacia recursos humanos

### §1.3 — Recursos por país (catálogo)

| País | Línea principal | SMS/Text | Apps gratuitas | Notas |
|---|---|---|---|---|
| 🇨🇴 Colombia | Línea 106 (Bogotá) · 24/7 | — | — | Cobertura por ciudad varía |
| 🇲🇽 México | 800 290 0024 (SAPTEL) | — | — | |
| 🇦🇷 Argentina | (011) 5275-1135 (Centro de Asistencia al Suicida) | — | — | |
| 🇨🇱 Chile | 600 360 7777 (Salud Responde) | — | — | |
| 🇪🇸 España | 024 (3-dígitos · Ministerio Sanidad) | — | — | |
| 🇺🇸 Estados Unidos | 988 (Suicide & Crisis Lifeline) | 988 (text) | Crisis Text Line · text HOME to 741741 | |
| 🌎 Internacional fallback | — | — | befrienders.org | Lista por país |

> **TODO:** completar catálogo para los 20+ países donde se proyecta lanzamiento. Cada uno verificado por contacto local antes de incluir.

### §1.4 — UX especial (vs UX normal del coach)

| Aspecto | UX normal | UX crisis |
|---|---|---|
| Timeline visible | Sí (3+ steps) | **NO** — flow directo |
| Animaciones | Suaves con neon | **Mínimas, sin neon brillante** |
| Tipografía | 15px base | **17px base** (más legible) |
| Tap targets | 44pt min | **56pt min** (recursos en 1 tap fácil) |
| Frases gerundio | *"Mirando…", "Pensando…"* | **Solo: *"Aquí estoy contigo."*** |
| Confirmaciones | Para acciones externas | **NO confirmar tap-to-call** (latencia mata) |
| Tono | Cálido + sabio | **Cálido + grounded + sin ornamentación** |
| Voz Mentex AI | Por defecto disponible | **NO ofrecer voz** durante crisis (puede sentirse impersonal) |

### §1.5 — Casos límite

- **Menor de edad detectado** — protocolo diferenciado, recursos juveniles, tutor legal mention
- **Tercera persona mencionada** (*"mi amigo está…"*) — guidance diferente, no diagnosticar al ausente
- **Crisis fuera de horario** (3am en país sin línea 24/7) — fallback internacional + apps gratuitas
- **Re-ocurrencia** (mismo user, múltiples crisis en 7 días) — escalación interna? notificación a Diego?
- **Usuario sin internet en el momento** — preguntar al inicio del onboarding por contacto de emergencia local persistido offline

### §1.6 — Logging y privacidad

- ¿Logueamos eventos de crisis? Sí, pero con cifrado y acceso restringido.
- ¿Quién puede acceder a esos logs? **Nadie**, salvo (a) profesional de salud mental contratado por Mentex en revisiones periódicas anonimizadas, (b) requerimiento judicial.
- Métricas agregadas: cuántas crisis/mes, tiempo de respuesta, % que tap-call recurso. **Cero PII en métricas.**
- GDPR: derecho a erasure aplica también a logs de crisis.

### §1.7 — Disclaimers legales

- Texto del onboarding (sección Privacidad) que explica que Mentex NO es servicio médico/psicológico.
- Disclaimer in-app durante el flow de crisis (uno y solo uno, no repetir).
- ToS clauses específicas (revisión legal).
- Limitación de responsabilidad (revisión legal por jurisdicción).

### §1.8 — Testing del protocolo

- Casos de test simulados (lista de inputs que debe disparar crisis_handle).
- Casos de test que NO deben disparar (false positives).
- Test de tap-to-call en cada plataforma (iOS/Android).
- Test de tipografía/contraste con accessibility audit.
- Test de respuesta sin internet (cache local de recursos).

### §1.9 — Roadmap del RFC-002 mismo

1. **Contratar profesional de salud mental** (psicólogo/a clínico/a con experiencia en líneas de crisis) — antes de escribir contenido.
2. **Borrador del RFC** con clínico + Diego + equipo legal.
3. **Revisión por país** de recursos (mínimo 5 países antes de lanzar).
4. **Implementación** solo después de sello del RFC-002.
5. **Auditoría 6 meses post-launch** con datos anonimizados.

---

## §2 — Hasta entonces, ¿qué hacemos?

**Mientras el RFC-002 no esté sellado:**

- ❌ NO implementar `crisis_handle` en Mentex.
- ✅ El Coach detecta keywords de crisis con un clasificador básico (a definir en RFC-002 §1.1).
- ✅ Cuando detecta crisis, el Coach **NO intenta manejarla**. En su lugar muestra una **Static Crisis Card** mínima con:
  - Mensaje empático corto (*"Lo que dijiste me importa. Estás pasando por algo difícil."*).
  - Recurso telefónico del país detectado (geo-IP + país del onboarding).
  - Mensaje claro: *"No estoy capacitado para acompañarte aquí. Lo que necesitas es alguien que sí lo esté."*
  - Botón para abrir línea de crisis local (tap-to-call).

Esto es la **versión mínima viable y segura** del Coach en pre-RFC-002. **NO sustituye** el RFC-002 completo, solo evita peor escenario.

---

## §3 — Cómo se completa este RFC

1. Diego contrata profesional de salud mental (1-3 sesiones de consultoría).
2. Profesional + Diego escriben §1.1 a §1.8 a fondo.
3. Legal review §1.7 por país.
4. PR contra este archivo cambiando status de 🟡 PLACEHOLDER a ✅ SEALED v1.0.
5. Implementación arranca solo después del sello.

---

## §4 — Changelog

| Versión | Fecha | Cambio | Sellado por |
|---|---|---|---|
| 0.1-placeholder | 2026-05-26 | Shell inicial. Define estructura obligatoria de v1.0 y la versión mínima viable mientras se escribe. | ✅ Diego (como placeholder) · 2026-05-26 |

---

**Fin del placeholder.**

> Este documento existe para que `crisis_handle` (Tool #7 del RFC-001) **no se implemente apresuradamente**. La sensibilidad del caso de uso requiere el tiempo y la rigurosidad de un RFC propio. No es burocracia — es responsabilidad.
