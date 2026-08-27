# ADR 0010 — `develop` como rama de integración, y qué merge puede hacer un agente

- **Estado:** Aceptada
- **Fecha:** 2026-08-27
- **Decidida por:** Rodrigo. Redactada y ejecutada por el agente bajo esa autorización.

## Contexto

`AGENTS.md` decía dos cosas que juntas producían un cuello de botella:

> Ramas `feat/`, `fix/`, `docs/`, `chore/` desde `main`.
> Ningún agente mergea. Ni su propio PR, ni el de otro, ni uno automático de publicación.

La segunda regla no distinguía **a dónde** se mergea. El efecto observado el 2026-08-27: cuatro PRs con CI verde esperaron horas sin que nadie pudiera avanzar, y el trabajo que dependía de ellos se detuvo. El agente llegó a parar su propio loop por falta de trabajo desbloqueado.

El diagnóstico importa porque descarta la solución fácil. **El problema no era el número de merges, era que todos pasaban por una persona.** Agrupar PRs habría ahorrado clics sin quitar la espera.

## Decisión

Se adopta `develop` como **rama de integración permanente** en los dos repositorios, y la regla de merge se parte según su destino:

| Merge | Quién |
|---|---|
| `feat/*`, `fix/*`, `docs/*`, `chore/*` → **`develop`** | **Un agente**, con CI en verde |
| **`develop` → `main`** | **Solo Rodrigo** |

Los agentes suben todo a `develop`. Rodrigo revisa ahí, y de ahí sale **un solo PR a `main`**.

## Por qué esto no debilita el control

El control que importa no es «un humano aprueba cada commit»: es **un humano decide qué se vuelve público**. Y lo público es `main` — de ahí construye Vercel, y ahí viven `public/proof/v1/**` y la spec.

`develop` no publica nada. Un cambio puede estar en `develop` una semana sin que nadie lo vea fuera del repo. Así que mover la frontera de revisión de «cada PR» a «`develop` → `main`» **conserva intacto** el control sobre la superficie pública, que es lo que `03-privacy-and-publication-policy.md` §1.5 llama «el PR es el control» y lo que hace que el `publish-diff` signifique algo.

Lo que sí cambia, y hay que decirlo: Rodrigo revisará **lotes** en lugar de cambios sueltos. Eso es peor para detectar un cambio concreto y mejor para no ser el cuello de botella. Es la contrapartida real de la decisión, no un efecto secundario que se pueda ignorar.

## Condiciones sin las cuales esta decisión no vale

1. **`develop` lleva su propio ruleset**: pull request obligatorio, los dos status checks en verde, sin force-push, sin bypass. Una rama de integración sin protección es un sitio donde las cosas aterrizan sin comprobar, y eso es **peor** que no tener rama de integración.
2. **CI debe dispararse en los PR que apuntan a `develop`.** El trigger `pull_request` no puede llevar filtro `branches`, porque ese filtro aplica a la rama **base**. Con él, un PR a `develop` sale con **cero checks** — y un PR sin checks no se ve como «no comprobado», se ve como «no está fallando». Este defecto existía en los dos repos y se corrigió en el mismo cambio que introduce esta ADR.
3. **`develop` no acumula deriva.** Si `main` avanza por su cuenta, `develop` se rebasa. Dos ramas que divergen en silencio son la forma en que este modelo se pudre.

## Límite honesto de la separación

La regla «un agente no mergea a `main`» **no está impuesta por un mecanismo** frente al agente que opera hoy. La restricción de push de `main` está definida sobre `rodrigoBermejo`, y el agente actúa con esas credenciales: podría mergear `main` si decidiera hacerlo. Lo que lo impide es la disciplina y esta ADR, no la plataforma.

Es exactamente el mismo límite que `04-architecture.md` §6 ya reconoce para el PAT personal, y se cierra por la misma vía: `decisions/0008`, la identidad independiente para la automatización. Mientras esa identidad no exista, esta separación es **una convención declarada, no un control**. Presentarla como control sería la sobredeclaración que `§4.1` de ese mismo documento existe para evitar.

## Alternativas descartadas

- **Agrupar más cards por PR sin rama de integración.** Reduce el número de merges pero no la espera, y pierde la revisabilidad por card.
- **Que los agentes mergeen a `main`.** Elimina la única decisión humana sobre la superficie pública. `decisions/0005` llama a ese control «el que impide que el bot mergee su propio PR» de publicación.
- **`develop` sin ruleset.** Convertiría la rama en un área de aterrizaje sin comprobar. Ver condición 1.
