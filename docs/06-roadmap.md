# 06 — Roadmap

> Incremental por diseño. Cada sprint tiene un **gate de salida verificable**: sin él, no se avanza.
> El valor se entrega desde el Sprint 1 (un proyecto declarado ya es útil), no al final.

---

| Sprint | Entregable | Gate de salida |
|---|---|---|
| **0** | `docs/`, `CLAUDE.md`, `AGENTS.md`, CI en el sitio, remediación mínima | CI corre `typecheck`/`lint`/`test`/`build` en cada PR y **falla** ante un error de tipo introducido a propósito |
| **1** | `rodrigoBermejo/proof-engine` (privado). Registry: schema, validador, **3 claims y 3 proyectos reales**. `public/proof/schemas/*.json` | `validate` falla ante un registry inválido y ante las combinaciones prohibidas de `02` §2. Tests sin red |
| **2** | Ingestión GitHub con fixtures grabados | Snapshot tests offline. PAT fine-grained read-only verificado y documentado |
| **3** | Correlación + ledger JSONL + reporte `unassigned` | Reingestar dos veces no cambia el ledger (idempotencia probada por test) |
| **4** | Redacción + publicación vía PR + `publish-diff` | Test de denylist en verde. Branch protection activa. El bot **no puede** mergear |
| **5** | Consumo en el sitio: `/proyectos`, `/proyectos/[slug]`, `/evidencia` | Feed borrado → build verde con vista solo-declarada. Feed corrupto → build rojo |
| **6** | README de perfil generado desde `/proof/v1/*.json` | Cero lógica de evidencia en ese repo (verificable por inspección) |
| **7** | Firma de commits de publicación + digest. Evaluar separar `proof-feed` | Un tercero reproduce la verificación siguiendo solo la documentación pública |
| **V2** | Adaptadores Claude Code / Codex | **El cambio de contrato es aditivo**: un campo opcional nuevo, compatible por la regla 2 de `05-feed-contract.md`. V1 no reserva el campo; reservarlo habría sido contrato anticipado sin consumidor (`02` §8) |

**Gate del Sprint 0 — estado (2026-08-24).** La mitad de falsabilidad está demostrada **en local**: los cuatro gates mecánicos (`typecheck`, `lint`, `test`, `build`) y el guard `guard:funnel` se rompieron a propósito uno por uno, fallaron con su salida y su exit code, y se restauraron. Cada uno tiene al menos un experimento propio; ninguno se da por demostrado por inferencia desde otro — en particular, la mutación de `build` es una que `typecheck` no detecta, para que la señal sea independiente. Las salidas literales están en `audits/2026-08-24-gate-falsability.md` (finding P1-GATE-01). Lo que **falta** para cerrar el gate completo es la otra mitad, y hay que nombrarla: que esa ejecución ocurra **en CI, sobre un PR**. Requiere que exista el PR, que es trabajo pendiente del Sprint 0 (finding P1-PROC-01) y no una propiedad del workflow. Local rojo prueba que el gate no está desconectado; solo CI rojo prueba que además está cableado al PR.

---

## Orden y sus razones

**Por qué el Registry antes de la ingestión (1 antes de 2).** La verdad declarada es la que da sentido a la recolectada. Ingerir primero produciría un montón de eventos sin proyecto al que pertenecer, y la tentación sería inferirlo — exactamente lo que `02-domain-and-evidence-model.md` §3 prohíbe.

**Por qué los claims antes que la evidencia.** `Claim` es la raíz del grafo (`decisions/0007`). Recolectar evidencia sin claims escritos deja un montón de datos buscando una afirmación, que es la dirección `Source → Metric → Dashboard` que el sistema existe para no tomar.

**Por qué la redacción antes del consumo (4 antes de 5).** Si el sitio consumiera un feed sin redactar, aunque fuera una vez en local, la disciplina ya estaría rota. El artefacto público nace redactado o no nace.

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
