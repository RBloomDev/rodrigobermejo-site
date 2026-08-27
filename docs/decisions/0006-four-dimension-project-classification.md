# ADR 0006 — Project se clasifica en cuatro dimensiones, no en un enum

- **Estado:** Aceptada, **enmendada el 2026-08-21** (ver la enmienda al final)
- **Fecha:** 2026-08-20
- **Decisión de:** humano (Rodrigo)
- **Sustituye:** el campo `classification` del modelo original

## Contexto

El modelo original tenía un solo campo:

```
classification: production | product | internal_project | lab | experiment | education
```

Ese enum mezclaba tres preguntas distintas en una sola respuesta:

- `production` describe **madurez**
- `internal_project` describe **contexto**
- `lab`, `experiment`, `education`, `product` describen **naturaleza**

La consecuencia es que los casos reales eran inexpresables. Un producto propio en beta y un producto de cliente en producción competían por el mismo campo, y "un laboratorio que ya corre en producción" no tenía representación posible.

## Decisión

Cuatro dimensiones ortogonales, todas requeridas:

| Dimensión | Valores |
|---|---|
| `kind` | `product` · `tool` · `education` · `lab` · `experiment` |
| `lifecycle` | `discovery` · `prototype` · `alpha` · `beta` · `production` · `maintenance` · `archived` |
| `visibility` | `public` · `private` · `confidential` |
| `context` | `personal` · `rbloomdev` · `inadaptados` · `client` |

Un mismo proyecto se representa así:

```yaml
kind: product
lifecycle: beta
visibility: private
context: personal
```

## Ajuste sobre la propuesta inicial

La propuesta traía `kind: product | internal_tool | client_project | education | lab | experiment`. Dos valores se cambiaron porque **codificaban contexto dentro de la naturaleza**, que es el error que esta ADR existe para corregir:

- **`client_project` se elimina.** Describe *para quién* es el trabajo, y eso es exactamente `context: client`. Un proyecto de cliente puede ser un `product`, una `tool` o una integración operada; forzarlo a un `kind` propio perdía esa información. Un sistema de automatización operado para un cliente es `kind: tool`, `context: client`, `lifecycle: production`.
- **`internal_tool` se renombra a `tool`.** El prefijo "internal" también era contexto. Ahora `context` dice de quién es, y `kind` solo dice qué es.

Resultado: cinco valores en `kind`, y cero solapamiento con `context`.

## Validación de ortogonalidad

Cada par se verificó. Solo hay una relación no ortogonal, y es deliberada:

`visibility` × `nda` son **jerárquicos**. <!-- ver la enmienda de 2026-08-21: nda: true fuerza publish: none, no aggregate --> `visibility` es una regla de publicación; `nda` es un hecho legal. `nda: true` **implica** `visibility: confidential`, y el validador impone la implicación. No son redundantes: existe material confidencial sin NDA firmado.

El resto de pares (`kind`×`lifecycle`, `kind`×`context`, `kind`×`visibility`, `lifecycle`×`visibility`, `lifecycle`×`context`, `visibility`×`context`) son independientes. Detalle en `02-domain-and-evidence-model.md` §2.

## Combinaciones inválidas

Se rechazan en el validador, no se resuelven fusionando dimensiones:

- `kind: experiment` con `lifecycle: production` o `maintenance`. Un experimento que entró en producción dejó de ser un experimento y hay que reclasificarlo.
- `nda: true` con `visibility` distinto de `confidential`.
- `context: client` es válido con cualquier `visibility`, pero publicar algo de un proyecto de cliente exige un `release` humano registrado, también cuando la visibilidad es `private`. **Enmendado el 2026-08-21**, ver la enmienda.

## Consecuencias

- Cuatro campos requeridos en lugar de uno. Más ceremonia al declarar un proyecto, y es el precio de que el modelo no mienta.
- Las reglas de admisibilidad de claims pasan a depender de `kind` **y** `lifecycle`, no de un solo valor. **Enmendado el 2026-08-21:** la formulación original de esta consecuencia se apoyaba en `Claim.kind: operation`, un campo que ya no existe. Ver la enmienda.
- `context` fija los cuatro contextos actuales. Añadir uno es aditivo y no rompe el contrato.
- `lifecycle` no incluye `paused`. `archived` cubre "ya no activo", pero pierde la distinción entre pausado con intención de retomar y abandonado. Se añadirá si aparece un proyecto real que lo necesite; añadir un valor es aditivo.

## Alternativa descartada

**Mantener un enum único y añadir valores compuestos** (`client_product_production`). Explota combinatoriamente y hace imposible filtrar por una dimensión.

---

## Enmienda — 2026-08-21

Origen: review adversarial de Codex sobre Sprint 0 (findings `P0-PRIV-01`, `P1-CLAIM-01`). Las cuatro dimensiones y sus valores **no cambian**. Cambian dos consecuencias:

**1. Admisibilidad de claims sin `Claim.kind`.** El campo se eliminó (`decisions/0007`, enmienda). Lo que queda mecánico es `kind: experiment` × `lifecycle: production|maintenance` como combinación inválida, y la cadencia de releases restringida a `production` y `maintenance`. Que una afirmación no se presente como *operativa* sin evidencia de deployment pasa a ser regla de presentación que comprueba el Reviewer, no invariante del validador. Ver `02-domain-and-evidence-model.md` §2.

**2. `visibility` y `context` gobiernan la publicación con default cerrado.** `confidential` significa ausencia total del feed, no un registro redactado, y `context: client` exige `release` humano con cualquier `visibility` — no solo con `public`. La razón es que el umbral k no anonimizaba: contaba eventos y no sujetos, así que un agregado de un único cliente seguía siendo atribuible. Ver `03-privacy-and-publication-policy.md` §2–§3.
