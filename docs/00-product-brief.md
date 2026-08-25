# 00 — Product Brief: Proof of Work / Engineering Evidence

> Documento durable. Cambia solo si cambia la tesis. El alcance por versión vive en `01-scope-v1.md`.

## Tesis

Respaldar afirmaciones profesionales sobre construir productos, sistemas, laboratorios y proyectos educativos con **evidencia verificable**, en lugar de con narrativa sin respaldo.

La forma es siempre la misma:

```
El humano escribe la afirmación.  →  El motor adhiere evidencia.  →  El lector juzga.
```

Ninguno de los tres pasos puede absorber a los otros. El sistema no escribe afirmaciones, no juzga, y no convierte evidencia en puntajes.

La estructura de datos sigue la misma dirección, y es la decisión de diseño más importante del proyecto:

```
Claim  →  Project  →  Evidence  →  Source        (sí)
Source →  Metric   →  Dashboard                  (no)
```

`Claim` es la raíz, no un atributo de un proyecto. Detalle en `02-domain-and-evidence-model.md` §0-§1.

## Las tres dimensiones de la marca

No son excluyentes, y ninguna sustituye a las otras:

| Dimensión | Qué abarca |
|---|---|
| **BUILD** | Sistemas, productos, software, IA, automatización, laboratorios y proyectos que construyo |
| **LEAD** | Arquitectura, liderazgo tecnológico, estrategia, CTO, producto y ejecución |
| **TEACH** | Docencia, currícula, educación y transferencia de conocimiento |

**Proof of Work demuestra principalmente BUILD**, porque es la dimensión donde existe evidencia recolectable y verificable por terceros. **No borra LEAD ni TEACH**: sus claims existen en el modelo, con la procedencia y verificabilidad que realmente tienen. En V1 eso es `declared` / `unverifiable`, porque la única fuente es GitHub y no produce evidencia de liderazgo ni de docencia. La atestiguación de terceros es la vía que las haría más fuertes, y todavía no existe.

La trampa a evitar: confundir "la dimensión con más evidencia" con "la dimensión más importante". La primera es solo la más instrumentable. Un claim LEAD sostenido por atestiguación no vale menos, vale distinto, y la UI debe hacerlo legible.

Corolario operativo: "consultor" e "ingeniero" no son opciones excluyentes y el modelo no obliga a elegir. El copy público del sitio no cambia por ahora.

## Postura epistémica (el corazón del proyecto)

La evidencia recolectable **solo puede sostener cinco cosas**:

| Puede sostener | No puede sostener |
|---|---|
| **Existencia** — esto ocurrió | Competencia |
| **Autoría** — yo lo hice | Calidad |
| **Tiempo** — cuándo ocurrió | Criterio / juicio técnico |
| **Continuidad** — se mantuvo durante N meses | Impacto de negocio |
| **Colaboración** — otros lo revisaron, o yo revisé a otros | Seniority |

Consecuencias que el sistema debe respetar sin excepción:

1. **Telemetría ≠ experiencia.** Un commit prueba que se escribió código, no que se escribió bien. El sistema nunca afirma lo segundo.
2. **Ausencia de evidencia ≠ ausencia de trabajo.** El trabajo bajo NDA, en repos privados o fuera de GitHub es real y en gran medida invisible aquí. La interfaz debe decirlo, no dejarlo implícito.
3. **Las etiquetas de verificabilidad no son un score.** Son una declaración de qué puede comprobar un tercero. Un claim `declared` no es "peor"; es distinto, y se muestra como tal.
4. **Una métrica que no está adherida a un `Claim` no se publica.** Es una regla formal del dominio, no una guía de estilo: sin `claim_id` el registro no existe. Elimina la categoría entera de dashboard vanity. Ver `02-domain-and-evidence-model.md` §7.

## No-objetivos (explícitos y permanentes)

- No es un dashboard de actividad de GitHub.
- No produce porcentajes de experiencia, niveles, rankings ni scores de habilidad.
- No usa líneas de código, conteo de commits, streaks, stars, followers, tokens consumidos, sesiones de IA ni tool calls como indicador de nada.
- No almacena prompts, transcripciones de agentes ni código privado.
- No mezcla analítica de visitantes con evidencia de trabajo.
- No requiere infraestructura operada: sin base de datos, sin servicio vivo, sin SLA en V1.

## Identidades y repositorios

Tres repos, dos dueños, una identidad respaldada:

| Repo | Dueño | Rol | Visibilidad |
|---|---|---|---|
| `RBloomDev/rodrigobermejo-site` | RBloomDev | Sitio público, **spec canónica (`docs/`)** y artefactos publicados (`public/proof/`) | Público |
| `rodrigoBermejo/proof-engine` | rodrigoBermejo | Ingestión, Registry, ledger, correlación, redacción, publicación | **Privado** |
| `rodrigoBermejo/rodrigobermejo` | rodrigoBermejo | README de perfil; consume el feed | Público |

La identidad que hace las afirmaciones es **`rodrigoBermejo`** (persona). `RBloomDev` es la organización que opera el sitio. El motor y el README de perfil viven bajo la cuenta personal porque la verificabilidad pública es más fuerte cuando el instrumento vive bajo la identidad que reclama.

Esta asimetría es deliberada y debe permanecer legible: la spec y el feed son públicos y auditables aunque el motor que los produce no lo sea.

## Por qué la spec es pública

`docs/` vive en el repo público. La metodología no contiene secretos: es una declaración de método y de límites. Publicarla:

- hace las afirmaciones **auditables** — cualquiera puede comprobar si el sistema hace lo que dice;
- es en sí misma proof-of-work;
- da a ambos agentes (Builder y Reviewer) una única ubicación canónica.

Lo que nunca es público: el token, la evidencia sin redactar, el ledger crudo, y cualquier metadata de repos privados que no haya pasado por redacción.

## Mapa de las once preguntas del brief

Cada pregunta se responde en un documento concreto. Si una respuesta no está donde dice esta tabla, la tabla está mal y hay que corregirla.

| # | Pregunta | Respuesta en |
|---|---|---|
| 1 | ¿Necesitamos otro repositorio? | `04-architecture.md` §1, `decisions/0001` |
| 2 | ¿Qué vive en el sitio y qué fuera? | `04-architecture.md` §2–§3 |
| 3 | ¿Qué constituye un Project? | `02-domain-and-evidence-model.md` §2 |
| 4 | ¿Qué constituye Evidence? | `02-domain-and-evidence-model.md` §4 |
| 5 | ¿Múltiples repos → un proyecto? | `02-domain-and-evidence-model.md` §3 |
| 6 | ¿Cómo tratamos repos privados? | `03-privacy-and-publication-policy.md` §2 |
| 7 | ¿Métricas sin revelar confidencial? | `03-privacy-and-publication-policy.md` §3 |
| 8 | ¿Verificable vs declarable? | `02-domain-and-evidence-model.md` §6 |
| 9 | ¿Cómo evitamos vanity metrics? | `02-domain-and-evidence-model.md` §7 |
| 10 | ¿Telemetría ≠ experiencia? | este documento, §Postura epistémica |
| 11 | ¿Claude Code / Codex sin acoplar? | `02-domain-and-evidence-model.md` §8 |
| — | ¿Qué constituye un Claim? | `02-domain-and-evidence-model.md` §1, `decisions/0007` |

## Criterio de éxito

El sistema funciona si un lector escéptico puede tomar cualquier afirmación del sitio y, **sin confiar en nosotros**, comprobarla o entender exactamente por qué no puede comprobarla.
