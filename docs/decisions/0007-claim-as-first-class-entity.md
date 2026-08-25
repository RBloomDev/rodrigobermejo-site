# ADR 0007 — Claim es entidad de primer nivel y raíz del grafo

- **Estado:** Aceptada, **enmendada el 2026-08-21** (ver la enmienda al final)
- **Fecha:** 2026-08-20
- **Decisión de:** humano (Rodrigo)

## Contexto

La regla "una métrica que no está adherida a un claim no se publica" existía como principio en la documentación, pero `Claim` era un atributo de `Project` (`project.claims[]`). Un principio que no está en la estructura de datos es una recomendación, y las recomendaciones se erosionan.

## Decisión

`Claim` pasa a ser entidad de primer nivel y **raíz del grafo**:

```
Claim  →  Project  →  Evidence  →  Source
```

Y la dirección inversa queda prohibida por diseño:

```
Source →  Metric  →  Dashboard        (NO)
```

`Claim` y `Project` son **muchos-a-muchos**: `claim.project_ids[]` posee la relación. ~~`project.claim_ids[]` existe en el feed publicado únicamente como índice inverso **derivado**, generado por el motor para poder renderizar la página de un proyecto sin recorrer todos los claims.~~ **Enmendado el 2026-08-21: el índice inverso no se persiste en ningún artefacto.** Se computa al renderizar. Ver la enmienda.

## Razón

Tres argumentos, en orden de peso:

1. **Las afirmaciones que importan atraviesan proyectos.** "Construyo sistemas de software e IA utilizados en contextos reales" se apoya en varios proyectos y no vive en ninguno. Como atributo de `Project` habría que duplicarla en cada uno, y una afirmación duplicada es una afirmación que se desincroniza.

2. **La regla anti-vanity se vuelve estructural.** Si `Claim` es la raíz, una métrica sin `claim_id` no tiene padre y por tanto no tiene dónde existir. Deja de ser una regla que alguien debe recordar y pasa a ser una que el schema impone. Efecto inmediato al aplicarla: los buckets de `activity.json` necesitaron `claim_ids` requerido, porque un contador de actividad sin afirmación que sostener es exactamente el dashboard que este proyecto existe para no construir.

3. **Fuerza la dirección correcta de razonamiento.** Con `Source` como raíz, la fuente decide qué se mide y la métrica se convierte en el mensaje. Con `Claim` como raíz, hay que escribir la afirmación primero y buscar después con qué respaldarla — que es el orden honesto, y el que hace visible cuando no hay con qué.

## La dimensión de marca vive en Claim

`Claim.dimension` es requerida: `build` · `lead` · `teach`.

Vive en `Claim` y no en `Project` porque un mismo proyecto sostiene afirmaciones de dimensiones distintas: un curso puede sostener un claim `teach` (lo enseñé) y otro `build` (construí la plataforma). Ponerla en `Project` obligaría a elegir una y perdería la otra.

Proof of Work demuestra principalmente `build`, porque es la dimensión instrumentable. Eso **no** jerarquiza: `lead` y `teach` existen en el modelo con la procedencia y verificabilidad que realmente tienen — en V1, `declared` / `unverifiable`, porque `github` no produce evidencia de liderazgo ni de docencia. La UI debe evitar que "más evidencia" se lea como "más importante".

## Definición final

> **Superseded el 2026-08-21.** La forma vigente de `Claim` vive en `02-domain-and-evidence-model.md` §1, que es la autoridad. El bloque de abajo se conserva como registro de lo que se decidió el 2026-08-20; los tres campos tachados ya no existen. Ver la enmienda.

```
Claim
  id           slug estable, inmutable una vez publicado
  statement    la afirmación, en primera persona, escrita por un humano
  dimension    build | lead | teach                      (requerido)
  kind         ...                                       (ELIMINADO 2026-08-21)
  project_ids  [string]  uno o varios, no vacío          (requerido)
  provenance   declared | collected | derived |
               correlated                                (DERIVADO, no declarado)
  verifiability unverifiable | self_link |
               third_party_public | cryptographic        (DERIVADO, no declarado)
  evidence_ids [string]
  attestor?    ...                                       (ELIMINADO 2026-08-21)
```

