# ADR 0002 — Feed estático dentro del repo del sitio, no API viva

- **Estado:** Aceptada, **enmendada el 2026-08-21** (ver la enmienda al final)
- **Fecha:** 2026-08-19
- **Decisión de:** humano (Rodrigo)

## Contexto

El brief original planteaba una "API pública de evidencia" consumida por el sitio. Había que decidir el canal de publicación: API viva, object storage, repo público separado (`proof-feed`), o dentro del repo del sitio.

## Decisión

El motor publica JSON versionado en `public/proof/v1/` **dentro de `RBloomDev/rodrigobermejo-site`**, mediante pull request. El sitio lee esos archivos del filesystem en build y solo renderiza. Sin API viva y sin base de datos en V1.

## Razón

- ~~**Cero red en el build.**~~ **El sitio no necesita red para consumir el feed publicado.** Lee JSON del filesystem, igual que ya lee `content/posts/` en `lib/posts.ts`. Determinista y reproducible **respecto del feed**. **Enmendado el 2026-08-21:** la formulación original era falsa. Ver la enmienda.
- **Auditabilidad gratis.** La historia de git pública hace visible cualquier cambio retroactivo de una métrica. Tamper-evidence sin criptografía extra y sin blockchain.
- **El PR es el gate de privacidad.** Lo que se vuelve público se revisa antes de publicarse; es el mecanismo de control, no un efecto secundario.
- **No convertir un sitio estático cero-ops en un sistema con SLA.** Una API viva añadiría disponibilidad crítica a un portafolio, sin beneficio en V1.
- **Verificable con curl** en el dominio propio, mismo origen, sin CORS.

## Consecuencias

- El motor necesita escritura sobre el repo del sitio (ADR 0005).
- El repo del sitio contiene un directorio escrito por una máquina: `public/proof/v1/**` es zona prohibida para agentes (acotado a `v1/` por `decisions/0009`).
- Un feed viejo no falla el build. Por eso `meta.generated_at` se muestra **siempre** en la UI.
- Sin consultas interactivas. Aceptable: no hay caso de uso en V1.

## Criterio para separar `proof-feed` más adelante

Se separa en un repo público propio cuando se cumpla al menos uno:

- La publicación es más frecuente que semanal y el ruido en la historia del sitio molesta.
- Los artefactos superan unos 5 MB o degradan el tiempo de build.
- Aparece un segundo consumidor independiente del sitio.
- Se quiere firmar los commits del feed con una clave distinta a la del sitio.

Hasta entonces, un repo más sería sincronización sin beneficio.

---

## Enmienda — 2026-08-21

Origen: review adversarial de Codex sobre Sprint 0 (finding `P2-ARCH-01`). La decisión **no cambia**: el feed sigue viviendo en `public/proof/v1/` dentro del repo del sitio. Cambia una razón que estaba mal enunciada.

**«Cero red en el build» era falso.** `app/layout.tsx` usa `next/font` con cuatro familias de Google Fonts, que se descargan durante el build. Una razón falsa no deja de serlo porque la decisión que sostiene sea correcta: si se cita para justificar otra cosa, propaga el error.

La invariante correcta está acotada al feed y esa sí se sostiene: **el sitio no requiere red en runtime ni en build para consumir la evidencia publicada localmente.** Determinismo respecto del feed, no del build completo. Enunciado normativo en `04-architecture.md` §3 y `01-scope-v1.md`.

**La tipografía no se toca.** Es deuda #9 de `audits/2026-08-19-site-baseline.md`, decidida el 2026-08-20 como tarea visual independiente con revisión de diseño. Lo que se corrige aquí es la afirmación, no el código.

## Alternativas descartadas

- **API viva** (`/api/evidence` o servicio propio): añade disponibilidad crítica y exige base de datos. Se reconsidera solo si aparece un caso de uso interactivo real.
- **Object storage** (Vercel Blob, R2): pierde la historia auditable pública y el gate de revisión en PR, que es justamente el mecanismo de privacidad.
- **Repo `proof-feed` desde el inicio:** beneficio nulo hoy; criterio de salida documentado arriba.
