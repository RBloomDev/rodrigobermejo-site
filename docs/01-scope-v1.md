# 01 — Alcance V1

> Documento por versión. Será sustituido por `01-scope-v2.md`, no editado para incluir V2.
> Si algo no está listado como **dentro**, está fuera. La ausencia no es ambigüedad.

---

## Dentro de V1

### Registry: Claims y Projects
- Un archivo YAML por proyecto en `proof-engine/registry/projects/` y uno por claim en `proof-engine/registry/claims/`, escritos a mano por un humano.
- Validador de schema que **falla** ante un registry inválido.
- Al menos 3 proyectos reales declarados con las cuatro dimensiones (`kind`, `lifecycle`, `visibility`, `context`), `sources` y `role`.
- Al menos 3 claims declarados, cada uno con `dimension` (`build`/`lead`/`teach`), `project_ids` y `evidence_ids`. Procedencia y verificabilidad **no se declaran**: el motor las deriva de la evidencia (`02-domain-and-evidence-model.md` §1.1), y el validador falla si aparecen escritas en el Registry.
- El validador rechaza las combinaciones inválidas de `02-domain-and-evidence-model.md` §2.

### Ingestión (solo GitHub)
Read-only, sobre repos allowlisted explícitamente:

| Tipo | Se ingiere |
|---|---|
| commits | sha, autor, timestamp, repo, paths tocados (solo en repos públicos) |
| pull requests | número, estado, timestamps de apertura/merge, rol del actor |
| reviews | quién revisó a quién, cuándo, veredicto |
| releases / tags | nombre, timestamp, si está firmado |
| check runs | conclusión, timestamp (solo donde exista) |
| deployments | target, estado, timestamp (solo donde exista) |

### Ledger
- JSONL append-only versionado en git.
- Ingestión idempotente por `id` content-addressed: reingestar N veces no duplica.

### Correlación
- Reglas del Registry + trailer `Project-Id:` + globs de path.
- Bucket `unassigned` reportado en cada corrida.

### Redacción y publicación
- Redacción antes de escribir el artefacto.
- Publicación de `public/proof/v1/{meta,projects,claims,evidence,activity}.json` **vía pull request** contra el repo del sitio.
- `publish-diff` en el cuerpo del PR.
- Test de denylist que bloquea el merge.

### Consumo en el sitio
- `/proyectos` — listado, agrupable por `kind` y `lifecycle`
- `/proyectos/[slug]` — proyecto, claims que sostiene y evidencia adherida
- `/evidencia` — metodología, los dos ejes, y **los límites del sistema** declarados explícitamente
- Todo estático, leído del filesystem, validado con zod

---

## Fuera de V1 (explícito)

| Fuera | Cuándo, si acaso |
|---|---|
| Claude Code y Codex como fuentes | V2. **Sin campo reservado en V1**: añadirlo entonces será un cambio aditivo, que el contrato ya declara compatible (`02-domain-and-evidence-model.md` §8) |
| Cualquier API viva | Solo si aparece un caso de uso interactivo real |
| Cualquier base de datos | Cuando se cumpla un criterio de salida de `04-architecture.md` §5 |
| Repo `proof-feed` separado | Cuando se cumpla el criterio de `decisions/0002` |
| Firma criptográfica del feed | V1.2 |
| Attestations SLSA / sigstore | V2 |
| README de perfil automatizado | V1.1 |
| Embeddings, búsqueda semántica | Sin caso de uso |
| Scoring, ranking, niveles | **Nunca.** Contradice `00-product-brief.md` |
| Exposición pública de repos privados más allá de agregados | **Nunca.** Contradice `03-privacy-and-publication-policy.md` |
| Rediseño del sitio o del funnel comercial | Fuera de este sistema por completo |
| `/actividad` | V1.1 — depende de tener suficiente evidencia para que sea informativa |

---

## Definition of Done — V1

V1 está terminado cuando **todas** se cumplen:

1. Un humano puede añadir un claim y un proyecto al Registry y verlos publicados sin escribir código.
2. La ingestión corre dos veces seguidas y el ledger no cambia (idempotencia probada por test).
3. El artefacto público pasa el test de denylist y el `publish-diff` es legible por una persona.
4. Con el feed borrado, `npm run build` es verde y el sitio muestra la vista solo-declarada.
5. Con el feed corrupto, `npm run build` es **rojo**.
6. Ninguna afirmación en el sitio se muestra sin sus dos etiquetas (procedencia y verificabilidad).
7. Ninguna **métrica de evidencia** publicada carece de `claim_ids`. Un test lo verifica sobre el artefacto. La metadata operativa y de presentación de `meta.json` está exenta por definición, y el test debe distinguirlas explícitamente (`02-domain-and-evidence-model.md` §7).
8. Un tercero puede tomar cualquier claim con tier `third_party_public` y comprobarlo abriendo una URL.
9. La página `/evidencia` declara qué no puede probar el sistema, y qué parte de LEAD y TEACH queda fuera de lo instrumentable.
10. Cero tokens en el repo del sitio. **El sitio no necesita red para consumir el feed publicado.** No se afirma "cero red en el build": `next/font` descarga las tipografías de Google en build (`04-architecture.md` §3).
11. El funnel comercial no importa nada del feed, verificado sobre el **cierre transitivo** de imports, no con un grep de cadenas (`04-architecture.md` §4.1).
12. Ningún proyecto `confidential` aparece en el feed, en ninguna forma. Un test lo verifica sobre el artefacto (`03-privacy-and-publication-policy.md` §2).

---

## Alcance de Sprint 0 (esta fase)

Sprint 0 **no** implementa nada del Proof Engine. Produce:

1. `docs/` — esta especificación
2. `CLAUDE.md` y `AGENTS.md` — gobernanza de agentes
3. Gate mecánico en el sitio: CI con `typecheck`, `lint`, `test`, `build` y los guards
4. Remediación mínima de los defectos que bloquean SDD o que violan hoy la política de privacidad (ver `audits/2026-08-19-site-baseline.md`)

Sin esto último, el rol de Reviewer no es aplicable: no habría nada objetivo contra lo que fallar.
