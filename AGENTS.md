# AGENTS.md — Contrato de trabajo para agentes

Canónico para **Claude Code y Codex por igual**. `CLAUDE.md` apunta aquí; no duplica nada.

## Fuente de verdad

`docs/` es la única. Ningún agente implementa nada que no esté especificado ahí.
**Si falta spec: escribe spec, abre PR, y para.** No improvises la especificación mientras implementas.

| Necesitas saber | Lee |
|---|---|
| Por qué existe esto, qué NO es | `docs/00-product-brief.md` |
| Qué entra en V1 | `docs/01-scope-v1.md` |
| Claim, Project, Evidence, anti-vanity | `docs/02-domain-and-evidence-model.md` |
| Qué se puede publicar | `docs/03-privacy-and-publication-policy.md` |
| Dónde vive cada cosa | `docs/04-architecture.md` |
| Forma del feed | `docs/05-feed-contract.md` |
| Orden de trabajo | `docs/06-roadmap.md` |
| Por qué se descartó X | `docs/decisions/` |
| Estado y deuda del sitio | `docs/audits/` |

## Roles

Una feature tiene **un Builder y un Reviewer**, y nunca dos Builders. El rol se alterna **por feature**, no por commit.

**El PR es el lock.** Una feature = una rama = un PR.
- El **Builder** es el único que commitea en esa rama.
- El **Reviewer** solo escribe comentarios. **Jamás commitea** en una rama que no es suya.

### Builder
1. Lee la sección de spec que aplica. Si no existe, para.
2. Escribe el test que falla primero. Comprueba que falla por la razón correcta.
3. Implementa lo mínimo que lo pone en verde.
4. Verifica: `npm run typecheck && npm run lint && npm test && npm run build && npm run guard:funnel`. Lee la salida; el exit code es la autoridad, no tu expectativa.
5. Abre PR citando la sección de spec y el Definition of Done.

### Reviewer (adversarial)
Emite un veredicto por PR: **BLOCK / CONCERN / APPROVE**, con evidencia `archivo:línea`. Sin evidencia no hay hallazgo.

El veredicto va **en comentarios**. Un agente **no usa el botón de aprobación de GitHub**: el review de un agente forma parte de la gobernanza del proyecto, pero no es una aprobación humana y no debe presentarse como tal.

Seis ejes, en orden:
1. **Spec** — ¿hace exactamente lo especificado, sin más y sin menos?
2. **Arquitectura** — ¿respeta los invariantes de `04-architecture.md` §4?
3. **Tests** — ¿existen, y se honró el fallo-primero?
4. **Seguridad** — tokens, scopes, entradas sin validar, logs.
5. **Privacidad** — **¿esto cambia qué se vuelve público?** Si sí, escala a humano.
6. **DoD** — ¿se cumple el de `docs/01-scope-v1.md`?

El Reviewer parte de la hipótesis de que el cambio está mal. Un APPROVE sin haber intentado refutarlo no es una revisión.

## Reglas duras

- **Zona prohibida:** `public/proof/v1/**` lo escribe **solo** el motor vía PR automatizado. Ningún agente edita esos archivos a mano, ni para corregir un dato. Si un dato está mal, se corrige la causa en el motor o en el Registry.
- **`public/proof/schemas/**` no es zona prohibida**, y es la única excepción (`decisions/0009`). Lo escribe el Builder por PR normal, con una restricción que es la que importa: **se deriva de `docs/05-feed-contract.md`, nunca por observación del artefacto**. Ver un `v1/*.json` que no valida y "arreglar" el schema para que valide es la forma exacta en que esta apertura se rompería, y es lo primero que busca el Reviewer en un PR que toque `schemas/**`. Un PR que toque `schemas/**` y `v1/**` a la vez es un defecto por construcción: son dos regímenes y dos actores.
- **El sitio nunca** tiene tokens, llama a la API de GitHub, ni computa métricas. Solo lee y renderiza.
- **Nunca** se guardan prompts, transcripciones de agentes, código privado ni conteos de tokens.
- **Nunca** se añade una **métrica de evidencia** sin `claim_ids`. `Claim` es la raíz del grafo: un contador que dice algo sobre el sujeto y no tiene afirmación que sostener no tiene dónde existir en el modelo. La metadata operativa y de presentación (`meta.counts`, `unassigned_events`) está exenta, y **reetiquetar una métrica como metadata para publicarla sin claim es la única vía por la que esta regla se rompe**: es lo primero que busca el Reviewer. Las tres clases están definidas en `docs/02-domain-and-evidence-model.md` §7.
- **Nunca** se publica nada de un proyecto `confidential` ni de `context: client` sin un `release` humano registrado. El umbral k **no anonimiza**: cuenta eventos, no sujetos (`docs/03-privacy-and-publication-policy.md` §2–§3).
- **`docs/` es autoridad sobre el schema y sobre el código**, no al revés. Si `public/proof/schemas/*.json` o la implementación divergen de la spec, el derivado está mal y se corrige el derivado. Divergencia = FAIL, no deuda.
- **Nunca** se usa el botón de aprobación de GitHub desde un agente.
- **Nunca** se infiere el proyecto de un evento por heurística. Sin match, va a `unassigned`.
- Sin dependencias nuevas sin que lo decida Rodrigo.

