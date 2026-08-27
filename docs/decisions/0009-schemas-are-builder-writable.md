# ADR 0009 — `public/proof/schemas/**` lo escribe el Builder; la zona exclusiva del bot es `v1/**`

- **Estado:** Aceptada
- **Fecha:** 2026-08-27
- **Decidida por:** Rodrigo. Redactada y ejecutada por el agente bajo esa autorización explícita.
- **Origen:** finding **ESC-01 (P0)**, review adversarial del 2026-08-26.

## Contexto

La regla de zona prohibida se enunciaba con el glob `public/proof/**` en **seis** lugares del corpus: `AGENTS.md`, `CLAUDE.md`, `03` §6 (riesgo 10), `04` §6 (control 4), `decisions/0002` y `decisions/0005`. Todas dicen lo mismo: esos archivos los escribe **solo** el motor, vía PR automatizado, y ningún agente los edita a mano.

Al mismo tiempo, `06-roadmap.md` asigna `public/proof/schemas/*.json` al **Sprint 1**, y `04` §2–§3 sitúa ese archivo dentro del repo del sitio como «contrato ejecutable».

Los dos hechos no podían coexistir:

- El único escritor autorizado —el bot, vía PR automatizado— **no existe todavía por decisión explícita** (`decisions/0008`: «no hay bot»), y su vía de publicación llega en el **Sprint 4**, tres sprints después de que el schema haga falta.
- No había lectura que lo salvara. La única regla acotada a `v1/` en todo el corpus es de **egreso de datos**, no de escritura (`03` §1.1: «el único camino por el que un dato **sale** del sistema es `public/proof/v1/*.json`»). Un JSON Schema no es un dato que sale del sistema — y esa línea demuestra que, cuando la spec quiere decir `v1/`, lo escribe.

Segundo filo, independiente del calendario: `AGENTS.md` ordena que si el schema diverge de la spec «se corrige el derivado», y define la vía de corrección como «se corrige la causa en el motor o en el Registry». Un schema no es dato del Registry ni producto del motor: es un **derivado de `docs/05`**. La única remediación mandatada para un FAIL de schema no tenía actor autorizado ni lugar donde ejecutarse, ni antes ni después del Sprint 4.

Las dos únicas salidas eran ilegales: un agente escribía en zona prohibida, o el Sprint 1 no podía cerrarse.

## Decisión

**La zona de escritura exclusiva del bot es `public/proof/v1/**`, no `public/proof/**`.**

`public/proof/schemas/**` queda **fuera** de esa zona y lo escribe el **Builder por pull request normal**, con una restricción que es la que hace segura la apertura:

> El schema se deriva **de `docs/05-feed-contract.md`**, nunca por observación del artefacto publicado.

## Por qué la restricción es lo importante, y no el permiso

El peligro que la zona prohibida evita no es que un agente escriba en un directorio. Es que un agente **ajuste el contrato a los datos** en lugar de ajustar los datos al contrato: ver un artefacto que no valida, y "arreglar" el schema para que valide. Eso produce CI verde midiendo la cosa equivocada, que `05` declara peor que fallar.

Esa vía queda cerrada por dirección, no por permiso:

- **`v1/**` sigue siendo intocable para todo agente.** Un dato malo se corrige en el motor o en el Registry, exactamente como antes. Ahí no cambia nada.
- **`schemas/**` se escribe solo mirando `docs/05`.** Si el schema y la prosa divergen, el schema está mal y se regenera desde la prosa. **Divergencia = FAIL, no deuda.**
- Un PR que toque `schemas/**` **y** `v1/**` a la vez es un defecto por construcción: son dos regímenes y dos actores distintos.

## Alternativa descartada

**Mover `schemas/*.json` al repo del motor** y publicarlos con el primer artefacto. Se descarta porque contradice más spec de la que arregla: `04` §2, §3 y §6 sitúan el contrato ejecutable dentro del sitio, y el control 5 de `decisions/0005` hace que **CI del sitio** valide el feed contra `schemas/*.json`. Un contrato ejecutable que vive en un repo privado tampoco es verificable por un tercero, que es la razón de que el feed sea público.

## Consecuencias

- Desbloquea `S1-12` y con ella el gate del Sprint 1.
- Seis ediciones de una línea cada una, para que el glob diga `v1/**` donde corresponde y `schemas/**` quede descrito en su propio régimen.
- El riesgo 10 de `03` §6 («agente edita artefactos a mano») **no se debilita**: sigue cubriendo `v1/**`, que es donde viven los artefactos. Los schemas no son artefactos.
- El Reviewer gana un eje concreto que comprobar en cualquier PR que toque `schemas/**`: *¿esto se derivó de la prosa, o de mirar un JSON que no validaba?*
