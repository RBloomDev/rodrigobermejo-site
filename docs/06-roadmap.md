# 06 — Roadmap

> Incremental por diseño. Cada sprint tiene un **gate de salida verificable**: sin él, no se avanza.
> El valor se entrega desde el **Sprint D** (una afirmación declarada, publicada y explicada ya es útil), no al final.

> **Reordenado el 2026-08-28 — `decisions/0011`.** Este documento decía que «el valor se
> entrega desde el Sprint 1», y era falso: el Sprint 1 entregó un Registry en un repositorio
> **privado**, y con el orden anterior la primera superficie que un humano podía abrir
> llegaba en el Sprint 5. Cuatro sprints sin salida pública, con la afirmación contraria
> escrita aquí y sin que nadie la hubiera falsado. El **Sprint D** se antepone a la
> ingestión y convierte esa frase en verdad. La ADR explica por qué publicar lo declarado
> es entrega de valor y no un adelanto cosmético: `00-product-brief.md` define el éxito como
> comprobar la afirmación **o entender exactamente por qué no se puede**, y esa segunda
> mitad no necesita motor.

---

| Sprint | Entregable | Gate de salida |
|---|---|---|
| **0** | `docs/`, `CLAUDE.md`, `AGENTS.md`, CI en el sitio, remediación mínima | CI corre `typecheck`/`lint`/`test`/`build` en cada PR y **falla** ante un error de tipo introducido a propósito |
| **1** ✅ | `rodrigoBermejo/proof-engine` (privado). Registry: schema, validador, **3 claims y 3 proyectos reales**. `public/proof/schemas/*.json` | `validate` falla ante un registry inválido y ante las combinaciones prohibidas de `02` §2. Tests sin red — **CERRADO 2026-08-27**, ver `audits/2026-08-27-gate-sprint-1.md` |
| **D** | **Corte vertical solo-declarado.** `public/proof/v1/*.json` con `evidence: []`, `/proyectos`, `/proyectos/[slug]`, `/evidencia` | Feed borrado → build verde. Feed corrupto → build rojo. Denylist en verde y falsada. Ningún `publish: none` en el artefacto |
| **2** | Ingestión GitHub con fixtures grabados. **Recalibrado por `decisions/0011`**: tres `kind`, sin repos de terceros, redacción de privados diferida | Snapshot tests offline. PAT fine-grained read-only verificado y documentado. **El PAT es prerrequisito de entrada, no bloqueo a media carrera** |
| **3** | Correlación + ledger JSONL + reporte `unassigned` | Reingestar dos veces no cambia el ledger (idempotencia probada por test) |
| **4** | Redacción + publicación vía PR + `publish-diff` | Test de denylist en verde. Branch protection activa. El bot **no puede** mergear |
| **5** | *(absorbido por el Sprint D — `decisions/0011`)* Ampliaciones del consumo una vez exista evidencia real | — |
| **6** | README de perfil generado desde `/proof/v1/*.json` | Cero lógica de evidencia en ese repo (verificable por inspección) |
| **7** | Firma de commits de publicación + digest. Evaluar separar `proof-feed` | Un tercero reproduce la verificación siguiendo solo la documentación pública |
| **V2** | Adaptadores Claude Code / Codex | **El cambio de contrato es aditivo**: un campo opcional nuevo, compatible por la regla 2 de `05-feed-contract.md`. V1 no reserva el campo; reservarlo habría sido contrato anticipado sin consumidor (`02` §8) |

**Gate del Sprint 0 — estado (2026-08-26): CERRADO.**

*Primera mitad, en local (2026-08-24).* Los cuatro gates mecánicos (`typecheck`, `lint`, `test`, `build`) y el guard `guard:funnel` se rompieron a propósito uno por uno, fallaron con su salida y su exit code, y se restauraron. Cada uno tiene al menos un experimento propio; ninguno se da por demostrado por inferencia desde otro — en particular, la mutación de `build` es una que `typecheck` no detecta, para que la señal sea independiente. Salidas literales en `audits/2026-08-24-gate-falsability.md` (finding P1-GATE-01).

