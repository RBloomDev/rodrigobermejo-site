# ADR 0008 — La automatización usa una identidad independiente, capaz de abrir PR e incapaz de mergear

- **Estado:** Aceptada. **No implementada en V1, y es deliberado**
- **Fecha:** 2026-08-24
- **Decisión de:** humano (Rodrigo)

## Contexto

`decisions/0005` establece que el motor publica abriendo un pull request, y `03-privacy-and-publication-policy.md` §5 describe la superficie de escritura como dos **PAT fine-grained** emitidos desde la cuenta personal de Rodrigo.

Un PAT personal es, para GitHub, **Rodrigo**. Todo lo que haga la automatización con ese token queda atribuido a la persona: los commits, los PRs y la entrada correspondiente en el audit log. Eso rompe tres cosas a la vez, y ninguna es teórica en un sistema cuyo producto *es* la evidencia de quién hizo qué:

1. **Atribución.** Un feed de Proof of Work que no distingue el trabajo del autor del output de su cron está midiendo dos cosas distintas bajo un solo nombre. El sistema existe precisamente para no hacer eso.
2. **Revocación.** El token de escritura no se puede desactivar sin tocar la identidad con la que Rodrigo opera el repo a diario. Un incidente obliga a elegir entre cortar la automatización y cortarse a sí mismo.
3. **Límite de privilegio.** El control que impide que el bot mergee su propio PR es hoy la **restricción de push** en `main` (`04-architecture.md` §6.1, aplicada el 2026-08-24). Funciona porque la restricción lista a `rodrigoBermejo` como único actor con push. Si la automatización *es* `rodrigoBermejo`, ese control no la excluye: la incluye. Hoy el sistema es seguro porque el motor no está automatizado todavía, no porque la identidad esté separada.

El punto 3 es el que convierte esto en una decisión de arquitectura y no en higiene de credenciales: la separación de identidad es **el prerequisito** de que la restricción de push signifique algo cuando haya un bot.

## Decisión

Cuando la publicación se automatice, correrá bajo una **identidad independiente de la persona**, con dos propiedades que definen la decisión:

- **Capaz de abrir pull requests** contra `RBloomDev/rodrigobermejo-site` (`contents:write` + `pull_requests:write`, un solo repo).
- **Incapaz de mergear a `main`.** No por convención ni por confianza en el scope del token, sino porque la identidad **no está en la lista de actores con push** del ruleset de `main`.

La forma preferida es una **GitHub App** instalada en el repo, con permisos mínimos y token efímero por instalación. Si en el momento de implementarla una App resultara desproporcionada, la alternativa aceptable es una **cuenta de máquina** con su propio PAT fine-grained; lo que **no** es aceptable es seguir con un PAT emitido desde la cuenta personal.

Lo que se decide aquí es la **propiedad**, no el producto de GitHub: identidad distinta de la persona, que abre PRs y no puede mergear.

## Lo que esta ADR NO hace

**No se implementa nada en V1.** No se crea la App, no se crea la cuenta de máquina, no se emite ningún token nuevo y no se toca la configuración actual. `03` §5 sigue describiendo la superficie de escritura vigente y es correcta para hoy.

Es deliberado, y la razón es que **hoy no hay automatización que separar**: el motor no publica todavía. Crear ahora una identidad con permiso de escritura sobre el repo público añadiría una credencial viva —con su rotación, su superficie y su riesgo de fuga— meses antes de que exista algo que la use. La decisión se registra ahora porque el momento de tomarla es antes de escribir el paso de publish, no después de haberlo cableado a un PAT personal.

## Cuándo se implementa

**Antes del primer publish automático**, y es una condición de entrada, no una tarea de limpieza posterior. Concretamente, antes de que el motor abra un PR sin que una persona lo lance a mano.

Al implementarla hay que actualizar, en el mismo cambio:

- `03-privacy-and-publication-policy.md` §5 (la tabla de tokens) y §6 (riesgos 1 y 2).
- `04-architecture.md` §6 y §6.1: la identidad nueva **no** entra en la lista de push de `main`. Verificar que sigue sin entrar es parte de la verificación del ruleset.
- `decisions/0005`, control 3.

## Consecuencias

- Aparece una identidad más que auditar y rotar. Es el coste, y se acepta: es menor que el de no poder distinguir a la persona de su cron.
- La evidencia recolectada podrá separar `actor_role` humano del de la automatización sin heurísticas sobre mensajes de commit.
- Un incidente con el token de publicación se contiene revocando una instalación, sin tocar la cuenta de Rodrigo.
- Hasta que se implemente, **la automatización de publicación no está habilitada**. Ese es el control que sustituye a la separación de identidad mientras no exista: no hay bot.

## Alternativa descartada

**Seguir con el PAT personal y confiar en el scope del token.** El scope acota *qué* puede hacer el token, no *quién* es. No arregla la atribución, no permite revocar de forma independiente, y sobre todo no excluye a la automatización de la restricción de push, que es el único control que impide el auto-merge. Rechazada: dejaría el control de `04-architecture.md` §6.1 vacío justo cuando empiece a hacer falta.