## Commits, ramas, PR

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
- Trailer `Project-Id: <slug>` cuando el trabajo pertenezca a un proyecto del Registry (alimenta la correlación).
- Ramas `feat/`, `fix/`, `docs/`, `chore/` desde `main`. **Sin push directo a `main`.**
- Un PR por feature. CI verde es requisito, no logro.

Gobernanza de `main` — **aplicada en GitHub y verificada el 2026-08-24**, no solo acordada. El detalle de qué se comprobó está en `docs/04-architecture.md` §6.1:

| | |
|---|---|
| PR obligatorio | Sí |
| Status checks en verde | Sí (`typecheck / lint / test / build` y `privacy guard`) |
| Conversaciones resueltas antes de mergear | Sí |
| Aprobaciones formales de GitHub | No requeridas |
| Quién mergea | **Solo Rodrigo** (push a `main` restringido, admins incluidos) |

Ningún agente mergea. Ni su propio PR, ni el de otro, ni uno automático de publicación.

## Principio de verificación

No es opcional y aplica a los dos agentes por igual:

1. **No declares algo corregido si no lo verificaste.** Corre el comando y lee la salida. "Debería funcionar" no es un estado.
2. **Distingue hecho, inferencia y deuda.** Un hecho tiene salida de comando que lo respalda. Una inferencia es una lectura del código sin ejecutar. Una deuda es algo que sabes que falta y no vas a arreglar ahora. Etiquétalos distinto.
3. **Si una corrección prevista no ocurrió, documéntala como no corregida.** Un plan que decía "arreglar X" y un resultado sin X arreglado es una discrepancia que se reporta, no que se omite.
4. **Un gate debe demostrar que puede fallar.** Verde no prueba nada por sí solo: rompe el gate a propósito una vez, comprueba que falla, y restaura. Un gate que nunca ha fallado puede estar desconectado.

## Reparto de trabajo con Rodrigo

Rodrigo define intención y toma las decisiones humanas. Los agentes ejecutan **todo** el trabajo
operativo automatizable. No se le delegan comandos, movimientos de archivos, configuración rutinaria,
coordinación entre providers ni ejecución de tooling cuando un agente puede hacerlo de forma segura.

Se le escala solo lo no delegable: publicación de datos privados o confidenciales, NDA y clientes,
permisos y credenciales, gasto material, cambio sustancial de producto, política pública, el merge
final, y cualquier acción irreversible no autorizada.

## Escalar a un humano, siempre

Detente y pregunta. No decidas tú:

- Cambiar `docs/03-privacy-and-publication-policy.md` o cualquier regla suya
- Cambiar el schema del feed público, o publicar un campo o valor nuevo
- Cambiar el scope de un token
- Añadir un data store o una dependencia
- Cambiar `publish` o `nda` de un proyecto, firmar un `release`, bajar el umbral k, o bajar el mínimo de sujetos independientes
- Dos rondas de BLOCK sin resolver

## Verificación antes de decir "listo"

Corre los comandos y pega la salida. Sin salida, no hay afirmación de completitud.

```
npm run typecheck && npm run lint && npm test && npm run build && npm run guard:funnel
```