*Segunda mitad, en CI sobre un PR (2026-08-26).* Existe el PR de Sprint 0 (#1) y sus dos checks obligatorios corrieron en verde: cierra **P1-PROC-01**. Y sobre el PR #2 se provocó el rojo: un **error de tipo introducido a propósito** —el criterio literal de la tabla de arriba— tumbó el job `typecheck / lint / test / build` con `TS2322` y exit 2, mientras `privacy guard` seguía verde; un segundo probe aislado tumbó `privacy guard` con exit 1 mientras el otro job volvía a verde solo. Los dos status checks quedan demostrados como señales independientes y cableadas al PR. Salidas literales, IDs de corrida y SHAs en `audits/2026-08-26-ci-gate-wiring.md`.

Local rojo prueba que el gate no está desconectado; CI rojo prueba que además está cableado al PR. Ahora hay evidencia de las dos cosas. **Lo que sigue sin demostrarse en CI**, y se nombra en lugar de darse por cubierto: los pasos `Lint`, `Test` y `Build` solo tienen falsabilidad local. Que su fallo produzca el mismo check rojo ya demostrado es una inferencia razonable, no un hecho observado.

---

## Orden y sus razones

**Por qué el Registry antes de la ingestión (1 antes de 2).** La verdad declarada es la que da sentido a la recolectada. Ingerir primero produciría un montón de eventos sin proyecto al que pertenecer, y la tentación sería inferirlo — exactamente lo que `02-domain-and-evidence-model.md` §3 prohíbe.

**Por qué los claims antes que la evidencia.** `Claim` es la raíz del grafo (`decisions/0007`). Recolectar evidencia sin claims escritos deja un montón de datos buscando una afirmación, que es la dirección `Source → Metric → Dashboard` que el sistema existe para no tomar.

**Por qué el Sprint D antes que la ingestión (D antes de 2).** Añadido con `decisions/0011`.
La mitad del criterio de éxito —«entender exactamente por qué no puede comprobarla»— no
necesita evidencia recolectada: necesita una afirmación declarada, publicada, y la
explicación honesta de su límite. Esperar tres sprints para publicarla no la mejoraba.

Y hay una razón de calibración, además de una de valor: **la primera vez que se ve la
página de evidencia propia se cambia de opinión sobre qué claims valen la pena.** Hacerlo
después de instrumentar la ingestión significa descubrirlo con tres sprints ya invertidos
en los claims equivocados.

**Por qué la redacción antes del consumo de evidencia (4 antes de que el feed lleve
`evidence[]`).** Si el sitio consumiera evidencia sin redactar, aunque fuera una vez en
local, la disciplina ya estaría rota. El artefacto público nace redactado o no nace. El
Sprint D no rompe esto: publica **cero evidencia**, y su filtro de publicación sobre los
proyectos es la misma función que el Sprint 4 amplía.

**Por qué el README de perfil al final (6).** Es el consumidor más visible y el de menor valor estructural. Hacerlo antes crearía presión por publicar métricas antes de que el modelo de privacidad esté probado.

**Por qué la firma al final (7).** La historia de git pública ya da tamper-evidence. La firma es un refuerzo, no un requisito para que el sistema sea honesto.

## Criterios de reevaluación

Estas decisiones se revisan con datos, no en fecha fija:

| Decisión | Se revisa cuando |
|---|---|
| Sin base de datos | Se cumple un criterio de `04-architecture.md` §5 |
| Feed dentro del repo del sitio | Se cumple un criterio de `decisions/0002` |
| PAT en lugar de GitHub App | Aparece una segunda cuenta o una organización de terceros |
| Sin API viva | Aparece un caso de uso interactivo real, no hipotético |

## Lo que este roadmap no hará nunca

Añadir scoring, niveles, ranking o cualquier número que pretenda resumir a una persona. No es una prioridad baja: está fuera del producto (`00-product-brief.md`).