Invariantes que el schema impone:

- `statement` lo escribe un humano. Si lo generó un proceso automático, no es un claim.
- Ningún claim expresa competencia, calidad ni impacto. No hay campo donde ponerlo.
- `project_ids` no puede estar vacío.
- `verifiability != unverifiable` implica al menos un `evidence_id` con `public_url` — desde la enmienda es un **teorema** de la derivación, no un invariante a imponer.
- Las reglas de integridad del grafo G1–G6 (`02-domain-and-evidence-model.md` §1.2).

## Qué las métricas nunca son

Las métricas complementan la evidencia de un claim y jamás se convierten en la afirmación:

commits ≠ expertise · líneas de código ≠ habilidad · tokens ≠ productividad · sesiones de IA ≠ experiencia · tool calls ≠ calidad

## Consecuencias

- El Registry gana un directorio: `registry/claims/*.yaml`.
- `claims.json` es el punto de entrada del feed; el sitio lo lee primero.
- `project.claims[]` desaparece del modelo declarado. Mantenerlo habría creado dos fuentes de verdad para la misma arista.
- Escribir un claim es un acto humano deliberado. El sistema no puede crecer solo, y eso es la intención.

## Alternativa descartada

**Dejar `Claim` como atributo de `Project`.** Más simple de implementar y estructuralmente incapaz de expresar una afirmación que abarca varios proyectos, que es justo el tipo de afirmación que un portafolio profesional necesita hacer.

---

## Enmienda — 2026-08-21

Origen: review adversarial de Codex sobre Sprint 0 (findings `P1-CLAIM-01`, `P1-CLAIM-02`, `P1-GRAPH-01`). La decisión central del ADR —`Claim` como raíz del grafo— **se mantiene sin cambios**. Lo que se enmienda es la forma del registro, en tres puntos.

**1. `Claim.kind` se elimina.** Era requerido y no tenía consumidor mecánico real: su única regla automática era la admisibilidad de `operation`. Y sus seis valores mezclaban ejes distintos — `existence` describe la forma de la afirmación, `education` su dominio, `operation` una propiedad del proyecto que la sostiene. Un campo obligatorio que mezcla ejes obliga a elegir mal en cada claim que se escriba.

La regla de `operation` se reformula sin la taxonomía (`02` §2): parte pasa a ser mecánica sobre `lifecycle`, parte pasa a ser regla de presentación que comprueba el Reviewer. Es una **pérdida deliberada de mecanicidad**, aceptada a cambio de no sostener una taxonomía inventada para poder automatizar una sola regla. Reintroducirla exige un ADR nuevo y un campo de un solo eje.

**2. `provenance` y `verifiability` se derivan; `attestor` desaparece.** Se declaraban en `Claim` **y** se observaban en `Evidence`: dos fuentes de verdad para el mismo hecho, que podían discrepar sin que nada fallara. Un claim podía afirmar `third_party_public` con evidencia `unverifiable` y validar.

`Evidence` queda como autoridad única. El estado del claim es una función de su evidencia (`02` §1.1), y el conjunto vacío da `declared` / `unverifiable`. `attestor` cae como consecuencia: solo tenía sentido con `provenance: attested`, y ninguna fuente de V1 produce evidencia `attested`. Cuando exista, vivirá en `Evidence`, junto al hecho que describe.

**3. El índice inverso no se persiste.** El ADR autorizaba `project.claim_ids[]` en el feed como derivado. Persistir un derivado es reintroducir la segunda fuente de verdad que el propio ADR elimina del Registry, un archivo más tarde. La regla G6 (`02` §1.2) lo prohíbe en cualquier artefacto; la página de un proyecto filtra `claims` al renderizar, que es una operación trivial sobre un array de decenas de elementos.

Coste de las tres: nada de lo publicado en `v1/` cambia de forma incompatible, porque **todavía no hay nada publicado**. El momento de hacer esto es ahora; después de Sprint 4 habría requerido `v2/`.
